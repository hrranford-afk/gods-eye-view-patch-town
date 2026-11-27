/* Stills of opening_proto.html under software GL (SwiftShader): the pictures show the look, NOT the speed.
   Run: NODE_PATH=/opt/node-tools/node_modules node games/living-islands/tests/opening-render.js out=research/opening_proto_shots t=5,15,30 [tier=radeon] [w=1280] [q=82] [qs=extra=params]
   Writes <out>/t<NN>.jpg for each time and prints console errors (the run fails if any). */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(k + '=')); return a ? a.slice(k.length + 1) : d; };
const out = path.resolve(arg('out', path.join(ROOT, 'research', 'opening_proto_shots'))), times = arg('t', '5,15,30,45,55,65,75,88').split(',').map(Number), tier = arg('tier', 'radeon'), W = parseInt(arg('w', '1280'), 10), H = Math.round(W * 9 / 16), Q = parseInt(arg('q', '82'), 10), extra = arg('qs', '');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }), page = await ctx.newPage(), errs = [];
page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|GPU stall|ReadPixels/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
for (const t of times) {
  const t0 = Date.now();
  await page.goto('file://' + path.join(ROOT, 'opening_proto.html') + '?ui=0&freeze=1&tier=' + tier + '&t=' + t + (extra ? '&' + extra : ''));
  await page.waitForFunction(() => window.__opening && window.__opening.ready && window.__oframes > 2, null, { timeout: 600000 });
  await page.waitForTimeout(500);
  const f = path.join(out, 't' + String(Math.round(t)).padStart(2, '0') + '.jpg');
  await page.screenshot({ path: f, type: 'jpeg', quality: Q });
  const info = await page.evaluate(() => window.__opening.info());
  console.log('wrote', f, 'tri', info.tri, 'calls', info.calls, 'took', ((Date.now() - t0) / 1000).toFixed(1) + ' s');
}
console.log(errs.length ? 'CONSOLE ERRORS (' + errs.length + '):\n' + errs.join('\n') : 'no console errors');
await browser.close();
process.exit(errs.length ? 1 : 0);
