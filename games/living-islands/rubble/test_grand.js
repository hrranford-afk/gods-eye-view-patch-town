/* Rubble Grand Fort tests (pure Node, no browser).   Run:  node test_grand.js [--bench] [--tall]
   Builds the Grand fort on the island's big levelled pad with Rapier 0.21 and checks: the piece count is exact at 2000, 5000, 10000 and 20000, the bricks are full size,
   no piece starts below the ground, the gate passage is open, the fort settles and goes to sleep with every bell still up, a big rod at the gate drops the gatehouse bell,
   the design is deterministic per seed and count, and the replay code is repeatable. --bench adds physics ms per step asleep and awake after a hit (5000, 10000, 20000).
   --tall tests how tall a battered keep can go. Writes test_grand_results.json. Timings are Node on a shared cloud CPU, software only, one thread: NOT iPad numbers. */
'use strict';
var fs = require('fs'), path = require('path');
var TR = require('./terrain.js'), SIM = require('./sim_terrain.js');
var ROOT = path.join(__dirname, '..');
var results = { when: new Date().toISOString(), node: process.version, checks: [], numbers: {} }, fails = 0, BENCH = process.argv.indexOf('--bench') > 0, TALL = process.argv.indexOf('--tall') > 0;
function check(name, ok, detail) { results.checks.push({ name: name, ok: !!ok, detail: detail }); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '   [' + detail + ']' : '')); }
function f2(v) { return (+v).toFixed(2); }
var COUNTS = [2000, 5000, 10000, 20000];

