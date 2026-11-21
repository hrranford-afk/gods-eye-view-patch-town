/* City Lab simulation test. Run: NODE_PATH=$(npm root -g) node tests/sim-test.js
   Expected numbers are worked out by hand from the recipe (the arithmetic is in the comments) and compared with the simulation within a stated tolerance. */
'use strict';
const fs = require('fs');
const path = require('path');
const Sim = require('../sim.js');
const SUP = require('../supports.js');
const rd = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'recipes', n + '.json'), 'utf8'));
let n = 0, bad = 0;
const rows = [];
const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (!cond && extra ? '  -> ' + extra : '')); };
const near = (name, got, want, tol, unit) => { const c = Math.abs(got - want) <= tol; rows.push([name, +(+want).toFixed(3), +(+got).toFixed(3), '+-' + tol + (unit || ''), c ? 'ok' : 'OUT']); ok(name + ': simulated ' + (+got).toFixed(2) + ', by hand ' + want + ' (tolerance ' + tol + ')', c); };
const fresh = (r, seed, f) => { const s = Sim.create(r, { seed: seed == null ? 1 : seed }); if (f) f(s); return s; };
const sum = (r, s) => Sim.summary(r, s);
const ids = (r, tag) => r.parts.filter((p) => p.tag === tag).map((p) => p.id);

const R = rd('bakery');
/* The bakery's numbers (recipes/bakery.json): batch 28 s, 12 loaves a batch (inputs 3 flour, 2 water, 1 fuel), demand 20 a minute at price 4,
   2 bakers + 1 seller at 5 a minute each, power 6 kW at 24 a kWh, deliveries every 70 s (flour 12 at 1.5, water 8 at .2, fuel 4 at 2.5), start stock flour 20, water 12, fuel 6 */

/* 1. baseline, 5 minutes */
{
  const s = fresh(R, 1); Sim.run(R, s, 300); const m = sum(R, s);
  /* batches: one finishes every 28 s from t=28: floor(300/28) = 10, so 120 loaves. */
  near('baseline: batches finished in 5 min', m.batches, 10, 0);
  near('baseline: loaves made', m.produced, 120, 0);
  /* customers come every 3 s (20 a minute); the first loaves exist at t=28, so the customers at t=30..300 are served: (300-30)/3+1 = 91 (the one at t=300 is on the edge) */
  near('baseline: loaves sold', m.sold, 90.5, 1.5);
  near('baseline: income (sold x 4)', m.income, 362, 6);
  /* wages: 3 workers x 5 a minute x 5 minutes */
  near('baseline: wages', m.costs.wages, 75, 0.05);
  /* ingredients: four carts (t=70,140,210,280) of 12 flour (1.5), 8 water (.2), 4 fuel (2.5) = 4 x (18 + 1.6 + 10) */
  near('baseline: ingredient cost', m.costs.ingredients, 118.4, 0.05);
  /* power: the oven runs all 300 s (an 11th batch is under way at the end): 6 kW x 300/3600 h = .5 kWh x 24 */
  near('baseline: power cost', m.costs.power, 12, 0.3);
  near('baseline: repairs cost nothing', m.costs.repairs, 0, 0);
  near('baseline: balance = income - costs', m.balance, m.income - 75 - 118.4 - 12, 0.5);
  /* stock: flour 20 + 4x12 - 11 batches started x 3; water 12 + 32 - 22; fuel 6 + 16 - 11 */
  near('baseline: flour in store', s.stock.flour, 35, 0); near('baseline: water in store', s.stock.water, 22, 0); near('baseline: fuel in store', s.stock.fuel, 11, 0);
  near('baseline: loaves in store (made - sold)', s.stock.loaf, 120 - m.sold, 0);
  near('baseline: income per minute (last minute: 20 x 4)', m.income_per_min, 80, 4);
  /* the last minute (t=240..300) has one cart (t=280): wages 15 + power 2.4 + 29.6 of ingredients */
  near('baseline: running cost per minute (wages 15 + power 2.4 + one cart 29.6)', m.cost_per_min, 47, 1);
  ok('baseline: the status is working and power is ok', /working|storage/.test(m.status) && m.power.state === 'ok');
  ok('baseline: nothing spoiled and no part is missing', Object.keys(s.spoiled).length === 0 && m.missing === 0);
  ok('baseline: the trace log has deliveries, batches, sales', ['delivery', 'batch', 'sold'].every((t) => s.log.some((e) => e.type === t)));
}

