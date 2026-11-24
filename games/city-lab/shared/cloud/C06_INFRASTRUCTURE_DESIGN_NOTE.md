# C06: infrastructure design note v0.1 (CLOUD, 21 Nov 2026). DESIGN ONLY: nothing is built.
Status: WORKING (note), reviewed by ChatGPT on 21 Nov (section 10). Nothing below is approved; the owner decides go or no-go and answers section 8.

## 1 What is true today (read from `district.js`, 21 Nov)
- Roads: each road cell is open or blocked. No type, capacity or wear. Customers and carts use shortest open paths.
- Power: ONE city number, `power.supply_kw x scale`. Every machine and home draws from it; `factor = min(1, supply / draw)` applies to all buildings equally. No cables, no places, no generators. A power shed is only a consumer (in a recipe, `supply_kw` means INCOMING supply).
- Water: none. The bakery's recipe lists `water` as a cart-delivered item.
- Upkeep and city money: none. Upgrades cost coins once.
- What the experiments showed: power became the first real limit at 8 homes; extra production did not pay while customers were the limit; blocking one road removed a whole neighbourhood's trade. So infrastructure is where growth sticks.

## 2 Principle: infrastructure is DATA beside the district, recipes unchanged
A new optional file `city_infra` (version 0) linked to one district by id, version and SHA-256 (the same pattern as the C02 sidecar). No new keys in `rtk.building` v1, no new keys in `city_district`. It is read with JSON.parse only and checked by a strict validator. Generators, pumps and so on are ordinary recipes placed on the grid; what they produce is declared in the infra file, not in the recipe. The city layer feeds results into the existing per-building machine through the existing optional hooks (`setExternal`), plus at most one new hook (piped items).

## 3 The model, as small as it can be (v0)
1. SOURCES. `sources: [{building, kw, profile?}]`. Output in kW, optionally scaled by a repeating deterministic `profile` (for example a wind list of 12 numbers cycling every minute). No randomness.
2. CABLES as a TREE (radial feeders only in v0): `cables: [{from, to, capacity_kw, loss}]` between sources, junction cells and buildings. Power is shared down the tree: each node's supply is limited by its source output and by the smallest `capacity_kw` on the way. A branch whose downstream demand exceeds what reaches it browns out ALONE: `factor_node = min(1, reaching / demand)`. A building with no path has factor 0 (dark). Trees only keeps the arithmetic exact and checkable by hand; loops and re-routing are a later version.
3. WATER the same way but simpler: `wells: [{building, kl_per_min}]`, `pipes` as a tree with capacity. A shop's `water` item comes by pipe (no cart) while supply reaches it, otherwise by cart as today. Homes use water per resident; without water a home's residents spend less (data). One new hook: `piped {item: per_minute}` adds stock each second.
4. ROADS: `road_types {lane, street}` with `capacity_trips_per_min`, `upkeep_per_min`; each road cell names a type. Trips = carts + customer trips through the cell. If trips exceed capacity, a congestion factor lengthens the effective distance (so demand falls and carts miss). Wear and repair jobs are v1, not v0.
5. COSTS: every source, cable, pipe and road type has `build_cost` and `upkeep_per_min`. The district shows infrastructure cost per minute against district income, so a generator can be judged by net, not by feel.

## 4 What the page would show (same rules as C03: every change explained)
Cables thickness = capacity, colour = load (green, amber, red), dark when unpowered; blue pipes; a glow on generators and a number for output; roads coloured by load; labels like "street B: 3.2 of 3.0 kW, brownout 94 percent"; the "What changed and why" log writes one sentence per change with numbers before and after.

## 5 Acceptance experiments (each repeatable, run three times, figures saved)
E4: at 10 homes (power-limited), does one more generator pay for itself, and after how many minutes (build cost, upkeep, net gain)? E5: a cable overload on one street: only that street dims; show before and after. E6: a bakery far from the depot and market: does upgrading the road type between them raise its net, and by more than it costs? E7: water by pipe against by cart: effect on the bakery's net and on missed deliveries when a road is blocked. Each answer reported honestly, including "no".

## 6 Build order (each a separate, stoppable job)
C06a power network (sources, tree cables, local brownout, E4 and E5, visuals). C06b water (E7). C06c road types and congestion (E6). Rough size: C06a about as large as C03; b and c about half each. Nothing starts until the owner says go.

## 7 Risks and unknowns
Scope creep (three systems at once): mitigated by the order above. Readability in AR: many overlays; test on the iPad before adding more. Trees only is a simplification: real grids loop; v0 says so. Wind or other profiles must stay deterministic. The model oddities found in C03 (a short brownout raising net; opening a road lowering net) must be understood BEFORE infrastructure is layered on them, or the balance will mislead. Illustrative coefficients again: the owner can change them in the file.

## 8 Questions for the owner
1. Power first (C06a), or water or roads?
2. Do generators need fuel or wind (a running cost and a schedule), or a fixed output?
3. Should one dark street be possible (local brownouts), or keep the city-wide brownout and add generators only?
4. Is a city budget (income against infrastructure cost) wanted now, or later?

