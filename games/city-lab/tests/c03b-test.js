/* C03b regression tests (headless, no browser): what was established about the two surprising C03 results. They describe behaviour; they do not force profit.
   Run from games/city-lab: node tests/c03b-test.js . Everything is computed live from the simulation; the only fixed numbers are tolerances.
   Established: (1) the cost accounting has no arithmetic error; (2) a SHORT brownout raises profit only by the electricity not spent while stock covers sales: a temporary,
   correct inventory effect; (3) a LONG or DEEP brownout loses money, monotonically; (4) blocking a road stops wages (places unfilled) and ingredient purchases: an interaction of rules,
   harmless to a break-even shop, harmful to a profitable one; (5) "reopening a road lowers profit" was largely a start-up stocking transient in the C03 measuring method. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DI = require(path.join(ROOT, 'district.js'));
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const D = rd('districts/patch_row_hand.json'), files = {};
[...D.buildings.map((b) => b.recipe), D.home_template.recipe].forEach((p) => { files[p] = rd(p); });
let n = 0, bad = 0; const ok = (name, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + name + (!c && x !== undefined ? '  -> ' + JSON.stringify(x) : '')); };
const sum = (o) => Object.values(o || {}).reduce((s, v) => s + v, 0);
const near = (a, b, t) => Math.abs(a - b) <= t;
const mk = (E) => { const m = DI.make(E, files, { seed: D.seed }); if (!m.ok) throw new Error(m.errors.join('; ')); return m.W; };
const shop = (W) => W.S.b.find((b) => b.kind === 'shop');
function grab(W) { const b = shop(W), m = b.sim, e = W.S.env.b[b.id]; return { t: W.S.t, income: m.sales.income, sold: m.sales.sold, lost: m.sales.lost, made: m.prod.made, power: m.costs.power, wages: m.costs.wages, ingr: m.costs.ingredients, kwh: m.power.kwh, loaf: m.stock.loaf, missed: sum(m.ext && m.ext.missed), factor: W.S.env.power.factor, staff: e.staff == null ? 1 : e.staff }; }
function win(a, b) { const mins = (b.t - a.t) / 60, g = (k) => (b[k] - a[k]) / mins, cost = (b.power - a.power + b.wages - a.wages + b.ingr - a.ingr) / mins; return { made: g('made'), sold: g('sold'), lost: g('lost'), income: g('income'), power: g('power'), wages: g('wages'), ingr: g('ingr'), cost, net: g('income') - cost, loaf: b.loaf, missed: b.missed - a.missed, factor: b.factor, staff: b.staff }; }
const run = (W, s) => { const a = grab(W); DI.run(W, s); return win(a, grab(W)); };
const homes8 = () => DI.withHomes(D, 8);

/* ---------- 1. accounting identities: no calculation error ---------- */
{
  const W = mk(homes8()), b = shop(W), m = b.sim, R = W.R[b.id], Y = R.systems; const start = { ...Y.start_stock }; DI.run(W, 1500);
  const price = Y.costs.ingredient_prices, batchesStarted = m.prod.batches + (m.prod.running ? 1 : 0);
  let expect = 0; Object.keys(price).forEach((k) => { const consumed = batchesStarted * (Y.production.inputs[k] || 0), dstock = m.stock[k] - (start[k] || 0); expect += price[k] * (dstock + consumed + (m.spoiled[k] || 0)); });
  ok('ingredient cost = price x (change in stock + used + spoiled), item by item (purchases are cash, charged at delivery)', near(m.costs.ingredients, expect, 0.01), [m.costs.ingredients, expect]);
  ok('electricity cost = kWh drawn x price per kWh (the kWh counter is rounded each tick, so allow 0.5 percent: the real difference is about 0.1 percent, immaterial)', near(m.costs.power, m.power.kwh * Y.costs.power_per_kwh, 0.005 * m.costs.power), [m.costs.power, m.power.kwh * Y.costs.power_per_kwh]);
  const wagePerMin = Y.jobs.reduce((s, j) => s + j.count, 0) * Y.costs.wage_per_worker_per_minute;
  ok('wages = filled places x wage per minute x time (here all 3 places filled for 1500 s)', near(m.costs.wages, wagePerMin * 1500 / 60, 0.01), [m.costs.wages, wagePerMin * 25]);
  ok('income = loaves sold x price', near(m.sales.income, m.sales.sold * Y.sales.price, 1e-6));
}

