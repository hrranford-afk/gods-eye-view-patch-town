/* WHERE THINGS COME FROM (Job 6d). Pure helpers, no THREE, no DOM, no Math.random: storage bay steps, layout and flow text (item 2), worn paths (item 3) and the kit chain states (item 4).
   Runs in node (tests/bays-test.js, tracks-test.js, kitchain-test.js) and on the page (gift_day.js reads root.LI_WHERE). Tone: plain old machines, no faces, no speech. */
(function (root) {
'use strict';
const MATS = ['planks', 'rope', 'glass', 'metal'];
const SIGN = { planks: 'PLANKS', rope: 'ROPE', glass: 'GLASS', metal: 'METAL' };
/* ---------- item 2: storage bays ---------- */
const STEPS = [0, 1, 3, 6, 10];             /* stock needed for step 0..4 (stack height in a few steps) */
const BAY_TRIS = 12 * 6 + 12 + 4;           /* base slab, up to four stack boxes, a sign post and a sign board: the most one bay draws */
const bayStep = n => { let s = 0; for (let i = 0; i < STEPS.length; i++) if (n >= STEPS[i]) s = i; return s; };
/* four slots in a row near an anchor: dry, level, clear of every obstacle {x,z,r}. H(x,z) is the ground; tideY the highest water line. Returns [{id,x,z,yaw}] or null. */
function bayLayout(anchor, obstacles, H, tideY, yaw) {
  const cs = Math.cos(yaw), sn = Math.sin(yaw), gap = 2.1, w = 1.7; let best = null, bestS = 1e9;
  for (let r = 5; r <= 14; r += 1.5) for (let a = 0; a < 12; a++) {
    const th = a * Math.PI / 6, cx = anchor.x + Math.cos(th) * r, cz = anchor.z + Math.sin(th) * r, slots = []; let bad = 0, hmin = 1e9, hmax = -1e9;
    for (let k = 0; k < 4; k++) { const o = (k - 1.5) * gap, x = cx + cs * o, z = cz - sn * o, h = H(x, z); hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); slots.push({ id: MATS[k], x, z, yaw }); if (h < tideY + .5) bad += 5; for (const ob of obstacles) if (Math.hypot(x - ob.x, z - ob.z) < ob.r + w * .9 + .6) bad += 3; }
    const sc = bad * 100 + (hmax - hmin) * 10 + r; if (sc < bestS) { bestS = sc; best = slots; if (bad === 0 && hmax - hmin < .6) return best; }
  }
  return best;
}
/* what a bay says: stock, what comes in per hour (robot and hand), what goes out. o = { robots:[{on,job}], robotPerMin:{id:n}, handPerMin, needs:{id:n} (the next build), buildName } */
function bayFlow(id, stock, cap, o) {
  const car = (o.robots || []).filter(r => r.on && r.job === id).length, rate = (o.robotPerMin || {})[id] || 0, rin = Math.round(car * rate * 60), hin = Math.round((o.handPerMin || 0) * 60), need = (o.needs || {})[id] || 0;
  return { id, stock, cap, step: bayStep(stock), carriers: car, robotIn: rin, handIn: hin, out: need };
}
function bayText(f, nameOf, from) {
  const nm = nameOf(f.id);
  return { name: nm + ' bay', use: 'Holds ' + f.stock + ' of ' + f.cap + '. ' + from,
    flow: 'In: ' + (f.carriers ? f.carriers + (f.carriers > 1 ? ' carriers' : ' carrier') + ', about ' + f.robotIn + ' an hour' : 'no carrier on it') + '; by hand about ' + f.handIn + ' an hour. Out: ' + (f.out ? 'the next build takes ' + f.out + ' when it starts' : 'nothing is waiting for it now') + '.' };
}
/* ---------- item 3: worn paths ---------- */
/* a route is a list of points; its segments are cut at about 'step' m. A global cap keeps the mesh bounded. */
const PATH = { cap: 160, step: 1.4, trips: 14, maxA: .34 };
function routeCut(points, step, maxSeg) {
  const out = []; for (let i = 0; i + 1 < points.length && out.length < maxSeg; i++) { const a = points[i], b = points[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(d / step));
    for (let k = 0; k < n && out.length < maxSeg; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n]); }
  return out;
}
/* all routes share the cap: each gets an equal share (at least 1) */
function pathPlan(routes, cap) { const per = Math.max(1, Math.floor((cap || PATH.cap) / Math.max(1, routes.length))); return routes.map(r => routeCut(r, PATH.step, per)); }
const wearNew = n => ({ w: new Array(n).fill(0), t: 0 });
function wearAdd(W, i, n) { if (i >= 0 && i < W.w.length) W.w[i] = Math.min(PATH.trips * 2, W.w[i] + (n || 1)); return W; }
function wearDecay(W, dt) { const k = dt / 300; for (let i = 0; i < W.w.length; i++) W.w[i] = Math.max(0, W.w[i] - k); W.t += dt; return W; }   /* one trip's wear fades in five minutes */
const wearAlpha = (W, i) => Math.min(1, (W.w[i] || 0) / PATH.trips) * PATH.maxA;
/* ---------- item 4: kit crate chain ---------- */
const PART_STATES = ['ordered', 'on the boat', 'on the dock', 'carried', 'fitted'];
/* parts of a build: one named kit crate per material stage (2 to 5). b = the physical build state ({stage,placed,hand}), plan = its stagePlan, pend = kinds with a catalogue order on the way, dock = kinds with a delivered crate not yet opened, stock = yard stock */
function kitParts(id, b, plan, pend, dock, stock, names) {
  const out = [];
  for (let a = 0; a < 4; a++) {
    const kinds = plan.kinds[a] || [], need = plan.need[a] || 0, active = b.stage - 1 === a, done = b.stage > a + 1, placed = done ? need : active ? b.placed[a] : 0;
    const carried = active && (b.hand.length > 0 || placed > 0);   /* in a hand on the way, or already laid at the site waiting to be set */
    const have = need === 0 || kinds.every(k => (stock[k] || 0) > 0), onBoat = kinds.some(k => (pend || []).indexOf(k) >= 0), onDock = kinds.some(k => (dock || []).indexOf(k) >= 0);
    const state = done ? 'fitted' : carried ? 'carried' : onDock ? 'on the dock' : onBoat ? 'on the boat' : have && b.stage > 0 ? 'on the dock' : 'ordered';
    out.push({ n: a + 1, name: 'Kit crate ' + (a + 1) + ': ' + ((names || plan.names)[a + 1] || 'part'), kind: kinds[0] || null, need, placed, state });
  }
  return out;
}
const api = { MATS, SIGN, STEPS, BAY_TRIS, bayStep, bayLayout, bayFlow, bayText, PATH, routeCut, pathPlan, wearNew, wearAdd, wearDecay, wearAlpha, PART_STATES, kitParts };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.LI_WHERE = api;
})(typeof window !== 'undefined' ? window : globalThis);
