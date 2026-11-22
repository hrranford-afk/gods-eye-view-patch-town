/* LOOK TEST checks for islands_look.html (headless chromium, software GL).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/look-test.js
   three.js r128 is served from THREE_JS or /tmp/three.js if present, else from the CDN. */
import { launch, open } from './shoot.js';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const { browser, ctx } = await launch();
const a = await open(ctx, '?ui=0&q=high&seed=1122');
const bad = a.errs.filter(e => !/GL Driver Message|GPU stall|ReadPixels/.test(e));
ok(bad.length === 0, 'loads with 0 console errors/warnings' + (bad.length ? ': ' + bad.slice(0, 3).join(' | ') : ''));
const h1 = await a.page.evaluate(() => __li.hash());
const b = await open(ctx, '?ui=0&q=high&seed=1122');
ok(h1 === await b.page.evaluate(() => __li.hash()), 'same seed gives same world hash (' + h1 + ')');
const c = await open(ctx, '?ui=0&q=high&seed=77');
ok(h1 !== await c.page.evaluate(() => __li.hash()), 'different seed gives a different world');
const land = await a.page.evaluate(() => [-1, 0, 1].map(t => __li.landArea(t)));
ok(land[0] > land[1] * 1.05 && land[1] > land[2] * 1.05, 'tide changes visible land area (m2 at -1/0/+1 m): ' + land.map(Math.round).join(' / '));
const st = await a.page.evaluate(() => __li.stats());
ok(st.tris < 150000, 'high quality triangle budget under 150k: ' + st.tris);
await a.page.evaluate(() => __li.setQuality('low'));
await a.page.waitForTimeout(500);
const lo = await a.page.evaluate(() => __li.stats());
ok(lo.tris < st.tris && lo.quality === 'low', 'low quality has fewer triangles: ' + lo.tris);
const cnt = await a.page.evaluate(() => __li.counts());
ok(cnt.houses >= 5 && cnt.conifers > 30 && cnt.rocks > 50, 'islands populated ' + JSON.stringify(cnt));
await browser.close();
process.exit(fails ? 1 : 0);
