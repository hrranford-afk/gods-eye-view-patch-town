# C06: infrastructure design note v0 (CLOUD, 21 Nov 2026). DESIGN ONLY: nothing is built.
Status: WORKING (note). The owner asked for the note first and for a co-design review by ChatGPT. Nothing below is approved.

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

## 9 Paper test first (cheap, no code)
Before any build: three hand calculations on a 6-building tree (one source of 6 kW, a cable of 4 kW capacity to a street of 3 homes drawing 2.8 kW in total, a bakery on the main feeder drawing 6 kW): who browns out, by how much, and what one extra 3 kW generator changes. The numbers must come out the same by hand and by the code later.
