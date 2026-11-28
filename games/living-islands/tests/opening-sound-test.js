/* Sound for the opening film (opening_sound.js): node part with a FAKE audio object (order of cues, seek-safety, no duplicates over 20 random scrubs, speed, pause, mute, coverage per shot),
   browser part (skipped with browser=0 or without playwright): opening_proto.html with zero console errors, the real LI_AUDIO and LI_SONG driven through the film, every shot has at least one sound call,
   and every event the film uses renders to a finite, non-silent OfflineAudioContext buffer. NOBODY LISTENED: this proves the wiring and that the sounds are not silent, not that they sound good.
   Run: NODE_PATH=/opt/node-tools/node_modules node games/living-islands/tests/opening-sound-test.js   (browser=0 for node only) */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..'), require = createRequire(import.meta.url);
await import('../sea_waves.js'); await import('../opening.js'); await import('../opening_sound.js');
const O = globalThis.LI_OPENING, SND = globalThis.LI_OPENING_SOUND;
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const win = {}; new Function('window', fs.readFileSync(path.join(root, 'sea_proto', 'island_9001.js'), 'utf8'))(win);
const field = O.makeIslands(O.decodeIsland(win.SEA_ISLAND)), layout = O.buildLayoutFull(field), film = O.defaultFilm(layout, field);

/* a fake LI_AUDIO / LI_SONG / synth: every call is recorded, nothing is played */
function fakes() {
  const calls = [], rec = (kind, names, ret) => { const o = {}; names.forEach(k => { o[k] = (...a) => { calls.push({ kind, fn: k, args: a }); return ret && ret[k] !== undefined ? ret[k] : true; }; }); return o; };
  const ctx = { suspended: 0, resumed: 0, suspend() { this.suspended++; }, resume() { this.resumed++; } };
  const audio = rec('a', ['unlock', 'setSeaEnergy', 'setWind', 'setRain', 'setNight', 'robotWork', 'robotStop', 'playEvent', 'setMusicVolume', 'mute']);
  audio.hook = () => ({ ctx, bus: {}, running: true }); audio.stats = () => ({ master: .7, fx: 1 }); let muted = false; audio.mute = b => { muted = !!b; calls.push({ kind: 'a', fn: 'mute', args: [b] }); return muted; }; audio.isMuted = () => muted;
  const song = rec('s', ['setIsland', 'setWeekBeat', 'start', 'stop', 'setStorm', 'lighthouse', 'cue']);
  const synth = rec('y', ['drip', 'click', 'clunk']);
  return { audio, song, synth, calls, ctx };
}
const mk = () => { const f = fakes(), dir = new O.Director(film), snd = SND.create(dir, { audio: f.audio, song: f.song, synth: f.synth }); return { f, dir, snd }; };
const SOUNDING = c => SND.ACT[c.name] && c.name !== 'roar-cut';
const BED_FNS = new Set(['setSeaEnergy', 'setWind', 'setRain', 'setNight', 'setStorm', 'setMusicVolume', 'robotStop', 'robotWork']);
const soundCalls = (log, from, to) => log.filter(e => e.t >= from - 1e-9 && e.t <= to + 1e-9 && !BED_FNS.has(e.fn) && !['unlock', 'setIsland', 'setWeekBeat', 'start', 'stop', 'mute'].includes(e.fn));

/* 1. the table: every sounding cue name of the film has an action, every action is used, cues are in time order */
{
  const names = new Set(film.cues.map(c => c.name)), un = [...names].filter(nm => !(nm in SND.ACT));
  ok(un.length === 0, 'every cue name in the film has an entry in the sound table (unmapped: ' + (un.join(',') || 'none') + ')');
  const { snd } = mk(); let sorted = true; for (let i = 1; i < snd.list.length; i++) if (snd.list[i].t < snd.list[i - 1].t) sorted = false;
  ok(sorted && snd.list.length >= film.cues.length + SND.EXTRAS.length, 'film cues plus ' + SND.EXTRAS.length + ' derived sounds are one list in time order (' + snd.list.length + ')');
}

/* 2. before Sound on: stepping through the film makes no call at all (no sound without the tap) */
{
  const { f, snd } = mk(); for (let t = 0; t <= 90; t += 1 / 30) snd.step(t, true, 1);
  ok(f.calls.length === 0, 'before the Sound on tap, playing the whole film makes zero audio calls (' + f.calls.length + ')');
}