/* ---------- 2. the SHORT brownout: where the profit comes from ---------- */
const CUT = 350;   /* a multiple of the 70 s delivery cycle, so windows of 140 s hold exactly two cycles (no lumpiness) */
let base, cut;
{
  const A = mk(homes8()), B = mk(homes8()); DI.run(A, CUT); DI.run(B, CUT); DI.setScale(B, 0.6, 'cut');
  base = run(A, 140); cut = run(B, 140);
  ok('short cut: baking falls roughly in proportion to power (made per minute at about the power factor)', near(cut.made / base.made, cut.factor / base.factor, 0.06), [cut.made, base.made, cut.factor, base.factor]);
  ok('short cut: SALES DO NOT CHANGE (the shelf covers them) and no customer is lost', near(cut.sold, base.sold, 0.01) && cut.lost === 0, [cut.sold, base.sold, cut.lost]);
  ok('short cut: loaves in stock fall (the buffer is being spent)', cut.loaf < base.loaf - 8, [cut.loaf, base.loaf]);
  ok('short cut: ingredient purchases are identical over whole delivery cycles, wages identical', near(cut.ingr, base.ingr, 0.01) && near(cut.wages, base.wages, 1e-9), [cut.ingr, base.ingr]);
  ok('short cut: electricity cost falls (a slow oven bakes less in the same time)', cut.power < base.power - 0.5, [cut.power, base.power]);
  ok('short cut: net rises by EXACTLY the electricity saved (the whole of the "surprise")', near(cut.net - base.net, base.power - cut.power, 0.01) && cut.net > base.net, [cut.net - base.net, base.power - cut.power]);
}

/* ---------- 3. the LONG and DEEP brownout: the effect is temporary ---------- */
{
  const A = mk(homes8()), B = mk(homes8()); DI.run(A, 300); DI.run(B, 300); DI.setScale(B, 0.6, 'cut');
  const w = []; for (let i = 0; i < 8; i++) w.push({ base: run(A, 300), cut: run(B, 300) });
  ok('long cut (60%): in the first 5 minutes the shop already starts to lose customers as the shelf empties', w[0].cut.lost > 0 && w[0].cut.sold < w[0].base.sold, [w[0].cut]);
  ok('long cut: once the shelf is empty (loaf stock under 1) sales stay below baseline', w.slice(2).every((x) => x.cut.loaf < 12 && x.cut.sold < x.base.sold - 3), w.map((x) => [x.cut.loaf, x.cut.sold, x.base.sold]));
  ok('long cut: from the third 5-minute window the net is LOWER than baseline by more than 10 a minute, every window', w.slice(2).every((x) => x.cut.net < x.base.net - 10), w.map((x) => [x.cut.net, x.base.net]));
  ok('long cut: costs fall (less baked, less electricity, fewer ingredients) but revenue falls by more', w.slice(2).every((x) => x.cut.cost < x.base.cost && x.base.income - x.cut.income > x.base.cost - x.cut.cost), 'costs and income');
  const depth = []; for (const sc of [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4]) { const W = mk(homes8()); DI.run(W, 300); DI.setScale(W, sc, 'depth'); DI.run(W, 1800); depth.push({ sc, ...run(W, 600) }); }
  ok('depth: steady-state net NEVER rises as the grid is cut deeper (non-increasing over 100, 90, ... 40 percent)', depth.every((d, i) => i === 0 || d.net <= depth[i - 1].net + 0.01), depth.map((d) => [d.sc, d.net]));
  ok('depth: a shallow cut costs nothing: baking capacity still exceeds demand, so 90 percent equals 100 percent', near(depth[1].net, depth[0].net, 0.01) && near(depth[1].sold, depth[0].sold, 0.01));
  ok('depth: sales fall once baking capacity drops below demand (at 70 percent of the grid)', depth[3].sold < depth[0].sold - 2 && depth[3].lost > 1, [depth[3], depth[0]]);
}

