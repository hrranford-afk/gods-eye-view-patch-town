/**
 * Wave-2 sources, group "security": homelessness, food banks, private rents.
 * Loaded by `npm run planner -- stats <town> <id>` (see planner-sources.mjs).
 */
import { readFileSync } from 'node:fs';
import { round } from '../planner-sources.mjs';

const GOVUK = 'https://www.gov.uk/api/content';
const GIVEFOOD = 'https://www.givefood.org.uk/api/2';
const ONS_RENTS = 'https://www.ons.gov.uk/economy/inflationandpriceindices/datasets/priceindexofprivaterentsukmonthlypricestatistics';
const UA = { 'user-agent': 'patchtown-planner (open-data research)' };

const getJson = async (url) => {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return res.json();
};

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** The "Detailed local authority level tables" attachment of a gov.uk publication (content API JSON), or null. */
export function detailedTables(content) {
  const a = (content?.details?.attachments || []).find((x) => /detailed local authority level tables/i.test(x.title || '') && /\.(ods|xlsx)$/i.test(x.url || ''));
  return a ? { url: a.url, period: a.title.replace(/^.*?:\s*/, '') } : null;
}

/** Index of the first header matching each pattern (headers are collapsed to single spaces). */
export function findColumns(header, patterns) {
  const heads = header.map((h) => String(h ?? '').replace(/\s+/g, ' ').trim());
  return Object.fromEntries(Object.entries(patterns).map(([k, re]) => [k, heads.findIndex((h) => re.test(h))]));
}

/** Pick named columns for area codes from a gov.uk table: { code: { field: number|null } }. */
export function tableByCode(rows, patterns) {
  const at = rows.findIndex((r) => /^Organisation Identification Code/i.test(String(r[0] ?? '')));
  if (at < 0) throw new Error('table header not found');
  const cols = findColumns(rows[at], patterns);
  const out = {};
  for (const r of rows.slice(at + 1)) {
    if (typeof r[0] !== 'string' || !/^E\d{8}$/.test(r[0])) continue;
    out[r[0]] = Object.fromEntries(Object.entries(cols).map(([k, i]) => [k, i < 0 ? null : num(r[i])]));
  }
  return out;
}

