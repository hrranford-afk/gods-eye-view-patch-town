/* WRACK TEST (pure node): Job 6d item 1. Planks and rope are washed up at the tide line: the same piles as before come back with the tide, each return is counted as a wash-up by kind, and the day's planks are the same as the old timers made.
   Run: node games/living-islands/tests/wrack-test.js */
await import('../camp_start.js'); await import('../gift_day.js');
const C = globalThis.LI_CAMP, K = globalThis.LI_GIFT.core;
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const bump = (x, z, cx, cz, r, h) => h * Math.exp(-(((x - cx) / r) ** 2 + ((z - cz) / r) ** 2));
const H = (x, z) => Math.max(bump(x, z, 28, 30, 15, 3.4), bump(x, z, -30, 40, 28, 3.2), bump(x, z, 6, -50, 20, 2.4), bump(x, z, -42, -26, 18, 3.0)) - .55;
const f = { x: 28.8, z: 36.9, y: H(28.8, 36.9) };
const plan = C.plan({ seed: 1122, H, tableR: 122, tier: 'high', camp: { fire: f, dir: [.12, .99] }, hard: [{ x: f.x, z: f.z, r: 4 }], clear: [] });
function day(k, secs) {
  const sim = C.simCreate(plan, [{ kind: 'family' }, { kind: 'scout' }, { kind: 'walker' }], {}); sim.shifts = true; sim.wrackK = k;
  const log = []; sim.robots.forEach((r, i) => { r.timer = .3 + i * 3; r.want = i === 0 ? 'wood' : undefined; });
  for (let t = 0; t < secs; t += .5) C.simStep(sim, .5, { night: false, rain: false, tide: 0 });
  return sim;
}
const kinds = plan.work.map((w, i) => C.wrackOf(w, i));
ok(kinds.some(k => k === 'planks') && kinds.some(k => k === 'rope'), 'the shore piles include timber and rope wrack: ' + kinds.join(','));
ok(plan.work.every((w, i) => (w.kind === 'wood') === (C.wrackOf(w, i) === 'planks')), 'every wood pile is timber wrack and nothing else is');
const a = day(1, 3 * 3600), b = day(1.5, 3 * 3600);
ok(a.wrack && a.wrack.n > 3, 'timber and rope washed up over 3 hours: ' + (a.wrack && a.wrack.n) + ' arrivals (' + JSON.stringify(a.wrack && a.wrack.by) + ')');
ok(a.wrack.log.every(e => e.stock === 'planks' || e.stock === 'rope'), 'only planks and rope are logged as wrack');
const ts = a.wrack.log.map(e => e.t); ok(ts.length > 2 && ts[ts.length - 1] - ts[0] > 1800, 'arrivals are spread over the day, not one batch: ' + Math.round((ts[ts.length - 1] - ts[0]) / 60) + ' min');
ok(a.robots.reduce((s, r) => s + r.delivered, 0) > 0, 'robots gather it by hand of the routine (' + a.robots.reduce((s, r) => s + r.delivered, 0) + ' trips)');
ok(K.UNITS_PER_TRIP > 0 && K.ROBOT_RATE.planks === 1.3, 'economy numbers unchanged: ' + K.UNITS_PER_TRIP + ' per trip, planks ' + K.ROBOT_RATE.planks + ' a minute');
ok(b.wrack.n >= a.wrack.n, 'after a storm (speed 1.5) at least as much washes up: ' + b.wrack.n + ' vs ' + a.wrack.n);
ok(plan.work.length > 0 && a.litter.every(l => typeof l.back === 'number'), 'timers are the old ones');
console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed'); process.exit(fails ? 1 : 0);
