/* Living Islands: macro sea (see MACRO_SEA.md, research/SEA_STATE_AND_OUTER_WORLD.md).
   The table is a WINDOW (0.5 to 2 km) onto a much bigger ocean. Everything that arrives (storms, swell, tide, drift, flotsam) is a PURE function of (seed, game hour):
   macro(seed, hour) keeps no state, may be called for any hour in any order and always gives the same answer. No Math.random, no clocks, no DOM, no dependencies.
   UMD style: require() in a CommonJS context, window.MacroSea in a page, globalThis.MacroSea after a plain import in node (this folder is "type":"module").
   Units: kilometres for storm geometry, metres for waves, hours for time, hPa for pressure. Directions: dirFrom is degrees clockwise from north, the direction the wind or swell comes FROM.
   World axes for the sea height function and the XZ fields: x = east, z = SOUTH (north is -z, the three.js habit). wind.u is east, wind.v is north.
   Tags in comments: VERIFIED / PLAUSIBLE / UNVERIFIED as in the research notes; TUNING = a game starting value, not a measurement. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.MacroSea = api;
  if (typeof globalThis !== 'undefined') globalThis.MacroSea = api;
}(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : undefined), function () {
  'use strict';
  const G = 9.81, TAU = 2 * Math.PI, DEG = Math.PI / 180;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const sm = t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };

  /* ---------- the game clock (SKY_CLOCK.md section 10: 8 real minutes per game day) ---------- */
  const DAY_REAL_SECONDS = 480;                        /* TUNING: real seconds per game day */
  const HOUR_REAL_SECONDS = DAY_REAL_SECONDS / 24;     /* 20 s per game hour, the same as weather.js hourSec */
  const gameHourFromReal = (seconds, startHour) => (startHour || 0) + seconds / HOUR_REAL_SECONDS;
  const DOY0 = 290;                                    /* TUNING: day of year at game hour 0 (mid October, storm season); opts.doy0 overrides */
  const SYNODIC = 29.530588;                           /* days, new moon at game hour 0 (SKY_CLOCK.md epoch), VERIFIED standard */

  /* ---------- seeded randomness (mulberry32 and an integer hash; no Math.random anywhere) ---------- */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function mix(a, b, c) { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return h >>> 0; }
  const H01 = (a, b, c) => mix(a, b, c) / 4294967296;
  /* smooth 1-D value noise, 0..1, lattice spacing 1 in x */
  function vnoise(seed, salt, x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return H01(seed, salt, i) * (1 - u) + H01(seed, salt, i + 1) * u; }

  /* ---------- wave relations, deep water (VERIFIED textbook; research note section 2.1) ---------- */
  const waveLength = T => G * T * T / TAU;                 /* L = g T^2 / 2 pi = 1.56 T^2 */
  const phaseSpeed = T => G * T / TAU;                     /* c = 1.56 T */
  const groupSpeed = T => G * T / (2 * TAU);               /* cg = c / 2 = 0.78 T */
  const swellArrivalHours = (Dkm, T) => TAU * 2 * Dkm * 1000 / (G * T) / 3600;   /* t = D / cg = 4 pi D / (g T), VERIFIED (Munk 1963) */
  const swellPeriodAt = (Dkm, tHours) => 4 * Math.PI * Dkm * 1000 / (G * tHours * 3600);   /* T(t) = 4 pi D / (g t) at a fixed point after the source stops */
  const pmHs = U => 0.21 * U * U / G;                      /* Pierson-Moskowitz fully developed, Hs = 0.21 U^2 / g, PLAUSIBLE */
  const monahan = U => Math.min(0.25, 3.84e-6 * Math.pow(Math.max(0, U), 3.41));   /* Monahan and O'Muircheartaigh 1980 (VERIFIED), capped at 25 percent for the game (TUNING) */
  const barometricSurge = p => (1013 - p) * 0.01;          /* 1 cm per hPa (inverse barometer), metres; 960 hPa gives 0.53 m */
  const BEAUFORT = [.5, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];   /* lower m/s of force 1..12, same table as weather.js */
  const beaufort = ms => { let f = 0; for (let i = 0; i < BEAUFORT.length; i++) if (ms >= BEAUFORT[i]) f = i + 1; return f; };
  const STEEP_MAX = 1 / 7;                                 /* deep-water breaking limit H/L = 0.142, VERIFIED textbook */
  const dirFromVec = (u, v) => ((Math.atan2(-u, -v) / DEG) + 360) % 360;   /* the vector is where the wind blows TO; the result is where it comes FROM */
  const toVec = (dirFromDeg, speed) => [-speed * Math.sin(dirFromDeg * DEG), -speed * Math.cos(dirFromDeg * DEG)];   /* [east, north] pointing where it blows to */

  /* ---------- tide: five harmonics (SKY_CLOCK.md section 6) ---------- */
  /* name, period h, speed deg/h, amplitude m (TUNING, Hebrides-like typical, not station data), phase deg.
     Phases: hour 0 is a new moon; high water of M2 and S2 is 5.5 h after the transit (lunitidal interval, TUNING); S2 is shifted 36.6 deg so the strongest springs come 36 h
     (1.5 d, "age of the tide", TUNING) after new and full moon; N2, K1, O1 start at zero (TUNING). */
  const TIDE_T0 = 5.5, SPRING_LAG_H = 36;
  const TIDE = [['M2', 12.4206, 28.984104, 1.40, 0], ['S2', 12.0, 30.0, 0.50, (30.0 - 28.984104) * SPRING_LAG_H], ['N2', 12.6583, 28.43973, 0.28, 0], ['K1', 23.9345, 15.041069, 0.07, 0], ['O1', 25.8193, 13.943035, 0.06, 0]];
  const TIDE_HALF_RANGE = 2.2, TIDE_WINDOW = 1.1;          /* the page maps the real sum to +-1.1 m: level = clamp(h / 2.2, -1, 1) * 1.1 */
  function tideHeight(hour, doy0) {
    const doy = (doy0 == null ? DOY0 : doy0) + hour / 24, eq = 1 + 0.04 * Math.cos(4 * Math.PI * (doy - 80) / 365), per = 1 + 0.03 * Math.cos(TAU * hour / (27.55 * 24));   /* equinox and perigee boosts, TUNING */
    let h = 0;
    for (let i = 0; i < TIDE.length; i++) { const c = TIDE[i]; let a = c[3]; if (i === 0) a *= eq * per; else if (i === 1) a *= eq; h += a * Math.cos((c[2] * (hour - TIDE_T0) - c[4]) * DEG); }
    return h;
  }
  const tideLevel = h => clamp(h / TIDE_HALF_RANGE, -1, 1) * TIDE_WINDOW;
  function moon(hour) {
    let age = (hour / 24) % SYNODIC; if (age < 0) age += SYNODIC;
    const phase = age / SYNODIC, illum = (1 - Math.cos(TAU * phase)) / 2;
    /* springs near new (phase 0) and full (0.5) moon: springness 1, neaps near the quarters: 0 (the actual tide lags this by 1.5 d) */
    return { age, phase, illum, spring: (1 + Math.cos(4 * Math.PI * phase)) / 2 };
  }

  /* ---------- storms: Holland-style vortices on west to east tracks ---------- */
  /* A storm is {id, tc (hour of closest approach to the window), c (translation m/s), heading (rad, 0 = due east, positive turns north), off (km, signed, positive = passes NORTH of the window),
     dp (peak pressure deficit hPa), Rm (radius of maximum wind km), B (Holland shape), xpk (km west of closest approach where it is deepest), tau (h, width of the deepening)}. */
  const STORM_SLOT_H = 48;
  const seasonW = doy => 0.5 + 0.5 * Math.cos(TAU * (doy - 15) / 365);   /* 1 at mid January, 0 at mid July */
  function finishStorm(s) {
    s.c = s.c == null ? 15 : s.c; s.heading = s.heading || 0; s.off = s.off == null ? 300 : s.off; s.dp = s.dp == null ? 30 : s.dp; s.Rm = s.Rm || 250; s.B = s.B || 1; s.xpk = s.xpk == null ? 600 : s.xpk; s.tau = s.tau || 40;
    s.kmh = s.c * 3.6; s.tpk = s.tc - s.xpk / s.kmh; s.vmax0 = 0.8 * Math.sqrt(s.B * s.dp * 100 / (Math.E * 1.15));   /* gradient wind from the pressure deficit times 0.8 for extratropical lows, TUNING */
    s.sw = -(0.8 * s.Rm + 1.4 * Math.max(0, s.off)); s.sc = 0.3 * s.Rm + 0.6 * Math.max(0, s.off);   /* along-track position (km, from closest approach) at which the warm and cold front reach the window, TUNING geometry */
    return s;
  }
  const STORM_CACHE = new Map();
  function stormParams(seed, k, doy0) {
    const ck = seed + ':' + k + ':' + doy0, hit = STORM_CACHE.get(ck); if (hit !== undefined) return hit;
    const rng = mulberry32(mix(seed, k, 0x5702)), ex = rng(), r = []; for (let i = 0; i < 12; i++) r.push(rng());
    const w = seasonW(doy0 + (STORM_SLOT_H * k + 24) / 24);
    let out = null;
    if (ex < 0.30 + 0.35 * w) {   /* mean gap about 6.7 d in midsummer and 3.1 d in midwinter (TUNING; the spec asks 3 to 7 days) */
      out = finishStorm({ id: seed + ':storm:' + k, k, tc: STORM_SLOT_H * k + 6 + 36 * r[0], c: 10 + 15 * Math.pow(r[1], 1.2), heading: (r[2] - 0.5) * 40 * DEG, off: (r[3] < 0.65 ? 1 : -1) * (100 + 700 * r[4]),
        dp: 8 + 47 * Math.pow(r[5], 3) * (0.45 + 0.55 * w), Rm: 150 + 250 * r[6], B: 0.8 + 0.4 * r[7], xpk: 200 + 1300 * r[8], tau: 30 + 20 * r[9] });
    }
    if (STORM_CACHE.size > 5000) STORM_CACHE.clear();
    STORM_CACHE.set(ck, out); return out;
  }
  /* storms that can matter at hour t: tc in [t - back, t + fwd] (swell sources need a long look back) */
  function stormsAround(seed, t, doy0, back, fwd, opts) {
    if (opts && opts.storms) return opts.storms.map(s => s.kmh ? s : finishStorm(Object.assign({ id: seed + ':storm:x' }, s)));
    const out = [], k0 = Math.floor((t - back) / STORM_SLOT_H), k1 = Math.floor((t + fwd) / STORM_SLOT_H);
    for (let k = k0; k <= k1; k++) { const s = stormParams(seed, k, doy0); if (s) out.push(s); }
    return out;
  }
  const stormEnv = (s, t) => { const x = (t - s.tpk) / s.tau; return Math.exp(-x * x); };
  /* position of the centre in km (x east, y north) */
  function stormCentre(s, t) { const along = s.kmh * (t - s.tc), ch = Math.cos(s.heading), sh = Math.sin(s.heading); return [-sh * s.off + ch * along, ch * s.off + sh * along, along]; }
  /* what one storm does at the window at hour t: wind vector (m/s, blowing to), pressure deficit, rain 0..1, front phase */
  function stormAtWindow(s, t) {
    const c = stormCentre(s, t), cx = c[0], cy = c[1], along = c[2], r = Math.hypot(cx, cy) + 1, env = stormEnv(s, t), dpt = s.dp * env;
    const A = Math.pow(s.Rm / r, s.B), vmax = s.vmax0 * Math.sqrt(env), taper = Math.exp(-Math.pow(r / (4 * s.Rm), 2));
    let V = vmax * Math.sqrt(A * Math.exp(1 - A)) * taper;   /* Holland: V = Vmax sqrt((Rm/r)^B exp(1 - (Rm/r)^B)), tapered because the real field has Coriolis and dies away (TUNING) */
    const qx = -cx / r, qy = -cy / r, al = 20 * DEG;          /* window seen from the centre; anticlockwise rotation with 20 degrees of inflow */
    let ux = V * (-qy * Math.cos(al) - qx * Math.sin(al)), uy = V * (qx * Math.cos(al) - qy * Math.sin(al));
    const tf = taper * (vmax > 0 ? V / vmax : 0) * 0.25 * s.c;   /* translation adds on the right of the track */
    ux += tf * Math.cos(s.heading); uy += tf * Math.sin(s.heading);
    const deficit = dpt * (1 - Math.exp(-A)) * Math.exp(-Math.pow(r / 2500, 2));
    let rain = 0, phase = 'none';
    if (s.off > 0) {
      /* low passes NORTH (CLOUD_ATLAS.md front sequence, WEATHER_AND_SKY.md): wind backs to the south-east ahead of the warm front (rain), veers at the warm front, steady
         south-westerly warm sector, cold front (rain burst, veer to north-west, squall), then showers in cold air. Angles and widths are TUNING. */
      const pre = sm((along - (s.sw - 800)) / 500) * (1 - sm((along - s.sw) / 60));
      const dl = -14 * pre + 10 * sm((along - s.sw) / 60) + 22 * sm((along - s.sc) / 60);   /* degrees of extra veer (clockwise positive) */
      const ca = Math.cos(dl * DEG), sa = Math.sin(dl * DEG), x2 = ux * ca + uy * sa, y2 = -ux * sa + uy * ca; ux = x2; uy = y2;
      const sq = 1 + 0.18 * Math.exp(-Math.pow((along - s.sc) / 80, 2)); ux *= sq; uy *= sq;
      const wsect = sm((along - s.sw) / 60) * (1 - sm((along - s.sc) / 60));
      rain = 0.65 * sm((along - (s.sw - 400)) / 300) * (1 - sm((along - s.sw) / 150)) + 0.25 * wsect + 1.0 * Math.exp(-Math.pow((along - s.sc) / 90, 2)) + 0.35 * sm((along - s.sc) / 100) * (1 - sm((along - (s.sc + 700)) / 250));
      phase = along < s.sw ? 'pre-warm-front' : along < s.sc ? 'warm-sector' : along < s.sc + 700 ? 'post-cold-front' : 'clearing';
      if (along < s.sw - 800) phase = 'distant';
    } else {
      rain = 0.7 * Math.exp(-Math.pow(along / (1.2 * s.Rm), 2)) + 0.3 * sm((along + 100) / 200) * (1 - sm((along - 900) / 300));   /* low passes SOUTH: one band round the centre, cold, no warm sector */
      phase = along < -2 * s.Rm ? 'distant' : along < 0 ? 'approach' : along < 900 ? 'cold-sector' : 'clearing';
    }
    rain *= clamp(dpt / 20, 0.2, 1.2) * Math.exp(-Math.pow(s.off / 900, 2));
    return { ux, uy, deficit, rain: clamp(rain, 0, 1), phase, r, dpt, vmax };
  }

  /* ---------- background (no storm): slow seeded pressure and wind ---------- */
  function background(seed, t, doy0) {
    const w = seasonW(doy0 + t / 24), pb = (vnoise(seed, 11, t / 60) - 0.5) * 26 + (vnoise(seed, 12, t / 17) - 0.5) * 8;   /* +-17 hPa, anticyclone to trough, TUNING */
    const sp = clamp(4.5 - 0.2 * pb + (vnoise(seed, 13, t / 9) - 0.5) * 2.5, 0.8, 11) * (0.8 + 0.4 * w), from = 270 + (vnoise(seed, 14, t / 40) - 0.5) * 140;   /* west +-70 degrees, TUNING */
    const v = toVec(from, sp); return { pb, u: v[0], v: v[1] };
  }
  /* wind, pressure, rain at the window for a given storm list: no swell, cheap enough to be called a few dozen times per macro call */
  function weatherAt(seed, t, doy0, storms) {
    const b = background(seed, t, doy0); let u = 0, v = 0, p = 1013 + b.pb, rain = 0, near = null, nearV = -1, phase = 'none';
    for (let i = 0; i < storms.length; i++) {
      const s = storms[i]; if (Math.abs(t - s.tc) > 100) continue;
      const a = stormAtWindow(s, t); u += a.ux; v += a.uy; p -= a.deficit; rain += a.rain;
      const sc = Math.hypot(a.ux, a.uy) + a.deficit * 0.5; if (sc > nearV) { nearV = sc; near = s; phase = a.phase; }
    }
    /* the storm field takes over from the quiet-weather wind as it arrives: the speeds add (no cancelling lull at a front), the direction is the vector blend (TUNING) */
    const Vs = Math.hypot(u, v), f = Vs / (Vs + 3), bs = Math.hypot(b.u, b.v), ux = u + b.u * (1 - f), uy = v + b.v * (1 - f), um = Math.hypot(ux, uy) || 1, sp = Vs + bs * (1 - f);
    u = ux / um * sp; v = uy / um * sp;
    return { u, v, p: clamp(p, 940, 1040), rain: clamp(rain, 0, 1), near, nearScore: nearV, phase };
  }

  /* ---------- local wind sea: fetch limited growth with a lag ---------- */
  const SEA_FETCH_KM = 400, SEA_TAU_H = 4, DIR_TAU_H = 2;   /* TUNING: open fetch to windward, relaxation times of height (3 to 6 h in the note) and of direction (1 to 3 h) */
  const seaHsEq = U => Math.min(0.0213 * U * U, 0.0016 * U * Math.sqrt(SEA_FETCH_KM * 1000 / G));   /* fully developed (PM) or JONSWAP fetch limited, whichever is smaller */
  const seaTpFromHs = hs => clamp(5.0 * Math.sqrt(hs), 1.8, 16);   /* Tp = 5 sqrt(Hs) gives steepness Hs/L = 0.026, the fully developed value (note 2.4) */
  function windSea(seed, hour, doy0, storms) {
    const N = 22, k = Math.exp(-1 / SEA_TAU_H), kd = Math.exp(-1 / DIR_TAU_H); let e = 0, we = 0, du = 0, dv = 0, wd = 0;
    for (let j = 0; j < N; j++) {
      const w = weatherAt(seed, hour - j, doy0, storms), U = Math.hypot(w.u, w.v), hq = seaHsEq(U), a = (1 - k) * Math.pow(k, j), ad = (1 - kd) * Math.pow(kd, j);
      e += a * hq * hq; we += a; du += ad * w.u; dv += ad * w.v; wd += ad;
    }
    const rest = Math.pow(k, N), restD = Math.pow(kd, N); const w0 = weatherAt(seed, hour - N, doy0, storms), U0 = Math.hypot(w0.u, w0.v), h0 = seaHsEq(U0);
    e += rest * h0 * h0; du += restD * w0.u; dv += restD * w0.v;
    const hs = Math.sqrt(e), dir = Math.hypot(du, dv) > 1e-6 ? dirFromVec(du, dv) : 270;
    return { Hs: hs, T: seaTpFromHs(hs), dirFrom: dir };
  }

  /* ---------- swell: analytic packets from the storms ---------- */
  const SWELL_STEP_H = 3, SWELL_SIG_LO = 0.15, SWELL_SIG_HI = 0.28;   /* TUNING: emission step, width of the arriving spectrum in ln f on the long-period and short-period side (JONSWAP-like, steeper below the peak) */
  function swellPackets(seed, hour, storms) {
    const out = [];
    for (let i = 0; i < storms.length; i++) {
      const s = storms[i];
      for (let te = s.tpk - 36; te <= s.tpk + 24; te += SWELL_STEP_H) {
        if (te >= hour || hour - te > 260) continue;
        const env = stormEnv(s, te), U = 0.85 * s.vmax0 * Math.sqrt(env); if (U < 11) continue;   /* source wind at 10 m, TUNING */
        const c = stormCentre(s, te), D = Math.max(250, Math.hypot(c[0], c[1])), Dm = D * 1000;   /* nearer than 250 km it is wind sea, not swell: the packet fades out between 250 and 950 km (TUNING) */
        const dur = clamp(te - (s.tpk - 36) + 8, 8, 48) * 3600, F = clamp(4 * s.Rm, 500, 1500) * 1000;   /* fetch from the storm size, duration from the time the storm has blown (TUNING) */
        const xF = G * F / (U * U), xD = Math.pow(G * dur / (68.8 * U), 1.5), x = Math.min(xF, xD);   /* growth laws PLAUSIBLE, not opened (note section 11) */
        const Hs0 = Math.min(0.0213 * U * U, 0.0016 * U * U / G * Math.sqrt(x)), T0 = U * Math.pow(x, 0.33) / (3.5 * G);
        const heading = Math.atan2(Math.sin(s.heading), Math.cos(s.heading)), toWin = Math.atan2(-c[1], -c[0]);
        const cosd = Math.cos(toWin - heading), fd = 0.3 + 0.7 * Math.pow(Math.max(0, cosd), 2);   /* energy leaving toward the window: most ahead of the storm, little from behind (TUNING) */
        const R0 = 1.2 * s.Rm, Hw = Hs0 * fd * Math.sqrt(R0 / Math.max(D, R0)) * Math.exp(-D / 8000) * sm((D - 250) / 700);   /* decay law from the note (TUNING) */
        const tPeak = 4 * Math.PI * Dm / (G * T0) / 3600, r = (hour - te) / tPeak;   /* r = f / fp, the frequency that arrives now: f = g (t - te) / (4 pi D) */
        if (r < 0.3 || r > 5 || T0 / r > 20) continue;   /* no swell above 20 s (the note: rare, very distant big storms) */
        const lr = Math.log(r), sg = r < 1 ? SWELL_SIG_LO : SWELL_SIG_HI, S = Math.exp(-lr * lr / (2 * sg * sg));
        const dr = G * SWELL_STEP_H * 3600 * T0 / (4 * Math.PI * Dm);   /* width of the frequency slice this emission step feeds, relative to fp */
        const m = Hw * Hw / 16 * S * dr / 0.55;   /* 0.55 is the integral of the shape in r */
        if (m < 1e-5) continue;
        out.push({ m, T: T0 / r, dirFrom: ((Math.atan2(c[0], c[1]) / DEG) + 360) % 360, source: s.id, distKm: D, tEmit: te, tPeakArr: te + tPeak, peakT: T0, HsPeak: Hw });
      }
    }
    return out;
  }
  /* two quiet-weather background swells so there are always at least two crossing systems (the note's rule "always at least one swell train"; TUNING amplitudes and directions) */
  function backgroundSwells(seed, hour) {
    const d1 = 280 + (vnoise(seed, 21, hour / 96) - 0.5) * 50, d2 = d1 + (H01(seed, 22, 0) < 0.5 ? -1 : 1) * (50 + 40 * H01(seed, 23, 0));
    return [
      { m: Math.pow(0.35 + 0.9 * vnoise(seed, 24, hour / 60), 2) / 16, T: 11 + 3 * vnoise(seed, 25, hour / 80), dirFrom: d1, source: 'background', distKm: 4000, tEmit: null, tPeakArr: null, peakT: 12, HsPeak: 0 },
      { m: Math.pow(0.15 + 0.5 * vnoise(seed, 26, hour / 50), 2) / 16, T: 8 + 3 * vnoise(seed, 27, hour / 70), dirFrom: ((d2 % 360) + 360) % 360, source: 'background', distKm: 2500, tEmit: null, tPeakArr: null, peakT: 9, HsPeak: 0 }];
  }
  const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
  /* merge packets into at most three trains (direction under 15 degrees and period under 2 s apart merge; greedy, strongest first, so it is deterministic) */
  function makeTrains(packets, hour) {
    const ps = packets.slice().sort((a, b) => b.m - a.m || a.T - b.T), cl = [];
    for (const p of ps) {
      let hit = null;
      for (const c of cl) if (angDiff(c.dir, p.dirFrom) < 15 && Math.abs(c.T - p.T) < 2) { hit = c; break; }
      if (!hit) { cl.push({ m: p.m, T: p.T, dir: p.dirFrom, sx: p.m * Math.sin(p.dirFrom * DEG), sy: p.m * Math.cos(p.dirFrom * DEG), mT: p.m * p.T, lead: p, n: 1 }); continue; }
      hit.m += p.m; hit.mT += p.m * p.T; hit.sx += p.m * Math.sin(p.dirFrom * DEG); hit.sy += p.m * Math.cos(p.dirFrom * DEG); hit.T = hit.mT / hit.m; hit.dir = ((Math.atan2(hit.sx, hit.sy) / DEG) + 360) % 360; hit.n++;
    }
    /* more than three systems: merge the two closest (period and direction) until three remain, so energy is kept and no train vanishes with a jump */
    while (cl.length > 3) {
      let bi = 0, bj = 1, bd = 1e9;
      for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) { const d = Math.abs(cl[i].T - cl[j].T) / 2 + angDiff(cl[i].dir, cl[j].dir) / 15; if (d < bd) { bd = d; bi = i; bj = j; } }
      const a = cl[bi], b = cl[bj]; a.m += b.m; a.mT += b.mT; a.sx += b.sx; a.sy += b.sy; a.T = a.mT / a.m; a.dir = ((Math.atan2(a.sx, a.sy) / DEG) + 360) % 360; if (b.m > a.lead.m) a.lead = b.lead; cl.splice(bj, 1);
    }
    const top = cl;
    top.sort((a, b) => b.T - a.T);   /* long period first: the order in which swell arrives */
    return top.map(c => {
      const T = clamp(c.T, 4, 24), L = waveLength(T); let Hs = Math.min(4 * Math.sqrt(c.m), 12, STEEP_MAX * 0.98 * L);   /* steepness never above 1/7 */
      const lead = c.lead, bgk = lead.tPeakArr === null, rate = bgk ? 0 : hour - lead.tPeakArr;
      return { Hs, T, L, cg: groupSpeed(T), steep: Hs / L, dirFrom: c.dir, dirTo: dirToXZ(c.dir), source: lead.source, distKm: lead.distKm,
        arrival: { tEmit: lead.tEmit, tPeak: lead.tPeakArr, etaPeak: bgk ? null : lead.tPeakArr - hour, peakT: lead.peakT, state: bgk ? 'background' : rate < -1 ? 'rising' : rate <= 1 ? 'peak' : 'falling' } };
    });
  }
  /* unit vector the waves travel TO in XZ (x east, z south) given where they come FROM */
  const dirToXZ = fromDeg => ({ x: -Math.sin(fromDeg * DEG), z: Math.cos(fromDeg * DEG) });

  /* ---------- boats ---------- */
  /* TUNING limits, PLAUSIBLE basis (note section 5): each class has a limit on effective Hs and on wind. Long swell is gentle, so each swell train counts with a weight
     w(T) = clamp((16 - T) / 10, 0.2, 1) (a 6 s sea counts fully, a 14 s swell one fifth); the wind sea counts fully. */
  const BOATS = { skiff: { hs: 0.6, wind: 8 }, sail: { hs: 1.0, wind: 10.8 }, gig: { hs: 1.2, wind: 12 }, decked: { hs: 2.25, wind: 17.2 } };
  function effectiveHs(swell, ws) { let e = ws.Hs * ws.Hs; for (const t of swell) { const w = clamp((16 - t.T) / 10, 0.2, 1); e += w * w * t.Hs * t.Hs; } return Math.sqrt(e); }
  function sailOkOf(hsEff, U) {
    const o = {}; for (const k in BOATS) o[k] = hsEff <= BOATS[k].hs && U <= BOATS[k].wind;
    o.row = o.skiff; o.work = o.decked;   /* the weather.js names: row, sail, work */
    return o;
  }

  /* ---------- the macro state ---------- */
  function weatherStateOf(U, p, rain, phase, storm) {
    if (U >= 17 || storm >= 0.75) return 'storm';
    if (rain > 0.55) return 'rain';
    if (rain > 0.2) return phase === 'post-cold-front' ? 'showers' : 'rain';
    if (p < 1000 || phase === 'pre-warm-front') return 'overcast';
    if (p > 1022 && U < 6) return 'clear';
    return 'fair';
  }
  function macroCore(seed, hour, o) {
    const doy0 = o.doy0 == null ? DOY0 : o.doy0, storms = stormsAround(seed, hour, doy0, 260, 100, o), w = weatherAt(seed, hour, doy0, storms);
    const U = clamp(Math.hypot(w.u, w.v), 0, 40), dirFrom = dirFromVec(w.u, w.v), ws = windSea(seed, hour, doy0, storms);
    ws.Hs = Math.min(ws.Hs, 12); ws.L = waveLength(ws.T); ws.Hs = Math.min(ws.Hs, STEEP_MAX * 0.98 * ws.L); ws.steep = ws.Hs / ws.L; ws.dirTo = dirToXZ(ws.dirFrom);
    const swell = makeTrains(swellPackets(seed, hour, storms).concat(backgroundSwells(seed, hour)), hour);
    let e = ws.Hs * ws.Hs; for (const t of swell) e += t.Hs * t.Hs; const seaHs = Math.min(12, Math.sqrt(e));
    const tide = tideHeight(hour, doy0), lvl = tideLevel(tide), mo = moon(hour);
    const baro = barometricSurge(w.p), setup = 7e-4 * Math.pow(Math.max(0, w.u), 2) * (o.coast === 'none' ? 0 : 1);   /* wind setup, onshore = blowing toward the east (the coast faces west), TUNING */
    const surge = baro + setup, surgeGame = surge * TIDE_WINDOW / TIDE_HALF_RANGE;   /* the page's tide is the real tide halved, so the surge is halved too */
    const dtt = 0.25, stream = clamp((tideHeight(hour + dtt, doy0) - tideHeight(hour - dtt, doy0)) / (2 * dtt) / 0.35, -1, 1);   /* PLAUSIBLE: a standing-wave stream follows dh/dt, strongest mid flood and mid ebb, slack at high and low water */
    const cs = 0.05 + 0.25 * Math.pow(vnoise(seed, 31, hour / 60), 1.3), ca = (H01(seed, 32, 0) * TAU + (vnoise(seed, 33, hour / 72) - 0.5) * 1.6);   /* drift 0.05 to 0.3 m/s, a slow direction (days), FLOW_TYPES */
    const cu = cs * Math.cos(ca), cv = cs * Math.sin(ca);
    const Wc = monahan(U), ideal = clamp(w.rain, 0, 1);
    const storm = clamp(Math.max((U - 8) / 16, (1000 - w.p) / 35), 0, 1);
    const hsEff = effectiveHs(swell, ws), sail = sailOkOf(hsEff, U), vis = Math.round(clamp(30000 / (1 + 9 * Math.pow(ideal, 1.1)) * (1 - 0.6 * sm((U - 13) / 8)), 300, 30000));
    const wxs = weatherStateOf(U, w.p, w.rain, w.phase, storm), angle = Math.atan2(-w.v, w.u);
    const st = {
      seed, hour, doy: (doy0 + hour / 24) % 365,
      wind: { u: w.u, v: w.v, speed: U, dirFrom, x: w.u, z: -w.v, gust: U * (1.25 + 0.15 * storm), beaufort: beaufort(U) },
      pressure: w.p, swell, windSea: ws, seaHs, seaHsEff: hsEff,
      tide: { h: tide, level: lvl, stream, spring: mo.spring, phase: (28.984104 * (hour - TIDE_T0) % 360 + 360) % 360, range: TIDE_WINDOW },
      moon: mo, surge, surgeBaro: baro, surgeWind: setup, surgeGame, level: lvl + surgeGame, levelReal: tide + surge,
      current: { u: cu, v: cv, speed: cs, dirTo: ((Math.atan2(cu, cv) / DEG) + 360) % 360, x: cu, z: -cv },
      drift: { x: cu + 0.03 * w.u, z: -cv - 0.03 * w.v },   /* flotsam velocity: current plus 3 percent of the wind (VERIFIED 3 percent), in XZ */
      whitecap: Wc, foamStreaks: U >= 8, spray: U >= 15, streakAmt: sm((U - 7) / 4), sprayAmt: sm((U - 13) / 4),
      rain: w.rain, rainMm: +(w.rain * 8).toFixed(2), visibility: vis, storm: { index: storm, id: w.near && w.nearScore > 4 ? w.near.id : null, phase: w.phase },
      weatherState: wxs, sailOk: sail,
      compat: { windMs: U, angle, hs: seaHs, tp: swell.length ? swell[0].T : ws.T, beaufort: beaufort(U), rain: w.rain, vis, storm: storm, surge: surgeGame, sailOk: { row: sail.skiff, sail: sail.sail, work: sail.decked }, name: wxs }
    };
    return st;
  }

  /* ---------- keyed arrivals ---------- */
  /* One slot per game hour per kind. An event exists in a slot with probability 1 - exp(-rate) where the rate comes from the macro state at the middle of the slot; its key is
     seed:kind:index with index = the slot number, so the same call gives the same key and a save that remembers the keys never doubles an event (note section 6.7). Rates are TUNING. */
  const KINDS = ['wrack', 'driftlog', 'shoal', 'birdflight', 'boat', 'wreck'];
  const CLASSES = {
    wrack: ['kelp and wrack', 'rope and net float', 'plastic-free driftwood', 'bottle', 'fish box'], driftlog: ['spruce log', 'oak beam', 'root ball', 'plank'], shoal: ['herring shoal', 'mackerel shoal', 'sand eel cloud', 'dolphin pod', 'minke whale'],
    birdflight: ['gannet line', 'gull stream', 'auk commute', 'cormorant string'], boat: ['fishing boat', 'ferry', 'sailing yacht', 'trader'], wreck: ['small hull', 'timber hull', 'cargo', 'relic boat'] };
  function arrivalRates(st) {
    const U = st.wind.speed, hs = st.seaHs, os = clamp(st.wind.u / Math.max(U, 1), -1, 1) * 0.5 + 0.5, hod = ((st.hour % 24) + 24) % 24, storm = st.storm.index;   /* os: 1 when the wind blows ashore (to the east) */
    const dawnDusk = (hod >= 5 && hod < 7.5) || (hod >= 17.5 && hod < 20);
    return { wrack: 0.01 + 0.12 * Math.min(1, Math.pow(hs / 3, 2)) * (0.4 + 0.6 * os), driftlog: 0.006 + 0.05 * Math.min(1, Math.pow(hs / 3.5, 2)) * (0.3 + 0.7 * os),
      shoal: 0.05 * (U < 9 ? 1 : 0) * (1 - Math.min(1, hs / 2.5)), birdflight: dawnDusk && U < 10.8 && st.rain < 0.5 ? 2.5 : 0, boat: hod >= 7 && hod < 19 && U < 13 ? 0.08 * (1 - storm) : 0,
      wreck: 0.0015 + 0.03 * storm * storm * (0.4 + 0.6 * os) };
  }
  function arrivalsInSlot(seed, n, o) {
    const st = macroCore(seed, n + 0.5, o), rt = arrivalRates(st), out = [];
    for (let ki = 0; ki < KINDS.length; ki++) {
      const kind = KINDS[ki];
      if (H01(seed, 0x7000 + ki, n) >= 1 - Math.exp(-rt[kind])) continue;
      const hs = mix(seed, 0x7100 + ki, n), cls = CLASSES[kind][hs % CLASSES[kind].length], dr = Math.atan2(st.drift.x, -st.drift.z);   /* drift toward (east x, north) */
      const bearingFrom = kind === 'wrack' || kind === 'driftlog' || kind === 'wreck' ? ((Math.atan2(-st.drift.x, st.drift.z) / DEG) + 360) % 360 : H01(seed, 0x7200 + ki, n) * 360;   /* floating things arrive from up-drift */
      out.push({ key: seed + ':' + kind + ':' + n, kind, index: n, hour: n + H01(seed, 0x7300 + ki, n), cls, size: +(0.2 + 0.8 * H01(seed, 0x7400 + ki, n)).toFixed(3), bearingFrom: +bearingFrom.toFixed(1), rate: +rt[kind].toFixed(4), seaHs: +st.seaHs.toFixed(2) });
    }
    return out;
  }
  function arrivals(seed, h0, h1, opts) {
    const o = opts || {}, out = [];
    for (let n = Math.floor(h0); n <= Math.floor(h1); n++) for (const e of arrivalsInSlot(seed, n, o)) if (e.hour >= h0 && e.hour <= h1) out.push(e);
    out.sort((a, b) => a.hour - b.hour || (a.key < b.key ? -1 : 1)); return out;
  }

  /* macro(seed, hour [, opts]): opts.storms replaces the seeded storm list (tests, scenarios), opts.doy0 sets the season, opts.arrivals === false skips the arrival lookup */
  function macro(seed, hour, opts) {
    const o = opts || {}, st = macroCore(seed | 0, hour, o);
    if (o.arrivals !== false) { const n = Math.floor(hour); st.arrivals = arrivalsInSlot(seed | 0, n, o).filter(e => e.hour <= hour); }
    return st;
  }
  function macroSeries(seed, h0, h1, step, opts) {
    const o = Object.assign({ arrivals: false }, opts || {}), out = [];
    for (let i = 0; h0 + i * step <= h1 + 1e-9; i++) out.push(macro(seed, h0 + i * step, o));
    return out;
  }
  /* compact JSON: columns, rounded, for charts and bug reports */
  function macroDump(seed, h0, h1, step, opts) {
    const s = macroSeries(seed, h0, h1, step, opts), r = (v, d) => +(+v).toFixed(d), col = f => s.map(f);
    return JSON.stringify({ seed, h0, h1, step, hour: col(x => r(x.hour, 3)), U: col(x => r(x.wind.speed, 2)), dirFrom: col(x => r(x.wind.dirFrom, 1)), p: col(x => r(x.pressure, 1)),
      swell: [0, 1, 2].map(i => ({ Hs: col(x => x.swell[i] ? r(x.swell[i].Hs, 2) : 0), T: col(x => x.swell[i] ? r(x.swell[i].T, 1) : 0), dirFrom: col(x => x.swell[i] ? r(x.swell[i].dirFrom, 0) : 0) })),
      seaHs: col(x => r(x.windSea.Hs, 2)), seaT: col(x => r(x.windSea.T, 1)), tide: col(x => r(x.tide.level, 3)), surge: col(x => r(x.surge, 3)), whitecap: col(x => r(x.whitecap, 4)), rain: col(x => r(x.rain, 2)),
      arrivals: arrivals(seed, h0, h1, opts).map(e => e.key + '@' + r(e.hour, 2)) });
  }

  /* ---------- the sea height function: JS, uniforms, GLSL ---------- */
  /* DIORAMA SCALE (an exaggeration, on purpose): a 0.5 to 2 km window cannot hold the honest wavelengths of both swell (150 to 600 m) and wind sea (10 to 100 m) at 1 to 6 crests.
     So the DISPLAYED wavelength is a monotone log map of the honest one: honest L from LMIN = 6 m (T 2 s) to LMAX = 900 m (T 24 s) maps onto window/6 .. window (6 crests down to 1).
     The state keeps the honest numbers; each component records Lhonest, L (displayed) and exag = L / Lhonest. The displayed phase speed is the deep water value for the DISPLAYED L
     (w = sqrt(g k)), so the motion looks right for the crests that are drawn. Amplitude is hExag * Hs / 2 (honest when hExag = 1), limited so that the displayed H/L stays under 0.11. */
  const LMIN = 6, LMAX = 900, NCOMP = 8;
  function dioramaL(L, windowM) { const l = clamp(L, LMIN, LMAX); return windowM / 6 * Math.pow(6, Math.log(l / LMIN) / Math.log(LMAX / LMIN)); }
  const SEA_CACHE = new WeakMap();
  /* up to three swell trains and the wind sea, two components each (a main wave and a longer neighbour, so the trains show groups), as {dx, dz, k, w, a, phi, Lhonest, L, exag} */
  function seaComponents(state, opts) {
    const o = opts || {}, W = o.windowM || 1000, hx = o.hExag == null ? 1 : o.hExag, key = W + ':' + hx, hit = SEA_CACHE.get(state); if (hit && hit.key === key) return hit.comps;
    const src = [state.swell[0], state.swell[1], state.swell[2], state.windSea], comps = [];
    for (let i = 0; i < 4; i++) {
      const t = src[i];
      for (let j = 0; j < 2; j++) {
        if (!t) { comps.push({ dx: 1, dz: 0, k: 0.01, w: 0, a: 0, phi: 0, Lhonest: 0, L: 0, exag: 0 }); continue; }
        const Lh = t.L * (j ? 1.2 : 1), Ld = dioramaL(Lh, W), k = TAU / Ld, ang = (t.dirFrom + (j ? 6 : 0)) * DEG;
        const a = Math.min(hx * t.Hs / 2 * (j ? 0.6 : 0.8), 0.35 / k);
        comps.push({ dx: -Math.sin(ang), dz: Math.cos(ang), k, w: Math.sqrt(G * k), a, phi: H01(state.seed | 0, 0x51, i * 2 + j) * TAU, Lhonest: Lh, L: Ld, exag: Ld / Lh });
      }
    }
    SEA_CACHE.set(state, { key, comps }); return comps;
  }
  /* height (metres, displayed scale) at x east, z south, time t seconds: sum of 2nd order Stokes waves, a cos(th) + k a^2 / 2 cos(2 th), th = k (d . p) - w t + phi */
  function seaH(x, z, t, stateOrComps, opts) {
    const cs = Array.isArray(stateOrComps) ? stateOrComps : seaComponents(stateOrComps, opts); let h = 0;
    for (let i = 0; i < cs.length; i++) { const c = cs[i]; if (c.a === 0) continue; const th = c.k * (c.dx * x + c.dz * z) - c.w * t + c.phi; h += c.a * Math.cos(th) + 0.5 * c.k * c.a * c.a * Math.cos(2 * th); }
    return h;
  }
  /* flat uniform arrays for the shader: uMsA (vec4 x NCOMP: dx, dz, k, w) and uMsB (vec2 x NCOMP: a, phi) */
  function seaUniforms(comps) { const A = new Array(NCOMP * 4).fill(0), B = new Array(NCOMP * 2).fill(0); for (let i = 0; i < NCOMP; i++) { const c = comps[i]; if (!c) continue; A[i * 4] = c.dx; A[i * 4 + 1] = c.dz; A[i * 4 + 2] = c.k; A[i * 4 + 3] = c.w; B[i * 2] = c.a; B[i * 2 + 1] = c.phi; } return { A, B }; }
  /* the JS port of the GLSL below, line for line (uniform arrays in, one float out): this is what the parity test checks against seaH and against the real shader */
  function seaHGlslPort(x, z, t, A, B) {
    let h = 0;
    for (let i = 0; i < NCOMP; i++) {
      const th = A[i * 4 + 2] * (A[i * 4] * x + A[i * 4 + 1] * z) - A[i * 4 + 3] * t + B[i * 2 + 1], a = B[i * 2];
      h += a * Math.cos(th) + 0.5 * A[i * 4 + 2] * a * a * Math.cos(2.0 * th);
    }
    return h;
  }
  const SEA_GLSL = `#define MS_N ${NCOMP}
uniform vec4 uMsA[MS_N]; /* dir.x, dir.z, k, omega */
uniform vec2 uMsB[MS_N]; /* amplitude, phase */
float msSeaH(vec2 p, float t) {
  float h = 0.0;
  for (int i = 0; i < MS_N; i++) {
    float th = uMsA[i].z * dot(uMsA[i].xy, p) - uMsA[i].w * t + uMsB[i].y;
    float a = uMsB[i].x;
    h += a * cos(th) + 0.5 * uMsA[i].z * a * a * cos(2.0 * th);
  }
  return h;
}
`;

  return { G, TAU, DAY_REAL_SECONDS, HOUR_REAL_SECONDS, gameHourFromReal, DOY0, SYNODIC, mulberry32, mix, H01, vnoise,
    waveLength, phaseSpeed, groupSpeed, swellArrivalHours, swellPeriodAt, pmHs, monahan, barometricSurge, beaufort, BEAUFORT, STEEP_MAX, dirFromVec, toVec, dirToXZ,
    TIDE, TIDE_HALF_RANGE, TIDE_WINDOW, tideHeight, tideLevel, moon, stormParams, stormsAround, finishStorm, stormCentre, stormAtWindow, weatherAt, seaHsEq, KINDS, BOATS, effectiveHs, sailOkOf,
    macro, macroSeries, macroDump, arrivals, arrivalRates, dioramaL, LMIN, LMAX, NCOMP, seaComponents, seaH, seaUniforms, seaHGlslPort, SEA_GLSL };
}));
