/* Rubble juice test: dust, chips, camera shake, bell rings, confetti, pop-ups, flash, the Juice switch (on in Pretty, off in Plain), nothing allocated per frame,
   and the cost on the iPad tier at 4,000 pieces (draw calls and triangles with the juice idle and busy). Run:  NODE_PATH=$(npm root -g) node test_juice.js */
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
  var port = server.address().port, base = 'http://127.0.0.1:' + port + '/rubble/index.html';
  var browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist', '--js-flags=--expose-gc', '--enable-precise-memory-info'] });
  var ctx = await browser.newContext({ viewport: { width: 834, height: 1062 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }), page = await ctx.newPage(), errs = [];
  page.on('console', function (m) { if (m.type() === 'error') errs.push('console: ' + m.text()); }); page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  async function load(q) { await page.goto(base + q, { waitUntil: 'load' }); await page.waitForFunction('window.__rubble && window.__rubble.ses && window.__rubble.ses.sim && !window.__rubble.ses.settling', null, { timeout: 400000 }); await page.waitForTimeout(1500); }
  /* the source: no per-frame allocation in the hot functions */
  var src = fs.readFileSync(path.join(__dirname, 'juice.js'), 'utf8');
  function body(name) { var i = src.indexOf(name + ' = function'), d = 0, j, started = false; for (j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') { d++; started = true; } if (src[j] === '}') { d--; if (started && d === 0) break; } } return src.slice(i, j + 1); }
  var hot = ['J.probe', 'J.update', 'J.applyShake'].map(body).join('\n');
  check('juice.js hot paths (probe, update, applyShake) contain no new, no array or object literals, no closures', !/\bnew\b|=\s*\[|\(\s*\[|=\s*\{|function\s*\(/.test(hot.replace(/J\.\w+ = function \(/g, '')), (hot.match(/\bnew\b|=\s*\[|=\s*\{/g) || []).join(','));
  /* 1. Pretty: juice on by default, a real volley makes dust and chips */
  await load('?tier=radeon&pieces=400');
  var d0 = await page.evaluate(function () { var r = window.__rubble; return { on: r.juice.on, shake: r.juice.shakeOn, btn: document.getElementById('juice').textContent, pretty: r.look(), objs: !!r.juice.objects.points && !!r.juice.objects.rings, hidden: !r.juice.objects.points.visible && !r.juice.objects.rings.visible }; });
  check('Juice is on by default in the Pretty look (button says so), both effect objects exist and are hidden while idle', d0.on && d0.pretty && /on/.test(d0.btn) && d0.objs && d0.hidden, JSON.stringify(d0));
  await page.evaluate(function () { var r = window.__rubble; r.setAmmo('coconut'); r.fire('coconut', 1); r.fire('rod', 2); });
  await page.waitForFunction('window.__rubble.juice.stats.events >= 2', null, { timeout: 120000 });
  var s1 = await page.evaluate(function () { return window.__rubble.juice.stats; });
  check('real shots make impact events: dust and brick chips spawned (' + s1.events + ' impacts, ' + s1.spawned + ' particles)', s1.events >= 2 && s1.spawned >= 10, JSON.stringify(s1));
  /* 2. the pool is capped, however many are asked for; the particle count never passes the cap */
  var cap = await page.evaluate(async function () {
    var r = window.__rubble, J = r.juice, d = r.ses.sim.fort.design, i, wait = function (ms) { return new Promise(function (x) { setTimeout(x, ms); }); }, mx = 0;
    for (i = 0; i < 60; i++) { J.dust(d.cx, d.baseY + 1, d.cz, 1, false); J.chips(d.cx, d.baseY + 1, d.cz, 1, .8, .4, .2); J.confetti(d.cx, d.baseY + 2, d.cz, 140); }
    for (i = 0; i < 8; i++) { await wait(120); mx = Math.max(mx, J.live().particles); }
    return { max: mx, cap: window.RJuice.NP, rings: window.RJuice.NR };
  });
  check('particle pool is capped at ' + cap.cap + ' (most seen live: ' + cap.max + ') after asking for 60 x (dust + chips + 140 confetti)', cap.max <= cap.cap && cap.max > 50, JSON.stringify(cap));
  /* 3. camera shake: small, short, and off in its setting */
  var sh = await page.evaluate(async function () {
    var r = window.__rubble, J = r.juice, wait = function (ms) { return new Promise(function (x) { setTimeout(x, ms); }); }, out = {};
    await wait(1500); J.shake(0.06); var base = { x: r.cam.position.x, y: r.cam.position.y, z: r.cam.position.z }; out.live0 = J.live().shake;
    await wait(1200); out.after = J.live().shake;
    var mx = 0, k; J.shake(0.06); for (k = 0; k < 6; k++) { await wait(80); mx = Math.max(mx, J.live().shake); } out.peak = mx;
    document.getElementById('shake').click(); out.btnOff = document.getElementById('shake').textContent; await wait(1500); J.shake(0.06); await wait(300); out.offLive = J.live().shake; document.getElementById('shake').click(); out.btnOn = document.getElementById('shake').textContent;
    return out;
  });
  check('camera shake: starts at 0.06 m at most, fades to nothing within about a second, and the Camera shake switch turns it off', sh.live0 <= 0.06 + 1e-6 && sh.live0 > 0 && sh.after < 0.005 && sh.offLive === 0 && /off/.test(sh.btnOff) && /on/.test(sh.btnOn), JSON.stringify(sh));
  /* 4. nothing is allocated per frame: after warm-up and a gc, 3000 frames of particles, rings and shake playing out move the heap by under 100 KB */
  var heap = await page.evaluate(async function () {
    var r = window.__rubble, J = r.juice, d = r.ses.sim.fort.design, b = r.ses.sim.fort.bells[0], i, h0, h1, sink = 0;
    J.confetti(d.cx, d.baseY + 2, d.cz, 140); J.bellRing(b.cx, b.cy, b.cz, true); J.dust(d.cx, d.baseY + 1, d.cz, 1, false);
    for (i = 0; i < 8000; i++) { J.update(0.0002, 1062, i * 0.001); J.applyShake(0.001); if (i % 400 === 0) { J.confetti(d.cx, d.baseY + 2, d.cz, 140); J.bellRing(b.cx, b.cy, b.cz, true); J.shake(0.03); } }       /* warm up: the first thousand calls run in the interpreter, which boxes numbers */
    if (window.gc) window.gc(); h0 = performance.memory.usedJSHeapSize;
    J.confetti(d.cx, d.baseY + 2, d.cz, 140); J.bellRing(b.cx, b.cy, b.cz, true); J.dust(d.cx, d.baseY + 1, d.cz, 1, false); J.shake(0.06);       /* an effect starts (that call may allocate: it is per event, not per frame) ... */
    if (window.gc) window.gc(); h0 = performance.memory.usedJSHeapSize;
    var dt = 0.00005, vh = 1062, nw = 1.5;       /* constants, so the test loop itself allocates nothing */
    for (i = 0; i < 3000; i++) { J.update(dt, vh, nw); J.applyShake(dt); }       /* ... and 3000 frames of it playing out allocate nothing */
    h1 = performance.memory.usedJSHeapSize; return { grew: h1 - h0, gc: !!window.gc };
  });
  check('no per-frame allocation: the heap grew ' + Math.round(heap.grew / 1024) + ' KB over 3000 busy updates (limit 100 KB, steady state after warm-up, forced gc first: ' + heap.gc + ')', heap.gc && heap.grew < 100 * 1024, JSON.stringify(heap));
  /* 5. a bell: rods at it bring it down; ring waves, confetti, a pop-up and the flash follow (Topple) */
  await page.evaluate(function () { window.__rubble.build(400, true); });
  await page.waitForFunction('!window.__rubble.ses.settling && window.__rubble.ses.sim.steps === 0 || (!window.__rubble.ses.settling && window.__rubble.ses.events.length === 0)', null, { timeout: 120000 }); await page.waitForTimeout(1500);
  var st0 = await page.evaluate(function () { var s = Object.assign({}, window.__rubble.juice.stats); return s; });
  for (var q = 0; q < 20; q++) { var dn = await page.evaluate(function () { return window.__rubble.ses.bellDown; }); if (dn) break; await page.evaluate(function () { window.__rubble.fire('rod', 1); }); await page.waitForTimeout(2200); }
  await page.waitForTimeout(1500);
  var bd = await page.evaluate(function () { var r = window.__rubble; return { down: r.ses.bellDown, st: r.juice.stats, pop: Array.prototype.map.call(document.querySelectorAll('.pop.go'), function (e) { return e.textContent; }), flash: document.getElementById('flash').classList.contains('go') }; });
  check('the bell falls in Topple: ring waves (' + (bd.st.rings - st0.rings) + '), confetti (' + (bd.st.confetti - st0.confetti) + '), a screen flash (' + (bd.st.flashes - st0.flashes) + ') and a pop-up (' + bd.pop.join(',') + ')', bd.down && bd.st.rings - st0.rings >= 3 && bd.st.confetti - st0.confetti >= 60 && bd.st.flashes - st0.flashes >= 1 && bd.pop.some(function (t) { return /Bell down/.test(t); }), JSON.stringify(bd));
  var pc = await page.evaluate(function () { return { pops: window.__rubble.juice.stats.pops }; });
  check('score pop-ups appear as the knocked-out percent climbs (' + pc.pops + ' pop-ups so far)', pc.pops >= 1, JSON.stringify(pc));
  /* 6. Keep mode: three stars make confetti and a flash, a bell lost does not */
  await load('?tier=radeon&mode=keep&pieces=1000&shots=6');
  var kf0 = await page.evaluate(function () { return Object.assign({}, window.__rubble.juice.stats); });
  await page.evaluate(function () { var r = window.__rubble, f = r.ses.sim.fort; r.ses.keepState = function (mx) { return { shots: 3, left: 3, percent: 80, knocked: 100, outer: 120, bellUp: true, stars: 3, over: 'result' }; }; });
  await page.waitForFunction('document.getElementById("keepEnd").style.display === "block"', null, { timeout: 60000 });
  var kf = await page.evaluate(function () { return { st: window.__rubble.juice.stats, txt: document.getElementById('keepEnd').innerText.replace(/\n/g, ' ') }; });
  check('Keep the bell, three stars: confetti (' + (kf.st.confetti - kf0.confetti) + ') and a flash (' + (kf.st.flashes - kf0.flashes) + ') come with the result card', kf.st.confetti - kf0.confetti >= 60 && kf.st.flashes - kf0.flashes === 1 && /still standing/.test(kf.txt), JSON.stringify(kf));
  /* 7. Plain look: juice off, no particles made by real hits, button says off; Pretty back: on again */
  await load('?tier=radeon&pieces=400&look=plain');
  var pl = await page.evaluate(function () { var r = window.__rubble; return { on: r.juice.on, btn: document.getElementById('juice').textContent }; });
  await page.evaluate(function () { var r = window.__rubble; r.setAmmo('rod'); r.fire('rod', 2); }); await page.waitForTimeout(9000);
  var pl2 = await page.evaluate(function () { var r = window.__rubble, s = r.juice.stats, o = { ev: s.events, sp: s.spawned, vis: r.juice.objects.points.visible || r.juice.objects.rings.visible, ev0: r.ses.events.length }; r.applyLook(true); o.onAgain = r.juice.on; return o; });
  check('Plain look: Juice is off (button: ' + pl.btn + '), real hits make no effects, and switching to Pretty turns it on', !pl.on && /off/.test(pl.btn) && pl2.ev === 0 && pl2.sp === 0 && !pl2.vis && pl2.onAgain, JSON.stringify([pl, pl2]));
  /* 8. the cost on the iPad tier at 4,000 pieces */
  await load('?tier=ipad&pieces=4000&shape=castle');
  var cost = await page.evaluate(async function () {
    var r = window.__rubble, J = r.juice, d = r.ses.sim.fort.design, b = r.ses.sim.fort.bells[0], wait = function (ms) { return new Promise(function (x) { setTimeout(x, ms); }); }, out = { n: r.ses.sim.bodies.length };
    function snap() { var i = r.renderer.info.render; return { tris: i.triangles, calls: i.calls, pts: i.points }; }
    r.juice.on = false; await wait(2500); out.off = snap(); r.juice.on = true; await wait(2500); out.idle = snap();
    J.confetti(d.cx, d.baseY + 2, d.cz, 140); J.bellRing(b.cx, b.cy, b.cz, true); J.dust(d.cx, d.baseY + 1, d.cz, 1, false); J.chips(d.cx, d.baseY + 1, d.cz, 1, .8, .4, .2);
    var mxc = 0, mxt = 0, k, s; for (k = 0; k < 4; k++) { await wait(500); s = snap(); mxc = Math.max(mxc, s.calls); mxt = Math.max(mxt, s.tris); } out.busy = { calls: mxc, tris: mxt, pts: J.live().particles, rings: J.live().rings };
    return out;
  });
  check('iPad tier, ' + cost.n + ' pieces: juice idle costs ' + (cost.idle.calls - cost.off.calls) + ' draw calls, juice busy at most ' + (cost.busy.calls - cost.off.calls) + ' more (limit 4); triangles ' + cost.off.tris + ' off, ' + cost.idle.tris + ' idle, ' + cost.busy.tris + ' busy (' + cost.busy.pts + ' particles, ' + cost.busy.rings + ' rings live)',
    cost.n === 4000 && cost.idle.calls - cost.off.calls <= 4 && cost.busy.calls - cost.off.calls <= 4 && cost.busy.tris - cost.off.tris <= 40, JSON.stringify(cost));
  results.push({ name: 'INFO juice cost on the iPad tier at 4000 pieces (software GL, counts only)', ok: true, detail: JSON.stringify(cost) });
  check('zero console errors and zero page errors (juice test)', errs.length === 0, errs.slice(0, 5).join(' | '));
  await browser.close(); server.close();
  fs.writeFileSync(path.join(__dirname, 'test_juice_results.json'), JSON.stringify({ when: new Date().toISOString(), results: results, errors: errs }, null, 1));
  console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.length + ' checks)'); process.exit(fails ? 1 : 0);
}
main().catch(function (e) { console.error(e); try { server.close(); } catch (x) { } process.exit(2); });
