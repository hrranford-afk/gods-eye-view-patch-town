/* Living Islands: THE STORM AND THE HAUL (the whirlpool). Loaded on a gift page only (islands_look.html?game=gift, see GIFT_STORM.md); &storm=0 keeps it out.
   A story moment and a core loop piece: a storm you can see coming (weather mood, a falling barometer line, gulls going quiet, robots home), a tidal swirl and a gentle surge that rises and
   recedes (nothing is swallowed), and the haul the water leaves along the wrack line: wreckage and cargo in a few instanced batches, in heaps you can gather by hand or order the robots to
   gather, that the tide slowly takes back, and ONE big hulk (a labelled placeholder) to salvage over years. Letter nine arrives the next morning.
   Tone: hopeful. Planks, barrels, crates, rope, nets, bottles, tins, driftwood, seaweed. NO bodies, nothing gory or cruel, no faces, no people shown. Robots stay relics.
   PART 1 (pure, no THREE, no DOM, no Math.random, no wall clock): switches, tier caps, the ground sampler, the field of where a surge leaves things (wrack line at the highest water mark, drifts
     against rocks, trees, posts and the pieces of the camp, lee of the land, tapering inland), the heaps (kind, count, place), plan() = the same mess for the same seed, the storm timeline
     (weather, barometer, gulls, swirl, surge), the trigger, the tide taking heaps back, the save, the bench verdicts and the knee finder. tests/storm-test.js runs it in plain node.
   PART 2 (THREE + DOM): attach(api) builds the batches, the swirl, the hulk, the barometer, the heaps' taps, the robots' gather sites, letter nine and the bench.
   Tags: TUNING = a game number (a guess), COMPUTED = checked by tests/storm-test.js. Derived from the stopped CAIRN aftermath work (field, plan and geometry copied and reworked). */
(function (root) {
'use strict';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sm01 = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function hash(k, salt, seed) { let h = Math.imul(k | 0, 374761393) + Math.imul(salt | 0, 668265263) + Math.imul(seed | 0, 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
function gauss(k, salt, seed) { return (hash(k, salt, seed) + hash(k, salt + 1, seed) + hash(k, salt + 2, seed) - 1.5) * 2; }   /* about N(0,1), bounded to 3 */

/* ---------- 1. switches, tiers, counts ---------- */
const TIER_CAP = { ar: 150, low: 400, high: 3000, ultra: 3000, radeon: 20000 };   /* TUNING: most pieces a tier draws (iPad about 400, desktop about 3000, Radeon up to 20000, AR 150) */
const MIN_COUNT = 100, DEFAULT_RADEON = 6000;
const BENCH_STEPS = [400, 1000, 2000, 3000, 5000, 8000, 12000, 16000, 20000];
function options(search) {
  const q = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const num = (k, d) => { const v = parseFloat(q.get(k)); return isFinite(v) ? v : d; };
  const gift = q.get('game') === 'gift', st = q.get('storm');
  return { on: gift && st !== '0', test: gift && st === '1', buildSec: clamp(num('stormsec', st === '1' ? 45 : 150), 8, 600), debris: q.has('debris') ? clamp(Math.round(num('debris', 0)), MIN_COUNT, 100000) : null, seedAdd: Math.round(num('sseed', 0)), panel: q.get('stormpanel') === '1', fast: clamp(num('stormfast', 1), .25, 20) };
}
function tierCap(tier, ar, device) { if (ar) return TIER_CAP.ar; if (device === 'radeon') return TIER_CAP.radeon; return TIER_CAP[tier] || TIER_CAP.high; }
function effectiveCount(req, tier, ar, device) { return Math.min(clamp(Math.round(req), MIN_COUNT, 100000), tierCap(tier, ar, device)); }
function defaultCount(tier, ar, device) { const c = tierCap(tier, ar, device); return device === 'radeon' && !ar ? Math.min(c, DEFAULT_RADEON) : c; }
/* a light tier (iPad low, AR) draws nine kinds and simpler shapes; the plan for it uses only those kinds */
const LITE_SET = [1, 3, 5, 7, 9, 10, 15, 18, 19];
const isLite = (tier, ar) => !!ar || tier === 'low';

/* ---------- 2. the kinds ---------- */
/* hgt = height of the piece (m, at scale 1), bury = share of that height sunk into the ground [min, max], sc = scale range, align = how much it follows the ground normal (1 = lies flat on the slope),
   tilt = random extra tilt (radians), lin = a long piece that lies along the shore line, ds = needs both faces drawn, rad = footprint radius (m) used for spacing in drifts */
const KINDS = [
  { id: 0, name: 'plank_s', hgt: .05, bury: [.1, .5], sc: [.8, 1.25], align: .95, tilt: .06, lin: 1, rad: .5 },
  { id: 1, name: 'plank_m', hgt: .05, bury: [.1, .5], sc: [.8, 1.2], align: .95, tilt: .06, lin: 1, rad: .9 },
  { id: 2, name: 'plank_l', hgt: .05, bury: [.1, .5], sc: [.8, 1.15], align: .95, tilt: .07, lin: 1, rad: 1.5 },
  { id: 3, name: 'log', hgt: .3, bury: [.15, .45], sc: [.7, 1.4], align: .9, tilt: .05, lin: 1, rad: 1.3 },
  { id: 4, name: 'stump', hgt: .5, bury: [.2, .5], sc: [.7, 1.25], align: .6, tilt: .35, lin: 0, rad: .5 },
  { id: 5, name: 'barrel_up', hgt: .85, bury: [.05, .25], sc: [.85, 1.1], align: .5, tilt: .25, lin: 0, rad: .35 },
  { id: 6, name: 'barrel_lie', hgt: .65, bury: [.05, .2], sc: [.85, 1.1], align: .9, tilt: .05, lin: 1, rad: .5 },
  { id: 7, name: 'crate', hgt: .55, bury: [.05, .3], sc: [.75, 1.15], align: .6, tilt: .3, lin: 0, rad: .45 },
  { id: 8, name: 'crate_open', hgt: .5, bury: [.1, .35], sc: [.75, 1.1], align: .6, tilt: .4, lin: 0, rad: .45, ds: 1 },
  { id: 9, name: 'rope', hgt: .12, bury: [0, .2], sc: [.7, 1.3], align: 1, tilt: .03, lin: 0, rad: .35 },
  { id: 10, name: 'net', hgt: .25, bury: [0, .3], sc: [.8, 1.5], align: .95, tilt: .05, lin: 0, rad: .7, ds: 1 },
  { id: 11, name: 'ribs', hgt: .6, bury: [.15, .4], sc: [.7, 1.1], align: .85, tilt: .3, lin: 1, rad: 1.2, ds: 1 },
  { id: 12, name: 'hull_up', hgt: .5, bury: [.15, .4], sc: [.7, 1.15], align: .9, tilt: .12, lin: 1, rad: 1.0, ds: 1 },
  { id: 13, name: 'hull_dn', hgt: .5, bury: [.1, .3], sc: [.7, 1.15], align: .9, tilt: .15, lin: 1, rad: 1.0, ds: 1 },
  { id: 14, name: 'weed_a', hgt: .2, bury: [0, .1], sc: [.6, 1.5], align: 1, tilt: .02, lin: 0, rad: .6, ds: 1 },
  { id: 15, name: 'weed_b', hgt: .1, bury: [0, .1], sc: [.7, 1.6], align: 1, tilt: .02, lin: 0, rad: .9, ds: 1 },
  { id: 16, name: 'cog', hgt: .1, bury: [.2, .6], sc: [.7, 1.3], align: 1, tilt: .12, lin: 0, rad: .45 },
  { id: 17, name: 'pipe', hgt: .2, bury: [.2, .5], sc: [.7, 1.3], align: .95, tilt: .05, lin: 1, rad: .7 },
  { id: 18, name: 'bottle', hgt: .1, bury: [.1, .5], sc: [.8, 1.3], align: 1, tilt: .05, lin: 0, rad: .2 },
  { id: 19, name: 'tin', hgt: .13, bury: [.1, .5], sc: [.8, 1.4], align: 1, tilt: .5, lin: 0, rad: .2 }
];
const NK = KINDS.length;
/* what a heap of each stock is made of: [kind id, weight]; the stocks are the page's four: planks, rope, glass, metal */
const STOCK_IDS = ['planks', 'rope', 'glass', 'metal'];
const HEAP_POOL = { planks: [[0, 3], [1, 3], [2, 2], [3, 2], [7, 2], [8, 1]], metal: [[5, 2], [6, 1], [19, 3]], rope: [[9, 2], [10, 2]], glass: [[18, 1]] };
const HEAP_LIGHT = { planks: [[1, 4], [3, 2], [7, 2]], metal: [[5, 2], [19, 3]], rope: [[9, 2], [10, 2]], glass: [[18, 1]] };
const HEAP_LABEL = { planks: 'Timber and planks', metal: 'Barrels and tins', rope: 'Rope and net', glass: 'Bottles' };
const HEAP_N = { planks: [4, 9], metal: [3, 7], rope: [3, 6], glass: [3, 6] };   /* TUNING: units a heap holds (a unit is one stock unit; a robot trip carries 2, a hand pick up to 3) */
const STOCK_W = [['planks', .4], ['metal', .25], ['rope', .2], ['glass', .15]];
const NHEAP = 24, HEAP_SHARE = .4, HAND_TAKE = 3, TRIP_TAKE = 2;
/* weights per zone: 0 wrack line (the highest water mark), 1 the beach below it, 2 inland tail, 3 drift against something */
const KW = [
  /*          0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17   18   19 */
  /* wrack */ [10, 12, 6, 7, 1.5, 1.4, 2.4, 2.4, 3.2, 2.2, 3.0, 1.4, 1.2, 1.2, 8, 12, .4, .6, 3, 3],
  /* beach */ [6, 7, 2.5, 3, .8, .9, 1.4, 1.4, 2.2, 1.6, 2.0, .7, .6, .6, 12, 16, .3, .4, 1.5, 1.5],
  /* tail  */ [20, 14, 3, 2, .6, .4, .5, 1.2, 3.0, 5, 4, .3, .3, .3, 10, 12, .2, .2, 1, .8],
  /* drift */ [10, 14, 12, 12, 2.0, 3.0, 4.0, 3.5, 5.0, 3, 5, 3.0, 2.0, 2.0, 10, 8, .5, 1.0, 2.5, 2.5]
];
const kcumFor = lite => KW.map(w => { const c = new Float64Array(NK); let s = 0; for (let i = 0; i < NK; i++) { s += (!lite || LITE_SET.includes(i)) ? w[i] : 0; c[i] = s; } return c; });
const KCUM = { full: kcumFor(false), lite: kcumFor(true) };
const SAND_LAND = .08, WET_MIN = .04;
/* ---------- 3. the ground ---------- */
/* a lazy cache of the page's own height function on the terrain grid (same spacing as the drawn terrain, so pieces rest on the mesh the eye sees); bilinear between the grid points */
function makeGround(H, half, step) {
  const n = Math.max(2, Math.round(2 * half / step)), st = 2 * half / n, V = n + 1, cache = new Float32Array(V * V).fill(NaN);
  const at = (i, j) => { const k = j * V + i; let v = cache[k]; if (v !== v) { v = H(-half + i * st, -half + j * st); cache[k] = v; } return v; };
  function h(x, z) {
    let fx = (x + half) / st, fz = (z + half) / st; fx = clamp(fx, 0, n - 1e-6); fz = clamp(fz, 0, n - 1e-6);
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    return tx + tz < 1 ? a + (b - a) * tx + (c - a) * tz : d + (b - d) * (1 - tz) + (c - d) * (1 - tx);   /* the same two triangles the terrain mesh is cut into (an assumption, within centimetres) */
  }
  function grad(x, z, e) { return [(h(x + e, z) - h(x - e, z)) / (2 * e), (h(x, z + e) - h(x, z - e)) / (2 * e)]; }
  return { h, grad, step: st, half, n };
}
function vnoise(x, z, seed) {   /* value noise 0..1 on a lattice */
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz, seed), b = hash(ix + 1, iz, seed), c = hash(ix, iz + 1, seed), d = hash(ix + 1, iz + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/* ---------- 4. the field: where a surge leaves things ---------- */
/* env: { seed, H, half, step, tableR, hw (highest water mark, m), obstacles: [{x,z,r,kind}], dir: [dx,dz] (the way the surge travels) }
   Land is labelled into pieces (islands); each gets its own mark hwc = min(hw, 85 percent of its highest point). Per land cell, a weight:
     wrack line: a bump around the mark (+-0.3 m of height), a lighter ramp on the beach below it, and a thin tail above it that fades within about a metre of height (tapering inland);
     lee: more where ground UPSTREAM of the cell is higher (the water slackens behind land); clumps: a smooth noise so the mess is in drifts and gaps, not an even dusting. */
function buildField(env) {
  if (env._field && env._field.seed === env.seed) return env._field;
  const G = env._ground || (env._ground = makeGround(env.H, env.half, env.step));
  const R = env.tableR, fc = env.cell || .8, nF = Math.ceil(2 * R / fc), seed = env.seed | 0;
  let dir = env.dir; if (!dir) { const a = hash(seed, 77, 5) * TAU; dir = [Math.cos(a), Math.sin(a)]; }
  const HW = env.hw;
  const hgt = new Float32Array(nF * nF), comp = new Int32Array(nF * nF).fill(-1), cx = i => -R + (i + .5) * fc;
  for (let j = 0; j < nF; j++) for (let i = 0; i < nF; i++) { const x = cx(i), z = cx(j); hgt[j * nF + i] = (x * x + z * z <= R * R) ? G.h(x, z) : -9; }
  /* label land (4-neighbour flood fill) */
  const comps = []; const stack = [];
  for (let s = 0; s < nF * nF; s++) {
    if (comp[s] >= 0 || hgt[s] <= SAND_LAND) continue;
    const id = comps.length, C = { id, max: -9, cells: 0 }; comps.push(C); comp[s] = id; stack.push(s);
    while (stack.length) {
      const c = stack.pop(); C.cells++; if (hgt[c] > C.max) C.max = hgt[c];
      const ci = c % nF, cj = (c - ci) / nF;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= nF || nj >= nF) continue; const nn = nj * nF + ni; if (comp[nn] < 0 && hgt[nn] > SAND_LAND) { comp[nn] = id; stack.push(nn); } }
    }
  }
  for (const C of comps) C.hwc = C.max < .3 ? 0 : clamp(.85 * C.max, Math.min(.45, C.max * .8), HW);
  /* weights */
  const w = new Float32Array(nF * nF), zone = new Uint8Array(nF * nF), cum = new Float64Array(nF * nF);
  let umin = 1e9, umax = -1e9, total = 0, land = 0, nz = [0, 0, 0];
  for (let j = 0; j < nF; j++) for (let i = 0; i < nF; i++) {
    const c = j * nF + i, id = comp[c]; let wt = 0;
    if (id >= 0 && comps[id].hwc > 0) {
      const x = cx(i), z = cx(j), h = hgt[c], hwc = comps[id].hwc, dh = h - hwc;
      const g = G.grad(x, z, .4), slope = Math.hypot(g[0], g[1]);
      const slopeF = slope < .7 ? 1 : slope < 1.4 ? (1.4 - slope) / .7 : 0;
      const wrack = Math.exp(-(dh / .3) * (dh / .3));
      const ramp = dh < 0 ? .38 * clamp((h - .1) / Math.max(.1, hwc - .1), 0, 1) : 0;
      const tail = dh > 0 ? .22 * Math.exp(-dh / .35) : 0;
      let sh = 0; for (let t = 1.5; t <= 10; t += 1.7) sh = Math.max(sh, G.h(x - dir[0] * t, z - dir[1] * t) - h);
      const lee = 1 + 1.6 * clamp(sh / 1.2, 0, 1);
      const clump = .2 + 1.5 * Math.pow(vnoise(x / 3.1, z / 3.1, seed + 1), 2) * (.6 + .8 * vnoise(x / 9, z / 9, seed + 2));
      wt = (wrack + ramp + tail) * slopeF * lee * clump * (h > WET_MIN ? 1 : 0) * (dh > 1.6 ? 0 : 1);
      zone[c] = Math.abs(dh) < .5 ? 0 : dh < 0 ? 1 : 2;
      if (wt > 0) { land++; nz[zone[c]] += wt; const u = x * dir[0] + z * dir[1]; if (u < umin) umin = u; if (u > umax) umax = u; }
    }
    w[c] = wt; total += wt; cum[c] = total;
  }
  if (!(umax > umin)) { umin = -R; umax = R; }
  /* drift sites: obstacles the water could reach */
  const sites = [], sCum = []; let sTot = 0;
  for (const o of (env.obstacles || [])) {
    const x = o.x, z = o.z, i = Math.floor((x + R) / fc), j = Math.floor((z + R) / fc); if (i < 0 || j < 0 || i >= nF || j >= nF) continue;
    const g = G.h(x, z), id = comp[j * nF + i]; let hwc = id >= 0 ? comps[id].hwc : 0;
    if (!(hwc > 0)) { for (let dj = -1; dj <= 1 && !(hwc > 0); dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < nF && jj < nF && comp[jj * nF + ii] >= 0) { hwc = comps[comp[jj * nF + ii]].hwc; break; } } }
    if (!(hwc > 0) || g > hwc + .55 || g < -.1) continue;
    const wt = Math.pow(o.r + .3, 1.2) * (o.kind === 'post' ? 1.3 : o.kind === 'piece' ? 1.2 : o.kind === 'tree' ? .8 : 1) * (1 - clamp((g - hwc) / .55, 0, 1) * .6);
    sTot += wt; sites.push({ x, z, r: o.r, kind: o.kind, hwc, ground: g }); sCum.push(sTot);
  }
  const F = { seed, G, dir, nF, fc, R, hgt, comp, comps, w, zone, cum, total, land, umin, umax, sites, sCum: Float64Array.from(sCum), sTot, zoneW: nz, cx: i => cx(i) };
  env._field = F; return F;
}
function upper(cum, r, n) { let lo = 0, hi = n - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < r) lo = m + 1; else hi = m; } return lo; }

