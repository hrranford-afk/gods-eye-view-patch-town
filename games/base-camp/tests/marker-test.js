/* Base Camp build 27: the printed-sticker room lock (HANDOVER "Sticker lock"), in AR with the real WebXRKit polyfill and the fake native side.
   ar-fake.js draws the stickers (marker-render.js) into 640 x 480 JPEG camera pictures, every 4th frame, from the camera pose of that frame.
   The fake world: the shed (room A) with sticker 2 on the front of its shelf ("the side of a bookcase"), and the lounge about 4 m away with sticker 5 on the sofa's side.
    1. the vendored js-aruco2 loads (hidden iframe, plain script tags); sticker 2 is found in the camera pictures; the averaged pose is checked against the truth
       (target: under 2 cm and 2 degrees); single pictures are never used alone.
    2. first-time binding: the settled shed takes sticker 2 (saved with the map, in the map's frame, and in the rooms registry); "Sticker found ✓".
    3. sleep + origin jump: the camp hides, the sticker gives the lock back (time and error), then the same jump found by the surfaces only (sticker hidden) for comparison.
    4. the lounge becomes Room 2 with sticker 5; a copy of sticker 2 (Room 1's) seen in the lounge asks "Have you moved to another room?" with Room 1 offered first;
       nothing is merged; "No, still here" keeps the lounge and the question does not come back for that sticker.
    5. Continue Room 1 from the chooser (which says "Have a sticker? Point at it"): the sticker finds the shed fast.
    6. fallbacks: no camera-access (no pictures) and the vendored files failing to load: the game is build 26 (the surfaces find the room), no errors.
    7. stickers.html: two A4 pages, the six printed patterns are read back as ids 1 to 6 by the game's own detector; the Menu links to it.
   Run (about 25 minutes):  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node tests/marker-test.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const { serve, ROOT } = require('./lib.js'); const install = require('./ar-fake.js'); const { chromium } = require('playwright');
const POLY = fs.readFileSync(path.join(ROOT, 'webxr-polyfill.js'), 'utf8'); const OUT = path.join(ROOT, 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
/* the code bits of the printed stickers, read from the vendored dictionary (the same file the game uses) */
const DICT = (() => { const ctx = vm.createContext({}); vm.runInContext('var AR = { DICTIONARIES: {} }; var require = () => ({});', ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, 'vendor/js-aruco2/dictionaries/aruco_4x4_1000.js'), 'utf8'), ctx); return ctx.AR.DICTIONARIES.ARUCO_4X4_1000.codeList; })();
const bits = (id) => DICT[id][0].toString(2).padStart(8, '0') + DICT[id][1].toString(2).padStart(8, '0');
const SHED = [['floor', -1.2, 0, -1.5, 1.4, 1.4], ['deskA', -0.45, -0.45, -1.2, 0.3, 0.25], ['speakerA', -0.45, 0.8, -1.0, 0.15, 0.125], ['shelf', 0.2, 0.0, -2.7, 0.7, 0.13]];
const LOUNGE = [['lfloor', -1.2, 0.2, -5.6, 1.3, 1.3], ['sofa', -0.78, 0.6, -6.1, 0.5, 0.3], ['ltable', -0.85, -0.5, -5.7, 0.3, 0.25], ['lamp', -0.6, 0.9, -4.7, 0.15, 0.15]];
const WORLD = SHED.concat(LOUNGE);
const ST2 = { id: 2, x: 0.25, y: -0.02, z: -2.565, ax: [1, 0, 0], ay: [0, 1, 0], size: 0.08, bits: bits(2) }; /* on the front of the shed's shelf, facing into the shed */
const ST5 = { id: 5, x: 0.85, y: -0.98, z: -5.795, ax: [1, 0, 0], ay: [0, 1, 0], size: 0.08, bits: bits(5) }; /* on the lounge sofa's front */
const ST2L = Object.assign({}, ST2, { x: 0.3, y: -0.99, z: -5.795 }); /* a copy of sticker 2 taken to the lounge sofa (Room 1's sticker in Room 2) */
const A_LEGS = ['shelf', 'deskA', 'floor', 'speakerA', 'floor2', 'shelf'], L_LEGS = ['lfloor', 'sofa', 'ltable', 'lamp', 'lfloor2'];
(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  let blockVendor = false; await ctx.route('**/vendor/js-aruco2/**', (r) => (blockVendor ? r.abort() : r.continue()));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { const N = Date.now.bind(Date); Date.now = () => N() + (+localStorage.getItem('bc-test-off') || 0); });
  await install(p, WORLD); await p.addInitScript({ content: POLY });
  await p.addInitScript((W) => { window.__WORLD = W; }, WORLD);
  const ev = (f, a) => p.evaluate(f, a);
  const noOverlay = () => ev(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  const fresh = async (marks) => { await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); await ev((marks) => { window.__SHED = window.__WORLD; window.__W = { yaw: 0, x: 0, z: 0, y: 0 }; window.__MARKS = marks; window.__cam.fixed = [0, -0.1, -2.1, 0, -1.3]; __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; }, marks); };
  const sweep = (legs, speed) => ev(([legs, speed]) => { const T = window.__place(), pick = (n) => T.find((t) => t.n === n);
    const look = (n, off, hgt, ay, ap, dur) => { const S = pick(n); if (!S) return null; const q = [S.cx + off[0], S.y + hgt, S.cz + off[1]], fx = S.cx - q[0], fy = S.y - q[1], fz = S.cz - q[2], L = Math.hypot(fx, fy, fz); return { p: q, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay, ap, dur }; };
    const D = { floor: ['floor', [0, 1.3], 1.6, 0.6, 0.25, 12], floor2: ['floor', [0.3, -0.4], 1.7, 0.7, 0.25, 9], deskA: ['deskA', [0.1, 0.7], 0.8, 0.3, 0.15, 10], speakerA: ['speakerA', [0.1, 0.5], 0.55, 0.12, 0.1, 8], shelf: ['shelf', [0, 0.6], 0.5, 0.18, 0.1, 10],
      lfloor: ['lfloor', [0, -0.4], 1.5, 0.6, 0.25, 12], lfloor2: ['lfloor', [0.3, -0.9], 1.6, 0.7, 0.25, 9], sofa: ['sofa', [0.1, -0.65], 0.6, 0.15, 0.1, 9], ltable: ['ltable', [0, -0.6], 0.6, 0.15, 0.1, 8], lamp: ['lamp', [0, -0.9], 0.5, 0.12, 0.1, 8] };
    const e = __g.AR.on ? __g.AR.viewM.elements : null, here = e ? [{ p: [e[12], e[13], e[14]], yaw: Math.atan2(e[8], e[10]), pitch: Math.asin(Math.max(-1, Math.min(1, -e[9]))), ay: 0, ap: 0, dur: 0.3 }] : [];
    window.__cam.path = here.concat(legs.map((l) => { const d = D[l]; return look(d[0], d[1], d[2], d[3], d[4], d[5]); }).filter(Boolean)); window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = speed || 1; window.__cam.done = false; }, [legs, speed]);
  /* looks at a sticker (room coordinates, turned with __W) from a few still places around it: dist metres away, at angles (degrees off its normal), a little above */
  const viewSticker = (st, dist, angs, dur, up) => ev(([st, dist, angs, dur, up]) => { const ki = window.__MARKS.findIndex((q) => q.id === st.id && Math.hypot(q.x - st.x, q.y - st.y, q.z - st.z) < 0.05), k = window.__placeMarks()[ki], n = [k.ax[1] * k.ay[2] - k.ax[2] * k.ay[1], k.ax[2] * k.ay[0] - k.ax[0] * k.ay[2], k.ax[0] * k.ay[1] - k.ax[1] * k.ay[0]];
    const e = __g.AR.viewM.elements, here = [{ p: [e[12], e[13], e[14]], yaw: Math.atan2(e[8], e[10]), pitch: Math.asin(Math.max(-1, Math.min(1, -e[9]))), ay: 0, ap: 0, dur: 0.3 }];
    const legs = angs.map((a) => { const r = a * Math.PI / 180, dx = n[0] * Math.cos(r) - n[2] * Math.sin(r), dz = n[0] * Math.sin(r) + n[2] * Math.cos(r), q = [k.x + dx * dist, k.y + (up || 0.12), k.z + dz * dist], fx = k.x - q[0], fy = k.y - q[1], fz = k.z - q[2], L = Math.hypot(fx, fy, fz); return { p: q, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay: 0.015, ap: 0.01, dur }; });
    window.__cam.path = here.concat(legs); window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = 1; window.__cam.done = false; }, [st, dist, angs, dur, up]);
  const keep = async () => { if (await ev(() => window.__cam.done)) await ev(() => { window.__cam.t0 = performance.now(); window.__cam.done = false; }); };
  const waitFor = async (fn, ms, every) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await keep(); if (await ev(fn)) return Date.now() - t0; await sleep(every || 600); } return -1; };
  const endSession = async () => { await ev(() => __g.AR.session.end()); await sleep(1500); };
  const play = async (how) => { await p.click('#bPlay'); await sleep(500); if (await ev(() => !document.getElementById('chooser').hidden)) await p.click(how || '#chFind'); await sleep(900); };
  const mapOf = (id) => ev((id) => localStorage.getItem(id === 'r1' ? 'base-camp-map-v1' : 'base-camp-map-v1.' + id), id);
  const zinfo = () => ev(() => __g.G.zones.map((z) => ({ id: z.id, room: z.room, cx: +z.cx.toFixed(2), cz: +z.cz.toFixed(2) })));
  const things = () => ev(() => { const out = []; for (const S of __g.G.settlements) { if (!S.placed || S.lost) continue; for (const t of S.things) { const [x, z] = __g.l2w(S, t.x, t.z); out.push({ id: t.id, kind: t.kind, x, z, y: S.tf.y }); } } return out; });
  const toRoom = (W, x, z, y) => { const c = Math.cos(W.yaw), s = Math.sin(W.yaw), dx = x - W.x, dz = z - W.z; return [dx * c - dz * s, (y || 0) - (W.y || 0), dx * s + dz * c]; };
  const thingErr = (before, W0, after, W1) => { let worst = 0, sum = 0, n = 0; for (const t of before) { const q = after.find((u) => u.id === t.id); if (!q) continue; const r0 = toRoom(W0, t.x, t.z, t.y), r1 = toRoom(W1, q.x, q.z, q.y), e = Math.max(Math.hypot(r0[0] - r1[0], r0[2] - r1[2]), Math.abs(r0[1] - r1[1])); worst = Math.max(worst, e); sum += e; n++; } return { worst: worst * 100, mean: n ? sum / n * 100 : 0, n }; };
  /* the camera picture behind the 3D view in screenshots (the AR canvas is transparent; aspect fill, as on the iPad) */
  const shot = async (name) => { await ev(() => { const v = window.NativeARData && window.__lastPic; if (v) { document.body.style.background = 'url(data:image/jpeg;base64,' + v + ') center / cover no-repeat'; } }); await p.screenshot({ path: OUT + name }); await ev(() => { if (__g.AR.on) document.body.style.background = 'transparent'; }); console.log('shot ' + name); };
  await p.addInitScript(() => { const t = setInterval(() => { const d = window.NativeARData; if (d && d.video_updated && d.video_data && d.video_width === 640) window.__lastPic = d.video_data; }, 30); void t; });
  await p.addInitScript(() => { window.__toasts = []; addEventListener('DOMContentLoaded', () => { const el = document.getElementById('toast'); if (el) new MutationObserver(() => { const t = el.innerText.trim(); if (t) window.__toasts.push(t); }).observe(el, { childList: true, subtree: true }); }); });
  const stk = () => ev(() => ({ state: __g.STK.state, err: __g.STK.err, runs: __g.STK.runs, seen: __g.STK.seen, fixes: __g.STK.fixes, ms: +__g.STK.msAvg.toFixed(1), hook: __g.STK.hook, dims: __g.STK.dims, stk: __g.G.stk ? __g.stkToJSON() : null, log: __g.REC.stk.slice(-6) }));
  const settleShed = async () => { await sweep(A_LEGS.concat(['deskA', 'floor']), 1.0); await waitFor(() => window.__cam.done, 200000, 2000); await waitFor(() => !!__g.RB.base, 120000, 1000); };

  await p.goto(url); await sleep(2500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await fresh([ST2, ST5]);
  ok('BUILD is build 28', await ev(() => __g.BUILD === 'build 28'));

  /* ===================== 1. detection and pose accuracy ===================== */
  await play(); await sweep(A_LEGS, 1.0);
  const tLib = await waitFor(() => __g.STK.state !== 'loading' && __g.STK.state !== 'off', 30000, 300); const S0 = await stk();
  ok('1. js-aruco2 loads from vendor/ in a hidden iframe (plain script tags; its global AR does not touch the game\'s AR)', S0.state === 'ready' && !!(await ev(() => __g.AR && __g.AR.viewM && document.getElementById('stkLib') && typeof document.getElementById('stkLib').contentWindow.AR.Detector === 'function' && __g.AR.viewM !== document.getElementById('stkLib').contentWindow.AR)), JSON.stringify({ state: S0.state, err: S0.err, ms: tLib }));
  const tS = await waitFor(() => __g.G.settlements.length > 0, 150000, 600); ok('1. the shed colony settles by itself (as build 26)', tS > 0, tS + ' ms');
  await settleShed();
  const camOK = await ev(() => { const d = window.NativeARData, e = __g.AR.viewM.elements, m = d.camera_transform; return Math.hypot(e[12] - m[12], e[13] - m[13], e[14] - m[14]) < 0.05; });
  ok('1. the fake\'s camera frame is the game\'s world frame (so the truth can be compared directly)', camOK);
  /* still views of sticker 2 from 0.8 m: straight on, 25 and 45 degrees each side */
  await ev(() => { __g.STK.obs = {}; __g.REC.stk.length = 0; });
  const single = []; await viewSticker(ST2, 0.8, [0, 25, -25, 45, -40], 3.2);
  const tSeen = await waitFor(() => __g.STK.seen >= 3, 60000, 300);
  for (let i = 0; i < 24; i++) { const o = await ev(() => { const L = __g.STK.obs[2]; const k = window.__placeMarks().find((q) => q.id === 2); if (!L || !L.length) return null; const w = L[L.length - 1].w; return { t: L[L.length - 1].t, dp: Math.hypot(w.p[0] - k.x, w.p[1] - k.y, w.p[2] - k.z) * 100, dn: Math.acos(Math.min(1, w.n[2])) * 57.2958, side: L[L.length - 1].side, refined: L[L.length - 1].refined }; }); if (o && !single.some((q) => q.t === o.t)) single.push(o); await sleep(500); }
  const S1 = await stk(); const fixes = await ev(() => __g.REC.stk.filter((e) => e.fix === 2));
  ok('1. sticker 2 is found in the camera pictures (every 4th frame, 640 x 480 JPEG)', tSeen >= 0 && S1.seen >= 5, JSON.stringify({ seen: S1.seen, runs: S1.runs, ms: S1.ms, hook: S1.hook, dims: S1.dims, picMs: await ev(() => +(window.__native.picMs / Math.max(1, window.__native.pics)).toFixed(1)) }));
  const truth = await ev(() => window.__placeMarks().find((q) => q.id === 2));
  const F1 = await ev(() => __g.STK.lastF || __g.stkFixOf(2)); /* the newest fix the game made from the still views */
  const fp = F1 && Math.hypot(F1.p[0] - truth.x, F1.p[1] - truth.y, F1.p[2] - truth.z) * 100, fn = F1 && Math.acos(Math.min(1, F1.n[2])) * 57.2958, fy = F1 && Math.abs(Math.atan2(Math.sin(F1.h - Math.PI / 2), Math.cos(F1.h - Math.PI / 2))) * 57.2958;
  const sp = single.map((q) => q.dp), sn = single.map((q) => q.dn);
  console.log('ACCURACY single pictures: n ' + single.length + ', position mean ' + (sp.reduce((a, v) => a + v, 0) / Math.max(1, sp.length)).toFixed(2) + ' cm, worst ' + Math.max(0, ...sp).toFixed(2) + ' cm; normal mean ' + (sn.reduce((a, v) => a + v, 0) / Math.max(1, sn.length)).toFixed(2) + ' deg, worst ' + Math.max(0, ...sn).toFixed(2) + ' deg; sides ' + single.map((q) => Math.round(q.side)).join(','));
  console.log('ACCURACY averaged fix: ' + JSON.stringify(F1 && { posCm: +fp.toFixed(2), normalDeg: +fn.toFixed(2), yawDeg: +fy.toFixed(2), sdYaw: +F1.sdYaw.toFixed(2), sdPcm: +(F1.sdP * 100).toFixed(2), rms: +F1.rms.toFixed(2), used: F1.used + '/' + F1.of, kind: F1.kind }));
  ok('1. averaged pose of sticker 2 is within 2 cm and 2 degrees of the truth', F1 && fp < 2 && fn < 2 && fy < 2, F1 && ('position ' + fp.toFixed(2) + ' cm, normal ' + fn.toFixed(2) + ' deg, yaw ' + fy.toFixed(2) + ' deg, from ' + F1.used + ' pictures'));
  ok('1. a fix needs several pictures: none from fewer than 5, and outliers are dropped', fixes.length > 0 && fixes.every((e) => +e.used.split('/')[0] >= 5), JSON.stringify(fixes.slice(-3)));
  ok('1. one picture alone never makes a fix (2 sightings -> no fix)', await ev(() => { const L = __g.STK.obs[2]; const keep = L.slice(); __g.STK.obs[2] = L.slice(-2); const f = __g.stkFixOf(2); __g.STK.obs[2] = keep; return f === null; }));

  /* ===================== 2. first-time binding ===================== */
  const tB = await waitFor(() => !!__g.G.stk, 60000, 500); await sleep(2500); const S2 = await stk();
  const row = await ev(() => __g.HOMES.rooms.find((r) => r.id === 'r1'));
  ok('2. the settled shed takes sticker 2 the first time it is seen (registry row and G.stk)', tB >= 0 && S2.stk && S2.stk.id === 2 && row.stk === 2, JSON.stringify({ stk: S2.stk, row: row.stk, log: S2.log.filter((e) => e.bind || e.agree).slice(-2) }));
  const bp = S2.stk && Math.hypot(S2.stk.p[0] - truth.x, S2.stk.p[1] - truth.y, S2.stk.p[2] - truth.z) * 100; ok('2. the bound pose is where the sticker really is (map frame = this session\'s frame)', bp < 2, bp && bp.toFixed(2) + ' cm');
  await ev(() => __g.persist(true)); const m2 = JSON.parse(await mapOf('r1')); ok('2. the sticker is saved with the room map (map frame, size 8 cm)', m2 && m2.stk && m2.stk.id === 2 && m2.stk.size === 0.08, JSON.stringify(m2 && m2.stk));
  const toastSeen = await ev(() => __g.STK.binds >= 1 && window.__toasts.some((t) => /Sticker found \u2713 It belongs to Room 1 now/.test(t))); ok('2. "Sticker found ✓" was said quietly (a 2-3 s toast, no card)', toastSeen && (await ev(() => document.getElementById('modal').hidden && document.getElementById('ask').hidden)));
  await viewSticker(ST2, 0.7, [20, 30], 3); await ev(() => { __g.STK.sayT = -1e9; }); await waitFor(() => /Sticker found/.test(document.getElementById('toast').innerText), 15000, 150); await shot('96-sticker-found.png');

  /* ===================== 3. sleep + origin jump: the surfaces alone (sticker hidden, build 26), then the sticker ===================== */
  await sweep(A_LEGS, 1.0); await sleep(4000); await waitFor(() => __g.AUTO.commitAt === 0 && !__g.RF.on, 60000, 800);
  const back = () => !__g.RF.on && __g.world.visible && (__g.G.locked || __g.RELOC.state === 'new'); /* this is a new room: after a relock it goes on growing (state 'new') */
  const sleepJump = async (W) => { await ev(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(1500); await ev((W) => { window.__W = W; }, W);
    await ev(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(600); };
  const W0 = { yaw: 0, x: 0, z: 0, y: 0 }, WS = { yaw: 20 * Math.PI / 180, x: 0.7, z: -0.45, y: 0.5 }, WK = { yaw: WS.yaw + 25 * Math.PI / 180, x: WS.x + 0.4, z: WS.z - 0.3, y: WS.y - 0.2 }; /* WS: the jump of roomfix-test section 4 */
  await ev(() => { window.__MARKS = []; }); await sleep(500);
  const before3s = await things(); await sleepJump(WS); const t3s = Date.now(); await sweep(A_LEGS, 1.0); const tR3s = await waitFor(back, 180000, 500); const secs3s = (Date.now() - t3s) / 1000;
  await sleep(1500); const e3s = thingErr(before3s, W0, await things(), WS); await waitFor(() => __g.AUTO.commitAt === 0, 90000, 800); await sleep(500); const e3sb = thingErr(before3s, W0, await things(), WS);
  if (tR3s < 0) console.log('DEBUG3s', JSON.stringify(await ev(() => ({ rf: { on: __g.RF.on, phase: __g.RF.phase, hidden: __g.RF.hidden }, locked: __g.G.locked, state: __g.RELOC.state, rel: __g.REC.relock.slice(-10), reloc: __g.REC.reloc.slice(-3) }))));
  console.log('RELOCK surfaces only: ' + secs3s.toFixed(1) + ' s until the camp is back; right after worst ' + e3s.worst.toFixed(2) + ' cm mean ' + e3s.mean.toFixed(2) + ' cm; after the polish worst ' + e3sb.worst.toFixed(2) + ' cm mean ' + e3sb.mean.toFixed(2) + ' cm (' + e3sb.n + ' things)');
  ok('3. surfaces only (sticker hidden): the camp is found again as in build 26', tR3s > 0 && !(await ev(() => __g.RELOC.lock && __g.RELOC.lock.stk)), secs3s.toFixed(1) + ' s');
  await ev(([a, c]) => { window.__MARKS = [a, c]; }, [ST2, ST5]); await sweep(A_LEGS, 1.0); await sleep(4000); await waitFor(() => __g.AUTO.commitAt === 0 && !__g.RF.on, 60000, 800);
  const before3 = await things(); await sleepJump(WK);
  const H3 = await ev(() => ({ on: __g.RF.on, hidden: __g.RF.hidden, hint: document.getElementById('hint').innerText }));
  ok('3. waking up hides the camp; the hint offers the sticker ("Have a sticker? Point at it")', H3.on && H3.hidden && /Look around so I can find the camp again/.test(H3.hint) && /Have a sticker\? Point at it/.test(H3.hint), JSON.stringify(H3));
  await shot('97-sticker-wake-hint.png');
  const t3 = Date.now(); await viewSticker(ST2, 0.8, [30, 15, 40, 20], 3.5); const tR3 = await waitFor(back, 120000, 250); const secs3 = (Date.now() - t3) / 1000;
  const L3 = await ev(() => ({ lock: __g.RELOC.lock, st: __g.REC.stk.filter((e) => e.lock).slice(-2) }));
  if (tR3 < 0) console.log('DEBUG3', JSON.stringify(await ev(() => ({ rf: { on: __g.RF.on, phase: __g.RF.phase, hidden: __g.RF.hidden }, locked: __g.G.locked, state: __g.RELOC.state, rel: __g.REC.relock.slice(-10), stk: __g.REC.stk.filter((e) => !e.fix).slice(-15) }))));
  ok('3. the sticker gives the camp back (lock from the sticker)', tR3 > 0 && L3.lock && !!L3.lock.stk, secs3.toFixed(1) + ' s ' + JSON.stringify({ stk: L3.lock && L3.lock.stk, how: L3.lock && L3.lock.how, st: L3.st }));
  await sleep(1000); const e3a = thingErr(before3s, W0, await things(), WK); await viewSticker(ST2, 0.8, [25, 35], 3); await sleep(5000); const e3 = thingErr(before3s, W0, await things(), WK); /* a few more seconds with the sticker in view refine it; every error is against the room as it was first mapped (before any jump) */
  await shot('98-sticker-relocked.png');
  await sweep(A_LEGS, 1.0); await waitFor(() => __g.AUTO.commitAt === 0, 90000, 800); await sleep(500); const e3b = thingErr(before3s, W0, await things(), WK);
  console.log('RELOCK sticker: ' + secs3.toFixed(1) + ' s until the camp is back; 1 s after worst ' + e3a.worst.toFixed(2) + ' cm mean ' + e3a.mean.toFixed(2) + ' cm; 5 s later (sticker still in view) worst ' + e3.worst.toFixed(2) + ' cm mean ' + e3.mean.toFixed(2) + ' cm; after a sweep (surface polish) worst ' + e3b.worst.toFixed(2) + ' cm mean ' + e3b.mean.toFixed(2) + ' cm (' + e3b.n + ' things)');
  if (process.env.MK_STOP === '3') { console.log('stopped after 3'); await b.close(); srv.close(); process.exit(0); }
  ok('3. the sticker relock is faster and more accurate than the surface-only relock', tR3 > 0 && secs3 < secs3s && e3.worst < 2 && e3.worst < e3s.worst && e3b.worst <= Math.max(2, e3sb.worst), 'sticker ' + secs3.toFixed(1) + ' s, worst ' + e3.worst.toFixed(2) + ' / ' + e3b.worst.toFixed(2) + ' cm; surfaces ' + secs3s.toFixed(1) + ' s, worst ' + e3s.worst.toFixed(2) + ' / ' + e3sb.worst.toFixed(2) + ' cm');
  await ev(() => __g.persist(true)); await endSession();

  /* ===================== 4. Room 2 (the lounge) and Room 1's sticker seen there ===================== */
  await ev(() => localStorage.setItem('bc-test-off', String(3 * 3600 * 1000))); await fresh([ST2, ST5]);
  await ev(() => { window.__cam.mode = 'fixed'; window.__cam.fixed = [0.6, -0.3, -4.9, 0, -0.55]; }); /* already in the lounge */
  await play('#chNew'); await sweep(L_LEGS, 1.0);
  const t4 = await waitFor(() => __g.G.settlements.length > 0, 150000, 600); ok('4. + New room: the lounge becomes Room 2 and its colony settles', t4 > 0 && (await ev(() => __g.HOMES.cur === 'r2')));
  await sweep(L_LEGS.concat(['sofa', 'lfloor']), 1.0); await waitFor(() => window.__cam.done, 200000, 2000); await waitFor(() => !!__g.RB.base, 120000, 1000);
  await ev(() => { __g.STK.obs = {}; }); await viewSticker(ST5, 0.8, [0, 25, -25, 40], 3.2);
  const tB4 = await waitFor(() => __g.G.stk && __g.G.stk.id === 5, 90000, 500); ok('4. Room 2 takes sticker 5', tB4 >= 0 && (await ev(() => __g.HOMES.rooms.find((r) => r.id === 'r2').stk === 5)), JSON.stringify(await ev(() => __g.REC.stk.slice(-3))));
  await ev(() => __g.persist(true)); const map1 = await mapOf('r1'), map2 = await mapOf('r2'), z4 = await zinfo();
  await ev(([a, c, d]) => { window.__MARKS = [a, c, d]; }, [ST2, ST5, ST2L]); await ev(() => { __g.STK.obs = {}; });
  await viewSticker(ST2L, 0.8, [0, 20, -20, 35], 3.2);
  const tQ = await waitFor(() => !document.getElementById('nroom').hidden && /moved to another room/.test(document.getElementById('nroom').innerText), 60000, 400);
  const Q4 = await ev(() => { const el = document.getElementById('nroom'), pre = document.getElementById('mvPre'); return { txt: el.innerText.replace(/\s+/g, ' '), pre: pre ? pre.dataset.room + ':' + pre.innerText : '', first: el.querySelector('button') && el.querySelector('button').id, why: __g.RB.ask && __g.RB.ask.why }; });
  ok('4. Room 1\'s sticker seen in Room 2 asks "Have you moved to another room?" with Room 1 offered first', tQ >= 0 && /That sticker belongs to Room 1/.test(Q4.txt) && Q4.pre === 'r1:It’s Room 1' && Q4.first === 'mvPre' && /New room/.test(Q4.txt) && /No, still here/.test(Q4.txt), JSON.stringify(Q4));
  await sleep(300); await shot('99-sticker-other-room-prompt.png');
  const z4b = await zinfo(); ok('4. nothing is merged: Room 2 keeps its zones, Room 1\'s saved map is byte for byte the same', z4b.length === z4.length && z4b.every((z) => z.room === 'r2') && (await mapOf('r1')) === map1, z4.length + ' -> ' + z4b.length);
  await p.click('#mvNo'); await sleep(600); await ev(() => { __g.STK.obs = {}; }); await viewSticker(ST2L, 0.8, [10, -10, 25], 3); await sleep(9000);
  const Q4b = await ev(() => ({ up: !document.getElementById('nroom').hidden, ign: __g.STK.ignore[2], cur: __g.HOMES.cur, stk: __g.G.stk && __g.G.stk.id }));
  ok('4. "No, still here": the lounge stays Room 2 with sticker 5 and the question does not come back for that sticker', !Q4b.up && Q4b.ign === 1 && Q4b.cur === 'r2' && Q4b.stk === 5, JSON.stringify(Q4b));
  await ev(([a, c]) => { window.__MARKS = [a, c]; }, [ST2, ST5]); await ev(() => __g.persist(true)); await endSession();

  /* ===================== 5. Continue Room 1: the chooser hint, the fast sticker lock ===================== */
  await ev(() => localStorage.setItem('bc-test-off', String(6 * 3600 * 1000))); await fresh([ST2, ST5]);
  await p.click('#bPlay'); await sleep(700); const C5 = await ev(() => ({ shown: !document.getElementById('chooser').hidden, hint: (document.querySelector('#chooser .chstk') || {}).innerText || '' }));
  ok('5. the start chooser names Room 1 among the rooms that have a sticker (build 28: only for a room that owns one)', C5.shown && /(^|and )Room 1( and Room \d)* (has a sticker: point at it|have stickers: point at one)/.test(C5.hint), JSON.stringify(C5));
  await shot('100-chooser-sticker-hint.png');
  await p.click('#chooser [data-room="r1"]'); await sleep(900); await ev(() => { window.__cam.mode = 'fixed'; window.__cam.fixed = [0.45, 0.1, -1.85, 0.3, -0.12]; });
  const t5 = Date.now(); await viewSticker(ST2, 0.8, [25, 10, 35], 3.5); const tL5 = await waitFor(() => __g.G.locked, 120000, 300); const secs5 = (Date.now() - t5) / 1000;
  const L5 = await ev(() => ({ lock: __g.RELOC.lock, st: __g.REC.stk.filter((e) => e.lock).slice(-2) }));
  ok('5. Continue Room 1: the shed is found from its sticker', tL5 > 0 && L5.lock && !!L5.lock.stk, secs5.toFixed(1) + ' s ' + JSON.stringify(L5.st));
  await sleep(4000); await shot('101-sticker-continue-found.png');
  await sweep(A_LEGS, 1.0); await waitFor(() => __g.AUTO.commitAt === 0, 90000, 800); await ev(() => __g.persist(true)); await endSession();

  /* ===================== 6. fallbacks ===================== */
  await ev(() => localStorage.setItem('bc-test-off', String(9 * 3600 * 1000))); await fresh([ST2, ST5]); await ev(() => { window.__noCamera = true; });
  await play('#chooser [data-room="r1"]'); await sweep(A_LEGS, 1.0);
  const tL6 = await waitFor(() => __g.G.locked, 240000, 600); const S6 = await stk();
  ok('6. no camera-access: no pictures, the sticker finder stays quiet and the surfaces find the shed (build 26)', tL6 > 0 && S6.runs === 0 && !(await ev(() => __g.RELOC.lock.stk)) && (await ev(() => __g.REC.stk.some((e) => e.camera === 'no pictures'))), JSON.stringify({ t: tL6, state: S6.state, runs: S6.runs, opts: await ev(() => (window.__sessionOpts || {}).computer_vision_data) }));
  await endSession(); await ev(() => { window.__noCamera = false; });
  blockVendor = true; await ev(() => localStorage.setItem('bc-test-off', String(12 * 3600 * 1000))); await fresh([ST2, ST5]);
  await play('#chooser [data-room="r1"]'); await sweep(A_LEGS, 1.0);
  const tE = await waitFor(() => __g.STK.state === 'error', 30000, 500); const tL6b = await waitFor(() => __g.G.locked, 240000, 600);
  ok('6. the vendored files fail to load: STK.state is error, the game plays on and the surfaces find the shed', tE >= 0 && tL6b > 0 && !(await ev(() => __g.RELOC.lock.stk)), JSON.stringify(await ev(() => ({ state: __g.STK.state, err: __g.STK.err }))));
  await shot('102-sticker-fallback-no-library.png');
  await endSession(); blockVendor = false;

  /* ===================== 7. the printable page and the Menu link ===================== */
  const link = await ev(() => { __g.menuUi(); const a = document.getElementById('mStick'); const r = a ? { href: a.getAttribute('href'), txt: a.innerText, target: a.target } : null; document.getElementById('modal').hidden = true; return r; });
  ok('7. the Menu links to the sticker page', link && link.href === 'stickers.html' && /Print room stickers/.test(link.txt), JSON.stringify(link));
  const sp2 = await ctx.newPage(); await sp2.goto(url.replace('index.html', 'stickers.html')); await sleep(800);
  const pdf = await sp2.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true }); const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  const pg = await sp2.evaluate(() => ({ txt: document.body.innerText, svgs: document.querySelectorAll('svg.mk').length, mm: (() => { const s = document.querySelector('svg.mk').getBoundingClientRect(); return s.width / 96 * 25.4; })() }));
  ok('7. stickers.html: two A4 pages, six stickers, the size (8 cm) and the friendly wording are on the page, nothing personal', pages === 2 && pg.svgs === 6 && /8 cm/.test(pg.txt) && /Stick one somewhere flat that stays put, like the side of a bookcase/.test(pg.txt) && !/Harry|@|www\./i.test(pg.txt), JSON.stringify({ pages, svgs: pg.svgs, svgMm: +pg.mm.toFixed(1) }));
  await sp2.setViewportSize({ width: 900, height: 1300 }); await sp2.screenshot({ path: OUT + '103-stickers-page.png', fullPage: false }); console.log('shot 103-stickers-page.png');
  const png = (await sp2.screenshot({ fullPage: true })).toString('base64'); await sp2.close();
  const ids = await ev(async (png) => { const im = new Image(); await new Promise((r) => { im.onload = r; im.src = 'data:image/png;base64,' + png; }); if (__g.STK.state !== 'ready') { __g.STK.state = 'off'; __g.stkLoad(); await new Promise((r) => { const t = setInterval(() => { if (__g.STK.state !== 'loading') { clearInterval(t); r(); } }, 100); }); }
    const c = document.createElement('canvas'), s = Math.min(1, 1400 / im.width); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); const g = c.getContext('2d'); g.drawImage(im, 0, 0, c.width, c.height); const d = g.getImageData(0, 0, c.width, c.height);
    return __g.stkDetect(__g.STK.lib, __g.STK.det, { width: c.width, height: c.height, data: d.data }).map((m) => m.id).sort(); }, png);
  ok('7. the printed patterns are read back by the game\'s detector as stickers 1 to 6', ids.join() === '1,2,3,4,5,6', ids.join());

  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 5)));
  const fails = res.filter((r) => !r).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
