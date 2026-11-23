/* MACRO SEA TEST: macro_sea.js (pure node) plus a headless Chromium check of the GLSL sea height function.
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/macro-sea-test.js [nobrowser=1] [pack=1 forces the RGBA8 packed readback]
   The browser part uses software GL (swiftshader), one page, WebGL1, a 16 x 16 render to texture and a readback; it prints which readback path it used. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), SRC = path.join(here, '..', 'macro_sea.js');
const require = createRequire(import.meta.url);
await import(SRC); const M = globalThis.MacroSea;
let fails = 0, n = 0;
const ok = (c, msg, extra) => { n++; if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + msg + (extra !== undefined ? '  [' + extra + ']' : '')); };
const near = (a, b, rel) => Math.abs(a - b) <= rel * Math.abs(b);
const f2 = x => +x.toFixed(3);

/* 0 the module loads as CommonJS (UMD) and as a plain script */
{ const mod = { exports: {} }; new Function('module', 'exports', fs.readFileSync(SRC, 'utf8')).call(null, mod, mod.exports);
  ok(typeof mod.exports.macro === 'function' && mod.exports.HOUR_REAL_SECONDS === 20, 'UMD: module.exports works in a CommonJS context and globalThis.MacroSea after import'); var M2 = mod.exports; }

/* 1 wave relations */
{ let worst = 0; for (let T = 3; T <= 20; T += 0.5) { worst = Math.max(worst, Math.abs(M.waveLength(T) / (1.56 * T * T) - 1), Math.abs(M.groupSpeed(T) / (0.78 * T) - 1)); }
  ok(worst < 0.01, 'L = 1.56 T^2 and cg = 0.78 T within 1 percent for T 3..20 s', 'worst ' + (worst * 100).toFixed(2) + ' %'); }
/* 2 arrival time and dispersion */
{ const t = M.swellArrivalHours(1500, 14); ok(Math.abs(t - 38.1) < 0.1, '14 s swell from 1500 km arrives after 38.1 h', t.toFixed(2) + ' h'); }
{ const a = [[16, 33.4], [14, 38.1], [12, 44.5]].map(([T, t]) => [T, t, M.swellPeriodAt(1500, t)]);
  ok(a.every(([T, t, got]) => near(got, T, 0.01)), 'T(t) at the window = 16, 14, 12 s at 33.4, 38.1, 44.5 h', a.map(x => x[2].toFixed(2)).join(', '));
  ok(near(M.swellArrivalHours(1500, 16), 33.4, 0.01) && near(M.swellArrivalHours(1500, 12), 44.5, 0.01), 'arrival hours for 16 s and 12 s are 33.4 and 44.5', M.swellArrivalHours(1500, 16).toFixed(2) + ', ' + M.swellArrivalHours(1500, 12).toFixed(2)); }
/* 3 surge, whitecaps, PM */
ok(Math.abs(M.barometricSurge(960) - 0.53) < 0.005, '960 hPa centre gives 0.53 m of barometric surge (1013 base)', M.barometricSurge(960).toFixed(3));
ok(Math.abs(M.monahan(10) - 0.0099) < 0.0005 && Math.abs(M.monahan(15) - 0.039) < 0.002, 'Monahan cover is about 1 percent at 10 m/s and 3.9 percent at 15 m/s', (M.monahan(10) * 100).toFixed(2) + ' %, ' + (M.monahan(15) * 100).toFixed(2) + ' %');
ok(M.monahan(40) <= 0.25 + 1e-12 && M.monahan(0) === 0, 'whitecap cover is capped at 25 percent');
ok(Math.abs(M.pmHs(20) - 8.6) < 0.1 && Math.abs(0.21 * 400 / 9.81 - M.pmHs(20)) < 1e-9, 'Pierson-Moskowitz Hs at 20 m/s is about 8.6 m (0.21 U^2/g)', M.pmHs(20).toFixed(2));
ok(M.HOUR_REAL_SECONDS === 20 && M.DAY_REAL_SECONDS === 480 && M.gameHourFromReal(480) === 24 && M.gameHourFromReal(20, 5) === 6, 'game clock: 20 real s per game hour, 8 real minutes per game day');

