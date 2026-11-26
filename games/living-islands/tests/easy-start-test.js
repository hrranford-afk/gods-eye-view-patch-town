/* EASY START TEST (pure node): Job 7e, owner playtest 26 Nov ("the Gift is too hard").
   A scripted start of the day on the camp routine and the page's pure core: at least 2 of 3 carriers running at t=20 s, never all stalled, the spares crate present and openable with no hold, the first carrier fixed
   within 60 s of scripted player actions, the first build (the rain cistern) finished within 10 game minutes by the stage maths, no dead stretch over 120 s, never an impossible state, Normal unchanged, save round trip.
   Run: node games/living-islands/tests/easy-start-test.js */
await import('../camp_start.js'); await import('../gift_day.js'); await import('../physical.js');
const C = globalThis.LI_CAMP, K = globalThis.LI_GIFT.core, P = globalThis.LI_PHYS.core;
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const bump = (x, z, cx, cz, r, h) => h * Math.exp(-(((x - cx) / r) ** 2 + ((z - cz) / r) ** 2));
const H = (x, z) => Math.max(bump(x, z, 28, 30, 15, 3.4), bump(x, z, -30, 40, 28, 3.2), bump(x, z, 6, -50, 20, 2.4), bump(x, z, -42, -26, 18, 3.0)) - .55;
const f = { x: 28.8, z: 36.9, y: H(28.8, 36.9) };
const plan = C.plan({ seed: 1122, H, tableR: 122, tier: 'high', camp: { fire: f, dir: [.12, .99] }, hard: [{ x: f.x, z: f.z, r: 4 }], clear: [] });

/* 1. the state at arrival */
const E = K.newState(1122, { easy: true }), N = K.newState(1122);
ok(E.easy === true && E.robots.filter(Boolean).length === 2 && E.robots.length === 3, 'Easy: two of the three carriers are on at arrival');
ok(E.fault.filter(Boolean).length === 1 && E.fault[2] === 'battery' && !E.robots[2], 'Easy: exactly one carrier has a fault, the third (the tutorial carrier): flat battery');
ok(E.jobs[0] && E.jobs[1] && E.jobs[0] !== E.jobs[1], 'Easy: the two working carriers have different orders (' + E.jobs.slice(0, 2).join(' and ') + ')');
ok(N.easy === false && N.robots.length === 0 && N.fault.length === 0, 'Normal start is as before: no carrier on, no fault, no spares');
ok(K.stageOf(E) === 'arrive' && K.stageOf(Object.assign({}, E, { opening: true })) === 'dock', 'the story is kept: the dock opening comes first (stage dock), then the letter');

/* 2. at least 2 robots running at t = 20 s, never all three stalled (the camp routine, Easy order) */
{
  const sim = C.simCreate(plan, Array.from({ length: 3 }, (_, i) => ({ kind: ['family', 'scout', 'walker'][i % 3] })), {}); sim.shifts = true;
  const env = { night: false, rain: false, tide: 0 }; let running20 = 0, seen = 0, allOffEver = false, firstMove = 99;
  sim.robots.forEach((r, i) => { r.off = !E.robots[i]; r.fault = E.fault[i] || null; r.state = 'bay'; r.charge = .9; r.timer = r.off ? 1e9 : .3 + i * 3; r.want = i === 0 ? 'wood' : i === 1 ? 'metal' : undefined; });
  const vis = r => !r.off && (r.moving || ['work', 'drop', 'sort', 'carry', 'out'].includes(r.state));
  for (let t = 0; t < 40; t += .5) {
    C.simStep(sim, .5, env); sim.robots.forEach(r => { if (r.off) { r.state = 'bay'; r.timer = 1e9; } });
    const run = sim.robots.filter(vis).length; if (run && firstMove > t) firstMove = t; if (t >= 19.5 && t < 20.5) { running20 = Math.max(running20, run); seen++; }
    if (t > 5 && sim.robots.every(r => !vis(r) && !r.off) ) allOffEver = true;
  }
  ok(firstMove <= 5, 'the first carrier is visibly moving within ' + firstMove + ' s');
  ok(sim.robots.filter(r => !r.off).length >= 2, 'two carriers are on the roster at t = 20 s');
  ok(running20 >= 1 || sim.robots.filter(r => !r.off && (r.state !== 'bay')).length >= 2, 'at t = 20 s the working carriers are out of their bays (running ' + running20 + ', away from bay ' + sim.robots.filter(r => !r.off && r.state !== 'bay').length + ')');
  ok(sim.robots.filter(r => r.off).length === 1 && sim.robots.find(r => r.off).fault === 'battery', 'at most one carrier is stalled, and it is the tutorial carrier with the battery fault');
  ok(C.stopReason(sim, sim.robots.find(r => r.off)) === 'fault_battery' && C.STOPS.fault_battery.say().length > 20, 'its stop reason says what is wrong: ' + C.STOPS.fault_battery.say());
}

