/* foundry/lib/analyze.mjs -- spec -> heightfield -> world manifest (islands, coast, landings, channels, resources).
   Everything is a pure function of (spec, cell): same seed, same bytes. Numbers are rounded before hashing. */
import { field, terrain, gameCore, sha } from './world.mjs';

export const FOUNDRY_VERSION = 1;
export const TUNING = {            /* all TUNING, from LI1A_WORLD_CONTRACT.md where it speaks, else an assumption (labelled) */
  tide_range_m: 1.1,               /* game: TIDE_RANGE */
  rocky_window_min: 9, stage_window_min: 30,   /* contract section 2 */
  row_speed_m_min: 66.7,           /* ASSUMPTION: a rowing boat at about 4 km/h (the contract's 12 km/h is the larger voyage boat) */
  draft_m: 0.3,                    /* water must be at least this deep at mean tide: h < -draft */
  shingle_slope_max: 0.30,         /* gentle shingle: rise/run on the shore */
  min_island_m2: 60
};
const q = (v, n = 2) => { const k = 10 ** n; return Math.round(v * k) / k; };

export function arrivalSeed(seed) { return (Math.imul(seed >>> 0, 2246822519) ^ 0x85ebca6b) >>> 0; }
export function cellFor(size) { return size <= 512 ? 2 : Math.ceil(size / 256); }

/* ---------- small grid helpers */
function label(land, nx, nz) {
  const lab = new Int32Array(nx * nz).fill(-1); let n = 0; const st = [];
  for (let s = 0; s < land.length; s++) {
    if (!land[s] || lab[s] >= 0) continue;
    lab[s] = n; st.length = 0; st.push(s);
    while (st.length) {
      const c = st.pop(), x = c % nx, y = (c / nx) | 0;
      if (x > 0 && land[c - 1] && lab[c - 1] < 0) { lab[c - 1] = n; st.push(c - 1); }
      if (x < nx - 1 && land[c + 1] && lab[c + 1] < 0) { lab[c + 1] = n; st.push(c + 1); }
      if (y > 0 && land[c - nx] && lab[c - nx] < 0) { lab[c - nx] = n; st.push(c - nx); }
      if (y < nz - 1 && land[c + nx] && lab[c + nx] < 0) { lab[c + nx] = n; st.push(c + nx); }
    }
    n++;
  }
  return { lab, n };
}
class Heap { constructor() { this.a = []; }
  push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; } }

