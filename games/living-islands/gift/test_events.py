#!/usr/bin/env python3
"""Tests and a headless four-year simulation for the Gift event deck (events.json).

Pure python, no packages. Run:  python3 gift/test_events.py            (tests, then a short report)
                                python3 gift/test_events.py --report   (full simulation report only)
The simulation is a rough stand-in for a player: it is not the game. Every number is a guess.
"""
import json, os, random, re, sys, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
DECK = json.load(open(os.path.join(HERE, "events.json"), encoding="utf-8"))
EVENTS = DECK["events"]
REG = DECK["registries"]
BY_ID = {e["id"]: e for e in EVENTS}
DRAWN = [e for e in EVENTS if e["act"] >= 1]          # act 0 is the scripted prelude: never drawn

# the six town bottle messages, copied from gift_day.js BOTTLES (they must stay unedited)
TOWN_BOTTLES = [
    "The plank you fitted today will hold. The one beside it wants a longer nail.",
    "Between the second and third autumn storm there is always one still day. Plan your roof for it.",
    "The seals come to the east rocks when the water is coldest. Leave them room and they will stay.",
    "The first rain fills a barrel faster than you expect. Do not mind the small leak. Mend it on a dry morning.",
    "A lamp that burns all night will not be missed. A lamp that burns one hour at dusk will be seen.",
    "Someone is hoping this place is kind to you. That is all this note is for.",
]

# ---------------------------------------------------------------- calendar, tide, credit
def season_of(day):
    d = (day - 1) % 360 + 1
    if d <= 30 or d > 300: return "spring"
    if d <= 120: return "summer"
    if d <= 210: return "autumn"
    return "winter"

def credit_level(day):
    for lv, (a, b) in REG["credit_levels"].items():
        if a <= day <= b: return int(lv)
    return 0

# lowest tide per day (m), days 1 to 14 from level1/tide.py as quoted in LEVEL1_DESIGN.md; 10 and 11 are my guess
LOW = {1: -0.34, 2: -0.43, 3: -0.55, 4: -0.68, 5: -0.81, 6: -0.92, 7: -1.00, 8: -1.02, 9: -1.05, 10: -1.05, 11: -1.00, 12: -0.91, 13: -0.80, 14: -0.68, 15: -0.50}
def low_tide(day):
    ph = (day - 1) % 14.77 + 1                 # a spring-neap cycle of 14.77 days
    a = int(ph); b = a + 1; f = ph - a
    lo = LOW[a]; hi = LOW.get(b, -0.34)
    return lo + (hi - lo) * f

def tide_ok(cond, day):
    if cond in ("any", "low", "high"): return True
    if cond in ("spring_low", "spring_high"): return low_tide(day) <= -0.74
    return False

# ---------------------------------------------------------------- Level 1 reachability
def reachable(e):
    """Can the place of this event be reached on the Level 1 map when its trigger is true?"""
    t = e["trigger"]; loc = t["location"]; fa = set(t.get("flags_all", []))
    boat = bool(fa & {"has_boat", "boat_motor", "skiff", "woods_visited", "ribs_seen", "lone_tree_seen"})
    if loc in ("any", "home_beach", "home_yard", "hut", "lamp", "jetty", "skerry_west"): return True
    if loc == "hoard":
        return boat or "hoard_found" in fa or (t["tide"] == "spring_low" and t["day_max"] >= 5)
    if loc == "woods":
        return boat or (t["tide"] == "spring_low" and t["day_max"] >= 6)
    if loc in ("reef", "seals", "rock", "skerry_east", "sea"):
        return boat
    return False

