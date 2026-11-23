/* MACRO WIRE TEST for islands_look.html?macro=1 (headless chromium, software GL). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/macro-wire-test.js
   Checks (see MACRO_WIRE.md): the default page is untouched (hash 8d962c0c, 88,790 triangles, no __li.macro) and ?macro=1 leaves the world hash and triangle count alone;
   0 console errors on ?macro=1 with sea=2, flow=1, seabed=1, weather=auto, boats=2, q=low, post=0 and the full stack; the full stack stays under 150k triangles;
   determinism by seed and game hour, read from a FROZEN clock (?mt= and ?seat=) so it does not depend on wall time (hashStatic style): same seed and hour give the same state and the same sea heights in two page loads,
   another seed or hour gives another answer, and going away and back to an hour restores it; the tide follows the macro tide until the slider is touched;
   per-component phase accumulators advance with real time only (the same increment at game speed 1 and 60, while the game hour advances 60 times faster);
   the shader whitecap fraction is the Monahan value; the flow drift nudge changes the flow field by exactly the nudge in open water; the weather schedule reads the macro (storm when a vortex passes, not otherwise);
   boat heave and tilt are capped (0.25 m, 0.12 rad), non-zero in a storm and smaller on a calm day, and the page without ?macro=1 does not move the boats vertically any differently. */
import { launch, ROOT } from './shoot.js';
let fails = 0, passes = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (c) passes++; else fails++; };
const GOLD = '8d962c0c', GOLD_TRIS = 88790;
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
const { browser, ctx } = await launch();
async function openLong(qs, w = 480, h = 320) {
  const page = await ctx.newPage(); await page.setViewportSize({ width: w, height: h }); const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + ROOT + '/islands_look.html' + (qs || ''));
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  return { page, errs: errs.filter(e => !noise(e)) };
}
const info = async qs => { const { page, errs } = await openLong(qs); const st = await page.evaluate(() => ({ ...__li.stats(), hash: __li.hashStatic(), macro: !!__li.macro })); return { page, st, errs }; };

/* 1. the default page, and the page with the switch but no other pass */
const d = await info('?ui=0&q=high&seed=1122');
ok(d.st.hash === GOLD && d.st.tris === GOLD_TRIS && !d.st.macro, 'default page: hash ' + d.st.hash + ', ' + d.st.tris + ' tris, no __li.macro');
ok(d.errs.length === 0, 'default page 0 console errors');
const defTide = await d.page.evaluate(() => document.getElementById('tideLbl').textContent);
ok(defTide === '+0.00 m', 'default page: tide slider default stays +0.00 m (' + defTide + ')');
await d.page.close();
const m0 = await info('?ui=0&q=high&seed=1122&macro=1');
ok(m0.st.hash === GOLD && m0.st.tris === GOLD_TRIS && m0.st.macro, '?macro=1: world hash ' + m0.st.hash + ' and ' + m0.st.tris + ' tris unchanged, __li.macro present');
ok(m0.errs.length === 0, '?macro=1 0 console errors (' + m0.errs.slice(0, 2).join(' | ') + ')');
await m0.page.close();

/* 2. console errors across the stack */
const stacks = [['&sea=2', 'sea=2'], ['&flow=1', 'flow'], ['&seabed=1', 'seabed'], ['&weather=auto', 'weather'], ['&boats=2', 'boats=2'], ['&q=low&post=0', 'q=low post=0'],
  ['&sea=2&flow=1&seabed=1&weather=auto&boats=2', 'sea+flow+seabed+weather+boats'], ['&sea=2&flow=1&seabed=1&weather=auto&boats=2&post=0', 'full stack post=0']];
for (const [q, name] of stacks) {
  const lowq = q.includes('q=low') ? '' : '&q=high';
  const r = await info('?ui=0&seed=135&macro=1&mh=30' + lowq + q);
  ok(r.errs.length === 0 && r.st.macro, '?macro=1 ' + name + ': 0 console errors, ' + r.st.tris + ' tris' + (r.errs.length ? ' ' + r.errs[0] : ''));
  await r.page.close();
}
const full = await info('?ui=0&q=high&seed=1122&pass=landing&sea=2&flow=1&seabed=1&weather=auto&boats=2&macro=1');
ok(full.errs.length === 0 && full.st.tris < 150000, 'full stack landing+flow+seabed+weather+boats=2+macro: 0 errors, ' + full.st.tris + ' tris (< 150,000)');
await full.page.close();
const fullLow = await info('?ui=0&q=low&seed=1122&sea=2&flow=1&seabed=1&weather=auto&boats=2&macro=1&post=0');
ok(fullLow.errs.length === 0, 'full stack q=low post=0: 0 errors, ' + fullLow.st.tris + ' tris');
await fullLow.page.close();

