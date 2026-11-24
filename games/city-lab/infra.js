/* City Lab: the power network (schema city_infra, version 0), the arithmetic half. Pure JS, deterministic, no DOM, no THREE, no randomness.
   It does NOT make a second building engine: it only decides what share of its own demand each building receives this second. district.js feeds that share into each
   building's existing machine through the existing hook (setExternal supply_kw = demand_kw x factor). Same rules as the paper tests (shared/tools/c06-paper-tests.mjs):
   a TREE of cables; sources sit at the root and add up; rule A, "proportional to capped demand": each node offers its parent min(cable capacity, own demand + what its
   children can take); when a node cannot supply everything below it, it scales ALL branches below it by the same factor. A building with no path to a source is dark (factor 0).
   Buildings are leaves of the tree. Source buildings power themselves: their own draw is not counted. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CityInfra = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function r6(v) { return Math.round(v * 1e6) / 1e6; }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function pc(f) { return Math.round(f * 100); }
  var EPS = 1e-9;

  /* the ids of the source buildings (they power themselves and are not nodes of the tree) */
  function sourceBuildings(I) { var o = {}; I.sources.forEach(function (s) { o[s.building] = 1; }); return o; }
  function sourceKw(I, scale) { var t = 0; I.sources.forEach(function (s) { t += s.kw; }); return r6(t * (scale == null ? 1 : scale)); }

  /* bs: [{id, kind}] the buildings of the world, in order; draw: {id: nominal kW}; st: {caps:{cableId: kw}, cut:{cableId: 1}}; scale: source output scale.
     Returns plain numbers only (safe to keep in the plain-JSON state). */
  function allocate(I, bs, draw, st, scale) {
    st = st || { caps: {}, cut: {} };
    var caps = st.caps || {}, cut = st.cut || {}, src = sourceBuildings(I), nodes = {}, order = [], edges = [], here = {};
    function node(id, kind, own) { var n = { id: id, kind: kind, own: own || 0, kids: [], parent: null, edge: null, cap: null, capped: 0, want: 0, take: 0, sever: false }; nodes[id] = n; order.push(n); return n; }
    node(I.root, 'junction', 0);
    I.junctions.forEach(function (j) { if (!nodes[j.id]) node(j.id, 'junction', 0); });
    bs.forEach(function (b) { here[b.id] = b; if (!src[b.id]) node(b.id, b.kind === 'home' ? 'home' : 'building', draw[b.id] || 0); });
    function link(c, synthesized) {
      var p = nodes[c.from], k = nodes[c.to]; if (!p || !k || k.parent) return;
      var base = synthesized ? c.capacity_kw : (caps[c.id] != null ? caps[c.id] : c.capacity_kw);
      k.parent = p; p.kids.push(k); k.cap = cut[c.id] ? 0 : base;
      k.edge = { id: c.id, name: c.name, from: c.from, to: c.to, base_cap: base, cut: !!cut[c.id], synthesized: !!synthesized };
    }
    I.cables.forEach(function (c) { link(c, false); });
    if (I.home_cable) {   /* homes the file does not list (homes added later) hang from the home junction by their own small cable */
      bs.forEach(function (b) { var n = nodes[b.id]; if (b.kind === 'home' && n && !n.parent) link({ id: 'cable_' + b.id, name: 'Home cable', from: I.home_cable.to, to: b.id, capacity_kw: I.home_cable.capacity_kw }, true); });
    }
    function capped(n) { var s = 0; n.kids.forEach(function (k) { s += capped(k); }); n.want = n.own + s; n.capped = n.cap == null ? n.want : Math.min(n.cap, n.want); return n.capped; }
    function give(n, avail, severed) {
      n.take = Math.min(avail, n.capped); n.sever = severed || (n.edge && n.edge.cut);
      var f = n.want > EPS ? n.take / n.want : 0; n.f = f;
      n.kids.forEach(function (k) { give(k, k.capped * f, n.sever); });
    }
    var rootN = nodes[I.root]; capped(rootN);
    var srcKw = sourceKw(I, scale); give(rootN, srcKw, false);

    var res = { source_kw: srcKw, root_want: r6(rootN.want), factor: {}, delivered: {}, demand: {}, dark: {}, connected: {}, edges: [], limiter: {}, min_factor: 1, ratio: {} };
    bs.forEach(function (b) {
      var n = nodes[b.id];
      if (src[b.id]) { res.factor[b.id] = 1; res.delivered[b.id] = 0; res.demand[b.id] = 0; res.connected[b.id] = true; return; }
      var conn = !!n.parent && !n.sever, own = n.own, f;
      if (!conn) f = 0; else f = own > EPS ? Math.min(1, n.take / own) : 1;
      res.factor[b.id] = r6(f); res.delivered[b.id] = r6(conn ? n.take : 0); res.demand[b.id] = r6(own); res.connected[b.id] = conn; if (!conn) res.dark[b.id] = true;
      if (own > EPS && f < res.min_factor) res.min_factor = f;
    });
    res.min_factor = r6(res.min_factor);
    order.forEach(function (n) {
      if (!n.edge) return;
      var cap = n.cap, over = n.want > cap + EPS, util = cap > EPS ? n.want / cap : (n.want > EPS ? 99 : 0), loadU = cap > EPS ? n.take / cap : 0;
      var state = n.edge.cut ? 'cut' : (n.sever ? 'dark' : over ? 'red' : (Math.max(util, loadU) >= 0.9 - EPS ? 'amber' : 'green'));
      res.edges.push({ id: n.edge.id, name: n.edge.name, from: n.edge.from, to: n.edge.to, cap: r6(cap), base_cap: r6(n.edge.base_cap), cut: n.edge.cut, synthesized: n.edge.synthesized, want: r6(n.want), flow: r6(n.sever ? 0 : n.take), util: r6(util), state: state, severed: !!n.sever });
    });
    /* the limiting cable of each building: the cable on its way to the root that clips the most (smallest capped / wanted), or the sources when they are short */
    bs.forEach(function (b) {
      var n = nodes[b.id]; if (!n || src[b.id]) return;
      var best = null, cur = n;
      while (cur) { if (cur.edge && cur.capped < cur.want - EPS) { var r = cur.want > EPS ? cur.capped / cur.want : 0; if (!best || r < best.ratio - EPS) best = { kind: 'cable', cable: cur.edge.id, name: cur.edge.name, node: cur.id, ratio: r6(r), cap: r6(cur.cap), want: r6(cur.want) }; } cur = cur.parent; }
      var srcShort = rootN.take < rootN.want - EPS, sr = rootN.want > EPS ? rootN.take / rootN.want : 1;
      var lim = best || (srcShort ? { kind: 'source', ratio: r6(sr), source_kw: srcKw, want: r6(rootN.want) } : { kind: 'none', ratio: 1 });
      if (best && srcShort) lim.also_source = { ratio: r6(sr), source_kw: srcKw, want: r6(rootN.want) };
      if (!n.parent) lim = { kind: 'unconnected', ratio: 0 }; else if (n.sever) lim = { kind: 'cut', ratio: 0, cable: severedBy(n), name: severedName(n) };
      res.limiter[b.id] = lim;
    });
    function severedBy(n) { var c = n; while (c) { if (c.edge && c.edge.cut) return c.edge.id; c = c.parent; } return null; }
    function severedName(n) { var c = n; while (c) { if (c.edge && c.edge.cut) return c.edge.name; c = c.parent; } return null; }
    return res;
  }

  /* one plain sentence saying why a building has the power it has (the page shows it when a dim or dark building is tapped). label(id) names a building; nodeName(id) a junction. */
  function explain(I, res, id, label, nodeName) {
    var L = label(id), f = res.factor[id], lim = res.limiter[id] || { kind: 'none' }, who = function (n) { return I.junctions.some(function (j) { return j.id === n; }) ? nodeName(n) : label(n); };
    if (f === undefined) return L + ' is not part of the power network.';
    if (lim.kind === 'unconnected') return L + ' has no cable to a source, so it is dark: no power at all.';
    if (lim.kind === 'cut') return L + ' is cut off: ' + lim.name + ' is cut, so everything below it is dark.';
    if (f >= 1 - EPS && !(res.demand[id] > EPS && f < 1)) return L + ' gets all the power it wants' + (res.demand[id] > EPS ? ' (' + f1(res.demand[id]) + ' kW).' : '.');
    var pcs = pc(f), s = '';
    if (lim.kind === 'cable') {
      s = lim.name + ' ' + f1(lim.cap) + ' kW; ' + who(lim.node) + ' wants ' + f1(lim.want) + ' kW; ' + L + ' gets ' + pcs + ' percent.';
      if (lim.also_source) s += ' The sources are also short: ' + f1(lim.also_source.source_kw) + ' kW for ' + f1(lim.also_source.want) + ' kW wanted through the cables.';
    } else if (lim.kind === 'source') s = 'The generators give ' + f1(lim.source_kw) + ' kW; the cables carry ' + f1(lim.want) + ' kW of demand; every branch gets ' + pc(lim.ratio) + ' percent, so ' + L + ' gets ' + pcs + ' percent.';
    else s = L + ' gets ' + pcs + ' percent of the power it wants.';
    return s;
  }

  /* the colour a cable is drawn in: green under 90 percent, amber 90 to 100, red over capacity, dark when cut */
  function colourOf(e) { return e.state; }

  return { allocate: allocate, explain: explain, sourceBuildings: sourceBuildings, sourceKw: sourceKw, colourOf: colourOf, f1: f1, pc: pc };
});
