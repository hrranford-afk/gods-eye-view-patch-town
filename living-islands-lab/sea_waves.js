/* Living Islands: the shared WAVE CODE (see research/SEA_AND_STORM_PLAN.md and GIFT_JOB7SEA.md). A PURE module: no THREE, no DOM, no Math.random, no wall clock.
   window.LI_SEA_WAVES in a page, globalThis.LI_SEA_WAVES after a plain import in node, module.exports in CommonJS.
   ONE Gerstner sum, used by the wave shader (the vertex stage mirrors cpuDisp line for line) and by everything that has to FEEL the water on the CPU: the boat, crates, wrack timber, the shoreline wash.
     x = x0 - Q A d sin(th),  y = A cos(th),  th = k d.p0 - ph + phi,  ph = w t (or an accumulated phase w.ph when the page keeps one), w = sqrt(g k)  (deep water).
   Three bands: SWELL SETS (close wavelengths and directions, so groups beat), WIND SEA (wider spread, shorter), CHOP (Radeon and up only; the iPad leaves chop to the pixel ripples).
   1. TIERS: wave counts and mesh sizes (iPad 8 waves, desktop 16, Radeon 24, MAX 48). 2. WEATHER: the inputs (calm, squall, gale, fog, thunder, ground swell, winter, Great Wash) and weatherParams(name, s) which
   blends from the calm day to the type by how far it has risen (s 0..1). 3. buildWaves, disp, height (the CPU query: the horizontal pinch is inverted by a 8 step fixed point), normal.
   The numbers are in the PROTOTYPE's honest metres; opts.scale shrinks every wavelength (and so every height) to the diorama: the Gift page uses 0.35 (a 122 m table). Tags: TUNING = a game number, COMPUTED = checked by tests/sea-waves-test.js. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.LI_SEA_WAVES = api;
  if (typeof globalThis !== 'undefined') globalThis.LI_SEA_WAVES = api;
}(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const G = 9.81, TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  function hash(i, s) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }

  /* 1. tiers: how many waves in each band, the polar mesh, the pixel ripples, spray points. nTot is the NW of the shader loop. TUNING (plan section 3) */
  const TIERS = {
    ipad: { name: 'iPad sea', nSw: 3, nWs: 5, nCh: 0, rings: 72, segs: 160, rip: 4, spray: 600 },
    desktop: { name: 'Desktop sea', nSw: 4, nWs: 7, nCh: 5, rings: 140, segs: 320, rip: 7, spray: 4000 },
    radeon: { name: 'Radeon sea', nSw: 5, nWs: 9, nCh: 10, rings: 220, segs: 480, rip: 10, spray: 12000 },
    max: { name: 'Radeon MAX', nSw: 10, nWs: 18, nCh: 20, rings: 480, segs: 1056, rip: 12, spray: 100000 }
  };
  for (const k in TIERS) { const T = TIERS[k]; T.nTot = T.nSw + T.nWs + T.nCh; T.tris = 2 * T.rings * T.segs; }

  /* 2. weather inputs. kA = steepness (k times amplitude) of a band, L = wavelength (m, honest), sp = direction spread (deg), q = pinch scale (about 1 folds crests), wind = direction (deg), swOff = swell direction off the wind,
     foamT = Jacobian level where foam starts, foam = foam amount, streak = wind streaks, surge = extra water level, vort = whirlpool depth factor. The calm day is the base; a type is blended in by s. TUNING (prototype numbers) */
  const CALM = { wind: 35, swOff: 25, swKA: .030, swL: 75, swSp: 6, wsKA: .020, wsL: 20, wsSp: 35, chKA: .016, q: .85, foamT: .50, foam: .35, streak: 0, surge: 0, vort: 0, dark: 0 };
  const WEATHER = {
    calm: {},
    squall: { wind: 60, swOff: 15, swKA: .05, swL: 60, wsKA: .15, wsL: 15, chKA: .10, q: 1.15, foamT: .85, foam: .8, streak: .5, dark: .5 },
    after: { wind: 60, swOff: 15, swKA: .05, swL: 60, wsKA: .07, wsL: 16, chKA: .05, q: .95, foamT: .7, foam: .5, streak: .15 },
    gale: { wind: 75, swOff: 20, swKA: .10, swL: 120, wsKA: .19, wsL: 34, wsSp: 25, chKA: .10, q: 1.3, foamT: .95, foam: 1, streak: 1, dark: .35 },
    fog: { wind: 30, swOff: 30, swKA: .020, swL: 90, wsKA: .008, wsL: 14, chKA: .004, q: .7, foamT: .4, foam: .1 },
    swell: { wind: 100, swOff: -60, swKA: .085, swL: 150, swSp: 3, wsKA: .004, wsL: 22, chKA: .002, q: 1.0, foamT: .45, foam: .25 },
    thunder: { wind: 80, swOff: 20, swKA: .07, swL: 90, wsKA: .17, wsL: 26, chKA: .11, q: 1.25, foamT: .95, foam: .9, streak: .8, dark: .6 },
    winter: { wind: 70, swOff: 20, swKA: .09, swL: 130, wsKA: .17, wsL: 30, chKA: .09, q: 1.25, foamT: .95, foam: .9, streak: 1, dark: .2 },
    wash: { wind: 55, swOff: 25, swKA: .13, swL: 140, swSp: 5, wsKA: .17, wsL: 32, chKA: .08, q: 1.25, foamT: .95, foam: 1, streak: .8, vort: 1, surge: 1.2, dark: .4 }
  };
  const NAMES = Object.keys(WEATHER);
  /* the inputs for weather `name` risen to s (0 calm .. 1 full): every number is a blend from the calm day */
  function weatherParams(name, s) {
    const T = WEATHER[name] || WEATHER.calm, P = {}; s = clamp(s === undefined ? 1 : s, 0, 1);
    for (const k in CALM) { const b = T[k] !== undefined ? T[k] : CALM[k]; P[k] = lerp(CALM[k], b, s); }
    P.name = WEATHER[name] ? name : 'calm'; P.s = s; return P;
  }

  /* 3. the wave table: sets (close neighbours beat into groups), wind sea, chop. opts.scale shrinks wavelengths to the diorama (default 1). Deterministic: only hash(). */
  function buildWaves(P, tier, opts) {
    const sc = (opts && opts.scale) || 1, W = [], wr = P.wind * Math.PI / 180;
    function band(n, kA, Lmin, Lmax, dirC, spreadDeg, salt) {
      for (let i = 0; i < n; i++) {
        const u = n > 1 ? i / (n - 1) : .5, L = Lmin * Math.pow(Lmax / Lmin, u) * (.94 + .12 * hash(i, salt)) * sc;
        const dir = dirC + (hash(i, salt + 7) - .5) * 2 * spreadDeg * Math.PI / 180, k = TAU / L, A = kA / Math.sqrt(n) / k;
        W.push({ dx: Math.cos(dir), dz: Math.sin(dir), k, A, w: Math.sqrt(G * k), phi: hash(i, salt + 13) * TAU, L, Q: 0, ph: 0 });
      }
    }
    band(tier.nSw, P.swKA, P.swL * .78, P.swL * 1.3, wr + P.swOff * Math.PI / 180, P.swSp, 100);
    band(tier.nWs, P.wsKA, P.wsL * .45, P.wsL * 1.5, wr, P.wsSp, 200);
    if (tier.nCh) band(tier.nCh, P.chKA, 6.2, Math.min(P.wsL * .4, 12), wr, 50, 300);
    const n = W.length; let asum = 0, e = 0;
    for (const w of W) { w.Q = clamp(P.q / (n * w.k * w.A), 0, 1); asum += w.A; e += w.A * w.A / 2; }
    W.asum = Math.max(asum, 1e-4); W.hs = 4 * Math.sqrt(e); W.P = P; return W;
  }
  /* the same table made again for new weather WITHOUT losing the accumulated phases (the page calls this every frame while the weather moves) */
  function retune(W, P, tier, opts) { const N = buildWaves(P, tier, opts); for (let i = 0; i < N.length && i < W.length; i++) N[i].ph = W[i].ph; return N; }
  function advance(W, dt) { for (const w of W) w.ph += w.w * dt; }

  /* the displacement at a REST point p0: [dx, dy, dz]. Waves shorter than minL are left out of the CPU query (a 4 m boat does not follow them; the shader still draws them). */
  function disp(W, p0x, p0z, t, o) {
    let dx = 0, dz = 0, dy = 0; const minL = (o && o.minL) || 0, useT = t !== undefined && t !== null;
    for (let i = 0; i < W.length; i++) {
      const w = W[i]; if (w.L < minL) continue;
      const th = w.k * (w.dx * p0x + w.dz * p0z) - (useT ? w.w * t : w.ph) + w.phi, s = Math.sin(th), c = Math.cos(th), qa = w.Q * w.A;
      dx -= qa * w.dx * s; dz -= qa * w.dz * s; dy += w.A * c;
    }
    return [dx, dy, dz];
  }
  /* the surface height above the world point (x, z): invert the horizontal pinch by fixed point iteration, then add the level. params = {waves, level, minL, scale?}; t = null uses the accumulated phases */
  function height(x, z, t, params) {
    const W = params.waves, o = params; let px = x, pz = z, d = [0, 0, 0];
    for (let i = 0; i < 8; i++) { d = disp(W, px, pz, t, o); px = x - d[0]; pz = z - d[2]; }
    return d[1] + (params.level || 0);
  }
  /* the surface normal [nx, ny, nz] (unit) above (x, z): slope from the same sum, as the vertex shader */
  function normal(x, z, t, params) {
    const W = params.waves, minL = params.minL || 0, useT = t !== undefined && t !== null; let px = x, pz = z, d;
    for (let i = 0; i < 8; i++) { d = disp(W, px, pz, t, params); px = x - d[0]; pz = z - d[2]; }
    let hx = 0, hz = 0, jxx = 0, jzz = 0, jxz = 0;
    for (const w of W) {
      if (w.L < minL) continue;
      const th = w.k * (w.dx * px + w.dz * pz) - (useT ? w.w * t : w.ph) + w.phi, s = Math.sin(th), c = Math.cos(th), kA = w.k * w.A;
      hx -= w.dx * kA * s; hz -= w.dz * kA * s; jxx += w.Q * kA * w.dx * w.dx * c; jzz += w.Q * kA * w.dz * w.dz * c; jxz += w.Q * kA * w.dx * w.dz * c;
    }
    const J = (1 - jxx) * (1 - jzz) - jxz * jxz, ny = Math.max(J, .25), l = Math.hypot(hx, ny, hz) || 1;
    return [-hx / l, ny / l, -hz / l];
  }
  /* the horizontal speed of the water particles at the surface (orbital motion), m/s: crates and timber drift on it (a small Stokes drift toward the wave direction is the page's) */
  function orbit(W, x, z, t, o) {
    let vx = 0, vz = 0, vy = 0; const minL = (o && o.minL) || 0, useT = t !== undefined && t !== null;
    for (const w of W) { if (w.L < minL) continue; const th = w.k * (w.dx * x + w.dz * z) - (useT ? w.w * t : w.ph) + w.phi, s = Math.sin(th), c = Math.cos(th); vx += w.A * w.w * w.dx * c; vz += w.A * w.w * w.dz * c; vy -= w.A * w.w * s; }
    return [vx, vy, vz];
  }
  /* a ready-made params object: tier name + weather name + s (+ scale, level, minL) */
  function make(tierName, weather, s, opts) {
    const T = TIERS[tierName] || TIERS.ipad, P = weatherParams(weather, s), W = buildWaves(P, T, opts);
    return { waves: W, P, tier: T, level: (opts && opts.level) || 0, minL: (opts && opts.minL) || 0, scale: (opts && opts.scale) || 1 };
  }
  /* the one crest-over-trough number for a sea: significant wave height of the table, metres */
  function hs(W) { return W.hs || 0; }

  return { G, TAU, hash, TIERS, CALM, WEATHER, NAMES, weatherParams, buildWaves, retune, advance, disp, height, normal, orbit, make, hs };
}));
