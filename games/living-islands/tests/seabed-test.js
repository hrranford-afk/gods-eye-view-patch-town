/* SEABED TEST for islands_look.html?seabed=1 and seabed.js (headless chromium, software GL, plus pure node checks).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/seabed-test.js
   Checks: default scene untouched (hash 8d962c0c, 88,790 tris, 0 errors, no seabed API); ?seabed=1 has 0 console errors on the default scene, with ?flow=1&pass=landing, ?sea=2, Low quality and ?post=0;
   the depth field and the per-seed measures are deterministic (two page loads, and the page equals a pure node run of seabed.js); depth is 0 at the shore, deeper offshore, shallower on the sills than the open sea around;
   exposure is monotonic with tide level; the sand links join their islands at low water and not at high water; the stream rule is faster in narrower and in shallower gaps (constructed layouts and the page's own grid);
   the flow field uses it (throats faster than open water, race at a throat at mid tide, none at slack); beached wrack sits only on sheltered shores out of fast channels; landing windows are ordered by boat draft;
   the debug overlay is off by default and toggles; the sea shader gains one texture tap; triangles stay under 150k; the measures table varies sensibly over 21 seeds. */
import { launch, open } from './shoot.js';
import '../seabed.js';
const SB = globalThis.LI_SEABED;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const GOLD = '8d962c0c', GOLD_TRIS = 88790;
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
const { browser, ctx } = await launch();
const o = async qs => { const r = await open(ctx, '?ui=0&seed=1122' + qs); r.bad = () => r.errs.filter(e => !noise(e)); return r; };

/* 1 default scene unchanged */
const d = await o('&q=high');
const hd = await d.page.evaluate(() => __li.hashStatic()), sd = await d.page.evaluate(() => __li.stats());
ok(hd === GOLD && sd.tris === GOLD_TRIS, 'default scene (no ?seabed): hash ' + hd + ' tris ' + sd.tris);
ok(d.bad().length === 0, 'default scene 0 console errors');
ok(await d.page.evaluate(() => __li.seabed === null && __li.depthAt === null && __li.bathy === null) && (await d.page.$('#sbOverlay')) === null && (await d.page.$('#sbpanel')) === null, 'no seabed API, overlay or panel without ?seabed=1');
await d.page.close();

/* 2 pure node module: determinism and constructed gap tests (no browser) */
const L = SB.layoutForSeed(1122);
const a = SB.create(L, 1122), b = SB.create(SB.layoutForSeed(1122), 1122);
ok(JSON.stringify(a.bathy()) === JSON.stringify(b.bathy()) && JSON.stringify(a.measures().landingList) === JSON.stringify(b.measures().landingList), 'node: depth field and measures identical on two runs (seed 1122)');
const c3 = SB.create(SB.layoutForSeed(3), 3), c3b = SB.create(SB.layoutForSeed(3), 3);
ok(JSON.stringify(c3.bathy()) === JSON.stringify(c3b.bathy()) && JSON.stringify(a.bathy()) !== JSON.stringify(c3.bathy()), 'node: another seed is deterministic and different');
const twin = (gap, r) => { const rr = 8; return SB.create({ authored: false, start: 0, landingDir: [1, 0], islands: [
  { id: 'a', x: -(rr + gap / 2), z: 0, rx: rr, rz: rr, rot: 0, peak: 3, sb: .2, bw: 3, Rin: 8, under: .3, rough: .5, lump: 0, surf: .3, warp: .01, r, Dm: 6 },
  { id: 'b', x: (rr + gap / 2), z: 0, rx: rr, rz: rr, rot: 0, peak: 3, sb: .2, bw: 3, Rin: 8, under: .3, rough: .5, lump: 0, surf: .3, warp: .01, r, Dm: 6 }] }, 9); };
