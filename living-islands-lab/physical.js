/* THE GIFT, MAKE IT PHYSICAL (Job 5). Loaded on a gift page only (islands_look.html?game=gift); &physical=0 keeps it out and the first day behaves exactly as before. See GIFT_PHYSICAL.md.
   The rule: every change on a counter or a message has a visible, physical cause in the world, and no gate advances on a timer alone. Clocks only add pressure (tide, dusk, weather).
   PART A (pure, no THREE, no DOM, no Math.random, no wall clock): delivery runs and the berth choice, crates and their carry, stock heaps (how many pieces, where), the five builds in stages (units, person-hours,
     what makes a stage advance), the two-handed carry (beam, heavy crate), the robot errand stepper, the day rhythm, the "what is waiting for you" choice, the save. tests/physical-test.js runs it in plain node.
   PART B (THREE + DOM): attach(api) builds the heaps, the staged structures, dust and hammer ticks, the lantern, the marker ring, borrows robots from the camp routine (state 'task'), and wires the hold and tap actions.
   Tone: hopeful. Robots are relics: a plain status light, an arm or a lid, no faces, no speech, no feelings. No person is drawn; people are counted, never tracked. */
(function (root) {
'use strict';
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const hypot = Math.hypot;
function hashI(k, salt) { let h = Math.imul(k | 0, 374761393) + Math.imul(salt | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }

/* ====================================================================== PART A ====================================================================== */
const VERSION = 1;
const HEAP_CAP = 30;                         /* pieces drawn per kind on a full tier (TUNING; ipad 20, AR 10) */
const SPEED = { player: 2.0, robotMax: 0.9 };/* m/s: the player carries briskly; a pair moves at the robot's own pace (TUNING; robot speeds come from the camp routine) */
const HOURS = { stake: 1, unit: 1.5, set: 1, beam: 2 };   /* person-hours: what each physical act adds to the readout (TUNING) */
const HOLD = { stake: 1.0, set: 1.3, lift: 1.2, place: 4.5 };   /* seconds held (a press) or worked (a robot placing) (TUNING) */
/* HOLD FEEDBACK (Job 6c item 4): every hold says what it does BEFORE (the hint line), shows the cause WHILE you hold (a bar with words) and says what happened AFTER (a toast). One table of words. */
const HOLD_WORDS = {
  stake: { before: 'Hold to drive the stakes.', doing: 'Driving the stakes' },
  hold: { before: 'Hold to set this stage.', doing: 'Setting this stage' },
  beam: { before: 'Hold to lift the beam.', doing: 'Lifting the beam with the robot' },
  heavy: { before: 'Hold to lift the crate.', doing: 'Lifting the crate with the robot' },
  crate: { before: 'Hold to carry the crate up.', doing: 'Carrying the crate up' }
};
const STOCK_IDS = ['planks', 'rope', 'glass', 'metal'];
const BUILD_IDS = ['jetty', 'cottage', 'cistern', 'hide', 'kiosk'];
/* which kind goes in first (the structure wants its metal and posts early, its cloth or glass last) */
const KIND_ORDER = { jetty: ['planks', 'rope'], cottage: ['metal', 'planks'], cistern: ['metal', 'planks'], hide: ['planks', 'rope'], kiosk: ['metal', 'planks', 'glass'] };
/* stage 1 = stakes and string ... stage 5 = finished. The five names of each build. */
const STAGE_NAMES = {
  jetty: ['Posts staked and strung', 'Piles driven', 'Stringers laid', 'Planks down', 'Rails and lashings'],
  cottage: ['Stakes and string', 'Foundation stones', 'Timber frame', 'Walls', 'Roof'],
  cistern: ['Stakes and string', 'Base ring', 'Staves and hoops', 'Lining', 'Lid and gutter'],
  hide: ['Stakes and string', 'Footings', 'Frame', 'Screens', 'Roof and slit'],
  kiosk: ['Stakes and string', 'Slab', 'Frame', 'Walls', 'Awning']
};
const BUILD_NAME = { jetty: 'Jetty', cottage: 'Cottage', cistern: 'Rain cistern', hide: 'Wildlife hide', kiosk: 'Kiosk' };
const BEAM_LEN = { jetty: 3.6, cottage: 3.4, cistern: 2.2, hide: 2.6, kiosk: 2.8 };

/* units are split over the four material stages (2 to 5); the remainder goes to the frame and the walls first */
function splitUnits(n) { const base = Math.floor(n / 4), rem = n % 4, out = [base, base, base, base]; [1, 2, 0, 3].slice(0, rem).forEach(i => out[i]++); return out; }
/* the plan of one build from its stock needs: which kind is placed in which stage */
function stagePlan(id, needs) {
  const order = KIND_ORDER[id] || STOCK_IDS, units = []; order.forEach(k => { for (let i = 0; i < (needs[k] || 0); i++) units.push(k); });
  Object.keys(needs).forEach(k => { if (!order.includes(k)) for (let i = 0; i < needs[k]; i++) units.push(k); });
  const cnt = splitUnits(units.length), kinds = []; let p = 0; cnt.forEach(c => { kinds.push(units.slice(p, p + c)); p += c; });
  const hoursTotal = HOURS.stake + units.length * HOURS.unit + 3 * HOURS.set + HOURS.beam;   /* the stakes, every unit placed, three holds (foundation, walls, finish) and one two-handed beam */
  return { id, kinds, need: cnt, total: units.length, hoursTotal, names: STAGE_NAMES[id] || STAGE_NAMES.cottage };
}
const newBuild = id => ({ id, stage: 0, placed: [0, 0, 0, 0], hours: 0, hand: [], beam: null });
const activeIdx = b => (b.stage >= 1 && b.stage <= 4) ? b.stage - 1 : -1;
const isDone = b => b.stage >= 5;
/* the next kind a robot or the player should bring to the site (null when nothing is wanted now) */
function wantUnit(b, plan) { const a = activeIdx(b); if (a < 0) return null; const n = b.placed[a] + b.hand.length; return n < plan.need[a] ? plan.kinds[a][n] : null; }
function takeUnit(b, plan) { const k = wantUnit(b, plan); if (!k) return { ok: false, b }; return { ok: true, kind: k, b: Object.assign({}, b, { hand: b.hand.concat([k]) }) }; }
function placeUnit(b, plan) { const a = activeIdx(b); if (a < 0 || !b.hand.length) return { ok: false, b }; const pl = b.placed.slice(); pl[a]++; return { ok: true, b: Object.assign({}, b, { placed: pl, hand: b.hand.slice(1), hours: b.hours + HOURS.unit }) }; }
function abortUnit(b) { if (!b.hand.length) return { ok: false, b }; return { ok: true, kind: b.hand[b.hand.length - 1], b: Object.assign({}, b, { hand: b.hand.slice(0, -1) }) }; }
/* what a stage needs from a person now: 'stake' (stage 0), 'hold' (hold on the site), 'beam' (the two-handed carry of the frame beam), or null (still waiting for material) */
function needsPlayer(b, plan) {
  if (b.stage === 0) return 'stake'; const a = activeIdx(b); if (a < 0) return null;
  if (b.placed[a] < plan.need[a] || b.hand.length) return null;   /* the material has not all arrived: nothing for the player's hands yet */
  return a === 1 ? 'beam' : 'hold';
}
/* the one way a stage advances: a player act of the right kind. There is no time argument. */
function advance(b, plan, act) {
  const want = needsPlayer(b, plan); if (!want || want !== act) return { ok: false, b };
  if (act === 'stake') return { ok: true, b: Object.assign({}, b, { stage: 1, hours: b.hours + HOURS.stake }) };
  return { ok: true, b: Object.assign({}, b, { stage: b.stage + 1, hours: b.hours + (act === 'beam' ? HOURS.beam : HOURS.set), beam: null }) };
}
/* how much of the structure of stage n (1..5) is drawn: 0..1 */
function drawn(b, plan, n) {
  if (b.stage >= n) return 1; if (n === 1 || b.stage < n - 1) return 0;
  const a = n - 2; return plan.need[a] ? clamp(b.placed[a] / plan.need[a], 0, 1) : 0;
}
function progress(b, plan) {
  const st = clamp(b.stage, 0, 5);
  return { stage: st, name: st === 0 ? 'Marked out on the ground' : plan.names[st - 1], hours: Math.round(b.hours * 10) / 10, hoursTotal: Math.round(plan.hoursTotal * 10) / 10, pct: clamp(b.hours / plan.hoursTotal, 0, 1) };
}

/* ---- stock heaps: the drawn pieces follow the count (monotonic: more stock never shows fewer pieces) ---- */
const heapCap = (tier, ar) => ar ? 10 : tier === 'low' ? 20 : HEAP_CAP;
const heapPieces = (count, cap) => count <= 0 ? 0 : Math.min(cap || HEAP_CAP, Math.round(count));
const heapScale = (count, cap) => 1 + .5 * clamp((count - (cap || HEAP_CAP)) / 30, 0, 1);
/* where piece i of a heap lies, in the heap's own frame (metres; y up). A stack for planks, coils of rope in a mound, bottles in a heap, drums in a mound. Deterministic. */
function heapSlot(kind, i) {
  const j = (hashI(i, kind.length * 7 + kind.charCodeAt(0)) - .5), j2 = (hashI(i, 91 + kind.charCodeAt(1)) - .5);
  if (kind === 'planks') { const col = i % 5, lay = Math.floor(i / 5); return { x: (col - 2) * .24 + j * .04, y: .05 + lay * .105, z: j2 * .16 + (lay % 2 ? .06 : -.06), yaw: j * .25 + (lay % 2 ? .1 : 0), tilt: 0, s: 1 }; }
  if (kind === 'rope') { const col = i % 4, lay = Math.floor(i / 4); return { x: (col - 1.5) * .46 + (lay % 2) * .2 + j * .06, y: .1 + lay * .15, z: j2 * .2, yaw: j * 2, tilt: 0, s: 1 }; }
  if (kind === 'glass') { const rg = Math.floor((Math.sqrt(8 * i + 1) - 1) / 2), col = i - rg * (rg + 1) / 2; return { x: (col - rg / 2) * .3 + j * .05, y: .13 + (4 - Math.min(rg, 4)) * .02 + (i > 14 ? .22 : 0), z: j2 * .3, yaw: j * 6, tilt: j * .8, s: 1 }; }
  /* metal: drums, tins */ const col = i % 5, lay = Math.floor(i / 5); return { x: (col - 2) * .42 + (lay % 2) * .2 + j * .05, y: .24 + lay * .45, z: j2 * .22 + (lay % 2 ? .2 : -.1), yaw: j * 3, tilt: 0, s: 1 };
}

/* ---- deliveries ---- */
/* the berth: the default landing, then a second one along the beach; when the player's boat is in the way of both, the tender waits offshore (queue). Pure. */
function berthFor(player, A, B, clear) {
  const near = (p, q, r) => !!p && hypot(p.x - q.x, p.z - q.z) < r, r = clear || 7;
  if (!near(player, A, r)) return { berth: 'A', hold: false };
  if (!near(player, B, r)) return { berth: 'B', hold: false };
  return { berth: null, hold: true };
}
/* crates stand in a row at the yard: slot k of a row that starts at pad and runs along the tangent (tx, tz) */
const crateSlot = (pad, tan, k) => ({ x: pad.x + tan[0] * (k % 6) * 1.5 - tan[1] * Math.floor(k / 6) * 1.6, z: pad.z + tan[1] * (k % 6) * 1.5 + tan[0] * Math.floor(k / 6) * 1.6 });
/* a delivery run: a boat comes in (in), waits at the berth until every crate is off (dock), and leaves (out). It never leaves while a crate is aboard. */
const newRun = (crates, berth) => ({ phase: 'in', t: 0, crates: crates.slice(), berth: berth || 'A', hold: false, aboard: crates.length });
function runStep(r, dt, o) {   /* o = { sail: seconds an approach takes, aboard: crates still on deck now, blocked: the berth is blocked, leave: seconds a departure takes } */
  const sail = o.sail || 14, leave = o.leave || 12; r = Object.assign({}, r); r.t += dt;
  if (r.phase === 'in') { r.hold = !!o.blocked && r.t >= sail * .7; if (r.hold) { r.t = sail * .7; } else if (r.t >= sail) { r.phase = 'dock'; r.t = 0; r.hold = false; } }
  else if (r.phase === 'dock') { r.aboard = o.aboard; if (o.aboard <= 0) { r.phase = 'out'; r.t = 0; } }
  else if (r.phase === 'out') { if (r.t >= leave) { r.phase = 'gone'; r.t = 0; } }
  return r;
}
/* the position of the boat along its way as 0..1 (0 = far out, 1 = at the berth) */
const runK = (r, o) => r.phase === 'in' ? clamp(r.t / ((o && o.sail) || 14), 0, 1) : r.phase === 'dock' ? 1 : r.phase === 'out' ? 1 - clamp(r.t / ((o && o.leave) || 12), 0, 1) : 0;

/* ---- carrying: a path walked by distance. A light crate (one pair of hands), a heavy crate or a long beam (two pairs: a person and a robot). ---- */
function pathLen(path) { let L = 0; for (let i = 1; i < path.length; i++) L += hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z); return L; }
function pathAt(path, d) {
  let acc = 0; for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i], L = hypot(b.x - a.x, b.z - a.z); if (d <= acc + L || i === path.length - 1) { const k = L > 1e-6 ? clamp((d - acc) / L, 0, 1) : 1; return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, yaw: Math.atan2(b.x - a.x, b.z - a.z) }; } acc += L; }
  const p = path[path.length - 1]; return { x: p.x, z: p.z, yaw: 0 };
}
const carryNew = (kind, path, vRobot) => ({ kind, path, total: pathLen(path), d: 0, phase: 'wait', needRobot: kind === 'beam' || kind === 'heavy', vRobot: vRobot || SPEED.robotMax, moving: false });
/* inp: { hold, auto, robotAt }. The carry moves only while a person holds (or has pressed "walk it up") and, for two-handed work, only while the robot is at its end. No time alone moves it. */
function carryStep(c, inp, dt) {
  if (c.phase === 'placed') return c; c = Object.assign({}, c);
  const go = !!(inp.hold || inp.auto) && (!c.needRobot || !!inp.robotAt);
  if (!go) { c.moving = false; return c; }
  const v = c.needRobot ? Math.min(SPEED.player, c.vRobot) : SPEED.player; c.d = Math.min(c.total, c.d + v * dt); c.moving = true; c.phase = 'carry';
  if (c.d >= c.total - 1e-6) { c.phase = 'placed'; c.moving = false; } return c;
}
/* the two ends of a long piece: A is the person's, B is the robot's */
function beamEnds(pos, yaw, len) { const sx = Math.sin(yaw), sz = Math.cos(yaw); return { A: { x: pos.x + sx * len / 2, z: pos.z + sz * len / 2 }, B: { x: pos.x - sx * len / 2, z: pos.z - sz * len / 2 } }; }

