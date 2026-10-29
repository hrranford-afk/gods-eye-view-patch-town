#!/usr/bin/env node
/**
 * Town planner command line. See src/planner/AGENTS.md.
 *
 *   npm run planner -- fetch worcester     download OSM data (needs overpass-api.de)
 *   npm run planner -- import worcester f.json   use a scripts/planner-pbf.py cut instead
 *   npm run planner -- census worcester    Census 2021 households + travel to work per neighbourhood
 *   npm run planner -- gps worcester       official GP practices: list sizes, patient survey, locations
 *   npm run planner -- analyse worcester   score walking access, write map files
 *   npm run planner -- traffic west-midlands   yearly DfT traffic counts → time-lapse layer
 *   npm run planner -- towns               list known towns
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getTown, TOWNS } from '../src/planner/towns.js';
import { mergeOverpass, overpassQueries, parseOverpass, SERVICE_KINDS } from '../src/planner/osm.js';
import {
  analyseAccess,
  cellsToGeoJson,
  placesToGeoJson,
  roadsToGeoJson,
} from '../src/planner/access.js';
import { rankChanges, sitesToGeoJson, suggestSites } from '../src/planner/sites.js';
import { buildCountPoints, parseCsv, toTrafficLayerJson } from '../src/planner/traffic.js';
import { areasToGeoJson, attachCensus, attachNeed, buildAreas } from '../src/planner/census.js';
import { bestNewCrossing, riverReport } from '../src/planner/river.js';
import { busReport } from '../src/planner/buses.js';
import { compareScenarios } from '../src/planner/scenarios.js';
import { buildModel } from '../src/planner/model.js';
import { census2011ByArea, growthByArea } from '../src/planner/history.js';
import { runPlan, TOOLS } from '../src/planner/tools.js';
import { atlasStatus, COMPASS } from '../src/planner/atlas.js';
import { collisionsIn, crimeByArea, deprivationByArea, pricesByArea, schoolsFrom } from '../src/planner/layers.js';
import { statSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { metresBetween } from '../src/planner/graph.js';

// Public Overpass servers, tried in turn. PLANNER_OVERPASS_URL (one URL, or
// several separated by commas) replaces this list.
const OVERPASS_URLS = process.env.PLANNER_OVERPASS_URL
  ? process.env.PLANNER_OVERPASS_URL.split(',').map((u) => u.trim()).filter(Boolean)
  : [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ];
const PARALLEL = 3;
const ATTEMPTS = 6;

/** Folder holding one town's files; the app serves it at /planner/<town>/. */
export function townDir(id, root = process.cwd()) {
  return path.join(root, 'public', 'planner', id);
}

async function askOverpass(query, attempt) {
  const url = OVERPASS_URLS[attempt % OVERPASS_URLS.length];
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'gods-eye-view-planner',
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return res.json();
}

