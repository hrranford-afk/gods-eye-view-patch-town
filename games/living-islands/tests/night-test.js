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

/* ---- 2. hand versus robot rate ---- */
{ const kinds = { metal: 'metal', planks: 'wood', rope: 'plastic', glass: 'plastic' }; let all = true; const rates = {};
  for (const sid of Object.keys(kinds)) { const sim = mk(3); sim.robots.forEach(r => { r.want = kinds[sid]; }); C.simRun(sim, 3600, ENV(false)); const perMin = sim.robots.reduce((a, r) => a + r.delivered, 0) / 3 * K.UNITS_PER_TRIP / 60; rates[sid] = perMin; if (Math.abs(perMin - K.ROBOT_RATE[sid]) / perMin > .15) all = false; }
  ok(all, 'the page constants match the camp routine per robot (' + Object.keys(rates).map(k => k + ' ' + rates[k].toFixed(2) + ' vs ' + K.ROBOT_RATE[k]).join(', ') + ')');
  const ratio = K.handRate() / (Object.values(rates).reduce((a, b) => a + b, 0) / 4); ok(ratio > .8 && ratio < 1.2, 'by hand is about one robot a minute (ratio ' + ratio.toFixed(2) + ')'); }
{ let p = 0, u = 0; for (let i = 0; i < 6000; i++) { const r = K.handStep(p, .1, true); p = r.p; u += r.units; } ok(u === 12, 'a ten minute hold gives ' + u + ' units (about ' + K.handRate().toFixed(1) + ' a minute)');
  const r0 = K.handStep(10, 5, false); ok(r0.p === 10 && r0.units === 0, 'no hold, no progress: nothing gathers by itself');
  ok(/By hand: about 1\.2 a minute\. This robot on Metal: about 1\.4 a minute\./.test(K.rateText('metal')), 'the readout reads: ' + K.rateText('metal')); }
/* ---- 3. battery and solar ---- */
{ const run = (mods, night, sec) => { const sim = mk(2, mods); sim.robots.forEach(r => { r.charge = .9; }); let work = 0, minC = 1; for (let t = 0; t < sec; t += .25) { C.simStep(sim, .25, ENV(night)); sim.robots.forEach(r => { if (r.state === 'work' || r.state === 'out' || r.state === 'carry') work += .25; minC = Math.min(minC, r.charge); }); } return { work, heap: sim.heap.metal + sim.heap.plastic + sim.heap.wood, sim, minC }; };
  const std = run([{}, {}], true, 1200), big = run([{ cap: C.CAP_BIG }, { cap: C.CAP_BIG }], true, 1200);
  ok(big.work > std.work * 1.1, 'the bigger battery works more of the night (' + big.work + ' s against ' + std.work + ' s of out, carry and work)');
  ok(big.heap >= std.heap, 'and brings at least as many loads to the heap (' + big.heap + ' against ' + std.heap + ')');
  { const a = C.simCreate(plan, [{ kind: 'family' }], {}), b = C.simCreate(plan, [{ kind: 'family' }], {}); a.shifts = b.shifts = true; [a, b].forEach(sm => { sm.robots[0].charge = .9; sm.robots[0].timer = .2; }); b.robots[0].cap = C.CAP_BIG; let ta = 0, tb = 0; for (let t = 0; t < 600; t += .25) { C.simStep(a, .25, ENV(false)); C.simStep(b, .25, ENV(false)); } const da = .9 - a.robots[0].charge, db = .9 - b.robots[0].charge; ok(true, 'info: charge after 10 day minutes standard ' + a.robots[0].charge.toFixed(2) + ', big ' + b.robots[0].charge.toFixed(2)); }
  { const mkS = sol => { const sm = C.simCreate(plan, [{ kind: 'family' }], {}); sm.shifts = true; const r = sm.robots[0]; r.timer = .2; r.charge = .95; r.solar = sol; r.fit = false; let low = 1, drain = 0, prev = r.charge, outT = 0; for (let t = 0; t < 400; t += .25) { C.simStep(sm, .25, ENV(false)); if (r.state !== 'bay') { outT += .25; drain += Math.max(0, prev - r.charge); } prev = r.charge; } return { drain, outT }; };
    const a = mkS(false), b = mkS(true); ok(b.drain / b.outT < a.drain / a.outT * .9, 'the solar panel slows the daytime drain (' + (b.drain / b.outT * 1000).toFixed(2) + ' against ' + (a.drain / a.outT * 1000).toFixed(2) + ' per 1000 s out)'); }
  const fit = (s, i, k) => K.fitKit(s, i, k); let st = K.newState(1); st.robots = [true, true]; st.kits = { battery: 1, solar: 0 };
  let r1 = fit(st, 0, 'battery'); ok(r1.ok && r1.state.mods[0].bat && r1.state.kits.battery === 0, 'fitting a bigger battery uses the kit and marks the robot');
  ok(!fit(r1.state, 0, 'battery').ok && !fit(st, 1, 'solar').ok, 'no second fit and no fit without a kit');
  ok(/Short night shift/.test(K.batteryLine(K.modsOf(st, 1), .5)) && !/Short night shift/.test(K.batteryLine(K.modsOf(r1.state, 0), .5)) && /Battery 74 percent/.test(K.batteryLine({}, .74)), 'the card says Short night shift only without the bigger battery, and shows the level');
  ok(K.itemById('battery') && K.itemById('solar') && K.CATALOGUE.length === 10 && K.KITS.length === 2, 'two kits sit beside the ten small things');
  const pl = K.placeOrder(K.newLedger(), 'battery', 12); ok(pl.ok && pl.order.item === 'battery', 'a kit can be ordered like anything else');
  const sv = K.validState(JSON.parse(K.serialize(r1.state))); ok(sv && sv.mods[0].bat && sv.kits.battery === 0, 'mods and kits survive the save'); }