/* two constructed storms, both slow (10 m/s, the bottom of the 10..25 range) and deepest 1500 km west of the window.
   S1: a strong low passing 300 km north (fronts, boats, surge). S2: a compact low passing 500 km north, for the swell lead time. A fast storm outruns its own swell (see the 20 m/s check). */
const S1 = M.finishStorm({ id: 'T1', tc: 140, c: 10, heading: 0, off: 300, dp: 45, Rm: 200, B: 1, xpk: 1500, tau: 40 });
const S2 = M.finishStorm({ id: 'T2', tc: 140, c: 10, heading: 0, off: 500, dp: 45, Rm: 160, B: 1.2, xpk: 1500, tau: 40 });
const NA = { arrivals: false }, withS = (...s) => Object.assign({ storms: s }, NA);
const scan = (seed, h0, h1, st, o) => { const out = []; for (let h = h0; h <= h1 + 1e-9; h += st) out.push(M.macro(seed, h, o)); return out; };
const ser1 = scan(5, 40, 240, 0.5, withS(S1)), ser2 = scan(5, 40, 240, 0.5, withS(S2));
const first = (arr, f) => { const x = arr.find(f); return x ? x.hour : null; };
const stormSwell = s => s.swell.filter(t => t.source !== 'background').reduce((m, t) => Math.max(m, t.Hs), 0);
{ const tSw = first(ser2, s => stormSwell(s) >= 0.5), tW = first(ser2, s => s.wind.speed >= 10);
  ok(tSw !== null && tW !== null && tW - tSw >= 12, 'swell (storm Hs >= 0.5 m, long and low) arrives at least 12 h before the local wind reaches 10 m/s in a 10 m/s low whose swell source is 1500 km away', 'swell ' + tSw + ' h, wind ' + tW + ' h, lead ' + (tW - tSw) + ' h');
  const fast = scan(5, 40, 240, 0.5, withS(M.finishStorm(Object.assign({}, S2, { c: 20, tc: 100 })))), fSw = first(fast, s => stormSwell(s) >= 0.5), fW = first(fast, s => s.wind.speed >= 10);
  ok(fSw !== null && fW !== null && fW - fSw < tW - tSw, 'physics check: a faster storm (20 m/s) leaves less lead (it outruns its swell, cg of 14 s is 11 m/s)', 'lead ' + (fW - fSw) + ' h at 20 m/s against ' + (tW - tSw) + ' h at 10 m/s');
  const pkSw = ser2.reduce((m, s) => stormSwell(s) > stormSwell(m) ? s : m, ser2[0]), pkWs = ser2.reduce((m, s) => s.windSea.Hs > m.windSea.Hs ? s : m, ser2[0]);
  ok(tSw < pkSw.hour && pkSw.hour < pkWs.hour, 'order at the window: swell onset, swell peak, then the local wind sea peak', 'onset ' + tSw + ', swell peak ' + pkSw.hour + ', wind sea peak ' + pkWs.hour);
  const train = h => M.macro(5, h, withS(S2)).swell.filter(t => t.source === 'T2').sort((a, b) => b.Hs - a.Hs)[0];
  const a = train(pkSw.hour), b = train(pkSw.hour + 6), c = train(pkSw.hour + 14);
  ok(a && b && c && a.T > b.T && b.T > c.T, 'peak period falls as the swell arrives and passes (dispersion)', [a, b, c].map(x => x ? x.T.toFixed(1) : '-').join(' > ') + ' s');
  const dom = pkSw.swell.find(t => t.source === 'T2'), dh = dom.arrival.tPeak - dom.arrival.tEmit;
  ok(near(dh, M.swellArrivalHours(dom.distKm, dom.arrival.peakT), 0.001), 'packet bookkeeping: peak arrival = emission + 4 pi D / (g T)', dh.toFixed(2) + ' h for ' + dom.distKm.toFixed(0) + ' km at ' + dom.arrival.peakT.toFixed(1) + ' s'); }
