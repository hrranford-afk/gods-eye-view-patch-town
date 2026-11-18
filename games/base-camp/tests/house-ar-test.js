/* Room kit, 18 Nov: the dolls' house (build 29) as the fake AR camera's world. The house the page builds is exported by house-world.js as the fake's tops (__SHED), its
   walls with open doorways (__WALLS: they stop hit tests and hide stickers behind them) and one wall sticker per room (__MARKS). The fake camera walks through it, in AR
   with the real WebXRKit polyfill, as a player with an iPad would:
    0. the export: six rooms, the doorways between them, tops and walls, a sticker on a wall of every room; the fake: a ray through a doorway finds the next room's floor, a wall stops one.
    1. room A (the Playroom): the colony settles; the Playroom's sticker is taken by Room 1.
    2. standing in A at the doorway, looking through into room B (the Kitchen): no "Have you moved to another room?" while the iPad is still inside A;
       walking through the doorway into B: the question comes once the iPad is inside B; "New room" makes Room 2.
    3. room B: its colony settles; the Kitchen's sticker is taken by Room 2.
    4. back through the doorway into A, the Playroom's sticker in view: Room 1 is loaded and locks from its sticker.
   Run (from games/base-camp, about 12 minutes):  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node tests/house-ar-test.js
   Shots: shots/160-house-ar-room-a.png, 161-house-ar-doorway.png, 162-house-ar-room-b-sticker.png, 163-house-ar-back-in-a.png */
