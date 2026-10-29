import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeOverpass, overpassQueries, parseOverpass, roadKind } from './osm.js';
import { buildWalkGraph, metresBetween, nearestFrom } from './graph.js';
import { analyseAccess, cellsToGeoJson } from './access.js';
import { getTown } from './towns.js';
import { relate } from './tools.js';
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

test('scenarios: apply changes, score against the base, and score added homes', async () => {
  const { applyScenario, compareScenarios } = await import('./scenarios.js');
  const town = gridTown();
  town.places.push({ id: 'gp0', kind: 'gp', lon: at(4, 4)[0], lat: at(4, 4)[1] });
  const hub = { id: 'hub', name: 'Hub', changes: { addPlaces: [{ kind: 'gp', name: 'Hub', lon: at(0, 0)[0], lat: at(0, 0)[1] }] } };
  const homes = { id: 'homes', name: 'Homes', changes: { addHomes: [{ name: 'New', lon: at(0, 0)[0], lat: at(0, 0)[1], households: 50 }] } };
  const applied = applyScenario(town, homes);
  assert.equal(applied.homes.length, town.homes.length + 1);
  assert.equal(town.homes.length, 25, 'the base town is not modified');
  const { base, scenarios } = compareScenarios(town, [hub, homes]);
  assert.equal(base.households, 25);
  const [h, n] = scenarios;
  assert.ok(h.change.gpWalkMinutes < 0, 'a second GP shortens the average walk');
  assert.ok(h.gains.gp.households > 0 && h.gains.gp.averageMinutesSaved >= 1, 'gains name who is helped');
  assert.equal(n.card.households, 75);
  assert.equal(n.card.added.households, 50);
  assert.ok(n.card.added.gp.walkMinutes > 3, 'new homes far from the only GP');
});

test('tools: a plan chains travel, summarise, relate and rank on one model', async () => {
  const { buildModel } = await import('./model.js');
  const { runPlan, TOOLS } = await import('./tools.js');
  const town = gridTown();
  town.places.push({ id: 'g', kind: 'gp', lon: at(0, 0)[0], lat: at(0, 0)[1] });
  const square = (x0, y0, x1, y1) => ({ type: 'Polygon', coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] });
  const [w, s] = at(0, 0);
  const [e, n] = at(4, 4);
  const mid = (s + n) / 2;
  const mk = (code, y0, y1, noCar) => ({ code, name: `Grid ${code}`, households: 50, geometry: square(w - 0.001, y0, e + 0.001, y1), badHealth: 0.05, over65: 0.2, deprived: noCar / 2, noCar });
  // Three areas by latitude: south (near the GP) has the most car-less households.
  const third = (n - s) / 3;
  const census = { areas: [mk('A', s - 0.001, s + third, 0.5), mk('B', s + third, s + 2 * third, 0.3), mk('C', s + 2 * third, n + 0.001, 0.1)] };
  const model = buildModel({ town, census });
  assert.ok(model.kinds().gp >= 1);
  const out = runPlan(model, [
    { tool: 'travel', args: { to: 'gp' }, as: 'gp' },
    { tool: 'summarise', args: { values: '$gp', groupBy: 'area' }, as: 'gpByArea' },
    { tool: 'summarise', args: { values: '$gp', weight: 'noCar' }, as: 'carless' },
    { tool: 'summarise', args: { values: '$gp', stat: 'shareWithin', within: 3 }, as: 'within3' },
    { tool: 'rank', args: { of: '$gpByArea', top: 1 }, as: 'furthest' },
  ]);
  assert.equal(out.gp.length, model.homes.length);
  assert.equal(out.furthest[0].group, 'C', 'the north area is furthest from the GP');
  assert.ok(out.carless.value.grid < runPlan(model, [{ tool: 'travel', args: { to: 'gp' }, as: 'g' }, { tool: 'summarise', args: { values: '$g' }, as: 'all' }]).all.value.grid, 'car-less households, weighted, are nearer');
  assert.ok(out.within3.value.grid > 0 && out.within3.value.grid < 1);
  assert.throws(() => runPlan(model, [{ tool: 'nope' }]), /unknown tool/);
  assert.throws(() => runPlan(model, [{ tool: 'summarise', args: { values: '$missing' } }]), /before it exists/);
  assert.ok(Object.values(TOOLS).every((t) => typeof t.fn === 'function' && t.about));
  // relate recovers a planted linear relationship.
  const y = { value: { a: 1, b: 3, c: 5, d: 7.1, e: 8.9 } };
  const x = { value: { a: 0, b: 1, c: 2, d: 3, e: 4 } };
  const r = relate(model, { y, x: { x } });
  assert.ok(Math.abs(r.predictors.x.coefficient - 2) < 0.1 && r.r2 > 0.99);
});

