/**
 * Data sources for `npm run planner -- stats <town> <id|wave1|all>`.
 *
 * Each source turns one free dataset into a stats file (see
 * src/planner/stats.js): figures per neighbourhood (`byArea`), for the whole
 * council (`council`), and sometimes `places` (points with a kind). Ids match
 * the atlas (src/planner/atlas.js). To add a source: an atlas entry first,
 * then a function here, or in its own file in scripts/sources/ (each
 * exports SOURCES; `stats` loads them all, and `wave2` runs those files'
 * sources). Helpers below are exported for them.
 *
 * Every source receives `ctx`: { town, dir, areas (census areas: code,
 * name), homes (lon, lat, w, area), councils ({ name: code }), msoas
 * ({ "Worcester 004": code }), cached(url, file), nomis(dataset, params),
 * fingertips(path), sheet(file, name, maxRows), wards ({ LSOA: wardCode }),
 * gps (practices) }.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/planner/traffic.js';
import { spreadToLsoas } from '../src/planner/stats.js';

export const round = (v, d = 3) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);

/** Shares from a Nomis census table: { field: (category name) => bool } over the "Total" row. */
export function sharesFrom(rows, col, parts) {
  const byArea = {};
  const totals = {};
  for (const r of rows) if (/^Total/.test(r[col])) totals[r.GEOGRAPHY_CODE] = Number(r.OBS_VALUE);
  for (const r of rows) {
    const total = totals[r.GEOGRAPHY_CODE];
    if (!total) continue;
    for (const [field, isPart] of Object.entries(parts)) {
      if (!isPart(r[col])) continue;
      const row = (byArea[r.GEOGRAPHY_CODE] ||= {});
      row[field] = (row[field] || 0) + Number(r.OBS_VALUE) / total;
    }
  }
  for (const row of Object.values(byArea)) for (const f of Object.keys(row)) row[f] = round(row[f]);
  return byArea;
}

/** OS National Grid easting/northing → [lon, lat] (WGS84, to a few metres). */
export function osgbToLonLat(E, N) {
  const a = 6377563.396, b = 6356256.909, F0 = 0.9996012717, lat0 = (49 * Math.PI) / 180, lon0 = (-2 * Math.PI) / 180, N0 = -100000, E0 = 400000;
  const e2 = 1 - (b * b) / (a * a), n = (a - b) / (a + b);
  let lat = lat0, M = 0;
  do {
    lat = (N - N0 - M) / (a * F0) + lat;
    const dl = lat - lat0, sl = lat + lat0;
    M = b * F0 * ((1 + n + (5 / 4) * n ** 2 + (5 / 4) * n ** 3) * dl - (3 * n + 3 * n ** 2 + (21 / 8) * n ** 3) * Math.sin(dl) * Math.cos(sl) + ((15 / 8) * n ** 2 + (15 / 8) * n ** 3) * Math.sin(2 * dl) * Math.cos(2 * sl) - (35 / 24) * n ** 3 * Math.sin(3 * dl) * Math.cos(3 * sl));
  } while (Math.abs(N - N0 - M) >= 0.00001);
  const s = Math.sin(lat), c = Math.cos(lat), t = Math.tan(lat);
  const nu = (a * F0) / Math.sqrt(1 - e2 * s * s), rho = (a * F0 * (1 - e2)) / (1 - e2 * s * s) ** 1.5, eta2 = nu / rho - 1;
  const dE = E - E0;
  const VII = t / (2 * rho * nu), VIII = (t / (24 * rho * nu ** 3)) * (5 + 3 * t * t + eta2 - 9 * t * t * eta2), IX = (t / (720 * rho * nu ** 5)) * (61 + 90 * t * t + 45 * t ** 4);
  const X = 1 / (c * nu), XI = (1 / (c * 6 * nu ** 3)) * (nu / rho + 2 * t * t), XII = (1 / (c * 120 * nu ** 5)) * (5 + 28 * t * t + 24 * t ** 4), XIIA = (1 / (c * 5040 * nu ** 7)) * (61 + 662 * t * t + 1320 * t ** 4 + 720 * t ** 6);
  const phi = lat - VII * dE ** 2 + VIII * dE ** 4 - IX * dE ** 6;
  const lam = lon0 + X * dE - XI * dE ** 3 + XII * dE ** 5 - XIIA * dE ** 7;
  // OSGB36 → WGS84 (Helmert).
  const toXYZ = (p, l, A, B) => { const ee = 1 - (B * B) / (A * A), v = A / Math.sqrt(1 - ee * Math.sin(p) ** 2); return [v * Math.cos(p) * Math.cos(l), v * Math.cos(p) * Math.sin(l), (1 - ee) * v * Math.sin(p)]; };
  const [x1, y1, z1] = toXYZ(phi, lam, a, b);
  const tx = 446.448, ty = -125.157, tz = 542.06, sc = -20.4894e-6, rx = (0.1502 / 3600) * (Math.PI / 180), ry = (0.247 / 3600) * (Math.PI / 180), rz = (0.8421 / 3600) * (Math.PI / 180);
  const x2 = tx + (1 + sc) * x1 - rz * y1 + ry * z1, y2 = ty + rz * x1 + (1 + sc) * y1 - rx * z1, z2 = tz - ry * x1 + rx * y1 + (1 + sc) * z1;
  const A2 = 6378137, B2 = 6356752.3142, ee2 = 1 - (B2 * B2) / (A2 * A2), p = Math.sqrt(x2 * x2 + y2 * y2);
  let la = Math.atan2(z2, p * (1 - ee2)), prev;
  do { prev = la; const v = A2 / Math.sqrt(1 - ee2 * Math.sin(la) ** 2); la = Math.atan2(z2 + ee2 * v * Math.sin(la), p); } while (Math.abs(la - prev) > 1e-12);
  return [round((Math.atan2(y2, x2) * 180) / Math.PI, 6), round((la * 180) / Math.PI, 6)];
}