/* ---------- 5. the plan ---------- */
const DRIFT_SHARE = .30;   /* TUNING: share of scenery pieces that lie against something, when there is something in reach */
/* one place for a piece or a heap: a cell of the field (by weight) or a drift site; avoid = circles kept clear (the yard, the story places). key makes it independent of everything else. */
function samplePoint(F, env, key, salt, wantDrift) {
  const G = F.G, seed = F.seed, dir = F.dir, hasSites = F.sites.length > 0 && F.sTot > 0, hasField = F.total > 0, avoid = env.avoid || [];
  for (let tr = 0; tr < 9; tr++) {
    const sa = salt + tr * 13; let P = null;
    if (wantDrift && hasSites && (tr < 5 || !hasField)) {
      const si = upper(F.sCum, hash(key, 2 + sa, seed) * F.sTot, F.sites.length), S = F.sites[si];
      const aUp = Math.atan2(-dir[1], -dir[0]), up = hash(key, 3 + sa, seed) < .65;
      const a = (up ? aUp : aUp + Math.PI) + gauss(key, 4 + sa, seed) * (up ? .85 : .7);
      const kd = hash(key, 7 + sa, seed), rad = S.r + .15 + Math.abs(gauss(key, 8 + sa, seed)) * (.45 + S.r * .6) * (kd < .5 ? .7 : 1);
      const x = S.x + Math.cos(a) * rad, z = S.z + Math.sin(a) * rad, Rp = .9 + S.r * .9, m = 1 - clamp((rad - S.r) / Rp, 0, 1);
      const pile = m * m * (.25 + .35 * Math.min(S.r, 1.5)) * (.3 + .7 * hash(key, 9 + sa, seed));
      const h = G.h(x, z); if (h < .02 || h > S.hwc + .8) continue;
      const g = G.grad(x, z, .4); if (Math.hypot(g[0], g[1]) > 1.6) continue;
      P = { x, z, zone: 3, hwc: S.hwc, drift: true, ox: S.x, oz: S.z, orad: S.r, m, pile };
    } else if (hasField) {
      const c = upper(F.cum, hash(key, 2 + sa, seed) * F.total, F.nF * F.nF), i = c % F.nF, j = (c - i) / F.nF;
      const x = F.cx(i) + (hash(key, 3 + sa, seed) - .5) * F.fc, z = F.cx(j) + (hash(key, 4 + sa, seed) - .5) * F.fc;
      if (G.h(x, z) < WET_MIN) continue;
      P = { x, z, zone: F.zone[c], hwc: F.comps[F.comp[c]].hwc, drift: false, ox: 0, oz: 0, orad: 0, m: 0, pile: 0 };
    }
    if (!P) continue;
    let bad = false; for (const a of avoid) if (Math.hypot(a.x - P.x, a.z - P.z) < a.r) { bad = true; break; }
    if (bad) continue;
    return P;
  }
  return null;
}
const pickW = (list, r) => { let t = 0; for (const e of list) t += e[1]; r *= t; for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; } return list[list.length - 1][0]; };
/* the heaps: tier independent, a function of the field and the seed only. A heap is a stock, a count of units, a place and how many pieces draw it. */
function planHeaps(env) {
  const F = buildField(env), seed = F.seed, out = []; if (F.total <= 0) return out;
  const focus = env.focus;
  for (let h = 0; h < NHEAP; h++) {
    let best = null, bd = 1e18;
    for (let c = 0; c < (focus ? 4 : 1); c++) { const P = samplePoint(F, env, 5000 + h, 100 + c * 41, hash(h, 90 + c, seed) < .3); if (!P) continue; const d = focus ? Math.hypot(P.x - focus.x, P.z - focus.z) : 0; if (d < bd) { bd = d; best = P; } }
    if (!best) continue;
    const st = pickW(STOCK_W, hash(h, 91, seed)), rg = HEAP_N[st], n0 = rg[0] + Math.floor(hash(h, 92, seed) * (rg[1] - rg[0] + 1));
    out.push({ id: out.length, stock: st, n0, x: best.x, z: best.z, y: F.G.h(best.x, best.z), zone: best.zone, hwc: best.hwc, drift: best.drift, ox: best.ox, oz: best.oz, orad: best.orad, m: best.m, pile: best.pile, jit: hash(h, 93, seed) });
  }
  return out;
}
/* the plan: count pieces. The first Mh belong to the heaps (every heap draws at least one), the rest are loose scenery of the same wrack. Same env and count = the same mess. */
function plan(env, count, lite) {
  const F = buildField(env), G = F.G, seed = F.seed | 0, dir = F.dir, n = Math.max(0, Math.floor(count)), heaps = env._heaps || (env._heaps = planHeaps(env));
  const kind = new Uint8Array(n), zoneOut = new Uint8Array(n), mat = new Float32Array(n * 16), tint = new Float32Array(n * 3), arr = new Float32Array(n), pos = new Float32Array(n * 3);
  const hid = new Int16Array(n).fill(-1), ord = new Uint16Array(n);
  const KC = lite ? KCUM.lite : KCUM.full, pool = lite ? HEAP_LIGHT : HEAP_POOL;
  const Mh = heaps.length ? Math.max(Math.min(n, heaps.length), Math.min(n, Math.round(n * HEAP_SHARE))) : 0;
  const sumN = heaps.reduce((s, h) => s + h.n0, 0) || 1, cnt = heaps.map(h => Math.max(1, Math.round(Mh * h.n0 / sumN)));
  let tot = cnt.reduce((s, c) => s + c, 0); while (tot > Mh && cnt.some(c => c > 1)) { for (let i = 0; i < cnt.length && tot > Mh; i++) if (cnt[i] > 1) { cnt[i]--; tot--; } }
  while (tot < Mh) { for (let i = 0; i < cnt.length && tot < Mh; i++) { cnt[i]++; tot++; } }
  const hm = cnt.slice();
  const startOf = []; { let a = 0; for (let i = 0; i < heaps.length; i++) { startOf.push(a); a += hm[i]; } }
  let hi = 0, hj = 0;
  const hasScenery = F.sites.length > 0 && F.sTot > 0 || F.total > 0;
  for (let k = 0; k < n; k++) {
    let P, kd, key = k, drift;
    if (k < Mh && heaps.length) {
      while (hj >= hm[hi]) { hi++; hj = 0; }
      const H = heaps[hi], r = (.32 + .22 * Math.sqrt(hm[hi])) * (H.stock === 'glass' ? .7 : 1), a = gauss(k, 31, seed) * r, b = gauss(k, 32, seed) * r;
      P = { x: H.x + a, z: H.z + b, zone: H.zone, hwc: H.hwc, drift: H.drift, ox: H.ox, oz: H.oz, orad: H.orad, m: H.m, pile: H.pile * .6 };
      kd = pickW(pool[H.stock], hash(k, 40, seed)); hid[k] = H.id; ord[k] = hj; hj++; key = 7000 + k;
    } else {
      key = 20000 + k; P = samplePoint(F, env, key, 0, hash(k, 1, seed) < DRIFT_SHARE);
      if (!P) P = { x: 0, z: 0, zone: 1, hwc: env.hw, drift: false, ox: 0, oz: 0, orad: 0, m: 0, pile: 0 };
      const cu = KC[P.zone], r = hash(k, 40, seed) * cu[NK - 1]; kd = 0; while (cu[kd] < r) kd++;
    }
    drift = P.drift;
    const K = KINDS[kd], x = P.x, z = P.z, zone = P.zone, pile = P.pile;
    const e = clamp(K.rad * .55, .25, 1.1), h0 = G.h(x, z), g = G.grad(x, z, e);
    let nx = -g[0], ny = 1, nz = -g[1]; { const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l; }
    const al = K.align; let ux = nx * al, uy = 1 - al + ny * al, uz = nz * al; { const l = Math.hypot(ux, uy, uz); ux /= l; uy /= l; uz /= l; }
    const tl = K.tilt * (hash(k, 11, seed) * 2 - 1), tph = hash(k, 12, seed) * TAU;
    ux += Math.cos(tph) * Math.tan(Math.abs(tl)); uz += Math.sin(tph) * Math.tan(Math.abs(tl));
    let yaw;
    if (drift) {
      const toObs = Math.atan2(P.oz - z, P.ox - x), lean = .12 + .55 * P.m * hash(k, 13, seed), tx = Math.cos(toObs), tz = Math.sin(toObs); ux += tx * Math.tan(lean); uz += tz * Math.tan(lean);
      yaw = hash(k, 14, seed) < .5 ? Math.PI / 2 - toObs + (hash(k, 15, seed) < .5 ? Math.PI / 2 : 0) + gauss(k, 16, seed) * .35 : Math.PI / 2 - toObs + gauss(k, 16, seed) * .4;   /* across the face, or pointing into it */
    } else if (K.lin && hash(k, 14, seed) < .7) {
      const gl = Math.hypot(g[0], g[1]) > .02 ? Math.atan2(-g[0], -g[1]) : hash(k, 17, seed) * TAU;   /* along the contour: perpendicular to the way the ground falls */
      yaw = gl + Math.PI / 2 + gauss(k, 16, seed) * .45;
    } else yaw = hash(k, 18, seed) * TAU;
    { const l = Math.hypot(ux, uy, uz); ux /= l; uy /= l; uz /= l; }
    let fx = Math.sin(yaw), fz = Math.cos(yaw), fy = 0; { const d = fx * ux + fy * uy + fz * uz; fx -= ux * d; fy -= uy * d; fz -= uz * d; const l = Math.hypot(fx, fy, fz) || 1; fx /= l; fy /= l; fz /= l; }
    const rx = uy * fz - uz * fy, ry = uz * fx - ux * fz, rz = ux * fy - uy * fx;   /* r = u cross f */
    const sc = K.sc[0] + (K.sc[1] - K.sc[0]) * hash(k, 19, seed), wv = .85 + .35 * hash(k, 20, seed), sx = sc * (K.lin || kd === 7 ? wv : 1), sy = sc * (K.lin ? Math.pow(wv, .6) : 1), sz = sc;
    const wetZ = zone === 1 ? 1.25 : zone === 2 ? .7 : 1;
    const bury = (K.bury[0] + (K.bury[1] - K.bury[0]) * hash(k, 21, seed)) * wetZ * K.hgt * sc;   /* partial burial: sunk into the ground by a share of its height */
    const px = x - ux * bury, py = h0 - uy * bury + pile, pz = z - uz * bury, o = k * 16;
    mat[o] = rx * sx; mat[o + 1] = ry * sx; mat[o + 2] = rz * sx; mat[o + 4] = ux * sy; mat[o + 5] = uy * sy; mat[o + 6] = uz * sy; mat[o + 8] = fx * sz; mat[o + 9] = fy * sz; mat[o + 10] = fz * sz;
    mat[o + 12] = px; mat[o + 13] = py; mat[o + 14] = pz; mat[o + 15] = 1;
    const bright = .82 + .36 * hash(k, 22, seed), tone = hash(k, 23, seed), weed = kd === 14 || kd === 15;
    tint[k * 3] = bright * (weed ? .75 + .6 * tone : .95 + .1 * tone); tint[k * 3 + 1] = bright * (weed ? .85 + .3 * hash(k, 24, seed) : 1); tint[k * 3 + 2] = bright * (weed ? .8 + .3 * tone : 1.05 - .1 * tone);
    arr[k] = 8 * clamp((x * dir[0] + z * dir[1] - F.umin) / (F.umax - F.umin), 0, 1) + 1.5 * hash(k, 25, seed);
    kind[k] = kd; zoneOut[k] = zone; pos[k * 3] = px; pos[k * 3 + 1] = py; pos[k * 3 + 2] = pz;
  }
  const byKind = new Int32Array(NK), byZone = [0, 0, 0, 0]; for (let k = 0; k < n; k++) { byKind[kind[k]]++; byZone[zoneOut[k]]++; }
  return { n, kind, zone: zoneOut, mat, tint, arr, pos, hid, ord, heaps, heapPieces: hm, Mh, byKind, byZone, field: F, lite: !!lite, hash: planHash(kind, pos, n) };
}
function planHash(kind, pos, n) { let h = 2166136261 >>> 0; for (let k = 0; k < n; k++) { h = Math.imul(h ^ kind[k], 16777619) >>> 0; h = Math.imul(h ^ Math.round(pos[k * 3] * 100), 16777619) >>> 0; h = Math.imul(h ^ Math.round(pos[k * 3 + 2] * 100), 16777619) >>> 0; } return (h >>> 0).toString(16).padStart(8, '0'); }

