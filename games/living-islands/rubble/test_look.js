/* Rubble look-upgrade test (Pretty tier): per-brick colour variation, moss and wear near the ground, banners on the towers and two lanterns, foam where the sea meets the shore, the sky,
   one InstancedMesh per material, and what it costs on the iPad tier at 4,000 pieces. The physics must not change with the look. Run:  NODE_PATH=$(npm root -g) node test_look.js */
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
  async function load(q) { await page.goto(base + q, { waitUntil: 'load' }); await page.waitForFunction('window.__rubble && window.__rubble.ses && window.__rubble.ses.sim && !window.__rubble.ses.settling', null, { timeout: 400000 }); await page.waitForTimeout(2500); }
  await load('?tier=radeon&pieces=1500&shape=castle');
  /* colours */
  var col = await page.evaluate(async function () {
    var r = window.__rubble, f = r.ses.sim.fort, im = r.look.im || null, wait = function (ms) { return new Promise(function (x) { setTimeout(x, ms); }); }, out = {};
    function stats() {
      var bs = r.ses.sim.bodies, i, a, n = 0, sr = 0, sg = 0, sb = 0, sr2 = 0, lowG = 0, lowR = 0, nl = 0, hiG = 0, hiR = 0, nh = 0, arr = r.colors('brick');
      for (i = 0; i < bs.length; i++) { if (bs[i].kind !== 'brick') continue; a = arr[bs[i].slot * 3]; var g = arr[bs[i].slot * 3 + 1], b = arr[bs[i].slot * 3 + 2], gh = bs[i].cy - r.site.H(bs[i].cx, bs[i].cz); n++; sr += a; sr2 += a * a; sg += g; sb += b; if (gh < 0.3) { lowG += g; lowR += a; nl++; } else if (gh > 1.2) { hiG += g; hiR += a; nh++; } }
      var mean = sr / n; return { n: n, sd: Math.sqrt(Math.max(0, sr2 / n - mean * mean)) / mean, lowGR: lowG / lowR, hiGR: hiG / hiR, nl: nl, nh: nh };
    }
    out.pretty = stats(); r.applyLook(false); await wait(500); out.plain = stats(); r.applyLook(true); await wait(500); out.back = stats(); return out;
  });
  check('per-brick colour variation: Pretty spread ' + (col.pretty.sd * 100).toFixed(1) + ' percent of the red channel against ' + (col.plain.sd * 100).toFixed(1) + ' in Plain, and switching back restores it', col.pretty.sd > col.plain.sd * 1.5 && Math.abs(col.back.sd - col.pretty.sd) < 1e-6, JSON.stringify(col));
  check('moss and wear near the ground: bricks within 0.3 m of the ground are greener (green/red ' + col.pretty.lowGR.toFixed(2) + ', ' + col.pretty.nl + ' bricks) than those above 1.2 m (' + col.pretty.hiGR.toFixed(2) + ', ' + col.pretty.nh + ' bricks); Plain has none (' + col.plain.lowGR.toFixed(2) + ' against ' + col.plain.hiGR.toFixed(2) + ')',
    col.pretty.nl > 20 && col.pretty.nh > 20 && col.pretty.lowGR > col.pretty.hiGR * 1.15 && Math.abs(col.plain.lowGR - col.plain.hiGR) < 0.08, JSON.stringify([col.pretty, col.plain]));
  /* banners, lanterns, foam, sky */
  var dc = await page.evaluate(async function () {
    var r = window.__rubble, d = r.ses.sim.fort.design, out = {}, wait = function (ms) { return new Promise(function (x) { setTimeout(x, ms); }); }, D = r.decor();
    out.banners = D.banners; out.lanterns = D.lanterns; out.bannerVisible = D.bannerVisible; out.lanternVisible = D.lanternVisible; out.foamQuads = D.foamQuads; out.foamVisible = D.foamVisible; out.sky = r.skyVisible();
    out.bannerPos = D.bannerPos; out.fort = { cx: d.cx, cz: d.cz, baseY: d.baseY, h: d.height, hx: d.half.x, hz: d.half.z };
    r.applyLook(false); await wait(400); var P = r.decor(); out.plain = { b: P.bannerVisible, l: P.lanternVisible, f: P.foamVisible, sky: r.skyVisible() }; r.applyLook(true); await wait(400);
    var t = document.getElementById('tide'); t.value = 90; t.dispatchEvent(new Event('input')); await wait(1200); out.foamHigh = r.decor().foamQuads;
    t.value = -90; t.dispatchEvent(new Event('input')); await wait(1200); out.foamLow = r.decor().foamQuads; t.value = 0; t.dispatchEvent(new Event('input')); await wait(1200); out.foamZero = r.decor().foamQuads;
    return out;
  });
  var onFort = dc.bannerPos.every(function (p) { return p.y > dc.fort.baseY + dc.fort.h * 0.3 && Math.abs(p.x - dc.fort.cx) < dc.fort.hx + 1 && Math.abs(p.z - dc.fort.cz) < dc.fort.hz + 1; });
  check('banners on the towers: ' + dc.banners + ' pennants on poles standing on tower bricks (one for the bell and the far corners), ' + dc.lanterns + ' lanterns by the gate; visible in Pretty, hidden in Plain', dc.banners >= 2 && dc.lanterns === 2 && dc.bannerVisible && dc.lanternVisible && onFort && !dc.plain.b && !dc.plain.l, JSON.stringify(dc));
  check('foam: ' + dc.foamQuads + ' ribbon quads on the shoreline at tide 0, they follow the tide (high ' + dc.foamHigh + ', low ' + dc.foamLow + ', back at zero ' + dc.foamZero + '), hidden in Plain; the sky gradient shows in Pretty only', dc.foamVisible && dc.foamQuads > 0 && dc.foamHigh !== dc.foamZero && dc.foamZero === dc.foamQuads && !dc.plain.f && dc.sky && !dc.plain.sky, JSON.stringify({ q: dc.foamQuads, hi: dc.foamHigh, lo: dc.foamLow, z: dc.foamZero, plain: dc.plain, sky: dc.sky }));
  /* banners ride on their bricks: shoot the front and a banner moves with its brick */
  var ride = await page.evaluate(async function () {
    var r = window.__rubble, D0 = r.decor(), wait = function (ms) { return new Promise(function (x) { setTimeout(x, ms); }); }, i, moved = 0, f = r.ses.sim.fort;
    r.setAmmo('rod'); for (i = 0; i < 6; i++) { r.fire('rod', 1); }
    for (i = 0; i < 40; i++) { await wait(700); var D1 = r.decor(); moved = 0; D1.bannerPos.forEach(function (p, k) { var q = D0.bannerPos[k]; if (Math.abs(p.x - q.x) + Math.abs(p.y - q.y) + Math.abs(p.z - q.z) > 0.05) moved++; }); if (moved) break; }
    var D2 = r.decor(), ok = D2.bannerPos.every(function (p, k) { var rec = f.recs[D2.anchors[k]]; return rec.dead || Math.abs(p.x - rec.cx) < 0.3 && Math.abs(p.y - rec.cy) < 0.3 && Math.abs(p.z - rec.cz) < 0.3; });
    return { moved: moved, follows: ok, n: D2.bannerPos.length };
  });
  check('banners ride on their bricks: after a volley ' + ride.moved + ' of ' + ride.n + ' moved with the bricks they stand on, and every banner stays within 0.3 m of its brick', ride.follows, JSON.stringify(ride));
  /* the picture */
  await load('?tier=radeon&pieces=1500&shape=castle'); await page.screenshot({ path: path.join(shots, 'rubble-40-look-pretty-ipad.png') });
  /* the look must not touch the physics: the same shots give the same hash in both looks */
  var hs = [];
  for (var lk = 0; lk < 2; lk++) {
    await load('?tier=radeon&pieces=250' + (lk ? '&look=plain' : ''));
    hs.push(await page.evaluate(function () { var r = window.__rubble, s = r.ses, i, look = r.look(); r.setAmmo('marble'); for (i = 0; i < 4; i++) s.fire('marble', 0.9, 0.3, 1); s.fire('rod', 0.0, 0.4, 1); var st0 = s.sim.steps; for (i = 0; i < 300; i++) s.step(); return (look ? 'pretty ' : 'plain ') + s.sim.hash() + ' after ' + (s.sim.steps - st0) + ' steps'; }));
  }
  check('the look does not touch the physics: the same shots and 300 steps give the same hash in Pretty and Plain (' + hs.join('; ') + ')', hs[0].split(' ')[1] === hs[1].split(' ')[1] && /pretty/.test(hs[0]) && /plain/.test(hs[1]), hs.join(' | '));
  /* the cost on the iPad tier at 4,000 pieces */
  await load('?tier=ipad&pieces=4000&shape=castle');
  var cost = await page.evaluate(async function () {
    var r = window.__rubble, wait = function (ms) { return new Promise(function (x) { setTimeout(x, ms); }); }, out = {}, ims = 0, kinds = {};
    function snap() { var i = r.renderer.info.render; return { tris: i.triangles, calls: i.calls }; }
    r.applyLook(false); await wait(2500); out.plain = snap(); r.applyLook(true); await wait(2500); out.pretty = snap();
    r.scene.traverse(function (o) { if (o.isInstancedMesh) { ims++; kinds[o.material.type + (o.material.vertexColors ? '+vc' : '')] = (kinds[o.material.type + (o.material.vertexColors ? '+vc' : '')] || 0) + 1; } });
    out.instanced = ims; out.n = r.ses.sim.bodies.length; out.shadow = r.renderer.shadowMap.enabled; out.byMat = kinds;
    var mats = []; r.scene.traverse(function (o) { if (o.isInstancedMesh && o.material.uuid && mats.indexOf(o.material.uuid) < 0) mats.push(o.material.uuid); }); out.mats = mats.length;
    return out;
  });
  check('one InstancedMesh per material: ' + cost.instanced + ' instanced meshes carry ' + cost.mats + ' materials (' + JSON.stringify(cost.byMat) + ')', cost.instanced === cost.mats, JSON.stringify(cost));
  check('iPad tier, ' + cost.n + ' pieces: Plain ' + cost.plain.calls + ' draw calls and ' + cost.plain.tris + ' triangles, Pretty ' + cost.pretty.calls + ' calls and ' + cost.pretty.tris + ' triangles (the sky, water, banners, lanterns and foam are the difference); under 200,000 triangles and 40 calls', cost.n === 4000 && cost.pretty.tris < 200000 && cost.pretty.calls < 40, JSON.stringify(cost));
  results.push({ name: 'INFO look cost on the iPad tier at 4000 pieces (software GL, counts only)', ok: true, detail: JSON.stringify(cost) });
  check('zero console errors and zero page errors (look test)', errs.length === 0, errs.slice(0, 5).join(' | '));
  await browser.close(); server.close();
  fs.writeFileSync(path.join(__dirname, 'test_look_results.json'), JSON.stringify({ when: new Date().toISOString(), results: results, errors: errs }, null, 1));
  console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.length + ' checks)'); process.exit(fails ? 1 : 0);
}
main().catch(function (e) { console.error(e); try { server.close(); } catch (x) { } process.exit(2); });
