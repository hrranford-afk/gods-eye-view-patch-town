/* Base Camp build 28: markerless room snapshots (HANDOVER "Room snapshots"), in AR with the real WebXRKit polyfill and the fake native side.
   ar-fake.js draws the fake room's own texture (texture-render.js: a rug on the floor, a patterned cushion on the desk, a tray on the speaker, books on the shelf, book spines
   on the shelf's front, two posters on the walls) into 640 x 480 JPEG camera pictures, every 4th frame, from the camera pose of that frame. The posters and the spines are
   vertical: the fake's hit tests stop at them (no plane there), so their corners have no 3D point and are dropped, as on the iPad.
    1. keyframes are made while the shed is played, spread over viewpoints, saved with the room map: descriptors and 3D points only (no picture anywhere in storage);
       their points lie on the real surfaces; bytes per room.
    2. sleep + origin jump, NO sticker: the snapshots give the camp back (time, worst error), then the same jump with the snapshots switched off (surfaces only, build 26).
    3. the lounge becomes Room 2 with its own snapshots; from the lounge's doorway the iPad looks back into the shed (still inside the lounge's box, so the build 26 guard does not ask): Room 1's snapshots ask "Have you moved to another room?" with Room 1 first; nothing is merged.
    4. Continue Room 1 from the chooser: the snapshots lock it.
    5. "Not sure? Let the colonists work it out" in the lounge: every saved room's snapshots are scored, Room 2 wins.
    6. Room 1 gets a sticker: after a jump with the sticker in view the sticker still locks first; the chooser names the room that has one.
    7. a texture-poor room (plain tops, blank walls): no keyframes (too few points), and after a jump the surfaces find the camp as in build 26.
   Run (about 30 minutes):  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node tests/snapshot-test.js     (SN_STOP=N stops after section N) */
const fs = require('fs'), path = require('path'), vm = require('vm');
const { serve, ROOT } = require('./lib.js'); const install = require('./ar-fake.js'); const { chromium } = require('playwright');
const POLY = fs.readFileSync(path.join(ROOT, 'webxr-polyfill.js'), 'utf8'); const OUT = path.join(ROOT, 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const DICT = (() => { const ctx = vm.createContext({}); vm.runInContext('var AR = { DICTIONARIES: {} }; var require = () => ({});', ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, 'vendor/js-aruco2/dictionaries/aruco_4x4_1000.js'), 'utf8'), ctx); return ctx.AR.DICTIONARIES.ARUCO_4X4_1000.codeList; })();
const bits = (id) => DICT[id][0].toString(2).padStart(8, '0') + DICT[id][1].toString(2).padStart(8, '0');
const SHED = [['floor', -1.2, 0, -1.5, 1.4, 1.4], ['deskA', -0.45, -0.45, -1.2, 0.3, 0.25], ['speakerA', -0.45, 0.8, -1.0, 0.15, 0.125], ['shelf', 0.2, 0.0, -2.7, 0.7, 0.13]];
const LOUNGE = [['lfloor', -1.2, 0.2, -5.6, 1.3, 1.3], ['sofa', -0.78, 0.6, -6.1, 0.5, 0.3], ['ltable', -0.85, -0.5, -5.7, 0.3, 0.25], ['lamp', -0.6, 0.9, -4.7, 0.15, 0.15]];
const WORLD = SHED.concat(LOUNGE);
const H = (x, y, z, hw, hh, tex, seed) => ({ n: tex + seed, x, y, z, ax: [1, 0, 0], ay: [0, 0, -1], hw, hh, tex, seed }); /* lying flat */
const Vt = (x, y, z, ax, hw, hh, tex, seed) => ({ n: tex + seed, x, y, z, ax, ay: [0, 1, 0], hw, hh, tex, seed, block: true }); /* standing up (a wall, a bookcase's front) */
const SHED_TEX = [H(0.35, -1.197, -1.75, 0.45, 0.32, 'rug', 11), H(-0.5, -0.448, -1.15, 0.12, 0.12, 'cushion', 12), H(0.8, -0.448, -1.0, 0.12, 0.1, 'tray', 13), H(-0.2, 0.202, -2.7, 0.34, 0.11, 'books', 14),
  Vt(-0.3, 0.05, -2.569, [1, 0, 0], 0.35, 0.13, 'spines', 15), Vt(0.5, 0.6, -2.89, [1, 0, 0], 0.3, 0.22, 'poster', 16), Vt(1.39, -0.4, -1.5, [0, 0, 1], 0.3, 0.2, 'poster', 17)];