/** Grid reference like "SO8454" or "SO 84520 54310" → [easting, northing]. */
export function gridRefToEN(ref) {
  const m = String(ref || '').replace(/\s+/g, '').toUpperCase().match(/^([A-HJ-Z])([A-HJ-Z])(\d*)$/);
  if (!m || m[3].length % 2) return null;
  const idx = (ch) => { const i = ch.charCodeAt(0) - 65; return i > 7 ? i - 1 : i; };
  const l1 = idx(m[1]), l2 = idx(m[2]);
  const e100 = ((l1 - 2) % 5) * 5 + (l2 % 5), n100 = 19 - Math.floor(l1 / 5) * 5 - Math.floor(l2 / 5);
  const half = m[3].length / 2, scale = 10 ** (5 - half);
  return [e100 * 100000 + Number(m[3].slice(0, half) || 0) * scale + scale / 2, n100 * 100000 + Number(m[3].slice(half) || 0) * scale + scale / 2];
}

/** [lon, lat] → OS National Grid [easting, northing], by inverting osgbToLonLat (a few metres). */
export function lonLatToEN(lon, lat) {
  // Start near Worcester's scale: 1 degree ≈ 68 km east, 111 km north at 52°N.
  let E = 400000 + (lon + 2) * 68500, N = -100000 + (lat - 49) * 111200;
  for (let i = 0; i < 6; i++) {
    const [lo, la] = osgbToLonLat(E, N);
    E += (lon - lo) * 68500 * Math.cos(((lat - 52) * Math.PI) / 180);
    N += (lat - la) * 111200;
  }
  return [E, N];
}

/** Weighted mean of a grid value per area, sampling each home's cell. */
export function gridPerArea(homes, valueAt) {
  const acc = {};
  for (const h of homes) {
    if (!h.area) continue;
    const v = valueAt(...lonLatToEN(h.lon, h.lat));
    if (!Number.isFinite(v)) continue;
    const a = (acc[h.area] ||= { s: 0, w: 0 });
    a.s += v * (h.w ?? 1);
    a.w += h.w ?? 1;
  }
  return Object.fromEntries(Object.entries(acc).map(([k, { s, w }]) => [k, round(s / w, 2)]));
}

/** Read a Defra PCM 1 km grid CSV (gridcode,x,y,value; x,y are cell centres). */
function pcmGrid(file) {
  const grid = new Map();
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const [code, x, y, v] = line.split(',');
    if (!/^\d+$/.test(code) || v === 'MISSING') continue;
    grid.set(`${Math.floor(Number(x) / 1000)},${Math.floor(Number(y) / 1000)}`, Number(v));
  }
  return (E, N) => grid.get(`${Math.floor(E / 1000)},${Math.floor(N / 1000)}`);
}

