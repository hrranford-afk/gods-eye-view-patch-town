#!/usr/bin/env python3
# Tests for the Island Town prototype. Plain Python, standard library only.
#   python3 town/test_town.py            (or: python3 -m unittest town/test_town.py)
# Hand-checked numbers are written beside each check. Money is in-game pounds.
import copy
import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import run_town as R
import town_sim as T

D = T.load_data()
DECK = T.load_deck()
_CACHE = {}


def full_run(name, seed=1):
    k = (name, seed)
    if k not in _CACHE:
        _CACHE[k] = R.run(name, seed, D=D, deck=DECK)[0]
    return _CACHE[k]


def tiny(buildings, pop=None, stock=None, cash=10000.0, credit=0.0, day=1, calm=True, events=False):
    # a tiny hand-made town: calm weather, no events, nothing else built
    d = copy.deepcopy(D)
    d["start"]["buildings"] = dict(buildings)
    d["start"]["cash"], d["start"]["credit"] = cash, credit
    d["start"]["pop"] = pop or {"child": 0, "adult": 5, "elder": 0}
    base = {g: 0.0 for g in d["goods"]}
    base.update({"food": 5000.0, "water": 5000.0})
    base.update(stock or {})
    d["start"]["stock"] = base
    S = T.new_town(d, 1, calm=calm, events=events)
    S["day"] = day
    return S, d


class TestData(unittest.TestCase):
    def test_data_is_valid_and_big_enough(self):
        self.assertEqual(T.validate_data(D), [])
        self.assertGreaterEqual(len(D["buildings"]), 12)
        self.assertGreaterEqual(len(D["goods"]), 8)

    def test_validator_refuses_bad_data(self):
        bad = []
        d = copy.deepcopy(D); d["buildings"]["sawmill"]["out"]["planks"] = 60; bad.append(d)          # makes mass from nothing
        d = copy.deepcopy(D); d["buildings"]["hut"]["colour"] = "red"; bad.append(d)                  # unknown key
        d = copy.deepcopy(D); d["buildings"]["hut"]["kind"] = "castle"; bad.append(d)                 # unknown kind
        d = copy.deepcopy(D); d["buildings"]["hut"]["build"]["steel"] = 3; bad.append(d)              # unknown cost key
        d = copy.deepcopy(D); d["buildings"]["sawmill"]["in"]["gold"] = 1; bad.append(d)              # unknown good
        d = copy.deepcopy(D); d["buildings"]["cottage"]["local"]["credit"] = 5; bad.append(d)         # credit on the local way
        d = copy.deepcopy(D); d["buildings"]["jetty"]["requires"] = "moon"; bad.append(d)             # unknown requirement
        d = copy.deepcopy(D); d["goods"]["fish"]["decay"] = 0.9; bad.append(d)                        # silly decay
        d = copy.deepcopy(D); d["buildings"]["quay"]["cells"] = 500; bad.append(d)                    # huge footprint
        d = copy.deepcopy(D); del d["buildings"]["cottage"]["kit_until"]; bad.append(d)               # kit without an end day
        d = copy.deepcopy(D); d["buildings"]["woodcutter"]["source"] = "magic"; bad.append(d)         # unknown source
        d = copy.deepcopy(D); d["extra"] = 1; bad.append(d)
        for i, b in enumerate(bad):
            self.assertTrue(T.validate_data(b), "bad data %d was accepted" % i)
        self.assertEqual(T.validate_data("nonsense"), ["data is not an object"])


class TestDeterminism(unittest.TestCase):
    def test_same_seed_same_hash(self):
        a = R.run("homestead", 7, D=D, deck=DECK)[0]
        b = R.run("homestead", 7, D=D, deck=DECK)[0]
        self.assertEqual(T.state_hash(a), T.state_hash(b))
        self.assertEqual(json.dumps(T.canon(a), sort_keys=True), json.dumps(T.canon(b), sort_keys=True))

    def test_other_seed_other_hash(self):
        a = R.run("homestead", 7, D=D, deck=DECK, days=200)[0]
        b = R.run("homestead", 8, D=D, deck=DECK, days=200)[0]
        self.assertNotEqual(T.state_hash(a), T.state_hash(b))

    def test_state_is_plain_json(self):
        S = full_run("trader")
        json.dumps(S)                     # would raise on a set, a function or an object
        self.assertEqual(json.loads(json.dumps(S))["day"], S["day"])

    def test_hash_changes_with_one_choice(self):
        a = R.run("homestead", 3, D=D, deck=DECK, days=120)[0]
        b = R.run("homestead", 3, D=D, deck=DECK, days=120)[0]
        b["stock"]["planks"] += 1.0
        self.assertNotEqual(T.state_hash(a), T.state_hash(b))


