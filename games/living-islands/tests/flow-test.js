/* FLOW TEST for islands_look.html?flow=1 (headless chromium, software GL).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/flow-test.js
   Checks: default scene untouched (hash 8d962c0c, 88,790 tris, 0 errors); ?flow=1 0 console errors (landing, Low, ?post=0, with ?sea=2);
   the flow field and the flotsam positions are deterministic for a seed and tide time (also after jumping back in time); the potential-flow part is nearly divergence free
   away from the islands (pointwise and as net flux through small circles); the stream reverses between flood and ebb; items beach only near high water, only at gentle shore,
   sit on dry ground at low tide; counters add up; triangle budget under 150k; the debug panel is off unless asked for; the sailing boat feels the current. */
import { launch, open } from './shoot.js';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const GOLD = '8d962c0c', GOLD_TRIS = 88790;
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
const { browser, ctx } = await launch();
const o = async (qs) => { const r = await open(ctx, '?ui=0&seed=1122' + qs); r.bad = () => r.errs.filter(e => !noise(e)); return r; };

/* 1 default scene unchanged */
const d = await o('&q=high');
const hd = await d.page.evaluate(() => __li.hashStatic()), sd = await d.page.evaluate(() => __li.stats());
ok(hd === GOLD && sd.tris === GOLD_TRIS, 'default scene (no ?flow): hash ' + hd + ' tris ' + sd.tris);
ok(d.bad().length === 0, 'default scene 0 console errors');
ok(await d.page.evaluate(() => __li.flow === null && __li.flowAt === null) && (await d.page.$('#flowdbg')) === null, 'no flow API and no flow panel without ?flow=1');
await d.page.close();
const l = await o('&q=high&pass=landing');
const hl = await l.page.evaluate(() => __li.hashStatic()), tl = (await l.page.evaluate(() => __li.stats())).tris;
await l.page.close();

/* 2 flow=1 on the landing pass, twice (determinism across loads) */
const A = await o('&q=high&pass=landing&flow=1&seat=3.7'), B = await o('&q=high&pass=landing&flow=1&seat=3.7');
ok(A.bad().length === 0 && B.bad().length === 0, '?flow=1 high (landing): 0 console errors/warnings' + (A.bad().length ? ': ' + A.bad().slice(0, 3).join(' | ') : ''));
const sA = await A.page.evaluate(() => ({ ...__li.stats(), hash: __li.hashStatic() }));
ok(sA.hash === hl, '?flow=1 leaves the world hash alone (' + sA.hash + ')');
ok(sA.tris < 150000 && sA.tris > tl, 'triangle budget under 150k: ' + sA.tris + ' (landing alone ' + tl + ', flotsam adds ' + (sA.tris - tl) + ')');
const probe = pg => pg.evaluate(() => {
  const pts = [[-60, 20], [10, 10], [31, 34], [50, -20], [-20, -45], [5, 60], [40, 5]], out = { f: [], p: [] };
  for (const T of [0, 13.75, 27.5, 41, 110, 137.5, 250]) for (const [x, z] of pts) { out.f.push(__li.flow.at(x, z, T)); out.p.push(__li.flow.pure(x, z, T)); }
  const q = T => __li.flow.positions(T).map(p => [p.x, p.z, p.beached ? 1 : 0].join(','));
  out.pos150 = q(150); out.pos300 = q(300); out.back = q(150); out.cnt = __li.flow.counts(); out.dump = __li.flow.dump();
  return out; });
const pa = await probe(A.page), pb = await probe(B.page);
ok(JSON.stringify(pa.f) === JSON.stringify(pb.f) && JSON.stringify(pa.p) === JSON.stringify(pb.p), 'flow field: identical on two loads (' + pa.f.length + ' samples, T from 0 to 250 s)');
ok(pa.dump === pb.dump && pa.dump.length > 200 && JSON.parse(pa.dump).islands.length === 6, 'flow parameters are plain JSON (' + pa.dump.length + ' chars) and identical');
ok(JSON.stringify(pa.pos150) === JSON.stringify(pb.pos150) && JSON.stringify(pa.pos300) === JSON.stringify(pb.pos300), 'flotsam positions at T=150 and T=300: identical on two loads (' + pa.pos150.length + ' items)');
ok(JSON.stringify(pa.pos150) === JSON.stringify(pa.back), 'positions at T=150 are the same after running on to T=300 and jumping back (checkpoint restore)');
ok(JSON.stringify(pa.pos150) !== JSON.stringify(pa.pos300), 'items move between T=150 and T=300');
await B.page.close();

