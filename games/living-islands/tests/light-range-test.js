/* LIGHT RANGE TEST: light_range.js, pure node (no browser). Run: node games/living-islands/tests/light-range-test.js
   Checks (see LIGHTHOUSE_BUILD.md): the range table matches the research note's computed table (section 1.3 and the ladder in section 7) within 2 percent for the five rungs at visibility 20, 10, 5, 2 and 0.5 km
   (the note's own columns where it has them, an independent solver for the rest); visibleNm is monotonic with height, intensity and visibility and never beats the geographic horizon; no NaN at the extremes;
   the eight flash characters have the periods and on-fractions they say (sampled) and group counts; lightState is determinism and fades; the arrival helper (who sees the light, who lands, who is wrecked) is
   deterministic in any call order, orders the rungs (none < fire <= big lens), fog cuts landfall, an unmarked mouth wrecks some boats and a marked one fewer, a wreck makes a morning salvage event;
   the visibility table equals weather.js. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
await import(path.join(here, '..', 'light_range.js')); const L = globalThis.LightRange;
await import(path.join(here, '..', 'macro_sea.js')); const M0 = globalThis.MacroSea;
await import(path.join(here, '..', 'weather.js')); const WX0 = globalThis.LI_WEATHER;
/* the test calls the same seed and hour many times (6 rungs, 200 seeds): memoize the two slow pure functions, which changes nothing but the run time */
const memo = (fn, kf) => { const m = new Map(); return (...a) => { const k = kf(...a); if (!m.has(k)) m.set(k, fn(...a)); return m.get(k); }; };
const WX = { STATES: WX0.STATES, STATE_TABLE: WX0.STATE_TABLE, at: memo(WX0.at, (s, h) => s + ':' + h) };
const M = { macro: memo(M0.macro, (s, h, o) => s + ':' + h), arrivals: memo(M0.arrivals, (s, a, b) => s + ':' + a + ':' + b) };
let fails = 0, n = 0;
const ok = (c, msg, extra) => { n++; if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + msg + (extra !== undefined ? '  [' + extra + ']' : '')); };
const within = (a, b, pct) => Math.abs(a - b) <= Math.abs(b) * pct / 100 + 1e-9;
const f2 = x => +x.toFixed(2);

/* 1. the note's table (section 1.3): luminous range in nm, columns 0.2 0.4 1 2 4 10 18.5 40 km */
{
  const COLS = [0.2, 0.4, 1, 2, 4, 10, 18.5, 40];
  const T = { 1: [0.15, 0.24, 0.40, 0.56, 0.73, 0.93, 1.03, 1.12], 10: [0.21, 0.35, 0.64, 0.98, 1.42, 2.12, 2.59, 3.08], 50: [0.25, 0.43, 0.84, 1.34, 2.05, 3.36, 4.41, 5.74], 300: [0.30, 0.53, 1.07, 1.78, 2.87, 5.09, 7.15, 10.26],
    2000: [0.36, 0.64, 1.33, 2.28, 3.82, 7.24, 10.76, 16.82], 20000: [0.43, 0.78, 1.67, 2.93, 5.07, 10.17, 15.85, 26.74], 80000: [0.47, 0.86, 1.88, 3.34, 5.86, 12.05, 19.20, 33.49], 1000000: [0.55, 1.02, 2.26, 4.10, 7.36, 15.66, 25.68, 46.85] };
  let worst = 0, cnt = 0;
  for (const I of Object.keys(T)) T[I].forEach((v, i) => { const r = L.lumRangeNm(+I, COLS[i]); worst = Math.max(worst, Math.abs(r - v) / v * 100); cnt++; });
  ok(worst < 2, 'note table 1.3: ' + cnt + ' luminous ranges (8 intensities x 8 visibilities) within 2 percent', 'worst ' + f2(worst) + ' percent');
}