const nar = twin(12, .8), wid = twin(34, .8);
const thr = s => s.chans.length ? SB.streamSpeed(s.chans[0].w, Math.min(s.depthAt(s.chans[0].mid[0], s.chans[0].mid[1]), s.depthAt(s.chans[0].sills[0][0], s.chans[0].sills[0][1]))) : 0;
ok(nar.chans.length === 1 && wid.chans.length === 1 && Math.abs(nar.chans[0].w - 12) < 1.5 && Math.abs(wid.chans[0].w - 34) < 1.5, 'constructed twin islands: gaps measured as ' + nar.chans[0].w + ' m and ' + wid.chans[0].w + ' m');
ok(thr(nar) > thr(wid) * 1.3, 'narrower gap, faster stream at the throat: ' + thr(nar).toFixed(2) + ' m/s (12 m gap) vs ' + thr(wid).toFixed(2) + ' (34 m gap)');
ok(nar.measures().fastest > wid.measures().fastest, 'measures().fastest is higher for the narrow gap (' + nar.measures().fastest + ' vs ' + wid.measures().fastest + ')');
ok(SB.streamSpeed(20, 2) > SB.streamSpeed(40, 2) && SB.streamSpeed(20, 1.6) > SB.streamSpeed(20, 3.2) && SB.streamSpeed(20, 3) > SB.streamSpeed(60, 3), 'stream rule: faster when narrower, faster when shallower (above 1.2 m, where bed friction takes over)');
ok(SB.streamSpeed(20, .4) < SB.streamSpeed(20, 1.5), 'stream rule: friction slows the stream on flats under about 1 m');
/* depth profile along a line from island centre outward: 0 at the shore, rising */
{ const I = a.isl[1], dir = [1, 0]; let prev = -1, mono = true, sh = 0; for (let t = 0; t < 70; t += 2) { const dd = a.depthAt(I.x + dir[0] * (t + 2), I.z + dir[1] * t); if (t > 20 && dd < prev - .6) mono = false; prev = dd; }
  const sill = a.chans[0].sills[0]; const around = [[8, 0], [-8, 0], [0, 8], [0, -8]].map(([x, z]) => a.depthAt(sill[0] + x * 2, sill[1] + z * 2));
  const sandI = a.isl[1], shelfD = a.depthAt(sandI.x + 16, sandI.z), deepD = a.depthAt(80, 80);
  ok(a.depthAt(sandI.x, sandI.z) < .05 && shelfD > .3 && shelfD < 3 && deepD > 4.5 && a.depthAt(sandI.x + 8.5, sandI.z) < shelfD, 'depth: 0 on land, ' + shelfD.toFixed(1) + ' m on the sandy shelf 16 m out, ' + deepD.toFixed(1) + ' m in open water'); void mono; void around;
  const shoal = a.chans.map(C => { const dS = Math.min(a.depthAt(C.sills[0][0], C.sills[0][1]), a.depthAt(C.sills[1][0], C.sills[1][1])), dH = a.depthAt(C.hole[0], C.hole[1]); return [dS, dH]; });
  ok(shoal.every(([s, h]) => s < h) && shoal.some(([s, h]) => h > s * 2), 'every channel: the scour hole is deeper than the sill (' + shoal.map(([s, h]) => s.toFixed(1) + '/' + h.toFixed(1)).join(' ') + ' m)'); }
/* exposure monotonic with tide level, and the sand links */
{ let prev = 1e9, mono = true; for (let lv = -1.1; lv <= 1.1; lv += .1) { const e = a.exposedArea(lv); if (e > prev + 1e-6) mono = false; prev = e; }
  ok(mono && a.exposedArea(-1.0) > a.exposedArea(-.3) + 100 && a.exposedArea(1.0) <= a.exposedArea(0) && a.exposedArea(-1.0) > a.exposedArea(-.6), 'exposure monotonic with level: bare sea bed ' + Math.round(a.exposedArea(-1)) + ' m2 at -1.0 m, ' + Math.round(a.exposedArea(0)) + ' at 0, ' + Math.round(a.exposedArea(1)) + ' at +1.0');
  const bars = a.bars; ok(bars.length === 2 && bars.every(B => a.linked(B.i, B.j, -1.0) && !a.linked(B.i, B.j, 0.3)), 'node: both sand links join their islands at low water (-1.0 m) and are cut at +0.3 m');
  const m = a.measures(); ok(m.barsDryAtLow === 2 && m.barsWetAtHigh === 2, 'measures: sand links dry at low water and wet at high water');
  ok(a.minutesAbove(-2) === 745 && a.minutesAbove(2) === 0 && a.minutesAbove(-.3) > a.minutesAbove(.3), 'tide minutes above a level fall as the level rises'); }

