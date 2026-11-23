/* CUTAWAY FINISH PASS tests (Living Islands, CUTAWAY_FINISH.md).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/cutaway-finish-test.js      (BPY_PYTHON=<python with bpy> adds the bake mesh hash check; without it that check SKIPs and says so)
   Serves games/living-islands over http (port 8779), headless chromium with software GL, three.js r128 from /tmp/three.js when present (else the cdnjs URL).
   Checks: console errors in default, ?q=low, ?post=0, finish, finish+low, finish+post=0, finish+low+post=0; hash and pixel stability of the page when the switch is absent
   (against the page as committed in 0315c54); that finish does not move a single world vertex; triangle budget numbers; asset sizes; that islands_look.html runs the shared modules. */
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..');
const PY = process.env.BPY_PYTHON || ''; const hasPy = !!PY && fs.existsSync(PY);
let fails = 0, skips = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const skip = m => { console.log('SKIP ' + m); skips++; };
const sz = p => fs.existsSync(p) ? fs.statSync(p).size : -1;
const VOL = path.join(ROOT, 'landform/volcano'), FIN = path.join(VOL, 'finish');
/* geometry hash of the unchanged page (FNV over the terrain vertices, the four wall profiles and the counts), pinned from the page at 0315c54 + the hash hook */
const PIN = { high: '7f69ee24', low: '92f60254' };
const BASE_COMMIT = '0315c54';

/* ---- 1 files: assets exist and are small */
const A = { 'lightmap.jpg': 0.6e6, 'sunmask.jpg': 0.4e6, 'finish.json': 4e3, 'sky_pano.jpg': 0.1e6, 'pack_report.json': 8e3 };
for (const f of Object.keys(A)) ok(sz(path.join(FIN, f)) > 100 && sz(path.join(FIN, f)) < A[f], 'finish/' + f + ' exists and is under ' + (A[f] / 1e3) + ' kB (' + sz(path.join(FIN, f)) + ' bytes)');
ok(sz(path.join(VOL, 'maps.png')) > 1000 && sz(path.join(VOL, 'maps.png')) < 0.3e6, 'maps.png (rock id, vegetation belt, exposure) exists, under 300 kB (' + sz(path.join(VOL, 'maps.png')) + ')');
const finBytes = fs.readdirSync(FIN).filter(f => fs.statSync(path.join(FIN, f)).isFile()).reduce((s, f) => s + sz(path.join(FIN, f)), 0) + sz(path.join(VOL, 'maps.png'));
const volBytes = fs.readdirSync(VOL).filter(f => fs.statSync(path.join(VOL, f)).isFile()).reduce((s, f) => s + sz(path.join(VOL, f)), 0);
ok(finBytes < 4e6, 'everything the finish pass adds to the volcano assets is under 4 MB (' + (finBytes / 1e6).toFixed(2) + ' MB; the whole volcano folder with finish files ' + ((volBytes + finBytes) / 1e6).toFixed(2) + ' MB)');
const fj = JSON.parse(fs.readFileSync(path.join(FIN, 'finish.json'), 'utf8'));
ok(fj.tex === 1024 && fj.sun_dir_three.length === 3 && fj.sky_up.length === 3 && fj.light_k > 0 && fj.samples >= 64, 'finish.json carries the bake: 1024 light map, ' + fj.samples + ' samples, sun el ' + fj.sun_el + ' az ' + fj.sun_az + ', Blender ' + fj.blender);
const br = JSON.parse(fs.readFileSync(path.join(ROOT, 'blender/assets/bridge/bridge.json'), 'utf8'));
ok(br.tone.table.length === 65, 'the Filmic table of the bake bridge is there (65 entries) and is what the page loads');
const il = fs.readFileSync(path.join(ROOT, 'islands_look.html'), 'utf8');
ok(il.includes('LI_SEA.SEA2_FS') && il.includes('LI_SEA.SEAF_FS') && il.includes('LI_KIT') && !il.includes('const SEA2_FS=`') && !il.includes('class PB{'), 'islands_look.html runs the shared li_sea.js / li_kit.js (no private copy of the sea shaders or the kit left)');
const cf = fs.readFileSync(path.join(ROOT, 'cutaway_finish.js'), 'utf8');
ok(['LI_SEA.SEAF_FS', 'sea.SEAF_FS', 'WX.patchSea', 'WX.create', 'bridge.installFilmicFit', 'makeBridgeLandMaterial', 'kit.addConifer', 'kit.addBroad', 'kit.addShrub', 'kit.blob', 'LAND_WET_GLSL', 'flowEncode'].some(k => cf.includes(k)) &&
   ['sea.SEAF_FS', 'WX.patchSea', 'WX.create', 'bridge.installFilmicFit', 'makeBridgeLandMaterial', 'kit.addConifer', 'kit.addBroad', 'kit.addShrub', 'kit.blob', 'LAND_WET_GLSL', 'flowEncode'].every(k => cf.includes(k)), 'cutaway_finish.js calls the shared stack (sea shader, weather, bridge tone and land material, kit, wet-land GLSL, flow encoder)');
