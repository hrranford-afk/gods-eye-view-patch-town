/**
 * Rivers as barriers: where people can cross, which bank each home is on,
 * how much one bank leans on services across the water, and where a new
 * footbridge would help most.
 */
import { SERVICE_KINDS } from './osm.js';
import { buildWalkGraph, metresBetween, nearestFrom } from './graph.js';
import { analyseAccess, WALK_M_PER_MIN } from './access.js';

const MAX_SNAP_M = 250;

/** Do segments ab and cd cross? Planar test on lon/lat, fine at town scale. */
function segmentsCross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

function riverSegments(town, riverName) {
  const segs = [];
  for (const r of town.rivers || []) {
    if (r.name !== riverName) continue;
    for (let k = 1; k < r.coords.length; k++) segs.push([r.coords[k - 1], r.coords[k]]);
  }
  return segs;
}

/**
 * Every road segment that crosses the river, grouped into crossing points
 * (segments within `mergeM` of each other, e.g. a dual carriageway's two
 * sides, count as one). Returns { segments: Set of "wayId:k", crossings }.
 */
export function findCrossings(town, { river = 'River Severn', mergeM = 80 } = {}) {
  const water = riverSegments(town, river);
  const cut = new Set();
  const hits = [];
  for (const road of town.roads) {
    for (let k = 1; k < road.coords.length; k++) {
      const a = road.coords[k - 1];
      const b = road.coords[k];
      if (!water.some(([c, d]) => segmentsCross(a, b, c, d))) continue;
      cut.add(`${road.id}:${k}`);
      hits.push({ name: road.name, walk: road.walk, drive: road.drive ?? road.kind !== 'path', lonLat: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] });
    }
  }
  const crossings = [];
  for (const h of hits) {
    const near = crossings.find((c) => metresBetween(c.lonLat, h.lonLat) < mergeM);
    if (near) {
      near.walk ||= h.walk;
      near.drive ||= h.drive;
      if (!near.name && h.name) near.name = h.name;
    } else crossings.push({ ...h });
  }
  return { segments: cut, crossings };
}

/** Roads with the river-crossing segments removed, split where they were cut. */
function cutRoads(roads, segments) {
  const out = [];
  for (const road of roads) {
    let start = 0;
    for (let k = 1; k <= road.coords.length; k++) {
      if (k === road.coords.length || segments.has(`${road.id}:${k}`)) {
        if (k - start >= 2) {
          out.push({ ...road, nodes: road.nodes.slice(start, k), coords: road.coords.slice(start, k) });
        }
        start = k;
      }
    }
  }
  return out;
}

/** Connected components of a walk graph: Int32Array of component ids per node. */
function components(graph) {
  const comp = new Int32Array(graph.coords.length).fill(-1);
  let id = 0;
  for (let s = 0; s < comp.length; s++) {
    if (comp[s] >= 0) continue;
    const stack = [s];
    comp[s] = id;
    while (stack.length) {
      const u = stack.pop();
      const edges = graph.adj[u];
      for (let k = 0; k < edges.length; k += 2) {
        if (comp[edges[k]] < 0) { comp[edges[k]] = id; stack.push(edges[k]); }
      }
    }
    id++;
  }
  return comp;
}

/**
 * Split the town into banks: walk network with the river crossings removed;
 * the two largest pieces of street network are the banks, named west/east by
 * their average longitude. Returns a function point → 'west' | 'east' | null.
 */
export function bankOf(town, segments) {
  const graph = buildWalkGraph(cutRoads(town.roads, segments));
  const comp = components(graph);
  const weight = new Map();
  const lonSum = new Map();
  comp.forEach((c, i) => {
    weight.set(c, (weight.get(c) || 0) + 1);
    lonSum.set(c, (lonSum.get(c) || 0) + graph.coords[i][0]);
  });
  const [a, b] = [...weight.keys()].sort((x, y) => weight.get(y) - weight.get(x));
  if (b === undefined) return () => null;
  const west = lonSum.get(a) / weight.get(a) < lonSum.get(b) / weight.get(b) ? a : b;
  const east = west === a ? b : a;
  return ([lon, lat]) => {
    const s = graph.snap([lon, lat]);
    if (!s || s.metres > MAX_SNAP_M) return null;
    const c = comp[s.node];
    return c === west ? 'west' : c === east ? 'east' : null;
  };
}

/**
 * The river report: crossings, households per bank, and for each service
 * the share of each bank's households whose nearest one is across the river,
 * with walking minutes.
 */
