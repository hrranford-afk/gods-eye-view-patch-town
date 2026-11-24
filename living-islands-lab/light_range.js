/* Living Islands: light range, flash characters and arrivals (see LIGHTHOUSE_BUILD.md, research/LIGHT_FOG_AND_LIGHTHOUSE.md).
   A PURE module: no DOM, no Math.random, no wall clock, no dependencies. window.LightRange in a page, globalThis.LightRange after a plain import in node, module.exports in CommonJS.
   1. How far a light is seen: visibleNm = min(geographic horizon, Allard luminous range). Five rungs (fire, post lamp, small lens, big lens, relic beacon).
   2. Flash characters as on/off tables and lightState(character, tHours) for the phase now.
   3. arrivalSeen(rung, visKm, distNm): who sees the light, and arrivalsFor(seed, h0, h1, opts): the keyed arrival boats with a deterministic chance of landfall and of a wreck.
   Tags in comments as in the research note: VERIFIED (definition or standard), PLAUSIBLE (standard practice), TUNING (a game number), COMPUTED (checked by tests/light-range-test.js). */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.LightRange = api;
  if (typeof globalThis !== 'undefined') globalThis.LightRange = api;
}(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : undefined), function () {
  'use strict';
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const sm = t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  const NM = 1852;                        /* metres in a nautical mile, VERIFIED */
  const ET_LUX = 2e-7;                    /* night threshold illuminance at the eye, UNVERIFIED (remembered), the game uses it as TUNING */
  const EYE_M = 2;                        /* lookout eye height on a small boat, TUNING */
  const HORIZON_K = 2.08;                 /* nm per sqrt(metre), standard atmosphere with average refraction, VERIFIED (2.08 to 2.10) */

  /* ---------- 1. range ---------- */
  const horizonNm = (hLightM, hEyeM) => HORIZON_K * (Math.sqrt(Math.max(0, hLightM)) + Math.sqrt(Math.max(0, hEyeM == null ? EYE_M : hEyeM)));
  /* transmissivity per metre from meteorological visibility: V is the distance at which a black object has 5 percent contrast, T = 0.05 ^ (1 / V), VERIFIED convention */
  const transPerM = visKm => Math.pow(0.05, 1 / (Math.max(1e-3, visKm) * 1000));
  /* Allard: E = I T^d / d^2 = Et; solved for d by bisection on the logarithm (the left side falls with d, so there is exactly one root); I = 0 gives 0 */
  function lumRangeNm(I, visKm, Et) {
    if (!(I > 0)) return 0; Et = Et || ET_LUX;
    const lnT = Math.log(transPerM(visKm)), f = d => Math.log(I) + d * lnT - 2 * Math.log(d) - Math.log(Et);
    let lo = 0.5, hi = 4e6;               /* metres */
    if (f(lo) <= 0) return 0;
    for (let i = 0; i < 90; i++) { const mid = Math.sqrt(lo * hi); if (f(mid) > 0) lo = mid; else hi = mid; }
    return lo / NM;
  }
  const visibleNm = (I, hLight, hEye, visKm) => Math.min(horizonNm(hLight, hEye), lumRangeNm(I, visKm, ET_LUX));

  /* ---------- the five rungs ---------- */
  /* I peak candela toward the observer, h height of the source above the sea (m): TUNING chosen from real orders of magnitude (note section 7).
     towerM is the height of the drawn structure on the page (the picture is smaller than the rung's true height: faked, see LIGHTHOUSE_BUILD.md). k is how strongly a seen light draws a boat in (1 to 3, TUNING). */
  const RUNGS = [
    { id: 'fire',  index: 0, name: 'Fire on the headland', short: 'Fire',      I: 300,    h: 25, towerM: 3.4,  k: 1.2, needsKeeper: true,  chars: ['F'] },
    { id: 'post',  index: 1, name: 'Lamp on a post',       short: 'Post lamp', I: 10,     h: 8,  towerM: 5.6,  k: 1.0, needsKeeper: true,  chars: ['Oc8', 'Iso4'] },
    { id: 'small', index: 2, name: 'Small lens light',     short: 'Small lens', I: 5000,  h: 22, towerM: 11.5, k: 2.0, needsKeeper: true,  chars: ['Fl5', 'LFl10'] },
    { id: 'big',   index: 3, name: 'Big lens light',       short: 'Big lens',  I: 80000,  h: 35, towerM: 17.5, k: 3.0, needsKeeper: true,  chars: ['Fl2_10', 'Fl3_15'] },
    { id: 'relic', index: 4, name: 'Relic beacon',         short: 'Relic',     I: 100000, h: 20, towerM: 14.0, k: 3.0, needsKeeper: false, chars: ['Q', 'MoA'] }
  ];
  const rungOf = r => {
    if (r === null || r === undefined || r === 'none' || r === -1) return null;
    if (typeof r === 'object') return r;
    if (typeof r === 'number') return RUNGS[clamp(Math.round(r), 0, RUNGS.length - 1)];
    return RUNGS.find(x => x.id === r || x.short === r) || null;
  };

  /* ---------- 2. flash characters ---------- */
  /* seq: alternating light, dark durations in seconds starting with light; they sum to the period. Names after the IALA vocabulary (VERIFIED names), the numbers are the note's examples (PLAUSIBLE).
     Fl(3) 15 s: the note lists three 0.5 s flashes 1.5 s apart and 11.5 s dark, which adds to 16 s; the dark is 10.5 s here so the cycle is the stated 15 s (COMPUTED).
     Q: the note gives both a 0.5 s cycle and 60 per minute; the game uses 60 per minute (1 s cycle, 0.4 s light) so the pattern stays readable at 30 fps (TUNING).
     Mo(A): dot 0.5 s, gap 0.5 s, dash 1.5 s (Morse proportions 1:1:3), then dark to 12 s. */
  const CHARACTERS = [
    { id: 'Fl5',    abbr: 'Fl 5s',     name: 'Flashing, 5 s',          period: 5,  seq: [0.5, 4.5] },
    { id: 'Fl2_10', abbr: 'Fl(2) 10s', name: 'Group flashing 2, 10 s', period: 10, seq: [0.5, 1.5, 0.5, 7.5] },
    { id: 'Fl3_15', abbr: 'Fl(3) 15s', name: 'Group flashing 3, 15 s', period: 15, seq: [0.5, 1.5, 0.5, 1.5, 0.5, 10.5] },
    { id: 'LFl10',  abbr: 'LFl 10s',   name: 'Long flash, 10 s',       period: 10, seq: [2, 8] },
    { id: 'Oc8',    abbr: 'Oc 8s',     name: 'Occulting, 8 s',        period: 8,  seq: [6, 2] },
    { id: 'Iso4',   abbr: 'Iso 4s',    name: 'Isophase, 4 s',         period: 4,  seq: [2, 2] },
    { id: 'Q',      abbr: 'Q',         name: 'Quick, 60 a minute',    period: 1,  seq: [0.4, 0.6] },
    { id: 'MoA',    abbr: 'Mo(A) 12s', name: 'Morse A, 12 s',         period: 12, seq: [0.5, 0.5, 1.5, 9.5] }
  ];
  const FIXED = { id: 'F', abbr: 'F', name: 'Fixed', period: 1, seq: [1, 0], fixed: true };   /* steady light: fire and a plain lamp (not one of the eight flash characters) */
  const charOf = c => (c && typeof c === 'object') ? c : (c === 'F' || c === 'fixed' || c == null) ? FIXED : (CHARACTERS.find(x => x.id === c || x.abbr === c) || FIXED);
  const onFraction = c => { c = charOf(c); if (c.fixed) return 1; let on = 0; for (let i = 0; i < c.seq.length; i += 2) on += c.seq[i]; return on / c.period; };
  const flashesPerCycle = c => { c = charOf(c); return c.fixed ? 0 : c.seq.length / 2; };
  /* the phase now. tHours in hours (the page feeds real seconds / 3600, so the pattern runs at its printed speed whatever the game clock does); returns on, level (0..1, with a short fade at each edge, 0 fade = hard on/off), the second inside the cycle and the flash index */
  function lightState(character, tHours, opts) {
    const c = charOf(character), fade = opts && opts.fade != null ? opts.fade : 0.05;
    if (c.fixed) return { on: true, level: 1, t: 0, phase: 0, flash: 0, period: 0, id: 'F' };
    const t = (((tHours * 3600) % c.period) + c.period) % c.period;
    let a = 0, flash = -1;
    for (let i = 0; i < c.seq.length; i += 2) {
      const on0 = a, on1 = a + c.seq[i]; a = on1 + c.seq[i + 1];
      if (t >= on0 && t < on1) {
        let lv = 1; if (fade > 0) lv = sm((t - on0) / fade) * sm((on1 - t) / fade);
        return { on: true, level: lv, t, phase: t / c.period, flash: i / 2, period: c.period, id: c.id };
      }
    }
    return { on: false, level: 0, t, phase: t / c.period, flash, period: c.period, id: c.id };
  }
  /* the character the page gives a light by seed (two neighbouring lights get different ones when the seeds differ) */
  function hash32(seed, salt) { let h = Math.imul((seed | 0) ^ 0x9E3779B9, 374761393) + Math.imul(salt | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function defaultCharacter(rung, seed) { const r = rungOf(rung); if (!r) return FIXED.id; return r.chars[Math.floor(hash32(seed, 31 + r.index) * r.chars.length) % r.chars.length]; }

  /* ---------- visibility of weather (the weather.js table, copied so this module has no dependency; a test compares the two) ---------- */
  const VIS_KM = { clear: 40, fair: 30, goldenhour: 25, overcast: 12, showers: 8, rain: 4, storm: 1.5, fog: 0.4 };
  const visKmOf = name => VIS_KM[name] != null ? VIS_KM[name] : 30;

  /* ---------- 3. arrivals ---------- */
  /* Daytime sighting of the island itself (no light): the silhouette of a 40 m island, geographic horizon capped by the weather: a day boat sees land to min(16.2 nm, visibility) */
  const ISLAND_H = 40;
  const dayRangeNm = (visKm, hIsland) => Math.min(horizonNm(hIsland == null ? ISLAND_H : hIsland, EYE_M), visKm * 1000 / NM);
  /* is a light lit: at night (sun below the horizon) or in poor visibility by day (the rule in the note: lit when visibility falls under about 5 km) */
  const litNow = (night, visKm) => !!night || visKm < 5;
  /* arrivalSeen(rung, visKm, distNm, opts): does a boat distNm out see the island? by the light (when lit), else by the silhouette in daylight, else not */
  function arrivalSeen(rung, visKm, distNm, opts) {
    const o = opts || {}, r = rungOf(rung), night = o.night !== undefined ? !!o.night : true, eye = o.eye == null ? EYE_M : o.eye;
    const lit = o.lit !== undefined ? !!o.lit : litNow(night, visKm);
    const lightRange = r && lit ? visibleNm(r.I, o.h == null ? r.h : o.h, eye, visKm) : 0;
    const dayRange = night ? 0 : dayRangeNm(visKm, o.hIsland);
    const byLight = distNm <= lightRange, byDay = distNm <= dayRange;
    return { seen: byLight || byDay, by: byLight ? 'light' : byDay ? 'silhouette' : 'none', lightRangeNm: lightRange, dayRangeNm: dayRange, rangeNm: Math.max(lightRange, dayRange), lit, night };
  }
  /* chance that a boat that has seen the island makes landfall: p = pBase x (1 + k x [the light was what saw it]) (note 7.1 item 3), never above 0.95 */
  const P_BASE = 0.35;   /* TUNING */
  function landfallP(rung, seenInfo, pBase) {
    const r = rungOf(rung); pBase = pBase == null ? P_BASE : pBase;
    if (!seenInfo || !seenInfo.seen) return 0;
    return clamp(pBase * (1 + (seenInfo.by === 'light' && r ? r.k : 0)), 0, 0.95);
  }
  /* wreck chance for a boat coming into the harbour mouth at night or in poor visibility: unmarked 0.05 to 0.2 (more at low water and in fog), marked 0.01 (note 7.1 item 5), TUNING */
  function wreckP(marked, night, visKm, lowWater) {
    if (!(night || visKm < 2)) return 0;
    if (marked) return 0.01;
    return clamp(0.05 + 0.10 * clamp(lowWater || 0, 0, 1) + (visKm < 1 ? 0.04 : 0) + (night && visKm < 2 ? 0.01 : 0), 0.05, 0.2);
  }
  /* a hash of a string and a small seeded generator for the keyed events: the same key always draws the same numbers */
  function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function rng(seedInt) { let a = seedInt | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const DIST_MIN_NM = 1, DIST_MAX_NM = 20;   /* the final-approach distance of a boat, log-uniform (note 7.1 item 1, TUNING) */
  const solarHour = hour => (((hour + 12) % 24) + 24) % 24;   /* the clock's epoch: hour 0 is a new moon at local solar noon */
  /* the default night rule when the page gives none: dark between 20:30 and 04:30 local solar time (the page passes its own, from the sun's elevation) */
  const defaultNight = hour => { const l = solarHour(hour); return l >= 20.5 || l < 4.5; };
  /* arrivalsFor(seed, h0, h1, opts): every boat that makes the final approach in [h0, h1], from the keyed boat arrivals of macro_sea.js (opts.macro) and a seeded list of boats caught out after dark
     (key seed:nboat:slot, one slot per game hour, rate 0.02 a slot by day and 0.05 by night, TUNING: macro's own boats are day only). For each: distance, who sees the light, whether it lands, whether it is wrecked.
     opts: rung (id, index, object, or null for no light), marked (a harbour light or leading line), pBase, macro (the MacroSea module), nightBoats (default true), visKmAt(hour) -> km, nightAt(hour) -> bool,
     tideAt(hour) -> level in -1..1 (low water raises the wreck chance), windAt(hour) -> m/s (a boat will not sail above 13 m/s).
     Returns { events: [...], summary: {...} }. A pure function of its arguments: any call order gives the same keys and the same draws. */
  function arrivalsFor(seed, h0, h1, opts) {
    const o = opts || {}, r = rungOf(o.rung), visAt = o.visKmAt || (() => 30), nightAt = o.nightAt || defaultNight, tideAt = o.tideAt, windAt = o.windAt;
    const cands = [];
    if (o.macro && o.macro.arrivals) { for (const e of o.macro.arrivals(seed, h0, h1)) if (e.kind === 'boat') cands.push({ key: e.key, hour: e.hour, src: 'macro', cls: e.cls }); }
    if (o.nightBoats !== false) {
      for (let n = Math.floor(h0); n <= Math.floor(h1); n++) {
        const night = nightAt(n + 0.5), rate = night ? 0.05 : 0.02;
        if (hash32(seed, 0x9100 + n * 7) >= 1 - Math.exp(-rate)) continue;
        const hr = n + hash32(seed, 0x9200 + n * 7); if (hr < h0 || hr > h1) continue;
        if (windAt && windAt(hr) >= 13) continue;
        cands.push({ key: seed + ':nboat:' + n, hour: hr, src: 'seeded', cls: night ? 'night boat' : 'fishing boat' });
      }
    }
    cands.sort((a, b) => a.hour - b.hour || (a.key < b.key ? -1 : 1));
    const events = [], S = { boats: 0, seen: 0, seenByLight: 0, landed: 0, wrecked: 0, passed: 0, night: 0, fog: 0 };
    for (const c of cands) {
      const R = rng(hashStr(c.key) ^ 0x51ED270B), u0 = R(), u1 = R(), u2 = R();
      const dist = Math.exp(Math.log(DIST_MIN_NM) + (Math.log(DIST_MAX_NM) - Math.log(DIST_MIN_NM)) * u0);
      const vis = visAt(c.hour), night = !!nightAt(c.hour);
      const info = arrivalSeen(r, vis, dist, { night });
      const p = landfallP(r, info, o.pBase);
      let landed = info.seen && u1 < p, wrecked = false, salvage = null;
      if (landed) {
        const low = tideAt ? sm((0.15 - tideAt(c.hour)) / 0.9) : 0, pw = wreckP(!!o.marked, night, vis, low);
        if (u2 < pw) {
          wrecked = true; landed = false;
          const lst = solarHour(c.hour), wait = ((7 - lst) % 24 + 24) % 24 || 24;   /* the next 07:00 solar */
          salvage = { key: c.key + ':salvage', hour: c.hour + wait, kind: 'crate', from: c.key };
        }
      }
      events.push({ key: c.key, src: c.src, cls: c.cls, hour: c.hour, distNm: +dist.toFixed(3), visKm: +vis.toFixed(3), night, lit: info.lit, by: info.by, seen: info.seen, rangeNm: +info.rangeNm.toFixed(3), p: +p.toFixed(4), landed, wrecked, salvage });
      S.boats++; if (info.seen) S.seen++; if (info.by === 'light') S.seenByLight++; if (landed) S.landed++; else if (wrecked) S.wrecked++; else S.passed++;
      if (night) S.night++; if (vis < 2) S.fog++;
    }
    return { events, summary: S };
  }

  return { NM, ET_LUX, EYE_M, HORIZON_K, horizonNm, transPerM, lumRangeNm, visibleNm, RUNGS, rungOf, CHARACTERS, FIXED, charOf, onFraction, flashesPerCycle, lightState, defaultCharacter, hash32, VIS_KM, visKmOf,
    dayRangeNm, litNow, arrivalSeen, landfallP, wreckP, P_BASE, hashStr, rng, solarHour, defaultNight, arrivalsFor, ISLAND_H };
}));
