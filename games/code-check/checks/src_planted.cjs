// 17 planted bugs: realistic bugs inserted into game-style code.
const R = String.raw;
const A = (o) => Object.assign({ bug: true }, o);
module.exports = [
{
  key: 'p_lowneed', level: 1, source: 'planted',
  context: 'Finds the colonist with the lowest of food, water and rest, so a speech bubble can show what they need. S.cols is the list of colonists in one settlement.',
  snippet: R`const S = { cols: [
  { name: 'Pip', needs: { food: 0.8, water: 0.9, rest: 0.7 } },
  { name: 'Dot', needs: { food: 0.3, water: 0.6, rest: 0.9 } },
] };

function lowestNeed(S) {
  let worst = null, wv = 1;
  for (let i = 0; i <= S.cols.length; i++) {
    const n = S.cols[i].needs;
    const v = Math.min(n.food, n.water, n.rest);
    if (v < wv) { wv = v; worst = S.cols[i]; }
  }
  return worst;
}
function needIcon(c) {
  const n = c.needs;
  if (n.water < 0.25) return 'drop';
  if (n.food < 0.25) return 'food';
  if (n.rest < 0.2) return 'zzz';
  return '';
}
function bubbleTick(S) {
  const c = lowestNeed(S);
  return c ? c.name + ' ' + needIcon(c) : '';
}`,
  names: ['S', 'lowestNeed'],
  answer: A({ function: 'lowestNeed', line_hint: 'i <= S.cols.length', what: 'Loop runs one step too far: at i === S.cols.length, S.cols[i] is undefined and reading .needs throws a TypeError', trigger: 'Any settlement with at least one colonist: the last iteration reads S.cols[S.cols.length].needs', severity: 'crash', fix: 'for (let i = 0; i < S.cols.length; i++)' }),
  patch: [['i <= S.cols.length', 'i < S.cols.length']],
  test: (ns) => { try { ns.lowestNeed(ns.S); return false; } catch (e) { return true; } },
},
{
  key: 'p_season', level: 2, source: 'planted',
  context: 'Picks the season line for the "time away" story from a timestamp in milliseconds. Winter is December to February, spring March to May, summer June to August, autumn September to November (northern hemisphere).',
  snippet: R`const SEASONS = [
  ['winter', 'Winter: frost on the window.'],
  ['spring', 'Spring: the seedlings noticed the light.'],
  ['summer', 'Summer: warm shelves, sleepy colonists.'],
  ['autumn', 'Autumn: the light turned low and gold.'],
];
const seasonOf = (ms) => SEASONS[Math.floor((new Date(ms).getMonth() % 12) / 3)];

function seasonsBetween(t0, now) { // one line each time the season changes, checked weekly
  const out = [];
  let last = seasonOf(t0)[0];
  for (let m = t0, n = 0; m < now && n < 400; m += 7 * 86400000, n++) {
    const sn = seasonOf(m);
    if (sn[0] !== last) { last = sn[0]; out.push(sn[1]); }
  }
  return out.slice(-4);
}
function seasonLabel(ms) {
  return seasonOf(ms)[0].toUpperCase();
}`,
  names: ['seasonOf'],
  answer: A({ function: 'seasonOf', line_hint: 'getMonth() % 12) / 3', what: 'getMonth() is 0-based (January = 0), so the quarter boundaries are shifted by one month: December falls in the last (autumn) bucket and March, June, September land one season too early', trigger: 'Any date in December, March, June or September, for example 15 December gives autumn', severity: 'cosmetic', fix: 'SEASONS[Math.floor(((new Date(ms).getMonth() + 1) % 12) / 3)]' }),
  patch: [['Math.floor((new Date(ms).getMonth() % 12) / 3)', 'Math.floor(((new Date(ms).getMonth() + 1) % 12) / 3)']],
  test: (ns) => ns.seasonOf(new Date(2026, 11, 15).getTime())[0] !== 'winter',
},
{
  key: 'p_front', level: 2, source: 'planted',
  context: 'The turn order is a list of colonist ids. When the player taps a colonist\'s portrait, that colonist is moved to the front of the list. The id comes from the tap and may belong to someone who has just left the settlement.',
  snippet: R`const turn = { order: [3, 5, 8, 12] };

function moveToFront(list, id) {
  list.unshift(list.splice(list.indexOf(id), 1)[0]);
  return list;
}
function onPortraitTap(id) {
  moveToFront(turn.order, id);
  redrawStrip();
}
function redrawStrip() {
  const bar = turn.order.map((id) => '[' + id + ']').join('');
  return bar;
}
function colonistLeaves(id) {
  const i = turn.order.indexOf(id);
  if (i >= 0) turn.order.splice(i, 1);
  redrawStrip();
}
function nextUp() {
  return turn.order.length ? turn.order[0] : null;
}`,
  names: ['turn', 'onPortraitTap'],
  answer: A({ function: 'moveToFront', line_hint: 'list.splice(list.indexOf(id), 1)', what: 'If id is not in the list, indexOf returns -1 and splice(-1, 1) removes the last element, which is then moved to the front, so the wrong colonist jumps the queue and the order changes', trigger: 'moveToFront(order, 99) with 99 not in [3, 5, 8, 12] moves 12 to the front', severity: 'wrong', fix: 'const i = list.indexOf(id); if (i < 0) return list; list.unshift(list.splice(i, 1)[0]);' }),
  patch: [['list.unshift(list.splice(list.indexOf(id), 1)[0]);', 'const i = list.indexOf(id); if (i < 0) return list;\n  list.unshift(list.splice(i, 1)[0]);']],
  test: (ns) => { ns.onPortraitTap(99); return ns.turn.order.join(',') !== '3,5,8,12'; },
},
{
  key: 'p_fav', level: 1, source: 'planted',
  context: 'Each colonist has a list of liked things (c.likes, an array of strings). addLike adds a kind to that list unless it is already there, so the list holds each kind at most once.',
  snippet: R`const LIKES_MAX = 6;

function addLike(c, kind) {
  if (c.likes.indexOf(kind)) return false;
  if (c.likes.length >= LIKES_MAX) c.likes.shift();
  c.likes.push(kind);
  return true;
}
function likesText(c) {
  if (!c.likes.length) return 'nothing yet';
  return c.likes.join(', ');
}
function learnFromChat(a, b) {
  for (const k of b.likes) {
    if (Math.random() < 0.3) addLike(a, k);
  }
}
function likesKind(c, kind) {
  return c.likes.includes(kind);
}
const demo = { name: 'Pip', likes: ['farm', 'well'] };`,
  names: ['addLike', 'demo'],
  answer: A({ function: 'addLike', line_hint: 'if (c.likes.indexOf(kind)) return false;', what: 'indexOf returns -1 (truthy) when the kind is absent and 0 (falsy) when it is first, so new kinds are never added and the first existing kind is added again as a duplicate', trigger: 'addLike(c, "tree") on likes ["farm","well"] returns false and adds nothing; addLike(c, "farm") adds a second "farm"', severity: 'wrong', fix: 'if (c.likes.includes(kind)) return false;' }),
  patch: [['if (c.likes.indexOf(kind)) return false;', 'if (c.likes.indexOf(kind) >= 0) return false;']],
  test: (ns) => { const c = { likes: ['farm', 'well'] }; ns.addLike(c, 'tree'); ns.addLike(c, 'farm'); return c.likes.join() !== 'farm,well,tree'; },
},
{
  key: 'p_job', level: 2, source: 'planted',
  context: 'A colonist\'s job has a duration j.dur in seconds and an elapsed time j.t. runJob is called every frame with the frame time dt; when the job is done, endJob clears c.job so the colonist can choose a new one.',
  snippet: R`function endJob(c) {
  c.job = null;
  c.cool = 0.4;
}
function startJob(c, type, dur) {
  c.job = { type, dur, t: 0 };
}
function runJob(c, dt) {
  const j = c.job;
  if (!j) return;
  j.t = Math.min(j.dur, j.t + dt);
  if (j.t > j.dur) endJob(c);
}
function chooseJob(c) {
  if (c.job || c.cool > 0) return;
  startJob(c, 'read', 5);
}
function frame(c, dt) {
  c.cool = Math.max(0, (c.cool || 0) - dt);
  chooseJob(c);
  runJob(c, dt);
}`,
  names: ['frame'],
  answer: A({ function: 'runJob', line_hint: 'if (j.t > j.dur) endJob(c);', what: 'j.t is clamped to j.dur with Math.min, so it can never be strictly greater than j.dur; endJob is never called and the colonist is stuck on the job forever', trigger: 'Any job: after dur seconds j.t equals dur and the > test stays false', severity: 'stuck', fix: 'if (j.t >= j.dur) endJob(c);' }),
  patch: [['if (j.t > j.dur) endJob(c);', 'if (j.t >= j.dur) endJob(c);']],
  test: (ns) => { const c = { cool: 0, job: null }; let ended = false, first = null; for (let i = 0; i < 200; i++) { ns.frame(c, 0.1); if (!first) first = c.job; else if (c.job !== first) { ended = true; break; } } return !ended; },
},
{
  key: 'p_share', level: 2, source: 'planted',
  context: 'When the settlement has food in store, it is shared out in whole units between the colonists who are hungry (food need below 0.5). Each unit given raises that colonist\'s food need by 0.25. The function returns how many units were given out.',
  snippet: R`const S = {
  stock: { food: 7, wood: 3 },
  cols: [
    { name: 'Pip', needs: { food: 0.2 } },
    { name: 'Dot', needs: { food: 0.4 } },
    { name: 'Moss', needs: { food: 0.1 } },
    { name: 'Fen', needs: { food: 0.9 } },
  ],
};

function feedAll(S) {
  const hungry = S.cols.filter((c) => c.needs.food < 0.5);
  if (!hungry.length) return 0;
  const each = Math.floor(S.stock.food / hungry.length);
  for (const c of hungry) {
    c.needs.food = Math.min(1, c.needs.food + each * 0.25);
  }
  S.stock.food = 0;
  return each * hungry.length;
}
function pantryText(S) {
  return S.stock.food + ' food, ' + S.stock.wood + ' wood';
}
function mealTime(S) {
  const given = feedAll(S);
  return given ? 'Supper! ' + given + ' portions.' : 'Nobody was hungry.';
}`,
  names: ['S', 'feedAll'],
  answer: A({ function: 'feedAll', line_hint: 'S.stock.food = 0;', what: 'The store is set to zero, but Math.floor only gave out each * hungry.length units, so the remainder is destroyed. With 7 food and 3 hungry colonists, 6 are given and 1 vanishes; with fewer food than hungry colonists all of it is lost and nobody is fed', trigger: 'S.stock.food = 7 with three hungry colonists (each = 2, one unit lost)', severity: 'wrong', fix: 'S.stock.food -= each * hungry.length;' }),
  patch: [['S.stock.food = 0;', 'S.stock.food -= each * hungry.length;']],
  test: (ns) => { ns.feedAll(ns.S); return ns.S.stock.food !== 1; },
},
{
  key: 'p_saveguard', level: 2, source: 'planted',
  context: 'saveMap writes the room map and saveNow writes the colony into browser storage. Both are called from a timer, including on the title screen before a saved colony has been loaded into memory (when G.settlements is still empty).',
  snippet: R`const disk = {};      // stand-in for localStorage
const G = { zones: [], settlements: [] };

function safeWrite(key, str) {
  disk[key] = str;
  return true;
}
function mapToJSON() {
  return { kind: 'room-map', zones: G.zones.map((z) => ({ id: z.id, name: z.name })) };
}
function serialize() {
  return { v: 2, settlements: G.settlements.map((S) => ({ id: S.id, zid: S.zid })) };
}
function saveMap() {
  if (!G.zones.length) return true;
  return safeWrite('map', JSON.stringify(mapToJSON()));
}
function saveNow() {
  return safeWrite('save', JSON.stringify(serialize()));
}
function persistSoon() {
  saveMap();
  saveNow();
}
function loadSave() {
  return disk.save ? JSON.parse(disk.save) : null;
}`,
  names: ['disk', 'G', 'persistSoon', 'loadSave'],
  answer: A({ function: 'saveNow', line_hint: 'function saveNow() {', what: 'saveMap has an empty-state guard but saveNow does not, so when the timer fires before the saved colony is loaded, saveNow writes an empty settlement list over the real save', trigger: 'Title screen with a saved colony on disk: G.settlements is empty, the timer calls persistSoon, and the stored colony is replaced by {"settlements":[]}', severity: 'lose-data', fix: 'if (!G.settlements.length) return true; at the top of saveNow' }),
  patch: [['function saveNow() {\n  return', 'function saveNow() {\n  if (!G.settlements.length) return true;\n  return']],
  test: (ns) => { ns.disk.save = JSON.stringify({ v: 2, settlements: [{ id: 1, zid: 1 }] }); ns.persistSoon(); return ns.loadSave().settlements.length === 0; },
},
{
  key: 'p_cache', level: 3, source: 'planted',
  context: 'clearArea measures how much clear floor a zone has; it is slow, so the answer is cached by zone id. Each room has its own map. When the player switches rooms, the old zones are dropped and the new room\'s zones are numbered again from 1.',
  snippet: R`const G = { zones: [], nextMZ: 1 };
const AREA_CACHE = new Map(); // zone id -> clear area in square metres
const CELL = 0.0004;

function clearArea(Z) {
  if (AREA_CACHE.has(Z.id)) return AREA_CACHE.get(Z.id);
  let n = 0;
  for (const c of Z.cells) if (c === 1) n++;
  const a = n * CELL;
  AREA_CACHE.set(Z.id, a);
  return a;
}
function worldDrop() {
  G.zones = [];
  G.nextMZ = 1;
}
function loadRoom(room) {
  worldDrop();
  for (const z of room.zones) G.zones.push({ id: G.nextMZ++, cells: z.cells.slice() });
}
function roomArea() {
  return G.zones.reduce((a, Z) => a + clearArea(Z), 0);
}
function canSettle(Z) {
  return clearArea(Z) > 0.08;
}`,
  names: ['loadRoom', 'roomArea'],
  answer: A({ function: 'worldDrop', function_also: ['clearArea', 'loadRoom'], line_hint: 'AREA_CACHE is never cleared', what: 'The cache is keyed by zone id but zone ids restart at 1 in every room and the cache is not cleared in worldDrop, so after switching rooms clearArea returns the previous room\'s cached areas for zones with the same id', trigger: 'Load room A, call roomArea(), load room B (whose zones have different cells), call roomArea(): the result is still room A\'s', severity: 'wrong', fix: 'Call AREA_CACHE.clear() in worldDrop (or key the cache by room and zone)' }),
  patch: [['function worldDrop() {\n  G.zones = [];', 'function worldDrop() {\n  AREA_CACHE.clear();\n  G.zones = [];']],
  test: (ns) => { ns.loadRoom({ zones: [{ cells: [1, 1, 1, 1] }] }); const a = ns.roomArea(); ns.loadRoom({ zones: [{ cells: [1] }] }); const b = ns.roomArea(); return Math.abs(a - b) < 1e-9; },
},
{
  key: 'p_visits', level: 3, source: 'planted',
  context: 'At the end of a visit the game saves the colony (which stores the visit count) and updates the rooms list (which also shows the visit count). After a reload both numbers should agree.',
  snippet: R`const disk = {};
const G = { visits: 4, cur: 'r1' };
const HOMES = { cur: 'r1', rooms: [{ id: 'r1', name: 'My room', visits: 4 }] };

function homesSave() {
  disk.rooms = JSON.stringify(HOMES);
}
function saveNow() {
  disk.save = JSON.stringify({ v: 2, visits: G.visits });
}
function homeInfo(id) {
  return HOMES.rooms.find((r) => r.id === id) || null;
}
function homeStats() {
  const r = homeInfo(HOMES.cur);
  if (!r) return;
  r.visits = G.visits;
  r.last = 1;
  homesSave();
}
function endVisit() {
  saveNow();
  G.visits++;
  homeStats();
}
function titleText() {
  return HOMES.rooms.map((r) => r.name + ': ' + r.visits + ' visits').join('; ');
}`,
  names: ['disk', 'endVisit'],
  answer: A({ function: 'endVisit', line_hint: 'saveNow(); G.visits++; homeStats();', what: 'The colony is saved before the visit counter is incremented, but the rooms list is written after, so the two stores disagree by one: the save says 4 visits and the rooms list says 5', trigger: 'Any call to endVisit', severity: 'wrong', fix: 'Increment G.visits first, then call saveNow() and homeStats()' }),
  patch: [['saveNow();\n  G.visits++;\n  homeStats();', 'G.visits++;\n  saveNow();\n  homeStats();']],
  test: (ns) => { ns.endVisit(); return JSON.parse(ns.disk.save).visits !== JSON.parse(ns.disk.rooms).rooms[0].visits; },
},
{
  key: 'p_nan', level: 2, source: 'planted',
  context: 'Colonists are restored from an older save file. Saves from early builds have needs for water, food and rest only; the joy need was added later. Needs are numbers from 0 to 1. step is called every frame for each colonist.',
  snippet: R`const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function restoreColonist(d) {
  const c = { id: d.id, name: d.name, x: d.x || 0, z: d.z || 0 };
  c.needs = d.needs;
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
}
const oldSave = { id: 1, name: 'Pip', x: 0.1, z: 0.2, needs: { water: 0.9, food: 0.8, rest: 0.7 } };`,
  names: ['restoreColonist', 'step', 'oldSave'],
  answer: A({ function: 'restoreColonist', function_also: ['step'], line_hint: 'c.needs = d.needs;', what: 'A save without a joy need leaves c.needs.joy undefined; step computes undefined + number = NaN and clamp(NaN) stays NaN, so the colonist\'s joy and mood are permanently broken (mood always returns "low")', trigger: 'Restoring oldSave (no joy field) and running step once', severity: 'wrong', fix: 'c.needs = Object.assign({ water: 1, food: 1, rest: 1, joy: 0.6 }, d.needs);' }),
  patch: [['c.needs = d.needs;', 'c.needs = Object.assign({ water: 1, food: 1, rest: 1, joy: 0.6 }, d.needs);']],
  test: (ns) => { const c = ns.restoreColonist(ns.oldSave); ns.step(c, 1); return !Number.isFinite(c.needs.joy); },
},
{
  key: 'p_music', level: 3, source: 'planted',
  context: 'Music is a repeating timer that plays one note every 400 ms. toggleMusic(on) is called by the Music menu button and also by the festival, so it can be called with true when music is already on.',
  snippet: R`const FUN = { musicT: 0, notes: 0 };
const G = { music: false };

function playNote() {
  FUN.notes++;
}
function musicStart() {
  FUN.musicT = setInterval(playNote, 400);
}
function musicStop() {
  if (FUN.musicT) clearInterval(FUN.musicT);
  FUN.musicT = 0;
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
  names: ['toggleMusic', 'festivalStart'],
  env: () => { const live = new Set(); let id = 0; return { live, setInterval: (f) => { live.add(++id); return id; }, clearInterval: (i) => { live.delete(i); } }; },
  answer: A({ function: 'musicStart', function_also: ['toggleMusic'], line_hint: 'FUN.musicT = setInterval(playNote, 400);', what: 'musicStart does not clear an existing timer first. A second start overwrites FUN.musicT, so the first interval can never be cleared; musicStop stops only one and the music keeps playing (and doubles up) after being switched off', trigger: 'toggleMusic(true) while music is already on (menu button then festivalStart), then toggleMusic(false)', severity: 'wrong', fix: 'Call musicStop() at the start of musicStart()' }),
  patch: [['function musicStart() {\n  FUN', 'function musicStart() {\n  musicStop();\n  FUN']],
  test: (ns, env) => { ns.toggleMusic(true); ns.festivalStart(); ns.toggleMusic(false); return env.live.size > 0; },
},
{
  key: 'p_history', level: 2, source: 'planted',
  context: 'The game keeps a short history of what happened (G.history), which is written into every save so that the "Story so far" page can show it. note() is called for each event, including many small events every minute while the game runs.',
  snippet: R`const G = { simT: 0, history: [], uid: 0 };

function note(text, kind) {
  G.history.push({ id: ++G.uid, t: Math.round(G.simT), text, kind: kind || 'ev' });
}
function onBirth(c) { note(c.name + ' was born', 'birth'); }
function onTreeGrown() { note('A tree has grown up', 'tree'); }
function onVisitor(name) { note(name + ' came to visit', 'visit'); }

function serialize() {
  return { v: 2, t: G.simT, uid: G.uid, history: G.history };
}
function storyPage() {
  return G.history.slice(-20).map((h) => h.text).join('\n');
}
function loadSave(sv) {
  G.simT = sv.t || 0;
  G.uid = sv.uid || 0;
  G.history = Array.isArray(sv.history) ? sv.history : [];
}
function tick(dt) {
  G.simT += dt;
  if (Math.round(G.simT) % 60 === 0) onTreeGrown();
}`,
  names: ['G', 'note'],
  answer: A({ function: 'note', line_hint: 'G.history.push(', what: 'The history array only ever grows and is saved whole on every save, so the save gets bigger forever until the browser storage quota is hit; the story page only ever shows the last 20 entries', trigger: 'Leave the game running for days or call note many times: G.history keeps every entry', severity: 'wrong', fix: 'Cap the list: if (G.history.length > 60) G.history.shift(); after the push' }),
  patch: [["kind: kind || 'ev' });", "kind: kind || 'ev' });\n  if (G.history.length > 60) G.history.shift();"]],
  test: (ns) => { for (let i = 0; i < 1000; i++) ns.note('x'); return ns.G.history.length > 200; },
},
{
  key: 'p_defaults', level: 1, source: 'planted',
  context: 'Every new colonist starts with the same default needs (all from 0 to 1) and then each colonist\'s needs go up and down on their own as time passes.',
  snippet: R`const NEEDS0 = { water: 1, food: 1, rest: 1, joy: 0.6 };
const G = { uid: 0 };

function addColonist(S, o) {
  const c = {
    id: ++G.uid,
    name: o.name,
    x: o.x || 0,
    z: o.z || 0,
    needs: NEEDS0,
    job: null,
  };
  S.cols.push(c);
  return c;
}
function hungry(c) {
  return c.needs.food < 0.25;
}
function eat(c) {
  c.needs.food = Math.min(1, c.needs.food + 0.4);
}
function drain(c, dt) {
  c.needs.food = Math.max(0, c.needs.food - dt / 1500);
}
const S = { cols: [] };`,
  names: ['S', 'addColonist', 'drain'],
  answer: A({ function: 'addColonist', line_hint: 'needs: NEEDS0,', what: 'Every colonist gets a reference to the same NEEDS0 object instead of a copy, so changing one colonist\'s needs changes everyone\'s (and the default itself)', trigger: 'Add two colonists, drain one: both are hungry', severity: 'wrong', fix: 'needs: Object.assign({}, NEEDS0),' }),
  patch: [['needs: NEEDS0,', 'needs: Object.assign({}, NEEDS0),']],
  test: (ns) => { const a = ns.addColonist(ns.S, { name: 'a' }), b = ns.addColonist(ns.S, { name: 'b' }); ns.drain(a, 100); return b.needs.food !== 1; },
},
{
  key: 'p_race', level: 3, source: 'planted',
  context: 'Tapping a room name on the title screen loads that room\'s map. Loading is asynchronous (fetchMap can take a second on a phone). If the player taps two rooms quickly, the screen should end up showing the room tapped last.',
  snippet: R`const G = { cur: null, zones: [], mapName: '' };

async function loadRoomMap(id) {
  const map = await fetchMap(id);
  G.zones = map.zones;
  G.mapName = map.name;
  render();
}
function pickRoom(id) {
  G.cur = id;
  G.mapName = 'Loading...';
  loadRoomMap(id);
}
function render() {
  return G.mapName + ' (' + G.zones.length + ' zones)';
}
function roomLabel(id) {
  return id === G.cur ? '> ' + id : id;
}
function titleButtons(ids) {
  return ids.map(roomLabel).join(' ');
}`,
  names: ['G', 'pickRoom'],
  env: () => ({ fetchMap: (id) => new Promise((res) => setTimeout(() => res({ name: 'Map ' + id, zones: [id] }), id === 'A' ? 60 : 5)) }),
  answer: A({ function: 'loadRoomMap', function_also: ['pickRoom'], line_hint: 'const map = await fetchMap(id);', what: 'Race: replies can arrive out of order. If room A is tapped, then room B, and A\'s slow fetch finishes last, A\'s map overwrites B\'s while G.cur is B', trigger: 'pickRoom("A") then pickRoom("B") when A\'s fetch takes longer than B\'s', severity: 'wrong', fix: 'After the await, return if (G.cur !== id); (or use a request counter token)' }),
  patch: [['const map = await fetchMap(id);\n', 'const map = await fetchMap(id);\n  if (G.cur !== id) return;\n']],
  test: async (ns) => { ns.pickRoom('A'); ns.pickRoom('B'); await new Promise((r) => setTimeout(r, 150)); return ns.G.mapName !== 'Map B'; },
},
{
  key: 'p_nearest', level: 2, source: 'planted',
  context: 'Finds the named spot closest to a point (x, z) on the table, as long as it is within rad metres. Spots are objects with x and z in metres. Returns the spot or null.',
  snippet: R`function nameNear(spots, x, z, rad) {
  let best = null, bd = rad;
  for (const s of spots) {
    if (s.src === 'default') continue;
    const d = Math.hypot(s.x - x, s.z - x);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
function labelAt(spots, x, z) {
  const s = nameNear(spots, x, z, 0.12);
  return s ? s.name : 'somewhere';
}
function countNamed(spots) {
  return spots.filter((s) => s.src !== 'default').length;
}
const spots = [
  { name: 'The Cup', x: 0.2, z: 0.5, src: 'taught' },
  { name: 'Desk edge', x: 0.9, z: 0.1, src: 'taught' },
  { name: 'Table', x: 0, z: 0, src: 'default' },
];`,
  names: ['nameNear', 'spots'],
  answer: A({ function: 'nameNear', line_hint: 'Math.hypot(s.x - x, s.z - x)', what: 'Copy-paste slip: the z distance is computed against x instead of z (s.z - x), so the distance is wrong whenever x and z differ', trigger: 'nameNear(spots, 0.2, 0.5, 0.12) should find The Cup (distance 0) but computes a distance of 0.3 and returns null', severity: 'wrong', fix: 'Math.hypot(s.x - x, s.z - z)' }),
  patch: [['s.z - x)', 's.z - z)']],
  test: (ns) => ns.nameNear(ns.spots, 0.2, 0.5, 0.12) === null,
},
{
  key: 'p_closure', level: 1, source: 'planted',
  context: 'The title screen lists the saved rooms, one button each. Tapping a button switches to that room. el.add(label) creates a button and returns it.',
  snippet: R`const calls = [];
function switchRoom(id) {
  calls.push(id);
  return id;
}
function buildRoomList(rooms, el) {
  const buttons = [];
  for (var i = 0; i < rooms.length; i++) {
    const b = el.add(rooms[i].name + ' (' + rooms[i].visits + ' visits)');
    b.onclick = () => switchRoom(rooms[i].id);
    buttons.push(b);
  }
  return buttons;
}
function makeEl() {
  return { add(label) { return { label, onclick: null }; } };
}
const rooms = [
  { id: 'r1', name: 'My room', visits: 4 },
  { id: 'r2', name: 'Kitchen', visits: 1 },
  { id: 'r3', name: 'Garage', visits: 0 },
];`,
  names: ['calls', 'buildRoomList', 'makeEl', 'rooms'],
  answer: A({ function: 'buildRoomList', line_hint: 'for (var i = 0;', what: 'The click handler closes over the function-scoped var i, which equals rooms.length after the loop, so every button calls rooms[3].id and throws a TypeError (undefined.id)', trigger: 'Tap any room button after the list is built', severity: 'crash', fix: 'for (let i = 0; ...) so each handler gets its own i' }),
  patch: [['for (var i = 0;', 'for (let i = 0;']],
  test: (ns) => { const bs = ns.buildRoomList(ns.rooms, ns.makeEl()); try { bs[0].onclick(); return ns.calls[0] !== 'r1'; } catch (e) { return true; } },
},
{
  key: 'p_prefs', level: 2, source: 'planted',
  context: 'Sound settings are kept in the browser\'s localStorage, which only stores strings. savePrefs runs when the player changes a setting; loadPrefs runs at start-up.',
  snippet: R`const mem = {};
const store = {
  get(k) { return k in mem ? mem[k] : null; },
  set(k, v) { mem[k] = String(v); },
};
const G = { muted: false, vol: 0.6 };

function savePrefs() {
  store.set('bc-muted', G.muted ? 1 : 0);
  store.set('bc-vol', G.vol);
}
function loadPrefs() {
  G.muted = !!store.get('bc-muted');
  const v = store.get('bc-vol');
  G.vol = v === null ? 0.6 : Math.min(1, Math.max(0, parseFloat(v)));
}
function setMuted(m) {
  G.muted = m;
  savePrefs();
}
function effectiveVolume() {
  return G.muted ? 0 : G.vol;
}
function restart() {
  G.muted = false; G.vol = 0.6;
  loadPrefs();
}`,
  names: ['G', 'setMuted', 'restart'],
  answer: A({ function: 'loadPrefs', line_hint: 'G.muted = !!store.get(\'bc-muted\');', what: 'localStorage returns the string "0" for an unmuted game, and "0" is truthy, so !!"0" is true: after any reload the game is muted even though the player unmuted it', trigger: 'Unmute (setMuted(false)), then reload: loadPrefs sets G.muted = true', severity: 'wrong', fix: "G.muted = store.get('bc-muted') === '1';" }),
  patch: [["G.muted = !!store.get('bc-muted');", "G.muted = store.get('bc-muted') === '1';"]],
  test: (ns) => { ns.setMuted(false); ns.restart(); return ns.G.muted === true; },
},
];
