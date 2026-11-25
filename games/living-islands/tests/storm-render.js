/* Pictures for GIFT_STORM.md. Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/storm-render.js [only=1,2,3,4,5,6] [w=2400]
   Software GL (no real GPU): the page of &game=gift, driven with the storm's test handle (__storm), the gift's Skip-to and the robot routine's advance. Writes shots/storm-1.png .. storm-6.png.
     1 the storm building (rain, the barometer in the HUD)   2 the tidal swirl with the surge up   3 the haul on the shore after   4 a close drift pile against rocks or posts   5 the hulk   6 robots gathering */
import path from 'node:path';
import fs from 'node:fs';
import { launch, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const only = (arg('only') || '1,2,3,4,5,6').split(',').map(Number), W = parseInt(arg('w') || '2400', 10), Hh = Math.round(W * 0.5625);
const OUT = path.join(ROOT, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const { browser, ctx } = await launch(); const errs = [];
const p = await ctx.newPage(); await p.setViewportSize({ width: W, height: Hh }); p.setDefaultTimeout(900000);
p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|GPU stall|ReadPixels/.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
await p.goto('file://' + ROOT + '/islands_look.html?game=gift&q=high&ui=0&glide=0&giftsave=0&stormfast=1&' + (arg('qs') || ''));
await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
await p.waitForFunction(() => window.__gift && window.__gift.spots() && window.__storm, null, { timeout: 300000 });
await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { });
const shot = async n => { const f = path.join(OUT, 'storm-' + n + '.png'); await p.screenshot({ path: f }); console.log('wrote', f); };
const view = async (v, wait = 3500) => { await p.evaluate(v => __gift.focus(v.tx, v.tz, v.dist, v.theta, v.phi), v); await p.waitForTimeout(wait + 5000); };   /* the gift's own camera ease (a raw setView is overridden by it) */
const S = (f, ...a) => p.evaluate(([f, a]) => { const r = __storm[f](...a); return r === undefined ? null : r; }, [f, a]);
await p.evaluate(() => { __gift.skipTo('evening'); }); await p.waitForTimeout(1500); await p.evaluate(() => __gift.closeCard());
const camp = await p.evaluate(() => __li.camp()), dir = await p.evaluate(() => __li.camp && null);
await S('start', { build: 60 });
const plan = await S('hulkPlan'), sw = await S('swirlPlan');
if (only.includes(1)) {            /* the storm building: rain, the barometer, the robots home */
  await S('setTs', 42); await p.evaluate(() => { __li.setTide(.3); }); await view({ tx: camp.x - 2, tz: camp.z, dist: 46, phi: .78, theta: .55 }, 9000); await shot(1);
}
if (only.includes(2)) {            /* the swirl, the surge up */
  await S('setTs', 60 + 8 + 14); await view({ tx: sw.x, tz: sw.z, dist: 34, phi: .62, theta: .5 }, 5000);
  await S('setTs', 60 + 30 + 14); await p.evaluate(() => { __li.setTide(.3); }); await view({ tx: sw.x, tz: sw.z, dist: 34, phi: .62, theta: .5 }, 9000); await shot(2);
}
await S('finish'); await p.waitForFunction(() => __storm.state().phase === 'haul', null, { timeout: 120000 }); await p.evaluate(() => { __li.setTide(-.05); __li.weatherRT.set('fair'); }); await p.waitForTimeout(6000);
const heaps = await S('heaps'), P = await S('plan');
if (only.includes(3)) {            /* the haul on the shore after the water has gone */
  const near = heaps.filter(h => Math.hypot(h.x - camp.x, h.z - camp.z) < 60).sort((a, b) => Math.hypot(a.x - camp.x, a.z - camp.z) - Math.hypot(b.x - camp.x, b.z - camp.z)); const c = near[Math.min(3, near.length - 1)] || heaps[0];
  await view({ tx: c.x, tz: c.z, dist: 34, phi: .7, theta: .55 }, 8000); await shot(3);
}
if (only.includes(4)) {            /* a close drift pile: the heap against something, else the biggest cluster */
  const dr = P.heaps.filter(h => h.drift).sort((a, b) => b.n0 - a.n0)[0] || P.heaps.sort((a, b) => b.n0 - a.n0)[0];
  await view({ tx: dr.x, tz: dr.z, dist: 8.5, phi: .62, theta: .8 }, 8000); await shot(4);
}
if (only.includes(5)) {            /* the hulk */
  await view({ tx: plan.x, tz: plan.z, dist: 13, phi: .58, theta: .9 }, 8000); await shot(5);
}
if (only.includes(6)) {            /* robots gathering the haul */
  await p.evaluate(() => { __gift.giveOrder(0, 'planks'); __gift.closeCard(); }); await p.waitForTimeout(4000);
  const ok = await p.evaluate(() => { const rt = __li.campstart.rt(), sim = rt.sim(); for (let i = 0; i < 400; i++) { rt.advance(2); const r = sim.robots[0]; if (r.state === 'work' && sim.pl.work[r.siteI].haul !== undefined) return { x: r.x, z: r.z, t: i * 2 }; } return null; });
  console.log('robot at a haul site:', JSON.stringify(ok));
  if (ok) { await view({ tx: ok.x, tz: ok.z, dist: 11, phi: .6, theta: .7 }, 7000); await shot(6); } else { const rb = await p.evaluate(() => { const r = __li.campstart.rt().robots()[0]; return { x: r.x, z: r.z }; }); await view({ tx: rb.x, tz: rb.z, dist: 16, phi: .6, theta: .7 }, 6000); await shot(6); }
}
console.log('console errors:', errs.length, errs.slice(0, 3));
await browser.close();
