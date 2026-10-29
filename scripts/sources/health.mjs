/**
 * Wave-2 health sources: NHSBSA prescribing, the CDRC AHAH index, Defra road
 * noise. Loaded automatically by `npm run planner -- stats <town> <id>`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../../src/planner/traffic.js';
import { lonLatToEN, round } from '../planner-sources.mjs';

/** Each neighbourhood takes the value `{...}` of its nearest practice (straight line from its homes' centre). */
export function nearestPracticeByArea(ctx, practices, byPractice) {
  const list = practices.filter((p) => p.lon != null && byPractice[p.code]);
  const byArea = {};
  for (const a of ctx.areas) {
    const hs = ctx.homes.filter((h) => h.area === a.code);
    if (!hs.length || !list.length) continue;
    const w = hs.reduce((s, h) => s + (h.w ?? 1), 0);
    const lon = hs.reduce((s, h) => s + h.lon * (h.w ?? 1), 0) / w, lat = hs.reduce((s, h) => s + h.lat * (h.w ?? 1), 0) / w;
    const d = (p) => (p.lon - lon) ** 2 + ((p.lat - lat) * 1.6) ** 2;
    byArea[a.code] = { ...byPractice[list.reduce((b, p) => (d(p) < d(b) ? p : b)).code] };
  }
  return byArea;
}

/** The newest `n` monthly EPD table names (EPD_YYYYMM or EPD_SNOMED_YYYYMM) from a CKAN package_show result. */
export function latestMonths(pkg, n = 3) {
  return (pkg.result?.resources || []).map((r) => r.name).filter((x) => /^EPD_(SNOMED_)?\d{6}$/.test(x)).sort().slice(-n);
}

/** Monthly items → items per month per 1,000 registered patients, averaged over the months given. */
export function per1000(itemsByMonth, listSize) {
  const months = itemsByMonth.filter((v) => Number.isFinite(v));
  if (!months.length || !(listSize > 0)) return null;
  return round((months.reduce((s, v) => s + v, 0) / months.length / listSize) * 1000, 2);
}

/** 'EPD_202506' → '2025-06'. */
export const ym = (name) => name.replace(/^EPD_(SNOMED_)?(\d{4})(\d{2})$/, '$2-$3');

/**
 * NHSBSA English Prescribing Dataset: antidepressant (BNF 4.3) and opioid
 * analgesic (BNF 4.7.2) items per 1,000 registered patients per month, latest
 * 3 months, per GP practice (each neighbourhood: its nearest practice).
 */
async function prescribing(ctx) {
  const base = 'https://opendata.nhsbsa.net/api/3/action';
  // Since July 2025 the monthly tables are in the SNOMED package (BNF code column: BNF_PRESENTATION_CODE).
  const pkg = JSON.parse(readFileSync(await ctx.cached(`${base}/package_show?id=english-prescribing-dataset-epd-with-snomed-code`, `epd-snomed-package-${new Date().toISOString().slice(0, 7)}.json`), 'utf8'));
  const months = latestMonths(pkg);
  const practices = JSON.parse(readFileSync(path.join(ctx.dir, 'gps.json'), 'utf8')).practices.filter((p) => p.listSize > 0);
  const codes = practices.map((p) => `'${p.code}'`).join(',');
  const classes = { gp_antidepressantsPer1000: '0403', gp_opioidsPer1000: '040702' };
  const items = {};
  for (const [field, prefix] of Object.entries(classes)) {
    for (const m of months) {
      const sql = `SELECT PRACTICE_CODE, SUM(ITEMS) AS items FROM \`${m}\` WHERE PRACTICE_CODE IN (${codes}) AND BNF_PRESENTATION_CODE LIKE '${prefix}%' GROUP BY PRACTICE_CODE`;
      const url = `${base}/datastore_search_sql?resource_id=${m}&sql=${encodeURIComponent(sql)}`;
      const res = JSON.parse(readFileSync(await ctx.cached(url, `epd-${m}-${prefix}-${ctx.town.ladCode}.json`), 'utf8'));
      if (!res.success) throw new Error(`NHSBSA ${m}: ${res.error?.message}`);
      for (const r of res.result.result.records) ((items[r.PRACTICE_CODE] ||= {})[field] ||= []).push(Number(r.items));
    }
  }
  const byPractice = {};
  for (const p of practices) {
    const row = {};
    for (const field of Object.keys(classes)) row[field] = per1000(items[p.code]?.[field] || [], p.listSize);
    if (row.gp_antidepressantsPer1000 != null) byPractice[p.code] = row;
  }
  return {
    source: 'NHSBSA English Prescribing Dataset (list sizes from Fingertips)', level: 'GP practice (each neighbourhood: its nearest practice)', period: `${ym(months[0])} to ${ym(months.at(-1))} (monthly average)`,
    fields: {
      gp_antidepressantsPer1000: "antidepressant items (BNF 4.3) prescribed per month per 1,000 patients registered at the nearest practice",
      gp_opioidsPer1000: "opioid painkiller items (BNF 4.7.2) prescribed per month per 1,000 patients registered at the nearest practice",
    },
    byArea: nearestPracticeByArea(ctx, ctx.gps || [], byPractice),
    byPractice,
  };
}