/* wind veers through the front */
{ const s = S1, hAt = a => s.tc + a / s.kmh, dirAt = a => M.macro(5, hAt(a), withS(s)).wind.dirFrom, d = (a, b) => ((b - a + 540) % 360) - 180;
  const dFar = dirAt(s.sw - 800), dPre = dirAt(s.sw - 60), dWarm = dirAt((s.sw + s.sc) / 2), dPost = dirAt(s.sc + 300), dBefore = dirAt(s.sc - 60), dAfter = dirAt(s.sc + 60);
  ok(d(dFar, dPre) < -20, 'wind BACKS (anticlockwise) ahead of the warm front as the low approaches', dFar.toFixed(0) + ' -> ' + dPre.toFixed(0) + ' deg, change ' + d(dFar, dPre).toFixed(0));
  ok(d(dPre, dWarm) > 10 && d(dPre, dWarm) < 140, 'wind veers (clockwise) from the pre-frontal backed wind to the warm sector', dPre.toFixed(0) + ' -> ' + dWarm.toFixed(0) + ' deg, change ' + d(dPre, dWarm).toFixed(0));
  ok(d(dWarm, dPost) > 20 && d(dWarm, dPost) < 140, 'wind veers through the cold front (warm sector to post-frontal)', dWarm.toFixed(0) + ' -> ' + dPost.toFixed(0) + ' deg, change ' + d(dWarm, dPost).toFixed(0));
  ok(d(dBefore, dAfter) > 5, 'the cold front veer is sharp (clockwise across 120 km of track, about 2 h)', 'change across the front ' + d(dBefore, dAfter).toFixed(0) + ' deg');
  const sp = a => M.macro(5, hAt(a), withS(s)).wind.speed; ok(sp(s.sc) > sp(s.sw - 800) && sp(s.sc) > sp(s.sc + 700), 'wind peaks around the cold front', sp(s.sw - 800).toFixed(1) + ' / ' + sp(s.sc).toFixed(1) + ' / ' + sp(s.sc + 700).toFixed(1) + ' m/s');
  const dp = a => M.macro(5, hAt(a), withS(s)).pressure - M.macro(5, hAt(a), { storms: [], arrivals: false }).pressure, d0 = dp(-3500), d1 = dp(-1200), d2 = dp(0), d3 = dp(3500);
  ok(d2 < d1 && d1 < d0 && d2 < -7 && d3 > d2 + 6, 'the low lowers the pressure more and more toward the track and it recovers after (with minus without the storm)', [d0, d1, d2, d3].map(x => x.toFixed(1)).join(' / ') + ' hPa');
  const rn = h => M.macro(5, h, withS(s)).rain; ok(Math.max(rn(hAt(s.sw - 200)), rn(hAt(s.sw))) > 0.4 && rn(hAt(s.sc)) > 0.5 && rn(hAt(-4000)) < 0.05, 'rain before the warm front and a burst at the cold front, dry far ahead', rn(hAt(s.sw)).toFixed(2) + ' / ' + rn(hAt(s.sc)).toFixed(2)); }
/* determinism */
{ const hs = []; let r = 12345; for (let i = 0; i < 60; i++) { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; hs.push((r / 4294967296) * 400 - 20); }
  const ref = hs.map(h => JSON.stringify(M.macro(1122, h))), order = hs.map((_, i) => i).sort((a, b) => ((Math.imul(a + 7, 2654435761) >>> 0) % 1009) - ((Math.imul(b + 7, 2654435761) >>> 0) % 1009)), got = new Array(hs.length);
  for (const i of order) got[i] = JSON.stringify(M.macro(1122, hs[i]));
  ok(ref.every((s, i) => s === got[i]), 'macro(seed, hour) is deterministic and order-independent (60 random hours, two orders, whole state compared)');
  ok(hs.slice(0, 20).every((h, i) => JSON.stringify(M2.macro(1122, h)) === ref[i]), 'a second independent instance of the module (empty caches) gives identical states'); }
{ const a = JSON.stringify(M.macro(1, 100, NA)), b = JSON.stringify(M.macro(2, 100, NA)); let diff = 0; for (let s = 1; s < 40; s++) if (M.macro(s, 100, NA).pressure !== M.macro(s + 1, 100, NA).pressure) diff++;
  ok(a !== b && diff >= 38, 'different seeds differ', diff + ' of 39 neighbouring seed pairs have different pressure'); }
