import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detailedTables, findColumns, tableByCode, metres, shareWithin, parseLatLng, foodbankPlaces, itemsNeeded, latestRentsFile, latestRents } from '../../scripts/sources/security.mjs';

test('detailedTables picks the detailed local authority attachment', () => {
  const content = { details: { attachments: [
    { title: 'Multiple Disadvantage Data: January to March 2026', url: 'https://x/MDIS.ods' },
    { title: 'Detailed local authority level tables: January to March 2026', url: 'https://x/Detailed.ods' },
  ] } };
  assert.deepEqual(detailedTables(content), { url: 'https://x/Detailed.ods', period: 'January to March 2026' });
  assert.equal(detailedTables({ details: { attachments: [] } }), null);
});

test('findColumns collapses whitespace in headers', () => {
  assert.deepEqual(findColumns(['Code', 'Owed a duty \n\nTotal'], { owed: /Owed a duty Total/, none: /zzz/ }), { owed: 1, none: -1 });
});

test('tableByCode reads rows by area code and nulls suppressed cells', () => {
  const rows = [['title'], ['Organisation Identification Code', 'Area Name', 'Children in TA\n\nTotal'], ['E92000001', 'ENGLAND', 100], ['E07000237', 'Worcester', '[c]'], ['[z]', 'Rest', 5]];
  assert.deepEqual(tableByCode(rows, { children: /^Children in TA Total/ }), { E92000001: { children: 100 }, E07000237: { children: null } });
});

test('metres is about 111 km per degree of latitude', () => {
  assert.ok(Math.abs(metres(-2, 52, -2, 53) - 111320) < 1);
});

test('shareWithin weights homes within the radius, per area', () => {
  const homes = [{ lon: -2.2, lat: 52.2, w: 3, area: 'A' }, { lon: -2.2, lat: 52.21, w: 1, area: 'A' }, { lon: -2.3, lat: 52.3, w: 2, area: 'B' }];
  assert.deepEqual(shareWithin(homes, [{ lon: -2.2, lat: 52.2 }], 500), { A: 0.75, B: 0 });
});

test('parseLatLng', () => {
  assert.deepEqual(parseLatLng('52.19,-2.22'), { lat: 52.19, lon: -2.22 });
  assert.equal(parseLatLng(''), null);
});

test('foodbankPlaces keeps open food banks and locations inside the padded bbox', () => {
  const fbs = [{ slug: 'a', name: 'A Foodbank', network: 'Trussell', lat_lng: '52.2,-2.2', closed: false }, { slug: 'b', name: 'B', network: 'IFAN', lat_lng: '52.2,-2.2', closed: true }, { slug: 'c', name: 'C', network: 'IFAN', lat_lng: '53,-2.2', closed: false }];
  const locs = [{ slug: 'x', name: 'Hall', lat_lng: '52.19,-2.21', foodbank: { slug: 'a', name: 'A Foodbank', network: 'Trussell' } }];
  const out = foodbankPlaces(fbs, locs, [52.1, -2.3, 52.3, -2.1]);
  assert.deepEqual(out.map((p) => p.id), ['givefood/a', 'givefood/a/x']);
  assert.equal(out[1].network, 'Trussell');
});

test('itemsNeeded counts non-empty lines', () => {
  assert.equal(itemsNeeded('Rice\nTea Bags\n\nJam'), 3);
  assert.equal(itemsNeeded(null), 0);
});

test('latestRentsFile takes the first (newest) spreadsheet link', () => {
  const html = '<a href="/file?uri=/a/priceindexofprivaterentsukmonthlypricestatistics/21october2026/priceindexofprivaterentsukmonthlypricestatistics.xlsx">x</a><a href="/file?uri=/a/priceindexofprivaterentsukmonthlypricestatistics/16september2026/priceindexofprivaterentsukmonthlypricestatistics.xlsx">y</a>';
  assert.match(latestRentsFile(html), /21october2026/);
  assert.equal(latestRentsFile('<a>none</a>'), null);
});

test('latestRents returns the last month with a price', () => {
  const head = ['Time period', 'Area code', 'Area name', 'Region or country name', 'Index', 'Monthly change', 'Annual change', 'Rental price', 'Rental price one bed', 'Rental price two bed', 'Rental price three bed', 'Rental price four or more bed'];
  const rows = [head, ['2026-08-01', 'E1', 'Town', 'Region', 1, 1, 5.55, 900, 600, 800, 1000, 1400], ['2026-09-01', 'E1', 'Town', 'Region', 1, 1, 6.14, 910, 610, 810, '[x]', 1410], ['2026-09-01', 'E2', 'Other', 'Region', 1, 1, 1, 1, 1, 1, 1, 1]];
  assert.deepEqual(latestRents(rows, 'E1'), { period: '2026-09', rent: 910, rent1Bed: 610, rent2Bed: 810, rent3Bed: null, rent4Bed: 1410, annualChange: 6.1, region: 'Region' });
  assert.equal(latestRents(rows, 'E9'), null);
});
