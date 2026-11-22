// Shared headless runner: serves approaches/ and screenshots <page>. Usage: node run2.mjs <page.html> <out.png> [query] [w h]
import { createRequire } from 'node:module'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url)); const root = path.dirname(here);
const types = { '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.html': 'text/html', '.js': 'application/javascript', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.glb': 'model/gltf-binary' };
export async function shoot(page_, out, query = '', w = 1200, h = 800, opts = {}) {
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(root, u); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); }).listen(0);
  await new Promise(r => srv.on('listening', r)); const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const local = process.env.THREE_JS || '/tmp/three.js';
  if (fs.existsSync(local)) await page.route(/three\.min\.js/, r => r.fulfill({ body: fs.readFileSync(local), contentType: 'application/javascript' }));
  const errors = []; page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 400)); }); page.on('pageerror', e => errors.push('pageerror ' + e.message.slice(0, 400)));
  await page.goto(`http://127.0.0.1:${port}/approaches2/${page_}` + query);
  const t0 = Date.now(); while (!(await page.evaluate(() => window.__ready)) ) { if (errors.length && Date.now() - t0 > 4000 && !opts.keepGoing) { console.log('EARLY ERRORS', errors); break; } if (Date.now() - t0 > (opts.timeout || 280000)) break; await new Promise(r => setTimeout(r, 400)); }
  const data = await page.evaluate(() => (window.__canvas ? window.__canvas() : document.querySelector('canvas')).toDataURL('image/png'));
  const info = await page.evaluate(() => window.__info || null);
  if (out) fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
  await browser.close(); srv.close(); return { errors, info, data };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const [, , p, o, q, w, h] = process.argv; const r = await shoot(p, o, q || '', +w || 1200, +h || 800); console.log('wrote', o, JSON.stringify(r.info)); r.errors.forEach(e => console.log('ERR', e)); }