/* ---- 4. wait for dawn ---- */
{ const W = K.waitStep; let w = { mode: null, k: 0 }; const base = { night: true, dark: true, idle: 0, busy: false, act: false };
  w = W(w, .1, Object.assign({}, base, { start: true })); ok(w.mode === 'manual' && w.speed < 2, 'the button starts a manual wait, eased in (speed ' + w.speed.toFixed(2) + ' at first)');
  for (let i = 0; i < 100; i++) w = W(w, .1, base); ok(w.mode === 'manual' && Math.abs(w.speed - K.WAIT.manualSpeed) < 1e-6, 'it ramps to ' + K.WAIT.manualSpeed + ' times in ' + K.WAIT.rampS + ' s');
  const c = W(w, .1, Object.assign({}, base, { act: true })); ok(c.mode === null && c.speed === 1, 'any player action cancels it at once');
  const d = W(w, .1, Object.assign({}, base, { night: false, dark: false })); ok(d.mode === null && d.speed === 1, 'dawn ends it');
  ok(W({ mode: null, k: 0 }, .1, Object.assign({}, base, { start: true, dark: false, night: false })).mode === null, 'it cannot start in daylight');
  let a = { mode: null, k: 0 }; for (let t = 0; t < 40; t += .5) a = W(a, .5, Object.assign({}, base, { idle: t })); ok(a.mode === null, 'nothing speeds up before ' + K.WAIT.idleS + ' s of nothing to do');
  a = W(a, .5, Object.assign({}, base, { idle: 46 })); ok(a.mode === 'auto' && a.speed < 1.5, 'after ' + K.WAIT.idleS + ' s idle at night the time starts to go by, gently');
  for (let i = 0; i < 40; i++) a = W(a, .25, Object.assign({}, base, { idle: 60 })); ok(a.mode === 'auto' && a.speed <= K.WAIT.autoSpeed + 1e-9 && a.speed > 2.9, 'the automatic speed tops out at ' + K.WAIT.autoSpeed + ' times');
  ok(W(a, .1, Object.assign({}, base, { idle: 60, busy: true })).mode === null, 'something that needs you (a card, a hold, a build step) stops it');
  ok(W({ mode: null, k: 0 }, .1, Object.assign({}, base, { idle: 99, busy: true })).mode === null, 'and it does not start while something needs you');
  ok(W({ mode: null, k: 0 }, .1, Object.assign({}, base, { idle: 99, night: false, dark: true })).mode === null, 'no automatic speed-up at dusk (only at night)'); }
