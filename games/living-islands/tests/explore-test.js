/* JOB 6c item 1, EXPLORATION page test (headless chromium, software GL).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/explore-test.js
   Checks: no marker while the dock is half built; the marker, the compass chip and the gold class once it is finished; the arrow angle for five boat positions (against the projection of the same two
   points on a near top-down camera (phi 1.4 is almost straight down)); the chart lists the known places and a tap sets the destination; the hint; the marker clears on arrival and when the first trip is made;
   at 834x1062 touch and 390x844 the compass chip overlaps no control and is on screen; the default page is unchanged. */
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const { browser, ctx } = await launch();
const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs, w = 1200, h = 800) {
  const p = await ctx.newPage(); p.setDefaultTimeout(180000); await p.setViewportSize({ width: w, height: h }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs);
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  if (/game=gift/.test(qs)) { await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForFunction(() => window.__boat && __boat.state().ready, null, { timeout: 300000 }).catch(() => { }); await p.waitForTimeout(1500); }
  return { p, errs };
}
const X = (p, f) => p.evaluate(f);
{
  const { p, errs } = await open('?game=gift&glide=0&boat=1&stage=arrive&q=low');
  let e = await X(p, () => __gift.explore());
  ok(e.on && e.dest === 'skerry', 'after the dock (canned stage) the first destination is the skerry (' + e.dest + ')');
  await p.waitForTimeout(1500); e = await X(p, () => __gift.explore());
  ok(e.marker && e.compass, 'the gold marker is on the water and the compass chip is shown');
  ok(/skerry/i.test(e.compassText) && /\d+ m/.test(e.compassText), 'the chip names the place and the distance: ' + e.compassText);
  ok(e.gold === 'crate0', 'while the crate waits it is the gold one, the skerry is white (' + e.gold + ')');
  /* five boat positions: the arrow against the screen projection of the same two points on a near top-down camera (phi 1.4 is almost straight down) */
  const land = await X(p, () => __boat.landings().map(l => ({ id: l.id, x: (l.berth || l).x, z: (l.berth || l).z })));
  const sk = land.find(l => l.id === 'skerry'), jt = land.find(l => l.id === 'jetty'); ok(!!sk && !!jt, 'the jetty and the skerry landings exist');
  const offs = [[-40, 0, .2], [0, 40, 1.4], [35, -35, 2.6], [-20, -45, 3.8], [50, 10, 5.1]];
  let good = 0, worst = 0;
  for (const [dx, dz, th] of offs) {
    const bx = sk.x + dx, bz = sk.z + dz;
    await p.evaluate(([x, z, th]) => { __boat.teleport(x, z, 0, 'drive'); __li.setView({ tx: x, tz: z, dist: 150, phi: 1.4, theta: th }); }, [bx, bz, th]); await p.waitForTimeout(2200);
    const r = await p.evaluate(([sx, sz, bx, bz]) => { const a = __boat.screenOf(bx, bz), b = __boat.screenOf(sx, sz), e = __gift.explore(); if (!a || !b) return null; return { want: Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI, got: e.info.deg, dist: e.info.dist }; }, [sk.x, sk.z, bx, bz]);
    if (r) { let d = Math.abs(r.want - r.got) % 360; if (d > 180) d = 360 - d; worst = Math.max(worst, d); if (d < 6) good++; console.log('  boat offset ' + dx + ',' + dz + ' theta ' + th + ': projection ' + r.want.toFixed(1) + ', arrow ' + r.got.toFixed(1) + ', ' + r.dist.toFixed(0) + ' m'); }
  }
  ok(good === 5, 'the arrow points at the skerry for 5 boat positions and camera turns (worst ' + worst.toFixed(1) + ' degrees)');
  e = await X(p, () => __gift.explore()); ok(e.hint === 'Something is wedged on the skerry.', 'while rowing the one-line hint is the skerry line (' + e.hint + ')');
  /* chart */
  await p.evaluate(() => __gift.chart()); await p.waitForTimeout(500);
  const ch = await p.evaluate(() => [...document.querySelectorAll('#gd-card-chart button[data-place]')].map(b => b.dataset.place));
  ok(ch.includes('home') && ch.includes('skerry') && !ch.includes('woods'), 'the chart lists the known places: ' + ch.join(', '));
  await p.locator('#gd-card-chart button[data-place="home"]').click(); await p.waitForTimeout(800);
  e = await X(p, () => __gift.explore()); ok(e.dest === 'home' && /home|jetty/i.test(e.compassText), 'a tap on Home sets the destination (' + e.dest + ')');
  await p.evaluate(([x, z]) => { __boat.teleport(x + 3, z, 0, 'drive'); }, [jt.x, jt.z]); await p.waitForTimeout(1500);
  e = await X(p, () => __gift.explore()); ok(e.dest === null && !e.marker && !e.compass, 'on arrival the marker and the chip clear');
  await p.evaluate(() => __gift.setDest(undefined)); await p.waitForTimeout(500);
  e = await X(p, () => __gift.explore()); ok(e.dest === 'skerry', 'the default comes back with no choice made');
  await p.evaluate(() => __boat.give({ engine: true })); await p.evaluate(() => { const s = __boat.state(); __boat.set({ got: { engine: true } }); }); await p.waitForTimeout(1200);
  e = await X(p, () => __gift.explore()); ok(e.dest === null && !e.marker, 'after the first trip (the motor is in the boat) the default marker is gone');
  ok(errs.length === 0 && (await X(p, () => __gift.err())).length === 0, 'no console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
{
  const { p } = await open('?game=gift&glide=0&boat=1&q=low');
  const s = await X(p, () => ({ st: __gift.stage(), e: __gift.explore() }));
  ok(s.st === 'dock' && !s.e.on && !s.e.marker && !s.e.compass, 'while the dock is half built there is no exploration marker (stage ' + s.st + ')');
  await p.evaluate(() => __gift.phys().finishDock()); await p.waitForTimeout(2500);
  const e = await X(p, () => __gift.explore()); ok(e.on && e.marker && e.compass && e.dest === 'skerry', 'the moment the dock is finished the marker and the arrow appear');
  await p.close();
}
for (const [w, h, dev] of [[834, 1062, '&device=ipad'], [390, 844, '&device=phone']]) {
  const { p } = await open('?game=gift&glide=0&boat=1&stage=evening&q=low' + dev, w, h); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const c = document.getElementById('gd-compass'); if (!c || c.style.display === 'none') return null; const b = c.getBoundingClientRect(), bad = []; document.querySelectorAll('button,select,.gd-pill:not(#gd-compass):not(#gd-toast)').forEach(e => { if (e.closest('#gd-layer')) return; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return; const q = e.getBoundingClientRect(); if (q.width < 4) return; const ix = Math.min(b.right, q.right) - Math.max(b.left, q.left), iy = Math.min(b.bottom, q.bottom) - Math.max(b.top, q.top); if (ix > 2 && iy > 2) bad.push(e.id || e.className); }); return { x: b.x, y: b.y, w: b.width, h: b.height, bad }; });
  ok(r && r.x >= 0 && r.y >= 0 && r.x + r.w <= w && r.y + r.h <= h && r.h >= 51 && r.bad.length === 0, w + 'x' + h + ': the compass chip is on screen, 52 px tall, overlaps nothing' + (r ? ' ' + JSON.stringify(r) : ' (not shown)'));
  await p.close();
}
{
  const { p } = await open('?ui=0&q=high&seed=1122'); const r = await X(p, () => ({ hash: __li.hashStatic(), tris: __li.stats().tris }));
  ok(r.hash === '8d962c0c' && r.tris === 88790, 'the default page is unchanged (' + r.hash + ', ' + r.tris + ')'); await p.close();
}
await browser.close(); console.log(n - fails + ' of ' + n + ' checks passed'); process.exit(fails ? 1 : 0);
