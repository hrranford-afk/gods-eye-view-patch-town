/* Brick Lab page check (Playwright, software GL, so only relative numbers mean anything).
   Run:  NODE_PATH=$(npm root -g) node tests/page-test.js [--bench]
   Serves the folder itself (no extra package), loads the page, builds each preset, fires a volley, checks for errors,
   and checks that the browser's determinism hash equals the Node one. With --bench it also runs ?bench=1&quick=1 and prints the JSON. */
'use strict';
var http = require('http'), fs = require('fs'), path = require('path');
var pw = require('playwright'), ROOT = path.join(__dirname, '..');
var R = require(path.join(ROOT, 'vendor/rapier/rapier.cjs.js')), BL = require(path.join(ROOT, 'sim.js'));
var TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.json': 'application/json', '.wasm': 'application/wasm' };
var fails = 0;
function check(n, ok, d) { if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + n + (d ? '   [' + d + ']' : '')); }
(async function () {
  await R.init();
  var nodeHash = BL.detRun(R, 1234).hash;
  var srv = http.createServer(function (q, r) {
    var f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
    if (f.indexOf(ROOT) !== 0 || !fs.existsSync(f)) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  await new Promise(function (ok) { srv.listen(0, ok); });
  var base = 'http://localhost:' + srv.address().port + '/index.html';
  var b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  var p = await b.newPage({ viewport: { width: 1180, height: 820 } }), errs = [];
  p.on('pageerror', function (e) { errs.push(e.message); }); p.on('console', function (m) { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text()); });
  await p.goto(base + '?manual=1'); await p.waitForFunction('window.__ready===true', null, { timeout: 30000 });
  check('page loads, Rapier starts, first preset is built', (await p.evaluate(function () { return __lab.state().pieces; })) === 120);
  var want = { wall: [120, 120], tower: [150, 160], cottage: [220, 280], castle: [370, 420], pile500: [440, 480], pile1000: [1000, 1060], pile2000: [1900, 2000] };
  for (var k in want) {
    var st = await p.evaluate(function (k) { __lab.build(k); __lab.advance(60, false); __lab.render(); return __lab.state(); }, k);
    check(k + ' builds (' + st.pieces + ' pieces) and stands (nothing awake after 1 s of extra steps counted: moved ' + st.moved + ')', st.pieces >= want[k][0] && st.pieces <= want[k][1] && st.moved === 0, 'awake ' + st.awake);
  }
  var v = await p.evaluate(function () {
    __lab.build('wall'); var f = { x: 0, y: 0.5, z: 2.7 };
    for (var s = 0; s < 3; s++) { __fireAt('big', (s - 1) * 1.1, 0.8, -0.2, 16, f); __lab.advance(36, false); }
    __lab.advance(300, true); return __lab.state();
  });
  check('a volley of three big marbles in the page moves most of the wall', v.moved >= 55, v.moved + ' of ' + v.pieces + ' moved, ' + v.awake + ' still awake');
  check('no page errors', errs.length === 0 && v.errors.length === 0, errs.concat(v.errors).join(' | '));
  /* real pointer use: press, drag back, release fires a shot; build by hand places pieces; text round trip */
  var p3 = await b.newPage({ viewport: { width: 1180, height: 820 } }); await p3.goto(base); await p3.waitForFunction('window.__ready===true', null, { timeout: 30000 });
  await p3.mouse.move(590, 500); await p3.mouse.down(); await p3.mouse.move(590, 560, { steps: 3 }); await p3.mouse.move(590, 660, { steps: 3 }); await p3.mouse.up();
  await p3.waitForTimeout(1500);
  check('press, drag back, release fires a ball', (await p3.evaluate(function () { return __lab.state().shots; })) === 1);
  await p3.click('#bHand'); await p3.mouse.click(520, 330); await p3.mouse.click(660, 330); await p3.mouse.click(590, 300);
  var hb = await p3.evaluate(function () { return __lab.state().pieces; });
  check('build by hand: three taps place three pieces', hb === 3, 'pieces ' + hb);
  await p3.click('#bSettle'); await p3.waitForTimeout(2500);
  await p3.click('#bText'); var txt = await p3.inputValue('#ta');
  check('base as text lists the placed pieces', txt.split('\n').length === 3 && /^brick /.test(txt), txt.split('\n')[0]);
  check('no errors in the interactive page', (await p3.evaluate(function () { return window.__errors.length; })) === 0);
  await p3.close();
  /* the same determinism procedure in the browser (Chromium wasm) against Node: */
  var bh = await p.evaluate(async function () { var m = await import('./vendor/rapier/rapier.es.js'); await m.default.init(); return window.BL.detRun(m.default, 1234).hash; });
  check('determinism across engines: browser hash equals Node hash', bh === nodeHash, 'browser ' + bh + ' / node ' + nodeHash);
  if (process.argv.indexOf('--bench') > 0) {
    var p2 = await b.newPage({ viewport: { width: 1180, height: 820 } }); await p2.goto(base + '?bench=1&quick=1&rapier=014');
    await p2.waitForFunction('window.__bench&&window.__bench.done===true', null, { timeout: 1500000 });
    var bj = await p2.evaluate(function () { return window.__bench; });
    await p2.screenshot({ path: path.join(ROOT, 'shots/brick-6.png') });
    fs.writeFileSync(path.join(__dirname, 'bench-quick.json'), JSON.stringify(bj, null, 1));
    check('bench page finishes with all seven builds and no errors', bj.results.length === 7 && bj.errors.length === 0 && bj.determinismHash === nodeHash, 'hash ' + bj.determinismHash);
    bj.results.forEach(function (r) { console.log('  ' + r.name + ': ' + r.pieces + ' pieces, stand max ' + r.stand.maxDispMm.toFixed(2) + ' mm, phys avg ' + r.stand.physAvg.toFixed(2) + ' / ' + r.volley.physAvg.toFixed(2) + ' ms, worst ' + r.volley.physMax.toFixed(1) + ', frame ' + r.volley.frameAvg.toFixed(0) + ' ms (software GL), draw-only ' + r.render.frameAvg.toFixed(0) + ' ms, verdict ' + r.verdict + ', moved ' + r.volley.moved); });
  }
  if (process.argv.indexOf('--bench') > 0) {
    /* all three builds in one page (two scenes each), their hashes against Node's; the chooser; the error path */
    var p4 = await b.newPage({ viewport: { width: 1180, height: 820 } }); await p4.goto(base + '?bench=1&quick=1');
    var links = await p4.evaluate(function () { return document.querySelectorAll('#bench a.btn').length; });
    check('bench chooser shows four buttons (three builds and all)', links === 4, links + ' buttons');
    await p4.goto(base + '?bench=1&quick=1&rapier=nope'); await p4.waitForTimeout(1500);
    check('an unknown Rapier build gives a plain message, not a blank page', /Cannot start/.test(await p4.evaluate(function () { return document.body.innerText; })));
    await p4.goto(base + '?bench=1&quick=1&rapier=all&list=wall,castle'); await p4.waitForFunction('window.__bench&&window.__bench.done===true', null, { timeout: 1500000 });
    var ab = await p4.evaluate(function () { return window.__bench; }), ok3 = true, det = [];
    for (var key of ['014', '021', '021simd']) { var L = await BL.loadRapier(key, ROOT), nh = BL.detRun(L.R, 1234).hash, bb = ab.builds[key]; det.push(key + ' ' + nh + '/' + (bb && bb.determinismHash)); if (!bb || bb.determinismHash !== nh) ok3 = false; }
    check('all three builds run in the page, and each page hash equals the Node hash', ok3 && ab.fastest, det.join('  ') + '  fastest ' + ab.fastest);
    fs.writeFileSync(path.join(__dirname, 'bench-quick-all.json'), JSON.stringify(ab, null, 1));
    await p4.screenshot({ path: path.join(ROOT, 'shots/brick-8-compare.png') });
    await p4.close();
  }
  await b.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(2); });