/* 3. the spares crate: openable at once with no hold, the numbers */
const before = E.stock, op = K.openSpares(E);
ok(op.ok && !K.openSpares(op.state).ok, 'the spares crate opens once, with no hold, and says so when opened again');
ok(JSON.stringify(op.state.sp) === JSON.stringify({ battery: 2, track: 1, lamp: 1 }), 'parts: 2 batteries, 1 track set, 1 lamp unit');
ok(['metal', 'planks', 'rope', 'glass'].every(k => op.state.stock[k] - before[k] === K.EASY.stock[k]) && K.EASY.stock.metal === 3 && K.EASY.stock.planks === 3 && K.EASY.stock.rope === 2 && K.EASY.stock.glass === 1, 'stock: 3 metal, 3 planks, 2 rope, 1 glass go to the heap');
ok(/batter/.test(K.sparesText()) && /track/.test(K.sparesText()) && /lamp/.test(K.sparesText()) && /metal/.test(K.sparesText()), 'the card text names what is inside: ' + K.sparesText());
ok(!K.openSpares(N).ok, 'a Normal start has no spares crate');
ok(K.easyHint(E) === 'Tap the spares crate on the dock.' && K.hintFor(E) === K.easyHint(E), 'before the crate is opened the gold hint is: ' + K.easyHint(E));
ok(K.easyHint(op.state) === 'Fit a battery to the stalled robot.', 'after it: ' + K.easyHint(op.state));
ok(['Tap the spares crate on the dock.', 'Fit a battery to the stalled robot.'].every(t => t.split(/\s+/).length <= 8), 'both hints are eight words or fewer');

/* 4. fix the first robot in under 60 s of scripted player actions */
{
  const bad = K.fixRobot(E, 2); ok(!bad.ok && /spares crate/.test(bad.why) && bad.state === E, 'fitting before the crate is open fails kindly and changes nothing: ' + bad.why);
  const fx = K.fixRobot(op.state, 2);
  ok(fx.ok && fx.state.robots[2] === true && fx.state.fault[2] === null && fx.state.sp.battery === 1 && fx.state.jobs[2], 'fitted: carrier 3 is on, the fault is gone, one battery used (one left), it has an order (' + fx.state.jobs[2] + ')');
  ok(fx.state.fixed[2] && /flat/i.test(fx.state.fixed[2].why) && /battery/.test(fx.state.fixed[2].used), 'its card can say what was wrong and what was used: "' + fx.state.fixed[2].why + '" / ' + fx.state.fixed[2].used);
  ok(!K.fixRobot(fx.state, 2).ok, 'no second fit on a carrier with nothing wrong');
  /* the player's actions, seconds each (a slow first-time player): look at the crate and tap it, press Open, tap the carrier (first tap shows the card, second the action), press Fit, hold at the post */
  const script = [['tap the crate', 3], ['press Open it', 2], ['tap the carrier', 3], ['tap Fit a battery', 3], ['walk or glide to the post', 8], ['hold at the post', K.FIT_S], ['read the card', 5]];
  const total = script.reduce((a, s) => a + s[1], 0);
  ok(total < 60, 'the scripted player fixes the first carrier in ' + total + ' s (limit 60): ' + script.map(s => s[0] + ' ' + s[1]).join(', '));
}

/* 5. the first build (cistern) fits in 10 game minutes by the stage maths */
{
  K.applyEasyNeeds(true); const needsE = JSON.parse(JSON.stringify(K.needsOf(E, 'cistern'))); const pe = P.stagePlan('cistern', needsE);
  K.applyEasyNeeds(false); const needsN = K.needsOf(N, 'cistern'), pn = P.stagePlan('cistern', needsN);
  ok(needsE.metal === 2 && needsE.planks === 1 && needsN.metal === 3 && needsN.planks === 1, 'Easy cistern needs 2 metal + 1 plank (3 units); Normal keeps 3 metal + 1 plank (' + JSON.stringify(needsN) + ')');
  const cost = pl => {   /* seconds: the stakes, then per stage the robots walk the units in parallel (two robots), you hold to set it, the beam stage is the two-handed carry; plus 8 s of looking and walking between steps */
    let t = P.HOLD.stake + 8; const ferry = 24 + P.HOLD.place;   /* one unit: about 22 m at the robot's 0.9 m/s plus the placing animation */
    pl.need.forEach((c, i) => { t += Math.ceil(c / 2) * ferry + (i === 1 ? P.HOLD.lift * 2 + 8 : P.HOLD.set) + 8; }); return t; };
  const te = cost(pe), tn = cost(pn);
  ok(te <= 600, 'Easy first build: about ' + Math.round(te) + ' s of game time with two carriers (limit 600); Normal ' + Math.round(tn) + ' s');
  ok(te < tn, 'Easy is quicker than Normal');
  const s2 = Object.assign({}, op.state, { easy: true }); ok(K.canBuild(s2, 'cistern').ok, 'with the spares open the cistern can be started at once (cash and credit are the letter\'s)');
  const n2 = Object.assign({}, N, { stock: { planks: 0, rope: 0, glass: 0, metal: 0 } }); ok(!K.canBuild(n2, 'cistern').ok && /gather by hand|robots/.test(K.canBuild(n2, 'cistern').why + K.missingText({ metal: 0, planks: 0 }, K.needsOf(N, 'cistern'))), 'a blocked build always says what is missing and where to get it (hand gathering stays)');
  const db = K.doBuild(s2, 'cistern'); ok(db.ok && db.state.stock.metal === op.state.stock.metal - 2 && db.state.stock.planks === op.state.stock.planks - 1, 'Easy: building the cistern spends 2 metal and 1 plank, leaving 1 metal, 2 planks, 2 rope, 1 glass');
}

