/* City Lab: the building as an economic machine. Pure JS, deterministic, fixed step (0.1 s), seedable, no DOM, no THREE.
   Every number comes from the recipe (systems block); nothing about bread, ovens or money is hard-coded here: roles, items, stations,
   tags and the effects of a missing part are all read from the recipe. State is plain JSON (create() makes it, step() changes it),
   so it can be saved, copied and replayed. Same recipe + same seed + same calls = byte-identical state (hash()). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./supports.js'));
  else root.CitySim = factory(root.CitySupports);
})(typeof self !== 'undefined' ? self : this, function (SUP) {
  'use strict';
  var DT = 0.1, LOG_MAX = 400;

  /* ---- small helpers ---- */
  function rnd(s) {   /* mulberry32 on the state's own integer */
    s.rng = (s.rng + 0x6D2B79F5) | 0;
    var t = Math.imul(s.rng ^ (s.rng >>> 15), 1 | s.rng);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function r6(v) { return Math.round(v * 1e6) / 1e6; }
  function part(R, id) { for (var i = 0; i < R.parts.length; i++) if (R.parts[i].id === id) return R.parts[i]; return null; }
  function label(R, id) { var l = R.systems.inspect && R.systems.inspect.labels && R.systems.inspect.labels[id]; return l || id; }
  function log(S, type, text) {
    S.logN++;
    S.log.push({ t: r6(S.t), type: type, text: text });
    if (S.log.length > LOG_MAX) S.log.splice(0, S.log.length - LOG_MAX);
  }
  function fmt(v) { return (Math.round(v * 100) / 100).toString(); }
  function tagParts(R, tag) { return R.parts.filter(function (p) { return p.tag === tag; }); }
  function missingShare(R, S, tag) {
    var ps = tagParts(R, tag);
    if (!ps.length) return 0;
    var m = 0;
    ps.forEach(function (p) { if (!S.present[p.id]) m++; });
    return m / ps.length;
  }
  function isOn(S, id) { return !!S.present[id]; }
  function homeOf(R, j, k) {   /* a worker's own spot: in front of the station part, on the side of the plot's middle */
    var st = part(R, j.station_part), b = SUP.aabb(st), cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2, hd = (b.max[2] - b.min[2]) / 2;
    var dir = cz > 0 ? -1 : 1;
    return [cx + (k - (j.count - 1) / 2) * 0.22, cz + dir * (hd + 0.12)];
  }
  function repairSeconds(R, p) { var rp = R.systems.repair, bt = rp.seconds_by_tag; return bt && bt[p.tag] != null ? bt[p.tag] : rp.seconds; }

  /* ---- create ---- */
  function create(R, opts) {
    opts = opts || {};
    var S = R.systems, st = {
      v: 1, id: R.id, seed: opts.seed == null ? 1 : opts.seed | 0, rng: 0, step: 0, acc: 0, t: 0,
      present: {}, supply_kw: S.power ? (opts.supply_kw != null ? opts.supply_kw : S.power.supply_kw) : 0,
      stock: {}, workers: [], orders: [],
      prod: { running: false, progress: 0, batches: 0, made: 0, status: S.production ? 'starting' : 'none', blocked: '' },
      power: { state: S.power ? 'ok' : 'none', factor: S.power ? 1 : 1, draw_kw: 0, kwh: 0 },
      sales: { acc: 0, sold: 0, lost: 0, income: 0, mult: 1, pending: 0, pendingMoney: 0, nextLog: 10, nextNoise: 0, soldOut: false },
      deliv: [], costs: { power: 0, wages: 0, ingredients: 0, repairs: 0 }, spoiled: {}, spoilAcc: {}, spoilLog: {},
      assign: {}, repairs: { done: 0, failed: 0 }, destroyed: 0, hist: [], log: [], logN: 0
    };
    st.rng = st.seed | 0;
    R.parts.forEach(function (p) { st.present[p.id] = true; });
    Object.keys(S.storage).forEach(function (k) { st.stock[k] = (S.start_stock && S.start_stock[k]) || 0; });
    (S.deliveries || []).forEach(function (d) { st.deliv.push(d.every_seconds); });
    S.jobs.forEach(function (j) {
      for (var k = 0; k < j.count; k++) {
        var h = homeOf(R, j, k);
        st.workers.push({ role: j.role, station: j.station_part, x: r6(h[0]), z: r6(h[1]), hx: r6(h[0]), hz: r6(h[1]), state: 'station', target: null, timer: 0, task: '' });
      }
    });
    log(st, 'info', R.name + ' opens (seed ' + st.seed + ')');
    return st;
  }

  /* ---- damage: take parts off, then the support rule drops what hung on them ---- */
  function destroy(R, S, ids, cause) {
    var gone = Object.keys(S.present).filter(function (k) { return !S.present[k]; });
    var f = SUP.fall(R.parts, ids, { gone: gone });
    f.all.forEach(function (id) { S.present[id] = false; });
    S.destroyed += f.all.length;
    f.direct.forEach(function (id) { log(S, 'part', label(R, id) + ' destroyed' + (cause ? ' (' + cause + ')' : '')); });
    if (f.fallen.length) log(S, 'part', f.fallen.length + ' more part' + (f.fallen.length > 1 ? 's' : '') + ' fell with nothing to hold them' + (f.fallen.length <= 4 ? ': ' + f.fallen.map(function (i) { return label(R, i); }).join(', ') : ''));
    /* a worker whose repair target just fell, or who was repairing something that now has no support, drops the job */
    S.workers.forEach(function (w) { if (w.target && f.all.indexOf(w.target) >= 0) { /* fine: still missing, still wanted */ } });
    return f;
  }
  function blast(R, S, centre, radius, cause) {
    var gone = Object.keys(S.present).filter(function (k) { return !S.present[k]; });
    var hits = SUP.blastHits(R.parts, centre, radius, gone).map(function (h) { return h.id; });
    log(S, 'blast', 'Blast at (' + fmt(centre[0]) + ', ' + fmt(centre[1]) + ', ' + fmt(centre[2]) + ') radius ' + fmt(radius) + ': ' + hits.length + ' part' + (hits.length === 1 ? '' : 's') + ' hit');
    var f = destroy(R, S, hits, cause || 'blast');
    return f;
  }

  /* ---- repair orders: the missing parts a repair needs first come first in the queue ---- */
  function orderRepair(R, S, id, worker) {
    var q = [], seen = {};
    function add(pid) {
      if (seen[pid]) return; seen[pid] = true;
      var p = part(R, pid);
      if (!p || S.present[pid]) return;
      (p.needs || []).forEach(add);
      if (S.orders.indexOf(pid) < 0 && !S.workers.some(function (w) { return w.target === pid; })) q.push(pid);
    }
    add(id);
    q.forEach(function (pid) { S.orders.push(pid); if (worker != null && worker >= 0 && worker < S.workers.length) S.assign[pid] = worker; });
    if (q.length) log(S, 'repair', 'Repair ordered: ' + q.map(function (i) { return label(R, i); }).join(', '));
    return q;
  }
  function orderAll(R, S) {
    var ids = R.parts.filter(function (p) { return !S.present[p.id]; }).map(function (p) { return p.id; }), n = 0;
    ids.forEach(function (id) { n += orderRepair(R, S, id).length; });
    return n;
  }
  function canRestore(R, S, p) {
    var nd = p.needs || [];
    if (!nd.length) return true;
    var n = 0;
    nd.forEach(function (i) { if (S.present[i]) n++; });
    return n >= SUP.needsMin(p);
  }

  /* ---- one fixed step ---- */
  function tick(R, S) {
    var Y = R.systems, dt = DT, i, j;
    S.step++; S.t = r6(S.step * dt);

    /* deliveries: a cart brings an item into storage; it needs the drop crate to be standing, and only what fits is taken */
    (Y.deliveries || []).forEach(function (d, k) {
      if (S.t + 1e-9 < S.deliv[k]) return;
      S.deliv[k] += d.every_seconds;
      /* hook (district layer): an outside road check may suspend the carts; the missed drop is counted and the road is named in the log */
      if (S.ext && S.ext.deliveries === false) { S.ext.missed[d.item] = (S.ext.missed[d.item] || 0) + 1; log(S, 'delivery', 'Cart could not deliver ' + d.item + ': the road to this building is blocked'); return; }
      if (d.drop_part && !isOn(S, d.drop_part)) { log(S, 'delivery', 'Cart could not deliver ' + d.item + ': ' + label(R, d.drop_part) + ' is gone'); return; }
      var room = Math.max(0, Y.storage[d.item] - S.stock[d.item]), take = Math.min(d.amount, room), price = (Y.costs.ingredient_prices && Y.costs.ingredient_prices[d.item]) || 0;
      S.stock[d.item] = r6(S.stock[d.item] + take);
      S.costs.ingredients = r6(S.costs.ingredients + take * price);
      log(S, 'delivery', 'Cart arrived: +' + fmt(take) + ' ' + d.item + (take < d.amount ? ' (' + fmt(d.amount - take) + ' did not fit)' : ''));
    });

    /* power: the cable and the meter box must stand; the city supplies supply_kw; demand only counts while the machine runs */
    var pw = S.power, demand = Y.power ? Y.power.demand_kw : 0, wired = !Y.power || (isOn(S, Y.power.wire_part) && isOn(S, Y.power.meter_part)), factor = 1, pstate = 'none';
    if (Y.power) {
      if (!wired) { factor = 0; pstate = 'cut'; }
      else if (demand > 0 && S.supply_kw < demand) { factor = S.supply_kw / demand; pstate = factor <= 0 ? 'cut' : 'low'; }
      else pstate = 'ok';
      if (pstate !== pw.state) {
        log(S, 'power', pstate === 'cut' ? (wired ? 'Power cut: the city supplies nothing' : 'Power cut: the ' + (isOn(S, Y.power.wire_part) ? label(R, Y.power.meter_part) : label(R, Y.power.wire_part)) + ' is gone') : (pstate === 'low' ? 'Power low: ' + fmt(S.supply_kw) + ' kW of ' + fmt(demand) + ' kW' : 'Power restored'));
        pw.state = pstate;
      }
      pw.factor = r6(factor);
    }

    /* workers: walk to a repair, repair, walk home */
    var rp = Y.repair;
    S.workers.forEach(function (w, wi) {
      var sp = rp.walk_speed * dt;
      if (w.state === 'walking' || w.state === 'returning') {
        var tx = w.state === 'walking' ? w.tx : w.hx, tz = w.state === 'walking' ? w.tz : w.hz, dx = tx - w.x, dz = tz - w.z, dd = Math.sqrt(dx * dx + dz * dz);
        if (dd <= sp + 1e-9) {
          w.x = r6(tx); w.z = r6(tz);
          if (w.state === 'walking') { w.state = 'repairing'; w.timer = repairSeconds(R, part(R, w.target)); log(S, 'repair', 'Repair started: ' + label(R, w.target) + ' (' + w.role + ', ' + fmt(w.timer) + ' s)'); }
          else { w.state = 'station'; w.task = ''; }
        } else { w.x = r6(w.x + dx / dd * sp); w.z = r6(w.z + dz / dd * sp); }
      } else if (w.state === 'repairing') {
        w.timer = r6(w.timer - dt);
        if (w.timer <= 1e-9) {
          var p = part(R, w.target);
          if (canRestore(R, S, p) && !S.present[w.target]) {
            S.present[w.target] = true;
            var cost = rp.material_units * Y.costs.repair_material_price;
            S.costs.repairs = r6(S.costs.repairs + cost); S.repairs.done++;
            log(S, 'repair', 'Repair finished: ' + label(R, w.target) + ' (material ' + fmt(cost) + ')');
          } else if (!S.present[w.target]) { S.repairs.failed++; log(S, 'repair', 'Repair of ' + label(R, w.target) + ' failed: what holds it is gone'); S.orders.push(w.target); }
          w.target = null; w.state = 'returning';
        }
      }
    });
    /* hand out waiting repairs to free workers (those standing at their station or idle), nearest worker first, in queue order */
    if (S.orders.length) {
      for (i = 0; i < S.orders.length; i++) {
        var id = S.orders[i], p2 = part(R, id);
        if (!p2 || S.present[id]) { S.orders.splice(i, 1); i--; continue; }
        if (!canRestore(R, S, p2)) continue;
        var b = SUP.aabb(p2), px = (b.min[0] + b.max[0]) / 2, pz = (b.min[2] + b.max[2]) / 2, best = -1, bd = 1e9;
        for (j = 0; j < S.workers.length; j++) {
          var w2 = S.workers[j];
          if (S.assign[id] != null && S.assign[id] !== j) continue;
          if (w2.state !== 'station' || rp.worker_roles.indexOf(w2.role) < 0) continue;
          var d2 = Math.sqrt((w2.x - px) * (w2.x - px) + (w2.z - pz) * (w2.z - pz));
          if (d2 < bd - 1e-9) { bd = d2; best = j; }
        }
        if (best >= 0) { var wk = S.workers[best]; wk.state = 'walking'; wk.target = id; wk.tx = r6(px); wk.tz = r6(pz); wk.task = 'repair ' + label(R, id); delete S.assign[id]; S.orders.splice(i, 1); i--; }
      }
    }

    /* staffing: share of a role's places that are filled by a worker standing at a station that still exists */
    function staffing(role) {
      var n = 0, tot = 0;
      Y.jobs.forEach(function (jb) { if (jb.role === role) tot += jb.count; });
      S.workers.forEach(function (w) { if (w.role === role && w.state === 'station' && isOn(S, w.station)) n++; });
      /* hook (district layer): ext.staff[role] is the share of that role's places that residents actually fill */
      var sh = S.ext && S.ext.staff && S.ext.staff[role] != null ? S.ext.staff[role] : 1;
      return tot ? Math.min(1, n / tot) * sh : 0;
    }

    /* production: batches. A batch takes its inputs when it starts and gives its outputs when it ends */
    var pr = Y.production, pd = S.prod, drawing = 0;
    if (pr) {
      var blockedBy = '', staff = staffing(pr.role), partsOk = pr.needs_parts.every(function (id) { return isOn(S, id); });
      var canStart = function () {
        for (var k in pr.inputs) if (S.stock[k] + 1e-9 < pr.inputs[k]) return 'no ' + k;
        for (var o in pr.outputs) if (S.stock[o] + pr.outputs[o] > Y.storage[o] + 1e-9) return 'storage full';
        return '';
      };
      var startBatch = function () {
        var why = canStart();
        if (why) { pd.blocked = why; return false; }
        for (var k in pr.inputs) S.stock[k] = r6(S.stock[k] - pr.inputs[k]);
        pd.running = true; return true;
      };
      var prate = (pr.needs_power ? factor : 1) * staff;
      if (!partsOk) blockedBy = 'no ' + label(R, pr.needs_parts.filter(function (id) { return !isOn(S, id); })[0]).toLowerCase();
      else if (pr.needs_power && factor <= 0) blockedBy = 'power cut';
      else if (staff <= 0) blockedBy = 'no worker at the station';
      if (!pd.running && !blockedBy) { if (!startBatch()) blockedBy = pd.blocked; }
      if (pd.running && !blockedBy) {
        pd.progress += dt * prate / pr.batch_seconds;
        if (pr.needs_power) drawing = Math.min(S.supply_kw, demand);
        if (pd.progress >= 1 - 1e-9) {
          pd.progress -= 1;
          for (var o2 in pr.outputs) S.stock[o2] = r6(Math.min(Y.storage[o2], S.stock[o2] + pr.outputs[o2]));
          pd.batches++;
          var made = 0; for (var o3 in pr.outputs) made += pr.outputs[o3];
          pd.made = r6(pd.made + made);
          pd.running = false;
          log(S, 'batch', 'Batch finished: +' + Object.keys(pr.outputs).map(function (k) { return fmt(pr.outputs[k]) + ' ' + k; }).join(', '));
          if (!startBatch()) { pd.progress = 0; blockedBy = pd.blocked; }
        }
      }
      pd.status = blockedBy ? blockedBy : (pr.needs_power && factor < 1 ? 'baking slowly (power low)' : 'working');
      pd.blocked = blockedBy;
    }
    var kwh = drawing * dt / 3600;
    pw.draw_kw = r6(drawing); pw.kwh = r6(pw.kwh + kwh);
    S.costs.power = r6(S.costs.power + kwh * Y.costs.power_per_kwh);

    /* spoilage: the share of a tagged part set that is gone makes stored items spoil */
    ((Y.effects && Y.effects.spoil) || []).forEach(function (e, k) {
      var sh = missingShare(R, S, e.tag);
      if (sh <= 0) return;
      Object.keys(e.items).forEach(function (item) {
        var lost = S.stock[item] * e.items[item] * sh * dt / 60;
        if (lost <= 0) return;
        S.stock[item] = r6(S.stock[item] - lost);
        S.spoiled[item] = r6((S.spoiled[item] || 0) + lost);
        S.spoilAcc[item] = (S.spoilAcc[item] || 0) + lost;
        if (S.spoilAcc[item] >= 1) { log(S, 'spoil', 'Spoiled ' + fmt(S.spoilAcc[item]) + ' ' + item + ' (' + e.tag + ' open)'); S.spoilAcc[item] = 0; }
      });
    });

    /* sales: customers arrive at demand_per_minute (less what a missing awning costs); each takes one if there is stock, otherwise leaves */
    var sl = Y.sales, sa = S.sales;
    if (sl) {
      var dm = S.ext && S.ext.demand_per_minute != null ? S.ext.demand_per_minute : sl.demand_per_minute;   /* hook: the district passes the demand its residents make */
      ((Y.effects && Y.effects.demand) || []).forEach(function (e) { dm *= 1 - e.loss * missingShare(R, S, e.tag); });
      if (sl.noise > 0 && S.t >= sa.nextNoise) { sa.mult = r6(1 + sl.noise * (rnd(S) * 2 - 1)); sa.nextNoise = S.t + 5; }
      var sf = sl.role ? staffing(sl.role) : 1;
      sa.acc += dm * sa.mult * sf * dt / 60;
      while (sa.acc >= 1 - 1e-9) {
        sa.acc -= 1;
        if (S.stock[sl.item] >= 1 - 1e-9) { S.stock[sl.item] = r6(S.stock[sl.item] - 1); sa.sold++; sa.income = r6(sa.income + sl.price); sa.pending++; sa.pendingMoney += sl.price; sa.soldOut = false; }
        else { sa.lost++; if (!sa.soldOut) { sa.soldOut = true; log(S, 'sold', 'Sold out of ' + sl.item + ': customers leave empty-handed'); } }
      }
      if (S.t >= sa.nextLog) { if (sa.pending) { log(S, 'sold', 'Sold ' + sa.pending + ' ' + sl.item + ' (+' + fmt(sa.pendingMoney) + ')'); sa.pending = 0; sa.pendingMoney = 0; } sa.nextLog = S.t + 10; }
    }

    /* wages: every worker is paid every minute they are employed, standing at the station or not */
    var paid = S.workers.length;
    if (S.ext && S.ext.staff) { paid = 0; S.workers.forEach(function (w) { paid += S.ext.staff[w.role] != null ? S.ext.staff[w.role] : 1; }); }   /* hook: only filled places are paid */
    S.costs.wages = r6(S.costs.wages + paid * Y.costs.wage_per_worker_per_minute * dt / 60);

    /* a snapshot every 5 s, for the per-minute rates */
    if (S.step % 50 === 0) { S.hist.push({ t: S.t, income: S.sales.income, cost: r6(cost(S)) }); if (S.hist.length > 14) S.hist.shift(); }
  }
  function cost(S) { return S.costs.power + S.costs.wages + S.costs.ingredients + S.costs.repairs; }

  /* advance by `seconds` of simulated time (any amount: the remainder is kept) */
  function run(R, S, seconds) {
    S.acc += seconds;
    var n = 0;
    while (S.acc >= DT - 1e-9) { tick(R, S); S.acc -= DT; n++; }
    if (Math.abs(S.acc) < 1e-9) S.acc = 0;
    return n;
  }

  function ratePerMin(S, key) {   /* over the last minute (or the time so far, if less) */
    var now = key === 'income' ? S.sales.income : cost(S), t = S.t, ref = null, i;
    for (i = S.hist.length - 1; i >= 0; i--) if (S.hist[i].t <= t - 60 + 1e-9) { ref = S.hist[i]; break; }
    var base = ref ? (key === 'income' ? ref.income : ref.cost) : 0, span = ref ? t - ref.t : t;
    return span > 0 ? (now - base) * 60 / span : 0;
  }

  /* everything the Inspect panel shows, as plain numbers and text */
  function summary(R, S) {
    var Y = R.systems, out = {
      t: S.t, power: { state: S.power.state, supply: S.supply_kw, demand: Y.power ? Y.power.demand_kw : 0, draw: S.power.draw_kw, factor: S.power.factor, kwh: S.power.kwh },
      workers: S.workers.map(function (w) { return { role: w.role, state: w.state, text: w.role + ': ' + (w.state === 'station' ? (isOn(S, w.station) ? 'at the ' + label(R, w.station).toLowerCase() : 'idle (' + label(R, w.station).toLowerCase() + ' is gone)') : (w.state === 'walking' ? 'walking to repair ' + label(R, w.target) : (w.state === 'repairing' ? 'repairing ' + label(R, w.target) + ' (' + fmt(w.timer) + ' s left)' : 'walking back'))) }; }),
      stock: S.stock, capacity: Y.storage, produced: S.prod.made, batches: S.prod.batches, status: S.prod.status, progress: S.prod.progress,
      sold: S.sales.sold, lost: S.sales.lost, income: S.sales.income, costs: { power: S.costs.power, wages: S.costs.wages, ingredients: S.costs.ingredients, repairs: S.costs.repairs, total: r6(cost(S)) },
      income_per_min: ratePerMin(S, 'income'), cost_per_min: ratePerMin(S, 'cost'), balance: r6(S.sales.income - cost(S)), spoiled: S.spoiled,
      missing: R.parts.filter(function (p) { return !S.present[p.id]; }).length, parts: R.parts.length, orders: S.orders.length, events: S.log.slice(-8).reverse()
    };
    out.net_per_min = out.income_per_min - out.cost_per_min;
    if (Y.sales) { var dm = S.ext && S.ext.demand_per_minute != null ? S.ext.demand_per_minute : Y.sales.demand_per_minute; ((Y.effects && Y.effects.demand) || []).forEach(function (e) { dm *= 1 - e.loss * missingShare(R, S, e.tag); }); out.demand_per_min = dm; }
    return out;
  }

  function hash(S) {   /* FNV-1a over the JSON text of the state */
    var s = JSON.stringify(S), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }
  /* optional per-tick outside inputs, all silent (no log line each time): {supply_kw, demand_per_minute, deliveries (false = carts suspended), staff {role: 0..1}}.
     A state that never calls this behaves exactly as before (no ext key is ever created). */
  function setExternal(S, o) {
    if (!S.ext) S.ext = { missed: {} };
    if (o.supply_kw != null) S.supply_kw = o.supply_kw;
    ['demand_per_minute', 'deliveries', 'staff'].forEach(function (k) { if (o[k] !== undefined) S.ext[k] = o[k]; });
    return S.ext;
  }
  function setSupply(R, S, kw) { S.supply_kw = kw; log(S, 'power', 'City supply set to ' + fmt(kw) + ' kW'); }

  return { DT: DT, create: create, run: run, tick: tick, destroy: destroy, blast: blast, orderRepair: orderRepair, orderAll: orderAll, summary: summary, hash: hash,
    setSupply: setSupply, setExternal: setExternal, canRestore: canRestore, missingShare: missingShare, cost: cost };
});
