#!/usr/bin/env node
/**
 * Town planner command line. See src/planner/AGENTS.md.
 *
 *   npm run planner -- fetch worcester     download OSM data (needs overpass-api.de)
 *   npm run planner -- analyse worcester   score walking access, write map files
 *   npm run planner -- towns               list known towns
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getTown, TOWNS } from '../src/planner/towns.js';
import { overpassQuery, parseOverpass, SERVICE_KINDS } from '../src/planner/osm.js';
import {
  analyseAccess,
  cellsToGeoJson,
  placesToGeoJson,
  roadsToGeoJson,
} from '../src/planner/access.js';
import { rankChanges, sitesToGeoJson, suggestSites } from '../src/planner/sites.js';

const OVERPASS_URL = process.env.PLANNER_OVERPASS_URL || 'https://overpass-api.de/api/interpreter';

/** Folder holding one town's files; the app serves it at /planner/<town>/. */
export function townDir(id, root = process.cwd()) {
  return path.join(root, 'public', 'planner', id);
}

async function fetchTown(id) {
  const town = getTown(id);
  console.log(`[planner] Fetching ${town.name} from ${OVERPASS_URL} (can take a minute)…`);
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'gods-eye-view-planner',
    },
    body: new URLSearchParams({ data: overpassQuery(town) }),
  });
  if (!res.ok) throw new Error(`Overpass answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = parseOverpass(await res.json(), town.id);
  const dir = townDir(town.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'town.json'), JSON.stringify(data));
  console.log(`[planner] ${data.roads.length} roads, ${data.places.length} services, ${data.homes.length} homes → ${dir}/town.json`);
}

function analyseTown(id) {
  const town = getTown(id);
  const dir = townDir(town.id);
  const data = JSON.parse(readFileSync(path.join(dir, 'town.json'), 'utf8'));
  const { cells, summary } = analyseAccess(data);
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

const [command, id] = process.argv.slice(2);
try {
  if (command === 'fetch') await fetchTown(id);
  else if (command === 'analyse' || command === 'analyze') analyseTown(id);
  else if (command === 'towns') console.log(Object.keys(TOWNS).join('\n'));
  else {
    console.log('Usage: npm run planner -- <fetch|analyse|towns> [town]');
    process.exitCode = command ? 1 : 0;
  }
} catch (err) {
  console.error(`[planner] ${err.message}`);
  process.exitCode = 1;
}
