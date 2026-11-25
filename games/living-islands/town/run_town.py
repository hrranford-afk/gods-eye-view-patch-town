# Island Town: build strategies (stand-in players), a four-year run, the yearly report and the charts.
# A strategy is a list of rules, in priority order: (building, how many we want, a test on the town's numbers).
# This is a stand-in for a player, not a player. Every number is a guess.
#   python3 town/run_town.py            prints the four-year report for every strategy
#   python3 town/run_town.py --charts   also writes town/maps/*.png (needs matplotlib)
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import town_sim as T


def metrics(S, D):
    N = T.total_pop(S)
    cap, _ = T.housing(S, D)
    queued_cap = sum(len(S["b"][t]["q"]) * b["housing"]["cap"] for t, b in D["buildings"].items() if b.get("housing"))
    staff, employed, places = T.staffing(S, D)
    return {"day": S["day"], "pop": N, "free_housing": cap + queued_cap - N, "food_days": T.food_days(S, D),
            "water_days": T.water_days(S, D), "cash": S["cash"], "vacancies": places - employed,
            "unemployed": max(0.0, T.labour(S, D) - employed), "n": {t: T.n_all(S, t) for t in D["buildings"]},
            "planks": S["stock"]["planks"], "happy": S["happy"], "power_f": S["last_f"]["power"]}


def housing_type(S, D):
    return "cottage" if T.kit_open(S, D, "cottage") and S["credit"] >= 30000 else "hut"


# ---- the rules. m = metrics, n = m["n"] (built plus queued counts)
def rules_homestead(S, D):
    return [
        ("cistern", 1, lambda m: True), ("fish_dock", 1, lambda m: True), ("smokehouse", 1, lambda m: m["n"]["fish_dock"] >= 1),
        ("garden", 1, lambda m: m["n"]["cistern"] >= 1), ("solar_shed", 1, lambda m: True),
        (housing_type(S, D), 99, lambda m: m["free_housing"] < 2.5 and m["food_days"] > 4 and m["water_days"] > 4 and m["n"]["fish_dock"] >= 1),
        ("jetty", 1, lambda m: m["day"] > 20), ("woodcutter", 1, lambda m: m["day"] > 40), ("sawmill", 1, lambda m: m["n"]["woodcutter"] >= 1),
        ("tree_nursery", 1, lambda m: m["n"]["woodcutter"] >= 1), ("store_shed", 1, lambda m: m["day"] > 60),
        ("cistern", 2, lambda m: m["pop"] > 28), ("well", 1, lambda m: m["pop"] > 28),
        ("clinic", 1, lambda m: m["pop"] >= 24), ("solar_shed", 2, lambda m: m["pop"] > 24), ("battery_shed", 1, lambda m: m["pop"] > 24),
        ("community_hall", 1, lambda m: m["pop"] >= 32 and m["cash"] > 25000), ("workshop", 1, lambda m: m["day"] > 150),
        ("fish_dock", 2, lambda m: m["pop"] > 26), ("smokehouse", 2, lambda m: m["n"]["fish_dock"] >= 2),
        ("lighthouse", 1, lambda m: m["day"] > 200 and m["cash"] > 30000), ("garden", 2, lambda m: m["pop"] > 40),
        ("solar_shed", 3, lambda m: m["power_f"] < 0.8 and m["day"] > 60), ("wind_post", 1, lambda m: m["power_f"] < 0.8 and m["day"] > 120),
        ("cistern", 3, lambda m: m["water_days"] < 6 and m["day"] > 60),
    ]