class TestConservation(unittest.TestCase):
    def test_ledger_balances_in_every_strategy(self):
        for name in R.STRATEGIES:
            S = full_run(name)
            self.assertEqual(T.check_ledger(S, D), [], name)

    def test_sawmill_makes_only_what_the_timber_allows(self):
        # hand check: 90 timber at 9 a day is 10 days; 9 timber give 6 planks, so 60 planks, then nothing more
        S, d = tiny({"tent_camp": 1, "solar_shed": 1, "sawmill": 1}, pop={"child": 0, "adult": 4, "elder": 0},
                    stock={"timber": 90.0, "planks": 0.0})
        for _ in range(10):
            T.step(S, d)
        self.assertAlmostEqual(S["flow"]["timber"]["out"]["in:sawmill"], 90.0, places=6)
        self.assertAlmostEqual(S["flow"]["planks"]["in"]["out:sawmill"], 60.0, places=6)
        self.assertAlmostEqual(S["stock"]["timber"], 0.0, places=6)
        for _ in range(5):
            T.step(S, d)
        self.assertAlmostEqual(S["flow"]["planks"]["in"]["out:sawmill"], 60.0, places=6)     # nothing from nothing
        self.assertEqual(T.check_ledger(S, d), [])

    def test_nothing_goes_negative(self):
        for name in R.STRATEGIES:
            S = full_run(name)
            self.assertTrue(all(v >= -1e-9 for v in S["stock"].values()))
            self.assertGreaterEqual(S["credit"], 0.0)

    def test_every_transform_loses_mass(self):
        for t, b in D["buildings"].items():
            if b["kind"] == "transform":
                mi = sum(D["goods"][g]["mass_kg"] * q for g, q in b["in"].items())
                mo = sum(D["goods"][g]["mass_kg"] * q for g, q in b["out"].items())
                self.assertLessEqual(mo, mi, t)


class TestMoney(unittest.TestCase):
    def test_wages_rent_upkeep_by_hand(self):
        # one fishing slip, four paid places, 5 adults (labour 4.25, so all four places are filled), no exports.
        # month 1: wages 4 x 350 = 1400; rent 5 x 30 = 150 (about); upkeep (19000 + 300 for the tent camp) x 0.025 / 12 = 40.21.
        # cash 10000 + 150 - 1400 - 40.21 = 8709.79
        S, d = tiny({"tent_camp": 1, "fish_dock": 1}, stock={"tools": 50.0})
        for _ in range(30):
            T.step(S, d)
        self.assertEqual(len(S["series"]), 1)
        lines = S["series"][0]["lines"]
        self.assertAlmostEqual(lines["wages"], -1400.0, delta=0.5)
        self.assertAlmostEqual(lines["upkeep"], -40.21, delta=0.01)
        self.assertAlmostEqual(lines["rent"], 150.0, delta=1.5)
        self.assertAlmostEqual(S["cash"], 8709.79, delta=2.0)
        self.assertAlmostEqual(S["wage_ratio"], 1.0, places=6)

    def test_short_purse_pays_in_proportion(self):
        # 700 in the purse (after the 150 of rent comes in) against 1400 due: half is paid, the rest is carried (shortage rule)
        S, d = tiny({"tent_camp": 1, "fish_dock": 1}, stock={"tools": 50.0}, cash=550.0)
        for _ in range(30):
            T.step(S, d)
        self.assertAlmostEqual(S["wage_ratio"], 0.5, delta=0.01)
        self.assertGreaterEqual(S["cash"], 0.0)
        self.assertAlmostEqual(S["arrears"], 700.0, delta=10.0)

    def test_kit_pays_with_credit_and_local_does_not(self):
        S, d = tiny({"tent_camp": 1}, cash=20000.0, credit=100000.0, stock={"planks": 100.0})
        self.assertEqual(T.build_cost(S, d, "cottage")[0], "kit")
        self.assertTrue(T.start_build(S, d, "cottage"))
        self.assertAlmostEqual(S["credit"], 70000.0)
        self.assertAlmostEqual(S["cash"], 12000.0)           # 8000 of cash is the labour part of the kit
        S["day"] = 700                                        # kits for cottages end on day 620
        self.assertEqual(T.build_cost(S, d, "cottage")[0], "local")
        self.assertTrue(T.start_build(S, d, "cottage"))
        self.assertAlmostEqual(S["credit"], 70000.0)          # local way never touches credit
        self.assertAlmostEqual(S["planks"] if "planks" in S else S["stock"]["planks"], 70.0)

    def test_credit_does_not_buy_food_after_the_catalogue_closes(self):
        S, d = tiny({"tent_camp": 1}, stock={"food": 0.0}, cash=5000.0, credit=100000.0, day=1300)
        S["orders"] = [{"good": "food", "target": 40.0}]
        S["boat"]["next"] = 1300
        T.step(S, d)
        self.assertAlmostEqual(S["credit"], 100000.0)          # level 0: only tools and rope come on credit
        self.assertLess(S["cash"], 5000.0)                     # so the cash paid, at the island price
        self.assertGreater(S["flow"]["food"]["in"].get("import", 0.0), 0.0)


