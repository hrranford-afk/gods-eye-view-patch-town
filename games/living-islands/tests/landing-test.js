/* LANDING TEST for islands_look.html?pass=landing (headless chromium, software GL).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/landing-test.js
   The default-scene golden (8d962c0c) is hashStatic() of the page as it was before the landing pass, seed 1122
   (hashStatic leaves out the one sailing boat, whose position depends on the clock). */
import { launch, open } from './shoot.js';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const GOLD = '8d962c0c', GOLD_TRIS = 88790;
const { browser, ctx } = await launch();
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
const a = await open(ctx, '?ui=0&q=high&seed=1122&pass=landing');
const bad = a.errs.filter(e => !noise(e));
ok(bad.length === 0, 'landing pass loads with 0 console errors/warnings' + (bad.length ? ': ' + bad.slice(0, 3).join(' | ') : ''));
const h1 = await a.page.evaluate(() => __li.hashStatic());
const st = await a.page.evaluate(() => __li.stats());
ok(st.tris < 150000, 'landing pass triangle budget under 150k: ' + st.tris);
const lp = await a.page.evaluate(() => __li.landing());
ok(!!lp && lp.boat && lp.tent, 'landing, boat and tent exist');
await a.page.evaluate(() => __li.zoomLanding());
await a.page.close();
const b = await open(ctx, '?ui=0&q=high&seed=1122&pass=landing');
const h2 = await b.page.evaluate(() => __li.hashStatic());
ok(h1 === h2, 'landing pass is deterministic from the seed (' + h1 + ')');
await b.page.close();
const d = await open(ctx, '?ui=0&q=high&seed=1122');
const hd = await d.page.evaluate(() => __li.hashStatic()); const sd = await d.page.evaluate(() => __li.stats());
ok(hd === GOLD && sd.tris === GOLD_TRIS, 'default scene unchanged: hash ' + hd + ' tris ' + sd.tris);
ok(hd !== h1, 'landing world differs from the default world');
ok(await d.page.evaluate(() => __li.landing() === null), 'default scene has no landing');
await browser.close();
process.exit(fails ? 1 : 0);