export function riverReport(town, { river = 'River Severn' } = {}) {
  const { segments, crossings } = findCrossings(town, { river });
  const side = bankOf(town, segments);
  const graph = buildWalkGraph(town.roads);
  const banks = { west: { households: 0, services: {} }, east: { households: 0, services: {} } };
  const homes = town.homes
    .filter((h) => (h.w ?? 1) > 0)
    .map((h) => ({ h, bank: side([h.lon, h.lat]), s: graph.snap([h.lon, h.lat]) }))
    .filter((x) => x.bank && x.s && x.s.metres <= MAX_SNAP_M);
  for (const x of homes) banks[x.bank].households += x.h.w ?? 1;
  for (const kind of Object.keys(SERVICE_KINDS)) {
    const refs = [];
    const sources = [];
    for (const p of town.places) {
      if (p.kind !== kind) continue;
      const s = graph.snap([p.lon, p.lat]);
      if (!s || s.metres > MAX_SNAP_M) continue;
      refs.push(side([p.lon, p.lat]));
      sources.push(s);
    }
    const { dist, from } = nearestFrom(graph, sources);
    const acc = { west: { across: 0, minutes: 0 }, east: { across: 0, minutes: 0 } };
    for (const x of homes) {
      const w = x.h.w ?? 1;
      const net = x.s.metres + dist[x.s.node];
      acc[x.bank].minutes += Math.min(net / WALK_M_PER_MIN, 120) * w;
      if (refs[from[x.s.node]] && refs[from[x.s.node]] !== x.bank) acc[x.bank].across += w;
    }
    for (const b of ['west', 'east']) {
      const hh = banks[b].households || 1;
      banks[b].services[kind] = {
        nearestAcrossRiver: Math.round((acc[b].across / hh) * 100) / 100,
        meanMinutes: Math.round((acc[b].minutes / hh) * 10) / 10,
      };
    }
  }
  for (const b of ['west', 'east']) banks[b].households = Math.round(banks[b].households);
  return {
    river,
    crossings: crossings.map((c) => ({ ...c, lonLat: c.lonLat.map((v) => Math.round(v * 1e5) / 1e5) })),
    walkCrossings: crossings.filter((c) => c.walk).length,
    driveCrossings: crossings.filter((c) => c.drive).length,
    banks,
  };
}

/** Distance in metres from point p to segment ab (local flat projection). */
function metresToSegment(p, a, b) {
  const kx = 111_320 * Math.cos((p[1] * Math.PI) / 180);
  const ky = 110_540;
  const [px, py] = [(p[0] - a[0]) * kx, (p[1] - a[1]) * ky];
  const [bx, by] = [(b[0] - a[0]) * kx, (b[1] - a[1]) * ky];
  const len2 = bx * bx + by * by;
  const t = len2 ? Math.max(0, Math.min(1, (px * bx + py * by) / len2)) : 0;
  return Math.hypot(px - t * bx, py - t * by);
}

/** Household-weighted mean walking minutes, summed over every service. */
function totalMeanMinutes(cells) {
  const homes = cells.reduce((n, c) => n + c.homes, 0) || 1;
  let sum = 0;
  for (const c of cells) for (const m of Object.values(c.minutes)) sum += m * c.homes;
  return sum / homes;
}

/**
 * Best place for a new footbridge: try short links between walkable nodes on
 * opposite banks, at least `minGapM` from any existing crossing, and keep the
 * one that saves the most walking time (household-weighted, summed over the
 * four services). Pass/fail targets hide a bridge's value: it can cut a
 * 31-minute walk to 20 without crossing the 15-minute line. Each candidate
 * costs one full re-score, so candidates are thinned to about `maxCandidates`.
 */
export function bestNewCrossing(town, { river = 'River Severn', maxSpanM = 120, minGapM = 500, maxCandidates = 30, cellM } = {}) {
  const { segments, crossings } = findCrossings(town, { river });
  const side = bankOf(town, segments);
  const water = riverSegments(town, river);
  const graph = buildWalkGraph(town.roads);
  const ids = new Map(); // dense index → OSM node id
  for (const road of town.roads) road.nodes.forEach((id, k) => {
    const i = graph.snap(road.coords[k], 0);
    if (i && i.metres < 0.5) ids.set(i.node, id);
  });
  const nearWater = (p) => water.some(([a, b]) => metresToSegment(p, a, b) < maxSpanM);
  const westNodes = [];
  const eastNodes = [];
  graph.coords.forEach((p, i) => {
    if (!ids.has(i) || !nearWater(p)) return;
    if (crossings.some((c) => metresBetween(c.lonLat, p) < minGapM)) return;
    const b = side(p);
    if (b === 'west') westNodes.push(i); else if (b === 'east') eastNodes.push(i);
  });
  const pairs = [];
  for (const w of westNodes) {
    let best = null;
    for (const e of eastNodes) {
      const d = metresBetween(graph.coords[w], graph.coords[e]);
      if (d <= maxSpanM && (!best || d < best.d)) best = { w, e, d };
    }
    if (best) pairs.push(best);
  }
  // Thin to well-spread candidates along the river.
  const picked = [];
  for (const p of pairs.sort((a, b) => a.d - b.d)) {
    if (picked.every((q) => metresBetween(graph.coords[q.w], graph.coords[p.w]) > 250)) picked.push(p);
    if (picked.length >= maxCandidates) break;
  }
  const opts = cellM ? { cellM } : {};
  const base = analyseAccess(town, opts);
  const before = totalMeanMinutes(base.cells);
  let best = null;
  for (const p of picked) {
    const bridge = {
      id: `proposed-bridge-${p.w}`, kind: 'path', walk: true, drive: false, name: 'Proposed footbridge',
      nodes: [ids.get(p.w), ids.get(p.e)], coords: [graph.coords[p.w], graph.coords[p.e]],
    };
    const run = analyseAccess(town, { ...opts, extraRoads: [bridge] });
    const after = totalMeanMinutes(run.cells);
    if (!best || after < best.after) best = { bridge, after, score: run.summary.overallScoreExact, spanM: Math.round(p.d) };
  }
  if (!best) return null;
  return {
    from: best.bridge.coords[0].map((v) => Math.round(v * 1e5) / 1e5),
    to: best.bridge.coords[1].map((v) => Math.round(v * 1e5) / 1e5),
    spanM: best.spanM,
    candidatesTried: picked.length,
    minutesSavedPerHousehold: Math.round((before - best.after) * 100) / 100,
    households: Math.round(base.cells.reduce((n, c) => n + c.homes, 0)),
    scoreBefore: Math.round(base.summary.overallScoreExact * 10) / 10,
    scoreAfter: Math.round(best.score * 10) / 10,
  };
}
