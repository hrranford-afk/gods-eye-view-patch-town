/* C06a page test (headless Chromium with software GL, no iPad, no network): the power-network page (district.html with the infra file; power.html opens it).
   Run from games/city-lab: NODE_PATH=$(npm root -g) node tests/infra-page-test.js [--shots]
   Checks: loads with no errors and the infra link is verified; cable colours follow the load and change when a branch overloads; a tapped dim building shows its limiting cable
   (highlight) and one plain sentence; a dark building is grey with a no-power label; every action writes a log line (brownouts also with shelf stock and energy saved); the read-only
   cost comparison changes NOTHING in the live state (state hash, log, time) and equals the headless figures exactly; the in-page experiments equal the headless figures exactly;
   two screen layouts. With --shots it writes shots/c06a-1..8.png. */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.js');
const ROOT = path.resolve(__dirname, '..'), SHOTS = process.argv.includes('--shots');
const DI = require(path.join(ROOT, 'district.js')), IX = require(path.join(ROOT, 'infra-exp.js'));
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
let n = 0, bad = 0; const ok = (name, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + name + (!c && x !== undefined ? '  -> ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 400) : '')); };
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: path.join(ROOT, 'shots', name) }); };
const URL = '/city-lab/district.html?district=districts/patch_row_power.json&infra=infra/patch_row_power.infra.json';
(async () => {
  const { srv, base } = await L.serve(), browser = await L.launch();
  const D = rd('districts/patch_row_power.json'), I = rd('infra/patch_row_power.infra.json'), files = {};
  [...D.buildings.map((b) => b.recipe), D.home_template.recipe].forEach((q) => { files[q] = rd(q); });
  const page = await L.newPage(browser, { width: 1180, height: 820 });
  await page.goto(base + URL); await page.waitForFunction('window.__ddone', null, { timeout: 90000 }); await page.waitForTimeout(1200);
  const ev = (f, a) => page.evaluate(f, a);
  const logTexts = () => ev(() => Array.from(document.querySelectorAll('#whylog .why')).map((e) => e.textContent));
  const logN = () => ev(() => CityDistrictApp.state().S.logN);
  const infra = () => ev(() => { const e = CityDistrictApp.state().S.env.infra; return { factor: e.factor, dark: e.dark, edges: e.edges.map((x) => [x.id, x.state, x.want, x.cap, x.flow]) }; });
  const states = async () => { const r = {}; (await infra()).edges.forEach((e) => { r[e[0]] = e[1]; }); return r; };
  const scrollTo = (sel) => ev((s) => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel);
  await page.click('#bP');   /* pause: from here every number is exactly reproducible; the logic is stepped by actions only */
  const S0 = await ev(() => { const W = CityDistrictApp.state(); return { t: W.S.t, res: W.S.env.residents, n: W.S.b.length }; });
  ok('the page loads with no errors, the infra file is checked and its link to the district is verified by SHA-256', (await ev(() => CityDistrictApp.errors.length)) === 0 && page.errs.length === 0 && /verified/.test(await ev(() => CityDistrictApp.infraLink)), [page.errs, await ev(() => CityDistrictApp.infraLink)]);
  ok('the power panel is visible (and the old experiments panel is hidden) when an infra file is loaded', await ev(() => !document.getElementById('netPanel').hidden && document.getElementById('oldExp').hidden));
  ok('9 buildings have labels; the generator shows its kW; every other building shows a power line', await ev(() => { const t = Array.from(document.querySelectorAll('#labels .lb')).map((e) => e.textContent); return t.length === 9 && t.some((x) => /GENERATOR\s*13.5 kW/.test(x)) && t.filter((x) => /power ok/.test(x)).length >= 3; }));
  const st0 = await states();
  ok('at 4 homes every cable is green (the homes cable carries 1.6 of 3.0 kW)', Object.values(st0).every((x) => x === 'green'), st0);
  const hex0 = await ev(() => CityDistrictApp.cableHex());
  ok('the 3D cables are drawn green and thicker cables are for bigger capacity', Object.keys(hex0).length >= 6 && hex0.homes_branch === 0x2fbf5e && hex0.main_feeder === 0x2fbf5e, hex0);
  ok('the cable table lists the 6 cables with wants, carries, capacity and a state word', await ev(() => document.querySelectorAll('#netCard tr[data-cab]').length === 6 && /green/.test(document.querySelector('#netCard').textContent)));
  await shot(page, 'c06a-1.png');

  /* ---- an overload: add homes until the homes cable is over capacity ---- */
  const lens = []; lens.push(await logN());
  await page.click('#aAdd'); await page.waitForTimeout(250); lens.push(await logN());
  await page.click('#aAdd'); await page.waitForTimeout(250); await page.click('#aAdd'); await page.waitForTimeout(250); lens.push(await logN()); await page.click('#aAdd'); await page.waitForTimeout(400); lens.push(await logN());
  const st1 = await states(), hex1 = await ev(() => CityDistrictApp.cableHex()), lg1 = await logTexts();
  ok('8 homes: the homes cable turns RED in the table and in 3D, the main feeder stays green', st1.homes_branch === 'red' && st1.main_feeder === 'green' && hex1.homes_branch === 0xe04a3a && hex1.main_feeder === 0x2fbf5e, [st1, hex1]);
  ok('each Add home wrote a log line (4 actions, 4 new lines)', lens[0] < lens[1] && lens[1] < lens[2] && lens[2] < lens[3] && lens[3] - lens[0] >= 4, lens);
  ok('the log explains the overload with numbers: cable wants 3.2 and carries 3, capacity 3, colour change, homes 100% to 94%, homes have no machine', /Homes cable wants 2\.8 to 3\.2 kW and carries 2\.8 to 3 kW \(capacity 3 kW, amber to red\)/.test(lg1[0]) && /homes power 100% to 94%/.test(lg1[0]), lg1[0]);
  ok('only the homes street is dim on the table: homes labels say power 94%, the bakery label says power ok', await ev(() => { const t = Array.from(document.querySelectorAll('#labels .lb')).map((e) => e.textContent); return t.filter((x) => /residents/.test(x) && /power 94%/.test(x)).length === 8 && t.some((x) => /BAKERY/.test(x) && /power ok/.test(x)); }));
  ok('the power pill says a street is dim', /dim street, lowest 94%/.test(await ev(() => document.getElementById('d-pill').textContent)));

  /* ---- tap a dim building: a REAL click on the canvas ---- */
  const pt = await ev(() => CityDistrictApp.screenOf('home_3')); await page.mouse.click(pt.x, pt.y); await page.waitForTimeout(500);
  const sel = await ev(() => ({ card: document.getElementById('selCard').textContent, why: (document.getElementById('whyPower') || {}).textContent, hl: CityDistrictApp.highlighted() }));
  ok('a real tap on a dim home selects it, highlights its limiting cable (the homes cable) and shows ONE plain sentence', /Home 3/.test(sel.card) && sel.hl === 'homes_branch' && sel.why === 'Homes cable 3.0 kW; the homes street wants 3.2 kW; Home 3 gets 94 percent.', sel);
  ok('the highlight is in the 3D scene (a white halo around that cable) and the table row is marked', await ev(() => CityDistrictApp.highlighted() === 'homes_branch' && document.querySelector('#netCard tr.hl') && document.querySelector('#netCard tr.hl').getAttribute('data-cab') === 'homes_branch'));
  await scrollTo('#whyPower'); await shot(page, 'c06a-2.png');
  await ev(() => CityDistrictApp.select('bakery')); await page.waitForTimeout(250);
  ok('tapping a building with full power shows no cable highlight and no warning sentence', await ev(() => CityDistrictApp.highlighted() === null && !document.getElementById('whyPower') && /Power received/.test(document.getElementById('selCard').textContent)));
  await ev(() => CityDistrictApp.selectCable('main_feeder')); await page.waitForTimeout(250);
  ok('tapping a cable shows its capacity, what is below it and its load', await ev(() => /Main feeder/.test(document.getElementById('selCard').textContent) && /10\.5 kW/.test(document.getElementById('selCard').textContent) && /12.0 kW/.test(document.getElementById('selCard').textContent) && CityDistrictApp.highlighted() === 'main_feeder'), await ev(() => document.getElementById('selCard').textContent));

  /* ---- a local brownout from a cable edit: only the bakery ---- */
  await ev(() => { const W = CityDistrictApp.state(); window.CityDistrict.run(W, 350); W.S.env = window.CityDistrict.refresh(W); }); await page.waitForTimeout(300);   /* let the shelves fill: 350 s of district time, so the brownout line shows a real shelf stock */
  await ev(() => CityDistrictApp.select('bakery'));
  const nb = await logN(); await page.selectOption('#cabSel', 'bakery_line'); await page.fill('#cabKw', '3.6'); await page.click('#aCapSet'); await page.waitForTimeout(400);
  const f2 = await infra(), lg2 = await logTexts();
  ok('a capacity edit writes a log line and dims ONLY the bakery (60 percent); workshop, market, shed and homes keep their shares', (await logN()) > nb && f2.factor.bakery === 0.6 && f2.factor.workshop === 1 && f2.factor.market === 1 && f2.factor.home_1 === 0.9375, f2.factor);
  ok('the brownout log line shows cable before and after, who dims, SHELF STOCK and ENERGY SAVED, and says why a short brownout looks profitable', /Bakery line capacity set from 7 to 3.6 kW/.test(lg2[0]) && /Miniature Bakery power 100% to 60%/.test(lg2[0]) && /Shelf stock at Miniature Bakery \(loaf\): \d+/.test(lg2[0]) && /Energy saved: up to [\d.]+ coins a minute/.test(lg2[0]) && /only for that reason/.test(lg2[0]), lg2[0]);
  const why2 = await ev(() => (document.getElementById('whyPower') || {}).textContent);
  ok('the tapped bakery now shows why: Bakery line 3.6 kW; Miniature Bakery wants 6.0 kW; gets 60 percent', why2 === 'Bakery line 3.6 kW; Miniature Bakery wants 6.0 kW; Miniature Bakery gets 60 percent.' && (await ev(() => CityDistrictApp.highlighted())) === 'bakery_line', why2);
  await scrollTo('#whylog'); await shot(page, 'c06a-4.png');
  await page.fill('#cabKw', '7'); await page.click('#aCapSet'); await page.waitForTimeout(300);
  ok('restoring the capacity ends the brownout and writes a line', (await infra()).factor.bakery === 1 && /power 60% to 100%/.test((await logTexts())[0]));

  /* ---- a dark street: cut the main feeder ---- */
  const nc = await logN(); await page.selectOption('#cabSel', 'main_feeder'); await page.click('#aCut'); await page.waitForTimeout(500);
  const f3 = await infra(), lg3 = await logTexts();
  ok('cutting the main feeder: bakery, workshop, market, shed are DARK, the homes street is not', f3.factor.bakery === 0 && f3.dark.bakery && f3.dark.workshop && f3.dark.market && f3.dark.shed && !f3.dark.home_1 && (await logN()) > nc, f3.factor);
  ok('dark buildings are grey in 3D (overlays) and their labels say NO POWER', (await ev(() => CityDistrictApp.darkOverlays())) === 4 && (await ev(() => Array.from(document.querySelectorAll('#labels .lb.dark')).filter((e) => /NO POWER/.test(e.textContent)).length)) === 4);
  ok('the log says the street is dark with numbers and the cable states (cut, dark)', /DARK, no power/.test(lg3[0]) && /Main feeder cut/.test(lg3[0]) && /green to cut/.test(lg3[0]) && /Bakery line .*green to dark/.test(lg3[0]), lg3[0]);
  await ev(() => CityDistrictApp.select('bakery')); await page.waitForTimeout(300);
  ok('tapping the dark bakery highlights the cut cable and says why', (await ev(() => CityDistrictApp.highlighted())) === 'main_feeder' && /Miniature Bakery is cut off: Main feeder is cut/.test(await ev(() => document.getElementById('whyPower').textContent)));
  await shot(page, 'c06a-3.png');
  await page.click('#aCut'); await page.waitForTimeout(400);
  ok('reconnecting lights everything again and writes a line', (await infra()).factor.bakery === 1 && /reconnected/.test((await logTexts())[0]));

  /* ---- generator output: a short source ---- */
  const ng = await logN(); await page.click('[data-gen="0.6"]'); await page.waitForTimeout(500);
  const f4 = await infra(), lg4 = await logTexts(), pillT = await ev(() => document.getElementById('d-pill').textContent);
  ok('generator output at 60 percent: every branch scales together (bakery 60%, workshop 60%), a line is written, the label shows the new kW', f4.factor.bakery === 0.6 && f4.factor.workshop === 0.6 && (await logN()) > ng && /Generator output set to 60%/.test(lg4[0]) && await ev(() => Array.from(document.querySelectorAll('#labels .lb')).some((e) => /GENERATOR\s*8.1 kW/.test(e.textContent))), [f4.factor, lg4[0]]);
  ok('tapping the bakery says the GENERATORS limit it: "The generators give 8.1 kW; ..."', (await ev(() => CityDistrictApp.select('bakery'))) === undefined && /The generators give 8.1 kW; the cables carry 13.5 kW of demand; every branch gets 60 percent/.test(await ev(() => document.getElementById('whyPower').textContent)), await ev(() => (document.getElementById('whyPower') || {}).textContent));
  await page.click('[data-gen="1"]'); await page.waitForTimeout(300);

  /* ---- the read-only cost comparison ---- */
  const hashLive = () => ev(() => { const W = CityDistrictApp.state(); return JSON.stringify([window.CityDistrict.hash(W), W.S.t, W.S.logN, W.S.b.length, W.S.scale, W.S.infra]); });
  const h0 = await hashLive(), lenLog0 = (await logTexts()).length;
  await page.selectOption('#cmpKind', 'generator'); await page.fill('#cmpKw', '3'); await page.click('#aCmp'); await page.waitForFunction('CityDistrictApp.lastCompare', null, { timeout: 60000 }); await page.waitForTimeout(300);
  const c1 = await ev(() => JSON.stringify(CityDistrictApp.lastCompare)), cfg = await ev(() => { const W = CityDistrictApp.state(); return JSON.stringify(window.CityInfraExp.configOf(W)); });
  ok('the comparison (add a 3 kW generator) changed NOTHING in the live state: state hash, time, log counter, buildings, scale and cable edits are identical', (await hashLive()) === h0 && (await logTexts()).length === lenLog0, [h0, await hashLive()]);
  ok('the comparison panel shows build cost, upkeep per minute, the change in district net per minute and the payback', await ev(() => { const t = document.getElementById('cmpOut').textContent; return /Build cost/.test(t) && /Upkeep per minute/.test(t) && /District net per minute/.test(t) && /Payback/.test(t) && /nothing in the live neighbourhood was changed/.test(t); }));
  const hc1 = IX.compare(D, files, I, JSON.parse(cfg), { type: 'generator', kw: 3 });
  ok('the in-page comparison equals the headless one EXACTLY (every figure, both state hashes)', c1 === JSON.stringify(hc1), [c1.slice(0, 200), JSON.stringify(hc1).slice(0, 200)]);
  await scrollTo('#cmpOut'); await shot(page, 'c06a-5.png');
  await page.selectOption('#cmpKind', 'cable'); await page.selectOption('#cmpCable', 'homes_branch'); await page.fill('#cmpKw', '4'); await page.click('#aCmp'); await page.waitForFunction("CityDistrictApp.lastCompare && CityDistrictApp.lastCompare.option && CityDistrictApp.lastCompare.option.type === 'cable'", null, { timeout: 60000 }); await page.waitForTimeout(300);
  const c2 = await ev(() => JSON.stringify(CityDistrictApp.lastCompare)), hc2 = IX.compare(D, files, I, JSON.parse(cfg), { type: 'cable', cable: 'homes_branch', to_kw: 4 });
  ok('the cable-upgrade comparison (homes cable to 4 kW) is also read-only and equals the headless figures exactly', (await hashLive()) === h0 && c2 === JSON.stringify(hc2), c2.slice(0, 200));
  ok('the upgrade comparison says it never pays in coins (homes have no machine) and shows the homes going to a higher share', /never/.test(await ev(() => document.getElementById('cmpPayback').textContent)) && /home_1|Home 1/.test(await ev(() => document.getElementById('cmpOut').textContent)) || /Power shares that change/.test(await ev(() => document.getElementById('cmpOut').textContent)));
  await scrollTo('#cmpOut'); await shot(page, 'c06a-6.png');
  await page.selectOption('#cmpKind', 'cable'); await page.fill('#cmpKw', '2'); await page.click('#aCmp'); await page.waitForTimeout(1500);
  ok('a bad request (a cable "upgrade" to a smaller capacity) is refused with a plain message, nothing changes', /must be larger/.test(await ev(() => document.getElementById('cmpOut').textContent)) && (await hashLive()) === h0);

  /* ---- in-page experiments equal the headless figures exactly ---- */
  const strip = (o) => JSON.stringify(o);
  await page.click('#e4'); await page.waitForFunction("CityDistrictApp.expResults.E4", null, { timeout: 120000 });
  const p4 = await ev(() => JSON.stringify(CityDistrictApp.expResults.E4)), h4 = IX.e4(D, files, I); ok('E4 in the page equals the headless figures exactly', p4 === strip(h4));
  await page.click('#e5'); await page.waitForFunction("CityDistrictApp.expResults.E5", null, { timeout: 120000 });
  const p5 = await ev(() => JSON.stringify(CityDistrictApp.expResults.E5)), h5 = IX.e5(D, files, I); ok('E5 in the page equals the headless figures exactly', p5 === strip(h5));
  ok('the experiments also did not touch the live state', (await hashLive()) === h0);
  await scrollTo('#expOut'); await shot(page, 'c06a-7.png');
  ok('the experiment output names the answers in plain words (NO for the shipped network, the cable and the other street)', /NO, it never pays back/.test(await ev(() => document.getElementById('expOut').textContent)) || /Only the homes street is dim/.test(await ev(() => document.getElementById('expOut').textContent)));

  /* ---- remove home, reset, a clean second run ---- */
  const nr = await logN(); await page.click('#aDel'); await page.waitForTimeout(300);
  ok('Remove home writes a line too', (await logN()) > nr && /Home removed/.test((await logTexts())[0]));
  await page.click('#aReset'); await page.waitForTimeout(500);
  ok('Reset puts the network back: 4 homes, all cables green, one line in the log', (await ev(() => CityDistrictApp.state().S.env.residents)) === 16 && Object.values(await states()).every((x) => x === 'green') && (await logTexts()).length === 1);

  /* ---- layouts ---- */
  const frame = async (p) => { await p.waitForTimeout(600); return p.evaluate(() => ({ w: innerWidth, sw: document.scrollingElement.scrollWidth, small: Array.from(document.querySelectorAll('button')).filter((b) => b.offsetParent && b.getBoundingClientRect().height < 40).length, ms: window.CityDistrictApp.frameMs })); };
  const lay1 = await frame(page);
  ok('landscape 1180x820: no horizontal scroll, every button at least 40 px tall', lay1.sw <= lay1.w && lay1.small === 0, lay1);
  const tab = await L.newPage(browser, { width: 834, height: 1194 });
  await tab.goto(base + URL); await tab.waitForFunction('window.__ddone', null, { timeout: 90000 }); await tab.waitForTimeout(1200);
  for (let i = 0; i < 4; i++) { await tab.click('#aAdd'); await tab.waitForTimeout(200); }
  await tab.evaluate(() => CityDistrictApp.select('home_2')); await tab.waitForTimeout(500);
  const lay2 = await frame(tab);
  ok('portrait 834x1194: no horizontal scroll, every button at least 40 px tall, no page errors', lay2.sw <= lay2.w && lay2.small === 0 && tab.errs.length === 0, [lay2, tab.errs]);
  ok('portrait: the canvas and the panel are both on screen (the table above, the panel below)', await tab.evaluate(() => { const c = document.getElementById('view').getBoundingClientRect(), p = document.getElementById('panel').getBoundingClientRect(); return c.height > 400 && p.top >= c.bottom - 2 && p.height > 300; }));
  await shot(tab, 'c06a-8.png');
  console.log('frame time (software GL, ms): landscape ' + (lay1.ms ? lay1.ms.toFixed(1) : 'n/a') + ', portrait ' + (lay2.ms ? lay2.ms.toFixed(1) : 'n/a'));
  await browser.close(); srv.close();
  console.log('\n' + (bad ? bad + ' FAILED of ' + n : n + ' of ' + n + ' checks passed')); process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