test('history: new homes per area and era, Census 2011 beside 2021, and the average tool', async () => {
  const { growthByArea, census2011ByArea, attachHistory } = await import('./history.js');
  const { average } = await import('./tools.js');
  const square = (x0, y0, x1, y1) => ({ type: 'Polygon', coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] });
  const areas = [
    { code: 'A', name: 'Town 001A', households: 100, residents: 230, geometry: square(0, 0, 1, 1), travel: { car: 30, bus: 5, rail: 0, cycle: 5, walk: 10, home: 10, other: 0, total: 60 } },
    { code: 'B', name: 'Town 001B', households: 300, residents: 700, geometry: square(1, 0, 2, 1), travel: { car: 60, bus: 10, rail: 0, cycle: 10, walk: 20, home: 20, other: 0, total: 120 } },
  ];
  const growth = growthByArea(areas, [
    { year: 1996, lon: 0.5, lat: 0.5 }, { year: 2016, lon: 0.5, lat: 0.5 }, { year: 2020, lon: 1.5, lat: 0.5 }, { year: 2020, lon: 9, lat: 9 },
  ]);
  assert.equal(growth.A.newHomes, 2);
  assert.equal(growth.A.byEra['1995-2004'], 1);
  assert.equal(growth.B.meanYear, 2020);
  const then = census2011ByArea({
    travel: [
      { GEOGRAPHY_CODE: 'A', CELL_NAME: 'All categories: Method of travel to work', OBS_VALUE: '90' },
      { GEOGRAPHY_CODE: 'A', CELL_NAME: 'Not in employment', OBS_VALUE: '30' },
      { GEOGRAPHY_CODE: 'A', CELL_NAME: 'Work mainly at or from home', OBS_VALUE: '10' },
      { GEOGRAPHY_CODE: 'A', CELL_NAME: 'Driving a car or van', OBS_VALUE: '25' },
      { GEOGRAPHY_CODE: 'A', CELL_NAME: 'Bicycle', OBS_VALUE: '25' },
    ],
    cars: [{ GEOGRAPHY_CODE: 'A', CELL_NAME: 'All categories: Car or van availability', OBS_VALUE: '100' }, { GEOGRAPHY_CODE: 'A', CELL_NAME: 'No cars or vans in household', OBS_VALUE: '25' }],
  });
  attachHistory(areas, { growth, then });
  assert.equal(areas[0].newHomesShare, 0.02);
  assert.equal(areas[0].carCommute2011, 0.5); // 25 of the 50 who travel
  assert.equal(areas[0].carCommute2021, 0.6); // 30 of 50
  assert.equal(areas[0].noCar2011, 0.25);
  const model = { areas };
  assert.equal(average(model, { of: { value: { A: 1, B: 0 } } }).value, 0.25, 'weighted by households');
  assert.equal(average(model, { of: { value: { A: 1, B: 0 } }, namePrefix: 'Town 001A' }).value, 1);
});

