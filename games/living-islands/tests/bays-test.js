/* BAYS TEST (pure node): Job 6d item 2. One storage bay per material that grows and shrinks with the stock in a few steps, a sign each, a card that says what it holds and the flow in and out per hour (robot vs hand) from the existing numbers, bounded triangles.
   Run: node games/living-islands/tests/bays-test.js */
await import('../camp_start.js'); await import('../gift_day.js'); await import('../where_from.js');
const W = globalThis.LI_WHERE, K = globalThis.LI_GIFT.core, C = globalThis.LI_CAMP;
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
ok(W.MATS.join() === 'planks,rope,glass,metal' && W.MATS.every(m => W.SIGN[m]), 'one bay per material, each with a plain sign: ' + W.MATS.map(m => W.SIGN[m]).join(' '));
const steps = [0, 1, 2, 3, 5, 6, 9, 10, 40, 60].map(W.bayStep); ok(JSON.stringify(steps) === JSON.stringify([0, 1, 1, 2, 2, 3, 3, 4, 4, 4]), 'stack height steps 0..4 with the stock: ' + steps.join(','));
ok([...Array(61).keys()].map(W.bayStep).every((s, i, a) => i === 0 || a[i] >= a[i - 1]), 'a bigger stock is never a lower stack (grows and shrinks both ways)');
ok(4 * W.BAY_TRIS <= 400, 'four bays draw at most ' + 4 * W.BAY_TRIS + ' triangles (bound 400; the ipad budget is 150k)');
const bump = (x, z, cx, cz, r, h) => h * Math.exp(-(((x - cx) / r) ** 2 + ((z - cz) / r) ** 2));
const H = (x, z) => Math.max(bump(x, z, 28, 30, 15, 3.4), bump(x, z, -30, 40, 28, 3.2)) - .55;
const f = { x: 28.8, z: 36.9, y: H(28.8, 36.9) };
const plan = C.plan({ seed: 1122, H, tableR: 122, tier: 'high', camp: { fire: f, dir: [.12, .99] }, hard: [{ x: f.x, z: f.z, r: 4 }], clear: [] });
const YP = C.yardPoints(plan.yard), obs = plan.pieces.map(p => ({ x: p.cx, z: p.cz, r: p.fr })).concat(YP.bays.map(b => ({ x: b.x, z: b.z, r: 1.6 })), [{ x: YP.apron.x, z: YP.apron.z, r: 3 }]);
const lay = W.bayLayout(YP.heap, obs, H, .3, plan.yard.yaw);
ok(lay && lay.length === 4, 'the four bays have places near the yard');
ok(lay.every(s => H(s.x, s.z) > .8 && obs.every(o => Math.hypot(s.x - o.x, s.z - o.z) > o.r + .5)), 'every bay is dry and clear of kit pieces, robot bays and the apron');
const o = { robots: [{ on: true, job: 'planks' }, { on: true, job: 'metal' }, { on: false, job: 'planks' }], robotPerMin: K.ROBOT_RATE, handPerMin: K.handRate(), needs: K.BUILD_NEEDS.cistern };
const fl = W.bayFlow('planks', 7, K.STOCK_CAP, o), tx = W.bayText(fl, id => K.STOCKS.find(s => s.id === id).short, 'Washed up at the tide line.');
ok(fl.carriers === 1 && fl.robotIn === Math.round(K.ROBOT_RATE.planks * 60) && fl.handIn === Math.round(K.handRate() * 60) && fl.out === K.BUILD_NEEDS.cistern.planks, 'planks flow uses the existing numbers: robot ' + fl.robotIn + ' an hour, hand ' + fl.handIn + ', out ' + fl.out);
ok(/Holds 7 of 60/.test(tx.use) && /Washed up at the tide line/.test(tx.use) && /an hour/.test(tx.flow) && /by hand/.test(tx.flow), 'the card says what it holds and the flow: ' + tx.use + ' ' + tx.flow);
const g = W.bayText(W.bayFlow('glass', 0, 60, o), id => id, 'x'); ok(/no carrier on it/.test(g.flow) && /nothing is waiting/.test(g.flow), 'an unused bay says so: ' + g.flow);
ok(!/\b(feel|happy|sad|hungry|face|mouth)\b/i.test(tx.use + tx.flow + g.flow), 'tone rails: no feelings written');
console.log(fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed'); process.exit(fails ? 1 : 0);