const AHAH_URL = 'https://data.geods.ac.uk/dataset/8fa47a8b-345c-438d-a8c3-0ac758ee12be/resource/0618360b-0d6f-43fd-95f0-c5217712cb2e/download/ahah_v5_1.csv';
const AHAH_FIELDS = { ahah: 'ahah', ahahPercentile: 'ahah_pct', ahahHealthDomain: 'domain_h', ahahGreenDomain: 'domain_g', ahahAirDomain: 'domain_e', ahahRetailDomain: 'domain_r' };

/** CSV rows of AHAH v5 → { LSOA21: { field: number } } for the LSOAs wanted. */
export function ahahByArea(rows, codes) {
  const want = new Set(codes), byArea = {};
  for (const r of rows) {
    if (!want.has(r.lsoa21cd)) continue;
    const row = {};
    for (const [field, col] of Object.entries(AHAH_FIELDS)) row[field] = round(Number(r[col]), 3);
    byArea[r.lsoa21cd] = row;
  }
  return byArea;
}

/** CDRC Access to Healthy Assets and Hazards (AHAH v5, 2021 LSOAs): overall score and four domains per LSOA. */
async function ahah(ctx) {
  let file;
  for (let i = 0; !file; i++) {
    try { file = await ctx.cached(AHAH_URL, 'ahah-v5.csv'); } catch (e) { if (i >= 3) throw e; await new Promise((r) => setTimeout(r, 3000)); }
  }
  return {
    source: 'CDRC / University of Liverpool, Access to Healthy Assets and Hazards (AHAH v5)', level: 'LSOA (2021)', period: 'AHAH v5',
    fields: {
      ahah: 'overall AHAH score: higher means worse access to healthy assets and more hazards',
      ahahPercentile: 'AHAH percentile among England LSOAs: 100 is the least healthy',
      ahahHealthDomain: 'health services domain (GP, dentist, pharmacy, hospital, leisure): higher is further away / worse',
      ahahGreenDomain: 'green and blue space domain: higher is worse access',
      ahahAirDomain: 'air quality domain (NO2, PM10, SO2): higher is worse',
      ahahRetailDomain: 'unhealthy retail domain (fast food, pubs, gambling, tobacco): higher is more of them close by',
    },
    byArea: ahahByArea(parseCsv(readFileSync(file, 'utf8')), ctx.areas.map((a) => a.code)),
  };
}

/**
 * Minimal GeoTIFF float32 reader: uncompressed, strips or tiles, either byte
 * order. Returns { width, height, data: Float32Array } (row 0 is the top).
 */
export function parseTiff(buf) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const le = v.getUint16(0) === 0x4949;
  const u16 = (o) => v.getUint16(o, le), u32 = (o) => v.getUint32(o, le);
  const tags = {};
  const ifd = u32(4);
  for (let i = 0; i < u16(ifd); i++) {
    const e = ifd + 2 + i * 12, type = u16(e + 2), count = u32(e + 4), size = type === 3 ? 2 : 4;
    const at = count * size <= 4 ? e + 8 : u32(e + 8);
    tags[u16(e)] = Array.from({ length: count }, (_, k) => (type === 3 ? u16(at + k * 2) : u32(at + k * 4)));
  }
  const one = (t, d) => tags[t]?.[0] ?? d;
  const [width, height] = [one(256), one(257)];
  if (one(259, 1) !== 1 || one(258) !== 32 || one(339, 1) !== 3) throw new Error('GeoTIFF is not uncompressed float32');
  const data = new Float32Array(width * height);
  const tiled = tags[322] != null;
  const [tw, th] = tiled ? [one(322), one(323)] : [width, one(278, height)];
  const offsets = tags[tiled ? 324 : 273], across = Math.ceil(width / tw);
  offsets.forEach((o, n) => {
    const x0 = (n % across) * tw, y0 = Math.floor(n / across) * th;
    for (let y = 0; y < th && y0 + y < height; y++) for (let x = 0; x < tw && x0 + x < width; x++) data[(y0 + y) * width + x0 + x] = v.getFloat32(o + (y * tw + x) * 4, le);
  });
  return { width, height, data };
}

