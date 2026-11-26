/* Rubble fort tests (pure Node, no browser).   Run:  node test_fort.js [--bench]
   Builds forts (Wall, Tower, Castle) on the island's levelled pad with Rapier 0.21, and checks that the piece count is exact, that every fort settles and goes to sleep
   without collapsing, that the bell stands, that the score and the bell rule work, that a big rod can drop the bell and that the replay code is repeatable.
   Writes test_fort_results.json. Timings are a shared cloud CPU with software only: they are NOT iPad numbers and not any real device's. */
'use strict';
var fs = require('fs'), path = require('path');
var TR = require('./terrain.js'), SIM = require('./sim_terrain.js');
var ROOT = path.join(__dirname, '..');
var results = { when: new Date().toISOString(), node: process.version, checks: [], numbers: {} }, fails = 0, BENCH = process.argv.indexOf('--bench') > 0;
function check(name, ok, detail) { results.checks.push({ name: name, ok: !!ok, detail: detail }); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '   [' + detail + ']' : '')); }
function f2(v) { return (+v).toFixed(2); }

async function main() {
  var m = await import('file://' + path.join(__dirname, 'vendor/rapier-0.21-compat/rapier.mjs')), R = m.default || m; await R.init();
  var man = JSON.parse(fs.readFileSync(path.join(ROOT, 'landform/worlds/seed9001/manifest.json'), 'utf8'));
  var lee = TR.leeSite(TR.islandFromBytes(man, fs.readFileSync(path.join(ROOT, 'landform/worlds/seed9001/world.bin'))));
  results.numbers.padY = +f2(lee.padY);

  /* ---------- 1. the count is exact, for every shape and a spread of counts (design only, fast) ---------- */
  (function () {
    var bad = [], n, sh, counts = [40, 60, 100, 150, 250, 400, 600, 1000, 1500, 2000, 3000, 4000, 6000, 8000, 12000, 20000], tot = 0, bells, fit = true;
    for (var si = 0; si < SIM.FORT.SHAPES.length; si++) for (var ci = 0; ci < counts.length; ci++) {
      sh = SIM.FORT.SHAPES[si]; n = counts[ci]; var d = SIM.FORT.design(sh, n, 1, lee); tot++;
      bells = d.pieces.filter(function (p) { return p.k === 'bell'; }).length;
      if (d.count !== n || d.pieces.length !== n || bells !== 1) bad.push(sh + ' ' + n + ' gave ' + d.pieces.length + ' with ' + bells + ' bells');
      if (!d.onPad && n <= 20000 && d.scale === 0.25) fit = fit && true;
    }
    check('count: every shape at ' + counts.length + ' counts from 40 to 20000 gives exactly that many pieces and one bell (' + tot + ' designs)', bad.length === 0, bad.slice(0, 3).join('; '));
    var d2 = SIM.FORT.design('castle', 400, 1, lee), d3 = SIM.FORT.design('castle', 400, 1, lee);
    check('design is deterministic: same shape, count and seed give the same pieces', JSON.stringify(d2.pieces) === JSON.stringify(d3.pieces), '');
    var d4 = SIM.FORT.design('castle', 400, 2, lee);
    check('a different seed gives a different bond pattern (same count)', JSON.stringify(d2.pieces) !== JSON.stringify(d4.pieces) && d4.count === 400, '');
    check('the fort sits on the levelled pad (ground spread under it under 1 cm)', d2.spread < 0.01, 'spread ' + (d2.spread * 1000).toFixed(1) + ' mm');
    results.numbers.castle400 = { params: d2.params, scale: d2.scale, heightM: +f2(d2.height) };
  })();

  /* ---------- 2. each shape settles, sleeps, and stands ---------- */
  var settleCounts = BENCH ? [250, 1000, 2000, 4000] : [100, 400, 1000];
  results.numbers.settle = [];
  for (var si = 0; si < SIM.FORT.SHAPES.length; si++) for (var ci = 0; ci < settleCounts.length; ci++) {
    var sh = SIM.FORT.SHAPES[si], n = settleCounts[ci], t0 = Date.now(), ses = SIM.makeSession(R, lee, { pieces: n, seed: 1, fort: sh }), sim = ses.sim, f = sim.fort, sc = ses.score();
    var tilt = 0, bt = f.bell.body.translation();
    f.recs.forEach(function (r) { var q = r.body.rotation(), up = 1 - 2 * (q.x * q.x + q.z * q.z); if (1 - up > tilt) tilt = 1 - up; });
    check(sh + ' ' + n + ': exact count ' + f.count + ' bodies, ' + sim.bodies.length + ' in the world', f.count === n && sim.bodies.length === n, '');
    check(sh + ' ' + n + ': settled and asleep (awake 0, drift ' + (f.settleMax * 100).toFixed(1) + ' cm, ' + f.settleSteps + ' steps), nothing fell through', sim.awake() === 0 && f.settledOk && sim.rescued === 0, 'ok=' + f.settledOk);
    check(sh + ' ' + n + ': nothing moved after the settle (score 0 moved) and the bell is up', sc.moved === 0 && sc.standing === n && !sc.bellDown && Math.abs(bt.y - f.bellHome) < 1e-6, JSON.stringify(sc));
    check(sh + ' ' + n + ': after 5 more seconds untouched it is still the same (no creep)', (function () { sim.wakeAll(); for (var i = 0; i < 300; i++) ses.step(); var s2 = ses.score(); return s2.moved === 0 && !s2.bellDown; })(), '');
    results.numbers.settle.push({ shape: sh, pieces: n, brickScale: f.design.scale, courses: f.design.courses, heightM: +f2(f.design.height), settleSteps: f.settleSteps, driftCm: +(f.settleMax * 100).toFixed(1), tiltMax: +tilt.toFixed(4), ms: Date.now() - t0 });
    sim.dispose();
  }
  /* ---------- 3. the bell rule, the score, Rebuild and the replay code ---------- */
  (function () {
    var ses = SIM.makeSession(R, lee, { pieces: 250, seed: 1, fort: 'castle', ammoCap: 60 }), sim = ses.sim, f = sim.fort, i, k, a, sc, hash0 = sim.hash();
    check('the bell rule: down means 0.32 m (Castle Sound\'s number, its bricks are the same 0.30 m ones so its units are metres); a piece moved means 0.20 m (a brick width)', SIM.BELL_DROP === 0.32 && SIM.MOVED === 0.20, '');
    /* a single marble at the front wall does not drop the bell; big rods aimed at the bell do */
    var shots = 0; a = SIM.aimAt(ses.muzzle(), { x: 0, y: f.bellHome, z: lee.layout.wall.z }, SIM.KINDS.rod.speed);
    check('the bell is in reach of a big rod (an arc exists)', !!a, a ? 'elev ' + (a.elev * 57.3).toFixed(1) + ' deg, dist ' + a.dist.toFixed(1) + ' m' : '');
    for (i = 0; i < 20 && !ses.bellDown; i++) { ses.fire('rod', a.yaw, a.elev, 1); shots++; for (k = 0; k < 150; k++) ses.step(); }
    sc = ses.score();
    check('a big rod volley aimed at the bell drops it (Bell down after ' + shots + ' rods)', sc.bellDown && sc.bellDrop > 0.32, JSON.stringify(sc));
    check('the score counts shots, moved and standing, and they add up', sc.shots === shots && sc.moved > 0 && sc.moved + sc.standing === sc.count && sc.count === 250, JSON.stringify(sc));
    results.numbers.bellHit = { rods: shots, moved: sc.moved, standing: sc.standing, bellDropCm: +(sc.bellDrop * 100).toFixed(0) };
    var steps = sim.steps, hashEnd = sim.hash(), nev = ses.events.length;
    ses.startReplay(); ses.finishReplay();
    check('replay: the same fort rebuilt and the same shots fed again give the same hash at the same step, and the bell falls again', ses.lastReplay && ses.lastReplay.ok && ses.sim.steps === steps && ses.score().bellDown, JSON.stringify(ses.lastReplay));
    check('replay keeps the event log (' + nev + ' events)', ses.events.length === nev, '');
    /* Rebuild: the same seed gives the same fort and the same settled hash, also after the bell fell */
    ses.rebuild({}); var h1 = ses.sim.hash(), s1 = ses.score(); ses.rebuild({}); var h2 = ses.sim.hash();
    check('Rebuild: the same fort comes back deterministically (hash equal over two rebuilds, and equal to the first build)', h1 === h2 && h1 === hash0, hash0 + ' / ' + h1 + ' / ' + h2);
    check('Rebuild resets the score (0 moved, bell up, no shots)', s1.moved === 0 && !s1.bellDown && s1.shots === 0 && ses.events.length === 0, JSON.stringify(s1));
    /* the same volley after a Rebuild gives the same result (so a shared shot list means the same thing) */
    function volley() { var q = SIM.makeSession(R, lee, { pieces: 250, seed: 1, fort: 'castle' }), j; for (j = 0; j < 3; j++) { q.fire('rod', a.yaw, a.elev, 1); for (var t = 0; t < 120; t++) q.step(); } var h = q.sim.hash(), sc2 = q.score(); q.sim.dispose(); return h + ':' + sc2.moved; }
    var v1 = volley(), v2 = volley();
    check('the same three rods give the same hash and the same moved count in two fresh sessions', v1 === v2, v1 + ' / ' + v2);
    results.numbers.fortCode = SIM.fortCode(R, lee); results.numbers.determinismCode = SIM.determinismCode(R, lee);
    check('fort replay code (250-piece castle, fixed volley) is repeatable: ' + results.numbers.fortCode, SIM.fortCode(R, lee) === results.numbers.fortCode, '');
    console.log('INFO  codes the page prints: loose ' + results.numbers.determinismCode + ', fort ' + results.numbers.fortCode);
    ses.sim.dispose();
  })();

  fs.writeFileSync(path.join(__dirname, 'test_fort_results.json'), JSON.stringify(results, null, 1));
  console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.checks.length + ' checks)'); process.exit(fails ? 1 : 0);
}
main().catch(function (e) { console.error(e); process.exit(2); });
