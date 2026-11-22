/* City Lab: read-only cost comparisons and the C06a experiments (E4, E5). Pure JS, deterministic, no DOM. Both the page and the tests call these same functions, so the figures
   in the page equal the headless figures exactly. Every measurement is at STEADY STATE (C03b rule): a warm-up of 1800 s, then 2100 s measured (35 minutes: 30 delivery cycles of
   the 70 s carts and 21 of the 100 s carts, so every window holds whole delivery cycles). Nothing here touches a live world: each case builds its own fresh world from the files. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./district.js'), require('./infra.js'));
  else root.CityInfraExp = factory(root.CityDistrict, root.CityInfra);
})(typeof self !== 'undefined' ? self : this, function (DI, INFRA) {
  'use strict';
  var WARM = 1800, MEASURE = 2100;
  function r6(v) { return Math.round(v * 1e6) / 1e6; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  function pc(v) { return Math.round(v * 100); }

  /* the configuration of a live world, as plain data (what the comparison rebuilds from: homes, road states, upgrades, cable edits, generator scale) */
  function configOf(W) {
    var S = W.S, sc = {}; S.b.forEach(function (b) { if (b.sidecars.length) sc[b.id] = b.sidecars.slice(); });
    return { homes: S.b.filter(function (b) { return b.kind === 'home'; }).length, roads: clone(S.roads), sidecars: sc, caps: clone(S.infra ? S.infra.caps : {}), cut: clone(S.infra ? S.infra.cut : {}), scale: S.scale };
  }
  function freeCell(D, taken) {   /* the first free plot (not a road, a building or a home plot), scanning the bottom row first, left to right: deterministic */
    var used = {}; D.roads.forEach(function (r) { used[r.cell.join(',')] = 1; }); D.buildings.forEach(function (b) { used[b.cell.join(',')] = 1; }); D.home_slots.forEach(function (c) { used[c.join(',')] = 1; }); (taken || []).forEach(function (c) { used[c.join(',')] = 1; });
    for (var r = D.grid.rows - 1; r >= 0; r--) for (var c = 0; c < D.grid.cols; c++) if (!used[c + ',' + r]) return [c, r];
    return null;
  }
  function liveCap(I, cfg, id) { var c = null; I.cables.forEach(function (x) { if (x.id === id) c = x; }); return c ? (cfg.caps && cfg.caps[id] != null ? cfg.caps[id] : c.capacity_kw) : null; }

  /* what an option costs. Costs come from the infra file and scale LINEARLY with size (per kW of generator; per kW of extra cable capacity): an illustrative rule, stated on the page. */
  function option(D, I, cfg, opt) {
    var m = { type: opt.type, build_cost: 0, upkeep_pm: 0, text: '', error: null }, big = I.sources.slice().sort(function (a, b) { return b.kw - a.kw; })[0];
    if (opt.type === 'generator') {
      var kw = opt.kw; if (!(kw > 0) || kw > 200) { m.error = 'a generator must give between 0.1 and 200 kW'; return m; }
      var cell = freeCell(D, []); if (!cell) { m.error = 'no free plot for another generator shed'; return m; }
      m.build_cost = r2(big.build_cost * kw / big.kw); m.upkeep_pm = r2(big.upkeep_per_min * kw / big.kw); m.cell = cell; m.kw = kw;
      m.text = 'Add a ' + f1(kw) + ' kW generator (a second shed at ' + cell.join(',') + ')';
    } else if (opt.type === 'cable') {
      var c = null; I.cables.forEach(function (x) { if (x.id === opt.cable) c = x; }); if (!c) { m.error = 'no such cable'; return m; }
      var cap = liveCap(I, cfg, c.id); if (!(opt.to_kw > cap)) { m.error = 'the new capacity must be larger than ' + f1(cap) + ' kW'; return m; } if (opt.to_kw > 500) { m.error = 'capacity at most 500 kW'; return m; }
      var share = (opt.to_kw - cap) / cap; m.build_cost = r2(c.build_cost * share); m.upkeep_pm = r2(c.upkeep_per_min * share); m.cable = c.id; m.name = c.name; m.from_kw = cap; m.to_kw = opt.to_kw;
      m.text = 'Upgrade ' + c.name + ' from ' + f1(cap) + ' to ' + f1(opt.to_kw) + ' kW';
    } else m.error = 'unknown option';
    return m;
  }
  /* the plain data of one case: a district copy, an infra copy, the live edits */
  function prepare(D, I, cfg, opt) {
    var E = DI.withHomes(D, cfg.homes), I2 = clone(I), caps = clone(cfg.caps || {}), meta = null;
    E.roads.forEach(function (r) { var k = r.cell.join(','); if (cfg.roads && cfg.roads[k] != null) r.open = cfg.roads[k] === 1; });
    E.buildings.forEach(function (b) { if (cfg.sidecars && cfg.sidecars[b.id]) b.sidecars = cfg.sidecars[b.id].slice(); });
    if (opt) {
      meta = option(D, I, cfg, opt); if (meta.error) return { error: meta.error, meta: meta };
      if (opt.type === 'generator') {
        var big = I.sources.slice().sort(function (a, b) { return b.kw - a.kw; })[0], bb = D.buildings.filter(function (b) { return b.id === big.building; })[0], n = I.sources.length + 1, id = 'gen_' + n;
        while (E.buildings.some(function (b) { return b.id === id; })) id += 'x';
        E.buildings.push({ id: id, recipe: bb.recipe, cell: meta.cell.slice(), kind: 'shed', sidecars: [] });
        I2.sources.push({ id: 'gen_new', building: id, kw: opt.kw, build_cost: meta.build_cost, upkeep_per_min: meta.upkeep_pm });
      } else caps[opt.cable] = opt.to_kw;
    }
    return { E: E, I2: I2, caps: caps, cut: clone(cfg.cut || {}), scale: cfg.scale == null ? 1 : cfg.scale, meta: meta, seed: D.seed };
  }
  function steady(files, P) {
    var rep = DI.run1(P.E, files, { seed: P.seed, infra: P.I2, warm: WARM, measure: MEASURE, before: function (W) { W.S.infra.caps = clone(P.caps); W.S.infra.cut = clone(P.cut); W.S.scale = P.scale; W.S.env = DI.refresh(W); } });
    var W = rep.world, env = W.S.env, ia = env.infra, shops = {}, fac = {}, edges = {}, deliveredKw = 0;
    W.S.b.forEach(function (b) {
      fac[b.id] = ia.factor[b.id]; deliveredKw += ia.delivered[b.id] || 0;
      var r = rep.b[b.id]; if (r && b.kind !== 'home') shops[b.id] = { net_pm: r6(r.net_pm), income_pm: r6(r.income_pm), cost_pm: r6(r.cost_pm), sold_pm: r6(r.sold_pm), lost_pm: r6(r.lost_pm), made_pm: r6(r.made_pm), demand_pm: r6(r.demand_pm), brown_share: r6(r.brown_share) };
    });
    ia.edges.forEach(function (e) { if (!e.synthesized) edges[e.id] = { cap: e.cap, want: e.want, flow: e.flow, state: e.state }; });
    return { net_pm: r6(rep.d.net_pm), income_pm: r6(rep.d.income_pm), cost_pm: r6(rep.d.cost_pm), source_kw: ia.source_kw, wanted_kw: ia.root_want, delivered_kw: r6(deliveredKw), min_factor: ia.min_factor, factor: fac, edges: edges, shops: shops, hash: rep.hash };
  }
  /* the read-only comparison: baseline against baseline-plus-option, same code, fresh worlds. cfg comes from configOf(live world) or is given. Never touches a live world. */
  function compare(D, files, I, cfg, opt) {
    var P0 = prepare(D, I, cfg, null), P1 = prepare(D, I, cfg, opt);
    if (P1.error) return { ok: false, error: P1.error };
    var a = steady(files, P0), b = steady(files, P1), m = P1.meta, gain = r6(b.net_pm - a.net_pm), net = r6(gain - m.upkeep_pm);
    return { ok: true, option: opt, text: m.text, homes: cfg.homes, warm_s: WARM, measure_s: MEASURE, build_cost: m.build_cost, upkeep_pm: m.upkeep_pm, before: a, after: b,
      gain_gross_pm: gain, gain_net_pm: net, payback_min: net > 0.005 ? r6(m.build_cost / net) : null, delivered_gain_kw: r6(b.delivered_kw - a.delivered_kw) };
  }
  function sayCompare(c, labels) {
    labels = labels || {};
    if (!c.ok) return [c.error];
    var out = [], lab = function (id) { return labels[id] || id; }, ch = [];
    Object.keys(c.after.factor).forEach(function (id) { var x = c.before.factor[id], y = c.after.factor[id]; if (x !== undefined && Math.abs(x - y) >= 0.005) ch.push(lab(id) + ' ' + pc(x) + '% to ' + pc(y) + '%'); });
    out.push(c.text + ': costs ' + f2(c.build_cost) + ' to build and ' + f2(c.upkeep_pm) + ' a minute to keep (linear in size; illustrative).');
    out.push('Steady state (' + c.warm_s + ' s warm-up, ' + c.measure_s / 60 + ' minutes measured, ' + c.homes + ' homes): district net per minute ' + f2(c.before.net_pm) + ' to ' + f2(c.after.net_pm) + ' (' + (c.gain_gross_pm >= 0 ? '+' : '') + f2(c.gain_gross_pm) + ' before upkeep, ' + (c.gain_net_pm >= 0 ? '+' : '') + f2(c.gain_net_pm) + ' after upkeep).');
    out.push(ch.length ? 'Power shares that change: ' + ch.join(', ') + '; delivered power ' + (c.delivered_gain_kw >= 0 ? '+' : '') + f2(c.delivered_gain_kw) + ' kW.' : 'No building gets a different share of power.');
    out.push(c.payback_min == null ? 'Payback: never (it does not earn more than it costs to keep).' : 'Payback: ' + f1(c.payback_min) + ' minutes of simulated time.');
    return out;
  }

  /* ---- E4: does ONE MORE generator pay for itself? at 10 homes and at 4, on the shipped network and on shorter-sourced variants (sensitivity, not the shipped data) ---- */
  function withSourceKw(I, kw) { var J = clone(I), big = J.sources.slice().sort(function (a, b) { return b.kw - a.kw; })[0], f = kw / big.kw; big.build_cost = r2(big.build_cost * f); big.upkeep_per_min = r2(big.upkeep_per_min * f); big.kw = kw; return J; }
  function e4(D, files, I, o) {
    o = o || {}; var out = { id: 'E4', title: 'Does one more generator pay for itself?', warm_s: WARM, measure_s: MEASURE, add_kw: o.add_kw || 3, rows: [] };
    (o.cases || [[10, null], [4, null], [8, null], [10, 12], [10, 9], [4, 9]]).forEach(function (cs) {
      var J = cs[1] == null ? I : withSourceKw(I, cs[1]), cfg = { homes: cs[0], roads: null, sidecars: null, caps: {}, cut: {}, scale: 1 };
      var c = compare(D, files, J, cfg, { type: 'generator', kw: out.add_kw });
      out.rows.push({ homes: cs[0], base_source_kw: J.sources[0].kw, shipped: cs[1] == null, build_cost: c.build_cost, upkeep_pm: c.upkeep_pm, net_before_pm: c.before.net_pm, net_after_pm: c.after.net_pm, gain_gross_pm: c.gain_gross_pm, gain_net_pm: c.gain_net_pm, payback_min: c.payback_min,
        wanted_kw: c.before.wanted_kw, source_before_kw: c.before.source_kw, source_after_kw: c.after.source_kw, delivered_gain_kw: c.delivered_gain_kw, min_factor_before: c.before.min_factor, min_factor_after: c.after.min_factor, hash_before: c.before.hash, hash_after: c.after.hash });
    });
    return out;
  }
  function sayE4(r) {
    var out = [], R = r.rows, ship = R.filter(function (x) { return x.shipped; });
    ship.forEach(function (x) {
      out.push('Shipped network, ' + x.homes + ' homes: the generators give ' + f1(x.source_before_kw) + ' kW and the cables ask for ' + f1(x.wanted_kw) + ' kW, so the source is ' + (x.source_before_kw >= x.wanted_kw - 1e-9 ? 'NOT short' : 'short') + '. One more ' + r.add_kw + ' kW generator costs ' + f2(x.build_cost) + ' and ' + f2(x.upkeep_pm) + ' a minute; district net per minute ' + f2(x.net_before_pm) + ' to ' + f2(x.net_after_pm) + ' (' + (x.gain_net_pm >= 0 ? '+' : '') + f2(x.gain_net_pm) + ' after upkeep). ' + (x.payback_min == null ? 'Answer: NO, it never pays back.' : 'Payback ' + f1(x.payback_min) + ' minutes.'));
    });
    R.filter(function (x) { return !x.shipped; }).forEach(function (x) {
      out.push('Sensitivity (a smaller first generator, ' + f1(x.base_source_kw) + ' kW), ' + x.homes + ' homes: the lowest power share is ' + pc(x.min_factor_before) + '% before and ' + pc(x.min_factor_after) + '% after; net per minute ' + f2(x.net_before_pm) + ' to ' + f2(x.net_after_pm) + ', ' + (x.gain_net_pm >= 0 ? '+' : '') + f2(x.gain_net_pm) + ' after the ' + f2(x.upkeep_pm) + ' upkeep. ' + (x.payback_min == null ? 'NO.' : 'Pays back in ' + f1(x.payback_min) + ' minutes.'));
    });
    return out;
  }

  /* ---- E5: an overloaded cable dims only its own street ---- */
  function e5(D, files, I, o) {
    o = o || {}; var homes = o.homes || 8, cfg = function (caps) { return { homes: homes, roads: null, sidecars: null, caps: caps || {}, cut: {}, scale: 1 }; }, out = { id: 'E5', title: 'An overloaded cable dims only its own street', homes: homes, warm_s: WARM, measure_s: MEASURE, cases: {} };
    var street = function (r) { var homesF = [], mainF = []; Object.keys(r.factor).forEach(function (id) { if (/^home_/.test(id)) homesF.push(r.factor[id]); else if (id !== 'gen_1') mainF.push(r.factor[id]); }); return { homes_min: Math.min.apply(null, homesF), main_min: Math.min.apply(null, mainF) }; };
    function one(name, P) { var r = steady(files, P); out.cases[name] = { net_pm: r.net_pm, delivered_kw: r.delivered_kw, wanted_kw: r.wanted_kw, street: street(r), factor: r.factor, edges: r.edges, shops: r.shops, hash: r.hash }; return r; }
    var base = prepare(D, I, cfg(), null); one('as_built', base);
    var need = r6(homes * (D.power.home_base_kw + D.power.per_resident_kw * D.home_template.capacity));
    var up = prepare(D, I, cfg(), { type: 'cable', cable: 'homes_branch', to_kw: need }); one('homes_cable_upgraded', up);
    out.upgrade = { cable: 'homes_branch', to_kw: need, build_cost: up.meta.build_cost, upkeep_pm: up.meta.upkeep_pm };
    var tight = prepare(D, I, cfg({ main_feeder: 8, homes_branch: need }), null); one('main_feeder_overloaded', tight);   /* the other street: the main feeder cut to 8 kW, homes cable large enough */
    out.main_feeder_kw = 8;
    var a = out.cases.as_built, b = out.cases.homes_cable_upgraded, c = out.cases.main_feeder_overloaded;
    out.money_change_pm = { homes_cable_upgrade: r6(b.net_pm - a.net_pm), main_feeder_overload: r6(c.net_pm - b.net_pm) };
    out.upgrade.payback_min = (b.net_pm - a.net_pm - up.meta.upkeep_pm) > 0.005 ? r6(up.meta.build_cost / (b.net_pm - a.net_pm - up.meta.upkeep_pm)) : null;
    return out;
  }
  function sayE5(r) {
    var a = r.cases.as_built, b = r.cases.homes_cable_upgraded, c = r.cases.main_feeder_overloaded, out = [];
    out.push('As built, ' + r.homes + ' homes: the homes cable wants ' + f1(a.edges.homes_branch.want) + ' kW and carries ' + f1(a.edges.homes_branch.cap) + ' kW (' + a.edges.homes_branch.state + '). Homes get ' + pc(a.street.homes_min) + '% of their power; the main feeder wants ' + f1(a.edges.main_feeder.want) + ' of ' + f1(a.edges.main_feeder.cap) + ' kW (' + a.edges.main_feeder.state + ') and every building on it gets ' + pc(a.street.main_min) + '%. Only the homes street is dim.');
    out.push('Upgrade the homes cable to ' + f1(r.upgrade.to_kw) + ' kW: it costs ' + f2(r.upgrade.build_cost) + ' and ' + f2(r.upgrade.upkeep_pm) + ' a minute (linear rule, illustrative). Homes go to ' + pc(b.street.homes_min) + '%, delivered power ' + f2(a.delivered_kw) + ' to ' + f2(b.delivered_kw) + ' kW, district net per minute ' + f2(a.net_pm) + ' to ' + f2(b.net_pm) + ' (' + (r.money_change_pm.homes_cable_upgrade >= 0 ? '+' : '') + f2(r.money_change_pm.homes_cable_upgrade) + '). ' + (b.wanted_kw > b.delivered_kw + 0.01 ? 'The bottleneck then moves to the generator: it gives ' + f1(a.delivered_kw) + ' kW and the cables now ask for ' + f1(b.wanted_kw) + ' kW, so every branch is a little short. ' : '') + (r.upgrade.payback_min == null ? 'It never pays back in coins: homes have no machine, so a dim street changes no money in this version.' : 'Payback ' + f1(r.upgrade.payback_min) + ' minutes.'));
    out.push('The other street: with the main feeder cut to ' + f1(r.main_feeder_kw) + ' kW and the homes cable large enough, the main street wants ' + f1(c.edges.main_feeder.want) + ' kW, gets ' + pc(c.street.main_min) + '% and the homes stay at ' + pc(c.street.homes_min) + '%. District net per minute ' + f2(b.net_pm) + ' to ' + f2(c.net_pm) + ' (' + (r.money_change_pm.main_feeder_overload >= 0 ? '+' : '') + f2(r.money_change_pm.main_feeder_overload) + '): this is where a brownout touches money.');
    return out;
  }
  return { WARM: WARM, MEASURE: MEASURE, configOf: configOf, option: option, prepare: prepare, steady: steady, compare: compare, sayCompare: sayCompare, e4: e4, sayE4: sayE4, e5: e5, sayE5: sayE5, withSourceKw: withSourceKw, freeCell: freeCell };
});
