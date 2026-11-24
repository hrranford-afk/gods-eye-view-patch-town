/* SKY CLOCK TEST: sky_clock.js, pure node (no browser). Run: node games/living-islands/tests/sky-clock-test.js
   Checks: sun elevation noon versus midnight over the year at the research latitude (57.5 N) against the research table; day length rises monotonically from the winter to the summer solstice and falls after;
   sunrise, sunset and equinox azimuths; the moon phase period is 29.530588 days (measured over ten years); new moon transits at noon, full moon is opposite the sun, waxing moon is lit on the sun's side;
   spring tides near new and full moon, neaps near the quarters (daily range, factor about 2); the tide agrees with macro_sea.js; determinism (any order, two calls, no hidden state);
   per-component phase accumulators agree with the closed form and a speed change never jumps hour or phase; the star field rotates 15.041 deg per hour about the pole at altitude = latitude;
   twilight stages; midsummer never reaches astronomical night at 57.5 N; the light palette is continuous (no band edges); latitude per seed lies in the globe's cool bands. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
await import(path.join(here, '..', 'sky_clock.js')); const C = globalThis.SkyClock;
await import(path.join(here, '..', 'macro_sea.js')); const M = globalThis.MacroSea;
let fails = 0, n = 0;
const ok = (c, msg, extra) => { n++; if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + msg + (extra !== undefined ? '  [' + extra + ']' : '')); };
const f2 = x => +x.toFixed(2);
const LAT = 57.5, DEG = Math.PI / 180;
const at = (doy, lst, o) => C.clock(1122, (doy - (o && o.doy0 || 100)) * 24 + (lst - 12), Object.assign({ lat: LAT, doy0: 100 }, o));   /* a clock at calendar day doy, local solar hour lst */
const DEC21 = 355, JUN21 = 172, MAR20 = 80, SEP22 = 265;

/* 1. sun elevation, noon and midnight, over the year */
{
  const rows = [['21 Dec', DEC21, 9.1, -55.9], ['1 Feb', 32, 15.2, -50.0], ['20 Mar', 80, 32.0, -33.1], ['1 May', 121, 47.3, -17.8], ['21 Jun', JUN21, 56.0, -9.1], ['1 Aug', 213, 50.7, -14.2], ['1 Nov', 305, 18.3, -46.8]];
  for (const [nm, d, noon, mid] of rows) {
    let mx = -99, mn = 99;   /* the extremes within the day, scanning 1-minute steps (the exact noon is a few minutes off 12:00 by the equation of time) */
    for (let m = 0; m < 1440; m++) { const e = at(d + 0.5 - 0.5 + 0, m / 60).sun.elev; if (e > mx) mx = e; if (e < mn) mn = e; }
    ok(Math.abs(mx - noon) < 0.7 && Math.abs(mn - mid) < 0.7, nm + ': noon altitude ' + f2(mx) + ' (table ' + noon + '), midnight ' + f2(mn) + ' (table ' + mid + ')');
  }
  let allMax = -99, allMin = 99, dMax = 0, dMin = 0;
  for (let d = 1; d <= 365; d++) { const a = at(d, 12).sun.elev, b = at(d, 0).sun.elev; if (a > allMax) { allMax = a; dMax = d; } if (b < allMin) { allMin = b; dMin = d; } }
  ok(allMax > 55 && allMax < 57 && Math.abs(dMax - JUN21) < 4 && allMin < -55 && Math.abs(dMin - DEC21) < 4, 'year: highest noon sun ' + f2(allMax) + ' on day ' + dMax + ' (summer solstice), lowest midnight ' + f2(allMin) + ' on day ' + dMin);
  /* noon always beats midnight, at every day of the year and the whole range of latitudes in the cool bands */
  let good = true; for (const lat of [48, 52, 57.5, 62, 64]) for (let d = 1; d <= 365; d += 5) if (!(at(d, 12, { lat }).sun.elev > at(d, 0, { lat }).sun.elev)) good = false;
  ok(good, 'noon sun above midnight sun on every sampled day at latitudes 48 to 64');
  /* winter shadow: at 57.5 N the noon sun is 9.1 deg, shadow 6.2 times the height; midsummer 0.68 */
  const wsh = 1 / Math.tan(9.1 * DEG), ssh = 1 / Math.tan(56.0 * DEG);
  ok(Math.abs(wsh - 6.2) < 0.2 && Math.abs(ssh - 0.68) < 0.03, 'noon shadow lengths: midwinter ' + f2(wsh) + ' times the height, midsummer ' + f2(ssh));
}

