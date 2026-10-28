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
| Harry | Make it about human happiness and health; see how people move (walking, cycling, commuting) | `census.js` (Census 2021 households and travel to work), cycling time-lapse |
| CAIRN | **Census-weighted homes**: OSM says where buildings are, the census says how many households live in each neighbourhood. Sharing one over the other makes every score count real households | `attachCensus` in `census.js` |

## First real run: Worcester (OpenStreetMap, 28 Oct 2026)

![Worcester access map](../../docs/media/planner-worcester.png)

- First pass: 26,086 mapped homes, overall score 71/100.
- **With Census 2021 weights: 54,807 households** (of 55,909 in the 78 neighbourhoods). Overall score **70/100**. Within the walking target: food shop 79%, school 76%, **GP 46%**, bus stop 77%.
- How Worcester gets to work (Census 2021, of those who travel): **car 78%**, walk 13%, cycle 3%, bus 2%, train 1%. 29% work mainly from home.
- Worst served: the southern edge (Kempsey Road / Norton, around Pear Tree Drive and Church Lane) and Whittington (Gilmour Drive).
- Most cut off: Lyppard Grange in the Warndon Villages. Its winding cul-de-sacs make walks 2–2.6× the straight line.
- Best single change: a GP near Norton Road, St Peters (+3,899 households within 15 min with census weights; town 69.6 → 71.4).
- Biggest food-shop gap: Plantation Drive, Lyppard Grange (+836 homes).

## Health check: does a far GP mean worse health? (28 Oct 2026)

64 neighbourhoods inside Worcester city. Census 2021 general health, age,
deprivation and disability, compared with each neighbourhood's
household-weighted walk to the nearest GP.

- **No sign that GP walking distance affects health.** After allowing for age and deprivation, an extra minute's walk shows −0.014 points of "bad health" (t = −1.1, i.e. nothing). Disability is the same (t = −1.3).
- **Deprivation explains almost everything.** Bad health vs share of deprived households: r = 0.91. With age added, the model explains 87% of the differences.
- **The far-from-GP areas are better off and older.** GP walk vs deprivation r = −0.33; vs over-65s r = +0.53. These are suburbs where most people drive.
- **The Norton Road GP (best single change) would mostly help healthier, less deprived households:** ~3,200 in St Peters/Norton (Worcester 013A, 014A–D), bad health 2–5% vs 4.8% city average. Some of them are older (24–26% over 65 in 014A and 014D).
- **Worst health is in deprived neighbourhoods 7–18 min from a GP:** Worcester 002D (Selsey Close, 11.3% bad health, 41% deprived), 002B (Windermere Drive), 009A (Dines Green), 005B (Cherwell Close).
- **A different, real gap: older people far from a GP.** Worcester 012E (Lower Wick, Montreal Close) and 012D (St Peters, Cormorant Rise): 34–35% over 65 and a 35–38 min walk.

Limits: self-reported health, one point in time, 64 areas; distance is not
GP capacity (patients per GP is the next data to add, from NHS Digital); and
most people don't walk to their GP. A finding to discuss, not a verdict.

## Midlands traffic, 2000–2025 (DfT, 4,513 count points)

![Traffic time-lapse, 2011](../../docs/media/planner-traffic-2011.png)

- Regional traffic index (2000 = 100): 117 in 2019, **88 in 2020** (lockdown), back to 101 in 2021 and a record **119.5 in 2025**.
- Biggest detected diversion: 2010→2011 in Birmingham, the A4540 lost ~10,900 vehicles/day while the A38 0.4 km away gained ~19,000.
- Others: A453 → A4540 in Birmingham 2011–13 (~7,800/day), A5035 → A500 in Stoke-on-Trent 2006–08 (~3,600/day).
- Cycling (DfT cyclist counts, 2000 = 100): fell to ~66–70 in the mid-2000s, back to 110 in 2019, **peaked at 129 in 2020** (lockdown), and settled around 98 by 2025.
- These are leads to check against what was happening on the ground (roadworks, new junctions, closures), not proof.

## Next

0. **GP capacity.** NHS Digital patients-registered-per-practice and GP workforce, so access means "can get an appointment", not just distance. Then score need (health, age, deprivation) against access.

1. **Housing sites.** Candidates near services and outside Environment Agency flood zones (Severn/Teme). Needs the flood-zone data.
2. **Real movement, counted not tracked.** ONS census travel-to-work flows and DfT traffic counts.
3. **Simulated residents.** About 100,000 synthetic people matching the census. Run a day, find the jams, check them against the traffic counts, then try changes.
4. **Roadworks history.** Street Manager open data (England, 2020 onwards) to confirm diversions against real works.
5. **Near-live speeds.** National Highways WebTRIS sensors (M5 by Worcester, 15-minute data).
6. **Draw a road in the app.** Click to propose a link and see the before/after scores live.
