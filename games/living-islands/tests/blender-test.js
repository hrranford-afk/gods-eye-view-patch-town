/* BLENDER PILOT TESTS (Living Islands). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/blender-test.js
   Needs: BPY_PYTHON = a python with Blender-as-module (`bpy`) and numpy (a venv with `pip install bpy numpy`; if unset those tests are skipped);
          ASSET_VERIFY = path to the independent asset-verify.mjs (default: ../city-lab/shared/tools/asset-verify.mjs, present on the assets branch).
   bpy-dependent tests are SKIPPED (and say so) when no bpy python is present; file tests run on the committed outputs. */
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..'), BL = path.join(ROOT, 'blender');
const PY = process.env.BPY_PYTHON || '';
const VERIFY = process.env.ASSET_VERIFY || path.resolve(ROOT, '../city-lab/shared/tools/asset-verify.mjs');
let fails = 0, skips = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const skip = (m) => { console.log('SKIP ' + m); skips++; };
const hasPy = !!PY && fs.existsSync(PY);
const run = (args, opt = {}) => spawnSync(PY, args, { cwd: BL, encoding: 'utf8', ...opt });

/* 1 determinism */
if (hasPy) {
  const h = (s) => run(['island_common.py', String(s)]).stdout.trim();
  const a = h(1122), b = h(1122), c = h(77);
  ok(/^[0-9a-f]{16}$/.test(a) && a === b, 'island height field: same seed gives same mesh hash (' + a + ')');
  ok(a !== c, 'island height field: different seed gives a different hash (' + c + ')');
  const rh = (s) => (run(['rock_asset.py', '--no-bake', '--seed', String(s)]).stdout.match(/HASH (\w+) (\w+)/) || []).slice(1).join(' ');
  const r1 = rh(1122), r2 = rh(1122), r3 = rh(5);
  ok(r1.length > 10 && r1 === r2, 'rock mesh built in Blender (displace modifiers + decimate): same seed gives same hash (' + r1 + ')');
  ok(r1 !== r3, 'rock mesh: different seed gives a different hash');
} else skip('determinism tests need bpy python (set BPY_PYTHON)');

/* 2 file sizes (committed outputs) */
const sz = (p) => fs.existsSync(p) ? fs.statSync(p).size : -1;
const hero = path.join(ROOT, 'shots/blender-hero.png'), land = path.join(BL, 'assets/island_land.glb'), rock = path.join(BL, 'assets/rock/rock_01.glb');
ok(sz(hero) > 100000 && sz(hero) < 2e6, 'hero PNG exists and is under 2 MB (' + sz(hero) + ' bytes)');
ok(sz(land) > 100000 && sz(land) < 8e6, 'baked land GLB under 8 MB (' + sz(land) + ' bytes)');
ok(sz(rock) > 10000 && sz(rock) < 1.5e6, 'rock GLB under the prop cap 1.5 MB (' + sz(rock) + ' bytes)');
for (const f of ['shots/blender-baked-live.png', 'shots/blender-rock.png']) ok(sz(path.join(ROOT, f)) > 20000 && sz(path.join(ROOT, f)) < 2e6, f + ' exists, under 2 MB');
/* texture size inside the baked land GLB */
function glbJson(p) { const b = fs.readFileSync(p); const n = b.readUInt32LE(12); return { j: JSON.parse(b.slice(20, 20 + n).toString()), b }; }
if (sz(land) > 0) {
  const { j, b } = glbJson(land); let maxTex = 0;
  const binOff = 20 + b.readUInt32LE(12) + 8;
  for (const im of j.images || []) { const v = j.bufferViews[im.bufferView]; const d = b.slice(binOff + (v.byteOffset || 0), binOff + (v.byteOffset || 0) + v.byteLength);
    let w = 0, h = 0; if (d[0] === 0x89) { w = d.readUInt32BE(16); h = d.readUInt32BE(20); } else { let o = 2; while (o + 9 < d.length) { if (d[o] !== 0xFF) { o++; continue; } const mk = d[o + 1]; if (mk >= 0xC0 && mk <= 0xCF && mk !== 0xC4 && mk !== 0xC8 && mk !== 0xCC) { h = d.readUInt16BE(o + 5); w = d.readUInt16BE(o + 7); break; } o += 2 + d.readUInt16BE(o + 2); } }
    maxTex = Math.max(maxTex, w, h); }
  ok(maxTex === 2048, 'baked land texture is 2048 x 2048 (max ' + maxTex + ')');
}

/* 3 the independent verifier on the rock */
if (fs.existsSync(VERIFY) && sz(rock) > 0) {
  const r = spawnSync('node', [VERIFY, path.join(BL, 'assets/rock/manifest.json'), '--request', path.join(BL, 'assets/rock/request.json')], { encoding: 'utf8' });
  const lines = r.stdout.split('\n').filter(l => /^(PASS|FAIL) /.test(l));
  console.log(lines.map(l => '   ' + l).join('\n'));
  ok(lines.length === 12 && lines.every(l => l.startsWith('PASS')) && r.status === 0, 'rock GLB passes all 12 verifier checks (' + lines.filter(l => l.startsWith('PASS')).length + '/12)');
} else skip('verifier or rock GLB missing (' + VERIFY + ')');

/* 4 the page loads with 0 console errors */
let chromium; try { chromium = require('playwright').chromium; } catch (e) { skip('playwright not found (NODE_PATH=$(npm root -g))'); }
if (chromium && sz(land) > 0) {
  const MIME = { '.html': 'text/html', '.glb': 'model/gltf-binary', '.png': 'image/png', '.js': 'text/javascript' };
  const srv = http.createServer((q, s) => { const f = path.join(BL, decodeURIComponent(q.url.split('?')[0]).replace(/^\//, '') || 'baked_land.html'); if (!f.startsWith(BL) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f)); }).listen(0);
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  if (fs.existsSync('/tmp/three.js') && process.env.THREE_LOCAL) await ctx.route('**/three.min.js', r => r.fulfill({ path: '/tmp/three.js', contentType: 'application/javascript' }));
  const page = await ctx.newPage(); const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('http://127.0.0.1:' + port + '/baked_land.html');
  await page.waitForFunction(() => window.__bl && window.__bl.ready && window.__bl.frames > 4, null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const bad = errs.filter(e => !/GL Driver Message|GPU stall|ReadPixels/.test(e));
  const st = await page.evaluate(() => ({ tris: window.__bl.tris, errors: window.__bl.errors }));
  ok(bad.length === 0 && st.errors.length === 0, 'baked_land.html loads GLB over the live sea with 0 console errors (tris ' + st.tris + ')' + (bad.length ? ': ' + bad.slice(0, 3).join(' | ') : ''));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  await browser.close(); srv.close();
}
console.log(fails ? '\n' + fails + ' FAILED' : '\nALL PASSED' + (skips ? ' (' + skips + ' skipped)' : ''));
process.exit(fails ? 1 : 0);
