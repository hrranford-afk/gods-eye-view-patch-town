/* Renders the landing pass (?pass=landing) at 1200 wide and writes shots/landing-wide.png and shots/landing-zoom.png.
   Usage: NODE_PATH=$(npm root -g) node tests/landing-render.js [out=DIR] [only=wide|zoom] [h=900] [qs=extra&query] */
import path from 'node:path';
import { launch, open, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=').slice(1).join('=');
const out = arg('out') || path.join(ROOT, 'shots'), only = arg('only'), H = +(arg('h') || 900);
const { browser, ctx } = await launch();
const { page, errs } = await open(ctx, '?ui=0&q=high&pass=landing&tide=0' + (arg('qs') ? '&' + arg('qs') : ''));
await page.setViewportSize({ width: 1200, height: H });
await page.evaluate(() => { __li.setTide(0); __li.home(); });
await page.waitForTimeout(2500);
if (only !== 'zoom') await page.screenshot({ path: path.join(out, 'landing-wide.png') });
if (only !== 'wide') { await page.evaluate(() => __li.zoomLanding()); await page.waitForTimeout(2500); await page.screenshot({ path: path.join(out, 'landing-zoom.png') }); }
console.log('errors:', errs.length, errs.slice(0, 6).join('\n'));
console.log(JSON.stringify(await page.evaluate(() => ({ ...__li.stats(), hash: __li.hash(), land: __li.landing() }))));
await browser.close();
