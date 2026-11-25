# Island Town: a headless, seeded, deterministic town simulation (research/TOWN_BUILDER_AUDIT_AND_DRAFT.md).
# It extends the City Lab idea (buildings as data, wages for filled places, proportional shortage rule, state hash)
# to an island town: counted citizens, a goods graph, a port with one boat, a monthly budget, happiness, migration,
# the thinning gift credit and the Gift event deck. One step is one game day. A year is 360 days (12 months of 30 days),
# day 1 is 1 May, as in gift/events.json.
# FIXED rules kept: people are counted, never tracked (no names, no per-person data); hopeful tone; nothing gory
# (people who cannot be fed leave by boat; nobody dies on screen); all money is in-game; no real brands or places.
# Every number in town_data.json is a GUESS unless it says otherwise. Plain Python, standard library only.
import hashlib
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(HERE, "town_data.json")
DECK_PATH = os.path.join(os.path.dirname(HERE), "gift", "events.json")
YEAR = 360
DAYS = 4 * YEAR

# ---------------------------------------------------------------- data and validator
TOP_KEYS = {"schema", "version", "note", "goods", "buildings", "start", "params"}
GOOD_KEYS = {"mass_kg", "slots", "price", "decay", "cap", "ship"}
BUILD_KEYS = {"name", "kind", "cells", "jobs", "rank", "housing", "beds", "power_in", "build", "local", "kit_until",
              "source", "stage", "weather", "out", "in", "sets_flag", "shop", "attract", "wild_protect", "health",
              "leisure", "safety", "storage", "port", "boat", "requires", "robots", "rain_catch_m2",
              "forest_regrow", "soft", "reuses"}
KINDS = {"home", "lodging", "source", "transform", "support", "storage", "shop", "service", "port", "boat", "robots"}
SOURCES = {"forest", "shoal", "soil", "rain", "lens", "sun", "wind"}
COST_KEYS = {"cash", "credit", "planks", "glass", "rope", "metal", "days"}
SOFT_INPUTS = set()                       # per building, see the "soft" list: a missing soft input slows work, it does not stop it