/* ---- the robot errand: legs walked at the robot's own speed, with a pause at some of them (lift, place, drop) ---- */
function errandNew(x, z, legs, v) { return { x, z, yaw: 0, v, legs: legs.slice(), i: 0, t: 0, moving: false, working: false, done: false }; }
function errandStep(e, dt) {
  e = Object.assign({}, e); const ev = []; e.moving = false; e.working = false;
  while (dt > 1e-9 && e.i < e.legs.length) {
    const L = e.legs[e.i], dx = L.x - e.x, dz = L.z - e.z, d = hypot(dx, dz);
    if (d > 1e-6) { const step = e.v * dt; e.yaw = Math.atan2(dx, dz); e.moving = true; if (step >= d) { e.x = L.x; e.z = L.z; dt -= d / e.v; } else { e.x += dx / d * step; e.z += dz / d * step; dt = 0; } if (e.x !== L.x || e.z !== L.z) continue; }
    if (L.act) { if (L.yaw !== undefined) e.yaw = L.yaw; e.working = true; e.moving = false; const need = L.dur || 1; if (e.t + dt < need) { e.t += dt; dt = 0; break; } dt -= (need - e.t); e.t = 0; ev.push(L.act); }
    e.i++; e.t = 0;
  }
  if (e.i >= e.legs.length) { e.done = true; e.moving = false; e.working = false; ev.push('done'); } e.ev = ev; return e;
}

/* ---- the day rhythm: from the sun's elevation (degrees) ---- */
function rhythm(elev, hour) { if (elev < -3) return 'night'; if (elev < 8) return (hour !== undefined && hour < 12) ? 'dawn' : 'dusk'; return 'day'; }
const lightsOn = ph => ph === 'night' || ph === 'dusk';
const robotsOut = ph => ph === 'day' || ph === 'dawn';   /* the camp routine sends them home at night and in rain; this names the picture a test expects */

/* ---- what is waiting for you: one thing at a time, never a list ---- */
function nextNeed(f) {
  if (f.partCarried && f.waitRobot) return { kind: 'fit', at: 'robot' };
  if (f.heavyReady) return { kind: 'heavy', at: 'crateA' };
  if (f.crateAfloat) return { kind: 'crate', at: 'crate' };
  if (f.crateShut) return { kind: 'open', at: 'crate' };
  if (f.partsLeft && f.waitRobot && !f.partCarried) return { kind: 'part', at: 'part' };
  if (f.siteWants === 'beam' && f.beamPhase) return { kind: 'beam', at: f.beamPhase === 'wait' ? 'beam' : 'beamA' };
  if (f.siteWants === 'stake' || f.siteWants === 'hold') return { kind: f.siteWants, at: 'site' };
  if (f.lanternUnlit && f.dusk) return { kind: 'lantern', at: 'lantern' };
  if (f.robotNoOrder) return { kind: 'order', at: 'robot' };
  return null;
}

/* ---- the save: a small sanitised object under s.phys. A unit in a robot's hand goes back to the stock on load (nothing is lost or made). ---- */
function sanitize(o) {
  if (!o || typeof o !== 'object' || o.v !== VERSION) return null;
  const num = (v, d, lo, hi) => typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : d;
  const out = { v: VERSION, crates: [], b: null, partCarried: o.partCarried === true, lantern: o.lantern === true, queue: 0, op: null, q: BUILD_IDS.includes(o.q) && o.q !== 'jetty' ? o.q : null };
  if (o.op && typeof o.op === 'object' && Array.isArray(o.op.floats)) out.op = { on: o.op.on === true, floats: o.op.floats.slice(0, 12).filter(f => f && STOCK_IDS.includes(f.kind)).map((f, i) => ({ id: i, kind: f.kind, x: num(f.x, 0, -1e4, 1e4), z: num(f.z, 0, -1e4, 1e4), gone: f.gone === true })) };
  if (Array.isArray(o.crates)) out.crates = o.crates.slice(0, 40).filter(c => c && Number.isFinite(c.n)).map(c => ({ n: Math.round(c.n), st: ['boat', 'beach', 'yard'].includes(c.st) ? c.st : 'yard', x: num(c.x, 0, -1e4, 1e4), z: num(c.z, 0, -1e4, 1e4), shut: c.shut === true }));
  const b = o.b;
  if (b && typeof b === 'object' && BUILD_IDS.includes(b.id)) out.b = { id: b.id, stage: Math.round(num(b.stage, 0, 0, 5)), placed: [0, 1, 2, 3].map(i => Math.round(num(Array.isArray(b.placed) ? b.placed[i] : 0, 0, 0, 40))), hours: num(b.hours, 0, 0, 999),
    hand: (Array.isArray(b.hand) ? b.hand : []).filter(k => STOCK_IDS.includes(k)).slice(0, 4), beam: null };
  return out;
}
/* the stock after load: every unit that was in a hand goes back on the heap */
function restoreStock(stock, phys) { const st = Object.assign({}, stock); if (phys && phys.b) phys.b.hand.forEach(k => { st[k] = (st[k] || 0) + 1; }); if (phys && phys.b) phys.b.hand = []; return st; }

const CORE = { VERSION, HEAP_CAP, SPEED, HOURS, HOLD, STOCK_IDS, BUILD_IDS, KIND_ORDER, STAGE_NAMES, BUILD_NAME, BEAM_LEN, splitUnits, stagePlan, newBuild, activeIdx, isDone, wantUnit, takeUnit, placeUnit, abortUnit, needsPlayer, advance, drawn, progress,
  heapCap, heapPieces, heapScale, heapSlot, berthFor, crateSlot, newRun, runStep, runK, pathLen, pathAt, carryNew, carryStep, beamEnds, errandNew, errandStep, rhythm, lightsOn, robotsOut, nextNeed, sanitize, restoreStock, hashI };
if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
root.LI_PHYS = root.LI_PHYS || {}; root.LI_PHYS.core = CORE; Object.assign(root.LI_PHYS, { sanitize, restoreStock });
if (typeof window === 'undefined' || typeof document === 'undefined') return;
const Q0 = new URLSearchParams(location.search);
if (Q0.get('game') !== 'gift' || Q0.get('physical') === '0') { root.LI_PHYS.attach = function () { return null; }; return; }
/* ====================================================================== PART B: the page layer ====================================================================== */
let A = null, T = null, C = null;
const P = { run: null, carry: null, lids: [], arr: null, on: false, ph: null, err: {}, act: null, holdId: null, ptr: null, swallow: 0, L: null, V: null, t: 0, anim: [], puffs: [], sig: {}, shownPieces: {}, beam: null, ready: false, errs: [], dirty: false, mk: null, phase: 'day', structSig: null, dockOpen0: 4 };
const SOFT = (f, tag) => { try { return f(); } catch (e) { if (P.errs.length < 30) P.errs.push(tag + ' ' + e.message); return undefined; } };
const rt = () => { try { return C.li().campstart.rt(); } catch (e) { return null; } };
const simR = () => { const r = rt(); try { return r && r.sim(); } catch (e) { return null; } };
const LC = () => root.LI_CAMP;
const CG = () => root.LI_GIFT.core;
const fam = id => CG().BUILD_NEEDS[id];
const stockOf = () => A.S().stock;
const lite = () => A.isAR() || (() => { try { return C.li().ultra.tier() === 'low'; } catch (e) { return false; } })();
const clampTo = clamp;
const gy = (x, z) => A.groundY(x, z);
const dst = (a, b) => hypot(a.x - b.x, a.z - b.z);
const ph = () => P.ph;
const KINDS = STOCK_IDS;
const planFor = id => stagePlan(id, fam(id));

/* ---- layout: where the stores, the crate row and the dock stand. Found once by scan, clear of the robots' own paths. ---- */
function segDist(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; let k = L2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / L2 : 0; k = clamp(k, 0, 1); return hypot(px - (ax + dx * k), pz - (az + dz * k)); }
function dockInfo() {   /* the repair jetty's frame: local x runs along the deck from the land out to sea */
  let J = null; try { J = C.li().repair.site(); } catch (e) { J = null; } if (!J) return null; const c = Math.cos(J.psi), s = Math.sin(J.psi), W = (lx, lz) => ({ x: J.ox + lx * c + lz * s, z: J.oz - lx * s + lz * c });
  return { ox: J.ox, oz: J.oz, psi: J.psi, W, root: W(-1.2, 0), mid: W(2.2, 0), tip: W(4.2, 0), stand: [W(1.2, 1.5), W(2.8, 1.5)], tools: W(-.2, -1.6) };
}
function layout() {
  if (P.L) { if (!P.L.dock) P.L.dock = dockInfo(); return P.L; } const r = rt(), S = A.spots(); if (!r || !S || !r.ready()) return null; let Y; try { Y = r.yard(); } catch (e) { return null; } if (!Y || !Y.points) return null;
  const sim = r.sim(), YP = Y.points, tw = (lx, lz) => LC().toWorld(Y, lx, lz), post = tw(3.4, 2.3), ap = YP.apron, segs = [];
  YP.bays.forEach(b => segs.push([b.fx, b.fz, ap.x, ap.z])); YP.drops.forEach(d => segs.push([ap.x, ap.z, d.x, d.z]));
  (sim.pl.work || []).forEach(w => { let p = [ap.x, ap.z]; (w.via || []).concat([[w.x, w.z]]).forEach(q => { segs.push([p[0], p[1], q[0], q[1]]); p = q; }); });
  const corr = (x, z, w) => segs.some(s => segDist(x, z, s[0], s[1], s[2], s[3]) < w);
  const okAt = (x, z, rad, cw) => { const h = A.H(x, z); return h > 1.1 && h < 4.5 && A.slope(x, z) < .3 && A.free(x, z, rad) && !corr(x, z, cw) && LC().rectDist(Y, x, z) > .6; };
  const stores = [];
  for (let pass = 0; pass < 3 && stores.length < 4; pass++) {
    const cands = []; for (let lx = -16; lx <= 16; lx += 1) for (let lz = -2; lz <= 10; lz += 1) { const p = tw(lx, lz); if (okAt(p[0], p[1], 1.4 - pass * .3, 2.2 - pass * .5)) cands.push({ x: p[0], z: p[1], d: hypot(p[0] - post[0], p[1] - post[1]) }); }
    cands.sort((a, b) => a.d - b.d); for (const c of cands) { if (stores.length >= 4) break; if (stores.every(s => dst(s, c) > 3.0 - pass * .6)) stores.push({ x: c.x, z: c.z }); }
  }
  while (stores.length < 4) stores.push({ x: post[0] + 3 + stores.length * 2.5, z: post[1] + 3 });
  const tan = C.W.camp.rt, td = S.tender, base = { x: Y.x * .55 + td.drop.x * .45, z: Y.z * .55 + td.drop.z * .45 };
  let pad = null, bs = 1e9; for (let dx = -10; dx <= 10; dx += 1.5) for (let dz = -10; dz <= 10; dz += 1.5) { const x = base.x + dx, z = base.z + dz; let good = true; for (let k = 0; k < 6 && good; k++) { const sx = x + tan[0] * k * 1.5, sz = z + tan[1] * k * 1.5; if (!okAt(sx, sz, 1.0, 1.6) || stores.some(q => hypot(q.x - sx, q.z - sz) < 2.4)) good = false; } if (good) { const sc = hypot(dx, dz); if (sc < bs) { bs = sc; pad = { x, z }; } } }
  if (!pad) pad = { x: base.x, z: base.z };
  const dock = dockInfo();
  P.L = { Y, YP, post: { x: post[0], z: post[1] }, stores, pad, tan, dock, tw }; return P.L;
}
const storeOf = kind => layout().stores[KINDS.indexOf(kind)];
/* the site of a build and where a robot stands to place */
function siteOf(id) {
  const L = layout(), S = A.spots(); if (id === 'jetty') return L.dock && { x: L.dock.mid.x, z: L.dock.mid.z, yaw: L.dock.psi, stand: L.dock.stand[0], mark: L.dock.mid };
  const p = S.build[id]; if (!p) return null; const yaw = S.hutYaw + .3; return { x: p.x, z: p.z, yaw, stand: { x: p.x - Math.sin(yaw + .6) * 3.2, z: p.z - Math.cos(yaw + .6) * 3.2 }, mark: { x: p.x, z: p.z } };
}

