import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeOverpass, overpassQueries, parseOverpass, roadKind } from './osm.js';
import { buildWalkGraph, metresBetween, nearestFrom } from './graph.js';
import { analyseAccess, cellsToGeoJson } from './access.js';
import { getTown } from './towns.js';
import { rankChanges, suggestSites, sitesToGeoJson } from './sites.js';

// A 5×5 street grid with ~100 m blocks around (0, 52); node id = row*10+col.
const STEP = 0.0009; // degrees ≈ 100 m north-south, ≈ 62 m east-west at 52°N
const at = (r, c) => [c * STEP * 1.6, 52 + r * STEP];
function gridTown({ cutRow = null } = {}) {
  const roads = [];
  for (let r = 0; r < 5; r++) {
    const nodes = [0, 1, 2, 3, 4].map((c) => r * 10 + c);
    roads.push({ id: `h${r}`, kind: 'local', walk: true, nodes, coords: nodes.map((n) => at(Math.floor(n / 10), n % 10)) });
  }
  for (let c = 0; c < 5; c++) {
    for (let r = 1; r < 5; r++) {
      // `cutRow` removes the vertical links crossing between rows cutRow-1 and cutRow,
      // except on column 0: a "railway" with one crossing at the west end.
      if (r === cutRow && c !== 0) continue;
      const nodes = [(r - 1) * 10 + c, r * 10 + c];
      roads.push({ id: `v${r}${c}`, kind: 'local', walk: true, nodes, coords: nodes.map((n) => at(Math.floor(n / 10), n % 10)) });
    }
  }
  const [shopLon, shopLat] = at(0, 4);
  const homes = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const [lon, lat] = at(r, c);
    homes.push({ id: `h${r}${c}`, lon: lon + 0.00005, lat: lat + 0.00005 });
  }
  return {
    town: 'grid',
    roads,
    places: [{ id: 's', kind: 'shop', name: 'Corner shop', lon: shopLon, lat: shopLat }],
    homes,
  };
}

test('road kinds collapse OSM highway values', () => {
  assert.equal(roadKind('primary'), 'major');
  assert.equal(roadKind('tertiary_link'), 'distributor');
  assert.equal(roadKind('residential'), 'local');
  assert.equal(roadKind('footway'), 'path');
});

test('overpass elements become roads, services and homes', () => {
  const town = parseOverpass({
    elements: [
      { type: 'way', id: 1, tags: { highway: 'residential', name: 'Foregate St' }, nodes: [10, 11], geometry: [{ lat: 52.19, lon: -2.22 }, { lat: 52.191, lon: -2.22 }] },
      { type: 'way', id: 2, tags: { highway: 'motorway' }, nodes: [12, 13], geometry: [{ lat: 52.19, lon: -2.2 }, { lat: 52.2, lon: -2.2 }] },
      { type: 'node', id: 3, lat: 52.19, lon: -2.221, tags: { shop: 'convenience', name: 'Spar' } },
      { type: 'node', id: 4, lat: 52.19, lon: -2.222, tags: { highway: 'bus_stop' } },
      { type: 'way', id: 5, center: { lat: 52.192, lon: -2.223 }, tags: { building: 'house' } },
      { type: 'way', id: 6, center: { lat: 52.193, lon: -2.224 }, tags: { amenity: 'doctors' } },
    ],
  }, 'test');
  assert.deepEqual(town.roads.map((r) => [r.kind, r.walk]), [['local', true], ['major', false]]);
  assert.deepEqual(town.places.map((p) => p.kind), ['shop', 'bus', 'gp']);
  assert.equal(town.homes.length, 1);
});

test('shortest walk follows the network, not the straight line', () => {
  const graph = buildWalkGraph(gridTown().roads);
  const start = graph.snap(at(0, 0));
  const { dist } = nearestFrom(graph, [{ node: start.node, metres: 0 }]);
  const far = graph.snap(at(4, 4)).node;
  const manhattan = metresBetween(at(0, 0), at(0, 4)) + metresBetween(at(0, 4), at(4, 4));
  assert.ok(Math.abs(dist[far] - manhattan) < 1, `${dist[far]} vs ${manhattan}`);
});

