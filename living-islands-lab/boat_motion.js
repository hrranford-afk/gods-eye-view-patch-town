/* Living Islands: boat motion for the boat kit (see BOAT_MODEL.md, wiring section). A PURE module: no DOM, no Math.random, no wall clock, no dependencies.
   window.LI_BOAT_MOTION in a page, globalThis.LI_BOAT_MOTION after a plain import in node, module.exports in CommonJS.
   Everything works in the BOAT frame: bow ahead, starboard on the right, angles in radians, pitch positive bow up, roll positive port side up, sweep -1 = oar blade forward (catch), +1 = aft (finish).
   1. floatMotion: heave, pitch and roll from five sea heights under the hull (centre, bow, stern, port, starboard), soft capped so a calm sea moves the boat a little and a storm saturates.
   2. oarStroke: one rowing stroke from the clock: sweep and blade lift. Drive 40 percent of the cycle (blade in the water, sweeping aft), recovery 60 percent (blade lifted, sweeping forward).
   3. sailTrim: boom angle and heel from the wind angle off the bow (positive = wind from starboard) and the wind speed. 4. rudderAngle from the turn rate. 5. lodFor: which level of detail for a distance.
   Tags: TUNING = a game number, COMPUTED = checked by tests/boatkit-test.js. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.LI_BOAT_MOTION = api;
  if (typeof globalThis !== 'undefined') globalThis.LI_BOAT_MOTION = api;
}(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const TAU = Math.PI * 2, D2R = Math.PI / 180;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const sm = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  /* 1. heave, pitch, roll. h = {c, bow, stern, port, stbd} sea heights in metres at the hull centre, L/2 ahead, L/2 astern, W/2 to port and W/2 to starboard.
        The slope is the real hull-length slope; a boat of length L does not follow waves shorter than about L, which the sampling spacing already does (TUNING). */
  const CAPS = { heave: .25, heaveScale: .8, angle: .12 };   /* TUNING: heave cap in metres, tanh scale, angle cap in radians (about 7 degrees) */
  function floatMotion(h, L, W, caps) {
    const k = Object.assign({}, CAPS, caps || {});
    const heave = k.heave * Math.tanh((h.c || 0) / k.heaveScale);
    const pitch = k.angle * Math.tanh(Math.atan((h.bow - h.stern) / Math.max(L, .1)) / k.angle);
    const roll = k.angle * Math.tanh(Math.atan((h.port - h.stbd) / Math.max(W, .1)) / k.angle);
    return { heave, pitch, roll };
  }

  /* 2. one stroke. period in seconds (2.4 as in the file's `row` clip); phase from the clock t. */
  const DRIVE = .4;
  function strokePhase(t, period) { const p = period || 2.4; const f = t / p; return f - Math.floor(f); }
  function oarStroke(t, period, rate) {
    /* rate 0..1 scales the sweep (a gentle pull or a hard one); at rate 0 the oars hang at mid sweep */
    const ph = strokePhase(t, period), r = rate === undefined ? 1 : clamp(rate, 0, 1);
    let s, lift;
    if (ph < DRIVE) { const u = ph / DRIVE; s = -1 + 2 * sm(u); lift = -.25 * Math.sin(Math.PI * u); }   /* blade in the water, a touch of dip */
    else { const u = (ph - DRIVE) / (1 - DRIVE); s = 1 - 2 * sm(u); lift = Math.sin(Math.PI * clamp(u * 1.0, 0, 1)); }   /* blade out, lifted over the wave, returning */
    return { phase: ph, sweep: s * r, lift: lift * r, inWater: ph < DRIVE };
  }
  /* strokes per minute from the boat's speed (TUNING: 18 at 0.8 m/s up to 28 at 1.4 m/s); the period in seconds is 60 / spm */
  function strokePeriod(speed) { const spm = clamp(18 + (speed - .8) * 16.7, 16, 30); return 60 / spm; }

  /* 3. sail trim. rel = angle of the wind FROM, off the bow, positive from starboard (radians, any range); windMs the wind speed.
        The boom lies out on the lee side. Returns boom (radians about the vertical axis of the mast, in the FILE's convention: positive swings the boom aft end toward starboard, which is
        what a wind from port needs, as in the file's `sailing` pose at +26 degrees), the apparent angle, heel (radians, positive = port side down, away from the wind) and whether the sail is luffing. */
  function wrap(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }
  function sailTrim(rel, windMs) {
    const a = wrap(rel), aa = Math.abs(a), sg = a >= 0 ? 1 : -1;
    const trimDeg = aa <= 35 * D2R ? 8 : 8 + (aa / D2R - 35) * (72 / 145);   /* close hauled about 8 degrees of sheet out, running about 80 */
    const boom = -sg * trimDeg * D2R;
    const luff = aa < 30 * D2R;
    /* heel peaks on a close reach and fades on a run; in proportion to wind speed squared; capped at 12 degrees (TUNING) */
    const drive = Math.sin(clamp(aa, 0, Math.PI)) * (aa > 25 * D2R ? 1 : sm(aa / (25 * D2R)));
    const heelMag = Math.min(12 * D2R, .0057 * windMs * windMs * (.4 + .6 * drive) * (luff ? .3 : 1));
    return { boom, aa, heel: sg * heelMag, luff };
  }
  /* 4. rudder: follows the turn. yawRate in radians per second, positive turning to port; returns the pin angle in the FILE's convention (positive = blade aft end to starboard = bow to port; capped at 14 degrees). */
  function rudderAngle(yawRate) { return clamp(yawRate * 1.6, -1, 1) * 14 * D2R; }

  /* 5. level of detail from the camera distance in metres. prev is the level the boat has now (hysteresis of 12 percent so a boat on the edge does not flicker).
        quality high: hero within 12 m if available, live within 90 m, else far. low: no hero, live within 45 m, else far. ar: no hero, live within 30 m (the table is small). */
  function lodFor(dist, quality, prev, heroOk) {
    const lim = quality === 'low' ? { hero: 0, live: 45 } : quality === 'ar' ? { hero: 0, live: 30 } : { hero: heroOk ? 12 : 0, live: 90 };
    if (lim.hero && dist < lim.hero * (prev === 'hero' ? 1.12 : 1)) return 'hero';
    if (dist < lim.live * (prev === 'live' || prev === 'hero' ? 1.12 : 1)) return 'live';
    return 'far';
  }

  return { CAPS, DRIVE, floatMotion, oarStroke, strokePhase, strokePeriod, sailTrim, rudderAngle, lodFor, wrap };
}));
