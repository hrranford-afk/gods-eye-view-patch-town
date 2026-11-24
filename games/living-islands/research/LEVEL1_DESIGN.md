# The Gift: Level 1 map brief (the first archipelago), 24 Nov

Status: designed, built headless, stress-tested. Code and numbers: `level1/` (`layout.py`, `validate.py`, `tide.py`, `sweep.py`, `pictures.py`, `report.py`, `test_layout.py`). The recommended layout is seed 29 (hash `e0dd2621f890301a`). Everything quoted here is read from `python3 level1/report.py 29`.
Confidence tags: MEASURED (computed by the tools in this folder), TUNING (a design number), ESTIMATE (modelled from other notes, software GL only, never run on a device), STAND-IN (done by a designed rule because the real engine does not exist). Rails kept: hopeful, nothing gory, robots are relics, people counted not tracked, invented islands only, no real places or brands.
The owner said the original six islands were the prototype. This is the map made for the level.

## 1 Headline
- One round table, **416 m across (radius 196 m)**, six islands, one sea floor. The home island is the first-day builder's `seed9001`, pasted in unchanged (5 shore cells differ, all under the new bars). The other five are cut from real `landform` worlds taken from the foundry shortlist, one geology per role, and joined by designed drying bars.
- The tide table matters. The Hoard causeway first opens on **day 5 at 22:01** and then twice a day around springs; day 1 has a tide range of only -0.34 to +0.40 m (neap) so the bar is shut the first week. Robots cross the wet stretch (47 m) at low water and stay a tide.
- 50 layout seeds were built and judged. **8 pass** (13, 28, 29, 32, 37, 39, 45, 47). The validator caught real design faults (section 9). Seed 29 passes every hard check and every soft one.
- Pictures: `level1/maps/level1_plan.png`, `level1_gray.png`, `level1_sweep.png`, `level1_profiles.png`. Captions with flaws are in section 12.

## 2 Scale, table and cameras
| Item | Value | Tag |
|---|---|---|
| Table | 209 x 209 cells of 2 m = 416 m square; round table radius 196 m; land kept inside 188 m | TUNING |
| Real scale | 1 cell = 2 m. A person (1.8 m) is under one cell, a tender (4.4 m) two cells | MEASURED |
| AR on a table | disc diameter 392 m on a 1.0 m footprint is 1:392; on 0.8 m 1:490; on 1.2 m 1:327. Inside the 1:200 to 1:500 range of MODES_AR_DESKTOP_HANDHELD.md. Pinch range 0.8 to 1.2 m. Home island 178 m long is 45 cm; the tender is 11 mm, so boats are drawn 2 to 3 times large (the AR exaggeration table) | MEASURED arithmetic |
| iPad / handheld | the page's three-quarter view, scaled by 196/122 = 1.6 (the exported worlds use table radius 122 m, camera home 290 m): home view about 470 m from the centre, elevation 38 degrees, whole table in frame; zoom limit 40 m for the beach | ESTIMATE |
| Desktop / Radeon | same framing and the same table; more sea taps, shadows 4096; no change to the world | design |
| Mesh | terrain mesh cell 1.4 m high, 2.0 m low and AR (the table is 1.48 times wider; same density on screen) | ESTIMATE |
| Clock | first-day clock speed 0.2 = 100 s of play per game hour (gift_day.js `cspeed`, sky_clock.js 20 s per hour at speed 1) | VERIFIED from files |

Why 416 m: six islands with at least 24 m of open water between them do not fit the 256 m window. At 384 m the solver could not place the woods and seal islands on the first seeds I tried; at 416 m it places all five on 41 of the 50 seeds without moving the home island. It is also one cell-size away from the foundry worlds (n=257 at 2 m), so no new grid is needed.

## 3 The map (seed 29)
Page axes: x east, z south, origin at the table centre. Waves and weather prevail from 345 degrees (north-north-west, as seed9001), storms from 240 degrees (west-south-west). Lamp stump (86, -60), landing (10, 17), hut (56, -28), yard (48, -40).

