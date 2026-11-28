/* GIFT SOUND, core test (pure node, no browser, no audio). Run: node games/living-islands/tests/gift-sound-test.js
   A fake LI_AUDIO and a fake LI_SONG record every call. A scripted day is stepped through gift_sound.js's core (the same code the page runs) and the calls are checked:
   nothing fires before the audio is running, every event fires at its moment, the throttles hold, voice caps are respected, nothing is built per call, mute and a hidden tab are silent.
   The default page loading no audio is checked in tests/gift-sound-page-test.js. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
require('../gift_sound.js'); const G = globalThis.LI_GSOUND;
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

function fakes(cap) {
  const calls = [], scalls = []; let run = false, now = 0, played = 0;
  const A = { isRunning: () => run, setSeaEnergy: v => calls.push({ t: now, fn: 'sea', v }), setWind: v => calls.push({ t: now, fn: 'wind', v }), setRain: v => calls.push({ t: now, fn: 'rain', v }), setNight: v => calls.push({ t: now, fn: 'night', v }),
    robotWork: (id, kind, state, bat, wear) => calls.push({ t: now, fn: 'robotWork', id, kind, state, bat }), robotStop: id => calls.push({ t: now, fn: 'robotStop', id }),
    playEvent: (name, o) => { calls.push({ t: now, fn: 'play', name, o, copy: Object.assign({}, o) }); if (cap !== undefined && played >= cap) return false; played++; return true; } };
  const S = new Proxy({}, { get: (_, fn) => (...a) => { scalls.push({ t: now, fn, a }); return true; } });
  return { A, S, calls, scalls, setRun: v => { run = v; }, setNow: t => { now = t; }, plays: name => calls.filter(c => c.fn === 'play' && (!name || c.name === name)), sc: fn => scalls.filter(c => c.fn === fn) };
}
const base = () => ({ t: 0, running: undefined, hidden: false, muted: false, day: 1, seed: 9001, tide: 0.5, sea: 0.12, windMs: 3, rain: 0, night: 0, storm: 0, stormPhase: 'none', stormPre: 0, stock: 0, bStage: -1, bId: '', holding: false, plank: 0, key: 0, dlv: '', boat: 'docked', boatSpeed: 0, robots: [] });
function run(F, core, snap, from, to, dt, each) { for (let t = from; t < to - 1e-9; t += dt) { snap.t = t; F.setNow(t); if (each) each(snap, t); core.step(snap, dt); } return to; }
const perWindow = (list, sec) => { let worst = 0; for (const c of list) worst = Math.max(worst, list.filter(d => d.t >= c.t && d.t < c.t + sec).length); return worst; };

/* 1. nothing before the audio runs */
{ const F = fakes(), core = G.create({ A: F.A, S: F.S, seed: 9001 }), s = base();
  run(F, core, s, 0, 20, 0.2, (q, t) => { q.stock = Math.floor(t); q.key = t > 5 ? 1 : 0; q.bStage = t > 8 ? 2 : 0; q.bId = 'cottage'; q.holding = t > 3 && t < 6; q.night = 1; q.storm = 1; q.stormPhase = 'run'; q.dlv = t > 10 ? 'ship' : ''; q.robots = [{ kind: 'hauler', work: true, moving: true, battery: .8, state: 'work', ground: 'sand' }]; });
  core.uiTap(5);
  ok(F.calls.length === 0 && F.scalls.length === 0, 'before the first tap: not one call on the audio or the song (' + F.calls.length + ' + ' + F.scalls.length + ')'); }

/* 2. the default page: gift_sound.js is not loaded there, so the module exposes no attach in node and the page test proves no script; here the pure create() with no song is safe */
{ const F = fakes(), core = G.create({ A: F.A, S: null }), s = base(); F.setRun(true); let threw = null; try { run(F, core, s, 0, 5, 0.25); core.uiTap(5.1); } catch (e) { threw = e; }
  ok(!threw, 'no song module present: the core still runs and does not throw'); }