/* 3 page, seabed alone, then with flow + landing, twice for determinism */
const A = await o('&q=high&seabed=1&seat=3.7'), B = await o('&q=high&seabed=1&seat=3.7');
ok(A.bad().length === 0 && B.bad().length === 0, '?seabed=1 default scene: 0 console errors/warnings' + (A.bad().length ? ': ' + A.bad().slice(0, 3).join(' | ') : ''));
const bj = pg => pg.evaluate(() => { const pts = [[0, 0], [10, -20], [-30, 10], [40, 5], [-60, -40], [22, -46], [-20, -38], [70, 20]]; return { bathy: JSON.stringify(__li.bathy()), at: pts.map(([x, z]) => __li.depthAt(x, z)), M: JSON.stringify(__li.seabed.measures()), hash: __li.hashStatic() }; });
const pa = await bj(A.page), pb = await bj(B.page); await B.page.close();
ok(pa.bathy === pb.bathy && JSON.stringify(pa.at) === JSON.stringify(pb.at) && pa.M === pb.M && pa.hash === pb.hash, 'depth field, depthAt samples, measures and world hash identical on two loads (bathy JSON ' + pa.bathy.length + ' chars)');
ok(pa.bathy === JSON.stringify(a.bathy()), 'the page and a pure node run of seabed.js produce the same bathymetry JSON');
ok(JSON.stringify(JSON.parse(pa.M)) === JSON.stringify((() => { const m = a.measures(); delete m._lists; return m; })()), 'the page and node give the same measures for seed 1122');
ok(pa.hash !== GOLD, 'seabed changes the world (hash ' + pa.hash + ') only when asked');
/* depthAt vs the pure depth on open water; shore and shelf */
const dd = await A.page.evaluate(() => { const o = []; for (let x = -85; x <= 85; x += 17) for (let z = -85; z <= 85; z += 17) { if (x * x + z * z > 85 * 85) continue; o.push([x, z, __li.depthAt(x, z), __li.seabed.core(x, z)]); } return o; });
const diff = dd.filter(([x, z, p, c]) => c > 1.5 && p > 0).map(([x, z, p, c]) => Math.abs(p - c));
ok(diff.length > 10 && Math.max(...diff) < .6, 'page depthAt (-H) matches the bathymetry rule on open water (max difference ' + Math.max(...diff).toFixed(2) + ' m over ' + diff.length + ' points; rock crags add the rest)');
const gridTest = await A.page.evaluate(() => { const S = __li.seabed; const out = { narrow: [], wide: [] };
  for (let x = -90; x <= 90; x += 2) for (let z = -90; z <= 90; z += 2) { if (x * x + z * z > 88 * 88) continue; const w = S.widthAt(x, z), D = __li.depthAt(x, z); if (w <= 0 || D < 1.4 || D > 2.6) continue; (w < 30 ? out.narrow : w > 70 ? out.wide : []).push(S.mAt(x, z)); }
  const mean = a => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length); const sh = [], dp = [];
  for (let x = -90; x <= 90; x += 2) for (let z = -90; z <= 90; z += 2) { if (x * x + z * z > 88 * 88) continue; const w = S.widthAt(x, z), D = __li.depthAt(x, z); if (w < 25 || w > 45) continue; if (D > 1.3 && D < 2.4) sh.push(S.mAt(x, z)); if (D > 2.8 && D < 6) dp.push(S.mAt(x, z)); }
  return { nm: mean(out.narrow), wm: mean(out.wide), n1: out.narrow.length, n2: out.wide.length, shallow: mean(sh), deep: mean(dp), ns: sh.length, nd: dp.length }; });
