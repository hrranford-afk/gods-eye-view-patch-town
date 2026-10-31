import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaFinder, ballotWinners, classifyReport, countReports, currentWards, fetchJsonRetry, latestMonths, partyKey, sittingCouncillors, summariseWorks, turnoutPct, workCategory } from '../../scripts/sources/voice.mjs';

test('partyKey groups parties', () => {
  assert.equal(partyKey('Labour and Co-operative Party'), 'Labour');
  assert.equal(partyKey('Conservative and Unionist Party'), 'Conservative');
  assert.equal(partyKey('Liberal Democrats'), 'LibDem');
  assert.equal(partyKey('Reform UK'), 'Reform');
  assert.equal(partyKey('Worcester Independents'), 'Independent');
  assert.equal(partyKey('Something Else'), 'Other');
});

test('turnoutPct uses the percentage, else votes over electorate', () => {
  assert.equal(turnoutPct({ turnout_percentage: '37.00' }), 37);
  assert.equal(turnoutPct({ turnout_percentage: null, num_turnout_reported: 1761, total_electorate: 4798 }), 36.7);
  assert.equal(turnoutPct({ turnout_percentage: null, num_turnout_reported: null }), null);
  assert.equal(turnoutPct(null), null);
});

const cand = (name, party, elected, votes) => ({ person: { name }, party_name: party, elected, result: { elected, num_ballots: votes } });

test('ballotWinners lists elected candidates, most votes first', () => {
  const w = ballotWinners({ candidacies: [cand('A', 'Green Party', true, 10), cand('B', 'Labour Party', false, 50), cand('C', 'Labour Party', true, 30)] });
  assert.deepEqual(w.map((x) => x.name), ['C', 'A']);
});

test('currentWards keeps regular, held ballots on the newest boundaries, newest first', () => {
  const b = (id, date, gss, set = '2024-05-02') => ({ id, date, gss, name: gss, seats: 2, set });
  const wards = currentWards([
    b('local.x.a.2023-05-04', '2023-05-04', 'E1', '2004-12-02'),
    b('local.x.a.2024-05-02', '2024-05-02', 'E2'),
    b('local.x.a.2026-05-07', '2026-05-07', 'E2'),
    b('local.x.a.by.2025-01-01', '2025-01-01', 'E2'),
    b('local.x.a.2028-05-04', '2028-05-04', 'E2'),
  ], '2026-10-29');
  assert.deepEqual([...wards.keys()], ['E2']);
  assert.deepEqual(wards.get('E2').ballots.map((x) => x.date), ['2026-05-07', '2024-05-02']);
});

test('sittingCouncillors takes newest winners up to the seat count', () => {
  const d = (date, ...names) => ({ date, ballot: { candidacies: names.map((n, i) => cand(n, 'Labour Party', true, 100 - i)) } });
  const out = sittingCouncillors([d('2026-05-07', 'New'), d('2024-05-02', 'Old1', 'Old2', 'Old3')], 3);
  assert.deepEqual(out.map((c) => c.name), ['New', 'Old1', 'Old2']);
});

test('classifyReport groups FixMyStreet categories', () => {
  assert.equal(classifyReport('Potholes'), 'Potholes');
  assert.equal(classifyReport('Flytipping'), 'FlyTipping');
  assert.equal(classifyReport('Rubbish (refuse and recycling)'), 'FlyTipping');
  assert.equal(classifyReport('Street lighting'), 'StreetLighting');
  assert.equal(classifyReport('Dog fouling'), 'DogFouling');
  assert.equal(classifyReport('Graffiti'), 'Graffiti');
  assert.equal(classifyReport('Car parking'), 'Vehicles');
  assert.equal(classifyReport('Pavements/footpaths'), 'RoadsPaths');
  assert.equal(classifyReport('Trees'), 'Other');
});

const square = { type: 'FeatureCollection', features: [{ properties: { code: 'E01A' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] } }] };

test('areaFinder locates points in polygons', () => {
  const at = areaFinder(square);
  assert.equal(at(0.5, 0.5), 'E01A');
  assert.equal(at(2, 2), null);
});

