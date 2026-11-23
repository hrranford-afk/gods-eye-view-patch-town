/* Pictures for MACRO_WIRE.md: four numbered before/after shots, same camera, seed 135 (strong storms), frozen clocks so they repeat exactly.
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/macro-wire-render.js
   1 before, calm day (no ?macro, weather fair)      2 after, calm day (macro hour 6: 5 m/s, Hs 0.9 m)
   3 before, storm (no ?macro, weather storm)         4 after, storm approach (macro hour 30: 20.5 m/s, Hs 5.5 m, vortex 'distant' and closing)
   Outputs shots/macro-wire-1-before-calm.png, -2-after-calm, -3-before-storm, -4-after-storm. */
import path from 'node:path';
import { launch, ROOT } from './shoot.js';
const { browser, ctx } = await launch();
const CAM = { tx: -14, tz: 22, dist: 62, phi: 0.58, theta: 0.55 };
const base = '?ui=0&q=high&seed=135&boats=2&sea=2&seat=5&wt=1';
const shots = [
  ['macro-wire-1-before-calm', base + '&weather=fair'],
  ['macro-wire-2-after-calm', base + '&weather=auto&macro=1&mh=6&mt=0'],
  ['macro-wire-3-before-storm', base + '&weather=storm'],
  ['macro-wire-4-after-storm', base + '&weather=auto&macro=1&mh=30&mt=0']
];
for (const [name, qs] of shots) {
  const page = await ctx.newPage(); await page.setViewportSize({ width: 1200, height: 800 }); const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + ROOT + '/islands_look.html' + qs);
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  await page.evaluate(c => __li.setView(c), CAM); await page.waitForTimeout(2500); await page.evaluate(c => __li.setView(c), CAM); await page.waitForTimeout(2500);
  const out = path.join(ROOT, 'shots', name + '.png'); await page.screenshot({ path: out });
  const info = await page.evaluate(() => __li.macro ? { st: __li.macro.state() } : { w: __li.weather && __li.weather() });
  console.log('wrote', out, JSON.stringify(info.st ? { hour: info.st.hour, U: +info.st.wind.speed.toFixed(1), Hs: +info.st.seaHs.toFixed(2), tide: info.st.tide.level, storm: +info.st.storm.index.toFixed(2) } : { state: info.w && info.w.state }), 'errors', errs.filter(e => !/GL Driver|GPU stall|ReadPixels/.test(e)).length);
  await page.close();
}
await browser.close();
