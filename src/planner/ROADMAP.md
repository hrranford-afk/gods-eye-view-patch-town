# Planner roadmap: purpose, data, visuals

Written 28 Oct 2026 after the first Worcester and Midlands runs. Every source
below was checked as reachable that day unless marked otherwise.

## What this is for (proposed; Harry to confirm)

**A what-if sandbox for a real place.** Start with Worcester, then the
Midlands. It should let anyone see how the place works today, try a change
(a road, a bridge, homes, a GP surgery, a closure), and see the effect on
everyday life: how far people walk, where traffic goes, safety, flood risk.
And it should tell that story so a non-planner gets it in one look.

Three tests for any new piece:

1. **Is it real?** Built on public data, with counts and estimates kept apart.
2. **Does it answer a "what if"?** Not just a pretty layer.
3. **Can another AI extend it?** One data shape, pure functions, a test.

People are counted, never tracked (see AGENTS.md).

## Data we can feed in

| Source | What it gives | What it unlocks | Status |
|---|---|---|---|
| **OS OpenUPRN** (api.os.uk downloads) | Every addressable property in GB as a point | Fixes the "half the homes missing" problem | ✅ reachable |
| **Census 2021** (Nomis API) | People and households per small area; car ownership; how and where people travel to work | Real population weights; commuting flows for the traffic model | ✅ reachable |
| **planning.data.gov.uk** (224 datasets) | Brownfield land, flood risk zones, green belt, conservation areas, listed buildings, tree preservation orders, local plan housing, air quality management areas | **The housing-site finder**: where homes can and can't go | ✅ reachable (some queries slow) |
| **Environment Agency flood zones** | Flood Zones 2 and 3, rivers and sea | Rule out flood-prone sites (Severn, Teme) | ✅ reachable |
| **Bus Open Data (GTFS, West Midlands)** | Every timetabled bus trip (207 MB) | Bus *frequency*, not just stops; real public-transport travel times | ✅ reachable |
| **NaPTAN** | Every bus stop and station, officially | Cross-check OSM stops | ✅ reachable |
| **DfT road traffic counts** (AADF) | Vehicles/day per count point, 2000–2025 | ✅ **in use**: traffic time-lapse | ✅ in use |
| **National Highways WebTRIS** | 15-minute counts and speeds on motorways and trunk roads | Daily rhythm of jams (M5 by Worcester) | ✅ reachable |
| **DfT road collisions** (STATS19) | Every reported injury collision, location and severity | Dangerous junctions; safety effect of changes | ✅ reachable |
| **Street Manager open data** | Roadworks permits, England, 2020 onwards | Confirm detected diversions | ✅ reachable |
| **Land Registry price paid** | Every house sale, price and date | How places change; affordability | ✅ reachable |
| **Index of Multiple Deprivation 2019** | Deprivation by small area | Who a change actually helps | ✅ reachable |
| OS Open Roads / Open Rivers / Open Greenspace / Built Up Areas | Official road network, rivers, parks, town extents | Cleaner networks; access to green space | ✅ reachable |
| OpenAQ | Air quality sensors | Pollution along busy roads | 🔑 needs a free key |
| TomTom flow | Live congestion | App already supports it | 🔑 needs a free key |
| Google Photorealistic 3D Tiles | Worcester in true 3D | Far better visuals | 🔑 needs a key (free tier) |

## God's Eye View features we are not using yet

So far the planner draws flat squares, dots and columns. The app can do much more:

| App feature | How the planner could use it |
|---|---|
| **Scene director** (cinematic camera tours) | A Worcester tour from the worst-served estate to the best; a "20 years of Midlands traffic" flythrough |
| **Route finder** (OSRM walk/car/bike) + "fly the route" | Click a red square and watch the actual walk to the nearest GP trace through the streets |
| **Voice whiteboard** (draws real boundaries and routes) | Draw a proposed road or bridge, then feed it straight into `extraRoads` for a before/after score |
| **Voice agent** (28 tools, knows what's on screen) | "Where's the worst place for GPs?", "What if we built a surgery here?" (needs an OpenAI key, or later a PatchTown local model) |
| **Context cards** (click anything for a card) | Proper cards for squares, sites and count points, in the app's own style |
| **Share links** | Send someone Worcester with the planner on, or the Midlands paused on a given year |
| **Sensor looks** (FLIR/thermal, NVG) | Thermal look for the traffic time-lapse: busy roads glow hot |
| **Photoreal 3D** | Planner layers draped over real 3D Worcester (Google key) |

## Recommended order

1. **Trustworthy numbers.** OS OpenUPRN for every home, plus Census 2021 for people per area. Everything after this rests on it.
2. **Housing-site finder.** Combine access scores with brownfield land, flood zones, green belt and conservation areas, using `planning.data.gov.uk` and the EA. This answers "where should houses be built" directly.
3. **Show it properly.** Click-a-square → walk the real route (route finder), a scene-director tour of Worcester, and share links that include the year.
4. **Movement.** Census commuting plus bus frequency plus the traffic counts, feeding the simulated-residents model.
5. **Draw a change.** Whiteboard road or bridge → before/after across access, traffic and safety.
