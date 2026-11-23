/* Renders macro_sea_view.html to shots (1200 wide). Usage: NODE_PATH=$(npm root -g) node tests/macro-sea-render.js [seed=1122] [h=60] [out=shots/macro-timeline-1.png] [theme=light|dark] [only=slices] */
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(k + '=')); return a ? a.split('=').slice(1).join('=') : d; };
const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 })).newPage(); const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(e.message));
await page.goto('file://' + path.join(ROOT, 'macro_sea_view.html') + '?still=1&seed=' + arg('seed', '1122') + '&h=' + arg('h', '60') + '&theme=' + arg('theme', 'light') + (arg('doy') ? '&doy=' + arg('doy') : ''));
await page.waitForTimeout(1500);
const out = path.resolve(ROOT, '..', '..', arg('out', 'games/living-islands/shots/macro-timeline-1.png'));
if (arg('only') === 'slices') await (await page.$('#five')).screenshot({ path: out }); else await page.screenshot({ path: out, fullPage: true });
console.log('wrote', out, 'errors', errs.length, errs.slice(0, 3).join(' | '));
await browser.close();
