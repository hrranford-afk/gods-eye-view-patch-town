/* Rubble: the physics layer. Works in the browser (global RSim) and in Node (module.exports).
   It sits on Rapier 0.21 (the same engine Brick Lab uses, same solver settings) and adds what the island needs:
     - the ground is a set of 2 m heightfield tiles built from RTerrain's height grid; each tile has its own friction and bounce (sand, wet sand, shingle, turf, rock)
     - rolling resistance per ground type (Rapier has none for balls): a ball stops by itself where the slope is gentler than the ground's number
     - water: a tide level, buoyancy and drag for anything below it, so wood floats, tin and glass sink, and ebbing water strands things on the beach
     - ammo kinds (small rapid shots to big rods), debris kinds, targets (bricks, cans), a scene builder, a hash, and a replay log
   No three.js, no DOM. Units: metres, kilograms, seconds, y up, fixed step 1/60 s. */
(function (root) {
  'use strict';
  var TR = (typeof module !== 'undefined' && module.exports) ? require('./terrain.js') : root.RTerrain;
  var DT = 1 / 60, GRAV = -9.81, RHOW = 1025;
  var PI = Math.PI;

  /* ---------- the things that exist ---------- */
  /* shape: ball r | box hx hy hz | cyl hh r (axis y) | capsule hh r (axis y) | bottle (a fat cylinder and a thin neck).
     dens kg/m3; fr and rest are the object's own (the physics averages friction with the ground's); roll = rolls (gets rolling resistance);
     rc = how far the centre is above the ground when touching (for the resistance test); rs = half depth for the water test;
     ccd = continuous collision (for small fast things); solo = shots do not collide with each other (cheap for rapid fire). */
  var KINDS = {
    brick:   { name: 'Brick',          shape: 'box', lay: 0.06, hx: 0.15, hy: 0.06, hz: 0.10, dens: 350, fr: 0.70, rest: 0.05, role: 'target', col: 0xc08347 },
    can:     { name: 'Tin can',        shape: 'cyl', lay: 0.07, hh: 0.07, r: 0.05, dens: 250, fr: 0.50, rest: 0.20, roll: 1, rc: 0.075, rs: 0.05, role: 'target', col: 0xc9ccd0 },
    acorn:   { name: 'Acorns (rapid)', shape: 'ball', lay: 0.035, r: 0.035, dens: 800, fr: 0.50, rest: 0.30, roll: 1, rc: 0.035, rs: 0.035, ccd: true, solo: true, role: 'ammo', speed: 30, rate: 10, spread: 0.03, col: 0x9b6a2f, note: 'small and light, 10 a second, they do not collide with each other' },
    marble:  { name: 'Marble',         shape: 'ball', lay: 0.05, r: 0.05, dens: 2500, fr: 0.30, rest: 0.45, roll: 1, rc: 0.05, rs: 0.05, ccd: true, role: 'ammo', speed: 24, rate: 3, spread: 0.01, col: 0x7fb6e8, note: 'glass, heavy for its size, bouncy' },
    coconut: { name: 'Coconut',        shape: 'ball', lay: 0.11, r: 0.11, dens: 650, fr: 0.60, rest: 0.25, roll: 1, rc: 0.11, rs: 0.11, ccd: true, role: 'ammo', speed: 17, rate: 1.2, spread: 0.01, col: 0x6b4a2a, note: 'about 3.5 kg, floats' },
    lid:     { name: 'Tin lid',        shape: 'cyl', lay: 0.02, hh: 0.02, r: 0.09, dens: 7800, fr: 0.30, rest: 0.30, roll: 1, rc: 0.09, rs: 0.02, ccd: true, role: 'ammo', speed: 22, rate: 2.5, spread: 0.02, spin: 30, flat: true, col: 0xb7bcc2, note: 'thrown flat and spinning; lands and rolls on its edge' },
    float:   { name: 'Glass float',    shape: 'ball', lay: 0.15, r: 0.15, dens: 350, fr: 0.35, rest: 0.45, roll: 1, rc: 0.15, rs: 0.15, ccd: true, role: 'ammo', speed: 15, rate: 0.8, spread: 0.01, col: 0x6fd1b0, note: 'big, light, very bouncy, floats' },
    bottle:  { name: 'Bottle',         shape: 'bottle', lay: 0.045, dens: 900, fr: 0.30, rest: 0.20, roll: 1, rc: 0.15, rs: 0.045, ccd: true, role: 'ammo', speed: 16, rate: 1.5, spread: 0.02, align: true, col: 0x5aa07a, note: 'rolls in an arc because of its neck' },
    rod:     { name: 'Big rod (driftwood log)', shape: 'capsule', lay: 0.07, hh: 0.55, r: 0.07, dens: 650, fr: 0.60, rest: 0.10, roll: 1, rc: 0.62, rs: 0.07, ccd: true, role: 'ammo', speed: 14, rate: 0.7, spread: 0.01, align: true, col: 0x8a6a45, note: 'about 12 kg, 1.3 m, rolls straight and can wedge' },
    stick:   { name: 'Stick',          shape: 'capsule', lay: 0.035, hh: 0.30, r: 0.035, dens: 600, fr: 0.60, rest: 0.10, roll: 1, rc: 0.335, rs: 0.035, role: 'debris', col: 0x9a7b55 },
    crate:   { name: 'Plastic crate',  shape: 'box', lay: 0.09, hx: 0.25, hy: 0.09, hz: 0.18, dens: 130, fr: 0.45, rest: 0.10, rs: 0.09, role: 'debris', col: 0xd05a3c }
  };
  var AMMO = ['acorn', 'marble', 'coconut', 'lid', 'float', 'bottle', 'rod'];
  var BOTTLE = { hh: 0.10, r: 0.045, nh: 0.05, nr: 0.02 };

  /* Rapier's own cylinder shape fell through heightfields in about a fifth of random drops (found in testing, see test_terrain_physics.js), a convex prism does not,
     so cylinders are 24-sided prisms. Thin things still tunnel through a surface with no thickness, hence the guard in post(). */
  function prism(hh, r, n, oy) {
    var pts = new Float32Array(n * 6), i, a;
    for (i = 0; i < n; i++) { a = i / n * 2 * PI; pts[i * 6] = Math.cos(a) * r; pts[i * 6 + 1] = -hh + (oy || 0); pts[i * 6 + 2] = Math.sin(a) * r; pts[i * 6 + 3] = pts[i * 6]; pts[i * 6 + 4] = hh + (oy || 0); pts[i * 6 + 5] = pts[i * 6 + 2]; }
    return R_.ColliderDesc.convexHull(pts);
  }
  var R_ = null;
  function volOf(K) {
    switch (K.shape) {
      case 'ball': return 4 / 3 * PI * K.r * K.r * K.r;
      case 'box': return 8 * K.hx * K.hy * K.hz;
      case 'cyl': return PI * K.r * K.r * 2 * K.hh;
      case 'capsule': return PI * K.r * K.r * 2 * K.hh + 4 / 3 * PI * K.r * K.r * K.r;
      case 'bottle': return PI * BOTTLE.r * BOTTLE.r * 2 * BOTTLE.hh + PI * BOTTLE.nr * BOTTLE.nr * 2 * BOTTLE.nh;
    }
    return 0.001;
  }

  /* small seeded random generator */
  function rng(seed) { var s = seed >>> 0 || 1; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  function qFromTo(v) {                                   /* quaternion that turns the y axis into the unit vector v */
    var x = -v[2], z = v[0], w = 1 + v[1], l;
    if (w < 1e-6) return [1, 0, 0, 0];
    l = Math.sqrt(x * x + z * z + w * w); return [x / l, 0, z / l, w / l];
  }
  function qYaw(a) { return [0, Math.sin(a / 2), 0, Math.cos(a / 2)]; }
  function qRandom(r) {
    var u1 = r(), u2 = r(), u3 = r(), a = Math.sqrt(1 - u1), b = Math.sqrt(u1);
    return [a * Math.sin(2 * PI * u2), a * Math.cos(2 * PI * u2), b * Math.sin(2 * PI * u3), b * Math.cos(2 * PI * u3)];
  }
  function nowMs() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Number(process.hrtime.bigint()) / 1e6; }

  /* ---------- the world ---------- */
  function makeSim(R, site, opts) {
    opts = opts || {};
    var world = new R.World({ x: 0, y: GRAV, z: 0 });
    world.timestep = DT;
    try { world.integrationParameters.lengthUnit = opts.lengthUnit || 0.2; } catch (e) { }
    /* the same settings Brick Lab found by trial for stacks that stand: 6 solver iterations, 2 internal PGS iterations, 0.14-style error margins */
    world.integrationParameters.numSolverIterations = opts.solverIters || 6;
    world.integrationParameters.numInternalPgsIterations = opts.pgs || 2;
    if (!opts.keepDefaults) { try { world.integrationParameters.normalizedAllowedLinearError = opts.err || 0.001; world.integrationParameters.normalizedPredictionDistance = opts.pred || 0.002; } catch (e) { } }
    if (opts.ip) for (var kk in opts.ip) { try { world.integrationParameters[kk] = opts.ip[kk]; } catch (e) { } }
    var sim = { R: R, world: world, site: site, opts: opts, bodies: [], ammoQ: [], nAmmo: 0, ammoCap: opts.ammoCap || 60, steps: 0, tide: opts.tide || 0, groundMode: -1,
      tiles: [], msWorld: 0, msPost: 0, nextId: 1, removed: 0, rescued: 0, tideDirty: true, tideSeen: -999, floor: site.hMin - 6 };
    var GR = TR.GROUND, nt = site.nt, tile = site.tile, per = site.per;

    /* the ground: one fixed body and one heightfield per 2 m tile */
    for (var tj = 0; tj < nt; tj++) for (var ti = 0; ti < nt; ti++) {
      var cx = site.x0 + (ti + 0.5) * tile, cz = site.x0 + (tj + 0.5) * tile;
      var fb = world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(cx, 0, cz));
      var cd = R.ColliderDesc.heightfield(per, per, site.tileHeights(ti, tj), { x: tile, y: 1, z: tile });
      var col = world.createCollider(cd, fb);
      sim.tiles.push({ col: col, cx: cx, cz: cz, gid: -1, ti: ti, tj: tj });
    }
    sim.updateGround = function () {
      var changed = 0;
      for (var q = 0; q < sim.tiles.length; q++) {
        var t = sim.tiles[q], g = site.groundAt(t.cx, t.cz, sim.tide, sim.groundMode);
        if (g !== t.gid) { t.gid = g; t.col.setFriction(GR[g].fr); t.col.setRestitution(GR[g].rest); changed++; }
      }
      return changed;
    };
    sim.updateGround();
    sim.groundAtPoint = function (x, z) { return site.groundAt(x, z, sim.tide, sim.groundMode); };

    /* add one dynamic body. p {x,y,z}, q [x,y,z,w], v {x,y,z}, w {x,y,z} */
    sim.add = function (kind, p, q, v, w) {
      var K = KINDS[kind], i;
      q = q || [0, 0, 0, 1];
      var d = R.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setRotation({ x: q[0], y: q[1], z: q[2], w: q[3] })
        .setLinearDamping(opts.ld === undefined ? 0.02 : opts.ld).setAngularDamping(opts.ad === undefined ? 0.15 : opts.ad);
      if (v) d.setLinvel(v.x, v.y, v.z);
      if (w) d.setAngvel({ x: w.x, y: w.y, z: w.z });
      if (K.ccd) d.setCcdEnabled(true);
      var b = world.createRigidBody(d), cds = [];
      switch (K.shape) {
        case 'ball': cds.push(R.ColliderDesc.ball(K.r)); break;
        case 'box': cds.push(R.ColliderDesc.cuboid(K.hx, K.hy, K.hz)); break;
        case 'cyl': R_ = R; cds.push(prism(K.hh, K.r, 24)); break;
        case 'capsule': cds.push(R.ColliderDesc.capsule(K.hh, K.r)); break;
        case 'bottle': R_ = R; cds.push(prism(BOTTLE.hh, BOTTLE.r, 24)); cds.push(prism(BOTTLE.nh, BOTTLE.nr, 12, BOTTLE.hh + BOTTLE.nh)); break;
      }
      for (i = 0; i < cds.length; i++) {
        cds[i].setDensity(K.dens).setFriction(K.fr).setRestitution(K.rest);
        if (K.solo) cds[i].setCollisionGroups(((0x0002 << 16) | 0x0001) >>> 0);
        world.createCollider(cds[i], b);
      }
      var rec = { id: sim.nextId++, kind: kind, K: K, body: b, vol: volOf(K), m: b.mass(), dead: false, age: 0, wet: 0, still: 0, rf: K.shape === 'ball' ? 1 / 1.4 : 1 / 1.5 };
      b.__rec = rec;
      sim.bodies.push(rec);
      if (K.role === 'ammo') { sim.ammoQ.push(rec); sim.nAmmo++; }
      return rec;
    };
    sim.remove = function (rec) {
      if (rec.dead) return; rec.dead = true;
      world.removeRigidBody(rec.body);
      var i = sim.bodies.indexOf(rec); if (i >= 0) { sim.bodies[i] = sim.bodies[sim.bodies.length - 1]; sim.bodies.pop(); }
      if (rec.K.role === 'ammo') sim.nAmmo--;
      sim.removed++;
    };
    sim.trimAmmo = function (cap) {
      while (sim.nAmmo > cap && sim.ammoQ.length) { var r = sim.ammoQ.shift(); if (!r.dead) sim.remove(r); }
      if (sim.ammoQ.length > cap * 2 + 20) sim.ammoQ = sim.ammoQ.filter(function (r) { return !r.dead; });
    };
    sim.setTide = function (v) { sim.tide = v; sim.tideDirty = true; };
    sim.setGroundMode = function (m) { sim.groundMode = m; sim.updateGround(); sim.wakeAll(); };
    sim.wakeAll = function () { for (var i = 0; i < sim.bodies.length; i++) sim.bodies[i].body.wakeUp(); };
    sim.sleepAll = function () { for (var i = 0; i < sim.bodies.length; i++) sim.bodies[i].body.sleep(); };

    /* the part after Rapier's step: rolling resistance, water, and removing what left the window */
    var gmu = -GRAV, doomed = [], act = [], guard = opts.guard !== false;
    function collect(b) { if (b.__rec) act.push(b.__rec); }
    function post() {
      var n, i, rec, b, t, tide = sim.tide, K, gh, g, k, v, a, sp, s, f, vol, bodies;
      doomed.length = 0; act.length = 0;
      /* only the awake bodies are visited: a sleeping body costs nothing here */
      world.forEachActiveRigidBody(collect); n = act.length;
      for (i = 0; i < n; i++) {
        rec = act[i]; b = rec.body; K = rec.K;
        t = b.translation(); rec.age++;
        if (t.y < sim.floor || t.x < site.x0 - 3 || t.x > -site.x0 + 3 || t.z < site.x0 - 3 || t.z > -site.x0 + 3) { doomed.push(rec); continue; }
        /* guard: a centre below the ground surface means the body tunnelled (thin things can, the heightfield has no thickness). Put it back on top and count it. */
        gh = site.H(t.x, t.z);
        if (guard && t.y < gh - 0.06 && t.x > site.x0 && t.x < -site.x0 && t.z > site.x0 && t.z < -site.x0) {
          b.setTranslation({ x: t.x, y: gh + (K.rc || 0.1), z: t.z }, true); v = b.linvel(); b.setLinvel({ x: v.x, y: 0, z: v.z }, true); sim.rescued++; t.y = gh + (K.rc || 0.1);
        }
        /* water */
        if (K.rs && t.y - K.rs < tide) {
          f = (tide - (t.y - K.rs)) / (2 * K.rs); if (f > 1) f = 1;
          vol = rec.vol * f;
          b.applyImpulse({ x: 0, y: RHOW * vol * -GRAV * DT, z: 0 }, false);
          v = b.linvel(); a = b.angvel(); s = Math.exp(-3.0 * f * DT);
          b.setLinvel({ x: v.x * s, y: v.y * s, z: v.z * s }, false); b.setAngvel({ x: a.x * s, y: a.y * s, z: a.z * s }, false);
          rec.wet = f;
        } else rec.wet = 0;
        /* rolling resistance on the ground: a constant slowing (a Coulomb-like rolling friction), the same fraction on speed and spin so the roll stays a roll */
        if (K.roll) {
          if (t.y - gh < K.rc * 1.25 + 0.03) {
            g = sim.groundAtPoint(t.x, t.z); k = TR.GROUND[g].roll * rec.rf * (K.roll === true ? 1 : K.roll);
            v = b.linvel(); sp = Math.sqrt(v.x * v.x + v.z * v.z);
            if (sp > 1e-4) {
              s = 1 - k * gmu * DT / sp; if (s < 0) s = 0;
              a = b.angvel();
              b.setLinvel({ x: v.x * s, y: v.y, z: v.z * s }, false); b.setAngvel({ x: a.x * s, y: a.y * s, z: a.z * s }, false);
            } else s = 0;
            /* held still by the resistance for half a second: put it to sleep (Rapier's own test never passes for thin rods, their spin is high at tiny speeds) */
            if (s === 0 && k > 0) { if (++rec.still >= 30) { rec.still = 0; b.sleep(); } } else rec.still = 0;
          } else rec.still = 0;
        }
      }
      for (i = 0; i < doomed.length; i++) sim.remove(doomed[i]);
      /* a sleeping body in rising water must wake up and float: look every 8 steps while the tide is moving */
      if (sim.tideDirty) {
        if (sim.steps % 8 === 0) { bodies = sim.bodies; for (i = 0; i < bodies.length; i++) { rec = bodies[i]; if (rec.K.rs && rec.K.dens < RHOW && rec.body.isSleeping()) { t = rec.body.translation(); if (t.y - rec.K.rs < tide) rec.body.wakeUp(); } } }
        if (Math.abs(sim.tide - sim.tideSeen) > 0.04) { sim.updateGround(); sim.tideSeen = sim.tide; }
        if (sim.steps % 8 === 7) sim.tideDirty = false;
      }
    }
    sim.step = function () {
      var t0 = nowMs(); world.step(); var t1 = nowMs(); post(); var t2 = nowMs();
      sim.steps++; sim.msWorld = t1 - t0; sim.msPost = t2 - t1; return t2 - t0;
    };
    sim.awake = function () { var c = 0; world.forEachActiveRigidBody(function (b) { if (b.__rec && !b.isSleeping()) c++; }); return c; };
    sim.hash = function () {
      var h = 2166136261 >>> 0;
      function mix(v) { var n = Math.round(v * 100000) | 0; h ^= n & 0xffffffff; h = Math.imul(h, 16777619) >>> 0; }
      for (var i = 0; i < sim.bodies.length; i++) { var t = sim.bodies[i].body.translation(), q = sim.bodies[i].body.rotation(); mix(t.x); mix(t.y); mix(t.z); mix(q.x); mix(q.y); mix(q.z); mix(q.w); }
      mix(sim.bodies.length);
      return ('00000000' + h.toString(16)).slice(-8);
    };
    /* kinetic plus potential energy of everything dynamic (J), for the sanity test */
    sim.energy = function () {
      var e = 0; for (var i = 0; i < sim.bodies.length; i++) { var r = sim.bodies[i], b = r.body, v = b.linvel(), t = b.translation(); e += 0.5 * r.m * (v.x * v.x + v.y * v.y + v.z * v.z) + r.m * -GRAV * t.y; }
      return e;
    };
    sim.dispose = function () { try { world.free(); } catch (e) { } };
    return sim;
  }

  /* ---------- the scene ---------- */
  /* cfg: { pieces, seed, ammoCap }. A brick block on the levelled pad, a row of cans on the slope, wash-up debris along the wrack line.
     Everything is placed from the seed only, so the same cfg gives the same scene. Then it settles for 1.5 s and goes to sleep. */
  function buildScene(sim, cfg) {
    var site = sim.site, L = site.layout, r = rng(cfg.seed || 1), n = Math.max(20, cfg.pieces | 0), i, j;
    var nb = Math.max(12, Math.round(n * 0.45)), nc = TR.clamp(Math.round(n * 0.07), 6, 150), nd = Math.max(0, n - nb - nc);
    var K = KINDS.brick, bl = K.hx * 2 + 0.004, bd = K.hz * 2 + 0.004, bh = K.hy * 2 + 0.0004;
    var courses = nb <= 144 ? 6 : 8, layers = Math.ceil(nb / (courses * 12)), w = Math.min(12, Math.ceil(nb / (courses * layers))), placed = 0, c, l, cnt, yb = (site.padY !== undefined ? site.padY : site.H(L.wall.x, L.wall.z)) + K.hy + 0.002;
    sim.scene = { bricks: 0, cans: 0, debris: 0, wall: { x: L.wall.x, z: L.wall.z, w: w, layers: layers, courses: courses } };
    for (c = 0; c < courses && placed < nb; c++) {
      cnt = c % 2 ? Math.max(1, w - 1) : w;
      for (l = 0; l < layers && placed < nb; l++) for (i = 0; i < cnt && placed < nb; i++) {
        sim.add('brick', { x: L.wall.x + (i - (cnt - 1) / 2) * bl, y: yb + c * bh, z: L.wall.z + (l - (layers - 1) / 2) * bd }); placed++;
      }
    }
    sim.scene.bricks = placed;
    /* cans in rows of 10 up the slope, a little staggered */
    var C = KINDS.can, placedC = 0, row = 0;
    while (placedC < nc) {
      for (i = 0; i < 10 && placedC < nc; i++) {
        var cx = L.cans.x + (i - 4.5) * 0.13 + (row % 2 ? 0.065 : 0), cz = L.cans.z - row * 0.14;
        sim.add('can', { x: cx, y: site.H(cx, cz) + C.hh + 0.004, z: cz }); placedC++;
      }
      row++;
    }
    sim.scene.cans = placedC;
    /* wash-up along the wrack line: bottles, tins, lids, floats, sticks, crates, a few coconuts */
    var mix = [['bottle', 0.26], ['can', 0.14], ['lid', 0.20], ['float', 0.08], ['stick', 0.14], ['crate', 0.10], ['coconut', 0.08]];
    /* a jittered grid along the wrack line (0.7 m apart, extra layers dropped from 0.45 m higher when there are many), lying flat or standing, so nothing starts inside anything */
    var gx = 0.8, gcols = Math.floor(34 / gx), grows = Math.floor(9 / gx), per = gcols * grows;
    for (i = 0; i < nd; i++) {
      var u = r(), kk = 'bottle', acc = 0; for (j = 0; j < mix.length; j++) { acc += mix[j][1]; if (u <= acc) { kk = mix[j][0]; break; } }
      var cell = i % per, layer = Math.floor(i / per), dx = -17 + (cell % gcols + 0.5 + (layer % 2) * 0.5) * gx + (r() - 0.5) * 0.1, dz = L.wrack.z - 2.5 + (Math.floor(cell / gcols) + 0.5 + (layer % 2) * 0.5) * gx + (r() - 0.5) * 0.1;
      var KD = KINDS[kk], ha = r() * 2 * PI, qq = KD.shape === 'capsule' || KD.shape === 'bottle' ? qFromTo([Math.cos(ha), 0, Math.sin(ha)]) : KD.shape === 'ball' ? [0, 0, 0, 1] : qYaw(ha);
      sim.add(kk, { x: dx, y: site.H(dx, dz) + KD.lay + 0.03 + layer * 0.4, z: dz }, qq);
    }
    sim.scene.debris = nd;
    /* settle: at least 1.7 s, then until under 2 percent are still moving (at most 10 s), then everything goes to sleep */
    for (i = 0; i < 600 && (i < 100 || sim.awake() > Math.max(3, n * 0.02)); i++) sim.step();
    sim.settleSteps = i;
    sim.sleepAll();
    sim.steps = 0;
    return sim.scene;
  }

  /* ---------- a session: scene + shots + replay log ---------- */
  function makeSession(R, site, cfg) {
    cfg = { pieces: cfg.pieces || 200, seed: cfg.seed || 1, ammoCap: cfg.ammoCap || 60, tide: cfg.tide || 0, ground: cfg.ground === undefined ? -1 : cfg.ground };
    var ses = { R: R, site: site, cfg: cfg, events: [], sim: null, rnd: null, replay: null };
    function fresh() {
      if (ses.sim) ses.sim.dispose();
      ses.sim = makeSim(R, site, { ammoCap: cfg.ammoCap, tide: cfg.tide });
      ses.sim.groundMode = cfg.ground; ses.sim.updateGround();
      ses.rnd = rng(cfg.seed * 7919 + 13);
      buildScene(ses.sim, cfg);
      ses.events = [];
    }
    fresh();
    ses.rebuild = function (c2) { for (var k in c2) cfg[k] = c2[k]; ses.replay = null; fresh(); };
    ses.muzzle = function () { var L = site.layout.launcher; return { x: L.x, y: site.H(L.x, L.z) + 1.0, z: L.z }; };
    /* aim: yaw (0 = straight inland), elevation, power 0..1. Returns the body. The random part is drawn here and stored in the log, so a replay needs no random numbers. */
    ses.fire = function (kind, yaw, elev, power) {
      if (ses.replay) return null;
      var K = KINDS[kind], rr = ses.rnd, sp = K.speed * (0.45 + 0.55 * TR.clamp(power === undefined ? 1 : power, 0, 1));
      var a = yaw + (rr() - 0.5) * 2 * K.spread, e = elev + (rr() - 0.5) * 2 * K.spread, ce = Math.cos(e);
      var dir = [Math.sin(a) * ce, Math.sin(e), -Math.cos(a) * ce], m = ses.muzzle();
      var q = K.align ? qFromTo(dir) : K.flat ? qYaw(rr() * 6) : qRandom(rr);
      var wv = K.spin ? { x: 0, y: K.spin, z: 0 } : { x: (rr() - 0.5) * 6, y: (rr() - 0.5) * 6, z: (rr() - 0.5) * 6 };
      var ev = { s: ses.sim.steps, t: 'shot', k: kind, p: [m.x, m.y, m.z], v: [dir[0] * sp, dir[1] * sp, dir[2] * sp], q: q, w: [wv.x, wv.y, wv.z] };
      ses.events.push(ev); return applyEvent(ev);
    };
    function applyEvent(ev) {
      var sim = ses.sim;
      if (ev.t === 'shot') { sim.trimAmmo(Math.max(0, sim.ammoCap - 1)); return sim.add(ev.k, { x: ev.p[0], y: ev.p[1], z: ev.p[2] }, ev.q, { x: ev.v[0], y: ev.v[1], z: ev.v[2] }, { x: ev.w[0], y: ev.w[1], z: ev.w[2] }); }
      if (ev.t === 'tide') { sim.setTide(ev.v); return null; }
      if (ev.t === 'ground') { sim.setGroundMode(ev.v); return null; }
      if (ev.t === 'cap') { sim.ammoCap = ev.v; return null; }
      return null;
    }
    ses.setTide = function (v) { if (ses.replay) return; var ev = { s: ses.sim.steps, t: 'tide', v: v }; ses.events.push(ev); applyEvent(ev); };
    ses.setGround = function (m) { if (ses.replay) return; var ev = { s: ses.sim.steps, t: 'ground', v: m }; ses.events.push(ev); applyEvent(ev); };
    ses.setAmmoCap = function (v) { if (ses.replay) return; var ev = { s: ses.sim.steps, t: 'cap', v: v }; ses.events.push(ev); applyEvent(ev); };
    /* one step; during a replay the logged events are applied at their step */
    ses.step = function () {
      var rp = ses.replay;
      if (rp) { while (rp.i < rp.events.length && rp.events[rp.i].s <= ses.sim.steps) applyEvent(rp.events[rp.i++]); }
      var ms = ses.sim.step();
      if (rp && ses.sim.steps >= rp.endStep) { ses.replay = null; ses.events = rp.events; }
      return ms;
    };
    /* start a replay: rebuild the same scene from the config and feed it the log again. The caller steps it at whatever speed it likes. */
    ses.startReplay = function () {
      var ev = ses.events.slice(), endStep = ses.sim.steps, hashNow = ses.sim.hash();
      if (ses.sim) ses.sim.dispose(); ses.sim = makeSim(R, site, { ammoCap: cfg.ammoCap, tide: cfg.tide }); ses.sim.groundMode = cfg.ground; ses.sim.updateGround();
      buildScene(ses.sim, cfg);
      ses.replay = { events: ev, i: 0, endStep: endStep, hashAtEnd: hashNow };
      ses.events = [];
      return ses.replay;
    };
    ses.finishReplay = function () { while (ses.replay) ses.step(); };
    return ses;
  }

  /* the elevation that lands a shot (no drag) on a point; low arc. Returns null if out of reach. */
  function aimAt(from, to, speed) {
    var dx = to.x - from.x, dz = to.z - from.z, d = Math.sqrt(dx * dx + dz * dz), dy = to.y - from.y, g = -GRAV, v2 = speed * speed;
    var disc = v2 * v2 - g * (g * d * d + 2 * dy * v2); if (disc < 0 || d < 0.01) return null;
    return { yaw: Math.atan2(dx, -dz), elev: Math.atan2(v2 - Math.sqrt(disc), g * d), dist: d };
  }

  var API = { KINDS: KINDS, AMMO: AMMO, DT: DT, GRAV: GRAV, RHOW: RHOW, makeSim: makeSim, buildScene: buildScene, makeSession: makeSession, aimAt: aimAt, rng: rng, qFromTo: qFromTo, qRandom: qRandom, qYaw: qYaw, volOf: volOf, nowMs: nowMs };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.RSim = API;
})(typeof window !== 'undefined' ? window : globalThis);
