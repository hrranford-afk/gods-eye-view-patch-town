#!/usr/bin/env node
/* C03b investigation (read-only, deterministic): two surprising C03 results, measured window by window.
   usage: node tools/c03b-investigate.mjs [brownout|road|all] [--json file]
   For each window it prints per minute: made, sold, lost, income, power cost (and kWh), wages, ingredient purchases, net, and the stock at the window's end,
   plus the power factor, the staff share and whether carts could get through. It changes no simulation rule. */
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const DI = require('../district.js');
const rd = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const D = rd('districts/patch_row_hand.json'), files = {};
[...D.buildings.map((b) => b.recipe), D.home_template.recipe, 'shared/cloud/examples/bakery.stone_deck_oven.json'].forEach((p) => { files[p] = rd(p); });
const sum = (o) => Object.values(o || {}).reduce((s, v) => s + v, 0), r2 = (v) => Math.round(v * 100) / 100, f = (v, n = 1) => (Math.round(v * 10 ** n) / 10 ** n).toFixed(n);
function shopOf(W) { return W.S.b.find((b) => b.kind === 'shop'); }
function grab(W) {
  const b = shopOf(W), m = b.sim, e = W.S.env.b[b.id];
  return { t: W.S.t, income: m.sales.income, sold: m.sales.sold, lost: m.sales.lost, made: m.prod.made, power: m.costs.power, wages: m.costs.wages, ingr: m.costs.ingredients, rep: m.costs.repairs, kwh: m.power.kwh,
    stock: { ...m.stock }, spoiled: sum(m.spoiled), missed: sum(m.ext && m.ext.missed), demand: b.acc.demand, factor: W.S.env.power.factor, carts: e.deliveries, staff: e.staff == null ? 1 : e.staff, status: m.prod.status };
}
function between(a, b) {
  const mins = (b.t - a.t) / 60, g = (k) => (b[k] - a[k]) / mins, cost = (b.power - a.power + b.wages - a.wages + b.ingr - a.ingr + b.rep - a.rep) / mins;
  return { from: a.t, to: b.t, made: g('made'), sold: g('sold'), lost: g('lost'), income: g('income'), power: g('power'), kwh: g('kwh'), wages: g('wages'), ingr: g('ingr'), cost, net: g('income') - cost,
    demand: g('demand'), missed: b.missed - a.missed, spoiled: b.spoiled - a.spoiled, loaf: b.stock.loaf, flour: b.stock.flour, water: b.stock.water, fuel: b.stock.fuel, factor: b.factor, carts: b.carts, staff: b.staff, status: b.status };
}
const HDR = 'window(s)      made  sold  lost  income  power(kWh)  wages  ingr   cost    NET   | loaf flour water fuel | power% staff carts missed';
function line(r, label) { return (label || r.from + '-' + r.to).padEnd(13) + [f(r.made), f(r.sold), f(r.lost), f(r.income), f(r.power) + '(' + f(r.kwh * 60, 2) + ')', f(r.wages), f(r.ingr), f(r.cost), f(r.net)].map((x, i) => x.padStart([6, 6, 6, 8, 12, 7, 6, 7, 7][i])).join('') + '  | ' + [f(r.loaf, 0), f(r.flour, 0), f(r.water, 0), f(r.fuel, 0)].map((x) => x.padStart(4)).join(' ') + ' | ' + (Math.round(r.factor * 100) + '%').padStart(6) + (' ' + Math.round(r.staff * 100) + '%').padStart(6) + (r.carts ? '  open' : '  BLOCKED') + String(r.missed).padStart(6); }
function windows(W, spans, doStep) {   /* spans: [[to-time, optional action(W)]]; returns the list of per-window reports */
  const out = []; let prev = grab(W);
  for (const [to, act] of spans) { if (act) act(W); DI.run(W, to - W.S.t); const g = grab(W); out.push(between(prev, g)); prev = g; }
  return out;
}
const results = {};
const which = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'all';