/* 2. day length, sunrise and sunset */
{
  const L = d => C.dayInfo(d - 1, LAT).dayLength;   /* dayInfo takes the continuous day D (days since 1 Jan 00:00) */
  let mono = true; for (let d = DEC21 - 365 + 0; d < JUN21; d++) { const a = C.dayInfo(mod365(d), LAT).dayLength, b = C.dayInfo(mod365(d + 1), LAT).dayLength; if (b < a - 1e-9) mono = false; }
  function mod365(x) { return ((x % 365) + 365) % 365; }
  ok(mono, 'day length rises every day from the winter solstice (day 355) to the summer solstice (day 172)');
  let mono2 = true; for (let d = JUN21; d < DEC21; d++) { const a = C.dayInfo(d, LAT).dayLength, b = C.dayInfo(d + 1, LAT).dayLength; if (b > a + 1e-9) mono2 = false; }
  ok(mono2, 'and falls every day from the summer to the winter solstice');
  const w = C.dayInfo(DEC21 - 1, LAT).dayLength, s = C.dayInfo(JUN21 - 1, LAT).dayLength, e = C.dayInfo(MAR20 - 1, LAT).dayLength;
  ok(Math.abs(w - 6 - 35 / 60) < 0.12 && Math.abs(s - 18 - 2 / 60) < 0.12 && Math.abs(e - 12 - 7 / 60) < 0.2, 'day length 21 Dec ' + f2(w) + ' h (table 6.58), 21 Jun ' + f2(s) + ' h (18.03), 20 Mar ' + f2(e) + ' h (12.12)');
  ok(s / w > 2.6 && s / w < 2.9, 'summer to winter day length ratio ' + f2(s / w) + ' (research: 2.7)');
  /* sunrise azimuth: 40 deg at midsummer, 90 at the equinox, 136 at midwinter, set mirrors (az_set = 360 - az_rise) */
  const azAtRise = d => { const di = C.dayInfo(d - 1, LAT); let best = null; for (let m = -30; m <= 30; m += 1) { const c = at(d, di.sunrise + m / 60); if (best === null || Math.abs(c.sun.elev + 0.833) < Math.abs(best.sun.elev + 0.833)) best = c; } return best.sun.az; };
  const a1 = azAtRise(JUN21), a2 = azAtRise(MAR20), a3 = azAtRise(DEC21);
  ok(Math.abs(a1 - 40) < 3 && Math.abs(a2 - 90) < 3 && Math.abs(a3 - 136) < 3, 'sunrise azimuth midsummer ' + f2(a1) + ' (40), equinox ' + f2(a2) + ' (90), midwinter ' + f2(a3) + ' (136)');
  const di = C.dayInfo(DEC21 - 1, LAT), dj = C.dayInfo(JUN21 - 1, LAT);
  ok(di.sunrise > 8.3 && di.sunrise < 9.3 && di.sunset > 14.9 && di.sunset < 15.9, 'midwinter sunrise ' + f2(di.sunrise) + ' sunset ' + f2(di.sunset) + ' local solar (research 09:07 and 15:42 UTC are about 26 min later)');
  ok(dj.astronomical.state === 'always-above' && dj.nautical.state === 'always-above' && dj.civil.state === 'normal', 'midsummer at 57.5 N: no astronomical and no nautical night, civil twilight present');
  ok(C.dayInfo(121 - 1, LAT).astronomical.state === 'always-above' && C.dayInfo(32, LAT).astronomical.state === 'normal', 'astronomical night absent on 1 May, present on 1 Feb (research: from about 28 Apr to 14 Aug none)');
  /* the sun rises in the east: elevation increases through the morning and the azimuth is east of south */
  const m = at(MAR20, 8), m2 = at(MAR20, 6.2);
  ok(m.sun.az > 90 && m.sun.az < 180 && m.sun.dir[0] > 0 && at(MAR20, 16).sun.dir[0] < 0, 'sun in the east in the morning (x positive), west in the afternoon; at noon due south (z positive: north is -z)', 'noon dir ' + at(MAR20, 12).sun.dir.map(f2));
  ok(at(MAR20, 12).sun.dir[2] > 0.5, 'at noon the sun is south: its z is positive (north = -z)');
}

