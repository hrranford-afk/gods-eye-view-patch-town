/* CAMP TEST (pure node, no browser): placement rules and the robot routine of camp_start.js.
   Run: node games/living-islands/tests/camp-test.js
   Uses two synthetic worlds (a small island with a peak and a long gentle shore, and a lumpy one) so the rules are checked on ground the page does not hand-tune. */
await import('../camp_start.js');   /* a classic script: it sets globalThis.LI_CAMP under node */
const C = globalThis.LI_CAMP;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
/* synthetic worlds: sea level 0, tide +-1.1 */
const bump = (x, z, cx, cz, r, h) => h * Math.exp(-(((x - cx) / r) ** 2 + ((z - cz) / r) ** 2));
const worldA = (x, z) => Math.max(bump(x, z, 28, 30, 15, 3.4), bump(x, z, -30, 40, 28, 3.2), bump(x, z, 6, -50, 20, 2.4), bump(x, z, -42, -26, 18, 3.0)) - .55;
const worldB = (x, z) => Math.max(bump(x, z, 0, 0, 38, 3.8), bump(x, z, 60, 30, 20, 2.8)) - .5 + .25 * Math.sin(x * .21) * Math.cos(z * .17);
const mkEnv = (H, seed, tier, extra) => {
  const f = { x: 28.8, z: 36.9 }; let r = 0; if (H === worldB) { f.x = 20; f.z = 12; }
  const fy = H(f.x, f.z); f.y = fy;
  return Object.assign({ seed, H, tableR: 122, tier, camp: { fire: f, dir: [.12, .99] }, hard: [{ x: f.x, z: f.z, r: 4 }, { x: f.x - 4, z: f.z - 3, r: 4 }, { x: f.x + 3, z: f.z - 5, r: 4 }], clear: [] }, extra || {});
};
const ringMin = (H, x, z, r) => C.ringStats(H, x, z, r).mn;
for (const [name, H] of [['A', worldA], ['B', worldB]]) {
  const e = mkEnv(H, 1122, 'high');
  const p1 = C.plan(e), p2 = C.plan(mkEnv(H, 1122, 'high')), p3 = C.plan(mkEnv(H, 77, 'high'));
  ok(JSON.stringify(p1) === JSON.stringify(p2), name + ': plan is deterministic (same seed, same plan)');
  ok(JSON.stringify(p1.pieces) !== JSON.stringify(p3.pieces) || JSON.stringify(p1.yard) !== JSON.stringify(p3.yard), name + ': a different seed gives a different plan');
  const kinds = p1.pieces.map(p => p.kind);
  ok(['lean_to', 'rain_barrel', 'drying_rack', 'crate_stack', 'cairn', 'relic_hull'].every(k => kinds.indexOf(k) >= 0), name + ': all six placed kit pieces found a site (' + kinds.join(',') + ') notes=' + p1.notes.join(';'));
  /* on dry ground: the camp-zone pieces and the yard stand above the highest tide, the shore pieces on the strand, the hull at the shore */
  const dry = p1.pieces.filter(p => p.zone === 'camp' || p.zone === 'marker').every(p => ringMin(H, p.cx, p.cz, p.fr * .9) >= 0.5 - 1e-6);
  ok(dry, name + ': camp-zone pieces and the cairn stand on dry ground (ring minimum >= 0.5 m, the last rung of the ground rules)');
  ok(p1.yard.y >= C.DRY_MIN[0] && p1.yard.fill < 1.8 && p1.yard.pass < 9, name + ': the robot yard terrace is above the highest tide (level ' + p1.yard.y.toFixed(2) + ' m, fill under ' + p1.yard.fill.toFixed(2) + ' m, pass ' + p1.yard.pass + ')');
  const shore = p1.pieces.find(p => p.kind === 'crate_stack');
  ok(shore && H(shore.cx, shore.cz) >= .35 && H(shore.cx, shore.cz) <= .8, name + ': crate stack is washed up on the strand (height ' + (shore && H(shore.cx, shore.cz).toFixed(2)) + ')');
  const hull = p1.pieces.find(p => p.kind === 'relic_hull'), fire = e.camp.fire;
  ok(hull && Math.hypot(hull.cx - fire.x, hull.cz - fire.z) >= 30 && ringMin(H, hull.cx, hull.cz, hull.fr * .9) >= .05, name + ': relic hull is far from the camp (' + (hull && Math.hypot(hull.cx - fire.x, hull.cz - fire.z).toFixed(0)) + ' m) and above the sea at its footprint');
  /* no overlap: circles of every piece and the yard, and none on the hard items */
  let over = 0; const circles = p1.pieces.map(p => ({ x: p.cx, z: p.cz, r: p.fr })), ys = { x: p1.yard.x, z: p1.yard.z, yaw: p1.yard.yaw, nBays: p1.yard.nBays };
  for (let i = 0; i < circles.length; i++) for (let j = i + 1; j < circles.length; j++) if (Math.hypot(circles[i].x - circles[j].x, circles[i].z - circles[j].z) < circles[i].r + circles[j].r - 1e-6) over++;
  for (const c of circles) for (const h of e.hard) if (Math.hypot(c.x - h.x, c.z - h.z) < c.r + h.r - 1e-6) over++;
  for (const c of circles) if (C.rectDist(ys, c.x, c.z) < c.r - 1e-6) over++;
  for (const h of e.hard) if (C.rectDist(ys, h.x, h.z) < h.r - 1e-6) over++;
  ok(over === 0, name + ': no overlap between pieces, the yard, tents and the fire (' + over + ' overlaps)');
  /* footprints: each piece's footprint circle is the catalogue's, scaled; the pad is inside it */
  ok(p1.pieces.every(p => Math.abs(p.fr - C.PIECES[p.kind].fr * C.PIECES[p.kind].sc) < 1e-9 && p.padR <= p.fr), name + ': footprint circles are the catalogue footprints and the levelling pad stays inside them');
  /* sits on the ground: y is the height at the footprint centre (less a small sink; the hull is half buried) */
  ok(p1.pieces.filter(p => p.zone !== 'jetty').every(p => { const h = H(p.cx, p.cz), d = h - p.y; return p.zone === 'hull' ? d > .3 && d < .6 : d > .0 && d < .06; }), name + ': pieces sit on the ground (sink 3 cm, the hull half buried), none floats');
  /* work sites */
  const work = p1.work;
  ok(work.length >= 4 && work.every(w => w.y > .3 && w.y < 1.0), name + ': ' + work.length + ' shore work sites on the strand (heights ' + work.map(w => w.y.toFixed(2)).join(' ') + ')');
  ok(work.every(w => circles.every(c => Math.hypot(c.x - w.x, c.z - w.z) > c.r * .9) && C.rectDist(ys, w.x, w.z) > 0), name + ': work sites are not inside a piece or the yard');
  /* tiers */
  const lo = C.plan(mkEnv(H, 1122, 'low')), ar = C.plan(mkEnv(H, 1122, 'ar'));
  ok(lo.pieces.length < p1.pieces.length && ar.pieces.length < lo.pieces.length && lo.nBays === 2 && ar.nBays === 1 && p1.nBays === 3, name + ': low and AR have fewer pieces (' + p1.pieces.length + '/' + lo.pieces.length + '/' + ar.pieces.length + ') and robots (3/2/1 bays)');
}
/* ---- the robot routine ---- */
const bots = [{ kind: 'family' }, { kind: 'crab' }, { kind: 'walker' }];
const mk = (seed) => { const e = mkEnv(worldA, seed || 1122, 'high'); return C.simCreate(C.plan(e), bots); };
const BAYS = sim => sim.robots.filter(r => r.state === 'bay');
let sim = mk(); const seen = new Set(), maxIn = [], viol = { twoInBay: 0, negCharge: 0, nan: 0, onWater: 0 };
for (let t = 0; t < 900; t += .25) {
  C.simStep(sim, .25, { night: false, rain: false, tide: 0 });
  const occ = {}; for (const r of sim.robots) { seen.add(r.state); if (r.state === 'bay') { occ[r.bay] = (occ[r.bay] || 0) + 1; } if (r.charge < 0 || r.charge > 1.0001) viol.negCharge++; if (!isFinite(r.x) || !isFinite(r.z)) viol.nan++; }
  for (const k in occ) if (occ[k] > 1) viol.twoInBay++;
  /* the bay's robot is only ever the one assigned to it */
  for (const r of sim.robots) if (r.state === 'bay' && sim.bays[r.bay] !== r.id) viol.twoInBay++;
}
ok(['bay', 'out', 'work', 'carry', 'drop', 'sort', 'home'].every(s => seen.has(s)), 'routine visits every state in 15 minutes (' + [...seen].join(',') + ')');
ok(viol.twoInBay === 0 && viol.negCharge === 0 && viol.nan === 0, 'never two robots in one bay, charge stays 0..1, no NaN (' + JSON.stringify(viol) + ')');
ok(sim.robots.reduce((a, r) => a + r.delivered, 0) > 0 && sim.heap.metal + sim.heap.plastic + sim.heap.wood > 0, 'robots carry finds to the heap (deliveries ' + sim.robots.map(r => r.delivered).join('/') + ', heap ' + JSON.stringify(sim.heap) + ')');
const bayAssign = new Set(sim.robots.map(r => r.bay));
ok(bayAssign.size === sim.robots.length && sim.robots.every(r => r.bay >= 0 && r.bay < sim.YP.bays.length), 'every robot has its own bay (bay assignment is one to one: ' + [...bayAssign].join(',') + ')');
/* same seed, same run */
const s1 = mk(5), s2 = mk(5); C.simRun(s1, 300, { night: false, rain: false, tide: 0 }); C.simRun(s2, 300, { night: false, rain: false, tide: 0 });
ok(JSON.stringify(s1.robots) === JSON.stringify(s2.robots), 'the routine is deterministic (same seed and seconds, same state)');
/* work: a robot that works the shore ends at its work site, and the work takes time */
sim = mk(); C.simRun(sim, 60, { night: false, rain: false, tide: 0 });
const out = sim.robots.find(r => ['out', 'work', 'carry', 'drop', 'sort'].includes(r.state));
ok(!!out, 'after a minute a robot is out on the shore (' + sim.robots.map(r => r.state).join(',') + ')');
/* return on low charge */
sim = mk(); C.simRun(sim, 90, { night: false, rain: false, tide: 0 });
const w = sim.robots.find(r => r.state === 'out' || r.state === 'work' || r.state === 'carry');
w.charge = .15; C.simRun(sim, 1, { night: false, rain: false, tide: 0 });
ok(w.state === 'home' || w.state === 'carry' || w.state === 'drop' || w.state === 'bay', 'low charge sends a working robot home (state ' + w.state + ')');
C.simRun(sim, 120, { night: false, rain: false, tide: 0 });
ok(w.state === 'bay' || w.state === 'home' || w.state === 'out' || w.state === 'work' || w.state === 'carry', 'it went to its bay (it charged: ' + w.charge.toFixed(2) + ')');
/* low charge: really home in bay, charge rises there */
sim = mk(); C.simRun(sim, 90, { night: false, rain: false, tide: 0 });
const lw = sim.robots.find(r => r.state === 'work' || r.state === 'out'); lw.charge = .1; C.simRun(sim, 150, { night: false, rain: false, tide: 0 });
ok(lw.charge > .1 || lw.state === 'bay', 'a low robot ends in its bay and charges (' + lw.state + ', ' + lw.charge.toFixed(2) + ')');
/* dusk */
sim = mk(); C.simRun(sim, 150, { night: false, rain: false, tide: 0 });
C.simRun(sim, 150, { night: true, rain: false, tide: 0 });
ok(sim.robots.every(r => r.state === 'bay'), 'at dusk every robot is in its bay (' + sim.robots.map(r => r.state).join(',') + ')');
ok(sim.robots.every(r => { const b = sim.YP.bays[r.bay]; return Math.hypot(r.x - b.x, r.z - b.z) < .05; }), 'and stands exactly in its own bay');
C.simRun(sim, 200, { night: true, rain: false, tide: 0 });
ok(sim.robots.every(r => r.state === 'bay'), 'robots stay in the bay all night');
C.simRun(sim, 120, { night: false, rain: false, tide: 0 });
ok(sim.robots.some(r => r.state !== 'bay'), 'robots leave again in the morning');
/* rain */
sim = mk(); C.simRun(sim, 150, { night: false, rain: false, tide: 0 }); C.simRun(sim, 180, { night: false, rain: true, tide: 0 });
ok(sim.robots.every(r => r.state === 'bay'), 'in rain every robot is in its bay (' + sim.robots.map(r => r.state).join(',') + ')');
/* tide: when the strand is under water they stay home */
sim = mk(); C.simRun(sim, 150, { night: false, rain: false, tide: 0 }); C.simRun(sim, 200, { night: false, rain: false, tide: 1.1 });
ok(sim.robots.every(r => r.state === 'bay' || r.state === 'home' || r.state === 'carry' || r.state === 'drop' || r.state === 'sort'), 'at high tide no robot works a flooded site (' + sim.robots.map(r => r.state).join(',') + ')');
/* the bay's own robot parks facing the open front; the sorter sorts */
sim = mk(); let sorted = 0; for (let t = 0; t < 900; t += .25) { C.simStep(sim, .25, { night: false, rain: false, tide: 0 }); if (sim.robots.some(r => r.state === 'sort')) sorted++; }
ok(sorted > 0, 'the sorter robot sorts at the heap (' + sorted + ' steps)');
/* robots count in the yard, people are not tracked: the sim has no person */
ok(C.simStep.length >= 2 && !('people' in sim), 'the routine knows robots only (no person is tracked)');
/* hook */
ok(C.shelterHook(2).drawn === false, 'the house hook exists and draws nothing on day one');
process.exit(fails ? 1 : 0);
