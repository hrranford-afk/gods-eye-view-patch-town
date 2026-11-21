/* C03 page test (headless Chromium with software GL, no iPad, no network): the neighbourhood page. Run from games/city-lab: NODE_PATH=$(npm root -g) node tests/district-page-test.js [--shots]
   Checks: loads with no errors; labels for every building; every control writes a plain explanation to the log; the in-page experiments give EXACTLY the numbers the headless
   functions give; the three experiment buttons; the A/B neighbourhood views; two screen layouts. With --shots it also writes shots/c03-1..8.png. */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.js');
const ROOT = path.resolve(__dirname, '..'), SHOTS = process.argv.includes('--shots');
const DI = require(path.join(ROOT, 'district.js'));
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
let n = 0, bad = 0; const ok = (name, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + name + (!c && x !== undefined ? '  -> ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 300) : '')); };
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: path.join(ROOT, 'shots', name) }); };
(async () => {
  const { srv, base } = await L.serve(), browser = await L.launch();
  const D = rd('districts/patch_row_hand.json'), files = {}; [...D.buildings.map((b) => b.recipe), D.home_template.recipe, 'shared/cloud/examples/bakery.stone_deck_oven.json', 'shared/cloud/examples/bakery.cool_store_room.json'].forEach((q) => { files[q] = rd(q); });
  const strip = (o) => JSON.stringify(o, (k, v) => (k === 'world' ? undefined : v));
  const page = await L.newPage(browser, { width: 1180, height: 820 });
  await page.goto(base + '/city-lab/district.html'); await page.waitForFunction('window.__ddone', null, { timeout: 90000 }); await page.waitForTimeout(1500);
  const ev = (f, a) => page.evaluate(f, a);
  const S = () => ev(() => { const W = CityDistrictApp.state(); return { t: W.S.t, res: W.S.env.residents, factor: W.S.env.power.factor, n: W.S.b.length, logN: W.S.logN, bak: (() => { const b = W.S.b.find((x) => x.kind === 'shop'); return { id: b.id, demand: W.S.env.b[b.id].demand, deliveries: W.S.env.b[b.id].deliveries, sidecars: b.sidecars.length }; })() }; });
  const logTexts = () => ev(() => Array.from(document.querySelectorAll('#whylog .why')).map((e) => e.textContent));
  await page.waitForFunction('CityDistrictApp.state().S.t > 0', null, { timeout: 30000 });
  ok('the page loads with no errors and the district is running', (await ev(() => CityDistrictApp.errors.length)) === 0 && page.errs.length === 0 && (await S()).t > 0, page.errs);
  ok('every building has a label (8 buildings)', (await ev(() => document.querySelectorAll('#labels .lb').length)) === 8);
  ok('every label shows its numbers (demand, workers, grid, residents)', await ev(() => { const t = Array.from(document.querySelectorAll('#labels .lb')).map((e) => e.textContent).join('|'); return /demand [\d.]+\/min from 4 homes/.test(t) && /workers \d\/\d/.test(t) && /grid [\d.]+ of [\d.]+ kW/.test(t) && /4 residents/.test(t); }));
  ok('the log starts with the district opening', (await logTexts())[0].indexOf('District opens') >= 0);
  await shot(page, 'c03-1.png');
  /* add a home */
  const s0 = await S(); await page.click('#aAdd'); await page.waitForTimeout(400); const s1 = await S(), lg1 = await logTexts();
  ok('Add home: residents 16 to 20, one more building, demand rises, and the log explains it with numbers', s1.res === 20 && s1.n === s0.n + 1 && s1.bak.demand > s0.bak.demand && /Home added/.test(lg1[0]) && /demand [\d.]+ to [\d.]+/.test(lg1[0]), [s0, s1, lg1[0]]);
  ok('the new building is on the table (9 labels)', (await ev(() => document.querySelectorAll('#labels .lb').length)) === 9);
  await shot(page, 'c03-2.png');
  await page.click('#aDel'); await page.waitForTimeout(300); const s2 = await S();
  ok('Remove home: back to 16 residents and the log says residents leave', s2.res === 16 && /residents leave/.test((await logTexts())[0]), [s2]);
  /* block a road */
  await page.selectOption('#roadSel', '5,2'); await page.click('#aRoad'); await page.waitForTimeout(400); const s3 = await S(), lg3 = await logTexts();
  ok('Block road 5,2: the bakery loses its delivery road and customers, and the log says why', s3.bak.deliveries === false && s3.bak.demand < s0.bak.demand * 0.6 && /blocked/.test(lg3[0]) && /suspended/.test(lg3[0]), [s3.bak, lg3[0]]);
  ok('the bakery label shows NO DELIVERIES in red', await ev(() => Array.from(document.querySelectorAll('#labels .lb.bad')).some((e) => /NO DELIVERIES/.test(e.textContent))));
  await shot(page, 'c03-3.png');
  await page.click('#aRoad'); await page.waitForTimeout(300); const s4 = await S();
  ok('Open the road again: deliveries and demand return', s4.bak.deliveries === true && Math.abs(s4.bak.demand - s0.bak.demand) < 0.01);
  /* brownout */
  await page.click('[data-sup="0.6"]'); await page.waitForTimeout(400); const s5 = await S(), lg5 = await logTexts();
  ok('Grid at 60%: brownout, the power pill says so, and the log explains it', s5.factor < 0.8 && /brownout/i.test(await ev(() => document.getElementById('d-pill').textContent)) && /BROWNOUT|brownout/.test(lg5[0]), [s5.factor, lg5[0]]);
  await shot(page, 'c03-4.png');
  await page.click('[data-sup="1"]'); await page.waitForTimeout(300);
  /* upgrade */
  await page.click('#aUp'); await page.waitForTimeout(500); const s6 = await S(), lg6 = await logTexts();
  ok('Apply the stone deck oven: accepted once, costs 40 coins, the log says what changed', s6.bak.sidecars === 1 && /Upgrade Stone deck oven/.test(lg6[0]) && /40 coins/.test(lg6[0]), lg6[0]);
  const lenBefore = (await logTexts()).length; await page.click('#aUp'); await page.waitForTimeout(300);
  ok('Applying the same upgrade again is refused (no duplicate)', (await S()).bak.sidecars === 1 && (await ev(() => document.getElementById('toast').textContent)).match(/already applied/i));
  /* inspect */
  await ev(() => CityDistrictApp.select('bakery')); await page.waitForTimeout(300);
  ok('Inspecting the bakery shows demand, made/sold, income and net per minute, and workers', await ev(() => { const t = document.getElementById('selCard').textContent; return /Demand from residents/.test(t) && /Made \/ sold/.test(t) && /Net per minute/.test(t) && /Workers/.test(t) && /Upgrades/.test(t); }));
  await shot(page, 'c03-5.png');
  /* reset */
  await page.click('#aReset'); await page.waitForTimeout(400); const s7 = await S();
  ok('Reset puts the neighbourhood back (16 residents, no upgrade, deliveries open)', s7.res === 16 && s7.bak.sidecars === 0 && s7.bak.deliveries === true && (await logTexts()).length === 1);
  /* experiments: exact figures */
  await page.click('#x1'); await page.waitForFunction("CityDistrictApp.expResults[1]", null, { timeout: 60000 });
  const p1 = await ev(() => JSON.stringify(CityDistrictApp.expResults[1])); ok('Experiment 1 in the page equals the headless figures exactly', p1 === strip(DI.exp1(D, files)));
  ok('Experiment 1 shows a table and plain-language findings', await ev(() => document.querySelectorAll('#expOut table.res tr').length >= 6 && document.querySelectorAll('#expOut ul.expl li').length >= 5));
  await ev(() => document.getElementById('expOut').scrollIntoView()); await page.waitForTimeout(300); await shot(page, 'c03-6.png');
  await page.click('#x2'); await page.waitForFunction("CityDistrictApp.expResults[2]", null, { timeout: 120000 });
  const p2 = await ev(() => JSON.stringify(CityDistrictApp.expResults[2])); ok('Experiment 2 in the page equals the headless figures exactly', p2 === strip(DI.exp2(D, files)));
  ok('Experiment 2 shows the upgrade table and the answer', await ev(() => /Pays back at/.test(document.getElementById('expOut').textContent) && document.querySelectorAll('#expOut ul.expl li').length >= 3));
  await page.click('#x3'); await page.waitForFunction("CityDistrictApp.expResults[3]", null, { timeout: 60000 });
  const p3 = await ev(() => JSON.stringify(CityDistrictApp.expResults[3])); ok('Experiment 3 in the page equals the headless figures exactly', p3 === strip(DI.exp3(D, files)));
  ok('Experiment 3 shows A, B and the two controls, the causes, and the explanation', await ev(() => { const t = document.getElementById('expOut').textContent; return /control_1/.test(t) && /control_2/.test(t) && /Change B to match A in/.test(t) && document.querySelectorAll('#expOut ul.expl li').length >= 4; }));
  const E3 = JSON.parse(p3);
  ok('the two controls are identical to A to the last digit; B differs', E3.runs.control_1.bakery_net_pm === E3.runs.A.bakery_net_pm && E3.runs.control_2.bakery_net_pm === E3.runs.A.bakery_net_pm && E3.runs.B.bakery_net_pm !== E3.runs.A.bakery_net_pm, [E3.runs.A.bakery_net_pm, E3.runs.B.bakery_net_pm]);
  await ev(() => document.getElementById('expOut').scrollIntoView()); await page.waitForTimeout(300); await shot(page, 'c03-7.png');
  /* A and B in 3D */
  await page.click('#vB'); await page.waitForTimeout(2500); const tB = await ev(() => document.getElementById('ttl').textContent);
  ok('View neighbourhood B: the table now shows condition B (2 homes), time is running, and the road-blocked event shows in the log', /experiment B/.test(tB) && (await S()).res === 8 && (await logTexts()).some((t) => /blocked/.test(t)), [tB, await logTexts()]);
  await shot(page, 'c03-8.png');
  await page.click('#vA'); await page.waitForTimeout(1500);
  ok('View neighbourhood A: 4 homes', (await S()).res === 16);
  await page.click('#vBase'); await page.waitForTimeout(800);
  ok('Back to Patch Row: 16 residents', (await S()).res === 16 && /Patch Row/.test(await ev(() => document.getElementById('ttl').textContent)));
  /* layouts */
  for (const vp of [{ width: 834, height: 1194 }, { width: 1180, height: 820 }]) {
    await page.setViewportSize(vp); await page.waitForTimeout(700);
    const m = await ev(() => { const c = document.getElementById('view'), r = c.getBoundingClientRect(), pn = document.getElementById('panel').getBoundingClientRect(); return { cw: r.width, ch: r.height, pw: pn.width, ph: pn.height, sw: document.documentElement.scrollWidth, iw: innerWidth }; });
    ok('layout ' + vp.width + 'x' + vp.height + ': canvas and panel both visible, no sideways scroll', m.cw > 300 && m.ch > 300 && m.pw > 300 && m.ph > 150 && m.sw <= m.iw + 1, m);
  }
  ok('the page drew a non-empty scene', await ev(() => { const c = document.createElement('canvas'); const v = document.getElementById('view'); c.width = 64; c.height = 64; const g = c.getContext('2d'); g.drawImage(v, 0, 0, 64, 64); const d = g.getImageData(0, 0, 64, 64).data; const seen = {}; for (let i = 0; i < d.length; i += 16) seen[d[i] + ',' + d[i + 1]] = 1; return Object.keys(seen).length > 12; }));
  ok('no page errors during the whole run', (await ev(() => CityDistrictApp.errors.length)) === 0 && page.errs.length === 0, page.errs);
  console.log('\nframe time (software GL, relative only): ' + Math.round(await ev(() => CityDistrictApp.frameMs || 0)) + ' ms per frame');
  await browser.close(); srv.close();
  console.log('\n' + (bad ? bad + ' FAILED of ' + n : n + ' of ' + n + ' checks passed')); process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('FAIL test crashed: ' + e.message); process.exit(1); });