/* ---- the visual kit: every piece of a kind is one InstancedMesh ---- */
function mat(col, o) { return new T.MeshStandardMaterial(Object.assign({ color: new T.Color(col).convertSRGBToLinear(), roughness: .85, metalness: .02, flatShading: true }, o || {})); }   /* hex colours are sRGB: converted to the linear working space, or every piece draws pale and washed (the old pictures) */
function inst(geo, m, n, shadow) { const im = new T.InstancedMesh(geo, m, n); im.frustumCulled = false; im.castShadow = !!shadow; im.receiveShadow = true; im.setColorAt(0, new T.Color(1, 1, 1)); im.count = 0; return im; }   /* the colour buffer is sized from count, so it is made before count is set to 0 */
let _q, _e, _m, _s, _p, _c;   /* scratch objects, made when three.js is there (this file loads before it) */
function scratch() { _q = new T.Quaternion(); _e = new T.Euler(); _m = new T.Matrix4(); _s = new T.Vector3(); _p = new T.Vector3(); _c = new T.Color(); }
function setI(im, i, x, y, z, sx, sy, sz, ry, rx, rz, col) { _e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz); _m.compose(_p, _q, _s); im.setMatrixAt(i, _m); if (col !== undefined) im.setColorAt(i, _c.setHex(col).convertSRGBToLinear()); }
const PIECE_COL = { planks: [0xa88a5c, 0x9a7448, 0xb59868], rope: [0xb19a6b, 0xa68f60, 0xc2ad7c], glass: [0x58b8a4, 0x6fb9a8, 0x4aa38f], metal: [0x8d9291, 0x7b8180, 0x9a6a4a] };
function buildKit() {
  if (P.V) return P.V; const cap = heapCap(lite() ? 'low' : 'high', A.isAR()), V = P.V = { cap, heaps: {}, group: new T.Group() }; V.group.name = 'physical'; A.groot().add(V.group);
  const geos = { planks: new T.BoxGeometry(1.4, .08, .2), rope: new T.TorusGeometry(.2, .07, 5, 8), glass: new T.CylinderGeometry(.09, .09, .32, 6), metal: new T.CylinderGeometry(.24, .24, .44, 8) };
  for (const k of KINDS) { const im = inst(geos[k], mat(0xffffff), 32, !lite()); V.group.add(im); V.heaps[k] = im; }
  V.stage = inst(new T.BoxGeometry(1, 1, 1), mat(0xffffff), 80, !lite()); V.group.add(V.stage);
  V.loads = inst(new T.BoxGeometry(.5, .28, .34), mat(0xffffff), 6, false); V.group.add(V.loads);
  V.floats = inst(new T.BoxGeometry(1.5, .12, .24), mat(0xffffff), 8, false); V.group.add(V.floats);
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(new Float32Array(8 * 3), 3)); V.stringsGeo = sg; V.strings = new T.LineSegments(sg, new T.LineBasicMaterial({ color: 0xf1e7c8 })); V.strings.frustumCulled = false; sg.setDrawRange(0, 0); V.group.add(V.strings);
  V.beam = new T.Mesh(new T.BoxGeometry(1, .13, .22), mat(0xa88a5c)); V.beam.visible = false; V.beam.castShadow = !lite(); V.group.add(V.beam);
  V.ghost = new T.Mesh(new T.BoxGeometry(1, .13, .22), new T.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: .35, depthTest: false })); V.ghost.visible = false; V.ghost.renderOrder = 17; V.group.add(V.ghost);
  /* the marker: a thin gold ring with a soft glow (targets/look/07_First_day.jpg); ring[0] is the line, ring[1] the glow (additive, a canvas ring texture) */
  V.ring = []; { const r0 = new T.Mesh(new T.RingGeometry(.965, 1.0, 64), new T.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0, depthTest: false, side: T.DoubleSide })); r0.rotation.x = -Math.PI / 2; r0.renderOrder = 21; r0.visible = false; V.group.add(r0); V.ring.push(r0);
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const cx = cv.getContext('2d'), gr = cx.createRadialGradient(64, 64, 34, 64, 64, 62); gr.addColorStop(0, 'rgba(255,200,70,0)'); gr.addColorStop(.62, 'rgba(255,205,80,.75)'); gr.addColorStop(.8, 'rgba(255,190,60,.25)'); gr.addColorStop(1, 'rgba(255,190,60,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
    const tx = new T.CanvasTexture(cv), r1 = new T.Mesh(new T.PlaneGeometry(2.7, 2.7), new T.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: T.AdditiveBlending })); r1.rotation.x = -Math.PI / 2; r1.renderOrder = 20; r1.visible = false; V.group.add(r1); V.ring.push(r1); }
  V.tools = new T.Group(); const tm = mat(0x6b5a44), tm2 = mat(0x8d9291, { metalness: .4 }); [[.5, .2, .3, 0, .1, 0, tm], [.7, .08, .12, .2, .3, .1, tm2], [.12, .5, .12, -.3, .3, .1, tm], [.4, .3, .4, .4, .15, -.3, tm]].forEach(a => { const m = new T.Mesh(new T.BoxGeometry(a[0], a[1], a[2]), a[6]); m.position.set(a[3], a[4], a[5]); m.rotation.y = a[3] * 3; V.tools.add(m); }); V.tools.visible = false; V.group.add(V.tools);
  V.lantern = new T.Group(); { const lm = new T.Mesh(new T.BoxGeometry(.22, .3, .22), new T.MeshBasicMaterial({ color: 0x4a4030 })); V.lantern.add(lm); const cp = new T.Mesh(new T.ConeGeometry(.2, .14, 4), mat(0x3a3028)); cp.position.y = .22; cp.rotation.y = .78; V.lantern.add(cp); V.lantern.userData.body = lm; V.group.add(V.lantern); }
  const N = 72, mkPts = (n, add) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('aSize', new T.BufferAttribute(new Float32Array(n), 1)); g.setAttribute('aA', new T.BufferAttribute(new Float32Array(n), 1)); g.setAttribute('aCol', new T.BufferAttribute(new Float32Array(n * 3), 3)); g.setDrawRange(0, 0);
    const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: add ? T.AdditiveBlending : T.NormalBlending, uniforms: { uScale: { value: 400 } },
      vertexShader: 'attribute float aSize; attribute float aA; attribute vec3 aCol; uniform float uScale; varying float vA; varying vec3 vC; void main(){ vA=aA; vC=aCol; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=aSize*uScale/max(.1,-mv.z); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'varying float vA; varying vec3 vC; void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; gl_FragColor=vec4(vC, vA*smoothstep(.5,.15,d)); }' });
    const pt = new T.Points(g, m); pt.frustumCulled = false; V.group.add(pt); return pt; };
  V.dust = mkPts(N, false); V.dust.renderOrder = 15; V.glow = mkPts(8, true); V.glow.renderOrder = 16;
  return V;
}
function puff(x, y, z, n, kind) { for (let i = 0; i < n; i++) P.puffs.push({ x: x + Math.sin(P.t * 7 + i * 2.1) * .35, y, z: z + Math.cos(P.t * 5 + i * 1.7) * .35, vx: Math.sin(i * 2.3 + P.t) * .3, vz: Math.cos(i * 1.9 + P.t) * .3, vy: kind === 'tick' ? .5 + (i % 3) * .2 : .35, age: 0, life: kind === 'tick' ? .35 : 1.1, size: kind === 'tick' ? .22 : .55, kind }); if (P.puffs.length > 70) P.puffs.splice(0, P.puffs.length - 70); }
function dustTick(dt) {
  const V = P.V; if (!V) return; const g = V.dust.geometry, pos = g.attributes.position.array, sz = g.attributes.aSize.array, al = g.attributes.aA.array, co = g.attributes.aCol.array;
  P.puffs = P.puffs.filter(p => (p.age += dt) < p.life); let i = 0;
  for (const p of P.puffs) { const k = p.age / p.life; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt * (1 - k); pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; sz[i] = p.size * (p.kind === 'tick' ? 1 - .5 * k : 1 + 1.3 * k); al[i] = (p.kind === 'tick' ? 1 : .5) * (1 - k); if (p.kind === 'tick') { co[i * 3] = 1; co[i * 3 + 1] = .95; co[i * 3 + 2] = .7; } else { co[i * 3] = .78; co[i * 3 + 1] = .7; co[i * 3 + 2] = .55; } i++; }
  g.setDrawRange(0, i); g.attributes.position.needsUpdate = g.attributes.aSize.needsUpdate = g.attributes.aA.needsUpdate = g.attributes.aCol.needsUpdate = true;
  try { const h = C.renderer.domElement.height, fov = C.camera.fov * Math.PI / 180, sc = h / (2 * Math.tan(fov / 2)); V.dust.material.uniforms.uScale.value = sc; V.glow.material.uniforms.uScale.value = sc; } catch (e) { /* default scale */ }
}

/* ---- stock heaps: the drawn pieces follow the stock; new pieces fall in one after another ---- */
function heapsTick(dt) {
  const V = P.V, L = layout(); if (!V || !L) return; const st = stockOf(), yaw = Math.atan2(L.tan[0], L.tan[1]) + 1.57, cy = Math.cos(yaw), sy = Math.sin(yaw);
  KINDS.forEach((k, ki) => {
    const im = V.heaps[k], cnt = st[k] || 0, np = heapPieces(cnt, V.cap), sc = heapScale(cnt, V.cap), base = L.stores[ki], prev = P.shownPieces[k] || 0, gH = gy(base.x, base.z);
    if (np > prev) for (let i = prev; i < np; i++) P.anim.push({ k, i, t: -(i - prev) * .18 });
    if (np < prev) P.anim = P.anim.filter(a => !(a.k === k && a.i >= np)); P.shownPieces[k] = np;
    const falling = P.anim.some(a => a.k === k), sig = np + ':' + sc.toFixed(2); if (!falling && P.sig[k] === sig && im.count === np) return; P.sig[k] = sig;
    im.count = np;
    for (let i = 0; i < np; i++) { const s = heapSlot(k, i), a = P.anim.find(q => q.k === k && q.i === i); let fall = 0, away = 0; if (a) { fall = (1 - clamp(a.t, 0, .5) / .5) ** 2 * 1.6; if (a.t < 0) away = -60; }
      const lx = s.x * sc, lz = s.z * sc, x = base.x + lx * cy + lz * sy, z = base.z - lx * sy + lz * cy; setI(im, i, x, gH + s.y * sc + fall + away, z, sc, sc, sc, yaw + s.yaw, 0, k === 'glass' ? Math.PI / 2 + s.tilt : 0, PIECE_COL[k][i % 3]); }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });
  P.anim.forEach(a => { const was = a.t; a.t += dt; if (was < 0 && a.t >= 0) { const b = L.stores[KINDS.indexOf(a.k)]; puff(b.x, gy(b.x, b.z) + .2, b.z, 3, 'dust'); } });
  if (P.anim.some(a => a.t >= .5)) { P.anim = P.anim.filter(a => a.t < .5); P.sig = {}; }
}

/* ---- the structures: stage pieces for every build but the jetty (the jetty shows its real planks) ---- */
const COLS = { stake: 0xd9c9a0, stone: 0x8a8a84, wood: 0x9a7448, wall: { cottage: 0xd8c9a8, kiosk: 0xe0b86a, hide: 0x7d6a4a, cistern: 0x8a9aa0 }, roof: { cottage: 0x8a3f33, kiosk: 0x3f7fb2, hide: 0x4a3f2c, cistern: 0x6e7a80 } };
function piecesFor(id) {   /* local frame: x across, z along. stage 1 stakes; 2 foundation; 3 frame; 4 walls; 5 roof or finish */
  const B = (x, y, z, sx, sy, sz, ry, col, rz) => ({ x, y, z, sx, sy, sz, ry: ry || 0, col, rz: rz || 0 }), out = { 1: [], 2: [], 3: [], 4: [], 5: [], strings: [] };
  const dims = { cottage: [4.4, 3.2, 2.4], kiosk: [2.8, 2.4, 2.2], hide: [3.4, 1.8, 1.8], cistern: [3, 3, 2.2] }[id] || [4, 3, 2.4], w = dims[0], d = dims[1], h = dims[2];
  const cs = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
  cs.forEach(c => out[1].push(B(c[0], .45, c[1], .08, .9, .08, 0, COLS.stake))); for (let i = 0; i < 4; i++) { const a = cs[i], b = cs[(i + 1) % 4]; out.strings.push([a[0], .8, a[1], b[0], .8, b[1]]); }
  if (id === 'cistern') {
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; out[2].push(B(Math.cos(a) * 1.3, .15, Math.sin(a) * 1.3, .5, .3, .5, -a, COLS.stone)); out[3].push(B(Math.cos(a) * 1.3, h / 2, Math.sin(a) * 1.3, .1, h, .45, -a, COLS.wood)); out[4].push(B(Math.cos(a) * 1.22, h / 2, Math.sin(a) * 1.22, .08, h * .9, .62, -a, COLS.wall.cistern)); }
    out[5].push(B(0, h + .06, 0, 2.7, .12, 2.7, .4, COLS.roof.cistern)); out[5].push(B(1.5, h * .8, 0, .9, .1, .2, 0, COLS.roof.cistern, -.5));
  } else {
    for (let i = 0; i < 6; i++) { const a = cs[i % 4], mx = i < 4 ? a[0] : 0, mz = i < 4 ? a[1] : (i === 4 ? -d / 2 : d / 2); out[2].push(B(mx, .15, mz, .55, .3, .55, i * .3, COLS.stone)); }
    cs.forEach(c => out[3].push(B(c[0] * .98, h / 2, c[1] * .98, .2, h, .2, 0, COLS.wood))); out[3].push(B(0, h, -d / 2, w, .15, .18, 0, COLS.wood), B(0, h, d / 2, w, .15, .18, 0, COLS.wood), B(-w / 2, h, 0, .18, .15, d, 0, COLS.wood), B(w / 2, h, 0, .18, .15, d, 0, COLS.wood));
    const wc = COLS.wall[id] || COLS.wall.cottage; out[4].push(B(0, h / 2, -d / 2, w, h * .95, .1, 0, wc), B(-w / 2, h / 2, 0, .1, h * .95, d, 0, wc), B(w / 2, h / 2, 0, .1, h * .95, d, 0, wc), B(-w / 4 - .2, h / 2, d / 2, w / 2 - .5, h * .95, .1, 0, wc), B(w / 4 + .5, h / 2, d / 2, w / 2 - .9, h * .95, .1, 0, wc));
    const rc = COLS.roof[id] || COLS.roof.cottage; out[5].push(B(0, h + .55, -d / 4, w + .5, .1, d * .62, 0, rc, -.45), B(0, h + .55, d / 4, w + .5, .1, d * .62, 0, rc, .45));
  }
  return out;
}
const PIECE_CACHE = {};
function structureTick() {
  const V = P.V; if (!V) return; const b = ph().b, S = A.spots(), s = A.S(); let id = null, bb = null, plan = null;
  if (b && b.id !== 'jetty') { id = b.id; bb = b; } else if (!b && s.build && s.build !== 'jetty') { id = s.build; bb = Object.assign(newBuild(id), { stage: 5 }); }
  const sig = id ? id + ':' + bb.stage + ':' + bb.placed.join(',') : '-'; if (sig === P.structSig) return; P.structSig = sig;
  if (!id) { V.stage.count = 0; V.stringsGeo.setDrawRange(0, 0); return; }
  plan = planFor(id); const pc = PIECE_CACHE[id] || (PIECE_CACHE[id] = piecesFor(id)), site = siteOf(id), p = S.build[id]; if (!p) return; const yaw = site.yaw, cy = Math.cos(yaw), sy = Math.sin(yaw), gH = gy(p.x, p.z); let n = 0;
  for (let st = 1; st <= 5; st++) { const f = st === 1 ? (bb.stage >= 1 ? 1 : 0) : drawn(bb, plan, st), k = Math.ceil(pc[st].length * f - 1e-9);
    for (let i = 0; i < k && n < 80; i++) { const q = pc[st][i], x = p.x + q.x * cy + q.z * sy, z = p.z - q.x * sy + q.z * cy; setI(V.stage, n++, x, gH + q.y, z, q.sx, q.sy, q.sz, yaw + q.ry, 0, q.rz, q.col + (i % 3) * 0x010101); } }
  V.stage.count = n; V.stage.instanceMatrix.needsUpdate = true; if (V.stage.instanceColor) V.stage.instanceColor.needsUpdate = true;
  const sp = V.stringsGeo.attributes.position.array; let m = 0; if (bb.stage >= 1) pc.strings.forEach(l => { sp.set([p.x + l[0] * cy + l[2] * sy, gH + l[1], p.z - l[0] * sy + l[2] * cy], m * 3); sp.set([p.x + l[3] * cy + l[5] * sy, gH + l[4], p.z - l[3] * sy + l[5] * cy], (m + 1) * 3); m += 2; });
  V.stringsGeo.attributes.position.needsUpdate = true; V.stringsGeo.setDrawRange(0, bb.stage >= 1 && bb.stage < 5 ? m : 0);
}

/* ---- the dock (the jetty): its real planks, fitted a few at a time ---- */
function fitPlanks(n) {
  const rp = C.li().repair; if (!rp || !n) return 0; let done = 0; const J = layout().dock;
  try { const socks = rp.sockets().filter(q => !q.filled && q.kind === 'plank').sort((a, b) => hypot(a.p[0] - J.ox, a.p[2] - J.oz) - hypot(b.p[0] - J.ox, b.p[2] - J.oz)), bodies = rp.bodies().filter(b => b.kind === 'plank' && b.state === 'dyn' && !b.lost);
    for (let i = 0; i < Math.min(n, socks.length, bodies.length); i++) { rp.teleport(bodies[i].id, socks[i].p.slice()); rp.fit(bodies[i].id); done++; } rp.step(30); } catch (e) { P.errs.push('fit ' + e.message); }
  return done;
}
const openSockets = () => { try { return C.li().repair.sockets().filter(q => !q.filled && q.kind === 'plank').length; } catch (e) { return 0; } };