/* arrivals */
{ const A = M.arrivals(1122, 0, 168), B = M.arrivals(1122, 0, 168), keys = A.map(e => e.key);
  ok(A.length > 5 && JSON.stringify(A) === JSON.stringify(B), 'keyed arrivals are identical on repeated calls', A.length + ' events in 7 days');
  ok(new Set(keys).size === keys.length && keys.every(k => /^1122:(wrack|driftlog|shoal|birdflight|boat|wreck):\d+$/.test(k)), 'keys are unique and formatted seed:kind:index', keys.slice(0, 3).join(' '));
  const parts = M.arrivals(1122, 0, 84).concat(M.arrivals(1122, 84.0000001, 168)), kinds = new Set(A.map(e => e.kind));
  ok(parts.length === A.length && parts.every((e, i) => e.key === A[i].key), 'idempotent across ranges: two half-week calls give the same keys as one whole-week call');
  let inState = 0, bad = 0; for (let n = 0; n < 168; n++) { const got = M.macro(1122, n + 0.9999).arrivals.map(e => e.key).sort(), want = A.filter(e => Math.floor(e.hour) === n && e.hour <= n + 0.9999).map(e => e.key).sort(); inState += got.length; if (got.join() !== want.join()) bad++; }
  ok(bad === 0 && inState > 10, 'macro(...).arrivals (events of the current game hour) match the keyed list hour by hour', inState + ' events, ' + bad + ' mismatching hours');
  const wk = []; for (const sd of [1122, 3, 4, 5, 6]) M.arrivals(sd, 0, 168).forEach(e => kinds.add(e.kind));
  ok(['wrack', 'shoal', 'birdflight', 'boat'].every(k => kinds.has(k)), 'kinds seen over a few weeks of seeds', [...kinds].join(', '));
  let inS = 0, inC = 0; for (const sd of [11, 12, 13, 14, 15, 16, 17, 18]) { const q = M.arrivals(sd, 0, 400, { storms: [M.finishStorm(Object.assign({}, S1, { tc: 200 }))] }).filter(e => e.kind === 'wreck' || e.kind === 'wrack' || e.kind === 'driftlog'); inS += q.filter(e => e.hour >= 150 && e.hour < 230).length; inC += q.filter(e => e.hour >= 0 && e.hour < 80).length; }
  ok(inS > 2 * inC, 'flotsam, wrack and wreck events are far commoner in the storm than in the calm before it (8 seeds)', inS + ' in the storm, ' + inC + ' in the calm'); }
/* boats */
{ const calm = M.macro(7, 50, { storms: [], arrivals: false }), pk = ser1.reduce((m, s) => s.seaHs > m.seaHs ? s : m, ser1[0]);
  ok(calm.sailOk.skiff && calm.sailOk.sail && calm.sailOk.decked, 'sailOk is true for every boat class in fair weather', 'U ' + calm.wind.speed.toFixed(1) + ' m/s, Hs_eff ' + calm.seaHsEff.toFixed(2) + ' m');
  ok(!pk.sailOk.skiff && !pk.sailOk.sail && !pk.sailOk.gig && pk.sailOk.row === false && pk.sailOk.work === pk.sailOk.decked, 'sailOk is false in the storm for the small boat classes', 'peak Hs ' + pk.seaHs.toFixed(1) + ' m at hour ' + pk.hour + ', U ' + pk.wind.speed.toFixed(1)); }
