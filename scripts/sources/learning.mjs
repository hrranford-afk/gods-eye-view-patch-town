/**
 * Wave-2 sources about learning: school results (DfE), Ofsted ratings of
 * schools and childcare, and railway station use (ORR, listed here because
 * it came with this group). Each is `async (ctx) => stats file`; see
 * scripts/planner-sources.mjs for the shape.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../../src/planner/traffic.js';
import { geocodePostcodes, round } from '../planner-sources.mjs';

const DFE = 'https://api.education.gov.uk/statistics/v1';
const KS2 = 'c62e9901-42f1-1e75-b95e-cd874bbf569b'; // KS2 attainment by pupil residency and pupil characteristics
const KS4 = '18e39901-e1a0-3b70-aeae-b3fe542fcf1c'; // KS4 performance, local authority district data

// ---------- helpers (pure; tested in src/planner/sources-learning.test.mjs) ----------

/** A published figure as a number: suppressed codes ("c", "x", "z", "") become null. */
export function dfeNumber(v) {
  return /^-?\d/.test(String(v ?? '')) ? Number(v) : null;
}

/**
 * From DfE API rows, the {period: value} of one indicator at one place.
 * `where` is { level: 'LAD'|'NAT', id (for LAD), filters: { filterId: optionId } }.
 */
export function dfeSeries(rows, indicator, where) {
  const out = {};
  for (const r of rows) {
    if (r.geographicLevel !== where.level) continue;
    if (where.level === 'LAD' && r.locations?.LAD !== where.id) continue;
    if (!Object.entries(where.filters || {}).every(([f, o]) => r.filters?.[f] === o)) continue;
    const v = dfeNumber(r.values?.[indicator]);
    if (v != null) out[r.timePeriod.period] = v;
  }
  return out;
}

/** The latest two periods of a series as [{ period: '2025/26', value }, ...] newest first. */
export function lastTwo(series) {
  return Object.keys(series).sort().reverse().slice(0, 2).map((p) => ({ period: p.replace(/^(\d{4})\/\d{2}(\d{2})$/, '$1/$2'), value: series[p] }));
}

const FIVE = { 'urgent improvement': 1, 'needs attention': 2, 'expected standard': 3, 'strong standard': 4, exceptional: 5 };

/** Ofsted's new report-card wording as 1 (urgent improvement) to 5 (exceptional); null if not graded. */
export function reportCardScore(text) {
  return FIVE[String(text || '').trim().toLowerCase()] ?? null;
}

/** Old-style grade "1".."4" (outstanding..inadequate) as a number; anything else null. */
export function oeifScore(text) {
  return /^[1-4]$/.test(String(text || '').trim()) ? Number(text) : null;
}

/** Year from "dd/mm/yyyy"; null if not a date. */
export function yearOf(date) {
  const m = /(\d{4})$/.exec(String(date || '').trim());
  return m ? Number(m[1]) : null;
}

/** The figures for one row of Ofsted's "latest inspections" school file. */
export function schoolGrades(r) {
  const concern = r['Most recent category of concern'];
  return {
    oeifOverall: oeifScore(r['Latest OEIF overall effectiveness']),
    oeifEducation: oeifScore(r['Latest OEIF quality of education']),
    oeifBehaviour: oeifScore(r['Latest OEIF behaviour and attitudes']),
    oeifLeadership: oeifScore(r['Latest OEIF effectiveness of leadership and management']),
    oeifYear: yearOf(r['Publication date of latest OEIF graded inspection']),
    rcInclusion: reportCardScore(r.Inclusion),
    rcCurriculum: reportCardScore(r['Curriculum and teaching']),
    rcAchievement: reportCardScore(r.Achievement),
    rcBehaviour: reportCardScore(r['Attendance and behaviour']),
    rcPersonalDevelopment: reportCardScore(r['Personal development and wellbeing']),
    rcLeadership: reportCardScore(r['Leadership and governance']),
    rcSafeguardingMet: r['Safeguarding standards'] === 'Met' ? 1 : r['Safeguarding standards'] === 'Not met' ? 0 : null,
    rcYear: yearOf(r['Publication date']),
    concern: /^(SM|RSI|NTI|SWK)$/.test(concern || '') ? concern : null,
  };
}

/** Drop spreadsheet title lines above the real header (the line starting "Web link,") and a BOM. */
export function csvBelowTitle(text, headerStart = 'Web link,') {
  const t = text.replace(/^﻿/, '');
  const i = t.search(new RegExp(`(^|\\n)${headerStart}`, 'i'));
  return i > 0 ? t.slice(i + 1) : t;
}

/** Group a childcare provider type: nurseries/clubs are premises; childminders work from home. */
export function childcareGroup(type) {
  if (/^Childcare on non-domestic/i.test(type)) return 'premises';
  if (/^Childminder|^Childcare on domestic/i.test(type)) return 'home';
  return 'other'; // home childcarers work in the child's own home
}