def rules_holiday(S, D):
    return [
        ("cistern", 1, lambda m: True), ("solar_shed", 1, lambda m: True), ("guest_cottage", 1, lambda m: True),
        ("kiosk", 1, lambda m: m["n"]["guest_cottage"] >= 1), ("guest_cottage", 2, lambda m: m["day"] > 20),
        ("wildlife_hide", 1, lambda m: m["n"]["guest_cottage"] >= 2), ("guest_cottage", 3, lambda m: m["day"] > 40),
        ("jetty", 1, lambda m: m["day"] > 60), ("guest_cottage", 4, lambda m: m["day"] > 80),
        (housing_type(S, D), 99, lambda m: m["free_housing"] < 2.5 and m["food_days"] > 4 and m["water_days"] > 4 and m["n"]["guest_cottage"] >= 2),
        ("cistern", 2, lambda m: m["pop"] > 20 or m["n"]["guest_cottage"] >= 3), ("solar_shed", 2, lambda m: m["n"]["guest_cottage"] >= 2),
        ("fish_dock", 1, lambda m: m["day"] > 300 or m["pop"] >= 26), ("smokehouse", 1, lambda m: m["n"]["fish_dock"] >= 1),
        ("garden", 1, lambda m: m["day"] > 400), ("battery_shed", 1, lambda m: m["day"] > 120), ("clinic", 1, lambda m: m["pop"] >= 22),
        ("guest_cottage", 5, lambda m: m["day"] > 160), ("lighthouse", 1, lambda m: m["day"] > 160 and m["cash"] > 30000),
        ("community_hall", 1, lambda m: m["pop"] >= 28 and m["cash"] > 25000), ("store_shed", 1, lambda m: m["day"] > 100),
        ("guest_cottage", 6, lambda m: m["day"] > 240), ("fish_dock", 2, lambda m: m["pop"] > 34),
        ("solar_shed", 3, lambda m: m["power_f"] < 0.8 and m["day"] > 60), ("wind_post", 1, lambda m: m["power_f"] < 0.8 and m["day"] > 120),
        ("cistern", 3, lambda m: m["water_days"] < 6 and m["day"] > 60),
    ]


def rules_trader(S, D):
    return [
        ("cistern", 1, lambda m: True), ("fish_dock", 1, lambda m: True), ("woodcutter", 1, lambda m: True),
        ("smokehouse", 1, lambda m: m["n"]["fish_dock"] >= 1), ("solar_shed", 1, lambda m: True),
        ("sawmill", 1, lambda m: m["n"]["woodcutter"] >= 1), ("jetty", 1, lambda m: m["day"] > 15),
        (housing_type(S, D), 99, lambda m: m["free_housing"] < 2.5 and m["food_days"] > 4 and m["water_days"] > 4 and m["n"]["fish_dock"] >= 1),
        ("tree_nursery", 1, lambda m: m["n"]["woodcutter"] >= 1), ("garden", 1, lambda m: m["n"]["cistern"] >= 1),
        ("store_shed", 1, lambda m: m["day"] > 40), ("workshop", 1, lambda m: m["day"] > 90),
        ("fish_dock", 2, lambda m: m["pop"] >= 18), ("fish_dock", 3, lambda m: m["pop"] >= 40 and m["day"] > 500), ("smokehouse", 2, lambda m: m["n"]["fish_dock"] >= 2),
        ("solar_shed", 2, lambda m: m["n"]["sawmill"] >= 1), ("battery_shed", 1, lambda m: m["day"] > 100),
        ("quay", 1, lambda m: m["n"]["jetty"] >= 1 and m["day"] > 120), ("cargo_boat", 1, lambda m: m["n"]["jetty"] >= 1 and m["day"] > 120),
        ("clinic", 1, lambda m: m["pop"] >= 24), ("robot_depot", 1, lambda m: m["day"] > 180),
        ("cistern", 2, lambda m: m["pop"] > 28), ("guest_cottage", 1, lambda m: m["day"] > 200),
        ("community_hall", 1, lambda m: m["pop"] >= 32 and m["cash"] > 25000), ("lighthouse", 1, lambda m: m["day"] > 220 and m["cash"] > 30000),
        ("solar_shed", 3, lambda m: m["power_f"] < 0.8 and m["day"] > 60), ("wind_post", 1, lambda m: m["power_f"] < 0.8 and m["day"] > 120),
        ("cistern", 3, lambda m: m["water_days"] < 6 and m["day"] > 60),
    ]


def rules_idle(S, D):
    return []


