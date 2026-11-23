/* BRIDGE PILOT renderer: shoots the five variants of the page from the Blender hero camera in headless Chromium (software GL).
   NODE_PATH=$(npm root -g) node tests/bridge-render.js [out=<dir>] [only=A,B,C,D,E] [el2=35] [w=1200] [h=800] [extra=<query>]
   A  today's lighting recipe on the same mesh and albedo (baked_bridge.html?mode=live): hemisphere + sun + shadow map + ACES 0.95
   B  today's baked beauty (baked_land.html, UNTOUCHED: the hero camera and a fixed sea time are patched in while serving)
   C  the bridge   D  the bridge with the sun off   E  the bridge at a second sun elevation (default 35)
   three.js r128 and the pinned GLTFLoader are served from local copies (THREE_JS, GLTF_LOADER env vars) so the run needs no network.
   Writes <out>/bridge-<X>.png and <out>/bridge-load.json (files served, bytes, timings, renderer.info, page info). */
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..'), BL = path.join(ROOT, 'blender');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(k + '=')); return a ? a.slice(k.length + 1) : d; };
const OUT = path.resolve(arg('out', path.join(ROOT, 'shots')));
const ONLY = arg('only', 'A,B,C,D,E').split(',');
const EL2 = arg('el2', '35'), W = +arg('w', 1200), H = +arg('h', 800), EXTRA = arg('extra', '');
const THREE = process.env.THREE_JS || '/tmp/three.js';
const GLTF = process.env.GLTF_LOADER || path.join(ROOT, 'approaches/approaches2/assets/GLTFLoader.js');
const MIME = { '.html': 'text/html', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.js': 'text/javascript' };
let served = [];
export function startServer() {
  const srv = http.createServer((q, s) => {
    const rel = decodeURIComponent(q.url.split('?')[0]).replace(/^\//, '') || 'baked_bridge.html'; const f = path.join(BL, rel);
    if (!f.startsWith(BL) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
    let buf = fs.readFileSync(f);
    served.push({ path: rel, bytes: buf.length, t: Date.now() });
    s.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); s.end(buf);
  }).listen(0);
  return srv;
}
export async function openPage(browser, port, file, query, opt = {}) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.route('**/three.min.js', r => r.fulfill({ path: THREE, contentType: 'application/javascript' }));
  await ctx.route('**/GLTFLoader.js', r => r.fulfill({ path: GLTF, contentType: 'application/javascript' }));
  if (opt.patchLand) {   /* baked_land.html is read-only: patch camera, sea time and HUD in the served copy only */
    await ctx.route('**/baked_land.html*', async r => {
      let h = fs.readFileSync(path.join(BL, 'baked_land.html'), 'utf8');
      h = h.replace('new THREE.PerspectiveCamera(32,', 'new THREE.PerspectiveCamera(36.87,').replace('function placeCamera(t) {', 'function placeCamera(t) { camera.position.set(-9, 10, 29); camera.lookAt(1e-9 + 0, 1.2, 2); return;')
        .replace('const t = clock.getElapsedTime();', 'const t = 3.0;').replace('</style>', '#hud{display:none}</style>');
      await r.fulfill({ body: h, contentType: 'text/html' });
    });
  }
  const page = await ctx.newPage(); const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  const t0 = Date.now(); served = [];
  await page.goto('http://127.0.0.1:' + port + '/' + file + (query ? '?' + query : ''));
  await page.waitForFunction(() => window.__bl && window.__bl.ready && window.__bl.frames > 3, null, { timeout: 600000 });
  return { page, ctx, errs, t0 };
}
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = startServer(); const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const base = 't=3&hud=0' + (EXTRA ? '&' + EXTRA : '');
  const V = { A: ['baked_bridge.html', base + '&mode=live'], B: ['baked_land.html', '', { patchLand: true }], C: ['baked_bridge.html', base], D: ['baked_bridge.html', base + '&sun=0'], E: ['baked_bridge.html', base + '&el=' + EL2] };
  const log = {};
  for (const k of ONLY) {
    const [file, q, opt] = V[k]; const t0 = Date.now();
    const { page, ctx, errs } = await openPage(browser, port, file, q, opt || {});
    const t1 = Date.now(); const firstBytes = served.reduce((x, r) => x + r.bytes, 0); const firstFiles = served.map(r => r.path);
    await page.waitForFunction(() => window.__bl.full || !window.__bl.info || window.__bl.info.mode !== 'bridge', null, { timeout: 600000 }); await page.waitForTimeout(2500);
    const bytes = served.reduce((s, r) => s + r.bytes, 0);
    const info = await page.evaluate(() => ({ info: window.__bl.info || {}, tris: window.__bl.tris, errors: window.__bl.errors, frames: window.__bl.frames }));
    await page.screenshot({ path: path.join(OUT, `bridge-${k}.png`) });
    log[k] = { load_ms: t1 - t0, first_paint_bytes: firstBytes, first_paint_files: firstFiles, served_bytes: bytes, files: served.map(r => [r.path, r.bytes]), console_errors: errs.filter(e => !/GL Driver Message|GPU stall|ReadPixels/.test(e)), ...info };
    console.log(k, 'load ms', t1 - t0, 'bytes', bytes, 'errors', log[k].console_errors.length, JSON.stringify((info.info && info.info.render) || {}));
    await ctx.close();
  }
  const lp = path.join(OUT, 'bridge-load.json'); let old = {}; try { old = JSON.parse(fs.readFileSync(lp, 'utf8')); } catch (e) {}
  fs.writeFileSync(lp, JSON.stringify({ ...old, ...log }, null, 1));
  await browser.close(); srv.close();
}
if (process.argv[1] && process.argv[1].endsWith('bridge-render.js')) main();