/* 2. the five rungs against the ladder in section 7 (visible range = min of the two) and an independent solver for the five visibilities */
{
  const ids = L.RUNGS.map(r => r.id);
  ok(JSON.stringify(ids) === JSON.stringify(['fire', 'post', 'small', 'big', 'relic']), 'five rungs: ' + ids.join(', '));
  const spec = { fire: [300, 25], post: [10, 8], small: [5000, 22], big: [80000, 35], relic: [100000, 20] };
  ok(L.RUNGS.every(r => r.I === spec[r.id][0] && r.h === spec[r.id][1]), 'rung intensities and heights as in the note (fire 300 cd at 25 m, post 10 at 8, small lens 5 kcd at 22, big lens 80 kcd at 35, relic 100 kcd at 20)');
  /* the note's ladder: geographic, visible at 18.5 km, 2 km, 0.4 km */
  const lad = { fire: [13.3, 7.2, 1.8, 0.53], post: [8.8, 2.6, 1.0, 0.35], small: [12.7, 12.7, 2.5, 0.69], big: [15.2, 15.2, 3.3, 0.86], relic: [12.2, 12.2, 3.4, 0.88] };
  let worst = 0;
  for (const r of L.RUNGS) {
    const g = L.horizonNm(r.h, 2), v = [18.5, 2, 0.4].map(vk => L.visibleNm(r.I, r.h, 2, vk));
    [g, ...v].forEach((x, i) => { worst = Math.max(worst, Math.abs(x - lad[r.id][i]) / lad[r.id][i] * 100); });
  }
  ok(worst < 2, 'note ladder (section 7): geographic range and visible range at 18.5, 2 and 0.4 km for all rungs within 2 percent', 'worst ' + f2(worst) + ' percent');
  /* an independent solver (fine scan, no bisection) at 20, 10, 5, 2 and 0.5 km */
  const indep = (I, visKm) => { const lnT = Math.log(0.05) / (visKm * 1000); let best = 0; for (let d = 1; d < 3e6; d *= 1.0005) { if (I * Math.exp(lnT * d) / (d * d) >= 2e-7) best = d; else if (best > 0) break; } return best / 1852; };
  const rows = [];
  let w2 = 0;
  for (const r of L.RUNGS) for (const v of [20, 10, 5, 2, 0.5]) {
    const a = L.visibleNm(r.I, r.h, 2, v), b = Math.min(2.08 * (Math.sqrt(r.h) + Math.sqrt(2)), indep(r.I, v)); w2 = Math.max(w2, Math.abs(a - b) / b * 100);
  }
  for (const r of L.RUNGS) rows.push(r.id + ' ' + [20, 10, 5, 2, 0.5].map(v => f2(L.visibleNm(r.I, r.h, 2, v))).join(' / '));
  ok(w2 < 2, 'five rungs x five visibilities (20, 10, 5, 2, 0.5 km) agree with an independent solver within 2 percent', 'worst ' + f2(w2) + ' percent; nm: ' + rows.join(' | '));
  /* the note's text numbers: dense fog 200 m still shows a strong lens at about 0.5 nm and a small fire at about 0.3 nm (section 0, item 3) */
  ok(within(L.lumRangeNm(80000, 0.2), 0.5, 10) && within(L.lumRangeNm(300, 0.2), 0.3, 10), 'dense fog (200 m): big lens ' + f2(L.lumRangeNm(80000, 0.2)) + ' nm (note about 0.5), fire ' + f2(L.lumRangeNm(300, 0.2)) + ' nm (note about 0.3)');
  /* Britannica example: a light 30.5 m high seen by an eye at 4.6 m is about 16 nm */
  ok(within(L.horizonNm(30.5, 4.6), 15.9, 2), 'geographic range example: 30.5 m light, 4.6 m eye ' + f2(L.horizonNm(30.5, 4.6)) + ' nm (note 15.9)');
  ok(within(L.horizonNm(8, 2), 8.8, 2) && within(L.horizonNm(25, 2), 13.3, 2) && within(L.horizonNm(35, 2), 15.2, 2), 'geographic range of the rungs: 8 m ' + f2(L.horizonNm(8, 2)) + ', 25 m ' + f2(L.horizonNm(25, 2)) + ', 35 m ' + f2(L.horizonNm(35, 2)) + ' nm');
}