/* 3. cue order over a full play: exactly the sounding cues, each once, in order, with the right calls */
{
  const { f, snd } = mk(); snd.step(0, false, 1); snd.enable(); const fired = []; snd.step(0, true, 1);
  for (let t = 1 / 60; t <= 90 + 1e-9; t += 1 / 60) for (const c of snd.step(t, true, 1)) fired.push(c);
  const wantFilm = snd.list.filter(c => c.t > 1e-9 && SND.ACT[c.name]);
  ok(fired.length === wantFilm.length && fired.every((c, i) => c.t === wantFilm[i].t && c.name === wantFilm[i].name), 'full play: ' + fired.length + ' cues fired, each once, in film order (expected ' + wantFilm.length + ')');
  let ord = true; for (let i = 1; i < fired.length; i++) if (fired[i].t < fired[i - 1].t) ord = false; ok(ord, 'cue times never go backwards in the play');
  const miss = wantFilm.filter(c => c.name !== 'roar-cut' && soundCalls(snd.log, c.t, c.t).length === 0);
  ok(miss.length === 0, 'every sounding cue made at least one sound call at its own time (silent: ' + miss.map(c => c.name + '@' + c.t).join(',') + ')');
  const th = snd.log.filter(e => e.fn === 'playEvent' && e.args[0] === 'thunder').map(e => e.t.toFixed(1)).join(' ');
  ok(th === '46.9 49.9 52.6 56.9', 'thunder plays at the four thunder cues (' + th + ')');
  const key = snd.log.filter(e => e.fn === 'playEvent' && e.args[0] === 'key').map(e => e.t), kn = snd.log.filter(e => e.fn === 'cue' && e.args[0] === 'key').map(e => e.t);
  ok(key.length === 1 && key[0] === 86.4 && kn.length === 1, 'the brass key motif plays once, at 86.4 s with the relay, in LI_AUDIO and LI_SONG');
  ok(snd.log.some(e => e.fn === 'click' && e.t === 86.4) && snd.log.some(e => e.fn === 'playEvent' && e.args[0] === 'hum' && e.t === 86.4), 'the relay click and the soft lens hum are at 86.4 s');
  const sweeps = snd.log.filter(e => e.fn === 'lighthouse').map(e => e.t); ok(sweeps.length === 4, 'the lighthouse note plays at each of the four sweeps (' + sweeps.join(', ') + ')');
  const drips = snd.log.filter(e => e.fn === 'drip').map(e => e.t); ok(drips.join() === '61.5,65.2,68', 'three drips in the silence after the storm (' + drips.join(', ') + ')');
  const songStorm = snd.log.filter(e => e.fn === 'setStorm'); const hi = songStorm.filter(e => e.args[0] > .55), after = songStorm.filter(e => e.t > 62);
  ok(hi.length > 0 && Math.min(...hi.map(e => e.t)) > 44 && Math.min(...hi.map(e => e.t)) < 50 && after.length && after[after.length - 1].args[0] < .05, 'the song is told the storm from about ' + Math.min(...hi.map(e => e.t)).toFixed(1) + ' s and told it is over by 62 s (it breaks to the storm key and returns)');
  const mv = snd.log.filter(e => e.fn === 'setMusicVolume').map(e => e.args[0]); ok(Math.max(...mv) <= 0.3 && Math.max(...mv) > 0, 'music volume is low by default (peak ' + Math.max(...mv) + ')');
}

