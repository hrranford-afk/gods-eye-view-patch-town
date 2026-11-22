/* PEOPLE OPTIONS checks for people_options.html (headless chromium, software GL).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/people-test.js
   three.js r128 is served from THREE_JS or /tmp/three.js if present, else from the CDN. */
import { launch, open } from './people-render.js';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const { browser, ctx } = await launch();
const a = await open(ctx, '?ui=0&t=1.7&sh=1024');
const bad = a.errs.filter(e => !/GL Driver Message|GPU stall|ReadPixels/.test(e));
ok(bad.length === 0, 'loads with 0 console errors/warnings' + (bad.length ? ': ' + bad.slice(0, 3).join(' | ') : ''));
const st = await a.page.evaluate(() => __ppl.stats());
ok([1, 2, 3, 4, 5, 6].every(n => st[n] && st[n].keys.join() === 'man,woman,skip,fish'), 'six styles, each with the same four archetypes (man, woman, skipper, fisher)');
/* triangle and draw budgets per person (meshes = draw calls as built) */
const B = { 1: [400, 1], 2: [3500, 1], 3: [5000, 1], 4: [40, 2], 5: [2500, 8], 6: [4000, 16] };
for (const n of [1, 2, 3, 4, 5, 6]) ok(st[n].tris_max <= B[n][0] && st[n].meshes.every(m => m <= B[n][1]),
  `style ${n} budget: max ${st[n].tris_max} tris (limit ${B[n][0]}), meshes ${st[n].meshes.join('/')} (limit ${B[n][1]})`);
ok(st[3].tris_avg > st[2].tris_avg && st[2].tris_avg > st[1].tris_avg && st[4].tris_avg < st[1].tris_avg, 'cost ordering holds: sprites < blocky < low-poly < vinyl');
/* determinism: same frozen time, same hash, across two fresh loads; a different time gives a different pose */
const h1 = await a.page.evaluate(() => __ppl.hash());
const b = await open(ctx, '?ui=0&t=1.7&sh=1024');
const h2 = await b.page.evaluate(() => __ppl.hash());
ok(h1 === h2, `deterministic: same time gives same state hash (${h1})`);
await b.page.evaluate(() => { __ppl.setTime(2.9); });
const h3 = await b.page.evaluate(() => __ppl.hash());
ok(h3 !== h2, 'animation moves with time (style 5 and 6 poses change)');
await b.page.evaluate(() => { __ppl.setTime(1.7); });
ok((await b.page.evaluate(() => __ppl.hash())) === h2, 'setting the time back restores the exact state');
/* sprites: 8 facings painted, procedural (no image files) */
const kb = await a.page.evaluate(() => { __ppl.render(); return __ppl.texKB(); });
ok(kb > 0 && kb < 4096, 'painted sprite textures are procedural and small: ' + kb + ' KB so far');
/* crowd cost, measured on the real renderer */
const c50 = await a.page.evaluate(() => __ppl.crowd(6, 50));
ok(c50.update_ms < 5, `style 6 animation update for 50 people: ${c50.update_ms} ms per frame (JS side)`);
const c200 = await a.page.evaluate(() => __ppl.crowd(4, 200));
ok(c200.tris_scene <= 200 * 40, `style 4 for 200 people: ${c200.tris_scene} triangles`);
await browser.close();
process.exit(fails ? 1 : 0);
