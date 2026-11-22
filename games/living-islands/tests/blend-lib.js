/* Shared helpers for the blend round 1 scripts (blend-render.js, blend-test.js): a tiny static server (the CC0 kit needs http, not file://),
   headless chromium on software GL, and a page opener that waits for window.__li.ready. three.js r128 comes from THREE_JS, /tmp/three.js or the CDN. */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.html': 'text/html', '.js': 'application/javascript', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.glb': 'model/gltf-binary' };
export function serve() {
  const srv = http.createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r);
  });
  return new Promise(res => srv.listen(0, '127.0.0.1', () => res({ srv, base: 'http://127.0.0.1:' + srv.address().port + '/' })));
}
export async function launch(w = 1200, h = 900) {
  const { srv, base } = await serve();
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const local = process.env.THREE_JS || '/tmp/three.js';
  if (fs.existsSync(local)) await ctx.route('**/three.min.js', r => r.fulfill({ path: local, contentType: 'application/javascript' }));
  return { browser, ctx, base, close: async () => { await browser.close(); srv.close(); } };
}
export async function open(L, qs) {
  const page = await L.ctx.newPage(); const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(L.base + 'blend.html' + (qs || ''));
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 180000 });
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 60000 });
  return { page, errs };
}
export const noise = e => /GL Driver Message|GPU stall|ReadPixels|Automatic fallback to software WebGL/.test(e);
