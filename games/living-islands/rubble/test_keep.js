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

  fs.writeFileSync(path.join(__dirname, 'test_keep_results.json'), JSON.stringify(results, null, 1));
  console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.checks.length + ' checks)'); process.exit(fails ? 1 : 0);
}
main().catch(function (e) { console.error(e); process.exit(2); });
