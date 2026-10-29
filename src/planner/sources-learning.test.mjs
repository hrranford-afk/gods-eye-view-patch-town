import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dfeNumber, dfeSeries, lastTwo, reportCardScore, oeifScore, yearOf, schoolGrades, csvBelowTitle, childcareGroup, stationKey, yearColumns, cellNumber } from '../../scripts/sources/learning.mjs';

test('dfeNumber treats suppression codes as missing', () => {
  assert.equal(dfeNumber('65'), 65);
  assert.equal(dfeNumber('46.2'), 46.2);
  for (const v of ['c', 'x', 'z', '', undefined]) assert.equal(dfeNumber(v), null);
});

test('dfeSeries picks one place, one filter set and one indicator', () => {
  const row = (level, lad, w3, period, v) => ({ geographicLevel: level, locations: { LAD: lad }, filters: { W3k2b: w3 }, timePeriod: { period }, values: { wGjbx: v } });
  const rows = [row('LAD', 'A', 'SUzVx', '2024/2025', '60'), row('LAD', 'A', 'SUzVx', '2025/2026', '63'), row('LAD', 'A', 'GJQgr', '2025/2026', '45'), row('LAD', 'B', 'SUzVx', '2025/2026', '70'), row('NAT', 'A', 'SUzVx', '2025/2026', '62'), row('LAD', 'A', 'SUzVx', '2023/2024', 'c')];
  assert.deepEqual(dfeSeries(rows, 'wGjbx', { level: 'LAD', id: 'A', filters: { W3k2b: 'SUzVx' } }), { '2024/2025': 60, '2025/2026': 63 });
  assert.deepEqual(dfeSeries(rows, 'wGjbx', { level: 'NAT', filters: { W3k2b: 'SUzVx' } }), { '2025/2026': 62 });
});

test('lastTwo gives the newest two periods with short labels', () => {
  assert.deepEqual(lastTwo({ '2023/2024': 1, '2025/2026': 3, '2024/2025': 2 }), [{ period: '2025/26', value: 3 }, { period: '2024/25', value: 2 }]);
  assert.deepEqual(lastTwo({}), []);
});

test('Ofsted scores', () => {
  assert.equal(reportCardScore('Strong standard'), 4);
  assert.equal(reportCardScore('Urgent improvement'), 1);
  assert.equal(reportCardScore('NULL'), null);
  assert.equal(oeifScore('2'), 2);
  assert.equal(oeifScore('9'), null);
  assert.equal(oeifScore('NULL'), null);
  assert.equal(yearOf('18/05/2023'), 2023);
  assert.equal(yearOf('NULL'), null);
});

test('schoolGrades reads old grades and report cards', () => {
  const g = schoolGrades({ 'Latest OEIF overall effectiveness': '2', 'Latest OEIF quality of education': '3', 'Publication date of latest OEIF graded inspection': '18/05/2023', Inclusion: 'Expected standard', 'Safeguarding standards': 'Met', 'Publication date': '10/02/2026', 'Most recent category of concern': 'NULL' });
  assert.equal(g.oeifOverall, 2);
  assert.equal(g.oeifEducation, 3);
  assert.equal(g.oeifYear, 2023);
  assert.equal(g.rcInclusion, 3);
  assert.equal(g.rcCurriculum, null);
  assert.equal(g.rcSafeguardingMet, 1);
  assert.equal(g.rcYear, 2026);
  assert.equal(g.concern, null);
  assert.equal(schoolGrades({ 'Most recent category of concern': 'SM' }).concern, 'SM');
});

test('csvBelowTitle drops title lines and BOM', () => {
  assert.equal(csvBelowTitle('﻿Title,,\nNote,,\nWeb link,Provider URN\nWeb link,EY1\n'), 'Web link,Provider URN\nWeb link,EY1\n');
  assert.equal(csvBelowTitle('Web link,URN\nx,1\n'), 'Web link,URN\nx,1\n');
});

test('childcareGroup separates premises from homes', () => {
  assert.equal(childcareGroup('Childcare on non-domestic premises'), 'premises');
  assert.equal(childcareGroup('Childminder'), 'home');
  assert.equal(childcareGroup('Home childcarer'), 'other');
});

test('station names match across ORR and NaPTAN', () => {
  assert.equal(stationKey('Worcester Foregate Street Rail Station'), stationKey('Worcester Foregate Street'));
  assert.equal(stationKey("St. Pancras  (Int'l)"), 'stpancrasint' + 'l');
});

test('yearColumns finds the latest and 2019 columns', () => {
  const h = ['Sort', 'Station name', 'Apr 2018 to Mar 2019', 'Apr 2019 to Mar 2020', 'Apr 2022 to Mar 2023 [b]', 'Apr 2024 to Mar 2025'];
  const y = yearColumns(h);
  assert.equal(y.latest, 2024);
  assert.equal(y.latestCol, 5);
  assert.equal(y.col(2019), 3);
  assert.equal(y.col(1999), undefined);
});

test('cellNumber reads numbers and ignores markers', () => {
  assert.equal(cellNumber(12), 12);
  assert.equal(cellNumber('1,234'), 1234);
  assert.equal(cellNumber('[x]'), null);
  assert.equal(cellNumber(null), null);
});