STRATEGIES = {"idle": rules_idle, "holiday": rules_holiday, "homestead": rules_homestead, "trader": rules_trader}


def set_orders(S, D, name):
    # standing orders for the boat: what to bring in (credit pays first while the catalogue has it) and what to sell.
    N = max(T.total_pop(S), 8.0)
    if name == "idle":
        S["orders"], S["exports"] = [], {}
        return
    # cosy edicts: a shared-work island pays less and charges less; any town goes frugal when the purse runs low
    frugal = S["cash"] < 6000.0 and S["day"] > 60
    S["edict"] = {"wage": 0.15, "rent": 0.0} if name == "homestead" else ({"wage": 0.6, "rent": 1.0} if frugal else {"wage": 1.0, "rent": 1.0})
    iv = T.BOAT_INTERVAL[T.credit_level(S["day"])] + 3
    poor = S["credit"] < 20000 and S["cash"] < 40000          # paying cash for imports: bring only what is needed
    lvl = T.credit_level(S["day"])
    credit_food = lvl >= 2 and S["credit"] > 20000
    local_food = S["b"]["smokehouse"]["n"] > 0 and S["b"]["fish_dock"]["n"] > 0
    if name == "homestead":
        orders = [{"good": "food", "target": (6.0 if not local_food else 3.0) * N + iv * N}]
    else:
        orders = [{"good": "food", "target": (8.0 if (credit_food or not local_food) else 3.0) * N + iv * N}]
    if poor:
        orders = [{"good": "food", "target": N * iv}]
    orders += [{"good": "tools", "target": 6.0}, {"good": "metal", "target": 3.0}]
    orders.append({"good": "planks", "target": 60.0 if (S["b"]["sawmill"]["n"] == 0 or S["forest"] < 200) else 25.0})
    exports = {}
    sm = S["b"]["smokehouse"]["n"]
    if name == "trader":
        # sell fish for cash while credit feeds the table; smoke it once the credit stops feeding us
        exports["fish"] = 12.0 if credit_food else 30.0 * sm + 10.0
        exports["food"] = 12.0 * N
        exports["planks"] = 80.0
        exports["tools"] = 10.0
        exports["timber"] = 900.0
    elif name == "homestead":
        exports["fish"] = 30.0 * sm + 40.0
        exports["food"] = 15.0 * N
        exports["planks"] = 120.0
    elif name == "holiday":
        exports["fish"] = 12.0 if credit_food else 30.0 * sm + 20.0
        exports["food"] = 15.0 * N
        exports["planks"] = 150.0
    S["orders"], S["exports"] = orders, exports


def plan_day(S, D, name, rules_cache):
    if S["day"] % 3 != 0:
        return
    set_orders(S, D, name)
    if name == "idle":
        return
    done = 0
    m = metrics(S, D)
    for t, want, cond in STRATEGIES[name](S, D):
        if done >= 2:
            break
        if m["n"][t] >= want or not cond(m):
            continue
        reserve = 2.0 * 350.0 * max(2.0, S.get("employed", 0.0) + 2.0)
        if T.start_build(S, D, t, reserve=reserve):
            done += 1
            m["n"][t] += 1
            if D["buildings"][t].get("housing"):
                m["free_housing"] += D["buildings"][t]["housing"]["cap"]


def run(name, seed=1, days=T.DAYS, D=None, deck=None, events=True, calm=False, snapshots=None):
    D = D or T.load_data()
    deck = deck if deck is not None else (T.load_deck() if events else None)
    S = T.new_town(D, seed, calm=calm, events=events)
    for _ in range(days):
        plan_day(S, D, name, None)
        T.step(S, D, deck)
        if snapshots is not None and (S["day"] - 1) % 30 == 0:
            snapshots.append(S["day"] - 1)
    return S, D


