/* Base Camp build 30, "the sticker is the room's key" (16 Nov; HANDOVER "The sticker is the room's key"), in AR with the real WebXRKit polyfill and the fake native side.
   The owner showed Room 3's sticker on his iPad (HelloXR) and the game made a new room instead of loading Room 3. Now a sticker that a saved room owns loads that room
   and locks to it at once, wherever the game is (finding, a wrong room, a new room with no colony or a colony under 2 minutes old); only a grown colony gets the question.
   Setup: the shed is mapped and settled (Room 1, sticker 2 bound the moment it is seen), then three saved rooms with the SAME map are made from it (the surfaces alone cannot
   tell them apart, as with look-alike rooms): Room 1 (no sticker, the most recent), Room 2 (owns sticker 2), Room 3 (no sticker).
    1. the chooser shows "Room 2 · sticker 2" and how many of the 8 room slots are left; "Not sure?" while facing sticker 2: Room 2 is loaded and locked from the sticker, no question.
    2. Continue Room 1 (the wrong room) facing sticker 2: Room 2 loads and locks, no question; Room 1's saved map is untouched.
    3. + New room, then sticker 2: Room 2 loads and locks; the empty new room is not kept (registry and storage).
    4. Continue Room 3 (sticker hidden, the surfaces lock it); sticker 4, which no room owns, is taken at once ("Room 3 now has sticker 4 ✓").
    5. Room 3's colony is grown (over 2 min): sticker 2 asks "Have you moved to another room?" with "It's Room 2" first; that button loads Room 2.
    6. Menu, Rooms and stickers: owners listed; "Forget this room's sticker" (not taken back by itself); "Give this room sticker 2"; the developer panel's sticker row.
   Run (about 12 minutes):  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node tests/stickerkey-test.js */
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
  const ST4 = { id: 4, x: -0.45, y: -0.52, z: -0.945, ax: [1, 0, 0], ay: [0, 1, 0], size: 0.08, bits: bits(4) }; /* on the front of the shed's desk: no room owns it */
  const FACE2 = [0.45, 0.1, -1.85, 0.3, -0.12]; /* standing in the shed, looking at the shelf (sticker 2) */
  const prompts = () => ev(() => { window.__prompts = []; const el = document.getElementById('nroom'); new MutationObserver(() => { if (!el.hidden) window.__prompts.push(el.innerText.replace(/\s+/g, ' ').slice(0, 120)); }).observe(el, { attributes: true, childList: true, subtree: true }); });
  const lockedIn = (room) => ev((room) => __g.HOMES.cur === room && __g.G.locked && !!(__g.RELOC.lock && __g.RELOC.lock.stk), room);
  const S = () => ev(() => ({ cur: __g.HOMES.cur, locked: __g.G.locked, lock: __g.RELOC.lock && __g.RELOC.lock.stk, rooms: __g.HOMES.rooms.map((r) => r.id + (r.stk ? ':' + r.stk : '')), log: __g.REC.stk.filter((e) => !e.fix && !e.refused).slice(-8), refused: __g.STK.rej }));

  await p.goto(url); await sleep(2500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await fresh([]); /* the sticker comes out once the shed is settled */
  ok('BUILD is build 30', await ev(() => __g.BUILD === 'build 30'));

  /* ===================== 0. setup: the shed settles and takes sticker 2 at once ===================== */
  await play(); await sweep(A_LEGS, 1.0);
  const tS = await waitFor(() => __g.G.settlements.length > 0, 150000, 600); ok('0. the shed colony settles (Room 1)', tS > 0, tS + ' ms');
  await settleShed(); await ev((a) => { window.__MARKS = [a]; __g.STK.obs = {}; __g.REC.stk.length = 0; window.__toasts.length = 0; }, ST2);
  const t0b = Date.now(); await viewSticker(ST2, 0.8, [0, 25, -25, 40], 3.2); const tB = await waitFor(() => !!__g.G.stk, 60000, 300); const secsB = (Date.now() - t0b) / 1000;
  const B0 = await ev(() => ({ row: __g.HOMES.rooms.find((r) => r.id === 'r1').stk, toast: window.__toasts.find((t) => /now has sticker/.test(t)) || '', first: (__g.REC.stk.find((e) => e.fix) || {}).t, bind: (__g.REC.stk.find((e) => e.bind) || {}).t }));
  ok('0. an unowned sticker is taken by the settled room at once, with "Room 1 now has sticker 2 ✓"', tB >= 0 && B0.row === 2 && /Room 1 now has sticker 2 ✓/.test(B0.toast) && B0.bind === B0.first, secsB.toFixed(1) + ' s from the first look; ' + JSON.stringify(B0));
  await ev(() => __g.persist(true)); await endSession();
  /* three saved rooms with the same map; Room 2 owns sticker 2 */
  await ev(() => { const H = JSON.parse(localStorage.getItem('bc-rooms-v1')), m = JSON.parse(localStorage.getItem('base-camp-map-v1')), sv = localStorage.getItem('base-camp-save-v2'), now = Date.now();
    const mk = (id, name, stk, ago) => { const d = JSON.parse(JSON.stringify(m)); d.room = id; d.name = name; if (!stk) delete d.stk; const k = id === 'r1' ? '' : '.' + id; localStorage.setItem('base-camp-map-v1' + k, JSON.stringify(d)); localStorage.setItem('base-camp-save-v2' + k, sv);
      const r0 = H.rooms.find((r) => r.id === 'r1'), r = id === 'r1' ? r0 : Object.assign({}, r0, { id, name, created: now - 86400000 }); r.name = name; r.last = now - ago; if (stk) r.stk = stk; else delete r.stk; return r; };
    H.rooms = [mk('r1', 'Room 1', 0, 3600000), mk('r2', 'Room 2', 2, 7200000), mk('r3', 'Room 3', 0, 10800000)]; H.cur = 'r1'; localStorage.setItem('bc-rooms-v1', JSON.stringify(H)); });
  const map1 = await mapOf('r1');

  /* ===================== 1. the chooser, then "Not sure?" facing sticker 2 ===================== */
  await ev(() => localStorage.setItem('bc-test-off', String(3 * 3600 * 1000))); await fresh([ST2]); await prompts();
  await p.click('#bPlay'); await sleep(800);
  const C1 = await ev(() => ({ cards: [...document.querySelectorAll('#chooser .chcard b')].map((b) => b.innerText), slots: (document.querySelector('#chooser .chslots') || {}).innerText || '', hint: (document.querySelector('#chooser .chstk') || {}).innerText || '' }));
  ok('1. the chooser shows which room owns which sticker ("Room 2 · sticker 2") and the slots left (3 of 8, 5 left)', C1.cards.includes('Room 2 · sticker 2') && C1.cards.includes('Room 1') && /3 of 8 rooms saved · 5 left/.test(C1.slots), JSON.stringify(C1));
  await shot('140-stickerkey-chooser.png');
  await p.click('#chFind'); await sleep(600); await ev((f) => { window.__cam.mode = 'fixed'; window.__cam.fixed = f; }, FACE2);
  const t1 = Date.now(); await viewSticker(ST2, 0.8, [25, 10, 35], 3.5); const tL1 = await waitFor(() => __g.HOMES.cur === 'r2' && __g.G.locked, 90000, 300); const secs1 = (Date.now() - t1) / 1000; const S1 = await S();
  ok('1. "Not sure?" facing sticker 2: Room 2 is loaded and locked from the sticker, with no question', tL1 >= 0 && S1.cur === 'r2' && !!S1.lock && (await ev(() => window.__prompts.length)) === 0, secs1.toFixed(1) + ' s ' + JSON.stringify(S1));
  await sleep(2500); await shot('141-stickerkey-found.png'); await endSession();

  /* ===================== 2. Continue Room 1 (the wrong room) facing sticker 2 ===================== */
  await ev(() => localStorage.setItem('bc-test-off', String(4 * 3600 * 1000))); await fresh([ST2]); await prompts();
  await play('#chooser [data-room="r1"]'); await ev((f) => { window.__cam.mode = 'fixed'; window.__cam.fixed = f; }, FACE2);
  const t2 = Date.now(); await viewSticker(ST2, 0.8, [25, 10, 35], 3.5); const tL2 = await waitFor(() => __g.HOMES.cur === 'r2' && __g.G.locked, 90000, 300); const secs2 = (Date.now() - t2) / 1000; const S2 = await S();
  ok('2. Continue Room 1 while facing Room 2\'s sticker: Room 2 loads and locks from the sticker, no question', tL2 >= 0 && S2.cur === 'r2' && !!S2.lock && (await ev(() => window.__prompts.length)) === 0, secs2.toFixed(1) + ' s ' + JSON.stringify(S2));
  ok('2. Room 1 (never found) is untouched: its saved map is byte for byte the same and it is still a room', (await mapOf('r1')) === map1 && S2.rooms.includes('r1'));
  await endSession();

  /* ===================== 3a. + New room whose colony has just landed (under 2 min), then sticker 2: Room 2 at once, the young colony's room is kept ===================== */
  await ev(() => localStorage.setItem('bc-test-off', String(5 * 3600 * 1000))); await fresh([]); await prompts();
  await play('#chNew'); const nrA = await ev(() => __g.HOMES.cur); await sweep(['shelf', 'deskA', 'floor'], 1.0);
  const tC = await waitFor(() => __g.G.settlements.some((S) => S.cols.length), 150000, 600);
  await ev((a) => { window.__MARKS = [a]; __g.STK.obs = {}; }, ST2); await ev((f) => { window.__cam.mode = 'fixed'; window.__cam.fixed = f; }, FACE2);
  const age3 = await ev(() => Math.round(__g.stkColAge())); await viewSticker(ST2, 0.8, [25, 10, 35], 3.5); const tL3a = await waitFor(() => __g.HOMES.cur === 'r2' && __g.G.locked, 90000, 300); const S3a = await S();
  const K3a = await ev((id) => { const d = JSON.parse(localStorage.getItem('base-camp-save-v2.' + id) || 'null'); return !!d && d.settlements.some((S) => S.cols && S.cols.length); }, nrA);
  ok('3a. a new room whose colony landed ' + age3 + ' s ago: sticker 2 takes the player to Room 2 at once (no question); the new room is kept with its colony', tC >= 0 && age3 < 120 && tL3a >= 0 && !!S3a.lock && (await ev(() => window.__prompts.length)) === 0 && S3a.rooms.includes(nrA) && K3a, JSON.stringify({ nrA, S3a }));
  await endSession();

  /* ===================== 3. + New room (nothing landed yet), then sticker 2: the empty new room is not kept ===================== */
  await ev(() => localStorage.setItem('bc-test-off', String(5.5 * 3600 * 1000))); await fresh([]); await prompts();
  await ev(() => { window.__SHED = []; }); /* no surfaces yet: nothing can land */
  await play('#chNew'); const nr = await ev(() => __g.HOMES.cur); await sleep(3000);
  const N3 = await ev(() => ({ cur: __g.HOMES.cur, zones: __g.G.zones.length, cols: __g.G.settlements.filter((S) => S.cols.length).length, rooms: __g.HOMES.rooms.length }));
  ok('3. + New room makes a new room with no colony yet', N3.cur === nr && N3.cols === 0 && N3.rooms === 5, JSON.stringify(N3));
  await ev((a) => { window.__SHED = window.__WORLD; window.__MARKS = [a]; __g.STK.obs = {}; }, ST2); await ev((f) => { window.__cam.mode = 'fixed'; window.__cam.fixed = f; }, FACE2);
  const t3 = Date.now(); await viewSticker(ST2, 0.8, [25, 10, 35], 3.5); const tL3 = await waitFor(() => __g.HOMES.cur === 'r2' && __g.G.locked, 90000, 300); const secs3 = (Date.now() - t3) / 1000; const S3 = await S();
  const K3 = await ev((id) => Object.keys(localStorage).filter((k) => k.endsWith('.' + id) || k.includes('.' + id + '-')), nr);
  ok('3. the sticker takes the player from the new room to Room 2 (locked from the sticker), no question', tL3 >= 0 && S3.cur === 'r2' && !!S3.lock && (await ev(() => window.__prompts.length)) === 0, secs3.toFixed(1) + ' s ' + JSON.stringify(S3));
  ok('3. the empty new room is not kept (not in the rooms, nothing in storage)', !S3.rooms.some((r) => r.split(':')[0] === nr) && K3.length === 0 && S3.log.some((e) => e.dropped === nr), JSON.stringify({ nr, rooms: S3.rooms, keys: K3 }));
  await sleep(2000); await shot('142-stickerkey-from-new-room.png'); await endSession();

  /* ===================== 4. Continue Room 3 (no sticker): an unowned sticker is taken at once ===================== */
  await ev(() => localStorage.setItem('bc-test-off', String(6 * 3600 * 1000))); await fresh([]); await prompts();
  await play('#chooser [data-room="r3"]'); await sweep(A_LEGS, 1.0);
  const tL4 = await waitFor(() => __g.G.locked, 180000, 600); const P4 = await ev(() => ({ prob: __g.RG.prob, cur: __g.HOMES.cur, how: __g.RELOC.lock && __g.RELOC.lock.how }));
  ok('4. Continue Room 3 (sticker hidden): the surfaces find it', tL4 >= 0 && P4.cur === 'r3', JSON.stringify(P4));
  await waitFor(() => !__g.RF.on, 30000, 500); await ev((a) => { window.__MARKS = [a]; __g.STK.obs = {}; __g.REC.stk.length = 0; window.__toasts.length = 0; }, ST4);
  const t4 = Date.now(); await viewSticker(ST4, 0.75, [0, 25, -25, 35], 3.2); const tB4 = await waitFor(() => __g.G.stk && __g.G.stk.id === 4, 60000, 300); const secs4 = (Date.now() - t4) / 1000;
  const B4 = await ev(() => ({ row: __g.HOMES.rooms.find((r) => r.id === 'r3').stk, prob: __g.RG.prob, toast: window.__toasts.find((t) => /now has sticker/.test(t)) || '', log: __g.REC.stk.filter((e) => e.bind).slice(-1) }));
  if (tB4 < 0) console.log('DEBUG4', JSON.stringify(await ev(() => ({ rf: __g.RF.on, ask: !!__g.RB.ask, can: __g.stkCanBind(), base: __g.RB.base, seen: __g.STK.seen, rej: __g.STK.rej, rel: __g.REC.relock.slice(-6), stk: __g.REC.stk.slice(-12) }))));
  ok('4. sticker 4 (no room owns it) is taken by Room 3 at once (no 20 s wait), "Room 3 now has sticker 4 ✓"', tB4 >= 0 && secs4 < 15 && B4.row === 4 && /Room 3 now has sticker 4 ✓/.test(B4.toast), secs4.toFixed(1) + ' s (lock still on probation then: ' + P4.prob + ') ' + JSON.stringify(B4));
  await shot('143-stickerkey-bound.png');

  /* ===================== 5. a grown colony: the question, with "It's Room 2" first ===================== */
  await ev(() => { for (const S of __g.G.settlements) S.born = Date.now() - 10 * 60000; }); const map3 = await mapOf('r3');
  await ev(([a, c]) => { window.__MARKS = [a, c]; __g.STK.obs = {}; }, [ST2, ST4]); await ev((f) => { window.__cam.mode = 'fixed'; window.__cam.fixed = f; }, FACE2);
  await viewSticker(ST2, 0.8, [25, 10, 35], 3.5); const tQ = await waitFor(() => !document.getElementById('nroom').hidden && /moved to another room/.test(document.getElementById('nroom').innerText), 60000, 300);
  const Q5 = await ev(() => { const el = document.getElementById('nroom'), pre = document.getElementById('mvPre'); return { txt: el.innerText.replace(/\s+/g, ' '), pre: pre ? pre.dataset.room + ':' + pre.innerText : '', first: el.querySelector('button') && el.querySelector('button').id, cur: __g.HOMES.cur, age: Math.round(__g.stkColAge()) }; });
  ok('5. a colony over 2 min old would be left: "Have you moved to another room?" with "It’s Room 2" first, nothing switched yet', tQ >= 0 && Q5.cur === 'r3' && /That sticker belongs to Room 2/.test(Q5.txt) && Q5.pre === 'r2:It’s Room 2' && Q5.first === 'mvPre', JSON.stringify(Q5));
  await sleep(300); await shot('144-stickerkey-grown-colony-asks.png');
  await p.click('#mvPre'); const tL5 = await waitFor(() => __g.HOMES.cur === 'r2' && __g.G.locked, 90000, 300); const S5 = await S();
  ok('5. "It’s Room 2": Room 2 loads and locks; Room 3 keeps its colony and its sticker', tL5 >= 0 && S5.rooms.includes('r3:4') && S5.cur === 'r2' && S5.locked && (await ev(() => { const d = JSON.parse(localStorage.getItem('base-camp-save-v2.r3') || 'null'); return !!d && d.settlements.some((S) => S.cols && S.cols.length); })), JSON.stringify(S5) + ' map3 kept: ' + ((await mapOf('r3')).length > 1000));

  /* ===================== 6. Menu, Rooms and stickers; the developer panel ===================== */
  await sleep(1500); await ev(() => __g.stkRoomsUi()); await sleep(300);
  const M6 = await ev(() => ({ txt: document.getElementById('modal').innerText.replace(/\s+/g, ' '), forget: !!document.getElementById('stkForget'), give: [...document.querySelectorAll('#modal [data-give]')].map((b) => b.innerText) }));
  ok('6. Menu, Rooms and stickers lists the owners (Room 2 · sticker 2 (this room), Room 3 · sticker 4) and offers "Forget this room’s sticker"', /Room 2 · sticker 2 \(this room\)/.test(M6.txt) && /Room 3 · sticker 4/.test(M6.txt) && /Room 1 No sticker yet/.test(M6.txt) && M6.forget && /\d of 8 rooms saved/.test(M6.txt), JSON.stringify(M6).slice(0, 600));
  await shot('145-stickerkey-menu-rooms.png');
  await p.click('#stkForget'); await sleep(300); await viewSticker(ST2, 0.8, [20, 30], 3); await sleep(6000);
  const F6 = await ev(() => ({ row: __g.HOMES.rooms.find((r) => r.id === 'r2').stk, off: __g.HOMES.rooms.find((r) => r.id === 'r2').stkOff, g: __g.G.stk && __g.G.stk.id }));
  ok('6. "Forget this room’s sticker": Room 2 has none, and seeing sticker 2 again does not bind it back by itself', !F6.row && F6.off === 2 && !F6.g, JSON.stringify(F6));
  await ev(() => __g.stkRoomsUi()); await sleep(200); const gb = await ev(() => { const b = document.getElementById('stkGiveSeen'); return b ? b.innerText : ''; });
  await p.click(gb ? '#stkGiveSeen' : '#modal [data-give="2"]'); await viewSticker(ST2, 0.8, [25, 15], 3); const tG = await waitFor(() => __g.G.stk && __g.G.stk.id === 2, 30000, 300);
  ok('6. "Give this room sticker 2" gives it back', tG >= 0 && gb === 'Give this room sticker 2' && (await ev(() => __g.HOMES.rooms.find((r) => r.id === 'r2').stk === 2)), gb);
  await ev(() => __g.devOpen()); await viewSticker(ST2, 0.8, [20, 30], 3); await sleep(2500);
  const D6 = await ev(() => ({ row: [...document.querySelectorAll('#devPanel .devRow')].map((r) => r.innerText.replace(/\s+/g, ' ')).find((t) => /Sticker/.test(t)) || '', num: __g.devRows().num.sticker, rep: Object.keys(__g.stkReport().refused || {}) }));
  ok('6. the developer panel\'s sticker row: id, owner room, distance, sightings toward a fix (refusal reason when there is one)', /id 2 · this room · \d\.\d\d m · \d+(\/4)? sightings/.test(D6.row) && D6.num && D6.num.owner === 'r2', JSON.stringify(D6));
  await shot('146-stickerkey-dev-row.png'); await ev(() => __g.DEV && __g.devClose && __g.devClose());

  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 5)));
  const fails = res.filter((r) => !r).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
