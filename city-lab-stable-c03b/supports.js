/* City Lab: the support rule and the plain geometry rules. Pure JS, no THREE, no DOM, runs in Node and in the browser.

   THE SUPPORT RULE (the same one the Building Yard uses, bFloating / bSettle in games/sofa-siege/game.js):
   a part that has a needs list falls when fewer than min of the parts it needs are still standing (min is needsMin, all of them if absent).
   After anything comes off, the parts whose support is gone fall, and then whatever hung on those, round after round, at most 14 rounds
   (the game stops after 14 as well). A part with an empty needs list stands on the ground and never falls from this rule.
   tests/support-test.js loads the game and compares this function with the game's own rule on the Cottage and the Market stall. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./whitelist.js'));
  else root.CitySupports = factory(root.CityWhitelist);
})(typeof self !== 'undefined' ? self : this, function (WL) {
  'use strict';
  var L = WL.LIMITS;

  function needsOf(p) { return p.needs || []; }
  function minOf(p) { var n = needsOf(p).length; return p.needsMin == null ? n : p.needsMin; }

  /* fall(parts, removed, opts): parts is [{id, needs, needsMin}], removed is a list of ids taken off directly,
     opts.gone is a list of ids that are already off, opts.maxRounds defaults to 14.
     Returns {direct, fallen, rounds, all}: direct = the removed ids that were on, fallen = every part that fell by the rule (in order),
     rounds = the fallen ids grouped by round, all = direct then fallen. */
  function fall(parts, removed, opts) {
    opts = opts || {};
    var gone = Object.create(null), known = Object.create(null), i, j, direct = [], fallen = [], rounds = [];
    for (i = 0; i < parts.length; i++) known[parts[i].id] = true;
    (opts.gone || []).forEach(function (id) { gone[id] = true; });
    (removed || []).forEach(function (id) { if (known[id] && !gone[id]) { gone[id] = true; direct.push(id); } });
    var maxR = opts.maxRounds == null ? L.maxRounds : opts.maxRounds, round = 0, drop;
    while (round < maxR) {
      drop = [];
      for (i = 0; i < parts.length; i++) {
        var p = parts[i], nd = needsOf(p);
        if (gone[p.id] || !nd.length) continue;
        var n = 0;
        for (j = 0; j < nd.length; j++) if (known[nd[j]] && !gone[nd[j]]) n++;
        if (n < minOf(p)) drop.push(p.id);
      }
      if (!drop.length) break;
      drop.forEach(function (id) { gone[id] = true; fallen.push(id); });
      rounds.push(drop);
      round++;
    }
    return { direct: direct, fallen: fallen, rounds: rounds, all: direct.concat(fallen) };
  }

  /* the parts that stand on something that is gone right now (one look, no rounds): [] means everything left is held (the game's bFloating) */
  function floating(parts, gone) {
    var g = Object.create(null), out = [];
    (gone || []).forEach(function (id) { g[id] = true; });
    var known = Object.create(null);
    parts.forEach(function (p) { known[p.id] = true; });
    parts.forEach(function (p) {
      var nd = needsOf(p);
      if (g[p.id] || !nd.length) return;
      var n = 0;
      nd.forEach(function (id) { if (known[id] && !g[id]) n++; });
      if (n < minOf(p)) out.push(p.id);
    });
    return out;
  }

  /* how many other parts would fall if this one part alone came off (the game's bCascade) */
  function cascade(parts, id, gone) { return fall(parts, [id], { gone: gone, maxRounds: 99 }).fallen.length; }

  /* ids of the parts that need this one directly, and the parts it needs */
  function neededBy(parts, id) { return parts.filter(function (p) { return needsOf(p).indexOf(id) >= 0; }).map(function (p) { return p.id; }); }

  /* is the needs graph free of cycles? returns the id of a part on a cycle, or null */
  function findCycle(parts) {
    var by = Object.create(null), state = Object.create(null), hit = null;
    parts.forEach(function (p) { by[p.id] = p; });
    function visit(id) {
      if (hit) return;
      if (state[id] === 2) return;
      if (state[id] === 1) { hit = id; return; }
      state[id] = 1;
      var p = by[id];
      if (p) needsOf(p).forEach(function (n) { if (by[n]) visit(n); });
      state[id] = 2;
    }
    parts.forEach(function (p) { visit(p.id); });
    return hit;
  }

  /* ---- plain geometry rules (table units, the plot is centred on the origin, the ground is y = 0) ---- */
  function effSize(p) {
    var k = WL.KINDS[p.kind], s = p.size;
    if (!s) { var d = k ? k.size : [0.1, 0.1, 0.1], c = p.scale == null ? 1 : p.scale; s = [d[0] * c, d[1] * c, d[2] * c]; }
    return s;
  }
  /* world box of a part: pos is the middle of its base, rotY turns it about the vertical */
  function aabb(p) {
    var s = effSize(p), r = p.rotY || 0, c = Math.abs(Math.cos(r)), n = Math.abs(Math.sin(r));
    var hx = (c * s[0] + n * s[2]) / 2, hz = (n * s[0] + c * s[2]) / 2;
    return { min: [p.pos[0] - hx, p.pos[1], p.pos[2] - hz], max: [p.pos[0] + hx, p.pos[1] + s[1], p.pos[2] + hz] };
  }
  function centre(p) { var b = aabb(p); return [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2]; }
  /* how far two boxes overlap on each axis (negative = a gap on that axis) */
  function pen(a, b) { return [0, 1, 2].map(function (i) { return Math.min(a.max[i], b.max[i]) - Math.max(a.min[i], b.min[i]); }); }
  /* the overlap rule: two parts overlap when they sink into each other by more than tol on every axis,
     unless one of them needs the other (a part that hangs on another sits against or into it) or one is a cable */
  function overlaps(p, q, tol) {
    tol = tol == null ? L.overlapTol : tol;
    if (p.kind === 'wire' || q.kind === 'wire') return false;
    if (needsOf(p).indexOf(q.id) >= 0 || needsOf(q).indexOf(p.id) >= 0) return false;
    var d = pen(aabb(p), aabb(q));
    return d[0] > tol && d[1] > tol && d[2] > tol;
  }
  /* distance between two boxes (0 when they touch or overlap) */
  function gap(a, b) {
    var s = 0;
    for (var i = 0; i < 3; i++) { var g = Math.max(a.min[i] - b.max[i], b.min[i] - a.max[i], 0); s += g * g; }
    return Math.sqrt(s);
  }
  /* does the part stand at the start? on the ground, or touching at least one of the parts it needs */
  function standsAtStart(p, byId) {
    var nd = needsOf(p), b = aabb(p);
    if (!nd.length) return b.min[1] <= L.groundTol;
    for (var i = 0; i < nd.length; i++) { var q = byId[nd[i]]; if (q && gap(b, aabb(q)) <= L.contactTol) return true; }
    return false;
  }
  /* parts hit by a sphere (a blast): every part whose box the sphere touches, nearest first */
  function blastHits(parts, centreXYZ, radius, gone) {
    var g = Object.create(null), out = [];
    (gone || []).forEach(function (id) { g[id] = true; });
    parts.forEach(function (p) {
      if (g[p.id]) return;
      var b = aabb(p), d = 0;
      for (var i = 0; i < 3; i++) { var v = centreXYZ[i], o = Math.max(b.min[i] - v, v - b.max[i], 0); d += o * o; }
      d = Math.sqrt(d);
      if (d <= radius) out.push({ id: p.id, d: d });
    });
    out.sort(function (a, b) { return a.d - b.d || (a.id < b.id ? -1 : 1); });
    return out;
  }
  return { fall: fall, floating: floating, cascade: cascade, neededBy: neededBy, findCycle: findCycle, effSize: effSize, aabb: aabb,
    centre: centre, overlaps: overlaps, gap: gap, standsAtStart: standsAtStart, blastHits: blastHits, needsMin: minOf };
});