/* 3. determinism by seed and hour, frozen clock */
const frozen = (seed, h) => '?ui=0&q=low&post=0&macro=1&sea=2&seed=' + seed + '&mh=' + h + '&mt=0&seat=3';
const probe = () => page => page.evaluate(() => { const M = __li.macro, pts = []; for (let i = 0; i < 12; i++) pts.push(+M.seaH(-80 + i * 14.5, 60 - i * 9.7).toFixed(5));
  return JSON.stringify({ st: M.state(), tide: M.tide(), pts, nudge: M.nudge(), uC: M.uC().map(v => +v.toFixed(6)) }); });
const a1 = await openLong(frozen(1122, 30)); const A1 = await probe()(a1.page);
const a2 = await openLong(frozen(1122, 30)); const A2 = await probe()(a2.page);
ok(A1 === A2, 'same seed and hour, two page loads: identical macro state, tide, 12 sea heights, drift nudge, shader uniforms');
const back = await a1.page.evaluate(() => { const M = __li.macro; M.setHour(77.25); M.advance(0); const mid = JSON.stringify(M.state()); M.setHour(30); M.advance(0); return mid; });
const A1b = await probe()(a1.page);
ok(A1b === A1 && back !== JSON.parse(A1).st && back !== JSON.stringify(JSON.parse(A1).st), 'hour 30 -> 77.25 -> 30: the state and sea heights return exactly (no stored state)');
const a3 = await openLong(frozen(135, 30)); const A3 = await probe()(a3.page);
ok(A3 !== A1, 'another seed gives another macro state and sea');
const a4 = await openLong(frozen(1122, 31.5)); const A4 = await probe()(a4.page);
ok(A4 !== A1, 'another hour gives another macro state and sea');
for (const x of [a1, a2, a3, a4]) { ok(x.errs.length === 0, 'determinism page 0 console errors'); await x.page.close(); }
{ /* node side: the library is a pure function, clock independent */
  await import('../macro_sea.js'); const M = globalThis.MacroSea; const s1 = JSON.stringify(M.macro(1122, 30, { arrivals: false }).wind), s2 = JSON.stringify(M.macro(1122, 30, { arrivals: false }).wind);
  ok(s1 === s2, 'node: macro(1122, 30) twice gives the same wind');
}

/* 4. tide: macro until the slider is touched */
const t1 = await openLong('?ui=0&q=low&post=0&macro=1&seed=135&mh=30&mt=0&seat=3');
const tt = await t1.page.evaluate(async () => { await new Promise(r => setTimeout(r, 600)); const M = __li.macro; const lbl = () => document.getElementById('tideLbl').textContent; const a = { macro: M.tide(), lbl: lbl(), touched: M.tideTouched() };
  __li.setTide(0.37); await new Promise(r => setTimeout(r, 600)); return { ...a, after: lbl(), touchedAfter: M.tideTouched() }; });
ok(Math.abs(parseFloat(tt.lbl) - tt.macro) < 0.006 && !tt.touched, 'tide label follows the macro tide (' + tt.lbl + ' vs ' + tt.macro.toFixed(3) + ')');
ok(tt.after === '+0.37 m' && tt.touchedAfter, 'the slider still overrides (label ' + tt.after + ')');
ok(t1.errs.length === 0, 'tide page 0 console errors');
await t1.page.close();

/* 5. phase accumulators and game speed */
const p1 = await openLong('?ui=0&q=low&post=0&macro=1&sea=2&seed=135&mh=30');
const ph = await p1.page.evaluate(() => { const M = __li.macro; const run = sp => { M.setSpeed(sp); const h0 = M.hour(), p0 = M.phases(); for (let i = 0; i < 20; i++) M.advance(0.05); const w = M.wave().A, p1 = M.phases(); return { dh: M.hour() - h0, d: p1.map((v, i) => v - p0[i]), w: p1.map((v, i) => w[i * 4 + 3]) }; };
  const a = run(1), b = run(60), same = (() => { const p = M.phases(); M.setSpeed(1); M.setSpeed(500); M.setSpeed(3); return JSON.stringify(p) === JSON.stringify(M.phases()); })(); return { a, b, same }; });