test('access scores fall with distance and a barrier shows up as detour', () => {
  const open = analyseAccess(gridTown(), { cellM: 2000 });
  const cut = analyseAccess(gridTown({ cutRow: 1 }), { cellM: 2000 });
  assert.equal(open.summary.homes, 25);
  const openMin = open.cells[0].minutes.shop;
  const cutMin = cut.cells[0].minutes.shop;
  assert.ok(cutMin > openMin, `barrier should lengthen walks: ${cutMin} <= ${openMin}`);
  assert.ok(cut.cells[0].detour > open.cells[0].detour);
  // No school, GP or bus stop exists, so nobody meets those targets.
  assert.equal(open.summary.shareOfHomesMeetingTarget.school, 0);
  assert.ok(open.summary.shareOfHomesMeetingTarget.shop > 0.9);
});

test('a proposed link repairs the barrier', () => {
  const town = gridTown({ cutRow: 1 });
  const before = analyseAccess(town, { cellM: 2000 }).cells[0].minutes.shop;
  const bridge = { id: 'new', kind: 'local', walk: true, nodes: [4, 14], coords: [at(0, 4), at(1, 4)] };
  const after = analyseAccess(town, { cellM: 2000, extraRoads: [bridge] }).cells[0].minutes.shop;
  assert.ok(after < before);
});

test('cells publish as closed GeoJSON polygons without home positions', () => {
  const { cells } = analyseAccess(gridTown(), { cellM: 100 });
  const fc = cellsToGeoJson(cells);
  assert.equal(fc.features.length, cells.length);
  const ring = fc.features[0].geometry.coordinates[0];
  assert.deepEqual(ring[0], ring[4]);
  assert.ok(!('homesList' in fc.features[0].properties));
  assert.equal(getTown('Worcester').name, 'Worcester');
  assert.throws(() => getTown('atlantis'), /Known towns/);
});

test('suggested shop goes where the unserved homes are', () => {
  // A long street: shop at the west end, homes spread 3 km east of it.
  const roads = [];
  const nodes = [...Array(41).keys()];
  const pt = (i) => [i * 0.0012, 52];
  roads.push({ id: 'st', kind: 'local', walk: true, nodes, coords: nodes.map(pt) });
  const homes = nodes.map((i) => ({ id: `h${i}`, lon: pt(i)[0], lat: 52.0001 }));
  const town = { roads, homes, places: [{ id: 's', kind: 'shop', lon: 0, lat: 52 }] };
  const [first, second] = suggestSites(town, { kind: 'shop', count: 2 });
  const servedNow = analyseAccess(town).summary.shareOfHomesMeetingTarget.shop;
  assert.ok(first.lon > pt(15)[0], `first site should be east of the served end: ${first.lon}`);
  assert.ok(first.homesGained >= second.homesGained);
  const after = analyseAccess(town, { extraPlaces: [{ id: 'n', kind: 'shop', lon: first.lon, lat: first.lat }] });
  assert.ok(after.summary.shareOfHomesMeetingTarget.shop > servedNow);
  const ranks = sitesToGeoJson([first, second, { ...first, kind: 'bus' }]).features.map((f) => f.properties.rank);
  assert.deepEqual(ranks, [1, 2, 1]);
  assert.throws(() => suggestSites(town, { kind: 'pub' }), /Unknown service kind/);
});

test('best single change ranks the site that lifts the town most first', () => {
  const town = gridTown();
  const far = { kind: 'school', lon: at(2, 2)[0], lat: at(2, 2)[1], homesGained: 25 };
  const useless = { kind: 'shop', lon: at(0, 4)[0], lat: at(0, 4)[1], homesGained: 0 };
  const [best, worst] = rankChanges(town, [useless, far], { cellM: 2000 });
  assert.equal(best.kind, 'school');
  assert.ok(best.scoreGain > 0);
  assert.equal(worst.scoreGain, 0);
});

test('town fetch splits into tiled queries and merges duplicates', () => {
  const queries = overpassQueries(getTown('worcester'), { tiles: 2 });
  assert.equal(queries.length, 8);
  assert.ok(queries.every((q) => /\(52\.\d+,-2\.\d+,52\.\d+,-2\.\d+\)/.test(q)));
  const merged = mergeOverpass([
    { elements: [{ type: 'way', id: 1 }, { type: 'node', id: 1 }] },
    { elements: [{ type: 'way', id: 1 }, { type: 'way', id: 2 }] },
  ]);
  assert.deepEqual(merged.elements.map((e) => `${e.type}/${e.id}`), ['way/1', 'node/1', 'way/2']);
});