async function fetchTown(id) {
  const town = getTown(id);
  const queries = overpassQueries(town);
  console.log(`[planner] Fetching ${town.name} in ${queries.length} pieces from ${OVERPASS_URLS.length} servers (a few minutes)…`);
  // Finished pieces are kept, so a rerun after a failure only fetches the rest.
  const cacheDir = path.join(process.cwd(), '.gev-cache', 'planner', town.id);
  mkdirSync(cacheDir, { recursive: true });
  const cachePath = (q) => path.join(cacheDir, `${createHash('sha1').update(q).digest('hex')}.json`);
  const results = new Array(queries.length);
  let next = 0;
  let done = 0;
  const worker = async (w) => {
    while (next < queries.length) {
      const i = next++;
      if (existsSync(cachePath(queries[i]))) {
        results[i] = JSON.parse(readFileSync(cachePath(queries[i]), 'utf8'));
        console.log(`[planner]   piece ${++done}/${queries.length} (saved earlier)`);
        continue;
      }
      for (let attempt = w; ; attempt++) {
        try {
          results[i] = await askOverpass(queries[i], attempt);
          writeFileSync(cachePath(queries[i]), JSON.stringify(results[i]));
          console.log(`[planner]   piece ${++done}/${queries.length}`);
          break;
        } catch (err) {
          if (attempt - w + 1 >= ATTEMPTS) throw new Error(`piece ${i + 1} failed ${ATTEMPTS} times: ${err.cause?.code || err.message}`);
          console.log(`[planner]   piece ${i + 1}: ${err.cause?.code || err.message}, retrying elsewhere`);
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }
  };
  await Promise.all([...Array(PARALLEL).keys()].map(worker));
  const data = parseOverpass(mergeOverpass(results), town.id);
  const dir = townDir(town.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'town.json'), JSON.stringify(data));
  console.log(`[planner] ${data.roads.length} roads, ${data.places.length} services, ${data.homes.length} homes → ${dir}/town.json`);
}

/** DfT region ids for the AADF bulk download (10 = West Midlands). */
const DFT_REGIONS = { 'west-midlands': 10, 'east-midlands': 8, 'south-west': 1, 'north-west': 5 };

/** Download a region's yearly traffic counts and write the traffic layer file. */
async function trafficRegion(name = 'west-midlands') {
  const id = DFT_REGIONS[name];
  if (!id) throw new Error(`Unknown region "${name}". Known: ${Object.keys(DFT_REGIONS).join(', ')}`);
  const url = `https://storage.googleapis.com/dft-statistics/road-traffic/downloads/aadf/region_id/dft_aadf_region_id_${id}.csv`;
  console.log(`[planner] Downloading DfT traffic counts for ${name}…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`DfT answered ${res.status}`);
  const points = buildCountPoints(parseCsv(await res.text()));
  const layer = toTrafficLayerJson(points, { region: name });
  const dir = path.join(process.cwd(), 'public', 'planner', 'traffic');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(layer));
  const first = layer.pulse[0];
  const last = layer.pulse.at(-1);
  console.log(`[planner] ${layer.points.length} count points, ${first.year}–${last.year}; traffic index ${first.index} → ${last.index}`);
  for (const e of layer.diversions.slice(0, 5)) {
    console.log(`  ${e.from}→${e.to}: ${e.fell.road} (${e.fell.area}) lost ~${e.moved}/day while ${e.rose.road} ${e.km} km away gained`);
  }
  console.log(`[planner] Wrote ${dir}/${name}.json`);
}

const ONS_LSOA_2021 = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Lower_layer_Super_Output_Areas_December_2021_Boundaries_EW_BGC_V5/FeatureServer/0/query';
const NOMIS = 'https://www.nomisweb.co.uk/api/v01/dataset';
// Census 2021 tables: households (TS041), usual residents (TS001), travel to
// work (TS061), general health (TS037), age (TS007A), household deprivation
// (TS011), car or van availability (TS045), household composition (TS003),
// country of birth (TS004), year of arrival (TS015) and English (TS029).
const CENSUS_TABLES = {
  households: ['NM_2059_1', 'geography_code,obs_value'],
  residents: ['NM_2021_1', 'geography_code,c2021_restype_3_name,obs_value'],
  travel: ['NM_2078_1', 'geography_code,c2021_ttwmeth_12_name,obs_value'],
  health: ['NM_2055_1', 'geography_code,c2021_health_6_name,obs_value'],
  age: ['NM_2020_1', 'geography_code,c2021_age_19_name,obs_value'],
  deprivation: ['NM_2031_1', 'geography_code,c2021_dep_6_name,obs_value'],
  cars: ['NM_2063_1', 'geography_code,c2021_cars_5_name,obs_value'],
  composition: ['NM_2023_1', 'geography_code,c2021_hhcomp_15_name,obs_value'],
  birth: ['NM_2024_1', 'geography_code,c2021_cob_12_name,obs_value'],
  arrival: ['NM_2035_1', 'geography_code,c2021_arruk_13_name,obs_value'],
  english: ['NM_2048_1', 'geography_code,c2021_engprf_6_name,obs_value'],
};

/** Download Census 2021 neighbourhoods (LSOAs) covering a town. */
async function censusTown(id) {
  const town = getTown(id);
  const [s, w, n, e] = town.bbox;
  const q = new URLSearchParams({
    geometry: `${w},${s},${e},${n}`, geometryType: 'esriGeometryEnvelope', inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects', outFields: 'LSOA21CD,LSOA21NM', outSR: '4326', f: 'geojson',
  });
  console.log(`[planner] Census 2021 for ${town.name}: neighbourhood boundaries…`);
  const bres = await fetch(`${ONS_LSOA_2021}?${q}`);
  if (!bres.ok) throw new Error(`ONS boundaries answered ${bres.status}`);
  const boundaries = await bres.json();
  const codes = boundaries.features.map((f) => f.properties.LSOA21CD);
  const tables = {};
  for (const [name, [dataset, select]] of Object.entries(CENSUS_TABLES)) {
    tables[name] = [];
    for (let i = 0; i < codes.length; i += 50) {
      const url = `${NOMIS}/${dataset}.data.csv?date=latest&measures=20100&select=${select}&geography=${codes.slice(i, i + 50).join(',')}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Nomis ${dataset} answered ${res.status}`);
      tables[name].push(...parseCsv(await res.text()));
    }
  }
  const areas = buildAreas(boundaries, tables);
  const dir = townDir(town.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'census.json'), JSON.stringify({ town: town.id, source: 'ONS Census 2021 (TS001, TS003, TS004, TS007A, TS011, TS015, TS029, TS037, TS041, TS045, TS061), LSOA 2021 boundaries', areas }));
  const hh = areas.reduce((t, a) => t + a.households, 0);
  const people = areas.reduce((t, a) => t + a.residents, 0);
  console.log(`[planner] ${areas.length} neighbourhoods, ${hh} households, ${people} residents → ${dir}/census.json`);
}

const FINGERTIPS = 'https://fingertips.phe.org.uk/api';
// Fingertips indicators for GP practices: QOF list size; GP Patient Survey
// "waiting time acceptable" and "needs met at last appointment".
const GP_INDICATORS = { listSize: 114, waitAcceptablePct: 94127, needsMetPct: 94129 };

/**
 * Official GP practices for a town: list sizes and patient-survey results
 * (Fingertips), postcodes (NHS ODS directory) and locations (postcodes.io).
 * OpenStreetMap's GP data can be incomplete and mixes in hospital clinics;
 * when gps.json exists, analyse uses these practices as the `gp` services.
 */
async function gpsTown(id) {
  const town = getTown(id);
  if (!town.nhsPracticePrefix) throw new Error(`${town.name} has no nhsPracticePrefix in towns.js`);
  console.log(`[planner] GP practices ${town.nhsPracticePrefix}* for ${town.name}: list sizes and patient survey…`);
  const url = `${FINGERTIPS}/all_data/csv/by_indicator_id?indicator_ids=${Object.values(GP_INDICATORS).join(',')}&child_area_type_id=7&parent_area_type_id=15&parent_area_code=E92000001`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fingertips answered ${res.status}`);
  const latest = new Map(); // code → { indicatorId → row }
  for (const r of parseCsv(await res.text())) {
    if (!r['Area Code']?.startsWith(town.nhsPracticePrefix) || !r.Value || r.Sex !== 'Persons') continue;
    const m = latest.get(r['Area Code']) || {};
    const prev = m[r['Indicator ID']];
    if (!prev || r['Time period Sortable'] > prev['Time period Sortable']) m[r['Indicator ID']] = r;
    latest.set(r['Area Code'], m);
  }
  const newest = [...latest.values()].map((m) => m[GP_INDICATORS.listSize]?.['Time period Sortable']).filter(Boolean).sort().at(-1);
  const practices = [];
  for (const [code, m] of latest) {
    const list = m[GP_INDICATORS.listSize];
    if (!list || list['Time period Sortable'] !== newest) continue; // closed or merged practices drop out
    const ods = await fetch(`https://directory.spineservices.nhs.uk/ORD/2-0-0/organisations/${code}`);
    if (!ods.ok) continue;
    const org = (await ods.json()).Organisation;
    if (org.Status !== 'Active') continue;
    const value = (k) => (m[GP_INDICATORS[k]] ? Math.round(Number(m[GP_INDICATORS[k]].Value) * 10) / 10 : null);
    practices.push({ code, name: list['Area Name'], postcode: org.GeoLoc.Location.PostCode, listSize: Number(list.Value), listYear: list['Time period'], waitAcceptablePct: value('waitAcceptablePct'), needsMetPct: value('needsMetPct') });
  }
  for (let i = 0; i < practices.length; i += 100) {
    const batch = practices.slice(i, i + 100);
    const pc = await fetch('https://api.postcodes.io/postcodes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postcodes: batch.map((p) => p.postcode) }),
    });
    const found = new Map((await pc.json()).result.map((x) => [x.query, x.result]));
    for (const p of batch) {
      const loc = found.get(p.postcode);
      if (loc) { p.lon = loc.longitude; p.lat = loc.latitude; }
    }
  }
  // Keep practices in the town plus a ~2 km margin: people cross the edge.
  const [s, w, n, e] = town.bbox;
  const near = practices.filter((p) => p.lat >= s - 0.02 && p.lat <= n + 0.02 && p.lon >= w - 0.03 && p.lon <= e + 0.03);
  const dir = townDir(town.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'gps.json'), `${JSON.stringify({ source: 'Fingertips (QOF list size, GP Patient Survey), NHS ODS, postcodes.io', practices: near }, null, 1)}\n`);
  console.log(`[planner] ${near.length} active practices in or near ${town.name} (of ${practices.length} ${town.nhsPracticePrefix}*) → ${dir}/gps.json`);
}

/** FSA business types collapsed to the planner's food kinds. */
const FOOD_KINDS = {
  'Takeaway/sandwich shop': 'takeaway',
  'Restaurant/Cafe/Canteen': 'restaurant',
  'Pub/bar/nightclub': 'pub',
  'Retailers - supermarkets/hypermarkets': 'supermarket',
  'Retailers - other': 'smallShop',
  'Mobile caterer': 'mobile',
};

