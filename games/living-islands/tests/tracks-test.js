/* TRACKS TEST (pure node): Job 6d item 3. Robot tracks are soft, fading marks (never black, low alpha, soft edges, gone in about a game hour); the commonly walked route wears a pale path slowly, capped, fading slowly, with no growth past the cap.
   Run: node games/living-islands/tests/tracks-test.js */
import fs from 'fs'; import { fileURLToPath } from 'url'; import path from 'path';
await import('../where_from.js'); await import('../camp_start.js');
const W = globalThis.LI_WHERE, C = globalThis.LI_CAMP, dir = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(dir, '..', 'camp_start.js'), 'utf8');
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const T = C.TRACK, luma = T.col[0] * .3 + T.col[1] * .59 + T.col[2] * .11;
ok(luma > .15 && T.col[1] > T.col[0] && T.col[1] > T.col[2], 'a track is a darker green, not black (luma ' + luma.toFixed(2) + ', was 0.02)');
ok(T.amp <= .25, 'a track is faint: alpha at most ' + T.amp + ' (was 0.6)');
ok(T.fadeS >= 240 && T.fadeS <= 340, 'a track fades over about a game hour (' + T.fadeS + ' s; a game hour is 20 / 0.07 = 286 s at the day pace)');
ok(/smoothstep\(0\.42,1\.0,abs\(vS\)\)/.test(src) && /setAttribute\('aS'/.test(src), 'a track has soft side edges (the shader fades across the width)');
ok(!/new THREE\.Vector3\(\.02, \.016, \.012\)/.test(src), 'the old black colour is gone');
/* worn paths */
const routes = [0, 1, 2, 3, 4, 5, 6].map(i => [[0, 0], [10 + i, 4], [30 + i * 3, 12 - i]]);
const plan = W.pathPlan(routes, W.PATH.cap), tot = plan.reduce((a, b) => a + b.length, 0);
ok(tot <= W.PATH.cap && tot > 7, 'the path mesh is capped: ' + tot + ' segments for 7 routes (cap ' + W.PATH.cap + ', ' + tot * 2 + ' triangles)');
const long = W.pathPlan([[[0, 0], [500, 0]]], W.PATH.cap); ok(long[0].length <= W.PATH.cap, 'one very long route still obeys the cap (' + long[0].length + ')');
const Wr = W.wearNew(7); ok(W.wearAlpha(Wr, 0) === 0, 'a new island has no worn path');
W.wearAdd(Wr, 0, 1); const one = W.wearAlpha(Wr, 0); ok(one > 0 && one < .05, 'one trip leaves almost nothing (alpha ' + one.toFixed(3) + ')');
for (let i = 0; i < 40; i++) W.wearAdd(Wr, 0, 1); ok(W.wearAlpha(Wr, 0) === W.PATH.maxA, 'a much walked route tops out at a pale ' + W.PATH.maxA + ' and no further');
ok(W.wearAlpha(Wr, 1) === 0, 'a route nobody walked stays clear');
const Wq = W.wearNew(1); W.wearAdd(Wq, 0, W.PATH.trips); const a0 = W.wearAlpha(Wq, 0); W.wearDecay(Wq, 300); const a1 = W.wearAlpha(Wq, 0); ok(a1 < a0 && a1 > .6 * a0, 'it fades slowly: five minutes without a trip takes only a little (' + a0.toFixed(2) + ' to ' + a1.toFixed(2) + ')');
W.wearDecay(Wq, 6000); ok(W.wearAlpha(Wq, 0) === 0, 'it is gone after a couple of hours with no trips');
/* a routine day wears the busy route more than the quiet one, and the number of segments never changes */
const bump = (x, z, cx, cz, r, h) => h * Math.exp(-(((x - cx) / r) ** 2 + ((z - cz) / r) ** 2));
const H = (x, z) => Math.max(bump(x, z, 28, 30, 15, 3.4), bump(x, z, -30, 40, 28, 3.2), bump(x, z, 6, -50, 20, 2.4), bump(x, z, -42, -26, 18, 3.0)) - .55;
const f = { x: 28.8, z: 36.9, y: H(28.8, 36.9) };
const pl = C.plan({ seed: 1122, H, tableR: 122, tier: 'high', camp: { fire: f, dir: [.12, .99] }, hard: [{ x: f.x, z: f.z, r: 4 }], clear: [] });
const sim = C.simCreate(pl, [{ kind: 'family' }, { kind: 'scout' }], {}); sim.robots.forEach((r, i) => { r.timer = .3 + i * 3; });
for (let t = 0; t < 2400; t += .5) C.simStep(sim, .5, { night: false, rain: false, tide: 0 });
const tb = sim.tripsBy || []; ok(tb.reduce((a, b) => a + (b || 0), 0) > 10, 'the routine counts trips per route (' + tb.map(v => v || 0).join(',') + ')');
const rts = pl.work.map(w => [[sim.YP.apron.x, sim.YP.apron.z]].concat(w.via || []).concat([[w.x, w.z]])), p2 = W.pathPlan(rts, W.PATH.cap); ok(p2.reduce((a, b) => a + b.length, 0) <= W.PATH.cap, 'the real island routes fit the cap: ' + p2.reduce((a, b) => a + b.length, 0) + ' segments');
console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed'); process.exit(fails ? 1 : 0);
