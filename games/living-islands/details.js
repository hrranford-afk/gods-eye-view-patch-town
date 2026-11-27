/* Living Islands: the OPENING DETAIL KIT (research/OPENING_DETAILS_REPORT.md). Procedural three.js r128 geometry with the wear BAKED IN (vertex colours from a seeded wear model, plus a few small generated data textures), no downloads.
   window.LI_DETAILS / globalThis.LI_DETAILS / module.exports.
   Two stages, so node can test without a GPU:
     plan(kind, opts)  -> PURE data (no THREE): nodes -> buckets of position / normal / colour / uv / index, instanced lists, named parts (bounding boxes), triangle count. Same opts, same bytes.
     build(kit, kind, opts) -> a THREE.Group made from a plan, with userData: stats, tick(t), and for robots setLens / setHatch / setBattery. kit = makeKit(THREE) (shared materials and textures, one uTime for the sway shader).
   kinds: robot_hauler robot_sorter robot_stacker hulk jetty bay_planks bay_rope bay_glass bay_metal hut lantern washline firepit barrels battery hands.
   opts (all optional): seed, wear 0..1, lod 0..2 (0 = full, 1 = about a third, 2 = about a tenth), plus per kind: lens, hatch, batteryOut (robots), broken, u0, u1, apron, crane (jetty), stack (bays), list (hulk), lit (hut, lantern).
   Local axes: robots face +X, side hatch on +Z, up +Y; the jetty runs along +X (u, seaward) with +Z toward the island (w); the hulk bow is +X; bays: length along X; units metres. Tags: TUNING = a number chosen by eye. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, PI = Math.PI;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function hash(i, s) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function n3(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    const h = (a, b, c) => hash(a + Math.imul(b, 57) + Math.imul(c, 131), 91), l = (a, b, t) => a + (b - a) * t;
    return l(l(l(h(ix, iy, iz), h(ix + 1, iy, iz), ux), l(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), ux), uy), l(l(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), ux), l(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), ux), uy), uz);
  }
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], mulc = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

  /* ---------------------------------------------------------------- 1. small 3 x 4 matrices (row major) ---------------------------------------------------------------- */
  const I3 = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  function mmul(a, b) { const o = new Array(12); for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) o[r * 4 + c] = a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c]; o[r * 4 + 3] = a[r * 4] * b[3] + a[r * 4 + 1] * b[7] + a[r * 4 + 2] * b[11] + a[r * 4 + 3]; } return o; }
  const mT = (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z], mS = (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0];
  const mRx = a => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0]; }, mRy = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0]; }, mRz = a => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0]; };
  /* T * Ry * Rx * Rz * S */
  function xf(x, y, z, rx, ry, rz, sx, sy, sz) { let m = mT(x || 0, y || 0, z || 0); if (ry) m = mmul(m, mRy(ry)); if (rx) m = mmul(m, mRx(rx)); if (rz) m = mmul(m, mRz(rz)); if (sx !== undefined || sy !== undefined || sz !== undefined) m = mmul(m, mS(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz)); return m; }
  function cof(m) { return [m[5] * m[10] - m[6] * m[9], m[6] * m[8] - m[4] * m[10], m[4] * m[9] - m[5] * m[8], m[2] * m[9] - m[1] * m[10], m[0] * m[10] - m[2] * m[8], m[1] * m[8] - m[0] * m[9], m[1] * m[6] - m[2] * m[5], m[2] * m[4] - m[0] * m[6], m[0] * m[5] - m[1] * m[4]]; }

  /* ---------------------------------------------------------------- 2. the mesh builder ---------------------------------------------------------------- */
  /* buckets by material key: matte metal wood rubber glass glow cloth hull rope. A skin is fn(x, y, z, nx, ny, nz, e, u, v) -> [r, g, b] in piece space (x,y,z AFTER the current matrix); e = edge-ness 0..1. */
  function MB(lod, seed) { this.lod = lod | 0; this.seed = seed | 0; this.B = {}; this.M = I3(); this.N = cof(this.M); this.stk = []; this.parts = []; this.key = 'matte'; this.sk = null; this.uvm = 'box'; this.uvs = 0.8; this.sway = 0; this.tri = 0; this.open = null; this.inst = []; }
  MB.prototype.bucket = function (k) { return this.B[k] || (this.B[k] = { p: [], n: [], c: [], u: [], w: [], i: [] }); };
  MB.prototype.use = function (key, skin) { this.key = key; if (skin !== undefined) this.sk = skin; return this; };
  MB.prototype.setM = function (m) { this.M = m; this.N = cof(m); };
  MB.prototype.at = function (x, y, z, rx, ry, rz, sx, sy, sz, fn) { this.stk.push(this.M); this.setM(mmul(this.M, xf(x, y, z, rx, ry, rz, sx, sy, sz))); fn(); this.setM(this.stk.pop()); return this; };
  MB.prototype.n_ = function (n, min) { return Math.max(min || 3, Math.round(n * (this.lod === 0 ? 1 : this.lod === 1 ? .5 : .3))); };
  MB.prototype.begin = function (name) { this.open = { name, t0: this.tri, min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9], key: this.key }; return this; };
  MB.prototype.end = function () { const o = this.open; if (o && this.tri === o.t0) this.open = null; else if (o) { this.parts.push({ name: o.name, key: o.key, tris: this.tri - o.t0, min: o.min, max: o.max }); this.open = null; } return this; };
  MB.prototype.v = function (b, x, y, z, nx, ny, nz, e, u, v) {
    const m = this.M, c = this.N, X = m[0] * x + m[1] * y + m[2] * z + m[3], Y = m[4] * x + m[5] * y + m[6] * z + m[7], Z = m[8] * x + m[9] * y + m[10] * z + m[11];
    let NX = c[0] * nx + c[1] * ny + c[2] * nz, NY = c[3] * nx + c[4] * ny + c[5] * nz, NZ = c[6] * nx + c[7] * ny + c[8] * nz; const l = Math.hypot(NX, NY, NZ) || 1; NX /= l; NY /= l; NZ /= l;
    const col = this.sk ? this.sk(X, Y, Z, NX, NY, NZ, e || 0, u || 0, v || 0) : [.5, .5, .5];
    let U, V; if (this.uvm === 'param') { U = (u || 0) * this.uvs; V = (v || 0) * this.uvs; } else { const ax = Math.abs(NX), ay = Math.abs(NY), az = Math.abs(NZ), s = this.uvs; if (ay >= ax && ay >= az) { U = X * s; V = Z * s; } else if (ax >= az) { U = Z * s; V = Y * s; } else { U = X * s; V = Y * s; } }
    b.p.push(X, Y, Z); b.n.push(NX, NY, NZ); b.c.push(col[0], col[1], col[2]); b.u.push(U, V); b.w.push(this.sway);
    const o = this.open; if (o) { if (X < o.min[0]) o.min[0] = X; if (Y < o.min[1]) o.min[1] = Y; if (Z < o.min[2]) o.min[2] = Z; if (X > o.max[0]) o.max[0] = X; if (Y > o.max[1]) o.max[1] = Y; if (Z > o.max[2]) o.max[2] = Z; }
    return b.p.length / 3 - 1;
  };
  MB.prototype.tri_ = function (b, a, c, d) { b.i.push(a, c, d); this.tri++; };
  /* a grid surface fn(u, v) -> [x, y, z] over 0..1. flip reverses the winding. edgeFn(u, v) -> e. */
  MB.prototype.surf = function (nu, nv, fn, flip, edgeFn) {
    const b = this.bucket(this.key), base = b.p.length / 3, e = 1e-3; nu = Math.max(1, nu | 0); nv = Math.max(1, nv | 0);
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv, P = fn(u, v), a = fn(u + e, v), c = fn(u - e, v), d = fn(u, v + e), f = fn(u, v - e);
      const ux = a[0] - c[0], uy = a[1] - c[1], uz = a[2] - c[2], vx = d[0] - f[0], vy = d[1] - f[1], vz = d[2] - f[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; if (flip) { nx = -nx; ny = -ny; nz = -nz; }
      const l = Math.hypot(nx, ny, nz); if (l < 1e-12) { nx = 0; ny = 1; nz = 0; } else { nx /= l; ny /= l; nz /= l; }
      this.v(b, P[0], P[1], P[2], nx, ny, nz, edgeFn ? edgeFn(u, v) : 0, u, v);
    }
    const w = nu + 1; for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const A = base + j * w + i, B = A + 1, C = A + w, D = C + 1; if (flip) { this.tri_(b, A, C, B); this.tri_(b, B, C, D); } else { this.tri_(b, A, B, C); this.tri_(b, B, D, C); } }
    return this;
  };
  /* a flat quad (4 points counter-clockwise seen from the normal side) */
  MB.prototype.quad = function (p0, p1, p2, p3, n, e) { const b = this.bucket(this.key), a = this.v(b, p0[0], p0[1], p0[2], n[0], n[1], n[2], e, 0, 0); this.v(b, p1[0], p1[1], p1[2], n[0], n[1], n[2], e, 1, 0); this.v(b, p2[0], p2[1], p2[2], n[0], n[1], n[2], e, 1, 1); this.v(b, p3[0], p3[1], p3[2], n[0], n[1], n[2], e, 0, 1); this.tri_(b, a, a + 1, a + 2); this.tri_(b, a, a + 2, a + 3); return this; };
  /* a sharp box centred at the origin: 12 triangles */
  MB.prototype.box = function (w, h, d, e) {
    const x = w / 2, y = h / 2, z = d / 2; e = e === undefined ? .6 : e;
    this.quad([x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z], [1, 0, 0], e); this.quad([-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z], [-1, 0, 0], e);
    this.quad([-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z], [0, 1, 0], e); this.quad([-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z], [0, -1, 0], e);
    this.quad([-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [0, 0, 1], e); this.quad([x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], [0, 0, -1], e); return this;
  };
  /* a rounded (bevelled) box: r = bevel, sub = extra rows on each face for colour noise. At lod 2 it is a sharp box. */
  MB.prototype.rbox = function (w, h, d, r, sub) {
    r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4); const mn = Math.min(w, h, d); if (this.lod >= 2 || r <= 0 || mn < (this.lod === 0 ? .1 : .3)) return this.box(w, h, d);
    const L = [w, h, d], b = this.bucket(this.key); sub = this.lod === 0 ? (sub || 0) : 0;
    const stops = len => { const a = [-len / 2, -len / 2 + r]; for (let k = 1; k <= sub; k++) a.push(lerp(-len / 2 + r, len / 2 - r, k / (sub + 1))); a.push(len / 2 - r, len / 2); return a; };
    for (let ax = 0; ax < 3; ax++) for (const s of [1, -1]) {
      const A = ax, B1 = (ax + 1) % 3, C1 = (ax + 2) % 3, sb = stops(L[B1]), sc = stops(L[C1]), base = b.p.length / 3;
      for (let j = 0; j < sc.length; j++) for (let i = 0; i < sb.length; i++) {
        const p = [0, 0, 0]; p[A] = s * L[A] / 2; p[B1] = sb[i]; p[C1] = sc[j];
        const q = [clamp(p[0], -L[0] / 2 + r, L[0] / 2 - r), clamp(p[1], -L[1] / 2 + r, L[1] / 2 - r), clamp(p[2], -L[2] / 2 + r, L[2] / 2 - r)], dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2], dl = Math.hypot(dx, dy, dz);
        let n, pos; if (dl > 1e-9) { n = [dx / dl, dy / dl, dz / dl]; pos = [q[0] + n[0] * r, q[1] + n[1] * r, q[2] + n[2] * r]; } else { n = [0, 0, 0]; n[A] = s; pos = p; }
        const m = Math.min(L[B1] / 2 - Math.abs(p[B1]), L[C1] / 2 - Math.abs(p[C1])), e = 1 - clamp(m / (r * 2.6), 0, 1);
        this.v(b, pos[0], pos[1], pos[2], n[0], n[1], n[2], e, i / (sb.length - 1), j / (sc.length - 1));
      }
      const w2 = sb.length; for (let j = 0; j < sc.length - 1; j++) for (let i = 0; i < w2 - 1; i++) { const a = base + j * w2 + i, bb = a + 1, c = a + w2, dd = c + 1; if (s > 0) { this.tri_(b, a, bb, c); this.tri_(b, bb, dd, c); } else { this.tri_(b, a, c, bb); this.tri_(b, bb, c, dd); } }
    }
    return this;
  };
  /* a cylinder along Y (centred), radii top and bottom, seg sides, caps 3 = both, 1 = top, 2 = bottom, 0 = none; rings along the height */
  MB.prototype.cyl = function (rt, rb, h, seg, caps, rings, e) {
    seg = this.n_(seg, 5); caps = caps === undefined ? 3 : caps; rings = rings || 1; e = e === undefined ? .3 : e;
    this.surf(seg, rings, (u, v) => { const a = u * TAU, r = lerp(rb, rt, v); return [Math.cos(a) * r, -h / 2 + v * h, Math.sin(a) * r]; }, true, () => e);
    const slope = (rb - rt) / (h || 1);
    for (const top of [true, false]) { if (!(caps & (top ? 1 : 2))) continue; const b = this.bucket(this.key), r = top ? rt : rb, y = top ? h / 2 : -h / 2, ny = top ? 1 : -1, c0 = this.v(b, 0, y, 0, 0, ny, 0, 0, .5, .5); void slope;
      for (let i = 0; i <= seg; i++) { const a = i / seg * TAU; this.v(b, Math.cos(a) * r, y, Math.sin(a) * r, 0, ny, 0, .8, .5 + .5 * Math.cos(a), .5 + .5 * Math.sin(a)); }
      for (let i = 0; i < seg; i++) { if (top) this.tri_(b, c0, c0 + 2 + i, c0 + 1 + i); else this.tri_(b, c0, c0 + 1 + i, c0 + 2 + i); } }
    return this;
  };
  /* an ellipsoid with analytic normals */
  MB.prototype.sph = function (rx, ry, rz, nu, nv, halfTop) {
    nu = this.n_(nu, 4); nv = this.n_(nv, 2); const b = this.bucket(this.key), base = b.p.length / 3, v1 = halfTop ? 1 : 0; ry = ry === undefined ? rx : ry; rz = rz === undefined ? rx : rz;
    const lat = halfTop ? PI / 2 : PI;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const th = (halfTop ? (1 - j / nv) * lat * 1 : j / nv * PI), ph = i / nu * TAU, sx = Math.sin(th) * Math.cos(ph), sy = Math.cos(th), sz = Math.sin(th) * Math.sin(ph);
      this.v(b, sx * rx, sy * ry, sz * rz, sx / rx, sy / ry, sz / rz, .4, i / nu, j / nv); }
    void v1; const w = nu + 1; for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = base + j * w + i, c = a + w; this.tri_(b, a, a + 1, c); this.tri_(b, a + 1, c + 1, c); }
    return this;
  };
  MB.prototype.torus = function (R, r, nu, nv, twist) {
    nu = this.n_(nu, 5); nv = this.n_(nv, 3);
    return this.surf(nu, nv, (u, v) => { const a = u * TAU, c = v * TAU; return [(R + r * Math.cos(c)) * Math.cos(a), r * Math.sin(c), (R + r * Math.cos(c)) * Math.sin(a)]; }, false, () => .2);
  };
  /* a tube along points (parallel frames), sides 3..6, optional radius fn(i/(n-1)), closed ends left open */
  MB.prototype.tube = function (pts, r, sides, rfn) {
    sides = this.n_(sides, 3); const b = this.bucket(this.key), base = b.p.length / 3, n = pts.length; let prev = null;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(i - 1, 0)], c = pts[Math.min(i + 1, n - 1)]; let tx = c[0] - a[0], ty = c[1] - a[1], tz = c[2] - a[2]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let ux, uy, uz; if (prev) { ux = prev[0]; uy = prev[1]; uz = prev[2]; } else { if (Math.abs(ty) < .9) { ux = 0; uy = 1; uz = 0; } else { ux = 1; uy = 0; uz = 0; } }
      const d = ux * tx + uy * ty + uz * tz; ux -= d * tx; uy -= d * ty; uz -= d * tz; const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul; prev = [ux, uy, uz];
      const vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux, rr = (rfn ? rfn(i / Math.max(1, n - 1)) : 1) * r;
      for (let k = 0; k <= sides; k++) { const an = k / sides * TAU, cs = Math.cos(an), sn = Math.sin(an), nx = ux * cs + vx * sn, ny = uy * cs + vy * sn, nz = uz * cs + vz * sn; this.v(b, pts[i][0] + nx * rr, pts[i][1] + ny * rr, pts[i][2] + nz * rr, nx, ny, nz, .1, i / Math.max(1, n - 1) * (n - 1), k / sides); }
    }
    const w = sides + 1; for (let i = 0; i < n - 1; i++) for (let k = 0; k < sides; k++) { const a = base + i * w + k, c = a + w; this.tri_(b, a, a + 1, c); this.tri_(b, a + 1, c + 1, c); }
    return this;
  };
  /* a half dome (rivet, bolt head) with a handful of triangles */
  MB.prototype.dome = function (r, h) {
    const b = this.bucket(this.key), n = 5, hh = (h === undefined ? .6 : h) * r, ap = this.v(b, 0, hh, 0, 0, 1, 0, .8, .5, .5), base = b.p.length / 3;
    for (let i = 0; i < n; i++) { const a = i / n * TAU, c = Math.cos(a), s2 = Math.sin(a); this.v(b, c * r, 0, s2 * r, c * .7, .7, s2 * .7, .8, i / n, 0); }
    for (let i = 0; i < n; i++) this.tri_(b, ap, base + (i + 1) % n, base + i); return this;
  };
  /* result: buckets, parts, tris */
  MB.prototype.finish = function () { return { B: this.B, parts: this.parts, tris: this.tri, inst: this.inst }; };
  /* a point to a rope sag between a and b (n points) */
  function sagLine(a, b, sag, n) { const o = []; for (let i = 0; i <= n; i++) { const u = i / n; o.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) - sag * 4 * u * (1 - u), lerp(a[2], b[2], u)]); } return o; }

  /* ---------------------------------------------------------------- 3. skins: the wear model ---------------------------------------------------------------- */
  const OCHRE = [.74, .50, .13], BARE = [.43, .44, .45], RUSTC = [.43, .21, .10], DARKM = [.11, .10, .09];
  function skins(seed) {
    const o = (seed % 997) * 3.17, N = (x, y, z, f, s) => n3(x * f + o + (s || 0) * 17.3, y * f + o * .7 + (s || 0) * 5.1, z * f + o * 1.3 + (s || 0) * 2.9);
    return {
      N,
      /* paint chipped to bare metal and rust. wear 0..1. opt.h = height scale for the low grime. */
      paint(base, wear, opt) {
        opt = opt || {}; const h = opt.h || 1.6, grime = opt.grime === undefined ? .55 : opt.grime, th = 1.02 - .62 * wear, rb = opt.rust || RUSTC;
        return (x, y, z, nx, ny, nz, e) => {
          const lo = N(x, y, z, 2.3), hi = N(x, y, z, 13, 1), fine = N(x, y, z, 36, 2), f = e * .9 + (hi - .5) * .85 + (lo - .5) * .5 + (fine - .5) * .3;
          let c = mulc(base, .9 + .2 * lo);
          const st = N(x * 3, y * .45, z * 3, 6, 3); if (st > .58) c = mixc(c, [.30, .19, .11], clamp((st - .58) * 2.6, 0, 1) * (.2 + .8 * wear));
          const rz = f - (th - .14); if (rz > 0) c = mixc(c, rb, clamp(rz * 6, 0, 1) * (.55 + .45 * hi));
          if (f > th) c = mixc(mulc(BARE, .8 + .4 * fine), rb, clamp((hi - .42) * 2.4 * wear + (f - th) * .6, 0, .85));
          const low = clamp((h * .55 - y) / (h * .55), 0, 1); c = mulc(c, 1 - .38 * grime * low * (.5 + .5 * lo));
          return c;
        };
      },
      /* bare rusty metal: red oxide with orange blooms and dark specks */
      rusty(base, wear, opt) {
        opt = opt || {}; return (x, y, z, nx, ny, nz, e) => {
          const lo = N(x, y, z, 1.7), hi = N(x, y, z, 9, 1), fine = N(x, y, z, 30, 2), bloom = clamp((lo - .38) * 2.4 + (hi - .5) * .5 + e * .3, 0, 1) * (.35 + .65 * wear);
          let c = mixc(base, [.55, .27, .11], bloom); c = mixc(c, [.30, .14, .07], clamp((fine - .6) * 3, 0, 1) * wear);
          const st = N(x * 4, y * .5, z * 4, 5, 3); if (st > .6) c = mulc(c, 1 - (st - .6) * 1.4 * wear);
          if (opt.paleSpots && hi > .72) c = mixc(c, [.62, .52, .35], .4 * (1 - wear * .5)); return mulc(c, .9 + .2 * fine);
        };
      },
      /* weathered wood. hue 0..1 picks silver, warm, dark wet or pale. Grain along local X (the long axis). */
      wood(wear, hue, opt) {
        opt = opt || {}; const pal = [[.56, .50, .41], [.53, .38, .24], [.30, .22, .15], [.64, .57, .45], [.45, .34, .22]], a = pal[Math.floor(hue * 5) % 5], b = pal[(Math.floor(hue * 5) + 1) % 5], k = hue * 5 % 1, base = mixc(a, b, k);
        return (x, y, z, nx, ny, nz, e) => {
          const lo = N(x, y, z, 1.3), gr = N(x * 1.6, y * 22, z * 22, 3), salt = clamp((N(x, y, z, 4, 1) - .45) * 2.2, 0, 1) * wear, wet = clamp((opt.wetY === undefined ? -9 : opt.wetY) - y, 0, 1);
          let c = mulc(base, .84 + .28 * lo); c = mulc(c, .9 + .2 * gr); c = mixc(c, [.70, .66, .58], salt * .5); c = mixc(c, mulc(c, .55), wet * .8);
          c = mulc(c, 1 + .18 * e * wear); if (Math.abs(nx) > .8 && !opt.noEnd) c = mulc(c, .72);
          if (opt.weedY !== undefined) { const wd = clamp((opt.weedY - y) * 1.4, 0, 1) * clamp(N(x, y, z, 5, 4) * 1.6 - .25, 0, 1); c = mixc(c, [.20, .34, .14], wd * .8); }
          return c;
        };
      },
      rope(base) { return (x, y, z, nx, ny, nz, e, u) => { const tw = Math.floor(u * 3.5 + N(x, y, z, 1) * 2) % 2 === 0 ? 1 : .82, s = N(x, y, z, 12, 5); return mulc(mixc(base, [.30, .24, .15], clamp(s - .55, 0, 1) * .6), tw * (.92 + .16 * s)); }; },
      plain(c, j) { return (x, y, z) => mulc(c, 1 - (j || .12) + (j || .12) * 2 * N(x, y, z, 3)); }
    };
  }
  /* ---------------------------------------------------------------- 4. generated data textures (no canvas): grunge, wood, plating with holes, rust, halo, flame ---------------------------------------------------------------- */
  function pn(x, y, P, s) { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy); const h = (a, b) => hash((((a % P) + P) % P) + Math.imul((((b % P) + P) % P), 977), s); return lerp(lerp(h(xi, yi), h(xi + 1, yi), ux), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), ux), uy); }
  function fbm(x, y, P, s) { return pn(x, y, P, s) * .55 + pn(x * 2, y * 2, P * 2, s + 1) * .3 + pn(x * 4, y * 4, P * 4, s + 2) * .15; }
  function texData(w, h, fn) { const d = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y), k = (y * w + x) * 4; d[k] = clamp(c[0], 0, 1) * 255; d[k + 1] = clamp(c[1], 0, 1) * 255; d[k + 2] = clamp(c[2], 0, 1) * 255; d[k + 3] = clamp(c[3] === undefined ? 1 : c[3], 0, 1) * 255; } return d; }
  const TEX = {
    grunge: { w: 128, h: 128, fn: seed => (x, y) => { const f = fbm(x / 16, y / 16, 8, seed), sp = 1 - .14 * sm(.72, .9, pn(x / 3, y / 3, 43, seed + 5)), sc = 1 - .12 * sm(.9, .97, pn(x / 1.5, y / 60, 85, seed + 9)), v = (.8 + .3 * f) * sp * sc; return [v, v, v * .98, 1]; } },
    wood: { w: 256, h: 64, fn: seed => (x, y) => { const g = pn(x / 90, y / 1.6, 16, seed) * .6 + pn(x / 30, y / .8, 32, seed + 1) * .4, kn = Math.max(0, 1 - Math.hypot((x - 90) / 24, (y - 30) / 8)) * .25, v = .82 + .26 * g - kn; return [v, v * .98, v * .95, 1]; } },
    rust: { w: 128, h: 128, fn: seed => (x, y) => { const f = fbm(x / 20, y / 20, 6, seed), s = pn(x / 3, y / 40, 42, seed + 3), v = .78 + .32 * f - (s > .78 ? .16 : 0); return [v, v * .92, v * .88, 1]; } }
  };
  /* the hull plating: plates 96 x 64 px, seams, rivet rows, rust blooms, vertical streaks and holes (alpha 0). wear 0..1 */
  function platingFn(seed, wear) {
    return (x, y) => {
      const pw = 96, ph = 64, cx = Math.floor(x / pw), cy = Math.floor(y / ph), lx = x - cx * pw, ly = y - cy * ph, off = (cy % 2) * 32, lx2 = (x + off) % pw, cx2 = Math.floor((x + off) / pw), id = cx2 * 7 + cy * 31 + seed;
      const tone = .8 + .35 * hash(id, 11), f = fbm(x / 22, y / 22, 24, seed + 2), hi = pn(x / 3, y / 3, 192, seed + 3), st = pn(x / 3, y / 70, 170, seed + 4);
      let r = .42, g = .33, b = .27; const pale = hash(id, 12) > .55; if (pale) { r = .46; g = .40; b = .34; }
      r *= tone; g *= tone; b *= tone;
      const rb = clamp((f - .38) * 2.6 + (hi - .5) * .4, 0, 1) * (.3 + .7 * wear); r = lerp(r, .62, rb * .7); g = lerp(g, .28, rb * .75); b = lerp(b, .10, rb * .8);
      if (st > .62) { const k = (st - .62) * 2.2 * wear; r *= 1 - k * .55; g *= 1 - k * .6; b *= 1 - k * .6; }
      const seam = lx2 < 2 || ly < 2 ? .5 : 1; r *= seam; g *= seam; b *= seam;
      const rvx = Math.abs(lx2 % 16 - 8) < 1.8 && (ly < 6 || ly > ph - 6), rvy = Math.abs(ly % 16 - 8) < 1.8 && (lx2 < 6), rv = rvx || rvy; if (rv) { r = r * 1.25 + .06; g = g * 1.2 + .03; b = b * 1.1; }
      const sp = pn(x / 2, y / 2, 256, seed + 6) > .86 ? .8 : 1; r *= sp; g *= sp; b *= sp;
      const hole = pn(x / 26 + seed, y / 26, 20, seed + 7) > (.78 + .2 * (1 - wear)) && pn(x / 7, y / 7, 73, seed + 8) > .25 ? 0 : 1;
      return [r, g, b, hole];
    };
  }
  function haloData(w) { return texData(w, w, (x, y) => { const d = Math.hypot(x - w / 2 + .5, y - w / 2 + .5) / (w / 2), a = clamp(1 - d, 0, 1), k = a * a * (.35 + .65 * a); return [1, 1, 1, k]; }); }
  function flameData() { return texData(32, 64, (x, y) => { const u = (x - 15.5) / 16, v = 1 - y / 63, w = Math.sqrt(Math.max(0, 1 - v * 1.05)) * (.15 + .85 * Math.sin(clamp(v * 3.14 * 1.1, 0, 3.14))) , d = Math.abs(u) / Math.max(w * .8, .01), a = clamp(1 - d, 0, 1) * clamp(v * 6, 0, 1) * (1 - v * .3), c0 = mixc([1, .25, .05], [1, .86, .38], clamp(1 - v * 1.4 + (1 - d) * .4, 0, 1)); return [c0[0], c0[1], c0[2], a * a * 1.1]; }); }

  /* a flat fan polygon around the centroid (points counter-clockwise seen from the normal side) */
  MB.prototype.fan = function (pts, n, e) { const b = this.bucket(this.key), c = [0, 0, 0]; for (const p of pts) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; } c[0] /= pts.length; c[1] /= pts.length; c[2] /= pts.length; const c0 = this.v(b, c[0], c[1], c[2], n[0], n[1], n[2], 0, .5, .5); for (const p of pts) this.v(b, p[0], p[1], p[2], n[0], n[1], n[2], e || .6, 0, 0); for (let i = 0; i < pts.length; i++) this.tri_(b, c0, c0 + 1 + i, c0 + 1 + (i + 1) % pts.length); return this; };
  const FACE = { '+y': [0, 0, 0], '+z': [PI / 2, 0, 0], '-z': [-PI / 2, 0, 0], '+x': [0, 0, -PI / 2], '-x': [0, 0, PI / 2], '-y': [PI, 0, 0] };
  /* a rivet / bolt head dome sitting on a face at (x, y, z) */
  MB.prototype.rv = function (x, y, z, face, r) { const f = FACE[face]; return this.at(x, y, z, f[0], f[1], f[2], 1, 1, 1, () => this.dome(r || .013, .7)); };
  MB.prototype.rvRow = function (x, y, z, dx, dy, dz, n, face, r) { for (let i = 0; i < n; i++) this.rv(x + dx * i, y + dy * i, z + dz * i, face, r); return this; };

  /* ---------------------------------------------------------------- 5. ROBOTS: hauler, sorter, stacker ---------------------------------------------------------------- */
  const ROBOT = {
    hauler: { tl: 1.15, ts: .40, tw: .22, th: .36, bw: .86, bh: .56, bd: .66, by: .80, hy: 1.27, hx: .06, arm: [.50, .46], pose: [-.55, .9, .5], col: [.72, .49, .13] },
    sorter: { tl: .95, ts: .34, tw: .18, th: .34, bw: .66, bh: .74, bd: .56, by: .86, hy: 1.68, hx: .02, arm: [.62, .56], pose: [-.25, .6, .45], col: [.79, .46, .12] },
    stacker: { tl: 1.35, ts: .48, tw: .26, th: .40, bw: 1.0, bh: .50, bd: .84, by: .82, hy: 1.32, hx: -.1, arm: [.55, .55], pose: [-.35, .65, .5], col: [.81, .54, .10] }
  };
  const ROBOT_NAMES = ['track', 'wheels', 'cleats', 'chassis', 'mudguard', 'body', 'seams', 'vents', 'rivets', 'cavity', 'neck', 'head', 'lensRim', 'visor', 'headBolts', 'arm', 'gripper', 'cable', 'toolbox', 'bin', 'counterweight', 'hatch', 'battery', 'lens', 'stencil', 'hose'];
  function batteryParts(b, S, wear, seed) {
    const body = S.paint([.34, .36, .38], wear * .8, { h: .3, grime: .3 }), cap = S.paint([.86, .60, .13], wear, { h: .3, grime: .2 });
    b.begin('battery'); b.use('metal', body).rbox(.34, .20, .26, .02, 1); b.use('metal', cap);
    b.at(.185, 0, 0, 0, 0, 0, 1, 1, 1, () => b.rbox(.04, .21, .27, .012)); b.at(-.185, 0, 0, 0, 0, 0, 1, 1, 1, () => b.rbox(.04, .21, .27, .012));
    b.use('metal', body); b.at(0, .12, 0, 0, 0, 0, 1, 1, 1, () => b.rbox(.12, .03, .05, .01)); b.at(0, .1, .08, 0, 0, 0, 1, 1, 1, () => b.rbox(.1, .02, .02, .008));
    if (b.lod < 2) { b.use('glow', () => [1, .62, .16]); for (let i = -1; i <= 1; i++) b.at(i * .07, .0, .131, 0, 0, 0, 1, 1, 1, () => b.box(.03, .12, .004)); b.use('metal', S.paint([.86, .60, .13], wear, { h: .3 })); for (const sx of [-1, 1]) b.rv(sx * .15, .0, .132, '+z', .012); }
    b.end(); void seed;
  }
  function planRobot(kind, o) {
    const P = ROBOT[kind], lod = o.lod, seed = o.seed, wear = o.wear, S = skins(seed * 31 + kind.length * 7), jit = i => hash(seed, 100 + i);
    const base = [P.col[0] + (jit(1) - .5) * .07, P.col[1] + (jit(2) - .5) * .06, P.col[2] + (jit(3) - .5) * .03];
    const paint = S.paint(base, wear, { h: 1.7 }), paintD = S.paint(mulc(base, .9), clamp(wear + .12, 0, 1), { h: 1.7 }), steel = S.rusty([.30, .31, .33], wear * .8), darkS = () => [.05, .05, .05];
    const rubber = (x, y, z, nx, ny, nz, e) => { const mud = clamp(S.N(x * .8, y * 2.5, z * .8, 5) - .45, 0, 1) * wear * 1.6; return mixc(mulc([.17, .155, .14], .8 + .5 * S.N(x, y, z, 9)), [.30, .23, .15], clamp(mud, 0, .8)); };
    const m = new MB(lod, seed), pose = o.arm || P.pose, Rr = P.th / 2, Ls = P.tl - P.th, perim = 2 * Ls + TAU * Rr;
    const loop = s => { s = ((s % perim) + perim) % perim; if (s < Ls) return [-Ls / 2 + s, 0, 0, -1]; s -= Ls; if (s < PI * Rr) { const a = -PI / 2 + s / Rr; return [Ls / 2 + Rr * Math.cos(a), Rr + Rr * Math.sin(a), Math.cos(a), Math.sin(a)]; } s -= PI * Rr; if (s < Ls) return [Ls / 2 - s, 2 * Rr, 0, 1]; s -= Ls; const a = PI / 2 + s / Rr; return [-Ls / 2 + Rr * Math.cos(a), Rr + Rr * Math.sin(a), Math.cos(a), Math.sin(a)]; };
    /* tracks */
    for (const side of [-1, 1]) {
      m.at(0, 0, side * P.ts, 0, 0, 0, 1, 1, 1, () => {
        m.begin('track'); m.use('rubber', rubber).surf(m.n_(44, 12), 2, (u, v) => { const q = loop(u * perim); return [q[0], q[1], (v - .5) * P.tw]; }, false, () => .3); m.end();
        m.begin('wheels'); m.use('metal', steel);
        const zo = side * (P.tw / 2 - .012), hub = [[-Ls / 2, Rr, Rr * .8], [Ls / 2, Rr, Rr * .8]]; if (lod < 2) for (let i = 0; i < 3; i++) hub.push([(i - 1) * Ls * .3, Rr * .5, .07]);
        for (const [x, y, r] of hub) m.at(x, y, zo, PI / 2, 0, 0, 1, 1, 1, () => { m.cyl(r, r, .03, 8, 3); if (lod === 0) { m.at(0, side * .015, 0, 0, 0, 0, 1, 1, 1, () => { m.use('metal', paintD); m.dome(r * .35, .6); m.use('metal', steel); }); } });
        const ring = []; const nn = m.n_(24, 8); for (let i = 0; i < nn; i++) { const q = loop(i / nn * perim); ring.push([q[0] - q[2] * .035, q[1] - q[3] * .035, zo + side * .002]); }
        m.use('metal', paintD); m.fan(side > 0 ? ring : ring.slice().reverse(), [0, 0, side], .7); m.end();
        if (lod < 2) { m.begin('cleats'); m.use('rubber', (x, y, z, nx, ny, nz, e) => mulc(rubber(x, y, z, nx, ny, nz, e), .85)); const nC = lod === 0 ? 26 : 13;
          for (let i = 0; i < nC; i++) { if (hash(i * 7 + side, seed) < .05) continue; const q = loop((i + .5) / nC * perim), th = Math.atan2(-q[2], q[3]); m.at(q[0] + q[2] * .014, q[1] + q[3] * .014, 0, 0, 0, th + (hash(i, seed + 3) - .5) * .05, 1, 1, 1, () => m.box(.045, .028, P.tw * .96, .4)); } m.end(); }
      });
    }
    /* chassis, mudguards */
    m.begin('chassis'); m.use('metal', paintD).at(0, .43, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(P.tl * .8, .26, 2 * (P.ts - P.tw / 2) + .04, .03, 1)); m.end();
    m.begin('mudguard'); m.use('metal', paintD); for (const side of [-1, 1]) m.at(0, P.th + .035, side * P.ts, 0, 0, 0, 1, 1, 1, () => m.rbox(P.tl * 1.0, .035, P.tw + .06, .012)); m.end();
    /* body */
    const by = P.by, bw = P.bw, bh = P.bh, bd = P.bd;
    m.begin('body'); m.use('metal', paint).at(0, by, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(bw, bh, bd, .07, 2)); m.at(-.05, by + bh / 2 + .012, 0, 0, 0, 0, 1, 1, 1, () => { m.use('metal', paintD); m.rbox(bw * .62, .03, bd * .78, .01, 1); }); m.end();
    if (kind === 'sorter') { m.begin('bin'); m.use('metal', paintD); m.at(bw / 2 + .12, by - .22, 0, 0, 0, 0, 1, 1, 1, () => { m.rbox(.26, .03, .46, .01); m.at(.12, .1, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(.02, .2, .46, .01)); for (const s of [-1, 1]) m.at(0, .1, s * .22, 0, 0, 0, 1, 1, 1, () => m.rbox(.26, .2, .02, .01)); m.at(-.12, .1, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(.02, .2, .46, .01)); }); m.end(); }
    if (kind === 'stacker') { m.begin('counterweight'); m.use('metal', S.paint([.34, .33, .31], wear, { h: 1 })).at(-bw / 2 - .12, by - .08, 0, 0, 0, 0, 1, 1, 1, () => { m.rbox(.26, .34, bd * .92, .02, 1); }); if (lod === 0) m.rvRow(-bw / 2 - .255, by - .2, -.28, 0, .12, .0, 3, '-x', .014); m.end(); }
    if (kind === 'hauler') { m.begin('toolbox'); m.use('metal', paintD).at(-.28, by + bh / 2 + .1, .12, 0, 0, 0, 1, 1, 1, () => { m.rbox(.24, .14, .26, .02, 1); m.use('metal', steel); m.at(0, .1, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(.2, .018, .03, .006)); }); m.end(); }
    /* seams, stencil, vents */
    if (lod < 2) {
      m.begin('seams'); m.use('matte', darkS);
      for (const x of [-bw * .2, bw * .27]) m.at(x, by, -bd / 2 - .002, 0, 0, 0, 1, 1, 1, () => m.box(.008, bh * .82, .008, .2));
      for (const x of [-bw * .36, bw * .36]) m.at(x, by, bd / 2 + .002, 0, 0, 0, 1, 1, 1, () => m.box(.008, bh * .82, .008, .2));
      m.at(0, by - bh * .18, -bd / 2 - .002, 0, 0, 0, 1, 1, 1, () => m.box(bw * .9, .008, .008, .2)); m.at(0, by + bh * .3, bd / 2 + .002, 0, 0, 0, 1, 1, 1, () => m.box(bw * .9, .008, .008, .2));
      m.at(bw / 2 + .002, by, 0, 0, 0, 0, 1, 1, 1, () => { m.box(.008, bh * .8, .008, .2); m.box(.008, .008, bd * .86, .2); }); m.end();
      m.begin('stencil'); m.use('matte', (x, y, z) => mulc([.80, .75, .60], .85 + .3 * S.N(x, y, z, 20)));
      m.at(-bw * .1, by - bh * .32, -bd / 2 - .004, 0, 0, 0, 1, 1, 1, () => { for (let i = 0; i < 3; i++) m.at(i * .05, 0, 0, 0, 0, .6, 1, 1, 1, () => m.box(.022, .09, .004, .2)); });
      m.end(); m.begin('vents'); m.use('matte', darkS); for (let i = 0; i < 4; i++) m.at(-bw / 2 - .003, by - .14 + i * .07, 0, 0, 0, 0, 1, 1, 1, () => m.box(.008, .025, bd * .6, .2)); m.end();
    }
    if (lod === 0) {
      m.begin('rivets'); m.use('metal', paintD);
      for (const sz of [-1, 1]) { m.rvRow(-bw * .45, by + bh * .4, sz * (bd / 2 + .002), .11, 0, 0, 9, sz > 0 ? '+z' : '-z'); m.rvRow(-bw * .45, by - bh * .4, sz * (bd / 2 + .002), .11, 0, 0, 9, sz > 0 ? '+z' : '-z'); }
      m.rvRow(-bw * .2, by - bh * .35, -bd / 2 - .002, 0, .1, 0, 7, '-z', .011); m.rvRow(bw * .27, by - bh * .35, -bd / 2 - .002, 0, .1, 0, 7, '-z', .011); m.rvRow(bw / 2 + .002, by - bh * .38, -bd * .4, 0, 0, .1, 9, '+x'); m.end();
    }
    /* battery bay frame on +z: a dark recess and four frame bars; the hatch covers it */
    m.begin('cavity'); m.use('matte', darkS).at(.01, by, bd / 2 + .003, 0, 0, 0, 1, 1, 1, () => m.box(.42, .31, .006, .1)); m.use('metal', paintD);
    for (const sy of [-1, 1]) m.at(.01, by + sy * .165, bd / 2 + .01, 0, 0, 0, 1, 1, 1, () => m.rbox(.46, .022, .02, .006)); for (const sx of [-1, 1]) m.at(.01 + sx * .228, by, bd / 2 + .01, 0, 0, 0, 1, 1, 1, () => m.rbox(.022, .31, .02, .006)); m.end();
    /* neck and head */
    const top = by + bh / 2;
    m.begin('neck'); m.use('metal', steel).at(P.hx * .6, (top + P.hy - .17) / 2 + .005, 0, 0, 0, 0, 1, 1, 1, () => m.cyl(.085, .1, Math.max(.06, P.hy - .17 - top + .04), 10, 3)); m.at(P.hx * .6, top + .015, 0, 0, 0, 0, 1, 1, 1, () => m.cyl(.13, .14, .03, 12, 3)); m.end();
    m.begin('head'); m.use('metal', paint).at(P.hx, P.hy, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(.50, .34, .44, .06, 1)); m.end();
    m.begin('lensRim'); m.use('metal', steel).at(P.hx + .255, P.hy, 0, 0, 0, -PI / 2, 1, 1, 1, () => { m.cyl(.125, .125, .06, 16, 2); m.at(0, .03, 0, 0, 0, 0, 1, 1, 1, () => m.torus(.113, .017, 16, 5)); }); m.use('matte', darkS).at(P.hx + .252, P.hy, 0, 0, 0, -PI / 2, 1, 1, 1, () => m.cyl(.1, .1, .02, 14, 3)); m.end();
    m.begin('visor'); m.use('metal', paintD).at(P.hx + .23, P.hy + .15, 0, 0, 0, .06, 1, 1, 1, () => m.rbox(.15, .022, .3, .008)); m.end();
    if (lod < 2) { m.begin('headBolts'); m.use('metal', steel); for (const s of [-1, 1]) m.at(P.hx - .08, P.hy, s * .222, 0, 0, 0, 1, 1, 1, () => { m.rbox(.2, .2, .018, .008); }); if (lod === 0) { m.rvRow(P.hx - .15, P.hy + .13, 0, .1, 0, .1, 3, '+y', .012); for (const s of [-1, 1]) m.rvRow(P.hx - .15, P.hy + .07, s * .233, .06, 0, 0, 3, s > 0 ? '+z' : '-z', .011); } m.end(); }
    /* the arm: shoulder, upper arm with a ram, elbow, forearm, wrist, a two-claw gripper */
    const [L1, L2] = P.arm, a1 = pose[0], a2 = pose[1], op = clamp(pose[2], 0, 1), sx = bw * .34, sy = by + .1, sz = -(bd / 2 + .065);
    m.begin('arm'); m.use('metal', steel).at(sx, sy, sz, PI / 2, 0, 0, 1, 1, 1, () => m.cyl(.085, .085, .1, 12, 3));
    m.at(sx, sy, sz, 0, 0, a1, 1, 1, 1, () => {
      m.use('metal', paint).at(L1 / 2, 0, -.01, 0, 0, 0, 1, 1, 1, () => m.rbox(L1, .08, .07, .02, 1));
      if (lod < 2) { m.use('metal', S.rusty([.5, .5, .5], wear * .3)).at(L1 * .5, .065, .05, 0, 0, PI / 2, 1, 1, 1, () => m.cyl(.014, .014, L1 * .62, 6, 3)); }
      m.use('metal', steel).at(L1, 0, 0, PI / 2, 0, 0, 1, 1, 1, () => { m.cyl(.06, .06, .11, 10, 3); }); if (lod === 0) m.rvRow(L1 - .03, 0, .058, .03, 0, 0, 3, '+z', .011);
      m.at(L1, 0, 0, 0, 0, a2, 1, 1, 1, () => {
        m.use('metal', paint).at(L2 / 2, 0, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(L2, .068, .058, .018, 1)); m.use('metal', steel).at(L2, 0, 0, PI / 2, 0, 0, 1, 1, 1, () => m.cyl(.045, .045, .09, 10, 3)); m.end();
        m.begin('gripper'); m.use('metal', paintD).at(L2 + .06, 0, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(.09, .09, .07, .015));
        for (const sgn of [1, -1]) { const th = sgn * (.12 + .5 * op); m.use('metal', steel).at(L2 + .1, sgn * .035, 0, 0, 0, th, 1, 1, 1, () => { m.at(.055, 0, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(.11, .03, .05, .01)); m.at(.11, 0, 0, 0, 0, -sgn * .75, 1, 1, 1, () => { m.at(.04, 0, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(.085, .028, .045, .01)); m.use('rubber', rubber).at(.08, -sgn * .014, 0, 0, 0, 0, 1, 1, 1, () => m.box(.03, .018, .04, .1)); }); }); }
        m.end(); m.begin('arm');
      });
    }); m.end();
    if (lod === 0) { m.begin('hose'); m.use('rubber', () => [.30, .10, .07]).tube([[bw * .08, by + .22, sz + .05], [bw * .18, by + .36, sz - .06], [sx - .02, sy + .12, sz - .02]], .017, 4); m.end(); }
    /* the lens (own node: its own material so the brightness can change), at the head front */
    const lens = new MB(lod, seed); lens.begin('lens'); lens.use('glow', (x, y, z, nx, ny, nz, e, u, v) => [1, .72 + .1 * Math.abs(ny), .38]);
    lens.sph(.04, .088, .088, 12, 6); lens.use('glow', () => [1, .96, .78]).at(.026, 0, 0, 0, 0, 0, 1, 1, 1, () => lens.sph(.022, .046, .046, 8, 4)); lens.use('glow', () => [1, 1, 1]).at(.034, .045, .03, 0, 0, 0, 1, 1, 1, () => lens.sph(.01, .01, .01, 4, 2)); lens.end();
    /* the hatch (hinge at the rear vertical edge) */
    const hat = new MB(lod, seed + 5); hat.begin('hatch'); hat.use('metal', paintD).at(.2, 0, .0175, 0, 0, 0, 1, 1, 1, () => hat.rbox(.40, .30, .035, .012, 1));
    hat.use('metal', steel).at(.33, 0, .04, 0, 0, 0, 1, 1, 1, () => hat.rbox(.016, .1, .022, .005)); for (const sy2 of [-1, 1]) hat.at(0, sy2 * .1, .02, 0, 0, 0, 1, 1, 1, () => hat.cyl(.014, .014, .07, 6, 3));
    if (lod === 0) { hat.use('metal', steel); for (const [x, y] of [[.03, .12], [.37, .12], [.03, -.12], [.37, -.12]]) hat.rv(x, y, .036, '+z', .012); hat.use('matte', () => [.80, .72, .45]); hat.at(.2, -.1, .037, 0, 0, .5, 1, 1, 1, () => { hat.box(.1, .014, .004, .1); }); }
    hat.end();
    const bat = new MB(lod, seed + 6); batteryParts(bat, S, wear, seed);
    const nodes = { body: m.finish(), lens: lens.finish(), hatch: hat.finish(), battery: bat.finish() };
    nodes.lens.pivot = [P.hx + .285, P.hy, 0]; nodes.hatch.pivot = [-.19, by, bd / 2 + .012]; nodes.battery.pivot = [.01, by, bd / 2 - .07];
    return { nodes, meta: { kind, scale: 1, headBox: { c: [P.hx, P.hy, 0], r: [.3, .22, .26] }, by, bd, bw, hy: P.hy, hx: P.hx } };
  }
  /* ---------------------------------------------------------------- 6. gloved hands and a loose battery ---------------------------------------------------------------- */
  function planHands(o) {
    const S = skins(o.seed * 5 + 3), wear = o.wear, nodes = {}, leather = S.paint([.44, .33, .20], wear * .8, { h: .3, grime: .4 }), knit = (x, y, z, nx, ny, nz, e, u) => { const rib = Math.floor(x * 70) % 2 === 0 ? 1 : .86; return mulc(mixc([.40, .36, .30], [.30, .26, .20], S.N(x, y, z, 5)), rib); };
    for (const name of ['handL', 'handR']) {
      const h = new MB(o.lod, o.seed + (name === 'handL' ? 1 : 2)), sgn = name === 'handL' ? 1 : -1, curl = o.curl === undefined ? .55 : o.curl;
      h.begin(name); h.use('cloth', knit).at(-.19, 0, 0, 0, 0, PI / 2, 1, 1, 1, () => h.cyl(.062, .066, .26, 12, 2, 3));
      h.use('rubber', () => [.46, .33, .24]).at(-.04, 0, 0, 0, 0, PI / 2, 1, 1, 1, () => h.cyl(.05, .056, .08, 10, 3));
      h.use('matte', leather).at(.0, 0, 0, 0, 0, PI / 2, 1, 1, 1, () => h.cyl(.058, .06, .03, 10, 3)); h.use('matte', leather);
      h.at(.07, 0, 0, 0, 0, 0, 1, 1, 1, () => h.rbox(.12, .045, .105, .018, 1));
      for (let f = 0; f < 4; f++) { const z = (f - 1.5) * .027, len = [.052, .058, .054, .045][f]; h.at(.13, 0, z, 0, 0, -.2 * curl, 1, 1, 1, () => { h.at(len / 2, 0, 0, 0, 0, 0, 1, 1, 1, () => h.rbox(len, .026, .024, .01)); h.at(len, 0, 0, 0, 0, -curl * 1.0, 1, 1, 1, () => { h.at(len * .45, 0, 0, 0, 0, 0, 1, 1, 1, () => h.rbox(len * .9, .024, .022, .009)); }); }); }
      h.at(.05, 0, -sgn * .06, 0, sgn * -.8, -.2, 1, 1, 1, () => { h.at(.03, 0, 0, 0, 0, 0, 1, 1, 1, () => h.rbox(.06, .03, .03, .01)); h.at(.06, 0, 0, 0, 0, -curl * .7, 1, 1, 1, () => h.at(.025, 0, 0, 0, 0, 0, 1, 1, 1, () => h.rbox(.05, .026, .026, .01))); });
      h.use('matte', () => [.20, .14, .09]); h.at(.075, .024, 0, 0, 0, 0, 1, 1, 1, () => { if (o.lod < 2) for (let k = 0; k < 4; k++) h.at(0, 0, (k - 1.5) * .027, 0, 0, 0, 1, 1, 1, () => h.box(.1, .004, .004, .1)); });
      h.end(); nodes[name] = h.finish(); nodes[name].pivot = [0, 0, 0];
    }
    return { nodes, meta: { kind: 'hands' } };
  }
  function planBattery(o) { const S = skins(o.seed * 3 + 1), b = new MB(o.lod, o.seed); batteryParts(b, S, o.wear, o.seed); return { nodes: { battery: Object.assign(b.finish(), { pivot: [0, 0, 0] }) }, meta: { kind: 'battery' } }; }
  /* ---------------------------------------------------------------- 7. THE HULK: a rusted trawler lying aground ---------------------------------------------------------------- */
  function planHulk(o) {
    const lod = o.lod, seed = o.seed, wear = o.wear, S = skins(seed * 7 + 1), m = new MB(lod, seed), L = 15;
    const Bw = s => { s = clamp(s, 0, 1); return (s < .35 ? lerp(1.6, 2.35, sm(0, .35, s)) : 2.35 * Math.pow(1 - (s - .35) / .65, .8)) + .08; }, Dk = s => 3.0 + .9 * s * s * s - .3 * (1 - s) * (1 - s), X = s => (s - .5) * L;
    const sec = (s, v) => { s = clamp(s, 0, 1); const ph = (v - .5) * PI, B = Bw(s), D = Dk(s); return [X(s), D * Math.pow(1 - Math.cos(ph), .75), B * Math.sin(ph)]; };
    /* the hull skin: plating texture (alpha holes), vertex tint with grime and weed near the waterline */
    m.uvm = 'param'; m.uvs = 1;
    m.begin('hull'); m.use('hull', (x, y, z) => { const lo = S.N(x, y, z, .8), g = clamp((1.3 - y) / 1.3, 0, 1); let c = mulc([1, .98, .95], .88 + .2 * lo); c = mixc(c, [.30, .34, .22], g * .55 * (.5 + .5 * S.N(x, y, z, 4, 3))); return c; })
      .surf(m.n_(28, 8), m.n_(18, 6), (u, v) => sec(u, v), false, () => .3); m.end();
    m.uvm = 'box'; m.uvs = .6;
    /* the stern: a plank transom; the deck */
    { const pts = []; for (let i = 0; i <= 8; i++) pts.push(sec(0, i / 8)); m.begin('transom'); m.use('wood', S.wood(wear, .1, { wetY: .8 })).fan(pts, [-1, 0, 0], .5); m.end(); }
    m.begin('deck'); m.use('wood', S.wood(wear, .35, { noEnd: true })).surf(m.n_(14, 5), 2, (u, v) => [X(u), Dk(u) + .02, (v * 2 - 1) * Bw(u) * .97], true, () => .3); m.end();
    /* superstructure: wheelhouse with windows, roof, funnel */
    const paint = S.paint([.64, .60, .52], wear, { h: 6, grime: .3 }), paintD = S.paint([.5, .27, .17], wear, { h: 6, grime: .2 }), glass = () => [.07, .10, .13], dk = () => [.06, .05, .045];
    const wx = X(.22), dy = Dk(.22);
    m.begin('wheelhouse'); m.use('matte', paint).at(wx, dy + .95, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(3.2, 1.9, 3.0, .08, 2));
    m.at(wx + .25, dy + 2.65, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(2.6, 1.5, 2.6, .07, 2)); m.use('matte', paintD).at(wx + .15, dy + 3.47, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(3.0, .14, 3.0, .03, 1)); m.end();
    if (lod < 2) {
      m.begin('windows');
      const win = (x, y, z, w, h, face, broken) => { const f = FACE[face], nrm = face === '+x' ? [1, 0, 0] : face === '-x' ? [-1, 0, 0] : face === '+z' ? [0, 0, 1] : [0, 0, -1];
        m.use('matte', paintD).at(x, y, z, 0, 0, 0, 1, 1, 1, () => { const d = .04; if (face[1] === 'x') m.box(d, h + .12, w + .12, .5); else m.box(w + .12, h + .12, d, .5); });
        m.use('glass', broken ? dk : glass).at(x + nrm[0] * .03, y, z + nrm[2] * .03, 0, 0, 0, 1, 1, 1, () => { if (face[1] === 'x') m.box(.02, h, w, 0); else m.box(w, h, .02, 0); }); void f; };
      for (const z of [-.8, 0, .8]) win(wx + .25 + 1.3, dy + 2.7, z, .55, .6, '+x', z === .8);
      for (const x of [-.5, .6]) for (const sz of [-1, 1]) win(wx + .25 + x, dy + 2.7, sz * 1.3, .55, .55, sz > 0 ? '+z' : '-z', hash(x * 10 + sz, seed) > .6);
      win(wx + 1.6, dy + 1.0, -.7, .5, .8, '+x', false); for (const sz of [-1, 1]) win(wx - .4, dy + 1.0, sz * 1.5, .6, .55, sz > 0 ? '+z' : '-z', sz < 0);
      m.end();
      m.begin('funnel'); m.use('matte', S.rusty([.45, .24, .15], wear)).at(wx - .9, dy + 3.9, .2, 0, 0, 0, 1, 1, 1, () => { m.cyl(.36, .46, 1.7, 10, 1); m.use('matte', dk).at(0, .75, 0, 0, 0, 0, 1, 1, 1, () => m.cyl(.37, .37, .3, 10, 1)); }); m.end();
    }
    /* the deck gear: a hatch coaming, a winch drum, an anchor ring, a coil of rope */
    m.begin('deckgear'); m.use('matte', paintD).at(X(.58), Dk(.58) + .22, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(2.0, .45, 1.6, .05, 1));
    m.use('metal', S.rusty([.30, .24, .20], wear)).at(X(.8), Dk(.8) + .45, 0, 0, 0, 0, 1, 1, 1, () => { m.cyl(.3, .36, .9, 10, 3); m.at(0, .5, 0, 0, 0, 0, 1, 1, 1, () => m.cyl(.44, .44, .08, 10, 3)); });
    m.use('rope', S.rope([.55, .46, .30])).at(X(.46), Dk(.46) + .12, .9, 0, 0, 0, 1, 1, 1, () => { m.torus(.4, .1, 14, 5); m.at(0, .16, 0, 0, 0, 0, 1, 1, 1, () => m.torus(.34, .1, 14, 5)); }); m.end();
    /* the mast, boom and rigging */
    const mx = X(.5) - .5, my = Dk(.5), top = [mx - .5, my + 8.3, 0];
    m.begin('mast'); m.use('wood', S.wood(wear, .45, { noEnd: true })).tube([[mx, my, 0], [mx - .25, my + 4, 0], top], .11, 6, u => 1 - .4 * u);
    m.use('wood', S.wood(wear, .7, { noEnd: true })).at(mx - .4, my + 6.2, 0, 0, 0, 0, 1, 1, 1, () => m.box(.08, .08, 2.6, .5)); m.at(mx + 1.2, my + 2.4, 0, 0, 0, .35, 1, 1, 1, () => m.box(3.2, .09, .09, .5)); m.end();
    if (lod < 2) {
      m.begin('rigging'); m.use('rope', S.rope([.30, .25, .20]));
      const dpt = [[X(.3), Dk(.3) + .2, 1.9], [X(.3), Dk(.3) + .2, -1.9], [X(.78), Dk(.78) + .2, 1.2], [X(.78), Dk(.78) + .2, -1.2], [X(.9), Dk(.9) + .2, 0]];
      dpt.forEach((p, i) => m.tube(sagLine(top, p, .12 + .1 * hash(i, seed), 6), .02, 4));
      const bd = [mx + 2.8, my + 3.3, 0]; m.tube(sagLine(bd, [X(.62), Dk(.62) + .6, 1.0], .3, 6), .018, 4); m.tube(sagLine([mx - .4, my + 6.2, 1.3], [mx - .4, my + 6.2, -1.3], .15, 5), .015, 4);
      m.tube([[X(.72), Dk(.72) + 2.2, .0], [X(.72) + .3, Dk(.72) + 1.2, .1], [X(.72) + .3, Dk(.72) + .3, .3]], .018, 4);   /* one line cut loose and dangling */
      m.end();
    }
    /* rails: posts and bars along both edges, with gaps */
    if (lod < 2) {
      m.begin('rail'); m.use('metal', S.rusty([.40, .20, .13], wear));
      for (const sz of [-1, 1]) { let prev = null; for (let i = 0; i < 12; i++) { const s = .38 + i * .052, here = hash(i + (sz > 0 ? 40 : 0), seed) > .22, B = Bw(s) * .97, D = Dk(s) + .02, p = [X(s), D, sz * B];
        if (here) { m.at(p[0], D + .55, p[2], 0, 0, 0, 1, 1, 1, () => m.box(.07, 1.1, .07, .3)); if (prev) for (const hh of [1.05, .55]) { m.at((p[0] + prev[0]) / 2, D + hh, (p[2] + prev[2]) / 2, 0, -Math.atan2(p[2] - prev[2], p[0] - prev[0]) * 1, 0, 1, 1, 1, () => m.box(Math.hypot(p[0] - prev[0], p[2] - prev[2]), .045, .045, .2)); } prev = [p[0], p[1], p[2]]; } else prev = null; } }
      m.end();
    }
    /* the waterline: barnacle band and hanging weed */
    if (lod < 2) {
      m.begin('barnacles');
      for (const sz of [-1, 1]) m.use('matte', (x, y, z, nx, ny, nz, e) => { const sp = S.N(x, y, z, 24, 2), c = mixc([.56, .54, .47], [.28, .31, .22], clamp((S.N(x, y, z, 3, 1) - .4) * 2, 0, 1)); return mulc(c, .75 + .5 * sp); })
        .surf(m.n_(26, 8), m.n_(4, 2), (u, v) => { const s = lerp(.05, .92, u), y = lerp(.35, 1.2, v), Dh = Dk(s), ph = Math.acos(clamp(1 - Math.pow(y / Dh, 4 / 3), -1, 1)), bump = .03 + .05 * S.N(s * 30, y * 9, sz, 4); return [X(s), y, sz * (Bw(s) * Math.sin(ph) + bump)]; }, sz > 0 ? false : true, () => .5);
      m.end(); m.begin('weed'); m.use('matte', (x, y, z) => mulc([.20, .34, .15], .7 + .6 * S.N(x, y, z, 8)));
      for (let i = 0; i < 14; i++) { const s = .08 + .84 * hash(i, seed + 3), sz = i % 2 ? 1 : -1, D = Dk(s), y0 = .75, ph = Math.acos(clamp(1 - Math.pow(y0 / D, 4 / 3), -1, 1)), z = sz * Bw(s) * Math.sin(ph) + sz * .05, x = X(s), len = .5 + .5 * hash(i, 9), wd = .07 + .03 * hash(i, 8);
        m.quad([x - wd, y0, z], [x + wd, y0, z], [x + wd * .2, y0 - len, z + sz * .05], [x - wd * .2, y0 - len, z + sz * .05], [0, 0, sz], .4); m.quad([x + wd, y0, z], [x - wd, y0, z], [x - wd * .2, y0 - len, z + sz * .05], [x + wd * .2, y0 - len, z + sz * .05], [0, 0, -sz], .4); }
      m.end();
    }
    return { nodes: { hull: Object.assign(m.finish(), { pivot: [0, 0, 0] }) }, meta: { kind: 'hulk', length: L, beam: 4.7, height: 12.3, deckAt: s => Dk(s), xAt: X } };
  }
  /* ---------------------------------------------------------------- 8. THE JETTY: planks that all differ, piles, braces, bollards, a crane; a broken variant ---------------------------------------------------------------- */
  const WOODPAL = [[.56, .50, .41], [.53, .38, .24], [.30, .22, .15], [.64, .57, .45], [.45, .34, .22]];
  function woodTone(h, wear, seed, i) { const a = WOODPAL[Math.floor(h * 5) % 5], b = WOODPAL[(Math.floor(h * 5) + 1) % 5]; let c = mixc(a, b, h * 5 % 1); c = mulc(c, .82 + .3 * hash(i, seed + 21)); return mixc(c, [.70, .66, .58], clamp(wear * .35 * hash(i, seed + 22), 0, .4)); }
  /* a unit plank (x -.5..+.5, y -.5..+.5, z -.5..+.5), no underside, segs along x for the warp shader; vertex colour white with a lighter edge */
  function plankBase(lod) {
    const b = new MB(lod, 1), n = lod === 0 ? 3 : 1; b.use('wood', (x, y, z, nx, ny, nz, e) => { const k = .94 + .08 * e; return [k, k, k]; }); b.uvs = 1;
    for (let i = 0; i < n; i++) { const x0 = -.5 + i / n, x1 = -.5 + (i + 1) / n;
      b.quad([x0, .5, .5], [x1, .5, .5], [x1, .5, -.5], [x0, .5, -.5], [0, 1, 0], .2 + (i === 0 || i === n - 1 ? .5 : 0)); b.quad([x0, -.5, .5], [x1, -.5, .5], [x1, .5, .5], [x0, .5, .5], [0, 0, 1], .3); b.quad([x1, -.5, -.5], [x0, -.5, -.5], [x0, .5, -.5], [x1, .5, -.5], [0, 0, -1], .3); }
    b.quad([.5, -.5, .5], [.5, -.5, -.5], [.5, .5, -.5], [.5, .5, .5], [1, 0, 0], .8); b.quad([-.5, -.5, -.5], [-.5, -.5, .5], [-.5, .5, .5], [-.5, .5, -.5], [-1, 0, 0], .8); return b.finish();
  }
  function planJetty(o) {
    const lod = o.lod, seed = o.seed, wear = o.wear, br = clamp(o.broken || 0, 0, 1), u0 = o.u0 === undefined ? -2 : o.u0, u1 = o.u1 === undefined ? 38 : o.u1, DECK = o.deckY === undefined ? 1.7 : o.deckY, S = skins(seed * 11 + 5), rails = o.rails !== false, apronOn = o.apron !== undefined ? o.apron : (u0 <= 0);
    const m = new MB(lod, seed), plankItems = [], R = (i, k) => hash(i, seed * 13 + k);
    /* deck planks laid across: each with its own length, width, tone, warp, tilt; broken: missing ones, hanging ones */
    let cur = u0 + .02, k = 0; const P0 = o.planks === false ? 0 : 1;
    while (P0 && cur < u1 - .1) {
      const wid = (.165 + .075 * R(k, 1)) * (lod === 2 ? 3 : 1), gap = .008 + .014 * R(k, 2), u = cur + wid / 2, split = R(k, 3) < .24, j = -1.6 + 3.2 * (.3 + .4 * R(k, 4)), th = .05 + .016 * R(k, 5), tone = woodTone(R(k, 6), wear, seed, k), ur = (u - u0) / Math.max(1, u1 - u0);
      const segs = split ? [[-1.6, j - .01], [j + .01, 1.6]] : [[-1.6, 1.6]];
      segs.forEach((sg, si) => {
        const id = k * 3 + si, rm = R(id, 7) < br * (.12 + .5 * ur), len = sg[1] - sg[0] + (R(id, 8) - .5) * .12, cw = (sg[0] + sg[1]) / 2 + (R(id, 9) - .5) * .05;
        if (rm) { if (R(id, 10) < .5) return; }   /* gone; the other half of the removed ones hang */
        const hang = rm ? .25 + .5 * R(id, 11) : 0, yaw = (R(id, 12) - .5) * .03 * (1 + wear), warp = (R(id, 13) - .5) * .03 * (.5 + wear);
        plankItems.push({ m: xf(u, DECK - th / 2 - (rm ? .04 * R(id, 14) : 0), cw, hang * (R(id, 15) < .5 ? 1 : -1), PI / 2 + yaw, hang * .6 * (R(id, 16) - .5) + (R(id, 17) - .5) * .012, len, th, wid), col: mulc(tone, rm ? .9 : 1), warp });
      });
      cur += wid + gap; k++;
    }
    /* the apron: planks along the jetty on the land side (w 1.7 .. 6.7) for u -2 .. 12 */
    if (apronOn && P0) { const a0 = Math.max(u0, -2), a1 = Math.min(u1, 12); let w = 1.72, r = 0; while (w < 6.7) { const wid = .17 + .07 * R(r + 500, 1); let u = a0; let q = 0; while (u < a1 - .05) { const len = Math.min(a1 - u, 2.2 + 2.6 * R(r * 17 + q, 2)); if (len > .3) plankItems.push({ m: xf(u + len / 2, DECK - .028, w + wid / 2, 0, 0, 0, len - .012, .05 + .012 * R(r * 17 + q, 3), wid), col: woodTone(R(r * 17 + q, 4), wear * 1.2, seed, r * 17 + q), warp: (R(r * 17 + q, 5) - .5) * .02 }); u += len + .008; q++; } w += wid + .01; r++; } }
    /* extra loose planks floating by the broken jetty */
    const nLoose = Math.round(br * 12);
    for (let i = 0; i < nLoose; i++) { const u = lerp(u0, u1, R(i, 30)), w = (R(i, 31) < .5 ? -1 : 1) * (1.9 + 1.6 * R(i, 32)), len = 1.2 + 2.2 * R(i, 33); plankItems.push({ m: xf(u, .05 + .5 * R(i, 34), w, .04 * (R(i, 35) - .5), R(i, 36) * PI, 0, len, .05, .19), col: woodTone(R(i, 37), wear, seed, i + 900), warp: (R(i, 38) - .5) * .04 }); }
    const inst = [];
    if (plankItems.length) inst.push({ key: 'plank', geo: plankBase(lod), items: plankItems, name: 'planks' });
    /* piles: three variants (plain, rope-wrapped, weedy), and snapped stubs for the broken state */
    const yTop = DECK + .55, yBot = -2.4, hP = yTop - yBot;
    function pileGeo(variant, stub, sd) {
      const g = new MB(lod, seed + sd), wood = S.wood(wear, .05 + .1 * variant, { wetY: .2, weedY: variant === 2 ? 0 : -3, noEnd: true }), rad = (a, v) => lerp(.225, .185, v) * (1 + .07 * (S.N(Math.cos(a) * 2.2, v * 6, Math.sin(a) * 2.2, 1, sd) - .5));
      const top = stub ? DECK - .55 + .35 * hash(sd, 3) : yTop; g.use('wood', wood).begin('pile');
      g.surf(g.n_(9, 6), g.n_(6, 3), (u, v) => { const a = u * TAU, r = rad(a, v); return [Math.cos(a) * r, lerp(yBot, top, v), Math.sin(a) * r]; }, true, () => .25);
      const ring = [], nn = g.n_(9, 6); for (let i = 0; i < nn; i++) { const a = i / nn * TAU, r = rad(a, 1) * (stub ? .8 : 1); ring.push([Math.cos(a) * r, top + (stub ? (hash(i, sd) - .3) * .3 : (hash(i, sd) - .5) * .04), Math.sin(a) * r]); } g.use('wood', (x, y, z) => mulc(wood(x, y, z, 0, 1, 0, .7), .95)).fan(ring, [0, 1, 0], .8);
      if (stub && lod < 2) for (let i = 0; i < 3; i++) { const a = (i + hash(i, sd)) * 2.1; g.at(Math.cos(a) * .1, top + .1, Math.sin(a) * .1, (hash(i, sd + 1) - .5) * .5, 0, (hash(i, sd + 2) - .5) * .5, 1, 1, 1, () => g.cyl(0, .05, .28 + .2 * hash(i, sd + 3), 4, 0)); }
      g.end();
      if (lod < 2) {
        g.begin('barnacles'); g.use('matte', (x, y, z) => { const sp = S.N(x, y, z, 26, 2); return mulc(mixc([.60, .58, .50], [.26, .30, .20], clamp((S.N(x, y, z, 3, 4) - .45) * 2, 0, 1)), .7 + .55 * sp); });
        const lo = variant === 2 ? -.9 : -.45, hi = variant === 2 ? .55 : .35; g.surf(g.n_(10, 6), g.n_(3, 2), (u, v) => { const a = u * TAU, y = lerp(lo, hi, v), r = rad(a, (y - yBot) / (top - yBot)) + .012 + .035 * S.N(Math.cos(a) * 6, y * 8, Math.sin(a) * 6, 1, sd + 1) * Math.sin(PI * clamp(v, 0, 1)); return [Math.cos(a) * r, y, Math.sin(a) * r]; }, true, () => .5); g.end();
        if (variant === 2) { g.begin('weed'); g.use('matte', (x, y, z) => mulc([.19, .33, .14], .7 + .6 * S.N(x, y, z, 9)));
          for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + hash(i, sd), r = .22, len = .5 + .8 * hash(i, sd + 5), x = Math.cos(a) * r, z = Math.sin(a) * r, nx = Math.cos(a), nz = Math.sin(a), tx = -nz * .06, tz = nx * .06; g.quad([x - tx, -.5, z - tz], [x + tx, -.5, z + tz], [x + tx * .2 + nx * .06, -.5 - len, z + tz * .2 + nz * .06], [x - tx * .2 + nx * .06, -.5 - len, z - tz * .2 + nz * .06], [nx, 0, nz], .3); } g.end(); }
        if (variant === 1 && !stub) { g.begin('rope'); g.use('rope', S.rope([.66, .55, .36])); for (let i = 0; i < 3; i++) g.at(0, DECK + .14 - i * .075, 0, 0, 0, 0, 1, 1, 1, () => g.torus(.215, .03, 9, 3)); g.use('rope', S.rope([.62, .52, .34])).tube([[.22, DECK + .0, 0], [.27, DECK - .35, .05], [.3, DECK - .8, .1]], .026, 4); g.end(); }
      }
      return g.finish();
    }
    const pileItems = [[], [], []], stubItems = [[], []];
    for (let kk = Math.ceil((u0 + 1) / 3); ; kk++) {
      const u = -1 + 3 * kk; if (u >= u1) break; if (u < u0) continue;
      for (const sd of [-1, 1]) {
        const id = kk * 2 + (sd > 0 ? 1 : 0), snap = R(id, 40) < br * .55, vr = Math.floor(R(id, 41) * 3) % 3, tone = woodTone(R(id, 42) * .5, wear, seed, id), lean = (R(id, 43) - .5) * (.04 + (snap ? .14 * br : 0)), ox = (R(id, 44) - .5) * .06, lift = snap ? 0 : (R(id, 45) - .5) * .35;
        const item = { m: xf(u + ox, lift, sd * 1.6 + (R(id, 46) - .5) * .05, lean, 0, lean * .7, 1, 1, 1), col: tone, warp: 0 };
        if (snap) stubItems[vr % 2].push(item); else pileItems[vr].push(item);
      }
    }
    pileItems.forEach((it, v) => { if (it.length) inst.push({ key: 'wood', geo: pileGeo(v, false, 10 + v * 5), items: it, name: 'piles' }); });
    stubItems.forEach((it, v) => { if (it.length) inst.push({ key: 'wood', geo: pileGeo(v, true, 60 + v * 7), items: it, name: 'stubs' }); });
    /* braces, rails, bollards, crane (merged) */
    const woodB = S.wood(wear, .4, {}), woodD = S.wood(wear, .25, { wetY: .5 });
    m.use('wood', woodB);
    m.begin('braces');
    for (let kk = Math.ceil((u0 + 1) / 3); ; kk++) {
      const u = -1 + 3 * kk; if (u >= u1) break; if (u < u0) continue; const id = kk;
      if (!(R(id, 50) < br * .45)) m.at(u, DECK - .62, 0, 0, 0, 0, 1, 1, 1, () => m.box(.12, .14, 3.5, .5));
      for (const sd of [-1, 1]) { const gone = R(id * 2 + (sd > 0 ? 1 : 0), 51) < br * .6; if (gone && R(id, 52) < .5) continue; const ang = Math.atan2(1.6, 3) * (kk % 2 ? 1 : -1) + (gone ? .5 : 0); m.at(u + 1.5, DECK - 1.2 - (gone ? .5 : 0), sd * 1.72, 0, 0, ang, 1, 1, 1, () => m.box(Math.hypot(3, 1.6) * (gone ? .8 : 1), .17, .07, .5)); }
    }
    m.end();
    if (rails) {
      m.begin('rail'); m.use('wood', woodB);
      for (const sd of [-1, 1]) { let prev = null; for (let kk = Math.ceil((u0 + 1) / 3); ; kk++) { const u = -1 + 3 * kk; if (u >= u1) break; if (u < u0) continue; const id = kk * 2 + (sd > 0 ? 1 : 0), here = !(R(id, 53) < br * .5), p = [u, DECK, sd * 1.6];
        if (here) { m.at(p[0], DECK + .45, p[2], (R(id, 54) - .5) * .06 * (1 + br * 4), 0, 0, 1, 1, 1, () => m.rbox(.09, .9, .09, .012)); if (prev) for (const hh of [.78, .42]) m.at((p[0] + prev[0]) / 2, DECK + hh - (R(id, 55) < br * .3 ? .1 : 0), p[2], 0, 0, 0, 1, 1, 1, () => m.rbox(3 - .1, .06, .05, .01)); prev = p; } else prev = null; } }
      m.end();
    }
    m.begin('bollards'); m.use('metal', S.rusty([.20, .18, .17], wear * .8));
    for (const bu of (o.bollards || [4, 34])) { if (bu < u0 || bu >= u1) continue; m.at(bu, DECK + .22, -1.25, 0, 0, 0, 1, 1, 1, () => { m.cyl(.12, .17, .46, 9, 1); m.at(0, .26, 0, 0, 0, 0, 1, 1, 1, () => m.sph(.18, .1, .18, 9, 3)); m.use('rope', S.rope([.68, .58, .38])); m.at(0, .06, 0, 0, 0, 0, 1, 1, 1, () => { m.torus(.17, .04, 10, 4); m.at(0, .07, 0, 0, 0, 0, 1, 1, 1, () => m.torus(.16, .04, 10, 4)); }); m.use('metal'); }); }
    m.end();
    if (o.crane !== undefined && o.crane !== null && o.crane >= u0 && o.crane < u1 && lod < 3) {
      const cu = o.crane, cs = o.craneSide === undefined ? -1 : o.craneSide, wc = cs * 1.3; m.begin('crane');
      m.use('wood', woodD).at(cu, DECK + 1.1, wc, 0, 0, 0, 1, 1, 1, () => m.cyl(.085, .11, 2.3, 8, 3, 2));
      m.use('metal', S.rusty([.22, .2, .19], wear)).at(cu, DECK + .05, wc, 0, 0, 0, 1, 1, 1, () => m.rbox(.5, .08, .5, .02));
      m.use('wood', woodD).at(cu, DECK + 2.25, wc + cs * .8, -cs * .38, 0, 0, 1, 1, 1, () => m.rbox(.09, .1, 1.9, .01)); /* the jib, leaning out over the water */
      const tip = [cu, DECK + 2.9, wc + cs * 1.5]; m.use('rope', S.rope([.45, .38, .26])).tube([[cu, DECK + 1.3, wc + .1 * cs], [cu, DECK + 2.0, wc + cs * .85], tip], .016, 4);
      m.use('metal', S.rusty([.22, .2, .19], wear)).at(tip[0], tip[1] - .08, tip[2], 0, 0, PI / 2, 1, 1, 1, () => m.cyl(.07, .07, .08, 8, 3));
      m.use('rope', S.rope([.6, .5, .34])).tube([[tip[0], tip[1] - .08, tip[2]], [tip[0], tip[1] - .7, tip[2]], [tip[0], tip[1] - 1.2, tip[2] + .02]], .018, 4);
      m.use('metal', S.rusty([.2, .19, .18], wear)).at(tip[0], tip[1] - 1.28, tip[2] + .02, 0, 0, 0, 1, 1, 1, () => { m.torus(.05, .014, 8, 4); m.at(.04, -.06, 0, 0, 0, 0, 1, 1, 1, () => m.sph(.03, .03, .03, 5, 3)); }); m.end();
    }
    const out = m.finish(); out.inst = inst;
    return { nodes: { jetty: Object.assign(out, { pivot: [0, 0, 0] }) }, meta: { kind: 'jetty', u0, u1, deckY: DECK, planks: plankItems.length } };
  }
  /* ---------------------------------------------------------------- 9. FOUR STOCK BAYS ---------------------------------------------------------------- */
  function planBay(kind, o) {
    const lod = o.lod, seed = o.seed, wear = o.wear, st = o.stack === undefined ? .7 : clamp(o.stack, 0, 1), S = skins(seed * 17 + kind.length), m = new MB(lod, seed), R = (i, k) => hash(i, seed * 19 + k);
    const hw = 1.3, hd = .85;
    m.begin('floor'); m.use('wood', S.wood(wear, .3, {})).at(0, .1, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(2.5, .05, 1.65, .01)); for (const z of [-.6, 0, .6]) m.at(0, .04, z, 0, 0, 0, 1, 1, 1, () => m.rbox(2.6, .08, .12, .01)); m.end();
    m.begin('post'); for (const [x, z] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd], [0, hd], [0, -hd]].slice(0, 4)) { m.use('wood', S.wood(wear, .15 + .1 * R(x * 3 + z, 1), { wetY: .2 })).at(x, .42, z, 0, 0, 0, 1, 1, 1, () => m.rbox(.13, .84, .13, .018)); if (lod < 2) m.use('rope', S.rope([.66, .55, .36])).at(x, .74, z, 0, 0, 0, 1, 1, 1, () => { m.torus(.085, .022, 8, 3); }); } m.end();
    m.begin('wall'); const board = (x, y, z, len, ax, i) => { m.use('wood', S.wood(wear, .1 + .6 * R(i, 2), { wetY: .15 })).at(x, y, z, 0, 0, (R(i, 3) - .5) * .02, 1, 1, 1, () => { if (ax === 0) m.rbox(len + (R(i, 4) - .5) * .08, .19, .04, .012); else m.rbox(.04, .19, len + (R(i, 4) - .5) * .08, .012); }); };
    let bi = 0; for (let r = 0; r < 4; r++) { const y = .2 + r * .205; if (r < 3) { board(0, y, hd, 2.45, 0, bi++); } if (r < 2) board(0, y, -hd, 2.45, 0, bi++); if (r < 3) { board(-hw, y, 0, 1.6, 1, bi++); board(hw, y, 0, 1.6, 1, bi++); } } m.end();
    const bx = (x, y, z, w, h, d, c) => m.at(x, y, z, 0, 0, 0, 1, 1, 1, () => { m.use('matte', typeof c === 'function' ? c : () => c); m.box(w, h, d, .4); });
    if (kind === 'bay_planks') {
      m.begin('planks'); const layers = Math.max(1, Math.round(1 + st * 6)), sk = i => S.wood(clamp(wear * .5, 0, 1), .35 + .25 * R(i, 5), { noEnd: false });
      for (let l = 0; l < layers; l++) { const y = .15 + .055 + l * .078; for (let k = 0; k < 7; k++) { const id = l * 7 + k, len = 2.05 - .35 * R(id, 6) - (k % 3) * .05; m.use('wood', sk(id)).at(-.1 + (R(id, 7) - .5) * .2 - (2.05 - len) * .3, y, -.64 + k * .2, 0, (R(id, 8) - .5) * .02, 0, 1, 1, 1, () => m.box(len, .052, .175, .5)); }
        if (l < layers) for (const x of [-.8, .6]) { m.use('wood', S.wood(wear, .4, {})).at(x, y + .035, 0, 0, 0, 0, 1, 1, 1, () => m.box(.05, .02, 1.45, .3)); } }
      m.use('wood', S.wood(wear, .6, {})); if (layers < 5) for (let k = 0; k < 3; k++) m.at(.85 - k * .04, .5, .05 + k * .05, 0, .12 * k, .75, 1, 1, 1, () => m.box(1.1, .05, .17, .5)); m.end();
    } else if (kind === 'bay_rope') {
      m.begin('coils'); const n = Math.max(1, Math.round(1 + st * 4));
      for (let i = 0; i < n; i++) { const big = i < 2, R0 = big ? .45 : .3, y = .17 + (big ? i * .17 : .0), x = big ? (i ? .45 : -.5) : -.55 + (i - 2) * .6, z = big ? 0 : .38 * (i % 2 ? 1 : -1); m.use('rope', S.rope([.70 - .08 * R(i, 9), .60 - .06 * R(i, 9), .40])).at(x, y, z, (R(i, 10) - .5) * .06, R(i, 11) * 3, 0, 1, 1, 1, () => { m.torus(R0, .085, 18, 5); m.at(0, .07, 0, 0, 0, 0, 1, 1, 1, () => m.torus(R0 * .8, .075, 16, 5)); }); if (big) m.use('rope', S.rope([.5, .42, .28])).at(x, y + .06, z, 0, i, 0, 1, 1, 1, () => m.tube([[R0 * .5, 0, -.08], [R0 * .5, .0, .08]], .1, 4)); }
      m.use('rope', S.rope([.62, .52, .34])).tube([[hw - .05, .8, hd - .08], [hw - .1, .4, hd - .2], [hw - .35, .12, hd - .35]], .035, 4);
      if (lod < 2) m.use('rope', S.rope([.66, .56, .38])).at(-hw + .15, .55, hd - .1, PI / 2, 0, 0, 1, 1, 1, () => m.torus(.2, .05, 12, 4)); m.end();
    } else if (kind === 'bay_glass') {
      const G = [[.18, .52, .30], [.28, .62, .58], [.62, .38, .12], [.62, .75, .72]];
      m.begin('crate'); for (const [cx, cz, i] of [[-.6, -.1, 0], [.3, .15, 1]]) { m.use('wood', S.wood(wear, .45 + .1 * i, {})); m.at(cx, .1 + .21, cz, 0, .05 * (i ? 1 : -1), 0, 1, 1, 1, () => { m.rbox(.7, .04, .5, .006); for (const sx of [-1, 1]) m.at(sx * .33, .12, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(.04, .3, .5, .008)); for (const sz of [-1, 1]) m.at(0, .12, sz * .23, 0, 0, 0, 1, 1, 1, () => m.rbox(.7, .3, .04, .008)); }); } m.end();
      m.begin('bottles'); const nb = 8 + Math.round(st * 14);
      for (let i = 0; i < nb; i++) { const cr = i % 2, gx = (cr ? .3 : -.6) - .22 + .11 * (Math.floor(i / 2) % 5), gz = (cr ? .15 : -.1) - .1 + .1 * (Math.floor(i / 10) % 3), col = G[Math.floor(R(i, 12) * 4)]; m.use('glass', (x, y, z) => mulc(col, .85 + .3 * S.N(x, y, z, 15))); m.at(gx, .3 + .2, gz, 0, 0, (R(i, 13) - .5) * .12, 1, 1, 1, () => { m.cyl(.034, .036, .2, 6, 2); m.at(0, .15, 0, 0, 0, 0, 1, 1, 1, () => m.cyl(.014, .03, .1, 6, 1)); }); } m.end();
      m.begin('floats'); const nf = 2 + Math.round(st * 5); for (let i = 0; i < nf; i++) { const col = G[i % 2], r = .11 + .03 * R(i, 14); m.use('glass', (x, y, z) => mulc(col, .8 + .35 * S.N(x, y, z, 11))); m.at(-.1 + .55 * (i % 3) - .3, .1 + .03 + r, .45 + (i > 2 ? -.08 : 0) - .15 * Math.floor(i / 3), 0, 0, 0, 1, 1, 1, () => m.sph(r, r, r, 9, 6)); } if (lod < 2) { m.use('rope', S.rope([.62, .52, .34])).at(.5, .15, -.5, 0, 0, 0, 1, 1, 1, () => m.torus(.3, .03, 12, 3)); } m.end();
    } else {
      const rustB = S.rusty([.42, .22, .12], wear);
      m.begin('sheets'); const ns = Math.max(1, Math.round(1 + st * 4)); for (let i = 0; i < ns; i++) m.use('metal', S.rusty([.40 + .05 * R(i, 15), .22, .12], clamp(wear + .1, 0, 1))).at(-.5 + (R(i, 16) - .5) * .1, .15 + .02 + i * .028, -.1 + (R(i, 17) - .5) * .1, 0, (R(i, 18) - .5) * .12, 0, 1, 1, 1, () => { m.box(1.15, .018, .75, .5); if (lod === 0) for (const [cx, cz] of [[-.5, -.3], [.5, -.3], [-.5, .3], [.5, .3]]) m.at(cx, .012, cz, 0, 0, 0, 1, 1, 1, () => { m.use('matte', () => [.05, .04, .04]); m.box(.05, .004, .05, 0); m.use('metal'); }); });
      m.use('metal', S.rusty([.34, .27, .22], wear)).at(.1, .48, hd - .14, -.5, 0, 0, 1, 1, 1, () => m.box(1.0, .015, .6, .5)); m.end();
      m.begin('pipes'); const np = 3 + Math.round(st * 5); for (let i = 0; i < np; i++) { const row = i < 4 ? 0 : 1, c = row ? i - 4 : i, y = .17 + .05 + row * .09, z = .15 + (c - (row ? 0 : 1.5)) * .105 + (row ? .05 : 0); m.use('metal', S.rusty(i % 3 ? [.33, .30, .27] : [.42, .25, .15], wear)).at(.55 + (R(i, 19) - .5) * .1, y, z + .55, 0, 0, PI / 2, 1, 1, 1, () => m.cyl(.045, .045, 1.15, 8, 3)); } m.end();
      m.begin('gear'); { const teeth = 12, g = 'gear'; void g; m.use('metal', S.rusty([.40, .24, .13], wear)).at(.62, .55, -.55, 0, -.2, -.25, 1, 1, 1, () => { m.at(0, 0, 0, PI / 2, 0, 0, 1, 1, 1, () => { m.cyl(.23, .23, .06, 14, 3); }); for (let i = 0; i < teeth; i++) { const a = i / teeth * TAU; m.at(Math.cos(a) * .26, Math.sin(a) * .26, 0, 0, 0, a, 1, 1, 1, () => m.box(.07, .065, .06, .5)); } m.use('matte', () => [.05, .04, .04]); m.at(0, 0, .031, PI / 2, 0, 0, 1, 1, 1, () => m.cyl(.06, .06, .004, 10, 3)); }); } m.end();
      void rustB;
    }
    return { nodes: { bay: Object.assign(m.finish(), { pivot: [0, 0, 0] }) }, meta: { kind, stack: st } };
  }
  /* ---------------------------------------------------------------- 10. CAMP: hut with a rusty corrugated roof, lanterns, washing line, fire pit, barrels ---------------------------------------------------------------- */
  function planHut(o) {
    const lod = o.lod, seed = o.seed, wear = o.wear, S = skins(seed * 23 + 2), m = new MB(lod, seed), R = (i, k) => hash(i, seed * 29 + k), W = 9, D = 6, HW = 2.7, HR = 3.9;
    /* walls of boards: back (z +3) and the two sides; the front (z -3) is open with posts, a low half wall, a counter */
    m.begin('wall'); const bd = (x, y, z, w, h, ax, i, tone) => m.use('wood', S.wood(wear, tone === undefined ? R(i, 1) : tone, { wetY: .5 })).at(x, y, z, 0, 0, (R(i, 2) - .5) * .015, 1, 1, 1, () => { if (ax === 0) m.rbox(w, h, .06, .01); else m.rbox(.06, h, w, .01); });
    let i = 0, step = lod === 0 ? .22 : lod === 1 ? .45 : 1.5;
    for (let x = -W / 2 + step / 2; x < W / 2; x += step) { const h = HW + (R(i, 3) - .5) * .1; bd(x, h / 2, D / 2, step - .012, h, 0, i++); }
    for (const sx of [-1, 1]) for (let z = -D / 2 + step / 2; z < D / 2; z += step) { const h = HW + (R(i, 3) - .5) * .1, lo = sx > 0 && z < 1.2; if (lo && z < -.3) continue; bd(sx * W / 2, h / 2, z, step - .012, h, 1, i++); }
    for (let x = -W / 2 + step / 2; x < W / 2; x += step) { if (x > -.8 && x < 1.6 && false) continue; bd(x, .45, -D / 2, step - .012, .9, 0, i++, .55); }
    m.end();
    m.begin('posts'); for (const x of [-W / 2, -W / 6, W / 6, W / 2]) m.use('wood', S.wood(wear, .3, { wetY: .5 })).at(x, HW / 2 + .05, -D / 2 - .05, 0, 0, 0, 1, 1, 1, () => m.rbox(.2, HW + .1, .2, .02)); m.use('wood', S.wood(wear, .2, {})).at(0, HW + .08, -D / 2 - .05, 0, 0, 0, 1, 1, 1, () => m.rbox(W + .3, .2, .16, .015)); m.end();
    m.begin('counter'); m.use('wood', S.wood(wear, .5, {})).at(-1.6, 1.05, -D / 2 + .3, 0, 0, 0, 1, 1, 1, () => m.rbox(3.2, .08, .7, .015)); m.at(-1.6, .52, -D / 2 + .3, 0, 0, 0, 1, 1, 1, () => m.rbox(3.0, .96, .6, .015)); m.end();
    /* the roof: two slopes of corrugated sheets, rust blooms, a ridge cap, a chimney pipe */
    m.begin('roof'); const panels = 4, pw = (W + .8) / panels, slope = Math.hypot(D / 2 + .55, HR - HW), cor = lod === 0 ? 28 : lod === 1 ? 14 : 4;
    for (const sd of [-1, 1]) for (let p = 0; p < panels; p++) {
      const id = p * 2 + (sd > 0 ? 1 : 0), tone = R(id, 5), base = tone > .75 ? [.52, .38, .30] : tone > .5 ? [.46, .27, .17] : [.40, .20, .12], sk = S.rusty(base, clamp(wear * 1.1 + .1, 0, 1), { paleSpots: true }), x0 = -W / 2 - .4 + p * pw;
      m.use('metal', sk).surf(2, cor, (u, v) => { const z = sd * (u * (D / 2 + .55)), y = HR - u * (HR - HW), cr = lod < 2 ? .03 * Math.sin(v * cor * .5 * TAU) : 0; return [x0 + v * pw - .005 * p, y + cr + p * .003 * (sd), z]; }, false, () => .3);
    }
    m.use('metal', S.rusty([.30, .17, .11], wear)).at(0, HR + .03, 0, 0, 0, 0, 1, 1, 1, () => m.rbox(W + .8, .06, .3, .015));
    m.at(-2.6, HR + 1.0, 1.0, 0, 0, 0, 1, 1, 1, () => { m.cyl(.14, .16, 1.8, 8, 1); m.at(0, .95, 0, 0, 0, 0, 1, 1, 1, () => m.cyl(.22, .14, .12, 8, 3)); }); m.end();
    /* the back shelves with jars, crates and sacks, seen through the open front */
    if (lod < 2) {
      m.begin('shelf'); for (let r = 0; r < 3; r++) m.use('wood', S.wood(wear, .6, {})).at(1.6, .55 + r * .7, D / 2 - .3, 0, 0, 0, 1, 1, 1, () => m.rbox(4.2, .05, .4, .01));
      const JC = [[.62, .50, .22], [.34, .52, .32], [.62, .32, .20], [.7, .66, .52]]; const nj = lod === 0 ? 26 : 10;
      for (let j = 0; j < nj; j++) { const r = j % 3, x = -.4 + (j * .17) % 4, col = JC[Math.floor(R(j, 6) * 4)]; m.use('glass', (x2, y, z) => mulc(col, .8 + .3 * S.N(x2, y, z, 9))); m.at(1.6 + x - .5, .6 + r * .7 + .1, D / 2 - .3, 0, 0, 0, 1, 1, 1, () => m.cyl(.06, .06, .16 + .08 * R(j, 7), 7, 3)); }
      for (let j = 0; j < 5; j++) m.use('wood', S.wood(wear, .35 + .1 * j, {})).at(-1.7 + j * .55, .3, D / 2 - .5, 0, R(j, 8) * .4, 0, 1, 1, 1, () => m.rbox(.5, .45, .4, .02));
      m.use('cloth', () => [.62, .55, .40]).at(-.2, .25, D / 2 - .8, 0, 0, 0, 1, 1, 1, () => m.sph(.3, .26, .22, 8, 5)); m.end();
      m.begin('windows'); m.use('glow', () => [1, .72, .38]); for (const sx of [-1, 1]) m.at(sx * 3.2, 1.7, D / 2 - .02, 0, 0, 0, 1, 1, 1, () => m.box(.8, .6, .02, 0)); m.use('wood', S.wood(wear, .5, {})); for (const sx of [-1, 1]) m.at(sx * 3.2, 1.7, D / 2 - .06, 0, 0, 0, 1, 1, 1, () => { m.rbox(1.0, .8, .06, .01); }); m.end();
    }
    /* a canvas lean-to on the left: cloth quads with sway, two poles, ropes */
    if (lod < 2) {
      m.begin('tarp'); m.uvm = 'param'; m.sway = 0; m.use('cloth', (x, y, z, nx, ny, nz, e, u, v) => mulc([.38, .50, .62], .88 + .2 * S.N(x, y, z, 7) - (Math.floor(v * 6) % 2 ? .05 : 0)));
      const ax = -W / 2 - .05, pole = [[ax - 2.6, 2.4, -D / 2 + .6], [ax - 2.6, 2.4, D / 2 - .6]];
      m.surf(6, 4, (u, v) => [lerp(ax, ax - 2.6, v), lerp(HW - .1, 2.4, v) - .15 * Math.sin(v * PI) * 0 - .12 * Math.sin(u * PI) , lerp(-D / 2 + .6, D / 2 - .6, u)], false, () => .1); m.uvm = 'box';
      m.use('wood', S.wood(wear, .6, {})); for (const p of pole) m.at(p[0], p[1] / 2, p[2], 0, 0, 0, 1, 1, 1, () => m.cyl(.06, .07, p[1], 6, 3)); m.end();
    }
    const lantern = [[-W / 2 + 1.2, HW - .5, -D / 2 - .1], [0, HW - .5, -D / 2 - .1], [W / 2 - 1.2, HW - .5, -D / 2 - .1]];
    return { nodes: { hut: Object.assign(m.finish(), { pivot: [0, 0, 0] }) }, meta: { kind: 'hut', lanterns: lantern, size: [W, D, HR] } };
  }
  function planLantern(o) {
    const lod = o.lod, S = skins(o.seed * 3 + 7), m = new MB(lod, o.seed), g = new MB(lod, o.seed + 1), st = S.rusty([.18, .17, .16], o.wear);
    m.begin('cage'); m.use('metal', st).at(0, 0, 0, 0, 0, 0, 1, 1, 1, () => { m.torus(.035, .008, 8, 3); }); m.at(0, -.04, 0, 0, 0, 0, 1, 1, 1, () => m.tube([[0, .03, 0], [0, .0, 0], [0, -.03, 0]], .006, 3));
    m.at(0, -.1, 0, 0, 0, 0, 1, 1, 1, () => m.cyl(.0, .1, .08, 8, 2)); m.at(0, -.34, 0, 0, 0, 0, 1, 1, 1, () => m.cyl(.085, .1, .04, 8, 3));
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + PI / 4; m.at(Math.cos(a) * .085, -.22, Math.sin(a) * .085, 0, 0, 0, 1, 1, 1, () => m.cyl(.007, .007, .26, 4, 0)); } m.end();
    g.begin('lamp'); g.use('glow', (x, y, z) => [1, .74 + .12 * (y + .3), .38]).at(0, -.22, 0, 0, 0, 0, 1, 1, 1, () => g.cyl(.07, .075, .24, 8, 3)); g.use('glow', () => [1, .96, .72]).at(0, -.26, 0, 0, 0, 0, 1, 1, 1, () => g.sph(.025, .04, .025, 5, 3)); g.end();
    return { nodes: { cage: Object.assign(m.finish(), { pivot: [0, 0, 0] }), lamp: Object.assign(g.finish(), { pivot: [0, 0, 0] }) }, meta: { kind: 'lantern', halo: [0, -.24, 0] } };
  }
  function planWash(o) {
    const lod = o.lod, seed = o.seed, S = skins(seed * 5 + 9), m = new MB(lod, seed), R = (i, k) => hash(i, seed * 31 + k), len = o.len || 10, nC = o.cloths || 7;
    const y0 = 3.2, a = [0, y0, 0], b = [len, y0 + .1, 0];
    m.begin('poles'); m.use('wood', S.wood(o.wear, .3, { wetY: .3 })); for (const [x, tilt] of [[0, .05], [len, -.04]]) m.at(x, 1.75, 0, 0, 0, tilt, 1, 1, 1, () => m.cyl(.06, .08, 3.5, 6, 3)); m.end();
    m.begin('line'); m.use('rope', S.rope([.62, .55, .40])).tube(sagLine(a, b, .22, 14), .012, 3); m.end();
    const COL = [[.86, .85, .80], [.36, .47, .64], [.66, .30, .26], [.76, .70, .52], [.46, .52, .44], [.80, .78, .70], [.30, .36, .52]];
    m.begin('cloth'); m.uvm = 'param';
    let x = .5; for (let i = 0; i < nC; i++) {
      const w = .5 + .5 * R(i, 1), h = .6 + .55 * R(i, 2), col = COL[Math.floor(R(i, 3) * COL.length)], stripe = R(i, 4) > .6, nx = lod === 0 ? 4 : 2, ny = lod === 0 ? 3 : 2, amp = .7 + .6 * R(i, 5);
      if (x + w > len - .3) break;
      m.use('cloth', (xx, yy, zz, nxx, nyy, nzz, e, u, v) => { let c = mulc(col, .9 + .15 * S.N(xx, yy, zz, 8)); if (stripe && Math.floor(u * 5) % 2) c = mulc(c, .82); return c; });
      const line = t => y0 + .1 * (t / len) - .22 * 4 * (t / len) * (1 - t / len), g0 = m.bucket('cloth'), base = g0.p.length / 3, wsw = [];
      m.surf(nx, ny, (u, v) => [x + u * w, line(x + u * w) - v * h + .02, 0], false, () => .1);
      const g1 = m.bucket('cloth'), n1 = g1.p.length / 3; for (let q = base; q < n1; q++) { const j = Math.floor((q - base) / (nx + 1)), sw = (j / ny) * amp; g1.w[q] = sw; } void wsw;
      m.use('wood', S.wood(.3, .2, {})); for (const f of [.1, .9]) m.at(x + w * f, line(x + w * f) + .01, 0, 0, 0, 0, 1, 1, 1, () => m.box(.03, .09, .05, .2));
      x += w + .12 + .2 * R(i, 6);
    }
    m.uvm = 'box'; m.end();
    return { nodes: { wash: Object.assign(m.finish(), { pivot: [0, 0, 0] }) }, meta: { kind: 'washline', len } };
  }
  function planFire(o) {
    const lod = o.lod, seed = o.seed, S = skins(seed * 3 + 1), m = new MB(lod, seed), R = (i, k) => hash(i, seed * 37 + k);
    m.begin('stones'); const nn = lod === 0 ? 10 : 7; for (let i = 0; i < nn; i++) { const a = i / nn * TAU + (R(i, 1) - .5) * .2, r = .62 + (R(i, 2) - .5) * .1, sz = .15 + .08 * R(i, 3); m.use('matte', (x, y, z) => mulc(mixc([.46, .44, .41], [.22, .20, .19], clamp(1 - Math.hypot(x, z) * 1.2, 0, 1) * (.4 + .6 * o.wear)), .8 + .4 * S.N(x, y, z, 6))).at(Math.cos(a) * r, sz * .6, Math.sin(a) * r, R(i, 4), R(i, 5) * 3, 0, 1, 1, 1, () => m.sph(sz * 1.2, sz * .8, sz, 6, 4)); } m.end();
    m.begin('ash'); m.use('matte', () => [.08, .075, .07]).at(0, .02, 0, 0, 0, 0, 1, 1, 1, () => m.cyl(.5, .52, .04, 12, 1)); m.end();
    m.begin('logs'); const lw = S.wood(o.wear, .2, {}); for (let i = 0; i < 4; i++) { const a = i * 1.6 + .4 + R(i, 6) * .3; m.use('wood', (x, y, z, nx, ny, nz, e) => { const ch = clamp(1 - Math.hypot(x, z) * 1.5, 0, 1); return mulc(lw(x, y, z, nx, ny, nz, e), 1 - .75 * ch); }).at(Math.cos(a) * .2, .13, Math.sin(a) * .2, 0, -a, .35, 1, 1, 1, () => m.at(.0, 0, 0, 0, 0, PI / 2, 1, 1, 1, () => m.cyl(.07, .08, .85, 7, 3))); } m.end();
    m.begin('embers'); m.use('glow', () => [1, .35, .08]); for (let i = 0; i < 6; i++) m.at((R(i, 7) - .5) * .5, .07 + .08 * R(i, 8), (R(i, 9) - .5) * .5, R(i, 10), R(i, 11), R(i, 12), 1, 1, 1, () => m.box(.07, .05, .06, 0)); m.end();
    return { nodes: { fire: Object.assign(m.finish(), { pivot: [0, 0, 0] }) }, meta: { kind: 'firepit', flame: [0, .45, 0] } };
  }
  function planBarrels(o) {
    const lod = o.lod, seed = o.seed, S = skins(seed * 7 + 5), m = new MB(lod, seed), R = (i, k) => hash(i, seed * 41 + k), n = o.n || 3;
    m.begin('barrel'); for (let i = 0; i < n; i++) {
      const r0 = .29 + .03 * R(i, 1), h = .85 + .1 * R(i, 2), kind = Math.floor(R(i, 3) * 3), lying = n > 2 && i === n - 1, px = i < 2 ? i * .75 : 0.3, pz = i < 2 ? 0 : -.8;
      const body = kind === 0 ? S.wood(o.wear, .15, { wetY: .3 }) : kind === 1 ? S.paint([.30, .42, .40], o.wear, { h: 1 }) : S.rusty([.46, .24, .14], o.wear);
      m.at(px, lying ? r0 : h / 2, pz, lying ? PI / 2 : 0, R(i, 4) * 6, lying ? 0 : 0, 1, 1, 1, () => {
        m.use(kind === 0 ? 'wood' : 'metal', body).surf(m.n_(12, 6), m.n_(6, 3), (u, v) => { const a = u * TAU, r = r0 * (1 + .1 * Math.sin(v * PI)); return [Math.cos(a) * r, (v - .5) * h, Math.sin(a) * r]; }, true, () => .3);
        m.use('metal', S.rusty([.26, .2, .17], o.wear)); for (const v of [.14, .5, .86]) m.at(0, (v - .5) * h, 0, 0, 0, 0, 1, 1, 1, () => m.torus(r0 * (1 + .1 * Math.sin(v * PI)) + .004, .014, 12, 3));
        m.use(kind === 0 ? 'wood' : 'metal', body); const open = i === 1; m.at(0, h / 2 - (open ? .08 : 0), 0, 0, 0, 0, 1, 1, 1, () => { m.cyl(r0 * .96, r0 * .96, .03, 12, 3); if (open) { m.use('glass', () => [.15, .28, .30]); m.at(0, .02, 0, 0, 0, 0, 1, 1, 1, () => m.cyl(r0 * .9, r0 * .9, .01, 12, 1)); } });
      });
    } m.end();
    return { nodes: { barrels: Object.assign(m.finish(), { pivot: [0, 0, 0] }) }, meta: { kind: 'barrels', n } };
  }
  /* ---------------------------------------------------------------- 11. the plan registry (PURE) ---------------------------------------------------------------- */
  const KINDS = [
    { id: 'robot_hauler', label: 'Robot: hauler', group: 'robots' }, { id: 'robot_sorter', label: 'Robot: sorter', group: 'robots' }, { id: 'robot_stacker', label: 'Robot: stacker', group: 'robots' },
    { id: 'hulk', label: 'The hulk (stranded trawler)', group: 'hulk' }, { id: 'jetty', label: 'The jetty', group: 'jetty' },
    { id: 'bay_planks', label: 'Bay 1: sawn planks', group: 'bays' }, { id: 'bay_rope', label: 'Bay 2: rope coils', group: 'bays' }, { id: 'bay_glass', label: 'Bay 3: bottles and glass floats', group: 'bays' }, { id: 'bay_metal', label: 'Bay 4: metal sheets, pipes, gear', group: 'bays' },
    { id: 'hut', label: 'Camp hut (rusty roof)', group: 'camp' }, { id: 'lantern', label: 'Lantern with halo', group: 'camp' }, { id: 'washline', label: 'Washing line', group: 'camp' }, { id: 'firepit', label: 'Fire pit', group: 'camp' }, { id: 'barrels', label: 'Barrels', group: 'camp' },
    { id: 'battery', label: 'Battery block', group: 'robots' }, { id: 'hands', label: 'Gloved hands', group: 'robots' }
  ];
  const PLANNERS = {
    robot_hauler: o => planRobot('hauler', o), robot_sorter: o => planRobot('sorter', o), robot_stacker: o => planRobot('stacker', o), hulk: planHulk, jetty: planJetty,
    bay_planks: o => planBay('bay_planks', o), bay_rope: o => planBay('bay_rope', o), bay_glass: o => planBay('bay_glass', o), bay_metal: o => planBay('bay_metal', o),
    hut: planHut, lantern: planLantern, washline: planWash, firepit: planFire, barrels: planBarrels, battery: planBattery, hands: planHands
  };
  function normOpts(o) { o = Object.assign({}, o || {}); o.seed = (o.seed === undefined ? 1 : o.seed) | 0; o.wear = clamp(o.wear === undefined ? .5 : +o.wear, 0, 1); o.lod = clamp(o.lod === undefined ? 0 : o.lod | 0, 0, 2); return o; }
  /* plan(kind, opts): pure data. tris = every triangle drawn once for one instance of the piece (instanced items counted per item). */
  function plan(kind, opts) {
    const f = PLANNERS[kind]; if (!f) throw new Error('details: unknown kind ' + kind); const o = normOpts(opts), r = f(o); let tris = 0; const parts = [], byNode = {};
    for (const nn in r.nodes) { const nd = r.nodes[nn], pv = nd.pivot || [0, 0, 0]; let t = nd.tris; for (const it of nd.inst || []) { t += it.geo.tris * it.items.length; for (const p of it.geo.parts) parts.push({ name: p.name, node: nn, key: it.key, tris: p.tris * it.items.length, min: p.min, max: p.max, instanced: true }); } byNode[nn] = t; tris += t; for (const p of nd.parts) parts.push({ name: p.name, node: nn, key: p.key, tris: p.tris, min: p.min.map((v, i) => v + pv[i]), max: p.max.map((v, i) => v + pv[i]) }); }
    return { kind, opts: o, nodes: r.nodes, meta: r.meta, tris, byNode, parts };
  }
  /* a deterministic checksum of everything a plan holds (positions, colours, instance matrices to 1e-4) */
  function digest(pl) {
    let h = 2166136261 >>> 0; const mix = v => { h ^= v & 0xffffffff; h = Math.imul(h, 16777619) >>> 0; }, fl = a => { for (let i = 0; i < a.length; i++) mix(Math.round(a[i] * 1e4)); };
    const doNode = nd => { for (const k of Object.keys(nd.B).sort()) { const b = nd.B[k]; fl(b.p); fl(b.n); fl(b.c); fl(b.u); fl(b.w); for (let i = 0; i < b.i.length; i++) mix(b.i[i]); } for (const it of nd.inst || []) { doNode(it.geo); for (const q of it.items) { fl(q.m); fl(q.col); mix(Math.round((q.warp || 0) * 1e4)); } } };
    for (const nn of Object.keys(pl.nodes).sort()) doNode(pl.nodes[nn]); return h >>> 0;
  }
  function hasNaN(pl) { let bad = 0; const chk = a => { for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) bad++; }; const doNode = nd => { for (const k in nd.B) { const b = nd.B[k]; chk(b.p); chk(b.n); chk(b.c); chk(b.u); chk(b.w); } for (const it of nd.inst || []) { doNode(it.geo); for (const q of it.items) { chk(q.m); chk(q.col); chk([q.warp]); } } }; for (const nn in pl.nodes) doNode(pl.nodes[nn]); return bad; }

  /* the axis-aligned bounds of a plan in its own frame (pivots and instance matrices included): {min, max, size} */
  function bounds(pl) {
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], add = (x, y, z) => { if (x < mn[0]) mn[0] = x; if (y < mn[1]) mn[1] = y; if (z < mn[2]) mn[2] = z; if (x > mx[0]) mx[0] = x; if (y > mx[1]) mx[1] = y; if (z > mx[2]) mx[2] = z; };
    const boxOf = nd => { const a = [1e9, 1e9, 1e9], c = [-1e9, -1e9, -1e9]; for (const k in nd.B) { const p = nd.B[k].p; for (let i = 0; i < p.length; i += 3) for (let j = 0; j < 3; j++) { if (p[i + j] < a[j]) a[j] = p[i + j]; if (p[i + j] > c[j]) c[j] = p[i + j]; } } return [a, c]; };
    for (const nn in pl.nodes) { const nd = pl.nodes[nn], pv = nd.pivot || [0, 0, 0], [a, c] = boxOf(nd); if (a[0] < 1e8) { add(a[0] + pv[0], a[1] + pv[1], a[2] + pv[2]); add(c[0] + pv[0], c[1] + pv[1], c[2] + pv[2]); }
      for (const it of nd.inst || []) { const [ga, gc] = boxOf(it.geo); for (const q of it.items) { const e = q.m; for (let k = 0; k < 8; k++) { const x = k & 1 ? gc[0] : ga[0], y = k & 2 ? gc[1] : ga[1], z = k & 4 ? gc[2] : ga[2]; add(e[0] * x + e[1] * y + e[2] * z + e[3] + pv[0], e[4] * x + e[5] * y + e[6] * z + e[7] + pv[1], e[8] * x + e[9] * y + e[10] * z + e[11] + pv[2]); } } } }
    return { min: mn, max: mx, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] };
  }
  /* ---------------------------------------------------------------- 12. THREE: kit, build, tick ---------------------------------------------------------------- */
  function makeKit(THREE, kopts) {
    kopts = kopts || {}; const kit = { THREE, uTime: { value: 0 }, tickers: [], tex: {}, mats: {}, hullTex: {}, t: 0 };
    const dtex = (w, h, data, rep) => { const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true; void rep; return t; };
    kit.dtex = dtex;
    for (const k of ['grunge', 'wood', 'rust']) kit.tex[k] = dtex(TEX[k].w, TEX[k].h, texData(TEX[k].w, TEX[k].h, TEX[k].fn(7)));
    const halo = new THREE.DataTexture(haloData(64), 64, 64, THREE.RGBAFormat); halo.magFilter = halo.minFilter = THREE.LinearFilter; halo.needsUpdate = true; kit.tex.halo = halo;
    const fl = new THREE.DataTexture(flameData(), 32, 64, THREE.RGBAFormat); fl.magFilter = fl.minFilter = THREE.LinearFilter; fl.needsUpdate = true; kit.tex.flame = fl;
    const M = kit.mats, L = (extra) => new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true }, extra));
    M.matte = L({ map: kit.tex.grunge }); M.wood = L({ map: kit.tex.wood }); M.rubber = L({ map: kit.tex.grunge }); M.rope = L({ map: kit.tex.grunge });
    M.metal = new THREE.MeshPhongMaterial({ vertexColors: true, map: kit.tex.grunge, specular: 0x302c28, shininess: 22 });
    M.glass = new THREE.MeshPhongMaterial({ vertexColors: true, specular: 0xffffff, shininess: 90, transparent: true, opacity: .74, depthWrite: false });
    M.glow = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    M.cloth = L({ side: THREE.DoubleSide });
    M.cloth.onBeforeCompile = sh => { sh.uniforms.uTime = kit.uTime; sh.vertexShader = 'attribute float aSway;\nuniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat ph=uTime*1.8+position.x*1.4+position.y*0.9;\ntransformed.z+=(sin(ph)*0.12+sin(ph*2.3+1.0)*0.04)*aSway;\ntransformed.x+=sin(ph*0.8+2.0)*0.05*aSway;'); };
    M.hull = L({ side: THREE.DoubleSide, alphaTest: .5 });
    M.plank = new THREE.MeshLambertMaterial({ map: kit.tex.wood, color: 0xffffff });
    M.plank.onBeforeCompile = sh => { sh.vertexShader = 'attribute float aWarp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.y+=aWarp*(1.0-4.0*position.x*position.x);'); };
    kit.update = t => { kit.t = t; kit.uTime.value = t; for (const f of kit.tickers) f(t); };
    kit.hullMat = (seed, wear) => { const key = seed + ':' + Math.round(wear * 10); if (!kit.hullTex[key]) { const t = dtex(512, 256, texData(512, 256, platingFn(seed * 3 + 1, wear))); t.repeat.set(2.5, 2); kit.hullTex[key] = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, alphaTest: .5, map: t }); } return kit.hullTex[key]; };
    kit.dispose = () => { for (const k in kit.mats) kit.mats[k].dispose(); for (const k in kit.tex) kit.tex[k].dispose(); for (const k in kit.hullTex) { kit.hullTex[k].map.dispose(); kit.hullTex[k].dispose(); } };
    return kit;
  }
  function geoFrom(THREE, b, sway) {
    const g = new THREE.BufferGeometry(), nv = b.p.length / 3;
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(b.c, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
    if (sway) g.setAttribute('aSway', new THREE.Float32BufferAttribute(b.w, 1)); g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(b.i, 1) : new THREE.Uint16BufferAttribute(b.i, 1)); g.computeBoundingSphere(); return g;
  }
  /* build(kit, kind, opts) -> THREE.Group. userData: stats {tris, meshes, drawCalls}, plan, tick, and the robot controls */
  function build(kit, kind, opts) {
    const THREE = kit.THREE, pl = plan(kind, opts), o = pl.opts, g = new THREE.Group(); g.name = kind; const meshes = [], ownMats = [], geos = [];
    const matFor = (key, node) => { if (key === 'hull') return kit.hullMat(o.seed, o.wear); return kit.mats[key] || kit.mats.matte; };
    for (const nn in pl.nodes) {
      const nd = pl.nodes[nn], sub = new THREE.Group(); sub.name = nn; const pv = nd.pivot || [0, 0, 0]; sub.position.set(pv[0], pv[1], pv[2]); g.add(sub);
      for (const key in nd.B) { const b = nd.B[key]; if (!b.i.length) continue; const sway = key === 'cloth' && b.w.some(v => v !== 0), geo = geoFrom(THREE, b, sway); geos.push(geo);
        let mat = matFor(key, nd); if (key === 'cloth' && !sway) mat = kit.mats.matte; if (key === 'glow' && (kind.startsWith('robot') || kind === 'hut' || kind === 'lantern')) { mat = mat.clone(); ownMats.push(mat); sub.userData.glowMat = mat; g.userData['glow_' + nn] = mat; }
        const me = new THREE.Mesh(geo, mat); me.name = nn + '.' + key; if (key === 'glow' || key === 'glass') me.renderOrder = 2; sub.add(me); meshes.push(me); }
      for (const it of nd.inst || []) {
        const n = it.items.length, warp = new Float32Array(n), col = new Float32Array(n * 3), mm = new THREE.Matrix4();
        it.items.forEach((q, i) => { col[i * 3] = q.col[0]; col[i * 3 + 1] = q.col[1]; col[i * 3 + 2] = q.col[2]; warp[i] = q.warp || 0; });
        for (const kk in it.geo.B) {
          const bb = it.geo.B[kk]; if (!bb.i.length) continue; const geo = geoFrom(THREE, bb, false), mat = it.key === 'plank' ? kit.mats.plank : kit.mats[kk] || kit.mats.matte; geos.push(geo);
          const im = new THREE.InstancedMesh(geo, mat, n); it.items.forEach((q, i) => { const e = q.m; mm.set(e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8], e[9], e[10], e[11], 0, 0, 0, 1); im.setMatrixAt(i, mm); });
          im.instanceColor = new THREE.InstancedBufferAttribute(col, 3); if (it.key === 'plank') geo.setAttribute('aWarp', new THREE.InstancedBufferAttribute(warp, 1));
          im.frustumCulled = false; im.name = nn + '.' + (it.name || it.key) + '.' + kk; im.instanceMatrix.needsUpdate = true; sub.add(im); meshes.push(im);
        }
      }
    }
    const ud = g.userData; ud.plan = pl; ud.kind = kind; ud.ownMats = ownMats; ud.tickers = [];
    ud.stats = { tris: pl.tris, meshes: meshes.length, draws: meshes.length, byNode: pl.byNode };
    const addHalo = (parent, x, y, z, size, rgb) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: kit.tex.halo, color: new THREE.Color(rgb[0], rgb[1], rgb[2]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); sp.position.set(x, y, z); sp.scale.set(size, size, 1); sp.renderOrder = 5; parent.add(sp); ownMats.push(sp.material); ud.stats.draws++; return sp; };
    if (kind.startsWith('robot')) {
      const lensN = g.getObjectByName('lens'), hatch = g.getObjectByName('hatch'), bat = g.getObjectByName('battery'), P = pl.meta; let lensK = o.lens === undefined ? 1 : o.lens, hatchK = o.hatch === undefined ? 0 : o.hatch, out = o.batteryOut || 0;
      const halo = addHalo(lensN, .05, 0, 0, .55, [1, .75, .4]), gm = ud.glow_lens;
      ud.setLens = k => { lensK = k; const m = .10 + .9 * clamp(k, 0, 1.6); gm.color.setRGB(m, m, m); halo.material.opacity = clamp(k, 0, 1) * .85; const s = .25 + .45 * clamp(k, 0, 1.4); halo.scale.set(s, s, 1); halo.visible = k > .05; };
      ud.setHatch = k => { hatchK = clamp(k, 0, 1); hatch.rotation.y = -hatchK * 1.9; bat.visible = hatchK > .25 || out > .01; };
      ud.setBattery = k => { out = k; bat.position.z = P.bd / 2 - .07 + k * .4; bat.visible = hatchK > .25 || out > .01; };
      ud.setLens(lensK); ud.setHatch(hatchK); ud.setBattery(out);
      if (o.visibleBattery) bat.visible = true;
    }
    if (kind === 'battery') { const b = g.getObjectByName('battery'); void b; }
    if (kind === 'lantern') {
      const h = addHalo(g, 0, -.24, 0, 1.6, [1, .72, .36]), gm = ud.glow_lamp; let lit = o.lit === undefined ? 1 : o.lit;
      ud.setLit = k => { lit = k; const m = .18 + .82 * clamp(k, 0, 1.5); gm.color.setRGB(m, m, m); h.material.opacity = clamp(k, 0, 1); h.visible = k > .02; }; ud.setLit(lit);
    }
    if (kind === 'hut') {
      const gm = ud.glow_hut; let lit = o.lit === undefined ? .8 : o.lit; const lamps = [];
      for (const p of pl.meta.lanterns) { const l = build(kit, 'lantern', { seed: o.seed + lamps.length, wear: o.wear, lod: o.lod, lit }); l.position.set(p[0], p[1], p[2]); g.add(l); lamps.push(l); ud.stats.tris += l.userData.stats.tris; ud.stats.draws += l.userData.stats.draws; }
      ud.setLit = k => { lit = k; if (gm) { const m = .1 + .9 * clamp(k, 0, 1.5); gm.color.setRGB(m, m, m); } lamps.forEach(l => l.userData.setLit(k)); }; ud.setLit(lit); ud.lamps = lamps;
    }
    if (kind === 'firepit') {
      const fp = pl.meta.flame, fs = [], mats = []; for (let i = 0; i < 3; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: kit.tex.flame, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); sp.position.set(fp[0] + (i - 1) * .1, fp[1], fp[2] + (i % 2 - .5) * .12); sp.center.set(.5, 0); sp.renderOrder = 5; g.add(sp); fs.push(sp); mats.push(sp.material); ud.stats.draws++; }
      const np = 14, pos = new Float32Array(np * 3), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xff8a2a, size: .06, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })); pts.frustumCulled = false; g.add(pts); ud.stats.draws++; ownMats.push(pts.material, ...mats); geos.push(geo);
      let lit = o.lit === undefined ? 1 : o.lit;
      ud.tick = t => { fs.forEach((sp, i) => { const f = .85 + .15 * Math.sin(t * (9 + i * 3.1) + i * 2) + .1 * Math.sin(t * 23.7 + i); const s = (.55 + .12 * i) * f * lit; sp.scale.set(s * .8, s * 1.35 * (1 + .1 * Math.sin(t * 11 + i)), 1); sp.material.opacity = clamp(lit, 0, 1) * (.8 + .2 * f); sp.material.rotation = .08 * Math.sin(t * 6 + i * 2); sp.visible = lit > .02; });
        for (let i = 0; i < np; i++) { const ph = ((t * (.4 + .25 * hash(i, 3)) + hash(i, 4)) % 1), a = hash(i, 5) * TAU, r = .08 + .2 * hash(i, 6) * (1 - ph * .3); pos[i * 3] = fp[0] + Math.cos(a) * r + Math.sin(t + i) * .08 * ph; pos[i * 3 + 1] = .2 + ph * 1.8; pos[i * 3 + 2] = fp[2] + Math.sin(a) * r; } geo.attributes.position.needsUpdate = true; pts.visible = lit > .1; };
      ud.setLit = k => { lit = k; }; ud.tick(0);
    }
    if (ud.tick) kit.tickers.push(ud.tick);
    ud.dispose = () => { g.removeFromParent && g.removeFromParent(); geos.forEach(x => x.dispose()); ownMats.forEach(x => x.dispose()); if (ud.tick) { const i = kit.tickers.indexOf(ud.tick); if (i >= 0) kit.tickers.splice(i, 1); } };
    return g;
  }
  /* a composite of the camp for a board or a wide shot */
  function buildCamp(kit, o) {
    o = normOpts(o); const THREE = kit.THREE, g = new THREE.Group(); g.name = 'camp'; const kids = []; const add = (kind, x, y, z, ry, op) => { const c = build(kit, kind, Object.assign({}, o, op || {})); c.position.set(x, y, z); c.rotation.y = ry || 0; g.add(c); kids.push(c); return c; };
    add('hut', 0, 0, 0, 0); add('firepit', -2.2, 0, -5.4, 0); add('washline', -4.5, 0, -8, 0); add('barrels', 5.2, 0, -4.6, .3); add('lantern', -3.6, 3.0, -4.0, 0, { seed: o.seed + 9 });
    g.userData.stats = { tris: kids.reduce((a, c) => a + c.userData.stats.tris, 0), draws: kids.reduce((a, c) => a + c.userData.stats.draws, 0), meshes: kids.reduce((a, c) => a + c.userData.stats.meshes, 0) }; g.userData.kids = kids; g.userData.dispose = () => kids.forEach(c => c.userData.dispose()); return g;
  }
  const API = { VERSION: 1, KINDS, plan, digest, hasNaN, bounds, build, buildCamp, makeKit, hash, skins, MB, FACE, ROBOT, ROBOT_NAMES };
  root = root || (typeof globalThis !== 'undefined' ? globalThis : null);
  if (typeof module === 'object' && module && module.exports) module.exports = API;
  if (root) root.LI_DETAILS = API;
  if (typeof globalThis !== 'undefined') globalThis.LI_DETAILS = API;
}(typeof window !== 'undefined' ? window : null));
