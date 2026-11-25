/* THE GIFT, the boat you can drive (switch: islands_look.html?game=gift, see GIFT_BOAT.md).
   One classic script, two halves (the same shape as gift_day.js):
   PART A  the pure core (no DOM, no three.js, no clock, no Math.random): speed, turning, heel and trim, tide grounding, the land rule, load and capacity, the skerry cache, the autopilot and path finding, the errand stub, save and load of the boat.
           Tested in tests/boat-drive-test.js.
   PART B  the page layer (only on a gift page): the thumb stick and keys, the HUD, the wake, the spray, the exhaust puff, landings, the Dock card, the world's reaction (seals, gulls), the camera follow.
   Frames: the page's own. A boat has yaw, forward is (cos yaw, -sin yaw), yaw grows to port, steer > 0 turns to starboard, throttle > 0 is ahead. Depth is tide minus ground height, in metres.
   Tags: TUNING = a game number (a guess), COMPUTED = checked by a test.
   Tone: nobody is drawn aboard, nothing breaks, nothing bleeds; a hull that touches ground only scrapes and slows. */
(function (root) {
'use strict';
/* ====================================================================== PART A: the core ====================================================================== */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const TAU = Math.PI * 2;
const wrap = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const sm = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const STOCK_IDS = ['planks', 'rope', 'glass', 'metal'];
const STOCK_CAP = 60;                                   /* the same cap as gift_day.js */
const SAVE_VERSION = 1;

/* the two boats the tender can be (TUNING). Speeds are page metres a second; the page is a diorama (the whole table is 122 m across), so a fast boat crosses the bay in about twenty seconds. */
const SPECS = {
  row: { id: 'row', name: 'Rowing boat', maxSpeed: 1.7, reverse: .6, tau: 1.2, turn: 1.05, turnMin: .5, capacity: 4, draft: .22, L: 4.4, B: 1.55, heelK: .05, trimK: .0 },
  engine: { id: 'engine', name: 'Boat with a small motor', maxSpeed: 6.2, reverse: 1.6, tau: .95, turn: 1.9, turnMin: .35, capacity: 8, draft: .3, L: 4.4, B: 1.55, heelK: .035, trimK: .085 }
};
const specOf = b => b && b.engine ? SPECS.engine : SPECS.row;
const WIND_LEEWAY = .0085;                              /* drift in metres a second per metre a second of wind (TUNING): a gale pushes a rowing boat about 0.2 m/s */
const LAND_DEPTH = .05, SHALLOW_MIN = .25;              /* below LAND_DEPTH a hull cannot go; between that and the draft it scrapes at 25 to 100 percent of its speed */

/* a new boat: at rest, rowing, empty. site = {x, z, yaw} */
function newBoat(site) {
  site = site || {};
  return { x: +site.x || 0, z: +site.z || 0, yaw: +site.yaw || 0, u: 0, v: 0, yr: 0, sc: 0, roll: 0, pitch: 0, grounded: false, bump: 0, engine: false, part: false, load: { planks: 0, rope: 0, glass: 0, metal: 0 }, trips: 0, cacheDay: 0, hasCache: true, got: { engine: false }, avail: false, at: null, errands: 0 };
}
const loadTotal = b => STOCK_IDS.reduce((n, k) => n + (b.load[k] || 0), 0);
const capacityOf = b => specOf(b).capacity;

/* the water under the hull: the smallest depth among five points (centre, bow, stern, port, starboard) */
function hullDepth(b, env) {
  const sp = specOf(b), c = Math.cos(b.yaw), s = -Math.sin(b.yaw), hl = sp.L * .45, hw = sp.B * .4, d = env.depth;
  return Math.min(d(b.x, b.z), d(b.x + c * hl, b.z + s * hl), d(b.x - c * hl, b.z - s * hl), d(b.x - s * hw, b.z + c * hw), d(b.x + s * hw, b.z - c * hw));
}
/* one step of the boat. input = { steer: -1..1 (+ starboard), throttle: -1..1 }, env = { depth(x,z), wind: {x,z,speed} (the vector the wind blows TOWARD), sea: 0..1 (storm mood), t: seconds, inside(x,z) optional }.
   Mutates b in place and returns { bump, scrape, moved }. */
function step(b, input, env, dt) {
  const sp = specOf(b), ev = { bump: false, scrape: false, moved: 0 };
  dt = clamp(dt, 0, .25); if (dt <= 0) return ev;
  const th = clamp(input.throttle || 0, -1, 1), st = clamp(input.steer || 0, -1, 1), sea = clamp(env.sea || 0, 0, 1);
  const lf = 1 - .25 * (loadTotal(b) / sp.capacity);                      /* a full load slows the boat by a quarter (TUNING) */
  const seaK = 1 - .18 * sea;                                             /* a rough sea costs a fifth of the speed at the worst */
  const dmin = hullDepth(b, env), shallowK = clamp((dmin - LAND_DEPTH) / (sp.draft - LAND_DEPTH), SHALLOW_MIN, 1);
  b.grounded = dmin < sp.draft;
  /* the stroke of a rowing boat pushes in pulses: 40 percent drive, 60 percent glide, the mean stays 1 (COMPUTED) */
  let pulse = 1;
  if (!b.engine && th > .05) { const per = 60 / clamp(18 + (Math.abs(b.u) - .8) * 16.7, 16, 30); b.sc = (b.sc + dt / per) % 1; const ph = b.sc; pulse = ph < .4 ? 1 + .55 * Math.sin(Math.PI * ph / .4) : 1 - .37 * Math.sin(Math.PI * (ph - .4) / .6); }
  const top = (th >= 0 ? sp.maxSpeed : sp.reverse) * lf * seaK * shallowK;
  const target = th * top * (th > 0 ? pulse : 1);
  b.u += (target - b.u) * (1 - Math.exp(-dt / sp.tau));
  /* turning: a rudder needs way on, a pair of oars or a swung motor less so */
  const way = Math.max(sp.turnMin, Math.min(1, Math.abs(b.u) / (sp.maxSpeed * .45)));
  const yrT = -st * sp.turn * way * (b.u < -.05 ? -1 : 1);
  b.yr += (yrT - b.yr) * (1 - Math.exp(-dt / .35));
  b.yaw = wrap(b.yaw + b.yr * dt);
  /* the boat slides a little outward in a hard turn; the heel follows the sideways acceleration (COMPUTED: leans away from the turn centre) */
  const slide = .1 * b.u * b.yr;                                        /* v is + to starboard; turning to port (yr > 0) slides the boat outward, to starboard */
  b.v += (slide - b.v) * (1 - Math.exp(-dt / .5));
  const lat = b.u * b.yr;                                                 /* lateral acceleration, positive when turning to port */
  const heelT = clamp(lat * sp.heelK, -.16, .16);                         /* roll positive = port side up (boat_motion convention): turning to port heels the boat away from the turn, to starboard, so the port side rises */
  b.roll += (heelT - b.roll) * (1 - Math.exp(-dt / .3));
  const pitchT = clamp(Math.abs(b.u) / sp.maxSpeed, 0, 1) * sp.trimK * (b.u > 0 ? 1 : 0);   /* bow up with speed (the motor boat planes a little) */
  b.pitch += (pitchT - b.pitch) * (1 - Math.exp(-dt / .6));
  /* move: along the heading, a little sideways, and downwind (leeway) */
  const c = Math.cos(b.yaw), s = -Math.sin(b.yaw), w = env.wind || { x: 0, z: 0, speed: 0 };
  const wl = WIND_LEEWAY * (w.speed || 0);
  let dx = (c * b.u - s * b.v + w.x * wl) * dt, dz = (s * b.u + c * b.v + w.z * wl) * dt;   /* starboard is (-s, c) */
  const wasD = dmin, ins = env.inside || (() => true);
  const okAt = (x, z) => { const t = { x, z, yaw: b.yaw, engine: b.engine }; if (!ins(x, z)) return false; const d = hullDepth(t, env); return d >= LAND_DEPTH || d >= wasD - 1e-6; };   /* never onto land: a move that makes shallow water shallower than 5 cm is refused; a move toward deeper water is always fine */
  const nx = b.x + dx, nz = b.z + dz;
  if (okAt(nx, nz)) { b.x = nx; b.z = nz; ev.moved = Math.hypot(dx, dz); }
  else if (okAt(nx, b.z)) { b.x = nx; ev.moved = Math.abs(dx); b.u *= .9; ev.scrape = true; }
  else if (okAt(b.x, nz)) { b.z = nz; ev.moved = Math.abs(dz); b.u *= .9; ev.scrape = true; }
  else { if (Math.abs(b.u) > .5) ev.bump = true; b.u *= .35; b.v *= .35; }
  if (b.grounded && Math.abs(b.u) > .3) ev.scrape = true;
  b.bump = ev.bump ? 1 : Math.max(0, b.bump - dt * 2);
  return ev;
}
/* the sea height at a point for rocking when no sea model is on: three slow swells (the motion is cosmetic; the sea plane is flat). amp 0..1 is the mood. Metres. */
function swell(x, z, t, amp) {
  const a = .035 + .17 * clamp(amp, 0, 1);
  return a * (Math.sin(x * .21 + z * .13 - t * 1.05) * .6 + Math.sin(x * -.11 + z * .27 - t * .73 + 1.3) * .3 + Math.sin(x * .37 - z * .19 - t * 1.6 + 2.1) * .1);
}
/* heave, pitch and roll of a floating boat from the swell under five points, soft capped like boat_motion.floatMotion */
function rock(b, t, amp, caps) {
  const sp = specOf(b), k = Object.assign({ heave: .1, angle: .06 + .08 * clamp(amp, 0, 1) }, caps || {}), c = Math.cos(b.yaw), s = -Math.sin(b.yaw), hl = sp.L * .5, hw = sp.B * .5;
  const h = (x, z) => swell(x, z, t, amp);
  const hb = h(b.x + c * hl, b.z + s * hl), hs = h(b.x - c * hl, b.z - s * hl), hp = h(b.x - s * hw, b.z + c * hw), hq = h(b.x + s * hw, b.z - c * hw);
  return { heave: k.heave * Math.tanh(h(b.x, b.z) / .08), pitch: k.angle * Math.tanh(Math.atan((hb - hs) / sp.L) / k.angle), roll: k.angle * Math.tanh(Math.atan((hp - hq) / sp.B) / k.angle) };
}

/* ---- load and capacity ---- */
/* put n units of one kind aboard from a stock; returns { boat, stock, moved } (pure, new objects) */
function loadFromStock(b, stock, kind, n) {
  if (!STOCK_IDS.includes(kind)) return { boat: b, stock, moved: 0 };
  const room = capacityOf(b) - loadTotal(b), have = stock[kind] || 0, m = Math.max(0, Math.min(Math.round(n), room, have));
  if (!m) return { boat: b, stock, moved: 0 };
  return { boat: Object.assign({}, b, { load: Object.assign({}, b.load, { [kind]: (b.load[kind] || 0) + m }) }), stock: Object.assign({}, stock, { [kind]: have - m }), moved: m };
}
/* take everything off the boat into the stock (the stock holds at most STOCK_CAP of a kind; what does not fit stays aboard) */
function unloadToStock(b, stock) {
  let moved = 0; const st = Object.assign({}, stock), ld = Object.assign({}, b.load);
  for (const k of STOCK_IDS) { const have = ld[k] || 0; if (!have) continue; const m = Math.min(have, STOCK_CAP - (st[k] || 0)); if (m <= 0) continue; st[k] = (st[k] || 0) + m; ld[k] = have - m; moved += m; }
  return { boat: Object.assign({}, b, { load: ld, trips: moved ? b.trips + 1 : b.trips }), stock: st, moved };
}
/* put a found cache aboard as far as it fits; returns { boat, taken, left } */
function takeCache(b, cache) {
  let room = capacityOf(b) - loadTotal(b); const ld = Object.assign({}, b.load), left = {}; let taken = 0;
  for (const k of STOCK_IDS) { const n = cache.units && cache.units[k] || 0; if (!n) continue; const m = Math.min(n, room); ld[k] = (ld[k] || 0) + m; room -= m; taken += m; if (n - m) left[k] = n - m; }
  return { boat: Object.assign({}, b, { load: ld }), taken, left };
}

/* ---- the skerry cache: a small crate wedged on the outer skerry, new each game day, by seed. The first one also holds a small outboard motor wrapped in oilcloth (the engine part). ---- */
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
function cacheFor(seed, day, first) {
  const R = mulberry(hashStr('skerry:' + (seed >>> 0) + ':' + day)), kinds = ['planks', 'planks', 'rope', 'glass', 'metal'], k1 = kinds[Math.floor(R() * kinds.length)], k2 = kinds[Math.floor(R() * kinds.length)], units = {};
  if (first) { units.planks = 2; units[k1 === 'planks' ? 'rope' : k1] = 1; }   /* the first one: two planks and one other thing (3 units, so a rowing boat of 4 takes it all) */
  else { units[k1] = 2; if (R() < .55) units[k2] = (units[k2] || 0) + 1; }
  const n = STOCK_IDS.reduce((a, k) => a + (units[k] || 0), 0);
  return { day, units, n, engine: !!first, text: first ? 'A crate wedged high on the skerry, and beside it a small motor wrapped in oilcloth. Dry inside.' : 'A crate the tide left on the skerry.' };
}
/* has the cache of this day been taken? cacheDay holds the last day taken, 0 = never */
const cacheReady = (b, day) => b.cacheDay < day;
function cacheNow(b, seed, day) { if (!cacheReady(b, day)) return null; return cacheFor(seed, day, !b.got.engine); }
/* take the skerry cache: loads what fits, marks the day, fits no motor yet (the player fits it at a landing) */
function collectCache(b, seed, day) {
  const c = cacheNow(b, seed, day); if (!c) return { ok: false, why: 'The skerry has nothing new today.', boat: b };
  if (capacityOf(b) - loadTotal(b) < c.n) return { ok: false, why: 'The boat is too full for the crate. Land and unload first.', boat: b };
  const r = takeCache(b, c), part = c.engine ? true : b.part;
  return { ok: true, boat: Object.assign({}, r.boat, { cacheDay: day, part, got: Object.assign({}, b.got, { engine: b.got.engine || c.engine }) }), taken: r.taken, left: r.left, cache: c };
}
/* fit the small motor: needs the part in hand */
function fitEngine(b) { if (b.engine) return { ok: false, why: 'The motor is already fitted.', boat: b }; if (!b.part) return { ok: false, why: 'No motor part yet.', boat: b }; return { ok: true, boat: Object.assign({}, b, { engine: true, part: false }) }; }

/* ---- landings ---- */
/* a landing: { id, name, x, z, r }. The nearest one the boat is within r of, or null */
function nearestLanding(b, list) {
  let best = null, bd = 1e9; for (const L of list || []) { const d = Math.hypot(L.x - b.x, L.z - b.z); if (d < bd) { bd = d; best = L; } }
  return best ? { landing: best, d: bd, near: bd <= best.r } : null;
}
const canDock = (b, L) => !!L && Math.hypot(L.x - b.x, L.z - b.z) <= L.r && Math.abs(b.u) < 3;

/* ---- the autopilot: steer and throttle toward a point (for tapping the water and for the errand) ---- */
function autopilot(b, tx, tz, opts) {
  const o = Object.assign({ arrive: 2.2, slow: 7 }, opts || {}), sp = specOf(b), dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
  if (d < o.arrive) return { steer: 0, throttle: 0, done: true, d };
  const want = Math.atan2(-dz, dx), err = wrap(want - b.yaw);                   /* err > 0: the target is to port */
  const steer = clamp(-err * 1.6, -1, 1);
  let throttle = Math.abs(err) > 1.9 ? .25 : 1;
  throttle *= clamp((d - o.arrive) / (o.slow), .25, 1) * (1 - .45 * Math.abs(steer));
  return { steer, throttle: clamp(throttle, .2, 1), done: false, d };
}
/* direct heading control for a thumb stick: the stick's world direction is the wanted heading, its length the power. The boat turns toward it; with no stick it lets the throttle go. */
function headingControl(b, wantYaw, power) {
  if (!(power > .08)) return { steer: 0, throttle: 0 };
  const err = wrap(wantYaw - b.yaw), steer = clamp(-err * 1.8, -1, 1);
  const th = Math.abs(err) > 2.4 ? -.3 * power : power * (1 - .55 * Math.min(1, Math.abs(err) / 1.6));   /* a stick pulled straight back brakes and backs */
  return { steer, throttle: clamp(th, -1, 1) };
}

/* ---- path finding on a coarse grid (A*, eight neighbours), for the errand and for a tapped destination that lies round a corner. isWater(x,z) says whether a cell centre is safe. ---- */
function findPath(isWater, a, bpt, o) {
  o = Object.assign({ cell: 3, R: 126 }, o || {});
  const n = Math.ceil(2 * o.R / o.cell), gx = x => clamp(Math.round((x + o.R) / o.cell), 0, n - 1), gz = z => clamp(Math.round((z + o.R) / o.cell), 0, n - 1), cx = i => i * o.cell - o.R;
  const key = (i, j) => j * n + i, water = new Map(), W = (i, j) => { const k = key(i, j); let v = water.get(k); if (v === undefined) { v = !!isWater(cx(i), cx(j)); water.set(k, v); } return v; };
  const si = gx(a.x), sj = gz(a.z); let ei = gx(bpt.x), ej = gz(bpt.z);
  if (!W(ei, ej)) {   /* the goal cell is not water: take the nearest water cell around it */
    let best = null, bd = 1e9; for (let r = 1; r < 12 && !best; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) { const i = ei + di, j = ej + dj; if (i < 0 || j < 0 || i >= n || j >= n || !W(i, j)) continue; const d = Math.hypot(di, dj); if (d < bd) { bd = d; best = [i, j]; } }
    if (!best) return null; ei = best[0]; ej = best[1];
  }
  const open = [[Math.hypot(si - ei, sj - ej), 0, si, sj]], g = new Map([[key(si, sj), 0]]), from = new Map(), closed = new Set();
  const pop = () => { let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i; return open.splice(bi, 1)[0]; };
  let found = false, guard = 0;
  while (open.length && guard++ < 20000) {
    const [, gc, i, j] = pop(), k = key(i, j); if (closed.has(k)) continue; closed.add(k);
    if (i === ei && j === ej) { found = true; break; }
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue; const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
      if (!(ni === si && nj === sj) && !W(ni, nj)) continue; if (di && dj && (!W(i + di, j) || !W(i, j + dj))) continue;   /* no cutting a corner of land */
      const nk = key(ni, nj), ng = gc + (di && dj ? 1.414 : 1); if (g.has(nk) && g.get(nk) <= ng) continue; g.set(nk, ng); from.set(nk, k); open.push([ng + Math.hypot(ni - ei, nj - ej), ng, ni, nj]);
    }
  }
  if (!found) return null;
  let cur = key(ei, ej); const cells = [];
  while (cur !== undefined) { cells.push([cx(cur % n), cx(Math.floor(cur / n))]); cur = from.get(cur); }
  cells.reverse(); cells[0] = [a.x, a.z]; if (Math.hypot(cells[cells.length - 1][0] - bpt.x, cells[cells.length - 1][1] - bpt.z) < o.cell * 3) cells[cells.length - 1] = [bpt.x, bpt.z];
  /* string pulling: drop a waypoint when the straight line to the next one is all water */
  const clear = (p, q) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]), m = Math.max(2, Math.ceil(L / (o.cell * .5))); for (let t = 1; t < m; t++) { const x = p[0] + (q[0] - p[0]) * t / m, z = p[1] + (q[1] - p[1]) * t / m; if (!isWater(x, z)) return false; } return true; };
  const out = [cells[0]]; let at = 0;
  while (at < cells.length - 1) { let nx = at + 1; for (let k = cells.length - 1; k > at + 1; k--) if (clear(cells[at], cells[k])) { nx = k; break; } out.push(cells[nx]); at = nx; }
  return out;
}