const fs = require('fs'), path = require('path'), vm = require('vm');
const { serve, ROOT } = require('./lib.js'); const install = require('./ar-fake.js'); const houseWorld = require('./house-world.js'); const { chromium } = require('playwright');
const POLY = fs.readFileSync(path.join(ROOT, 'webxr-polyfill.js'), 'utf8'); const OUT = path.join(ROOT, 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const DICT = (() => { const ctx = vm.createContext({}); vm.runInContext('var AR = { DICTIONARIES: {} }; var require = () => ({});', ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, 'vendor/js-aruco2/dictionaries/aruco_4x4_1000.js'), 'utf8'), ctx); return ctx.AR.DICTIONARIES.ARUCO_4X4_1000.codeList; })();
const bits = (id) => DICT[id][0].toString(2).padStart(8, '0') + DICT[id][1].toString(2).padStart(8, '0');
const A = 'play', B = 'kitchen';
(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { const N = Date.now.bind(Date); Date.now = () => N() + (+localStorage.getItem('bc-test-off') || 0); });
  await install(p, []); await p.addInitScript({ content: POLY });
  await p.addInitScript(() => { const t = setInterval(() => { const d = window.NativeARData; if (d && d.video_updated && d.video_data && d.video_width === 640) window.__lastPic = d.video_data; }, 30); void t; });
  await p.addInitScript(() => { window.__toasts = []; addEventListener('DOMContentLoaded', () => { const el = document.getElementById('toast'); if (el) new MutationObserver(() => { const t = el.innerText.trim(); if (t) window.__toasts.push(t); }).observe(el, { childList: true, subtree: true }); }); });
  const ev = (f, a) => p.evaluate(f, a);
  const noOverlay = () => ev(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  /* for a shot only: the camera picture also draws the floors, the tops and the walls (texture-render.js through __TEX), for about 1.5 s, then the plain grey pictures come back */
  const shot = async (name) => { await ev(() => { window.__TEX = { items: (window.__WALLS || []).map((w, i) => { const thinX = w.x1 - w.x0 < w.z1 - w.z0; return { n: 'wall' + i, x: (w.x0 + w.x1) / 2, y: (w.y0 + w.y1) / 2, z: (w.z0 + w.z1) / 2, ax: thinX ? [0, 0, 1] : [1, 0, 0], ay: [0, 1, 0], hw: (thinX ? w.z1 - w.z0 : w.x1 - w.x0) / 2, hh: (w.y1 - w.y0) / 2, tex: 'plain', seed: i + 1, tw: 64, th: 48 }; }) }; window.__lastPic = null; }); await sleep(1500);
    await ev(() => { const v = window.__lastPic; if (v) document.body.style.background = 'url(data:image/jpeg;base64,' + v + ') center / cover no-repeat'; }); await p.screenshot({ path: OUT + name }); await ev(() => { delete window.__TEX; if (__g.AR.on) document.body.style.background = 'transparent'; }); console.log('shot ' + name); };
  const keep = async () => { if (await ev(() => window.__cam.done)) await ev(() => { window.__cam.t0 = performance.now(); window.__cam.done = false; }); };
  const waitFor = async (fn, ms, every, noKeep) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (!noKeep) await keep(); if (await ev(fn)) return Date.now() - t0; await sleep(every || 600); } return -1; };
  const play = async (how) => { await p.click('#bPlay'); await sleep(500); if (await ev(() => !document.getElementById('chooser').hidden)) await p.click(how || '#chFind'); await sleep(900); };
  /* a walk: [{ at: [x, y, z], look: [x, y, z], dur, ay, ap }] in the house frame (y: 0 is where the iPad is held), from wherever the iPad is now */
  const walk = (legs) => ev((legs) => { const e = __g.AR.on ? __g.AR.viewM.elements : null, here = e ? [{ p: [e[12], e[13], e[14]], yaw: Math.atan2(e[8], e[10]), pitch: Math.asin(Math.max(-1, Math.min(1, -e[9]))), ay: 0, ap: 0, dur: 0.3 }] : [];
    const L = legs.map((l) => { const f = [l.look[0] - l.at[0], l.look[1] - l.at[1], l.look[2] - l.at[2]], n = Math.hypot(f[0], f[1], f[2]); return { p: l.at.slice(), yaw: Math.atan2(-f[0] / n, -f[2] / n), pitch: Math.asin(f[1] / n), ay: l.ay === undefined ? 0.25 : l.ay, ap: l.ap === undefined ? 0.12 : l.ap, dur: l.dur || 8 }; });
    window.__cam.path = here.concat(L); window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = 1; window.__cam.done = false; }, legs);
  const walkDone = () => waitFor(() => window.__cam.done, 240000, 1000, true);
  /* the sweep of one room: the floor from two sides, then every top from about 0.8 m on the room's side, the iPad held between 0.1 m below and 0.3 m above where AR started */
  const roomLegs = (W, k) => { const R = W.rooms[k], [cx, cz] = R.c, r = R.r, inX = (x) => Math.max(r[0] + 0.45, Math.min(r[1] - 0.45, x)), inZ = (z) => Math.max(r[2] + 0.45, Math.min(r[3] - 0.45, z)), L = [];
    L.push({ at: [inX(cx + 0.6), 0.3, inZ(cz + 0.9)], look: [cx - 0.3, -1.2, cz - 0.4], dur: 12, ay: 0.6, ap: 0.25 });
    for (const t of W.shed.filter((s) => s[0].startsWith(k + '-top') && s[1] < 0.2)) { const dx = cx - t[2], dz = cz - t[3], d = Math.hypot(dx, dz) || 1; L.push({ at: [inX(t[2] + dx / d * 0.8), Math.min(0.3, Math.max(-0.1, t[1] + 0.6)), inZ(t[3] + dz / d * 0.8)], look: [t[2], t[1], t[3]], dur: 9, ay: 0.2, ap: 0.12 }); }
    L.push({ at: [inX(cx - 0.6), 0.3, inZ(cz - 0.3)], look: [cx + 0.4, -1.2, cz + 0.5], dur: 10, ay: 0.6, ap: 0.25 }); return L; };
  /* look at a room's sticker from about 0.8 m, straight on and a little to each side */
  const stickerLegs = (st, dist) => { const n = [st.ax[1] * st.ay[2] - st.ax[2] * st.ay[1], st.ax[2] * st.ay[0] - st.ax[0] * st.ay[2], st.ax[0] * st.ay[1] - st.ax[1] * st.ay[0]];
    return [25, 10, -15, 30].map((a) => { const r = a * Math.PI / 180, dx = n[0] * Math.cos(r) - n[2] * Math.sin(r), dz = n[0] * Math.sin(r) + n[2] * Math.cos(r); return { at: [st.x + dx * dist, st.y + 0.12, st.z + dz * dist], look: [st.x, st.y, st.z], dur: 3.5, ay: 0.015, ap: 0.01 }; }); };
  const camIn = () => ev(() => { const m = window.NativeARData && window.NativeARData.camera_transform; return m ? [m[12], m[14]] : null; });

  await p.goto(url); await sleep(2500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await p.reload(); await sleep(2500);
  ok('BUILD is build 30', await ev(() => __g.BUILD === 'build 30'));

  /* ===================== 0. the house as the fake's world ===================== */
  const W = await houseWorld(p, { bits }); const SA = W.stickers[A], SB = W.stickers[B];
  const doorAB = W.doors.find((d) => [d.a, d.b].sort().join() === [A, B].sort().join());
  const joined = new Set(); for (const d of W.doors) { joined.add(d.a); joined.add(d.b); }
  ok('0. the export: ' + Object.keys(W.rooms).length + ' rooms, ' + W.doors.length + ' doorways, ' + W.shed.length + ' tops, ' + W.walls.length + ' walls, a sticker on a wall of every room',
    Object.keys(W.rooms).length >= 3 && joined.size >= 3 && W.doors.length >= 2 && !!doorAB && Object.keys(W.stickers).length === Object.keys(W.rooms).length && W.shed.every((s) => s.length === 6 && s.every((v, i) => (i ? isFinite(v) : typeof v === 'string'))),
    JSON.stringify({ doors: W.doors.map((d) => d.a + '-' + d.b + ' ' + d.w + ' m at ' + d.x + ',' + d.z), stickers: Object.entries(W.stickers).map(([k, s]) => k + ':' + s.id + ' ' + s.x + ',' + s.z) }));
  await p.addInitScript((W) => { window.__WORLD = W; }, W); /* kept across reloads */
  const fresh = async () => { await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); await ev(() => { const W = window.__WORLD; window.__SHED = W.shed; window.__WALLS = W.walls; window.__MARKS = []; window.__W = { yaw: 0, x: 0, z: 0, y: 0 }; window.__cam.fixed = [0.6, 0.1, 0.9, 0.4, -0.9]; __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; }); };
  await fresh();
  const F0 = await ev(([dr, A]) => { /* the fake's own rays: from A's centre through the doorway down onto B's floor, and from A's centre at the wall beside the doorway */
    const o = [0, 0, 0], thru = [dr.x + 0.8, -1.2, dr.z], wall = [dr.x, -0.6, dr.z + (dr.along === 'z' ? -1.2 : 0)], hitAt = (q) => window.__wallHit(o, [q[0] - o[0], q[1] - o[1], q[2] - o[2]], 1);
    return { thru: hitAt(thru) > 1e8, wall: hitAt(wall) < 1, n: window.__SHED.length, w: window.__WALLS.length }; }, [doorAB, A]);
  ok('0. the fake: a ray through the doorway reaches the next room\'s floor, a ray at the wall beside it stops at the wall', F0.thru && F0.wall && F0.n === W.shed.length, JSON.stringify(F0));

  /* ===================== 1. room A: the colony settles, the sticker is taken ===================== */
  await ev(() => { window.__moved = []; const el = document.getElementById('nroom'); new MutationObserver(() => { if (!el.hidden && /moved to another room/.test(el.innerText)) { const m = window.NativeARData && window.NativeARData.camera_transform; window.__moved.push({ t: performance.now(), x: m ? +m[12].toFixed(2) : null, z: m ? +m[14].toFixed(2) : null, txt: el.innerText.replace(/\s+/g, ' ').slice(0, 120) }); } }).observe(el, { attributes: true, childList: true, subtree: true }); });
  await play(); await walk(roomLegs(W, A));
  const tS = await waitFor(() => __g.G.settlements.length > 0, 150000, 600); ok('1. room A (' + W.rooms[A].name + '): the colony settles by itself', tS > 0, tS + ' ms');
  await walkDone(); await walk(roomLegs(W, A)); await walkDone(); const tBase = await waitFor(() => !!__g.RB.base, 120000, 1000);
  const baseA = await ev(() => __g.RB.base); ok('1. room A has an extent once it is settled', tBase >= 0, JSON.stringify(baseA));
  await ev((s) => { window.__MARKS = [s]; __g.STK.obs = {}; window.__toasts.length = 0; }, SA); await waitFor(() => !__g.RF.on, 30000, 500);
  const t1 = Date.now(); await walk(stickerLegs(SA, 0.8)); await ev((id) => { window.__want = id; }, SA.id); const tB1 = await waitFor(() => __g.G.stk && __g.G.stk.id === window.__want, 60000, 300, true); const s1 = (Date.now() - t1) / 1000;
  const B1 = await ev(() => ({ cur: __g.HOMES.cur, row: (__g.HOMES.rooms.find((r) => r.id === __g.HOMES.cur) || {}).stk, toast: window.__toasts.find((t) => /now has sticker/.test(t)) || '' }));
  ok('1. room A takes the Playroom\'s wall sticker (id ' + SA.id + ')', tB1 >= 0 && B1.row === SA.id && B1.cur === 'r1' && /Room 1 now has sticker/.test(B1.toast), s1.toFixed(1) + ' s ' + JSON.stringify(B1));
  await ev(() => __g.persist(true)); await shot('160-house-ar-room-a.png');

  /* ===================== 2. at the doorway (still in A), then through it into B ===================== */
  await ev(([sa, sb]) => { window.__MARKS = [sa, sb]; }, [SA, SB]); /* from now on every room keeps its sticker on its wall; the walls hide the ones of other rooms */
  const dx = doorAB.along === 'z' ? 1 : 0, dz = doorAB.along === 'x' ? 1 : 0, sgn = (W.rooms[B].c[0] - W.rooms[A].c[0]) * dx + (W.rooms[B].c[1] - W.rooms[A].c[1]) * dz > 0 ? 1 : -1;
  const atDoor = (d) => [doorAB.x - dx * sgn * d, 0.1, doorAB.z - dz * sgn * d], bc = W.rooms[B].c;
  const inA = (q) => { const r = W.rooms[A].r; return q && q[0] > r[0] && q[0] < r[1] && q[1] > r[2] && q[1] < r[3]; }, inB = (q) => { const r = W.rooms[B].r; return q && q[0] > r[0] && q[0] < r[1] && q[1] > r[2] && q[1] < r[3]; };
  await ev(() => { window.__moved.length = 0; });
  await walk([{ at: atDoor(0.7), look: [bc[0], -1.2, bc[1]], dur: 6, ay: 0.35, ap: 0.15 }, { at: atDoor(0.35), look: [bc[0] + 0.5, -0.6, bc[1] - 0.6], dur: 14, ay: 0.4, ap: 0.2 }, { at: atDoor(0.5), look: [bc[0] + 0.6, -1.2, bc[1] + 0.6], dur: 14, ay: 0.4, ap: 0.2 }]);
  await walkDone(); const m2a = await ev(() => window.__moved.slice()); const sc2 = await ev(() => __g.SCAN.hits);
  ok('2. standing in A at the doorway, looking into B for 34 s: no "Have you moved to another room?"', m2a.length === 0, JSON.stringify({ moved: m2a, hits: sc2, zones: (await ev(() => __g.G.zones.map((z) => [+z.cx.toFixed(1), +z.cz.toFixed(1), +z.y.toFixed(2)]))) }));
  await shot('161-house-ar-doorway.png');
  const t2 = Date.now(); await walk([{ at: atDoor(0), look: [bc[0], -0.6, bc[1]], dur: 3, ay: 0.1, ap: 0.05 }, { at: atDoor(-0.6), look: [bc[0], -1.2, bc[1]], dur: 4, ay: 0.2, ap: 0.1 }].concat(roomLegs(W, B)));
  const tAsk = await waitFor(() => window.__moved.length > 0, 150000, 500, true); const m2 = await ev(() => window.__moved.slice()); const where = m2.length ? [m2[0].x, m2[0].z] : null;
  ok('2. walking through the doorway: the question comes once the iPad is inside B, never while it is still in A', tAsk >= 0 && m2.every((q) => !inA([q.x, q.z])) && inB(where) && /New room/.test(m2[0].txt), ((Date.now() - t2) / 1000).toFixed(1) + ' s ' + JSON.stringify(m2));
  if (tAsk < 0) console.log('DEBUG2', JSON.stringify(await ev(() => ({ rb: __g.RB.base, ask: __g.RB.ask, act: __g.rbActive(), held: __g.RB.held, cam: window.NativeARData && [window.NativeARData.camera_transform[12], window.NativeARData.camera_transform[14]], zones: __g.SCAN.zones.map((z) => [+z.cx.toFixed(2), +z.cz.toFixed(2), +z.y.toFixed(2), +z.area.toFixed(2)]), bound: __g.REC.bound.slice(-8) }))));

  /* ===================== 3. New room: B's colony, B's sticker ===================== */
  await ev(() => { window.__toasts.length = 0; }); const tNew = Date.now(); if (tAsk >= 0) { await p.click('#mvNew'); await sleep(1500); }
  const N3 = await ev(() => ({ cur: __g.HOMES.cur, n: __g.HOMES.rooms.length, ret: __g.G.returning }));
  ok('3. "New room": Room 2 starts in B', N3.cur === 'r2' && N3.n === 2 && !N3.ret, JSON.stringify(N3));
  await walk(roomLegs(W, B)); const tS3 = await waitFor(() => __g.G.settlements.length > 0, 150000, 600);
  ok('3. room B (' + W.rooms[B].name + '): its colony settles', tS3 > 0, tS3 + ' ms');
  await walkDone(); await waitFor(() => !!__g.RB.base, 120000, 1000); await waitFor(() => !__g.RF.on, 30000, 500);
  const pre3 = await ev(() => !!(__g.G.stk && __g.G.stk.id));  /* B's sticker is on B's wall: the sweep of B may already have shown it */
  const t3 = Date.now(); await walk(stickerLegs(SB, 0.8)); await ev((id) => { window.__want = id; }, SB.id); const tB3 = await waitFor(() => __g.G.stk && __g.G.stk.id === window.__want, 60000, 300, true); const s3 = (Date.now() - t3) / 1000;
  const B3 = await ev(() => ({ cur: __g.HOMES.cur, rows: __g.HOMES.rooms.map((r) => r.id + ':' + (r.stk || '-')), toast: window.__toasts.find((t) => /now has sticker/.test(t)) || '' }));
  ok('3. room B takes the Kitchen\'s wall sticker (id ' + SB.id + '); Room 1 keeps its own', tB3 >= 0 && B3.cur === 'r2' && B3.rows.includes('r2:' + SB.id) && B3.rows.includes('r1:' + SA.id) && /Room 2 now has sticker/.test(B3.toast), (pre3 ? 'taken during the sweep of B, ' + ((t3 - tNew) / 1000).toFixed(0) + ' s after New room at most' : s3.toFixed(1) + ' s after looking at it') + ' ' + JSON.stringify(B3));
  await ev(() => __g.persist(true)); await sleep(800); await shot('162-house-ar-room-b-sticker.png');

  /* ===================== 4. back through the doorway into A, A's sticker in view: Room 1 relocks ===================== */
  const ac = W.rooms[A].c; await ev(() => { window.__moved.length = 0; __g.STK.obs = {}; window.__toasts.length = 0; __g.REC.stk.length = 0; });
  await walk([{ at: atDoor(-0.6), look: [doorAB.x, -0.4, doorAB.z], dur: 4, ay: 0.1, ap: 0.05 }, { at: atDoor(0), look: [ac[0], -0.8, ac[1]], dur: 3, ay: 0.1, ap: 0.05 }, { at: atDoor(0.9), look: [SA.x, SA.y, SA.z], dur: 4, ay: 0.1, ap: 0.05 }]);
  await walkDone(); const t4 = Date.now(); await walk(stickerLegs(SA, 0.8));
  let asked = false; const tL4 = await waitFor(() => (__g.HOMES.cur === 'r1' && __g.G.locked) || (!document.getElementById('nroom').hidden && !!document.getElementById('mvPre')), 90000, 300, true);
  if (tL4 >= 0 && (await ev(() => __g.HOMES.cur !== 'r1' && !!document.getElementById('mvPre')))) { asked = true; const pre = await ev(() => document.getElementById('mvPre').dataset.room); if (pre === 'r1') { await p.click('#mvPre'); await walk(roomLegs(W, A)); } }
  const tL4b = await waitFor(() => __g.HOMES.cur === 'r1' && __g.G.locked, 90000, 300, true); const s4 = (Date.now() - t4) / 1000;
  const S4 = await ev(() => ({ cur: __g.HOMES.cur, locked: __g.G.locked, how: __g.RELOC.lock && __g.RELOC.lock.how, stk: __g.RELOC.lock && __g.RELOC.lock.stk, rows: __g.HOMES.rooms.map((r) => r.id + ':' + (r.stk || '-')), log: __g.REC.stk.filter((e) => !e.fix && !e.refused).slice(-6) }));
  ok('4. back in A with the Playroom\'s sticker in view: Room 1 is loaded and locks from its sticker' + (asked ? ' (after "It’s Room 1", offered first because B\'s colony was over 2 min old)' : ''), tL4b >= 0 && S4.cur === 'r1' && S4.locked && !!S4.stk, s4.toFixed(1) + ' s ' + JSON.stringify(S4));
  const m4 = await ev(() => window.__moved.slice()); ok('4. no "Have you moved?" came while the iPad was still in B', m4.every((q) => !inB([q.x, q.z])), JSON.stringify(m4));
  await sleep(1500); await shot('163-house-ar-back-in-a.png');
  ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(res.every(Boolean) ? 'ALL ' + res.length + ' PASSED' : res.filter((x) => !x).length + ' FAILED'); await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