/* 4. beds follow the sea state: calm sea quiet, storm loud, rain only in the storm, silence after the cut */
{
  const { f, snd } = mk(); snd.enable(); snd.step(0, true, 1);
  const at = t => { snd.seek(t); snd.step(t, true, 1); const g = k => { const e = snd.log.filter(x => x.fn === k && x.t === t).pop(); return e ? e.args[0] : null; }; return { sea: g('setSeaEnergy'), wind: g('setWind'), rain: g('setRain') }; };
  const a = at(5), b = at(50.5), c = at(62), d = at(75);
  ok(a.sea < .25 && b.sea > .85 && b.wind > .7 && b.rain > .8 && a.rain === 0, 'night calm sea ' + a.sea.toFixed(2) + ', Great Wash sea ' + b.sea.toFixed(2) + ' wind ' + b.wind.toFixed(2) + ' rain ' + b.rain.toFixed(2));
  ok(c.rain === 0 && c.sea < .3 && c.wind < .2 && d.sea < .3, 'after the storm: rain 0, sea ' + c.sea.toFixed(2) + ', wind ' + c.wind.toFixed(2) + ' (silence)');
  const r = t => { snd.seek(t); snd.step(t, true, 1); return Object.keys(snd.state.robots).sort().join('+'); };
  ok(r(25) === 'q-haul+q-sort+q-stack' && r(40) === 'q-haul+q-sort' && r(60) === '' && r(89) === 'repair', 'quay robots work at the quay (' + r(25) + '), fewer as the swell comes, none after the storm, one wakes after the repair');
  const kinds = snd.log.filter(e => e.fn === 'robotWork' && e.t === 25).map(e => e.args[1] + ':' + e.args[2] + ':' + e.args[3]).join(' ');
  ok(/hauler:work:0.9/.test(kinds) && /sorter:work:0.6/.test(kinds) && /stacker:tired:0.3/.test(kinds), 'robot work sounds differ by kind and battery state (' + kinds + ')');
}

/* 5. SEEK SAFETY: 20 random scrubs. After each seek nothing fires; playing on fires exactly the cues after the seek time, each once, none before. */
{
  const { f, snd } = mk(); snd.enable(); snd.step(0, true, 1); let seed = 12345; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  let bad = [], dup = 0, early = 0, wrongSet = 0, seekCalls = 0, totalFired = 0;
  for (let k = 0; k < 20; k++) {
    const t0 = Math.round(rnd() * 880) / 10, len = 2 + rnd() * 14, t1 = Math.min(90, t0 + len), before = snd.log.length;
    snd.seek(t0); const during = snd.log.slice(before).filter(e => !BED_FNS.has(e.fn)); seekCalls += during.length;
    const got = []; const dt = 1 / 45; for (let t = t0 + dt; t < t1 + dt; t += dt) { const tt = Math.min(t, t1); for (const c of snd.step(tt, true, 1)) got.push(c); }
    const keys = got.map(c => c.name + '@' + c.t), set = new Set(keys); if (set.size !== keys.length) dup++;
    if (got.some(c => c.t < t0 - 1e-9)) early++;
    const expect = snd.list.filter(c => c.t >= t0 - 1e-9 && c.t <= t1 + 1e-9 && SND.ACT[c.name] && !(c.t === t0 && false)).map(c => c.name + '@' + c.t);
    if (expect.join('|') !== keys.join('|')) { wrongSet++; bad.push(t0.toFixed(2) + '-' + t1.toFixed(2) + ' got ' + keys.length + ' want ' + expect.length); }
    totalFired += got.length;
    /* a scrub back over the same stretch (replay it): the cues fire again exactly once more, never doubled within one pass */
  }
  ok(seekCalls === 0, 'seeking itself fires no cue: only bed and robot restarts (20 random scrubs, ' + seekCalls + ' sound calls during seeks)');
  ok(dup === 0 && early === 0, '20 random scrubs then play: no duplicate cue in any pass (' + dup + '), no cue from before the seek time (' + early + ')');
  ok(wrongSet === 0, '20 random scrubs: each pass fires exactly the cues between the seek time and the stop time, in order (' + totalFired + ' fired in total' + (bad.length ? '; wrong: ' + bad.join('; ') : '') + ')');
  /* a seek into the middle of the storm restarts the beds at the storm values at once */
  snd.seek(51); const tail = snd.log.slice(-12); ok(tail.some(e => e.fn === 'setSeaEnergy' && e.args[0] > .85) && tail.some(e => e.fn === 'setRain' && e.args[0] > .8), 'a seek to 51 s restarts the sea and rain beds at their storm values');
  /* a jump nobody announced (the page forgot to call seek) is found by itself */
  const m = mk(); m.snd.enable(); m.snd.step(10, true, 1); const b0 = m.f.calls.length; m.snd.step(70, true, 1); const fired = m.f.calls.slice(b0).filter(e => !BED_FNS.has(e.fn)).length; ok(fired === 0, 'a jump from 10 s to 70 s with no seek call fires nothing (found by the step size)');
  m.snd.step(2, true, 1); const b1 = m.f.calls.length; m.snd.step(2.02, true, 1); ok(m.f.calls.slice(b1).filter(e => !BED_FNS.has(e.fn)).length === 0, 'a step backwards (replay) is a seek: nothing from the past plays');
  /* the page's seek(t) then a cue exactly at t plays on the next step, once */
  const q = mk(); q.snd.enable(); q.snd.step(0, true, 1); q.snd.seek(46.9); const g1 = q.snd.step(46.9, true, 1), g2 = q.snd.step(46.92, true, 1); ok(g1.filter(c => c.name === 'thunder').length === 1 && g2.length === 0, 'a cue exactly at the seek time plays once on the next step');
}

