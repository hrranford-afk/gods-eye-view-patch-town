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
