/* room-kit vision.js v1: the room kit's picture maths, shared by the sticker lock, the room snapshots and (off) the totem matcher.
   Moved byte for byte from Base Camp build 30 (games/base-camp/index.html): the sticker maths (stkGray ... stkFit) and the FAST + rotated BRIEF matcher FEAT.
   Pure functions and one object: nothing here runs at load time, nothing reads game state. Run-time globals used: FEAT.init and FEAT.find call seededRandom (Base Camp's basics; the kit's core.js later).
   Loaded with a plain <script> before the game's own script. Source of truth: games/room-kit/vision.js; each game carries a copy in <game>/room-kit/ (node games/room-kit/tools/kit-check.cjs --sync).
   No top-level names that HelloXR / gl-matrix define (see KIT_PLAN.md, ground rules). Never run prettier on this file. ============ */
/* ---- sticker maths: pictures, corners, pose (no globals of js-aruco2 are used here: the library window is passed in) ---- */
function stkGray(px, w, h) { const g = new Uint8Array(w * h); for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8; return g; }
function stkAt(g, w, h, x, y) { if (x < 0 || y < 0 || x > w - 1.001 || y > h - 1.001) return -1; const x0 = x | 0, y0 = y | 0, ax = x - x0, ay = y - y0, i = y0 * w + x0; return (g[i] * (1 - ax) + g[i + 1] * ax) * (1 - ay) + (g[i + w] * (1 - ax) + g[i + w + 1] * ax) * ay; }
function stkRefine(g, w, h, cs) { /* sub-pixel corners: each side of the black square is found along its normal (strongest step from paper to black), a line is fitted, neighbouring lines meet at the corners */
  const lines = [];
  for (let e = 0; e < 4; e++) {
    const a = cs[e], b = cs[(e + 1) % 4], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 8) return null;
    const tx = dx / L, ty = dy / L, nx = -ty, ny = tx, cell = L / 6, r = Math.max(1.5, Math.min(4, cell * 0.35)), pts = [];
    const ctr = [(cs[0][0] + cs[2][0]) / 2, (cs[0][1] + cs[2][1]) / 2], out = ((a[0] + b[0]) / 2 - ctr[0]) * nx + ((a[1] + b[1]) / 2 - ctr[1]) * ny > 0 ? 1 : -1; /* the normal points out of the square */
    const N = Math.max(6, Math.min(30, Math.round(L / 3)));
    for (let k = 0; k < N; k++) {
      const f = 0.12 + 0.76 * k / (N - 1), px = a[0] + dx * f, py = a[1] + dy * f; let best = 0, bs = 0, prof = [];
      for (let s = -r - 0.5, i = 0; s <= r + 0.5 + 1e-9; s += 0.25, i++) prof.push(stkAt(g, w, h, px + nx * out * s, py + ny * out * s));
      if (prof.some((v) => v < 0)) continue;
      for (let i = 1; i < prof.length - 1; i++) { const gr = prof[i + 1] - prof[i - 1]; if (gr > bs) { bs = gr; best = i; } } /* outward the picture gets brighter: black -> paper */
      if (bs < 12 || best < 2 || best > prof.length - 3) continue;
      const g0 = prof[best] - prof[best - 2], g1 = prof[best + 1] - prof[best - 1], g2 = prof[best + 2] - prof[best], den = g0 - 2 * g1 + g2, off = Math.abs(den) > 1e-6 ? Math.max(-0.5, Math.min(0.5, 0.5 * (g0 - g2) / den)) : 0;
      const s = -r - 0.5 + (best + off) * 0.25; pts.push([px + nx * out * s, py + ny * out * s]);
    }
    if (pts.length < 4) return null;
    let mx = 0, my = 0; for (const p of pts) { mx += p[0]; my += p[1]; } mx /= pts.length; my /= pts.length;
    let sxx = 0, sxy = 0, syy = 0; for (const p of pts) { const u = p[0] - mx, v = p[1] - my; sxx += u * u; sxy += u * v; syy += v * v; }
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy); lines.push({ mx, my, dx: Math.cos(th), dy: Math.sin(th) });
  }
  const out = [];
  for (let e = 0; e < 4; e++) { const A = lines[(e + 3) % 4], B = lines[e], det = A.dx * -B.dy - A.dy * -B.dx; if (Math.abs(det) < 1e-6) return null; const qx = B.mx - A.mx, qy = B.my - A.my, s = (qx * -B.dy - qy * -B.dx) / det, p = [A.mx + A.dx * s, A.my + A.dy * s]; if (Math.hypot(p[0] - cs[e][0], p[1] - cs[e][1]) > 3) return null; out.push(p); }
  return out;
}
function stkIntr(w, h, P) { /* the camera picture's intrinsics from the XR view's projection matrix: the screen shows the middle of the picture (aspect fill), square pixels */
  const av = P[5] / P[0], ai = w / h; let fx, fy; if (ai >= av) { fy = P[5] * h / 2; fx = fy; } else { fx = P[0] * w / 2; fy = fx; }
  return { fx, fy, cx: w / 2 - fx * P[8] / P[0], cy: h / 2 + fy * P[9] / P[5] };
}
function stkRot(w) { const th = Math.hypot(w[0], w[1], w[2]); if (th < 1e-12) return [[1, -w[2], w[1]], [w[2], 1, -w[0]], [-w[1], w[0], 1]]; const k = [w[0] / th, w[1] / th, w[2] / th], c = Math.cos(th), s = Math.sin(th), v = 1 - c; return [[c + k[0] * k[0] * v, k[0] * k[1] * v - k[2] * s, k[0] * k[2] * v + k[1] * s], [k[1] * k[0] * v + k[2] * s, c + k[1] * k[1] * v, k[1] * k[2] * v - k[0] * s], [k[2] * k[0] * v - k[1] * s, k[2] * k[1] * v + k[0] * s, c + k[2] * k[2] * v]]; }
function stkMul(A, B) { const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]; return C; }
function stkRes(R, t, cs, K, S) { /* reprojection residuals of the four corners (posit's camera: x right, y up, z forward) */
  const hh = S / 2, M = [[-hh, hh], [hh, hh], [hh, -hh], [-hh, -hh]], r = [];
  for (let i = 0; i < 4; i++) { const X = R[0][0] * M[i][0] + R[0][1] * M[i][1] + t[0], Y = R[1][0] * M[i][0] + R[1][1] * M[i][1] + t[1], Z = R[2][0] * M[i][0] + R[2][1] * M[i][1] + t[2]; if (Z <= 1e-3) return null; r.push(K.cx + K.fx * X / Z - cs[i][0], K.cy - K.fy * Y / Z - cs[i][1]); }
  return r;
}
function stkGN(R, t, cs, K, S) { /* Gauss-Newton on the six pose numbers */
  let r = stkRes(R, t, cs, K, S); if (!r) return null; let e = r.reduce((a, v) => a + v * v, 0);
  for (let it = 0; it < 12; it++) {
    const J = [], eps = 1e-6;
    for (let p = 0; p < 6; p++) { const d = [0, 0, 0, 0, 0, 0]; d[p] = eps; const R2 = p < 3 ? stkMul(stkRot([d[0], d[1], d[2]]), R) : R, t2 = [t[0] + d[3], t[1] + d[4], t[2] + d[5]], r2 = stkRes(R2, t2, cs, K, S); if (!r2) return null; J.push(r2.map((v, i) => (v - r[i]) / eps)); }
    const A = [], b = []; for (let i = 0; i < 6; i++) { A.push([]); let s = 0; for (let k = 0; k < 8; k++) s += J[i][k] * r[k]; b.push(-s); for (let j = 0; j < 6; j++) { let q = 0; for (let k = 0; k < 8; k++) q += J[i][k] * J[j][k]; A[i].push(q + (i === j ? 1e-9 + q * 1e-6 : 0)); } }
    for (let i = 0; i < 6; i++) { let pv = i; for (let k = i + 1; k < 6; k++) if (Math.abs(A[k][i]) > Math.abs(A[pv][i])) pv = k; [A[i], A[pv]] = [A[pv], A[i]]; [b[i], b[pv]] = [b[pv], b[i]]; if (Math.abs(A[i][i]) < 1e-18) return { R, t, e }; for (let k = i + 1; k < 6; k++) { const f = A[k][i] / A[i][i]; for (let j = i; j < 6; j++) A[k][j] -= f * A[i][j]; b[k] -= f * b[i]; } }
    const x = [0, 0, 0, 0, 0, 0]; for (let i = 5; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < 6; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; }
    const R2 = stkMul(stkRot([x[0], x[1], x[2]]), R), t2 = [t[0] + x[3], t[1] + x[4], t[2] + x[5]], r2 = stkRes(R2, t2, cs, K, S); if (!r2) break; const e2 = r2.reduce((a, v) => a + v * v, 0);
    if (e2 >= e) break; R = R2; t = t2; r = r2; const de = e - e2; e = e2; if (de < 1e-10) break;
  }
  return { R, t, e };
}
function stkPose(lib, cs, K, S) { /* posit (both of its answers) refined with Gauss-Newton; the one with the smaller reprojection error wins */
  const P = new lib.POS.Posit(S, K.fx), pose = P.pose(cs.map((c) => ({ x: c[0] - K.cx, y: K.cy - c[1] })));
  const cands = []; for (const [R, t] of [[pose.bestRotation, pose.bestTranslation], [pose.alternativeRotation, pose.alternativeTranslation]]) { if (!R || !t || !(t[2] > 0) || R.some((row) => row.some((v) => !isFinite(v)))) continue; const q = stkGN(R.map((row) => row.slice()), t.slice(), cs, K, S); if (q) cands.push(q); }
  if (!cands.length) return null; cands.sort((a, b) => a.e - b.e); const best = cands[0], rms = Math.sqrt(best.e / 4);
  return { R: best.R, t: best.t, rms, amb: cands.length > 1 ? Math.sqrt(cands[1].e / 4) / Math.max(0.05, rms) : 99 };
}
function stkWorldPose(q, V) { /* posit's camera -> XR camera (z flipped) -> world (V: the viewer's camera-to-world matrix, column-major) */
  const c = [q.t[0], q.t[1], -q.t[2]], ax = [q.R[0][0], q.R[1][0], -q.R[2][0]], ay = [q.R[0][1], q.R[1][1], -q.R[2][1]];
  const tw = (v, w) => [V[0] * v[0] + V[4] * v[1] + V[8] * v[2] + w * V[12], V[1] * v[0] + V[5] * v[1] + V[9] * v[2] + w * V[13], V[2] * v[0] + V[6] * v[1] + V[10] * v[2] + w * V[14]];
  const p = tw(c, 1), X = tw(ax, 0), Y = tw(ay, 0), n = [X[1] * Y[2] - X[2] * Y[1], X[2] * Y[0] - X[0] * Y[2], X[0] * Y[1] - X[1] * Y[0]];
  return { p, ax: X, ay: Y, n, dist: Math.hypot(q.t[0], q.t[1], q.t[2]) };
}
function stkDetect(lib, det, img) { /* js-aruco2's detect() step by step, except notTooNear: it drops the smaller of two nested squares, which is the sticker itself when its white edge shows against a darker wall */
  const CV = lib.CV; CV.grayscale(img, det.grey); CV.adaptiveThreshold(det.grey, det.thres, 2, 7); det.contours = CV.findContours(det.thres, det.binary);
  let c = det.findCandidates(det.contours, img.width * 0.01, 0.05, 10); c = det.clockwiseCorners(c);
  const keep = []; for (const q of c) if (!keep.some((k) => k.every((p, i) => Math.abs(p.x - q[i].x) + Math.abs(p.y - q[i].y) < 3))) keep.push(q);
  const out = []; for (const m of det.findMarkers(det.grey, keep, 49)) { const c = m.corners, cx = (c[0].x + c[2].x) / 2, cy = (c[0].y + c[2].y) / 2, per = CV.perimeter(c), j = out.findIndex((o) => o.id === m.id && Math.hypot(o.cx - cx, o.cy - cy) < 0.15 * o.per); if (j < 0) out.push(Object.assign(m, { cx, cy, per })); else if (per > out[j].per) out[j] = Object.assign(m, { cx, cy, per }); } /* the same sticker found twice (the outside and the inside of its black edge): the bigger outline is the edge */
  return out;
}
function stkSolve(A, b) { const n = b.length; A = A.map((r) => r.slice()); b = b.slice(); for (let i = 0; i < n; i++) { let pv = i; for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[pv][i])) pv = k; [A[i], A[pv]] = [A[pv], A[i]]; [b[i], b[pv]] = [b[pv], b[i]]; if (Math.abs(A[i][i]) < 1e-18) return null; for (let k = i + 1; k < n; k++) { const f = A[k][i] / A[i][i]; for (let j = i; j < n; j++) A[k][j] -= f * A[i][j]; b[k] -= f * b[i]; } } const x = new Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; } return x; }
function stkInv(A) { const n = A.length, out = []; for (let j = 0; j < n; j++) { const e = new Array(n).fill(0); e[j] = 1; const x = stkSolve(A, e); if (!x) return null; out.push(x); } return out.map((c, j) => c.map((_, i) => out[i][j])); }
function stkRes2(Rm, p, obs, S) { /* every corner of every sighting, projected from one world pose of the sticker (Rm: sticker -> world, columns x right, y up, z out) */
  const hh = S / 2, M = [[-hh, hh], [hh, hh], [hh, -hh], [-hh, -hh]], r = [];
  for (const o of obs) { const V = o.V, K = o.K;
    for (let j = 0; j < 4; j++) { const w = [p[0] + Rm[0][0] * M[j][0] + Rm[0][1] * M[j][1], p[1] + Rm[1][0] * M[j][0] + Rm[1][1] * M[j][1], p[2] + Rm[2][0] * M[j][0] + Rm[2][1] * M[j][1]], d = [w[0] - V[12], w[1] - V[13], w[2] - V[14]];
      const X = V[0] * d[0] + V[1] * d[1] + V[2] * d[2], Y = V[4] * d[0] + V[5] * d[1] + V[6] * d[2], Z = V[8] * d[0] + V[9] * d[1] + V[10] * d[2]; if (Z > -1e-3) return null;
      r.push(K.cx + K.fx * X / -Z - o.cs[j][0], K.cy - K.fy * Y / -Z - o.cs[j][1]); } }
  return r;
}
function stkFit(obs, S, R0, p0) { /* one sticker pose that explains all the sightings (Gauss-Newton; the viewer poses are taken as exact), with its uncertainty */
  let R = R0.map((r) => r.slice()), p = p0.slice(), r = stkRes2(R, p, obs, S); if (!r) return null; let e = r.reduce((a, v) => a + v * v, 0), JtJ = null;
  const step = (x) => [stkMul(stkRot([x[0], x[1], x[2]]), R), [p[0] + x[3], p[1] + x[4], p[2] + x[5]]];
  for (let it = 0; it < 15; it++) {
    const J = [], eps = 1e-6; for (let q = 0; q < 6; q++) { const d = [0, 0, 0, 0, 0, 0]; d[q] = eps; const [R2, p2] = step(d), r2 = stkRes2(R2, p2, obs, S); if (!r2) return null; J.push(r2.map((v, i) => (v - r[i]) / eps)); }
    const A = [], b = []; for (let i = 0; i < 6; i++) { A.push([]); let s = 0; for (let k = 0; k < r.length; k++) s += J[i][k] * r[k]; b.push(-s); for (let j = 0; j < 6; j++) { let q = 0; for (let k = 0; k < r.length; k++) q += J[i][k] * J[j][k]; A[i].push(q); } }
    JtJ = A; const x = stkSolve(A.map((row, i) => row.map((v, j) => v + (i === j ? 1e-9 + v * 1e-6 : 0))), b); if (!x) break;
    const [R2, p2] = step(x), r2 = stkRes2(R2, p2, obs, S); if (!r2) break; const e2 = r2.reduce((a, v) => a + v * v, 0); if (e2 >= e) break;
    R = R2; p = p2; r = r2; const de = e - e2; e = e2; if (de < 1e-9) break;
  }
  const N = r.length, s2 = Math.max(0.25 * 0.25, e / Math.max(1, N - 6)), C = JtJ && stkInv(JtJ), per = obs.map((o, i) => Math.sqrt((r[8 * i] ** 2 + r[8 * i + 1] ** 2 + r[8 * i + 2] ** 2 + r[8 * i + 3] ** 2 + r[8 * i + 4] ** 2 + r[8 * i + 5] ** 2 + r[8 * i + 6] ** 2 + r[8 * i + 7] ** 2) / 4));
  return { R, p, rms: Math.sqrt(e / Math.max(1, N / 2)), per, sdYaw: C ? Math.sqrt(Math.max(0, s2 * C[1][1])) * 57.2958 : 99, sdP: C ? Math.sqrt(Math.max(0, s2 * (C[3][3] + C[4][4] + C[5][5]))) : 9 };
}
// ---- the matcher ----
const FEAT = {
  pat: null, circ: [[0, -3], [1, -3], [2, -2], [3, -1], [3, 0], [3, 1], [2, 2], [1, 3], [0, 3], [-1, 3], [-2, 2], [-3, 1], [-3, 0], [-3, -1], [-2, -2], [-1, -3]], BORD: 20,
  init() { if (this.pat) return; const r = seededRandom(20240611), g = () => { let s = 0; for (let i = 0; i < 4; i++) s += r(); return Math.max(-12, Math.min(12, Math.round((s - 2) * 7))); }; this.pat = new Int8Array(1024); for (let i = 0; i < 1024; i++) this.pat[i] = g(); },
  gray(src, sw, sh, maxW) { const s = Math.min(1, maxW / sw), w = Math.max(32, Math.round(sw * s)), h = Math.max(32, Math.round(sh * s)); if (!this.cv) { this.cv = document.createElement('canvas'); this.cx = this.cv.getContext('2d', { willReadFrequently: true }); } this.cv.width = w; this.cv.height = h; this.cx.drawImage(src, 0, 0, w, h);
    const px = this.cx.getImageData(0, 0, w, h).data, d = new Uint8Array(w * h); for (let i = 0, j = 0; i < d.length; i++, j += 4) d[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8; return { d, w, h }; },
  resize(g, nw, nh) { const o = new Uint8Array(nw * nh), sx = g.w / nw, sy = g.h / nh; for (let y = 0; y < nh; y++) { const fy = Math.min(g.h - 1.001, y * sy), y0 = fy | 0, ay = fy - y0; for (let x = 0; x < nw; x++) { const fx = Math.min(g.w - 1.001, x * sx), x0 = fx | 0, ax = fx - x0, i = y0 * g.w + x0; o[y * nw + x] = (g.d[i] * (1 - ax) + g.d[i + 1] * ax) * (1 - ay) + (g.d[i + g.w] * (1 - ax) + g.d[i + g.w + 1] * ax) * ay; } } return { d: o, w: nw, h: nh }; },
  blur(g) { const o = new Uint8Array(g.d.length), w = g.w, h = g.h, d = g.d; for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; o[i] = (d[i - w - 1] + d[i - w] + d[i - w + 1] + d[i - 1] + d[i] + d[i + 1] + d[i + w - 1] + d[i + w] + d[i + w + 1]) / 9; } return o; },
  corners(g, thr, maxN) { const w = g.w, h = g.h, d = g.d, B = this.BORD, off = this.circ.map(([x, y]) => y * w + x), sc = new Int16Array(w * h), pts = [];
    for (let y = B; y < h - B; y++) for (let x = B; x < w - B; x++) {
      const i = y * w + x, p = d[i], hi = p + thr, lo = p - thr; let nb = 0, nd = 0; for (const q of [0, 4, 8, 12]) { const v = d[i + off[q]]; if (v > hi) nb++; else if (v < lo) nd++; } if (nb < 3 && nd < 3) continue;
      let run = 0, best = 0, s = 0, kind = 0; for (let t = 0; t < 25; t++) { const v = d[i + off[t & 15]]; const b = v > hi ? 1 : v < lo ? -1 : 0; if (b !== 0 && b === kind) { run++; s += Math.abs(v - p); } else { kind = b; run = b ? 1 : 0; s = b ? Math.abs(v - p) : 0; } if (run > best) best = run; if (run >= 9) { sc[i] = Math.min(32000, s + 1); break; } }
    }
    for (let y = B; y < h - B; y++) for (let x = B; x < w - B; x++) { const i = y * w + x, s = sc[i]; if (!s) continue; if (s >= sc[i - 1] && s >= sc[i + 1] && s >= sc[i - w] && s >= sc[i + w] && s >= sc[i - w - 1] && s >= sc[i + w + 1] && s >= sc[i - w + 1] && s >= sc[i + w - 1]) pts.push([x, y, s]); }
    pts.sort((a, b) => b[2] - a[2]); return pts.slice(0, maxN); },
  describe(g, pts, scaleBack, lvl, out) { const bl = this.blur(g), w = g.w, P = this.pat;
    for (const [x, y] of pts) { let m10 = 0, m01 = 0; for (let dy = -15; dy <= 15; dy++) { const hw = Math.floor(Math.sqrt(225 - dy * dy)); for (let dx = -hw; dx <= hw; dx++) { const v = g.d[(y + dy) * w + x + dx]; m10 += dx * v; m01 += dy * v; } }
      const a = Math.atan2(m01, m10), c = Math.cos(a), s = Math.sin(a), ds = new Int32Array(8);
      const samp = (px, py) => { const fx = Math.floor(px), fy = Math.floor(py), ax = px - fx, ay = py - fy, i = fy * w + fx; return (bl[i] * (1 - ax) + bl[i + 1] * ax) * (1 - ay) + (bl[i + w] * (1 - ax) + bl[i + w + 1] * ax) * ay; }; // bilinear: rotated sample points do not snap to pixels
      for (let k = 0; k < 256; k++) { const x1 = P[k * 4], y1 = P[k * 4 + 1], x2 = P[k * 4 + 2], y2 = P[k * 4 + 3]; if (samp(x + x1 * c - y1 * s, y + x1 * s + y1 * c) < samp(x + x2 * c - y2 * s, y + x2 * s + y2 * c)) ds[k >> 5] |= 1 << (k & 31); }
      out.x.push(x * scaleBack); out.y.push(y * scaleBack); out.l.push(lvl); for (let q = 0; q < 8; q++) out.d.push(ds[q]); } },
  extract(gray, levels, perLevel, thr) { this.init(); const out = { x: [], y: [], l: [], d: [] }; let sc = 1, g = gray;
    for (let l = 0; l < levels; l++) { if (l) { sc *= 0.75; g = this.resize(gray, Math.round(gray.w * sc), Math.round(gray.h * sc)); } if (g.w < 80 || g.h < 80) break; this.describe(g, this.corners(g, thr || 18, perLevel), 1 / sc, l, out); }
    return { n: out.x.length, x: Float32Array.from(out.x), y: Float32Array.from(out.y), d: Int32Array.from(out.d), w: gray.w, h: gray.h }; },
  pc(v) { v = v - ((v >>> 1) & 0x55555555); v = (v & 0x33333333) + ((v >>> 2) & 0x33333333); return (((v + (v >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24; },
  match(tp, fr) { const pairs = [], td = tp.d, fd = fr.d, pc = this.pc;
    for (let i = 0; i < fr.n; i++) { let b1 = 999, b2 = 999, bj = -1; const i8 = i * 8; for (let j = 0; j < tp.n; j++) { const j8 = j * 8; let h = pc(fd[i8] ^ td[j8]) + pc(fd[i8 + 1] ^ td[j8 + 1]) + pc(fd[i8 + 2] ^ td[j8 + 2]) + pc(fd[i8 + 3] ^ td[j8 + 3]); if (h > b2) continue; h += pc(fd[i8 + 4] ^ td[j8 + 4]) + pc(fd[i8 + 5] ^ td[j8 + 5]) + pc(fd[i8 + 6] ^ td[j8 + 6]) + pc(fd[i8 + 7] ^ td[j8 + 7]); if (h < b1) { b2 = b1; b1 = h; bj = j; } else if (h < b2) b2 = h; }
      if (bj >= 0 && b1 <= 80 && b1 < 0.85 * b2) pairs.push([bj, i, b1]); }
    return pairs; },
  homog(P, Q) { // 4 pairs -> 3x3 (h33 = 1), or null
    const A = []; for (let i = 0; i < 4; i++) { const [x, y] = P[i], [u, v] = Q[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]); A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]); }
    for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; if (Math.abs(A[p][c]) < 1e-9) return null; [A[c], A[p]] = [A[p], A[c]]; for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k]; } }
    return [A[0][8] / A[0][0], A[1][8] / A[1][1], A[2][8] / A[2][2], A[3][8] / A[3][3], A[4][8] / A[4][4], A[5][8] / A[5][5], A[6][8] / A[6][6], A[7][8] / A[7][7], 1]; },
  apply(H, x, y) { const w = H[6] * x + H[7] * y + 1; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; },
  solve(A, n) { // Gaussian elimination on an n x (n+1) system
    for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; if (Math.abs(A[p][c]) < 1e-12) return null; [A[c], A[p]] = [A[p], A[c]]; for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; } }
    return A.map((row, i) => row[n] / row[i]); },
  fitAff(P, Q) { // least squares affine map (6 numbers): stable for the outline of a roughly front-on totem
    const A = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], B = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    for (let i = 0; i < P.length; i++) { const r = [P[i][0], P[i][1], 1]; for (let a = 0; a < 3; a++) { for (let c = 0; c < 3; c++) { A[a][c] += r[a] * r[c]; B[a][c] += r[a] * r[c]; } A[a][3] += r[a] * Q[i][0]; B[a][3] += r[a] * Q[i][1]; } }
    const hx = this.solve(A, 3), hy = this.solve(B, 3); return hx && hy ? [hx[0], hx[1], hx[2], hy[0], hy[1], hy[2], 0, 0, 1] : null; },
  fit(P, Q) { // least squares homography (h33 = 1) over many pairs, via the normal equations
    const N = Array.from({ length: 8 }, () => new Array(9).fill(0)); for (let i = 0; i < P.length; i++) { const [x, y] = P[i], [u, v] = Q[i]; for (const [row, b] of [[[x, y, 1, 0, 0, 0, -u * x, -u * y], u], [[0, 0, 0, x, y, 1, -v * x, -v * y], v]]) for (let a = 0; a < 8; a++) { for (let c = 0; c < 8; c++) N[a][c] += row[a] * row[c]; N[a][8] += row[a] * b; } }
    const h = this.solve(N, 8); return h ? h.concat([1]) : null; },
  find(tp, fr, opt) { // template tp, frame features fr -> { found, inl, matches, quad, H } (RANSAC over the ratio-tested matches; coordinates are centred and scaled first)
    opt = opt || {}; const pairs = this.match(tp, fr), out = { found: false, inl: 0, matches: pairs.length, quad: null };
    if (pairs.length < 10) return out; const ts = Math.max(tp.w, tp.h) / 2, fs = Math.max(fr.w, fr.h) / 2, tcx = tp.w / 2, tcy = tp.h / 2, fcx = fr.w / 2, fcy = fr.h / 2, thr = (opt.thr || 5) / fs;
    const TP = pairs.map((pr) => [(tp.x[pr[0]] - tcx) / ts, (tp.y[pr[0]] - tcy) / ts]), FQ = pairs.map((pr) => [(fr.x[pr[1]] - fcx) / fs, (fr.y[pr[1]] - fcy) / fs]);
    const rnd2 = seededRandom(7 + pairs.length), inl = (H) => { const r = []; for (let k = 0; k < pairs.length; k++) { const [u, v] = this.apply(H, TP[k][0], TP[k][1]); if (Math.hypot(u - FQ[k][0], v - FQ[k][1]) < thr) r.push(k); } return r; };
    let bestIn = [], bestH = null;
    for (let it = 0; it < 300; it++) { const idx = []; while (idx.length < 4) { const k = (rnd2() * pairs.length) | 0; if (!idx.includes(k)) idx.push(k); }
      const H = this.homog(idx.map((k) => TP[k]), idx.map((k) => FQ[k])); if (!H) continue; const r = inl(H); if (r.length > bestIn.length) { bestIn = r; bestH = H; } }
    for (let round = 0; round < 3 && bestIn.length >= 8; round++) { const H2 = this.fit(bestIn.map((k) => TP[k]), bestIn.map((k) => FQ[k])); if (!H2) break; const r2 = inl(H2); if (r2.length >= bestIn.length) { bestIn = r2; bestH = H2; } else break; } // refit on all inliers: the outline is extrapolated, so it needs a good fit
    out.inl = bestIn.length; if (!bestH || out.inl < (opt.minInl || 15) || out.inl < 0.2 * pairs.length) return out;
    // guided matching: with the pose in hand every template corner looks for its partner near where the pose puts it (no ratio test). A true totem is supported by dozens of them; a chance pose by a few.
    const P2 = [], Q2 = []; for (let j = 0; j < tp.n; j++) { const [u, v] = this.apply(bestH, (tp.x[j] - tcx) / ts, (tp.y[j] - tcy) / ts); let bd = 999, bi = -1; for (let i = 0; i < fr.n; i++) { const dx = (fr.x[i] - fcx) / fs - u, dy = (fr.y[i] - fcy) / fs - v; if (dx * dx + dy * dy > 2.25 * thr * thr) continue; let h = 0; for (let q = 0; q < 8; q++) h += this.pc(fr.d[i * 8 + q] ^ tp.d[j * 8 + q]); if (h < bd) { bd = h; bi = i; } } if (bi >= 0 && bd <= 90) { P2.push([(tp.x[j] - tcx) / ts, (tp.y[j] - tcy) / ts]); Q2.push([(fr.x[bi] - fcx) / fs, (fr.y[bi] - fcy) / fs]); } }
    out.support = P2.length; if (P2.length < (opt.minSupport || 25)) return out;
    const Hn = bestH, Ha = this.fitAff(P2, Q2), W = tp.w, Hh = tp.h, fa = fr.w * fr.h;
    const quadOf = (H) => { if (!H) return null; const quad = [[0, 0], [W, 0], [W, Hh], [0, Hh]].map(([x, y]) => { const [u, v] = this.apply(H, (x - tcx) / ts, (y - tcy) / ts); return [u * fs + fcx, v * fs + fcy]; }); // outline of the totem in the frame
      let area = 0; for (let i = 0; i < 4; i++) { const a = quad[i], b = quad[(i + 1) % 4]; area += a[0] * b[1] - b[0] * a[1]; } area = Math.abs(area) / 2;
      let cross = 0, sgn = 0; for (let i = 0; i < 4; i++) { const a = quad[i], b = quad[(i + 1) % 4], c = quad[(i + 2) % 4], z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (z !== 0) { if (!sgn) sgn = Math.sign(z); else if (Math.sign(z) !== sgn) cross++; } }
      return cross || area < fa * 0.004 || area > fa * 0.85 || !quad.every(([x, y]) => x > -fr.w && x < 2 * fr.w && y > -fr.h && y < 2 * fr.h) ? null : quad; };
    const quad = quadOf(Hn) || quadOf(Ha); if (!quad) return out; // not a plausible outline
    out.found = true; out.quad = quad; return out; },
};