/** Every food business in a town from the Food Standards Agency register. */
async function foodTown(id) {
  const town = getTown(id);
  if (!town.fsaAuthorities) throw new Error(`${town.name} has no fsaAuthorities in towns.js`);
  const [s, w, n, e] = town.bbox;
  const businesses = [];
  for (const la of town.fsaAuthorities) {
    for (let page = 1; ; page++) {
      const res = await fetch(`https://api.ratings.food.gov.uk/Establishments?localAuthorityId=${la}&pageSize=1000&pageNumber=${page}`, { headers: { 'x-api-version': '2' } });
      if (!res.ok) throw new Error(`FSA answered ${res.status}`);
      const { establishments } = await res.json();
      for (const b of establishments) {
        const lat = Number(b.geocode?.latitude);
        const lon = Number(b.geocode?.longitude);
        const kind = FOOD_KINDS[b.BusinessType];
        if (!kind || !lat || lat < s || lat > n || lon < w || lon > e) continue;
        businesses.push({ name: b.BusinessName, kind, rating: b.RatingValue, ratedOn: b.RatingDate?.slice(0, 10) || null, lon, lat });
      }
      if (establishments.length < 1000) break;
    }
  }
  const dir = townDir(town.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'food.json'), JSON.stringify({ source: 'Food Standards Agency, Food Hygiene Rating Scheme', fetchedAt: new Date().toISOString(), businesses }));
  const counts = {};
  for (const b of businesses) counts[b.kind] = (counts[b.kind] || 0) + 1;
  console.log(`[planner] ${businesses.length} food businesses in ${town.name}: ${JSON.stringify(counts)} → ${dir}/food.json`);
}

/** Score every scenario in public/planner/<town>/scenarios/ against the town as it is. */
function scenariosTown(id) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const { data } = prepareTown(town, dir, { quiet: true });
  const scenarioDir = path.join(dir, 'scenarios');
  const scenarios = existsSync(scenarioDir)
    ? readdirSync(scenarioDir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(path.join(scenarioDir, f), 'utf8')))
    : [];
  if (!scenarios.length) throw new Error(`No scenarios in ${scenarioDir}`);
  const busesPath = path.join(dir, 'buses.json');
  const buses = existsSync(busesPath) ? JSON.parse(readFileSync(busesPath, 'utf8')) : undefined;
  const result = compareScenarios(data, scenarios, { buses });
  writeFileSync(path.join(dir, 'scenarios.json'), `${JSON.stringify(result, null, 2)}\n`);
  const b = result.base;
  console.log(`[planner] ${town.name} today: score ${b.overallScore}; GP walk ${b.gp.walkMinutes} min (need-weighted ${b.gp.needWeightedWalkMinutes}), bus-or-walk ${b.gp.busOrWalkMinutes}`);
  for (const r of result.scenarios) {
    const c = r.change;
    const added = r.card.added ? `; new homes: GP ${r.card.added.gp.walkMinutes} min, shop ${r.card.added.shop.walkMinutes}, school ${r.card.added.school.walkMinutes}` : '';
    console.log(`  ${r.name}: score ${c.overallScore >= 0 ? '+' : ''}${c.overallScore}; GP walk ${c.gpWalkMinutes} min, need-weighted ${c.gpNeedWeightedWalkMinutes}${added}`);
  }
  console.log(`[planner] Wrote ${dir}/scenarios.json`);
}

// Census 2011 tables: travel to work (QS701EW), cars (KS404EW), health (KS301EW), population (KS101EW).
const CENSUS_2011 = { travel: 'NM_568_1', cars: 'NM_621_1', health: 'NM_617_1', population: 'NM_144_1' };

/**
 * Old Worcester: new-build home sales since 1995 (Land Registry Price Paid)
 * and Census 2011 for the same neighbourhoods. Writes history.json.
 */
async function historyTown(id) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const census = JSON.parse(readFileSync(path.join(dir, 'census.json'), 'utf8'));
  console.log(`[planner] History for ${town.name}: new-build sales since 1995 (Land Registry)…`);
  const ppd = await fetch(`https://landregistry.data.gov.uk/app/ppd/ppd_data.csv?header=true&limit=all&nb%5B%5D=true&town=${encodeURIComponent(town.name.toUpperCase())}&min_date=1995-01-01`);
  if (!ppd.ok) throw new Error(`Land Registry answered ${ppd.status}`);
  // Only the town's own county: "WORCESTER" also matches Worcester Park, Surrey.
  const rows = parseCsv(await ppd.text()).filter((r) => r.county === town.county);
  const postcodes = [...new Set(rows.map((r) => r.postcode).filter(Boolean))];
  const where = new Map();
  for (let i = 0; i < postcodes.length; i += 100) {
    const res = await fetch('https://api.postcodes.io/postcodes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postcodes: postcodes.slice(i, i + 100) }),
    });
    for (const x of (await res.json()).result) if (x.result) where.set(x.query, [x.result.longitude, x.result.latitude]);
  }
  const sales = rows.filter((r) => where.has(r.postcode)).map((r) => ({
    year: Number(r.deed_date.slice(0, 4)), type: r.property_type, price: Number(r.price_paid),
    lon: where.get(r.postcode)[0], lat: where.get(r.postcode)[1],
  }));
  const growth = growthByArea(census.areas, sales);
  console.log(`[planner] ${sales.length} new homes located (of ${rows.length}); Census 2011…`);
  const codes = census.areas.map((a) => a.code);
  const tables = {};
  for (const [name, dataset] of Object.entries(CENSUS_2011)) {
    tables[name] = [];
    for (let i = 0; i < codes.length; i += 50) {
      const res = await fetch(`${NOMIS}/${dataset}.data.csv?date=latest&measures=20100&rural_urban=0&select=geography_code,cell_name,obs_value&geography=${codes.slice(i, i + 50).join(',')}`);
      if (!res.ok) throw new Error(`Nomis ${dataset} answered ${res.status}`);
      tables[name].push(...parseCsv(await res.text()));
    }
  }
  const then = census2011ByArea(tables);
  writeFileSync(path.join(dir, 'history.json'), JSON.stringify({
    source: 'HM Land Registry Price Paid (new builds since 1995), postcodes.io; ONS Census 2011 (QS701EW, KS404EW, KS301EW, KS101EW)',
    newBuildSales: sales, growth, census2011: then,
  }));
  const matched = codes.filter((c) => then[c]).length;
  console.log(`[planner] Census 2011 matched for ${matched} of ${codes.length} neighbourhoods → ${dir}/history.json`);
}