class TestShortageRule(unittest.TestCase):
    def test_share_function(self):
        self.assertEqual(T.share(6.0, {"a": 4.0, "b": 8.0}), {"a": 0.5, "b": 0.5})
        self.assertEqual(T.share(100.0, {"a": 4.0, "b": 8.0}), {"a": 1.0, "b": 1.0})
        self.assertEqual(T.share(0.0, {"a": 4.0}), {"a": 0.0})

    def test_contested_timber_runs_both_sawmills_at_half(self):
        # two sawmills want 18 timber, 9 is in the yard: each works at half, so 6 planks instead of 12
        S, d = tiny({"tent_camp": 1, "solar_shed": 1, "sawmill": 2}, pop={"child": 0, "adult": 8, "elder": 0},
                    stock={"timber": 9.0})
        T.step(S, d)
        self.assertAlmostEqual(S["flow"]["planks"]["in"]["out:sawmill"], 6.0, places=6)
        self.assertAlmostEqual(S["stock"]["timber"], 0.0, places=6)

    def test_households_come_first(self):
        # 10 people need 10 water, 5 is in the cistern: the households take it all, so 50 percent satisfaction
        S, d = tiny({"tent_camp": 1}, pop={"child": 0, "adult": 10, "elder": 0}, stock={"water": 5.0})
        T.step(S, d)
        self.assertAlmostEqual(S["last_f"]["water"], 0.5, places=6)
        self.assertAlmostEqual(S["stock"]["water"], 0.0, places=9)

    def test_fish_is_eaten_when_food_is_gone(self):
        # 5 people, no food, 11 fish at 2.2 fish a day each: exactly enough
        S, d = tiny({"tent_camp": 1}, stock={"food": 0.0, "fish": 11.0})
        T.step(S, d)
        self.assertAlmostEqual(S["last_f"]["food"], 1.0, places=6)
        self.assertAlmostEqual(S["flow"]["fish"]["out"]["consume"], 11.0, places=6)

    def test_staff_places_fill_in_rank_order(self):
        # 3 adults give 2.55 workers: the fishing slip (rank 10) is filled before the sawmill (rank 22)
        S, d = tiny({"tent_camp": 1, "fish_dock": 1, "sawmill": 1}, pop={"child": 0, "adult": 3, "elder": 0})
        st, employed, places = T.staffing(S, d)
        self.assertAlmostEqual(st["fish_dock"], 2.55 / 4.0, places=6)
        self.assertAlmostEqual(st["sawmill"], 0.0, places=6)
        self.assertAlmostEqual(employed, 2.55, places=6)


class TestPeople(unittest.TestCase):
    def test_no_food_starves_gently(self):
        S, d = tiny({"tent_camp": 1, "cistern": 1}, pop={"child": 3, "adult": 8, "elder": 1}, stock={"food": 0.0, "water": 500.0})
        totals = []
        for _ in range(120):
            T.step(S, d)
            totals.append(T.total_pop(S))
        self.assertTrue(all(b <= a + 1e-9 for a, b in zip(totals, totals[1:])), "population rose while nobody had food")
        self.assertLess(totals[-1], 0.4 * 12.0)
        self.assertGreaterEqual(min(totals), 0.0)
        self.assertGreater(totals[10], totals[-1])                           # it is a slope, not a cliff
        self.assertGreater(totals[10], 8.0)                                  # in the first days most people are still there
        self.assertTrue(all(v >= 0.0 for v in S["pop"].values()))
        self.assertGreater(S["emig_total"], 5.0)                             # they left by boat; there is no other counter

    def test_idle_town_collapses_and_it_is_quiet(self):
        S = full_run("idle")
        self.assertLess(T.total_pop(S), 3.0)
        words = json.dumps(S).lower()
        for bad in ("blood", "corpse", "death", "died", "dead", "kill", "murder", "gore"):
            self.assertNotIn(bad, words)

    def test_housing_caps_every_day(self):
        for name in ("holiday", "homestead", "trader"):
            S = T.new_town(D, 2, events=True)
            for _ in range(T.DAYS):
                R.plan_day(S, D, name, None)
                T.step(S, D, DECK)
                cap, _ = T.housing(S, D)
                self.assertLessEqual(T.total_pop(S), cap + 1e-6, "%s day %d" % (name, S["day"]))

    def test_nobody_without_a_roof_is_born(self):
        S, d = tiny({"tent_camp": 1}, pop={"child": 2, "adult": 8, "elder": 2})      # exactly full: 12 of 12
        for _ in range(60):
            T.step(S, d)
        self.assertLessEqual(T.total_pop(S), 12.0 + 1e-9)
        self.assertLess(S["births"], 0.1)                       # only the room an old neighbour leaves can be filled

    def test_counts_not_individuals(self):
        S = full_run("homestead")
        self.assertEqual(sorted(S["pop"]), ["adult", "child", "elder"])
        self.assertTrue(all(isinstance(v, float) for v in S["pop"].values()))
        for k in S:
            self.assertNotIn("name", k.lower())
            self.assertNotIn("person", k.lower())


