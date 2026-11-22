# City Lab district layer (schema `city_district`, version 0), by CLOUD Claude, C03

A district is DATA that places buildings (each a normal `rtk.building` recipe) on a small grid and says how they affect one another. It is a thin layer ON TOP of the existing per-building machine (`sim.js`). It is not a second building engine: every shop, workshop, market and shed runs `sim.js`; the district decides what goes INTO each machine every second.

Files: `district.js` (pure, deterministic, fixed step, plain-JSON state), `district-validate.js` (strict file check, reuses `validate.js` for every recipe and `sidecar` rules for upgrades), `districts/patch_row.json` (ChatGPT's small recipes) and `districts/patch_row_hand.json` (the hand-made, detailed recipes; same simulation data, see `tools/compare-looks.mjs`).

## What the file holds
`grid {cols, rows}`, `roads [{cell, open}]`, `depot` cell, `power {supply_kw, home_base_kw, per_resident_kw}`, `coefficients` (all the numbers below), `home_template {recipe, capacity}`, `home_slots` (where new homes go), `buildings [{id, recipe, cell, kind (home|shop|market|workshop|shed), sidecars, employs, hire_priority, residents}]`, `events [{t, action: block_road|open_road|supply_scale, ...}]`. Every coefficient is in the file, so the owner can change a number without touching code.

## The rules (each one small)
1. **Residents.** A home houses `capacity` residents. A share `work_fraction` of them work. Employers are filled in `hire_priority` order from the nearest reachable homes (within `max_commute_cells` of open road). Only filled places are paid and only filled places run: the share of places filled scales that role's work (hook `staff`).
2. **Demand.** For a shop selling item *i*: each home that can reach it over open roads (distance *d* cells, at most `max_reach_cells`) has weight `decay_per_cell^d`, shared between all reachable shops selling the same item. A home spends `((residents - working) + working x (1 + wage_spend_boost)) x per_resident_per_min[i]`. The market adds footfall: `min(cap, market_bonus x sum over markets of footfall.decay_per_cell^distance)` on nearby shops, plus `market_visitors_per_min[i]` shared by distance. Demand = resident part x (1 + footfall) + visitors. It is passed to the bakery's own sales code as its `demand_per_minute` for that second (hook), so there is no second sales system.
3. **Shared electricity.** Draw = every machine's `demand_kw` (plus any extra) + homes (`home_base_kw + per_resident_kw x residents`). Supply = `supply_kw x scale`. `factor = min(1, supply / draw)` is fed to every machine as its supply (a brownout slows all of them equally). A power shed is a consumer: in a recipe `supply_kw` means INCOMING supply, so the grid supply stays a city-level number.
4. **Shared deliveries.** A cart needs an open road path from the depot to a road cell next to the building. If there is none, that building's deliveries are suspended (hook `deliveries: false`) and the missed visit is counted and logged.
5. **Workshop.** Employs workers, turns wood into tools by its own recipe. Tools are stock only; nothing else consumes them (no invented supply chain).
6. **Upgrades.** A C02 sidecar applied to a patched COPY of the bakery recipe; the copy must still pass the v1 validator. Cost is counted once (`capex`).
7. **Log.** Every change (home added or removed, road blocked or opened, grid change, upgrade, scheduled event) writes one sentence with cause, the numbers before and after, and the machines affected. The page shows it and highlights the change.

## Optional hooks added to `sim.js` (backwards compatible)
`CitySim.setExternal(S, {supply_kw, demand_per_minute, deliveries, staff})`. A state that never calls it behaves exactly as before; the original suites pass unchanged.

## Reproduce
`node tests/district-test.js` (70), `node tests/district-e2e.js` (11), `NODE_PATH=$(npm root -g) node tests/district-page-test.js` (29), `node tools/c03-experiments.js` (writes the figures), `node tools/compare-looks.mjs` (hand-made recipes give identical figures), `node tools/check-district-recipes.mjs` (the four hand-made recipes pass the v1 validator).

## Power network (C06a)
An optional `city_infra` file (sources, a tree of cables with capacities, local brownouts) can sit beside a district: see `INFRA.md`. A district without it behaves exactly as described above.