# ---------------------------------------------------------------- text rules
BRANDS = r"google|apple|amazon|microsoft|facebook|coca|pepsi|ikea|tesco|nike|lego|disney|netflix|ford|toyota|bmw|starbucks|mcdonald|uber|sony|nintendo|tesla|volvo|nokia"
PLACES = r"london|england|scotland|britain|british|ireland|atlantic|orkney|shetland|hebrides|worcester|birmingham|leicester|kidderminster|europe|america|france|norway|wales|iceland"
ROBOT_WORDS = r"robot|robots|carrier|carriers|machine|machines|hauler|sorter"
FEELINGS = r"happy|sad|lonely|proud|afraid|scared|loves|loved|hates|angry|glad|sorry|tired|eager|shy|brave|cheerful|grumpy|feels|felt|wants|hopes|sulks|smiles|smiled|friend|friends|pleased|worried|curious|excited"
FACE = r"face|faces|eyes|eye|smile|smiling|voice|speaks|spoke|says"
AI_WORDS = r"AI|A\.I\.|artificial|intelligence|algorithm|computer|software|helper|machine learning"
GORY = r"kill|killed|blood|bleed|bleeding|dead|die|dies|died|corpse|body|bodies|drown|drowned|gun|wound|wounded|murder|grave|skull|bones"
ALLOWED_CAPS = {"I", "Hoard"}

def words(s): return re.findall(r"[A-Za-z']+", s)

def odd_capitals(text):
    """Capital words that are not at the start of a sentence (names of people or places)."""
    out = []
    for m in re.finditer(r"(?<![.!?:\"‘“] )(?<!^)\b([A-Z][a-z]+)\b", text):
        w = m.group(1)
        if w in ALLOWED_CAPS: continue
        out.append(w)
    return out

# ---------------------------------------------------------------- simulation
LOC_WEIGHT = {"any": 1, "home_beach": 1, "home_yard": 1, "hut": .9, "lamp": .9, "jetty": 1, "skerry_west": .8, "hoard": .6, "woods": .6,
              "reef": .5, "seals": .5, "rock": .5, "skerry_east": .5, "sea": .5}
WEATHER_P = {
    "spring": {"fair": .30, "clear": .15, "overcast": .20, "showers": .15, "rain": .10, "fog": .07, "storm": .03},
    "summer": {"fair": .38, "clear": .20, "overcast": .14, "showers": .10, "rain": .07, "fog": .09, "storm": .02},
    "autumn": {"fair": .15, "clear": .06, "overcast": .22, "showers": .10, "rain": .24, "fog": .13, "storm": .10},
    "winter": {"fair": .09, "clear": .13, "overcast": .28, "showers": .05, "rain": .20, "fog": .10, "storm": .15}}
GAME_FLAG_DAYS = {"robot_started": 1, "has_boat": 1, "barrel_up": 1, "hut_patched": 2, "built_jetty": 4, "built_cistern": 9,
                  "built_hide": 40, "garden_started": 60, "built_cottage": 75, "built_kiosk": 140}
DRAW_RATE = 0.62      # chance of one unforced draw on a day (a guess; see EVENTS.md)
EXTRA_RATE = 0.12     # chance of a second draw the same day

def weighted(rng, items):
    tot = sum(w for _, w in items)
    if tot <= 0: return None
    r = rng.random() * tot
    for it, w in items:
        r -= w
        if r <= 0: return it
    return items[-1][0]

