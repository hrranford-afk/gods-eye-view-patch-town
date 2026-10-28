# Town Planner — guide for AIs (and people)

A small add-on to God's Eye View for thinking about how a town could work
better: where people can walk to everyday services, where roads, rivers and
railways cut neighbourhoods off, and (later) what a new road, shop or housing
estate would change.

It works on **neighbourhoods, never individuals**. Homes are counted into
250 m grid squares and only the squares are published. Do not add data that
tracks or identifies real people (number plates, phone traces, names on
houses). Use public totals (census, traffic counts) and simulated residents.

## Three commands

```sh
npm run planner -- towns               # list towns
npm run planner -- fetch worcester     # download OpenStreetMap data in tiles, retrying across mirrors
npm run planner -- census worcester    # Census 2021: households, residents, travel to work per neighbourhood
npm run planner -- gps worcester       # official NHS GP practices: list size, patient survey, location
npm run planner -- analyse worcester   # score walking access, write map files (uses census/gps/buses if present)
npm run planner -- traffic west-midlands   # DfT yearly traffic counts 2000–2025 → time-lapse
npm run dev                            # open the app → Data Layers → "Town Planner" / "Traffic Time-lapse"
```

If the Overpass servers are too busy, cut the town out of a ready-made
OpenStreetMap extract instead (Worcester is in the West Midlands file):

```sh
curl -O https://download.openstreetmap.fr/extracts/europe/united_kingdom/england/west_midlands-latest.osm.pbf
pip install osmium
python3 scripts/planner-pbf.py west_midlands-latest.osm.pbf 52.155,-2.285,52.235,-2.155 worcester-osm.json
npm run planner -- import worcester worcester-osm.json
```

Buses come from the national Bus Open Data timetable (GTFS), cut to the
town for one ordinary weekday; `analyse` then writes `bus.json`:

```sh
curl -L -o wm_gtfs.zip https://data.bus-data.dft.gov.uk/timetable/download/gtfs-file/west_midlands/
python3 scripts/planner-gtfs.py wm_gtfs.zip 52.155,-2.285,52.235,-2.155 2026-11-03 public/planner/worcester/buses.json
```

Behind a corporate or cloud proxy, Node's built-in `fetch` ignores
`HTTPS_PROXY` unless you add `NODE_USE_ENV_PROXY=1` (Node 22.21+). Set
`PLANNER_OVERPASS_URL` to try a particular Overpass server first.

## Files

| File | What it is |
|---|---|
| `src/planner/towns.js` | Known towns and their bounding boxes. Add a town here. |
| `src/planner/osm.js` | OpenStreetMap → **town file**; service kinds and walking targets. |
| `src/planner/graph.js` | Walking network and shortest-path search. No browser code. |
| `src/planner/access.js` | Walking-access scores, grid cells, GeoJSON output. No browser code. |
| `src/planner/census.js` | Census 2021 neighbourhoods (LSOAs): households, residents, travel to work, health, age, deprivation, cars; spreads households over buildings as home weights `w`; a 0–1 `need` score per area. No browser code. |
| `src/planner/sites.js` | Suggested sites: where one more shop/school/GP/bus stop serves the most unserved homes. No browser code. |
| `src/planner/buses.js` | Bus frequency per stop and door-to-door bus-or-walk minutes to services (one-seat rides, average wait from the timetable). No browser code. |
| `src/planner/river.js` | Rivers as barriers: crossings, which bank each home is on, services across the water, best new footbridge. No browser code. |
| `src/planner/traffic.js` | DfT yearly traffic counts: CSV → count points, regional pulse, diversion detector. No browser code. |
| `src/planner/trafficLayer.js` | The traffic time-lapse layer (Cesium): columns per road, one year per step, diversions labelled. |
| `src/planner/layer.js` | The globe layer that draws the results (Cesium). |
| `src/planner/planner.test.mjs` | Tests on a tiny made-up street grid. `node --test src/planner/` |
| `src/planner/IDEAS.md` | Co-design log: what's been added, by whom, and what's next. |
| `src/planner/ROADMAP.md` | Purpose, open data sources (checked reachable), unused app features, and the build order. |
| `scripts/planner.mjs` | The command line above. |

Output for a town lands in `public/planner/<town>/`:

