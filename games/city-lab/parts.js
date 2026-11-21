/* City Lab: part builders. NORMAL CODE, written by hand, clearly separate from recipes: a recipe can only pick a kind by name from whitelist.js;
   this file holds what each name builds. Needs three.js r128 and the toy library (../sofa-siege/models.js, global SS) for its shared texture atlas and material.
   Each builder makes the part standing on the ground, centred on x and z, size [w, h, d], facing +z, as one THREE.Group.
   crate and barrel reuse the toy library's own pieces (SS.piece); everything else is built here with the same atlas and the same material. */
(function (root) {
  'use strict';
  var WL = root.CityWhitelist, PI = Math.PI;

  /* ---- the atlas, the same way models.js uses it (8 cells of 512 in a 2048 x 1024 canvas: base, wood, blue, red, tin, canvas, grass, greytin) ---- */
  var CELL = { base: 0, wood: 1, blue: 2, red: 3, tin: 4, canvas: 5, grass: 6, greytin: 7 }, PAD = 10;
  var TILE = { wood: [0, 0.5], paint: [0.5, 0.5], rust: [0, 0], cloth: [0.5, 0] };
  /* material name -> the library tile and colour (the library picks a painted texture from these, by its own rules) */
  var MAT = {
    wood: { tile: 'wood', col: 0xd9ab6c }, wood_dark: { tile: 'wood', col: 0x8a5c34 }, wood_pale: { tile: 'wood', col: 0xe6c88e },
    paint_cream: { tile: null, col: 0xf6ecd6 }, paint_blue: { tile: 'paint', col: 0x2f6fe6 }, paint_red: { tile: 'paint', col: 0xd4502c },
    tin: { tile: 'rust', col: 0xa8a49e }, brick: { tile: 'rust', col: 0xb0683a }, canvas: { tile: 'cloth', col: 0xf3e7cc },
    flour: { tile: null, col: 0xf7f3ea }, bread: { tile: null, col: 0xc98a48 }, iron: { tile: null, col: 0x3a3a40 }, glass: { tile: null, col: 0x86b8d8 }, stone: { tile: null, col: 0xb9b2a4 }
  };
  function rng(seed) { var s = (seed | 0) % 2147483647; if (s <= 0) s += 2147483646; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function hash(str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 2147483647; return h || 1; }
  function shade(hex, f) { var r = Math.max(0, Math.min(255, Math.round(((hex >> 16) & 255) * f))), g = Math.max(0, Math.min(255, Math.round(((hex >> 8) & 255) * f))), b = Math.max(0, Math.min(255, Math.round((hex & 255) * f))); return (r << 16) | (g << 8) | b; }
  var _lin = {};
  function lin(hex) { var c = _lin[hex]; if (!c) { var k = new THREE.Color(hex).convertSRGBToLinear(); c = _lin[hex] = [k.r, k.g, k.b]; } return c; }
  function isTin(col, tile) { if (tile !== 'rust') return false; var r = (col >> 16) & 255, g = (col >> 8) & 255, b = col & 255; return r < g && g <= b && b - r < 24; }
  function texKey(col, tile) {
    if (!root.SS.texOn || !tile) return '';
    var r = (col >> 16) & 255, g = (col >> 8) & 255, b = col & 255;
    if (tile === 'wood') return 'wood';
    if (tile === 'rust') return r > g * 1.6 && r > b * 1.6 ? 'red' : (isTin(col, tile) ? 'greytin' : 'tin');
    if (tile === 'paint') return b > r * 1.25 && b > g ? 'blue' : (r > g * 1.6 && r > b * 1.6 ? 'red' : '');
    if (tile === 'cloth') return r > 205 && g > 190 && b > 140 && r - b < 90 ? 'canvas' : '';
    return '';
  }
  function cl(x, a, c) { return x < a ? a : (x > c ? c : x); }
  function texTint(key, col) {
    var r = (col >> 16) & 255, g = (col >> 8) & 255, b = col & 255, l = 0.3 * r + 0.59 * g + 0.11 * b, k;
    if (key === 'wood') { k = cl(l / 172, 0.5, 1.08); k *= k; return [k, k * 0.98, k * 0.95]; }
    if (key === 'blue') { k = cl(l / 105, 0.62, 1.12); k *= k; return [k, k, k]; }
    if (key === 'red') { k = cl(l / 116, 0.62, 1.12); k *= k; return [k, k, k]; }
    if (key === 'tin') { k = cl(l / 150, 0.55, 1.05); k *= k; return [k, k * 0.92, k * 0.88]; }
    if (key === 'greytin') { k = cl(l / 160, 0.6, 1.1); k *= k; return [k, k, k]; }
    if (key === 'canvas') { k = cl(l / 222, 0.7, 1.04); k *= k; return [k, k, k]; }
    return [1, 1, 1];
  }
  function cellU(ci, u, pad) { return ((ci % 4) * 512 + pad + u * (512 - 2 * pad)) / 2048; }
  function cellV(ci, v, pad) { return 1 - (Math.floor(ci / 4) * 512 + pad + (1 - v) * (512 - 2 * pad)) / 1024; }

  /* ---- a tiny geometry builder: boxes, cylinders and so on merged into one buffer with vertex colours and atlas uvs ---- */
  var _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3();
  function GB(seed) { this.P = []; this.N = []; this.U = []; this.C = []; this.r = rng(hash(seed || 'x')); }
  GB.prototype.add = function (geo, col, tile, pos, rot, scl) {
    var key = texKey(col, tile), g = geo.index ? geo.toNonIndexed() : geo, pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, i, r = this.r;
    _p.set(pos ? pos[0] : 0, pos ? pos[1] : 0, pos ? pos[2] : 0); _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0); _q.setFromEuler(_e);
    if (scl == null) _s.set(1, 1, 1); else if (typeof scl === 'number') _s.set(scl, scl, scl); else _s.set(scl[0], scl[1], scl[2]);
    _m.compose(_p, _q, _s); _nm.getNormalMatrix(_m);
    var c = key ? texTint(key, col) : lin(col), tl = tile && !key ? TILE[tile] : null, f = 0.42, ou = 0, ov = 0, ci = key ? CELL[key] : 0, pd = key ? PAD : 0;
    if (tl) { ou = tl[0] + 0.03 + r() * (0.5 - 0.06 - f * 0.5); ov = tl[1] + 0.03 + r() * (0.5 - 0.06 - f * 0.5); }
    var ru = 0.02 + r() * 0.5, rv = 0.02 + r() * 0.5;
    for (i = 0; i < pa.count; i++) {
      _v.fromBufferAttribute(pa, i).applyMatrix4(_m); this.P.push(_v.x, _v.y, _v.z);
      if (na) { _n.fromBufferAttribute(na, i).applyMatrix3(_nm).normalize(); this.N.push(_n.x, _n.y, _n.z); } else this.N.push(0, 1, 0);
      var u = ua ? ua.getX(i) : 0, v = ua ? ua.getY(i) : 0, uu, vv;
      if (key) { uu = ru + u * 0.38; vv = rv + v * 0.38; this.U.push(cellU(ci, uu, pd), cellV(ci, vv, pd)); }
      else if (tl) { u = u < 0 ? 0 : (u > 1 ? 1 : u); v = v < 0 ? 0 : (v > 1 ? 1 : v); this.U.push(cellU(0, ou + u * f * 0.5, 0), cellV(0, ov + v * f * 0.5, 0)); }
      else this.U.push(cellU(0, (256 + 12) / 512, 0), cellV(0, 1 - 12 / 512, 0));
      this.C.push(c[0], c[1], c[2]);
    }
    return this;
  };
  GB.prototype.box = function (w, h, d, col, tile, pos, rot) { return this.add(new THREE.BoxGeometry(w, h, d), col, tile, pos, rot); };
  GB.prototype.cyl = function (rt, rb, h, n, col, tile, pos, rot, scl) { return this.add(new THREE.CylinderGeometry(rt, rb, h, n || 10), col, tile, pos, rot, scl); };
  GB.prototype.sph = function (r, col, tile, pos, rot, scl) { return this.add(new THREE.SphereGeometry(r, 10, 8), col, tile, pos, rot, scl); };
  GB.prototype.tor = function (r, t, col, tile, pos, rot) { return this.add(new THREE.TorusGeometry(r, t, 4, 10), col, tile, pos, rot); };
  /* a slab laid along a slope in the y-z plane from the low front edge (y 0, z +d/2) up to the high back edge (y h, z -d/2), w wide in x */
  GB.prototype.slab = function (w, h, d, thick, col, tile, dz, dy) {
    var L = Math.sqrt(h * h + d * d), a = Math.atan2(h, d);
    return this.box(w, thick, L, col, tile, [0, h / 2 - thick / 2 + (dy || 0), dz || 0], [a, 0, 0]);
  };
  GB.prototype.geo = function () {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
    g.computeBoundingSphere(); return g;
  };

  /* ---- the kinds. Each: function (b, w, h, d, c, o) where c = base colour and tile of the material, o = {variant, label, id} ---- */
  var K = {};
  K.floor = function (b, w, h, d, m) {
    b.box(w, h, d, m.col, m.tile, [0, h / 2, 0]);
    var n = Math.max(2, Math.round(d / 0.22)), i; for (i = 1; i < n; i++) b.box(w * 0.995, h * 1.04, 0.008, shade(m.col, 0.78), null, [0, h / 2, -d / 2 + i * d / n]);
  };
  K.post = function (b, w, h, d, m) {
    b.box(w, h, d, m.col, m.tile, [0, h / 2, 0]); b.box(w * 1.35, 0.03, d * 1.35, shade(m.col, 0.85), m.tile, [0, h - 0.015, 0]);
    b.box(w * 1.3, 0.03, d * 1.3, shade(m.col, 0.85), m.tile, [0, 0.015, 0]);
  };
  K.beam = function (b, w, h, d, m) {
    b.box(w, h, d, m.col, m.tile, [0, h / 2, 0]);
    var n = Math.max(0, Math.floor(Math.max(w, d) / 0.5)), i; for (i = 0; i < n; i++) { var t = -0.5 + (i + 0.5) / n; if (w >= d) b.box(0.025, h * 1.05, d * 1.08, shade(m.col, 0.78), null, [t * w, h / 2, 0]); else b.box(w * 1.08, h * 1.05, 0.025, shade(m.col, 0.78), null, [0, h / 2, t * d]); }
  };
  K.panel = function (b, w, h, d, m) {
    b.box(w, h, d, m.col, m.tile, [0, h / 2, 0]);
    var n = Math.max(2, Math.round(w / 0.1)), i; for (i = 0; i < n; i++) b.box(0.008, h * 0.98, d + 0.008, shade(m.col, 0.82), null, [-w / 2 + (i + 0.5) * w / n, h / 2, 0]);
    b.box(w, 0.035, d + 0.012, shade(m.col, 0.74), m.tile, [0, 0.025, 0]);
  };
  K.door = function (b, w, h, d, m) {
    b.box(w, h, d, m.col, m.tile, [0, h / 2, 0]);
    var n = Math.max(2, Math.round(w / 0.09)), i; for (i = 0; i < n; i++) b.box(0.008, h * 0.97, d + 0.006, shade(m.col, 0.8), null, [-w / 2 + (i + 0.5) * w / n, h / 2, 0]);
    b.box(w * 0.9, 0.04, d + 0.016, shade(m.col, 0.7), null, [0, h * 0.22, 0]); b.box(w * 0.9, 0.04, d + 0.016, shade(m.col, 0.7), null, [0, h * 0.78, 0]);
    b.box(0.03, h * 0.62, d + 0.012, shade(m.col, 0.7), null, [0, h * 0.5, 0], [0, 0, 0.62]);
    b.sph(0.025, 0xe9b53a, null, [w * 0.32, h * 0.48, d / 2 + 0.02]);
    b.box(w * 0.5, 0.1, d + 0.018, 0x2a2e3a, null, [0, h * 0.86, 0]); b.box(w * 0.46, 0.07, d + 0.022, 0x86b8d8, null, [0, h * 0.86, 0]);
  };
  K.window = function (b, w, h, d, m) {
    b.box(w, h, d * 0.6, 0x2a2e3a, null, [0, h / 2, 0]); b.box(w * 0.88, h * 0.86, d * 0.62, 0x86b8d8, null, [0, h / 2, 0]);
    var t = 0.045; b.box(w, t, d, m.col, m.tile, [0, h - t / 2, 0]); b.box(w * 1.12, t * 0.9, d * 1.5, shade(m.col, 0.85), m.tile, [0, 0.02, 0.0]); b.box(w, t, d, m.col, m.tile, [0, t / 2 + 0.03, 0]);
    b.box(t, h, d, m.col, m.tile, [-w / 2 + t / 2, h / 2, 0]); b.box(t, h, d, m.col, m.tile, [w / 2 - t / 2, h / 2, 0]);
    b.box(t * 0.7, h, d, m.col, m.tile, [0, h / 2, 0]); b.box(w, t * 0.7, d, m.col, m.tile, [0, h / 2, 0]);
    b.box(w * 0.9, 0.025, 0.05, 0xf3e7cc, null, [0, h * 0.2, 0.025]);
  };
  K.shutter = function (b, w, h, d, m) {
    b.box(w, h, d, m.col, m.tile, [0, h / 2, 0]);
    var n = Math.max(3, Math.round(h / 0.05)), i; for (i = 0; i < n; i++) b.box(w * 0.78, 0.012, d + 0.012, shade(m.col, 0.68), null, [0, 0.05 + i * (h - 0.1) / (n - 1), 0.004]);
  };
  K.rafter = function (b, w, h, d, m) { var L = Math.sqrt(h * h + d * d), a = Math.atan2(h, d); b.box(w, 0.05, L, m.col, m.tile, [0, h / 2 - 0.025, 0], [a, 0, 0]); };
  K.gable = function (b, w, h, d, m) {
    var sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, h); sh.lineTo(-d / 2, 0);
    var g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false, steps: 1 }); g.rotateY(-PI / 2); g.translate(w / 2, 0, 0);
    b.add(g, m.col, m.tile);
    b.cyl(0.07, 0.07, w + 0.016, 10, 0x2a2e3a, null, [0, h * 0.34, 0], [0, 0, PI / 2]); b.cyl(0.05, 0.05, w + 0.022, 10, 0x86b8d8, null, [0, h * 0.34, 0], [0, 0, PI / 2]);
  };
  K.ridge = function (b, w, h, d, m) { b.cyl(h * 0.62, h * 0.62, w, 8, m.col, m.tile, [0, h * 0.5, 0], [0, 0, PI / 2]); b.box(w, h * 0.5, d, shade(m.col, 0.85), m.tile, [0, h * 0.25, 0]); };
  K.chimney = function (b, w, h, d, m) {
    b.box(w, h, d, m.col, m.tile, [0, h / 2, 0]);
    var i; for (i = 1; i < 5; i++) b.box(w * 1.02, 0.012, d * 1.02, shade(m.col, 0.7), null, [0, i * h / 5, 0]);
    b.box(w * 1.22, 0.05, d * 1.22, shade(m.col, 0.8), m.tile, [0, h - 0.025, 0]); b.box(w * 0.6, 0.02, d * 0.6, 0x2a1c14, null, [0, h + 0.002, 0]);
  };
  K.awning = function (b, w, h, d, m, o) {
    var v = o.variant || 0, A = v === 1 ? 0xd4502c : (v === 2 ? 0x2f6fe6 : (v === 3 ? 0x4c9a3c : m.col)), Bc = m.col, n = Math.max(2, Math.round(w / 0.14)), i, sw = w / n;
    var L = Math.sqrt(h * h + d * d), a = Math.atan2(h, d);
    for (i = 0; i < n; i++) {
      var col = (v === 0) ? m.col : (i % 2 ? Bc : A), tile = (v === 0) ? m.tile : 'cloth';
      b.box(sw * 0.999, 0.02, L, col, tile, [-w / 2 + (i + 0.5) * sw, h / 2 - 0.01, 0], [a, 0, 0]);
      /* the scalloped valance on the low front edge */
      b.box(sw * 0.999, 0.07, 0.014, col, tile, [-w / 2 + (i + 0.5) * sw, 0.035, d / 2 - 0.006]);
      b.sph(sw * 0.5, col, tile, [-w / 2 + (i + 0.5) * sw, 0.03, d / 2 - 0.006], null, [1, 0.5, 0.18]);
    }
    b.box(0.014, 0.014, d * 1.0, 0x8a5c34, null, [-w / 2, 0.06, 0]);
  };
  K.sign = function (b, w, h, d, m) {
    b.box(w, h, d, m.col, m.tile, [0, h / 2, 0]);
    b.box(w * 1.04, 0.025, d * 1.5, 0x8a5c34, 'wood', [0, 0.012, 0]); b.box(w * 1.04, 0.025, d * 1.5, 0x8a5c34, 'wood', [0, h - 0.012, 0]);
    b.box(0.025, h, d * 1.5, 0x8a5c34, 'wood', [-w / 2, h / 2, 0]); b.box(0.025, h, d * 1.5, 0x8a5c34, 'wood', [w / 2, h / 2, 0]);
  };
  K.oven = function (b, w, h, d, m) {
    b.box(w, h * 0.12, d * 1.04, shade(m.col, 0.7), m.tile, [0, h * 0.06, 0]);
    b.box(w * 0.96, h * 0.82, d * 0.96, m.col, m.tile, [0, h * 0.12 + h * 0.41, 0]);
    b.box(w * 1.04, h * 0.06, d * 1.02, shade(m.col, 0.8), m.tile, [0, h * 0.94, 0]);
    var i; for (i = 1; i < 5; i++) b.box(w * 0.98, 0.01, d * 0.98 + 0.004, shade(m.col, 0.65), null, [0, h * 0.12 + i * h * 0.14, 0]);
    b.box(w * 0.5, h * 0.4, 0.04, 0x1a1210, null, [0, h * 0.42, d / 2 * 0.96 + 0.02]); b.cyl(w * 0.25, w * 0.25, 0.04, 12, 0x1a1210, null, [0, h * 0.62, d / 2 * 0.96 + 0.02], [PI / 2, 0, 0]);
    b.box(w * 0.56, 0.03, 0.06, 0x3a3a40, null, [0, h * 0.2, d / 2 * 0.96 + 0.03]); b.cyl(0.09, 0.1, h * 0.28, 8, 0x3a3a40, null, [w * 0.28, h + h * 0.1, -d * 0.2]);
  };
  K.counter = function (b, w, h, d, m) {
    b.box(w * 0.96, h * 0.86, d * 0.9, shade(m.col, 0.9), m.tile, [0, h * 0.43, 0]);
    b.box(w, h * 0.14, d, m.col, m.tile, [0, h * 0.93, 0]);
    var n = Math.max(2, Math.round(w / 0.3)), i; for (i = 0; i < n; i++) b.box(w / n * 0.8, h * 0.6, 0.012, shade(m.col, 0.7), null, [-w / 2 + (i + 0.5) * w / n, h * 0.42, d * 0.45 + 0.004]);
  };
  K.wire = function (b, w, h, d, m) {
    b.cyl(h * 0.5, h * 0.5, w, 6, m.col, null, [0, h / 2, 0], [0, 0, PI / 2]);
    b.box(0.03, h * 1.5, d * 1.5, 0x8a8a90, null, [-w / 2 + 0.015, h / 2, 0]); b.box(0.03, h * 1.5, d * 1.5, 0x8a8a90, null, [w / 2 - 0.015, h / 2, 0]);
    var i; for (i = 1; i < 4; i++) b.box(0.012, h * 1.3, d * 1.3, 0xe9b53a, null, [-w / 2 + i * w / 4, h / 2, 0]);
  };
  K.meter_box = function (b, w, h, d, m) {
    b.box(w, h, d, m.col, m.tile, [0, h / 2, 0]); b.box(w * 0.7, h * 0.4, 0.01, 0xf3e7cc, null, [0, h * 0.62, d / 2 + 0.004]);
    b.cyl(w * 0.2, w * 0.2, 0.012, 10, 0x2a2e3a, null, [0, h * 0.62, d / 2 + 0.012], [PI / 2, 0, 0]);
    b.box(w * 0.5, 0.02, 0.012, 0xd4502c, null, [0, h * 0.18, d / 2 + 0.006]); b.box(w * 0.2, 0.06, 0.02, 0x3a3a40, null, [0, -0.0, 0]);
  };
  K.shelf = function (b, w, h, d, m) {
    b.box(w, h, d, m.col, m.tile, [0, h / 2, 0]); b.box(0.03, 0.1, d * 0.9, shade(m.col, 0.8), m.tile, [-w * 0.4, -0.05, 0]); b.box(0.03, 0.1, d * 0.9, shade(m.col, 0.8), m.tile, [w * 0.4, -0.05, 0]);
  };
  K.sack = function (b, w, h, d, m) {
    b.sph(0.5, m.col, m.tile, [0, h * 0.4, 0], null, [w, h * 0.8, d]);
    b.cyl(w * 0.2, w * 0.3, h * 0.16, 8, shade(m.col, 0.95), m.tile, [0, h * 0.86, 0]); b.tor(w * 0.22, 0.012, 0xd2ad6e, null, [0, h * 0.8, 0], [PI / 2, 0, 0]);
    b.box(w * 0.5, h * 0.2, 0.01, 0xd4502c, null, [0, h * 0.42, d * 0.5 - 0.005]);
  };
  K.crate = function (b, w, h, d, m) {   /* fallback when the library's crate cannot be used */
    b.box(w, h, d, m.col, m.tile, [0, h / 2, 0]); var t = 0.03;
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (q) { b.box(t, h * 1.01, t, shade(m.col, 0.7), null, [q[0] * (w / 2 - t / 2), h / 2, q[1] * (d / 2 - t / 2)]); });
    b.box(w * 1.01, t, d * 1.01, shade(m.col, 0.78), null, [0, h - t / 2, 0]); b.box(w * 1.01, t, d * 1.01, shade(m.col, 0.78), null, [0, t / 2, 0]);
  };
  K.barrel = function (b, w, h, d, m) {
    b.cyl(w * 0.5, w * 0.5, h, 12, m.col, m.tile, [0, h / 2, 0]); b.cyl(w * 0.54, w * 0.54, h * 0.55, 12, m.col, m.tile, [0, h / 2, 0]);
    [0.18, 0.5, 0.82].forEach(function (y) { b.cyl(w * 0.545, w * 0.545, 0.02, 12, 0x3a3a40, null, [0, h * y, 0]); });
    b.cyl(w * 0.44, w * 0.44, 0.01, 12, 0x2a1c14, null, [0, h + 0.002, 0]);
  };
  /* the tile's strips (a second pass, so each strip sits along the slope at its own place across the width) */
  K.roof_tile = function (b, w, h, d, m) {
    b.slab(w, h, d, 0.03, m.col, m.tile, 0, 0);
    var rows = Math.max(2, Math.round(d / 0.12)), cols = Math.max(2, Math.round(w / 0.17)), L = Math.sqrt(h * h + d * d), a = Math.atan2(h, d), i, j, rr = rng(hash(m.col + 'rt'));
    for (j = 0; j < rows; j++) {
      var f = (j + 0.5) / rows, zz = d / 2 - f * d, yy = f * h;
      for (i = 0; i < cols; i++) {
        var jitter = 1 + (rr() - 0.5) * 0.18, x0 = -w / 2 + (i + 0.5) * w / cols;
        b.box(w / cols * 0.94, 0.02, L / rows * 0.96, shade(m.col, jitter * (((i + j) % 2) ? 0.9 : 1.04)), null, [x0, yy + 0.02 - 0.01, zz], [a, 0, 0]);
      }
    }
    b.box(w, 0.04, 0.03, shade(m.col, 0.7), null, [0, 0.02, d / 2 - 0.01], [a, 0, 0]);
  };

  /* ---- text on a sign: one canvas texture per text ---- */
  var _signTex = {};
  function signMaterial(text) {
    var key = text || '';
    if (_signTex[key]) return _signTex[key];
    var c = document.createElement('canvas'); c.width = 256; c.height = 64; var g = c.getContext('2d');
    g.fillStyle = '#efd9a6'; g.fillRect(0, 0, 256, 64); g.strokeStyle = 'rgba(120,80,40,.5)'; g.lineWidth = 3; g.strokeRect(3, 3, 250, 58);
    g.fillStyle = '#7a3a1a'; g.font = 'bold 38px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(key, 128, 34, 236);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
    return (_signTex[key] = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
  }

  /* ---- assemble a part: returns a THREE.Group named by the part id ---- */
  function libraryPiece(kind, w, h, d) {
    var SS = root.SS;
    try {
      var p = SS.piece(kind, 'green', { variant: 0 }); p.updateMatrixWorld(true);
      var box = new THREE.Box3().setFromObject(p), sz = box.getSize(new THREE.Vector3());
      if (!(sz.x > 0 && sz.y > 0 && sz.z > 0)) return null;
      var wrap = new THREE.Group(); wrap.add(p);
      var s = new THREE.Vector3(w / sz.x, h / sz.y, d / sz.z);
      p.scale.copy(s); p.position.set(-(box.min.x + sz.x / 2) * s.x, -box.min.y * s.y, -(box.min.z + sz.z / 2) * s.z);
      return wrap;
    } catch (e) { return null; }
  }
  function build(part) {
    var SS = root.SS, mats = SS.materials(), W = root.CitySupports, s = W.effSize(part), w = s[0], h = s[1], d = s[2], m = MAT[part.material] || MAT.wood;
    var g = new THREE.Group(); g.name = part.id;
    var lib = (part.kind === 'crate' || part.kind === 'barrel') && !part.__noLib ? libraryPiece(part.kind, w, h, d) : null;
    if (lib) { lib.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.add(lib); }
    else {
      var b = new GB(part.id + part.kind + (part.variant || 0)), fn = K[part.kind] || K.crate;
      fn(b, w, h, d, m, { variant: part.variant || 0, label: part.label, id: part.id });
      var mesh = new THREE.Mesh(b.geo(), mats.mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = part.id + '.mesh'; g.add(mesh);
    }
    if (part.kind === 'sign') {
      var plane = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.72), signMaterial(part.label || ''));
      plane.position.set(0, h / 2, d / 2 + 0.003); g.add(plane);
      var back = plane.clone(); back.rotation.y = PI; back.position.z = -d / 2 - 0.003; g.add(back);
    }
    if (part.kind === 'oven') {
      var fire = new THREE.Mesh(new THREE.BoxGeometry(w * 0.34, h * 0.2, 0.01), new THREE.MeshBasicMaterial({ color: 0xff8a2a }));
      fire.position.set(0, h * 0.34, d / 2 * 0.96 + 0.042); fire.name = 'fire'; g.add(fire);
    }
    g.position.set(part.pos[0], part.pos[1], part.pos[2]); g.rotation.y = part.rotY || 0;
    g.userData = { partId: part.id, kind: part.kind, stage: part.stage, tag: part.tag };
    return g;
  }
  root.CityParts = { build: build, MAT: MAT, kinds: Object.keys(K), signMaterial: signMaterial };
})(typeof self !== 'undefined' ? self : this);