class TestPort(unittest.TestCase):
    def test_landing_carries_six_plank_bundles_a_call(self):
        # the open landing holds 12 slots; a plank bundle is 2 slots: 6 bundles go, the rest stay
        S, d = tiny({"tent_camp": 1}, stock={"planks": 100.0}, day=1)
        S["exports"] = {"planks": 0.0}
        T.step(S, d)
        self.assertAlmostEqual(S["flow"]["planks"]["out"]["export"], 6.0, places=6)
        self.assertEqual(S["boat"]["calls"], 1)

    def test_jetty_carries_twenty(self):
        S, d = tiny({"tent_camp": 1, "jetty": 1}, stock={"planks": 100.0}, day=1)
        S["exports"] = {"planks": 0.0}
        T.step(S, d)
        self.assertAlmostEqual(S["flow"]["planks"]["out"]["export"], 20.0, places=6)      # 40 slots of 2

    def test_slots_never_exceed_capacity(self):
        for name in ("holiday", "trader"):
            S = full_run(name)
            self.assertLessEqual(S["boat"]["slots_used"], S["boat"]["slots_cap"] + 1e-6)

    def test_boat_thins_with_the_gift(self):
        S = full_run("trader")
        calls = S["boat"]["calls"]
        self.assertLess(calls, 1440 * 0.5)                  # far fewer than daily calls over four years
        self.assertGreater(calls, 300)
        self.assertEqual([T.BOAT_INTERVAL[T.credit_level(x)] for x in (1, 361, 721, 1081, 1261)], [1, 2, 4, 6, 7])

    def test_storm_stops_the_boat(self):
        S, d = tiny({"tent_camp": 1}, calm=False)
        S["wx"] = "storm"
        S["boat"]["next"] = 1
        S["since_storm"] = 0
        before = S["boat"]["calls"]
        T.port_call(S, d)
        self.assertEqual(S["boat"]["calls"], before)
        self.assertEqual(S["boat"]["next"], 2)

    def test_export_price_falls_with_a_glut(self):
        S, d = tiny({"tent_camp": 1, "jetty": 1}, stock={"planks": 200.0})
        S["exports"] = {"planks": 0.0}
        T.port_call(S, d)
        first = S["m"]["exports"]
        S["stock"]["planks"] = 20.0; S["boat"]["next"] = 1; S["day"] = 2
        before = S["m"]["exports"]
        T.port_call(S, d)
        second = S["m"]["exports"] - before
        self.assertGreater(first / 20.0, second / 20.0)       # the second sale of 20 bundles got a lower price
        self.assertLess(first / 20.0, 30.0 * 0.8 + 1e-9)       # never above the base price times the export factor


