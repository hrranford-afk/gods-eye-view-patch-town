/* LI_AUDIO: synthesised sound for The Gift. WebAudio only, no files, no THREE. See research/AUDIO_PLAN.md.
   Everything is built from oscillators, shared noise buffers and envelopes. The context is created lazily inside a user gesture.
   Not tuned by ear: the numbers are a first guess. */
(function (root) {
  'use strict';
  var AC = root.AudioContext || root.webkitAudioContext;
  var clamp01 = function (v, d) { v = +v; return v !== v ? (d || 0) : (v < 0 ? 0 : v > 1 ? 1 : v); };
  var rnd = Math.random;
  var VOICE_CAP = 24;
  var CAPS = { robot: 6, thunder: 2, key: 2, ui: 4, gull: 2, music: 3, other: 8 };
  var S = {
    ctx: null, master: null, comp: null, post: null, fx: null, mus: null, beds: null, running: false, muted: false,
    vol: { master: 0.7, fx: 1, music: 0 }, p: { sea: 0, wind: 0, rain: 0, night: 0 },
    voices: [], robots: {}, timer: 0, nextGull: 0, nextCricket: 0, nextChord: 0, listening: false, applied: { sea: -1, wind: -1, rain: -1, night: -1 }
  };

  /* ---------- noise buffers, one set per context ---------- */
  function noises(c) {
    if (c.__liNoise) return c.__liNoise;
    var n = Math.floor(c.sampleRate * 4), w = c.createBuffer(1, n, c.sampleRate), b = c.createBuffer(1, n, c.sampleRate), k = c.createBuffer(1, n, c.sampleRate);
    var dw = w.getChannelData(0), db = b.getChannelData(0), dk = k.getChannelData(0), last = 0, b0 = 0, b1 = 0, b2 = 0, i, x;
    for (i = 0; i < n; i++) {
      x = rnd() * 2 - 1; dw[i] = x * 0.5;
      last = (last + 0.02 * x) / 1.02; db[i] = last * 3.5;
      b0 = 0.99765 * b0 + x * 0.099046; b1 = 0.963 * b1 + x * 0.2965164; b2 = 0.57 * b2 + x * 1.0526913; dk[i] = (b0 + b1 + b2 + x * 0.1848) * 0.11;
    }
    c.__liNoise = { white: w, brown: b, pink: k };
    return c.__liNoise;
  }
  /* ---------- small builders ---------- */
  function done(src, nodes) { src.onended = function () { for (var i = 0; i < nodes.length; i++) { try { nodes[i].disconnect(); } catch (e) { } } }; }
  function tone(c, out, type, f0, f1, t, dur, peak, att, det) {
    var o = c.createOscillator(), g = c.createGain(); att = Math.min(att || 0.01, dur * 0.5);
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    if (det) o.detune.value = det;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02); done(o, [o, g]); return g;
  }
  function hiss(c, out, kind, ftype, f0, f1, q, t, dur, peak, att) {
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); att = Math.min(att || 0.01, dur * 0.5);
    s.buffer = noises(c)[kind]; s.loop = true;
    f.type = ftype; f.Q.value = q || 0.7; f.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, rnd() * 3); s.stop(t + dur + 0.02); done(s, [s, f, g]); return g;
  }
  function lp(c, out, f) { var b = c.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = f; b.connect(out); return b; }
  function stateMods(o) {
    var st = o.state || 'work', wear = clamp01(o.wear, 0), m = { pitch: 1 - 0.12 * wear, gain: 1, bright: 1, drag: 1, jit: 0.02 + 0.08 * wear };
    if (st === 'tired') { m.pitch *= 0.92; m.gain = 0.8; m.bright = 0.8; }
    else if (st === 'new') { m.pitch *= 1.08; m.bright = 1.5; m.jit = 0.01; }
    else if (st === 'wet') { m.pitch *= 0.85; m.bright = 0.55; m.drag = 1.7; }
    else if (st === 'idle') { m.gain = 0.4; }
    return m;
  }
  /* ---------- event library: (ctx, out, t, opts) -> duration ---------- */
  var E = {};
  E.hauler = function (c, out, t, o) {
    var m = stateMods(o), f = lp(c, out, 700 * m.bright), d = 0.9 * m.drag;
    tone(c, f, 'sawtooth', 58 * m.pitch, 44 * m.pitch, t, 0.55 * m.drag, 0.16 * m.gain, 0.12);     /* low groan */
    tone(c, out, 'square', 900 * m.pitch, 500 * m.pitch, t + 0.03, 0.03, 0.05 * m.gain, 0.002);     /* click */
    hiss(c, out, 'pink', 'bandpass', 1400 * m.bright, 900 * m.bright, 1.2, t + 0.12, 0.45 * m.drag, 0.09 * m.gain, 0.08); /* track scrape on pebble */
    tone(c, f, 'sine', 70 * m.pitch, 40 * m.pitch, t + 0.7 * m.drag, 0.18, 0.12 * m.gain, 0.01);    /* heavy settle */
    return d + 0.3;
  };
  E.sorter = function (c, out, t, o) {
    var m = stateMods(o), j = (rnd() - 0.5) * m.jit, i;
    for (i = 0; i < 3; i++) hiss(c, out, 'white', 'bandpass', (2600 + i * 500) * m.bright, 0, 2, t + i * 0.045 + j, 0.04, 0.05 * m.gain, 0.003); /* soft rattle */
    tone(c, out, 'triangle', 1500 * m.pitch, 1400 * m.pitch, t + 0.18, 0.05, 0.07 * m.gain, 0.002);  /* tick */
    tone(c, lp(c, out, 500 * m.bright), 'sine', 120 * m.pitch, 60 * m.pitch, t + 0.26, 0.14, 0.14 * m.gain, 0.005); /* thunk */
    return 0.5;
  };
  E.stacker = function (c, out, t, o) {
    var m = stateMods(o);
    hiss(c, out, 'brown', 'lowpass', 260 * m.bright, 160 * m.bright, 0.7, t, 0.9 * m.drag, 0.05 * m.gain, 0.35);  /* load shifting */
    tone(c, lp(c, out, 300), 'sine', 48 * m.pitch, 40 * m.pitch, t + 0.45, 0.3, 0.04 * m.gain, 0.1);
    return 1.0 * m.drag + 0.1;
  };
  E.scrape = function (c, out, t, o) {
    var g = o.ground || 'pebble', cfg = { pebble: ['pink', 1500, 0.6], sand: ['white', 3500, 0.35], grass: ['pink', 700, 0.4], plank: ['brown', 600, 0.5], stone: ['pink', 2200, 0.5] }[g] || ['pink', 1500, 0.5];
    hiss(c, out, cfg[0], 'bandpass', cfg[1], cfg[1] * 0.7, 0.9, t, cfg[2], 0.45, 0.08); return cfg[2] + 0.1;
  };
  E.crateThud = function (c, out, t) { tone(c, out, 'sine', 95, 42, t, 0.28, 0.5, 0.004); hiss(c, out, 'brown', 'lowpass', 400, 150, 0.7, t, 0.2, 0.25, 0.004); return 0.4; };
  E.plankFit = function (c, out, t) {
    tone(c, out, 'triangle', 230, 170, t, 0.12, 0.3, 0.003); hiss(c, out, 'pink', 'bandpass', 900, 700, 2, t, 0.08, 0.15, 0.002);
    tone(c, out, 'triangle', 300, 250, t + 0.11, 0.1, 0.25, 0.003); return 0.3;
  };
  E.holdLoop = function (c, out, t, o) {
    var d = Math.max(0.2, Math.min(4, +o.duration || 1)); hiss(c, out, 'pink', 'bandpass', 500, 1100, 1.2, t, d, 0.1, d * 0.6);
    tone(c, out, 'sine', 140, 200, t, d, 0.05, d * 0.7); return d + 0.1;
  };
  E.key = function (c, out, t) {
    var p = [[523, 0.28, 1.8], [1340, 0.12, 1.1], [2010, 0.07, 0.7], [3270, 0.03, 0.4]], i;
    for (i = 0; i < p.length; i++) tone(c, out, 'sine', p[i][0], p[i][0] * 0.998, t + i * 0.004, p[i][2], p[i][1], 0.003);
    hiss(c, out, 'white', 'highpass', 4000, 0, 0.7, t, 0.03, 0.03, 0.002); return 2.0;
  };
  E.uiTick = function (c, out, t) { tone(c, out, 'sine', 1700, 1300, t, 0.05, 0.2, 0.002); return 0.1; };
  E.horn = function (c, out, t) {
    var f = lp(c, out, 520), i, fr = [98, 147];
    for (i = 0; i < 2; i++) { tone(c, f, 'sawtooth', fr[i], fr[i], t + i * 0.55, 0.7, 0.22, 0.12, i * 4); tone(c, f, 'sawtooth', fr[i] * 1.004, fr[i], t + i * 0.55, 0.7, 0.12, 0.12); }
    return 1.4;
  };
  E.winch = function (c, out, t) {
    var f = lp(c, out, 900), i, fr = [196, 147];
    for (i = 0; i < 2; i++) {
      tone(c, f, 'triangle', fr[i], fr[i] * 0.99, t + i * 0.42, 0.4, 0.22, 0.03);
      tone(c, f, 'sine', fr[i] * 0.5, fr[i] * 0.5, t + i * 0.42, 0.4, 0.14, 0.03);
      tone(c, out, 'square', 700, 400, t + i * 0.42 + 0.05, 0.02, 0.04, 0.002); tone(c, out, 'square', 700, 400, t + i * 0.42 + 0.17, 0.02, 0.04, 0.002); /* ratchet */
    }
    return 1.0;
  };
  E.boatCreak = function (c, out, t) {
    var f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 260; f.Q.value = 4; f.connect(out);
    var g = tone(c, f, 'sawtooth', 130, 105, t, 0.9, 0.12, 0.25); return 1.0;
  };
  E.wake = function (c, out, t) { hiss(c, out, 'pink', 'lowpass', 900, 400, 0.7, t, 1.8, 0.14, 0.5); return 1.9; };
  E.gull = function (c, out, t) {
    var f0 = 1500 + rnd() * 400;
    tone(c, out, 'triangle', f0, f0 * 1.5, t, 0.28, 0.03, 0.05); tone(c, out, 'triangle', f0 * 1.5, f0 * 0.9, t + 0.28, 0.4, 0.03, 0.05); return 0.8;
  };
  E.thunder = function (c, out, t, o) {
    var d = 2.5 + 2 * clamp01(o.level == null ? 0.5 : o.level);
    hiss(c, out, 'brown', 'lowpass', 500, 70, 0.8, t, d, 0.7, 0.15); hiss(c, out, 'brown', 'lowpass', 200, 60, 0.7, t + 0.3, d, 0.4, 0.6); return d + 0.3;
  };
  E.stormRoar = function (c, out, t, o) {
    var d = Math.max(2, Math.min(12, +o.duration || 8)), l = clamp01(o.level == null ? 0.6 : o.level);
    hiss(c, out, 'brown', 'lowpass', 300 + 500 * l, 250, 0.7, t, d, 0.55 * (0.4 + l), d * 0.45);
    hiss(c, out, 'pink', 'bandpass', 500, 900, 0.8, t, d, 0.12 * l, d * 0.5); return d + 0.1;
  };
  E.rockHum = function (c, out, t, o) {
    var p = clamp01(o.pitch, 0), f = 70 * (1 + p), d = Math.max(1, Math.min(8, +o.duration || 3));
    tone(c, out, 'sine', f, f, t, d, 0.12, d * 0.4); tone(c, out, 'sine', f * 1.5 + 1.2, f * 1.5 + 1.2, t, d, 0.05, d * 0.4); return d + 0.1;
  };
  E.cricket = function (c, out, t) { var i, n = 3 + Math.floor(rnd() * 3); for (i = 0; i < n; i++) tone(c, out, 'sine', 4200, 4200, t + i * 0.07, 0.04, 0.03, 0.005); return n * 0.07 + 0.1; };
  E.chord = function (c, out, t, o) {
    var roots = [196, 174.6, 130.8, 164.8], r = roots[(o.n || 0) % 4], iv = [1, 1.2599, 1.4983, 2], i, d = 14, f = lp(c, out, 1100);
    for (i = 0; i < iv.length; i++) { tone(c, f, 'triangle', r * iv[i], r * iv[i], t, d, 0.05, 4, -5); tone(c, f, 'sine', r * iv[i], r * iv[i], t, d, 0.05, 4, 5); }
    return d + 0.1;
  };
  var ALIAS = { robot: 'hauler', thud: 'crateThud', plank: 'plankFit', tick: 'uiTick', deliveryHorn: 'horn', creak: 'boatCreak', roar: 'stormRoar', hum: 'rockHum' };
  function capName(n) { return /^(hauler|sorter|stacker)$/.test(n) ? 'robot' : n === 'thunder' ? 'thunder' : n === 'key' ? 'key' : n === 'uiTick' ? 'ui' : n === 'gull' || n === 'cricket' ? 'gull' : n === 'chord' ? 'music' : 'other'; }

  /* ---------- context, chain, beds ---------- */
  function chain(c, vols) {
    var m = c.createGain(), k = c.createDynamicsCompressor(), p = c.createGain(), fx = c.createGain(), mu = c.createGain();
    k.threshold.value = -10; k.knee.value = 6; k.ratio.value = 12; k.attack.value = 0.003; k.release.value = 0.25;
    m.gain.value = vols.master; p.gain.value = 0.8; fx.gain.value = vols.fx; mu.gain.value = vols.music;
    fx.connect(m); mu.connect(m); m.connect(k); k.connect(p); p.connect(c.destination);
    return { master: m, comp: k, post: p, fx: fx, mus: mu };
  }
  function bed(c, out, kind, ftype, f, q) {
    var s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
    s.buffer = noises(c)[kind]; s.loop = true; fl.type = ftype; fl.frequency.value = f; fl.Q.value = q || 0.7; g.gain.value = 0;
    s.connect(fl); fl.connect(g); g.connect(out); l.frequency.value = 0.1; l.connect(lg); lg.connect(g.gain); s.start(); l.start();
    return { f: fl, g: g, lfo: l, lg: lg };
  }
  function buildBeds(c, out) {
    var B = { sea: bed(c, out, 'brown', 'lowpass', 300, 0.6), wash: bed(c, out, 'pink', 'bandpass', 1200, 0.8), wind: bed(c, out, 'pink', 'bandpass', 500, 0.9), rain: bed(c, out, 'white', 'highpass', 1800, 0.5) };
    B.sea.lfo.frequency.value = 0.11; B.wash.lfo.frequency.value = 0.09; B.wind.lfo.frequency.value = 0.07; B.rain.lfo.frequency.value = 0.3;
    var h = c.createGain(), a = c.createOscillator(), b = c.createOscillator(); h.gain.value = 0; a.frequency.value = 55; b.frequency.value = 110.4; a.connect(h); b.connect(h); h.connect(out); a.start(); b.start();
    B.hum = { g: h }; return B;
  }
  function applyBeds(force) {
    var c = S.ctx, B = S.beds; if (!c || !B) return; var p = S.p, A = S.applied, t = c.currentTime, T = 0.6;
    function ch(k) { return force || Math.abs(p[k] - A[k]) > 0.005; }
    if (ch('sea')) { A.sea = p.sea; var e = p.sea;
      B.sea.g.gain.setTargetAtTime(0.03 + 0.26 * e, t, T); B.sea.lg.gain.setTargetAtTime(0.02 + 0.12 * e, t, T); B.sea.f.frequency.setTargetAtTime(200 + 700 * e, t, T);
      B.wash.g.gain.setTargetAtTime(0.05 * Math.sin(Math.PI * Math.min(1, e * 1.2)) + 0.01, t, T); B.wash.lg.gain.setTargetAtTime(0.03, t, T); }
    if (ch('wind')) { A.wind = p.wind; B.wind.g.gain.setTargetAtTime(0.01 + 0.22 * p.wind, t, T); B.wind.lg.gain.setTargetAtTime(0.1 * p.wind, t, T); B.wind.f.frequency.setTargetAtTime(300 + 1100 * p.wind, t, T); B.wind.f.Q.setTargetAtTime(0.9 + 1.5 * p.wind, t, T); }
    if (ch('rain')) { A.rain = p.rain; B.rain.g.gain.setTargetAtTime(0.2 * p.rain * p.rain + 0.0001, t, T); B.rain.lg.gain.setTargetAtTime(0.02 * p.rain, t, T); }
    if (ch('night')) { A.night = p.night; B.hum.g.gain.setTargetAtTime(0.008 + 0.014 * p.night, t, 1.5); }
  }
  function applyVols() {
    if (!S.master) return; var t = S.ctx.currentTime;
    S.master.gain.setTargetAtTime(S.muted ? 0 : S.vol.master, t, 0.05); S.fx.gain.setTargetAtTime(S.vol.fx, t, 0.05); S.mus.gain.setTargetAtTime(S.vol.music, t, 0.3);
  }
  function resumeCtx() { var c = S.ctx; if (c && c.state !== 'running' && c.resume) { try { var r = c.resume(); if (r && r.catch) r.catch(function () { }); } catch (e) { } } }
  function unlock() {
    try {
      if (!AC) return false;
      if (!S.ctx) {
        var c = new AC(); S.ctx = c; var ch = chain(c, S.vol); S.master = ch.master; S.comp = ch.comp; S.post = ch.post; S.fx = ch.fx; S.mus = ch.mus;
        S.beds = buildBeds(c, S.fx); var sb = c.createBuffer(1, 1, c.sampleRate), ss = c.createBufferSource(); ss.buffer = sb; ss.connect(c.destination); ss.start(0);
        c.onstatechange = function () { S.running = c.state === 'running'; };
        applyBeds(true); applyVols(); startTimer();
      }
      resumeCtx(); S.running = S.ctx.state === 'running'; return true;
    } catch (e) { return false; }
  }
  function onGesture() { unlock(); if (S.running) removeGesture(); else if (S.ctx) { setTimeout(function () { S.running = S.ctx.state === 'running'; if (S.running) removeGesture(); }, 150); } }
  var GEST = ['touchend', 'pointerup', 'click', 'keydown'];
  function addGesture() { if (S.listening || !root.addEventListener) return; S.listening = true; GEST.forEach(function (n) { root.addEventListener(n, onGesture, true); }); }
  function removeGesture() { if (!S.listening) return; S.listening = false; GEST.forEach(function (n) { root.removeEventListener(n, onGesture, true); }); }

  /* ---------- voices ---------- */
  function prune() { var now = S.ctx ? S.ctx.currentTime : 0, v = S.voices, i, k = 0; for (i = 0; i < v.length; i++) if (v[i].end > now) v[k++] = v[i]; v.length = k; }
  function voiceCount() { if (!S.ctx) return 0; prune(); return S.voices.length; }
  function play(name, o, t) {
    o = o || {}; var f = E[ALIAS[name] || name]; if (!f || !S.ctx || !S.running) return false;
    prune(); var cap = capName(ALIAS[name] || name), n = 0, i; for (i = 0; i < S.voices.length; i++) if (S.voices[i].cap === cap) n++;
    if (S.voices.length >= VOICE_CAP || n >= (CAPS[cap] || 8)) return false;
    var now = S.ctx.currentTime, st = t == null ? now + 0.01 : t, bus = (cap === 'music') ? S.mus : S.fx, d;
    try { d = f(S.ctx, bus, st, o); } catch (e) { return false; }
    S.voices.push({ cap: cap, end: st + d }); return true;
  }
  /* ---------- scheduler: robots, gulls, crickets, chords ---------- */
  var BASE = { hauler: 1.8, sorter: 0.55, stacker: 2.6 };
  function interval(r) { var b = clamp01(r.battery, 1), base = BASE[r.kind] || 1.5; return base * (1 + 2.2 * (1 - b) * (1 - b)) * (r.state === 'wet' ? 1.25 : 1) * (1 + (rnd() - 0.5) * (0.06 + 0.2 * clamp01(r.wear, 0))); }
  function tick() {
    var c = S.ctx; if (!c || !S.running) return; var now = c.currentTime, id, r, p = S.p;
    for (id in S.robots) { r = S.robots[id]; if (r.state === 'off') continue;
      if (r.next < now - 0.5) r.next = now + 0.02;
      while (r.next < now + 0.12) { play(r.kind, { state: r.state, wear: r.wear }, r.next); r.next += interval(r); } }
    if (p.night < 0.6 && now > S.nextGull) { S.nextGull = now + (8 + rnd() * 17) / (0.4 + 0.6 * (1 - p.wind)); if (rnd() < 0.8 && S.vol.fx > 0) play('gull', {}); }
    if (p.night > 0.4 && now > S.nextCricket) { S.nextCricket = now + 0.5 + rnd() * 2.5 / p.night; play('cricket', {}); }
    if (S.vol.music > 0.01 && now > S.nextChord) { S.nextChord = now + 12; S.chordN = (S.chordN || 0) + 1; play('chord', { n: S.chordN }); }
  }
  function startTimer() { if (!S.timer) S.timer = setInterval(tick, 50); }
  if (root.document && root.document.addEventListener) root.document.addEventListener('visibilitychange', function () {
    if (!S.ctx) return; try { if (root.document.hidden) S.ctx.suspend(); else resumeCtx(); } catch (e) { } });

  /* ---------- public API ---------- */
  function setP(k, v) { S.p[k] = clamp01(v, S.p[k]); applyBeds(false); return S.p[k]; }
  var API = {
    init: function () { addGesture(); return true; },
    unlock: unlock,
    isRunning: function () { return !!(S.ctx && S.ctx.state === 'running'); },
    setSeaEnergy: function (v) { return setP('sea', v); }, setWind: function (v) { return setP('wind', v); },
    setRain: function (v) { return setP('rain', v); }, setNight: function (v) { return setP('night', v); },
    robotWork: function (id, kind, state, battery, wear) {
      id = String(id); if (!BASE[kind]) return false; var n = 0, k, r = S.robots[id];
      if (!r) { for (k in S.robots) if (S.robots[k].state !== 'off') n++; if (n >= CAPS.robot) return false; r = S.robots[id] = { next: 0 }; }
      r.kind = kind; r.state = state || 'work'; r.battery = clamp01(battery, 1); r.wear = clamp01(wear, 0); if (!r.next) r.next = S.ctx ? S.ctx.currentTime + 0.05 : 0; return true;
    },
    robotStop: function (id) { delete S.robots[String(id)]; },
    playEvent: function (name, opts) { return play(String(name), opts || {}); },
    setMasterVolume: function (v) { S.vol.master = clamp01(v, S.vol.master); applyVols(); return S.vol.master; },
    setEffectsVolume: function (v) { S.vol.fx = clamp01(v, S.vol.fx); applyVols(); return S.vol.fx; },
    setMusicVolume: function (v) { S.vol.music = clamp01(v, S.vol.music); applyVols(); return S.vol.music; },
    mute: function (b) { S.muted = !!b; applyVols(); return S.muted; }, isMuted: function () { return S.muted; },
    voices: voiceCount,
    events: function () { return Object.keys(E).concat(Object.keys(ALIAS)); },
    analyser: function (fft) { if (!S.ctx) return null; if (!S.an) { S.an = S.ctx.createAnalyser(); S.an.fftSize = fft || 128; S.an.smoothingTimeConstant = 0.7; S.post.connect(S.an); } return S.an; },
    stats: function () { return { voices: voiceCount(), cap: VOICE_CAP, running: API.isRunning(), state: S.ctx ? S.ctx.state : 'none', sampleRate: S.ctx ? S.ctx.sampleRate : 0, robots: Object.keys(S.robots).length, params: { sea: S.p.sea, wind: S.p.wind, rain: S.p.rain, night: S.p.night }, master: S.vol.master, fx: S.vol.fx, music: S.vol.music, muted: S.muted }; },
    /* offline render of one event through the same limiter chain (for tests; no gesture needed) */
    renderOffline: function (name, opts, seconds, rate) {
      var f = E[ALIAS[name] || name]; if (!AC || !f) return Promise.reject(new Error('no such event'));
      var OA = root.OfflineAudioContext || root.webkitOfflineAudioContext, r = rate || 44100, len = Math.floor(r * (seconds || 3)), c = new OA(1, len, r);
      var ch = chain(c, { master: S.vol.master, fx: 1, music: 1 }); f(c, ch.fx, 0.05, opts || {});
      return c.startRendering().then(function (b) { return b.getChannelData(0); });
    }
  };
  root.LI_AUDIO = API; addGesture();
})(typeof window !== 'undefined' ? window : this);
