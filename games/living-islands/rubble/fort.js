/* Rubble: the fort designer. Pure geometry, no physics, no DOM. Works in the browser (global RFort) and in Node (module.exports).
   design(shape, n, seed, site) returns exactly n pieces (bricks, beams and one bell) for a Wall, a Tower or a Castle, placed on the levelled pad and fitted to the ground.
   Units: metres, y up. A brick is 0.30 long, 0.20 wide, 0.12 high (the same brick as Castle Sound and Brick Lab); a beam is 1.20 long, same section; the bell is 0.2 m tall.
   Plan positions are on a 0.30 m lattice (a module is 0.60 m) stretched by 1 percent so neighbours have a 2 to 3 mm gap and nothing starts inside anything.
   Courses are laid bottom up; walls are running bond (every second course shifted half a brick), towers and keeps alternate the brick direction each course, a beam course ties
   the walls together every fifth course, the top of a wall has crenels, the keep carries a two-beam deck and the bell stands on the deck. If the structure comes out short of n,
   the rest is a footing of flat bricks laid round the foot in a stepped skirt (so the count is exact and the base is wider, which also helps it stand).
   Bricks are always full size (0.30 m): a bigger count means a bigger fort (a bigger footprint, thicker walls, more towers), never smaller bricks. The footprint is fitted to the levelled pad
   (site.sculpt.pad); the 'grand' site of terrain.js levels a pad of 27 by 21 m for the biggest counts. */