/* ---------- 4. the blocked road: what stops, what is saved ---------- */
const eventsB = (blocked, extra) => { const E = DI.settlement(D, DI.COND.B); E.events = E.events.filter((e) => !/road|supply/.test(e.action)); if (blocked) E.events.push({ t: 100 + (extra || 0), action: 'block_road', cell: [5, 2] }, { t: 280 + (extra || 0), action: 'open_road', cell: [5, 2] }); return E; };
{
  const W = mk(eventsB(true)); DI.run(W, 100); const a = grab(W); DI.run(W, 100); const b = grab(W); const during = win(a, b);   /* 20 s into the block to 120 s... measure well inside the block */
  const W2 = mk(eventsB(true)); DI.run(W2, 110); const a2 = grab(W2); DI.run(W2, 150); const mid = win(a2, grab(W2));
  ok('during the block: the staff share is 0 (nobody can commute), so no wages are paid', mid.staff === 0 && near(mid.wages, 0, 1e-9), mid);
  ok('during the block: no sales, no baking, no electricity', mid.sold === 0 && mid.made === 0 && near(mid.power, 0, 1e-9), mid);
  ok('during the block: carts miss their drops, so no ingredients are bought either (cash accounting)', near(mid.ingr, 0, 1e-9) && grab(W2).missed >= 3, [mid.ingr, grab(W2).missed]);
  const O = mk(eventsB(false)), K = mk(eventsB(true, 1800)); DI.run(O, 1800); DI.run(K, 1800); const oo = run(O, 600), kk = run(K, 600);
  ok('a 180 s block saves exactly 3 workers x 5 x 3 minutes = 45 in wages (over the run)', near((oo.wages - kk.wages) * 10, 45, 0.5), [(oo.wages - kk.wages) * 10]);
}

/* ---------- 5. the surprise was largely a start-up transient of the C03 measuring method ---------- */
{
  const first = (() => { const W = mk(homes8()); return run(W, 600); })(), steady = (() => { const W = mk(homes8()); DI.run(W, 1800); return run(W, 600); })();
  ok('ingredient purchases in the first 10 minutes are at least 1.5 times the steady rate (the shelves are being filled)', first.ingr > 1.5 * steady.ingr, [first.ingr, steady.ingr]);
  const S = (c, blocked) => { const E = DI.settlement(D, DI.COND[c]); E.events = E.events.filter((e) => !/road|supply/.test(e.action)); if (blocked) E.events.push({ t: 1800 + 100, action: 'block_road', cell: [5, 2] }, { t: 1800 + 280, action: 'open_road', cell: [5, 2] }); const W = mk(E); DI.run(W, 1800); return run(W, 900); };
  const bo = S('B', false), bb = S('B', true), ao = S('A', false), ab = S('A', true);
  ok('steady state: bakery B is break-even (net within 1 of zero), not the -15.7 of the C03 experiment', Math.abs(bo.net) < 1, bo.net);
  ok('steady state: a 180 s block in the PROFITABLE neighbourhood A lowers its net clearly (by more than 3 a minute over 15 minutes)', ab.net < ao.net - 3, [ab.net, ao.net]);
  ok('steady state: the same block in break-even B changes its net by less than 1 a minute: wages saved cancel sales lost', Math.abs(bb.net - bo.net) < 1, [bb.net, bo.net]);
  ok('steady state: reopening a road does NOT raise B\'s profit: the "surprise" is gone once the start-up purchases are over (difference is zero or slightly negative)', bb.net <= bo.net + 0.05, [bb.net, bo.net]);
  const c03 = (() => { const W = mk(DI.settlement(D, DI.COND.B)); return run(W, 600); })();
  ok('the C03 experiment 3 headline for B (no warm-up) is more than 10 a minute worse than B\'s steady state', bo.net - c03.net > 10, [c03.net, bo.net]);
}

/* ---------- 6. determinism ---------- */
{
  const t = () => { const W = mk(homes8()); DI.run(W, 300); DI.setScale(W, 0.6, 'cut'); DI.run(W, 900); return DI.hash(W); };
  ok('the brownout scenario is deterministic (same state hash twice)', t() === t());
}
console.log('\n' + (bad ? bad + ' FAILED of ' + n : n + ' of ' + n + ' checks passed')); process.exit(bad ? 1 : 0);