/** Statutory homelessness (MHCLG), latest published detailed local authority tables. Council level. */
async function homelessness(ctx) {
  const collection = await getJson(`${GOVUK}/government/collections/homelessness-statistics`);
  let found = null;
  for (const d of collection.links.documents || []) {
    if (!/\/statutory-homelessness-in-england-/.test(d.base_path)) continue;
    found = detailedTables(await getJson(`${GOVUK}${d.base_path}`));
    if (found) break;
  }
  if (!found) throw new Error('no detailed local authority tables found');
  const file = await ctx.cached(found.url, `homelessness-${found.url.split('/').pop()}`);
  const a1 = tableByCode(ctx.sheet(file, 'A1'), { owed: /Owed a prevention or relief duty Total/i, thousands: /^Households in area/i });
  const ta = tableByCode(ctx.sheet(file, 'TA1'), { households: /^Households in TA Total \[note/i, perThousand: /^Households in TA Total \(per thousand\)/i, children: /^Children in TA Total/i });
  const figures = (code) => {
    const a = a1[code] || {};
    const t = ta[code] || {};
    return {
      owedDuty: a.owed,
      owedDutyPer1000: a.owed != null && a.thousands ? round(a.owed / a.thousands, 2) : null,
      tempAccHouseholds: t.households,
      tempAccPer1000: round(t.perThousand, 2),
      tempAccChildren: t.children,
    };
  };
  const pick = (code, prefix = '') => Object.fromEntries(Object.entries(figures(code)).map(([k, v]) => [prefix ? prefix + k[0].toUpperCase() + k.slice(1) : k, v]));
  return {
    source: `MHCLG statutory homelessness, detailed local authority tables (${found.period})`,
    level: 'council', period: found.period,
    fields: {
      owedDuty: `households owed a prevention or relief duty, ${found.period}`,
      owedDutyPer1000: 'households owed a prevention or relief duty per 1,000 households',
      tempAccHouseholds: 'households in temporary accommodation at the end of the period',
      tempAccPer1000: 'households in temporary accommodation per 1,000 households',
      tempAccChildren: 'children living in temporary accommodation at the end of the period',
      englandOwedDuty: 'England: households owed a prevention or relief duty',
      englandOwedDutyPer1000: 'England: households owed a duty per 1,000 households',
      englandTempAccHouseholds: 'England: households in temporary accommodation',
      englandTempAccPer1000: 'England: households in temporary accommodation per 1,000 households',
      englandTempAccChildren: 'England: children in temporary accommodation',
    },
    council: { ...figures(ctx.town.ladCode), ...pick('E92000001', 'england') },
  };
}

/** Distance in metres between two lon/lat points (flat-earth, fine under 10 km). */
export function metres(lon1, lat1, lon2, lat2) {
  const dy = (lat2 - lat1) * 111320;
  const dx = (lon2 - lon1) * 111320 * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/** Share of each area's homes (weight w) within `radius` metres of any point: { area code: share }. */
export function shareWithin(homes, points, radius) {
  const tot = {};
  const near = {};
  for (const h of homes) {
    tot[h.area] = (tot[h.area] || 0) + h.w;
    if (points.some((p) => Math.abs(p.lat - h.lat) < 0.01 && metres(h.lon, h.lat, p.lon, p.lat) <= radius)) near[h.area] = (near[h.area] || 0) + h.w;
  }
  return Object.fromEntries(Object.entries(tot).map(([a, t]) => [a, t ? round((near[a] || 0) / t) : 0]));
}

/** "lat,lng" text → { lat, lon } or null. */
export function parseLatLng(s) {
  const [lat, lon] = String(s || '').split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

/** Food bank organisations and distribution locations (Give Food API), as places inside a bbox [s,w,n,e] widened by `pad` degrees. */
export function foodbankPlaces(foodbanks, locations, bbox, pad = 0) {
  const [s, w, n, e] = bbox;
  const inside = (p) => p && p.lat >= s - pad && p.lat <= n + pad && p.lon >= w - pad && p.lon <= e + pad;
  const places = [];
  for (const f of foodbanks) {
    if (f.closed) continue;
    const p = parseLatLng(f.lat_lng);
    if (inside(p)) places.push({ kind: 'foodbank', id: `givefood/${f.slug}`, name: f.name, network: f.network, org: f.slug, ...p });
  }
  for (const l of locations) {
    const p = parseLatLng(l.lat_lng);
    if (inside(p)) places.push({ kind: 'foodbank', id: `givefood/${l.foodbank.slug}/${l.slug}`, name: `${l.foodbank.name}: ${l.name}`, network: l.foodbank.network, org: l.foodbank.slug, ...p });
  }
  return places;
}

/** Items a food bank is asking for: lines in its published needs text. */
export const itemsNeeded = (needText) => String(needText || '').split('\n').filter((l) => l.trim()).length;

/** Food banks and distribution points near the town (Give Food API, open data; attribution required). Point level. */
async function foodBanks(ctx) {
  const day = new Date().toISOString().slice(0, 10);
  const read = async (path, name) => JSON.parse(readFileSync(await ctx.cached(`${GIVEFOOD}/${path}/?format=json`, `givefood-${name}-${day}.json`), 'utf8'));
  const found = foodbankPlaces(await read('foodbanks', 'foodbanks'), await read('locations', 'locations'), ctx.town.bbox, 0.02);
  for (const org of new Set(found.map((p) => p.org))) {
    const need = (await read(`foodbank/${org}`, `foodbank-${org}`)).need;
    for (const p of found.filter((x) => x.org === org)) p.itemsNeeded = need ? itemsNeeded(need.needs) : null;
  }
  const places = found.map(({ org, ...p }) => p);
  const byArea = {};
  for (const [code, share] of Object.entries(shareWithin(ctx.homes, places, 1000))) byArea[code] = { foodbankWithin1km: share };
  const [s, w, n, e] = ctx.town.bbox;
  const inTown = places.filter((p) => p.lat >= s && p.lat <= n && p.lon >= w && p.lon <= e);
  return {
    source: 'Give Food (givefood.org.uk) food bank data, open API; please credit Give Food',
    level: 'point', period: day,
    fields: { foodbankWithin1km: 'share of homes within 1 km (straight line) of a food bank or distribution point (0 to 1)' },
    byArea,
    council: { foodbankLocations: inTown.length, foodbankOrganisations: new Set(inTown.map((p) => p.id.split('/')[1])).size },
    places,
  };
}

/** Latest ONS PIPR spreadsheet URL from the dataset page HTML. */
export function latestRentsFile(html) {
  const m = /href="(\/file\?uri=[^"]*priceindexofprivaterentsukmonthlypricestatistics[^"]*\.xlsx)"/.exec(html);
  return m ? `https://www.ons.gov.uk${m[1]}` : null;
}

/** Rows of the PIPR sheet for one area code at its latest month: { period, rent, annual, ... }. */
export function latestRents(rows, code) {
  const head = rows.find((r) => r[0] === 'Time period');
  if (!head) throw new Error('rents table header not found');
  const col = (name) => head.indexOf(name);
  const mine = rows.filter((r) => r[1] === code && num(r[col('Rental price')]) != null);
  const r = mine[mine.length - 1];
  if (!r) return null;
  const pct = (name) => round(num(r[col(name)]), 1);
  return {
    period: String(r[0]).slice(0, 7),
    rent: r[col('Rental price')], rent1Bed: num(r[col('Rental price one bed')]), rent2Bed: num(r[col('Rental price two bed')]),
    rent3Bed: num(r[col('Rental price three bed')]), rent4Bed: num(r[col('Rental price four or more bed')]),
    annualChange: pct('Annual change'), region: r[3],
  };
}

/** Average private rents (ONS Price Index of Private Rents), latest month. Council level. */
async function rents(ctx) {
  const page = await (await fetch(ONS_RENTS, { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
  const url = latestRentsFile(page);
  if (!url) throw new Error('rents spreadsheet link not found');
  const file = await ctx.cached(url, `pipr-${url.split('/').slice(-2)[0]}.xlsx`);
  const rows = ctx.sheet(file, 'Table 1');
  const mine = latestRents(rows, ctx.town.ladCode);
  if (!mine) throw new Error(`no rent figures for ${ctx.town.ladCode}`);
  const england = latestRents(rows, 'E92000001');
  const regionRows = rows.filter((r) => r[2] === mine.region && /^E12/.test(String(r[1])));
  const region = regionRows.length ? latestRents(rows, regionRows[0][1]) : null;
  const take = (x, prefix) => Object.fromEntries(Object.entries({ rent: x?.rent, rent1Bed: x?.rent1Bed, rent2Bed: x?.rent2Bed, rent3Bed: x?.rent3Bed, annualChange: x?.annualChange }).map(([k, v]) => [prefix + k[0].toUpperCase() + k.slice(1), v ?? null]));
  return {
    source: 'ONS Price Index of Private Rents, local authority level',
    level: 'council', period: mine.period,
    fields: {
      rent: `average monthly private rent, all homes, ${mine.period} (pounds)`,
      rent1Bed: 'average monthly private rent, one-bedroom homes (pounds)',
      rent2Bed: 'average monthly private rent, two-bedroom homes (pounds)',
      rent3Bed: 'average monthly private rent, three-bedroom homes (pounds)',
      rent4Bed: 'average monthly private rent, four or more bedrooms (pounds)',
      annualChange: 'change in private rents over the last 12 months (%)',
      regionRent: `average monthly private rent in ${mine.region} (pounds)`,
      regionRent1Bed: `average monthly private rent, one-bedroom homes, ${mine.region} (pounds)`,
      regionRent2Bed: `average monthly private rent, two-bedroom homes, ${mine.region} (pounds)`,
      regionRent3Bed: `average monthly private rent, three-bedroom homes, ${mine.region} (pounds)`,
      regionAnnualChange: `change in private rents over 12 months in ${mine.region} (%)`,
      englandRent: 'average monthly private rent in England (pounds)',
      englandRent1Bed: 'average monthly private rent, one-bedroom homes, England (pounds)',
      englandRent2Bed: 'average monthly private rent, two-bedroom homes, England (pounds)',
      englandRent3Bed: 'average monthly private rent, three-bedroom homes, England (pounds)',
      englandAnnualChange: 'change in private rents over 12 months in England (%)',
    },
    council: { rent: mine.rent, rent1Bed: mine.rent1Bed, rent2Bed: mine.rent2Bed, rent3Bed: mine.rent3Bed, rent4Bed: mine.rent4Bed, annualChange: mine.annualChange, ...take(region, 'region'), ...take(england, 'england') },
  };
}

export const SOURCES = { homelessness, foodBanks, rents };
