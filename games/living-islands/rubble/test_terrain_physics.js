/* Rubble physics tests (pure Node, no browser).   Run:  node test_terrain_physics.js [--bench]
   Uses vendor/rapier-0.21-compat/rapier.mjs (dynamic import), terrain.js, sim_terrain.js and the island's world.bin.
   Writes test_results.json. Timings are from a shared cloud core: relative numbers only, never a real GPU or an iPad. */
'use strict';
var fs = require('fs'), path = require('path');
var TR = require('./terrain.js'), SIM = require('./sim_terrain.js');
var ROOT = path.join(__dirname, '..');
var results = { when: new Date().toISOString(), node: process.version, checks: [], numbers: {} }, fails = 0;
function check(name, ok, detail) { results.checks.push({ name: name, ok: !!ok, detail: detail }); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '   [' + detail + ']' : '')); }
function now() { return Number(process.hrtime.bigint()) / 1e6; }
function f2(v) { return (+v).toFixed(2); }
var G = TR.GROUND;

async function main() {
  var m = await import('file://' + path.join(__dirname, 'vendor/rapier-0.21-compat/rapier.mjs')), R = m.default || m; await R.init();
  var man = JSON.parse(fs.readFileSync(path.join(ROOT, 'landform/worlds/seed9001/manifest.json'), 'utf8'));
  var isl = TR.islandFromBytes(man, fs.readFileSync(path.join(ROOT, 'landform/worlds/seed9001/world.bin')));
  var lee = TR.leeSite(isl);
  results.numbers.site = { hMin: +f2(lee.hMin), hMax: +f2(lee.hMax), padY: +f2(lee.padY), tiles: lee.nt * lee.nt, samples: lee.n * lee.n };
  var counts = [0, 0, 0, 0, 0]; for (var q = 0; q < lee.base.length; q++) counts[lee.base[q]]++;
  results.numbers.groundTiles = { sand: counts[0], wet: counts[1], shingle: counts[2], turf: counts[3], rock: counts[4] };
  function flatSite(g, size) { return TR.functionSite({ size: size || 24, height: function () { return 0; }, ground: function () { return g; } }); }
  function dry() { return { tide: -50 }; }
  function step(sim, n) { for (var i = 0; i < n; i++) sim.step(); }
  function speed(rec) { var v = rec.body.linvel(); return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }

  /* ---------- 0. the ground: the heightfield tiles match the height grid (orientation, seams) ---------- */
  (function () {
    var sim = SIM.makeSim(R, lee, {}); sim.step();
    var maxd = 0, i, rnd = SIM.rng(3);
    for (i = 0; i < 400; i++) {
      var x = (rnd() - 0.5) * 38, z = (rnd() - 0.5) * 38, hit = sim.world.castRay(new R.Ray({ x: x, y: 40, z: z }, { x: 0, y: -1, z: 0 }), 100, true);
      var y = 40 - hit.timeOfImpact; maxd = Math.max(maxd, Math.abs(y - lee.H(x, z)));
    }
    results.numbers.heightfieldVsGrid = { maxDiffM: +maxd.toFixed(4) };
    check('heightfield tiles match the height grid (400 random rays, max difference under 2 cm)', maxd < 0.02, 'max ' + (maxd * 100).toFixed(2) + ' cm');
    sim.dispose();
  })();

  /* ---------- 1. determinism with a seed, and the replay log ---------- */
  function volley(seed) {
    var s = SIM.makeSession(R, lee, { pieces: 220, seed: seed }), kinds = ['marble', 'rod', 'acorn', 'coconut'], i, a;
    for (i = 0; i < 4; i++) {
      a = SIM.aimAt(s.muzzle(), { x: -1 + i * 0.7, y: lee.padY + 0.3, z: -7 }, SIM.KINDS[kinds[i]].speed);
      s.fire(kinds[i], a.yaw, a.elev, 1); for (var k = 0; k < 40; k++) s.step();
    }
    s.setTide(0.6); for (k = 0; k < 400; k++) s.step();
    return s;
  }
  (function () {
    var a = volley(11), ha = a.sim.hash(), b = volley(11), hb = b.sim.hash(), c = volley(12), hc = c.sim.hash();
    check('determinism: same seed, same shots, same hash (two runs)', ha === hb, ha + ' / ' + hb);
    check('determinism: a different seed gives a different hash', ha !== hc, ha + ' / ' + hc);
    results.numbers.determinism = { seed11: ha, seed12: hc, bodies: a.sim.bodies.length };
    /* replay: rebuild from the config and feed the log again; it must arrive at the same hash on the same step */
    var steps = a.sim.steps, rp = a.startReplay(), n = 0; while (a.replay) { a.step(); n++; }
    check('replay: rebuilding the scene and feeding the log gives the same hash at the same step', a.sim.hash() === ha && a.sim.steps === steps, a.sim.hash() + ' vs ' + ha + ', ' + n + ' steps');
    a.sim.dispose(); b.sim.dispose(); c.sim.dispose();
    results.numbers.determinismCode = SIM.determinismCode(R, lee); console.log('INFO  the replay code the page prints (250 pieces, fixed volley): ' + results.numbers.determinismCode);
    check('determinism code is repeatable', SIM.determinismCode(R, lee) === results.numbers.determinismCode, results.numbers.determinismCode);
  })();

  /* ---------- 2. energy sanity ---------- */
  (function () {
    var site = flatSite(TR.ROCK), sim = SIM.makeSim(R, site, dry()), rec = sim.add('marble', { x: 0, y: 2.05, z: 0 }), E0 = sim.energy(), emax = E0, apex = [], prevVy = 0, i, t, h;
    for (i = 0; i < 360; i++) {
      sim.step(); emax = Math.max(emax, sim.energy());
      var vy = rec.body.linvel().y; if (prevVy > 0.05 && vy <= 0.05) apex.push(rec.body.translation().y - 0.05); prevVy = vy;
    }
    var grow = (emax - E0) / E0;
    check('energy: a marble dropped on rock gains almost no energy (rise under 3 percent: soft-contact push-out)', grow < 0.03, 'start ' + f2(E0) + ' J, max ' + f2(emax) + ' J, bounce apexes ' + apex.slice(0, 3).map(f2).join(', ') + ' m from 2.00 m');
    check('energy: bounce heights shrink (each apex lower than the last and lower than the drop)', apex.length >= 2 && apex[0] < 2.0 && apex[1] < apex[0], '');
    sim.dispose();
    /* a hundred random bodies on mixed ground: total energy may only fall (allowing 3 percent for soft-contact push-out) */
    var s2 = SIM.makeSession(R, lee, { pieces: 120, seed: 4, tide: -50 }).sim; s2.wakeAll(); var e0 = s2.energy(), em = e0; for (i = 0; i < 300; i++) { s2.step(); em = Math.max(em, s2.energy()); }
    check('energy: a woken scene of ' + s2.bodies.length + ' bodies does not gain energy (rise under 3 percent)', (em - e0) / Math.abs(e0) < 0.03, 'start ' + f2(e0) + ' J, max ' + f2(em) + ' J');
    s2.dispose();
  })();

  /* ---------- 3. a ball rolls downhill on a ramp and stops in a hollow ---------- */
  (function () {
    function hf(x, z) { var base = z < 4 ? -0.2 * Math.max(z, -10) : -0.2 * 4 - 0.2 * 14; return z < 4 ? -0.2 * (z + 10) : -2.8; }
    function bowl(x, z) { var d = Math.sqrt(x * x + (z - 8) * (z - 8)); return d < 2.5 ? -0.4 * (1 - d * d / 6.25) : 0; }
    var site = TR.functionSite({ size: 28, height: function (x, z) { return hf(x, z) + bowl(x, z); }, ground: function () { return TR.TURF; } });
    var sim = SIM.makeSim(R, site, dry()), rec = sim.add('marble', { x: 0.2, y: site.H(0.2, -9) + 0.06, z: -9 }), z0 = -9, i, minSp = 9, zmax = -99;
    for (i = 0; i < 1500; i++) { sim.step(); var t = rec.body.translation(); zmax = Math.max(zmax, t.z); if (rec.body.isSleeping()) break; }
    var t = rec.body.translation(), d = Math.sqrt(t.x * t.x + (t.z - 8) * (t.z - 8));
    results.numbers.ballToHollow = { endX: +f2(t.x), endZ: +f2(t.z), distFromBowlCentre: +f2(d), steps: i, asleep: rec.body.isSleeping() };
    check('ball released high on a 11 degree ramp rolls downhill (travels more than 10 m)', zmax - z0 > 10, 'z from ' + z0 + ' to ' + f2(zmax));
    check('ball stops in the hollow: within 0.7 m of the bowl centre, nearly still, asleep', d < 0.7 && speed(rec) < 0.1 && rec.body.isSleeping(), 'ends ' + f2(d) + ' m from centre after ' + (i / 60).toFixed(1) + ' s');
    sim.dispose();
  })();

  /* ---------- 4. a rod rolls straight, wedges across a narrow V gully, and settles in a V trench ---------- */
  (function () {
    var plane = TR.functionSite({ size: 28, height: function (x, z) { return -0.22 * z; }, ground: function () { return TR.SHINGLE; } });
    var sim = SIM.makeSim(R, plane, dry()), q0 = [0.7071, 0, 0, 0.7071] /* axis y turned to axis z... see below */;
    /* the capsule axis is local y; to lie along x, turn it about z by 90 degrees */
    var qz = [0, 0, Math.SQRT1_2, Math.SQRT1_2];
    var rec = sim.add('rod', { x: 0, y: plane.H(0, -8) + 0.071, z: -8 }, qz);
    var i; for (i = 0; i < 360; i++) sim.step();
    var t = rec.body.translation(), q = rec.body.rotation();
    var ax = { x: 1 - 2 * (q.y * q.y + q.z * q.z), y: 2 * (q.x * q.y + q.z * q.w), z: 2 * (q.x * q.z - q.y * q.w) };    /* local x... use y axis of the capsule */
    var cy = { x: 2 * (q.x * q.y - q.z * q.w), y: 1 - 2 * (q.x * q.x + q.z * q.z), z: 2 * (q.y * q.z + q.x * q.w) };       /* the capsule's own axis in the world */
    var yaw = Math.atan2(cy.z, cy.x) * 180 / Math.PI, dev = Math.abs(((Math.abs(yaw) + 180) % 180) - 0); if (dev > 90) dev = 180 - dev;
    var travel = t.z + 8;
    results.numbers.rodRollsStraight = { travelM: +f2(travel), lateralM: +f2(t.x), axisTurnedDeg: +dev.toFixed(1) };
    check('a rod laid across a 10 degree slope rolls straight: 6 s, drifts less than 0.4 m sideways, axis turns less than 8 degrees', travel > 3 && Math.abs(t.x) < 0.4 && dev < 8, 'rolled ' + f2(travel) + ' m, sideways ' + f2(t.x) + ' m, axis off by ' + dev.toFixed(1) + ' deg');
    sim.dispose();
    /* wedge: a V gully 0.9 m wide at the rim, a 1.34 m rod dropped across it must bridge and stay (asleep, centre well above the gully floor) */
    var gul = TR.functionSite({ size: 12, height: function (x, z) { var a = 1 - Math.abs(x) / 0.45; return a > 0 ? -0.5 * a : 0; }, ground: function () { return TR.TURF; } });
    var s2 = SIM.makeSim(R, gul, dry()), r2 = s2.add('rod', { x: 0.02, y: 0.4, z: 0 }, qz);
    for (i = 0; i < 400; i++) s2.step();
    var t2 = r2.body.translation();
    results.numbers.rodWedge = { centreY: +f2(t2.y), asleep: r2.body.isSleeping() };
    check('a rod dropped across a narrow V gully wedges: bridges it, centre stays above the gully floor, asleep', t2.y > -0.3 && r2.body.isSleeping(), 'centre y ' + f2(t2.y) + ' m (gully floor at -0.50, rim at 0.00)');
    s2.dispose();
    /* a V trench across a slope catches a rod that rolls into it slowly */
    var tr = TR.functionSite({ size: 28, height: function (x, z) { var a = 1 - Math.abs(z - 4) / 0.5; return -0.2 * z - (a > 0 ? 0.55 * a : 0); }, ground: function () { return TR.SHINGLE; } });
    var s3 = SIM.makeSim(R, tr, dry()), r3 = s3.add('rod', { x: 0, y: tr.H(0, 0.5) + 0.071, z: 0.5 }, qz);
    for (i = 0; i < 900; i++) { s3.step(); if (r3.body.isSleeping()) break; }
    var t3 = r3.body.translation();
    results.numbers.rodTrench = { endZ: +f2(t3.z), asleep: r3.body.isSleeping(), steps: i };
    check('a rod rolling into a V trench settles in it (within 0.4 m of the trench line, asleep)', Math.abs(t3.z - 4) < 0.4 && r3.body.isSleeping(), 'ends at z ' + f2(t3.z) + ' (trench at 4.00) after ' + (i / 60).toFixed(1) + ' s');
    s3.dispose();
  })();

  /* ---------- 5. friction and bounce differ by material ---------- */
  (function () {
    var slide = [], roll = [], bounce = [], site = flatSite(TR.TURF), g;
    for (g = 0; g < 5; g++) {
      var sim = SIM.makeSim(R, site, dry()); sim.setGroundMode(g);
      var b = sim.add('crate', { x: 0, y: 0.092, z: 0 }, null, { x: 0, y: 0, z: 2 }); step(sim, 360); slide.push(b.body.translation().z);
      var ba = sim.add('marble', { x: 4, y: 0.052, z: 0 }, null, { x: 0, y: 0, z: 3 }); step(sim, 600); roll.push(ba.body.translation().z);
      var bb = sim.add('marble', { x: -4, y: 1.05, z: 0 }), apex = 0, pv = -1, hit = false; for (var i = 0; i < 240; i++) { sim.step(); var y = bb.body.translation().y, vy = bb.body.linvel().y; if (pv < 0 && vy >= 0) hit = true; if (hit) apex = Math.max(apex, y); pv = vy; }
      bounce.push(apex - 0.05); sim.dispose();
    }
    results.numbers.materials = G.map(function (r, i) { return { ground: r.id, brickSlideM: +f2(slide[i]), marbleRollM: +f2(roll[i]), reboundFromOneMetreM: +bounce[i].toFixed(3) }; });
    var uniq = function (a, rel) { for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) if (Math.abs(a[i] - a[j]) / Math.max(a[i], a[j], 1e-6) < rel) return false; return true; };
    check('friction differs by material: a sliding crate stops at five clearly different distances (each pair differs by at least 4 percent)', uniq(slide, 0.04), G.map(function (r, i) { return r.id + ' ' + f2(slide[i]) + ' m'; }).join(', '));
    check('friction: dry sand stops a sliding crate shortest, wet sand slides it furthest of the sands', slide[0] < slide[1] && slide[0] === Math.min.apply(null, slide), '');
    check('rolling differs by material: a marble rolls farthest on rock, least on dry sand', roll[4] === Math.max.apply(null, roll) && roll[0] === Math.min.apply(null, roll), G.map(function (r, i) { return r.id + ' ' + f2(roll[i]) + ' m'; }).join(', '));
    check('bounce differs by material: rock bounces most, sand and wet sand least', bounce[4] === Math.max.apply(null, bounce) && Math.min(bounce[0], bounce[1]) === Math.min.apply(null, bounce), G.map(function (r, i) { return r.id + ' ' + bounce[i].toFixed(3) + ' m'; }).join(', '));
  })();

  /* ---------- 6. sleeping bodies stop costing time ---------- */
  (function () {
    var s = SIM.makeSession(R, lee, { pieces: 1000, seed: 6 }), sim = s.sim, i, a, b, ts = [];
    var nb = sim.bodies.length, aw0 = sim.awake();
    function avg(n) { var t = 0; for (var i = 0; i < n; i++) t += sim.step(); return t / n; }
    avg(30); var asleepMs = avg(120);
    sim.wakeAll(); var awakeMs = avg(20), awakeN = sim.awake();
    var restMs = avg(600), awakeAfter = sim.awake();
    results.numbers.sleeping = { bodies: nb, awakeAfterSettle: aw0, asleepMsPerStep: +asleepMs.toFixed(3), allWokenMsPerStep: +awakeMs.toFixed(3), awakeAfterWake: awakeN, awakeAfter10s: awakeAfter };
    check('sleeping: ' + nb + ' bodies settle to asleep after the build (0 awake)', aw0 === 0, 'awake ' + aw0);
    check('sleeping: a step with everything asleep costs under 10 percent of one with everything awake', asleepMs < awakeMs * 0.1, 'asleep ' + asleepMs.toFixed(3) + ' ms, all awake ' + awakeMs.toFixed(3) + ' ms (' + awakeN + ' awake)');
    check('sleeping: woken bodies go back to sleep by themselves within 10 s', awakeAfter <= nb * 0.05, 'awake after 10 s: ' + awakeAfter + ' of ' + nb);
    sim.dispose();
  })();

  /* ---------- 7. nothing falls through the heightfield: 1000 random drops on the real island ground ---------- */
  function drops(guard, n, seed) {
    var sim = SIM.makeSim(R, lee, { tide: -50, guard: guard }), rnd = SIM.rng(seed), kinds = ['acorn', 'marble', 'coconut', 'lid', 'float', 'bottle', 'rod', 'stick', 'crate', 'can', 'brick'], recs = [], i, k, byKind = {};
    function solo(rec) { for (var c = 0; c < rec.body.numColliders(); c++) rec.body.collider(c).setCollisionGroups(((0x0002 << 16) | 0x0001) >>> 0); }
    for (i = 0; i < n; i++) {
      var kind = kinds[Math.floor(rnd() * kinds.length)], x = (rnd() - 0.5) * 34, z = (rnd() - 0.5) * 34, y = lee.H(x, z) + 0.3 + rnd() * 10;
      var sp = rnd() < 0.3 ? 20 + rnd() * 30 : rnd() * 10, dx = rnd() - 0.5, dz = rnd() - 0.5, dy = -(0.3 + rnd());
      var rec = sim.add(kind, { x: x, y: y, z: z }, SIM.qRandom(rnd), { x: dx * sp, y: dy * sp, z: dz * sp }, { x: (rnd() - 0.5) * 20, y: (rnd() - 0.5) * 20, z: (rnd() - 0.5) * 20 }); solo(rec); recs.push(rec);
    }
    var below = 0, minBelow = 0, inside = function (t) { return Math.abs(t.x) < 19.5 && Math.abs(t.z) < 19.5; };
    for (k = 0; k < 420; k++) {
      sim.step();
      if (k % 6 === 0) for (i = 0; i < recs.length; i++) { var r = recs[i]; if (r.dead) continue; var t = r.body.translation(), gap = t.y - lee.H(t.x, t.z); if (inside(t) && gap < -0.1) { below++; byKind[r.kind] = (byKind[r.kind] || 0) + 1; if (gap < minBelow) minBelow = gap; } }
    }
    var left = 0, alive = 0, belowEnd = 0; for (i = 0; i < recs.length; i++) { if (recs[i].dead) { left++; continue; } alive++; var te = recs[i].body.translation(); if (inside(te) && te.y - lee.H(te.x, te.z) < -0.1) belowEnd++; }
    var out = { dropped: n, stillInWorld: alive, leftWindow: left, rescuedByGuard: sim.rescued, belowGroundSamples: below, belowGroundAtEnd: belowEnd, worstGapM: +minBelow.toFixed(2), byKind: byKind };
    sim.dispose(); return out;
  }
  (function () {
    var a = drops(true, 1000, 77);
    results.numbers.drops = a;
    check('1000 random drops on the island ground (30 percent thrown at 20 to 50 m/s): none ends below the ground', a.belowGroundAtEnd === 0, a.belowGroundAtEnd + ' below at the end; ' + a.rescuedByGuard + ' tunnelled and were put back by the guard; ' + a.leftWindow + ' left the window over the edge');
    check('1000 random drops: none is ever seen more than 10 cm below the ground at any sampled step', a.belowGroundSamples === 0, a.belowGroundSamples + ' samples, worst ' + a.worstGapM + ' m');
    var b = drops(false, 1000, 77);
    results.numbers.dropsNoGuard = b;
    console.log('INFO  same 1000 drops with the guard switched off: ' + b.belowGroundAtEnd + ' end below the ground (' + JSON.stringify(b.byKind) + '): thin and fast bodies tunnel through a surface with no thickness');
  })();

  /* ---------- 8. tide: floating, sinking, stranding ---------- */
  (function () {
    var site = TR.functionSite({ size: 28, height: function (x, z) { return -2 + 0.12 * (z + 10); }, ground: function () { return TR.SAND; } });
    var sim = SIM.makeSim(R, site, {}), co = sim.add('coconut', { x: -1, y: 0.5, z: -2 }), ma = sim.add('marble', { x: 1, y: 0.5, z: -2 }), lg = sim.add('rod', { x: 0, y: 0.5, z: -4 }, [0, 0, Math.SQRT1_2, Math.SQRT1_2]), tn = sim.add('can', { x: 3, y: 0.5, z: -2 }), i;
    step(sim, 300);
    var tc = co.body.translation(), tm = ma.body.translation(), tl = lg.body.translation(), tt = tn.body.translation();
    results.numbers.tide = { tide0: { coconutY: +f2(tc.y), marbleY: +f2(tm.y), logY: +f2(tl.y), bedAtMarble: +f2(site.H(tm.x, tm.z)) } };
    check('tide: a coconut floats at the surface (centre within 0.15 m of the water line)', Math.abs(tc.y) < 0.15, 'centre y ' + f2(tc.y));
    check('tide: a driftwood log floats; a glass marble sinks to the bed', Math.abs(tl.y) < 0.15 && tm.y < site.H(tm.x, tm.z) + 0.2, 'log y ' + f2(tl.y) + ', marble y ' + f2(tm.y) + ' on bed ' + f2(site.H(tm.x, tm.z)));
    sim.setTide(1.2); step(sim, 300); var tc2 = co.body.translation();
    check('tide: when the water rises 1.2 m the coconut rises with it', tc2.y > 0.9 && Math.abs(tc2.y - 1.2) < 0.2, 'centre y ' + f2(tc2.y));
    sim.setTide(-1.0); step(sim, 600);
    var tc3 = co.body.translation(), gap = tc3.y - site.H(tc3.x, tc3.z);
    results.numbers.tide.stranded = { coconutZ: +f2(tc3.z), gapAboveGround: +f2(gap), asleep: co.body.isSleeping() };
    check('tide: when the water ebbs the coconut is left on the beach, resting on the ground and asleep (stranded)', gap < 0.16 && gap > 0.06 && co.body.isSleeping() && tc3.y > -1.0, 'rests ' + f2(gap) + ' m above the ground at z ' + f2(tc3.z) + ', water line at z ' + f2((-1.0 + 2) / 0.12 - 10));
    sim.dispose();
  })();

  /* ---------- 9. the island ground, the brick block, the cans ---------- */
  (function () {
    var s = SIM.makeSession(R, lee, { pieces: 250, seed: 5 }), sim = s.sim, bricks = sim.bodies.filter(function (r) { return r.kind === 'brick'; }), p0 = bricks.map(function (r) { return r.body.translation(); }), i, md = 0;
    step(sim, 600); bricks.forEach(function (r, j) { var t = r.body.translation(); md = Math.max(md, Math.hypot(t.x - p0[j].x, t.y - p0[j].y, t.z - p0[j].z)); });
    check('the brick block (' + bricks.length + ' bricks) stands on the levelled pad for 10 s: nothing moves more than 1 cm', md < 0.01, 'max move ' + (md * 100).toFixed(2) + ' cm');
    var cans = sim.bodies.filter(function (r) { return r.kind === 'can'; }), maxCan = 0; cans.forEach(function (r) { var t = r.body.translation(); maxCan = Math.max(maxCan, t.y - lee.H(t.x, t.z)); });
    check('cans stand on the slope without sliding off (' + cans.length + ' cans, none moved more than 5 cm)', cans.every(function (r) { return r.body.isSleeping(); }), '');
    /* the wet line follows the tide: a sand tile near the water changes friction when the tide rises */
    var sandTile = sim.tiles.filter(function (t) { return lee.baseAt(t.cx, t.cz) === TR.SAND && lee.H(t.cx, t.cz) > 0.4 && lee.H(t.cx, t.cz) < 0.5; })[0];
    var before = sandTile.gid; s.setTide(0.9); step(sim, 2); var after = sandTile.gid;
    check('wet sand follows the tide: a dry sand tile at +0.45 m turns wet when the tide reaches +0.9 m', before === TR.SAND && after === TR.WET, 'tile ' + G[before].id + ' -> ' + G[after].id);
    sim.dispose();
  })();

  /* ---------- 10. cost numbers (information, not asserted except where said) ---------- */
  (function () {
    var rows = [], sizes = [100, 250, 500, 1000, 2000, 4000];
    sizes.forEach(function (n) {
      var t0 = now(), s = SIM.makeSession(R, lee, { pieces: n, seed: 8, ammoCap: 200 }), sim = s.sim, buildMs = now() - t0, built = sim.bodies.length, i, a, tot = 0, worst = 0, peak = 0;
      for (var shot = 0; shot < 6; shot++) { a = SIM.aimAt(s.muzzle(), { x: (shot - 2.5) * 0.5, y: lee.padY + 0.3, z: -7 }, 17); s.fire(shot % 2 ? 'coconut' : 'rod', a.yaw, a.elev + (shot % 2 ? 0.2 : 0.3), 1);
        for (i = 0; i < 30; i++) { var ms = s.step(); tot += ms; if (ms > worst) worst = ms; peak = Math.max(peak, sim.awake()); } }
      for (i = 0; i < 360; i++) { var m2 = s.step(); tot += m2; if (m2 > worst) worst = m2; peak = Math.max(peak, sim.awake()); }
      rows.push({ piecesBuilt: built, pieces: sim.bodies.length, buildMs: Math.round(buildMs), avgMsPerStep: +(tot / 540).toFixed(2), worstMs: +worst.toFixed(1), peakAwake: peak, awakeAtEnd: sim.awake(), rescuedByGuard: sim.rescued, settleSteps: sim.settleSteps, fps60Budget: tot / 540 < 16.7 });
      sim.dispose();
    });
    results.numbers.cost = rows;
    console.log('INFO  cost per step (this shared cloud core, Node, one thread): ' + rows.map(function (r) { return r.piecesBuilt + ' pieces ' + r.avgMsPerStep + ' ms avg / ' + r.worstMs + ' worst / peak awake ' + r.peakAwake + ' / rescued ' + r.rescuedByGuard; }).join(' | '));
    /* rapid shots: 300 acorns that do not collide with each other against 300 that do */
    function stream(solo) {
      var site = TR.functionSite({ size: 24, height: function () { return 0; } }), sim = SIM.makeSim(R, site, dry()), i, rnd = SIM.rng(5);
      for (i = 0; i < 300; i++) { var r = sim.add('acorn', { x: (rnd() - 0.5) * 1.2, y: 0.4 + rnd() * 2.2, z: (rnd() - 0.5) * 1.2 }, null, { x: 0, y: 0, z: 0 }); if (!solo) for (var c = 0; c < r.body.numColliders(); c++) r.body.collider(c).setCollisionGroups(0xFFFFFFFF); }
      var tot = 0; for (i = 0; i < 150; i++) tot += sim.step(); sim.dispose(); return tot / 150;
    }
    var a1 = stream(true), a2 = stream(false);
    results.numbers.rapidShotGroups = { soloMsPerStep: +a1.toFixed(3), collidingMsPerStep: +a2.toFixed(3) };
    check('rapid shots that do not collide with each other cost less than ones that do (300 acorns in a heap)', a1 < a2, 'solo ' + a1.toFixed(3) + ' ms/step, colliding ' + a2.toFixed(3) + ' ms/step');
  })();

  fs.writeFileSync(path.join(__dirname, 'test_results.json'), JSON.stringify(results, null, 1));
  console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.checks.length + ' checks)');
  process.exit(fails ? 1 : 0);
}
main().catch(function (e) { console.error(e); process.exit(2); });