/* ---------- the analysis */
export function analyze(spec, opts = {}) {
  const S = spec.size, cell = opts.cell || cellFor(S), n = Math.round(S / cell);
  const T = terrain(spec), core = gameCore();
  const F = field(spec, 0, 0, n, n, cell, T), h = F.h;
  const X = (i) => -S / 2 + (i + .5) * cell;
  const hAt = (x, z) => { const i = Math.round((x + S / 2) / cell - .5), j = Math.round((z + S / 2) / cell - .5); return i < 0 || j < 0 || i >= n || j >= n ? -9 : h[j * n + i]; };
  const land = new Uint8Array(n * n); for (let k = 0; k < h.length; k++) land[k] = h[k] > 0 ? 1 : 0;
  const { lab, n: nLab } = label(land, n, n);
  const slope = new Float32Array(n * n);
  for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) { const k = j * n + i; slope[k] = Math.hypot(h[k + 1] - h[k - 1], h[k + n] - h[k - n]) / (2 * cell); }
  /* distance to sea (land cells) in metres, two-pass chamfer */
  const dsea = new Float32Array(n * n); for (let k = 0; k < dsea.length; k++) dsea[k] = land[k] ? 1e9 : 0;
  const D1 = cell, D2 = cell * 1.4142;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i; if (!land[k]) continue; let v = dsea[k];
    if (i > 0) v = Math.min(v, dsea[k - 1] + D1); if (j > 0) v = Math.min(v, dsea[k - n] + D1); if (i > 0 && j > 0) v = Math.min(v, dsea[k - n - 1] + D2); if (i < n - 1 && j > 0) v = Math.min(v, dsea[k - n + 1] + D2);
    if (i === 0 || j === 0 || i === n - 1 || j === n - 1) v = Math.min(v, D1); dsea[k] = v; }
  for (let j = n - 1; j >= 0; j--) for (let i = n - 1; i >= 0; i--) { const k = j * n + i; if (!land[k]) continue; let v = dsea[k];
    if (i < n - 1) v = Math.min(v, dsea[k + 1] + D1); if (j < n - 1) v = Math.min(v, dsea[k + n] + D1); if (i < n - 1 && j < n - 1) v = Math.min(v, dsea[k + n + 1] + D2); if (i > 0 && j < n - 1) v = Math.min(v, dsea[k + n - 1] + D2); dsea[k] = v; }

  /* islands = connected land components above the size floor */
  const acc = Array.from({ length: nLab }, () => ({ cells: 0, sx: 0, sz: 0, hmax: -9, hsum: 0, edge: 0, minx: 1e9, maxx: -1e9, minz: 1e9, maxz: -1e9, own: new Map() }));
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * n + i, L = lab[k]; if (L < 0) continue; const a = acc[L];
    a.cells++; a.sx += X(i); a.sz += X(j); a.hsum += h[k]; if (h[k] > a.hmax) a.hmax = h[k];
    a.minx = Math.min(a.minx, X(i)); a.maxx = Math.max(a.maxx, X(i)); a.minz = Math.min(a.minz, X(j)); a.maxz = Math.max(a.maxz, X(j));
    a.own.set(F.own[k], (a.own.get(F.own[k]) || 0) + 1);
    const e = (i === 0 || !land[k - 1]) + (i === n - 1 || !land[k + 1]) + (j === 0 || !land[k - n]) + (j === n - 1 || !land[k + n]); a.edge += e; }
  const keep = []; for (let L = 0; L < nLab; L++) if (acc[L].cells * cell * cell >= TUNING.min_island_m2) keep.push(L);
  keep.sort((A, B) => acc[B].cells - acc[A].cells || A - B);
  const homeSpec = spec.isl[spec.home];
  let homeL = -1, best = -1;       /* the component that holds most of the home island's cells */
  for (const L of keep) { const c = acc[L].own.get(spec.home) || 0; if (c > best) { best = c; homeL = L; } }
  const islands = keep.map((L, idx) => {
    const a = acc[L], area = a.cells * cell * cell, coast = a.edge * cell * 0.8, own = [...a.own.entries()].sort((p, r) => r[1] - p[1] || p[0] - r[0])[0][0];
    return { id: 'I' + idx, label: L, spec_island: own, kind: spec.isl[own].kind, is_home: L === homeL,
      x: q(a.sx / a.cells, 1), z: q(a.sz / a.cells, 1), bbox: [q(a.minx, 1), q(a.minz, 1), q(a.maxx, 1), q(a.maxz, 1)],
      area_m2: Math.round(area), coast_m: Math.round(coast), complexity: q(coast / (2 * Math.sqrt(Math.PI * area)), 2),
      h_max_m: q(a.hmax, 2), h_mean_m: q(a.hsum / a.cells, 2) };
  });
  const byLabel = new Map(islands.map((I) => [I.label, I]));
  const homeIsl = islands.find((I) => I.is_home) || islands[0];

  /* ---------- per cell: resources (potentials from the game's own noise + terrain) */
  const forest = (x, z) => core.fbm ? 0 : 0;
  const T2 = T.core; const fb = T2.fbm;
  const res = new Map(islands.map((I) => [I.label, { wood: 0, rock: 0, shallows: 0, springs: [] }]));
  for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) { const k = j * n + i, L = lab[k]; const R = res.get(L); if (!R) continue;
    const hh = h[k], c2 = cell * cell;
    if (hh > 2.2 && hh < 14 && slope[k] < 1.0 && fb(X(i) * .06, X(j) * .06, spec.seed + 99, 2) > 0.46) R.wood += c2;
    if (hh > 0.8 && slope[k] > 0.5) R.rock += c2; }
  /* shallows (fish/shellfish potential): sea cells -1.6..-0.2 within 18 m of an island: attribute to the nearest island by scan of coast later; cheap proxy: count per component via dsea of neighbours */
  /* springs: gentle ground 1.3..3.8 m, 6+ m from the sea, with high ground (>= 1.5 m above) around it: a catchment */
  const R35 = Math.ceil(35 / cell);
  for (const I of islands) { const R = res.get(I.label); if (I.h_max_m < 2.8) continue; const cand = [];
    for (let j = R35; j < n - R35 && j < n; j += 2) for (let i = 0; i < n; i += 2) { const k = j * n + i; if (lab[k] !== I.label) continue;
      if (h[k] < 1.0 || h[k] > 3.8 || slope[k] > 0.6 || dsea[k] < 5) continue;
      let c = 0; for (let dj = -R35; dj <= R35; dj += 2) for (let di = -R35; di <= R35; di += 2) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue; if (di * di + dj * dj > R35 * R35) continue; if (lab[jj * n + ii] === I.label && h[jj * n + ii] > h[k] + 1.5) c++; }
      const catchm = c * 4 * cell * cell; if (catchm >= 250) cand.push({ x: X(i), z: X(j), catch: catchm }); }
    cand.sort((a, b) => b.catch - a.catch || a.x - b.x || a.z - b.z);
    for (const c of cand) { if (R.springs.length >= 4) break; if (R.springs.every((s) => Math.hypot(s.x - c.x, s.z - c.z) > 25)) R.springs.push({ x: q(c.x, 1), z: q(c.z, 1), catchment_m2: Math.round(c.catch) }); } }
  for (const I of islands) { const R = res.get(I.label); I.resources = { woodland_m2: Math.round(R.wood), rock_face_m2: Math.round(R.rock), springs: R.springs, fresh_water: R.springs.length > 0 }; }

  /* ---------- coast, landing candidates, shelter */
  const ray = (px, pz, dx, dz, maxd) => { for (let d = cell; d <= maxd; d += cell) if (hAt(px + dx * d, pz + dz * d) > 0.2) return true; return false; };
  const NR = 12, cands = [], coastN = new Map(islands.map((I) => [I.label, 0]));
  for (let j = 2; j < n - 2; j++) for (let i = 2; i < n - 2; i++) { const k = j * n + i, L = lab[k]; if (L < 0 || !byLabel.has(L)) continue;
    if (land[k - 1] && land[k + 1] && land[k - n] && land[k + n]) continue;
    coastN.set(L, coastN.get(L) + 1);
    if (hAt(X(i), X(j)) > 0.5) continue;
    /* outward direction = downhill of the smoothed field */
    let gx = (h[k + 2] - h[k - 2]), gz = (h[k + 2 * n] - h[k - 2 * n]); const gl = Math.hypot(gx, gz); if (gl < 1e-6) continue; const ox = -gx / gl, oz = -gz / gl;
    /* shore slope: mean over the intertidal band (-0.6 .. 1.6 m) along the outward axis */
    let ss = 0, sc = 0; for (let t = -4; t <= 4; t++) { const x = X(i) + ox * t * cell, z = X(j) + oz * t * cell, hh = hAt(x, z); if (hh > -0.6 && hh < 1.6) { const ii = Math.round((x + S / 2) / cell - .5), jj = Math.round((z + S / 2) / cell - .5); if (ii > 0 && jj > 0 && ii < n - 1 && jj < n - 1) { ss += slope[jj * n + ii]; sc++; } } }
    if (sc < 2) continue; const msl = ss / sc; if (msl > TUNING.shingle_slope_max) continue;
    /* approach: clear water seaward 3..12 m, at least one draft deep at 6 m */
    let clear = true; for (let d = 3; d <= 12; d += cell) if (hAt(X(i) + ox * d, X(j) + oz * d) > -0.05) { clear = false; break; } if (!clear) continue;
    if (hAt(X(i) + ox * 6, X(j) + oz * 6) > -TUNING.draft_m) continue;
    /* backing: dry ground above the highest tide within 30 m inland */
    let back = -9; for (let d = 4; d <= 30; d += cell) back = Math.max(back, hAt(X(i) - ox * d, X(j) - oz * d)); if (back < TUNING.tide_range_m + 0.3) continue;
    /* shelter: share of seaward rays (+/- 90 deg of outward) blocked by land within 50 m, from a point 8 m offshore */
    const px = X(i) + ox * 8, pz = X(j) + oz * 8; let blocked = 0, a0 = Math.atan2(oz, ox);
    for (let r = 0; r < NR; r++) { const a = a0 - Math.PI / 2 + Math.PI * (r + .5) / NR; if (ray(px, pz, Math.cos(a), Math.sin(a), 50)) blocked++; }
    const shelter = blocked / NR;
    cands.push({ L, x: X(i) + ox * 0, z: X(j), ox, oz, slope: msl, shelter, backing_m: back, score: (1 - msl / TUNING.shingle_slope_max) * .5 + shelter * .5 }); }
  cands.sort((a, b) => b.score - a.score || a.x - b.x || a.z - b.z);
  const landings = []; for (const c of cands) { if (landings.some((l) => Math.hypot(l.x - c.x, l.z - c.z) < 14)) continue; landings.push(c); }

  /* ---------- rowing routes from the home island's best landing (Dijkstra over water cells, 8 neighbours) */
  const passable = new Uint8Array(n * n); for (let k = 0; k < passable.length; k++) passable[k] = h[k] < -TUNING.draft_m ? 1 : 0;
  const idx = (x, z) => { const i = Math.round((x + S / 2) / cell - .5), j = Math.round((z + S / 2) / cell - .5); return i < 0 || j < 0 || i >= n || j >= n ? -1 : j * n + i; };
  const nearWater = (c) => { for (const d of [5, 7, 9, 12]) { const k = idx(c.x + c.ox * d, c.z + c.oz * d); if (k >= 0 && passable[k]) return k; } return -1; };
  for (const c of landings) c.wk = nearWater(c);
  const homeLands = landings.filter((c) => c.L === homeL && c.wk >= 0);
  const startL = homeLands[0] || null;
  const dist = new Float64Array(n * n).fill(Infinity);
  if (startL) { const hp = new Heap(); dist[startL.wk] = 0; hp.push(0, startL.wk);
    while (hp.size) { const [d, k] = hp.pop(); if (d > dist[k]) continue; const x = k % n, y = (k / n) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue; const kk = yy * n + xx; if (!passable[kk]) continue;
        if (dx && dy && (!passable[y * n + xx] || !passable[yy * n + x])) continue;   /* no cutting corners across land */
        const nd = d + (dx && dy ? D2 : D1); if (nd < dist[kk]) { dist[kk] = nd; hp.push(nd, kk); } } } }

  /* ---------- channels: nearest coast-to-coast distance per island pair */
  const coastPts = new Map(islands.map((I) => [I.label, []]));
  for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) { const k = j * n + i, L = lab[k]; if (L < 0 || !coastPts.has(L)) continue; if (land[k - 1] && land[k + 1] && land[k - n] && land[k + n]) continue; if (((i + j) & 1) === 0) coastPts.get(L).push([X(i), X(j)]); }
  const channels = [];
  for (let a = 0; a < islands.length; a++) for (let b = a + 1; b < islands.length; b++) {
    const A = islands[a], B = islands[b]; if (Math.hypot(A.x - B.x, A.z - B.z) > 260) continue;
    let bd = Infinity, bp = null; for (const p of coastPts.get(A.label)) for (const r of coastPts.get(B.label)) { const d = Math.hypot(p[0] - r[0], p[1] - r[1]); if (d < bd) { bd = d; bp = [p, r]; } }
    if (bd > 150) continue;
    /* rough flow proxy (NOT the game's flow field, which is not committed): stream speed rises as the gap narrows, 0.15 .. 1.05 m/s */
    const flow = 0.15 + 0.9 * Math.max(0, Math.min(1, 1 - bd / 80));
    channels.push({ a: A.id, b: B.id, width_m: q(bd, 1), mid: [q((bp[0][0] + bp[1][0]) / 2, 1), q((bp[0][1] + bp[1][1]) / 2, 1)], flow_ms_proxy: q(flow, 2), hard: flow > 0.9 }); }
  channels.sort((a, b) => a.width_m - b.width_m || (a.a < b.a ? -1 : 1));

  /* ---------- landings out */
  const rowMin = (c) => c.wk >= 0 && isFinite(dist[c.wk]) ? dist[c.wk] / TUNING.row_speed_m_min : null;
  const sites = landings.slice(0, 60).map((c, i) => { const I = byLabel.get(c.L), rm = rowMin(c);
    return { id: 'L' + i, island: I.id, x: q(c.x, 1), z: q(c.z, 1), approach: [q(c.ox, 2), q(c.oz, 2)], slope: q(c.slope, 3), sheltered: c.shelter >= 0.3, shelter: q(c.shelter, 2), backing_m: q(c.backing_m, 1),
      row_min_from_home: rm == null ? null : q(rm, 2), home: c === startL }; });
  /* island-level reach by sea: the nearest passable water cell touching its coast */
  const toCoast = new Map(islands.map((I) => [I.label, Infinity]));
  for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) { const k = j * n + i, L = lab[k]; if (!toCoast.has(L)) continue;
    for (const kk of [k - 1, k + 1, k - n, k + n]) if (passable[kk] && dist[kk] < toCoast.get(L)) toCoast.set(L, dist[kk]); }
  for (const I of islands) { const mine = sites.filter((s) => s.island === I.id); I.landings = mine.length; I.sheltered_landings = mine.filter((s) => s.sheltered).length;
    const rm = mine.map((s) => s.row_min_from_home).filter((v) => v != null), tc = toCoast.get(I.label);
    I.row_min_from_home = I.is_home ? 0 : (rm.length ? q(Math.min(...rm), 2) : null);
    I.row_min_to_coast = I.is_home ? 0 : (isFinite(tc) ? q(tc / TUNING.row_speed_m_min, 2) : null);
    I.reachable = I.is_home || I.row_min_to_coast != null; I.landable = I.is_home ? I.landings > 0 : rm.length > 0; }
  const coves = islands.reduce((s, I) => s + I.sheltered_landings, 0);

  const manifest = {
    schema: 'living_islands_world_manifest', version: FOUNDRY_VERSION,
    world_seed: spec.seed, arrival_seed: arrivalSeed(spec.seed), play_style: null,
    units: { length: 'm', sea_level_m: 0, y: 'up', origin: 'map centre', x: 'east', z: 'south' },
    size_m: S, cell_m: cell, generator: { game_terrain_hash: core.sourceHash, layout_params: spec.params },
    tide: { range_m: TUNING.tide_range_m, rocky_landing_window_min: TUNING.rocky_window_min, stage_landing_window_min: TUNING.stage_window_min },
    rowing: { speed_m_min: TUNING.row_speed_m_min, draft_m: TUNING.draft_m },
    spec_hash: sha(JSON.stringify(spec)),
    islands: islands.map(({ label, ...r }) => r),
    landing_sites: sites, sheltered_coves: coves, channels,
    home: { island: homeIsl.id, landing: sites.find((s) => s.home)?.id || null }
  };
  manifest.manifest_hash = sha(JSON.stringify(manifest), 16);
  return { manifest, F, lab, islands, sites, dist, n, cell, slope, land };
}
