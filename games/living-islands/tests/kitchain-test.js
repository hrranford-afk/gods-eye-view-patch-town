/* KIT CHAIN TEST (pure node): Job 6d item 4. The first build (the rain cistern) in the scripted day: four named kit crates, one per material stage, each with a state (ordered / on the boat / on the dock / carried / fitted) that follows what really happens (the boat order, the crate on the dock, a robot or you carrying a unit, the stage set), five visible stages, and the card lists them.
   Run: node games/living-islands/tests/kitchain-test.js */
await import('../physical.js'); await import('../gift_day.js'); await import('../where_from.js');
const P = globalThis.LI_PHYS.core, G = globalThis.LI_GIFT.core, W = globalThis.LI_WHERE;
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const plan = P.stagePlan('cistern', G.BUILD_NEEDS.cistern), names = plan.names;
const st = (b, pend, dock, stock) => W.kitParts('cistern', b, plan, pend, dock, stock, names).map(p => p.state);
ok(names.length === 5, 'five visible stages: ' + names.join(' / '));
let b = P.newBuild('cistern');
const parts = W.kitParts('cistern', b, plan, [], [], {}, names);
ok(parts.length === 4 && parts.every(p => /^Kit crate \d: /.test(p.name)), 'four named kit crates: ' + parts.map(p => p.name).join(' | '));
ok(parts.map(p => p.name.split(': ')[1]).join() === names.slice(1).join(), 'each crate is named for the stage it fits');
ok(st(b, [], [], {}).every(s => s === 'ordered'), 'build chosen, nothing in the yard: every part is ordered');
ok(st(b, ['planks'], [], {})[3] === 'on the boat' && st(b, ['planks'], [], {})[0] === 'ordered', 'a plank order on the way: the lining crate is on the boat, the rest still ordered');
ok(st(b, [], ['planks'], {})[3] === 'on the dock', 'the crate has come ashore: on the dock');
b = P.advance(b, plan, 'stake').b; const stock = { metal: 3, planks: 1 };
ok(st(b, [], [], stock).every(s => s === 'on the dock'), 'staked, stock at the yard heap: every part is on the dock');
const t = P.takeUnit(b, plan); b = t.b; ok(st(b, [], [], stock)[0] === 'carried' && st(b, [], [], stock)[1] !== 'carried', 'a robot (or you) lifts a unit: only that crate is carried');
b = P.placeUnit(b, plan).b; ok(st(b, [], [], stock)[0] === 'carried', 'laid at the site but not yet set: still shown as carried');
b = P.advance(b, plan, 'hold').b; ok(st(b, [], [], stock)[0] === 'fitted' && st(b, [], [], stock)[1] === 'on the dock', 'set by a hold: the base ring is fitted, the next is still on the dock');
b = P.advance(P.placeUnit(P.takeUnit(b, plan).b, plan).b, plan, 'beam').b; b = P.advance(P.placeUnit(P.takeUnit(b, plan).b, plan).b, plan, 'hold').b; b = P.placeUnit(P.takeUnit(b, plan).b, plan).b; b = P.advance(b, plan, 'hold').b;
ok(P.isDone(b) && st(b, [], [], {}).every(s => s === 'fitted'), 'finished: every crate fitted');
ok(W.PART_STATES.join() === 'ordered,on the boat,on the dock,carried,fitted', 'the five states are the ones the owner asked for');
const src = (await import('fs')).readFileSync(new URL('../physical.js', import.meta.url), 'utf8'); ok(/kitParts/.test(src) && /Kit crates/.test(src) && /Five stages/.test(src), 'the build card lists the parts with their states');
console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed'); process.exit(fails ? 1 : 0);