/** Environment Agency Flood Zones 2 and 3 (rivers and sea) for a town. */
async function floodTown(id) {
  const town = getTown(id);
  const [s, w, n, e] = town.bbox;
  const q = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature',
    typeNames: 'dataset-04532375-a198-476e-985e-0579a0a11b47:Flood_Zones_2_3_Rivers_and_Sea',
    outputFormat: 'application/json', srsName: 'EPSG:4326', count: '10000',
    bbox: `${s},${w},${n},${e},urn:ogc:def:crs:EPSG::4326`,
  });
  const res = await fetch(`https://environment.data.gov.uk/spatialdata/flood-map-for-planning-flood-zones/wfs?${q}`);
  if (!res.ok) throw new Error(`Environment Agency answered ${res.status}`);
  const fc = await res.json();
  // Keep a ring point only if it is ~5 m or more from the last one kept: the
  // survey detail is finer than anything the planner needs.
  const thin = (ring) => ring.filter((c, i) => i === 0 || i === ring.length - 1 || Math.hypot((c[0] - ring[i - 1][0]) * 68_000, (c[1] - ring[i - 1][1]) * 111_000) >= 5);
  const round = (c) => (typeof c[0] === 'number' ? [Math.round(c[0] * 1e5) / 1e5, Math.round(c[1] * 1e5) / 1e5] : typeof c[0][0] === 'number' ? thin(c).map(round) : c.map(round));
  const features = fc.features.map((f) => ({ type: 'Feature', properties: { flood_zone: f.properties.flood_zone }, geometry: { type: f.geometry.type, coordinates: round(f.geometry.coordinates) } }));
  const dir = townDir(town.id);
  writeFileSync(path.join(dir, 'flood.json'), JSON.stringify({ type: 'FeatureCollection', source: 'Environment Agency, Flood Map for Planning (Rivers and Sea), Flood Zones 2 and 3', features }));
  console.log(`[planner] ${features.length} flood zone areas (${features.filter((f) => f.properties.flood_zone === 'FZ3').length} in Zone 3) → ${dir}/flood.json`);
}

/** Point of a planning.data entity: its point field, or the first corner of its shape. */
function entityPoint(e) {
  const m = /POINT \(([-\d.]+) ([-\d.]+)\)/.exec(e.point || '');
  if (m) return [Number(m[1]), Number(m[2])];
  const g = e.geometry;
  if (g?.type === 'Point') return g.coordinates;
  return null;
}

/**
 * Land and heritage from planning.data.gov.uk: the brownfield register
 * (current sites, with homes capacity and permission), listed buildings,
 * conservation areas and air quality management areas. Writes planning.json.
 */
async function planningTown(id) {
  const town = getTown(id);
  const [s, w, n, e] = town.bbox;
  const area = `POLYGON((${w} ${s},${e} ${s},${e} ${n},${w} ${n},${w} ${s}))`;
  const fetchAll = async (dataset, format) => {
    const out = [];
    for (let offset = 0; ; offset += 500) {
      const q = new URLSearchParams({ dataset, geometry: area, geometry_relation: 'intersects', limit: '500', offset: String(offset) });
      const res = await fetch(`https://www.planning.data.gov.uk/entity.${format}?${q}`);
      if (!res.ok) throw new Error(`planning.data ${dataset} answered ${res.status}`);
      const page = await res.json();
      const items = format === 'geojson' ? page.features : page.entities;
      out.push(...items);
      if (items.length < 500) return out;
    }
  };
  console.log(`[planner] Land and heritage for ${town.name} (planning.data.gov.uk)…`);
  const brownfield = (await fetchAll('brownfield-land', 'geojson'))
    .filter((f) => !f.properties['end-date'] && f.geometry?.type === 'Point')
    .map((f) => {
      const p = f.properties;
      const num = (v) => (v == null || v === '' ? null : Number(v));
      return {
        name: p['site-address'] || p.name, reference: p.reference, hectares: num(p.hectares),
        minDwellings: num(p['minimum-net-dwellings']), maxDwellings: num(p['maximum-net-dwellings']),
        permission: p['planning-permission-status'] || null, ownership: p['ownership-status'] || null,
        lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1],
      };
    });
  const listed = (await fetchAll('listed-building', 'json'))
    .map((x) => ({ name: x.name, grade: x['listed-building-grade'] || null, lonLat: entityPoint(x) }))
    .filter((x) => x.lonLat)
    .map(({ lonLat, ...x }) => ({ ...x, lon: lonLat[0], lat: lonLat[1] }));
  const polygons = async (dataset) => ({
    type: 'FeatureCollection',
    features: (await fetchAll(dataset, 'geojson')).filter((f) => !f.properties['end-date'] && f.geometry).map((f) => ({ type: 'Feature', properties: { name: f.properties.name }, geometry: f.geometry })),
  });
  const conservationAreas = await polygons('conservation-area');
  const airQualityAreas = await polygons('air-quality-management-area');
  const dir = townDir(town.id);
  writeFileSync(path.join(dir, 'planning.json'), JSON.stringify({ source: 'planning.data.gov.uk (brownfield land, listed buildings, conservation areas, air quality management areas)', fetchedAt: new Date().toISOString(), brownfield, listed, conservationAreas, airQualityAreas }));
  const homes = brownfield.reduce((t, b) => t + (b.maxDwellings || 0), 0);
  console.log(`[planner] ${brownfield.length} current brownfield sites (up to ${homes} homes), ${listed.length} listed buildings, ${conservationAreas.features.length} conservation areas, ${airQualityAreas.features.length} air quality areas → ${dir}/planning.json`);
}

/** Download a file once per run into .gev-cache/planner (big national files). */
async function cached(url, name) {
  const dir = path.join(process.cwd(), '.gev-cache', 'planner');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  if (!existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

const IOD_2025 = 'https://assets.publishing.service.gov.uk/media/691ded56d140bbbaa59a2a7d/File_7_IoD2025_All_Ranks_Scores_Deciles_Population_Denominators.csv';

/** English Indices of Deprivation 2025 for the town's neighbourhoods → deprivation.json. */
async function deprivationTown(id) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const codes = JSON.parse(readFileSync(path.join(dir, 'census.json'), 'utf8')).areas.map((a) => a.code);
  const rows = parseCsv(readFileSync(await cached(IOD_2025, 'iod2025.csv'), 'utf8'));
  const byArea = deprivationByArea(rows, codes);
  writeFileSync(path.join(dir, 'deprivation.json'), JSON.stringify({ source: 'MHCLG English Indices of Deprivation 2025 (File 7)', byArea }));
  console.log(`[planner] Deprivation 2025 for ${Object.keys(byArea).length} of ${codes.length} neighbourhoods → ${dir}/deprivation.json`);
}

/** The last 12 months of street crime (data.police.uk), counted per neighbourhood → crime.json. */
async function crimeTown(id) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const areas = JSON.parse(readFileSync(path.join(dir, 'census.json'), 'utf8')).areas;
  const [s, w, n, e] = town.bbox;
  const poly = `${s},${w}:${s},${e}:${n},${e}:${n},${w}`;
  const months = (await (await fetch('https://data.police.uk/api/crimes-street-dates')).json()).slice(0, 12).map((d) => d.date);
  const crimes = [];
  for (const m of months) {
    const res = await fetch('https://data.police.uk/api/crimes-street/all-crime', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ poly, date: m }),
    });
    if (!res.ok) throw new Error(`police.uk answered ${res.status} for ${m}`);
    crimes.push(...(await res.json()));
  }
  const byArea = crimeByArea(crimes, areas);
  writeFileSync(path.join(dir, 'crime.json'), JSON.stringify({ source: 'data.police.uk street-level crime (counted per neighbourhood)', months: [months.at(-1), months[0]], byArea }));
  console.log(`[planner] ${crimes.length} crimes, ${months.at(-1)} to ${months[0]}, counted per neighbourhood → ${dir}/crime.json`);
}