/* the hulk: ONE big half-buried old boat, a labelled placeholder. Placed on the biggest, most sheltered stretch of wrack line near the camp. */
function planHulk(env) {
  const F = buildField(env), G = F.G, seed = F.seed; let best = null, bs = -1;
  for (let j = 0; j < F.nF; j++) for (let i = 0; i < F.nF; i++) {
    const c = j * F.nF + i; if (F.zone[c] !== 0 || F.w[c] <= 0) continue;
    const x = F.cx(i), z = F.cx(j), g = G.grad(x, z, .8), sl = Math.hypot(g[0], g[1]); if (sl > .3) continue;
    let bad = false; for (const a of (env.avoid || [])) if (Math.hypot(a.x - x, a.z - z) < a.r + 3) { bad = true; break; } if (bad) continue;
    const fd = env.focus ? Math.hypot(x - env.focus.x, z - env.focus.z) : 0; if (env.focus && fd > 70) continue;
    const sc = F.w[c] * (1 + .5 * hash(i, j, seed)) - (env.focus ? fd * .004 : 0); if (sc > bs) { bs = sc; best = { x, z, g }; }
  }
  if (!best) return null; const g = best.g;
  const yaw = Math.hypot(g[0], g[1]) > .02 ? Math.atan2(-g[0], -g[1]) + Math.PI / 2 : hash(1, 2, seed) * TAU;   /* lying along the contour */
  return { x: best.x, z: best.z, y: G.h(best.x, best.z), yaw, units: HULK_UNITS };
}
const HULK_UNITS = 30;   /* TUNING: how many bundles of planks and fittings the hulk holds; a hand strips 3 at a time, a robot works only the loose heaps */

/* the swirl: a tidal eddy off the shore the surge reaches first, found by marching seaward from the exposed wrack line until the ground is well under water */
function planSwirl(env) {
  const F = buildField(env), G = F.G, d = F.dir; let sx = 0, sz = 0, sw = 0; const lim = F.umin + .28 * (F.umax - F.umin);
  for (let c = 0; c < F.nF * F.nF; c++) { if (F.zone[c] !== 0 || F.w[c] <= 0) continue; const i = c % F.nF, j = (c - i) / F.nF, x = F.cx(i), z = F.cx(j); if (x * d[0] + z * d[1] > lim) continue; const w = F.w[c] * (env.focus ? 1 / (1 + Math.hypot(x - env.focus.x, z - env.focus.z) / 30) : 1); sx += x * w; sz += z * w; sw += w; }
  if (!(sw > 0)) return { x: -d[0] * 30, z: -d[1] * 30, r: 7 };
  let x = sx / sw, z = sz / sw; for (let s = 0; s < 80; s++) { if (G.h(x, z) < -.7) break; x -= d[0] * .8; z -= d[1] * .8; }
  x -= d[0] * 5; z -= d[1] * 5; return { x, z, r: 8 };
}
/* what is shown of the plan: heap pieces fade out from the last piece back as the heap is gathered or taken, loose scenery thins with the tide's share (a 0/1 per piece) */
function visibility(P, remFrac, sceneryGone) {
  const v = new Uint8Array(P.n);
  for (let k = 0; k < P.n; k++) {
    const h = P.hid[k];
    if (h >= 0) { const f = remFrac[h] === undefined ? 1 : remFrac[h]; v[k] = P.ord[k] < Math.ceil(P.heapPieces[h] * f - 1e-9) ? 1 : 0; }
    else v[k] = hash(k, 77, 3) >= sceneryGone ? 1 : 0;
  }
  return v;
}

/* ---------- 6. the storm timeline (real seconds of storm time, ts) ---------- */
/* ts runs from the first overcast. build = the build-up (150 s normally, 45 s under &storm=1); then the storm itself; the surge begins 30 s into the storm. TUNING throughout. */
const SURGE = { rise: 16, hold: 6, fall: 28, travel: 3.2 };   /* a gentle rise over 16 s, a pause, then the water goes down over 28 s */
SURGE.total = SURGE.rise + SURGE.hold + SURGE.fall;
const STORM_SEC = { storm: 60, showers: 70, surgeAt: 30, swirlAt: 8, swirlRamp: 9 };   /* from the end of the build: how long it blows, then showers, when the surge and the swirl begin */
function surgeEnv(t) { if (t < 0 || t > SURGE.total) return 0; if (t < SURGE.rise) return sm01(t / SURGE.rise); if (t < SURGE.rise + SURGE.hold) return 1; return 1 - sm01((t - SURGE.rise - SURGE.hold) / SURGE.fall); }
const SURGE_HW = 1.3;   /* the highest water mark the surge reaches (m on the page's own scale; the top of an ordinary spring tide is about 1.1) */
function surgeLift(tide, t, hw) { const e = surgeEnv(t); return e > 0 ? Math.max(0, (hw - tide)) * e : 0; }
function stormEnd(build) { return build + STORM_SEC.storm + STORM_SEC.showers; }
function stormAt(ts, build) {
  const B = build, s0 = B + STORM_SEC.surgeAt, sw0 = B + STORM_SEC.swirlAt, end = stormEnd(B);
  const phase = ts < 0 ? 'none' : ts < B ? 'build' : ts < B + STORM_SEC.storm ? 'storm' : ts < end ? 'showers' : 'done';
  let weather = null; if (ts >= 0 && ts < end) weather = ts < .3 * B ? 'overcast' : ts < B ? 'rain' : ts < B + STORM_SEC.storm ? 'storm' : 'showers';
  const quiet = ts < 0 ? 0 : ts < .25 * B ? 0 : ts < .7 * B ? sm01((ts - .25 * B) / (.45 * B)) : ts < B + 80 ? 1 : ts < B + 130 ? 1 - sm01((ts - B - 80) / 50) : 0;
  const surgeT = ts >= s0 && ts <= s0 + SURGE.total ? ts - s0 : -1;
  const swirlK = ts < sw0 ? 0 : ts < sw0 + STORM_SEC.swirlRamp ? sm01((ts - sw0) / STORM_SEC.swirlRamp) : ts < s0 + SURGE.total ? 1 : ts < s0 + SURGE.total + 14 ? 1 - sm01((ts - s0 - SURGE.total) / 14) : 0;
  return { phase, weather, quiet, surgeT, swirlK, baro: baro(ts, B), trend: baroTrend(ts, B), rain: ts < 0 ? 0 : clamp((ts - .3 * B) / (.7 * B), 0, 1) };
}
/* the barometer in hPa: a slow fall over the build-up to the low in the storm, a recovery after (TUNING; the real fall in a deepening low is a few hPa an hour) */
function baro(ts, B) { const hi = 1017, lo = 986, back = 1005; if (ts <= 0) return hi; if (ts < B + 25) return hi + (lo - hi) * sm01(ts / (B + 25)); const e = stormEnd(B); if (ts < e) return lo + (back - lo) * sm01((ts - B - 25) / (e - B - 25)); return back; }
function baroTrend(ts, B) { const d = baro(ts + 4, B) - baro(ts - 4, B); return d < -1.6 ? 'falling fast' : d < -.3 ? 'falling' : d > 1.2 ? 'rising fast' : d > .25 ? 'rising' : 'steady'; }
/* the trigger. st = the storm part of the gift state; gh = game hours since midnight of day 1; night = the first night has passed (the bottle was read). The first storm comes on the morning of day 2;
   after that once a game season (90 days) at a seeded day, and never inside ten days of the last. */
const FIRST_GH = 32.5, SEASON_DAYS = 90, GAP_DAYS = 10;
function nextDue(st, seed) {
  const n = st.n | 0; if (n === 0) return FIRST_GH;
  const at = n * SEASON_DAYS * 24 + 24 * Math.floor(hash(n, 5, seed | 0) * 30) + 9, quiet = (st.endGh || 0) + GAP_DAYS * 24;
  return Math.max(at, quiet);
}
function stormDue(st, gh, night, seed) { if (!st || st.phase !== 'none') return false; if (st.n === 0 && !night) return false; return gh >= nextDue(st, seed); }
/* the tide takes back what is not gathered: nothing for GRACE hours after the water has gone, then over SPAN hours (about two game days all told), each heap on its own seeded clock */
const TAKE = { grace: 10, span: 38, warn1: 18, warn2: 36 };
function lostFrac(gh, endGh, jit) { const sp = TAKE.span * (.8 + .4 * (jit === undefined ? .5 : jit)); return clamp((gh - endGh - TAKE.grace) / sp, 0, 1); }
function remaining(heap, taken, gh, endGh) { const t = taken || 0, lost = Math.round(heap.n0 * sm01(lostFrac(gh, endGh, heap.jit))); return Math.max(0, heap.n0 - t - lost); }
const sceneryGone = (gh, endGh) => sm01(lostFrac(gh, endGh, .5));   /* the loose scenery thins at the same pace (a share of the pieces, not a count) */
function l9Due(endGh) { return (Math.floor(endGh / 24) + 1) * 24 + 7; }   /* the morning after the water has gone: 07:00 */
/* hand and robot picks: how many units a pick takes (never more than is there, never past what a full stock can hold) */
function pickUnits(rem, want, have, cap) { return Math.max(0, Math.min(rem, want, cap - have)); }

/* ---------- 7. the save (a part of the gift's save; stored as state.storm) ---------- */
const SAVE_V = 1;
function newStorm() { return { v: SAVE_V, n: 0, phase: 'none', ts: 0, build: 150, startGh: 0, endGh: 0, taken: {}, hulk: HULK_UNITS, l9: 0, warn: 0 }; }
function sanitize(o) {
  const s = newStorm(); if (!o || typeof o !== 'object') return s;
  const num = (v, d, lo, hi) => (typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : d);
  s.n = Math.round(num(o.n, 0, 0, 999)); s.phase = ['none', 'run', 'haul'].includes(o.phase) ? o.phase : 'none'; s.ts = num(o.ts, 0, 0, 3000); s.build = num(o.build, 150, 8, 600);
  s.startGh = num(o.startGh, 0, 0, 1e6); s.endGh = num(o.endGh, 0, 0, 1e6); s.hulk = Math.round(num(o.hulk, HULK_UNITS, 0, HULK_UNITS)); s.l9 = Math.round(num(o.l9, 0, 0, 2)); s.warn = Math.round(num(o.warn, 0, 0, 9));
  if (o.taken && typeof o.taken === 'object') for (const k of Object.keys(o.taken).slice(0, 200)) { const i = parseInt(k, 10); if (i >= 0 && i < 200) { const v = Math.round(num(o.taken[k], 0, 0, 99)); if (v > 0) s.taken[i] = v; } }
  if (s.phase === 'haul' && !(s.n > 0)) s.phase = 'none';
  return s;
}
const stormSeed = (seed, n, add) => ((seed | 0) * 7919 + (n | 0) * 104729 + (add | 0) * 15485863) | 0;