const rel = (r) => Math.max(...r.d.map((v, i) => r.w[i] > 0.05 ? Math.abs(v / (r.w[i] * 1.0) - 1) : 0));
ok(ph.same, 'changing the speed alone never changes any phase');
ok(rel(ph.a) < 0.12 && rel(ph.b) < 0.12, 'phase advance over 1 s of real time is w dt at speed 1 and at speed 60 (worst relative error ' + rel(ph.a).toFixed(3) + ', ' + rel(ph.b).toFixed(3) + ')');
ok(Math.abs(ph.b.dh / ph.a.dh - 60) < 0.5, 'the game hour advances 60 times faster at speed 60 (' + (ph.b.dh / ph.a.dh).toFixed(2) + 'x)');
ok(p1.errs.length === 0, 'phase page 0 console errors');
await p1.page.close();

/* 6. shader inputs: whitecap fraction and swell amplitude from the macro */
const w1 = await openLong('?ui=0&q=low&post=0&macro=1&sea=2&seed=135&mh=30&mt=0&seat=3');
const wc = await w1.page.evaluate(() => ({ uC: __li.macro.uC(), st: __li.macro.state() })); await w1.page.close();
await import('../macro_sea.js'); const MS = globalThis.MacroSea;
ok(Math.abs(wc.uC[1] - MS.monahan(wc.st.wind.speed)) < 1e-6 && wc.uC[1] > 0.05, 'shader whitecap fraction = Monahan of the macro wind (' + wc.uC[1].toFixed(4) + ' at ' + wc.st.wind.speed.toFixed(1) + ' m/s)');
ok(wc.uC[2] > 3, 'sum of swell and wind sea amplitudes in a storm is large (' + wc.uC[2].toFixed(2) + ' m)');
const w2 = await openLong('?ui=0&q=low&post=0&macro=1&sea=2&seed=135&mh=6&mt=0&seat=3');
const wc2 = await w2.page.evaluate(() => __li.macro.uC()); await w2.page.close();
ok(wc2[1] < 0.003 && wc2[2] < 2.5 && wc2[2] < wc.uC[2] / 2, 'calm day: whitecaps ' + wc2[1].toFixed(4) + ', amplitude sum ' + wc2[2].toFixed(2) + ' m, under half of the storm');

/* 7. flow drift nudge */
const f1 = await openLong('?ui=0&q=low&post=0&macro=1&flow=1&seed=135&mh=30&mt=0&seat=3');
const f0 = await openLong('?ui=0&q=low&post=0&flow=1&seed=135');
const fa = await f1.page.evaluate(() => { const o = [], pts = [[-70, 70], [60, -75], [0, 80]]; for (const [x, z] of pts) { const u = __li.flow.at(x, z, 12.3); o.push(u); } return { o, n: __li.macro.nudge(), hAt: pts.map(([x, z]) => __li.flow.hAt(x, z)) }; });
const fb = await f0.page.evaluate(() => { const o = [], pts = [[-70, 70], [60, -75], [0, 80]]; for (const [x, z] of pts) o.push(__li.flow.at(x, z, 12.3)); return o; });
const dev = fa.o.map((u, i) => [u[0] - fb[i][0], u[1] - fb[i][1]]);
ok(fa.hAt.every(h => h < -2) ? dev.every(v => Math.hypot(v[0] - fa.n[0], v[1] - fa.n[1]) < 0.02) : dev.some(v => Math.hypot(v[0] - fa.n[0], v[1] - fa.n[1]) < 0.02), 'open-water flow differs by the macro nudge (' + fa.n.map(v => v.toFixed(3)).join(', ') + '; deviations ' + dev.map(v => v.map(x => x.toFixed(3)).join('/')).join(' ') + ')');
const calmN = await (async () => { await f1.page.evaluate(() => { __li.macro.setHour(6); __li.macro.advance(0); }); return f1.page.evaluate(() => __li.macro.nudge()); })();
ok(Math.hypot(fa.n[0], fa.n[1]) > Math.hypot(calmN[0], calmN[1]) * 1.5, 'storm nudge ' + Math.hypot(fa.n[0], fa.n[1]).toFixed(2) + ' m/s is stronger than the calm-day nudge ' + Math.hypot(calmN[0], calmN[1]).toFixed(2) + ' m/s');
ok(f1.errs.length === 0 && f0.errs.length === 0, 'flow pages 0 console errors');
await f1.page.close(); await f0.page.close();