async function main() {
  var m = await import('file://' + path.join(__dirname, 'vendor/rapier-0.21-compat/rapier.mjs')), R = m.default || m; await R.init();
  var man = JSON.parse(fs.readFileSync(path.join(ROOT, 'landform/worlds/seed9001/manifest.json'), 'utf8'));
  var lee = TR.leeSite(TR.islandFromBytes(man, fs.readFileSync(path.join(ROOT, 'landform/worlds/seed9001/world.bin'))), { grand: true });
  var NB = SIM.FORT.GRAND_BELLS;

  /* ---------- 1. the design: exact count, full size, fits the pad, nothing below ground, an open passage ---------- */
  results.numbers.designs = [];
  COUNTS.concat([1700, 3000, 8000, 12000, 15000]).forEach(function (n) {
    var d = SIM.FORT.design('grand', n, 1, lee), bells = d.pieces.filter(function (p) { return p.k === 'bell'; }), kinds = {}, below = 0, i, p;
    d.pieces.forEach(function (q) { kinds[q.k] = (kinds[q.k] || 0) + 1; if (q.y < lee.H(q.x, q.z) - 1e-6) below++; });
    check('grand ' + n + ': exactly ' + n + ' pieces (' + d.count + '), ' + bells.length + ' bells, full-size bricks, nothing below ground, on the pad, shape stays grand', d.count === n && d.pieces.length === n && bells.length === NB && d.scale === 1 &&
      Object.keys(kinds).every(function (k) { return /^(brick|beam|bell)$/.test(k); }) && below === 0 && d.onPad && d.shape === 'grand' && !d.fallback, JSON.stringify(kinds) + ' footprint ' + f2(d.half.x * 2) + ' x ' + f2(d.half.z * 2) + ' m, ' + f2(d.height) + ' m tall');
    results.numbers.designs.push({ pieces: n, footprintM: [+f2(d.half.x * 2), +f2(d.half.z * 2)], heightM: +f2(d.height), params: d.params, kinds: kinds });
    /* the passage: nothing inside the 0.6 m wide, 0.7 m high opening in the gatehouse */
    var g = d.bells[1], pas = d.pieces.filter(function (q) { return q.k !== 'bell' && Math.abs(q.x - d.cx) < 0.25 && Math.abs(q.z - g.z) < 0.55 && q.y - d.baseY < 0.70; });
    if (n === 5000 || n === 20000) check('grand ' + n + ': the gate passage is open (no piece in the doorway, 0.6 m wide and 0.7 m high), beams lie across it above', pas.length === 0 && d.pieces.some(function (q) { return q.k === 'beam' && Math.abs(q.x - d.cx) < 0.01 && Math.abs(q.z - g.z) < 0.5; }), pas.length + ' pieces in the doorway');
  });
  (function () {
    var a = SIM.FORT.design('grand', 5000, 1, lee), b = SIM.FORT.design('grand', 5000, 1, lee), c = SIM.FORT.design('grand', 5000, 2, lee);
    check('grand design is deterministic: same count and seed give the same pieces; another seed gives another bond pattern with the same count', JSON.stringify(a.pieces) === JSON.stringify(b.pieces) && JSON.stringify(a.pieces) !== JSON.stringify(c.pieces) && c.count === 5000, '');
    var small = SIM.FORT.design('grand', 1000, 1, lee);
    check('below ' + SIM.FORT.grandMin() + ' pieces the designer says so and builds a castle of exactly that count (1000 pieces)', small.fallback && small.shape === 'castle' && small.count === 1000, 'shape ' + small.shape);
    results.numbers.grandMin = SIM.FORT.grandMin();
  })();

  /* ---------- 2. settle, sleep, nothing moved, all bells up; a rod at the gate; the numbers ---------- */
  results.numbers.settle = []; results.numbers.perf = [];
  for (var ci = 0; ci < COUNTS.length; ci++) {
    var n = COUNTS[ci], t0 = Date.now(), ses = SIM.makeSession(R, lee, { pieces: n, seed: 1, fort: 'grand', ammoCap: 60 }), sim = ses.sim, f = sim.fort, sc = ses.score(), buildMs = Date.now() - t0, i, k, a, ms, sum, tilt = 0;
    f.recs.forEach(function (r) { var q = r.body.rotation(), up = 1 - 2 * (q.x * q.x + q.z * q.z); if (1 - up > tilt) tilt = 1 - up; });
    check('grand ' + n + ': ' + f.count + ' bodies built (exact) and ' + sim.bodies.length + ' in the world', f.count === n && sim.bodies.length === n, '');
    check('grand ' + n + ': settled and asleep (awake ' + sim.awake() + ', drift ' + (f.settleMax * 100).toFixed(1) + ' cm, ' + f.settleSteps + ' steps), nothing fell through, no retry needed', sim.awake() === 0 && f.settledOk && sim.rescued === 0 && !ses.settleNote, 'ok=' + f.settledOk + ' tilt ' + tilt.toFixed(3));
    check('grand ' + n + ': after the settle 0 pieces have moved and all ' + NB + ' bells are up (Bells down: 0 of ' + NB + ')', sc.moved === 0 && sc.bells === NB && sc.bellsDown === 0 && !sc.bellDown, JSON.stringify({ moved: sc.moved, bells: sc.bells, down: sc.bellsDown }));
    var row = { pieces: n, built: f.count, courses: f.design.courses, heightM: +f2(f.design.height), settleSteps: f.settleSteps, driftCm: +(f.settleMax * 100).toFixed(1), tilt: +tilt.toFixed(4), buildAndSettleMs: buildMs, bells: NB };
    /* asleep: nothing happening */
    sum = 0; for (i = 0; i < 60; i++) sum += ses.step(); row.msPerStepAsleep = +(sum / 60).toFixed(3);
    /* after a hit: rods at the gatehouse bell, then 4 s; mean, worst, most bodies awake */
    var g = f.design.bells[1], rods = 0, worst = 0, peak = 0, cnt = 0; sum = 0;
    for (k = 0; k < 8 && !sc.bellFlags[1]; k++) {
      a = SIM.aimAt(ses.muzzle(), { x: g.x, y: f.bellHomes[1], z: g.z }, SIM.KINDS.rod.speed); ses.fire('rod', a.yaw, a.elev, 1); rods++;
      for (i = 0; i < 90; i++) { ms = ses.step(); sum += ms; cnt++; if (ms > worst) worst = ms; if (sim.nActive > peak) peak = sim.nActive; }
      sc = ses.score(); if (sc.bellFlags[1]) break;
    }
    for (i = 0; i < 180; i++) { ms = ses.step(); sum += ms; cnt++; if (ms > worst) worst = ms; if (sim.nActive > peak) peak = sim.nActive; }
    sc = ses.score();
    check('grand ' + n + ': a big rod aimed at the gate drops the gatehouse bell (after ' + rods + ' rod' + (rods > 1 ? 's' : '') + '; Bells down: ' + sc.bellsDown + ' of ' + sc.bells + ')', sc.bellFlags[1] === true && sc.bellsDown >= 1 && sc.moved > 0 && sc.moved + sc.standing === n, JSON.stringify({ flags: sc.bellFlags, moved: sc.moved, rods: rods }));
    check('grand ' + n + ': the replay code works on this fort (same shots again, same hash at the same step)', (function () { var steps = sim.steps, hh = sim.hash(); ses.startReplay(); ses.finishReplay(); return ses.lastReplay && ses.lastReplay.ok && ses.sim.steps === steps && ses.sim.hash() === hh; })(), JSON.stringify(ses.lastReplay));
    row.msPerStepAfterHit = +(sum / cnt).toFixed(2); row.worstStepMs = +worst.toFixed(1); row.peakAwake = peak; row.rodsToDropGateBell = rods; row.movedAfterHit = sc.moved; row.bellsDownAfterHit = sc.bellsDown; row.rescued = ses.sim.rescued;
    results.numbers.settle.push(row);
    console.log('INFO  ' + n + ': settle ' + f.settleSteps + ' steps (' + buildMs + ' ms), asleep ' + row.msPerStepAsleep + ' ms/step, awake after a hit ' + row.msPerStepAfterHit + ' ms/step (worst ' + row.worstStepMs + ', peak awake ' + peak + '), gate bell after ' + rods + ' rod(s), bells down ' + sc.bellsDown + ' of ' + sc.bells);
    ses.sim.dispose();
  }
  results.numbers.perf = results.numbers.settle.filter(function (r) { return r.pieces >= 5000; }).map(function (r) { return { pieces: r.pieces, msPerStepAsleep: r.msPerStepAsleep, msPerStepAfterHit: r.msPerStepAfterHit, worstStepMs: r.worstStepMs, peakAwake: r.peakAwake }; });

  /* ---------- 3. a few more seeds and the second counts settle too (smaller, quick) ---------- */
  [[1700, 2], [2500, 3], [3000, 4]].forEach(function (c) {
    var ses = SIM.makeSession(R, lee, { pieces: c[0], seed: c[1], fort: 'grand', ammoCap: 20 }), f = ses.sim.fort, sc = ses.score();
    check('grand ' + c[0] + ' seed ' + c[1] + ': exact, settled, asleep, nothing moved, all bells up', f.count === c[0] && ses.sim.awake() === 0 && f.settledOk && sc.moved === 0 && sc.bellsDown === 0, 'drift ' + (f.settleMax * 100).toFixed(1) + ' cm');
    ses.sim.dispose();
  });

  /* ---------- 4. the replay code of a 3000-piece Grand fort is repeatable ---------- */
  results.numbers.grandCode = SIM.grandCode(R, lee);
  check('grand replay code (3000-piece fort, fixed volley at the gate) is repeatable: ' + results.numbers.grandCode, SIM.grandCode(R, lee) === results.numbers.grandCode, '');
  console.log('INFO  grand code the page prints: ' + results.numbers.grandCode);

  /* ---------- 5. how tall can a battered keep go (a keep alone on the pad; stands = settled, drift under 12 cm, no tilt) ---------- */
  var grid = TALL ? [[3, [15, 20, 24, 25, 30, 35]], [5, [24, 30, 33, 36, 40]], [7, [30, 33, 36, 40]], [9, [30, 33, 36, 40]]] : [[3, [24]], [5, [30]], [9, [33]]];
  results.numbers.keeps = [];
  grid.forEach(function (g) {
    g[1].forEach(function (kh) {
      var ses = SIM.makeSession(R, lee, { pieces: 100, seed: 1, fort: 'keep', ammoCap: 10, force: { params: { kb: g[0], kh: kh, kt: 3 } } }), f = ses.sim.fort, tilt = 0;
      f.recs.forEach(function (r) { var q = r.body.rotation(), up = 1 - 2 * (q.x * q.x + q.z * q.z); if (1 - up > tilt) tilt = 1 - up; });
      var ok = f.settledOk && ses.sim.awake() === 0 && tilt < 0.02;
      results.numbers.keeps.push({ baseModules: g[0], courses: kh, heightM: +f2(kh * 0.12), pieces: f.count, stands: ok, driftCm: +(f.settleMax * 100).toFixed(1), tilt: +tilt.toFixed(4) });
      console.log('INFO  keep ' + g[0] + ' modules wide at the foot, ' + kh + ' courses (' + f2(kh * 0.12) + ' m): ' + (ok ? 'stands' : 'does not stand') + ', drift ' + (f.settleMax * 100).toFixed(1) + ' cm, tilt ' + tilt.toFixed(3));
      check('keep ' + g[0] + ' modules at the foot stands at ' + kh + ' courses (the Grand fort uses up to ' + SIM.FORT.KEEPCAP(g[0]) + ')', ok || kh > SIM.FORT.KEEPCAP(g[0]), '');
      ses.sim.dispose();
    });
  });
  results.numbers.note = 'Node on a shared cloud CPU, one thread, software only, plain (no SIMD) Rapier. These are not iPad numbers and not any real device.';
  fs.writeFileSync(path.join(__dirname, 'test_grand_results.json'), JSON.stringify(results, null, 1));
  console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.checks.length + ' checks)'); process.exit(fails ? 1 : 0);
}
main().catch(function (e) { console.error(e); process.exit(2); });
