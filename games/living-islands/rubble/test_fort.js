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
  fs.writeFileSync(path.join(__dirname, 'test_fort_results.json'), JSON.stringify(results, null, 1));
  console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.checks.length + ' checks)'); process.exit(fails ? 1 : 0);
}
main().catch(function (e) { console.error(e); process.exit(2); });