class Sim:
    def __init__(self, seed, style=None):
        self.rng = random.Random(seed)
        self.style = style or self.rng.choice(REG["attitudes"])
        self.flags = set(); self.att = {a: 0 for a in REG["attitudes"]}
        self.stock = {k: 0 for k in REG["stock"]}; self.cash = 60000; self.counts = {"seals": 0, "birds": 0, "guests": 0}
        self.done = set(); self.last = {}; self.fired = []   # (day, id)
        self.last_storm = -999; self.log = []
        # flags that depend on the player's style (a guess at behaviour)
        self.skip = set()
        for f in ("built_cistern", "built_hide", "built_cottage", "built_kiosk", "garden_started"):
            if self.rng.random() < .2: self.skip.add(f)
        if self.style == "distrust": self.skip.add("built_kiosk")

    def derived(self):
        d = set()
        for a, v in self.att.items():
            if v >= 3: d.add("att_" + a)
        if len([f for f in self.flags if f.startswith("stamp_") and f != "stamp_noted"]) >= 3: d.add("stamps_seen_3")
        return d

    def eligible(self, e, day, weather):
        t = e["trigger"]
        if not (t["day_min"] <= day <= t["day_max"]): return False
        if e["season"] != ["any"] and season_of(day) not in e["season"]: return False
        if not tide_ok(t["tide"], day): return False
        if "weather" in t and weather not in t["weather"]: return False
        fl = self.flags | self.derived()
        if not set(t.get("flags_all", [])) <= fl: return False
        if t.get("flags_any") and not (set(t["flags_any"]) & fl): return False
        if set(t.get("flags_none", [])) & fl: return False
        for k, v in t.get("stock_min", {}).items():
            if self.stock[k] < v: return False
        for k, v in t.get("stock_max", {}).items():
            if self.stock[k] > v: return False
        if "credit_level_min" in t and not (t["credit_level_min"] <= credit_level(day) <= t["credit_level_max"]): return False
        if t.get("cash_min") and self.cash < t["cash_min"]: return False
        if "since_storm_days_min" in t:
            s = day - self.last_storm
            if not (t["since_storm_days_min"] <= s <= t["since_storm_days_max"]): return False
        if not set(t.get("after", [])) <= self.done: return False
        if t.get("after") and "wait_days" in t:
            if day - max(self.last[a] for a in t["after"]) < t["wait_days"]: return False
        if t.get("robots_min") and "robot_started" not in fl: return False
        if e["repeat"] == "once" and e["id"] in self.done: return False
        if e["repeat"] == "repeatable" and e["id"] in self.last and day - self.last[e["id"]] < e["cooldown_days"]: return False
        return True

    def fire(self, e, day):
        eff = e["effects"]
        for k, v in eff.get("stock", {}).items(): self.stock[k] = max(0, min(60, self.stock[k] + v))
        self.flags |= set(eff.get("flags_set", [])); self.flags -= set(eff.get("flags_clear", []))
        for a, v in eff.get("attitude", {}).items():
            if a == self.style or self.rng.random() < .3: self.att[a] += v
        self.cash += eff.get("cash_delta", 0)
        for k, v in eff.get("counts", {}).items(): self.counts[k] = max(0, self.counts[k] + v)
        self.done.add(e["id"]); self.last[e["id"]] = day; self.fired.append((day, e["id"]))

    def run(self, days=1440):
        for day in range(1, days + 1):
            season = season_of(day)
            weather = weighted(self.rng, list(WEATHER_P[season].items()))
            if weather == "storm": self.last_storm = day
            if day == 3 and self.last_storm < 0: self.last_storm = 2; weather = "storm"   # the page forces a first storm near day 2
            for f, d0 in GAME_FLAG_DAYS.items():
                if day >= d0 and f not in self.skip: self.flags.add(f)
            if day == 380 and (self.style == "investigate" or self.rng.random() < .2): self.flags.add("posted_query")
            if "great_wash_done" in self.flags and day > 1 and self.last.get("a3_great_wash", 0) + 12 <= day: self.flags.add("wash_sorted")
            # passive stock from robots and shore, and some use
            for k in self.stock:
                self.stock[k] = min(60, self.stock[k] + self.rng.random() * 1.1)
                if self.rng.random() < .10: self.stock[k] = max(0, self.stock[k] - self.rng.randint(3, 8))
            self.stock = {k: int(v) if isinstance(v, int) else v for k, v in self.stock.items()}
            if "lamp_dark" in self.flags and day - self.last.get("a1_lamp_oil_low", -99) >= 8 and day - self.last.get("a3_lamp_dark", -99) >= 8: self.flags.discard("lamp_dark")   # the game clears it when oil or a wick arrives
            self.cash += 120 + (25 if "built_cottage" in self.flags else 0) + (11 if "built_kiosk" in self.flags else 0) + (60 if "workshop_open" in self.flags else 0)
            el = [e for e in DRAWN if self.eligible(e, day, weather)]
            for e in [x for x in el if x["force"]]:
                self.fire(e, day)
            for rate in (DRAW_RATE, EXTRA_RATE):
                if self.rng.random() < rate:
                    pool = [(e, e["weight"] * LOC_WEIGHT[e["trigger"]["location"]]) for e in DRAWN if not e["force"] and self.eligible(e, day, weather)]
                    pick = weighted(self.rng, pool)
                    if pick: self.fire(pick, day)
        return self