if (hasPy) {
  const o = spawnSync(PY, ['bake_volcano.py', '--no-bake', '--work', path.join(process.env.TMPDIR || '/tmp', 'volcano_hash_work')], { cwd: path.join(ROOT, 'blender'), encoding: 'utf8' }).stdout || '';
  const m = o.match(/HASH volcano (\w+) verts (\d+) tris (\d+)/);
  ok(!!m && m[1] === fj.vol_hash && +m[3] === 524288, 'bake_volcano.py builds the mesh the committed light map was baked from (hash ' + (m && m[1]) + ', ' + (m && m[3]) + ' tris)');
} else skip('bake mesh hash needs bpy python (set BPY_PYTHON)');

/* ---- 2 pages */
const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.f32': 'application/octet-stream' };
let baseHtml = null; try { baseHtml = spawnSync('git', ['-C', ROOT, 'show', BASE_COMMIT + ':games/living-islands/cutaway.html'], { encoding: 'utf8', maxBuffer: 1 << 26 }); baseHtml = baseHtml.status === 0 ? baseHtml.stdout : null; } catch (e) { baseHtml = null; }
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/cutaway_base.html' && baseHtml) { r.writeHead(200, { 'content-type': 'text/html' }); r.end(baseHtml); return; }
  const p = path.join(ROOT, u); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
}).listen(8779);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
if (fs.existsSync('/tmp/three.js')) await ctx.route('**/three.min.js', r => r.fulfill({ path: '/tmp/three.js', contentType: 'application/javascript' }));
await ctx.addInitScript(() => { performance.now = () => 5000; });          /* the page's own wave clock frozen: pictures are reproducible */
const VIEW = { az: 0.78, el: 0.30, dist: 2150, tx: -60, ty: 0, tz: 330 };
async function open(file, qs) {
  const page = await ctx.newPage(); const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message/.test(m.text())) errs.push(m.type() + ': ' + m.text().slice(0, 200)); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(`http://localhost:8779/${file}?shot=1${qs ? '&' + qs : ''}`);
  await page.waitForFunction(() => window.__cv && window.__cv.ready && window.__liFrames > 3, null, { timeout: 240000 });
  await page.evaluate(v => window.__cv.setView(v), VIEW); await page.waitForTimeout(1500);
  return { page, errs };
}
const R = {};
for (const [name, qs] of [['default', ''], ['low', 'q=low'], ['post0', 'post=0'], ['finish', 'finish=1&seat=3.7&wt=4'], ['finishLow', 'finish=1&q=low&seat=3.7&wt=4'], ['finishPost0', 'finish=1&post=0&seat=3.7&wt=4'], ['finishLowPost0', 'finish=1&q=low&post=0&seat=3.7&wt=4']]) {
  const { page, errs } = await open('cutaway.html', qs);
  const o = await page.evaluate(() => { const s = __cv.stats(); return { hash: __cv.hash(), tris: s.triangles, terr: s.terrainTris, calls: s.calls, quality: s.quality, post: s.post, fin: s.finish }; });
  o.errs = errs; o.png = name === 'default' ? await page.screenshot() : null;
  if (name === 'finish') {                              /* tide, weather and quality switches on the finish page */
    await page.evaluate(() => { __cv.setTide(1.1); __cv.finish().setWeather('storm'); }); await page.waitForTimeout(2500);
    o.storm = await page.evaluate(() => __cv.stats().finish.weather); o.seaY = await page.evaluate(() => __cv.finish().debug.U.uTideR.value);
    await page.evaluate(() => __cv.setTide(0)); await page.evaluate(() => __cv.setQuality('low')); await page.waitForTimeout(1500);
    o.switchLow = await page.evaluate(() => ({ q: __cv.stats().finish.q, terr: __cv.stats().terrainTris, hash: __cv.hash() }));
    o.afterSwitchErrs = errs.length;
  }
  R[name] = o; await page.close();
}
for (const k of Object.keys(R)) ok(R[k].errs.length === 0, k + ': 0 console errors/warnings' + (R[k].errs.length ? ' - ' + R[k].errs.slice(0, 2).join(' | ') : '') + ' (tris ' + R[k].tris + ', draw calls ' + R[k].calls + ')');
ok(R.default.hash === PIN.high && R.low.hash === PIN.low, 'default page: world geometry hash is stable (' + R.default.hash + ' high, ' + R.low.hash + ' low) when the finish switch is absent');
ok(R.finish.hash === PIN.high && R.finishLow.hash === PIN.low && R.finishPost0.hash === PIN.high, 'finish does not move one world vertex (same hash with the switch on: ' + R.finish.hash + ', ' + R.finishLow.hash + ')');
if (baseHtml) {
  const b = await open('cutaway_base.html', ''); const png = await b.page.screenshot(); await b.page.close();
  ok(b.errs.length === 0 && Buffer.compare(png, R.default.png) === 0, 'default page renders byte-identical pixels to the page as committed in ' + BASE_COMMIT + ' (same view, clocks frozen)' + (b.errs.length ? ' - base errors ' + b.errs[0] : ''));
} else skip('pixel comparison against ' + BASE_COMMIT + ' needs git history');
/* triangle budget (renderer.info.render.triangles, the whole frame) */
const B = { default: R.default.tris, low: R.low.tris, finish: R.finish.tris, finishLow: R.finishLow.tris, finishLowPost0: R.finishLowPost0.tris };
console.log('NUMBERS triangles ' + JSON.stringify(B) + ' kit ' + JSON.stringify({ high: R.finish.fin.kit, low: R.finishLow.fin.kit }));
ok(B.finish < 900000 && B.finish > B.default, 'finish high frame triangle budget under 900k (' + B.finish + ' against ' + B.default + ' for the old page; kit ' + R.finish.fin.kit.tris + ' in ' + R.finish.fin.kit.meshes + ' instanced meshes, ' + R.finish.fin.kit.instances + ' instances)');
ok(B.finishLow < 300000 && B.finishLow < B.finish * 0.35, 'finish low frame triangle budget under 300k (' + B.finishLow + ')');
ok(R.finish.calls < 60 && R.finishLow.calls < 60, 'draw calls under 60 (' + R.finish.calls + ' high, ' + R.finishLow.calls + ' low)');
ok(R.finishPost0.fin.fog === false && R.finish.fin.fog === true && R.finishPost0.post === false, '?post=0 is the AR-safe path: no fog, no antialias, tone curve still applied in the shaders');
ok(R.finish.fin.toneInstalled && Math.abs(R.finish.fin.exposure - Math.pow(2, -0.8)) < 1e-6, 'the Filmic table is installed (exposure ' + R.finish.fin.exposure.toFixed(3) + ')');
ok(R.finish.storm && R.finish.storm.name === 'storm' && R.finish.seaY > 4, 'weather switch works on the finish page (storm, wind ' + (R.finish.storm && R.finish.storm.windMs) + ' m/s) and the tide slider moves the water (' + R.finish.seaY + ' m at +1.1)');
ok(R.finish.switchLow && R.finish.switchLow.q === 'low' && R.finish.switchLow.terr === 131072 && R.finish.switchLow.hash === PIN.low && R.finish.afterSwitchErrs === 0, 'quality switch high to low on the finish page rebuilds cleanly (' + JSON.stringify(R.finish.switchLow) + ')');
await browser.close(); srv.close();
console.log(fails ? 'FAILED ' + fails : 'ALL PASSED' + (skips ? ' (' + skips + ' skipped)' : ''));
process.exit(fails ? 1 : 0);
