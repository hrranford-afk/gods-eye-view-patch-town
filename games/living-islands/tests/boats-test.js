/* BOATS TEST for islands_look.html?boats=2 (headless chromium, software GL).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/boats-test.js
   Checks: default scene untouched (hash 8d962c0c, 88,790 tris, no mask or ring meshes); ?boats=2 0 console errors in the default scene, landing, with sea=2, flow=1, seabed=1, weather=, Low, ?post=0;
   every boat has a depth-only mask mesh (colorWrite false, depthWrite true, rendered before the sea); the full stack (landing+flow+seabed+weather) stays under 150k triangles;
   Low path has fewer triangles; skiff L:B >= 3; pixel check on a top-down close-up: the rectangle inside the hull holds no sea colour with the mask, and does hold sea colour with the debug switch ?nomask=1;
   the boats do not move (positions equal the default scene). The screenshots in shots/boats-*.png come from tests/boats-render.js. */
import crypto from 'node:crypto';
import { launch, open, ROOT } from './shoot.js';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const GOLD = '8d962c0c', GOLD_TRIS = 88790;
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
const { browser, ctx } = await launch();
/* like shoot.js open() but waits up to 15 minutes: the full stack is heavy for software GL on a shared CPU */
async function openLong(qs) {
  const page = await ctx.newPage(); await page.setViewportSize({ width: 480, height: 320 }); const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + ROOT + '/islands_look.html' + (qs || ''));
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  return { page, errs };
}
const info = async qs => { const { page, errs } = await openLong(qs); const st = await page.evaluate(() => ({ ...__li.stats(), hash: __li.hashStatic(), boats: __li.boats() })); return { page, st, errs: errs.filter(e => !noise(e)) }; };
const d = await info('?ui=0&q=high&seed=1122');
ok(d.st.hash === GOLD && d.st.tris === GOLD_TRIS, 'default scene (no ?boats): hash ' + d.st.hash + ' tris ' + d.st.tris);
ok(d.errs.length === 0, 'default scene 0 console errors');
ok(d.st.boats.every(b => !b.mask), 'default scene: no hull mask meshes');
/* clock-independent read: a sailing boat's position is a function of the page clock (it differs between two loads by however long each took to start), so only the kind and flag are compared for it; moored and beached boats are fixed in the world and compared to 0.01 m (same idea as hashStatic) */
const boatKey = b => b.sail ? [b.kind, 'sail'] : [b.kind, +b.x.toFixed(2), +b.z.toFixed(2)];
const defPos = d.st.boats.map(boatKey);
await d.page.close();
const b2 = await info('?ui=0&q=high&seed=1122&boats=2');
ok(b2.errs.length === 0, '?boats=2 0 console errors (' + b2.errs.slice(0, 2).join(' | ') + ')');
ok(b2.st.hash === GOLD, '?boats=2 leaves the world state hash alone (' + b2.st.hash + ')');
ok(b2.st.boats.length > 0 && b2.st.boats.every(b => b.mask), '?boats=2: every boat (' + b2.st.boats.length + ') has a hull mask mesh');
ok(JSON.stringify(b2.st.boats.map(boatKey)) === JSON.stringify(defPos), '?boats=2: boat kinds and fixed-boat positions unchanged (sailing boats compared by kind: their position follows the page clock)');
const mk = await b2.page.evaluate(() => __li.maskInfo());
ok(mk.length === b2.st.boats.length && mk.every(m => m.colorWrite === false && m.depthWrite === true && m.depthTest === true && m.renderOrder < m.seaOrder && m.hullOrder < m.renderOrder), 'mask: colorWrite false, depthWrite true, depthTest true, renderOrder ' + mk.map(m => m.renderOrder).join(',') + ' after the hull (' + mk[0].hullOrder + ') and before the sea (' + mk[0].seaOrder + ')');
ok(b2.st.boats.every(b => b.Wd > 0) && (await b2.page.evaluate(() => __li.boatBeam())).every(r => r.ratio >= 3), 'skiff length to beam is at least 3 for every boat (' + (await b2.page.evaluate(() => __li.boatBeam())).map(r => r.ratio.toFixed(2)).join(', ') + ')');
const trisHigh = b2.st.tris; await b2.page.close();
const lo = await info('?ui=0&q=low&seed=1122&boats=2');
const loL = await info('?ui=0&q=low&seed=1122&pass=landing&post=0&boats=2'); ok(loL.errs.length === 0, '?boats=2&pass=landing&post=0&q=low: 0 console errors (' + loL.st.tris + ' tris)'); await loL.page.close();
ok(lo.errs.length === 0 && lo.st.tris < trisHigh, '?boats=2 Low path: 0 errors, ' + lo.st.tris + ' tris < High ' + trisHigh);
await lo.page.close();
for (const q of ['&post=0', '&sea=2', '&flow=1', '&seabed=1', '&weather=fair', '&pass=landing', '&pass=landing&post=0']) {
  const r = await info('?ui=0&q=high&seed=1122&boats=2' + q);
  ok(r.errs.length === 0 && r.st.boats.every(b => b.mask), '?boats=2' + q + ': 0 console errors, masks present (' + r.st.tris + ' tris)' + (r.errs.length ? ' ' + r.errs[0] : ''));
  await r.page.close();
}
const full = await info('?ui=0&q=high&seed=1122&pass=landing&sea=2&flow=1&seabed=1&weather=fair&boats=2');
ok(full.errs.length === 0 && full.st.tris < 150000, 'full stack landing+flow+seabed+weather+boats=2: 0 errors, ' + full.st.tris + ' tris (< 150,000)');
const fullNo = await info('?ui=0&q=high&seed=1122&pass=landing&sea=2&flow=1&seabed=1&weather=fair');
console.log('     (same stack without boats=2: ' + fullNo.st.tris + ' tris; boats=2 adds ' + (full.st.tris - fullNo.st.tris) + ')');
await full.page.close(); await fullNo.page.close();
/* pixel check: top-down close-up of the first moored boat, sample a rectangle along the floor between the thwarts */
async function shot(qs) {
  const { page } = await open(ctx, qs); await page.setViewportSize({ width: 800, height: 600 });
  await page.evaluate(() => __li.setTide(0));
  const bt = await page.evaluate(() => __li.boats().find(b => b.kind === 'moored' && !b.sail));
  for (let i = 0; i < 2; i++) { await page.evaluate(b => __li.setView({ tx: b.x, tz: b.z, dist: 9, phi: 1.35, theta: 2.3 }), bt); await page.waitForTimeout(700); }
  const b64 = (await page.screenshot()).toString('base64');
  const out = await page.evaluate(async b => {
    const im = await createImageBitmap(await (await fetch('data:image/png;base64,' + b)).blob()); const c = new OffscreenCanvas(im.width, im.height), x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const pr = __li.boatProject(), W = im.width, H = im.height;
    const d = x.getImageData(0, 0, W, H).data, at = (px, py) => { const i = (Math.round(py) * W + Math.round(px)) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    return { refs: pr.refs.map(p => at(p[0], p[1])), sample: pr.pts.map(p => at(p[0], p[1])), W, H };
  }, b64);
  await page.close(); return out;
}
const isSea = (c, refs) => refs.some(s => Math.abs(c[0] - s[0]) < 24 && Math.abs(c[1] - s[1]) < 24 && Math.abs(c[2] - s[2]) < 24);
const A = await shot('?ui=0&q=high&seed=1122&seat=3.7&boats=2'), N = await shot('?ui=0&q=high&seed=1122&seat=3.7&boats=2&nomask=1');
const nA = A.sample.filter(c => isSea(c, A.refs)).length, nN = N.sample.filter(c => isSea(c, N.refs)).length;
ok(nA === 0, 'after (mask on): 0 of ' + A.sample.length + ' samples inside the hull match the sea colour (sea refs ' + A.refs.slice(0, 2).map(c => c.join(',')).join(' / ') + ')');
ok(nN >= 5, 'control (?nomask=1): ' + nN + ' of ' + N.sample.length + ' samples inside the hull show the sea, so the probe sees water when the mask is absent');
console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); await browser.close(); process.exit(fails ? 1 : 0);
