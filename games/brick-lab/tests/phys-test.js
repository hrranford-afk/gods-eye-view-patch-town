/* Brick Lab physics tests (no browser).  Run:  NODE_PATH=$(npm root -g) node tests/phys-test.js
   Uses vendor/rapier/rapier.cjs.js and sim.js.  Writes tests/phys-results.json. */
'use strict';
var path = require('path'), fs = require('fs');
var R = require(path.join(__dirname, '../vendor/rapier/rapier.cjs.js'));
var BL = require(path.join(__dirname, '../sim.js'));
var MM = BL.UNIT_MM, results = { when: new Date().toISOString(), node: process.version, checks: [], numbers: {} }, fails = 0;

function check(name, ok, detail) { results.checks.push({ name: name, ok: !!ok, detail: detail }); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '   [' + detail + ']' : '')); }
function now() { return Number(process.hrtime.bigint()) / 1e6; }
function mm(u) { return (u * MM).toFixed(2) + ' mm'; }

/* the same fixed volley the browser benchmark fires, from the front of the table (z = +3), at the middle of the structure */
var aimAt = BL.aimAt;

async function main() {
  await R.init();

  /* 1. a wall of 120 bricks stands still for 10 simulated seconds */
  (function () {
    var s = BL.makeSim(R); s.build(BL.PRESETS.wall.make(0, 0));
    for (var i = 0; i < 90; i++) s.step();
    var sag = s.maxDisp(); s.rebase();
    var peak = 0, firstSleep = -1;
    for (i = 1; i <= 600; i++) { s.step(); if (i % 10 === 0) peak = Math.max(peak, s.maxDisp()); if (firstSleep < 0 && s.awake() === 0) firstSleep = i / 60; }
    results.numbers.wall = { bodies: s.pieces.length, settleSagMm: +(sag * MM).toFixed(2), standMaxDispMm: +(peak * MM).toFixed(3), sleptAtS: firstSleep };
    check('wall of ' + s.pieces.length + ' bricks stands still 10 s (max displacement < 2 mm equivalent)', s.pieces.length === 120 && peak * MM < 2, 'max ' + mm(peak) + ' after the first 1.5 s settle; the settle itself sagged ' + mm(sag));
    s.dispose();
  })();

  /* 1b. every preset, same stand-still test (reported; not all are expected to stay under 2 mm) */
  results.numbers.presets = {};
  ['wall', 'tower', 'cottage', 'castle'].forEach(function (k) {
    var s = BL.makeSim(R); var n = s.build(BL.PRESETS[k].make(0, 0));
    for (var i = 0; i < 90; i++) s.step();
    var sag = s.maxDisp(); s.rebase(); var peak = 0, slept = -1;
    for (i = 1; i <= 600; i++) { s.step(); if (i % 10 === 0) peak = Math.max(peak, s.maxDisp()); if (slept < 0 && s.awake() === 0) slept = i / 60; }
    results.numbers.presets[k] = { bodies: n, settleSagMm: +(sag * MM).toFixed(1), standMaxDispMm: +(peak * MM).toFixed(2), allAsleepAtS: slept };
    check(BL.PRESETS[k].name + ' (' + n + ' pieces) stands still 10 s: displacement under 2 mm equivalent', peak * MM < 2, 'max ' + mm(peak) + ', sag in settle ' + mm(sag) + ', all asleep at ' + (slept < 0 ? 'not within 10 s' : slept.toFixed(1) + ' s'));
    s.dispose();
  });

  /* 1c. the three stress blocks: stand-still, then a volley of five big marbles; cost reported, stand-still NOT asserted (honest) */
  results.numbers.stress = {};
  ['pile500', 'pile1000', 'pile2000'].forEach(function (k) {
    var s = BL.makeSim(R), n = s.build(BL.PRESETS[k].make(0, -0.2)), i, t0;
    for (i = 0; i < 90; i++) s.step();
    var sag = s.maxDisp(); s.rebase(); var peak = 0, slept = -1; t0 = now();
    for (i = 1; i <= 600; i++) { s.step(); if (i % 10 === 0) peak = Math.max(peak, s.maxDisp()); if (slept < 0 && s.awake() === 0) slept = i / 60; }
    var standMs = (now() - t0) / 600, ts = [], f = { x: 0, y: 0.5, z: 3 };
    for (var q = 0; q < 5; q++) { s.addBall('big', f, aimAt((q - 2) * 0.5, 0.8, -0.2, f, 15)); for (i = 0; i < 40; i++) { t0 = now(); s.step(); ts.push(now() - t0); } }
    for (i = 0; i < 280; i++) { t0 = now(); s.step(); ts.push(now() - t0); }
    var avg = ts.reduce(function (a, b) { return a + b; }, 0) / ts.length;
    results.numbers.stress[k] = { bodies: n, settleSagMm: +(sag * MM).toFixed(1), standMaxDispMm: +(peak * MM).toFixed(2), allAsleepAtS: slept, standMsPerStep: +standMs.toFixed(2), volleyAvgMs: +avg.toFixed(2), volleyMaxMs: +Math.max.apply(null, ts).toFixed(1), moved: s.countMoved() };
    console.log('  ' + n + ' block: sag ' + mm(sag) + ', 10 s drift ' + mm(peak) + ', asleep at ' + slept + ' s, standing ' + standMs.toFixed(1) + ' ms/step, volley avg ' + avg.toFixed(1) + ' max ' + Math.max.apply(null, ts).toFixed(0) + ' ms, moved ' + s.countMoved());
    check(BL.PRESETS[k].name + ' builds with the expected size', n > 400 && n < 2100, n + ' bodies');
    s.dispose();
  });

  /* 2. a ball at fixed speed topples it */
  results.numbers.hits = {};
  [['marble', 14], ['big', 12], ['big', 16], ['big', 20], ['big', 24], ['acorn', 14]].forEach(function (c) {
    var s = BL.makeSim(R); s.build(BL.PRESETS.wall.make(0, 0)); s.settle(90);
    var from = { x: 0, y: 0.5, z: 3 }, v = aimAt(0, 0.85, 0, from, c[1]);
    var b = s.addBall(c[0], from, v); var t0 = now(), peak = 0;
    for (var i = 0; i < 360; i++) { s.step(); }
    var moved = s.countMoved(), top = 0, n = 0;
    s.pieces.forEach(function (p) { top = Math.max(top, p.body.translation().y); });
    results.numbers.hits[c[0] + '@' + c[1]] = { piecesMoved: moved, of: s.pieces.length, highestPieceY: +top.toFixed(2) };
    console.log('  ' + c[0] + ' at ' + c[1] + ' u/s: ' + moved + ' of ' + s.pieces.length + ' bricks moved more than 30 mm eq, highest brick now ' + top.toFixed(2) + ' (was 1.34)');
    s.dispose();
  });
  /* a volley of three big marbles, 0.6 s apart, at the left, middle and right of the wall */
  (function () {
    var s = BL.makeSim(R); s.build(BL.PRESETS.wall.make(0, 0)); s.settle(90);
    var from = { x: 0, y: 0.5, z: 3 };
    for (var k = 0; k < 3; k++) { s.addBall('big', from, aimAt((k - 1) * 1.1, 0.8, 0, from, 16)); for (var i = 0; i < 36; i++) s.step(); }
    for (i = 0; i < 360; i++) s.step();
    var moved = s.countMoved(), low = 0;
    s.pieces.forEach(function (p) { if (p.body.translation().y < 0.3) low++; });
    results.numbers.volley = { piecesMoved: moved, of: s.pieces.length, onTheTable: low };
    console.log('  volley of 3 big marbles at 16 u/s: ' + moved + ' of ' + s.pieces.length + ' bricks moved, ' + low + ' now lie low (y < 0.3)');
    check('one big marble at 16 u/s knocks a breach (15 or more of 120 bricks moved)', results.numbers.hits['big@16'].piecesMoved >= 15, results.numbers.hits['big@16'].piecesMoved + ' moved');
    check('a volley of three big marbles brings most of the wall down (60 or more of 120 bricks moved)', moved >= 60, moved + ' moved');
    s.dispose();
  })();
  check('a small marble at 14 u/s moves some bricks but only a few (honest: lighter shot, smaller effect)', results.numbers.hits['marble@14'].piecesMoved >= 1 && results.numbers.hits['marble@14'].piecesMoved < 30, results.numbers.hits['marble@14'].piecesMoved + ' moved');

  /* 3. determinism: same seed, same steps, twice (and three times) */
  function run(seed) { return BL.detRun(R, seed); }
  var a = run(1234), b2 = run(1234), c2 = run(1234), d = run(99);
  check('determinism: same seed, same steps, 3 runs, identical hash and identical positions to 1e-9', a.hash === b2.hash && b2.hash === c2.hash && a.exact === b2.exact && b2.exact === c2.exact, a.hash + ' / ' + b2.hash + ' / ' + c2.hash);
  check('a different seed gives a different result (the hash is not trivially constant)', d.hash !== a.hash, d.hash + ' vs ' + a.hash);
  results.numbers.determinism = { runs: [a.hash, b2.hash, c2.hash], differentSeed: d.hash, note: 'same machine, same wasm binary, same Node. Cross-device (iPad vs this machine) identity is NOT tested.' };

  /* 4. cost: steps per second in Node for 120/250/400/1000 bodies */
  function bigScene(target) {
    var s = BL.makeSim(R), list = [];
    if (target <= 120) list = BL.PRESETS.wall.make(0, 0);
    else if (target <= 250) list = BL.PRESETS.cottage.make(0, 0);
    else if (target <= 400) list = BL.PRESETS.castle.make(0, 0);
    else { for (var w = 0; w < 8; w++) list = list.concat(BL.PRESETS.wall.make(0, -2.5 + w * 0.72)); for (var q = 0; q < 40; q++) list.push({ t: 'brick', x: -1.8 + (q % 10) * 0.36, y: 0.06 + Math.floor(q / 10) * 0.12, z: 2.95, q: [0, 0, 0, 1] }); }
    s.build(list); return s;
  }
  results.numbers.cost = {};
  [120, 250, 400, 1000].forEach(function (target) {
    var s = bigScene(target), n = s.pieces.length, i, t0, ms;
    t0 = now(); for (i = 0; i < 90; i++) s.step(); var settleMs = (now() - t0) / 90;
    s.rebase();
    /* a: everything awake and still (first seconds after a build, before sleeping) */
    var awakeSteps = 0, awakeT = 0;
    for (i = 0; i < 300 && s.awake() > 0; i++) { t0 = now(); s.step(); awakeT += now() - t0; awakeSteps++; }
    s.sleepAll(); t0 = now(); for (i = 0; i < 300; i++) s.step(); var sleepMs = (now() - t0) / 300;
    /* b: collapse: three big marbles at the middle, measure 360 steps after the first shot */
    var times = [], mx = 0, aw = 0;
    var from = { x: 0, y: 0.5, z: 3 };
    for (var k = 0; k < 3; k++) s.addBall('big', { x: from.x + (k - 1) * 0.5, y: 0.5 + k * 0.2, z: 3 }, aimAt((k - 1) * 0.6, 0.6 + k * 0.2, k === 1 ? 0 : 0, from, 16));
    for (i = 0; i < 360; i++) { t0 = now(); s.step(); var d2 = now() - t0; times.push(d2); aw = Math.max(aw, s.awake()); }
    var avg = times.reduce(function (x, y) { return x + y; }, 0) / times.length; mx = Math.max.apply(null, times);
    var sorted = times.slice().sort(function (x, y) { return x - y; }), p95 = sorted[Math.floor(sorted.length * 0.95)];
    var moved = s.countMoved();
    results.numbers.cost[target] = { bodies: n, settleMsPerStep: +settleMs.toFixed(3), sleepingMsPerStep: +sleepMs.toFixed(3), collapseAvgMs: +avg.toFixed(3), collapseP95Ms: +p95.toFixed(3), collapseMaxMs: +mx.toFixed(3), collapseStepsPerSec: Math.round(1000 / avg), peakAwake: aw, piecesMoved: moved };
    console.log('  ' + n + ' bodies: asleep ' + sleepMs.toFixed(3) + ' ms/step, first settle ' + settleMs.toFixed(2) + ', collapse avg ' + avg.toFixed(2) + ' ms (p95 ' + p95.toFixed(2) + ', max ' + mx.toFixed(2) + '), ' + Math.round(1000 / avg) + ' steps/s, peak awake ' + aw + ', moved ' + moved);
    s.dispose();
  });
  check('cost table produced for 120/250/400/1000 bodies', Object.keys(results.numbers.cost).length === 4);

  /* 5. sleeping works */
  (function () {
    var s = BL.makeSim(R); s.build(BL.PRESETS.tower.make(0, 0));
    var slept = -1;
    for (var i = 1; i <= 1800 && slept < 0; i++) { s.step(); if (s.awake() === 0) slept = i / 60; }
    check('bodies fall asleep by themselves when still (tower, ' + s.pieces.length + ' pieces)', slept > 0, slept > 0 ? 'all asleep after ' + slept.toFixed(1) + ' s' : 'not within 30 s');
    var h0 = s.hash(); for (i = 0; i < 120; i++) s.step();
    check('sleeping bodies do not move at all (hash unchanged over 2 s)', s.hash() === h0);
    var t0 = now(); for (i = 0; i < 300; i++) s.step(); var sleepMs = (now() - t0) / 300;
    s.addBall('big', { x: 0, y: 0.5, z: 3 }, aimAt(0, 0.5, 0, { x: 0, y: 0.5, z: 3 }, 14));
    var woke = false; for (i = 0; i < 40 && !woke; i++) { s.step(); if (s.awake() > 5) woke = true; }
    check('a ball hitting a sleeping tower wakes it', woke, 'awake after hit: ' + s.awake());
    var t1 = now(); for (i = 0; i < 120; i++) s.step(); var awakeMs = (now() - t1) / 120;
    results.numbers.sleep = { tower: s.pieces.length, sleepingMsPerStep: +sleepMs.toFixed(3), afterHitMsPerStep: +awakeMs.toFixed(3) };
    check('a sleeping scene costs far less than an awake one', sleepMs * 4 < awakeMs, sleepMs.toFixed(3) + ' ms vs ' + awakeMs.toFixed(3) + ' ms per step');
    s.dispose();
  })();

  /* 6. a base as text and back gives the same pieces */
  (function () {
    var list = BL.PRESETS.cottage.make(0, 0), txt = BL.toText(list), back = BL.fromText(txt);
    var s1 = BL.makeSim(R), s2 = BL.makeSim(R); s1.build(list); s2.build(back);
    for (var i = 0; i < 90; i++) { s1.step(); s2.step(); }
    check('a base saved as text (3 decimals) loads back to the same shape (' + txt.length + ' bytes for ' + list.length + ' pieces)', back.length === list.length && Math.abs(Number(s1.maxDisp()) - Number(s2.maxDisp())) < 0.05, 'text bytes ' + txt.length);
    results.numbers.textBytes = { cottagePieces: list.length, bytes: txt.length };
    s1.dispose(); s2.dispose();
  })();

  fs.writeFileSync(path.join(__dirname, 'phys-results.json'), JSON.stringify(results, null, 1));
  console.log(fails ? ('\n' + fails + ' FAILED') : '\nall passed');
  process.exit(fails ? 1 : 0);
}
main().catch(function (e) { console.error(e); process.exit(2); });