/* 2. low power: supply 3 of 6 kW -> half speed */
{
  const s = fresh(R, 1, (x) => { x.supply_kw = 3; }); Sim.run(R, s, 300); const m = sum(R, s);
  /* factor .5: one batch per 56 s: floor(300/56) = 5 batches */
  near('brownout (3 of 6 kW): batches in 5 min', m.batches, 5, 0);
  ok('brownout: the power state is low and the factor .5', s.power.state === 'low' && Math.abs(s.power.factor - 0.5) < 1e-9);
  /* it draws only 3 kW: .25 kWh x 24 = 6 */
  near('brownout: power cost (draws what the city gives)', m.costs.power, 6, 0.2);
}

/* 3. power cut: the cable gone */
{
  const s = fresh(R, 1); Sim.run(R, s, 60); const b0 = s.prod.batches, k0 = s.power.kwh;
  Sim.destroy(R, s, ['wire'], 'test'); Sim.run(R, s, 120); const m = sum(R, s);
  near('cable cut at 60 s: no batch finishes in the next 120 s', s.prod.batches - b0, 0, 0);
  near('cable cut: no power drawn after the cut', s.power.kwh - k0, 0, 1e-9);
  ok('cable cut: state is cut, status says power cut, the log says so', s.power.state === 'cut' && /power cut/.test(m.status) && s.log.some((e) => e.type === 'power' && /Power cut/.test(e.text)));
  ok('cable cut: loaves already in store are still sold (all 24 made before the cut, less 1)', m.sold >= 23, m.sold);
  const s2 = fresh(R, 1); Sim.destroy(R, s2, ['meter'], 'test');
  ok('meter box destroyed: the cable it carries falls and power is cut', !s2.present.wire && (Sim.run(R, s2, 1), s2.power.state === 'cut'));
  const s3 = fresh(R, 1, (x) => { x.supply_kw = 0; }); Sim.run(R, s3, 60);
  ok('the city supplying 0 kW also stops the oven', s3.prod.batches === 0 && s3.power.state === 'cut');
}

/* 4. oven smashed at 60 s */
{
  const s = fresh(R, 1); Sim.run(R, s, 60); Sim.destroy(R, s, ['oven'], 'test'); Sim.run(R, s, 240); const m = sum(R, s);
  near('oven smashed at 60 s: only the 2 batches before it (floor(60/28))', m.batches, 2, 0);
  ok('oven smashed: status says no oven, the bakers have nothing to do', /no .*oven/.test(m.status) && m.workers.filter((w) => w.role === 'baker').every((w) => /idle/.test(w.text)));
  ok('oven smashed: the cable and meter box are untouched (only the oven went)', s.present.wire && s.present.meter && !s.present.oven && Object.keys(s.present).filter((k) => !s.present[k]).length === 1);
}