/* ---- the errand stub (off by default): the boat is rowed along a fixed path to the skerry and back by a worker nobody sees: no name, no trail, no count of who. ---- */
const ERRAND = { pause: 6 };                 /* seconds at the skerry (TUNING) */
function errandNew(path) { return { phase: 'out', path: path.map(p => p.slice()), back: path.slice().reverse().map(p => p.slice()), i: 1, wait: 0, done: false }; }
/* advance the errand one step: sets the autopilot input; returns { input, phase, arrived } */
function errandStep(e, b, dt) {
  if (!e || e.done) return { input: { steer: 0, throttle: 0 }, phase: 'idle', arrived: false };
  const pts = e.phase === 'out' ? e.path : e.back;
  if (e.phase === 'wait') { e.wait -= dt; if (e.wait <= 0) { e.phase = 'back'; e.i = 1; } return { input: { steer: 0, throttle: 0 }, phase: 'wait', arrived: false }; }
  const tp = pts[Math.min(e.i, pts.length - 1)], ap = autopilot(b, tp[0], tp[1], { arrive: e.i >= pts.length - 1 ? 2.4 : 3.2, slow: e.i >= pts.length - 1 ? 7 : 1 });
  if (ap.done) { if (e.i < pts.length - 1) e.i++; else if (e.phase === 'out') { e.phase = 'wait'; e.wait = ERRAND.pause; return { input: { steer: 0, throttle: 0 }, phase: 'wait', arrived: true }; } else { e.phase = 'home'; e.done = true; return { input: { steer: 0, throttle: 0 }, phase: 'home', arrived: true }; } }
  return { input: { steer: ap.steer, throttle: ap.throttle }, phase: e.phase, arrived: false };
}