const LOUNGE_TEX = [H(0.0, -1.197, -5.35, 0.5, 0.35, 'rug', 21), H(0.45, -0.778, -6.1, 0.15, 0.15, 'cushion', 22), H(-0.5, -0.848, -5.7, 0.14, 0.1, 'books', 23), Vt(0.2, -0.2, -6.89, [1, 0, 0], 0.3, 0.25, 'poster', 24)];
const DOOR_VIEW = [[0.35, -1.2, -1.75], 1.95, 1.2]; /* the shed's rug seen from the lounge's doorway (z -3.7, 0.6 m outside the lounge's box: within RB_CAM, so the build 26 guard stays quiet) */
const ST2 = { id: 2, x: 0.25, y: -0.02, z: -2.565, ax: [1, 0, 0], ay: [0, 1, 0], size: 0.08, bits: bits(2) }; /* on the front of the shed's shelf */
const A_LEGS = ['shelf', 'deskA', 'floor', 'speakerA', 'floor2', 'shelf'], L_LEGS = ['lfloor', 'sofa', 'ltable', 'lamp', 'lfloor2'];
(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { const N = Date.now.bind(Date); Date.now = () => N() + (+localStorage.getItem('bc-test-off') || 0); });
  await install(p, WORLD); await p.addInitScript({ content: POLY });
  await p.addInitScript((W) => { window.__WORLD = W; }, WORLD);
  const ev = (f, a) => p.evaluate(f, a);
  const stop = async (n) => { if (process.env.SN_STOP === String(n)) { console.log('stopped after ' + n); const fails = res.filter((r) => !r).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(fails ? 1 : 0); } };
  const noOverlay = () => ev(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  const fresh = async (tex, marks) => { await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); await ev(([tex, marks]) => { window.__SHED = window.__WORLD; window.__W = { yaw: 0, x: 0, z: 0, y: 0 }; window.__MARKS = marks || []; window.__TEX = tex; window.__cam.fixed = [0, -0.1, -2.1, 0, -1.3]; __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; }, [tex, marks]); };
  const sweep = (legs, speed) => ev(([legs, speed]) => { const T = window.__place(), pick = (n) => T.find((t) => t.n === n);
    const look = (n, off, hgt, ay, ap, dur) => { const S = pick(n); if (!S) return null; const q = [S.cx + off[0], S.y + hgt, S.cz + off[1]], fx = S.cx - q[0], fy = S.y - q[1], fz = S.cz - q[2], L = Math.hypot(fx, fy, fz); return { p: q, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay, ap, dur }; };
    const D = { floor: ['floor', [0, 1.3], 1.6, 0.6, 0.25, 12], floor2: ['floor', [0.3, -0.4], 1.7, 0.7, 0.25, 9], deskA: ['deskA', [0.1, 0.7], 0.8, 0.3, 0.15, 10], speakerA: ['speakerA', [0.1, 0.5], 0.55, 0.12, 0.1, 8], shelf: ['shelf', [0, 0.6], 0.5, 0.18, 0.1, 10],
      lfloor: ['lfloor', [0, -0.4], 1.5, 0.6, 0.25, 12], lfloor2: ['lfloor', [0.3, -0.9], 1.6, 0.7, 0.25, 9], sofa: ['sofa', [0.1, -0.65], 0.6, 0.15, 0.1, 9], ltable: ['ltable', [0, -0.6], 0.6, 0.15, 0.1, 8], lamp: ['lamp', [0, -0.9], 0.5, 0.12, 0.1, 8] };
    const e = __g.AR.on ? __g.AR.viewM.elements : null, here = e ? [{ p: [e[12], e[13], e[14]], yaw: Math.atan2(e[8], e[10]), pitch: Math.asin(Math.max(-1, Math.min(1, -e[9]))), ay: 0, ap: 0, dur: 0.3 }] : [];
    window.__cam.path = here.concat(legs.map((l) => { const d = D[l]; return look(d[0], d[1], d[2], d[3], d[4], d[5]); }).filter(Boolean)); window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = speed || 1; window.__cam.done = false; }, [legs, speed]);
  /* still looks at a spot of the room (room coordinates, turned with __W): from dist metres, at the given headings (degrees), from hgt above it */
  const viewAt = (pt, dist, heads, hgt, dur) => ev(([pt, dist, heads, hgt, dur]) => { const W = window.__W, c = Math.cos(W.yaw), s = Math.sin(W.yaw), k = [pt[0] * c + pt[2] * s + W.x, pt[1] + (W.y || 0), -pt[0] * s + pt[2] * c + W.z];
    const e = __g.AR.viewM.elements, here = [{ p: [e[12], e[13], e[14]], yaw: Math.atan2(e[8], e[10]), pitch: Math.asin(Math.max(-1, Math.min(1, -e[9]))), ay: 0, ap: 0, dur: 0.3 }];
    const legs = heads.map((a) => { const r = a * Math.PI / 180 + W.yaw, q = [k[0] + Math.sin(r) * dist, k[1] + hgt, k[2] + Math.cos(r) * dist], fx = k[0] - q[0], fy = k[1] - q[1], fz = k[2] - q[2], L = Math.hypot(fx, fy, fz); return { p: q, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay: 0.02, ap: 0.015, dur }; });
    window.__cam.path = here.concat(legs, [Object.assign({}, here[0], { dur: 4 })]); /* ends where the loop starts again: no jump of the camera when it repeats */ window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = 1; window.__cam.done = false; }, [pt, dist, heads, hgt, dur]);
  const viewSticker = (st, dist, angs, dur, up) => ev(([st, dist, angs, dur, up]) => { const ki = window.__MARKS.findIndex((q) => q.id === st.id && Math.hypot(q.x - st.x, q.y - st.y, q.z - st.z) < 0.05), k = window.__placeMarks()[ki], n = [k.ax[1] * k.ay[2] - k.ax[2] * k.ay[1], k.ax[2] * k.ay[0] - k.ax[0] * k.ay[2], k.ax[0] * k.ay[1] - k.ax[1] * k.ay[0]];
    const e = __g.AR.viewM.elements, here = [{ p: [e[12], e[13], e[14]], yaw: Math.atan2(e[8], e[10]), pitch: Math.asin(Math.max(-1, Math.min(1, -e[9]))), ay: 0, ap: 0, dur: 0.3 }];
    const legs = angs.map((a) => { const r = a * Math.PI / 180, dx = n[0] * Math.cos(r) - n[2] * Math.sin(r), dz = n[0] * Math.sin(r) + n[2] * Math.cos(r), q = [k.x + dx * dist, k.y + (up || 0.12), k.z + dz * dist], fx = k.x - q[0], fy = k.y - q[1], fz = k.z - q[2], L = Math.hypot(fx, fy, fz); return { p: q, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay: 0.015, ap: 0.01, dur }; });
    window.__cam.path = here.concat(legs); window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = 1; window.__cam.done = false; }, [st, dist, angs, dur, up]);
  const keep = async () => { if (await ev(() => window.__cam.done)) await ev(() => { window.__cam.t0 = performance.now(); window.__cam.done = false; }); };
  const waitFor = async (fn, ms, every) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await keep(); if (await ev(fn)) return Date.now() - t0; await sleep(every || 600); } return -1; };
  const endSession = async () => { await ev(() => __g.AR.session.end()); await sleep(1500); };
  const play = async (how) => { await p.click('#bPlay'); await sleep(500); if (await ev(() => !document.getElementById('chooser').hidden)) await p.click(how || '#chFind'); await sleep(900); };
  const mapOf = (id) => ev((id) => localStorage.getItem(id === 'r1' ? 'base-camp-map-v1' : 'base-camp-map-v1.' + id), id);
  const zinfo = () => ev(() => __g.G.zones.map((z) => ({ id: z.id, room: z.room })));
  const things = () => ev(() => { const out = []; for (const S of __g.G.settlements) { if (!S.placed || S.lost) continue; for (const t of S.things) { const [x, z] = __g.l2w(S, t.x, t.z); out.push({ id: t.id, kind: t.kind, x, z, y: S.tf.y }); } } return out; });
  const toRoom = (W, x, z, y) => { const c = Math.cos(W.yaw), s = Math.sin(W.yaw), dx = x - W.x, dz = z - W.z; return [dx * c - dz * s, (y || 0) - (W.y || 0), dx * s + dz * c]; };
  const thingErr = (before, W0, after, W1) => { let worst = 0, sum = 0, n = 0; for (const t of before) { const q = after.find((u) => u.id === t.id); if (!q) continue; const r0 = toRoom(W0, t.x, t.z, t.y), r1 = toRoom(W1, q.x, q.z, q.y), e = Math.max(Math.hypot(r0[0] - r1[0], r0[2] - r1[2]), Math.abs(r0[1] - r1[1])); worst = Math.max(worst, e); sum += e; n++; } return { worst: worst * 100, mean: n ? sum / n * 100 : 0, n }; };
  const compose = (D, W) => { const c = Math.cos(D.yaw), s = Math.sin(D.yaw); return { yaw: W.yaw + D.yaw, x: W.x * c + W.z * s + D.x, z: -W.x * s + W.z * c + D.z, y: (W.y || 0) + D.y }; }; /* the jump D on top of the room's placement W (the fake's turn convention) */
  /* the screenshot: the camera picture behind the 3D view; with dots, the room's snapshot points that the current camera sees (green) */
  const shot = async (name, dots) => { await ev((dots) => { const v = window.NativeARData && window.__lastPic; if (v) document.body.style.background = 'url(data:image/jpeg;base64,' + v + ') center / cover no-repeat';
      let cv = document.getElementById('__dots'); if (cv) cv.remove(); if (!dots || !__g.G.snap) return; cv = document.createElement('canvas'); cv.id = '__dots'; cv.width = innerWidth; cv.height = innerHeight; cv.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:5'; document.body.appendChild(cv); const g = cv.getContext('2d');
      const V = __g.AR.viewM.elements, P = __g.AR.projM.elements, T = __g.G.align; let n = 0;
      for (const k of __g.G.snap.kf) for (let j = 0; j < k.n; j++) { let x = k.P[3 * j], y = k.P[3 * j + 1], z = k.P[3 * j + 2]; if (T) { const c = Math.cos(T.phi), s = Math.sin(T.phi); [x, z] = [x * c - z * s + T.tx, x * s + z * c + T.tz]; y += T.dy; }
        const dx = x - V[12], dy = y - V[13], dz = z - V[14], X = V[0] * dx + V[1] * dy + V[2] * dz, Y = V[4] * dx + V[5] * dy + V[6] * dz, Z = V[8] * dx + V[9] * dy + V[10] * dz; if (Z > -0.05) continue;
        const u = (P[0] * X / -Z + P[8] * 1 + 1) / 2 * innerWidth, w = (1 - (P[5] * Y / -Z + P[9])) / 2 * innerHeight; if (u < 0 || w < 0 || u > innerWidth || w > innerHeight) continue; g.fillStyle = 'rgba(80,255,120,0.9)'; g.beginPath(); g.arc(u, w, 3, 0, 7); g.fill(); n++; }
      g.fillStyle = '#fff'; g.font = '15px sans-serif'; g.fillText(n + ' snapshot points in view (test overlay, not in the game)', 14, innerHeight - 14); }, dots);
    await p.screenshot({ path: OUT + name }); await ev(() => { const cv = document.getElementById('__dots'); if (cv) cv.remove(); if (__g.AR.on) document.body.style.background = 'transparent'; }); console.log('shot ' + name); };
  await p.addInitScript(() => { const t = setInterval(() => { const d = window.NativeARData; if (d && d.video_updated && d.video_data && d.video_width === 640) window.__lastPic = d.video_data; }, 30); void t; });
  await p.addInitScript(() => { window.__toasts = []; addEventListener('DOMContentLoaded', () => { const el = document.getElementById('toast'); if (el) new MutationObserver(() => { const t = el.innerText.trim(); if (t) window.__toasts.push(t); }).observe(el, { childList: true, subtree: true }); }); });
  const snap = () => ev(() => ({ kf: __g.G.snap ? __g.G.snap.kf.length : 0, pts: __g.G.snap ? __g.G.snap.kf.reduce((a, k) => a + k.n, 0) : 0, runs: __g.SNAP.runs, ms: +__g.SNAP.msAvg.toFixed(1), msMax: Math.round(__g.SNAP.msMax), msKf: Math.round(__g.SNAP.msKf), made: __g.SNAP.made, dropped: __g.SNAP.dropped, tooFew: __g.SNAP.tooFew, fixes: __g.SNAP.fixes, locks: __g.SNAP.locks, agree: __g.SNAP.agree, disagree: __g.SNAP.disagree, dims: __g.SNAP.dims, err: __g.SNAP.err, lastF: __g.SNAP.lastF && { room: __g.SNAP.lastF.room, inl: __g.SNAP.lastF.inl, of: __g.SNAP.lastF.of, pics: __g.SNAP.lastF.pics, ok: __g.SNAP.lastF.ok, rms: +__g.SNAP.lastF.rms.toFixed(2), sdP: +(__g.SNAP.lastF.sdP * 100).toFixed(2), sdYaw: +__g.SNAP.lastF.sdYaw.toFixed(2) }, log: __g.REC.snap.slice(-5) }));
  const settle = async (legs) => { await sweep(legs, 1.0); await waitFor(() => window.__cam.done, 200000, 2000); await waitFor(() => !!__g.RB.base, 120000, 1000); };
  const back = () => !__g.RF.on && __g.world.visible && (__g.G.locked || __g.RELOC.state === 'new');
  const sleepJump = async (W) => { await ev(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(1500); await ev((W) => { window.__W = W; }, W);
    await ev(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(600); };
  const W0 = { yaw: 0, x: 0, z: 0, y: 0 }, JUMP = { yaw: 25 * Math.PI / 180, x: 0.4, z: -0.3, y: -0.2 }; /* the jump of marker-test section 3 */

  await p.goto(url); await sleep(2500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await fresh({ items: SHED_TEX.concat(LOUNGE_TEX) });
  ok('BUILD is build 29', await ev(() => __g.BUILD === 'build 29'));
  const FROM = +(process.env.SN_FROM || 1), SAVED = path.join(require('os').tmpdir(), 'bc-snapshot-test-after4.json'); /* SN_FROM=5: start at section 5 from the storage SN_SAVE=1 kept after section 4 (for working on the later sections) */
  if (FROM < 5) {

  /* ===================== 1. keyframes while playing ===================== */
  await play(); await sweep(A_LEGS, 1.0);
  const tS = await waitFor(() => __g.G.settlements.length > 0, 150000, 600); ok('1. the shed colony settles by itself (as before)', tS > 0, tS + ' ms');
  await settle(A_LEGS.concat(['deskA', 'floor']));
  await sweep(A_LEGS.concat(['speakerA', 'floor2']), 1.0); await waitFor(() => __g.G.snap && __g.G.snap.kf.length >= 8, 150000, 1500);
  const S1 = await snap(); console.log('SNAP after play ' + JSON.stringify(S1));
  ok('1. keyframes are made while the shed is played (spread over viewpoints)', S1.kf >= 6, JSON.stringify({ kf: S1.kf, pts: S1.pts, made: S1.made, tooFew: S1.tooFew, ms: S1.ms, msKf: S1.msKf }));
  const spread = await ev(() => { const k = __g.G.snap.kf; let mn = 1e9; for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) { const d = Math.hypot(k[i].c[0] - k[j].c[0], k[i].c[1] - k[j].c[1], k[i].c[2] - k[j].c[2]), f = (q) => [Math.cos(q.pitch) * Math.cos(q.yaw), Math.sin(q.pitch), Math.cos(q.pitch) * Math.sin(q.yaw)], a = f(k[i]), c = f(k[j]), ang = Math.acos(Math.min(1, a[0] * c[0] + a[1] * c[1] + a[2] * c[2])) * 57.2958; mn = Math.min(mn, Math.max(d / 0.3, ang / 20)); } return +mn.toFixed(2); });
  ok('1. no two keyframes stand closer than the spacing (0.3 m or 20 degrees)', spread >= 1, 'closest pair ' + spread);
  /* every point lies on a real surface: its height is one of the shed's tops, and it is inside that top */
  const onSurf = await ev(() => { const T = window.__place(); let n = 0, good = 0, worst = 0; for (const k of __g.G.snap.kf) for (let j = 0; j < k.n; j++) { const x = k.P[3 * j], y = k.P[3 * j + 1], z = k.P[3 * j + 2]; n++; let bd = 9; for (const S of T) { const c = Math.cos(S.rot), s = Math.sin(S.rot), dx = x - S.cx, dz = z - S.cz, lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < S.hw + 0.02 && Math.abs(lz) < S.hd + 0.02) bd = Math.min(bd, Math.abs(y - S.y)); } if (bd < 0.015) good++; worst = Math.max(worst, bd); } return { n, good, worst: +(worst * 100).toFixed(1) }; });
  ok('1. the keyframes\' 3D points lie on the real surfaces (within 1.5 cm of a top they are over)', onSurf.n > 0 && onSurf.good >= 0.97 * onSurf.n, JSON.stringify(onSurf));
  await ev(() => __g.persist(true)); const m1 = JSON.parse(await mapOf('r1'));
  /* every stored value: no data: URL, no "jpeg" / "image" field, and no long base64 string that decodes to a JPEG or PNG picture */
  const store1 = await ev(() => { let img = 0, jpg = 0, b64 = 0; const keys = [], walk = (o, k) => { if (typeof o === 'string') { if (/^data:/.test(o)) img++; if (o.length > 100 && /^[A-Za-z0-9+/=]+$/.test(o)) { b64++; try { const s = atob(o.slice(0, 8)); if ((s.charCodeAt(0) === 0xff && s.charCodeAt(1) === 0xd8) || s.slice(1, 4) === 'PNG') jpg++; } catch (e) {} } return; } if (o && typeof o === 'object') for (const q of Object.keys(o)) { if (/jpe?g|image|thumb/i.test(q)) img++; walk(o[q], q); } };
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i), v = localStorage.getItem(k) || ''; keys.push(k + ':' + v.length); if (/data:image/.test(v)) img++; try { walk(JSON.parse(v), k); } catch (e) {} } return { img, jpg, b64, keys }; });
  const structOK = m1 && m1.snap && m1.snap.v === 1 && m1.snap.kf.every((k) => Object.keys(k).sort().join() === 'at,b,c,n,pitch,u,yaw' && atob(k.b).length === 38 * k.n);
  const bytes1 = m1 && m1.snap ? JSON.stringify(m1.snap).length : 0;
  ok('1. the snapshots are saved with the room map: descriptors (32 bytes) and 3D points (3 x 2 bytes) per point, nothing else', structOK, JSON.stringify({ kf: m1.snap && m1.snap.kf.length, bytes: bytes1, perKf: m1.snap && Math.round(bytes1 / m1.snap.kf.length) }));
  ok('1. no picture anywhere in storage (no data:image, no JPEG)', store1.img === 0 && store1.jpg === 0, JSON.stringify(store1));
  console.log('STORAGE room snapshots: ' + bytes1 + ' bytes for ' + (m1.snap ? m1.snap.kf.length : 0) + ' keyframes (' + S1.pts + ' points); whole map ' + JSON.stringify(m1).length + ' bytes');
  await viewAt([0.35, -1.2, -1.75], 1.1, [10], 1.0, 5); await sleep(4000); await shot('104-snapshot-points.png', true);
  if (process.env.SN_DIAG) { const D = { shelf: ['shelf', [0, 0.6], 0.5], deskA: ['deskA', [0.1, 0.7], 0.8], floor: ['floor', [0, 1.3], 1.6], speakerA: ['speakerA', [0.1, 0.5], 0.55], floor2: ['floor', [0.3, -0.4], 1.7] };
    console.log('KF ' + JSON.stringify(await ev(() => __g.G.snap.kf.map((k) => [k.c.map((v) => +v.toFixed(2)), +(k.yaw * 57.3).toFixed(0), +(k.pitch * 57.3).toFixed(0), k.n]))));
    for (const leg of Object.keys(D)) { const d = D[leg]; await ev(([d]) => { const S = window.__place().find((t) => t.n === d[0]), q = [S.cx + d[1][0], S.y + d[2], S.cz + d[1][1]], fx = S.cx - q[0], fy = S.y - q[1], fz = S.cz - q[2], L = Math.hypot(fx, fy, fz); window.__cam.mode = 'fixed'; window.__cam.fixed = [q[0], q[1], q[2], Math.atan2(-fx / L, -fz / L), Math.asin(fy / L)]; }, [d]); await sleep(1500);
      console.log('DIAG ' + leg + ' ' + JSON.stringify(await ev(() => { const im = __g.stkCam(), pose = __g.STK.poses[__g.STK.poses.length - 1], g = __g.FEAT.gray(im, im.naturalWidth, im.naturalHeight, 640), f = __g.FEAT.extract(g, 3, 180, 14), cam = __g.stkView(im.naturalWidth, im.naturalHeight, pose.P), U = new Float32Array(f.n), W = new Float32Array(f.n); for (let i = 0; i < f.n; i++) { U[i] = f.x[i]; W[i] = f.y[i]; }
        const kfs = __g.G.snap.kf, per = kfs.map((k) => __g.FEAT.match(k, f).filter((m) => m[2] <= 64).length), m = __g.snapMatch(kfs, f), o = { t: 0, V: pose.V, K: cam.K, U, W, m }, F = __g.snapSolve([o, Object.assign({}, o, { t: 300 }), Object.assign({}, o, { t: 700 })]); return { n: f.n, per, m: m.n, inl: F && F.inl, yaw: F && +(F.phi * 57.3).toFixed(2), tx: F && +F.tx.toFixed(3) }; }))); } }
  await stop(1);

  /* ===================== 2. sleep + origin jump, no sticker: snapshots, then surfaces only ===================== */
  await sweep(A_LEGS, 1.0); await sleep(3000); await waitFor(() => __g.AUTO.commitAt === 0 && !__g.RF.on, 60000, 800);
  const before2 = await things(), W1 = compose(JUMP, W0); await sleepJump(W1); const t2 = Date.now();
  const H2 = await ev(() => ({ on: __g.RF.on, hidden: __g.RF.hidden, hint: document.getElementById('hint').innerText }));
  ok('2. waking up hides the camp; the hint does not mention stickers (this room has none)', H2.on && H2.hidden && /Look around so I can find the camp again/.test(H2.hint) && !/sticker/i.test(H2.hint), JSON.stringify(H2));
  await sweep(A_LEGS, 1.0); const tR2 = await waitFor(back, 120000, 250); const secs2 = (Date.now() - t2) / 1000;
  const L2 = await ev(() => ({ lock: __g.RELOC.lock, log: __g.REC.snap.filter((e) => e.lock || e.check).slice(-2) }));
  if (tR2 < 0) console.log('DEBUG2', JSON.stringify(await ev(() => ({ rf: { on: __g.RF.on, phase: __g.RF.phase }, locked: __g.G.locked, state: __g.RELOC.state, rel: __g.REC.relock.slice(-8), snap: __g.REC.snap.slice(-12), last: __g.SNAP.last }))));
  if (process.env.SN_DEBUG) console.log('DEBUG2 timeline', JSON.stringify(await ev(() => ({ rel: __g.REC.relock.slice(-8), snap: __g.REC.snap.slice(-14), moving: __g.SNAP.moving, runs: __g.SNAP.runs }))));
  await sleep(1000); const e2a = thingErr(before2, W0, await things(), W1);
  ok('2. the snapshots give the camp back (no sticker anywhere)', tR2 > 0 && L2.lock && !!L2.lock.snap, secs2.toFixed(1) + ' s ' + JSON.stringify({ snap: L2.lock && L2.lock.snap, how: L2.lock && L2.lock.how, log: L2.log }));
  await shot('105-snapshot-relocked.png', true);
  await sweep(A_LEGS, 1.0); await waitFor(() => __g.AUTO.commitAt === 0, 90000, 800); await sleep(500); const e2b = thingErr(before2, W0, await things(), W1);
  console.log('RELOCK snapshots: ' + secs2.toFixed(1) + ' s until the camp is back; 1 s after worst ' + e2a.worst.toFixed(2) + ' cm mean ' + e2a.mean.toFixed(2) + ' cm; after the polish worst ' + e2b.worst.toFixed(2) + ' cm mean ' + e2b.mean.toFixed(2) + ' cm (' + e2b.n + ' things)');
  /* the same jump again, snapshots switched off: the surfaces alone (build 26) */
  await ev(() => { __g.SNAP.disabled = true; }); await sweep(A_LEGS, 1.0); await sleep(3000); await waitFor(() => __g.AUTO.commitAt === 0 && !__g.RF.on, 60000, 800);
  const before2s = await things(), W2 = compose(JUMP, W1); await sleepJump(W2); const t2s = Date.now(); await sweep(A_LEGS, 1.0); const tR2s = await waitFor(back, 180000, 500); const secs2s = (Date.now() - t2s) / 1000;
  await sleep(1000); const e2s = thingErr(before2s, W1, await things(), W2); await waitFor(() => __g.AUTO.commitAt === 0, 90000, 800); await sleep(500); const e2sb = thingErr(before2s, W1, await things(), W2);
  console.log('RELOCK surfaces only: ' + (tR2s > 0 ? secs2s.toFixed(1) + ' s' : 'not within 180 s') + ' until the camp is back; right after worst ' + e2s.worst.toFixed(2) + ' cm mean ' + e2s.mean.toFixed(2) + ' cm; after the polish worst ' + e2sb.worst.toFixed(2) + ' cm mean ' + e2sb.mean.toFixed(2) + ' cm');
  ok('2. the same jump with the snapshots off is found by the surfaces (build 26)', tR2s > 0 && !(await ev(() => __g.RELOC.lock.snap)), secs2s.toFixed(1) + ' s');
  await ev(() => { __g.SNAP.disabled = false; });
  ok('2. the snapshot relock: under 5 s and every thing within 2 cm, faster than the surfaces', tR2 > 0 && secs2 < 5 && e2a.worst < 2 && e2b.worst < 2 && (tR2s < 0 || secs2 < secs2s), 'snapshots ' + secs2.toFixed(1) + ' s, worst ' + e2a.worst.toFixed(2) + ' / ' + e2b.worst.toFixed(2) + ' cm; surfaces ' + secs2s.toFixed(1) + ' s, worst ' + e2s.worst.toFixed(2) + ' / ' + e2sb.worst.toFixed(2) + ' cm');
  { const S2 = await snap(); console.log('COST textured room (sections 1-2): ms per picture mean ' + S2.ms + ', worst ' + S2.msMax + ', keyframe step ' + S2.msKf + ' (' + S2.runs + ' pictures, ' + S2.dims + ')'); }
  await stop(2);
  const WA = W2, end2 = await things(); /* where the shed and its things stand at the end of this session */
  await ev(() => __g.persist(true)); await endSession();

  /* ===================== 3. Room 2 (the lounge), and the shed seen from its doorway ===================== */
  await ev(() => localStorage.setItem('bc-test-off', String(3 * 3600 * 1000))); await fresh({ items: SHED_TEX.concat(LOUNGE_TEX) });
  await ev(() => { window.__cam.mode = 'fixed'; window.__cam.fixed = [0.6, -0.3, -4.9, 0, -0.55]; });
  await play('#chNew'); await sweep(L_LEGS, 1.0);
  const t3 = await waitFor(() => __g.G.settlements.length > 0, 150000, 600); ok('3. + New room: the lounge becomes Room 2 and its colony settles', t3 > 0 && (await ev(() => __g.HOMES.cur === 'r2')));
  await settle(L_LEGS.concat(['sofa', 'lfloor'])); await sweep(L_LEGS.concat(['ltable', 'lfloor2']), 1.0); await waitFor(() => __g.G.snap && __g.G.snap.kf.length >= 5, 150000, 1500);
  const S3 = await snap(); ok('3. Room 2 makes its own keyframes', S3.kf >= 4, JSON.stringify({ kf: S3.kf, pts: S3.pts }));
  await ev(() => __g.persist(true)); const map1 = await mapOf('r1'), z3 = await zinfo();
  await viewAt(DOOR_VIEW[0], DOOR_VIEW[1], [180, 172, 188, 176], DOOR_VIEW[2], 4);
  const tQ = await waitFor(() => !document.getElementById('nroom').hidden && /moved to another room/.test(document.getElementById('nroom').innerText), 90000, 400);
  const Q3 = await ev(() => { const el = document.getElementById('nroom'), pre = document.getElementById('mvPre'); return { txt: el.innerText.replace(/\s+/g, ' '), pre: pre ? pre.dataset.room + ':' + pre.innerText : '', first: el.querySelector('button') && el.querySelector('button').id, why: __g.RB.ask && __g.RB.ask.why, log: __g.REC.snap.filter((e) => e.foreign).slice(-1) }; });
  if (tQ < 0) console.log('DEBUG3', JSON.stringify(await ev(() => ({ last: __g.SNAP.last, lastF: __g.SNAP.lastF && { room: __g.SNAP.lastF.room, inl: __g.SNAP.lastF.inl, pics: __g.SNAP.lastF.pics, ok: __g.SNAP.lastF.ok }, log: __g.REC.snap.slice(-8) }))));
  ok('3. Room 1\'s snapshots seen in Room 2 ask "Have you moved to another room?" with Room 1 offered first', tQ >= 0 && /This looks like Room 1/.test(Q3.txt) && Q3.pre === 'r1:It’s Room 1' && Q3.first === 'mvPre' && /No, still here/.test(Q3.txt), JSON.stringify(Q3));
  await sleep(300); await shot('106-snapshot-other-room-prompt.png');
  const z3b = await zinfo(); ok('3. nothing is merged: Room 2 keeps its zones, Room 1\'s saved map is byte for byte the same', z3b.length === z3.length && z3b.every((z) => z.room === 'r2') && (await mapOf('r1')) === map1, z3.length + ' -> ' + z3b.length);
  if (tQ >= 0) await p.click('#mvNo'); await sleep(600); await viewAt(DOOR_VIEW[0], DOOR_VIEW[1], [184, 174], DOOR_VIEW[2], 4); await sleep(12000);
  const Q3b = await ev(() => ({ up: !document.getElementById('nroom').hidden, ign: __g.SNAP.ignore.r1, cur: __g.HOMES.cur }));
  ok('3. "No, still here": the lounge stays Room 2 and the question does not come back for Room 1 this session', !Q3b.up && Q3b.ign === 1 && Q3b.cur === 'r2', JSON.stringify(Q3b));
  await ev(() => __g.persist(true)); await endSession();
  await stop(3);

  /* ===================== 4. Continue Room 1 from the chooser ===================== */
  await ev(() => localStorage.setItem('bc-test-off', String(6 * 3600 * 1000))); await fresh({ items: SHED_TEX.concat(LOUNGE_TEX) });
  const W4 = compose({ yaw: -0.5, x: -0.3, z: 0.25, y: 0.3 }, W0); await ev((W) => { window.__W = W; }, W4); /* a new session: the origin is somewhere else again */
  await p.click('#bPlay'); await sleep(700); const C4 = await ev(() => ({ shown: !document.getElementById('chooser').hidden, txt: document.getElementById('chooser').innerText }));
  ok('4. the start chooser has no sticker hint (no room owns one)', C4.shown && !/sticker/i.test(C4.txt), JSON.stringify(C4.txt.slice(0, 200)));
  const thingsSaved = await ev(() => { const sv = JSON.parse(localStorage.getItem('base-camp-save-v2')); return sv.settlements.length; });
  await p.click('#chooser [data-room="r1"]'); await sleep(900); const t4 = Date.now(); await sweep(A_LEGS, 1.0); const tL4 = await waitFor(() => __g.G.locked, 120000, 250); const secs4 = (Date.now() - t4) / 1000;
  const L4 = await ev(() => ({ lock: __g.RELOC.lock, log: __g.REC.snap.filter((e) => e.lock).slice(-1) }));
  ok('4. Continue Room 1: the snapshots lock the shed', tL4 > 0 && L4.lock && !!L4.lock.snap, secs4.toFixed(1) + ' s ' + JSON.stringify({ snap: L4.lock && L4.lock.snap, log: L4.log, settlements: thingsSaved }));
  await sleep(3000); await shot('107-snapshot-continue-found.png', true);
  /* against the room as it was first mapped (section 1): the surface-only relock of section 2 moved the whole saved room by its own error (a few cm), keyframes included, so the
     snapshots put it back where it really is; against where it stood at the end of section 2 it is off by that surface relock's error */
  if (process.env.SN_DEBUG) console.log('DEBUG4', JSON.stringify(await ev(() => ({ fix: __g.SNAP.lockFix && __g.SNAP.lockFix.T, lock: __g.RELOC.lock && { phi: __g.RELOC.lock.phi, tx: __g.RELOC.lock.tx, tz: __g.RELOC.lock.tz, dy: __g.RELOC.lock.dy, refined: __g.RELOC.lock.refined }, align: __g.G.align }))));
  const e4 = thingErr(before2, W0, await things(), W4), e4s = thingErr(end2, WA, await things(), W4); console.log('CONTINUE snapshots: ' + secs4.toFixed(1) + ' s to lock; against the room as first mapped worst ' + e4.worst.toFixed(2) + ' cm mean ' + e4.mean.toFixed(2) + ' cm (' + e4.n + ' things); against the end of section 2 (after the surface-only relock) worst ' + e4s.worst.toFixed(2) + ' cm');
  ok('4. the shed is where it really is: every thing within 2 cm of where it was first mapped', e4.n > 0 && e4.worst < 2, JSON.stringify(e4));
  await stop(4);
  await sweep(A_LEGS, 1.0); await waitFor(() => __g.AUTO.commitAt === 0, 90000, 800); await ev(() => __g.persist(true)); await endSession();
  if (process.env.SN_SAVE) fs.writeFileSync(SAVED, await ev(() => JSON.stringify(Object.assign({}, localStorage))));
  } else { await ev((d) => { localStorage.clear(); for (const k of Object.keys(d)) localStorage.setItem(k, d[k]); }, JSON.parse(fs.readFileSync(SAVED, 'utf8'))); }

  /* ===================== 5. "Not sure?" in the lounge: every room's snapshots are scored ===================== */
  await ev(() => localStorage.setItem('bc-test-off', String(9 * 3600 * 1000))); await fresh({ items: SHED_TEX.concat(LOUNGE_TEX) });
  await ev((W) => { window.__W = W; }, compose({ yaw: 0.3, x: 0.2, z: -0.2, y: -0.1 }, W0)); await ev(() => { window.__cam.mode = 'fixed'; window.__cam.fixed = [0.6, -0.3, -4.9, 0, -0.55]; });
  await play('#chFind'); const t5 = Date.now(); await sweep(L_LEGS, 1.0); const tL5 = await waitFor(() => __g.G.locked, 150000, 300); const secs5 = (Date.now() - t5) / 1000;
  const L5 = await ev(() => ({ cur: __g.HOMES.cur, lock: __g.RELOC.lock, log: __g.REC.snap.filter((e) => e.switched || e.lock || e.wait).slice(-3) }));
  if (process.env.SN_DEBUG) console.log('DEBUG5', JSON.stringify(await ev(() => ({ snap: __g.REC.snap.slice(-12), last: __g.SNAP.last, rooms: __g.HOMES.rooms.map((r) => r.id + ':' + __g.snapKfs(r.id).length), reloc: __g.REC.reloc.slice(-2) }))));
  ok('5. "Not sure? Let the colonists work it out" in the lounge: the snapshots pick Room 2 and lock it', tL5 > 0 && L5.cur === 'r2' && L5.lock && !!L5.lock.snap, secs5.toFixed(1) + ' s ' + JSON.stringify({ cur: L5.cur, snap: L5.lock && L5.lock.snap, log: L5.log }));
  await ev(() => __g.persist(true)); await endSession();
  await stop(5);

  /* ===================== 6. a room with a sticker still prefers the sticker ===================== */
  await ev(() => localStorage.setItem('bc-test-off', String(12 * 3600 * 1000))); await fresh({ items: SHED_TEX.concat(LOUNGE_TEX) }, [ST2]);
  await play('#chooser [data-room="r1"]'); await sweep(A_LEGS, 1.0); const tL6 = await waitFor(() => __g.G.locked, 120000, 300);
  ok('6. Room 1 is found again (snapshots; its sticker is not bound yet)', tL6 > 0, JSON.stringify(await ev(() => __g.RELOC.lock && { snap: __g.RELOC.lock.snap, stk: __g.RELOC.lock.stk })));
  await waitFor(() => !__g.RG.prob, 90000, 1000); await ev(() => { __g.STK.obs = {}; }); await viewSticker(ST2, 0.8, [0, 25, -25, 40], 3.2);
  const tB6 = await waitFor(() => __g.G.stk && __g.G.stk.id === 2, 90000, 500); if (process.env.SN_DEBUG) console.log('DEBUG6', JSON.stringify(await ev(() => ({ stk: __g.stkReport(), rel: __g.REC.relock.slice(-6), snap: __g.REC.snap.slice(-10), settled: __g.stkSettled(), prob: __g.RG.prob, rf: __g.RF.on })))); ok('6. the shed takes sticker 2', tB6 >= 0, JSON.stringify(await ev(() => __g.REC.stk.slice(-2))));
  await sweep(A_LEGS, 1.0); await sleep(3000); await waitFor(() => __g.AUTO.commitAt === 0 && !__g.RF.on, 60000, 800);
  const W6 = await ev(() => window.__W), W6b = compose(JUMP, W6); await sleepJump(W6b);
  const H6 = await ev(() => ({ hint: document.getElementById('hint').innerText }));
  ok('6. the wake hint offers the sticker now that the room owns one', /Have a sticker\? Point at it/.test(H6.hint), JSON.stringify(H6));
  const t6 = Date.now(); await viewSticker(ST2, 0.8, [30, 15, 40, 20], 3.5); const tR6 = await waitFor(back, 120000, 250); const secs6 = (Date.now() - t6) / 1000;
  const L6 = await ev(() => ({ lock: __g.RELOC.lock, wait: __g.REC.snap.filter((e) => e.wait).slice(-1), stk: __g.REC.stk.filter((e) => e.lock).slice(-1) }));
  ok('6. after a jump with the sticker in view, the sticker locks first (the snapshots wait for it)', tR6 > 0 && L6.lock && /sticker/.test(L6.lock.stk) && !L6.lock.snap, secs6.toFixed(1) + ' s ' + JSON.stringify({ stk: L6.lock && L6.lock.stk, snap: L6.lock && L6.lock.snap, wait: L6.wait, sl: L6.stk }));
  await sleep(2500); await shot('108-sticker-preferred.png');
  await ev(() => __g.persist(true)); await endSession(); await ev(() => localStorage.setItem('bc-test-off', String(15 * 3600 * 1000))); await fresh({ items: SHED_TEX.concat(LOUNGE_TEX) }, [ST2]);
  await p.click('#bPlay'); await sleep(700); const C6 = await ev(() => (document.querySelector('#chooser .chstk') || {}).innerText || '');
  ok('6. the chooser names the room that owns a sticker, and only that one', /Room 1 has a sticker: point at it/.test(C6) && !/Room 2/.test(C6), JSON.stringify(C6));
  await shot('109-chooser-sticker-room.png'); await p.click('#chBack'); await sleep(500);
  await stop(6);

  /* ===================== 7. a texture-poor room: blank walls, plain tops ===================== */
  await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); localStorage.setItem('bc-test-off', '0'); }); await fresh({ items: [] });
  await play(); await sweep(A_LEGS, 1.0); const t7 = await waitFor(() => __g.G.settlements.length > 0, 150000, 600); ok('7. texture-poor room: the colony settles', t7 > 0);
  await settle(A_LEGS.concat(['deskA', 'floor'])); await sweep(A_LEGS, 1.0); await waitFor(() => window.__cam.done, 200000, 2000);
  const S7 = await snap(); console.log('SNAP texture-poor ' + JSON.stringify(S7));
  ok('7. texture-poor room: no keyframes (too few corners or points), and it says why in the field log', S7.kf <= 1 && S7.tooFew > 0, JSON.stringify({ kf: S7.kf, tooFew: S7.tooFew, runs: S7.runs, log: S7.log }));
  await sleep(3000); await waitFor(() => __g.AUTO.commitAt === 0 && !__g.RF.on, 60000, 800);
  const before7 = await things(), W7 = compose(JUMP, W0); await sleepJump(W7); const t7r = Date.now(); await sweep(A_LEGS, 1.0); const tR7 = await waitFor(back, 180000, 500); const secs7 = (Date.now() - t7r) / 1000;
  await sleep(1000); const e7 = thingErr(before7, W0, await things(), W7);
  ok('7. texture-poor room: after a jump the surfaces find the camp (build 26), no snapshot lock', tR7 > 0 && !(await ev(() => __g.RELOC.lock && __g.RELOC.lock.snap)) && (await ev(() => __g.SNAP.locks)) === 0, secs7.toFixed(1) + ' s, worst ' + e7.worst.toFixed(2) + ' cm');
  await shot('110-texture-poor-fallback.png');

  const S9 = await snap(); console.log('COST skipped moving ' + (await ev(() => __g.SNAP.moving)) + ';  ms per picture: mean ' + S9.ms + ', worst ' + S9.msMax + ', keyframe step ' + S9.msKf + ' (' + S9.runs + ' pictures this session; ' + S9.dims + ')');
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 5)));
  const fails = res.filter((r) => !r).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
