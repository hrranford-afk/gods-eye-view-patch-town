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
/*PAGE_LAYER*/
})(typeof window !== 'undefined' ? window : globalThis);
