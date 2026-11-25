/* KIT CHAIN PAGE TEST (Job 6d item 4). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/kitchain-page-test.js
   The existing scripted day (skip to the yard stage, choose the rain cistern, let the stages run): the site card lists the five stages and the four named kit crates with their states, and the states follow the build from ordered to fitted. 1280x720 desktop and 834x1062 touch. */
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
  const { p, errs } = await open(qs, w, h); await p.evaluate(() => __gift.skipTo('night')); await p.waitForTimeout(2000);
  const states = () => p.evaluate(() => __gift.phys().kitList() && __gift.phys().kitList().map(k => k.state));
  await p.evaluate(() => { __gift.stockSet({ metal: 3, planks: 1 }); __gift.phys().forceBuild('cistern', 1); }); await p.waitForTimeout(500);
  const names = await p.evaluate(() => __gift.phys().kitList().map(k => k.name)); ok(names.length === 4 && names.every(x => /^Kit crate \d: /.test(x)), label + ': four named kit crates: ' + names.join(' | '));
  const s1 = await states(); ok(s1[0] !== 'fitted' && s1.slice(1).every(x => x !== 'fitted'), label + ': at stage 1 nothing is fitted yet: ' + s1.join(', '));
  await p.evaluate(() => __gift.phys().forceBuild('cistern', 3)); await p.waitForTimeout(300); const s3 = await states(); ok(s3[0] === 'fitted' && s3[1] === 'fitted' && s3[2] !== 'fitted', label + ': at stage 3 the first two crates are fitted: ' + s3.join(', '));
  await p.evaluate(() => __gift.phys().forceBuild('cistern', 5)); await p.waitForTimeout(300); const s5 = await states(); ok(s5.every(x => x === 'fitted'), label + ': finished: every crate fitted (' + s5.join(', ') + ')');
  await p.evaluate(() => { __gift.phys().forceBuild('cistern', 2); __gift.stockSet({ metal: 3, planks: 0 }); }); await p.waitForTimeout(300);
  const html = await p.evaluate(() => __gift.phys().kitHtml()); ok(/Five stages/.test(html) && /Kit crates/.test(html) && /Kit crate 4/.test(html) && /<b>\d (Base ring|Staves and hoops)/.test(html), label + ': the card text shows five stages and the parts with states');
  const inf = await p.evaluate(() => __gift.phys().info('psite')); ok(inf && /Kit crates: 1 fitted/.test(inf.use), label + ': the hover card carries the parts: ' + (inf && inf.use.slice(-90)));
  ok(errs.length === 0, label + ': no console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
await browser.close(); console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed'); process.exit(fails ? 1 : 0);
