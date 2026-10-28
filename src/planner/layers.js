/**
 * More of the map, parsed into the planner's shapes. Each function takes
 * raw rows from an official source and returns per-area figures or places;
 * fetching is the command line's job (scripts/planner.mjs). Nothing here
 * identifies a person: crime is counted per neighbourhood, collisions are
 * events, schools and sales are places.
 */
import { pointInGeometry } from './census.js';

/** Find a column by the start of its header (deprivation headers are long). */
function column(row, start) {
  return Object.keys(row).find((k) => k.startsWith(start));
}

/**
 * English Indices of Deprivation 2025 (File 7) → per LSOA: overall score and
 * decile (1 = most deprived 10% in England) and the seven domain scores.
 */
export function deprivationByArea(rows, codes) {
  const want = new Set(codes);
  const out = {};
  if (!rows.length) return out;
  const r0 = rows[0];
  const col = {
    code: column(r0, 'LSOA code'),
    imdScore: column(r0, 'Index of Multiple Deprivation (IMD) Score'),
    imdDecile: column(r0, 'Index of Multiple Deprivation (IMD) Decile'),
    incomeDep: column(r0, 'Income Score'),
    employmentDep: column(r0, 'Employment Score'),
    educationDep: column(r0, 'Education, Skills and Training Score'),
    healthDep: column(r0, 'Health Deprivation and Disability Score'),
    crimeDep: column(r0, 'Crime Score'),
    barriersDep: column(r0, 'Barriers to Housing and Services Score'),
    livingEnvDep: column(r0, 'Living Environment Score'),
  };
  for (const r of rows) {
    const code = r[col.code];
    if (!want.has(code)) continue;
    const a = {};
    for (const [k, c] of Object.entries(col)) if (k !== 'code' && c) a[k] = Number(r[c]);
    out[code] = a;
  }
  return out;
}

/** Street crimes (data.police.uk) → per area: total and counts by category. */
export function crimeByArea(crimes, areas) {
  const out = {};
  for (const c of crimes) {
    const p = [Number(c.location?.longitude), Number(c.location?.latitude)];
    const a = areas.find((x) => pointInGeometry(p, x.geometry));
    if (!a) continue;
    const o = (out[a.code] ||= { total: 0, byCategory: {} });
    o.total++;
    o.byCategory[c.category] = (o.byCategory[c.category] || 0) + 1;
  }
  return out;
}

const SEVERITY = Object.freeze({ 1: 'fatal', 2: 'serious', 3: 'slight' });

/** Road collisions (DfT STATS19) inside a bbox → events with severity. */
export function collisionsIn(rows, [s, w, n, e]) {
  const out = [];
  for (const r of rows) {
    const lat = Number(r.latitude);
    const lon = Number(r.longitude);
    if (!lat || lat < s || lat > n || lon < w || lon > e) continue;
    out.push({
      year: Number(r.collision_year || r.accident_year),
      severity: SEVERITY[r.collision_severity || r.accident_severity] || 'unknown',
      casualties: Number(r.number_of_casualties) || 0,
      vehicles: Number(r.number_of_vehicles) || 0,
      lon: Math.round(lon * 1e5) / 1e5,
      lat: Math.round(lat * 1e5) / 1e5,
    });
  }
  return out;
}

/** Open schools from the DfE register (Get Information About Schools) → places with capacity. */
export function schoolsFrom(rows, { la }) {
  return rows
    .filter((r) => r['LA (name)'] === la && r['EstablishmentStatus (name)'] === 'Open')
    .map((r) => ({
      urn: r.URN,
      name: r.EstablishmentName,
      phase: r['PhaseOfEducation (name)'],
      type: r['TypeOfEstablishment (name)'],
      ages: [Number(r.StatutoryLowAge) || null, Number(r.StatutoryHighAge) || null],
      capacity: Number(r.SchoolCapacity) || null,
      pupils: Number(r.NumberOfPupils) || null,
      postcode: r.Postcode,
      lsoa: r['LSOA (code)'] || null,
    }));
}

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * House sales (Land Registry Price Paid, with lon/lat) → per area: median
 * price in the first and last `span` years of the data, and the change.
 */
export function pricesByArea(sales, areas, { span = 3 } = {}) {
  const years = sales.map((s) => s.year);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const acc = {};
  for (const s of sales) {
    const a = areas.find((x) => pointInGeometry([s.lon, s.lat], x.geometry));
    if (!a) continue;
    const o = (acc[a.code] ||= { early: [], recent: [] });
    if (s.year < first + span) o.early.push(s.price);
    if (s.year > last - span) o.recent.push(s.price);
  }
  const out = {};
  for (const [code, o] of Object.entries(acc)) {
    const early = median(o.early);
    const recent = median(o.recent);
    out[code] = {
      medianPriceEarly: early,
      medianPriceRecent: recent,
      priceChange: early && recent ? Math.round((recent / early - 1) * 1000) / 1000 : null,
      salesRecent: o.recent.length,
    };
  }
  return { years: [first, last], span, byArea: out };
}

/**
 * Put per-area figures onto census areas as plain numbers, so every tool can
 * use them: deprivation domains, crime per 1,000 residents, house prices.
 */
export function attachLayers(areas, { deprivation = null, crime = null, prices = null, jobs = null, income = null, wards = null } = {}) {
  for (const a of areas) {
    const j = jobs?.byArea?.[a.code];
    if (j) {
      a.jobs = j.jobs;
      a.jobsPerResident = a.residents ? Math.round((j.jobs / a.residents) * 100) / 100 : null;
    }
    const inc = income?.byArea?.[a.code];
    if (inc) {
      a.incomeTotal = inc.incomeTotal ?? null;
      a.incomeAfterHousing = inc.incomeAfterHousing ?? null;
    }
    const w = wards?.byArea?.[a.code];
    if (w) {
      a.ward = w.ward;
      a.wardCode = w.wardCode;
    }
    const d = deprivation?.byArea?.[a.code];
    if (d) Object.assign(a, d);
    const c = crime?.byArea?.[a.code];
    if (crime) {
      const per = (n) => (a.residents ? Math.round(((n || 0) / a.residents) * 1000 * 10) / 10 : null);
      a.crimePer1000 = per(c?.total);
      a.violencePer1000 = per(c?.byCategory?.['violent-crime']);
      a.antisocialPer1000 = per(c?.byCategory?.['anti-social-behaviour']);
      a.burglaryPer1000 = per(c?.byCategory?.burglary);
    }
    const p = prices?.byArea?.[a.code];
    if (p) {
      a.medianPrice = p.medianPriceRecent;
      a.priceChange = p.priceChange;
    }
  }
  return areas;
}