const STATS19 = 'https://data.dft.gov.uk/road-accidents-safety-data/dft-road-casualty-statistics-collision-last-5-years.csv';

/** Road collisions in the town over the last 5 years (DfT STATS19) → collisions.json. */
async function collisionsTown(id) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const rows = parseCsv(readFileSync(await cached(STATS19, 'stats19-collisions-5y.csv'), 'utf8'));
  const collisions = collisionsIn(rows, town.bbox);
  writeFileSync(path.join(dir, 'collisions.json'), JSON.stringify({ source: 'DfT road casualty statistics (STATS19), last 5 years', collisions }));
  const by = {};
  for (const c of collisions) by[c.severity] = (by[c.severity] || 0) + 1;
  console.log(`[planner] ${collisions.length} collisions (${JSON.stringify(by)}) → ${dir}/collisions.json`);
}

/** Open schools from the DfE register, with places and pupils, located by postcode → schools.json. */
async function schoolsTown(id) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const day = new Date();
  let file = null;
  for (let back = 0; back < 5 && !file; back++) {
    const d = new Date(day - back * 864e5).toISOString().slice(0, 10).replaceAll('-', '');
    file = await cached(`https://ea-edubase-api-prod.azurewebsites.net/edubase/downloads/public/edubasealldata${d}.csv`, `gias-${d}.csv`).catch(() => null);
  }
  if (!file) throw new Error('Could not download the schools register');
  const schools = schoolsFrom(parseCsv(readFileSync(file, 'latin1')), { la: town.educationAuthority || 'Worcestershire' });
  for (let i = 0; i < schools.length; i += 100) {
    const res = await fetch('https://api.postcodes.io/postcodes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postcodes: schools.slice(i, i + 100).map((x) => x.postcode) }),
    });
    const found = new Map((await res.json()).result.map((x) => [x.query, x.result]));
    for (const x of schools.slice(i, i + 100)) {
      const loc = found.get(x.postcode);
      if (loc) { x.lon = loc.longitude; x.lat = loc.latitude; }
    }
  }
  const [s, w, n, e] = town.bbox;
  const near = schools.filter((x) => x.lat >= s - 0.01 && x.lat <= n + 0.01 && x.lon >= w - 0.015 && x.lon <= e + 0.015);
  writeFileSync(path.join(dir, 'schools.json'), JSON.stringify({ source: 'DfE Get Information About Schools (open establishments)', schools: near }));
  const pupils = near.reduce((t, x) => t + (x.pupils || 0), 0);
  const places = near.reduce((t, x) => t + (x.capacity || 0), 0);
  console.log(`[planner] ${near.length} open schools in or near ${town.name}: ${pupils} pupils, ${places} places → ${dir}/schools.json`);
}

/** Every house sale since 2015 (Land Registry), median prices per neighbourhood → prices.json. */
async function pricesTown(id) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const areas = JSON.parse(readFileSync(path.join(dir, 'census.json'), 'utf8')).areas;
  const res = await fetch(`https://landregistry.data.gov.uk/app/ppd/ppd_data.csv?header=true&limit=all&town=${encodeURIComponent(town.name.toUpperCase())}&min_date=2015-01-01`);
  if (!res.ok) throw new Error(`Land Registry answered ${res.status}`);
  const rows = parseCsv(await res.text()).filter((r) => r.county === town.county && r.transaction_category === 'A');
  const where = new Map();
  const postcodes = [...new Set(rows.map((r) => r.postcode).filter(Boolean))];
  for (let i = 0; i < postcodes.length; i += 100) {
    const pc = await fetch('https://api.postcodes.io/postcodes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postcodes: postcodes.slice(i, i + 100) }),
    });
    for (const x of (await pc.json()).result) if (x.result) where.set(x.query, [x.result.longitude, x.result.latitude]);
  }
  const sales = rows.filter((r) => where.has(r.postcode)).map((r) => ({ year: Number(r.deed_date.slice(0, 4)), price: Number(r.price_paid), lon: where.get(r.postcode)[0], lat: where.get(r.postcode)[1] }));
  const prices = pricesByArea(sales, areas);
  writeFileSync(path.join(dir, 'prices.json'), JSON.stringify({ source: 'HM Land Registry Price Paid (standard sales since 2015)', sales: sales.length, ...prices }));
  console.log(`[planner] ${sales.length} sales ${prices.years.join('–')}, medians for ${Object.keys(prices.byArea).length} neighbourhoods → ${dir}/prices.json`);
}

/** Workplace jobs per neighbourhood (ONS Business Register and Employment Survey) → jobs.json. */
async function jobsTown(id) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const codes = JSON.parse(readFileSync(path.join(dir, 'census.json'), 'utf8')).areas.map((a) => a.code);
  const byArea = {};
  let year = null;
  for (let i = 0; i < codes.length; i += 50) {
    // industry 37748736 = all industries; employment_status 4 = employment; measure 1 = count.
    const res = await fetch(`${NOMIS}/NM_189_1.data.csv?date=latest&industry=37748736&employment_status=4&measure=1&measures=20100&select=date_name,geography_code,obs_value&geography=${codes.slice(i, i + 50).join(',')}`);
    if (!res.ok) throw new Error(`Nomis BRES answered ${res.status}`);
    for (const row of parseCsv(await res.text())) {
      byArea[row.GEOGRAPHY_CODE] = { jobs: Number(row.OBS_VALUE) };
      year = row.DATE_NAME;
    }
  }
  writeFileSync(path.join(dir, 'jobs.json'), JSON.stringify({ source: `ONS Business Register and Employment Survey ${year} (open access, rounded)`, year, byArea }));
  const total = Object.values(byArea).reduce((t, a) => t + a.jobs, 0);
  console.log(`[planner] ${total} jobs in ${Object.keys(byArea).length} neighbourhoods (${year}) → ${dir}/jobs.json`);
}

const INCOME_FYE2023 = 'https://www.ons.gov.uk/file?uri=/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/smallareaincomeestimatesformiddlelayersuperoutputareasenglandandwales/financialyearending2023/datasetfinal.xlsx';

/** Household income by neighbourhood (ONS small area estimates, via scripts/planner-income.py) → income.json. */
async function incomeTown(id) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const xlsx = await cached(INCOME_FYE2023, 'income-fye2023.xlsx');
  const { spawnSync } = await import('node:child_process');
  const run = spawnSync('python3', ['scripts/planner-income.py', xlsx, path.join(dir, 'census.json'), path.join(dir, 'income.json')], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`planner-income.py failed: ${run.stderr || run.stdout}`);
  console.log(`[planner] ${run.stdout.trim()}`);
}

