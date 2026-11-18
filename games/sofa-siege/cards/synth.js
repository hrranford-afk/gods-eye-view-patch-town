/* synth.js: make-believe camera frames of the printed cards lying on a table.
   Used by the offline recognition test (Node) and by cards.html?demo=1 (browser).
   One global: CARD_SYNTH. Plain JavaScript, no libraries. Everything is seeded.
   World: the table is the plane Z = 0, Z up, millimetres. Camera: x right, y down, z forward.
   A card's own frame: x right along the artwork, y down the artwork, z into the table. */
var CARD_SYNTH = (function () {
  'use strict';
  var CW = 210, CH = 148.5;
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = 0; for (var i = 0; i < 6; i++) u += r(); return (u - 3) * 1.4142; }
  function mips(g) { var L = [g]; while (L[L.length - 1].w > 16) { var p = L[L.length - 1], w = p.w >> 1, h = p.h >> 1, d = new Uint8Array(w * h); for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var i = 2 * y * p.w + 2 * x; d[y * w + x] = (p.d[i] + p.d[i + 1] + p.d[i + p.w] + p.d[i + p.w + 1] + 2) >> 2; } L.push({ d: d, w: w, h: h }); } return L; }
  function bil(d, w, h, x, y) { if (x < 0) x = 0; if (y < 0) y = 0; if (x > w - 1.001) x = w - 1.001; if (y > h - 1.001) y = h - 1.001; var x0 = x | 0, y0 = y | 0, ax = x - x0, ay = y - y0, i = y0 * w + x0; return (d[i] * (1 - ax) + d[i + 1] * ax) * (1 - ay) + (d[i + w] * (1 - ax) + d[i + w + 1] * ax) * ay; }
  function sampleMip(L, u, v, lod) { /* u, v in 0..1 */ if (lod < 0) lod = 0; if (lod > L.length - 1.001) lod = L.length - 1.001; var l = lod | 0, f = lod - l, a = L[l], b = L[l + 1]; return bil(a.d, a.w, a.h, u * a.w - 0.5, v * a.h - 0.5) * (1 - f) + bil(b.d, b.w, b.h, u * b.w - 0.5, v * b.h - 0.5) * f; }
  function noise2(seed) { var r = rng(seed), T = new Float32Array(4096); for (var i = 0; i < 4096; i++) T[i] = r(); return function (x, y) { var x0 = Math.floor(x), y0 = Math.floor(y), ax = x - x0, ay = y - y0; ax = ax * ax * (3 - 2 * ax); ay = ay * ay * (3 - 2 * ay); function h(i, j) { return T[((i * 73856093) ^ (j * 19349663)) & 4095]; } return (h(x0, y0) * (1 - ax) + h(x0 + 1, y0) * ax) * (1 - ay) + (h(x0, y0 + 1) * (1 - ax) + h(x0 + 1, y0 + 1) * ax) * ay; }; }
  function mul3(A, B) { var C = new Array(9); for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return C; }
  function inv3(m) { var a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5], g = m[6], h = m[7], i = m[8], A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C; return [A / det, (c * h - b * i) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, (c * d - a * f) / det, C / det, (b * g - a * h) / det, (a * e - b * d) / det]; }
  function ap(H, x, y) { var w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; }

  /* ---------- the table top: wood, or wood/cloth with clutter ---------- */
  function tableTexture(seed, kind) {
    var r = rng(seed), N = 1024, mm = 2.5, d = new Float32Array(N * N), n1 = noise2(seed + 1), n2 = noise2(seed + 2), ang = r() * Math.PI, ca = Math.cos(ang), sa = Math.sin(ang), base = 70 + r() * 110, pw = 70 + r() * 70, cloth = kind === 'clutter' && r() < 0.35, x, y, i;
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) { var X = (x - N / 2) * mm, Y = (y - N / 2) * mm, a = X * ca + Y * sa, b = -X * sa + Y * ca, v;
      if (cloth) v = base + 10 * n1(X / 40, Y / 40) + 6 * ((x + y) & 1);
      else { var pl = Math.floor(b / pw), tone = ((pl * 2654435761) >>> 0) / 4294967296 * 36 - 18, g = b - pl * pw; v = base + tone + 26 * (n1(a / 160 + pl * 7.3, b / 5) - 0.5) + 14 * (n2(a / 35, b / 1.8) - 0.5) + 10 * Math.sin(b / 3.1 + 5 * n1(a / 300, b / 40)); if (g < 2.6 || g > pw - 0.5) v -= 38; }
      d[y * N + x] = v; }
    if (kind === 'clutter') { var cnt = 14 + (r() * 14 | 0);
      for (var k = 0; k < cnt; k++) { var ox = (r() - 0.5) * 1100, oy = (r() - 0.5) * 1100, type = (r() * 5) | 0, w = 30 + r() * 170, h = 30 + r() * 150, th = r() * Math.PI, c = Math.cos(th), s = Math.sin(th), tone2 = 30 + r() * 210, ink = tone2 > 128 ? tone2 - 90 - r() * 60 : tone2 + 90 + r() * 60, lh = 3 + r() * 6;
        var R = Math.hypot(w, h) / 2 / mm + 2, x0 = Math.max(0, Math.floor(ox / mm + N / 2 - R)), x1 = Math.min(N - 1, Math.ceil(ox / mm + N / 2 + R)), y0 = Math.max(0, Math.floor(oy / mm + N / 2 - R)), y1 = Math.min(N - 1, Math.ceil(oy / mm + N / 2 + R));
        for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) { var dx = (x - N / 2) * mm - ox, dy = (y - N / 2) * mm - oy, lx = dx * c + dy * s, ly = -dx * s + dy * c, val = -1;
          if (type === 0) { if (Math.abs(lx) < w / 2 && Math.abs(ly) < h / 2) { val = tone2; var row = Math.floor((ly + h / 2) / lh), fr = (ly + h / 2) / lh - row; if (Math.abs(lx) < w / 2 - 8 && Math.abs(ly) < h / 2 - 8 && fr < 0.45 && n1(lx / 3.5 + row * 11, row) > 0.35) val = ink; } } /* a printed page: rows of dashes */
          else if (type === 1) { var rr = Math.hypot(lx, ly), rad = Math.min(w, h) / 2; if (rr < rad) val = rr > rad * 0.82 ? ink : rr > rad * 0.74 ? tone2 * 0.8 : tone2; } /* a cup or coaster */
          else if (type === 2) { if (Math.abs(lx) < w / 2 && Math.abs(ly) < 4) val = ink; } /* a pen */
          else if (type === 3) { if (Math.abs(lx) < w / 2 && Math.abs(ly) < h / 2) val = ((Math.floor(lx / 12) + Math.floor(ly / 12)) & 1) ? tone2 : ink; } /* a chequered thing */
          else { if (Math.abs(lx) < w / 2 && Math.abs(ly) < h / 2) val = tone2 + 40 * (n2(lx / 6, ly / 6) - 0.5) + (Math.abs(lx) > w / 2 - 3 || Math.abs(ly) > h / 2 - 3 ? -40 : 0); } /* a book or box */
          if (val >= 0) d[y * N + x] = val; } } }
    var det = new Float32Array(256 * 256), nd = noise2(seed + 3); for (i = 0; i < det.length; i++) { var px = i & 255, py = i >> 8; det[i] = 1 + 0.07 * (nd(px / 2.2, py / 2.2) - 0.5) + 0.05 * (r() - 0.5); }
    return { d: d, N: N, mm: mm, det: det, wall: 110 + r() * 90 };
  }
  function texAt(T, X, Y) { var N = T.N, fx = X / T.mm + N / 2, fy = Y / T.mm + N / 2, per = 2 * (N - 1); fx = ((fx % per) + per) % per; if (fx > N - 1) fx = per - fx; fy = ((fy % per) + per) % per; if (fy > N - 1) fy = per - fy; var v = bil(T.d, N, N, fx, fy), dx = Math.floor(X / 0.45) & 255, dy = Math.floor(Y / 0.45) & 255; return v * T.det[dy * 256 + dx]; }

  /* ---------- pages that are NOT one of the six cards ---------- */
  function makeDecoys(images, seed) {
    var r = rng(seed), out = [], w = images[0].w, h = Math.min.apply(null, images.map(function (m) { return m.h; })), x, y, i;
    /* D1: the hill card's border around shuffled, mirrored tiles of the other cards' middles */
    var b = images[4 % images.length], d1 = new Uint8Array(w * h), tx = 6, ty = 4, ix0 = Math.round(w * 0.075), ix1 = Math.round(w * 0.925), iy0 = Math.round(h * 0.09), iy1 = Math.round(h * 0.9), tw = (ix1 - ix0) / tx, thh = (iy1 - iy0) / ty, map = [];
    for (i = 0; i < tx * ty; i++) map.push({ c: (r() * images.length) | 0, t: (r() * tx * ty) | 0, flip: r() < 0.5 });
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { if (x < ix0 || x >= ix1 || y < iy0 || y >= iy1) { d1[y * w + x] = b.gray[y * b.w + x]; continue; } var cx = Math.min(tx - 1, Math.floor((x - ix0) / tw)), cy = Math.min(ty - 1, Math.floor((y - iy0) / thh)), m = map[cy * tx + cx], sx = (x - ix0) - cx * tw, sy = (y - iy0) - cy * thh, scx = m.t % tx, scy = (m.t / tx) | 0, im = images[m.c]; if (m.flip) sx = tw - 1 - sx; d1[y * w + x] = im.gray[Math.min(im.h - 1, Math.round(iy0 + scy * thh + sy)) * im.w + Math.min(im.w - 1, Math.round(ix0 + scx * tw + sx))]; }
    out.push({ id: 'D1', gray: d1, w: w, h: h });
    /* D2: the blue card's border around a made-up line drawing */
    var b2 = images[1 % images.length], d2 = new Uint8Array(w * h), n1 = noise2(seed + 9), shapes = [];
    for (i = 0; i < 26; i++) shapes.push({ x: ix0 + r() * (ix1 - ix0), y: iy0 + r() * (iy1 - iy0), rad: 12 + r() * 90, t: (r() * 3) | 0, a: r() * Math.PI, lw: 1.2 + r() * 2.5 });
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { if (x < ix0 || x >= ix1 || y < iy0 || y >= iy1) { d2[y * w + x] = b2.gray[y * b2.w + x]; continue; } var v = 246, hatch = n1(x / 90, y / 90) > 0.55 && ((x + 2 * y) % 9) < 2; if (hatch) v = 150;
      for (i = 0; i < shapes.length; i++) { var s = shapes[i], dx = x - s.x, dy = y - s.y, q; if (s.t === 0) { q = Math.abs(Math.hypot(dx, dy) - s.rad); if (q < s.lw) v = 25; } else if (s.t === 1) { var lx = dx * Math.cos(s.a) + dy * Math.sin(s.a), ly = -dx * Math.sin(s.a) + dy * Math.cos(s.a); if (Math.abs(lx) < s.rad && Math.abs(ly) < s.rad * 0.6 && (Math.abs(Math.abs(lx) - s.rad) < 2 * s.lw || Math.abs(Math.abs(ly) - s.rad * 0.6) < 2 * s.lw)) v = 25; } else { var l2 = dx * Math.cos(s.a) + dy * Math.sin(s.a), p2 = -dx * Math.sin(s.a) + dy * Math.cos(s.a); if (Math.abs(l2) < s.rad * 1.5 && Math.abs(p2) < s.lw) v = 25; } }
      d2[y * w + x] = v; }
    out.push({ id: 'D2', gray: d2, w: w, h: h });
    /* D3: a plain printed page of text-like rows, no border */
    var d3 = new Uint8Array(w * h), n3 = noise2(seed + 11); for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var row = Math.floor(y / 22), fy = y - row * 22, v3 = 246; if (x > 60 && x < w - 60 && y > 50 && y < h - 50 && fy > 6 && fy < 17 && n3(x / 9 + row * 31, row * 0.37) > 0.3 && n3(x / 2.2, y / 2.6 + row) > 0.42) v3 = 30; d3[y * w + x] = v3; }
    out.push({ id: 'D3', gray: d3, w: w, h: h });
    return out;
  }

  /* ---------- scenes ---------- */
  function camera(w, h, C, T, roll) { var f = 0.9 * w, K = [f, 0, w / 2, 0, f, h / 2, 0, 0, 1], z = [T[0] - C[0], T[1] - C[1], T[2] - C[2]], n = Math.hypot(z[0], z[1], z[2]); z = [z[0] / n, z[1] / n, z[2] / n];
    var x = [z[1], -z[0], 0], nx = Math.hypot(x[0], x[1]); x = [x[0] / nx, x[1] / nx, 0]; var y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    var c = Math.cos(roll), s = Math.sin(roll), x2 = [x[0] * c + y[0] * s, x[1] * c + y[1] * s, x[2] * c + y[2] * s], y2 = [-x[0] * s + y[0] * c, -x[1] * s + y[1] * c, -x[2] * s + y[2] * c];
    var R = [x2[0], x2[1], x2[2], y2[0], y2[1], y2[2], z[0], z[1], z[2]], t = [-(R[0] * C[0] + R[1] * C[1] + R[2] * C[2]), -(R[3] * C[0] + R[4] * C[1] + R[5] * C[2]), -(R[6] * C[0] + R[7] * C[1] + R[8] * C[2])];
    return { w: w, h: h, K: K, R: R, t: t, C: C, intr: { fx: f, fy: f, cx: w / 2, cy: h / 2 } }; }
  function placeCard(cam, id, P, yaw) { var cx = [Math.cos(yaw), Math.sin(yaw), 0], cy = [Math.sin(yaw), -Math.cos(yaw), 0], cz = [0, 0, -1], R = cam.R, t = cam.t;
    function rot(v) { return [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]]; }
    var a = rot(cx), b = rot(cy), c = rot(cz), p = rot(P); p = [p[0] + t[0], p[1] + t[1], p[2] + t[2]];
    var H = mul3(cam.K, [a[0], b[0], p[0], a[1], b[1], p[1], a[2], b[2], p[2]]), corners = [[-CW / 2, -CH / 2], [CW / 2, -CH / 2], [CW / 2, CH / 2], [-CW / 2, CH / 2]].map(function (q) { return ap(H, q[0], q[1]); });
    var dv = [cam.C[0] - P[0], cam.C[1] - P[1], cam.C[2] - P[2]], dist = Math.hypot(dv[0], dv[1], dv[2]);
    return { id: id, P: P, yaw: yaw, H: H.map(function (v) { return v / H[8]; }), Hraw: H, corners: corners, R: [a[0], b[0], c[0], a[1], b[1], c[1], a[2], b[2], c[2]], t: p, dist: dist, elev: Math.asin(dv[2] / dist) * 180 / Math.PI, occl: 0 }; }
  function inFrame(c, w, h, m) { return c.corners.every(function (p) { return p[0] > m && p[1] > m && p[0] < w - m && p[1] < h - m; }); }
  function singleScene(r, w, h, id, dBand, eBand) { /* one card, distance and elevation drawn from the bands, any rotation */
    for (var tries = 0; tries < 400; tries++) { var d = (dBand[0] + r() * (dBand[1] - dBand[0])) * 1000, e = (eBand[0] + r() * (eBand[1] - eBand[0])) * Math.PI / 180, az = r() * 2 * Math.PI, roll = (r() - 0.5) * 24 * Math.PI / 180, off = 0.3 * d;
      var C = [d * Math.cos(e) * Math.cos(az), d * Math.cos(e) * Math.sin(az), d * Math.sin(e)], T = [(r() - 0.5) * off, (r() - 0.5) * off, 0], cam = camera(w, h, C, T, roll), card = placeCard(cam, id, [0, 0, 0], 0);
      if (inFrame(card, w, h, 6)) return { cam: cam, cards: [card] }; }
    return null; }
  function multiScene(r, w, h, ids) { /* two to four pages on the table at once */
    for (var tries = 0; tries < 600; tries++) { var pos = [], ok = true, i, j; for (i = 0; i < ids.length && ok; i++) { var g = 0, p; do { p = [(r() - 0.5) * 620, (r() - 0.5) * 620, 0]; g++; } while (g < 60 && pos.some(function (q) { return Math.hypot(q[0] - p[0], q[1] - p[1]) < 265; })); if (g >= 60) ok = false; pos.push(p); } if (!ok) continue;
      var mx = 0, my = 0; pos.forEach(function (p) { mx += p[0] / pos.length; my += p[1] / pos.length; });
      var d = (0.6 + r() * 0.9) * 1000, e = (32 + r() * 43) * Math.PI / 180, az = r() * 2 * Math.PI, roll = (r() - 0.5) * 20 * Math.PI / 180, C = [mx + d * Math.cos(e) * Math.cos(az), my + d * Math.cos(e) * Math.sin(az), d * Math.sin(e)], cam = camera(w, h, C, [mx + (r() - 0.5) * 60, my + (r() - 0.5) * 60, 0], roll);
      var cards = ids.map(function (id, k) { return placeCard(cam, id, pos[k], r() * 2 * Math.PI); }); if (cards.every(function (c) { return inFrame(c, w, h, 4); })) return { cam: cam, cards: cards }; }
    return null; }
  function emptyScene(r, w, h) { var d = (0.4 + r() * 1.1) * 1000, e = (20 + r() * 55) * Math.PI / 180, az = r() * 2 * Math.PI; return { cam: camera(w, h, [d * Math.cos(e) * Math.cos(az), d * Math.cos(e) * Math.sin(az), d * Math.sin(e)], [(r() - 0.5) * 200, (r() - 0.5) * 200, 0], (r() - 0.5) * 0.4), cards: [] }; }

  /* ---------- drawing a frame ---------- */
  function render(scene, lib, seed, fx) {
    /* lib: { id: mip list } ; fx: { bg:'wood'|'clutter', blur, noise, glare:bool, occlude:0..0.3, light:bool } (anything left out is drawn at random) */
    var r = rng(seed), cam = scene.cam, w = cam.w, h = cam.h, F = new Float32Array(w * h), x, y, i; fx = fx || {};
    var T = tableTexture(seed ^ 0x5bd1e995, fx.bg || (r() < 0.5 ? 'wood' : 'clutter'));
    var Ht = mul3(cam.K, [cam.R[0], cam.R[1], cam.t[0], cam.R[3], cam.R[4], cam.t[1], cam.R[6], cam.R[7], cam.t[2]]), Hi = inv3(Ht), nw = noise2(seed + 77);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { var W = Hi[6] * x + Hi[7] * y + Hi[8], X = (Hi[0] * x + Hi[1] * y + Hi[2]) / W, Y = (Hi[3] * x + Hi[4] * y + Hi[5]) / W, z = cam.R[6] * X + cam.R[7] * Y + cam.t[2]; F[y * w + x] = (z > 0 && z < 6000) ? texAt(T, X, Y) : T.wall + 30 * (nw(x / 90, y / 90) - 0.5) - 0.05 * y; }
    var SS = w >= 1000 ? 2 : 3;
    scene.cards.forEach(function (c) { var L = lib[c.id], Hc = inv3(c.Hraw), white = 205 + r() * 40, black = 18 + r() * 34, mnx = w, mny = h, mxx = 0, mxy = 0; c.corners.forEach(function (p) { mnx = Math.min(mnx, p[0]); mxx = Math.max(mxx, p[0]); mny = Math.min(mny, p[1]); mxy = Math.max(mxy, p[1]); });
      mnx = Math.max(0, Math.floor(mnx) - 1); mny = Math.max(0, Math.floor(mny) - 1); mxx = Math.min(w - 1, Math.ceil(mxx) + 1); mxy = Math.min(h - 1, Math.ceil(mxy) + 1); var base = L[0].w / CW;
      for (var py = mny; py <= mxy; py++) for (var px = mnx; px <= mxx; px++) { var p0 = ap(Hc, px, py), p1 = ap(Hc, px + 1, py), p2 = ap(Hc, px, py + 1), rho = Math.max(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), Math.hypot(p2[0] - p0[0], p2[1] - p0[1])) * base / SS, lod = rho > 1 ? Math.log(rho) / Math.LN2 : 0, acc = 0, cov = 0;
        for (var sy = 0; sy < SS; sy++) for (var sx = 0; sx < SS; sx++) { var q = ap(Hc, px + (sx + 0.5) / SS - 0.5, py + (sy + 0.5) / SS - 0.5), u = q[0] / CW + 0.5, v = q[1] / CH + 0.5; if (u < 0 || v < 0 || u > 1 || v > 1) continue; acc += black + (white - black) * sampleMip(L, u, v, lod) / 255; cov++; }
        if (cov) { var n = SS * SS, k = py * w + px; F[k] = (acc + F[k] * (n - cov)) / n; } }
      c.white = white; });
    /* something lying across part of a card */
    scene.cards.forEach(function (c) { var frac = fx.occlude !== undefined ? fx.occlude : 0; if (c.occlWant !== undefined) frac = c.occlWant; if (!(frac > 0)) return; var th = r() * 2 * Math.PI, nx = Math.cos(th), ny = Math.sin(th), lo = -140, hi = 140, cc = 0, it, gx, gy;
      for (it = 0; it < 22; it++) { cc = (lo + hi) / 2; var cnt = 0; for (gy = 0; gy < 20; gy++) for (gx = 0; gx < 28; gx++) if (nx * ((gx + 0.5) / 28 - 0.5) * CW + ny * ((gy + 0.5) / 20 - 0.5) * CH > cc) cnt++; if (cnt / 560 > frac) lo = cc; else hi = cc; }
      var tone = r() < 0.5 ? 150 + r() * 60 : 40 + r() * 50, Hc = inv3(c.Hraw), no = noise2(seed + 5), ex = 60, cs = [[-CW / 2 - ex, -CH / 2 - ex], [CW / 2 + ex, -CH / 2 - ex], [CW / 2 + ex, CH / 2 + ex], [-CW / 2 - ex, CH / 2 + ex]].map(function (q) { return ap(c.Hraw, q[0], q[1]); }), mnx = w, mny = h, mxx = 0, mxy = 0; cs.forEach(function (p) { mnx = Math.min(mnx, p[0]); mxx = Math.max(mxx, p[0]); mny = Math.min(mny, p[1]); mxy = Math.max(mxy, p[1]); });
      mnx = Math.max(0, Math.floor(mnx)); mny = Math.max(0, Math.floor(mny)); mxx = Math.min(w - 1, Math.ceil(mxx)); mxy = Math.min(h - 1, Math.ceil(mxy));
      for (var py = mny; py <= mxy; py++) for (var px = mnx; px <= mxx; px++) { var q = ap(Hc, px, py); if (Math.abs(q[0]) > CW / 2 + ex || Math.abs(q[1]) > CH / 2 + ex) continue; var s = nx * q[0] + ny * q[1] - cc; if (s > 0) F[py * w + px] = tone + 22 * (no(q[0] / 14, q[1] / 14) - 0.5) - (s < 2 ? 25 : 0); }
      c.occl = frac; });
    /* uneven light, a mild glare patch, blur, sensor noise */
    var la = r() * 2 * Math.PI, lx = Math.cos(la), ly = Math.sin(la), l0 = 0.62 + r() * 0.2, l1 = 0.95 + r() * 0.17, diag = Math.hypot(w, h), glare = fx.glare !== undefined ? fx.glare : r() < 0.4, gx0 = 0, gy0 = 0, gr = 1, ga = 0;
    if (glare) { if (scene.cards.length) { var gc = scene.cards[(r() * scene.cards.length) | 0], gp = ap(gc.Hraw, (r() - 0.5) * CW * 0.8, (r() - 0.5) * CH * 0.8); gx0 = gp[0]; gy0 = gp[1]; gc.glare = true; } else { gx0 = r() * w; gy0 = r() * h; } gr = (0.04 + r() * 0.08) * w; ga = 35 + r() * 55; }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { i = y * w + x; var tt = ((x - w / 2) * lx + (y - h / 2) * ly) / diag + 0.5, v = F[i] * (l0 + (l1 - l0) * tt); if (glare) { var dd = ((x - gx0) * (x - gx0) + (y - gy0) * (y - gy0)) / (gr * gr); if (dd < 9) v += ga * Math.exp(-dd); } F[i] = v; }
    var sig = fx.blur !== undefined ? fx.blur : 0.35 + r() * 1.0 * (w / 1280 * 0.5 + 0.5), rad = Math.max(1, Math.ceil(sig * 2.5)), ker = [], ks = 0; for (i = -rad; i <= rad; i++) { var kv = Math.exp(-i * i / (2 * sig * sig)); ker.push(kv); ks += kv; }
    var G = new Float32Array(w * h), a, kk;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { a = 0; for (kk = -rad; kk <= rad; kk++) { var xx = x + kk; if (xx < 0) xx = 0; if (xx >= w) xx = w - 1; a += F[y * w + xx] * ker[kk + rad]; } G[y * w + x] = a / ks; }
    var ns = fx.noise !== undefined ? fx.noise : 2 + r() * 4, out = new Uint8Array(w * h);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) { a = 0; for (kk = -rad; kk <= rad; kk++) { var yy = y + kk; if (yy < 0) yy = 0; if (yy >= h) yy = h - 1; a += G[yy * w + x] * ker[kk + rad]; } a = a / ks + ns * gauss(r); out[y * w + x] = a < 0 ? 0 : a > 255 ? 255 : a; }
    return { gray: out, w: w, h: h, blur: sig, noise: ns, glare: glare, truth: scene.cards };
  }
  return { rng: rng, mips: mips, makeDecoys: makeDecoys, camera: camera, placeCard: placeCard, singleScene: singleScene, multiScene: multiScene, emptyScene: emptyScene, render: render, CW: CW, CH: CH };
})();