/* ---- the save: the boat's part of the gift save. Lenient: missing or odd values become the defaults. ---- */
function sanitize(o) {
  const b = newBoat(), num = (v, d, lo, hi) => typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : d;
  if (!o || typeof o !== 'object') return b;
  b.x = num(o.x, 0, -400, 400); b.z = num(o.z, 0, -400, 400); b.yaw = wrap(num(o.yaw, 0, -20, 20));
  b.engine = o.engine === true; b.part = o.part === true && !b.engine; b.avail = o.avail === true; b.at = typeof o.at === 'string' && /^[a-z]{1,12}$/.test(o.at) ? o.at : null;
  b.trips = Math.round(num(o.trips, 0, 0, 9999)); b.cacheDay = Math.round(num(o.cacheDay, 0, 0, 9999)); b.errands = Math.round(num(o.errands, 0, 0, 9999));
  b.got = { engine: !!(o.got && o.got.engine) || b.engine || b.part };
  let room = capacityOf(b); if (o.load && typeof o.load === 'object') for (const k of STOCK_IDS) { const n = Math.round(num(o.load[k], 0, 0, 99)), m = Math.min(n, room); b.load[k] = m; room -= m; }
  return b;
}
const serializeBoat = b => ({ v: SAVE_VERSION, x: +b.x.toFixed(2), z: +b.z.toFixed(2), yaw: +b.yaw.toFixed(3), engine: !!b.engine, part: !!b.part, avail: !!b.avail, at: b.at || null, load: Object.assign({}, b.load), trips: b.trips, cacheDay: b.cacheDay, errands: b.errands, got: { engine: !!b.got.engine } });

/* ---- the first-trip hint (our own words, short) ---- */
function hintFor(b, day) {
  if (!b.avail) return '';
  if (!b.got.engine && cacheReady(b, day)) return 'A rowing boat lies by the jetty. The outer skerry is a short row to the south-east. Something is wedged there.';
  if (b.part && !b.engine) return 'Land at the jetty or the beach and fit the motor. Tap Dock.';
  if (loadTotal(b) > 0) return 'You have a load. Land at the jetty or the beach, tap Dock, and unload it into the yard stock.';
  if (cacheReady(b, day)) return 'A new crate has come ashore on the skerry.';
  return 'The skerry is empty until tomorrow. The bay is yours.';
}
/* the one-line speed word for the HUD */
function speedWord(b) { const sp = specOf(b), f = Math.abs(b.u) / sp.maxSpeed; return f < .04 ? 'still' : f < .35 ? 'slow' : f < .7 ? 'steady' : 'fast'; }

/* ---- the preset fix (see ultra.js deviceStepDown for the pure rule) ---- */
const CORE = { SPECS, specOf, STOCK_IDS, STOCK_CAP, LAND_DEPTH, SHALLOW_MIN, SAVE_VERSION, WIND_LEEWAY, ERRAND, newBoat, loadTotal, capacityOf, hullDepth, step, swell, rock, loadFromStock, unloadToStock, takeCache, cacheFor, cacheReady, cacheNow, collectCache, fitEngine,
  nearestLanding, canDock, autopilot, headingControl, findPath, errandNew, errandStep, sanitize, serializeBoat, hintFor, speedWord, wrap, clamp, mulberry, hashStr };
if (typeof module !== 'undefined' && module.exports) module.exports = CORE;
root.LI_BOAT_DRIVE = root.LI_BOAT_DRIVE || {}; root.LI_BOAT_DRIVE.core = CORE;
Object.assign(root.LI_BOAT_DRIVE, CORE);

/* ====================================================================== PART B: the page layer ====================================================================== */
if (typeof window === 'undefined' || typeof document === 'undefined') return;
const Q0 = new URLSearchParams(location.search);
if (Q0.get('game') !== 'gift' || Q0.get('boat') === '0') { root.LI_BOAT_DRIVE.attach = function () { return null; }; return; }
const K = CORE;
const FORCE_BOAT = Q0.get('boat') === '1';              /* the boat is there from the start (testing and a quick look); otherwise it comes with the first order, in the yard stage */
const ERRAND_ON = Q0.get('errand') === '1';             /* the errand stub: off unless asked for */
const WIND_MS = { clear: 3.5, fair: 6.5, overcast: 7, showers: 9.5, rain: 11, fog: 2, storm: 21, goldenhour: 3 };   /* the weather module's own wind speeds */
const WIND_DIR = (() => { const x = .45, z = -.89, l = Math.hypot(x, z); return { x: x / l, z: z / l }; })();    /* the page's default wind vector (the sea shader's uWind), the way the wind blows TO */
let A = null, C = null, THREE = null;
const P = { ready: false, b: null, mode: 'idle', spec: null, obj: null, lands: [], berths: {}, inp: { steer: 0, throttle: 0 }, kb: { up: 0, down: 0, left: 0, right: 0 }, stick: { on: false, x: 0, y: 0, id: null }, goto: null, gotoMark: null, t: 0, err: [], dock: null,
  fx: null, motor: null, loadG: null, loadSig: '', mounted: null, saveT: 0, hudT: 0, errand: null, firstSeen: false, noteT: 0, boarded: false, cacheMesh: null, cacheLoc: null, scrapeT: 0, lastBump: 0, forced: null, started: false, seals: [], mark: null, trailT: 0, ringT: 0, sprayT: 0, puffT: 0, wasStroke: 0 };

/* ---------------- the page's answers ---------------- */
const tideNow = () => C.tide();
const depthAt = (x, z) => tideNow() - C.H(x, z);
function windNow() { const m = WIND_MS[A.weatherState()]; return { x: WIND_DIR.x, z: WIND_DIR.z, speed: m === undefined ? 6 : m }; }
function seaMood() { return clamp((windNow().speed - 4) / 16, 0, 1); }
const RIM = () => Math.max(40, (C.tableR ? C.tableR() : 122) - 7);
function envNow() { const R = RIM(); return { depth: depthAt, wind: windNow(), sea: seaMood(), t: P.t, inside: (x, z) => x * x + z * z < R * R }; }
const dayNo = () => A.dayNo();

/* ---------------- the CSS and the HUD ---------------- */
const CSS = `
#bd{position:absolute;inset:0;pointer-events:none}
#bd *{box-sizing:border-box}
#bd .bd-pill{background:rgba(251,246,236,.93);border:2px solid #cdbb98;border-radius:14px;padding:6px 10px;pointer-events:auto;color:#2b2118}
#bd-info{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:none;gap:12px;align-items:center;max-width:calc(100vw - 330px);font-variant-numeric:tabular-nums}
#bd-info b{font-size:20px;display:block;line-height:1.1}
#bd-info small{display:block;opacity:.72;font-size:12px}
#bd-info .bd-cell{min-width:60px}
#bd-comp{width:64px;height:64px;flex:none}
#bd-st{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);display:none;max-width:min(520px,calc(100vw - 24px));text-align:center;font-size:15px}
#bd-main{position:absolute;right:14px;bottom:14px;min-height:56px;min-width:116px;padding:8px 14px;line-height:1.15;display:none;pointer-events:auto}
#bd-main small{display:block;font-weight:600;font-size:12px;opacity:.85}
body.dev-touch #bd-main{min-height:60px;min-width:124px}
#bd-stick{position:absolute;left:16px;bottom:16px;width:132px;height:132px;border-radius:50%;background:rgba(251,246,236,.55);border:3px solid rgba(205,187,152,.95);display:none;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none}
#bd-knob{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(47,111,230,.85);border:3px solid #fff;pointer-events:none;transition:transform .06s}
#bd-stick i{position:absolute;font-style:normal;font-size:11px;color:#6a5a3e;opacity:.8}
#bd-stick .u{left:50%;top:5px;transform:translateX(-50%)}#bd-stick .d{left:50%;bottom:5px;transform:translateX(-50%)}
body.bd-on #gd-hint,body.bd-on #campChip{display:none}
body.bd-on #gd-left{bottom:164px}
@media (max-width:700px){#bd-info{left:10px;bottom:164px;transform:none;max-width:calc(100vw - 20px)}#bd-st{bottom:236px}}
`;
function buildHud() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const r = document.createElement('div'); r.id = 'bd'; A.root().appendChild(r);
  r.innerHTML = '<div id="bd-info" class="bd-pill"><svg id="bd-comp" viewBox="-32 -32 64 64" aria-label="Compass and wind"><g id="bd-rose"><circle r="29" fill="#fffaf0" stroke="#cdbb98" stroke-width="2"/><text y="-17" text-anchor="middle" font-size="10" font-weight="700" fill="#7a2a2a" font-family="Georgia,serif">N</text><g id="bd-wind"><path d="M0 -21 L0 9 M-4 -4 L0 -10 L4 -4" stroke="#2b8aa8" stroke-width="2.2" fill="none" stroke-linecap="round"/></g><g id="bd-head"><path d="M0 -24 L7 6 L0 2 L-7 6 Z" fill="#2f6fe6" stroke="#fff" stroke-width="1.2"/></g></g></svg><div class="bd-cell"><b id="bd-spd">0.0</b><small id="bd-spw">still, m/s</small></div><div class="bd-cell"><b id="bd-load">0 / 4</b><small id="bd-lw">load</small></div></div><div id="bd-st" class="bd-pill"></div><button id="bd-main" type="button" class="gd-btn pri"></button><div id="bd-stick" aria-label="Boat stick"><i class="u">ahead</i><i class="d">back</i><div id="bd-knob"></div></div>';
  for (const k of ['info', 'st', 'main', 'stick', 'knob', 'spd', 'spw', 'load', 'lw', 'rose', 'wind', 'head']) P['e_' + k] = document.getElementById('bd-' + k);
  const m = P.e_main; m.addEventListener('click', e => { e.stopPropagation(); mainPress(); });
  /* the stick: it gives the heading you want (on the screen) and the power; let go and the boat coasts */
  const s = P.e_stick, kn = P.e_knob;
  const upd = e => { const r2 = s.getBoundingClientRect(), R = r2.width / 2, dx = (e.clientX - (r2.left + R)) / R, dy = (e.clientY - (r2.top + R)) / R; let l = Math.hypot(dx, dy); const k = l > 1 ? 1 / l : 1; P.stick.x = dx * k; P.stick.y = -dy * k; kn.style.transform = 'translate(' + (P.stick.x * R * .72) + 'px,' + (-P.stick.y * R * .72) + 'px)'; };
  s.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); try { s.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } P.stick.on = true; P.stick.id = e.pointerId; P.goto = null; upd(e); });
  s.addEventListener('pointermove', e => { if (P.stick.on && e.pointerId === P.stick.id) { e.stopPropagation(); upd(e); } });
  const end = e => { if (e.pointerId !== P.stick.id) return; P.stick.on = false; P.stick.x = 0; P.stick.y = 0; kn.style.transform = ''; };
  s.addEventListener('pointerup', end); s.addEventListener('pointercancel', end); s.addEventListener('lostpointercapture', end);
  ['pointerdown', 'pointerup'].forEach(n => P.e_main.addEventListener(n, e => e.stopPropagation()));
}
function setNote(t) {
  const e = P.e_st; if (!e) return; if (!t) { e.style.display = 'none'; P.noteText = ''; return; }
  if (P.noteText !== t) { e.textContent = t; P.noteText = t; } e.style.display = 'block';
}

