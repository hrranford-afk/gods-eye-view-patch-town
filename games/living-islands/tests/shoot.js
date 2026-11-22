/* Renders the look-test page with headless chromium (software GL) and writes shots/look-1..4.png.
   Usage: NODE_PATH=$(npm root -g) node tests/shoot.js [only=1,2] [q=high|low]
   three.js r128 comes from the CDN URL the page uses; offline, point THREE_JS at a local copy of r128. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
  await page.goto('file://' + path.join(ROOT, 'islands_look.html') + (qs || ''));
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 120000 });
  return { page, errs };
}
export { ROOT };
if (process.argv[1] && process.argv[1].endsWith('shoot.js')) (async () => {
  const only = (arg('only') || '1,2,3,4').split(',').map(Number); const q = arg('q') || 'high';
  const { browser, ctx } = await launch(); const { page, errs } = await open(ctx, '?ui=0&q=' + q);
  const shots = {
    1: async () => { await page.evaluate(() => { __li.setTide(0); __li.home(); }); },
    2: async () => { await page.evaluate(() => { const c = __li.camp(); __li.setTide(0.05); __li.setView({ tx: c.x - 1, tz: c.z, dist: 30, phi: 0.62, theta: 0.55 }); }); },
    3: async () => { await page.evaluate(() => { __li.setTide(0.1); __li.setView({ tx: -22, tz: 48, dist: 58, phi: 0.6, theta: 0.5 }); }); },
    4: null,
    5: async () => { await page.evaluate(() => { __li.setTide(0); __li.setView({ tx: -42, tz: -26, dist: 48, phi: 0.62, theta: 0.5 }); }); },
    6: async () => { await page.evaluate(() => { __li.setTide(0); __li.setView({ tx: 58, tz: 4, dist: 34, phi: 0.55, theta: 0.9 }); }); },
    7: async () => { await page.evaluate(() => { __li.setTide(0); __li.setView({ tx: 22, tz: -46, dist: 70, phi: 0.6, theta: 0.3 }); }); }
  };
  for (const n of only) {
    if (n === 4) { /* 2x2: low vs high tide, over the sand bar between two islands and over the skerry */
      const views = { bar: { tx: 25, tz: -44, dist: 62, phi: 0.78, theta: 0.3 }, skerry: { tx: 57, tz: 4, dist: 40, phi: 0.7, theta: 0.8 } };
      for (const v of Object.keys(views)) for (const [name, t] of [['low', -1.0], ['high', 1.0]]) {
        await page.evaluate(([t, vw]) => { __li.setTide(t); __li.setView(vw); }, [t, views[v]]);
        await page.waitForTimeout(1800);
        await page.screenshot({ path: path.join(ROOT, 'shots', `look-4-${v}-${name}.png`) });
      }
      try { (await import('node:child_process')).execFileSync('python3', [path.join(ROOT, 'tests', 'stack.py'), path.join(ROOT, 'shots')]); } catch (e) { console.log('stack skipped'); }
      continue;
    }
    await shots[n](); await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(ROOT, 'shots', `${n>4?'extra-':'look-'}${n}.png`) });
  }
  console.log('errors:', errs.length, errs.slice(0, 8).join('\n'));
  console.log(JSON.stringify(await page.evaluate(() => __li.stats())), await page.evaluate(() => __li.hash()));
  await browser.close();
})();