/* ---------------- 1. the short brownout ---------------- */
if (which === 'all' || which === 'brownout') {
  console.log('==== 1. WHY CAN A SHORT BROWNOUT RAISE PROFIT? (8 homes, grid cut to 60% at t=300 s)\n');
  const mk = () => { const m = DI.make(DI.withHomes(D, 8), files, { seed: D.seed }); if (!m.ok) throw new Error(m.errors.join('; ')); return m.W; };
  const spansTo = (T) => { const s = []; for (let t = 60; t <= T; t += 60) s.push([t]); return s; };
  const base = mk(); const bw = windows(base, spansTo(540));
  const short = mk(); const sw = windows(short, [...spansTo(300), [360, (W) => DI.setScale(W, 0.6, 'cut')], [420], [480, (W) => DI.setScale(W, 1, 'restored')], [540]]);
  console.log('minute-by-minute. BASELINE (no cut) then CUT to 60% for t=300..480 s then restored:'); console.log('  ' + HDR);
  for (let i = 4; i < bw.length; i++) { console.log('  BASE' + line(bw[i], ' ' + bw[i].from + '-' + bw[i].to)); console.log('  CUT ' + line(sw[i], ' ' + sw[i].from + '-' + sw[i].to)); }
  results.brownout_short = { base: bw, cut: sw };
  /* the same cut, over 30 minutes, in 5-minute windows */
  const longBase = mk(), longCut = mk(); const five = []; for (let t = 300; t <= 2400; t += 300) five.push([t]);
  const lb = windows(longBase, [[300], ...five.slice(1)]);
  const lc = windows(longCut, [[300], [301, (W) => DI.setScale(W, 0.6, 'cut'), ], ...five.slice(1)]);
  console.log('\nLONG: cut to 60% from t=300 s and never restored; 5-minute windows (base vs cut):'); console.log('  ' + HDR);
  const lcw = []; { const W = mk(); let prev = null; DI.run(W, 300); DI.setScale(W, 0.6, 'cut'); prev = grab(W); const WB = mk(); DI.run(WB, 300); let prevB = grab(WB);
    for (let t = 600; t <= 3600; t += 300) { DI.run(W, 300); DI.run(WB, 300); const g = grab(W), gb = grab(WB); lcw.push({ cut: between(prev, g), base: between(prevB, gb) }); prev = g; prevB = gb; } }
  lcw.forEach((w) => { console.log('  BASE' + line(w.base, ' ' + w.base.from + '-' + w.base.to)); console.log('  CUT ' + line(w.cut, ' ' + w.cut.from + '-' + w.cut.to)); });
  results.brownout_long = lcw;
  /* how deep must a cut be before sales fall? (steady state, 30 minutes) */
  console.log('\nDEPTH: grid scale held for 40 minutes (after 5 minutes of warm-up), last 10 minutes measured:'); console.log('scale  power%  made  sold  lost  income  wages  ingr   power  NET   loaf-stock');
  const depth = [];
  for (const sc of [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4]) { const W = mk(); DI.run(W, 300); DI.setScale(W, sc, 'depth'); DI.run(W, 1800); const a = grab(W); DI.run(W, 600); const b = grab(W), r = between(a, b); depth.push({ scale: sc, ...r });
    console.log(String(sc).padEnd(7) + (Math.round(r.factor * 100) + '%').padEnd(8) + [r.made, r.sold, r.lost, r.income, r.wages, r.ingr, r.power, r.net].map((x) => f(x).padStart(6)).join(' ') + '   ' + f(r.loaf, 0)); }
  results.brownout_depth = depth;
}