/* 6. speed, pause, mute */
{
  const { f, snd, dir } = mk(); snd.enable(); snd.step(40, true, 1); const n0 = f.calls.length;
  for (let t = 40; t < 50; t += 0.1) snd.step(t, true, 4); const c4 = f.calls.slice(n0);
  ok(c4.filter(e => !BED_FNS.has(e.fn)).length === 0, 'at 4x no one-shot cue plays and no squeal (skipped cues: ' + c4.filter(e => !BED_FNS.has(e.fn)).length + ')');
  const last = k => { const e = f.calls.filter(x => x.fn === k).pop(); return e && e.args[0]; };
  ok(last('setSeaEnergy') === 0 && last('setWind') === 0 && last('setRain') === 0 && last('setMusicVolume') === 0 && Object.keys(snd.state.robots).length === 0, 'at 4x the beds, the music and the robots are muted');
  const m1 = f.calls.length; snd.step(50.2, true, 1); ok(f.calls.slice(m1).some(e => e.fn === 'setSeaEnergy' && e.args[0] > .8), 'back at 1x the beds come back at the storm values');
  const p0 = f.ctx.suspended; snd.step(50.3, false, 1); ok(f.ctx.suspended === p0 + 1 && last('setSeaEnergy') === 0, 'pause suspends the audio context and silences the beds');
  const m2 = f.calls.length; for (let t = 50.3; t < 53; t += .1) snd.step(t, false, 1); ok(f.calls.slice(m2).filter(e => !BED_FNS.has(e.fn)).length === 0, 'while paused no cue fires');
  snd.seek(50.5); snd.step(50.5, true, 1); ok(f.ctx.resumed >= 1 && last('setSeaEnergy') > .8, 'play resumes the context and restores the beds');
  ok(snd.mute(true) === true && f.audio.isMuted() && snd.mute(false) === false, 'the mute button reaches LI_AUDIO.mute');
  const n1 = f.calls.length; snd.disable(); ok(f.calls.slice(n1).some(e => e.fn === 'stop') && last('setSeaEnergy') === 0, 'turning Sound off stops the song and the beds');
}

/* 7. every shot has at least one sound cue */
{
  const { snd, dir } = mk(); const rows = dir.shots.map(s => s.id + ' ' + snd.shotCues(s.t0, s.t1).filter(c => c.name !== 'roar-cut').length);
  ok(dir.shots.every(s => snd.shotCues(s.t0, s.t1).filter(c => c.name !== 'roar-cut').length >= 1), 'every shot has at least one sound cue (' + rows.join(', ') + ')');
}