/* ---- robots: borrowed from the camp routine (state 'task'), given back when the errand ends ---- */
const isShelter = r => { const s = simR(); return !!(s && (s.env.rain || (s.env.night && (!s.shifts || !r || r.nc)))); };   /* Job 6b: at night only the robots on the charging shift shelter (camp_start.js shiftPlan) */
function freeRobots(any) {   /* robots with nothing in their hands: idle at the post, sorting, or walking out. any = a partner for a two-handed job takes one from the shore too (never one that carries a load). */
  const s = simR(), L = layout(); if (!s || !L) return []; const out = [];
  s.robots.forEach((r, i) => { if (!A.S().robots[i] || r.state === 'task' || P.err[i]) return; if (isShelter(r)) return;
    if ((r.state === 'bay' && r.charge > .5) || r.state === 'sort' || (r.state === 'out' && !r.load && (any || hypot(r.x - L.YP.apron.x, r.z - L.YP.apron.z) < 9)) || (any && (r.state === 'work' || r.state === 'home') && !r.load && r.charge > .5)) out.push(i); });
  return out;
}
function borrow(i, legs, role, extra) {
  const s = simR(), r = s.robots[i], L = layout(), pre = [];
  if (r.state === 'bay') { const bay = L.YP.bays[r.bay]; pre.push({ x: bay.fx, z: bay.fz }, { x: L.YP.apron.x, z: L.YP.apron.z }); }
  const x = r.x, z = r.z; r.state = 'task'; r.timer = 0; r.since = 0; r.tmove = false; r.twork = false; r.tstall = false; r.path = null;
  P.err[i] = Object.assign({ e: errandNew(x, z, pre.concat(legs), r.v), role }, extra || {}); return P.err[i];
}
function release(i) { const s = simR(); if (s) { const r = s.robots[i]; if (r && r.state === 'task') { r.treturn = true; r.tmove = false; r.twork = false; r.tstall = false; } } delete P.err[i]; }
function applyRobot(i, e, stall) { const s = simR(), r = s.robots[i]; if (!r || r.state !== 'task') return;
  { const o = P.err[i]; r.why = stall ? (o && o.role === 'dock' && !o.kind ? 'wait_supplies' : 'wait_player') : null; r.at = o && o.role === 'dock' ? 'at the dock' : 'at the build site'; }   /* Job 6c: why a lent-out robot stands still, and where (camp_start.js stopReason) */ if (e.working && !r.twork && !stall) r.since = 0; r.x = e.x; r.z = e.z; r.yaw = e.yaw; r.tmove = e.moving; r.twork = e.working && !stall; r.tstall = !!stall; }
const atHold = o => o.e.working && o.e.legs[Math.min(o.e.i, o.e.legs.length - 1)].act === 'hold';
function loadsTick() {
  const V = P.V, s = simR(); if (!V || !s) return; let n = 0;
  Object.keys(P.err).forEach(i => { const o = P.err[i]; if (o.carry && n < 6) { const r = s.robots[i]; setI(V.loads, n, r.x, gy(r.x, r.z) + .78, r.z, 1, 1, 1, r.yaw, 0, 0, PIECE_COL[o.carry][0]); n++; } });
  V.loads.count = n; V.loads.instanceMatrix.needsUpdate = true; if (V.loads.instanceColor) V.loads.instanceColor.needsUpdate = true;
}
function giveBack(o) { if (o.crate) { const c = crateOf(o.crate); if (c && c.phys.st !== 'yard') { c.phys.carrier = null; c.phys.st = 'beach'; } } if (!o.carry) return; const st = Object.assign({}, stockOf()); st[o.carry] = (st[o.carry] || 0) + 1; A.patch({ stock: st }); const b = ph().b; if (b) { const ab = abortUnit(b); if (ab.ok) ph().b = ab.b; } o.carry = null; }
function returnToPost(i) { const L = layout(), s = simR(), r = s.robots[i], pos = L.dock.stand[i % 2]; P.err[i] = { e: errandNew(r.x, r.z, [{ x: pos.x, z: pos.z }, { x: pos.x, z: pos.z, act: 'hold', dur: 1e9, yaw: L.dock.psi }], r.v), role: 'dock' }; }
function abortErrand(i, why) { const o = P.err[i]; if (!o) return; SOFT(() => { const s = simR(), r = s.robots[i]; LC().noteStop(s, r, why || (isShelter(r) ? 'storm_home' : r.charge < .14 ? 'battery_low' : 'wait_supplies'), 'abort'); }, 'noteStop'); giveBack(o); if (o.role === 'dock') returnToPost(i); else release(i); }
function errandsTick(dt) {
  const s = simR(); if (!s) return;
  Object.keys(P.err).forEach(k => { const i = +k, o = P.err[i], r = s.robots[i]; if (!r || r.state !== 'task') { if (o.carry) giveBack(o); delete P.err[i]; return; }
    if (o.role !== 'dock' && o.busy !== 'beam' && (isShelter(r) || r.charge < .14)) { abortErrand(i); return; }
    if (o.held) return;   /* the pair carrying a beam sets this robot's place itself */
    const e = errandStep(o.e, dt); o.e = e; applyRobot(i, e, atHold(o) && !o.holdActive); (e.ev || []).forEach(ev => errandEvent(i, o, ev)); });
}
function errandEvent(i, o, ev) {
  const b = ph().b;
  if (ev === 'lift' && o.kind) { const st = Object.assign({}, stockOf()); if ((st[o.kind] || 0) < 1 || !b) { abortErrand(i); return; } const tk = takeUnit(b, planFor(b.id)); if (!tk.ok || tk.kind !== o.kind) { abortErrand(i); return; } st[o.kind]--; A.patch({ stock: st }); ph().b = tk.b; o.carry = o.kind; const sp = storeOf(o.kind); puff(sp.x, gy(sp.x, sp.z) + .3, sp.z, 2, 'dust'); A.renderUi(); }
  else if (ev === 'place' && o.carry) { const pu = placeUnit(b, planFor(b.id)); if (!pu.ok) { abortErrand(i); return; } ph().b = pu.b; o.carry = null; o.kind = null; const sp = siteOf(b.id); puff(sp.mark.x, gy(sp.mark.x, sp.mark.z) + .5, sp.mark.z, 4, 'dust'); puff(sp.mark.x, gy(sp.mark.x, sp.mark.z) + 1, sp.mark.z, 3, 'tick'); if (b.id === 'jetty') fitPlanks(Math.ceil(P.dockOpen0 / 5)); P.structSig = null; P.cheer = P.t + 1.6; A.renderUi(); }
  else if (ev === 'lift' && o.crate) { const c = crateOf(o.crate); if (c) { c.phys.carrier = 'r' + i; c.phys.st = 'beach'; } }
  else if (ev === 'drop' && o.crate) { crateDown(o.crate); }
  else if (ev === 'done' && !o.kind && o.role !== 'dock') release(i);
  else if (ev === 'done' && o.role === 'dock' && o.kind === null) { /* stays at its post */ }
}

/* ---- hold and tap ---- */
function wireInput() {
  const el = C.renderer.domElement;
  window.addEventListener('pointerdown', e => { if (e.target !== el) return; P.ptr = { x: e.clientX, y: e.clientY, t0: P.t, id: e.pointerId, moved: false }; }, true);
  window.addEventListener('pointermove', e => { if (P.ptr && e.pointerId === P.ptr.id && hypot(e.clientX - P.ptr.x, e.clientY - P.ptr.y) > 16) P.ptr.moved = true; }, true);
  const up = e => { if (P.ptr && e.pointerId === P.ptr.id) { if (P.holdId) P.swallow = P.t + .45; P.holdId = null; P.ptr = null; } };
  window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', up, true);
}
function holdPoll() { const p = P.ptr; if (!p || p.moved || P.holdId || P.t - p.t0 < .22) return; const hit = nearestTarget(p.x, p.y); if (hit && hit.hold) { P.holdId = hit.id; if (hit.id.startsWith('pcrate')) startCarry(+hit.id.slice(6), false); } }
function nearestTarget(cx, cy) { let best = null, bd = 1e9; for (const t of ownTargets()) { const d = hypot(t.x - cx, t.y - cy); if (d < t.r * 1.15 && d < bd) { bd = d; best = t; } } return best; }
function ownTargets() {
  const out = [], L = P.L; if (!L || !P.ready) return out; const add = (id, p, up, rad, hold) => { const sc = A.screenOf(p.x, gy(p.x, p.z) + up, p.z); if (sc) out.push({ id, x: sc.x, y: sc.y, r: rad, hold: !!hold }); };
  const b = ph().b; if (b && !isDone(b)) { const sp = siteOf(b.id), w = needsPlayer(b, planFor(b.id)); if (sp && (w === 'stake' || w === 'hold')) add('psite', sp.mark, .4, 64, true); }
  if (P.beam) { const e = beamEnds(P.beam.pos, P.beam.yaw, P.beam.len); if (P.beam.robotAt) add('pbeamA', e.A, .3, 64, true); else add('pbeam', P.beam.pos, .3, 56, false); }
  const op = ph().op; if (op && op.on) op.floats.forEach(f => { if (!f.gone) add('pfloat' + f.id, f, .3, 52, false); });
  crateList().forEach(c => { if (c.phys && crateAway(c) && c.mesh.visible && !c.phys.heavy) add('pcrate' + c.n, c.pos, .5, 56, true); });
  KINDS.forEach((k, i) => { if ((stockOf()[k] || 0) > 0) add('pheap_' + k, L.stores[i], .5, 50, false); });
  if (P.run === null && L && (P.phase === 'dusk' || P.phase === 'night')) add('plantern', { x: L.post.x + .55, z: L.post.z }, 1.7, 56, false);
  return out;
}
function activate(id) {
  if (id === 'psite') { siteAction(); return true; } if (id === 'pbeamA' || id === 'pbeam') { beamCard(); return true; }
  if (id === 'plantern') { lightLantern(); return true; }
  if (id.startsWith('pheap_')) { const k = id.slice(6); A.toast(cap1(k) + ' heap: ' + (stockOf()[k] || 0) + '. Robots on a ' + k + ' order add to it.', 3600); return true; }
  if (id.startsWith('pcrate')) { crateTap(+id.slice(6)); return true; }
  if (id.startsWith('pfloat')) { A.toast('Row over it to load it.', 3200); return true; } return false;
}

/* ---- the site: stake it out, or set a stage, by holding on it ---- */
const siteWant = () => { const b = ph().b; return b && !isDone(b) ? needsPlayer(b, planFor(b.id)) : null; };
function siteAction() {
  const w = siteWant(); if (!w || w === 'beam') { A.toast(w === 'beam' ? 'The frame beam first: hold the end that glows.' : 'The robots are still bringing the rest.', 3200); return; }
  const c = A.card('psite', '<h2>' + BUILD_NAME[ph().b.id] + '</h2><p>' + (w === 'stake' ? 'Drive the stakes and string the lines.' : 'Set this stage: keep your hand on it while it is fixed.') + '</p><p><small>Hold the glowing ring, or press the button.</small></p>'); c.appendChild(A.xbtn());
  c.appendChild(A.row(A.btn(w === 'stake' ? 'Stake it out' : 'Set it', () => { A.closeCard(); startAct('site', true); }, 'pri'), A.btn('Close', A.closeCard)));
}
function startAct(kind, auto) { P.act = { kind, t: 0, auto: !!auto, tick: 0 }; }
function actTick(dt) {
  if (!P.act && P.holdId === 'psite') { const w0 = siteWant(); if (w0 === 'stake' || w0 === 'hold') startAct('site', false); }   /* Job 6c: holding the glowing ring itself does the work (it used to need the card's button) */
  const a = P.act; if (!a || a.kind !== 'site') return; const w = siteWant(); if (!w || w === 'beam') { P.act = null; return; }
  const need = w === 'stake' ? HOLD.stake : HOLD.set, holding = a.auto || P.holdId === 'psite'; if (!holding) { a.t = Math.max(0, a.t - dt * 2); if (!a.t) P.act = null; return; }
  a.t += dt; a.tick -= dt; const b = ph().b, sp = siteOf(b.id); if (a.tick <= 0) { a.tick = .38; puff(sp.mark.x + Math.sin(a.t * 9) * .6, gy(sp.mark.x, sp.mark.z) + 1, sp.mark.z, 2, 'tick'); }
  if (a.t >= need) { const r = advance(b, planFor(b.id), w); if (r.ok) { ph().b = r.b; P.act = null; P.structSig = null; puff(sp.mark.x, gy(sp.mark.x, sp.mark.z) + .8, sp.mark.z, 8, 'dust'); A.toast(BUILD_NAME[r.b.id] + ': ' + progress(r.b, planFor(r.b.id)).name.toLowerCase() + '.', 4200); if (r.b.id === 'jetty') fitPlanks(Math.ceil(P.dockOpen0 / 5)); finishCheck(); A.renderUi(); } }
}