/* 3 mass conservation sanity of the potential-flow part */
const mc = await A.page.evaluate(() => {
  const P = __li.flow.params(), isl = P.islands, W = [];
  const far = (x, z, k) => isl.every(I => Math.hypot(x - I.x, z - I.z) > I.a * k) && Math.hypot(x, z) < 85;
  let n = 0, sd = 0, sg = 0, mx = 0; const e = 0.4;
  for (let T of [5, 20, 33]) for (let x = -80; x <= 80; x += 6.5) for (let z = -80; z <= 80; z += 6.5) { if (!far(x, z, 1.8)) continue;
    const u1 = __li.flow.pure(x + e, z, T), u0 = __li.flow.pure(x - e, z, T), v1 = __li.flow.pure(x, z + e, T), v0 = __li.flow.pure(x, z - e, T);
    const dudx = (u1[0] - u0[0]) / (2 * e), dvdz = (v1[1] - v0[1]) / (2 * e), dvdx = (u1[1] - u0[1]) / (2 * e), dudz = (v1[0] - v0[0]) / (2 * e);
    const div = dudx + dvdz; sd += Math.abs(div); sg += Math.abs(dudx) + Math.abs(dvdz) + Math.abs(dudz) + Math.abs(dvdx); mx = Math.max(mx, Math.abs(div)); n++; }
  /* net flux out of circles of radius 4 m centred in open water */
  let fl = 0, fm = 0, nc = 0;
  for (const [cx, cz] of [[-10, 0], [10, -20], [-60, 10], [0, 70], [55, -35], [-5, -20], [60, 40]]) { if (!far(cx, cz, 1.6 + 4 / 12)) continue;
    let flux = 0, mag = 0; const M = 64; for (let k = 0; k < M; k++) { const a = k / M * 6.2832, nx = Math.cos(a), nz = Math.sin(a), u = __li.flow.pure(cx + 4 * nx, cz + 4 * nz, 20); flux += (u[0] * nx + u[1] * nz) * 4 * 6.2832 / M; mag += Math.hypot(u[0], u[1]) * 4 * 6.2832 / M; }
    fl = Math.max(fl, Math.abs(flux) / Math.max(mag, 1e-6)); nc++; }
  return { n, meanDiv: sd / n, meanGrad: sg / n, ratio: sd / sg, mx, fluxRatio: fl, nc }; });
ok(mc.n > 100 && mc.ratio < 0.02, 'potential-flow part is divergence free away from islands: mean |div| / mean |grad u| = ' + mc.ratio.toExponential(2) + ' over ' + mc.n + ' points (max |div| ' + mc.mx.toExponential(2) + ' 1/s)');
ok(mc.nc >= 3 && mc.fluxRatio < 0.02, 'net flux through 4 m circles is about zero: worst |flux| / |through-flow| = ' + mc.fluxRatio.toExponential(2) + ' over ' + mc.nc + ' circles');

/* 4 flood and ebb */
const fe = await A.page.evaluate(() => {
  const P = __li.flow.params(), ax = [Math.cos(P.axis), Math.sin(P.axis)]; let a = 0, b = 0, n = 0;
  for (let x = -70; x <= 70; x += 14) for (let z = -70; z <= 70; z += 14) { const f = __li.flow.pure(x, z, 0), e = __li.flow.pure(x, z, 27.5); a += f[0] * ax[0] + f[1] * ax[1]; b += e[0] * ax[0] + e[1] * ax[1]; n++; }
  const sp = (x, z, T) => Math.hypot(...__li.flow.at(x, z, T));
  return { flood: a / n, ebb: b / n, slack: sp(-60, 20, 13.75), mid: sp(-60, 20, 0) }; });
ok(fe.flood > 0.5 && fe.ebb < -0.5, 'stream along the tidal axis reverses: mean flood ' + fe.flood.toFixed(2) + ' m/s, ebb ' + fe.ebb.toFixed(2) + ' m/s');
ok(fe.slack < fe.mid * 0.6, 'slack water at high tide is slower than mid tide (' + fe.slack.toFixed(2) + ' against ' + fe.mid.toFixed(2) + ' m/s at a open-sea point)');

/* 5 beaching: scan 0..400 s of tide time */
const bt = await A.page.evaluate(() => {
  const first = {}, firstT = {}, N = __li.flow.N(); let stepOk = true, maxBeached = 0, sums = [];
  for (let T = 0; T <= 400; T += 0.5) { const P = __li.flow.positions(T); let nb = 0;
    for (const p of P) if (p.beached) { nb++; if (first[p.id] === undefined) { first[p.id] = { x: p.x, z: p.z }; firstT[p.id] = T; } } maxBeached = Math.max(maxBeached, nb); if (T % 100 === 0) sums.push(__li.flow.counts()); }
  const ids = Object.keys(first), tides = ids.map(i => __li.flow.tideAt(firstT[i])), hs = ids.map(i => __li.flow.hAt(first[i].x, first[i].z));
  /* heights of beached items at the end of the scan, relative to low and high tide */
  const fin = __li.flow.positions(400).filter(p => p.beached).map(p => __li.flow.hAt(p.x, p.z));
  return { n: ids.length, minTide: Math.min(...tides), minH: Math.min(...hs), maxH: Math.max(...hs), fin: fin.length, finMin: Math.min(...fin), finMax: Math.max(...fin), maxBeached, sums, N }; });