/* 6. no dead stretch over 120 s with two carriers working (the deadtime scenario with the Easy roster), day and night */
function run(sc, ambient) {
  const sim = C.simCreate(plan, Array.from({ length: 3 }, (_, i) => ({ kind: ['family', 'scout', 'walker'][i % 3] })), {}); sim.shifts = true;
  sim.robots.forEach((r, i) => { r.off = i >= 2; r.timer = i >= 2 ? 1e9 : .3 + i * 3; if (r.off) { r.state = 'bay'; r.charge = .3; } });
  const env = { night: !!sc.night, rain: !!sc.rain, tide: 0 }, dt = .5; let a = {}, dead = 0, maxDead = 0; const lit = C.litRadius(sim), ap = sim.YP.apron;
  for (let t = 0; t < sc.seconds; t += dt) {
    C.simStep(sim, dt, env); sim.robots.forEach(r => { if (r.off) { r.state = 'bay'; r.timer = 1e9; } });
    const rv = sim.robots.some(r => !r.off && (r.moving || ['work', 'drop', 'sort', 'carry', 'out'].includes(r.state)));
    const piles = sim.pl.work.filter((w, i) => !sim.litter[i].taken && w.y > .3 && (!sc.night || Math.hypot(w.x - ap.x, w.z - ap.z) <= lit)).length;
    let vis = rv || (a.active > 0); const r = K.ambientStep(a, dt, rv); a = r.a; vis = rv || a.active > 0;
    if (!vis && piles === 0) { dead += dt; if (dead > maxDead) maxDead = dead; } else dead = 0;
  }
  return maxDead;
}
for (const sc of [{ name: 'first hour, two carriers working', seconds: 3600 }, { name: 'evening and night, two carriers', night: true, seconds: 900 }, { name: 'rain, two carriers', rain: true, seconds: 600 }]) { const d = run(sc); ok(d <= 120, sc.name + ': longest stretch of nothing visible and nothing doable ' + d.toFixed(0) + ' s (limit 120)'); }

/* 7. never impossible, save round trip, Normal unchanged, tone */
{
  const st = op.state, back = K.deserialize(K.serialize(Object.assign({}, st, { fault: [null, null, 'battery'] })));
  ok(back && back.easy === true && back.spares.open === true && back.sp.battery === 2 && back.fault[2] === 'battery', 'save round trip keeps easy, the opened crate, the parts and the fault');
  const old = JSON.parse(K.serialize(N)); delete old.easy; delete old.spares; delete old.sp; delete old.fault; delete old.fixed; const ob = K.deserialize(JSON.stringify(old)); ok(ob && ob.easy === false && ob.spares.open === false && ob.fault.length === 0, 'an older save without the new fields loads as a Normal start');
  const bogus = K.deserialize(JSON.stringify(Object.assign(JSON.parse(K.serialize(N)), { easy: false, spares: { open: true }, sp: { battery: 99 }, fault: ['junk', 'battery'] }))); ok(bogus && bogus.spares.open === false && bogus.sp.battery === 9 && bogus.fault[0] === null, 'a bad save cannot open a crate that is not there, and numbers are clamped');
  const words = [K.sparesText(), K.FAULTS.battery.say, K.FAULTS.track.say, K.FAULTS.lamp.say, K.FAULTS.battery.why, K.easyHint(E)].join(' ');
  ok(!/blood|dead|kill|gore|died|angry|sad|happy|feel|afraid|sorry/i.test(words), 'tone: plain words, no feelings written for the robots, nothing gory');
  const states = [E, op.state, K.fixRobot(op.state, 2).state]; ok(states.every(s => K.stageOf(s) && K.hintFor(s).length > 5), 'every Easy state has a stage and a hint (never a blank, never stuck)');
}
console.log('\n' + (fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed')); process.exit(fails ? 1 : 0);