/* 3. beds, unlock, the song fed */
{ const F = fakes(), core = G.create({ A: F.A, S: F.S, seed: 9001 }), s = base(); let t = run(F, core, s, 0, 2, 0.2); F.setRun(true);
  s.sea = 0.12; t = run(F, core, s, t, t + 2, 0.2);
  const lastSea = F.calls.filter(c => c.fn === 'sea').pop();
  ok(!!lastSea && lastSea.v < 0.2, 'calm day in the arrival bay: the sea bed is gentle (' + (lastSea && lastSea.v.toFixed(3)) + ')');
  ok(F.sc('start').length >= 1 && F.sc('setIsland').length === 1 && F.sc('setIsland')[0].a[0] === 9001, 'on unlock the song starts and setIsland gets the island seed once');
  ok(F.sc('setWeekBeat').length === 1 && F.sc('setWeekBeat')[0].a[0] === 'tender', 'day 1 is tender\'s day for the week beat');
  /* gale offshore, storm quiet 0 vs 1 */
  s.sea = 0.7; s.windMs = 14; s.rain = 0.55; s.storm = 0; t = run(F, core, s, t, t + 1, 0.2); const bay = F.calls.filter(c => c.fn === 'sea').pop().v, wind1 = F.calls.filter(c => c.fn === 'wind').pop().v, rain1 = F.calls.filter(c => c.fn === 'rain').pop().v;
  s.storm = 1; s.stormPhase = 'run'; s.stormPre = 1; t = run(F, core, s, t, t + 1, 0.2); const open = F.calls.filter(c => c.fn === 'sea').pop().v;
  ok(bay < 0.5 && open > bay && Math.abs(open - 0.7) < 0.01, 'a gale at sea stays gentle in the bay (' + bay.toFixed(2) + ') and opens to the full sea in the storm (' + open.toFixed(2) + ')');
  ok(wind1 > 0.5 && rain1 > 0.5 && F.calls.filter(c => c.fn === 'wind').pop().v >= wind1, 'wind and rain follow the weather (' + wind1.toFixed(2) + ', ' + rain1.toFixed(2) + ')');
  ok(F.sc('setStorm').length > 0 && F.sc('setStorm').pop().a[0] === 1, 'the storm level is fed to the song');
  /* the pure mappers */
  ok(G.seaRaw('calm', 0) < G.seaRaw('squall', 1) && G.seaRaw('squall', 1) < G.seaRaw('gale', 1) && G.seaRaw('gale', 1) < G.seaRaw('wash', 1) && G.seaRaw('nonsense', 1) === 0.12, 'the sea energy rises calm, squall, gale, wash; an unknown name is calm');
  const L = { tender: 't', lowtide: 'o', lighthouse: 'h' }, wb = []; for (let d = 1; d <= 30; d++) wb.push(L[G.weekBeat(d)]); ok(wb.slice(0, 7).join('') === 'tttoohh' && wb.join('').split('t').length - 1 === 14, 'week beats over the 30 day month: three tender days, two low-tide days, two lighthouse days in each seven (' + wb.slice(0, 7).join('') + ')'); }