/* ---------------- the controls: keys, the stick, a tap on the water ---------------- */
function wireKeys() {
  const map = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
  const typing = () => { const a = document.activeElement; return a && /^(SELECT|INPUT|TEXTAREA)$/.test(a.tagName); };
  addEventListener('keydown', e => {
    if (typing() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (map[e.key] && P.mode === 'drive') { P.kb[map[e.key]] = 1; P.goto = null; e.preventDefault(); }
    else if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && (P.mode === 'drive' || P.mode === 'docked') && !A.cardOpen()) { mainPress(); }
    else if (e.key === ' ' && P.mode === 'drive') { P.kb.up = 0; P.kb.down = 0; P.goto = null; e.preventDefault(); }
  });
  addEventListener('keyup', e => { if (map[e.key]) P.kb[map[e.key]] = 0; });
  addEventListener('blur', () => { P.kb.up = P.kb.down = P.kb.left = P.kb.right = 0; });
}
function wireTaps() {
  const el = C.renderer.domElement; let down = null; const ray = new THREE.Raycaster(), v = new THREE.Vector3(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId }; }, true);
  el.addEventListener('pointerup', e => {
    const d = down; down = null; if (!d || P.mode !== 'drive' || A.cardOpen()) return; if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || e.timeStamp - d.t > 700) return;
    try { if (A.targets().some(t => Math.hypot(t.x - e.clientX, t.y - e.clientY) < t.r * .8)) return; } catch (x) { /* none */ }
    const r = el.getBoundingClientRect(); ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -((e.clientY - r.top) / r.height * 2 - 1) }, C.camera); plane.constant = -tideNow();
    if (ray.ray.intersectPlane(plane, v)) goTo(v.x, v.z, true);
  }, true);
}
function safeWater(x, z) { const t = tideNow(); return t - C.H(x, z) >= .9 && t - C.H(x + 2.4, z) >= .7 && t - C.H(x - 2.4, z) >= .7 && t - C.H(x, z + 2.4) >= .7 && t - C.H(x, z - 2.4) >= .7 && Math.hypot(x, z) < RIM() - 3; }
/* water the boat may plan through: deep enough all round, and within 14 m of the start or the goal the hull only has to float (a berth is shallow by nature) */
function pathWater(a, bpt) { return (x, z) => safeWater(x, z) || (depthAt(x, z) >= .3 && (Math.hypot(x - a.x, z - a.z) < 14 || Math.hypot(x - bpt.x, z - bpt.z) < 14)); }
function goTo(x, z, tap) {
  const b = P.b; if (depthAt(x, z) < .45) { if (tap) A.toast('That is land. Tap on the water.', 2200); return false; }
  const pw = pathWater({ x: b.x, z: b.z }, { x, z });
  let pts = null; const clear = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), m = Math.max(2, Math.ceil(L / 1.5)); for (let i = 1; i < m; i++) if (!pw(ax + (bx - ax) * i / m, az + (bz - az) * i / m)) return false; return true; };
  if (clear(b.x, b.z, x, z)) pts = [[b.x, b.z], [x, z]]; else pts = K.findPath(pw, { x: b.x, z: b.z }, { x, z }, { cell: 3, R: RIM() + 4 });
  if (!pts) { if (tap) A.toast('No clear way there at this tide.', 2600); return false; }
  P.goto = { pts, i: 1 }; if (P.gotoMark) { P.gotoMark.visible = true; P.gotoMark.position.set(x, tideNow() + .06, z); } return true;
}
function readInput(b) {
  const S = P.stick;
  if (P.forced) return P.forced;
  if (S.on && Math.hypot(S.x, S.y) > .1) {
    const th = C.cam.theta, ux = -Math.sin(th), uz = -Math.cos(th), rx = Math.cos(th), rz = -Math.sin(th), wx = rx * S.x + ux * S.y, wz = rz * S.x + uz * S.y;
    return K.headingControl(b, Math.atan2(-wz, wx), clamp(Math.hypot(S.x, S.y), 0, 1));
  }
  const k = P.kb; if (k.up || k.down || k.left || k.right) return { steer: (k.right - k.left), throttle: k.up - k.down };
  if (P.goto) { const g = P.goto, tp = g.pts[Math.min(g.i, g.pts.length - 1)], last = g.i >= g.pts.length - 1, ap = K.autopilot(b, tp[0], tp[1], { arrive: last ? 2.4 : 3.4, slow: last ? 7 : 1 }); if (ap.done) { if (last) { P.goto = null; if (P.gotoMark) P.gotoMark.visible = false; return { steer: 0, throttle: 0 }; } g.i++; } return { steer: ap.steer, throttle: ap.throttle }; }
  return { steer: 0, throttle: 0 };
}

/* ---------------- landings and berths ---------------- */
function berthYaw(fx, fz) { return Math.atan2(-fz, fx); }
function berthSearch(x0, z0, dx, dz, yaw, kmax) {   /* march seaward from a point until the hull floats with room to spare; the tide moves the answer */
  const env = envNow(); for (let k = 0; k <= kmax; k += .5) { const t = { x: x0 + dx * k, z: z0 + dz * k, yaw, engine: P.b ? P.b.engine : false }; if (K.hullDepth(t, env) >= .42) return { x: t.x, z: t.z, yaw }; }
  return { x: x0 + dx * kmax, z: z0 + dz * kmax, yaw };
}
function computeLandings() {
  const S = A.spots(); if (!S) return false; const L = [], li = C.li(), W = C.W;
  const d = W.camp && W.camp.dir ? W.camp.dir : [1, 0], wp = S.tender.wp;
  L.push({ id: 'beach', name: 'the beach landing', x: wp.x + d[0] * 3, z: wp.z + d[1] * 3, r: 12, sx: wp.x, sz: wp.z, dx: d[0], dz: d[1], yaw: Math.atan2(d[1], -d[0]) });
  try {
    const rp = li.repair, site = rp && rp.site(); if (site) {
      const cands = []; for (const lx of [2.4, 3.6, 4.8, 6.0, 7.2]) for (const lz of [2.4, -2.7, 0]) { if (lz === 0 && lx < 5.4) continue; if (lz < 0 && lx > 1.0 && lx < 4.8) continue; const p = rp.local(lx, 0, lz); cands.push({ x: p[0], z: p[2], lx, lz }); }   /* the far side of the deck from the repair mooring, or beyond the tip */
      const lowD = c => K.hullDepth({ x: c.x, z: c.z, yaw: site.psi, engine: false }, { depth: (x, z) => -.5 - C.H(x, z) });   /* the nearest berth that still floats a rowing boat with the tide half a metre below the mean */
      cands.forEach(c => { c.d = lowD(c); }); const good = cands.filter(c => c.d >= .45).sort((a, b) => a.lx - b.lx), c = good[0] || cands.sort((a, b) => b.d - a.d)[0];
      L.push({ id: 'jetty', name: 'the jetty', x: c.x, z: c.z, r: 9, fixed: true, yaw: site.psi });
    }
  } catch (e) { /* no jetty yet */ }
  const M = C.man ? C.man() : null, sk = M && M.gift ? M.gift.skerries[1] : [72, 46];
  /* the skerry: the crate sits on the highest dry ground near the seals' rock, the berth is open water close to it */
  let best = null; for (let r = 0; r <= 9; r += 1) for (let a = 0; a < 24; a++) { const x = sk[0] + Math.cos(a * .2618) * r, z = sk[1] + Math.sin(a * .2618) * r, h = C.H(x, z); if (h < .5) continue; const sd = Math.hypot(x - (sk[0] - 1), z - (sk[1] + .9)), sd2 = Math.hypot(x - (sk[0] + 1.4), z - (sk[1] - .8)); if (Math.min(sd, sd2) < 2.6) continue; const sc = h - Math.hypot(x - sk[0], z - sk[1]) * .05; if (!best || sc > best.sc) best = { x, z, h, sc }; }
  if (!best) best = { x: sk[0] + 2.5, z: sk[1] - 2.5, h: Math.max(.6, C.H(sk[0] + 2.5, sk[1] - 2.5)) };
  P.cacheLoc = best;
  let wb = null; const toward = Math.atan2(-(0 - best.z), 0 - best.x); /* prefer the side that faces the island centre */
  for (let r = 3; r <= 16 && !wb; r += 1) for (let a = 0; a < 36; a++) { const ang = a * .1745 + toward * 0, x = best.x + Math.cos(ang) * r, z = best.z + Math.sin(ang) * r; const yw = berthYaw(best.x - x, best.z - z); if (K.hullDepth({ x, z, yaw: yw, engine: true }, { depth: (xx, zz) => -1.1 - C.H(xx, zz) }) >= .5) { const sc = r + Math.hypot(x, z) * .02; if (!wb || sc < wb.sc) wb = { x, z, sc, yaw: yw }; } if (wb) break; }
  if (!wb) wb = { x: best.x - 5, z: best.z - 5, sc: 0, yaw: 0 };
  L.push({ id: 'skerry', name: 'the skerry', x: wb.x, z: wb.z, r: 11, fixed: true, yaw: wb.yaw, crate: best });
  P.lands = L; return true;
}
function berthFor(L) { if (L.fixed) return { x: L.x, z: L.z, yaw: L.yaw }; return berthSearch(L.sx, L.sz, L.dx, L.dz, L.yaw, 18); }

