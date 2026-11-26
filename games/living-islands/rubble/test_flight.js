/* Rubble, projectile flight: Node tests (no browser).   Run:  node test_flight.js
   B1: the Bolt (id 'rod') is thrown point first with a slow spin about its own axis, and a weathervane plus a little drag keep its nose along its flight until it touches something.
   Checks: over 200 scripted launches (several angles, powers and distances) the bolt's long axis stays within 10 degrees of its velocity from launch to first contact; it hits the Grand fort's gate
   within a stated tolerance; the flight is deterministic. Timings are a shared cloud CPU with software only: NOT iPad numbers. Writes test_flight_results.json. */
'use strict';
var fs = require('fs'), path = require('path');
var TR = require('./terrain.js'), SIM = require('./sim_terrain.js');
var ROOT = path.join(__dirname, '..');
var results = { when: new Date().toISOString(), node: process.version, checks: [], numbers: {} }, fails = 0;
function check(name, ok, detail) { results.checks.push({ name: name, ok: !!ok, detail: detail }); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '   [' + detail + ']' : '')); }

/* fly one shot to its first contact (or 4 s): returns the worst angle (degrees) between the long axis and the velocity, where it first touched, and the step count */
function flyOne(ses, kind, yaw, elev, power) {
  var rec = ses.fire(kind, yaw, elev, power), sim = ses.sim, w = sim.world, col = rec.body.collider(0), k, worst = 0, touch = false, v, q, ax, ay, az, sp, ang, t, last = null;
  for (k = 0; k < 240 && !touch; k++) {
    v = rec.body.linvel(); q = rec.body.rotation(); sp = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    ax = 2 * (q.x * q.y - q.w * q.z); ay = 1 - 2 * (q.x * q.x + q.z * q.z); az = 2 * (q.y * q.z + q.w * q.x);
    ang = Math.acos(Math.max(-1, Math.min(1, (ax * v.x + ay * v.y + az * v.z) / sp))) * 180 / Math.PI; if (ang > worst) worst = ang;
    t = rec.body.translation(); last = { x: t.x, y: t.y, z: t.z };
    ses.step();
    w.contactPairsWith(col, function (other) { w.contactPair(col, other, function (man) { if (man.numContacts() > 0) touch = true; }); });
  }
  return { worst: worst, hit: last, steps: k, touched: touch, rec: rec };
}