## 9 Paper tests (corrected after review)
My first example had 6 kW of supply for 8.8 kW of demand and no rule for who gets less: that was my mistake (found by ChatGPT). The rule is now defined in 10.1. The paper tests are P1 (a cable limits one street), P2 (a pipe limits the bakery's water), P3 (congestion), P4 (a SHORT source) and P5 (a second generator). Every expected number is checked by `shared/tools/c06-paper-tests.mjs` (a reference calculator, not the feature); saved output: `evidence/C06_paper_tests.txt` (8 of 8 match the hand numbers).

## 10 Review by ChatGPT, 21 Nov (its file, untouched: `inputs/chatgpt_c06_review.md`)
Verdict: the optional `city_infra` sidecar is sound; keep recipes and the district format unchanged. Design only. CAIRN's response, point by point:
1. ACCEPTED, the rule that was missing. Shared shortage and a second source need a rule before any code. Proposed rule A, "proportional to capped demand" (a short source scales every branch below it by the same factor): P4: 6 kW against capped demand 8.0 gives homes 1.5 (54 percent of 2.8) and bakery 4.5 (75 percent). Alternative rule B, priority classes (homes first): kinder to residents, but it needs a priority list. Recommendation: A for v0 (one number, no list). A second source must sit at the root of a tree and its output adds (P5); a source elsewhere is a separate tree. Owner may choose B.
2. ACCEPTED, simplifications: no network losses, no fuel, no wear, no automatic rerouting in v0. KEPT: disconnections (a building with no path is dark), per-branch limits, costs, visible consequences. Generator output is fixed in v0; the repeating wind profile is a first follow-up experiment, not v0.
3. ACCEPTED, a feature: tap a dim building and the page highlights its limiting connection and says why ("Homes cable 2.0 kW; the street wants 2.8 kW").
4. ACCEPTED, a precondition: investigate the two C03 oddities (a short brownout raising net; reopening a road lowering net) BEFORE building C06, otherwise the player can be rewarded for the wrong fix. Added as job C03b.
5. ACCEPTED, build one at a time. ChatGPT gives options only; recommendation unchanged: power first (the clearest local failure and the direct follow-on from C03's power limit).
6. ACCEPTED as proposed test rules, not yet code: P2 partial pipe (cart top-up stays a separate design choice) and P3 congestion (effective distance = cells x max(1, trips / capacity) using LAST tick's trips). P3 carries risk 4 below.
7. Risks, ranked by ChatGPT, adopted as is: (1) undefined allocation maths (now defined, 10.1); (2) misleading economics from C03's oddities (C03b); (3) double counting of pipe and cart supply or of generated power (the design must say a unit of water or power is counted once: by pipe while it reaches, else by cart); (4) unstable traffic and demand feedback (use last tick's trips and test for oscillation); (5) AR readability and performance with many networks and labels (one network visible at a time).
8. REJECTED: nothing.

## 11 The owner's four questions, with ChatGPT's options (CAIRN adds a recommendation)
1. First: power (clearest shortage; CAIRN recommends), water (simplest logistics contrast), roads (strongest spatial puzzle, hardest feedback).
2. Generators: fixed output (predictable; CAIRN recommends for v0), wind profile (a scheduling challenge), fuel (deeper economy, needs delivery rules).
3. Brownouts: city-wide only (simplest, few location decisions), local (better engineering, more maths; CAIRN recommends since it is the point of cables), or staged (test both in sequence).
4. Budget: full costs now (meaningful investment choices, more balancing), display-only (easy, weak stakes), or a read-only cost comparison first (CAIRN recommends as a compromise).

## 12 Provisional options chosen by the owner (21 Nov), and what C03b changes
Provisional (not yet final): POWER first (C06a); FIXED-OUTPUT generators; LOCAL brownouts; READ-ONLY cost comparisons (the page shows what a change would cost and earn; it does not charge a budget yet). Shortage rule A (proportional) is assumed unless the owner picks B.
C03b (`C03b_ODDITIES.md`) adds four rules for C06a:
1. Measure at steady state: a warm-up of at least 1800 s and whole delivery cycles (70 s), because ingredients are charged on delivery and the first minutes include filling the shelves.
2. A short local brownout WILL show a profit gain again (shelf stock covers sales while less electricity is spent). The page must show "shelf stock" and "energy saved" in its explanation so players are not misled; a test must show the gain reverses when the cut is long or deep.
3. Owner decision needed before outages are made cheaper or dearer: should wages be paid when a blocked road or a dark street empties the work places? Today they are not (only filled places are paid).
4. Cost comparisons are read-only: for each proposed generator or cable, show build cost, upkeep per minute, and the steady-state net change over 30 simulated minutes, from the same code the experiments use.

## 13 C06a APPROVAL REQUEST (not started)
Scope: sources (fixed kW) and radial cables with capacity; rule A allocation; local brownouts with a dark-street state; `city_infra` v0 file, validator and 20+ hostile tests; the infra layer inside the district code (no new building engine, recipes unchanged, one new optional hook at most); page: cable thickness and colour by load, a generator glow, tap a dim building to see the limiting cable and why; a read-only "what would this cost and earn" panel; experiments E4 (does one more generator pay for itself, at steady state) and E5 (an overloaded cable dims only its street); every figure repeatable (three runs identical) and checked against the paper tests `C06_paper_tests` (8 of 8 already match by hand); regression tests; screenshots; honest report. Out of scope: water, roads, fuel, wind, losses, wear, rerouting, a real budget, iPad testing, hardware, new art.
Size: about as large as C03 (one careful session; roughly 400,000 to 600,000 tokens). One build at a time. Owner approval needed before it starts.