/* ---------- 8. the bench: steps, the knee finder, the report (pure) ---------- */
const KNEE = { limitMs: 100, run: 5, hardSec: 120, stepSec: 6, warm: 1.5 };   /* a frame over 100 ms five times in a row ends the bench by itself; the whole bench never runs past two minutes; a step lasts 6 s (1.5 s warm-up) */
function benchSteps(cap) { const s = BENCH_STEPS.filter(x => x <= cap); if (!s.length || s[s.length - 1] < cap) s.push(cap); return s; }
function kneeHit(iv, opt) { const o = Object.assign({}, KNEE, opt || {}); if (iv.length < o.run) return false; for (let i = iv.length - o.run; i < iv.length; i++) if (!(iv[i] > o.limitMs)) return false; return true; }
function percentile(a, p) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), i = clamp(Math.ceil(p * s.length) - 1, 0, s.length - 1); return s[i]; }
function stepStats(iv) { let s = 0, mx = 0; for (const v of iv) { s += v; if (v > mx) mx = v; } const n = iv.length, avg = n ? s / n : 0; return { frames: n, avg, p95: percentile(iv, .95), max: mx, fps: avg > 0 ? 1000 / avg : 0 }; }
function holds(st, fps) { const b = 1000 / fps; return st.frames >= 3 && st.avg <= b * 1.05 && st.p95 <= b * 1.35; }
function benchVerdict(results) { const o = { c60: 0, c30: 0, any60: false, any30: false }; for (const r of results) { if (holds(r, 60)) { if (!o.stop60) { o.c60 = r.count; o.any60 = true; } } else o.stop60 = true; } for (const r of results) { if (holds(r, 30)) { if (!o.stop30) { o.c30 = r.count; o.any30 = true; } } else o.stop30 = true; } return o; }
function benchReport(info, results, why) {
  const f = (v, d) => (isFinite(v) ? v.toFixed(d) : '-'), L = ['Living Islands storm haul debris bench', 'tier: ' + info.tier + (info.device ? '   device: ' + info.device : '') + '   cap: ' + info.cap + (info.url ? '   url: ' + info.url : ''),
    'GPU: ' + (info.gpu || 'unknown') + (info.gpuKind ? ' (' + info.gpuKind + ')' : ''), 'window: ' + (info.screen || '?') + '   canvas: ' + (info.canvas || '?') + '   seed: ' + (info.seed !== undefined ? info.seed : '?'),
    'each step: ' + f(info.warm, 1) + ' s warm-up (not counted), then ' + f(info.sec, 1) + ' s measured; camera fixed on the haul; the whole page draws (sea, sky, post)', '',
    'pieces   draws   triangles(all passes)   avg ms   p95 ms   max ms   fps   60   30'];
  for (const r of results) L.push(String(r.count).padStart(6) + String(r.calls).padStart(9) + String(r.tris).padStart(22) + f(r.avg, 1).padStart(9) + f(r.p95, 1).padStart(9) + f(r.max, 1).padStart(9) + f(r.fps, 0).padStart(6) + (holds(r, 60) ? '  yes' : '   no') + (holds(r, 30) ? '  yes' : '   no'));
  const v = benchVerdict(results);
  L.push('', 'highest count that holds 60 fps (before the first step that does not): ' + (v.any60 ? v.c60 : 'none of these steps'), 'highest count that holds 30 fps (before the first step that does not): ' + (v.any30 ? v.c30 : 'none of these steps'),
    '"holds N fps" means: average frame time at most 5 percent over 1000/N ms and the 95th percentile at most 35 percent over it.', 'bench ended: ' + (why || 'finished every step'));
  if (info.software) L.push('SOFTWARE RENDERING: these numbers are a CPU emulating a card. They say nothing about a real GPU.');
  L.push('Read it as a measure of this browser, this card and this window only. Frame time includes the whole page, not just the debris.');
  return L.join('\n');
}
/* ---------- 7. the geometry of every kind (flat shaded, baked-look vertex colours, sRGB; the page makes them linear) ---------- */
function vn3(x, y, z, s) { return vnoise(x + y * 1.7, z - y * .9, s); }
function Builder() { this.p = []; this.c = []; }
Builder.prototype.tri = function (a, b, c, ca, cb, cc, cen) {
  /* flat normal, flipped to point away from cen when given (closed shapes) so the page can draw front faces only */
  if (cen) { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, mx = (a[0] + b[0] + c[0]) / 3 - cen[0], my = (a[1] + b[1] + c[1]) / 3 - cen[1], mz = (a[2] + b[2] + c[2]) / 3 - cen[2]; if (nx * mx + ny * my + nz * mz < 0) { const t = b; b = c; c = t; const tc = cb; cb = cc; cc = tc; } }
  this.p.push(a, b, c); this.c.push(ca, cb || ca, cc || ca);
};
Builder.prototype.quad = function (a, b, c, d, cf, cen) { const f = typeof cf === 'function' ? cf : () => cf; this.tri(a, b, c, f(a), f(b), f(c), cen); this.tri(a, c, d, f(a), f(c), f(d), cen); };
Builder.prototype.box = function (cx, cy, cz, sx, sy, sz, cf, yaw, yaw2) {
  const co = Math.cos(yaw || 0), si = Math.sin(yaw || 0), hx = sx / 2, hy = sy / 2, hz = sz / 2, cen = [cx, cy, cz];
  const P = (a, b, c) => [cx + a * co + c * si, cy + b, cz - a * si + c * co], f = typeof cf === 'function' ? cf : () => cf;
  const v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz), P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)];
  const F = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]];
  for (const q of F) this.quad(v[q[0]], v[q[1]], v[q[2]], v[q[3]], f, cen);
};
/* a lathe along y (axis 'y') or z: rings = [[t, r], ...] along the axis, seg sides, wob = radial wobble, caps = close the ends */
Builder.prototype.lathe = function (cx, cy, cz, rings, seg, axis, cf, wob, caps, seed, flat) {
  const f = typeof cf === 'function' ? cf : () => cf, sd = seed || 1, P = (t, r, a) => { const w = 1 + (wob ? (hash(Math.round(t * 100) + 7, Math.round(a * 100 / TAU * seg), sd) - .5) * wob : 0), ca = Math.cos(a) * r * w, sa = Math.sin(a) * r * w * (flat || 1); return axis === 'z' ? [cx + ca, cy + sa, cz + t] : [cx + ca, cy + t, cz + sa]; };
  const cen = i => axis === 'z' ? [cx, cy, cz + rings[i][0]] : [cx, cy + rings[i][0], cz];
  const mid = axis === 'z' ? [cx, cy, cz + (rings[0][0] + rings[rings.length - 1][0]) / 2] : [cx, cy + (rings[0][0] + rings[rings.length - 1][0]) / 2, cz];
  for (let i = 0; i + 1 < rings.length; i++) for (let s = 0; s < seg; s++) {
    const a0 = s / seg * TAU, a1 = (s + 1) / seg * TAU, p00 = P(rings[i][0], rings[i][1], a0), p01 = P(rings[i][0], rings[i][1], a1), p10 = P(rings[i + 1][0], rings[i + 1][1], a0), p11 = P(rings[i + 1][0], rings[i + 1][1], a1);
    this.quad(p00, p01, p11, p10, f, mid);
  }
  if (caps) for (const e of [0, rings.length - 1]) { const ctr = cen(e); if (rings[e][1] < 1e-4) continue; for (let s = 0; s < seg; s++) { const a0 = s / seg * TAU, a1 = (s + 1) / seg * TAU, A = P(rings[e][0], rings[e][1], a0), B = P(rings[e][0], rings[e][1], a1); this.tri(ctr, A, B, f(ctr), f(A), f(B), mid); } }
};
Builder.prototype.blob = function (cx, cy, cz, rx, ry, rz, nu, nv, amp, cf, seed, upper) {
  const f = typeof cf === 'function' ? cf : () => cf, V = (i, j) => { const th = i / nu * TAU, ph = (upper ? j / nv * Math.PI / 2 : j / nv * Math.PI), w = 1 + (hash(i % nu, j, seed) - .5) * amp * (j === 0 || (!upper && j === nv) ? 0 : 1);
    return [cx + Math.cos(th) * Math.sin(ph) * rx * w, cy + Math.cos(ph) * ry * w, cz + Math.sin(th) * Math.sin(ph) * rz * w]; };
  const cen = [cx, cy, cz];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = V(i, j), b = V(i + 1, j), c = V(i + 1, j + 1), d = V(i, j + 1); if (j === 0) this.tri(a, c, d, f(a), f(c), f(d), cen); else if (!upper && j === nv - 1) this.tri(a, b, d, f(a), f(b), f(d), cen); else this.quad(a, b, c, d, f, cen); }
  if (upper) { for (let i = 0; i < nu; i++) { const a = V(i, nv), b = V(i + 1, nv); this.tri([cx, cy, cz], b, a, f([cx, cy, cz]), f(b), f(a)); } }
};
Builder.prototype.ribbon = function (pts, wid, cf) { const f = typeof cf === 'function' ? cf : () => cf; for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1, nx = -dz / l * wid / 2, nz = dx / l * wid / 2;
  this.quad([a[0] - nx, a[1], a[2] - nz], [a[0] + nx, a[1], a[2] + nz], [b[0] + nx * .7, b[1], b[2] + nz * .7], [b[0] - nx * .7, b[1], b[2] - nz * .7], f); } };
Builder.prototype.finish = function () {
  const n = this.p.length, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 3) {
    const a = this.p[i], b = this.p[i + 1], c = this.p[i + 2], ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (let q = 0; q < 3; q++) { const p = this.p[i + q], o = (i + q) * 3, cc = this.c[i + q]; pos[o] = p[0]; pos[o + 1] = p[1]; pos[o + 2] = p[2]; nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz; col[o] = cc[0]; col[o + 1] = cc[1]; col[o + 2] = cc[2]; }
  }
  return { pos, nor, col, tris: n / 3 };
};
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const PAL = { wood: [.56, .46, .34], dark: [.34, .27, .19], pale: [.76, .70, .60], endg: [.80, .70, .54], teal: [.28, .50, .52], red: [.62, .26, .20], rust: [.52, .27, .13], rope: [.74, .62, .42], net: [.40, .50, .48], float: [.92, .52, .16], olive: [.36, .40, .16], kelp: [.46, .35, .16], tip: [.58, .62, .30], metal: [.36, .34, .32], band: [.28, .26, .24], sail: [.82, .78, .68], glass: [.24, .52, .40], glass2: [.34, .62, .50], cork: [.62, .46, .28], label: [.74, .66, .50] };
/* a weathered wood colour at a point: pale bleached grain streaks along z, darker towards the ground side, tinted by an optional paint */
function woodAt(base, s, along) { return p => { const x = p[0], y = p[1], z = p[2]; const g = vn3(x * 9, y * 9, z * 1.7, s) * .5 + vn3(x * 3, y * 3, z * .6, s + 3) * .5; let c = mixc(mul(base, .8), mixc(base, PAL.pale, .45), g); if (along === 'x') c = mixc(mul(base, .8), mixc(base, PAL.pale, .45), vn3(z * 9, y * 9, x * 1.7, s)); return mul(c, .86 + .2 * clamp(y * 4 + .5, 0, 1)); }; }
function endGrain(c, a) { return mixc(c, PAL.endg, a); }
function buildKind(id, lo) {
  const B = new Builder(), s = 100 + id * 17;
  switch (id) {
    case 0: case 1: case 2: {
      const L = [.9, 1.8, 3.0][id], w = [.12, .15, .2][id] + (id === 2 ? .01 : 0), t = .04, wc = woodAt(id === 1 ? mixc(PAL.wood, PAL.teal, .35) : PAL.wood, s);
      B.box(0, t / 2, 0, w, t, L, wc);
      /* the broken end: a short wedge of splinters, with a lighter end grain */
      const e = L / 2; B.tri([-w / 2, 0, e], [w / 2, 0, e], [w * .1, t * .9, e + .22 * L / 3], endGrain(PAL.wood, .6), endGrain(PAL.wood, .6), endGrain(PAL.pale, .3), [0, t / 2, e]);
      B.tri([-w / 2, t, e], [w / 2, t, e], [-w * .3, t * .9, e + .12], endGrain(PAL.wood, .5), endGrain(PAL.wood, .5), PAL.pale, [0, t / 2, e]);
      B.box(0, t + .004, -L * .25, w * .9, .008, .02, PAL.metal);   /* a nail line */
      break; }
    case 3: { const L = 2.6, r = .15; B.lathe(0, r, 0, [[-L / 2, r * .75], [-L * .3, r * .95], [0, r], [L * .3, r * .9], [L / 2, r * .7]], 7, 'z', p => mixc(mixc(PAL.dark, PAL.pale, .55 + .35 * vn3(p[0] * 8, p[1] * 8, p[2] * 1.2, s)), PAL.endg, Math.abs(p[2]) > L * .47 ? .6 : 0), .12, true, s);
      B.lathe(r * .9, r + .1, .3, [[0, .035], [.22, .01]], 4, 'y', mixc(PAL.dark, PAL.pale, .4), 0, true, s + 1); B.lathe(-r * .6, r + .1, -.5, [[0, .03], [.2, .01]], 4, 'y', mixc(PAL.dark, PAL.pale, .5), 0, true, s + 2); break; }
    case 4: { const r = .22; B.lathe(0, 0, 0, [[0, r * 1.15], [.25, r], [.5, r * .85]], 7, 'y', p => mixc(mixc(PAL.dark, PAL.pale, .5), PAL.endg, p[1] > .45 ? .6 : 0), .18, true, s);
      for (let k = 0; k < 4; k++) { const a = k * 1.6 + .3; B.lathe(Math.cos(a) * r * .8, .08, Math.sin(a) * r * .8, [[0, .09], [.5, .02]], 4, 'z', PAL.dark, 0, true, s + k); } break; }
    case 5: case 6: {
      const R = .31, Hh = .85, rings = [[0, R * .86], [Hh * .25, R], [Hh * .5, R * 1.1], [Hh * .75, R], [Hh, R * .86]];
      const cf = (p) => { const x = p[0], y = p[1], z = p[2]; const t = id === 6 ? z : y; const hoop = (Math.abs(t - Hh * .2) < .05 || Math.abs(t - Hh * .8) < .05 || Math.abs(t - Hh * .5) < .035) ? 1 : 0; const w = mixc(PAL.wood, PAL.red, .18); return hoop ? PAL.rust : mul(mixc(mul(w, .75), PAL.pale, .35 * vn3(x * 12, y * 12, z * 12, s)), 1); };
      if (id === 6) B.lathe(0, R * 1.05, 0, rings.map(r => [r[0] - Hh / 2, r[1]]), lo ? 7 : 10, 'z', p => cf([p[0], p[1], p[2] + Hh / 2]), .04, true, s);
      else B.lathe(0, 0, 0, rings, lo ? 7 : 10, 'y', cf, .04, true, s);
      break; }
    case 7: case 8: {
      const S = .56, cf = woodAt(mixc(PAL.wood, PAL.teal, .5), s), post = woodAt(PAL.dark, s + 1);
      for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) B.box(px * S / 2, S / 2, pz * S / 2, .06, S, .06, post);
      B.box(0, .015, 0, S, .03, S, post);
      if (lo) { B.box(0, S / 2, 0, S, S, S, cf, 0); B.box(0, S * .96, 0, S * 1.06, .05, S * 1.06, post); break; }
      const open = id === 8;
      for (const y of open ? [.14, .4] : [.16, .4]) { B.box(0, y, -S / 2, S, .12, .025, cf, 0); B.box(0, y, S / 2, S, .12, .025, cf, 0); if (!(open && y > .3)) { B.box(-S / 2, y, 0, .025, .12, S, cf, 0); B.box(S / 2, y, 0, .025, .12, S, cf, 0); } }
      if (open) { B.box(-.1, .5, -S / 2 + .02, .06, .22, .02, cf, .9); }
      break; }
    case 9: { const R = .26;
      const nu = lo ? 6 : 10, nv = lo ? 3 : 5, f = (u, v) => { const a = u * TAU, b = v * TAU; return [Math.cos(a) * (R + .06 * Math.cos(b)), .06 + .06 * Math.sin(b) + (Math.sin(a * 2) * .012), Math.sin(a) * (R + .06 * Math.cos(b))]; };
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = f(i / nu, j / nv), b = f((i + 1) / nu, j / nv), c = f((i + 1) / nu, (j + 1) / nv), d = f(i / nu, (j + 1) / nv), col = mixc(PAL.rope, mul(PAL.rope, .6), (i % 2) * .6); B.quad(a, b, c, d, col, [Math.cos((i + .5) / nu * TAU) * R, .06, Math.sin((i + .5) / nu * TAU) * R]); }
      B.box(R + .12, .035, .05, .26, .045, .045, PAL.rope, .3); break; }
    case 10: { B.blob(0, 0, 0, .75, .26, .6, lo ? 6 : 9, lo ? 3 : 4, .5, (p) => { const g = vn3(p[0] * 10, p[1] * 10, p[2] * 10, s); return mixc(mul(PAL.net, .8), mixc(PAL.net, PAL.rope, .5), g); }, s, true);
      for (const [x, z] of [[.3, .2], [-.25, .35], [.1, -.4]]) B.box(x, .27, z, .1, .09, .1, PAL.float, x * 5); break; }
    case 11: {
      const kc = woodAt(PAL.dark, s), L = 2.4; B.box(0, .04, 0, .09, .08, L, kc);
      for (let i = 0; i < 5; i++) { const z = -L / 2 + .25 + i * (L - .5) / 4, hgt = .5 - Math.abs(i - 2) * .06;
        for (const sd of [-1, 1]) { B.box(sd * .14, .22, z, .05, .3, .05, kc, 0); B.box(sd * .30, .48 * hgt / .5 + .02, z, .05, .26 * hgt / .5, .05, kc, 0); } }
      B.box(.3, .5, .1, .03, .03, 1.2, kc); B.box(.4, .2, .4, .03, .03, .6, woodAt(PAL.wood, s + 3)); break; }
    case 12: case 13: {
      const Rr = 1.0, th = .05, a0 = -1.0, a1 = 1.0, ns = 6, nz = 4, L = 1.8, up = id === 12;
      const P = (a, z, r) => up ? [Math.sin(a) * r, Math.cos(a) * r - Rr * Math.cos(a1), z] : [Math.sin(a) * r, Rr - Math.cos(a) * r, z];
      const paint = (i) => i % 3 === 0 ? mixc(PAL.wood, PAL.teal, .7) : mixc(PAL.wood, PAL.pale, .2);
      for (let i = 0; i < ns; i++) for (let j = 0; j < nz; j++) {
        const A0 = a0 + (a1 - a0) * i / ns, A1 = a0 + (a1 - a0) * (i + 1) / ns, z0 = -L / 2 + L * j / nz + (j % 2) * .05, z1 = z0 + L / nz, c = mul(paint(i), .8 + .3 * hash(i, j, s));
        for (const r of [Rr, Rr - th]) { const q = [P(A0, z0, r), P(A1, z0, r), P(A1, z1, r), P(A0, z1, r)]; B.quad(q[0], q[1], q[2], q[3], r === Rr ? c : mul(PAL.dark, 1.1)); }
        if (i === 0 || i === ns - 1) { const A = i === 0 ? A0 : A1; B.quad(P(A, z0, Rr), P(A, z1, Rr), P(A, z1, Rr - th), P(A, z0, Rr - th), PAL.endg); }
        if (j === 0 || j === nz - 1) { const z = j === 0 ? z0 : z1; B.quad(P(A0, z, Rr), P(A1, z, Rr), P(A1, z, Rr - th), P(A0, z, Rr - th), PAL.endg); }
      } break; }
    case 14: { B.blob(0, 0, 0, .5, .16, .45, lo ? 6 : 8, lo ? 3 : 4, .5, (p) => mixc(PAL.olive, PAL.kelp, vn3(p[0] * 6, p[1] * 6, p[2] * 6, s)), s, true);
      for (let i = 0; i < (lo ? 3 : 6); i++) { const a = i / 6 * TAU + .4, r = .35; B.ribbon([[Math.cos(a) * r, .12, Math.sin(a) * r], [Math.cos(a) * (r + .35), .05, Math.sin(a) * (r + .35) + .1], [Math.cos(a + .2) * (r + .7), .02, Math.sin(a + .2) * (r + .7)]], .09, p => mixc(PAL.kelp, PAL.tip, p[2] * .5 + .5)); }
      break; }
    case 15: { for (let i = 0; i < (lo ? 5 : 9); i++) { const a = hash(i, 1, s) * TAU, r0 = .15 + hash(i, 2, s) * .3, L = .5 + hash(i, 3, s) * .6, wob = (hash(i, 4, s) - .5) * .5, cp = [Math.cos(a) * r0, .05 + hash(i, 5, s) * .05, Math.sin(a) * r0];
        const pts = [cp, [cp[0] + Math.cos(a + wob) * L * .5, .07, cp[2] + Math.sin(a + wob) * L * .5], [cp[0] + Math.cos(a + wob * 2) * L, .02, cp[2] + Math.sin(a + wob * 2) * L]];
        B.ribbon(pts, .12 + hash(i, 6, s) * .1, p => mixc(i % 3 === 0 ? PAL.olive : PAL.kelp, PAL.tip, clamp((p[1] - .02) * 8, 0, .8))); }
      B.blob(0, 0, 0, .35, .1, .32, 7, 3, .5, PAL.olive, s, true); break; }
    case 16: { const R = .45, teeth = 8; const seg = teeth * 2;
      B.lathe(0, 0, 0, [[0, R * .8], [.08, R * .8]], seg, 'y', p => mixc(PAL.rust, PAL.metal, .5 + .4 * vn3(p[0] * 7, 0, p[2] * 7, s)), 0, true, s);
      for (let i = 0; i < teeth; i++) { const a = (i + .5) / teeth * TAU; B.box(Math.cos(a) * R * .92, .04, Math.sin(a) * R * .92, .13, .08, .12, mixc(PAL.rust, PAL.metal, .6), -a + Math.PI / 2); }
      B.lathe(0, .08, 0, [[0, .09], [.02, .09]], 8, 'y', PAL.band, 0, true, s); break; }
    case 17: { B.lathe(0, .09, 0, [[-.6, .07], [.6, .07]], 8, 'z', p => mixc(PAL.rust, PAL.metal, .35 + .5 * vn3(p[0] * 9, p[1] * 9, p[2] * 4, s)), .05, true, s);
      B.lathe(0, .09, .55, [[0, .11], [.05, .11]], 8, 'z', PAL.band, 0, true, s); B.lathe(0, .09, -.55, [[0, .11], [.05, .11]], 8, 'z', PAL.band, 0, true, s); break; }
    case 18: { const R = .05;   /* a bottle: green glass, a cork, lying on its side (the model is drawn about twice life size so a heap reads from the air) */
      B.lathe(0, R * 1.1, 0, [[-.2, R * .9], [-.17, R], [.05, R], [.1, R * .8], [.17, R * .32], [.25, R * .28]], lo ? 5 : 7, 'z', p => mixc(mixc(PAL.glass, PAL.glass2, vn3(p[0] * 20, p[1] * 20, p[2] * 8, s)), PAL.cork, p[2] > .245 ? 1 : 0), 0, true, s); break; }
    case 19: { const R = .1, Hh = .13;   /* a tin: a short can with a rim, a faded label band */
      B.lathe(0, 0, 0, [[0, R], [Hh * .08, R * 1.04], [Hh * .2, R], [Hh * .8, R], [Hh * .92, R * 1.04], [Hh, R]], lo ? 6 : 8, 'y', p => (p[1] > Hh * .2 && p[1] < Hh * .8) ? mixc(PAL.label, PAL.rust, .35 + .4 * vn3(p[0] * 30, p[1] * 30, p[2] * 30, s)) : mixc(PAL.metal, PAL.rust, .35), .04, true, s); break; }
    default: return null;
  }
  const g = B.finish(); g.id = id; g.name = KINDS[id].name; return g;
}