/* tide */
{ let mx = 0; for (let h = 0; h < 24 * 30; h += 0.25) { const lv = M.macro(9, h, NA).tide.level; mx = Math.max(mx, Math.abs(lv)); }
  ok(mx <= 1.1 + 1e-9 && mx > 0.9, 'tide maps into +-1.1 m (level = clamp(h/2.2) * 1.1) and uses nearly all of it', 'max |level| ' + mx.toFixed(3));
  const day = [], N = 60; for (let d = 0; d < N; d++) { let lo = 9, hi = -9; for (let h = d * 24; h <= d * 24 + 25; h += 0.25) { const v = M.tideHeight(h); lo = Math.min(lo, v); hi = Math.max(hi, v); } const m = M.moon(d * 24 + 12); day.push({ d, range: hi - lo, age: m.age, spr: M.moon(d * 24 + 12 - 36).spring }); }
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length, R = 29.530588 / 2;
  const sp = day.filter(x => { const a = (x.age - 1.5 + 2 * R) % R; return a < 2 || a > R - 2; }), np = day.filter(x => { const a = (x.age - 1.5 + 2 * R) % R; return Math.abs(a - R / 2) < 2; });
  ok(mean(sp.map(x => x.range)) > 1.4 * mean(np.map(x => x.range)), 'springs are larger than neaps (days 0..4 after new/full moon against days near the quarters)', 'spring mean ' + f2(mean(sp.map(x => x.range))) + ' m, neap mean ' + f2(mean(np.map(x => x.range))) + ' m');
  const xs = day.map(x => x.range), ys = day.map(x => x.spr), mx2 = mean(xs), my = mean(ys); const cor = xs.reduce((s, x, i) => s + (x - mx2) * (ys[i] - my), 0) / Math.sqrt(xs.reduce((s, x) => s + (x - mx2) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));
  ok(cor > 0.8, 'daily tide range follows the moon phase (springness cos(4 pi phase) lagged 1.5 d; N2, K1, O1 and the perigee term keep it below 1)', 'correlation ' + cor.toFixed(3));
  const m0 = M.moon(0), mf = M.moon(24 * 14.765); ok(m0.age < 0.01 && Math.abs(mf.phase - 0.5) < 0.01 && mf.illum > 0.99, 'moon: new at hour 0, full 14.77 d later', 'illum ' + mf.illum.toFixed(3)); }
/* surge and level on the state */
{ const s = M.macro(5, S1.tc - 1, withS(S1)); ok(near(s.surgeBaro, (1013 - s.pressure) * 0.01, 1e-9) && s.surge >= s.surgeBaro && near(s.level, s.tide.level + s.surgeGame, 1e-9), 'state: surge = barometric + wind setup, level = tide + surge', 'baro ' + s.surgeBaro.toFixed(2) + ' m, setup ' + s.surgeWind.toFixed(2) + ' m'); }
/* series and bounds */
{ let bad = 0, nan = 0, cnt = 0; const walk = (o, d) => { if (typeof o === 'number') { cnt++; if (!Number.isFinite(o)) nan++; } else if (o && typeof o === 'object' && d < 6) for (const k in o) walk(o[k], d + 1); };
  for (const sd of [1122, 2, 3, 77, 123]) for (const s of M.macroSeries(sd, 0, 168, 0.5)) walk(s, 0);
  ok(nan === 0 && cnt > 100000, 'the 7-day series (5 seeds, 337 states each) never contains NaN or infinity', cnt + ' numbers checked');
  const dump = JSON.parse(M.macroDump(1122, 0, 168, 1)), len = M.macroSeries(1122, 0, 168, 1).length; ok(dump.U.length === len && dump.swell.length === 3 && dump.arrivals.length > 0, 'compact JSON dump parses and has one column per quantity', JSON.stringify(dump).length + ' bytes');
  let stp = 0, worstSteep = 0, nst = 0, hsMax = 0, uMax = 0, pMin = 2000, pMax = 0, nTrains = [0, 0, 0, 0];
  for (let sd = 1; sd <= 200; sd++) for (let h = 0; h < 168; h += 8) { const s = M.macro(sd, h, NA); nst++;
    for (const t of s.swell.concat([s.windSea])) { worstSteep = Math.max(worstSteep, t.Hs / M.waveLength(t.T)); if (t.Hs / M.waveLength(t.T) > 1 / 7) stp++; }
    hsMax = Math.max(hsMax, s.seaHs); uMax = Math.max(uMax, s.wind.speed); pMin = Math.min(pMin, s.pressure); pMax = Math.max(pMax, s.pressure); nTrains[s.swell.length]++;
    if (!(s.seaHs >= 0 && s.seaHs <= 12 && s.wind.speed >= 0 && s.wind.speed <= 40 && s.pressure >= 940 && s.pressure <= 1040)) bad++; }
  ok(stp === 0, 'steepness (Hs / L) never above 1/7 in any train or wind sea (200 seeds, 21 hours each)', 'worst ' + worstSteep.toFixed(4) + ' (limit ' + (1 / 7).toFixed(4) + ')');
  ok(bad === 0, 'seeds 1 to 200 stay in physical bounds (Hs 0..12 m, U10 0..40 m/s, 940..1040 hPa)', nst + ' states; Hs max ' + hsMax.toFixed(1) + ', U max ' + uMax.toFixed(1) + ', p ' + pMin.toFixed(0) + '..' + pMax.toFixed(0));
  ok(nTrains[0] === 0 && nTrains[1] === 0 && nTrains[2] + nTrains[3] === nst, 'at least two crossing swell systems at all times, at most three', 'two ' + nTrains[2] + ', three ' + nTrains[3]); }

