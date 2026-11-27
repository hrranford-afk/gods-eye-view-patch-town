/* LI_SONG: the island song, a generative music layer driven by game events. See research/AUDIO_PLAN.md section 8.
   Plays through LI_AUDIO's music bus (live) or any AudioNode (create(ctx, out, opts), used for offline tests). No Math.random:
   all choices come from a seeded hash so the same seed and the same events give the same notes. Not tuned by ear. */
(function (root) {
  'use strict';
  var SCALES = [[0, 2, 4, 7, 9], [0, 2, 5, 7, 10], [0, 3, 5, 8, 10], [0, 2, 5, 7, 9], [0, 3, 5, 7, 10]];
  var MOODS = ['bright', 'open', 'tender', 'dusk', 'deep'];
  var CAPS = { robot: 4, phrase: 2, light: 1, gull: 1, cue: 3 };
  var MAXN = 8, BUDGET = 0.6, LOOK = 0.3, TICK_MS = 100;
  var BASE_STEPS = { hauler: 4, sorter: 3, stacker: 8 };
  var clamp01 = function (v, d) { v = +v; return v !== v ? (d || 0) : (v < 0 ? 0 : v > 1 ? 1 : v); };
  function fnv(str) { var h = 2166136261 >>> 0, i; str = String(str); for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function mix(a, b) { var h = (a ^ Math.imul(b + 0x9e3779b9 | 0, 0x85ebca6b)) >>> 0; h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0; h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0; return (h ^ (h >>> 15)) >>> 0; }
  function unit(a, b) { return mix(a, b) / 4294967296; }
  function mulberry(a) { return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var LIGHT_PATTERN = [0, 4, 2, 5, 0, 3, 2, 6];

  function create(ctx, out, opts) {
    var I = { ctx: ctx || null, out: out || null, log: [], logN: 0 }, st = {
      seed: 1, h: 1, scale: SCALES[0], root: 48, mood: 'bright', bpm: 58, beat: 1, grid: 0.5, t0: 0, tide: 0.5, storm: 0, dark: false, night: false, week: 'tender',
      robots: {}, voices: [], phrase: [], phraseTab: {}, phraseLen: 32, lastGrid: -1, lightN: 0, running: false, timer: 0, pad: null, bus: null, manual: null, wasDark: false, count: 0, refused: 0
    };
    var clockFn = opts && opts.clock;
    function now() { return st.manual != null ? st.manual : clockFn ? clockFn() : I.ctx ? I.ctx.currentTime : 0; }
    function semis(deg) { var n = st.scale.length, o = Math.floor(deg / n); return 12 * o + st.scale[((deg % n) + n) % n]; }
    function midi(deg) { return st.root + semis(deg); }
    function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    function baseDeg() { return st.dark ? 4 : 0; }
    /* ----- island ----- */
    function buildPhrase() {
      var r = mulberry(mix(st.h, 77)), steps = [], d = 2, i, pos = 0, tab = { tender: {}, lowtide: {}, lighthouse: {} };
      for (i = 0; i < 6; i++) { var rest = r() < 0.2; d = Math.max(0, Math.min(7, d + Math.floor(r() * 5) - 2)); steps.push({ pos: pos, deg: rest ? null : d }); pos += r() < 0.5 ? 2 : 4; }
      st.phraseLen = 32; st.phrase = steps;
      steps.forEach(function (s, k) {
        if (s.deg == null) return; tab.tender[s.pos] = s.deg;
        if (k < 3) tab.lowtide[s.pos] = s.deg;
        var s2 = steps[k ^ 1] || s; tab.lighthouse[s.pos] = (s2.deg == null ? s.deg : s2.deg) + 2;
      });
      st.phraseTab = tab;
    }
    function setIsland(seed) {
      st.seed = seed; st.h = fnv(seed); var r = mulberry(st.h), k = Math.floor(r() * 5);
      st.scale = SCALES[k]; st.mood = MOODS[k]; st.root = 45 + Math.floor(r() * 8); st.bpm = 52 + Math.floor(r() * 13); st.beat = 60 / st.bpm; st.grid = st.beat / 2;
      buildPhrase(); I.log.length = 0; st.count = 0; st.lightN = 0; var id; for (id in st.robots) st.robots[id].deg = Math.floor(unit(st.h, fnv(id)) * 5); retunePad();
      return { scale: st.scale.slice(), root: st.root, mood: st.mood, bpm: st.bpm };
    }
    /* ----- voices, caps, budget ----- */
    function prune(t) { var v = st.voices, k = 0, i; for (i = 0; i < v.length; i++) if (v[i].end > t) v[k++] = v[i]; v.length = k; }
    function mulFor(voice) {
      var m = st.week === 'lowtide' ? 0.7 : 1, s = st.storm;
      if (voice === 'robot' || voice === 'phrase' || voice === 'gull') m *= 1 - 0.65 * s;
      if (voice === 'light' && st.night) m *= 1.3; if (voice === 'light' && st.week === 'lighthouse') m *= 1.25; return m;
    }
    function gridTime(t) { var k = Math.ceil((t - st.t0) / st.grid - 1e-9); return { k: k, t: st.t0 + k * st.grid }; }
    function note(voice, deg, t, dur, w, o) {
      var c = I.ctx; if (!c || !I.out || !st.running) return false; o = o || {};
      var now0 = now(), i, n = 0, tot = 0; prune(now0);
      for (i = 0; i < st.voices.length; i++) { if (st.voices[i].voice === voice) n++; tot += st.voices[i].w; }
      var pk = w * mulFor(voice) * (o.soft == null ? 1 : o.soft);
      if (st.voices.length >= MAXN || n >= (CAPS[voice] || 3) || tot + pk > BUDGET || pk < 0.003) { st.refused++; return false; }
      var m = midi(deg + (o.shift || 0) + baseDeg() * 0), f = hz(m), att = o.att || 0.01, bright = o.bright || 2600, g = c.createGain(), lp = c.createBiquadFilter(), a = c.createOscillator(), b = c.createOscillator(), bg = c.createGain();
      lp.type = 'lowpass'; lp.frequency.value = bright; a.type = o.type || 'triangle'; b.type = 'sine'; a.frequency.setValueAtTime(f, t); b.frequency.setValueAtTime(f * 2, t);
      if (o.glide) { a.frequency.exponentialRampToValueAtTime(f * o.glide, t + dur); b.frequency.exponentialRampToValueAtTime(f * 2 * o.glide, t + dur); }
      bg.gain.value = o.bell == null ? 0.25 : o.bell; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(pk, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      a.connect(g); b.connect(bg); bg.connect(g); g.connect(lp); lp.connect(I.out); a.start(t); b.start(t); a.stop(t + dur + 0.05); b.stop(t + dur + 0.05);
      a.onended = function () { try { a.disconnect(); b.disconnect(); bg.disconnect(); g.disconnect(); lp.disconnect(); } catch (e) { } };
      st.voices.push({ voice: voice, end: t + dur + 0.05, w: pk }); st.count++;
      var e = { t: Math.round(t * 1000) / 1000, voice: voice, deg: deg + (o.shift || 0), midi: m, why: o.why || '' }; I.log.push(e); if (I.log.length > 200) I.log.shift();
      return true;
    }
    /* ----- pad: the tide swell, built once ----- */
    function startPad(t) {
      var c = I.ctx; if (st.pad || !c) return; var g = c.createGain(), lp = c.createBiquadFilter(), oscs = [], i;
      g.gain.value = 0.0001; lp.type = 'lowpass'; lp.frequency.value = 400; lp.connect(g); g.connect(I.out);
      for (i = 0; i < 3; i++) { var o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 100; o.detune.value = (i - 1) * 4; o.connect(lp); o.start(t); oscs.push(o); }
      st.pad = { g: g, lp: lp, o: oscs }; retunePad(true);
    }
    function retunePad(instant) {
      var p = st.pad; if (!p) return; var t = now(), tc = instant ? 0.01 : 1.5, ch = [0, 2, 3], i, bd = baseDeg() - (st.dark ? 5 : 0) - 5, d = st.dark ? 1 : 0;
      for (i = 0; i < 3; i++) p.o[i].frequency.setTargetAtTime(hz(midi(bd + ch[i])), t, tc);
      var lo = st.week === 'lowtide' ? 1.3 : 1;
      p.g.gain.setTargetAtTime((0.03 + 0.1 * st.tide) * lo * (1 + 1.2 * st.storm), t, 1.2); p.lp.frequency.setTargetAtTime(260 + 500 * st.tide + 300 * st.storm, t, 1.2);
    }
    /* ----- scheduling ----- */
    function robotStep(r, t) {
      var soft = 0.6 + 0.4 * r.battery, off = r.kind === 'hauler' ? -5 : r.kind === 'stacker' ? 5 : 0;
      note('robot', r.deg + off, t, r.kind === 'stacker' ? 0.5 : 0.22, 0.08, { soft: soft, bright: r.kind === 'hauler' ? 900 : 2200, att: 0.006, why: r.kind + ' b' + r.battery.toFixed(2) });
    }
    function spacing(r) { var s = BASE_STEPS[r.kind] * (1 + Math.round(3 * (1 - r.battery) * (1 - r.battery))); if (st.week === 'lowtide') s *= 2; return s; }
    function gridStep(k, t) {
      var id, r, pos, tab, d;
      for (id in st.robots) { r = st.robots[id]; if (k >= r.next) { robotStep(r, t); r.next = k + spacing(r); } }
      pos = ((k % st.phraseLen) + st.phraseLen) % st.phraseLen; var bar = Math.floor(k / st.phraseLen);
      if (st.week !== 'none' && !st.night && (st.week !== 'lowtide' || bar % 2 === 0) && (tab = st.phraseTab[st.week]) && (d = tab[pos]) != null)
        note('phrase', d + baseDeg(), t, 1.4, 0.15, { att: 0.02, bright: 2000, why: 'phrase ' + st.week });
      if (!st.night && !st.dark && st.storm < 0.3 && k % 16 === 8 && unit(st.h, k + 5000) < 0.12) gull(t, 'gull wanders');
    }
    function gull(t, why) { note('gull', 12 + Math.floor(unit(st.h, Math.round(t * 10)) * 4), t, 0.5, 0.1, { att: 0.03, glide: 1.06, bright: 5000, why: why }); }
    function tick(tn) {
      if (!st.running || !I.ctx) return; if (tn == null) tn = now(); var gk;
      if (st.lastGrid < 0) st.lastGrid = Math.floor((tn - st.t0) / st.grid);
      while (true) { gk = st.lastGrid + 1; var t = st.t0 + gk * st.grid; if (t > tn + LOOK) break; st.lastGrid = gk; if (t >= tn - 0.05) gridStep(gk, t); }
    }
    function sim(t) { st.manual = t; tick(t); }
    /* ----- API ----- */
    I.setIsland = setIsland;
    I.setTide = function (v) { st.tide = clamp01(v, st.tide); retunePad(); return st.tide; };
    I.setStorm = function (v) {
      st.storm = clamp01(v, st.storm); var was = st.dark;
      if (!st.dark && st.storm > 0.55) st.dark = true; else if (st.dark && st.storm < 0.4) st.dark = false;
      if (was !== st.dark) { retunePad(); if (!st.dark && st.running) { var g = gridTime(now() + 0.05), i; for (i = 0; i < 3; i++) note('cue', [0, 2, 4][i] + 5, g.t + i * st.grid * 2, 1.2, 0.2, { att: 0.03, bright: 2400, why: 'brighten after storm' }); } }
      else retunePad(); return st.storm;
    };
    I.setNight = function (v) { st.night = !!v; return st.night; };
    I.setWeekBeat = function (name) { name = String(name); if (!/^(tender|lowtide|lighthouse|none)$/.test(name)) return false; st.week = name; retunePad(); return true; };
    I.lighthouse = function () { var g = gridTime(now() + 0.05), d = LIGHT_PATTERN[st.lightN++ % LIGHT_PATTERN.length] - 5 + baseDeg(); return note('light', d, g.t, 5, 0.22, { att: 1.2, bright: 1400, type: 'sine', bell: 0.12, why: 'beam sweep' }); };
    I.robotBeat = function (id, kind, battery) {
      id = String(id); if (!BASE_STEPS[kind]) return false; var r = st.robots[id], n = 0, k;
      if (!r) { for (k in st.robots) n++; if (n >= CAPS.robot) return false; r = st.robots[id] = { deg: Math.floor(unit(st.h, fnv(id)) * 5), next: st.lastGrid + 2 }; }
      r.kind = kind; r.battery = clamp01(battery, 1); return true;
    };
    I.robotStop = function (id) { delete st.robots[String(id)]; };
    I.cue = function (name) {
      var g = gridTime(now() + 0.05), s = st.grid * 2, ok = false, i;
      switch (String(name)) {
        case 'winch': ok = note('cue', 4, g.t, 1.0, 0.2, { att: 0.02, bright: 1800, why: 'winch note 1' }); note('cue', 2, g.t + s, 1.4, 0.2, { att: 0.02, bright: 1800, why: 'winch note 2' }); break;
        case 'key': for (i = 0; i < 3; i++) ok = note('cue', [0, 2, 4][i] + 5, g.t + i * st.grid, 1.4, 0.2, { att: 0.005, bright: 4000, bell: 0.5, why: 'key motif ' + (i + 1) }) || ok; break;
        case 'gull': ok = note('gull', 12 + (st.count % 4), g.t, 0.5, 0.1, { att: 0.03, glide: 1.06, bright: 5000, why: 'gull cue' }); break;
        case 'thunder': ok = note('cue', -10, g.t, 5, 0.25, { att: 0.4, bright: 500, type: 'sine', bell: 0.1, why: 'thunder low note' }); break;
        case 'delivery': ok = note('cue', -5, g.t, 1.6, 0.2, { att: 0.05, bright: 900, why: 'delivery 1' }); note('cue', -3, g.t + s, 2, 0.2, { att: 0.05, bright: 900, why: 'delivery 2' }); break;
        default: return false;
      } return ok;
    };
    I.start = function () { if (!I.ctx) return false; st.running = true; st.t0 = st.t0 || now(); startPad(now()); if (!st.timer && st.manual == null && !(opts && opts.noTimer)) st.timer = setInterval(function () { tick(); }, TICK_MS); retunePad(true); return true; };
    I.stop = function () { st.running = false; if (st.timer) { clearInterval(st.timer); st.timer = 0; } if (st.pad) { var p = st.pad; p.g.gain.setTargetAtTime(0.0001, now(), 0.4); p.o.forEach(function (o) { try { o.stop(now() + 2); } catch (e) { } }); st.pad = null; } st.lastGrid = -1; };
    I.attach = function (c, o) { I.ctx = c; I.out = o; };
    I.sim = sim; I.tick = tick;
    I.dump = function (n) { return I.log.slice(-(n || 30)).map(function (e) { return e.t.toFixed(2) + 's ' + e.voice + ' deg ' + e.deg + ' midi ' + e.midi + (e.why ? ' (' + e.why + ')' : ''); }); };
    I.notes = function () { return I.log.slice(); };
    I.scalePcs = function () { return st.scale.slice(); }; I.root = function () { return st.root; };
    I.voices = function () { prune(now()); return st.voices.length; };
    I.stats = function () { prune(now()); return { voices: st.voices.length, maxNotes: MAXN, budget: BUDGET, used: st.voices.reduce(function (a, v) { return a + v.w; }, 0), notes: st.count, refused: st.refused, mood: st.mood, root: st.root, bpm: st.bpm, scale: st.scale.slice(), week: st.week, dark: st.dark, tide: st.tide, storm: st.storm, running: st.running }; };
    setIsland(opts && opts.seed != null ? opts.seed : 1);
    return I;
  }

  /* ----- live singleton on LI_AUDIO ----- */
  var live = create(null, null, { clock: function () { var h = root.LI_AUDIO && root.LI_AUDIO.hook(); return h && h.ctx ? h.ctx.currentTime : 0; }, noTimer: true }), want = false, poll = 0, ticker = 0;
  function tryAttach() {
    var A = root.LI_AUDIO, h = A && A.hook && A.hook(); if (!h || !h.running || !h.ctx) return false;
    var c = h.ctx, g = c.createGain(); g.gain.value = 0.5; g.connect(h.bus); live.attach(c, g); A.chordBed(false); live.start();
    if (!ticker) ticker = setInterval(function () { live.tick(); }, TICK_MS); return true;
  }
  var API = {
    create: create, scaleCount: SCALES.length,
    start: function () { want = true; if (live.ctx || tryAttach()) return true; if (!poll) poll = setInterval(function () { if (want && tryAttach()) { clearInterval(poll); poll = 0; } }, 200); return false; },
    stop: function () { want = false; if (poll) { clearInterval(poll); poll = 0; } if (ticker) { clearInterval(ticker); ticker = 0; } live.stop(); if (root.LI_AUDIO && root.LI_AUDIO.chordBed) root.LI_AUDIO.chordBed(true); live.attach(null, null); },
    setIsland: live.setIsland, setTide: live.setTide, setStorm: live.setStorm, setNight: live.setNight, setWeekBeat: live.setWeekBeat, lighthouse: live.lighthouse,
    robotBeat: live.robotBeat, robotStop: live.robotStop, cue: live.cue, dump: live.dump, stats: live.stats, voices: live.voices, isRunning: function () { return live.stats().running; }
  };
  root.LI_SONG = API;
})(typeof window !== 'undefined' ? window : this);
