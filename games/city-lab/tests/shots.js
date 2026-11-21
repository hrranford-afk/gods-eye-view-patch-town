/* City Lab screenshots (shots/city-1..8.png). Run: NODE_PATH=$(npm root -g) node tests/shots.js */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');
const OUT = path.join(__dirname, '..', 'shots');
(async () => {
  const { srv, base } = await L.serve(); const browser = await L.launch();
  const page = await L.newPage(browser, { width: 1180, height: 820 });
  await L.open(page, base, '?auto=0');
  const ev = (f, a) => page.evaluate(f, a);
  const shot = async (n, p) => { await (p || page).waitForTimeout(250); await (p || page).screenshot({ path: path.join(OUT, 'city-' + n + '.png') }); console.log('city-' + n); };
  /* 1: the whole bakery */
  await ev(() => { CityApp.advance(45); CityApp.setCamera(0.62, 0.52, 4.7); CityApp.render(); });
  await shot(1);
  /* 2: X-ray */
  await ev(() => { CityApp.setCamera(0.9, 0.85, 4.2); CityApp.setXray(true); CityApp.render(); });
  await shot(2);
  /* 4: the three power states side by side (stage only) */
  const crops = [];
  for (const st of ['full', 'half', 'cut']) {
    await ev((st) => { CityApp.setCamera(0.15, 0.8, 3.5); if (st === 'cut') { CityApp.setSupply('full'); CityApp.cutWire(); } else CityApp.setSupply(st); CityApp.advance(2); CityApp.render(); }, st);
    await page.waitForTimeout(400);
    const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 800, height: 820 } }); crops.push(buf.toString('base64'));
  }
  const comp = await browser.newPage({ viewport: { width: 1200, height: 560 } });
  await comp.setContent('<body style="margin:0;background:#222;display:flex;gap:6px;font:bold 22px sans-serif;color:#fff">' + ['POWER OK (green)', 'POWER LOW (amber)', 'POWER CUT (red)'].map((t, i) => '<div style="position:relative;width:396px;height:560px;overflow:hidden"><img style="width:1000px;height:1017px;margin-left:-250px;margin-top:-250px" src="data:image/png;base64,' + crops[i] + '"><div style="position:absolute;left:10px;top:10px;background:#000a;padding:4px 10px;border-radius:8px">' + t + '</div></div>').join('') + '</body>');
  await comp.waitForTimeout(500); await comp.screenshot({ path: path.join(OUT, 'city-4.png') }); console.log('city-4'); await comp.close();
  /* 5: damage: a blast just went off at the oven and the roof */
  await ev(() => { CityApp.reset(); CityApp.advance(70); CityApp.setSupply('full'); CityApp.setXray(false); CityApp.setCamera(0.7, 0.62, 4.6); CityApp.render(); });
  await page.waitForTimeout(200);
  await ev(() => { CityApp.blastAt([-0.55, 0.4, -0.45], 0.25); CityApp.blastAt([-0.35, 1.4, -0.3], 0.28); CityApp.blastAt([0.2, 0.5, 1.0], 0.3); });
  await page.waitForTimeout(350);
  await shot(5);
  /* 6: repair in progress */
  await ev(() => { CityApp.setXray(true); CityApp.setCamera(0.9, 0.9, 4.0); CityApp.repairAll(); CityApp.advance(14); });
  await page.waitForTimeout(300);
  await shot(6);
  /* 7: replace the awning */
  await ev(() => { CityApp.advance(200); CityApp.setXray(false); CityApp.setCamera(0.2, 0.45, 4.2); CityApp.select('awning'); });
  await page.selectOption('#repMat', 'canvas'); await page.selectOption('#repVar', '2'); await page.click('#repGo');
  await page.waitForTimeout(200); await shot(7);
  /* 8: a hostile recipe is refused */
  await ev(() => { document.getElementById('panel').scrollTop = 0; });
  const evil = JSON.parse(JSON.stringify(await ev(() => CityApp.recipe())));
  evil.footprint.w = 1e308; evil.parts[2].kind = 'dragon'; evil.parts[3].material = 'lava'; evil.parts[4].needs = [evil.parts[4].id]; evil.parts[6].pos = [0, 3, 0]; evil.parts[6].needs = []; evil.parts[7].needs = ['ghost'];
  evil.systems.power.demand_kw = 1e12; evil.systems.production.batch_seconds = -5; evil.extra = { onclick: 1 };
  await page.fill('#rcText', JSON.stringify(evil, null, 1));
  await page.click('#rcLoad');
  await ev(() => { document.getElementById('rcMsg').scrollIntoView({ block: 'end' }); });
  await shot(8);
  /* 3: the Inspect panel, on a portrait iPad, with a part selected */
  const p2 = await L.newPage(browser, { width: 834, height: 1194 }); await L.open(p2, base, '?auto=0');
  await p2.evaluate(() => { CityApp.advance(95); CityApp.setCamera(0.7, 0.62, 5.2); CityApp.select('oven'); CityApp.render(); });
  await p2.waitForTimeout(400);
  await p2.screenshot({ path: path.join(OUT, 'city-3.png') }); console.log('city-3 (834x1194)');
  const p3 = await L.newPage(browser, { width: 834, height: 1194 }); await L.open(p3, base, '?auto=0');
  await p3.evaluate(() => { CityApp.advance(95); CityApp.blastAt([-0.55, 0.4, -0.45], 0.25); CityApp.advance(3); document.getElementById('panel').scrollTop = 330; CityApp.render(); });
  await p3.waitForTimeout(400); await p3.screenshot({ path: path.join(OUT, 'city-3b-panel-portrait.png') });
  console.log('errors', page.errs, p2.errs);
  await browser.close(); srv.close();
})();
