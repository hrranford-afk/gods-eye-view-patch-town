/* Living Islands: weather and sky (see WEATHER_PASS.md, research/WEATHER_AND_SKY.md).
   Loaded by islands_look.html only with ?weather=<state|auto> (classic script, like seabed.js) and by node (import '../weather.js', then globalThis.LI_WEATHER).
   PART 1 is pure: state tables, the seeded schedule, lightning, Beaufort and sea state. No DOM, no three.js, no clocks.
   PART 2 is the browser runtime (sky dome, cloud puffs and deck, cloud shadows, rain, fog, light scaling, UI chip). It needs a global THREE (r128) and is only built when asked.
   Every number in STATES is TUNING, not a measurement (the research note says which ones have a source). Units are game metres and game hours. */
(function () {
  'use strict';
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  const sm = t => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash2(ix, iz, s) { let h = Math.imul(ix | 0, 374761393) + Math.imul(iz | 0, 668265263) + Math.imul(s | 0, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }

  /* ================= PART 1: pure model ================= */
  const STATES = ['clear', 'fair', 'overcast', 'showers', 'rain', 'fog', 'storm', 'goldenhour'];
  const DEFAULT_ANGLE = Math.atan2(-.89, .45);   /* the page's default wind vector (.45,-.89) as an angle; the sea shader's uWind */
  const CLOUD_H = 20;                            /* cloud base height above the table in game metres (diorama scale, not real) */
  const CLOUD_SPEED_K = .5;                      /* cloud and shadow speed = 0.5 x the wind (a real 10 m/s would cross the 200 m table in 20 s: too fast to read) */
  /* linear scene colours. skyH horizon, skyZ zenith, cL cloud lit, cS cloud shade. sunTint and hemiTint multiply the page's own light colours. */
  const T = {
    clear:      { cirrus: .8, tint: [1, 1, 1], deckH: 33, windMs: 3.5, cover: .06, deck: 0,   deckOp: 0,   deckDark: 0,  sunEl: 36, sunScale: 1.05, sunTint: [1, 1, 1], hemiScale: 1.0, hemiTint: [1, 1, 1], hemiDesat: 0,
                  skyH: [.22, .34, .50], skyZ: [.025, .09, .30], cL: [.98, .96, .92], cS: [.30, .38, .52], fogD: .00025, rain: 0, rainMm: 0, wet: 0, seaSun: 1.05, seaAmb: 1.0, seaSat: 1.0, seaBr: 1.0, glit: 1.0, cap: .25, swell: .6, shK: .55, flash: 0, sat: 1.16, con: 1.0, haze: .04, vis: 40000, surge: 0 },
    fair:       { cirrus: .3, tint: [1, 1, 1], deckH: 33, windMs: 6.5, cover: .62, deck: 0,   deckOp: 0,   deckDark: 0,  sunEl: 34, sunScale: 1.0, sunTint: [1, 1, 1], hemiScale: 1.0, hemiTint: [1, 1, 1], hemiDesat: 0,
                  skyH: [.24, .35, .50], skyZ: [.03, .10, .30], cL: [.98, .96, .92], cS: [.28, .36, .50], fogD: .0004, rain: 0, rainMm: 0, wet: 0, seaSun: 1.0, seaAmb: 1.0, seaSat: 1.0, seaBr: 1.0, glit: 1.0, cap: 1.0, swell: 1.0, shK: .62, flash: 0, sat: 1.16, con: 1.0, haze: .05, vis: 30000, surge: 0 },
    overcast:   { cirrus: 0, tint: [.92,.98,1.1], deckH: 24, windMs: 7.0, cover: 0,   deck: .95, deckOp: .35,  deckDark: .15, sunEl: 30, sunScale: .26, sunTint: [1, .98, .95], hemiScale: 1.5, hemiTint: [1, 1, 1.02], hemiDesat: .6,
                  skyH: [.30, .33, .36], skyZ: [.20, .23, .27], cL: [.72, .76, .82], cS: [.30, .34, .42], fogD: .0010, rain: 0, rainMm: 0, wet: .1, seaSun: .2, seaAmb: 1.6, seaSat: .42, seaBr: 1.25, glit: 0, cap: .9, swell: 1.0, shK: .3, flash: 0, sat: .78, con: .9, haze: .16, vis: 12000, surge: 0 },
    showers:    { cirrus: 0, tint: [1,1,1], deckH: 26, windMs: 9.5, cover: .4,  deck: .35, deckOp: .4, deckDark: .5, sunEl: 28, sunScale: .62, sunTint: [1, .97, .92], hemiScale: 1.15, hemiTint: [1, 1, 1], hemiDesat: .25,
                  skyH: [.22, .27, .34], skyZ: [.07, .10, .18], cL: [.82, .84, .88], cS: [.22, .26, .33], fogD: .0013, rain: .45, rainMm: 2.0, wet: .55, seaSun: .6, seaAmb: 1.1, seaSat: .75, seaBr: 1.0, glit: .35, cap: 1.1, swell: 1.2, shK: .85, flash: 0, sat: .95, con: 1.0, haze: .12, vis: 8000, surge: 0 },
    rain:       { cirrus: 0, tint: [.92,.98,1.1], deckH: 12, windMs: 11,  cover: 0,   deck: 1.0, deckOp: .3, deckDark: .55, sunEl: 24, sunScale: .15, sunTint: [.95, .97, 1], hemiScale: 1.15, hemiTint: [.96, .98, 1], hemiDesat: .65,
                  skyH: [.17, .19, .22], skyZ: [.10, .12, .15], cL: [.50, .53, .57], cS: [.20, .22, .26], fogD: .0016, rain: .75, rainMm: 4.5, wet: 1.0, seaSun: .15, seaAmb: 1.35, seaSat: .4, seaBr: 1.05, glit: 0, cap: 1.2, swell: 1.3, shK: .3, flash: 0, sat: .72, con: .9, haze: .22, vis: 4000, surge: .1 },
    fog:        { cirrus: 0, tint: [.94,1,1.08], deckH: 12, windMs: 2.0, cover: 0,   deck: 0,   deckOp: 0,   deckDark: 0,  sunEl: 18, sunScale: .3,  sunTint: [1, .98, .94], hemiScale: 1.55, hemiTint: [1, 1, 1], hemiDesat: .75,
                  skyH: [.40, .43, .45], skyZ: [.33, .36, .39], cL: [.85, .86, .86], cS: [.45, .48, .50], fogD: .0058, rain: 0, rainMm: 0, wet: .35, seaSun: .3, seaAmb: 1.45, seaSat: .5, seaBr: 1.2, glit: 0, cap: .1, swell: .5, shK: .1, flash: 0, sat: .78, con: .85, haze: .35, vis: 400, surge: 0 },
    storm:      { cirrus: 0, tint: [.9,.97,1.1], deckH: 14, windMs: 21,  cover: 0,   deck: 1.0, deckOp: .5, deckDark: .85, sunEl: 20, sunScale: .1, sunTint: [.9, .95, 1], hemiScale: .85, hemiTint: [.9, .95, 1.05], hemiDesat: .5,
                  skyH: [.09, .11, .13], skyZ: [.035, .045, .06], cL: [.30, .32, .35], cS: [.08, .09, .11], fogD: .0032, rain: 1.0, rainMm: 9, wet: 1.0, seaSun: .1, seaAmb: .95, seaSat: .55, seaBr: .9, glit: 0, cap: 1.4, swell: 2.6, shK: .25, flash: 1, sat: .85, con: 1.05, haze: .25, vis: 1500, surge: .8 },
    goldenhour: { cirrus: .7, tint: [1, 1, 1], deckH: 33, windMs: 3.0, cover: .22, deck: 0,   deckOp: 0,   deckDark: 0,  sunEl: 7,  sunScale: 1.3, sunTint: [1, .62, .32], hemiScale: .9, hemiTint: [.72, .84, 1.1], hemiDesat: 0,
                  skyH: [.85, .45, .20], skyZ: [.08, .13, .30], cL: [1.0, .64, .42], cS: [.70, .36, .28], fogD: .0008, rain: 0, rainMm: 0, wet: 0, seaSun: 1.25, seaAmb: .85, seaSat: 1.1, seaBr: 1.0, glit: 1.8, cap: .3, swell: .6, shK: .75, flash: 0, sat: 1.22, con: 1.06, haze: .08, vis: 25000, surge: 0 }
  };
  const BEAUFORT = [.5, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];   /* lower m/s of force 1..12 (standard scale) */
  function beaufort(ms) { let f = 0; for (let i = 0; i < BEAUFORT.length; i++) if (ms >= BEAUFORT[i]) f = i + 1; return f; }
  /* sea from wind: Hs ~ 0.021 U^2 for a grown open sea, x0.55 for a short fetch (PLAUSIBLE); Tp ~ 0.6 U (cap 13 s); chop is the shader multiplier, 1.0 = the page's current sea look */
  function seaOf(ms) { return { hs: +(.021 * ms * ms * .55).toFixed(2), tp: +clamp(.6 * ms + 1.5, 2, 13).toFixed(1), chop: +clamp(Math.pow(ms / 6.5, 1.1), .3, 2.3).toFixed(3), beaufort: beaufort(ms) }; }
  const SAIL_MAX = { row: 3, sail: 5, work: 7 };   /* highest Beaufort force each boat goes out in (TUNING) */
  function params(name) {
    const s = T[name]; if (!s) throw new Error('unknown weather state ' + name);
    const o = JSON.parse(JSON.stringify(s)); o.name = name; o.index = STATES.indexOf(name); Object.assign(o, seaOf(o.windMs)); o.angle = DEFAULT_ANGLE; return o;
  }
  /* blend two parameter sets (numbers and number arrays); name/index follow the nearer one; angle takes the short way round */
  function lerpParams(a, b, k) {
    const o = {};
    for (const key in a) {
      const x = a[key], y = b[key];
      if (typeof x === 'number') o[key] = lerp(x, y, k);
      else if (Array.isArray(x)) o[key] = x.map((v, i) => lerp(v, y[i], k));
      else o[key] = k < .5 ? x : y;
    }
    if (typeof a.angle === 'number') { let d = b.angle - a.angle; d = Math.atan2(Math.sin(d), Math.cos(d)); o.angle = a.angle + d * k; }
    const se = seaOf(o.windMs); o.hs = se.hs; o.tp = se.tp; o.beaufort = se.beaufort;
    return o;
  }
  /* seeded Markov chain over the states. Weights follow the front sequence in the research note (TUNING). */
  const W = { clear: [1, 5, 2, 0, 0, 1, 0, 2], fair: [2, 3, 4, 2, 0, 1, 0, 2], overcast: [0, 1, 2, 1, 5, 1, 0, 0], rain: [0, 0, 2, 3, 1, 0, 2, 0], showers: [0, 4, 2, 1, 1, 0, 1, 1], fog: [1, 3, 3, 0, 0, 1, 0, 1], storm: [0, 1, 1, 5, 2, 0, 0, 0], goldenhour: [3, 3, 0, 0, 0, 0, 0, 0] };
  const DUR = { clear: [3, 8], fair: [4, 10], overcast: [3, 7], showers: [2, 4], rain: [3, 6], fog: [3, 7], storm: [2, 5], goldenhour: [.8, 1.2] };
  const VEER = { 'fair>overcast': -.26, 'clear>overcast': -.26, 'overcast>rain': .44, 'rain>showers': .96, 'showers>fair': .2, 'rain>storm': .17, 'overcast>storm': .17 };   /* radians; clockwise = positive (a veer) */
  const SCHED = new Map();
  function pick(R, w) { let s = 0; for (const v of w) s += v; let r = R() * s; for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; } return 1; }
  function extend(sc, hours) {
    const R = sc.R;
    while (sc.end < hours) {
      let st, ang;
      if (!sc.segs.length) { st = STATES[pick(R, [2, 4, 2, 0, 0, 1, 0, 0])]; ang = DEFAULT_ANGLE + (R() - .5) * 1.0; }
      else { const p = sc.segs[sc.segs.length - 1]; st = STATES[pick(R, W[p.state])]; ang = p.angle + (VEER[p.state + '>' + st] !== undefined ? VEER[p.state + '>' + st] : (R() - .5) * .28) + (R() - .5) * .12; }
      const d = DUR[st], dur = +(d[0] + (d[1] - d[0]) * R()).toFixed(3), wind = +(T[st].windMs * (.88 + .24 * R())).toFixed(2);
      const seg = { i: sc.segs.length, state: st, start: sc.end, dur, end: +(sc.end + dur).toFixed(3), windMs: wind, angle: +ang.toFixed(4), storm: st === 'storm' ? sc.storms++ : -1 };
      sc.segs.push(seg); sc.end = seg.end;
    }
  }
  function schedule(seed, hours) {
    seed = seed >>> 0; let sc = SCHED.get(seed);
    if (!sc) { sc = { R: mulberry32(seed * 2654435761 + 97), segs: [], end: 0, storms: 0 }; SCHED.set(seed, sc); }
    extend(sc, hours || 48); return sc.segs.filter(s => s.start < (hours || 48));
  }
  const BLEND_H = .4;   /* game hours a change of state takes */
  function segAt(seed, hour) { hour = Math.max(0, hour); schedule(seed, hour + 12); const sc = SCHED.get(seed >>> 0); for (const s of sc.segs) if (hour < s.end) return s; return sc.segs[sc.segs.length - 1]; }
  /* the blended weather at a game hour: a pure function of (seed, hour) */
  function at(seed, hour) {
    const a = segAt(seed, hour), sc = SCHED.get(seed >>> 0), half = BLEND_H / 2;
    const pa = (s) => { const p = params(s.state); p.windMs = s.windMs; p.angle = s.angle; Object.assign(p, seaOf(p.windMs)); return p; };
    let A = a, B = null, k = 0;
    if (hour >= a.end - half) { B = sc.segs[a.i + 1] || (extend(sc, a.end + 12), sc.segs[a.i + 1]); k = (hour - (a.end - half)) / BLEND_H; }
    else if (hour < a.start + half && a.i > 0) { A = sc.segs[a.i - 1]; B = a; k = .5 + (hour - a.start) / BLEND_H; }
    const out = B ? lerpParams(pa(A), pa(B), sm(k)) : pa(A);
    const near = (B && k >= .5) ? B : A; out.name = near.state; out.index = STATES.indexOf(near.state);
    out.segment = near.i; out.storm = near.storm; out.from = A.state; out.to = B ? B.state : A.state; out.k = B ? sm(k) : 0; out.hour = hour;
    return out;
  }
  /* lightning: a pure function of (seed, second). Slots of 4 s; a slot has a strike with probability rate*0.22; the flash is a double flicker. Returns 0..1. */
  function flash(seed, t, rate) {
    if (!(rate > 0) || t < 0) return 0; let f = 0; const k0 = Math.floor(t / 4);
    for (let k = k0 - 1; k <= k0; k++) { if (k < 0) continue; if (hash2(k, 11, seed >>> 0) >= rate * .22) continue; const t0 = k * 4 + hash2(k, 23, seed >>> 0) * 3.2, d = t - t0; if (d < 0 || d > 1.6) continue; f = Math.max(f, Math.exp(-d * 9), .75 * Math.exp(-Math.max(0, d - .16) * 11) * (d > .16 ? 1 : 0)); }
    return f;
  }
  const windVec = angle => [Math.cos(angle), Math.sin(angle)];
  const cloudSpeed = ms => CLOUD_SPEED_K * ms;
  const sailOk = ms => { const f = beaufort(ms); return { row: f <= SAIL_MAX.row, sail: f <= SAIL_MAX.sail, work: f <= SAIL_MAX.work }; };

  const API = { STATES, STATE_TABLE: T, DEFAULT_ANGLE, CLOUD_H, CLOUD_SPEED_K, BLEND_H, BEAUFORT, SAIL_MAX, params, lerpParams, schedule, at, segAt, flash, beaufort, seaOf, windVec, cloudSpeed, sailOk, mulberry32,
    hourSec: 20 /* real seconds per game hour in the page's auto mode (?wsec= changes it) */ };
  if (typeof globalThis !== 'undefined') globalThis.LI_WEATHER = API;
  if (typeof THREE === 'undefined') return;

  /* ================= PART 2: browser runtime (needs THREE r128) ================= */
  const NP = 32, NSUB = 5, RAIN_MAX = 1800;
  const NOISE_TEX = size => { /* tileable fbm, three channels */
    const S = size, out = [new Float32Array(S * S), new Float32Array(S * S), new Float32Array(S * S)];
    for (let c = 0; c < 3; c++) { const o = out[c]; for (let k = 0; k < 5; k++) { const f = 4 << k, amp = Math.pow(.55, k); for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const x = i / S * f, z = j / S * f, ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10); const h = (a, b) => hash2(((a % f) + f) % f, ((b % f) + f) % f, 4001 + c * 977 + k * 31); const a = h(ix, iz), b = h(ix + 1, iz), cc = h(ix, iz + 1), d = h(ix + 1, iz + 1); o[j * S + i] += amp * (a + (b - a) * ux + (cc - a) * uz + (a - b - cc + d) * ux * uz); } }
      let mn = 1e9, mx = -1e9; for (const v of o) { if (v < mn) mn = v; if (v > mx) mx = v; } for (let i = 0; i < o.length; i++) o[i] = (o[i] - mn) / (mx - mn); }
    const d = new Uint8Array(S * S * 4); for (let i = 0; i < S * S; i++) { d[i * 4] = out[0][i] * 255; d[i * 4 + 1] = out[1][i] * 255; d[i * 4 + 2] = out[2][i] * 255; d[i * 4 + 3] = 255; }
    const t = new THREE.DataTexture(d, S, S, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
  };
  let UN = null;
  function uniforms() {
    if (UN) return UN;
    UN = { uWN: { value: NOISE_TEX(256) }, uPuff: { value: Array.from({ length: NP }, () => new THREE.Vector4(0, 0, 0, 0)) }, uCD: { value: new THREE.Vector4(0, 0, 0, 0) }, uCP: { value: new THREE.Vector2(CLOUD_H, 1) },
      uWx0: { value: new THREE.Vector4(1, 1, 1, 1) }, uWx1: { value: new THREE.Vector4(1, 1, 1, 0) }, uWx2: { value: new THREE.Vector4(0, 0, 0, 0) },
      uSkyH: { value: new THREE.Vector3(.2, .3, .44) }, uSkyZ: { value: new THREE.Vector3(.02, .075, .26) }, uFogC: { value: new THREE.Vector3(.2, .3, .44) }, uFogD: { value: .0003 }, uWSun: { value: new THREE.Vector3(0, 1, 0) } };
    return UN;
  }
  /* GLSL shared by sea and land: cloud shadow = max of puff discs (uniform array, same shapes as the billboards) and deck noise, looked up where the sun ray meets the cloud height */
  const CORE = `uniform sampler2D uWN;uniform vec4 uPuff[${NP}];uniform vec4 uCD;uniform vec2 uCP;uniform vec4 uWx0,uWx1,uWx2;uniform vec3 uFogC;uniform float uFogD;
  float wxDeck(vec2 q){float a=texture2D(uWN,q*0.011).r,b=texture2D(uWN,q*0.027+vec2(0.37,0.61)).g;return a*0.62+b*0.38;}
  float wxMask(float d,float cov){return smoothstep(0.42,0.62,d+(cov-0.5));}
  float wxSh(vec2 p,vec3 L){
    vec2 pp=p+L.xz*(uCP.x/max(L.y,0.12));float s=0.0;
    for(int i=0;i<${NP};i++){vec4 c=uPuff[i];if(c.z<=0.0)continue;vec2 d=pp-c.xy;float r=c.z,dd=dot(d,d);if(dd>r*r)continue;s=max(s,(1.0-smoothstep(r*0.4,r,sqrt(dd)))*c.w);}
    s*=uCP.y;
    if(uCD.z>0.001){float dk=wxMask(wxDeck(pp-uCD.xy),uCD.z);s=max(s,dk*uCD.w);}
    return 1.0-s;}
  vec2 wxRain(vec2 p,float t,float fp,float k){
    if(k<0.02||fp>0.06)return vec2(0.0);vec2 g=vec2(0.0);float far=1.0-smoothstep(0.02,0.06,fp);
    for(int l=0;l<2;l++){float sc=(l==0)?1.9:3.3;vec2 q=p*sc+float(l)*17.3;vec2 c=floor(q);vec2 f=fract(q)-0.5;
      float h=fract(sin(dot(c,vec2(127.1,311.7)))*43758.5453),h2=fract(h*91.7);
      f-=(vec2(h,h2)-0.5)*0.5;float ph=fract(t*(0.8+0.6*h2)+h*7.0);float rr=ph*0.42,dl=length(f);
      float ring=exp(-pow((dl-rr)*13.0,2.0))*(1.0-ph)*step(h,0.25+0.6*k);g+=f/(dl+0.001)*ring*0.55;}
    return g*far*k;}`;
  const SEA_CHUNK = 'varying vec3 vW;' + CORE.replace('uniform vec3 uFogC;uniform float uFogD;', 'uniform vec3 uFogC,uSkyH,uSkyZ;uniform float uFogD;');
  function R(src, a, b) { if (!src.includes(a)) throw new Error('weather shader patch failed: ' + a.slice(0, 56)); return src.replace(a, b); }
  function patchSea(src) {
    src = R(src, 'varying vec3 vW;', SEA_CHUNK);
    src = R(src, 'vec3 hor=vec3(0.20,0.30,0.44),zen=vec3(0.02,0.075,0.26);', 'vec3 hor=uSkyH,zen=uSkyZ;');
    src = R(src, 'float gust=0.55+0.9*texture2D(uN,p*0.012+0.6).a;', 'float gust=(0.55+0.9*texture2D(uN,p*0.012+0.6).a)*uWx0.x;');
    src = R(src, 'rip(p,normalize(W+0.35*Wp),19.0,0.075*gust,', 'rip(p,normalize(W+0.35*Wp),19.0,0.075*gust*uWx0.w,');
    src = R(src, 'g*=mix(0.25,1.0,smoothstep(0.0,0.6,depth));', 'g+=wxRain(p,t,fp,uWx1.w)*0.9;g*=uWx0.x;g*=mix(0.25,1.0,smoothstep(0.0,0.6,depth));');
    src = R(src, 'float big=smoothstep(1.05,1.35,hn+', 'float big=smoothstep(1.05-0.35*(uWx0.y-1.0),1.35-0.35*(uWx0.y-1.0),hn+');
    src = R(src, 'float cap=max(tiny*0.5,big*0.6)*calm', 'float cap=min(1.0,max(tiny*0.5,big*0.6)*uWx0.y)*calm');
    src = R(src, 'float sunl=0.22+0.7*L.y*shadow+2.8*pow(max(dot(N,L),0.0),2.5)*shadow;', 'float cshd=wxSh(p,L);cshd*=cshd;float sunl=0.22*uWx1.y+(0.7*L.y*shadow+2.8*pow(max(dot(N,L),0.0),2.5)*shadow)*uWx1.x*cshd;');
    src = R(src, 'col+=vec3(2.2,1.9,1.55)*glit*shadow*calm', 'col+=vec3(2.2,1.9,1.55)*glit*shadow*cshd*uWx0.z*calm');
    src = R(src, 'gl_FragColor=vec4(col,alpha);', '{col=mix(col,col*vec3(0.80,0.92,1.14),(1.0-cshd)*0.85);float lc=dot(col,vec3(0.3,0.59,0.11));col=mix(vec3(lc),col,uWx1.z);col+=uWx2.y*vec3(0.30,0.34,0.50);float fg=1.0-exp(-uFogD*uFogD*dist*dist);col=mix(col,uFogC,fg);alpha=mix(alpha,1.0,fg);}gl_FragColor=vec4(col,alpha);');
    return src;
  }
  function attachSea(mat) { const u = uniforms(), m = mat.uniforms; for (const k of ['uWN', 'uPuff', 'uCD', 'uCP', 'uWx0', 'uWx1', 'uWx2', 'uSkyH', 'uSkyZ', 'uFogC', 'uFogD']) m[k] = u[k]; }
  function patchLand(sh) {
    const u = uniforms(); for (const k of ['uWN', 'uPuff', 'uCD', 'uCP', 'uWx0', 'uWx1', 'uWx2', 'uFogC', 'uFogD', 'uWSun']) sh.uniforms[k] = u[k];
    sh.fragmentShader = R(sh.fragmentShader, '#include <common>', '#include <common>\nuniform vec3 uWSun;' + CORE);
    sh.fragmentShader = R(sh.fragmentShader, 'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
      '{float cs=wxSh(vWP.xz,uWSun);float wetf=uWx2.x*smoothstep(-0.05,0.12,vWP.y-uTide);float dk=1.0-0.38*wetf;reflectedLight.directDiffuse*=cs*dk;reflectedLight.indirectDiffuse=reflectedLight.indirectDiffuse*dk+uWx2.y*vec3(0.20,0.22,0.32)*diffuseColor.rgb;}\nvec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;');
  }
  function patchPost(pm) {
    pm.uniforms.uSat = { value: 1.16 }; pm.uniforms.uCon = { value: 1 }; pm.uniforms.uHaze = { value: 0 }; pm.uniforms.uTint = { value: new THREE.Vector3(1, 1, 1) }; pm.uniforms.uHazeC = { value: new THREE.Vector3(.6, .65, .7) };
    let f = pm.fragmentShader;
    f = R(f, 'uniform float uFocus,uBand,uBlur,uExp,uTilt,uVig;', 'uniform float uFocus,uBand,uBlur,uExp,uTilt,uVig,uSat,uCon,uHaze;uniform vec3 uHazeC,uTint;');
    f = R(f, 'c=mix(vec3(l2),c,1.16);', 'c=mix(vec3(l2),c,uSat);c=(c-0.5)*uCon+0.5;c=mix(c,uHazeC,uHaze*smoothstep(0.25,1.0,uv.y));c*=uTint;');
    pm.fragmentShader = f;
  }
  const TONE = '\n#ifdef NOPOST\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n#endif\n';
  const LOOK = `
  vec2 wxLook(vec2 q,vec2 Lx,float cov){float d=wxDeck(q)*0.9+texture2D(uWN,q*0.071+vec2(0.8,0.2)).b*0.1;float ds=wxDeck(q+Lx*9.0)*0.9+texture2D(uWN,(q+Lx*9.0)*0.071+vec2(0.8,0.2)).b*0.1;
    float m=wxMask(d,cov);float lit=clamp(0.55+(d-ds)*5.5,0.0,1.0);return vec2(m,lit);}`;
  function build(scene, o) {
    const u = uniforms(), objs = {}, nopost = o.nopost, defs = nopost ? { NOPOST: 1 } : {};
    const common = 'uniform sampler2D uWN;uniform vec4 uCD;uniform vec3 uCl,uCs,uSkyH,uSkyZ,uSun,uFogC;uniform float uFogD,uCoverP,uDeckOp,uDeckDark,uFlash;';
    /* sky dome: follows the camera; gradient, sun glow, far clouds on a plane seen along the view ray */
    const dm = new THREE.Mesh(new THREE.SphereGeometry(1200, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, defines: defs,
      uniforms: { uWN: u.uWN, uCD: u.uCD, uCl: { value: new THREE.Vector3() }, uCs: { value: new THREE.Vector3() }, uSkyH: u.uSkyH, uSkyZ: u.uSkyZ, uSun: { value: o.sunDir }, uSunCol: { value: new THREE.Vector3(3, 1.85, 1.05) }, uFogC: u.uFogC, uFogD: u.uFogD, uCoverP: { value: 0 }, uDeckOp: { value: 0 }, uDeckDark: { value: 0 }, uFlash: { value: 0 }, uOff: { value: new THREE.Vector2() }, uGold: { value: 0 }, uCir: { value: 0 }, uCirD: { value: new THREE.Vector2(1, 0) } },
      vertexShader: 'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*viewMatrix*(modelMatrix*vec4(position,1.0));}',
      fragmentShader: `precision highp float;varying vec3 vD;${common}uniform vec3 uSunCol;uniform vec2 uOff;uniform float uGold,uCir;uniform vec2 uCirD;
      float wxDeck(vec2 q){float a=texture2D(uWN,q*0.011).r,b=texture2D(uWN,q*0.027+vec2(0.37,0.61)).g;return a*0.62+b*0.38;}
      float wxMask(float d,float cov){return smoothstep(0.42,0.62,d+(cov-0.5));}${LOOK}
      void main(){vec3 r=normalize(vD);float y=r.y;vec3 col=mix(uSkyH,uSkyZ,pow(max(y,0.0),0.5));
        float sd=max(dot(r,uSun),0.0);float glow=0.05*pow(sd,5.0)+0.6*pow(sd,160.0);col+=uSunCol*glow*(1.0-uDeckOp*0.9);
        if(y>0.0){vec2 q=r.xz/(y+0.07)*60.0-uOff*0.5;float cov=max(uCoverP*1.5,uCD.z);vec2 lk=wxLook(q,normalize(uSun.xz+vec2(0.001)),cov);float fade=smoothstep(0.0,0.22,y);
          if(uCir>0.01){vec2 qc=r.xz/(y+0.2)*40.0;float a=dot(qc,uCirD)*0.35,b=dot(qc,vec2(-uCirD.y,uCirD.x))*3.2;float f=texture2D(uWN,vec2(a*0.03,b*0.03)).r*0.6+texture2D(uWN,vec2(a*0.07+0.3,b*0.07)).g*0.4;
            float m=smoothstep(0.55,0.75,f)*uCir*smoothstep(0.02,0.25,y)*(1.0-smoothstep(0.7,1.0,y)*0.5);vec3 cc2=mix(uCl,vec3(1.0,0.78,0.6)*max(uCl.r,0.8),uGold);col=mix(col,cc2*0.95,m*0.7);}
          vec3 cc=mix(uCs*(1.0-uDeckDark*0.7),uCl*(1.0-uDeckDark*0.6),lk.y);col=mix(col,cc,lk.x*fade*(0.55+0.4*max(uDeckOp,uCoverP)));}
        else col=uSkyH*0.92;
        {vec2 sh=normalize(uSun.xz+vec2(0.001));float opp=clamp(-dot(normalize(r.xz+vec2(0.001)),sh),0.0,1.0);float band=smoothstep(0.0,0.07,y)*(1.0-smoothstep(0.1,0.34,y));
         col=mix(col,vec3(0.55,0.34,0.42),uGold*opp*band*0.8);col=mix(col,vec3(0.10,0.12,0.22),uGold*opp*(1.0-smoothstep(0.0,0.07,abs(y)))*0.4);}
        col+=uFlash*vec3(0.5,0.55,0.8)*0.5;gl_FragColor=vec4(col,1.0);${TONE}}` }));
    dm.renderOrder = -100; dm.frustumCulled = false; scene.add(dm); objs.dome = dm;
    /* cloud deck: one plane just above the islands, translucent, lit from the sun side by a second density tap */
    const dk = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, defines: defs,
      uniforms: { uWN: u.uWN, uCD: u.uCD, uCl: { value: new THREE.Vector3() }, uCs: { value: new THREE.Vector3() }, uSkyH: u.uSkyH, uSkyZ: u.uSkyZ, uSun: { value: o.sunDir }, uFogC: u.uFogC, uFogD: u.uFogD, uCoverP: { value: 0 }, uDeckOp: { value: 0 }, uDeckDark: { value: 0 }, uFlash: { value: 0 } },
      vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: `precision highp float;varying vec3 vW;${common}
      float wxDeck(vec2 q){float a=texture2D(uWN,q*0.011).r,b=texture2D(uWN,q*0.027+vec2(0.37,0.61)).g;return a*0.62+b*0.38;}
      float wxMask(float d,float cov){return smoothstep(0.42,0.62,d+(cov-0.5));}${LOOK}
      void main(){vec2 q=vW.xz-uCD.xy;vec2 lk=wxLook(q,normalize(uSun.xz+vec2(0.001))*1.0,uCD.z);
        vec3 V=cameraPosition-vW;float dist=length(V);float prox=smoothstep(2.0,9.0,abs(V.y));float far=1.0-smoothstep(500.0,1000.0,dist);
        float a=lk.x*uDeckOp*prox*far;if(a<0.003)discard;
        vec3 col=mix(uCs*(1.0-uDeckDark*0.6),uCl*(1.0-uDeckDark*0.5),lk.y);col*=0.8+0.25*lk.x;col+=uFlash*vec3(0.5,0.55,0.8)*0.6;
        float fg=1.0-exp(-uFogD*uFogD*dist*dist*0.3);col=mix(col,uFogC,fg);gl_FragColor=vec4(col,a);${TONE}}` }));
    dk.position.y = CLOUD_H + 3; dk.renderOrder = 9; dk.frustumCulled = false; scene.add(dk); objs.deck = dk;
    /* cumulus puffs: camera-facing quads, instanced, noise-warped edge, fake sphere light from the sun in view space */
    const geo = new THREE.InstancedBufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3)); geo.setIndex([0, 1, 2, 0, 2, 3]);
    const N = NP * NSUB; const aC = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3), aS = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); aC.setUsage(THREE.DynamicDrawUsage); aS.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aC', aC); geo.setAttribute('aS', aS); geo.instanceCount = 0;
    const pf = new THREE.Mesh(geo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, defines: defs,
      uniforms: { uWN: u.uWN, uCl: { value: new THREE.Vector3() }, uCs: { value: new THREE.Vector3() }, uSunV: { value: new THREE.Vector3(0, 1, 0) }, uUpV: { value: new THREE.Vector3(0, 1, 0) }, uFogC: u.uFogC, uFogD: u.uFogD, uFlash: { value: 0 }, uDark: { value: 0 } },
      vertexShader: 'attribute vec3 aC;attribute vec3 aS;varying vec2 vU;varying vec3 vP;varying vec3 vS;void main(){vec4 mv=viewMatrix*vec4(aC,1.0);vU=position.xy;vS=aS;mv.xy+=position.xy*aS.x;vP=mv.xyz;gl_Position=projectionMatrix*mv;}',
      fragmentShader: `precision highp float;varying vec2 vU;varying vec3 vP;varying vec3 vS;uniform sampler2D uWN;uniform vec3 uCl,uCs,uSunV,uUpV,uFogC;uniform float uFogD,uFlash,uDark;
      void main(){float r=length(vU);if(r>1.0)discard;float age=floor(vS.z),sd=fract(vS.z);float rag=age*0.5;
        vec2 nq=vU*0.5+sd*3.7;float n=texture2D(uWN,nq*0.35).r,n2=texture2D(uWN,nq*1.1+0.3).g,n3=texture2D(uWN,nq*2.7+0.6).b;
        float rr=r+(n-0.5)*(0.5+0.4*rag)+(n2-0.5)*(0.2+0.25*rag);float soft=0.3+0.32*rag;float a=(1.0-smoothstep(0.94-soft,0.94,rr))*vS.y*(1.0-0.3*rag);
        a*=smoothstep(-0.52,-0.43,vU.y);if(a<0.01)discard;
        vec3 N=vec3(vU+(vec2(n,n2)-0.5)*0.7+(n3-0.5)*0.6,sqrt(max(0.05,1.0-r*r)));N=normalize(N);
        float lit=clamp(dot(N,uSunV)*0.5+0.5,0.0,1.0);lit=lit*lit*(1.4-0.4*lit);lit*=0.85+0.3*n;
        float baseK=smoothstep(-0.45,0.15,vU.y);lit*=0.3+0.7*baseK;
        vec3 col=mix(uCs*0.85,uCl,clamp(lit,0.0,1.0))*(1.0-uDark*0.55);
        float rim=smoothstep(0.55,0.95,r)*clamp(dot(normalize(vU+vec2(0.001)),uSunV.xy)*1.6,0.0,1.0)*(1.0-baseK*0.6);col+=uCl*0.28*rim*(1.0-uDark);
        col+=uFlash*vec3(0.5,0.55,0.8)*0.5;
        float dist=length(vP);float fg=1.0-exp(-uFogD*uFogD*dist*dist*0.4);col=mix(col,uFogC,fg);gl_FragColor=vec4(col,a*0.9);${TONE}}` }));
    pf.renderOrder = 10; pf.frustumCulled = false; scene.add(pf); objs.puffs = pf;
    /* rain: instanced stretched quads in a box that follows the look target; fall and wrap in the vertex shader */
    const rg = new THREE.InstancedBufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0]), 3)); rg.setIndex([0, 1, 2, 0, 2, 3]);
    const rs = new Float32Array(RAIN_MAX * 4), rr = mulberry32(o.seed * 31 + 7); for (let i = 0; i < RAIN_MAX * 4; i++) rs[i] = rr();
    rg.setAttribute('aR', new THREE.InstancedBufferAttribute(rs, 4)); rg.instanceCount = 0;
    const rn = new THREE.Mesh(rg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, defines: defs,
      uniforms: { uT: { value: 0 }, uCtr: { value: new THREE.Vector3() }, uV: { value: new THREE.Vector2() }, uAlpha: { value: .4 }, uCol: { value: new THREE.Vector3(.8, .85, .95) }, uLen: { value: 1.8 }, uPx: { value: .001 }, uFogC: u.uFogC, uFogD: u.uFogD },
      vertexShader: `attribute vec4 aR;uniform float uT,uLen,uPx;uniform vec3 uCtr;uniform vec2 uV;varying float vA;varying float vFog;varying float vY;
      void main(){float B=92.0,Hh=58.0;float fall=15.0*(0.85+0.3*aR.w);vec3 vel=vec3(uV.x,-fall,uV.y);
        vec2 p0=vec2(aR.x,aR.z)*2.0*B+vel.xz*uT;p0=uCtr.xz+mod(p0-uCtr.xz+B,2.0*B)-B;float y=mod(aR.y*Hh-fall*uT,Hh)+0.5;
        vec3 P=vec3(p0.x,y,p0.y);vec3 dir=normalize(vel);vec4 a=viewMatrix*vec4(P,1.0),b=viewMatrix*vec4(P-dir*uLen,1.0);
        vec2 t2=b.xy-a.xy;float tl=length(t2);t2=tl>1e-4?t2/tl:vec2(0.0,1.0);vec2 n2=vec2(-t2.y,t2.x);float k=position.y;vec4 v=mix(a,b,k);v.xy+=n2*position.x*uPx*(-v.z);
        vY=y;vA=0.5+0.5*aR.w;vFog=length(v.xyz);gl_Position=projectionMatrix*v;}`,
      fragmentShader: `precision highp float;varying float vA;varying float vFog;varying float vY;uniform float uAlpha,uFogD;uniform vec3 uCol,uFogC;
      void main(){float fg=1.0-exp(-uFogD*uFogD*vFog*vFog*0.5);vec3 c=mix(uCol,uFogC,fg*0.7);float a=uAlpha*vA*(1.0-fg*0.5)*smoothstep(0.0,3.0,vY);gl_FragColor=vec4(c,a);${TONE}}` }));
    rn.renderOrder = 11; rn.frustumCulled = false; scene.add(rn); objs.rain = rn;
    return objs;
  }
  /* the runtime: one per page. opt: { THREE scene getter, camera, sunDir, setSun(el,azDeg), seed, mode ('auto' or a state name), nopost, wt (frozen seconds or null), baseSun, baseHemi } */
  function create(opt) {
    const u = uniforms(); let objs = null, scene = null, sun = null, hemi = null, postMat = null, seaMat = null, fogOn = false;
    const rt = { mode: opt.mode, auto: opt.mode === 'auto', hourSec: opt.hourSec || API.hourSec, t: 0, along: 0, cur: params(opt.mode === 'auto' ? 'fair' : opt.mode), from: null, to: null, k: 1, trans: 3.5, frozen: opt.wt != null, flash: 0, hour0: opt.hour0 || 6, snap: null };
    rt.to = rt.cur; const seed = opt.seed >>> 0;
    const R0 = mulberry32(seed * 7919 + 13), puffs = Array.from({ length: NP }, () => ({ s0: R0(), c: R0() * 2 - 1, thr: 0, R: 3 + 10 * Math.pow(R0(), 2.0), age: (() => { const a = R0(); return a < .6 ? 0 : a < .9 ? 1 : 2; })(), h: R0() * 4, subs: Array.from({ length: NSUB }, (_, j) => ({ a: R0() * 6.283, d: j === 0 ? 0 : .35 + .55 * R0(), sz: j === 0 ? 1 : .45 + .4 * R0(), dy: j === 0 ? .5 : .15 + .5 * R0() })) }));
    const rareOn = hash2(seed, 99, 7) < .1, big = (opt.islands || []).slice().sort((a, b) => (b.rx || b.Ra || 0) - (a.rx || a.Ra || 0))[0];
    const ord = puffs.map((_, i) => i).sort((a, b) => hash2(a, 5, seed) - hash2(b, 5, seed)); ord.forEach((pi, rank) => { puffs[pi].thr = (rank + .5) / NP; });
    if (rt.frozen) { rt.t = opt.wt; }
    const lum = c => .3 * c[0] + .59 * c[1] + .11 * c[2];
    const aces = x => { x *= .9 * .95; return Math.pow(clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0, 1), 1 / 2.2); };
    function target0() {   /* the parameter set for this instant */
      if (rt.auto) { const hr = rt.hour0 + rt.t / rt.hourSec; const p = opt.atFn ? (opt.atFn(seed, hr) || at(seed, hr)) : at(seed, hr); return p; }   /* opt.atFn: the macro sea supplies the parameter set (islands_look.html ?macro=1); absent = the Markov schedule */
      if (rt.k < 1 && rt.from) return lerpParams(rt.from, rt.to, sm(rt.k));
      return rt.to;
    }
    /* opt.tweak(P): the sky moods (moods.js, &moods=1) bend a COPY of the parameter set; absent = the set is used as it is */
    function target() { const p = target0(); if (!opt.tweak) return p; const q = JSON.parse(JSON.stringify(p)); opt.tweak(q); return q; }
    function apply(P, dt) {
      const S = rt.state = P, ang = S.angle; const wv = windVec(ang);
      const seaU = seaMat && seaMat.uniforms; if (seaU) seaU.uWind.value.set(wv[0], wv[1]);
      /* clouds: scroll along the wind (shared with the sea's uWind) */
      const spd = cloudSpeed(S.windMs); if (!rt.frozen) rt.along += spd * dt; else rt.along = spd * rt.t;
      rt.off = [wv[0] * rt.along, wv[1] * rt.along]; u.uCD.value.set(rt.off[0], rt.off[1], S.deck, clamp(.2 + .6 * S.shK, 0, .8));
      u.uCP.value.set(CLOUD_H + 1, Math.min(1, S.shK * 1.45));
      /* lights */
      if (sun) { sun.intensity = opt.baseSun.i * S.sunScale * (1 + rt.flash * .8); sun.color.setRGB(opt.baseSun.c[0] * S.sunTint[0], opt.baseSun.c[1] * S.sunTint[1], opt.baseSun.c[2] * S.sunTint[2]); }
      if (hemi) { const hc = opt.baseHemi.c, hg = opt.baseHemi.g, ds = S.hemiDesat, l1 = lum(hc), l2 = lum(hg), t = S.hemiTint;
        hemi.color.setRGB(lerp(hc[0], l1, ds) * t[0], lerp(hc[1], l1, ds) * t[1], lerp(hc[2], l1, ds) * t[2]); hemi.groundColor.setRGB(lerp(hg[0], l2, ds) * t[0], lerp(hg[1], l2, ds) * t[1], lerp(hg[2], l2, ds) * t[2]); hemi.intensity = opt.baseHemi.i * S.hemiScale * (1 + rt.flash * 2.5); }
      if (opt.sunFree) { const az = Math.atan2(opt.sunDir.x, opt.sunDir.z) * 180 / Math.PI; opt.setSun(S.sunEl, az); }
      /* sky colours, fog */
      u.uSkyH.value.set(...S.skyH); u.uSkyZ.value.set(...S.skyZ); u.uFogC.value.set(...S.skyH); u.uFogD.value = S.fogD;
      if (scene && scene.fog) { const fc = opt.nopost ? S.skyH.map(aces) : S.skyH; scene.fog.color.setRGB(fc[0], fc[1], fc[2]); scene.fog.density = S.fogD; }
      u.uWx0.value.set(S.chop, S.cap, S.glit, S.swell); u.uWx1.value.set(S.seaSun, S.seaAmb, S.seaSat, S.rain); u.uWx2.value.set(S.wet, rt.flash, 0, 0);
      if (seaU) { seaU.uSunCol.value.set(3.0 * S.sunTint[0] * S.sunScale, 1.85 * S.sunTint[1] * S.sunScale, 1.05 * S.sunTint[2] * S.sunScale); }
      if (postMat) { postMat.uniforms.uSat.value = S.sat; postMat.uniforms.uCon.value = S.con; postMat.uniforms.uHaze.value = S.haze; postMat.uniforms.uTint.value.set(...S.tint); postMat.uniforms.uHazeC.value.set(...S.skyH.map(aces)); }
      /* cloud colours: lit by the sun scale, shade by the sky */
      const lit = [S.cL[0], S.cL[1], S.cL[2]].map((v, i) => v * (.55 + .45 * Math.min(1.2, S.sunScale + .3)) * (i === 0 ? 1 : i === 1 ? lerp(1, S.sunTint[1], .4) : lerp(1, S.sunTint[2], .4)));
      if (objs) {
        const dm = objs.dome.material.uniforms, dk = objs.deck.material.uniforms, pf = objs.puffs.material.uniforms;
        for (const m of [dm, dk, pf]) { m.uCl.value.set(...lit); m.uCs.value.set(...S.cS); m.uFlash.value = rt.flash; }
        dm.uSunCol.value.set(3 * S.sunTint[0] * S.sunScale, 1.85 * S.sunTint[1] * S.sunScale, 1.05 * S.sunTint[2] * S.sunScale); dm.uCir.value = S.cirrus; { const a = S.angle + Math.PI / 4; dm.uCirD.value.set(Math.cos(a), Math.sin(a)); } dm.uGold.value = clamp((14 - S.sunEl) / 8, 0, 1); dm.uCoverP.value = S.cover; dm.uDeckOp.value = S.deckOp; dm.uDeckDark.value = S.deckDark; dm.uOff.value.set(rt.off[0], rt.off[1]);
        objs.deck.position.y = S.deckH; dk.uCoverP.value = S.cover; dk.uDeckOp.value = S.deckOp; dk.uDeckDark.value = S.deckDark; objs.deck.visible = S.deck > .01 && S.deckOp > .01; pf.uDark.value = S.deckDark * .6 + (S.name === 'showers' ? .35 : 0);
        const rn = objs.rain.material.uniforms; const nR = Math.round(RAIN_MAX * (opt.quality === 'low' ? .6 : 1) * clamp(S.rain, 0, 1) * (S.rain > .02 ? 1 : 0)); objs.rain.geometry.instanceCount = nR; objs.rain.visible = nR > 0;
        rn.uV.value.set(wv[0] * Math.min(S.windMs, 25) * .45, wv[1] * Math.min(S.windMs, 25) * .45); rn.uT.value = rt.t; rn.uAlpha.value = .55 + .4 * S.rain; const rl = Math.min(1, .55 + .5 * lum(S.skyH) * 3); rn.uCol.value.set(.62 * rl + .2, .68 * rl + .2, .78 * rl + .2); rn.uLen.value = 2.4 + 1.0 * S.rain; rn.uPx.value = (opt.quality === 'low' ? .9 : 1.3) / (Math.max(200, opt.getH ? opt.getH() : 800) * 1.866);
      }
    }
    function puffsUpdate(S, cam) {
      const wv = windVec(S.angle), pr = [-wv[1], wv[0]], L = 105, N = NP, Lx = opt.sunDir;
      const aC = objs.puffs.geometry.attributes.aC, aS = objs.puffs.geometry.attributes.aS, list = [];
      for (let i = 0; i < N; i++) {
        const p = puffs[i], act = clamp((S.cover - p.thr) / .12, 0, 1), pu = u.uPuff.value[i];
        let s = ((p.s0 * 2 * L + rt.along) % (2 * L) + 2 * L) % (2 * L) - L; const ef = clamp((L - Math.abs(s)) / 40, 0, 1); let k = act * ef;
        let x = wv[0] * s + pr[0] * p.c * L * .88, z = wv[1] * s + pr[1] * p.c * L * .88, Rr = p.R * (.55 + .45 * k);
        if (i === 0 && rareOn && big && S.deckOp < .1 && S.sunScale > .8 && S.cover > .4) { /* the island's own cloud: rare (10 percent of seeds), small, downwind of the biggest island, same base as the rest */ x = big.x + wv[0] * 34; z = big.z + wv[1] * 34; Rr = 9; k = 1; }
        if (k < .02) { pu.set(0, 0, 0, 0); continue; }
        pu.set(x, z, Rr * 2.0, k * .95);
        for (let j = 0; j < NSUB; j++) { const sb = p.subs[j], ox = Math.cos(sb.a) * sb.d * Rr * .8, oz = Math.sin(sb.a) * sb.d * Rr * .8, sz = Rr * sb.sz * (j === 0 ? .85 : .62); list.push({ x: x + ox, y: CLOUD_H + .45 * sz, z: z + oz, s: sz, a: k, d: (x + ox - cam.x) ** 2 + (CLOUD_H - cam.y) ** 2 + (z + oz - cam.z) ** 2, seed: ((i * 7 + j * 3) % 11 / 11) * .98 + p.age }); }
      }
      list.sort((a, b) => b.d - a.d); const n = list.length;
      for (let q = 0; q < n; q++) { const e = list[q]; aC.setXYZ(q, e.x, e.y, e.z); aS.setXYZ(q, e.s, e.a, e.seed); }
      objs.puffs.geometry.instanceCount = n; aC.needsUpdate = true; aS.needsUpdate = true;
      const v = objs.puffs.material.uniforms; const m4 = new THREE.Matrix4().copy(opt.camera.matrixWorldInverse);
      v.uSunV.value.copy(Lx).transformDirection(m4); v.uUpV.value.set(0, 1, 0).transformDirection(m4);
    }
    rt.attach = (sc, s, h) => {
      scene = sc; sun = s; hemi = h; objs = build(sc, { nopost: opt.nopost, sunDir: opt.sunDir, seed });
      sc.fog = new THREE.FogExp2(0xffffff, .0003); u.uWSun.value = opt.sunDir; fogOn = true; apply(rt.state || target(), 0);
    };
    rt.attachSea = m => { seaMat = m; attachSea(m); if (rt.state) m.uniforms.uWind.value.set(...windVec(rt.state.angle)); };
    rt.attachPost = pm => { postMat = pm; patchPost(pm); };
    rt.set = name => { if (name === 'auto') { rt.auto = true; rt.mode = 'auto'; return; } rt.auto = false; rt.mode = name; rt.from = rt.state ? JSON.parse(JSON.stringify(rt.state)) : params(name); const tp = params(name); rt.to = tp; rt.k = 0; };
    rt.frame = (dt, camera) => {
      if (!rt.frozen) rt.t += dt;
      if (!rt.auto && rt.k < 1) rt.k = Math.min(1, rt.k + (rt.frozen ? 1 : dt / rt.trans));
      const P = target(); rt.flash = P.flash > 0 ? flash(seed, rt.t, P.flash) * clamp(P.flash, 0, 1) : 0;
      apply(P, dt);
      camera.updateMatrixWorld();
      if (objs) { const c = camera.position; objs.dome.position.copy(c); puffsUpdate(P, c); const cur = opt.getCur(); objs.rain.material.uniforms.uCtr.value.set(cur.tx, 0, cur.tz); }
      if (opt.sunFree) { /* sun moved: keep the shadow light in step */ }
      rt.gameHour = rt.hour0 + rt.t / rt.hourSec;
    };
    rt.snapshot = () => { const S = rt.state; return { mode: rt.mode, auto: rt.auto, state: S.name, from: S.from || S.name, to: S.to || S.name, k: S.k || 0, hour: rt.auto ? rt.gameHour : null, t: rt.t, windMs: S.windMs, windAngle: S.angle, windDir: windVec(S.angle), beaufort: S.beaufort, cloudSpeed: cloudSpeed(S.windMs), cloudOffset: rt.off.slice(), cover: S.cover, deck: S.deck, rain: S.rain, rainMm: S.rainMm, fogDensity: S.fogD, visibility: S.vis, sunScale: S.sunScale, sunElev: S.sunEl, wet: S.wet, seaHs: S.hs, seaTp: S.tp, seaChop: S.chop, swell: S.swell, glitter: S.glit, caps: S.cap, surge: S.surge, flash: rt.flash, storm: S.storm === undefined ? (S.name === 'storm' ? 0 : -1) : S.storm, sailOk: sailOk(S.windMs), schedule: seed ? 'seed ' + seed : '' }; };
    rt.uniformsDebug = () => ({ uWind: seaMat ? seaMat.uniforms.uWind.value.toArray() : null, uCD: u.uCD.value.toArray(), uWx0: u.uWx0.value.toArray(), uWx1: u.uWx1.value.toArray(), uFogD: u.uFogD.value, puffsActive: u.uPuff.value.filter(v => v.z > 0).length, sunIntensity: sun && sun.intensity, hemiIntensity: hemi && hemi.intensity });
    rt.parts = () => objs; rt.raw = () => u; rt.state = target(); rt.params = params;
    return rt;
  }
  API.create = create; API.patchSea = patchSea; API.patchLand = patchLand;
})();
