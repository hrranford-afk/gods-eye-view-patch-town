/* Living Islands: WORLD VIEW (islands_look.html?world=NNN, see WORLD_VIEW.md). Loaded only when the switch is present, after the world file
   landform/worlds/seedNNNN/world.js (window.LI_WORLDS[NNN]) and li_kit.js. Classic script: sets window.LI_WORLD.
   It turns one exported world of the land formation tool (landform/export_world.py: height, rock, vegetation, shore class, exposure, wetness, bed hardness
   on a 2 m grid over a 256 m window) into what the page needs: a height function H(x,z) (bicubic), a terrain colour from the maps, the content (trees, rocks,
   jetty, houses, camp, boats) placed from the maps and the landing sites, and an adapter that gives the seabed pass the world's own depth field.
   Page coordinates: x east, z SOUTH, y up, metres, sea level 0, window centre at the origin. Everything is a pure function of (world file, seed): no clocks. */
(function () {
'use strict';
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sm = t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function b64(s) { const bin = atob(s), n = bin.length, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u; }
/* Catmull-Rom weights for a unit step t */
function cr(t, o) { const t2 = t * t, t3 = t2 * t; o[0] = -.5 * t3 + t2 - .5 * t; o[1] = 1.5 * t3 - 2.5 * t2 + 1; o[2] = -1.5 * t3 + 2 * t2 + .5 * t; o[3] = .5 * t3 - .5 * t2; }
/* veg classes of the tool (landform/world.py VEG_LEGEND) */
const V = { water: 0, bare: 1, lichen: 2, heather: 3, bog: 4, machair: 5, pasture: 6, turf: 7, scrub: 8, sand: 9, shingle: 10, rush: 11, loch: 12, dcoast: 13, dwood: 14, dpine: 15, dhigh: 16, dlava: 17, dsummit: 18, dash: 19 };
const SH = { water: 0, sand: 1, shingle: 2, gentle: 3, ledge: 4, cliff: 5, land: 6 };

function list() { return window.LI_WORLD_INDEX || []; }
function has(seed) { return !!(window.LI_WORLDS && window.LI_WORLDS[seed]); }

/* K = page helpers: {tableR, lin, mix3, fbm, vnoise, hash2, mulberry32, PL (linear palette), zone(c,h,n1,n2,x,z)} */
function create(seed, K) {
  const man = window.LI_WORLDS[seed];
  const nx = man.nx, dx = man.dx, half = (nx - 1) * dx / 2, A = man.arrays;
  const u8 = b64(man.b64);
  const view = (name, T) => new T(u8.buffer, A[name].offset, nx * nx);
  const hI = view('height', Int16Array), rockM = view('rock', Uint8Array), vegM = view('veg', Uint8Array), shM = view('shore', Uint8Array),
    expM = view('exposure', Uint8Array), wetM = view('wetness', Uint8Array), bedM = view('bed', Uint8Array);
  const hF = new Float32Array(nx * nx); for (let k = 0; k < nx * nx; k++) hF[k] = hI[k] / man.height_scale;
  const prov = man.province;
  const fadeR0 = K.tableR - 16;
  const wx = [0, 0, 0, 0], wz = [0, 0, 0, 0];
  function hRaw(x, z) {
    const fx = (x + half) / dx, fz = (z + half) / dx; let i = Math.floor(fx), j = Math.floor(fz); cr(fx - i, wx); cr(fz - j, wz);
    let s = 0;
    for (let b = 0; b < 4; b++) { const jj = clamp(j - 1 + b, 0, nx - 1) * nx; let r = 0; for (let a = 0; a < 4; a++) r += wx[a] * hF[jj + clamp(i - 1 + a, 0, nx - 1)]; s += wz[b] * r; }
    return s;
  }
  /* the height the page uses: the world, except that the last 16 m before the table edge sink to deep water (no land is cut by the wall) */
  function h(x, z) {
    let v = hRaw(x, z); const r = Math.sqrt(x * x + z * z);
    if (r > fadeR0) { const t = sm((r - fadeR0) / (K.tableR + 2 - fadeR0)); v = v * (1 - t) - 8 * t; }
    return v;
  }
  const ci = v => clamp(Math.round((v + half) / dx), 0, nx - 1);
  const cell = (x, z) => ci(z) * nx + ci(x);
  /* ----- signed distance (m, + inland) and land labels on the data grid ----- */
  const NN = nx * nx, land = new Uint8Array(NN);
  for (let k = 0; k < NN; k++) land[k] = hF[k] > 0.05 ? 1 : 0;
  function chamfer(mask) {          /* distance in cells to the nearest cell with mask==1 */
    const d = new Float32Array(NN).fill(1e6), s2 = 1.4142;
    for (let k = 0; k < NN; k++) if (mask[k]) d[k] = 0;
    for (let j = 0; j < nx; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; let v = d[k];
      if (i > 0) v = Math.min(v, d[k - 1] + 1); if (j > 0) { v = Math.min(v, d[k - nx] + 1); if (i > 0) v = Math.min(v, d[k - nx - 1] + s2); if (i < nx - 1) v = Math.min(v, d[k - nx + 1] + s2); } d[k] = v; }
    for (let j = nx - 1; j >= 0; j--) for (let i = nx - 1; i >= 0; i--) { const k = j * nx + i; let v = d[k];
      if (i < nx - 1) v = Math.min(v, d[k + 1] + 1); if (j < nx - 1) { v = Math.min(v, d[k + nx] + 1); if (i < nx - 1) v = Math.min(v, d[k + nx + 1] + s2); if (i > 0) v = Math.min(v, d[k + nx - 1] + s2); } d[k] = v; }
    return d;
  }
  const water = new Uint8Array(NN); for (let k = 0; k < NN; k++) water[k] = land[k] ? 0 : 1;
  const dToLand = chamfer(land), dToWater = chamfer(water);
  const sd = new Float32Array(NN); for (let k = 0; k < NN; k++) sd[k] = land[k] ? dToWater[k] * dx - dx * .5 : -(dToLand[k] * dx - dx * .5);
  const lab = new Int32Array(NN), compSize = [0]; let nl = 0;
  { const st = new Int32Array(NN);
    for (let k0 = 0; k0 < NN; k0++) { if (!land[k0] || lab[k0]) continue; nl++; let sp = 0, cnt = 0; st[sp++] = k0; lab[k0] = nl;
      while (sp) { const k = st[--sp]; cnt++; const i = k % nx, j = (k / nx) | 0;
        if (i > 0 && land[k - 1] && !lab[k - 1]) { lab[k - 1] = nl; st[sp++] = k - 1; } if (i < nx - 1 && land[k + 1] && !lab[k + 1]) { lab[k + 1] = nl; st[sp++] = k + 1; }
        if (j > 0 && land[k - nx] && !lab[k - nx]) { lab[k - nx] = nl; st[sp++] = k - nx; } if (j < nx - 1 && land[k + nx] && !lab[k + nx]) { lab[k + nx] = nl; st[sp++] = k + nx; } }
      compSize.push(cnt); } }
  const sdAt = (x, z) => sd[cell(x, z)];
  const slopeH = (x, z) => { const e = 1.0; const a = (h(x + e, z) - h(x - e, z)) / (2 * e), b = (h(x, z + e) - h(x, z - e)) / (2 * e); return Math.hypot(a, b); };
  const expo = (x, z) => expM[cell(x, z)] / 255;

  /* ----- colour from the maps ----- */
  const PL = K.PL, lin = K.lin, mix3 = K.mix3, fbm = K.fbm;
  const RGB = man.rock_rgb.map(t => t.map(c => lin(c.map(v => v / 255))));       /* [rock][fresh|weathered|lichen] linear */
  const vegBase = {};
  function setVeg() {
    const g = (c) => lin(c);
    vegBase[V.heather] = [g([.40, .36, .26]), g([.52, .36, .44])];       /* moorland: olive-brown with purple heather */
    vegBase[V.bog] = [g([.27, .30, .17]), g([.34, .30, .20])];
    vegBase[V.machair] = [g([.50, .62, .28]), g([.60, .66, .38])];
    vegBase[V.pasture] = [g([.40, .52, .20]), g([.52, .58, .27])];
    vegBase[V.turf] = [g([.44, .50, .25]), g([.58, .55, .32])];
    vegBase[V.scrub] = [g([.26, .35, .16]), g([.20, .30, .14])];
    vegBase[V.rush] = [g([.38, .48, .27]), g([.30, .40, .22])];
    vegBase[V.dcoast] = [g([.40, .44, .22]), g([.33, .40, .20])];
    vegBase[V.dwood] = [g([.18, .30, .13]), g([.14, .25, .12])];
    vegBase[V.dpine] = [g([.24, .34, .15]), g([.20, .30, .15])];
    vegBase[V.dhigh] = [g([.42, .40, .24]), g([.36, .34, .22])];
  }
  setVeg();
  const sandC = [PL.sand, PL.sand2], blackSand = [lin([.12, .12, .13]), lin([.17, .16, .17])];
  const rockOf = k => RGB[rockM[k]] || RGB[0];
  /* colour of one grid cell as the maps say (before the slope and the noise) */
  function cellColour(k, n1, n2, n3) {
    const v = vegM[k], sc = shM[k], rk = rockM[k];
    const RK = rockOf(k);
    if (v === V.loch) return lin([.07, .22, .26]);
    if (v === V.sand || sc === SH.sand) { const b = prov === 'D' ? blackSand : sandC; return mix3(b[0], b[1], sm((n2 - .4) * 3) * .7); }
    if (v === V.shingle || sc === SH.shingle) return mix3(mix3(PL.rockB, PL.shingle, .72), mix3(PL.rockA, PL.sand2, .5), sm((n1 - .35) * 2.5));
    if (v === V.dlava || v === V.dsummit || v === V.dash || v === V.bare) { return mix3(RK[1], RK[0], .35 + .4 * n2).map(c => c * (.8 + .4 * n1)); }
    if (v === V.lichen) { const b = mix3(RK[1], RK[0], .3); return mix3(b, RK[2], sm((n1 - .35) * 3) * .75); }
    const vb = vegBase[v] || vegBase[V.pasture];
    let c = mix3(vb[0], vb[1], sm((n1 - .35) * 3));
    c = mix3(c, mix3(vegBase[V.bog][0], vegBase[V.scrub][0], .5), sm((n3 - .55) * 3) * .45);
    if (v === V.heather) c = mix3(c, mix3(PL.heather, PL.heather2, n1).map(q => q * .85), sm((n2 - .55) * 5) * .42);
    if (prov === 'D') c = mix3(c, RK[1], .5 - .25 * n2);   /* volcanic ground: the rock's own ash and loam colour under the vegetation class */
    return c;
  }
  const idxs = [0, 0, 0, 0], wts = [0, 0, 0, 0];
  function color(x, z, hh, ny, pd) {
    const slope = 1 - ny;
    const n1 = fbm(x * .16, z * .16, seed + 41, 3), n2 = fbm(x * .5, z * .5, seed + 43, 2), n3 = fbm(x * .05, z * .05, seed + 47, 3);
    /* rock colour: the tool's palette, fresh on the steep and the wave-washed, weathered on the gentle; the page's tide zoning on top */
    const rockCol = (k) => { const RK = rockOf(k); let c = mix3(RK[1], RK[0], clamp(.1 + slope * 1.4 + (n2 - .5) * .5, 0, 1)); const st = .9 + .12 * Math.sin(hh * 4.6 + n1 * 5); const cr2 = Math.abs(fbm(x * .4, z * .4, seed + 61, 3) - .5) < .03 ? .7 : 1; c = c.map(v => v * st * cr2 * (.85 + .3 * n2)); const lum = (c[0] + c[1] + c[2]) / 3; c = [lerp(c[0], lum, .35) * 1.04, lerp(c[1], lum, .35), lerp(c[2], lum, .35) * .93]; return K.zone(c, hh, n1, n2, x, z); };
    if (hh < -.15) {   /* the sea floor: sand over soft bed, dark rock and kelp over hard bed */
      const kk = cell(x, z), bd = bedM[kk] / 255, dpt = -hh;
      let c = mix3(PL.seabed, PL.seabed2, sm((dpt - 1.2) / 3.2));
      c = mix3(c, mix3(PL.sand2, PL.sand, .4), (1 - sm(bd / .3)) * (1 - sm((dpt - .2) / 1.6)) * .8);
      c = mix3(c, mix3(rockCol(kk), PL.seabed2, .45), sm((bd - .3) / .25) * .7 * (1 - sm((dpt - 5) / 4)));
      if (dpt > .5 && dpt < 4.5 && bd > .3 && n2 > .5) c = mix3(c, PL.kelp, sm((n2 - .5) * 5) * .85);
      return c;
    }
    /* land: bilinear blend of the cell colours (the maps are on a 2 m grid), sampling point warped by noise so classes meet in wavy lines */
    const wxp = x + (fbm(x * .11 + 7, z * .11, seed + 5, 2) - .5) * 3.2, wzp = z + (fbm(x * .11, z * .11 + 9, seed + 6, 2) - .5) * 3.2;
    const fx = (wxp + half) / dx - 0, fz = (wzp + half) / dx - 0, i0 = clamp(Math.floor(fx), 0, nx - 2), j0 = clamp(Math.floor(fz), 0, nx - 2), tx = clamp(fx - i0, 0, 1), tz = clamp(fz - j0, 0, 1);
    const ws = [(1 - tx) * (1 - tz), tx * (1 - tz), (1 - tx) * tz, tx * tz], ks = [j0 * nx + i0, j0 * nx + i0 + 1, (j0 + 1) * nx + i0, (j0 + 1) * nx + i0 + 1];
    let c = [0, 0, 0], rockAmt = 0;
    for (let q = 0; q < 4; q++) { if (ws[q] < .001) continue; const kq = ks[q]; const cc = cellColour(kq, n1, n2, n3); c[0] += cc[0] * ws[q]; c[1] += cc[1] * ws[q]; c[2] += cc[2] * ws[q];
      const v = vegM[kq]; rockAmt += ws[q] * (v === V.bare ? .9 : v === V.lichen ? .55 : (v === V.dlava || v === V.dsummit) ? .8 : 0); }
    /* steep ground is rock whatever the vegetation class says; the tide-washed rim of the shore too */
    rockAmt = clamp(rockAmt + sm((slope - .13) / .16) + (1 - sm((hh - .6) / 1.0)) * (shM[cell(x, z)] === SH.ledge || shM[cell(x, z)] === SH.cliff ? .85 : 0), 0, 1);
    if (rockAmt > 0) c = mix3(c, rockCol(cell(x, z)), rockAmt);
    /* the wet fringe and the dirt of the paths round the buildings */
    const sa = 1 - sm((hh - .15) / .35); if (sa > 0 && (vegM[cell(x, z)] === V.sand || shM[cell(x, z)] === SH.sand)) c = mix3(c, PL.sand, sa * .5);
    c = mix3(c, PL.dirt, sm(1 - pd / 1.9) * .8);
    const mv = .86 + .28 * fbm(x * 1.5, z * 1.5, seed + 53, 2) + .08 * (fbm(x * .3, z * .3, seed + 59, 2) - .5); return c.map(q => q * mv);
  }

  /* ----- the content ----- */
  const report = { trees: 0, broad: 0, shrubs: 0, tufts: 0, rocks: 0, houses: 0, boats: 0, notes: [] };
  function place(X) {
    const { W, PADS, H, slopeAt, padDist, R, quality } = X, LOW = quality === 'low';
    const L = man.landing, lw = (x, z) => lab[cell(x, z)];
    /* --- the start island = the land component at the landing --- */
    let lx = L.xy[0], lz = L.xy[1], startLab = 0;
    for (let rr = 0; rr < 14 && !startLab; rr += dx) for (let a = 0; a < 360 && !startLab; a += 30) { const x = lx + Math.cos(a * 0.01745) * rr, z = lz + Math.sin(a * 0.01745) * rr; if (land[cell(x, z)]) startLab = lw(x, z); }
    const onStart = (x, z) => lw(x, z) === startLab;
    /* the seaward direction: the tool's normal if it ends in deep water, else the best of 16 bearings */
    function shoreAlong(x0, z0, dx_, dz_) { for (let r = -10; r < 40; r += .25) if (h(x0 + dx_ * r, z0 + dz_ * r) < .05 && r > -6) return r; return 99; }
    function bestDir(x0, z0, n0) {
      let best = null, bs = -1e9;
      for (let k = -1; k < 16; k++) { const a = k < 0 ? Math.atan2(n0[1], n0[0]) : k / 16 * 6.2832, d = [Math.cos(a), Math.sin(a)], r = shoreAlong(x0, z0, d[0], d[1]); if (r > 30) continue;
        const sx = x0 + d[0] * r, sz = z0 + d[1] * r; let deep = 0; for (let t = 4; t <= 24; t += 4) deep += h(sx + d[0] * t, sz + d[1] * t) < -1.5 ? 1 : 0;
        let ln = 0; for (let t = -8; t <= 8; t += 4) ln += h(sx + d[1] * t, sz - d[0] * t) > -.2 && h(sx + d[1] * t, sz - d[0] * t) < 2.5 ? 1 : 0;      /* a shore that runs along the tangent, not a point */
        const sc = deep * 3 + ln * 1.2 - Math.abs(r) * .05 + (k < 0 ? 1.5 : 0); if (sc > bs) { bs = sc; best = { d, r, sx, sz }; } }
      return best;
    }
    const L0 = bestDir(lx, lz, L.normal) || { d: L.normal, r: 0, sx: lx, sz: lz };
    const dir = L0.d, rt = [dir[1], -dir[0]], S = { x: L0.sx, z: L0.sz };
    report.landingKind = L.kind;
    /* --- jetty at the landing: from 1.5 m inland of the waterline out to deep water --- */
    const jr = (() => { let r0 = 0; for (let r = 4; r > -6; r -= .25) { if (h(S.x - dir[0] * r, S.z - dir[1] * r) >= .95) { r0 = -r; break; } } return r0; })();
    {
      const sx = S.x - dir[0] * (1.6 + Math.max(0, jr)), sz = S.z - dir[1] * (1.6 + Math.max(0, jr));
      let len = 12.5; for (; len < 30; len += 1) { const tx = sx + dir[0] * len, tz = sz + dir[1] * len; if (h(tx, tz) < -1.9 && h(tx + rt[0] * 3, tz + rt[1] * 3) < -1.8 && h(tx - rt[0] * 3, tz - rt[1] * 3) < -1.8 && h(tx + dir[0] * 4, tz + dir[1] * 4) < -1.9) break; }
      PADS.push({ x: sx, z: sz, r: 1.8, y: Math.max(1.45, h(sx, sz)) });
      W.jetty = { x: sx, z: sz, dx: dir[0], dz: dir[1], len, deck: 1.55, w: 1.7 };
      const ux = -dir[0], uz = -dir[1], px = -uz, pz = ux, tipx = sx + dir[0] * len, tipz = sz + dir[1] * len;
      W.boats.push({ kind: 'moored', x: tipx + px * 2.0 - ux * 2.2, z: tipz + pz * 2.0 - uz * 2.2, yaw: Math.atan2(-ux, -uz) + Math.PI / 2 + .07, L: 4.4, Wd: 1.7, Hh: .62, hull: [.93, .94, .92], stripe: [.18, .32, .55], ph: 0 });
      W.boats.push({ kind: 'moored', x: tipx - px * 2.2 - ux * 5.5, z: tipz - pz * 2.2 - uz * 5.5, yaw: Math.atan2(-ux, -uz) + Math.PI / 2 - .12, L: 3.7, Wd: 1.5, Hh: .58, hull: [.72, .22, .18], stripe: [.95, .9, .8], ph: 2.1 });
      /* a sailing boat on a circle of open water near the landing */
      let bestC = null, bc = -1e9;
      for (let ang = 0; ang < 360; ang += 20) for (let dd = 26; dd <= 70; dd += 8) { const cx = S.x + (dir[0] * Math.cos(ang * .01745) - dir[1] * Math.sin(ang * .01745)) * dd, cz = S.z + (dir[0] * Math.sin(ang * .01745) + dir[1] * Math.cos(ang * .01745)) * dd;
        if (Math.hypot(cx, cz) > K.tableR - 22) continue; let ok = true, mn = 99; for (let q = 0; q < 12 && ok; q++) { const a = q / 12 * 6.2832, x = cx + Math.cos(a) * 12, z = cz + Math.sin(a) * 12, hh = h(x, z); if (hh > -2.2) ok = false; mn = Math.min(mn, -sdAt(x, z)); }
        if (!ok || mn < 6) continue; const sc = -dd * .5 + mn * .3 + (dd < 40 ? 0 : 6); if (sc > bc) { bc = sc; bestC = [cx, cz]; } }
      if (bestC) W.boats.push({ kind: 'moored', x: bestC[0] + 12, y: 0, z: bestC[1], yaw: 0, L: 3.7, Wd: 1.5, Hh: .58, hull: [.58, .34, .28], stripe: [.95, .9, .8], ph: 1.4, sail: { cx: bestC[0], cz: bestC[1], r: 12 } });
      else report.notes.push('no open water circle for the sailing boat');
    }
    /* --- camp: on another shore of the start island (a landing candidate or shore segment 30 m or more from the jetty), else beside the landing --- */
    const farFromJetty = (x, z) => Math.hypot(x - W.jetty.x, z - W.jetty.z) >= 28;
    let cands = (man.landing_candidates || []).concat((man.shores || []).filter(s => s.collectable)).filter(c => onStart(c.xy[0], c.xy[1]) && farFromJetty(c.xy[0], c.xy[1]));
    cands.sort((a, b) => (a.exposure - b.exposure) + (Math.hypot(a.xy[0] - S.x, a.xy[1] - S.z) < 90 ? 0 : .3) - ((b.length_m || 0) - (a.length_m || 0)) * .002);
    let campS = null, campD = null;
    for (const c of cands) { const b = bestDir(c.xy[0], c.xy[1], c.normal); if (!b || !onStart(b.sx - b.d[0] * 6, b.sz - b.d[1] * 6)) continue; if (!farFromJetty(b.sx, b.sz)) continue;
      let flat = 0; for (let t = 2; t <= 10; t += 2) { const q = slopeAt(b.sx - b.d[0] * t, b.sz - b.d[1] * t); flat += q < .4 ? 1 : 0; } if (flat < 3) continue; campS = { x: b.sx, z: b.sz }; campD = b.d; break; }
    if (!campS) { campS = { x: S.x + rt[0] * 22, z: S.z + rt[1] * 22 }; const b = bestDir(campS.x, campS.z, dir); campD = b ? b.d : dir; if (b) campS = { x: b.sx, z: b.sz }; report.notes.push('camp beside the landing'); }
    {
      const d = campD, r2 = [d[1], -d[0]];
      let rf = 5; for (let r = 2; r < 18; r += .25) { const x = campS.x - d[0] * r, z = campS.z - d[1] * r; if (h(x, z) >= 1.2 && slopeAt(x, z) < .45) { rf = r; break; } }
      let fire = null; for (let extra = 0; extra < 14 && !fire; extra += 1.5) { const fx = campS.x - d[0] * (rf + extra), fz = campS.z - d[1] * (rf + extra); const t1 = [fx - d[0] * 3.6 - r2[0] * 4.4, fz - d[1] * 3.6 - r2[1] * 4.4], t2 = [fx - d[0] * 4.6 + r2[0] * 3.9, fz - d[1] * 4.6 + r2[1] * 3.9];
        if (h(fx, fz) > .9 && h(t1[0], t1[1]) > .7 && h(t2[0], t2[1]) > .7 && slopeAt(fx, fz) < .55 && onStart(fx, fz)) fire = { x: fx, z: fz, t1, t2 }; }
      if (!fire) { fire = { x: campS.x - d[0] * (rf + 3), z: campS.z - d[1] * (rf + 3) }; fire.t1 = [fire.x - d[0] * 3.6 - r2[0] * 4.4, fire.z - d[1] * 3.6 - r2[1] * 4.4]; fire.t2 = [fire.x - d[0] * 4.6 + r2[0] * 3.9, fire.z - d[1] * 4.6 + r2[1] * 3.9]; report.notes.push('camp on poor ground'); }
      const fy = Math.max(.7, H(fire.x, fire.z)); PADS.push({ x: fire.x, z: fire.z, r: 2.6, y: fy });
      const t1 = { x: fire.t1[0], z: fire.t1[1] }, t2 = { x: fire.t2[0], z: fire.t2[1] };
      t1.y = Math.max(.6, H(t1.x, t1.z)); t2.y = Math.max(.6, H(t2.x, t2.z)); t1.yaw = Math.atan2(d[0], d[1]) + .35; t2.yaw = Math.atan2(d[0], d[1]) - .4;
      PADS.push({ x: t1.x, z: t1.z, r: 2.4, y: t1.y }, { x: t2.x, z: t2.z, r: 2.4, y: t2.y });
      W.tents = [{ ...t1, col: [.93, .52, .16], col2: [.98, .82, .55] }, { ...t2, col: [.22, .45, .60], col2: [.80, .84, .86] }];
      W.camp = { fire: { x: fire.x, z: fire.z, y: fy }, dir: d, rt: r2, shoreR: rf, I: null };
    }
    /* --- the village: houses on gentle ground behind the jetty, turned to the water --- */
    {
      const cand = [];
      for (let x = S.x - 70; x <= S.x + 70; x += 2.4) for (let z = S.z - 70; z <= S.z + 70; z += 2.4) {
        const dd = Math.hypot(x - S.x, z - S.z); if (dd < 7 || dd > 62) continue; if (!onStart(x, z)) continue;
        const hh = h(x, z), s = sdAt(x, z); if (hh < 1.4 || hh > 8 || s < 3.5) continue; const sl = slopeH(x, z); if (sl > .4) continue;
        const sc = shM[cell(x, z)], v = vegM[cell(x, z)]; if (v === V.loch || v === V.bog || v === V.sand || sc === SH.ledge || sc === SH.cliff) continue;
        if (W.camp && Math.hypot(x - W.camp.fire.x, z - W.camp.fire.z) < 9) continue; if (Math.hypot(x - W.jetty.x, z - W.jetty.z) < 5) continue;
        cand.push({ x, z, h: hh, key: dd * (.55 + .9 * R()) + sl * 30 }); }
      cand.sort((a, b) => a.key - b.key);
      const chosen = [], nH = LOW ? 6 : 10;
      for (const c of cand) { if (chosen.length >= nH) break; let ok = true; for (const o of chosen) if (Math.hypot(o.x - c.x, o.z - c.z) < 5.2) { ok = false; break; } if (ok) chosen.push(c); }
      for (const c of chosen) { const yaw = Math.atan2(S.x - c.x, S.z - c.z) + (R() - .5) * .35; const y = H(c.x, c.z); PADS.push({ x: c.x, z: c.z, r: 2.7, y });
        W.houses.push({ x: c.x, z: c.z, y, yaw, w: 3.1 + R() * 1.1, d: 2.6 + R() * .7, wh: 2.2 + R() * .5, roof: R() < .5 ? 0 : R() < .6 ? 1 : 2, chim: R() < .65, id: W.houses.length }); }
    }
    /* moored boats must float at the lowest tide: push them seaward until the bed is deeper than the hull */
    W.boats.forEach(bt => { if (bt.sail) return; for (let k = 0; k < 80 && h(bt.x, bt.z) > -1.5; k++) { bt.x += dir[0] * .8; bt.z += dir[1] * .8; } });
    /* --- rocks, trees, shrubs, tufts, driftwood from the maps --- */
    const rockPal = (() => { const f = RGB.length ? man.rock_rgb : null; const rows = prov === 'A' ? [0, 1] : prov === 'B' ? [4, 5] : prov === 'C' ? [8, 9] : [14, 15]; const out = []; for (const r of rows) for (const t of [0, 1]) out.push(f[r][t].map(v => v / 255)); out.push([.47, .43, .39], [.40, .38, .37]); return out; })();
    const radius = K.tableR - 10, bins = new Map(); const near = (x, z, r) => { const gx = Math.floor(x / 4), gz = Math.floor(z / 4); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const l = bins.get((gx + a) * 4096 + gz + b); if (l) for (const p of l) if (Math.hypot(p[0] - x, p[1] - z) < Math.max(r, p[2])) return true; } return false; };
    const reg = (x, z, r) => { const k = Math.floor(x / 4) * 4096 + Math.floor(z / 4); let l = bins.get(k); if (!l) bins.set(k, l = []); l.push([x, z, r]); };
    W.houses.forEach(o => reg(o.x, o.z, 3.6)); W.tents.forEach(o => reg(o.x, o.z, 3)); if (W.camp) reg(W.camp.fire.x, W.camp.fire.z, 3.6); reg(W.jetty.x, W.jetty.z, 3);
    const rpt = () => { const a = R() * 6.2832, r = Math.sqrt(R()) * radius; return [Math.cos(a) * r, Math.sin(a) * r]; };
    const nRock = LOW ? 45 : 80;
    for (let tries = 0, got = 0; got < nRock && tries < nRock * 60; tries++) {
      const [x, z] = rpt(), hh = h(x, z), s = sdAt(x, z), k = cell(x, z);
      const shoreBand = hh > -2.6 && hh < 2.6 && Math.abs(s) < 9, steepOut = hh > 1 && slopeH(x, z) > .45 && (shM[k] === SH.ledge || shM[k] === SH.cliff || vegM[k] === V.lichen || vegM[k] === V.bare);
      if (!(shoreBand && R() < (shM[k] === SH.ledge || shM[k] === SH.cliff ? .9 : .5) || steepOut && R() < .5)) continue;
      if (padDist(x, z) < 2.4 || near(x, z, 1.2)) continue; if (Math.hypot(x, z) > radius) continue;
      const sx = 0.7 + Math.pow(R(), 1.8) * (shoreBand ? 1.9 : 2.4), sz = sx * (.7 + R() * .5), sy = sx * (.5 + R() * .4); let y = hh + sy * .15;
      if (shoreBand && hh < .3 && R() < .5) { const top = -.95 + R() * 1.95; y = top - sy * .9; }
      W.rocks.push({ x, z, y, sx, sy, sz, ry: R() * 6.28, seed: (R() * 1e6) | 0, pal: rockPal[(R() * rockPal.length) | 0], lich: Math.min(.9, .2 + Math.max(0, hh) * .12) }); reg(x, z, sx * .9); got++;
      if (sx > 1.2 && R() < .6) { const kk = 2 + ((R() * 3) | 0); for (let q = 0; q < kk; q++) { const a = R() * 6.28, d = sx * (.8 + R() * .9), s2 = sx * (.3 + R() * .35), x2 = x + Math.cos(a) * d, z2 = z + Math.sin(a) * d; if (h(x2, z2) < -2.6) continue;
        W.rocks.push({ x: x2, z: z2, y: H(x2, z2) + s2 * .1, sx: s2, sy: s2 * (.5 + R() * .4), sz: s2 * (.7 + R() * .5), ry: R() * 6.28, seed: (R() * 1e6) | 0, pal: rockPal[(R() * rockPal.length) | 0], lich: .4 }); } }
    }
    if (W.camp) { const f = W.camp.fire; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; W.rocks.push({ x: f.x + Math.cos(a) * .75, z: f.z + Math.sin(a) * .75, y: f.y + .02, sx: .23, sy: .17, sz: .2, ry: a, seed: k * 13, pal: rockPal[k % rockPal.length], lich: 0, keep: 1 }); } }
    /* vegetation weights per class (per 4 m2 attempt): conifer, broadleaf, shrub; province multiplies. All TUNING. */
    const VW = {}; VW[V.heather] = [.05, .008, .09]; VW[V.bog] = [0, 0, .03]; VW[V.machair] = [0, 0, .03]; VW[V.pasture] = [.04, .03, .035]; VW[V.turf] = [.025, .01, .04]; VW[V.scrub] = [.2, .10, .12]; VW[V.rush] = [0, .015, .04];
    VW[V.dcoast] = [.02, .01, .06]; VW[V.dwood] = [.10, .05, .06]; VW[V.dpine] = [.10, .03, .05]; VW[V.dhigh] = [0, 0, .06];
    const PM = prov === 'A' ? [1.3, .6, 1.0] : prov === 'B' ? [.7, 2.4, 1.0] : prov === 'C' ? [.8, 1.0, 1.2] : [1.1, .8, 1.0];
    const cap = { c: LOW ? 80 : 150, b: LOW ? 24 : 44, s: LOW ? 60 : 120, t: LOW ? 200 : 420 }; let nc = 0, nb = 0, ns = 0, nt = 0;
    const SEEDX = seed * 7 + 3;
    for (let tries = 0; tries < 90000 && (nc < cap.c || nb < cap.b || ns < cap.s || nt < cap.t); tries++) {
      const [x, z] = rpt(); const k = cell(x, z); if (!land[k]) continue; const hh = h(x, z); if (hh < 1.2) continue; const v = vegM[k]; const vw = VW[v]; if (!vw && !(v === V.pasture || v === V.heather)) { if (v !== V.bare && v !== V.lichen) continue; }
      const sl = slopeH(x, z), ex = expM[k] / 255; if (sl > .62) continue; if (padDist(x, z) < 2.4) continue;
      const w = vw || [0, 0, 0], clump = K.fbm(x * .07, z * .07, SEEDX, 3), thr = clump > .42 ? 1 : clump > .34 ? .25 : .03, shel = 1 - sm((ex - .35) / .4), soil = 1 - sm((sl - .3) / .3);
      const r = R();
      let pc = w[0] * PM[0] * thr * shel * soil, pb = w[1] * PM[1] * thr * shel * soil, ps = w[2] * PM[2] * (.5 + .5 * soil) * (.6 + .4 * shel);
      if (hh < 1.9) { pc = 0; pb = 0; ps *= .5; } if (vegM[k] === V.lichen || vegM[k] === V.bare) { pc = pb = 0; ps *= .15; }
      if (r < pc && nc < cap.c) { if (near(x, z, 2.6)) continue; W.conifers.push({ x, z, y: hh, s: R(), h: 0 }); reg(x, z, 2.6); nc++; }
      else if (r < pc + pb && nb < cap.b) { if (near(x, z, 3.4)) continue; W.broad.push({ x, z, y: hh, s: R(), h: 0 }); reg(x, z, 3.4); nb++; }
      else if (r < pc + pb + ps && ns < cap.s) { if (near(x, z, 1.6)) continue; W.shrubs.push({ x, z, y: hh, s: R(), h: 0, heather: v === V.heather ? R() < .6 : R() < .15 }); reg(x, z, 1.6); ns++; }
    }
    W.conifers.forEach(t => { const sh = 1 - sm((expM[cell(t.x, t.z)] / 255 - .3) / .5); t.h = (3.0 + t.s * 3.2) * (.75 + .3 * sh); });
    W.broad.forEach(t => { t.h = 3.6 + t.s * 2.4; }); W.shrubs.forEach(t => { t.h = .7 + t.s * .8; });
    /* tufts on grass, machair, sand fringes; driftwood on beaches */
    for (let tries = 0; tries < 60000 && nt < cap.t; tries++) { const [x, z] = rpt(), k = cell(x, z); if (!land[k]) continue; const hh = h(x, z); if (hh < .35) continue; const v = vegM[k];
      const pt = v === V.pasture || v === V.turf || v === V.machair ? .16 : v === V.heather ? .05 : v === V.rush || v === V.bog ? .07 : v === V.sand ? .02 : 0; if (R() >= pt) continue; if (padDist(x, z) < 1.5 || near(x, z, .9)) continue;
      const dry = v === V.heather || v === V.sand; W.tufts.push({ x, z, y: hh, s: R(), col: dry ? [.62 + R() * .06, .56, .36] : v === V.rush || v === V.bog ? [.36 + R() * .08, .44, .26] : [.45 + R() * .1, .5 + R() * .05, .26] }); nt++; }
    for (let tries = 0, got = 0; got < (LOW ? 3 : 6) && tries < 4000; tries++) { const [x, z] = rpt(), k = cell(x, z); if (!land[k] || !(shM[k] === SH.sand || shM[k] === SH.shingle)) continue; const hh = h(x, z); if (hh < .1 || hh > 1.2 || padDist(x, z) < 2) continue; W.logs.push({ x, z, y: hh + .1, len: 1.6 + R() * 2, yaw: R() * 3.14, r: .12 }); got++; }
    report.trees = W.conifers.length; report.broad = W.broad.length; report.shrubs = W.shrubs.length; report.tufts = W.tufts.length; report.rocks = W.rocks.length; report.houses = W.houses.length; report.boats = W.boats.length;
    report.jetty = W.jetty ? { len: W.jetty.len } : null; report.startLabel = startLab; report.dir = dir;
  }

  /* ----- the seabed pass reads this world's own depth field ----- */
  function seabed(SBM) {
    const P = SBM.P, n = 128, halfG = 128, cellG = 2 * halfG / n, depth = new Float32Array(n * n), hard = new Float32Array(n * n), ex = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -halfG + (i + .5) * cellG, z = -halfG + (j + .5) * cellG, k = cell(x, z), hh = h(x, z); depth[j * n + i] = Math.max(0, -hh); hard[j * n + i] = clamp(bedM[k] / 255 * 1.6, 0, 1); ex[j * n + i] = expM[k] / 255; }
    const G = { n, half: halfG, cell: cellG, depth, hard, expo: ex };
    const gbil = (arr, x, z) => { let fx = (x + halfG) / cellG - .5, fz = (z + halfG) / cellG - .5; fx = clamp(fx, 0, n - 1.001); fz = clamp(fz, 0, n - 1.001); const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
      const a = arr[j * n + i], b = arr[j * n + i + 1], c = arr[(j + 1) * n + i], d = arr[(j + 1) * n + i + 1]; return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz; };
    const depthG = (x, z) => gbil(depth, x, z);
    const cont = raw => { raw = raw < P.uMin ? P.uMin : raw; return raw <= 2 ? raw : 2 + (P.uMax - 2) * (1 - Math.exp(-(raw - 2) / (P.uMax - 2))); };
    const fric = D => .25 + .75 * sm(D / 1.2);
    /* the cross-section: width is twice the distance to the nearest land (a channel between two shores), depth from the field */
    const widthAt = (x, z) => Math.max(2 * (-sdAt(x, z)), 2);
    const spdAt = (x, z) => { const D = Math.max(depthG(x, z), .3), w = widthAt(x, z); return cont(P.refA / (w * D)); };
    const spdFAt = (x, z) => spdAt(x, z) * fric(Math.max(depthG(x, z), .3));
    return { P, G, N: n, half: halfG, cell: cellG, chans: [], bars: [], gaps: [], gbil, depthG, depthAt: depthG, spdAt, spdFAt, widthAt, streamSpeed: (w, D) => P.U0 * cont(P.refA / (Math.max(w, 1) * Math.max(D, .3))) * fric(D) };
  }

  return { man, seed, nx, dx, half, h, hRaw, sd: sdAt, expo, slopeH, color, place, seabed, report, cell,
    maps: { rock: rockM, veg: vegM, shore: shM, exposure: expM, wetness: wetM, bed: bedM, height: hF, land, sd, lab },
    landFraction: () => { let n = 0; for (let k = 0; k < NN; k++) n += land[k]; return n / NN; } };
}
/* pseudo island records for the code that wants a list of islands (flow field, gulls, weather): the largest islands of the window, at least 6 entries */
function islandsFor(man) {
  const o = man.islands.slice(0, 8).map(I => ({ id: 'w' + I.id, x: I.xy[0], z: I.xy[1], rx: Math.max(6, I.rx * .62), rz: Math.max(6, I.rz * .62), rot: 0, peak: I.max_h, warp: 0, under: .3, surf: .5 }));
  for (let i = 0; o.length < 6; i++) { const q = o[i % Math.max(1, o.length)] || { id: 'w0', x: 0, z: 0, rx: 10, rz: 10, rot: 0, warp: 0, under: .3, surf: .5 }; o.push(Object.assign({}, q, { id: q.id + 'b' + o.length })); }
  return o;
}
window.LI_WORLD = { create, list, has, islandsFor, V, SH };
})();