/* ---------------- the boat in the scene ---------------- */
function mat(col, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: col, roughness: .8, metalness: .05, flatShading: true }, o || {})); }
function mkMotor() {
  const g = new THREE.Group();
  const cowl = new THREE.Mesh(new THREE.BoxGeometry(.4, .46, .3), mat(0x3b4a53)); cowl.position.set(0, .86, 0); g.add(cowl);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(.3, .08, .24), mat(0xc2503f)); cap.position.set(.02, 1.13, 0); g.add(cap);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(.12, .8, .14), mat(0x2e3a41)); leg.position.set(-.04, .3, 0); g.add(leg);
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(.09, .07, .36, 6), mat(0x2e3a41)); pod.rotation.z = Math.PI / 2; pod.position.set(-.1, -.1, 0); g.add(pod);
  const prop = new THREE.Mesh(new THREE.BoxGeometry(.03, .34, .06), mat(0xb9a98a)); prop.position.set(-.3, -.1, 0); g.add(prop); g.userData.prop = prop;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(.9, .04, .05), mat(0x5b4a33)); bar.position.set(.5, .9, 0); g.add(bar);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
const LOAD_COL = { planks: 0xb9955e, rope: 0xd6c79a, glass: 0x58b8a4, metal: 0x8d979c };
function rebuildLoad() {
  const b = P.b, sig = JSON.stringify(b.load) + b.engine; if (sig === P.loadSig && P.loadG) return; P.loadSig = sig;
  if (P.loadG) { P.loadG.traverse(o => { if (o.geometry) o.geometry.dispose(); }); if (P.loadG.parent) P.loadG.parent.remove(P.loadG); }
  const g = new THREE.Group(); let i = 0;
  for (const k of K.STOCK_IDS) for (let n = 0; n < (b.load[k] || 0); n++) {
    const c = i % 4, rw = Math.floor(i / 4), m = new THREE.Mesh(k === 'planks' ? new THREE.BoxGeometry(.7, .14, .22) : k === 'glass' ? new THREE.SphereGeometry(.17, 7, 5) : k === 'rope' ? new THREE.TorusGeometry(.14, .06, 5, 9) : new THREE.CylinderGeometry(.15, .15, .3, 8), mat(LOAD_COL[k]));
    if (k === 'rope') m.rotation.x = Math.PI / 2; m.position.set(-.5 + (c % 2) * .55 + (rw ? .1 : 0), .24 + rw * .2, (c < 2 ? -.2 : .2)); m.rotation.y = (i * 1.7) % 1.2; m.castShadow = true; g.add(m); i++;
  }
  P.loadG = g; if (P.mounted) P.mounted.add(g);
}
function ensureObj() {
  const li = C.li(); if (!li.xboat) return null;
  if (!P.spec) {
    if (!li.xboat.ready()) return null; const b = P.b, bt = P.berths.start || { x: b.x, z: b.z, yaw: b.yaw };
    P.spec = { kind: 'moored', forceKind: 'dinghy', x: bt.x, z: bt.z, yaw: bt.yaw, L: 4.4, Wd: 1.5, Hh: .6, hull: [.8, .78, .72], stripe: [.3, .38, .42], ph: .3, seed: 5, dy: tideNow() - .18, dpt: 0, drl: 0, rowing: true, oar: { sweep: 0, lift: 0 } };
    li.xboat.add(P.spec);
  }
  const o = li.xboat.obj(0); if (!o) return null;
  if (o !== P.obj || o.mesh !== P.mounted) {   /* the boats were rebuilt (the kit finished loading): hang the motor and the load on the new hull */
    P.obj = o; P.mounted = o.mesh; if (P.motor && P.motor.parent) P.motor.parent.remove(P.motor); P.motor = mkMotor(); P.motor.position.set(-2.12, .0, 0); P.motor.visible = P.b.engine; o.mesh.add(P.motor);
    P.loadSig = ''; P.loadG = null; rebuildLoad();
  }
  return o;
}

/* ---------------- the water effects: one mesh, one draw call: foam, rings, spray and exhaust puffs as quads in a pool ---------------- */
const FX_N = { foam: 44, ring: 14, spray: 30, puff: 16 };
function buildFx() {
  const N = FX_N.foam + FX_N.ring + FX_N.spray + FX_N.puff, pos = new Float32Array(N * 12), uv = new Float32Array(N * 8), col = new Float32Array(N * 16), idx = new Uint16Array(N * 6);
  for (let i = 0; i < N; i++) { idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 4)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.45, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const gr2 = x.createRadialGradient(96, 32, 17, 96, 32, 31); gr2.addColorStop(0, 'rgba(255,255,255,0)'); gr2.addColorStop(.55, 'rgba(255,255,255,.95)'); gr2.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr2; x.fillRect(64, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, fog: false });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 7; mesh.name = 'boat_fx';
  const kinds = [['foam', FX_N.foam], ['ring', FX_N.ring], ['spray', FX_N.spray], ['puff', FX_N.puff]], parts = []; let o = 0;
  for (const [k, n] of kinds) for (let i = 0; i < n; i++) parts.push({ k, slot: o++, on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1, s0: 1, s1: 1, a0: 1, rot: 0, tint: [1, 1, 1] });
  P.fx = { mesh, g, parts, pos, uv, col, N, next: { foam: 0, ring: 0, spray: 0, puff: 0 }, base: { foam: 0, ring: FX_N.foam, spray: FX_N.foam + FX_N.ring, puff: FX_N.foam + FX_N.ring + FX_N.spray }, light: 1 };
  P.group.add(mesh);
}
function fxSpawn(kind, o) {
  const F = P.fx, n = FX_N[kind], i = F.next[kind]; F.next[kind] = (i + 1) % n; const p = F.parts[F.base[kind] + i]; Object.assign(p, { on: true, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 1, s0: 1, s1: 1, a0: 1, rot: 0, tint: [1, 1, 1] }, o); return p;
}
function fxUpdate(dt) {
  const F = P.fx, cam = C.camera, cr = new THREE.Vector3(), cu = new THREE.Vector3(); cam.matrixWorld.extractBasis(cr, cu, new THREE.Vector3());
  const pos = F.pos, uv = F.uv, col = F.col, lt = F.light, sea = tideNow();
  for (const p of F.parts) {
    const s = p.slot; let a = 0;
    if (p.on) { p.age += dt; if (p.age >= p.life) p.on = false; else { const u = p.age / p.life; p.x += p.vx * dt; p.z += p.vz * dt; if (p.k === 'spray') { p.vy -= 6.5 * dt; p.y += p.vy * dt; if (p.y < sea + .02) { p.on = false; } } else if (p.k === 'puff') { p.y += p.vy * dt; p.vx *= .97; p.vz *= .97; } else p.y = sea + .045 + (p.k === 'ring' ? .01 : 0);
      a = p.a0 * (u < .12 ? u / .12 : 1) * (1 - u) * (1 - u * .3); const sz = (p.s0 + (p.s1 - p.s0) * Math.sqrt(u)) * .5;
      let ax, ay, az, bx, by, bz;
      if (p.k === 'foam' || p.k === 'ring') { const c = Math.cos(p.rot), si = Math.sin(p.rot); ax = c * sz; az = si * sz; bx = -si * sz; bz = c * sz; ay = by = 0; }
      else { ax = cr.x * sz; ay = cr.y * sz; az = cr.z * sz; bx = cu.x * sz; by = cu.y * sz; bz = cu.z * sz; }
      const o = s * 12, ux0 = p.k === 'ring' ? .5 : 0, ux1 = p.k === 'ring' ? 1 : .5, q = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (let k = 0; k < 4; k++) { const [m1, m2] = q[k]; pos[o + k * 3] = p.x + ax * m1 + bx * m2; pos[o + k * 3 + 1] = p.y + ay * m1 + by * m2; pos[o + k * 3 + 2] = p.z + az * m1 + bz * m2; uv[s * 8 + k * 2] = m1 < 0 ? ux0 : ux1; uv[s * 8 + k * 2 + 1] = m2 < 0 ? 0 : 1; }
      for (let k = 0; k < 4; k++) { const o2 = s * 16 + k * 4; col[o2] = p.tint[0] * lt; col[o2 + 1] = p.tint[1] * lt; col[o2 + 2] = p.tint[2] * lt; col[o2 + 3] = a; } continue; } }
    for (let k = 0; k < 4; k++) col[s * 16 + k * 4 + 3] = 0;
    for (let k = 0; k < 12; k++) pos[s * 12 + k] = 0;
  }
  F.g.attributes.position.needsUpdate = true; F.g.attributes.uv.needsUpdate = true; F.g.attributes.color.needsUpdate = true;
}
function fxActive() { return P.fx ? P.fx.parts.filter(p => p.on).length : 0; }
function fxEmit(dt) {
  const b = P.b, sp = K.specOf(b), speed = Math.abs(b.u), fx = P.fx, c = Math.cos(b.yaw), s = -Math.sin(b.yaw), sx = -s, sz = c, sea = seaMood(), ar = A.isAR && A.isAR(), k = ar ? .5 : 1;
  const sternX = b.x - c * 2.1, sternZ = b.z - s * 2.1, bowX = b.x + c * 2.15, bowZ = b.z + s * 2.15, tintD = [1, 1, 1];
  fx.light = A.isNight() ? .38 : 1;
  const fr = clamp(speed / sp.maxSpeed, 0, 1);
  if (speed > .35 && !b.grounded) {   /* the wake: foam from the quarters, a patch in the middle of the stern, strong with the motor, a faint pair of swirls with oars */
    P.trailT -= dt; const every = b.engine ? .055 : .16; if (P.trailT <= 0) { P.trailT = every / k;
      for (const side of [-1, 1]) { const sp2 = b.engine ? .55 + 1.1 * fr : .22; fxSpawn('foam', { x: sternX + sx * side * .45, z: sternZ + sz * side * .45, vx: sx * side * sp2 - c * speed * .12, vz: sz * side * sp2 - s * speed * .12, life: b.engine ? 3.4 : 2.4, s0: b.engine ? .7 : .5, s1: b.engine ? 2.0 + fr * 1.2 : 1.2, a0: b.engine ? .34 + .3 * fr : .18, rot: Math.random() * 6 }); }
      if (b.engine) fxSpawn('foam', { x: sternX - c * .3, z: sternZ - s * .3, vx: -c * speed * .08, vz: -s * speed * .08, life: 3.0, s0: .8, s1: 1.8 + fr, a0: .5 + .25 * fr, rot: Math.random() * 6 });
    }
    P.ringT -= dt; if (P.ringT <= 0) { P.ringT = (b.engine ? .38 : .9) / k; fxSpawn('ring', { x: sternX, z: sternZ, life: b.engine ? 2.8 : 2.4, s0: .6, s1: b.engine ? 6.5 : 4.2, a0: b.engine ? .55 : .4, rot: 0 }); }
    if (b.engine && speed > 3.2) { P.sprayT -= dt; if (P.sprayT <= 0) { P.sprayT = (.045 - .02 * sea) / k; for (const side of [-1, 1]) fxSpawn('spray', { x: bowX + sx * side * .12, y: tideNow() + .22, z: bowZ + sz * side * .12, vx: sx * side * (1.3 + Math.random() * .8) + c * speed * .35, vz: sz * side * (1.3 + Math.random() * .8) + s * speed * .35, vy: 1.6 + Math.random() * 1.6 + sea, life: .62, s0: .28, s1: .13, a0: .85 }); } }
  }
  if (!b.engine && P.rowCatch) { P.rowCatch = false; for (const side of [-1, 1]) { const ox = b.x + sx * side * 1.1 - c * .2, oz = b.z + sz * side * 1.1 - s * .2; fxSpawn('ring', { x: ox, z: oz, life: 1.7, s0: .25, s1: 1.7, a0: .5, rot: 0 }); fxSpawn('foam', { x: ox, z: oz, vx: -c * .25, vz: -s * .25, life: 1.6, s0: .3, s1: .7, a0: .4, rot: Math.random() * 6 }); } }
  if (b.engine && P.motor && speed + Math.abs(P.inp.throttle) > .05 && Math.abs(P.inp.throttle) > .1) {   /* the engine only: a small grey puff at the motor, drifting up and back */
    P.puffT -= dt; if (P.puffT <= 0) { P.puffT = (.16 - .06 * fr) / k; fxSpawn('puff', { x: b.x - c * 2.15, y: tideNow() + 1.12, z: b.z - s * 2.15, vx: -c * (.5 + fr) + (Math.random() - .5) * .3, vz: -s * (.5 + fr) + (Math.random() - .5) * .3, vy: .5 + Math.random() * .3, life: 1.15, s0: .12, s1: .55, a0: .38, tint: [.68, .7, .72] }); }
  }
}

