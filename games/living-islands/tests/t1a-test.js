/* T1a picture fixes 1 to 3 (cream shape, film grain moire, sky banding). Software GL, not a device.
   Run: NODE_PATH=$(npm root -g) node tests/t1a-test.js [only=1,2,3] */
import fs from 'node:fs';
import { launch, ROOT } from './shoot.js';
import { checkPng, worldShot, decodePng } from './pixel-check.js';
import { grainSpectrum, bandRuns, streakiness } from './t1a-metrics.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const PAGE = arg('file') || 'islands_look.html';   /* file=_before.html measures an older copy of the page for the before numbers */
const only = (arg('only') || '1,2,3,4').split(',').map(Number), want = n => only.includes(n);
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const { browser, ctx } = await launch(); launch.browser = browser; const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs, w, h) {
  const p = await ctx.newPage(); p.setDefaultTimeout(300000); await p.setViewportSize({ width: w || 1000, height: h || 625 }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs + '&glide=0'); await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  if (/game=gift/.test(qs)) await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 });
  await p.waitForTimeout(3000); return { p, errs };
}
/* ===== 1. the cream shape is a gull: no gull may be drawn within 60 m of the gift camera ===== */
if (want(1)) {
  const { p, errs } = await open('?game=gift&q=high&device=desktop&dev=1');
  const sp = await p.evaluate(() => __gift.spots().build.cottage);
  await p.evaluate(sp => { window.__bad = 0; window.__n = 0; window.__mind = 1e9; window.__gulls = 0; const sc = __li.boatkit.dbg().scene; sc.onBeforeRender = (r, s, c) => { window.__n++; sc.children.forEach(o => { if (o.isMesh && o.geometry && o.geometry.attributes.position.count === 6 && o.material.type === 'MeshBasicMaterial' && o.position.y > 4) { window.__gulls++; const d = o.position.distanceTo(c.position); if (o.visible && d < window.__mind) window.__mind = d; if (o.visible && d < 60) window.__bad++; } }); }; }, sp);
  for (let i = 0; i < 10; i++) { await p.evaluate(([x, z, d]) => __li.setView({ tx: x, tz: z, dist: d, phi: .8, theta: .6 }), [sp.x, sp.z, 12 + (i % 4) * 4]); await p.waitForTimeout(2500); }
  const r = await p.evaluate(() => ({ frames: window.__n, bad: window.__bad, gulls: window.__gulls, mind: window.__mind }));
  ok(r.frames > 5 && r.gulls >= 9 * 5, 'cream shape: the check really looked (' + r.frames + ' rendered frames, ' + r.gulls + ' gull draws considered)');
  ok(r.bad === 0, 'cream shape: no gull quad was drawn within 60 m of the camera at render time in ' + r.frames + ' frames (nearest drawn gull ' + r.mind.toFixed(0) + ' m; before the fix 4 m and 369 bad draws in 54 frames)');
  const buf = await worldShot(p, 'cream-build'); const c = checkPng(buf);
  ok(c.stats.creamCells === 0 || !c.why.some(w => /cream/.test(w)), 'cream shape: no large flat cream quad in the build-site shot (' + JSON.stringify(c.stats) + ')');
  ok(errs.length === 0, 'gift page: 0 console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
/* ===== 2. film grain: whole buffer pixels, white (no beat), faded where the canvas is stretched by a non-integer factor ===== */
async function sea(dsf, w, h) {
  const c = await launch.browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
  if (fs.existsSync('/tmp/three.js')) await c.route('**/three.min.js', r => r.fulfill({ path: '/tmp/three.js', contentType: 'application/javascript' }));
  const p = await c.newPage(); p.setDefaultTimeout(300000); const errs = []; p.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html?ui=0&q=high&seed=1122&sea=2'); await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 }); await p.waitForTimeout(4000);
  const g = await p.evaluate(() => __li.grain()), img = decodePng(await p.screenshot()); await c.close(); return { g, img, errs };
}
if (want(2)) {
  /* the bare table surround (top left, 64 px square) is a smooth gradient: all that is left after a high-pass is grain. q=high renders at pixel ratio 1.5 at most. */
  const a = await sea(1.5, 700, 450), s1 = grainSpectrum(a.img, 5, 5, 64), e1 = grainSpectrum(a.img, 5, 5, 64, true);
  ok(a.g && a.g.gr === 1 && Math.abs(a.g.stretch - 1) < .01, 'grain: device pixel ratio 1.5 = buffer pixel ratio 1.5, stretch ' + (a.g && a.g.stretch.toFixed(2)) + ', grain on (uGr ' + (a.g && a.g.gr) + ')');
  ok(s1.sd > .25 && s1.sd < .6, 'grain: still there at about the old strength (high-pass sd ' + s1.sd.toFixed(2) + ' levels; the old sin hash measured 0.36; the output dither is now triangular, one level)');
  ok(s1.peak < 20 && e1.peak < 100, 'grain: no beat or lattice: strongest spectral line ' + s1.peak.toFixed(1) + 'x the noise floor (white noise 8 to 15; interleaved gradient noise measured 131), energy spectrum line ' + e1.peak.toFixed(0) + ' (before 39 to 62)');
  const b = await sea(2, 700, 450), s2 = grainSpectrum(b.img, 5, 5, 64);
  ok(b.g && b.g.gr === 0 && Math.abs(b.g.stretch - 4 / 3) < .01, 'grain: the canvas is stretched 1.33x on an iPad-like screen (dpr 2, render 1.5): stretch ' + (b.g && b.g.stretch.toFixed(2)) + ', grain strength down to the half-level dither (uGr ' + (b.g && b.g.gr) + ')');
  ok(s2.amp < .2, 'grain: no periodic component in the stretched picture above 0.2 levels (' + s2.amp.toFixed(3) + ')');
  const c = await sea(3, 480, 320);
  ok(c.g && c.g.gr === 1 && Math.abs(c.g.stretch - 2) < .01, 'grain: an exact 2x stretch (dpr 3, render 1.5) keeps the grain, it lands on whole device pixels (stretch ' + (c.g && c.g.stretch.toFixed(2)) + ')');
  ok(a.errs.length + b.errs.length + c.errs.length === 0, 'grain pages: 0 console errors');
}
/* ===== 3. sky: dithered gradients (no 8-bit steps), broken cirrus streaks ===== */
async function skyShot(dsf) {
  const c = await launch.browser.newContext({ viewport: { width: 1000, height: 625 }, deviceScaleFactor: dsf });
  if (fs.existsSync('/tmp/three.js')) await c.route('**/three.min.js', r => r.fulfill({ path: '/tmp/three.js', contentType: 'application/javascript' }));
  const p = await c.newPage(); p.setDefaultTimeout(300000); const errs = []; p.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/' + PAGE + '?game=gift&q=high&device=desktop&dev=1&glide=0&weather=clear');   /* weather=clear: a fixed state with cirrus 0.8 */
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 }); await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForTimeout(3000);
  await p.evaluate(v => __li.setView(v), { tx: 0, tz: 0, dist: 200, phi: .05, theta: .6 }); await p.waitForTimeout(8000); await p.evaluate(v => __li.setView(v), { tx: 0, tz: 0, dist: 200, phi: .05, theta: .6 }); await p.waitForTimeout(8000);   /* the camera eases at one frame a second in software GL: ask twice */
  const buf = await worldShot(p, null); await c.close(); return { img: decodePng(buf), buf, errs };
}
if (want(3)) {
  for (const dsf of [1.5, 2]) {
    const s = await skyShot(dsf), k = dsf, px = v => Math.round(v * k);
    const band = bandRuns(s.img, px(5), px(150), px(40), px(110)), res = streakiness(s.img, px(5), px(150), px(40), px(110), px(40)), st = streakiness(s.img, 0, 0, px(1000), px(140), px(250));
    fs.writeFileSync('/tmp/t1a-sky-' + PAGE.replace(/\W/g, '') + '-' + dsf + '.png', s.buf);
    console.log('INFO ' + PAGE + ' dsf ' + dsf + ' sky strip: run ' + band.meanRun.toFixed(3) + ' max ' + band.maxRun + ', step residual sd ' + res.sd.toFixed(3) + ', streak sd ' + st.sd.toFixed(3) + ' worst ' + st.worst.toFixed(2));
    if (PAGE === 'islands_look.html') {
      ok(st.sd < .5 && st.worst < 2.4, 'sky dsf ' + dsf + ': cirrus streaks broken: streak residual sd ' + st.sd.toFixed(3) + ' levels, worst row ' + st.worst.toFixed(2) + ' (before 0.57 and 2.60)');
      const lim = dsf === 2 ? 3.2 : 1.5, was = dsf === 2 ? 5.23 : 1.60;
      ok(band.meanRun < lim, 'sky dsf ' + dsf + ': gradient strip has short flat runs: mean ' + band.meanRun.toFixed(2) + ' rows (before ' + was + '; limit ' + lim + ')');
      ok(s.errs.length === 0, 'sky dsf ' + dsf + ': 0 console errors');
    }
  }
}
if (want(4)) {
  const { p, errs } = await open('?ui=0&q=high&seed=1122');
  const r = await p.evaluate(() => ({ hash: __li.hashStatic(), tris: __li.stats().tris }));
  ok(r.hash === '8d962c0c', 'default page hash is 8d962c0c (' + r.hash + ')'); ok(r.tris === 88790, 'default page is 88,790 triangles (' + r.tris + ')');
  ok(errs.length === 0, 'default page: 0 console errors'); await p.close();
}
await browser.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