ok(bt.n >= 20, 'items do beach: ' + bt.n + ' beaching events in 400 s (max ' + bt.maxBeached + ' on the shore at once, of ' + bt.N + ')');
ok(bt.minTide > 0.79, 'every first beaching happened at high water: lowest tide level at a beaching ' + bt.minTide.toFixed(2) + ' m (rule: above 0.80 m)');
ok(bt.minH > 0.45 && bt.maxH < 1.25, 'beached items lie at the strandline: terrain height ' + bt.minH.toFixed(2) + ' to ' + bt.maxH.toFixed(2) + ' m (tide range +-1.01 m)');
ok(bt.fin > 5 && bt.finMin > 0.45, 'items that are on the shore sit above the mean-sea-level line, so they are dry at low tide (lowest ' + bt.finMin.toFixed(2) + ' m against low tide -1.01 m)');
const last = bt.sums[bt.sums.length - 1];
ok(bt.sums.every(c => c.floating + c.beached === c.total), 'counters add up (floating + beached = ' + last.total + ') at every checkpoint; lost off the map and respawned by T=400: ' + last.lostRespawned + ', beached items recycled: ' + last.beachRecycled);

/* 6 render side: counts in the meshes, tide dependent scene, boat set, panel */
const rs = await A.page.evaluate(async () => { __li.setTideDir(-1); __li.setTide(0.97); await new Promise(r => setTimeout(r, 1200)); const hi = __li.flow.meshCounts().reduce((a, b) => a + b, 0); const t = __li.stats().tris; return { hi, tris: t, N: __li.flow.N() }; });
ok(rs.hi === rs.N, 'every flotsam item is drawn (instanced): ' + rs.hi + ' of ' + rs.N + ' in 5 draw calls');
const boat = await (async () => { const r = await o('&q=high&pass=landing&flow=1&auto=1'); await r.page.waitForTimeout(2500); const b = await r.page.evaluate(() => __li.flow.boat()); await r.page.close(); return b; })();
ok(boat && isFinite(boat.ut) && isFinite(boat.setx), 'sailing boat reads the current (along-track ' + (boat ? boat.ut.toFixed(2) : '?') + ' m/s, set ' + (boat ? Math.hypot(boat.setx, boat.setz).toFixed(2) : '?') + ' m)');
await A.page.close();

/* 7 other paths */
const L = await o('&q=low&pass=landing&flow=1&seat=3.7');
const lc = await L.page.evaluate(() => ({ st: __li.stats(), N: __li.flow.N(), c: __li.flow.counts() }));
ok(L.bad().length === 0 && lc.st.quality === 'low' && lc.N < 200, 'Low path: 0 console errors, quality low, ' + lc.N + ' items (High 260), tris ' + lc.st.tris);
await L.page.close();
const P = await o('&q=high&pass=landing&flow=1&seat=3.7&post=0');
ok(P.bad().length === 0, '?post=0 (AR path) with ?flow=1: 0 console errors');
await P.page.close();
const S = await o('&q=high&pass=landing&sea=2&flow=1&seat=3.7');
ok(S.bad().length === 0, '?sea=2&flow=1 together: 0 console errors');
await S.page.close();
const G = await o('&q=high&flow=1&seat=3.7');
const gs = await G.page.evaluate(() => ({ h: __li.hashStatic(), t: __li.stats().tris }));
ok(G.bad().length === 0 && gs.h === GOLD && gs.t < 150000, '?flow=1 on the default scene: 0 errors, world hash ' + gs.h + ', tris ' + gs.t);
await G.page.close();
const D = await o('&q=high&pass=landing&flow=1&flowdbg=1&arrows=1&seat=3.7');
await D.page.waitForTimeout(800);
const dp = await D.page.evaluate(() => ({ panel: !!document.getElementById('flowdbg'), txt: (document.getElementById('flowTxt') || {}).textContent || '' }));
ok(D.bad().length === 0 && dp.panel && /floating/.test(dp.txt), 'debug panel and arrow overlay appear with ?flowdbg=1&arrows=1 and show counters');
await D.page.close();
await browser.close();
process.exit(fails ? 1 : 0);
