/**
 * Walking network built from a town file's roads, with shortest-path search.
 * Distances are metres along the network.
 */

const EARTH_R = 6_371_008.8;
const RAD = Math.PI / 180;

/** Great-circle distance in metres between two [lon, lat] points. */
export function metresBetween(a, b) {
  const dLat = (b[1] - a[1]) * RAD;
  const dLon = (b[0] - a[0]) * RAD;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Build an undirected walking graph. `extraRoads` (same shape as town roads)
 * lets a "what if" proposal add links without touching the town file.
 */
export function buildWalkGraph(roads, { extraRoads = [] } = {}) {
  const index = new Map(); // OSM node id → dense index
  const coords = [];
  const adj = [];
  const nodeIndex = (id, coord) => {
    let i = index.get(id);
    if (i === undefined) {
      i = coords.length;
      index.set(id, i);
      coords.push(coord);
      adj.push([]);
    }
    return i;
  };
  for (const road of [...roads, ...extraRoads]) {
    if (!road.walk) continue;
    for (let k = 1; k < road.nodes.length; k++) {
      const a = nodeIndex(road.nodes[k - 1], road.coords[k - 1]);
      const b = nodeIndex(road.nodes[k], road.coords[k]);
      const w = metresBetween(coords[a], coords[b]);
      adj[a].push(b, w);
      adj[b].push(a, w);
    }
  }
  return { coords, adj, snap: createSnapper(coords) };
}

/** Grid index answering "nearest graph node to this point" in roughly O(1). */
function createSnapper(coords, cellDeg = 0.002) {
  const cells = new Map();
  const key = (x, y) => `${x}:${y}`;
  coords.forEach((c, i) => {
    const k = key(Math.floor(c[0] / cellDeg), Math.floor(c[1] / cellDeg));
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(i);
  });
  return function snap(point, maxRing = 6) {
    const cx = Math.floor(point[0] / cellDeg);
    const cy = Math.floor(point[1] / cellDeg);
    let best = -1;
    let bestD = Infinity;
    for (let ring = 0; ring <= maxRing; ring++) {
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          for (const i of cells.get(key(cx + dx, cy + dy)) || []) {
            const d = metresBetween(point, coords[i]);
            if (d < bestD) { bestD = d; best = i; }
          }
        }
      }
      // A node found in ring r could still lose to one in ring r+1, so stop
      // only once a full extra ring has been searched.
      if (best >= 0 && ring >= 1) break;
    }
    return best < 0 ? null : { node: best, metres: bestD };
  };
}

/**
 * Multi-source Dijkstra. `sources` is [{ node, metres, ref }], where `metres`
 * is the walk from the real place to its snapped node. Returns per-node
 * distance and the `ref` of the nearest source. Nodes further than
 * `maxMetres` are left at Infinity, which keeps local searches cheap.
 */
export function nearestFrom(graph, sources, { maxMetres = Infinity } = {}) {
  const n = graph.coords.length;
  const dist = new Float64Array(n).fill(Infinity);
  const from = new Int32Array(n).fill(-1);
  const heap = new MinHeap();
  sources.forEach((s, r) => {
    if (s.metres < dist[s.node]) {
      dist[s.node] = s.metres;
      from[s.node] = r;
      heap.push(s.metres, s.node);
    }
  });
  while (heap.size) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue;
    const edges = graph.adj[u];
    for (let k = 0; k < edges.length; k += 2) {
      const v = edges[k];
      const nd = d + edges[k + 1];
      if (nd < dist[v] && nd <= maxMetres) {
        dist[v] = nd;
        from[v] = from[u];
        heap.push(nd, v);
      }
    }
  }
  return { dist, from };
}

class MinHeap {
  constructor() { this.keys = []; this.vals = []; }
  get size() { return this.keys.length; }
  push(k, v) {
    const { keys, vals } = this;
    let i = keys.length;
    keys.push(k); vals.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= k) break;
      keys[i] = keys[p]; vals[i] = vals[p]; i = p;
    }
    keys[i] = k; vals[i] = v;
  }
  pop() {
    const { keys, vals } = this;
    const top = [keys[0], vals[0]];
    const k = keys.pop(); const v = vals.pop();
    const n = keys.length;
    if (n) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && keys[c + 1] < keys[c]) c++;
        if (keys[c] >= k) break;
        keys[i] = keys[c]; vals[i] = vals[c]; i = c;
      }
      keys[i] = k; vals[i] = v;
    }
    return top;
  }
}
