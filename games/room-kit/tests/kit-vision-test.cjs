/* room-kit tests/kit-vision-test.cjs: the picture maths of vision.js, alone, in node (no browser, no game, about a second).
   node games/room-kit/tests/kit-vision-test.cjs
   1. stkRefine finds the corners of a drawn (slightly blurred) black square within 0.6 px from rough corners 1 to 1.5 px off. Found while writing this test: the
      bilinear profile has a flat-topped gradient inside each pixel, so a single picture's corner lands near a half pixel (worst about 0.53 px here); the game's
      joint fit over 4 to 5 pictures (stkFit) averages this out. Not changed (zero behaviour change); a possible later improvement.
   2. stkFit recovers a sticker's world pose from its corners seen by three cameras, from a start 3 degrees and 2 cm off.
   3. stkRot / stkMul / stkInv / stkSolve are consistent; stkIntr gives the screen centre for a centred projection.
   4. FEAT.pc counts bits; FEAT.homog maps four points exactly; FEAT.match pairs identical descriptors. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'vision.js'), 'utf8');
const ctx = vm.createContext({ Math, Array, Float32Array, Int32Array, Int8Array, Int16Array, Uint8Array, Number, isFinite, seededRandom: (s) => { let a = s >>> 0 || 1; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; } });
vm.runInContext(src + '\n;globalThis.K = { stkRefine, stkFit, stkRes2, stkRot, stkMul, stkInv, stkSolve, stkIntr, FEAT };', ctx);
const K = ctx.K; let pass = 0, fail = 0;
const check = (name, ok, info) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + info : '')); };

/* 1. a black square on paper, drawn with area coverage (4 x 4 supersampling) */
{ const w = 200, h = 200, g = new Uint8Array(w * h), x0 = 60.3, y0 = 50.7, x1 = 140.3, y1 = 130.7;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let c = 0; for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) { const px = x + (sx + 0.5) / 4, py = y + (sy + 0.5) / 4; if (px >= x0 && px <= x1 && py >= y0 && py <= y1) c++; } g[y * w + x] = Math.round(220 - (220 - 30) * c / 16); }
  for (let pass = 0; pass < 2; pass++) { const o = Uint8Array.from(g); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { let t = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) t += o[(y + dy) * w + x + dx]; g[y * w + x] = Math.round(t / 9); } } /* a camera picture is never razor sharp: two 3 x 3 box blurs (about 1 px of blur); on a perfectly sharp step the strongest-gradient search has a flat top and is up to 0.4 px off */
  const truth = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => [x - 0.5, y - 0.5]) /* the maths reads pixel i at coordinate i (its centre), the drawing covers [i, i + 1] */, rough = truth.map(([x, y], i) => [x + (i % 2 ? 1.2 : -0.9), y + (i < 2 ? 0.8 : -1.1)]);
  const out = K.stkRefine(g, w, h, rough);
  const err = out ? Math.max(...truth.map((t) => Math.min(...out.map((o) => Math.hypot(o[0] - t[0], o[1] - t[1]))))) : 99;
  check('1. stkRefine: corners of a drawn square within 0.6 px (slightly blurred, rough corners 1 to 1.5 px off)', err < 0.6, 'worst ' + err.toFixed(3) + ' px'); }