- `town.json`: the **town file** (not committed, re-fetchable)
- `access.geojson`: grid squares with `homes`, `score` (0–100), `minutes` and `within` per service, and `detour`
- `roads.geojson`, `places.geojson`: what the layer draws
- `sites.geojson`: the top 3 suggested sites per service, with `homesGained`
- `census.json`, `areas.geojson`: Census 2021 neighbourhoods with households, residents and travel-to-work shares
- `buses.json` (timetable cut) and `bus.json` (stops with buses/hour, share of households near a frequent stop, walk vs bus-or-walk minutes per service and per neighbourhood)
- `river.json`: the main river's crossings, per-bank households and walking minutes, and `bestNewFootbridge`
- `summary.json`: headline numbers, the worst-served squares, the most cut-off squares, the suggested sites, and `bestSingleChange`

Traffic lands in `public/planner/traffic/<region>.json`: `years`, `pulse`
(region vehicle-km per year, 2000 = 100), `diversions`, and `points`, each with
`all` (vehicles/day per year, aligned to `years`) and `counted` (1 real count,
0 DfT estimate). Diversions only ever use counted-to-counted changes, measured
against the regional trend.

## The town file (the one shape everything shares)

```json
{
  "town": "worcester",
  "roads":  [{ "id": 1, "kind": "local", "walk": true, "name": "", "nodes": [10, 11], "coords": [[-2.22, 52.19], [-2.22, 52.191]] }],
  "places": [{ "id": "node/3", "kind": "shop", "name": "Spar", "lon": -2.221, "lat": 52.19 }],
  "homes":  [{ "id": "way/5", "lon": -2.223, "lat": 52.192 }]
}
```

`kind` for roads: `major`, `distributor`, `local`, `path`, `other`.
`kind` for places: `shop`, `school`, `gp`, `bus` (see `SERVICE_KINDS` in `osm.js`).

## Asking "what if?"

`analyseAccess(town, { extraRoads, extraPlaces })` scores the town with
proposed changes added, without editing the town file. Compare the two
summaries:

```js
const before = analyseAccess(town).summary;
const after = analyseAccess(town, {
  extraPlaces: [{ id: 'new-shop', kind: 'shop', name: 'Proposed', lon: -2.2, lat: 52.2 }],
}).summary;
```

`suggestSites(town, { kind: 'shop', count: 3 })` (in `sites.js`) finds the
spots on the network where one more service would bring the most homes
within its walking target, picking greedily so each site adds new homes. `rankChanges(town, sites)`
then re-scores the town for each one and sorts them by overall-score gain.

A new road is a road object whose `nodes` reuse existing node ids where it
joins the network, plus new negative ids for its own new points.

## Known limits

- Homes are OSM buildings (houses, flats, terraces, and plain `building=yes`)
  weighted so each neighbourhood adds up to its Census 2021 household count.
  Garages and sheds tagged `yes` get a share too; they sit beside homes, so
  walking times barely move, but shares within a neighbourhood are rough.
  Neighbourhoods cut by the town's edge put all their households on the
  buildings inside it. Flats count 6 households per building, a guess.
- New estates sometimes lack mapped footpaths in OpenStreetMap, which makes
  their walks look longer than they are.
- Shops, schools and bus stops are OpenStreetMap's: a missing one on the map
  is a missing one in the score. **GPs come from the NHS list** when
  `gps.json` exists, because OSM missed Worcester surgeries and tagged
  hospital departments as clinics. Branch surgeries are not included yet.
- Check any OSM layer against an official list before trusting a finding
  built on it. The GP correction overturned three earlier answers.

## The question loop

`public/planner/<town>/questions.json` is the planner's to-do list and lab
notebook. Every question asked of the planner goes in it with an `id`,
`question`, `askedBy`, `status` (`open` or `answered`), a `lonLat` for where
on the map it's about, and either a `finding` or `unlocks` (the data that
would answer it). Answers list the new questions they `spawned`; spawned
questions point back with `from`. The layer shows open questions as **?**
and answered ones as **✓**. A question built on a mistake is marked
`withdrawn` with the reason, kept in the file, and not drawn.

Picking up work? Start with an open question. When you answer it, record
the finding honestly, including "no effect" results, and add the new
questions it raises.

## Rules for changes

- Keep `osm.js`, `graph.js`, `access.js`, `sites.js`, `census.js`, `river.js`, `buses.js` and `traffic.js` free of browser and Cesium code, so they run anywhere.
- Every new measure gets a test in `planner.test.mjs` on the made-up grid.
- Run `npm test` before pushing (the whole app suite, ~3,400 tests).
- Log what you added in `IDEAS.md`, and what you asked or answered in `questions.json`.
