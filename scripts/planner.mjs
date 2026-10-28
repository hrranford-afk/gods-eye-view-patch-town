#!/usr/bin/env node
/**
 * Town planner command line. See src/planner/AGENTS.md.
 *
 *   npm run planner -- fetch worcester     download OSM data (needs overpass-api.de)
 *   npm run planner -- import worcester f.json   use a scripts/planner-pbf.py cut instead
 *   npm run planner -- census worcester    Census 2021 households + travel to work per neighbourhood
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
import { areasToGeoJson, attachCensus, buildAreas } from '../src/planner/census.js';

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
// Census 2021 tables: households (TS041), usual residents (TS001), travel to work (TS061).
const CENSUS_TABLES = {
  households: ['NM_2059_1', 'geography_code,obs_value'],
  residents: ['NM_2021_1', 'geography_code,c2021_restype_3_name,obs_value'],
  travel: ['NM_2078_1', 'geography_code,c2021_ttwmeth_12_name,obs_value'],
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
  writeFileSync(path.join(dir, 'census.json'), JSON.stringify({ town: town.id, source: 'ONS Census 2021 (TS001, TS041, TS061), LSOA 2021 boundaries', areas }));
  const hh = areas.reduce((t, a) => t + a.households, 0);
  const people = areas.reduce((t, a) => t + a.residents, 0);
  console.log(`[planner] ${areas.length} neighbourhoods, ${hh} households, ${people} residents → ${dir}/census.json`);
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

function analyseTown(id) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const data = JSON.parse(readFileSync(path.join(dir, 'town.json'), 'utf8'));
  // With census.json present, homes are weighted to real household numbers.
  const censusPath = path.join(dir, 'census.json');
  let areas = null;
  if (existsSync(censusPath)) {
    areas = JSON.parse(readFileSync(censusPath, 'utf8')).areas;
    const { unplaced } = attachCensus(data, areas);
    writeFileSync(path.join(dir, 'areas.geojson'), JSON.stringify(areasToGeoJson(areas)));
    console.log(`[planner] Census weights applied (${areas.length} neighbourhoods${unplaced.length ? `, ${unplaced.length} with no mapped buildings` : ''})`);
  } else {
    console.log(`[planner] No census.json: counting each mapped home once (run: npm run planner -- census ${town.id})`);
  }
  const { cells, summary } = analyseAccess(data);
  summary.homesAre = areas ? 'Census 2021 households' : 'mapped residential buildings';
  const sites = Object.keys(SERVICE_KINDS).flatMap((kind) => suggestSites(data, { kind, count: 3 }));
  summary.suggestedSites = sites.map(({ kind, lon, lat, homesGained }) => ({ kind, lonLat: [lon, lat], homesGained }));
  const [best] = rankChanges(data, sites);
  if (best) {
    summary.bestSingleChange = {
      kind: best.kind, lonLat: [best.lon, best.lat], homesGained: best.homesGained,
      scoreBefore: best.scoreBefore, scoreAfter: best.scoreAfter,
    };
  }
  writeFileSync(path.join(dir, 'access.geojson'), JSON.stringify(cellsToGeoJson(cells)));
  writeFileSync(path.join(dir, 'roads.geojson'), JSON.stringify(roadsToGeoJson(data.roads)));
  writeFileSync(path.join(dir, 'places.geojson'), JSON.stringify(placesToGeoJson(data.places)));
  writeFileSync(path.join(dir, 'sites.geojson'), JSON.stringify(sitesToGeoJson(sites)));
  writeFileSync(path.join(dir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  const pct = (x) => `${Math.round(x * 100)}%`;
  console.log(`[planner] ${town.name}: ${summary.homes} homes in ${cells.length} cells, overall score ${summary.overallScore}/100`);
  for (const [kind, share] of Object.entries(summary.shareOfHomesMeetingTarget)) {
    console.log(`  ${kind.padEnd(7)} ${pct(share)} of homes within ${summary.targetsMin[kind]} min walk`);
  }
  for (const s of sites) {
    console.log(`  new ${s.kind.padEnd(6)} at ${s.lat.toFixed(5)}, ${s.lon.toFixed(5)} would serve ${s.homesGained} more homes`);
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
  else if (command === 'analyse' || command === 'analyze') analyseTown(id);
  else if (command === 'towns') console.log(Object.keys(TOWNS).join('\n'));
  else {
    console.log('Usage: npm run planner -- <fetch|import|census|analyse|towns|traffic> [town|region] [file]');
    process.exitCode = command ? 1 : 0;
  }
} catch (err) {
  console.error(`[planner] ${err.message}`);
  process.exitCode = 1;
}
