/* Living Islands: the sky clock (see SKY_CLOCK_BUILD.md, research/SKY_CLOCK.md).
   ONE game clock for sun, moon, tide, stars and light. clock(seed, gameTimeHours) is a PURE function: no state, no DOM, no Math.random, no wall clock, no dependencies.
   The same hour always gives the same answer, in any order. The browser keeps ONE accumulator for the hour (createAccumulator), so a speed change never makes anything jump.
   UMD style, like macro_sea.js: window.SkyClock in a page, globalThis.SkyClock after a plain import in node (this folder is "type":"module"), module.exports in CommonJS.
   TIME. gameTimeHours = hours since the epoch, a NEW MOON at the moment the moon crosses the meridian at local solar noon (the same epoch macro_sea.js uses, so the two tides agree).
   So local mean solar time = (gameTimeHours + 12) mod 24; hour 0 is a new-moon noon. The calendar: day of year at hour 0 is opts.doy0 (macro_sea.js uses 290, mid October).
   AXES. x = east, y = up, z = SOUTH (north is -z), azimuth from north clockwise: dir = (cos(alt) sin(az), sin(alt), -cos(alt) cos(az)), the same axes macro_sea.js and the page use.
   Tags in comments: VERIFIED / PLAUSIBLE / UNVERIFIED as in the research notes; TUNING = a game starting value; COMPUTED = checked by running it (tests/sky-clock-test.js). */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.SkyClock = api;
  if (typeof globalThis !== 'undefined') globalThis.SkyClock = api;
}(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : undefined), function () {
  'use strict';
  const TAU = 2 * Math.PI, DEG = Math.PI / 180;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const sm = t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  const smoothstep = (a, b, x) => sm((x - a) / (b - a));   /* works for a > b as well (a falling edge), like GLSL */
  const mod = (a, n) => ((a % n) + n) % n;

  /* ---------- constants ---------- */
  const SYNODIC = 29.530588;                 /* days, new moon to new moon, VERIFIED standard */
  const DAY_REAL_SECONDS = 480, HOUR_REAL_SECONDS = DAY_REAL_SECONDS / 24;   /* TUNING: 8 real minutes per game day at speed 1, the same clock as macro_sea.js (20 s per game hour) */
  const DOY0_MACRO = 290;                    /* day of year at hour 0 in macro_sea.js (TUNING) */
  const DEFAULT_LAT = 57.5;                  /* a cool Atlantic latitude, the research note's table (TUNING) */
  const OBLIQ = 23.44 * DEG;                 /* tilt of the earth's axis, VERIFIED */
  const NODAL_DAYS = 27.2122;                /* the moon's latitude cycle (draconic month), VERIFIED standard */
  const MOON_INCL = 5.145 * DEG;             /* orbit tilt to the ecliptic, VERIFIED standard */
  const SIDEREAL_DEG_PER_H = 15.0410686;     /* VERIFIED standard */

  /* ---------- latitude per seed ---------- */
  /* The globe's planet table (globe/planet.py) has latitude bands: tropical below 23, subtropical to 35, temperate 35 to 55, subpolar 55 to 65, polar above.
     A Living Islands table is a cool-sea place: the latitude is drawn per seed from 48 to 64 degrees north, the cool temperate and subpolar bands (TUNING).
     Seed 1122 (the default page) is pinned by the page to the research note's 57.5 through opts.lat when the page wants the note's tables. */
  function hash32(seed, salt) { let h = Math.imul((seed | 0) ^ 0x9E3779B9, 374761393) + Math.imul(salt | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function latitudeFor(seed) { return 48 + 16 * hash32(seed, 7); }
  function bandOf(lat) { const a = Math.abs(lat); return a < 23 ? 'tropical' : a < 35 ? 'subtropical' : a < 55 ? 'temperate' : a < 65 ? 'subpolar' : 'polar'; }

  /* ---------- SUN (NOAA / Spencer series, PLAUSIBLE, COMPUTED against the research table) ---------- */
  /* D = days since 1 Jan 00:00 local solar time, continuous (0 to 365). Spencer's g = 2 pi / 365 (N - 1 + (h - 12) / 24) = 2 pi / 365 (D - 0.5). */
  function sunSeries(D) {
    const g = TAU / 365 * (D - 0.5);
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));   /* minutes */
    return { decl, eot };
  }
  function altAz(latR, decl, H) {   /* H hour angle in radians, 0 at the meridian, west positive */
    const sinAlt = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(H);
    const alt = Math.asin(clamp(sinAlt, -1, 1));
    const az = mod(Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(latR) - Math.tan(decl) * Math.cos(latR)) + Math.PI, TAU);
    return { alt, az };
  }
  const dirOf = (alt, az) => [Math.cos(alt) * Math.sin(az), Math.sin(alt), -Math.cos(alt) * Math.cos(az)];

  /* sunrise, sunset, day length and twilight edges for one calendar day, in local mean solar hours (null where the sun never reaches that depth) */
  function dayInfo(D, lat) {
    const latR = lat * DEG, S = sunSeries(Math.floor(D) + 0.5), cosd = Math.cos(S.decl), sind = Math.sin(S.decl);
    const hit = deg => {   /* hour angle (hours) at which the sun is at elevation deg; null if it never gets up that high (always below); 'always' if it never drops below deg (always above) */
      const c = (Math.sin(deg * DEG) - Math.sin(latR) * sind) / (Math.cos(latR) * cosd);
      if (c <= -1) return 'always'; if (c >= 1) return null; return Math.acos(c) / DEG / 15;
    };
    const edges = deg => { const h = hit(deg); if (h === null || h === 'always') return { start: null, end: null, state: h === null ? 'always-below' : 'always-above' }; const off = -S.eot / 60; return { start: 12 - h + off, end: 12 + h + off, state: 'normal' }; };
    const rise = edges(-0.833), civil = edges(-6), naut = edges(-12), astro = edges(-18);
    const h0 = hit(-0.833), dayLength = h0 === null ? 0 : h0 === 'always' ? 24 : 2 * h0;
    return {
      sunrise: rise.start, sunset: rise.end, state: rise.state, dayLength, decl: S.decl / DEG, eotMin: S.eot,
      civil, nautical: naut, astronomical: astro,
      noonElev: Math.asin(clamp(Math.sin(latR) * sind + Math.cos(latR) * cosd, -1, 1)) / DEG,
      midnightElev: Math.asin(clamp(Math.sin(latR) * sind - Math.cos(latR) * cosd, -1, 1)) / DEG
    };
  }

  /* ---------- SEASON ---------- */
  function seasonOf(D, lat) {
    const N = mod(D, 365), north = lat >= 0;
    /* seasons start at the equinoxes and solstices (about days 79.6, 172, 265, 355) */
    const edges = [[79.6, 'spring'], [172, 'summer'], [265, 'autumn'], [355, 'winter']];
    let name = 'winter'; for (const e of edges) if (N >= e[0]) name = e[1];
    if (!north) name = { spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' }[name];
    const yearFrac = mod(D - 355, 365) / 365;   /* 0 at the winter solstice, 0.5 about the summer solstice */
    return { name, index: ['winter', 'spring', 'summer', 'autumn'].indexOf(name), yearFrac, midsummer: Math.exp(-Math.pow((N - 172) / 25, 2)), midwinter: Math.exp(-Math.pow(Math.min(Math.abs(N - 355), Math.abs(N - 355 + 365), Math.abs(N - 355 - 365)) / 25, 2)) };
  }

  /* ---------- TWILIGHT (VERIFIED definitions: civil -6, nautical -12, astronomical -18) ---------- */
  function twilightOf(elevDeg) {
    const stage = elevDeg > -0.833 ? 0 : elevDeg > -6 ? 1 : elevDeg > -12 ? 2 : elevDeg > -18 ? 3 : 4;
    return { stage, name: ['day', 'civil', 'nautical', 'astronomical', 'night'][stage], darkness: smoothstep(-0.833, -18, elevDeg) };
  }

  /* ---------- MOON ---------- */
  const PHASE_NAMES = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'last quarter', 'waning crescent'];
  function moonNameOf(phase) { return PHASE_NAMES[Math.floor(mod(phase * 8 + 0.5, 8))]; }
  /* ecliptic longitude and latitude to equatorial (right ascension, declination), radians */
  function eclToEq(lon, lat) {
    const sinD = Math.sin(lat) * Math.cos(OBLIQ) + Math.cos(lat) * Math.sin(OBLIQ) * Math.sin(lon);
    const ra = Math.atan2(Math.sin(lon) * Math.cos(lat) * Math.cos(OBLIQ) - Math.sin(lat) * Math.sin(OBLIQ), Math.cos(lon) * Math.cos(lat));
    return { ra, dec: Math.asin(clamp(sinD, -1, 1)) };
  }
  /* the sun's ecliptic longitude: mean motion plus the equation of the centre (1.915 deg), PLAUSIBLE, within about 0.3 deg */
  function sunLon(D) { const M = TAU * (D - 3) / 365.25; return TAU * (D - 79.6) / 365.2422 + 0.03342 * Math.sin(M) + 0.00035 * Math.sin(2 * M); }
  /* illuminated fraction 0 to 1 from the elongation (angle sun-moon-earth seen from earth, 0 at new, pi at full) */
  const illumOf = elong => (1 - Math.cos(elong)) / 2;
  function moonAge(hours) { return mod(hours / 24, SYNODIC); }

  /* ---------- TIDE (research section 6; the same five harmonics and phase rules as macro_sea.js, so the two agree; tests/sky-clock-test.js checks it) ---------- */
  /* h(t) = sum A_i cos(speed_i (t - 5.5 h) - phase_i). t = 0 is a new moon at the meridian at noon, M2 high water 5.5 h later (lunitidal interval, TUNING), S2 phase set so the strongest springs come
     36 h after new and full moon (age of the tide, TUNING). M2 turns with the MOON's hour angle (twice per lunar day) and S2 with the SUN's, so M2 minus S2 is twice the elongation of the moon:
     springs when the two peaks coincide (new and full), neaps a quarter-month later. The seasonal and lunar modulation: equinox boost 4 percent on S2 and M2 (peaks days 80 and 262), perigee boost 3 percent on M2 (27.55 d). TUNING. */
  const TIDE_T0 = 5.5, SPRING_LAG_H = 36;
  const TIDE = [['M2', 12.4206, 28.984104, 1.40, 0], ['S2', 12.0, 30.0, 0.50, (30.0 - 28.984104) * SPRING_LAG_H], ['N2', 12.6583, 28.43973, 0.28, 0], ['K1', 23.9345, 15.041069, 0.07, 0], ['O1', 25.8193, 13.943035, 0.06, 0]];
  const TIDE_HALF_RANGE = 2.2, TIDE_WINDOW = 1.1;   /* game level = clamp(h / 2.2, -1, 1) * 1.1 metres */
  function tide(hours, doy0) {
    const doy = (doy0 == null ? DOY0_MACRO : doy0) + hours / 24;
    const eq = 1 + 0.04 * Math.cos(4 * Math.PI * (doy - 80) / 365), per = 1 + 0.03 * Math.cos(TAU * hours / (27.55 * 24));
    let h = 0, hM = 0;
    for (let i = 0; i < TIDE.length; i++) { const c = TIDE[i]; let a = c[3]; if (i === 0) a *= eq * per; else if (i === 1) a *= eq; const term = a * Math.cos((c[2] * (hours - TIDE_T0) - c[4]) * DEG); h += term; if (i < 2) hM += term; }
    const level = clamp(h / TIDE_HALF_RANGE, -1, 1) * TIDE_WINDOW;
    /* d h / dt in game metres per hour, by a one-minute central difference of the same sum, so the stream is zero at slack water */
    const e = 1 / 120; let h1 = 0, h2 = 0;
    for (let i = 0; i < TIDE.length; i++) { const c = TIDE[i]; let a = c[3]; if (i === 0) a *= eq * per; else if (i === 1) a *= eq; h1 += a * Math.cos((c[2] * (hours + e - TIDE_T0) - c[4]) * DEG); h2 += a * Math.cos((c[2] * (hours - e - TIDE_T0) - c[4]) * DEG); }
    const rate = (clamp(h1 / TIDE_HALF_RANGE, -1, 1) - clamp(h2 / TIDE_HALF_RANGE, -1, 1)) * TIDE_WINDOW / (2 * e);
    /* springness: 1 when M2 and S2 peaks coincide, 0 at neaps; lagged by the age of the tide */
    const age = moonAge(hours - SPRING_LAG_H), elong = age / SYNODIC * TAU;
    const spring = (1 + Math.cos(2 * elong)) / 2;
    return { h, level, rate, spring, m2s2: hM, phaseM2: mod(28.984104 * (hours - TIDE_T0), 360) * DEG, phaseS2: mod(30 * (hours - TIDE_T0), 360) * DEG };
  }

  /* ---------- THE CLOCK ---------- */
  /* opts: lat (degrees, default latitudeFor(seed)), doy0 (day of year at hour 0, default 290) */
  function clock(seed, hours, opts) {
    opts = opts || {};
    const lat = opts.lat != null ? opts.lat : latitudeFor(seed), latR = lat * DEG, doy0 = opts.doy0 != null ? opts.doy0 : DOY0_MACRO;
    const lst = mod(hours + 12, 24);                                   /* local mean solar time, hours */
    const D = mod(doy0 - 1 + (hours + 12) / 24, 365);                  /* days since 1 Jan 00:00, continuous */
    const dayIndex = Math.floor((hours + 12) / 24), doy = Math.floor(D) + 1;
    const S = sunSeries(D), season = seasonOf(D, lat);
    const Hs = ((lst + S.eot / 60) - 12) * 15 * DEG;                   /* true solar hour angle */
    const sp = altAz(latR, S.decl, Hs), sdir = dirOf(sp.alt, sp.az);
    const sunElev = sp.alt / DEG;
    const info = dayInfo(D, lat), tw = twilightOf(sunElev);
    /* moon: mean elongation from the age (error up to about half a day, PLAUSIBLE), tilted orbit through the nodal cycle */
    const age = moonAge(hours), phase = age / SYNODIC, elong = phase * TAU;
    const lamS = sunLon(D), lamM = lamS + elong, betaM = MOON_INCL * Math.sin(TAU * (hours / 24) / NODAL_DAYS);
    const eqS = eclToEq(lamS, 0), eqM = eclToEq(lamM, betaM);
    const Hm = Hs + (eqS.ra - eqM.ra);
    const mp = altAz(latR, eqM.dec, Hm), mdir = dirOf(mp.alt, mp.az);
    const illum = illumOf(elong);
    /* position angle of the bright limb from celestial north (radians, east positive): the lit side points at the sun */
    const dra = eqS.ra - eqM.ra, limbPA = Math.atan2(Math.cos(eqS.dec) * Math.sin(dra), Math.sin(eqS.dec) * Math.cos(eqM.dec) - Math.cos(eqS.dec) * Math.sin(eqM.dec) * Math.cos(dra));
    const td = tide(hours, doy0);
    /* stars: the hour angle of the vernal equinox, mean (linear in time), so one accumulator can follow it: 15.041 deg per hour, the pole at altitude = latitude */
    const starAngle = mod(TAU * (D - 79.6) / 365.2422 + (lst - 12) * 15 * DEG, TAU);
    return {
      hours, seed: seed >>> 0, lat, band: bandOf(lat), doy0, doy, dayIndex, D, lst, season,
      sun: { elev: sunElev, az: sp.az / DEG, dir: sdir, decl: S.decl / DEG, eotMin: S.eot, hourAngle: Hs, up: sunElev > -0.833 },
      sunrise: info.sunrise, sunset: info.sunset, dayLength: info.dayLength, polar: info.state, noonElev: info.noonElev, midnightElev: info.midnightElev, day: info,
      twilight: tw,
      moon: { age, phase, illum, name: moonNameOf(phase), waxing: phase < 0.5, elong: elong / DEG, elev: mp.alt / DEG, az: mp.az / DEG, dir: mdir, up: mp.alt > -0.5 * DEG, limbPA, dec: eqM.dec / DEG, ra: eqM.ra },
      tide: td,
      stars: { angle: starAngle, lat, siderealDegPerHour: SIDEREAL_DEG_PER_H },
      phases: phasesAt(hours)
    };
  }

  /* ---------- per-component phase accumulators ---------- */
  /* Four angles that each advance at their own rate per game hour: the solar day, the lunar month (the elongation), the M2 tide and the star rotation.
     phasesAt(hours) is the closed form; the accumulator adds rate * dh each frame. They agree to rounding (tests), and changing the speed between frames never jumps any of them. */
  const RATES = { day: TAU / 24, month: TAU / (SYNODIC * 24), tide: 28.984104 * DEG, star: SIDEREAL_DEG_PER_H * DEG };
  function phasesAt(hours) { return { day: mod(RATES.day * (hours + 12), TAU), month: mod(RATES.month * hours, TAU), tide: mod(RATES.tide * (hours - TIDE_T0), TAU), star: mod(RATES.star * (hours + 12), TAU) }; }
  function createAccumulator(o) {
    o = o || {};
    const a = { hours: o.hours0 || 0, speed: o.speed == null ? 1 : o.speed, hourSeconds: o.hourSeconds || HOUR_REAL_SECONDS, frozen: false, phases: phasesAt(o.hours0 || 0), steps: 0 };
    a.advance = dt => { if (a.frozen || !(dt > 0)) return a.hours; const dh = dt * a.speed / a.hourSeconds; a.hours += dh; for (const k in RATES) a.phases[k] = mod(a.phases[k] + RATES[k] * dh, TAU); a.steps++; return a.hours; };
    a.setSpeed = s => { a.speed = s; };           /* only the rate changes: hours and phases stay where they are */
    a.set = h => { a.hours = h; a.phases = phasesAt(h); };
    return a;
  }

  /* ---------- LIGHT: the palette the page reads (pure, linear colours, no DOM) ---------- */
  /* Tables keyed by sun elevation (degrees), interpolated with a smooth curve so no band edge shows. All TUNING (look numbers, not measurements); the research table section 4 gives the lux and colour temperature they follow. */
  const KEY = (rows, e) => {   /* rows: [e, ...values] sorted by descending e; smooth-interpolated, clamped at the ends */
    if (e >= rows[0][0]) return rows[0].slice(1); const n = rows.length; if (e <= rows[n - 1][0]) return rows[n - 1].slice(1);
    for (let i = 0; i < n - 1; i++) if (e <= rows[i][0] && e >= rows[i + 1][0]) { const t = sm((rows[i][0] - e) / (rows[i][0] - rows[i + 1][0])); return rows[i].slice(1).map((v, k) => lerp(v, rows[i + 1][k + 1], t)); }
    return rows[n - 1].slice(1);
  };
  /*              e   sun side horizon      anti-sun horizon        zenith */
  const SKY_ROWS = [
    [60, .30, .42, .58, .28, .40, .56, .040, .135, .36],
    [25, .34, .45, .58, .29, .40, .55, .040, .130, .345],
    [10, .50, .49, .52, .30, .38, .52, .040, .125, .33],
    [4, .88, .52, .28, .32, .34, .46, .045, .115, .30],
    [0, 1.00, .40, .15, .38, .28, .38, .050, .10, .26],
    [-2.5, .78, .26, .14, .32, .22, .36, .040, .075, .22],
    [-5, .42, .17, .20, .18, .14, .28, .026, .050, .17],
    [-8, .17, .105, .21, .085, .09, .20, .013, .027, .095],
    [-12, .05, .06, .13, .033, .045, .105, .0055, .013, .048],
    [-18, .013, .017, .038, .011, .015, .032, .0017, .0032, .0115],
    [-40, .008, .011, .027, .008, .011, .027, .0011, .0021, .0078]];
  /*              e   r g b (direct sun colour)   intensity (DirectionalLight, the page's 2.9 at 24 degrees) */
  const SUN_ROWS = [[60, 1.0, .90, .76, 2.45], [35, 1.0, .82, .60, 2.6], [20, 1.0, .72, .46, 2.8], [8, 1.0, .60, .32, 2.3], [3, 1.0, .46, .19, 1.45], [0, 1.0, .34, .12, .65], [-1.5, 1.0, .30, .10, 0]];
  /*              e   hemi sky r g b   hemi ground r g b   intensity */
  const HEMI_ROWS = [[14, .24, .32, .50, .22, .15, .09, 1.10], [4, .30, .33, .48, .25, .16, .09, 1.0], [0, .40, .30, .38, .24, .14, .08, .75], [-4, .22, .20, .38, .12, .09, .10, .40], [-8, .10, .12, .28, .06, .05, .07, .20], [-12, .07, .10, .22, .04, .04, .06, .11], [-18, .06, .09, .20, .035, .035, .055, .07]];
  /* the clear-day sky of weather.js 'fair', so a weather state can be re-tinted by the ratio (skyH / SKY_DAY_REF) */
  const SKY_DAY_REF = { H: [.24, .35, .50], Z: [.03, .10, .30] };
  const MOON_COLOR = [.70, .80, 1.0];

  function light(c) {
    const e = c.sun.elev, me = c.moon.elev, mIllum = c.moon.illum;
    const k = KEY(SKY_ROWS, e), sun = KEY(SUN_ROWS, e), hm = KEY(HEMI_ROWS, e);
    const sunI = sun[3] * smoothstep(-1.5, 0.8, e);
    /* moon light: brightness falls fast off full (half the disc gives about a tenth, research section 5), and rises with altitude */
    const moonUp = smoothstep(-1, 4, me), moonI = 0.48 * Math.pow(mIllum, 3.3) * moonUp * (0.6 + 0.4 * Math.sin(Math.max(0, me) * DEG));
    const dark = smoothstep(-2, -14, e);                              /* 0 day, 1 deep night */
    const nightK = smoothstep(2, -6, e);                              /* lights come on: 0 by day, 1 by civil dusk end */
    /* stars: the sky goes from empty to full between sun elevation -3 and -18; the limiting magnitude (6.5 is dark country) falls with moonlight (VERIFIED: stars first at about -4, sky full at -15) */
    const limMag = 6.5 * smoothstep(-3, -18, e) - 2.4 * moonUp * Math.pow(mIllum, 1.5);
    const starAlpha = smoothstep(-2, -9, e);
    /* the lamp: sun below the horizon, or the moon, whichever is brighter */
    const lightIsMoon = moonI > sunI;
    const lightI = lightIsMoon ? moonI : sunI, lc = lightIsMoon ? MOON_COLOR : [sun[0], sun[1], sun[2]];
    /* hemisphere: sky colour and ground bounce; a little moon fill */
    const hemiI = hm[6] + moonI * 0.55;
    const mixM = clamp(moonI * 1.2 / Math.max(hemiI, 1e-4), 0, 0.8);
    const hemiSky = [lerp(hm[0], .22, mixM), lerp(hm[1], .30, mixM), lerp(hm[2], .50, mixM)];
    const hemiGround = [hm[3], hm[4], hm[5]];
    /* exposure: the eye adapts, dark scenes are lifted, but a moonless night is never bright (research section 8: shadows readable at 3 to 8 percent) */
    const exposure = 1 + dark * (1.55 - 0.7 * clamp(moonI / 0.4, 0, 1));
    const bodyK = 0.10 + 0.90 * smoothstep(-14, 4, e);                /* sea body and foam brightness, so the sea is not lit like noon at night */
    const bodyTint = e > 0 ? [1, 1, 1] : [lerp(1, .55, dark), lerp(1, .70, dark), lerp(1, 1.1, dark)];
    return {
      elev: e, sunI, sunColor: [sun[0], sun[1], sun[2]], moonI, moonColor: MOON_COLOR, moonUp, lightIsMoon, lightI, lightColor: lc,
      skyHs: [k[0], k[1], k[2]], skyHa: [k[3], k[4], k[5]], skyZ: [k[6], k[7], k[8]],
      hemiSky, hemiGround, hemiI, exposure, dark, windowGlow: nightK, fireGlow: smoothstep(10, -3, e), starAlpha, limMag: Math.max(0, limMag),
      /* the sun disc is visible above the horizon, bigger and redder when low (the horizon lift is 0.5 degrees, faked by a flat factor) */
      sunDisc: smoothstep(-1.0, 0.0, e),
      floorK: 0.045 + 0.955 * smoothstep(-13, 3, e) + 0.05 * moonI,
      bodyK, bodyTint,
      /* glitter multiplier handed to the sea shader */
      glitter: lightIsMoon ? [0.80 * moonI * 2.0, 0.92 * moonI * 2.0, 1.0 * moonI * 2.0] : [sunI / 2.9, sunI / 2.9 * (1 + 0.5 * (sun[1] / .72 - 1)), sunI / 2.9 * (1 + 0.5 * (sun[2] / .46 - 1))],   /* multiplies the sea shader's own glitter colour (2.2, 1.9, 1.55): 1 is the default page's day look */
      skyDayRef: SKY_DAY_REF
    };
  }

  /* ---------- the next time the sun is at a given elevation (for 'skip to dusk') ---------- */
  /* hours >= `from` at which the sun, going DOWN, crosses elevDeg; scans in 6-minute steps for up to 30 hours, refines by bisection; falls back to the deepest point of that stretch when the sun never gets that low */
  function nextSunDown(seed, from, elevDeg, opts) {
    const f = h => clock(seed, h, opts).sun.elev - elevDeg;
    const st = 0.1; let prev = f(from), lo = null, best = from, bestV = 1e9;
    for (let h = from + st; h <= from + 30; h += st) {
      const v = f(h); if (v + elevDeg < bestV) { bestV = v + elevDeg; best = h; }
      if (prev > 0 && v <= 0) { lo = h - st; let a = lo, b = h; for (let i = 0; i < 24; i++) { const m = (a + b) / 2; if (f(m) > 0) a = m; else b = m; } return (a + b) / 2; }
      prev = v;
    }
    return best;
  }

  /* ---------- the game hour for a given date, local time and moon age (for shots, tests and the lab) ---------- */
  /* base hour from the calendar (the year is 365 days exactly, so adding whole years keeps the date and the sun), then the whole number of years that brings the moon closest to the wanted age (the moon repeats every 29.53 days, the year does not) */
  function hoursFor(doy, lst, moonAgeDays, opts) {
    opts = opts || {}; const doy0 = opts.doy0 != null ? opts.doy0 : DOY0_MACRO, base = (doy - doy0) * 24 + lst - 12;
    if (moonAgeDays == null) return base;
    let best = base, be = 1e9; for (let n = 0; n < 700; n++) { const h = base + n * 365 * 24, a = moonAge(h), e = Math.abs(((a - moonAgeDays) % SYNODIC + 1.5 * SYNODIC) % SYNODIC - SYNODIC / 2); if (e < be) { be = e; best = h; } }
    return best;
  }

  /* ---------- procedural star field (positions only, deterministic) ---------- */
  /* n stars with right ascension, declination (uniform on the sphere), magnitude from a power law (the count brighter than m goes as 10^(0.6 m), so magnitude = 6.5 + log10(u) / 0.6 over the catalogue) and a B-V colour. PLAUSIBLE, not a catalogue. */
  function starField(seed, n) {
    const ra = new Float32Array(n), dec = new Float32Array(n), mag = new Float32Array(n), col = new Float32Array(n * 3);
    let s = (seed ^ 0x51ED270B) >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    /* the Milky Way: 30 percent of the stars lie within a few degrees of the galactic plane (north galactic pole at RA 192.86, Dec 27.13 degrees, VERIFIED standard) and are faint */
    const gp = [Math.cos(27.13 * DEG) * Math.cos(192.86 * DEG), Math.cos(27.13 * DEG) * Math.sin(192.86 * DEG), Math.sin(27.13 * DEG)];
    const e1 = (() => { const t = [0, 0, 1], d = t[0] * gp[0] + t[1] * gp[1] + t[2] * gp[2], v = [t[0] - d * gp[0], t[1] - d * gp[1], t[2] - d * gp[2]], l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();
    const e2 = [gp[1] * e1[2] - gp[2] * e1[1], gp[2] * e1[0] - gp[0] * e1[2], gp[0] * e1[1] - gp[1] * e1[0]];
    for (let i = 0; i < n; i++) {
      ra[i] = rnd() * TAU; dec[i] = Math.asin(rnd() * 2 - 1);
      if (i >= n * 0.02 && rnd() < 0.30) {
        const l = rnd() * TAU, b = (rnd() + rnd() + rnd() - 1.5) * 0.20 * (0.6 + 0.8 * Math.pow(0.5 + 0.5 * Math.cos(l), 1.5)), cb = Math.cos(b), sb = Math.sin(b);
        const v = [cb * (Math.cos(l) * e1[0] + Math.sin(l) * e2[0]) + sb * gp[0], cb * (Math.cos(l) * e1[1] + Math.sin(l) * e2[1]) + sb * gp[1], cb * (Math.cos(l) * e1[2] + Math.sin(l) * e2[2]) + sb * gp[2]];
        ra[i] = mod(Math.atan2(v[1], v[0]), TAU); dec[i] = Math.asin(clamp(v[2], -1, 1));
      }
      mag[i] = clamp(7.0 + Math.log10(Math.max(rnd(), 1e-6)) / 0.5, -1.0, 6.5);   /* slope 0.5 instead of 0.6: a few more mid-bright stars so the sky reads (TUNING) */
      if (i < n * 0.02) mag[i] = 2.4 * Math.pow(rnd(), 1.4) - 0.2;   /* TUNING: a few dozen bright stars so the sky has landmarks (the pure power law gives almost none in 3000) */
      const bv = clamp(0.62 + 0.55 * (rnd() + rnd() + rnd() - 1.5) * 1.1, -0.2, 1.7);   /* mostly white-yellow, few blue and orange */
      const t = clamp((bv + 0.2) / 1.9, 0, 1);
      /* subtle: mix of white with blue (low B-V) or orange (high B-V), never saturated */
      const r = lerp(.78, 1.0, smoothstep(.35, 1, t)), g = lerp(.86, .86, t) - 0.18 * smoothstep(.55, 1, t), b = lerp(1.0, .62, smoothstep(.3, .95, t));
      col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
    }
    return { n, ra, dec, mag, col };
  }
  /* horizon direction of a star at hour angle of the equinox theta (the same maths the page's vertex shader runs) */
  function starDir(ra, dec, theta, lat) {
    const H = theta - ra, sl = Math.sin(lat * DEG), cl = Math.cos(lat * DEG);
    const up = sl * Math.sin(dec) + cl * Math.cos(dec) * Math.cos(H);
    const north = cl * Math.sin(dec) - sl * Math.cos(dec) * Math.cos(H);
    const east = -Math.cos(dec) * Math.sin(H);
    return [east, up, -north];
  }

  return {
    TAU, DEG, SYNODIC, DAY_REAL_SECONDS, HOUR_REAL_SECONDS, DOY0_MACRO, DEFAULT_LAT, SIDEREAL_DEG_PER_H, TIDE, TIDE_HALF_RANGE, TIDE_WINDOW, TIDE_T0, SPRING_LAG_H, PHASE_NAMES, RATES, MOON_COLOR, SKY_DAY_REF,
    clock, tide, light, hoursFor, latitudeFor, bandOf, sunSeries, altAz, dayInfo, seasonOf, twilightOf, moonAge, moonNameOf, illumOf, eclToEq, sunLon, phasesAt, createAccumulator, nextSunDown, starField, starDir, smoothstep, KEY, SKY_ROWS
  };
}));
