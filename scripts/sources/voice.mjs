/**
 * "Voice" sources: elections (Democracy Club), street problem reports
 * (FixMyStreet Open311) and roadworks (DfT Street Manager open data).
 * Loaded by `npm run planner -- stats <town> <id>`; see
 * scripts/planner-sources.mjs for the shape each source returns.
 */
import { spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { lonLatToEN, osgbToLonLat, round } from '../planner-sources.mjs';

const DAY = 86400000;
const today = () => new Date().toISOString().slice(0, 10);
const cacheDir = () => {
  const dir = path.join(process.cwd(), '.gev-cache', 'planner');
  mkdirSync(dir, { recursive: true });
  return dir;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const normName = (s) => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();

/** Which neighbourhood (LSOA) a point falls in: reads the town's areas.geojson polygons. */
export function areaFinder(geojson) {
  const polys = [];
  for (const f of geojson.features || []) {
    const g = f.geometry;
    const rings = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (const poly of rings) {
      const xs = poly[0].map((p) => p[0]), ys = poly[0].map((p) => p[1]);
      polys.push({ code: f.properties.code, poly, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
    }
  }
  const inRing = (ring, x, y) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  return (lon, lat) => {
    for (const { code, poly, box } of polys) {
      if (lon < box[0] || lon > box[2] || lat < box[1] || lat > box[3]) continue;
      if (inRing(poly[0], lon, lat) && !poly.slice(1).some((h) => inRing(h, lon, lat))) return code;
    }
    return null;
  };
}
const townAreaFinder = (ctx) => areaFinder(JSON.parse(readFileSync(path.join(ctx.dir, 'areas.geojson'), 'utf8')));

// ---------------------------------------------------------------- elections

const DC = 'https://elections.democracyclub.org.uk/api';
const DC_CANDIDATES = 'https://candidates.democracyclub.org.uk/api/next';

/** Party name as Democracy Club writes it → short key used in seat counts. */
export function partyKey(name) {
  const n = String(name || '').toLowerCase();
  if (/labour/.test(n)) return 'Labour';
  if (/conservative/.test(n)) return 'Conservative';
  if (/liberal democrat/.test(n)) return 'LibDem';
  if (/green/.test(n)) return 'Green';
  if (/reform/.test(n)) return 'Reform';
  if (/independent/.test(n)) return 'Independent';
  return 'Other';
}

/** Turnout % from a Democracy Club ballot's `results` (or null when not recorded). */
export function turnoutPct(results) {
  if (!results) return null;
  const pct = Number(results.turnout_percentage);
  if (Number.isFinite(pct) && results.turnout_percentage != null) return round(pct, 1);
  if (results.num_turnout_reported && results.total_electorate) return round((100 * results.num_turnout_reported) / results.total_electorate, 1);
  return null;
}

/** Elected candidates of one ballot: [{ name, party, votes }], most votes first. */
export function ballotWinners(ballot) {
  return (ballot?.candidacies || [])
    .filter((c) => c.elected || c.result?.elected)
    .map((c) => ({ name: c.person?.name, party: c.party_name || c.party?.name, votes: c.result?.num_ballots ?? null }))
    .sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
}

/**
 * Current wards from a list of ballots ({ id, date, gss, name, seats, set }):
 * only regular (not by-election) ballots already held, on the newest boundary
 * set, grouped by ward with the newest ballot first.
 */
export function currentWards(ballots, on = today()) {
  const held = ballots.filter((b) => !/\.by\./.test(b.id) && b.date <= on);
  const set = held.map((b) => b.set || '').sort().pop();
  const wards = new Map();
  const newestFirst = (a, b) => (a.date < b.date ? 1 : -1);
  for (const b of held.filter((x) => (x.set || '') === set).sort(newestFirst)) {
    if (!wards.has(b.gss)) wards.set(b.gss, { gss: b.gss, name: b.name, seats: b.seats || 1, ballots: [], older: [] });
    wards.get(b.gss).ballots.push(b);
  }
  // Same ward code on an earlier boundary set (e.g. Gloucester 2021): only a turnout fallback, never councillors.
  for (const b of held.filter((x) => (x.set || '') !== set).sort(newestFirst)) wards.get(b.gss)?.older.push(b);
  return wards;
}

/** Councillors sitting for a ward: winners from the newest ballots, newest first, capped at the ward's seats. */
export function sittingCouncillors(details, seats) {
  const out = [];
  for (const d of details) for (const w of ballotWinners(d.ballot)) if (out.length < seats) out.push({ ...w, year: Number(d.date.slice(0, 4)) });
  return out;
}

/** GET a Democracy Club URL once per cache name, politely: paced, and backing off when told to slow down (429). */
async function dcGet(url, name) {
  const file = path.join(cacheDir(), name);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  for (let tries = 0; tries < 6; tries++) {
    await sleep(400);
    const res = await fetch(url);
    if (res.status === 429) { await sleep((Number(res.headers.get('retry-after')) || 10 * (tries + 1)) * 1000); continue; }
    if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
    const body = await res.text();
    writeFileSync(file, body);
    return JSON.parse(body);
  }
  throw new Error(`${new URL(url).host} kept answering 429`);
}

async function dcPages(url, name) {
  const out = [];
  for (let i = 0; url && i < 30; i++) {
    const page = await dcGet(url, `${name}-${i}.json`);
    out.push(...page.results);
    url = page.next ? page.next.replace(/^http:/, 'https:') : null;
  }
  return out;
}

/** Democracy Club: latest local election per ward (turnout, councillors) and council seats by party. Level: ward. */
async function elections(ctx) {
  const stamp = new Date().toISOString().slice(0, 7);
  const councilName = Object.entries(ctx.councils).find(([, code]) => code === ctx.town.ladCode)?.[0] || ctx.town.name;
  const orgs = await dcPages(`${DC}/organisations/?organisation_type=local-authority&limit=500`, `dc-orgs-${stamp}`);
  const org = orgs.find((o) => !o.end_date && o.common_name === councilName) || orgs.find((o) => !o.end_date && normName(o.official_name).startsWith(normName(councilName)));
  if (!org) throw new Error(`no Democracy Club organisation called ${councilName}`);
  const since = `${new Date().getFullYear() - 5}-01-01`;
  const list = await dcPages(`${DC}/elections/?organisation_identifier=${org.official_identifier}&identifier_type=ballot&poll_open_date__gte=${since}&limit=100`, `dc-${org.official_identifier}-${stamp}`);
  const ballots = list.filter((e) => e.election_type?.election_type === 'local' && !e.cancelled && !e.deleted && e.division).map((e) => ({
    id: e.election_id, date: e.poll_open_date, gss: String(e.division.official_identifier).replace(/^gss:/, ''), name: e.division.name, seats: e.division.seats_total, set: e.division.divisionset?.start_date,
  }));
  const wards = currentWards(ballots);
  if (!wards.size) throw new Error('no held ward elections found');

  // Walk each ward's ballots, newest first, until we have turnout and all seats filled.
  const wardInfo = {};
  for (const w of wards.values()) {
    const details = [];
    let turnout = null, filled = 0;
    // The newest ballots often have no turnout recorded yet (Gloucester 2024), so fall back to the previous boundary set's.
    for (const b of [...w.ballots.slice(0, 4), ...w.older.slice(0, 2)]) {
      const isOlder = w.older.includes(b);
      if (isOlder && turnout) break;
      const ballot = await dcGet(`${DC_CANDIDATES}/ballots/${b.id}/`, `dc-ballot-${b.id}.json`);
      const won = ballotWinners(ballot).length;
      if (!won) continue;
      const t = turnoutPct(ballot.results);
      if (turnout == null && t != null) turnout = { pct: t, year: Number(b.date.slice(0, 4)), votes: ballot.results?.num_turnout_reported ?? null, electorate: ballot.results?.total_electorate ?? null };
      if (isOlder) continue;
      details.push({ date: b.date, ballot });
      filled += won;
      if (turnout && filled >= w.seats) break;
    }
    wardInfo[w.gss] = { gss: w.gss, name: w.name, seats: w.seats, turnout, councillors: sittingCouncillors(details, w.seats) };
  }

  const byGss = wardInfo;
  const byName = Object.fromEntries(Object.values(wardInfo).map((w) => [normName(w.name), w]));
  const wardNames = JSON.parse(readFileSync(path.join(ctx.dir, 'wards.json'), 'utf8')).byArea;
  const byArea = {}, townWards = new Set();
  for (const a of ctx.areas) {
    const w = byGss[ctx.wards[a.code]] || byName[normName(wardNames[a.code]?.ward)];
    if (!w) continue;
    townWards.add(w.gss);
    if (!w.turnout) continue;
    byArea[a.code] = { wardTurnout: w.turnout.pct, wardElectionYear: w.turnout.year };
  }

  const seats = {};
  let seatsTotal = 0, votes = 0, electorate = 0, counted = 0;
  for (const w of Object.values(wardInfo)) {
    for (const c of w.councillors) { seats[partyKey(c.party)] = (seats[partyKey(c.party)] || 0) + 1; seatsTotal++; }
    if (w.turnout?.votes && w.turnout?.electorate) { votes += w.turnout.votes; electorate += w.turnout.electorate; counted++; }
  }
  const council = { councilSeats: seatsTotal, councilTurnout: electorate && counted * 2 >= Object.keys(wardInfo).length ? round((100 * votes) / electorate, 1) : null };
  for (const [p, n] of Object.entries(seats)) council[`seats${p}`] = n;
  const years = Object.values(wardInfo).map((w) => w.turnout?.year).filter(Boolean);
  return {
    source: `Democracy Club, ${org.official_name} local elections (results; councillors elected)`, level: 'ward', period: years.length ? `latest ward elections ${Math.min(...years)}-${Math.max(...years)}` : 'latest ward elections',
    fields: {
      wardTurnout: 'turnout at the latest local election in the neighbourhood\'s ward, % of registered electors who voted',
      wardElectionYear: 'year of that election',
    },
    byArea,
    council,
    // Public-office information: who sits for each ward in the town (not a stats field).
    wards: Object.values(wardInfo).filter((w) => townWards.has(w.gss)).map((w) => ({ ward: w.name, code: w.gss, seats: w.seats, turnout: w.turnout?.pct ?? null, electionYear: w.turnout?.year ?? null, councillors: w.councillors.map((c) => ({ name: c.name, party: c.party })) })),
    notes: 'Councillors = winners of each ward\'s newest ballots up to its seat count; by-elections not counted. Turnout is as recorded by Democracy Club (some wards have none).',
  };
}

// ------------------------------------------------------------ street reports

const FMS = 'https://www.fixmystreet.com/open311/v2/requests.json';

/** FixMyStreet category (service_name) → counted group. */
export function classifyReport(service) {
  const s = String(service || '').toLowerCase();
  if (/pothole/.test(s)) return 'Potholes';
  if (/fly[- ]?tip|rubbish|refuse|litter|waste|dumping|cleaning/.test(s)) return 'FlyTipping';
  if (/light|lamp/.test(s)) return 'StreetLighting';
  if (/graffiti|flyposting|fly-posting/.test(s)) return 'Graffiti';
  if (/parking|vehicle/.test(s)) return 'Vehicles';
  if (/dog|fouling/.test(s)) return 'DogFouling';
  if (/road|highway|pavement|footway|path|kerb|drain|gully|sign/.test(s)) return 'RoadsPaths';
  return 'Other';
}

/** Count reports inside the bbox [s, w, n, e], by group and (with `areaAt`) by neighbourhood. Keeps no text. */
export function countReports(reports, bbox, areaAt) {
  const [s, w, n, e] = bbox;
  const byArea = {}, total = {};
  for (const r of reports) {
    const lat = Number(r.lat), lon = Number(r.long);
    if (!(lat >= s && lat <= n && lon >= w && lon <= e)) continue;
    const group = classifyReport(r.service_name);
    total[group] = (total[group] || 0) + 1;
    const code = areaAt?.(lon, lat);
    if (!code) continue;
    const row = (byArea[code] ||= {});
    row[`fms${group}`] = (row[`fms${group}`] || 0) + 1;
    row.fmsTotal = (row.fmsTotal || 0) + 1;
  }
  return { byArea, total };
}

/** GET JSON, retrying network errors (and 429/5xx) with growing back-off; the caller already keeps the 3 s crawl delay. */
export async function fetchJsonRetry(url, { tries = 5, delay = 3000, fetchFn = fetch, wait = sleep } = {}) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetchFn(url, { headers: { 'user-agent': 'town-planner-research (counts only)' } });
      if (res.ok) return await res.json();
      if (res.status !== 429 && res.status < 500) throw Object.assign(new Error(`FixMyStreet answered ${res.status}`), { fatal: true });
      if (i >= tries) throw new Error(`FixMyStreet answered ${res.status}`);
    } catch (err) {
      if (err.fatal || i >= tries) throw err;
    }
    await wait(delay * 2 ** i);
  }
}

/** Fetch one Open311 window, splitting it in two when the 1000-report cap is hit. Only category, place and time are kept. */
async function fmsWindow(agencies, from, to, file) {
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const q = new URLSearchParams({ jurisdiction_id: 'fixmystreet', agency_responsible: agencies.join('|'), start_date: from.toISOString(), end_date: to.toISOString() });
  await sleep(3000); // FixMyStreet robots.txt: Crawl-delay 3
  const rows = (await fetchJsonRetry(`${FMS}?${q}`)).service_requests || [];
  if (rows.length >= 1000 && to - from > DAY) {
    const mid = new Date((+from + +to) / 2);
    return [...(await fmsWindow(agencies, from, mid, `${file}.a`)), ...(await fmsWindow(agencies, mid, to, `${file}.b`))];
  }
  const slim = rows.map((r) => ({ lat: r.lat, long: r.long, service_name: r.service_name, requested_datetime: r.requested_datetime }));
  writeFileSync(file, JSON.stringify(slim));
  return slim;
}

/** FixMyStreet (Open311 API): counts of problem reports by type per neighbourhood, last 12 months. Level: point. */
async function streetReports(ctx) {
  const { bbox, ladCode, countyCode } = ctx.town;
  const centre = `${(bbox[1] + bbox[3]) / 2},${(bbox[0] + bbox[2]) / 2}`;
  const mapit = JSON.parse(readFileSync(await ctx.cached(`https://mapit.mysociety.org/point/4326/${centre}?type=DIS,UTA,MTD,LBO,CTY`, `mapit-${ctx.town.id}.json`), 'utf8'));
  const agencies = Object.entries(mapit).filter(([, a]) => [ladCode, countyCode].includes(a.codes?.gss)).map(([id]) => id);
  if (!agencies.length) throw new Error('MapIt knows no council for this town');
  const end = new Date(`${today()}T00:00:00Z`), start = new Date(+end - 365 * DAY);
  const reports = [];
  for (let from = start; from < end; from = new Date(+from + 31 * DAY)) {
    const to = new Date(Math.min(+from + 31 * DAY, +end));
    reports.push(...(await fmsWindow(agencies, from, to, path.join(cacheDir(), `fms-${agencies.join('-')}-${today()}-${from.toISOString().slice(0, 10)}.json`))));
  }
  const { byArea, total } = countReports(reports, bbox, townAreaFinder(ctx));
  const council = { fmsReportsInTown: Object.values(total).reduce((a, b) => a + b, 0) };
  for (const [g, n] of Object.entries(total)) council[`fmsTown${g}`] = n;
  return {
    source: 'FixMyStreet (mySociety) Open311 API: reports sent to the district and county council; counts only', level: 'point (counted per neighbourhood)', period: `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`,
    fields: {
      fmsTotal: 'FixMyStreet problem reports in the neighbourhood in the last 12 months (count)',
      fmsPotholes: 'pothole reports, last 12 months (count)',
      fmsRoadsPaths: 'road, pavement, drain and sign reports, last 12 months (count)',
      fmsFlyTipping: 'fly-tipping, rubbish and litter reports, last 12 months (count)',
      fmsStreetLighting: 'street light reports, last 12 months (count)',
      fmsGraffiti: 'graffiti reports, last 12 months (count)',
      fmsDogFouling: 'dog fouling reports, last 12 months (count)',
      fmsVehicles: 'car parking and abandoned vehicle reports, last 12 months (count)',
      fmsOther: 'other reports, last 12 months (count)',
    },
    byArea,
    council,
    notes: 'FixMyStreet only; many residents report straight to the council, so counts understate problems and mostly show who uses the site.',
  };
}

// ----------------------------------------------------------------- roadworks

const SM = 'https://opendata.manage-roadworks.service.gov.uk';
const ROADWORKS_MONTHS = 3; // each monthly zip is ~1 GB (1M event files); raise for a longer window

/** Street Manager work category → major | standard | minor | immediate | other. */
export function workCategory(ref) {
  const r = String(ref || '');
  if (/^immediate/.test(r)) return 'immediate';
  return ['major', 'standard', 'minor'].includes(r) ? r : 'other';
}

/** Newest `n` monthly archive keys ("permit/2026/09.zip") from a bucket listing. */
export function latestMonths(keys, n) {
  return keys.filter((k) => /^permit\/\d{4}\/\d{2}\.zip$/.test(k)).sort().slice(-n);
}

/**
 * Works from permit events: one work per work_reference_number, spanning its
 * earliest start to latest end (actual dates when known), days clipped to
 * the window [from, to] (ISO dates).
 */
export function summariseWorks(events, from, to) {
  const works = new Map();
  for (const e of events) {
    const start = e.actual_start_date_time || e.proposed_start_date, end = e.actual_end_date_time || e.proposed_end_date;
    if (!start || !end || !e.work_reference_number) continue;
    const w = works.get(e.work_reference_number) || { ref: e.work_reference_number, start, end, at: '' };
    w.start = start < w.start ? start : w.start;
    w.end = end > w.end ? end : w.end;
    if ((e.at || '') >= w.at) Object.assign(w, { at: e.at || '', street: e.street_name, category: workCategory(e.work_category_ref), activity: e.activity_type, x: e.x, y: e.y });
    works.set(e.work_reference_number, w);
  }
  const lo = +new Date(from), hi = +new Date(to) + DAY, out = [];
  for (const w of works.values()) {
    const days = Math.round((Math.min(+new Date(w.end), hi) - Math.max(+new Date(w.start), lo)) / DAY);
    if (days < 0 || !Number.isFinite(days)) continue;
    out.push({ ...w, days: Math.max(days, 1) });
  }
  return out;
}

// Reads one monthly zip with python (zipfile, isolated mode); keeps only the newest event per permit inside the OSGB box.
const FILTER_PY = String.raw`
import sys, json, re, zipfile
zf, w, s, e, n = sys.argv[1], *map(float, sys.argv[2:6])
want = ('_permit_granted_event_', '_work_start_event_', '_work_stop_event_')
keep = {}
with zipfile.ZipFile(zf) as z:
    for info in z.infolist():
        if not any(k in info.filename for k in want):
            continue
        raw = z.read(info)
        m = re.search(rb'"works_location_coordinates":"[A-Z]+\s*\(+(-?[\d.]+)\s+(-?[\d.]+)', raw)
        if not m:
            continue
        x, y = float(m.group(1)), float(m.group(2))
        if not (w <= x <= e and s <= y <= n):
            continue
        d = json.loads(raw)
        o = d.get('object_data') or {}
        rec = {k: o.get(k) for k in ('work_reference_number', 'permit_reference_number', 'street_name', 'work_category_ref', 'activity_type', 'proposed_start_date', 'proposed_end_date', 'actual_start_date_time', 'actual_end_date_time')}
        rec.update(at=d.get('event_time'), x=x, y=y)
        k = rec['permit_reference_number']
        if k not in keep or (keep[k]['at'] or '') <= (rec['at'] or ''):
            keep[k] = rec
json.dump(list(keep.values()), sys.stdout)
`;

async function monthEvents(key, box, townId) {
  const file = path.join(cacheDir(), `roadworks-${townId}-${key.replace(/\W+/g, '-')}-${box.map(Math.round).join('_')}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const tmp = mkdtempSync(path.join(tmpdir(), 'roadworks-'));
  try {
    const res = await fetch(`${SM}/${key}`);
    if (!res.ok) throw new Error(`Street Manager archive answered ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(path.join(tmp, 'month.zip')));
    const run = spawnSync('python3', ['-I', '-c', FILTER_PY, path.join(tmp, 'month.zip'), ...box.map(String)], { encoding: 'utf8', maxBuffer: 1 << 28 });
    if (run.status !== 0) throw new Error(`filter failed: ${run.stderr.slice(0, 200)}`);
    writeFileSync(file, run.stdout);
    return JSON.parse(run.stdout);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** DfT Street Manager open data: roadworks in the town (count, works-days, by type and street). Level: works. */
async function roadworks(ctx) {
  const [s, w, n, e] = ctx.town.bbox;
  const corners = [lonLatToEN(w, s), lonLatToEN(e, s), lonLatToEN(w, n), lonLatToEN(e, n)];
  const box = [Math.min(...corners.map((c) => c[0])), Math.min(...corners.map((c) => c[1])), Math.max(...corners.map((c) => c[0])), Math.max(...corners.map((c) => c[1]))];
  const year = new Date().getFullYear(), keys = [];
  for (const y of [year - 1, year]) {
    const xml = await (await fetch(`${SM}/?list-type=2&prefix=permit/${y}/`)).text();
    keys.push(...[...xml.matchAll(/<Key>([^<]*)<\/Key>/g)].map((m) => m[1]));
  }
  const months = latestMonths(keys, ROADWORKS_MONTHS);
  if (!months.length) throw new Error('no monthly archives listed');
  const events = [];
  for (const key of months) events.push(...(await monthEvents(key, box, ctx.town.id)));
  const [first, last] = [months[0], months.at(-1)].map((k) => k.match(/(\d{4})\/(\d{2})/).slice(1).map(Number));
  const from = `${first[0]}-${String(first[1]).padStart(2, '0')}-01`;
  const to = new Date(Date.UTC(last[0], last[1], 0)).toISOString().slice(0, 10);
  const areaAt = townAreaFinder(ctx);
  const works = summariseWorks(events, from, to).map((x) => ({ ...x, lonLat: osgbToLonLat(x.x, x.y) }));
  const byArea = {}, council = { roadworksTotal: works.length, roadworksDays: 0 }, streets = {};
  for (const k of ['major', 'standard', 'minor', 'immediate', 'other']) council[`roadworks${k[0].toUpperCase()}${k.slice(1)}`] = 0;
  for (const x of works) {
    council.roadworksDays += x.days;
    council[`roadworks${x.category[0].toUpperCase()}${x.category.slice(1)}`]++;
    const st = (streets[x.street || '(unnamed)'] ||= { street: x.street || '(unnamed)', works: 0, days: 0 });
    st.works++; st.days += x.days;
    const code = areaAt(...x.lonLat);
    if (!code) continue;
    const row = (byArea[code] ||= { roadworksCount: 0, roadworksDays: 0 });
    row.roadworksCount++; row.roadworksDays += x.days;
  }
  const places = works.sort((a, b) => b.days - a.days).slice(0, 200).map((x) => ({
    kind: `roadworks:${x.category}`, id: x.ref, name: x.street || '(unnamed street)', lon: x.lonLat[0], lat: x.lonLat[1], days: x.days, start: x.start.slice(0, 10), end: x.end.slice(0, 10), activity: x.activity,
  }));
  return {
    source: 'DfT Street Manager open data (permit events, monthly archives)', level: 'works', period: `${from} to ${to} (latest ${months.length} monthly archives)`,
    fields: {
      roadworksCount: 'street works permitted in the neighbourhood in the period (count)',
      roadworksDays: 'total days those works occupied the street in the period (works-days)',
    },
    byArea,
    council: { ...council, roadworksDays: Math.round(council.roadworksDays) },
    streets: Object.values(streets).sort((a, b) => b.days - a.days).slice(0, 30),
    places,
    notes: 'Counts the town bounding box, not the council. Works that began before the window and have no event inside it are missed. Days use actual dates where known, else permitted dates.',
  };
}

export const SOURCES = { elections, streetReports, roadworks };
