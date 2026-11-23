# ECOSYSTEM_TEST: the headless ecosystem test (design note, 23 Nov 2026)

Status: built and run on 60 seeds. Pure python 3 plus numpy, no screen, no network, writes only to an output folder. It implements the "measure first (headless)" lines of EVOLUTION_TREE.md, build step 2 of ECOSYSTEM.md, and section 9 of research/BEACH_COLLECTOR.md.

Tone rules kept: people are counted, never tracked; seals leave and come back, nothing is hurt; no brands, no real place names in code or output.

## 1. What is in the package

| File | Job |
|---|---|
| `eco_common.py` | seeded streams, world loader, the event ledger (idempotent keys), season / tide / storm clocks |
| `shore_catch.py` | per-shore exposure and drift catch (items per metre per tide) from `landform/world.py`; ranks islands; picks the village landing and the collector's shore |
| `wildlife_place.py` | seal haul-outs, seabird ledges and skerry colonies, puffin turf, otter shore, kelp by depth band; the disturbance model; the seal colony state (leave, return) |
| `collector_econ.py` | the litter collector, the tender on its old timetable, deliveries, over-delivery, quiet stakes, three player policies, the recovery test |
| `run_all.py` | N seeds x policies x two calendars, writes `results.json` and `REPORT.md` |
| `tests/test_ecosystem.py` | determinism, ranges, forbidden words, private paths, idempotent keys, output folder |

## 2. What is modelled

