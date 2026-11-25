/* BAYS PAGE TEST (Job 6d item 2). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/bays-page-test.js
   Four storage bays at the yard, one per material, each with a sign; the stack grows and shrinks with the stock; the tap/hover card says what it holds and the flow per hour; triangles bounded on the ipad preset; no console errors at 1280x720 desktop and 834x1062 touch (device=ipad). */
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const { browser, ctx } = await launch(); const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs, w, h) {
  const p = await ctx.newPage(); p.setDefaultTimeout(240000); await p.setViewportSize({ width: w, height: h }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html?game=gift&q=low&glide=0&dev=0' + qs); await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { }); await p.waitForTimeout(2500); return { p, errs };
}
for (const [label, qs, w, h] of [['desktop 1280x720', '', 1280, 720], ['ipad 834x1062 touch', '&device=ipad', 834, 1062]]) {
  const { p, errs } = await open(qs, w, h); await p.evaluate(() => __gift.skipTo('yard')); await p.waitForTimeout(2500); await p.evaluate(() => __gift.phys().advance(2));
  const b0 = await p.evaluate(() => __gift.bays());
  ok(b0.length === 4 && b0.map(b => b.id).join() === 'planks,rope,glass,metal', label + ': four bays, one per material (' + b0.map(b => b.id + ' ' + b.shown).join(', ') + ')');
  await p.evaluate(() => __gift.stockSet({ planks: 0, rope: 0, glass: 0, metal: 0 })); await p.waitForTimeout(600); const e = await p.evaluate(() => __gift.bays().map(b => b.shown));
  ok(e.every(s => s === 0), label + ': empty stock shows empty bays (' + e.join() + ')');
  await p.evaluate(() => __gift.stockSet({ planks: 1, rope: 4, glass: 7, metal: 30 })); await p.waitForTimeout(600); const g = await p.evaluate(() => __gift.bays().map(b => b.shown));
  ok(g.join() === '1,2,3,4', label + ': the stacks grow with the stock (1,4,7,30 shows ' + g.join() + ')');
  await p.evaluate(() => __gift.stockSet({ planks: 3, rope: 0, glass: 7, metal: 1 })); await p.waitForTimeout(600); const s = await p.evaluate(() => __gift.bays().map(b => b.shown));
  ok(s.join() === '2,0,3,1', label + ': and shrink again (' + s.join() + ')');
  await p.evaluate(() => __gift.stockSet({ planks: 60, rope: 60, glass: 60, metal: 60 })); await p.waitForTimeout(600); const bt = await p.evaluate(() => __gift.baysTris()), t2 = await p.evaluate(() => __li.stats().tris);
  ok(bt > 100 && bt <= 400, label + ': four full bays draw ' + bt + ' triangles (bound 400); the page total is ' + t2); if (w === 834) ok(t2 < 175000, label + ': the ipad stays near 150k (' + t2 + ')');
  const info = await p.evaluate(() => __gift.bayInfo('bay_planks')); ok(info && /Holds 60 of 60/.test(info.use) && /Washed up at the tide line/.test(info.use) && /an hour/.test(info.flow), label + ': the card says what it holds and the flow: ' + (info && info.use + ' ' + info.flow));
  const ins = await p.evaluate(() => { const T = __gift.targetsNow().filter(t => /^bay_/.test(t.id)); return { n: T.length, i: T.length ? __gift.inspect(T[0].id) : null }; }); ok(ins.n >= 1 && ins.i && ins.i.name && ins.i.use && ins.i.needs, label + ': a bay in view is a target with a name, a use and the flow (' + ins.n + ' in view)');
  ok(errs.length === 0, label + ': no console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
await browser.close(); console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed'); process.exit(fails ? 1 : 0);
