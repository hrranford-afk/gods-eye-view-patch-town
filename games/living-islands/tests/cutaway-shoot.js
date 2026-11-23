/* Screenshots and checks of cutaway.html over http (one browser at a time).
   Usage: NODE_PATH=/opt/node-tools/node_modules node tests/cutaway-shoot.js [out=DIR] [port=8765] [only=1,2,3] [qs=extra]
   three.js comes from /tmp/three.js when present (offline), else the pinned CDN URL. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=').slice(1).join('=');
const out = arg('out') || path.join(ROOT, 'shots'), port = +(arg('port') || 8765), only = (arg('only') || '1,2,3').split(',').map(Number), extra = arg('qs');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.f32': 'application/octet-stream' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(port);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
if (fs.existsSync('/tmp/three.js')) await ctx.route('**/three.min.js', r => r.fulfill({ path: '/tmp/three.js', contentType: 'application/javascript' }));
const page = await ctx.newPage(); const errs = [];
page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });   // swiftshader's ReadPixels stall notices are not page errors
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.goto(`http://localhost:${port}/cutaway.html?shot=1${extra ? '&' + extra : ''}`);
await page.waitForFunction(() => window.__cv && window.__cv.ready && window.__liFrames > 2, null, { timeout: 180000 });
const views = {
  1: { az: 0.95, el: 0.13, dist: 1750, tx: -150, ty: 90, tz: 430 },      // low three-quarter from the south-east
  2: { az: 0.0, el: 0.08, dist: 1900, tx: -40, ty: 30, tz: 600 },       // the front wall: strata, conduit, chamber
  3: { az: 0.45, el: 0.95, dist: 2300, tx: -50, ty: 0, tz: 250 }         // high
};
for (const n of only) { await page.evaluate(v => window.__cv.setView(v), views[n]); await page.waitForTimeout(1800); await page.screenshot({ path: path.join(out, `volcano-cutaway-${n}.png`) }); }
console.log('edge', JSON.stringify(await page.evaluate(() => window.__cv.edgeCheck())));
console.log('stats', JSON.stringify(await page.evaluate(() => window.__cv.stats())));
console.log('errors', errs.length, errs.slice(0, 6).join('\n'));
await browser.close(); srv.close();