/* 8. weather reads the macro storm */
const wx = async mh => { const r = await openLong('?ui=0&q=low&post=0&macro=1&weather=auto&seed=135&mh=' + mh + '&mt=0&wt=1&seat=3'); const o = await r.page.evaluate(async () => { await new Promise(x => setTimeout(x, 700)); return { w: __li.weather(), mw: __li.macro.weather(), st: __li.macro.state() }; }); const e = r.errs; await r.page.close(); return { ...o, e }; };
const wxS = await wx(30), wxC = await wx(6), wxM = await wx(26);
ok(wxS.w.state === 'storm' && wxS.st.storm.index > 0.7, 'weather state at a passing vortex (storm index ' + wxS.st.storm.index.toFixed(2) + '): ' + wxS.w.state + ', wind ' + wxS.w.windMs.toFixed(1) + ' m/s from the macro');
ok(wxC.w.state !== 'storm' && wxC.w.state !== 'rain' && wxC.st.storm.index === 0, 'weather state on the calm day (macro storm index 0): ' + wxC.w.state + ', wind ' + wxC.w.windMs.toFixed(1) + ' m/s');
ok(wxM.w.k > 0 && wxM.w.k < 1, 'storm approach (hour 26, a blend between the macro state and storm, index ' + wxM.st.storm.index.toFixed(2) + '): blend k ' + wxM.w.k.toFixed(2) + ', state ' + wxM.w.state);
ok(Math.abs(wxS.w.windMs - wxS.st.wind.speed) < 0.01, 'weather wind is the macro wind (' + wxS.w.windMs.toFixed(2) + ' vs ' + wxS.st.wind.speed.toFixed(2) + ')');
ok(wxS.e.length === 0 && wxC.e.length === 0 && wxM.e.length === 0, 'weather pages 0 console errors');
const wn = await openLong('?ui=0&q=low&post=0&weather=auto&seed=135&wt=1'); const wnS = await wn.page.evaluate(() => __li.weather()); await wn.page.close();
ok(wnS && wnS.schedule === 'seed 135' && wn.errs.length === 0, 'without ?macro=1 the weather page still runs its own seeded schedule (state ' + wnS.state + ')');

/* 9. boats: heave and tilt */
const bt = async mh => { const r = await openLong('?ui=0&q=low&post=0&macro=1&boats=2&seed=135&mh=' + mh); const o = await r.page.evaluate(async () => { const M = __li.macro; await new Promise(x => setTimeout(x, 400)); M.resetHeave(); const ys = []; const id = __li.boats().findIndex(b => b.kind === 'moored' && !b.sail);
    for (let i = 0; i < 40; i++) { M.advance(0.25); await new Promise(x => requestAnimationFrame(x)); ys.push(M.heave().h); } return { h: M.heave(), span: Math.max(...ys) - Math.min(...ys), tide: M.tide() }; }); const e = r.errs; await r.page.close(); return { ...o, e }; };
const bS = await bt(30), bC = await bt(6);
ok(bS.h.n > 0 && bS.h.maxH <= 0.25 + 1e-6 && bS.h.maxP <= 0.12 + 1e-6 && bS.h.maxR <= 0.12 + 1e-6, 'storm: heave max ' + bS.h.maxH.toFixed(3) + ' m (cap 0.25), pitch ' + bS.h.maxP.toFixed(3) + ', roll ' + bS.h.maxR.toFixed(3) + ' rad (cap 0.12)');
ok(bC.h.n > 0 && bC.h.maxH <= 0.25 + 1e-6 && bC.h.maxH < bS.h.maxH && bC.h.maxH > 0.005, 'calm day: heave max ' + bC.h.maxH.toFixed(3) + ' m, smaller than the storm and not zero');
ok(bS.span > 0.01 && bS.span <= 0.5, 'the moored boat actually moves in a storm: heave span ' + bS.span.toFixed(3) + ' m over 10 s of sea time');
ok(bS.e.length === 0 && bC.e.length === 0, 'boat pages 0 console errors');
const bn = await openLong('?ui=0&q=low&post=0&boats=2&seed=135'); const bnN = await bn.page.evaluate(() => !__li.macro); await bn.page.close();
ok(bnN && bn.errs.length === 0, '?boats=2 without ?macro=1: no macro object, no heave code path');

await browser.close();
console.log('\n' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