/* ---- the beam: a robot holds one end, you hold the other, and it moves only while you hold ---- */
function ensureBeam() {
  const b = ph().b; if (P.beam && P.beam.crate) return;
  if (!b || isDone(b) || needsPlayer(b, planFor(b.id)) !== 'beam') { if (P.beam && P.beam.phase !== 'placed') dropBeam(); return; }
  if (P.beam) return; const L = layout(), sp = siteOf(b.id), st = L.stores[0], len = BEAM_LEN[b.id] || 3, yaw0 = Math.atan2(L.tan[0], L.tan[1]) + 1.57, yaw1 = sp.yaw + 1.57;
  P.beam = { c: carryNew('beam', [{ x: st.x, z: st.z }, { x: sp.mark.x, z: sp.mark.z }], .8), phase: 'wait', pos: { x: st.x, z: st.z }, yaw: yaw0, yaw0, yaw1, len, robot: null, robotAt: false };
  const V = P.V; V.beam.visible = true; V.beam.scale.set(len, 1, 1); V.ghost.visible = true; V.ghost.scale.set(len, 1, 1); V.ghost.position.set(sp.mark.x, gy(sp.mark.x, sp.mark.z) + .6, sp.mark.z); V.ghost.rotation.y = yaw1;
  A.toast('The frame needs a long beam. A robot takes one end. You take the other.', 5200);
}
function dropBeam() { const bm = P.beam; if (bm && bm.crate) { const c = crateOf(bm.crate); if (c && c.phys.st !== 'yard') { c.phys.carrier = null; } } if (bm && bm.robot !== null && P.err[bm.robot]) { P.err[bm.robot].held = false; P.err[bm.robot].busy = null; if (P.err[bm.robot].role === 'dock') returnToPost(bm.robot); else release(bm.robot); } P.beam = null; if (P.V) { P.V.beam.visible = false; P.V.ghost.visible = false; } }
function beamTick(dt) {
  ensureBeam(); const bm = P.beam, V = P.V; if (!bm || !V) return;
  if (bm.robot === null) {   /* a robot comes to its end and waits there for you */
    const dockers = Object.keys(P.err).map(Number).filter(i => P.err[i].role === 'dock' && !P.err[i].kind && !P.err[i].busy), cand = dockers.length ? dockers : freeRobots(true);
    if (cand.length) { const i = cand[0], ends = beamEnds(bm.pos, bm.yaw, bm.len), role = P.err[i] ? P.err[i].role : 'beam', s = simR().robots[i]; if (role === 'dock') P.err[i] = { e: errandNew(s.x, s.z, [{ x: ends.B.x, z: ends.B.z }, { x: ends.B.x, z: ends.B.z, act: 'hold', dur: 1e9, yaw: bm.yaw }], s.v), role: 'dock', busy: 'beam' }; else borrow(i, [{ x: ends.B.x, z: ends.B.z }, { x: ends.B.x, z: ends.B.z, act: 'hold', dur: 1e9, yaw: bm.yaw }], 'beam', { busy: 'beam' }); bm.robot = i; }
  }
  const o = bm.robot !== null ? P.err[bm.robot] : null; bm.robotAt = !!(o && atHold(o));
  const go = P.holdId === 'pbeamA' || (P.act && P.act.kind === 'beam'); if (o) o.holdActive = go && bm.robotAt;
  if (bm.phase !== 'placed') {
    const c2 = carryStep(bm.c, { hold: P.holdId === 'pbeamA', auto: !!(P.act && P.act.kind === 'beam'), robotAt: bm.robotAt }, dt); bm.c = c2; bm.phase = c2.phase;
    if (c2.d > 0) { const p = pathAt(c2.path, c2.d), k = c2.d / c2.total; bm.pos = { x: p.x, z: p.z }; bm.yaw = bm.yaw0 + (bm.yaw1 - bm.yaw0) * k; if (c2.moving) { P.dustT = (P.dustT || 0) - dt; if (P.dustT <= 0) { P.dustT = .5; puff(bm.pos.x, gy(bm.pos.x, bm.pos.z) + .1, bm.pos.z, 1, 'dust'); } } }
    if (o && c2.d > 0) { const e = beamEnds(bm.pos, bm.yaw, bm.len), s = simR().robots[bm.robot]; o.held = true; s.x = e.B.x; s.z = e.B.z; s.yaw = bm.yaw; s.tmove = c2.moving; s.twork = false; s.tstall = false; o.e.x = e.B.x; o.e.z = e.B.z; }
    if (c2.phase === 'placed' && bm.crate) { const n = bm.crate; dropBeam(); crateDown(n); return; }
    if (c2.phase === 'placed') { const b = ph().b, sp = siteOf(b.id), r = advance(b, planFor(b.id), 'beam'); if (r.ok) { ph().b = r.b; P.structSig = null; puff(sp.mark.x, gy(sp.mark.x, sp.mark.z) + .8, sp.mark.z, 8, 'dust'); puff(sp.mark.x, gy(sp.mark.x, sp.mark.z) + 1, sp.mark.z, 4, 'tick'); A.toast('The beam is down. ' + planFor(b.id).names[r.b.stage - 1] + '.', 5200); if (b.id === 'jetty') fitPlanks(Math.ceil(P.dockOpen0 / 5)); }
      dropBeam(); finishCheck(); A.renderUi(); return; }
  }
  const p = bm.pos; if (bm.crate) { const c = crateOf(bm.crate); if (c) { c.mesh.position.set(p.x, gy(p.x, p.z) + .15 + (bm.phase === 'carry' ? .15 : 0), p.z); c.mesh.rotation.y = bm.yaw; c.pos.x = p.x; c.pos.z = p.z; } return; }
  V.beam.position.set(p.x, gy(p.x, p.z) + .55 + (bm.phase === 'carry' ? .15 : 0), p.z); V.beam.rotation.y = bm.yaw;
}
function beamCard() {
  const bm = P.beam, c = A.card('pbeam', '<h2>The frame beam</h2><p>' + (bm && bm.robotAt ? 'The robot has its end. Hold the glowing end to carry the beam to the marked spot. It moves only while you hold.' : (bm && bm.robot === null && robotWhy() ? robotWhy() : 'A robot is on its way to the far end. It will wait for you.')) + '</p>'); c.appendChild(A.xbtn());
  c.appendChild(A.row(A.btn('Carry it together', () => { A.closeCard(); P.act = { kind: 'beam' }; }, 'pri', !(bm && bm.robotAt)), A.btn('Close', A.closeCard)));
}


/* ---- delivery crates: a tender comes in, stops at the landing, and the crates are carried up the beach (by a robot, or by you holding; a heavy one by a robot and you together) ---- */
const crateList = () => A.crates();
const crateOf = n => crateList().find(c => c.n === n);
const toastLog = {}; function toastOnce(k, msg) { if (toastLog[k]) return; toastLog[k] = 1; A.toast(msg, 4500); }
function slotOf(cr) { const L = layout(); return LC_slot(L, cr.phys.k); }
const LC_slot = (L, k) => crateSlot(L.pad, L.tan, k);
function landingA() { const S = A.spots(), d = C.W.camp.dir; return { x: S.tender.wp.x + d[0] * 2.5, z: S.tender.wp.z + d[1] * 2.5, drop: S.tender.drop }; }
function onCrate(cr, fromTender) {
  const L = layout(); const k = crateList().indexOf(cr); cr.phys = { st: 'yard', carrier: null, k: Math.max(0, k), heavy: !!cr.letter2 || !!(cr.item && CG().itemById(cr.item) && CG().itemById(cr.item).extra > 0) };
  if (!L) return; const slot = LC_slot(L, cr.phys.k);
  if (!fromTender) { cr.pos.x = slot.x; cr.pos.z = slot.z; cr.mesh.position.set(slot.x, gy(slot.x, slot.z), slot.z); return; }
  const O = A.objs(), dlv = A.dlv && A.dlv();
  if (dlv && O.tender && O.tender.visible) { cr.phys.st = 'boat'; cr.phys.run = 'dlv'; }
  else { cr.phys.st = 'queued'; cr.mesh.visible = false; }
  cr.pos.x = O.tender.position.x; cr.pos.z = O.tender.position.z;
}
function runsTick(dt) {
  const O = A.objs(), td = O.tender; if (!td) return; const list = crateList(), S = A.spots();
  const queued = list.filter(c => c.phys && c.phys.st === 'queued');
  if (!P.run && queued.length && !(A.dlv && A.dlv()) && !P.arr) { P.run = newRun(queued.map(c => c.n), 'A'); P.run.t0 = P.t; queued.forEach(c => { c.phys.st = 'boat'; c.phys.run = 'run'; c.mesh.visible = true; }); toastOnce('run' + queued[0].n, 'A boat is coming in with ' + (queued.length > 1 ? queued.length + ' crates' : 'a crate') + '.'); }
  const d = C.W.camp.dir, r = C.W.camp.rt, A0 = landingA(), tide = C.tide();
  if (P.run) {
    const run = P.run, sail = 14, leave = 12; let bp = null; try { bp = root.LI_BOAT_DRIVE.page.spec(); } catch (e) { bp = null; }
    const B0 = { x: A0.x + r[0] * 9, z: A0.z + r[1] * 9 }, bf = berthFor(bp, A0, B0, 7), dock = bf.berth === 'B' ? B0 : A0, start = { x: dock.x + d[0] * 45, z: dock.z + d[1] * 45 };
    const aboard = list.filter(c => c.phys && c.phys.st === 'boat' && c.phys.run === 'run').length;
    P.run = runStep(run, dt, { sail, leave, blocked: bf.hold, aboard }); P.run.berth = bf.berth || P.run.berth; P.run.dock = dock;
    const k = runK(P.run, { sail, leave }), e = k * k * (3 - 2 * k); td.visible = P.run.phase !== 'gone';
    td.position.set(start.x + (dock.x - start.x) * e, tide + .03 + Math.sin(P.t * 1.1) * .04, start.z + (dock.z - start.z) * e); td.rotation.y = Math.atan2(-(P.run.phase === 'out' ? (start.z - dock.z) : (dock.z - start.z)), P.run.phase === 'out' ? (start.x - dock.x) : (dock.x - start.x));
    if (P.run.phase === 'gone') { P.run = null; td.visible = false; }
  }
  list.forEach(c => { const ph_ = c.phys; if (!ph_) return;
    if (ph_.st === 'boat') { c.mesh.position.set(td.position.x, td.position.y + .55, td.position.z); c.mesh.rotation.y = td.rotation.y; c.pos.x = td.position.x; c.pos.z = td.position.z; }
    if (ph_.carrier && ph_.carrier[0] === 'r') { const rr = simR().robots[+ph_.carrier.slice(1)]; if (rr) { c.mesh.position.set(rr.x, gy(rr.x, rr.z) + .85, rr.z); c.mesh.rotation.y = rr.yaw; c.pos.x = rr.x; c.pos.z = rr.z; } }
    if (ph_.carrier === 'p' && P.carry && P.carry.n === c.n) { const q = pathAt(P.carry.c.path, P.carry.c.d); c.mesh.position.set(q.x, gy(q.x, q.z) + .6 + Math.sin(P.t * 8) * .04, q.z); c.pos.x = q.x; c.pos.z = q.z; } });
}
const crateAway = c => c.phys && (c.phys.st === 'boat' || c.phys.st === 'beach');
const crateDocked = c => c.phys.st === 'beach' || (c.phys.run === 'dlv' ? !!(A.dlv && A.dlv() === 'drop') : !!(P.run && P.run.phase === 'dock'));
/* THE LIT-UP BOX (Job 6c item 3): a heavy crate (the evening letter crate, a kit crate) needs a robot at the far end. When no robot can come it must not glow, and it says why (the owner met a lit crate on the first evening with nothing to do). */
function robotWhy() {   /* null when a robot can come, else one short sentence */
  const sm = simR(); if (!sm) return 'The robots are not ready yet.';
  if (!A.S().robots.some(Boolean)) return 'No robot is running yet. Fit a part to a carrier in the yard.';
  const dockers = Object.keys(P.err).map(Number).filter(i => P.err[i].role === 'dock' && !P.err[i].kind && !P.err[i].busy);
  if (dockers.length || freeRobots(true).length) return null;
  if (sm.env.rain) return 'The robots are sheltering from the rain. Wait for it to pass.';
  if (sm.env.night) return 'The robots are charging for the night. Wait for dawn, or carry light crates yourself.';
  return 'Every robot is busy or charging. One will be free soon.';
}
function crateLock(n) { const c = crateOf(n); if (!c || !c.phys || c.phys.st === 'yard') return null; if (!crateDocked(c)) return 'The boat is still coming in.'; if (c.phys.heavy) { const h = heavyHelp(c); return h.ok ? null : h.why; } return c.phys.carrier ? 'A robot has it.' : null; }
function heavyHelp(c) {   /* { ok, why } for a heavy crate */
  if (!crateDocked(c)) return { ok: false, why: 'The boat is still coming in.' };
  if (P.beam && P.beam.crate === c.n) return P.beam.robot !== null ? { ok: true } : (() => { const w = robotWhy(); return w ? { ok: false, why: w } : { ok: true }; })();
  if (P.beam) return { ok: false, why: 'The frame beam is being carried first. Finish that one.' };
  const w = robotWhy(); return w ? { ok: false, why: w } : { ok: true };
}
function crateFetchLegs(c) {
  const L = layout(), A0 = landingA(), slot = LC_slot(L, c.phys.k), from = c.phys.st === 'boat' ? A0.drop : { x: c.pos.x, z: c.pos.z };
  return [{ x: from.x, z: from.z }, { x: from.x, z: from.z, act: 'lift', dur: HOLD.lift }, { x: slot.x, z: slot.z }, { x: slot.x, z: slot.z, act: 'drop', dur: 1 }];
}
function crateDown(n) { const c = crateOf(n); if (!c) return; c.phys.carrier = null; c.phys.st = 'yard'; const p = LC_slot(layout(), c.phys.k); c.pos.x = p.x; c.pos.z = p.z; c.mesh.position.set(p.x, gy(p.x, p.z), p.z); c.mesh.rotation.y = .15 * (c.phys.k % 3); puff(p.x, gy(p.x, p.z) + .3, p.z, 6, 'dust'); toastOnce('down' + n, 'Crate number ' + n + ' is up at the yard.'); SOFT(() => A.pulse && A.pulse('build'), 'pulse'); A.renderUi(); }
function cratesTick(dt) {
  const list = crateList(), L = layout(); if (!L) return; const S = A.spots();
  /* a crate on the beach nobody has: a free robot fetches a light one */
  list.forEach(c => { if (!crateAway(c) || c.phys.carrier || c.phys.heavy) return; const docked = c.phys.st === 'beach' || (c.phys.run === 'dlv' ? !!(A.dlv && A.dlv() === 'drop') : (P.run && P.run.phase === 'dock')); if (!docked) return;
    const f = freeRobots()[0]; if (f === undefined) return; c.phys.carrier = 'r' + f; borrow(f, crateFetchLegs(c), 'crate', { crate: c.n }); });
  /* a heavy crate: a robot comes to its far handle and waits for you */
  /* a light crate in your hands */
  if (P.carry) { const c = crateOf(P.carry.n), inp = { hold: P.holdId === 'pcrate' + P.carry.n, auto: !!P.carry.auto }; if (!c) P.carry = null; else { P.carry.c = carryStep(P.carry.c, inp, dt); if (P.carry.c.phase === 'placed') { P.carry = null; crateDown(c.n); } } }
}
function makeHeavy(hc) {
  const L = layout(), A0 = landingA(), slot = LC_slot(L, hc.phys.k), from = hc.phys.st === 'boat' ? A0.drop : { x: hc.pos.x, z: hc.pos.z }, yaw = Math.atan2(slot.x - from.x, slot.z - from.z);
  P.beam = { crate: hc.n, c: carryNew('heavy', [{ x: from.x, z: from.z }, { x: slot.x, z: slot.z }], .8), phase: 'wait', pos: { x: from.x, z: from.z }, yaw, yaw0: yaw, yaw1: yaw, len: 1.8, robot: null, robotAt: false }; hc.phys.carrier = 'pair'; hc.phys.st = 'beach';
  hc.mesh.position.set(from.x, gy(from.x, from.z), from.z); toastOnce('heavy' + hc.n, 'Crate number ' + hc.n + ' is too heavy for one. A robot takes one end. You take the other.');
}
function crateTap(n) {
  const c = crateOf(n); if (!c || !c.phys || c.phys.st === 'yard') return false;
  if (c.phys.st === 'queued') { A.toast('It is still on the boat.', 2600); return true; }
  if (c.phys.heavy) { const docked = c.phys.st === 'beach' || (c.phys.run === 'dlv' ? !!(A.dlv && A.dlv() === 'drop') : (P.run && P.run.phase === 'dock')); if (!docked) { A.toast('The boat is still coming in.', 2600); return true; } const hh = heavyHelp(c); if (!hh.ok && !(P.beam && P.beam.crate === c.n && P.beam.robot !== null)) { A.toast(hh.why, 4200); return true; } if (!P.beam) makeHeavy(c); beamCard(); return true; }   /* the partner robot is called when you tap: robots keep working until then */
  const docked = c.phys.st === 'beach' || (c.phys.run === 'dlv' ? !!(A.dlv && A.dlv() === 'drop') : (P.run && P.run.phase === 'dock'));
  const card = A.card('pcrate', '<h2>Crate number ' + n + '</h2><p>' + (docked ? (c.phys.carrier ? 'A robot has it.' : 'It sits where the boat left it. Hold it to carry it up to the yard, or press the button.') : 'The boat is still coming in.') + '</p>'); card.appendChild(A.xbtn());
  card.appendChild(A.row(A.btn('Carry it up', () => { A.closeCard(); startCarry(n, true); }, 'pri', !docked || !!c.phys.carrier), A.btn('Close', A.closeCard))); return true;
}
function startCarry(n, auto) {
  const c = crateOf(n); if (!c || !crateAway(c) || c.phys.carrier || c.phys.heavy) return false; const L = layout(), A0 = landingA(), slot = LC_slot(L, c.phys.k), from = c.phys.st === 'boat' ? { x: c.pos.x, z: c.pos.z } : { x: c.pos.x, z: c.pos.z };
  c.phys.carrier = 'p'; c.phys.st = c.phys.st === 'boat' ? 'beach' : c.phys.st; P.carry = { n, auto: !!auto, c: carryNew('crate', [from, { x: A0.drop.x, z: A0.drop.z }, { x: slot.x, z: slot.z }]) }; return true;
}
function openLid(mesh) { const lid = mesh && mesh.userData && mesh.userData.lid; if (!lid) return; P.lids.push({ lid, t: 0, mesh }); }
function lidsTick(dt) { P.lids = P.lids.filter(a => { a.t += dt; const k = clamp(a.t / .7, 0, 1), e = k * k * (3 - 2 * k); a.lid.position.set(.2 * e, .75 + .23 * e + Math.sin(k * 3.14) * .12, -.32 * e); a.lid.rotation.x = -.9 * e; if (k >= 1 && !a.done) { a.done = true; const w = new T.Vector3(); a.mesh.getWorldPosition(w); puff(w.x, w.y + .8, w.z, 5, 'dust'); } return k < 1; }); }
const unloaded = () => !crateList().some(c => c.phys && (c.phys.st === 'boat' || c.phys.st === 'queued') && c.phys.run === 'dlv');

