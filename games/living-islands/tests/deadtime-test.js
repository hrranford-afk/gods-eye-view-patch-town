/* DEAD-TIME TEST (pure node): Job 6b. A scripted day, run on the camp routine, measures the longest stretch with no visible event and nothing the player can do.
   Visible = a robot moving or working, or an ambient event running (gift_day.js ambientStep). Doable = a pile within reach to gather by hand (day: any dry pile; night: inside the lit ring with the lantern lit), or the lantern to light.
   Seconds are the routine's own seconds, the pace a player sees at normal speed. Fails if over 120 s. Without the ambient events the quietest scenario must fail (that is why they exist).
   Run: node games/living-islands/tests/deadtime-test.js */
await import('../camp_start.js'); await import('../gift_day.js');
const C = globalThis.LI_CAMP, K = globalThis.LI_GIFT.core;
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const bump = (x, z, cx, cz, r, h) => h * Math.exp(-(((x - cx) / r) ** 2 + ((z - cz) / r) ** 2));
const H = (x, z) => Math.max(bump(x, z, 28, 30, 15, 3.4), bump(x, z, -30, 40, 28, 3.2), bump(x, z, 6, -50, 20, 2.4), bump(x, z, -42, -26, 18, 3.0)) - .55;
const f = { x: 28.8, z: 36.9, y: H(28.8, 36.9) };
const plan = C.plan({ seed: 1122, H, tableR: 122, tier: 'high', camp: { fire: f, dir: [.12, .99] }, hard: [{ x: f.x, z: f.z, r: 4 }], clear: [] });
/* a scenario: robots started, env, how long, and whether the player takes every pile in reach as soon as it comes back (the worst case: nothing doable) */
function run(sc, ambient) {
  const sim = C.simCreate(plan, Array.from({ length: Math.max(1, sc.robots) }, (_, i) => ({ kind: ['family', 'scout', 'walker'][i % 3] })), {}); sim.shifts = true;
  sim.robots.forEach((r, i) => { r.off = i >= sc.robots; r.timer = i >= sc.robots ? 1e9 : .3 + i * 3; if (r.off) { r.state = 'bay'; r.charge = .3; } });
  const env = { night: !!sc.night, rain: !!sc.rain, tide: 0 }, dt = .5; let a = {}, dead = 0, maxDead = 0, at = 0, ambCount = 0;
  const lit = C.litRadius(sim), ap = sim.YP.apron;
  for (let t = 0; t < sc.seconds; t += dt) {
    C.simStep(sim, dt, env);
    sim.robots.forEach((r, i) => { if (r.off) { r.state = 'bay'; r.timer = 1e9; } });
    if (sc.clearPiles) sim.litter.forEach((l, i) => { l.taken = true; l.back = 1e9; });
    const robotVisible = sim.robots.some(r => !r.off && (r.moving || r.state === 'work' || r.state === 'drop' || r.state === 'sort' || r.state === 'carry' || r.state === 'out'));
    const piles = sim.pl.work.filter((w, i) => !sim.litter[i].taken && w.y > 0.3 && (!sc.night || Math.hypot(w.x - ap.x, w.z - ap.z) <= lit)).length;
    const doable = piles > 0 && !sc.clearPiles;
    let vis = robotVisible || (a.active > 0);
    if (ambient) { const r = K.ambientStep(a, dt, robotVisible); a = r.a; if (r.fire) ambCount++; vis = robotVisible || a.active > 0; }
    if (!vis && !doable) { dead += dt; if (dead > maxDead) { maxDead = dead; at = t; } } else dead = 0;
  }
  return { maxDead, at, ambCount };
}
const SC = [
  { name: 'day, one carrier', robots: 1, seconds: 900 }, { name: 'day, three carriers', robots: 3, seconds: 900 },
  { name: 'rain, three carriers in their bays', robots: 3, rain: true, seconds: 600 },
  { name: 'night, two carriers (one on charge, one working)', robots: 2, night: true, seconds: 900 },
  { name: 'night, three carriers, piles all gathered', robots: 3, night: true, seconds: 900, clearPiles: true },
  { name: 'before the first carrier starts, nothing in reach (all piles gathered)', robots: 0, seconds: 900, clearPiles: true },
  { name: 'night, no carrier, nothing in reach', robots: 0, night: true, seconds: 900, clearPiles: true }];
for (const sc of SC) { const r = run(sc, true); ok(r.maxDead <= 120, sc.name + ': longest stretch of nothing visible and nothing doable ' + r.maxDead.toFixed(0) + ' s (limit 120), ' + r.ambCount + ' ambient events'); }
const q = run(SC[SC.length - 1], false); ok(q.maxDead > 120, 'without the ambient events the quietest night fails (' + q.maxDead.toFixed(0) + ' s): they are needed');
ok(K.AMBIENT.quietS <= 60 && K.AMBIENT.order.length === 4, 'the schedule: an event after ' + K.AMBIENT.quietS + ' s of quiet, ' + K.AMBIENT.order.join(', ') + ' in turn');
ok(K.AMBIENT.order.every(id => K.AMBIENT.text[id] && !/blood|dead|kill|gore|died|drown/i.test(K.AMBIENT.text[id])), 'tone: every ambient line is plain and gentle');
console.log('\n' + (fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed')); process.exit(fails ? 1 : 0);
