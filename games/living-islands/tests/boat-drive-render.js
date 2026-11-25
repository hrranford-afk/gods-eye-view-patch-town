/* Pictures for GIFT_BOAT.md. Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/boat-drive-render.js [only=1,2,3,4,5] [w=2400]
   Software GL (no real GPU): the page of &game=gift&boat=1, driven with the boat's test handle (__boat) and the gift's Skip-to. Writes shots/boatdrive-1.png .. boatdrive-5.png
   (the names boat-1 .. boat-5 already belong to the boat kit sheets, BOAT_MODEL.md, so these are not overwritten). */
import path from 'node:path';
import fs from 'node:fs';
import { launch, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const only = (arg('only') || '1,2,3,4,5,6').split(',').map(Number), W = parseInt(arg('w') || '2400', 10), Hh = Math.round(W * 0.5625);
const OUT = path.join(ROOT, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const { browser, ctx } = await launch(); const errs = [];
async function page(qs) {
  const p = await ctx.newPage(); await p.setViewportSize({ width: W, height: Hh }); p.setDefaultTimeout(900000);
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|GPU stall|ReadPixels/.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html?game=gift&q=high&ui=0&boat=1&glide=0' + (qs || ''));
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 });
  await p.waitForFunction(() => window.__boat && __boat.state().ready && __boat.obj() && __li.boatkit.ready(), null, { timeout: 300000 });
  await p.evaluate(() => __gift.skipTo('yard')); await p.waitForTimeout(1500); await p.evaluate(() => { __gift.closeCard(); __boat.set({ avail: true }); });
  return p;
}
const shot = async (p, n) => { const f = path.join(OUT, (typeof n === 'string' ? n : 'boatdrive-' + n) + '.png'); await p.screenshot({ path: f }); console.log('wrote', f); };
const view = async (p, v, wait = 2800) => { await p.evaluate(v => __li.setView(v), v); await p.waitForTimeout(wait); };
const B = (p, f, ...a) => p.evaluate(([f, a]) => { const r = __boat[f](...a); return r === undefined ? null : r; }, [f, a]);
const thetaFrom = (dx, dz) => Math.atan2(dx, dz);   /* the camera sits on the (dx, dz) side of its target */