test('good day: meets checks every item per home, flood zones tag homes, parks reachable from their edge', async () => {
  const { buildModel } = await import('./model.js');
  const { runPlan } = await import('./tools.js');
  const town = gridTown();
  town.places.push({ id: 'm', kind: 'meet:cafe', lon: at(0, 0)[0], lat: at(0, 0)[1] });
  const square = (x0, y0, x1, y1) => ({ type: 'Polygon', coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] });
  // A flood zone covering the south-west corner home only.
  const [lon0, lat0] = at(0, 0);
  const flood = { features: [{ properties: { flood_zone: 'FZ3' }, geometry: square(lon0 - 0.0005, lat0 - 0.0005, lon0 + 0.0005, lat0 + 0.0005) }] };
  const model = buildModel({ town, flood });
  const out = runPlan(model, [
    { tool: 'travel', args: { to: 'meet:*' }, as: 'meet' },
    { tool: 'travel', args: { to: 'shop' }, as: 'shop' },
    { tool: 'meets', args: { checks: [{ values: '$meet', max: 3 }, { values: '$shop', max: 3 }] }, as: 'both' },
    { tool: 'summarise', args: { values: '$both' }, as: 'share' },
    { tool: 'floodZone', args: {}, as: 'fz' },
  ]);
  // The cafe is south-west, the shop north-east: few homes have both within 3 minutes.
  assert.ok(out.share.value.grid < 0.5, `share with both: ${out.share.value.grid}`);
  assert.ok(out.both.every((v) => v === 0 || v === 1));
  assert.equal(out.fz.filter((z) => z === 3).length, 1, 'only the corner home is in Flood Zone 3');
  const { parseOverpass } = await import('./osm.js');
  const park = parseOverpass({ elements: [{ type: 'way', id: 9, tags: { leisure: 'park', name: 'Gheluvelt Park' }, geometry: [
    { lat: 52.2, lon: -2.22 }, { lat: 52.2, lon: -2.215 }, { lat: 52.203, lon: -2.215 }, { lat: 52.203, lon: -2.22 }, { lat: 52.2, lon: -2.22 },
  ] }] }, 'test');
  assert.ok(park.places.length >= 4 && park.places.every((p) => p.kind === 'green:park'), 'a park is reachable from several edge points');
  assert.equal(parseOverpass({ elements: [{ type: 'way', id: 8, tags: { leisure: 'park', access: 'private' }, geometry: [{ lat: 52, lon: -2 }, { lat: 52.001, lon: -2 }] }] }, 't').places.length, 0);
});

test('atlas: every layer has a compass theme and reports mapped or missing', async () => {
  const { LAYERS, COMPASS, atlasStatus } = await import('./atlas.js');
  const themes = new Set(COMPASS.map(([id]) => id));
  assert.ok(LAYERS.every((l) => themes.has(l.theme) && l.name && l.source), 'every layer is on the compass');
  assert.equal(new Set(LAYERS.map((l) => l.id)).size, LAYERS.length, 'layer ids are unique');
  const status = atlasStatus({ has: (f) => f === 'census.json', kinds: { 'meet:pub': 3, school: 0 }, info: () => ({ date: '2026-10-29', count: 78 }) });
  const by = Object.fromEntries(status.map((s) => [s.id, s]));
  assert.equal(by.census.status, 'mapped');
  assert.equal(by.census.count, 78);
  assert.equal(by.meet.status, 'mapped');
  assert.equal(by.meet.count, 3);
  assert.equal(by.schools.status, 'missing', 'zero places of a kind is not mapped');
  assert.equal(by.flood.status, 'missing');
});

test('layers: deprivation, crime per neighbourhood, collisions, schools and prices parse into area figures', async () => {
  const { deprivationByArea, crimeByArea, collisionsIn, schoolsFrom, pricesByArea, attachLayers } = await import('./layers.js');
  const square = (x0, y0, x1, y1) => ({ type: 'Polygon', coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] });
  const areas = [{ code: 'A', residents: 2000, geometry: square(0, 0, 1, 1) }, { code: 'B', residents: 1000, geometry: square(1, 0, 2, 1) }];
  const dep = deprivationByArea([
    { 'LSOA code (2021)': 'A', 'Index of Multiple Deprivation (IMD) Score': '30.5', 'Index of Multiple Deprivation (IMD) Decile (where 1 is most deprived 10% of LSOAs)': '2', 'Income Score (rate)': '0.2' },
    { 'LSOA code (2021)': 'Z', 'Index of Multiple Deprivation (IMD) Score': '5' },
  ], ['A', 'B']);
  assert.deepEqual(Object.keys(dep), ['A']);
  assert.equal(dep.A.imdDecile, 2);
  const crime = crimeByArea([
    { category: 'burglary', location: { longitude: '0.5', latitude: '0.5' } },
    { category: 'violent-crime', location: { longitude: '0.5', latitude: '0.5' } },
    { category: 'violent-crime', location: { longitude: '9', latitude: '9' } },
  ], areas);
  assert.equal(crime.A.total, 2);
  assert.equal(crime.B, undefined);
  const col = collisionsIn([{ collision_year: '2024', collision_severity: '2', latitude: '0.5', longitude: '0.5', number_of_casualties: '1' }, { latitude: '5', longitude: '5' }], [0, 0, 1, 1]);
  assert.deepEqual(col.map((c) => c.severity), ['serious']);
  const sch = schoolsFrom([{ 'LA (name)': 'Shire', 'EstablishmentStatus (name)': 'Open', URN: '1', EstablishmentName: 'X', 'PhaseOfEducation (name)': 'Primary', SchoolCapacity: '210', NumberOfPupils: '230' }, { 'LA (name)': 'Shire', 'EstablishmentStatus (name)': 'Closed' }], { la: 'Shire' });
  assert.equal(sch.length, 1);
  assert.equal(sch[0].pupils, 230);
  const prices = pricesByArea([
    { year: 2015, price: 100, lon: 0.5, lat: 0.5 }, { year: 2015, price: 200, lon: 0.5, lat: 0.5 },
    { year: 2025, price: 300, lon: 0.5, lat: 0.5 },
  ], areas, { span: 1 });
  assert.equal(prices.byArea.A.medianPriceEarly, 150);
  assert.equal(prices.byArea.A.priceChange, 1);
  attachLayers(areas, { deprivation: { byArea: dep }, crime: { byArea: crime }, prices });
  assert.equal(areas[0].imdScore, 30.5);
  assert.equal(areas[0].crimePer1000, 1);
  assert.equal(areas[0].violencePer1000, 0.5);
  assert.equal(areas[1].crimePer1000, 0, 'an area with no recorded crime counts zero, not missing');
  assert.equal(areas[0].medianPrice, 300);
});

