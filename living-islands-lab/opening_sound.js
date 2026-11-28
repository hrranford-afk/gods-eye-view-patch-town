/* Living Islands: SOUND FOR THE OPENING FILM. Cues the film (opening.js) names, turned into LI_AUDIO and LI_SONG calls, plus the beds (sea, wind, rain, rock hum), the quay robots and the island song.
   Pure of THREE and of the DOM. The audio objects are PASSED IN (the real LI_AUDIO and LI_SONG in the page, a recording fake in the node test), so the same code is tested without a sound card.
   One clock: the page calls step(t, playing, speed) every frame with the film time. SEEK-SAFE: seek(t) (also found by itself when t jumps or goes back) puts the cue cursor on the first cue at or after t and restarts the
   beds and the robots at the state of film time t. Cues in the past are never played, a cue is never played twice, and a cue at exactly t plays on the next step. Nothing here uses Math.random or a wall clock.
   Not tuned by ear: every number below is a first guess (nobody has listened). See research/OPENING_SOUND_REPORT.md for what to listen for. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.LI_OPENING_SOUND = api;
  if (typeof globalThis !== 'undefined') globalThis.LI_OPENING_SOUND = api;
}(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const MAXSPEED_BEDS = 2;      /* above this speed the beds, robots and music are muted (they would squeal and smear) and one-shot cues are skipped */
  const JUMP = 1.6;             /* a forward step bigger than this many film seconds is a seek nobody announced */

  /* sounds the film adds that are not film cues: derived from the time only, so seeking treats them like cues */
  const EXTRAS = [
    { t: 22.4, name: 'lantern-creak' }, { t: 26.5, name: 'quay-crate' }, { t: 27.2, name: 'lantern-creak' }, { t: 33.4, name: 'lantern-creak' },
    { t: 36.5, name: 'rock-hum', arg: 0.1 }, { t: 39, name: 'rock-hum', arg: 0.3 }, { t: 41.5, name: 'rock-hum', arg: 0.5 }, { t: 44, name: 'rock-hum', arg: 0.7 }, { t: 46.5, name: 'rock-hum', arg: 0.9 },
    { t: 44.6, name: 'wash-roar' }
  ];
  /* the cue table: name -> function(ctx). ctx = { audio, song, synth, arg, s } (s = film scalar state at the cue time). A cue named here that has no calls is simply silent (flash). */
  const ACT = {
    'beam-sweep': x => { x.song.lighthouse(); if ((x.s.beam || 0) >= 0.4) x.audio.playEvent('hum', { pitch: 0.2 + 0.08 * ((x.arg | 0) % 4), duration: 4 }); },
    'boat-lamp': x => { x.audio.playEvent('creak'); },
    'dawn-bell': x => { x.audio.playEvent('gull'); x.song.cue('delivery'); },
    'winch': x => { x.audio.playEvent('winch'); x.song.cue('winch'); },
    'crate-set': x => { x.audio.playEvent('thud'); },
    'quay-crate': x => { x.audio.playEvent('thud'); },
    'lantern-creak': x => { x.audio.playEvent('creak'); },
    'rope-taut': x => { x.audio.playEvent('creak'); x.audio.playEvent('scrape', { ground: 'plank' }); },
    'swell-rise': x => { x.audio.playEvent('roar', { duration: 6, level: 0.3 }); },
    'rock-hum': x => { x.audio.playEvent('hum', { pitch: x.arg, duration: 3.5 }); },
    'wash-roar': x => { x.audio.playEvent('roar', { duration: 11, level: 1 }); },
    'thunder': x => { x.audio.playEvent('thunder', { level: x.arg === undefined ? 0.6 : x.arg }); if ((x.arg || 0) >= 0.8) x.song.cue('thunder'); },
    'crest': x => { x.audio.playEvent('wake'); },
    'snag': x => { x.audio.playEvent('creak'); x.audio.playEvent('scrape', { ground: 'plank' }); },
    'raft-turn': x => { x.audio.playEvent('creak'); x.audio.playEvent('wake'); },
    'roar-cut': x => { x.cutBeds(); },
    'drip': x => { x.synth.drip(); },
    'rainbow': x => { x.song.cue('delivery'); },
    'oar': x => { x.audio.playEvent('creak'); x.audio.playEvent('wake'); },
    'piles-slide': x => { x.audio.playEvent('scrape', { ground: 'stone' }); x.audio.playEvent('creak'); },
    'battery-seat': x => { x.synth.clunk(); },
    'relay': x => { x.synth.click(); x.audio.playEvent('hum', { pitch: 1, duration: 5 }); },
    'key': x => { x.audio.playEvent('key'); x.song.cue('key'); },
    'flash': null
  };

  /* the sea, wind, rain, night values at film state s and time t (all 0..1). The roar is cut at 59 s with the picture. */
  function bedsAt(s, t) {
    const sw = s.seaSwell || 0, st = (s.seaStorm || 0) * (t >= 59 && t < 64 ? 0.2 : 1), af = s.seaAfter || 0;
    return {
      sea: clamp(0.10 + 0.30 * sw + 0.90 * st + 0.22 * af, 0, 1),
      wind: clamp(0.07 + 0.18 * sw + 0.85 * st + 0.08 * af, 0, 1),
      rain: (s.rain || 0) < 0.05 ? 0 : clamp(s.rain, 0, 1),
      night: clamp(0.45 * (s.stars || 0), 0, 1),
      storm: clamp(s.seaStorm || 0, 0, 1)
    };
  }
  /* the quay robots: id -> {kind, state, battery}. Kinds and battery states differ so the work sounds differ. */
  function robotsAt(t) {
    const r = {};
    if (t >= 20 && t < 44) r['q-haul'] = { kind: 'hauler', state: 'work', battery: 0.9 };
    if (t >= 20 && t < 41) r['q-sort'] = { kind: 'sorter', state: 'work', battery: 0.6 };
    if (t >= 20 && t < 36) r['q-stack'] = { kind: 'stacker', state: 'tired', battery: 0.3 };
    if (t >= 88.2) r['repair'] = { kind: 'hauler', state: 'idle', battery: 1 };
    return r;
  }

  /* own tiny voices that LI_AUDIO has no event for: a drip, a relay click, a battery clunk. (ctx, out, t) -> seconds. Same style as audio.js. */
  function tone(c, out, type, f0, f1, t, dur, peak, att) {
    const o = c.createOscillator(), g = c.createGain(); att = Math.min(att || 0.005, dur * 0.5);
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02); o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) { } };
  }
  const VOICES = {
    drip: (c, out, t) => { tone(c, out, 'sine', 1900, 850, t, 0.11, 0.22, 0.002); tone(c, out, 'sine', 2900, 1500, t + 0.045, 0.07, 0.07, 0.002); return 0.2; },
    click: (c, out, t) => { tone(c, out, 'square', 1500, 700, t, 0.02, 0.16, 0.001); tone(c, out, 'sine', 3300, 3000, t, 0.03, 0.1, 0.001); return 0.1; },
    clunk: (c, out, t) => { tone(c, out, 'sine', 140, 55, t, 0.22, 0.42, 0.004); tone(c, out, 'square', 700, 300, t, 0.018, 0.08, 0.001); return 0.3; }
  };
  /* the live synth on the audio context of LI_AUDIO: its own gain to the destination, level follows LI_AUDIO's master, effects and mute. Returns inert functions when there is no running context. */
  function makeSynth(audio) {
    const out = {}; let node = null, nodeCtx = null;
    Object.keys(VOICES).forEach(k => {
      out[k] = function () {
        try {
          const h = audio.hook && audio.hook(); if (!h || !h.ctx || !h.running) return false;
          const c = h.ctx; if (!node || nodeCtx !== c) { node = c.createGain(); node.connect(c.destination); nodeCtx = c; }
          const st = audio.stats(); node.gain.value = audio.isMuted() ? 0 : 0.8 * st.master * st.fx;
          VOICES[k](c, node, c.currentTime + 0.01); return true;
        } catch (e) { return false; }
      };
    });
    return out;
  }

  /* wrap an object so every call is logged with the film time, then passed on */
  function recorder(obj, kind, log, clock) {
    const w = {}; for (const k in obj) { if (typeof obj[k] !== 'function') continue; w[k] = function () { const a = Array.prototype.slice.call(arguments); log.push({ kind, fn: k, args: a, t: clock() }); if (log.length > 6000) log.splice(0, 1000); return obj[k].apply(obj, a); }; }
    return w;
  }

  /* create(director, { audio, song, synth?, musicVolume? }) -> the sound track for that film */
  function create(dir, opts) {
    opts = opts || {};
    const log = []; let lastT = 0, filmT = 0;
    const audio = recorder(opts.audio, 'audio', log, () => filmT), song = recorder(opts.song, 'song', log, () => filmT);
    const synth = recorder(opts.synth || makeSynth(opts.audio), 'synth', log, () => filmT);
    const list = dir.cues.map(c => ({ t: c.t, name: c.name, arg: c.arg, src: 'film' })).concat(EXTRAS.map(e => ({ t: e.t, name: e.name, arg: e.arg, src: 'extra' }))).sort((a, b) => a.t - b.t);
    const S = { on: false, playing: false, speed: 1, cursor: 0, music: opts.musicVolume === undefined ? 0.2 : opts.musicVolume, sent: {}, robots: {}, fired: [], suspended: false, lastSpeedMute: false };
    const idx = t => { let i = 0; while (i < list.length && list[i].t < t - 1e-9) i++; return i; };
    const live = () => S.on && S.playing && S.speed <= MAXSPEED_BEDS;

    function put(key, v, fn) { if (S.sent[key] === undefined || Math.abs(S.sent[key] - v) > 0.01) { S.sent[key] = v; fn(v); } }
    function beds(t, force) {
      if (force) S.sent = {};
      const b = live() ? bedsAt(dir.state(t), t) : { sea: 0, wind: 0, rain: 0, night: 0, storm: 0 };
      put('sea', b.sea, v => audio.setSeaEnergy(v)); put('wind', b.wind, v => audio.setWind(v)); put('rain', b.rain, v => audio.setRain(v)); put('night', b.night, v => audio.setNight(v));
      put('storm', b.storm, v => song.setStorm(v));
      put('music', live() ? S.music : 0, v => audio.setMusicVolume(v));
      const want = live() ? robotsAt(t) : {};
      for (const id in S.robots) if (!want[id]) { audio.robotStop(id); delete S.robots[id]; }
      for (const id in want) { const w = want[id], h = S.robots[id]; if (force || !h || h.state !== w.state || h.battery !== w.battery) { audio.robotWork(id, w.kind, w.state, w.battery, 0.6); S.robots[id] = w; } }
    }
    function stopRobots() { for (const id in S.robots) audio.robotStop(id); S.robots = {}; }
    function ctxOf() { try { const h = opts.audio.hook && opts.audio.hook(); return h && h.ctx; } catch (e) { return null; } }
    function suspend(on) {
      if (on === S.suspended) return; S.suspended = on; const c = ctxOf();
      try { if (c) { if (on && c.suspend) c.suspend(); else if (!on && c.resume) c.resume(); } } catch (e) { }
    }

    const api = {
      log, list, state: S,
      /* the Sound on button (a user gesture): unlocks the audio context, starts the song. Safe to call twice. */
      enable() {
        if (!S.on) { S.on = true; opts.audio.unlock(); opts.audio.setMusicVolume(0); opts.song.setIsland && opts.song.setIsland('gift-opening'); opts.song.setWeekBeat && opts.song.setWeekBeat('lighthouse'); opts.song.start(); }
        api.seek(filmT); S.playing = !!S.playing; beds(filmT, true); return true;
      },
      disable() { if (!S.on) return; stopRobots(); S.sent = {}; S.on = false; put('sea', 0, v => audio.setSeaEnergy(v)); audio.setWind(0); audio.setRain(0); audio.setNight(0); audio.setMusicVolume(0); opts.song.stop(); suspend(false); },
      mute(b) { return audio.mute(!!b); },
      setMusic(v) { S.music = clamp(+v || 0, 0, 1); beds(filmT, false); },
      /* reposition: the cue cursor goes to the first cue at or after t, the beds and robots restart at the state of t. Fires nothing. */
      seek(t) { t = +t || 0; filmT = lastT = t; S.cursor = idx(t); S.sent = {}; stopRobots(); if (S.on) beds(t, true); return S.cursor; },
      /* the frame call: t = film time, playing, speed. Returns the cues fired in this step. */
      step(t, playing, speed) {
        t = +t || 0; speed = speed || 1; const fired = [];
        if (t < lastT - 1e-9 || t - lastT > JUMP) api.seek(t);   /* a jump nobody announced: reposition */
        filmT = t; const wasPlaying = S.playing, wasSpeedMute = S.speed > MAXSPEED_BEDS; S.playing = !!playing; S.speed = speed;
        const speedMute = speed > MAXSPEED_BEDS;
        if (S.on && (wasPlaying !== S.playing || wasSpeedMute !== speedMute)) { suspend(!S.playing); beds(t, true); }
        const quiet = !S.on || !S.playing || speedMute;
        while (S.cursor < list.length && list[S.cursor].t <= t + 1e-9) {
          const c = list[S.cursor++]; if (quiet || !S.playing) continue; const a = ACT[c.name]; if (!a) continue;
          const s = dir.state(c.t); filmT = c.t;
          a({ audio, song, synth, arg: c.arg, s, cutBeds() { beds(c.t, false); } }); filmT = t; fired.push(c); S.fired.push({ t: c.t, name: c.name });
        }
        if (S.on) beds(t, false);
        lastT = t; return fired;
      },
      /* the sound cue names a shot owns (for the coverage test): every film or extra cue in [t0, t1) that has an action with at least one call */
      shotCues(t0, t1) { return list.filter(c => c.t >= t0 && c.t < t1 && ACT[c.name]); }
    };
    return api;
  }
  return { create, makeSynth, VOICES, ACT, EXTRAS, bedsAt, robotsAt, MAXSPEED_BEDS, JUMP };
}));
