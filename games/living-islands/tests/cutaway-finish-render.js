/* Before / after pictures of the cutaway finish pass: shots/cutaway-finish-1..4.png (wide, cone close, cut face close, sea edge), each BEFORE (left, the page as it was, no switch)
   and AFTER (right, ?finish=1), 1280 x 800 each, scaled to 960 x 600 side by side. Fixed clocks: performance.now is frozen (the page's own wave clock), ?seat= freezes the finish sea clock,
   ?wt= freezes the weather clock, so a re-run draws the same pictures.
   Usage: NODE_PATH=$(npm root -g) node tests/cutaway-finish-render.js [out=DIR] [port=8766] [only=1,2,3,4] [qs=extra query for the AFTER page] [full=1 (also write the full-size AFTER shot as cutaway-finish-N-after.png)]
   three.js comes from /tmp/three.js when present (offline), else the pinned CDN URL. Needs python3 + Pillow for the side-by-side (falls back to two files when missing). */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=').slice(1).join('=');
const out = arg('out') || path.join(ROOT, 'shots'), port = +(arg('port') || 8766), only = (arg('only') || '1,2,3,4').split(',').map(Number), extra = arg('qs'), full = arg('full') === '1';
const types = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.f32': 'application/octet-stream' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(port);
const VIEWS = {
  1: { az: -0.55, el: 0.27, dist: 2150, tx: -40, ty: 0, tz: 330 },       /* wide */
  2: { az: 0.32, el: 0.27, dist: 820, tx: -215, ty: 100, tz: 540 },       /* the cone close: trees, rocks, baked light */
  3: { az: 0.18, el: 0.06, dist: 700, tx: -215, ty: 20, tz: 760 },        /* the cut face close: strata, conduit, waterline */
  4: { az: 2.45, el: 0.14, dist: 760, tx: 480, ty: 0, tz: -200 }          /* the sea edge, looking into the sun: glass wall, flow, glitter, foam */
};
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
if (fs.existsSync('/tmp/three.js')) await ctx.route('**/three.min.js', r => r.fulfill({ path: '/tmp/three.js', contentType: 'application/javascript' }));
await ctx.addInitScript(() => { const t = 5000; performance.now = () => t; });
async function shoot(qs, shotsFor) {
  const page = await ctx.newPage(); const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(`http://localhost:${port}/cutaway.html?shot=1&${qs}`);
  await page.waitForFunction(() => window.__cv && window.__cv.ready && window.__liFrames > 2, null, { timeout: 240000 });
  await page.addStyleTag({ content: '.panel,.read{display:none!important}' });
  const res = {};
  for (const n of shotsFor) { await page.evaluate(v => { window.__cv.setTide(0); window.__cv.setView(v); }, VIEWS[n]); await page.waitForTimeout(2200); res[n] = await page.screenshot(); }
  await page.close(); return { res, errs };
}
const before = await shoot('', only);
const after = await shoot('finish=1&seat=3.7&wt=4' + (extra ? '&' + extra : ''), only);
for (const n of only) {
  const b = path.join(out, `cutaway-finish-${n}-before.png`), a = path.join(out, `cutaway-finish-${n}-after.png`);
  fs.writeFileSync(b, before.res[n]); fs.writeFileSync(a, after.res[n]);
  const py = spawnSync('python3', ['-c', `
from PIL import Image
b=Image.open(r"${b}").convert("RGB").resize((960,600),Image.LANCZOS); a=Image.open(r"${a}").convert("RGB").resize((960,600),Image.LANCZOS)
c=Image.new("RGB",(1920,600)); c.paste(b,(0,0)); c.paste(a,(960,0)); c.save(r"${path.join(out, `cutaway-finish-${n}.png`)}",optimize=True)`], { encoding: 'utf8' });
  if (py.status !== 0) console.log('side-by-side skipped:', (py.stderr || '').slice(0, 200)); else if (!full) { fs.unlinkSync(b); fs.unlinkSync(a); }
}
console.log('before errors', before.errs.length, before.errs.slice(0, 3).join(' | '));
console.log('after errors', after.errs.length, after.errs.slice(0, 3).join(' | '));
await browser.close(); srv.close();