async function main() {
  var m = await import('file://' + path.join(__dirname, 'vendor/rapier-0.21-compat/rapier.mjs')), R = m.default || m; await R.init();
  var man = JSON.parse(fs.readFileSync(path.join(ROOT, 'landform/worlds/seed9001/manifest.json'), 'utf8'));
  var lee = TR.leeSite(TR.islandFromBytes(man, fs.readFileSync(path.join(ROOT, 'landform/worlds/seed9001/world.bin'))), { grand: true });
  var K = SIM.KINDS.rod;
  check('the big rod is now a Bolt: label ' + K.name + ', thrown along its velocity with a spin about its own axis (' + K.axspin + ' rad/s), drag and a weathervane', /Bolt/.test(K.name) && K.align && K.axspin > 0 && K.fly && K.fly.stab > 0 && SIM.AMMO.indexOf('rod') >= 0, JSON.stringify(K.fly));

  /* ---------- B1: 200 scripted launches ---------- */
  (function () {
    var ses = SIM.makeSession(R, lee, { pieces: 40, seed: 1, fort: 'tower', ammoCap: 400 }), worstAll = 0, n = 0, i, bad = [], powers = [0.5, 0.7, 0.85, 1], touched = 0, spin0 = [], mu = ses.muzzle(), rowsum = 0;
    for (i = 0; i < 400 && n < 200; i++) {
      var dist = 6 + (i % 10), yawT = ((i * 37) % 21 - 10) * 0.025, pw = powers[i % 4], tx = mu.x + Math.sin(yawT) * dist, tz = mu.z - Math.cos(yawT) * dist, ty = lee.H(tx, tz) + 0.3 + (i % 5) * 0.2;
      var a = SIM.aimAt(mu, { x: tx, y: ty, z: tz }, K.speed * (0.45 + 0.55 * pw), K.fly); if (!a) continue;
      var r = flyOne(ses, 'rod', a.yaw + (i % 3 - 1) * 0.02, a.elev, pw); n++; if (r.touched) touched++; rowsum += r.steps;
      if (r.worst > worstAll) worstAll = r.worst; if (r.worst > 10) bad.push(i + ':' + r.worst.toFixed(1));
      ses.sim.remove(r.rec);
    }
    results.numbers.bolt200 = { launches: n, worstAngleDeg: +worstAll.toFixed(2), touched: touched, meanFlightSteps: +(rowsum / n).toFixed(0) };
    check('B1: over ' + n + ' scripted launches (distances 6 to 15 m, 4 powers, several angles) the bolt\'s axis stays within 10 degrees of its velocity until first contact (worst ' + worstAll.toFixed(2) + ' deg, ' + touched + ' touched something)', n === 200 && worstAll <= 10, bad.slice(0, 5).join(' '));
    ses.sim.dispose();
  })();

  /* ---------- the old rod for comparison: what the random tumble did (the same launches with the weathervane off) ---------- */
  (function () {
    var sav = K.fly, sav2 = K.axspin; K.fly = null; K.axspin = 0; var ses = SIM.makeSession(R, lee, { pieces: 40, seed: 1, fort: 'tower', ammoCap: 400 }), worst = 0, i, mu = ses.muzzle();
    for (i = 0; i < 20; i++) { var a = SIM.aimAt(mu, { x: mu.x, y: lee.H(mu.x, mu.z - 10) + 0.5, z: mu.z - 10 }, K.speed); var r = flyOne(ses, 'rod', a.yaw, a.elev, 1); worst = Math.max(worst, r.worst); ses.sim.remove(r.rec); }
    K.fly = sav; K.axspin = sav2; results.numbers.oldRodWorstDeg = +worst.toFixed(1); check('for comparison: without the weathervane the same launches tumble (worst angle ' + worst.toFixed(0) + ' deg), so the test can tell the two apart', worst > 20, ''); ses.sim.dispose();
  })();

  /* ---------- the Grand fort gate ---------- */
  (function () {
    var ses = SIM.makeSession(R, lee, { pieces: 3000, seed: 1, fort: 'grand', ammoCap: 100 }), f, g, tgt, i, miss = [], worst = 0, mu = ses.muzzle(), t0 = Date.now(), hits = 0, off = null;
    for (i = 0; i < 4; i++) {                                   /* a fresh fort for each launch, so an earlier hit cannot get in the way */
      if (i) ses.rebuild({}); f = ses.sim.fort; g = f.design.bells[1]; tgt = { x: g.x, y: f.bellHomes[1], z: g.z };
      var a = SIM.aimAt(mu, tgt, K.speed, K.fly), r = flyOne(ses, 'rod', a.yaw, a.elev, 1);
      var dd = Math.sqrt(Math.pow(r.hit.x - tgt.x, 2) + Math.pow(r.hit.y - tgt.y, 2));      /* sideways and up/down: the gatehouse face is in front of the bell, so depth does not count */ miss.push(dd); worst = Math.max(worst, dd);
      for (var k = 0; k < 240; k++) ses.step(); if (ses.score().moved > 0) hits++;
    }
    results.numbers.gate = { launches: 4, worstMissM: +worst.toFixed(2), missesM: miss.map(function (v) { return +v.toFixed(2); }), hitsThatMovedBricks: hits, ms: Date.now() - t0 };
    check('B1: 4 bolts, each at a fresh 3000-piece Grand fort, aimed at the gate bell: the last point before first contact is within 0.35 m of the aim point sideways and up/down (worst ' + worst.toFixed(2) + ' m; the aim allows for the drag, the random spread is 0.01 rad) and each one moved bricks', worst <= 0.35 && hits === 4, JSON.stringify(results.numbers.gate.missesM));
    ses.sim.dispose();
  })();

  /* ---------- deterministic ---------- */
  (function () {
    function run() { var ses = SIM.makeSession(R, lee, { pieces: 40, seed: 3, fort: 'tower', ammoCap: 100 }), i, k, mu = ses.muzzle(), h; for (i = 0; i < 6; i++) { var a = SIM.aimAt(mu, { x: mu.x + i - 3, y: lee.H(mu.x, mu.z - 11) + 0.4, z: mu.z - 11 }, K.speed); ses.fire('rod', a.yaw, a.elev, 0.6 + 0.08 * i); for (k = 0; k < 60; k++) ses.step(); } h = ses.sim.hash(); ses.sim.dispose(); return h; }
    var h1 = run(), h2 = run(); check('B1: the bolt flight is deterministic (the same six launches give the same hash twice: ' + h1 + ')', h1 === h2, h1 + ' / ' + h2);
  })();

  /* ---------- B2: the other ammo ---------- */
  (function () {
    var mu, ses = SIM.makeSession(R, lee, { pieces: 40, seed: 1, fort: 'tower', ammoCap: 400 }), kinds = ['acorn', 'marble', 'coconut', 'lid', 'float', 'bottle'], rows = {};
    mu = ses.muzzle();
    kinds.forEach(function (kind) {
      var KK = SIM.KINDS[kind], i, wmax = 0, wsum = 0, wn = 0, worstAxis = 0, missMax = 0, rec, k, w, v, q, sp, ang, ax, ay, az, touch, t, n = 0, parSpin = 0;
      for (i = 0; i < 16; i++) {
        var dist = 7 + (i % 8), yawT = ((i * 37) % 21 - 10) * 0.025, tx = mu.x + Math.sin(yawT) * dist, tz = mu.z - Math.cos(yawT) * dist, ty = lee.H(tx, tz) + 0.35;
        var a = SIM.aimAt(mu, { x: tx, y: ty, z: tz }, KK.speed, KK.fly); if (!a) continue; n++; var best = 1e9;
        rec = ses.fire(kind, a.yaw, a.elev, 1); var col = rec.body.collider(0); touch = false;
        for (k = 0; k < 240 && !touch; k++) {
          w = rec.body.angvel(); v = rec.body.linvel(); q = rec.body.rotation(); sp = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
          var wm = Math.sqrt(w.x * w.x + w.y * w.y + w.z * w.z); if (wm > wmax) wmax = wm; wsum += wm; wn++;
          if (kind === 'bottle') { ax = 2 * (q.x * q.y - q.w * q.z); ay = 1 - 2 * (q.x * q.x + q.z * q.z); az = 2 * (q.y * q.z + q.w * q.x); ang = Math.acos(Math.max(-1, Math.min(1, (ax * v.x + ay * v.y + az * v.z) / sp))) * 180 / Math.PI; if (ang > worstAxis) worstAxis = ang; }
          if (kind === 'coconut' && k === 5) parSpin += (w.x * v.x + w.y * v.y + w.z * v.z) / sp;
          t = rec.body.translation(); var dd3 = Math.sqrt(Math.pow(t.x - tx, 2) + Math.pow(t.y - ty, 2) + Math.pow(t.z - tz, 2)); if (dd3 < best) best = dd3;
          ses.step(); ses.sim.world.contactPairsWith(col, function (o) { ses.sim.world.contactPair(col, o, function (man) { if (man.numContacts() > 0) touch = true; }); });
        }
        var dm = best / Math.max(1, dist * Math.max(KK.spread, 0.01)); if (dm > missMax) missMax = dm; ses.sim.remove(rec);
      }
      rows[kind] = { launches: n, maxSpinRadS: +wmax.toFixed(2), meanSpinRadS: +(wsum / wn).toFixed(2), worstAxisDeg: +worstAxis.toFixed(1), worstMissInSpreads: +missMax.toFixed(2), coconutSpinAlongFlight: +(parSpin / n).toFixed(2) };
    });
    results.numbers.ammoFlight = rows; console.log('INFO  ' + JSON.stringify(rows));
    check('B2: acorns and marbles fly clean (no spin at all: ' + rows.acorn.maxSpinRadS + ' and ' + rows.marble.maxSpinRadS + ' rad/s at most) and pass within a few spreads of where the drag-aware aim sent them (closest approach to the aim point as a multiple of dist x spread: acorn ' + rows.acorn.worstMissInSpreads + ', marble ' + rows.marble.worstMissInSpreads + ')', rows.acorn.maxSpinRadS < 0.5 && rows.marble.maxSpinRadS < 0.5 && rows.acorn.worstMissInSpreads < 2.5 && rows.marble.worstMissInSpreads < 2.5, '');
    check('B2: the coconut flies with a gentle spin along its flight (' + rows.coconut.coconutSpinAlongFlight + ' rad/s about the flight direction, asked 5)', rows.coconut.coconutSpinAlongFlight > 3.5 && rows.coconut.coconutSpinAlongFlight < 6.5, '');
    check('B2: the glass float keeps its natural tumble (mean spin ' + rows.float.meanSpinRadS + ' rad/s, up to ' + rows.float.maxSpinRadS + ')', rows.float.meanSpinRadS > 1.0, '');
    check('B2: the bottle is thrown neck first and stays within 15 degrees of its flight (worst ' + rows.bottle.worstAxisDeg + ' deg over ' + rows.bottle.launches + ' launches)', rows.bottle.worstAxisDeg <= 15, '');
    check('B2: the tin lid passes within a few spreads of where the aim (drag and lift) sent it (' + rows.lid.worstMissInSpreads + ' spreads)', rows.lid.worstMissInSpreads < 2.5, '');
    /* the lid's lift: the same throw goes further with it than without, and the aim that knows about it lands on target */
    var KL = SIM.KINDS.lid, sav = KL.fly, far = {};
    ['with', 'without'].forEach(function (mode) {
      KL.fly = mode === 'with' ? sav : { drag: sav.drag }; var s2 = SIM.makeSession(R, lee, { pieces: 40, seed: 1, fort: 'tower', ammoCap: 50 }), rec = s2.fire('lid', 0.0, 0.2, 1), col = rec.body.collider(0), touch = false, k, t, m2 = s2.muzzle();
      for (k = 0; k < 400 && !touch; k++) { s2.step(); s2.sim.world.contactPairsWith(col, function (o) { s2.sim.world.contactPair(col, o, function (man) { if (man.numContacts() > 0) touch = true; }); }); }
      t = rec.body.translation(); far[mode] = Math.sqrt(Math.pow(t.x - m2.x, 2) + Math.pow(t.z - m2.z, 2)); s2.sim.dispose();
    }); KL.fly = sav;
    results.numbers.lidRangeM = { withLift: +far.with.toFixed(1), withoutLift: +far.without.toFixed(1) };
    check('B2: the tin lid sails further with its lift (' + far.with.toFixed(1) + ' m against ' + far.without.toFixed(1) + ' m without it, same throw)', far.with > far.without + 0.5, '');
    ses.sim.dispose();
    function run() { var s3 = SIM.makeSession(R, lee, { pieces: 40, seed: 5, fort: 'tower', ammoCap: 100 }), i, k, m3 = s3.muzzle(); SIM.AMMO.forEach(function (kind, j) { var a = SIM.aimAt(m3, { x: m3.x + j - 3, y: lee.H(m3.x, m3.z - 10) + 0.3, z: m3.z - 10 }, SIM.KINDS[kind].speed, SIM.KINDS[kind].fly); s3.fire(kind, a.yaw, a.elev, 0.9); for (k = 0; k < 50; k++) s3.step(); }); for (k = 0; k < 200; k++) s3.step(); var h = s3.sim.hash(); s3.sim.dispose(); return h; }
    var h1 = run(), h2 = run(); check('B2: all seven ammo kinds fly deterministically (the same volley gives the same hash twice: ' + h1 + ')', h1 === h2, h1 + ' / ' + h2);
  })();

  fs.writeFileSync(path.join(__dirname, 'test_flight_results.json'), JSON.stringify(results, null, 1));
  console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.checks.length + ' checks)'); process.exit(fails ? 1 : 0);
}
main().catch(function (e) { console.error(e); process.exit(2); });
