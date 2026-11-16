/* Base Camp build 30: "hide behind the sofa" (HANDOVER "Depth: hide behind furniture (build 30)"), in AR with the real WebXRKit polyfill and the fake native side.
   The fake room (ar-fake.js + texture-render.js) is the snapshot test's shed with its rug, cushion, tray, books, spines and posters, plus a CUSHION BOX standing on the floor
   (a patterned front, plain top, two sides: vertical, so the fake's hit tests stop at it and ARKit has no plane on it, like the arm of a sofa).
    1. the depth model (models/depth/model_fp16.onnx, onnxruntime-web 1.22.0 in a Web Worker) loads and runs while the game keeps drawing: ms per run, load time, frame gaps.
    2. the scale + shift fit against the scanned surfaces: its own error, and the fitted depth against the fake room's TRUE geometry (surfaces, and the box's front).
    3. three markers (8 cm boxes): behind the cushion box (hidden), in front of it (visible), beside it (visible); pixels read back from the WebGL canvas. Shots 130 to 133.
    4. the setting off (Menu), and a missing model: nothing hidden, no errors.
    5. privacy: no picture or depth map in localStorage or in the field report (numbers only).
   Run (about 6 minutes):  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node tests/depth-test.js
   ORT_DIR=<onnxruntime-web 1.22.0 dist folder>: serve the runtime from that folder instead of jsdelivr (the same files). */