def simulate(seed, style=None):
    return Sim(seed, style).run()

def report(sim):
    days_with = sorted({d for d, _ in sim.fired})
    seasons = {}
    for d, i in sim.fired:
        key = "y%d %s" % ((d - 1) // 360 + 1, season_of(d))
        seasons[key] = seasons.get(key, 0) + 1
    # dead stretches: runs of days with no event, length >= 10
    dead = []; prev = 0
    for d in days_with + [1441]:
        gap = d - prev - 1
        if gap >= 10: dead.append((prev + 1, d - 1, gap))
        prev = d
    reps = {}
    for d, i in sim.fired: reps[i] = reps.get(i, 0) + 1
    repeats = {i: n for i, n in reps.items() if n > 1}
    never = [e["id"] for e in DRAWN if e["id"] not in reps]
    return {"events": len(sim.fired), "days_with_event": len(days_with), "per_season": seasons, "dead": dead,
            "repeats": repeats, "never": never, "style": sim.style, "att": dict(sim.att)}

# ---------------------------------------------------------------- tests
class Schema(unittest.TestCase):
    def test_counts(self):
        self.assertGreaterEqual(len(EVENTS), 60)
        for act, need in ((1, 22), (2, 20), (3, 20), (4, 16)):
            n = len([e for e in EVENTS if e["act"] == act])
            self.assertGreaterEqual(n, need, "act %d has %d events, need %d" % (act, n, need))

    def test_ids_unique(self):
        ids = [e["id"] for e in EVENTS]
        self.assertEqual(len(ids), len(set(ids)))
        for i in ids: self.assertRegex(i, r"^[A-Za-z0-9_]+$")

    def test_fields(self):
        need = {"id", "act", "season", "kind", "voice", "trigger", "weight", "repeat", "cooldown_days", "force", "text", "effects", "cause", "tags", "source"}
        for e in EVENTS:
            self.assertTrue(need <= set(e), e["id"])
            self.assertIn(e["act"], (0, 1, 2, 3, 4)); self.assertIn(e["kind"], REG["kinds"]); self.assertIn(e["voice"], REG["voices"])
            self.assertIn(e["repeat"], ("once", "repeatable")); self.assertGreater(e["weight"], 0); self.assertGreaterEqual(e["cooldown_days"], 0)
            if e["repeat"] == "repeatable": self.assertGreater(e["cooldown_days"], 0, e["id"] + ": a repeatable event needs a cooldown")
            for s in e["season"]: self.assertIn(s, REG["seasons"] + ["any"])
            t = e["trigger"]
            self.assertIn(t["location"], REG["locations"], e["id"]); self.assertIn(t["tide"], REG["tide"]); self.assertIn(t["time"], REG["time"])
            for w in t.get("weather", []): self.assertIn(w, REG["weather"], e["id"])
            lo, hi = REG["acts"][str(e["act"])]
            self.assertTrue(lo <= t["day_min"] <= t["day_max"] <= hi, e["id"] + " days outside its act")
            self.assertIn(e["tags"]["mood"], REG["moods"])
            for a in e["tags"]["avenue"]: self.assertIn(a, REG["avenues"])
            for a in e["tags"]["attitude"]: self.assertIn(a, REG["attitudes"])
            self.assertTrue(e["cause"].strip(), e["id"] + " needs a visible physical cause")
            for k in t.get("stock_min", {}): self.assertIn(k, REG["stock"])
            for k in e["effects"].get("stock", {}): self.assertIn(k, REG["stock"])
            for k in e["effects"].get("counts", {}): self.assertIn(k, REG["counts"])
            for a in e["effects"].get("attitude", {}): self.assertIn(a, REG["attitudes"])
            for a in e.get("variants", {}): self.assertIn(a, REG["attitudes"])
            for a in t.get("after", []): self.assertIn(a, BY_ID, e["id"]); self.assertLess(BY_ID[a]["act"], e["act"] + 1)
            if "wait_days" in t: self.assertTrue(t.get("after"))
            if "credit_level_min" in t: self.assertLessEqual(t["credit_level_min"], t["credit_level_max"])

    def test_flags_known(self):
        flags = REG["flags"]
        set_somewhere = set()
        for e in EVENTS:
            set_somewhere |= set(e["effects"].get("flags_set", []))
            for c in e.get("choices", []): set_somewhere |= set(c["effects"].get("flags_set", []))
        for e in EVENTS:
            t = e["trigger"]
            refs = set(t.get("flags_all", [])) | set(t.get("flags_any", [])) | set(t.get("flags_none", [])) | set(e["effects"].get("flags_set", [])) | set(e["effects"].get("flags_clear", []))
            for c in e.get("choices", []): refs |= set(c["effects"].get("flags_set", []))
            for f in refs: self.assertIn(f, flags, "%s uses unknown flag %s" % (e["id"], f))
            for f in e["effects"].get("flags_set", []):
                self.assertNotEqual(flags[f]["set_by"], "derived", e["id"] + " sets a derived flag")
            for k in ("flags_all", "flags_any"):
                for f in t.get(k, []):
                    if flags[f]["set_by"] == "deck": self.assertIn(f, set_somewhere, "%s needs %s but no event sets it" % (e["id"], f))

    def test_triggers_satisfiable(self):
        for e in DRAWN:
            t = e["trigger"]; ok = False
            for d in range(t["day_min"], t["day_max"] + 1):
                if e["season"] != ["any"] and season_of(d) not in e["season"]: continue
                if not tide_ok(t["tide"], d): continue
                if "credit_level_min" in t and not (t["credit_level_min"] <= credit_level(d) <= t["credit_level_max"]): continue
                ok = True; break
            self.assertTrue(ok, e["id"] + " can never be true on its day, season, tide and credit window")

    def test_level1_reachable(self):
        for e in DRAWN: self.assertTrue(reachable(e), e["id"] + " needs a place that is not reachable on the Level 1 map yet")
        # the Hoard bar is shut before day 5 and the woods sill before day 6
        for e in DRAWN:
            t = e["trigger"]
            if t["location"] == "hoard" and "has_boat" not in t.get("flags_all", []): self.assertGreaterEqual(t["day_min"], 5, e["id"])
            if t["location"] == "woods" and "has_boat" not in t.get("flags_all", []): self.assertGreaterEqual(t["day_min"], 6, e["id"])

    def test_after_chain_acyclic(self):
        for e in EVENTS:
            seen = set(); stack = list(e["trigger"].get("after", []))
            while stack:
                x = stack.pop(); self.assertNotEqual(x, e["id"]); 
                if x in seen: continue
                seen.add(x); stack += BY_ID[x]["trigger"].get("after", [])

class Content(unittest.TestCase):
    def test_mood_split(self):
        n = len(DRAWN); c = {m: len([e for e in DRAWN if e["tags"]["mood"] == m]) for m in REG["moods"]}
        self.assertTrue(.40 <= c["good"] / n <= .56, c)
        self.assertTrue(.28 <= c["mid"] / n <= .40, c)
        self.assertTrue(.12 <= c["bad-mild"] / n <= .22, c)
        for act in (1, 2, 3, 4):
            sub = [e for e in DRAWN if e["act"] == act]
            self.assertGreaterEqual(len([e for e in sub if e["tags"]["mood"] == "good"]) / len(sub), .30, "act %d too grim" % act)
            self.assertGreaterEqual(len([e for e in sub if e["tags"]["mood"] == "bad-mild"]), 2, "act %d has no mild trouble" % act)

    def test_avenue_and_attitude_spread(self):
        for a in REG["avenues"]: self.assertGreaterEqual(len([e for e in DRAWN if a in e["tags"]["avenue"]]), 15, a)
        for a in REG["attitudes"]: self.assertGreaterEqual(len([e for e in DRAWN if a in e["tags"]["attitude"]]), 15, a)
        kinds = {e["kind"] for e in DRAWN}
        for k in ("storm", "find", "stranger", "neighbour", "season", "wildlife", "robot", "boat", "letter", "bottle", "clue", "uncle"): self.assertIn(k, kinds)

    def test_text_rules(self):
        for e in EVENTS:
            txt = e["text"]; lim = 330 if e["kind"] == "letter" else 260
            self.assertTrue(25 <= len(txt) <= lim, "%s text length %d" % (e["id"], len(txt)))
            self.assertTrue(10 <= len(e["cause"]) <= 280, e["id"] + " cause length")
            for v in e.get("variants", {}).values(): self.assertTrue(10 <= len(v) <= 130)
            for c in e.get("choices", []): self.assertLessEqual(len(c["label"]), 90)
            blob = txt + " " + " ".join(e.get("variants", {}).values()) + " " + " ".join(c["label"] for c in e.get("choices", []))
            self.assertIsNone(re.search(r"\b(%s)\b" % BRANDS, blob, re.I), e["id"] + " brand")
            self.assertIsNone(re.search(r"\b(%s)\b" % PLACES, blob, re.I), e["id"] + " real place")
            self.assertIsNone(re.search(r"\b(%s)\b" % AI_WORDS, blob), e["id"] + " names an AI or the helper")
            if e["act"] >= 1: self.assertIsNone(re.search(r"\b(%s)\b" % GORY, blob, re.I), e["id"] + " gory word")
            blob2 = txt + " " + " ".join(e.get("variants", {}).values()) + " " + " ".join(c["label"][0].lower() + c["label"][1:] for c in e.get("choices", []))
            self.assertEqual(odd_capitals(blob2), [], e["id"] + " has a name-like capital word")
            if re.search(r"\b(%s)\b" % ROBOT_WORDS, blob, re.I):
                self.assertIsNone(re.search(r"\b(%s)\b" % FEELINGS, blob, re.I), e["id"] + " robot with a feeling word")
                self.assertIsNone(re.search(r"\b(%s)\b" % FACE, blob, re.I), e["id"] + " robot with a face or voice word")
            # the helper never speaks of the uncle or the office, the office never of the helper
            if e["voice"] == "helper": self.assertIsNone(re.search(r"\b(uncle|solicitor|office|estate|inherit|inheritance)\b", blob, re.I), e["id"])
            if e["voice"] == "solicitor": self.assertIsNone(re.search(r"\b(stamp|mark|crate|robot|carrier)\b", blob, re.I) if e["kind"] != "uncle" else None)

    def test_no_ai_in_act_one(self):
        for e in EVENTS:
            if e["act"] <= 1: self.assertIsNone(re.search(r"\b(system|network|hidden|machine intelligence|someone is running)\b", e["text"], re.I), e["id"])

    def test_letters(self):
        letters = {e["id"]: e for e in EVENTS if e["kind"] == "letter"}
        flags = {f for e in letters.values() for f in e["effects"].get("flags_set", [])}
        for i in range(1, 13): self.assertIn("letter_L%d" % i, flags, "letter L%d missing" % i)
        for e in letters.values():
            self.assertEqual(e["voice"], "helper")
            self.assertIsNone(re.search(r"\b(please|you must|you should|you need to|reward|pounds)\b", e["text"], re.I), e["id"] + " asks, orders or mentions money")

    def test_bottles_quoted_unedited(self):
        texts = {e["text"] for e in EVENTS if e["kind"] == "bottle"}
        for b in TOWN_BOTTLES: self.assertIn(b, texts, "town bottle was edited or is missing")
        for e in EVENTS:
            if e["kind"] == "bottle" and e["text"] in TOWN_BOTTLES: self.assertIn("gift_day.js", e["source"])
            if e["kind"] == "bottle" and e["text"] not in TOWN_BOTTLES: self.assertEqual(e["source"], "own words")

    def test_prelude(self):
        pre = [e for e in EVENTS if e["act"] == 0]
        self.assertEqual([e["id"] for e in pre], ["p0_flat", "p0_street", "p0_office", "p0_station", "p0_quay"])
        for e in pre:
            self.assertGreaterEqual(len(e["choices"]), 2); self.assertTrue(e["force"])
        self.assertEqual(len(pre[0]["choices"]), 3)
        office = BY_ID["p0_office"]; self.assertEqual(office["voice"], "solicitor")
        uncle = [e for e in EVENTS if e["kind"] == "uncle" and e["act"] >= 1]
        self.assertGreaterEqual(len(uncle), 8)
        # the uncle is only papers and objects: no event shows him
        for e in uncle: self.assertIsNone(re.search(r"\b(his face|he said|he smiled|he walked|he stood)\b", e["text"], re.I))

    def test_helper_not_explained(self):
        for e in EVENTS:
            self.assertIsNone(re.search(r"\b(the helper|it is a machine|it is a person|artificial)\b", e["text"], re.I))

class Sim_(unittest.TestCase):
    def test_deterministic(self):
        a = simulate(7, "trust").fired; b = simulate(7, "trust").fired
        self.assertEqual(a, b)

    def test_four_year_run(self):
        worst = 0
        for seed in range(1, 9):
            for style in REG["attitudes"]:
                s = simulate(seed * 31 + 5, style); r = report(s)
                self.assertGreater(r["events"], 450, (seed, style))
                for a, b, g in r["dead"]: worst = max(worst, g)
                # every season block has something
                for y in range(1, 5):
                    for se in REG["seasons"]:
                        if se == "spring" and y == 4: pass
                        key = "y%d %s" % (y, se)
                        self.assertGreaterEqual(r["per_season"].get(key, 0), 6 if not (y == 1 and se == "spring") else 4, (seed, style, key))
                # one letter of each kind arrives
                ids = {i for _, i in s.fired}
                for must in ("a1_L1_key", "a1_L2_evening", "a1_L3_storm", "a1_L4_winter", "a2_L6_thin", "a3_L10_quiet", "a4_L11_last", "a4_L12_after"):
                    self.assertIn(must, ids, (seed, style, must))
                # the Hoard is found before the first season ends
                first = {i: d for d, i in s.fired}
                self.assertLessEqual(first.get("a1_hoard_first", 999), 40, (seed, style))
        self.assertLessEqual(worst, 30, "a dead stretch of %d days" % worst)

    def test_every_event_can_fire(self):
        fired = set()
        for seed in range(1, 41):
            for d, i in simulate(seed, REG["attitudes"][seed % 4]).fired: fired.add(i)
        never = [e["id"] for e in DRAWN if e["id"] not in fired]
        self.assertEqual(never, [], "never fired in 40 simulated runs: %s" % never)

    def test_letter_variants_reach(self):
        got = set()
        for seed in range(1, 25):
            for d, i in simulate(seed, ["trust", "investigate", "share", "distrust"][seed % 4]).fired: got.add(i)
        for must in ("a2_L7_stamp", "a2_L8_neighbour", "a3_L9_wash", "a2_uncle_reply", "a3_great_wash"):
            self.assertIn(must, got, must + " never fired in 24 runs")

def print_report(seeds=(11, 12, 13), full=True):
    for seed in seeds:
        for style in REG["attitudes"]:
            r = report(simulate(seed, style))
            print("seed %d style %-11s events %4d on %4d of 1440 days; dead stretches (10+ days): %d" % (seed, style, r["events"], r["days_with_event"], len(r["dead"])), r["dead"][:6])
            if full:
                print("   per season:", " ".join("%s=%d" % (k, v) for k, v in sorted(r["per_season"].items())))
                top = sorted(r["repeats"].items(), key=lambda kv: -kv[1])[:6]
                print("   repeats: %d events fired more than once; most repeated: %s" % (len(r["repeats"]), top))
                print("   never fired (%d): %s" % (len(r["never"]), ", ".join(r["never"][:12])))
            if not full: break
        if not full: break

if __name__ == "__main__":
    if "--report" in sys.argv:
        print_report(); sys.exit(0)
    res = unittest.main(exit=False, verbosity=1)
    print_report(seeds=(11,), full=True)
    sys.exit(0 if res.result.wasSuccessful() else 1)
