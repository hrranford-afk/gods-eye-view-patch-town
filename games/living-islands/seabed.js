/* Living Islands: the seabed rule set as a pure module (see SEABED_PASS.md, research/SEABED_AND_ISLAND_LAYOUT.md section 7).
   Loaded by islands_look.html (?seabed=1) as a classic script and by node (import '../seabed.js', then globalThis.LI_SEABED). No DOM, no three.js, no clocks:
   everything is a pure function of (layout, seed). Units are game metres. Every number in P is TUNING, not a measurement (see SEABED_PASS.md). */
(function () {
  'use strict';
  /* ---------- small utilities (identical to the page's, so a node run and the page agree) ---------- */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash2(ix, iz, s) { let h = Math.imul(ix | 0, 374761393) + Math.imul(iz | 0, 668265263) + Math.imul(s | 0, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function vnoise(x, z, s) { const ix = Math.floor(x), iz = Math.floor(z), fx = fade(x - ix), fz = fade(z - iz); const a = hash2(ix, iz, s), b = hash2(ix + 1, iz, s), c = hash2(ix, iz + 1, s), d = hash2(ix + 1, iz + 1, s); return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz; }
  function fbm(x, z, s, o) { let a = .5, f = 1, sum = 0, n = 0; for (let i = 0; i < o; i++) { sum += a * vnoise(x * f, z * f, s + i * 17); n += a; a *= .5; f *= 2.03; } return sum / n; }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const sm = t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };

  /* ---------- TUNING numbers (none is a measurement; the research note says so for every one) ---------- */
  const P = {
    slopeSand: .10, slopeRock: 1.0,   /* shore slope bands: research 0.02 (sand) to 0.30 (rock), compressed horizontally for a 200 m table, see SEABED_PASS.md */
    noiseAmp: .22, noiseFreq: .034,   /* low-frequency depth noise, as a fraction of depth */
    wMax: 48, kScour: 7.0, sillFrac: .5, /* gaps wider than wMax get no scour; hole scale k_s; sill hump fraction at the channel mouths */
    barFactor: 2.3, barMax: 2,        /* sand link between two bodies closer than barFactor * the smaller one, at most barMax of them (sand supply) */
    U0: 1.1, refA: 130, uMin: .5, uMax: 3.5, /* stream u = U0 * clamp(refA / (w * D), uMin, uMax): refA stands for W0*D0 */
    ovU: 2.0, ovDepth: 3.2,           /* overfall when u > 2 m/s and depth < 3.2 m (research: 15 m real, scaled for the diorama) */
    tideA: 1.01, tidePeriodMin: 745,  /* tide amplitude of the page (1.1 * .92) and one tide cycle in real minutes (12 h 25 min) for the landing windows */
    kelpLo: .5, kelpHi: 4.5,          /* kelp 0 to 15 m real, scaled (3.3 to 1) for the diorama */
    sillShallow: 1.2, coveExpo: .36, Fmax: 60,          /* sheltered cove: exposure under this; fetch capped at Fmax metres */
    gentle: .5, hardRock: .6, tableR: 94, N: 128, half: 100,
    drafts: { row: .3, sail: 1.2, work: 2.5 }, margin: .3
  };

  /* ---------- the authored layout of the page (islands_look.html ISL) plus the seabed character of each island ---------- */
  const AUTHORED = [
    { id: 'pine', x: -42, z: -26, rx: 15, rz: 12.5, rot: .6, peak: 7.4, sb: .55, bw: 1.4, Rin: 10, under: .34, rough: 1.5, crag: 1.3, lump: 1.1, lcell: 4.2, surf: .55, warp: 4.6, r: .85, Dm: 9.0 },
    { id: 'sand', x: 39, z: -43, rx: 9, rz: 6.5, rot: -.3, peak: 1.5, sb: .12, bw: 5.0, Rin: 5, under: .20, rough: .32, lump: 0, surf: .20, warp: 1.6, r: .05, Dm: 3.6 },
    { id: 'grass', x: 6, z: -50, rx: 15, rz: 12, rot: .2, peak: 4.3, sb: .20, bw: 3.0, Rin: 11, under: .26, rough: .7, lump: .25, surf: .20, warp: 3.0, r: .30, Dm: 5.5 },
    { id: 'skerry', x: 58, z: 4, rx: 6.5, rz: 5, rot: .9, peak: 3.3, sb: .80, bw: 1.0, Rin: 4, under: .50, rough: 1.0, crag: 1.8, lump: 1.5, lcell: 3.8, surf: 1.0, warp: 1.8, r: 1.0, Dm: 8.0 },
    { id: 'camp', x: 28, z: 30, rx: 13, rz: 11, rot: -.4, peak: 3.4, sb: .16, bw: 5.0, Rin: 7, under: .24, rough: .5, lump: .20, surf: .25, warp: 3.0, r: .35, Dm: 5.0 },
    { id: 'harbour', x: -30, z: 40, cres: 1, Ra: 24, Rb: 12.5, peak: 8.6, sb: .22, bw: 5.0, Rin: 11, under: .28, rough: .6, lump: .35, surf: .25, warp: 2.8, r: .40, Dm: 6.0 }
  ];
  const AUTHORED_LANDING_DIR = [Math.cos(Math.atan2(.52, .85)), Math.sin(Math.atan2(.52, .85))];

  /* a deterministic other layout for any other seed: the same kinds of island, different places, sizes and rockiness. It feeds the foundry measures;
     the page itself still draws the authored layout (seed 1122) for every seed. */
  function layoutForSeed(seed) {
    seed = seed >>> 0;
    if (seed === 1122) return { seed, authored: true, start: 4, landingDir: AUTHORED_LANDING_DIR, islands: AUTHORED.map(I => Object.assign({}, I)) };
    const R = mulberry32(seed * 2246822519 + 3266489917), isl = [];
    const kinds = {
      camp: { r: [.2, .45], size: [10, 14], peak: [3, 4.2], Dm: [4.2, 5.6], warp: [2.6, 3.4], bw: 5, sb: .16, Rin: 7, under: .24 },
      wood: { r: [.72, .95], size: [11, 16], peak: [6.5, 9], Dm: [7.5, 10], warp: [3.8, 5], bw: 1.4, sb: .55, Rin: 10, under: .34 },
      sand: { r: [0, .15], size: [6.5, 10], peak: [1.3, 2], Dm: [2.8, 4], warp: [1.4, 2], bw: 5, sb: .12, Rin: 5, under: .2 },
      grass: { r: [.2, .45], size: [10, 15], peak: [3.5, 5], Dm: [4.5, 6.5], warp: [2.6, 3.4], bw: 3, sb: .2, Rin: 11, under: .26 },
      skerry: { r: [.9, 1], size: [4, 7], peak: [2.4, 3.6], Dm: [7, 9], warp: [1.4, 2], bw: 1, sb: .8, Rin: 4, under: .5 },
      cres: { r: [.3, .5], size: [17, 22], peak: [7, 9], Dm: [5.5, 7], warp: [2.4, 3.2], bw: 5, sb: .22, Rin: 11, under: .28 }
    };
    const plan = ['camp', 'wood', 'sand', 'grass', 'skerry'];
    const extra = ['wood', 'sand', 'grass', 'skerry', 'skerry', 'sand', 'cres'];
    const nExtra = (R() * 3.4) | 0;
    for (let k = 0; k < nExtra; k++) plan.push(extra[(R() * extra.length) | 0]);
    const rr = (a) => a[0] + (a[1] - a[0]) * R();
    for (let k = 0; k < plan.length; k++) {
      const K = kinds[plan[k]];
      for (let t = 0; t < 400; t++) {
        const size = rr(K.size), ar = .7 + R() * .3, ang = R() * 6.2832, d = (k === 0 ? 14 + R() * 26 : 10 + Math.sqrt(R()) * 58);
        let x = Math.cos(ang) * d, z = Math.sin(ang) * d;
        if (k === 0) { x = 8 + R() * 34; z = 14 + R() * 30; }
        const rx = size, rz = size * ar;
        let ok = Math.hypot(x, z) + size < 80;
        for (const J of isl) { const dj = Math.hypot(x - J.x, z - J.z), sj = J.cres ? J.Ra * .55 : Math.max(J.rx, J.rz), gap = dj - size - sj; if (gap < 6 + (J.r < .5 ? 0 : 2)) { ok = false; break; } }
        if (!ok) continue;
        const I = { id: plan[k] === 'wood' ? 'pine' : plan[k], x: +x.toFixed(2), z: +z.toFixed(2), rot: +(R() * 3.14 - 1.57).toFixed(3), peak: +rr(K.peak).toFixed(2), sb: K.sb, bw: K.bw, Rin: K.Rin, under: K.under,
          rough: .5, lump: .2, surf: .3, warp: +rr(K.warp).toFixed(2), r: +rr(K.r).toFixed(3), Dm: +rr(K.Dm).toFixed(2) };
        if (plan[k] === 'cres') { I.cres = 1; I.Ra = +size.toFixed(2); I.Rb = +(size * .52).toFixed(2); } else { I.rx = +rx.toFixed(2); I.rz = +rz.toFixed(2); }
        isl.push(I); break;
      }
    }
    /* the start landing faces the open side of the start island: away from the other islands' centre of mass */
    const S = isl[0]; let mx = 0, mz = 0; for (let i = 1; i < isl.length; i++) { mx += isl[i].x; mz += isl[i].z; } mx /= Math.max(1, isl.length - 1); mz /= Math.max(1, isl.length - 1);
    const a = Math.atan2(S.z - mz, S.x - mx);
    return { seed, authored: false, start: 0, landingDir: [Math.cos(a), Math.sin(a)], islands: isl };
  }

  function normalise(I, i, seed) {
    if (I.c === undefined) {
      I.i = i; I.s = (seed * 7 + i * 101) | 0; I.c = Math.cos(I.rot || 0); I.sn = Math.sin(I.rot || 0);
      if (I.cres) { const dir = [.55, .835]; I.dir = dir; I.bx = I.x + dir[0] * 14.5 * (I.Ra / 24); I.bz = I.z + dir[1] * 14.5 * (I.Ra / 24); I.rm = I.Ra; I.mR = I.Ra; }
      else { I.rm = Math.min(I.rx, I.rz); I.mR = Math.max(I.rx, I.rz); }
    }
    return I;
  }
  /* the page's islSd: signed distance to the shore (positive inland), with the same domain warp, so a node run draws the same shores as the page */
  function defaultSd(I, x, z) {
    let sd;
    if (I.cres) { const a = I.Ra - Math.hypot(x - I.x, z - I.z), b = Math.hypot(x - I.bx, z - I.bz) - I.Rb, k = 2.6; sd = -k * Math.log(Math.exp(-a / k) + Math.exp(-b / k)); }
    else { const dx = x - I.x, dz = z - I.z, lx = dx * I.c + dz * I.sn, lz = -dx * I.sn + dz * I.c; sd = (1 - Math.hypot(lx / I.rx, lz / I.rz)) * I.rm; }
    return sd + (fbm(x * .055, z * .055, I.s, 3) - .5) * 2 * I.warp + (fbm(x * .21, z * .21, I.s + 5, 2) - .5) * I.warp * .45;
  }
  const sizeOf = I => I.cres ? I.Ra * .55 : Math.sqrt(I.rx * I.rz);
  const fric = D => .25 + .75 * sm(D / 1.2);   /* bed friction on flats: speed is cut below ~1.2 m of water (the page's own shallow rule) */
  /* continuity: u/U0 = refA / (w D), floor uMin, and a soft ceiling that approaches uMax from 2 (so the fastest gap is a number, not a clamp) */
  const cont = raw => { raw = raw < P.uMin ? P.uMin : raw; return raw <= 2 ? raw : 2 + (P.uMax - 2) * (1 - Math.exp(-(raw - 2) / (P.uMax - 2))); };
  const streamSpeed = (w, D) => P.U0 * cont(P.refA / (Math.max(w, 1) * Math.max(D, .3))) * fric(D);

  /* ---------- the seabed ---------- */
  function create(layout, seed, opts) {
    opts = opts || {}; seed = seed >>> 0;
    const sdf = opts.sd || defaultSd;
    const isl = layout.islands.map((I, i) => normalise(I, i, seed)); const NI = isl.length;
    const start = layout.start == null ? 0 : layout.start;
    for (const I of isl) { I.slope = lerp(P.slopeSand, P.slopeRock, I.r); I.L = I.Dm / I.slope; }
    const rg = mulberry32(((seed * 2654435761) >>> 0) ^ 0x51ed), axisAng = .55 + rg() * .7, axis = [Math.cos(axisAng), Math.sin(axisAng)];
    const sdsAt = (x, z, out) => { out = out || new Float64Array(NI); for (let k = 0; k < NI; k++) out[k] = sdf(isl[k], x, z); return out; };

    /* 1 to 4: shelf by distance to land, per island rockiness; probabilistic union gives the sills; low-frequency noise */
    function core(sds, x, z) {
      let prod = 1, num = 0, den = 0;
      for (let k = 0; k < NI; k++) { const d = sds[k] < 0 ? -sds[k] : 0, g = Math.exp(-d / isl[k].L); prod *= 1 - g; const w = g + .02; num += isl[k].Dm * w; den += w; }
      return (num / den) * prod * (1 + P.noiseAmp * 2 * (fbm(x * P.noiseFreq + 3.1, z * P.noiseFreq + 7.7, seed + 991, 3) - .5));
    }

    /* the gaps between pairs of islands: width along the straight bridge, from shore to shore */
    const gaps = [];
    for (let i = 0; i < NI; i++) for (let j = i + 1; j < NI; j++) {
      const A = isl[i], B = isl[j], dx = B.x - A.x, dz = B.z - A.z, D = Math.hypot(dx, dz), ux = dx / D, uz = dz / D, st = .4;
      let ti = -1, tj = -1;
      for (let t = 0; t <= D; t += st) if (sdf(A, A.x + ux * t, A.z + uz * t) <= 0) { ti = t; break; }
      for (let t = D; t >= 0; t -= st) if (sdf(B, A.x + ux * t, A.z + uz * t) <= 0) { tj = t; break; }
      if (ti < 0 || tj < 0 || tj - ti < .8) continue;
      let blocked = false; for (let k = 0; k < NI && !blocked; k++) { if (k === i || k === j) continue; for (let t = ti; t <= tj; t += 1.2) if (sdf(isl[k], A.x + ux * t, A.z + uz * t) > 0) { blocked = true; break; } }
      if (blocked) continue;
      const w = tj - ti; if (w > P.wMax) continue;
      gaps.push({ i, j, a: [A.x + ux * ti, A.z + uz * ti], b: [A.x + ux * tj, A.z + uz * tj], mid: [A.x + ux * (ti + tj) / 2, A.z + uz * (ti + tj) / 2], w: +w.toFixed(2), dir: [ux, uz] });
    }
    /* 6: sand link (tombolo / drying bar): sandy pair close together, at most barMax by smallest gap relative to size */
    const cand = gaps.filter(g => g.w > 2 && g.w < P.barFactor * Math.min(sizeOf(isl[g.i]), sizeOf(isl[g.j])) && Math.min(isl[g.i].r, isl[g.j].r) < .5).map(g => ({ g, sc: g.w / Math.min(sizeOf(isl[g.i]), sizeOf(isl[g.j])) })).sort((a, b) => a.sc - b.sc).slice(0, P.barMax);
    const bars = cand.map((c, k) => { const g = c.g, r = mulberry32(seed + 501 + k * 16), ext = 1.5; g.bar = true;
      return { i: g.i, j: g.j, a: [g.a[0] - g.dir[0] * ext, g.a[1] - g.dir[1] * ext], b: [g.b[0] + g.dir[0] * ext, g.b[1] + g.dir[1] * ext], w: clamp(.22 * g.w, 2.2, 3.6), peak: -(.34 + .4 * r()) * P.tideA, s: seed + 501 + k * 16, gapW: g.w }; });
    /* 5: channel scour and mouth sills for the remaining gaps */
    const chans = gaps.filter(g => !g.bar).map(g => {
      let px = -g.dir[1], pz = g.dir[0]; if (px * axis[0] + pz * axis[1] < 0) { px = -px; pz = -pz; }
      const w = g.w, S = P.kScour * clamp(1 - w / P.wMax, 0, 1), fr = P.sillFrac * clamp(1.2 - w / P.wMax, .3, 1);
      return { i: g.i, j: g.j, w, mid: g.mid, perp: [px, pz], lat: g.dir, S, hole: [g.mid[0] + px * .85 * w, g.mid[1] + pz * .85 * w], sx: .45 * w + 1.5, sy: .4 * w + 3,
        sills: [[g.mid[0] + px * (.3 * w + 2), g.mid[1] + pz * (.3 * w + 2)], [g.mid[0] - px * (.3 * w + 2), g.mid[1] - pz * (.3 * w + 2)]], sl: .65 * w + 3, sa: .42 * w + 4, fr };
    });
    function depthFromSd(sds, x, z) {
      let d = core(sds, x, z);
      for (let k = 0; k < chans.length; k++) { const C = chans[k];
        if (Math.abs(x - C.mid[0]) > 3 * C.w + 30 || Math.abs(z - C.mid[1]) > 3 * C.w + 30) continue;
        for (let s = 0; s < 2; s++) { const q = C.sills[s], rx = x - q[0], rz = z - q[1], lat = rx * C.lat[0] + rz * C.lat[1], al = rx * C.perp[0] + rz * C.perp[1];
          d *= 1 - C.fr * Math.exp(-(lat * lat) / (C.sl * C.sl) - (al * al) / (C.sa * C.sa)); }
        if (C.S > .01) { const rx = x - C.hole[0], rz = z - C.hole[1], lat = rx * C.lat[0] + rz * C.lat[1], al = rx * C.perp[0] + rz * C.perp[1]; d += C.S * Math.exp(-(lat * lat) / (C.sx * C.sx) - (al * al) / (C.sy * C.sy)); } }
      for (let k = 0; k < bars.length; k++) { const B = bars[k], vx = B.b[0] - B.a[0], vz = B.b[1] - B.a[1], L2 = vx * vx + vz * vz; let t = ((x - B.a[0]) * vx + (z - B.a[1]) * vz) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dd = Math.hypot(x - (B.a[0] + vx * t), z - (B.a[1] + vz * t)); if (dd < B.w * 2.4) { const g = Math.exp(-(dd * dd) / (B.w * B.w)), pk = clamp(B.peak + (fbm(x * .18, z * .18, B.s, 2) - .5) * .9, -1.15, -.12), tgt = -pk; if (tgt < d) d += (tgt - d) * g; } }
      return d < 0 ? 0 : d;
    }
    const _s = new Float64Array(NI);
    const depthAt = (x, z) => depthFromSd(sdsAt(x, z, _s), x, z);
    const landAt = (x, z) => { sdsAt(x, z, _s); for (let k = 0; k < NI; k++) if (_s[k] > 0) return true; return false; };
    const rockAt = (x, z) => { sdsAt(x, z, _s); let a = 0, b = 0; for (let k = 0; k < NI; k++) { const d = _s[k] < 0 ? -_s[k] : 0, g = Math.exp(-d / isl[k].L) + 1e-6; a += isl[k].r * g; b += g; } return a / b; };

    /* ---------- the grid (small, JSON-able) and everything derived from it ---------- */
    const N = opts.n || P.N, half = P.half, cell = 2 * half / N;
    const G = { n: N, half, cell, depth: new Float32Array(N * N), land: new Uint8Array(N * N), hard: new Float32Array(N * N), expo: new Float32Array(N * N), width: new Float32Array(N * N), spd: new Float32Array(N * N), spdF: new Float32Array(N * N), isl: new Int8Array(N * N) };
    const cx = i => -half + (i + .5) * cell;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = cx(i), z = cx(j), k = j * N + i; sdsAt(x, z, _s); let land = 0, bi = -1, bs = -1e9, a = 0, b = 0;
      for (let q = 0; q < NI; q++) { if (_s[q] > 0) land = 1; if (_s[q] > bs) { bs = _s[q]; bi = q; } const d = _s[q] < 0 ? -_s[q] : 0, g = Math.exp(-d / isl[q].L) + 1e-6; a += isl[q].r * g; b += g; }
      G.land[k] = land; G.hard[k] = a / b; G.depth[k] = depthFromSd(_s, x, z); G.isl[k] = bs > -40 ? bi : -1;
    }
    const gi = (x, z) => { const i = Math.floor((x + half) / cell), j = Math.floor((z + half) / cell); return (i < 0 || j < 0 || i >= N || j >= N) ? -1 : j * N + i; };
    const gbil = (arr, x, z) => { let fx = (x + half) / cell - .5, fz = (z + half) / cell - .5; fx = clamp(fx, 0, N - 1.001); fz = clamp(fz, 0, N - 1.001); const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
      const a = arr[j * N + i], b = arr[j * N + i + 1], c = arr[(j + 1) * N + i], d = arr[(j + 1) * N + i + 1]; return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz; };
    /* distance to land along a ray (grid march): used for fetch and for the cross-section width */
    const rayLand = (x, z, dx, dz, maxD, step) => { for (let t = step; t <= maxD; t += step) { const k = gi(x + dx * t, z + dz * t); if (k < 0) return maxD; if (G.land[k]) return t; } return maxD; };
    /* exposure: weighted open-water fetch over 12 directions, prevailing direction seeded */
    const prev = rg() * 6.2832, dirs = [], wts = []; let ws = 0;
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.2832; dirs.push([Math.cos(a), Math.sin(a)]); const w = .04 + .5 * Math.pow(Math.max(0, Math.cos(a - prev)), 3); wts.push(w); ws += w; }
    for (let k = 0; k < 12; k++) wts[k] /= ws;
    const wdirs = []; for (let k = 0; k < 4; k++) { const a = k / 8 * 6.2832; wdirs.push([Math.cos(a), Math.sin(a)]); }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = j * N + i; if (G.land[k]) { G.expo[k] = 0; G.width[k] = 0; G.spd[k] = 0; G.spdF[k] = 0; continue; }
      const x = cx(i), z = cx(j); let e = 0; for (let q = 0; q < 12; q++) e += wts[q] * Math.min(rayLand(x, z, dirs[q][0], dirs[q][1], P.Fmax, 1.5), P.Fmax) / P.Fmax; G.expo[k] = e;
      let wmin = 1e9; for (let q = 0; q < 4; q++) { const d = wdirs[q]; const w = rayLand(x, z, d[0], d[1], 100, 1.5) + rayLand(x, z, -d[0], -d[1], 100, 1.5); if (w < wmin) wmin = w; }
      G.width[k] = wmin; G.spd[k] = cont(P.refA / (Math.max(wmin, 1) * Math.max(G.depth[k], .3))); G.spdF[k] = G.spd[k] * fric(G.depth[k]); }

    /* land cells take the mean of their water neighbours, so bilinear lookups near the shore do not drag exposure and stream to zero */
    const fillLand = arr => { const fill = arr.slice(); let todo = []; const known = new Uint8Array(N * N); for (let k = 0; k < N * N; k++) { if (G.land[k]) todo.push(k); else known[k] = 1; }
      for (let pass = 0; pass < 8 && todo.length; pass++) { const nxt = [], set = []; for (const k of todo) { const i = k % N, j = (k / N) | 0; let a = 0, c = 0; for (let b = -1; b <= 1; b++) for (let q = -1; q <= 1; q++) { const ii = i + q, jj = j + b; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; const kk = jj * N + ii; if (known[kk]) { a += fill[kk]; c++; } } if (c) set.push([k, a / c]); else nxt.push(k); }
        for (const [k, v] of set) { fill[k] = v; known[k] = 1; } todo = nxt; }
      for (let k = 0; k < N * N; k++) if (G.land[k]) arr[k] = known[k] ? fill[k] : 1; };
    fillLand(G.spd); fillLand(G.spdF); fillLand(G.expo);

    /* ---------- tide and exposure ---------- */
    const levelAt = t => P.tideA * Math.sin(2 * Math.PI * t / 55);
    const inDisc = (x, z) => x * x + z * z <= P.tableR * P.tableR;
    /* area (m2) of the sea bed that is dry at this tide level (level in metres relative to MSL), outside the islands' own land */
    function exposedArea(level) { let n = 0; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = j * N + i; if (G.land[k]) continue; if (!inDisc(cx(i), cx(j))) continue; if (G.depth[k] < -level) n++; } return n * cell * cell; }
    /* are islands a and b linked by dry ground at this level? flood fill over land and dry bed */
    function linked(a, b, level) { const seen = new Uint8Array(N * N), st = []; const dry = k => G.land[k] || G.depth[k] < -level;
      for (let k = 0; k < N * N; k++) if (G.land[k] && G.isl[k] === a) { seen[k] = 1; st.push(k); }
      while (st.length) { const k = st.pop(), i = k % N, j = (k / N) | 0; if (G.land[k] && G.isl[k] === b) return true;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; const q = jj * N + ii; if (!seen[q] && dry(q)) { seen[q] = 1; st.push(q); } } }
      return false; }
    /* minutes per tide cycle (745 min) during which the level is at or above lv */
    const minutesAbove = lv => { const A = P.tideA; if (lv <= -A) return P.tidePeriodMin; if (lv >= A) return 0; return (Math.PI - 2 * Math.asin(lv / A)) / (2 * Math.PI) * P.tidePeriodMin; };
    /* landing windows from a bed profile prof(d) = depth below MSL at distance d metres outward of the MSL shore (d from 0). carry = largest wade distance allowed (m). */
    function landingWindows(prof, carry) {
      carry = carry == null ? 8 : carry; const out = { dryFlat: 0, slope: 0, byDraft: {} };
      let d = 0; while (d < 120 && prof(d) < P.tideA) d += .25; out.dryFlat = +d.toFixed(2); out.slope = +((prof(Math.min(d, 20) + 3) - prof(Math.min(d, 20))) / 3).toFixed(3);
      for (const k in P.drafts) { const need = P.drafts[k] + P.margin, lv = need - prof(carry); out.byDraft[k] = { minLevel: +lv.toFixed(2), minutes: Math.round(minutesAbove(lv)), needDepth: need }; }
      return out; }
    /* ray from an island: the shore point where sd crosses 0 along a direction from the island centre, and the bed profile outward of it */
    function shoreRay(I, dx, dz) { let t = 0; const c0 = I.cres ? [I.x + (I.dir[0]) * 7 * (I.Ra / 24), I.z + (I.dir[1]) * 7 * (I.Ra / 24)] : [I.x, I.z];
      for (t = 1; t < 60; t += .1) if (sdf(I, c0[0] + dx * t, c0[1] + dz * t) <= 0) break;
      const sx = c0[0] + dx * t, sz = c0[1] + dz * t; return { x: sx, z: sz, dir: [dx, dz], prof: d => depthAt(sx + dx * d, sz + dz * d) }; }

    /* ---------- flow helpers ---------- */
    const widthAt = (x, z) => gbil(G.width, x, z), spdAt = (x, z) => gbil(G.spd, x, z), spdFAt = (x, z) => gbil(G.spdF, x, z), depthG = (x, z) => gbil(G.depth, x, z);

    /* ---------- measures for the seed foundry ---------- */
    function measures() {
      const cellA = cell * cell; let disc = 0, land = 0; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { if (!inDisc(cx(i), cx(j))) continue; disc++; if (G.land[j * N + i]) land++; }
      const M = { seed, authored: !!layout.authored, islands: NI, landFraction: +(land / disc).toFixed(3) };
      M.gaps = gaps.length; M.bars = bars.length; M.channels = chans.length;
      const sillList = []; for (const C of chans) for (const q of C.sills) sillList.push({ x: +q[0].toFixed(1), z: +q[1].toFixed(1), depth: +depthAt(q[0], q[1]).toFixed(2), w: C.w });
      M.sills = sillList.length; M.shallowSills = chans.filter(C => Math.min(depthAt(C.sills[0][0], C.sills[0][1]), depthAt(C.sills[1][0], C.sills[1][1])) < P.sillShallow).length;   /* channels with a sill under 1.2 m (about 4 m real) */
      let hole = 0, holeAt = null; for (const C of chans) { const dd = depthAt(C.hole[0], C.hole[1]); if (dd > hole) { hole = dd; holeAt = C.hole; } }
      M.deepestHole = +hole.toFixed(2); M.holeAt = holeAt && [+holeAt[0].toFixed(1), +holeAt[1].toFixed(1)];
      let shelf = 0, ns = 0; for (let k = 0; k < N * N; k++) if (!G.land[k] && G.depth[k] > .3) { shelf += G.depth[k]; ns++; } M.meanDepth = +(shelf / Math.max(1, ns)).toFixed(2);
      /* fastest stream (mid-tide, at MSL) and where; race cells (u > 2 and depth < ovDepth), clustered */
      let fm = 0, fk = -1; const race = new Uint8Array(N * N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const k = j * N + i; if (G.land[k] || !inDisc(cx(i), cx(j)) || G.depth[k] < .3) continue; const u = P.U0 * G.spdF[k]; if (u > fm) { fm = u; fk = k; } if (u > P.ovU && G.depth[k] < P.ovDepth) race[k] = 1; }
      M.peakCell = +fm.toFixed(2); M.peakCellAt = fk >= 0 ? [+cx(fk % N).toFixed(1), +cx((fk / N) | 0).toFixed(1)] : null;
      /* the throat of each channel: stream from the gap width and the shallowest of the middle and the two mouth sills */
      let ft = 0, fta = null; const throats = chans.map(C => { const D = Math.min(depthAt(C.mid[0], C.mid[1]), depthAt(C.sills[0][0], C.sills[0][1]), depthAt(C.sills[1][0], C.sills[1][1])), u = streamSpeed(C.w, D); if (u > ft) { ft = u; fta = C.mid; } return { x: +C.mid[0].toFixed(1), z: +C.mid[1].toFixed(1), w: C.w, depth: +D.toFixed(2), u: +u.toFixed(2) }; });
      M.fastest = +ft.toFixed(2); M.fastestAt = fta && [+fta[0].toFixed(1), +fta[1].toFixed(1)];
      const comp = (mask, minCells) => { const seen = new Uint8Array(N * N), out = []; for (let k0 = 0; k0 < N * N; k0++) { if (!mask[k0] || seen[k0]) continue; const st = [k0], cells = []; seen[k0] = 1;
          while (st.length) { const k = st.pop(); cells.push(k); const i = k % N, j = (k / N) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; const q = jj * N + ii; if (mask[q] && !seen[q]) { seen[q] = 1; st.push(q); } } }
          if (cells.length >= minCells) out.push(cells); } return out; };
      M.races = comp(race, 2).length;
      /* shore samples from land cells with a water neighbour, with an outward normal from the blurred land mask */
      const blur = (i, j) => { let s = 0, c = 0; for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; s += G.land[jj * N + ii]; c++; } return s / c; };
      const shore = [];
      for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) { const k = j * N + i; if (!G.land[k]) continue; if (G.land[k - 1] && G.land[k + 1] && G.land[k - N] && G.land[k + N]) continue; if (!inDisc(cx(i), cx(j))) continue;
        const nx = -(blur(i + 1, j) - blur(i - 1, j)), nz = -(blur(i, j + 1) - blur(i, j - 1)), l = Math.hypot(nx, nz); if (l < .02) continue; shore.push({ x: cx(i), z: cx(j), nx: nx / l, nz: nz / l, isl: G.isl[k], k }); }
      /* a candidate needs, off the shore: gentle bed slope, low exposure, slow stream, a little depth to float a boat. A haul-out needs rocky hard bed, deep water close in, and low ground. */
      const lands = [], hauls = [];
      for (const s of shore) { const I = isl[s.isl]; if (!I) continue; const p1 = [s.x + s.nx * 2.5, s.z + s.nz * 2.5], p2 = [s.x + s.nx * 8, s.z + s.nz * 8], p3 = [s.x + s.nx * 4, s.z + s.nz * 4];
        const d1 = depthG(p1[0], p1[1]), d2 = depthG(p2[0], p2[1]), slope = (d2 - d1) / 5.5, k3 = gi(p3[0], p3[1]); if (k3 < 0 || G.land[k3]) continue; const ex = G.expo[k3], u = P.U0 * G.spdF[k3];
        const hard = G.hard[s.k];
        if (slope < P.gentle && ex < .55 && u < 1.5 && d2 > .3 && hard < P.hardRock) lands.push({ x: s.x, z: s.z, isl: s.isl, nx: s.nx, nz: s.nz, slope: +slope.toFixed(3), expo: +ex.toFixed(2), u: +u.toFixed(2), sc: (P.gentle - slope) + (.55 - ex) * .8 + (1.5 - u) * .2 });
        if (hard >= P.hardRock && I.peak <= 5 && d2 > 2.2 && slope > .2) hauls.push({ x: s.x, z: s.z, isl: s.isl, deep: +d2.toFixed(2), sc: d2 });
      }
      const thin = (arr, rad) => { arr.sort((a, b) => b.sc - a.sc); const out = []; for (const a of arr) if (!out.some(b => Math.hypot(a.x - b.x, a.z - b.z) < rad)) out.push(a); return out; };
      const S = isl[start], dStart = (x, z) => { let m = 1e9; for (const s of shore) if (s.isl === start) { const d = Math.hypot(x - s.x, z - s.z); if (d < m) m = d; } return m; };
      const lc = thin(lands, 9).map(c => Object.assign(c, { fromStart: c.isl === start ? 0 : +dStart(c.x, c.z).toFixed(1) }));
      M.landingCandidates = lc.length; M.landingDistances = lc.map(c => c.fromStart).sort((a, b) => a - b); M.landingList = lc.map(c => ({ x: +c.x.toFixed(1), z: +c.z.toFixed(1), isl: isl[c.isl].id, fromStart: c.fromStart, slope: c.slope, expo: c.expo, windowMin: (() => { const w = landingWindows(d => depthAt(c.x + c.nx * (d + 1.5), c.z + c.nz * (d + 1.5)), 8).byDraft; return { row: w.row.minutes, sail: w.sail.minutes, work: w.work.minutes }; })() }));
      const hc = thin(hauls, 12).filter(c => dStart(c.x, c.z) > 6 || c.isl !== start); M.haulOuts = hc.length; M.haulList = hc.map(c => ({ x: +c.x.toFixed(1), z: +c.z.toFixed(1), isl: isl[c.isl].id, deep: c.deep }));
      M.skerries = isl.filter(I => sizeOf(I) <= 7.5 && I.peak <= 4.2).length;
      let dryRock = 0; for (let k = 0; k < N * N; k++) if (!G.land[k] && G.hard[k] >= P.hardRock && G.depth[k] < P.tideA && inDisc(cx(k % N), cx((k / N) | 0))) dryRock++; M.dryRockArea = Math.round(dryRock * cellA);
      /* kelp: hard bed, depth in kelp band; nearest kelp to the start island */
      let kelp = 0, kd = 1e9; const kelpMask = new Uint8Array(N * N);
      for (let k = 0; k < N * N; k++) { if (G.land[k] || G.hard[k] < .5 || G.depth[k] < P.kelpLo || G.depth[k] > P.kelpHi) continue; const i = k % N, j = (k / N) | 0; if (!inDisc(cx(i), cx(j))) continue; kelp++; kelpMask[k] = 1; const d = Math.hypot(cx(i) - S.x, cx(j) - S.z) - sizeOf(S); if (d < kd) kd = d; }
      M.kelpArea = Math.round(kelp * cellA); M.kelpFromStart = kelp ? +Math.max(0, kd).toFixed(1) : null;
      /* sheltered coves: water cells with low exposure, some depth, close to land; clusters */
      const cv = new Uint8Array(N * N);
      for (let k = 0; k < N * N; k++) { if (G.land[k] || G.expo[k] >= P.coveExpo || G.depth[k] < .5 || G.depth[k] > 6) continue; const i = k % N, j = (k / N) | 0; if (!inDisc(cx(i), cx(j))) continue; if (rayLand(cx(i), cx(j), 1, 0, 14, 2) >= 14 && rayLand(cx(i), cx(j), -1, 0, 14, 2) >= 14 && rayLand(cx(i), cx(j), 0, 1, 14, 2) >= 14 && rayLand(cx(i), cx(j), 0, -1, 14, 2) >= 14) continue; cv[k] = 1; }
      const coves = comp(cv, 12); M.coves = coves.length;
      M.covesNearStart = coves.filter(c => { let m = 1e9; for (const k of c) { const d = Math.hypot(cx(k % N) - S.x, cx((k / N) | 0) - S.z) - sizeOf(S); if (d < m) m = d; } return m <= 70; }).length;
      /* the start landing: bed profile along the start landing direction */
      const ld = layout.landingDir || [1, 0], sr = shoreRay(S, ld[0], ld[1]), lw = landingWindows(sr.prof, 8);
      M.landing = { x: +sr.x.toFixed(1), z: +sr.z.toFixed(1), dryFlat: lw.dryFlat, slope: lw.slope, windowMin: { row: lw.byDraft.row.minutes, sail: lw.byDraft.sail.minutes, work: lw.byDraft.work.minutes } };
      M.dryFlatAtLanding = lw.dryFlat;
      /* where the two sand links are, and whether they link at low water but not at high */
      M.barsDryAtLow = bars.filter(b => linked(b.i, b.j, -P.tideA)).length; M.barsWetAtHigh = bars.filter(b => !linked(b.i, b.j, P.tideA)).length;
      M.intertidalFraction = +(exposedArea(-P.tideA) / (disc * cellA - land * cellA)).toFixed(3);
      M._lists = { throats, sills: sillList, landing: lc, hauls: hc, coves: coves.map(c => { let sx = 0, sz = 0; for (const k of c) { sx += cx(k % N); sz += cx((k / N) | 0); } return { x: +(sx / c.length).toFixed(1), z: +(sz / c.length).toFixed(1), cells: c.length }; }), kelpMask };
      return M;
    }

    /* depth contours (marching squares on the depth grid) for the debug overlay: [{level, seg:[[x1,z1,x2,z2],...]}] */
    function contours(levels) { return levels.map(lv => { const seg = []; for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
        const v = [G.depth[j * N + i], G.depth[j * N + i + 1], G.depth[(j + 1) * N + i + 1], G.depth[(j + 1) * N + i]], x0 = cx(i), z0 = cx(j), pts = [];
        const E = [[0, 1, x0, z0, x0 + cell, z0], [1, 2, x0 + cell, z0, x0 + cell, z0 + cell], [3, 2, x0, z0 + cell, x0 + cell, z0 + cell], [0, 3, x0, z0, x0, z0 + cell]];
        for (const [a, b, ax, az, bx, bz] of E) { if ((v[a] < lv) !== (v[b] < lv)) { const t = (lv - v[a]) / (v[b] - v[a]); pts.push([ax + (bx - ax) * t, az + (bz - az) * t]); } }
        if (pts.length === 2) seg.push([+pts[0][0].toFixed(2), +pts[0][1].toFixed(2), +pts[1][0].toFixed(2), +pts[1][1].toFixed(2)]); else if (pts.length === 4) { seg.push([+pts[0][0].toFixed(2), +pts[0][1].toFixed(2), +pts[1][0].toFixed(2), +pts[1][1].toFixed(2)]); seg.push([+pts[2][0].toFixed(2), +pts[2][1].toFixed(2), +pts[3][0].toFixed(2), +pts[3][1].toFixed(2)]); } }
      return { level: lv, seg }; }); }

    /* JSON-able description: parameters, gaps, bars, channels and the quantised depth grid (centimetres) */
    function bathy() {
      const dq = new Array(N * N); for (let k = 0; k < N * N; k++) dq[k] = Math.round(G.depth[k] * 100);
      return { version: 1, kind: 'seabed', seed, n: N, half, cell: +cell.toFixed(4), units: 'depth in cm below MSL', axis: +axisAng.toFixed(4), prevailing: +prev.toFixed(3),
        params: P, islands: isl.map(I => ({ id: I.id, x: I.x, z: I.z, r: I.r, Dm: I.Dm, slope: +I.slope.toFixed(3), L: +I.L.toFixed(2) })),
        gaps: gaps.map(g => ({ i: g.i, j: g.j, w: g.w, mid: g.mid.map(v => +v.toFixed(2)), bar: !!g.bar })), bars: bars.map(b => ({ i: b.i, j: b.j, a: b.a.map(v => +v.toFixed(2)), b: b.b.map(v => +v.toFixed(2)), peak: +b.peak.toFixed(3) })),
        channels: chans.map(c => ({ i: c.i, j: c.j, w: c.w, scour: +c.S.toFixed(2), hole: c.hole.map(v => +v.toFixed(2)), sills: c.sills.map(q => q.map(v => +v.toFixed(2))) })), depth: dq };
    }
    return { P, seed, layout, isl, NI, start, axis, axisAng, gaps, bars, chans, G, N, cell, half, sdsAt, depthFromSd, depthAt, landAt, rockAt, gi, gbil, widthAt, spdAt, spdFAt, depthG,
      levelAt, exposedArea, linked, minutesAbove, landingWindows, shoreRay, measures, contours, bathy, streamSpeed, rayLand, prevailing: prev };
  }
  globalThis.LI_SEABED = { version: 1, P, AUTHORED, layoutForSeed, create, streamSpeed, mulberry32, fbm, defaultSd, normalise, minutesAbove: (lv) => { const A = P.tideA; if (lv <= -A) return P.tidePeriodMin; if (lv >= A) return 0; return (Math.PI - 2 * Math.asin(lv / A)) / (2 * Math.PI) * P.tidePeriodMin; } };
})();
