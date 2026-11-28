/* Rubble HUD test (like the Gift's hud-test): for the play HUD at 834x1062 touch (iPad portrait) and 1280x720 desktop, in Topple and Keep mode, with the settings drawer closed and open:
   every visible control is on screen, at least 44 px each way, and no two visible controls (or text blocks) overlap; the drawer is closed by default and holds the other settings.
   Run:  NODE_PATH=$(npm root -g) node test_hud.js     (Chromium with software GL: --use-gl=swiftshader --enable-unsafe-swiftshader --no-sandbox) */
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
var HA = require('./hud_audit.js'), collect = HA.collect;
function audit(label, d, minSize) { return HA.audit(check, label, d, minSize); }
async function main() {
  await new Promise(function (r) { server.listen(0, '127.0.0.1', r); });
  var port = server.address().port, base = 'http://127.0.0.1:' + port + '/rubble/index.html';
  var browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--ignore-gpu-blocklist'] });
  var errs = [];
  var views = [{ name: 'iPad 834x1062 touch', short: 'ipad', w: 834, h: 1062, touch: true }, { name: 'desktop 1280x720', short: 'desk', w: 1280, h: 720, touch: false }, { name: 'small 700x460', short: 'small', w: 700, h: 460, touch: true }];
  for (var vi = 0; vi < views.length; vi++) {
    var V = views[vi], ctx = await browser.newContext({ viewport: { width: V.w, height: V.h }, hasTouch: V.touch, isMobile: V.touch, deviceScaleFactor: 1 }), page = await ctx.newPage();
    page.on('console', function (m) { if (m.type() === 'error') errs.push('console: ' + m.text()); }); page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
    var modes = [{ n: 'Topple', q: '?tier=ipad&pieces=1000' }, { n: 'Keep', q: '?tier=ipad&mode=keep&pieces=1000&shots=6' }];
    for (var mi = 0; mi < modes.length; mi++) {
      var M = modes[mi], tag = V.name + ', ' + M.n;
      await page.goto(base + M.q, { waitUntil: 'load' });
      await page.waitForFunction('window.__rubble && window.__rubble.ses && window.__rubble.ses.sim && !window.__rubble.ses.settling', null, { timeout: 240000 }); await page.waitForTimeout(1200);
      var closed = await page.evaluate(function () { var d = document.getElementById('drawer'), vis = 0; Array.prototype.forEach.call(d.querySelectorAll('button,input,select'), function (e) { var cs = getComputedStyle(e), r = e.getBoundingClientRect(); if (cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 0 && r.right > 0 && r.left < innerWidth) vis++; }); return { open: d.classList.contains('open'), visibleInside: vis, aria: d.getAttribute('aria-hidden') }; });
      check(tag + ': the settings drawer is closed by default and none of its controls show during play', !closed.open && closed.visibleInside === 0 && closed.aria === 'true', JSON.stringify(closed));
      var d0 = await page.evaluate(collect);
      var ids = d0.items.map(function (x) { return x.id; });
      var need = ['gear', 'modeTopple', 'modeKeep', 'rebuild', 'fire', 'bigrod', 'burst', 'power', 'ammo:acorn', 'ammo:marble', 'ammo:coconut', 'ammo:lid', 'ammo:float', 'ammo:bottle', 'ammo:rod'].concat(M.n === 'Keep' ? ['keepDone'] : []);
      var missing = need.filter(function (n) { return ids.indexOf(n) < 0; });
      check(tag + ': the play HUD shows the gear, mode switch, Rebuild' + (M.n === 'Keep' ? ', Done' : '') + ', seven round ammo buttons, FIRE, Big bolt, Burst and Power', missing.length === 0, missing.join(','));
      audit(tag + ' (drawer closed)', d0, 44);
      var dh = await page.evaluate('document.getElementById("hitReplay").classList.add("show");(' + collect.toString() + ')()');       /* in one go: the page's own tick takes the class off again when there is no win */
      audit(tag + ' (drawer closed, Replay the hit showing)', dh, 44);
      var sc = await page.evaluate(function () { var s = document.getElementById('score'), t = s.innerText.replace(/\s+/g, ' '); return { t: t, pills: s.querySelectorAll('.pill').length }; });
      check(tag + ': the score strip shows knocked out %, bells down x of n, shots and ' + (M.n === 'Keep' ? 'stars' : 'standing') + ' (' + sc.t + ')', sc.pills === 4 && /Knocked out \d+%/.test(sc.t) && /Bells? down.*\d+ of \d+/.test(sc.t) && (M.n === 'Keep' ? /Shots left \d+ of 6/.test(sc.t) && /Stars/.test(sc.t) : /Shots \d+/.test(sc.t) && /Standing \d+/.test(sc.t)), sc.t);
      /* open the drawer */
      await page.click('#gear'); await page.waitForTimeout(400);
      var d1 = await page.evaluate(collect, '#drawer');
      var dids = d1.items.map(function (x) { return x.id; });
      var dneed = ['look', 'juice', 'shake', 'trails', 'boltHead', 'shadows', 'pieces', 'shape', 'rubbleSw', 'tier', 'buildFort', 'ground', 'tide', 'autoTide', 'fly', 'aimHelp', 'replay', 'bench'];
      var dmiss = dneed.filter(function (n) { return dids.indexOf(n) < 0; });
      check(tag + ': the open drawer holds pieces, shape, tide, ground, tier, look, juice, bench and the rest', dmiss.length === 0 && /Tested up to/.test(await page.evaluate(function () { return document.getElementById('tested').textContent; })), dmiss.join(','));
      /* inside the scrolling drawer: no overlaps, widths inside the drawer, every control reachable by scrolling */
      var reach = await page.evaluate(function () {
        var d = document.getElementById('drawer'), dr = d.getBoundingClientRect(), bad = [], small = [], all = Array.prototype.slice.call(d.querySelectorAll('button,input,select')).filter(function (e) { var r = e.getBoundingClientRect(); return getComputedStyle(e).display !== 'none' && r.width > 0 && getComputedStyle(e).visibility !== 'hidden'; }), rects = [];
        all.forEach(function (e) { e.scrollIntoView({ block: 'center' }); var r = e.getBoundingClientRect(); if (r.left < dr.left - 1 || r.right > dr.right + 1 || r.top < -1 || r.bottom > innerHeight + 1) bad.push(e.id); if (r.height < 43.5 || r.width < 43.5) small.push((e.id || e.className) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
        d.scrollTop = 0; var ov = [];
        all.forEach(function (e, i) { var a = e.getBoundingClientRect(); for (var j = i + 1; j < all.length; j++) { var b = all[j].getBoundingClientRect(), ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ox > 2 && oy > 2) ov.push(e.id + '/' + all[j].id); } });
        return { n: all.length, bad: bad, small: small, ov: ov, w: Math.round(dr.width) };
      });
      check(tag + ': ' + reach.n + ' controls in the open drawer: reachable, 44 px or more, no overlaps (drawer ' + reach.w + ' px wide)', reach.bad.length === 0 && reach.small.length === 0 && reach.ov.length === 0, JSON.stringify(reach));
      await page.screenshot({ path: path.join(__dirname, 'shots', 'rubble-30-drawer-' + V.short + '-' + M.n.toLowerCase() + '.png') });
      await page.click('#drawerClose'); await page.waitForTimeout(400);
      var back = await page.evaluate(function () { return document.getElementById('drawer').classList.contains('open'); });
      check(tag + ': Close puts the drawer away again', !back, '');
      if (M.n === 'Keep') await page.screenshot({ path: path.join(__dirname, 'shots', 'rubble-31-keep-' + V.short + '.png') }); else await page.screenshot({ path: path.join(__dirname, 'shots', 'rubble-32-topple-' + V.short + '.png') });
    }
    await ctx.close();
  }
  check('zero console errors and zero page errors (HUD test)', errs.length === 0, errs.slice(0, 5).join(' | '));
  await browser.close(); server.close();
  fs.writeFileSync(path.join(__dirname, 'test_hud_results.json'), JSON.stringify({ when: new Date().toISOString(), results: results, errors: errs }, null, 1));
  console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.length + ' checks)'); process.exit(fails ? 1 : 0);
}
main().catch(function (e) { console.error(e); try { server.close(); } catch (x) { } process.exit(2); });
