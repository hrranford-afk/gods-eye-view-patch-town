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

## First real run: Worcester (OpenStreetMap, 28 Oct 2026)

![Worcester access map](../../docs/media/planner-worcester.png)

- 26,086 mapped homes, overall score **71/100**. Within the walking target: food shop 80%, school 78%, **GP 45%**, bus stop 81%.
- Worst served: the southern edge (Kempsey Road / Norton, around Pear Tree Drive and Church Lane) and Whittington (Gilmour Drive).
- Most cut off: Lyppard Grange in the Warndon Villages. Its winding cul-de-sacs make walks 2–2.6× the straight line.
- Best single change: a GP near Norton Road, St Peters (+2,150 homes within 15 min; town 70.9 → 72.9).
- Biggest food-shop gap: Plantation Drive, Lyppard Grange (+836 homes).

## Next

1. **Housing sites.** Candidates near services and outside Environment Agency flood zones (Severn/Teme). Needs the flood-zone data.
2. **Real movement, counted not tracked.** ONS census travel-to-work flows and DfT traffic counts.
3. **Simulated residents.** About 100,000 synthetic people matching the census. Run a day, find the jams, check them against the traffic counts, then try changes.
4. **Draw a road in the app.** Click to propose a link and see the before/after scores live.
