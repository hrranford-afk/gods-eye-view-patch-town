/* cardvision.js: Round Table Kingdom picture-card recogniser (18 Nov 2026).
   Plain JavaScript, no libraries. One global: CV_CARDS.
   Idea, in order:
     1. FAST-9 corners on a small pyramid, rotation-aware 256-bit BRIEF (as ORB does it).
     2. Hamming matching against a target database built from the six card PNGs at load
        time (several sizes, plus squeezed views so low camera angles still match).
     3. RANSAC homography (card millimetres -> picture pixels), refitted on its inliers.
        The shared border HELPS here: any card's border finds "a card".
     4. WHICH card it is comes from a dense check: the picture is flattened to a small
        canonical card and compared cell by cell with all six cards, weighted towards the
        cells that differ between cards (title, centre drawing, side banners, tagline).
     5. Pose from the homography, given the card size in mm and the camera intrinsics.
   Card frame: origin at the card centre, x to the right of the artwork, y DOWN the artwork,
   z into the table. Camera frame: x right, y down, z forward (the OpenCV way). Units mm.
   Card art is untrusted picture data: it is only ever read as grey pixels, never run.
   The FAST/BRIEF/homography parts follow FEAT in games/room-kit/vision.js. */
var CV_CARDS = (function () {
  'use strict';
  var NAMES = { '00': 'WORLD ANCHOR', '01': 'BLUE BASE', '02': 'RED BASE', '03': 'CAPTURE FLAG', '04': 'HILL', '05': 'BUILD CAMP' };
  var KINDS = { '00': 'world_anchor', '01': 'blue_base', '02': 'red_base', '03': 'capture_flag', '04': 'hill', '05': 'build_camp' };
  var DEF = {
    cardW: 210, cardH: 148.5,            /* mm, A5 landscape */
    dbWidths: [512, 362, 256, 181, 128, 90], dbPer: [420, 260, 160, 100, 60, 36],
    tiltF: 0.45, tiltDirs: 4, tiltWidths: [362, 256, 181, 128], tiltPer: [180, 120, 70, 40],
    dbMode: 'all',                       /* 'all' | 'distinct' | 'region' */
    idMode: 'ncc',                       /* 'ncc' | 'inliers' */
    frameLevels: 3, upTo: 0, frameCap: 1400, fastThr: 12, cell: 32, perCell: 18,
    maxHam: 70, ratio: 0.9, ratioMM: 12,
    ransacIters: 300, minInl: 8, maxRounds: 8,
    dense: true, features: true, quads: true, quadK: 1.1, quadMaxK: 0, quadMaxR: 3, quadClose: 0, quadErode: 0, quadFill: 0.12, maxQuads: 12, quadNccMin: 0.55, quadNccAll: 0.3, quadMargin: 0.12, globMin: 0.3, quadGlobMin: 0.65, nccMin: 0.34, nccMargin: 0.07, nccAll: 0.22, minVisible: 0.45,
    inlMin: 14                            /* idMode 'inliers' only */
  };
  var BORD = 20;
  var CIRC = [[0, -3], [1, -3], [2, -2], [3, -1], [3, 0], [3, 1], [2, 2], [1, 3], [0, 3], [-1, 3], [-2, 2], [-3, 1], [-3, 0], [-3, -1], [-2, -2], [-1, -3]];
  var PAT = null;
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function initPat() { if (PAT) return; var r = rng(20261118); PAT = new Int8Array(1024); for (var i = 0; i < 1024; i++) { var s = 0; for (var k = 0; k < 4; k++) s += r(); PAT[i] = Math.max(-12, Math.min(12, Math.round((s - 2) * 7))); } }
  function pc(v) { v = v - ((v >>> 1) & 0x55555555); v = (v & 0x33333333) + ((v >>> 2) & 0x33333333); return (((v + (v >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24; }

  /* ---------- pictures ---------- */
  function resizeArea(g, nw, nh) { /* box-filtered shrink (no aliasing of the fine ink lines); bilinear when not shrinking */
    var w = g.w, h = g.h, sx = w / nw, sy = h / nh, tmp = new Float32Array(nw * h), o = new Uint8Array(nw * nh), x, y, k;
    for (x = 0; x < nw; x++) { var a = x * sx, b = Math.min(w, (x + 1) * sx), a0 = Math.floor(a), b0 = Math.min(w - 1, Math.ceil(b) - 1);
      for (y = 0; y < h; y++) { var s = 0, row = y * w; for (k = a0; k <= b0; k++) { var wt = Math.min(b, k + 1) - Math.max(a, k); s += g.d[row + k] * wt; } tmp[y * nw + x] = s / (b - a); } }
    for (y = 0; y < nh; y++) { var c = y * sy, e = Math.min(h, (y + 1) * sy), c0 = Math.floor(c), e0 = Math.min(h - 1, Math.ceil(e) - 1);
      for (x = 0; x < nw; x++) { var s2 = 0; for (k = c0; k <= e0; k++) { var wt2 = Math.min(e, k + 1) - Math.max(c, k); s2 += tmp[k * nw + x] * wt2; } o[y * nw + x] = s2 / (e - c) + 0.5; } }
    return { d: o, w: nw, h: nh };
  }
  function blur3(g) { var w = g.w, h = g.h, d = g.d, t = new Uint8Array(d.length), o = new Uint8Array(d.length), x, y, i;
    for (y = 0; y < h; y++) for (x = 1; x < w - 1; x++) { i = y * w + x; t[i] = (d[i - 1] + 2 * d[i] + d[i + 1] + 2) >> 2; }
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) { i = y * w + x; o[i] = (t[i - w] + 2 * t[i] + t[i + w] + 2) >> 2; }
    return blur3b(o, w, h); }
  function blur3b(d, w, h) { var t = new Uint8Array(d.length), o = new Uint8Array(d.length), x, y, i;
    for (y = 0; y < h; y++) for (x = 1; x < w - 1; x++) { i = y * w + x; t[i] = (d[i - 1] + 2 * d[i] + d[i + 1] + 2) >> 2; }
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) { i = y * w + x; o[i] = (t[i - w] + 2 * t[i] + t[i + w] + 2) >> 2; }
    return o; }
  function upsample(g, f) { var nw = Math.round(g.w * f), nh = Math.round(g.h * f), o = new Uint8Array(nw * nh); for (var y = 0; y < nh; y++) for (var x = 0; x < nw; x++) o[y * nw + x] = bil(g.d, g.w, g.h, (x + 0.5) / f - 0.5, (y + 0.5) / f - 0.5); return { d: o, w: nw, h: nh }; }
  function bil(d, w, h, x, y) { if (x < 0) x = 0; if (y < 0) y = 0; if (x > w - 1.001) x = w - 1.001; if (y > h - 1.001) y = h - 1.001; var x0 = x | 0, y0 = y | 0, ax = x - x0, ay = y - y0, i = y0 * w + x0; return (d[i] * (1 - ax) + d[i + 1] * ax) * (1 - ay) + (d[i + w] * (1 - ax) + d[i + w + 1] * ax) * ay; }

  /* ---------- corners and descriptors ---------- */
  function fast(g, thr, cap, cell, perCell) {
    var w = g.w, h = g.h, d = g.d, off = CIRC.map(function (c) { return c[1] * w + c[0]; }), sc = new Int16Array(w * h), x, y, i, t;
    for (y = BORD; y < h - BORD; y++) for (x = BORD; x < w - BORD; x++) {
      i = y * w + x; var p = d[i], hi = p + thr, lo = p - thr, nb = 0, nd = 0, v;
      v = d[i + off[0]]; if (v > hi) nb++; else if (v < lo) nd++;
      v = d[i + off[8]]; if (v > hi) nb++; else if (v < lo) nd++;
      v = d[i + off[4]]; if (v > hi) nb++; else if (v < lo) nd++;
      v = d[i + off[12]]; if (v > hi) nb++; else if (v < lo) nd++;
      if (nb < 2 && nd < 2) continue;
      var run = 0, s = 0, kind = 0;
      for (t = 0; t < 25; t++) { v = d[i + off[t & 15]]; var b = v > hi ? 1 : v < lo ? -1 : 0; if (b !== 0 && b === kind) { run++; s += Math.abs(v - p); } else { kind = b; run = b ? 1 : 0; s = b ? Math.abs(v - p) : 0; } if (run >= 9) { sc[i] = Math.min(32000, s + 1); break; } }
    }
    var cw = Math.ceil(w / cell), ch = Math.ceil(h / cell), cells = new Array(cw * ch), pts = [];
    for (y = BORD; y < h - BORD; y++) for (x = BORD; x < w - BORD; x++) { i = y * w + x; var q = sc[i]; if (!q) continue;
      if (q >= sc[i - 1] && q > sc[i + 1] && q >= sc[i - w] && q > sc[i + w] && q >= sc[i - w - 1] && q > sc[i + w + 1] && q >= sc[i - w + 1] && q > sc[i + w - 1]) { var ci = ((y / cell) | 0) * cw + ((x / cell) | 0); (cells[ci] || (cells[ci] = [])).push([x, y, q]); } }
    for (i = 0; i < cells.length; i++) { var c = cells[i]; if (!c) continue; c.sort(function (a, b2) { return b2[2] - a[2]; }); for (t = 0; t < c.length && t < perCell; t++) pts.push(c[t]); }
    pts.sort(function (a, b2) { return b2[2] - a[2]; }); return pts.length > cap ? pts.slice(0, cap) : pts;
  }
  function describe(g, pts, out, toX, toY, toA) { /* toX/toY: map this picture's pixel to the stored coordinate */
    initPat(); var bl = blur3(g), w = g.w, h = g.h, P = PAT, gd = g.d;
    for (var n = 0; n < pts.length; n++) { var x = pts[n][0], y = pts[n][1], m10 = 0, m01 = 0, dy, dx;
      for (dy = -15; dy <= 15; dy++) { var hw = Math.floor(Math.sqrt(225 - dy * dy)), row = (y + dy) * w + x; for (dx = -hw; dx <= hw; dx++) { var v = gd[row + dx]; m10 += dx * v; m01 += dy * v; } }
      var a = Math.atan2(m01, m10), c = Math.cos(a), s = Math.sin(a), base = out.d.length;
      for (var q = 0; q < 8; q++) { var word = 0; for (var k = q * 32; k < q * 32 + 32; k++) { var x1 = P[k * 4], y1 = P[k * 4 + 1], x2 = P[k * 4 + 2], y2 = P[k * 4 + 3];
        if (bil(bl, w, h, x + x1 * c - y1 * s, y + x1 * s + y1 * c) < bil(bl, w, h, x + x2 * c - y2 * s, y + x2 * s + y2 * c)) word |= 1 << (k & 31); } out.d.push(word); }
      out.x.push(toX(x, y)); out.y.push(toY(x, y)); out.a.push(toA ? toA(c, s) : a); }
    return base;
  }
  function extract(gray, w, h, o) { /* frame features + the pyramid (kept for the flattening step) */
    o = o || DEF; var g0 = { d: gray, w: w, h: h }, pyr = [g0], out = { x: [], y: [], d: [], a: [] }, sc = 1;
    if (o.upTo && w <= o.upTo) { var gu = upsample(g0, 1.5), fu = w / gu.w, fv = h / gu.h; describe(gu, fast(gu, o.fastThr, Math.round(o.frameCap * 0.5), o.cell, o.perCell), out, function (x) { return (x + 0.5) * fu - 0.5; }, function (x, y) { return (y + 0.5) * fv - 0.5; }); }
    for (var l = 0; l < o.frameLevels; l++) { var g = g0; if (l) { sc = Math.pow(0.7071, l); g = resizeArea(g0, Math.round(w * sc), Math.round(h * sc)); pyr.push(g); } if (g.w < 100 || g.h < 80) break;
      var fx = w / g.w, fy = h / g.h, cap = Math.round(o.frameCap * (l === 0 ? 0.5 : l === 1 ? 0.3 : 0.2));
      (function (fx, fy) { describe(g, fast(g, o.fastThr, cap, o.cell, o.perCell), out, function (x) { return (x + 0.5) * fx - 0.5; }, function (x, y) { return (y + 0.5) * fy - 0.5; }); })(fx, fy); }
    return { n: out.x.length, x: Float32Array.from(out.x), y: Float32Array.from(out.y), a: Float32Array.from(out.a), d: Int32Array.from(out.d), w: w, h: h, pyr: pyr };
  }

  /* ---------- homographies (row-major 9, h33 = 1) ---------- */
  function hApply(H, x, y) { var w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; }
  function solveN(A, n) { for (var c = 0; c < n; c++) { var p = c, r, k; for (r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; if (Math.abs(A[p][c]) < 1e-12) return null; var tmp = A[c]; A[c] = A[p]; A[p] = tmp; for (r = 0; r < n; r++) if (r !== c) { var f = A[r][c] / A[c][c]; if (f !== 0) for (k = c; k <= n; k++) A[r][k] -= f * A[c][k]; } } return A.map(function (row, i) { return row[n] / row[i]; }); }
  function hFit(P, Q) { /* least squares over >= 4 pairs, normal equations */
    var N = [], a, c, i; for (a = 0; a < 8; a++) N.push([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    for (i = 0; i < P.length; i++) { var x = P[i][0], y = P[i][1], u = Q[i][0], v = Q[i][1], r1 = [x, y, 1, 0, 0, 0, -u * x, -u * y], r2 = [0, 0, 0, x, y, 1, -v * x, -v * y];
      for (a = 0; a < 8; a++) { for (c = 0; c < 8; c++) N[a][c] += r1[a] * r1[c] + r2[a] * r2[c]; N[a][8] += r1[a] * u + r2[a] * v; } }
    var hh = solveN(N, 8); return hh ? hh.concat([1]) : null; }
  function mul3(A, B) { var C = new Array(9); for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return C; }
  function inv3(m) { var a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5], g = m[6], h = m[7], i = m[8], A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C; if (Math.abs(det) < 1e-18) return null;
    return [A / det, (c * h - b * i) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, (c * d - a * f) / det, C / det, (b * g - a * h) / det, (a * e - b * d) / det]; }
  function quadOK(q, fw, fh) { var area = 0, sgn = 0, i; for (i = 0; i < 4; i++) { var a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4]; area += a[0] * b[1] - b[0] * a[1]; var z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (z <= 0) return false; if (a[0] < -fw || a[0] > 2 * fw || a[1] < -fh || a[1] > 2 * fh) return false; }
    area = area / 2; if (area < fw * fh * 0.0012 || area > fw * fh * 1.5) return false;
    var e0 = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), e1 = Math.hypot(q[2][0] - q[1][0], q[2][1] - q[1][1]), e2 = Math.hypot(q[3][0] - q[2][0], q[3][1] - q[2][1]), e3 = Math.hypot(q[0][0] - q[3][0], q[0][1] - q[3][1]);
    var mn = Math.min(e0, e1, e2, e3), mx = Math.max(e0, e1, e2, e3); return mn > 8 && mx / mn < 12; }

  /* ---------- an instance: database + detector ---------- */
  function create(userOpt) {
    var o = {}, k; for (k in DEF) o[k] = DEF[k]; for (k in (userOpt || {})) o[k] = userOpt[k];
    var S = { opt: o, cards: [], ready: false, stats: {} };
    var CW = o.cardW, CH = o.cardH, CN = [{ w: 84, h: 60, cx: 8, cy: 6 }, { w: 168, h: 120, cx: 8, cy: 6 }];

    function padWhite(g, pad) { var w = g.w + 2 * pad, h = g.h + 2 * pad, d = new Uint8Array(w * h).fill(250); for (var y = 0; y < g.h; y++) d.set(g.d.subarray(y * g.w, (y + 1) * g.w), (y + pad) * w + pad); return { d: d, w: w, h: h }; }
    function squeezed(g, th, f) { /* the card as seen at a low angle: squeezed by f along direction th, on white */
      var c = Math.cos(th), s = Math.sin(th), A = [c * c + f * s * s, (1 - f) * c * s, (1 - f) * c * s, s * s + f * c * c], det = A[0] * A[3] - A[1] * A[2], Ai = [A[3] / det, -A[1] / det, -A[2] / det, A[0] / det];
      var xs = [0, g.w, g.w, 0], ys = [0, 0, g.h, g.h], mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9, i;
      for (i = 0; i < 4; i++) { var px = A[0] * xs[i] + A[1] * ys[i], py = A[2] * xs[i] + A[3] * ys[i]; mnx = Math.min(mnx, px); mxx = Math.max(mxx, px); mny = Math.min(mny, py); mxy = Math.max(mxy, py); }
      var pad = BORD + 2, w = Math.ceil(mxx - mnx) + 2 * pad, h = Math.ceil(mxy - mny) + 2 * pad, d = new Uint8Array(w * h), ns = Math.ceil(1 / f), ex = -s / f / ns, ey = c / f / ns;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var vx = x - pad + mnx, vy = y - pad + mny, sx = Ai[0] * vx + Ai[1] * vy, sy = Ai[2] * vx + Ai[3] * vy, acc = 0;
        for (var t = 0; t < ns; t++) { var qx = sx + (t - (ns - 1) / 2) * ex, qy = sy + (t - (ns - 1) / 2) * ey; acc += (qx < 0 || qy < 0 || qx > g.w - 1 || qy > g.h - 1) ? 250 : bil(g.d, g.w, g.h, qx, qy); } d[y * w + x] = acc / ns; }
      return { g: { d: d, w: w, h: h }, Ai: Ai, back: function (x, y) { var vx = x - pad + mnx, vy = y - pad + mny; return [Ai[0] * vx + Ai[1] * vy, Ai[2] * vx + Ai[3] * vy]; } };
    }
    function canon(g, cn) { /* a card picture -> canonical small float picture, lightly blurred */
      var r = resizeArea(g, cn.w, cn.h), b = blur3b(r.d, cn.w, cn.h), f = new Float32Array(cn.w * cn.h); for (var i = 0; i < f.length; i++) f[i] = b[i]; return f; }
    function cellStats(f, cn) { /* per cell: mean and root sum of squares about the mean */
      var cw = cn.w / cn.cx, ch = cn.h / cn.cy, n = cn.cx * cn.cy, mean = new Float32Array(n), ss = new Float32Array(n);
      for (var cy = 0; cy < cn.cy; cy++) for (var cx = 0; cx < cn.cx; cx++) { var s = 0, q = 0, x, y, v, cnt = 0; for (y = Math.round(cy * ch); y < Math.round((cy + 1) * ch); y++) for (x = Math.round(cx * cw); x < Math.round((cx + 1) * cw); x++) { v = f[y * cn.w + x]; s += v; q += v * v; cnt++; } var m = s / cnt; mean[cy * cn.cx + cx] = m; ss[cy * cn.cx + cx] = Math.sqrt(Math.max(0, q - cnt * m * m)); }
      return { mean: mean, ss: ss }; }
    function cellNcc(a, as, b, bs, cn) { var cw = cn.w / cn.cx, ch = cn.h / cn.cy, out = new Float32Array(cn.cx * cn.cy);
      for (var cy = 0; cy < cn.cy; cy++) for (var cx = 0; cx < cn.cx; cx++) { var ci = cy * cn.cx + cx, ma = as.mean[ci], mb = bs.mean[ci], s = 0, x, y; for (y = Math.round(cy * ch); y < Math.round((cy + 1) * ch); y++) for (x = Math.round(cx * cw); x < Math.round((cx + 1) * cw); x++) { var i = y * cn.w + x; s += (a[i] - ma) * (b[i] - mb); } var den = as.ss[ci] * bs.ss[ci]; out[ci] = den > 1e-3 ? s / den : 0; }
      return out; }

    function init(images) {
      /* images: [{ id:'00', gray:Uint8Array, w, h }] */
      initPat(); var t0 = Date.now(); S.cards = [];
      images.forEach(function (im) {
        var g = { d: im.gray, w: im.w, h: im.h }, feats = { x: [], y: [], d: [], a: [] }, i;
        o.dbWidths.forEach(function (W, wi) { var r = resizeArea(g, W, Math.round(W * g.h / g.w)), p = padWhite(r, BORD + 2), pad = BORD + 2, mm = CW / W;
          describe(p, fast(p, 16, o.dbPer[wi], 24, 6), feats, function (x) { return (x - pad + 0.5) * mm - CW / 2; }, function (x, y) { return (y - pad + 0.5) * mm - CH / 2; }); });
        if (o.tiltF > 0) for (var td = 0; td < o.tiltDirs; td++) o.tiltWidths.forEach(function (W, wi) { var r = resizeArea(g, W, Math.round(W * g.h / g.w)), sq = squeezed(r, td * Math.PI / o.tiltDirs, o.tiltF), mm = CW / W;
          describe(sq.g, fast(sq.g, 16, o.tiltPer[wi], 24, 6), feats, function (x, y) { return (sq.back(x, y)[0] + 0.5) * mm - CW / 2; }, function (x, y) { return (sq.back(x, y)[1] + 0.5) * mm - CH / 2; }, function (c, s) { return Math.atan2(sq.Ai[2] * c + sq.Ai[3] * s, sq.Ai[0] * c + sq.Ai[1] * s); }); });
        var tm = CN.map(function (cn) { var f = canon(g, cn); return { f: f, st: cellStats(f, cn) }; });
        S.cards.push({ id: im.id, name: NAMES[String(im.id).slice(-2)] || im.id, kind: KINDS[String(im.id).slice(-2)] || 'unknown', mm: { w: (im.mm && im.mm.w) || CW, h: (im.mm && im.mm.h) || CH }, n: feats.x.length, x: Float32Array.from(feats.x), y: Float32Array.from(feats.y), a: Float32Array.from(feats.a), d: Int32Array.from(feats.d), tm: tm });
      });
      /* how alike are the cards, cell by cell? weights for the identity check */
      S.cellW = CN.map(function (cn, ci) { var n = cn.cx * cn.cy, w = new Float32Array(n), pairs = 0; for (var a = 0; a < S.cards.length; a++) for (var b = a + 1; b < S.cards.length; b++) { var c = cellNcc(S.cards[a].tm[ci].f, S.cards[a].tm[ci].st, S.cards[b].tm[ci].f, S.cards[b].tm[ci].st, cn); for (var i = 0; i < n; i++) w[i] += 1 - Math.max(0, c[i]); pairs++; } for (var j = 0; j < n; j++) w[j] = pairs ? w[j] / pairs : 1; return w; });
      S.pairNcc = pairTable();
      S.meanTm = CN.map(function (cn, ci) { var f = new Float32Array(cn.w * cn.h); S.cards.forEach(function (c) { for (var i = 0; i < f.length; i++) f[i] += c.tm[ci].f[i] / S.cards.length; }); return { f: f, st: cellStats(f, cn) }; }); /* "any card": what the six have in common (border, banner, table) */
      if (o.dbMode !== 'all') filterDb();
      S.ready = true; S.stats.initMs = Date.now() - t0; S.stats.dbSizes = S.cards.map(function (c) { return c.n; }); return S.stats;
    }
    function pairTable() { var cn = CN[1], n = S.cards.length, T = []; for (var a = 0; a < n; a++) { T.push([]); for (var b = 0; b < n; b++) { var c = cellNcc(S.cards[a].tm[1].f, S.cards[a].tm[1].st, S.cards[b].tm[1].f, S.cards[b].tm[1].st, cn), s = 0; for (var i = 0; i < c.length; i++) s += c[i]; T[a].push(s / c.length); } } return T; }
    function filterDb() { /* 'distinct': drop a feature when two or more OTHER cards hold a look-alike near the same spot. 'region': keep the title and centre drawing only. */
      var kept = [];
      S.cards.forEach(function (c, ci) { var keep = [];
        for (var i = 0; i < c.n; i++) { var ok = true;
          if (o.dbMode === 'region') { var u = (c.x[i] + CW / 2) / CW, v = (c.y[i] + CH / 2) / CH; ok = (u > 0.2 && u < 0.8 && v > 0.08 && v < 0.27) || (u > 0.1 && u < 0.9 && v > 0.27 && v < 0.78); }
          else { var others = 0; for (var cj = 0; cj < S.cards.length && others < 2; cj++) { if (cj === ci) continue; var e = S.cards[cj], hit = false; for (var j = 0; j < e.n && !hit; j++) { if (Math.abs(e.x[j] - c.x[i]) > 10 || Math.abs(e.y[j] - c.y[i]) > 10) continue; var hmm = 0; for (var q = 0; q < 8; q++) hmm += pc(c.d[i * 8 + q] ^ e.d[j * 8 + q]); if (hmm <= 50) hit = true; } if (hit) others++; } ok = others < 2; }
          if (ok) keep.push(i); }
        kept.push(keep); });
      S.cards.forEach(function (c, ci) { var kp = kept[ci], x = new Float32Array(kp.length), y = new Float32Array(kp.length), aa = new Float32Array(kp.length), d = new Int32Array(kp.length * 8); kp.forEach(function (i, n) { x[n] = c.x[i]; y[n] = c.y[i]; aa[n] = c.a[i]; for (var q = 0; q < 8; q++) d[n * 8 + q] = c.d[i * 8 + q]; }); S.stats['kept' + c.id] = kp.length + '/' + c.n; c.x = x; c.y = y; c.a = aa; c.d = d; c.n = kp.length; });
    }

    function matchAll(fr) { /* every frame feature against every card's database; ratio test inside each card (a look-alike at the same spot does not count against it) */
      var M = { f: [], c: [], j: [], h: [] }, fd = fr.d, maxH = o.maxHam, rmm = o.ratioMM;
      for (var ci = 0; ci < S.cards.length; ci++) { var C = S.cards[ci], td = C.d, n = C.n;
        for (var i = 0; i < fr.n; i++) { var i8 = i * 8, a0 = fd[i8], a1 = fd[i8 + 1], a2 = fd[i8 + 2], a3 = fd[i8 + 3], a4 = fd[i8 + 4], a5 = fd[i8 + 5], a6 = fd[i8 + 6], a7 = fd[i8 + 7];
          var b1 = 999, b2 = 999, b3 = 999, j1 = -1, j2 = -1, j3 = -1, lim = maxH + 22;
          for (var j = 0, j8 = 0; j < n; j++, j8 += 8) { var h = pc(a0 ^ td[j8]); if (h > 13) continue; h += pc(a1 ^ td[j8 + 1]) + pc(a2 ^ td[j8 + 2]) + pc(a3 ^ td[j8 + 3]); if (h > (lim >> 1) + 4) continue; h += pc(a4 ^ td[j8 + 4]) + pc(a5 ^ td[j8 + 5]) + pc(a6 ^ td[j8 + 6]) + pc(a7 ^ td[j8 + 7]); if (h >= b3 || h > lim) continue;
            if (h < b1) { b3 = b2; j3 = j2; b2 = b1; j2 = j1; b1 = h; j1 = j; } else if (h < b2) { b3 = b2; j3 = j2; b2 = h; j2 = j; } else { b3 = h; j3 = j; } }
          if (j1 < 0 || b1 > maxH) continue;
          var second = 999; if (j2 >= 0 && (Math.abs(C.x[j2] - C.x[j1]) > rmm || Math.abs(C.y[j2] - C.y[j1]) > rmm)) second = b2; else if (j3 >= 0 && (Math.abs(C.x[j3] - C.x[j1]) > rmm || Math.abs(C.y[j3] - C.y[j1]) > rmm)) second = b3;
          if (b1 < o.ratio * second) { M.f.push(i); M.c.push(ci); M.j.push(j1); M.h.push(b1); } } }
      return M;
    }

    function flatten(fr, H, cn) { /* the picture under H, resampled to the canonical card size */
      var q0 = hApply(H, -CW / 2, -CH / 2), q1 = hApply(H, CW / 2, -CH / 2), q3 = hApply(H, -CW / 2, CH / 2), wpx = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]), hpx = Math.hypot(q3[0] - q0[0], q3[1] - q0[1]);
      var ratio = Math.min(wpx / cn.w, hpx / cn.h), lv = 0; while (lv + 1 < fr.pyr.length && ratio * fr.pyr[lv + 1].w / fr.w > 1.15) lv++;
      var g = fr.pyr[lv], sx = g.w / fr.w, sy = g.h / fr.h, f = new Float32Array(cn.w * cn.h), tmp = new Uint8Array(cn.w * cn.h), inside = 0;
      for (var y = 0; y < cn.h; y++) for (var x = 0; x < cn.w; x++) { var p = hApply(H, (x + 0.5) / cn.w * CW - CW / 2, (y + 0.5) / cn.h * CH - CH / 2); if (p[0] >= 0 && p[1] >= 0 && p[0] <= fr.w - 1 && p[1] <= fr.h - 1) inside++; tmp[y * cn.w + x] = bil(g.d, g.w, g.h, (p[0] + 0.5) * sx - 0.5, (p[1] + 0.5) * sy - 0.5); }
      var b = blur3b(tmp, cn.w, cn.h); for (var i = 0; i < f.length; i++) f[i] = b[i]; return { f: f, inside: inside / f.length };
    }
    function identify(fr, H, quad) { /* which card is under H? weighted cell-by-cell likeness with all six */
      var wpx = (Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]) + Math.hypot(quad[2][0] - quad[3][0], quad[2][1] - quad[3][1])) / 2, ci = wpx >= 150 ? 1 : 0, cn = CN[ci], fl = flatten(fr, H, cn), st = cellStats(fl.f, cn), W = S.cellW[ci], n = cn.cx * cn.cy;
      var per = S.cards.map(function (c) { return cellNcc(fl.f, st, c.tm[ci].f, c.tm[ci].st, cn); }), best = new Float32Array(n), i, k;
      for (i = 0; i < n; i++) { var m = -1; for (k = 0; k < per.length; k++) if (per[k][i] > m) m = per[k][i]; best[i] = m; }
      var vis = 0, tot = 0, scores = [], alls = []; for (i = 0; i < n; i++) { tot += W[i]; if (best[i] >= 0.2) vis += W[i]; }
      for (k = 0; k < per.length; k++) { var s = 0, a = 0; for (i = 0; i < n; i++) { var pv = per[k][i] > 0 ? per[k][i] : 0; s += W[i] * pv; a += pv; } scores.push(s / tot); alls.push(a / n); } /* a hidden or wrong cell counts as zero: a warped look-alike cannot win on a few good cells */
      var bi = 0, b2 = -1; for (k = 1; k < scores.length; k++) if (scores[k] > scores[bi]) bi = k; for (k = 0; k < scores.length; k++) if (k !== bi && (b2 < 0 || scores[k] > scores[b2])) b2 = k;
      /* one whole-card likeness as well: bold art has many near-blank cells, and a blank cell proves nothing */
      var T = S.cards[bi].tm[ci].f, sf = 0, st2 = 0, N = T.length; for (i = 0; i < N; i++) { sf += fl.f[i]; st2 += T[i]; } sf /= N; st2 /= N; var cft = 0, cff = 0, ctt = 0; for (i = 0; i < N; i++) { var df = fl.f[i] - sf, dt = T[i] - st2; cft += df * dt; cff += df * df; ctt += dt * dt; }
      var glob = cff > 1e-6 && ctt > 1e-6 ? cft / Math.sqrt(cff * ctt) : 0;
      return { best: bi, glob: glob, score: scores[bi], margin: scores[bi] - (b2 >= 0 ? scores[b2] : 0), all: alls[bi], visible: tot > 0 ? vis / tot : 0, inside: fl.inside, scores: scores };
    }

    function refineDense(fr, H, quad, k, forceS, radius) { /* nudge H so every cell of the flattened picture sits on the named card's own drawing; returns a better H or null */
      var wpx = (Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]) + Math.hypot(quad[2][0] - quad[3][0], quad[2][1] - quad[3][1])) / 2, ci = (wpx >= 150 && !forceS) ? 1 : 0, cn = CN[ci], fl = flatten(fr, H, cn).f, T = k < 0 ? S.meanTm[ci] : S.cards[k].tm[ci], cw = cn.w / cn.cx, ch = cn.h / cn.cy, Rr = radius || (ci ? 4 : 2), P = [], Q = [], tol = 0, tolN = 0;
      for (var cy = 0; cy < cn.cy; cy++) for (var cx = 0; cx < cn.cx; cx++) { var cidx = cy * cn.cx + cx; if (T.st.ss[cidx] < 60) continue; var x0 = Math.round(cx * cw), x1 = Math.round((cx + 1) * cw), y0 = Math.round(cy * ch), y1 = Math.round((cy + 1) * ch), mt = T.st.mean[cidx], bestV = -2, bx = 0, by = 0, grid = {};
        for (var dy = -Rr; dy <= Rr; dy++) for (var dx = -Rr; dx <= Rr; dx++) { if (x0 + dx < 0 || y0 + dy < 0 || x1 + dx > cn.w || y1 + dy > cn.h) continue; var s = 0, sf = 0, sff = 0, n = 0, x, y; for (y = y0; y < y1; y++) for (x = x0; x < x1; x++) { var fv = fl[(y + dy) * cn.w + x + dx], tv = T.f[y * cn.w + x] - mt; s += fv * tv; sf += fv; sff += fv * fv; n++; } var den = Math.sqrt(Math.max(1e-6, sff - sf * sf / n)) * T.st.ss[cidx], v = den > 1e-3 ? s / den : 0; grid[dx + ',' + dy] = v; if (v > bestV) { bestV = v; bx = dx; by = dy; } }
        tol += Math.max(0, bestV); tolN++; if (bestV < 0.45) continue;
        /* sub-cell peak by a parabola on each axis */
        var l = grid[(bx - 1) + ',' + by], r = grid[(bx + 1) + ',' + by], u = grid[bx + ',' + (by - 1)], d = grid[bx + ',' + (by + 1)], sx = bx, sy = by; if (l !== undefined && r !== undefined && 2 * bestV - l - r > 1e-6) sx += 0.5 * (r - l) / (2 * bestV - l - r); if (u !== undefined && d !== undefined && 2 * bestV - u - d > 1e-6) sy += 0.5 * (d - u) / (2 * bestV - u - d);
        var ux = (x0 + x1) / 2, uy = (y0 + y1) / 2; P.push([(ux / cn.w - 0.5) * CW / 100, (uy / cn.h - 0.5) * CH / 100]); var q = hApply(H, ((ux + sx) / cn.w - 0.5) * CW, ((uy + sy) / cn.h - 0.5) * CH); Q.push([(q[0] - fr.w / 2) / fr.w, (q[1] - fr.h / 2) / fr.w]); }
      if (P.length < 12) return null; var Hn = hFit(P, Q); if (!Hn) return null; tol = tolN ? tol / tolN : 0;
      var Hp = mul3([fr.w, 0, fr.w / 2, 0, fr.w, fr.h / 2, 0, 0, 1], mul3(Hn, [0.01, 0, 0, 0, 0.01, 0, 0, 0, 1])); Hp = Hp.map(function (v) { return v / Hp[8]; });
      var q4 = [[-CW / 2, -CH / 2], [CW / 2, -CH / 2], [CW / 2, CH / 2], [-CW / 2, CH / 2]].map(function (c) { return hApply(Hp, c[0], c[1]); }); return quadOK(q4, fr.w, fr.h) ? { H: Hp, corners: q4, cells: P.length, tol: tol } : null;
    }
    function findQuads(fr) { /* bright four-sided blobs in a small copy of the picture: a sheet of paper on a darker table */
      var g = fr.pyr[fr.pyr.length - 1]; if (g.w > 400) g = resizeArea(g, 320, Math.round(g.h * 320 / g.w));
      var w = g.w, h = g.h, d = g.d, I = new Uint32Array((w + 1) * (h + 1)), x, y, i, r = Math.round(w / 8), quads = [];
      for (y = 0; y < h; y++) { var rs = 0; for (x = 0; x < w; x++) { rs += d[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + rs; } }
      var mask = new Uint8Array(w * h), B = 8, bw = Math.ceil(w / B), bh = Math.ceil(h / B), bm = new Uint8Array(bw * bh), lm = new Uint8Array(bw * bh), bxx, byy;
      /* the brightest thing nearby (paper white, most of the time): block maxima, spread over a 5 x 5 block neighbourhood */
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var bi = ((y / B) | 0) * bw + ((x / B) | 0), v0 = (I[(Math.min(h, y + 2)) * (w + 1) + Math.min(w, x + 2)] - I[Math.max(0, y - 1) * (w + 1) + Math.min(w, x + 2)] - I[Math.min(h, y + 2) * (w + 1) + Math.max(0, x - 1)] + I[Math.max(0, y - 1) * (w + 1) + Math.max(0, x - 1)]) / ((Math.min(w, x + 2) - Math.max(0, x - 1)) * (Math.min(h, y + 2) - Math.max(0, y - 1))); if (v0 > bm[bi]) bm[bi] = v0; }
      for (byy = 0; byy < bh; byy++) for (bxx = 0; bxx < bw; bxx++) { var mxv = 0; for (var dy2 = -o.quadMaxR; dy2 <= o.quadMaxR; dy2++) for (var dx2 = -o.quadMaxR; dx2 <= o.quadMaxR; dx2++) { var xx2 = bxx + dx2, yy2 = byy + dy2; if (xx2 < 0 || yy2 < 0 || xx2 >= bw || yy2 >= bh) continue; if (bm[yy2 * bw + xx2] > mxv) mxv = bm[yy2 * bw + xx2]; } lm[byy * bw + bxx] = mxv; }
      for (y = 0; y < h; y++) { var y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1); for (x = 0; x < w; x++) { var x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1), mean = (I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0]) / ((x1 - x0) * (y1 - y0)); if (d[y * w + x] > mean * o.quadK + 5 && d[y * w + x] >= o.quadMaxK * lm[((y / B) | 0) * bw + ((x / B) | 0)]) mask[y * w + x] = 1; } }
      /* fill the ink holes inside a sheet (close), then shave thin bright streaks such as wood grain off it (open) */
      function morph(m, grow) { var m2 = new Uint8Array(w * h); for (var yy = 1; yy < h - 1; yy++) for (var xx = 1; xx < w - 1; xx++) { var ii = yy * w + xx, n = m[ii] + m[ii - 1] + m[ii + 1] + m[ii - w] + m[ii + w] + m[ii - w - 1] + m[ii - w + 1] + m[ii + w - 1] + m[ii + w + 1]; m2[ii] = grow ? (n > 0 ? 1 : 0) : (n === 9 ? 1 : 0); } return m2; }
      var er; for (er = 0; er < o.quadClose; er++) mask = morph(mask, true); for (er = 0; er < o.quadClose + o.quadErode; er++) mask = morph(mask, false);
      if (o.debug) S.dbg = { mask: mask.slice(), g: g, comps: [], sx: fr.w / w };
      var stack = new Int32Array(w * h), sx = fr.w / w, sy = fr.h / h; var qrnd = rng(977 + w);
      for (i = 0; i < w * h; i++) { if (mask[i] !== 1) continue; var top = 0, area = 0, pts = [], all = [], bx0 = w, bx1 = 0, by0 = h, by1 = 0; stack[top++] = i; mask[i] = 2;
        while (top) { var p = stack[--top], px = p % w, py = (p / w) | 0, edge = false; area++; all.push(p); if (px < bx0) bx0 = px; if (px > bx1) bx1 = px; if (py < by0) by0 = py; if (py > by1) by1 = py;
          if (px > 0) { if (mask[p - 1] === 1) { mask[p - 1] = 2; stack[top++] = p - 1; } else if (!mask[p - 1]) edge = true; } else edge = true;
          if (px < w - 1) { if (mask[p + 1] === 1) { mask[p + 1] = 2; stack[top++] = p + 1; } else if (!mask[p + 1]) edge = true; } else edge = true;
          if (py > 0) { if (mask[p - w] === 1) { mask[p - w] = 2; stack[top++] = p - w; } else if (!mask[p - w]) edge = true; } else edge = true;
          if (py < h - 1) { if (mask[p + w] === 1) { mask[p + w] = 2; stack[top++] = p + w; } else if (!mask[p + w]) edge = true; } else edge = true;
          if (edge) pts.push([px, py]); }
        if (area < 50 || area > w * h * 0.6 || pts.length < 12) { if (o.debug && area >= 50) S.dbg.comps.push({ why: 'size', area: area, pts: pts }); continue; }
        /* keep only the OUTSIDE rim of the blob (not the edges of ink holes inside it): flood the background in from the blob's bounding box */
        var gw = bx1 - bx0 + 3, gh = by1 - by0 + 3, grid = new Uint8Array(gw * gh), qd = [0], qh = 0; for (var ai = 0; ai < all.length; ai++) grid[(((all[ai] / w) | 0) - by0 + 1) * gw + (all[ai] % w) - bx0 + 1] = 1; grid[0] = 2;
        while (qh < qd.length) { var gp = qd[qh++], gx = gp % gw, gy = (gp / gw) | 0; if (gx > 0 && !grid[gp - 1]) { grid[gp - 1] = 2; qd.push(gp - 1); } if (gx < gw - 1 && !grid[gp + 1]) { grid[gp + 1] = 2; qd.push(gp + 1); } if (gy > 0 && !grid[gp - gw]) { grid[gp - gw] = 2; qd.push(gp - gw); } if (gy < gh - 1 && !grid[gp + gw]) { grid[gp + gw] = 2; qd.push(gp + gw); } }
        pts = pts.filter(function (p2) { var gi = (p2[1] - by0 + 1) * gw + p2[0] - bx0 + 1; return grid[gi - 1] === 2 || grid[gi + 1] === 2 || grid[gi - gw] === 2 || grid[gi + gw] === 2; }); if (pts.length < 12) continue;
        /* four straight OUTER edges of the blob, each found by trial lines through two edge pixels (a spur of wood grain or a covered corner does not spoil it) */
        if (pts.length > 500) { var keepN = pts.length / 500, sub = []; for (var si = 0; si < 500; si++) sub.push(pts[(si * keepN) | 0]); pts = sub; }
        var n = pts.length, usedP = new Uint8Array(n), lines = [], minLen2 = Math.max(16, 0.03 * area), k, t;
        for (var L = 0; L < 4; L++) { var bl = null, free = []; for (k = 0; k < n; k++) if (!usedP[k]) free.push(k); if (free.length < 6) break;
          for (var it = 0; it < 90; it++) { var p0 = pts[free[(qrnd() * free.length) | 0]], p1 = pts[free[(qrnd() * free.length) | 0]], ex = p1[0] - p0[0], ey = p1[1] - p0[1], el2 = ex * ex + ey * ey; if (el2 < minLen2) continue; var el = Math.sqrt(el2), na = -ey / el, nb = ex / el, nc = -(na * p0[0] + nb * p0[1]), inl = 0, pos = 0, neg = 0;
            for (k = 0; k < n; k++) { var dd = na * pts[k][0] + nb * pts[k][1] + nc; if (dd > 1.6) pos++; else if (dd < -1.6) neg++; else if (!usedP[k] && dd < 1.1 && dd > -1.1) inl++; }
            if (Math.min(pos, neg) > 0.07 * n) continue; if (!bl || inl > bl.inl) bl = { inl: inl, a: na, b: nb, c: nc, flip: neg > pos }; }
          if (!bl || bl.inl < Math.max(5, 0.05 * n)) break; if (bl.flip) { bl.a = -bl.a; bl.b = -bl.b; bl.c = -bl.c; }
          /* least-squares line through its inliers */
          var sxx = 0, sxy = 0, syy = 0, mx = 0, my = 0, cnt = 0; for (k = 0; k < n; k++) { var d1 = bl.a * pts[k][0] + bl.b * pts[k][1] + bl.c; if (!usedP[k] && d1 < 1.1 && d1 > -1.1) { mx += pts[k][0]; my += pts[k][1]; cnt++; } } mx /= cnt; my /= cnt;
          for (k = 0; k < n; k++) { var d2 = bl.a * pts[k][0] + bl.b * pts[k][1] + bl.c; if (!usedP[k] && d2 < 1.1 && d2 > -1.1) { var ux = pts[k][0] - mx, uy = pts[k][1] - my; sxx += ux * ux; sxy += ux * uy; syy += uy * uy; } }
          var th = 0.5 * Math.atan2(2 * sxy, sxx - syy), la = -Math.sin(th), lb = Math.cos(th); if (la * bl.a + lb * bl.b < 0) { la = -la; lb = -lb; } bl.a = la; bl.b = lb; bl.c = -(la * mx + lb * my);
          for (k = 0; k < n; k++) { var d3 = bl.a * pts[k][0] + bl.b * pts[k][1] + bl.c; if (d3 < 2.2 && d3 > -2.2) usedP[k] = 1; } lines.push(bl); }
        if (lines.length < 4) { if (o.debug) S.dbg.comps.push({ why: 'lines' + lines.length, area: area, pts: pts }); continue; }
        lines.sort(function (p, q2) { return Math.atan2(p.b, p.a) - Math.atan2(q2.b, q2.a); });
        var q = [], okq = true; for (k = 0; k < 4; k++) { var l1 = lines[k], l2 = lines[(k + 1) % 4], det = l1.a * l2.b - l2.a * l1.b; if (Math.abs(det) < 0.12) { okq = false; break; } q.push([(l1.b * l2.c - l2.b * l1.c) / det, (l2.a * l1.c - l1.a * l2.c) / det]); }
        if (!okq) { if (o.debug) S.dbg.comps.push({ why: 'parallel', area: area, pts: pts }); continue; }
        var sa = 0; for (k = 0; k < 4; k++) sa += q[k][0] * q[(k + 1) % 4][1] - q[(k + 1) % 4][0] * q[k][1]; if (sa < 0) { q = [q[0], q[3], q[2], q[1]]; sa = -sa; } sa /= 2;
        var okc = sa >= 60 && sa < w * h * 0.7 && area >= o.quadFill * sa && area <= 1.25 * sa; for (k = 0; k < 4 && okc; k++) { var qa = q[k], qb = q[(k + 1) % 4], qc = q[(k + 2) % 4]; if ((qb[0] - qa[0]) * (qc[1] - qb[1]) - (qb[1] - qa[1]) * (qc[0] - qb[0]) <= 0) okc = false; if (qa[0] < -w * 0.3 || qa[0] > w * 1.3 || qa[1] < -h * 0.3 || qa[1] > h * 1.3) okc = false; }
        if (o.debug) S.dbg.comps.push({ why: okc ? 'ok' : 'shape', area: area, sa: sa, pts: pts, q: q });
        if (!okc) continue;
        var cxq = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, cyq = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
        quads.push(q.map(function (p2) { var dx = p2[0] - cxq, dy = p2[1] - cyq, dl = Math.hypot(dx, dy) || 1, grow = 0.7 + 1.2 * o.quadErode; return [(p2[0] + 0.5 + dx / dl * grow) * sx - 0.5, (p2[1] + 0.5 + dy / dl * grow) * sy - 0.5]; })); if (quads.length >= o.maxQuads) break; }
      return quads;
    }
    function fromQuad(fr, q) { /* a paper-shaped outline: which way up is it, which card is it, and does the artwork really fit? */
      var src = [[-CW / 2, -CH / 2], [CW / 2, -CH / 2], [CW / 2, CH / 2], [-CW / 2, CH / 2]], cands = [], r, k;
      for (r = 0; r < 4; r++) { var dst = [q[r], q[(r + 1) % 4], q[(r + 2) % 4], q[(r + 3) % 4]], P = src.map(function (p) { return [p[0] / 100, p[1] / 100]; }), Q = dst.map(function (p) { return [(p[0] - fr.w / 2) / fr.w, (p[1] - fr.h / 2) / fr.w]; }), Hn = hFit(P, Q); if (!Hn) continue;
        var Hp = mul3([fr.w, 0, fr.w / 2, 0, fr.w, fr.h / 2, 0, 0, 1], mul3(Hn, [0.01, 0, 0, 0, 0.01, 0, 0, 0, 1])); Hp = Hp.map(function (v) { return v / Hp[8]; }); if (!quadOK(dst, fr.w, fr.h)) continue;
        var rd = refineDense(fr, Hp, dst, -1, true, 3); if (rd) cands.push(rd); else cands.push({ H: Hp, corners: dst, tol: 0 }); }
      cands.sort(function (a, b) { return b.tol - a.tol; }); var best = null;
      for (r = 0; r < cands.length && r < 2; r++) { var c = cands[r]; if (c.tol < 0.3) continue; var id = identify(fr, c.H, c.corners);
        for (var it = 0; it < 3; it++) { var rd2 = refineDense(fr, c.H, c.corners, id.best, it === 0, it === 0 ? 3 : 0); if (!rd2) break; var id2 = identify(fr, rd2.H, rd2.corners); if (id2.score >= id.score - 0.02) { c = rd2; id = id2; } else break; }
        if (!best || id.score > best.id.score) best = { c: c, id: id }; }
      if (!best) return null; var d = { inliers: 0, db: 'outline', via: 'outline', corners: best.c.corners, H: best.c.H, score: best.id.score, glob: best.id.glob, margin: best.id.margin, all: best.id.all, visible: best.id.visible, scores: best.id.scores };
      d.id = S.cards[best.id.best].id; d.name = S.cards[best.id.best].name; d.kind = S.cards[best.id.best].kind; d.ok = d.score >= o.quadNccMin && d.margin >= o.quadMargin && d.all >= o.quadNccAll && d.glob >= o.quadGlobMin; return d;
    }
    function detectFr(fr) { S.stats.rejected = []; S.stats.matches = 0; var out = o.features ? detectFeat(fr) : []; S.stats.quads = 0;
      if (o.quads) { var qs = findQuads(fr); S.stats.quads = qs.length; qs.forEach(function (q) { var cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4, k, t, taken = false;
        for (k = 0; k < out.length && !taken; k++) { var g = out[k].corners, ins = true; for (t = 0; t < 4; t++) { var a = g[t], b = g[(t + 1) % 4]; if ((b[0] - a[0]) * (cy - a[1]) - (b[1] - a[1]) * (cx - a[0]) < 0) { ins = false; break; } } if (ins) taken = true; } if (taken) return;
        var d = fromQuad(fr, q); if (!d) return; if (!d.ok) { S.stats.rejected.push({ id: d.id, db: 'outline', inliers: 0, score: d.score, margin: d.margin, all: d.all, corners: d.corners }); return; } delete d.ok;
        var prev = -1; for (k = 0; k < out.length; k++) if (out[k].id === d.id) prev = k; if (prev < 0) out.push(d); else if (d.score > out[prev].score + 0.1) out[prev] = d; }); }
      /* inside, every card is worked on as 210 x 148.5 units; hand back H in the card's own printed millimetres */
      out.forEach(function (d) { var c = null; for (var k = 0; k < S.cards.length; k++) if (S.cards[k].id === d.id) c = S.cards[k]; var fx = CW / c.mm.w, fy = CH / c.mm.h, H = d.H; d.H = [H[0] * fx, H[1] * fy, H[2], H[3] * fx, H[4] * fy, H[5], H[6] * fx, H[7] * fy, H[8]]; d.sizeMM = { w: c.mm.w, h: c.mm.h }; if (!d.via) d.via = 'corners'; });
      return out; }
    function detectFeat(fr) {
      var out = [], M = matchAll(fr), nM = M.f.length; S.lastMatches = M; var alive = new Uint8Array(nM).fill(1), rnd = rng(1234567 + nM), thr = 2 + fr.w / 640, thr2 = thr * thr;
      var fs = Math.max(fr.w, fr.h) / 2, fcx = fr.w / 2, fcy = fr.h / 2, cs = 100, i, k;
      var FX = new Float32Array(nM), FY = new Float32Array(nM), CX = new Float32Array(nM), CY = new Float32Array(nM);
      for (i = 0; i < nM; i++) { FX[i] = (fr.x[M.f[i]] - fcx) / fs; FY[i] = (fr.y[M.f[i]] - fcy) / fs; var C = S.cards[M.c[i]]; CX[i] = C.x[M.j[i]] / cs; CY[i] = C.y[M.j[i]] / cs; }
      var Tn = [fs, 0, fcx, 0, fs, fcy, 0, 0, 1], Tc = [1 / cs, 0, 0, 0, 1 / cs, 0, 0, 0, 1], tn = thr / fs, tn2 = tn * tn, stamp = new Int32Array(fr.n).fill(-1), stampN = 0;
      var cornersN = [[-CW / 2 / cs, -CH / 2 / cs], [CW / 2 / cs, -CH / 2 / cs], [CW / 2 / cs, CH / 2 / cs], [-CW / 2 / cs, CH / 2 / cs]];
      function quadOf(Hn) { return cornersN.map(function (c) { var p = hApply(Hn, c[0], c[1]); return [p[0] * fs + fcx, p[1] * fs + fcy]; }); }
      function inliers(Hn, list, pool) { var cnt = 0; stampN++; for (var pi = 0; pi < pool.length; pi++) { var m = pool[pi]; var w = Hn[6] * CX[m] + Hn[7] * CY[m] + Hn[8]; if (w < 1e-6) continue; var dx = (Hn[0] * CX[m] + Hn[1] * CY[m] + Hn[2]) / w - FX[m], dy = (Hn[3] * CX[m] + Hn[4] * CY[m] + Hn[5]) / w - FY[m]; if (dx * dx + dy * dy < tn2) { if (stamp[M.f[m]] !== stampN) { stamp[M.f[m]] = stampN; cnt++; if (list) list.push(m); } } } return cnt; }
      S.stats.matches = nM;
      function ransac(pool, iters) { /* all four picks from ONE card's database and close together in the picture */
        var bestN = 0, bestH = null, R2 = 0.35 * 0.35; if (pool.length < 4) return null;
        /* true matches all turn by about the same angle: keep the busiest quarter-turn of the turn histogram */
        var hist = new Int32Array(12), bins = new Int8Array(pool.length), pi2; for (pi2 = 0; pi2 < pool.length; pi2++) { var mm0 = pool[pi2], da = fr.a[M.f[mm0]] - S.cards[M.c[mm0]].a[M.j[mm0]]; da = ((da / (2 * Math.PI)) % 1 + 1) % 1; bins[pi2] = Math.min(11, (da * 12) | 0); hist[bins[pi2]]++; }
        var pk = 0, pkv = -1; for (pi2 = 0; pi2 < 12; pi2++) { var sm = hist[(pi2 + 11) % 12] + hist[pi2] + hist[(pi2 + 1) % 12]; if (sm > pkv) { pkv = sm; pk = pi2; } }
        var full = pool; pool = []; for (pi2 = 0; pi2 < full.length; pi2++) { var db2 = (bins[pi2] - pk + 12) % 12; if (db2 <= 1 || db2 === 11) pool.push(full[pi2]); } if (pool.length < 4) return null;
        /* two matches give a rough turn-scale-shift; the ones that gather the most neighbours are then upgraded: affine, then the full homography */
        var tops = [], it, n = pool.length, pkAng = (pk + 0.5) / 12 * 2 * Math.PI;
        for (it = 0; it < iters; it++) { var m0 = pool[(rnd() * n) | 0], m1 = pool[(rnd() * n) | 0]; if (m0 === m1 || M.f[m0] === M.f[m1]) continue;
          var cx = CX[m1] - CX[m0], cy = CY[m1] - CY[m0], dc = Math.hypot(cx, cy); if (dc < 0.25) continue; var fx = FX[m1] - FX[m0], fy = FY[m1] - FY[m0], df = Math.hypot(fx, fy), sc = df / dc, wpx = sc * 2.1 * fs; if (wpx < 36 || wpx > 1.5 * fr.w) continue;
          var rot = Math.atan2(fy, fx) - Math.atan2(cy, cx), dr = Math.abs((((rot - pkAng) / (2 * Math.PI)) % 1 + 1.5) % 1 - 0.5); if (dr > 0.17) continue;
          var ca = sc * Math.cos(rot), sa = sc * Math.sin(rot), tx = FX[m0] - (ca * CX[m0] - sa * CY[m0]), ty = FY[m0] - (sa * CX[m0] + ca * CY[m0]), tol2 = 0.2 * sc * 0.2 * sc, cnt = 0;
          for (pi2 = 0; pi2 < n; pi2++) { var m = pool[pi2], ex = ca * CX[m] - sa * CY[m] + tx - FX[m], ey = sa * CX[m] + ca * CY[m] + ty - FY[m]; if (ex * ex + ey * ey < tol2) cnt++; }
          if (cnt >= 5 && (tops.length < 4 || cnt > tops[tops.length - 1].n)) { tops.push({ n: cnt, A: [ca, -sa, tx, sa, ca, ty] }); tops.sort(function (p, q) { return q.n - p.n; }); if (tops.length > 4) tops.pop(); } }
        var bestH = null, bestN = 0;
        tops.forEach(function (tp) { var A = tp.A, tols = [0.2, 0.1, 0.06], list, pi3;
          for (var ti = 0; ti < tols.length; ti++) { var s2 = Math.sqrt(Math.abs(A[0] * A[4] - A[1] * A[3])), t2 = tols[ti] * s2 * tols[ti] * s2; list = []; stampN++;
            for (pi3 = 0; pi3 < n; pi3++) { var m = pool[pi3], ex = A[0] * CX[m] + A[1] * CY[m] + A[2] - FX[m], ey = A[3] * CX[m] + A[4] * CY[m] + A[5] - FY[m]; if (ex * ex + ey * ey < t2 && stamp[M.f[m]] !== stampN) { stamp[M.f[m]] = stampN; list.push(m); } }
            if (list.length < 5) return; var N1 = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], N2 = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
            list.forEach(function (m) { var r = [CX[m], CY[m], 1]; for (var a2 = 0; a2 < 3; a2++) { for (var c2 = 0; c2 < 3; c2++) { N1[a2][c2] += r[a2] * r[c2]; N2[a2][c2] += r[a2] * r[c2]; } N1[a2][3] += r[a2] * FX[m]; N2[a2][3] += r[a2] * FY[m]; } });
            var h1 = solveN(N1, 3), h2 = solveN(N2, 3); if (!h1 || !h2) return; A = [h1[0], h1[1], h1[2], h2[0], h2[1], h2[2]]; }
          var Hn = [A[0], A[1], A[2], A[3], A[4], A[5], 0, 0, 1]; if (!quadOK(quadOf(Hn), fr.w, fr.h)) return;
          if (list.length >= 8) { var H2 = hFit(list.map(function (m) { return [CX[m], CY[m]]; }), list.map(function (m) { return [FX[m], FY[m]]; })); if (H2 && quadOK(quadOf(H2), fr.w, fr.h)) { var keep = tn2; tn2 = keep * 6; var l3 = []; inliers(H2, l3, full); tn2 = keep; if (l3.length >= 8) { var H3 = hFit(l3.map(function (m) { return [CX[m], CY[m]]; }), l3.map(function (m) { return [FX[m], FY[m]]; })); if (H3 && quadOK(quadOf(H3), fr.w, fr.h)) Hn = H3; } } }
          var c = inliers(Hn, null, full); if (c > bestN) { bestN = c; bestH = Hn; } });
        return bestH ? { H: bestH, n: bestN } : null;
      }
      function refit(Hn, pool, loose) { var list = []; tn2 = tn * tn * (loose ? 6 : 1); inliers(Hn, list, pool); tn2 = tn * tn; if (list.length < 6) return null;
        for (var rf = 0; rf < 3; rf++) { var H2 = hFit(list.map(function (m) { return [CX[m], CY[m]]; }), list.map(function (m) { return [FX[m], FY[m]]; })); if (!H2 || !quadOK(quadOf(H2), fr.w, fr.h)) break; var l2 = [], c2 = inliers(H2, l2, pool); if (c2 >= list.length || rf === 0 && loose && c2 >= 6) { list = l2; Hn = H2; } else break; }
        return { H: Hn, list: list }; }
      function toPx(Hn) { var H = mul3(Tn, mul3(Hn, Tc)); return H.map(function (v) { return v / H[8]; }); }
      for (var round = 0; round < o.maxRounds; round++) {
        var byCard = S.cards.map(function () { return []; }), nLive = 0; for (i = 0; i < nM; i++) if (alive[i]) { byCard[M.c[i]].push(i); nLive++; } if (nLive < o.minInl) break;
        /* one candidate outline from each card's database; the best-looking one (dense check) wins the round */
        var best = null, used = [], any = false;
        for (k = 0; k < S.cards.length; k++) { if (byCard[k].length < o.minInl) continue; var rr = ransac(byCard[k], o.ransacIters); if (!rr || rr.n < o.minInl) continue; var fit = refit(rr.H, byCard[k], false); if (!fit) continue; any = true;
          var det = { inliers: fit.list.length, db: S.cards[k].id, corners: quadOf(fit.H), H: toPx(fit.H), list: fit.list }, idx2 = k;
          if (o.idMode === 'ncc') { var id = identify(fr, det.H, det.corners);
            if (id.best !== k && id.score >= o.nccMin * 0.6) { /* found through look-alike parts of another card: fit again on the named card's own features, then look again */
              var f2 = refit(fit.H, byCard[id.best], true); if (f2 && f2.list.length >= o.minInl) { var q2 = quadOf(f2.H), H2p = toPx(f2.H), id2 = identify(fr, H2p, q2); if (id2.score > id.score) { det.corners = q2; det.H = H2p; det.inliers = f2.list.length; det.list = det.list.concat(f2.list); id = id2; } } }
            if (o.dense && id.score >= o.nccMin * 0.6) for (var dr = 0; dr < 2; dr++) { var rd = refineDense(fr, det.H, det.corners, id.best); if (!rd) break; var id3 = identify(fr, rd.H, rd.corners); if (id3.best === id.best && id3.score >= id.score - 0.01) { det.H = rd.H; det.corners = rd.corners; det.cells = rd.cells; id = id3; } else break; }
            det.score = id.score; det.glob = id.glob; det.margin = id.margin; det.all = id.all; det.visible = id.visible; det.scores = id.scores; idx2 = id.best; det.ok = id.score >= o.nccMin && id.margin >= o.nccMargin && id.all >= o.nccAll && id.glob >= o.globMin; det.rank = id.score + id.margin; }
          else { det.score = det.inliers; det.ok = det.inliers >= o.inlMin; det.rank = det.inliers; }
          det.id = S.cards[idx2].id; det.name = S.cards[idx2].name; det.kind = S.cards[idx2].kind; used = used.concat(det.list);
          if (!best || (det.ok && !best.ok) || (det.ok === best.ok && det.rank > best.rank)) best = det; }
        if (!any) break;
        if (best.ok) { var lst = best.list; delete best.list; delete best.ok; delete best.rank; var prev = -1; for (k = 0; k < out.length; k++) if (out[k].id === best.id) prev = k; if (prev < 0) out.push(best); else if (best.score > out[prev].score) out[prev] = best;
          /* take this region's matches out and look for the next card */
          var gq = best.corners, cxq = (gq[0][0] + gq[1][0] + gq[2][0] + gq[3][0]) / 4, cyq = (gq[0][1] + gq[1][1] + gq[2][1] + gq[3][1]) / 4, big = gq.map(function (p) { return [cxq + (p[0] - cxq) * 1.06, cyq + (p[1] - cyq) * 1.06]; });
          for (i = 0; i < nM; i++) { if (!alive[i]) continue; var px = fr.x[M.f[i]], py = fr.y[M.f[i]], inq = true; for (k = 0; k < 4; k++) { var a = big[k], b = big[(k + 1) % 4]; if ((b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]) < 0) { inq = false; break; } } if (inq) alive[i] = 0; }
          lst.forEach(function (m) { alive[m] = 0; }); }
        else { S.stats.rejected.push({ id: best.id, db: best.db, inliers: best.inliers, score: best.score, margin: best.margin, all: best.all, visible: best.visible, corners: best.corners }); used.forEach(function (m) { alive[m] = 0; }); }
      }
      return out;
    }
    function detect(gray, w, h) { if (!S.ready) return []; var t0 = now(), fr = extract(gray, w, h, o), t1 = now(), r = detectFr(fr); S.stats.extractMs = t1 - t0; S.stats.matchMs = now() - t1; S.stats.features = fr.n; return r; }

    S.findQuads = findQuads; S.fromQuad = fromQuad;
    S.init = init; S.detect = detect; S.detectFr = detectFr; S.identify = identify; S.extract = function (g, w, h) { return extract(g, w, h, o); };
    return S;
  }
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

  /* ---------- pose from the homography ---------- */
  function rodrigues(w) { var th = Math.hypot(w[0], w[1], w[2]); if (th < 1e-12) return [1, -w[2], w[1], w[2], 1, -w[0], -w[1], w[0], 1]; var x = w[0] / th, y = w[1] / th, z = w[2] / th, c = Math.cos(th), s = Math.sin(th), v = 1 - c; return [c + x * x * v, x * y * v - z * s, x * z * v + y * s, y * x * v + z * s, c + y * y * v, y * z * v - x * s, z * x * v - y * s, z * y * v + x * s, c + z * z * v]; }
  function pose(det, K, sizeMM) {
    /* det.H maps the card's millimetres (centred; det.sizeMM says which size) to pixels. K = { fx, fy, cx, cy }. sizeMM (optional) = { w, h } of the card AS PRINTED, if the print came out at another scale. */
    if (!det || !det.H || !K || !K.fx) return null;
    var bw = (det.sizeMM && det.sizeMM.w) || DEF.cardW, bh = (det.sizeMM && det.sizeMM.h) || DEF.cardH, sw = (sizeMM && sizeMM.w ? sizeMM.w : bw) / bw, sh = (sizeMM && sizeMM.h ? sizeMM.h : bh) / bh, H = det.H;
    var Hs = [H[0] / sw, H[1] / sh, H[2], H[3] / sw, H[4] / sh, H[5], H[6] / sw, H[7] / sh, H[8]];
    var A = [(Hs[0] - K.cx * Hs[6]) / K.fx, (Hs[1] - K.cx * Hs[7]) / K.fx, (Hs[2] - K.cx * Hs[8]) / K.fx, (Hs[3] - K.cy * Hs[6]) / K.fy, (Hs[4] - K.cy * Hs[7]) / K.fy, (Hs[5] - K.cy * Hs[8]) / K.fy, Hs[6], Hs[7], Hs[8]];
    var n1 = Math.hypot(A[0], A[3], A[6]), n2 = Math.hypot(A[1], A[4], A[7]), lam = 2 / (n1 + n2); if (A[8] < 0) lam = -lam;
    var r1 = [A[0] / n1, A[3] / n1, A[6] / n1], r2 = [A[1] / n2, A[4] / n2, A[7] / n2]; if (lam < 0) { r1 = r1.map(function (v) { return -v; }); r2 = r2.map(function (v) { return -v; }); }
    var t = [A[2] * lam, A[5] * lam, A[8] * lam];
    /* nearest pair of orthonormal axes to r1, r2 */
    var c = [r1[0] + r2[0], r1[1] + r2[1], r1[2] + r2[2]], p = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]], d = [c[1] * p[2] - c[2] * p[1], c[2] * p[0] - c[0] * p[2], c[0] * p[1] - c[1] * p[0]];
    var nc = Math.hypot(c[0], c[1], c[2]), nd = Math.hypot(d[0], d[1], d[2]); c = c.map(function (v) { return v / nc; }); d = d.map(function (v) { return v / nd; });
    if (d[0] * r1[0] + d[1] * r1[1] + d[2] * r1[2] < 0) d = d.map(function (v) { return -v; });
    r1 = [(c[0] + d[0]) / Math.SQRT2, (c[1] + d[1]) / Math.SQRT2, (c[2] + d[2]) / Math.SQRT2]; r2 = [(c[0] - d[0]) / Math.SQRT2, (c[1] - d[1]) / Math.SQRT2, (c[2] - d[2]) / Math.SQRT2];
    var r3 = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]];
    var R = [r1[0], r2[0], r3[0], r1[1], r2[1], r3[1], r1[2], r2[2], r3[2]];
    /* Gauss-Newton on the six pose numbers against a 3 x 3 grid of card points seen through H */
    var W2 = bw * sw / 2, H2 = bh * sh / 2, obj = [], obs = [], i, j;
    for (i = -1; i <= 1; i++) for (j = -1; j <= 1; j++) { obj.push([i * W2, j * H2]); obs.push(hApply(Hs, i * W2, j * H2)); }
    function resid(Rm, tm) { var r = []; for (var n = 0; n < obj.length; n++) { var X = obj[n][0], Y = obj[n][1], x = Rm[0] * X + Rm[1] * Y + tm[0], y = Rm[3] * X + Rm[4] * Y + tm[1], z = Rm[6] * X + Rm[7] * Y + tm[2]; r.push(K.fx * x / z + K.cx - obs[n][0], K.fy * y / z + K.cy - obs[n][1]); } return r; }
    function cost(r) { var s = 0; for (var n = 0; n < r.length; n++) s += r[n] * r[n]; return s; }
    var r0 = resid(R, t), c0 = cost(r0);
    for (var iter = 0; iter < 8; iter++) { var J = [], eps = [1e-5, 1e-5, 1e-5, 1e-2, 1e-2, 1e-2];
      for (j = 0; j < 6; j++) { var w = [0, 0, 0], tt = t.slice(); if (j < 3) w[j] = eps[j]; else tt[j - 3] += eps[j]; var rj = resid(j < 3 ? mul3(rodrigues(w), R) : R, tt); J.push(rj.map(function (v, n) { return (v - r0[n]) / eps[j]; })); }
      var N = []; for (i = 0; i < 6; i++) { N.push([]); for (j = 0; j < 6; j++) { var s = 0; for (var n = 0; n < r0.length; n++) s += J[i][n] * J[j][n]; N[i].push(s + (i === j ? 1e-9 : 0)); } var b = 0; for (var n2 = 0; n2 < r0.length; n2++) b -= J[i][n2] * r0[n2]; N[i].push(b); }
      var dx = solveN(N, 6); if (!dx) break; var Rn = mul3(rodrigues([dx[0], dx[1], dx[2]]), R), tn = [t[0] + dx[3], t[1] + dx[4], t[2] + dx[5]], rn = resid(Rn, tn), cn = cost(rn); if (cn < c0) { R = Rn; t = tn; r0 = rn; var done = c0 - cn < 1e-10; c0 = cn; if (done) break; } else break; }
    var dist = Math.hypot(t[0], t[1], t[2]);
    /* the camera seen from the card: position = -R^T t ; height above the card plane is -z (z points into the table) */
    var cz = -(R[2] * t[0] + R[5] * t[1] + R[8] * t[2]);
    return { R: R, t: t, distance_mm: dist, elevation_deg: Math.asin(Math.max(-1, Math.min(1, -cz / dist))) * 180 / Math.PI, reproj_px: Math.sqrt(c0 / obj.length) };
  }

  var D = create();
  D.create = create; D.pose = pose; D.NAMES = NAMES; D.KINDS = KINDS; D.DEFAULTS = DEF;
  D.util = { resizeArea: resizeArea, hApply: hApply, hFit: hFit, mul3: mul3, inv3: inv3, rodrigues: rodrigues, rng: rng, bil: bil };
  D.grayFromRGBA = function (px, w, h) { var g = new Uint8Array(w * h); for (var i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8; return g; };
  D.SETS = { '1': { dir: 'art', mm: { w: 210, h: 148.5 }, label: 'Set 1: engraved, A5', files: { '00': '00_world_anchor_A5_artwork.png', '01': '01_blue_base_A5_artwork.png', '02': '02_red_base_A5_artwork.png', '03': '03_capture_flag_A5_artwork.png', '04': '04_hill_A5_artwork.png', '05': '05_build_camp_A5_artwork.png' } },
    '2': { dir: 'art2', mm: { w: 148, h: 105 }, label: 'Set 2: bold woodcut, A6', files: { '00': '00_world_anchor.png', '01': '01_blue_base.png', '02': '02_red_base.png', '03': '03_capture_flag.png', '04': '04_hill.png', '05': '05_build_camp.png' } } };
  D.DEFAULT_SET = '2'; /* Set 2 named no card wrongly in 978 showings; Set 1 did 10 times. See RECOGNITION_REPORT.md */
  D.CARD_FILES = { '00': '00_world_anchor_A5_artwork.png', '01': '01_blue_base_A5_artwork.png', '02': '02_red_base_A5_artwork.png', '03': '03_capture_flag_A5_artwork.png', '04': '04_hill_A5_artwork.png', '05': '05_build_camp_A5_artwork.png' };
  return D;
})();