/** Names compared between ORR and NaPTAN: lower case, letters and digits only, no "rail station". */
export function stationKey(name) {
  return String(name || '').toLowerCase().replace(/\brail station\b/g, '').replace(/[^a-z0-9]+/g, '');
}

/** Index of the last "Apr YYYY to Mar YYYY" column in a header row, and the one for a given start year. */
export function yearColumns(header) {
  const cols = header.map((h, i) => ({ i, m: /Apr (\d{4}) to Mar (\d{4})/.exec(String(h || '')) })).filter((c) => c.m);
  const byStart = Object.fromEntries(cols.map((c) => [Number(c.m[1]), c.i]));
  const latest = Math.max(...Object.keys(byStart).map(Number));
  return { latest, latestCol: byStart[latest], col: (start) => byStart[start] };
}

/** A spreadsheet cell as a number; "[x]", "[z]" and blanks are null. */
export function cellNumber(v) {
  return typeof v === 'number' ? v : /^[\d,.]+$/.test(String(v ?? '').trim()) ? Number(String(v).replace(/,/g, '')) : null;
}

/** Nearest-home neighbourhood finder, as in businessRates: postcode centres sit among homes. */
function areaFinder(homes) {
  const cell = (lon, lat) => `${Math.round(lon * 200)},${Math.round(lat * 300)}`;
  const grid = new Map();
  for (const h of homes) if (h.area) (grid.get(cell(h.lon, h.lat)) || grid.set(cell(h.lon, h.lat), []).get(cell(h.lon, h.lat))).push(h);
  return (lon, lat) => {
    let best = null, bd = Infinity;
    const [cx, cy] = [Math.round(lon * 200), Math.round(lat * 300)];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const h of grid.get(`${cx + dx},${cy + dy}`) || []) {
      const d = (h.lon - lon) ** 2 + ((h.lat - lat) * 1.6) ** 2;
      if (d < bd) { bd = d; best = h.area; }
    }
    return best;
  };
}

async function dfeQuery(dataset, filterGroups, indicators) {
  const res = await fetch(`${DFE}/data-sets/${dataset}/query`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ criteria: { and: filterGroups.map((ids) => ({ filters: { in: ids } })) }, indicators, page: 1, pageSize: 10000 }),
  });
  if (!res.ok) throw new Error(`DfE statistics API answered ${res.status}`);
  const j = await res.json();
  if (j.paging?.totalPages > 1) throw new Error('DfE query returned more than one page');
  return j.results;
}

async function dfeLadId(dataset, ladCode) {
  const res = await fetch(`${DFE}/data-sets/${dataset}/meta`);
  if (!res.ok) throw new Error(`DfE statistics API answered ${res.status}`);
  const loc = (await res.json()).locations.flatMap((l) => l.options).find((o) => o.code === ladCode);
  if (!loc) throw new Error(`DfE data set has no local authority district ${ladCode}`);
  return loc.id;
}

/** The latest periods' figures for the town's council and England, for the given option filters. */
function pair(rows, ladId, indicator, filters, name, out) {
  const council = lastTwo(dfeSeries(rows, indicator, { level: 'LAD', id: ladId, filters }));
  const england = lastTwo(dfeSeries(rows, indicator, { level: 'NAT', filters }));
  out[name] = council[0]?.value ?? null;
  out[`${name}Previous`] = council[1]?.value ?? null;
  out[`england${name[0].toUpperCase()}${name.slice(1)}`] = england[0]?.value ?? null;
  out[`england${name[0].toUpperCase()}${name.slice(1)}Previous`] = england[1]?.value ?? null;
  return { latest: council[0]?.period, previous: council[1]?.period };
}

// ---------- sources ----------

