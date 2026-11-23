/* Renders the weather pass shots (landing + sea=2 + flow=1 + seabed=1, frozen sea and weather clocks) at 1200 wide, one browser, one state at a time.
   Usage: NODE_PATH=$(npm root -g) node tests/weather-render.js [out=DIR] [only=clear,fair,...] [h=800] [wt=seconds] [qs=extra&query]
   Writes shots/weather-<name>.png (golden = goldenhour). */
import { execFileSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
import path from 'node:path';
/* same as shoot.js open() but waits up to 6 minutes: the weather shaders are heavy for software GL on a shared CPU */
async function open(ctx, qs, w, h) {
  const page = await ctx.newPage(); await page.setViewportSize({ width: w || 480, height: h || 320 }); const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.join(ROOT, 'islands_look.html') + (qs || ''));
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  return { page, errs };
}
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=').slice(1).join('=');
const out = arg('out') || path.join(ROOT, 'shots'), H = +(arg('h') || 800), WT = arg('wt') || '40';
const all = { clear: 'clear', fair: 'fair', overcast: 'overcast', rain: 'rain', fog: 'fog', storm: 'storm', golden: 'goldenhour' };
const only = (arg('only') || Object.keys(all).join(',')).split(',');
const squeeze = f => execFileSync('python3', ['-c', 'import sys,os\nfrom PIL import Image\nf=sys.argv[1]\nim=Image.open(f).convert("RGB")\nfor m in (255,252,248,240):\n    im.point([v&m for v in range(256)]*3).save(f,optimize=True,compress_level=9)\n    if os.path.getsize(f)<1250000: break\nprint(f,os.path.getsize(f),hex(m))', f], { encoding: 'utf8' });
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
const { browser, ctx } = await launch();
for (const k of only) {
  const { page, errs } = await open(ctx, '?ui=0&q=high&pass=landing&flow=1&seabed=1&seat=3.7&wt=' + WT + '&weather=' + all[k] + (arg('qs') ? '&' + arg('qs') : ''), 1200, H);
  await page.setViewportSize({ width: 1200, height: H });
  await page.evaluate(() => { __li.setTideDir(1); __li.setTide(0.1); __li.setView({ tx: 0, tz: -8, dist: 175, phi: 0.6, theta: 0.5 }); });
  await page.waitForTimeout(3000);
  const f = path.join(out, 'weather-' + k + '.png'); await page.screenshot({ path: f }); console.log(squeeze(f).trim());
  console.log(k, 'errors:', errs.filter(e => !noise(e)).length, errs.filter(e => !noise(e)).slice(0, 3).join(' | '), JSON.stringify(await page.evaluate(() => { const s = __li.stats(); return { tris: s.tris }; })));
  await page.close();
}
await browser.close();