/* 2. stkFit: one sticker (8 cm), three cameras */
{ const S = 0.08, R = K.stkRot([0.3, -0.5, 0.2]), p = [0.1, -0.05, -0.9], Kc = { fx: 500, fy: 500, cx: 320, cy: 240 };
  const cam = (t, yaw) => { const c = Math.cos(yaw), s = Math.sin(yaw); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, t[0], t[1], t[2], 1]; }; /* camera to world, column-major, looking down -z, turned by yaw */
  const obs = [cam([0, 0, 0], 0), cam([0.25, 0.05, 0.05], 0.25), cam([-0.2, -0.05, 0.1], -0.2)].map((V) => { const o = { V, K: Kc, cs: [[0, 0], [0, 0], [0, 0], [0, 0]] }, r = K.stkRes2(R, p, [o], S); o.cs = [[r[0], r[1]], [r[2], r[3]], [r[4], r[5]], [r[6], r[7]]]; return o; });
  const seen = obs.every((o) => o.cs.every(([u, v]) => u > 0 && u < 640 && v > 0 && v < 480));
  const R0 = K.stkMul(K.stkRot([0.03, -0.04, 0.02]), R), p0 = [p[0] + 0.02, p[1] - 0.01, p[2] + 0.015], f = K.stkFit(obs, S, R0, p0);
  const dp = f ? Math.hypot(f.p[0] - p[0], f.p[1] - p[1], f.p[2] - p[2]) : 9;
  check('2. stkFit: sticker position from three exact views within 0.1 mm (start 2.7 cm off)', seen && dp < 1e-4, 'error ' + (dp * 1000).toFixed(4) + ' mm, rms ' + (f ? f.rms.toExponential(1) : '-') + ' px'); }

/* 3. small linear algebra */
{ const R = K.stkRot([0.4, 0.1, -0.7]), Rt = R[0].map((_, j) => R.map((row) => row[j])), I = K.stkMul(R, Rt), dev = Math.max(...I.flatMap((row, i) => row.map((v, j) => Math.abs(v - (i === j ? 1 : 0)))));
  const A = [[4, 1, 2], [1, 5, 3], [2, 3, 6]], Ai = K.stkInv(A), AA = K.stkMul(A, Ai), dev2 = Math.max(...AA.flatMap((row, i) => row.map((v, j) => Math.abs(v - (i === j ? 1 : 0)))));
  const x = K.stkSolve(A, [1, 2, 3]), res = Math.max(...A.map((row, i) => Math.abs(row[0] * x[0] + row[1] * x[1] + row[2] * x[2] - [1, 2, 3][i])));
  const P = [1.5, 0, 0, 0, 0, 2, 0, 0, 0, 0, -1, -1, 0, 0, -0.02, 0], k = K.stkIntr(640, 480, P);
  check('3. stkRot is a rotation, stkInv / stkSolve invert, stkIntr centres a centred projection', dev < 1e-12 && dev2 < 1e-12 && res < 1e-12 && Math.abs(k.cx - 320) < 1e-9 && Math.abs(k.cy - 240) < 1e-9, [dev, dev2, res].map((v) => v.toExponential(1)).join(' ') + ' fx ' + k.fx.toFixed(1)); }

/* 4. the matcher's small parts */
{ const F = K.FEAT, pcOK = F.pc(0) === 0 && F.pc(0xffffffff) === 32 && F.pc(0x80000001) === 2;
  const P = [[0, 0], [1, 0], [1, 1], [0, 1]], Q = [[2, 3], [4.1, 3.2], [4.4, 5.3], [1.9, 5]], H = F.homog(P, Q), hdev = H ? Math.max(...P.map((pt, i) => Math.hypot(F.apply(H, pt[0], pt[1])[0] - Q[i][0], F.apply(H, pt[0], pt[1])[1] - Q[i][1]))) : 9;
  const d = new Int32Array(8 * 3); for (let i = 0; i < d.length; i++) d[i] = (i * 2654435761) | 0; const tp = { n: 3, d }, fr = { n: 3, d: Int32Array.from(d) }, m = F.match(tp, fr);
  check('4. FEAT: bit count, exact homography from 4 points, identical descriptors pair up', pcOK && hdev < 1e-9 && m.length === 3 && m.every(([j, i, hd]) => j === i && hd === 0), 'homography ' + hdev.toExponential(1) + ', pairs ' + m.length); }

console.log(fail ? fail + ' FAILED, ' + pass + ' passed' : 'ALL ' + pass + ' PASSED'); process.exit(fail ? 1 : 0);