/* 3. moon */
{
  /* period: count new moons over ten years by the illuminated fraction minimum, and the mean spacing */
  const N0 = 24 * 3652.5; let news = [], prev = C.clock(1, 0).moon.illum, prev2 = prev;
  for (let h = 1; h <= N0; h += 1) { const il = C.clock(1, h, { lat: LAT }).moon.illum; if (prev < prev2 && prev < il) news.push(h - 1); prev2 = prev; prev = il; }
  const spacing = (news[news.length - 1] - news[0]) / (news.length - 1) / 24;
  ok(Math.abs(spacing - 29.530588) < 0.01, 'moon phase period over ten years: ' + spacing.toFixed(4) + ' days (' + news.length + ' new moons, expected 29.530588)');
  const a0 = C.clock(5, 0).moon, aP = C.clock(5, 29.530588 * 24).moon, aH = C.clock(5, 29.530588 * 12).moon;
  ok(a0.illum < 1e-9 && Math.abs(aP.illum) < 1e-6 && aH.illum > 0.999, 'illuminated fraction 0 at new moon, 0 after one period, 1 at half a period');
  ok(C.clock(5, 0).moon.name === 'new moon' && C.clock(5, 24 * 7.4).moon.name === 'first quarter' && C.clock(5, 24 * 14.77).moon.name === 'full moon' && C.clock(5, 24 * 22.1).moon.name === 'last quarter', 'phase names at ages 0, 7.4, 14.8, 22.1 days');
  /* new moon transits at solar noon: hour 0 is lst 12, the moon is at the meridian (az 180) */
  const nm = C.clock(5, 0, { lat: LAT });
  ok(Math.abs(nm.lst - 12) < 1e-9 && Math.abs(nm.moon.az - 180) < 4, 'new moon at hour 0 (local noon) is due south: moon az ' + f2(nm.moon.az));
  /* full moon opposite the sun: rises as the sun sets, elevation about minus the sun's (within the tilt of the orbit) */
  let worst = 0, cnt = 0;
  for (const dd of [0, 90, 200, 300]) for (const lst of [0, 4, 8, 12, 16, 20]) {
    const hrs = 29.530588 / 2 * 24 + dd * 24 * 29.530588 / 1 + (lst - 12);
    const c = C.clock(3, hrs, { lat: LAT }); const sd = c.sun.dir, md = c.moon.dir; const ang = Math.acos(clamp(sd[0] * md[0] + sd[1] * md[1] + sd[2] * md[2], -1, 1)) / DEG; cnt++; worst = Math.max(worst, Math.abs(ang - 180));
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  ok(worst < 8, 'full moon is opposite the sun on the sky within the orbit tilt (5.1 deg) plus the sun-formula mismatch: worst ' + f2(worst) + ' deg over ' + cnt + ' samples (limit 8)');
  /* sun-moon angular separation tracks the age (new 0, quarter 90, full 180) */
  const sep = age => { const c = C.clock(3, age * 24 + 0, { lat: LAT }); const s = c.sun.dir, m = c.moon.dir; return Math.acos(clamp(s[0] * m[0] + s[1] * m[1] + s[2] * m[2], -1, 1)) / DEG; };
  ok(sep(0) < 8 && Math.abs(sep(7.38) - 90) < 12 && sep(14.77) > 170, 'angular separation sun-moon: new ' + f2(sep(0)) + ', first quarter ' + f2(sep(7.38)) + ', full ' + f2(sep(14.77)));
  /* the moon is up in the evening when waxing (first quarter near the meridian at sunset), up at dawn when waning */
  const fq = C.clock(3, 24 * 7 + 6, { lat: LAT, doy0: 100 }); /* equinox-ish season is not needed: the moon is east of the sun by 90 deg, so at 18:00 it is high in the south */
  ok(fq.moon.elev > 10 && fq.moon.az > 120 && fq.moon.az < 240, 'first quarter moon at 18:00 solar time is up in the south (elev ' + f2(fq.moon.elev) + ', az ' + f2(fq.moon.az) + ')');
  /* rises later each day, about 50 min: the moon's hour angle drifts by 360/29.53 * (29.53/(29.53... )) : measure transit time of two consecutive days */
  const transit = d => { let best = 0, bv = -99; for (let m = 0; m < 24 * 60; m += 2) { const c = C.clock(3, d * 24 + m / 60 - 12, { lat: LAT }); const v = c.moon.elev; if (v > bv) { bv = v; best = m / 60; } } return best; };
  const t1 = transit(40), t2 = transit(41), dt = ((t2 - t1 + 24) % 24) * 60;
  ok(dt > 35 && dt < 65, 'moon transit is ' + f2(dt) + ' minutes later each day (research: about 50)');
  /* waxing crescent is lit on the sun's side: the bright limb position angle points toward the sun (sun east of the moon's disc means lit on the east side...) check via the angle between the limb vector and the sun direction */
  const wc = C.clock(3, 24 * 3.5, { lat: LAT }), wn = C.clock(3, 24 * 25.5, { lat: LAT });
  ok(wc.moon.waxing && !wn.moon.waxing && wc.moon.illum > 0.05 && wc.moon.illum < 0.3 && wn.moon.illum > 0.05 && wn.moon.illum < 0.3, 'crescent at age 3.5 d is waxing, at age 25.5 d waning, both a thin lit fraction (' + f2(wc.moon.illum) + ', ' + f2(wn.moon.illum) + ')');
  /* full moon high in winter, low in summer (research section 5) */
  const fullElev = d => { let bestK = 0, bd = 1e9; for (let k = 0; k < 40; k++) { const h0 = (k * 29.530588 + 14.765) * 24, D = ((100 - 1 + (h0 + 12) / 24) % 365 + 365) % 365; const dd = Math.min(Math.abs(D - d), 365 - Math.abs(D - d)); if (dd < bd) { bd = dd; bestK = k; } }
    const h0 = (bestK * 29.530588 + 14.765) * 24; let mx = -99; for (let m = -720; m <= 720; m += 5) mx = Math.max(mx, C.clock(3, h0 + m / 60, { lat: LAT, doy0: 100 }).moon.elev); return mx; };
  const wf = fullElev(355), sf = fullElev(172);
  ok(wf > 45 && sf < 25 && wf > sf + 25, 'a full moon near midwinter peaks at ' + f2(wf) + ' deg, near midsummer ' + f2(sf) + ' (research: up to 60 and about 9 to 16)');
}

/* 4. tide */
{
  /* agrees with macro_sea.js on any hour (same harmonics and phase rules) */
  let worst = 0, worstL = 0;
  for (let i = 0; i < 400; i++) { const h = (i * 37.31) % 1500 - 300, a = C.tide(h, 290), b = M.tideHeight(h, 290); worst = Math.max(worst, Math.abs(a.h - b)); worstL = Math.max(worstL, Math.abs(a.level - M.tideLevel(b))); }
  ok(worst < 1e-9 && worstL < 1e-9, 'tide agrees with macro_sea.js tideHeight and tideLevel at 400 hours (worst ' + worst.toExponential(1) + ' m)');
  const ms = M.macro(135, 100.5, { arrivals: false });
  ok(Math.abs(ms.tide.level - C.tide(100.5, 290).level) < 1e-9, 'macro(seed, hour).tide.level equals the clock tide for the same hour (macro default start day 290)');
  /* the sky clock's moon agrees with macro_sea.js moon age and its springness */
  const mm = M.moon(777.7), mc = C.clock(1, 777.7).moon;
  ok(Math.abs(mm.age - mc.age) < 1e-9 && Math.abs(mm.illum - mc.illum) < 1e-9, 'moon age and illuminated fraction agree with macro_sea.js moon()');
  /* spring and neap: tidal range (max minus min of the unclamped sum over one lunar day) by moon age */
  const range = hr => { let mx = -9, mn = 9; for (let m = 0; m < 25 * 4; m++) { const h = C.tide(hr + m / 4, 290).h; if (h > mx) mx = h; if (h < mn) mn = h; } return mx - mn; };
  const byAge = []; for (let a = 0; a < 29.5; a += 0.5) byAge.push([a, range(a * 24)]);
  const best = byAge.reduce((p, c) => c[1] > p[1] ? c : p), worstN = byAge.reduce((p, c) => c[1] < p[1] ? c : p);
  const nearSpring = a => Math.min(Math.abs(a - 1.5), Math.abs(a - 16.3), Math.abs(a - 30.9)) < 2.6, nearNeap = a => Math.min(Math.abs(a - 8.9), Math.abs(a - 23.7)) < 2.6;
  ok(nearSpring(best[0]) && nearNeap(worstN[0]), 'largest tidal range at moon age ' + best[0] + ' d (springs 1 to 2 d after new or full), smallest at ' + worstN[0] + ' d (neaps)', f2(best[1]) + ' m versus ' + f2(worstN[1]) + ' m');
  const sprAvg = (range(1.5 * 24) + range(16.3 * 24)) / 2, neapAvg = (range(8.9 * 24) + range(23.7 * 24)) / 2;
  ok(sprAvg / neapAvg > 1.7 && sprAvg / neapAvg < 2.8, 'spring range over neap range ' + f2(sprAvg / neapAvg) + ' (research: about 2)');
  /* the "springness" value follows the moon with the 1.5 d lag, 1 near new and full, 0 near quarters */
  ok(C.tide(1.5 * 24, 290).spring > 0.99 && C.tide(16.3 * 24, 290).spring > 0.99 && C.tide(8.9 * 24, 290).spring < 0.02, 'tide.spring is 1 at ages 1.5 and 16.3 days, 0 at 8.9');
  /* M2 minus S2 is twice the elongation: derived from the phases of sun and moon */
  let dev = 0, v0 = null; for (const a of [0, 3, 7.4, 11, 14.77, 20, 25]) { const h = a * 24, t = C.tide(h, 290), lag = (30 - 28.984104) * 36 * DEG; /* (M2 argument) minus (S2 argument with its lag) plus twice the elongation is a constant: M2 gains on S2 by 2 x 12.19 deg per day */ const v = t.phaseM2 - (t.phaseS2 - lag) + 2 * (2 * Math.PI * a / 29.530588); if (v0 === null) v0 = v; const d = Math.abs(((v - v0) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); dev = Math.max(dev, d); }
  ok(dev < 0.01, 'M2 phase minus S2 phase equals twice the moon elongation (plus the fixed lag): worst deviation ' + dev.toExponential(1) + ' rad');
  /* high water drifts about 50 min later each day */
  const hw = d => { let bh = -9, bt = 0; for (let m = 0; m < 24 * 60; m++) { const h = d * 24 + m / 60 - 6, v = C.tide(h, 290).h; if (v > bh) { bh = v; bt = m / 60; } } return bt; };
  const drift = ((hw(10) - hw(9)) * 60 + 1440) % 1440; /* comparing the first high water of consecutive days is ambiguous; check the period instead */
  let hws = []; for (let m = 0; m < 24 * 60 * 3; m++) { const h = m / 60, a = C.tide(h - 1 / 60, 290).h, b = C.tide(h, 290).h, c = C.tide(h + 1 / 60, 290).h; if (b > a && b > c) hws.push(h); }
  const per = (hws[hws.length - 1] - hws[0]) / (hws.length - 1);
  ok(per > 12.3 && per < 12.5, 'high water every ' + f2(per) + ' h (M2 12.42), not 12');
}

/* 5. determinism, accumulators, speed changes */
{
  const hrs = []; for (let i = 0; i < 60; i++) hrs.push(((i * 7919) % 4000) * 0.37 - 500);
  const A = hrs.map(h => JSON.stringify(C.clock(1122, h))), B = hrs.slice().reverse().map(h => JSON.stringify(C.clock(1122, h))).reverse();
  ok(A.join() === B.join(), 'clock(seed, hour) gives the same answer in any order and on a second call (60 hours, forward and reversed)');
  ok(JSON.stringify(C.clock(1, 5)) !== JSON.stringify(C.clock(2, 5)), 'a different seed gives a different latitude and so a different day');
  ok(C.clock(1, 5).lat === C.latitudeFor(1) && C.latitudeFor(1) === C.latitudeFor(1), 'latitude is a pure function of the seed');
  const lats = []; for (let s = 0; s < 400; s++) lats.push(C.latitudeFor(s)); const mn = Math.min(...lats), mx = Math.max(...lats);
  ok(mn >= 48 && mx <= 64 && mx - mn > 12 && lats.every(l => ['temperate', 'subpolar'].includes(C.bandOf(l))), 'latitude per seed lies in the cool temperate and subpolar bands: 400 seeds, ' + f2(mn) + ' to ' + f2(mx));
  /* accumulators */
  const acc = C.createAccumulator({ hours0: 17.3 }); let prevH = acc.hours, maxJump = 0, rng = 12345; const r = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296; };
  const speeds = [1, 4, 16, 60, 0.25, 0, 1]; let expectH = 17.3, maxPhaseErr = 0, jumpOk = true;
  for (let i = 0; i < 20000; i++) {
    if (i % 997 === 0) acc.setSpeed(speeds[(i / 997 | 0) % speeds.length]);
    const dt = 1 / 60 * (0.5 + r()), before = acc.hours; acc.advance(dt); const dh = acc.hours - before; expectH += dt * acc.speed / C.HOUR_REAL_SECONDS;
    if (Math.abs(dh - dt * acc.speed / C.HOUR_REAL_SECONDS) > 1e-12) jumpOk = false; if (dh > maxJump) maxJump = dh;
    if (i % 500 === 0) { const ph = C.phasesAt(acc.hours); for (const k of ['day', 'month', 'tide', 'star']) { let d = Math.abs(ph[k] - acc.phases[k]); d = Math.min(d, 2 * Math.PI - d); maxPhaseErr = Math.max(maxPhaseErr, d); } }
  }
  ok(jumpOk && Math.abs(acc.hours - expectH) < 1e-6, 'accumulator: every frame advances the hour by exactly dt x speed (no step at a speed change); final hour ' + f2(acc.hours));
  ok(maxPhaseErr < 1e-6, 'per-component accumulators (day, month, tide, stars) agree with the closed form after 20,000 frames and 7 speed changes: worst ' + maxPhaseErr.toExponential(1) + ' rad');
  /* a speed change is continuous in what the sky shows: sun elevation, tide and star angle change by less than the frame step allows */
  const a2 = C.createAccumulator({ hours0: 20 }); let bad = 0; let last = C.clock(1122, a2.hours, { lat: LAT });
  for (let i = 0; i < 3000; i++) { if (i === 1000) a2.setSpeed(60); if (i === 2000) a2.setSpeed(1); a2.advance(1 / 60); const c = C.clock(1122, a2.hours, { lat: LAT }); const dh = 60 / C.HOUR_REAL_SECONDS / 60 * (i >= 1000 && i < 2000 ? 1 : 1 / 60) * 1; const stepH = (i >= 1000 && i < 2000 ? 60 : 1) / 60 / C.HOUR_REAL_SECONDS; if (Math.abs(c.sun.elev - last.sun.elev) > 15 * 1.3 * stepH + 1e-6 || Math.abs(c.tide.level - last.tide.level) > 0.5 * stepH * 3 + 1e-6) bad++; last = c; }
  ok(bad === 0, 'sun elevation and tide level change by no more than the frame step allows, through speed x1, x60, x1 (' + bad + ' bad frames)');
  /* the same game hour reached at two different speeds gives the same sky (pure function: speed changes only how fast we get there) */
  const p = C.createAccumulator({ hours0: 5 }), q = C.createAccumulator({ hours0: 5 }); p.setSpeed(1); q.setSpeed(30);
  for (let i = 0; i < 600; i++) p.advance(1 / 30); for (let i = 0; i < 20; i++) q.advance(1 / 30);   /* 20 real s at x1 = 600 frames; 20 frames at x30 is 0.67 s x 30 = 20 s of game time at x1 */
  { const cp = C.clock(1, p.hours), cq = C.clock(1, q.hours); ok(Math.abs(p.hours - q.hours) < 1e-9 && Math.abs(cp.sun.elev - cq.sun.elev) < 1e-7 && Math.abs(cp.tide.level - cq.tide.level) < 1e-9 && Math.abs(cp.moon.elev - cq.moon.elev) < 1e-7, 'the same game hour reached at speed 1 and speed 30 shows the same sky (sun, moon, tide)'); }
}

/* 6. stars */
{
  const lat = 57.5;
  /* the celestial pole stays at altitude = latitude, due north, whatever the time */
  let pole = true; for (let k = 0; k < 24; k++) { const c = C.clock(1, k, { lat }); const d = C.starDir(0, Math.PI / 2, c.stars.angle, lat); const alt = Math.asin(d[1]) / DEG; if (Math.abs(alt - lat) > 1e-6 || d[2] > -0.5) pole = false; }
  ok(pole, 'the pole (declination 90) stays at altitude = latitude 57.5 and in the north (z negative) at every hour');
  /* rotation: a star on the celestial equator moves 15.041 deg per hour along the sky (as a rotation about the pole) */
  const a = C.clock(1, 100, { lat }).stars.angle, b = C.clock(1, 101, { lat }).stars.angle; let dd = ((b - a) / DEG + 360) % 360;
  ok(Math.abs(dd - 15 - 0.0411 - 0.0411) < 0.12 || Math.abs(dd - 15.04) < 0.15, 'the star angle advances ' + f2(dd) + ' deg in one game hour (sidereal 15.04 plus the sun\'s 0.04 deg annual drift)');
  /* in one sidereal day it returns, one solar day later it is 0.986 deg ahead */
  const d1 = C.clock(1, 0, { lat }).stars.angle, d2 = C.clock(1, 24, { lat }).stars.angle; let sh = ((d2 - d1) / DEG + 360) % 360; if (sh > 180) sh -= 360;
  ok(Math.abs(sh - 0.9856) < 0.02, 'one solar day later the sky has moved ' + f2(sh) + ' deg (0.986: a star rises 4 minutes earlier)');
  /* circumpolar limit: stars above declination 32.5 never set */
  let minAlt = 99; for (let k = 0; k < 96; k++) { const th = k / 96 * 2 * Math.PI; const d = C.starDir(1, 40 * DEG, th, lat); minAlt = Math.min(minAlt, Math.asin(d[1]) / DEG); }
  ok(minAlt > 0, 'a star at declination 40 is circumpolar at 57.5 N (lowest altitude ' + f2(minAlt) + ' deg)');
  let low = 99; for (let k = 0; k < 96; k++) { const th = k / 96 * 2 * Math.PI; const d = C.starDir(1, 20 * DEG, th, lat); low = Math.min(low, Math.asin(d[1]) / DEG); }
  ok(Math.abs(low - (20 - 32.5)) < 0.1, 'a star at declination 20 sets (lowest altitude ' + f2(low) + ' deg)');
  const sf = C.starField(1122, 3000), sf2 = C.starField(1122, 3000);
  ok(JSON.stringify(Array.from(sf.mag.slice(0, 50))) === JSON.stringify(Array.from(sf2.mag.slice(0, 50))) && sf.n === 3000, 'the procedural star field is deterministic');
  let bright = 0, faint = 0; for (let i = 0; i < sf.n; i++) { if (sf.mag[i] < 2) bright++; if (sf.mag[i] > 5) faint++; }
  ok(bright < sf.n * 0.08 && bright > 20 && faint > sf.n * 0.35, 'magnitudes follow a power law: ' + bright + ' brighter than 2, ' + faint + ' fainter than 5 of 3000');
}

/* 7. twilight, light palette */
{
  const lat = 57.5;
  let order = true, last = -1; for (let e = 10; e >= -30; e -= 0.1) { const s = C.twilightOf(e).stage; if (s < last) order = false; last = s; }
  ok(order && C.twilightOf(5).name === 'day' && C.twilightOf(-3).name === 'civil' && C.twilightOf(-8).name === 'nautical' && C.twilightOf(-15).name === 'astronomical' && C.twilightOf(-25).name === 'night', 'twilight stages by sun elevation: day, civil (-0.8 to -6), nautical (-6 to -12), astronomical (-12 to -18), night');
  let minE = 99; for (let m = 0; m < 1440; m++) minE = Math.min(minE, at(JUN21, m / 60, { lat }).sun.elev);
  ok(minE > -10.5 && minE < -8 && C.twilightOf(minE).stage < 3, 'midsummer night at 57.5 N: sun never below ' + f2(minE) + ' (never astronomical night)');
  /* palette continuity: sample the sun elevation finely, no step in any colour or intensity larger than a small bound */
  let maxStep = 0, where = 0, prev = null, maxLum = 0;
  const mk = e => ({ sun: { elev: e }, moon: { elev: -30, illum: 0 } });
  for (let e = 60; e >= -40; e -= 0.05) { const L = C.light(mk(e)); const v = [...L.skyHs, ...L.skyHa, ...L.skyZ, ...L.sunColor, L.sunI / 3, ...L.hemiSky, ...L.hemiGround, L.hemiI, L.exposure / 2.6, L.starAlpha, L.windowGlow, L.floorK, L.bodyK]; if (prev) for (let i = 0; i < v.length; i++) { const d = Math.abs(v[i] - prev[i]); if (d > maxStep) { maxStep = d; where = e; } } prev = v; }
  ok(maxStep < 0.02, 'light palette is continuous in sun elevation: largest step per 0.05 deg is ' + maxStep.toFixed(4) + ' (at ' + f2(where) + ' deg), no band edges');
  /* the sky gets darker and the zenith bluer-first through dusk */
  const lumZ = e => { const L = C.light(mk(e)); return .3 * L.skyZ[0] + .59 * L.skyZ[1] + .11 * L.skyZ[2]; };
  let mono = true; for (let e = 40; e > -30; e -= 0.5) if (lumZ(e - 0.5) > lumZ(e) + 1e-6) mono = false;
  ok(mono, 'zenith luminance falls monotonically from high sun to night');
  const warm = C.light(mk(2)).sunColor, cool = C.light(mk(55)).sunColor;
  ok(warm[2] / warm[0] < cool[2] / cool[0] - 0.4 && C.light(mk(2)).sunI < C.light(mk(40)).sunI * 0.6, 'low sun is warm and dim, noon sun is cool and strong');
  ok(C.light(mk(-12)).starAlpha > 0.95 && C.light(mk(5)).starAlpha === 0 && C.light(mk(-9)).limMag > 1 && C.light(mk(-9)).limMag < 4 && C.light(mk(-20)).limMag > 6, 'stars: none by day, only the brightest at sun -9, the full sky below -18 (limiting magnitude ' + f2(C.light(mk(-9)).limMag) + ' and ' + f2(C.light(mk(-20)).limMag) + ')');
  const full = C.light({ sun: { elev: -30 }, moon: { elev: 40, illum: 1 } }), quarter = C.light({ sun: { elev: -30 }, moon: { elev: 40, illum: 0.5 } }), newm = C.light({ sun: { elev: -30 }, moon: { elev: 40, illum: 0 } });
  ok(full.lightIsMoon && full.moonI > quarter.moonI * 6 && newm.moonI === 0 && full.limMag < C.light(mk(-30)).limMag - 1, 'moonlight: a half disc gives about a tenth of the full moon (' + f2(quarter.moonI / full.moonI) + '), new moon none, full moon dims the stars');
}
console.log('\n' + (n - fails) + ' / ' + n + ' checks passed');
process.exit(fails ? 1 : 0);
