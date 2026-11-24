/* WORLD VIEW tests (Living Islands, WORLD_VIEW.md). Headless chromium, software GL, file:// pages.
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/world-view-test.js
   Checks: world files (count, size, sha, export determinism); 0 console errors for each of the 12 worlds in default, ?q=low and ?post=0; triangle budget (high under 150k, low smaller);
   determinism per seed (hash independent of the clocks) and difference between seeds; no floating or sunk content (trees, houses, tents, moored boats against the height function);
   the page without the switch is unchanged (hash 8d962c0c, 88,790 triangles, no world API); variety over the 12 renders (blender/variety_judge.py mean pairwise similarity under 0.6). */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import crypto from 'node:crypto';
import { launch, ROOT } from './shoot.js';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'landform/worlds/index.json'), 'utf8')).worlds;
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
/* ---- 1 files */
ok(idx.length === 12, '12 worlds exported: ' + idx.map(w => w.seed).join(' '));
ok(new Set(idx.map(w => w.province)).size === 4 && ['A', 'B', 'C', 'D'].every(p => idx.some(w => w.province === p)), 'all four provinces present (' + ['A', 'B', 'C', 'D'].map(p => p + ':' + idx.filter(w => w.province === p).length).join(' ') + ')');
let tot = 0; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : tot += fs.statSync(p).size; } })(path.join(ROOT, 'landform/worlds'));
ok(tot < 6e6, 'landform/worlds is ' + (tot / 1e6).toFixed(2) + ' MB in total (under 6 MB)');
let shaOk = true; for (const w of idx) { const d = path.join(ROOT, 'landform/worlds/seed' + String(w.seed).padStart(4, '0')); const m = JSON.parse(fs.readFileSync(d + '/manifest.json', 'utf8')); const sha = crypto.createHash('sha256').update(fs.readFileSync(d + '/world.bin')).digest('hex').slice(0, 16); if (sha !== m.data_sha || fs.statSync(d + '/world.bin').size !== m.bytes) shaOk = false; }
ok(shaOk, 'every world.bin matches the sha and size in its manifest');
const ex = spawnSync('python3', [path.join(ROOT, 'landform/export_world.py'), 'check'], { encoding: 'utf8' });
ok(ex.status === 0 && (ex.stdout.match(/^SAME/gm) || []).length === 12, 're-running the exporter reproduces all 12 worlds bit for bit (' + (ex.stdout.match(/^SAME/gm) || []).length + ' SAME)');
/* ---- 2 default page unchanged */
const { browser, ctx } = await launch();
async function open(qs) {
  const page = await ctx.newPage(); const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !noise(m.text())) errs.push(m.text()); }); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + ROOT + '/islands_look.html' + qs);
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 300000 }); return { page, errs };
}
{ const { page, errs } = await open('?ui=0&q=high&seed=1122');
  const r = await page.evaluate(() => ({ h: __li.hashStatic(), t: __li.stats().tris, w: __li.world })); ok(errs.length === 0 && r.h === '8d962c0c' && r.t === 88790 && !r.w, 'default page unchanged: hash ' + r.h + ', ' + r.t + ' triangles, no world API, ' + errs.length + ' errors'); await page.close(); }
