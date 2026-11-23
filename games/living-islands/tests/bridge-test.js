/* BAKE BRIDGE PILOT TESTS (Living Islands). Run: BPY_PYTHON=<python with bpy> NODE_PATH=$(npm root -g) node games/living-islands/tests/bridge-test.js
   bpy-dependent tests (mesh hash determinism, the old blender-test) are SKIPPED and say so when BPY_PYTHON is not set.
   File tests run on the committed outputs; the page tests need playwright and serve blender/ over http with local three.js r128 (THREE_JS env, default /tmp/three.js; else the cdnjs URL). */
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..'), BL = path.join(ROOT, 'blender'), BR = path.join(BL, 'assets/bridge'), SH = path.join(ROOT, 'shots');
const PY = process.env.BPY_PYTHON || ''; const hasPy = !!PY && fs.existsSync(PY);
let fails = 0, skips = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const skip = (m) => { console.log('SKIP ' + m); skips++; };
const sz = (p) => fs.existsSync(p) ? fs.statSync(p).size : -1;
const pngW = (p) => { const b = fs.readFileSync(p); return b.readUInt32BE(16); };

/* 1 determinism: the bake's mesh (positions and both UV sets) hashes the same twice */
if (hasPy) {
  const h = () => (spawnSync(PY, ['bake_bridge.py', '--no-bake', '--out', path.join(process.env.TMPDIR || '/tmp', 'bridge_hash_out')], { cwd: BL, encoding: 'utf8' }).stdout.match(/HASH land (\w+)/) || [])[1];
  const a = h(), b = h();
  ok(/^[0-9a-f]{16}$/.test(a || '') && a === b, 'bake_bridge.py scene (land + both UV sets) has a stable mesh hash (' + a + ')');
  if (fs.existsSync(path.join(BR, 'bake_info.json'))) ok(JSON.parse(fs.readFileSync(path.join(BR, 'bake_info.json'), 'utf8')).mesh_hash === a, 'the committed bake was made from this mesh (hash in bake_info.json matches)');
} else skip('mesh hash determinism needs bpy python (set BPY_PYTHON)');

/* 2 outputs exist and are within the size limits */
const need = ['island_bridge.glb', 'lightmap.jpg', 'normal.jpg', 'sunmask.png', 'bridge.json', 'bake_info.json', 'pack_report.json', 'sky_pano.jpg', 'whitecard_blender.json'];
for (const f of need) ok(sz(path.join(BR, f)) > 100, 'assets/bridge/' + f + ' exists (' + sz(path.join(BR, f)) + ' bytes)');
const total = ['island_bridge.glb', 'lightmap.jpg', 'normal.jpg', 'sunmask.png', 'bridge.json'].reduce((s, f) => s + Math.max(0, sz(path.join(BR, f))), 0) + Math.max(0, sz(path.join(BL, 'assets/land_depth.png')));
ok(total < 7e6, 'one island (GLB + light map + normal + sun mask + json + depth map) is under 7 MB (' + (total / 1e6).toFixed(2) + ' MB)');
ok(sz(path.join(BR, 'island_bridge.glb')) < 7e6, 'GLB under 7 MB (' + sz(path.join(BR, 'island_bridge.glb')) + ')');
for (const f of ['bridge-A', 'bridge-B', 'bridge-C', 'bridge-D', 'bridge-E', 'bridge-blender', 'bridge-compare', 'bridge-heat']) {
  const p = path.join(SH, f + '.png'); ok(sz(p) > 20000 && sz(p) < 1.3e6 && pngW(p) <= 1200, 'shots/' + f + '.png exists, under 1.3 MB and 1200 px wide (' + sz(p) + ' bytes, ' + (sz(p) > 0 ? pngW(p) : 0) + ' px)');
}
/* glb: TEXCOORD_1 present, textures 2048 */
if (sz(path.join(BR, 'island_bridge.glb')) > 0) {
  const b = fs.readFileSync(path.join(BR, 'island_bridge.glb')); const n = b.readUInt32LE(12); const j = JSON.parse(b.slice(20, 20 + n).toString());
  const attrs = new Set(j.meshes.flatMap(m => m.primitives.flatMap(p => Object.keys(p.attributes))));
  ok(attrs.has('TEXCOORD_1') && attrs.has('TEXCOORD_0'), 'GLB land has TEXCOORD_0 and TEXCOORD_1 (' + [...attrs].join(',') + ')');
  const info = JSON.parse(fs.readFileSync(path.join(BR, 'bake_info.json'), 'utf8'));
  ok(info.tex === 2048 && info.pad_px === 16, 'atlas is 2048 with 16 px padding');
}