const hhmmss = (s) => {
  const m = String(s ?? '').match(/(?:(\d+) days?, )?(\d+):(\d+):(\d+)/);
  return m ? Number(m[1] || 0) * 24 + Number(m[2]) + Number(m[3]) / 60 + Number(m[4]) / 3600 : null;
};

export const SOURCES = {
  async census2021More(ctx) {
    const tables = {
      disability: ['NM_2056_1', 'C2021_DISABILITY_5_NAME', { disabled: (n) => n === 'Disabled under the Equality Act', disabledALot: (n) => /limited a lot/.test(n) }],
      care: ['NM_2057_1', 'C2021_CARER_7_NAME', { carers: (n) => /^Provides (19 hours or less|20 to 49|50 or more)/.test(n), carers50h: (n) => /^Provides 50 or more/.test(n) }],
      tenure: ['NM_2072_1', 'C2021_TENURE_9_NAME', { ownOutright: (n) => n === 'Owned: Owns outright', socialRent: (n) => n === 'Social rented', privateRent: (n) => n === 'Private rented' }],
      rooms: ['NM_2070_1', 'C2021_OCCRAT_BEDROOMS_6_NAME', { overcrowded: (n) => /: -/.test(n) }],
      quals: ['NM_2084_1', 'C2021_HIQUAL_8_NAME', { noQualifications: (n) => n === 'No qualifications', degree: (n) => n === 'Level 4 qualifications or above' }],
      work: ['NM_2083_1', 'C2021_EASTAT_20_NAME', { unemployed2021: (n) => /^Economically active.*: Unemployed$/.test(n), longTermSick: (n) => n === 'Economically inactive: Long-term sick or disabled', retired: (n) => n === 'Economically inactive: Retired' }],
      distance: ['NM_2075_1', 'C2021_TTWDIST_11_NAME', { workUnder5km: (n) => /^(Less than 2km|2km to less than 5km)$/.test(n), workFromHome: (n) => n === 'Works mainly from home', work20kmPlus: (n) => /^(20|30|40|60)km/.test(n) }],
    };
    const byArea = {};
    for (const [dataset, col, parts] of Object.values(tables)) {
      const rows = await ctx.nomis(dataset, { select: `geography_code,${col.toLowerCase()},obs_value` });
      for (const [code, row] of Object.entries(sharesFrom(rows, col, parts))) Object.assign((byArea[code] ||= {}), row);
    }
    return {
      source: 'ONS Census 2021 (TS038, TS039, TS052, TS054, TS058, TS066, TS067) via Nomis', level: 'LSOA', period: '2021',
      fields: { disabled: 'share disabled under the Equality Act', disabledALot: 'share whose day-to-day activities are limited a lot', carers: 'share (5+) giving unpaid care', carers50h: 'share giving 50+ hours unpaid care a week', ownOutright: 'households owning outright', socialRent: 'households renting socially', privateRent: 'households renting privately', overcrowded: 'households with fewer bedrooms than needed', noQualifications: 'share (16+) with no qualifications', degree: 'share (16+) with a degree or equivalent', unemployed2021: 'share (16+) unemployed in 2021', longTermSick: 'share (16+) long-term sick or disabled, not working', retired: 'share (16+) retired', workUnder5km: 'workers travelling under 5 km', workFromHome: 'workers mainly at home', work20kmPlus: 'workers travelling 20 km or more' },
      byArea,
    };
  },

  async population(ctx) {
    const rows = await ctx.nomis('NM_2014_1', { date: '2011,latest', gender: 0, c_age: '200,201,209', select: 'date_name,geography_code,c_age,obs_value' });
    const by = {};
    for (const r of rows) ((by[r.GEOGRAPHY_CODE] ||= {})[`${r.C_AGE}:${r.DATE_NAME}`] = Number(r.OBS_VALUE));
    const latest = String(Math.max(...rows.map((r) => Number(r.DATE_NAME))));
    const change = (o, age) => (o[`${age}:2011`] ? round(o[`${age}:${latest}`] / o[`${age}:2011`] - 1) : null);
    const byArea = Object.fromEntries(Object.entries(by).map(([code, o]) => [code, { population: o[`200:${latest}`], populationChange: change(o, 200), childrenChange: change(o, 201), over65Change: change(o, 209) }]));
    const lad = await ctx.nomis('NM_2014_1', { date: '2011,latest', gender: 0, c_age: '200,201,209', select: 'date_name,c_age,obs_value' }, ctx.town.ladCode);
    const o = Object.fromEntries(lad.map((r) => [`${r.C_AGE}:${r.DATE_NAME}`, Number(r.OBS_VALUE)]));
    return {
      source: 'ONS mid-year population estimates (small areas) via Nomis', level: 'LSOA', period: `2011-${latest}`,
      fields: { population: `residents in ${latest}`, populationChange: `growth since 2011 (share)`, childrenChange: 'change in children 0-15 since 2011', over65Change: 'change in people 65+ since 2011' },
      byArea,
      council: { population2011: o['200:2011'], population: o[`200:${latest}`], year: Number(latest), populationChange: change(o, 200), childrenChange: change(o, 201), over65Change: change(o, 209) },
    };
  },

  async claimants(ctx) {
    const rows = await ctx.nomis('NM_162_1', { date: 'latest,latestMINUS12', gender: 0, age: 0, measure: '1,2', select: 'date_name,geography_code,measure,obs_value' });
    const dates = [...new Set(rows.map((r) => r.DATE_NAME))].sort((x, y) => Date.parse(`1 ${x}`) - Date.parse(`1 ${y}`));
    const [then, now] = [dates[0], dates[dates.length - 1]];
    const by = {};
    for (const r of rows) if (r.OBS_VALUE !== '') ((by[r.GEOGRAPHY_CODE] ||= {})[`${r.MEASURE}:${r.DATE_NAME}`] = Number(r.OBS_VALUE));
    return {
      source: 'ONS claimant count (out-of-work benefits) via Nomis', level: 'LSOA', period: now,
      fields: { claimantRate: `share of 16-64s claiming out-of-work benefits, ${now}`, claimants: `people claiming, ${now}`, claimantChange: `change in claimants since ${then} (share)` },
      byArea: Object.fromEntries(Object.entries(by).map(([code, o]) => [code, { claimantRate: round(o[`2:${now}`] / 100), claimants: o[`1:${now}`] ?? null, claimantChange: o[`1:${then}`] ? round(o[`1:${now}`] / o[`1:${then}`] - 1) : null }])),
    };
  },

  async localHealth(ctx) {
    const indicators = {
      93283: ['lifeExpectancy', 'life expectancy at birth, years (mean of men and women)'],
      94359: ['healthyLifeExpectancy', 'healthy life expectancy at birth, years (mean of men and women)'],
      93252: ['deathsUnder75', 'deaths under 75, all causes (100 = England)'],
      93480: ['preventableDeaths', 'preventable deaths under 75 (100 = England)'],
      93227: ['emergencyAdmissions', 'emergency hospital admissions (100 = England)'],
      93239: ['selfHarmAdmissions', 'self-harm hospital admissions (100 = England)'],
      93240: ['alcoholAdmissions', 'alcohol hospital admissions, narrow (100 = England)'],
      93107: ['year6Obesity', 'Year 6 children with obesity (%)'],
      93280: ['fuelPoverty', 'households in fuel poverty (%)'],
    };
    // MSOA numbers within each council: "004 Barbourne & Rainbow Hill" → "Worcester 004".
    const nameOf = {};
    for (const [council, code] of Object.entries(ctx.councils)) {
      for (const m of await ctx.fingertips(`areas/by_parent_area_code?area_type_id=3&parent_area_code=${code}`)) nameOf[m.Code] = `${council} ${m.Short.slice(0, 3)}`;
    }
    const byMsoa = {};
    const periods = {};
    for (const [id, [field]] of Object.entries(indicators)) {
      const rows = parseCsv(await ctx.fingertipsCsv(`all_data/csv/by_indicator_id?indicator_ids=${id}&child_area_type_id=3&parent_area_type_id=502&parent_area_code=${ctx.county}`));
      const msoa = rows.filter((r) => r['Area Type'] === 'MSOA' && r.Value !== '' && !r.Category);
      const latest = msoa.reduce((m, r) => (r['Time period Sortable'] > m ? r['Time period Sortable'] : m), '');
      periods[field] = msoa.find((r) => r['Time period Sortable'] === latest)?.['Time period'];
      const sums = {};
      for (const r of msoa.filter((x) => x['Time period Sortable'] === latest)) {
        const name = nameOf[r['Area Code']];
        if (!name) continue;
        const s = (sums[name] ||= { t: 0, n: 0 });
        s.t += Number(r.Value);
        s.n += 1;
      }
      for (const [name, { t, n }] of Object.entries(sums)) (byMsoa[name] ||= {})[field] = round(t / n, 2);
    }
    return {
      source: 'OHID Fingertips, Local Health (MSOA)', level: 'MSOA', period: Object.entries(periods).map(([f, p]) => `${f} ${p}`).join('; '),
      fields: Object.fromEntries(Object.values(indicators)),
      byArea: spreadToLsoas(ctx.areas, byMsoa),
    };
  },

  async gpConditions(ctx) {
    const indicators = { 848: 'depression', 241: 'diabetes', 94136: 'obesity', 219: 'hypertension', 90581: 'seriousMentalIllness', 253: 'copd', 90933: 'asthma', 91280: 'smoking', 247: 'dementia' };
    const byPractice = {};
    let period = null;
    for (const [id, field] of Object.entries(indicators)) {
      const rows = parseCsv(await ctx.fingertipsCsv(`all_data/csv/by_indicator_id?indicator_ids=${id}&child_area_type_id=7&parent_area_type_id=502&parent_area_code=${ctx.county}`)).filter((r) => r['Area Type'] === 'GPs' && r.Value !== '');
      const latest = rows.reduce((m, r) => (r['Time period Sortable'] > m ? r['Time period Sortable'] : m), '');
      for (const r of rows.filter((x) => x['Time period Sortable'] === latest)) (byPractice[r['Area Code']] ||= {})[`gp_${field}`] = round(Number(r.Value), 2);
      period ||= rows.find((r) => r['Time period Sortable'] === latest)?.['Time period'];
    }
    // Each neighbourhood takes the figures of its nearest practice (straight
    // line from its homes' centre): where people most likely register.
    const practices = (ctx.gps || []).filter((p) => p.lon != null && byPractice[p.code]);
    const byArea = {};
    for (const a of ctx.areas) {
      const hs = ctx.homes.filter((h) => h.area === a.code);
      if (!hs.length || !practices.length) continue;
      const w = hs.reduce((s, h) => s + (h.w ?? 1), 0);
      const lon = hs.reduce((s, h) => s + h.lon * (h.w ?? 1), 0) / w, lat = hs.reduce((s, h) => s + h.lat * (h.w ?? 1), 0) / w;
      const near = practices.reduce((b, p) => ((p.lon - lon) ** 2 + ((p.lat - lat) * 1.6) ** 2 < (b.lon - lon) ** 2 + ((b.lat - lat) * 1.6) ** 2 ? p : b));
      byArea[a.code] = { ...byPractice[near.code] };
    }
    return {
      source: 'OHID Fingertips, National GP profiles (QOF disease registers)', level: 'GP practice (each neighbourhood: its nearest practice)', period,
      fields: Object.fromEntries(Object.values(indicators).map((f) => [`gp_${f}`, `% of the nearest practice's patients on the ${f} register`])),
      byArea,
      byPractice,
    };
  },

  async airModel(ctx) {
    const no2 = pcmGrid(await ctx.cached('https://uk-air.defra.gov.uk/datastore/pcm/mapno22024.csv', 'pcm-no2-2024.csv'));
    const pm25 = pcmGrid(await ctx.cached('https://uk-air.defra.gov.uk/datastore/pcm/mappm252024g.csv', 'pcm-pm25-2024.csv'));
    const a = gridPerArea(ctx.homes, no2), b = gridPerArea(ctx.homes, pm25);
    return {
      source: 'Defra UK-AIR, modelled background concentrations (PCM), 1 km grid', level: '1 km grid (averaged over each neighbourhood\'s homes)', period: '2024',
      fields: { no2: 'nitrogen dioxide, annual mean µg/m³ (WHO guideline 10)', pm25: 'fine particles PM2.5, annual mean µg/m³ (WHO guideline 5)' },
      byArea: Object.fromEntries(Object.keys({ ...a, ...b }).map((k) => [k, { no2: a[k] ?? null, pm25: b[k] ?? null }])),
    };
  },

  async riverHealth(ctx) {
    const zip = await ctx.cached('https://environment.data.gov.uk/api/file/download?fileDataSetId=c55e170e-3c75-49a5-8026-a961ff94c8e0&fileName=EDM_2025_Storm_Overflow_Annual_Return.zip', 'edm-2025.zip');
    const rows = ctx.sheet(`${zip}::EDM_2025_Storm_Overflow_Annual_Return/EDM 2025 Storm Overflow Annual Return - all water and sewerage companies.xlsx`, ctx.town.waterCompany);
    const h = rows.findIndex((r) => r[0] === 'Unique ID');
    const head = rows[h].map((c) => String(c || ''));
    const col = (re) => head.findIndex((c) => re.test(c));
    const [cId, cSite, cNgr, cWater, cHours, cSpills, cType] = [/^Unique ID/, /^Site Name\n\(WaSC/, /^Outlet Discharge NGR/, /^Receiving Water/, /^Total Duration/, /^Counted spills/, /Asset Type/].map(col);
    const [s, w, n, e] = ctx.town.bbox;
    const places = [];
    for (const r of rows.slice(h + 1)) {
      const en = gridRefToEN(r[cNgr]);
      if (!en) continue;
      const [lon, lat] = osgbToLonLat(...en);
      if (lat < s || lat > n || lon < w || lon > e) continue;
      places.push({ kind: 'overflow', id: `edm/${r[cId]}`, name: r[cSite], lon, lat, water: r[cWater], assetType: r[cType], spills: Number(r[cSpills]) || 0, spillHours: round(hhmmss(r[cHours]), 1) });
    }
    const total = places.reduce((t, p) => t + p.spillHours, 0);
    return {
      source: `Environment Agency, Event Duration Monitoring: storm overflow annual return (${ctx.town.waterCompany})`, level: 'outfall', period: '2025',
      fields: {},
      council: { overflows: places.length, spills: places.reduce((t, p) => t + p.spills, 0), spillHours: round(total, 0), severnSpillHours: round(places.filter((p) => /SEVERN/i.test(p.water || '')).reduce((t, p) => t + p.spillHours, 0), 0) },
      places,
    };
  },

  async childPoverty(ctx) {
    const ods = await ctx.cached('https://assets.publishing.service.gov.uk/media/69b809619d8b52961a62b49a/children-in-low-income-families-local-area-statistics-2022-2025.ods', 'cilif-2025.ods');
    const wardRows = ctx.sheet(ods, '4_AHC_Relative_Ward');
    const byWard = Object.fromEntries(wardRows.filter((r) => /^E05/.test(r[3] || '')).map((r) => [r[3], round(Number(r[7]))]));
    const la = ctx.sheet(ods, '2_AHC_Relative_LA').find((r) => r.includes(ctx.town.ladCode));
    const byArea = {};
    for (const a of ctx.areas) if (byWard[ctx.wards[a.code]] != null) byArea[a.code] = { childPoverty: byWard[ctx.wards[a.code]] };
    return {
      source: 'DWP, Children in low income families (after housing costs)', level: 'ward (May 2024)', period: 'FYE 2025',
      fields: { childPoverty: 'share of children under 16 in relative low income after housing costs' },
      byArea,
      council: la ? { childPoverty: round(la.filter((c) => typeof c === 'number').pop()) } : null,
    };
  },

  async commuteFlows(ctx) {
    const zip = await ctx.cached('https://www.nomisweb.co.uk/output/census/2021/odwp01ew.zip', 'odwp01ew.zip');
    const mine = new Set(Object.values(ctx.msoas));
    const nameOfCode = Object.fromEntries(Object.entries(ctx.msoas).map(([nm, c]) => [c, nm]));
    const run = spawnSync('unzip', ['-p', zip, 'ODWP01EW_MSOA.csv'], { maxBuffer: 1 << 30, encoding: 'utf8' });
    const flows = {};
    const destinations = {};
    for (const line of run.stdout.split('\n')) {
      const from = line.slice(0, 9);
      if (!mine.has(from)) continue;
      const cells = line.split(',');
      const to = cells[2], count = Number(cells[cells.length - 1]);
      const f = (flows[from] ||= { all: 0, inTown: 0, home: 0, sameMsoa: 0 });
      if (to === '-8') { f.home += count; continue; }
      f.all += count;
      if (mine.has(to)) f.inTown += count;
      if (to === from) f.sameMsoa += count;
      const label = mine.has(to) ? 'within town' : cells[3].replace(/ \d{3}$/, '');
      destinations[label] = (destinations[label] || 0) + count;
    }
    const byMsoa = {};
    for (const [code, f] of Object.entries(flows)) byMsoa[nameOfCode[code]] = { workInTown: round(f.inTown / f.all), workSameMsoa: round(f.sameMsoa / f.all) };
    const total = Object.values(destinations).reduce((t, v) => t + v, 0);
    return {
      source: 'ONS Census 2021 origin-destination, ODWP01EW (MSOA)', level: 'MSOA', period: '2021',
      fields: { workInTown: 'workers whose workplace is in the town', workSameMsoa: 'workers working in their own MSOA' },
      byArea: spreadToLsoas(ctx.areas, byMsoa),
      council: { topDestinations: Object.entries(destinations).sort((x, y) => y[1] - x[1]).slice(0, 12).map(([place, n]) => ({ place, share: round(n / total) })) },
    };
  },

  async pct(ctx) {
    const region = ctx.town.pctRegion;
    if (!region) throw new Error(`${ctx.town.name} has no pctRegion in towns.js`);
    const file = await ctx.cached(`https://media.githubusercontent.com/media/npct/pct-outputs-regional-notR/master/commute/lsoa/${region}/z_attributes.csv`, `pct-${region}-lsoa.csv`);
    const rows = parseCsv(readFileSync(file, 'utf8'));
    const byCode = Object.fromEntries(rows.map((r) => [r.geo_code, r]));
    const byArea = {};
    for (const a of ctx.areas) {
      const r = byCode[a.code];
      if (!r || !Number(r.all)) continue;
      const all = Number(r.all);
      byArea[a.code] = { cycleShare2011: round(Number(r.bicycle) / all), cycleGovTarget: round(Number(r.govtarget_slc) / all), cycleGoDutch: round(Number(r.dutch_slc) / all), cycleEbike: round(Number(r.ebike_slc) / all) };
    }
    return {
      source: 'Propensity to Cycle Tool (commute, LSOA 2011)', level: 'LSOA (2011 boundaries; changed areas missing)', period: 'Census 2011 base',
      fields: { cycleShare2011: 'commuters cycling, 2011', cycleGovTarget: 'commuters who would cycle under the government target', cycleGoDutch: 'commuters who would cycle at Dutch levels', cycleEbike: 'commuters who would cycle with e-bikes' },
      byArea,
    };
  },

  async wellbeing(ctx) {
    const file = await ctx.cached('https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/wellbeing/datasets/headlineestimatesofpersonalwellbeing/april2022tomarch2023localauthority/annualpersonalwellbeingestimatesapril2022tomarch2023.xlsx', 'wellbeing-2023.xlsx');
    const council = {};
    for (const [sheet, field] of [['1 Life satisfaction means', 'lifeSatisfaction'], ['4 Worthwhile means', 'worthwhile'], ['7 Happiness means', 'happiness'], ['10 Anxiety means', 'anxiety']]) {
      const rows = ctx.sheet(file, sheet);
      const head = rows.find((r) => r.some((c) => /^April \d{4} to March \d{4}/.test(String(c || ''))));
      // Each year has a value column then a quality-marker column.
      const yearCols = head.map((c, i) => [String(c || ''), i]).filter(([c, i]) => /^April \d{4} to March \d{4}/.test(c) && head[i - 1] !== c);
      const series = (code) => {
        const r = rows.find((x) => x.includes(code));
        return r ? Object.fromEntries(yearCols.map(([c, i]) => [c.match(/March (\d{4})/)[1], Number(r[i])]).filter(([, v]) => Number.isFinite(v))) : null;
      };
      council[field] = series(ctx.town.ladCode);
      council[`${field}England`] = series('E92000001');
    }
    return {
      source: 'ONS Annual Population Survey, personal well-being by local authority', level: 'council', period: 'years ending March 2012-2023',
      fields: {},
      council,
    };
  },
};

/** What a rated property is used for, from the VOA description. */
export function propertyUse(description) {
  const d = String(description || '').toUpperCase();
  if (/RESTAURANT|CAFE|PUBLIC HOUSE|TAKEAWAY|WINE BAR|NIGHTCLUB|BAR AND/.test(d)) return 'food';
  if (/RETAIL WAREHOUSE|SUPERSTORE|HYPERMARKET/.test(d)) return 'bigShop';
  if (/SHOP|SALON|SHOWROOM|KIOSK|BANK|BETTING|LAUNDERETTE|POST OFFICE/.test(d)) return 'shop';
  if (/OFFICE|SURGERY|CLINIC/.test(d)) return 'office';
  if (/WORKSHOP|WAREHOUSE|FACTORY|WORKS|STORE|INDUSTRIAL|DEPOT|STORAGE/.test(d)) return 'industry';
  if (/HOTEL|GUEST HOUSE|SELF CATERING|HOLIDAY/.test(d)) return 'stay';
  if (/NURSERY|SCHOOL|COLLEGE|HALL|CHURCH|LIBRARY|SPORTS|GYM|LEISURE|CLUB/.test(d)) return 'community';
  return 'other';
}

/** Postcodes → [lon, lat] via postcodes.io, 100 at a time. */
export async function geocodePostcodes(postcodes) {
  const out = {};
  const list = [...new Set(postcodes)];
  for (let i = 0; i < list.length; i += 100) {
    const res = await fetch('https://api.postcodes.io/postcodes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postcodes: list.slice(i, i + 100) }) });
    if (!res.ok) throw new Error(`postcodes.io answered ${res.status}`);
    for (const { query, result } of (await res.json()).result) if (result) out[query] = [result.longitude, result.latitude];
  }
  return out;
}

SOURCES.businessRates = async (ctx) => {
  const zip = await ctx.cached('https://voaratinglists.blob.core.windows.net/downloads/uk-englandwales-ndr-2026-listentries-compiled-epoch-0004-baseline-csv.zip', 'voa-2026-list.zip');
  const districts = new Set(ctx.town.postcodeDistricts || []);
  const run = spawnSync('sh', ['-c', `unzip -p "${zip}" '*listentries*baseline-csv.csv' | grep -E '\\*(${[...districts].join('|')}) '`], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const rows = run.stdout.split('\n').map((l) => l.split('*')).filter((c) => c.length > 18 && districts.has(String(c[14]).split(' ')[0]));
  const where = await geocodePostcodes(rows.map((c) => c[14]));
  // Each property goes to the neighbourhood of the nearest home (postcodes sit among homes).
  const cell = (lon, lat) => `${Math.round(lon * 200)},${Math.round(lat * 300)}`;
  const grid = new Map();
  for (const h of ctx.homes) if (h.area) (grid.get(cell(h.lon, h.lat)) || grid.set(cell(h.lon, h.lat), []).get(cell(h.lon, h.lat))).push(h);
  const areaAt = (lon, lat) => {
    let best = null, bd = Infinity;
    const [cx, cy] = [Math.round(lon * 200), Math.round(lat * 300)];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const h of grid.get(`${cx + dx},${cy + dy}`) || []) {
      const d = (h.lon - lon) ** 2 + ((h.lat - lat) * 1.6) ** 2;
      if (d < bd) { bd = d; best = h.area; }
    }
    return best;
  };
  const places = [];
  const counts = {};
  for (const c of rows) {
    const ll = where[c[14]];
    if (!ll) continue;
    const use = propertyUse(c[5]);
    const area = areaAt(...ll);
    places.push({ kind: `property:${use}`, id: `voa/${c[6]}`, name: c[5].replace(/ AND PREMISES$/, '').toLowerCase(), lon: ll[0], lat: ll[1], rateableValue: Number(c[17]) || null, area });
    if (area) { const k = (counts[area] ||= {}); k[use] = (k[use] || 0) + 1; }
  }
  const byArea = {};
  for (const a of ctx.areas) {
    const k = counts[a.code] || {};
    byArea[a.code] = { shops: k.shop || 0, offices: k.office || 0, workplacesIndustrial: k.industry || 0, foodAndDrink: k.food || 0, ratedProperties: Object.values(k).reduce((t, v) => t + v, 0) };
  }
  const shopValues = places.filter((p) => p.kind === 'property:shop' && p.rateableValue).map((p) => p.rateableValue).sort((x, y) => x - y);
  return {
    source: 'VOA non-domestic rating list 2026 (compiled, epoch 4), located by postcode', level: 'address (postcode centre)', period: '1 April 2026',
    fields: { shops: 'rated shops (and salons, banks, betting shops)', offices: 'rated offices and surgeries', workplacesIndustrial: 'workshops, warehouses, factories', foodAndDrink: 'pubs, restaurants, cafés, takeaways', ratedProperties: 'all rated non-domestic properties' },
    byArea,
    council: { properties: places.length, medianShopRateableValue: shopValues[Math.floor(shopValues.length / 2)] ?? null, postcodeDistricts: [...districts] },
    places,
  };
};

export const WAVES = { wave1: ['wellbeing', 'population', 'census2021More', 'localHealth', 'gpConditions', 'airModel', 'riverHealth', 'childPoverty', 'claimants', 'commuteFlows', 'pct', 'businessRates'] };
