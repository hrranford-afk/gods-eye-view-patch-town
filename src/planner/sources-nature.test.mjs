import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaAt, distToPath, greenspaceRows, habitatHectares, homeShareByArea, incomeBand, inRing, nearAny, nearSite, pointGrid, representativePoint, ringCentre, toMetres } from '../../scripts/sources/nature.mjs';

const square = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]];

test('ring centre and point-in-ring', () => {
  assert.deepEqual(ringCentre(square).map((v) => Math.round(v * 100) / 100), [0.5, 0.5]);
  assert.ok(inRing(square, [0.5, 0.5]));
  assert.ok(!inRing(square, [1.5, 0.5]));
});

test('representative point stays inside a C-shaped ring', () => {
  const c = [[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [3, 2], [3, 3], [0, 3], [0, 0]];
  assert.ok(inRing(c, representativePoint([c])));
});

test('distance to a path', () => {
  assert.equal(distToPath([5, 3], [[0, 0], [10, 0]]), 3);
  assert.equal(distToPath([-4, 3], [[0, 0], [10, 0]]), 5);
});

test('300 m proximity grid', () => {
  const grid = pointGrid([[100, 100]], 300);
  assert.ok(nearAny(grid, 350, 100, 300));
  assert.ok(!nearAny(grid, 500, 100, 300));
});

test('weighted home shares per area', () => {
  const homes = [{ area: 'A', w: 3, near: true }, { area: 'A', w: 1, near: false }, { area: 'B', w: 1, near: false }, { lon: 0 }];
  assert.deepEqual(homeShareByArea(homes, (h) => h.near), { A: 0.75, B: 0 });
});

test('a home near a site boundary counts; far one does not', () => {
  const lat0 = 52;
  const site = { rings: [square.map(([x, y]) => [x * 0.01 - 2, 52 + y * 0.01])], box: [-2, 52, -1.99, 52.01] };
  assert.ok(nearSite({ lon: -2.0005, lat: 52.005 }, [site], 100, lat0));
  assert.ok(!nearSite({ lon: -2.01, lat: 52.005 }, [site], 100, lat0));
  assert.ok(nearSite({ lon: -1.995, lat: 52.005 }, [site], 100, lat0));
  assert.ok(toMetres(1, 0, 52)[0] < toMetres(1, 0, 0)[0]);
});

test('habitat hectares add up by main habitat', () => {
  const f = (h, ha) => ({ attributes: { MainHabs: h, AreaHa: ha } });
  assert.deepEqual(habitatHectares([f('Deciduous woodland', 1.25), f('Deciduous woodland', 2), f('Ponds', 0.1)]), { 'Deciduous woodland': 3.3, Ponds: 0.1 });
});

test('charity income bands', () => {
  assert.deepEqual([null, 500, 10000, 99999, 100000, 2e6].map(incomeBand), ['unknown', 'under10k', 'from10kTo100k', 'from10kTo100k', 'from100kTo1m', 'over1m']);
});

test('area lookup by polygon', () => {
  const areas = [{ code: 'X', geometry: { type: 'Polygon', coordinates: [square] } }, { code: 'Y' }];
  assert.equal(areaAt(areas, [0.5, 0.5]), 'X');
  assert.equal(areaAt(areas, [2, 2]), null);
});

test('greenspace rows become places with lon/lat', () => {
  const [p] = greenspaceRows([['id1', 'Pedestrian', 385000, 255000, 'site1', 'Public Park Or Garden', 'Cripplegate Park']]);
  assert.equal(p.kind, 'greenspace:access');
  assert.equal(p.function, 'Public Park Or Garden');
  assert.ok(p.lat > 52 && p.lat < 52.4 && p.lon > -2.4 && p.lon < -2);
});
