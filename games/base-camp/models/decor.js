/* Base Camp season decorations (build 18): window.BC_DECOR_MK, one maker per decoration kind (the same keys as DECOR in index.html).
   The look is a 1990s TV cartoon made from household rubbish at creature scale (a creature is about 5 cm): bottle tops, lolly sticks, foil, cotton wool, matchboxes, buttons, pins.
   Every maker returns a THREE.Group with the same origin, scale and footprint as the plain maker in index.html, and may set userData.tick = (time, dt) => {} for gentle life.
   Shapes are merged into ONE vertex-coloured geometry per decoration (built once, shared by every copy), drawn with the game's shared toon material, plus ONE ink outline mesh.
   Parts that must move or glow (a star, a lantern, the calendar doors) are separate meshes. No letters on any object. The game calls BC_DECOR_MK.init({THREE, BCP, inked, bcMerge, M}) once before the first maker;
   if this file is missing, or a maker throws, the game builds the plain shape instead. Also read by tests/decor-preview.html. */
(function (root) {
  'use strict';
  var T, BCP, bcMerge, M, ready = false;
  var PI = Math.PI, TAU = Math.PI * 2;
  var ASSETS = {}, SH = {};
  var INK = 0x1a1410;
  /* ---- palette ---- */
  var RED = 0xe0402f, DRED = 0xa82a22, GRN = 0x2f9e4f, LGRN = 0x4fc06a, DGRN = 0x247a3c, GOLD = 0xffc82e, BLU = 0x3f86dd, PNK = 0xff6f91, PUR = 0x9a62d6, ORG = 0xf08a24,
    CRM = 0xfff3dc, WHT = 0xffffff, WOOD = 0xd09a5a, DWOOD = 0x92602e, BRN = 0x7a4b28, DK = 0x2a1a10, SIL = 0xc4ccd4, TEAL = 0x39b0a4, YEL = 0xffe14a;
  var FOIL = [RED, GOLD, GRN, BLU, PNK, PUR, ORG];

  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  /* ---- part makers: a part is {g, c, x, y, z, rx, ry, rz, sx, sy, sz, ink}; ink (1 or a number in metres) puts it in the outline mesh; inkOnly is not needed ---- */
  function P(g, c, x, y, z, o) { o = o || {}; return { g: g, c: c, x: x || 0, y: y || 0, z: z || 0, rx: o.rx, ry: o.ry, rz: o.rz, sx: o.sx, sy: o.sy, sz: o.sz, ink: o.ink }; }
  function sph(c, r, x, y, z, o) { o = o || {}; return P(new T.SphereGeometry(r, o.w || 8, o.h || 6), c, x, y, z, o); }
  function box(c, w, h, d, x, y, z, o) { return P(new T.BoxGeometry(w, h, d), c, x, y, z, o); }
  function cyl(c, rt, rb, h, x, y, z, o) { o = o || {}; return P(new T.CylinderGeometry(rt, rb, h, o.w || 8, 1, !!o.open), c, x, y, z, o); }
  function cone(c, r, h, x, y, z, o) { return cyl(c, 0, r, h, x, y, z, o); }
  function tor(c, R, r, x, y, z, o) { o = o || {}; var g = new T.TorusGeometry(R, r, o.h || 4, o.w || 12, o.arc || TAU); if (!o.up) g.rotateX(PI / 2); return P(g, c, x, y, z, o); }
  function oct(c, r, x, y, z, o) { return P(new T.OctahedronGeometry(r, 0), c, x, y, z, o); }
  function ico(c, r, x, y, z, o) { return P(new T.IcosahedronGeometry(r, (o && o.d) || 0), c, x, y, z, o); }
  function tcone(c, r, h, x, y, z, o) { o = o || {}; var g = new T.ConeGeometry(r, h, o.w || 5); g.translate(0, h / 2, 0); return P(g, c, x, y, z, o); }
  function shade(c, k) { var r = ((c >> 16) & 255) * k, g = ((c >> 8) & 255) * k, b = (c & 255) * k; return (Math.min(255, r | 0) << 16) | (Math.min(255, g | 0) << 8) | Math.min(255, b | 0); }
  /* a two-tone foil star (alternate facets light and dark, like folded foil) plus, when ink is asked for, one whole-star outline part that is not drawn itself */
  function star(c, R, r, d, x, y, z, o) {
    o = o || {}; var n = o.n || 5, h = starHalves(R, r, d, n), no = { rx: o.rx, ry: o.ry, rz: o.rz, sx: o.sx, sy: o.sy, sz: o.sz }, out = [P(h[0], c, x, y, z, no), P(h[1], shade(c, 0.6), x, y, z, no)];
    if (o.ink) { var f = P(starGeo(R, r, d, n), c, x, y, z, o); f.inkOnly = true; out.push(f); } return out;
  }
  function starHalves(R, r, d, n) {
    var key = 'sh' + [R, r, d, n].join('_'); if (SH[key]) return SH[key];
    var pts = [], i, pa = [[], []], p, q; for (i = 0; i < n * 2; i++) { var a = PI / 2 + i * PI / n, rad = i % 2 ? r : R; pts.push([Math.cos(a) * rad, Math.sin(a) * rad]); }
    for (i = 0; i < n * 2; i++) { p = pts[i]; q = pts[(i + 1) % (n * 2)]; pa[i % 2].push(p[0], p[1], 0, q[0], q[1], 0, 0, 0, d, q[0], q[1], 0, p[0], p[1], 0, 0, 0, -d); }
    return (SH[key] = pa.map(function (pos) { var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; }));
  }
  /* a faceted foil star: a flat outline with a raised middle on both sides (flat shaded, so it glints like crumpled foil) */
  function starGeo(R, r, d, n) {
    var key = 'star' + [R, r, d, n].join('_'); if (SH[key]) return SH[key];
    var pts = [], i, pos = [], p, q; for (i = 0; i < n * 2; i++) { var a = PI / 2 + i * PI / n, rad = i % 2 ? r : R; pts.push([Math.cos(a) * rad, Math.sin(a) * rad]); }
    for (i = 0; i < n * 2; i++) { p = pts[i]; q = pts[(i + 1) % (n * 2)]; pos.push(p[0], p[1], 0, q[0], q[1], 0, 0, 0, d, q[0], q[1], 0, p[0], p[1], 0, 0, 0, -d); }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return (SH[key] = g);
  }
  /* a gable prism: triangle in x/y (base on y 0), extruded along z */
  function prismGeo(w, h, d) {
    var a = [-w / 2, 0, d / 2], b = [w / 2, 0, d / 2], c = [0, h, d / 2], e = [-w / 2, 0, -d / 2], f = [w / 2, 0, -d / 2], g2 = [0, h, -d / 2], pos = [];
    function tri(u, v, k) { pos.push.apply(pos, u.concat(v, k)); } function quad(u, v, k, l) { tri(u, v, k); tri(u, k, l); }
    tri(a, b, c); tri(f, e, g2); quad(b, f, g2, c); quad(e, a, c, g2); quad(e, f, b, a);
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
  }
  function prism(c, w, h, d, x, y, z, o) { return P(prismGeo(w, h, d), c, x, y, z, o); }
  /* a flat kite: four triangles around a raised middle */
  function kiteGeo(w, h, d, split, q) {
    var top = [0, h * (1 - split), 0], bot = [0, -h * split, 0], l = [-w / 2, 0, 0], r = [w / 2, 0, 0], mid = [0, 0, d], pos = [];
    function tri(u, v, k) { pos.push.apply(pos, u.concat(v, k)); }
    if (q === 0) tri(top, l, mid); else if (q === 1) tri(l, bot, mid); else if (q === 2) tri(bot, r, mid); else if (q === 3) tri(r, top, mid); else { tri(top, l, mid); tri(l, bot, mid); tri(bot, r, mid); tri(r, top, mid); }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
  }

  /* ---- merged geometry: body (bcMerge, vertex colours) and an ink hull (every flagged part pushed out along its smoothed normals) ---- */
  var m4, q4, e4, v3, s3;
  function xform(p) { var sx = p.sx === undefined ? 1 : p.sx; return m4.compose(v3.set(p.x || 0, p.y || 0, p.z || 0), q4.setFromEuler(e4.set(p.rx || 0, p.ry || 0, p.rz || 0)), s3.set(sx, p.sy === undefined ? sx : p.sy, p.sz === undefined ? sx : p.sz)); }
  function inkGeo(parts, t0) {
    var out = [], any = false;
    parts.forEach(function (p) {
      if (!p.ink) return; any = true; var t = p.ink === true || p.ink === 1 ? t0 : p.ink;
      var g = p.g.index ? p.g.toNonIndexed() : p.g.clone(); g.applyMatrix4(xform(p)); var A = g.attributes.position.array, n = A.length / 9, acc = {}, i, k, key = function (j) { return Math.round(A[j] * 1e5) + ',' + Math.round(A[j + 1] * 1e5) + ',' + Math.round(A[j + 2] * 1e5); };
      for (i = 0; i < n; i++) {
        var o = i * 9, ux = A[o + 3] - A[o], uy = A[o + 4] - A[o + 1], uz = A[o + 5] - A[o + 2], vx = A[o + 6] - A[o], vy = A[o + 7] - A[o + 1], vz = A[o + 8] - A[o + 2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        for (k = 0; k < 3; k++) { var kk = key(o + k * 3), a = acc[kk] || (acc[kk] = [0, 0, 0]); a[0] += nx; a[1] += ny; a[2] += nz; }
      }
      for (i = 0; i < n * 3; i++) {
        var a2 = acc[key(i * 3)], l = Math.sqrt(a2[0] * a2[0] + a2[1] * a2[1] + a2[2] * a2[2]) || 1;
        out.push(A[i * 3] + a2[0] / l * t, A[i * 3 + 1] + a2[1] / l * t, A[i * 3 + 2] + a2[2] / l * t);
      }
    });
    if (!any) return null; var g3 = new T.BufferGeometry(); g3.setAttribute('position', new T.Float32BufferAttribute(out, 3)); g3.computeBoundingSphere(); return g3;
  }
  /* an asset = merged body geometry + ink geometry, built the first time and then shared by every copy */
  function flat(a) { var o = []; (function f(x) { if (Array.isArray(x)) x.forEach(f); else if (x) o.push(x); })(a); return o; }
  function asset(key, build, inkT) {
    var A = ASSETS[key]; if (A) return A; var parts = flat(build());
    return (ASSETS[key] = { g: bcMerge('dc_' + key, parts.filter(function (p) { return !p.inkOnly; })), ink: inkGeo(parts, inkT || 0.0005) });
  }
  function bodyMat() { return BCP.toon; }
  function glowMat(em, k) { var m = BCP.toon.clone(); m.emissive = new T.Color(em); m.emissiveIntensity = k === undefined ? 0.8 : k; return m; }
  function inkMat() { return BCP.inks[INK] || (BCP.inks[INK] = new T.MeshBasicMaterial({ color: INK, side: T.BackSide, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 })); }
  function meshOf(A, mat) {
    var m = new T.Mesh(A.g, mat || bodyMat());
    if (A.ink) { var k = new T.Mesh(A.ink, inkMat()); k.renderOrder = -1; k.userData.ink = 1; m.add(k); } return m;
  }
  function at(o, x, y, z) { o.position.set(x || 0, y || 0, z || 0); return o; }
  /* ---- shared small textures, shadow and sprites ---- */
  function canv(w, h, f) { var c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d')); var t = new T.CanvasTexture(c); return t; }
  function tex(name) {
    if (SH[name]) return SH[name];
    if (name === 'blob') return (SH.blob = canv(64, 64, function (x) { var g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(40,25,10,.55)'); g.addColorStop(1, 'rgba(40,25,10,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }));
    if (name === 'glow') return (SH.glow = canv(64, 64, function (x) { var g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,224,160,.95)'); g.addColorStop(0.4, 'rgba(255,196,110,.35)'); g.addColorStop(1, 'rgba(255,170,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }));
    if (name === 'spark') return (SH.spark = canv(64, 64, function (x) {
      var g = x.createRadialGradient(32, 32, 0, 32, 32, 14); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,240,180,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      x.fillStyle = 'rgba(255,248,210,.95)'; x.beginPath(); x.moveTo(32, 0); x.lineTo(36, 28); x.lineTo(64, 32); x.lineTo(36, 36); x.lineTo(32, 64); x.lineTo(28, 36); x.lineTo(0, 32); x.lineTo(28, 28); x.closePath(); x.fill();
    }));
  }
  function blob(r) {
    if (!SH.blobM) { SH.blobM = new T.MeshBasicMaterial({ map: tex('blob'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }); SH.blobG = new T.PlaneGeometry(1, 1).rotateX(-PI / 2); }
    var s = new T.Mesh(SH.blobG, SH.blobM); s.scale.set(r * 2, 1, r * 2); s.position.y = 0.0006; s.renderOrder = 2; return s;
  }
  function glow(r, op, col) { var m = new T.SpriteMaterial({ map: tex('glow'), transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: op, color: col || 0xffffff }); var s = new T.Sprite(m); s.scale.set(r * 2, r * 2, 1); s.renderOrder = 3; return s; }
  function sparkSprite(r, col) { var m = new T.SpriteMaterial({ map: tex('spark'), transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0, color: col || 0xffffff }); var s = new T.Sprite(m); s.scale.set(r * 2, r * 2, 1); s.renderOrder = 4; return s; }
  /* a little particle cloud: one THREE.Points, positions rewritten by the maker's own function every tick */
  function points(n, size, col) {
    var g = new T.BufferGeometry(), pos = new Float32Array(n * 3), cols = new Float32Array(n * 3), c = new T.Color(col || 0xffffff), i;
    for (i = 0; i < n; i++) { cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(cols, 3));
    var m = new T.PointsMaterial({ size: size, map: tex('spark'), transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true, sizeAttenuation: true });
    var p = new T.Points(g, m); p.frustumCulled = false; p.renderOrder = 4; p.userData.pos = pos; p.userData.n = n; return p;
  }
  function finish(g, r) { g.add(blob(r)); return g; }
  function ph() { return Math.random() * TAU; }

  /* ==================== AUTUMN ==================== */
  function leafBits(seed) {
    var R = rng(seed), cols = [0xd9442b, 0xee8a24, 0xf3c231, 0xa8581b, 0xc0381f, 0xb6a52c, 0xe05a1c], parts = [], i;
    parts.push(sph(0xa8601f, 0.0215, 0, 0.0014, 0, { sy: 0.42, w: 12, h: 6, ink: 1 }));
    for (i = 0; i < 80; i++) {
      var a = R() * TAU, d = Math.sqrt(R()) * 0.0205, hh = 0.0105 * (1 - (d / 0.0225) * (d / 0.0225)), x = Math.cos(a) * d, z = Math.sin(a) * d;
      parts.push(sph(cols[(R() * 7) | 0], 0.0042 + R() * 0.0012, x, 0.0024 + hh * (0.65 + R() * 0.45), z, { sy: 0.13, sz: 0.55, sx: 1, ry: R() * TAU, rx: (R() - 0.5) * 0.55, rz: (R() - 0.5) * 0.55, w: 6, h: 3 }));
    }
    for (i = 0; i < 4; i++) { var b = i * 1.7 + 0.4; parts.push(cyl(BRN, 0.0004, 0.0004, 0.0075, Math.cos(b) * 0.011, 0.0105, Math.sin(b) * 0.011, { w: 4, rz: 1.2, ry: b })); }
    var acorn = [[0.006, 0.0088, 0.004], [-0.009, 0.0072, -0.003]];
    acorn.forEach(function (q) { parts.push(sph(0xc98a3d, 0.0017, q[0], q[1], q[2], { sy: 1.2, w: 6, h: 5 }), sph(0x6b4423, 0.0016, q[0], q[1] + 0.0013, q[2], { sy: 0.6, w: 6, h: 3 })); });
    return parts;
  }
  function leafpile() {
    var g = new T.Group(), pile = new T.Group(), A = asset('leaf', function () { return leafBits(11); });
    pile.add(meshOf(A)); g.add(pile);
    var LF = asset('leaf1', function () { return [sph(0xe8561f, 0.0045, 0, 0, 0, { sy: 0.14, sz: 0.55, w: 6, h: 3 }), cyl(BRN, 0.0003, 0.0003, 0.0035, -0.0048, 0, 0, { w: 3, rz: PI / 2 })]; }, 0.0001);
    var fl = meshOf(LF); g.add(fl); var f0 = ph();
    var dent = new T.Group(); g.add(dent);
    g.userData.pile = pile; g.userData.dent = dent; g.userData.fall = fl;
    g.userData.tick = function (t) {
      var u = ((t * 0.22 + f0) % 1), y = 0.052 - u * 0.043, a = t * 1.6 + f0;
      fl.position.set(0.004 + Math.sin(t * 1.3 + f0) * 0.011, y, Math.cos(t * 0.9 + f0) * 0.009); fl.rotation.set(Math.sin(a) * 0.9, a * 0.7, Math.cos(a * 1.3) * 0.9); fl.visible = u < 0.97;
    };
    return finish(g, 0.026);
  }
  function supper() {
    var g = new T.Group(), A = asset('supper', function () {
      var p = [], i, y0 = 0.0192, cr = [-0.016, -0.008, 0, 0.008, 0.016];
      for (i = 0; i < 3; i++) { var a = i * 2.094 + 0.5; p.push(cyl(WOOD, 0.0009, 0.0009, 0.0165, Math.cos(a) * 0.019, 0.00825, Math.sin(a) * 0.019, { w: 5 })); }
      p.push(cyl(0xd9b030, 0.0272, 0.0272, 0.0022, 0, 0.0176, 0, { w: 18, ink: 1 }), tor(0xb89418, 0.0272, 0.0011, 0, 0.0176, 0, { w: 18 }));
      p.push(cyl(CRM, 0.0258, 0.0258, 0.0005, 0, 0.0189, 0, { w: 18 }));
      cr.forEach(function (o) { var L = 2 * Math.sqrt(Math.max(0, 0.0255 * 0.0255 - o * o)); p.push(box(0xe05a4a, 0.0030, 0.0004, L, o, 0.0192, 0), box(0xe05a4a, L, 0.0004, 0.0030, 0, 0.0192, o)); });
      p.push(cyl(WHT, 0.0095, 0.0085, 0.0012, -0.008, y0 + 0.0008, 0.003, { w: 12 }), cyl(0xd89a52, 0.0078, 0.0072, 0.0045, -0.008, y0 + 0.003, 0.003, { w: 10, ink: 1 }), sph(0xe6ae58, 0.0074, -0.008, y0 + 0.0052, 0.003, { sy: 0.4, w: 10, h: 5 }));
      for (i = -1; i <= 1; i++) p.push(box(0xf6d28a, 0.0007, 0.0005, 0.013, -0.008 + i * 0.0038, y0 + 0.0074, 0.003), box(0xf6d28a, 0.013, 0.0005, 0.0007, -0.008, y0 + 0.0076, 0.003 + i * 0.0038));
      p.push(sph(0xee7d1f, 0.0064, 0.0125, y0 + 0.0056, 0.0085, { sy: 0.82, w: 9, h: 6, ink: 1 }), box(0x3f8a3a, 0.0012, 0.0024, 0.0012, 0.0125, y0 + 0.0126, 0.0085));
      p.push(cyl(GOLD, 0.0016, 0.0022, 0.0125, 0.0125, y0 + 0.0063, -0.0085, { w: 6, rz: 1.35, ry: 0.5, ink: 0.0003 }), cone(GRN, 0.0022, 0.0105, 0.0105, y0 + 0.004, -0.0085, { w: 4, rz: 1.35, ry: 0.5 }));
      p.push(sph(0xc88a45, 0.006, -0.0145, y0 + 0.0035, -0.0105, { sx: 1.5, sy: 0.72, sz: 1, w: 8, h: 5, ink: 1 }), box(0xf1d6a0, 0.0008, 0.0006, 0.004, -0.0145, y0 + 0.0072, -0.0105, { ry: 0.2 }));
      [[0x6a1a2a, 0.0105, y0 + 0.0022, -0.0015], [0xd63a2f, 0.0125, y0 + 0.0022, 0.0098]].forEach(function (a2) { });
      p.push(sph(0xd63a2f, 0.0029, 0.003, y0 + 0.0030, 0.0135), sph(0xc92d28, 0.0029, 0.0075, y0 + 0.0030, 0.0148), sph(0x8ac04a, 0.0029, 0.0055, y0 + 0.0052, 0.0138));
      for (i = 0; i < 7; i++) p.push(sph(0x8a4fb0, 0.0016, 0.021 + (i % 3) * 0.0016, y0 + 0.0014 + (i > 3 ? 0.0014 : 0), -0.001 + i * 0.0014, { w: 5, h: 4 }));
      [[0.0015, 0.0165], [0.0225, 0.001]].forEach(function (c) { });
      [[-0.0035, -0.016], [0.0228, 0.0035]].forEach(function (c) { p.push(cyl(0x5aa0d9, 0.0026, 0.0016, 0.0046, c[0], y0 + 0.0026, c[1], { w: 7, ink: 0.0003 }), tor(0xdcecf9, 0.0026, 0.0004, c[0], y0 + 0.0049, c[1], { w: 8 })); });
      p.push(cyl(SIL, 0.0036, 0.0042, 0.0012, 0.0015, y0 + 0.0008, -0.0015, { w: 9 }), cyl(CRM, 0.0017, 0.0017, 0.0072, 0.0015, y0 + 0.0050, -0.0015, { w: 6 }));
      [[-0.0215, 0.0185], [0.0235, -0.0105]].forEach(function (c) {
        for (i = 0; i < 3; i++) { var a3 = i * 2.094 + 0.3; p.push(cyl(WOOD, 0.0006, 0.0006, 0.0085, c[0] + Math.cos(a3) * 0.0034, 0.00425, c[1] + Math.sin(a3) * 0.0034, { w: 4 })); }
        p.push(cyl(TEAL, 0.0053, 0.0053, 0.0017, c[0], 0.0092, c[1], { w: 12, ink: 1 }), cyl(0x1d6b64, 0.0006, 0.0006, 0.0018, c[0] - 0.0013, 0.0093, c[1], { w: 4 }), cyl(0x1d6b64, 0.0006, 0.0006, 0.0018, c[0] + 0.0013, 0.0093, c[1], { w: 4 }));
      });
      return p;
    }, 0.0005);
    g.add(meshOf(A));
    var fl = new T.Mesh(asset('flame', function () { return [tcone(0xffd24a, 0.0015, 0.0048, 0, 0, 0, { w: 6 })]; }).g, glowMat(0xffa020, 1)); fl.position.set(0.0015, 0.0192 + 0.0086, -0.0015); g.add(fl);
    var gl = glow(0.05, 0.28, 0xffc870); gl.position.y = 0.032; g.add(gl); g.userData.glow = gl; var p0 = ph();
    g.userData.tick = function (t) { fl.scale.set(1 + 0.12 * Math.sin(t * 13 + p0), 1 + 0.25 * Math.sin(t * 9 + p0 * 2), 1); gl.material.opacity = 0.26 + 0.05 * Math.sin(t * 7 + p0) * Math.sin(t * 2.3); };
    return finish(g, 0.03);
  }
  function plantern() {
    var g = new T.Group(), A = asset('plantern', function () {
      var p = [cyl(0xc79a62, 0.0042, 0.0046, 0.0042, 0, 0.0021, 0, { w: 9, ink: 1 })], i;
      for (i = 0; i < 5; i++) p.push(sph(0x7a5a38, 0.0005, Math.cos(i * 1.26) * 0.003, 0.0042, Math.sin(i * 1.26) * 0.003, { w: 3, h: 2 }));
      p.push(cyl(WOOD, 0.0009, 0.0011, 0.0485, 0, 0.0265, 0, { w: 5 }), box(WOOD, 0.0125, 0.0014, 0.0014, 0.0055, 0.0504, 0), tor(GOLD, 0.0016, 0.0004, 0.0117, 0.0498, 0, { up: 1, w: 8, arc: PI * 1.5, ry: 0, rz: 0 }), sph(GOLD, 0.0014, 0, 0.0512, 0, { w: 5, h: 4 }));
      return p;
    }, 0.0004);
    g.add(meshOf(A));
    var head = new T.Group(); head.position.set(0.0115, 0.0488, 0); g.add(head);
    var B = asset('plbody', function () {
      var p = [cyl(DK, 0.0003, 0.0003, 0.004, 0, -0.002, 0, { w: 3 }), cyl(GOLD, 0.0017, 0.0026, 0.0016, 0, -0.0048, 0, { w: 8 }),
        sph(0xff6e2a, 0.0059, 0, -0.0117, 0, { sy: 1.16, w: 10, h: 7, ink: 1 }), tor(0xb8301a, 0.0058, 0.00045, 0, -0.0117, 0, { w: 12 }), tor(0xb8301a, 0.0049, 0.0004, 0, -0.0083, 0, { w: 12 }), tor(0xb8301a, 0.0049, 0.0004, 0, -0.0152, 0, { w: 12 }),
        cyl(GOLD, 0.0024, 0.0017, 0.0015, 0, -0.0186, 0, { w: 8 })], i;
      for (i = 0; i < 5; i++) p.push(cone(YEL, 0.0004, 0.0042, (i - 2) * 0.0007, -0.0213, 0, { w: 3 }));
      for (i = 0; i < 6; i++) p.push(sph(YEL, 0.0006, Math.cos(i * 1.047) * 0.0042, -0.0117 + Math.sin(i * 2.1) * 0.0018, Math.sin(i * 1.047) * 0.0042, { w: 4, h: 3 }));
      return p;
    }, 0.0004);
    var hm = meshOf(B, glowMat(0xff7a20, 0.55)); head.add(hm);
    var gl = glow(0.035, 0.5, 0xffa860); gl.position.set(0, -0.0117, 0); head.add(gl);
    g.userData.head = head; g.userData.glow = gl; return finish(g, 0.012);
  }
  /* ==================== ADVENT ==================== */
  var DOORCOL = [0xe0503f, 0xf09a30, 0x5dae4e, 0x4a90d9, 0xa67ad6, 0xe8c840];
  function pipGeo(s) {
    var r = 0.00105;
    if (s === 0) return new T.CylinderGeometry(r, r, 0.0004, 10);
    if (s === 1) return starGeo(r * 1.5, r * 0.65, 0.0003, 5).clone().rotateX(0);
    if (s === 2) return new T.CylinderGeometry(r * 1.25, r * 1.25, 0.0004, 3);
    if (s === 3) return new T.BoxGeometry(r * 1.6, 0.0004, r * 1.6);
    if (s === 4) return new T.CylinderGeometry(r * 1.3, r * 1.3, 0.0004, 4);
    return new T.TorusGeometry(r * 0.9, r * 0.4, 3, 9).rotateX(PI / 2);
  }
  function doorGeo(n) {
    var k = n - 1, sh = (k / 4) | 0, cnt = (k % 4) + 1, col = DOORCOL[(((k / 4) | 0) + (k % 4)) % 6], p = [], pos = {
      1: [[0, 0]], 2: [[-0.0015, 0], [0.0015, 0]], 3: [[-0.0016, 0.001], [0.0016, 0.001], [0, -0.0013]], 4: [[-0.0015, 0.0013], [0.0015, 0.0013], [-0.0015, -0.0013], [0.0015, -0.0013]]
    }[cnt], lite = 0xfff4d8;
    p.push(box(col, 0.0092, 0.0075, 0.0007, 0.0046, 0, 0));
    pos.forEach(function (q) {
      var g = pipGeo(sh), o = { rx: sh === 0 || sh === 2 || sh === 3 || sh === 4 ? PI / 2 : 0 };
      if (sh === 2) o.ry = 0; if (sh === 4) o.ry = 0;
      p.push(P(g, lite, 0.0046 + q[0], q[1], 0.00055, o));
    });
    p.push(sph(GOLD, 0.0007, 0.0083, -0.0026, 0.0006, { w: 5, h: 4 }));
    return bcMerge('dcdoor' + n, p);
  }
  function calendar() {
    var g = new T.Group(), doors = [], A = asset('calendar', function () {
      var p = [], r, c, W = 0.0125, H = 0.0097;
      p.push(box(0x8a5a30, 0.06, 0.0034, 0.027, 0, 0.0017, 0.0005, { ink: 1 }), box(0x9a6a3c, 0.0565, 0.0635, 0.004, 0, 0.0348, -0.0078, { ink: 1 }));
      p.push(box(0x7a4e2a, 0.0035, 0.0635, 0.0145, -0.0265, 0.0348, -0.0003), box(0x7a4e2a, 0.0035, 0.0635, 0.0145, 0.0265, 0.0348, -0.0003));
      for (r = 0; r < 6; r++) for (c = 0; c < 4; c++) {
        var x = (c - 1.5) * W, y = 0.0095 + r * H + 0.001, col = DOORCOL[(r + c * 2) % 6];
        p.push(box(col, 0.0118, 0.0092, 0.0124, x, y, 0), box(0x3a2418, 0.0094, 0.0072, 0.0002, x, y, 0.0063), sph(GOLD, 0.0015, x, y - 0.0004, 0.0059, { w: 5, h: 4 }), box(DK, 0.0118, 0.0014, 0.0124, x, y - 0.0039, 0), box(0xfff3dc, 0.0114, 0.0006, 0.002, x, y + 0.0046, 0.0052));
      }
      p.push(prism(0xd9483b, 0.067, 0.0165, 0.0285, 0, 0.0665, -0.0012, { ink: 1 }), prism(WHT, 0.0293, 0.0072, 0.0295, 0, 0.0752, -0.0012), sph(WHT, 0.0026, -0.0215, 0.0687, 0.0128, { w: 6, h: 4 }), sph(WHT, 0.0026, 0.0185, 0.0675, 0.0128, { w: 6, h: 4 }));
      for (c = 0; c < 4; c++) p.push(sph(FOIL[c + 1], 0.0013, (c - 1.5) * 0.0125, 0.0645, 0.0132, { w: 5, h: 4 }));
      return p;
    }, 0.0005);
    g.add(meshOf(A));
    var n, r2, c2;
    for (n = 1; n <= 24; n++) {
      r2 = ((n - 1) / 4) | 0; c2 = (n - 1) % 4; var x = (c2 - 1.5) * 0.0125, y = 0.0105 + r2 * 0.0097, hinge = new T.Group(); hinge.position.set(x - 0.0046, y, 0.0067);
      var door = new T.Mesh(doorGeo(n), glowMat(0x000000, 0.2)); hinge.add(door); g.add(hinge); doors[n] = { hinge: hinge, door: door };
    }
    var st = new T.Mesh(asset('calstar', function () { return [star(GOLD, 0.0052, 0.0022, 0.0016, 0, 0, 0, { ink: 0.0004 })]; }).g, glowMat(0x9a6a10, 1)); at(st, 0, 0.0872, -0.0012); g.add(st);
    var gl = glow(0.07, 0, 0xffe0a0); gl.position.set(0, 0.034, 0.012); g.add(gl); g.userData.doors = doors; g.userData.glow = gl; var p0 = ph();
    g.userData.tick = function (t) { st.rotation.y = Math.sin(t * 1.1 + p0) * 0.5; var s = 1 + 0.1 * Math.sin(t * 3.4 + p0); st.scale.set(s, s, s); };
    return finish(g, 0.034);
  }
  function pinetree() {
    var g = new T.Group(), tiers = [[0.0045, 9, 0.0095, 0.0050, 0.0075], [0.0120, 8, 0.0085, 0.0043, 0.0064], [0.0192, 7, 0.0075, 0.0037, 0.0052], [0.0258, 6, 0.0064, 0.0031, 0.0040], [0.0312, 5, 0.0052, 0.0027, 0.0028], [0.0358, 4, 0.0040, 0.0022, 0.0014]];
    function R(y) { var u = (y - 0.005) / 0.0405; return 0.0112 * (1 - Math.max(0, Math.min(1, u))) + 0.0022; }
    var A = asset('pine', function () {
      var p = [cyl(BRN, 0.0022, 0.0034, 0.037, 0, 0.0215, 0, { w: 6 })], i, j, gc = [GRN, LGRN, DGRN];
      p.push(cyl(0xb8c0c8, 0.0124, 0.0134, 0.0036, 0, 0.0018, 0, { w: 14, ink: 1 }), cyl(RED, 0.0128, 0.0128, 0.0009, 0, 0.0023, 0, { w: 14 }), cyl(0x9aa4ae, 0.0112, 0.0112, 0.0004, 0, 0.0037, 0, { w: 14 }));
      for (i = 0; i < 14; i++) p.push(box(0x9aa4ae, 0.0016, 0.0034, 0.0009, Math.cos(i / 14 * TAU) * 0.0136, 0.0018, Math.sin(i / 14 * TAU) * 0.0136, { ry: -i / 14 * TAU }));
      tiers.forEach(function (tr, ti) {
        for (j = 0; j < tr[1]; j++) {
          var a = j / tr[1] * TAU + ti * 0.55;
          p.push(tcone(gc[(j + ti) % 3], tr[3] * 1.2, tr[2] * 1.1, Math.cos(a) * tr[4] * 0.3, tr[0], Math.sin(a) * tr[4] * 0.3, { w: 5, rz: -(PI / 2 + 0.32), ry: -a, ink: 0.0004 }));
          if (j % 3 === 0) p.push(sph(WHT, 0.0008, Math.cos(a) * (tr[4] * 0.3 + tr[2] * 0.93), tr[0] - tr[2] * 0.3, Math.sin(a) * (tr[4] * 0.3 + tr[2] * 0.93), { w: 4, h: 3 }));
        }
      });
      p.push(tcone(GRN, 0.0026, 0.007, 0, 0.0398, 0, { w: 5, ink: 0.0004 }));
      for (i = 0; i < 46; i++) { var u = i / 46, y = 0.0075 + u * 0.034, a2 = u * TAU * 3.3; p.push(sph(i % 2 ? 0xf2f2ea : 0xffd24a, 0.0006, Math.cos(a2) * (R(y) + 0.0004), y, Math.sin(a2) * (R(y) + 0.0004), { w: 4, h: 3 })); }
      p.push(box(RED, 0.0046, 0.0042, 0.0046, 0.0128, 0.0058, 0.0042, { ry: 0.4, ink: 0.0003 }), box(GOLD, 0.0008, 0.0044, 0.0048, 0.0128, 0.0058, 0.0042, { ry: 0.4 }), box(GOLD, 0.0048, 0.0044, 0.0008, 0.0128, 0.0058, 0.0042, { ry: 0.4 }), sph(GOLD, 0.0012, 0.0128, 0.0084, 0.0042, { w: 5, h: 4 }));
      p.push(box(BLU, 0.0036, 0.0034, 0.0036, -0.0112, 0.0054, -0.0058, { ry: -0.5, ink: 0.0003 }), box(WHT, 0.0007, 0.0036, 0.0038, -0.0112, 0.0054, -0.0058, { ry: -0.5 }), sph(WHT, 0.001, -0.0112, 0.0075, -0.0058, { w: 5, h: 4 }));
      return p;
    }, 0.0005);
    g.add(meshOf(A));
    function baub(set) {
      return asset('pbaub' + set, function () {
        var p = [], i, warm = [RED, GOLD, ORG, PNK], cool = [BLU, PUR, TEAL, 0xff5f5f];
        for (i = 0; i < 6; i++) {
          var ti = (i + (set ? 1 : 0)) % 6, tr = tiers[Math.min(ti, 4)], a = (i * 2.4 + set * 1.3) % TAU, d = tr[4] * 0.3 + tr[2] * 0.78, y = tr[0] - tr[2] * 0.2, col = (set ? cool : warm)[i % 4];
          p.push(sph(col, 0.0018, Math.cos(a) * d, y, Math.sin(a) * d, { w: 7, h: 5 }), cyl(GOLD, 0.0008, 0.0009, 0.0007, Math.cos(a) * d, y + 0.0019, Math.sin(a) * d, { w: 6 }), sph(WHT, 0.0005, Math.cos(a) * d + 0.0006, y + 0.0007, Math.sin(a) * d + 0.001, { w: 3, h: 3 }));
        }
        return p;
      }, 0.0003);
    }
    var bA = new T.Mesh(baub(0).g, glowMat(0x703010, 0.5)), bB = new T.Mesh(baub(1).g, glowMat(0x103a70, 0.5)); g.add(bA, bB);
    var s = new T.Mesh(asset('pstar', function () { return [star(GOLD, 0.0046, 0.0019, 0.0017, 0, 0, 0, { ink: 0.0004 })]; }).g, glowMat(0x8a6410, 1));
    var inkm = new T.Mesh(asset('pstar', null).ink, inkMat()); inkm.renderOrder = -1; s.add(inkm); at(s, 0, 0.0505, 0); g.add(s);
    var gl = glow(0.04, 0.5, 0xffe9a8); gl.position.y = 0.0505; g.add(gl); g.userData.star = s; g.userData.glow = gl; var p0 = ph();
    g.userData.tick = function (t) { bA.material.emissiveIntensity = 0.25 + 0.75 * Math.max(0, Math.sin(t * 2.6 + p0)); bB.material.emissiveIntensity = 0.25 + 0.75 * Math.max(0, Math.sin(t * 2.6 + p0 + PI)); var k = 1 + 0.08 * Math.sin(t * 4 + p0); s.scale.set(k, k, k); };
    return finish(g, 0.018);
  }
  function chain() {
    var g = new T.Group(), sway = new T.Group(); sway.position.y = 0.0335; g.add(sway);
    var HX = 0.0275, HY = 0.0335;
    var A = asset('chain', function () {
      var p = [], i, N = 15, cols = [RED, GOLD, GRN, BLU, PNK, PUR, ORG];
      [-1, 1].forEach(function (s) { p.push(cyl(WOOD, 0.0011, 0.0011, 0.0345, s * HX, 0.01725, 0, { w: 5 }), sph(GOLD, 0.0019, s * HX, 0.0352, 0, { w: 6, h: 5, ink: 0.0003 }), cyl(0xc79a62, 0.0045, 0.0048, 0.0022, s * HX, 0.0011, 0, { w: 8, ink: 0.0004 })); });
      for (i = 0; i < N; i++) {
        var u = i / (N - 1) * 2 - 1, x = u * (HX - 0.002), y = HY - 0.0135 * (1 - u * u);
        var tang = Math.atan2(2 * 0.0135 * u / (HX - 0.002), 1), col = cols[i % 7], alt = i % 2;
        var loop = cyl(col, 0.0026, 0.0026, 0.0038, x, y, 0, { w: 10, open: true, rx: PI / 2, rz: tang, sx: 1.5, sz: 1 });
        if (alt) { loop = cyl(col, 0.0026, 0.0026, 0.0038, x, y, 0, { w: 10, open: true, rz: tang, sx: 1.5, sz: 1 }); loop.rx = 0; loop.ry = 0; }
        p.push(loop);
        var band = cyl(WHT, 0.00275, 0.00275, 0.0011, x, y, 0, { w: 10, open: true, rx: alt ? 0 : PI / 2, rz: tang, sx: 1.5, sz: 1 }); p.push(band);
        if (i % 4 === 2) { p.push(cyl(DK, 0.0002, 0.0002, 0.0042, x, y - 0.0046, 0, { w: 3 }), star(cols[(i + 1) % 7], 0.0021, 0.0009, 0.0007, x, y - 0.0071, 0, { ry: 0.5 })); }
      }
      return p;
    }, 0.0003);
    var body = meshOf(A, glowMat(0x2a2010, 0.5)); body.position.y = -0.0335; sway.add(body);
    g.userData.sway = sway; var p0 = ph();
    g.userData.tick = function (t) { sway.rotation.x = Math.sin(t * 1.5 + p0) * 0.05; body.material.emissiveIntensity = 0.35 + 0.2 * Math.sin(t * 3.1 + p0); };
    return finish(g, 0.03);
  }
  function stocking() {
    var g = new T.Group(), A = asset('stbase', function () {
      return [box(WOOD, 0.028, 0.0022, 0.0125, 0, 0.0011, 0, { ink: 1 }), box(0xc89a58, 0.0015, 0.0022, 0.0125, -0.0095, 0.0022, 0), cyl(WOOD, 0.0012, 0.0013, 0.0405, -0.011, 0.0225, 0, { w: 5, ink: 0.0003 }), box(WOOD, 0.0235, 0.0016, 0.0016, 0.0005, 0.0405, 0, { ink: 0.0003 }), sph(GOLD, 0.0019, -0.011, 0.0422, 0, { w: 6, h: 5 }), sph(GOLD, 0.0016, 0.0126, 0.0405, 0, { w: 6, h: 5 }), tor(GOLD, 0.0017, 0.0004, 0.009, 0.0398, 0, { up: 1, w: 8 })];
    }, 0.0004);
    g.add(meshOf(A));
    var swing = new T.Group(); swing.position.set(0.009, 0.0395, 0); g.add(swing);
    var S = asset('stsock', function () {
      var p = [], i, cuffY = -0.0062, bands = 6;
      p.push(cyl(DK, 0.0003, 0.0003, 0.0022, 0, -0.0012, 0, { w: 3 }));
      for (i = 0; i < 6; i++) p.push(cyl(i % 2 ? WHT : RED, 0.0039, 0.0039, 0.0036, 0, -0.0095 - i * 0.0022, 0, { w: 10, rz: 0.4 * (i % 2 ? 1 : 1), ink: i === 0 ? 0 : 0 }));
      p.push(cyl(RED, 0.0043, 0.0043, 0.0112, 0, -0.0137, 0, { w: 10, ink: 0.0004 }));
      p.push(sph(RED, 0.0042, 0, -0.0205, 0, { w: 8, h: 6, ink: 0.0004 }), cyl(RED, 0.0038, 0.0038, 0.0072, 0.0036, -0.0205, 0, { w: 9, rz: PI / 2, ink: 0.0004 }), sph(GRN, 0.0039, 0.0074, -0.0205, 0, { w: 8, h: 6, ink: 0.0004 }), sph(GRN, 0.0026, -0.0027, -0.0222, 0.0012, { w: 6, h: 5 }));
      for (i = 0; i < 4; i++) p.push(box(i % 2 ? RED : WHT, 0.0032, 0.0016, 0.0086, 0.0036 + i * 0.0011, -0.0206 + (i % 2 ? 0.0004 : 0), 0, { ry: 0 }));
      p.push(tor(WHT, 0.0042, 0.0016, 0, cuffY, 0, { w: 10, h: 5, ink: 0.0004 }));
      for (i = 0; i < 9; i++) { var a = i / 9 * TAU; p.push(sph(WHT, 0.0016, Math.cos(a) * 0.0045, cuffY + (i % 2) * 0.0008, Math.sin(a) * 0.0045, { w: 5, h: 4 })); }
      for (i = 0; i < 8; i++) p.push(cyl(i % 2 ? WHT : RED, 0.0006, 0.0006, 0.0014, 0.0018, 0.0002 + i * 0.0014 - 0.0, 0.0008, { w: 4 }));
      return p;
    }, 0.0004);
    var sm = meshOf(S); sm.position.y = 0; swing.add(sm);
    var I = asset('stgoodies', function () {
      var p = [], i;
      for (i = 0; i < 6; i++) p.push(cyl(i % 2 ? WHT : RED, 0.0007, 0.0007, 0.0026, -0.0015, -0.0016 + i * 0.0026 - 0.0, 0.0006, { w: 5 }));
      p.push(tor(RED, 0.0016, 0.0007, -0.0015 + 0.0017, 0.0126, 0.0006, { up: 1, w: 8, arc: PI * 0.9, rz: 0, ry: 0 }));
      p.push(box(BLU, 0.0036, 0.0034, 0.0036, 0.0016, -0.0036, -0.0004, { ry: 0.4 }), box(GOLD, 0.0007, 0.0036, 0.0038, 0.0016, -0.0036, -0.0004, { ry: 0.4 }), sph(GOLD, 0.0011, 0.0016, -0.0016, -0.0004, { w: 5, h: 4 }));
      p.push(star(GOLD, 0.0024, 0.001, 0.0008, -0.0034, -0.0015, 0.0008, { rz: 0.3 }));
      return p;
    }, 0.0003);
    var im = meshOf(I, glowMat(0x302008, 0.5)); swing.add(im); g.userData.sway = swing; var p0 = ph();
    g.userData.tick = function (t) { swing.rotation.z = Math.sin(t * 1.3 + p0) * 0.07 + Math.sin(t * 2.9 + p0) * 0.02; im.material.emissiveIntensity = 0.4 + 0.3 * Math.sin(t * 3 + p0); };
    return finish(g, 0.02);
  }
  function snowman() {
    var g = new T.Group(), body = new T.Group(), R = rng(5); g.add(body);
    var A = asset('smbody', function () {
      var p = [sph(WHT, 0.0095, 0, 0.0093, 0, { w: 12, h: 8, ink: 1 }), sph(WHT, 0.0072, 0, 0.0228, 0, { w: 11, h: 7, ink: 1 })], i, a, b;
      var tint = [0xf6fbff, 0xe9f2fb, 0xffffff, 0xeaf3fa];
      for (i = 0; i < 11; i++) { a = R() * TAU; b = 0.3 + R() * 2.4; p.push(sph(tint[i % 4], 0.0029, Math.sin(b) * Math.cos(a) * 0.0087, 0.0093 + Math.cos(b) * 0.0087, Math.sin(b) * Math.sin(a) * 0.0087, { w: 6, h: 4 })); }
      for (i = 0; i < 8; i++) { a = R() * TAU; b = 0.4 + R() * 2.0; p.push(sph(tint[i % 4], 0.0024, Math.sin(b) * Math.cos(a) * 0.0066, 0.0228 + Math.cos(b) * 0.0066, Math.sin(b) * Math.sin(a) * 0.0066, { w: 6, h: 4 })); }
      p.push(tor(RED, 0.0049, 0.0014, 0, 0.0292, 0, { w: 12, h: 5, ink: 0.0003 }), tor(WHT, 0.0050, 0.00135, 0, 0.0283, 0, { w: 12, h: 5, arc: PI * 1.0, rz: 0 }), tor(RED, 0.0049, 0.0013, 0, 0.0275, 0, { w: 12, h: 5 }));
      p.push(box(RED, 0.0024, 0.0092, 0.0011, 0.0033, 0.0236, 0.0063, { rz: 0.1, ink: 0.0003 }), box(WHT, 0.0025, 0.0011, 0.0012, 0.0034, 0.0225, 0.0063, { rz: 0.1 }), box(WHT, 0.0025, 0.0011, 0.0012, 0.0036, 0.0205, 0.0063, { rz: 0.1 }));
      [[RED, 0.0243, 0.0069], [BLU, 0.0222, 0.0072], [GOLD, 0.0201, 0.0069]].forEach(function (q) { p.push(sph(q[0], 0.00085, 0, q[1], q[2], { w: 5, h: 4 }), sph(WHT, 0.0003, 0.0002, q[1] + 0.0002, q[2] + 0.0007, { w: 3, h: 2 })); });
      [-1, 1].forEach(function (s) { p.push(cyl(DWOOD, 0.00055, 0.0004, 0.0105, s * 0.0112, 0.0273, 0, { w: 4, rz: -s * 1.0, ink: 0.0002 }), cyl(DWOOD, 0.0003, 0.0003, 0.0028, s * 0.0166, 0.0322, 0, { w: 3, rz: -s * 0.35 }), cyl(DWOOD, 0.0003, 0.0003, 0.0026, s * 0.0170, 0.0300, 0, { w: 3, rz: -s * 1.6 })); });
      for (i = 0; i < 3; i++) p.push(sph(0xcfdbe6, 0.0016, Math.cos(i * 2.1) * 0.0107, 0.0014, Math.sin(i * 2.1) * 0.0107, { sy: 0.5, w: 5, h: 3 }));
      return p;
    }, 0.0005);
    body.add(meshOf(A));
    var head = new T.Group(); head.position.set(0, 0.0292, 0); g.add(head);
    var H = asset('smhead', function () {
      var p = [sph(WHT, 0.0054, 0, 0.0046, 0, { w: 11, h: 8, ink: 1 })], i, a;
      for (i = 0; i < 7; i++) { a = i * 0.9; p.push(sph(i % 2 ? 0xf6fbff : 0xe9f2fb, 0.0022, Math.cos(a) * 0.0044, 0.0046 + Math.sin(i * 2.2) * 0.0034, Math.sin(a) * 0.0044, { w: 5, h: 4 })); }
      p.push(sph(DK, 0.00065, -0.00185, 0.0054, 0.0049, { w: 4, h: 3 }), sph(DK, 0.00065, 0.00185, 0.0054, 0.0049, { w: 4, h: 3 }), sph(WHT, 0.0002, -0.0016, 0.0056, 0.0054, { w: 3, h: 2 }), sph(WHT, 0.0002, 0.0021, 0.0056, 0.0054, { w: 3, h: 2 }));
      p.push(sph(0xee8d33, 0.001, 0, 0.0041, 0.0062, { sz: 3, w: 6, h: 5, ink: 0.0002 }), sph(0xb85a1a, 0.0004, 0, 0.0041, 0.0092, { w: 3, h: 3 }));
      [-2, -1, 0, 1, 2].forEach(function (k) { p.push(sph(DK, 0.00045, k * 0.0012, 0.0022 - Math.abs(k) * 0.00018 + (Math.abs(k) === 2 ? 0.0004 : 0), 0.0051, { w: 3, h: 3 })); });
      p.push(sph(0xff9aa8, 0.0009, -0.0034, 0.0036, 0.0041, { sz: 0.4, w: 5, h: 4 }), sph(0xff9aa8, 0.0009, 0.0034, 0.0036, 0.0041, { sz: 0.4, w: 5, h: 4 }));
      p.push(sph(RED, 0.0056, 0, 0.0079, -0.0003, { sy: 0.66, w: 10, h: 6, ink: 0.0004 }), tor(WHT, 0.0050, 0.0013, 0, 0.0066, 0, { w: 12, h: 5, ink: 0.0003 }), sph(WHT, 0.0019, 0, 0.0121, 0, { w: 6, h: 5, ink: 0.0003 }));
      return p;
    }, 0.0005);
    head.add(meshOf(H));
    var fx = points(12, 0.0022, 0xffffff), pos = fx.userData.pos, seeds = [], i; for (i = 0; i < 12; i++) seeds.push([R() * TAU, 0.012 + R() * 0.012, R(), 0.4 + R() * 0.5]);
    fx.material.opacity = 0.9; g.add(fx);
    g.userData.head = head; g.userData.body = body; var p0 = ph();
    g.userData.tick = function (t) {
      var k = 1 + 0.012 * Math.sin(t * 1.6 + p0); body.scale.set(1, k, 1);
      for (var j = 0; j < 12; j++) { var s = seeds[j], u = (t * 0.18 * s[3] + s[2]) % 1; pos[j * 3] = Math.cos(s[0] + t * 0.3 * s[3]) * s[1]; pos[j * 3 + 1] = 0.054 - u * 0.052; pos[j * 3 + 2] = Math.sin(s[0] + t * 0.3 * s[3]) * s[1]; }
      fx.geometry.attributes.position.needsUpdate = true;
    };
    return finish(g, 0.016);
  }
  function sledge() {
    var g = new T.Group(), A = asset('sledge', function () {
      var p = [], i, s;
      [-1, 1].forEach(function (z) {
        p.push(box(RED, 0.029, 0.0016, 0.0022, -0.001, 0.0011, z * 0.0068, { ink: 0.0003 }));
        var px = 0.0135, py = 0.0011, th = 0, L = 0.0026; for (i = 0; i < 4; i++) { th += 0.42; p.push(box(RED, L + 0.0004, 0.0016, 0.0022, px + Math.cos(th) * L / 2, py + Math.sin(th) * L / 2, z * 0.0068, { rz: th })); px += Math.cos(th) * L; py += Math.sin(th) * L; }
        p.push(sph(GOLD, 0.0011, px, py + 0.0004, z * 0.0068, { w: 5, h: 4 }));
        [-0.0095, 0.0095].forEach(function (x) { p.push(cyl(WOOD, 0.0009, 0.0009, 0.0036, x, 0.0036, z * 0.0068, { w: 5 })); });
      });
      [-1, 0, 1].forEach(function (z, k) { p.push(box(k % 2 ? 0xe8c892 : 0xdcb67e, 0.0315, 0.0013, 0.0043, 0, 0.0059, z * 0.0046, { ink: 0.0003 }), sph(k % 2 ? 0xe8c892 : 0xdcb67e, 0.0022, 0.0157, 0.0059, z * 0.0046, { sx: 0.5, sy: 0.3, sz: 1, w: 5, h: 4 }), sph(k % 2 ? 0xe8c892 : 0xdcb67e, 0.0022, -0.0157, 0.0059, z * 0.0046, { sx: 0.5, sy: 0.3, sz: 1, w: 5, h: 4 })); });
      p.push(box(DWOOD, 0.0012, 0.001, 0.0182, 0.0105, 0.005, 0), box(DWOOD, 0.0012, 0.001, 0.0182, -0.0105, 0.005, 0));
      p.push(box(RED, 0.0062, 0.0046, 0.0052, -0.0065, 0.0089, 0.0004, { ry: 0.25, ink: 0.0003 }), box(GOLD, 0.0008, 0.0048, 0.0054, -0.0065, 0.0089, 0.0004, { ry: 0.25 }), box(GOLD, 0.0064, 0.0048, 0.0008, -0.0065, 0.0089, 0.0004, { ry: 0.25 }), sph(GOLD, 0.0012, -0.0065, 0.0117, 0.0004, { w: 5, h: 4 }), sph(GOLD, 0.0009, -0.0057, 0.0118, 0.0004, { w: 4, h: 3 }));
      p.push(cyl(BLU, 0.0034, 0.0034, 0.0013, 0.0058, 0.0071, 0.0006, { w: 9, ink: 0.0003 }), sph(WHT, 0.0012, 0.0058, 0.0083, 0.0006, { w: 5, h: 4 }));
      var cx = 0.0178, cz = 0, ang = 0;
      for (i = 0; i < 12; i++) { ang += 0.18 * Math.sin(i * 0.9 + 0.5) + 0.04; cx += Math.cos(ang) * 0.0018; cz += Math.sin(ang) * 0.0018; p.push(sph(i % 2 ? WHT : RED, 0.0005, cx, 0.0014 + (i < 2 ? (2 - i) * 0.0014 : 0), cz, { w: 4, h: 3 })); }
      p.push(tor(RED, 0.0016, 0.0005, cx + 0.0016, 0.0009, cz, { w: 8 }));
      return p;
    }, 0.0004);
    g.add(meshOf(A)); return finish(g, 0.022);
  }
  function igloo() {
    var g = new T.Group(), A = asset('igloo', function () {
      var p = [], Rd = 0.0215, rows = [[0.16, 17], [0.45, 13], [0.76, 9], [1.08, 5], [1.4, 1]], tints = [0xf4f9fd, 0xd6e8f6, 0xc4dcf0, 0xe6f1fa], i, j;
      p.push(sph(0xcfe0ee, Rd * 0.965, 0, 0, 0, { sy: 1, w: 14, h: 8, ink: 1 }));
      p.push(cyl(0xf4f9fd, 0.0268, 0.0268, 0.0008, 0, 0.0004, 0.0008, { w: 18 }));
      rows.forEach(function (rw, ri) {
        var e = rw[0], n = rw[1], ry = Rd * Math.cos(e), yy = Rd * Math.sin(e) * 0.99;
        for (j = 0; j < n; j++) {
          var a = (j + (ri % 2) * 0.5) / n * TAU; if (ri < 3 && Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) - PI / 2) < (ri === 0 ? 0.36 : ri === 1 ? 0.3 : 0.2)) continue;
          var bw = (TAU * ry / n) * 0.62 + 0.0008; if (n === 1) bw = 0.0068;
          p.push(sph(tints[(j + ri) % 4], 1, Math.cos(a) * ry, yy, Math.sin(a) * ry, { w: 6, h: 4, sx: Math.max(0.0038, bw), sy: 0.0034, sz: 0.0048, ry: -(a + PI / 2), rx: 0, rz: 0 }));
        }
      });
      for (i = 0; i < 9; i++) { var th = i / 8 * PI, ca = Math.cos(th) * 0.0062, sa = Math.sin(th) * 0.0062; p.push(sph(tints[i % 4], 0.0033, ca, sa, 0.0214, { sz: 1.1, w: 6, h: 4 }), sph(tints[(i + 1) % 4], 0.0033, ca * 1.05, sa * 1.05, 0.0245, { sz: 1.1, w: 6, h: 4 }));  }
      p.push(P(new T.CircleGeometry(0.0054, 12, 0, PI), 0x25344a, 0, 0.0004, 0.0264, {}), P(new T.CircleGeometry(0.0054, 12, 0, PI), 0x3a4f6e, 0, 0.0004, 0.0236, {}));
      for (i = 0; i < 5; i++) p.push(tcone(0xd7ecf8, 0.0004, 0.0032 + (i % 2) * 0.0014, (i - 2) * 0.0024, 0.0058 - Math.abs(i - 2) * 0.0003, 0.0262, { w: 4, rz: PI }));
      return p;
    }, 0.0005);
    g.add(meshOf(A));
    var dg = glow(0.016, 0.5, 0xffb060); dg.position.set(0, 0.003, 0.0235); g.add(dg); g.userData.glow = dg; var p0 = ph();
    g.userData.tick = function (t) { dg.material.opacity = 0.42 + 0.14 * Math.sin(t * 3 + p0) + 0.06 * Math.sin(t * 7.3 + p0); };
    return finish(g, 0.028);
  }
  /* ==================== WINTER, SPRING, SUMMER ==================== */
  function daisy() {
    var g = new T.Group(), ring = new T.Group(); ring.rotation.x = -0.18; ring.position.y = 0.004; g.add(ring);
    var A = asset('daisy', function () {
      var p = [tor(0x6fae55, 0.0125, 0.0009, 0, 0, 0, { w: 24, h: 4 })], i, j, r = rng(9);
      for (i = 0; i < 9; i++) {
        var a = i / 9 * TAU, x = Math.cos(a) * 0.0125, z = Math.sin(a) * 0.0125, big = i % 3 !== 1, pr = big ? 0.0034 : 0.0026;
        if (i % 3 === 1) { p.push(sph(0xfff0f4, 0.0017, x, 0.0016, z, { w: 5, h: 4, ink: 0 }), sph(0xff9ab4, 0.0012, x, 0.0024, z, { w: 4, h: 3 })); continue; }
        for (j = 0; j < 8; j++) { var b = j / 8 * TAU + a * 2; p.push(sph(WHT, 1, x + Math.cos(b) * pr * 0.62, 0.0012 + (j % 2) * 0.0002, z + Math.sin(b) * pr * 0.62, { w: 5, h: 3, sx: pr * 0.55, sy: 0.0005, sz: pr * 0.3, ry: -b })); }
        p.push(sph(0xffcc2a, 0.0014, x, 0.0017, z, { sy: 0.8, w: 6, h: 4 }));
        p.push(sph(0x7bb661, 0.0016, x + Math.cos(a + 0.6) * 0.0055, 0.0004, z + Math.sin(a + 0.6) * 0.0055, { sy: 0.2, sx: 1.6, w: 5, h: 3, ry: -(a + 0.6) }));
      }
      return p;
    }, 0.0003);
    ring.add(meshOf(A));
    var bee = new T.Mesh(asset('bee', function () { return [sph(YEL, 0.0014, 0, 0, 0, { sx: 1.3, w: 6, h: 5 }), sph(DK, 0.0013, -0.0003, 0, 0, { sx: 0.35, sy: 1.0, sz: 1.0, w: 5, h: 4 }), sph(0xdff4ff, 0.0012, 0, 0.0012, 0.0011, { sy: 0.2, w: 5, h: 3 }), sph(0xdff4ff, 0.0012, 0, 0.0012, -0.0011, { sy: 0.2, w: 5, h: 3 })]; }, 0.0002).g, bodyMat());
    g.add(bee); var p0 = ph();
    g.userData.bee = bee;
    g.userData.tick = function (t) { var a = t * 1.1 + p0; bee.position.set(Math.cos(a) * 0.0185, 0.011 + Math.sin(t * 5) * 0.0012 + Math.sin(a * 2) * 0.002, Math.sin(a) * 0.0185); bee.rotation.y = -a - PI / 2 * 0; bee.rotation.z = Math.sin(t * 20) * 0.15; };
    return finish(g, 0.02);
  }
  function scarecrow() {
    var g = new T.Group(), A = asset('scare', function () {
      var p = [], i;
      p.push(sph(0x6b4a2a, 0.0075, 0, 0.0005, 0, { sy: 0.4, w: 8, h: 4, ink: 1 }), sph(0x9aa0a8, 0.0016, 0.006, 0.0014, 0.003, { w: 4, h: 3 }), sph(0x9aa0a8, 0.0012, -0.006, 0.0011, -0.004, { w: 4, h: 3 }));
      p.push(cyl(DWOOD, 0.0012, 0.0015, 0.062, 0, 0.031, 0, { w: 5 }), box(DWOOD, 0.043, 0.0022, 0.0022, 0, 0.0405, 0, { ink: 0.0003 }));
      p.push(cone(0xc9964f, 0.0092, 0.0245, 0, 0.0135, 0, { w: 8, sz: 0.75, ink: 1 }), P(new T.CylinderGeometry(0.0094, 0.0094, 0.0016, 8), 0xa8743a, 0, 0.0158, 0, { sz: 0.75 }));
      p.push(box(0x5a8fd9, 0.0058, 0.0052, 0.0006, -0.0028, 0.0285, 0.0069, { rz: 0.1 }), box(0xd9483b, 0.0045, 0.0045, 0.0006, 0.0034, 0.0205, 0.0073, { rz: -0.1 }), box(0xffe9b0, 0.0035, 0.0003, 0.0007, -0.0028, 0.0285, 0.0071, { rz: 0.1 }));
      p.push(sph(0xe8cf9a, 0.0068, 0, 0.0535, 0, { w: 9, h: 7, ink: 1 }), sph(0x2a6fb5, 0.0011, -0.0025, 0.0545, 0.0061, { sy: 1, sz: 0.5, w: 5, h: 4 }), sph(0xd9483b, 0.0011, 0.0025, 0.0545, 0.0061, { sz: 0.5, w: 5, h: 4 }), sph(DK, 0.0003, -0.0025, 0.0545, 0.0067, { w: 3, h: 3 }), sph(DK, 0.0003, 0.0025, 0.0545, 0.0067, { w: 3, h: 3 }));
      p.push(sph(0xd0705a, 0.0007, 0, 0.0525, 0.0067, { w: 4, h: 3 }));
      for (i = -2; i <= 2; i++) p.push(sph(DK, 0.00028, i * 0.0011, 0.0498 + Math.abs(i) * 0.0003, 0.0063, { w: 3, h: 2 }));
      p.push(cyl(0xe6c05a, 0.0108, 0.0108, 0.0012, 0, 0.0582, 0, { w: 12, ink: 0.0004 }), cyl(0xe6c05a, 0.0059, 0.0066, 0.0066, 0, 0.0620, 0, { w: 10, ink: 0.0004 }), tor(0xb8381f, 0.0063, 0.0009, 0, 0.0598, 0, { w: 10 }), sph(0xd9483b, 0.0016, 0.0063, 0.0600, 0, { w: 4, h: 3 }));
      for (i = 0; i < 9; i++) { var a = i / 9 * TAU; p.push(cone(0xf0c84a, 0.0004, 0.005, Math.cos(a) * 0.011, 0.0576, Math.sin(a) * 0.011, { w: 3, rz: -Math.cos(a) * 1.2, rx: Math.sin(a) * 1.2 })); }
      [-1, 1].forEach(function (s) {
        for (i = 0; i < 4; i++) p.push(cone(0xf0c84a, 0.0004, 0.0075, s * 0.0222, 0.0405 + (i - 1.5) * 0.0009, (i - 1.5) * 0.0012, { w: 3, rz: -s * 1.5 }));
        p.push(cyl(0xc9964f, 0.0027, 0.0036, 0.0082, s * 0.0180, 0.0405, 0, { w: 6, rz: s * PI / 2 }));
      });
      for (i = 0; i < 5; i++) p.push(cone(0xf0c84a, 0.0004, 0.0055, (i - 2) * 0.0013, 0.0125, 0.0036, { w: 3, rx: PI + 0.3 }));
      return p;
    }, 0.0005);
    g.add(meshOf(A));
    var crow = new T.Group(); crow.position.set(-0.0145, 0.0428, 0); g.add(crow);
    var CR = asset('crow', function () { return [sph(0x2b2d3a, 0.0033, 0, 0.0030, 0, { sx: 1.2, w: 7, h: 5, ink: 0.0003 }), sph(0x2b2d3a, 0.0021, 0.0034, 0.0058, 0, { w: 6, h: 4, ink: 0.0003 }), cone(0xf0a030, 0.0009, 0.0028, 0.0058, 0.0057, 0, { w: 4, rz: -PI / 2 }), sph(WHT, 0.0006, 0.0042, 0.0063, 0.0012, { w: 3, h: 3 }), sph(DK, 0.0003, 0.0044, 0.0063, 0.0014, { w: 3, h: 2 }), cone(0x2b2d3a, 0.0011, 0.0042, -0.0050, 0.0024, 0, { w: 4, rz: PI / 2 + 0.25 }), box(0x1b1d28, 0.0036, 0.0014, 0.0008, -0.0004, 0.0034, 0.0030, { ry: 0.3 }), box(0x1b1d28, 0.0036, 0.0014, 0.0008, -0.0004, 0.0034, -0.0030, { ry: -0.3 })]; }, 0.0003);
    var cm = meshOf(CR); crow.add(cm);
    g.userData.crow = crow; var p0 = ph();
    g.userData.tick = function (t) { var pk = Math.max(0, Math.sin(t * 0.9 + p0) - 0.7) / 0.3; crow.rotation.z = -pk * 0.5 + Math.sin(t * 2 + p0) * 0.03; var c = 1.2 * Math.sin(t * 0.37 + p0 * 2); crow.rotation.y = c > 0.9 ? 0.6 : 0; };
    return finish(g, 0.02);
  }
  function starMk() {
    var g = new T.Group(), A = asset('starpole', function () {
      var p = [], i;
      for (i = 0; i < 8; i++) p.push(cyl(i % 2 ? WHT : RED, 0.0011, 0.0011, 0.0056, 0, 0.0036 + i * 0.0055, 0, { w: 5, ink: 0 }));
      p.push(cyl(SIL, 0.0072, 0.0078, 0.0034, 0, 0.0017, 0, { w: 12, ink: 1 }), tor(0xaab4be, 0.0075, 0.0007, 0, 0.0034, 0, { w: 12 }), sph(WHT, 0.0052, 0, 0.0036, 0, { sy: 0.45, w: 8, h: 5 }), sph(WHT, 0.0032, 0.0045, 0.0034, 0.002, { sy: 0.6, w: 6, h: 4 }));
      p.push(sph(GOLD, 0.0015, 0, 0.0476, 0, { w: 6, h: 4, ink: 0.0003 }));
      return p;
    }, 0.0004);
    g.add(meshOf(A));
    var S = asset('bigstar', function () { return [star(GOLD, 0.0105, 0.0043, 0.0042, 0, 0, 0, { ink: 0.0005 })]; }), sm = new T.Mesh(S.g, glowMat(0x7a5208, 0.5));
    var ik = new T.Mesh(S.ink, inkMat()); ik.renderOrder = -1; sm.add(ik); at(sm, 0, 0.0585, 0); g.add(sm);
    var gl = glow(0.07, 0.6, 0xffe9a8); gl.position.y = 0.0585; g.add(gl);
    var sp = [sparkSprite(0.0042), sparkSprite(0.0036), sparkSprite(0.003)]; sp.forEach(function (s) { s.position.y = 0.0585; g.add(s); });
    g.userData.star = sm; g.userData.glow = gl; var p0 = ph();
    g.userData.tick = function (t) {
      var k = 1 + 0.07 * Math.sin(t * 3.3 + p0); sm.scale.set(k, k, k); sm.position.y = 0.0585 + Math.sin(t * 1.7 + p0) * 0.0012;
      for (var i = 0; i < 3; i++) { var a = t * (1.3 + i * 0.4) + p0 + i * 2.1, v = Math.max(0, Math.sin(t * 3 + i * 2 + p0)); sp[i].position.set(Math.cos(a) * 0.0105, 0.0585 + Math.sin(a * 1.3) * 0.0085, Math.sin(a) * 0.0105); sp[i].material.opacity = v; }
    };
    return finish(g, 0.016);
  }
  function sparkle() {
    var g = new T.Group(), A = asset('sparkle', function () {
      var p = [], i;
      p.push(cyl(SIL, 0.0085, 0.0095, 0.0032, 0, 0.0016, 0, { w: 12, ink: 1 }), tor(0xaab4be, 0.0092, 0.0008, 0, 0.0032, 0, { w: 12 }));
      for (i = 0; i < 4; i++) p.push(cyl(i % 2 ? GOLD : RED, 0.0052, 0.0052, 0.0044, 0, 0.0054 + i * 0.0044, 0, { w: 10, ink: i === 0 ? 1 : 0 }));
      p.push(tor(DK, 0.0052, 0.0006, 0, 0.0248, 0, { w: 10 }), cyl(0x3a2a1a, 0.0036, 0.0036, 0.0008, 0, 0.0252, 0, { w: 8 }), sph(0xffa020, 0.0016, 0, 0.0256, 0, { w: 5, h: 4 }));
      for (i = 0; i < 6; i++) p.push(sph(FOIL[i], 0.0011, Math.cos(i * 1.047) * 0.0066, 0.0045 + (i % 2) * 0.0038, Math.sin(i * 1.047) * 0.0066, { w: 4, h: 3 }));
      return p;
    }, 0.0004);
    g.add(meshOf(A));
    var ring = new T.Group(); ring.position.y = 0.032; g.add(ring);
    var RS = asset('sparkring', function () { var p = [], i; for (i = 0; i < 7; i++) { var a = i / 7 * TAU; p.push(star(FOIL[i], 0.0027, 0.0012, 0.0012, Math.cos(a) * 0.0125, Math.sin(i * 1.3) * 0.006, Math.sin(a) * 0.0125, { ry: -a, rz: i })); } return p; }, 0.0002);
    ring.add(new T.Mesh(RS.g, glowMat(0x806020, 1)));
    var N = 30, fx = points(N, 0.0062, 0xffe7a0), pos = fx.userData.pos, col = fx.geometry.attributes.color, cc = new T.Color(), seeds = [], r = rng(3), i; for (i = 0; i < N; i++) { seeds.push([r() * TAU, 0.006 + r() * 0.009, r(), 0.22 + r() * 0.14]); cc.setHex(FOIL[i % 7]).lerp(new T.Color(0xffffff), 0.4); col.setXYZ(i, cc.r, cc.g, cc.b); }
    g.add(fx);
    var gl = glow(0.05, 0.5, 0xffe9a8); gl.position.y = 0.03; g.add(gl); g.userData.ring = ring; g.userData.glow = gl; var p0 = ph();
    g.userData.tick = function (t) {
      for (var j = 0; j < N; j++) { var s = seeds[j], u = ((t * 0.7 + s[2] * 3 + p0) % 1.6) / 1.6, vh = 0.05 * s[3] * 4, x = Math.cos(s[0]) * s[1] * u * 1.6, z = Math.sin(s[0]) * s[1] * u * 1.6; pos[j * 3] = x; pos[j * 3 + 1] = 0.027 + vh * u * 1.0 - 0.09 * u * u * 0.9; pos[j * 3 + 2] = z; if (u > 0.9) pos[j * 3 + 1] = -1; }
      fx.geometry.attributes.position.needsUpdate = true; gl.material.opacity = 0.42 + 0.12 * Math.sin(t * 5 + p0);
    };
    return finish(g, 0.02);
  }
  function kite() {
    var g = new T.Group(), A = asset('kitepole', function () {
      var p = [], i;
      for (i = 0; i < 8; i++) p.push(cyl(i % 2 ? WHT : BLU, 0.0011, 0.0013, 0.0066, 0, 0.0033 + i * 0.0062, 0, { w: 5 }));
      p.push(cyl(0xc79a62, 0.0048, 0.0052, 0.0024, 0, 0.0012, 0, { w: 8, ink: 1 }), cyl(0xe0402f, 0.0027, 0.0027, 0.0036, 0.0022, 0.0426, 0.0024, { w: 8, rz: PI / 2, ink: 0.0003 }), cyl(WHT, 0.0030, 0.0030, 0.0004, 0.0004, 0.0426, 0.0024, { w: 8, rz: PI / 2 }), cyl(WHT, 0.0030, 0.0030, 0.0004, 0.0040, 0.0426, 0.0024, { w: 8, rz: PI / 2 }));
      return p;
    }, 0.0004);
    g.add(meshOf(A));
    var k = new T.Group(); k.position.set(0.01, 0.0525, 0); g.add(k);
    var Ks = asset('kitesail', function () {
      var p = [], w = 0.0135, h = 0.0165, sp = 0.4;
      var cols = [RED, GOLD, BLU, GRN];
      [RED, GOLD, RED, GOLD].forEach(function (c, q) { p.push(P(kiteGeo(w, h, 0.0016, sp, q), c, 0, 0, 0, {})); });
      p.push(cyl(DK, 0.0002, 0.0002, 0.0104, -0.005, -0.0053, 0.0004, { w: 3, rz: 1.2 }));
      p.push(box(DWOOD, 0.0004, h * 1.0, 0.0004, 0, h * (1 - sp) / 2 - h * sp / 2, 0.0009), box(DWOOD, w, 0.0004, 0.0004, 0, 0, 0.0016));
      return p;
    }, 0.0004);
    var sail = new T.Mesh(Ks.g, bodyMat()); k.add(sail);
    var Tl = asset('kitetail', function () {
      var p = [], i; for (i = 0; i < 6; i++) { var y = -0.0075 - i * 0.0062, x = Math.sin(i * 1.1) * 0.0022; p.push(cyl(DK, 0.0002, 0.0002, 0.0066, x, y + 0.0031, 0, { w: 3 }), cone(FOIL[(i + 1) % 7], 0.0022, 0.0034, x - 0.0017, y - 0.0003, 0, { w: 4, rz: PI / 2 + 0.3 }), cone(FOIL[(i + 1) % 7], 0.0022, 0.0034, x + 0.0017, y - 0.0003, 0, { w: 4, rz: -PI / 2 - 0.3 }), sph(FOIL[(i + 2) % 7], 0.0009, x, y - 0.0003, 0, { w: 4, h: 3 })); }
      return p;
    }, 0.0002);
    var tl = new T.Group(); tl.position.set(0, -0.0045, 0.0003); var tm = meshOf(Tl); tl.add(tm); k.add(tl);
    g.userData.kite = k; var p0 = ph();
    g.userData.tick = function (t) { tl.rotation.z = Math.sin(t * 2.6 + p0) * 0.28; tl.rotation.x = Math.sin(t * 1.9 + p0) * 0.25; sail.rotation.y = Math.sin(t * 2.2 + p0) * 0.12; };
    return finish(g, 0.016);
  }
  function paddle() {
    var g = new T.Group(), A = asset('paddle', function () {
      var p = [], i;
      p.push(cyl(0xd94a3b, 0.0238, 0.0214, 0.0058, 0, 0.0029, 0, { w: 22, open: true }), tor(0xd94a3b, 0.0226, 0.0030, 0, 0.0057, 0, { w: 22, h: 6, ink: 1 }), tor(0xb83428, 0.0206, 0.0012, 0, 0.0026, 0, { w: 22, h: 4 }));
      for (i = 0; i < 20; i++) { var a = i / 20 * TAU; p.push(box(0xb83428, 0.0016, 0.0044, 0.0013, Math.cos(a) * 0.0236, 0.0036, Math.sin(a) * 0.0236, { ry: -a })); }
      p.push(cyl(0x5cc0ee, 0.0205, 0.0205, 0.0036, 0, 0.0030, 0, { w: 22 }), cyl(0xa8e6fa, 0.0170, 0.0170, 0.0003, 0, 0.0049, 0, { w: 22 }));
      p.push(tor(WHT, 0.0140, 0.0004, 0, 0.0052, 0, { w: 14, arc: 1.4, rz: 0 }), tor(WHT, 0.0105, 0.0003, 0, 0.0052, 0, { w: 12, arc: 1.0 }));
      var bx = -0.0112, bz = 0.0078; p.push(sph(YEL, 0.0034, bx, 0.0078, bz, { w: 8, h: 6, ink: 0.0003 }), tor(RED, 0.0034, 0.0004, bx, 0.0078, bz, { w: 8 }), tor(WHT, 0.0034, 0.0004, bx, 0.0078, bz, { w: 8, rx: 1, ry: 0.6, up: 0 }));
      [[0.0128, 0.0056, 0.0085, 0.0013], [0.0148, 0.0058, -0.0014, 0.0009], [-0.0042, 0.0058, -0.0118, 0.0011]].forEach(function (b) { p.push(sph(WHT, b[3], b[0], b[1] + 0.0006, b[2], { w: 5, h: 4 })); });
      return p;
    }, 0.0005);
    g.add(meshOf(A));
    var duck = new T.Group(); duck.position.set(0.004, 0.0068, 0); g.add(duck);
    var D = asset('duck', function () { return [sph(YEL, 0.0056, 0, 0.0008, 0, { sx: 1.2, sy: 0.85, sz: 0.9, w: 9, h: 7, ink: 0.0003 }), sph(YEL, 0.0036, 0.0046, 0.0054, 0, { w: 8, h: 6, ink: 0.0003 }), cyl(ORG, 0.0013, 0.0015, 0.0034, 0.0083, 0.0050, 0, { w: 5, rz: -PI / 2 }), sph(DK, 0.0005, 0.0063, 0.0066, 0.0021, { w: 4, h: 3 }), sph(DK, 0.0005, 0.0063, 0.0066, -0.0021, { w: 4, h: 3 }), sph(0xf0c020, 0.0031, -0.0004, 0.0015, 0.0044, { sx: 1.4, sy: 0.7, sz: 0.4, w: 6, h: 4 }), sph(0xf0c020, 0.0031, -0.0004, 0.0015, -0.0044, { sx: 1.4, sy: 0.7, sz: 0.4, w: 6, h: 4 }), cone(YEL, 0.0015, 0.0032, -0.0066, 0.0020, 0, { w: 4, rz: PI / 2 + 0.5 })]; }, 0.0003);
    duck.add(meshOf(D));
    var rp = new T.Mesh(asset('ripple', function () { return [tor(WHT, 0.0045, 0.0002, 0, 0, 0, { w: 16, h: 3 })]; }).g, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false })); g.add(rp);
    g.userData.duck = duck; var p0 = ph();
    g.userData.tick = function (t) { var u = (t * 0.6 + p0) % 1; rp.position.set(duck.position.x, 0.0053, duck.position.z); rp.scale.setScalar(0.8 + u * 2.4); rp.material.opacity = 0.55 * (1 - u); duck.position.y = 0.0068 + Math.sin(t * 2.4 + p0) * 0.0004; duck.rotation.z = Math.sin(t * 2.1 + p0) * 0.05; };
    return finish(g, 0.026);
  }

  var MK = { leafpile: leafpile, supper: supper, plantern: plantern, calendar: calendar, pinetree: pinetree, chain: chain, stocking: stocking, snowman: snowman, sledge: sledge, daisy: daisy, scarecrow: scarecrow, star: starMk, sparkle: sparkle, igloo: igloo, kite: kite, paddle: paddle };
  var API = { version: 1, keys: Object.keys(MK) };
  API.init = function (api) {
    T = api.THREE; BCP = api.BCP; bcMerge = api.bcMerge; M = api.M;
    M(0xffffff); /* makes sure the shared toon gradient exists */
    if (!BCP.toon) BCP.toon = new T.MeshToonMaterial({ vertexColors: true, gradientMap: BCP.grad, side: T.DoubleSide });
    if (!BCP.inks) BCP.inks = {};
    m4 = new T.Matrix4(); q4 = new T.Quaternion(); e4 = new T.Euler(); v3 = new T.Vector3(); s3 = new T.Vector3();
    ASSETS = {}; SH = {}; ready = true;
  };
  Object.keys(MK).forEach(function (k) { API[k] = function () { if (!ready) throw new Error('decor.js: init() first'); return MK[k](); }; });
  root.BC_DECOR_MK = API;
})(window);
