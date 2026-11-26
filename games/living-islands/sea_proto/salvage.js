/* Living Islands sea prototype: the SALVAGE KIT (research/VARIETY_AND_SALVAGE_PLAN.md). Procedural three.js r128 geometry, no textures, no downloads.
   window.LI_SALVAGE = { makeKit(THREE, opts), KINDS, hash, rng, ... }.
   14 kinds, 2 to 5 variants each, 3 levels of detail. Every vertex carries: color (the fresh colour), aWorn (worn colour + a mask: where use and water put the wear), aGr (grain strength).
   Per instance: aVar (wear amount, wetness, grain phase), instanceColor (tint). The three shared materials (matte Lambert, metal Phong, glass Phong) add procedural grain from the local position
   plus the per-instance phase, so there is no texture to repeat; a world-position macro tint breaks up large patches. Pure geometry code: no Math.random, no clock.
   Units are metres. Local axes: length along +X, up +Y. Tags: TUNING = a game number. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2, clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function hash(i, s) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function rng(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* smooth value noise in 3D, 0..1 */
  function n3(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    const h = (a, b, c) => hash(a + Math.imul(b, 57) + Math.imul(c, 131), 91);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(h(ix, iy, iz), h(ix + 1, iy, iz), ux), l(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), ux), uy), l(l(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), ux), l(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), ux), uy), uz);
  }

  /* 1. the kinds. nV variants; h = full height (m) for the waterline; float = share of the height under water (0 sinks); rad = rough bounding radius; w = how often it is chosen at sea; where it lands */
  const KINDS = [
    { id: 'plank', name: 'Plank', nV: 5, h: .045, float: .55, rad: 1.5, w: 20, sea: 1, beach: 1, len: 1 },
    { id: 'log', name: 'Driftwood log', nV: 4, h: .3, float: .6, rad: 2.1, w: 11, sea: 1, beach: 1, len: 1 },
    { id: 'cork', name: 'Cork float', nV: 3, h: .12, float: .35, rad: .35, w: 9, sea: 1, beach: 1 },
    { id: 'gfloat', name: 'Glass float', nV: 4, h: .3, float: .22, rad: .3, w: 3, sea: 1, beach: 1 },
    { id: 'bottle', name: 'Bottle', nV: 3, h: .09, float: .5, rad: .22, w: 5, sea: 1, beach: 1 },
    { id: 'crate', name: 'Crate', nV: 5, h: .46, float: .45, rad: .6, w: 6, sea: 1, beach: 1 },
    { id: 'barrel', name: 'Barrel', nV: 3, h: .55, float: .5, rad: .6, w: 4, sea: 1, beach: 1 },
    { id: 'pulley', name: 'Pulley', nV: 3, h: .22, float: 0, rad: .22, w: 0, sea: 0, beach: 1 },
    { id: 'hinge', name: 'Hinge', nV: 3, h: .03, float: 0, rad: .2, w: 0, sea: 0, beach: 1 },
    { id: 'kelp', name: 'Kelp', nV: 4, h: .03, float: .9, rad: 1.1, w: 12, sea: 1, beach: 1, len: 1 },
    { id: 'shell', name: 'Shell', nV: 5, h: .04, float: 0, rad: .12, w: 0, sea: 0, beach: 1 },
    { id: 'rope', name: 'Rope coil', nV: 3, h: .06, float: .8, rad: .5, w: 5, sea: 1, beach: 1 },
    { id: 'pebble', name: 'Pebble', nV: 4, h: .05, float: 0, rad: .1, w: 0, sea: 0, beach: 1 },
    { id: 'net', name: 'Net clump', nV: 2, h: .05, float: .85, rad: .5, w: 3, sea: 1, beach: 1 }
  ];
  const KIND = {}; KINDS.forEach((k, i) => { k.idx = i; KIND[k.id] = k; });
  const LODN = 3;

  /* 2. the builder: parametric surfaces with numeric normals, merged per material (M matte, T metal, G glass). Styles give colour, worn colour, wear mask and grain per vertex. */
  function Builder(THREE, lod) {
    this.T = THREE; this.lod = lod; this.cur = 'M'; this.sty = null; this.m = new THREE.Matrix4(); this.stack = [];
    const mk = () => ({ p: [], n: [], c: [], w: [], g: [], i: [] }); this.g = { M: mk(), T: mk(), G: mk() };
  }
  Builder.prototype.s = function (n, min) { return Math.max(min || 2, Math.round(n * (this.lod === 0 ? 1 : this.lod === 1 ? .5 : .25))); };
  Builder.prototype.use = function (m, sty) { this.cur = m; if (sty) this.sty = sty; return this; };
  Builder.prototype.at = function (x, y, z, rx, ry, rz, sx, sy, sz, fn) {
    const T = this.T, loc = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0, 'YZX')), new T.Vector3(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy, sz === undefined ? 1 : sz));
    this.stack.push(this.m); this.m = this.m.clone().multiply(loc); fn(); this.m = this.stack.pop();
  };
  const _v = [0, 0, 0], _o = [0, 0, 0, 0, 0, 0, 0, 0];
  /* a grid surface fn(u,v) -> [x,y,z] over u,v in 0..1. flip reverses the winding. sty(p,n,u,v) fills _o (r,g,b, wr,wg,wb,wa, grain). */
  Builder.prototype.surf = function (nu, nv, fn, flip, sty) {
    const G = this.g[this.cur], me = this.m.elements, st = sty || this.sty, base = G.p.length / 3, e = 1e-3; nu = Math.max(1, nu | 0); nv = Math.max(1, nv | 0);
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv, P = fn(u, v), a = fn(u + e, v), b = fn(u - e, v), c = fn(u, v + e), d = fn(u, v - e);
      let ux = a[0] - b[0], uy = a[1] - b[1], uz = a[2] - b[2], vx = c[0] - d[0], vy = c[1] - d[1], vz = c[2] - d[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; if (flip) { nx = -nx; ny = -ny; nz = -nz; }
      let l = Math.hypot(nx, ny, nz); if (l < 1e-12) { nx = 0; ny = 1; nz = 0; l = 1; } nx /= l; ny /= l; nz /= l;
      const X = me[0] * P[0] + me[4] * P[1] + me[8] * P[2] + me[12], Y = me[1] * P[0] + me[5] * P[1] + me[9] * P[2] + me[13], Z = me[2] * P[0] + me[6] * P[1] + me[10] * P[2] + me[14];
      let NX = me[0] * nx + me[4] * ny + me[8] * nz, NY = me[1] * nx + me[5] * ny + me[9] * nz, NZ = me[2] * nx + me[6] * ny + me[10] * nz; l = Math.hypot(NX, NY, NZ) || 1;
      NX /= l; NY /= l; NZ /= l; _v[0] = X; _v[1] = Y; _v[2] = Z; const n = [NX, NY, NZ]; st(_v, n, u, v);
      G.p.push(X, Y, Z); G.n.push(NX, NY, NZ); G.c.push(_o[0], _o[1], _o[2]); G.w.push(_o[3], _o[4], _o[5], _o[6]); G.g.push(_o[7]);
    }
    const w = nu + 1;
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = base + j * w + i, b = a + 1, c = a + w, d = c + 1; if (flip) G.i.push(a, c, b, b, c, d); else G.i.push(a, b, c, b, d, c); }
    return this;
  };
  /* a box with bevelled edges, six faces; seg = [nx, ny, nz]; disp(p) optional returns [dx,dy,dz] */
  Builder.prototype.rbox = function (cx, cy, cz, sx, sy, sz, r, seg, disp, sty) {
    const h = [sx / 2, sy / 2, sz / 2], ih = [Math.max(h[0] - r, 0), Math.max(h[1] - r, 0), Math.max(h[2] - r, 0)], sg = seg || [2, 2, 2];
    for (let a = 0; a < 3; a++) for (let s = -1; s <= 1; s += 2) {
      const b = (a + 1) % 3, c = (a + 2) % 3;
      this.surf(sg[b], sg[c], (u, v) => {
        const q = [0, 0, 0]; q[a] = s * h[a]; q[b] = (u * 2 - 1) * h[b]; q[c] = (v * 2 - 1) * h[c];
        const cp = [clamp(q[0], -ih[0], ih[0]), clamp(q[1], -ih[1], ih[1]), clamp(q[2], -ih[2], ih[2])], dx = q[0] - cp[0], dy = q[1] - cp[1], dz = q[2] - cp[2], l = Math.hypot(dx, dy, dz) || 1;
        const p = [cp[0] + dx / l * r + cx, cp[1] + dy / l * r + cy, cp[2] + dz / l * r + cz]; if (disp) { const d = disp(p); p[0] += d[0]; p[1] += d[1]; p[2] += d[2]; } return p;
      }, s < 0, sty);
    }
    return this;
  };
  /* a body of revolution about local X: rad(t, a) radius, t 0..1 along len, centred. caps = [start, end] booleans; capSty optional */
  Builder.prototype.lathe = function (len, nA, nT, rad, caps, sty, capSty, tr) {
    const t0 = tr ? tr[0] : 0, t1 = tr ? tr[1] : 1;
    this.surf(nA, nT, (u, v) => { const t = lerp(t0, t1, v), a = u * TAU, r = rad(t, a); return [(t - .5) * len, r * Math.cos(a), r * Math.sin(a)]; }, false, sty);
    if (caps && caps[0]) this.surf(nA, 2, (u, v) => { const a = u * TAU, r = rad(t0, a) * v; return [(t0 - .5) * len, r * Math.cos(a), r * Math.sin(a)]; }, false, capSty || sty);
    if (caps && caps[1]) this.surf(nA, 2, (u, v) => { const a = u * TAU, r = rad(t1, a) * v; return [(t1 - .5) * len, r * Math.cos(a), r * Math.sin(a)]; }, true, capSty || sty);
    return this;
  };
  /* a tube along path(s) -> [x,y,z], s 0..1; rad(s). up picks the frame. */
  Builder.prototype.tube = function (nA, nS, path, rad, sty, up, closed) {
    up = up || [0, 1, 0]; const e = 1e-3;
    this.surf(nA, nS, (u, v) => {
      const P = path(v), A = path(Math.min(v + e, 1 + e)), B = path(Math.max(v - e, -e)); let tx = A[0] - B[0], ty = A[1] - B[1], tz = A[2] - B[2], l = Math.hypot(tx, ty, tz) || 1; tx /= l; ty /= l; tz /= l;
      let nx = up[1] * tz - up[2] * ty, ny = up[2] * tx - up[0] * tz, nz = up[0] * ty - up[1] * tx; l = Math.hypot(nx, ny, nz);
      if (l < 1e-5) { nx = 1; ny = 0; nz = 0; l = 1; } nx /= l; ny /= l; nz /= l;
      const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx, a = u * TAU, r = rad(clamp(v, 0, 1)), ca = Math.cos(a) * r, sa = Math.sin(a) * r;
      return [P[0] + nx * ca + bx * sa, P[1] + ny * ca + by * sa, P[2] + nz * ca + bz * sa];
    }, false, sty);
    return this;
  };
  /* a closed shell of ellipsoid about Y: rx, ry, rz; v range lets half shells be made */
  Builder.prototype.ell = function (rx, ry, rz, nA, nT, disp, sty, vr) {
    const v0 = vr ? vr[0] : 0, v1 = vr ? vr[1] : 1;
    this.surf(nA, nT, (u, v) => { const th = lerp(v0, v1, v) * Math.PI, ph = u * TAU, p = [rx * Math.sin(th) * Math.cos(ph), ry * Math.cos(th), rz * Math.sin(th) * Math.sin(ph)]; if (disp) { const d = disp(p, u, v); p[0] += d[0]; p[1] += d[1]; p[2] += d[2]; } return p; }, false, sty);
    return this;
  };
  Builder.prototype.geometry = function (mk) {
    const T = this.T, out = {};
    for (const k in this.g) {
      const G = this.g[k]; if (!G.i.length) continue; const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(G.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(G.n, 3)); g.setAttribute('color', new T.Float32BufferAttribute(G.c, 3));
      g.setAttribute('aWorn', new T.Float32BufferAttribute(G.w, 4)); g.setAttribute('aGr', new T.Float32BufferAttribute(G.g, 1)); g.setIndex(G.i); g.computeBoundingSphere(); out[k] = g;
    }
    return out;
  };

  /* styles. opts: b base colour, w worn colour, mask(p,n,u,v) 0..1, gr grain strength (shader), vr colour variation, f noise frequency [x,y,z], seed, fn optional (p,n,u,v,c) to adjust base colour in place */
  function Sty(o) {
    const b = o.b, w = o.w || [.62, .6, .55], f = o.f || [3, 24, 24], vr = o.vr === undefined ? .14 : o.vr, sd = o.seed || 0;
    return function (p, n, u, v) {
      const k = (n3(p[0] * f[0] + sd, p[1] * f[1], p[2] * f[2] + sd * .7) - .5) * 2 * vr, k2 = (n3(p[0] * 2.1 + sd, p[1] * 2.1, p[2] * 2.1) - .5) * vr;
      _o[0] = b[0] * (1 + k + k2); _o[1] = b[1] * (1 + k + k2); _o[2] = b[2] * (1 + k + k2);
      if (o.fn) o.fn(p, n, u, v, _o);
      const m = o.mask ? clamp(o.mask(p, n, u, v), 0, 1) : 0; _o[3] = w[0]; _o[4] = w[1]; _o[5] = w[2]; _o[6] = m; _o[7] = o.gr === undefined ? 0 : o.gr;
    };
  }
  const mixc = (c, t, a) => { c[0] = lerp(c[0], t[0], a); c[1] = lerp(c[1], t[1], a); c[2] = lerp(c[2], t[2], a); };
  const WOODS = [[.62, .48, .34], [.55, .43, .31], [.68, .55, .40], [.46, .36, .27]], SILVER = [.74, .71, .65];

  /* ---------------------------------------------------------------- the recipes ---------------------------------------------------------------- */
  /* a sawn board along X. brk = -1/0/1 which end is broken, crack = a long split, paint = pale painted end, holes = nail holes (dark rings) */
  function board(B, L, W, T, seed, o) {
    o = o || {}; const brk = o.brk || 0, ze = o.zc === undefined ? 0 : o.zc, wc = WOODS[(seed * 7 | 0) % 4];
    const sty = Sty({
      b: [wc[0] * (.9 + .2 * hash(seed * 9 | 0, 3)), wc[1] * (.9 + .2 * hash(seed * 9 | 0, 4)), wc[2]], w: SILVER, seed: seed * 10, gr: 1, f: [1.4, 30, 26],
      fn: (p, n, u, v, c) => {
        if (o.paint) { const e = p[0] - (L / 2 - .38); if (e > 0 && Math.abs(p[0]) > 0) { const fl = n3(p[0] * 34, p[1] * 40, p[2] * 34 + seed) > .5 + (1 - sm(0, .38, e)) * .12 ? 1 : 0; if (!fl) mixc(c, [.86, .88, .83], .92); } }
        if (o.holes) for (const hx of o.holes) for (const hz of [-W * .22, W * .22]) { const d = Math.hypot(p[0] - hx, p[2] - hz); if (d < .014 && Math.abs(n[1]) > .5) mixc(c, [.1, .08, .06], 1 - d / .014); else if (d < .03 && Math.abs(n[1]) > .5) mixc(c, [.42, .22, .12], .5 * (1 - d / .03)); }
        if (brk) { const e = (p[0] * brk) - (L / 2 - .2); if (e > 0) mixc(c, [.72, .62, .46], clamp(e * 3, 0, .6)); }
        if (o.crack && Math.abs(p[2] - ze) < .006 && p[0] * (brk || 1) > L / 2 - .7) mixc(c, [.08, .06, .05], .8);
      },
      mask: (p, n) => Math.max(sm(L / 2 - .3, L / 2, Math.abs(p[0])) * .85, sm(.6, 1, Math.max(Math.abs(p[2]) / (W / 2), Math.abs(p[1]) / (T / 2))) * .55) * (n[1] < -.5 ? .5 : 1) + (n3(p[0] * 3 + seed, p[2] * 9, 4) - .5) * .25
    });
    const jag = p => {
      let dx = 0, dy = 0, dz = 0;
      if (brk) { const e = p[0] * brk - (L / 2 - .16); if (e > 0) { const k = e / .16, ns = n3(p[2] * 11 + seed * 5, p[1] * 40, 2) ; dx = -brk * k * k * (.025 + .15 * Math.pow(ns, 1.6)); dz = (n3(p[0] * 20, p[2] * 6, seed) - .5) * .02 * k; } }
      if (o.crack) { const e = p[0] * (brk || 1) - (L / 2 - .7); if (e > 0) dy = (p[2] > ze ? 1 : -1) * .0045 * sm(0, .3, e) * Math.min(1, Math.abs(p[2] - ze) * 30); }
      dy += (n3(p[0] * 1.6 + seed * 3, p[2] * 4, 7) - .5) * .008;
      return [dx, dy, dz];
    };
    B.use('M', sty).rbox(0, 0, 0, L, T, W, Math.min(.007, T * .3), [B.s(12, 3), 2, B.s(4, 2)], jag);
  }
  function nailHead(B, x, y, z, r, rust) { B.use('T', Sty({ b: rust ? [.42, .24, .14] : [.5, .45, .4], w: [.55, .5, .45], mask: () => .4, vr: .2 })).at(x, y, z, 0, 0, Math.PI / 2, 1, 1, 1, () => B.lathe(.012, B.s(7, 4), 1, t => r, [true, true])); }

  function plank(B, v, R) {
    const L = 1.9 + R() * .9, W = .17 + R() * .07, T = .04 + R() * .012, seed = R() * 100, side = R() < .5 ? 1 : -1, zc = (R() - .5) * W * .5;
    if (v === 0) board(B, L, W, T, seed, {});
    else if (v === 1) board(B, L, W, T, seed, { brk: side, crack: 1, zc });
    else if (v === 2) {
      const hx = [L / 2 - .12, -L / 2 + .12]; board(B, L, W, T, seed, { holes: hx });
      for (const x of hx) for (const z of [-W * .22, W * .22]) nailHead(B, x, T / 2 + .002, z, .008, true);
      B.use('T', Sty({ b: [.42, .24, .14], w: [.5, .4, .3], mask: () => .5 })).at(L / 2 - .3, T / 2 + .02, W * .15, 0, .3, .5, 1, 1, 1, () => B.lathe(.07, B.s(6, 4), 2, t => .005 * (1 - .6 * t), [false, true]));
    } else if (v === 3) {
      const l = L * .62, nb = 3, gap = .012, wb = W * .95; seed;
      for (let i = 0; i < nb; i++) B.at(0, 0, (i - 1) * (wb + gap), 0, 0, 0, 1, 1, 1, () => board(B, l * (i === 2 ? .8 : 1), wb, T, seed + i * 3.1, { brk: i === 1 ? side : 0 }));
      for (const x of [-l * .3, l * .3]) {
        B.use('M', Sty({ b: [.38, .3, .22], w: SILVER, seed, gr: 1, mask: () => .5 })).rbox(x, T / 2 + .016, 0, .06, .03, (wb + gap) * 3 + .05, .005, [2, 1, B.s(6, 2)]);
        for (const z of [-(wb + gap), 0, wb + gap]) nailHead(B, x, T / 2 + .033, z, .008, true);
      }
    } else board(B, L, W, T, seed, { paint: 1 });
  }

  function log(B, v, R) {
    const L = 1.8 + R() * 1.7, r0 = .09 + R() * .07, tp = .1 + R() * .2, seed = R() * 100, nA = B.s(14, 6), nT = B.s(14, 4);
    const bark = [.28, .21, .15];
    const sty = Sty({
      b: bark, w: [.66, .62, .56], seed, gr: 1, vr: .18, f: [2, 8, 8],
      mask: (p, n) => { const a = Math.atan2(p[2], p[1]); return clamp(sm(.35, .65, n3(Math.cos(a) * 1.6 + seed, Math.sin(a) * 1.6, p[0] * 2.4)) * 1.1 + sm(L / 2 - .3, L / 2, Math.abs(p[0])) * .5, 0, 1) * (p[1] < -r0 * .3 ? .4 : 1); }
    });
    const ring = Sty({ b: [.56, .44, .30], w: [.7, .6, .45], mask: () => 0, fn: (p, n, u, vv, c) => { const d = Math.hypot(p[1], p[2]); mixc(c, [.38, .27, .18], .5 + .5 * Math.sin(d * 70)); }, vr: .06 });
    const rad = (t, a) => r0 * (1 - tp * (t - .5)) * (1 + .09 * (n3(t * 3 + seed, 1, 1) - .5) * 2 + .06 * (n3(Math.cos(a) * 1.3 + seed, Math.sin(a) * 1.3, t * 4) - .5) * 2);
    B.use('M', sty).lathe(L, nA, nT, rad, [true, true], sty, ring);
    const nst = v === 2 ? 5 : v === 0 ? 1 : 2;
    for (let i = 0; i < nst + 2; i++) {
      const t = .12 + R() * .76, a = R() * TAU, ln = .1 + R() * .2, sr = .028 + R() * .018, ok = i < nst;
      if (!ok) continue; const px = (t - .5) * L, rr = rad(t, a);
      B.at(px, Math.cos(a) * rr * .85, Math.sin(a) * rr * .85, a, 0, 0, 1, 1, 1, () => B.at(0, 0, 0, 0, 0, Math.PI / 2, 1, 1, 1, () => B.lathe(ln, B.s(7, 4), 2, tt => sr * (1.15 - .35 * tt), [false, true], sty, ring)));
    }
    if (v === 1) {
      const l2 = L * (.4 + R() * .25), a2 = .55 + R() * .3;
      B.at(L * .12 + Math.cos(a2) * l2 / 2, r0 * .5 + Math.sin(a2) * l2 / 2, 0, 0, 0, a2, 1, 1, 1, () => B.lathe(l2, B.s(10, 5), B.s(10, 3), (t, a) => r0 * .62 * (1 - .45 * t) * (1 + .08 * (n3(t * 4 + seed, a, 2) - .5)), [false, true], sty, ring));
    }
    if (v === 3) {
      const soil = Sty({ b: [.26, .2, .15], w: [.4, .33, .25], mask: () => .4, vr: .3, f: [18, 18, 18], seed });
      B.at(L / 2 + r0 * .5, 0, 0, 0, 0, 0, 1, 1, 1, () => B.use('M', soil).ell(r0 * 1.5, r0 * 1.3, r0 * 1.4, B.s(14, 6), B.s(10, 4), (p) => { const k = n3(p[0] * 7 + seed, p[1] * 7, p[2] * 7) - .5; return [k * .08, k * .08, k * .08]; }, soil));
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU + R() * .4, ln = .25 + R() * .3, c0 = Math.cos(a), s0 = Math.sin(a), bend = (R() - .3) * .2;
        B.use('M', sty).at(L / 2 + r0 * .9, 0, 0, 0, 0, 0, 1, 1, 1, () => B.tube(5, B.s(8, 4), s => { const q = s * ln; return [q * .9 + bend * s * s, c0 * q * .6 * (1 + s), s0 * q * .6 * (1 + s)]; }, s => .028 * (1 - .8 * s) + .004, sty, [0, 1, 0.2]));
      }
    }
  }

  function corkBody(B, r, len, seed, nA, nT) {
    const sty = Sty({ b: [.72, .55, .35], w: [.34, .24, .15], seed, vr: .34, f: [90, 90, 90], mask: (p, n) => sm(.9, 1, Math.abs(p[0]) / (len / 2)) * .8 });
    B.use('M', sty).lathe(len, nA, nT, t => r * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 7)), .4) * (1 + .025 * Math.sin(t * 13 + seed)), [true, true], sty);
    return sty;
  }
  const ROPE = [.66, .55, .36];
  function ropeSty(seed, col) { return Sty({ b: col || ROPE, w: [.78, .72, .58], seed, vr: .12, gr: 0, mask: () => .25, fn: (p, n, u, v, c) => { const f = .5 + .5 * Math.sin(u * TAU * 2 + v * 180); c[0] *= .8 + .3 * f; c[1] *= .8 + .3 * f; c[2] *= .8 + .3 * f; } }); }
  function ringTube(B, cx, cy, cz, r, tr, plane, sty) { /* a loop; plane 'yz','xy','xz' */
    B.use('M', sty).tube(4, B.s(14, 6), s => { const a = s * TAU, c = Math.cos(a) * r, d = Math.sin(a) * r; return plane === 'yz' ? [cx, cy + c, cz + d] : plane === 'xy' ? [cx + c, cy + d, cz] : [cx + c, cy, cz + d]; }, () => tr, sty, plane === 'xy' ? [0, 0, 1] : plane === 'xz' ? [0, 1, 0] : [1, 0, 0]); return B;
  }
  function cork(B, v, R) {
    const r = .05 + R() * .02, len = .16 + R() * .05, seed = R() * 100, nA = B.s(14, 6), nT = B.s(8, 3), rs = ropeSty(seed);
    if (v === 0) { corkBody(B, r, len, seed, nA, nT); ringTube(B, len / 2 + .005, 0, 0, .022, .005, 'yz', rs); }
    else if (v === 1) {
      const d = .42 + R() * .15; B.at(-d / 2, 0, 0, 0, 0, 0, 1, 1, 1, () => { corkBody(B, r, len, seed, nA, nT); ringTube(B, len / 2 + .004, 0, 0, .02, .005, 'yz', rs); });
      B.at(d / 2, 0, .01, 0, .3, 0, 1, 1, 1, () => { corkBody(B, r, len, seed + 3, nA, nT); ringTube(B, -len / 2 - .004, 0, 0, .02, .005, 'yz', rs); });
      B.use('M', rs).tube(5, B.s(16, 6), s => [lerp(-d / 2 + len / 2 + .02, d / 2 - len / 2 - .02, s), -.07 * Math.sin(Math.PI * s) * 0 + .012 * Math.sin(Math.PI * s), .004 + .02 * Math.sin(Math.PI * s * 2)], () => .006, rs);
    } else {
      const offs = [[0, .06], [0, -.06], [.05, 0], [-.05, 0]];
      offs.forEach((o, i) => B.at(0, o[0] * .9, o[1], 0, 0, 0, 1, 1, 1, () => corkBody(B, r * .9, len * (.9 + .1 * hash(i, seed | 0)), seed + i, nA, nT)));
      for (const x of [-len * .22, len * .22]) B.use('M', rs).tube(5, B.s(16, 8), s => { const a = s * TAU; return [x + .014 * Math.sin(s * 6.28 * 2), Math.cos(a) * .115 + 0, Math.sin(a) * .115]; }, () => .006, rs, [1, 0, 0]);
    }
  }

  function gfloat(B, v, R) {
    const r = .1 + R() * .06, seed = R() * 100, nA = B.s(18, 8), nT = B.s(12, 5), net = v === 1 || v === 2;
    const cols = [[.18, .46, .28], [.2, .55, .5], [.2, .34, .62], [.62, .38, .13]], rs = ropeSty(seed, v === 2 ? [.72, .66, .5] : [.62, .52, .34]);
    const gs = Sty({ b: cols[v], w: [.7, .8, .78], seed, vr: .06, mask: (p, n) => sm(.8, 1, Math.abs(p[1]) / r) * .5, f: [8, 8, 8] });
    B.use('G', gs).ell(r, r * .96, r, nA, nT, null, gs);
    B.use('G', gs).at(0, r * .96, 0, 0, 0, 0, 1, 1, 1, () => B.lathe(.03, B.s(10, 5), 2, t => .022 * (1 - .3 * t), [false, true], gs).at(0, 0, 0, 0, 0, 0, 1, 1, 1, () => { }));
    if (net) {
      const nc = B.s(7, 3);
      for (let f = 0; f < 2; f++) for (let k = 0; k < nc; k++) {
        const ph = k / nc * TAU + (f ? .3 : 0), dir = f ? -1 : 1;
        B.use('M', rs).tube(3, B.s(22, 8), s => { const th = Math.PI * (.05 + .9 * s), a = ph + dir * TAU * .42 * s * 1.0; return [(r + .004) * Math.sin(th) * Math.cos(a), (r * .96 + .004) * Math.cos(th), (r + .004) * Math.sin(th) * Math.sin(a)]; }, () => .0042, rs, [0, 1, 0]);
      }
      ringTube(B, 0, r * .96 + .05, 0, .035, .008, 'xy', rs);
      B.use('M', rs).tube(4, B.s(8, 4), s => { const a = s * 2; return [0, r * .96 + .01 + s * .03, 0]; }, () => .009, rs);
      if (v === 2) B.use('M', rs).tube(4, B.s(14, 6), s => [s * .35, r * .96 + .06 - s * (r + .04), .02 * Math.sin(s * 9) + .05 * s], () => .006, rs);
    } else if (v === 0) {
      B.use('G', gs).ell(.018, .008, .018, B.s(8, 4), B.s(5, 3), null, gs); /* seal nub marks the pour */
    }
  }

  function bottle(B, v, R) {
    const L = [.3, .2, .34][v] * (.9 + .2 * R()), r = [.04, .06, .035][v] * (.9 + .2 * R()), seed = R() * 100, nA = B.s(14, 6), nT = B.s(20, 8);
    const prof = [[[0, 0], [.02, .8], [.08, 1], [.55, 1], [.66, .72], [.74, .36], [.93, .33], [.96, .42], [1, .4]],
      [[0, 0], [.03, .8], [.1, 1], [.5, 1], [.68, .6], [.8, .26], [.93, .24], [.96, .3], [1, .28]], [[0, 0], [.02, .8], [.06, 1], [.4, 1], [.5, .8], [.58, .3], [.94, .26], [.97, .33], [1, .3]]][v];
    const pr = t => { for (let i = 1; i < prof.length; i++) if (t <= prof[i][0]) { const a = prof[i - 1], b = prof[i], k = (t - a[0]) / (b[0] - a[0] || 1); return lerp(a[1], b[1], k); } return 0; };
    const cols = [[.16, .38, .22], [.5, .62, .55], [.42, .28, .1]], gs = Sty({ b: cols[v], w: [.72, .8, .75], seed, vr: .05, mask: (p) => sm(.45, .5, Math.abs(p[0] / L)) * .35, f: [10, 10, 10] });
    B.use('G', gs).lathe(L, nA, nT, (t, a) => r * pr(t), [false, true], gs, Sty({ b: [.03, .03, .02], w: [.03, .03, .02], vr: 0 }));
    if (v !== 1) B.use('M', Sty({ b: [.7, .55, .36], w: [.4, .3, .2], vr: .3, f: [80, 80, 80], mask: () => .5 })).at(L / 2 + .003, 0, 0, 0, 0, 0, 1, 1, 1, () => B.lathe(.04, B.s(8, 4), 1, t => r * .35 * (.95 + .08 * t), [false, true]));
  }

  const PAINT = [[.40, .52, .36], [.78, .42, .16], null, [.38, .5, .56], [.62, .5, .3]];
  function crate(B, v, R) {
    const k = v === 4 ? .62 : 1, Lc = (.7 + R() * .08) * k, Hc = (.44 + R() * .04) * k, Wc = (.5 + R() * .05) * k, seed = R() * 100, st = .05 * k, sl = (Hc - 2 * st) / 3;
    const paint = PAINT[v], raw = [.5, .38, .26];
    const sty = Sty({
      b: paint || raw, w: [.58, .5, .4], seed, gr: 1, f: [14, 3, 12], vr: .1,
      fn: (p, n, u, vv, c) => { if (paint) { const fl = n3(p[0] * 9 + seed, p[1] * 9, p[2] * 9) + (1 - Math.abs(p[1]) / Hc * 2) * .0; if (fl > .74) mixc(c, raw, .9); } else { c[0] *= .95; } },
      mask: (p, n) => clamp((n3(p[0] * 7 + seed, p[1] * 7, p[2] * 7) - .35) * 1.6, 0, 1) * .8 + (p[1] < -Hc * .3 ? .0 : 0)
    });
    const dark = Sty({ b: [.06, .05, .04], w: [.1, .08, .06], vr: 0 });
    const miss = new Set(); let hang = false;
    if (v === 2) { miss.add('z1_0'); miss.add('z1_1'); miss.add('x1_1'); miss.add('t_1'); hang = true; }
    const sg = [B.s(2, 1), B.s(2, 1), B.s(2, 1)], s1 = [B.s(3, 1), 1, 1];
    const slat = (cx, cy, cz, sx, sy, sz, key, sd) => { if (miss.has(key)) return; B.use('M', sty).rbox(cx, cy, cz, sx, sy, sz, .006 * k, [Math.max(sg[0], Math.round(sx / .2)), sg[1], Math.max(sg[2], 1)], p => [0, (n3(p[0] * 4 + sd, 3, p[2] * 4) - .5) * .004, 0]); };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.use('M', sty).rbox(sx * (Lc / 2 - st / 2), 0, sz * (Wc / 2 - st / 2), st, Hc, st, .007 * k, [1, 2, 1]);
    for (let i = 0; i < 3; i++) {
      const y = -Hc / 2 + st + sl * (i + .5);
      for (const sz of [-1, 1]) slat(0, y, sz * (Wc / 2 - .01 * k), Lc - 2 * st, sl * .93, .02 * k, 'z' + (sz < 0 ? 0 : 1) + '_' + i, seed + i + sz);
      for (const sx of [-1, 1]) slat(sx * (Lc / 2 - .01 * k), y, 0, .02 * k, sl * .93, Wc - 2 * st, 'x' + (sx < 0 ? 0 : 1) + '_' + i, seed + i * 3 + sx);
    }
    slat(0, -Hc / 2 + .012 * k, 0, Lc - .02, .024 * k, Wc - .02, 'b', seed);
    const lid = () => { for (let i = 0; i < 4; i++) slat(0, 0, (i - 1.5) * (Wc / 4), Lc, .024 * k, Wc / 4 - .008 * k, 't_' + i, seed + i * 7); B.use('M', sty).rbox(0, -.026 * k, 0, .05 * k, .028 * k, Wc, .004, [1, 1, 1]); };
    if (v === 3) B.at(0, Hc / 2, -Wc / 2, 0, 0, .0, 1, 1, 1, () => B.at(0, 0, 0, -.9, 0, 0, 1, 1, 1, () => B.at(0, 0, Wc / 2, 0, 0, 0, 1, 1, 1, lid)));
    else B.at(0, Hc / 2 - .012 * k, 0, 0, 0, 0, 1, 1, 1, lid);
    if (v === 2 || v === 3) B.use('M', dark).rbox(0, -.02, 0, Lc - .06, Hc - .06, Wc - .06, .004, [1, 1, 1]);
    if (v === 2 && hang) B.use('M', sty).at(Lc * .2, -Hc * .1, Wc / 2 + .05, 0, 0, .9, 1, 1, 1, () => B.rbox(0, 0, 0, .32 * k, .02 * k, .05 * k, .004, [3, 1, 1], p => [(p[0] > 0.1 ? .0 : 0), 0, 0]));
    if (v === 1 || v === 3) {
      const mt = Sty({ b: [.34, .26, .2], w: [.55, .5, .46], vr: .15, f: [30, 30, 30], seed, mask: (p) => .45 + .4 * n3(p[0] * 30, p[1] * 30, p[2] * 30) });
      if (v === 1) for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        const cx = sx * (Lc / 2), cy = sy * (Hc / 2), cz = sz * (Wc / 2);
        B.use('T', mt).rbox(cx - sx * .04 * k, cy, cz, .1 * k, .012 * k, .1 * k, .003, [1, 1, 1]); B.use('T', mt).rbox(cx, cy - sy * .04 * k, cz, .012 * k, .1 * k, .1 * k, .003, [1, 1, 1]); B.use('T', mt).rbox(cx, cy, cz - sz * .04 * k, .1 * k, .1 * k, .012 * k, .003, [1, 1, 1]);
      } else for (const x of [-Lc * .3, Lc * .3]) B.use('T', mt).rbox(x, Hc / 2 - .01, -Wc / 2 - .008, .06, .012, .12, .003, [1, 1, 1]);
    }
    if (v === 4) { const rs = ropeSty(seed); B.use('M', rs).tube(4, B.s(14, 6), s => { const a = Math.PI * s; return [Math.cos(a) * .12 * (1), Hc / 2 + Math.sin(a) * .1, 0]; }, () => .008, rs, [0, 0, 1]); }
  }

  function barrel(B, v, R) {
    const L = .8 + R() * .1, r = .26 + R() * .03, seed = R() * 100, ns = 14, nA = B.s(28, 10), nT = B.s(12, 4);
    const wd = [[.46, .34, .22], [.4, .3, .2], [.52, .4, .26]][v], ring = [.32, .27, .24];
    const sty = Sty({ b: wd, w: SILVER, seed, gr: 1, f: [1.5, 12, 12], vr: .1, fn: (p, n, u, vv, c) => { const a = Math.atan2(p[2], p[1]) / TAU * ns; const st = Math.floor(a + 100); const sh = .86 + .2 * hash(st, 5); const e = Math.abs(a - Math.round(a - .5) - .5); c[0] *= sh; c[1] *= sh; c[2] *= sh; if (Math.abs((a % 1 + 1) % 1) < .03) { c[0] *= .5; c[1] *= .5; c[2] *= .5; } }, mask: (p) => sm(.84, 1, Math.abs(p[0]) / (L / 2)) * .8 + (n3(p[0] * 3 + seed, p[2] * 5, p[1] * 5) - .5) * .5 });
    const bulge = t => 1 - .13 * Math.pow(2 * t - 1, 2), cut = a => .78 + .2 * hash(Math.floor(a / TAU * ns), seed | 0);
    const dark = Sty({ b: [.08, .06, .05], w: [.1, .08, .06], vr: 0 });
    if (v === 1) {
      B.use('M', sty).surf(nA, nT, (u, vv) => { const a = u * TAU; let t = vv; const c = cut(a); if (t > c) t = c; return [(t - .5) * L, r * bulge(t) * Math.cos(a), r * bulge(t) * Math.sin(a)]; }, false, sty);
      B.use('M', sty).surf(nA, nT, (u, vv) => { const a = u * TAU; let t = vv; const c = cut(a); if (t > c) t = c; return [(t - .5) * L, (r * bulge(t) - .02) * Math.cos(a), (r * bulge(t) - .02) * Math.sin(a)]; }, true, sty);
      B.use('M', dark).at((.76 - .5) * L, 0, 0, 0, 0, 0, 1, 1, 1, () => B.lathe(.01, nA, 1, () => r * .88, [false, true], dark));
      B.use('M', sty).lathe(L, nA, 2, (t, a) => r * bulge(t), [true, false], sty, sty, [0, .02]);
    } else B.use('M', sty).lathe(L, nA, nT, (t, a) => r * bulge(t), [true, true], sty, sty);
    const hs = Sty({ b: v === 2 ? [.3, .42, .3] : [.32, .26, .22], w: [.55, .46, .38], vr: .12, f: [20, 20, 20], seed, mask: (p) => .35 + .5 * n3(p[0] * 20, p[1] * 20, p[2] * 20) });
    for (const t of (v === 1 ? [.1, .3, .62] : [.08, .26, .74, .92])) B.use('T', hs).at((t - .5) * L, 0, 0, 0, 0, 0, 1, 1, 1, () => B.lathe(.035, nA, 1, () => r * bulge(t) + .004, [false, false], hs));
    if (v === 2) B.use('M', Sty({ b: [.62, .5, .34], w: [.7, .6, .45], vr: .1, f: [30, 30, 30] })).at(0, r * bulge(.5) + .02, 0, 0, 0, 0, 1, 1, 1, () => B.lathe(.05, B.s(10, 5), 1, () => .028, [true, true]));
  }

  function pulley(B, v, R) {
    const seed = R() * 100, rs = .08 + R() * .015, n = v === 1 ? 2 : 1, ch = .36 * 0 + (v === 1 ? .3 : .2);
    const ms = Sty({ b: [.36, .24, .17], w: [.58, .54, .5], vr: .16, f: [25, 25, 25], seed, mask: (p, nn) => clamp(.25 + .6 * n3(p[0] * 20, p[1] * 20, p[2] * 20) + (Math.abs(nn[2]) > .8 ? 0 : .25), 0, 1) });
    for (const z of [-.027, .027]) B.use('T', ms).rbox(0, (v === 1 ? 0 : 0), z, .14, ch, .012, .004, [B.s(4, 2), B.s(6, 2), 1], p => { const e = p[1] / (ch / 2); return [0, 0, 0]; });
    for (let i = 0; i < n; i++) {
      const y = n === 2 ? (i - .5) * .12 : 0;
      B.use('T', ms).at(0, y, 0, 0, Math.PI / 2, 0, 1, 1, 1, () => B.lathe(.04, B.s(22, 8), B.s(10, 5), t => rs * (1 - .4 * Math.exp(-Math.pow((t - .5) / .16, 2))) , [true, true]));
      B.use('T', ms).at(0, y, 0, 0, Math.PI / 2, 0, 1, 1, 1, () => B.lathe(.075, B.s(8, 5), 1, () => .012, [true, true]));
      const rp = ropeSty(seed + i, [.5, .42, .28]);
      if (v !== 0 || true) B.use('M', rp).tube(4, B.s(14, 6), s => { const a = Math.PI * (s - .0) ; return [0, y + Math.cos(a) * (rs * .7), Math.sin(a) * 0]; }, () => .0, rp);
    }
    B.use('T', ms).at(0, ch / 2 + .022, 0, 0, 0, 0, 1, 1, 1, () => { ringTube(B, 0, 0, 0, .026, .008, 'yz', ms); });
    B.use('T', ms).at(0, ch / 2 + .008, 0, 0, 0, Math.PI / 2, 1, 1, 1, () => B.lathe(.03, B.s(8, 4), 1, () => .01, [false, false]));
    if (v === 2) { const rp = ropeSty(seed + 9); B.use('M', rp).tube(4, B.s(18, 8), s => [0, -ch / 2 - s * .45, .05 * Math.sin(s * 5) * 1 + .02], () => .01, rp); ringTube(B, 0, -ch / 2 - .02, 0, .028, .007, 'yz', ms); }
    if (v === 0) { const rp = ropeSty(seed + 4); B.use('M', rp).tube(4, B.s(14, 6), s => [0, -ch / 2 - s * .3, Math.sin(s * 3) * .02], () => .009, rp); }
  }

  function hinge(B, v, R) {
    const seed = R() * 100, ms = Sty({ b: [.34, .24, .18], w: [.6, .56, .52], vr: .16, f: [22, 22, 22], seed, mask: (p) => clamp(.3 + .7 * n3(p[0] * 18, p[1] * 18, p[2] * 18), 0, 1) });
    const leaf = (x0, len, w0, w1, th) => B.use('T', ms).rbox(x0 + len / 2, 0, 0, len, th, w0, .002, [B.s(8, 3), 1, B.s(3, 1)], p => { const k = (p[0] - x0) / len; return [0, 0, p[2] * (1 - (1 - w1 / w0) * clamp(k, 0, 1))]; });
    if (v === 0) { leaf(0, .26, .045, .028, .006); leaf(0, -.1, .045, .045, .006); }
    else if (v === 1) { leaf(0, .24, .045, .03, .006); B.at(0, 0, 0, 0, Math.PI / 2, 0, 1, 1, 1, () => leaf(0, .1, .045, .045, .006)); }
    else { B.use('T', ms).ell(.055, .004, .06, B.s(12, 6), B.s(6, 3), null, ms); B.at(-.11, 0, 0, 0, 0, 0, 1, 1, 1, () => B.use('T', ms).ell(.055, .004, .06, B.s(12, 6), B.s(6, 3), null, ms)); }
    /* the knuckle: three short barrels along Z */
    for (let i = 0; i < 3; i++) B.use('T', ms).at(0, .008, (i - 1) * .017, 0, 0, 0, 1, 1, 1, () => B.at(0, 0, 0, 0, Math.PI / 2, 0, 1, 1, 1, () => B.lathe(.015, B.s(10, 5), 1, () => .0105, [false, false], ms)));
    B.use('T', ms).at(0, .008, 0, 0, Math.PI / 2, 0, 1, 1, 1, () => B.lathe(.06, B.s(8, 4), 1, () => .0055, [true, true], ms));
    const xs = v === 2 ? [-.14, .0, -.07] : [.07, .15, .22, -.06];
    for (const x of xs.slice(0, v === 2 ? 2 : 3)) nailHead(B, x, .004, 0, .007, true);
  }

  function kelp(B, v, R) {
    const seed = R() * 100, nb = [1, 3, 2, 3][v], Lk = 1.0 + R() * .7, nu = B.s(4, 2), nv = B.s(22, 8);
    const sty = Sty({ b: [.34, .32, .1], w: [.7, .5, .2], seed, vr: .16, f: [4, 4, 4], mask: (p, n, u, vv) => sm(.55, 1, vv) * .9, fn: (p, n, u, vv, c) => mixc(c, [.58, .38, .12], sm(.4, 1, vv) * .6) });
    const stem = Sty({ b: [.2, .17, .08], w: [.35, .28, .16], vr: .1, seed });
    for (let b = 0; b < nb; b++) {
      const ang = (b - (nb - 1) / 2) * .38 + (R() - .5) * .15, ph = R() * 6, Lb = Lk * (.7 + .5 * R()), wv = v === 3 ? 60 : 24, wm = .05 + .03 * R();
      B.at(0, 0, 0, 0, ang, 0, 1, 1, 1, () => {
        B.use('M', sty).surf(nu, nv, (u, v0) => {
          const vv = clamp(v0, 0, 1), x = vv * Lb, w = wm * Math.pow(Math.sin(Math.PI * (.12 + .88 * vv)), .6) * (1 + (v === 3 ? .35 : .15) * Math.sin(vv * wv + ph)), tw = vv * 1.5 + ph;
          return [x, .004 + .012 * Math.sin(vv * 9 + ph) * vv, .06 * Math.sin(vv * 7 + ph) * vv + (u * 2 - 1) * w * Math.cos(tw), (u * 2 - 1) * w * Math.sin(tw) * .6 + 0].slice(0, 3).map((q, i) => i === 1 ? q + (u * 2 - 1) * w * Math.sin(tw) * .6 : q);
        }, false, sty);
        if (v === 2) for (let i = 0; i < 4; i++) B.use('M', stem).at(Lb * (.1 + .12 * i), .018, 0, 0, 0, 0, 1, 1, 1, () => B.ell(.016, .02, .016, B.s(8, 4), B.s(6, 3), null, Sty({ b: [.45, .4, .12], w: [.7, .55, .2], mask: () => .3, vr: .12 })));
      });
    }
    B.use('M', stem).tube(5, B.s(10, 4), s => [-s * .08 + .02, .004, 0], s => .012 * (1 + .6 * (1 - s)), stem);
  }

  function shell(B, v, R) {
    const seed = R() * 100, cr = [[.92, .86, .76], [.9, .78, .72], [.78, .8, .82], [.2, .22, .34], [.78, .74, .66]][v], pk = [.86, .55, .52], Rr = [.07, .045, .05, .06, .05][v] * (.9 + .25 * R());
    const sty = Sty({ b: cr, w: [.9, .88, .82], seed, vr: .08, f: [30, 30, 30], mask: () => .15, fn: (p, n, u, vv, c) => { const rb = .5 + .5 * Math.sin(u * TAU * (v === 0 ? 9 : 8)); if (v === 0 || v === 1) mixc(c, pk, rb * .25 * vv); if (v === 3) mixc(c, [.1, .1, .22], .5 * rb); } });
    if (v === 0) {
      B.use('M', sty).surf(B.s(18, 8), B.s(8, 3), (u, vv) => { const a = (u - .5) * 2 * 1.0, rr = Rr * vv, ribs = .0035 * Math.sin(a * 22) * vv; return [rr * Math.sin(a), Rr * .45 * vv * vv * (1 - .2 * a * a) + ribs, rr * Math.cos(a) - Rr * .3]; }, false, sty);
      B.use('M', sty).ell(.012, .008, .01, B.s(6, 4), B.s(4, 3), null, sty);
    } else if (v === 1) B.use('M', sty).ell(Rr, Rr * .8, Rr * .9, B.s(20, 8), B.s(8, 4), p => { const a = Math.atan2(p[2], p[0]), k = .1 * Math.sin(a * 16); return [p[0] * k, 0, p[2] * k]; }, sty, [0, .5]);
    else if (v === 2) B.use('M', sty).tube(B.s(8, 4), B.s(32, 12), s => { const an = s * TAU * 3.4, cr0 = Rr * (.12 + .88 * s); return [cr0 * Math.cos(an), (1 - s) * Rr * 1.4, cr0 * Math.sin(an)]; }, s => Rr * (.12 + .5 * s) * (1 + .04 * Math.sin(s * 200)), sty, [0, 1, 0]);
    else if (v === 3) { for (const sg of [-1, 1]) B.at(0, .01 * sg + .02, sg * .006, 0, 0, sg * .2, 1, 1, 1, () => B.use('M', sty).ell(Rr * 1.3, Rr * .3, Rr * .75, B.s(14, 6), B.s(8, 4), null, sty)); }
    else B.use('M', sty).ell(Rr, Rr * .7, Rr, B.s(14, 6), B.s(8, 4), p => [0, 0, 0], sty, [0, .5]);
  }

  function rope(B, v, R) {
    const seed = R() * 100, rs = ropeSty(seed, [[.62, .5, .32], [.55, .47, .34], [.7, .6, .38]][v]), nA = 4, nS = B.s(90, 30);
    if (v === 0) { const rr = .11 + R() * .04, tn = 3.2 + R() * .8; B.use('M', rs).tube(nA, nS, s => { const a = s * TAU * tn, r = rr * (1 - .1 * s) * (1 + .04 * Math.sin(s * 40)); return [r * Math.cos(a), .014 + s * .045, r * Math.sin(a)]; }, () => .0125, rs); B.use('M', rs).tube(nA, B.s(24, 8), s => [rr * .9 + s * .5, .014 + .045, .01 * Math.sin(s * 7) + s * .1], () => .0115, rs); }
    else if (v === 1) { const rr = .22 + R() * .06; B.use('M', rs).tube(nA, nS, s => { const a = s * TAU * 3, k = Math.sin(a * 2 / 3 * 0 + s * 6.28 * 1.5); return [rr * Math.sin(a * .5 * 2) * 1.2, .012 + .008 * Math.sin(a), rr * .55 * Math.sin(a)]; }, () => .012, rs); }
    else { const w = 1.0; B.use('M', rs).tube(nA, nS, s => { const ph = s * TAU * 3, cz = Math.cos(ph), sy = Math.sin(ph); return [-.06 + .12 * s, .05 * sy * (Math.abs(sy) > .3 ? 1 : 1), w / 2 * Math.sign(cz) * Math.pow(Math.abs(cz), .25)]; }, () => .012, rs, [0, 1, 0]); B.use('M', rs).tube(nA, B.s(14, 5), s => [.07 + s * .12, .05 - s * .06, w / 2 - s * .03], () => .011, rs); }
  }

  function pebble(B, v, R) {
    const seed = R() * 100, rx = .04 + R() * .05, cols = [[.5, .5, .5], [.55, .44, .36], [.62, .6, .55], [.38, .4, .44]][v];
    const sty = Sty({ b: cols, w: [.72, .7, .66], seed, vr: .2, f: [14, 14, 14], mask: () => .2, fn: (p, n, u, vv, c) => { const st = n3(p[0] * 20 + p[1] * 40 + seed, p[2] * 9, 3); if (st > .78) mixc(c, [.88, .86, .82], .8); } });
    B.use('M', sty).ell(rx, rx * (.45 + .2 * R()), rx * (.7 + .3 * R()), B.s(12, 6), B.s(8, 4), p => { const k = (n3(p[0] * 30 + seed, p[1] * 30, p[2] * 30) - .5) * .012; return [k, k, k]; }, sty);
  }

  function net(B, v, R) {
    const seed = R() * 100, rs = ropeSty(seed, [.55, .5, .34]);
    for (let i = 0; i < B.s(12, 5); i++) {
      const a = R() * TAU, r = .08 + R() * .22, ax = R() * 6, cx = (R() - .5) * .3, cz = (R() - .5) * .3;
      B.use('M', rs).tube(3, B.s(18, 6), s => { const q = s * TAU * (.5 + .4 * hash(i, 5)); return [cx + r * Math.cos(q + a) * (1 + .3 * Math.sin(ax + s * 3)), .02 + .03 * Math.sin(q * 2 + ax), cz + r * .8 * Math.sin(q + a)]; }, () => .006, rs);
    }
    if (v === 0) for (const o of [[.15, .12], [-.2, -.05], [.02, -.22]]) B.at(o[0], .03, o[1], 0, R() * 3, 0, 1, 1, 1, () => corkBody(B, .04, .13, seed + o[0], B.s(10, 5), B.s(6, 3)));
  }

  const BUILD = { plank, log, cork, gfloat, bottle, crate, barrel, pulley, hinge, kelp, shell, rope, pebble, net };

  /* 3. the kit: geometry per (kind, variant, lod), built on demand and cached. seed regenerates every variant's proportions. */
  function makeKit(THREE, opts) {
    opts = opts || {}; const seed = opts.seed === undefined ? 11 : opts.seed, cache = {};
    function get(kind, variant, lod) {
      const key = kind + ':' + variant + ':' + lod; if (cache[key]) return cache[key];
      const K = KIND[kind], B = new Builder(THREE, lod), R = rng((K.idx + 1) * 7919 + variant * 104729 + seed * 31);
      BUILD[kind](B, variant, R); const g = B.geometry(), tris = {}; let tot = 0;
      for (const m in g) { tris[m] = g[m].index.count / 3; tot += tris[m]; }
      let rad = 0; for (const m in g) { const bs = g[m].boundingSphere; rad = Math.max(rad, bs.center.length() + bs.radius); }
      return cache[key] = { geo: g, tris, total: tot, rad };
    }
    function stats(lod) { const out = []; for (const K of KINDS) for (let v = 0; v < K.nV; v++) { const a = get(K.id, v, lod || 0); out.push({ kind: K.id, variant: v, tris: a.total, radius: a.rad }); } return out; }
    return { THREE, seed, get, stats, KINDS, KIND };
  }

  /* 4. the shared materials. The extra attributes and the grain are added to the stock Lambert and Phong programs. */
  function patch(mat, o) {
    mat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aWorn;attribute float aGr;attribute vec4 aVar;varying vec3 vCol;varying vec4 vV;varying vec3 vLoc;varying vec3 vWld;varying float vGr;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCol=mix(color,aWorn.rgb,aWorn.a*aVar.x);\n#ifdef USE_INSTANCING_COLOR\nvCol*=instanceColor.xyz;\n#endif\nvV=aVar;vLoc=position;vGr=aGr;\n#ifdef USE_INSTANCING\nvWld=(modelMatrix*instanceMatrix*vec4(transformed,1.0)).xyz;\n#else\nvWld=(modelMatrix*vec4(transformed,1.0)).xyz;\n#endif');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCol;varying vec4 vV;varying vec3 vLoc;varying vec3 vWld;varying float vGr;\nfloat sh31(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}\nfloat svn(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);return mix(mix(mix(sh31(i),sh31(i+vec3(1,0,0)),f.x),mix(sh31(i+vec3(0,1,0)),sh31(i+vec3(1,1,0)),f.x),f.y),mix(mix(sh31(i+vec3(0,0,1)),sh31(i+vec3(1,0,1)),f.x),mix(sh31(i+vec3(0,1,1)),sh31(i+vec3(1,1,1)),f.x),f.y),f.z);}')
        .replace('#include <color_fragment>', 'float gq=svn(vLoc*vec3(2.5,34.0,34.0)+vV.z*47.3)*0.6+svn(vLoc*vec3(6.0,90.0,90.0)+vV.z*13.1)*0.4;float mcn=svn(vec3(vWld.xz*0.02,0.5));\ndiffuseColor.rgb*=vCol*(1.0-vGr*0.42*(gq-0.4))*(vec3(0.9,0.93,0.96)+vec3(0.2,0.14,0.08)*mcn)*(1.0-0.34*vV.y);');
    };
    return mat;
  }
  function makeMaterials(THREE) {
    const M = patch(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })), T = patch(new THREE.MeshPhongMaterial({ vertexColors: true, side: THREE.DoubleSide, specular: 0x6a6258, shininess: 38 })),
      G = patch(new THREE.MeshPhongMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: .62, specular: 0xffffff, shininess: 110, depthWrite: false }));
    M.customProgramCacheKey = () => 'salvM'; T.customProgramCacheKey = () => 'salvT'; G.customProgramCacheKey = () => 'salvG';
    return { M, T, G };
  }

  /* 5. instance buckets: one InstancedMesh per (kind, variant, lod, material). begin() clears the counts, add() writes one instance, end() uploads. caps = capacity per kind. */
  function InstSet(kit, mats, parent, caps) {
    this.kit = kit; this.mats = mats; this.parent = parent; this.caps = caps; this.b = {}; this.list = []; this.group = new kit.THREE.Group(); this.group.frustumCulled = false; parent.add(this.group);
  }
  InstSet.prototype.bucket = function (kind, variant, lod, mat) {
    const key = kind + ':' + variant + ':' + lod + ':' + mat; let b = this.b[key]; if (b) return b; const T = this.kit.THREE, a = this.kit.get(kind, variant, lod), base = a.geo[mat]; if (!base) return null;
    const cap = Math.max(1, this.caps[kind] || 16), g = base.clone(); g.setAttribute('aVar', new T.InstancedBufferAttribute(new Float32Array(cap * 4), 4));
    const m = new T.InstancedMesh(g, this.mats[mat], cap); m.count = 0; m.frustumCulled = false; m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    m.renderOrder = mat === 'G' ? 3 : 0; this.group.add(m); b = this.b[key] = { m, cap, n: 0, mat, kind, variant, lod, av: g.attributes.aVar.array, ic: m.instanceColor.array, tris: base.index.count / 3 }; this.list.push(b); return b;
  };
  InstSet.prototype.begin = function () { for (const b of this.list) b.n = 0; };
  /* e = the 16 matrix elements; wear, wet, gp, tint [r,g,b] */
  InstSet.prototype.add = function (kind, variant, lod, e, wear, wet, gp, tr, tg, tb) {
    const K = KIND[kind], kit = this.kit.get(kind, variant, lod);
    for (const mat in kit.geo) {
      const b = this.bucket(kind, variant, lod, mat); if (!b || b.n >= b.cap) continue; const i = b.n++, me = b.m.instanceMatrix.array;
      for (let k = 0; k < 16; k++) me[i * 16 + k] = e[k]; b.av[i * 4] = wear; b.av[i * 4 + 1] = wet; b.av[i * 4 + 2] = gp; b.av[i * 4 + 3] = 0; b.ic[i * 3] = tr; b.ic[i * 3 + 1] = tg; b.ic[i * 3 + 2] = tb;
    }
  };
  InstSet.prototype.end = function () {
    let calls = 0, tris = 0; for (const b of this.list) { b.m.count = b.n; b.m.visible = b.n > 0; if (b.n) { b.m.instanceMatrix.needsUpdate = true; b.m.geometry.attributes.aVar.needsUpdate = true; b.m.instanceColor.needsUpdate = true; calls++; tris += b.n * b.tris; } }
    return { calls, tris };
  };
  InstSet.prototype.dispose = function () { for (const b of this.list) { this.group.remove(b.m); b.m.geometry.dispose(); if (b.m.dispose) b.m.dispose(); } this.b = {}; this.list = []; this.parent.remove(this.group); };

  /* 6. the per-instance variation (shared by the kit board and the sea). raw = seeded numbers 0..1 from an id; V = the repetition control (0 all the same, 1 full variation) */
  const ORIGIN = [[1, 1, 1], [.92, .97, 1.08], [1.1, 1.05, .9], [.96, .8, .72]];
  function rawFor(id) { return { u0: hash(id, 1), sc: hash(id, 2), st: hash(id, 3), tint: hash(id, 4), tint2: hash(id, 5), wear: hash(id, 6), gp: hash(id, 7), tilt: hash(id, 8), tilt2: hash(id, 9), ph: hash(id, 10), org: hash(id, 11) }; }
  function derive(kind, raw, V, out, origin) {
    const K = KIND[kind]; out = out || {}; V = clamp(V, 0, 1);
    out.variant = Math.min(K.nV - 1, Math.floor(raw.u0 * (1 + (K.nV - 1) * V + (V >= .999 ? .999 : 0))));
    out.sx = 1 + (Math.exp((raw.sc - .5) * .7) - 1) * V; out.sx *= K.len ? 1 + (raw.st - .5) * .5 * V : 1; out.sy = 1 + (Math.exp((raw.sc - .5) * .7) - 1) * V * (.8 + .4 * raw.st); out.sz = out.sy;
    const v = 1 + (raw.tint - .5) * .34 * V, d = (raw.tint2 - .5) * .24 * V, o = ORIGIN[origin | 0] || ORIGIN[0], om = V;
    out.tr = (v + d) * lerp(1, o[0], om); out.tg = v * lerp(1, o[1], om); out.tb = (v - d) * lerp(1, o[2], om);
    out.wear = lerp(.38, .1 + .9 * raw.wear, V); out.gp = lerp(.37, raw.gp, V); out.rtilt = (raw.tilt - .5) * 2 * V; out.rtilt2 = (raw.tilt2 - .5) * 2 * V; out.ph = lerp(0, raw.ph, V);
    return out;
  }

  /* 7. the kit board: every variant in a labelled grid, in its own scene. The board shows `copies` instances of each variant so the repetition control is visible. */
  function makeBoard(kit, mats, opts) {
    const T = kit.THREE; opts = opts || {}; const scene = new T.Scene(); scene.background = new T.Color(.74, .72, .67);
    const hemi = new T.HemisphereLight(0xdfe8f0, 0x6a5e4e, .62), sun = new T.DirectionalLight(0xfff0d8, .85); sun.position.set(-6, 10, 5); scene.add(hemi, sun);
    const floor = new T.Mesh(new T.PlaneGeometry(60, 40), new T.MeshLambertMaterial({ color: 0x9a9384 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -.01; scene.add(floor);
    const camera = new T.PerspectiveCamera(34, 1, .1, 200), cells = [], labels = []; let set = null, V = opts.variation === undefined ? 1 : opts.variation, size = 1;
    const cols = opts.cols || 10; let n = 0; for (const K of KINDS) if (!opts.kinds || opts.kinds.indexOf(K.id) >= 0) for (let v = 0; v < K.nV; v++) cells.push({ kind: K.id, variant: v, i: n++ });
    const rows = Math.ceil(cells.length / cols), cw = 2.0, ch = 2.0, extra = opts.kinds ? 0 : 2;
    cells.forEach(c => { c.x = (c.i % cols - (cols - 1) / 2) * cw; c.z = (Math.floor(c.i / cols) - (rows + extra - 1) / 2) * ch; });
    const demo = opts.kinds ? [] : [['plank', 0], ['crate', 0]];
    demo.forEach((d, r) => { for (let i = 0; i < cols; i++) cells.push({ kind: d[0], variant: 0, demo: i + 1, x: (i - (cols - 1) / 2) * cw, z: (rows + r - (rows + extra - 1) / 2) * ch, raw: rawFor(500 + r * 30 + i) }); });
    function dispScale(c) { const a = kit.get(c.kind, c.variant, 0); return clamp(.66 / Math.max(a.rad, .05), .3, 5); }
    function layout() {
      if (set) set.dispose(); const caps = {}; for (const K of KINDS) caps[K.id] = cells.length; set = new InstSet(kit, mats, scene, caps); set.begin();
      const q = new T.Quaternion(), p = new T.Vector3(), s = new T.Vector3(), m = new T.Matrix4(), o = {};
      for (const c of cells) {
        const K = KIND[c.kind], raw = c.raw || rawFor(900 + K.idx * 20 + c.variant), d = derive(c.kind, raw, c.demo ? V : 0, o, c.demo ? raw.org * 4 | 0 : 0), v = c.demo ? d.variant : c.variant, ds = dispScale(c) * (c.demo ? 1 : 1);
        if (!c.demo) { d.sx = d.sy = d.sz = 1; d.tr = d.tg = d.tb = 1; d.wear = .55; d.gp = .4; d.rtilt = 0; d.rtilt2 = 0; }
        c.d = d.sx; q.setFromEuler(new T.Euler(0, (c.demo ? (raw.tilt2 - .5) * 2 * V * .7 : -.5) + (c.demo ? 0 : 0), c.demo ? d.rtilt * .12 : 0, 'YZX'));
        p.set(c.x, K.h * ds * (.5 - K.float * 0) * .0 + K.h * ds * .5 * (K.float === 0 ? 1 : 1), c.z); s.set(ds * d.sx, ds * d.sy, ds * d.sz); m.compose(p, q, s);
        set.add(c.kind, c.demo ? (c.demo ? v : 0) : c.variant, 0, m.elements, d.wear, 0, d.gp, d.tr, d.tg, d.tb);
      }
      const st = set.end(); board.last = st; board.tris = st.tris; board.calls = st.calls;
    }
    function setVariation(v) { V = clamp(v, 0, 1); layout(); }
    function resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); frame(); }
    function frame() { const R = 13 / Math.max(.6, size); const k = opts.kinds ? Math.max(.3, 2.3 / Math.max(opts.cols || 10, rows) * (opts.cols ? 1 : 1)) : 1; camera.position.set(0, 17 * k / size, 14.5 * k / size); camera.lookAt(0, 0, opts.kinds ? 0 : 1.0); camera.updateMatrixWorld(); }
    function project(labelsEl) {
      const need = cells.length; while (labels.length < need) { const d = document.createElement('div'); d.className = 'kbl'; labelsEl.appendChild(d); labels.push(d); }
      const w = labelsEl.clientWidth, h = labelsEl.clientHeight, v = new T.Vector3();
      cells.forEach((c, i) => { v.set(c.x, 0, c.z + ch * .42).project(camera); const L = labels[i]; L.style.display = 'block'; L.style.left = ((v.x * .5 + .5) * w) + 'px'; L.style.top = ((-v.y * .5 + .5) * h) + 'px'; L.textContent = c.demo ? (c.kind + ' 0 copy ' + c.demo) : (KIND[c.kind].name + ' ' + (c.variant + 1)); });
    }
    const board = { scene, camera, cells, resize, setVariation, project, layout, kit, labels, zoom: k => { size = clamp(size * k, .5, 3); frame(); }, tris: 0, calls: 0, getVariation: () => V };
    frame(); layout(); return board;
  }

  root.LI_SALVAGE = { KINDS, KIND, makeKit, makeMaterials, InstSet, makeBoard, rawFor, derive, ORIGIN, hash, rng, n3, clamp, lerp, sm, BUILD };
}(typeof window !== 'undefined' ? window : globalThis));
