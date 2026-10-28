/**
 * Walking access: for every home, how far is the nearest food shop, school,
 * GP and bus stop along real paths and roads? Homes are then grouped into a
 * square grid so the map shows neighbourhoods, never individual houses.
 */
import { SERVICE_KINDS } from './osm.js';
import { buildWalkGraph, metresBetween, nearestFrom } from './graph.js';

export const WALK_M_PER_MIN = 80; // ~4.8 km/h, the usual planning figure
const MAX_SNAP_M = 250; // a home further than this from any path is skipped
const MIN_CROW_M = 150; // detour ratios are noise for very short trips

/**
 * Score a town file. Options:
 *   cellM       grid size in metres (default 250)
 *   extraRoads  proposed links to test, same shape as town roads
 *   extraPlaces proposed services, same shape as town places
 * Returns { cells, summary }; see toGeoJson for the published shape.
 */
export function analyseAccess(town, { cellM = 250, extraRoads = [], extraPlaces = [] } = {}) {
  const graph = buildWalkGraph(town.roads, { extraRoads });
  const places = [...town.places, ...extraPlaces];
  const kinds = Object.keys(SERVICE_KINDS);

  const searches = {};
  for (const kind of kinds) {
    const sources = [];
    const refs = [];
    for (const p of places) {
      if (p.kind !== kind) continue;
      const s = graph.snap([p.lon, p.lat]);
      if (!s || s.metres > MAX_SNAP_M) continue;
      sources.push({ node: s.node, metres: s.metres });
      refs.push(p);
    }
    searches[kind] = { ...nearestFrom(graph, sources), refs };
  }

  const lat0 = (town.homes[0]?.lat ?? 52) * Math.PI / 180;
  const dLat = cellM / 111_320;
  const dLon = cellM / (111_320 * Math.cos(lat0));
  const cells = new Map();
  let skipped = 0;

  for (const home of town.homes) {
    // Census weight: households this building stands for (1 without census).
    const w = home.w ?? 1;
    if (w <= 0) continue;
    const pt = [home.lon, home.lat];
    const s = graph.snap(pt);
    if (!s || s.metres > MAX_SNAP_M) { skipped++; continue; }
    const gx = Math.floor(home.lon / dLon);
    const gy = Math.floor(home.lat / dLat);
    const key = `${gx}:${gy}`;
    let cell = cells.get(key);
    if (!cell) {
      cell = { gx, gy, homes: 0, minutes: {}, within: {}, detours: [] };
      for (const kind of kinds) { cell.minutes[kind] = 0; cell.within[kind] = 0; }
      cells.set(key, cell);
    }
    cell.homes += w;
    for (const kind of kinds) {
      const { dist, from, refs } = searches[kind];
      const net = s.metres + dist[s.node];
      const min = Number.isFinite(net) ? net / WALK_M_PER_MIN : 120;
      cell.minutes[kind] += Math.min(min, 120) * w;
      if (min <= SERVICE_KINDS[kind].targetMin) cell.within[kind] += w;
      const ref = refs[from[s.node]];
      if (ref && Number.isFinite(net)) {
        const crow = metresBetween(pt, [ref.lon, ref.lat]);
        if (crow >= MIN_CROW_M) cell.detours.push(net / crow);
      }
    }
  }

  const out = [];
  let metTargets = 0; // home × service pairs within target, unrounded
  let homesScored = 0;
  for (const c of cells.values()) {
    homesScored += c.homes;
    for (const kind of kinds) metTargets += c.within[kind];
    const minutes = {};
    const within = {};
    let scoreSum = 0;
    for (const kind of kinds) {
      minutes[kind] = round1(c.minutes[kind] / c.homes);
      within[kind] = round2(c.within[kind] / c.homes);
      scoreSum += within[kind];
    }
    out.push({
      bbox: [c.gy * dLat, c.gx * dLon, (c.gy + 1) * dLat, (c.gx + 1) * dLon],
      homes: Math.round(c.homes),
      minutes,
      within,
      score: Math.round((scoreSum / kinds.length) * 100),
      detour: c.detours.length ? round2(median(c.detours)) : null,
    });
  }

  const summary = summarise(out, { kinds, skipped, cellM, town, places });
  // Unrounded twin of overallScore, so small changes still rank.
  summary.overallScoreExact = homesScored ? (metTargets / (homesScored * kinds.length)) * 100 : 0;
  return { cells: out, summary };
}

function summarise(cells, { kinds, skipped, cellM, town, places }) {
  const homes = cells.reduce((n, c) => n + c.homes, 0);
  const meeting = {};
  for (const kind of kinds) {
    const ok = cells.reduce((n, c) => n + c.within[kind] * c.homes, 0);
    meeting[kind] = homes ? round2(ok / homes) : 0;
  }
  const weighted = cells.reduce((n, c) => n + c.score * c.homes, 0);
  const centre = (c) => [round5((c.bbox[1] + c.bbox[3]) / 2), round5((c.bbox[0] + c.bbox[2]) / 2)];
  const worst = [...cells]
    .filter((c) => c.homes >= 20)
    .sort((a, b) => a.score - b.score || b.homes - a.homes)
    .slice(0, 10)
    .map((c) => ({ lonLat: centre(c), homes: c.homes, score: c.score, minutes: c.minutes }));
  const severed = [...cells]
    .filter((c) => c.homes >= 20 && c.detour)
    .sort((a, b) => b.detour - a.detour)
    .slice(0, 10)
    .map((c) => ({ lonLat: centre(c), homes: c.homes, detour: c.detour }));
  return {
    town: town.town,
    cellM,
    homes,
    homesSkipped: skipped,
    places: Object.fromEntries(kinds.map((k) => [k, places.filter((p) => p.kind === k).length])),
    targetsMin: Object.fromEntries(kinds.map((k) => [k, SERVICE_KINDS[k].targetMin])),
    shareOfHomesMeetingTarget: meeting,
    overallScore: homes ? Math.round(weighted / homes) : 0,
    worstServedCells: worst,
    mostSeveredCells: severed,
  };
}

/** Grid cells as a GeoJSON FeatureCollection of polygons. */
export function cellsToGeoJson(cells) {
  return {
    type: 'FeatureCollection',
    features: cells.map(({ bbox: [s, w, n, e], ...props }) => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]].map(([x, y]) => [round5(x), round5(y)])],
      },
      properties: props,
    })),
  };
}

/** Roads (minus footpaths, to keep the file light) as GeoJSON lines. */
export function roadsToGeoJson(roads) {
  return {
    type: 'FeatureCollection',
    features: roads
      .filter((r) => r.kind !== 'path' && r.kind !== 'other')
      .map((r) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: r.coords.map(([x, y]) => [round5(x), round5(y)]) },
        properties: { kind: r.kind, name: r.name },
      })),
  };
}

/** Services as GeoJSON points. */
export function placesToGeoJson(places) {
  return {
    type: 'FeatureCollection',
    features: places.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [round5(p.lon), round5(p.lat)] },
      properties: {
        kind: p.kind,
        name: p.name,
        // Official GP practices (gps.json) carry list size and survey results.
        ...(p.listSize ? { listSize: p.listSize, waitAcceptablePct: p.waitAcceptablePct, needsMetPct: p.needsMetPct } : {}),
      },
    })),
  };
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const round1 = (x) => Math.round(x * 10) / 10;
const round2 = (x) => Math.round(x * 100) / 100;
const round5 = (x) => Math.round(x * 1e5) / 1e5;
