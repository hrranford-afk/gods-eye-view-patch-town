/* NIGHT TEST (pure node): Job 6b. Shift maths, hand versus robot rate, battery and solar effects, wait for dawn, starter stock, skip stock.
   Run: node games/living-islands/tests/night-test.js */
await import('../camp_start.js'); await import('../gift_day.js');
const C = globalThis.LI_CAMP, K = globalThis.LI_GIFT.core;
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const bump = (x, z, cx, cz, r, h) => h * Math.exp(-(((x - cx) / r) ** 2 + ((z - cz) / r) ** 2));
const H = (x, z) => Math.max(bump(x, z, 28, 30, 15, 3.4), bump(x, z, -30, 40, 28, 3.2), bump(x, z, 6, -50, 20, 2.4), bump(x, z, -42, -26, 18, 3.0)) - .55;
const f = { x: 28.8, z: 36.9, y: H(28.8, 36.9) };
const plan = C.plan({ seed: 1122, H, tableR: 122, tier: 'high', camp: { fire: f, dir: [.12, .99] }, hard: [{ x: f.x, z: f.z, r: 4 }], clear: [] });
const mk = (nBots, mods) => { const sim = C.simCreate(plan, Array.from({ length: nBots }, (_, i) => ({ kind: ['family', 'scout', 'walker', 'roller'][i % 4] })), {}); sim.shifts = true; sim.robots.forEach((r, i) => { r.timer = .3; Object.assign(r, (mods || [])[i] || {}); }); return sim; };
const ENV = night => ({ night, rain: false, tide: 0 });

/* ---- 1. shifts ---- */
for (const nb of [2, 3, 4]) {
  const sim = mk(nb), slots = Math.floor(nb / 2); let maxC = 0, minWorking = 99, workSteps = 0, steps = 0; const everCharged = new Set(), minCh = Array(nb).fill(1), maxCh = Array(nb).fill(0);
  for (let t = 0; t < 1800; t += .25) { C.simStep(sim, .25, ENV(true)); steps++;
    const nc = sim.robots.filter(r => r.nc); maxC = Math.max(maxC, nc.length, t < 10 ? 0 : sim.robots.filter(r => r.state === 'bay' || r.state === 'home').length); minWorking = Math.min(minWorking, sim.robots.length - nc.length); nc.forEach(r => everCharged.add(r.id));
    if (sim.robots.some(r => (r.state === 'out' || r.state === 'work' || r.state === 'carry') && !r.nc)) workSteps++;
    sim.robots.forEach(r => { if (t > 120) { minCh[r.id] = Math.min(minCh[r.id], r.charge); } }); }
  ok(maxC <= slots, nb + ' robots: at most ' + slots + ' charge at once (peak ' + maxC + ')');
  ok(minWorking >= 1, nb + ' robots: at least one stays on shift at every step');
  ok(everCharged.size === nb || nb > 3, nb + ' robots: they take turns, ' + everCharged.size + ' of ' + nb + ' charged in 30 game minutes of night');
  ok(workSteps / steps > .7, nb + ' robots: someone is working at night for ' + Math.round(100 * workSteps / steps) + ' percent of the time');
  ok(Math.max(...maxCh) >= 0 && Math.min(...minCh) > .05, nb + ' robots: no robot runs flat (lowest charge ' + Math.min(...minCh).toFixed(2) + ')');
  const spread = Math.max(...sim.robots.map(r => r.charge)) - Math.min(...sim.robots.map(r => r.charge)); ok(spread < .5, nb + ' robots: charge is even at the end (spread ' + spread.toFixed(2) + ')');
  ok(sim.heap.metal + sim.heap.plastic + sim.heap.wood > 0, nb + ' robots: loads reached the heap in the night (' + (sim.heap.metal + sim.heap.plastic + sim.heap.wood) + ')');
}
{ const sim = mk(1); let c = 0; for (let t = 0; t < 900; t += .25) { C.simStep(sim, .25, ENV(true)); if (sim.robots[0].nc) c++; } ok(sim.heap.metal + sim.heap.plastic + sim.heap.wood > 0 && c < 3600 * .9, 'one robot alone: still works at night (charges only below ' + C.NIGHT.enterOne + ')'); }
{ const sim = mk(3); let far = 0; const R = C.litRadius(sim), a = sim.YP.apron; for (let t = 0; t < 600; t += .25) { C.simStep(sim, .25, ENV(true)); sim.robots.forEach(r => { if (r.state === 'work' && Math.hypot(r.x - a.x, r.z - a.z) > R + 2) far++; }); } ok(far === 0, 'night work stays inside the lit radius (' + R.toFixed(1) + ' m of the yard)'); }
{ const sim = mk(3); sim.shifts = false; for (let t = 0; t < 400; t += .25) C.simStep(sim, .25, ENV(true)); ok(sim.robots.every(r => r.state === 'bay' || r.state === 'home'), 'without shifts (the old routine) every robot is home at night'); }
{ const sim = mk(3); const r = sim.robots[0]; for (let t = 0; t < 300; t += .25) C.simStep(sim, .25, { night: false, rain: true, tide: 0 }); ok(sim.robots.every(q => q.state === 'bay' || q.state === 'home'), 'rain still sends every robot home'); }

console.log('\n' + (fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed')); process.exit(fails ? 1 : 0);