| Role | Source (province, seed, island) | Turn | Centre (x, z) m | Land m2 | Top m | Flat m2 | Geology reason |
|---|---|---|---|---|---|---|---|
| HOME | landform/worlds/seed9001 (B sandstone, the gift island, built by tools/make_gift_world.py) | none | (34, -26) | 9,852 | 6.9 | 1,676 | the builder's island: lee beach south, turf shelf, hill, NE headland knoll for the lamp, two skerries |
| WOODS | B sandstone, world 8, island 2 (foundry shortlist) | quarter turn, mirrored | (7, 102) | 11,488 | 14.8 | 660 | sandstone over mudstone (the tool's B rock mix): soil for trees, a spring line where the beds change |
| HOARD | B sandstone, world 174, island 4 | 270 degrees | (-121, -8) | 2,984 | 10.7 | 308 (after the pad) | low, sand-edged: a place a bar can reach |
| WRECK REEF | C basalt, world 131, island 8 (an islet of 588 m2) plus a painted reef | mirrored | (-103, 88) | 588 | 7.3 | 0 | hard dykes make reefs that hold a hulk; basalt is the right rock for a hazard |
| SEALS AND BIRDS | A gneiss, world 175, island 4 | mirrored | (-5, -128) | 4,116 | 9.1 | 0 | hard rock, steep, ledges: seals and birds, not building. Gneiss stands in for granite (same hard crystalline coast) |
| BARE ROCK | C basalt, world 54, island 10 | 270 degrees | (140, 67) | 632 | 6.5 | 0 | a later outpost, lone tree landmark |

Volcanic province D was not used: its window is a 1,536 m cutaway whose island is bigger than the window (VOLCANO.md), so a table gets a 40 to 48 m slice of a cone flank, not an island. It is kept for the sea chart.
The woods source is the same island for every passing seed (world 8 island 2): only it meets the area, catchment and gentleness limits at once. That is a variety flaw (section 12).

### Roles, one by one
**HOME (the gift island).** Purpose: arrive, get dry, fix the jetty, build one thing, the yard, the first night. Recipe: seed9001, unedited. Size: 178 m long, 9,852 m2, top 6.9 m. Shoreline: 276 m, all lee (storm exposure 0.10 average); the south beach is the landing and the strand. Yields per year: finds 308 wrack items a tide on 180 m of strand (about 5,700 kg a year if 35 percent float off again, TUNING); rain 1,540 mm gives 29 m3 a day of runoff and 253 L a day from 75 m2 of roof; no spring (hydrology.py finds only wet-weather gullies, 3.0 m3 a day at the biggest; groundwater lens 1.6 m usable, so a well works only as a late, small thing). Teaches: look after the shore, catch the rain, the lamp can see everything. First reveal: the beach, the crate, the hut, the lamp on the knoll.

**WOODS.** Purpose: timber for the cottage, jetty and a dinghy, and a spring for barrels. Recipe: B sandstone, 11,488 m2, top 14.8 m, 180 m long, woodland laid by rule on 0.67 ha of sheltered ground (the tool paints no trees, STAND-IN). Shoreline 646 m, all sheltered. Yields per year: timber stock 74 m3, sustainable 3.3 m3 a year, year one 10.7 m3 (10 percent of stock plus growth) against the 8.9 m3 of cottage plus jetty plus dinghy (all five first builds: 13.1 m3 over about three years; the catalogue has no timber); water: catchment 1,124 m2, 3.1 m3 a day at the outlet, a head at 6.6 m and one small lake. Flat ground 660 m2 for a sawmill shed. Teaches: timber is slow, the boat is a tool. First reveal: from the lamp, a dark green ridge across the sound; first boat trip 81 s.

**HOARD.** Purpose: the robots' depot of sorted washed-up stuff, found by following the robots. Recipe: B sandstone, 2,984 m2, top 10.7 m, reached by the **hoard bar** from the home island's west skerry (25 m of drying sand, crest -0.85 m, 6 m wide) and the 12 m skerry link. A levelled depot terrace (pad 3.98 m above the sea, 492 m3 cut and fill: the one edited place, about 980 person-hours of soil at the rates of dig/DIG_MODEL.md, "the old crews did it") with a gentle foot path from the bar. Hidden from the yard and the beach by the home hill (checked), visible from the lamp (checked). Yields: stock, not income: the heaps. Teaches: tides, robot routes, patience. First reveal: robots leave along the shore at the first workable low tide (day 5 night); five cairns mark the bar.

**WRECK REEF.** Purpose: a hulk to salvage over years, and a hazard. Recipe: C basalt islet of 588 m2 plus a painted reef (STAND-IN, no reef engine): 68 m by 28 m ridge at -0.25 to -1.0 m with four drying heads at +0.4, +0.6, +3.2 and +4.7 m (the last two stand on the islet). The reef lies 7 m from a regular boat line (checked: 6 to 60 m allowed), so it is a hazard the first night's route must respect. Teaches: look at the chart, learn the tide. First reveal: ribs on the highest head at spring low (BOLD B2).

**SEALS AND BIRDS.** Purpose: wildlife that is not for building. Recipe: A gneiss, 4,116 m2, top 9.1 m, 210 m of shore, three painted ledges (8 to 12 m, top +0.9 m, STAND-IN: the tool's gneiss islands are steep with no low flat rock). Capacity 343 seals on this island (625 on the whole table at peak, with disturbance); the hide goal of 10 is easy, the harder goal is to keep them. Seabirds 759 pairs in May (ledges and skerry colonies, wildlife_place.py). Flat buildable ground: 0 m2. Teaches: keep your distance, boats and lights have a cost. First reveal: the lamp sees it 30 m off the north coast.

**BARE ROCK.** Purpose: a later outpost (a camp, a store); a landmark. C basalt, 632 m2, top 6.5 m, no flat ground. Boats steer by the lone tree on its summit (BOLD B3).

## 4 Boat routes and trip times
Speeds: the rowing tender 2.5 knots = 1.3 m/s (BOATS.md 2 to 4 knots), times the 1.5 game exaggeration used for robots in camp_start.js = **2.0 m/s**; a faster boat (found engine, pole-drive skiff) 5.5 knots = 2.8 m/s, times 1.5 = **4.2 m/s**. The keel needs 0.45 m of water. Routes are found on 4 m cells with a margin off the shallows (validator, MEASURED).

| Trip | Metres (mid tide) | Tender s, mid | Tender s, low | Tender s, high | Faster boat s, mid | Target s |
|---|---|---|---|---|---|---|
| home to woods | 162 | 81 | 148 | 77 | 38 | 25 to 110 |
| home to seals (ring 30 m off) | 174 | 87 | 197 | 58 | 41 | 35 to 135 |
| home to wreck (ring 24 m off) | 84 | 42 | 40 | 40 | 20 | 15 to 90 |
| home to bare rock | 203 | 102 | 303 | 97 | 48 | 45 to 140 |
| home to Hoard | 133 | 67 | 175 | 59 | 32 | 15 to 130 |
| woods to Hoard | 144 | 72 | 173 | 68 | 34 | 40 to 170 |

Low-water trips are longer because the woods sill and the Hoard bar close the short passages (limit 4x plus 30 s, under 300 s: checked). The first boat trip, to the woods, is 81 s: long enough to feel the sea, short enough to repeat. The wreck reef lies 7 m from one of these lines; the lamp sees a reef head.

## 5 Low-tide crossings and exact tide windows
Tide: the page's own, `level1/tide.py` is a port of `sky_clock.js tide()` and the test compares it with the JS file through node (differences under 1e-9). Game day 1 is calendar day 121, 05:00, moon age 9 days (gift_day.js sets cd=121, ch=5, cm=9): near neaps. Springs come on days 9 to 11.

| Crossing | Crest | Dry when tide is at or under | Length | What is walked wet |
|---|---|---|---|---|
| Hoard bar (skerry link, skerry, bar, foot path) | -0.85 m | -0.74 m | yard to depot 195 m (230 s of play) | 47 m of it is below +0.5 m |
| Woods sill (home south shore to the woods) | -0.99 m | -0.88 m | 89 m from the yard | 32 m |
| Wreck reef heads | up to +0.6 m | always dry heads at low water | none | none |

Wading limit 0.10 m for robots, so a crest of -0.85 m opens at -0.74 m. The crest is set by `pick_hoard_crest()` from the tide model, not by taste: it opens the Hoard first on day 3 to 8 and on about 55 percent of days from day 9 to 40 (got 56 percent).

| Day | Lowest tide m | Highest m | Hoard bar open | Woods sill open |
|---|---|---|---|---|
| 1 | -0.34 | 0.40 | no | no |
| 2 | -0.43 | 0.46 | no | no |
| 3 | -0.55 | 0.57 | no | no |
| 4 | -0.68 | 0.69 | no | no |
| 5 | -0.81 | 0.82 | 22:01 to 23:37 (96 min) | no |
| 6 | -0.92 | 0.92 | 10:02 to 12:04; 22:13 to 23:59 | 64 min |
| 7 | -1.00 | 1.00 | 10:23 to 13:03 (160 min); 22:39 on | 90 and 51 min |
| 8 | -1.02 | 1.04 | 10:54 to 13:52 (178 min); 23:12 on | 62, 122, 21 min |
| 9 | -1.05 | 1.05 | 11:33 to 14:35 (182 min) | 110 and 130 min |
| 12 | -0.91 | 0.92 | 01:36 to 04:04; 14:24 to 16:18 | 60 min |
| 13 | -0.80 | 0.81 | 02:54 to 04:26 (92 min) | no |
| 14 | -0.68 | 0.70 | no | no |
Over 40 days the bar has 37 workable windows, the longest 184 min; the sill 19 windows (days 6 to 11 and 36 to 40). The wet stretch takes a robot 55 s of play (about 33 game minutes), so the longest window is 3.6 times what a crossing needs.

## 6 Storm surge, wrack and where the haul lands
Exposure from `landform/world.py exposure()` run on the whole table for two directions. The tool caps the fetch at 0.4 of the table (166 m), so absolute values are low everywhere; the ranking is what counts (flaw, section 12). Wrack from `ecosystem/shore_catch.py` (strand segments, rates), Great Wash capacity = 2 to 12 pieces a metre by shore richness, reduced by exposure (TUNING).

| Island | Coast m | Strand m | E prevailing | E storm | Great Wash pieces | Wrack items per tide |
|---|---|---|---|---|---|---|
| home | 276 | 180 | 0.22 | 0.10 | 945 | 308 |
| woods | 646 | 0 | 0.13 | 0.07 | 0 | 0 |
| Hoard | 204 | 0 | 0.25 | 0.03 | 0 | 0 |
| wreck | 58 | 0 | 0.24 | 0.04 | 0 | 0 |
| seals | 210 | 0 | 0.20 | 0.15 | 0 | 0 |
| rock | 76 | 0 | 0.28 | 0.00 | 0 | 0 |
Reading: the home lee shore is the only strand the tool counts as collectable (the others are steep rock ledge, over the 0.6 slope limit). So **the whole haul lands on the home beach and cove (capacity about 945 pieces)**, which is the story the owner wanted (finds wash up on the lee shore), and the other islands keep their shores for animals and for later. The red arrows in the plan are the few shores facing the storm.

## 7 Robot job routes
Robot speed 0.85 page m/s (camp_start.js). Routes are walked on 2 m cells; the step rise may not pass 0.6 and the bed must be dry to 0.10 m.
- **Wrack patrol** (daily): yard to the best strand segment, 92 m, dry at all tides up to +0.83 m.
- **The Hoard run**: yard to depot 195 m (230 s of play), crossing the lobe, the skerry link and the bar; open from day 5; cairns line the bar. The robots stay a tide on the Hoard and come back on the next low. Stuck cases (the brief): the lowest cells of the bar are the ones that trap a tracked robot at the turn of the tide.
- **The woods run** (later timber): 89 m, only around spring lows; otherwise a boat.
- **Hands-on first**: the player does each run in the tender before delegating it.

## 8 Sight lines
From the lamp stump (ground 5.3 m, lamp 9 m above): 73 percent of the water inside the table is in view; 63 percent of the land; woods 56 percent, Hoard 39 percent, seals 43 percent, bare rock 63 percent; the depot, a seal ring and a reef head are all visible. The Hoard depot is **not** visible from the yard or the landing (checked). The home hill (7 m) shades the south-west sound, so about a quarter of the water is hidden. This is the shape of the first two reveals: the lamp shows the woods and seals, the robots show the Hoard.

## 9 What the validator caught
The checks run on every layout; hard checks decide pass or fail. Reading the sweep (section 11) and the log of fixes:
1. **Tide arithmetic.** A robot out and back on a 195 m walk takes 460 s of play at 100 s per game hour; no tide window is that long. Changed to "cross the wet stretch and stay a tide". Logged in CHANGELOG as change 3, and suggestion A (move the yard).
2. **Steepness of the tool's own islands.** `world.py d8` slope has a median of 0.76 (37 degrees) on land; robots cannot use it. The check uses the step rise and the depot needs a foot path.
3. **Seal haul-outs absent.** wildlife_place.py found 0 seals on 15 of 50 seeds' gneiss islands (no low flat rock). Ledges are painted.
4. **Hydrology cannot tell a spring from a gully.** At 800 m2 channel threshold the woods island had no stream; at 250 m2 home and woods both carry about 3 m3 a day. The design uses the lake and the 6.6 m head of the woods as the spring and keeps the home gully ephemeral, as the builder says. Honest flaw.
5. **Lighthouse hill.** On 23 of 50 seeds the lamp cannot see a whole island; the home hill shades the south-west.
6. **Overlap and rim.** 10 seeds could not keep 24 m between islands, 5 had land outside the table: the solver tries 48 turns and positions; some seeds still cannot.
7. A picture check found a bug in my own reef painter (it lifted the whole sea floor to -0.9 m); the boat routes then all failed. Fixed before the sweep.

## 10 Sea chart parcels (how this scales)
THE_GIFT_DESIGN.md gives the parcel plate at 1.5 km, the table at 256 m, 3 to 8 islands per parcel. This table is one 416 m window of the home parcel with six islands: it fits. The same code builds a neighbouring table from another seed (`build_layout(seed)`); a 1.5 km plate holds about 9 such tables (3 x 3 of 416 m with the home table at the centre). The pool, the roles and the validator are the parcel generator for the chart: a parcel's score is the validator's numbers (buildable area, water, harbour, hazards, wildlife). The chart stand-ins (`gift/parcels.py` window flips) become the same dihedral moves used here. Price uses the same suitability parts. Not done: the full 1.5 km group (UNVERIFIED cost, section 3.13).

## 11 The sweep of 50 seeds
`python3 level1/sweep.py` builds and judges seeds 1 to 50 (about 3 minutes on 4 cores); results in `level1/sweep.json`, picture `level1/maps/level1_sweep.png`.
- Pass: 13, 28, 29, 32, 37, 39, 45, 47 (16 percent).
- Fail reasons (count of seeds): lighthouse sees the islands 23, table haul capacity 17, boat trips in target 16, low-tide detours 14, hoard pad 10, overlap 10, no placement 9, home wrack capacity 8, lighthouse sees the water 7, Hoard tide window 6, robot crossing fits window 6, timber 6, land outside table 5, fast boat 3, timber sustainable 1.
- Soft checks that failed: Hoard visible from the camp 37 seeds (so it is a real constraint), Hoard walk over 240 s on 9, woods sill not spring-only on 7.
- Why 29: every hard and soft check passes; trips 42 to 102 s; Hoard first opens day 5; 10.7 m3 of timber in year one; Hoard hidden from the camp; estimated 96k triangles high, 33k AR.
Seed 29 is the pick because the hidden Hoard and the opening day are both right at once; seeds 28 and 32 are close alternatives.

## 12 Pictures, captions and flaws
- `level1/maps/level1_plan.png`: top-down plan with roles, routes, surge arrows and scale bar. Flaws: boat routes are drawn on a 4 m grid so they zigzag; the home-to-seals line leaves the frame as a rectangle and is hard to read; arrows are few because every exposure is low; land colour is the tool's vegetation class, so the woods read dark green only because of my overlay; labels overlap the reef.
- `level1/maps/level1_gray.png`: the whole table as a grey-box height render, sea and land one surface. Flaws: faint rectangular seams in the deep sea round the pasted windows (the home window edge and the skerry shelf); the home island reads as a smooth lens with a hard dark halo (its builder-made shelf at -3.4 m); the other islands look rough and steep (the tool's compressed relief).
- `level1/maps/level1_sweep.png`: pass or fail per seed with the first three failed checks named. Text is small.
- `level1/maps/level1_profiles.png`: the Hoard walk, the lamp sight line and the woods sill walk with tide lines. Flaws: the vertical scale is exaggerated 6 px a metre; the middle profile ends in the sea ring; short captions only.
- Not drawn: side views of each island, a boat-level view, the day-night light. Those need the page.

## 13 The first minute and the 15-minute guided path
**First minute (default home view).** The three-quarter view from the south shows the whole round table in a cold sea at dawn. In front, the home beach with a wrecked jetty and a hut on the rise; behind it the lamp stump on the north-east headland, faint. On the left, a low line of cairns runs out from the west skerry into the water; on the right a dark green ridge stands across a quiet sound; far back, grey rocks with specks of seals. At the horizon edge a single bent tree on a rock. Nothing is labelled.

**Day 1, the first 15 minutes of play (no boat yet, as the core loop plan Job 2 gives the boat later).**
| Minute | Where | What happens | What the map gives |
|---|---|---|---|
| 0 to 1 | landing (10, 17) | Dawn, the crate and key | the whole table in view, the lamp, the cairns on the left |
| 1 to 3 | beach to the crate | letter one, the ledger | small win: open the crate; the lee beach is the first strand |
| 3 to 6 | beach, the hut at (56, -28) | get dry (patch the hut), the barrel | roof catches 253 L a day; the hill (7 m) behind the camp |
| 6 to 8 | the jetty | fit one plank | the south bay (3.4 m deep) is the harbour |
| 8 to 10 | the shore | look west along the strand | finds wash up; cairns on the skerry |
| 10 to 12 | the lamp (86, -60) walk (about 70 m) | first sight of the woods and the seals | the walk shows the table in one go |
| 12 to 14 | the yard (48, -40) | a robot starts; it works the wrack | the yard is 90 m from the beach |
| 14 to 15 | the strand | the robot patrols the wrack line | the strand is the first job; the Hoard is for later |
The tide table card (CHANGELOG suggestion B) appears in the evening. The bar is shut: day 1 tide is -0.34 to +0.40 m.

**A second sitting, game days 5 to 6, about 15 minutes.** (Needs the boat of Job 2.) Day 5 evening: the tide card shows the first low under -0.74 m at 22:01. A robot leaves the yard along the shore, over the skerry, across the bar (55 s of play), and up the foot path to the Hoard; the player follows. 4 minutes: the Hoard depot, sorted heaps, the stamp. 3 minutes: back to the beach for the dawn tender trip to the woods (81 s), a barrel from the spring (3.1 m3 a day), a first timber walk. 3 minutes: past the reef at 24 m (ribs at spring low on day 7), home. 5 minutes: build the second thing from what was found.

## 14 Tools used
| Tool | What I took | What I changed | What I could not use and why |
|---|---|---|---|
| `landform/world.py` | `make_world` (n=257, 2 m cells) for the source worlds, `d8`, `exposure`, `_islands_at`, `_stats`, `landing_candidates`, `ROCKS`, `VEG_LEGEND` run on the composed table (so the tool's own passes judge the table) | nothing in the tool; arrays composed outside it | province D (window is a cutaway slice); no sediment engine; no tree rule (veg 14 and 15 never assigned); relief compressed (median land slope 37 degrees) |
| `landform/export_world.py` | the file format and `shore_class`; `level1/out/` is written in that format | a 209 x 209 table instead of 129 x 129 | the 12 exported 256 m windows: too small; the page cannot show 6 islands |
| `landform/worlds/seed9001` | the home island, whole | none (5 shore cells are raised by bars) | |
| `landform/hydrology.py` | `analyse` (priority flood, channels, lakes), `rain_field` | channel threshold 250 m2 (the docstring says smaller on steep wet ground) | groundwater: it cannot say perennial from wet-weather |
| `landform/volcano/`, `VOLCANO.md`, `volcano_*.py` | read, to decide province D is a chart piece | | 1,536 m cutaway; not a table island |
| `landform/cutaway.py`, `rock3d.py`, `checks.py`, `hydrology_maps`, contact sheets | read | | render and report tools for the Blender and page work; `checks.measure` is covered by the validator |
| `foundry/seeds/shortlist.json` | `by_province` lists: the pool is the first 10 A, 12 B, 10 C qualified worlds | | the weights and sweeps were not rerun (the catalogue stays as is) |
| `foundry/lfmetrics.py` | read the start-island rules | | start island is fixed (seed9001) |
| `globe/` (planet, circulation, drift, arrivals, climate) | planet seed 1, a cool cell near 52.5 N (the median of 45 ocean cells), drift arrivals per year, `freshwater_lens` | table put on a chosen latitude band | the drift run gives about 1.5 notable arrivals a year and no logs: so timber must come from the woods |
| `ecosystem/shore_catch.py` | `build_shores`: strand segments, rates | added storm exposure per segment | other islands have no collectable strand (steep) |
| `ecosystem/wildlife_place.py` | `place_wildlife`, `peak_seals`, `bird_pairs` | seal ledges painted so it finds haul-outs | |
| `ecosystem/food_model.py`, `collector_econ.py`, `shelter_ladder.py` | read | | they simulate people and years; this note is geometry. Next job: run them on the table |
| `dig/DIG_MODEL.md` | labour rates (2.0 person-hours a m3 of soil) for the depot terrace | | `dig_toy.py` not imported: my own sight line and viewshed |
| `fortify/` | line-of-sight idea | | not needed for Level 1 (dig-in is a later mode) |
| `seabed.js`, `SEABED_PASS.md` | the sand-link rule (crest -0.35 to -0.75 m, 2 to 3.6 m wide) | crest set from the tide model, 6 m wide | the JS seabed runs in the page; the sediment engine is **not built** (SEDIMENT_PHYSICS.md is research only): bars and the reef are painted |
| `li_sea.js`, `macro_sea.js` | the tide agreement (same harmonics as the sky clock) | | sea state and waves are page work |
| `sky_clock.js` | `tide()` and `hoursFor`: ported, tested against node | | |
| `weather.js`, `moods.js` | read | | the validator uses exposure only; weather delays are not simulated |
| `blender/` recipe layer (`recipe.py`) | the island-type and rock choices informed the roles; the woodland rule follows its tree mixes | | Blender not run |
| boat kit (`BOAT_MODEL.md`, `boat_motion.js`) | dinghy size 4.0 m, draft 0.15 m, speeds | | no hull rendered |
| `camp_start.js`, `gift_day.js` | robot speed, dry margin, build totals and the ten-item catalogue (parsed by the validator) | | the page code is not mine |
| `PROVING_GROUND.md` | the four fixed cameras idea for later shots | | no render here |
| `gift/parcels.py` | window flips (dihedral moves), suitability parts as the idea for scoring | | prices not used |
| `tools/make_gift_world.py` | the home island's data: stump, hut, skerries | | |
| `approaches/` | read | | voxel and SDF experiments, not needed |
| Sediment and sandbar engine | | | does not exist: bars (tombolo-type, SEDIMENT_PHYSICS.md section 5) and the reef are designed shapes |

## 15 Open taste questions
See `level1/BUILD_PLAN.md`.
