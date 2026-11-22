/* dev helper: peek at flotsam. NODE_PATH=$(npm root -g) node tests/flow-peek.js out=/tmp/x.png kind=driftwood [beached=1] [qs=..] */
import path from 'node:path';
import { launch, open } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=').slice(1).join('=');
const { browser, ctx } = await launch();
const { page, errs } = await open(ctx, '?ui=0&q=high&pass=landing&flow=1&seat=3.7' + (arg('qs') ? '&' + arg('qs') : ''));
await page.setViewportSize({ width: 1000, height: 700 });
const r = await page.evaluate(([kind, beached, tide]) => { __li.setTideDir(-1); __li.setTide(tide); const T = __li.flow.time(); const P = __li.flow.positions(T).filter(p => p.kind === kind && p.beached === !!beached); const p = P[0]; if (p) __li.setView({ tx: p.x, tz: p.z, dist: 10, phi: .7, theta: .4 }); return { n: P.length, p }; }, [arg('kind') || 'wood', arg('beached') === '1', +(arg('tide') || .3)]);
console.log(JSON.stringify(r));
await page.waitForTimeout(2500);
await page.screenshot({ path: arg('out') || '/tmp/peek.png' });
console.log(errs.filter(e => !/GL Driver|GPU stall/.test(e)).join('\n'));
await browser.close();