/* ---------- 9. the hulk (a placeholder shape of our own: a ribbed half hull, with gaps where planks have gone) ---------- */
function buildHulk() {
  const B = new Builder(), L = 7.2, R = 1.55, N = 14, S = 6, s = 4242, wood = woodAt(PAL.wood, s), dark = woodAt(PAL.dark, s + 1), paint = woodAt(mixc(PAL.wood, PAL.teal, .75), s + 2);
  const P = (i, j, sd) => {   /* a point on the outer skin: station i of N, strake edge j of S, side sd */
    const u = i / N * 2 - 1, wf = Math.pow(Math.max(.04, 1 - u * u), .62), a = j / S * 1.3, x = sd * R * Math.sin(a) * wf, y = R * (1 - Math.cos(a)) * (.55 + .45 * wf) + .85 * Math.pow(Math.abs(u), 3) * (u < 0 ? 1.15 : 1) * (.4 + .6 * j / S);
    return [x, y, u * L / 2];
  };
  B.box(0, .06, 0, .16, .14, L * .98, dark);   /* the keel */
  for (const sd of [-1, 1]) for (let i = 0; i < N; i++) for (let j = 0; j < S; j++) {
    const gone = hash(i * 7 + j, sd + 3, s) < (j >= S - 2 ? .38 : .12);   /* the upper strakes have mostly rotted away */
    if (gone) continue;
    const c = hash(i, j * 3 + sd, s) < .18 ? paint : wood;
    B.quad(P(i, j, sd), P(i + 1, j, sd), P(i + 1, j + 1, sd), P(i, j + 1, sd), c);
  }
  for (const sd of [-1, 1]) for (let i = 1; i < N; i += 1) {   /* ribs: thin strips just inside the skin; some broken short */
    const top = hash(i, 9 + sd, s) < .35 ? S - 2 : S;
    for (let j = 0; j < top; j++) { const a = P(i, j, sd), b = P(i, j + 1, sd), t = .09; B.quad([a[0] * .96, a[1] + .02, a[2] - t], [b[0] * .96, b[1] + .02, b[2] - t], [b[0] * .96, b[1] + .02, b[2] + t], [a[0] * .96, a[1] + .02, a[2] + t], dark); }
  }
  B.box(0, .62, -L * .18, R * 1.6, .07, .22, dark);   /* a thwart, still across */
  const g = B.finish(); g.name = 'hulk'; return g;
}
const HULK_PLACEHOLDER = 'placeholder: a ribbed half hull built from boxes and strips (no old-boat model in the kit yet)';

const geometryStats = lite => { const o = []; for (let i = 0; i < NK; i++) { const g = buildKind(i, lite); o.push({ id: i, name: KINDS[i].name, tris: g ? g.tris : 0 }); } return o; };
const api = { TIER_CAP, MIN_COUNT, BENCH_STEPS, LITE_SET, KINDS, NK, KW, HEAP_POOL, HEAP_LIGHT, HEAP_LABEL, HEAP_N, STOCK_IDS, NHEAP, HEAP_SHARE, HAND_TAKE, TRIP_TAKE, SURGE, SURGE_HW, STORM_SEC, TAKE, KNEE, FIRST_GH, SEASON_DAYS, GAP_DAYS, HULK_UNITS, HULK_PLACEHOLDER,
  options, tierCap, effectiveCount, defaultCount, isLite, makeGround, vnoise, buildField, samplePoint, planHeaps, plan, planHulk, planSwirl, visibility, surgeEnv, surgeLift, stormAt, stormEnd, baro, baroTrend, nextDue, stormDue, lostFrac, remaining, sceneryGone, l9Due, pickUnits,
  newStorm, sanitize, stormSeed, buildKind, buildHulk, geometryStats, benchSteps, kneeHit, percentile, stepStats, holds, benchVerdict, benchReport, hash, upper, planHash };
if (typeof module === 'object' && module && module.exports) module.exports = api;
root.LI_STORM = Object.assign(root.LI_STORM || {}, api);
if (typeof window === 'undefined' || typeof document === 'undefined') return;

/* ====================================================================================================================================================================
   PART 2: the page (THREE + DOM)
   ==================================================================================================================================================================== */
const S = { A: null, C: null, THREE: null, opts: null, st: null, ready: false, plan: null, planN: 0, env: null, batches: [], group: null, mats: null, depth: null, hulk: null, swirl: null, lastSwirlSite: null, qOf: null, shown: 0, request: 0, bench: false,
  ts: 0, m: null, surgeT: -1, lift: 0, quiet: 0, ring: [], lastNow: 0, calls: 0, tris: 0, lastStat: 0, panelOn: false, pick: null, sites: [], siteHeap: {}, pend: {}, prevSt: {}, parked: [], baseWork: 0, err: [], notes: [], lastVis: '', visT: 0, siteT: 0, baroHist: [], baroT: 0, warned: {}, testStarted: false, sweep: null, report: '', planMs: 0, buildMs: 0 };
const lin = c => [Math.pow(c[0], 2.2), Math.pow(c[1], 2.2), Math.pow(c[2], 2.2)];
function vertexInject(withNormal) {
  return `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
  { vec3 ip = vec3( instanceMatrix[3] );
    if ( uSg.x >= 0.0 ) {
      float yEff = min( ip.y, uSg2.x - 0.1 );
      if ( uSg.x < aArr || ( uSg.w < 0.5 && uSg.z < yEff - 0.12 ) ) { mvPosition.y -= 80.0; }   /* not yet reached (uSg.w = 1 once the water has peaked: whatever came in stays) */
      else {
        float e = 1.0 - clamp( ( uSg.x - aArr ) / uSg.y, 0.0, 1.0 );
        mvPosition.xz -= uSgDir * ( e * e * 6.0 );
        float lift = max( 0.0, uSg.z - 0.05 - ip.y );
        mvPosition.y += lift + sin( uSg.x * 1.7 + ip.x * 0.9 + ip.z * 1.3 ) * 0.03 * step( 0.001, lift );
      }
    }
  }
#endif
${withNormal ? 'vWP = mvPosition.xyz;\n#ifdef USE_INSTANCING\n  vWN = normalize( mat3( instanceMatrix ) * objectNormal );\n#else\n  vWN = normalize( objectNormal );\n#endif' : ''}
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`;
}

/* the surge patch: debris arrives with the water. uSg = (surge seconds or -1, travel seconds, water level, 1 once peaked), uSg2 = (highest mark), uSgDir = the way the surge travels */
function patchMaterial(mat, key) {
  mat.customProgramCacheKey = () => 'storm-' + key;
  mat.onBeforeCompile = sh => {
    sh.uniforms.uSg = S.uSg; sh.uniforms.uSg2 = S.uSg2; sh.uniforms.uSgDir = S.uDir;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform vec4 uSg;uniform vec4 uSg2;uniform vec2 uSgDir;attribute float aArr;').replace('#include <project_vertex>', vertexInject(false));
  };
  return mat;
}
function tierNow() { return S.C.tier(); }
function deviceNow() { try { return S.C.device ? S.C.device() : ''; } catch (e) { return ''; } }
const liteNow = () => isLite(tierNow(), S.C.ar);
function capNow() { return tierCap(tierNow(), S.C.ar, deviceNow()); }
function countNow() { return S.bench ? effectiveCount(S.request, tierNow(), S.C.ar, deviceNow()) : (S.opts.debris ? effectiveCount(S.opts.debris, tierNow(), S.C.ar, deviceNow()) : defaultCount(tierNow(), S.C.ar, deviceNow())); }

