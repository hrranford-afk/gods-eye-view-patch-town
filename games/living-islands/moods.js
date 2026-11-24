/* Living Islands: sky moods (see MOODS_BUILD.md, research/BEAUTIFUL_WEATHER.md).
   PURE logic for the beautiful-weather set behind &moods=1 in islands_look.html: when a rainbow can appear and where its arcs sit, where the rain cells are, the strength of each mood
   (rainbow, sun shower, crepuscular rays, frost and sea smoke, clear night with a rare northern glow, post-storm clearing) as a pure function of (seed, game hour), the weather
   changes each mood asks for, a mood chooser by seed and season, a finder for the next natural occurrence and the presets behind the buttons.
   No DOM, no three.js, no Math.random, no wall clock. Needs weather.js (LI_WEATHER) and sky_clock.js (SkyClock) loaded first, as globals or through setDeps().
   UMD like sky_clock.js: window.LI_MOODS in a page, globalThis.LI_MOODS after a plain import in node.
   Angles are degrees, azimuth from north clockwise, dir = (cos el sin az, sin el, -cos el cos az) (the axes of sky_clock.js and the page).
   Tags as in the research note: VERIFIED physics, PLAUSIBLE lore, TUNING = a game number with no measurement, COMPUTED = checked by tests/moods-test.js. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.LI_MOODS = api;
  if (typeof globalThis !== 'undefined') globalThis.LI_MOODS = api;
}(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : undefined), function () {
  'use strict';
  const DEG = Math.PI / 180;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const sm = t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  const wrap180 = a => { a = ((a % 360) + 360) % 360; return a > 180 ? a - 360 : a; };
  const mod360 = a => ((a % 360) + 360) % 360;
  let DEPS = { wx: null, ck: null };
  const WX = () => DEPS.wx || globalThis.LI_WEATHER, CK = () => DEPS.ck || globalThis.SkyClock;
  function setDeps(d) { DEPS = Object.assign({ wx: null, ck: null }, d || {}); }

  const MOODS = ['rainbow', 'shower', 'rays', 'frost', 'clearing', 'night'];
  const LABELS = { rainbow: 'Rainbow', shower: 'Sun shower', rays: 'Rays', frost: 'Frost', clearing: 'Clearing', night: 'Clear night' };
  const FORCED_STATE = { rainbow: 'showers', shower: 'showers', rays: 'fair', frost: 'clear', clearing: 'fair', night: 'clear' };

  /* the knobs that decide how often a mood shows (TUNING; tests/moods-test.js prints the measured share of days) */
  const TUNE = {
    pRainbow: .85,     /* keyed draw for a rainbow day, on top of the geometry and the cell gates */
    pShower: .35,       /* keyed draw for a sun shower day */
    pRays: .2,         /* keyed draw for a day with visible shafts */
    pFrost: .4,       /* keyed draw for a frost morning inside the cold season */
    pSmoke: .18,       /* the share of frost mornings that also get sea smoke (2 to 4 in a game year) */
    pAurora: .16,      /* the share of clear dark nights with a northern glow */
    clearTau: 6,       /* game hours: the decay of the post-storm clearing */
    bowPrimary: [40.0, 42.4],     /* degrees from the antisolar point, violet inside, red outside (the note, VERIFIED 40 to 42) */
    bowSecondary: [50.3, 53.5]    /* reversed colours, fainter (VERIFIED 50 to 51, a wider band here for a readable arc) */
  };

  /* ---------- hashes ---------- */
  function hash32(a, b, c) { let h = Math.imul((a | 0) ^ 0x9E3779B9, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  const SALT = { rainbow: 11, shower: 13, rays: 17, frost: 19, smoke: 23, aurora: 29, humid: 31, cell: 37, nightcloud: 41, pick: 43 };
  const draw = (seed, day, key) => hash32(seed >>> 0, day | 0, SALT[key]);

  /* ---------- geometry (VERIFIED physics, see the note section 1) ---------- */
  const dirOf = (el, az) => [Math.cos(el * DEG) * Math.sin(az * DEG), Math.sin(el * DEG), -Math.cos(el * DEG) * Math.cos(az * DEG)];
  const azElOf = d => ({ az: mod360(Math.atan2(d[0], -d[2]) / DEG), el: Math.asin(clamp(d[1], -1, 1)) / DEG });
  /* the strength of the primary and secondary bows from the sun's elevation alone. The primary is zero from 42.4 degrees up (its top, 42.4 - elevation, is then on the horizon);
     the secondary is zero from 51 up. Both fade in over the first 3 degrees (a bow with the sun on the horizon is a half circle but the air is thick there). */
  function bowFade(sunEl) {
    const lo = sm((sunEl - .3) / 2.7);
    return { p: lo * (1 - sm((sunEl - 38) / (TUNE.bowPrimary[1] - 38))), s: lo * (1 - sm((sunEl - 45) / 6)) };
  }
  /* the top of a bow of angular radius R (degrees) over the horizon, for a sun at sunEl */
  const bowTop = (R, sunEl) => R - sunEl;
  /* points on the circle of angular radius R round the antisolar point; only those above the horizon are returned (a bow is a full circle from the air, a part of one from the ground) */
  function arcPoints(sunEl, sunAz, R, n) {
    n = n || 180; const A = dirOf(-sunEl, sunAz + 180);   /* the antisolar point, below the horizon by the sun's elevation */
    const up = Math.abs(A[1]) > .99 ? [1, 0, 0] : [0, 1, 0];
    let e1 = [A[1] * up[2] - A[2] * up[1], A[2] * up[0] - A[0] * up[2], A[0] * up[1] - A[1] * up[0]]; const l1 = Math.hypot(...e1); e1 = e1.map(v => v / l1);
    const e2 = [A[1] * e1[2] - A[2] * e1[1], A[2] * e1[0] - A[0] * e1[2], A[0] * e1[1] - A[1] * e1[0]];
    const out = [], cr = Math.cos(R * DEG), sr = Math.sin(R * DEG);
    for (let i = 0; i < n; i++) { const t = i / n * 2 * Math.PI, ct = Math.cos(t), st = Math.sin(t); const P = [0, 1, 2].map(k => cr * A[k] + sr * (ct * e1[k] + st * e2[k])); const o = azElOf(P); if (o.el >= 0) out.push(o); }
    return out;
  }
  const antiAz = sunAz => mod360(sunAz + 180);

  /* ---------- rain cells (note 2.3): a pure function of the weather schedule segment ---------- */
  const azOfVec = (x, z) => mod360(Math.atan2(x, -z) / DEG);
  /* a showers segment carries two cells; each crosses on one side of the table: it arrives from the upwind bearing, swings through 180 degrees round the side and leaves downwind */
  const CELL_P = [[-.15, .6], [.4, 1.15]];
  function cellsAt(seed, hour) {
    const w = WX(); if (!w) return []; const seg = w.segAt(seed, hour); if (!seg || seg.state !== 'showers') return [];
    const p = (hour - seg.start) / seg.dur, azUp = azOfVec(-Math.cos(seg.angle), -Math.sin(seg.angle)), out = [];
    for (let j = 0; j < 2; j++) {
      const a = CELL_P[j][0], b = CELL_P[j][1], q = (p - a) / (b - a); if (q <= 0 || q >= 1) continue;
      const sgn = hash32(seed >>> 0, seg.i, SALT.cell + j) < .5 ? -1 : 1, env = Math.pow(Math.sin(Math.PI * q), .6);
      out.push({ az: mod360(azUp + sgn * 180 * q), w: 26 + 22 * Math.sin(Math.PI * q), k: env, j, seg: seg.i });
    }
    return out;
  }

  /* ---------- the mood strengths ---------- */
  const lookAt = (seed, hours, o) => { o = o || {}; const c = CK().clock(seed, hours, { lat: o.lat === undefined ? CK().DEFAULT_LAT : o.lat, doy0: o.doy0 === undefined ? 121 : o.doy0 }); return { c, wx: WX().at(seed, hours) }; };
  const sunVis = wx => sm((wx.sunScale - .5) / .2) * (1 - sm((wx.deckOp - .45) / .3));

  function rainbowAt(seed, hours, c, wx, o) {
    const el = c.sun.elev, none = { k: 0, k2: 0, cell: null, align: 0 };
    if (el < .3 || el >= TUNE.bowPrimary[1]) return none;
    const cells = (o && o.cell) ? [o.cell] : (o && o.cells) ? o.cells : cellsAt(seed, hours); if (!cells.length) return none;
    const A = antiAz(c.sun.az); let best = null, bk = 0, balign = 0;
    for (const ce of cells) { const d = Math.abs(wrap180(ce.az - A)), align = 1 - sm((d - ce.w * .5) / (ce.w * .7 + 10)), k = align * ce.k; if (k > bk) { bk = k; best = ce; balign = align; } }
    if (!best) return none;
    const g = bowFade(el), vis = sunVis(wx), rain = sm(wx.rain / .1), dr = draw(seed, c.doy, 'rainbow') < TUNE.pRainbow ? 1 : 0;
    const k = bk * g.p * vis * rain * dr;
    return { k, k2: k * (g.p > 0 ? g.s / g.p : 0), cell: best, align: balign };
  }
  function showerAt(seed, hours, c, wx) {
    const el = c.sun.elev; if (wx.name !== 'showers' && wx.from !== 'showers' && wx.to !== 'showers') return 0;
    const dr = draw(seed, c.doy, 'shower') < TUNE.pShower ? 1 : 0;
    return sm((wx.rain - .08) / .2) * sm((el - 2) / 6) * sunVis(wx) * dr;
  }
  function raysAt(seed, hours, c, wx) {
    const el = c.sun.elev; if (el < 1 || el > 36) return 0;
    const low = sm((36 - el) / 22), humid = draw(seed, c.doy, 'humid');
    const hz = wx.haze + .09 * sm((22 - el) / 16) + .08 * humid, hazeGate = sm((hz - .07) / .1);
    const coverGate = sm((wx.cover - .12) / .2) * (1 - sm((wx.cover - .78) / .2)), clouds = Math.max(coverGate * sunVis(wx), sm((wx.haze - .25) / .1) * sm((el - 1.5) / 4) * .9);
    const dr = draw(seed, c.doy, 'rays') < TUNE.pRays ? 1 : 0;
    return low * hazeGate * clouds * dr * (1 - sm((wx.rain - .4) / .3));
  }
  /* the cold season weight by day of year (Nov to Mar full, fading out by mid May and mid September; PLAUSIBLE for a cool Atlantic coast, UNVERIFIED counts) */
  function coldSeason(doy, lat) { const d = Math.min(Math.abs(doy - 15), 365 - Math.abs(doy - 15)); return (1 - sm((d - 75) / 45)) * (lat === undefined || lat > 40 ? 1 : 0); }
  /* does the night that ends at the coming dawn qualify for frost? Also returns the hours of that dawn */
  function frostCore(seed, hours, c, o) {
    const lat = o && o.lat !== undefined ? o.lat : c.lat, sr = c.sunrise; if (sr === null || sr === undefined || c.polar && c.polar !== 'normal') return { q: 0, dawn: null, smoke: 0 };
    let dawn = hours - c.lst + sr; let day = c.doy; if (c.lst > sr + 3) { dawn += 24; day += 1; }
    const wd = WX().at(seed, dawn - .25), season = coldSeason(day, lat);
    const clearK = 1 - sm((wd.cover - .15) / .3), windK = 1 - sm((wd.windMs - 3.4) / 1.2), dry = 1 - sm(wd.rain / .05);
    const dr = draw(seed, day, 'frost') < TUNE.pFrost ? 1 : 0, sk = draw(seed, day, 'smoke') < TUNE.pSmoke && season > .9 ? 1 : 0;
    const q = season * clearK * windK * dry * dr;
    return { q, dawn, smoke: sk * q, day };
  }
  function frostAt(seed, hours, c, wx, o) {
    const f = frostCore(seed, hours, c, o); if (!(f.q > 0)) return { k: 0, smoke: 0, q: 0 };
    const tt = f.dawn - hours;   /* hours before dawn (negative after) */
    const form = sm((6.5 - tt) / 3), sinceRise = -tt, melt = tt >= 0 ? 1 : Math.min(1 - sm((sinceRise - .3) / 2.2), 1 - sm((c.sun.elev - 3) / 8));
    const k = f.q * form * melt;
    return { k, smoke: f.smoke * form * melt * (1 - .45 * sm((c.sun.elev - 6) / 8)), q: f.q };
  }
  function nightAt(seed, hours, c, wx) {
    const el = c.sun.elev, n = sm((-el - 8) / 6); if (n <= 0) return { k: 0, aurora: 0 };
    const day = c.doy, lull = draw(seed, day, 'nightcloud') < .15 ? .25 : 1;
    const nc = Math.min(1, wx.cover * lull), clearK = (1 - sm((nc - .1) / .4)) * (1 - sm(wx.rain / .05)) * (1 - sm((wx.fogD - .001) / .002)) * (1 - sm((wx.deck - .1) / .3));
    const k = n * clearK;
    /* a northern glow: rare, dark nights only (the sun must get below -12 degrees at midnight), not with a bright moon, never on a frost night (no two rare treats on one night) */
    let au = 0;
    if (k > 0 && c.midnightElev < -12 && draw(seed, day, 'aurora') < TUNE.pAurora) {
      const moon = c.moon.up ? c.moon.illum * sm((c.moon.elev + 2) / 10) : 0, f = frostCore(seed, hours, c);
      if (!(f.q > 0)) au = k * (1 - sm((moon - .35) / .3));
    }
    return { k, aurora: au };
  }
  function clearingAt(seed, hours, c, wx) {
    const w = WX(), seg = w.segAt(seed, hours), el = c.sun.elev; if (el < 1) return 0;
    if (seg.state === 'storm' || seg.state === 'rain') return 0;
    const segs = w.schedule(seed, hours + 1); let k = 0;
    for (let i = Math.min(seg.i, segs.length - 1); i >= 0; i--) {
      const s = segs[i]; if (hours - s.start > 30) break;
      if (s.state === 'storm' || s.state === 'rain') { const gap = Math.max(0, hours - s.end), wgt = s.state === 'storm' ? 1 : .55; k = wgt * Math.exp(-gap / TUNE.clearTau); break; }
    }
    const clear = (1 - sm((wx.deckOp - .2) / .3)) * (1 - sm((wx.fogD - .002) / .002)) * (1 - sm((wx.rain - .3) / .3));
    return k * clear * sm((el - 1) / 5);
  }
  /* all moods for one instant: a pure function of (seed, game hour) and the latitude and the calendar anchor of the clock */
  function moodsAt(seed, hours, o) {
    const L = lookAt(seed, hours, o), c = L.c, wx = L.wx, el = c.sun.elev, none = { k: 0, smoke: 0 }, noneN = { k: 0, aurora: 0 };
    /* cheap exits first: each mood only looks at the schedule when the sun and the date can give it (the node tests run millions of calls) */
    const day = el > .3 && el < TUNE.bowPrimary[1], cells = day && wx.name !== 'storm' ? cellsAt(seed, hours) : [];
    const rb = day && cells.length ? rainbowAt(seed, hours, c, wx, Object.assign({}, o, { cells })) : { k: 0, k2: 0, cell: null };
    const fr = (el < 14 && coldSeason(c.doy, c.lat) > 0) ? frostAt(seed, hours, c, wx, o) : none, ng = el < -8 ? nightAt(seed, hours, c, wx) : noneN;
    const k = { rainbow: rb.k, shower: day && wx.name !== 'overcast' ? showerAt(seed, hours, c, wx) : 0, rays: el > 1 && el < 36 ? raysAt(seed, hours, c, wx) : 0, frost: fr.k, clearing: el > 1 ? clearingAt(seed, hours, c, wx) : 0, night: ng.k };
    let cu = null; for (const ce of cells) if (!cu || ce.k > cu.k) cu = ce;
    let top = null, tk = .05; for (const m of MOODS) if (k[m] > tk) { tk = k[m]; top = m; }
    return { k, k2: rb.k2, cell: rb.k > .02 ? rb.cell : cu, smoke: fr.smoke, aurora: ng.aurora, top, doy: c.doy, sunEl: el, sunAz: c.sun.az, state: wx.name };
  }

  /* ---------- the weather each mood asks for: parameter targets, blended by the mood's strength (TUNING) ---------- */
  const TW = {
    rainbow:  { sunScale: 1.0, deckOp: .05, deck: .05, deckDark: .2, cover: .3, rain: .2, haze: .09, glit: 1.1, seaSun: .9, sat: 1.2, hemiScale: 1.0 },
    shower:   { sunScale: 1.0, deckOp: .06, deck: .08, deckDark: .22, cover: .35, rain: .5, haze: .1, glit: 1.3, seaSun: 1.0, sat: 1.18 },
    rays:     { sunScale: 1.0, deckOp: .08, deck: .1, deckDark: .2, cover: .55, rain: 0, haze: .2, glit: 1.3, sat: 1.14 },
    frost:    { windMs: 1.8, cirrus: .05, cover: .05, deck: 0, deckOp: 0, rain: 0, wet: 0, haze: .03, fogD: .0004, swell: .4, cap: 0, sat: 1.06, tint: [.97, .99, 1.04], hemiTint: [.94, .97, 1.07] },
    clearing: { sunScale: 1.08, cover: .3, cirrus: .1, deck: 0, deckOp: 0, rain: 0, wet: .85, swell: 1.9, cap: 1.6, windMs: 7, haze: .015, fogD: .00025, vis: 60000, sat: 1.28, con: 1.06, glit: 1.5, seaSun: 1.15 },
    night:    { cover: .04, deck: 0, deckOp: 0, rain: 0, haze: .02, fogD: .00022, windMs: 2.2, cirrus: .04, vis: 40000 }
  };
  /* blend P toward the mood targets (in place). k = { rainbow, shower, ... } strengths 0..1. A changed wind recomputes the sea state. */
  function tweakWeather(P, k) {
    let wind = false;
    for (const m of MOODS) {
      const kk = k && k[m] || 0; if (kk <= 0) continue; const T = TW[m];
      for (const key in T) { const v = T[key]; if (Array.isArray(v)) P[key] = P[key].map((x, i) => lerp(x, v[i], kk)); else { P[key] = lerp(P[key], v, kk); if (key === 'windMs') wind = true; } }
    }
    if (wind && WX()) { const s = WX().seaOf(P.windMs); P.hs = s.hs; P.tp = s.tp; P.chop = s.chop; P.beaufort = s.beaufort; }
    return P;
  }

  /* ---------- the mood chooser: a seed-keyed pick of the day's mood by season (PLAUSIBLE seasons, TUNING weights) ---------- */
  function seasonWeights(doy, lat) {
    const winter = coldSeason(doy, lat), sd = Math.cos((doy - 172) / 365 * 2 * Math.PI) * .5 + .5;   /* 1 at midsummer */
    const equi = 1 - Math.abs(Math.cos((doy - 80) / 365 * 4 * Math.PI)) * .6;   /* high near both equinoxes: showers with a low sun in the morning or evening */
    return { rainbow: .45 + .55 * equi - .2 * sd, shower: .5 + .3 * equi, rays: .55 + .3 * (1 - sd) + .15 * equi, frost: winter * 1.3, clearing: .5 + .3 * (1 - sd), night: .35 + .5 * winter };
  }
  /* the day's featured mood: a weighted draw keyed by (seed, day of year); the same answer in any call order */
  function chooseMood(seed, doy, lat) {
    const w = seasonWeights(doy, lat); let tot = 0; for (const m of MOODS) tot += w[m];
    let r = hash32(seed >>> 0, doy | 0, SALT.pick) * tot; for (const m of MOODS) { r -= w[m]; if (r < 0) return { mood: m, weights: w }; }
    return { mood: MOODS[0], weights: w };
  }

  /* ---------- finder: the next natural occurrence of a mood (the Next button) ---------- */
  function nextOccurrence(seed, mood, from, o) {
    o = o || {}; const step = o.step || .5, thr = o.thr || .3, max = o.max || 24 * 60;
    for (let h = from; h < from + max; h += step) { const m = moodsAt(seed, h, o); const v = mood === 'frost' ? m.k.frost : m.k[mood]; if (v >= thr) return h; }
    return null;
  }

  /* the next beautiful moment after the current one: step past any mood that is showing now, then take the first hour where a mood reaches 0.4 (the Next button) */
  function nextBeautiful(seed, from, o) {
    o = o || {}; const step = o.step || .5, max = o.max || 24 * 40; let h = from;
    const live = hh => { const m = moodsAt(seed, hh, o); return m.top && m.k[m.top] >= .3 ? m : null; };
    let guard = 0; while (live(h) && guard++ < 200) h += step;
    for (; h < from + max; h += step) { const m = live(h); if (m && m.k[m.top] >= .4) return { hours: h, mood: m.top }; }
    return null;
  }

  /* ---------- presets: the sky of each button (a sun elevation, a date, a state) ---------- */
  const PRESET = {
    rainbow:  { doy: 268, el: 15, pm: true },
    shower:   { doy: 140, el: 26, pm: false },
    rays:     { doy: 285, el: 9,  pm: true },
    frost:    { doy: 345, rise: .55 },
    clearing: { doy: 300, el: 19, pm: true },
    night:    { doy: 335, lst: 23.6, scan: [318, 352] }   /* the date is chosen by a scan: a thin moon up, or none (the moon age cannot be asked for: it would put the hour centuries out and the weather schedule with it) */
  };
  /* find the local solar hour at which the sun is at a given elevation (afternoon or morning) by scanning; pure and deterministic */
  function lstForElevation(seed, doy, el, pm, o) {
    const ck = CK(), lat = o && o.lat !== undefined ? o.lat : ck.DEFAULT_LAT, doy0 = o && o.doy0 !== undefined ? o.doy0 : 121;
    let best = null, bd = 1e9; for (let l = pm ? 12 : 3; l <= (pm ? 23.9 : 12); l += .02) { const h = ck.hoursFor(doy, l, null, { doy0 }), c = ck.clock(seed, h, { lat, doy0 }), d = Math.abs(c.sun.elev - el); if (d < bd) { bd = d; best = l; } }
    return best;
  }
  /* plan(mood, seed): { mood, doy, lst, hours, state, k (the strengths to show), cell (rainbow), moon age } */
  function plan(mood, seed, o) {
    const ck = CK(), P = PRESET[mood]; if (!P) return null; o = o || {};
    const lat = o.lat !== undefined ? o.lat : ck.DEFAULT_LAT, doy0 = o.doy0 !== undefined ? o.doy0 : 121; let lst;
    let doy = P.doy;
    if (P.scan) {   /* a dark night: no bright moon; a thin crescent standing above the sea earns a bonus */
      let bs = 1e9; for (let d = P.scan[0]; d <= P.scan[1]; d++) { const c1 = ck.clock(seed, ck.hoursFor(d, P.lst, null, { doy0 }), { lat, doy0 }), m = c1.moon; const sc = m.up && m.elev > 6 && m.illum < .3 ? m.illum - .5 : (m.up ? 1 + m.illum : m.illum); if (sc < bs) { bs = sc; doy = d; } }
    }
    if (P.lst !== undefined) lst = P.lst;
    else if (P.rise !== undefined) { const c0 = ck.clock(seed, ck.hoursFor(doy, 12, null, { doy0 }), { lat, doy0 }); lst = c0.sunrise + P.rise; }
    else lst = lstForElevation(seed, doy, P.el, P.pm, { lat, doy0 });
    const hours = ck.hoursFor(doy, lst, null, { doy0 }), c = ck.clock(seed, hours, { lat, doy0 });
    const k = { rainbow: 0, shower: 0, rays: 0, frost: 0, clearing: 0, night: 0 }; k[mood] = 1;
    const out = { mood, doy, lst, hours, state: FORCED_STATE[mood], k, k2: mood === 'rainbow' ? .8 : 0, cell: null, smoke: mood === 'frost' ? .75 : 0, aurora: mood === 'night' ? .85 : 0, sunEl: c.sun.elev, sunAz: c.sun.az };
    if (mood === 'rainbow') out.cell = { az: antiAz(c.sun.az) + 6, w: 44, k: 1 };           /* a wide curtain on the antisolar side */
    if (mood === 'clearing') out.cell = { az: mod360(c.sun.az + 78), w: 46, k: .85 };    /* the storm going away on the far side */
    if (mood === 'shower') out.cell = { az: mod360(c.sun.az + 24), w: 44, k: 1 };         /* a curtain to one side of the sun's line */
    return out;
  }
  /* a camera that frames a mood: azimuth to look toward, pitch in degrees, distance and field of view (the page applies it with theta = -az) */
  function view(mood, p) {
    const sunAz = p.sunAz, el = p.sunEl;
    switch (mood) {
      case 'rainbow': return { az: antiAz(sunAz) - 4, pitch: 17, fov: 60, dist: 100, phi: .12, focus: 'origin' };
      case 'shower': return { az: sunAz + 30, pitch: 9, fov: 58, dist: 115, phi: .12, focus: 'origin' };
      case 'rays': return { az: sunAz + 4, pitch: 5, fov: 54, dist: 90, phi: .12, focus: 'origin' };
      case 'frost': return { az: sunAz - 20, pitch: -7, fov: 48, dist: 56, phi: .2, focus: 'house' };
      case 'clearing': return { az: sunAz + 50, pitch: 9, fov: 56, dist: 110, phi: .13, focus: 'origin' };
      default: return { az: 18, pitch: 17, fov: 58, dist: 90, phi: .1, focus: 'house' };
    }
  }

  return { MOODS, LABELS, FORCED_STATE, TUNE, TW, PRESET, SALT, setDeps, hash32, draw, dirOf, azElOf, bowFade, bowTop, arcPoints, antiAz, cellsAt, rainbowAt, showerAt, raysAt, frostCore, frostAt, nightAt, clearingAt,
    coldSeason, moodsAt, nextBeautiful, tweakWeather, seasonWeights, chooseMood, nextOccurrence, lstForElevation, plan, view, lookAt, wrap180 };
}));