/* 8. browser part */
let browserRun = process.argv.every(a => a !== 'browser=0');
if (browserRun) {
  let pw = null; try { pw = require('playwright'); } catch (e) { try { pw = createRequire((process.env.NODE_PATH || '/opt/node-tools/node_modules') + '/')('playwright'); } catch (e2) { } }
  if (!pw) { console.log('SKIP browser part (no playwright)'); }
  else {
    const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
    const ctx = await browser.newContext({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 }), page = await ctx.newPage(), errs = [];
    page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|GPU stall|ReadPixels/.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await page.goto('file://' + path.join(root, 'opening_proto.html') + '?freeze=1&tier=ipad&t=3');
    await page.waitForFunction(() => window.__opening && window.__opening.ready && window.__oframes > 2, null, { timeout: 600000 });
    ok(await page.evaluate(() => !!document.getElementById('bSound') && !!window.__opening.sound), 'the page has a Sound on button and a sound track');
    await page.click('#bSound'); await page.waitForTimeout(600);
    const st = await page.evaluate(() => ({ run: LI_AUDIO.isRunning(), song: LI_SONG.isRunning(), label: document.getElementById('bSound').textContent, music: LI_AUDIO.stats().music }));
    ok(st.run && st.song && st.music <= 0.3, 'after the tap the audio context runs and the song starts (button "' + st.label + '", music volume ' + st.music + ')');
    /* drive the film through the sound track with the real LI_AUDIO and LI_SONG, scrub twice, then check the log */
    const res = await page.evaluate(async () => {
      const o = window.__opening, snd = o.sound, dir = o.dir; snd.seek(0); snd.log.length = 0; const seen = [];
      const run = (a, b, sp) => { for (let t = a; t <= b + 1e-9; t += 0.05) for (const c of snd.step(t, true, sp || 1)) seen.push(c.t + ':' + c.name); };
      run(0, 90); snd.seek(30); run(30, 40); snd.seek(12); run(12, 20);
      const shots = dir.shots.map(s => ({ id: s.id, calls: snd.log.filter(e => e.t >= s.t0 && e.t < s.t1 && ['playEvent', 'lighthouse', 'cue', 'drip', 'click', 'clunk'].includes(e.fn)).length }));
      const events = [...new Set(snd.log.filter(e => e.fn === 'playEvent').map(e => JSON.stringify(e.args)))].map(s => JSON.parse(s));
      const known = LI_AUDIO.events(); const unknown = events.filter(a => !known.includes(a[0])).map(a => a[0]);
      return { shots, events, unknown, nSeen: seen.length, st: LI_AUDIO.stats(), song: LI_SONG.stats() };
    });
    ok(res.shots.every(s => s.calls >= 1), 'real LI_AUDIO and LI_SONG: every shot made at least one sound call (' + res.shots.map(s => s.id + ' ' + s.calls).join(', ') + ')');
    ok(res.unknown.length === 0 && res.events.length >= 12, 'every LI_AUDIO event the film asks for exists (' + res.events.length + ' distinct calls, unknown: ' + (res.unknown.join(',') || 'none') + ')');
    ok(res.st.voices <= res.st.cap && res.song.voices <= res.song.maxNotes, 'voice caps hold after the run (audio ' + res.st.voices + ' of ' + res.st.cap + ', song ' + res.song.voices + ' of ' + res.song.maxNotes + ')');
    /* offline: every event with its film arguments renders finite and not silent */
    const off = await page.evaluate(async (events) => {
      const out = [];
      for (const a of events) { const d = await LI_AUDIO.renderOffline(a[0], a[1] || {}, 6, 22050); let sq = 0, nan = 0, pk = 0; for (let i = 0; i < d.length; i++) { const x = d[i]; if (x !== x || !isFinite(x)) nan++; else { sq += x * x; if (Math.abs(x) > pk) pk = Math.abs(x); } } out.push({ name: a[0] + ' ' + JSON.stringify(a[1] || {}), rms: Math.sqrt(sq / d.length), pk, nan }); }
      const V = LI_OPENING_SOUND.VOICES;
      for (const k of Object.keys(V)) { const c = new OfflineAudioContext(1, 22050 * 2, 22050), g = c.createGain(); g.connect(c.destination); V[k](c, g, 0.05); const d = (await c.startRendering()).getChannelData(0); let sq = 0, nan = 0, pk = 0; for (let i = 0; i < d.length; i++) { const x = d[i]; if (x !== x || !isFinite(x)) nan++; else { sq += x * x; if (Math.abs(x) > pk) pk = Math.abs(x); } } out.push({ name: 'synth ' + k, rms: Math.sqrt(sq / d.length), pk, nan }); }
      return out;
    }, res.events);
    const silent = off.filter(r => !(r.rms > 1e-5) || r.nan > 0 || r.pk > 1.5);
    ok(off.length >= 15 && silent.length === 0, 'offline render: ' + off.length + ' film sounds are finite and not silent, peak under 1.5 (bad: ' + (silent.map(r => r.name + ' rms ' + r.rms.toExponential(1)).join('; ') || 'none') + ')');
    /* the film itself plays with the sound on: scrub through the page's own controls */
    await page.evaluate(() => { const o = window.__opening; o.dir.seek(44); o.sound.seek(44); });
    await page.waitForTimeout(300);
    ok(errs.length === 0, 'opening_proto.html: zero console errors with Sound on and scrubbing' + (errs.length ? ' ' + errs.slice(0, 3).join(' | ') : ''));
    await browser.close();
  }
}
console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