/* 3. monotonic and bounded */
{
  let m1 = true, m2 = true, m3 = true, cap = true;
  for (const v of [0.2, 0.5, 2, 10, 40]) {
    let prev = -1; for (let I = 1; I <= 1e6; I *= 1.7) { const x = L.visibleNm(I, 25, 2, v); if (x < prev - 1e-12) m1 = false; prev = x; }
    prev = -1; for (let h = 1; h <= 60; h += 1) { const x = L.visibleNm(5000, h, 2, v); if (x < prev - 1e-12) m2 = false; prev = x; }
  }
  for (const I of [10, 300, 5000, 80000]) { let prev = -1; for (let v = 0.1; v <= 100; v *= 1.3) { const x = L.visibleNm(I, 25, 2, v); if (x < prev - 1e-12) m3 = false; prev = x; } }
  for (const r of L.RUNGS) for (const v of [0.05, 0.5, 5, 50, 100]) if (L.visibleNm(r.I, r.h, 2, v) > L.horizonNm(r.h, 2) + 1e-9) cap = false;
  ok(m1, 'range rises with intensity (5 visibilities, 1 cd to 1,000,000 cd)');
  ok(m2, 'range rises with the height of the light (1 to 60 m, 5 visibilities)');
  ok(m3, 'range rises with visibility (0.1 to 100 km, 4 intensities)');
  ok(cap, 'never above the geographic horizon, whatever the intensity or the air');
  let nan = 0; for (const I of [0, 1e-3, 1, 1e9]) for (const v of [0.05, 100, 1e4]) for (const h of [0, 1, 100]) { const x = L.visibleNm(I, h, 2, v); if (!Number.isFinite(x) || x < 0) nan++; }
  ok(nan === 0, 'no NaN, no negative range at visibility 0.05 km and 100 km, intensity 0 and 1e9, height 0');
  ok(L.visibleNm(0, 25, 2, 40) === 0 && L.lumRangeNm(0, 10) === 0, 'an unlit light (I = 0) is seen at 0 nm');
  ok(L.visibleNm(300, 25, 2, 0.4) < L.visibleNm(300, 25, 2, 40) && L.visibleNm(80000, 35, 2, 0.4) > L.visibleNm(300, 25, 2, 0.4), 'fog cuts every light; the big lens still beats the fire in fog');
}

/* 4. flash characters */
{
  ok(L.CHARACTERS.length === 8, 'eight flash characters: ' + L.CHARACTERS.map(c => c.abbr).join(', '));
  let allsum = true; for (const c of L.CHARACTERS) { const s = c.seq.reduce((a, b) => a + b, 0); if (Math.abs(s - c.period) > 1e-9 || c.seq.length % 2) allsum = false; }
  ok(allsum, 'each table is light/dark pairs that add to its period');
  const spec = { Fl5: [5, 0.1, 1], Fl2_10: [10, 0.1, 2], Fl3_15: [15, 0.1, 3], LFl10: [10, 0.2, 1], Oc8: [8, 0.75, 1], Iso4: [4, 0.5, 1], Q: [1, 0.4, 1], MoA: [12, 2 / 12, 2] };
  for (const c of L.CHARACTERS) {
    const [per, frac, nfl] = spec[c.id]; const N = 24000; let on = 0, edges = 0, last = false; const dt = per * 4 / N;
    for (let i = 0; i < N; i++) { const s = L.lightState(c.id, (i * dt) / 3600, { fade: 0 }); if (s.on) on++; if (s.on && !last) edges++; last = s.on; }
    const meas = on / N, nf = edges / 4;
    ok(Math.abs(c.period - per) < 1e-9 && Math.abs(meas - frac) < 0.01 && Math.abs(L.onFraction(c.id) - frac) < 1e-9 && Math.abs(nf - nfl) < 0.3 && L.flashesPerCycle(c.id) === nfl, c.abbr + ': period ' + per + ' s, on ' + f2(meas * 100) + ' percent (' + f2(frac * 100) + '), ' + nfl + ' flash(es) per cycle');
  }
  const a = L.lightState('Fl2_10', 0.25 / 3600), b = L.lightState('Fl2_10', 0.25 / 3600), c10 = L.lightState('Fl2_10', (0.25 + 10) / 3600);
  ok(JSON.stringify(a) === JSON.stringify(b) && Math.abs(a.level - c10.level) < 1e-9 && a.on, 'lightState is deterministic and repeats exactly one period later');
  const edge = L.lightState('Fl5', 0.01 / 3600), mid = L.lightState('Fl5', 0.25 / 3600), hard = L.lightState('Fl5', 0.01 / 3600, { fade: 0 });
  ok(edge.on && edge.level < 0.6 && mid.level === 1 && hard.level === 1, 'a 0.05 s fade at each edge (level ' + f2(edge.level) + ' at 0.01 s, 1 in the middle), 0 fade is hard on/off');
  const fx = L.lightState('F', 12.3); ok(fx.on && fx.level === 1 && L.onFraction('F') === 1, 'the fixed character is always on');
  const dc = new Set(); for (let s = 1; s <= 40; s++) dc.add(L.defaultCharacter('big', s)); ok(dc.size === 2 && [...dc].every(x => L.RUNGS[3].chars.includes(x)), 'default character per seed picks from the rung\'s own two (' + [...dc].join(', ') + ')');
}

