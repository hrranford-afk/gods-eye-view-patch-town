/* Renders render_options.html in each mode (headless chromium, software GL) and writes shots/opt-1..6.png (1200 wide, caption strip is part of the page).
   Usage: NODE_PATH=$(npm root -g) node tests/options-shots.js [only=1,2] [q=high|low]
   three.js r128: the file named by THREE_JS (same switch as shoot.js) is served in place of the CDN file when it exists. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
export async function openMode(ctx, mode, qs) {
  const page = await ctx.newPage(); const errs = [];
  page.on('console', m => { if (/GL Driver Message|GPU stall|ReadPixels/.test(m.text())) return; if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.join(ROOT, 'render_options.html') + '?ui=0&q=high&mode=' + mode + (qs || ''));
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 120000 });
  return { page, errs };
}
if (process.argv[1] && process.argv[1].endsWith('options-shots.js')) (async () => {
  const only = (arg('only') || '1,2,3,4,5,6').split(',').map(Number);
  const { browser, ctx } = await launch();
  for (const n of only) {
    const { page, errs } = await openMode(ctx, n, arg('q') ? '' : '');
    await page.waitForTimeout(n === 5 ? 4500 : 2500);
    await page.screenshot({ path: path.join(ROOT, 'shots', `opt-${n}.png`) });
    const st = await page.evaluate(() => ({ ...__li.stats(), bakeMs: __li.bakeMs(), geo: __li.geoHash() }));
    console.log(n, 'errors:', errs.length, JSON.stringify(st));
    if (errs.length) console.log(errs.slice(0, 5).join('\n'));
    await page.close();
  }
  await browser.close();
})();
