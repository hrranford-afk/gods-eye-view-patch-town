/* Frame time of the bakery in headless software GL (SwiftShader, no GPU), next to the toy game's Lab for scale. RELATIVE numbers only: a real GPU is far faster.
   Run: NODE_PATH=$(npm root -g) node tests/frametime.js */
'use strict';
const L = require('./lib.js');
(async () => {
  const { srv, base } = await L.serve(); const browser = await L.launch();
  const out = {};
  const fpsOf = (page, ms) => page.evaluate((ms) => new Promise((res) => { let n = 0, t0 = performance.now(), gaps = []; let last = t0; (function f(t) { n++; gaps.push(t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else res({ frames: n, ms: (t - t0) / n }); })(t0); }), ms);
  for (const vp of [{ width: 1180, height: 820 }, { width: 834, height: 1194 }]) {
    const p = await L.newPage(browser, vp); await L.open(p, base, '?auto=0');
    await p.evaluate(() => { CityApp.advance(30); CityApp.setCamera(0.6, 0.55, 4.7); });
    const g = await fpsOf(p, 5000), r = await p.evaluate(() => ({ render_ms: +CityApp.measure(15).toFixed(1), stats: CityApp.stats() }));
    out['bakery ' + vp.width + 'x' + vp.height] = { frame_gap_ms: +g.ms.toFixed(0), fps: +(1000 / g.ms).toFixed(1), render_ms: r.render_ms, draw_calls: r.stats.calls, triangles: r.stats.triangles, meshes: r.stats.meshes };
    await p.evaluate(() => CityApp.setXray(true));
    const gx = await fpsOf(p, 4000); out['bakery X-ray ' + vp.width + 'x' + vp.height] = { frame_gap_ms: +gx.ms.toFixed(0), fps: +(1000 / gx.ms).toFixed(1) };
    await p.close();
  }
  for (const [nm, target] of [['sofa-siege Lab: Cottage', 'cottage'], ['sofa-siege Lab: Castle', 'castle']]) {
    const p = await L.newPage(browser, { width: 1180, height: 820 });
    await p.goto(base + '/sofa-siege/index.html?lab=1'); await p.waitForFunction('window.__done', null, { timeout: 60000 });
    await p.evaluate((t) => { SG.labLoadTarget(t); SG.cam = 3; }, target); await p.waitForTimeout(500);
    const g = await fpsOf(p, 5000); out[nm] = { frame_gap_ms: +g.ms.toFixed(0), fps: +(1000 / g.ms).toFixed(1) };
    await p.close();
  }
  console.log(JSON.stringify(out, null, 1));
  require('fs').writeFileSync(__dirname + '/frametime.json', JSON.stringify(out, null, 1));
  await browser.close(); srv.close();
})();