/* ---------------- the state, the save ---------------- */
function availNow() { const s = A.S(); return FORCE_BOAT || !!s.ordered || !!(s.boat && s.boat.avail); }
function commit(toast) { const b = P.b; A.patch({ boat: K.serializeBoat(b) }); A.save(); }
function loadFromSave() {
  const s = A.S(); P.b = K.sanitize(s.boat); const b = P.b;
  P.mode = 'idle'; P.goto = null; P.errand = null; P.dock = null; P.boarded = false;
  const had = !!(s.boat && s.boat.avail);
  if (!had) { b.avail = false; P.hadSaved = false; } else P.hadSaved = true;
  P.loadSig = ''; if (P.motor) P.motor.visible = b.engine;
}
function placeAtStart() {
  const b = P.b, jet = P.lands.find(l => l.id === 'jetty') || P.lands[0], bt = berthFor(jet); P.berths.start = bt; b.x = bt.x; b.z = bt.z; b.yaw = bt.yaw; b.at = jet.id; P.mode = 'docked'; P.landNow = jet;
}
function applySaved() {
  const b = P.b;
  if (b.at && P.lands.find(l => l.id === b.at)) { const L = P.lands.find(l => l.id === b.at), bt = berthFor(L); b.x = bt.x; b.z = bt.z; b.yaw = bt.yaw; P.mode = 'docked'; P.landNow = L; }
  else if (Math.hypot(b.x, b.z) > 1) P.mode = 'idle';
  else placeAtStart();
}
function revealBoat() {
  if (P.b.avail) return; P.b.avail = true; const s = A.S();
  if (!P.hadSaved || !(P.b.x || P.b.z)) { placeAtStart(); }
  commit(); A.toast('A small rowing boat lies by the jetty. It has oars. Tap it.', 7000);
}

/* ---------------- the HUD each few frames ---------------- */
function nearestInfo() { return K.nearestLanding(P.b, P.lands); }
function hudUpdate() {
  const b = P.b, sp = K.specOf(b), shown = P.b.avail && P.ready, mode = P.mode, driving = mode === 'drive' || mode === 'errand' || mode === 'docking';
  const info = P.e_info, main = P.e_main, stick = P.e_stick;
  document.body.classList.toggle('bd-on', driving && P.boarded);
  info.style.display = shown && (P.boarded || mode === 'docked') ? 'flex' : 'none';
  stick.style.display = shown && mode === 'drive' ? 'block' : 'none';
  if (!shown) { main.style.display = 'none'; setNote(''); return; }
  main.style.display = 'block';
  const nl = nearestInfo(), near = nl && nl.near && K.canDock(b, nl.landing);
  if (mode === 'drive') { main.innerHTML = near ? 'Dock<small>' + nl.landing.name.replace('the ', '') + '</small>' : 'Dock<small>' + (nl ? nl.landing.name.replace('the ', '') + ' ' + Math.round(nl.d) + ' m' : '') + '</small>'; main.classList.toggle('pri', !!near); main.style.opacity = near ? 1 : .86; }
  else if (mode === 'docked') { main.innerHTML = 'Landing<small>' + (P.landNow ? P.landNow.name.replace('the ', '') : '') + '</small>'; main.classList.add('pri'); main.style.opacity = 1; }
  else if (mode === 'idle') { main.innerHTML = 'Take the boat'; main.classList.add('pri'); main.style.opacity = 1; }
  else { main.innerHTML = mode === 'errand' ? 'Boat is out<small>on an errand</small>' : '...'; main.classList.remove('pri'); main.style.opacity = .7; }
  main.disabled = mode === 'errand' || mode === 'docking';
  const u = Math.abs(b.u); P.e_spd.textContent = u.toFixed(1); P.e_spw.textContent = K.speedWord(b) + ', m/s'; P.e_load.textContent = K.loadTotal(b) + ' / ' + K.capacityOf(b); P.e_lw.textContent = b.engine ? 'load, motor' : 'load, oars';
  /* the compass: north is the world's -z; the rose turns with the camera so the arrow shows where the bow really points on the screen */
  try {
    const sc0 = A.screenOf(b.x, tideNow(), b.z), sc1 = A.screenOf(b.x, tideNow(), b.z - 12);
    if (sc0 && sc1) { const a = Math.atan2(sc1.y - sc0.y, sc1.x - sc0.x) * 180 / Math.PI + 90; P.e_rose.setAttribute('transform', 'rotate(' + a.toFixed(1) + ')'); }
    const bear = Math.atan2(Math.cos(b.yaw), Math.sin(b.yaw)) * 180 / Math.PI;   /* bearing of the bow clockwise from north (-z): forward = (cos, -sin) so the bearing is atan2(fx, -fz) = atan2(cos, sin) */
    P.e_head.setAttribute('transform', 'rotate(' + bear.toFixed(1) + ')');
    const w = windNow(), wb = Math.atan2(w.x, -w.z) * 180 / Math.PI; P.e_wind.setAttribute('transform', 'rotate(' + wb.toFixed(1) + ') scale(' + (.55 + Math.min(.45, w.speed / 24)).toFixed(2) + ')');
  } catch (e) { /* no camera yet */ }
  /* one calm line: what the boat is doing */
  let note = '';
  if (mode === 'idle' && !P.boarded) note = '';
  if (mode === 'drive') { if (b.grounded && depthAt(b.x, b.z) < .35) note = 'Aground on the shallows. Back off, or wait for the tide.'; else if (P.b.engine && near) note = ''; }
  if (!P.firstSeen && (mode === 'docked' || mode === 'idle') && !P.boarded) note = K.hintFor(b, dayNo());
  if (mode === 'docked' && P.firstSeen && !A.cardOpen()) note = K.hintFor(b, dayNo());
  setNote(note);
}