/* 5. roof off: flour spoils */
{
  const oven = (s) => Sim.destroy(R, s, ['oven'], 'test');   /* the oven is out so nothing but spoilage changes the flour; the first cart is at 70 s */
  const s = fresh(R, 1, (x) => { oven(x); Sim.destroy(R, x, ids(R, 'roof'), 'test'); });
  Sim.run(R, s, 60);
  /* all 12 tiles gone: share 1, spoil_per_minute .25: flour(t) = 20 e^(-.25 t/60); at 60 s: 20 e^-.25 = 15.576 */
  near('roof off: flour left after 1 minute (20 e^-.25)', s.stock.flour, 15.576, 0.16);
  near('roof off: flour spoiled', s.spoiled.flour, 20 - 15.576, 0.16);
  ok('roof off: the log says flour spoiled', s.log.some((e) => e.type === 'spoil'));
  const h = fresh(R, 1, (x) => { oven(x); Sim.destroy(R, x, ids(R, 'roof').slice(0, 6), 'test'); }); Sim.run(R, h, 60);
  /* half the tiles gone: share .5: 20 e^-.125 = 17.65 */
  near('half the roof off: flour left after 1 minute (20 e^-.125)', h.stock.flour, 17.649, 0.18);
  const w = fresh(R, 1, (x) => oven(x)); Sim.run(R, w, 60);
  near('roof whole: no spoilage', w.stock.flour, 20, 0);
}

/* 6. awning off: 15% less demand */
{
  const s = fresh(R, 1, (x) => Sim.destroy(R, x, ['awning'], 'test')); Sim.run(R, s, 300); const m = sum(R, s);
  near('awning gone: demand per minute (20 x .85)', m.demand_per_min, 17, 1e-9);
  /* customers every 60/17 = 3.529 s; served from t=28: (300-28)/3.529 = 77.1 */
  near('awning gone: loaves sold in 5 min', m.sold, 77.1, 2);
  ok('awning gone: the sign that hung on it fell too', !s.present.sign);
}

/* 7. repair restores */
{
  const s = fresh(R, 1); Sim.run(R, s, 30); Sim.destroy(R, s, ['oven'], 'test'); Sim.run(R, s, 10);
  const stopped = s.prod.batches; Sim.orderRepair(R, s, 'oven'); const t0 = s.t; let tDone = null;
  for (let i = 0; i < 2000 && tDone == null; i++) { Sim.run(R, s, 0.1); if (s.present.oven) tDone = s.t; }
  /* the nearer baker stands at x -.66 or -.44, z -.13; the oven middle is at (-.55, -.5): .386 away at .35 a second = 1.1 s, then 20 s of work */
  near('repair: the oven is back this many seconds after the order (walk 1.1 + work 20)', tDone - t0, 21.1, 0.6, ' s');
  near('repair: material cost (2 units x 3)', s.costs.repairs, 6, 0);
  Sim.run(R, s, 120); const m = sum(R, s);
  ok('repair: production recovers (batches rise again)', s.prod.batches >= stopped + 3, s.prod.batches + ' vs ' + stopped);
  ok('repair: the worker walked home and stands at the oven again', s.workers.every((w) => w.state === 'station'));
  ok('repair: the log has started and finished', s.log.some((e) => /Repair started/.test(e.text)) && s.log.some((e) => /Repair finished/.test(e.text)));
  /* cable + meter: both gone; the meter must be mended first, then the cable (two workers, 5 s each) */
  const c = fresh(R, 1); Sim.destroy(R, c, ['meter'], 'test'); const q = Sim.orderRepair(R, c, 'wire');
  ok('repair: ordering the cable orders the meter box first (what holds it up)', q[0] === 'meter' && q[1] === 'wire' && q.length === 2);
  Sim.run(R, c, 25);
  ok('repair: after 25 s both are back and the power is on', c.present.meter && c.present.wire && c.power.state === 'ok', JSON.stringify(c.present.meter) + JSON.stringify(c.present.wire));
  near('repair: two repairs cost 2 x 6', c.costs.repairs, 12, 0);
  /* a repair is refused (it waits) while what holds the part is missing: a tile with no rafter */
  const d = fresh(R, 1); Sim.destroy(R, d, ['rafter.f0'], 'test');
  ok('a rafter falling takes its tiles with it (3 parts: rafter + 2 tiles)', !d.present['tile.f00'] && !d.present['tile.f10'] && d.present['tile.f01']);
  Sim.orderRepair(R, d, 'tile.f10'); Sim.run(R, d, 20);
  ok('repairing a tile restores the rafter first, then the tile', d.present['rafter.f0'] && d.present['tile.f10'] && !d.present['tile.f00']);
  Sim.orderAll(R, d); Sim.run(R, d, 60);
  ok('"repair all" brings everything back', Object.keys(d.present).every((k) => d.present[k]));
}

