/* Renders the flow pass shots (?flow=1&pass=landing, frozen sea clock) at 1200 wide.
   Usage: NODE_PATH=$(npm root -g) node tests/flow-render.js [out=DIR] [only=1,2,3,a,e] [h=900] [qs=extra&query] [T=sea clock]
   1 wide view, 2 shore at high tide (wrack line), 3 same shore at low tide, a arrows flood, e arrows ebb. Writes flow-1.png flow-2.png flow-3.png flow-arrows.png flow-arrows-ebb.png. */
import path from 'node:path';
import { launch, open, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=').slice(1).join('=');
const out = arg('out') || path.join(ROOT, 'shots'), only = (arg('only') || '1,2,3,a,e').split(','), H = +(arg('h') || 900), ST = arg('T') || '3.7';
const { browser, ctx } = await launch();
const base = '?ui=0&q=high&pass=landing&flow=1&seat=' + ST + (arg('qs') ? '&' + arg('qs') : '');
const shot = async (qs, name, setup) => {
  const { page, errs } = await open(ctx, base + qs);
  await page.setViewportSize({ width: 1200, height: H });
  await page.evaluate(setup.fn, setup.arg);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, name) });
  console.log(name, 'errors:', errs.filter(e => !/GL Driver Message|GPU stall|ReadPixels/.test(e)).length, errs.slice(0, 4).join(' | '));
  console.log(JSON.stringify(await page.evaluate(() => __li.flow.counts())));
  await page.close();
};
/* pick the shore automatically: the densest group of beached items at high tide, camera on the water side of the nearest island */
let SH;
{ const { page } = await open(ctx, base);
  SH = await page.evaluate(() => { __li.setTideDir(-1); __li.setTide(0.97); const P = __li.flow.positions(__li.flow.time()).filter(p => p.beached); let best = null;
    for (const a of P) { const g = P.filter(b => Math.hypot(a.x - b.x, a.z - b.z) < 7); if (!best || g.length > best.length) best = g; }
    const cx = best.reduce((s, p) => s + p.x, 0) / best.length, cz = best.reduce((s, p) => s + p.z, 0) / best.length;
    const I = __li.islands.slice().sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz))[0];
    return { tx: cx, tz: cz, dist: 19, phi: 0.52, theta: Math.atan2(cx - I.x, cz - I.z), n: best.length }; });
  await page.close(); console.log('shore', JSON.stringify(SH)); }
if (arg('shore')) SH = JSON.parse(arg('shore'));
if (only.includes('1')) await shot('', 'flow-1.png', { fn: () => { __li.setTideDir(1); __li.setTide(0.1); __li.home(); } });
if (only.includes('2')) await shot('', 'flow-2.png', { fn: v => { __li.setTideDir(-1); __li.setTide(0.97); __li.setView(v); }, arg: SH });
if (only.includes('3')) await shot('', 'flow-3.png', { fn: v => { __li.setTideDir(-1); __li.setTide(-0.97); __li.setView(v); }, arg: SH });
if (only.includes('a')) await shot('&arrows=1&flowdbg=1', 'flow-arrows.png', { fn: () => { __li.setTideDir(1); __li.setTide(0); __li.home(); } });
if (only.includes('e')) await shot('&arrows=1&flowdbg=1', 'flow-arrows-ebb.png', { fn: () => { __li.setTideDir(-1); __li.setTide(0); __li.home(); } });
await browser.close();
