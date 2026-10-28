# Planner co-design log

House rule: for every idea Harry adds, the AI working on it adds one of its
own. It can be something different, as long as it makes the town
easier to understand or nicer to live in.

## Built

| Who | Idea | Where |
|---|---|---|
| Harry | Map the hometown (Worcester) on the globe: roads, homes, shops, schools, GPs, bus stops | `osm.js`, `layer.js` |
| Harry | Show where living there is hard: walking time to everyday services, scored per neighbourhood | `access.js` |
| CAIRN | **Severance / detour ratio**: how much further you walk than the straight line. High values point to places a river, railway or big road cuts off, where a footbridge or crossing would help most | `access.js` (`detour`, `mostSeveredCells`) |
| Harry | Suggest where shops (and schools, GPs, bus stops) should go | `sites.js`, drawn as labelled markers |
| CAIRN | **"What if" without editing**: score the town with proposed roads or shops added on top | `analyseAccess(..., { extraRoads, extraPlaces })` |
| CAIRN | **Best single change**: re-score the whole town for every suggested site and name the one change that lifts it most | `rankChanges` in `sites.js`, `bestSingleChange` in `summary.json` |
| Harry | See the Midlands as one organism: how traffic has grown, shifted and been diverted over the years | `traffic.js`, `trafficLayer.js` (time-lapse 2000–2025) |
| CAIRN | **Diversion detector**: a road whose real counted traffic fell sharply while a nearby road's rose over the same years, beyond the regional trend. It finds roadworks and new roads from their fingerprint | `findDiversions` in `traffic.js` |

## First real run: Worcester (OpenStreetMap, 28 Oct 2026)

![Worcester access map](../../docs/media/planner-worcester.png)

- 26,086 mapped homes, overall score **71/100**. Within the walking target: food shop 80%, school 78%, **GP 45%**, bus stop 81%.
- Worst served: the southern edge (Kempsey Road / Norton, around Pear Tree Drive and Church Lane) and Whittington (Gilmour Drive).
- Most cut off: Lyppard Grange in the Warndon Villages. Its winding cul-de-sacs make walks 2–2.6× the straight line.
- Best single change: a GP near Norton Road, St Peters (+2,150 homes within 15 min; town 70.9 → 72.9).
- Biggest food-shop gap: Plantation Drive, Lyppard Grange (+836 homes).

## Midlands traffic, 2000–2025 (DfT, 4,513 count points)

![Traffic time-lapse, 2011](../../docs/media/planner-traffic-2011.png)

- Regional traffic index (2000 = 100): 117 in 2019, **88 in 2020** (lockdown), back to 101 in 2021 and a record **119.5 in 2025**.
- Biggest detected diversion: 2010→2011 in Birmingham, the A4540 lost ~10,900 vehicles/day while the A38 0.4 km away gained ~19,000.
- Others: A453 → A4540 in Birmingham 2011–13 (~7,800/day), A5035 → A500 in Stoke-on-Trent 2006–08 (~3,600/day).
- These are leads to check against what was happening on the ground (roadworks, new junctions, closures), not proof.

## Next

1. **Housing sites.** Candidates near services and outside Environment Agency flood zones (Severn/Teme). Needs the flood-zone data.
2. **Real movement, counted not tracked.** ONS census travel-to-work flows and DfT traffic counts.
3. **Simulated residents.** About 100,000 synthetic people matching the census. Run a day, find the jams, check them against the traffic counts, then try changes.
4. **Roadworks history.** Street Manager open data (England, 2020 onwards) to confirm diversions against real works.
5. **Near-live speeds.** National Highways WebTRIS sensors (M5 by Worcester, 15-minute data).
6. **Draw a road in the app.** Click to propose a link and see the before/after scores live.