const ASYLUM_SUPPORT = 'https://assets.publishing.service.gov.uk/media/6a85c5e654bcee010d514574/support-local-authority-datasets-jun-2026.xlsx';

/** People seeking asylum supported by the Home Office, per council per quarter (via scripts/planner-asylum.py) → asylum.json. */
async function asylumTown(id) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const xlsx = await cached(ASYLUM_SUPPORT, 'asylum-support-la-jun2026.xlsx');
  const res = await fetch(`${NOMIS}/NM_2021_1.data.csv?date=latest&measures=20100&c2021_restype_3=0&geography=${town.ladCode}&select=obs_value`);
  if (!res.ok) throw new Error(`Nomis answered ${res.status}`);
  const [{ OBS_VALUE: population }] = parseCsv(await res.text());
  const { spawnSync } = await import('node:child_process');
  const run = spawnSync('python3', ['scripts/planner-asylum.py', xlsx, town.ladCode, population, path.join(dir, 'asylum.json')], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`planner-asylum.py failed: ${run.stderr || run.stdout}`);
  console.log(`[planner] ${run.stdout.trim()}`);
}

/**
 * Fetch free datasets into stats/<id>.json (see scripts/planner-sources.mjs):
 * `stats <town> <id>`, `stats <town> wave1` or `stats <town> all`.
 */
async function statsTown(id, which) {
  const { SOURCES, WAVES } = await import('./planner-sources.mjs');
  const town = getTown(id);
  const dir = townDir(town.id);
  const areas = JSON.parse(readFileSync(path.join(dir, 'census.json'), 'utf8')).areas.map(({ code, name }) => ({ code, name }));
  const model = loadModel(dir);
  const homes = model.homes.map(({ lon, lat, w, area }) => ({ lon, lat, w, area }));
  const fingertipsText = async (p) => {
    const res = await fetch(`${FINGERTIPS}/${p}`);
    if (!res.ok) throw new Error(`Fingertips answered ${res.status} for ${p}`);
    return res.text();
  };
  const nomis = async (dataset, params, geography = null) => {
    const rows = [];
    const geos = geography ? [geography] : areas.map((a) => a.code);
    for (let i = 0; i < geos.length; i += 50) {
      const q = new URLSearchParams({ date: 'latest', measures: '20100', ...params, geography: geos.slice(i, i + 50).join(',') });
      const res = await fetch(`${NOMIS}/${dataset}.data.csv?${q}`);
      if (!res.ok) throw new Error(`Nomis ${dataset} answered ${res.status}`);
      rows.push(...parseCsv(await res.text()));
    }
    return rows;
  };
  const allCouncils = Object.fromEntries(JSON.parse(await fingertipsText('areas/by_area_type?area_type_id=501')).map((a) => [a.Name, a.Code]));
  const councils = Object.fromEntries([...new Set(areas.map((a) => a.name.slice(0, -5)))].map((n) => [n, allCouncils[n]]).filter(([, c]) => c));
  const msoas = {};
  for (const code of Object.values(councils)) {
    for (const r of await nomis('NM_2021_1', { c2021_restype_3: 0, select: 'geography_name,geography_code' }, `${code}TYPE152`)) msoas[r.GEOGRAPHY_NAME] = r.GEOGRAPHY_CODE;
  }
  const { spawnSync } = await import('node:child_process');
  const ctx = {
    town, dir, areas, homes, councils, msoas, county: town.countyCode, cached,
    gps: model.places.filter((p) => p.kind === 'gp').map((p) => ({ code: p.id.replace(/^ods\//, ''), lon: p.lon, lat: p.lat })),
    wards: Object.fromEntries(Object.entries(JSON.parse(readFileSync(path.join(dir, 'wards.json'), 'utf8')).byArea).map(([k, w]) => [k, w.wardCode])),
    nomis,
    fingertips: async (p) => JSON.parse(await fingertipsText(p)),
    fingertipsCsv: fingertipsText,
    sheet: (file, name, maxRows) => {
      const run = spawnSync('python3', ['scripts/planner-sheet.py', file, String(name), ...(maxRows ? [String(maxRows)] : [])], { encoding: 'utf8', maxBuffer: 1 << 30 });
      if (run.status !== 0) throw new Error(`planner-sheet.py failed: ${run.stderr}`);
      return JSON.parse(run.stdout);
    },
  };
  const ids = which === 'all' ? Object.keys(SOURCES) : WAVES[which] || [which];
  mkdirSync(path.join(dir, 'stats'), { recursive: true });
  for (const sid of ids) {
    if (!SOURCES[sid]) throw new Error(`Unknown source "${sid}". Known: ${Object.keys(SOURCES).join(', ')}`);
    try {
      const out = await SOURCES[sid](ctx);
      writeFileSync(path.join(dir, 'stats', `${sid}.json`), JSON.stringify({ id: sid, licence: 'OGL', fetchedAt: new Date().toISOString().slice(0, 10), ...out }));
      console.log(`[planner] ${sid}: ${Object.keys(out.byArea || {}).length} neighbourhoods${out.places ? `, ${out.places.length} places` : ''}${out.council ? ', council figures' : ''} → stats/${sid}.json`);
    } catch (e) {
      console.log(`[planner] ${sid}: FAILED (${e.message})`);
    }
  }
}

/** Electoral ward of each neighbourhood (ONS LSOA → ward lookup, May 2024) → wards.json. */
async function wardsTown(id) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const codes = JSON.parse(readFileSync(path.join(dir, 'census.json'), 'utf8')).areas.map((a) => a.code);
  const byArea = {};
  for (let i = 0; i < codes.length; i += 50) {
    const where = `LSOA21CD IN (${codes.slice(i, i + 50).map((c) => `'${c}'`).join(',')})`;
    const q = new URLSearchParams({ where, outFields: 'LSOA21CD,WD24CD,WD24NM', returnGeometry: 'false', f: 'json' });
    const res = await fetch(`https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/LSOA21_WD24_LAD24_EW_LU/FeatureServer/0/query?${q}`);
    if (!res.ok) throw new Error(`ONS lookup answered ${res.status}`);
    for (const f of (await res.json()).features || []) byArea[f.attributes.LSOA21CD] = { ward: f.attributes.WD24NM, wardCode: f.attributes.WD24CD };
  }
  writeFileSync(path.join(dir, 'wards.json'), JSON.stringify({ source: 'ONS LSOA (2021) to Electoral Ward (May 2024) lookup', byArea }));
  console.log(`[planner] ${new Set(Object.values(byArea).map((w) => w.ward)).size} wards for ${Object.keys(byArea).length} neighbourhoods → ${dir}/wards.json`);
}

/** Load the town model from a town folder: town.json plus whatever extras exist. */
export function loadModel(dir) {
  const read = (f) => (existsSync(path.join(dir, f)) ? JSON.parse(readFileSync(path.join(dir, f), 'utf8')) : null);
  const town = read('town.json');
  if (!town) throw new Error(`No town.json in ${dir}`);
  return buildModel({ town, census: read('census.json'), gps: read('gps.json'), buses: read('buses.json'), food: read('food.json'), history: read('history.json'), flood: read('flood.json'), planning: read('planning.json'),
    deprivation: read('deprivation.json'), crime: read('crime.json'), prices: read('prices.json'),
    schools: read('schools.json'), collisions: read('collisions.json'),
    jobs: read('jobs.json'), income: read('income.json'), wards: read('wards.json'),
    stats: existsSync(path.join(dir, 'stats')) ? readdirSync(path.join(dir, 'stats')).filter((f) => f.endsWith('.json')).sort().map((f) => read(`stats/${f}`)) : [],
  });
}

/**
 * Run a plan of tool calls (src/planner/tools.js) against a town and save
 * the named results next to the plan as <plan>.result.json.
 */
function askTown(id, planFile) {
  const town = getTown(id);
  if (!planFile) throw new Error('Usage: npm run planner -- ask <town> <plan.json>  (see npm run planner -- tools)');
  const plan = JSON.parse(readFileSync(planFile, 'utf8'));
  const model = loadModel(townDir(town.id));
  const t0 = Date.now();
  const results = runPlan(model, plan.steps || plan);
  const keep = plan.show || Object.keys(results);
  // Per-home arrays are large and meaningless on their own: keep only summaries.
  const shown = Object.fromEntries(keep.filter((k) => !Array.isArray(results[k]) || typeof results[k][0] !== 'number').map((k) => [k, results[k]]));
  const out = planFile.replace(/\.json$/, '.result.json');
  writeFileSync(out, `${JSON.stringify({ question: plan.question, ranAt: new Date().toISOString(), results: shown }, null, 2)}\n`);
  console.log(`[planner] ${plan.question || 'Plan'}: ${(plan.steps || plan).length} steps in ${((Date.now() - t0) / 1000).toFixed(1)} s → ${out}`);
  for (const k of keep) {
    const r = results[k];
    if (Array.isArray(r) && typeof r[0] === 'number') continue;
    console.log(`  ${k}:`, JSON.stringify(r).slice(0, 600));
  }
}

/** Fetch a source's page once: its HTTP status, or the error, to see if it's reachable from here. */
async function probe(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'gods-eye-view-planner (open data inventory)' } });
    await res.body?.cancel();
    return res.status;
  } catch (e) {
    return e.name === 'TimeoutError' ? 'timeout' : e.cause?.code || e.message;
  }
}

