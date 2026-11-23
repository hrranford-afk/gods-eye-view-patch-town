/* Renders the boats pass shots at 1200 wide (frozen sea clock). Never writes look-*.png.
   Usage: NODE_PATH=$(npm root -g) node tests/boats-render.js tag=before|after [out=DIR] [qs=extra&query] [only=closeup,beached,wide,sailing]
   Writes boats-<tag>-closeup.png, -beached.png, -wide.png, -sailing.png. Default scene (hash 8d962c0c); ?boats=2 is added by tag=after. */
import path from 'node:path';
import { launch, open, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=').slice(1).join('=');
const tag = arg('tag') || 'after', out = arg('out') || path.join(ROOT, 'shots'), only = (arg('only') || 'closeup,beached,wide,sailing').split(',');
const qs = '?ui=0&q=high&seat=3.7&tide=0' + (tag === 'after' ? '&boats=2' : '') + (arg('qs') ? '&' + arg('qs') : '');
if (arg('o')) { /* extra suffix for experiments */ }
const sfx = arg('sfx') || '';
const { browser, ctx } = await launch();
const { page, errs } = await open(ctx, qs);
await page.setViewportSize({ width: 1200, height: +(arg('h') || 800) });
await page.evaluate(() => __li.setTide(0));
const boats = await page.evaluate(() => __li.boats());
const moored = boats.find(b => b.kind === 'moored' && !b.sail), sail = boats.find(b => b.sail), beach = boats.find(b => b.kind === 'beached');
const look = async (b, v) => { for (let i = 0; i < 3; i++) { const p = await page.evaluate(() => __li.boats()); const q = p.find(x => x.L === b.L && x.kind === b.kind); await page.evaluate(([q, v]) => __li.setView({ tx: q.x, tz: q.z, ...v }), [q, v]); await page.waitForTimeout(500); } };
const cv = (arg('cam') || '9,0.55,0.9').split(',').map(Number);
const V = { closeup: { dist: cv[0], phi: cv[1], theta: cv[2] }, beached: { dist: 9, phi: 0.6, theta: 0.5 }, sailing: { dist: 11, phi: 0.5, theta: 0.2 } };
if (arg('cam2')) { const c2 = arg('cam2').split(',').map(Number); V.beached = { dist: c2[0], phi: c2[1], theta: c2[2] }; }
if (arg('cam3')) { const c3 = arg('cam3').split(',').map(Number); V.sailing = { dist: c3[0], phi: c3[1], theta: c3[2] }; }
if (only.includes('closeup') && moored) { await look(moored, V.closeup); await page.screenshot({ path: path.join(out, `boats-${tag}-closeup${sfx}.png`) }); }
if (only.includes('beached') && beach) { await look(beach, V.beached); await page.screenshot({ path: path.join(out, `boats-${tag}-beached.png`) }); }
if (only.includes('wide') && moored) { await page.evaluate(m => __li.setView({ tx: m.x, tz: m.z, dist: 30, phi: 0.62, theta: 0.9 }), moored); await page.waitForTimeout(1500); await page.screenshot({ path: path.join(out, `boats-${tag}-wide.png`) }); }
if (only.includes('sailing') && sail) { await look(sail, V.sailing); await page.screenshot({ path: path.join(out, `boats-${tag}-sailing.png`) }); }
console.log(JSON.stringify(boats.map(b => [b.kind, b.sail, +b.x.toFixed(1), +b.z.toFixed(1), b.tris])));
console.log('errors:', errs.length, errs.slice(0, 6).join('\n'));
console.log(JSON.stringify(await page.evaluate(() => __li.stats())), await page.evaluate(() => __li.hash()));
await browser.close();