/* ---------------- docking, the Dock card, loading ---------------- */
function mainPress() {
  const mode = P.mode, b = P.b;
  if (!b.avail) return;
  if (mode === 'idle') { startDriving(); return; }
  if (mode === 'docked') { openLanding(P.landNow || P.lands.find(l => l.id === b.at)); return; }
  if (mode === 'drive') { const nl = nearestInfo(); if (nl && nl.near && K.canDock(b, nl.landing)) beginDock(nl.landing); else if (nl && nl.near) A.toast('Slow down to dock.', 2400); else A.toast('Row to the jetty, the beach or the skerry to dock.', 3200); }
}
function startDriving() {
  const b = P.b; P.mode = 'drive'; P.boarded = true; P.firstSeen = true; b.at = null; P.landNow = null; P.goto = null; A.closeCard();
  A.focus(b.x, b.z, 28, undefined, .9);
}
function beginDock(L) {
  const b = P.b, to = berthFor(L); P.dock = { t: 0, T: 1.5, x0: b.x, z0: b.z, y0: b.yaw, to, L }; P.mode = 'docking'; P.goto = null; P.landNow = L; b.u = 0; b.yr = 0; b.v = 0;
}
function dockDone() {
  const b = P.b, d = P.dock; P.mode = 'docked'; P.dock = null; b.at = d.L.id; b.x = d.to.x; b.z = d.to.z; b.yaw = d.to.yaw; b.u = 0; P.boarded = true; commit();
  openLanding(d.L);
}
function castOff() {
  A.closeCard(); const b = P.b; P.mode = 'drive'; b.at = null; P.landNow = null; P.boarded = true; commit(); A.focus(b.x, b.z, 28, undefined, .9);
}
const KIND_NAME = { planks: 'planks', rope: 'rope', glass: 'glass', metal: 'metal' };
const loadText = ld => { const t = K.STOCK_IDS.filter(k => ld[k]).map(k => ld[k] + ' ' + KIND_NAME[k]); return t.length ? t.join(', ') : 'nothing'; };
function openLanding(L) {
  if (!L) return; P.landNow = L; const b = P.b, s = A.S(), card = A.card('dock', '', 'gd-paper-no'); const el = card;
  const h = (t, c, html) => { const e = document.createElement(t); if (c) e.className = c; if (html !== undefined) e.innerHTML = html; return e; };
  const cnt = K.loadTotal(b), cap = K.capacityOf(b), yard = s.stock || {};
  let title = L.name.charAt(0).toUpperCase() + L.name.slice(1), body = '';
  el.innerHTML = ''; el.appendChild(A.xbtn());
  if (L.id === 'skerry') {
    const c = K.cacheNow(b, s.seed, dayNo());
    el.appendChild(h('h2', '', 'The skerry'));
    el.appendChild(h('p', '', c ? c.text : 'The rock is bare today. Seals watch from the far side. The tide will leave something new by morning.'));
    if (c) { const bs = [A.btn('Take the crate' + (c.engine ? ' and the motor' : ''), () => collect(), 'pri')]; el.appendChild(A.row(...bs)); }
    el.appendChild(h('p', '', '<small>In the boat: ' + loadText(b.load) + ' (' + cnt + ' of ' + cap + ').</small>'));
    el.appendChild(A.row(A.btn('Cast off', castOff, c ? '' : 'pri'), A.btn('Close', A.closeCard)));
    return;
  }
  el.appendChild(h('h2', '', title));
  el.appendChild(h('p', '', (b.engine ? 'A small motor sits on the stern. The oars are shipped.' : 'A rowing boat, two oars.') + ' In the boat: <b>' + loadText(b.load) + '</b> (' + cnt + ' of ' + cap + ').'));
  el.appendChild(h('p', '', '<small>Yard stock: ' + A.stockLine(yard) + '.</small>'));
  const bs = [];
  if (b.part && !b.engine) bs.push(A.btn('Fit the motor', fit, 'pri'));
  if (cnt > 0) bs.push(A.btn('Unload (' + cnt + ')', unload, b.part && !b.engine ? '' : 'pri'));
  if (bs.length) el.appendChild(A.row(...bs));
  /* load from the yard stock, one kind at a time (a small simple capacity: units, not weight) */
  if (cap - cnt > 0 && A.STOCKS().some(k => (yard[k.id] || 0) > 0)) { const r = h('div', 'gd-row'); A.STOCKS().forEach(k => { const have = yard[k.id] || 0; if (!have) return; r.appendChild(A.btn('Load ' + k.short.toLowerCase() + ' (' + have + ')', () => loadKind(k.id))); }); el.appendChild(r); }
  else if (cap - cnt <= 0) el.appendChild(h('p', '', '<small>The boat is full.</small>'));
  const row2 = [A.btn('Cast off', castOff, bs.length ? '' : 'pri')];
  if (ERRAND_ON && b.avail) row2.push(A.btn('Send it on an errand', startErrand));
  row2.push(A.btn('Close', A.closeCard)); el.appendChild(A.row(...row2));
}
function loadKind(k) {
  const b = P.b, s = A.S(), r = K.loadFromStock(b, s.stock, k, 2); if (!r.moved) { A.toast('Nothing to load.', 2000); return; }
  P.b = r.boat; A.patch({ stock: r.stock }); commit(); A.afterChange(); A.toast('Loaded ' + r.moved + ' ' + k + '.', 2600); openLanding(P.landNow);
}
function unload() {
  const b = P.b, s = A.S(), r = K.unloadToStock(b, s.stock); if (!r.moved) { A.toast('Nothing to unload.', 2000); return; }
  const was = loadText(b.load); P.b = r.boat; A.patch({ stock: r.stock }); commit(); A.afterChange();
  A.toast('Unloaded: ' + was + '. Yard stock: ' + A.stockLine(r.stock) + '.', 5200); if (K.loadTotal(P.b)) A.toast('Some did not fit: the yard holds ' + K.STOCK_CAP + ' of each.', 4000); openLanding(P.landNow);
}
function fit() {
  const r = K.fitEngine(P.b); if (!r.ok) { A.toast(r.why, 3000); return; } P.b = r.boat; if (P.motor) P.motor.visible = true; commit(); A.toast('The motor sits on the stern. The oars are shipped. It carries eight now, and a good deal faster.', 7000); openLanding(P.landNow);
}
function collect() {
  const b = P.b, s = A.S(), r = K.collectCache(b, s.seed, dayNo()); if (!r.ok) { A.toast(r.why, 3600); return; }
  P.b = r.boat; commit(); updateCrateMesh(); const parts = K.STOCK_IDS.filter(k => r.cache.units[k]).map(k => r.cache.units[k] + ' ' + KIND_NAME[k]).join(' and ');
  A.toast(r.cache.engine ? 'In the crate: ' + parts + '. Beside it, a small motor in oilcloth, dry and whole. Take it to the jetty.' : 'In the crate: ' + parts + '.', 7500); openLanding(P.landNow);
}
function updateCrateMesh() {
  if (!P.cacheMesh) return; const ready = K.cacheReady(P.b, dayNo()) && P.b.avail; P.cacheMesh.visible = ready; if (P.cacheMesh.userData.motor) P.cacheMesh.userData.motor.visible = ready && !P.b.got.engine;
}
function buildCache() {
  const c = P.cacheLoc; if (!c) return; const g = new THREE.Group(), wood = mat(0x9a7448), dark = mat(0x6e5233);
  const box = new THREE.Mesh(new THREE.BoxGeometry(.95, .6, .7), wood); box.position.y = .3; g.add(box);
  for (const z of [-.2, .2]) { const s = new THREE.Mesh(new THREE.BoxGeometry(1.0, .08, .06), dark); s.position.set(0, .64, z); g.add(s); }
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.0, .06, .74), wood); lid.position.set(0, .62, 0); g.add(lid);
  const bundle = new THREE.Group(); const oil = new THREE.Mesh(new THREE.BoxGeometry(.8, .38, .45), mat(0x39503f)); oil.position.y = .19; bundle.add(oil);
  for (const x of [-.22, .22]) { const st = new THREE.Mesh(new THREE.BoxGeometry(.05, .4, .48), mat(0xd6c79a)); st.position.set(x, .2, 0); bundle.add(st); }
  bundle.position.set(1.0, 0, .35); bundle.rotation.y = .5; g.add(bundle); g.userData.motor = bundle;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.position.set(c.x, Math.max(c.h, 0) + 0.02, c.z); g.rotation.y = .6; P.group.add(g); P.cacheMesh = g; updateCrateMesh();
}

/* ---------------- the errand stub (&errand=1): a worker nobody sees rows the boat to the skerry and back, fixed path, no names ---------------- */
function startErrand() {
  const b = P.b, s = A.S(), L = P.landNow, sk = P.lands.find(l => l.id === 'skerry');
  if (!K.cacheReady(b, dayNo())) { A.toast('The skerry has nothing new today. No point sending the boat.', 4200); return; }
  if (K.capacityOf(b) - K.loadTotal(b) < 3) { A.toast('Unload first: the boat must have room for a crate.', 3600); return; }
  const bt = berthFor(sk), path = K.findPath(pathWater({ x: b.x, z: b.z }, bt), { x: b.x, z: b.z }, { x: bt.x, z: bt.z }, { cell: 3, R: RIM() + 4 });
  if (!path) { A.toast('There is no clear water to the skerry at this tide.', 4000); return; }
  A.closeCard(); P.errand = K.errandNew(path); P.mode = 'errand'; P.boarded = false; b.at = null; P.landNow = null; b.errands++; commit();
  A.toast('The boat sets off for the skerry by itself. It will bring back one crate.', 6000);
}
function finishErrand() {
  const b = P.b, s = A.S(), c = K.cacheNow(b, s.seed, dayNo()); P.errand = null; let msg = 'The boat is back at the jetty.';
  if (c) { const un = K.unloadToStock({ ...b, load: { ...b.load } }, s.stock); const stock = Object.assign({}, s.stock); let got = []; for (const k of K.STOCK_IDS) { const n = c.units[k] || 0; if (n) { stock[k] = Math.min(K.STOCK_CAP, (stock[k] || 0) + n); got.push(n + ' ' + KIND_NAME[k]); } } A.patch({ stock }); P.b = Object.assign(b, { cacheDay: dayNo(), part: b.part || c.engine, got: Object.assign({}, b.got, { engine: b.got.engine || c.engine }), trips: b.trips + 1 }); msg = 'The boat is back. In the yard stock: ' + got.join(' and ') + '.' + (c.engine ? ' A small motor came in oilcloth, in the boat.' : ''); A.afterChange(); updateCrateMesh(); }
  const back = P.berths.errandHome || { x: b.x, z: b.z }; P.mode = 'docked'; b.at = P.lastAt || 'jetty'; P.landNow = P.lands.find(l => l.id === b.at); commit(); A.toast(msg, 7000);
}

/* ---------------- the world's reaction: seals and gulls notice the boat ---------------- */
function reactions(dt) {
  const b = P.b, sp = Math.abs(b.u), eng = b.engine, moving = sp > .5 && (P.mode === 'drive' || P.mode === 'errand');
  /* how far a boat is noticed: oars are quiet, a motor is not (TUNING) */
  const alertR = moving ? (eng ? 54 : 28) : (P.mode === 'drive' ? 16 : 0), fleeR = moving ? (eng ? 30 : 12) : (P.mode === 'drive' ? 5 : 0);
  const seals = A.seals(); let nearest = 1e9;
  for (const sl of seals) {
    const u = sl.userData, dx = b.x - sl.position.x, dz = b.z - sl.position.z, d = Math.hypot(dx, dz); nearest = Math.min(nearest, d);
    u.bd = u.bd || { al: 0, flee: false, t: 0 };
    if (d < fleeR) { u.bd.flee = true; u.bd.t = 0; } else if (u.bd.flee) { u.bd.t += dt; if (u.bd.t > 18 && d > fleeR + 10) u.bd.flee = false; }   /* ALERT then FLEE, back out after a calm spell: the same ideas as animals.js */
    const al = !u.bd.flee && d < alertR ? 1 : 0; u.bd.al += (al - u.bd.al) * Math.min(1, dt * 3); u.boatFlee = u.bd.flee;
    if (u.bd.al > .02 && !u.bd.flee) { const want = Math.atan2(-dz, dx); let dd = want - sl.rotation.y; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); sl.rotation.y += dd * Math.min(1, dt * 2.5); }
    sl.scale.y = 1 + .22 * u.bd.al;
  }
  P.sealState = seals.map(sl => sl.userData.bd ? (sl.userData.bd.flee ? 'flee' : sl.userData.bd.al > .5 ? 'alert' : 'rest') : 'rest');
  const gl = moving ? (eng ? { r: 46, lift: 7 } : { r: 22, lift: 3 }) : null; try { C.li().xboat.alarm(gl ? { x: b.x, z: b.z, r: gl.r, lift: gl.lift } : null); } catch (e) { /* no gulls */ }
}

