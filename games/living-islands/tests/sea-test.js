/* SEA TEST for islands_look.html?sea=2 (headless chromium, software GL).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/sea-test.js
   Checks: 0 console errors (default, landing, sea=2 high, sea=2 low), ?sea absent keeps the default golden (8d962c0c, 88,790 tris),
   the sea clock freezes (?seat=) so the rendered frame is deterministic, triangle budget, and the Low path renders and differs. */
import crypto from 'node:crypto';
import { launch, open } from './shoot.js';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const GOLD = '8d962c0c', GOLD_TRIS = 88790;
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
const { browser, ctx } = await launch();
const VIEW = { tx: 10, tz: -30, dist: 10, phi: 1.2, theta: 0.3 };   /* open sea only: no boats, gulls, smoke or people in frame */
/* decode a screenshot to RGBA bytes in the page, hash a 6-bit quantised copy and keep a 1/4-size copy for tolerance compares */
async function frameHash(qs, view) {
  const { page, errs } = await open(ctx, qs);
  await page.setViewportSize({ width: 640, height: 400 });
  await page.evaluate(v => { __li.setTide(0); __li.setView(v); }, view || VIEW);
  await page.waitForTimeout(1500);
  const b64 = (await page.screenshot()).toString('base64');
  const px = await page.evaluate(async b => {
    const im = await createImageBitmap(await (await fetch('data:image/png;base64,' + b)).blob());
    const c = new OffscreenCanvas(im.width, im.height), x = c.getContext('2d'); x.drawImage(im, 0, 20, im.width, im.height - 20, 0, 20, im.width, im.height - 20);
    return Array.from(x.getImageData(0, 40, im.width, im.height - 40).data);   /* skip the top rows: distant gulls and the sailing boat live there */
  }, b64);
  const q = Buffer.from(px.map(v => v >> 4));
  const h = crypto.createHash('sha1').update(q).digest('hex').slice(0, 10);
  const st = await page.evaluate(() => ({ ...__li.stats(), hash: __li.hashStatic() }));
  await page.close();
  return { h, px, st, errs: errs.filter(e => !noise(e)) };
}
/* fraction of channel values that differ by more than tol */
const diff = (a, b, tol) => { let n = 0; for (let i = 0; i < a.px.length; i++) if (i % 4 < 3 && Math.abs(a.px[i] - b.px[i]) > tol) n++; return n / (a.px.length * .75); };
const d = await open(ctx, '?ui=0&q=high&seed=1122');
const hd = await d.page.evaluate(() => __li.hashStatic()), sd = await d.page.evaluate(() => __li.stats());
ok(hd === GOLD && sd.tris === GOLD_TRIS, 'default scene (no ?sea): hash ' + hd + ' tris ' + sd.tris);
ok(d.errs.filter(e => !noise(e)).length === 0, 'default scene 0 console errors');
await d.page.close();
const l = await open(ctx, '?ui=0&q=high&seed=1122&pass=landing');
const hl = await l.page.evaluate(() => __li.hashStatic());
await l.page.close();
const A = await frameHash('?ui=0&q=high&seed=1122&pass=landing&sea=2&seat=3.7&tide=0');
const B = await frameHash('?ui=0&q=high&seed=1122&pass=landing&sea=2&seat=3.7&tide=0');
ok(A.errs.length === 0 && B.errs.length === 0, 'sea=2 high: 0 console errors/warnings' + (A.errs.length ? ': ' + A.errs.slice(0, 3).join(' | ') : ''));
ok(A.st.hash === hl, 'sea=2 leaves the world hash alone (landing hash ' + hl + ')');
ok(A.st.tris < 150000, 'triangle budget under 150k: ' + A.st.tris);
const dAB = diff(A, B, 6);
ok(dAB < 0.002, 'frozen sea clock: the sea frame repeats (' + (dAB * 100).toFixed(3) + '% of values differ by more than 6/255; frame hash ' + A.h + ')');
const C = await frameHash('?ui=0&q=high&seed=1122&pass=landing&sea=2&seat=9.2&tide=0');
ok(diff(A, C, 6) > 0.2, 'a different sea time gives a different frame (' + (diff(A, C, 6) * 100).toFixed(1) + '% differ)');
const O = await frameHash('?ui=0&q=high&seed=1122&pass=landing&tide=0');
ok(diff(A, O, 6) > 0.2, 'sea=2 differs from the old sea (' + (diff(A, O, 6) * 100).toFixed(1) + '% differ)');
const LOW = await frameHash('?ui=0&q=low&seed=1122&pass=landing&sea=2&seat=3.7&tide=0');
ok(LOW.errs.length === 0, 'sea=2 Low quality: 0 console errors/warnings' + (LOW.errs.length ? ': ' + LOW.errs.slice(0, 3).join(' | ') : ''));
ok(diff(A, LOW, 6) > 0.1 && LOW.st.quality === 'low', 'Low path renders and differs from High (' + (diff(A, LOW, 6) * 100).toFixed(1) + '% differ)');
const D = await frameHash('?ui=0&q=high&seed=1122&sea=2&seat=3.7&tide=0');
ok(D.errs.length === 0 && D.st.hash === GOLD && D.st.tris === GOLD_TRIS, 'sea=2 on the default scene: 0 errors, world unchanged (' + D.st.hash + ', ' + D.st.tris + ')');
const P = await frameHash('?ui=0&q=high&seed=1122&pass=landing&sea=2&seat=3.7&tide=0&post=0');
ok(P.errs.length === 0, 'sea=2 with ?post=0 (AR path): 0 console errors');
await browser.close();
process.exit(fails ? 1 : 0);
