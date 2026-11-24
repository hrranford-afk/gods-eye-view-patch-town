/* Pictures for GIFT_FIRST_DAY.md. Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/gift-day-render.js [only=1,2,3,4,5] [w=2400]
   One software-GL page of &game=gift (no real GPU), driven with the Skip-to API and real clicks. Writes shots/day-1.png .. day-5.png (default 2400 wide). */
import path from 'node:path';
import fs from 'node:fs';
import { launch, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const only = (arg('only') || '1,2,3,3.5,4,5').split(',').map(Number), W = parseInt(arg('w') || '2400', 10), Hh = Math.round(W * 0.5625);
const OUT = path.join(ROOT, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const { browser, ctx } = await launch(); const errs = [];
const p = await ctx.newPage(); await p.setViewportSize({ width: W, height: Hh });
p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|GPU stall|ReadPixels/.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
await p.goto('file://' + ROOT + '/islands_look.html?game=gift&q=high&ui=0' + (arg('qs') ? '&' + arg('qs') : ''));
await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 });
await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { });
const shot = async n => { const f = path.join(OUT, 'day-' + n + '.png'); await p.screenshot({ path: f }); console.log('wrote', f); };
const view = async (v, wait = 2600) => { await p.evaluate(v => { const c = __li; c.setView(v); }, v); await p.waitForTimeout(wait); };
const G = (f, ...a) => p.evaluate(([f, a]) => { const r = __gift[f](...a); return r === undefined ? null : r; }, [f, a]);
const sp = await G('spots'); const th = await p.evaluate(() => { const d = __li.camp(); return 0; });
const dir = await p.evaluate(() => { const l = __li.world.landing(); return null; });
const cam = (x, z, dist, phi, theta) => ({ tx: x, tz: z, dist, phi, theta });
const thetaSea = (await p.evaluate(() => { const s = __gift.spots(); return Math.atan2(-(s.shore.x - s.crate.x), -(s.shore.z - s.crate.z)); }));
if (only.includes(1)) {            /* dawn arrival with the crate */
  await G('skipTo', 'new'); await G('setHour', 5.1); await G('closeCard');
  await view(cam(sp.crate.x + 1, sp.crate.z - 1, 26, .5, thetaSea + .6), 3500); await shot(1);
}
if (only.includes(2)) {            /* ledger (docked panel) and first delivery with the catalogue open */
  await G('speedUp', 40); await G('skipTo', 'delivery'); await p.waitForTimeout(500);
  await p.waitForFunction(() => __gift.crates().length >= 1, null, { timeout: 240000 });
  await p.waitForTimeout(1500); await G('act', 'crate1'); await p.waitForTimeout(500); await G('closeCard');
  await G('catalogue'); await view(cam(sp.tender.drop.x, sp.tender.drop.z, 30, .55, thetaSea + .5), 3000); await shot(2);
}
if (only.includes(3)) {            /* the yard with a started robot */
  await G('closeCard'); await G('skipTo', 'yard'); await p.waitForTimeout(800); await G('startRobot', 0); await G('closeCard'); await G('giveOrder', 0, 'planks'); await G('closeCard');
  await p.evaluate(() => { const rt = __li.campstart.rt(); rt.advance(6); });
  const y = await p.evaluate(() => { const y = __li.campstart.rt().yard(); return { x: y.x, z: y.z, yaw: y.yaw }; }); await G('closeCard');
  await view(cam(y.x, y.z, 18, .62, y.yaw - .5), 3500); await shot(3);
}
if (only.includes(3.5)) {          /* robots mid-job on the tideline (day-3b) */
  await G('closeCard'); await G('skipTo', 'yard'); await p.waitForTimeout(600); await G('startRobot', 0); await G('closeCard');
  await G('giveOrder', 0, 'planks'); await G('closeCard'); await G('giveOrder', 1, 'metal').catch(() => { }); await G('closeCard');
  let tgt = null; for (let k = 0; k < 40; k++) { await p.evaluate(() => __li.campstart.rt().advance(5)); tgt = await p.evaluate(() => { const r = __li.campstart.rt().robots()[0]; return (r.state === 'work' || r.state === 'out' || r.state === 'carry') ? { s: r.state, x: r.x, z: r.z, yaw: r.yaw } : null; }); if (tgt && tgt.s === 'work') break; }
  console.log('3b robot state', tgt && tgt.s); await p.waitForTimeout(800);
  if (tgt) await view(cam(tgt.x, tgt.z, 14, .6, tgt.yaw + 2.6), 3500); await shot('3b');
}
if (only.includes(4)) {            /* the build menu */
  await G('skipTo', 'evening'); await p.waitForTimeout(800); await G('closeCard'); await G('build');
  await view(cam(sp.crate.x, sp.crate.z, 60, .6, thetaSea + .5), 3000); await shot(4);
}
if (only.includes(5)) {            /* first night */
  await G('closeCard'); await G('skipTo', 'night'); await p.waitForTimeout(500); await G('setHour', 22.2);
  await p.waitForFunction(() => __gift.nightT() > 11, null, { timeout: 120000 }); await p.waitForTimeout(18000); await G('closeCard');
  await view(cam(sp.crate.x * .5 + sp.stump.x * .5, sp.crate.z * .5 + sp.stump.z * .5, 70, .55, thetaSea + .3), 3500); await shot(5);
}
console.log('errors:', errs.length, errs.slice(0, 5)); console.log('gift errors:', await G('err'));
await browser.close();