/**
 * What's mapped for a town, by compass theme, and what's still to get.
 * Writes atlas.json. With --check, probes each unmapped source's url.
 */
async function atlasTown(id, { check = false } = {}) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const full = (f) => (f.startsWith('traffic/') ? path.join(process.cwd(), 'public', 'planner', f) : path.join(dir, f));
  const has = (f) => existsSync(full(f));
  const info = (f) => {
    const out = { date: statSync(full(f)).mtime.toISOString().slice(0, 10) };
    try {
      const j = JSON.parse(readFileSync(full(f), 'utf8'));
      out.count = j.features?.length ?? j.areas?.length ?? j.practices?.length ?? j.businesses?.length ?? j.questions?.length ?? j.scenarios?.length ?? j.points?.length ?? j.stops?.length ?? j.collisions?.length ?? j.schools?.length ?? (j.byArea ? Object.keys(j.byArea).length : null) ?? null;
    } catch {
      // Not every file is a list; the date is enough.
    }
    return out;
  };
  const kinds = {};
  if (has('town.json')) for (const p of JSON.parse(readFileSync(full('town.json'), 'utf8')).places) kinds[p.kind] = (kinds[p.kind] || 0) + 1;
  const layers = atlasStatus({ has, kinds, info });
  if (check) {
    for (const l of layers.filter((x) => x.url && x.status !== 'mapped')) l.reachable = await probe(l.url);
  }
  writeFileSync(path.join(dir, 'atlas.json'), `${JSON.stringify({ town: town.id, checkedAt: new Date().toISOString(), layers }, null, 2)}\n`);
  for (const [theme, label] of COMPASS) {
    const rows = layers.filter((l) => l.theme === theme);
    console.log(`\n${label}`);
    for (const l of rows) {
      const todo = l.status === 'missing' ? `  [to map: priority ${l.priority ?? '?'}, ${l.level ?? '?'}${l.access === 'freeAccount' ? ', needs a free account' : ''}${l.reachable != null ? `, ${l.reachable === 200 ? 'reachable' : `answered ${l.reachable}`}` : ''}]` : '';
      console.log(`  ${l.status === 'mapped' ? '✓' : l.status === 'unavailable' ? '×' : '·'} ${l.name}${l.count != null ? ` (${l.count})` : ''} — ${l.source}${todo}`);
    }
  }
  const mapped = layers.filter((l) => l.status === 'mapped').length;
  console.log(`\n[planner] ${mapped} of ${layers.length} layers mapped for ${town.name}${layers.some((l) => l.status === 'unavailable') ? ` (${layers.filter((l) => l.status === 'unavailable').length} not openly available)` : ''} → ${dir}/atlas.json`);
}

/** Print every planner tool and its arguments. */
function listTools() {
  for (const [name, t] of Object.entries(TOOLS)) {
    console.log(`${name}: ${t.about}`);
    for (const [arg, d] of Object.entries(t.args)) console.log(`    ${arg}: ${d}`);
  }
}

/** Turn Overpass-style JSON (e.g. from scripts/planner-pbf.py) into a town file. */
function importTown(id, file) {
  const town = getTown(id);
  if (!file) throw new Error('Usage: npm run planner -- import <town> <overpass.json>');
  const data = parseOverpass(JSON.parse(readFileSync(file, 'utf8')), town.id);
  const dir = townDir(town.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'town.json'), JSON.stringify(data));
  console.log(`[planner] ${data.roads.length} roads, ${data.places.length} services, ${data.homes.length} homes → ${dir}/town.json`);
}

/**
 * Load a town file with everything the town folder offers applied: official
 * GP practices (gps.json), census household weights and need (census.json).
 */
function prepareTown(town, dir, { quiet = false } = {}) {
  const log = quiet ? () => {} : console.log;
  const model = loadModel(dir);
  if (model.areas.length) {
    writeFileSync(path.join(dir, 'areas.geojson'), JSON.stringify(areasToGeoJson(model.areas)));
    log(`[planner] Census weights applied (${model.areas.length} neighbourhoods)`);
  } else {
    log(`[planner] No census.json: counting each mapped home once (run: npm run planner -- census ${town.id})`);
  }
  log(`[planner] Places by kind: ${Object.entries(model.kinds()).map(([k, n]) => `${k} ${n}`).join(', ')}`);
  return { data: model.town, areas: model.areas.length ? model.areas : null };
}

