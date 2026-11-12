// The 7 real bugs found or fixed on 12 Nov 2026 (code as it was BEFORE the fix, lightly reshaped into stand-alone extracts).
const R = String.raw;
module.exports = [
{
  key: 'req', level: 2, source: 'real',
  context: 'Little speech-bubble buttons ask the player for help ("water, please"). A request fades away after 420 seconds; the player can also tap its button to answer it. reqUi() redraws the buttons from G.requests.',
  snippet: R`const G = { simT: 0, uid: 0, requests: [], settlements: [{ id: 1, lost: false, stock: { water: 2 } }] };
function reqUi() { /* redraws the buttons from G.requests */ }

function addRequest(S, def, who) {
  G.requests.push({ id: ++G.uid, def, sid: S.id, t: G.simT, who });
  reqUi();
}
function requestsStep(S) {
  // too old: it fades away
  for (const r of G.requests.slice()) {
    if (r.sid === S.id && G.simT - r.t > 420) resolveRequest(r, true);
  }
}
function resolveRequest(r, silent) {
  G.requests.splice(G.requests.indexOf(r), 1);
  reqUi();
}
function giveRequest(r) { // the player taps the button
  const S = G.settlements.find((s) => s.id === r.sid);
  if (!S) return resolveRequest(r);
  if (r.def.give === 'water') S.stock.water += 6;
  resolveRequest(r);
}`,
  names: ['G', 'addRequest', 'requestsStep', 'resolveRequest', 'giveRequest'],
  answer: { bug: true, function: 'resolveRequest', function_also: ['giveRequest'], line_hint: 'G.requests.splice(G.requests.indexOf(r), 1)', what: 'indexOf returns -1 when the request is already gone (timed out while its button was still on screen), and splice(-1, 1) then removes the last request in the list, which is a different one',
    trigger: 'A request times out and is removed, then the player taps its stale button: giveRequest calls resolveRequest(r) with r no longer in G.requests', severity: 'wrong', fix: 'const i = G.requests.indexOf(r); if (i >= 0) G.requests.splice(i, 1);' },
  patch: [['G.requests.splice(G.requests.indexOf(r), 1);', 'const i = G.requests.indexOf(r); if (i >= 0) G.requests.splice(i, 1);']],
  test: (ns) => { const { G, addRequest, resolveRequest, giveRequest } = ns; const S = G.settlements[0];
    addRequest(S, { give: 'water' }, 'a'); addRequest(S, { give: 'none' }, 'b'); addRequest(S, { give: 'none' }, 'c');
    const a = G.requests[0]; resolveRequest(a, true); giveRequest(a);
    return G.requests.map((r) => r.who).join('') !== 'bc'; },
},
{
  key: 'persist', level: 3, source: 'real',
  context: 'Saves the room map and the colony into the browser\'s storage. persist() is called by a timer after every change. If the map is missing when the page reloads, the colony cannot be placed in the room.',
  snippet: R`const STORE = { fails: 0, told: false };
const ls = { data: {}, cap: 120, setItem(k, v) { // stand-in for localStorage: small quota
  const used = Object.keys(this.data).filter((q) => q !== k).reduce((a, q) => a + this.data[q].length, 0);
  if (used + v.length > this.cap) throw new Error('QuotaExceededError');
  this.data[k] = v;
} };
const G = { phase: 'play', zones: [], settlements: [] };

function safeWrite(key, str) {
  try { ls.setItem(key, str); return true; } catch (e) { STORE.fails++; return false; }
}
function storeWarn() { STORE.told = true; }
function saveMap() {
  if (!G.zones.length) return;
  if (!safeWrite('map', JSON.stringify(G.zones))) storeWarn();
}
function saveNow() {
  if (!G.settlements.length) return;
  if (!safeWrite('save', JSON.stringify(G.settlements))) storeWarn();
}
function persist(force) {
  if (G.phase === 'title') return false;
  if (G.zones.length) saveMap();
  saveNow();
  return true;
}`,
  names: ['G', 'ls', 'persist'],
  answer: { bug: true, function: 'persist', function_also: ['saveMap'], line_hint: 'if (G.zones.length) saveMap(); saveNow();', what: 'The colony is saved even when the map write failed, because saveMap does not report failure. The colony then exists on disk without a map, so it cannot be placed after a reload and the settlement is lost',
    trigger: 'Storage nearly full: the large map write throws a quota error but the small colony write fits', severity: 'lose-data', fix: 'Make saveMap return true/false and write the colony only if the map saved: if (saveMap()) saveNow();' },
  patch: [['if (!G.zones.length) return;\n  if (!safeWrite(\'map\', JSON.stringify(G.zones))) storeWarn();', 'if (!G.zones.length) return true;\n  if (!safeWrite(\'map\', JSON.stringify(G.zones))) { storeWarn(); return false; }\n  return true;'], ['if (G.zones.length) saveMap();\n  saveNow();', 'if (saveMap()) saveNow();']],
  test: (ns) => { const { G, ls, persist } = ns; G.zones = [{ id: 1, cells: 'x'.repeat(200) }]; G.settlements = [{ id: 1 }]; persist();
    return ls.data.save !== undefined && ls.data.map === undefined; },
},
{
  key: 'orphan', level: 3, source: 'real',
  context: 'Continue: the saved map is loaded first, then each saved settlement is put back on its zone. serialize() builds the next save from whatever settlements are alive in memory. restoreSettlement returns null if the settlement\'s zone is not in the loaded map.',
  snippet: R`const G = { zones: [], settlements: [] };
const zoneById = (id) => G.zones.find((z) => z.id === id);

function restoreSettlement(d) {
  const zone = zoneById(d.zid);
  if (!zone) return null;
  const S = { id: d.id, zid: zone.id, zoneRef: zone, cols: d.cols.slice(), dead: false };
  zone.settled = S;
  G.settlements.push(S);
  return S;
}
function prepareContinue(md, sv) {
  G.zones = md.zones.map((z) => Object.assign({}, z));
  G.settlements = [];
  for (const d of sv.settlements) restoreSettlement(d);
  return true;
}
function serialize() {
  return {
    v: 2,
    settlements: G.settlements.filter((S) => !S.dead && S.zoneRef).map((S) => ({
      id: S.id, zid: S.zid, cols: S.cols,
    })),
  };
}`,
  names: ['G', 'prepareContinue', 'serialize'],
  answer: { bug: true, function: 'prepareContinue', function_also: ['restoreSettlement', 'serialize'], line_hint: 'for (const d of sv.settlements) restoreSettlement(d);', what: 'A saved settlement whose zone is missing from the loaded map is skipped (restoreSettlement returns null and the result is ignored). It is then absent from memory, so the next serialize() writes a save without it and the settlement is permanently lost',
    trigger: 'The saved map lacks a zone that a saved settlement points at (for example the map write failed earlier), then the game loads and saves again', severity: 'lose-data', fix: 'Keep unrestorable saved settlements in G.orphans (if (!restoreSettlement(d)) G.orphans.push(d)) and append G.orphans to the settlements array in serialize()' },
  patch: [['for (const d of sv.settlements) restoreSettlement(d);', 'G.orphans = []; for (const d of sv.settlements) if (!restoreSettlement(d)) G.orphans.push(d);'], ['    })),\n  };', '    })).concat(G.orphans || []),\n  };']],
  test: (ns) => { const { prepareContinue, serialize } = ns;
    prepareContinue({ zones: [{ id: 1 }] }, { settlements: [{ id: 1, zid: 1, cols: ['a'] }, { id: 2, zid: 9, cols: ['b', 'c'] }] });
    return serialize().settlements.length !== 2; },
},
{
  key: 'away', level: 2, source: 'real',
  context: 'The player comes back after being away for secs seconds. The first 24 hours are simulated in detail; any time beyond that is passed to awayDays, a cheap day-level model. The game clock G.simT must end up advanced by the whole time away.',
  snippet: R`const AWAY_MAX = 24 * 3600; // the part that is simulated in detail
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const G = { simT: 0, births: 0 };

function awayDays(secs) {
  const days = Math.min(36500, Math.floor(secs / 86400));
  const out = { days, births: 0 };
  if (days < 1) return out;
  for (let d = 0; d < days; d++) if (d % 3 === 0) out.births++;
  return out;
}
function awaySim(secs) {
  const total = secs;
  secs = clamp(secs, 0, AWAY_MAX);
  const rest = Math.max(0, total - secs);
  const step = 60;
  for (let t = 0; t < secs; t += step) G.simT += step;
  let long = null;
  if (rest >= 86400) {
    long = awayDays(rest);
    G.simT += rest;
  }
  if (long) G.births += long.births;
  return { secs: total, long };
}`,
  names: ['G', 'awaySim'],
  answer: { bug: true, function: 'awaySim', function_also: ['awayDays'], line_hint: 'if (rest >= 86400) {', what: 'Time away beyond the first 24 hours is thrown away unless it is at least a whole day: with 42 hours away, rest is 18 hours, the >= 86400 test fails, and the game clock and day model skip it. awayDays also floors, so a part day counts as zero',
    trigger: 'Player is away for any time over 24 hours that is not a whole number of extra days, such as 42 hours', severity: 'wrong', fix: 'Use if (rest > 0) and round the days in awayDays (Math.round(secs / 86400)); advance G.simT by rest in either case' },
  patch: [['if (rest >= 86400) {', 'if (rest > 0) {'], ['Math.floor(secs / 86400)', 'Math.round(secs / 86400)']],
  test: (ns) => { const { G, awaySim } = ns; awaySim(42 * 3600); return G.simT < 42 * 3600 - 60; },
},
{
  key: 'newroom', level: 3, source: 'real',
  context: 'The player starts a new room. The old room\'s map and colony are dropped from memory, but names the player taught the game carry over. FUN.album holds the colony photo album and visit days; G.tidy counts how much the player has tidied. Both belong to one room\'s colony. funReset() empties the album.',
  snippet: R`const FUN = { album: [], days: [], unl: [] };
const G = {
  settlements: [], zones: [], requests: [], library: [], nextLib: 1, mapName: 'My room',
  tidy: { cleared: 0, objects: 0, tin: 0, settlers: 0 },
};
const ROOMS = [{ id: 'r1', name: 'My room' }];

function funReset() {
  FUN.album = []; FUN.days = []; FUN.unl = [];
}
function homeCreate() {
  if (ROOMS.length >= 8) return null;
  const r = { id: 'r' + (ROOMS.length + 1), name: 'Room ' + (ROOMS.length + 1) };
  ROOMS.push(r);
  return r;
}
function worldDrop() { // the map and colony go from memory
  G.settlements = []; G.zones = []; G.requests = [];
}
function relocNewRoom() {
  const nr = homeCreate();
  if (!nr) return;
  const lib = G.library, nl = G.nextLib;
  worldDrop();
  G.library = lib; G.nextLib = nl;
  G.mapName = nr.name;
}`,
  names: ['FUN', 'G', 'relocNewRoom'],
  answer: { bug: true, function: 'relocNewRoom', line_hint: 'worldDrop();', what: 'The new room inherits the old room\'s album, visit days and tidy statistics because only the map and colony are dropped; funReset() is never called and G.tidy is not reset',
    trigger: 'Player has some album entries and tidy counts, then starts a new room: the new empty colony shows and later saves the old room\'s album and stats', severity: 'wrong', fix: 'Call funReset() and reset G.tidy to zeros alongside worldDrop() in relocNewRoom (and in the room-switch path)' },
  patch: [['  worldDrop();\n  G.library = lib;', '  worldDrop(); funReset(); G.tidy = { cleared: 0, objects: 0, tin: 0, settlers: 0 };\n  G.library = lib;']],
  test: (ns) => { const { FUN, G, relocNewRoom } = ns; FUN.album.push('photo'); G.tidy.cleared = 5; relocNewRoom(); return FUN.album.length > 0 || G.tidy.cleared > 0; },
},
{
  key: 'forget', level: 2, source: 'real',
  context: 'Each save slot keeps the previous good value in a "-bak" slot, and safeRead falls back to it when the main slot is missing or damaged. The Menu has a "Forget the saved map" button, after which the game should have no saved map.',
  snippet: R`const MAP_KEY = 'base-camp-map-v1';
const mem = new Map(); // stand-in for localStorage
const store = {
  get(k) { return mem.has(k) ? mem.get(k) : null; },
  set(k, v) { mem.set(k, String(v)); },
  del(k) { mem.delete(k); },
};
function safeWrite(key, str) {
  const old = store.get(key);
  if (old) store.set(key + '-bak', old);
  store.set(key, str);
  return true;
}
function safeRead(key, ok) { // main slot first, then the backup
  for (const k of [key, key + '-bak']) {
    const raw = store.get(k);
    if (!raw) continue;
    try { const d = JSON.parse(raw); if (ok(d)) return d; } catch (e) { /* try the next slot */ }
  }
  return null;
}
const loadMapData = () => safeRead(MAP_KEY, (d) => d && Array.isArray(d.zones));
function updateTitle() { /* redraws the title card */ }
function forgetSavedMap() {
  store.del(MAP_KEY);
  updateTitle();
}`,
  names: ['safeWrite', 'loadMapData', 'forgetSavedMap', 'MAP_KEY'],
  answer: { bug: true, function: 'forgetSavedMap', line_hint: 'store.del(MAP_KEY);', what: 'Only the main slot is deleted; the "-bak" copy remains, and safeRead falls back to it, so the "forgotten" map comes straight back on the next load',
    trigger: 'Save the map at least twice (so a backup exists), press Forget the saved map, then load: loadMapData still returns the old map', severity: 'wrong', fix: 'Also delete MAP_KEY + "-bak": store.del(MAP_KEY + \'-bak\');' },
  patch: [['store.del(MAP_KEY);\n  updateTitle();', 'store.del(MAP_KEY); store.del(MAP_KEY + \'-bak\');\n  updateTitle();']],
  test: (ns) => { const { safeWrite, loadMapData, forgetSavedMap, MAP_KEY } = ns; safeWrite(MAP_KEY, '{"zones":[1]}'); safeWrite(MAP_KEY, '{"zones":[2]}'); forgetSavedMap(); return loadMapData() !== null; },
},
{
  key: 'battle', level: 3, source: 'real',
  context: 'Battle! can be started from the title screen. A saved colony that is being continued is restored but held (placed = false) until the map is lined up with the real room. The battle needs a colony to fight for: if the player has none, it founds one on the first arena surface. mainSettlement() returns the first settlement that is placed, not awaiting and not lost.',
  snippet: R`const G = { mode: 'practice', holdPlace: false, settlements: [] };

function mainSettlement() {
  return G.settlements.find((S) => S.placed && !S.awaiting && !S.lost) || null;
}
function restoreSaved(n) { // Continue: colonies come back, held until the map is lined up
  G.holdPlace = true;
  for (let i = 1; i <= n; i++) {
    G.settlements.push({ id: i, placed: !G.holdPlace, awaiting: false, lost: false });
  }
}
function settleZone(zone) {
  zone.settled = true;
  G.settlements.push({ id: G.settlements.length + 1, placed: true, awaiting: false, lost: false });
}
function btArenaPick() { return [{ Z: { id: 7, settled: false } }, { Z: { id: 8, settled: false } }]; }

function btBegin(o) {
  const pick2 = btArenaPick();
  if (!pick2) return false;
  if (!mainSettlement() && G.mode === 'practice' && !pick2[0].Z.settled) {
    settleZone(pick2[0].Z); // the practice colony lands on the player's surface
  }
  return true;
}`,
  names: ['G', 'restoreSaved', 'btBegin'],
  answer: { bug: true, function: 'btBegin', line_hint: 'if (!mainSettlement() && G.mode === \'practice\'', what: 'mainSettlement() is null for a restored colony that is still held (placed = false), so the check thinks the player has no colony and founds a second, stray settlement, and the battle reward goes to it',
    trigger: 'Title screen with a saved colony, tap Battle! before the map is lined up', severity: 'wrong', fix: 'Test whether any settlement exists: if (!G.settlements.length && ...)' },
  patch: [['if (!mainSettlement() && G.mode', 'if (!G.settlements.length && G.mode']],
  test: (ns) => { const { G, restoreSaved, btBegin } = ns; restoreSaved(1); btBegin({}); return G.settlements.length !== 1; },
},
];
