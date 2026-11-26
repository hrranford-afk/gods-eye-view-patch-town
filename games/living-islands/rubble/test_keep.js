/* Rubble, Keep the bell: Node tests (no browser).   Run:  node test_keep.js
   Keep mode builds a fort with one bell on its own tall perch (a battered pillar of bricks). The player knocks out as much of the rest as possible and keeps the bell up.
   Checks: the perch alone stands and settles with no creep at 2,000, 5,000 and 10,000 pieces; the whole fort has the exact count and settles; scripted shots; scores; codes.
   Writes test_keep_results.json. Timings are a shared cloud CPU with software only: NOT iPad numbers and not any real device's. */
'use strict';
var fs = require('fs'), path = require('path');
var TR = require('./terrain.js'), SIM = require('./sim_terrain.js');
var ROOT = path.join(__dirname, '..');
var results = { when: new Date().toISOString(), node: process.version, checks: [], numbers: {} }, fails = 0;
function check(name, ok, detail) { results.checks.push({ name: name, ok: !!ok, detail: detail }); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '   [' + detail + ']' : '')); }
function f2(v) { return (+v).toFixed(2); }
var COUNTS = [2000, 5000, 10000];

async function main() {
  var m = await import('file://' + path.join(__dirname, 'vendor/rapier-0.21-compat/rapier.mjs')), R = m.default || m; await R.init();
  var man = JSON.parse(fs.readFileSync(path.join(ROOT, 'landform/worlds/seed9001/manifest.json'), 'utf8'));
  var lee = TR.leeSite(TR.islandFromBytes(man, fs.readFileSync(path.join(ROOT, 'landform/worlds/seed9001/world.bin'))), { grand: true });
  results.numbers.perch = [];

  /* ---------- 1. the perch alone stands, settles and does not creep ---------- */
  COUNTS.forEach(function (n) {
    var t0 = Date.now(), ses = SIM.makeSession(R, lee, { pieces: n, seed: 1, fort: 'castle', keep: 'perch' }), sim = ses.sim, f = sim.fort, d = f.design, k, i, bt0 = f.bell.body.translation(), hash0 = sim.hash();
    check('perch alone at ' + n + ': ' + f.count + ' pieces (kb ' + d.perch.kb + ' modules at the foot, ' + d.perch.kh + ' courses, ' + f2(d.height) + ' m), settled and asleep, nothing fell through',
      f.count === d.perch.count && sim.awake() === 0 && f.settledOk && sim.rescued === 0, 'drift ' + (f.settleMax * 100).toFixed(1) + ' cm, ' + f.settleSteps + ' steps');
    sim.wakeAll(); var worst = 0;
    for (k = 0; k < 600; k++) { ses.step(); if (k % 60 === 59) { var by = f.bell.body.translation(); worst = Math.max(worst, Math.abs(by.y - f.bellHome), Math.abs(by.x - bt0.x), Math.abs(by.z - bt0.z)); } }
    var sc = ses.score();
    check('perch alone at ' + n + ': after 10 more seconds awake there is no creep (0 pieces moved over 20 cm, bell moved ' + (worst * 1000).toFixed(1) + ' mm, bell up)', sc.moved === 0 && !sc.bellDown && worst < 0.01, JSON.stringify({ moved: sc.moved, worstMm: worst * 1000 }));
    results.numbers.perch.push({ pieces: n, perchCount: f.count, kb: d.perch.kb, courses: d.perch.kh, heightM: +f2(d.height), driftCm: +(f.settleMax * 100).toFixed(2), bellMoveMm: +(worst * 1000).toFixed(2), ms: Date.now() - t0 });
    sim.dispose();
  });

  /* ---------- 2. the whole Keep fort: exact count, one bell on the perch, settles, no creep, deterministic ---------- */
  results.numbers.fort = [];
  (function () {
    var cases = [['castle', 2000], ['castle', 5000], ['castle', 10000], ['wall', 2000], ['tower', 2000], ['grand', 5000]];
    cases.forEach(function (c) {
      var sh = c[0], n = c[1], t0 = Date.now(), ses = SIM.makeSession(R, lee, { pieces: n, seed: 1, fort: sh, keep: true }), sim = ses.sim, f = sim.fort, d = f.design, i, k, g3 = 0, bells = 0;
      for (i = 0; i < d.pieces.length; i++) { if (d.pieces[i].g === 3) g3++; if (d.pieces[i].k === 'bell') bells++; }
      check('keep ' + sh + ' ' + n + ': exact count ' + f.count + ' with one bell and a ' + g3 + '-piece perch', f.count === n && sim.bodies.length === n && bells === 1 && g3 + 1 === d.perch.count, d.shape);
      check('keep ' + sh + ' ' + n + ': settled and asleep (drift ' + (f.settleMax * 100).toFixed(1) + ' cm, ' + f.settleSteps + ' steps), no creep after 5 s awake, bell up', (function () {
        var ok = sim.awake() === 0 && f.settledOk && sim.rescued === 0; sim.wakeAll(); for (k = 0; k < 300; k++) ses.step(); var sc = ses.score(); return ok && sc.moved === 0 && !sc.bellDown; })(), '');
      results.numbers.fort.push({ shape: d.shape, pieces: n, perch: d.perch.count, driftCm: +(f.settleMax * 100).toFixed(1), heightM: +f2(d.height), ms: Date.now() - t0 });
      sim.dispose();
    });
    var a = SIM.FORT.design('castle', 2000, 1, lee, null, false, true), b = SIM.FORT.design('castle', 2000, 1, lee, null, false, true), c2 = SIM.FORT.design('castle', 2000, 2, lee, null, false, true);
    check('keep design is deterministic per seed and count, and the seed changes the bond', JSON.stringify(a.pieces) === JSON.stringify(b.pieces) && JSON.stringify(a.pieces) !== JSON.stringify(c2.pieces) && c2.count === 2000, '');
    var small = SIM.FORT.design('castle', 250, 1, lee, null, false, true);
    check('keep mode raises a too small count to ' + SIM.FORT.KEEPMIN + ' (the perch needs room) and says so', small.count === SIM.FORT.KEEPMIN && small.raised === SIM.FORT.KEEPMIN, 'count ' + small.count);
    var old = SIM.FORT.design('castle', 400, 1, lee);
    check('Topple mode is unchanged (no perch group, no keep flag, 400 pieces)', !old.keep && old.count === 400 && !old.pieces.some(function (p) { return p.g === 3; }), '');
  })();

  /* ---------- 3. score and round ---------- */
  (function () {
    var RU = SIM.KEEP_RULES;
    check('stars: bell down 0; bell standing 1; from ' + RU.two + ' percent 2; over ' + RU.three + ' percent 3 (exactly ' + RU.three + ' is 2)', SIM.keepStars(95, false) === 0 && SIM.keepStars(0, true) === 1 && SIM.keepStars(RU.two, true) === 2 && SIM.keepStars(RU.three, true) === 2 && SIM.keepStars(RU.three + 0.1, true) === 3 && RU.shotsDef === 12 && RU.shotsMin === 6 && RU.shotsMax === 40, JSON.stringify(RU));
    var ses = SIM.makeSession(R, lee, { pieces: 1000, seed: 1, fort: 'castle', keep: true, ammoCap: 60 }), f = ses.sim.fort, d = f.design, k, i, st;
    st = ses.keepState(12, false);
    check('a fresh Keep round is playing: 0 percent, 12 shots left, bell standing, not over', st && st.over === null && st.left === 12 && st.percent === 0 && st.bellUp, JSON.stringify(st));
    var tgt = { x: d.cx, y: d.baseY + 0.5, z: d.cz + d.half.z * 0.9 }, a = SIM.aimAt(ses.muzzle(), tgt, SIM.KINDS.marble.speed);
    for (i = 0; i < 3; i++) { ses.fire('marble', a.yaw, a.elev, 1); for (k = 0; k < 60; k++) ses.step(); }
    st = ses.keepState(12, false);
    check('after 3 of 12 shots the round is still playing with 9 left, and the percent is of the base without the perch (' + st.outer + ' pieces, perch ' + d.perch.count + ')', st.over === null && st.left === 9 && st.outer === 1000 - d.perch.count && st.percent === 100 * st.knocked / st.outer, JSON.stringify(st));
    st = ses.keepState(12, true); var early = st.over;
    for (k = 0; k < 700; k++) ses.step(); st = ses.keepState(12, true);
    check('Done ends the round once the bricks rest (not at once), with a result and 1 or more stars', early === null && st.over === 'result' && st.stars >= 1 && st.bellUp, JSON.stringify(st));
    ses.sim.dispose();
    var s2 = SIM.makeSession(R, lee, { pieces: 1000, seed: 1, fort: 'castle', keep: true, ammoCap: 60 }), f2 = s2.sim.fort, b = f2.design.bell, a2 = SIM.aimAt(s2.muzzle(), { x: b.x, y: f2.bellHome, z: b.z }, SIM.KINDS.rod.speed), n = 0;
    for (i = 0; i < 30 && !s2.bellDown; i++) { s2.fire('rod', a2.yaw, a2.elev, 1); n++; for (k = 0; k < 150; k++) s2.step(); }
    st = s2.keepState(40, false);
    check('rods at the perch drop the bell (after ' + n + ' rods): the round is over with Bell down, no stars', st.over === 'bell' && st.stars === 0 && !st.bellUp, JSON.stringify(st));
    results.numbers.perchRods = n; s2.sim.dispose();
    var h = function () { var q = SIM.makeSession(R, lee, { pieces: 1000, seed: 1, fort: 'castle', keep: true, ammoCap: 60 }), j, t; for (j = 0; j < 3; j++) { q.fire('marble', a.yaw, a.elev, 1); for (t = 0; t < 60; t++) q.step(); } var r = q.sim.hash() + ':' + q.keepState(12, false).knocked; q.sim.dispose(); return r; };
    var h1 = h(), h2 = h(); check('the same Keep volley gives the same hash and the same knocked-out count in two fresh sessions', h1 === h2, h1 + ' / ' + h2);
  })();

  /* ---------- 4. ammo: strong and gentle, and a volley at the outer wall that leaves the perch and the bell alone ---------- */
  results.numbers.strategies = [];
  (function () {
    var lab = {}; SIM.AMMO.forEach(function (k) { lab[k] = SIM.ammoStrength(k).label; });
    check('every ammo kind has a strong or gentle label (strong from ' + SIM.STRONG_J + ' J): ' + JSON.stringify(lab), SIM.AMMO.every(function (k) { return lab[k] === 'strong' || lab[k] === 'gentle'; }) && lab.rod === 'strong' && lab.lid === 'strong' && lab.acorn === 'gentle' && lab.marble === 'gentle', '');
    function volley(name, kind, shots, yM) {
      var ses = SIM.makeSession(R, lee, { pieces: 2000, seed: 1, fort: 'castle', keep: true, ammoCap: 60 }), f = ses.sim.fort, d = f.design, K = SIM.KINDS[kind], i, k, a, x, perchMoved = 0, front = 0, frontMoved = 0, t, dx, dy, dz;
      for (i = 0; i < shots; i++) {
        x = d.cx + (((i * 7) % 11) / 10 - 0.5) * 1.6 * d.half.x * 0.9; a = SIM.aimAt(ses.muzzle(), { x: x, y: d.baseY + yM, z: d.cz + d.half.z * 0.9 }, K.speed);
        ses.fire(kind, a.yaw, a.elev, 1); for (k = 0; k < 70; k++) ses.step();
      }
      for (k = 0; k < 600; k++) ses.step();
      var sc = ses.score(), st = ses.keepState(shots, true);
      d.pieces.forEach(function (p, j) {
        var dead = f.recs[j].dead, moved = dead; if (!dead) { t = f.recs[j].body.translation(); dx = t.x - f.home[j * 3]; dy = t.y - f.home[j * 3 + 1]; dz = t.z - f.home[j * 3 + 2]; moved = dx * dx + dy * dy + dz * dz > SIM.MOVED * SIM.MOVED; }
        if (p.g === 3 && moved) perchMoved++;
        if (p.g !== 3 && p.k !== 'bell' && p.z > d.cz + d.half.z * 0.6) { front++; if (moved) frontMoved++; }
      });
      var r = { strategy: name, ammo: kind, shots: shots, percent: +sc.keep.percent.toFixed(1), frontWallPercent: +(100 * frontMoved / front).toFixed(1), bellStanding: !sc.bellDown, perchPiecesMoved: perchMoved, stars: st.stars };
      results.numbers.strategies.push(r); console.log('INFO  ' + JSON.stringify(r)); ses.sim.dispose(); return r;
    }
    var A = volley('12 marbles along the front wall', 'marble', 12, 0.5), B = volley('12 tin lids along the front wall', 'lid', 12, 0.5), C = volley('12 big rods along the front wall', 'rod', 12, 0.6);
    check('a gentle volley (12 marbles) at the outer wall leaves the bell and the whole perch alone and knocks out some of the base (' + A.percent + ' percent)', A.bellStanding && A.perchPiecesMoved === 0 && A.percent > 0, '');
    check('a strong volley (12 tin lids) clears a good part of the outer wall (' + B.frontWallPercent + ' percent of the front wall, ' + B.percent + ' percent of the base) and the bell and perch stand (at most 7 of the 692 perch pieces nudged more than 20 cm: ' + B.perchPiecesMoved + ')', B.bellStanding && B.perchPiecesMoved <= 7 && B.frontWallPercent >= 15 && B.percent > A.percent, '');
    check('12 big rods at the outer wall leave the bell standing (' + C.percent + ' percent, ' + C.frontWallPercent + ' of the front wall), the perch untouched', C.bellStanding && C.perchPiecesMoved === 0 && C.percent > A.percent, '');
  })();

  fs.writeFileSync(path.join(__dirname, 'test_keep_results.json'), JSON.stringify(results, null, 1));
  console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.checks.length + ' checks)'); process.exit(fails ? 1 : 0);
}
main().catch(function (e) { console.error(e); process.exit(2); });