/* sea height function: JS against the JS port of the GLSL, 1000 random points and times */
const stP = M.macro(5, 120, withS(S1)), comps = M.seaComponents(stP, { windowM: 1000 }), un = M.seaUniforms(comps);
{ let r = 99, worst = 0, hmax = 0; const rnd = () => { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; return r / 4294967296; };
  for (let i = 0; i < 1000; i++) { const x = (rnd() - 0.5) * 2000, z = (rnd() - 0.5) * 2000, t = rnd() * 600, a = M.seaH(x, z, t, stP), b = M.seaHGlslPort(x, z, t, un.A, un.B), c = M.seaH(x, z, t, comps); worst = Math.max(worst, Math.abs(a - b), Math.abs(a - c)); hmax = Math.max(hmax, Math.abs(a)); }
  ok(worst < 1e-5 && hmax > 0.5, 'seaH (JS) and the JS port of the GLSL agree to 1e-5 at 1000 random points and times', 'worst ' + worst.toExponential(2) + ' m, max |h| ' + hmax.toFixed(2) + ' m'); }
{ let okc = true, info = []; for (const W of [500, 1000, 2000]) { const cs = M.seaComponents(stP, { windowM: W + 0.5 }); for (const c of cs) if (c.a > 0) { const crest = W / c.L; if (crest < 0.99 || crest > 6.01) okc = false; } info.push(W + ' m: ' + cs.filter(c => c.a > 0).map(c => (W / c.L).toFixed(1)).join('/')); }
  ok(okc, 'diorama scale shows 1 to 6 wavelengths in a 0.5, 1 and 2 km window', info.join('; '));
  const hon = stP.swell.concat([stP.windSea]).every(t => near(t.L, 1.56 * t.T * t.T, 0.01)); const mono = M.dioramaL(40, 1000) < M.dioramaL(150, 1000) && M.dioramaL(150, 1000) < M.dioramaL(600, 1000);
  ok(hon && mono, 'the state keeps honest wavelengths (L = 1.56 T^2); the diorama map is monotone so long swell stays longer than wind sea', 'exaggeration of the wind sea x' + comps[6].exag.toFixed(1) + ', of the long swell x' + comps[0].exag.toFixed(2)); }
ok(M.SEA_GLSL.includes('float msSeaH(vec2 p, float t)') && M.SEA_GLSL.includes('MS_N'), 'the GLSL snippet is exported as SEA_GLSL');