export const SOURCES = {
  /** Pupils' results at council level (LAD): KS2 reading, writing and maths, and KS4 Attainment 8, all pupils and disadvantaged. DfE statistics API. */
  async schoolResults(ctx) {
    const lad = ctx.town.ladCode;
    const council = {};
    const periods = {};
    const ks2Id = await dfeLadId(KS2, lad);
    // subject = reading, writing and maths; free-school-meal status = total; disadvantage = disadvantaged / total
    const ks2 = await dfeQuery(KS2, [['4ZRUZ'], ['bXDtT'], ['GJQgr', 'SUzVx']], ['wGjbx']);
    periods.ks2 = pair(ks2, ks2Id, 'wGjbx', { W3k2b: 'SUzVx' }, 'ks2ReadingWritingMathsExpected', council);
    pair(ks2, ks2Id, 'wGjbx', { W3k2b: 'GJQgr' }, 'ks2ReadingWritingMathsExpectedDisadvantaged', council);
    try {
      const ks4Id = await dfeLadId(KS4, lad);
      // basis = pupil residency; free-school-meal status = total
      const ks4 = await dfeQuery(KS4, [['VZJ5X'], ['oN4mX'], ['1zxi3', 'u6eo4']], ['PZleb', 'VlY5X']);
      const all = { mhT9K: 'u6eo4' };
      const dis = { mhT9K: '1zxi3' };
      periods.ks4 = pair(ks4, ks4Id, 'PZleb', all, 'ks4Attainment8', council);
      pair(ks4, ks4Id, 'PZleb', dis, 'ks4Attainment8Disadvantaged', council);
      pair(ks4, ks4Id, 'VlY5X', all, 'ks4EnglishMathsGrade5', council);
      pair(ks4, ks4Id, 'VlY5X', dis, 'ks4EnglishMathsGrade5Disadvantaged', council);
    } catch (e) {
      console.warn(`[schoolResults] KS4 skipped: ${e.message}`);
    }
    return {
      source: 'DfE statistics API: KS2 attainment and KS4 performance by pupil residency, local authority district',
      level: 'council', period: [periods.ks2?.latest && `${periods.ks2.latest} (KS2)`, periods.ks4?.latest && `${periods.ks4.latest} (KS4)`].filter(Boolean).join(', '),
      fields: {},
      council: {
        ...council,
        about: 'ks2*: % of Year 6 pupils meeting the expected standard in reading, writing and maths; ks4Attainment8: average Attainment 8 score per pupil; ks4EnglishMathsGrade5: % with grade 5+ in English and maths GCSE; "Previous" is the year before; england* is the national figure',
        ks2Period: periods.ks2?.latest, ks2PreviousPeriod: periods.ks2?.previous, ks4Period: periods.ks4?.latest, ks4PreviousPeriod: periods.ks4?.previous,
      },
    };
  },

  /** Ofsted grades of each school (place, by URN) and counts of childcare providers per neighbourhood (LSOA, from postcodes). Ofsted management information. */
  async ofsted(ctx) {
    const index = await (await fetch('https://www.gov.uk/api/content/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes')).json();
    const latest = index.details.attachments.filter((a) => /latest[ _]inspections[ _]as[ _]at.*\.csv$/i.test(a.url)).pop();
    if (!latest) throw new Error('no "latest inspections" CSV on the Ofsted schools page');
    const stamp = /as_at_(.+)\.csv$/i.exec(latest.url)?.[1] || 'latest';
    const schoolRows = parseCsv(csvBelowTitle(readFileSync(await ctx.cached(latest.url, `ofsted-schools-${stamp}.csv`), 'utf8'), 'Web link,'));
    const known = JSON.parse(readFileSync(path.join(ctx.dir, 'schools.json'), 'utf8')).schools;
    const byUrn = new Map(known.map((s) => [String(s.urn), s]));
    const places = [];
    for (const r of schoolRows) {
      const s = byUrn.get(String(r.URN));
      if (!s || !Number.isFinite(s.lon)) continue;
      places.push({ kind: 'ofsted:school', id: `urn/${r.URN}`, name: r['School name'], lon: s.lon, lat: s.lat, ...schoolGrades(r), phase: r['Ofsted phase'] });
    }

    const cc = await (await fetch('https://www.gov.uk/api/content/government/statistical-data-sets/childcare-providers-and-inspections-management-information')).json();
    const ccFile = cc.details.attachments.filter((a) => /childcare provider data as at .*\.csv$/i.test(a.title || '') || /childcare_providers_data_as_at_.*\.csv$/i.test(a.url)).pop();
    if (!ccFile) throw new Error('no childcare provider CSV on the Ofsted childcare page');
    const ccStamp = /as_at_(.+)\.csv$/i.exec(ccFile.url)?.[1] || 'latest';
    const districts = new Set(ctx.town.postcodeDistricts || []);
    const allProviders = parseCsv(csvBelowTitle(readFileSync(await ctx.cached(ccFile.url, `ofsted-childcare-${ccStamp}.csv`), 'utf8')));
    const providers = allProviders.filter((r) => districts.has(String(r['Provider postcode'] || '').trim().split(' ')[0]));
    // Childminders' addresses are redacted by Ofsted (private homes), so they are only counted per county.
    const minders = allProviders.filter((r) => childcareGroup(r['Provider type']) === 'home' && String(r['Local authority']).toUpperCase() === ctx.town.county).length;
    const where = await geocodePostcodes(providers.map((r) => r['Provider postcode']));
    const areaAt = areaFinder(ctx.homes);
    const counts = {};
    for (const r of providers) {
      const ll = where[r['Provider postcode']];
      const area = ll && areaAt(...ll);
      if (!area) continue;
      const k = (counts[area] ||= { providers: 0, places: 0 });
      if (childcareGroup(r['Provider type']) === 'premises') {
        k.providers++;
        k.places += Number(r.Places) || 0;
        // Premises (nurseries, clubs) are organisations and may be mapped; childminders never are.
        places.push({ kind: 'ofsted:childcare', id: `ey/${r['Provider URN']}`, name: r['Provider name'], lon: ll[0], lat: ll[1], childcarePlaces: Number(r.Places) || 0, oeifOverall: oeifScore(r['EYR OEIF/CIF: Most recent: Overall effectiveness']), area });
      }
    }
    const byArea = {};
    for (const a of ctx.areas) {
      const k = counts[a.code] || { providers: 0, places: 0 };
      byArea[a.code] = { childcareProviders: k.providers, childcarePlaces: k.places };
    }
    const graded = places.filter((p) => p.kind === 'ofsted:school' && p.oeifOverall != null);
    return {
      source: `Ofsted management information: state-funded schools (latest inspections, ${stamp.replace(/_/g, ' ')}) and childcare providers (${ccStamp.replace(/_/g, ' ')})`,
      level: 'school (point); childcare by postcode centre', period: ccStamp.replace(/_/g, ' '),
      fields: {
        childcareProviders: 'nurseries, pre-schools and out-of-school clubs on non-domestic premises registered with Ofsted',
        childcarePlaces: 'registered places at those nurseries, pre-schools and clubs',
      },
      byArea,
      council: {
        schools: places.filter((p) => p.kind === 'ofsted:school').length,
        schoolsWithOldGrade: graded.length,
        schoolsGoodOrOutstandingOldGrade: graded.filter((p) => p.oeifOverall <= 2).length,
        childcareProviders: Object.values(counts).reduce((t, k) => t + k.providers, 0),
        childcarePlaces: Object.values(counts).reduce((t, k) => t + k.places, 0),
        childmindersInCounty: minders,
        about: 'oeif*: old grades 1 outstanding, 2 good, 3 requires improvement, 4 inadequate; rc*: new report card 1 urgent improvement .. 5 exceptional (from Nov 2025); concern: SM special measures, RSI requires significant improvement',
      },
      places,
    };
  },

  /** Passengers entering and leaving each railway station, yearly: stations near the town as places, council totals. ORR estimates of station usage (table 1415) with NaPTAN locations. */
  async stationUse(ctx) {
    const ods = await ctx.cached('https://dataportal.orr.gov.uk/media/1908/table-1415-time-series-of-passenger-entries-and-exits-and-interchanges-by-station.ods', 'orr-station-usage-1415.ods');
    const rows = ctx.sheet(ods, '1415a_Entries_and_Exits');
    const h = rows.findIndex((r) => r[1] === 'Station name');
    const { latest, latestCol, col } = yearColumns(rows[h]);
    const prevCol = col(2019);
    if (latestCol == null || prevCol == null) throw new Error('ORR table has no latest or 2019-20 column');
    const naptan = parseCsv(readFileSync(await ctx.cached('https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv&atcoAreaCodes=910', 'naptan-rail-910.csv'), 'utf8').replace(/^\uFEFF/, ''));
    const at = new Map(naptan.filter((r) => r.StopType === 'RLY' && r.Status !== 'inactive').map((r) => [stationKey(r.CommonName), [Number(r.Longitude), Number(r.Latitude)]]));
    const [s, w, n, e] = ctx.town.bbox;
    const pad = [0.009, 0.0145];
    const ownCouncil = Object.keys(ctx.councils).find((c) => ctx.councils[c] === ctx.town.ladCode);
    const places = [];
    const council = { stations: 0, entriesExits: 0, entriesExits201920: 0 };
    for (const r of rows.slice(h + 1)) {
      const now = cellNumber(r[latestCol]);
      if (now == null) continue;
      const before = cellNumber(r[prevCol]);
      if (String(r[5]).split(' - ')[0] === ownCouncil) { council.stations++; council.entriesExits += now; council.entriesExits201920 += before || 0; }
      const ll = at.get(stationKey(r[1]));
      if (!ll || ll[1] < s - pad[0] || ll[1] > n + pad[0] || ll[0] < w - pad[1] || ll[0] > e + pad[1]) continue;
      places.push({ kind: 'station', id: `crs/${r[2]}`, name: r[1], lon: ll[0], lat: ll[1], entriesExits: now, entriesExits201920: before, change: before ? round(now / before - 1, 3) : null });
    }
    return {
      source: 'ORR estimates of station usage, table 1415 (entries and exits), station locations from NaPTAN', level: 'station',
      period: `April ${latest} to March ${latest + 1}`,
      fields: {},
      council: { ...council, about: 'entriesExits: passengers entering plus leaving in the year; change: share compared with April 2019 to March 2020 (0 = same, -0.2 = 20% fewer)' },
      places,
    };
  },
};