function disposeBatches() {
  for (const b of S.batches) { const m = b.mesh; if (m.parent) m.parent.remove(m); m.geometry.dispose(); }
  S.batches = [];
}
function geoFromBuild(THREE, g) {
  const geo = new THREE.BufferGeometry(), col = new Float32Array(g.col.length); for (let i = 0; i < col.length; i++) col[i] = Math.pow(g.col[i], 2.2);
  geo.setAttribute('position', new THREE.BufferAttribute(g.pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(g.nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingSphere(); return geo;
}
/* one InstancedMesh per kind that the plan uses */
function buildBatches() {
  const { THREE, scene } = S.C, P = S.plan, t0 = performance.now(), lite = P.lite; disposeBatches();
  if (S.group) scene.remove(S.group);
  S.group = new THREE.Group(); S.group.name = 'storm_haul'; S.group.visible = false; scene.add(S.group);
  if (!S.mats) S.mats = {};
  const mk = (key, ds) => { const k = key + (ds ? 'd' : 'f') + (lite ? 'l' : ''); if (!S.mats[k]) S.mats[k] = patchMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, side: ds ? THREE.DoubleSide : THREE.FrontSide }), k); return S.mats[k]; };
  if (!S.depth) S.depth = patchMaterial(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), 'depth');
  const idx = Array.from({ length: NK }, () => []); for (let k = 0; k < P.n; k++) idx[P.kind[k]].push(k);
  S.qOf = new Int32Array(P.n); S.bOf = new Int16Array(P.n).fill(-1);
  const shadows = !S.C.ar && tierNow() !== 'low';
  for (let id = 0; id < NK; id++) {
    const ids = idx[id]; if (!ids.length) continue;
    const K = KINDS[id], nI = ids.length, mats = new Float32Array(nI * 16), tint = new Float32Array(nI * 3), arr = new Float32Array(nI);
    for (let q = 0; q < nI; q++) { const k = ids[q]; mats.set(P.mat.subarray(k * 16, k * 16 + 16), q * 16); tint.set(P.tint.subarray(k * 3, k * 3 + 3), q * 3); arr[q] = P.arr[k]; S.qOf[k] = q; S.bOf[k] = S.batches.length; }
    const g = buildKind(id, lite), geo = geoFromBuild(THREE, g);
    geo.setAttribute('aArr', new THREE.InstancedBufferAttribute(arr, 1));
    const im = new THREE.InstancedMesh(geo, mk('k' + id, !!K.ds), nI); im.instanceMatrix = new THREE.InstancedBufferAttribute(mats, 16); im.instanceColor = new THREE.InstancedBufferAttribute(tint, 3);
    im.count = 0; im.frustumCulled = false; im.castShadow = shadows; im.receiveShadow = true; im.customDepthMaterial = S.depth; im.name = 'storm_' + K.name;
    S.group.add(im); S.batches.push({ id, name: K.name, ids: Int32Array.from(ids), mesh: im, mats, trisPer: g.tris });
  }
  S.buildMs = performance.now() - t0; S.lastVis = ''; applyCount();
}
function visibleOf(b, n) { let lo = 0, hi = b.ids.length; while (lo < hi) { const m = (lo + hi) >> 1; if (b.ids[m] < n) lo = m + 1; else hi = m; } return lo; }
function applyCount() {
  const n = Math.min(S.shown, S.plan ? S.plan.n : 0); let inst = 0, tris = 0, calls = 0;
  for (const b of S.batches) { const c = visibleOf(b, n); b.mesh.count = c; b.mesh.visible = c > 0; inst += c; tris += c * b.trisPer; if (c > 0) calls++; }
  S.instances = inst; S.debrisTris = Math.round(tris); S.batchCalls = calls;
}
/* which pieces show: heap pieces thin out as the heap is gathered or taken, loose scenery thins as the tide takes it. Written into the instance matrices (a scale of zero), only when something changed. */
function visFraction() {
  const P = S.plan, st = S.st, gh = S.A.S().gh; if (!P || !P.heaps.length) return { rf: [], sg: 0 };
  const rf = P.heaps.map(h => st.n > 0 && st.phase === 'haul' ? remaining(h, st.taken[h.id], gh, st.endGh) / h.n0 : (st.taken[h.id] ? Math.max(0, (h.n0 - st.taken[h.id]) / h.n0) : 1));
  return { rf, sg: st.phase === 'haul' ? sceneryGone(gh, st.endGh) : 0 };
}
function applyVisibility(force) {
  const P = S.plan; if (!P || S.bench && !S.st.n) return; const { rf, sg } = visFraction(), key = rf.join(',') + '|' + Math.round(sg * 40); if (!force && key === S.lastVis) return; S.lastVis = key;
  const v = visibility(P, rf, sg), done = new Set();
  for (let k = 0; k < P.n; k++) { const bi = S.bOf[k]; if (bi < 0) continue; const b = S.batches[bi], q = S.qOf[k], o = q * 16, a = b.mats; done.add(bi);
    if (v[k]) { for (let i = 0; i < 16; i++) a[o + i] = P.mat[k * 16 + i]; } else { for (let i = 0; i < 12; i++) a[o + i] = 0; a[o + 12] = P.mat[k * 16 + 12]; a[o + 13] = P.mat[k * 16 + 13] - 3; a[o + 14] = P.mat[k * 16 + 14]; a[o + 15] = 1; } }
  for (const bi of done) S.batches[bi].mesh.instanceMatrix.needsUpdate = true;
}
function envFrom() {
  const C = S.C, st = S.st, R = C.tableR(), f = C.W && C.W.camp && C.W.camp.fire, d = C.W && C.W.camp && C.W.camp.dir || [1, 0];
  const jit = (hash(st.n, 3, C.seed) - .5) * .9, ang = Math.atan2(-d[1], -d[0]) + jit;   /* the surge comes in at the camp shore, give or take */
  const ob = [];
  try { (C.W.rocks || []).forEach(r => { const rr = Math.max(r.sx || 1, r.sz || 1) * .8; if (rr >= .3) ob.push({ x: r.x, z: r.z, r: rr, kind: 'rock' }); }); (C.W.conifers || []).forEach(t => ob.push({ x: t.x, z: t.z, r: .25, kind: 'tree' })); (C.W.broad || []).forEach(t => ob.push({ x: t.x, z: t.z, r: .32, kind: 'tree' }));
    const J = C.W.jetty; if (J) for (let s = 1; s < J.len; s += 2.2) for (const sd of [-1, 1]) ob.push({ x: J.x + J.dx * s - J.dz * sd * J.w / 2, z: J.z + J.dz * s + J.dx * sd * J.w / 2, r: .14, kind: 'post' });
    const pl = C.li().campstart && C.li().campstart.plan(); if (pl) (pl.pieces || []).forEach(p => { if (p.kind !== 'wrecked_jetty') ob.push({ x: p.cx, z: p.cz, r: Math.min(2.2, (p.fr || 1.5) * .6), kind: 'piece' }); }); } catch (e) { S.err.push('obstacles ' + e.message); }
  const avoid = []; try { const sp = S.A.spots(); if (sp) { if (sp.crate) avoid.push({ x: sp.crate.x, z: sp.crate.z, r: 3 }); if (sp.tender) avoid.push({ x: sp.tender.drop.x, z: sp.tender.drop.z, r: 4 }); if (sp.hut) avoid.push({ x: sp.hut.x, z: sp.hut.z, r: 5 }); }
    const rt = C.li().campstart && C.li().campstart.rt(); if (rt) { const y = rt.yard(); avoid.push({ x: y.x, z: y.z, r: 10 }); } } catch (e) { S.err.push('avoid ' + e.message); }
  const half = Math.min(R + 2, 130);
  return { seed: stormSeed(C.seed, Math.max(1, st.n), S.opts.seedAdd), H: C.H, half, step: .8, tableR: R, hw: SURGE_HW, obstacles: ob, cell: 1.0, dir: [Math.cos(ang), Math.sin(ang)], focus: f ? { x: f.x, z: f.z } : null, avoid };
}
function scatter(n) {
  const t0 = performance.now(); S.env = envFrom(); S.plan = plan(S.env, n, liteNow()); S.planN = n; S.planMs = performance.now() - t0;
  S.hulkPlan = planHulk(S.env); S.swirlPlan = planSwirl(S.env); if (S.uDir) S.uDir.value.set(S.plan.field.dir[0], S.plan.field.dir[1]);
}
function ensurePlan(n) { if (S.plan && S.planN === n && S.plan.lite === liteNow()) return false; scatter(n); buildBatches(); buildHulkMesh(); buildSwirl(); return true; }

/* ---- the hulk (placeholder) ---- */
function buildHulkMesh() {
  const { THREE, scene } = S.C; if (S.hulk) { scene.remove(S.hulk); S.hulk.geometry.dispose(); S.hulk = null; }
  const hp = S.hulkPlan; if (!hp) return;
  const g = buildHulk(), geo = geoFromBuild(THREE, g), m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  m.name = 'storm_hulk'; m.position.set(hp.x, hp.y - .62, hp.z); m.rotation.set(.05, hp.yaw, .17, 'YXZ'); m.castShadow = !S.C.ar && tierNow() !== 'low'; m.receiveShadow = true; m.visible = false; m.userData.tris = g.tris; scene.add(m); S.hulk = m;
}
/* ---- the swirl: a slowly turning tidal eddy, foam arms and darker water; a disc on the water, nothing is pulled in ---- */
const SWIRL_VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const SWIRL_FS = `varying vec2 vUv;uniform float uT;uniform float uK;uniform float uLite;
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
void main(){vec2 p=(vUv-0.5)*2.0;float r=length(p);if(r>1.0)discard;float a=atan(p.y,p.x);
  float sp=a*2.0+log(r+0.04)*4.2-uT*0.55;float arms=0.5+0.5*sin(sp*1.5);
  float n=uLite>0.5?0.5:vn(vec2(sp*1.3,r*7.0-uT*0.4));float foam=smoothstep(0.62,0.9,arms*0.7+n*0.45)*smoothstep(0.0,0.18,r);
  float ring=smoothstep(0.9,0.55,r);float dark=ring*(0.35+0.25*arms)*smoothstep(0.02,0.3,r);
  float edge=smoothstep(1.0,0.72,r);
  vec3 col=mix(vec3(0.03,0.10,0.14),vec3(0.92,0.96,0.97),foam);float al=(dark*0.55+foam*0.8)*edge*uK;
  gl_FragColor=vec4(col,clamp(al,0.0,0.85));}`;
function buildSwirl() {
  const { THREE, scene } = S.C; if (S.swirl) { scene.remove(S.swirl); S.swirl.geometry.dispose(); S.swirl.material.dispose(); S.swirl = null; }
  const sp = S.swirlPlan; if (!sp) return;
  const geo = new THREE.CircleGeometry(sp.r, S.C.ar ? 20 : 40).rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv, pos = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / sp.r * .5 + .5, -pos.getZ(i) / sp.r * .5 + .5);
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, uniforms: { uT: { value: 0 }, uK: { value: 0 }, uLite: { value: S.C.ar || tierNow() === 'low' ? 1 : 0 } }, vertexShader: SWIRL_VS, fragmentShader: SWIRL_FS });
  const m = new THREE.Mesh(geo, mat); m.name = 'storm_swirl'; m.renderOrder = 4; m.visible = false; m.position.set(sp.x, 0, sp.z); scene.add(m); S.swirl = m;
}
function swirlFrame(k, tide) {
  const m = S.swirl; if (!m) return; m.visible = k > .01; if (!m.visible) return;
  m.material.uniforms.uK.value = k; m.material.uniforms.uT.value = S.clockT; m.position.y = tide + S.lift + .16; const s = .55 + .45 * k; m.scale.set(s, 1, s);
}

/* ---- the barometer line (a small plain chart in the HUD) ---- */
function buildHud() {
  const root = S.A.root(), h = document.createElement('div'); h.id = 'stormBaro'; h.className = 'gd-pill'; h.style.cssText = 'position:absolute;left:10px;top:122px;display:none;width:190px;font-size:13px;line-height:1.3;padding:6px 10px';
  h.innerHTML = '<div style="display:flex;justify-content:space-between;gap:6px"><b>Barometer</b><span id="sbV">1017 hPa</span></div><svg id="sbG" width="168" height="34" viewBox="0 0 168 34" aria-label="barometer, last minutes"><polyline id="sbL" fill="none" stroke="#2f6fe6" stroke-width="2" stroke-linejoin="round" points=""/></svg><div id="sbT" style="opacity:.8"></div><div id="sbN" style="margin-top:3px"></div>';
  root.appendChild(h); S.hud = { el: h, v: h.querySelector('#sbV'), l: h.querySelector('#sbL'), t: h.querySelector('#sbT'), n: h.querySelector('#sbN') };
  const p = document.createElement('div'); p.id = 'stormPick'; p.className = 'gd-pill'; p.style.cssText = 'position:absolute;left:50%;bottom:210px;transform:translateX(-50%);display:none;min-width:170px;text-align:center;font-size:14px'; p.innerHTML = '<span id="spT"></span><div style="height:8px;border-radius:6px;background:#e3d6b8;margin-top:6px;overflow:hidden"><div id="spB" style="height:100%;width:0;background:#2f6fe6"></div></div>'; root.appendChild(p); S.hud.pick = p; S.hud.pt = p.querySelector('#spT'); S.hud.pb = p.querySelector('#spB');
}
function hudUpdate(m, dtReal) {
  const H = S.hud; if (!H) return; const st = S.st, show = st.phase === 'run' && S.ts > .03 * st.build && S.ts < stormEnd(st.build) + 25; H.el.style.display = show ? 'block' : 'none'; if (!show) return;
  S.baroT += dtReal; if (S.baroT > Math.max(.5, st.build / 90)) { S.baroT = 0; S.baroHist.push(m.baro); if (S.baroHist.length > 80) S.baroHist.shift(); }
  H.v.textContent = Math.round(m.baro) + ' hPa'; H.t.textContent = m.trend.charAt(0).toUpperCase() + m.trend.slice(1);
  const hs = S.baroHist.length ? S.baroHist : [m.baro], n = hs.length; H.l.setAttribute('points', hs.map((v, i) => (4 + (n > 1 ? i / (n - 1) : 0) * 160).toFixed(1) + ',' + (30 - clamp((v - 984) / 36, 0, 1) * 26).toFixed(1)).join(' '));
  let note = ''; if (m.phase === 'build') note = m.rain > .5 ? 'Rain on the way in. The robots are heading home.' : 'The glass is dropping. Weather is coming.'; else if (m.phase === 'storm') note = 'Hold tight. It will pass.'; else note = 'Easing. The water will go down.';
  if (m.phase === 'build' && boatOut()) note += ' Bring the boat in and tie up.'; H.n.textContent = note;
}
function boatOut() { try { const b = root.__boat && root.__boat.state && root.__boat.state(); return !!(b && b.ready && b.avail && b.mode !== 'docked' && b.mode !== 'idle'); } catch (e) { return false; } }

