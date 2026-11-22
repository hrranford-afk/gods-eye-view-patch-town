/* Renders the sea pass (?pass=landing&sea=2, frozen sea clock) at 1200 wide.
   Usage: NODE_PATH=$(npm root -g) node tests/sea-render.js [out=DIR] [only=wide|close] [h=900] [qs=extra&query]
   Writes sea-wide.png / sea-close.png (shots/ by default). */
import path from 'node:path';
import { launch, open, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=').slice(1).join('=');
const out = arg('out') || path.join(ROOT, 'shots'), only = arg('only'), H = +(arg('h') || 900);
export const CLOSE = { tx: 12, tz: -8, dist: 13, phi: 0.3, theta: 0.15 };
const { browser, ctx } = await launch();
const { page, errs } = await open(ctx, '?ui=0&q=high&pass=landing&sea=2&seat=3.7&tide=0' + (arg('qs') ? '&' + arg('qs') : ''));
await page.setViewportSize({ width: 1200, height: H });
await page.evaluate(() => { __li.setTide(0); __li.home(); });
await page.waitForTimeout(2500);
if (only !== 'close') await page.screenshot({ path: path.join(out, 'sea-wide.png') });
if (only !== 'wide') { await page.evaluate(c => __li.setView(c), CLOSE); await page.waitForTimeout(2500); await page.screenshot({ path: path.join(out, 'sea-close.png') }); }
console.log('errors:', errs.length, errs.slice(0, 6).join('\n'));
await browser.close();
