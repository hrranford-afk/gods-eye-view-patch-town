/* Renders the seabed pass shots (?seabed=1, frozen sea clock) at 1200 wide.
   Usage: NODE_PATH=$(npm root -g) node tests/seabed-render.js [out=DIR] [only=1,2,3,d,l] [h=800] [T=sea clock] [qs=extra&query]
   1 wide view (depth colours, shoal foam, a race over a sill), 2 low tide sand bar and drying flat linking two islands, 3 the same view at high tide,
   d depth contour / debug overlay, l the home landing from the wide view with the waterline and boat float points by tide (low above, high below).
   Writes seabed-1.png seabed-2.png seabed-3.png seabed-depth.png seabed-landing.png. */
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { launch, open, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=').slice(1).join('=');
const out = arg('out') || path.join(ROOT, 'shots'), only = (arg('only') || '1,2,3,d,l').split(','), H = +(arg('h') || 800), ST = arg('T') || '3.7';
/* plain PNG, lossless except the two lowest bits per channel (the glitter noise otherwise makes 1.6 MB files); a third bit is dropped only if a file is still over 1.4 MB */
const squeeze = f => execFileSync('python3', ['-c', 'import sys,os\nfrom PIL import Image\nf=sys.argv[1]\nim=Image.open(f).convert("RGB")\nfor m in (255,252,248,240):\n    im.point([v&m for v in range(256)]*3).save(f,optimize=True,compress_level=9)\n    if os.path.getsize(f)<1400000: break\nprint(f,os.path.getsize(f),hex(m))', f], { encoding: 'utf8' });
const { browser, ctx } = await launch();
const base = '?ui=0&q=high&flow=1&seabed=1&seat=' + ST + (arg('qs') ? '&' + arg('qs') : '');
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
const shot = async (qs, name, setup, arg2) => {
  const { page, errs } = await open(ctx, base + qs);
  await page.setViewportSize({ width: 1200, height: H });
  await page.evaluate(setup, arg2);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, name) }); console.log(squeeze(path.join(out, name)).trim());
  console.log(name, 'errors:', errs.filter(e => !noise(e)).length, errs.filter(e => !noise(e)).slice(0, 3).join(' | '), JSON.stringify(await page.evaluate(() => { const s = __li.stats(); return { tris: s.tris, tide: 0 }; })));
  await page.close();
};
const BAR = { tx: 22, tz: -46, dist: 150, phi: 0.7, theta: 3.3 };
if (only.includes('1')) await shot('', 'seabed-1.png', v => { __li.setTideDir(1); __li.setTide(0.05); __li.setView(v); }, { tx: -14, tz: -36, dist: 150, phi: 0.85, theta: 0.42 });
if (only.includes('2')) await shot('', 'seabed-2.png', v => { __li.setTideDir(-1); __li.setTide(-1.0); __li.setView(v); }, BAR);
if (only.includes('3')) await shot('', 'seabed-3.png', v => { __li.setTideDir(1); __li.setTide(1.0); __li.setView(v); }, BAR);
if (only.includes('d')) await shot('&sbdbg=1', 'seabed-depth.png', () => { __li.setTideDir(1); __li.setTide(0); __li.setView({ tx: 0, tz: 0, dist: 255, phi: 1.05, theta: 0.3 }); });
if (only.includes('l')) {
  const tmp = []; 
  for (const [t, n] of [[-1.0, 'low'], [1.0, 'high']]) {
    const f = path.join(out, `.seabed-landing-${n}.png`); tmp.push(f);
    const { page, errs } = await open(ctx, base + '&pass=landing&sbdbg=1');
    await page.setViewportSize({ width: 1200, height: 480 });
    await page.evaluate(tt => { __li.setTideDir(tt > 0 ? 1 : -1); __li.setTide(tt); __li.setView({ tx: 30, tz: 30, dist: 100, phi: 0.6, theta: 0.52 }); __li.seabed.overlay(true); document.getElementById('sbpanel').style.display = 'none'; }, t);
    await page.waitForTimeout(2500); await page.screenshot({ path: f });
    console.log('landing', n, 'errors:', errs.filter(e => !noise(e)).length, JSON.stringify(await page.evaluate(() => __li.seabed.landing())));
    await page.close();
  }
  execFileSync('python3', ['-c', 'import sys\nfrom PIL import Image\na=Image.open(sys.argv[1]);b=Image.open(sys.argv[2]);o=Image.new("RGB",(a.width,a.height+b.height+4),(30,30,30));o.paste(a,(0,0));o.paste(b,(0,a.height+4));o.save(sys.argv[3],optimize=True)', tmp[0], tmp[1], path.join(out, 'seabed-landing.png')]); console.log(squeeze(path.join(out, 'seabed-landing.png')).trim());
  tmp.forEach(f => fs.unlinkSync(f));
}
await browser.close();