const fs = require('fs'), path = require('path');
const { serve, ROOT } = require('./lib.js'); const install = require('./ar-fake.js'); const { chromium } = require('playwright');
const POLY = fs.readFileSync(path.join(ROOT, 'webxr-polyfill.js'), 'utf8'); const OUT = path.join(ROOT, 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const SHED = [['floor', -1.2, 0, -1.5, 1.4, 1.4], ['deskA', -0.45, -0.45, -1.2, 0.3, 0.25], ['speakerA', -0.45, 0.8, -1.0, 0.15, 0.125], ['shelf', 0.2, 0.0, -2.7, 0.7, 0.13]];
const H = (x, y, z, hw, hh, tex, seed, block) => ({ n: tex + seed, x, y, z, ax: [1, 0, 0], ay: [0, 0, -1], hw, hh, tex, seed, block }); /* lying flat */
const Vt = (x, y, z, ax, hw, hh, tex, seed) => ({ n: tex + seed, x, y, z, ax, ay: [0, 1, 0], hw, hh, tex, seed, block: true }); /* standing up */
const BOX = { x: 0.35, z0: -0.85, z1: -1.15, top: -0.85, hw: 0.22 }; /* the cushion box: front at z -0.85, 35 cm tall, 44 cm wide, 30 cm deep */
const BOX_TEX = [Vt(BOX.x, -1.025, BOX.z0, [1, 0, 0], BOX.hw, 0.175, 'cushion', 31), H(BOX.x, BOX.top, (BOX.z0 + BOX.z1) / 2, BOX.hw, 0.15, 'plain', 32, true),
  Vt(BOX.x - BOX.hw, -1.025, (BOX.z0 + BOX.z1) / 2, [0, 0, 1], 0.15, 0.175, 'tray', 33), Vt(BOX.x + BOX.hw, -1.025, (BOX.z0 + BOX.z1) / 2, [0, 0, 1], 0.15, 0.175, 'tray', 34)];
const SHED_TEX = [H(0.35, -1.197, -1.75, 0.45, 0.32, 'rug', 11), H(-0.5, -0.448, -1.15, 0.12, 0.12, 'cushion', 12), H(0.8, -0.448, -1.0, 0.12, 0.1, 'tray', 13), H(-0.2, 0.202, -2.7, 0.34, 0.11, 'books', 14),
  Vt(-0.3, 0.05, -2.569, [1, 0, 0], 0.35, 0.13, 'spines', 15), Vt(0.5, 0.6, -2.89, [1, 0, 0], 0.3, 0.22, 'poster', 16), Vt(1.39, -0.4, -1.5, [0, 0, 1], 0.3, 0.2, 'poster', 17)].concat(BOX_TEX);
const VIEW = [0.35, -0.65, 0.15, 0, -0.3]; /* x, y, z, yaw, pitch: 55 cm above the floor, 1 m in front of the box, looking a little down at it */
const MARKS = [{ n: 'behind', p: [0.35, -1.14, -1.4], c: 0xff00ff, rgb: [255, 0, 255] }, { n: 'front', p: [0.35, -1.14, -0.65], c: 0x00ffff, rgb: [0, 255, 255] }, { n: 'beside', p: [0.95, -1.14, -1.5], c: 0xffff00, rgb: [255, 255, 0] }];
const A_LEGS = ['shelf', 'deskA', 'floor', 'speakerA', 'floor2', 'shelf'];
(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const ORT_DIR = process.env.ORT_DIR; let ortHits = 0;
  if (ORT_DIR) await ctx.route('**/onnxruntime-web@1.22.0/dist/**', (r) => { const f = path.join(ORT_DIR, r.request().url().split('/dist/')[1].split('?')[0]); ortHits++; if (!fs.existsSync(f)) return r.continue(); r.fulfill({ body: fs.readFileSync(f), contentType: /\.wasm$/.test(f) ? 'application/wasm' : 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await install(p, SHED); await p.addInitScript({ content: POLY });
  /* keep the WebGL picture after it is shown, so the test can read its pixels */
  await p.addInitScript(() => { const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, o) { if (/webgl/.test(t)) o = Object.assign({}, o, { preserveDrawingBuffer: true }); return gc.call(this, t, o); }; });
  await p.addInitScript(() => { const t = setInterval(() => { const d = window.NativeARData; if (d && d.video_updated && d.video_data && d.video_width === 640) window.__lastPic = d.video_data; }, 30); void t; });
  const ev = (f, a) => p.evaluate(f, a);
  const noOverlay = () => ev(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  const fresh = async () => { await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); await ev((tex) => { window.__W = { yaw: 0, x: 0, z: 0, y: 0 }; window.__MARKS = []; window.__TEX = { items: tex }; window.__cam.fixed = [0, -0.1, -2.1, 0, -1.3]; __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; }, SHED_TEX); };
  const sweep = (legs, speed) => ev(([legs, speed]) => { const T = window.__place(), pick = (n) => T.find((t) => t.n === n);
    const look = (n, off, hgt, ay, ap, dur) => { const S = pick(n); if (!S) return null; const q = [S.cx + off[0], S.y + hgt, S.cz + off[1]], fx = S.cx - q[0], fy = S.y - q[1], fz = S.cz - q[2], L = Math.hypot(fx, fy, fz); return { p: q, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay, ap, dur }; };
    const D = { floor: ['floor', [0, 1.3], 1.6, 0.6, 0.25, 12], floor2: ['floor', [0.3, -0.4], 1.7, 0.7, 0.25, 9], deskA: ['deskA', [0.1, 0.7], 0.8, 0.3, 0.15, 10], speakerA: ['speakerA', [0.1, 0.5], 0.55, 0.12, 0.1, 8], shelf: ['shelf', [0, 0.6], 0.5, 0.18, 0.1, 10] };
    const e = __g.AR.on ? __g.AR.viewM.elements : null, here = e ? [{ p: [e[12], e[13], e[14]], yaw: Math.atan2(e[8], e[10]), pitch: Math.asin(Math.max(-1, Math.min(1, -e[9]))), ay: 0, ap: 0, dur: 0.3 }] : [];
    window.__cam.path = here.concat(legs.map((l) => { const d = D[l]; return look(d[0], d[1], d[2], d[3], d[4], d[5]); }).filter(Boolean)); window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = speed || 1; window.__cam.done = false; }, [legs, speed]);
  const waitFor = async (fn, ms, every) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(fn)) return Date.now() - t0; await sleep(every || 600); } return -1; };
  const play = async () => { await p.click('#bPlay'); await sleep(500); if (await ev(() => !document.getElementById('chooser').hidden)) await p.click('#chFind'); await sleep(900); };
  const atView = () => ev((v) => { window.__cam.mode = 'fixed'; window.__cam.fixed = v; }, VIEW);
  const marks = (on) => ev(([M, on]) => { for (const o of window.__marks || []) o.parent.remove(o); window.__marks = []; if (!on) return;
    for (const m of M) { const o = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: m.c })); o.position.set(m.p[0], m.p[1] + 0.02, m.p[2]); __g.world.add(o); window.__marks.push(o); }
    /* for the pictures: a colonist (made 9 times bigger to be seen) walking behind the box, its head above the box's top edge */
    const c = __g.mkColonist({ hue: 0.6 }); c.scale.setScalar(9); c.position.set(0.22, -1.2, -1.3); __g.world.add(c); window.__marks.push(c); }, [MARKS, on]);
  /* how much of each marker shows: the share of pixels in a small window around its centre that have its colour (read from the WebGL canvas itself) */
  const seen = () => ev((M) => { const cv = document.querySelector('canvas'), V = __g.AR.viewM.elements, P = __g.AR.projM.elements, W = cv.width, Hh = cv.height, c2 = document.createElement('canvas'); c2.width = W; c2.height = Hh; const g = c2.getContext('2d'); g.drawImage(cv, 0, 0); const out = {};
    for (const m of M) { const x = m.p[0], y = m.p[1] + 0.02, z = m.p[2], dx = x - V[12], dy = y - V[13], dz = z - V[14], X = V[0] * dx + V[1] * dy + V[2] * dz, Y = V[4] * dx + V[5] * dy + V[6] * dz, Z = V[8] * dx + V[9] * dy + V[10] * dz;
      const u = Math.round((P[0] * X / -Z + P[8] + 1) / 2 * W), v = Math.round((1 - (P[5] * Y / -Z + P[9])) / 2 * Hh), d = g.getImageData(u - 5, v - 5, 11, 11).data; let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && Math.abs(d[i] - m.rgb[0]) < 60 && Math.abs(d[i + 1] - m.rgb[1]) < 60 && Math.abs(d[i + 2] - m.rgb[2]) < 60) n++; out[m.n] = +(n / 121).toFixed(2); }
    return out; }, MARKS);
  const bg = (on) => ev((on) => { if (on && window.__lastPic) document.body.style.background = 'url(data:image/jpeg;base64,' + window.__lastPic + ') center / cover no-repeat'; else if (__g.AR.on) document.body.style.background = 'transparent'; }, on);
  const shot = async (name) => { await bg(true); await sleep(300); await p.screenshot({ path: OUT + name }); await bg(false); console.log('shot ' + name); };
  const D = () => ev(() => ({ state: __g.DEPTH.state, err: __g.DEPTH.err, runs: __g.DEPTH.runs, ms: Math.round(__g.DEPTH.msAvg), msMax: Math.round(__g.DEPTH.msMax), loadMs: Math.round(__g.DEPTH.loadMs), gap: Math.round(__g.DEPTH.gapMax), gapIdle: Math.round(__g.DEPTH.gapIdle), prep: +__g.DEPTH.prepMs.toFixed(1), fitMs: +__g.DEPTH.fitMs.toFixed(1), fits: __g.DEPTH.fits, good: __g.DEPTH.good, poor: __g.DEPTH.poor, why: __g.DEPTH.why, cm: +__g.DEPTH.cm.toFixed(1), pts: __g.DEPTH.pts, ok: __g.DEPTH.ok, shown: __g.DEPTH.shown, ver: __g.DEPTH.ver, tris: __g.DEPTH.tris, lat: Math.round(__g.DEPTH.lat || 0), cache: __g.DEPTH.cache }));
  const fitsAfter = async (n) => { const v0 = await ev(() => __g.DEPTH.fits); const t0 = Date.now(); while (Date.now() - t0 < 120000) { if ((await ev(() => __g.DEPTH.fits)) >= v0 + n) return Date.now() - t0; await sleep(500); } return -1; };

  await p.goto(url); await sleep(2500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await fresh();
  ok('BUILD is build 30', await ev(() => __g.BUILD === 'build 30'));
  ok('0. the setting is on by default, nothing loads before AR', await ev(() => __g.DEPTH.want && __g.DEPTH.state === 'off' && !__g.DEPTH.worker));

  /* ===================== 1. the model loads and runs in the worker ===================== */
  await play(); await sweep(A_LEGS, 1.0);
  const tS = await waitFor(() => __g.G.settlements.length > 0, 150000, 600); ok('1. the shed colony settles (as before)', tS > 0, tS + ' ms');
  const tL = await waitFor(() => __g.DEPTH.state === 'ready' || __g.DEPTH.state === 'error', 120000, 500); let d1 = await D();
  ok('1. the depth model loads in the worker (lazily, once AR has a map)', d1.state === 'ready', JSON.stringify({ state: d1.state, err: d1.err, loadMs: d1.loadMs, cache: d1.cache, ortFromFolder: ortHits }));
  await waitFor(() => window.__cam.done, 120000, 1500); await atView(); await marks(true);
  await fitsAfter(4); d1 = await D();
  ok('1. it runs about every 1 to 2 s while the game keeps drawing (no frame gap near the run time)', d1.runs >= 3 && d1.gap < Math.max(250, 0.5 * d1.ms), JSON.stringify({ runs: d1.runs, msPerRun: d1.ms, msMax: d1.msMax, frameGapMaxWhileRunning: d1.gap, frameGapMaxIdle: d1.gapIdle, prepMs: d1.prep, fitMs: d1.fitMs, latencyMs: d1.lat }));

  /* ===================== 2. the fit ===================== */
  const tFit = await waitFor(() => __g.DEPTH.lastFit && __g.DEPTH.lastFit.ok && __g.DEPTH.job === null, 90000, 250); d1 = await D(); /* the floor in front of the box may need a few more seconds of scanning */
  console.log('good fit after ' + tFit + ' ms at the view');
  ok('2. the fit against the scanned surfaces is good (median error over the surface points)', d1.ok && d1.good >= 1 && d1.cm < 5, JSON.stringify({ cm: d1.cm, pts: d1.pts, fits: d1.fits, good: d1.good, poor: d1.poor, why: d1.why, tris: d1.tris }));
  /* the fitted depth against the fake room's TRUE geometry (every plane the picture is drawn from) */
  const truth = await ev(() => { const J = __g.DEPTH.lastJ, F = __g.DEPTH.lastFit, V = J.V, o = [V[12], V[13], V[14]], planes = [];
    for (const S of window.__place()) { const c = Math.cos(S.rot), s = Math.sin(S.rot); planes.push({ n: S.n, c: [S.cx, S.y, S.cz], ax: [c, 0, -s], ay: [s, 0, c], hw: S.hw, hh: S.hd }); }
    for (const k of window.__placeTex()) planes.push({ n: k.n, c: k.c, ax: k.ax, ay: k.ay, hw: k.hw, hh: k.hh });
    const surf = [], box = [], all = []; for (let k = 0; k < J.MX * J.MY; k++) { const d = [J.D[3 * k], J.D[3 * k + 1], J.D[3 * k + 2]]; let bz = 1e9, bn = '';
      for (const P of planes) { const nn = [P.ax[1] * P.ay[2] - P.ax[2] * P.ay[1], P.ax[2] * P.ay[0] - P.ax[0] * P.ay[2], P.ax[0] * P.ay[1] - P.ax[1] * P.ay[0]], dn = d[0] * nn[0] + d[1] * nn[1] + d[2] * nn[2]; if (Math.abs(dn) < 1e-9) continue;
        const z = ((P.c[0] - o[0]) * nn[0] + (P.c[1] - o[1]) * nn[1] + (P.c[2] - o[2]) * nn[2]) / dn; if (z <= 0.05 || z >= bz) continue; const q = [o[0] + d[0] * z - P.c[0], o[1] + d[1] * z - P.c[1], o[2] + d[2] * z - P.c[2]];
        if (Math.abs(q[0] * P.ax[0] + q[1] * P.ax[1] + q[2] * P.ax[2]) > P.hw || Math.abs(q[0] * P.ay[0] + q[1] * P.ay[1] + q[2] * P.ay[2]) > P.hh) continue; bz = z; bn = P.n; }
      if (bz > 50) continue; const r = J.R[k] - F.b; if (!(r > 0)) continue; const zf = F.a / r, e = Math.abs(zf - bz) * 100, rel = Math.abs(zf - bz) / bz; all.push(rel); if (J.Z[k] > 0) surf.push(e); if (bn === 'cushion31') box.push({ e, rel, zf, bz }); }
    const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[(s.length / 2) | 0] : null; };
    return { surfCm: +med(surf).toFixed(1), surfN: surf.length, boxCm: box.length ? +med(box.map((q) => q.e)).toFixed(1) : null, boxN: box.length, boxTrue: box.length ? +med(box.map((q) => q.bz)).toFixed(2) : null, boxFit: box.length ? +med(box.map((q) => q.zf)).toFixed(2) : null, allRel: +(med(all) * 100).toFixed(1), allN: all.length }; });
  ok('2. the fitted depth agrees with the true room: surfaces within a few cm, the box front well in front of the floor behind it', truth.surfCm !== null && truth.surfCm < 6 && truth.boxN > 20 && truth.boxCm < 15, JSON.stringify(truth));

  /* ===================== 3. behind the box: hidden; in front and beside: visible ===================== */
  await fitsAfter(2); const s3 = await seen(); const d3 = await D();
  ok('3. the marker BEHIND the cushion box is hidden', d3.shown && s3.behind < 0.1, JSON.stringify({ seen: s3, shown: d3.shown, ok: d3.ok, why: d3.why }));
  ok('3. the markers IN FRONT of it and BESIDE it are still drawn', s3.front > 0.6 && s3.beside > 0.6, JSON.stringify(s3));
  await shot('131-depth-after.png');
  /* the map is world geometry: a small step keeps it right without a new run; a big step hides it until the next run */
  await fitsAfter(1); const v3 = await ev(() => { __g.DEPTH.t = -1e4; return __g.DEPTH.ver; }); /* no new picture goes out for now */
  await ev((v) => { window.__cam.fixed = [v[0] + 0.12, v[1] + 0.03, v[2] - 0.05, v[3] + 0.06, v[4]]; }, VIEW); await sleep(1200);
  const s3m = await seen(), d3m = await D(); ok('3. after a 13 cm step (no new run) the old map still hides the marker behind the box', d3m.ver === v3 && d3m.shown && s3m.behind < 0.1 && s3m.front > 0.6 && s3m.beside > 0.6, JSON.stringify({ seen: s3m, sameMap: d3m.ver === v3 }));
  await ev((v) => { window.__cam.fixed = [v[0] - 0.45, v[1] + 0.1, v[2] + 0.25, v[3] - 0.3, v[4]]; }, VIEW); await sleep(1200);
  const d3f = await D(); ok('3. after a 55 cm step the old map is put away (nothing hidden on an old guess)', !d3f.shown && d3f.ver === v3, JSON.stringify({ shown: d3f.shown, sameMap: d3f.ver === v3 }));
  await atView(); await ev(() => { __g.DEPTH.t = 0; }); await fitsAfter(2);
  /* a hand in front of the camp: a 14 cm board 40 cm from the iPad, over the marker in front of the box; then taken away */
  const tH0 = Date.now(); await ev(() => { window.__TEX.items.push({ n: 'hand', x: 0.35, y: -0.86, z: -0.15, ax: [1, 0, 0], ay: [0, 1, 0], hw: 0.07, hh: 0.08, tex: 'tray', seed: 41, block: true }); });
  const seenUntil = async (test, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (test(await seen())) return Date.now() - t0; await sleep(300); } return -1; };
  const tHand = await seenUntil((s) => s.front < 0.1, 20000);
  await shot('134-depth-hand.png');
  await ev(() => { window.__TEX.items = window.__TEX.items.filter((q) => q.n !== 'hand'); }); const tGone = await seenUntil((s) => s.front > 0.6, 20000);
  ok('3. a hand in front of the camp covers the marker within a few seconds, and lets it go again', tHand > 0 && tGone >= 0, JSON.stringify({ coveredAfterMs: tHand, freedAfterMs: tGone, since: Date.now() - tH0 }));
  await fitsAfter(1);
  await ev(() => { __g.DEPTH.dbg = true; }); await fitsAfter(1); await sleep(400); await shot('132-depth-debug.png'); await ev(() => { __g.DEPTH.dbg = false; const c = document.getElementById('depthDbg'); if (c) c.remove(); });

  /* ===================== 4. the setting off, and a missing model ===================== */
  await ev(() => document.getElementById('bMenu').click()); await sleep(500);
  const label = await ev(() => { const b = document.getElementById('mDepth'); return b && b.textContent; }); ok('4. Menu has "Things can hide behind furniture: on"', label === 'Things can hide behind furniture: on', label);
  await p.screenshot({ path: OUT + '133-depth-setting.png' }); console.log('shot 133-depth-setting.png');
  await ev(() => document.getElementById('mDepth').click()); await sleep(800);
  const s4 = await seen(); const st4 = await ev(() => ({ want: __g.DEPTH.want, stored: localStorage.getItem('bc-depth'), vis: !!(__g.DEPTH.mesh && __g.DEPTH.mesh.visible) }));
  ok('4. setting off: the mesh is gone and the marker behind the box shows again', !st4.want && st4.stored === '0' && !st4.vis && s4.behind > 0.6 && s4.front > 0.6, JSON.stringify({ seen: s4, st4 }));
  await shot('130-depth-before.png');
  const f4 = await ev(() => __g.DEPTH.fits); await sleep(4000); ok('4. setting off: no more pictures go to the model', (await ev(() => __g.DEPTH.fits)) === f4);
  await ev(() => document.getElementById('bMenu').click()); await sleep(400); await ev(() => document.getElementById('mDepth').click()); await sleep(300);
  await fitsAfter(2); const s4b = await seen(); ok('4. setting on again: hidden again', s4b.behind < 0.1 && s4b.front > 0.6, JSON.stringify(s4b));
  /* a missing model: leave AR, point the game at a file that is not there, play again */
  await ev(() => __g.AR.session.end()); await sleep(1500);
  await ev(() => { const D = __g.DEPTH; try { D.worker.terminate(); } catch (e) {} D.worker = null; D.state = 'off'; D.ok = false; D.model = 'models/depth/not-here.onnx'; D.fits = 0; });
  await play(); await sweep(A_LEGS, 1.6); await waitFor(() => __g.G.zones.length > 0 && (__g.DEPTH.state === 'error' || __g.DEPTH.state === 'ready'), 150000, 800);
  await waitFor(() => window.__cam.done, 120000, 1500); await atView(); await marks(true); await sleep(5000);
  const s4c = await seen(), d4 = await D(); ok('4. a missing model: occlusion stays off, every marker shows, the game carries on', d4.state === 'error' && !d4.shown && d4.fits === 0 && s4c.behind > 0.6 && s4c.front > 0.6, JSON.stringify({ state: d4.state, err: d4.err, seen: s4c }));

  /* ===================== 5. privacy ===================== */
  await ev(() => __g.persist(true));
  const store5 = await ev(() => { let img = 0, jpg = 0, big = 0; const keys = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i), v = localStorage.getItem(k) || ''; keys.push(k + ':' + v.length); if (/data:image|\/9j\/|iVBORw0/.test(v)) img++; if (/depth/i.test(k) && v.length > 4) big++; for (const m of v.matchAll(/"([A-Za-z0-9+/=]{200,})"/g)) { try { const s = atob(m[1].slice(0, 8)); if ((s.charCodeAt(0) === 0xff && s.charCodeAt(1) === 0xd8) || s.slice(1, 4) === 'PNG') jpg++; } catch (e) {} } }
    return { img, jpg, big, keys, depthKey: localStorage.getItem('bc-depth') }; });
  ok('5. no picture or depth map in localStorage (only the on / off switch)', store5.img === 0 && store5.jpg === 0 && store5.big === 0 && store5.depthKey === '1', JSON.stringify(store5));
  const rep = await ev(() => { const R = JSON.parse(__g.buildReport('depth test')), d = R.depth, snaps = R.snapshots.length; delete R.snapshots; const s = JSON.stringify(R);
    const flat = (o) => Object.values(o).every((v) => v === null || ['number', 'string', 'boolean'].includes(typeof v) || (Array.isArray(v) && v.every((q) => q && typeof q === 'object' && Object.values(q).every((w) => typeof w !== 'object')))); return { hasDepth: !!d, flat: flat(d), depthBytes: JSON.stringify(d).length, img: /data:image|\/9j\/|iVBORw0/.test(s), snaps, recSnaps: __g.REC.snaps.length, d }; });
  ok('5. the field report has depth NUMBERS only (no picture, no depth map); its older "snapshots" list is not fed by depth', rep.hasDepth && rep.flat && rep.depthBytes < 3000 && !rep.img && rep.snaps === rep.recSnaps, JSON.stringify({ depthBytes: rep.depthBytes, snaps: rep.snaps, depth: rep.d }));
  ok('no page errors', errs.length === 0, errs.slice(0, 5).join(' | '));
  const fails = res.filter((r) => !r).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
