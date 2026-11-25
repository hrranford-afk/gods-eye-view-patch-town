/* STORY V2 PAGE TEST (Job 6e). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/story-v2-page-test.js [only=2]
   Desktop 1280x720 and ipad 834x1062 touch, no console errors. Section 2 calendar; 3 brass key; 4 dry boards; 5 cheap props (added item by item). */
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const only = (process.argv.find(a => /^only=/.test(a)) || '').slice(5); const want = k => !only || only.split(',').includes(String(k));
const { browser, ctx } = await launch(); const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs, w, h) {
  const p = await ctx.newPage(); p.setDefaultTimeout(240000); await p.setViewportSize({ width: w, height: h }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html?game=gift&q=low&glide=0&dev=0' + qs); await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { }); await p.waitForTimeout(2500); return { p, errs };
}
for (const [label, qs, w, h] of [['desktop 1280x720', '', 1280, 720], ['ipad 834x1062 touch', '&device=ipad', 834, 1062]]) {
  const { p, errs } = await open(qs, w, h);
  if (want(2)) {
    const c = await p.evaluate(() => __gift.calendar()); ok(c.label === '1 May' && c.season === 'spring' && c.year === 1, label + ': day 1 is ' + c.long);
    await p.evaluate(() => __gift.setHour(24 * 30 + 8)); await p.waitForTimeout(1500); const c2 = await p.evaluate(() => ({ c: __gift.calendar(), t: (document.querySelector('#gd-strip b') || {}).title })); ok(c2.c.label === '1 June' && c2.t === c2.c.long, label + ': day 31 is ' + c2.c.label + ' and the Day chip says "' + c2.t + '"');
  }
  if (want(3)) {
    const k0 = await p.evaluate(() => ({ i: __gift.keyInfo(), m: __gift.keyMeshes(), ins: __gift.inspect('key'), t: __gift.targetsNow().some(t => t.id === 'key') }));
    ok(k0.m === 1 && k0.i.count === 1 && k0.t && k0.ins && k0.ins.name === 'The brass key' && /no second key/.test(k0.ins.use), label + ': one key mesh on the lid, shown in the inspect layer: "' + (k0.ins && k0.ins.use) + '"');
    await p.evaluate(() => __gift.letter1()); await p.waitForTimeout(500);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#gd-layer button')].find(x => /Keep it/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(900);
    const k1 = await p.evaluate(() => ({ i: __gift.keyInfo(), m: __gift.keyMeshes(), t: __gift.targetsNow().some(t => t.id === 'key') }));
    ok(k1.i.where === 'yours' && k1.m === 1 && !k1.t, label + ': after the lid is lifted the key is yours, still one, no key on the lid');
    await p.evaluate(() => { __gift.closeCard(); __gift.notebook(); }); await p.waitForTimeout(500);
    const nb = await p.evaluate(() => { const c = document.querySelector('#gd-layer .gd-card'); return c ? c.textContent : ''; });
    ok(/The brass key/.test(nb) && /no second key/.test(nb), label + ': the notebook lists the one key');
  }
  ok(errs.length === 0, label + ': no console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
await browser.close(); console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed'); process.exit(fails ? 1 : 0);