/* ---- ferrying: a robot takes the next unit from its heap to the site ---- */
function ferryTick() {
  const b = ph().b; if (!b || isDone(b)) return; const plan = planFor(b.id), k = wantUnit(b, plan); if (!k || (stockOf()[k] || 0) < 1) return;
  const L = layout(), sp = siteOf(b.id), store = storeOf(k), yaw = Math.atan2(sp.mark.x - sp.stand.x, sp.mark.z - sp.stand.z);
  const legs = [{ x: store.x, z: store.z }, { x: store.x, z: store.z, act: 'lift', dur: HOLD.lift }, { x: sp.stand.x, z: sp.stand.z }, { x: sp.stand.x, z: sp.stand.z, act: 'place', dur: HOLD.place, yaw }];
  const docker = Object.keys(P.err).map(Number).find(i => P.err[i].role === 'dock' && !P.err[i].busy && !P.err[i].kind && !P.err[i].carry);
  if (docker !== undefined) { const r = simR().robots[docker], pos = L.dock.stand[docker % 2]; P.err[docker] = { e: errandNew(r.x, r.z, legs.concat([{ x: pos.x, z: pos.z }, { x: pos.x, z: pos.z, act: 'hold', dur: 1e9, yaw: L.dock.psi }]), r.v), role: 'dock', kind: k }; return; }
  const busy = Object.keys(P.err).filter(q => P.err[q].kind).length, n = simR().robots.length; if (busy >= Math.max(1, n - 1)) return;
  const f = freeRobots(true)[0]; if (f !== undefined) borrow(f, legs, 'ferry', { kind: k });   /* a committed build calls a robot away from the shore (never one with a load in its hands) */
}
function finishCheck() {
  const b = ph().b; if (!b || !isDone(b)) return; const id = b.id; ph().b = null; P.structSig = null;
  if (id === 'jetty') SOFT(() => { const rp = C.li().repair; for (let k = 0; k < 12; k++) if (!rp.fitAll()) break; rp.step(30); }, 'fitAll');
  if (id === 'jetty') { A.patch({ dockDone: true, plank: true }); ph().op = null; P.arr = null; if (P.V) P.V.tools.visible = false; }   /* the dock is not the year's one build: it only opens the day */
  else A.patch({ build: id });
  Object.keys(P.err).forEach(i => { if (P.err[i].role === 'dock') release(+i); });
  if (id === 'jetty' && ph().q && !A.S().build) { const q = ph().q; ph().q = null; ph().b = newBuild(q); P.structSig = null; const sp = siteOf(q); if (sp) A.focus(sp.mark.x, sp.mark.z, 26); A.toast('The dock is finished. ' + BUILD_NAME[q] + ' goes up next: stake it out.', 7000); A.pulse && SOFT(() => A.pulse('build'), 'pulse'); A.afterChange(); return; }
  A.toast(BUILD_NAME[id] + ' is finished.', 6000); A.afterChange();
}

/* ---- choosing a build: pay the cash and credit now (the stock stays on the heap and is carried to the site by robots) ---- */
function canCommit(s, id) {
  const bd = CG().BUILDS.find(x => x.id === id); if (!bd) return { ok: false, why: 'No such thing.' };
  const cur = ph().b, dockGoing = !!(cur && cur.id === 'jetty');   /* OWNER bug: the dock is the opening, not the year's one build: it must not occupy the build slot. You may choose your build while it goes up: it is queued and the robots start it when the dock is finished. */
  if (s.build) return { ok: false, why: 'You have chosen one thing for the year ahead.' };
  if (ph().q) return { ok: false, why: 'Already chosen: ' + BUILD_NAME[ph().q] + ' starts when the dock is finished.' };
  if (cur && !dockGoing) return { ok: false, why: 'One thing is going up already.' };
  if (bd.cash > s.ledger.cash) return { ok: false, why: 'Not enough cash for the local work.' }; if (bd.credit > s.ledger.credit) return { ok: false, why: 'Not enough delivery credit.' };
  const m = CG().missing(s.stock || {}, bd.needs);
  if (Object.keys(m).length) return { ok: false, why: CG().missingText(s.stock || {}, bd.needs), short: m };
  return { ok: true, queue: dockGoing };
}
function commitBuild(id) {
  const s = A.S(), c = canCommit(s, id); if (!c.ok) { A.toast(c.why, 3600); return false; } const bd = CG().BUILDS.find(x => x.id === id), r = CG().spend(s.ledger, { cash: bd.cash, credit: bd.credit, text: 'Build: ' + bd.name }, s.gh);
  A.patch({ ledger: r.ledger });
  if (c.queue) { ph().q = id; A.toast(BUILD_NAME[id] + ' is paid for. The robots start it when the dock is finished.', 6000); A.renderUi(); A.afterChange(); return true; }
  ph().b = newBuild(id); P.structSig = null; const sp = siteOf(id); if (sp) A.focus(sp.mark.x, sp.mark.z, 26); A.toast(BUILD_NAME[id] + ' is paid for. The stock is on the heap. Stake it out.', 6000); A.afterChange(); return true;
}
const beachLanding = () => { try { const l = root.LI_BOAT_DRIVE.page.landings().find(q => q.id === 'beach'); return l && l.berth ? { x: l.berth.x, z: l.berth.z, yaw: l.berth.yaw } : l && { x: l.x, z: l.z, yaw: l.yaw }; } catch (e) { return null; } };
/* the tender that brought you: it comes in, stops well clear of your boat, waits a moment and leaves (a picture; nothing waits on it) */
function arrivalTick(dt) {
  const a = P.arr; if (!a) return; const O = A.objs(), td = O && O.tender, S = A.spots(); if (!td || !S) return; a.t += dt; const d = C.W.camp.dir, wp = S.tender.wp, tide = C.tide(), p1 = { x: wp.x + d[0] * 16, z: wp.z + d[1] * 16 }, p0 = { x: p1.x + d[0] * 45, z: p1.z + d[1] * 45 };
  let k, vis = true; if (a.t < 14) k = a.t / 14; else if (a.t < 19) k = 1; else if (a.t < 33) k = 1 + (a.t - 19) / 14; else { vis = false; k = 2; }
  const e = k <= 1 ? k * k * (3 - 2 * k) : 1 - (k - 1) * (k - 1) * (3 - 2 * (k - 1)) * 0 - 0; const f = k <= 1 ? e : 1 - ((k - 1) * (k - 1) * (3 - 2 * (k - 1)));
  td.visible = vis; if (!vis) { P.arr = null; return; } td.position.set(p0.x + (p1.x - p0.x) * f, tide + .03 + Math.sin(P.t * 1.1) * .04, p0.z + (p1.z - p0.z) * f); td.rotation.y = Math.atan2(-(k <= 1 ? (p1.z - p0.z) : (p0.z - p1.z)), k <= 1 ? (p1.x - p0.x) : (p0.x - p1.x));
}

/* ---- the opening: you arrive by boat, the dock is half built, the robots have stalled ---- */
function floatSpots(n) {   /* floating supplies in a fan seaward of your boat: the first one is a few strokes away, the rest a little further (water only) */
  const S = A.spots(), L = layout(), tide = C.tide(), bo = P.boatAt || (P.boatAt = boatStart()) || { x: S.tender.wp.x, z: S.tender.wp.z }, tip = L.dock.tip, out = [];
  const ox = bo.x - tip.x, oz = bo.z - tip.z, ol = hypot(ox, oz) || 1, base = Math.atan2(oz, ox);
  for (let k = 0; k < 90 && out.length < n; k++) { const dist = 6 + out.length * 3.2 + (k % 7) * .4, a = base + ((k * 5) % 9 - 4) * .22, x = bo.x + Math.cos(a) * dist, z = bo.z + Math.sin(a) * dist; if (A.H(x, z) < tide - .6 && out.every(q => hypot(q.x - x, q.z - z) > 4)) out.push({ x, z }); }
  while (out.length < n) out.push({ x: bo.x + (ox / ol) * (8 + out.length * 3), z: bo.z + (oz / ol) * (8 + out.length * 3) });
  return out;
}
function startOpening() {
  const L = layout(); if (!L || !L.dock) return false; const op = ph().op = { on: true, floats: [] }, kinds = ['planks', 'planks', 'rope', 'planks', 'rope'], pts = floatSpots(kinds.length);
  kinds.forEach((k, i) => op.floats.push({ id: i, kind: k, x: pts[i].x, z: pts[i].z, gone: false }));
  const plan = planFor('jetty'), b = newBuild('jetty'); b.stage = 2; b.placed = [plan.need[0], 0, 0, 0]; b.hours = HOURS.stake + plan.need[0] * HOURS.unit + HOURS.set; ph().b = b; return true;
}
function openingSetup() {   /* the half-built dock: some planks fitted already, tools in a heap, robots stalled */
  const L = layout(), s = simR(); if (!L || !L.dock || !s) return false; const rp = C.li().repair; if (!rp || !rp.ready()) return false;
  const all = rp.sockets().filter(q => q.kind === 'plank'), fitted = all.filter(q => q.filled).length, want = Math.floor(all.length / 2) - fitted; if (want > 0) fitPlanks(want);
  P.dockOpen0 = Math.max(1, openSockets()); const V = buildKit(); V.tools.visible = true; V.tools.position.set(L.dock.tools.x, gy(L.dock.tools.x, L.dock.tools.z), L.dock.tools.z);
  const n = Math.min(lite() ? 1 : 2, s.robots.length), st = A.S().robots.slice(); while (st.length < 3) st.push(false); for (let i = 0; i < n; i++) st[i] = true; A.patch({ robots: st });
  for (let i = 0; i < n; i++) { const r = s.robots[i], pos = L.dock.stand[i % 2]; r.charge = .9; r.state = 'task'; r.x = pos.x; r.z = pos.z; r.yaw = L.dock.psi; r.tstall = true; r.tmove = false; r.twork = false; r.since = 0; P.err[i] = { e: errandNew(pos.x, pos.z, [{ x: pos.x, z: pos.z, act: 'hold', dur: 1e9, yaw: L.dock.psi }], r.v), role: 'dock' }; }
  return n > 0;
}
function floatsTick() {
  const op = ph().op, V = P.V; if (!op || !op.on || !V) return; const tide = C.tide(); let n = 0, bd = null; try { bd = root.LI_BOAT_DRIVE.page; } catch (e) { bd = null; }
  const bs = bd && bd.state && bd.state(), boat = bs && bs.ready && bs.avail ? bs.b : null;
  op.floats.forEach(f => { if (f.gone) return; setI(V.floats, n, f.x, tide + .03 + Math.sin(P.t * 1.3 + f.id * 2) * .05, f.z, f.kind === 'rope' ? .5 : 1, f.kind === 'rope' ? 2.4 : 1, f.kind === 'rope' ? 1.6 : 1, f.id * 1.1, 0, Math.sin(P.t + f.id) * .05, PIECE_COL[f.kind][0]); n++;
    if (boat && bs.mode === 'drive') { const used = Object.values(boat.load || {}).reduce((a, c) => a + c, 0), cap = boat.engine ? 8 : 4; if (used < cap && hypot(boat.x - f.x, boat.z - f.z) < 2.9) { f.gone = true; bd.give({ load: { [f.kind]: ((boat.load || {})[f.kind] || 0) + 1 } }); A.toast('Loaded ' + f.kind + '. ' + (used + 1) + ' of ' + cap + ' in the boat.', 3200); puff(f.x, tide + .2, f.z, 4, 'dust'); P.dirty = true; P.cheer = P.t + 1.6; } } });
  V.floats.count = n; V.floats.instanceMatrix.needsUpdate = true; if (V.floats.instanceColor) V.floats.instanceColor.needsUpdate = true;
}