/** Weighted share of homes at or above each dB threshold, per area. `noiseAt(home)` gives dB or undefined. */
export function noiseShares(homes, noiseAt, thresholds) {
  const acc = {};
  for (const h of homes) {
    if (!h.area) continue;
    const w = h.w ?? 1, db = noiseAt(h) || 0, a = (acc[h.area] ||= { w: 0, n: thresholds.map(() => 0) });
    a.w += w;
    thresholds.forEach((t, i) => { if (db >= t) a.n[i] += w; });
  }
  return Object.fromEntries(Object.entries(acc).map(([k, a]) => [k, a.n.map((n) => round(n / a.w, 3))]));
}

const NOISE_WCS = 'https://environment.data.gov.uk/spatialdata/road-noise-all-metrics-england-round-4/wcs';
const NOISE_COVERAGE = '562c9d56-7c2d-4d42-83bb-578d6e97a517__Road_Noise_Lden_England_Round_4_All';
const CELL = 10, BLOCK = 4000, GRID_E0 = 82645, GRID_N0 = 5335; // 10 m cells; grid edges at x ≡ 5 (mod 10)

/**
 * Defra strategic noise mapping, round 4 (2022): road noise Lden (all roads)
 * from the open WCS, fetched as 4 km GeoTIFF blocks where the town has homes.
 * Share of homes in ≥55 dB and ≥65 dB, per LSOA.
 */
async function noise(ctx) {
  const blocks = new Map();
  const homes = ctx.homes.filter((h) => h.area).map((h) => {
    const [E, N] = lonLatToEN(h.lon, h.lat), bx = Math.floor((E - GRID_E0) / BLOCK), by = Math.floor((N - GRID_N0) / BLOCK);
    return { ...h, E, N, key: `${bx},${by}` };
  });
  for (const key of new Set(homes.map((h) => h.key))) {
    const [bx, by] = key.split(',').map(Number), x0 = GRID_E0 + bx * BLOCK, y0 = GRID_N0 + by * BLOCK;
    const url = `${NOISE_WCS}?service=WCS&version=2.0.1&request=GetCoverage&coverageId=${NOISE_COVERAGE}&subset=E(${x0},${x0 + BLOCK})&subset=N(${y0},${y0 + BLOCK})&format=image/tiff`;
    const img = parseTiff(readFileSync(await ctx.cached(url, `noise-lden-r4-${x0}-${y0}.tif`)));
    if (img.width !== BLOCK / CELL || img.height !== BLOCK / CELL) throw new Error(`noise block ${key}: unexpected size ${img.width}x${img.height}`);
    blocks.set(key, { img, x0, y1: y0 + BLOCK });
  }
  const noiseAt = (h) => {
    const b = blocks.get(h.key), x = Math.floor((h.E - b.x0) / CELL), y = Math.floor((b.y1 - h.N) / CELL);
    return b.img.data[y * b.img.width + x];
  };
  const shares = noiseShares(homes, noiseAt, [55, 65]);
  return {
    source: 'Defra strategic noise mapping, round 4 (2022), road noise Lden, all roads, 10 m grid', level: '10 m grid (share of each neighbourhood\'s homes)', period: '2022 (round 4)',
    fields: {
      roadNoise55: 'share of homes (0 to 1) with road noise of 55 dB Lden or more (WHO guideline is 53 dB)',
      roadNoise65: 'share of homes (0 to 1) with road noise of 65 dB Lden or more (seriously noisy)',
    },
    byArea: Object.fromEntries(Object.entries(shares).map(([k, [a, b]]) => [k, { roadNoise55: a, roadNoise65: b }])),
  };
}

export const SOURCES = { prescribing, ahah, noise };
