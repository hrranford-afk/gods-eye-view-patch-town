/* City Lab: the district layer (schema city_district, version 0). Pure JS, deterministic, fixed step (1 s of district time = ten sim ticks), seedable, plain-JSON state,
   no DOM, no THREE. It does NOT make a second building engine: every shop, the workshop, the market and the shed run the existing per-building machine (sim.js).
   This file only decides what goes INTO each machine every second (the demand its residents make, the power the grid gives it, whether its carts can drive, how many
   of its places residents fill) and keeps the city-level records. Every coefficient is in the district file (see DISTRICT.md). Recipes stay unchanged; an upgrade is a
   C02 sidecar applied to a patched COPY of the recipe (same rules as shared/tools/sidecar-check.mjs).
   State is plain JSON: W.S. Same district file + same seed + same calls = byte-identical state (hash). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./sim.js'), require('./validate.js'));
  else root.CityDistrict = factory(root.CitySim, root.CityValidate);
})(typeof self !== 'undefined' ? self : this, function (SIM, VAL) {
  'use strict';
  var LOG_MAX = 300;

  /* ---------------- small helpers ---------------- */
  function r6(v) { return Math.round(v * 1e6) / 1e6; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function key(c, r) { return c + ',' + r; }
  function f1(v) { return (Math.round(v * 10) / 10).toString(); }
  function f2(v) { return (Math.round(v * 100) / 100).toString(); }
  function tokens(p) { return p.replace(/\[(\d+)\]/g, '.$1').split('.'); }
  function getRef(obj, p) { var t = tokens(p), o = obj, i; for (i = 0; i < t.length - 1; i++) { o = o && o[t[i]]; if (o === undefined || o === null) return null; } return { o: o, k: t[t.length - 1] }; }
  function isSim(b) { return b.kind !== 'home'; }
  function clock(t) { return Math.floor(t / 60) + ':' + ('0' + Math.floor(t % 60)).slice(-2); }

  /* ---------------- sidecars: the C02 rules, applied to a copy ---------------- */
  /* branches are applied in id order; 'set' on one path by two branches is an error; every path must exist and be a number. Mirrors shared/tools/sidecar-check.mjs. */
  function applyBranches(recipe, branches) {
    var R = clone(recipe), seen = {};
    branches.slice().sort(function (a, b) { return a.id < b.id ? -1 : 1; }).forEach(function (b) {
      (b.effects || []).forEach(function (e) {
        var r = getRef(R, e.path);
        if (!r || typeof r.o[r.k] !== 'number') throw new Error(b.id + ': ' + e.path + ' is not a number in the recipe');
        if (e.op === 'set') { if (seen[e.path]) throw new Error('two branches both set ' + e.path); seen[e.path] = 1; }
        r.o[r.k] = e.op === 'mul' ? r.o[r.k] * e.value : (e.op === 'add' ? r.o[r.k] + e.value : e.value);
        r.o[r.k] = Math.round(r.o[r.k] * 1e6) / 1e6;
      });
      (b.cosmetic || []).forEach(function (c) { var p = R.parts.filter(function (x) { return x.id === c.part; })[0]; if (!p) throw new Error(b.id + ': no part ' + c.part); p.material = c.material; });
    });
    return R;
  }
  function branchesOf(W, paths) {
    var out = [];
    paths.forEach(function (p) { var sc = W.files[p]; if (!sc) throw new Error('sidecar file not loaded: ' + p); (sc.branches || []).forEach(function (b) { out.push(b); }); });
    return out;
  }
  function patchedRecipe(W, b) {
    var base = W.files[b.recipe];
    if (!base) throw new Error('recipe file not loaded: ' + b.recipe);
    return b.sidecars.length ? applyBranches(base, branchesOf(W, b.sidecars)) : clone(base);
  }

  /* ---------------- make a world ---------------- */
  /* files: {path: parsed JSON} for every recipe and sidecar the district names. Returns {ok, W} or {ok:false, errors}. W = {D, files, R:{buildingId: recipe}, S: plain-JSON state}. */
  function make(D, files, opts) {
    opts = opts || {};
    var S = { v: 0, id: D.id, seed: opts.seed != null ? opts.seed | 0 : D.seed | 0, t: 0, acc: 0, steps: 0, scale: 1, roads: {}, depot: D.depot.slice(), b: [], nextEvent: 0, nextHome: 1, capex: 0, env: null, log: [], logN: 0, brown_s: 0, fsum: 0, minFactor: 1 };
    var W = { D: D, files: files, R: {}, S: S, errors: [] };
    D.roads.forEach(function (r) { S.roads[key(r.cell[0], r.cell[1])] = r.open ? 1 : 0; });
    D.buildings.forEach(function (bd) {
      var b = { id: bd.id, kind: bd.kind, cell: bd.cell.slice(), recipe: bd.recipe, sidecars: (bd.sidecars || []).slice(), label: '', sim: null, hire: bd.hire_priority == null ? 5 : bd.hire_priority, employs: !!bd.employs, draw_kw: bd.draw_kw || 0, residents: 0, cap: 0, acc: { demand: 0, brown_s: 0, blocked_s: 0 } };
      if (bd.kind === 'home') { b.cap = bd.residents.capacity; b.residents = bd.residents.now; S.nextHome = Math.max(S.nextHome, parseInt(String(bd.id).replace(/\D/g, ''), 10) + 1 || S.nextHome); }
      S.b.push(b);
    });
    try {
      S.b.forEach(function (b, i) {
        var R = patchedRecipe(W, b), v = VAL.validate(R);
        if (!v.ok) throw new Error(b.id + ': recipe fails the v1 validator after sidecars (' + v.errors[0] + ')');
        W.R[b.id] = R;
        b.label = b.kind === 'home' ? 'Home ' + (S.b.filter(function (x, j) { return j <= i && x.kind === 'home'; }).length) : R.name;
        if (isSim(b)) b.sim = SIM.create(R, { seed: S.seed + i });
      });
    } catch (e) { return { ok: false, errors: [String(e.message)] }; }
    S.events = (D.events || []).map(function (e) { return clone(e); }).sort(function (a, b) { return a.t - b.t; });
    S.env = computeEnv(W);
    note(W, 'info', 'District opens: ' + S.b.length + ' buildings, ' + S.env.residents + ' residents, grid ' + f1(S.env.power.supply) + ' kW (seed ' + S.seed + ').', []);
    return { ok: true, W: W };
  }

  function note(W, type, text, ids) {
    var S = W.S; S.logN++;
    S.log.push({ t: r6(S.t), type: type, text: text, ids: ids || [] });
    if (S.log.length > LOG_MAX) S.log.splice(0, S.log.length - LOG_MAX);
  }
  function byId(W, id) { for (var i = 0; i < W.S.b.length; i++) if (W.S.b[i].id === id) return W.S.b[i]; return null; }

  /* ---------------- roads ---------------- */
  function accessCells(S, cell) {
    var out = [], d = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    d.forEach(function (o) { var k = key(cell[0] + o[0], cell[1] + o[1]); if (S.roads[k] === 1) out.push(k); });
    return out;
  }
  /* steps over OPEN road cells from the source cells (breadth first). Blocked and missing cells stop the walk. */
  function field(S, sources) {
    var dist = {}, q = [], h = 0, d = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    sources.forEach(function (k) { if (dist[k] == null && S.roads[k] === 1) { dist[k] = 0; q.push(k); } });
    while (h < q.length) {
      var k = q[h++], p = k.split(','), c = +p[0], r = +p[1];
      d.forEach(function (o) { var n = key(c + o[0], r + o[1]); if (S.roads[n] === 1 && dist[n] == null) { dist[n] = dist[k] + 1; q.push(n); } });
    }
    return dist;
  }
  /* road distance (cells, counting the step onto the road) from a set of access cells to a building whose field is given; null if no open path */
  function reach(acc, fld) {
    var best = null;
    acc.forEach(function (k) { if (fld[k] != null && (best == null || fld[k] < best)) best = fld[k]; });
    return best == null ? null : best + 1;
  }

  /* ---------------- the environment: everything the machines are told this second ---------------- */
  function computeEnv(W) {
    var D = W.D, C = D.coefficients, P = D.power, S = W.S, bs = S.b, env = { power: {}, b: {}, residents: 0, employed: 0, jobs: 0, unemployed: 0 }, i, j;
    var homes = bs.filter(function (b) { return b.kind === 'home'; });
    var fieldOf = {}, accOf = {};
    bs.forEach(function (b) { accOf[b.id] = accessCells(S, b.cell); if (isSim(b)) fieldOf[b.id] = field(S, accOf[b.id]); });
    var depotField = field(S, [key(S.depot[0], S.depot[1])]);

    /* shared electricity: nominal draws (a machine's demand_kw whether or not it is baking this second, so the brownout cannot flicker with the load) */
    var draw = {}, total = 0;
    bs.forEach(function (b) {
      var R = W.R[b.id], kw = b.kind === 'home' ? P.home_base_kw + P.per_resident_kw * b.residents : ((R.systems.power ? R.systems.power.demand_kw : 0) + b.draw_kw);
      draw[b.id] = r6(kw); total += kw;
    });
    var supply = r6(P.supply_kw * S.scale), factor = total > 0 ? Math.min(1, supply / total) : 1;
    env.power = { supply: supply, draw: r6(total), factor: r6(factor), margin: r6(supply - total), by: draw };

    /* residents and work: a share of each home's residents work; they fill places at employers they can reach, nearest home first, employers in hire_priority order */
    var avail = {}, empl = {}, slots = {};
    homes.forEach(function (h) { avail[h.id] = Math.floor(h.residents * C.work_fraction + 0.5); empl[h.id] = 0; env.residents += h.residents; });
    var employers = bs.filter(function (b) { return isSim(b) && b.employs; }).sort(function (a, b) { return a.hire - b.hire; });
    employers.forEach(function (e) {
      var tot = 0; W.R[e.id].systems.jobs.forEach(function (jb) { tot += jb.count; });
      var cands = [];
      homes.forEach(function (h) { var d = reach(accOf[h.id], fieldOf[e.id]); if (d != null && d <= C.max_commute_cells && avail[h.id] > 0) cands.push({ h: h, d: d }); });
      cands.sort(function (a, b) { return a.d - b.d || (a.h.id < b.h.id ? -1 : 1); });
      var left = tot, filled = 0;
      cands.forEach(function (c) { var take = Math.min(left, avail[c.h.id]); avail[c.h.id] -= take; empl[c.h.id] += take; left -= take; filled += take; });
      slots[e.id] = { slots: tot, filled: filled }; env.jobs += tot; env.employed += filled;
    });
    env.unemployed = env.residents - env.employed;

    /* market footfall sources */
    var markets = bs.filter(function (b) { return b.kind === 'market'; });
    /* demand for each shop: residents who can reach it, spending, distance decay, shared between reachable shops of the same item, plus the market's footfall */
    var shops = bs.filter(function (b) { return b.kind === 'shop' || b.kind === 'market'; });
    var itemOf = {}; shops.forEach(function (s) { itemOf[s.id] = W.R[s.id].systems.sales.item; });
    var wt = {};   /* wt[homeId][shopId] = decay weight */
    homes.forEach(function (h) {
      wt[h.id] = {};
      shops.forEach(function (s) { var d = reach(accOf[h.id], fieldOf[s.id]); wt[h.id][s.id] = d != null && d <= C.max_reach_cells ? Math.pow(C.decay_per_cell, d) : 0; });
    });
    var visW = {};   /* visitor weights market -> shop */
    markets.forEach(function (m) {
      visW[m.id] = {};
      shops.forEach(function (s) { if (s.id === m.id) { visW[m.id][s.id] = 0; return; } var d = reach(accOf[s.id], fieldOf[m.id]); visW[m.id][s.id] = d != null ? Math.pow(C.footfall.decay_per_cell, d) : 0; });
    });
    shops.forEach(function (s) {
      var item = itemOf[s.id], per = C.per_resident_per_min[item] || 0, res = 0, nh = 0, i2;
      homes.forEach(function (h) {
        var w = wt[h.id][s.id]; if (w <= 0) return;
        var sum = 0; shops.forEach(function (o) { if (itemOf[o.id] === item) sum += wt[h.id][o.id]; });
        var spend = ((h.residents - empl[h.id]) + empl[h.id] * (1 + C.wage_spend_boost)) * per;
        res += spend * w / Math.max(1, sum); nh++;
      });
      var foot = 0, vis = 0;
      if (s.kind !== 'market') {
        markets.forEach(function (m) { foot += visW[m.id][s.id]; });
        foot = Math.min(C.footfall.cap, C.footfall.market_bonus * foot);
      }
      markets.forEach(function (m) {
        var v = C.market_visitors_per_min[item]; if (!v || s.id === m.id) return;
        var sum = 0; shops.forEach(function (o) { if (itemOf[o.id] === item && o.id !== m.id) sum += visW[m.id][o.id]; });
        vis += v * visW[m.id][s.id] / Math.max(1, sum);
      });
      env.b[s.id] = { demand: r6(res * (1 + foot) + vis), from_homes: nh, resident_part: r6(res), footfall: r6(foot), visitors: r6(vis) };
    });

    /* per building: power state, delivery road, staffing */
    bs.forEach(function (b) {
      var e = env.b[b.id] || (env.b[b.id] = {}), R = W.R[b.id];
      e.draw = draw[b.id]; e.factor = env.power.factor;
      if (b.kind === 'home') { e.residents = b.residents; e.employed = empl[b.id]; return; }
      e.reach_depot = reach(accOf[b.id], depotField);
      e.deliveries = !(R.systems.deliveries && R.systems.deliveries.length) || e.reach_depot != null;
      e.access = accOf[b.id].length > 0;
      if (slots[b.id]) { e.slots = slots[b.id].slots; e.filled = slots[b.id].filled; e.staff = slots[b.id].slots ? slots[b.id].filled / slots[b.id].slots : 1; }
    });
    return env;
  }

  /* ---------------- one second of district time ---------------- */
  function fireEvents(W) {
    var S = W.S;
    while (S.nextEvent < S.events.length && S.events[S.nextEvent].t <= S.t + 1e-9) {
      var e = S.events[S.nextEvent++];
      if (e.action === 'block_road') setRoad(W, e.cell, false, 'Scheduled: road at ' + e.cell.join(',') + ' is blocked');
      else if (e.action === 'open_road') setRoad(W, e.cell, true, 'Scheduled: road at ' + e.cell.join(',') + ' is open again');
      else if (e.action === 'supply_scale') setScale(W, e.value, 'Scheduled: the city grid supply is now ' + Math.round(e.value * 100) + '% of normal');
    }
  }
  function stepOnce(W) {
    var S = W.S;
    fireEvents(W);
    var env = computeEnv(W); S.env = env;
    S.b.forEach(function (b) {
      if (!b.sim) return;
      var R = W.R[b.id], e = env.b[b.id], o = { deliveries: e.deliveries };
      if (R.systems.power) o.supply_kw = r6(R.systems.power.demand_kw * env.power.factor);
      if (R.systems.sales && e.demand != null) o.demand_per_minute = e.demand;
      if (e.staff != null) { o.staff = {}; R.systems.jobs.forEach(function (jb) { o.staff[jb.role] = e.staff; }); }
      SIM.setExternal(b.sim, o);
      SIM.run(R, b.sim, 1);
      if (e.demand != null) b.acc.demand = r6(b.acc.demand + e.demand / 60);
      if (R.systems.power && env.power.factor < 1 - 1e-9) b.acc.brown_s++;
      if (!e.deliveries) b.acc.blocked_s++;
    });
    if (env.power.factor < 1 - 1e-9) S.brown_s++;
    S.fsum = r6(S.fsum + env.power.factor);
    S.minFactor = Math.min(S.minFactor, env.power.factor);
    S.steps++; S.t = r6(S.steps);
  }
  function run(W, seconds) {
    var S = W.S; S.acc += seconds;
    var n = 0;
    while (S.acc >= 1 - 1e-9) { stepOnce(W); S.acc -= 1; n++; }
    if (Math.abs(S.acc) < 1e-9) S.acc = 0;
    return n;
  }

  /* ---------------- changes the player (or an event) makes. Each writes one plain sentence: cause, effect, before and after ---------------- */
  function headline(W) {
    var env = W.S.env, out = { residents: env.residents, employed: env.employed, jobs: env.jobs, draw: env.power.draw, supply: env.power.supply, factor: env.power.factor, shops: {}, deliveries: {} };
    W.S.b.forEach(function (b) {
      var e = env.b[b.id]; if (!b.sim) return;
      if (e.demand != null) out.shops[b.id] = { label: b.label, demand: e.demand, homes: e.from_homes };
      out.deliveries[b.id] = e.deliveries;
    });
    return out;
  }
  function diffText(W, A, B) {
    var p = [], d;
    if (A.residents !== B.residents) p.push('residents ' + A.residents + ' to ' + B.residents);
    Object.keys(B.shops).forEach(function (id) {
      var a = A.shops[id], b = B.shops[id];
      if (a && Math.abs(a.demand - b.demand) >= 0.05) p.push(b.label + ' demand ' + f1(a.demand) + ' to ' + f1(b.demand) + ' a minute (' + b.homes + ' home' + (b.homes === 1 ? '' : 's') + ' reach it)');
    });
    if (A.employed !== B.employed || A.jobs !== B.jobs) p.push('workers in jobs ' + A.employed + ' to ' + B.employed + ' of ' + B.jobs + ' places');
    if (Math.abs(A.draw - B.draw) >= 0.05 || Math.abs(A.supply - B.supply) >= 0.05) p.push('grid draw ' + f1(A.draw) + ' to ' + f1(B.draw) + ' kW against ' + f1(B.supply) + ' kW supply');
    if (A.factor >= 1 - 1e-9 && B.factor < 1 - 1e-9) p.push('BROWNOUT started, every building runs at ' + Math.round(B.factor * 100) + '% power');
    else if (A.factor < 1 - 1e-9 && B.factor >= 1 - 1e-9) p.push('brownout ended, power back to 100%');
    else if (A.factor < 1 - 1e-9 && B.factor < 1 - 1e-9 && Math.abs(A.factor - B.factor) >= 0.005) p.push('brownout ' + Math.round(A.factor * 100) + '% to ' + Math.round(B.factor * 100) + '% power');
    Object.keys(B.deliveries).forEach(function (id) {
      if (A.deliveries[id] !== B.deliveries[id]) p.push((B.deliveries[id] ? 'carts can reach ' : 'deliveries to ') + byId(W, id).label + (B.deliveries[id] ? ' again' : ' are suspended (no open road from the depot)'));
    });
    return p.length ? p.join('; ') : 'no other number changed';
  }
  function change(W, cause, before, ids) {
    W.S.env = computeEnv(W);
    var after = headline(W), text = cause + ': ' + diffText(W, before, after) + '.';
    note(W, 'change', text, ids || []);
    return text;
  }
  function setRoad(W, cell, open, cause) {
    var S = W.S, k = key(cell[0], cell[1]);
    if (S.roads[k] == null) return { ok: false, error: 'no road at ' + cell.join(',') };
    var was = S.roads[k] === 1; if (was === !!open) return { ok: true, text: 'already ' + (open ? 'open' : 'blocked') };
    var before = headline(W); S.roads[k] = open ? 1 : 0;
    return { ok: true, text: change(W, cause || ('Road at ' + cell.join(',') + (open ? ' reopened' : ' blocked')), before, []) };
  }
  function setScale(W, v, cause) {
    var before = headline(W); W.S.scale = v;
    return { ok: true, text: change(W, cause || ('Grid supply set to ' + Math.round(v * 100) + '%'), before, []) };
  }
  function homeCells(W) { return W.S.b.filter(function (b) { return b.kind === 'home'; }); }
  function addHome(W) {
    var S = W.S, D = W.D, T = D.home_template, used = {};
    S.b.forEach(function (b) { used[key(b.cell[0], b.cell[1])] = 1; });
    var slot = null; D.home_slots.forEach(function (c) { if (!slot && !used[key(c[0], c[1])]) slot = c; });
    if (!slot) return { ok: false, error: 'no free home plot' };
    var before = headline(W), id = 'home_' + S.nextHome++, b = { id: id, kind: 'home', cell: slot.slice(), recipe: T.recipe, sidecars: [], label: '', sim: null, hire: 5, employs: false, draw_kw: 0, residents: T.capacity, cap: T.capacity, acc: { demand: 0, brown_s: 0, blocked_s: 0 } };
    S.b.push(b); W.R[id] = clone(W.files[T.recipe]); b.label = 'Home ' + homeCells(W).length;
    return { ok: true, id: id, text: change(W, 'Home added at ' + slot.join(',') + ' (' + T.capacity + ' residents move in)', before, [id]) };
  }
  function removeHome(W) {
    var hs = homeCells(W); if (!hs.length) return { ok: false, error: 'no home to remove' };
    var h = hs[hs.length - 1], before = headline(W);
    W.S.b.splice(W.S.b.indexOf(h), 1); delete W.R[h.id];
    return { ok: true, id: h.id, text: change(W, 'Home removed at ' + h.cell.join(',') + ' (' + h.residents + ' residents leave)', before, []) };
  }
  function applySidecar(W, buildingId, path) {
    var b = byId(W, buildingId); if (!b || !b.sim) return { ok: false, error: 'no such machine building' };
    var sc = W.files[path]; if (!sc) return { ok: false, error: 'sidecar not loaded: ' + path };
    if (b.sidecars.indexOf(path) >= 0) return { ok: false, error: 'already applied' };
    var oldR = W.R[b.id], list = b.sidecars.concat([path]), R2;
    try { R2 = applyBranches(W.files[b.recipe], branchesOf(W, list)); } catch (e) { return { ok: false, error: String(e.message) }; }
    var v = VAL.validate(R2); if (!v.ok) return { ok: false, error: 'patched recipe fails the v1 validator: ' + v.errors[0] };
    var before = headline(W), coins = 0, bits = [];
    sc.branches.forEach(function (br) {
      coins += br.cost && br.cost.coins || 0;
      (br.effects || []).forEach(function (e) { var a = getRef(oldR, e.path), n = getRef(R2, e.path); if (a && n) bits.push(e.path.replace(/^systems\./, '') + ' ' + f2(a.o[a.k]) + ' to ' + f2(n.o[n.k])); });
    });
    b.sidecars = list; W.R[b.id] = R2; W.S.capex = r6(W.S.capex + coins);
    var cause = 'Upgrade ' + sc.branches.map(function (x) { return x.name; }).join(', ') + ' applied to ' + b.label + ' (costs ' + coins + ' coins once; ' + bits.join(', ') + ')';
    return { ok: true, coins: coins, text: change(W, cause, before, [b.id]) };
  }

  /* ---------------- records ---------------- */
  function sumVals(o) { var s = 0; Object.keys(o || {}).forEach(function (k) { s += o[k]; }); return s; }
  function snap(W) {
    var S = W.S, out = { t: S.t, brown_s: S.brown_s, fsum: S.fsum, b: {} };
    S.b.forEach(function (b) {
      if (!b.sim) return;
      var m = b.sim, Y = W.R[b.id].systems, miss = 0; if (m.ext) Object.keys(m.ext.missed).forEach(function (k) { miss = Math.max(miss, m.ext.missed[k]); });
      out.b[b.id] = { income: m.sales.income, cost: SIM.cost(m), wages: m.costs.wages, power_cost: m.costs.power, ingredients: m.costs.ingredients, sold: m.sales.sold, lost: m.sales.lost, made: m.prod.made,
        demand: b.acc.demand, spoiled: sumVals(m.spoiled), missed: miss, brown_s: b.acc.brown_s, blocked_s: b.acc.blocked_s, kwh: m.power.kwh };
    });
    return out;
  }
  /* per-minute rates and totals between two snapshots (a is null for "since the start") */
  function between(W, a, b) {
    var t0 = a ? a.t : 0, mins = (b.t - t0) / 60, out = { from: t0, to: b.t, minutes: r6(mins), b: {}, d: { income: 0, cost: 0, net: 0, demand: 0, sold: 0, lost: 0, made: 0, spoiled: 0, missed: 0 } }, env = W.S.env;
    Object.keys(b.b).forEach(function (id) {
      var x = b.b[id], y = a ? a.b[id] || {} : {}, g = function (k) { return x[k] - (y[k] || 0); }, mm = mins > 0 ? mins : 1;
      var r = { income: r6(g('income')), cost: r6(g('cost')), net: r6(g('income') - g('cost')), demand: r6(g('demand')), sold: g('sold'), lost: g('lost'), made: r6(g('made')), spoiled: r6(g('spoiled')), missed_visits: g('missed'),
        brown_s: g('brown_s'), blocked_s: g('blocked_s'), wages: r6(g('wages')), power_cost: r6(g('power_cost')), ingredients: r6(g('ingredients')) };
      r.income_pm = r6(r.income / mm); r.cost_pm = r6(r.cost / mm); r.net_pm = r6(r.net / mm); r.demand_pm = r6(r.demand / mm); r.sold_pm = r6(r.sold / mm); r.lost_pm = r6(r.lost / mm); r.made_pm = r6(r.made / mm);
      r.brown_share = mins > 0 ? r6(r.brown_s / (mins * 60)) : 0;
      out.b[id] = r;
      ['income', 'cost', 'demand', 'sold', 'lost', 'made', 'spoiled', 'missed_visits'].forEach(function (k) { var kk = k === 'missed_visits' ? 'missed' : k; out.d[kk] = r6(out.d[kk] + r[k]); });
    });
    out.d.net = r6(out.d.income - out.d.cost);
    ['income', 'cost', 'net', 'demand', 'sold', 'lost', 'made'].forEach(function (k) { out.d[k + '_pm'] = r6(out.d[k] / (mins > 0 ? mins : 1)); });
    out.d.residents = env.residents; out.d.employed = env.employed; out.d.jobs = env.jobs; out.d.unemployed = env.unemployed;
    out.d.draw_kw = env.power.draw; out.d.supply_kw = env.power.supply; out.d.factor = env.power.factor; out.d.min_factor = W.S.minFactor;
    out.d.brown_s = r6(b.brown_s - (a ? a.brown_s : 0)); out.d.avg_factor = b.t - t0 > 0 ? r6((b.fsum - (a ? a.fsum : 0)) / (b.t - t0)) : 1; out.d.capex = W.S.capex;
    return out;
  }
  function hash(W) {   /* FNV-1a over the JSON text of the state */
    var s = JSON.stringify(W.S), h = 0x811c9dc5, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  /* ---------------- building a settlement from the base district file (data in, data out) ---------------- */
  function withHomes(D, k) {
    var E = clone(D); E.buildings = E.buildings.filter(function (b) { return b.kind !== 'home'; });
    for (var i = 0; i < k && i < E.home_slots.length; i++) E.buildings.push({ id: 'home_' + (i + 1), recipe: E.home_template.recipe, cell: E.home_slots[i].slice(), kind: 'home', sidecars: [], residents: { capacity: E.home_template.capacity, now: E.home_template.capacity } });
    return E;
  }
  function find(E, kind) { return E.buildings.filter(function (b) { return b.kind === kind; }); }
  function run1(D, files, o) {   /* one deterministic run: warm up, then measure. Returns the report between the two snapshots. */
    var m = make(D, files, { seed: o.seed }); if (!m.ok) throw new Error(m.errors.join('; '));
    var W = m.W; if (o.before) o.before(W);
    run(W, o.warm || 0); var a = snap(W); run(W, o.measure); var b = snap(W);
    var rep = between(W, o.warm ? a : null, b); rep.hash = hash(W); rep.world = W; return rep;
  }
  function limiterOf(rep, bakeryId, W) {
    var e = W.S.env, bb = e.b[bakeryId], r = rep.b[bakeryId], R = W.R[bakeryId], pr = R.systems.production, cap = 0;
    if (pr) { var o = 0; Object.keys(pr.outputs).forEach(function (k) { o += pr.outputs[k]; }); cap = o * 60 / pr.batch_seconds; }
    if (r.brown_share >= 0.5) return 'power (brownout, average ' + Math.round(rep.d.avg_factor * 100) + '% power)';
    if (bb.staff != null && bb.staff < 0.999) return 'workers (' + bb.filled + ' of ' + bb.slots + ' places filled)';
    if (r.demand_pm >= cap * 0.98) return 'bakery capacity (' + f1(cap) + ' loaves a minute)';
    return 'demand (not enough customers)';
  }
  function slim(rep, W, bakeryId) {   /* the plain numbers an experiment keeps (no world object) */
    var r = rep.b[bakeryId], e = W.S.env, R = W.R[bakeryId], pr = R.systems.production, cap = 0;
    if (pr) { var o = 0; Object.keys(pr.outputs).forEach(function (k) { o += pr.outputs[k]; }); cap = o * 60 / pr.batch_seconds; }
    var staff = {}; W.S.b.forEach(function (b) { if (e.b[b.id] && e.b[b.id].slots) staff[b.id] = e.b[b.id].filled + '/' + e.b[b.id].slots; });
    return { residents: e.residents, employed: e.employed, jobs: e.jobs, staff: staff, bakery_demand_pm: r.demand_pm, bakery_sold_pm: r.sold_pm, bakery_lost_pm: r.lost_pm, bakery_made_pm: r.made_pm, bakery_capacity_pm: r6(cap),
      bakery_income_pm: r.income_pm, bakery_cost_pm: r.cost_pm, bakery_wages_pm: r6(r.wages / (rep.minutes || 1)), bakery_ingredients_pm: r6(r.ingredients / (rep.minutes || 1)), bakery_power_cost_pm: r6(r.power_cost / (rep.minutes || 1)), bakery_net_pm: r.net_pm, district_net_pm: rep.d.net_pm, grid_draw_kw: e.power.draw, grid_supply_kw: e.power.supply, brownout_avg_factor: rep.d.avg_factor,
      brownout_share: r.brown_share, deliveries_missed_visits: r.missed_visits, spoiled: r.spoiled, delivery_blocked_s: r.blocked_s, hash: rep.hash };
  }

  /* ---- EXPERIMENT 1: more homes ---- */
  function exp1(D, files, o) {
    o = o || {}; var rows = [];
    (o.homes || [2, 4, 6, 8, 10]).forEach(function (k) {
      var E = withHomes(D, k), bk = find(E, 'shop')[0].id, rep = run1(E, files, { warm: 300, measure: 600, seed: D.seed }), row = slim(rep, rep.world, bk);
      row.homes = k; row.limiter = limiterOf(rep, bk, rep.world); delete row.hash; row.state_hash = rep.hash; rows.push(row);
    });
    return { id: 'exp1', title: 'More homes', warm_s: 300, measure_s: 600, rows: rows };
  }

  /* ---- EXPERIMENT 2: upgrade the bakery ---- */
  function exp2(D, files, o) {
    o = o || {}; var out = { id: 'exp2', title: 'Upgrade the bakery', warm_s: 300, measure_s: 600, upgrades: {}, sweep_homes: o.sweep || [1, 2, 3, 4, 5, 6, 7, 8], few: o.few || 2, many: o.many || 8 };
    var paths = o.sidecars || { stone_deck_oven: 'shared/cloud/examples/bakery.stone_deck_oven.json', cool_store_room: 'shared/cloud/examples/bakery.cool_store_room.json' };
    var variants = { base: null }; Object.keys(paths).forEach(function (k) { variants[k] = paths[k]; });
    var grid = {};
    Object.keys(variants).forEach(function (v) {
      grid[v] = {};
      out.sweep_homes.forEach(function (k) {
        var E = withHomes(D, k), bk = find(E, 'shop')[0]; if (variants[v]) bk.sidecars = [variants[v]];
        var rep = run1(E, files, { warm: 300, measure: 600, seed: D.seed }), row = slim(rep, rep.world, bk.id); row.limiter = limiterOf(rep, bk.id, rep.world); delete row.hash; row.state_hash = rep.hash; grid[v][k] = row;
      });
    });
    out.grid = grid;
    /* sensitivity, NOT the base data: what if residents ate more bread? (the owner can change per_resident_per_min.loaf in the district file; this shows what the answer would then be) */
    out.sensitivity = [];
    (o.sens || [1.8, 2.4, 3.0]).forEach(function (loaf) {
      var rows = [], coins = 0; files[paths.stone_deck_oven].branches.forEach(function (b) { coins += b.cost.coins; });
      var be = null;
      [2, 4, 6, 8, 10].forEach(function (k) {
        var res = {};
        ['base', 'stone_deck_oven'].forEach(function (v) {
          var E = withHomes(D, k), bk = find(E, 'shop')[0]; E.coefficients.per_resident_per_min.loaf = loaf; if (v !== 'base') bk.sidecars = [paths.stone_deck_oven];
          var rep = run1(E, files, { warm: 300, measure: 600, seed: D.seed }); res[v] = slim(rep, rep.world, bk.id);
        });
        var gain = r6(res.stone_deck_oven.bakery_net_pm - res.base.bakery_net_pm);
        if (be == null && gain > 0.01 && coins / gain <= 60) be = k;
        rows.push({ homes: k, demand_pm: res.base.bakery_demand_pm, sold_base: res.base.bakery_sold_pm, sold_upgrade: res.stone_deck_oven.bakery_sold_pm, net_base: res.base.bakery_net_pm, net_upgrade: res.stone_deck_oven.bakery_net_pm, gain_pm: gain, brownout_avg_base: res.base.brownout_avg_factor, brownout_avg_upgrade: res.stone_deck_oven.brownout_avg_factor, payback_minutes: gain > 0.01 ? r6(coins / gain) : null });
      });
      out.sensitivity.push({ per_resident_loaf: loaf, stone_deck_oven_break_even_homes_payback_within_60_min: be, rows: rows });
    });
    Object.keys(paths).forEach(function (v) {
      var coins = 0; files[paths[v]].branches.forEach(function (b) { coins += b.cost.coins; });
      var u = { coins: coins, headline: {}, by_homes: {} }, be60 = null;
      out.sweep_homes.forEach(function (k) {
        var a = grid.base[k], b = grid[v][k], gain = r6(b.bakery_net_pm - a.bakery_net_pm);
        u.by_homes[k] = { demand_pm: a.bakery_demand_pm, net_base: a.bakery_net_pm, net_upgrade: b.bakery_net_pm, gain_pm: gain, made_base: a.bakery_made_pm, made_upgrade: b.bakery_made_pm, sold_base: a.bakery_sold_pm, sold_upgrade: b.bakery_sold_pm, extra_cost_pm: r6(b.bakery_cost_pm - a.bakery_cost_pm), extra_wages_pm: r6(b.bakery_wages_pm - a.bakery_wages_pm), extra_ingredients_pm: r6(b.bakery_ingredients_pm - a.bakery_ingredients_pm), extra_power_pm: r6(b.bakery_power_cost_pm - a.bakery_power_cost_pm), brownout_base: a.brownout_avg_factor, brownout_upgrade: b.brownout_avg_factor, payback_minutes: gain > 0.01 ? r6(coins / gain) : null };
        if (be60 == null && gain > 0.01 && coins / gain <= 60) be60 = k;
      });
      u.break_even_homes_payback_within_60_min = be60;
      u.headline = { few: u.by_homes[out.few], many: u.by_homes[out.many] };
      out.upgrades[v] = u;
    });
    return out;
  }

  /* ---- EXPERIMENT 3: two identical bakeries in two neighbourhoods ---- */
  /* conditions are DATA edits of the base district file: homes, where the bakery and the market stand, the scheduled events (a blocked road, a grid dip) and the grid supply */
  var COND = {
    A: { homes: 4, bakery: [5, 3], market: [6, 1], supply: 12, events: [{ t: 200, action: 'supply_scale', value: 0.8 }, { t: 400, action: 'supply_scale', value: 1 }] },
    B: { homes: 2, bakery: [7, 3], market: [0, 1], supply: 7.4, events: [{ t: 150, action: 'block_road', cell: [5, 2] }, { t: 330, action: 'open_road', cell: [5, 2] }, { t: 200, action: 'supply_scale', value: 0.8 }, { t: 400, action: 'supply_scale', value: 1 }] }
  };
  function settlement(D, c) {
    var E = withHomes(D, c.homes);
    E.buildings = E.buildings.filter(function (b) { return b.kind === 'home' || b.kind === 'shop' || b.kind === 'market'; });
    find(E, 'shop').slice(1).forEach(function (x) { E.buildings.splice(E.buildings.indexOf(x), 1); });
    find(E, 'shop')[0].cell = c.bakery.slice(); find(E, 'market')[0].cell = c.market.slice();
    E.power.supply_kw = c.supply; E.events = clone(c.events);
    return E;
  }
  function exp3(D, files, o) {
    o = o || {}; var out = { id: 'exp3', title: 'Two identical bakeries', measure_s: 600, cond: COND, runs: {}, causes: [] };
    function one(c) { var E = settlement(D, c), bk = find(E, 'shop')[0].id, rep = run1(E, files, { warm: 0, measure: 600, seed: D.seed }), row = slim(rep, rep.world, bk); row.limiter = limiterOf(rep, bk, rep.world); row.access_homes = rep.world.S.env.b[bk].from_homes; row.market_footfall = rep.world.S.env.b[bk].footfall; delete row.hash; row.state_hash = rep.hash; return row; }
    out.runs.A = one(COND.A); out.runs.B = one(COND.B); out.runs.control_1 = one(COND.A); out.runs.control_2 = one(COND.A);
    /* cause by cause: start from B and change ONE thing to A's value at a time (the effects interact, so the pieces do not have to add up) */
    var flips = { homes: function (c) { c.homes = COND.A.homes; }, location: function (c) { c.bakery = COND.A.bakery.slice(); c.market = COND.A.market.slice(); }, road: function (c) { c.events = c.events.filter(function (e) { return !/road/.test(e.action); }); }, power: function (c) { c.supply = COND.A.supply; } };
    Object.keys(flips).forEach(function (k) { var c = clone(COND.B); flips[k](c); var r = one(c); out.causes.push({ change: k, net_pm: r.bakery_net_pm, delta_net_pm: r6(r.bakery_net_pm - out.runs.B.bakery_net_pm), demand_pm: r.bakery_demand_pm, sold_pm: r.bakery_sold_pm, missed_visits: r.deliveries_missed_visits, brownout_share: r.brownout_share }); });
    var all = clone(COND.B); Object.keys(flips).forEach(function (k) { flips[k](all); }); var ra = one(all);
    out.causes.push({ change: 'all four (should equal A)', net_pm: ra.bakery_net_pm, delta_net_pm: r6(ra.bakery_net_pm - out.runs.B.bakery_net_pm), demand_pm: ra.bakery_demand_pm, sold_pm: ra.bakery_sold_pm, missed_visits: ra.deliveries_missed_visits, brownout_share: ra.brownout_share });
    return out;
  }

  /* ---------------- plain-language explanations built from the numbers (the page and the results file both use these) ---------------- */
  function explain1(r) {
    var R = r.rows, a = R[0], z = R[R.length - 1], out = [], i;
    out.push('Demand rises with every home added: ' + R.map(function (x) { return x.bakery_demand_pm.toFixed(1); }).join(', ') + ' loaves a minute at ' + R.map(function (x) { return x.homes; }).join(', ') + ' homes.');
    out.push('It rises more slowly than the number of residents: demand per resident falls from ' + (a.bakery_demand_pm / a.residents).toFixed(2) + ' to ' + (R[3].bakery_demand_pm / R[3].residents).toFixed(2) + ' (2 to 8 homes), because each new home stands further from the bakery and distance decay cuts what it buys.');
    out.push('Workers are the first limit, but not for the bakery: with ' + a.homes + ' homes only ' + a.employed + ' of ' + a.jobs + ' job places can be filled (half of each home works). The bakery is hired first and is fully staffed (' + a.staff.bakery + '); the workshop runs on ' + a.staff.workshop + '. From ' + R[1].homes + ' homes every place is filled and more homes add customers, not staff.');
    for (i = 0; i < R.length; i++) if (R[i].brownout_avg_factor < 0.999) { out.push('Power is the next limit: at ' + R[i].homes + ' homes the grid draw is ' + R[i].grid_draw_kw.toFixed(1) + ' kW against a ' + R[i].grid_supply_kw.toFixed(1) + ' kW supply, so every building runs at ' + Math.round(R[i].brownout_avg_factor * 100) + '% power and the bakery bakes slower.'); break; }
    for (i = 0; i < R.length; i++) if (R[i].bakery_lost_pm >= 0.5) { out.push('The bakery itself is the last limit: at ' + R[i].homes + ' homes demand (' + R[i].bakery_demand_pm.toFixed(1) + ') is above what it can sell (' + R[i].bakery_sold_pm.toFixed(1) + ') and ' + R[i].bakery_lost_pm.toFixed(1) + ' customers a minute leave empty-handed (its capacity is ' + R[i].bakery_capacity_pm.toFixed(1) + ' a minute and power already slows it).'); break; }
    out.push('Income per minute at the bakery: ' + R.map(function (x) { return x.bakery_income_pm.toFixed(1); }).join(', ') + '; net per minute: ' + R.map(function (x) { return x.bakery_net_pm.toFixed(1); }).join(', ') + '.');
    return out;
  }
  function explain2(r) {
    var out = [], u = r.upgrades.stone_deck_oven, c = r.upgrades.cool_store_room, f = u.by_homes[r.few], m = u.by_homes[r.many], cf = c.by_homes[r.few], cm = c.by_homes[r.many];
    out.push('Stone deck oven (40 coins): at ' + r.few + ' homes net per minute ' + f.net_base.toFixed(2) + ' to ' + f.net_upgrade.toFixed(2) + ', at ' + r.many + ' homes ' + m.net_base.toFixed(2) + ' to ' + m.net_upgrade.toFixed(2) + '. The extra baking capacity is not used: the bakery sells ' + f.sold_base.toFixed(1) + ' and ' + m.sold_base.toFixed(1) + ' a minute and its original capacity is 25.7, so the faster oven finds no extra customers.');
    out.push('The oven also draws 2 kW more, which deepens the brownout (' + r.many + ' homes: average power ' + (m.brownout_base * 100).toFixed(0) + '% to ' + (m.brownout_upgrade * 100).toFixed(0) + '%). Answer from the numbers: NO, it does not become profitable with this district data. ' + (u.break_even_homes_payback_within_60_min == null ? 'There is no break-even number of homes between 1 and 8.' : 'Break-even at ' + u.break_even_homes_payback_within_60_min + ' homes.'));
    out.push('Cool store room (30 coins): net per minute ' + cf.net_base.toFixed(2) + ' to ' + cf.net_upgrade.toFixed(2) + ' (' + r.few + ' homes) and ' + cm.net_base.toFixed(2) + ' to ' + cm.net_upgrade.toFixed(2) + ' (' + r.many + ' homes). It adds ' + cf.extra_wages_pm.toFixed(1) + ' a minute in wages and buys flour that is stockpiled, not baked (part of that is a one-off while the bigger shelf fills). Sales do not change. Answer: NO at any size of settlement tried.');
    r.sensitivity.forEach(function (s) { out.push('Sensitivity (not the base data): if each resident wanted ' + s.per_resident_loaf + ' loaves a minute, the oven would repay its cost within 60 minutes ' + (s.stone_deck_oven_break_even_homes_payback_within_60_min == null ? 'at no homes count tried' : 'from ' + s.stone_deck_oven_break_even_homes_payback_within_60_min + ' homes') + '. It only pays when demand is above the old capacity.'); });
    return out;
  }
  function explain3(r) {
    var A = r.runs.A, B = r.runs.B, out = [], cz = {}; r.causes.forEach(function (c) { cz[c.change] = c; });
    out.push('Control: two bakeries in condition A give the same numbers to the last digit (net ' + r.runs.control_1.bakery_net_pm.toFixed(2) + ' each), so every difference below comes from the neighbourhood, not from luck or the recipe.');
    out.push('Result: bakery A nets ' + A.bakery_net_pm.toFixed(1) + ' a minute, bakery B ' + B.bakery_net_pm.toFixed(1) + '. Demand ' + A.bakery_demand_pm.toFixed(1) + ' against ' + B.bakery_demand_pm.toFixed(1) + '; sold ' + A.bakery_sold_pm.toFixed(1) + ' against ' + B.bakery_sold_pm.toFixed(1) + '; missed cart visits ' + A.deliveries_missed_visits + ' against ' + B.deliveries_missed_visits + '; brownout time ' + Math.round(A.brownout_share * 100) + '% against ' + Math.round(B.brownout_share * 100) + '%; spoiled ' + A.spoiled + ' and ' + B.spoiled + '.');
    out.push('Cause 1, homes: A has 4 homes (16 residents), B has 2 (8). Giving B the 4 homes alone moves its net by ' + cz.homes.delta_net_pm.toFixed(1) + ' a minute (demand ' + cz.homes.demand_pm.toFixed(1) + ').');
    out.push('Cause 2, location: A stands next to the market and the homes, B at the far end of the street. Moving only the bakery and the market to A\'s places moves B\'s net by ' + cz.location.delta_net_pm.toFixed(1) + ' (demand ' + cz.location.demand_pm.toFixed(1) + '): shorter road distance, more footfall and market visitors.');
    out.push('Cause 3, the blocked road: for 180 s B is cut off, its customers cannot come (demand is 0 then) and ' + B.deliveries_missed_visits + ' cart visits are missed. Opening it alone moves B\'s net by ' + cz.road.delta_net_pm.toFixed(1) + ' (demand ' + cz.road.demand_pm.toFixed(1) + ' against ' + B.bakery_demand_pm.toFixed(1) + '). The missed carts did not starve the oven: B still made ' + B.bakery_made_pm.toFixed(1) + ' loaves a minute against ' + B.bakery_sold_pm.toFixed(1) + ' sold, so the shelves held enough flour for the gap. The cost of the road is lost customers.');
    out.push('Cause 4, the power margin: both are hit by the same 20% grid dip; A has a ' + (A.grid_supply_kw - A.grid_draw_kw).toFixed(1) + ' kW margin and does not feel it, B browns out for ' + Math.round(B.brownout_share * 100) + '% of the run. Giving B A\'s margin alone changes its net by ' + cz.power.delta_net_pm.toFixed(2) + ': B sells so little that slower baking still keeps up. Power matters only to a bakery that is close to its capacity.');
    out.push('The four changes are not additive (they interact): ' + ['homes', 'location', 'road', 'power'].map(function (k) { return k + ' ' + (cz[k].delta_net_pm >= 0 ? '+' : '') + cz[k].delta_net_pm.toFixed(1); }).join(', ') + '; all four together ' + (cz['all four (should equal A)'].delta_net_pm >= 0 ? '+' : '') + cz['all four (should equal A)'].delta_net_pm.toFixed(1) + ' and B becomes A exactly.');
    return out;
  }

  return { make: make, run: run, step: stepOnce, snap: snap, between: between, hash: hash, headline: headline, setRoad: setRoad, setScale: setScale, addHome: addHome, removeHome: removeHome, applySidecar: applySidecar,
    refresh: function (W) { W.S.env = computeEnv(W); return W.S.env; }, withHomes: withHomes, settlement: settlement, applyBranches: applyBranches, run1: run1, exp1: exp1, exp2: exp2, exp3: exp3, explain1: explain1, explain2: explain2, explain3: explain3, COND: COND, clock: clock, byId: byId, note: note };
});