/* 3 the page loads with 0 console errors, uv2 present, patched shader, bridge mode lights the land */
let chromium; try { chromium = require('playwright').chromium; } catch (e) { skip('playwright not found (NODE_PATH=$(npm root -g))'); }
if (chromium && sz(path.join(BR, 'island_bridge.glb')) > 0) {
  const { startServer, openPage } = await import('./bridge-render.js');
  const srv = startServer(); const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const { page, ctx, errs } = await openPage(browser, port, 'baked_bridge.html', 't=3&hud=0');
  await page.waitForTimeout(1500);
  const bad = errs.filter(e => !/GL Driver Message|GPU stall|ReadPixels/.test(e));
  const st = await page.evaluate(() => ({ tris: window.__bl.tris, errors: window.__bl.errors, info: window.__bl.info }));
  ok(bad.length === 0 && st.errors.length === 0, 'baked_bridge.html loads with 0 console errors (tris ' + st.tris + ')' + (bad.length ? ': ' + bad.slice(0, 3).join(' | ') : ''));
  ok(st.info.uv2 === true && !st.info.uv2_copied_from_uv, 'land geometry has uv2 straight from TEXCOORD_1 (no JS copy needed): ' + JSON.stringify(st.info.attributes));
  ok(st.info.patched === true, 'the land shader patch applied (sun mask, sky tint)');
  await ctx.close();
  /* white card: page half against the Blender half */
  const wcp = path.join(BR, 'whitecard_blender.json');
  if (fs.existsSync(wcp)) {
    const wc = JSON.parse(fs.readFileSync(wcp, 'utf8'));
    const read = async (q) => { const c2 = await browser.newContext({ viewport: { width: 64, height: 64 } }); await c2.route('**/three.min.js', r => r.fulfill({ path: process.env.THREE_JS || '/tmp/three.js', contentType: 'application/javascript' })); const p = await c2.newPage(); await p.goto('http://127.0.0.1:' + port + '/bridge_whitecard.html?' + q); await p.waitForFunction(() => window.__wc && window.__wc.ready); const v = await p.evaluate(() => window.__wc); await c2.close(); return v; };
    const a = await read('rgb=' + wc.sky_bake_rgb.join(',')); const b = await read('sun=' + wc.sun.strength + '&col=' + wc.sun.color.join(',') + '&el=' + wc.sun.el);
    const rel = (x, y) => Math.max(...x.map((v, i) => Math.abs(v - y[i]) / Math.max(y[i], 0.05)));
    ok(rel(a.rgb_linear, a.texel_linear) < 0.04, 'white card, light map: page shows the texel it was given (albedo x texel; r128 PI cancels Lambert 1/PI): ' + a.rgb_linear.map(v => v.toFixed(3)) + ' vs ' + a.texel_linear.map(v => v.toFixed(3)));
    ok(rel(a.rgb_linear, wc.sky_only_render_rgb) < 0.08, 'white card, sky: page matches the Cycles render of a white card under the sky (' + wc.sky_only_render_rgb.map(v => v.toFixed(3)) + ')');
    ok(rel(b.rgb_linear, wc.sun_only_render_rgb) < 0.05, 'white card, sun: DirectionalLight of S/PI matches Cycles (page ' + b.rgb_linear.map(v => v.toFixed(3)) + ', Cycles ' + wc.sun_only_render_rgb.map(v => v.toFixed(3)) + ')');
  }
  await browser.close(); srv.close();
}

/* 4 the comparison script runs on the committed shots and its numbers are plausible */
const cmpOut = path.join(process.env.TMPDIR || '/tmp', 'bridge_cmp_test'); fs.mkdirSync(cmpOut, { recursive: true });
if (sz(path.join(SH, 'bridge-blender.png')) > 0) {
  const r = spawnSync('python3', [path.join(BL, 'tools/bridge_compare.py'), '--ref', path.join(SH, 'bridge-blender.png'), '--shots', SH, '--out', cmpOut], { encoding: 'utf8' });
  ok(r.status === 0, 'bridge_compare.py runs' + (r.status ? ': ' + (r.stderr || '').slice(-300) : ''));
  if (r.status === 0) {
    const m = JSON.parse(fs.readFileSync(path.join(cmpOut, 'bridge-metrics.json'), 'utf8'));
    const g = Object.values(m.variants).map(v => v.ground);
    ok(g.length >= 5 && g.every(x => x.mean_Y > 0.02 && x.mean_Y < 0.98 && x.emd >= 0 && x.emd < 0.6 && x.block_dE_median >= 0 && x.block_dE_median < 80 && x.p5 <= x.p50 && x.p50 <= x.p95), 'metrics in plausible ranges for all variants (ground mean Y, EMD, block dE, percentiles ordered)');
    const same = spawnSync('python3', [path.join(BL, 'tools/bridge_compare.py'), '--ref', path.join(SH, 'bridge-blender.png'), '--shots', (() => { const d = path.join(cmpOut, 'same'); fs.mkdirSync(d, { recursive: true }); fs.copyFileSync(path.join(SH, 'bridge-blender.png'), path.join(d, 'bridge-C.png')); return d; })(), '--variants', 'C', '--out', path.join(cmpOut, 'same-out')], { encoding: 'utf8' });
    const ms = JSON.parse(fs.readFileSync(path.join(cmpOut, 'same-out/bridge-metrics.json'), 'utf8')).variants.C.ground;
    ok(ms.emd < 1e-6 && ms.block_dE_median < 1e-3 && Math.abs(ms.dY_mean) < 1e-6, 'comparing the Blender image with itself gives zero distance (sanity)');
  }
} else skip('shots/bridge-blender.png missing');

/* 5 the existing blender test still passes */
if (hasPy) { const r = spawnSync('node', [path.join(HERE, 'blender-test.js')], { encoding: 'utf8', env: { ...process.env } }); const last = r.stdout.trim().split('\n').slice(-1)[0]; ok(r.status === 0, 'existing tests/blender-test.js still passes (' + last + ')'); }
else skip('existing blender-test needs bpy python');
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED' + (skips ? ' (' + skips + ' skipped)' : ''));
process.exit(fails ? 1 : 0);
