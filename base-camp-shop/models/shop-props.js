/* Base Camp SHOP EDITION props: window.BC_SHOP_MK. The jeweller's counter set at creature scale (a creature is about 5.4 cm), plus the life-size practice shop.
   Same look as decor.js and props.js: toon shading (the game's shared BCP.toon, vertex colours) and an ink outline (one extra back-face mesh), every shape merged once and shared.
   NOBODY IS NAMED HERE: no shop name, no logo, no maker's marks, no letters on anything. The plaque is a blank glowing slab until the shop sends artwork.
   The game calls BC_SHOP_MK.init({THREE, BCP, inked, bcMerge, M}) once before the first maker. Each maker returns a THREE.Group sitting on y = 0 (ring and gem: origin at the middle of the shape)
   and may set userData.tick(time, dt). Makers never use Math.random (the director's takes must be identical); looks come from fixed tables. */
(function (root) {
  'use strict';
  var T, BCP, bcMerge, M, ready = false, PI = Math.PI, TAU = Math.PI * 2, ASSETS = {}, SH = {}, m4, q4, e4, v3, s3;
  var INK = 0x1a1410;
  var RED = 0xe0402f, DRED = 0xa82a22, GRN = 0x2f9e4f, DGRN = 0x247a3c, GOLD = 0xf2b51f, LGOLD = 0xffd95a, BLU = 0x3f86dd, PNK = 0xff6f91, PUR = 0x9a62d6, CRM = 0xfff3dc, WHT = 0xf4f4ee,
    WOOD = 0xc98f55, DWOOD = 0x8a5a2e, BRN = 0x6a4020, SIL = 0xc4ccd4, TEAL = 0x39b0a4, VEL = 0xa3203a, DVEL = 0x6e1226, NAVY = 0x233a78, CREAM = 0xf1e4cc, DK = 0x2a1a10;

  /* ---- part helpers (as in decor.js) ---- */
  function P(g, c, x, y, z, o) { o = o || {}; return { g: g, c: c, x: x || 0, y: y || 0, z: z || 0, rx: o.rx, ry: o.ry, rz: o.rz, sx: o.sx, sy: o.sy, sz: o.sz, ink: o.ink }; }
  function sph(c, r, x, y, z, o) { o = o || {}; return P(o.half ? new T.SphereGeometry(r, o.w || 8, o.h || 6, 0, TAU, 0, PI / 2) : new T.SphereGeometry(r, o.w || 8, o.h || 6), c, x, y, z, o); }
  function box(c, w, h, d, x, y, z, o) { return P(new T.BoxGeometry(w, h, d), c, x, y, z, o); }
  function cyl(c, rt, rb, h, x, y, z, o) { o = o || {}; return P(new T.CylinderGeometry(rt, rb, h, o.w || 8, 1, !!o.open), c, x, y, z, o); }
  function cone(c, r, h, x, y, z, o) { return cyl(c, 0, r, h, x, y, z, o); }
  function tor(c, R, r, x, y, z, o) { o = o || {}; var g = new T.TorusGeometry(R, r, o.h || 5, o.w || 14, o.arc || TAU); if (o.flat) g.rotateX(PI / 2); return P(g, c, x, y, z, o); }
  function oct(c, r, x, y, z, o) { return P(new T.OctahedronGeometry(r, 0), c, x, y, z, o); }
  function flat(a) { var o = []; (function f(x) { if (Array.isArray(x)) x.forEach(f); else if (x) o.push(x); })(a); return o; }
  function xform(p) { var sx = p.sx === undefined ? 1 : p.sx; return m4.compose(v3.set(p.x || 0, p.y || 0, p.z || 0), q4.setFromEuler(e4.set(p.rx || 0, p.ry || 0, p.rz || 0)), s3.set(sx, p.sy === undefined ? sx : p.sy, p.sz === undefined ? sx : p.sz)); }
  /* the ink hull: every part flagged ink pushed out along its smoothed normals */
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
  function asset(key, build, inkT) {
    var A = ASSETS[key]; if (A) return A; var parts = flat(build());
    return (ASSETS[key] = { g: bcMerge('sp_' + key, parts.filter(function (p) { return !p.inkOnly; })), ink: inkGeo(parts, inkT || 0.0005) });
  }
  function inkMat() { return BCP.inks[INK] || (BCP.inks[INK] = new T.MeshBasicMaterial({ color: INK, side: T.BackSide, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 })); }
  function meshOf(A, mat) { var m = new T.Mesh(A.g, mat || BCP.toon); if (A.ink) { var k = new T.Mesh(A.ink, inkMat()); k.renderOrder = -1; k.userData.ink = 1; m.add(k); } return m; }
  function glowMat(em, k) { var m = BCP.toon.clone(); m.emissive = new T.Color(em); m.emissiveIntensity = k === undefined ? 0.8 : k; return m; }
  function at(o, x, y, z) { o.position.set(x || 0, y || 0, z || 0); return o; }
  function canv(w, h, f) { var c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); var t = new T.CanvasTexture(c); return t; }
  function tex(name) {
    if (SH[name]) return SH[name];
    if (name === 'blob') return (SH.blob = canv(64, 64, function (x) { var g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(40,25,10,.55)'); g.addColorStop(1, 'rgba(40,25,10,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }));
    if (name === 'glow') return (SH.glow = canv(64, 64, function (x) { var g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,236,180,.95)'); g.addColorStop(0.4, 'rgba(255,210,120,.35)'); g.addColorStop(1, 'rgba(255,180,90,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }));
    if (name === 'spark') return (SH.spark = canv(64, 64, function (x) {
      var g = x.createRadialGradient(32, 32, 0, 32, 32, 14); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,240,180,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      x.fillStyle = 'rgba(255,250,215,.95)'; x.beginPath(); x.moveTo(32, 0); x.lineTo(36, 28); x.lineTo(64, 32); x.lineTo(36, 36); x.lineTo(32, 64); x.lineTo(28, 36); x.lineTo(0, 32); x.lineTo(28, 28); x.closePath(); x.fill();
    }));
  }
  function blob(r) {
    if (!SH.blobM) { SH.blobM = new T.MeshBasicMaterial({ map: tex('blob'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }); SH.blobG = new T.PlaneGeometry(1, 1).rotateX(-PI / 2); }
    var s = new T.Mesh(SH.blobG, SH.blobM); s.scale.set(r * 2, 1, r * 2); s.position.y = 0.0006; s.renderOrder = 2; return s;
  }
  function glowSprite(r, op, col) { var m = new T.SpriteMaterial({ map: tex('glow'), transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: op, color: col || 0xffffff }); var s = new T.Sprite(m); s.scale.set(r * 2, r * 2, 1); s.renderOrder = 3; return s; }
  function sparkSprite(r, col) { var m = new T.SpriteMaterial({ map: tex('spark'), transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0, color: col || 0xffffff }); var s = new T.Sprite(m); s.scale.set(r * 2, r * 2, 1); s.renderOrder = 4; return s; }
  /* a small shiny cube map made from six canvases: warm window panel, ceiling lights, dark wood floor, a few coloured fairy-light dots. What the gem and the glass case reflect. */
  function envCube() {
    if (SH.env) return SH.env; var faces = [], i, S = 64;
    function face(fn) { var c = document.createElement('canvas'); c.width = c.height = S; fn(c.getContext('2d')); return c; }
    var dots = [[12, 20, '#ff5a4a'], [44, 14, '#ffd24a'], [30, 44, '#5ac85a'], [52, 50, '#5aa8ff'], [8, 52, '#ff7ad0']];
    function sky(x, top, bot) { var g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, S, S); }
    function lights(x) { dots.forEach(function (d) { x.fillStyle = d[2]; x.beginPath(); x.arc(d[0], d[1], 3.2, 0, TAU); x.fill(); }); }
    faces.push(face(function (x) { sky(x, '#fff2d0', '#c8a070'); x.fillStyle = '#ffffff'; x.fillRect(10, 8, 20, 40); x.fillRect(36, 8, 18, 40); lights(x); }));
    faces.push(face(function (x) { sky(x, '#9ab4d8', '#5a4a40'); x.fillStyle = '#e8f0ff'; x.fillRect(14, 10, 36, 12); lights(x); }));
    faces.push(face(function (x) { sky(x, '#ffffff', '#fff0c8'); x.fillStyle = '#ffffff'; for (var k = 0; k < 3; k++) x.fillRect(6, 8 + k * 20, 52, 8); }));
    faces.push(face(function (x) { sky(x, '#6a4a30', '#2a1a10'); lights(x); }));
    faces.push(face(function (x) { sky(x, '#f4e2c0', '#9a7850'); x.fillStyle = '#fffbe8'; x.fillRect(20, 6, 24, 30); lights(x); }));
    faces.push(face(function (x) { sky(x, '#b8c8e0', '#6a5a50'); x.fillStyle = '#ffe9a8'; x.fillRect(8, 16, 14, 22); x.fillRect(42, 12, 14, 26); lights(x); }));
    var t = new T.CubeTexture(faces); t.needsUpdate = true; return (SH.env = t);
  }
  function matShiny(col) { var k = 'shiny' + col; return SH[k] || (SH[k] = new T.MeshStandardMaterial({ color: col, metalness: 0.92, roughness: 0.08, envMap: envCube(), envMapIntensity: 1.25, flatShading: true })); }

  /* ==================== the giant ring ====================
     A gold band as big as a creature (outer diameter 6 cm, the hole is wide enough for a creature to look through) with a cartoon gem in a four-prong setting.
     Origin: the middle of the ring; the ring stands upright and faces +z. userData: R (outer radius), gem (the gem mesh), sparkles. */
  var RR = 0.030, RT = 0.0058;
  function gemGeo(s) { /* a brilliant cut: table, crown, girdle, pavilion (8 sides, flat shaded) */
    var key = 'gemG' + s; if (SH[key]) return SH[key]; var pts = [[0, -0.0092], [0.0030, -0.0030], [0.0088, 0.0022], [0.0088, 0.0036], [0.0042, 0.0085], [0, 0.0085]].map(function (p) { return new T.Vector2(p[0] * s, p[1] * s); });
    var g = new T.LatheGeometry(pts, 8).toNonIndexed(); g.computeVertexNormals(); return (SH[key] = g);
  }
  function flatNormals(g) { g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals(); return g; }
  function ring() {
    var g = new T.Group();
    var A = asset('ring', function () {
      var p = [tor(GOLD, RR - RT, RT, 0, 0, 0, { w: 22, h: 6, ink: 0.0006 }), tor(LGOLD, RR - RT, RT * 0.55, 0, 0, RT * 0.45, { w: 22, h: 4 })];
      var ty = RR - RT * 0.2; p.push(cyl(GOLD, 0.0070, 0.0050, 0.0050, 0, ty + 0.0026, 0, { w: 8, ink: 0.0005 }));
      for (var i = 0; i < 4; i++) { var a = i * PI / 2 + PI / 4; p.push(cone(LGOLD, 0.0011, 0.0085, Math.cos(a) * 0.0058, ty + 0.0105, Math.sin(a) * 0.0058, { w: 4, rx: Math.sin(a) * -0.28, rz: Math.cos(a) * 0.28 })); }
      return p;
    }, 0.0005);
    g.add(meshOf(A));
    var gem = new T.Mesh(gemGeo(1.05), new T.MeshToonMaterial({ color: 0xbfeeff, gradientMap: BCP.grad, emissive: 0x2a8fb8, emissiveIntensity: 0.75}));
    gem.position.set(0, RR - RT * 0.2 + 0.0105, 0); gem.scale.set(1, 1.0, 1); g.add(gem);
    var gi = new T.Mesh(gemGeo(1.05), inkMat()); gi.scale.setScalar(1.18); gi.renderOrder = -1; gi.userData.ink = 1; gem.add(gi);
    var sp = [sparkSprite(0.012, 0xffffff), sparkSprite(0.008, 0xbfe8ff)]; sp[0].position.set(0.004, gem.position.y + 0.006, 0.006); sp[1].position.set(-0.007, gem.position.y + 0.001, 0.007); g.add(sp[0], sp[1]);
    g.userData.R = RR; g.userData.gem = gem; g.userData.sparkles = sp; g.userData.shine = 0;
    g.userData.tick = function (t) {
      var k = g.userData.shine; /* shine 0..1: a polished ring glitters a lot */
      sp[0].material.opacity = Math.max(0, Math.sin(t * 2.3)) * (0.45 + 0.55 * k); sp[1].material.opacity = Math.max(0, Math.sin(t * 3.1 + 1.7)) * (0.35 + 0.65 * k);
      sp[0].scale.setScalar(0.024 * (1 + k * 0.5)); gem.material.emissiveIntensity = 0.55 + 0.35 * Math.sin(t * 2) + k * 0.4;
    };
    return g;
  }

  /* ==================== the mirror gem: a big shiny faceted gem on a velvet stand; a creature can see its face in it ==================== */
  function gem() {
    var g = new T.Group();
    var A = asset('gemstand', function () {
      var p = [cyl(DVEL, 0.016, 0.0185, 0.007, 0, 0.0035, 0, { w: 14, ink: 0.0005 }), cyl(GOLD, 0.0166, 0.0166, 0.0016, 0, 0.0078, 0, { w: 14 }), sph(VEL, 0.0142, 0, 0.0088, 0, { half: 1, w: 14, h: 5, sy: 0.55 })];
      for (var i = 0; i < 4; i++) { var a = i * PI / 2 + 0.4; p.push(cone(GOLD, 0.0016, 0.012, Math.cos(a) * 0.0105, 0.0185, Math.sin(a) * 0.0105, { w: 4, rx: Math.sin(a) * -0.45, rz: Math.cos(a) * 0.45, ink: 0.0003 })); }
      return p;
    }, 0.0005);
    g.add(meshOf(A));
    var geo = flatNormals(gemGeo(2.6)).clone(), tints = [0xcdeeff, 0xffd0ec, 0xdcd0ff, 0xd0fff0, 0xfff2cc, 0xbfe0ff], cc = new T.Color(), nv = geo.attributes.position.count, cols = new Float32Array(nv * 3), q;
    for (q = 0; q < nv; q++) { cc.setHex(tints[Math.floor(q / 3) % tints.length]); cols[q * 3] = cc.r; cols[q * 3 + 1] = cc.g; cols[q * 3 + 2] = cc.b; } geo.setAttribute('color', new T.BufferAttribute(cols, 3));
    var gmat = SH.gemMat || (SH.gemMat = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.9, roughness: 0.1, envMap: envCube(), envMapIntensity: 1.3, flatShading: true })), gm = new T.Mesh(geo, gmat); gm.position.set(0, 0.0235, 0); gm.rotation.x = -0.28; g.add(gm);
    var gi = new T.Mesh(geo, inkMat()); gi.scale.setScalar(1.06); gi.renderOrder = -1; gi.userData.ink = 1; gm.add(gi);
    /* the reflection: a tiny mirror-image face (made by the game for whoever is gazing) sits on the front facets and wobbles */
    var face = new T.Group(); face.position.set(0, 0.0, 0.0175); face.visible = false; gm.add(face);
    var sp = [sparkSprite(0.014, 0xffffff), sparkSprite(0.01, 0xffd9ff), sparkSprite(0.01, 0xd9f4ff)]; sp[0].position.set(0.012, 0.03, 0.012); sp[1].position.set(-0.013, 0.021, 0.014); sp[2].position.set(0.004, 0.038, 0.0); g.add(sp[0], sp[1], sp[2]);
    g.userData.stone = gm; g.userData.face = face; g.userData.stoneTop = 0.0235 + 0.022;
    g.userData.tick = function (t) { sp[0].material.opacity = Math.max(0, Math.sin(t * 2.7)) * 0.85; sp[1].material.opacity = Math.max(0, Math.sin(t * 2.1 + 2)) * 0.8; sp[2].material.opacity = Math.max(0, Math.sin(t * 3.3 + 4)) * 0.7; gm.rotation.y = Math.sin(t * 0.7) * 0.22; if (face.visible) { face.rotation.z = Math.sin(t * 3) * 0.06; face.scale.setScalar(1 + Math.sin(t * 5) * 0.03); } };
    return g;
  }
  /* a reflection head: skin and hat colours of whoever is gazing */
  function reflection(skin, hat) {
    var g = new T.Group(), mk = function (c, em) { return new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.86 }); };
    var head = new T.Mesh(new T.SphereGeometry(0.0074, 12, 9), mk(skin)); head.scale.set(1, 1, 0.5); g.add(head);
    var h = new T.Mesh(new T.ConeGeometry(0.0082, 0.0098, 10), mk(hat)); h.position.set(0.0005, 0.0092, 0); h.rotation.z = -0.12; h.scale.z = 0.5; g.add(h);
    var ey = new T.SphereGeometry(0.0013, 6, 5); [-1, 1].forEach(function (s) { var e = new T.Mesh(ey, mk(0x2a1a10)); e.position.set(s * 0.003, 0.0012, 0.0036); g.add(e); });
    var sm = new T.Mesh(new T.TorusGeometry(0.0017, 0.00045, 4, 10, PI), mk(0x5a2a1a)); sm.rotation.z = PI; sm.position.set(0, -0.0022, 0.0038); g.add(sm);
    return g;
  }

  /* ==================== gift boxes with ribbon bows ==================== */
  var GIFT = [[RED, GOLD], [GRN, RED], [BLU, SIL], [PNK, WHT], [PUR, GOLD], [WHT, RED], [TEAL, LGOLD]];
  function bowParts(rb, y, big) {
    var s = big || 1, p = [];
    [-1, 1].forEach(function (sd) { p.push(tor(rb, 0.0052 * s, 0.0017 * s, sd * 0.0046 * s, y + 0.0033 * s, 0, { w: 10, h: 4, sx: 1, sy: 1.0, sz: 1.0, ry: PI / 2, rx: 0, rz: sd * 0.5, ink: 0.0003 })); });
    p.push(sph(rb, 0.0024 * s, 0, y + 0.0014 * s, 0, { w: 7, h: 5, ink: 0.0003 })); p.push(box(rb, 0.0022 * s, 0.0011 * s, 0.006 * s, -0.0036 * s, y - 0.0004, 0.0026 * s, { rz: 0.4 })); p.push(box(rb, 0.0022 * s, 0.0011 * s, 0.006 * s, 0.0036 * s, y - 0.0004, 0.0026 * s, { rz: -0.4 }));
    return p;
  }
  /* a finished gift box (body, lid, ribbon and bow in one shape, one ink hull); v picks one of 7 fixed colour pairs; size scales it */
  function gift(v, size) {
    v = (v | 0) % GIFT.length; var c = GIFT[v], W = 0.04, H = 0.034, g = new T.Group();
    var A = asset('gift' + v, function () {
      var p = [box(c[0], W, H * 0.8, W, 0, H * 0.4, 0, { ink: 0.0006 }), box(c[0], W + 0.003, H * 0.22, W + 0.003, 0, H * 0.82, 0, { ink: 0.0006 }), box(c[1], 0.0068, H * 1.02, W + 0.0012, 0, H * 0.5, 0), box(c[1], W + 0.0012, H * 1.02, 0.0068, 0, H * 0.5, 0)];
      return p.concat(bowParts(c[1], H * 0.94 + 0.0012, 1));
    }, 0.0006);
    g.add(meshOf(A)); g.add(blob(0.028 * (size || 1))); g.userData.top = H * 0.94; g.userData.W = W; g.userData.H = H; if (size) g.scale.setScalar(size); return g;
  }
  /* a box that is wrapped in front of you: box and lid first; ribbon strips and the bow grow with userData.wrap(k), k 0..1 */
  function giftWrap(v) {
    v = (v | 0) % GIFT.length; var c = GIFT[v], W = 0.04, H = 0.034, g = new T.Group();
    var B = asset('gwbox' + v, function () { return [box(c[0], W, H * 0.8, W, 0, H * 0.4, 0, { ink: 0.0006 }), box(c[0], W + 0.003, H * 0.22, W + 0.003, 0, H * 0.82, 0, { ink: 0.0006 })]; }, 0.0006);
    g.add(meshOf(B)); g.add(blob(0.028));
    var s1 = new T.Mesh(asset('gws1' + v, function () { return [box(c[1], 0.0068, H * 1.02, W + 0.0012, 0, 0, 0)]; }).g, BCP.toon), s2 = new T.Mesh(asset('gws2' + v, function () { return [box(c[1], W + 0.0012, H * 1.02, 0.0068, 0, 0, 0)]; }).g, BCP.toon);
    s1.position.y = s2.position.y = H * 0.5; g.add(s1, s2);
    var bow = new T.Mesh(asset('gwbow' + v, function () { return bowParts(c[1], 0, 1); }).g, BCP.toon); bow.position.y = H * 0.94 + 0.0012; g.add(bow);
    function wrap(k) {
      var a = Math.min(1, k / 0.45), b = Math.min(1, Math.max(0, (k - 0.35) / 0.35)), d = Math.min(1, Math.max(0, (k - 0.72) / 0.28));
      s1.scale.set(1, 1, Math.max(0.001, a)); s1.visible = a > 0.01; s2.scale.set(Math.max(0.001, b), 1, 1); s2.visible = b > 0.01;
      var pop = d < 1 ? 1 + Math.sin(d * PI) * 0.35 : 1; bow.scale.setScalar(Math.max(0.001, d * pop)); bow.visible = d > 0.01; bow.rotation.y = (1 - d) * 2;
    }
    wrap(0); g.userData.wrap = wrap; g.userData.top = H; g.userData.W = W; return g;
  }

  /* ==================== the velvet ring tray: a wooden tray, a dark red cushion with rolls, six tiny rings and a gem-less slot for the giant one ==================== */
  function tray() {
    var g = new T.Group(), TW = 0.13, TD = 0.07;
    var A = asset('tray', function () {
      var p = [box(DWOOD, TW, 0.006, TD, 0, 0.003, 0, { ink: 0.0006 }), box(WOOD, TW, 0.006, 0.004, 0, 0.009, TD / 2 - 0.002), box(WOOD, TW, 0.006, 0.004, 0, 0.009, -TD / 2 + 0.002), box(WOOD, 0.004, 0.006, TD, TW / 2 - 0.002, 0.009, 0), box(WOOD, 0.004, 0.006, TD, -TW / 2 + 0.002, 0.009, 0), box(GOLD, TW, 0.0012, 0.0036, 0, 0.0124, TD / 2 - 0.0018), box(GOLD, TW, 0.0012, 0.0036, 0, 0.0124, -TD / 2 + 0.0018), box(GOLD, 0.0036, 0.0012, TD, TW / 2 - 0.0018, 0.0124, 0), box(GOLD, 0.0036, 0.0012, TD, -TW / 2 + 0.0018, 0.0124, 0), box(VEL, TW - 0.008, 0.005, TD - 0.008, 0, 0.0085, 0)];
      [-0.047, -0.029, 0.029, 0.047].forEach(function (x, i) {
        p.push(cyl(DVEL, 0.0033, 0.0033, TD - 0.012, x, 0.0112, 0, { w: 8, rx: PI / 2 }));
        if (i % 1 === 0) { [-0.022, 0.0, 0.022].forEach(function (z, j) { if (Math.abs(x) < 0.04 && j === 1) return; p.push(tor(GOLD, 0.0034, 0.0009, x, 0.0164, z, { w: 10, h: 4, rx: 0, ry: PI / 2, rz: 0, sx: 1, sy: 1, sz: 1 })); p.push(sph([PNK, 0xbfeeff, 0xff5a4a, GRN][(i + j) % 4], 0.0014, x, 0.0201, z, { w: 5, h: 4 })); }); }
      });
      p.push(cyl(DVEL, 0.0038, 0.0038, TD - 0.012, 0, 0.0114, 0, { w: 8, rx: PI / 2 }), box(0x4a0a1a, 0.0036, 0.0014, TD - 0.018, 0, 0.0146, 0));
      return p;
    }, 0.0005);
    g.add(meshOf(A)); g.userData.top = 0.0135; g.userData.W = TW; g.userData.D = TD; return g;
  }

  /* ==================== necklace stands and a necklace draped between them (rope bridge / tinsel). Origin: the middle between the stands, on the counter. ==================== */
  var NK_HALF = 0.153, NK_Y = 0.074, NK_SAG = 0.034, NK_N = 28, NK_S = 0.75;
  function nkPt(u) { return { x: (u * 2 - 1) * (NK_HALF - 0.003), y: NK_Y - NK_SAG * (1 - Math.pow(u * 2 - 1, 2)) }; }
  function necklace() {
    var g = new T.Group();
    var S = asset('nkstands', function () {
      var p = []; [-1, 1].forEach(function (sd) { var x = sd * NK_HALF; p.push(cyl(GOLD, 0.011, 0.012, 0.004, x, 0.002, 0, { w: 12, ink: 0.0004 }), cyl(NAVY, 0.004, 0.0075, 0.045, x, 0.0265, 0, { w: 10, ink: 0.0005 }), sph(NAVY, 0.0105, x, 0.0515, 0, { w: 10, h: 6, sy: 0.55, sx: 1.25, ink: 0.0005 }), cyl(NAVY, 0.0052, 0.0052, 0.011, x, 0.0625, 0, { w: 9 }), sph(NAVY, 0.0075, x, 0.0675, 0, { w: 10, h: 7, ink: 0.0005 }), sph(GOLD, 0.0019, x, 0.0765, 0, { w: 6, h: 5 })); });
      return p;
    }, 0.0004);
    g.add(meshOf(S));
    var cols = [WHT, WHT, GOLD, WHT, WHT, RED, WHT, WHT, GOLD, WHT, WHT, GRN, WHT];
    var B = asset('nkbeads', function () {
      var p = [], i; for (i = 0; i < NK_N; i++) { var q = nkPt(i / (NK_N - 1)); p.push(sph(cols[i % cols.length], i % 4 === 2 ? 0.0027 : 0.0023, q.x, q.y, 0, { w: 6, h: 4 })); } return p;
    });
    var beads = new T.Mesh(B.g, BCP.toon); g.add(beads); var vpb = B.g.attributes.position.count / NK_N;
    var curve = new T.CatmullRomCurve3([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(function (u) { var q = nkPt(u); return new T.Vector3(q.x, q.y, 0); })), TS = 32, tube = new T.TubeGeometry(curve, TS, 0.0007, 4, false);
    var str = new T.Mesh(tube, new T.MeshBasicMaterial({ color: 0x3a2a18 })); g.add(str);
    var pend = new T.Group(), q0 = nkPt(0.5); pend.position.set(q0.x, q0.y - 0.0026, 0.0); var pg = new T.Mesh(gemGeo(1.3), new T.MeshToonMaterial({ color: 0xffb3d9, gradientMap: BCP.grad, emissive: 0xc02a70, emissiveIntensity: 0.7 })); pg.position.y = -0.011; pg.rotation.x = PI; pend.add(pg);
    var pi = new T.Mesh(gemGeo(1.3), inkMat()); pi.scale.setScalar(1.16); pi.position.y = 0; pi.renderOrder = -1; pi.userData.ink = 1; pg.add(pi); g.add(pend);
    var sp = sparkSprite(0.01, 0xffd9ff); sp.position.set(q0.x + 0.003, q0.y - 0.008, 0.006); g.add(sp); g.add(blob(0.1)); g.children[g.children.length - 1].scale.set(0.26, 1, 0.05);
    function reveal(k) { var n = Math.max(0, Math.min(NK_N, Math.round(k * NK_N))); beads.geometry.setDrawRange(0, n * vpb); tube.setDrawRange(0, Math.round(Math.max(0, Math.min(1, k)) * TS) * 4 * 6); beads.visible = n > 0; str.visible = k > 0.02; pend.visible = k > 0.97; sp.visible = k > 0.97; pend.scale.setScalar(k > 0.97 ? 1 + Math.max(0, 1 - (k - 0.97) * 40) * 0.3 : 1); }
    reveal(1); g.scale.setScalar(NK_S); g.userData.reveal = reveal; g.userData.half = NK_HALF * NK_S; g.userData.pt = nkPt; g.userData.pend = pend;
    g.userData.tick = function (t) { sp.material.opacity = Math.max(0, Math.sin(t * 2.4)) * 0.9; pend.rotation.z = Math.sin(t * 1.3) * 0.05; };
    return g;
  }

  /* ==================== candy-cane pylons and the cable car ==================== */
  function pole(h, tall) {
    var g = new T.Group(), key = 'pole' + Math.round(h * 1000);
    var A = asset(key, function () {
      var p = [], n = Math.max(4, Math.round(h / 0.012)), i, sh = h / n; for (i = 0; i < n; i++) p.push(cyl(i % 2 ? WHT : RED, 0.0034, 0.0034, sh * 1.001, 0, sh * (i + 0.5), 0, { w: 9, ink: i === 0 ? 0 : 0 }));
      p.push(cyl(GOLD, 0.0075, 0.0085, 0.004, 0, 0.002, 0, { w: 10, ink: 0.0004 }), sph(GOLD, 0.0042, 0, h + 0.002, 0, { w: 8, h: 6, ink: 0.0004 }));
      if (tall) { p.push(box(WOOD, 0.012, 0.0024, 0.0024, 0.0, h - 0.002, 0), cyl(DK, 0.0052, 0.0052, 0.0022, 0, h + 0.0062, 0, { w: 10, rx: PI / 2, ink: 0.0004 }), cyl(GOLD, 0.0014, 0.0014, 0.0030, 0, h + 0.0062, 0, { w: 6, rx: PI / 2 })); }
      return p;
    }, 0.0004);
    var body = new T.Mesh(A.g, BCP.toon); g.add(body); var bk = new T.Mesh(A.g, inkMat()); bk.scale.set(1.35, 1.0, 1.35); bk.renderOrder = -1; bk.userData.ink = 1; g.add(bk);
    g.add(blob(0.012)); return g;
  }
  /* the gondola: an open red-and-white basket with a gilded rim, a hanger arm and a little bell. Origin: the top of the hanger (where it hangs from the cable). The floor is 0.052 below. */
  function cabin() {
    var g = new T.Group();
    var A = asset('cabin', function () {
      var p = [box(DRED, 0.074, 0.004, 0.034, 0, -0.056, 0, { ink: 0.0005 }), box(RED, 0.074, 0.016, 0.0024, 0, -0.046, 0.0158, { ink: 0.0005 }), box(RED, 0.074, 0.016, 0.0024, 0, -0.046, -0.0158, { ink: 0.0005 }), box(RED, 0.0024, 0.016, 0.034, 0.0358, -0.046, 0), box(RED, 0.0024, 0.016, 0.034, -0.0358, -0.046, 0)];
      for (var i = 0; i < 4; i++) { p.push(box(WHT, 0.008, 0.016, 0.0026, -0.027 + i * 0.018, -0.046, 0.0159), box(WHT, 0.008, 0.016, 0.0026, -0.027 + i * 0.018, -0.046, -0.0159)); }
      p.push(box(GOLD, 0.076, 0.0018, 0.036, 0, -0.0375, 0), cyl(WOOD, 0.0012, 0.0012, 0.05, -0.034, -0.0125, 0, { w: 5 }), cyl(WOOD, 0.0012, 0.0012, 0.05, 0.034, -0.0125, 0, { w: 5 }), box(WOOD, 0.072, 0.0022, 0.0022, 0, 0.0095, 0, { ink: 0.0003 }), cyl(DK, 0.0036, 0.0036, 0.0022, 0, 0.0128, 0, { w: 8, rx: PI / 2 }), cone(GOLD, 0.0034, 0.005, 0.02, -0.0372, 0, { w: 6, ink: 0.0003 }), sph(LGOLD, 0.0018, 0, -0.0382, 0.0185, { w: 5, h: 4 }));
      return p;
    }, 0.0005);
    g.add(meshOf(A)); g.userData.floor = -0.0535; g.userData.rim = -0.0375; return g;
  }
  /* the cable, as a thin tube along a gentle sag from A to B (stage-local points) */
  function cable(A, B, sag) {
    var pts = [], i; for (i = 0; i <= 16; i++) { var u = i / 16; pts.push(new T.Vector3(A.x + (B.x - A.x) * u, A.y + (B.y - A.y) * u - sag * 4 * u * (1 - u), A.z + (B.z - A.z) * u)); }
    var cv = new T.CatmullRomCurve3(pts), m = new T.Mesh(new T.TubeGeometry(cv, 24, 0.0009, 4, false), new T.MeshBasicMaterial({ color: 0x4a3626 })); m.userData.curve = cv; m.userData.sag = sag; return m;
  }

  /* ==================== the blank plaque: a gold frame, a blank creamy face that can glow, two little posts. NO letters, NO logo: the shop's artwork will go on userData.face. ==================== */
  function plaque() {
    var g = new T.Group(), PW = 0.17, PH = 0.094, PY = 0.062;
    var A = asset('plaque', function () {
      var p = [box(GOLD, PW, PH, 0.008, 0, PY + PH / 2, 0, { ink: 0.0007 }), box(LGOLD, PW - 0.004, 0.003, 0.0085, 0, PY + PH - 0.0016, 0), box(WOOD, 0.012, PY + 0.004, 0.012, -0.05, (PY + 0.004) / 2, 0, { ink: 0.0005 }), box(WOOD, 0.012, PY + 0.004, 0.012, 0.05, (PY + 0.004) / 2, 0, { ink: 0.0005 }), box(DWOOD, 0.13, 0.005, 0.03, 0, 0.0025, 0, { ink: 0.0005 })];
      var n = 14, i; for (i = 0; i <= n; i++) { var x = -PW / 2 + 0.003 + i * (PW - 0.006) / n; p.push(sph(i % 2 ? RED : GRN, 0.0026, x, PY + PH + 0.0004, 0.002, { w: 5, h: 4 }), sph(i % 2 ? RED : GRN, 0.0026, x, PY - 0.0004, 0.002, { w: 5, h: 4 })); }
      return p;
    }, 0.0005);
    g.add(meshOf(A));
    var face = new T.Mesh(new T.PlaneGeometry(PW - 0.016, PH - 0.016), new T.MeshBasicMaterial({ color: 0xcdbf9a })); face.position.set(0, PY + PH / 2, 0.0046); g.add(face);
    var halo = glowSprite(0.2, 0, 0xffe2a0); halo.position.set(0, PY + PH / 2, 0.012); halo.scale.set(0.3, 0.2, 1); g.add(halo);
    var on = new T.Color(0xfff3c4), off = new T.Color(0xcdbf9a), tmp = new T.Color();
    g.userData.face = face; g.userData.glowK = 0; g.userData.PW = PW; g.userData.PH = PH; g.userData.centre = new T.Vector3(0, PY + PH / 2, 0.0);
    g.userData.setGlow = function (k) { g.userData.glowK = k; face.material.color.copy(tmp.copy(off).lerp(on, k)); halo.material.opacity = 0.75 * k; };
    g.userData.tick = function (t) { var k = g.userData.glowK; if (k > 0.5) halo.scale.set(0.3 * (1 + Math.sin(t * 2.5) * 0.04), 0.2 * (1 + Math.sin(t * 2.5) * 0.04), 1); };
    return g;
  }

  /* ==================== a tiny display shelf (two levels), a gift basket and a velvet runner ==================== */
  function shelf() {
    var g = new T.Group(), SW = 0.12, SH2 = 0.14, SD = 0.04;
    var A = asset('shelf', function () {
      var p = [box(WOOD, 0.004, SH2, SD, -SW / 2 + 0.002, SH2 / 2, 0, { ink: 0.0005 }), box(WOOD, 0.004, SH2, SD, SW / 2 - 0.002, SH2 / 2, 0, { ink: 0.0005 }), box(DWOOD, SW, SH2, 0.003, 0, SH2 / 2, -SD / 2 + 0.0015), box(WOOD, SW, 0.004, SD, 0, 0.002, 0, { ink: 0.0005 }), box(WOOD, SW, 0.004, SD, 0, 0.0715, 0, { ink: 0.0005 }), box(WOOD, SW + 0.006, 0.004, SD + 0.004, 0, SH2 + 0.002, 0, { ink: 0.0005 }), box(GOLD, SW, 0.0018, 0.0016, 0, 0.0755, SD / 2)];
      /* small things on the lower shelf: a tiny ring tower, two jewel boxes. The upper shelf is left open for visitors. */
      p.push(box(RED, 0.016, 0.014, 0.014, -0.036, 0.011, 0.0, { ink: 0.0004 }), box(GOLD, 0.0018, 0.0142, 0.0142, -0.036, 0.011, 0), box(NAVY, 0.014, 0.011, 0.012, -0.015, 0.0095, 0.004, { ink: 0.0004 }), cyl(VEL, 0.0035, 0.0035, 0.017, 0.034, 0.0125, 0, { w: 8, ink: 0.0004 }));
      for (var i = 0; i < 3; i++) p.push(tor(GOLD, 0.0036, 0.001, 0.034, 0.0095 + i * 0.0045, 0, { w: 10, h: 4, flat: 1 }));
      p.push(sph(GRN, 0.0022, -0.044, 0.0816, 0.004, { w: 6, h: 5 }), box(GOLD, 0.01, 0.01, 0.01, 0.046, 0.0805, 0.002, { ink: 0.0004 }));
      return p;
    }, 0.0005);
    g.add(meshOf(A)); g.add(blob(0.06)); g.children[1].scale.set(0.13, 1, 0.07); g.userData.W = SW; g.userData.H = SH2; g.userData.D = SD; g.userData.upper = 0.0735; return g;
  }
  function crate() {
    var g = new T.Group();
    var A = asset('crate', function () {
      var p = [box(WOOD, 0.052, 0.003, 0.034, 0, 0.0015, 0, { ink: 0.0005 }), box(WOOD, 0.052, 0.022, 0.0026, 0, 0.012, 0.0157, { ink: 0.0005 }), box(WOOD, 0.052, 0.022, 0.0026, 0, 0.012, -0.0157, { ink: 0.0005 }), box(DWOOD, 0.0026, 0.022, 0.034, 0.0247, 0.012, 0, { ink: 0.0005 }), box(DWOOD, 0.0026, 0.022, 0.034, -0.0247, 0.012, 0, { ink: 0.0005 })];
      [-0.014, 0.0, 0.014].forEach(function (x, i) { p.push(box([0xff5a4a, 0xffe14a, 0x5ac85a][i], 0.012, 0.0014, 0.026, x, 0.0156, 0, { rz: (i - 1) * 0.25 })); });
      p.push(box(RED, 0.054, 0.004, 0.0028, 0, 0.0225, 0.0158), sph(GOLD, 0.003, 0, 0.0245, 0.0165, { w: 6, h: 5 }));
      return p;
    }, 0.0005);
    g.add(meshOf(A)); g.add(blob(0.034)); g.userData.top = 0.016; return g;
  }
  /* a velvet runner for the counter, so the scene has a floor of its own (also in AR on a bare counter) */
  function runner(w, d) {
    var g = new T.Group(), A = asset('runner', function () { return [box(VEL, w, 0.003, d, 0, 0.0015, 0, { ink: 0.0007 }), box(GOLD, w + 0.002, 0.0012, 0.004, 0, 0.0034, d / 2 - 0.0025), box(GOLD, w + 0.002, 0.0012, 0.004, 0, 0.0034, -d / 2 + 0.0025), box(GOLD, 0.004, 0.0012, d, w / 2 - 0.0025, 0.0034, 0), box(GOLD, 0.004, 0.0012, d, -w / 2 + 0.0025, 0.0034, 0)]; }, 0.0008);
    g.add(meshOf(A)); g.userData.top = 0.0042; return g;
  }

  /* ==================== confetti: one instanced mesh of small flat pieces. burst() gives each piece a start and a fall; step(dt) moves them. Colours are a fixed table. ==================== */
  var CONF = [0xff6f91, 0xffc93d, 0x7fd36a, 0x5ab4ff, 0xc77dff, 0xff9a3d, 0xfff6e6];
  function confetti(N) {
    N = N || 160; var g = new T.Group(), im = new T.InstancedMesh(new T.PlaneGeometry(0.0085, 0.0052), new T.MeshBasicMaterial({ side: T.DoubleSide }), N), d = new T.Object3D(), c = new T.Color(), pcs = [], i;
    for (i = 0; i < N; i++) { pcs.push({ on: 0, x: 0, y: -9, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, rz: 0, wx: 0, wz: 0, t: 0, s: 1 }); im.setColorAt(i, c.setHex(CONF[i % 7])); }
    im.frustumCulled = false; g.add(im); var next = 0;
    function put() { for (var i = 0; i < N; i++) { var p = pcs[i]; d.position.set(p.x, p.on ? p.y : -9, p.z); d.rotation.set(p.rx, 0, p.rz); d.scale.setScalar(p.on ? p.s : 0.0001); d.updateMatrix(); im.setMatrixAt(i, d.matrix); } im.instanceMatrix.needsUpdate = true; }
    g.userData.burst = function (rnd, cx, cy, cz, spread, n, up) {
      for (var k = 0; k < (n || 60); k++) { var p = pcs[next]; next = (next + 1) % N; p.on = 1; p.x = cx + (rnd() - 0.5) * spread; p.y = cy + rnd() * 0.04; p.z = cz + (rnd() - 0.5) * spread * 0.6; p.vx = (rnd() - 0.5) * 0.05; p.vz = (rnd() - 0.5) * 0.04; p.vy = (up ? 0.06 + rnd() * 0.09 : -0.002 - rnd() * 0.01); p.rx = rnd() * 6; p.rz = rnd() * 6; p.wx = (rnd() - 0.5) * 14; p.wz = (rnd() - 0.5) * 14; p.s = 0.8 + rnd() * 0.7; p.t = 0; }
    };
    g.userData.step = function (dt) { for (var i = 0; i < N; i++) { var p = pcs[i]; if (!p.on) continue; p.t += dt; p.vy -= 0.12 * dt; if (p.vy < -0.035) p.vy = -0.035; p.x += (p.vx + Math.sin(p.t * 4 + i) * 0.012) * dt; p.z += p.vz * dt; p.y += p.vy * dt; p.rx += p.wx * dt; p.rz += p.wz * dt; if (p.y <= 0.002) { p.on = 0; } } put(); };
    g.userData.active = function () { for (var i = 0; i < N; i++) if (pcs[i].on) return true; return false; };
    g.userData.clear = function () { for (var i = 0; i < N; i++) pcs[i].on = 0; put(); };
    g.userData.pieces = pcs; put(); return g;
  }

  /* ==================== the life-size practice shop (metres). Options: {tree: a built pine tree group (scaled by the caller), gifts: the gift maker}.
     Layout: back wall z = -1.7, left wall x = -2.2, right wall x = 2.2 (with a window), floor 4.4 x 3.8. The main counter's top is 0.96 m, its middle (0, -0.95). The glass case is on the left. ==================== */
  function wood(w, h, d, c, x, y, z, ink, g) { var m = new T.Mesh(new T.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); g.add(m); if (ink) { var k = new T.Mesh(m.geometry, inkMat()); var e = ink; k.scale.set(1 + e / (w / 2), 1 + e / (h / 2), 1 + e / (d / 2)); k.renderOrder = -1; k.userData.ink = 1; m.add(k); } return m; }
  function room(opts) {
    opts = opts || {}; var g = new T.Group(), noStand = [], ticks = [], grad = BCP.grad;
    /* floor: terracotta and cream tiles */
    var ft = canv(256, 256, function (x) { for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#e8d6b4' : '#b8694a'; x.fillRect(i * 32, j * 32, 32, 32); x.fillStyle = 'rgba(60,30,10,.1)'; x.fillRect(i * 32, j * 32, 32, 2); x.fillRect(i * 32, j * 32, 2, 32); } });
    ft.wrapS = ft.wrapT = T.RepeatWrapping; ft.repeat.set(5.5, 4.75);
    var fl = new T.Mesh(new T.PlaneGeometry(4.4, 3.8).rotateX(-PI / 2), new T.MeshToonMaterial({ map: ft, gradientMap: grad })); fl.position.set(0, -0.002, -0.0); g.add(fl);
    /* walls: green wainscot below, cream paper with little gold diamonds above */
    var wt = canv(128, 128, function (x) { x.fillStyle = '#f3e6cc'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#e1c37a'; for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { var cx = i * 32 + 16 + (j % 2) * 0, cy = j * 32 + 16; x.beginPath(); x.moveTo(cx, cy - 4); x.lineTo(cx + 3, cy); x.lineTo(cx, cy + 4); x.lineTo(cx - 3, cy); x.fill(); } });
    wt.wrapS = wt.wrapT = T.RepeatWrapping; wt.repeat.set(7, 3.5);
    var wallM = new T.MeshToonMaterial({ map: wt, gradientMap: grad, side: T.DoubleSide });
    function wall(w, h, x, y, z, ry) { var m = new T.Mesh(new T.PlaneGeometry(w, h), wallM); m.position.set(x, y, z); m.rotation.y = ry || 0; g.add(m); return m; }
    wall(4.4, 2.7, 0, 1.35, -1.7, 0); wall(3.8, 2.7, -2.2, 1.35, 0, PI / 2);
    wood(4.4, 0.95, 0.04, 0x2f6a4a, 0, 0.475, -1.68, 0.004, g); wood(0.04, 0.95, 3.8, 0x2f6a4a, -2.18, 0.475, 0, 0.004, g); wood(4.4, 0.06, 0.06, GOLD, 0, 0.96, -1.66, 0, g); wood(4.4, 0.08, 0.06, 0xf6f0e4, 0, 2.66, -1.67, 0, g);
    /* the right wall has a shop window (z from -0.9 to 0.9, y from 0.55 to 2.2): wall pieces around it, a frame, glass, a painted street beyond */
    wall(0.8, 2.7, 2.2, 1.35, -1.3, -PI / 2); wall(1.0, 2.7, 2.2, 1.35, 1.4, -PI / 2); wall(1.8, 0.55, 2.2, 0.275, 0.0, -PI / 2); wall(1.8, 0.5, 2.2, 2.45, 0.0, -PI / 2);
    wood(0.06, 0.06, 1.9, 0xf6f0e4, 2.17, 2.2, 0.0, 0, g); wood(0.06, 0.06, 1.9, 0xf6f0e4, 2.17, 0.55, 0.0, 0, g); [-0.9, 0.0, 0.9].forEach(function (z) { wood(0.05, 1.65, 0.05, 0xf6f0e4, 2.17, 1.375, z, 0, g); }); wood(0.04, 0.05, 1.8, 0xf6f0e4, 2.17, 1.4, 0, 0, g);
    var street = canv(256, 128, function (x) { var s = x.createLinearGradient(0, 0, 0, 128); s.addColorStop(0, '#9fc8f0'); s.addColorStop(1, '#f2e8f4'); x.fillStyle = s; x.fillRect(0, 0, 256, 128); x.fillStyle = '#fffaf0'; x.fillRect(0, 96, 256, 32); var cols = ['#d9a08a', '#c9b08a', '#9ab0c8', '#d8c0a0', '#b88a8a']; for (var i = 0; i < 8; i++) { x.fillStyle = cols[i % 5]; x.fillRect(i * 34 - 4, 46 + (i % 3) * 8, 32, 52); x.fillStyle = '#f6f6ff'; x.beginPath(); x.moveTo(i * 34 - 6, 46 + (i % 3) * 8); x.lineTo(i * 34 + 12, 28 + (i % 3) * 8); x.lineTo(i * 34 + 30, 46 + (i % 3) * 8); x.fill(); x.fillStyle = '#ffe9a8'; x.fillRect(i * 34 + 6, 62 + (i % 3) * 8, 7, 9); } });
    var st = new T.Mesh(new T.PlaneGeometry(2.6, 1.3), new T.MeshBasicMaterial({ map: street })); st.position.set(2.5, 1.35, 0); st.rotation.y = -PI / 2; g.add(st);
    var gl = new T.Mesh(new T.PlaneGeometry(1.8, 1.65), new T.MeshStandardMaterial({ color: 0xd8efff, transparent: true, opacity: 0.16, metalness: 0.3, roughness: 0.05, envMap: envCube(), depthWrite: false })); gl.position.set(2.15, 1.375, 0); gl.rotation.y = -PI / 2; gl.renderOrder = 3; g.add(gl);
    /* the window display: a plinth along the window with velvet, a big ring on a cushion, gift boxes, a wreath on the glass */
    wood(0.5, 0.42, 1.7, DWOOD, 1.93, 0.21, 0, 0.004, g); wood(0.54, 0.02, 1.74, GOLD, 1.93, 0.425, 0, 0, g); wood(0.46, 0.02, 1.66, VEL, 1.93, 0.44, 0, 0, g);
    var gd = opts.gifts || gift; [[0, 1.93, -0.55, 0.25, 3.2], [3, 1.85, -0.2, 0.6, 2.4], [1, 2.0, 0.45, 0.1, 2.9], [4, 1.86, 0.6, 0.9, 2.2]].forEach(function (q) { var b = gd(q[0]); b.scale.setScalar(q[4]); b.position.set(q[1], 0.445, q[2]); b.rotation.y = q[3]; g.add(b); });
    var wr = new T.Group(); wr.add(new T.Mesh(new T.TorusGeometry(0.28, 0.055, 7, 28), M(0x2f7a46))); [[0.2, 0.2], [-0.15, 0.22], [-0.22, -0.12], [0.1, -0.26]].forEach(function (q, i) { var b = new T.Mesh(new T.SphereGeometry(0.03, 6, 5), M(i % 2 ? 0xe0402f : 0xffc82e)); b.position.set(q[0], q[1], 0.05); wr.add(b); });
    var bw = new T.Mesh(new T.TorusGeometry(0.07, 0.025, 5, 12), M(0xe0402f)); bw.position.set(0, -0.28, 0.05); wr.add(bw); wr.position.set(2.12, 1.55, 0.2); wr.rotation.y = -PI / 2; g.add(wr);
    /* the main counter: wood body with five inset panels, a gold kickplate and a pale top with a little overhang */
    var cx0 = 0, cz0 = -0.95;
    wood(2.4, 0.9, 0.6, 0x7a4a26, cx0, 0.47, cz0, 0.006, g); for (var i = -2; i <= 2; i++) wood(0.36, 0.62, 0.02, 0x9a6234, i * 0.45, 0.5, cz0 + 0.305, 0, g); wood(2.4, 0.07, 0.6, GOLD, cx0, 0.035, cz0 + 0.01, 0, g);
    wood(2.52, 0.05, 0.7, 0xeadcc2, cx0, 0.945, cz0 + 0.03, 0.006, g);
    g.userData.counterTop = 0.97; g.userData.stagePos = new T.Vector3(cx0 - 0.12, 0.97, cz0);
    /* the till area: a toy cash register at the right end of the counter, a bell, a card reader */
    var till = new T.Group(); wood(0.34, 0.12, 0.28, 0x4a5058, 0, 0.06, 0, 0.006, till); wood(0.3, 0.06, 0.22, 0x5a6068, 0, 0.15, 0.0, 0.004, till); var scr = wood(0.2, 0.1, 0.012, 0x15222a, 0, 0.25, -0.05, 0.004, till); scr.rotation.x = -0.35; var scrF = new T.Mesh(new T.PlaneGeometry(0.17, 0.07), new T.MeshBasicMaterial({ color: 0x4fe0a8 })); scrF.position.z = 0.0072; scr.add(scrF);
    for (var r = 0; r < 3; r++) for (var c2 = 0; c2 < 4; c2++) wood(0.04, 0.012, 0.03, [0xe8e0d0, 0xe8e0d0, 0xe8e0d0, 0xe0402f][c2 % 4], -0.1 + c2 * 0.065, 0.185, 0.0 + (r - 1) * 0.05 + 0.04, 0, till);
    wood(0.3, 0.03, 0.02, GOLD, 0, 0.05, 0.145, 0, till); var bell = new T.Mesh(new T.SphereGeometry(0.04, 10, 6, 0, TAU, 0, PI / 2), M(GOLD)); bell.position.set(0.26, 0, 0.09); till.add(bell); wood(0.1, 0.01, 0.08, 0x3a4048, 0.32, 0.005, 0.06, 0, till); wood(0.06, 0.01, 0.1, 0x2a2e34, 0.32, 0.03, 0.06, 0, till).rotation.x = -0.3;
    till.position.set(0.95, 0.97, cz0); g.add(till); g.userData.till = till;
    /* the glass display case on the left: wooden base, gilded corner posts, glass panes, a velvet floor with little things inside. Creatures never stand on its glass top. */
    var cx = -1.72, cz = -0.2, cw = 0.6, cd = 1.5;
    wood(cw, 0.74, cd, 0x7a4a26, cx, 0.37, cz, 0.006, g); wood(cw + 0.04, 0.02, cd + 0.04, GOLD, cx, 0.74, cz, 0, g); wood(cw - 0.04, 0.02, cd - 0.04, VEL, cx, 0.755, cz, 0, g);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { wood(0.03, 0.3, 0.03, GOLD, cx + s[0] * (cw / 2 - 0.0), 0.92, cz + s[1] * (cd / 2 - 0.0), 0.002, g); });
    [[0, 1], [0, -1]].forEach(function (q) { wood(cw + 0.03, 0.025, 0.03, GOLD, cx, 1.075, cz + q[1] * cd / 2, 0, g); }); [1, -1].forEach(function (q) { wood(0.03, 0.025, cd + 0.03, GOLD, cx + q * cw / 2, 1.075, cz, 0, g); });
    var glassM = new T.MeshStandardMaterial({ color: 0xcfe9f5, transparent: true, opacity: 0.17, metalness: 0.35, roughness: 0.04, envMap: envCube(), envMapIntensity: 1.2, depthWrite: false });
    function pane(w, h, x, y, z, ry, rx) { var m = new T.Mesh(new T.PlaneGeometry(w, h), glassM.clone()); m.material.side = T.DoubleSide; m.position.set(x, y, z); m.rotation.y = ry || 0; m.rotation.x = rx || 0; m.renderOrder = 3; g.add(m); return m; }
    pane(cd, 0.3, cx + cw / 2, 0.92, cz, PI / 2); pane(cd, 0.3, cx - cw / 2, 0.92, cz, PI / 2); pane(cw, 0.3, cx, 0.92, cz - cd / 2, 0); pane(cw, 0.3, cx, 0.92, cz + cd / 2, 0); pane(cw, cd, cx, 1.075, cz, 0, -PI / 2);
    /* inside the case: rings on cushions, a pearl necklace on a stand, small gift boxes (all scaled up from creature size) */
    for (var k = 0; k < 4; k++) { var cu = new T.Mesh(new T.CylinderGeometry(0.05, 0.055, 0.04, 10), M(k % 2 ? VEL : NAVY)); cu.position.set(cx + 0.1, 0.8, cz - 0.55 + k * 0.32); g.add(cu); var rg = new T.Mesh(new T.TorusGeometry(0.028, 0.007, 6, 14), M(GOLD)); rg.position.set(cx + 0.1, 0.86, cz - 0.55 + k * 0.32); rg.rotation.y = PI / 2; g.add(rg); var jm = new T.Mesh(new T.OctahedronGeometry(0.015), M([0xbfeeff, 0xff9ac8, 0x9affb8, 0xffe58a][k])); jm.position.set(cx + 0.1, 0.9, cz - 0.55 + k * 0.32); g.add(jm); }
    var nk = necklace(); nk.scale.setScalar(2.0); nk.position.set(cx - 0.08, 0.78, cz - 0.05); nk.rotation.y = PI / 2; g.add(nk); ticks.push(nk.userData.tick);
    [[2, cx - 0.08, cz + 0.55], [5, cx + 0.12, cz + 0.6]].forEach(function (q) { var b = gd(q[0]); b.scale.setScalar(1.3); b.position.set(q[1], 0.775, q[2]); b.rotation.y = 0.4; g.add(b); });
    noStand.push({ x0: cx - cw / 2 - 0.03, x1: cx + cw / 2 + 0.03, z0: cz - cd / 2 - 0.03, z1: cz + cd / 2 + 0.03, y: 1.09, why: 'glass case top' });
    /* wall shelves above the counter: gift boxes and little ring stands, scaled up */
    [1.55, 1.98].forEach(function (y, si) { wood(2.0, 0.035, 0.26, WOOD, -0.1 + si * 0.0, y, -1.56, 0.004, g); wood(2.0, 0.015, 0.02, GOLD, -0.1, y - 0.02, -1.43, 0, g); [-0.8, -0.4, 0.05, 0.5, 0.85].forEach(function (x, i) { var b = gd((i + si * 3) % 7); b.scale.setScalar(2.4 - (i % 2) * 0.5); b.position.set(x - 0.1, y + 0.0175, -1.56); b.rotation.y = (i - 2) * 0.12; g.add(b); }); });
    [-0.62, 0.38].forEach(function (x, i) { var rg = ring(); rg.scale.setScalar(2.2); rg.position.set(x, 1.55 + 0.0175 + RR * 2.2 + 0.005, -1.52); g.add(rg); ticks.push(rg.userData.tick); });
    /* a wreath on the back wall, the big pine tree in the corner, a runner rug in front of the counter, bunting and fairy lights */
    var w2 = wr.clone(); w2.position.set(0.0, 1.78, -1.69); w2.rotation.y = 0; w2.scale.setScalar(0.8); g.add(w2);
    if (opts.tree) { opts.tree.position.set(1.62, 0, -1.25); g.add(opts.tree); g.userData.tree = opts.tree; }
    var rug = new T.Mesh(new T.PlaneGeometry(2.0, 0.9).rotateX(-PI / 2), M(0xa3203a)); rug.position.set(0.0, 0.002, -0.2); g.add(rug); var rug2 = new T.Mesh(new T.PlaneGeometry(1.84, 0.74).rotateX(-PI / 2), M(0x6e1226)); rug2.position.set(0.0, 0.003, -0.2); g.add(rug2);
    var lights = []; var lmatA = new T.MeshBasicMaterial({ color: 0xffd36a }), lmatB = new T.MeshBasicMaterial({ color: 0xff6a5a }), lmatC = new T.MeshBasicMaterial({ color: 0x6adcff }), lg = new T.SphereGeometry(0.025, 6, 5);
    var strand = []; for (var li = 0; li <= 28; li++) { var u = li / 28, lx = -2.15 + u * 4.3, ly = 2.52 - 0.14 * Math.sin(u * PI * 4) * Math.sin(u * PI * 4) * 0.9 - 0.02 * Math.sin(u * 9); strand.push(new T.Vector3(lx, ly, -1.62)); var bl = new T.Mesh(lg, [lmatA, lmatB, lmatC][li % 3]); bl.position.set(lx, ly - 0.03, -1.62); g.add(bl); lights.push(bl); }
    var wire = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(strand), 60, 0.004, 4, false), new T.MeshBasicMaterial({ color: 0x2f6a4a })); g.add(wire);
    g.userData.noStand = noStand; g.userData.lights = lights;
    g.userData.tick = function (t) { for (var q = 0; q < ticks.length; q++) ticks[q](t); lmatA.color.setHex(Math.sin(t * 2.0) > -0.3 ? 0xffd36a : 0x8a7a3a); lmatB.color.setHex(Math.sin(t * 2.0 + 2.1) > -0.3 ? 0xff6a5a : 0x7a3a34); lmatC.color.setHex(Math.sin(t * 2.0 + 4.2) > -0.3 ? 0x6adcff : 0x2f5a6a); };
    return g;
  }

  var MK = { ring: ring, gem: gem, gift: gift, giftWrap: giftWrap, tray: tray, necklace: necklace, pole: pole, cabin: cabin, plaque: plaque, shelf: shelf, crate: crate, runner: runner, confetti: confetti, room: room };
  var API = { version: 1, keys: Object.keys(MK), GIFT: GIFT, RR: RR };
  API.init = function (api) {
    T = api.THREE; BCP = api.BCP; bcMerge = api.bcMerge; M = api.M; M(0xffffff);
    if (!BCP.toon) BCP.toon = new T.MeshToonMaterial({ vertexColors: true, gradientMap: BCP.grad, side: T.DoubleSide });
    if (!BCP.inks) BCP.inks = {};
    m4 = new T.Matrix4(); q4 = new T.Quaternion(); e4 = new T.Euler(); v3 = new T.Vector3(); s3 = new T.Vector3(); ASSETS = {}; SH = {}; ready = true;
  };
  Object.keys(MK).forEach(function (k) { API[k] = function () { if (!ready) throw new Error('shop-props.js: init() first'); return MK[k].apply(null, arguments); }; });
  API.reflection = function (a, b) { return reflection(a, b); }; API.cable = function (a, b, c) { return cable(a, b, c); }; API.nkPt = nkPt;
  root.BC_SHOP_MK = API;
})(window);