/* 4. robots */
{ const F = fakes(), core = G.create({ A: F.A, S: F.S, seed: 1 }), s = base(); F.setRun(true); let t = run(F, core, s, 0, 1, 0.2);
  const R = (k, w, b, st) => ({ kind: k, work: w, moving: false, battery: b, state: st || 'work', ground: '' });
  s.robots = [R('hauler', true, 0.9), R('sorter', true, 0.8), R('stacker', false, 0.9)]; t = run(F, core, s, t, t + 1, 0.2);
  const w = F.calls.filter(c => c.fn === 'robotWork');
  ok(w.length === 2 && w[0].kind === 'hauler' && w[1].kind === 'sorter', 'two working robots: robotWork for the hauler and the sorter, none for the idle stacker');
  ok(F.sc('robotBeat').length === 2 && F.sc('robotBeat')[0].a[1] === 'hauler', 'the song gets a robotBeat for each working robot');
  s.robots[0].battery = 0.6; t = run(F, core, s, t, t + 1, 0.2); ok(F.calls.filter(c => c.fn === 'robotWork').length === 3, 'a battery step of 0.05 or more re-tells the audio (so clicks space out)');
  s.robots[0].battery = 0.595; t = run(F, core, s, t, t + 1, 0.2); ok(F.calls.filter(c => c.fn === 'robotWork').length === 3, 'a tiny battery change makes no call');
  s.robots[1].state = 'wet'; t = run(F, core, s, t, t + 1, 0.2); ok(F.calls.filter(c => c.fn === 'robotWork').pop().state === 'wet', 'wet state is passed on');
  s.robots[1].work = false; t = run(F, core, s, t, t + 1, 0.2); ok(F.calls.some(c => c.fn === 'robotStop' && c.id === 1), 'a robot that stops working is stopped');
  s.robots = []; for (let i = 0; i < 9; i++) s.robots.push(R('hauler', true, 0.8)); t = run(F, core, s, t, t + 2, 0.2);
  const ids = new Set(F.calls.filter(c => c.fn === 'robotWork').filter(c => c.t > 4).map(c => c.id)); ok(ids.size <= 4, 'nine working robots: at most 4 make a sound (' + ids.size + ')');
  /* scrape by ground */
  s.robots = [{ kind: 'hauler', work: true, moving: true, battery: 0.8, state: 'work', ground: 'plank' }]; t = run(F, core, s, t, t + 6, 0.2);
  const sc = F.plays('scrape'); ok(sc.length > 0 && sc.every(c => c.copy.ground === 'plank') && perWindow(sc, 1) <= 2, 'a moving robot scrapes by ground type (plank), at most 2 a second (' + sc.length + ' in 6 s)'); }