test('traffic: csv parses quotes, pulse indexes years, diversions need real counts', async () => {
  const { parseCsv, buildCountPoints, regionalPulse, findDiversions, toTrafficLayerJson } = await import('./traffic.js');
  const head = 'count_point_id,year,road_name,road_type,local_authority_name,latitude,longitude,link_length_km,estimation_method,all_motor_vehicles,all_hgvs,pedal_cycles';
  const row = (id, y, road, lon, all, method = 'Counted') => `${id},${y},"${road}",Major,"Worcester, City of",52.19,${lon},1,${method},${all},0,0`;
  const csv = [head,
    row(1, 2010, 'A44', -2.22, 20000), row(1, 2011, 'A44', -2.22, 10000),
    row(2, 2010, 'A38', -2.21, 15000), row(2, 2011, 'A38', -2.21, 25000),
    row(3, 2010, 'A449', -2.2, 30000), row(3, 2011, 'A449', -2.2, 30000),
    row(4, 2010, 'B4204', -2.19, 9000, 'Estimated'), row(4, 2011, 'B4204', -2.19, 20000, 'Estimated'),
  ].join('\n');
  const rows = parseCsv(csv);
  assert.equal(rows[0].local_authority_name, 'Worcester, City of');
  const points = buildCountPoints(rows);
  assert.equal(points.length, 4);
  const pulse = regionalPulse(points);
  assert.deepEqual(pulse.map((p) => p.year), [2010, 2011]);
  assert.equal(pulse[0].index, 100);
  const [d] = findDiversions(points, { minFlow: 1000, minMoved: 100 });
  assert.equal(d.fell.road, 'A44');
  assert.equal(d.rose.road, 'A38'); // B4204 rose more, but only in estimates
  const json = toTrafficLayerJson(points, { region: 'test' });
  assert.deepEqual(json.points[3].counted, [0, 0]);
});

test('census weights spread households over buildings and drive the scores', async () => {
  const { pointInGeometry, buildAreas, attachCensus, areasToGeoJson } = await import('./census.js');
  const square = (x0, y0, x1, y1) => ({ type: 'Polygon', coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] });
  assert.ok(pointInGeometry([0.5, 0.5], square(0, 0, 1, 1)));
  assert.ok(!pointInGeometry([1.5, 0.5], square(0, 0, 1, 1)));
  const town = gridTown();
  const [w, s] = at(0, 0);
  const [e, n] = at(4, 4);
  const areas = buildAreas(
    { features: [{ properties: { LSOA21CD: 'E01', LSOA21NM: 'Grid 001A' }, geometry: square(w - 0.001, s - 0.001, e + 0.001, n + 0.001) }] },
    {
      households: [{ GEOGRAPHY_CODE: 'E01', OBS_VALUE: '100' }],
      residents: [{ GEOGRAPHY_CODE: 'E01', C2021_RESTYPE_3_NAME: 'Total: All usual residents', OBS_VALUE: '230' }],
      travel: [
        { GEOGRAPHY_CODE: 'E01', C2021_TTWMETH_12_NAME: 'Total: All usual residents aged 16 years and over in employment', OBS_VALUE: '50' },
        { GEOGRAPHY_CODE: 'E01', C2021_TTWMETH_12_NAME: 'Driving a car or van', OBS_VALUE: '30' },
        { GEOGRAPHY_CODE: 'E01', C2021_TTWMETH_12_NAME: 'Bicycle', OBS_VALUE: '5' },
        { GEOGRAPHY_CODE: 'E01', C2021_TTWMETH_12_NAME: 'Work mainly at or from home', OBS_VALUE: '10' },
      ],
    },
  );
  town.homes[0].b = 'apartments';
  attachCensus(town, areas);
  const total = town.homes.reduce((t, h) => t + h.w, 0);
  assert.ok(Math.abs(total - 100) < 1e-9, `households should sum to the census: ${total}`);
  assert.ok(town.homes[0].w > town.homes[1].w, 'a block of flats holds more households than a house');
  assert.equal(analyseAccess(town, { cellM: 2000 }).summary.homes, 100);
  const props = areasToGeoJson(areas).features[0].properties;
  assert.equal(props.carPct, 75); // 30 of the 40 who travel
  assert.equal(props.homePct, 20);
});

