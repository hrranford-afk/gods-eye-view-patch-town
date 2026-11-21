/* Brick Lab: shared simulation layer. Works in the browser (global BL) and in Node (module.exports).
   World units: 1 unit = 0.2 m (a table of radius 3.25 is a 65 cm toy table). y is up, the table top is y = 0.
   Everything here is data and Rapier calls only; no three.js, no DOM. */
(function (root) {
  'use strict';
  var UNIT_MM = 200;                      /* 1 world unit = 200 mm */
  var GRAV = -9.81;                       /* the soft-contact solver holds stacks only up to about this; see BRICKLAB.md */
  var DT = 1 / 60;
  var TABLE_R = 3.25;

  /* the build kit: half extents are in world units */
  var KIT = {
    brick: { hx: 0.15, hy: 0.06, hz: 0.10, dens: 1.0, fr: 0.75, rest: 0.05, tex: 'wood', col: 0xc08347 },
    plank: { hx: 0.45, hy: 0.03, hz: 0.10, dens: 0.9, fr: 0.7, rest: 0.05, tex: 'wood', col: 0xa96a33 },
    post:  { hx: 0.07, hy: 0.35, hz: 0.07, dens: 0.9, fr: 0.7, rest: 0.05, tex: 'wood', col: 0x8a5428 },
    beam:  { hx: 0.60, hy: 0.06, hz: 0.10, dens: 0.9, fr: 0.7, rest: 0.05, tex: 'wood', col: 0x7c4a22 },
    tile:  { hx: 0.15, hy: 0.02, hz: 0.13, dens: 0.8, fr: 0.8, rest: 0.03, tex: 'red',  col: 0xd9603a },
    crate: { hx: 0.15, hy: 0.15, hz: 0.15, dens: 0.7, fr: 0.7, rest: 0.05, tex: 'blue', col: 0x6b8fd8 }
  };
  var BALLS = {
    marble: { r: 0.09, dens: 8, fr: 0.5, rest: 0.45, col: 0x7fb6e8, name: 'Marble' },
    big:    { r: 0.16, dens: 20, fr: 0.5, rest: 0.35, col: 0x3a6fb0, name: 'Big marble' },
    acorn:  { r: 0.07, dens: 3, fr: 0.6, rest: 0.25, col: 0x9b6a2f, name: 'Acorn' }
  };
  var KINDS = ['brick', 'plank', 'post', 'beam', 'tile', 'crate'];

  /* small seeded random generator (same sequence everywhere) */
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  /* ---------- pieces as plain data: {t:type, x,y,z, q:[x,y,z,w]} ---------- */
  function qy(a) { return [0, Math.sin(a / 2), 0, Math.cos(a / 2)]; }
  function qx(a) { return [Math.sin(a / 2), 0, 0, Math.cos(a / 2)]; }
  function qmul(a, b) {
    return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  }
  var GAP = 0.0002;                         /* tiny air gap between courses so nothing starts inside anything */
  function P(t, x, y, z, q) { return { t: t, x: x, y: y, z: z, q: q || [0, 0, 0, 1] }; }

  function presetWall(ox, oz) {            /* running bond, ends flush: 12 and 11 bricks alternating, 10 courses, plus a 5-brick cap = 120 bricks */
    var out = [], K = KIT.brick, L = K.hx * 2 + 0.004, H = 10, r, i, n, y;
    for (r = 0; r < H; r++) {
      n = r % 2 ? 11 : 12; y = K.hy + GAP + r * (K.hy * 2 + GAP);
      for (i = 0; i < n; i++) out.push(P('brick', ox + (i - (n - 1) / 2) * L, y, oz));
    }
    y = K.hy + GAP + H * (K.hy * 2 + GAP);
    for (i = 0; i < 5; i++) out.push(P('brick', ox + (i - 2) * L, y, oz));
    return out;
  }
  function ring(out, cx, cz, rad, courses, n, startY, skipOdd, noDoor) {   /* a round tower of bricks, brick long side is the tangent */
    var K = KIT.brick;
    for (var r = 0; r < courses; r++) for (var i = 0; i < n; i++) {
      if (skipOdd && r === courses - 1 && i % 2) continue;        /* battlements */
      var a = (i + (r % 2 ? 0.5 : 0)) / n * Math.PI * 2;
      out.push(P('brick', cx + Math.cos(a) * rad, startY + K.hy + GAP + r * (K.hy * 2 + GAP), cz + Math.sin(a) * rad, qy(-a + Math.PI / 2)));
    }
  }
  function presetTower(ox, oz) {           /* 9 courses of 17 = 153 */
    var out = []; ring(out, ox, oz, 0.9, 9, 17, 0, false); return out;
  }
  function presetCottage(ox, oz) {         /* about 250: brick shell with a door and a lintel beam, a deck of beams and a layer of roof tiles */
    var out = [], K = KIT.brick, L = 0.3, T = 0.2, rows = 9, hy = K.hy * 2 + GAP, doorRows = 5, X = 2.4, Z = 1.3, i, j, k;
    for (var r = 0; r < rows; r++) {
      var y = K.hy + GAP + r * hy, A = r % 2 === 0;
      var xn = A ? 8 : 6, zn = A ? 3 : 4;                      /* course A: x-walls full, z-walls between; course B: z-walls full */
      for (i = 0; i < xn; i++) {
        var x = (i - (xn - 1) / 2) * L;
        [-1, 1].forEach(function (sd) {
          var z = sd * (Z / 2 - T / 2);
          if (sd === 1 && r < doorRows && Math.abs(x) < 0.31) return;       /* the door in the front wall */
          if (sd === 1 && r === doorRows && Math.abs(x) < 0.61) return;     /* room for the lintel */
          out.push(P('brick', ox + x, y, oz + z));
        });
      }
      for (i = 0; i < zn; i++) {
        var z2 = (i - (zn - 1) / 2) * L;
        [-1, 1].forEach(function (sd) { out.push(P('brick', ox + sd * (X / 2 - T / 2), y, oz + z2, qy(Math.PI / 2))); });
      }
    }
    out.push(P('beam', ox, K.hy + GAP + doorRows * hy, oz + Z / 2 - T / 2));
    /* the roof: 12 beams lie across the walls, two courses of tiles lie on them */
    var top = rows * hy + 0.002;
    for (j = 0; j < 12; j++) out.push(P('beam', ox + (j - 5.5) * 0.204, top + 0.06, oz, qy(Math.PI / 2)));
    for (k = 0; k < 5; k++) for (j = 0; j < 9; j++) out.push(P('tile', ox + (j - 4) * 0.304, top + 0.12 + 0.022, oz + (k - 2) * 0.266));
    return out;
  }
  function presetCastle(ox, oz) {          /* a gate wall between two round towers: about 400 */
    var out = [], K = KIT.brick, hy = K.hy * 2 + GAP, cx = 1.8;
    ring(out, ox - cx, oz, 0.9, 11, 17, 0, true); ring(out, ox + cx, oz, 0.9, 11, 17, 0, true);
    var rows = 9, i, r;
    for (r = 0; r < rows; r++) {
      var y = K.hy + GAP + r * hy, even = r % 2 === 0, n = even ? 5 : 4;
      for (i = 0; i < n; i++) {
        var x = (i - (n - 1) / 2) * 0.304;
        if ((r < 5 && Math.abs(x) < (even ? 0.46 : 0.31)) || (r === 5 && Math.abs(x) < 0.61)) continue;
        out.push(P('brick', ox + x, y, oz));
      }
    }
    out.push(P('beam', ox, K.hy + GAP + 5 * hy, oz));
    for (r = 6; r < rows; r++) { }          /* wall above the lintel is already in the rows above */
    return out;
  }
  var PRESETS = {
    wall: { name: 'Brick wall', make: presetWall },
    tower: { name: 'Tower', make: presetTower },
    cottage: { name: 'Cottage', make: presetCottage },
    castle: { name: 'Castle gate', make: presetCastle }
  };

  /* a base saved as text: one piece per line, "type x y z qx qy qz qw" */
  function toText(list) {
    return list.map(function (p) {
      return p.t + ' ' + [p.x, p.y, p.z].map(function (v) { return v.toFixed(3); }).join(' ') + ' ' + p.q.map(function (v) { return v.toFixed(4); }).join(' ');
    }).join('\n');
  }
  function fromText(s) {
    return s.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var a = l.split(/\s+/); var n = a.slice(1).map(Number);
      return { t: a[0], x: n[0], y: n[1], z: n[2], q: [n[3], n[4], n[5], n[6]] };
    });
  }

  /* ---------- the world ---------- */
  function makeSim(R, opts) {
    opts = opts || {};
    var world = new R.World({ x: 0, y: GRAV, z: 0 });
    world.timestep = DT;
    world.gravity = { x: 0, y: GRAV, z: 0 };
    try { world.integrationParameters.lengthUnit = opts.lengthUnit || 0.2; } catch (e) { }
    /* 6 solver iterations and 2 internal PGS iterations: found by trial, stacks only stay put with this much solver (see BRICKLAB.md) */
    world.integrationParameters.numSolverIterations = opts.solverIters || 6;
    world.integrationParameters.numInternalPgsIterations = opts.pgs || 2;
    var eq = opts.events ? new R.EventQueue(true) : null;
    var sim = { opts: opts, R: R, world: world, pieces: [], balls: [], eq: eq, steps: 0, handleMap: {} };

    var tb = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0));
    var tc = R.ColliderDesc.cylinder(0.1, TABLE_R).setFriction(0.9).setRestitution(0.1);
    if (eq) tc.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
    world.createCollider(tc, tb);
    sim.table = tb;

    function mk(desc, cdesc, rec) {
      var b = world.createRigidBody(desc);
      if (eq) cdesc.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
      var c = world.createCollider(cdesc, b);
      rec.body = b; rec.collider = c; sim.handleMap[c.handle] = rec;
      return rec;
    }
    sim.addPiece = function (p, fixed) {
      var K = KIT[p.t];
      var d = (fixed ? R.RigidBodyDesc.fixed() : R.RigidBodyDesc.dynamic()).setTranslation(p.x, p.y, p.z).setRotation({ x: p.q[0], y: p.q[1], z: p.q[2], w: p.q[3] })
        .setLinearDamping(opts.ld === undefined ? 0.1 : opts.ld).setAngularDamping(opts.ad === undefined ? 0.5 : opts.ad);
      var cd = R.ColliderDesc.cuboid(K.hx, K.hy, K.hz).setDensity(K.dens).setFriction(K.fr).setRestitution(K.rest).setFrictionCombineRule(R.CoefficientCombineRule.Max);
      var rec = { kind: 'piece', t: p.t, id: sim.pieces.length, x0: p.x, y0: p.y, z0: p.z, q0: p.q.slice(), moved: false, fell: false };
      mk(d, cd, rec); sim.pieces.push(rec); return rec;
    };
    sim.addBall = function (kind, pos, vel) {
      var B = BALLS[kind];
      var d = R.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setLinvel(vel.x, vel.y, vel.z).setCcdEnabled(true).setLinearDamping(0.01).setAngularDamping(0.2);
      var cd = R.ColliderDesc.ball(B.r).setDensity(B.dens).setFriction(B.fr).setRestitution(B.rest);
      var rec = { kind: 'ball', t: kind, id: sim.balls.length, age: 0 };
      mk(d, cd, rec); sim.balls.push(rec); return rec;
    };
    sim.build = function (list, fixed) { for (var i = 0; i < list.length; i++) sim.addPiece(list[i], fixed); return sim.pieces.length; };
    sim.removeBall = function (rec) {
      delete sim.handleMap[rec.collider.handle]; world.removeRigidBody(rec.body);
      var i = sim.balls.indexOf(rec); if (i >= 0) sim.balls.splice(i, 1);
    };
    sim.makeDynamic = function () { sim.pieces.forEach(function (p) { p.body.setBodyType(R.RigidBodyType.Dynamic, true); }); };
    sim.removePiece = function (rec) { delete sim.handleMap[rec.collider.handle]; world.removeRigidBody(rec.body); var i = sim.pieces.indexOf(rec); if (i >= 0) sim.pieces.splice(i, 1); };
    sim.step = function () { if (eq) world.step(eq); else world.step(); sim.steps++; };
    sim.awake = function () { var n = 0, i; for (i = 0; i < sim.pieces.length; i++) if (!sim.pieces[i].body.isSleeping() && sim.pieces[i].body.bodyType() === 0) n++; for (i = 0; i < sim.balls.length; i++) if (!sim.balls[i].body.isSleeping()) n++; return n; };
    sim.bodyCount = function () { return sim.pieces.length + sim.balls.length; };
    /* how far each piece is from where it was built; max in world units */
    sim.maxDisp = function () {
      var m = 0;
      for (var i = 0; i < sim.pieces.length; i++) { var p = sim.pieces[i], t = p.body.translation(), dx = t.x - p.x0, dy = t.y - p.y0, dz = t.z - p.z0; var d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d > m) m = d; }
      return m;
    };
    /* pieces knocked out of place: moved more than 3 cm-equivalent (0.15 units), or dropped */
    sim.countMoved = function () {
      var n = 0;
      for (var i = 0; i < sim.pieces.length; i++) {
        var p = sim.pieces[i]; if (p.moved) { n++; continue; }
        var t = p.body.translation(), dx = t.x - p.x0, dy = t.y - p.y0, dz = t.z - p.z0;
        if (dx * dx + dy * dy + dz * dz > 0.0225) { p.moved = true; n++; }
      }
      return n;
    };
    /* a hash of every piece position and rotation, rounded to 1e-5, for the determinism check */
    sim.hash = function () {
      var h = 2166136261 >>> 0;
      function mix(v) { var n = Math.round(v * 100000) | 0; h ^= n & 0xffffffff; h = Math.imul(h, 16777619) >>> 0; }
      for (var i = 0; i < sim.pieces.length; i++) { var t = sim.pieces[i].body.translation(), q = sim.pieces[i].body.rotation(); mix(t.x); mix(t.y); mix(t.z); mix(q.x); mix(q.y); mix(q.z); mix(q.w); }
      for (i = 0; i < sim.balls.length; i++) { var tb2 = sim.balls[i].body.translation(); mix(tb2.x); mix(tb2.y); mix(tb2.z); }
      return ('00000000' + h.toString(16)).slice(-8);
    };
    /* remember where every piece is now as its "home" (used after the first settle) */
    sim.rebase = function () { for (var i = 0; i < sim.pieces.length; i++) { var p = sim.pieces[i], t = p.body.translation(); p.x0 = t.x; p.y0 = t.y; p.z0 = t.z; p.moved = false; } };
    sim.sleepAll = function () { for (var i = 0; i < sim.pieces.length; i++) sim.pieces[i].body.sleep(); };
    /* build, let the courses press down for n steps (the soft contacts sag a few mm), make that the home pose and put everything to sleep */
    sim.settle = function (n) { for (var i = 0; i < (n || 90); i++) sim.step(); sim.rebase(); sim.sleepAll(); };
    sim.fire = function (kind, from, dir, speed) { return sim.addBall(kind, from, { x: dir.x * speed, y: dir.y * speed, z: dir.z * speed }); };
    sim.dispose = function () { try { world.free(); } catch (e) { } };
    return sim;
  }

  /* the velocity that lands a ball on (tx,ty,tz) from a point at a given speed (flat ballistic solution, no drag) */
  function aimAt(tx, ty, tz, from, speed) {
    var dx = tx - from.x, dz = tz - from.z, h = Math.sqrt(dx * dx + dz * dz), t = h / speed;
    return { x: dx / t, y: (ty - from.y) / t - 0.5 * GRAV * t, z: dz / t };
  }
  /* the determinism run: wall, settle, three seeded shots, 300 more steps; returns the hash of every piece. Same code in Node and in the bench page. */
  function detRun(R, seed) {
    var s = makeSim(R), rnd = rng(seed);
    s.build(PRESETS.wall.make(0, 0)); s.settle(90);
    for (var shot = 0; shot < 3; shot++) {
      var from = { x: (rnd() - 0.5) * 1.5, y: 0.4 + rnd() * 0.4, z: 3 }, v = aimAt((rnd() - 0.5) * 2, 0.3 + rnd() * 0.8, 0, from, 12 + rnd() * 5);
      s.addBall(shot === 1 ? 'big' : 'marble', from, v);
      for (var i = 0; i < 120; i++) s.step();
    }
    for (i = 0; i < 300; i++) s.step();
    var h = s.hash(), sn = s.pieces.map(function (p) { var t = p.body.translation(); return t.x.toFixed(9) + ',' + t.y.toFixed(9) + ',' + t.z.toFixed(9); }).join(';');
    s.dispose(); return { hash: h, exact: sn };
  }

  var BL = { aimAt: aimAt, detRun: detRun, UNIT_MM: UNIT_MM, GRAV: GRAV, DT: DT, TABLE_R: TABLE_R, KIT: KIT, BALLS: BALLS, KINDS: KINDS, PRESETS: PRESETS, rng: rng, makeSim: makeSim, toText: toText, fromText: fromText, qy: qy, qx: qx, qmul: qmul };
  if (typeof module !== 'undefined' && module.exports) module.exports = BL; else root.BL = BL;
})(typeof window !== 'undefined' ? window : globalThis);