function analyseTown(id) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const { data, areas } = prepareTown(town, dir);
  const { cells, summary } = analyseAccess(data);
  summary.homesAre = areas ? 'Census 2021 households' : 'mapped residential buildings';
  const sites = Object.keys(SERVICE_KINDS).flatMap((kind) => suggestSites(data, { kind, count: 3 }));
  summary.suggestedSites = sites.map(({ kind, lon, lat, homesGained }) => ({ kind, lonLat: [lon, lat], homesGained }));
  if (areas) {
    // Same search, but each household counts by its neighbourhood's need.
    summary.needWeightedGpSites = suggestSites(data, { kind: 'gp', count: 3, byNeed: true })
      .map(({ lon, lat, homesGained, needGained }) => ({ lonLat: [lon, lat], homesGained, needGained }));
  }
  const [best] = rankChanges(data, sites);
  if (best) {
    summary.bestSingleChange = {
      kind: best.kind, lonLat: [best.lon, best.lat], homesGained: best.homesGained,
      scoreBefore: best.scoreBefore, scoreAfter: best.scoreAfter,
    };
  }
  writeFileSync(path.join(dir, 'access.geojson'), JSON.stringify(cellsToGeoJson(cells)));
  writeFileSync(path.join(dir, 'roads.geojson'), JSON.stringify(roadsToGeoJson(data.roads)));
  writeFileSync(path.join(dir, 'cycle.geojson'), JSON.stringify({
    type: 'FeatureCollection',
    features: data.roads.filter((r) => r.cycle).map((r) => ({ type: 'Feature', properties: { cycle: r.cycle, name: r.name }, geometry: { type: 'LineString', coordinates: r.coords.map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]) } })),
  }));
  writeFileSync(path.join(dir, 'places.geojson'), JSON.stringify(placesToGeoJson(data.places)));
  const planningPath = path.join(dir, 'planning.json');
  if (existsSync(planningPath)) {
    // The map layer reads land and heritage straight from planning.json.
    console.log(`[planner] Land and heritage: planning.json present`);
  }
  writeFileSync(path.join(dir, 'vacant.geojson'), JSON.stringify(placesToGeoJson((data.vacant || []).map((v) => ({ ...v, kind: 'vacant' })))));
  writeFileSync(path.join(dir, 'sites.geojson'), JSON.stringify(sitesToGeoJson(sites)));
  // Buses, if a timetable cut exists (scripts/planner-gtfs.py → buses.json).
  const busesPath = path.join(dir, 'buses.json');
  if (existsSync(busesPath)) {
    const report = busReport(data, JSON.parse(readFileSync(busesPath, 'utf8')));
    writeFileSync(path.join(dir, 'bus.json'), JSON.stringify(report));
    const gp = report.services.gp;
    console.log(`[planner] Buses (${report.date}): ${Math.round(report.shareWithFrequentStopNearby * 100)}% of households have ${report.frequentMeans} within 5 min; GP ${gp.walkMinutes} min walking, ${gp.busOrWalkMinutes} by bus or walking`);
  }
  if (data.rivers?.length) {
    // The main river: whichever named river has the most mapped length here.
    const lengths = new Map();
    for (const r of data.rivers) {
      if (!r.name) continue;
      let m = 0;
      for (let k = 1; k < r.coords.length; k++) m += metresBetween(r.coords[k - 1], r.coords[k]);
      lengths.set(r.name, (lengths.get(r.name) || 0) + m);
    }
    const [river] = [...lengths.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    if (river) {
      const report = riverReport(data, { river });
      report.bestNewFootbridge = bestNewCrossing(data, { river });
      writeFileSync(path.join(dir, 'river.json'), `${JSON.stringify(report, null, 2)}\n`);
      const { west, east } = report.banks;
      console.log(`[planner] ${river}: ${report.walkCrossings} walkable / ${report.driveCrossings} drivable crossings; west bank ${west.households} households (GP ${west.services.gp.meanMinutes} min), east ${east.households} (GP ${east.services.gp.meanMinutes} min)`);
    }
  }
  writeFileSync(path.join(dir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  const pct = (x) => `${Math.round(x * 100)}%`;
  console.log(`[planner] ${town.name}: ${summary.homes} homes in ${cells.length} cells, overall score ${summary.overallScore}/100`);
  for (const [kind, share] of Object.entries(summary.shareOfHomesMeetingTarget)) {
    console.log(`  ${kind.padEnd(7)} ${pct(share)} of homes within ${summary.targetsMin[kind]} min walk`);
  }
  for (const s of sites) {
    console.log(`  new ${s.kind.padEnd(6)} at ${s.lat.toFixed(5)}, ${s.lon.toFixed(5)} would serve ${s.homesGained} more homes`);
  }
  for (const s of summary.needWeightedGpSites || []) {
    console.log(`  need-weighted GP at ${s.lonLat[1].toFixed(5)}, ${s.lonLat[0].toFixed(5)}: ${s.homesGained} households, need-weighted ${s.needGained}`);
  }
  if (best) {
    console.log(`[planner] Best single change: a new ${best.kind} at ${best.lat.toFixed(5)}, ${best.lon.toFixed(5)} lifts the town from ${best.scoreBefore} to ${best.scoreAfter}/100`);
  }
  console.log(`[planner] Wrote access, roads, places, sites (.geojson) and summary.json to ${dir}`);
}

const [command, id, file] = process.argv.slice(2);
try {
  if (command === 'fetch') await fetchTown(id);
  else if (command === 'import') importTown(id, file);
  else if (command === 'traffic') await trafficRegion(id);
  else if (command === 'census') await censusTown(id);
  else if (command === 'gps') await gpsTown(id);
  else if (command === 'food') await foodTown(id);
  else if (command === 'scenarios') scenariosTown(id);
  else if (command === 'ask') askTown(id, file);
  else if (command === 'history') await historyTown(id);
  else if (command === 'flood') await floodTown(id);
  else if (command === 'planning') await planningTown(id);
  else if (command === 'deprivation') await deprivationTown(id);
  else if (command === 'crime') await crimeTown(id);
  else if (command === 'collisions') await collisionsTown(id);
  else if (command === 'schools') await schoolsTown(id);
  else if (command === 'prices') await pricesTown(id);
  else if (command === 'jobs') await jobsTown(id);
  else if (command === 'income') await incomeTown(id);
  else if (command === 'asylum') await asylumTown(id);
  else if (command === 'stats') await statsTown(id, process.argv[4] || 'wave1');
  else if (command === 'wards') await wardsTown(id);
  else if (command === 'tools') listTools();
  else if (command === 'atlas') await atlasTown(id, { check: process.argv.includes('--check') });
  else if (command === 'analyse' || command === 'analyze') analyseTown(id);
  else if (command === 'towns') console.log(Object.keys(TOWNS).join('\n'));
  else {
    console.log('Usage: npm run planner -- <fetch|import|census|gps|food|history|flood|planning|deprivation|crime|collisions|schools|prices|jobs|income|asylum|stats|wards|analyse|scenarios|ask|tools|atlas|towns|traffic> [town|region] [file]');
    process.exitCode = command ? 1 : 0;
  }
} catch (err) {
  console.error(`[planner] ${err.message}`);
  process.exitCode = 1;
}
