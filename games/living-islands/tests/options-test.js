/* RENDER OPTIONS checks for render_options.html (headless chromium, software GL).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/options-test.js
   Checks per mode 1..6: loads with 0 console errors/warnings, deterministic world hash and baked-colour hash (two loads agree),
   mode 6 under the 150k triangle budget. Also prints scene/frame triangles, draw calls and bake time. */
import { launch } from './shoot.js';
import { openMode } from './options-shots.js';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const { browser, ctx } = await launch();
const geos = {};
for (let m = 1; m <= 6; m++) {
  const hs = [];
  for (let pass = 0; pass < 2; pass++) { /* two independent loads, one page at a time (software GL is slow with two live pages) */
    const a = await openMode(ctx, m);
    if (pass === 0) ok(a.errs.length === 0, `mode ${m} loads with 0 console errors/warnings` + (a.errs.length ? ': ' + a.errs.slice(0, 3).join(' | ') : ''));
    hs.push(await a.page.evaluate(() => [__li.hash(), __li.geoHash()]));
    if (pass === 1) {
      const st = await a.page.evaluate(() => ({ ...__li.stats(), bake: __li.bakeMs() }));
      console.log(`  mode ${m}: tris ${st.tris}, frame tris ${st.renderTris}, draw calls ${st.calls}, bake ${st.bake} ms`);
      if (m === 6) ok(st.tris < 150000 && st.renderTris < 150000, `mode 6 within 150k triangle budget: scene ${st.tris}, rendered incl. shadow pass ${st.renderTris}`);
    }
    await a.page.close();
  }
  ok(hs[0][0] === hs[1][0] && hs[0][1] === hs[1][1], `mode ${m} deterministic: world ${hs[0][0]} colours ${hs[0][1]}`);
  geos[m] = hs[0][1];
}
ok(new Set([geos[2], geos[3], geos[6]]).size === 3, 'baked/painted modes 2, 3, 6 produce different vertex colours');
await browser.close();
process.exit(fails ? 1 : 0);
