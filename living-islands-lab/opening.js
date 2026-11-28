/* Living Islands: the OPENING FILM ENGINE (research/OPENING_BUILD_PLAN.md). A PURE module: no THREE inside the timeline maths, no DOM, no Math.random, no wall clock.
   window.LI_OPENING in a page, globalThis.LI_OPENING after a plain import in node, module.exports in CommonJS.
   1. TRACKS: vector tracks (camera position, target, fov, colours) are Catmull-Rom cubic Hermite splines with tangents from the neighbours' times (continuous velocity through the keys); scalar tracks default to a monotone cubic
      (a 0..1 weight never overshoots). A key may carry ease (none | smooth | in | out, re-times the segment that STARTS at the key), interp (smooth | linear | step) and cut:true (a hard cut: the spline starts afresh at the key).
   2. DIRECTOR: shots, cues (named, timed, in order), seek(t), play / pause, speed, skip, toJSON / fromJSON. at(t) is a pure function of t: play, seek, skip and replay all agree.
   3. SEA CLOCK: the wave table of the film at time t. sea_waves.js (passed in) gives the waves; the film adds ONE staged wave (the Great Wash crest) and accumulates wave phase along the film so that changing weather never makes the
      sea jump, and any t can be evaluated at once (deterministic, seekable). Height query = the table plus the whirlpool dip (zero unless the vortex track is above zero).
   4. ISLAND FIELD: the seed 9001 height field (sea_proto/island_9001.js, decoded by decodeIsland) placed four times (scaled, rotated) and queried on the CPU, so the camera and the page agree about the ground.
   5. THREE adapter: attachThree(director, {camera, floor}) drives a camera and clamps it above the floor; also the sky look and the sea parameters at t.
   6. The FILM: defaultFilm() is the 90 s opening as data (shots, camera, tracks, cues). Numbers are TUNING (authored by eye in opening_proto.html), none measured on a device.
   Units: metres, seconds, degrees where a name says Deg or Elev. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.LI_OPENING = api;
  if (typeof globalThis !== 'undefined') globalThis.LI_OPENING = api;
}(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  function hash(i, s) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  const EASE = { none: u => u, smooth: u => u * u * (3 - 2 * u), 'in': u => u * u, out: u => 1 - (1 - u) * (1 - u) };

  /* ---------------------------------------------------------------- 1. tracks ---------------------------------------------------------------- */
  /* split keys into runs at every cut key; each run is a list of keys sharing a spline. Keys are sorted by t (stable) first. */
  function makeRuns(keys) {
    const ks = keys.map((k, i) => ({ k, i })).sort((a, b) => a.k.t - b.k.t || a.i - b.i).map(o => o.k), runs = [];
    for (const k of ks) { if (!runs.length || k.cut) runs.push([]); runs[runs.length - 1].push(k); }
    return runs;
  }
  function hermite(p0, m0, p1, m1, dt, u) { const u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * dt * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * dt * m1; }
  /* Catmull-Rom tangent of component c at index i of a run (per second); one-sided at the ends */
  function crTan(run, i, c) {
    const n = run.length; if (n < 2) return 0;
    const a = run[Math.max(i - 1, 0)], b = run[Math.min(i + 1, n - 1)], dt = b.t - a.t; return dt > 1e-12 ? (b.v[c] - a.v[c]) / dt : 0;
  }
  /* monotone cubic tangent (Fritsch-Butland) for a scalar run */
  function monoTan(run, i) {
    const n = run.length; if (n < 2) return 0;
    const sl = j => { const dt = run[j + 1].t - run[j].t; return dt > 1e-12 ? (run[j + 1].v[0] - run[j].v[0]) / dt : 0; };
    if (i === 0) return sl(0); if (i === n - 1) return sl(n - 2);
    const d0 = sl(i - 1), d1 = sl(i); if (d0 * d1 <= 0) return 0;
    const h0 = run[i].t - run[i - 1].t, h1 = run[i + 1].t - run[i].t, w1 = 2 * h1 + h0, w2 = h1 + 2 * h0; return (w1 + w2) / (w1 / d0 + w2 / d1);
  }
  /* a track of dim components. mode 'cr' = Catmull-Rom (vectors), 'mono' = monotone (scalars). keys: [{t, v: number|array, ease?, interp?, cut?}] */
  function Track(keys, dim, mode) {
    this.dim = dim; this.mode = mode; const norm = (keys || []).map(k => ({ t: +k.t, v: Array.isArray(k.v) ? k.v.slice(0, dim) : [+k.v], ease: k.ease || 'none', interp: k.interp || 'smooth', cut: !!k.cut }));
    this.keys = norm; this.runs = makeRuns(norm);
    for (const r of this.runs) for (let i = 0; i < r.length; i++) { r[i].m = []; for (let c = 0; c < dim; c++) r[i].m.push(mode === 'mono' ? monoTan(r, i) : crTan(r, i, c)); }
    this.t0 = this.runs.length ? this.runs[0][0].t : 0;
  }
  /* write the value at t into out (array of dim) and return out */
  Track.prototype.eval = function (t, out) {
    out = out || new Array(this.dim); const R = this.runs;
    if (!R.length) { for (let c = 0; c < this.dim; c++) out[c] = 0; return out; }
    let run = R[0]; for (let r = 0; r < R.length; r++) { if (R[r][0].t <= t) run = R[r]; else break; }
    const n = run.length, first = run[0], last = run[n - 1];
    if (t <= first.t || n === 1) { for (let c = 0; c < this.dim; c++) out[c] = first.v[c]; return out; }
    if (t >= last.t) { for (let c = 0; c < this.dim; c++) out[c] = last.v[c]; return out; }
    let i = 0; while (i < n - 2 && run[i + 1].t <= t) i++;
    const a = run[i], b = run[i + 1], dt = b.t - a.t; let u = dt > 1e-12 ? (t - a.t) / dt : 1;
    if (a.interp === 'step') { for (let c = 0; c < this.dim; c++) out[c] = a.v[c]; return out; }
    u = (EASE[a.ease] || EASE.none)(u);
    for (let c = 0; c < this.dim; c++) out[c] = a.interp === 'linear' ? lerp(a.v[c], b.v[c], u) : hermite(a.v[c], a.m[c], b.v[c], b.m[c], dt, u);
    return out;
  };
  const _s1 = [0];
  Track.prototype.scalar = function (t) { return this.eval(t, _s1)[0]; };

  /* ---------------------------------------------------------------- 2. the director ---------------------------------------------------------------- */
  function Director(film) {
    if (!(this instanceof Director)) return new Director(film);
    const F = typeof film === 'string' ? JSON.parse(film) : film; if (!F || !F.camera) throw new Error('opening: a film needs camera tracks');
    this.film = JSON.parse(JSON.stringify(F)); this.duration = +F.duration || 90; this.name = F.name || 'film';
    this.shots = (F.shots || []).map(s => ({ id: s.id, t0: +s.t0, t1: +s.t1, frame: s.frame || '', note: s.note || '' })).sort((a, b) => a.t0 - b.t0);
    this.cam = { pos: new Track(F.camera.pos, 3, 'cr'), target: new Track(F.camera.target, 3, 'cr'), fov: new Track(F.camera.fov, 1, 'cr') };
    this.tracks = {}; for (const k in (F.tracks || {})) this.tracks[k] = new Track(F.tracks[k], 1, 'mono');
    this.vtracks = {}; for (const k in (F.vtracks || {})) { const dim = (F.vtracks[k][0] && Array.isArray(F.vtracks[k][0].v)) ? F.vtracks[k][0].v.length : 3; this.vtracks[k] = new Track(F.vtracks[k], dim, 'cr'); }
    this.cues = (F.cues || []).map((c, i) => ({ t: +c.t, name: c.name, arg: c.arg, i })).sort((a, b) => a.t - b.t || a.i - b.i);
    this.t = 0; this.playing = false; this.speed = 1; this.ended = false; this._cursor = 0; this._cueFns = []; this._endFns = [];
    this._cursor = this._cueIndex(0);
  }
  Director.prototype._cueIndex = function (t) { let i = 0; while (i < this.cues.length && this.cues[i].t < t) i++; return i; };
  Director.prototype.shotAt = function (t) { let j = -1; for (let i = 0; i < this.shots.length; i++) if (this.shots[i].t0 <= t + 1e-9) j = i; return j; };
  /* the scalar state only (cheap): every scalar track at t */
  Director.prototype.state = function (t) { t = clamp(t, 0, this.duration); const s = {}; for (const k in this.tracks) s[k] = this.tracks[k].scalar(t); return s; };
  /* the whole answer at t: PURE (same t, same answer, whatever was asked before) */
  Director.prototype.at = function (t) {
    t = clamp(+t || 0, 0, this.duration); const si = this.shotAt(t), v = {};
    for (const k in this.vtracks) v[k] = this.vtracks[k].eval(t, new Array(this.vtracks[k].dim));
    return { t, shot: si >= 0 ? this.shots[si].id : null, shotIndex: si, camera: { pos: this.cam.pos.eval(t, [0, 0, 0]), target: this.cam.target.eval(t, [0, 0, 0]), fov: this.cam.fov.scalar(t) }, s: this.state(t), v };
  };
  /* the cues in (a, b], in order (a half-open window, so two windows that meet never share a cue; the first window of a film uses a = -1) */
  Director.prototype.cuesBetween = function (a, b) { return this.cues.filter(c => c.t > a && c.t <= b); };
  Director.prototype.onCue = function (fn) { this._cueFns.push(fn); return () => { this._cueFns = this._cueFns.filter(f => f !== fn); }; };
  Director.prototype.onEnd = function (fn) { this._endFns.push(fn); return () => { this._endFns = this._endFns.filter(f => f !== fn); }; };
  Director.prototype.play = function () { if (this.ended) { this.seek(0); } this.playing = true; return this; };
  Director.prototype.pause = function () { this.playing = false; return this; };
  Director.prototype.setSpeed = function (v) { this.speed = clamp(+v || 1, 0.25, 4); return this.speed; };
  /* move the read position WITHOUT firing cues (scrubbing never plays a thunderclap); a cue exactly at t fires on the next update */
  Director.prototype.seek = function (t) { this.t = clamp(+t || 0, 0, this.duration); this.ended = this.t >= this.duration; this._cursor = this._cueIndex(this.t); return this.t; };
  /* advance by dt real seconds (times speed) and fire the cues crossed, in time order. Returns the new t. */
  Director.prototype.update = function (dt) {
    if (!this.playing || this.ended) return this.t;
    this.t = Math.min(this.t + Math.max(0, dt) * this.speed, this.duration);
    const fired = [];
    while (this._cursor < this.cues.length && this.cues[this._cursor].t <= this.t) { fired.push(this.cues[this._cursor++]); }
    for (const c of fired) for (const f of this._cueFns.slice()) f(c.name, c.arg, c.t);
    if (this.t >= this.duration) { this.ended = true; this.playing = false; for (const f of this._endFns.slice()) f(); }
    return this.t;
  };
  /* skip: to the start of the next shot, or to the end from the last shot. No cues fire. */
  Director.prototype.skip = function () { for (const s of this.shots) if (s.t0 > this.t + 1e-6) return this.seek(s.t0); return this.seek(this.duration); };
  Director.prototype.skipToEnd = function () { return this.seek(this.duration); };
  Director.prototype.skipTo = function (idOrIndex) { const s = typeof idOrIndex === 'number' ? this.shots[idOrIndex] : this.shots.find(x => x.id === idOrIndex); return s ? this.seek(s.t0) : this.t; };
  Director.prototype.prevShot = function () { const i = this.shotAt(this.t); if (i < 0) return this.seek(0); return this.seek(this.t - this.shots[i].t0 > 1 ? this.shots[i].t0 : (i > 0 ? this.shots[i - 1].t0 : 0)); };
  Director.prototype.toJSON = function () { return JSON.parse(JSON.stringify(this.film)); };
  Director.fromJSON = function (o) { return new Director(o); };

  /* ---------------------------------------------------------------- 3. the sea clock ---------------------------------------------------------------- */
  const CREST = { L: 140, dirDeg: 145, tc: 50.5, q: 1 };   /* the Great Wash wave: wavelength, heading, the time its peak is at the jetty (TUNING) */
  const VORT = { x: 0, z: -4, R: 32, depth: 10 };            /* whirlpool: centre of the four islands, radius, depth at vortex = 1 (TUNING, form as sea_proto) */
  /* the blend of the weather types over the calm base: weights swell, wash (the storm), after. S = LI_SEA_WAVES. A wind track (degrees) overrides the heading when present. */
  function seaParams(S, st) {
    const wS = clamp(st.seaSwell || 0, 0, 1), wW = clamp(st.seaStorm || 0, 0, 1), wA = clamp(st.seaAfter || 0, 0, 1), sum = wS + wW + wA, k = sum > 1 ? 1 / sum : 1;
    const PS = seaParams._P || (seaParams._P = {}), get = n => PS[n] || (PS[n] = S.weatherParams(n, 1));
    const P = {}, A = get('swell'), B = get('wash'), C = get('after');
    for (const key in S.CALM) { const c = S.CALM[key]; P[key] = c + k * (wS * (A[key] - c) + wW * (B[key] - c) + wA * (C[key] - c)); }
    if (st.wind !== undefined && st.wind !== null) P.wind = st.wind;
    P.name = 'film'; P.s = Math.max(wS, wW, wA); return P;
  }
  /* a gentle floor for the troughs: the islands stand on a 3.4 m shelf, and a trough that goes lower than about 1.2 m under the mean level would show a cliff of sea bed. Below -1.2 the surface falls at 0.15 of the rate. The same function is in the sea shader. */
  const TROUGH = -1.2, troughCompress = y => y > TROUGH ? y : TROUGH + (y - TROUGH) * 0.15;
  /* the sea of the film. S = LI_SEA_WAVES, director, opts {tier: 'ipad'|..., scale: 1, stepS: .25}. Phase per wave is accumulated along the film from the tracks (tabulated), so any t is a pure function. */
  function makeSeaClock(S, director, opts) {
    opts = opts || {}; const tier = S.TIERS[opts.tier || 'ipad'] || S.TIERS.ipad, scale = opts.scale || 1, step = opts.stepS || .25, T = director.duration, n = Math.ceil(T / step) + 2;
    const P0 = seaParams(S, director.state(0)), W0 = S.buildWaves(P0, tier, { scale }), N = W0.length, cum = [], wk = [];
    for (let i = 0; i < N; i++) { cum.push(new Float64Array(n)); wk.push(new Float64Array(n)); }
    for (let k = 0; k < n; k++) {
      const W = S.buildWaves(seaParams(S, director.state(Math.min(k * step, T))), tier, { scale });
      for (let i = 0; i < N; i++) { wk[i][k] = W[i].w; cum[i][k] = k === 0 ? 0 : cum[i][k - 1] + wk[i][k - 1] * step; }
    }
    const crestDir = CREST.dirDeg * DEG, cdx = Math.cos(crestDir), cdz = Math.sin(crestDir), ck = TAU / (CREST.L * scale), cw = Math.sqrt(S.G * ck);
    const jet = opts.jetty || [0, 0];
    let cache = null;
    const clock = {
      S, tier, scale, N, crest: { dx: cdx, dz: cdz, k: ck, w: cw, L: CREST.L * scale },
      phaseAt(i, t) { const k = clamp(Math.floor(t / step), 0, n - 2), tk = k * step; return cum[i][k] + wk[i][k] * (t - tk); },
      /* the wave table at film time t: {waves, P, level, minL, scale, st} */
      table(t) {
        t = clamp(t, 0, T); if (cache && cache.t === t) return cache.v;
        const st = director.state(t), P = seaParams(S, st), W = S.buildWaves(P, tier, { scale });
        for (let i = 0; i < W.length; i++) W[i].ph = clock.phaseAt(i, t);
        const A = Math.max(0, st.crest || 0);
        if (A > 0.005) {
          const phi = -ck * (cdx * jet[0] + cdz * jet[1]);
          W.push({ dx: cdx, dz: cdz, k: ck, A, w: cw, phi, L: CREST.L * scale, Q: clamp(CREST.q / (ck * A), 0, 1), ph: cw * (t - CREST.tc), crest: true });
        }
        let asum = 0, e = 0; for (const w of W) { asum += w.A; e += w.A * w.A / 2; } W.asum = Math.max(asum, 1e-4); W.hs = 4 * Math.sqrt(e); W.P = P;
        const v = { waves: W, P, level: P.surge || 0, minL: 0, scale, st }; cache = { t, v }; return v;
      },
      /* the whirlpool dip at (x, z) for the vortex weight v (zero when v is zero) */
      vortexDip(x, z, v) { if (!(v > 0)) return 0; const rx = x - VORT.x, rz = z - VORT.z; return v * VORT.depth * Math.exp(-(rx * rx + rz * rz) / (VORT.R * VORT.R)); },
      /* the surface height above (x, z) at film time t, whirlpool included. All waves are used (a camera must clear every crest). */
      height(x, z, t) { const tb = clock.table(t); return troughCompress(S.height(x, z, null, tb)) - clock.vortexDip(x, z, tb.st.vortex || 0); },
      /* the largest height anywhere in a window around (x,z) is not needed by callers; sightline helper: true when the sea surface blocks the straight line a -> b at time t (sampled every 2 m) */
      blocked(a, b, t) {
        const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), nS = Math.max(2, Math.ceil(d / 2));
        for (let i = 1; i < nS; i++) { const u = i / nS, x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), z = lerp(a[2], b[2], u); if (clock.height(x, z, t) > y) return true; } return false;
      }
    };
    return clock;
  }

  /* ---------------------------------------------------------------- 4. the island field ---------------------------------------------------------------- */
  function b64bytes(b) {
    if (typeof Buffer !== 'undefined') { const bf = Buffer.from(b, 'base64'); return new Uint8Array(bf.buffer.slice(bf.byteOffset, bf.byteOffset + bf.length)); }
    const a = atob(b), u = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) u[i] = a.charCodeAt(i); return u;
  }
  /* D = window.SEA_ISLAND ({nx, dx, h: base64 int16, g: base64 ground classes}) */
  function decodeIsland(D) {
    const hb = b64bytes(D.h), h16 = new Int16Array(hb.buffer, 0, D.nx * D.nx), hF = new Float32Array(D.nx * D.nx); for (let i = 0; i < hF.length; i++) hF[i] = h16[i] / 256;
    return { nx: D.nx, dx: D.dx, half: (D.nx - 1) * D.dx / 2, hF, g: b64bytes(D.g) };
  }
  function crW(t, o) { const t2 = t * t, t3 = t2 * t; o[0] = -.5 * t3 + t2 - .5 * t; o[1] = 1.5 * t3 - 2.5 * t2 + 1; o[2] = -1.5 * t3 + 2 * t2 + .5 * t; o[3] = .5 * t3 - .5 * t2; }
  const _wx = [0, 0, 0, 0], _wz = [0, 0, 0, 0];
  function localH(D, x, z) {   /* bicubic, as rubble/terrain.js */
    const fx = (x + D.half) / D.dx, fz = (z + D.half) / D.dx, i = Math.floor(fx), j = Math.floor(fz); crW(fx - i, _wx); crW(fz - j, _wz); let s = 0; const nx = D.nx;
    for (let b = 0; b < 4; b++) { const jj = clamp(j - 1 + b, 0, nx - 1) * nx; let r = 0; for (let a = 0; a < 4; a++) r += _wx[a] * D.hF[jj + clamp(i - 1 + a, 0, nx - 1)]; s += _wz[b] * r; }
    return s;
  }
  /* the four islands of the film (TUNING). The camera looks from the south (+z) toward the north (-z): camp bottom left, lone tree bottom right, split rock top left, lighthouse top right (frame 02). sx = horizontal scale of the one island, sy = vertical. */
  const ISLANDS = [
    { id: 'camp', cx: -104, cz: 92, rot: 0.0, sx: 0.8, sy: 1.0 },
    { id: 'tree', cx: 112, cz: 80, rot: -0.35, sx: 0.5, sy: 0.8 },
    { id: 'rockA', cx: -108, cz: -104, rot: 0.6, sx: 0.30, sy: 2.7 },
    { id: 'rockB', cx: -86, cz: -112, rot: 2.3, sx: 0.24, sy: 3.1 },
    { id: 'light', cx: 104, cz: -100, rot: Math.PI, sx: 0.65, sy: 1.3 }
  ];
  function makeIslands(D, list) {
    list = list || ISLANDS;
    const toLocal = (I, x, z) => { const dx = x - I.cx, dz = z - I.cz, c = Math.cos(I.rot), s = Math.sin(I.rot); return [(dx * c + dz * s) / I.sx, (-dx * s + dz * c) / I.sx]; };
    const F = {
      D, list, toLocal,
      /* ground height at (x, z), metres above the mean sea level; -40 in open water */
      groundAt(x, z) {
        let best = -40;
        for (const I of list) { const l = toLocal(I, x, z), m = Math.max(Math.abs(l[0]), Math.abs(l[1])); if (m >= D.half) continue; const h = localH(D, l[0], l[1]) * I.sy, f = sm((m - 100) / 28), v = lerp(h, -40, f); if (v > best) best = v; }
        return best;
      },
      groundClass(x, z) {
        let c = 0, bm = 1e9;
        for (const I of list) { const l = toLocal(I, x, z), m = Math.max(Math.abs(l[0]), Math.abs(l[1])); if (m >= D.half || m >= bm) continue; bm = m; c = D.g[clamp(Math.round((l[1] + D.half) / D.dx), 0, D.nx - 1) * D.nx + clamp(Math.round((l[0] + D.half) / D.dx), 0, D.nx - 1)]; }
        return c;
      },
      /* the highest point of an island (a coarse scan), world x, z, height */
      peak(id) {
        const I = list.find(q => q.id === id); let b = [I.cx, I.cz, -40];
        for (let a = -60; a <= 60; a += 2) for (let c = -60; c <= 60; c += 2) { const l = [a, c], h = localH(D, l[0], l[1]) * I.sy, cs = Math.cos(-I.rot), sn = Math.sin(-I.rot), wx = I.cx + (l[0] * I.sx) * Math.cos(I.rot) - (l[1] * I.sx) * Math.sin(I.rot), wz = I.cz + (l[0] * I.sx) * Math.sin(I.rot) + (l[1] * I.sx) * Math.cos(I.rot); if (h > b[2]) b = [wx, wz, h]; void cs; void sn; }
        return b;
      },
      /* march from (x, z) along (dx, dz) until the ground falls under h0: the shore point on that line (world x, z) or null */
      shoreAlong(x, z, dx, dz, h0, maxD) {
        const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; let seen = false;
        for (let d = 0; d <= (maxD || 200); d += 0.5) { const px = x + dx * d, pz = z + dz * d, h = F.groundAt(px, pz); if (h > h0) seen = true; else if (seen) return [px, pz]; }
        return null;
      }
    };
    return F;
  }
  /* the fixed landmarks of the film (world metres), found from the island field so they sit on real ground. Deterministic. */
  function buildLayout(F) {
    const camp = F.list.find(i => i.id === 'camp'), toC = [-camp.cx, -camp.cz];
    /* jetty: from the camp island's shore on the side facing the middle of the four islands, 34 m out. Start the ray at the island's highest point. */
    const pk = F.peak('camp'), shore = F.shoreAlong(pk[0], pk[1], toC[0] + 0, toC[1], 0.35, 200) || [pk[0] + 30, pk[1] - 30];
    const dir = [-shore[0], -shore[1] - 0], dl = Math.hypot(dir[0], dir[1]); dir[0] /= dl; dir[1] /= dl;
    const root = [shore[0] - dir[0] * 4, shore[1] - dir[1] * 4], tip = [root[0] + dir[0] * 38, root[1] + dir[1] * 38];
    const lp = F.peak('light'), tp = F.peak('tree');
    return { jetty: { root, tip, dir, deckY: 1.7, width: 3.2 }, lighthouse: { x: lp[0], z: lp[1], baseY: lp[2], height: 15 }, tree: { x: tp[0], z: tp[1], baseY: tp[2] }, campPeak: pk, vortex: { x: VORT.x, z: VORT.z, R: VORT.R } };
  }

  /* ---------------------------------------------------------------- 5. light and the THREE adapter ---------------------------------------------------------------- */
  /* the sky and light look at a sample (from director.at(t)): sun direction from the elevation and azimuth tracks, and the authored colours. Pure: arrays in, arrays out. */
  function skyLook(sample) {
    const s = sample.s, v = sample.v, el = (s.sunElev || 0) * DEG, az = (s.sunAz || 0) * DEG, ce = Math.cos(el);
    const sunDir = [Math.sin(az) * ce, Math.sin(el), -Math.cos(az) * ce], l = Math.hypot(sunDir[0], sunDir[1], sunDir[2]) || 1;
    const day = sm((s.sunElev + 6) / 10);
    return {
      sunDir: [sunDir[0] / l, sunDir[1] / l, sunDir[2] / l], sunElev: s.sunElev, sunI: s.sunI !== undefined ? s.sunI : day, hor: v.hor, zen: v.zen, cloud: v.cloud, fogC: v.fogC, sunCol: v.sunCol, deep: v.deep, shal: v.shal,
      fog: s.fog, cover: s.cover, exposure: s.exposure !== undefined ? s.exposure : 1, rainbow: s.rainbow || 0, rbAz: s.rbAz === undefined ? 220 : s.rbAz, rays: (s.rays || 0) * sm((s.sunElev + 2) / 3), dark: s.dark || 0, rain: s.rain || 0, beam: s.beam || 0, windows: s.windows || 0,
      stars: s.stars || 0, fade: s.fade || 0, lightning: s.lightning || 0, lens: s.lens || 0, smoke: s.smoke || 0
    };
  }
  /* a lightning level at film time t from the 'flash' cues (arg = strength): exp decay with a short second pulse, a pure function of t */
  function flashAt(director, t) {
    let f = 0; for (const c of director.cues) { if (c.name !== 'flash') continue; const d = t - c.t; if (d < 0 || d > 0.8) continue; const a = c.arg === undefined ? 1 : c.arg; f = Math.max(f, a * (Math.exp(-d * 9) + (d > .22 ? .7 * Math.exp(-(d - .22) * 14) : 0))); }
    return Math.min(1.2, f);
  }
  /* drive a THREE camera from the director. opts.camera = a THREE.PerspectiveCamera, opts.floor(x, z, t) -> the surface the camera must stay 0.5 m above (sea and ground), opts.margin (default 0.5).
     apply(t) returns {sample, clamped}: the camera is moved up (never down) when the authored path dips under the floor, and lookAt keeps the authored target. */
  function attachThree(director, opts) {
    const cam = opts.camera, floor = opts.floor, margin = opts.margin === undefined ? .5 : opts.margin;
    return {
      director, camera: cam, clampedFrames: 0,
      apply(t, userCam) {
        const sm0 = director.at(t); const p = sm0.camera.pos.slice(); let clamped = false;
        if (userCam) { /* the debug camera: leave the camera alone */ return { sample: sm0, clamped: false }; }
        if (floor) { const fl = floor(p[0], p[2], t) + margin; if (p[1] < fl) { p[1] = fl; clamped = true; this.clampedFrames++; } }
        cam.position.set(p[0], p[1], p[2]); cam.lookAt(sm0.camera.target[0], sm0.camera.target[1], sm0.camera.target[2]);
        if (cam.fov !== sm0.camera.fov) { cam.fov = sm0.camera.fov; cam.updateProjectionMatrix(); }
        return { sample: sm0, clamped };
      }
    };
  }
  /* test and debug helper: every violation of "camera above floor + margin" along the authored path, sampled every step seconds. floor(x, z, t) */
  function cameraViolations(director, floor, step, margin) {
    margin = margin === undefined ? .5 : margin; const bad = [];
    for (let t = 0; t <= director.duration + 1e-9; t += step) { const p = director.at(t).camera.pos, fl = floor(p[0], p[2], t) + margin; if (!(p[1] >= fl - 1e-9)) bad.push({ t, y: p[1], floor: fl }); }
    return bad;
  }

  /* the staged Great Wash: the broken jetty section (the last 14 m of the jetty, u 24 to 38) breaks at TB, rides the crest toward the camp shore and strands near the jetty root. A closed form of t (no physics): [x, z, yaw, state] with state 0 = on the jetty, 1 = drifting, 2 = aground. */
  const STAGE = { tb: 50.3, speed: 3.0, sEnd: 9.4, spin: 0.12 };
  function sectionPose(layout, t) {
    const J = layout.jetty, d = J.dir, u0 = 31, x0 = J.root[0] + d[0] * u0, z0 = J.root[1] + d[1] * u0, yaw0 = -Math.atan2(d[1], d[0]), c = [Math.cos(CREST.dirDeg * DEG), Math.sin(CREST.dirDeg * DEG)];
    const s = clamp(t - STAGE.tb, 0, STAGE.sEnd), r = s < 1 ? s * s : s;   /* eases off the deck in the first second */
    const m = s < 1 ? s * s * STAGE.speed / 2 + 0 : STAGE.speed * (s - .5) , sway = Math.sin(s * .6) * 1.6;
    return [x0 + c[0] * m - c[1] * sway * .3, z0 + c[1] * m + c[0] * sway * .3, yaw0 + STAGE.spin * s * (r > 0 ? 1 : 0), t < STAGE.tb ? 0 : (t - STAGE.tb < STAGE.sEnd ? 1 : 2)];
  }

  /* ---------------------------------------------------------------- 6. the film ---------------------------------------------------------------- */
  /* the 90 s opening as data. layout = buildLayout(field); field (optional) lets near-ground camera keys be lifted to ground + 1 m at build time (so the authored path never starts inside an island). Every number is TUNING. */
  function defaultFilm(layout, field) {
    const J = layout.jetty, d = J.dir, pp = [-d[1], d[0]], LH = layout.lighthouse;
    const jp = (u, w, y) => [J.root[0] + d[0] * u + pp[0] * w, y, J.root[1] + d[1] * u + pp[1] * w];   /* the jetty frame: u along the jetty seaward, w toward the island (land side), y world */
    const up = (p, lift) => { if (field) p[1] = Math.max(p[1], field.groundAt(p[0], p[2]) + (lift === undefined ? 1 : lift)); return p; };
    const at3 = (t, y) => { const q = sectionPose(layout, t); return [q[0], y, q[1]]; };
    const lampTop = [LH.x, LH.baseY + LH.height - 1, LH.z];
        const hulk = layout.hulk, camp = layout.campView, RP = layout.repair;
    const k = (t, v, o) => Object.assign({ t, v }, o || {});
    const c = o => Object.assign({ cut: true }, o);
    const shots = [
      { id: 'night-watch', t0: 0, t1: 9, frame: '01', note: 'skim at swell height; the beam finds a small lit boat' },
      { id: 'first-light', t0: 9, t1: 20, frame: '02', note: 'beam to gold strip; climb until four islands surround the middle' },
      { id: 'working-quay', t0: 20, t1: 36, frame: '03', note: 'evening on the finished jetty; a crate, four bays, a taut rope' },
      { id: 'long-swell', t0: 36, t1: 47, frame: '04', note: 'follow the rope out; the swell hides the far shore' },
      { id: 'great-wash', t0: 47, t1: 59, frame: '05', note: 'wide and steady; the crest, the snag, the raft' },
      { id: 'wrack-line', t0: 59, t1: 70, frame: '06', note: 'grey dawn; the hulk, still robots, a rainbow' },
      { id: 'arrival', t0: 70, t1: 81, frame: '07', note: 'rowing speed over the bow; the piles slide apart' },
      { id: 'first-repair', t0: 81, t1: 90, frame: '08', note: 'a battery, a lens light, a relay click' }
    ];
    const pos = [
      /* 1 night watch */ k(0, [40, 3.4, 150]), k(4.5, [50, 3.4, 116]), k(9, [58, 3.6, 92]),
      /* 2 first light (cut: a dissolve) */ k(9, [34, 3.9, 148], c()), k(13.5, [14, 20, 178]), k(20, [0, 58, 232]),
      /* 3: from the land beside the quay: bays, hut, fire and the deck with its robots in one frame (a slow dolly), then a cut to 4, which follows the rope out */ k(20, up(jp(-6, 10.4, 4.6), 1.4), c()), k(28, up(jp(-3, 10, 4.4), 1.4)), k(35.99, up(jp(0, 9.6, 4.2), 1.4)), k(36, up(jp(24, -2.2, 3.7), .9), c()), k(38.5, up(jp(40, -2.6, 3.8), .9)), k(42.5, up(jp(52, -3, 3.9), .9)), k(46.99, up(jp(62, -3.4, 4.1), .9)),
      /* 5 great wash */ k(47, [30, 24, 40], c()), k(52, [10, 19, 38]), k(55.5, [-28, 13, 26]), k(58.99, [-50, 11, 28]),
      /* 6 wrack line */ k(59, up(jp(2, 9.6, 0), 1.6), c()), k(64.5, up(jp(4, 9.5, 0), 1.6)), k(69.99, up(jp(6, 9.4, 0), 1.6)),
      /* 7 arrival */ k(70, up(jp(34, -22, 2.5), 0.5), c()), k(75.5, up(jp(18, -14, 2.5), 0.5)), k(80.99, up(jp(5, -7, 2.6), 0.5)),
      /* 8 first repair */ k(81, RP.cam, c()), k(86.4, [RP.cam[0] + RP.f[0] * .05, RP.cam[1], RP.cam[2] + RP.f[1] * .05]), k(90, [RP.cam[0] + RP.f[0] * .08, RP.cam[1], RP.cam[2] + RP.f[1] * .08])
    ];
    const tgt = [
      k(0, lampTop), k(4.5, [LH.x - 12, 12, LH.z + 30]), k(9, lampTop),
      k(9, lampTop, c()), k(13.5, [40, 6, -30]), k(20, [0, 0, -20]),
      k(20, jp(10.5, 8.8, 1.8), c()), k(28, jp(12.5, 8.4, 1.8)), k(35.99, jp(15, 7.0, 1.6)), k(36, jp(36, -3, 2.2), c()), k(38.5, jp(58, -4, 1.8)), k(42.5, [LH.x - 20, 2.2, LH.z + 40]), k(46.99, [LH.x - 10, 4, LH.z + 20]),
      k(47, [-20, 2, 18], c()), k(52, [-58, 3, 42]), k(55.5, at3(55.5, 1.4)), k(58.99, at3(58.99, 1.2)),
      k(59, jp(22, 9.4, 2.0), c()), k(64.5, jp(24, 10.4, 2.0)), k(69.99, jp(26, 11.6, 2.1)),
      k(70, jp(2, 0, 3), c()), k(75.5, jp(1, 1, 3.3)), k(80.99, jp(0, 2, 3.4)),
      k(81, RP.tgt, c()), k(90, RP.tgt)
    ];
    const fov = [k(0, 50), k(9, 50), k(9, 52, c()), k(20, 44), k(20, 68, c()), k(35.99, 64), k(36, 54, c()), k(46.99, 50), k(47, 46, c()), k(59, 46), k(59, 50, c()), k(70, 50), k(70, 48, c()), k(81, 50), k(81, 40, c()), k(90, 36)];
    const T = {
      seaSwell: [k(0, .10), k(30, .10), k(37, .35), k(44, .85), k(49, .3), k(53, 0), k(90, 0)],
      seaStorm: [k(0, 0), k(43, 0), k(47.5, .7), k(50.5, 1), k(57, .95), k(60, .35), k(63, 0), k(90, 0)],
      seaAfter: [k(0, 0), k(57, 0), k(60, .8), k(64, .8), k(70, .45), k(78, .25), k(82, .1), k(90, .05)],
      crest: [k(0, 0), k(46, 0), k(48.5, 2.5), k(50.5, 6.5), k(53, 4.5), k(56, 1.5), k(58.5, 0), k(90, 0)],
      vortex: [k(0, 0), k(46, 0), k(49, .35), k(54, 1), k(58, .8), k(62, .3), k(66, .28), k(72, .18), k(80, .05), k(85, 0), k(90, 0)],
      wind: [k(0, CREST.dirDeg), k(90, CREST.dirDeg)],
      raft: [k(0, 0), k(53.6, 0), k(56.6, 1), k(90, 1)],
      sunElev: [k(0, -14), k(8, -9.5), k(9, -9, c()), k(12, -3), k(16, 1.5), k(20, 4), k(20, 4.2, c()), k(28, 2.4), k(36, 1.2), k(40, 0), k(44, -2), k(47, -2), k(47, -3, c()), k(59, -3), k(59, 2.2, c()), k(65, 3), k(70, 4), k(70, 3.6, c()), k(81, 8), k(90, 9)],
      sunAz: [k(0, 40), k(90, 40)],
      sunI: [k(0, 0), k(9, 0), k(13, .25), k(20, 1), k(20, 1.1, c()), k(36, .9), k(44, .35), k(47, .25), k(47, .2, c()), k(59, .25), k(59, .7, c()), k(70, 1.1), k(70, 1.3, c()), k(90, 1.5)],
      fog: [k(0, .0016), k(20, .0012), k(36, .0014), k(44, .0028), k(47, .0044), k(59, .0042), k(59, .0022, c()), k(70, .0016), k(81, .0010), k(90, .0008)],
      cover: [k(0, .8), k(20, .6), k(36, .8), k(47, 1), k(59, 1), k(59, .8, c()), k(70, .6), k(90, .5)],
      exposure: [k(0, 1.7), k(9, 1.5), k(13, 1.0), k(20, .85), k(44, .95), k(48, 1.35), k(58, 1.3), k(59, .95, c()), k(90, .9)],
      dark: [k(0, .5), k(20, 0), k(36, .1), k(47, .6), k(59, .5), k(59, .1, c()), k(66, 0), k(90, 0)],
      rain: [k(0, 0), k(47, .2), k(50, 1), k(57, .8), k(59, 0), k(59.01, 0, c()), k(90, 0)],
      rays: [k(0, 0), k(11, .3), k(17, .8), k(20, .6), k(36, .5), k(44, .2), k(47, 0), k(59, 0), k(59.01, .1, c()), k(70, .5), k(90, .5)],
      rainbow: [k(0, 0), k(60.5, 0), k(63.5, .9), k(66, 1), k(70, 1), k(78, .6), k(84, 0), k(90, 0)],
      rbAz: [k(0, 220), k(59, 220), k(59, 60, c()), k(70, 60), k(70, 220, c()), k(90, 220)],   /* where the bow stands (azimuth): over the sea ahead of the camera in the wrack-line shot, behind the bow of the boat in the arrival */
      beam: [k(0, 1), k(9, 1), k(14, .5), k(18, .1), k(20, 0), k(40, .05), k(44, .7), k(47, 1), k(59, 1), k(59, .3, c()), k(62, 0), k(90, 0)],
      beamAz: [k(0, 45), k(90, 3645)],
      windows: [k(0, .8), k(9, .6), k(13, 0), k(20, .2), k(22, .8), k(47, .9), k(59, .2, c()), k(65, 0), k(90, 0)],
      stars: [k(0, .8), k(9, .5), k(13, 0), k(90, 0)],
      smoke: [k(0, .6), k(47, .6), k(52, .1), k(59, .1, c()), k(90, .1)],
      lens: [k(0, 0), k(86.35, 0), k(86.55, 1), k(90, 1)],
      fade: [k(0, 1), k(1.2, 0), k(8.4, 0), k(9, 1), k(9.6, 0), k(69.4, 0), k(70, 1), k(70.6, 0), k(90, 0)]
    };
    const V = {
      hor: [k(0, [.10, .06, .16]), k(9, [.12, .07, .17]), k(14, [.50, .26, .20]), k(20, [.58, .33, .24]), k(20, [.62, .30, .16], c()), k(36, [.52, .25, .17]), k(44, [.28, .17, .20]), k(47, [.20, .13, .20]), k(47, [.20, .13, .20], c()), k(59, [.20, .13, .20]), k(59, [.50, .45, .44], c()), k(70, [.55, .42, .32]), k(70, [.60, .38, .24], c()), k(90, [.62, .40, .24])],
      zen: [k(0, [.015, .012, .05]), k(9, [.02, .015, .06]), k(14, [.10, .12, .26]), k(20, [.13, .15, .30]), k(20, [.10, .12, .28], c()), k(36, [.08, .09, .20]), k(44, [.05, .05, .12]), k(47, [.035, .03, .08]), k(59, [.035, .03, .08]), k(59, [.20, .24, .34], c()), k(70, [.18, .22, .36]), k(70, [.14, .19, .38], c()), k(90, [.16, .20, .38])],
      cloud: [k(0, [.10, .06, .16]), k(9, [.12, .07, .18]), k(14, [.55, .30, .30]), k(20, [.62, .36, .34]), k(20, [.65, .34, .30], c()), k(36, [.50, .26, .28]), k(44, [.22, .13, .24]), k(47, [.12, .10, .17]), k(59, [.12, .10, .17]), k(59, [.46, .43, .46], c()), k(70, [.60, .44, .42]), k(70, [.68, .42, .36], c()), k(90, [.72, .46, .36])],
      fogC: [k(0, [.05, .04, .09]), k(9, [.06, .045, .10]), k(14, [.40, .26, .24]), k(20, [.45, .32, .28]), k(20, [.48, .30, .24], c()), k(36, [.40, .26, .22]), k(44, [.24, .17, .21]), k(47, [.17, .13, .18]), k(59, [.17, .13, .18]), k(59, [.46, .46, .48], c()), k(70, [.52, .42, .36]), k(70, [.54, .38, .30], c()), k(90, [.55, .38, .28])],
      deep: [k(0, [.004, .012, .03]), k(9, [.005, .014, .035]), k(14, [.01, .06, .1]), k(20, [.01, .07, .11]), k(36, [.01, .06, .1]), k(44, [.008, .04, .07]), k(47, [.006, .03, .05]), k(59, [.006, .03, .05]), k(59, [.012, .06, .09], c()), k(90, [.012, .075, .11])],
      shal: [k(0, [.01, .04, .07]), k(9, [.012, .045, .08]), k(14, [.04, .2, .24]), k(20, [.05, .25, .28]), k(36, [.04, .22, .25]), k(47, [.02, .1, .13]), k(59, [.02, .1, .13]), k(59, [.05, .2, .22], c()), k(90, [.05, .26, .28])],
      sunCol: [k(0, [.3, .3, .6]), k(14, [2.4, 1.5, .9]), k(20, [3, 1.9, 1.1]), k(20, [3.2, 1.7, .8], c()), k(36, [3, 1.4, .7]), k(47, [1.6, .9, .7]), k(59, [1.6, .9, .7]), k(59, [1.6, 1.3, 1], c()), k(70, [2.4, 1.6, 1]), k(70, [3, 1.8, 1], c()), k(90, [3.2, 1.9, 1])]
    };
    const cues = [];
    const cue = (t, name, arg) => cues.push(arg === undefined ? { t, name } : { t, name, arg });
    for (let i = 0; i < 4; i++) cue(5 + i * 9 - 9 + 9, 'beam-sweep', i);   /* 5, 14 (faded), 23, 32 sweeps (the beam is dark by day: the sound still marks the lamp) */
    cue(4.6, 'boat-lamp'); cue(9.6, 'dawn-bell'); cue(24, 'winch', 1); cue(31, 'crate-set'); cue(35.6, 'rope-taut'); cue(41, 'swell-rise');
    [[46.2, .6], [48.9, 1], [49.4, .7], [51.6, 1], [52.1, .6], [55.8, .9], [56.3, .5]].forEach(a => cue(a[0], 'flash', a[1]));
    cue(46.9, 'thunder', .5); cue(49.9, 'thunder', 1); cue(52.6, 'thunder', .8); cue(56.9, 'thunder', .6);
    cue(CREST.tc, 'crest'); cue(53.8, 'snag'); cue(55, 'raft-turn'); cue(59, 'roar-cut');
    cue(61.5, 'drip'); cue(65.2, 'drip'); cue(68, 'drip'); cue(64, 'rainbow');
    for (let t = 71; t < 81; t += 3.2) cue(Math.round(t * 10) / 10, 'oar');
    cue(76.5, 'piles-slide'); cue(85.4, 'battery-seat'); cue(86.4, 'relay'); cue(86.4, 'key'); cue(87, 'winch', 2);
    return { version: 1, name: 'gift-opening', duration: 90, shots, camera: { pos, target: tgt, fov }, tracks: T, vtracks: V, cues };
  }
  /* the layout is built by buildLayout; the film also needs the beach views, so they are added here from the same field (world metres) */
  function buildLayoutFull(F) {
    const L = buildLayout(F), J = L.jetty, d = J.dir, pp = [-d[1], d[0]];
    const jp = (u, w) => [J.root[0] + d[0] * u + pp[0] * w, J.root[1] + d[1] * u + pp[1] * w];
    /* the hulk lies aground on the east beach of the camp island, 15 m long, parallel to the shore (the shore there runs along the jetty direction): jetty frame u 24.5, w 15.5. The camera of the wrack line stands on the beach near the fire. */
    const hp = jp(26.5, 15.8);
    L.hulk = { x: hp[0], z: hp[1], yaw: Math.atan2(d[1], d[0]), len: 15, mid: [hp[0], 3.4, hp[1]], u: 26.5, w: 15.8 };
    L.campView = { a: [].concat(jp(8.5, 11.4), []), b: [].concat(jp(10.5, 11.0), []), c: [].concat(jp(12.5, 11.6), []) };
    for (const k of ['a', 'b', 'c']) L.campView[k] = [L.campView[k][0], 4.4, L.campView[k][1]];
    /* the repair robot stands on the apron, facing the land (toward the camera); its battery socket is on its local +z side. theta is THREE rotation.y: forward = (cos t, -sin t), side (+z) = (sin t, cos t). */
    const rp = jp(5.6, 2.55), fx = pp[0] * .85 - d[0] * .35, fz = pp[1] * .85 - d[1] * .35, fl = Math.hypot(fx, fz), f = [fx / fl, fz / fl], th = Math.atan2(-f[1], f[0]), side = [Math.sin(th), Math.cos(th)];
    L.repair = { x: rp[0], z: rp[1], theta: th, f, side, scale: 1.35, cam: [rp[0] + f[0] * 1.5 + side[0] * 2.3, J.deckY + 1.5, rp[1] + f[1] * 1.5 + side[1] * 2.3], tgt: [rp[0] + f[0] * .15 + side[0] * .6, J.deckY + 1.25, rp[1] + f[1] * .15 + side[1] * .6] };
    L.boat = [62, -44]; L.jp = jp; return L;
  }

  const api = { TAU, DEG, clamp, lerp, sm, hash, Track, Director, CREST, VORT, seaParams, makeSeaClock, troughCompress, TROUGH, decodeIsland, makeIslands, ISLANDS, buildLayout, buildLayoutFull, sectionPose, STAGE, skyLook, flashAt, attachThree, cameraViolations, defaultFilm };
  return api;
}));