ok(gridTest.nm > gridTest.wm * 1.4 && gridTest.n1 > 20 && gridTest.n2 > 20, "page grid: narrow water (< 30 m across) streams faster than wide water at the same depth: x" + gridTest.nm.toFixed(2) + ' vs x' + gridTest.wm.toFixed(2) + ' (' + gridTest.n1 + '/' + gridTest.n2 + ' cells)');
ok(gridTest.shallow > gridTest.deep * 1.2 && gridTest.ns > 5 && gridTest.nd > 5, "page grid: shallower water streams faster than deep water in channels of equal width: x" + gridTest.shallow.toFixed(2) + ' vs x' + gridTest.deep.toFixed(2) + ' (' + gridTest.ns + '/' + gridTest.nd + ' cells)');
/* shader taps */
const taps = await A.page.evaluate(() => __li.seabed.shaderTaps());
const srcHtml = (await import('node:fs')).readFileSync(new URL('../islands_look.html', import.meta.url), 'utf8'), tapsOf = n => { const i = srcHtml.indexOf('const ' + n + '=`'); return (srcHtml.slice(i, srcHtml.indexOf('`;', i)).match(/texture2D\(/g) || []).length; };
ok(taps === tapsOf('SEA2_FS') + 1, 'seabed adds exactly one texture tap to the sea shader (SEA2_FS ' + tapsOf('SEA2_FS') + ' -> ' + taps + '; the flow shader SEAF_FS has ' + tapsOf('SEAF_FS') + ' -> ' + (tapsOf('SEAF_FS') + 1) + ')');
/* overlay off by default and toggles */
ok(await A.page.evaluate(() => getComputedStyle(document.getElementById('sbOverlay')).display === 'none' && getComputedStyle(document.getElementById('sbpanel')).display === 'none'), 'debug overlay and panel are off by default');
await A.page.evaluate(() => __li.seabed.overlay(true)); await A.page.waitForTimeout(600);
ok(await A.page.evaluate(() => getComputedStyle(document.getElementById('sbOverlay')).display === 'block' && document.getElementById('sbpanel').textContent.includes('seed 1122')), 'overlay toggles on with __li.seabed.overlay(true)');
ok(A.bad().length === 0, 'still 0 console errors after the overlay drew');
/* measure list sanity (page) */
const M = JSON.parse(pa.M);
ok(M.landFraction > .05 && M.landFraction < .25 && M.gaps >= 3 && M.channels >= 2 && M.landingCandidates >= 2 && M.haulOuts >= 1 && M.skerries >= 1 && M.kelpArea > 500 && M.coves >= 1, 'seed 1122 measures sane: land ' + (M.landFraction * 100).toFixed(1) + '%, ' + M.gaps + ' gaps, ' + M.landingCandidates + ' landing sites, ' + M.haulOuts + ' haul-out, kelp ' + M.kelpArea + ' m2, ' + M.coves + ' coves');
await A.page.close();

/* 4 flow + landing: budget, flow uses the seabed, wrack rules, landing windows */
const F = await o('&q=high&pass=landing&flow=1&seabed=1&seat=3.7');
ok(F.bad().length === 0, '?seabed=1&flow=1&pass=landing: 0 console errors/warnings' + (F.bad().length ? ': ' + F.bad().slice(0, 3).join(' | ') : ''));
const sF = await F.page.evaluate(() => __li.stats());
ok(sF.tris < 150000, 'triangle budget under 150k: ' + sF.tris + ' (landing + flow alone 143,081)');
const probe = pg => pg.evaluate(() => { const pts = [[-60, 20], [10, 10], [31, 34], [50, -20], [-20, -45], [5, 60], [40, 5], [-18.7, -37.6], [45.9, 14.5]], out = []; for (const T of [0, 13.75, 27.5, 41, 110, 137.5, 250]) for (const [x, z] of pts) out.push(__li.flow.at(x, z, T)); out.push(__li.flow.positions(200).map(p => [p.x, p.z, p.beached].join(','))); return JSON.stringify(out); });
const probeF = await probe(F.page);
const fl = await F.page.evaluate(() => { __li.setTideDir(1); const S = __li.seabed, T0 = 110, Ts = 41.25, th = S.lists().throats.slice().sort((a, b) => b.u - a.u)[0];
  const sp = (x, z, T) => Math.hypot(...__li.flow.at(x, z, T)); const open = [[-85, 0], [0, 85], [85, 10], [10, -88]].map(([x, z]) => sp(x, z, T0)).reduce((s, v) => s + v, 0) / 4;
  return { thr: th, spThroat: sp(th.x, th.z, T0), spOpen: open, raceMid: Math.max(...S.lists().throats.map(t => S.race(t.x, t.z, T0))), raceSlack: Math.max(...S.lists().throats.map(t => S.race(t.x, t.z, Ts))), slackSpeed: sp(th.x, th.z, Ts), ph: Math.cos(2 * Math.PI * Ts / 55) }; });
ok(fl.spThroat > fl.spOpen * 2, 'flow: the fastest channel throat (' + fl.thr.w + ' m wide, ' + fl.thr.depth + ' m deep) runs ' + fl.spThroat.toFixed(2) + ' m/s at mid tide vs ' + fl.spOpen.toFixed(2) + ' in open water');
ok(fl.raceMid > 0 && fl.raceSlack === 0 && fl.slackSpeed < .3, 'overfall race at a throat at mid tide (' + fl.raceMid.toFixed(2) + ') and none at slack water (' + fl.raceSlack + ', stream ' + fl.slackSpeed.toFixed(2) + ' m/s)');
const wr = await F.page.evaluate(() => { const S = __li.seabed; let n = 0, bad = 0; for (let T = 100; T <= 700; T += 13.75) { const bch = __li.flow.positions(T).filter(p => p.beached); n = Math.max(n, bch.length); bad += bch.filter(p => S.exposureAt(p.x, p.z) >= .7 || S.uAt(p.x, p.z) >= 1.9).length; } return { n, bad, cnt: __li.flow.counts() }; });
ok(wr.n > 5 && wr.bad === 0, 'wrack: up to ' + wr.n + ' items beached at once over T=100..700 s, none on exposed shore or in a fast channel (' + wr.bad + ')');
const lw = await F.page.evaluate(() => { const o = {}; for (const t of [-1.0, 0, 1.0]) { __li.setTide(t); o[t] = __li.seabed.landing(); } return o; });
const w = lw[0].byDraft;
ok(w.row.minutes >= w.sail.minutes && w.sail.minutes >= w.work.minutes && w.row.minutes <= 745 && w.work.minutes >= 0 && lw[0].dryFlat > 0, 'landing windows (min per tide): row ' + w.row.minutes + ', small sail ' + w.sail.minutes + ', work boat ' + w.work.minutes + '; dry flat ' + lw[0].dryFlat + ' m');
ok(F.bad().length === 0, 'no console errors after the tide sweep');
await F.page.close();
const F2 = await o('&q=high&pass=landing&flow=1&seabed=1&seat=3.7');
ok(probeF === await probe(F2.page) && F2.bad().length === 0, 'seabed flow field and flotsam positions identical on a second load (' + probeF.length + ' chars), 0 console errors');
await F2.page.close();

/* 5 variants: sea=2, Low, post=0, ebb */
for (const [q, label] of [['&q=high&sea=2&seabed=1', 'seabed + sea=2'], ['&q=low&seabed=1', 'Low quality'], ['&q=low&seabed=1&flow=1&pass=landing', 'Low + flow + landing'], ['&q=high&seabed=1&post=0', '?post=0 (AR-safe path)'], ['&q=high&seabed=1&flow=1&post=0&pass=landing', '?post=0 + flow + landing']]) {
  const v = await o(q + '&seat=3.7'); const s = await v.page.evaluate(() => __li.stats());
  ok(v.bad().length === 0 && s.tris > 1000 && s.tris < 150000, label + ': 0 console errors, ' + s.tris.toLocaleString() + ' tris' + (v.bad().length ? ' | ' + v.bad().slice(0, 2).join(' | ') : '')); await v.page.close(); }
const pp = await o('&q=high&seabed=1&flow=1&pass=landing&post=0&seat=3.7'); await pp.page.evaluate(() => __li.setTide(0)); await pp.page.waitForTimeout(800);
ok(pp.bad().length === 0 && await pp.page.evaluate(() => !document.querySelector('canvas').__post), '?post=0 renders without the post pass'); await pp.page.close();

/* 6 the measures table over 21 seeds (node) */
const seeds = [1122]; for (let s = 1; s <= 20; s++) seeds.push(s);
const rows = seeds.map(s => { const sb = SB.create(SB.layoutForSeed(s), s); return sb.measures(); }); const rows2 = seeds.map(s => { const sb = SB.create(SB.layoutForSeed(s), s); return sb.measures(); });
ok(JSON.stringify(rows.map(r => { const c = Object.assign({}, r); delete c._lists; return c; })) === JSON.stringify(rows2.map(r => { const c = Object.assign({}, r); delete c._lists; return c; })), 'measures deterministic for 21 seeds');
const spread = k => new Set(rows.map(r => typeof r[k] === 'number' ? Math.round(r[k] * (k === 'landFraction' ? 200 : 20)) / (k === 'landFraction' ? 200 : 20) : JSON.stringify(r[k]))).size;
ok(['landFraction', 'gaps', 'channels', 'fastest', 'landingCandidates', 'kelpArea', 'coves', 'deepestHole'].every(k => spread(k) >= 6), 'measures vary over 21 seeds (distinct values: land ' + spread('landFraction') + ', gaps ' + spread('gaps') + ', fastest ' + spread('fastest') + ', landing ' + spread('landingCandidates') + ', kelp ' + spread('kelpArea') + ', coves ' + spread('coves') + ')');
const bounds = rows.filter(r => r.landFraction > .03 && r.landFraction < .3 && r.landingCandidates >= 1 && r.haulOuts >= 1 && r.kelpArea > 500 && r.coves >= 1 && r.channels >= 1);
ok(bounds.length >= 20, bounds.length + ' of 21 seeds meet the sanity bounds (land 3 to 30%, a landing site, a haul-out, kelp, a cove, a channel)');
ok(rows.filter(r => r.fastest > 2).length >= 18, rows.filter(r => r.fastest > 2).length + ' of 21 seeds have a throat stream over 2 m/s (a race to avoid)');
console.log('seed land% gaps links chan fastest landing haul skerry kelp coves dryflat');
for (const r of rows) console.log([r.seed, (r.landFraction * 100).toFixed(1), r.gaps, r.bars, r.channels, r.fastest, r.landingCandidates, r.haulOuts, r.skerries, r.kelpArea, r.coves, r.dryFlatAtLanding].join('\t'));
await browser.close();
console.log(fails ? '\n' + fails + ' CHECK(S) FAILED' : '\nALL CHECKS PASSED');
process.exit(fails ? 1 : 0);