let p = await page('');
const L = await B(p, 'landings'); const jetty = L.find(l => l.id === 'jetty'), beach = L.find(l => l.id === 'beach');
const dir = [beach.dx, beach.dz];
if (only.includes(1)) {            /* the tender at the jetty */
  await p.evaluate(() => __gift.closeCard()); await B(p, 'advance', 2); await B(p, 'advance', 1);
  await view(p, { tx: jetty.berth.x - dir[0] * 1.5, tz: jetty.berth.z - dir[1] * 1.5, dist: 15, phi: .6, theta: thetaFrom(dir[0], dir[1]) + .75 }, 3500); await shot(p, 1);
}
if (only.includes(5)) {            /* the landing card: a load aboard, the yard stock beside it */
  await B(p, 'give', { engine: true, load: { planks: 3, rope: 1 } }); await B(p, 'openLanding'); await view(p, { tx: jetty.berth.x - dir[0] * 1.5, tz: jetty.berth.z - dir[1] * 1.5, dist: 20, phi: .6, theta: thetaFrom(dir[0], dir[1]) + .75 }, 2500); await shot(p, 5);
  await p.evaluate(() => __gift.closeCard()); await B(p, 'set', { load: { planks: 0, rope: 0, glass: 0, metal: 0 } });
}
if (only.includes(2)) {            /* underway with the motor: wake, rings, spray, exhaust */
  await B(p, 'give', { engine: true, load: { planks: 0 } }); await p.evaluate(() => __gift.closeCard()); await B(p, 'castOff');
  const o = { x: jetty.berth.x + dir[0] * 22, z: jetty.berth.z + dir[1] * 22 };   /* open water, then straight out to sea */
  const hy = Math.atan2(-dir[1], dir[0]);
  await B(p, 'teleport', o.x, o.z, hy, 'drive'); await B(p, 'force', { steer: .1, throttle: 1 }); await B(p, 'advance', 6);
  const bs = (await B(p, 'state')).b;
  await view(p, { tx: bs.x - Math.cos(bs.yaw) * 3, tz: bs.z + Math.sin(bs.yaw) * 3, dist: 18, phi: .5, theta: Math.atan2(-Math.cos(hy), Math.sin(hy)) - .55 }, 150); await shot(p, 2);
  await B(p, 'force', null);
}
if (only.includes(3)) {            /* landing at the beach with a load aboard */
  await B(p, 'give', { engine: true, load: { planks: 3, rope: 1, glass: 1 } });
  await p.evaluate(() => __gift.closeCard()); await B(p, 'castOff'); await B(p, 'force', null);
  const bb = beach; await B(p, 'teleport', bb.x + dir[0] * 4, bb.z + dir[1] * 4, Math.atan2(dir[1], -dir[0]), 'drive'); await B(p, 'advance', 1); await B(p, 'dockHere'); await B(p, 'advance', 3); await p.evaluate(() => __gift.closeCard());
  const berth = (await B(p, 'landings')).find(l => l.id === 'beach').berth;
  await view(p, { tx: berth.x - dir[0] * 2, tz: berth.z - dir[1] * 2, dist: 13, phi: .62, theta: thetaFrom(dir[0], dir[1]) + .7 }, 3500); await shot(p, 3);
}
await p.close();
if (only.includes(4)) {            /* storm mood: oars, more rocking, rain */
  p = await page('&weather=storm'); const L2 = await B(p, 'landings'), j2 = L2.find(l => l.id === 'jetty'), b2 = L2.find(l => l.id === 'beach'), d2 = [b2.dx, b2.dz], al2 = [-d2[1], d2[0]], hy2 = Math.atan2(-al2[1], al2[0]);
  await p.evaluate(() => __gift.closeCard()); await B(p, 'castOff'); await B(p, 'teleport', j2.berth.x + d2[0] * 22 - al2[0] * 8, j2.berth.z + d2[1] * 22 - al2[1] * 8, hy2, 'drive'); await B(p, 'force', { steer: 0, throttle: 1 }); await B(p, 'advance', 9);
  await view(p, { dist: 15, phi: .38, theta: Math.atan2(-Math.cos(hy2), Math.sin(hy2)) - .9 }, 700); await B(p, 'advance', 2); await shot(p, 4); await B(p, 'force', null);
  console.log('storm env', JSON.stringify(await B(p, 'env'))); await p.close();
}
if (only.includes(6)) {            /* the bow camera: eye level on the boat, two views: open bay and the edge of the table */
  p = await page('&cam=bow&motor=1' + (arg('rim') === '0' ? '&rim=0' : '')); const L3 = await B(p, 'landings'), j3 = L3.find(l => l.id === 'jetty'), b3 = L3.find(l => l.id === 'beach'), d3 = [b3.dx, b3.dz], hy3 = Math.atan2(-d3[1], d3[0]);
  await p.evaluate(() => __gift.closeCard()); await B(p, 'castOff'); await B(p, 'teleport', j3.berth.x + d3[0] * 18, j3.berth.z + d3[1] * 18, hy3 - .5, 'drive'); await B(p, 'force', { steer: 0, throttle: .6 }); await B(p, 'advance', 3);
  await p.waitForTimeout(1500); console.log('bow cam', JSON.stringify(await B(p, 'camInfo'), null, 0), JSON.stringify(await B(p, 'bow'))); await shot(p, 'boat-bow');
  /* toward the edge of the table: 8 m from the rim, looking outward */
  const R = Math.hypot(j3.berth.x, j3.berth.z), ang = Math.atan2(j3.berth.z, j3.berth.x); await B(p, 'teleport', Math.cos(ang) * 106, Math.sin(ang) * 106, Math.atan2(-Math.sin(ang), Math.cos(ang)), 'drive'); await B(p, 'force', { steer: 0, throttle: 0 }); await B(p, 'advance', 1); await p.waitForTimeout(1500); await shot(p, arg('rim') === '0' ? 'boat-bow-rim0' : 'boat-bow-rim');
  await p.close();
}
console.log('errors:', errs.length, errs.slice(0, 5));
await browser.close();