def load_data(path=None):
    with open(path or DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def validate_data(d):
    # strict check; returns a list of error strings (empty list means valid). Never throws on bad shapes.
    errs = []
    if not isinstance(d, dict):
        return ["data is not an object"]
    for k in d:
        if k not in TOP_KEYS:
            errs.append("unknown top key " + str(k))
    goods, blds = d.get("goods"), d.get("buildings")
    if not isinstance(goods, dict) or not isinstance(blds, dict):
        return errs + ["goods and buildings must be objects"]
    for g, v in goods.items():
        if set(v) - GOOD_KEYS:
            errs.append("good %s: unknown keys %s" % (g, sorted(set(v) - GOOD_KEYS)))
        for k in ("mass_kg", "slots", "price", "decay", "cap"):
            if not isinstance(v.get(k), (int, float)) or v[k] < 0:
                errs.append("good %s: %s must be a number >= 0" % (g, k))
        if isinstance(v.get("decay"), (int, float)) and v["decay"] > 0.5:
            errs.append("good %s: decay above 0.5 a day" % g)
    for t, b in blds.items():
        if set(b) - BUILD_KEYS:
            errs.append("building %s: unknown keys %s" % (t, sorted(set(b) - BUILD_KEYS)))
        if b.get("kind") not in KINDS:
            errs.append("building %s: bad kind" % t)
        for k in ("cells", "jobs", "rank"):
            if not isinstance(b.get(k), (int, float)) or b[k] < 0:
                errs.append("building %s: %s must be a number >= 0" % (t, k))
        if isinstance(b.get("cells"), (int, float)) and b["cells"] > 80:
            errs.append("building %s: more than 80 cells" % t)
        if b.get("source") is not None and b["source"] not in SOURCES:
            errs.append("building %s: unknown source %s" % (t, b.get("source")))
        for blk in ("in", "out"):
            for g, q in (b.get(blk) or {}).items():
                if g not in goods:
                    errs.append("building %s: %s names unknown good %s" % (t, blk, g))
                elif not isinstance(q, (int, float)) or q <= 0:
                    errs.append("building %s: %s %s must be > 0" % (t, blk, g))
        for opt in ("build", "local"):
            c = b.get(opt)
            if c is None:
                if opt == "build":
                    errs.append("building %s: build is required" % t)
                continue
            if set(c) - COST_KEYS:
                errs.append("building %s: %s has unknown cost keys %s" % (t, opt, sorted(set(c) - COST_KEYS)))
            for k, v in c.items():
                if not isinstance(v, (int, float)) or v < 0:
                    errs.append("building %s: %s.%s must be >= 0" % (t, opt, k))
            if opt == "local" and "credit" in c:
                errs.append("building %s: the local way cannot use delivery credit" % t)
            if c.get("days", 1) < 1:
                errs.append("building %s: %s.days must be at least 1" % (t, opt))
        if b.get("requires") is not None and b["requires"] not in blds:
            errs.append("building %s: requires unknown building %s" % (t, b["requires"]))
        if "credit" in (b.get("build") or {}) and "kit_until" not in b:
            errs.append("building %s: a kit (credit) cost needs kit_until" % t)
        if b.get("kind") == "transform":
            # nothing from nothing: the output mass of a transform may not exceed its input mass
            mi = sum(goods[g]["mass_kg"] * q for g, q in (b.get("in") or {}).items() if g in goods)
            mo = sum(goods[g]["mass_kg"] * q for g, q in (b.get("out") or {}).items() if g in goods)
            if mo > mi + 1e-9:
                errs.append("building %s: output mass %.1f kg is more than input mass %.1f kg" % (t, mo, mi))
            if not b.get("out") or not b.get("in"):
                errs.append("building %s: a transform needs in and out" % t)
        if b.get("kind") == "source" and not b.get("source"):
            errs.append("building %s: a source needs a source key (where the goods come from)" % t)
        if b.get("kind") == "home" and not b.get("housing"):
            errs.append("building %s: a home needs housing" % t)
    st = d.get("start", {})
    for g in st.get("stock", {}):
        if g not in goods:
            errs.append("start stock names unknown good " + g)
    for t in st.get("buildings", {}):
        if t not in blds:
            errs.append("start building unknown " + t)
    return errs


# ---------------------------------------------------------------- seeded random (integer only, same on every platform)
M64 = (1 << 64) - 1


def rng_next(S, name):
    z = (S["rng"][name] + 0x9E3779B97F4A7C15) & M64
    S["rng"][name] = z
    z = ((z ^ (z >> 30)) * 0xBF58476D1CE4E5B9) & M64
    z = ((z ^ (z >> 27)) * 0x94D049BB133111EB) & M64
    z ^= z >> 31
    return (z >> 11) / float(1 << 53)


def seed_streams(seed):
    out = {}
    for i, n in enumerate(("wx", "ev", "mix")):
        h = hashlib.sha256(("town:%d:%s" % (seed, n)).encode()).digest()
        out[n] = int.from_bytes(h[:8], "big")
    return out


# ---------------------------------------------------------------- calendar, weather, credit
def season_of(day):
    d = (day - 1) % YEAR + 1
    if d <= 30 or d > 300:
        return "spring"
    if d <= 120:
        return "summer"
    if d <= 210:
        return "autumn"
    return "winter"


def month_index(day):
    return ((day - 1) % YEAR) // 30          # 0 = May


def credit_level(day):
    if day <= 360:
        return 4
    if day <= 720:
        return 3
    if day <= 1080:
        return 2
    if day <= 1260:
        return 1
    return 0


REACH_POINTS = [(1, 100), (360, 92), (720, 62), (1080, 30), (1260, 18), (1440, 10)]


def reach_pct(day):
    # the thinning curve of research/GIFT_WEEK_ONE_AND_SPINE.md section 2.4 (a guess): straight lines between points
    for (d0, r0), (d1, r1) in zip(REACH_POINTS, REACH_POINTS[1:]):
        if day <= d1:
            return r0 + (r1 - r0) * (day - d0) / float(d1 - d0)
    return REACH_POINTS[-1][1]


BOAT_INTERVAL = {4: 1, 3: 2, 2: 4, 1: 6, 0: 7}
CREDIT_GOODS = {4: {"planks", "tools", "food", "timber", "metal", "glass", "rope"},
                3: {"planks", "tools", "food", "timber", "metal", "glass", "rope"},
                2: {"planks", "tools", "food", "metal", "rope"},
                1: {"tools", "food", "rope"},
                0: {"tools", "rope"}}
WX_WEIGHTS = {
    "spring": [("fair", .30), ("clear", .12), ("overcast", .15), ("showers", .15), ("rain", .12), ("fog", .06), ("storm", .05), ("goldenhour", .05)],
    "summer": [("fair", .30), ("clear", .25), ("overcast", .08), ("showers", .12), ("rain", .08), ("fog", .06), ("storm", .02), ("goldenhour", .09)],
    "autumn": [("fair", .15), ("clear", .10), ("overcast", .20), ("showers", .12), ("rain", .20), ("fog", .08), ("storm", .10), ("goldenhour", .05)],
    "winter": [("fair", .08), ("clear", .10), ("overcast", .25), ("showers", .10), ("rain", .22), ("fog", .08), ("storm", .12), ("goldenhour", .05)]}
RAIN_MM = {"rain": 8.0, "showers": 3.5, "storm": 12.0, "fog": 0.5, "overcast": 0.3}
SKY = {"clear": 1.0, "goldenhour": 1.0, "fair": 0.9, "overcast": 0.4, "fog": 0.3, "showers": 0.4, "rain": 0.25, "storm": 0.15}
WIND = {"clear": 0.5, "goldenhour": 0.5, "fair": 0.7, "overcast": 0.9, "fog": 0.3, "showers": 1.0, "rain": 1.1, "storm": 0.4}
SEASON_SUN = {"spring": 1.0, "summer": 1.3, "autumn": 0.7, "winter": 0.4}
SEASON_SEA = {"spring": 1.0, "summer": 1.1, "autumn": 0.9, "winter": 0.6}
SEASON_GROW = {"spring": 0.8, "summer": 1.2, "autumn": 0.7, "winter": 0.1}
SEAS_WEATHER_SEA = {"storm": 0.0, "fog": 0.6, "rain": 0.8}


# ---------------------------------------------------------------- state
def new_town(data, seed=1, calm=False, events=True, flat_cells=None):
    P = data["params"]
    st = data["start"]
    S = {
        "seed": seed, "day": 1, "opts": {"calm": bool(calm), "events": bool(events)},
        "rng": seed_streams(seed),
        "cash": float(st["cash"]), "credit": float(st["credit"]),
        "stock": {g: float(st["stock"].get(g, 0.0)) for g in data["goods"]},
        "b": {t: {"n": int(st["buildings"].get(t, 0)), "q": []} for t in data["buildings"]},
        "pop": {k: float(v) for k, v in st["pop"].items()},
        "guests": 0.0, "hunger": 0.0, "thirst": 0.0, "happy": 0.6,
        "drv": {}, "wx": "fair", "rain": 0.0, "since_storm": 99, "damage": 0.0,
        "shoal": 1.0, "forest": float(P["forest_stock"]), "wild": 0.8, "wild_counts": {"seals": 0, "birds": 0},
        "arrears": 0.0, "wage_ratio": 1.0, "wage_due": 0.0,
        "boat": {"next": 1, "calls": 0, "skipped": 0, "slots_used": 0.0, "slots_cap": 0.0},
        "orders": [], "exports": {}, "sat": {g: 0.0 for g in data["goods"]},
        "flags": ["has_key", "hut_patched", "barrel_up"], "done": {}, "ev_log": [], "ev_kinds": {},
        "flat_cells": int(flat_cells if flat_cells is not None else P["flat_cells"]),
        "flow": {g: {"in": {}, "out": {}} for g in data["goods"]},
        "start_stock": {g: float(st["stock"].get(g, 0.0)) for g in data["goods"]},
        "m": {}, "series": [], "years": [], "emig_total": 0.0, "immig_total": 0.0, "births": 0.0,
        "guest_nights": 0.0, "attr": 1.0, "built_log": [], "refused": 0, "op": {}, "staff": {},
        "last_f": {"food": 1.0, "water": 1.0, "power": 1.0},
        "credit_spent": 0.0, "edict": {"wage": 1.0, "rent": 1.0},
    }
    return S


def canon(o):
    if isinstance(o, float):
        return round(o, 6)
    if isinstance(o, dict):
        return {k: canon(o[k]) for k in sorted(o)}
    if isinstance(o, (list, tuple)):
        return [canon(x) for x in o]
    return o


def state_hash(S):
    return hashlib.sha256(json.dumps(canon(S), sort_keys=True, separators=(",", ":")).encode()).hexdigest()


# ---------------------------------------------------------------- stock with a ledger (nothing made from nothing)
def n_built(S, t):
    return S["b"][t]["n"]


def n_all(S, t):
    return S["b"][t]["n"] + len(S["b"][t]["q"])


def cap_of(S, D, g):
    c = D["goods"][g]["cap"]
    for t, b in D["buildings"].items():
        n = S["b"][t]["n"]
        if n and b.get("storage") and g in b["storage"]:
            c += b["storage"][g] * n
    return c


def add(S, D, g, q, why):
    # put q (>= 0) of g into stock, up to the store's cap; returns what went in. Every inflow is written to the ledger.
    if q <= 0:
        return 0.0
    room = max(0.0, cap_of(S, D, g) - S["stock"][g])
    q = min(q, room)
    S["stock"][g] += q
    f = S["flow"][g]["in"]
    f[why] = f.get(why, 0.0) + q
    return q


def take(S, g, q, why):
    q = min(q, S["stock"][g])
    if q <= 0:
        return 0.0
    S["stock"][g] -= q
    f = S["flow"][g]["out"]
    f[why] = f.get(why, 0.0) + q
    return q


def line(S, k, v):
    S["m"][k] = S["m"].get(k, 0.0) + v


def share(stock, demands):
    # the shortage rule (City Lab "rule A"): a short supply is shared in proportion to demand
    tot = sum(demands.values())
    if tot <= 1e-12:
        return {k: 1.0 for k in demands}
    f = min(1.0, stock / tot)
    return {k: f for k in demands}


# ---------------------------------------------------------------- derived numbers
def total_pop(S):
    return S["pop"]["child"] + S["pop"]["adult"] + S["pop"]["elder"]


def housing(S, D):
    cap, qsum = 0.0, 0.0
    for t, b in D["buildings"].items():
        if b.get("housing"):
            n = S["b"][t]["n"]
            cap += n * b["housing"]["cap"]
            qsum += n * b["housing"]["cap"] * b["housing"]["quality"]
    return cap, (qsum / cap if cap > 0 else 0.0)


def labour(S, D):
    P = D["params"]
    return S["pop"]["adult"] * P["labour_adult"] + S["pop"]["elder"] * P["labour_elder"]


def robots(S, D):
    return sum(S["b"][t]["n"] * b.get("robots", 0) for t, b in D["buildings"].items())


def port_level(S, D):
    lv, cap = 0, D["params"]["port_cap_landing"]
    for t, b in D["buildings"].items():
        if b.get("port") and S["b"][t]["n"] > 0 and b["port"]["level"] > lv:
            lv, cap = b["port"]["level"], b["port"]["cap"]
    return lv, cap


def boat_stats(S, D):
    hold, seats = D["params"]["boat_hold_tender"], D["params"]["seats"]
    for t, b in D["buildings"].items():
        if b.get("boat") and S["b"][t]["n"] > 0:
            hold, seats = max(hold, b["boat"]["hold"]), max(seats, b["boat"]["seats"])
    return hold, seats


def cells_used(S, D):
    return sum((S["b"][t]["n"] + len(S["b"][t]["q"])) * b["cells"] for t, b in D["buildings"].items())


def building_value(b):
    c = b["build"]
    return c.get("credit", 0) + c.get("cash", 0) + 30 * c.get("planks", 0) + 80 * c.get("glass", 0)


def staffing(S, D):
    # City Lab rule: places are filled in a stated priority order (rank), and only filled places are paid.
    labr = labour(S, D)
    rob = float(robots(S, D))
    order = sorted((b["rank"], t) for t, b in D["buildings"].items() if b["jobs"] > 0 and S["b"][t]["n"] > 0)
    res, employed, places = {}, 0.0, 0.0
    for _, t in order:
        b = D["buildings"][t]
        need = b["jobs"] * S["b"][t]["n"]
        h = min(need, labr)
        labr -= h
        res[t] = [h, 0.0, need]
        employed += h
        places += need
    for _, t in order:
        b = D["buildings"][t]
        if b["kind"] in ("source", "transform"):
            r = min(res[t][2] - res[t][0], rob)
            rob -= r
            res[t][1] = r
    out = {}
    for t, (h, r, need) in res.items():
        out[t] = min(1.0, (h + 0.6 * r) / need) if need > 0 else 1.0
    S["staff"] = {t: round(v, 4) for t, v in out.items()}
    return out, employed, places


def bnorm(v):
    return max(0.0, min(1.0, v))


# ---------------------------------------------------------------- building
def kit_open(S, D, t):
    b = D["buildings"][t]
    return ("credit" in b["build"]) and S["day"] <= b.get("kit_until", 0) and credit_level(S["day"]) >= 1


def build_cost(S, D, t):
    # returns (method, cost dict) or (None, reason)
    b = D["buildings"][t]
    if b.get("requires") and S["b"][b["requires"]]["n"] < 1:
        return None, "needs " + b["requires"]
    if cells_used(S, D) + b["cells"] > S["flat_cells"]:
        return None, "no flat ground left"
    if "credit" not in b["build"]:
        return "local", dict(b["build"])
    if kit_open(S, D, t) and S["credit"] >= b["build"]["credit"]:
        return "kit", dict(b["build"])
    if b.get("local"):
        return "local", dict(b["local"])
    return None, "kit not available and no local way"


def can_afford(S, c):
    return (S["cash"] >= c.get("cash", 0) and S["credit"] >= c.get("credit", 0) and S["stock"]["planks"] >= c.get("planks", 0)
            and S["stock"]["glass"] >= c.get("glass", 0) and S["stock"]["rope"] >= c.get("rope", 0)
            and S["stock"]["metal"] >= c.get("metal", 0))


def start_build(S, D, t, reserve=0.0):
    m, c = build_cost(S, D, t)
    if m is None or not can_afford(S, c) or S["cash"] - c.get("cash", 0) < reserve:
        S["refused"] += 1
        return False
    S["cash"] -= c.get("cash", 0)
    line(S, "build_cash", -c.get("cash", 0))
    S["credit"] -= c.get("credit", 0)
    S["credit_spent"] += c.get("credit", 0)
    for g in ("planks", "glass", "rope", "metal"):
        if c.get(g):
            take(S, g, c[g], "build")
    S["b"][t]["q"].append(S["day"] + int(c["days"]))
    S["built_log"].append([S["day"], t, m])
    return True


def finish_builds(S, D):
    for t in D["buildings"]:
        q = S["b"][t]["q"]
        if q:
            done = [d for d in q if d <= S["day"]]
            if done:
                S["b"][t]["q"] = [d for d in q if d > S["day"]]
                S["b"][t]["n"] += len(done)


def game_flags(S, D):
    f = set(S["flags"])
    pairs = {"built_jetty": "jetty", "built_cottage": "cottage", "built_cistern": "cistern", "built_hide": "wildlife_hide",
             "built_kiosk": "kiosk", "garden_started": "garden", "has_boat": "fish_dock", "robot_started": "robot_depot"}
    for fl, t in pairs.items():
        if S["b"][t]["n"] > 0:
            f.add(fl)
    if S["b"]["guest_cottage"]["n"] > 0:
        f.add("built_cottage")
    if S["b"]["cargo_boat"]["n"] > 0:
        f.add("has_boat")
    if S["b"]["lighthouse"]["n"] > 0:
        f.discard("lamp_dark")
    S["flags"] = sorted(f)
    return f


# ---------------------------------------------------------------- the event deck
FAR_LOCS = {"hoard", "woods", "reef", "seals", "rock", "sea", "skerry_east"}


def load_deck(path=None):
    with open(path or DECK_PATH, encoding="utf-8") as f:
        return json.load(f)


def spring_tide(day):
    ph = day % 14.77
    return ph < 2.0 or ph > 12.8 or abs(ph - 7.4) < 1.0


def eligible(S, D, e, flags):
    tr, day = e["trigger"], S["day"]
    if e["act"] < 1 or day < tr.get("day_min", 0) or day > tr.get("day_max", 99999):
        return False
    if "any" not in e["season"] and season_of(day) not in e["season"]:
        return False
    if e["repeat"] == "once" and e["id"] in S["done"]:
        return False
    if e["id"] in S["done"] and day - S["done"][e["id"]] < e.get("cooldown_days", 0):
        return False
    if tr.get("weather") and S["wx"] not in tr["weather"]:
        return False
    t = tr.get("tide", "any")
    if t in ("spring_low", "spring_high") and not spring_tide(day):
        return False
    loc = tr.get("location", "any")
    if loc in FAR_LOCS and "has_boat" not in flags and not (loc == "hoard" and spring_tide(day) and day >= 5):
        return False
    if any(x not in flags for x in tr.get("flags_all", [])):
        return False
    if tr.get("flags_any") and not any(x in flags for x in tr["flags_any"]):
        return False
    if any(x in flags for x in tr.get("flags_none", [])):
        return False
    for g, q in tr.get("stock_min", {}).items():
        if S["stock"].get(g, 0.0) < q:
            return False
    cl = credit_level(day)
    if cl < tr.get("credit_level_min", 0) or cl > tr.get("credit_level_max", 4):
        return False
    if tr.get("robots_min", 0) > robots(S, D):
        return False
    if "since_storm_days_min" in tr and S["since_storm"] < tr["since_storm_days_min"]:
        return False
    if "since_storm_days_max" in tr and S["since_storm"] > tr["since_storm_days_max"]:
        return False
    if tr.get("cash_min", 0) > S["cash"]:
        return False
    aft = tr.get("after")
    if aft:
        for a in ([aft] if isinstance(aft, str) else aft):
            if a not in S["done"] or day - S["done"][a] < tr.get("wait_days", 0):
                return False
    return True


def apply_event(S, D, e):
    ef = e["effects"]
    for g, q in ef.get("stock", {}).items():
        if g in S["stock"]:
            add(S, D, g, q, "event")
    for fl in ef.get("flags_set", []):
        if fl not in S["flags"]:
            S["flags"].append(fl)
    for fl in ef.get("flags_clear", []):
        if fl in S["flags"]:
            S["flags"].remove(fl)
    if "credit_delta" in ef:
        S["credit"] = max(0.0, S["credit"] + ef["credit_delta"])
    if "cash_delta" in ef:
        S["cash"] += ef["cash_delta"]
        line(S, "events_cash", ef["cash_delta"])
    for k, v in ef.get("counts", {}).items():
        if k in ("seals", "birds"):
            S["wild_counts"][k] += v
        elif k == "guests":
            beds = S["b"]["guest_cottage"]["n"] * D["buildings"]["guest_cottage"]["beds"]
            S["guests"] = min(beds, S["guests"] + v)
    if "food_days" in ef:
        q = ef["food_days"] * total_pop(S)
        if q >= 0:
            add(S, D, "food", q, "event")
        else:
            take(S, "food", -q, "event")
    if "delivery_delay_days" in ef:
        S["boat"]["next"] += int(ef["delivery_delay_days"])
    S["done"][e["id"]] = S["day"]
    S["ev_kinds"][e["kind"]] = S["ev_kinds"].get(e["kind"], 0) + 1
    S["ev_log"].append([S["day"], e["id"]])
    if len(S["ev_log"]) > 400:
        S["ev_log"] = S["ev_log"][-400:]


def draw_events(S, D, deck):
    flags = game_flags(S, D)
    pool = sorted((e for e in deck["events"] if eligible(S, D, e, flags)), key=lambda e: e["id"])
    for e in pool:
        if e.get("force"):
            apply_event(S, D, e)
    flags = game_flags(S, D)
    for k, chance in enumerate((0.62, 0.12)):
        if rng_next(S, "ev") >= chance:
            continue
        cand = [e for e in pool if not e.get("force") and (e["id"] not in S["done"] or e["repeat"] != "once")
                and eligible(S, D, e, flags) and not (k == 1 and False)]
        if not cand:
            continue
        w = [e["weight"] * (0.55 if e["trigger"].get("location", "any") in FAR_LOCS else 1.0) for e in cand]
        r = rng_next(S, "ev") * sum(w)
        acc = 0.0
        for e, wi in zip(cand, w):
            acc += wi
            if r <= acc:
                apply_event(S, D, e)
                break


# ---------------------------------------------------------------- the day
def weather(S):
    if S["opts"]["calm"]:
        S["wx"], S["rain"] = "fair", 2.6
        return
    sea = season_of(S["day"])
    r = rng_next(S, "wx")
    acc = 0.0
    wx = "fair"
    for name, w in WX_WEIGHTS[sea]:
        acc += w
        if r <= acc:
            wx = name
            break
    S["wx"] = wx
    mm = RAIN_MM.get(wx, 0.0)
    S["rain"] = mm * (0.6 + 0.8 * rng_next(S, "wx")) if mm else 0.0
    S["since_storm"] = 0 if wx == "storm" else S["since_storm"] + 1
    if wx == "storm":
        S["damage"] = min(0.6, S["damage"] + 0.05 * (1.0 - D_SAFETY(S)))


def D_SAFETY(S):
    return 0.4 if S["b"]["lighthouse"]["n"] > 0 else 0.0


def factor(S, key):
    if S["opts"]["calm"]:
        return 1.0
    sea = season_of(S["day"])
    if key == "sea":
        return SEASON_SEA[sea] * SEAS_WEATHER_SEA.get(S["wx"], 1.0)
    if key == "growth":
        return SEASON_GROW[sea]
    if key == "sun":
        return SEASON_SUN[sea] * SKY[S["wx"]]
    if key == "wind":
        return WIND[S["wx"]]
    return 1.0


def op_inputs(b):
    d = dict(b.get("in", {}))
    if b.get("power_in"):
        d["power"] = d.get("power", 0.0) + b["power_in"]
    return d


def run_group(S, D, types, eff_fn):
    # one group of buildings that take inputs: compute wanted effort, share every contested input in proportion
    # to demand (the shortage rule), then work at the effort the inputs allow.
    P = D["params"]
    want = {}
    for t in types:
        n = S["b"][t]["n"]
        if n <= 0:
            continue
        want[t] = eff_fn(t)
    req = {}
    for t, e in want.items():
        for g, q in op_inputs(D["buildings"][t]).items():
            req.setdefault(g, {})[t] = req.get(g, {}).get(t, 0.0) + q * e * S["b"][t]["n"]
    shares = {g: share(S["stock"][g], d) for g, d in req.items()}
    for t, e in want.items():
        b = D["buildings"][t]
        n = S["b"][t]["n"]
        f, soft = 1.0, 1.0
        for g in op_inputs(b):
            s = shares[g][t]
            if g in b.get("soft", ()):
                soft = min(soft, 0.5 + 0.5 * s)
            else:
                f = min(f, s)
        eff = e * f
        out = b.get("out", {})
        # limited by the room in the stores for the output
        for g, q in out.items():
            room = max(0.0, cap_of(S, D, g) - S["stock"][g])
            if q * n * eff > room:
                eff = room / (q * n)
        for g, q in op_inputs(b).items():
            if g in b.get("soft", ()):
                take(S, g, q * n * e * shares[g][t], "in:" + t)
            else:
                take(S, g, q * n * eff, "in:" + t)
        eff_out = eff * soft
        S["op"][t] = eff_out
        src = b.get("source")
        for g, q in out.items():
            amt = q * n * eff_out
            if src == "shoal":
                avail = S["shoal"] * P["shoal_k"]
                amt = min(amt * min(1.0, S["shoal"] / 0.5), avail * 0.5)
                S["shoal"] -= amt / P["shoal_k"]
            elif src == "forest":
                amt = min(amt, S["forest"] * 0.5)
                S["forest"] -= amt
            added = add(S, D, g, amt, ("nature:" + src) if src else "out:" + t)
            if src == "shoal":
                S["shoal"] += (amt - added) / P["shoal_k"]
            elif src == "forest":
                S["forest"] += amt - added


def step(S, D, deck=None):
    P = D["params"]
    day = S["day"]
    B = D["buildings"]
    S["op"] = {}
    weather(S)
    finish_builds(S, D)
    sea_fac = factor(S, "sea")
    # --- events
    if S["opts"]["events"] and deck is not None:
        draw_events(S, D, deck)
    # --- port and boat
    port_call(S, D)
    staff, employed, places = staffing(S, D)
    N = total_pop(S)
    wage_f = 0.85 + 0.15 * S["wage_ratio"]
    dmg_f = 1.0 - S["damage"]
    # --- sources with no inputs (rain, sun, wind, forest, lens without power)
    for t, b in B.items():
        n = S["b"][t]["n"]
        if n <= 0 or b["kind"] != "source" or op_inputs(b):
            continue
        src = b["source"]
        eff = staff.get(t, 1.0) * dmg_f * wage_f if b["jobs"] > 0 else dmg_f
        if src == "rain":
            amt = b["rain_catch_m2"] * S["rain"] * 0.8 / 10.0 * n * dmg_f
            add(S, D, "water", amt, "nature:rain")
            S["op"][t] = 1.0
            continue
        fac = factor(S, {"sun": "sun", "wind": "wind"}.get(src, "x"))
        for g, q in b["out"].items():
            amt = q * n * eff * fac
            if src == "forest":
                amt = min(amt, S["forest"] * 0.5)
                S["forest"] -= amt
            got = add(S, D, g, amt, "nature:" + src)
            if src == "forest":
                S["forest"] += amt - got
        S["op"][t] = eff
    # --- households (class 0: first in line for food, water and power)
    G = S["guests"]
    needs = {"food": P["need_food"] * N + P["guest_food"] * G, "water": P["need_water"] * N + P["guest_water"] * G,
             "power": P["need_power"] * N + P["guest_power"] * G}
    got_food = take(S, "food", needs["food"], "consume")
    short = needs["food"] - got_food
    if short > 1e-9:
        fish_need = short * P["fish_per_food"]
        fish_got = take(S, "fish", fish_need, "consume")
        got_food += fish_got / P["fish_per_food"]
    got_water = take(S, "water", needs["water"], "consume")
    got_power = take(S, "power", needs["power"], "consume")
    f = {k: (1.0 if needs[k] <= 1e-9 else min(1.0, v / needs[k])) for k, v in
         (("food", got_food), ("water", got_water), ("power", got_power))}
    S["last_f"] = f
    # --- buildings that take inputs, stage by stage
    def eff_fn(t):
        b = B[t]
        e = staff.get(t, 1.0) * dmg_f * wage_f if b["jobs"] > 0 else dmg_f
        if b.get("weather"):
            e *= factor(S, b["weather"])
        if b.get("source") == "lens":
            e *= P["lens"]
        if b["kind"] == "robots":
            e = 1.0
        return e
    for stage in (1, 2, 3):
        types = [t for t, b in B.items() if b.get("stage") == stage and op_inputs(b) and b["kind"] in ("source", "transform")]
        run_group(S, D, sorted(types), eff_fn)
    others = [t for t, b in B.items() if b["kind"] in ("lodging", "shop", "service", "robots") and op_inputs(b)]
    run_group(S, D, sorted(others), eff_fn)
    for t, b in B.items():       # services with no power draw still stand at their staffing level
        if S["b"][t]["n"] > 0 and b["kind"] in ("service", "support", "lodging", "shop") and t not in S["op"]:
            S["op"][t] = (staff.get(t, 1.0) if b["jobs"] > 0 else 1.0) * dmg_f
    # --- guests, kiosk
    guests_day(S, D)
    # --- services and the citizens
    citizens(S, D, staff, employed, places, f, N)
    # --- damage repair
    repair(S, D)
    # --- spoil, spill
    for g, gd in D["goods"].items():
        if gd["decay"] > 0:
            take(S, g, S["stock"][g] * gd["decay"], "spoil")
    cp = cap_of(S, D, "power") - D["goods"]["power"]["cap"]     # only a battery shed carries power over to the next day
    if S["stock"]["power"] > cp:
        take(S, "power", S["stock"]["power"] - cp, "spill")
    for g in S["sat"]:
        S["sat"][g] *= 0.9
    # shoal and forest regrow
    k = P["shoal_r"] * S["shoal"] * (1.0 - S["shoal"])
    S["shoal"] = bnorm(S["shoal"] + k)
    regrow = P["forest_regrow"] + sum(B[t].get("forest_regrow", 0) * S["b"][t]["n"] for t in B)
    Kf = float(P["forest_stock"])
    S["forest"] = max(0.0, min(Kf, S["forest"] + regrow * (S["forest"] + 40.0) * (1.0 - S["forest"] / Kf)))
    # --- wildlife (a count-like index, 0..1)
    foot = cells_used(S, D) / float(S["flat_cells"])
    prot = sum(B[t].get("wild_protect", 0) * S["b"][t]["n"] for t in B)
    target = bnorm(0.95 - 0.5 * foot - 0.5 * max(0.0, 0.5 - S["shoal"]) + min(0.15, prot))
    S["wild"] += 0.02 * (target - S["wild"])
    # --- month end
    S["m"]["_days"] = S["m"].get("_days", 0) + 1
    if day % 30 == 0:
        month_end(S, D)
    S["day"] = day + 1


# ---------------------------------------------------------------- the port
def credit_price(D, g):
    return D["goods"][g]["price"]


def port_call(S, D):
    P = D["params"]
    B = S["boat"]
    day = S["day"]
    if day < B["next"]:
        return
    if S["wx"] == "storm" or (S["wx"] == "fog" and rng_next(S, "mix") < 0.3 * (1.0 - D_SAFETY(S))):
        B["next"] = day + 1
        B["skipped"] += 1
        return
    lvl = credit_level(day)
    B["next"] = day + BOAT_INTERVAL[lvl]
    B["calls"] += 1
    hold, seats = boat_stats(S, D)
    pl, pcap = port_level(S, D)
    slots = min(float(hold), float(pcap))
    B["slots_cap"] += slots
    used = 0.0
    # imports, in the order of the standing orders
    for o in S["orders"]:
        g = o["good"]
        gd = D["goods"][g]
        want = max(0.0, o["target"] - S["stock"][g])
        want = min(want, cap_of(S, D, g) - S["stock"][g])
        if gd["slots"] > 0:
            want = min(want, (slots - used) / gd["slots"])
        if want <= 1e-9:
            continue
        unit = gd["price"]
        by_credit = g in CREDIT_GOODS[lvl] and S["credit"] > 0
        qty = want
        if by_credit:
            qty = min(want, S["credit"] / unit)
            S["credit"] -= qty * unit
            S["credit_spent"] += qty * unit
        else:
            cu = unit * P["import_cash_factor"]
            qty = min(want, max(0.0, S["cash"]) / cu)
            S["cash"] -= qty * cu
            line(S, "imports_cash", -qty * cu)
        got = add(S, D, g, qty, "import")
        used += got * gd["slots"]
    # exports: surplus above the keep level, sold at base price times the export factor times a saturation discount
    for g, keep in sorted(S["exports"].items()):
        gd = D["goods"][g]
        sur = S["stock"][g] - keep
        if sur <= 1e-9:
            continue
        if gd["slots"] > 0:
            sur = min(sur, (slots - used) / gd["slots"])
        if sur <= 1e-9:
            continue
        q = take(S, g, sur, "export")
        depth = P["depth"][g]
        mult = math.exp(-(S["sat"][g] + q / 2.0) / depth)
        rev = q * gd["price"] * P["export_factor"] * mult
        S["sat"][g] += q
        S["cash"] += rev
        line(S, "exports", rev)
        used += q * gd["slots"]
    B["slots_used"] += used
    # passengers: guests and settlers share the seats
    arrive_passengers(S, D, seats)


def arrive_passengers(S, D, seats):
    P = D["params"]
    beds = S["b"]["guest_cottage"]["n"] * D["buildings"]["guest_cottage"]["beds"]
    free_beds = max(0.0, beds - S["guests"])
    occ = P["occupancy"][month_index(S["day"])] if not S["opts"]["calm"] else 0.40
    attr = attraction(S, D)
    S["attr"] = attr
    interval = BOAT_INTERVAL[credit_level(S["day"])]
    # demand for guest arrivals over the days this call stands for
    d_arr = beds * occ / P["stay_nights"] * interval * attr
    arr = min(seats * 0.5, free_beds, d_arr)
    if arr > 0:
        S["guests"] += arr
        c = arr * P["clean_per_stay"]
        S["cash"] -= c
        line(S, "cleaning", -c)
    # settlers
    cap, _ = housing(S, D)
    free = max(0.0, cap - total_pop(S))
    labr, jobs_places = labour(S, D), 0.0
    staff, employed, places = staffing(S, D)
    vac = max(0.0, places - employed)
    gate = bnorm((S["happy"] - 0.5) / 0.25) * (1.0 if S["last_f"]["food"] > 0.9 and S["last_f"]["water"] > 0.9 else 0.0)
    imm = min(seats * 0.5, free, vac * 0.6) * gate
    if imm > 0:
        S["pop"]["adult"] += imm * 0.65
        S["pop"]["child"] += imm * 0.30
        S["pop"]["elder"] += imm * 0.05
        S["immig_total"] += imm


def attraction(S, D):
    B = D["buildings"]
    a = 0.6 + 0.5 * S["wild"]
    for t in ("wildlife_hide", "kiosk", "community_hall", "lighthouse"):
        if S["b"][t]["n"] > 0:
            a += B[t].get("attract", 0.08)
    a += 0.2 * (S["happy"] - 0.5)
    return max(0.2, min(1.5, a))


def guests_day(S, D):
    P = D["params"]
    G = S["guests"]
    beds = S["b"]["guest_cottage"]["n"] * D["buildings"]["guest_cottage"]["beds"]
    op = S["op"].get("guest_cottage", 1.0)
    if G > beds:
        G = S["guests"] = beds
    inc = G * P["bed_night"] * (0.5 + 0.5 * min(1.0, op))
    S["cash"] += inc
    line(S, "guests", inc)
    plat = inc * P["platform_share"]
    S["cash"] -= plat
    line(S, "platform", -plat)
    S["guest_nights"] += G
    S["guests"] = max(0.0, G - G / P["stay_nights"])
    # kiosk
    kn = S["b"]["kiosk"]["n"]
    if kn > 0:
        sh = D["buildings"]["kiosk"]["shop"]
        cust = min(sh["capacity"] * kn * S["op"].get("kiosk", 1.0), 0.5 * G + 0.1 * total_pop(S))
        foodneed = cust * sh["food_per"]
        got = take(S, "food", foodneed, "in:kiosk")
        served = got / sh["food_per"] if sh["food_per"] > 0 else cust
        rev = served * sh["spend"]
        S["cash"] += rev
        line(S, "kiosk", rev)


# ---------------------------------------------------------------- citizens
def citizens(S, D, staff, employed, places, f, N):
    P = D["params"]
    B = D["buildings"]
    W = P["weights"]
    cap, avgq = housing(S, D)
    housed = min(N, cap)
    lab = labour(S, D)
    emp_share = 1.0 if lab < 0.5 else min(1.0, employed / lab)
    unemployed = max(0.0, lab - employed)
    health_cap = sum(B[t].get("health", 0) * S["b"][t]["n"] * S["op"].get(t, 0.0) for t in B if B[t].get("health"))
    leis_cap = sum(B[t].get("leisure", 0) * S["b"][t]["n"] * S["op"].get(t, 0.0) for t in B if B[t].get("leisure"))
    if S["b"]["kiosk"]["n"]:
        leis_cap += 30 * S["b"]["kiosk"]["n"] * S["op"].get("kiosk", 0.0)
    cov_h = min(1.0, health_cap / N) if N > 0 else 1.0
    cov_l = min(1.0, leis_cap / N) if N > 0 else 1.0
    foot = cells_used(S, D) / float(S["flat_cells"])
    beauty = bnorm(0.45 * S["wild"] + 0.35 * (1.0 - foot) + 0.2 * (1.0 - S["damage"]) + 0.1)
    a = 0.15
    drv = S["drv"]
    tgt = {"food": f["food"], "water": f["water"], "power": 0.3 + 0.7 * f["power"],
           "housing": (housed / N if N > 0 else 1.0) * (0.4 + 0.6 * avgq),
           "jobs": emp_share, "health": 0.3 + 0.7 * cov_h, "leisure": 0.3 + 0.7 * cov_l,
           "wages": S["wage_ratio"] * (0.6 + 0.4 * min(1.0, S["edict"]["wage"])), "beauty": beauty}
    for k, v in tgt.items():
        drv[k] = drv.get(k, v) + a * (v - drv.get(k, v))
    wsum = sum(W.values())
    target = sum(W[k] * drv[k] for k in W) / wsum
    S["happy"] += 0.05 * (target - S["happy"])
    # hunger and thirst (gentle: they build and they ease; people who cannot be fed leave by boat)
    if f["food"] < 0.999:
        S["hunger"] = bnorm(S["hunger"] + (1.0 - f["food"]) * 0.2)
    else:
        S["hunger"] = bnorm(S["hunger"] - 0.1)
    if f["water"] < 0.999:
        S["thirst"] = bnorm(S["thirst"] + (1.0 - f["water"]) * 0.3)
    else:
        S["thirst"] = bnorm(S["thirst"] - 0.15)
    distress = max(S["hunger"], S["thirst"])
    pop = S["pop"]
    # ageing, births, natural change
    c2a = pop["child"] / (16.0 * YEAR)
    a2e = pop["adult"] / (48.0 * YEAR)
    e_out = pop["elder"] / (12.0 * YEAR)
    free = max(0.0, cap - N)
    birth = min(pop["adult"] * 0.025 / YEAR * (0.5 + S["happy"]) * (1.0 if distress < 0.2 else 0.0), free)
    pop["child"] += birth - c2a
    pop["adult"] += c2a - a2e
    pop["elder"] += a2e - e_out
    S["births"] += birth
    # leaving by boat: hunger and thirst, low happiness, long unemployment, homeless
    N2 = total_pop(S)
    rate = 0.02 * distress + 0.003 * max(0.0, 0.45 - S["happy"]) / 0.45 + (0.0015 * unemployed / N2 if N2 > 0 else 0.0)
    leave = N2 * rate
    over = max(0.0, N2 - cap)
    leave += over * 0.2
    leave = min(leave, N2)
    if N2 > 0 and leave > 0:
        k = leave / N2
        for b_ in ("child", "adult", "elder"):
            pop[b_] -= pop[b_] * k
        S["emig_total"] += leave
    S["employed"], S["places"], S["unemployed"] = employed, places, unemployed
    S["wage_due"] += employed * P["wage_month"] * S["edict"]["wage"] / 30.0


def repair(S, D):
    nb = sum(S["b"][t]["n"] for t in S["b"])
    if S["damage"] <= 0 or nb <= 0:
        return
    want = min(S["damage"], 0.03)
    need = want * 2.0 * nb
    if S["stock"]["planks"] >= need:
        take(S, "planks", need, "repair")
        c = min(150.0 * nb * want, max(0.0, S["cash"]))      # a short purse never stops a repair (cosy rule)
        S["cash"] -= c
        line(S, "repairs", -c)
        S["damage"] -= want


# ---------------------------------------------------------------- the monthly budget
def month_end(S, D):
    P = D["params"]
    B = D["buildings"]
    employed = S.get("employed", 0.0)
    due = S["wage_due"] + S["arrears"]
    S["wage_due"] = 0.0
    rent = total_pop(S) * P["rent_month_per_head"] * S["edict"]["rent"]
    S["cash"] += rent
    line(S, "rent", rent)
    upkeep = sum(S["b"][t]["n"] * building_value(B[t]) * P["upkeep_year"] / 12.0 for t in B if building_value(B[t]) > 0)
    if S["b"]["cargo_boat"]["n"] > 0:
        upkeep += P["boat_running_month"]
    pay = min(max(S["cash"], 0.0), due)
    S["cash"] -= pay
    line(S, "wages", -pay)
    S["wage_ratio"] = 1.0 if due <= 1e-9 else pay / due
    S["arrears"] = due - pay
    up = min(max(S["cash"], 0.0), upkeep)
    S["cash"] -= up
    line(S, "upkeep", -up)
    m = S["m"]
    inc = sum(v for k, v in m.items() if not k.startswith("_") and v > 0)
    out = sum(v for k, v in m.items() if not k.startswith("_") and v < 0)
    rec = {"day": S["day"], "pop": round(total_pop(S), 3), "cash": round(S["cash"], 2), "credit": round(S["credit"], 2),
           "happy": round(S["happy"], 4), "income": round(inc, 2), "spend": round(out, 2), "net": round(inc + out, 2),
           "lines": {k: round(v, 2) for k, v in m.items() if not k.startswith("_")},
           "guests_nights": round(S["guest_nights"], 2), "arrears": round(S["arrears"], 2)}
    S["series"].append(rec)
    S["m"] = {}
    if S["day"] % YEAR == 0:
        S["years"].append(year_report(S, D))


def food_days(S, D):
    N = total_pop(S) + S["guests"]
    if N <= 0:
        return 99.0
    return (S["stock"]["food"] + S["stock"]["fish"] / D["params"]["fish_per_food"]) / N


def water_days(S, D):
    N = total_pop(S) + S["guests"]
    return 99.0 if N <= 0 else S["stock"]["water"] / (N * 1.0)


def year_report(S, D):
    y = S["day"] // YEAR
    rows = S["series"][-12:]
    lines = {}
    for r in rows:
        for k, v in r["lines"].items():
            lines[k] = lines.get(k, 0.0) + v
    cap, _ = housing(S, D)
    return {
        "year": y, "pop": round(total_pop(S), 1), "child": round(S["pop"]["child"], 1), "adult": round(S["pop"]["adult"], 1),
        "elder": round(S["pop"]["elder"], 1), "housing": cap, "jobs": round(S.get("places", 0.0), 1),
        "employed": round(S.get("employed", 0.0), 1), "unemployed": round(S.get("unemployed", 0.0), 1),
        "happy": round(S["happy"] * 100, 1), "food_days": round(min(food_days(S, D), 99), 1),
        "water_days": round(min(water_days(S, D), 99), 1), "cash": round(S["cash"]), "credit": round(S["credit"]),
        "reach_pct": round(reach_pct(S["day"])), "credit_level": credit_level(S["day"]),
        "net_year": round(sum(r["net"] for r in rows)), "lines": {k: round(v) for k, v in sorted(lines.items())},
        "buildings": sum(S["b"][t]["n"] for t in S["b"]), "shoal": round(S["shoal"], 2), "forest": round(S["forest"]),
        "wild": round(S["wild"], 2), "guest_nights": round(S["guest_nights"]), "boat_calls": S["boat"]["calls"],
        "events": sum(S["ev_kinds"].values()), "damage": round(S["damage"], 2), "emigrated": round(S["emig_total"], 1),
        "immigrated": round(S["immig_total"], 1)}


def check_ledger(S, D, tol=1e-6):
    # stock now = stock at start + all inflows - all outflows, for every good (nothing from nothing, nothing lost)
    bad = []
    for g in D["goods"]:
        ins = sum(S["flow"][g]["in"].values())
        outs = sum(S["flow"][g]["out"].values())
        if abs(S["start_stock"][g] + ins - outs - S["stock"][g]) > tol * max(1.0, ins + outs):
            bad.append(g)
        if S["stock"][g] < -1e-9:
            bad.append(g + " negative")
    return bad