/* ---- the marker: one pulsing ring over the next thing that needs you ---- */
function markerPos() {
  const L = layout(), S = A.spots(), s = A.S(), op = ph().op; if (!L) return null; const b = ph().b, w = b ? siteWant() : null, bl = beachLanding() || S.tender.wp; let bd = null; try { bd = root.LI_BOAT_DRIVE.page.state(); } catch (e) { bd = null; }
  if (op && op.on && !s.dockDone) { const loaded = bd && bd.b && bd.b.load ? Object.values(bd.b.load).reduce((a, c) => a + c, 0) : 0, left = op.floats.filter(f => !f.gone);
    if (loaded > 0 && (!left.length || loaded >= 4)) return { x: bl.x, z: bl.z, r: 3.2, tag: 'unload' }; const bx = bd && bd.b ? bd.b.x : 0, bz = bd && bd.b ? bd.b.z : 0, f = left.slice().sort((p, q) => hypot(p.x - bx, p.z - bz) - hypot(q.x - bx, q.z - bz))[0]; if (f) return { x: f.x, z: f.z, r: 2.4, tag: 'float' }; if (loaded > 0) return { x: bl.x, z: bl.z, r: 3.2, tag: 'unload' }; }
  if (P.beam && P.beam.robotAt) { const e = beamEnds(P.beam.pos, P.beam.yaw, P.beam.len); return { x: e.A.x, z: e.A.z, r: 1.6, tag: 'beamA' }; }   /* Job 6c: no glow while no robot is at its end (the card and the hint say why) */
  if (b && (w === 'stake' || w === 'hold')) { const sp = siteOf(b.id); return { x: sp.mark.x, z: sp.mark.z, r: 2.4, tag: 'site' }; }
  const cr = crateList().find(c => c.phys && crateAway(c) && !c.phys.carrier && (!c.phys.heavy || !P.beam) && c.mesh.visible && (c.phys.st === 'beach' || (c.phys.run === 'dlv' ? (A.dlv && A.dlv() === 'drop') : (P.run && P.run.phase === 'dock'))) && (!c.phys.heavy || heavyHelp(c).ok)); if (cr) return { x: cr.pos.x, z: cr.pos.z, r: 1.8, tag: cr.phys.heavy ? 'heavy' : 'crate' };
  const sh = crateList().find(c => c.phys && c.phys.st === 'yard' && ((c.n === 1 && !A.S().crate1) || (c.letter2 && !A.S().letter2))); if (sh) return { x: sh.pos.x, z: sh.pos.z, r: 1.7, tag: 'open' };
  if ((P.phase === 'dusk' || P.phase === 'night') && !ph().lantern) return { x: L.post.x + .55, z: L.post.z, r: 1.3, tag: 'lantern' };
  return null;
}
function markerTick(dt) {
  const V = P.V; if (!V) return; const m = markerPos(), r0 = V.ring[0], r1 = V.ring[1]; P.mk = m;
  if (m) { const k = clamp(C.cam.dist / 52, .5, 1.3), pulse = 1 + .07 * Math.sin(P.t * 3.2), a = .72 + .18 * Math.sin(P.t * 3.2), y = Math.max(gy(m.x, m.z), C.tide()) + .1, sc = m.r * k * .62 * pulse;   /* small when zoomed out: the radius grows slowly with the camera distance */
    r0.visible = r1.visible = true; r0.position.set(m.x, y, m.z); r1.position.set(m.x, y, m.z); r0.scale.setScalar(sc); r1.scale.setScalar(sc * 1.16); r0.material.opacity += (a - r0.material.opacity) * Math.min(1, dt * 5); r1.material.opacity += ((.55 + .25 * Math.sin(P.t * 3.2)) - r1.material.opacity) * Math.min(1, dt * 5); }
  else { r0.material.opacity += (0 - r0.material.opacity) * Math.min(1, dt * 5); r1.material.opacity += (0 - r1.material.opacity) * Math.min(1, dt * 5); r0.visible = r1.visible = r0.material.opacity > .03 || r1.material.opacity > .03; }
  if (m) SOFT(() => { const O = A.objs(); if (O && O.ring) { O.ring.material.opacity = 0; O.ring.visible = false; } }, 'ring');
}
/* ---- the INSPECT table for the physical objects (the writer edits the words here; gift_day.js has the table for the rest): name, use, needs, action, locked ---- */
const cap1 = k => k.charAt(0).toUpperCase() + k.slice(1);
const INFO_WORDS = {
  site: { use: 'Where the build goes up, stage by stage.', action: 'Hold the ring to set it' },
  beam: { name: 'The frame beam', use: 'A long piece for the frame. Two carry it: a robot at one end and you at the other.', action: 'Hold the glowing end to carry it' },
  float: { use: 'Washed-up supplies on the water.', needs: 'Your boat close by', action: 'Row to it' },
  heap: { use: 'Stock for building. Robots with a matching order add to it.', needs: 'A robot on an order, or your hands', action: 'Look' },
  lantern: { name: 'The lantern', use: 'Lights the camp when it is dark.', action: 'Tap to light it' },
  crate: { use: 'Supplies from the boat.', action: 'Hold to carry it up' }
};
function info(id) {
  const W = INFO_WORDS;
  if (id === 'psite') { const b = ph().b; if (!b) return null; const w = siteWant(), nm = BUILD_NAME[b.id]; return { name: nm + ' site', use: W.site.use + ' Now: ' + progress(b, planFor(b.id)).name.toLowerCase() + '.', needs: w === 'stake' ? 'Your hands: hold to drive the stakes' : w === 'hold' ? 'Your hands: hold to set this stage' : w === 'beam' ? 'The frame beam first' : 'Robots are bringing the rest', action: W.site.action, locked: w === 'stake' || w === 'hold' ? null : w === 'beam' ? 'Carry the frame beam first.' : 'The robots are still bringing the rest.' }; }
  if (id === 'pbeam' || id === 'pbeamA') { const bm = P.beam; return { name: bm && bm.crate ? 'The heavy crate' : W.beam.name, use: W.beam.use, needs: 'A robot at the far end', action: W.beam.action, locked: bm && bm.robotAt ? null : (bm && bm.robot === null ? (robotWhy() || 'A robot is coming to the far end. Wait for it.') : 'A robot is walking to the far end. Wait for it.') }; }
  if (/^pfloat\d+$/.test(id)) { const f = (ph().op ? ph().op.floats : []).find(q => 'pfloat' + q.id === id); return { name: 'Floating ' + (f ? f.kind : 'supplies'), use: W.float.use, needs: W.float.needs, action: W.float.action }; }
  if (/^pcrate\d+$/.test(id)) { const n = +id.slice(6), c = crateOf(n); if (!c || !c.phys) return null; const docked = c.phys.st === 'beach' || (c.phys.run === 'dlv' ? !!(A.dlv && A.dlv() === 'drop') : (P.run && P.run.phase === 'dock')); return { name: 'Crate number ' + n, use: c.letter2 ? 'The evening boat left it. A letter lies on top.' : W.crate.use, needs: c.phys.heavy ? 'A robot and you together: tap to call one' : 'Your hands, or a free robot', action: c.phys.heavy ? 'Tap to call a robot' : W.crate.action, locked: !docked ? 'The boat is still coming in.' : c.phys.heavy ? (heavyHelp(c).ok ? null : heavyHelp(c).why) : (c.phys.carrier ? 'A robot has it.' : null) }; }
  if (id === 'plantern') return { name: W.lantern.name, use: W.lantern.use, needs: 'Dusk or night', action: W.lantern.action, locked: P.phase === 'day' || P.phase === 'dawn' ? 'It is too bright to need it.' : null };
  if (id.startsWith('pheap_')) { const k = id.slice(6); return { name: cap1(k) + ' heap (' + (stockOf()[k] || 0) + ')', use: W.heap.use, needs: W.heap.needs, action: W.heap.action }; }
  return null;
}
function robotNote(i) {   /* what a dock robot is doing, in words (the card of the inspect layer) */
  const o = P.err[i], sr = simR() && simR().robots[i]; if (!o || !sr) return null; const pct = Math.round((sr.charge || 0) * 100);
  if (o.role === 'dock' && !o.kind && !o.busy) return { use: 'An old machine stalled at the dock. Its light is amber: it is waiting for planks and rope.', needs: 'Supplies from your boat. Battery ' + pct + ' percent.', action: 'Row supplies in' };
  if (o.kind) return { use: 'Carrying ' + o.kind + ' from its heap to the site.', needs: 'Nothing: it is working. Battery ' + pct + ' percent.', action: null, locked: null };
  if (o.busy === 'beam') return { use: 'Holding one end of the frame beam.', needs: 'You at the other end. Battery ' + pct + ' percent.', action: 'Hold the glowing end' };
  if (o.crate) return { use: 'Carrying a crate up the beach.', needs: 'Nothing: it is working. Battery ' + pct + ' percent.', action: null };
  return null;
}
function goldId() {   /* the one next thing that needs you */
  const m = P.mk; if (!m || !P.ready) return null; const op = ph().op;
  if (m.tag === 'float') { const f = op && op.floats.filter(q => !q.gone).sort((a, b) => hypot(a.x - m.x, a.z - m.z) - hypot(b.x - m.x, b.z - m.z))[0]; return f ? 'pfloat' + f.id : null; }
  if (m.tag === 'beam') return 'pbeam'; if (m.tag === 'beamA') return 'pbeamA'; if (m.tag === 'site') return 'psite'; if (m.tag === 'lantern') return 'plantern';
  if (m.tag === 'crate' || m.tag === 'heavy' || m.tag === 'open') { const c = crateList().find(q => q.pos && hypot(q.pos.x - m.x, q.pos.z - m.z) < .6); return c ? (c.phys && c.phys.heavy ? 'crate' : 'pcrate') + c.n : null; } return null;
}
/* one short line for the permanent Build button: what is going up, the stage, and what it needs now */
function buildLine() {
  const b = ph() && ph().b; if (b && b.id === 'jetty' && ph().q) return BUILD_NAME[ph().q] + ': next, after the dock'; if (!b || b.id === 'jetty' || !P.ready) return null; const plan = planFor(b.id), pr = progress(b, plan), w = isDone(b) ? null : needsPlayer(b, plan), k = isDone(b) ? null : wantUnit(b, plan);
  return BUILD_NAME[b.id] + ': ' + pr.name.toLowerCase() + ' - ' + (w === 'stake' ? 'needs you' : w === 'hold' ? 'needs your hands' : w === 'beam' ? 'needs a beam carry' : k ? ((stockOf()[k] || 0) < 1 ? 'needs ' + k + ' on the heap' : 'robots bring ' + k) : 'robots at work');
}
function hint() { if (P.ready && P.beam && !P.beam.robotAt && !(P.mk && P.mk.tag === 'unload')) return P.beam.robot === null && robotWhy() ? robotWhy() : 'Wait for the robot.'; const m = P.mk; if (!P.ready || !m) return null; const w = m.tag === 'site' ? siteWant() : null; return { unload: 'Row to the beach and unload.', float: 'Row to the glow.', beam: 'Wait for the robot.', beamA: P.beam && P.beam.crate ? HOLD_WORDS.heavy.before : HOLD_WORDS.beam.before, crate: HOLD_WORDS.crate.before, heavy: 'Tap the crate. It takes two.', open: 'Open the crate.', lantern: 'Tap the lantern to light it.', site: (HOLD_WORDS[w] || HOLD_WORDS.hold).before }[m.tag] || null; }

/* ---- the lantern and the lights at dusk ---- */
function lightsTick() {
  const V = P.V, L = layout(); if (!V || !L) return; let elev = 40; try { elev = C.li().clock.light().elev; } catch (e) { /* none */ }
  const phz = rhythm(elev, A.S().gh % 24); P.phase = phz; const on = lightsOn(phz);
  if (phz === 'day' && ph().lantern) ph().lantern = false;
  V.lantern.position.set(L.post.x + .55, gy(L.post.x, L.post.z) + 1.7, L.post.z); V.lantern.userData.body.material.color.setHex(ph().lantern ? 0xffd890 : 0x4a4030);
  const gl = V.glow.geometry, pos = gl.attributes.position.array, sz = gl.attributes.aSize.array, al = gl.attributes.aA.array, co = gl.attributes.aCol.array; let n = 0; const fl = .85 + .15 * Math.sin(P.t * 7) * Math.sin(P.t * 3.1);
  const spot = (x, y, z, size, a, c) => { pos[n * 3] = x; pos[n * 3 + 1] = y; pos[n * 3 + 2] = z; sz[n] = size; al[n] = a; co[n * 3] = c[0]; co[n * 3 + 1] = c[1]; co[n * 3 + 2] = c[2]; n++; };
  if (on) { spot(L.post.x, gy(L.post.x, L.post.z) + 1.9, L.post.z, 1.3, .5 * fl, [1, .78, .4]); if (ph().lantern) spot(L.post.x + .55, gy(L.post.x, L.post.z) + 1.7, L.post.z, 2.0 + (P.flare > P.t ? 4.5 * (P.flare - P.t) / 2.4 : 0), .7 * fl, [1, .72, .32]);
    const b = ph().b; if (b) { const sp = siteOf(b.id); if (sp) spot(sp.mark.x + 1, gy(sp.mark.x, sp.mark.z) + 1.3, sp.mark.z, 2.2, .5 * fl, [1, .8, .45]); } if (L.dock && A.S().dockDone) spot(L.dock.tip.x, gy(L.dock.tip.x, L.dock.tip.z) + 1.3, L.dock.tip.z, 2, .5 * fl, [1, .8, .45]); }
  gl.setDrawRange(0, n); gl.attributes.position.needsUpdate = gl.attributes.aSize.needsUpdate = gl.attributes.aA.needsUpdate = gl.attributes.aCol.needsUpdate = true;
}
function lightLantern() { if (P.phase === 'day' || P.phase === 'dawn') { A.toast('It is too bright to need a lantern.', 2600); return false; } ph().lantern = true; P.flare = P.t + 2.4; const L = layout(); if (L) { puff(L.post.x + .55, gy(L.post.x, L.post.z) + 1.9, L.post.z, 6, 'tick'); } A.toast('You lit the lantern. The light spreads across the camp.', 4200); A.renderUi(); return true; }

/* ---- the little readout of the build: stage name and person-hours ---- */

function holdStatus() {   /* the hold that is going on now: { id, label, p } or null */
  if (P.act && P.act.kind === 'site') { const w = siteWant(); if (w === 'stake' || w === 'hold') return { id: w, label: HOLD_WORDS[w].doing, p: clamp(P.act.t / (w === 'stake' ? HOLD.stake : HOLD.set), 0, 1) }; }
  const bm = P.beam; if (bm && bm.robotAt && bm.phase !== 'placed' && (P.holdId === 'pbeamA' || (P.act && P.act.kind === 'beam'))) { const k = bm.crate ? 'heavy' : 'beam'; return { id: k, label: HOLD_WORDS[k].doing, p: clamp(bm.c.d / bm.c.total, 0, 1) }; }
  if (P.carry && P.carry.c && (P.holdId === 'pcrate' + P.carry.n || P.carry.auto)) return { id: 'crate', label: HOLD_WORDS.crate.doing + ' (crate ' + P.carry.n + ')', p: clamp(P.carry.c.d / P.carry.c.total, 0, 1) };
  return null;
}
function holdBarTick() {
  let el = document.getElementById('gd-holdbar'); if (!el) { el = document.createElement('div'); el.id = 'gd-holdbar'; el.className = 'gd-pill'; el.style.cssText = 'position:absolute;left:50%;bottom:210px;transform:translateX(-50%);display:none;font-size:15px;pointer-events:none;min-width:190px;text-align:center'; el.innerHTML = '<span id="gd-holdbar-t"></span><div style="height:6px;border-radius:3px;background:rgba(255,255,255,.25);margin-top:5px"><div id="gd-holdbar-b" style="height:6px;border-radius:3px;background:#e8c070;width:0"></div></div>'; A.root().appendChild(el); }
  const h = holdStatus(); if (!h) { el.style.display = 'none'; return; } el.style.display = 'block'; el.querySelector('#gd-holdbar-t').textContent = h.label + ' ' + Math.round(h.p * 100) + ' percent. Keep holding.'; el.querySelector('#gd-holdbar-b').style.width = Math.round(h.p * 100) + '%';
}
function readoutTick() {
  let el = document.getElementById('gd-phys'); if (!el) { el = document.createElement('div'); el.id = 'gd-phys'; el.className = 'gd-pill'; el.style.cssText = 'position:absolute;left:10px;top:84px;font-size:13px;max-width:min(260px,60vw);padding:6px 10px;display:none'; A.root().appendChild(el); }
  const b = ph().b; if (!b) { el.style.display = 'none'; return; } const pr = progress(b, planFor(b.id)), txt = '<b>' + BUILD_NAME[b.id] + '</b>: ' + pr.name + '<br>Work ' + pr.hours + ' of ' + pr.hoursTotal + ' person-hours<div style="height:6px;border-radius:4px;background:#e3d6b8;margin-top:4px;overflow:hidden"><div style="height:100%;width:' + Math.round(pr.pct * 100) + '%;background:#2f6fe6"></div></div>';
  if (el._t !== txt) { el._t = txt; el.innerHTML = txt; } el.style.display = 'block';
}