/* 5. one-shots, one per moment */
{ const F = fakes(), core = G.create({ A: F.A, S: F.S, seed: 1 }), s = base(); F.setRun(true); let t = run(F, core, s, 0, 1, 0.2);
  s.stock = 2; t = run(F, core, s, t, t + 0.4, 0.2); ok(F.plays('crateThud').length === 1, 'stock added: one crate thud');
  const before = F.plays('crateThud').length; t = run(F, core, s, t, t + 3, 0.2, (q, tt) => { q.stock += 1; }); const th = F.plays('crateThud');
  ok(th.length - before >= 1 && perWindow(th, 1) <= 3, 'stock added every step for 3 s: crate thuds throttled to 3 a second (peak ' + perWindow(th, 1) + ')');
  s.stock -= 5; t = run(F, core, s, t, t + 0.4, 0.2); ok(F.plays('crateThud').length === th.length, 'stock taken away makes no thud');
  s.bId = 'cottage'; s.bStage = 0; t = run(F, core, s, t, t + 1, 0.2); const pf0 = F.plays('plankFit').length;
  s.bStage = 1; t = run(F, core, s, t, t + 1, 0.2); ok(F.plays('plankFit').length === pf0 + 1 && F.plays('winch').length === 0, 'a build stage completes: a plank fits, no winch for a stage without lifting');
  s.bStage = 3; t = run(F, core, s, t, t + 0.3, 0.1); const wBefore = F.plays('winch').length; t = run(F, core, s, t, t + 1.5, 0.1);
  ok(F.plays('plankFit').length === pf0 + 2 && F.plays('winch').length === wBefore + 1 && F.sc('cue').some(c => c.a[0] === 'winch'), 'the frame stage (lifting): plank fit, then the winch two-note a moment later, and the song\'s winch cue');
  t = run(F, core, s, t, t + 3, 0.1); s.bId = ''; s.bStage = -1; t = run(F, core, s, t, t + 1.5, 0.1); ok(F.plays('plankFit').length === pf0 + 3 && F.plays('winch').length === wBefore + 2, 'the build finishes (it leaves the site): plank fit and winch');
  s.key = 1; t = run(F, core, s, t, t + 1, 0.2); ok(F.plays('key').length === 1 && F.sc('cue').some(c => c.a[0] === 'key'), 'the brass key is taken: the key sound and the song\'s key cue');
  t = run(F, core, s, t, t + 2.5, 0.2); s.key = 2; t = run(F, core, s, t, t + 1, 0.2); ok(F.plays('key').length === 2, 'the key turns in the hut door: the key sound again (a throttle of one every 2 s holds)');
  s.plank = 1; t = run(F, core, s, t, t + 1, 0.2); ok(F.plays('plankFit').length === pf0 + 4, 'a jetty plank fitted: plank fit');
  s.dlv = 'ship'; t = run(F, core, s, t, t + 1, 0.2); ok(F.plays('horn').length === 1 && F.sc('cue').some(c => c.a[0] === 'delivery'), 'the delivery ship comes in: the horn');
  s.dlv = 'drop'; t = run(F, core, s, t, t + 1, 0.2); ok(F.plays('boatCreak').length === 1, 'the tender lies alongside: the boat creaks');
  s.dlv = ''; t = run(F, core, s, t, t + 3, 0.2); s.boat = 'drive'; t = run(F, core, s, t, t + 1, 0.2); ok(F.plays('boatCreak').length === 2, 'you board the rowing boat: a creak'); s.boatSpeed = 1.2; t = run(F, core, s, t, t + 7, 0.2); const wk = F.plays('wake'); ok(wk.length >= 2 && perWindow(wk, 3) <= 1, 'rowing leaves a wake, at most one in 3 s (' + wk.length + ')');
  s.holding = true; const h0 = F.plays('holdLoop').length; t = run(F, core, s, t, t + 5, 0.1); const hl = F.plays('holdLoop'); ok(hl.length - h0 >= 4 && perWindow(hl, 1) <= 2, 'holding for 5 s: the hold loop plays in segments, at most 2 a second (' + (hl.length - h0) + ')');
  s.holding = false; const h1 = F.plays('holdLoop').length; t = run(F, core, s, t, t + 3, 0.1); ok(F.plays('holdLoop').length === h1, 'let go: the hold loop stops');
  let taps = 0; for (let i = 0; i < 50; i++) { F.setNow(t + i * 0.02); if (core.uiTap(t + i * 0.02)) taps++; } ok(F.plays('uiTick').length >= 1 && perWindow(F.plays('uiTick'), 1) <= 8, 'fifty taps in one second: ui ticks throttled to 8 (' + F.plays('uiTick').length + ')');
  const opts = F.plays().map(c => c.o); ok(new Set(opts).size === 1, 'no per-call allocation: one reused options object for every event (' + new Set(opts).size + ')'); }