/* ---------------- 2. reopening a road ---------------- */
if (which === 'all' || which === 'road') {
  console.log('\n==== 2. WHY CAN REOPENING A ROAD REDUCE PROFIT? (experiment 3, condition B, road 5,2 blocked 150 to 330 s)\n');
  const mkB = (blocked) => { const E = DI.settlement(D, DI.COND.B); if (!blocked) E.events = E.events.filter((e) => !/road/.test(e.action)); const m = DI.make(E, files, { seed: D.seed }); if (!m.ok) throw new Error(m.errors.join('; ')); return m.W; };
  const spans = [[150], [330], [600]];
  const open = windows(mkB(false), spans), blk = windows(mkB(true), spans);
  console.log('windows: 0-150 (before the block), 150-330 (the block), 330-600 (after).'); console.log('  ' + HDR);
  ['0-150', '150-330', '330-600'].forEach((l, i) => { console.log('  OPEN   ' + line(open[i], l)); console.log('  BLOCKED' + line(blk[i], l)); });
  /* whole run decomposition */
  const whole = (W) => { const a = grab(W); DI.run(W, 600); return between(a, grab(W)); };
  const wo = whole(mkB(false)), wb = whole(mkB(true));
  console.log('\nWHOLE 600 s, per minute:   ' + HDR); console.log('  never blocked  ' + line(wo, 'whole')); console.log('  blocked 180 s  ' + line(wb, 'whole'));
  console.log('  difference (blocked minus open): made ' + f(wb.made - wo.made) + ', sold ' + f(wb.sold - wo.sold) + ', income ' + f(wb.income - wo.income) + ', wages ' + f(wb.wages - wo.wages) + ', ingredients ' + f(wb.ingr - wo.ingr) + ', power ' + f(wb.power - wo.power) + ', NET ' + f(wb.net - wo.net));
  results.road_B = { open, blocked: blk, whole_open: wo, whole_blocked: wb };
  /* the same block in the profitable neighbourhood A */
  const mkA = (blocked) => { const E = DI.settlement(D, DI.COND.A); E.events = E.events.filter((e) => !/supply/.test(e.action)); if (blocked) E.events.push({ t: 150, action: 'block_road', cell: [5, 2] }, { t: 330, action: 'open_road', cell: [5, 2] }); const m = DI.make(E, files, { seed: D.seed }); if (!m.ok) throw new Error(m.errors.join('; ')); return m.W; };
  const ao = whole(mkA(false)), ab = whole(mkA(true));
  console.log('\nSAME BLOCK IN THE PROFITABLE NEIGHBOURHOOD A (grid dip removed to isolate the road):'); console.log('  ' + HDR); console.log('  never blocked  ' + line(ao, 'whole')); console.log('  blocked 180 s  ' + line(ab, 'whole'));
  console.log('  difference: sold ' + f(ab.sold - ao.sold) + ', income ' + f(ab.income - ao.income) + ', wages ' + f(ab.wages - ao.wages) + ', ingredients ' + f(ab.ingr - ao.ingr) + ', NET ' + f(ab.net - ao.net));
  results.road_A = { whole_open: ao, whole_blocked: ab };
  /* long: B blocked for ever against open for ever, 30 minutes */
  const perm = (blocked) => { const E = DI.settlement(D, DI.COND.B); E.events = E.events.filter((e) => !/road|supply/.test(e.action)); const m = DI.make(E, files, { seed: D.seed }); const W = m.W; if (blocked) DI.setRoad(W, [5, 2], false, 'blocked for good'); DI.run(W, 600); const a = grab(W); DI.run(W, 1800); return between(a, grab(W)); };
  const po = perm(false), pb = perm(true);
  console.log('\nLONG, condition B (grid dip removed), 30 minutes after a 10-minute warm-up: road open for ever against blocked for ever:'); console.log('  ' + HDR); console.log('  open           ' + line(po, 'steady')); console.log('  blocked        ' + line(pb, 'steady'));
  results.road_B_long = { open: po, blocked: pb };
}