/* ---------------- one frame ---------------- */
function frame(dt) {
  const b = P.b; P.t += dt;
  const o = ensureObj(); if (!o || !P.spec) return;
  const show = b.avail; o.mesh.visible = show; if (o.ring) o.ring.visible = show && o.ring.visible;
  P.group.visible = show; if (!show) return;
  const e = envNow(), tide = tideNow();
  let inp = { steer: 0, throttle: 0 };
  if (P.mode === 'drive') { inp = readInput(b); const ev = K.step(b, inp, e, dt); if (ev.bump || (ev.scrape && b.grounded)) { P.scrapeT -= dt; if (P.scrapeT <= 0) { P.scrapeT = 4; A.toast(ev.bump ? 'The boat touches the shore and stops. Nothing is hurt.' : 'The keel scrapes the sand. Slow, or back off.', 2600); } } else P.scrapeT = Math.max(0, P.scrapeT - dt); }
  else if (P.mode === 'errand') { const r = K.errandStep(P.errand, b, dt); inp = r.input; K.step(b, inp, e, dt); if (P.errand.done) finishErrand(); }
  else if (P.mode === 'docking') { const d = P.dock; d.t += dt; const k = clamp(d.t / d.T, 0, 1), s = k * k * (3 - 2 * k); b.x = d.x0 + (d.to.x - d.x0) * s; b.z = d.z0 + (d.to.z - d.z0) * s; b.yaw = d.y0 + K.wrap(d.to.yaw - d.y0) * s; b.u *= .9; if (k >= 1) dockDone(); }
  else { b.u *= .9; b.yr *= .9; b.roll *= .95; b.pitch *= .95; }
  P.inp = inp;
  /* oars: out and swinging while rowing, shipped under the motor; the stroke is the boat's own clock so the push and the blade agree */
  const rowing = !b.engine; P.spec.rowing = rowing;
  if (rowing) { const M = globalThis.LI_BOAT_MOTION, per = 60 / clamp(18 + (Math.abs(b.u) - .8) * 16.7, 16, 30), act = (P.mode === 'drive' || P.mode === 'errand') && Math.abs(inp.throttle) > .05;
    if (M) { const st = M.oarStroke(b.sc * per, per, act ? clamp(.45 + .55 * Math.abs(b.u) / 1.7, .45, 1) : 0); P.spec.oar = st; const inW = st.inWater; if (inW && !P.wasStroke && act) P.rowCatch = true; P.wasStroke = inW; } }
  /* the rocking: the swell at five points under the hull plus the heel and trim of the drive; heave and the grounded sill */
  const r = K.rock(b, P.t, e.sea), spd = K.specOf(b);
  let y = tide + r.heave; const gy = C.H(b.x, b.z) + .08; if (gy > y) y = gy;
  P.spec.x = b.x; P.spec.z = b.z; P.spec.yaw = b.yaw; P.spec.dy = y - .18; P.spec.dpt = r.pitch + b.pitch; P.spec.drl = r.roll + b.roll;
  if (P.motor) { P.motor.visible = b.engine; P.motor.rotation.y = clamp((P.inp.steer || 0) * -.45, -.5, .5); if (P.motor.userData.prop) P.motor.userData.prop.rotation.x += dt * (b.engine ? 25 * Math.abs(b.u) / spd.maxSpeed : 0); }
  rebuildLoad();
  if (P.fx) { fxEmit(dt); fxUpdate(dt); }
  reactions(dt);
  /* the camera follows a driven boat (a gentle lead ahead); a card or a focus move is left alone */
  if ((P.mode === 'drive' || P.mode === 'errand' || P.mode === 'docking') && !A.cardOpen() && !A.focusing() && !P.stickCam) { const lead = clamp(b.u, 0, 6) * .9, fx = b.x + Math.cos(b.yaw) * lead, fz = b.z - Math.sin(b.yaw) * lead, k = Math.min(1, dt * 2.6); const cam = C.cam; cam.tx += (fx - cam.tx) * k; cam.tz += (fz - cam.tz) * k; const rr = Math.hypot(cam.tx, cam.tz); if (rr > 100) { cam.tx *= 100 / rr; cam.tz *= 100 / rr; } }
  /* a goto marker follows the water */
  if (P.gotoMark) { if (!P.goto) P.gotoMark.visible = false; else { P.gotoMark.visible = true; const g = P.goto.pts[P.goto.pts.length - 1]; P.gotoMark.position.set(g[0], tide + .06, g[1]); P.gotoMark.scale.setScalar(1 + .12 * Math.sin(P.t * 5)); } }
  /* a save every few seconds while under way */
  P.saveT += dt; if (P.saveT > 5) { P.saveT = 0; if (P.mode === 'drive' && Math.abs(b.u) > .05) { A.patch({ boat: K.serializeBoat(b) }); A.save(); } }
  P.hudT += dt; if (P.hudT > .12) { P.hudT = 0; hudUpdate(); }
}
function tick(dt) {
  if (!A || !P.ready) return;
  try { frame(clamp(dt, 0, .25)); } catch (e) { if (P.err.length < 20) P.err.push('frame ' + e.message); }
}

/* ---------------- start up ---------------- */
function targets() {
  if (!P.ready || !P.b.avail || !P.obj || A.cardOpen()) return []; if (P.mode !== 'idle' && P.mode !== 'docked') return [];
  const sc = A.screenOf(P.b.x, tideNow() + .5, P.b.z); return sc ? [{ id: 'boat', x: sc.x, y: sc.y, r: 72 }] : [];
}
function activate(id) { if (id !== 'boat') return false; if (P.mode === 'idle') startDriving(); else if (P.mode === 'docked') { P.firstSeen = true; openLanding(P.landNow || P.lands.find(l => l.id === P.b.at)); } return true; }
function resync() {
  if (!P.ready) return; loadFromSave(); if (P.b.avail || availNow()) { if (availNow() && !P.b.avail) { P.b.avail = true; } }
  if (P.b.avail) applySaved(); updateCrateMesh(); if (P.motor) P.motor.visible = P.b.engine; P.loadSig = ''; document.body.classList.remove('bd-on'); A.closeCard();
  if (P.spec && P.b.avail) { P.spec.x = P.b.x; P.spec.z = P.b.z; P.spec.yaw = P.b.yaw; }
}
function readyCheck() {
  if (P.ready) return;
  P.tries = (P.tries || 0) + 1;
  if (!computeLandings() || (P.lands.length < 3 && P.tries < 40)) { setTimeout(readyCheck, 700); return; }   /* the jetty is built a moment after the island; give it up to 28 s, then go on with the landings there are */
  P.group = new THREE.Group(); P.group.name = 'boat_drive'; C.scene.add(P.group);
  loadFromSave(); buildFx(); buildCache();
  const mk = new THREE.Mesh(new THREE.RingGeometry(.55, .75, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .75, depthWrite: false, side: THREE.DoubleSide })); mk.rotation.x = -Math.PI / 2; mk.renderOrder = 8; mk.visible = false; P.group.add(mk); P.gotoMark = mk;
  if (availNow() && !P.b.avail) { P.b.avail = true; }
  if (P.b.avail) applySaved();
  P.ready = true; updateCrateMesh();
}
function attach(api) {
  if (A) return P; A = api; C = api.C(); THREE = api.THREE();
  buildHud(); wireKeys(); wireTaps(); addEventListener('beforeunload', () => { try { if (P.ready && P.b.avail) { A.patch({ boat: K.serializeBoat(P.b) }); A.save(); } } catch (e) { /* fine */ } });
  readyCheck(); return P;
}
function reveal() { if (P.ready && !P.b.avail && availNow()) { P.b.avail = true; placeAtStart(); commit(); A.toast('A small rowing boat lies by the jetty. It has oars. Tap it.', 7000); } }
const page = {
  attach, tick, targets, activate, resync, reveal, hintTarget: () => { if (!P.ready || !P.b.avail || P.mode === 'errand') return null; if (!P.b.got.engine && K.cacheReady(P.b, dayNo()) && P.cacheLoc && (P.mode === 'drive' || P.mode === 'docked')) return { x: P.cacheLoc.x, z: P.cacheLoc.z, r: 1.5 }; return null; },
  /* the testing handle: the page test and the pictures drive the boat with it */
  state: () => P.ready ? { ready: true, mode: P.mode, boarded: P.boarded, b: K.serializeBoat(P.b), u: P.b.u, yr: P.b.yr, roll: P.b.roll, pitch: P.b.pitch, grounded: P.b.grounded, sc: P.b.sc, avail: P.b.avail, landNow: P.landNow ? P.landNow.id : null, goto: !!P.goto, inp: P.inp, errand: P.errand ? P.errand.phase : null, cacheOn: !!(P.cacheMesh && P.cacheMesh.visible) } : { ready: false },
  err: () => P.err.slice(), landings: () => P.lands.map(l => Object.assign({}, l, { berth: berthFor(l) })), spec: () => P.spec && { x: P.spec.x, z: P.spec.z, yaw: P.spec.yaw, dy: P.spec.dy, dpt: P.spec.dpt, drl: P.spec.drl, rowing: P.spec.rowing, oar: P.spec.oar }, fx: () => ({ active: fxActive(), kinds: P.fx ? P.fx.parts.reduce((o, p) => { if (p.on) o[p.k] = (o[p.k] || 0) + 1; return o; }, {}) : {} }),
  seals: () => P.sealState || [], hud: () => ({ spd: P.e_spd && P.e_spd.textContent, load: P.e_load && P.e_load.textContent, main: P.e_main && P.e_main.textContent, mainShown: P.e_main && P.e_main.style.display !== 'none', stick: P.e_stick && P.e_stick.style.display !== 'none', info: P.e_info && P.e_info.style.display !== 'none', note: P.noteText || '', rect: (id) => { const e = document.getElementById(id); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; } }),
  press: mainPress, board: startDriving, dockHere: () => { const nl = nearestInfo(); if (nl && K.canDock(P.b, nl.landing)) { beginDock(nl.landing); return true; } return false; }, castOff, unload, fit, collect, loadKind, errand: startErrand, goTo, openLanding: () => openLanding(P.landNow || P.lands.find(l => l.id === P.b.at)),
  advance: (s, dt) => { dt = dt || .05; const n = Math.round(s / dt); for (let i = 0; i < n; i++) frame(dt); }, force: inp => { P.forced = inp; }, set: o => { Object.assign(P.b, o); }, teleport: (x, z, yaw, mode) => { const b = P.b; b.x = x; b.z = z; if (yaw !== undefined) b.yaw = yaw; b.u = 0; b.yr = 0; b.v = 0; if (mode) P.mode = mode; }, setMode: m => { P.mode = m; P.boarded = m === 'drive'; }, give: o => { Object.assign(P.b.load, o.load || {}); if (o.engine !== undefined) { P.b.engine = o.engine; if (P.motor) P.motor.visible = o.engine; } if (o.part !== undefined) P.b.part = o.part; commit(); },
  env: () => ({ tide: tideNow(), wind: windNow(), sea: seaMood() }), obj: () => P.obj && { tris: P.obj.tris, kit: !!P.obj.kit, visible: P.obj.mesh.visible, pos: P.obj.mesh.position.toArray(), kind: P.obj.kit ? P.obj.kit.kind : 'procedural', lod: P.obj.kit ? P.obj.kit.lod : null }, lands: () => P.lands, cacheLoc: () => P.cacheLoc, stickVec: (x, y) => { P.stick.on = !!(x || y); P.stick.x = x; P.stick.y = y; }, kb: P.kb
};
root.LI_BOAT_DRIVE.attach = attach; root.LI_BOAT_DRIVE.page = page; root.__boat = page;

})(typeof window !== 'undefined' ? window : globalThis);
