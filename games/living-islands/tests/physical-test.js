/* THE GIFT, MAKE IT PHYSICAL: pure node test (no browser). Delivery sequence states, heap size maths, build stage maths, co-op carry rules,
   gates cannot advance on a timer, save round trip including mid-build and mid-carry state, tone rails.
   Run: node games/living-islands/tests/physical-test.js */
await import('../physical.js');
await import('../gift_day.js');
const K = globalThis.LI_PHYS.core, G = globalThis.LI_GIFT.core;
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + (JSON.stringify(a) === JSON.stringify(b) ? '' : '  got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)));

/* ---- build stage maths ---- */
eq([4, 6, 16, 13, 5].map(K.splitUnits).map(a => a.reduce((x, y) => x + y, 0)), [4, 6, 16, 13, 5], 'units are split over the four material stages without losing one');
eq(K.splitUnits(6), [1, 2, 2, 1], 'six units: the frame and the walls take the extra');
for (const id of K.BUILD_IDS) {
  const needs = G.BUILD_NEEDS[id], pl = K.stagePlan(id, needs), tot = Object.values(needs).reduce((a, b) => a + b, 0);
  ok(pl.total === tot && pl.kinds.flat().length === tot && pl.need.every(x => x >= 1), id + ': the stage plan uses exactly the stock the build needs (' + tot + ' units, ' + pl.need.join('/') + ')');
  const kc = {}; pl.kinds.flat().forEach(k => { kc[k] = (kc[k] || 0) + 1; }); eq(Object.keys(kc).sort().map(k => k + kc[k]), Object.keys(needs).sort().map(k => k + needs[k]), id + ': the kinds placed equal the kinds needed');
  ok(pl.names.length === 5 && pl.hoursTotal > 5, id + ': five named stages and a person-hours total of ' + pl.hoursTotal);
}
/* a whole cistern, by the rules: no stage moves without the right act */
const plan = K.stagePlan('cistern', G.BUILD_NEEDS.cistern);
let b = K.newBuild('cistern');
ok(K.needsPlayer(b, plan) === 'stake', 'a new build waits for a person to stake it');
ok(!K.advance(b, plan, 'hold').ok && !K.advance(b, plan, 'beam').ok, 'the wrong kind of act does not move the stage');
b = K.advance(b, plan, 'stake').b; ok(b.stage === 1 && b.hours === 1, 'staked: stage 1, one person-hour');
ok(K.needsPlayer(b, plan) === null && !K.advance(b, plan, 'hold').ok, 'with no material at the site, holding does nothing (a robot cannot "complete" it either)');
ok(K.wantUnit(b, plan) === 'metal', 'the foundation wants metal first');
let t = K.takeUnit(b, plan); ok(t.ok && t.kind === 'metal', 'a unit is taken from the heap'); b = t.b;
ok(K.wantUnit(b, plan) === null, 'while it is in a hand the same unit is not wanted again');
ok(!K.advance(b, plan, 'hold').ok, 'a unit in a hand is not a unit placed');
let ab = K.abortUnit(b); ok(ab.ok && ab.kind === 'metal' && ab.b.hand.length === 0, 'an unit in a hand can be put back (the stock is given back)'); b = ab.b;
b = K.takeUnit(b, plan).b; b = K.placeUnit(b, plan).b; ok(b.placed[0] === 1 && b.hours === 2.5, 'one unit placed: 1.5 person-hours added');
ok(K.needsPlayer(b, plan) === 'hold', 'all the foundation material is at the site: now it wants a person to hold and set it');
b = K.advance(b, plan, 'hold').b; ok(b.stage === 2, 'foundation set by a person');
b = K.placeUnit(K.takeUnit(b, plan).b, plan).b; ok(K.needsPlayer(b, plan) === 'beam' && !K.advance(b, plan, 'hold').ok, 'the frame needs the two-handed beam, not a plain hold');
b = K.advance(b, plan, 'beam').b; ok(b.stage === 3 && b.hours >= 6, 'beam placed: stage 3');
b = K.placeUnit(K.takeUnit(b, plan).b, plan).b; b = K.advance(b, plan, 'hold').b; b = K.placeUnit(K.takeUnit(b, plan).b, plan).b;
ok(K.wantUnit(b, plan) === null && K.needsPlayer(b, plan) === 'hold', 'the last unit is the plank; then the finish waits for a person'); b = K.advance(b, plan, 'hold').b;
ok(K.isDone(b) && b.stage === 5, 'finished only after every unit and every act'); ok(Math.abs(b.hours - plan.hoursTotal) < 1e-9, 'person-hours add up to the plan total exactly: ' + b.hours + ' of ' + plan.hoursTotal);
eq([K.drawn(b, plan, 1), K.drawn(b, plan, 5)], [1, 1], 'a finished build draws every stage');
let c0 = K.newBuild('cottage'); const cp = K.stagePlan('cottage', G.BUILD_NEEDS.cottage); c0 = K.advance(c0, cp, 'stake').b;
ok(K.drawn(c0, cp, 1) === 1 && K.drawn(c0, cp, 2) === 0, 'before any unit the foundation is not drawn');
c0 = K.placeUnit(K.takeUnit(c0, cp).b, cp).b; ok(K.drawn(c0, cp, 2) > 0 && K.drawn(c0, cp, 2) < 1 && K.drawn(c0, cp, 3) === 0, 'each unit placed shows more of the stage being built (' + K.drawn(c0, cp, 2) + ')');

/* ---- gates never advance on a timer: run a long time of robots and clocks with nobody pressing ---- */
{
  let q = K.advance(K.newBuild('hide'), K.stagePlan('hide', G.BUILD_NEEDS.hide), 'stake').b; const hp = K.stagePlan('hide', G.BUILD_NEEDS.hide);
  /* robots ferry every unit they can (they may take and place); nobody holds, nobody carries the beam */
  for (let s = 0; s < 3000; s++) { const tk = K.takeUnit(q, hp); if (tk.ok) q = K.placeUnit(tk.b, hp).b; }
  ok(q.stage === 1 && q.placed[0] === hp.need[0], 'robots alone place the foundation material but the stage stays at 1 after a long time (a robot never completes a gate alone)');
  const c = K.carryNew('beam', [{ x: 0, z: 0 }, { x: 0, z: 10 }]); let c2 = c; for (let s = 0; s < 5000; s++) c2 = K.carryStep(c2, { hold: false, auto: false, robotAt: true }, .25);
  ok(c2.d === 0 && c2.phase === 'wait', 'a beam does not move when nobody holds it, however long the clock runs');
  let r = K.newRun([1, 2], 'A'); for (let s = 0; s < 400; s++) r = K.runStep(r, .5, { aboard: 2 });
  ok(r.phase === 'dock', 'a delivery boat waits at the landing for ever while a crate is still aboard (it never leaves on a timer)');
  r = K.runStep(r, .5, { aboard: 0 }); ok(r.phase === 'out', 'once the last crate is off it leaves');
  const dl = G.canned('yard', 5); ok(G.stageOf(dl) === 'evening' || G.stageOf(dl) === 'yard', 'the gift stage logic has no clock input (stage ' + G.stageOf(dl) + ')');
  ok(K.advance.length === 3 && K.placeUnit.length === 2 && K.takeUnit.length === 2, 'no stage function takes a time argument');
}

/* ---- two-handed carry ---- */
{
  const path = [{ x: 0, z: 0 }, { x: 0, z: 6 }, { x: 8, z: 6 }]; let c = K.carryNew('heavy', path, .8);
  ok(Math.abs(c.total - 14) < 1e-9, 'path length 14 m');
  c = K.carryStep(c, { hold: true, robotAt: false }, 5); ok(c.d === 0, 'a person holding alone cannot move a heavy crate (the robot is not at its end)');
  c = K.carryStep(c, { hold: false, robotAt: true }, 5); ok(c.d === 0, 'a robot at its end alone cannot move it either');
  c = K.carryStep(c, { hold: true, robotAt: true }, 5); ok(Math.abs(c.d - 4) < 1e-9, 'together they move at the robot pace (0.8 m/s): ' + c.d);
  const cr = K.carryNew('crate', path); const c1 = K.carryStep(cr, { hold: true }, 1); ok(Math.abs(c1.d - 2) < 1e-9, 'one person carries a light crate at 2 m/s without a robot');
  let c3 = c; for (let i = 0; i < 100; i++) c3 = K.carryStep(c3, { auto: true, robotAt: true }, 1); ok(c3.phase === 'placed' && c3.d === c3.total, 'it arrives and is placed; it does not overshoot');
  const p = K.pathAt(path, 9); ok(Math.abs(p.x - 3) < 1e-9 && Math.abs(p.z - 6) < 1e-9, 'position along the path: 9 m is (3, 6)');
  const e = K.beamEnds({ x: 0, z: 0 }, Math.PI / 2, 4); ok(Math.abs(e.A.x - 2) < 1e-9 && Math.abs(e.B.x + 2) < 1e-9 && Math.abs(e.A.z) < 1e-9, 'beam ends are a beam length apart: person end and robot end');
}

/* ---- robot errands ---- */
{
  let e = K.errandNew(0, 0, [{ x: 0, z: 3 }, { x: 0, z: 3, act: 'lift', dur: 1 }, { x: 4, z: 3 }, { x: 4, z: 3, act: 'place', dur: 2 }], .75), got = [];
  for (let i = 0; i < 400 && !e.done; i++) { e = K.errandStep(e, .1); got = got.concat(e.ev || []); }
  eq(got, ['lift', 'place', 'done'], 'an errand walks, lifts, walks, places, and is done (events in order)');
  ok(Math.abs(e.x - 4) < 1e-6 && Math.abs(e.z - 3) < 1e-6, 'it ends where the last leg is');
  let e2 = K.errandNew(0, 0, [{ x: 0, z: 9 }], .9), tt = 0; while (!e2.done) { e2 = K.errandStep(e2, .25); tt += .25; } ok(Math.abs(tt - 10) < .3, 'nine metres at 0.9 m/s takes about ten seconds (' + tt + ')');
}

/* ---- heaps follow the stock ---- */
{
  let prev = 0, mono = true; for (let c = 0; c <= 60; c++) { const p = K.heapPieces(c, 30); if (p < prev) mono = false; prev = p; } ok(mono, 'the number of pieces never goes down as the stock goes up (0 to 60)');
  eq([K.heapPieces(0, 30), K.heapPieces(1, 30), K.heapPieces(7, 30), K.heapPieces(60, 30), K.heapPieces(60, 10), K.heapPieces(6, 10)], [0, 1, 7, 30, 10, 6], 'heap pieces: one per unit up to the cap (30 on a full tier, 10 on AR)');
  ok(K.heapScale(30, 30) === 1 && K.heapScale(60, 30) === 1.5, 'past the cap the pieces grow instead (to 1.5 at 60)');
  for (const k of K.STOCK_IDS) { const s = [...Array(30).keys()].map(i => K.heapSlot(k, i)); const sig = JSON.stringify(s); ok(sig === JSON.stringify([...Array(30).keys()].map(i => K.heapSlot(k, i))), k + ': slots are deterministic'); ok(s.every(q => Math.abs(q.x) < 2.2 && q.y > 0 && q.y < 3.2 && Math.abs(q.z) < 1), k + ': 30 pieces stay inside a 4 m by 2 m pile'); }
  const seen = new Set(); [...Array(30).keys()].forEach(i => { const q = K.heapSlot('planks', i); seen.add(q.x.toFixed(2) + ',' + q.y.toFixed(2)); }); ok(seen.size === 30, 'planks lie in 30 distinct places (a stack, not one on top of another)');
}

/* ---- deliveries: the queue and the berth ---- */
{
  const A = { x: 0, z: 0 }, B = { x: 9, z: 0 };
  eq(K.berthFor(null, A, B), { berth: 'A', hold: false }, 'no player boat: the default berth');
  eq(K.berthFor({ x: 2, z: 1 }, A, B), { berth: 'B', hold: false }, 'the player boat at berth A: the tender reroutes to B');
  eq(K.berthFor({ x: 5, z: 0 }, A, B), { berth: null, hold: true }, 'the player boat between both: the tender queues offshore');
  let r = K.newRun([1], 'A'), phases = []; for (let i = 0; i < 80; i++) { r = K.runStep(r, .5, { sail: 14, blocked: true, aboard: 1 }); phases.push(r.phase + (r.hold ? '+hold' : '')); }
  ok(r.phase === 'in' && r.hold, 'blocked: the boat stops at 70 percent of its approach and waits there');
  r = K.runStep(r, .5, { sail: 14, blocked: false, aboard: 1 }); for (let i = 0; i < 20; i++) r = K.runStep(r, .5, { sail: 14, blocked: false, aboard: 1 }); ok(r.phase === 'dock', 'when the way is clear it comes in and docks');
  ok(K.runK(K.newRun([1]), { sail: 14 }) === 0 && K.runK({ phase: 'dock' }) === 1, 'run position: far out then at the berth');
  const sl = [0, 1, 2, 3, 4, 5, 6].map(k => K.crateSlot({ x: 0, z: 0 }, [1, 0], k)); ok(new Set(sl.map(s => s.x.toFixed(1) + ',' + s.z.toFixed(1))).size === 7, 'seven crate slots in a row (then a second row), none on another');
}

/* ---- the day rhythm and the marker ---- */
{
  eq([K.rhythm(40, 12), K.rhythm(3, 6), K.rhythm(3, 19), K.rhythm(-10, 22)], ['day', 'dawn', 'dusk', 'night'], 'rhythm by the sun: day, dawn, dusk, night');
  ok(K.lightsOn('dusk') && K.lightsOn('night') && !K.lightsOn('day') && !K.lightsOn('dawn'), 'lights come on at dusk and stay on at night');
  ok(K.robotsOut('day') && K.robotsOut('dawn') && !K.robotsOut('night'), 'robots are out by day and at dawn, not at night');
  eq(K.nextNeed({ crateAfloat: true, crateShut: true }), { kind: 'crate', at: 'crate' }, 'a crate waiting on the beach comes before opening it');
  eq(K.nextNeed({ partCarried: true, waitRobot: true, crateShut: true }), { kind: 'fit', at: 'robot' }, 'a carried part points at the waiting robot');
  eq(K.nextNeed({ siteWants: 'beam', beamPhase: 'wait' }), { kind: 'beam', at: 'beam' }, 'a beam waiting at the heap');
  eq(K.nextNeed({ lanternUnlit: true, dusk: true }), { kind: 'lantern', at: 'lantern' }, 'at dusk the lantern');
  eq(K.nextNeed({}), null, 'nothing waiting: no marker');
}

/* ---- save: mid-build and mid-carry ---- */
{
  const plan = K.stagePlan('cottage', G.BUILD_NEEDS.cottage); let b = K.advance(K.newBuild('cottage'), plan, 'stake').b; b = K.placeUnit(K.takeUnit(b, plan).b, plan).b; b = K.takeUnit(b, plan).b;
  const s = G.canned('evening', 77); s.stock = { planks: 7, rope: 1, glass: 0, metal: 2 };
  s.phys = { v: 1, crates: [{ n: 1, st: 'yard', x: 3, z: 4, shut: false }, { n: 2, st: 'beach', x: 7.5, z: -2.25, shut: true }, { n: 3, st: 'boat', x: 9, z: 9 }], b, partCarried: true, lantern: true };
  const txt = G.serialize(s), back = G.deserialize(txt); ok(!!back, 'a state with mid-build and mid-carry data loads');
  ok(back.phys && back.phys.b && back.phys.b.id === 'cottage' && back.phys.b.stage === 1 && back.phys.b.placed[0] === 1, 'the build comes back at its stage with the units placed');
  eq(back.phys.crates.map(c => c.st), ['yard', 'beach', 'boat'], 'crates keep their places: one at the yard, one set down on the beach, one still aboard');
  ok(back.phys.partCarried === true && back.phys.lantern === true, 'a carried part and a lit lantern come back');
  const total = o => Object.values(o).reduce((a, c) => a + c, 0), before = total(s.stock) + b.hand.length, after = total(back.stock);
  ok(after === before && back.phys.b.hand.length === 0, 'the unit in a robot\'s hand goes back on the heap when loaded: stock ' + total(s.stock) + ' + 1 in hand = ' + after);
  const bad = JSON.parse(txt); bad.phys = { v: 1, crates: [{ n: 'x' }, null], b: { id: 'palace', stage: 99 } }; const lb = G.deserialize(JSON.stringify(bad)); ok(lb && lb.phys && lb.phys.crates.length === 0 && lb.phys.b === null, 'a damaged physical block is cleaned, the rest of the save still loads');
  const nb = JSON.parse(txt); delete nb.phys; const ld = G.deserialize(JSON.stringify(nb)); ok(ld && ld.phys === null, 'a save from before this layer loads (no physical block)');
  const w = JSON.parse(txt); w.phys.v = 9; ok(G.deserialize(JSON.stringify(w)).phys === null, 'an unknown version of the block is ignored');
  ok(G.newState(1).phys === null, 'a new state has no physical block until the page makes one');
}

/* ---- tone rails on every word this layer shows ---- */
{
  const fs = await import('node:fs'); const src = fs.readFileSync(new URL('../physical.js', import.meta.url), 'utf8');
  const words = (src.match(/'[^'\n]{12,}'/g) || []).join(' ');
  /* OWNER 25 Nov: robots may have lamp eyes (a lens strip, a blink, dim and bright); still no mouths, no speech, no human faces, no written feelings */
  ok(!/blood|gore|corpse|dead|kill|drown|mouth|smile|speaks?\b|says\b|human face|feel(s|ing)?\b|happy|sad\b|afraid/i.test(words.replace(/no faces/gi, '')), 'no gore, no mouths, no speech, no feelings in the layer\'s texts');
  ok(!/Math\.random|Date\.now/.test(src.split('PART B: the page layer')[0].replace(/\/\*[\s\S]*?\*\//g, '')), 'the pure part uses no random and no wall clock');
}
console.log('\n' + (n - fails) + ' of ' + n + ' checks passed'); process.exit(fails ? 1 : 0);