/* ---------------- 3. the start-up transient: do the C03 headline numbers include a one-off stock-up? ---------------- */
if (which === 'all' || which === 'steady') {
  console.log('\n==== 3. START-UP TRANSIENT CHECK: ingredients are charged when carts DELIVER, so the first minutes include filling the shelves (60 flour, 40 water, 30 fuel)\n');
  const WARM = 1800, M = 600;
  const nets = (E, warm, bakeryOnly) => { const m = DI.make(E, files, { seed: D.seed }); const W = m.W; DI.run(W, warm); const a = grab(W); DI.run(W, M); return between(a, grab(W)); };
  const shift = (E, by) => { E.events = (E.events || []).map((e) => ({ ...e, t: e.t + by })); return E; };
  console.log('EXPERIMENT 1 (more homes): bakery net per minute, C03 method (300 s warm-up) against steady state (1800 s warm-up). Measured 600 s.'); console.log('homes  C03 method   steady   difference   (ingredient purchases per minute: C03 / steady)');
  const e1 = [];
  for (const k of [2, 4, 6, 8, 10]) { const a = nets(DI.withHomes(D, k), 300), b = nets(DI.withHomes(D, k), WARM); e1.push({ homes: k, c03: a.net, steady: b.net, ingr_c03: a.ingr, ingr_steady: b.ingr }); console.log(String(k).padEnd(7) + f(a.net).padStart(9) + f(b.net).padStart(10) + f(b.net - a.net).padStart(12) + '       ' + f(a.ingr) + ' / ' + f(b.ingr)); }
  results.steady_exp1 = e1;
  console.log('\nEXPERIMENT 2 (upgrades), net per minute, steady state (1800 s warm-up) against the C03 method:'); console.log('homes  upgrade            C03 gain  steady gain');
  const e2 = [];
  for (const k of [2, 8]) {
    const mkE = (sc) => { const E = DI.withHomes(D, k); if (sc) E.buildings.find((b) => b.kind === 'shop').sidecars = [sc]; return E; };
    const base3 = nets(mkE(null), 300), baseS = nets(mkE(null), WARM);
    for (const [nm, sc] of [['stone deck oven', 'shared/cloud/examples/bakery.stone_deck_oven.json'], ['cool store room', 'shared/cloud/examples/bakery.cool_store_room.json']]) {
      files[sc] = files[sc] || rd(sc); const u3 = nets(mkE(sc), 300), uS = nets(mkE(sc), WARM); e2.push({ homes: k, upgrade: nm, gain_c03: u3.net - base3.net, gain_steady: uS.net - baseS.net });
      console.log(String(k).padEnd(7) + nm.padEnd(19) + f(u3.net - base3.net).padStart(8) + f(uS.net - baseS.net).padStart(12)); }
  }
  results.steady_exp2 = e2;
  console.log('\nEXPERIMENT 3 (two bakeries): bakery net per minute, C03 method (no warm-up) against steady state (events shifted after an 1800 s warm-up).');
  const e3 = {};
  for (const c of ['A', 'B']) { const a = nets(DI.settlement(D, DI.COND[c]), 0); const b = nets(shift(DI.settlement(D, DI.COND[c]), WARM), WARM); e3[c] = { c03: a.net, steady: b.net, demand: b.demand, sold: b.sold, wages: b.wages, ingr_c03: a.ingr, ingr_steady: b.ingr };
    console.log('  condition ' + c + ': C03 net ' + f(a.net) + '  steady net ' + f(b.net) + '   (ingredients per minute ' + f(a.ingr) + ' against ' + f(b.ingr) + ')'); }
  results.steady_exp3 = e3;
  /* the road question again, at steady state: block 150 s after a 1800 s warm-up, measure the next 900 s (the block plus the recovery) */
  console.log('\nROAD AT STEADY STATE (grid dip removed): the same 180 s block in B and in A, measured over the 900 s that include the block and the recovery, after a 1800 s warm-up.');
  const road = {};
  for (const c of ['A', 'B']) {
    const mk = (blocked) => { const E = DI.settlement(D, DI.COND[c]); E.events = E.events.filter((e) => !/road|supply/.test(e.action)); if (blocked) E.events.push({ t: WARM + 100, action: 'block_road', cell: [5, 2] }, { t: WARM + 280, action: 'open_road', cell: [5, 2] }); const W = DI.make(E, files, { seed: D.seed }).W; DI.run(W, WARM); const a = grab(W); DI.run(W, 900); return between(a, grab(W)); };
    const o = mk(false), b = mk(true); road[c] = { open: o, blocked: b };
    console.log('  condition ' + c + ' (' + (c === 'A' ? 'profitable' : 'break-even') + '): open net ' + f(o.net, 2) + ' | blocked net ' + f(b.net, 2) + ' | difference ' + f(b.net - o.net, 2) + '   (income ' + f(b.income - o.income, 2) + ', wages ' + f(b.wages - o.wages, 2) + ', ingredients ' + f(b.ingr - o.ingr, 2) + ', power ' + f(b.power - o.power, 2) + ')');
  }
  results.road_steady = road;
}
const ji = process.argv.indexOf('--json'); if (ji > 0) fs.writeFileSync(process.argv[ji + 1], JSON.stringify(results, null, 1) + '\n');
