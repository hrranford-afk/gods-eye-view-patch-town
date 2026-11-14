/* Base Camp places (build 25): window.BC_PLACES_MK, the models for local goods (HANDOVER "Places and location").
   At creature scale (a creature is about 5 cm), made from household things:
   - loom(): a tiny loom made from a comb and lolly sticks. Two lolly-stick uprights, a top and a bottom bar, a pocket comb as the heddle, cream warp threads,
     a striped rug growing at the bottom, a cotton-bud shuttle that slides to and fro, and finished rugs rolled up beside it.
   - pile(kind): a little heap of the local goods by the camp: 'wool' (wool tufts), 'shore' (shells and salt crystals), 'wood' (acorns and conkers), 'street' (bottle caps and string).
   Built like models/decor.js: the body of each model is ONE merged vertex-coloured geometry (the game's bcMerge, the shared toon material) with ONE ink hull (the game's inked).
   The parts that change (the woven rug, the shuttle, the rolled rugs, the heap size) are their own meshes. No letters on any object, no brands.
   The game calls BC_PLACES_MK.init({THREE, BCP, inked, bcMerge, M, toon}) once, then loom() or pile(kind).
   userData.tick(time, n, busy): n is how many finished goods to show (rugs, or items in the heap), busy is true while the loom is weaving.
   If this file is missing or throws, index.html builds plain shapes instead. */