test('countReports counts by group inside the box and keeps no text', () => {
  const rows = [
    { lat: '0.5', long: '0.5', service_name: 'Potholes', title: 'ignored' },
    { lat: '0.6', long: '0.4', service_name: 'Potholes' },
    { lat: '0.2', long: '0.2', service_name: 'Graffiti' },
    { lat: '5', long: '5', service_name: 'Potholes' },
  ];
  const { byArea, total } = countReports(rows, [0, 0, 1, 1], areaFinder(square));
  assert.deepEqual(byArea, { E01A: { fmsPotholes: 2, fmsTotal: 3, fmsGraffiti: 1 } });
  assert.deepEqual(total, { Potholes: 2, Graffiti: 1 });
});

test('workCategory and latestMonths', () => {
  assert.equal(workCategory('immediate_urgent'), 'immediate');
  assert.equal(workCategory('major'), 'major');
  assert.equal(workCategory('hs2_x'), 'other');
  assert.deepEqual(latestMonths(['permit/2025/12.zip', 'permit/2026/02.zip', 'permit/2026/01.zip', 'permit/2026/'], 2), ['permit/2026/01.zip', 'permit/2026/02.zip']);
});

test('summariseWorks merges permits per work and clips days to the window', () => {
  const ev = [
    { work_reference_number: 'W1', permit_reference_number: 'W1-01', street_name: 'HIGH ST', work_category_ref: 'standard', proposed_start_date: '2026-09-01T00:00:00Z', proposed_end_date: '2026-09-03T00:00:00Z', at: '2026-08-30T00:00:00Z', x: 1, y: 2 },
    { work_reference_number: 'W1', permit_reference_number: 'W1-02', street_name: 'HIGH ST', work_category_ref: 'major', proposed_start_date: '2026-09-01T00:00:00Z', proposed_end_date: '2026-09-11T00:00:00Z', actual_start_date_time: '2026-09-02T00:00:00Z', at: '2026-09-02T00:00:00Z', x: 1, y: 2 },
    { work_reference_number: 'W2', permit_reference_number: 'W2-01', street_name: 'LOW RD', work_category_ref: 'minor', proposed_start_date: '2026-08-25T00:00:00Z', proposed_end_date: '2026-09-10T00:00:00Z', at: '2026-09-01T00:00:00Z', x: 3, y: 4 },
    { work_reference_number: 'W3', permit_reference_number: 'W3-01', proposed_start_date: null },
  ];
  const out = summariseWorks(ev, '2026-09-01', '2026-09-30');
  const w1 = out.find((w) => w.ref === 'W1'), w2 = out.find((w) => w.ref === 'W2');
  assert.equal(out.length, 2);
  assert.equal(w1.category, 'major');
  assert.equal(w1.days, 10);
  assert.equal(w2.days, 9);
});

test('currentWards keeps same-code ballots from an older boundary set as a turnout fallback only', () => {
  const b = (id, date, gss, set) => ({ id, date, gss, name: gss, seats: 2, set });
  const wards = currentWards([
    b('local.g.a.2021-05-06', '2021-05-06', 'E1', '2016-04-13'),
    b('local.g.a.2024-05-02', '2024-05-02', 'E1', '2024-05-02'),
    b('local.g.a.by.2022-01-01', '2022-01-01', 'E1', '2016-04-13'),
    b('local.g.gone.2021-05-06', '2021-05-06', 'E9', '2016-04-13'),
  ], '2026-10-29');
  assert.deepEqual([...wards.keys()], ['E1']);
  assert.deepEqual(wards.get('E1').ballots.map((x) => x.date), ['2024-05-02']);
  assert.deepEqual(wards.get('E1').older.map((x) => x.date), ['2021-05-06']);
});

test('fetchJsonRetry retries network errors and 5xx, not 4xx', async () => {
  const waits = [];
  let n = 0;
  const flaky = async () => { if (++n < 3) throw new TypeError('fetch failed'); return { ok: true, json: async () => ({ service_requests: [1] }) }; };
  assert.deepEqual(await fetchJsonRetry('u', { fetchFn: flaky, wait: async (ms) => waits.push(ms), delay: 10 }), { service_requests: [1] });
  assert.deepEqual(waits, [20, 40]);
  const gone = async () => ({ ok: false, status: 404 });
  await assert.rejects(fetchJsonRetry('u', { fetchFn: gone, wait: async () => {} }), /404/);
  const down = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(fetchJsonRetry('u', { fetchFn: down, wait: async () => {}, tries: 2 }), /fetch failed/);
});
