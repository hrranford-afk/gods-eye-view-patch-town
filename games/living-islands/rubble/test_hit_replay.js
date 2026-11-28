/* Rubble "Replay the hit" test: the button appears only when the bell has fallen (Topple) or on three stars (Keep); the replay runs the early shots fast, plays the last shot at a quarter speed with a close camera,
   then catches up so the scene ends in exactly the state it was in (same hash at the same step) and the camera goes back to where you had it. Slow motion happens only there.
   Run:  NODE_PATH=$(npm root -g) node test_hit_replay.js */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '..'), MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.bin': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg' };
var pw; try { pw = require('playwright'); } catch (e) { console.error('playwright not found: run with NODE_PATH=$(npm root -g)'); process.exit(2); }
var fails = 0, results = [];
function check(n, ok, d) { results.push({ name: n, ok: !!ok, detail: d }); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? '   [' + d + ']' : '')); }
var server = http.createServer(function (req, res) {
  var u = decodeURIComponent(req.url.split('?')[0]), f = path.join(ROOT, u); if (f.indexOf(ROOT) !== 0) { res.writeHead(403); return res.end(); }
  fs.readFile(f, function (e, b) { if (e) { res.writeHead(404); return res.end('no'); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(b); });
});
async function main() {
  await new Promise(function (r) { server.listen(0, '127.0.0.1', r); });
  var port = server.address().port, base = 'http://127.0.0.1:' + port + '/rubble/index.html', shots = path.join(__dirname, 'shots');
  var browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'] });
  var ctx = await browser.newContext({ viewport: { width: 834, height: 1062 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }), page = await ctx.newPage(), errs = [];
  page.on('console', function (m) { if (m.type() === 'error') errs.push('console: ' + m.text()); }); page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  async function load(q) { await page.goto(base + q, { waitUntil: 'load' }); await page.waitForFunction('window.__rubble && window.__rubble.ses && window.__rubble.ses.sim && !window.__rubble.ses.settling', null, { timeout: 400000 }); await page.waitForTimeout(1500); }
  var src = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  var uses = src.split('replaySpeed').length - 1, inReplayBranch = /else \{ acc \+= dt \* replaySpeed; while \(acc >= DT && n < 3 && ses\.replay\)/.test(src);
  check('slow motion is only in the replay: the quarter speed is used in one place, the replay branch of the loop (' + uses + ' mentions: its definition, that branch, and the test hook)', inReplayBranch && uses <= 3, uses + ' mentions');
  /* Topple */
  await load('?tier=radeon&pieces=250');
  var b0 = await page.evaluate(function () { var r = window.__rubble; return { shown: r.hitShown(), live: r.P.steps.slice(-8), btn: document.getElementById('hitReplay').textContent }; });
  var liveAvg = b0.live.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, b0.live.length);
  check('before the bell falls there is no Replay the hit button', !b0.shown, JSON.stringify(b0));
  for (var q = 0; q < 30; q++) { var dn = await page.evaluate(function () { return window.__rubble.ses.bellDown; }); if (dn) break; await page.evaluate(function () { window.__rubble.setAmmo('rod'); window.__rubble.fire('rod', 1); }); await page.waitForTimeout(2200); }
  await page.waitForFunction('window.__rubble.hitShown()', null, { timeout: 60000 }); await page.waitForTimeout(1500);
  var pre = await page.evaluate(function () { var r = window.__rubble, s = r.ses; return { hash: s.sim.hash(), steps: s.sim.steps, down: s.bellDown, at: s.bellDownAt, shots: s.events.filter(function (e) { return e.t === 'shot'; }).length, orb: { az: r.orb.az, el: r.orb.el, dist: r.orb.dist, tx: r.orb.tx, ty: r.orb.ty, tz: r.orb.tz }, txt: document.getElementById('hitReplay').textContent }; });
  check('the bell is down (' + pre.shots + ' shots) and the gold Replay the hit button is on show', pre.down && /Replay the hit/.test(pre.txt), JSON.stringify(pre));
  await page.screenshot({ path: path.join(shots, 'rubble-33-hit-button.png') });
  var shown = await page.evaluate(function () { var e = document.getElementById('hitReplay'), r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), on: r.right <= innerWidth && r.left >= 0 && r.bottom <= innerHeight }; });
  check('the button is at least 44 px and on screen', shown.w >= 44 && shown.h >= 44 && shown.on, JSON.stringify(shown));
  await page.click('#hitReplay');
  var phases = [], slowSample = null, t0 = Date.now(), shotDone = false;
  while (Date.now() - t0 < 420000) {
    var h = await page.evaluate(function () { var r = window.__rubble, h = r.hit(); if (!h) return null; h.avg = r.P.steps.slice(-8).reduce(function (a, b) { return a + b; }, 0) / Math.max(1, r.P.steps.slice(-8).length); h.btn = document.getElementById('hitReplay').textContent; h.status = document.getElementById('status').textContent; h.drawer = document.getElementById('drawer').classList.contains('open'); return h; });
    if (!h) break;
    if (phases[phases.length - 1] !== h.phase) phases.push(h.phase);
    if (h.phase === 'slow' && !h.ff && h.steps > h.seekTo + 12 && !slowSample) { slowSample = h; await page.screenshot({ path: path.join(shots, 'rubble-34-hit-replay-slow.png') }); }
    await page.waitForTimeout(400);
  }
  var post = await page.evaluate(function () { var r = window.__rubble, s = r.ses; return { hash: s.sim.hash(), steps: s.sim.steps, rep: !!s.replay, last: s.lastReplay, down: s.bellDown, at: s.bellDownAt, orb: { az: r.orb.az, el: r.orb.el, dist: r.orb.dist, tx: r.orb.tx, ty: r.orb.ty, tz: r.orb.tz }, shown: r.hitShown(), txt: document.getElementById('hitReplay').textContent }; });
  check('the replay ran in two parts: fast to the last shot, then slow (phases: ' + phases.join(' > ') + '), and only the last shot is slow (seek to ' + (slowSample && slowSample.seekTo) + ', shot at ' + (slowSample && slowSample.shotStep) + ', slow part ends ' + (slowSample && slowSample.stopAt) + ')',
    phases[0] === 'seek' && phases.indexOf('slow') > 0 && slowSample && slowSample.shotStep - slowSample.seekTo <= 24 && slowSample.stopAt - slowSample.shotStep <= 400 && slowSample.seekTo > 30, JSON.stringify(slowSample));
  check('in the slow part the physics runs at a quarter speed: about ' + (slowSample && slowSample.avg.toFixed(2)) + ' steps a frame against ' + liveAvg.toFixed(2) + ' when live (at most 1.6 against at least 2)', slowSample && slowSample.avg <= 1.6 && liveAvg >= 2 && slowSample.speed === 0.25, JSON.stringify([slowSample && slowSample.avg, liveAvg, slowSample && slowSample.speed]));
  check('the close camera comes in (' + (slowSample && slowSample.dist.toFixed(1)) + ' m from ' + pre.orb.dist.toFixed(1) + ' m), the button turned into Skip replay, the drawer was put away', slowSample && slowSample.dist < pre.orb.dist * 0.85 && /Skip/.test(slowSample.btn) && !slowSample.drawer, JSON.stringify(slowSample && { d: slowSample.dist, b: slowSample.btn, dr: slowSample.drawer }));
  var sameCam = Math.abs(post.orb.az - pre.orb.az) < 1e-6 && Math.abs(post.orb.dist - pre.orb.dist) < 1e-6 && Math.abs(post.orb.tx - pre.orb.tx) < 1e-6 && Math.abs(post.orb.ty - pre.orb.ty) < 1e-6;
  check('afterwards the camera is back where you had it, the replay ended on the same hash as the live game had at the same step (' + (post.last && post.last.got) + ' at step ' + (post.last && post.last.steps) + '), and the button is back', !post.rep && post.last && post.last.ok && post.last.steps >= pre.steps && sameCam && post.shown && /Replay the hit/.test(post.txt), JSON.stringify({ pre: pre.hash + '@' + pre.steps, post: post.hash + '@' + post.steps, last: post.last, sameCam: sameCam }));
  /* Skip works */
  await page.click('#hitReplay'); await page.waitForFunction('window.__rubble.hit() && window.__rubble.hit().phase === "slow"', null, { timeout: 300000 });
  await page.click('#hitReplay'); await page.waitForFunction('!window.__rubble.hit()', null, { timeout: 120000 });
  var sk = await page.evaluate(function () { var s = window.__rubble.ses; return { hash: s.sim.hash(), ok: s.lastReplay && s.lastReplay.ok, exp: s.lastReplay && s.lastReplay.expected }; });
  check('Skip replay catches up at once and lands in the same state (hash ' + sk.exp + ')', !!sk.ok, JSON.stringify(sk));
  /* Keep: three stars */
  await load('?tier=radeon&mode=keep&pieces=1000&shots=6');
  var kb0 = await page.evaluate(function () { return window.__rubble.hitShown(); });
  await page.evaluate(function () { var r = window.__rubble; r.setAmmo('coconut'); r.fire('coconut', 2); });
  await page.waitForTimeout(4000);
  await page.evaluate(function () { var r = window.__rubble; r.ses.keepState = function () { return { shots: 2, left: 4, percent: 85, knocked: 100, outer: 118, bellUp: true, stars: 3, over: 'result' }; }; });
  await page.waitForFunction('document.getElementById("keepEnd").style.display === "block" && window.__rubble.hitShown()', null, { timeout: 60000 });
  var kpre = await page.evaluate(function () { var s = window.__rubble.ses; return { hash: s.sim.hash(), steps: s.sim.steps, orb: window.__rubble.orb.dist }; });
  await page.screenshot({ path: path.join(shots, 'rubble-35-keep-three-stars.png') });
  await page.click('#hitReplay');
  var kph = [], tk = Date.now();
  while (Date.now() - tk < 300000) { var kh = await page.evaluate(function () { var r = window.__rubble, h = r.hit(); return h ? { phase: h.phase, ke: document.getElementById('keepEnd').style.display } : null; }); if (!kh) break; if (kph[kph.length - 1] !== kh.phase + '/' + kh.ke) kph.push(kh.phase + '/' + kh.ke); await page.waitForTimeout(400); }
  var kpost = await page.evaluate(function () { var s = window.__rubble.ses; return { hash: s.sim.hash(), steps: s.sim.steps, ok: s.lastReplay && s.lastReplay.ok, exp: s.lastReplay && s.lastReplay.expected, ke: document.getElementById('keepEnd').style.display }; });
  check('Keep, three stars: no button before (' + kb0 + '), the replay of the last shot runs (' + kph.join(' > ') + '), the result card is hidden during it and back after, same hash at the same step', !kb0 && kph.length >= 2 && /none/.test(kph[0]) && kpost.ok && kpost.steps >= kpre.steps && kpost.ke === 'block', JSON.stringify({ kpre: kpre, kpost: kpost }));
  check('zero console errors and zero page errors (replay-the-hit test)', errs.length === 0, errs.slice(0, 5).join(' | '));
  await browser.close(); server.close();
  fs.writeFileSync(path.join(__dirname, 'test_hit_replay_results.json'), JSON.stringify({ when: new Date().toISOString(), results: results, errors: errs }, null, 1));
  console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.length + ' checks)'); process.exit(fails ? 1 : 0);
}
main().catch(function (e) { console.error(e); try { server.close(); } catch (x) { } process.exit(2); });