def print_report(name, S, D):
    print("== strategy %s, seed %d ==" % (name, S["seed"]))
    print("%-4s %6s %5s %5s %5s %5s %6s %6s %8s %9s %6s %6s %6s" % ("year", "pop", "hous", "jobs", "empl", "happy", "foodD", "watD", "cash", "credit", "reach", "bldgs", "events"))
    for y in S["years"]:
        print("%-4d %6.1f %5d %5.1f %5.1f %5.1f %6.1f %6.1f %8d %9d %5d%% %6d %6d" % (
            y["year"], y["pop"], y["housing"], y["jobs"], y["employed"], y["happy"], y["food_days"], y["water_days"], y["cash"],
            y["credit"], y["reach_pct"], y["buildings"], y["events"]))
    for y in S["years"]:
        print("  year %d budget: net %+d | %s" % (y["year"], y["net_year"], ", ".join("%s %+d" % (k, v) for k, v in y["lines"].items())))
    print("  built:", ", ".join("%s x%d" % (t, S["b"][t]["n"]) for t in D["buildings"] if S["b"][t]["n"]))
    y = S["years"][-1] if S["years"] else {}
    print("  end: shoal %.2f forest %d wildlife %.2f guest nights %d, left by boat %.0f, arrived %.0f, state hash %s" % (
        S["shoal"], S["forest"], S["wild"], S["guest_nights"], S["emig_total"], S["immig_total"], T.state_hash(S)[:16]))


def charts(results, outdir):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    cols = {"holiday": "#c2531b", "homestead": "#2e7d5b", "trader": "#2b5fa3", "idle": "#777777"}
    for key, title, fn, scale in (("pop", "Citizens (count)", "pop.png", 1.0), ("cash", "Cash (in-game pounds, thousands)", "budget.png", 0.001),
                                  ("happy", "Happiness (0 to 100)", "happiness.png", 100.0)):
        fig, ax = plt.subplots(figsize=(7.2, 3.8), dpi=110)
        for name, S in results.items():
            rows = [r for r in S["series"] if key != "happy" or r["pop"] >= 1.0]       # happiness of nobody is not drawn
            xs = [r["day"] / 360.0 for r in rows]
            ys = [r[key] * scale for r in rows]
            ax.plot(xs, ys, label=name, color=cols[name], lw=2.0 if name != "idle" else 1.4, ls="-" if name != "idle" else "--")
        ax.set_xlabel("year"); ax.set_title(title + ": four years, seed 1"); ax.grid(alpha=0.25); ax.legend(frameon=False, ncol=4, loc="best")
        ax.set_xticks([0, 1, 2, 3, 4])
        for sp in ("top", "right"):
            ax.spines[sp].set_visible(False)
        fig.tight_layout(); fig.savefig(os.path.join(outdir, fn)); plt.close(fig)
    fig, ax = plt.subplots(figsize=(7.2, 3.6), dpi=110)
    xs = [d / 360.0 for d in range(1, 1441, 10)]
    ax.plot(xs, [T.reach_pct(d) for d in range(1, 1441, 10)], color="#444444", lw=2)
    ax.set_title("Gift reach (percent of year one): the thinning curve"); ax.set_xlabel("year"); ax.grid(alpha=0.25)
    ax.set_xticks([0, 1, 2, 3, 4])
    for sp in ("top", "right"):
        ax.spines[sp].set_visible(False)
    fig.tight_layout(); fig.savefig(os.path.join(outdir, "reach.png")); plt.close(fig)


def main(argv):
    D = T.load_data()
    deck = T.load_deck()
    seed = 1
    results = {}
    for name in ("idle", "holiday", "homestead", "trader"):
        S, _ = run(name, seed, D=D, deck=deck)
        results[name] = S
        print_report(name, S, D)
        print("  ledger check:", T.check_ledger(S, D) or "ok")
    if "--charts" in argv:
        outdir = os.path.join(HERE, "maps")
        os.makedirs(outdir, exist_ok=True)
        charts(results, outdir)
        print("charts written to", outdir)
    if "--json" in argv:
        json.dump({k: v["years"] for k, v in results.items()}, open(os.path.join(HERE, "maps", "years.json"), "w"), indent=1)


if __name__ == "__main__":
    main(sys.argv[1:])
