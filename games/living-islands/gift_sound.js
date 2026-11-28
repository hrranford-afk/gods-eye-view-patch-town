/* THE GIFT, sound (GIFT_SOUND.md). Loaded only on game=gift pages (or &sound=1), never on the default page.
   One classic script, two halves:
   PART A  the pure core: create({ A, S }) takes the audio module (window.LI_AUDIO) and the song module (window.LI_SONG), and step(snap, dt) turns the game's state into calls on them:
           beds (sea, wind, rain, night), robot work, one-shot events with throttles, the storm (rock hum, roar, thunder), the lighthouse sweep, the island song. It never touches the DOM,
           and it does nothing at all until the audio context is running (the first tap). Tested in tests/gift-sound-test.js with a fake audio module that records every call.
   PART B  the page layer: the 'Sound on' chip, the Sound panel for the Menu (master, effects, music, mute), remembered settings, a 5 Hz poll of the game through the probe that gift_day.js hands over.
   Not heard by the author: every number is a first guess for the owner's ears. */
(function (root) {
'use strict';
var clamp = function (v, a, b) { v = +v; return v !== v ? a : v < a ? a : v > b ? b : v; };
var smooth = function (a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };

/* at most n per per seconds, for each kind of one-shot. TUNING. */
var LIMITS = { uiTick: [8, 1], crateThud: [3, 1], plankFit: [3, 1], winch: [1, 2], key: [1, 2], horn: [1, 6], boatCreak: [1, 3], wake: [1, 3], scrape: [2, 1], holdLoop: [2, 1], thunder: [1, 8], stormRoar: [1, 5], rockHum: [1, 3], gull: [1, 8] };
var ROBOT_MAX = 4;                       /* robots that make a sound at once (audio.js caps its robot voices at 6) */
var SWEEP_S = 12;                        /* the lighthouse lamp, one note every 12 seconds of night */
var STORE_NAMES = ['crateThud', 'plankFit', 'winch', 'key', 'horn', 'boatCreak', 'wake', 'scrape', 'holdLoop', 'thunder', 'stormRoar', 'rockHum', 'uiTick'];

/* the sea bed from the wave sea's weather name and how far it has risen (0 calm .. 1 full). Gentle: a calm day is a soft breath. */
var SEA_BASE = { calm: 0.12, fog: 0.12, swell: 0.45, squall: 0.5, after: 0.4, gale: 0.7, thunder: 0.8, winter: 0.75, wash: 1 };
function seaRaw(name, s) { var b = SEA_BASE[name]; if (b === undefined) b = 0.12; return clamp(0.12 + (b - 0.12) * clamp(s, 0, 1), 0, 1); }
/* in the arrival bay the bed stays gentle; a storm (q 0..1) opens it to the full sea */
function seaBay(raw, q) { var gentle = 0.1 + 0.35 * raw; return gentle + (raw - gentle) * clamp(q, 0, 1); }
/* the game calendar has no weekday names, so the 30-day month is cut into weeks of seven days and each week into three beats:
   days 1-3 of a week are tender's day (the opening phrase), days 4-5 low-tide days (quiet), days 6-7 lighthouse days (the variation). */
function weekBeat(day) { var w = ((Math.max(1, Math.floor(+day || 1)) - 1) % 7); return w < 3 ? 'tender' : w < 5 ? 'lowtide' : 'lighthouse'; }
function mulberry(a) { return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function create(deps) {
  var A = deps.A, S = deps.S, rnd = mulberry((deps.seed | 0) || 7);
  var C = { t: -1, lastBed: -9, lastSong: -9, running: false, songOn: false, island: null, week: '', fired: {}, refused: {}, robotCalls: 0, steps: 0, ticks: 0 };
  var hist = {}, p, k;    /* per kind ring of the last n times */
  for (k in LIMITS) { hist[k] = new Float64Array(LIMITS[k][0]); for (p = 0; p < hist[k].length; p++) hist[k][p] = -1e9; C.fired[k] = 0; C.refused[k] = 0; }
  STORE_NAMES.forEach(function (n) { if (C.fired[n] === undefined) C.fired[n] = 0; });
  var o1 = { ground: '', pitch: 0, level: 0, duration: 0 };      /* option objects reused, never rebuilt */
  var prev = { stock: -1, bStage: -2, bId: '', plank: -1, key: -1, dlv: '', boat: '', hold: false, keyInit: false };
  var rb = { id: [], kind: [], st: [], bat: [], on: [], t: [], sound: [] };
  for (p = 0; p < 16; p++) { rb.kind.push(''); rb.st.push(''); rb.bat.push(-1); rb.on.push(false); rb.t.push(-9); }
  var next = { sweep: 0, hold: 0, hum: 0, roar: 0, thunder: 0, wake: 0, scrape: 0, boat: 0 };
  var pend = { at: [0, 0, 0, 0, 0, 0], name: ['', '', '', '', '', ''], n: 0 };
  var curSea = 0.12;

  function allow(name, t) {
    var h = hist[name], lim = LIMITS[name]; if (!h) return true; var i, oldest = 0;
    for (i = 1; i < h.length; i++) if (h[i] < h[oldest]) oldest = i;
    if (t - h[oldest] < lim[1]) { C.refused[name]++; return false; } h[oldest] = t; return true;
  }
  function fire(name, opts, t) {
    if (!allow(name, t)) return false;
    var ok = false; try { ok = !!A.playEvent(name, opts); } catch (e) { ok = false; }
    C.fired[name] = (C.fired[name] || 0) + (ok ? 1 : 0); if (!ok) C.refused[name]++; return ok;
  }
  function later(name, t, at) { if (pend.n >= pend.at.length) return; pend.at[pend.n] = at; pend.name[pend.n] = name; pend.n++; }
  function song(fn, a, b) { if (S && S[fn]) { try { return S[fn](a, b); } catch (e) { return false; } } return false; }
  function cue(n) { song('cue', n); }

  /* ---- unlock: the first running step sets the beds at once and starts the song ---- */
  function onRunning(snap) {
    C.running = true; prev.stock = snap.stock; prev.bStage = snap.bStage; prev.bId = snap.bId; prev.plank = snap.plank; prev.key = snap.key; prev.dlv = snap.dlv || ''; prev.boat = snap.boat || ''; prev.hold = !!snap.holding;
    C.lastBed = -9; C.lastSong = -9; next.sweep = snap.t + 4; next.thunder = 0; next.hum = snap.t; next.roar = snap.t; next.hold = snap.t;
    var q = snap.storm || 0; curSea = seaBay(snap.sea, q);
  }
  function beds(snap, t) {
    var q = clamp(snap.storm || 0, 0, 1), e = seaBay(snap.sea, q);
    var wind = clamp(Math.max(clamp(((snap.windMs || 0) - 3.5) / 16, 0, 1), q * 0.9), 0, 1), rain = clamp(Math.max(snap.rain || 0, q * 0.7), 0, 1);
    curSea = e; A.setSeaEnergy(e); A.setWind(wind); A.setRain(rain); A.setNight(clamp(snap.night, 0, 1));
  }
  function songFeed(snap, t) {
    if (!S) return; var q = clamp(snap.storm || 0, 0, 1), i, r;
    if (snap.muted) { if (C.songOn) { song('stop'); C.songOn = false; } return; }
    if (!C.songOn) { song('start'); C.songOn = true; if (C.island !== null) { /* island already set */ } }
    if (snap.seed !== undefined && snap.seed !== C.island) { C.island = snap.seed; song('setIsland', snap.seed); }
    song('setTide', clamp(snap.tide, 0, 1)); song('setStorm', q); song('setNight', snap.night > 0.5);
    var wk = weekBeat(snap.day); if (wk !== C.week) { C.week = wk; song('setWeekBeat', wk); }
  }

  function robots(snap, t) {
    var n = snap.robots ? snap.robots.length : 0, i, r, up = 0, on, kind, st, bat;
    for (i = 0; i < 16; i++) {
      r = i < n ? snap.robots[i] : null; on = !!(r && r.work) && up < ROBOT_MAX;
      if (!on) { if (rb.on[i]) { rb.on[i] = false; try { A.robotStop(i); } catch (e) { } song('robotStop', i); } continue; }
      up++; kind = r.kind; st = r.state; bat = clamp(r.battery, 0, 1);
      if (!rb.on[i] || rb.kind[i] !== kind || rb.st[i] !== st || Math.abs(rb.bat[i] - bat) >= 0.05) {
        if (!rb.on[i] || t - rb.t[i] >= 0.5) {
          rb.on[i] = true; rb.kind[i] = kind; rb.st[i] = st; rb.bat[i] = bat; rb.t[i] = t; C.robotCalls++;
          try { A.robotWork(i, kind, st, bat, 0); } catch (e) { } song('robotBeat', i, kind, bat);
        }
      }
    }
  }
  function scrapes(snap, t) {
    if (t < next.scrape) return; var n = snap.robots ? snap.robots.length : 0, i, r;
    for (i = 0; i < n && i < 16; i++) { r = snap.robots[i]; if (r.work && r.moving && rb.on[i]) { o1.ground = r.ground || 'pebble'; next.scrape = t + 0.8 + rnd() * 0.5; fire('scrape', o1, t); return; } }
  }
  function storm(snap, t) {
    var q = clamp(snap.storm || 0, 0, 1), ph = snap.stormPhase, pre = clamp(snap.stormPre || 0, 0, 1);
    if (ph === 'run' && q < 0.9 && pre > 0.02 && pre < 1 && t >= next.hum) { o1.pitch = pre; o1.duration = 3.5; next.hum = t + 3.2; fire('rockHum', o1, t); }
    if (q > 0.12 && t >= next.roar) { o1.level = q; o1.duration = 8; next.roar = t + 6.5; fire('stormRoar', o1, t); }
    if (q > 0.5) { if (next.thunder === 0) next.thunder = t + 2; if (t >= next.thunder) { o1.level = q; next.thunder = t + 14 + rnd() * 20; if (fire('thunder', o1, t)) cue('thunder'); } } else next.thunder = 0;
  }

  function step(snap, dt) {
    var t = snap.t; C.steps++;
    var run = snap.running !== undefined ? !!snap.running : !!A.isRunning();
    if (!run || snap.hidden) { if (!run) C.running = false; C.t = t; return false; }
    if (!C.running) onRunning(snap);
    C.ticks++;
    if (t - C.lastBed >= 0.25) { C.lastBed = t; beds(snap, t); }
    if (t - C.lastSong >= 0.5) { C.lastSong = t; songFeed(snap, t); }
    robots(snap, t); scrapes(snap, t);
    /* stock added: a crate thud (one per step however many units came) */
    if (snap.stock > prev.stock && prev.stock >= 0) fire('crateThud', o1, t); prev.stock = snap.stock;
    /* a build stage completes: the plank fits; frame and finish are lifted, so the winch answers a moment after */
    var stageUp = prev.bStage >= 0 && ((snap.bId === prev.bId && snap.bStage > prev.bStage) || snap.bId !== prev.bId);
    if (stageUp) { var lift = snap.bId !== prev.bId || snap.bStage === 3 || snap.bStage >= 5; if (fire('plankFit', o1, t) && lift) later('winch', t, t + 0.55); }
    prev.bStage = snap.bStage; prev.bId = snap.bId;
    if (snap.plank > prev.plank && prev.plank >= 0) fire('plankFit', o1, t); prev.plank = snap.plank;
    /* the brass key: taken from the lid, then turned in the hut door */
    if (snap.key > prev.key && prev.key >= 0) { if (fire('key', o1, t)) cue('key'); } prev.key = snap.key;
    /* the hold loop: a soft rising scrape, one segment a second, while a finger holds */
    if (snap.holding) { if (t >= next.hold) { o1.duration = 1.1; next.hold = t + 0.95; fire('holdLoop', o1, t); } } else next.hold = 0; prev.hold = !!snap.holding;
    /* the delivery: the ship's horn as it comes in, the creak as the tender lies alongside; the rowing boat creaks as you board and leaves a small wake */
    var d = snap.dlv || '';
    if (d !== prev.dlv) { if (d === 'ship') { if (fire('horn', o1, t)) cue('delivery'); } else if (d === 'drop') fire('boatCreak', o1, t); prev.dlv = d; }
    var b = snap.boat || '';
    if (b !== prev.boat) { if (b === 'drive' && prev.boat) fire('boatCreak', o1, t); prev.boat = b; }
    if (b === 'drive' && snap.boatSpeed > 0.4 && t >= next.wake) { next.wake = t + 3; fire('wake', o1, t); }
    storm(snap, t);
    /* the lamp on the old stump: a long note at each sweep, only while it is night */
    if (snap.night > 0.35) { if (t >= next.sweep) { next.sweep = t + SWEEP_S; song('lighthouse'); C.sweeps = (C.sweeps || 0) + 1; } } else if (next.sweep < t + 4) next.sweep = t + 4;
    /* things that wait a moment (the winch after the plank) */
    for (var i = 0; i < pend.n;) { if (t >= pend.at[i]) { var nm = pend.name[i]; pend.n--; pend.at[i] = pend.at[pend.n]; pend.name[i] = pend.name[pend.n]; if (fire(nm, o1, t) && nm === 'winch') cue('winch'); } else i++; }
    C.t = t; return true;
  }
  function uiTap(t) { if (!C.running) return false; return fire('uiTick', o1, t); }
  function stats() { return { fired: C.fired, refused: C.refused, robotCalls: C.robotCalls, steps: C.steps, ticks: C.ticks, running: C.running, sea: curSea, sweeps: C.sweeps || 0, songOn: C.songOn, week: C.week }; }
  return { step: step, uiTap: uiTap, stats: stats, limits: LIMITS };
}

root.LI_GSOUND = root.LI_GSOUND || {};
root.LI_GSOUND.create = create; root.LI_GSOUND.seaRaw = seaRaw; root.LI_GSOUND.seaBay = seaBay; root.LI_GSOUND.weekBeat = weekBeat; root.LI_GSOUND.LIMITS = LIMITS;

/* ====================================================================== PART B: the page layer ====================================================================== */
if (typeof window === 'undefined' || typeof document === 'undefined') return;
var A = root.LI_AUDIO, SG = root.LI_SONG, Q = new URLSearchParams(location.search);
if (!A || Q.get('sound') === '0') return;
var KEY = 'li.gift.sound', ST = { master: 0.7, fx: 1, music: 0.35, mute: false, on: false };
function lsGet() { try { var j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j && typeof j === 'object') { ['master', 'fx', 'music'].forEach(function (k) { if (typeof j[k] === 'number') ST[k] = clamp(j[k], 0, 1); }); ST.mute = !!j.mute; ST.on = !!j.on; } } catch (e) { /* no storage */ } }
function lsSet() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) { /* no storage */ } }
lsGet();
var has = !!(root.AudioContext || root.webkitAudioContext), core = null, chip = null, panelEl = null, probe = null, snap = { robots: [] }, lastT = 0, timer = 0, gestured = false;
function apply() { try { A.setMasterVolume(ST.master); A.setEffectsVolume(ST.fx); A.setMusicVolume(ST.music); A.mute(ST.mute); } catch (e) { /* none */ } }
function running() { try { return !!A.isRunning(); } catch (e) { return false; } }
function syncUi() {
  if (chip) chip.style.display = (has && !running()) ? 'flex' : 'none';
  if (panelEl) { var m = panelEl.querySelector('.gs-mute'); if (m) { m.textContent = ST.mute ? 'Sound is off' : 'Sound is on'; m.setAttribute('aria-pressed', ST.mute ? 'true' : 'false'); } var s = panelEl.querySelector('.gs-state'); if (s) s.textContent = !has ? 'No sound on this device.' : running() ? '' : 'Tap anywhere to start.'; }
}
function unlock() { if (!has) return; gestured = true; try { A.unlock(); } catch (e) { /* none */ } apply(); if (!ST.on) { ST.on = true; lsSet(); } setTimeout(syncUi, 200); setTimeout(syncUi, 800); }
function css() {
  if (document.getElementById('gs-css')) return; var s = document.createElement('style'); s.id = 'gs-css';
  s.textContent = '#gs-chip{position:relative;z-index:8;pointer-events:auto;display:none;align-items:center;gap:8px;min-height:48px;padding:6px 14px;border-radius:24px;border:2px solid #cdbb98;background:rgba(251,246,236,.93);color:#2b2118;font:700 15px/1 Georgia,"Iowan Old Style",serif;cursor:pointer;touch-action:manipulation;opacity:.92}'
    + '#gs-chip.gs-fixed{position:fixed;right:10px;top:10px}body.gd-menuopen #gs-chip{display:none!important}body.dev-touch #gs-chip{min-height:52px}#gs-chip svg{flex:none}'
    + '#gs-panel{display:flex;flex-direction:column;gap:6px;padding:8px 4px 4px;border-top:1px solid #e3d6b8;font-size:14px}#gs-panel b{font-size:14px}#gs-panel label{display:flex;flex-direction:column;gap:0;font-size:13px}'
    + '#gs-panel input[type=range]{width:100%;min-height:36px;margin:0;touch-action:pan-y}#gs-panel .gs-state{opacity:.7;font-size:12px}';
  document.head.appendChild(s);
}
function makeChip() {
  if (chip || !has) return; css(); chip = document.createElement('button'); chip.id = 'gs-chip'; chip.type = 'button'; chip.setAttribute('aria-label', 'Sound on: tap to start the sound');
  chip.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Sound on</span>';
  chip.addEventListener('click', function (e) { e.stopPropagation(); unlock(); }); if (!(root.LI_GIFT && root.LI_GIFT.on)) { chip.classList.add('gs-fixed'); document.body.appendChild(chip); } syncUi();
}
function slider(key, label) {
  var l = document.createElement('label'), i = document.createElement('input'); l.textContent = label; i.type = 'range'; i.min = '0'; i.max = '100'; i.step = '1'; i.value = String(Math.round(ST[key] * 100)); i.setAttribute('aria-label', label + ' volume');
  i.addEventListener('input', function () { ST[key] = clamp(i.value / 100, 0, 1); apply(); }); i.addEventListener('change', lsSet); l.appendChild(i); return l;
}
/* the Sound panel: one persistent node that the Menu re-parents each time it is rebuilt, so a slider is not destroyed under a finger */
function panel() {
  if (panelEl) return panelEl; css(); var d = document.createElement('div'); d.id = 'gs-panel'; d.setAttribute('role', 'group'); d.setAttribute('aria-label', 'Sound');
  var t = document.createElement('b'); t.textContent = 'Sound'; d.appendChild(t);
  var m = document.createElement('button'); m.type = 'button'; m.className = 'gd-btn gs-mute'; m.addEventListener('click', function () { ST.mute = !ST.mute; unlock(); apply(); lsSet(); syncUi(); }); d.appendChild(m);
  d.appendChild(slider('master', 'Master')); d.appendChild(slider('fx', 'Effects')); d.appendChild(slider('music', 'Music'));
  var s = document.createElement('div'); s.className = 'gs-state'; d.appendChild(s); panelEl = d; syncUi(); return d;
}
function poll() {
  if (!core || !probe) return; var t = performance.now() / 1000, dt = t - lastT; lastT = t;
  try { snap.t = t; snap.hidden = !!document.hidden; snap.muted = ST.mute; if (!probe(snap)) return; core.step(snap, dt); } catch (e) { /* the sound must never break the game */ }
  if (chip && chip.style.display !== 'none' && running()) syncUi();
}
function attach(pr, opts) {
  if (!has) return null; probe = pr; makeChip(); apply();
  try { A.init(); } catch (e) { /* none */ }
  core = create({ A: A, S: SG, seed: (opts && opts.seed) || 7 });
  if (!timer) timer = setInterval(poll, 200);
  document.addEventListener('pointerdown', function (e) { if (!gestured) { gestured = true; } if (running() && e.target && e.target.closest && e.target.closest('#gd button, #gd select')) core.uiTap(performance.now() / 1000); }, true);
  document.addEventListener('keydown', function () { gestured = true; apply(); setTimeout(syncUi, 300); }, true);
  ['touchend', 'pointerup', 'click'].forEach(function (n) { document.addEventListener(n, function () { if (!running()) { apply(); setTimeout(syncUi, 300); setTimeout(syncUi, 900); } }, true); });
  return core;
}
root.LI_GSOUND.attach = attach; root.LI_GSOUND.panel = panel; root.LI_GSOUND.chip = function () { return chip; }; root.LI_GSOUND.settings = function () { return Object.assign({}, ST); }; root.LI_GSOUND.core = function () { return core; }; root.LI_GSOUND.syncUi = syncUi; root.LI_GSOUND.snap = function () { return snap; };
})(typeof window !== 'undefined' ? window : globalThis);
