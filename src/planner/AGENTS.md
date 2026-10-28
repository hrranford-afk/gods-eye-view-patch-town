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
npm run planner -- fetch worcester     # download OpenStreetMap data (needs overpass-api.de)
npm run planner -- analyse worcester   # score walking access, write map files
npm run dev                            # open the app → Data Layers → "Town Planner"
```

## Files

| File | What it is |
|---|---|
| `src/planner/towns.js` | Known towns and their bounding boxes. Add a town here. |
| `src/planner/osm.js` | OpenStreetMap → **town file**; service kinds and walking targets. |
| `src/planner/graph.js` | Walking network and shortest-path search. No browser code. |
| `src/planner/access.js` | Walking-access scores, grid cells, GeoJSON output. No browser code. |
| `src/planner/sites.js` | Suggested sites: where one more shop/school/GP/bus stop serves the most unserved homes. No browser code. |
| `src/planner/layer.js` | The globe layer that draws the results (Cesium). |
| `src/planner/planner.test.mjs` | Tests on a tiny made-up street grid. `node --test src/planner/` |
| `src/planner/IDEAS.md` | Co-design log: what's been added, by whom, and what's next. |
| `scripts/planner.mjs` | The command line above. |

Output for a town lands in `public/planner/<town>/`:

- `town.json`: the **town file** (not committed, re-fetchable)
- `access.geojson`: grid squares with `homes`, `score` (0–100), `minutes` and `within` per service, and `detour`
- `roads.geojson`, `places.geojson`: what the layer draws
- `sites.geojson`: the top 3 suggested sites per service, with `homesGained`
- `summary.json`: headline numbers, the worst-served squares, the most cut-off squares, the suggested sites, and `bestSingleChange`

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

## Rules for changes

- Keep `osm.js`, `graph.js`, `access.js` and `sites.js` free of browser and Cesium code, so they run anywhere.
- Every new measure gets a test in `planner.test.mjs` on the made-up grid.
- Run `npm test` before pushing (the whole app suite, ~3,400 tests).
- Log what you added in `IDEAS.md`.