(function (root) {
  'use strict';
  var SXZ = 1.01, SY = 1.005, BELL_HH = 0.10;
  /* the brick scale is always 1 (the 0.30 m brick); setScale stays only so a test can force a layout */
  var BL = 0.30, BW = 0.20, BH = 0.12, BEAML = 1.20, MOD = 0.6, SC = 1, SUF = '';
  function setScale(sc) { SC = sc; BL = 0.30 * sc; BW = 0.20 * sc; BH = 0.12 * sc; BEAML = 1.20 * sc; MOD = 0.6 * sc; SUF = sc === 1 ? '' : sc === 0.5 ? 'h' : 'q'; }
  function kn(k) { return k + SUF; }
  var MAXC = 15;                                        /* the most courses that stood in test (the solver holds taller stacks only with a lean) */
  var PADX = 4.2, PADZ = 3.6, REACHX = 2.55, REACHZ = 2.35;     /* set from the site's pad in design(): the widest and deepest the structure may be, and how far the footing may reach */
  var CAPW = 6, CAPK = 3;                                /* the most bricks thick a wall may grow (x2 on a big pad) and the keep size cap in modules, set in design() */

  /* a builder collects {k, x, z, c, a, g}: kind, plan position, course, a (0 long side along x, 1 along z), group (0 core, 1 outer, 2 footing) */
  function newB() { return { p: [], ph: 0, merlPhase: 0 }; }
  function put(B, k, x, z, c, a, g) { B.p.push({ k: k, x: x, z: z, c: c, a: a, g: g }); }
  /* a row of bricks (and beams if asked) along an axis: axis 'x' at z = fixed from a0 for len; off shifts half a brick */
  function row(B, c, axis, fixed, a0, len, off, beams, merl, g) {
    var cur = a0 + (off ? BL / 2 : 0), end = a0 + len - (off ? BL / 2 : 0) + 1e-6, i = 0, a = axis === 'x' ? 0 : 1, c0;
    if (beams) while (end - cur >= BEAML - 1e-6) { c0 = cur + BEAML / 2; put(B, kn('beam'), axis === 'x' ? c0 : fixed, axis === 'x' ? fixed : c0, c, a, g); cur += BEAML; }
    while (end - cur >= BL - 1e-6) {
      if (!(merl && ((i + B.merlPhase) & 1))) put(B, kn('brick'), axis === 'x' ? cur + BL / 2 : fixed, axis === 'x' ? fixed : cur + BL / 2, c, a, g);
      cur += BL; i++;
    }
  }
  /* a solid block, w and d in metres (multiples of 0.6), lower left corner x0 z0; the brick direction alternates by course */
  function block(B, c, x0, z0, w, d, g) {
    var r, n;
    if (((c + B.ph) & 1) === 0) { n = Math.round(d / BW); for (r = 0; r < n; r++) row(B, c, 'x', z0 + BW / 2 + r * BW, x0, w, false, false, false, g); }
    else { n = Math.round(w / BW); for (r = 0; r < n; r++) row(B, c, 'z', x0 + BW / 2 + r * BW, z0, d, false, false, false, g); }
  }
  /* a wall of tw bricks thickness along an axis starting at (x0, z0) lower corner; running bond, a beam course every fifth, crenels on top when top is true */
  function wall(B, c, axis, x0, z0, len, tw, top, g) {
    var t, off = ((c + B.ph) & 1) === 1, tie = !top && (c % 5 === 4);
    for (t = 0; t < tw; t++) {
      if (axis === 'x') row(B, c, 'x', z0 + BW / 2 + t * BW, x0, len, off, tie, top, g);
      else row(B, c, 'z', x0 + BW / 2 + t * BW, z0, len, off, tie, top, g);
    }
  }
  function deck(B, c, cx, cz) { put(B, kn('beam'), cx, cz - BW / 2, c, 0, 0); put(B, kn('beam'), cx, cz + BW / 2, c, 0, 0); }

  /* ---------- the three shapes: each takes a parameter set and fills a builder, and returns the course the bell stands on ---------- */
  function shapeWall(B, p) {
    var L = p.wl * MOD, pw = p.pw, pd = Math.max(1, Math.ceil(p.tw * BW / MOD - 1e-9)), c, tw = p.tw, wz0 = -tw * BW / 2, lenSide = L / 2 - MOD - pw * MOD / 2;
    for (c = 0; c < p.ph; c++) block(B, c, -pw * MOD / 2, -pd * MOD / 2, pw * MOD, pd * MOD, 0);
    for (c = 0; c <= p.hw; c++) {
      if (c <= p.hw) { block(B, c, -L / 2, -pd * MOD / 2, MOD, pd * MOD, 1); block(B, c, L / 2 - MOD, -pd * MOD / 2, MOD, pd * MOD, 1); }
      if (lenSide > BL - 0.01) { wall(B, c, 'x', -L / 2 + MOD, wz0, lenSide, tw, c === p.hw, 1); wall(B, c, 'x', pw * MOD / 2, wz0, lenSide, tw, c === p.hw, 1); }
    }
    deck(B, p.ph, 0, 0); return p.ph + 1;
  }
  function shapeTower(B, p) {
    var s = p.s * MOD, c, h = p.h, ring = false && p.s >= 3, r, n;
    for (c = 0; c < h; c++) block(B, c, -s / 2, -s / 2, s, s, 0);
    if (ring) { /* a crenelled rim round the top, the bell and its deck stay clear in the middle */
      B.merlPhase = 0;
      row(B, h, 'z', -s / 2 + BW / 2, -s / 2, s, false, false, true, 1); row(B, h, 'z', s / 2 - BW / 2, -s / 2, s, false, false, true, 1);
      row(B, h, 'x', -s / 2 + BW / 2, -s / 2 + BW, s - 2 * BW, false, false, true, 1); row(B, h, 'x', s / 2 - BW / 2, -s / 2 + BW, s - 2 * BW, false, false, true, 1);
    }
    deck(B, h, 0, 0); return h + 1;
  }
  function shapeCastle(B, p) {
    var W = p.wm * MOD, D = p.dm * MOD, ts = Math.max(p.ts, Math.ceil(p.tw * BW / MOD - 1e-9)), t = ts * MOD, tw = p.tw, c, k = p.km * MOD, sx, sz, lenX = W - 2 * t, lenZ = D - 2 * t;
    for (c = 0; c < p.hk; c++) block(B, c, -k / 2, -k / 2, k, k, 0);
    for (c = 0; c < p.ht; c++) for (sx = -1; sx <= 1; sx += 2) for (sz = -1; sz <= 1; sz += 2) block(B, c, sx < 0 ? -W / 2 : W / 2 - t, sz < 0 ? -D / 2 : D / 2 - t, t, t, 1);
    for (c = 0; c <= p.hw; c++) {
      if (lenX > BL - 0.01) { wall(B, c, 'x', -W / 2 + t, -D / 2, lenX, tw, c === p.hw, 1); wall(B, c, 'x', -W / 2 + t, D / 2 - tw * BW, lenX, tw, c === p.hw, 1); }
      if (lenZ > BL - 0.01) { wall(B, c, 'z', -W / 2, -D / 2 + t, lenZ, tw, c === p.hw, 1); wall(B, c, 'z', W / 2 - tw * BW, -D / 2 + t, lenZ, tw, c === p.hw, 1); }
    }
    deck(B, p.hk, 0, 0); return p.hk + 1;
  }

  /* ---------- the Grand fort ---------- */
  /* An outer curtain wall (crenelled) with four corner towers, mid-wall towers, a gatehouse on the front (+z, towards the launcher) with a passage and a beam lintel,
     an inner ward wall round a battered keep, and bells on the keep, the gatehouse and every corner tower. Plan sizes are in modules (0.60 m).
     Everything is deterministic from the parameters and the seed. */
  var GCAPW = 6, GKT = 3, GATE_A = 6, GBELLS = 6;
  function keepSize(i, p) { return Math.max(3, p.kb - Math.floor(i / GKT)); }
  /* the keep: a stepped (battered) tower, each tier one module narrower (0.30 m a side) every GKT courses down to 3 modules wide; a two-beam deck on top; returns the course the bell stands on */
  function keepAt(B, cx, cz, p) {
    var c, s;
    for (c = 0; c < p.kh; c++) { s = keepSize(c, p) * MOD; block(B, c, cx - s / 2, cz - s / 2, s, s, 0); }
    deck(B, p.kh, cx, cz); return p.kh + 1;
  }
  function shapeKeep(B, p) { B.bells = []; var top = keepAt(B, 0, 0, p); B.bells.push({ x: 0, z: 0, c: top }); return top; }
  function gDims(p) {
    var M = MOD, d = { W: p.W * M, D: p.D * M, tw: p.tw, t: p.t * M, hc: p.hc, ht: Math.min(MAXC, p.hc + 2), hg: Math.min(MAXC, Math.max(p.hc + 2, GATE_A + 3)), gw: p.gw * M };
    d.dt = Math.ceil(p.tw * BW / M - 1e-9) + 1;                  /* plan depth of a mid tower or the gatehouse in modules: the wall thickness plus one module standing out */
    d.ci = Math.max(1, Math.ceil(p.ti * BW / M - 1e-9)) * M; d.Wi = (p.kb + 2 * p.ig) * M + 2 * d.ci;      /* the ward's walls run between its corner piers in whole modules, so every course ends flush */
    d.zk = -d.D / 2 + p.tw * BW + 2 * M + d.Wi / 2;               /* the keep and its ward sit towards the back, the courtyard is in front of them */
    return d;
  }
  /* where the mid-wall towers stand: centres along each side, evenly spread between the corner towers, none within two modules of the gatehouse */
  function gMids(d) {
    var M = MOD, out = { front: [], back: [], left: [], right: [] }, sides = [['front', d.W], ['back', d.W], ['left', d.D], ['right', d.D]], i, k, n, us, xc, key, sp = 9 * M;
    for (k = 0; k < 4; k++) {
      key = sides[k][0]; us = sides[k][1] - 2 * d.t; n = Math.floor(us / sp);
      for (i = 1; i <= n; i++) { xc = Math.round((-us / 2 + i * us / (n + 1)) / (M / 2)) * (M / 2); if (key === 'front' && Math.abs(xc) < d.gw / 2 + 2 * M) continue; out[key].push(xc); }
    }
    return out;
  }
  function gFit(p) {
    var d = gDims(p), M = MOD;
    if (p.t * M < p.tw * BW + M - 1e-9) return false;
    if (d.gw + 4 * M > d.W - 2 * d.t + 1e-9) return false;              /* the gatehouse leaves at least two modules of wall each side */
    if (d.Wi / 2 > d.W / 2 - d.t - M + 1e-9) return false;    /* the ward wall clears the corner towers */
    if (d.zk + d.Wi / 2 > d.D / 2 - p.tw * BW - 3 * M + 1e-9) return false;     /* and the front wall, with room for the courtyard */
    return true;
  }
  /* wall pieces between obstacles along one side: obs is a list of [lo, hi] on the side's axis */
  function wallSegs(B, c, axis, fixed0, a0, a1, obs, tw, top, g) {
    var cur = a0, i, hi; obs.sort(function (a, b) { return a[0] - b[0]; });
    for (i = 0; i <= obs.length; i++) {
      hi = i < obs.length ? obs[i][0] : a1;
      if (hi - cur >= BL - 0.01) wall(B, c, axis, axis === 'x' ? cur : fixed0, axis === 'x' ? fixed0 : cur, hi - cur, tw, top, g);
      if (i < obs.length) cur = Math.max(cur, obs[i][1]);
    }
  }
  /* the gatehouse, one course: centred on x = 0, standing from zf0 for dtm modules. gwm is odd, so each pier is a whole number of modules (laid as blocks: every end is flush and nothing hangs
     over the passage): a passage 0.6 m wide and 6 courses high between two piers, then beams across it (they rest 0.3 m on each pier), then solid up to the roof. */
  function gatehouse(B, c, gwm, dtm, zf0) {
    var x1 = gwm / 2 * MOD, x0 = -x1, nrows = Math.round(dtm * MOD / BW), d = dtm * MOD, r, z, pw = x1 - 0.3;
    if (c > GATE_A) { block(B, c, x0, zf0, x1 - x0, d, 1); return; }
    if (c < GATE_A) { block(B, c, x0, zf0, pw, d, 1); block(B, c, 0.3, zf0, pw, d, 1); return; }
    for (r = 0; r < nrows; r++) {
      z = zf0 + BW / 2 + r * BW;
      row(B, c, 'x', z, x0, x1 - 0.6 - x0, false, false, false, 1); row(B, c, 'x', z, 0.6, x1 - 0.6, false, false, false, 1); put(B, kn('beam'), 0, z, c, 0, 1);
    }
  }
  function shapeGrand(B, p) {
    var d = gDims(p), M = MOD, c, i, sx, sz, W2 = d.W / 2, D2 = d.D / 2, t = d.t, tww = p.tw * BW, mids = gMids(d), mt = 2 * M, dtm = d.dt * M, obs, top, tp, zg = D2 - dtm + M;
    var Wi2 = d.Wi / 2, ci = d.ci, zk = d.zk, twi = p.ti * BW, mk = function (v) { return [v - M, v + M]; };
    B.bells = [];
    for (c = 0; c < d.ht; c++) for (sx = -1; sx <= 1; sx += 2) for (sz = -1; sz <= 1; sz += 2) block(B, c, sx < 0 ? -W2 : W2 - t, sz < 0 ? -D2 : D2 - t, t, t, 1);   /* corner towers */
    for (c = 0; c <= p.hc; c++) {                                                                                                                                   /* mid-wall towers: one module standing out */
      for (i = 0; i < mids.front.length; i++) block(B, c, mids.front[i] - M, zg, mt, dtm, 1);
      for (i = 0; i < mids.back.length; i++) block(B, c, mids.back[i] - M, -D2 - M, mt, dtm, 1);
      for (i = 0; i < mids.left.length; i++) block(B, c, -W2 - M, mids.left[i] - M, dtm, mt, 1);
      for (i = 0; i < mids.right.length; i++) block(B, c, W2 - dtm + M, mids.right[i] - M, dtm, mt, 1);
    }
    for (c = 0; c < p.hc; c++) {                                                                                                                                    /* the curtain walls, the top course crenelled */
      tp = c === p.hc - 1;
      obs = mids.front.map(mk); obs.push([-d.gw / 2, d.gw / 2]); wallSegs(B, c, 'x', D2 - tww, -W2 + t, W2 - t, obs, p.tw, tp, 1);
      wallSegs(B, c, 'x', -D2, -W2 + t, W2 - t, mids.back.map(mk), p.tw, tp, 1);
      wallSegs(B, c, 'z', -W2, -D2 + t, D2 - t, mids.left.map(mk), p.tw, tp, 1);
      wallSegs(B, c, 'z', W2 - tww, -D2 + t, D2 - t, mids.right.map(mk), p.tw, tp, 1);
    }
    for (c = 0; c < d.hg; c++) gatehouse(B, c, p.gw, d.dt, zg);
    for (c = 0; c < p.hi + 1; c++) for (sx = -1; sx <= 1; sx += 2) for (sz = -1; sz <= 1; sz += 2) block(B, c, sx < 0 ? -Wi2 : Wi2 - ci, zk + (sz < 0 ? -Wi2 : Wi2 - ci), ci, ci, 1);   /* the ward wall: a closed ring */
    for (c = 0; c < p.hi; c++) {
      tp = false;                                          /* the ward wall has a flat top */
      wallSegs(B, c, 'x', zk - Wi2, -Wi2 + ci, Wi2 - ci, [], p.ti, tp, 1);
      wallSegs(B, c, 'x', zk + Wi2 - twi, -Wi2 + ci, Wi2 - ci, [], p.ti, tp, 1);
      wallSegs(B, c, 'z', -Wi2, zk - Wi2 + ci, zk + Wi2 - ci, [], p.ti, tp, 1);
      wallSegs(B, c, 'z', Wi2 - twi, zk - Wi2 + ci, zk + Wi2 - ci, [], p.ti, tp, 1);
    }
    top = keepAt(B, 0, zk, p);
    B.bells.push({ x: 0, z: zk, c: top }, { x: 0, z: zg + dtm / 2, c: d.hg });
    for (sx = -1; sx <= 1; sx += 2) for (sz = -1; sz <= 1; sz += 2) B.bells.push({ x: sx * (W2 - t / 2), z: sz * (D2 - t / 2), c: d.ht });
    return top;
  }

  /* ---------- growing a shape to the piece count ---------- */
  /* the stand limits (found by test): a wall stands to about 5 thicknesses, a tower or keep to about 5 widths plus a few courses */
  function mm() { return Math.max(1, Math.ceil(0.6 / MOD - 1e-9)); }
  var SHAPES = {
    wall: { fn: shapeWall, start: function () { var m = mm(); return { wl: m + 4, pw: m, tw: 1, hw: 1, ph: 2 }; },
      inc: [function (p) { if (p.ph >= Math.min(p.hw + 6, 5 * p.pw / mm() + 6, MAXC)) return 0; p.ph++; return true; },
        function (p) { if (p.pw >= CAPK * mm()) return false; if (p.ph < 5 * p.pw / mm() + 3) return 0; p.pw++; return true; }, function (p) { if (p.hw >= Math.min(5 * p.tw + 2, MAXC - 1)) return false; if (p.hw + 1 > 5 * p.pw / mm() + 4) return 0; p.hw++; if (p.ph < p.hw + 1) p.ph = p.hw + 1; return true; },
        function (p) { if (p.wl >= Math.floor(PADX / MOD)) return false; p.wl++; return true; }, function (p) { if (p.tw >= CAPW) return false; if (p.hw < Math.min(4 * p.tw + 1, MAXC - 1)) return 0; p.tw++; return true; }] },
    tower: { fn: shapeTower, start: function () { return { s: mm(), h: 2 }; },
      inc: [function (p) { if (p.h < Math.min(5 * p.s + 6, MAXC)) { p.h++; return true; } if (p.s >= Math.floor(Math.min(PADX, PADZ) / MOD)) return false; p.s++; return true; }] },
    castle: { fn: shapeCastle, start: function () { var m = mm(); return { wm: 3 * m, dm: 3 * m, ts: m, tw: 1, hw: 1, ht: 2, hk: 3, km: m }; },
      inc: [function (p) { if (p.hk >= Math.min(p.ht + 8, 5 * p.km + 6, MAXC)) return 0; p.hk++; return true; },
        function (p) { if (p.hw >= Math.min(5 * p.tw + 2, MAXC - 1)) return false; p.hw++; if (p.ht < p.hw + 1) p.ht = p.hw + 1; return true; },
        function (p) { if (p.wm >= Math.floor(PADX / MOD)) return false; p.wm++; return true; }, function (p) { if (p.dm >= Math.floor(PADZ / MOD)) return false; p.dm++; return true; },
        function (p) { if (p.tw >= CAPW) return false; if ((p.tw + 1) * BW > Math.min(p.wm, p.dm) * MOD / 2 - p.km * MOD / 2 - 0.25 * SC) return false; if (p.hw < Math.min(4 * p.tw + 1, MAXC - 1)) return 0; p.tw++; return true; },
        function (p) { if (p.km >= CAPK * mm()) return false; if ((p.km + 1) * MOD / 2 > Math.min(p.wm, p.dm) * MOD / 2 - p.tw * BW - 0.25 * SC) return false; if (p.hk < Math.min(4 * p.km / mm() + 4, MAXC)) return 0; p.km++; return true; }] }
  };
  /* the tallest keep in courses, by how wide its foot is (found by test_grand.js --tall, BRICKLAB_TO_ISLAND section 13): a plain 3-module tower stood to 25, a 5-module foot to 30,
     a 9-module foot to 36; past that it does not topple, it sinks and slides more than 12 cm while settling. The caps keep a margin under those. */
  function keepCapH(kb) { return kb < 5 ? 24 : kb < 9 ? 30 : 33; }
  var KEEPCAP = keepCapH;
  SHAPES.keep = { fn: shapeKeep, start: function () { return { kb: 3, kh: 4, kt: 3 }; }, inc: [function (p) { if (p.kh >= keepCapH(p.kb)) return false; p.kh++; return true; }] };
  SHAPES.grand = { fn: shapeGrand, nb: GBELLS,
    start: function () { return { W: 13, D: 11, tw: 1, hc: 3, t: 2, gw: 5, kb: 3, kh: 5, ig: 1, ti: 1, hi: 2 }; },
    inc: [
      function (p) { if (p.hc >= MAXC - 2) return false; if (p.hc >= Math.min(MAXC - 2, 7 * p.tw + 1)) return p.tw >= GCAPW ? false : 0; p.hc++; if (p.hi < Math.min(p.hc - 1, 7 * p.ti + 1) && p.hi < p.hc - 2) p.hi++; return true; },
      function (p) { if (p.tw >= GCAPW) return false; if (p.hc < Math.min(MAXC - 2, 7 * p.tw)) return 0; p.tw++; p.t = Math.max(p.t, Math.ceil(p.tw * BW / MOD - 1e-9) + 1); return gFit(p) ? true : 0; },
      function (p) { if (p.W >= Math.floor(PADX / MOD) - 2) return false; if (p.W > 1.25 * p.D) return 0; p.W++; return true; },
      function (p) { if (p.D >= Math.floor(PADZ / MOD) - 2) return false; if (p.D > p.W / 1.05) return 0; p.D++; return true; },
      function (p) { if (p.kb >= 12) return false; if (p.kh < GKT * (p.kb - 3) + 6) return 0; p.kb++; return gFit(p) ? true : 0; },
      function (p) { if (p.kh >= keepCapH(p.kb)) return p.kb >= 12 ? false : 0; p.kh++; return true; },
      function (p) { if (p.kh >= keepCapH(p.kb)) return p.kb >= 12 ? false : 0; p.kh++; return true; },
      function (p) { if (p.gw >= 13) return false; p.gw += 2; return gFit(p) ? true : 0; },
      function (p) { if (p.ti >= Math.min(p.tw, GCAPW)) return 0; if (p.hi < Math.min(p.hc - 2, 7 * p.ti)) return 0; p.ti++; return gFit(p) ? true : 0; },
      function (p) { if (p.hi >= Math.min(p.hc - 2, 7 * p.ti + 1)) return p.ti >= GCAPW ? false : 0; p.hi++; return true; }
    ] };
  function clone(o) { var r = {}, k; for (k in o) r[k] = o[k]; return r; }
  function count(shape, p, ph, mph) { var B = newB(); B.ph = ph; B.merlPhase = mph; SHAPES[shape].fn(B, p); return B.p.length; }
  function grow(shape, budget, ph, mph) {                         /* budget counts every piece but the bell */
    var S = SHAPES[shape], p = S.start(), blocked = [], i = 0, tries = 0, q, ok, allBlocked;
    for (i = 0; i < S.inc.length; i++) blocked.push(false);
    i = 0;
    while (tries++ < 4000) {
      allBlocked = true; for (var j = 0; j < blocked.length; j++) if (!blocked[j]) allBlocked = false; if (allBlocked) break;
      if (tries > 3000) break;
      if (!blocked[i]) { q = clone(p); ok = S.inc[i](q); if (ok === 0) { /* not yet: wait for the others to catch up */ } else if (!ok || count(shape, q, ph, mph) > budget) blocked[i] = true; else p = q; }
      i = (i + 1) % S.inc.length;
    }
    return p;
  }

  /* the footing: flat bricks laid in rings round the foot, ring after ring, then a second layer, until the count is met */
  function footing(B, need, bx, bz) {
    var k, side, c = 0, before = B.p.length, o, ring = 0, guard = 0, tmp;
    while (B.p.length - before < need && guard++ < 4000) {
      for (k = 0; k < 4 && B.p.length - before < need; k++) {
        o = 0.12 * SC + ring * BW; tmp = newB();
        if (k === 0) row(tmp, c, 'x', -(bz + o), -(bx + o), 2 * (bx + o), false, false, false, 2);
        else if (k === 1) row(tmp, c, 'x', bz + o, -(bx + o), 2 * (bx + o), false, false, false, 2);
        else if (k === 2) row(tmp, c, 'z', -(bx + o), -bz, 2 * bz, false, false, false, 2);
        else row(tmp, c, 'z', bx + o, -bz, 2 * bz, false, false, false, 2);
        for (side = 0; side < tmp.p.length && B.p.length - before < need; side++) B.p.push(tmp.p[side]);
      }
      ring++; if (ring >= Math.max(2, 8 - 2 * c)) { ring = 0; c++; }
    }
  }
  function extents(arr) {
    var i, e, hx, hz, t, mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
    for (i = 0; i < arr.length; i++) { e = arr[i]; hx = (e.k.indexOf('beam') === 0 ? BEAML : BL) / 2; hz = BW / 2; if (e.a) { t = hx; hx = hz; hz = t; } mnx = Math.min(mnx, e.x - hx); mxx = Math.max(mxx, e.x + hx); mnz = Math.min(mnz, e.z - hz); mxz = Math.max(mxz, e.z + hz); }
    return { x: Math.max(Math.abs(mnx), Math.abs(mxx)) * SXZ + 0.02, z: Math.max(Math.abs(mnz), Math.abs(mxz)) * SXZ + 0.02 };
  }
  /* one attempt at one brick scale: returns the builder plus whether the footing stays on the level pad */
  function attempt(shape, n, ph, mph, sc) {
    var S = SHAPES[shape], B, p, top, i, trimmed = 0, ex, need, NB = S.nb || 1;
    setScale(sc); p = grow(shape, n - NB, ph, mph); B = newB(); B.ph = ph; B.merlPhase = mph; top = S.fn(B, p);
    if (B.p.length > n - NB) {                          /* tiny counts: drop outer pieces from the top down, keep the core and the bell */
      var keep = [], outer = [];
      for (i = 0; i < B.p.length; i++) (B.p[i].g === 0 ? keep : outer).push(B.p[i]);
      outer.sort(function (a, b) { return a.c - b.c; }); trimmed = B.p.length - (n - NB);
      outer.length = Math.max(0, outer.length - trimmed);
      if (keep.length > n - NB) { keep.sort(function (a, b) { return a.c - b.c; }); keep.length = n - NB; }
      B.p = keep.concat(outer); var topc = 0; for (i = 0; i < keep.length; i++) topc = Math.max(topc, keep[i].c + 1); top = Math.min(top, Math.max(1, topc));
    }
    ex = extents(B.p); need = n - NB - B.p.length;
    if (need > 0) { footing(B, need, ex.x / SXZ, ex.z / SXZ); }
    var ex2 = extents(B.p);
    var fc = 0; for (i = 0; i < B.p.length; i++) if (B.p[i].g === 2 && B.p[i].c > fc) fc = B.p[i].c;
    return { B: B, p: p, top: top, trimmed: trimmed, ex: ex2, fits: ex2.x <= REACHX && ex2.z <= REACHZ, sc: sc, footLayers: fc + 1 };
  }

  /* the whole design. site gives the ground. Returns {pieces, count, params, baseY, spread, bell, ...}. Bricks are always full size. */
  function design(shape, n, seed, site, force, tight) {
    var L = site.layout.wall, cx = L.x, cz = L.z, ph = (seed >>> 0) & 1, mph = (seed >>> 1) & 1, i, e, A = null, si;
    if (!SHAPES[shape]) shape = 'castle';
    var asked = shape, fallback = false;
    SXZ = tight ? 1.003 : 1.01; SY = tight ? 1.002 : 1.005;
    var pd = (site.sculpt && site.sculpt.pad) || { hw: 2.6, hd: 2.4 };       /* the levelled pad the fort stands on (half width, half depth, metres) */
    PADX = 2 * (pd.hw - 0.5); PADZ = 2 * (pd.hd - 0.6); REACHX = pd.hw - 0.05; REACHZ = pd.hd - 0.05; CAPW = pd.hw > 5 ? 20 : 6; CAPK = pd.hw > 5 ? 8 : 3;
    n = Math.max(8, n | 0);
    if (shape === 'grand' && !force) { setScale(1); if (count('grand', SHAPES.grand.start(), ph, mph) > n - GBELLS) { shape = 'castle'; fallback = true; } }      /* too few pieces for a Grand fort: a castle instead, and the page says so */
    if (force) { setScale(force.scale || 1); var BB = newB(); BB.ph = ph; BB.merlPhase = mph; var tp = SHAPES[shape].fn(BB, force.params); A = { B: BB, p: force.params, top: tp, trimmed: 0, ex: extents(BB.p), fits: true, sc: force.scale || 1 }; n = BB.p.length + 1; }
    else A = attempt(shape, n, ph, mph, 1);
    setScale(A.sc);
    var B = A.B, gmin = 1e9, gmax = -1e9, gx, gz, hh, fx = A.ex.x + 0.05, fz = A.ex.z + 0.05, pieces = [], baseY, bell;
    for (gx = -fx; gx <= fx + 1e-6; gx += 0.3) for (gz = -fz; gz <= fz + 1e-6; gz += 0.3) { hh = site.H(cx + gx, cz + gz); if (hh < gmin) gmin = hh; if (hh > gmax) gmax = hh; }
    baseY = gmax + 0.002;
    for (i = 0; i < B.p.length; i++) { e = B.p[i]; pieces.push({ k: e.k, x: cx + e.x * SXZ, y: baseY + BH * SY * e.c + (e.k.indexOf('beam') === 0 || e.k.indexOf('brick') === 0 ? BH / 2 : 0) + 0.0006, z: cz + e.z * SXZ, a: e.a, g: e.g }); }
    var bellList = B.bells && B.bells.length ? B.bells : [{ x: 0, z: 0, c: A.top }], bells = [], bi;
    for (bi = 0; bi < bellList.length; bi++) { bell = { k: 'bell', x: cx + bellList[bi].x * SXZ, y: baseY + BH * SY * bellList[bi].c + BELL_HH + 0.0008, z: cz + bellList[bi].z * SXZ, a: 0, g: 0 }; pieces.push(bell); bells.push(bell); }
    bell = bells[0];
    return { pieces: pieces, count: pieces.length, shape: shape, scale: A.sc, params: A.p, baseY: baseY, spread: gmax - gmin, bell: bell, courses: A.top, trimmed: A.trimmed, half: A.ex, cx: cx, cz: cz,
      bells: bells, asked: asked, fallback: fallback, height: BH * SY * Math.max(A.top, B.bells && B.bells.length ? Math.max.apply(null, B.bells.map(function (b) { return b.c; })) : 0) + 0.2, onPad: A.fits, footLayers: A.footLayers, tight: !!tight };
  }

  /* the fewest pieces a Grand fort can be made of: below this the designer builds a castle instead */
  function grandMin() { var m = 0, ph, mph; setScale(1); for (ph = 0; ph < 2; ph++) for (mph = 0; mph < 2; mph++) m = Math.max(m, count('grand', SHAPES.grand.start(), ph, mph) + GBELLS); return m; }
  var API = { design: design, grandMin: grandMin, BELL_HH: BELL_HH, SHAPES: ['wall', 'tower', 'castle', 'grand'], GRAND_BELLS: GBELLS, KEEPCAP: KEEPCAP };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.RFort = API;
})(typeof window !== 'undefined' ? window : globalThis);
