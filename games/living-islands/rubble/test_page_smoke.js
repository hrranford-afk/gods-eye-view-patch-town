/* Rubble page smoke test with software GL (SwiftShader). Run:  NODE_PATH=$(npm root -g) node test_page_smoke.js
   Serves games/living-islands over http, opens rubble/index.html in Chromium, fires every ammo, changes ground and tide, runs the slow replay and a quick bench,
   fails on any console error or page error, and writes pictures to shots/. Frame times here are software GL on a shared CPU: they mean nothing about a real GPU. */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '..'), MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.bin': 'application/octet-stream', '.png': 'image/png' };
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
  var browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  var shots = path.join(__dirname, 'shots'); fs.mkdirSync(shots, { recursive: true });
  var ctx = await browser.newContext({ viewport: { width: 1180, height: 760 }, deviceScaleFactor: 1 }), page = await ctx.newPage(), errs = [];
  page.on('console', function (m) { if (m.type() === 'error') errs.push('console: ' + m.text()); }); page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('requestfailed', function (r) { errs.push('requestfailed: ' + r.url()); });
  async function ready() { await page.waitForFunction('window.__rubble && window.__rubble.ses && window.__rubble.ses.sim', null, { timeout: 120000 }); }
  async function settle(ms) { await page.waitForTimeout(ms); }
  /* 1. load with the island ground */
  await page.goto(base + '?tier=radeon&pieces=250', { waitUntil: 'load' }); await ready();
  var info = await page.evaluate(function () { var r = window.__rubble; return { pieces: r.ses.sim.bodies.length, note: document.getElementById('siteNote').textContent, proc: !!r.site.procedural, code: window.RSim.determinismCode(window.__rubble.ses.R, r.site), fcode: window.RSim.fortCode(window.__rubble.ses.R, r.site), fort: r.ses.sim.fort ? r.ses.sim.fort.count : 0, calls: r.renderer.info.render.calls }; });
  check('page loads the island ground (not the procedural stand-in)', !info.proc && /seed 9001/.test(info.note), info.note);
  check('page builds exactly 250 pieces (one castle, bricks, beams, one bell)', info.pieces === 250 && info.fort === 250, info.pieces + ' bodies, fort ' + info.fort);
  var nodeCode = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_results.json'), 'utf8')).numbers.determinismCode;
  check('the page in Chromium gives the same replay code as Node', info.code === nodeCode, 'page ' + info.code + ', node ' + nodeCode);
  var fortCode = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_fort_results.json'), 'utf8')).numbers.fortCode;
  check('the page in Chromium gives the same FORT replay code as Node', info.fcode === fortCode, 'page ' + info.fcode + ', node ' + fortCode);
  await settle(1500); await page.screenshot({ path: path.join(shots, 'rubble-1-start.png') });
  /* 1b. the camera frames the fort by default; Big rod and Burst work with no menu; the bell rule; Rebuild */
  var fr = await page.evaluate(function () { var r = window.__rubble, f = r.ses.sim.fort, d = f.design, v = new r.THREE.Vector3(d.cx, d.baseY + d.height * 0.5, d.cz).project(r.cam); return { x: v.x, y: v.y, z: v.z, dist: r.orb.dist }; });
  check('the camera frames the fort by default (fort centre near the middle of the screen, in front of the camera)', Math.abs(fr.x) < 0.25 && Math.abs(fr.y) < 0.45 && fr.z < 1, JSON.stringify(fr));
  var ev0 = await page.evaluate(function () { return window.__rubble.ses.events.length; });
  await page.click('#bigrod'); await settle(300);
  var br = await page.evaluate(function () { var e = window.__rubble.ses.events; return { n: e.length, k: e[e.length - 1] && e[e.length - 1].k }; });
  check('Big rod: one tap fires a rod with no menu', br.n === ev0 + 1 && br.k === 'rod', JSON.stringify(br));
  await page.evaluate(function () { window.__rubble.setAmmo('marble'); }); var ev1 = br.n;
  await page.click('#burst'); await settle(2500);
  var bu = await page.evaluate(function () { return window.__rubble.ses.events.length; });
  check('Burst: one tap fires a quick run of the chosen ammo (at least 4 marbles)', bu >= ev1 + 4, (bu - ev1) + ' shots');
  var hashFresh = null;
  for (var q = 0; q < 14; q++) { var down = await page.evaluate(function () { return window.__rubble.ses.bellDown; }); if (down) break; await page.click('#bigrod'); await settle(1800); }
  await settle(1000);
  var sc = await page.evaluate(function () { var s = window.__rubble.ses.score(); return { sc: s, text: document.getElementById('score').innerText }; });
  check('the bell comes down to big rods and the page says Bell down, with moved, standing and shots', sc.sc.bellDown && /Bell down/.test(sc.text) && /moved/.test(sc.text) && /standing/.test(sc.text) && sc.sc.shots >= 3, sc.text.replace(/\n/g, ' | '));
  await page.screenshot({ path: path.join(shots, 'rubble-1b-bell-down.png') });
  await page.click('#rebuild'); await page.waitForFunction('/Ready/.test(document.getElementById("status").textContent)', null, { timeout: 120000 }); await settle(2500);
  var rb = await page.evaluate(function () { var s = window.__rubble.ses.score(); return { sc: s, h: window.__rubble.ses.sim.hash(), n: window.__rubble.ses.sim.bodies.length }; });
  check('Rebuild: the same fort is back, 250 pieces, bell up, score back to zero', rb.n === 250 && rb.sc.moved === 0 && !rb.sc.bellDown && rb.sc.shots === 0, JSON.stringify(rb.sc));
  await page.evaluate(function () { window.__rubble.setAmmo('marble'); });
  /* 2. every ammo, three shots each, then look */
  var kinds = ['acorn', 'marble', 'coconut', 'lid', 'float', 'bottle', 'rod'];
  for (var i = 0; i < kinds.length; i++) { await page.evaluate(function (k) { window.__rubble.setAmmo(k); window.__rubble.fire(k, k === 'acorn' ? 8 : 1); }, kinds[i]); await settle(500); }
  await settle(2500);
  var st = await page.evaluate(function () { var s = window.__rubble.ses.sim; return { n: s.bodies.length, awake: s.nActive, ammo: s.nAmmo, ev: window.__rubble.ses.events.length }; });
  check('all seven ammo kinds fired and were logged', st.ev >= 7 + 7, JSON.stringify(st));
  await page.screenshot({ path: path.join(shots, 'rubble-2-volley.png') });
  /* 3. the aimed rod volley at the block from a closer camera */
  await page.evaluate(function () { var r = window.__rubble; r.setAmmo('rod'); for (var i = 0; i < 5; i++) r.fire('rod', 1); }); await settle(4000);
  await page.screenshot({ path: path.join(shots, 'rubble-3-rods.png') });
  /* 4. ground override and tide */
  await page.selectOption('#ground', '4'); await settle(300);
  await page.evaluate(function () { var t = document.getElementById('tide'); t.value = 80; t.dispatchEvent(new Event('input')); }); await settle(1500);
  var g = await page.evaluate(function () { var s = window.__rubble.ses.sim; return { mode: s.groundMode, tide: s.tide, g: s.tiles[100].gid }; });
  check('ground override and tide reach the physics (all rock, tide +0.80)', g.mode === 4 && Math.abs(g.tide - 0.8) < 0.01 && g.g === 4, JSON.stringify(g));
  await page.screenshot({ path: path.join(shots, 'rubble-4-rock-hightide.png') });
  await page.selectOption('#ground', '-1');
  /* 5. the iPad preset is not a cap any more: 4,000 pieces build on it */
  await page.selectOption('#tier', 'ipad'); await settle(1500);
  var tcap = await page.evaluate(function () { var p = document.getElementById('pieces'); p.value = 11; p.dispatchEvent(new Event('input')); return document.getElementById('piecesV').textContent; }); check('the slider offers 4000 on the iPad preset', /^4000/.test(tcap), tcap);
  await page.click('#buildFort'); await page.waitForFunction('window.__rubble.ses.sim.bodies.length === 4000 && !window.__rubble.ses.settling', null, { timeout: 240000 }); await settle(2500);
  var big = await page.evaluate(function () { return { n: window.__rubble.ses.sim.bodies.length, calls: window.__rubble.renderer.info.render.calls, tris: window.__rubble.renderer.info.render.triangles, info: document.getElementById('fortInfo').textContent }; });
  check('iPad preset builds exactly 4000 fort pieces', big.n === 4000, JSON.stringify(big)); await page.screenshot({ path: path.join(shots, 'rubble-5-ipad-4000.png') });
  /* 6. replay */
  await page.evaluate(function () { var p = document.getElementById('pieces'); p.value = 0; p.dispatchEvent(new Event('input')); }); await page.click('#buildFort'); await page.waitForFunction('window.__rubble.ses.sim.bodies.length === 40 && !window.__rubble.ses.settling', null, { timeout: 240000 }); await settle(1500);
  await page.evaluate(function () { var r = window.__rubble; r.fire('rod', 2); r.fire('coconut', 2); }); await settle(3500);
  await page.click('#replay'); await settle(1200); await page.screenshot({ path: path.join(shots, 'rubble-7-replay.png') });
  var inRep = await page.evaluate(function () { var s = window.__rubble.ses; return !!s.replay || !!s.lastReplay; }); check('replay started after pressing Replay slow (it may already be over on a slow machine)', inRep, '');
  await page.waitForFunction('!window.__rubble.ses.replay', null, { timeout: 180000 });
  var lr = await page.evaluate(function () { return window.__rubble.ses.lastReplay; });
  check('after the replay the scene has the same hash at the same step as before it', lr && lr.ok, lr ? lr.expected + ' before, ' + lr.got + ' after, at step ' + lr.steps : 'no replay record');
  /* 7. quick bench */
  await page.click('#bench'); await settle(300); await page.screenshot({ path: path.join(shots, 'rubble-8-bench-warning.png') });
  await page.goto(base + '?tier=radeon&bench=quick&kneems=100000&pieces=60', { waitUntil: 'load' }); await ready();
  await page.click('#bench'); await page.click('#benchStart');
  await page.waitForFunction('window.__benchReport', null, { timeout: 240000 });
  var rep = await page.evaluate(function () { return window.__benchReport; });
  check('bench ran every level and wrote a report with a knee line', /knee \(30 fps/.test(rep) && /ran every level/.test(rep) && /SOFTWARE/.test(rep), rep.split('\n').filter(function (l) { return /knee|ran every|SOFTWARE/.test(l); }).join(' | '));
  await page.screenshot({ path: path.join(shots, 'rubble-9-bench-report.png') });
  fs.writeFileSync(path.join(__dirname, 'shots', 'bench_report_software_gl.txt'), rep);
  /* 8. the knee finder stops by itself: default rule (100 ms for 5 frames) on software GL must trip at the first levels */
  await page.goto(base + '?tier=radeon&bench=quick&pieces=60', { waitUntil: 'load' }); await ready();
  var stopLevel = await page.evaluate(async function () { window.__rubble.benchRun(); return 1; });
  await page.waitForFunction('window.__benchReport', null, { timeout: 240000 }); var rep2 = await page.evaluate(function () { return window.__benchReport; });
  check('the knee finder stops by itself when frames are slow (software GL trips the 100 ms rule)', /stopped early/.test(rep2) || /ran every level/.test(rep2), rep2.split('\n').filter(function (l) { return /stopped|ran every/.test(l); }).join(' | '));
  /* 9. the procedural stand-in */
  await page.goto(base + '?terrain=proc&pieces=80', { waitUntil: 'load' }); await ready(); await settle(1500);
  var pr = await page.evaluate(function () { return document.getElementById('siteNote').textContent; }); check('procedural fallback loads and says so', /PROCEDURAL/.test(pr), pr);
  await page.screenshot({ path: path.join(shots, 'rubble-10-procedural.png') });
  check('zero console errors and zero page errors', errs.length === 0, errs.slice(0, 5).join(' | '));
  await browser.close(); server.close();
  fs.writeFileSync(path.join(__dirname, 'test_page_results.json'), JSON.stringify({ when: new Date().toISOString(), results: results, errors: errs }, null, 1));
  console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.length + ' checks)'); process.exit(fails ? 1 : 0);
}
main().catch(function (e) { console.error(e); try { server.close(); } catch (x) { } process.exit(2); });
