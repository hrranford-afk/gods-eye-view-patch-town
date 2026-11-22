/* Renders people_options.html (headless chromium, software GL) and writes shots/ppl-0..6.png.
   Usage: NODE_PATH=$(npm root -g) node tests/people-render.js [only=0,1,2] [raw=1]
   three.js r128 comes from THREE_JS or /tmp/three.js if present, else the CDN URL the page uses. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
export async function launch() {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
  const local = process.env.THREE_JS || '/tmp/three.js';
  if (fs.existsSync(local)) await ctx.route('**/three.min.js', r => r.fulfill({ path: local, contentType: 'application/javascript' }));
  return { browser, ctx };
}
export async function open(ctx, qs) {
  const page = await ctx.newPage(); const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.join(ROOT, 'people_options.html') + (qs || ''));
  await page.waitForFunction(() => window.__ppl && window.__ppl.ready && window.__pplFrames > 1, null, { timeout: 180000 });
  return { page, errs };
}
const PANELS = [['overview', 1200, 300], ['camp', 1200, 440], ['close', 1200, 520]];
if (process.argv[1] && process.argv[1].endsWith('people-render.js')) (async () => {
  const only = (arg('only') || '0,1,2,3,4,5,6').split(',').map(Number);
  const { browser, ctx } = await launch();
  const { page, errs } = await open(ctx, '?ui=0&t=1.7&labels=none'); await page.waitForSelector('#boot', { state: 'detached', timeout: 20000 });
  const shot = async (file, w, h) => {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(([w, h]) => { __ppl.resize(w, h); }, [w, h]);
    const f0 = await page.evaluate(() => window.__pplFrames);
    await page.waitForFunction(f => window.__pplFrames > f + 3, f0, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => { __ppl.render(); r(); })));
    const nz = await page.evaluate(() => { const c = document.getElementById('view'); const g = document.createElement('canvas'); g.width = 16; g.height = 16; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 16, 16); const d = x.getImageData(0, 0, 16, 16).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s; });
    await page.screenshot({ path: file }); if (arg('dbg')) console.log(file, 'canvas sum', nz);
  };
  const sd = path.join(ROOT, 'shots'); fs.mkdirSync(sd, { recursive: true });
  for (const n of only) {
    if (n === 0) {
      await page.evaluate(() => { __ppl.solo(0); __ppl.setLabels('all'); __ppl.setBanner('Living Islands: people options', 'six styles, one row each (1 at the back), same cast, same light'); __ppl.setView({ tx: 0, ty: .5, tz: (3.5 - 3.5) * 3.6 + 1.9, dist: 35, phi: .72, theta: 0 }); });
      await shot(path.join(sd, 'ppl-0.png'), 1200, 1000); continue;
    }
    const files = [];
    for (const [z, w, h] of PANELS) {
      await page.evaluate(([n, z]) => { __ppl.setLabels('none'); __ppl.solo(n); __ppl.viewRow(n, z); __ppl.setBanner(n + '. ' + __ppl.styles[n - 1].name, z + ' view'); }, [n, z]);
      const f = path.join(sd, `ppl-${n}-${z}.png`); await shot(f, w, h); files.push(f);
    }
    execFileSync('python3', [path.join(ROOT, 'tests', 'people-stack.py'), path.join(sd, `ppl-${n}.png`), ...files]);
    if (!arg('keep')) files.forEach(f => fs.unlinkSync(f));
  }
  console.log('errors:', errs.length, errs.slice(0, 8).join('\n'));
  console.log(JSON.stringify(await page.evaluate(() => __ppl.stats())).slice(0, 1500));
  await browser.close();
})();