/* ---- fixes to things the page draws that look wrong on a gift page (Job 6, found by the pixel check) ----
   1. The black ovals with a white outline: the open tops of the kit's bollard, barrel and drum have bad normals on the cap faces (found with the pixel check and a bisect of the scene: the black stays with the cap's smooth normals, not with the map, the metalness, the side or the shadow; flat shading, which makes the shader derive its own normals, lights it). Those three meshes get flatShading under the gift. Metalness of kit metal is also capped at 0.3 (this page has no environment map, so full metal draws dark).
   2. The large cream parallelogram: not part of the first day at all, it is one of the nine gulls (islands_look.html buildGulls: a flat 1.8 by 0.6 m quad, MeshBasic 0x7f7f71) that circles at 7 to 16 m and passes right in front of the camera when it is zoomed in. Under the gift a gull nearer than 60 m to the camera is hidden (22 m was not enough: a gull 30 m away still draws a 170 px cream parallelogram) (the default page and every other page keep theirs). */
function sweepTick(dt) {
  P.sw = (P.sw || 0) - dt; const sc = C.scene; if (!sc || !C.camera) return; const cp = C.camera.position;
  sc.children.forEach(o => { if (o.isMesh && o.material && o.material.type === 'MeshBasicMaterial' && o.geometry && o.geometry.attributes.position.count === 6 && !o.material.transparent && o.position.y > 4 && o.scale.x > .8 && o.scale.x < 1.5) {   /* the gull quads: 6 vertices, MeshBasic, circling 6 to 16 m up (the colour is HDR-tinted, so it is not matched by value) */ const d = hypot(o.position.x - cp.x, o.position.y - cp.y, o.position.z - cp.z); o.visible = d > 60; } });
  if (P.sw > 0) return; P.sw = 3;
  ['camp', 'repair', 'boat_drive', 'gift_day', 'physical'].forEach(n => { const g = sc.children.find(c => c.name === n); if (g) g.traverse(m => { const mt = m.isMesh && m.material; if (!mt || Array.isArray(mt) || !mt.isMeshStandardMaterial) return;
    if ((m.name === 'bollard' || m.name === 'barrel' || m.name === 'drum') && !mt.flatShading) { mt.flatShading = true; mt.needsUpdate = true; }
    if (mt.envMap || !(mt.metalness > .3) || mt.userData._pm) return; mt.userData._pm = 1; mt.metalness = .3; mt.needsUpdate = true; }); });
}

/* ---- robot looks (OWNER, 25 Nov: lamp eyes allowed, no mouths, no speech, no written feelings). The robot models already carry a visor lens strip (material 'Glow', kept dark by camp_start.js);
   under the gift it is the lamp eyes: green when working, amber and low while stalled at the dock (the machine also sinks a little, a droop), dim when the battery is low, a blink every few
   seconds, brighter when supplies arrive. Models without that strip get no eyes (nothing is added to them). The machines are drawn a third larger so the dock scene reads at the arrival camera. ---- */
function robotNode(i) { const sc = C.scene, cg = sc.children.find(c => c.name === 'camp'); let f = null; if (cg) cg.traverse(o => { if (!f && o.name === 'robot_' + i) f = o; }); return f; }
function robotLooksTick(dt) {
  const s = simR(); if (!s) return; P.rl = P.rl || {};
  s.robots.forEach((sr, i) => { const n = robotNode(i); if (!n) return; let R = P.rl[i];
    if (!R || R.node !== n) { const mats = []; n.traverse(m => { if (m.isMesh && m.material && m.material.name === 'Glow' && !mats.includes(m.material)) mats.push(m.material); }); R = P.rl[i] = { node: n, mats, t: i * 1.7, blink: 0, y0: n.scale.y, bright: 0 }; if (!lite()) { n.scale.multiplyScalar(1.3); R.y0 = n.scale.y; } }
    const o = P.err[i], stalled = !!(sr.state === 'task' && sr.tstall), low = sr.charge < .22, busy = (sr.state === 'task' && sr.twork) || (o && o.carry);
    R.t += dt; R.blink -= dt; if (R.t > 3.4 + (i % 3) * .9) { R.t = 0; R.blink = .13; }
    const target = low ? .25 : stalled ? .65 : busy ? 1.4 : .9; R.bright += (target - R.bright) * Math.min(1, dt * 3); if (P.cheer && P.cheer > P.t) R.bright = Math.min(2.2, R.bright + dt * 5);
    R.mats.forEach(m => { if (!m.emissive) return; m.emissive.setHex(stalled ? 0xd9a53a : 0x66ff7e); m.emissiveIntensity = R.blink > 0 ? 0 : R.bright; m.needsUpdate = false; });
    const sy = R.y0 * (stalled ? .94 : 1); n.scale.y += (sy - n.scale.y) * Math.min(1, dt * 4);
  });
}

/* ---- the frame ---- */
function tick(dt) {
  if (!P.ready) return; if (!P.restoredOk) { if (!layout()) return; P.restoredOk = restore(P.pendingSaved !== undefined ? P.pendingSaved : A.S().phys); P.pendingSaved = undefined; if (!P.restoredOk) return; }
  P.t += dt; buildKit();
  SOFT(() => runsTick(dt), 'runs'); SOFT(() => cratesTick(dt), 'crates'); SOFT(() => lidsTick(dt), 'lids'); SOFT(() => arrivalTick(dt), 'arrival'); SOFT(holdPoll, 'hold'); SOFT(floatsTick, 'floats'); SOFT(ferryTick, 'ferry'); SOFT(() => beamTick(dt), 'beam'); SOFT(() => errandsTick(dt), 'errands'); SOFT(() => actTick(dt), 'act');
  SOFT(() => heapsTick(dt), 'heaps'); SOFT(structureTick, 'structure'); SOFT(loadsTick, 'loads'); SOFT(() => dustTick(dt), 'dust'); SOFT(() => markerTick(dt), 'marker'); SOFT(lightsTick, 'lights'); SOFT(readoutTick, 'readout'); SOFT(holdBarTick, 'holdbar'); SOFT(() => sweepTick(dt), 'sweep'); SOFT(() => robotLooksTick(dt), 'looks');
}
function snapshot() { const p = ph() || {}; return { v: VERSION, crates: crateList().filter(c => c.phys).map(c => ({ n: c.n, st: c.phys.st === 'yard' ? 'yard' : 'beach', x: c.pos.x, z: c.pos.z, shut: false })), b: p.b ? Object.assign({}, p.b, { hand: p.b.hand.slice() }) : null, partCarried: !!p.partCarried, lantern: !!p.lantern, op: p.op || null, q: p.q || null }; }
function reset(saved) {
  P.ph = saved ? JSON.parse(JSON.stringify(saved)) : { v: VERSION, crates: [], b: null, partCarried: false, lantern: false, op: null };
  P.err = {}; P.beam = null; P.act = null; P.holdId = null; P.structSig = null; P.sig = {}; P.shownPieces = {}; P.anim = [];
  const sim = simR(); if (sim) sim.robots.forEach(r => { if (r.state === 'task') r.treturn = true; }); if (P.V) { P.V.beam.visible = false; P.V.ghost.visible = false; P.V.tools.visible = false; }
}
function restore(saved) {
  reset(saved); const L = layout(); if (!L) return false; buildKit(); const s = A.S();
  KINDS.forEach(k => { P.shownPieces[k] = heapPieces(s.stock[k] || 0, P.V.cap); });   /* a loaded game shows its heaps at once */
  if (!ph().op && s.opening && !s.dockDone) startOpening();
  const op = ph().op; if (op && op.on && !s.dockDone) { if (!ph().b) { const b = newBuild('jetty'), plan = planFor('jetty'); b.stage = 2; b.placed = [plan.need[0], 0, 0, 0]; ph().b = b; } SOFT(openingSetup, 'opening'); }
  P.structSig = null; if (op && op.on && !s.dockDone && !P.arrDone) { P.arr = { t: 0 }; P.arrDone = true; A.objs().tender.visible = true; SOFT(placeBoat, 'boat'); SOFT(frameDock, 'frame'); }
  A.renderUi(); return true;
}
/* the arrival camera: the dock and the stalled robots fill the upper half, the rowing boat and the floating plank the lower left (targets/look/07_First_day.jpg). A short glide in (off with &glide=0). */
function frameDock() {
  const L = layout(), bl = beachLanding() || A.spots().tender.wp; if (!L || !L.dock) return; const d = L.dock, dd = C.W.camp.dir, portrait = innerHeight > innerWidth * 1.1;
  const bo = P.boatAt || bl, v = { tx: d.mid.x * .6 + bo.x * .4, tz: d.mid.z * .6 + bo.z * .4, dist: portrait ? 30 : 22, phi: portrait ? .74 : .62, theta: .7 };   /* theta .7 looks along the shore from the sea: the dock upper left, your boat lower right (this world is fixed) */
  if (Q0.get('glide') === '0') { try { C.li().setView(v); } catch (e) { Object.assign(C.cam, v); } return; }
  try { C.li().setView({ tx: v.tx, tz: v.tz, dist: 62, phi: .9, theta: v.theta }); } catch (e) { /* the page's own start view */ }
  A.focus(v.tx, v.tz, v.dist, v.theta, v.phi);
}
function boatStart() {   /* a few strokes off the dock, in water deep enough for the little boat, on the side of the floating supplies, nose out to sea (the dock, the plank and your boat are in one picture) */
  const L = layout(), S = A.spots(), tide = C.tide(); if (!L || !L.dock) return null; const tip = L.dock.tip, mid = L.dock.mid, td = S.tender.wp, base = Math.atan2(td.z - tip.z, td.x - tip.x); let best = null, bs = 1e9;
  for (let r = 4; r <= 15; r += 1) for (let k = 0; k < 16; k++) { const a = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * .39, dx = Math.cos(a), dz = Math.sin(a), x = tip.x + dx * r, z = tip.z + dz * r; if (A.H(x, z) < tide - .45 && A.H(x + dx * 2.5, z + dz * 2.5) < tide - .45 && A.H(x - dz * 2, z + dx * 2) < tide - .3 && A.H(x + dz * 2, z - dx * 2) < tide - .3) { const sc = r + Math.abs(k) * .2 + hypot(x - mid.x, z - mid.z) * .3; if (sc < bs) { bs = sc; best = { x, z, yaw: Math.atan2(dx, dz) }; } } }
  return best;
}
function placeBoat() {   /* your little rowing boat lies near the dock from the first minute, ready to row */
  const bd = root.LI_BOAT_DRIVE.page, l = boatStart() || beachLanding(); if (!bd || !l) return; if (bd.reveal) bd.reveal(); bd.teleport(l.x, l.z, l.yaw, 'drive'); bd.set({ at: null, avail: true }); bd.setMode('drive'); P.boatAt = { x: l.x, z: l.z };
}
function attach(api) { A = api; T = A.THREE(); C = A.C(); scratch(); P.on = true; SOFT(wireInput, 'wire'); return true; }
root.LI_PHYS.attach = attach;
root.LI_PHYS.page = { HOLD_WORDS, holdStatus, forceBuild: (id, stage) => { if (!id) { ph().b = null; P.structSig = null; return true; } const plan = planFor(id), b = newBuild(id); b.stage = stage; for (let k = 0; k < stage - 1 && k < 4; k++) b.placed[k] = plan.need[k]; if (stage >= 1 && stage <= 4) b.placed[stage - 1] = plan.need[stage - 1]; ph().b = b; P.structSig = null; return true; }, crateLock, robotWhy, onCrate, crateTap, openLid, unloaded, startCarry, invalidate: saved => { P.restoredOk = false; P.pendingSaved = saved || null; P.arrDone = P.arrDone && !!(saved && saved.op); }, canCommit, commitBuild, placeBoat, attach, begin: () => { P.ready = true; }, tick, targets: () => ownTargets(), activate, hint, buildLine, robotNote, finishDock: () => { const b = ph().b; if (b && b.id === 'jetty') { b.stage = 5; finishCheck(); } }, info, goldId, snapshot, restore, reset, swallowTap: () => { if (P.swallow > P.t) { P.swallow = 0; return true; } return false; }, startOpening, openingSetup, lightLantern, layoutReady: () => !!layout(),
  state: () => ({ ph: ph(), err: Object.keys(P.err).map(i => ({ i: +i, role: P.err[i].role, carry: P.err[i].carry || null, kind: P.err[i].kind || null })), beam: P.beam && { phase: P.beam.phase, robotAt: P.beam.robotAt, d: P.beam.c.d, total: P.beam.c.total, robot: P.beam.robot }, marker: P.mk, phase: P.phase, act: P.act && P.act.kind, hold: P.holdId, errs: P.errs.slice(), counts: P.V && { heaps: Object.fromEntries(KINDS.map(k => [k, P.V.heaps[k].count])), stage: P.V.stage.count, floats: P.V.floats.count }, dockOpen0: P.dockOpen0 }),
  hold: id => { P.holdId = id || null; }, startAct, siteAction, beamCard, layout: () => { const L = layout(); return L && { stores: L.stores, pad: L.pad, post: L.post, dock: L.dock && { psi: L.dock.psi, root: L.dock.root, tip: L.dock.tip, stand: L.dock.stand } }; },
  advance(sec) { const h = .1; let t = 0; while (t < sec - 1e-9) { const d = Math.min(h, sec - t); SOFT(() => rt().advance(d), 'adv'); tick(d); t += d; } return true; }, planFor, siteOf, puff, errs: () => P.errs.slice(), floats: () => (ph().op ? ph().op.floats : []) };

})(typeof window !== 'undefined' ? window : globalThis);
