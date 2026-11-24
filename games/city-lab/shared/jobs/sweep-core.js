/* Job type SWEEP (v0): a deterministic parameter sweep of the City Lab district. Pure JS, no DOM, no network, no randomness, no generated code: it only calls the existing
   district code (district.js, sim.js, validate.js). The SAME file runs in Node (the cloud, to make the expected figures) and in a browser (a robot browser on any machine,
   or an iPad). A task is DATA: {id, district, seed, warm_s, measure_s, grid:{homes:[..], loaf_rate:[..], supply_kw:[..]}}. The result is a table of rows plus a result hash.
   Anything outside the task's fields is ignored; the task is never evaluated. Same task + same code = byte-identical result on every machine. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../district.js'), require('../../validate.js'));
  else root.SweepCore = factory(root.CityDistrict, root.CityValidate);
})(typeof self !== 'undefined' ? self : this, function (DI, VAL) {
  'use strict';
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function r6(v) { return Math.round(v * 1e6) / 1e6; }
  function fnv(s) { var h = 0x811c9dc5, i; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return ('00000000' + (h >>> 0).toString(16)).slice(-8); }
  function sum(o) { var s = 0; Object.keys(o || {}).forEach(function (k) { s += o[k]; }); return s; }
  function shopOf(W) { return W.S.b.filter(function (b) { return b.kind === 'shop'; })[0]; }
  function grab(W) { var b = shopOf(W), m = b.sim; return { t: W.S.t, income: m.sales.income, sold: m.sales.sold, made: m.prod.made, power: m.costs.power, wages: m.costs.wages, ingr: m.costs.ingredients, demand: b.acc.demand }; }
  function checkInvariants(W, row) {   /* things that must always hold; any breach is reported, never hidden */
    var bad = [], b = shopOf(W), m = b.sim;
    Object.keys(m.stock).forEach(function (k) { if (!(m.stock[k] >= -1e-9)) bad.push('negative stock ' + k); if (m.stock[k] > W.R[b.id].systems.storage[k] + 1e-6) bad.push('stock over capacity ' + k); });
    Object.keys(row).forEach(function (k) { if (typeof row[k] === 'number' && !isFinite(row[k])) bad.push('not finite: ' + k); });
    if (W.S.env.power.factor < 0 || W.S.env.power.factor > 1 + 1e-9) bad.push('power factor out of range');
    return bad;
  }
  function one(task, data, homes, loaf, supply) {
    var D = clone(data.districts[task.district]);
    var E = DI.withHomes(D, homes); E.coefficients.per_resident_per_min.loaf = loaf; E.power.supply_kw = supply;
    var mk = DI.make(E, data.files, { seed: task.seed });
    if (!mk.ok) return { homes: homes, loaf_rate: loaf, supply_kw: supply, error: mk.errors.join('; ') };
    var W = mk.W; DI.run(W, task.warm_s); var a = grab(W); DI.run(W, task.measure_s); var z = grab(W), mins = (z.t - a.t) / 60;
    var cost = (z.power - a.power + z.wages - a.wages + z.ingr - a.ingr) / mins;
    var row = { homes: homes, loaf_rate: loaf, supply_kw: supply, demand_pm: r6((z.demand - a.demand) / mins), sold_pm: r6((z.sold - a.sold) / mins), made_pm: r6((z.made - a.made) / mins), income_pm: r6((z.income - a.income) / mins),
      cost_pm: r6(cost), net_pm: r6((z.income - a.income) / mins - cost), power_factor: r6(W.S.env.power.factor), state_hash: DI.hash(W) };
    var bad = checkInvariants(W, row); if (bad.length) row.invariant_breach = bad;
    return row;
  }
  /* the canary: the first cell is run twice and must be identical (determinism on THIS machine); then the full grid */
  function run(task, data, progress) {
    var cells = [], g = task.grid; g.homes.forEach(function (h) { g.loaf_rate.forEach(function (l) { g.supply_kw.forEach(function (s) { cells.push([h, l, s]); }); }); });
    var c1 = one(task, data, cells[0][0], cells[0][1], cells[0][2]), c2 = one(task, data, cells[0][0], cells[0][1], cells[0][2]);
    var canary = JSON.stringify(c1) === JSON.stringify(c2);
    var rows = [], breaches = 0, i;
    for (i = 0; i < cells.length; i++) { var r = one(task, data, cells[i][0], cells[i][1], cells[i][2]); if (r.invariant_breach || r.error) breaches++; rows.push(r); if (progress && i % 10 === 0) progress(i + 1, cells.length); }
    var text = JSON.stringify(rows);
    return { job: 'sweep', task_id: task.id, cells: rows.length, canary_identical: canary, rows_with_breach_or_error: breaches, result_hash: fnv(text), rows: rows };
  }
  return { run: run, one: one, fnv: fnv };
});
