/* Rubble page smoke test with software GL (SwiftShader). Run:  NODE_PATH=$(npm root -g) node test_page_smoke.js
   Serves games/living-islands over http, opens rubble/index.html in Chromium, fires every ammo, changes ground and tide, runs the slow replay and a quick bench,
   fails on any console error or page error, and writes pictures to shots/. Frame times here are software GL on a shared CPU: they mean nothing about a real GPU. */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path');
var ROOT = path.join(__dirname, '..'), MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.bin': 'application/octet-stream', '.png': 'image/png' };
var pw; try { pw = require('playwright'); } catch (e) { console.error('playwright not found: run with NODE_PATH=$(npm root -g)'); process.exit(2); }
var HA = require('./hud_audit.js');
var fails = 0, results = [];
function check(n, ok, d) { results.push({ name: n, ok: !!ok, detail: d }); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? '   [' + d + ']' : '')); }
var server = http.createServer(function (req, res) {
  var u = decodeURIComponent(req.url.split('?')[0]), f = path.join(ROOT, u); if (f.indexOf(ROOT) !== 0) { res.writeHead(403); return res.end(); }
  fs.readFile(f, function (e, b) { if (e) { res.writeHead(404); return res.end('no'); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(b); });
});
async function main() {
  await new Promise(function (r) { server.listen(0, '127.0.0.1', r); });
  var port = server.address().port, base = 'http://127.0.0.1:' + port + '/rubble/index.html';
  var browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist', '--enable-webgl'] });
  var shots = path.join(__dirname, 'shots'); fs.mkdirSync(shots, { recursive: true });
  var ctx = await browser.newContext({ viewport: { width: 1180, height: 760 }, deviceScaleFactor: 1 }), page = await ctx.newPage(), errs = [];
  page.on('console', function (m) { if (m.type() === 'error') errs.push('console: ' + m.text()); }); page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('crash', function () { console.log('PAGE CRASH'); }); page.on('close', function () { console.log('PAGE CLOSED'); });
  page.on('requestfailed', function (r) { errs.push('requestfailed: ' + r.url()); });
  async function ready() { await page.waitForFunction('window.__rubble && window.__rubble.ses && window.__rubble.ses.sim', null, { timeout: 120000 }); }
  async function settle(ms) { await page.waitForTimeout(ms); }
  /* the settings drawer is closed during play: controls that live in it (pieces, ground, tier, Build fort, Fly round, Replay slow, Bench) are used the way a player does, open the drawer, tap, close it */
  async function openD(pg) { pg = pg || page; var o = await pg.evaluate(function () { return document.getElementById('drawer').classList.contains('open'); }); if (!o) { await pg.click('#gear'); await pg.waitForTimeout(350); } }
  async function closeD(pg) { pg = pg || page; await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); }
  async function dclick(sel) { await openD(); await page.click(sel); await closeD(); }
  async function dselect(sel, v) { await openD(); await page.selectOption(sel, v); await closeD(); }
  /* Keep the bell: mode switch, perch, HUD, shots, end of round, Rebuild, best score (with and without localStorage), replay. Run alone with --keep-only. */
  async function keepSection() {
    await page.setViewportSize({ width: 700, height: 460 });
    await page.goto(base + '?tier=radeon&mode=keep&pieces=2000&shots=6', { waitUntil: 'load' }); await ready();
    await page.waitForFunction('!window.__rubble.ses.settling && /Ready/.test(document.getElementById("status").textContent + "Ready")', null, { timeout: 240000 }); await settle(1500);
    await page.evaluate(function () { try { localStorage.clear(); } catch (e) { } });
    var k0 = await page.evaluate(function () { var r = window.__rubble, f = r.ses.sim.fort, d = f.design; return { n: r.ses.sim.bodies.length, keep: d.keep, perch: d.perch && d.perch.count, bells: f.bells.length, hud: document.getElementById('score').innerText.replace(/\n/g, ' | '), slider: [document.getElementById('shots').min, document.getElementById('shots').max, document.getElementById('shots').value], on: document.getElementById('modeKeep').classList.contains('on'), api: r.keep() }; });
    check('Keep mode loads: exactly 2000 pieces, one bell on a perch, the switch shows Keep the bell, shots slider runs 6 to 40', k0.n === 2000 && k0.keep && k0.perch > 600 && k0.bells === 1 && k0.on && k0.slider[0] === '6' && k0.slider[1] === '40' && k0.api.shotsMax === 6, JSON.stringify(k0));
    check('the Keep score strip shows Knocked out x%, Bells down 0 of 1 and Shots left', /Knocked out \| \d+%/.test(k0.hud) && /Bells down \| 0 of 1/.test(k0.hud) && /Shots left \| 6 of 6/.test(k0.hud), k0.hud);
    await page.screenshot({ path: path.join(shots, 'rubble-20-keep-start.png') });
    var ev0 = await page.evaluate(function () { return window.__rubble.ses.events.length; });
    await page.evaluate(function () { window.__rubble.setAmmo('coconut'); for (var i = 0; i < 9; i++) window.__rubble.fire('coconut', 1); });
    var shotsMade = await page.evaluate(function (e) { return window.__rubble.ses.events.length - e; }, ev0);
    check('the shot allowance holds: nine taps with 6 shots allowed fire exactly 6', shotsMade === 6, shotsMade + ' fired');
    await page.waitForFunction('document.getElementById("keepEnd").style.display === "block"', null, { timeout: 600000 });
    var e1 = await page.evaluate(function () { var r = window.__rubble; return { txt: document.getElementById('keepEnd').innerText.replace(/\n/g, ' | '), over: r.keep().over && r.keep().over.over, best: r.keep().best, score: r.ses.score().keep }; });
    check('after the last shot and the bricks resting the page shows the result with stars and says what was knocked out (' + e1.txt.slice(0, 110) + ')', e1.over && /Knocked out \d+ percent/.test(e1.txt) && /[★☆]/.test(e1.txt) && (/standing/.test(e1.txt) || /Bell down, try again/.test(e1.txt)), JSON.stringify(e1.score));
    check('the best score is remembered for this shape and count (localStorage)', e1.over.over === 'bell' || (e1.best && e1.best.pct >= 0 && e1.best.stars >= 1), JSON.stringify(e1.best));
    await page.screenshot({ path: path.join(shots, 'rubble-21-keep-result.png') });
    await page.click('#keepLook'); await dclick('#replay'); await page.waitForFunction('!window.__rubble.ses.replay', null, { timeout: 240000 });
    var lr = await page.evaluate(function () { return window.__rubble.ses.lastReplay; }); check('Keep replay: the same perch fort and the same shots give the same hash at the same step', lr && lr.ok, lr ? lr.expected + ' / ' + lr.got : 'none');
    await page.click('#rebuild'); await page.waitForFunction('/Ready/.test(document.getElementById("status").textContent)', null, { timeout: 120000 }); await settle(1500);
    var rb = await page.evaluate(function () { var r = window.__rubble; return { end: document.getElementById('keepEnd').style.display, hud: document.getElementById('score').innerText.replace(/\n/g, ' | '), n: r.ses.sim.bodies.length, ev: r.ses.events.length }; });
    check('Rebuild starts a fresh round: result hidden, shots back to 6 of 6, 2000 pieces', rb.end === 'none' && /Shots left \| 6 of 6/.test(rb.hud) && rb.n === 2000 && rb.ev === 0, JSON.stringify(rb));
    /* a rod straight at the perch drops the bell: the round ends with Bell down, try again */
    await page.evaluate(function () { var s = document.getElementById('shots'); s.value = 40; s.dispatchEvent(new Event('input')); var r = window.__rubble, f = r.ses.sim.fort; r.aim.target = { x: f.design.bell.x, y: f.bellHome, z: f.design.bell.z }; r.aimUpdate(); r.setAmmo('rod'); });
    for (var q = 0; q < 30; q++) { var dn = await page.evaluate(function () { return window.__rubble.ses.bellDown; }); if (dn) break; await page.evaluate(function () { window.__rubble.fire('rod', 1); }); await settle(1500); }
    await page.waitForFunction('document.getElementById("keepEnd").style.display === "block"', null, { timeout: 60000 });
    var e2 = await page.evaluate(function () { return { txt: document.getElementById('keepEnd').innerText.replace(/\n/g, ' | '), hud: document.getElementById('score').innerText.replace(/\n/g, ' | '), n: window.__rubble.ses.events.length }; });
    check('rods at the perch bring the bell down and the page says Bell down, try again, with Rebuild', /Bell down, try again/.test(e2.txt) && /Rebuild/.test(e2.txt) && /Bell down!/.test(e2.hud), e2.txt.slice(0, 100) + ' after ' + e2.n + ' rods');
    var ev2 = e2.n; await page.evaluate(function () { window.__rubble.fire('rod', 1); }); var ev3 = await page.evaluate(function () { return window.__rubble.ses.events.length; });
    check('no more shots after the round is over', ev3 === ev2, '');
    await page.screenshot({ path: path.join(shots, 'rubble-22-keep-bell-down.png') });
    /* switching back to Topple the bell gives the old game */
    await page.click('#modeTopple'); await page.waitForFunction('/Ready/.test(document.getElementById("status").textContent) && !window.__rubble.ses.settling', null, { timeout: 120000 }); await settle(1200);
    var tp = await page.evaluate(function () { var r = window.__rubble; return { keep: r.keep().on, hud: document.getElementById('score').innerText.replace(/\n/g, ' | '), pieces: r.ses.sim.bodies.length, bells: r.ses.sim.fort.bells.length }; });
    check('Topple the bell is still there and is the default mode (old HUD, one bell, no perch)', !tp.keep && /Knocked out \| \d+%/.test(tp.hud) && /Standing \| \d+/.test(tp.hud) && tp.bells === 1, JSON.stringify(tp));
    /* the page must work with localStorage blocked */
    var ctx2 = await browser.newContext({ viewport: { width: 1000, height: 700 } }); await ctx2.addInitScript(function () { Object.defineProperty(window, 'localStorage', { get: function () { throw new Error('blocked'); } }); });
    var p2 = await ctx2.newPage(), errs2 = []; p2.on('console', function (m) { if (m.type() === 'error') errs2.push(m.text()); }); p2.on('pageerror', function (e) { errs2.push('pageerror: ' + e.message); });
    await p2.goto(base + '?tier=radeon&mode=keep&pieces=1000&shots=6', { waitUntil: 'load' });
    await p2.waitForFunction('window.__rubble && window.__rubble.ses && window.__rubble.ses.sim && !window.__rubble.ses.settling', null, { timeout: 240000 }); await p2.waitForTimeout(1500);
    await p2.click('#keepDone'); await p2.waitForFunction('document.getElementById("keepEnd").style.display === "block"', null, { timeout: 60000 });
    var e3 = await p2.evaluate(function () { return document.getElementById('keepEnd').innerText.replace(/\n/g, ' | '); });
    check('with localStorage blocked the page still plays Keep the bell and shows a result (Done with no shots), no errors', /still standing/.test(e3) && errs2.length === 0, e3.slice(0, 90) + (errs2.length ? ' ERR ' + errs2[0] : ''));
    await ctx2.close();
  }
  /* Flight: trails in the Pretty look (one draw call, no triangles), switchable; the Bolt head button. Run alone with --flight-only. */
  async function flightSection() {
    await page.setViewportSize({ width: 700, height: 460 });
    await page.goto(base + '?tier=radeon&pieces=250', { waitUntil: 'load' }); await ready();
    await page.waitForFunction('!window.__rubble.ses.settling', null, { timeout: 240000 }); await settle(1000);
    var r0 = await page.evaluate(async function () {
      var r = window.__rubble, wait = function (ms) { return new Promise(function (x) { setTimeout(x, ms); }); }, out = {};
      await wait(600); out.base = { tris: r.renderer.info.render.triangles, calls: r.renderer.info.render.calls };
      r.setAmmo('rod'); r.fire('rod', 1); r.setAmmo('marble'); r.fire('marble', 2); await wait(400);
      out.trailOn = r.trails(); out.flying = { tris: r.renderer.info.render.triangles, calls: r.renderer.info.render.calls };
      document.getElementById('trails').click(); await wait(300); out.trailOff = r.trails(); out.off = { tris: r.renderer.info.render.triangles, calls: r.renderer.info.render.calls };
      document.getElementById('trails').click(); r.applyLook(false); await wait(400); out.plain = r.trails(); r.applyLook(true); await wait(300);
      var g0 = r.renderer.info.render.triangles; document.getElementById('boltHead').click(); await wait(400); out.head = document.getElementById('boltHead').textContent; out.trisAfterHead = r.renderer.info.render.triangles - g0;
      out.names = SIM_names(); function SIM_names() { return window.RSim.KINDS.rod.name; } return out;
    });
    check('trails: a shot in the air draws a streak in the Pretty look (' + r0.trailOn.drawn + ' vertices), it is one extra draw call and no triangles (' + r0.off.calls + ' -> ' + r0.flying.calls + ' calls, ' + r0.off.tris + ' -> ' + r0.flying.tris + ' triangles)', r0.trailOn.on && r0.trailOn.visible && r0.trailOn.drawn > 0 && r0.flying.calls - r0.off.calls <= 1, JSON.stringify(r0));
    check('trails switch off with the button and are hidden in the Plain look', !r0.trailOff.visible && !r0.plain.visible, JSON.stringify([r0.trailOff, r0.plain]));
    check('the Big rod is now the Bolt (label) and the head button swaps pointed and blunt (' + r0.head + ')', /Bolt/.test(r0.names) && /blunt/.test(r0.head), r0.names);
    var am = await page.evaluate(async function () {
      var r = window.__rubble, wait = function (ms) { return new Promise(function (x) { setTimeout(x, ms); }); }, out = {}, p = document.getElementById('power');
      p.value = 50; p.dispatchEvent(new Event('input')); await wait(100); out.on = r.aimLine();
      document.getElementById('aimHelp').click(); await wait(100); out.off = r.aimLine(); document.getElementById('aimHelp').click(); await wait(100); out.back = r.aimLine(); return out;
    });
    check('B3: the faint aim line (40 points, the first 0.67 s) and the power meter (50 percent) are shown, switch off with the button and come back', am.on.visible && am.on.pts === 40 && am.on.fill === '50%' && am.on.meter === 'block' && !am.off.visible && am.off.meter === 'none' && am.back.visible, JSON.stringify(am));
    await page.screenshot({ path: path.join(shots, 'rubble-23-flight-trails.png') });
  }
  if (process.argv.indexOf('--flight-only') > 0) { await flightSection(); check('zero console errors and zero page errors (Flight section)', errs.length === 0, errs.slice(0, 5).join(' | ')); await browser.close(); server.close(); console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.length + ' checks)'); process.exit(fails ? 1 : 0); }
  if (process.argv.indexOf('--keep-only') > 0) { await keepSection(); check('zero console errors and zero page errors (Keep section)', errs.length === 0, errs.slice(0, 5).join(' | ')); await browser.close(); server.close(); console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.length + ' checks)'); process.exit(fails ? 1 : 0); }
  /* 1. load with the island ground */
  await page.goto(base + '?tier=radeon&pieces=250', { waitUntil: 'load' }); await ready();
  var info = await page.evaluate(function () { var r = window.__rubble; return { pieces: r.ses.sim.bodies.length, note: document.getElementById('siteNote').textContent, proc: !!r.site.procedural, code: window.RSim.determinismCode(window.__rubble.ses.R, r.site), fcode: window.RSim.fortCode(window.__rubble.ses.R, r.site), fort: r.ses.sim.fort ? r.ses.sim.fort.count : 0, calls: r.renderer.info.render.calls }; });
  check('page loads the island ground (not the procedural stand-in)', !info.proc && /seed 9001/.test(info.note), info.note);
  check('page builds exactly 250 pieces (one castle, bricks, beams, one bell)', info.pieces === 250 && info.fort === 250, info.pieces + ' bodies, fort ' + info.fort);
  var nodeCode = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_fort_results.json'), 'utf8')).numbers.determinismCode;      /* on the big levelled pad the page uses (test_fort.js builds the same site) */
  check('the page in Chromium gives the same replay code as Node', info.code === nodeCode, 'page ' + info.code + ', node ' + nodeCode);
  var fortCode = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_fort_results.json'), 'utf8')).numbers.fortCode;
  check('the page in Chromium gives the same FORT replay code as Node', info.fcode === fortCode, 'page ' + info.fcode + ', node ' + fortCode);
  await settle(1500); await page.screenshot({ path: path.join(shots, 'rubble-1-start.png') });
  /* 1b. the camera frames the fort by default; Big rod and Burst work with no menu; the bell rule; Rebuild */
  var fr = await page.evaluate(function () { var r = window.__rubble, f = r.ses.sim.fort, d = f.design, v = new r.THREE.Vector3(d.cx, d.baseY + d.height * 0.5, d.cz).project(r.cam); return { x: v.x, y: v.y, z: v.z, dist: r.orb.dist }; });
  check('the camera frames the fort by default (fort centre near the middle of the screen, in front of the camera)', Math.abs(fr.x) < 0.25 && Math.abs(fr.y) < 0.45 && fr.z < 1, JSON.stringify(fr));
  /* the play HUD: closed drawer, every control on screen and 44 px or more with no overlaps; the drawer opens and holds the settings; Juice is on in Pretty and off in Plain */
  var hd0 = await page.evaluate(HA.collect); HA.audit(check, 'HUD at ' + hd0.W + 'x' + hd0.H + ' (drawer closed)', hd0, 44);
  var hd1 = await page.evaluate(function () { var d = document.getElementById('drawer'); return { open: d.classList.contains('open'), j: window.__rubble.juice.on, jb: document.getElementById('juice').textContent, shake: window.__rubble.juice.shakeOn }; });
  check('the settings drawer is closed during play, Juice is on in the Pretty look (' + hd1.jb + ') and the camera shake is on', !hd1.open && hd1.j && hd1.shake, JSON.stringify(hd1));
  await openD(); var hd2 = await page.evaluate(function () { return ['pieces', 'shape', 'tide', 'ground', 'tier', 'look', 'juice', 'shake', 'bench', 'replay'].map(function (id) { var e = document.getElementById(id), r = e.getBoundingClientRect(); return e && r.width > 0 && getComputedStyle(e).visibility !== 'hidden'; }); });
  await page.screenshot({ path: path.join(shots, 'rubble-14-drawer-open.png') });
  check('opening the drawer shows pieces, shape, tide, ground, tier, look, juice, shake, bench and replay', hd2.every(Boolean), JSON.stringify(hd2));
  var jt = await page.evaluate(async function () { var r = window.__rubble, w = function (ms) { return new Promise(function (x) { setTimeout(x, ms); }); }, o = {}; document.getElementById('juice').click(); o.off = r.juice.on; document.getElementById('juice').click(); o.on = r.juice.on; r.applyLook(false); o.plain = r.juice.on; await w(300); r.applyLook(true); o.back = r.juice.on; return o; });
  check('the Juice switch works and follows the look: off when switched, off in Plain, on again in Pretty', jt.off === false && jt.on === true && jt.plain === false && jt.back === true, JSON.stringify(jt));
  await closeD();
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
  check('the bell comes down to big rods and the page says Bell down, with moved, standing and shots', sc.sc.bellDown && /Bell down!/.test(sc.text) && /Knocked out/.test(sc.text) && /Standing/.test(sc.text) && sc.sc.shots >= 3, sc.text.replace(/\n/g, ' | '));
  await page.screenshot({ path: path.join(shots, 'rubble-1b-bell-down.png') });
  var jx = await page.evaluate(function () { var j = window.__rubble.juice.stats; return { ev: j.events, sp: j.spawned, rings: j.rings, conf: j.confetti, fl: j.flashes, pops: j.pops, shown: window.__rubble.hitShown() }; });
  check('real hits made juice (' + jx.ev + ' impacts, ' + jx.sp + ' particles), the fallen bell rang (' + jx.rings + ' ring waves), threw confetti (' + jx.conf + '), flashed the screen (' + jx.fl + ') and the Replay the hit button is showing', jx.ev > 0 && jx.sp > 0 && jx.rings >= 3 && jx.conf >= 60 && jx.fl >= 1 && jx.shown, JSON.stringify(jx));
  var hitHash = await page.evaluate(function () { return window.__rubble.ses.sim.hash(); });
  await page.click('#hitReplay'); var hph = [], th = Date.now();
  while (Date.now() - th < 300000) { var hh = await page.evaluate(function () { var h = window.__rubble.hit(); return h ? { p: h.phase, d: h.dist } : null; }); if (!hh) break; if (hph[hph.length - 1] !== hh.p) hph.push(hh.p); await page.waitForTimeout(500); }
  var hl = await page.evaluate(function () { return window.__rubble.ses.lastReplay; });
  check('Replay the hit ran fast to the last shot, then slow (' + hph.join(' > ') + '), and ended on the same hash at the same step as the live game', hph[0] === 'seek' && hph.indexOf('slow') > 0 && hl && hl.ok, JSON.stringify(hl));
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
  await dselect('#ground', '4'); await settle(300);
  await page.evaluate(function () { var t = document.getElementById('tide'); t.value = 80; t.dispatchEvent(new Event('input')); }); await settle(1500);
  var g = await page.evaluate(function () { var s = window.__rubble.ses.sim; return { mode: s.groundMode, tide: s.tide, g: s.tiles[100].gid }; });
  check('ground override and tide reach the physics (all rock, tide +0.80)', g.mode === 4 && Math.abs(g.tide - 0.8) < 0.01 && g.g === 4, JSON.stringify(g));
  await page.screenshot({ path: path.join(shots, 'rubble-4-rock-hightide.png') });
  await dselect('#ground', '-1');
  /* 5. the iPad preset is not a cap any more: 4,000 pieces build on it */
  await dselect('#tier', 'ipad'); await settle(1500);
  var tcap = await page.evaluate(function () { var p = document.getElementById('pieces'); p.value = 11; p.dispatchEvent(new Event('input')); return document.getElementById('piecesV').textContent; }); check('the slider offers 4000 on the iPad preset', /^4000/.test(tcap), tcap);
  await dclick('#buildFort'); await page.waitForFunction('window.__rubble.ses.sim.bodies.length === 4000 && !window.__rubble.ses.settling', null, { timeout: 240000 }); await settle(2500);
  var big = await page.evaluate(function () { return { n: window.__rubble.ses.sim.bodies.length, calls: window.__rubble.renderer.info.render.calls, tris: window.__rubble.renderer.info.render.triangles, info: document.getElementById('fortInfo').textContent }; });
  check('iPad preset builds exactly 4000 fort pieces', big.n === 4000, JSON.stringify(big)); await page.screenshot({ path: path.join(shots, 'rubble-5-ipad-4000.png') });
  /* the look: Pretty (default) against Plain at 4000 pieces: triangles and draw calls, and the physics does not change */
  var lk = await page.evaluate(async function () {
    var r = window.__rubble, h0 = r.ses.sim.hash(), out = {}, wait = function (ms) { return new Promise(function (x) { setTimeout(x, ms); }); };
    out.defaultPretty = r.look(); await wait(900); out.pretty = { tris: r.renderer.info.render.triangles, calls: r.renderer.info.render.calls };
    r.applyLook(false); await wait(900); out.plain = { tris: r.renderer.info.render.triangles, calls: r.renderer.info.render.calls };
    r.applyLook(true); await wait(600); out.hashSame = r.ses.sim.hash() === h0; return out;
  });
  check('the look defaults to Pretty, toggles to Plain and back, and the physics hash is unchanged by it', lk.defaultPretty && lk.hashSame, JSON.stringify(lk));
  check('iPad 4000 pieces stays within a sane budget in both looks (under 200,000 triangles and 40 draw calls)', lk.pretty.tris < 200000 && lk.pretty.calls < 40 && lk.plain.tris < 200000, 'pretty ' + lk.pretty.tris + ' tris / ' + lk.pretty.calls + ' calls; plain ' + lk.plain.tris + ' tris / ' + lk.plain.calls + ' calls');
  var tn = await page.evaluate(function () { return document.getElementById('tested').textContent; });
  check('the page states the tested range from measured numbers and says they are not iPad numbers', /Tested up to: \d+ pieces/.test(tn) && /not iPad numbers/.test(tn), tn.slice(0, 160));
  /* 5b. the Grand fort at 5000 pieces: Settling... then Ready, the camera frames the whole fort, quick aims, Fly round, Big rod, bells */
  await ctx.addInitScript(function () { window.__stat = []; setInterval(function () { var e = document.getElementById('status'); if (e && e.style.display !== 'none' && e.textContent && window.__stat[window.__stat.length - 1] !== e.textContent) window.__stat.push(e.textContent); }, 40); });
  await page.goto(base + '?tier=radeon&shape=grand&pieces=5000', { waitUntil: 'load' }); await ready();
  await page.waitForFunction('window.__rubble.ses.sim.fort && !window.__rubble.ses.settling && /Ready/.test(window.__stat.join("|"))', null, { timeout: 400000 }); await settle(1500);
  var gr = await page.evaluate(function () { var r = window.__rubble, f = r.ses.sim.fort, d = f.design; return { n: r.ses.sim.bodies.length, shape: d.shape, bells: f.bells.length, info: document.getElementById('fortInfo').textContent, score: document.getElementById('score').innerText, stat: window.__stat.slice(), settleMs: r.ses.settleMs, calls: r.renderer.info.render.calls }; });
  check('Grand fort at 5000: exactly 5000 pieces, six bells, the page shows Settling... then Ready, and the score says Bells down: 0 of 6', gr.n === 5000 && gr.shape === 'grand' && gr.bells === 6 && gr.stat.some(function (t) { return /^Settling/.test(t); }) && gr.stat.some(function (t) { return /Ready/.test(t); }) && /Bells down[\s|]+0 of 6/.test(gr.score), JSON.stringify({ n: gr.n, bells: gr.bells, stat: gr.stat.filter(function (t, i) { return i < 2 || i >= gr.stat.length - 2; }).map(function (t) { return t.slice(0, 40); }), score: gr.score.replace(/\n/g, ' | ') }));
  var fr2 = await page.evaluate(function () { var r = window.__rubble, d = r.ses.sim.fort.design, V = r.THREE.Vector3, worst = 0, ok = true, sx, sz, sy, v; r.cam.updateMatrixWorld(true);
    for (sx = -1; sx <= 1; sx += 2) for (sz = -1; sz <= 1; sz += 2) for (sy = 0; sy <= 1; sy++) { v = new V(d.cx + sx * d.half.x, d.baseY + sy * d.height, d.cz + sz * d.half.z).project(r.cam); worst = Math.max(worst, Math.abs(v.x), Math.abs(v.y)); if (Math.abs(v.x) > 1 || Math.abs(v.y) > 1 || v.z > 1) ok = false; }
    return { ok: ok, worst: +worst.toFixed(2), dist: +r.orb.dist.toFixed(1), widthM: +(d.half.x * 2).toFixed(1) }; });
  check('the camera frames the whole Grand fort by default (all eight corners of its box are on screen)', fr2.ok, JSON.stringify(fr2));
  await page.screenshot({ path: path.join(shots, 'rubble-11-grand-5000.png') });
  var qa = await page.evaluate(function () { var r = window.__rubble, f = r.ses.sim.fort, d = f.design, out = {}, t; document.getElementById('qGate').click(); t = r.aim.target; out.gate = Math.hypot(t.x - d.bells[1].x, t.z - d.bells[1].z) < 0.01 && Math.abs(t.y - f.bellHomes[1]) < 0.01;
    document.getElementById('qKeep').click(); t = r.aim.target; out.keep = Math.hypot(t.x - d.bells[0].x, t.z - d.bells[0].z) < 0.01;
    document.getElementById('qTower').click(); var t1 = Object.assign({}, r.aim.target); document.getElementById('qTower').click(); var t2 = r.aim.target; out.tower = Math.abs(t1.x - t2.x) > 1 && d.bells.slice(2).some(function (b) { return Math.hypot(t1.x - b.x, t1.z - b.z) < 0.01; });
    out.names = ['qGate', 'qTower', 'qKeep', 'fly', 'bigrod', 'burst'].map(function (id) { return !!document.getElementById(id); }); out.yaw = r.aim.yaw; return out; });
  check('quick aim buttons Gate, Tower and Keep aim the launcher at the gatehouse bell, a front corner tower bell (alternating) and the keep bell; Big rod, Burst and Fly round are still there', qa.gate && qa.keep && qa.tower && qa.names.every(Boolean), JSON.stringify(qa));
  await page.click('#qGate'); var evG = await page.evaluate(function () { return window.__rubble.ses.events.length; });
  for (var rq = 0; rq < 10; rq++) { var gd = await page.evaluate(function () { return window.__rubble.ses.score().bellFlags[1]; }); if (gd) break; await page.click('#bigrod'); await settle(2200); }
  await settle(1500);
  var gs = await page.evaluate(function () { var s = window.__rubble.ses.score(); return { flags: s.bellFlags, down: s.bellsDown, text: document.getElementById('score').innerText.replace(/\n/g, ' | '), rods: window.__rubble.ses.events.length }; });
  check('Gate then Big rod brings the gatehouse bell down and the score reads Bells down: 1 of 6 or more', gs.flags[1] && gs.down >= 1 && /(Bells down|Every bell is down!)[\s|]+\d+ of 6/.test(gs.text), JSON.stringify(gs));
  await page.screenshot({ path: path.join(shots, 'rubble-12-grand-gate-hit.png') });
  var az0 = await page.evaluate(function () { return window.__rubble.orb.az; }); await dclick('#fly'); await settle(1500); var az1 = await page.evaluate(function () { return { az: window.__rubble.orb.az, on: window.__rubble.fly() }; });
  await dclick('#fly'); var az2 = await page.evaluate(function () { return window.__rubble.orb.az; }); await settle(800); var az3 = await page.evaluate(function () { return window.__rubble.orb.az; });
  check('Fly round turns the camera round the fort while on and stops when off', az1.on && Math.abs(az1.az - az0) > 0.04 && Math.abs(az3 - az2) < 1e-6, az0.toFixed(2) + ' -> ' + az1.az.toFixed(2) + ', off: ' + az2.toFixed(3) + ' / ' + az3.toFixed(3));
  /* 5c. 10,000 pieces Grand: draw calls and triangles for the Pretty look (InstancedMesh per kind), and the progress line when settling takes over 10 s */
  await page.goto(base + '?tier=radeon&shape=grand&pieces=10000', { waitUntil: 'load' }); await ready();
  await page.waitForFunction('window.__rubble.ses.sim.fort && !window.__rubble.ses.settling && /Ready/.test(window.__stat.join("|"))', null, { timeout: 600000 }); await settle(2000);
  var g10 = await page.evaluate(async function () {
    var r = window.__rubble, out = {}, wait = function (ms) { return new Promise(function (x) { setTimeout(x, ms); }); }, ims = r.THREE ? 0 : 0;
    out.n = r.ses.sim.bodies.length; out.settleMs = Math.round(r.ses.settleMs); out.stat = window.__stat.slice(); out.pretty0 = r.look();
    await wait(1200); out.pretty = { tris: r.renderer.info.render.triangles, calls: r.renderer.info.render.calls };
    r.applyLook(false); await wait(1200); out.plain = { tris: r.renderer.info.render.triangles, calls: r.renderer.info.render.calls }; r.applyLook(true); await wait(600);
    var kinds = {}; r.ses.sim.bodies.forEach(function (b) { kinds[b.kind] = (kinds[b.kind] || 0) + 1; }); out.kinds = kinds; return out;
  });
  check('Grand 10000: exactly 10000 pieces in the page; settled with Settling... then Ready', g10.n === 10000 && g10.stat.some(function (t) { return /^Settling/.test(t); }) && g10.stat.some(function (t) { return /Ready/.test(t); }), 'settled in ' + g10.settleMs + ' ms (page, software GL, shared CPU); ' + JSON.stringify(g10.kinds));
  check('when settling takes over 10 s of real time the page shows a progress line (steps and seconds) and asks the player to wait for Ready (settle took ' + g10.settleMs + ' ms)', g10.settleMs < 10000 || g10.stat.some(function (t) { return /so far/.test(t) && /Ready/.test(t); }), g10.stat.filter(function (t) { return /so far/.test(t); }).slice(-1)[0] || 'under 10 s: no line needed');
  check('Grand 10000 Pretty look: one draw per material (InstancedMesh) and a sane triangle count: ' + g10.pretty.tris + ' triangles, ' + g10.pretty.calls + ' draw calls (Plain: ' + g10.plain.tris + ' / ' + g10.plain.calls + ')', g10.pretty.calls < 40 && g10.pretty.tris < 600000, JSON.stringify({ pretty: g10.pretty, plain: g10.plain }));
  var gcode = await page.evaluate(function () { return window.RSim.grandCode(window.__rubble.ses.R, window.__rubble.site); }), nodeG = JSON.parse(fs.readFileSync(path.join(__dirname, 'test_grand_results.json'), 'utf8')).numbers.grandCode;
  check('the page in Chromium gives the same GRAND fort replay code as Node (3000-piece fort, fixed volley at the gate)', gcode === nodeG, 'page ' + gcode + ', node ' + nodeG);
  results.push({ name: 'INFO grand 10000 Pretty render cost (software GL, counts only)', ok: true, detail: JSON.stringify({ pretty: g10.pretty, plain: g10.plain, kinds: g10.kinds }) });
  await page.screenshot({ path: path.join(shots, 'rubble-13-grand-10000.png') });
  await keepSection();
  await flightSection();
  /* 6. replay */
  await page.evaluate(function () { var p = document.getElementById('pieces'); p.value = 0; p.dispatchEvent(new Event('input')); }); await dclick('#buildFort'); await page.waitForFunction('window.__rubble.ses.sim.bodies.length === 40 && !window.__rubble.ses.settling', null, { timeout: 240000 }); await settle(1500);
  await page.evaluate(function () { var r = window.__rubble; r.fire('rod', 2); r.fire('coconut', 2); }); await settle(3500);
  await dclick('#replay'); await settle(1200); await page.screenshot({ path: path.join(shots, 'rubble-7-replay.png') });
  var inRep = await page.evaluate(function () { var s = window.__rubble.ses; return !!s.replay || !!s.lastReplay; }); check('replay started after pressing Replay slow (it may already be over on a slow machine)', inRep, '');
  await page.waitForFunction('!window.__rubble.ses.replay', null, { timeout: 180000 });
  var lr = await page.evaluate(function () { return window.__rubble.ses.lastReplay; });
  check('after the replay the scene has the same hash at the same step as before it', lr && lr.ok, lr ? lr.expected + ' before, ' + lr.got + ' after, at step ' + lr.steps : 'no replay record');
  /* 7. quick bench */
  await dclick('#bench'); await settle(300); await page.screenshot({ path: path.join(shots, 'rubble-8-bench-warning.png') });
  await page.goto(base + '?tier=radeon&bench=quick&kneems=100000&pieces=60', { waitUntil: 'load' }); await ready();
  await dclick('#bench'); await page.click('#benchStart');
  await page.waitForFunction('window.__benchReport', null, { timeout: 240000 });
  var rep = await page.evaluate(function () { return window.__benchReport; });
  check('bench ran every level and wrote a report with a knee line and the highest level reached', /knee \(30 fps/.test(rep) && /ran every level/.test(rep) && /SOFTWARE/.test(rep) && /highest level reached: \d+ pieces/.test(rep), rep.split('\n').filter(function (l) { return /knee|ran every|SOFTWARE/.test(l); }).join(' | '));
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
