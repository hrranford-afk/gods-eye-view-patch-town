/* THE GIFT, MAKE IT PHYSICAL: pictures (software GL, not a device). Run: NODE_PATH=$(npm root -g) node tests/physical-render.js [only=0,0b,1,2,3,4,5,hud] [w=2400]
   writes shots/phys-*.png. Every picture is driven through the page's own handles; none is a mock-up. */
import { launch, ROOT } from './shoot.js';
import path from 'node:path';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const only = (arg('only') || '0,0b,1,2,3,4,5,hud').split(','), W = +(arg('w') || 2400), H = Math.round(W * .625);
const { browser, ctx } = await launch(); const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs, w, h) {
  const p = await ctx.newPage(); p.setDefaultTimeout(300000); await p.setViewportSize({ width: w || W, height: h || H }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs + '&glide=0'); await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { }); await p.waitForTimeout(3500); return { p, errs };
}
const adv = (p, s) => p.evaluate(s => __gift.phys().advance(s), s);
const view = (p, x, z, dist, phi, theta) => p.evaluate(v => __li.setView(v), { tx: x, tz: z, dist, phi, theta });
const shot = async (p, name) => { await p.waitForTimeout(3500); await p.screenshot({ path: path.join(ROOT, 'shots', 'phys-' + name + '.png') }); console.log('wrote shots/phys-' + name + '.png'); };
const G = (p, f, ...a) => p.evaluate(([f, a]) => { const r = __gift[f](...a); return r === undefined ? null : r; }, [f, a]);
const stand = async p => p.evaluate(() => { const L = __gift.phys().layout(); return L; });
if (only.includes('0') || only.includes('0b')) {
  const { p, errs } = await open('?game=gift&q=high&device=desktop&dev=0');
  if (only.includes('0')) { const L = await stand(p), l = await p.evaluate(() => __boat.landings().find(l => l.id === 'beach')); await adv(p, 2); await view(p, (L.dock.tip.x + l.berth.x) / 2, (L.dock.tip.z + l.berth.z) / 2, 46, .75, .7); await shot(p, '0-arrival'); }
  if (only.includes('0b')) { const f = await p.evaluate(() => __gift.phys().floats().filter(f => !f.gone)[0]); await p.evaluate(([x, z]) => { __boat.teleport(x - 3, z, 0, 'drive'); __gift.phys().advance(.3); __boat.teleport(x, z, 0.3, 'drive'); __gift.phys().advance(.6); }, [f.x, f.z]); await view(p, f.x, f.z, 22, .8, .5); await shot(p, '0b-ferrying'); }
  console.log('errors', errs.length); await p.close();
}
if (only.includes('1') || only.includes('2') || only.includes('hud')) {
  const { p, errs } = await open('?game=gift&q=high&device=desktop&stage=jobs');
  await p.evaluate(() => { __gift.fitPlank && __gift.fitPlank(); }); await p.waitForFunction(() => __gift.state().plank, null, { timeout: 60000 }).catch(() => { });
  await G(p, 'speedUp', 40); await p.waitForFunction(() => __gift.crates().length >= 1, null, { timeout: 400000 }); await G(p, 'speedUp', 1); await p.waitForFunction(() => __gift.dlv() === 'drop', null, { timeout: 200000 }).catch(() => { });
  if (only.includes('1')) { await p.evaluate(() => __gift.phys().startCarry(1, true)); await adv(p, 9); const sp = await p.evaluate(() => __gift.spots()); await view(p, sp.tender.drop.x - 4, sp.tender.drop.z, 26, .75, .5); await shot(p, '1'); }
  if (only.includes('2')) { for (const k of ['planks', 'rope', 'glass', 'metal']) await G(p, 'addStock', k, k === 'planks' ? 14 : 8); await adv(p, 6); const L = await stand(p); const c = L.stores.reduce((a, s) => ({ x: a.x + s.x / 4, z: a.z + s.z / 4 }), { x: 0, z: 0 }); await view(p, c.x, c.z, 15, .8, .4); await shot(p, '2'); }
  console.log('errors', errs.length); await p.close();
}
if (only.includes('3') || only.includes('4')) {
  const { p, errs } = await open('?game=gift&q=high&device=desktop&stage=evening');
  await p.evaluate(() => { const s = __gift.state(); }); for (const [k, n] of [['planks', 12], ['metal', 4], ['rope', 2], ['glass', 2]]) await G(p, 'addStock', k, n);
  await p.evaluate(() => { __gift.doBuild('cottage'); }); await p.locator('#gd button', { hasText: 'Build it' }).first().click({ force: true }); await G(p, 'closeCard'); await adv(p, 3);
  await p.evaluate(() => { __gift.phys().startAct('site', true); __gift.phys().advance(3); });
  for (let i = 0; i < 12; i++) { const st = await p.evaluate(() => __gift.phys().state()); if (st.ph.b && st.ph.b.stage >= 2 || st.beam) break; await adv(p, 20); }
  const sp = await p.evaluate(() => { const b = __gift.state(); return __gift.spots().build.cottage; });
  if (only.includes('3')) { for (let i = 0; i < 6; i++) { const st = await p.evaluate(() => __gift.phys().state()); if (st.beam || (st.err && st.err.some(e => e.kind) && st.ph.b.placed[0] > 0)) break; await adv(p, 8); } await view(p, sp.x, sp.z, 24, .8, .6); await shot(p, '3'); }
  if (only.includes('4')) { for (let i = 0; i < 40; i++) { const st = await p.evaluate(() => __gift.phys().state()); if (st.beam && st.beam.robotAt) break; await adv(p, 10); } await p.evaluate(() => __gift.phys().hold('pbeamA')); await adv(p, 6); const bm = await p.evaluate(() => __gift.phys().state().beam); const st = await p.evaluate(() => __gift.phys().state()); await view(p, st.marker ? st.marker.x : sp.x, st.marker ? st.marker.z : sp.z, 20, .8, .5); await shot(p, '4'); await p.evaluate(() => __gift.phys().hold(null)); }
  console.log('errors', errs.length); await p.close();
}
if (only.includes('5')) {
  const { p, errs } = await open('?game=gift&q=high&device=desktop&stage=evening');
  await G(p, 'startRobot', 0).catch(() => { }); await p.evaluate(() => { const st = __gift.state(); }); await G(p, 'giveOrder', 0, 'planks'); await G(p, 'closeCard'); await adv(p, 60);
  await p.evaluate(() => { __gift.setHour(20.3); }); await p.waitForTimeout(2500); await adv(p, 12); await p.evaluate(() => __gift.phys().advance(0.1)); await G(p, 'closeCard');
  await p.evaluate(() => { const P = __gift.phys(); P.lightLantern && P.lightLantern(); }); const L = await stand(p); await view(p, L.post.x, L.post.z, 20, .6, .5); await shot(p, '5'); console.log('errors', errs.length); await p.close();
}
if (only.includes('hud')) {
  const { p, errs } = await open('?game=gift&device=ipad&stage=jobs', 834, 1062); await p.waitForTimeout(3000); await p.screenshot({ path: path.join(ROOT, 'shots', 'phys-ipad-hud.png') }); console.log('wrote shots/phys-ipad-hud.png', errs.length); await p.close();
}
await browser.close();