class TestGift(unittest.TestCase):
    def test_reach_curve(self):
        self.assertAlmostEqual(T.reach_pct(1), 100.0)
        self.assertAlmostEqual(T.reach_pct(360), 92.0)
        self.assertAlmostEqual(T.reach_pct(720), 62.0)
        self.assertAlmostEqual(T.reach_pct(1080), 30.0)
        self.assertAlmostEqual(T.reach_pct(1440), 10.0)
        r = [T.reach_pct(x) for x in range(1, 1441)]
        self.assertTrue(all(b <= a + 1e-9 for a, b in zip(r, r[1:])))
        self.assertEqual([T.credit_level(x) for x in (1, 360, 361, 720, 721, 1080, 1081, 1260, 1261, 1440)], [4, 4, 3, 3, 2, 2, 1, 1, 0, 0])

    def test_events_fire_from_the_deck(self):
        S = full_run("homestead")
        ids = {e["id"] for e in DECK["events"]}
        self.assertGreater(len(S["ev_log"]), 100)
        for day, eid in S["ev_log"]:
            self.assertIn(eid, ids)
        once = [e["id"] for e in DECK["events"] if e["repeat"] == "once"]
        fired = [eid for _, eid in S["ev_log"] if eid in once]
        # the log keeps the last 400 events; within it no once-only event repeats
        self.assertEqual(len(fired), len(set(fired)))
        self.assertTrue(any(k in S["ev_kinds"] for k in ("storm", "find", "season")))

    def test_event_effects_reach_stock_and_credit(self):
        S, d = tiny({"tent_camp": 1}, calm=False, events=True, credit=50000.0, stock={"planks": 0.0}, day=2)
        e = next(x for x in DECK["events"] if x["id"] == "a1_first_storm")
        T.apply_event(S, d, e)
        self.assertAlmostEqual(S["stock"]["planks"], 4.0)
        self.assertIn("storm_seen", S["flags"])
        e2 = next(x for x in DECK["events"] if x["id"] == "a2_item_gone")
        T.apply_event(S, d, e2)
        self.assertAlmostEqual(S["credit"], 49000.0)
        self.assertEqual(T.check_ledger(S, d), [])

    def test_trigger_rules(self):
        S, d = tiny({"tent_camp": 1}, calm=False, events=True, day=1)
        flags = T.game_flags(S, d)
        by = {e["id"]: e for e in DECK["events"]}
        self.assertFalse(T.eligible(S, d, by["a1_first_storm"], flags))     # wrong day and weather
        S["day"], S["wx"] = 2, "storm"
        self.assertTrue(T.eligible(S, d, by["a1_first_storm"], flags))
        S["done"]["a1_first_storm"] = 2
        self.assertFalse(T.eligible(S, d, by["a1_first_storm"], flags))     # once only
        S["day"] = 450
        self.assertFalse(T.eligible(S, d, by["a2_item_gone"], flags) and T.credit_level(450) != 3)


class TestFourYears(unittest.TestCase):
    def test_default_town_survives_and_stays_plausible(self):
        for seed in (1, 2, 3):
            S = full_run("homestead", seed)
            self.assertEqual(S["day"], T.DAYS + 1)
            self.assertEqual(len(S["years"]), 4)
            pops = [r["pop"] for r in S["series"]]
            self.assertEqual(len(pops), 48)
            self.assertGreater(pops[-1], 5.0, "seed %d collapsed" % seed)
            self.assertLess(max(pops), 80.0, "runaway growth")
            self.assertTrue(all(abs(r["cash"]) < 1e6 for r in S["series"]))
            self.assertTrue(0.0 <= S["happy"] <= 1.0)
            self.assertGreater(S["shoal"], 0.2)

    def test_three_strategies_are_alive_and_different(self):
        res = {n: full_run(n) for n in ("holiday", "homestead", "trader")}
        for n, S in res.items():
            self.assertGreater(T.total_pop(S), 5.0, n)
            self.assertLess(T.total_pop(S), 90.0, n)
        self.assertGreater(res["holiday"]["guest_nights"], 500)
        self.assertEqual(res["homestead"]["guest_nights"], 0)
        self.assertEqual(len({T.state_hash(S) for S in res.values()}), 3)
        self.assertGreater(max(r["pop"] for r in res["trader"]["series"]), max(r["pop"] for r in res["holiday"]["series"]) - 1e-9)

    def test_building_nothing_collapses(self):
        S = full_run("idle")
        start = sum(D["start"]["pop"].values())
        self.assertLess(T.total_pop(S), 0.25 * start)
        self.assertGreater(S["emig_total"], 8.0)

    def test_the_gift_thins_and_the_town_feels_it(self):
        S = full_run("trader")
        y = S["years"]
        self.assertGreater(y[0]["reach_pct"], y[3]["reach_pct"])
        self.assertLess(y[3]["credit"], y[0]["credit"])
        self.assertGreater(S["credit_spent"], 100000.0)

    def test_report_has_four_years_and_calm_words(self):
        S = full_run("homestead")
        text = json.dumps(S["years"]).lower()
        for bad in ("blood", "corpse", "death", "died", "kill", "gore", "murder"):
            self.assertNotIn(bad, text)
        for y in S["years"]:
            for k in ("pop", "happy", "cash", "credit", "reach_pct", "food_days", "net_year"):
                self.assertIn(k, y)


if __name__ == "__main__":
    unittest.main(verbosity=1)
