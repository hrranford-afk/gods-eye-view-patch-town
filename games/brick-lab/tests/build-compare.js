/* Brick Lab: the three Rapier builds on the same scenes, in Node.   Run:  node tests/build-compare.js
   For each build: the determinism hash (3 runs), then per scene: sag, 10 s drift, asleep time, and the physics ms per step
   while five big marbles crumble it (avg / worst) and steps per second. Writes tests/build-compare.json.
   Node numbers are NOT iPad numbers (Harry's iPad physics was about twice as slow as this cloud core). */
'use strict';
var path = require('path'), fs = require('fs');
var BL = require(path.join(__dirname, '../sim.js'));
function now() { return Number(process.hrtime.bigint()) / 1e6; }
(async function () {
  var out = { when: new Date().toISOString(), node: process.version, builds: {} }, scenes = ['wall', 'cottage', 'castle', 'pile500', 'pile1000', 'pile2000'];
  console.log('SIMD in this Node: ' + BL.simdSupported());
  for (var key of ['014', '021', '021simd']) {
    var L = await BL.loadRapier(key), R = L.R, B = { label: L.label, loadMs: L.loadMs, hashes: [], scenes: {} };
    for (var i = 0; i < 3; i++) B.hashes.push(BL.detRun(R, 1234).hash);
    B.repeatable = B.hashes[0] === B.hashes[1] && B.hashes[1] === B.hashes[2];
    console.log('\nRapier ' + L.label + '  load ' + L.loadMs + ' ms  hashes ' + B.hashes.join(' ') + (B.repeatable ? '  (repeatable)' : '  NOT REPEATABLE'));
    for (var k of scenes) {
      var s = BL.makeSim(R), n = s.build(BL.PRESETS[k].make(0, -0.2)), t0, j;
      for (j = 0; j < 90; j++) s.step();
      var sag = s.maxDisp(); s.rebase(); var peak = 0, slept = -1, st = [];
      for (j = 1; j <= 600; j++) { t0 = now(); s.step(); st.push(now() - t0); if (j % 10 === 0) peak = Math.max(peak, s.maxDisp()); if (slept < 0 && s.awake() === 0) slept = j / 60; }
      var ts = [], f = { x: 0, y: 0.5, z: 3 };
      for (var q = 0; q < 5; q++) { s.addBall('big', f, BL.aimAt((q - 2) * 0.5, 0.8, -0.2, f, 15)); for (j = 0; j < 40; j++) { t0 = now(); s.step(); ts.push(now() - t0); } }
      for (j = 0; j < 280; j++) { t0 = now(); s.step(); ts.push(now() - t0); }
      var avg = ts.reduce(function (a, b) { return a + b; }, 0) / ts.length, sa = st.reduce(function (a, b) { return a + b; }, 0) / st.length;
      var r = { bodies: n, sagMm: +(sag * 200).toFixed(1), driftMm: +(peak * 200).toFixed(2), asleepAtS: slept, standAvgMs: +sa.toFixed(2), volleyAvgMs: +avg.toFixed(2), volleyWorstMs: +Math.max.apply(null, ts).toFixed(1), stepsPerSec: Math.round(1000 / avg), moved: s.countMoved() };
      B.scenes[k] = r; s.dispose();
      console.log('  ' + k + ' (' + n + '): sag ' + r.sagMm + ' mm, drift ' + r.driftMm + ' mm, asleep ' + slept + ' s, standing ' + r.standAvgMs + ' ms, volley avg/worst ' + r.volleyAvgMs + '/' + r.volleyWorstMs + ' ms, ' + r.stepsPerSec + ' steps/s, moved ' + r.moved);
    }
    out.builds[key] = B;
  }
  fs.writeFileSync(path.join(__dirname, 'build-compare.json'), JSON.stringify(out, null, 1));
})().catch(function (e) { console.error(e); process.exit(1); });