/* 5. the weather table copy and the arrival helper */
{
  let same = true; for (const k of Object.keys(L.VIS_KM)) if (L.VIS_KM[k] * 1000 !== WX.STATE_TABLE[k].vis) same = false;
  ok(same && Object.keys(L.VIS_KM).length === WX.STATES.length, 'the visibility table equals weather.js STATE_TABLE.vis for all ' + WX.STATES.length + ' states');
  const s1 = L.arrivalSeen('big', 40, 12, { night: true }), s2 = L.arrivalSeen('big', 0.4, 12, { night: true }), s3 = L.arrivalSeen(null, 40, 12, { night: true }), s4 = L.arrivalSeen(null, 40, 12, { night: false }), s5 = L.arrivalSeen('fire', 40, 12, { night: true });
  ok(s1.seen && s1.by === 'light' && !s2.seen && !s3.seen && s4.seen && s4.by === 'silhouette' && !s5.seen, 'arrivalSeen: big lens sees 12 nm at night in clear air, not in fog; no light at night: nothing; no light by day: the silhouette; the fire is short of 12 nm (' + f2(s5.rangeNm) + ' nm)');
  const pf = L.landfallP('big', s1), pn = L.landfallP(null, s4), pz = L.landfallP(null, s3);
  ok(pf > pn && pn > 0 && pz === 0 && pf <= 0.95, 'landfall chance: ' + f2(pf) + ' for a seen light, ' + f2(pn) + ' for a daytime silhouette, 0 for nothing seen');
  ok(L.wreckP(false, true, 40, 0) >= 0.05 && L.wreckP(false, true, 40, 1) <= 0.2 && L.wreckP(false, true, 0.4, 1) <= 0.2 && L.wreckP(true, true, 40, 1) <= 0.01 && L.wreckP(false, false, 40, 1) === 0, 'wreck chance: unmarked at night 0.05 to 0.2, marked 0.01, none by day in clear air');
  const visAt = h => WX.at(1122, h).vis / 1000, windAt = h => WX.at(1122, h).windMs, tideAt = h => M.macro(1122, h, { arrivals: false }).tide.level;
  const O = r => ({ rung: r, macro: M, visKmAt: visAt, windAt, tideAt });
  const run = (seed, r, o) => L.arrivalsFor(seed, 0, 30 * 24, Object.assign({}, O(r), o || {}, { visKmAt: o && o.visKmAt ? o.visKmAt : h => WX.at(seed, h).vis / 1000, windAt: h => WX.at(seed, h).windMs, tideAt: h => M.macro(seed, h, { arrivals: false }).tide.level }));
  /* determinism: same call twice, a different call order, a second window that overlaps */
  const A = run(1122, 'big'), B = run(1122, 'big'); const C1 = L.arrivalsFor(1122, 100, 300, O('big')), C2 = L.arrivalsFor(1122, 0, 720, O('big')).events.filter(e => e.hour >= 100 && e.hour <= 300);
  ok(JSON.stringify(A) === JSON.stringify(B), 'arrivals: the same call twice gives the same events (' + A.events.length + ' boats in 30 days)');
  ok(JSON.stringify(C1.events) === JSON.stringify(C2), 'arrivals: a short window and the same hours cut from a long window give identical events and keys (' + C1.events.length + ' boats)');
  ok(new Set(A.events.map(e => e.key)).size === A.events.length && A.events.every(e => /^1122:(boat|nboat):\d+$/.test(e.key)), 'arrivals: keys are unique and keyed seed:kind:slot');
  ok(A.events.every(e => e.distNm >= 1 && e.distNm <= 20), 'arrivals: every boat draws 1 to 20 nm from its own key');
  /* orders of the rungs, over 200 seeds x 30 days */
  const tot = {}; const rungs = [null, 'post', 'fire', 'small', 'big', 'relic'];
  const seeds = []; for (let s = 1; s <= 200; s++) seeds.push(s * 7 + 11);
  for (const r of rungs) tot[r || 'none'] = { boats: 0, seen: 0, landed: 0, wrecked: 0, night: 0 };
  for (const sd of seeds) for (const r of rungs) { const o = L.arrivalsFor(sd, 0, 720, { rung: r, macro: M, visKmAt: h => WX.at(sd, h).vis / 1000, windAt: h => WX.at(sd, h).windMs, tideAt: h => M.macro(sd, h, { arrivals: false }).tide.level }); const t = tot[r || 'none']; t.boats += o.summary.boats; t.seen += o.summary.seen; t.landed += o.summary.landed; t.wrecked += o.summary.wrecked; t.night += o.summary.night; }
  const fmt = k => k + ' ' + tot[k].landed + '/' + tot[k].boats + ' landed';
  ok(tot.none.landed < tot.fire.landed && tot.fire.landed <= tot.big.landed && tot.post.landed <= tot.fire.landed && tot.fire.landed <= tot.small.landed, 'over 200 seeds x 30 days the landings rise with the rung: ' + ['none', 'post', 'fire', 'small', 'big', 'relic'].map(fmt).join(', '));
  ok(tot.relic.landed >= tot.small.landed && tot.relic.landed > tot.none.landed && tot.relic.landed >= tot.big.landed * 0.9, 'the relic beacon (20 m mast, 100 kcd) lands about as many boats as the big lens (' + tot.relic.landed + ' against ' + tot.big.landed + ', within 10 percent) and more than the small lens');
  /* the same boats under fog and under clear air, no light versus the rungs */
  const fogV = () => 0.4, clrV = () => 40; let fogL = { fire: 0, big: 0, none: 0 }, clrL = { fire: 0, big: 0, none: 0 };
  for (const sd of seeds.slice(0, 80)) for (const r of ['fire', 'big', null]) { const k = r || 'none'; const mk = v => L.arrivalsFor(sd, 0, 720, { rung: r, macro: M, visKmAt: v, windAt: h => WX.at(sd, h).windMs }); fogL[k] += mk(fogV).summary.landed; clrL[k] += mk(clrV).summary.landed; }
  ok(fogL.fire < clrL.fire && fogL.big < clrL.big && fogL.fire === 0 && fogL.big === 0, 'dense fog (0.4 km) cuts landings to nothing for every rung (min approach distance 1 nm is beyond the 0.9 nm of the best light): fire ' + clrL.fire + ' -> ' + fogL.fire + ', big lens ' + clrL.big + ' -> ' + fogL.big);
  let mist = { fire: 0, big: 0 }, clr2 = { fire: 0, big: 0 };
  for (const sd of seeds.slice(0, 80)) for (const r of ['fire', 'big']) { mist[r] += L.arrivalsFor(sd, 0, 720, { rung: r, macro: M, visKmAt: () => 2, windAt: h => WX.at(sd, h).windMs }).summary.landed; clr2[r] += L.arrivalsFor(sd, 0, 720, { rung: r, macro: M, visKmAt: () => 10, windAt: h => WX.at(sd, h).windMs }).summary.landed; }
  const cutFire = 1 - mist.fire / clr2.fire, cutBig = 1 - mist.big / clr2.big;
  ok(cutFire > cutBig && cutFire > 0, 'mist (2 km) against 10 km: the fire loses ' + f2(cutFire * 100) + ' percent of its landings, the big lens ' + f2(cutBig * 100) + ' (fog cuts the weak lights more)');
  /* the wreck stakes */
  let un = { w: 0, l: 0 }, mk = { w: 0, l: 0 }, crates = 0, firstSalv = null;
  for (const sd of seeds) { const a = L.arrivalsFor(sd, 0, 720, { rung: 'big', marked: false, macro: M, visKmAt: h => WX.at(sd, h).vis / 1000, windAt: h => WX.at(sd, h).windMs, tideAt: h => M.macro(sd, h, { arrivals: false }).tide.level }), b = L.arrivalsFor(sd, 0, 720, { rung: 'big', marked: true, macro: M, visKmAt: h => WX.at(sd, h).vis / 1000, windAt: h => WX.at(sd, h).windMs, tideAt: h => M.macro(sd, h, { arrivals: false }).tide.level });
    un.w += a.summary.wrecked; un.l += a.summary.landed; mk.w += b.summary.wrecked; mk.l += b.summary.landed;
    for (const e of a.events) if (e.salvage) { crates++; if (!firstSalv) firstSalv = e; } }
  const share = un.w / Math.max(1, un.w + un.l), shareM = mk.w / Math.max(1, mk.w + mk.l);
  ok(un.w > 0 && share < 0.2 && mk.w < un.w && shareM < share, 'unmarked mouth: ' + un.w + ' wrecks of ' + (un.w + un.l) + ' arrivals (' + f2(share * 100) + ' percent, under 20); marked: ' + mk.w + ' (' + f2(shareM * 100) + ' percent)');
  const lst = L.solarHour(firstSalv.salvage.hour);
  ok(crates === un.w && firstSalv.salvage.hour > firstSalv.hour && firstSalv.salvage.hour - firstSalv.hour <= 24 && Math.abs(lst - 7) < 0.01 && firstSalv.salvage.key === firstSalv.key + ':salvage', 'every wreck makes one salvage event at 07:00 solar of the next morning (' + f2(firstSalv.salvage.hour - firstSalv.hour) + ' h later, key ' + firstSalv.salvage.key + ')');
  ok(un.l > 0 && tot.none.boats === tot.big.boats, 'the boats are the same for every rung (' + tot.none.boats + '); only who sees the light changes');
}

console.log('\n' + (n - fails) + ' of ' + n + ' checks passed');
process.exit(fails ? 1 : 0);