/* GLSL in a real (software) GL context */
if (!process.argv.includes('nobrowser=1')) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext()).newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setContent('<canvas id=c width=16 height=16></canvas>');
  const N = 16, W = 600, T = 7.5, grid = [];   /* a 600 m patch, 16 x 16 samples, at t = 7.5 s */
  const res = await page.evaluate(({ glsl, A, B, N, W, T, forcePack }) => {
    const c = document.getElementById('c'), gl = c.getContext('webgl', { antialias: false, preserveDrawingBuffer: true }); if (!gl) return { error: 'no webgl' };
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const run = mode => {   /* mode 'float': write the height into a float texture; mode 'pack': pack height + 8 into RGBA8 (24 bit fixed point over 0..16 m plus a 8 bit fraction) */
      const fs = 'precision highp float;\n' + glsl + 'uniform vec2 uO; uniform float uD, uT;\n' + (mode === 'float' ? 'void main(){ vec2 p = uO + (gl_FragCoord.xy - 0.5) * uD; gl_FragColor = vec4(msSeaH(p, uT), 0.0, 0.0, 1.0); }'
        : 'void main(){ vec2 p = uO + (gl_FragCoord.xy - 0.5) * uD; float h = (msSeaH(p, uT) + 8.0) / 16.0; vec4 e = fract(h * vec4(1.0, 255.0, 65025.0, 16581375.0)); e -= e.yzww * vec4(1.0/255.0, 1.0/255.0, 1.0/255.0, 0.0); gl_FragColor = e; }');
      const pr = gl.createProgram(); gl.attachShader(pr, mk(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }')); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr)); gl.useProgram(pr);
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      if (mode === 'float') { if (!gl.getExtension('OES_texture_float') || !(gl.getExtension('WEBGL_color_buffer_float') || gl.getExtension('EXT_color_buffer_float'))) return null; gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N, N, 0, gl.RGBA, gl.FLOAT, null); }
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;
      gl.viewport(0, 0, N, N); const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (let i = 0; i < 8; i++) { gl.uniform4f(gl.getUniformLocation(pr, 'uMsA[' + i + ']'), A[i * 4], A[i * 4 + 1], A[i * 4 + 2], A[i * 4 + 3]); gl.uniform2f(gl.getUniformLocation(pr, 'uMsB[' + i + ']'), B[i * 2], B[i * 2 + 1]); }
      gl.uniform2f(gl.getUniformLocation(pr, 'uO'), -W / 2, -W / 2); gl.uniform1f(gl.getUniformLocation(pr, 'uD'), W / N); gl.uniform1f(gl.getUniformLocation(pr, 'uT'), T);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (mode === 'float') { const o = new Float32Array(N * N * 4); gl.readPixels(0, 0, N, N, gl.RGBA, gl.FLOAT, o); return Array.from({ length: N * N }, (_, i) => o[i * 4]); }
      const o = new Uint8Array(N * N * 4); gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, o);
      return Array.from({ length: N * N }, (_, i) => { const r = o[i * 4] / 255, g = o[i * 4 + 1] / 255, b = o[i * 4 + 2] / 255, a = o[i * 4 + 3] / 255; return (r + g / 255 + b / 65025 + a / 16581375) * 16 - 8; });
    };
    let path = 'float', vals = null; try { vals = forcePack ? null : run('float'); } catch (e) { vals = null; } if (!vals) { path = 'rgba8-pack'; vals = run('pack'); }
    return { path, vals, renderer: (() => { const d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a'; })() };
  }, { glsl: M.SEA_GLSL, A: un.A, B: un.B, N, W, T, forcePack: process.argv.includes('pack=1') });
  await browser.close();
  if (res.error || !res.vals) ok(false, 'GLSL render in headless Chromium', res.error || 'no values');
  else {
    let worst = 0, hmax = 0; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = -W / 2 + (i) * (W / N), z = -W / 2 + (j) * (W / N), js = M.seaH(x, z, T, comps); grid.push(js); worst = Math.max(worst, Math.abs(js - res.vals[j * N + i])); hmax = Math.max(hmax, Math.abs(js)); }
    const tol = res.path === 'float' ? 2e-3 : 1e-2;   /* float32 sums of cos on a software rasteriser; the packed path is good to about 1e-4 m of quantisation, 1e-2 m is the "2 decimals" bar */
    ok(worst < tol && hmax > 0.5 && errs.length === 0, 'GLSL snippet rendered in headless Chromium (software GL, WebGL1, 16 x 16 render-to-texture) matches seaH', 'readback path ' + res.path + ', worst ' + worst.toExponential(2) + ' m of ' + hmax.toFixed(2) + ' m, tolerance ' + tol + ', renderer ' + res.renderer + (errs.length ? ', errors ' + errs.join('|') : '')); }
}
console.log('\n' + (n - fails) + ' of ' + n + ' checks passed');
process.exit(fails ? 1 : 0);
