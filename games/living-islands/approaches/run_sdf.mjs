// Renders sdf_raymarch.html in headless chromium (software GL) and saves shots/appr-2.png
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const srv = http.createServer((q, r) => { const f = path.join(here, q.url.split('?')[0] === '/' ? 'sdf_raymarch.html' : q.url.split('?')[0]); if (!f.startsWith(here) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': f.endsWith('.json') ? 'application/json' : 'text/html' }); fs.createReadStream(f).pipe(r); }).listen(0);
await new Promise(r => srv.on('listening', r)); const port = srv.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 600)); });
const out = process.argv[2] || path.join(here, 'shots', 'appr-2.png');
await page.goto(`http://127.0.0.1:${port}/` + (process.argv[3] || ''));
page.on('crash', () => console.log('PAGE CRASH'));
setInterval(async () => { try { console.log('progress', await page.evaluate(() => window.__progress)); } catch {} }, 20000).unref();
const t0 = Date.now();
await page.waitForFunction(() => window.__done || window.__err, null, { timeout: 0, polling: 2000 });
const err = await page.evaluate(() => window.__err); if (err) { console.log('ERR', err); process.exit(1); }
const data = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
console.log('wrote', out, 'in', ((Date.now() - t0) / 1000).toFixed(1) + 's');
await browser.close(); srv.close();