/* 8. deliveries need the drop crate */
{
  const s = fresh(R, 1, (x) => Sim.destroy(R, x, ['oven', 'crate.a'], 'test')); Sim.run(R, s, 75);
  near('drop crate gone: the 70 s cart brings no flour', s.stock.flour, 20, 0);
  ok('drop crate gone: the log says the cart could not deliver', s.log.some((e) => /could not deliver/.test(e.text)));
  const t = fresh(R, 1, (x) => Sim.destroy(R, x, ['oven'], 'test')); Sim.run(R, t, 75);
  near('drop crate standing: the 70 s cart brings 12 flour', t.stock.flour, 32, 0);
  const u = fresh(R, 1, (x) => { x.stock.flour = 55; Sim.destroy(R, x, ['oven'], 'test'); }); Sim.run(R, u, 75);
  near('storage full: only what fits is taken (cap 60)', u.stock.flour, 60, 0);
}

/* 9. blasts and the support rule inside the sim */
{
  const s = fresh(R, 1); const f = Sim.blast(R, s, [-0.55, 0.3, -0.5], 0.25, 'test');
  ok('a blast at the oven takes the oven and what touches the sphere', !s.present.oven && f.direct.indexOf('oven') >= 0);
  const g = fresh(R, 1); Sim.blast(R, g, [0, 1.0, 0.8], 0.3, 'test');
  ok('a blast at the front beam: the beam goes and so do the door, panels, awning, sign, rafters and tiles on it', !g.present['beam.f'] && !g.present.door && !g.present.awning && !g.present.sign && !g.present['rafter.f1'] && !g.present['tile.f11']);
  ok('nothing is left floating after any damage (the rule is closed)', SUP.floating(R.parts, Object.keys(g.present).filter((k) => !g.present[k])).length === 0);
  /* random damage, 200 times: after every one the standing parts are all held */
  let rs = 12345, seeded = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; }, floatingSeen = 0;
  for (let i = 0; i < 200; i++) {
    const x = fresh(R, 1), k = 1 + Math.floor(seeded() * 5), pick = []; for (let j = 0; j < k; j++) pick.push(R.parts[Math.floor(seeded() * R.parts.length)].id);
    Sim.destroy(R, x, pick, 'test'); if (SUP.floating(R.parts, Object.keys(x.present).filter((q) => !x.present[q])).length) floatingSeen++;
  }
  ok('200 random damage sets: never a floating part', floatingSeen === 0);
}

/* 10. determinism, saving and replaying */
{
  const noisy = JSON.parse(JSON.stringify(R)); noisy.systems.sales.noise = 0.3;
  const run = (seed) => { const s = fresh(noisy, seed); Sim.run(noisy, s, 120); Sim.blast(noisy, s, [0, 1.2, 0.8], 0.3, 'test'); Sim.orderAll(noisy, s); Sim.run(noisy, s, 120); return s; };
  const a = run(7), b = run(7), c = run(8);
  ok('same recipe, same seed, same actions: the state hash is identical (' + Sim.hash(a) + ')', Sim.hash(a) === Sim.hash(b) && JSON.stringify(a) === JSON.stringify(b));
  ok('a different seed gives a different run (sales noise is seeded)', Sim.hash(a) !== Sim.hash(c), Sim.hash(a) + ' ' + Sim.hash(c));
  const s1 = fresh(noisy, 3); Sim.run(noisy, s1, 100);
  const copy = JSON.parse(JSON.stringify(s1)); Sim.run(noisy, s1, 100); Sim.run(noisy, copy, 100);
  ok('a saved state (plain JSON) replays to the same result as the live one', Sim.hash(s1) === Sim.hash(copy));
  ok('the state is plain JSON: it survives stringify and parse unchanged', JSON.stringify(JSON.parse(JSON.stringify(s1))) === JSON.stringify(s1));
  const t1 = fresh(R, 1); Sim.run(R, t1, 0.05); Sim.run(R, t1, 0.05); Sim.run(R, t1, 59.9); const t2 = fresh(R, 1); Sim.run(R, t2, 60);
  ok('time can be fed in any size of piece (the remainder is kept)', Sim.hash(t1) === Sim.hash(t2));
}

