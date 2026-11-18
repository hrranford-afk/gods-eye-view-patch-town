/* Base Camp economy (build 24): window.BC_ECON_MK. The economy idea is Harry's ("they've got to get corn, wood, they can make things, get things at higher value"); the models are by CAIRN.
   Small workshops and market things made from household bits at creature scale (a creature is about 5 cm):
   - sawbench: a lolly-stick bench with a pencil-sharpener saw; wood in, planks out (userData.planks: the plank pile, userData.work: the twig being sawn)
   - oven: a thimble oven on a button with a straw chimney; corn in, corn cakes out (userData.glow: the fire in the door, userData.loaves)
   - reel: a cotton reel on a lolly-stick frame with a paper-clip crank; threads of sock fluff in, coils of rope out (userData.spin turns, userData.coils)
   - pedlar: Mossby, a friendly snail pulling a matchbox cart on button wheels under a cocktail umbrella (userData.body bobs, userData.eyes wobble)
   - board: a chalkboard easel for the market's prices (userData.face: a plane whose material map the game sets)
   - pinwheel: a paper pinwheel on a stick in a lump of modelling clay (userData.head spins)
   Built like models/market.js: one merged vertex-coloured body (the game's bcMerge, the shared BCP.toon) plus ONE ink hull; moving parts are their own meshes.
   The game calls BC_ECON_MK.init({THREE, BCP, bcMerge, M}) once, then BC_ECON_MK.make(key). If this file is missing or throws, index.html builds plain shapes. No letters on any object. */