(function (root) {
  'use strict';
  var T, BCP, bcMerge, inked, toon, ready = false;
  var PI = Math.PI, TAU = Math.PI * 2;
  var STICK = 0xe8c48e, DSTICK = 0xb98a52, COMB = 0x3a6fc4, CRM = 0xfff3dc, RED = 0xd94b4b, TEAL = 0x39b0a4, GOLD = 0xffc82e, PNK = 0xff8fb0, PUR = 0x9a62d6,
    SHELL = 0xffe2c8, SHELL2 = 0xffb8a8, SALT = 0xf4fbff, ACORN = 0xb07a3a, CAP = 0x6b4a26, CONK = 0x7a3518, BRED = 0xe0402f, BBLU = 0x3f86dd, BSIL = 0xc4ccd4, STR = 0xd8b884;
  var CACHE = {};

  function P(g, c, x, y, z, o) { o = o || {}; return { g: g, c: c, x: x || 0, y: y || 0, z: z || 0, rx: o.rx, ry: o.ry, rz: o.rz, sx: o.sx, sy: o.sy, sz: o.sz }; }
  function box(c, w, h, d, x, y, z, o) { return P(new T.BoxGeometry(w, h, d), c, x, y, z, o); }
  function sph(c, r, x, y, z, o) { o = o || {}; return P(o.half ? new T.SphereGeometry(r, o.w || 8, o.h || 5, 0, TAU, 0, PI / 2) : new T.SphereGeometry(r, o.w || 8, o.h || 6), c, x, y, z, o); }
  function cyl(c, rt, rb, h, x, y, z, o) { o = o || {}; return P(new T.CylinderGeometry(rt, rb, h, o.w || 8), c, x, y, z, o); }
  function ico(c, r, x, y, z, o) { return P(new T.IcosahedronGeometry(r, (o && o.d) || 0), c, x, y, z, o); }
  function tor(c, R, r, x, y, z, o) { o = o || {}; var g = new T.TorusGeometry(R, r, 4, o.w || 12); g.rotateX(PI / 2); return P(g, c, x, y, z, o); }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function body(key, parts, ink) { var m = new T.Mesh(bcMerge('pl_' + key, parts), toon()); if (ink) inked(m, ink); return m; }

  /* ---- the loom: about 3 cm wide and 3.6 cm tall, front +z ---- */
  function loomParts() {
    var p = [], W = 0.03, H = 0.036;
    p.push(box(STICK, 0.0032, H, 0.0012, -W / 2, H / 2, 0), box(STICK, 0.0032, H, 0.0012, W / 2, H / 2, 0)); /* two lolly-stick uprights */
    p.push(box(STICK, W + 0.006, 0.0032, 0.0012, 0, H - 0.002, 0.0012), box(STICK, W + 0.006, 0.0032, 0.0012, 0, 0.004, 0.0012)); /* top and bottom bars */
    p.push(box(DSTICK, 0.0034, 0.0012, 0.012, -W / 2, 0.0006, 0.002), box(DSTICK, 0.0034, 0.0012, 0.012, W / 2, 0.0006, 0.002)); /* little feet so it stands */
    for (var i = 0; i < 9; i++) p.push(box(CRM, 0.0005, H - 0.008, 0.0005, -W / 2 + 0.0035 + i * (W - 0.007) / 8, H / 2, 0.0008)); /* warp threads */
    p.push(box(COMB, W + 0.002, 0.0026, 0.0014, 0, H * 0.62, 0.0018)); /* the pocket comb: its spine */
    for (i = 0; i < 15; i++) p.push(box(COMB, 0.0006, 0.0032, 0.0012, -W / 2 + 0.001 + i * W / 14, H * 0.62 - 0.0028, 0.0018)); /* and its teeth */
    for (i = 0; i < 4; i++) p.push(sph([RED, GOLD, TEAL, PNK][i], 0.0016, -W / 2 - 0.0008, 0.009 + i * 0.0032, -0.002, { w: 6, h: 4 })); /* wool balls stacked by the upright */
    return p;
  }
  function wovenGeo() { /* the rug on the loom, as a stripe pattern; scaled in y as it grows */
    var p = [], W = 0.026, cols = [RED, GOLD, RED, TEAL, RED, PUR];
    for (var i = 0; i < cols.length; i++) p.push(box(cols[i], W, 0.0026, 0.0009, 0, 0.0013 + i * 0.0026, 0));
    return bcMerge('pl_woven', p);
  }
  function rolledGeo() { /* a finished rug, rolled up, with fringe */
    var p = [cyl(RED, 0.0026, 0.0026, 0.016, 0, 0, 0, { w: 8, rz: PI / 2 }), cyl(GOLD, 0.0027, 0.0027, 0.003, 0, 0, 0, { w: 8, rz: PI / 2 })];
    for (var s = -1; s <= 1; s += 2) for (var k = 0; k < 4; k++) p.push(box(CRM, 0.0016, 0.0004, 0.0004, s * 0.0088, -0.0012 + k * 0.0009, 0.0018));
    return bcMerge('pl_rolled', p);
  }
  function loom() {
    var g = new T.Group(), b = body('loom', loomParts(), 0.0006); g.add(b);
    var woven = new T.Mesh(wovenGeo(), toon()); woven.position.set(0, 0.0058, 0.0012); woven.scale.y = 0.15; g.add(woven);
    var shuttle = new T.Mesh(bcMerge('pl_shuttle', [cyl(CRM, 0.0006, 0.0006, 0.012, 0, 0, 0, { w: 5, rz: PI / 2 }), sph(CRM, 0.0013, -0.006, 0, 0, { w: 6, h: 4 }), sph(CRM, 0.0013, 0.006, 0, 0, { w: 6, h: 4 }), cyl(RED, 0.001, 0.001, 0.004, 0, 0, 0, { w: 6, rz: PI / 2 })]), toon());
    shuttle.position.set(0, 0.012, 0.0028); g.add(shuttle);
    var rolls = [], rg = rolledGeo();
    for (var i = 0; i < 3; i++) { var r = new T.Mesh(rg, toon()); r.position.set(0.026, 0.0027 + i * 0.0049, 0.004 - (i % 2) * 0.0015); r.rotation.y = 1.45 + i * 0.12; r.visible = false; inked(r, 0.0004); g.add(r); rolls.push(r); }
    var sh = shadow(0.03); g.add(sh);
    var w0 = 0.15;
    g.userData = { bcPlaces: 'loom', woven: woven, shuttle: shuttle, rolls: rolls, tick: function (time, n, busy) {
      for (var k = 0; k < rolls.length; k++) rolls[k].visible = k < Math.min(rolls.length, n | 0);
      if (busy) { w0 = Math.min(1, w0 + 0.0008); shuttle.position.x = Math.sin(time * 2.2) * 0.011; shuttle.position.y = 0.006 + woven.scale.y * 0.0156 + 0.001; } else shuttle.position.x *= 0.95;
      if (!busy && w0 >= 1) w0 = 0.15; woven.scale.y = w0;
    } };
    return g;
  }

  /* ---- the heaps: up to 6 items, one merged geometry per heap size ---- */
  var SPOTS = [[0, 0], [0.006, 0.003], [-0.005, 0.004], [0.002, -0.006], [-0.006, -0.003], [0.0005, 0.0005]];
  function item(kind, i, x, z, r) {
    var y = i === 5 ? 0.004 : 0, a = r() * TAU, out = [];
    if (kind === 'wool') { out.push(ico([PNK, RED, CRM, GOLD, PUR, TEAL][i], 0.0028, x, 0.0026 + y, z, { d: 1, sy: 0.8, ry: a })); out.push(ico([PNK, RED, CRM, GOLD, PUR, TEAL][i], 0.0017, x + 0.0019, 0.0035 + y, z + 0.0008, { d: 0 })); }
    else if (kind === 'shore') {
      if (i % 2 === 0) { out.push(sph(i % 4 ? SHELL2 : SHELL, 0.0032, x, 0.0002 + y, z, { half: 1, w: 7, h: 3, sy: 0.55, sz: 0.85, ry: a })); for (var k = -1; k <= 1; k++) out.push(box(SHELL2, 0.0004, 0.0004, 0.0052, x + k * 0.0012, 0.0016 + y, z, { ry: a + k * 0.35 })); }
      else out.push(box(SALT, 0.0026, 0.0026, 0.0026, x, 0.0014 + y, z, { rx: 0.4, ry: a, rz: 0.3 }), box(SALT, 0.0016, 0.0016, 0.0016, x + 0.0022, 0.0009 + y, z - 0.001, { ry: a + 0.7 }));
    } else if (kind === 'wood') {
      if (i % 2 === 0) out.push(sph(ACORN, 0.0022, x, 0.0022 + y, z, { w: 7, h: 5, sy: 1.25 }), sph(CAP, 0.0024, x, 0.0036 + y, z, { half: 1, w: 7, h: 3, sy: 0.6 }), cyl(CAP, 0.0003, 0.0003, 0.0014, x, 0.0052 + y, z, { w: 4 }));
      else out.push(sph(CONK, 0.0029, x, 0.0027 + y, z, { w: 9, h: 6, sy: 0.9 }), sph(0xd8b07a, 0.0013, x + 0.0012, 0.0045 + y, z + 0.0011, { w: 6, h: 4, sy: 0.4 }));
    } else {
      if (i % 2 === 0) { out.push(cyl([BRED, BBLU, BSIL][(i / 2) | 0], 0.0034, 0.0034, 0.0014, x, 0.0007 + y, z, { w: 14 })); out.push(cyl(BSIL, 0.0027, 0.0027, 0.0003, x, 0.0015 + y, z, { w: 10 })); }
      else out.push(tor(STR, 0.0024, 0.00045, x, 0.0006 + y, z), tor(STR, 0.0017, 0.00045, x + 0.0005, 0.0012 + y, z));
    }
    return out;
  }
  function heapGeo(kind, n) {
    var key = 'pl_heap_' + kind + n; if (CACHE[key]) return CACHE[key]; var r = rng(7 + kind.length * 31), p = [];
    for (var i = 0; i < n; i++) p = p.concat(item(kind, i, SPOTS[i][0], SPOTS[i][1], r));
    return (CACHE[key] = bcMerge(key, p));
  }
  function pile(kind) {
    if (['wool', 'shore', 'wood', 'street'].indexOf(kind) < 0) kind = 'wool';
    var g = new T.Group(), m = new T.Mesh(heapGeo(kind, 1), toon()); inked(m, 0.0004); g.add(m); g.add(shadow(0.012)); var shown = 1;
    g.userData = { bcPlaces: 'pile', kind: kind, heap: m, tick: function (time, n) {
      var k = Math.max(1, Math.min(6, n | 0)); if (k === shown) return; shown = k; m.geometry = heapGeo(kind, k);
      for (var c = 0; c < m.children.length; c++) if (m.children[c].userData.ink) { m.remove(m.children[c]); break; } inked(m, 0.0004);
    } };
    return g;
  }
  function shadow(r) {
    if (!CACHE.shM) {
      var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(40,25,10,.45)'); gr.addColorStop(1, 'rgba(40,25,10,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      CACHE.shM = new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }); CACHE.shG = new T.PlaneGeometry(1, 1).rotateX(-PI / 2);
    }
    var s = new T.Mesh(CACHE.shG, CACHE.shM); s.scale.set(r * 2, 1, r * 2); s.position.y = 0.0006; s.renderOrder = 2; return s;
  }

  var API = { version: 1, keys: ['loom', 'pile'] };
  API.init = function (api) {
    T = api.THREE; BCP = api.BCP; bcMerge = api.bcMerge; inked = api.inked;
    toon = api.toon || function () { return BCP.toon || (BCP.toon = new T.MeshToonMaterial({ vertexColors: true, gradientMap: BCP.grad, side: T.DoubleSide })); };
    CACHE = {}; ready = true;
  };
  API.loom = function () { if (!ready) throw new Error('places.js: init() first'); return loom(); };
  API.pile = function (kind) { if (!ready) throw new Error('places.js: init() first'); return pile(kind); };
  root.BC_PLACES_MK = API;
})(window);
