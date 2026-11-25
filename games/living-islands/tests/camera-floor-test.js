/* CAMERA FLOOR and LIGHTHOUSE BASE, page test (Job 6c item 5; headless chromium, software GL). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/camera-floor-test.js
   Owner: "looking underneath the lighthouse, is that meant to look like that?" The free camera on a gift page must never go below the ground or the sea (islands_look.html applyCam). Checked at five positions
   (the lamp headland, the yard, the jetty, the skerry, the highest ground) with the camera pushed as low and as close as it can go, from three sides each: it stays at least 1 m over the ground and 0.5 m over the water.
   The stump's base: a rock plinth covers the slope round it (no gap between the stump foot and the ground on any side), within a small triangle budget. The default page is unchanged. */
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const { browser, ctx } = await launch(); const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs) {
  const p = await ctx.newPage(); p.setDefaultTimeout(240000); await p.setViewportSize({ width: 900, height: 600 }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs); await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 }); return { p, errs };
}
{
  const { p, errs } = await open('?game=gift&q=low&glide=0&dev=0&boat=1&stage=arrive');
  await p.waitForFunction(() => window.__gift && window.__gift.spots() && window.__boat && __boat.state().ready, null, { timeout: 300000 }); await p.waitForTimeout(3000);
  const pos = await p.evaluate(() => { const S = __gift.spots(), st = __gift.stumpAt(), L = __boat.landings(); const g = id => { const l = L.find(q => q.id === id); return l && { x: (l.berth || l).x, z: (l.berth || l).z }; };
    let hi = { x: 0, z: 0, h: -9 }; for (let x = -70; x <= 70; x += 5) for (let z = -70; z <= 70; z += 5) { const h = __li.H(x, z); if (h > hi.h) hi = { x, z, h }; }
    return { 'the lamp headland': st, 'the yard': S.crate, 'the jetty': g('jetty'), 'the skerry': g('skerry'), 'the highest ground': { x: hi.x, z: hi.z } }; });
  let worst = 99, worstW = 99, cnt = 0;
  for (const [name, c] of Object.entries(pos)) {
    let w = 99, ww = 99;
    for (const th of [0.4, 2.5, 4.6]) for (const [phi, dist] of [[.2, 9], [.45, 14]]) {
      await p.evaluate(v => __li.setView(v), { tx: c.x, tz: c.z, dist, phi, theta: th }); await p.waitForTimeout(1500);
      const r = await p.evaluate(() => { const ci = __boat.camInfo(), h = __li.H(ci.x, ci.z); return { y: ci.y, h, tide: ci.tide, x: ci.x, z: ci.z }; }); cnt++;
      w = Math.min(w, r.y - r.h); ww = Math.min(ww, r.y - r.tide);
    }
    worst = Math.min(worst, w); worstW = Math.min(worstW, ww);
    ok(w >= 1.0 - 1e-6 && ww >= .5 - 1e-6, name + ': the camera stays above the ground by at least ' + w.toFixed(2) + ' m and the sea by ' + ww.toFixed(2) + ' m (6 views)');
  }
  ok(cnt === 30, '30 camera placements checked (worst over ground ' + worst.toFixed(2) + ', over sea ' + worstW.toFixed(2) + ')');
  /* the base */
  await p.waitForTimeout(1500);
  const b = await p.evaluate(() => { const pl = __gift.plinth(); if (!pl) return null; const gaps = []; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; for (const r of [pl.r0 * .8, pl.r0 * 1.0, pl.r0 + .3]) { const h = __li.H(pl.x + Math.cos(a) * r, pl.z + Math.sin(a) * r); const rr = r; gaps.push({ h, under: h < pl.bot - .05 || h > pl.top + 3 }); } } return { pl, minH: Math.min(...gaps.map(g => g.h)), maxH: Math.max(...gaps.map(g => g.h)) }; });
  ok(!!b, 'the stump has a plinth');
  if (b) { ok(b.pl.bot < b.minH - .3, 'the plinth reaches below the lowest ground round the base (plinth bottom ' + b.pl.bot.toFixed(2) + ', lowest ground ' + b.minH.toFixed(2) + ')'); ok(b.pl.top >= b.pl.bot + .8 && b.pl.rBot > b.pl.r0, 'it widens toward the ground: radius ' + b.pl.r0.toFixed(2) + ' at the top, ' + b.pl.rBot.toFixed(2) + ' at the foot'); ok(b.pl.tris <= 80, 'the plinth costs ' + b.pl.tris + ' triangles'); }
  const heavy = await p.evaluate(() => __li.stats()); ok(errs.length === 0, 'no console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
{
  const { p } = await open('?ui=0&q=high&seed=1122'); const r = await p.evaluate(() => ({ hash: __li.hashStatic(), tris: __li.stats().tris })); ok(r.hash === '8d962c0c' && r.tris === 88790, 'the default page is unchanged (' + r.hash + ', ' + r.tris + ')'); await p.close();
}
await browser.close(); console.log(n - fails + ' of ' + n + ' checks passed'); process.exit(fails ? 1 : 0);