/* 6. storm: the rock hum rises, then roar and thunder */
{ const F = fakes(), core = G.create({ A: F.A, S: F.S, seed: 1 }), s = base(); F.setRun(true); let t = run(F, core, s, 0, 1, 0.2);
  s.stormPhase = 'run'; t = run(F, core, s, t, t + 40, 0.2, (q, tt) => { const k = (tt - 1) / 40; q.stormPre = k; q.storm = Math.max(0, Math.min(1, (k - 0.25) / 0.45)); });
  const hum = F.plays('rockHum'); ok(hum.length >= 4 && hum[hum.length - 1].copy.pitch > hum[0].copy.pitch && hum[0].copy.pitch < 0.3, 'before the storm: the rock hum comes and its pitch rises (' + hum.map(c => c.copy.pitch.toFixed(2)).join(' ') + ')');
  ok(F.plays('stormRoar').length >= 1 && F.plays('stormRoar')[0].t > hum[0].t, 'the roar starts after the hum, when the storm arrives');
  t = run(F, core, s, t, t + 120, 0.2, (q) => { q.stormPre = 1; q.storm = 1; }); const th = F.plays('thunder');
  ok(th.length >= 3 && th.length <= 9 && th.every((c, i) => i === 0 || c.t - th[i - 1].t >= 13.5), 'in the storm: thunder every 14 to 34 s, never faster (' + th.length + ' in 120 s)');
  ok(F.sc('cue').filter(c => c.a[0] === 'thunder').length === th.length, 'the song gets a thunder cue with each clap');
  ok(perWindow(F.plays('stormRoar'), 5) <= 1 && F.plays('stormRoar').every(c => c.copy.level > 0.1), 'roar is throttled and carries the storm level');
  t = run(F, core, s, t, t + 40, 0.2, (q) => { q.storm = 0; q.stormPhase = 'haul'; }); const lastTh = F.plays('thunder').length; t = run(F, core, s, t, t + 40, 0.2); ok(F.plays('thunder').length === lastTh, 'the storm has passed: no more thunder'); }

/* 7. night: the lighthouse note at each sweep */
{ const F = fakes(), core = G.create({ A: F.A, S: F.S, seed: 1 }), s = base(); F.setRun(true); let t = run(F, core, s, 0, 30, 0.25); ok(F.sc('lighthouse').length === 0, 'by day the lamp makes no note');
  s.night = 1; t = run(F, core, s, t, t + 61, 0.25); const lh = F.sc('lighthouse'); ok(lh.length >= 4 && lh.length <= 6 && lh.every((c, i) => i === 0 || c.t - lh[i - 1].t >= 11.9), 'at night one lighthouse note about every 12 s (' + lh.length + ' in 61 s)');
  ok(F.calls.filter(c => c.fn === 'night').pop().v === 1 && F.sc('setNight').pop().a[0] === true, 'night is fed to the beams hum and to the song'); }

/* 8. mute, hidden tab, caps, errors */
{ const F = fakes(3), core = G.create({ A: F.A, S: F.S, seed: 1 }), s = base(); F.setRun(true); let t = run(F, core, s, 0, 1, 0.2);
  s.muted = true; t = run(F, core, s, t, t + 2, 0.5); ok(F.sc('stop').length === 1, 'mute: the song is stopped once'); s.muted = false; t = run(F, core, s, t, t + 2, 0.5); ok(F.sc('start').length === 2, 'unmute: the song starts again');
  const n0 = F.calls.length + F.scalls.length; s.hidden = true; s.stock += 3; s.key = 1; t = run(F, core, s, t, t + 5, 0.2); ok(F.calls.length + F.scalls.length === n0, 'tab hidden: not one call');
  s.hidden = false; for (let i = 0; i < 10; i++) { s.stock += 1; t = run(F, core, s, t, t + 0.5, 0.5); } ok(F.plays('crateThud').length >= 4, 'voice cap reached: events are asked, refused, and nothing throws (' + F.plays('crateThud').length + ' asked)'); }
{ const F = fakes(), core = G.create({ A: Object.assign(F.A, { playEvent: () => { throw new Error('boom'); }, robotWork: () => { throw new Error('boom'); } }), S: F.S, seed: 1 }), s = base(); F.setRun(true); let threw = null;
  try { run(F, core, s, 0, 3, 0.2, (q) => { q.stock++; q.robots = [{ kind: 'hauler', work: true, moving: true, battery: .5, state: 'work', ground: 'sand' }]; }); } catch (e) { threw = e; } ok(!threw, 'audio calls that throw never reach the game'); }

console.log((fails ? 'FAIL' : 'PASS') + ' ' + (n - fails) + ' of ' + n);
process.exit(fails ? 1 : 0);
