/* Base Camp market (build 23): window.BC_MARKET_MK. The market idea is Harry's ("on Wednesdays and Sundays the colonies hold a market day"); the model is by CAIRN.
   Three tiny stalls round a bell post, made from household things at creature scale (a creature is about 5 cm):
   a matchbox stall with a striped awning, a bottle-cap counter on a stack of buttons under a cocktail umbrella, and a thread-spool table with a pennant.
   A ring of bunting runs from stall to stall. Built like models/decor.js: the body is ONE merged vertex-coloured geometry (the game's bcMerge, the shared BCP.toon)
   plus ONE ink hull; the goods (open), the covers (closed) and the bell are their own meshes so the game can show, hide and swing them.
   The game calls BC_MARKET_MK.init({THREE, BCP, bcMerge, M}) once, then BC_MARKET_MK.market(). userData: goods, covers, bell, slots ([x, z] in front of each stall), bcMarket = 1.
   If this file is missing or throws, index.html builds a plain market from the festival stalls. No letters on any object. */
(function (root) {
  'use strict';
  var T, BCP, bcMerge, ready = false, ASSETS = {}, SH = {};
  var PI = Math.PI, TAU = Math.PI * 2, INK = 0x1a1410;
  var RED = 0xe0402f, CRM = 0xfff3dc, WOOD = 0xd09a5a, DWOOD = 0x92602e, BRN = 0x7a4b28, DK = 0x2a1a10, SIL = 0xb9c2ca, GOLD = 0xffc82e, BLU = 0x3f86dd, GRN = 0x2f9e4f, PNK = 0xff6f91, PUR = 0x9a62d6, ORG = 0xf08a24, YEL = 0xffe14a, TEAL = 0x39b0a4;
  var FLAGS = [RED, GOLD, GRN, BLU, PNK, ORG, PUR];
  /* the stall layout, shared with index.html (MKT_A, MKT_RS, MKT_RSLOT, MKT_SC): three stalls at these angles round the bell post, each facing outwards */
  var ANG = [PI / 2, PI / 2 + TAU / 3, PI / 2 + 2 * TAU / 3], RS = 0.027, RSLOT = 0.056, SC = 1.3; /* SC: the whole market is drawn a little bigger than the parts, so the stalls stand taller than a creature */

  function P(g, c, x, y, z, o) { o = o || {}; return { g: g, c: c, x: x || 0, y: y || 0, z: z || 0, rx: o.rx, ry: o.ry, rz: o.rz, sx: o.sx, sy: o.sy, sz: o.sz, ink: o.ink }; }
  function sph(c, r, x, y, z, o) { o = o || {}; return P(o.half ? new T.SphereGeometry(r, o.w || 8, o.h || 6, 0, TAU, 0, PI / 2) : new T.SphereGeometry(r, o.w || 8, o.h || 6), c, x, y, z, o); }
  function box(c, w, h, d, x, y, z, o) { return P(new T.BoxGeometry(w, h, d), c, x, y, z, o); }
  function cyl(c, rt, rb, h, x, y, z, o) { o = o || {}; return P(new T.CylinderGeometry(rt, rb, h, o.w || 8, 1, !!o.open), c, x, y, z, o); }
  function tcone(c, r, h, x, y, z, o) { o = o || {}; var g = new T.ConeGeometry(r, h, o.w || 5); g.translate(0, h / 2, 0); return P(g, c, x, y, z, o); }

  /* a part list placed in a stall's frame (front = +z), turned and moved to the stall's place round the post */
  function placeParts(parts, a) {
    var ry = Math.atan2(Math.cos(a), Math.sin(a)), cx = Math.cos(a) * RS, cz = Math.sin(a) * RS, c = Math.cos(ry), s = Math.sin(ry);
    parts.forEach(function (p) { var x = p.x, z = p.z; p.x = cx + x * c + z * s; p.z = cz - x * s + z * c; p.ry = (p.ry || 0) + ry; });
    return parts;
  }
  /* ---- merged geometry and an ink hull, as in decor.js ---- */
  var m4, q4, e4, v3, s3;
  function xform(p) { var sx = p.sx === undefined ? 1 : p.sx; return m4.compose(v3.set(p.x || 0, p.y || 0, p.z || 0), q4.setFromEuler(e4.set(p.rx || 0, p.ry || 0, p.rz || 0, 'YXZ')), s3.set(sx, p.sy === undefined ? sx : p.sy, p.sz === undefined ? sx : p.sz)); }
  function inkGeo(parts, t0) {
    var out = [], any = false;
    parts.forEach(function (p) {
      if (!p.ink) return; any = true; var t = p.ink === true || p.ink === 1 ? t0 : p.ink;
      var g = p.g.index ? p.g.toNonIndexed() : p.g.clone(); g.applyMatrix4(xform(p)); var A = g.attributes.position.array, n = A.length / 9, acc = {}, i, k;
      var key = function (j) { return Math.round(A[j] * 1e5) + ',' + Math.round(A[j + 1] * 1e5) + ',' + Math.round(A[j + 2] * 1e5); };
      for (i = 0; i < n; i++) {
        var o = i * 9, ux = A[o + 3] - A[o], uy = A[o + 4] - A[o + 1], uz = A[o + 5] - A[o + 2], vx = A[o + 6] - A[o], vy = A[o + 7] - A[o + 1], vz = A[o + 8] - A[o + 2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        for (k = 0; k < 3; k++) { var kk = key(o + k * 3), a = acc[kk] || (acc[kk] = [0, 0, 0]); a[0] += nx; a[1] += ny; a[2] += nz; }
      }
      for (i = 0; i < n * 3; i++) { var a2 = acc[key(i * 3)], l = Math.sqrt(a2[0] * a2[0] + a2[1] * a2[1] + a2[2] * a2[2]) || 1; out.push(A[i * 3] + a2[0] / l * t, A[i * 3 + 1] + a2[1] / l * t, A[i * 3 + 2] + a2[2] / l * t); }
    });
    if (!any) return null; var g3 = new T.BufferGeometry(); g3.setAttribute('position', new T.Float32BufferAttribute(out, 3)); g3.computeBoundingSphere(); return g3;
  }
  /* bcMerge composes with the default Euler order; parts are pre-baked here with YXZ (turn first, then tilt) so a tilted awning slat turns with its stall */
  function bake(parts) {
    return parts.map(function (p) { var g = p.g.index ? p.g.toNonIndexed() : p.g.clone(); g.applyMatrix4(xform(p)); return { g: g, c: p.c }; });
  }
  function asset(key, build, inkT) {
    var A = ASSETS[key]; if (A) return A; var parts = build();
    return (ASSETS[key] = { g: bcMerge('mk_' + key, bake(parts)), ink: inkGeo(parts, inkT || 0.0005) });
  }
  function inkMat() { return BCP.inks[INK] || (BCP.inks[INK] = new T.MeshBasicMaterial({ color: INK, side: T.BackSide, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 })); }
  function meshOf(A, mat) { var m = new T.Mesh(A.g, mat || BCP.toon); if (A.ink) { var k = new T.Mesh(A.ink, inkMat()); k.renderOrder = -1; k.userData.ink = 1; m.add(k); } return m; }
  function blob(r) {
    if (!SH.blobM) {
      var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(40,25,10,.5)'); gr.addColorStop(1, 'rgba(40,25,10,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      SH.blobM = new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }); SH.blobG = new T.PlaneGeometry(1, 1).rotateX(-PI / 2);
    }
    var s = new T.Mesh(SH.blobG, SH.blobM); s.scale.set(r * 2, 1, r * 2); s.position.y = 0.0006; s.renderOrder = 2; return s;
  }

  /* ---- the three stalls, in their own frame: front +z, about 2.8 cm wide ---- */
  function matchboxStall() { /* a matchbox on its side with the drawer pulled out as the counter, four cocktail sticks and a striped awning */
    var p = [];
    p.push(box(RED, 0.028, 0.013, 0.016, 0, 0.0065, -0.002, { ink: 1 }), box(YEL, 0.0285, 0.0035, 0.0163, 0, 0.0095, -0.002), box(0x6b3a22, 0.0286, 0.0012, 0.0164, 0, 0.0028, -0.002)); /* the sleeve: red, a yellow band, a striker strip */
    p.push(box(CRM, 0.025, 0.0012, 0.013, 0, 0.0136, 0.003, { ink: 1 })); /* the drawer, pulled half out on top */
    p.push(box(CRM, 0.025, 0.0035, 0.0010, 0, 0.0152, 0.0095), box(CRM, 0.025, 0.0035, 0.0010, 0, 0.0152, -0.0035), box(CRM, 0.0010, 0.0035, 0.013, -0.012, 0.0152, 0.003), box(CRM, 0.0010, 0.0035, 0.013, 0.012, 0.0152, 0.003));
    [[-0.0125, -0.008, 0.05], [0.0125, -0.008, 0.05], [-0.0125, 0.010, 0.04], [0.0125, 0.010, 0.04]].forEach(function (q) { p.push(cyl(WOOD, 0.0007, 0.0007, q[2], q[0], q[2] / 2, q[1], { w: 5 })); });
    for (var i = 0; i < 6; i++) p.push(box(i % 2 ? CRM : RED, 0.0048, 0.0012, 0.022, -0.012 + i * 0.0048, 0.0455, 0.001, { rx: 0.42, ink: 1 })); /* awning slats, lower at the front */
    for (i = 0; i < 6; i++) p.push(tcone(i % 2 ? CRM : RED, 0.0024, 0.004, -0.012 + i * 0.0048, 0.0392, 0.0108, { w: 3, rx: PI, sz: 0.35 })); /* scalloped edge */
    return p;
  }
  function capCounter() { /* a bottle cap, upside down on a stack of three buttons, under a paper cocktail umbrella */
    var p = [], i, b = [[0xd9483b, 0.0105], [0xffc82e, 0.0095], [0x3f86dd, 0.0105]];
    b.forEach(function (q, k) { p.push(cyl(q[0], q[1], q[1], 0.0034, 0, 0.0017 + k * 0.0036, 0.001, { w: 14, ink: k === 0 ? 1 : 0 })); for (var h = 0; h < 4; h++) p.push(cyl(DK, 0.0009, 0.0009, 0.0036, Math.cos(h * PI / 2 + 0.6) * 0.0032, 0.0017 + k * 0.0036 + 0.0002, 0.001 + Math.sin(h * PI / 2 + 0.6) * 0.0032, { w: 5 })); });
    p.push(cyl(SIL, 0.0135, 0.0125, 0.0045, 0, 0.0131, 0.001, { w: 20, ink: 1 }), cyl(0xdde3e8, 0.0118, 0.0118, 0.0006, 0, 0.0155, 0.001, { w: 20 }));
    for (i = 0; i < 21; i++) { var a = i / 21 * TAU; p.push(box(SIL, 0.0019, 0.0046, 0.0012, Math.cos(a) * 0.0134, 0.0131, 0.001 + Math.sin(a) * 0.0134, { ry: -a })); } /* the crimped edge */
    p.push(cyl(WOOD, 0.0006, 0.0006, 0.05, -0.0105, 0.025, -0.008, { w: 5 }));
    p.push(tcone(PNK, 0.017, 0.008, -0.0105, 0.046, -0.008, { w: 10, ink: 1 }), tcone(CRM, 0.0172, 0.0012, -0.0105, 0.0455, -0.008, { w: 10 }));
    for (i = 0; i < 5; i++) { var r = i / 5 * TAU; p.push(box(CRM, 0.0006, 0.0006, 0.0165, -0.0105 + Math.cos(r) * 0.0076, 0.0498, -0.008 + Math.sin(r) * 0.0076, { ry: -r + PI / 2, rx: 0.45 })); }
    p.push(sph(YEL, 0.0012, -0.0105, 0.0545, -0.008, { w: 6, h: 4 }));
    return p;
  }
  function spoolTable() { /* a wooden thread spool as a table, a lolly-stick shelf and a pennant on a stick */
    var p = [];
    p.push(cyl(WOOD, 0.0125, 0.0125, 0.0026, 0, 0.0013, 0, { w: 16, ink: 1 }), cyl(0x4fa0d8, 0.0088, 0.0088, 0.0118, 0, 0.0085, 0, { w: 16, ink: 1 }), cyl(WOOD, 0.0128, 0.0128, 0.0026, 0, 0.0157, 0, { w: 16, ink: 1 }));
    for (var i = 0; i < 5; i++) p.push(cyl(0x3a82bd, 0.0089, 0.0089, 0.0007, 0, 0.0042 + i * 0.002, 0, { w: 16 })); /* thread lines */
    p.push(cyl(DWOOD, 0.0035, 0.0035, 0.0007, 0, 0.0173, 0, { w: 10 })); /* the spool's hole, plugged with a cork */
    p.push(box(0xe8c890, 0.024, 0.0016, 0.0058, 0.002, 0.0046, 0.0125, { ink: 1 }), box(0xe8c890, 0.0016, 0.0046, 0.004, -0.0085, 0.0023, 0.0125), box(0xe8c890, 0.0016, 0.0046, 0.004, 0.0125, 0.0023, 0.0125)); /* a lolly-stick bench in front */
    p.push(cyl(WOOD, 0.0007, 0.0007, 0.052, 0.0118, 0.026, -0.006, { w: 5 }));
    p.push(P(new T.ConeGeometry(0.0048, 0.016, 3).rotateZ(-PI / 2), TEAL, 0.0198, 0.047, -0.006, { sz: 0.18, ink: 0.0003 }), sph(GOLD, 0.0013, 0.0118, 0.0527, -0.006, { w: 6, h: 4 }));
    return p;
  }
  function bodyParts() {
    var parts = [], mk = [matchboxStall, capCounter, spoolTable], tops = [];
    mk.forEach(function (f, i) { parts = parts.concat(placeParts(f(), ANG[i])); });
    /* the bell post in the middle, a little cloth on the ground, and the poles the bunting hangs from */
    parts.push(cyl(0xc9a26a, 0.0145, 0.0145, 0.0008, 0, 0.0004, 0, { w: 18 }), cyl(0xe6c79a, 0.0105, 0.0105, 0.0009, 0, 0.0006, 0, { w: 18 }));
    parts.push(cyl(DWOOD, 0.0011, 0.0013, 0.06, 0, 0.03, 0, { w: 6, ink: 0.0004 }), box(DWOOD, 0.012, 0.0014, 0.0014, 0.005, 0.0585, 0, {}), sph(GOLD, 0.0018, 0, 0.0612, 0, { w: 8, h: 6 }));
    [[-0.0125, -0.008, 0.049], [-0.0105, -0.008, 0.044], [0.0118, -0.006, 0.050]].forEach(function (q, i) { var a = ANG[i], ry = Math.atan2(Math.cos(a), Math.sin(a)), c = Math.cos(ry), s = Math.sin(ry); tops.push([Math.cos(a) * RS + q[0] * c + q[1] * s, q[2], Math.sin(a) * RS - q[0] * s + q[1] * c]); });
    tops.forEach(function (A, k) { /* a ring of bunting from stall to stall */
      var tp = tops[(k + 1) % 3], n = 6, i; for (i = 0; i <= n; i++) {
        var u = i / n, x = A[0] + (tp[0] - A[0]) * u, z = A[2] + (tp[2] - A[2]) * u, y = A[1] + (tp[1] - A[1]) * u - Math.sin(u * PI) * 0.006;
        if (i < n) { var u2 = (i + 1) / n, x2 = A[0] + (tp[0] - A[0]) * u2, z2 = A[2] + (tp[2] - A[2]) * u2, y2 = A[1] + (tp[1] - A[1]) * u2 - Math.sin(u2 * PI) * 0.006, L = Math.hypot(x2 - x, y2 - y, z2 - z);
          parts.push(P(new T.CylinderGeometry(0.00035, 0.00035, L, 3).rotateX(PI / 2), 0x4a3a2a, (x + x2) / 2, (y + y2) / 2, (z + z2) / 2, { ry: Math.atan2(x2 - x, z2 - z), rx: -Math.atan2(y2 - y, Math.hypot(x2 - x, z2 - z)) }));
          parts.push(P(new T.ConeGeometry(0.0022, 0.0055, 3).rotateX(PI), FLAGS[(i + k * 3) % FLAGS.length], (x + x2) / 2, (y + y2) / 2 - 0.0029, (z + z2) / 2, { ry: Math.atan2(x2 - x, z2 - z) + PI / 2, sz: 0.25 }));
        }
      }
    });
    return parts;
  }
  /* the goods on show on a market day: seeds and acorns in the drawer, thimbles of water and a crumb on the cap, matchstick bundles and a button on the spool */
  function goodsParts() {
    var A = [], B = [], C = [], i;
    for (i = 0; i < 4; i++) A.push(sph(0x8a5a2b, 0.0016, -0.008 + i * 0.0045, 0.0152, 0.0045 + (i % 2) * 0.003, { sy: 0.65, w: 6, h: 4 }));
    [[0.008, 0.002], [-0.002, 0.0075]].forEach(function (q) { A.push(sph(0xc98a3d, 0.0021, q[0], 0.0163, q[1], { sy: 1.2, w: 6, h: 5 }), sph(0x6b4423, 0.0021, q[0], 0.0183, q[1], { sy: 0.55, w: 6, h: 3 })); });
    A.push(sph(PUR, 0.0019, 0.004, 0.0159, 0.0005, { w: 6, h: 5 }), sph(GOLD, 0.0016, -0.006, 0.0158, 0.0005, { w: 6, h: 5 })); /* beads */
    [[-0.005, 0.003], [0.0045, 0.0045]].forEach(function (q) { B.push(cyl(SIL, 0.0024, 0.0029, 0.0052, q[0], 0.0184, 0.001 + q[1], { w: 10 }), cyl(BLU, 0.0021, 0.0021, 0.0006, q[0], 0.0211, 0.001 + q[1], { w: 10 }), sph(0x9fd8ff, 0.0012, q[0] - 0.0006, 0.0215, 0.001 + q[1], { w: 5, h: 4 })); });
    B.push(sph(0xe3b36b, 0.0034, 0.002, 0.0175, -0.005, { sy: 0.7, w: 7, h: 5 }), sph(0x7fd36a, 0.0019, -0.0045, 0.0172, -0.0045, { w: 6, h: 5 }));
    for (i = 0; i < 4; i++) { C.push(cyl(0xf3d9a8, 0.00055, 0.00055, 0.011, -0.004 + (i % 2) * 0.0013, 0.0181 + Math.floor(i / 2) * 0.0011, -0.002 + i * 0.0003, { w: 4, rz: PI / 2 }), sph(RED, 0.0009, 0.0015 + (i % 2) * 0.0013, 0.0181 + Math.floor(i / 2) * 0.0011, -0.002 + i * 0.0003, { w: 5, h: 4 })); }
    C.push(cyl(0xff8a3d, 0.0035, 0.0035, 0.0011, 0.004, 0.0176, 0.004, { w: 12 })); for (i = 0; i < 2; i++) C.push(cyl(DK, 0.0006, 0.0006, 0.0013, 0.004 + (i ? 0.0011 : -0.0011), 0.0177, 0.004, { w: 4 }));
    C.push(box(0x8fd16f, 0.006, 0.0012, 0.004, 0.004, 0.0060, 0.0125), box(0xffd27a, 0.004, 0.0024, 0.003, -0.003, 0.0066, 0.0125)); /* a leaf and a wrapped crumb on the bench */
    return placeParts(A, ANG[0]).concat(placeParts(B, ANG[1]), placeParts(C, ANG[2]));
  }
  /* the covers on a quiet day: a checked tea towel thrown over each counter, hanging down the front */
  function coverParts() {
    var out = [], tw = [[0x4f86c8, 0.031, 0.019, 0.0165, 0.003], [0xd0596e, 0.030, 0.030, 0.0172, 0.001], [0x5e9e4c, 0.028, 0.028, 0.0184, 0]]; /* mid-tone: pale colours clip to white under the room's light */
    tw.forEach(function (q, i) {
      var p = [], col = q[0], w = q[1], d = q[2], y = q[3], z0 = q[4];
      p.push(box(col, w, 0.0016, d, 0, y, z0, { ink: 1 }), box(col, w, 0.011, 0.0012, 0, y - 0.0055, z0 + d / 2, { rx: -0.08, ink: 1 }));
      for (var k = 0; k < 3; k++) p.push(box(0xe9dcc4, w + 0.0002, 0.0017, 0.0022, 0, y + 0.0001, z0 - d / 2 + 0.004 + k * (d - 0.008) / 2), box(0xe9dcc4, w + 0.0002, 0.0018, 0.0013, 0, y - 0.0025 - k * 0.0035, z0 + d / 2 + 0.0002, { rx: -0.08 }));
      p.push(sph(0xe9d8b8, 0.0026, w * 0.3, y + 0.0018, z0 - 0.002, { sy: 0.45, w: 6, h: 4 })); /* a pebble holds it down */
      out = out.concat(placeParts(p, ANG[i]));
    });
    return out;
  }
  function market() {
    var g = new T.Group(), inner = new T.Group(); inner.scale.setScalar(SC); g.add(inner);
    inner.add(meshOf(asset('body', bodyParts, 0.0005)));
    var goods = meshOf(asset('goods', goodsParts, 0)); goods.name = 'mktGoods'; inner.add(goods);
    var covers = meshOf(asset('covers', coverParts, 0.0005)); covers.name = 'mktCovers'; inner.add(covers); goods.visible = false;
    var bell = new T.Group(); bell.position.set(0.0095, 0.0578, 0); inner.add(bell);
    bell.add(meshOf(asset('bell', function () { return [sph(GOLD, 0.0034, 0, -0.0042, 0, { w: 10, h: 6, half: 1, ink: 0.0003 }), cyl(GOLD, 0.0034, 0.0038, 0.0012, 0, -0.0042, 0, { w: 10 }), cyl(DWOOD, 0.0004, 0.0004, 0.002, 0, -0.0008, 0, { w: 4 }), sph(DK, 0.0010, 0, -0.0052, 0, { w: 5, h: 4 })]; }, 0)));
    g.add(blob(0.05 * SC));
    var slots = ANG.map(function (a) { return [Math.cos(a) * RSLOT * SC, Math.sin(a) * RSLOT * SC]; });
    g.userData = { bcMarket: 1, goods: goods, covers: covers, bell: bell, slots: slots, ang: ANG.slice() };
    return g;
  }
  var API = { version: 1, keys: ['market'], ANG: ANG, RS: RS, RSLOT: RSLOT, SC: SC };
  API.init = function (api) {
    T = api.THREE; BCP = api.BCP; bcMerge = api.bcMerge;
    if (api.M) api.M(0xffffff);
    if (!BCP.toon) BCP.toon = new T.MeshToonMaterial({ vertexColors: true, gradientMap: BCP.grad, side: T.DoubleSide });
    if (!BCP.inks) BCP.inks = {};
    m4 = new T.Matrix4(); q4 = new T.Quaternion(); e4 = new T.Euler(); v3 = new T.Vector3(); s3 = new T.Vector3();
    ASSETS = {}; SH = {}; ready = true;
  };
  API.market = function () { if (!ready) throw new Error('market.js: init() first'); return market(); };
  root.BC_MARKET_MK = API;
})(window);
