/* Rubble: the ground for the physics. Works in the browser (global RTerrain) and in Node (module.exports).
   It turns the island's own height, shore and vegetation arrays (landform world seed 9001, 2 m cells) into:
     1. a fine height grid (0.5 m) for the physics heightfield AND for the drawn mesh (one source, so what you see is what the bodies touch),
     2. a ground type per 2 m cell: sand, wet sand, shingle, turf, rock, each with friction, bounce and rolling resistance.
   The island's own grid is very smooth (no gullies, no cobbles). So this file also adds a small "sculpt" layer on top of the real heights
   (a levelled pad, a V gully, a hollow, a shingle berm at the wrack line, two rock outcrops, and fine noise). That layer is a stand-in and is labelled as such.
   Local coordinates: x east, z south, y up, metres, sea level y = 0; the site centre is the local origin.
   No three.js, no DOM. */
(function (root) {
  'use strict';
  var SAND = 0, WET = 1, SHINGLE = 2, TURF = 3, ROCK = 4;
  /* fr = friction of the ground (the physics averages it with the object's own), rest = bounce, roll = rolling resistance as a slope tangent:
     a ball stops by itself where the slope is gentler than this number. col = drawn colour. All values are first guesses to be tuned by feel. */
  var GROUND = [
    { id: 'sand',    name: 'Dry sand',  fr: 0.95, rest: 0.06, roll: 0.16,  col: [0.86, 0.78, 0.58] },
    { id: 'wet',     name: 'Wet sand',  fr: 0.55, rest: 0.04, roll: 0.045, col: [0.62, 0.55, 0.42] },
    { id: 'shingle', name: 'Shingle',   fr: 0.80, rest: 0.20, roll: 0.12,  col: [0.58, 0.56, 0.52] },
    { id: 'turf',    name: 'Turf',      fr: 0.45, rest: 0.16, roll: 0.07,  col: [0.40, 0.55, 0.28] },
    { id: 'rock',    name: 'Rock',      fr: 0.70, rest: 0.45, roll: 0.012, col: [0.55, 0.40, 0.34] }
  ];

  function sm(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hash2(i, j, s) {
    var h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, z, s) {                       /* value noise, 0..1 */
    var i = Math.floor(x), j = Math.floor(z), fx = sm(x - i), fz = sm(z - j);
    var a = hash2(i, j, s), b = hash2(i + 1, j, s), c = hash2(i, j + 1, s), d = hash2(i + 1, j + 1, s);
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  }

  /* ---------- the island's own arrays ---------- */
  /* man = the manifest object, u8 = the bytes of world.bin (Node) or the decoded b64 (browser) */
  function islandFromBytes(man, u8) {
    var buf = new ArrayBuffer(u8.length); new Uint8Array(buf).set(u8);             /* a fresh, aligned copy */
    var nx = man.nx, A = man.arrays, NN = nx * nx;
    var hI = new Int16Array(buf, A.height.offset, NN);
    var hF = new Float32Array(NN); for (var k = 0; k < NN; k++) hF[k] = hI[k] / man.height_scale;
    function u(n) { return new Uint8Array(buf, A[n].offset, NN); }
    var isl = { nx: nx, dx: man.dx, half: (nx - 1) * man.dx / 2, hF: hF, shore: u('shore'), veg: u('veg'), wet: u('wetness'), seed: man.seed, tideAmp: man.tide_amp, label: man.label, manifest: man };
    function cr(t, o) { var t2 = t * t, t3 = t2 * t; o[0] = -0.5 * t3 + t2 - 0.5 * t; o[1] = 1.5 * t3 - 2.5 * t2 + 1; o[2] = -1.5 * t3 + 2 * t2 + 0.5 * t; o[3] = 0.5 * t3 - 0.5 * t2; }
    var wx = [0, 0, 0, 0], wz = [0, 0, 0, 0];
    isl.h = function (x, z) {                      /* the page's own bicubic (Catmull-Rom) height, island metres */
      var fx = (x + isl.half) / isl.dx, fz = (z + isl.half) / isl.dx, i = Math.floor(fx), j = Math.floor(fz); cr(fx - i, wx); cr(fz - j, wz);
      var s = 0;
      for (var b = 0; b < 4; b++) { var jj = clamp(j - 1 + b, 0, nx - 1) * nx, r = 0; for (var a = 0; a < 4; a++) r += wx[a] * hF[jj + clamp(i - 1 + a, 0, nx - 1)]; s += wz[b] * r; }
      return s;
    };
    isl.cell = function (x, z) { return clamp(Math.round((z + isl.half) / isl.dx), 0, nx - 1) * nx + clamp(Math.round((x + isl.half) / isl.dx), 0, nx - 1); };
    isl.baseGround = function (x, z) {             /* sand, shingle, turf or rock from the shore class and the vegetation class of the cell */
      var k = isl.cell(x, z), sh = isl.shore[k], vg = isl.veg[k];
      if (sh === 4 || sh === 5 || vg === 1 || vg === 2 || vg === 17 || vg === 18 || vg === 19) return ROCK;
      if (sh === 2 || vg === 10) return SHINGLE;
      if (sh === 1 || sh === 0 || vg === 9 || vg === 0) return SAND;
      return TURF;
    };
    return isl;
  }

  /* ---------- the site: a square window of ground ---------- */
  /* spec: { size, cell, tile, height(x,z) local metres, ground(x,z) base id, seed, sculpt:{pad,gully,hollow,berm,rocks,noise}, layout }
     The height grid is n x n samples (n = size/cell + 1), index j*n + i, i along x, j along z. */
  function makeSite(spec) {
    var size = spec.size || 40, cell = spec.cell || 0.5, tile = spec.tile || 2, seed = spec.seed || 1;
    var n = Math.round(size / cell) + 1, nt = Math.round(size / tile), per = Math.round(tile / cell), x0 = -size / 2;
    var S = spec.sculpt || {};
    var site = { size: size, cell: cell, tile: tile, n: n, nt: nt, per: per, x0: x0, seed: seed, layout: spec.layout || {}, sculpt: S, notes: spec.notes || [] };

    /* base ground per tile, then paint (shingle berm, rock outcrops) */
    var base = new Uint8Array(nt * nt);
    function rockAt(x, z) { var R = S.rocks || []; for (var q = 0; q < R.length; q++) { var dx = x - R[q].x, dz = z - R[q].z; if (dx * dx + dz * dz < R[q].r * R[q].r) return R[q]; } return null; }
    for (var tj = 0; tj < nt; tj++) for (var ti = 0; ti < nt; ti++) {
      var cx = x0 + (ti + 0.5) * tile, cz = x0 + (tj + 0.5) * tile, g = spec.ground(cx, cz);
      if (S.berm && Math.abs(cz - S.berm.z) < S.berm.halfw + 0.9) g = SHINGLE;
      if (rockAt(cx, cz)) g = ROCK;
      if (S.pad && S.pad.ground !== undefined && Math.abs(cx - S.pad.x) < S.pad.hw && Math.abs(cz - S.pad.z) < S.pad.hd) g = S.pad.ground;     /* a big pad is one ground type (turf), so the fort does not stand half on sand and half on rock */
      base[tj * nt + ti] = g;
    }
    site.base = base;
    site.baseAt = function (x, z) { return base[clamp(Math.floor((z - x0) / tile), 0, nt - 1) * nt + clamp(Math.floor((x - x0) / tile), 0, nt - 1)]; };

    /* heights: the island's own, plus the sculpt layer */
    var h = new Float32Array(n * n), pad = S.pad, i, j;
    var NOISE = [0.010, 0.006, 0.04, 0.03, 0.05];               /* amplitude in m for sand, wet, shingle, turf, rock (a stand-in for relief the 2 m data cannot hold) */
    for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
      var x = x0 + i * cell, z = x0 + j * cell, v = spec.height(x, z), gb = site.baseAt(x, z);
      if (S.noise !== false) v += (vnoise(x * 1.7, z * 1.7, seed) - 0.5) * 2 * NOISE[gb] + (vnoise(x * 0.45, z * 0.45, seed + 7) - 0.5) * 0.06;
      if (S.gully) { var G = S.gully, t = (z - G.z0) / (G.z1 - G.z0); if (t > 0 && t < 1) { var gx = G.x + (G.wob || 0) * Math.sin(z * 0.5), a = 1 - Math.abs(x - gx) / G.halfw; if (a > 0) v -= G.depth * a * sm(Math.min(t, 1 - t) * 6); } }
      if (S.hollow) { var Hh = S.hollow, hd = Math.sqrt((x - Hh.x) * (x - Hh.x) + (z - Hh.z) * (z - Hh.z)); if (hd < Hh.r) v -= Hh.depth * (1 - (hd / Hh.r) * (hd / Hh.r)); }
      if (S.berm) { var Bm = S.berm, bz = 1 - Math.abs(z - Bm.z) / Bm.halfw; if (bz > 0) v += Bm.height * bz * (0.8 + 0.4 * vnoise(x * 0.6, 3, seed + 3)); }
      var rk = rockAt(x, z); if (rk) { var rd = Math.sqrt((x - rk.x) * (x - rk.x) + (z - rk.z) * (z - rk.z)) / rk.r; v += rk.height * (1 - rd * rd) * (0.75 + 0.5 * vnoise(x * 1.1, z * 1.1, seed + 11)); }
      h[j * n + i] = v;
    }
    if (pad) {                                                    /* a levelled shelf, cut into the slope: flat at the height of its centre, blended out over pad.margin */
      var py = pad.y !== undefined ? pad.y : spec.height(pad.x, pad.z);
      for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
        var px = x0 + i * cell, pz = x0 + j * cell, ddx = Math.max(Math.abs(px - pad.x) - pad.hw, 0), ddz = Math.max(Math.abs(pz - pad.z) - pad.hd, 0), dd = Math.sqrt(ddx * ddx + ddz * ddz);
        var w = 1 - sm(dd / pad.margin); if (w > 0) h[j * n + i] = h[j * n + i] * (1 - w) + py * w;
      }
      site.padY = py;
    }
    site.h = h;
    var lo = 1e9, hi = -1e9; for (i = 0; i < h.length; i++) { if (h[i] < lo) lo = h[i]; if (h[i] > hi) hi = h[i]; }
    site.hMin = lo; site.hMax = hi;

    /* bilinear height at local (x,z); outside the window it is clamped to the edge */
    site.H = function (x, z) {
      var fx = (x - x0) / cell, fz = (z - x0) / cell; fx = clamp(fx, 0, n - 1.0001); fz = clamp(fz, 0, n - 1.0001);
      var i0 = Math.floor(fx), j0 = Math.floor(fz), tx = fx - i0, tz = fz - j0, k = j0 * n + i0;
      return h[k] * (1 - tx) * (1 - tz) + h[k + 1] * tx * (1 - tz) + h[k + n] * (1 - tx) * tz + h[k + n + 1] * tx * tz;
    };
    /* heights for one physics tile: column-major, rows along z, columns along x (found by experiment against Rapier 0.21, see test_terrain_physics.js) */
    site.tileHeights = function (ti, tj) {
      var a = new Float32Array((per + 1) * (per + 1));
      for (var jj = 0; jj <= per; jj++) for (var ii = 0; ii <= per; ii++) a[jj * (per + 1) + ii] = h[(tj * per + ii) * n + (ti * per + jj)];
      return a;
    };
    /* the ground type at a point: 'wet' replaces dry sand below the swash line (tide + 0.25 m); mode overrides everything with one type */
    site.groundAt = function (x, z, tide, mode) {
      if (mode !== undefined && mode !== null && mode >= 0) return mode;
      var g = site.baseAt(x, z);
      if (g === SAND && site.H(x, z) < (tide || 0) + 0.25) return WET;
      return g;
    };
    site.normalAt = function (x, z) {
      var e = cell, dx = site.H(x + e, z) - site.H(x - e, z), dz = site.H(x, z + e) - site.H(x, z - e), l = Math.sqrt(dx * dx + dz * dz + 4 * e * e);
      return [-dx / l, 2 * e / l, -dz / l];
    };
    return site;
  }

  /* ---------- ready-made sites ---------- */
  /* the gift island's lee beach. Local origin = island (-23, 29): the beach and the sea are to the south (+z), the turf rises to the north (-z).
     Layout (local): launcher on the sand at z +10, a brick block on a levelled pad at z -7, a row of cans on the slope at z -14, the wrack line near z +1. */
  var LEE = { cx: -23, cz: 29 };
  function leeSite(isl, opts) {
    opts = opts || {};
    var layout = { launcher: { x: 0, z: 10 }, wall: { x: 0, z: -7 }, cans: { x: 0, z: -14 }, wrack: { z: 1 }, aimDir: [0, -1] };
    return makeSite({
      size: 40, cell: 0.5, tile: 2, seed: opts.seed || 9001,
      height: function (x, z) { return isl.h(LEE.cx + x, LEE.cz + z); },
      ground: function (x, z) { return isl.baseGround(LEE.cx + x, LEE.cz + z); },
      layout: layout,
      sculpt: {
        pad: opts.grand ? { x: 0, z: -7, hw: 13.5, hd: 10.5, margin: 1.6, ground: TURF } : { x: 0, z: -7, hw: 2.6, hd: 2.4, margin: 1.6 },
        gully: { x: -9, z0: -17, z1: 9, halfw: 0.7, depth: 0.32, wob: 0.5 },
        hollow: { x: 7, z: 4, r: 2.2, depth: 0.28 },
        berm: { z: 1.5, halfw: 1.2, height: 0.10 },
        rocks: [{ x: 11, z: -12, r: 3.0, height: 0.45 }, { x: -14, z: -4, r: 2.2, height: 0.3 }]
      },
      notes: ['real: heights, shore and vegetation of seed 9001 (bicubic from 2 m cells)', opts.grand ? 'stand-in: noise, gully, hollow, shingle berm, two rock outcrops, and a big levelled turf pad (27 by 21 m, for the Grand Fort; the shelf is cut and filled in the sculpt layer, the real 2 m data is not that flat)' : 'stand-in: noise, gully, hollow, shingle berm, two rock outcrops, levelled pad']
    });
  }
  /* a procedural beach with the same layout and a similar slope, for when the world file is not there */
  function proceduralSite(opts) {
    opts = opts || {};
    var isl = { h: function (x, z) { return 1.0 - 0.083 * (z - 29) + 0.12 * Math.sin((x + 23) * 0.09) + 0.1 * Math.sin(z * 0.2 + (x + 23) * 0.03); } };
    isl.baseGround = function (x, z) { var zz = z - 29; return zz > 10 ? SAND : zz > -4 ? SAND : TURF; };
    var s = leeSite(isl, opts); s.notes = ['procedural stand-in ground (the world file was not loaded)']; s.procedural = true; return s;
  }
  /* analytic site for tests: height(x,z) and ground(x,z) given as functions, no noise, no sculpt */
  function functionSite(o) {
    return makeSite({ size: o.size || 24, cell: o.cell || 0.5, tile: o.tile || 2, seed: 1, height: o.height, ground: o.ground || function () { return TURF; }, sculpt: { noise: false }, layout: o.layout || {} });
  }

  var API = { SAND: SAND, WET: WET, SHINGLE: SHINGLE, TURF: TURF, ROCK: ROCK, GROUND: GROUND, islandFromBytes: islandFromBytes, makeSite: makeSite, leeSite: leeSite, proceduralSite: proceduralSite, functionSite: functionSite, vnoise: vnoise, clamp: clamp };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.RTerrain = API;
})(typeof window !== 'undefined' ? window : globalThis);