(function (root) {
  'use strict';
  var T, BCP, bcMerge, ready = false, ASSETS = {}, SH = {};
  var PI = Math.PI, TAU = Math.PI * 2, INK = 0x1a1410;
  var RED = 0xe0402f, CRM = 0xfff3dc, WOOD = 0xd09a5a, DWOOD = 0x92602e, DK = 0x2a1a10, SIL = 0xb9c2ca, GOLD = 0xffc82e, BLU = 0x3f86dd, GRN = 0x2f9e4f, PNK = 0xff6f91, ORG = 0xf08a24, YEL = 0xffe14a, TEAL = 0x39b0a4, LOLLY = 0xe8c890, PUR = 0x9a62d6;

  function P(g, c, x, y, z, o) { o = o || {}; return { g: g, c: c, x: x || 0, y: y || 0, z: z || 0, rx: o.rx, ry: o.ry, rz: o.rz, sx: o.sx, sy: o.sy, sz: o.sz, ink: o.ink }; }
  function sph(c, r, x, y, z, o) { o = o || {}; return P(o.half ? new T.SphereGeometry(r, o.w || 8, o.h || 6, 0, TAU, 0, PI / 2) : new T.SphereGeometry(r, o.w || 8, o.h || 6), c, x, y, z, o); }
  function box(c, w, h, d, x, y, z, o) { return P(new T.BoxGeometry(w, h, d), c, x, y, z, o); }
  function cyl(c, rt, rb, h, x, y, z, o) { o = o || {}; return P(new T.CylinderGeometry(rt, rb, h, o.w || 8, 1, !!o.open), c, x, y, z, o); }
  function tcone(c, r, h, x, y, z, o) { o = o || {}; var g = new T.ConeGeometry(r, h, o.w || 5); g.translate(0, h / 2, 0); return P(g, c, x, y, z, o); }
  function tor(c, R, r, x, y, z, o) { o = o || {}; return P(new T.TorusGeometry(R, r, o.h || 5, o.w || 14, o.arc || TAU), c, x, y, z, o); }
  /* a lolly stick lying flat along x: a flat box with round ends */
  function lolly(L, w, x, y, z, o) { o = o || {}; var c = o.c || LOLLY, ry = o.ry || 0, cs = Math.cos(ry), sn = Math.sin(ry), e = (L - w) / 2;
    return [box(c, L - w, 0.0016, w, x, y, z, { ry: ry, ink: o.ink }), cyl(c, w / 2, w / 2, 0.0016, x + cs * e, y, z - sn * e, { w: 10, ink: o.ink }), cyl(c, w / 2, w / 2, 0.0016, x - cs * e, y, z + sn * e, { w: 10, ink: o.ink })]; }

  /* ---- merged geometry and an ink hull, as in market.js ---- */
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
  function bake(parts) { return parts.map(function (p) { var g = p.g.index ? p.g.toNonIndexed() : p.g.clone(); g.applyMatrix4(xform(p)); return { g: g, c: p.c }; }); }
  function asset(key, build, inkT) { var A = ASSETS[key]; if (A) return A; var parts = build(); return (ASSETS[key] = { g: bcMerge('ec_' + key, bake(parts)), ink: inkGeo(parts, inkT || 0.0005) }); }
  function inkMat() { return BCP.inks[INK] || (BCP.inks[INK] = new T.MeshBasicMaterial({ color: INK, side: T.BackSide, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 })); }
  function meshOf(A, mat) { var m = new T.Mesh(A.g, mat || BCP.toon); if (A.ink) { var k = new T.Mesh(A.ink, inkMat()); k.renderOrder = -1; k.userData.ink = 1; m.add(k); } return m; }
  function blob(r) {
    if (!SH.blobM) {
      var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(40,25,10,.5)'); gr.addColorStop(1, 'rgba(40,25,10,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      SH.blobM = new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }); SH.blobG = new T.PlaneGeometry(1, 1).rotateX(-PI / 2);
    }
    var s = new T.Mesh(SH.blobG, SH.blobM); s.scale.set(r * 2, 1, r * 2); s.position.y = 0.0006; s.renderOrder = 2; return s;
  }
  function basic(key, col, o) { o = o || {}; return SH[key] || (SH[key] = new T.MeshBasicMaterial({ color: col, transparent: !!o.tr, opacity: o.op === undefined ? 1 : o.op, depthWrite: !o.tr })); }
  var SC = 1.3; /* drawn a little bigger than the parts, like the market */
  function wrap(inner) { var g = new T.Group(), s = new T.Group(); s.scale.setScalar(SC); s.add.apply(s, inner); g.add(s); return g; }

  /* ---- the sawbench: two lolly sticks on four lolly-stick legs, a blue pencil sharpener bolted on as the saw, a twig going through it, sawdust, and a pile of planks ---- */
  function sawParts() {
    var p = [];
    p = p.concat(lolly(0.038, 0.0095, 0, 0.0125, -0.005, { ink: 1 }), lolly(0.038, 0.0095, 0, 0.0125, 0.005, { ink: 1 }));
    [[-0.0125, -0.006], [0.0125, -0.006], [-0.0125, 0.006], [0.0125, 0.006]].forEach(function (q) { p.push(box(LOLLY, 0.0055, 0.0118, 0.0016, q[0], 0.0059, q[1], { ink: 1 })); });
    p.push(box(0xd9b67a, 0.026, 0.0012, 0.0016, 0, 0.004, -0.006), box(0xd9b67a, 0.026, 0.0012, 0.0016, 0, 0.004, 0.006)); /* cross braces */
    /* the sharpener: a blue block with a silver blade on top and a dark hole for the twig */
    p.push(box(BLU, 0.0085, 0.0068, 0.0075, 0.0105, 0.0167, 0, { ink: 1 }), box(0xdde3e8, 0.0072, 0.0006, 0.0052, 0.0105, 0.0204, 0.0004, { rz: 0.12 }), cyl(SIL, 0.0008, 0.0008, 0.0012, 0.0105, 0.0209, -0.0022, { w: 6 }));
    p.push(cyl(DK, 0.0022, 0.0022, 0.0006, 0.0062, 0.0167, 0, { rz: PI / 2, w: 10 }));
    /* sawdust under the saw and a few curly shavings */
    p.push(sph(0xf3d9a8, 0.0055, 0.0125, 0.0004, 0.002, { sy: 0.25, w: 8, h: 4 }), sph(0xe8c48a, 0.0016, 0.006, 0.0135, 0.004, { sy: 0.5, w: 5, h: 3 }));
    for (var i = 0; i < 3; i++) p.push(tor(0xe8b97a, 0.0014, 0.00045, 0.0155 + i * 0.002, 0.0011, 0.007 - i * 0.002, { rx: PI / 2, w: 8, h: 3 }));
    return p;
  }
  function plankParts(i) { return [box(0xe2b878, 0.019, 0.0017, 0.0052, 0, 0.0009, 0, { ink: 0.0003 }), box(0xc9995a, 0.019, 0.0003, 0.0052, 0, 0.00185, 0)]; }
  function sawbench() {
    var body = meshOf(asset('saw', sawParts, 0.0004)), work = meshOf(asset('sawTwig', function () { return [cyl(0x9a6a3a, 0.0016, 0.0016, 0.024, 0, 0, 0, { rz: PI / 2, w: 7, ink: 0.0003 }), cyl(0xd9a066, 0.0015, 0.0015, 0.0004, -0.0121, 0, 0, { rz: PI / 2, w: 7 })]; }));
    work.position.set(-0.002, 0.0167, 0); var planks = new T.Group(); planks.position.set(-0.008, 0, 0.016);
    for (var i = 0; i < 4; i++) { var pk = meshOf(asset('plank', plankParts)); pk.position.set((i % 2) * 0.0012, i * 0.0019, 0); pk.rotation.y = (i % 2 ? 0.08 : -0.05); planks.add(pk); }
    var g = wrap([body, work, planks]); g.add(blob(0.028));
    g.userData = { bcEcon: 'sawbench', work: work, planks: planks, items: planks.children }; return g;
  }

  /* ---- the thimble oven: a silver thimble upside down on a red button, a dark door with a fire inside, a striped straw chimney, corn cakes cooling on a bottle-top tray ---- */
  function ovenParts() {
    var p = [], i, k;
    p.push(cyl(0xd9483b, 0.0135, 0.0135, 0.003, 0, 0.0015, 0, { w: 18, ink: 1 })); for (i = 0; i < 4; i++) p.push(cyl(DK, 0.001, 0.001, 0.0032, Math.cos(i * PI / 2 + 0.8) * 0.0095, 0.0016, Math.sin(i * PI / 2 + 0.8) * 0.0095, { w: 5 }));
    p.push(cyl(SIL, 0.0088, 0.0102, 0.019, 0, 0.0125, 0, { w: 18, ink: 1 }), sph(SIL, 0.0088, 0, 0.022, 0, { half: 1, w: 18, h: 6, ink: 1 }), cyl(0xdde3e8, 0.0104, 0.0104, 0.0016, 0, 0.0038, 0, { w: 18 }));
    for (k = 0; k < 3; k++) for (i = 0; i < 9; i++) { var a = i / 9 * TAU + k * 0.35, r = 0.0089 + (2 - k) * 0.0005; if (Math.abs(a - PI / 2) < 0.6) continue; p.push(sph(0x8c96a0, 0.0007, Math.cos(a) * r, 0.0105 + k * 0.0042, Math.sin(a) * r, { w: 4, h: 3 })); } /* thimble dimples */
    p.push(cyl(DK, 0.0045, 0.0045, 0.0014, 0, 0.0095, 0.0094, { rx: PI / 2, w: 12 }), box(DK, 0.009, 0.0045, 0.0014, 0, 0.0072, 0.0094)); /* the door */
    p.push(cyl(0xfff3dc, 0.0018, 0.0018, 0.012, 0.0045, 0.0285, -0.003, { w: 8, ink: 0.0003 })); for (i = 0; i < 3; i++) p.push(cyl(0xe0402f, 0.00185, 0.00185, 0.0016, 0.0045, 0.0245 + i * 0.0035, -0.003, { w: 8 })); /* straw chimney */
    p.push(cyl(GOLD, 0.0068, 0.006, 0.0022, 0.0185, 0.0011, 0.007, { w: 14, ink: 1 })); /* a bottle-top tray */
    for (i = 0; i < 5; i++) p.push(cyl(DWOOD, 0.0007, 0.0007, 0.012, -0.0155 + (i % 3) * 0.0016, 0.0009 + Math.floor(i / 3) * 0.0015, -0.008 + i * 0.0006, { rz: PI / 2, w: 5 })); /* matchstick firewood */
    return p;
  }
  function ovenGlow() { var g = new T.Mesh(new T.CircleGeometry(0.0038, 12), basic('ovGlow', 0xff8a2a, { tr: 1, op: 0.95 })); g.position.set(0, 0.0095, 0.0103); var b = new T.Mesh(new T.PlaneGeometry(0.0076, 0.0038), basic('ovGlow', 0xff8a2a, { tr: 1, op: 0.95 })); b.position.set(0, -0.0021, 0); g.add(b); return g; }
  function oven() {
    var body = meshOf(asset('oven', ovenParts, 0.0004)), glow = ovenGlow(), loaves = new T.Group(); loaves.position.set(0.0185, 0.0022, 0.007);
    [[-0.0028, -0.0012], [0.0026, -0.0016], [0, 0.0026]].forEach(function (q) { var l = meshOf(asset('loaf', function () { return [sph(0xe8b04a, 0.0026, 0, 0.0012, 0, { sy: 0.55, w: 8, h: 5, ink: 0.0003 }), box(0xc98a2a, 0.0028, 0.0004, 0.0005, 0, 0.0026, 0)]; })); l.position.set(q[0], 0, q[1]); loaves.add(l); });
    var g = wrap([body, glow, loaves]); g.add(blob(0.022));
    g.userData = { bcEcon: 'oven', glow: glow, loaves: loaves, items: loaves.children, chimney: [0.0045 * SC, 0.036 * SC, -0.003 * SC] }; return g;
  }

  /* ---- the rope reel: a wooden cotton reel on a lolly-stick frame, turned by a paper-clip crank; pink sock fluff goes in, coils of rope come out ---- */
  function reelFrame() {
    var p = [], i;
    p = p.concat(lolly(0.034, 0.009, 0, 0.0008, 0, { ink: 1 }));
    [-1, 1].forEach(function (s) { p.push(box(LOLLY, 0.0016, 0.022, 0.006, s * 0.0118, 0.011, 0, { ink: 1 }), cyl(DWOOD, 0.0013, 0.0013, 0.0022, s * 0.0118, 0.0185, 0, { rz: PI / 2, w: 8 })); });
    /* a tuft of pink sock fluff waiting to be twisted, and a few loose threads */
    p.push(sph(0xf2a7c8, 0.0055, -0.019, 0.0045, -0.006, { sy: 0.7, w: 8, h: 6, ink: 1 }), sph(0xf7c4dc, 0.0035, -0.0215, 0.0072, -0.003, { w: 7, h: 5 }), sph(0xf2a7c8, 0.003, -0.016, 0.0074, -0.0085, { w: 6, h: 4 }));
    for (i = 0; i < 3; i++) p.push(cyl(0xe58ab2, 0.0003, 0.0003, 0.012, -0.012 + i * 0.0012, 0.01 + i * 0.0015, -0.003, { rz: 0.9 - i * 0.15, w: 3 }));
    return p;
  }
  function reelSpin() { /* the cotton reel itself, on the axle, wound with rope: it turns while somebody works */
    var p = [], i;
    p.push(cyl(WOOD, 0.0068, 0.0068, 0.0024, -0.0082, 0, 0, { rz: PI / 2, w: 14, ink: 0.0003 }), cyl(WOOD, 0.0068, 0.0068, 0.0024, 0.0082, 0, 0, { rz: PI / 2, w: 14, ink: 0.0003 }));
    p.push(cyl(0xc98a5a, 0.0048, 0.0048, 0.014, 0, 0, 0, { rz: PI / 2, w: 14, ink: 0.0003 }));
    for (i = 0; i < 6; i++) p.push(cyl(0x9a6436, 0.0049, 0.0049, 0.0007, -0.0055 + i * 0.0022, 0, 0, { rz: PI / 2 + 0.25, w: 14 })); /* the twist */
    p.push(box(SIL, 0.0012, 0.009, 0.0012, 0.0118 + 0.0022, -0.0045, 0), box(SIL, 0.004, 0.0012, 0.0012, 0.0118 + 0.0035, -0.0088, 0), sph(RED, 0.0016, 0.0118 + 0.0055, -0.0088, 0, { w: 6, h: 4 })); /* the paper-clip crank */
    return p;
  }
  function coilParts() { return [tor(0xc98a5a, 0.0032, 0.0012, 0, 0.0012, 0, { rx: PI / 2, w: 12, h: 5, ink: 0.0003 }), tor(0xa8703e, 0.0019, 0.0011, 0, 0.0032, 0, { rx: PI / 2, w: 10, h: 4 })]; }
  function reel() {
    var body = meshOf(asset('reel', reelFrame, 0.0004)), work = meshOf(asset('reelSpin', reelSpin)), coils = new T.Group(); work.position.set(0, 0.0185, 0); coils.position.set(0.006, 0, 0.0135);
    [[-0.008, 0], [0, 0.001], [0.008, -0.0005]].forEach(function (q) { var c = meshOf(asset('coil', coilParts)); c.position.set(q[0], 0, q[1]); coils.add(c); });
    var g = wrap([body, work, coils]); g.add(blob(0.024));
    g.userData = { bcEcon: 'reel', spin: work, coils: coils, items: coils.children }; return g;
  }

  /* ---- Mossby the pedlar snail and the cart: front is +z ---- */
  function snailParts() {
    var p = [];
    p.push(sph(0x8fd16f, 0.0125, 0, 0.0055, 0.002, { sx: 0.62, sy: 0.42, sz: 1.55, w: 12, h: 8, ink: 1 }), sph(0x8fd16f, 0.0072, 0, 0.0128, 0.0175, { w: 12, h: 9, ink: 1 }));
    p.push(sph(0xb6e69a, 0.0105, 0, 0.0028, 0.002, { sx: 0.66, sy: 0.22, sz: 1.6, w: 10, h: 5 })); /* a paler foot */
    p.push(sph(PNK, 0.0017, -0.0048, 0.0118, 0.0222, { w: 6, h: 4, sz: 0.4 }), sph(PNK, 0.0017, 0.0048, 0.0118, 0.0222, { w: 6, h: 4, sz: 0.4 }));
    p.push(tor(DK, 0.0021, 0.00045, 0, 0.0118, 0.0243, { arc: PI, rz: PI, w: 8, h: 3 })); /* a smile */
    /* the shell: an orange ball with a cream spiral on both sides */
    p.push(sph(ORG, 0.0128, 0, 0.0182, -0.004, { sx: 0.82, w: 14, h: 10, ink: 1 }));
    [1, -1].forEach(function (s) { p.push(tor(CRM, 0.0082, 0.0013, s * 0.0092, 0.0182, -0.004, { ry: PI / 2, w: 16, h: 4 }), tor(CRM, 0.0043, 0.0012, s * 0.0103, 0.0182, -0.0035, { ry: PI / 2, w: 12, h: 4 }), sph(0xffd28a, 0.0018, s * 0.0106, 0.0184, -0.003, { w: 6, h: 4 })); });
    /* a little pedlar's hat on the shell top: a red bottle-top with a feather */
    p.push(cyl(RED, 0.0052, 0.0052, 0.0028, 0, 0.0305, -0.004, { w: 14, ink: 1 }), cyl(0xffffff, 0.0053, 0.0053, 0.0008, 0, 0.0298, -0.004, { w: 14 }), sph(TEAL, 0.0016, 0.0035, 0.0335, -0.006, { sx: 0.5, sy: 2.4, w: 5, h: 4, rz: -0.5 }));
    /* harness straps to the shafts */
    p.push(box(0x7a4b28, 0.0165, 0.0012, 0.0022, 0, 0.0075, -0.0105));
    return p;
  }
  function eyeParts() {
    var p = [];
    [1, -1].forEach(function (s) { p.push(cyl(0x8fd16f, 0.0008, 0.001, 0.011, s * 0.0028, 0.0205, 0.0178, { rz: -s * 0.25, w: 6 }), sph(0xffffff, 0.0026, s * 0.0042, 0.0262, 0.0182, { w: 10, h: 8, ink: 0.0003 }), sph(DK, 0.0013, s * 0.0043, 0.0264, 0.0204, { w: 6, h: 5 })); });
    return p;
  }
  function cartParts() {
    var p = [], i, z0 = -0.036;
    p.push(box(RED, 0.031, 0.0072, 0.023, 0, 0.0115, z0, { ink: 1 }), box(YEL, 0.0312, 0.002, 0.0232, 0, 0.0135, z0), box(CRM, 0.027, 0.0012, 0.019, 0, 0.0153, z0)); /* the matchbox tray */
    [1, -1].forEach(function (s) { p.push(cyl(BLU, 0.0072, 0.0072, 0.0028, s * 0.0168, 0.0072, z0, { rz: PI / 2, w: 16, ink: 1 })); for (var h = 0; h < 4; h++) p.push(cyl(DK, 0.0009, 0.0009, 0.003, s * 0.0168, 0.0072 + Math.cos(h * PI / 2 + 0.7) * 0.0022, z0 + Math.sin(h * PI / 2 + 0.7) * 0.0022, { rz: PI / 2, w: 5 })); }); /* button wheels */
    p.push(cyl(WOOD, 0.0006, 0.0006, 0.026, 0.0085, 0.009, -0.016, { rx: PI / 2 + 0.12, w: 5 }), cyl(WOOD, 0.0006, 0.0006, 0.026, -0.0085, 0.009, -0.016, { rx: PI / 2 + 0.12, w: 5 })); /* shafts */
    /* the goods: seed packets, a berry lantern, a paper pinwheel, a gold pulley, a pile of buttons */
    [[PNK, -0.009, -0.004], [GRN, -0.0055, -0.0035], [PUR, -0.0095, 0.002]].forEach(function (q) { p.push(box(q[0], 0.0042, 0.0058, 0.0012, q[1], 0.0186, z0 + q[2], { rx: -0.3, ry: 0.2, ink: 0.0003 })); });
    p.push(cyl(DWOOD, 0.0005, 0.0005, 0.018, 0.0, 0.0242, z0 + 0.004, { w: 4 }), sph(0xff5d7a, 0.0032, 0.0, 0.0345, z0 + 0.004, { w: 10, h: 8, ink: 0.0003 }), sph(GRN, 0.0014, 0.0, 0.0378, z0 + 0.004, { w: 5, h: 4 }));
    p.push(cyl(WOOD, 0.0005, 0.0005, 0.022, 0.009, 0.026, z0 - 0.006, { w: 4 }));
    [RED, BLU, GOLD, GRN].forEach(function (c, k) { p.push(P(new T.ConeGeometry(0.0034, 0.0062, 3), c, 0.009 + Math.cos(k * PI / 2 + 0.6) * 0.0028, 0.037 + Math.sin(k * PI / 2 + 0.6) * 0.0028, z0 - 0.0055, { rz: k * PI / 2 + 0.6 - PI / 2, sz: 0.2 })); });
    p.push(tor(GOLD, 0.0034, 0.0011, 0.0085, 0.0192, z0 + 0.006, { rx: -0.4, w: 12, h: 4, ink: 0.0003 }), cyl(DWOOD, 0.0012, 0.0012, 0.0026, 0.0085, 0.0192, z0 + 0.006, { rx: PI / 2 - 0.4, w: 6 }));
    for (i = 0; i < 5; i++) p.push(cyl([RED, BLU, GOLD, PNK, GRN][i], 0.0021, 0.0021, 0.0008, -0.002 + (i % 3) * 0.0022, 0.0164 + Math.floor(i / 3) * 0.0009, z0 - 0.0075 + (i % 2) * 0.0012, { w: 10 }));
    /* a cocktail umbrella over the cart */
    p.push(cyl(WOOD, 0.0006, 0.0006, 0.05, -0.0125, 0.034, z0 - 0.0095, { w: 5 }), tcone(TEAL, 0.019, 0.0085, -0.0125, 0.057, z0 - 0.0095, { w: 10, ink: 1 }), tcone(CRM, 0.0192, 0.0012, -0.0125, 0.0565, z0 - 0.0095, { w: 10 }), sph(YEL, 0.0012, -0.0125, 0.0658, z0 - 0.0095, { w: 6, h: 4 }));
    return p;
  }
  function pedlar() {
    var body = new T.Group(), snail = meshOf(asset('snail', snailParts, 0.0004)), eyes = meshOf(asset('snailEyes', eyeParts, 0.0003)); body.add(snail, eyes);
    var cart = meshOf(asset('cart', cartParts, 0.0004));
    var g = wrap([body, cart]); g.add(blob(0.03)); g.children[1].position.z = -0.012 * SC; g.children[1].scale.set(1, 1, 2.1);
    g.userData = { bcEcon: 'pedlar', body: body, eyes: eyes, cart: cart }; return g;
  }

  /* ---- the price board: a chalkboard in a lolly-stick frame on an easel ---- */
  function boardParts() {
    var p = [];
    p.push(box(DWOOD, 0.004, 0.06, 0.0018, -0.019, 0.03, 0.002, { rx: -0.16, ink: 1 }), box(DWOOD, 0.004, 0.06, 0.0018, 0.019, 0.03, 0.002, { rx: -0.16, ink: 1 }), box(DWOOD, 0.003, 0.056, 0.0016, 0, 0.028, -0.0085, { rx: 0.28, ink: 1 }));
    p.push(box(LOLLY, 0.046, 0.0035, 0.0028, 0, 0.0475, 0.0002, { rx: -0.16, ink: 1 }), box(LOLLY, 0.046, 0.0035, 0.0028, 0, 0.0155, 0.0054, { rx: -0.16, ink: 1 }));
    p.push(box(LOLLY, 0.0035, 0.033, 0.0028, -0.0212, 0.0315, 0.0028, { rx: -0.16, ink: 1 }), box(LOLLY, 0.0035, 0.033, 0.0028, 0.0212, 0.0315, 0.0028, { rx: -0.16, ink: 1 }));
    p.push(box(0x24382e, 0.040, 0.030, 0.0012, 0, 0.0315, 0.0021, { rx: -0.16 })); /* the slate */
    p.push(box(LOLLY, 0.03, 0.0012, 0.004, 0, 0.0128, 0.0075, { rx: -0.16 }), cyl(0xfffaf0, 0.0007, 0.0007, 0.007, 0.006, 0.0141, 0.0082, { rz: PI / 2, w: 5 })); /* the chalk tray and a stick of chalk */
    return p;
  }
  function board() {
    var g = new T.Group(), s = new T.Group(); s.scale.setScalar(SC); g.add(s); s.add(meshOf(asset('board', boardParts, 0.0004)));
    var tilt = new T.Group(); tilt.position.set(0, 0.0315, 0.0021); tilt.rotation.x = -0.16; s.add(tilt);
    var face = new T.Mesh(new T.PlaneGeometry(0.038, 0.028), new T.MeshBasicMaterial({ color: 0xffffff })); face.position.z = 0.00072; face.name = 'ecBoardFace'; tilt.add(face);
    g.userData = { bcEcon: 'board', face: face }; return g; /* no shadow blob: the market has one, and a draw-call budget */
  }

  /* ---- a paper pinwheel from the pedlar ---- */
  function pinwheel() {
    var body = meshOf(asset('pinStick', function () { return [sph(PNK, 0.0042, 0, 0, 0, { half: 1, w: 10, h: 4, ink: 1 }), cyl(0x6fd0e0, 0.0007, 0.0007, 0.046, 0, 0.023, 0, { w: 5, ink: 0.0003 })]; }));
    var head = new T.Group(); head.position.set(0, 0.046, 0.0012);
    head.add(meshOf(asset('pinHead', function () {
      var p = [], cols = [RED, BLU, GOLD, GRN];
      for (var k = 0; k < 4; k++) { var a = k * PI / 2; p.push(P(new T.ConeGeometry(0.0062, 0.0125, 3), cols[k], Math.cos(a) * 0.0055, Math.sin(a) * 0.0055, 0, { rz: a - PI / 2 + 0.5, sz: 0.12, ink: 0.0003 })); }
      p.push(sph(YEL, 0.0016, 0, 0, 0.0008, { w: 6, h: 5 })); return p;
    })));
    var g = wrap([body, head]); g.add(blob(0.01)); g.userData = { bcEcon: 'pinwheel', head: head }; return g;
  }

  var MAKERS = { sawbench: sawbench, oven: oven, reel: reel, pedlar: pedlar, board: board, pinwheel: pinwheel };
  var API = { version: 1, keys: Object.keys(MAKERS), SC: SC };
  API.init = function (api) {
    T = api.THREE; BCP = api.BCP; bcMerge = api.bcMerge;
    if (api.M) api.M(0xffffff);
    if (!BCP.toon) BCP.toon = new T.MeshToonMaterial({ vertexColors: true, gradientMap: BCP.grad, side: T.DoubleSide });
    if (!BCP.inks) BCP.inks = {};
    m4 = new T.Matrix4(); q4 = new T.Quaternion(); e4 = new T.Euler(); v3 = new T.Vector3(); s3 = new T.Vector3();
    ASSETS = {}; SH = {}; ready = true;
  };
  API.make = function (key) { if (!ready) throw new Error('economy.js: init() first'); if (!MAKERS[key]) throw new Error('economy.js: no ' + key); return MAKERS[key](); };
  root.BC_ECON_MK = API;
})(window);