/* 11. every number comes from the recipe */
{
  const base = fresh(R, 1); Sim.run(R, base, 300);
  const p2 = JSON.parse(JSON.stringify(R)); p2.systems.sales.price = 8; p2.systems.costs.wage_per_worker_per_minute = 10;
  const s = fresh(p2, 1); Sim.run(p2, s, 300);
  near('double the price in the recipe: double the income', s.sales.income, base.sales.income * 2, 0.01);
  near('double the wage in the recipe: double the wages', s.costs.wages, base.costs.wages * 2, 0.01);
  const p3 = JSON.parse(JSON.stringify(R)); p3.systems.production.batch_seconds = 56;
  const s3 = fresh(p3, 1); Sim.run(p3, s3, 300);
  near('batch time 56 s in the recipe: half the batches (floor(300/56) = 5)', s3.prod.batches, 5, 0);
  const p4 = JSON.parse(JSON.stringify(R)); p4.systems.effects.demand[0].loss = 0.5;
  const s4 = fresh(p4, 1, (x) => Sim.destroy(p4, x, ['awning'], 'test'));
  near('awning loss 50% in the recipe: demand 10 a minute', Sim.summary(p4, s4).demand_per_min, 10, 1e-9);
}

/* 12. the other recipes run */
{
  const st = rd('cart_stall'), s = fresh(st, 1); Sim.run(st, s, 300); const m = sum(st, s);
  /* demand 9 a minute, 12 apples to start, 10 more every 60 s (cap 30): enough for all 45 customers: 9 x 5 = 45 sold at 2 */
  near('cart stall: apples sold in 5 minutes (9 a minute x 5)', m.sold, 45, 1.5);
  near('cart stall: income (45 x 2)', m.income, 90, 3);
  near('cart stall: wages (1 x 3 x 5)', m.costs.wages, 15, 0.05);
  const s2 = fresh(st, 1, (x) => Sim.destroy(st, x, ['awning'], 'test')); Sim.run(st, s2, 300);
  near('cart stall without its awning: demand 9 x .8 = 7.2 a minute, 36 sold', Sim.summary(st, s2).sold, 36, 1.5);
  ['shed', 'house'].forEach((nm) => { const r = rd(nm), x = fresh(r, 1); let threw = false; try { Sim.run(r, x, 300); Sim.blast(r, x, [0, 0.5, 0], 0.5, 'test'); Sim.orderAll(r, x); Sim.run(r, x, 120); } catch (e) { threw = true; } ok(nm + ': runs 7 minutes with damage and repair, no throw, no NaN', !threw && !/NaN|null/.test(JSON.stringify(x).replace(/"target":null/g, ''))); });
}

console.log('\nHand-computed against simulated (tolerance in the fourth column):');
rows.forEach((r) => console.log('  ' + r[0].padEnd(78) + String(r[1]).padStart(9) + String(r[2]).padStart(11) + '  ' + r[3].padEnd(8) + r[4]));
console.log('\n' + (n - bad) + ' of ' + n + ' checks passed' + (bad ? ', ' + bad + ' FAILED' : ''));
process.exit(bad ? 1 : 0);