test('need score ranks areas and steers site search toward need', async () => {
  const { attachNeed } = await import('./census.js');
  const areas = [
    { households: 10, badHealth: 0.1, over65: 0.3, deprived: 0.4, noCar: 0.5 },
    { households: 10, badHealth: 0.02, over65: 0.1, deprived: 0.05, noCar: 0.05 },
    { households: 10, badHealth: null, over65: 0.2, deprived: 0.2, noCar: 0.2 },
  ];
  attachNeed(areas);
  assert.equal(areas[0].need, 1);
  assert.equal(areas[1].need, 0);
  assert.equal(areas[2].need, null);
  // Same street as the site test: unserved homes at both ends; need sits in the west.
  const nodes = [...Array(81).keys()];
  const pt = (i) => [i * 0.0012, 52];
  const town = {
    roads: [{ id: 'st', kind: 'local', walk: true, nodes, coords: nodes.map(pt) }],
    places: [{ id: 's', kind: 'gp', lon: pt(40)[0], lat: 52 }],
    homes: nodes.map((i) => ({ id: `h${i}`, lon: pt(i)[0], lat: 52.0001, w: i > 40 ? 2 : 1, need: i < 40 ? 1 : 0.1 })),
  };
  const [plain] = suggestSites(town, { kind: 'gp', count: 1 });
  const [needy] = suggestSites(town, { kind: 'gp', count: 1, byNeed: true });
  assert.ok(plain.lon > pt(40)[0], 'by headcount, the denser east end wins');
  assert.ok(needy.lon < pt(40)[0], 'by need, the west end wins');
  assert.ok(needy.needGained > 0);
});

test('river: crossings, banks, services across the water, and a new footbridge', async () => {
  const { findCrossings, riverReport, bestNewCrossing } = await import('./river.js');
  // Two north-south streets 300 m apart, a river between, one bridge at the north end.
  const step = 0.0009;
  const west = [...Array(11).keys()].map((i) => [0, 52 + i * step]);
  const east = west.map(([, lat]) => [0.0044, lat]);
  const town = {
    roads: [
      { id: 'w', kind: 'local', walk: true, drive: true, name: 'West St', nodes: west.map((_, i) => i), coords: west },
      { id: 'e', kind: 'local', walk: true, drive: true, name: 'East St', nodes: east.map((_, i) => 100 + i), coords: east },
      { id: 'b', kind: 'local', walk: true, drive: true, name: 'Old Bridge', nodes: [10, 110], coords: [west[10], east[10]] },
    ],
    rivers: [{ id: 'r', name: 'River Test', coords: [[0.0022, 51.99], [0.0022, 52.02]] }],
    places: [{ id: 'gp', kind: 'gp', lon: east[0][0], lat: east[0][1] }],
    homes: west.map(([lon, lat], i) => ({ id: `h${i}`, lon: lon + 0.0001, lat })),
  };
  const { crossings } = findCrossings(town, { river: 'River Test' });
  assert.deepEqual(crossings.map((c) => [c.name, c.walk, c.drive]), [['Old Bridge', true, true]]);
  const report = riverReport(town, { river: 'River Test' });
  assert.equal(report.banks.west.households, 11);
  assert.equal(report.banks.west.services.gp.nearestAcrossRiver, 1);
  const fb = bestNewCrossing(town, { river: 'River Test', minGapM: 300, maxSpanM: 400, cellM: 2000 });
  assert.ok(fb, 'a footbridge should be found');
  assert.ok(fb.from[1] < west[6][1], `the bridge should be toward the south, near the GP: ${fb.from}`);
  assert.ok(fb.minutesSavedPerHousehold > 0);
});

test('buses: frequency per stop, and bus-or-walk beats walking for far homes', async () => {
  const { stopFrequency, busOrWalk } = await import('./buses.js');
  // A 4 km straight street; GP at the east end; a bus every 15 min from west to east.
  const nodes = [...Array(51).keys()];
  const pt = (i) => [i * 0.0012, 52];
  const town = {
    roads: [{ id: 'st', kind: 'local', walk: true, nodes, coords: nodes.map(pt) }],
    places: [{ id: 'gp', kind: 'gp', lon: pt(50)[0], lat: 52 }],
    homes: [{ id: 'far', lon: pt(1)[0], lat: 52.0001 }, { id: 'near', lon: pt(49)[0], lat: 52.0001 }],
  };
  const buses = {
    stops: [{ id: 'a', name: 'West', lon: pt(0)[0], lat: 52 }, { id: 'b', name: 'East', lon: pt(50)[0], lat: 52 }],
    trips: [...Array(48).keys()].map((k) => ({ route: '1', calls: [[0, 420 + k * 15], [1, 420 + k * 15 + 10]] })),
  };
  assert.deepEqual(stopFrequency(buses), [4, 0]);
  const { walk, best } = busOrWalk(town, buses, 'gp');
  assert.ok(walk[0] > 45, `far home walks ~50 min: ${walk[0]}`);
  assert.ok(best[0] < 25, `bus: ~1 min walk + 7.5 wait + 10 ride: ${best[0]}`);
  assert.equal(best[1], walk[1], 'near home just walks');
});