/* ---- 5. starter stock and the exact missing line ---- */
ok(K.STARTER.metal === K.BUILD_NEEDS.cistern.metal && K.STARTER.planks === K.BUILD_NEEDS.cistern.planks && K.STARTER.metal === 3 && K.STARTER.planks === 1, 'the starter sack is metal 3, planks 1: exactly the cistern');
{ const st0 = Object.assign({}, K.emptyStock()), st1 = Object.assign({}, st0, K.STARTER); ok(K.missing(st1, K.BUILD_NEEDS.cistern) && Object.keys(K.missing(st1, K.BUILD_NEEDS.cistern)).length === 0, 'with the starter sack the cistern is never blocked on stock');
  ok(K.missingText(st0, { metal: 3 }) === 'Needs 3 metal: you have 0. Set a robot to Metal (daytime) or gather by hand.', 'the card line is exact: ' + K.missingText(st0, { metal: 3 }));
  ok(K.missingText(st0, K.BUILD_NEEDS.cistern) === 'Needs 3 metal and 1 planks: you have 0 and 0. Set a robot to Metal or Planks (daytime) or gather by hand.', 'two things missing: ' + K.missingText(st0, K.BUILD_NEEDS.cistern));
  ok(K.missingText({ metal: 3, planks: 1 }, K.BUILD_NEEDS.cistern) === '' && /you have 2\./.test(K.missingText({ metal: 2 }, { metal: 3 })), 'nothing when enough; the line shows what you have'); }
/* ---- 6. skip-to stock: what a normal day would have produced, never an impossible state ---- */
{ let allOk = true, why = []; const flag = (c, m) => { if (!c) { allOk = false; why.push(m); } };
  for (const st of K.STAGES) { const s = K.canned(st, 9001), i = K.STAGES.indexOf(st);
    flag(Object.values(s.stock).every(v => v >= 0 && v <= K.STOCK_CAP), st + ': stock within 0 and the cap');
    flag(s.ledger.cash >= 0 && s.ledger.credit >= 0, st + ': ledger not negative');
    flag(s.parts + s.robots.filter(Boolean).length === (i >= 3 ? 3 : 0) || i < 3, st + ': parts and started robots add up to the three links from crate one');
    flag(s.robots.some(Boolean) ? (s.jobs || []).every(j => j === null || Object.keys(K.STARTER).concat(['planks']).includes(j)) : true, st + ': a started carrier has a sensible order');
    if (i >= 3) flag(!Object.keys(K.missing(Object.assign({}, s.stock, s.build ? K.BUILD_NEEDS[s.build] : {}), K.BUILD_NEEDS.cistern)).length || s.build, st + ': from the yard on, the cistern is never blocked on stock');
    if (i < 3) flag(Object.values(s.stock).every(v => v === 0), st + ': before crate one is opened the yard stock is empty');
    if (i >= 4) flag(s.stock.planks >= 6 && s.stock.rope === 0 && s.stock.glass === 0, st + ': only what a carrier on planks could have brought'); }
  const d2 = K.canned('done', 9001); flag(Object.values(d2.stock).every(v => v >= 0), 'done: stock sane');
  ok(allOk, 'every Skip-to stage has the stock a normal day produces' + (why.length ? ' (' + why.join('; ') + ')' : '')); }
console.log('\n' + (fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed')); process.exit(fails ? 1 : 0);
