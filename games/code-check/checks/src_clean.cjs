// 18 clean snippets: real game code (or its fixed form) that is correct but tempts a false alarm.
const R = String.raw;
const C = { bug: false };
module.exports = [
{
  key: 'c_landidx', level: 1, source: 'clean', answer: C,
  trap: 'landIdx can return -1, which looks like it could be used as an array index, but both callers test k < 0 first; the bounds test (i >= L.w) is correct for zero-based cells.',
  context: 'A land grid covers a zone in square cells of LC metres. landIdx turns a world point into a cell number, or -1 if the point is off the grid. L.st holds one state per cell.',
  snippet: R`const LC = 0.02; // metres per cell
function landIdx(L, wx, wz) {
  const dx = wx - L.cx, dz = wz - L.cz;
  const i = Math.floor((dx * L.c + dz * L.s) / LC) - L.i0;
  const j = Math.floor((-dx * L.s + dz * L.c) / LC) - L.j0;
  return i < 0 || j < 0 || i >= L.w || j >= L.h ? -1 : j * L.w + i;
}
function landState(z, x, zz) {
  const L = z.land;
  if (!L) return 0;
  const k = landIdx(L, x, zz);
  return k < 0 ? 0 : L.st[k];
}
function landCalm(z, x, zz) {
  const L = z.land;
  if (!L) return 0;
  const k = landIdx(L, x, zz);
  return k < 0 ? 0 : L.calm[k];
}
function mkLand(w, h) {
  return { cx: 0, cz: 0, c: 1, s: 0, i0: 0, j0: 0, w, h, st: new Uint8Array(w * h).fill(1), calm: new Float32Array(w * h) };
}`,
  names: ['landIdx', 'landState', 'landCalm', 'mkLand', 'LC'],
  test: (ns) => { const L = ns.mkLand(10, 8); const z = { land: L }; for (let t = 0; t < 2000; t++) { const x = (Math.random() * 0.4) - 0.1, zz = (Math.random() * 0.3) - 0.1; const k = ns.landIdx(L, x, zz); const i = Math.floor(x / ns.LC), j = Math.floor(zz / ns.LC); const inside = i >= 0 && j >= 0 && i < 10 && j < 8; if (inside ? k !== j * 10 + i : k !== -1) return false; if (ns.landState(z, x, zz) !== (inside ? 1 : 0)) return false; if (typeof ns.landCalm(z, x, zz) !== 'number') return false; } return ns.landState({}, 0, 0) === 0; },
},
{
  key: 'c_rle', level: 2, source: 'clean', answer: C,
  trap: 'rle reads a[0] before the loop, which looks undefined for an empty array, but with no elements the loop does not run and the final push is guarded by a.length. unrle clamps each run with Math.min(r[i + 1], n - k), so a run cannot write past the end.',
  context: 'Run-length coding for a grid of small numbers, used when saving land cells. rle makes a flat list of [value, count, value, count, ...]. unrle(r, n) rebuilds an array of n cells.',
  snippet: R`function rle(a) {
  const o = [];
  let v = a[0], c = 0;
  for (let k = 0; k < a.length; k++) {
    if (a[k] === v) c++;
    else { o.push(v, c); v = a[k]; c = 1; }
  }
  if (a.length) o.push(v, c);
  return o;
}
function unrle(r, n) {
  const a = new Uint8Array(n);
  let k = 0;
  for (let i = 0; i + 1 < r.length; i += 2) {
    const c = Math.min(r[i + 1], n - k);
    a.fill(r[i], k, k + c);
    k += c;
  }
  return a;
}
function savedLand(L) {
  return { w: L.w, h: L.h, st: rle(Array.from(L.st)) };
}
function loadedLand(d) {
  return { w: d.w, h: d.h, st: unrle(d.st, d.w * d.h) };
}`,
  names: ['rle', 'unrle', 'savedLand', 'loadedLand'],
  test: (ns) => { for (let t = 0; t < 300; t++) { const n = Math.floor(Math.random() * 40); const a = Array.from({ length: n }, () => Math.floor(Math.random() * 3)); const b = ns.unrle(ns.rle(a), n); if (b.length !== n || a.some((v, i) => v !== b[i])) return false; } if (ns.rle([]).length !== 0) return false; const big = ns.unrle([2, 100], 5); return big.length === 5 && big.every((v) => v === 2); },
},
{
  key: 'c_safewrite', level: 3, source: 'clean', answer: C,
  trap: 'localStorage.setItem can throw when the store is full, but every call is inside try/catch; the backup write has its own nested try so a failed backup cannot stop the main write; a damaged old value is not copied to the backup.',
  context: 'Writes one save slot into the browser\'s localStorage, keeping the previous good value in a "-bak" slot. Returns true only if the new value can be read back. localStorage is the browser\'s own global.',
  snippet: R`const STORE = { status: 'ok', fails: 0, err: '' };

function safeWrite(key, str) {
  try {
    const old = localStorage.getItem(key);
    if (old) {
      try {
        JSON.parse(old);
        try { localStorage.setItem(key + '-bak', old); } catch (e) { /* no room for a backup */ }
      } catch (e) { /* the old value was damaged: keep the older backup */ }
    }
    localStorage.setItem(key, str);
    if (localStorage.getItem(key) !== str) throw new Error('could not read the save back');
    return true;
  } catch (e) {
    STORE.fails++;
    STORE.err = String(e && e.message || e);
    STORE.status = STORE.status === 'unavailable' ? 'unavailable' : 'failing';
    return false;
  }
}
function saveSlot(key, obj) {
  if (!safeWrite(key, JSON.stringify(obj))) return false;
  return true;
}`,
  names: ['safeWrite', 'saveSlot', 'STORE'],
  env: () => { const m = new Map(); let full = false; return { m, set full(v) { full = v; }, localStorage: { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { if (full) throw new Error('Quota'); m.set(k, v); } }, setFull: (v) => { full = v; } }; },
  test: (ns, env) => { if (ns.safeWrite('a', '{"n":1}') !== true) return false; if (ns.safeWrite('a', '{"n":2}') !== true) return false; if (env.m.get('a-bak') !== '{"n":1}') return false; env.m.set('a', 'not json'); ns.safeWrite('a', '{"n":3}'); if (env.m.get('a-bak') !== '{"n":1}') return false; env.setFull(true); let r; try { r = ns.safeWrite('a', '{"n":4}'); } catch (e) { return false; } return r === false && ns.STORE.fails === 1; },
},
{
  key: 'c_saferead', level: 2, source: 'clean', answer: C,
  trap: 'JSON.parse on a null or garbage value looks risky, but null is skipped by "if (!raw) continue" and garbage is caught by the try; ok(d) is only called with a parsed value, and the check d && ... is inside the caller\'s own test.',
  context: 'Reads one save slot from storage: the main slot first, then its "-bak" copy. ok(d) tells whether a parsed value looks like the right kind of save. Returns the data or null. get(k) returns a string or null.',
  snippet: R`const STORE = { status: 'ok', usedBackup: false };
const mem = new Map();
const get = (k) => (mem.has(k) ? mem.get(k) : null);

function safeRead(key, ok) {
  let bad = false;
  for (const k of [key, key + '-bak']) {
    const raw = get(k);
    if (!raw) continue;
    try {
      const d = JSON.parse(raw);
      if (ok(d)) { if (k !== key) STORE.usedBackup = true; return d; }
      bad = true;
    } catch (e) { bad = true; }
  }
  if (bad) STORE.status = 'corrupt';
  return null;
}
const loadSave = () => safeRead('save', (d) => d && d.v === 2 && Array.isArray(d.settlements));
const loadMapData = () => safeRead('map', (d) => d && Array.isArray(d.zones));
function put(k, v) { mem.set(k, v); }`,
  names: ['safeRead', 'loadSave', 'loadMapData', 'put', 'STORE', 'mem'],
  test: (ns) => { const { put, loadSave, loadMapData, STORE } = ns; if (loadSave() !== null || STORE.status !== 'ok') return false; put('save', 'null'); if (loadSave() !== null || STORE.status !== 'corrupt') return false; put('save-bak', '{"v":2,"settlements":[]}'); const d = loadSave(); if (!d || !STORE.usedBackup) return false; put('map', '{{{'); return loadMapData() === null; },
},
{
  key: 'c_resolve_fixed', level: 2, source: 'clean', answer: C,
  trap: 'indexOf can return -1 for a request that is already gone, but both resolveRequest and giveRequest check for that before using the index, so nothing wrong is removed and there is no double reward.',
  context: 'Speech-bubble requests ("water, please") sit in G.requests. A request fades after 420 seconds; the player can also tap its button, which may still be on screen after the request has gone. reqUi() redraws the buttons.',
  snippet: R`const G = { simT: 0, requests: [], settlements: [{ id: 1, stock: { water: 2 } }] };
function reqUi() { /* redraws the buttons from G.requests */ }

function requestsStep(S) {
  for (const r of G.requests.slice()) {
    if (r.sid === S.id && G.simT - r.t > 420) resolveRequest(r, true);
  }
}
function resolveRequest(r, silent) {
  const i = G.requests.indexOf(r);
  if (i >= 0) G.requests.splice(i, 1);
  reqUi();
}
function giveRequest(r) { // the player taps the button
  if (G.requests.indexOf(r) < 0) { reqUi(); return; } // already timed out or answered
  const S = G.settlements.find((s) => s.id === r.sid);
  if (!S) return resolveRequest(r);
  if (r.def.give === 'water') S.stock.water += 6;
  resolveRequest(r);
}
function addRequest(S, give, who) {
  G.requests.push({ sid: S.id, def: { give }, t: G.simT, who });
}`,
  names: ['G', 'addRequest', 'giveRequest', 'resolveRequest'],
  test: (ns) => { const { G, addRequest, giveRequest, resolveRequest } = ns; const S = G.settlements[0]; addRequest(S, 'water', 'a'); addRequest(S, 'none', 'b'); addRequest(S, 'none', 'c'); const a = G.requests[0]; giveRequest(a); giveRequest(a); resolveRequest(a, true); return G.requests.map((r) => r.who).join('') === 'bc' && S.stock.water === 8; },
},
{
  key: 'c_landtidy', level: 1, source: 'clean', answer: C,
  trap: '"Divide by zero": c / (c + o) would be 0/0 on an empty grid, but the ternary tests c + o first and gives a ratio of 1 for a grid with no clear or clutter cells.',
  context: 'Summarises a land grid: how many cells are clear floor (state 1) and how many have something standing on them (state 2), as a ratio of clear to used cells. LC is the cell size in metres.',
  snippet: R`const LC = 0.02;

function landTidy(L) {
  let c = 0, o = 0;
  for (let k = 0; k < L.st.length; k++) {
    if (L.st[k] === 1) c++;
    else if (L.st[k] === 2) o++;
  }
  return {
    clear: c,
    clutter: o,
    ratio: c + o ? c / (c + o) : 1,
    area: c * LC * LC,
  };
}
function tidyWord(t) {
  if (t.ratio > 0.9) return 'spotless';
  if (t.ratio > 0.6) return 'tidy';
  return 'cluttered';
}
function roomReport(zones) {
  return zones.filter((z) => z.land).map((z) => tidyWord(landTidy(z.land)));
}`,
  names: ['landTidy', 'roomReport'],
  test: (ns) => { const e = ns.landTidy({ st: [] }); const z = ns.landTidy({ st: [0, 0, 0] }); const m = ns.landTidy({ st: [1, 2, 2, 1] }); return e.ratio === 1 && z.ratio === 1 && m.ratio === 0.5 && Number.isFinite(e.area) && ns.roomReport([{ land: { st: [] } }, {}]).join() === 'spotless'; },
},
{
  key: 'c_homeof', level: 2, source: 'clean', answer: C,
  trap: 'hs.sort looks like it reorders S.things in place, but hs is a new array made by filter; and hs[0] looks undefined for an empty list, but the function returns null first if there are none.',
  context: 'Finds the home (hut or tent) nearest to a colonist, among the buildings that are finished and not on hold. S.things is the settlement\'s list of buildings and must keep its order, because saves refer to it by position.',
  snippet: R`const HOMES_K = ['tent', 'hut'];

function homeOf(S, c) {
  const hs = S.things.filter((t) => t.built && !t.hold && HOMES_K.includes(t.kind));
  if (!hs.length) return null;
  hs.sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z));
  return hs[0];
}
function goHome(S, c) {
  const h = homeOf(S, c);
  if (!h) return false;
  c.job = { type: 'sleep', th: h };
  return true;
}
function housing(S) {
  return S.things.filter((t) => t.built && HOMES_K.includes(t.kind)).length * 3;
}
const S = { things: [
  { kind: 'farm', built: true, x: 0, z: 0 },
  { kind: 'hut', built: true, x: 0.5, z: 0.5 },
  { kind: 'tent', built: true, x: 0.1, z: 0.1 },
  { kind: 'hut', built: false, x: 0.11, z: 0.11 },
] };`,
  names: ['S', 'homeOf', 'goHome', 'housing'],
  test: (ns) => { const { S, homeOf } = ns; const before = S.things.map((t) => t.kind + t.x).join(); const h = homeOf(S, { x: 0.12, z: 0.12 }); const none = homeOf({ things: [{ kind: 'farm', built: true }] }, { x: 0, z: 0 }); return h.kind === 'tent' && S.things.map((t) => t.kind + t.x).join() === before && none === null && ns.goHome({ things: [] }, { x: 0, z: 0 }) === false; },
},
{
  key: 'c_mainsettle', level: 1, source: 'clean', answer: C,
  trap: 'G.cur might be null and S.placed might be read on undefined, but G.cur is tested before use and the find() falls through to null; the callers also check for null.',
  context: 'Returns the settlement the player is looking at (G.cur, which the game clears when its settlement is lost) if it is placed and not waiting for settlers; otherwise the first settlement that is placed, not waiting and not lost; otherwise null.',
  snippet: R`const G = { cur: null, settlements: [] };

function mainSettlement() {
  return (G.cur && G.cur.placed && !G.cur.awaiting ? G.cur : null)
    || G.settlements.find((S) => S.placed && !S.awaiting && !S.lost)
    || null;
}
function focusMain() {
  const S = mainSettlement();
  if (!S) return 'nothing to look at';
  return 'looking at ' + S.name;
}
function colonistTotal() {
  return G.settlements.reduce((a, S) => a + (S.lost ? 0 : S.cols.length), 0);
}
function addDemo(name, o) {
  const S = Object.assign({ name, cols: [], placed: true, awaiting: false, lost: false }, o);
  G.settlements.push(S);
  return S;
}`,
  names: ['G', 'mainSettlement', 'focusMain', 'addDemo'],
  test: (ns) => { const { G, mainSettlement, focusMain, addDemo } = ns; if (mainSettlement() !== null || focusMain() !== 'nothing to look at') return false; const a = addDemo('a', { lost: true }), b = addDemo('b'); if (mainSettlement() !== b) return false; const c = addDemo('c'); G.cur = c; if (mainSettlement() !== c) return false; G.cur = addDemo('d', { awaiting: true }); return mainSettlement() === b; },
},
{
  key: 'c_fmtaway', level: 2, source: 'clean', answer: C,
  trap: 'The unit boundaries (m < 90, 36 * 60, d < 14, d < 60, d < 730) look like possible off-by-one slips, but every range hands over to the next unit at a sensible size and rounding never produces "1 days" or "0 weeks".',
  context: 'Turns a number of seconds away into a short phrase for the welcome-back card: minutes up to 90, then hours, then days, weeks, months and years.',
  snippet: R`function fmtAway(s) {
  const m = Math.round(s / 60);
  if (m < 90) return m + ' min';
  if (m < 36 * 60) return (m / 60).toFixed(1) + ' h';
  const d = m / 1440;
  if (d < 14) return Math.round(d) + ' days';
  if (d < 60) return Math.round(d / 7) + ' weeks';
  if (d < 730) return Math.round(d / 30.4) + ' months';
  return (d / 365).toFixed(1) + ' years';
}
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
function welcome(secs) {
  return 'The Giant was away for ' + fmtAway(secs) + '.';
}
function nightsText(n) {
  return n ? plural(n, 'night') + ' passed.' : 'It stayed light the whole time.';
}`,
  names: ['fmtAway'],
  test: (ns) => { const re = /^(\d+ min|\d+\.\d h|\d+ days|\d+ weeks|\d+ months|\d+\.\d years)$/; for (let s = 0; s < 3e9; s += s < 1e5 ? 37 : Math.ceil(s / 40) + 11) { const t = ns.fmtAway(s); if (!re.test(t) || /^1 (days|weeks|months)/.test(t) || /^0 (days|weeks|months)/.test(t)) return false; } return true; },
},
{
  key: 'c_withseed', level: 3, source: 'clean', answer: C,
  trap: 'withSeed replaces Math.random globally, which looks like it could leak if fn throws, but the restore is in a finally block. The seed || 1 stops a zero seed from sticking at zero.',
  context: 'The away simulation must give the same story every time for the same save, so it runs with a seeded random generator in place of Math.random for the duration of one call. seededRandom(seed) returns a function giving numbers in [0, 1).',
  snippet: R`function seededRandom(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function withSeed(seed, fn) {
  const r = Math.random;
  Math.random = seededRandom(seed);
  try { return fn(); } finally { Math.random = r; }
}
function previewAway(sv) {
  return withSeed(sv.t, () => [Math.random(), Math.random(), Math.random()]);
}
function playAway(sv) {
  return withSeed(sv.t, () => [Math.random(), Math.random(), Math.random()]);
}`,
  names: ['withSeed', 'previewAway', 'playAway', 'seededRandom'],
  test: (ns) => { const orig = Math.random; const sv = { t: 1731400000000 }; const a = ns.previewAway(sv), b = ns.playAway(sv); if (a.join() !== b.join() || a.some((x) => !(x >= 0 && x < 1))) return false; try { ns.withSeed(5, () => { throw new Error('x'); }); } catch (e) { /* expected */ } if (Math.random !== orig) return false; const z = ns.seededRandom(0); const v = [z(), z(), z()]; return new Set(v).size === 3; },
},
{
  key: 'c_seasonof', level: 1, source: 'clean', answer: C,
  trap: 'getMonth() is 0-based, which looks like an off-by-one, but the + 1 and the % 12 shift the buckets so that December, January and February are winter, March to May spring, and so on.',
  context: 'Picks the season line for a timestamp in milliseconds. Winter is December to February, spring March to May, summer June to August, autumn September to November (northern hemisphere).',
  snippet: R`const SEASONS = [
  ['winter', 'Winter: frost on the window.'],
  ['spring', 'Spring: the seedlings noticed the light.'],
  ['summer', 'Summer: warm shelves, sleepy colonists.'],
  ['autumn', 'Autumn: the light turned low and gold.'],
];
// Dec-Feb winter, Mar-May spring, ...
const seasonOf = (ms) => SEASONS[Math.floor(((new Date(ms).getMonth() + 1) % 12) / 3)];

function seasonLabel(ms) {
  return seasonOf(ms)[0].toUpperCase();
}
function seasonsBetween(t0, now) {
  const out = [];
  let last = seasonOf(t0)[0];
  for (let m = t0, n = 0; m < now && n < 400; m += 7 * 86400000, n++) {
    const sn = seasonOf(m);
    if (sn[0] !== last) { last = sn[0]; out.push(sn[1]); }
  }
  return out.slice(-4);
}`,
  names: ['seasonOf', 'seasonsBetween'],
  test: (ns) => { const want = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter']; for (let m = 0; m < 12; m++) for (const d of [1, 15, 28]) if (ns.seasonOf(new Date(2026, m, d, 12).getTime())[0] !== want[m]) return false; return true; },
},
{
  key: 'c_racefix', level: 3, source: 'clean', answer: C,
  trap: 'Two quick taps start two overlapping loads, which looks like a race, but after the await the function checks that this load is still the latest one (a token), so a late reply is ignored.',
  context: 'Tapping a room name on the title screen loads that room\'s map. Loading is asynchronous (fetchMap can take a second on a phone). If the player taps two rooms quickly, the screen should show the room tapped last.',
  snippet: R`const G = { cur: null, zones: [], mapName: '', loadSeq: 0 };

async function loadRoomMap(id) {
  const seq = ++G.loadSeq;
  const map = await fetchMap(id);
  if (seq !== G.loadSeq) return; // a newer tap has taken over
  G.zones = map.zones;
  G.mapName = map.name;
  render();
}
function pickRoom(id) {
  G.cur = id;
  G.mapName = 'Loading...';
  return loadRoomMap(id);
}
function render() {
  return G.mapName + ' (' + G.zones.length + ' zones)';
}
function roomLabel(id) {
  return id === G.cur ? '> ' + id : id;
}`,
  names: ['G', 'pickRoom'],
  env: () => ({ fetchMap: (id) => new Promise((res) => setTimeout(() => res({ name: 'Map ' + id, zones: [id] }), id === 'A' ? 60 : 5)) }),
  test: async (ns) => { ns.pickRoom('A'); ns.pickRoom('B'); await new Promise((r) => setTimeout(r, 150)); const ab = ns.G.mapName === 'Map B'; ns.pickRoom('B'); await new Promise((r) => setTimeout(r, 30)); return ab && ns.G.mapName === 'Map B'; },
},
{
  key: 'c_musicfix', level: 2, source: 'clean', answer: C,
  trap: 'toggleMusic(true) can be called while music is already playing, which looks like it would stack timers, but musicStart stops any running timer first, so there is only ever one interval and musicStop clears it.',
  context: 'Music is a repeating timer that plays one note every 400 ms. toggleMusic(on) is called by the Music menu button and also by the festival, so it can be called with true when music is already on.',
  snippet: R`const FUN = { musicT: 0, notes: 0 };
const G = { music: false };

function playNote() {
  FUN.notes++;
}
function musicStop() {
  if (FUN.musicT) clearInterval(FUN.musicT);
  FUN.musicT = 0;
}
function musicStart() {
  musicStop();
  FUN.musicT = setInterval(playNote, 400);
}
function toggleMusic(on) {
  G.music = on;
  if (on) musicStart();
  else musicStop();
  return G.music;
}
function festivalStart() {
  toggleMusic(true);
}
function festivalEnd(keepMusic) {
  if (!keepMusic) toggleMusic(false);
}`,
  names: ['toggleMusic', 'festivalStart', 'festivalEnd'],
  env: () => { const live = new Set(); let id = 0; return { live, setInterval: () => { live.add(++id); return id; }, clearInterval: (i) => { live.delete(i); } }; },
  test: (ns, env) => { ns.toggleMusic(true); ns.festivalStart(); if (env.live.size !== 1) return false; ns.festivalEnd(true); if (env.live.size !== 1) return false; ns.festivalEnd(false); return env.live.size === 0; },
},
{
  key: 'c_defaultscopy', level: 1, source: 'clean', answer: C,
  trap: 'NEEDS0 is a shared default object, which looks like colonists would share and mutate it, but every colonist gets a fresh copy with Object.assign({}, NEEDS0, ...), and the saved needs only override fields.',
  context: 'Every new colonist starts with the same default needs (all from 0 to 1); loaded colonists bring their own saved needs. Each colonist\'s needs then change on their own as time passes.',
  snippet: R`const NEEDS0 = { water: 1, food: 1, rest: 1, joy: 0.6 };
const G = { uid: 0 };

function addColonist(S, o) {
  const c = {
    id: ++G.uid,
    name: o.name,
    x: o.x || 0,
    z: o.z || 0,
    needs: Object.assign({}, NEEDS0, o.needs),
    job: null,
  };
  S.cols.push(c);
  return c;
}
function eat(c) {
  c.needs.food = Math.min(1, c.needs.food + 0.4);
}
function drain(c, dt) {
  c.needs.food = Math.max(0, c.needs.food - dt / 1500);
}
const S = { cols: [] };`,
  names: ['S', 'addColonist', 'drain', 'NEEDS0'],
  test: (ns) => { const a = ns.addColonist(ns.S, { name: 'a' }), b = ns.addColonist(ns.S, { name: 'b', needs: { food: 0.5 } }); ns.drain(a, 100); return b.needs.food === 0.5 && a.needs.food < 1 && ns.NEEDS0.food === 1 && b.needs.joy === 0.6; },
},
{
  key: 'c_nanguard', level: 2, source: 'clean', answer: C,
  trap: 'An older save may lack the joy need, which looks like it would give NaN, but restoreColonist fills in defaults and checks every number with Number.isFinite before using it.',
  context: 'Colonists are restored from a save file. Saves from early builds have needs for water, food and rest only; joy was added later. Needs are numbers from 0 to 1. A hand-edited save may hold nonsense values.',
  snippet: R`const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const NEEDS0 = { water: 1, food: 1, rest: 1, joy: 0.6 };

function num(v, dflt) {
  return Number.isFinite(v) ? v : dflt;
}
function restoreColonist(d) {
  const c = { id: d.id, name: String(d.name || 'Someone'), x: num(d.x, 0), z: num(d.z, 0) };
  const sv = d.needs || {};
  c.needs = {};
  for (const k of Object.keys(NEEDS0)) c.needs[k] = clamp(num(sv[k], NEEDS0[k]), 0, 1);
  return c;
}
function step(c, dt) {
  const n = c.needs;
  n.water = Math.max(0, n.water - dt / 1300);
  n.food = Math.max(0, n.food - dt / 1500);
  const avg = (n.food + n.water + n.rest) / 3;
  n.joy = clamp(n.joy + (avg > 0.6 ? dt / 900 : -dt / 500), 0.05, 1);
}
function mood(c) {
  const j = c.needs.joy;
  return j > 0.7 ? 'happy' : j > 0.35 ? 'fine' : 'low';
}`,
  names: ['restoreColonist', 'step', 'mood'],
  test: (ns) => { const bad = [{ id: 1, name: 'P', x: 0.1, needs: { water: 0.9, food: 0.8, rest: 0.7 } }, { id: 2 }, { id: 3, needs: { water: 'x', food: NaN, rest: 5, joy: -1 } }, { id: 4, x: Infinity, needs: null }]; for (const d of bad) { const c = ns.restoreColonist(d); ns.step(c, 2); if (!Object.values(c.needs).every((v) => Number.isFinite(v) && v >= 0 && v <= 1) || !Number.isFinite(c.x) || !Number.isFinite(c.z)) return false; } return true; },
},
{
  key: 'c_diary', level: 1, source: 'clean', answer: C,
  trap: 'The diary list looks like it grows forever, but diary() drops the oldest line once it holds more than 80; DIARY.seen only remembers event keys and is emptied by diaryReset at the start of each away story.',
  context: 'The diary collects short lines about what the colonists did while the player was away. A line with a key is added only once per away story. Only the last 80 lines are ever shown.',
  snippet: R`const DIARY = { on: false, lines: [], seen: {} };

function diaryReset() {
  DIARY.on = true;
  DIARY.lines = [];
  DIARY.seen = {};
}
function diary(text, by, key) {
  if (key) {
    if (DIARY.seen[key]) return;
    DIARY.seen[key] = 1;
  }
  DIARY.lines.push({ text, by: by || '' });
  if (DIARY.lines.length > 80) DIARY.lines.shift();
}
function diaryText() {
  return DIARY.lines.map((l) => (l.by ? l.by + ': ' : '') + l.text).join('\n');
}
function awayEvents(hours) {
  for (let h = 0; h < hours; h++) {
    if (h % 5 === 0) diary('The tent flapped.', 'Pip', 'tent' + (h % 15));
    diary('Hour ' + h + ' passed.', '');
  }
}`,
  names: ['DIARY', 'diaryReset', 'diary', 'awayEvents'],
  test: (ns) => { ns.diaryReset(); ns.awayEvents(300); const n = ns.DIARY.lines.length; const keyed = ns.DIARY.lines.filter((l) => l.by === 'Pip').length; return n <= 80 && n === 80 && keyed <= 3 && Object.keys(ns.DIARY.seen).length === 3; },
},
{
  key: 'c_tree', level: 3, source: 'clean', answer: C,
  trap: 'The growth test t.g >= 1 compares a float, which looks like it could miss or repeat, but t.g is capped with Math.min(1, ...) so it reaches exactly 1, and the whole block only runs while t.g < 1, so the toast fires once.',
  context: 'A tree grows from g = 0 to g = 1 over TREE_T seconds (faster when tended). When it is fully grown it announces itself once, and then it starts to make fruit: yield goes up by 1 every 70 seconds of growing weather, to a maximum of 2.',
  snippet: R`const TREE_T = 600;
const toasts = [];

function stepTree(t, dt, E, quiet) {
  if (t.pop > 0) t.pop = Math.max(0, t.pop - dt * 1.6);
  if (t.tend > 0) t.tend -= dt;
  if (t.kind !== 'tree') return;
  if (t.g < 1) {
    t.g = Math.min(1, t.g + dt / TREE_T * E.grow * (t.tend > 0 ? 1.8 : 1));
    if (t.g >= 1 && !quiet) toasts.push('A tree has grown up!');
  } else {
    t.yt += dt * E.grow;
    if (t.yt > 70 && t.yield < 2) { t.yield++; t.yt = 0; }
  }
}
function pickFruit(t) {
  if (t.yield < 1) return false;
  t.yield--;
  return true;
}
function mkTree() {
  return { kind: 'tree', g: 0, yield: 0, yt: 0, tend: 0, pop: 0 };
}`,
  names: ['stepTree', 'mkTree', 'toasts', 'pickFruit'],
  test: (ns) => { const t = ns.mkTree(), E = { grow: 1 }; for (let i = 0; i < 20000; i++) ns.stepTree(t, 0.37, E, false); return ns.toasts.length === 1 && t.g === 1 && t.yield === 2 && ns.pickFruit(t) && !ns.pickFruit({ yield: 0 }); },
},
{
  key: 'c_zonexform', level: 3, source: 'clean', answer: C,
  trap: 'zoneLocal and zoneWorld use sin and cos with different signs, which looks like a swapped sign bug, but they are exact inverses: converting a point to local and back returns the same point.',
  context: 'A zone sits on the table at (cx, cz), turned by angle ang. zoneLocal converts a world point to the zone\'s own (u, v) coordinates, and zoneWorld converts back. These are used to keep a settlement fixed to its zone.',
  snippet: R`function zoneLocal(Z, wx, wz) {
  const dx = wx - Z.cx, dz = wz - Z.cz;
  const c = Math.cos(Z.ang), s = Math.sin(Z.ang);
  return [dx * c + dz * s, -dx * s + dz * c];
}
function zoneWorld(Z, u, v) {
  const c = Math.cos(Z.ang), s = Math.sin(Z.ang);
  return [Z.cx + u * c - v * s, Z.cz + u * s + v * c];
}
function setZoneFrame(Z, cx, cz, ang) {
  Z.cx = cx; Z.cz = cz; Z.ang = ang;
  if (Z.settled) syncTf(Z.settled);
}
function syncTf(S) {
  const [x, z] = zoneWorld(S.zoneRef, S.o[0], S.o[1]);
  S.tf = { x, z };
}
function settle(Z, wx, wz) {
  const S = { zoneRef: Z, o: zoneLocal(Z, wx, wz), tf: null };
  Z.settled = S;
  syncTf(S);
  return S;
}`,
  names: ['settle', 'setZoneFrame', 'zoneLocal', 'zoneWorld'],
  test: (ns) => { for (let t = 0; t < 500; t++) { const Z = { cx: Math.random() * 3 - 1, cz: Math.random() * 3 - 1, ang: Math.random() * 7 - 3 }; const x = Math.random() * 2, z = Math.random() * 2; const S = ns.settle(Z, x, z); if (Math.abs(S.tf.x - x) > 1e-9 || Math.abs(S.tf.z - z) > 1e-9) return false; ns.setZoneFrame(Z, Z.cx + 1, Z.cz, Z.ang); const [u, v] = ns.zoneLocal(Z, x, z), w = ns.zoneWorld(Z, u, v); if (Math.abs(w[0] - x) > 1e-9 || Math.abs(w[1] - z) > 1e-9) return false; if (Math.abs(S.tf.x - (x + 1)) > 1e-9 && Math.abs(Math.hypot(S.tf.x - Z.cx, S.tf.z - Z.cz) - Math.hypot(x - (Z.cx - 1), z - Z.cz)) > 1e-9) return false; } return true; },
},
];