/* ---- the heaps: taps, hand picks, the tide taking them back ---- */
function heapsLeft() { const P = S.plan, st = S.st, gh = S.A.S().gh; if (!P || st.phase !== 'haul') return []; return P.heaps.map(h => ({ h, rem: remaining(h, st.taken[h.id], gh, st.endGh) })); }
function targets() {
  const T = [], st = S.st; if (!S.ready || !S.plan || st.phase !== 'haul') return T; const A = S.A;
  for (const e of heapsLeft()) { if (e.rem <= 0) continue; const sc = A.screenOf(e.h.x, e.h.y + .25, e.h.z); if (sc) T.push({ id: 'heap' + e.h.id, x: sc.x, y: sc.y, r: 46 }); }
  if (S.hulk && S.hulk.visible && st.hulk > 0) { const hp = S.hulkPlan, sc = A.screenOf(hp.x, hp.y + .9, hp.z); if (sc) T.push({ id: 'hulk', x: sc.x, y: sc.y, r: 78 }); }
  return T;
}
function activate(id) {
  if (id === 'hulk') return hulkCard();
  if (id.startsWith('heap')) { const i = parseInt(id.slice(4), 10); return startPick(i); }
}
function startPick(i) {
  const e = heapsLeft().find(q => q.h.id === i); if (!e || e.rem <= 0) return; if (S.pick) return; const A = S.A, have = (A.S().stock || {})[e.h.stock] || 0;
  if (have >= A.STOCK_CAP) { A.toast(HEAP_LABEL[e.h.stock] + ': the stock is full (' + A.STOCK_CAP + '). Build something, or leave it for later.', 4500); return; }
  S.pick = { id: i, t: 0, dur: 1.3 }; if (S.hud) { S.hud.pick.style.display = 'block'; S.hud.pt.textContent = 'Gathering: ' + HEAP_LABEL[e.h.stock].toLowerCase() + '...'; S.hud.pb.style.width = '0'; }
}
function pickTick(dt) {
  const p = S.pick; if (!p) return; p.t += dt; if (S.hud) S.hud.pb.style.width = Math.min(100, p.t / p.dur * 100) + '%'; if (p.t < p.dur) return;
  S.pick = null; if (S.hud) S.hud.pick.style.display = 'none';
  const e = heapsLeft().find(q => q.h.id === p.id); if (!e) return; const A = S.A, have = (A.S().stock || {})[e.h.stock] || 0, u = pickUnits(e.rem, HAND_TAKE, have, A.STOCK_CAP);
  if (u <= 0) return; A.addStock(e.h.stock, u); S.st.taken[e.h.id] = (S.st.taken[e.h.id] || 0) + u; commit(); applyVisibility();
  const left = e.rem - u; A.toast('+' + u + ' ' + stockName(e.h.stock) + (left > 0 ? '. ' + left + ' more in this heap.' : '. The heap is cleared.'), 3800);
}
const stockName = id => ({ planks: 'planks and timber', rope: 'rope and net', glass: 'bottles', metal: 'tins and metal' }[id] || id);
function commit() { S.A.patch({ storm: JSON.parse(JSON.stringify(S.st)) }); S.A.afterChange(); }
function hulkCard() {
  const A = S.A, st = S.st, hp = S.hulkPlan; if (!hp) return; A.focus(hp.x, hp.z, 16);
  const c = A.card('hulk', '<h2>The old hulk</h2><p>Half of an old boat, lying on its side in the sand. The ribs still stand. The planking is grey and, here and there, still sound.</p><p>It is a long job: ' + st.hulk + ' of ' + HULK_UNITS + ' bundles left in it. A few boards a visit is all the shore will let you do.</p><p><small>The model is a placeholder (' + HULK_PLACEHOLDER + '). It does not wash away.</small></p>'); c.appendChild(A.xbtn());
  const have = (A.S().stock || {}).planks || 0, can = st.hulk > 0 && have < A.STOCK_CAP;
  c.appendChild(A.row(A.btn('Strip some boards (+3 planks)', () => { const u = pickUnits(st.hulk, 3, (A.S().stock || {}).planks || 0, A.STOCK_CAP); if (u <= 0) return; st.hulk -= u; A.addStock('planks', u); commit(); A.closeCard(); A.toast('+' + u + ' planks from the hulk. ' + st.hulk + ' bundles left.', 4500); }, 'pri', !can), A.btn('Close', A.closeCard)));
}

/* ---- the robots: the haul takes over their shore work while it lasts ---- */
const SITE_KIND = { planks: 'wood', metal: 'metal', rope: 'plastic', glass: 'plastic' };
function robotRT() { try { return S.C.li().campstart && S.C.li().campstart.rt(); } catch (e) { return null; } }
function reachable(a, x, z) { const H = S.C.H, d = Math.hypot(x - a.x, z - a.z), n = Math.max(2, Math.ceil(d / 2)); for (let i = 1; i < n; i++) { const t = i / n; if (H(a.x + (x - a.x) * t, a.z + (z - a.z) * t) < .2) return false; } return true; }
function syncSites() {
  const rt = robotRT(); if (!rt) return; const sim = rt.sim(), work = sim.pl.work, lit = sim.litter; if (!S.baseWork) S.baseWork = work.length - S.sites.length;
  const jobs = Array.from(new Set((S.A.S().jobs || []).filter(Boolean))), ap = rt.yard().points.apron, left = heapsLeft().filter(e => e.rem > 0);
  const want = new Map(); for (const sid of jobs) { left.filter(e => e.h.stock === sid && reachable(ap, e.h.x, e.h.z)).sort((a, b) => Math.hypot(a.h.x - ap.x, a.h.z - ap.z) - Math.hypot(b.h.x - ap.x, b.h.z - ap.z)).slice(0, 2).forEach(e => want.set(e.h.id, e)); }
  for (const s of S.sites) if (s.live && !want.has(s.heap)) { s.live = false; lit[s.idx].taken = true; lit[s.idx].back = 1e9; work[s.idx].dead = true; }
  for (const [hid, e] of want) { const ex = S.sites.find(s => s.heap === hid && s.live); if (ex) continue;
    const old = S.sites.find(s => s.heap === hid && !s.live);   /* a site made before for this heap wakes up again */
    if (old) { old.live = true; lit[old.idx].taken = false; lit[old.idx].back = 0; work[old.idx].dead = false; continue; }
    const g = S.C.H, h = e.h, gx = (g(h.x + 1, h.z) - g(h.x - 1, h.z)) / 2, gz = (g(h.x, h.z + 1) - g(h.x, h.z - 1)) / 2;
    work.push({ x: h.x, z: h.z, y: h.y, via: [], yaw: Math.atan2(-gx, -gz), kind: SITE_KIND[h.stock], i: work.length, haul: h.id }); lit.push({ taken: false, back: 0 }); S.sites.push({ heap: hid, idx: work.length - 1, live: true }); S.siteHeap[work.length - 1] = hid; }
  /* park the ordinary shore pieces of a kind while a live haul site of that kind exists */
  const active = new Set(S.sites.filter(s => s.live).map(s => work[s.idx].kind));
  for (let i = 0; i < work.length; i++) { if (work[i].haul !== undefined) continue; const park = active.has(work[i].kind); if (park) { lit[i].taken = true; lit[i].back = 1e9; work[i].parked = true; } else if (work[i].parked) { work[i].parked = false; lit[i].taken = false; lit[i].back = 0; } }
}
function robotTick() {
  const rt = robotRT(); if (!rt) return; const sim = rt.sim(), work = sim.pl.work;
  for (const r of sim.robots) {
    const prev = S.prevSt[r.id]; S.prevSt[r.id] = r.state;
    if (r.state === 'carry' && prev === 'work') {
      const w = work[r.siteI], q = S.pend[r.id] || (S.pend[r.id] = []);
      if (w && w.haul !== undefined) {
        const h = S.plan.heaps[w.haul], e = h && heapsLeft().find(z => z.h.id === h.id), u = e ? pickUnits(e.rem, TRIP_TAKE, 0, 99) : 0;
        if (u > 0) { S.st.taken[h.id] = (S.st.taken[h.id] || 0) + u; q.push({ stock: h.stock, units: u }); S.dirty = true; if (e.rem - u > 0) { sim.litter[r.siteI].taken = false; sim.litter[r.siteI].back = 0; } else { sim.litter[r.siteI].taken = true; sim.litter[r.siteI].back = 1e9; } }
        else { q.push({ stock: h ? h.stock : 'planks', units: 0 }); sim.litter[r.siteI].taken = true; sim.litter[r.siteI].back = 1e9; }
      } else q.push(null);
    }
  }
}
function tripStock(i) { const q = S.pend[i]; if (!q || !q.length) return null; return q.shift(); }

/* ---- letter nine, the Great Wash (our own words, short, a calm paper panel) ---- */
const L9 = ['The sea has kept things for a long time. Last night it let go.', 'It is a great deal. You do not have to keep it all, and you do not have to decide today.', 'Sort a little each morning. What you cannot use, pass on.'];
function readL9() {
  const A = S.A, first = S.st.l9 < 2, c = A.card('letter9', '<h2>Letter nine</h2>' + L9.map(l => '<p>' + l + '</p>').join('') + '<div class="sig">' + (A.mark ? A.mark(30) : '') + '</div>', 'gd-paper');
  c.appendChild(A.row(A.btn(first ? 'Keep it' : 'Close', () => { A.closeCard(); if (first) { S.st.l9 = 2; commit(); } }, 'pri')));
}
function l9Check() { const st = S.st; if (st.phase !== 'haul' || st.l9 !== 0) return; if (S.A.S().gh >= l9Due(st.endGh)) { st.l9 = 1; commit(); S.A.crateAdd('l9', 'A crate has come in on the morning boat. There is a letter on top.'); } }

/* ---- the storm itself ---- */
const FOCUS_ON = { swirl: false, haul: false };
function start(opts) {
  opts = opts || {}; const st = S.st; if (st.phase === 'run') return false; const gh = S.A.S().gh;
  st.n += 1; st.phase = 'run'; st.ts = 0; st.startGh = gh; st.build = opts.build || (S.opts.test ? S.opts.buildSec : S.opts.buildSec); st.endGh = 0; st.taken = {}; st.hulk = HULK_UNITS; st.l9 = 0; st.warn = 0; S.ts = 0; S.warned = {}; S.baroHist = []; FOCUS_ON.swirl = FOCUS_ON.haul = false;
  S.plan = null; S.lastVis = ''; S.sites = []; S.siteHeap = {}; S.pend = {}; S.shown = 0;
  ensurePlan(countNow()); S.shown = S.plan.n; applyCount(); S.group.visible = false; if (S.hulk) S.hulk.visible = false; commit();
  S.A.toast('The glass is dropping. Weather is coming in from the sea.', 6500); return true;
}
function endRun() {
  const st = S.st; st.phase = 'haul'; st.endGh = S.A.S().gh; st.ts = 0; S.surgeT = -1; S.lastVis = ''; applyVisibility(true); commit();
  S.A.toast('The water has gone down. A haul lies along the shore: tap a heap to gather it, or give a robot an order.', 9000);
  try { const e = heapsLeft().sort((a, b) => Math.hypot(a.h.x - (S.A.camp().x), a.h.z - (S.A.camp().z)) - Math.hypot(b.h.x - (S.A.camp().x), b.h.z - (S.A.camp().z)))[0]; if (e && !FOCUS_ON.haul) { FOCUS_ON.haul = true; S.A.focus(e.h.x, e.h.z, 24, undefined, .6); } } catch (er) { /* none */ }
}
function resumeHaul() {   /* after a load: the plan is made again from the same seed and the heaps are shown as they were left */
  const st = S.st; if (st.phase === 'haul' || st.phase === 'run') { ensurePlan(countNow()); S.shown = S.plan.n; applyCount(); if (st.phase === 'haul') { S.group.visible = true; if (S.hulk) S.hulk.visible = true; applyVisibility(true); } else S.group.visible = false; }
}
function tick(dt) {
  if (!S.ready) return; const A = S.A, st = S.st, now = performance.now(), iv = S.lastNow ? now - S.lastNow : 0; S.lastNow = now; if (iv > 0 && iv < 2000) { S.ring.push(iv); if (S.ring.length > 240) S.ring.shift(); }
  S.clockT = (S.clockT || 0) + dt; const gh = A.S().gh;
  if (!S.bench && st.phase === 'none' && !S.A.cardOpen() && (S.opts.test ? !S.testStarted : stormDue(st, gh, !!A.S().bottle, S.A.seed()))) { S.testStarted = true; start(); }
  const tide = S.baseTide !== undefined ? S.baseTide : A.tide(); let m = null, k = 0;
  if (st.phase === 'run') {
    st.ts += dt * S.opts.fast; S.ts = st.ts; m = stormAt(st.ts, st.build); S.m = m; S.surgeT = m.surgeT; S.quiet = m.quiet; k = m.swirlK;
    const peak = m.surgeT >= SURGE.rise;   /* once the water has peaked everything that came in stays */
    if (m.surgeT >= 0 && S.group) { S.group.visible = true; if (S.hulk) S.hulk.visible = true; }
    if (S.uSg) { S.uSg.value.set(m.surgeT, SURGE.travel, tide + S.lift, peak ? 1 : 0); S.uSg2.value.set(SURGE_HW, 0, 0, 0); }
    if (!FOCUS_ON.swirl && m.swirlK > .05 && S.swirlPlan) { FOCUS_ON.swirl = true; A.focus(S.swirlPlan.x, S.swirlPlan.z, 62, undefined, .72); }
    if (m.phase === 'build' && st.ts > .55 * st.build && !S.warned.boat && boatOut()) { S.warned.boat = 1; A.toast('The glass is falling fast. Bring the boat in and tie it up. Nothing will break, but it is safer.', 7500); }
    if (st.ts > st.build + STORM_SEC.surgeAt - 6 && !S.warned.surge) { S.warned.surge = 1; A.toast('The water is rising along the shore. Stay up the beach.', 5000); }
    if (st.ts >= stormEnd(st.build)) endRun();
    hudUpdate(m, dt);
  } else { S.m = null; S.surgeT = -1; S.quiet = 0; if (S.uSg) S.uSg.value.set(-1, SURGE.travel, tide, 0); if (S.hud) S.hud.el.style.display = 'none'; }
  if (st.phase === 'haul') {
    S.surgeT = -1; if (S.group && !S.group.visible) { S.group.visible = true; if (S.hulk) S.hulk.visible = true; }
    S.visT += dt; if (S.visT > 5) { S.visT = 0; applyVisibility(); }
    const age = gh - st.endGh; if (st.warn < 1 && age > TAKE.warn1) { st.warn = 1; commit(); A.toast('The tide is starting to take the loose things back. Gather what you want.', 6500); } if (st.warn < 2 && age > TAKE.warn2) { st.warn = 2; commit(); A.toast('Most of the loose haul has gone back to the sea. Nothing is lost that you took.', 6500); }
    l9Check(); pickTick(dt); S.siteT += dt; if (S.siteT > 2) { S.siteT = 0; try { syncSites(); } catch (e) { S.err.push('sites ' + e.message); } }
    try { robotTick(); } catch (e) { S.err.push('robots ' + e.message); } if (S.dirty) { S.dirty = false; applyVisibility(); commit(); }
  }
  if (S.swirl) swirlFrame(k, tide);
  root.LI_STORM_QUIET = S.quiet;
  if (S.panelOn) { const inf = S.C.renderer.info; inf.autoReset = false; if (S.lastStat) { S.calls = inf.render.calls; S.tris = inf.render.triangles; } inf.reset(); S.lastStat = 1; if (now - (S.lastPanel || 0) > 400) { S.lastPanel = now; panelUpdate(); } }
  if (S.sweep) sweepFrame(iv, now);
}
root.LI_STORM_TIDE = function (tide) { S.baseTide = tide; S.lift = S.surgeT >= 0 ? surgeLift(tide, S.surgeT, SURGE_HW) : 0; return tide + S.lift; };   /* the page's frame adds the surge to its water level (a page without the layer never calls it) */