test('more layers: cycle provision, pharmacies, jobs, income and wards, and grouping by ward', async () => {
  const { cycleKind, parseOverpass } = await import('./osm.js');
  assert.equal(cycleKind({ highway: 'cycleway' }), 'track');
  assert.equal(cycleKind({ highway: 'path', bicycle: 'designated' }), 'track');
  assert.equal(cycleKind({ highway: 'primary', 'cycleway:left': 'lane' }), 'lane');
  assert.equal(cycleKind({ highway: 'residential' }), null);
  const t = parseOverpass({ elements: [
    { type: 'node', id: 1, lat: 52, lon: -2, tags: { amenity: 'pharmacy', name: 'Boots' } },
    { type: 'node', id: 2, lat: 52, lon: -2, tags: { amenity: 'bicycle_parking' } },
  ] }, 't');
  assert.deepEqual(t.places.map((p) => p.kind), ['health:pharmacy', 'cycle:parking']);
  const { attachLayers } = await import('./layers.js');
  const areas = [{ code: 'A', residents: 1000 }];
  attachLayers(areas, { jobs: { byArea: { A: { jobs: 500 } } }, income: { byArea: { A: { incomeTotal: 40000, incomeAfterHousing: 28000 } } }, wards: { byArea: { A: { ward: 'Cathedral', wardCode: 'E05' } } } });
  assert.equal(areas[0].jobsPerResident, 0.5);
  assert.equal(areas[0].incomeAfterHousing, 28000);
  assert.equal(areas[0].ward, 'Cathedral');
  const { buildModel } = await import('./model.js');
  const { runPlan } = await import('./tools.js');
  const town = gridTown();
  const square = (x0, y0, x1, y1) => ({ type: 'Polygon', coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] });
  const [w0, s0] = at(0, 0);
  const [e0, n0] = at(4, 4);
  const model = buildModel({
    town,
    census: { areas: [{ code: 'A', name: 'Grid 001A', households: 25, residents: 60, geometry: square(w0 - 0.001, s0 - 0.001, e0 + 0.001, n0 + 0.001) }] },
    wards: { byArea: { A: { ward: 'Grid Ward', wardCode: 'W1' } } },
  });
  const out = runPlan(model, [{ tool: 'travel', args: { to: 'shop' }, as: 's' }, { tool: 'summarise', args: { values: '$s', groupBy: 'ward' }, as: 'byWard' }]);
  assert.deepEqual(Object.keys(out.byWard.value), ['Grid Ward']);
});

test('survey: finds a planted link across families and flags the area that breaks the pattern', async () => {
  const { survey } = await import('./tools.js');
  const areas = Array.from({ length: 20 }, (_, i) => ({ code: `A${i}`, name: `Town ${i}`, imdScore: i, badHealth: 0.02 + i * 0.002, livingAlone66: 0.1 }));
  areas[7].livingAlone66 = 0.4; // a loneliness hotspot nothing else predicts
  const model = { areas };
  const out = survey(model, { fields: ['imdScore', 'badHealth', 'livingAlone66'], surprisesFor: ['livingAlone66'] });
  assert.equal(out.areas, 20);
  assert.ok(out.links.some((l) => [l.a, l.b].includes('badHealth') && [l.a, l.b].includes('imdScore') && l.r > 0.99));
  assert.equal(out.surprises[0].area, 'A7');
  assert.ok(out.surprises[0].z > 2);
});