/* ---- 3 each world: errors in three modes, budget, content sanity, determinism */
const hashes = {}, tris = {};
for (const w of idx) {
  const r = {}; let bad = [];
  for (const mode of ['', '&q=low', '&post=0']) {
    const { page, errs } = await open('?world=' + w.seed + '&ui=0' + mode);
    if (errs.length) bad.push(mode + ': ' + errs[0]);
    if (mode === '') {
      await page.waitForTimeout(1200);
      const o = await page.evaluate(() => { const it = __li.world.items(), H = __li.H; const sea = (x, z) => H(x, z);
        const f = { tree: it.trees.filter(t => t[2] < 1.1 || Math.abs(sea(t[0], t[1]) - t[2]) > .05).length, house: it.houses.filter(h => h[2] < 1.0).length, tent: it.tents.filter(t => t[2] < .5).length, moored: it.moored.filter(b => sea(b[0], b[1]) > -1.2).length, shrub: it.shrubs.filter(t => t[2] < .6).length };
        return { f, n: { trees: it.trees.length, houses: it.houses.length, rocks: it.rocks.length }, tris: __li.stats().tris, h: __li.hashStatic(), land: __li.world.landFraction(), rep: __li.world.report() }; });
      r.o = o; tris[w.seed] = o.tris; hashes[w.seed] = o.h;
      ok(o.tris < 150000, 'world ' + w.seed + ' (' + w.province + ') high: ' + o.tris + ' triangles, ' + o.n.trees + ' trees, ' + o.n.houses + ' houses, ' + o.n.rocks + ' rocks');
      ok(Object.values(o.f).every(v => v === 0), 'world ' + w.seed + ' nothing floats or sinks: ' + JSON.stringify(o.f));
    } else if (mode === '&q=low') { const t = await page.evaluate(() => __li.stats().tris); ok(t < tris[w.seed], 'world ' + w.seed + ' low has fewer triangles (' + t + ')'); }
    await page.close();
  }
  ok(bad.length === 0, 'world ' + w.seed + ': 0 console errors in default, ?q=low, ?post=0' + (bad.length ? ' | ' + bad.join(' | ') : ''));
}
ok(new Set(Object.values(hashes)).size === 12, 'the 12 worlds have 12 different hashes: ' + Object.values(hashes).join(' '));
for (const seed of [153, 99]) { const a = await open('?world=' + seed + '&ui=0&seat=1'); const b = await open('?world=' + seed + '&ui=0&seat=77&auto=1'); await b.page.waitForTimeout(3000);
  const ha = await a.page.evaluate(() => __li.hashStatic()), hb = await b.page.evaluate(() => __li.hashStatic()); ok(ha === hashes[seed] && hb === hashes[seed], 'world ' + seed + ' hash is the same on reload and with other clocks (' + ha + ', ' + hb + ')'); await a.page.close(); await b.page.close(); }
{ const { page, errs } = await open('?world=153&ui=0&flow=1&seabed=1&weather=auto&macro=1&boats=2'); const t = await page.evaluate(() => __li.stats().tris); ok(errs.length === 0 && t < 150000, 'world + flow + seabed + weather + macro + boats=2: ' + t + ' triangles, ' + errs.length + ' errors'); await page.close(); }
/* ---- 4 variety over the 12 renders */
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wvvar-'));
for (const w of idx) { const { page } = await open('?world=' + w.seed + '&ui=0&q=low&seat=3&sun=40&az=-65&tide=0.15'); await page.setViewportSize({ width: 600, height: 400 }); await page.evaluate(() => __li.home()); await page.waitForTimeout(2200); await page.screenshot({ path: path.join(dir, 'w' + w.seed + '.png') }); await page.close(); }
/* the same camera and the same wooden table ring are in every frame, which the judge reads as similarity: the full frame is reported, the verdict is on the middle 60 x 65 percent (terrain and sea, no table) */
const crop = path.join(dir, 'crop'); fs.mkdirSync(crop);
spawnSync('python3', ['-c', 'import glob,os,sys\nfrom PIL import Image\nfor f in glob.glob(sys.argv[1]+"/w*.png"):\n    im=Image.open(f);W,H=im.size;im.crop((int(.2*W),int(.2*H),int(.8*W),int(.85*H))).resize((600,400)).save(sys.argv[2]+"/"+os.path.basename(f))', dir, crop]);
const judge = d => { const r = spawnSync('python3', [path.join(ROOT, 'blender/variety_judge.py'), d, '--glob', 'w*.png', '--json', path.join(d, 'v.json')], { encoding: 'utf8' }); return JSON.parse(fs.readFileSync(path.join(d, 'v.json'), 'utf8')); };
const vfull = judge(dir), vr = judge(crop);
ok(vr.images === 12 && vr.mean_pairwise < 0.6, 'variety: mean pairwise similarity of the 12 renders (terrain crop) is ' + vr.mean_pairwise + ' (under 0.6), nearest-neighbour mean ' + vr.mean_nearest + '; full frame with the table ring ' + vfull.mean_pairwise);
/* ---- 5 the worlds fix (WORLD_VIEW.md, 'The fix'): volcanic worlds have a visible relief range and a dark, desaturated basalt colour, not the old green ramp; gneiss worlds are not mauve.
   The old ramp, measured the same way before the fix (world 5): mean luma 0.38, saturation 0.43, 1 percent dark samples, relief 2.5 m. Old gneiss (153, 62): mauve share 6.6 and 13.4 percent, 5 and 2 percent dark. */
for (const seed of idx.filter(w => w.province === 'D').map(w => w.seed)) {
  const { page, errs } = await open('?world=' + seed + '&ui=0&q=low'); const st = await page.evaluate(() => LI_WORLD.last.stats(64)); const lum = .2126 * st.mean[0] + .7152 * st.mean[1] + .0722 * st.mean[2];
  ok(st.relief98 >= 25 && st.reliefMax >= 30, 'volcanic world ' + seed + ' has a visible relief range: 98th percentile ' + st.relief98.toFixed(1) + ' m, top ' + st.reliefMax.toFixed(1) + ' m of land (old windows: 2.5 m)');
  ok(st.dark >= .5 && lum <= .30 && st.sat <= .32, 'volcanic world ' + seed + ' ground is dark and unsaturated, not the green ramp: ' + (st.dark * 100).toFixed(0) + ' percent dark samples, mean luma ' + lum.toFixed(2) + ', saturation ' + st.sat.toFixed(2) + ' (old ramp 1 percent, 0.38, 0.43)');
  ok(errs.length === 0, 'volcanic world ' + seed + ': 0 console errors'); await page.close(); }
for (const seed of [153, 147, 62]) {
  const { page } = await open('?world=' + seed + '&ui=0&q=low'); const st = await page.evaluate(() => LI_WORLD.last.stats(64));
  ok(st.mauveShare <= .03 && (st.hue < 255 || st.hue > 345), 'gneiss world ' + seed + ' is not mauve: mean hue ' + st.hue.toFixed(0) + ' deg, ' + (st.mauveShare * 100).toFixed(1) + ' percent of the ground in the mauve hues 255-345 (old 6.6 to 13.4 percent)');
  ok(st.dark >= .08 && st.greenShare >= .05, 'gneiss world ' + seed + ' has dark banded rock and green turf: ' + (st.dark * 100).toFixed(0) + ' percent dark samples, ' + (st.greenShare * 100).toFixed(0) + ' percent green samples'); await page.close(); }
await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