/* ---- the panel and the bench ---- */
function panelBuild() {
  const doc = document, d = doc.createElement('div'); d.id = 'stormPanel'; d.className = 'gd-pill'; d.style.cssText = 'position:absolute;left:10px;top:300px;width:330px;max-width:calc(100vw - 20px);font-size:12px;display:none;max-height:calc(100vh - 300px);overflow:auto';
  d.innerHTML = '<div style="display:flex;justify-content:space-between;font-weight:800;margin-bottom:4px">Storm haul <button class="gd-btn" id="spX" style="min-height:34px;min-width:34px;padding:2px 8px" aria-label="close">x</button></div>' +
    '<label>Debris pieces <b id="spNv"></b><input type="range" id="spN" min="0" max="1000" step="1" style="width:100%" aria-label="debris count"></label><pre id="spRows" style="font-size:11px"></pre>' +
    '<div id="spBtns"><button class="gd-btn" id="spStorm" style="min-height:36px">Storm now</button> <button class="gd-btn" id="spClear" style="min-height:36px">Clear</button> <button class="gd-btn" id="spBench" style="min-height:36px">Debris bench</button> <button class="gd-btn" id="spCopy" style="min-height:36px;display:none">Copy report</button></div>' +
    '<div id="spWarn" style="display:none;margin-top:6px;border:2px solid #b44;border-radius:10px;padding:8px;background:#fff4ee"><b>Before you run the bench</b><p style="margin:4px 0">It pushes the graphics card harder and harder until frames get slow. It stops by itself when a frame takes over 100 ms several times, and never runs longer than two minutes.</p><p style="margin:4px 0"><b>Save your work and close other apps and browser tabs first.</b> On the Radeon, close everything else. On an iPad, plug it in. If the picture stutters badly, press Stop.</p><button class="gd-btn pri" id="spGo" style="min-height:36px">Start the bench</button> <button class="gd-btn" id="spNo" style="min-height:36px">Cancel</button></div>' +
    '<textarea id="spTa" readonly rows="10" style="display:none;width:100%;margin-top:6px;font:11px/1.3 ui-monospace,Menlo,Consolas,monospace"></textarea>';
  S.A.root().appendChild(d); const q = id => d.querySelector(id); S.panel = { el: d, rows: q('#spRows'), n: q('#spN'), nv: q('#spNv'), ta: q('#spTa'), copy: q('#spCopy'), warn: q('#spWarn'), bench: q('#spBench') };
  const P = S.panel, slider = v => clamp(Math.round(MIN_COUNT * Math.pow(100000 / MIN_COUNT, v / 1000) / 50) * 50, MIN_COUNT, 100000), toSlider = n => Math.round(1000 * Math.log(clamp(n, MIN_COUNT, 100000) / MIN_COUNT) / Math.log(100000 / MIN_COUNT));
  P.n.value = String(toSlider(countNow())); P.nv.textContent = String(countNow());
  P.n.addEventListener('input', () => { P.nv.textContent = String(slider(+P.n.value)); }); P.n.addEventListener('change', () => api2.setCount(slider(+P.n.value)));
  q('#spX').addEventListener('click', () => { d.style.display = 'none'; panelVisible(false); }); q('#spStorm').addEventListener('click', () => api2.start()); q('#spClear').addEventListener('click', () => api2.clear());
  P.bench.addEventListener('click', () => { if (S.sweep) { sweepEnd('stopped by you'); return; } P.warn.style.display = 'block'; }); q('#spNo').addEventListener('click', () => { P.warn.style.display = 'none'; }); q('#spGo').addEventListener('click', () => { P.warn.style.display = 'none'; sweepStart(); });
  P.copy.addEventListener('click', () => { const t = S.report, done = () => { P.copy.textContent = 'Copied'; setTimeout(() => { P.copy.textContent = 'Copy report'; }, 1500); }, fb = () => { P.ta.focus(); P.ta.select(); try { document.execCommand('copy'); done(); } catch (x) { /* the text is selected */ } };
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fb); else fb(); } catch (x) { fb(); } });
  const top = doc.getElementById('top'); if (top && !doc.getElementById('stormBtn')) { const b = doc.createElement('button'); b.id = 'stormBtn'; b.className = 'btn'; b.textContent = 'Storm'; b.addEventListener('click', () => { const on = d.style.display === 'none'; d.style.display = on ? 'block' : 'none'; panelVisible(on); }); top.appendChild(b); }
  const on = S.opts.panel || S.opts.debris !== null; d.style.display = on ? 'block' : 'none'; panelVisible(on);
}
function panelVisible(on) { S.panelOn = !!on; if (S.C.renderer) S.C.renderer.info.autoReset = on || S.sweep ? false : S.C.autoReset(); }
function panelUpdate() {
  const P = S.panel; if (!P || !S.panelOn) return; const st = stepStats(S.ring.slice(-90)), s = S.st;
  P.nv.textContent = String(S.bench || S.opts.debris ? (S.request || countNow()) : countNow()) + (S.shown < (S.request || S.shown) ? ' (drawn ' + S.shown + ', capped by tier)' : '');
  P.rows.textContent = 'tier ' + tierNow() + (S.C.ar ? ' (AR)' : '') + '   cap ' + capNow() + '   drawn ' + (S.group && S.group.visible ? S.instances || 0 : 0) + '\n' + 'draw calls ' + S.calls + '   triangles ' + S.tris.toLocaleString() + ' (all passes)\n' + 'debris triangles ' + (S.debrisTris || 0).toLocaleString() + ' per pass, ' + (S.batchCalls || 0) + ' batches\n' +
    'frame ' + st.avg.toFixed(1) + ' ms avg   p95 ' + st.p95.toFixed(1) + ' ms   (' + st.fps.toFixed(0) + ' fps)\n' + 'planned ' + (S.plan ? S.plan.n : 0) + ' in ' + S.planMs.toFixed(0) + ' ms, batches in ' + S.buildMs.toFixed(0) + ' ms\n' +
    'storm: ' + s.phase + (s.phase === 'run' ? ' ' + s.ts.toFixed(0) + ' s' : '') + '   heaps left ' + heapsLeft().filter(e => e.rem > 0).length + (S.sweep ? '\nbench: step ' + (S.sweep.i + 1) + ' of ' + S.sweep.steps.length + ' (' + S.sweep.steps[S.sweep.i] + ' pieces)' : '');
}
function infoNow() { const I = S.C.info ? S.C.info() : {}; return Object.assign({ tier: tierNow(), device: deviceNow(), cap: capNow(), seed: S.C.seed, url: S.C.search, software: /swiftshader|llvmpipe|software|SwiftShader/i.test(String(I.gpu || '')) }, I); }
function sweepStart() {
  if (S.sweep) return; const cap = capNow(), steps = benchSteps(cap), sec = S.opts.benchSec, warm = Math.min(KNEE.warm, sec * .25);
  S.bench = true; S.request = cap; scatter(cap); buildBatches(); buildHulkMesh(); buildSwirl(); S.group.visible = true; if (S.hulk) S.hulk.visible = true;
  S.sweep = { steps, i: 0, t0: performance.now(), t00: performance.now(), iv: [], all: [], results: [], warm, sec, prevCam: S.C.getCam(), why: '' }; S.shown = steps[0]; applyCount(); applyVisibility(true);
  let bx = 0, bz = 0; for (let k = 0; k < Math.min(S.plan.n, 600); k++) { bx += S.plan.pos[k * 3]; bz += S.plan.pos[k * 3 + 2]; } const nn = Math.min(S.plan.n, 600) || 1; S.C.setView({ tx: bx / nn, tz: bz / nn, dist: 70, phi: .62, theta: .5 });
  panelVisible(true); if (S.panel) { S.panel.bench.textContent = 'Stop the bench'; S.panel.ta.style.display = 'none'; S.panel.copy.style.display = 'none'; }
}
function sweepFrame(iv, now) {
  const W = S.sweep; if (!W) return; const el = (now - W.t0) / 1000;
  if (el > W.warm && iv > 0) { W.iv.push(iv); W.all.push(iv); }
  if (kneeHit(W.all)) { const st = stepStats(W.iv); W.results.push(Object.assign({ count: W.steps[W.i], calls: S.calls, tris: S.tris }, st)); sweepEnd('the knee: frames over ' + KNEE.limitMs + ' ms five times in a row at ' + W.steps[W.i] + ' pieces'); return; }
  if ((now - W.t00) / 1000 > KNEE.hardSec) { sweepEnd('the two-minute limit'); return; }
  if (el >= W.warm + W.sec) {
    const st = stepStats(W.iv); W.results.push(Object.assign({ count: W.steps[W.i], calls: S.calls, tris: S.tris }, st)); W.i++; W.iv = []; W.t0 = now;   /* W.all keeps the measured frames of earlier steps: the knee can span a step change when frames are slow */
    if (W.i >= W.steps.length) { sweepEnd(''); return; } S.shown = W.steps[W.i]; applyCount();
  }
}
function sweepEnd(why) {
  const W = S.sweep; if (!W) return; S.sweep = null; S.report = benchReport(Object.assign(infoNow(), { warm: W.warm, sec: W.sec }), W.results, why || 'finished every step'); S.benchResults = W.results;
  if (W.prevCam) S.C.setView(W.prevCam); S.shown = Math.min(S.shown, S.plan ? S.plan.n : 0); applyCount(); panelVisible(S.panelOn);
  if (S.panel) { S.panel.ta.value = S.report; S.panel.ta.style.display = 'block'; S.panel.copy.style.display = 'inline-block'; S.panel.bench.textContent = 'Debris bench'; }
}

const api2 = {
  state: () => ({ on: !!S.ready, phase: S.st.phase, n: S.st.n, ts: S.st.ts, build: S.st.build, surgeT: S.surgeT, lift: S.lift, quiet: S.quiet, tier: S.ready ? tierNow() : '', cap: S.ready ? capNow() : 0, shown: S.shown, planned: S.plan ? S.plan.n : 0, instances: S.instances || 0, debrisTris: S.debrisTris || 0, batches: S.batches.length, calls: S.calls, tris: S.tris, planMs: S.planMs, buildMs: S.buildMs, hash: S.plan ? S.plan.hash : null, bench: S.bench, group: !!(S.group && S.group.visible), hulk: !!(S.hulk && S.hulk.visible), swirl: !!(S.swirl && S.swirl.visible), err: S.err.slice(), sites: S.sites.length }),
  save: () => JSON.parse(JSON.stringify(S.st)), heaps: () => heapsLeft().map(e => ({ id: e.h.id, stock: e.h.stock, n0: e.h.n0, rem: e.rem, x: e.h.x, y: e.h.y, z: e.h.z })), plan: () => S.plan, hulkPlan: () => S.hulkPlan, swirlPlan: () => S.swirlPlan, byKind: () => S.plan ? Array.from(S.plan.byKind) : [],
  start: o => start(o), setTs: t => { S.st.ts = t; }, finish: () => { if (S.st.phase === 'run') { S.st.ts = stormEnd(S.st.build) + .1; } }, pick: i => startPick(i), pickDone: () => { if (S.pick) S.pick.t = 99; }, hulkCard, l9: readL9, targets, tripStock, sites: () => S.sites.slice(), pend: () => JSON.parse(JSON.stringify(S.pend)),
  setCount(n) { S.bench = true; S.request = clamp(Math.round(n), MIN_COUNT, 100000); const c = effectiveCount(S.request, tierNow(), S.C.ar, deviceNow()); ensurePlanFor(c); S.shown = c; S.group.visible = true; if (S.hulk) S.hulk.visible = true; applyCount(); applyVisibility(true); if (S.panel) { S.panel.n.value = String(Math.round(1000 * Math.log(S.request / MIN_COUNT) / Math.log(100000 / MIN_COUNT))); S.panel.nv.textContent = String(S.request); } return S.shown; },
  clear() { if (S.group) S.group.visible = false; if (S.hulk) S.hulk.visible = false; S.bench = false; },
  benchStart: sweepStart, benchStop: () => sweepEnd('stopped'), benchRunning: () => !!S.sweep, benchResults: () => S.benchResults || null, report: () => S.report, panel: on => { if (S.panel) { S.panel.el.style.display = on ? 'block' : 'none'; panelVisible(on); } },
  ring: () => S.ring.slice(), cost: () => ({ calls: S.calls, tris: S.tris, debrisTris: S.debrisTris, batchCalls: S.batchCalls }), notes: () => S.notes.slice()
};
function ensurePlanFor(c) { if (S.plan && S.planN === c && S.plan.lite === liteNow()) return; scatter(c); buildBatches(); buildHulkMesh(); buildSwirl(); }

/* attach(api): called once by the gift. api: { C(), THREE(), S() (the gift state), patch(o), save(), afterChange(), toast, card, closeCard, btn, row, xbtn, mark, focus, screenOf, root(), spots(), camp(), tide(), seed(), cardOpen(), addStock(id,n), STOCK_CAP, crateAdd(tag, msg) } */
function attach(a) {
  if (S.A) return api2; S.A = a; S.C = a.C(); S.THREE = a.THREE(); const THREE = S.THREE; S.opts = options(S.C.search);
  if (!S.opts.on) { S.A = null; return null; }
  S.opts.benchSec = clamp(parseFloat(new URLSearchParams(S.C.search).get('benchsec')) || KNEE.stepSec, 1, 30);
  S.st = sanitize(a.S().storm); S.uSg = { value: new THREE.Vector4(-1, SURGE.travel, 0, 0) }; S.uSg2 = { value: new THREE.Vector4(SURGE_HW, 0, 0, 0) }; S.uDir = { value: new THREE.Vector2(1, 0) }; S.visT = 0;
  S.request = S.opts.debris || 0; buildHud(); panelBuild();
  try { if (S.st.phase === 'run') { S.st.ts = Math.min(S.st.ts, 1); } resumeHaul(); } catch (e) { S.err.push('resume ' + e.message); }
  setupDebris();
  S.ready = true; return api2;
}
function setupDebris() {   /* &debris=N: a stress scene at once, no storm needed (not saved) */
  if (S.opts.debris === null || S.st.phase !== 'none') return; S.bench = true; S.request = S.opts.debris;
  try { const c = effectiveCount(S.request, tierNow(), S.C.ar, deviceNow()); ensurePlanFor(c); S.shown = c; S.group.visible = true; if (S.hulk) S.hulk.visible = true; applyCount(); applyVisibility(true); } catch (e) { S.err.push('debris ' + e.message); }
}
function onLoad(stormState) { if (!S.A) return; S.st = sanitize(stormState); S.plan = null; S.planN = 0; S.bench = false; S.pick = null; S.sites = []; S.siteHeap = {}; S.pend = {}; S.baroHist = []; try { resumeHaul(); } catch (e) { S.err.push('resume ' + e.message); } if (S.st.phase === 'none' && S.group) { S.group.visible = false; if (S.hulk) S.hulk.visible = false; } setupDebris(); }
function restoreCrates() { const st = S.st; if (st && st.l9 >= 1 && S.A) S.A.crateAdd('l9', null); }
function hintTarget() { if (!S.ready || S.st.phase !== 'haul') return null; const c = S.A.camp(), e = heapsLeft().filter(q => q.rem > 0).sort((a, b) => Math.hypot(a.h.x - c.x, a.h.z - c.z) - Math.hypot(b.h.x - c.x, b.h.z - c.z))[0]; return e ? { x: e.h.x, z: e.h.z, r: 1.8 } : null; }
function weatherWant() { return S.ready && S.st.phase === 'run' && S.m ? S.m.weather : null; }
root.LI_STORM.attach = attach;
root.LI_STORM.page = { attach, tick, targets, activate, hintTarget, weatherWant, tripStock, onLoad, restoreCrates, readL9, start, state: api2.state, quiet: () => S.quiet, skip: () => start({ build: S.opts.buildSec }) };
root.__storm = api2;
}(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this)));
