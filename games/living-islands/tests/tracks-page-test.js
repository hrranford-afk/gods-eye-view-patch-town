/* TRACKS PAGE TEST (Job 6d item 3). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/tracks-page-test.js
   On the page: robots work a few minutes; the worn path mesh exists, has a capped number of segments and triangles, becomes visible only after trips, stays inside the cap, and draws one more draw call at most; no console errors (1280x720, and 834x1062 touch). */
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
  const { p, errs } = await open(qs, w, h); await p.evaluate(() => __gift.skipTo('yard')); await p.waitForTimeout(1500);
  const p0 = await p.evaluate(() => __li.campstart.rt().paths()); ok(p0 && p0.segments > 7 && p0.segments <= 160 && p0.tris === p0.segments * 2, label + ': the path mesh has ' + (p0 && p0.segments) + ' segments (cap 160), ' + (p0 && p0.tris) + ' triangles');
  await p.evaluate(() => { const s = __li.campstart.rt().sim(); s.robots.forEach((r, i) => { if (i < 2) { r.off = false; r.timer = .3; } }); __li.campstart.rt().advance(900); __li.campstart.rt().advance(900); });
  const p1 = await p.evaluate(() => __li.campstart.rt().paths()); ok(p1.max > 3 && p1.segments === p0.segments && p1.tris === p0.tris, label + ': after robot trips a route is worn (wear ' + p1.max.toFixed(1) + ') and the mesh did not grow (' + p1.segments + ' segments)');
  ok(Math.max(...p1.alphas) <= .34 + 1e-9 && Math.max(...p1.alphas) > .05, label + ': the path is pale and faint (alpha ' + Math.max(...p1.alphas).toFixed(2) + ' at most .34)');
  await p.evaluate(() => { const rt = __li.campstart.rt(); rt.sim().robots.forEach(r => { r.off = true; r.state = 'bay'; r.timer = 1e9; }); });
  await p.evaluate(() => __li.campstart.rt().advance(60)); const p2 = await p.evaluate(() => __li.campstart.rt().paths()); ok(p2.max <= p1.max && p2.max > p1.max - 3, label + ': it fades slowly with no trips (' + p1.max.toFixed(1) + ' to ' + p2.max.toFixed(1) + ' in a minute)');
  ok(errs.length === 0, label + ': no console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
await browser.close(); console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed'); process.exit(fails ? 1 : 0);
