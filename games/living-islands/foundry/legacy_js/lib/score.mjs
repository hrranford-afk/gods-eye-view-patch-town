/* foundry/lib/score.mjs -- the transparent ranking. Kept apart from the metrics so changing a weight never invalidates the cache. */
const q = (v, n = 3) => { const k = 10 ** n; return Math.round(v * k) / k; };
/* ---------- score: transparent weighted sum of desirabilities in [0,1]. Hard gate = playability. Bands are data, edit here. */
const trap = (v, a, b, c, d) => v == null ? 0 : v <= a || v >= d ? 0 : v < b ? (v - a) / (b - a) : v <= c ? 1 : (d - v) / (d - c);
export const SCORE = [
  { key: 'land_fraction', w: 1.0, band: [0.04, 0.09, 0.16, 0.26], f: (x) => x.land_fraction, why: 'enough land to matter, enough sea to row across' },
  { key: 'island_count', w: 1.0, band: [4, 7, 11, 16], f: (x) => x.island_count, why: 'a few to a dozen islands' },
  { key: 'size_spread', w: 1.0, band: [0.3, 0.6, 1.0, 1.5], f: (x) => x.area_cv, why: 'one or two big islands among small ones' },
  { key: 'coast_complexity', w: 0.75, band: [1.05, 1.12, 1.3, 1.8], f: (x) => x.coast_complexity, why: 'ragged enough to have coves, not a fractal' },
  { key: 'sheltered_landings', w: 1.5, band: [0, 2, 6, 40], f: (x) => x.sheltered_landings, why: 'sheltered places to land' },
  { key: 'home_landings', w: 1.0, band: [0, 2, 6, 30], f: (x) => x.landings_home, why: 'a choice of landings on the start island' },
  { key: 'nearest_neighbour_row_min', w: 1.5, band: [0.2, 0.5, 2.5, 6], f: (x) => x.nearest_neighbour_row_min, why: 'a first voyage worth a short row' },
  { key: 'reachable_fraction', w: 1.5, band: [0.3, 0.75, 1, 1.01], f: (x) => x.reachable_fraction, why: 'most islands can be rowed to' },
  { key: 'resource_spread', w: 1.0, band: [0.3, 0.8, 5, 12], f: (x) => x.islands_with_water, why: 'fresh water on a few islands' },
  { key: 'detail', w: 0.75, band: [0.003, 0.009, 0.022, 0.05], f: (x) => x.visual.edge_energy, why: 'enough edge energy to read as varied' },
  { key: 'contrast', w: 0.5, band: [0.03, 0.06, 0.2, 0.4], f: (x) => x.visual.contrast, why: 'land separates from sea' },
  { key: 'palette', w: 0.5, band: [0.5, 0.8, 1.01, 1.02], f: (x) => x.visual.palette_restraint, why: 'stays inside the muted olive/grey/navy target' }
];
export function score(metrics) {
  let tot = 0, wsum = 0; const parts = {};
  for (const s of SCORE) { const d = trap(s.f(metrics), ...s.band); parts[s.key] = q(d, 2); tot += s.w * d; wsum += s.w; }
  return { score: q(tot / wsum, 4), parts };
}

/* ---------- shortlist: greedy maximal-marginal-relevance so the list is varied, not 24 copies of one winner. */
export const MMR = { lambda: 0.3, sigma: 0.7 };
export function features(s) {
  const x = s.metrics;
  return [x.land_fraction / 0.15, x.island_count / 10, x.area_cv / 0.8, (x.coast_complexity - 1) / 0.12, s.home_kind === 'harbour' ? 1 : s.home_kind === 'grass' ? 0 : .5, Math.min(x.sheltered_landings, 8) / 4, (x.nearest_neighbour_row_min || 0) / 1.5, x.max_height_m / 8];
}
export function shortlist(rows, K = 24) {
  const pool = rows.filter((r) => r.playable).map((r) => ({ r, f: features(r) })), chosen = [];
  while (chosen.length < K && pool.length) {
    let bi = -1, bv = -Infinity, bpen = 0;
    pool.forEach((c, i) => { let pen = 0; for (const o of chosen) { const d2 = c.f.reduce((a, v, k) => a + (v - o.f[k]) ** 2, 0); pen = Math.max(pen, Math.exp(-d2 / (2 * MMR.sigma ** 2))); }
      const v = c.r.score - MMR.lambda * pen; if (v > bv || (v === bv && c.r.seed < pool[bi].r.seed)) { bv = v; bi = i; bpen = pen; } });
    const c = pool.splice(bi, 1)[0]; chosen.push({ ...c, adj: q(bv, 4), pen: q(bpen, 3) });
  }
  return chosen.map((c, i) => { const p = Object.entries(c.r.parts).sort((a, b) => b[1] - a[1]);
    return { rank: i + 1, seed: c.r.seed, manifest_hash: c.r.manifest_hash, score: c.r.score, adjusted: c.adj, diversity_penalty: c.pen, home_kind: c.r.home_kind,
      strongest: p.slice(0, 3).map((e) => e[0]), weakest: p.slice(-2).map((e) => e[0] + ' ' + e[1]) }; });
}