1. **Shores.** Every shore cell of every island (from `island_label`) is grouped into 48 m segments. Each gets exposure (the world's wave-fetch field), face slope, kind (sand, shingle, rock ledge, cliff from rock and vegetation maps), facing, and a catch rate. Catch = kind factor x gentleness x shelter x onshore arrival, scaled so a median shore is about 1 item per metre per tide, times a seeded sea supply for the world and one for each island. Per tide: season (winter 1.35x, summer 0.65x), spring or neap, storm spike (3 to 10x, decaying over 3 days), scatter. Poor under 0.5, rich from 2.5 items/m/tide.
2. **Wildlife.** Seals: flat dry-at-low-tide rock tops (up to 3 m over the sea) with deep water within 100 m, capacity area/4 capped at 300, tide exposure from a sinusoidal tide, season by common or grey type (exposed shore = grey), disturbance from a boat lane (straight out from the landing) and the houses (30 m inland) within 150 m. Birds: cliff ledge length (guillemot, kittiwake), skerry tops (gannet, tern, gull), turf for puffins, season windows from the calendar, disturbance 200 m from buildings and 500 m from boats. Otters: rocky sheltered shore with fresh water near. Kelp: hard bed by depth band (0 to 5 dense, 5 to 10 thinning, 10 to 20 park) within 150 m of land.
3. **Seals leave and return.** Each haul-out has a trust number (1 = trusts the shore, 0.2 = has left). Litter load at or over 2.0 kg per metre pushes it down 0.04 a day (gone in 20 days); under 0.7 kg/m it climbs 0.0067 a day to 0.6, then half that to 1.0. Load near a rock is its own shore's natural litter plus a share of the landing pile (linear to zero at 300 m).
4. **Collector.** One shore segment near the landing (the richest within 160 m, else the richest on the island). Two tides a day bring items (seeded Poisson); 35 percent of what lies uncollected is floated off by each tide. Daily solar from season and cloud (aged panel), battery with a 20 percent reserve, daylight, storm parking, stuck days, 17 s per pick over 0.65 efficiency plus the walk between items, a 4.5 kg hopper that fills and then waits for the tender, 3 percent mis-picks of natural shells, items by material (plastic, glass, metal, rope, other) with a mass each.
5. **Tender.** Seeded old timetable (8 to 14 day base interval, each call a quarter day later than the one before, 4 percent never come, storms push a call back). At a call it takes the hopper (85 percent usable goes to the village store of 40 kg) and delivers what the player ordered (20 kg a visit at most; the recovery test lifts that). What the store cannot hold lands on the shore as a pile.
6. **Quiet stakes.** Load at the landing (kg per metre of 40 to 80 m frontage) feeds: people unwell (30 settlers counted; share unwell grows 5 percent per kg/m over 1.0), harbour fouling (rises over 1.5 kg/m, falls under 0.8), seals leaving. Never graphic, always a way back: clear by hand, stop ordering.
7. **Policies.** *Careful*: orders what the village will use (up to 8 kg), builds 1.5 kg a day, clears any pile at 6 kg a day. *Greedy*: orders the 20 kg maximum every call, builds slowly (1.2 kg a day), notices only when a quiet sign shows (seals gone, 2 people unwell, harbour fouled), reacts 14 days later by stopping orders and clearing 12 kg a day, then settles. *Ignoring*: orders nothing, builds nothing, clears nothing, leaves the collector to the tender.
8. **Recovery test** (BEACH_COLLECTOR section 9.4): the tender delivers 2x, 5x, 10x the normal 4 kg a visit for 60 days with no cap, then deliveries stop and the village clears 12 kg a day. Pass = load back under the seal leave line within 30 days with no reset.
9. **Ledger.** Keys: `find:seed:shore:day:tide`, `empty:seed:island:day:tide`, `delivery:seed:visit`, `special:seed:shore:day`. `Ledger.claim` returns False the second time; credited items and kilograms only count on the first claim.

## 3. Numbers and confidence

Tags as in RESEARCH_FIRST.md. "Source" names the research note and section, never a web page.

| Number | Value | Tag | Source |
|---|---|---|---|
| Beach litter order of magnitude | 0.2 to 5 items per metre of beach | VERIFIED order (regional assessment, whole-beach counts) | BEACH_COLLECTOR section 5 |
| Strandline items per metre per tide | poor 0.2, normal 1, rich 5 | TUNING | BEACH_COLLECTOR section 5 |
| Share floated off by the next tide | 35 percent per tide | TUNING (note says 30 to 60 percent by the next spring tide) | BEACH_COLLECTOR section 5 |
| Wrack dense on sheltered gentle shores, rare on steep rock | direction only | PLAUSIBLE | FLOW_TYPES flow 16 and section 3.8 |
| Drift from the west, 3 percent of wind | direction only used | VERIFIED mechanism, TUNING direction | FLOW_TYPES section 3.4 |
| Storm schedule | slots of 48 h, chance 10 to 50 percent by season, spike 3 to 10x | TUNING (shape of the season curve from macro_sea.js, numbers are mine) | BEACH_COLLECTOR section 5, macro_sea.js |
| Tide window | 1.1 m half range, sinusoidal | TUNING | landform TIDE_AMP, macro_sea.js |
| Seal capacity | 4 m2 each, cap 300 | TUNING | WILDLIFE rule seal_haulout |
| Seal disturbance distance | 150 m | VERIFIED code (100 m) and PLAUSIBLE study (over 200 m), 150 is our middle | WILDLIFE section 1 |
| Seal season | common Jun to Aug, grey Sep to Dec | VERIFIED months | WILDLIFE sections 1 and 10 |
| Seal leave and return speed | 20 days to leave, 60 quiet days to 0.6 | TUNING (the note says 2 seasons, too slow for a 200 day test) | WILDLIFE rule seal_haulout |
| Litter leave line, comfort line | 2.0 and 0.7 kg per metre | TUNING (owner decision only says piled rubbish drives seals away) | EVOLUTION_TREE tender section |
| Seabird densities | guillemot 8 per m of ledge, kittiwake 2, puffin 0.15 per m2; gannet, tern, gull per m2 are mine | TUNING | WILDLIFE rule seabird_colony |
| Seabird disturbance | 200 m buildings, 500 m boats for auks and terns | VERIFIED (national agency guidance, larger value used) | WILDLIFE section 2 |
| Otter density | 1 per 1.1 km of rocky shore | VERIFIED approximate | WILDLIFE section 3 |
| Otter fresh water distance | 150 m here (note says 300) | TUNING (window is 512 m) | WILDLIFE section 11 |
| Kelp depth bands | 0 to 5, 5 to 10, 10 to 20 m | VERIFIED bands | WILDLIFE section 7 |
| Hopper, pick time, speed, solar, battery | 4.5 kg, 17 s, 0.2 m/s, 0.4 m2 at 18 percent aged to 70, 0.12 kWh usable | TUNING (inputs PLAUSIBLE) | BEACH_COLLECTOR sections 2 and 6 |
| Mis-pick rate | 3 percent | TUNING (limit stated in the note) | BEACH_COLLECTOR section 6 |
| Item mass by material | plastic 12 g, glass 150 g, metal 20 g, rope 80 g, other 100 g | PLAUSIBLE ranges | BEACH_COLLECTOR section 5 |
| Tender interval, drift, skips | 8 to 14 days, +0.25 day per call, 4 percent | TUNING | EVOLUTION_TREE (fixed, drifts late) |
| Delivery sizes | 2 to 8 kg normal, 20 kg max a visit | TUNING targets | BEACH_COLLECTOR section 9 |
| Village size, illness, fouling rates | 30 people, 5 percent per kg/m over 1.0, fouling over 1.5 | TUNING | EVOLUTION_TREE (quiet stakes) |

Could not verify: any real haul-out tide height; any figure for what litter does to a seal haul-out; strandline-only litter counts; solar yield for this coast; how late an old clock drifts.

## 4. What is faked

- The world is one 512 m window (province A, B or C by seed); real colonies, otter ranges and ledges are far bigger, so counts are small and only their spread between seeds means anything.
- Province D (the cutaway volcano) is not used.
- No fish shoals, flow field, sandeel or sediment: catch uses exposure, slope and facing, not the flow engine.
- Wrack natural fauna, basking sharks, dolphins, sea eagles and the turtle legend are not placed here.
- Litter is a mass per metre, not individual items; the collector is a rate model, not a path on the beach.
- Storms and tides are python re-creations of the macro sea's shape (season curve, 48 h slots, tide window), not a port; they will not match the live page hour for hour.
- The "village" is a number of people, a store and a pile; building is kilograms used.
- Seals are counted per rock; nobody is followed.

## 5. How an order for the owner's hardware would run it

```
python3 games/living-islands/ecosystem/run_all.py --seeds 60 --days 200 --out /path/to/output_folder
python3 games/living-islands/ecosystem/tests/test_ecosystem.py        # about 12 s, exits 1 on any failure
```
Needs python3 and numpy only (checked on numpy 2.5). No network, no GPU, no installs. Reads only the repository (`landform/world.py`); writes only `results.json` and `REPORT.md` into `--out`. About 85 s for 60 seeds on a cloud container core, one core used. The same seeds give the same `results.json` hash on any machine with the same numpy major version (random streams are numpy's `default_rng`, stable across versions for the calls used; rerun the hash check after any numpy change). More seeds: `--seeds 300 --first-seed 1` takes about 7 minutes. A different calendar start is one line in `run_all.py` (`STARTS`).

## 6. Headline numbers from the 60 seed run

See `out/REPORT.md` (committed with `out/results.json`). In short:
- Catch classes by best collectable strandline: 12 rich, 26 normal, 9 poor, 13 with none (basalt coasts rarely have a beach: 7 of 20). Best rate spans 0.09 to 4.9 items per metre per tide.
- Seals: median 12 haul-outs kept (most seeds have 12 or more candidates), median peak 500 seals ashore without a village, 340 with the village and boat lane near.
- The 4.5 kg hopper, not supply, limits the collector: about 0.4 kg a day whatever the shore, because it sits full for 100 to 150 of 200 days waiting for a tender that calls every 8 to 14 days and runs later each time (about 4.5 days late by day 200). Free-run (a hopper that never fills) gives 1.4 (poor), 5.1 (normal), 11 (rich) kg a day in spring, 1.6, 3.8, 5.2 in winter.
- Policies over 200 days: careful and ignoring end with a stable village in all 60 seeds in both calendars. Greedy ends stable in 55 (spring) and 57 (winter) of 60, with a harm episode in 21 and 22 seeds; every one that had time to recover did.
- Recovery tests: all 57 seeds with a landing returned under the leave line within 30 days at 2x, 5x and 10x, in both calendars (worst case 12 days). At 10x seals left in about half the seeds and every site that left was back inside the 200 days in spring; in the winter start 90 of 108 were back.
- No case where recovery is impossible was found. Three worlds (seeds 26, 32, 41) have no landing, so no tender and no deliveries; 19 of 60 worlds have a landing but no strandline the collector can work.

## 7. Honest gaps (what is tuning guesswork)

1. Every threshold that decides harm (2.0 and 0.7 kg per metre, illness and fouling rates, 20 day fade) is TUNING. The pass at 30 days depends mostly on the hand-clearing rate (12 kg a day) which is a guess; halve it and some 10x runs will fail.
2. Collector yields run well above the research targets in free-run: normal shores give 4 to 5 kg a day against 1 to 2, poor shores 1.4 against 0.1 to 0.3. The cause is the collector working a whole 100 m strandline; the research targets are likely for a shorter beat or slower picking. The ranking between shores is the useful output, not the absolute kilograms.
3. Natural litter alone (careful and ignoring runs) drives 9 haul-outs in 7 of 60 seeds to leave in the winter calendar, because storm spikes of up to 10x stay above the leave line long enough; they have not returned by day 200. That is a consequence of the tuned fade rate and counting natural litter the same as delivered rubbish; decide if that is wanted.
4. Haul-out candidate rules find 2 to 34 flat low rocks per seed; the top 12 are kept. The share of haul-outs within 150 m of the lane or houses (median 58 percent) is over the 20 to 60 percent target because the window is small.
5. Cliff ledge length (median 106 m) and kelp share (median 47 percent, target 15 to 40) depend on the window size and on the landform depth ranges.
6. Basalt worlds (province C) have almost no beach: the collector relic would not be placed in 13 of 20 of them. That is a landform fact the owner may want to change, or accept as "some islands live on deliveries".
7. Tide and storm clocks are re-creations; if the live page's sea changes, this test does not follow it.
8. pytest is not installed in the build container, so the tests are plain functions with a runner at the bottom of the file; under pytest they work unchanged.
