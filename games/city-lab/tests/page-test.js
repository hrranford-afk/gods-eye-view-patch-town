/* City Lab page test (headless Chromium, software GL, no iPad). Run: NODE_PATH=$(npm root -g) node tests/page-test.js */
'use strict';
const L = require('./lib.js');
let n = 0, bad = 0;
const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (!cond && extra ? '  -> ' + extra : '')); };
const FIELDS = ['f-time', 'f-status', 'f-power-state', 'f-power-supply', 'f-power-demand', 'f-power-draw', 'f-workers', 'f-stock', 'f-produced', 'f-sold', 'f-income', 'f-costs', 'f-ipm', 'f-cpm', 'f-net', 'f-balance', 'f-costsplit', 'f-events', 'f-part'];

(async () => {
  const { srv, base } = await L.serve(); const browser = await L.launch();
  const page = await L.newPage(browser, { width: 1180, height: 820 });
  await L.open(page, base, '?auto=0');
  const ev = (f, a) => page.evaluate(f, a);

  /* 1. loads, scene, no errors */
  ok('the page loads with no errors and no failed requests', page.errs.length === 0, page.errs.join(' | '));
  const st = await ev(() => CityApp.stats());
  ok('the bakery is built from the recipe: 57 parts, each its own named group', st.parts === 57 && await ev(() => { const B = CityApp.builder(); return Object.keys(B.parts).length === 57 && Object.keys(B.parts).every((id) => B.parts[id].group.name === id); }), JSON.stringify(st));
  ok('the title names the recipe', (await page.textContent('#ttl')).indexOf('Miniature Bakery') >= 0);
  await ev(() => { CityApp.advance(75); });
  ok('the canvas is drawn (not a flat colour)', await ev(() => { CityApp.render(); const c = document.getElementById('view'), x = document.createElement('canvas'); x.width = 64; x.height = 64; const g = x.getContext('2d'); g.drawImage(c, 0, 0, 64, 64); const d = g.getImageData(0, 0, 64, 64).data; const seen = new Set(); for (let i = 0; i < d.length; i += 4) seen.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)); return seen.size > 25; }));

  /* 2. every inspect panel field is populated */
  await page.click('#bP');   /* pause so the numbers hold still */
  const vals = await ev((F) => F.map((f) => [f, document.getElementById(f).textContent.trim()]), FIELDS);
  const empty = vals.filter((v) => !v[1] || /NaN|undefined|null|Infinity/.test(v[1]));
  ok('every Inspect panel field is populated (' + FIELDS.length + ' fields, none empty, none NaN)', empty.length === 0, JSON.stringify(empty));
  const w = await ev(() => document.querySelectorAll('#f-workers li').length), ss = await ev(() => document.querySelectorAll('#f-stock li').length), evn = await ev(() => document.querySelectorAll('#f-events .ev').length);
  ok('3 workers are listed with what each is doing, 4 stocks with capacity, and up to 8 events', w === 3 && ss === 4 && evn >= 3 && evn <= 8, w + ' ' + ss + ' ' + evn);
  ok('the numbers match the simulation (income, balance)', await ev(() => { const m = CityApp.summary(); return document.getElementById('f-income').textContent === (Math.round(m.income * 10) / 10).toString().replace(/\.0$/, '') && Math.abs(parseFloat(document.getElementById('f-balance').textContent) - Math.round(m.balance * 10) / 10) < 0.11; }));
  await page.click('#bP');

  /* 3. tap a part with a real mouse click */
  await ev(() => { CityApp.setCamera(0.15, 0.5, 4.6); CityApp.render(); });
  const sp = await ev(() => CityApp.screenOf('sign'));
  await page.mouse.click(sp.x, sp.y);
  await page.waitForTimeout(100);
  const sel = await ev(() => CityApp.selected);
  ok('a real click on the sign selects a part at that spot (got ' + sel + ')', sel === 'sign' || sel === 'awning', sel);
  await ev(() => CityApp.select('oven'));
  const pt = await page.textContent('#f-part');
  ok('the part card shows name, stage, needs, needed-by, health, replaceable', /Bread oven/.test(pt) && /walls/.test(pt) && /Floor slab/.test(pt) && /100%/.test(pt) && /Replaceable/.test(pt) && /Needed by/.test(pt), pt.slice(0, 200));
  await ev(() => CityApp.select('beam.f'));
  ok('a frame beam says how many parts fall with it', /also falls/.test(await page.textContent('#f-part')) && parseInt((await page.textContent('#f-part')).match(/also falls(\d+)/)?.[1] || '0', 10) > 10, await page.textContent('#f-part'));
  ok('a part that is not replaceable says so', await ev(() => { CityApp.select('floor'); return /Replaceable\s*no/.test(document.getElementById('f-part').textContent); }));

  /* 4. orbit by dragging */
  const az0 = await ev(() => CityApp.camera().az);
  await page.mouse.move(300, 500); await page.mouse.down(); await page.mouse.move(380, 520, { steps: 4 }); await page.mouse.up();
  ok('dragging turns the table (orbit)', Math.abs((await ev(() => CityApp.camera().az)) - az0) > 0.3);

  /* 5. X-ray and the power-flow line */
  await page.click('#bX');
  ok('X-ray ghosts the shell and leaves the inside solid', await ev(() => { const B = CityApp.builder(); return B.xray && B.parts['panel.f0'].group.children[0].material.transparent === true && B.parts.oven.group.children[0].material.transparent !== true; }));
  ok('the power line is visible in X-ray, green while the power is ok', await ev(() => { const s = CityApp.state(); return s.power.state === 'ok'; }));
  await page.click('[data-sup="half"]'); await ev(() => CityApp.advance(2));
  ok('a brownout turns the pill amber (low) and the log says so', /low/.test(await page.textContent('#f-power-state')) && await ev(() => CityApp.summary().events.concat(CityApp.state().log).some((e) => /Power low/.test(e.text))));
  await page.click('#dWire'); await ev(() => CityApp.advance(2));
  ok('cutting the wire turns the pill red (CUT), power 0, production says power cut', /CUT/.test(await page.textContent('#f-power-state')) && /cut/.test(await page.textContent('#f-status')), await page.textContent('#f-status'));
  ok('the meter box is still there but the cable is not; the status text shows in the Events', await ev(() => CityApp.state().present.meter === true && CityApp.state().present.wire === false));
  await page.click('[data-sup="full"]'); await page.click('#rAll'); await ev(() => CityApp.advance(40));
  ok('Repair all: the wire is back, power ok again', await ev(() => CityApp.state().present.wire) && /power ok/.test(await page.textContent('#f-power-state')));

  /* 6. damage, then repair, end to end with real buttons */
  await ev(() => CityApp.advance(10));
  const b0 = await ev(() => CityApp.state().prod.batches);
  await page.click('#dOven'); await page.click('#dRoof'); await ev(() => CityApp.advance(15));
  const d1 = await ev(() => { const s = CityApp.state(); return { oven: s.present.oven, tiles: CityApp.tagIds('roof').filter((i) => s.present[i]).length, missing: CityApp.summary().missing, status: CityApp.summary().status, spoiled: s.spoiled.flour || 0, ch: s.present.chimney }; });
  ok('Smash oven and Drop roof tiles: the oven and all 12 tiles are gone, the chimney that stood on tiles fell, status says no oven', d1.oven === false && d1.tiles === 0 && d1.ch === false && /no .*oven/.test(d1.status), JSON.stringify(d1));
  ok('with the roof off, flour spoils (the log and the spoiled counter show it)', d1.spoiled > 0.3, d1.spoiled);
  ok('the missing parts appear as repair chips', (await ev(() => document.querySelectorAll('#missing .chip').length)) >= 10);
  const bBefore = await ev(() => CityApp.state().prod.batches);
  await page.click('#rAll'); await ev(() => CityApp.advance(2));
  ok('Repair all: a worker is walking to a part (the workers list says so)', /walking|repairing/.test(await page.textContent('#f-workers')), await page.textContent('#f-workers'));
  await page.screenshot({ path: L.GAMES + '/city-lab/shots/.page-mid-repair.png' });
  await ev(() => CityApp.advance(150));
  const d2 = await ev(() => { const s = CityApp.state(); return { missing: CityApp.summary().missing, batches: s.prod.batches, status: CityApp.summary().status, repairs: s.repairs.done, cost: s.costs.repairs, orders: s.orders.length }; });
  ok('after 150 s of repairs everything is back (nothing missing, no orders left)', d2.missing === 0 && d2.orders === 0, JSON.stringify(d2));
  await ev(() => CityApp.advance(70));
  ok('production recovers after the repair (more batches finish)', (await ev(() => CityApp.state().prod.batches)) > bBefore, 'batches ' + bBefore + ' -> ' + (await ev(() => CityApp.state().prod.batches)));
  ok('repairs cost material (money went out) and the log has started and finished lines', d2.cost > 20 && await ev(() => CityApp.state().log.some((e) => /Repair finished/.test(e.text))), JSON.stringify(d2));

  /* 7. blast tool with real clicks */
  await ev(() => { CityApp.setXray(true); CityApp.setCamera(0.4, 0.95, 4.4); CityApp.render(); });
  const op = await ev(() => CityApp.screenOf('oven'));
  await page.click('#tBlast'); ok('the Blast tool lights up', await ev(() => document.getElementById('tBlast').classList.contains('on')));
  await page.mouse.click(op.x, op.y); await page.waitForTimeout(100);
  const bl = await ev(() => { const s = CityApp.state(); return { ovenGone: !s.present.oven, miss: CityApp.summary().missing, tool: CityApp.tool, log: s.log.filter((e) => e.type === 'blast').length }; });
  ok('a click with the Blast tool destroys parts at that point (a blast line is in the log), then the tool switches off', bl.miss > 0 && bl.log === 1 && bl.tool === 'inspect', JSON.stringify(bl));
  await ev(() => CityApp.repairAll()); await ev(() => CityApp.advance(200));
  await page.click('#tRemove'); const sp2 = await ev(() => CityApp.screenOf('counter')); await page.mouse.click(sp2.x, sp2.y); await page.waitForTimeout(100);
  ok('the Remove tool takes a tapped part off', await ev(() => { const s = CityApp.state(); return !s.present.counter || !s.present.oven || CityApp.summary().missing > 0; }));
  await ev(() => { CityApp.repairAll(); CityApp.advance(200); });

  /* 8. replace a part */
  await ev(() => CityApp.select('awning'));
  await page.selectOption('#repMat', 'paint_blue'); await page.selectOption('#repVar', '2'); await page.click('#repGo');
  const rep = await ev(() => { const d = CityApp.builder().parts.awning.def; return { m: d.material, v: d.variant, vis: CityApp.builder().parts.awning.group.visible, msg: document.getElementById('repMsg').textContent, copy: JSON.parse(JSON.stringify(CityApp.recipe())).parts.find((p) => p.id === 'awning').variant }; });
  ok('Replace changes the awning (material and stripes), the part is rebuilt and visible, and the recipe copy has the new variant', rep.m === 'paint_blue' && rep.v === 2 && rep.vis && rep.copy === 2 && /replaced/.test(rep.msg), JSON.stringify(rep));
  await ev(() => CityApp.select('sign')); await page.fill('#repLbl', 'FRESH BREAD'); await page.click('#repGo');
  ok('Replace can change a sign text', await ev(() => CityApp.recipe().parts.find((p) => p.id === 'sign').label === 'FRESH BREAD'));
  await ev(() => CityApp.select('floor')); await page.click('#repGo');
  ok('Replace of a part that is not replaceable is refused with a plain message', /refused/.test(await page.textContent('#repMsg')) && /not replaceable/.test(await page.textContent('#repMsg')), await page.textContent('#repMsg'));
  const rr = await ev(() => CityApp.replace('awning', { material: 'lava' }));
  ok('Replace with an unknown material is refused and nothing changes', rr.ok === false && await ev(() => CityApp.recipe().parts.find((p) => p.id === 'awning').material === 'paint_blue'));
  const rr2 = await ev(() => CityApp.replace('awning', { kind: 'oven', size: [3, 3, 3] }));
  ok('Replace with a size that would overlap is refused', rr2.ok === false);
  await ev(() => CityApp.select('awning')); await ev(() => CityApp.destroy(['awning'], 'test'));
  ok('replacing keeps working after damage: the awning is gone, the sign that hung on it fell too', await ev(() => !CityApp.state().present.awning && !CityApp.state().present.sign));

  /* 9. hostile and valid JSON in the paste box */
  await ev(() => { CityApp.reset(); });
  const sig0 = await ev(() => CityApp.sceneSignature() + '|' + JSON.stringify(CityApp.recipe()).length);
  const hostile = [
    '{"__proto__":{"x":1},"schema":"rtk.building"}',
    '{"schema":"rtk.building","version":1,"id":"x","name":"<script>alert(1)</script>","footprint":{"w":1,"d":1},"parts":[],"systems":{}}',
    '{not json', '[1,2,3]'];
  for (const h of hostile) {
    await page.fill('#rcText', h); await page.click('#rcLoad');
    const sig = await ev(() => CityApp.sceneSignature() + '|' + JSON.stringify(CityApp.recipe()).length);
    ok('hostile text ' + JSON.stringify(h.slice(0, 34)) + ' shows an error and the scene is unchanged', /refused/.test(await page.textContent('#rcMsg')) && /\$/.test(await page.textContent('#rcMsg')) && sig === sig0, await page.textContent('#rcMsg'));
  }
  const hostileBig = JSON.stringify(await ev(() => { const r = JSON.parse(JSON.stringify(CityApp.recipe())); r.parts[3].pos[0] = 1e308; return r; }));
  await page.fill('#rcText', hostileBig); await page.click('#rcLoad');
  ok('a recipe with a huge number is refused with its JSON path in the message', /parts\[3\]\.pos\[0\]/.test(await page.textContent('#rcMsg')), await page.textContent('#rcMsg'));
  ok('refusing a recipe keeps the sim running state (the old building is still the live one)', await ev(() => CityApp.recipe().id === 'bakery' && CityApp.errors.length > 0));
  await page.click('#rcCopy'); const copied = await page.inputValue('#rcText');
  ok('Copy recipe puts valid JSON in the box, and it loads back as the same building', await (async () => { await page.click('#rcLoad'); return /Loaded/.test(await page.textContent('#rcMsg')) && JSON.parse(copied).id === 'bakery'; })());
  await page.fill('#rcText', await ev(async () => (await (await fetch('recipes/shed.json')).text())));
  await page.click('#rcLoad');
  ok('pasting the shed recipe loads it: new title, 22 parts, no workers, no production, panel still fully populated', await ev(() => CityApp.recipe().id === 'shed' && CityApp.recipe().parts.length === 22 && document.getElementById('ttl').textContent.indexOf('Shed') >= 0 && /No workers/.test(document.getElementById('f-workers').textContent) && !/NaN/.test(document.getElementById('f-stock').textContent)));
  for (const ex of ['cart_stall', 'house', 'bakery']) { await page.selectOption('#exSel', ex); await page.click('#exGo'); await page.waitForTimeout(300); await ev(() => CityApp.advance(20)); ok('example ' + ex + ' loads and runs with no errors', await ev((x) => CityApp.recipe().id === x, ex) && page.errs.length === 0, page.errs.join('|')); }

  /* 10. speed buttons */
  await ev(() => { CityApp.reset(); });
  const t0 = await ev(() => CityApp.state().t); await page.click('#bT20'); await page.waitForTimeout(1500); const t1 = await ev(() => CityApp.state().t); await page.click('#bT1');
  ok('Time x20 runs the simulation much faster than real time (' + (t1 - t0).toFixed(1) + ' s of sim in 1.5 s)', t1 - t0 > 6, t1 - t0);
  await page.click('#bP'); const t2 = await ev(() => CityApp.state().t); await page.waitForTimeout(500); ok('Pause stops the clock', (await ev(() => CityApp.state().t)) === t2); await page.click('#bP');

  /* 11. layouts */
  for (const vp of [{ width: 834, height: 1194 }, { width: 1180, height: 820 }]) {
    const p2 = await L.newPage(browser, vp); await L.open(p2, base, '?auto=0');
    await p2.evaluate(() => { CityApp.advance(30); CityApp.setCamera(0.5, 0.6, 5); CityApp.render(); });
    const lay = await p2.evaluate(() => {
      const r = (id) => document.getElementById(id).getBoundingClientRect(), v = r('view'), pn = r('panel');
      const btns = [...document.querySelectorAll('.btn')].filter((b) => b.offsetParent !== null).map((b) => b.getBoundingClientRect());
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, view: [Math.round(v.width), Math.round(v.height)], panel: [Math.round(pn.width), Math.round(pn.height)], minBtn: Math.min(...btns.map((b) => b.height)), nb: btns.length, over: btns.filter((b) => b.right > innerWidth + 1).length };
    });
    ok(vp.width + 'x' + vp.height + ': no horizontal scroll, the 3D view and the panel both have room (' + JSON.stringify(lay) + ')', lay.sw <= lay.iw && lay.view[0] > 400 && lay.view[1] > 400 && lay.panel[0] > 300 && lay.panel[1] > 300 && lay.over === 0);
    ok(vp.width + 'x' + vp.height + ': every visible button is at least 44 px tall', lay.minBtn >= 44, lay.minBtn);
    ok(vp.width + 'x' + vp.height + ': the panel scrolls to the last section (Recipe)', await p2.evaluate(() => { const p = document.getElementById('panel'); p.scrollTop = p.scrollHeight; return p.scrollHeight > p.clientHeight && document.getElementById('rcLoad').getBoundingClientRect().bottom <= innerHeight + 2; }));
    ok(vp.width + 'x' + vp.height + ': no page errors', p2.errs.length === 0, p2.errs.join('|'));
    await p2.close();
  }
  ok('the whole run had no page errors', page.errs.length === 0, page.errs.join(' | '));
  console.log('\n' + (n - bad) + ' of ' + n + ' checks passed' + (bad ? ', ' + bad + ' FAILED' : ''));
  await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
