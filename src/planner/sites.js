/**
 * Site suggestions: where would one more food shop (or school, GP, bus stop)
 * bring the most homes within its walking target? Greedy: pick the best
 * spot, count those homes as served, then pick the next.
 *
 * These are prompts for a human to look at, not planning decisions: the
 * spot is a point on a road, with no idea of land, ownership or rents.
 */
import { SERVICE_KINDS } from './osm.js';
import { buildWalkGraph, nearestFrom } from './graph.js';
import { analyseAccess, WALK_M_PER_MIN } from './access.js';

const MAX_SNAP_M = 250;
const MAX_CANDIDATES = 1500;

/**
 * Returns [{ kind, lon, lat, homesGained }] for up to `count`
 * sites. Options: kind (default 'shop'), count (default 3), extraRoads.
 */
export function suggestSites(town, { kind = 'shop', count = 3, extraRoads = [] } = {}) {
  const service = SERVICE_KINDS[kind];
  if (!service) throw new Error(`Unknown service kind "${kind}"`);
  const target = service.targetMin * WALK_M_PER_MIN;
  const graph = buildWalkGraph(town.roads, { extraRoads });

  const sources = [];
  for (const p of town.places) {
    if (p.kind !== kind) continue;
    const s = graph.snap([p.lon, p.lat]);
    if (s && s.metres <= MAX_SNAP_M) sources.push(s);
  }
  const { dist } = nearestFrom(graph, sources);

  // Unserved homes, grouped by the network node they walk from.
  const unserved = new Map(); // node → [[walk-to-node metres, households]...]
  for (const h of town.homes) {
    const w = h.w ?? 1;
    if (w <= 0) continue;
    const s = graph.snap([h.lon, h.lat]);
    if (!s || s.metres > MAX_SNAP_M) continue;
    if (s.metres + dist[s.node] <= target) continue;
    if (!unserved.has(s.node)) unserved.set(s.node, []);
    unserved.get(s.node).push([s.metres, w]);
  }

  const candidates = [...unserved.keys()];
  const stride = Math.max(1, Math.ceil(candidates.length / MAX_CANDIDATES));
  const sampled = candidates.filter((_, i) => i % stride === 0);
  // Which unserved homes each candidate would reach, computed once.
  const reach = sampled.map((node) => {
    const { dist: d } = nearestFrom(graph, [{ node, metres: 0 }], { maxMetres: target });
    const homes = [];
    for (const [hn, offsets] of unserved) {
      if (!Number.isFinite(d[hn])) continue;
      offsets.forEach(([m, w], i) => { if (d[hn] + m <= target) homes.push([`${hn}:${i}`, w]); });
    }
    return { node, homes };
  });

  const served = new Set();
  const sites = [];
  for (let n = 0; n < count; n++) {
    let best = null;
    let bestGain = 0;
    for (const r of reach) {
      let gain = 0;
      for (const [h, w] of r.homes) if (!served.has(h)) gain += w;
      if (gain > bestGain) { bestGain = gain; best = r; }
    }
    if (!best) break;
    for (const [h] of best.homes) served.add(h);
    const [lon, lat] = graph.coords[best.node];
    sites.push({ kind, lon, lat, homesGained: Math.round(bestGain) });
  }
  return sites;
}

/**
 * Score the town once per suggested site and rank the sites by how much each
 * one alone lifts the overall score. Returns the sites, best first, with
 * `scoreBefore`, `scoreAfter` and `scoreGain` added.
 */
export function rankChanges(town, sites, { cellM } = {}) {
  const opts = cellM ? { cellM } : {};
  const before = analyseAccess(town, opts).summary.overallScoreExact;
  return sites
    .map((site, i) => {
      const extraPlaces = [{ id: `proposed-${i}`, kind: site.kind, name: 'Proposed', lon: site.lon, lat: site.lat }];
      const after = analyseAccess(town, { ...opts, extraPlaces }).summary.overallScoreExact;
      return { ...site, scoreBefore: round1(before), scoreAfter: round1(after), scoreGain: round1(after - before) };
    })
    .sort((a, b) => b.scoreGain - a.scoreGain || b.homesGained - a.homesGained);
}

const round1 = (x) => Math.round(x * 10) / 10;

/** Suggested sites as GeoJSON points. */
export function sitesToGeoJson(sites) {
  return {
    type: 'FeatureCollection',
    features: sites.map(({ lon, lat, ...props }, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Math.round(lon * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5] },
      // Rank within its own service: the first shop, first school, …
      properties: { rank: sites.slice(0, i + 1).filter((s) => s.kind === props.kind).length, ...props },
    })),
  };
}
