/* Base Camp build 26: room boundaries and the sleep relock (HANDOVER "Room boundaries and sleep relock"), in AR with the real WebXRKit polyfill and the fake native side.
   The fake world holds a shed (room A) and, about 4 m away, a lounge: the player walks from one to the other without leaving AR, as Harry did.
    1. room A is mapped; walking into the lounge asks "Have you moved to another room?" and nothing of the lounge is added to room A; "No, still here" lets it grow.
    2. (the saves are put back) Continue room A: walking into the lounge asks again; "New room" keeps room A's saved map byte for byte and the lounge becomes Room 2.
    3. walking back to the shed asks again; "It's... Room 1" unloads the lounge completely and finds the shed again.
    4. sleep: the page goes hidden and visible and the AR origin jumps (about 1 m and 20 degrees): the camp hides, is found again, and every hut is back within 6 cm.
    5. a gap in the XR frame times: alone it is checked quietly (nothing hides); with a jump the camp hides and is found again.
    6. tidy: the recognition chip and the scan patches go once the room is locked; no cable line between rooms or longer than the room; a foreign zone is never saved.
    7. the start chooser: Play shows Continue cards (most recent first, near rooms first with places on) and + New room.
    8. a mixed save (two groups of zones far apart) offers "Split it?"; splitting gives two rooms, each with only its own zones, after a room guard backup.
   Run (about 25 minutes):  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node tests/roomfix-test.js */
const fs = require('fs'), path = require('path');
const { serve, ROOT } = require('./lib.js'); const install = require('./ar-fake.js'); const { chromium } = require('playwright');
const POLY = fs.readFileSync(path.join(ROOT, 'webxr-polyfill.js'), 'utf8'); const OUT = path.join(ROOT, 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const SHED = [['floor', -1.2, 0, -1.5, 1.4, 1.4], ['deskA', -0.45, -0.45, -1.2, 0.3, 0.25], ['speakerA', -0.45, 0.8, -1.0, 0.15, 0.125], ['shelf', 0.2, 0.0, -2.7, 0.7, 0.13]];
const LOUNGE = [['lfloor', -1.2, 0.2, -5.9, 1.3, 1.3], ['sofa', -0.78, 0.6, -6.4, 0.5, 0.3], ['ltable', -0.85, -0.5, -6.0, 0.3, 0.25], ['lamp', -0.6, 0.9, -5.0, 0.15, 0.15]];
const WORLD = SHED.concat(LOUNGE);
const A_LEGS = ['shelf', 'deskA', 'floor', 'speakerA', 'floor2', 'shelf'], L_LEGS = ['lfloor', 'sofa', 'ltable', 'lamp', 'lfloor2'];
(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { const N = Date.now.bind(Date); Date.now = () => N() + (+localStorage.getItem('bc-test-off') || 0); });
  await install(p, WORLD); await p.addInitScript({ content: POLY });
  const ev = (f, a) => p.evaluate(f, a);
  const noOverlay = () => ev(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  const fresh = async () => { await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); await ev(() => { window.__SHED = window.__WORLD; window.__W = { yaw: 0, x: 0, z: 0, y: 0 }; __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; }); };
  await p.addInitScript((W) => { window.__WORLD = W; }, WORLD);
  const sweep = (legs, speed) => ev(([legs, speed]) => { const T = window.__place(), pick = (n) => T.find((t) => t.n === n);
    const look = (n, off, hgt, ay, ap, dur) => { const S = pick(n); if (!S) return null; const q = [S.cx + off[0], S.y + hgt, S.cz + off[1]], fx = S.cx - q[0], fy = S.y - q[1], fz = S.cz - q[2], L = Math.hypot(fx, fy, fz); return { p: q, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay, ap, dur }; };
    const D = { floor: ['floor', [0, 1.3], 1.6, 0.6, 0.25, 12], floor2: ['floor', [0.3, -0.4], 1.7, 0.7, 0.25, 9], deskA: ['deskA', [0.1, 0.7], 0.8, 0.3, 0.15, 10], speakerA: ['speakerA', [0.1, 0.5], 0.55, 0.12, 0.1, 8], shelf: ['shelf', [0, 0.6], 0.5, 0.18, 0.1, 10],
      lfloor: ['lfloor', [0, 0.4], 1.5, 0.6, 0.25, 12], lfloor2: ['lfloor', [0.3, -0.5], 1.6, 0.7, 0.25, 9], sofa: ['sofa', [0.1, 0.7], 0.6, 0.15, 0.1, 9], ltable: ['ltable', [0, 0.6], 0.6, 0.15, 0.1, 8], lamp: ['lamp', [0, -0.55], 0.5, 0.12, 0.1, 8] };
    const e = __g.AR.on ? __g.AR.viewM.elements : null, here = e ? [{ p: [e[12], e[13], e[14]], yaw: Math.atan2(e[8], e[10]), pitch: Math.asin(Math.max(-1, Math.min(1, -e[9]))), ay: 0, ap: 0, dur: 0.3 }] : []; /* the walk starts where the iPad is: no teleport */
    window.__cam.path = here.concat(legs.map((l) => { const d = D[l]; return look(d[0], d[1], d[2], d[3], d[4], d[5]); }).filter(Boolean)); window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = speed || 1; window.__cam.done = false; }, [legs, speed]);
  const keep = async () => { if (await ev(() => window.__cam.done)) await ev(() => { window.__cam.t0 = performance.now(); window.__cam.done = false; }); };
  const waitFor = async (fn, ms, every) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await keep(); if (await ev(fn)) return Date.now() - t0; await sleep(every || 600); } return -1; };
  const endSession = async () => { await ev(() => __g.AR.session.end()); await sleep(1500); };
  const play = async (how) => { await p.click('#bPlay'); await sleep(500); if (await ev(() => !document.getElementById('chooser').hidden)) await p.click(how || '#chFind'); await sleep(900); };
  const mapOf = (id) => ev((id) => localStorage.getItem(id === 'r1' ? 'base-camp-map-v1' : 'base-camp-map-v1.' + id), id);
  const zinfo = () => ev(() => __g.G.zones.map((z) => ({ id: z.id, room: z.room, cx: +z.cx.toFixed(2), cz: +z.cz.toFixed(2), y: +z.y.toFixed(2), a: +z.area.toFixed(2) })));
  const prompt = () => ev(() => { const el = document.getElementById('nroom'); return { up: !el.hidden, txt: el.hidden ? '' : el.innerText.replace(/\s+/g, ' ') }; });
  const things = () => ev(() => { const out = []; for (const S of __g.G.settlements) { if (!S.placed || S.lost) continue; for (const t of S.things) { const [x, z] = __g.l2w(S, t.x, t.z); out.push({ id: t.id, kind: t.kind, x, z, y: S.tf.y }); } } return out; });
  const toRoom = (W, x, z, y) => { const c = Math.cos(W.yaw), s = Math.sin(W.yaw), dx = x - W.x, dz = z - W.z; return [dx * c - dz * s, (y || 0) - (W.y || 0), dx * s + dz * c]; };
  const thingErr = (before, W0, after, W1) => { let worst = 0, n = 0; for (const t of before) { const q = after.find((u) => u.id === t.id); if (!q) continue; const r0 = toRoom(W0, t.x, t.z, t.y), r1 = toRoom(W1, q.x, q.z, q.y); worst = Math.max(worst, Math.hypot(r0[0] - r1[0], r0[2] - r1[2]), Math.abs(r0[1] - r1[1])); n++; } return { worst: worst * 100, n }; };
  const shot = async (name) => { await p.screenshot({ path: OUT + name }); console.log('shot ' + name); };
  const settleMap = async () => { await sweep(A_LEGS.concat(['deskA', 'floor']), 1.0); await waitFor(() => window.__cam.done, 200000, 2000); };

  await p.goto(url); await sleep(2500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await fresh();
  ok('BUILD is build 26', await ev(() => __g.BUILD === 'build 26'));

  /* ===================== 1. room A, then a walk into the lounge ===================== */
  await play(); await sweep(A_LEGS, 1.0);
  const tS = await waitFor(() => __g.G.settlements.length > 0, 150000, 600); ok('1. the shed: the colony settles by itself', tS > 0, tS + ' ms');
  await settleMap(); await waitFor(() => !!__g.RB.base, 120000, 1000);
  const base = await ev(() => __g.RB.base); ok('1. the room has an extent once it is settled', !!base, JSON.stringify(base));
  await ev(() => __g.persist(true)); const zA = await zinfo(); const nA = zA.length;
  await sweep(L_LEGS, 1.0); const spyHeld = []; const tAsk = await waitFor(() => !document.getElementById('nroom').hidden && /moved to another room/.test(document.getElementById('nroom').innerText), 90000, 500);
  const P1 = await prompt(); const zA1 = await zinfo(); const why1 = await ev(() => __g.RB.ask && __g.RB.ask.why);
  ok('1. walking into the lounge asks "Have you moved to another room?" with New room / No, still here', tAsk > 0 && /New room/.test(P1.txt) && /No, still here/.test(P1.txt), JSON.stringify(P1) + ' why ' + why1 + ' after ' + tAsk + ' ms');
  ok('1. nothing of the lounge was added to room A (no zone beyond the shed, the same zones)', zA1.length === nA && zA1.every((z) => z.cz > -3.3 && z.room === 'r1'), nA + ' -> ' + zA1.length + ' ' + JSON.stringify(zA1.filter((z) => z.cz <= -3.3)));
  await shot('89-roomfix-moved-prompt.png');
  const snap1 = await ev(() => JSON.stringify(Object.assign({}, localStorage))); const mapAtAsk = await mapOf('r1');
  await sleep(12000); const zA2 = await zinfo(); ok('1. while the question is up nothing is added and room A\'s map is not written again', zA2.length === nA && (await mapOf('r1')) === mapAtAsk, zA2.length + ' zones');
  await p.click('#mvNo'); await sleep(500);
  const tGrow = await waitFor(() => __g.G.zones.some((z) => z.cz < -3.6), 90000, 800); const zA3 = await zinfo();
  ok('1. "No, still here": the room\'s extent grows and the lounge surfaces may join it', tGrow > 0 && (await ev(() => !__g.RB.ask && __g.RB.base.z0 < -4)), zA3.length + ' zones, beyond ' + zA3.filter((z) => z.cz < -3.6).length);
  await endSession();
  await ev((snap) => { localStorage.clear(); const o = JSON.parse(snap); for (const k of Object.keys(o)) localStorage.setItem(k, o[k]); }, snap1); /* put the saves back as they were at the question */

  /* ===================== 2. Continue room A, walk into the lounge, New room ===================== */
  await ev(() => localStorage.setItem('bc-test-off', String(2 * 3600 * 1000))); await fresh();
  await play('#chooser [data-room="r1"]'); await sweep(A_LEGS, 1.0);
  const tL = await waitFor(() => __g.G.locked, 240000, 600); ok('2. Continue room A: the shed is found again', tL > 0, tL + ' ms');
  await waitFor(() => __g.AUTO.commitAt === 0 && !!__g.RB.base, 90000, 800);
  const rs0 = await ev(() => ({ hidden: document.getElementById('rstat').hidden }));
  await sweep(L_LEGS, 1.0); const tAsk2 = await waitFor(() => !document.getElementById('nroom').hidden && /moved to another room/.test(document.getElementById('nroom').innerText), 90000, 500);
  const mapA2 = await mapOf('r1'); const nA2 = (await zinfo()).length;
  ok('2. a locked room asks too when the iPad walks into the lounge', tAsk2 > 0, tAsk2 + ' ms');
  await p.click('#mvNew'); await sleep(1500);
  const N = await ev(() => ({ cur: __g.HOMES.cur, n: __g.HOMES.rooms.length, zones: __g.G.zones.length, sets: __g.G.settlements.length, ret: __g.G.returning, state: __g.RELOC.state, hits: __g.SCAN.hits, hidden: document.getElementById('nroom').hidden }));
  ok('2. "New room": Room 2 starts in place with an empty map and a fresh scan', N.cur === 'r2' && N.n === 2 && N.zones === 0 && N.sets === 0 && !N.ret && N.state === 'new' && N.hidden, JSON.stringify(N));
  const tS2 = await waitFor(() => __g.G.settlements.length > 0, 150000, 600); ok('2. the lounge colony settles in Room 2', tS2 > 0);
  ok('2. room A\'s saved map is byte for byte what it was when the question came up', (await mapOf('r1')) === mapA2, nA2 + ' zones in room A');
  await sweep(L_LEGS.concat(['sofa', 'lfloor']), 1.0); await waitFor(() => window.__cam.done, 200000, 2000); await waitFor(() => !!__g.RB.base, 120000, 1000); await ev(() => __g.persist(true));
  const z2 = await zinfo(); ok('2. Room 2 holds only lounge zones', z2.length > 0 && z2.every((z) => z.room === 'r2' && z.cz < -3.6), JSON.stringify(z2));
  await shot('90-roomfix-new-room-lounge.png');

  /* ===================== 3. back to the shed: It's... Room 1 ===================== */
  const old = await ev(() => ({ zm: __g.G.zones.map((z) => z.mesh && z.mesh.uuid).filter(Boolean), sg: __g.G.settlements.map((S) => S.group.uuid), lg: __g.G.links.map((l) => l.group.uuid) }));
  await sweep(A_LEGS, 1.0); const tAsk3 = await waitFor(() => !document.getElementById('nroom').hidden && /moved to another room/.test(document.getElementById('nroom').innerText), 120000, 500);
  ok('3. walking back to the shed asks again, and offers It’s… with the saved shed', tAsk3 > 0 && (await ev(() => !!document.getElementById('mvIts'))));
  await p.click('#mvIts'); await sleep(300); await p.click('#nroom [data-room="r1"]'); await sleep(1500);
  const S3 = await ev((old) => ({ cur: __g.HOMES.cur, ret: __g.G.returning, zones: __g.G.zones.length, rooms: [...new Set(__g.G.zones.map((z) => z.room))], sets: __g.G.settlements.map((S) => S.zoneRef.room), left: old.zm.concat(old.sg, old.lg).filter((u) => !!__g.world.getObjectByProperty('uuid', u)).length }), old);
  ok('3. It’s… Room 1: the lounge is unloaded completely (zones, camps, cables) and only the shed is loaded', S3.cur === 'r1' && S3.ret && S3.zones > 0 && S3.rooms.join() === 'r1' && S3.sets.every((r) => r === 'r1') && S3.left === 0, JSON.stringify(S3));
  const r2map = await ev(() => JSON.parse(localStorage.getItem('base-camp-map-v1.r2'))); ok('3. Room 2\'s saved map has only its own zones', r2map && r2map.zones.length > 0 && r2map.zones.every((z) => z.cz < -3.6) && r2map.room === 'r2', r2map && r2map.zones.length);
  const tL3 = await waitFor(() => __g.G.locked, 240000, 600); ok('3. ...and the shed is found again (relocalised)', tL3 > 0, tL3 + ' ms');
  await waitFor(() => __g.AUTO.commitAt === 0, 90000, 800);

  /* ===================== 6. tidy (on the locked shed) ===================== */
  await sleep(6000);
  const T6 = await ev(() => { const zs = __g.G.zones.filter((z) => z.mesh && z.mesh.userData.plane && !z.settled); return { chip: document.getElementById('rstat').hidden, tidy: __g.rbTidy(), planes: zs.map((z) => z.mesh.userData.plane.material.opacity), bands: __g.SCAN.bands.filter((b2) => b2.mesh.visible).length, labels: __g.G.zones.concat(__g.SCAN.zones).filter((z) => z.label && z.label.visible).length }; });
  ok('6. the recognition chip is hidden after the lock', T6.chip && rs0.hidden, JSON.stringify({ chip: T6.chip, atLock: rs0 }));
  ok('6. scan patches fade after the lock (no zone wash, no scan bands, no floating names)', T6.tidy && T6.planes.every((o) => o < 0.05) && T6.bands === 0 && T6.labels === 0, JSON.stringify(T6));
  const C6 = await ev(() => { const g = __g.G, Z = g.zones[0], fake = Object.assign({}, Z, { id: 999, room: 'r2', cx: Z.cx + 3, mesh: null, label: null, settled: null, f0: [Z.cx + 3, Z.cz, Z.ang, Z.y] }); g.zones.push(fake); const sa = g.spots.find((s) => s.zid === Z.id) || __g.addSpot({ tag: 'other', x: Z.cx, y: Z.y, z: Z.cz, zid: Z.id, src: 'player' }), sb = __g.addSpot({ tag: 'shelf', name: 'Elsewhere', x: Z.cx + 3, y: Z.y, z: Z.cz, zid: 999, src: 'player' });
    const n0 = __g.SPOTMARK.children.filter((c) => c.isLine).length, links0 = g.links.length; const cb = __g.addCable(sa.id, sb.id); __g.refreshSpots(); const n1 = __g.SPOTMARK.children.filter((c) => c.isLine).length, links1 = g.links.length; const m = __g.mapToJSON();
    const lines = __g.SPOTMARK.children.filter((c) => c.isLine).map((c) => { const a = c.geometry.attributes.position; return Math.hypot(a.getX(1) - a.getX(0), a.getZ(1) - a.getZ(0)); });
    g.cables = g.cables.filter((c) => c !== cb); __g.removeSpot(sb); g.zones.splice(g.zones.indexOf(fake), 1); __g.refreshSpots();
    return { added: n1 - n0, links: links1 - links0, saved: m.zones.some((z) => z.id === 999), spot: m.spots.some((s) => s.zid === 999), diag: +__g.rbDiag().toFixed(2), lines, cross: g.links.filter((l) => { const A = g.settlements.find((S) => S.id === l.a.sid), B = g.settlements.find((S) => S.id === l.b.sid); return A && B && A.zoneRef.room !== B.zoneRef.room; }).length }; });
  ok('6. no cable line or cable car between zones of different rooms, none longer than the room', C6.added === 0 && C6.links === 0 && C6.cross === 0 && C6.lines.every((l) => l <= C6.diag), JSON.stringify(C6));
  ok('6. persist guard: a zone of another room is never written into this room\'s map', !C6.saved && !C6.spot);

  /* ===================== 4. sleep: hidden -> visible and the origin jumps ===================== */
  await sweep(A_LEGS, 1.0); await sleep(4000);
  const W0 = { yaw: 0, x: 0, z: 0, y: 0 }, W1 = { yaw: 20 * Math.PI / 180, x: 0.7, z: -0.45, y: 0.5 };
  const before = await things(); const nTh = before.length;
  await ev(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(1500); await ev((W) => { window.__W = W; }, W1);
  await ev(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await sleep(600);
  const H4 = await ev(() => ({ on: __g.RF.on, hidden: __g.RF.hidden, world: __g.world.visible, hint: document.getElementById('hint').innerText }));
  ok('4. waking up hides the camp and asks to look around', H4.on && H4.hidden && !H4.world && /Look around so I can find the camp again/.test(H4.hint), JSON.stringify(H4));
  await shot('91-roomfix-wake-look-around.png');
  await sweep(A_LEGS, 1.0); const tR4 = await waitFor(() => !__g.RF.on && __g.G.locked, 180000, 600);
  const R4 = await ev(() => ({ world: __g.world.visible, rel: __g.REC.relock.slice(-6) }));
  ok('4. the camp is found again and comes back', tR4 > 0 && R4.world, tR4 + ' ms ' + JSON.stringify(R4.rel.map((e) => Object.keys(e).filter((k) => k !== 't').join('/'))));
  await waitFor(() => __g.AUTO.commitAt === 0, 90000, 800); await sleep(500);
  const after4 = await things(); const e4 = thingErr(before, W0, after4, W1);
  ok('4. every hut and thing is back within 6 cm of its real place', e4.n >= 0.8 * nTh && nTh > 0 && e4.worst < 6, 'worst ' + e4.worst.toFixed(1) + ' cm over ' + e4.n + ' things');
  await shot('92-roomfix-found-again.png');

  /* ===================== 5. a gap in the XR frame times ===================== */
  await sweep(A_LEGS, 1.0); await sleep(5000);
  const n5 = await ev(() => ({ n: __g.RF.n, done: __g.RF.done })); const hid5 = [];
  await ev(() => { const t = performance.now(); while (performance.now() - t < 900) { /* the page stops for 0.9 s */ } });
  for (let i = 0; i < 16; i++) { hid5.push(await ev(() => ({ on: __g.RF.on, hidden: __g.RF.hidden, world: __g.world.visible }))); await sleep(500); }
  const n5b = await ev(() => ({ n: __g.RF.n, done: __g.RF.done, rel: __g.REC.relock.slice(-3) }));
  ok('5. a frame gap alone is checked quietly: nothing hides and the room stays put', n5b.n > n5.n && n5b.done > n5.done && hid5.every((h) => !h.hidden && h.world), JSON.stringify(n5b));
  const before5 = await things(); const W2 = { yaw: W1.yaw - 0.3, x: W1.x - 0.6, z: W1.z + 0.5, y: W1.y - 0.3 };
  await ev((W) => { window.__W = W; const t = performance.now(); while (performance.now() - t < 900) { /* sleep-like gap and a jump */ } }, W2);
  await sweep(A_LEGS, 1.0);
  const tH5 = await waitFor(() => __g.RF.hidden, 30000, 300); ok('5. a frame gap with an origin jump: the check fails and the camp hides', tH5 >= 0, tH5 + ' ms');
  const tR5 = await waitFor(() => !__g.RF.on && __g.G.locked, 180000, 600); await waitFor(() => __g.AUTO.commitAt === 0, 90000, 800);
  const e5 = thingErr(before5, W1, await things(), W2); ok('5. ...and it is found again, every thing within 6 cm', tR5 > 0 && e5.worst < 6 && e5.n > 0, 'worst ' + e5.worst.toFixed(1) + ' cm');
  await ev(() => __g.persist(true)); await endSession();

  /* ===================== 7. the start chooser ===================== */
  await fresh(); await p.click('#bPlay'); await sleep(600);
  const C7 = await ev(() => ({ shown: !document.getElementById('chooser').hidden, cards: [...document.querySelectorAll('#chooser .chcard')].map((c) => c.dataset.room + ':' + c.innerText.replace(/\s+/g, ' ')), nw: !!document.getElementById('chNew'), ar: __g.AR.on, rows: document.getElementById('rooms').offsetParent !== null }));
  ok('7. Play shows the chooser: a Continue card per room (most recent first) and + New room, nothing starts by itself', C7.shown && C7.cards.length === 2 && /^r1:.*Continue: Room 1/.test(C7.cards[0]) && /^r2:/.test(C7.cards[1]) && C7.nw && !C7.ar && !C7.rows, JSON.stringify(C7));
  await shot('93-roomfix-start-chooser.png');
  const C7b = await ev(() => { __g.chooserClose(); __g.PLACES.on = true; __g.PLACES.here = { lat: 50.001, lon: -1.001 }; __g.PLACES.spots = { r1: { lat: 51.5, lon: -0.1 }, r2: { lat: 50.001, lon: -1.001 } }; __g.chooserOpen(); const o = [...document.querySelectorAll('#chooser .chcard')].map((c) => c.dataset.room + (/near here/.test(c.innerText) ? '*' : '')); __g.PLACES.on = false; __g.PLACES.here = null; __g.PLACES.spots = {}; __g.chooserClose(); return o; });
  ok('7. with places on, the rooms near here come first', C7b.join() === 'r2*,r1', C7b.join());
  await ev(() => document.getElementById('chBack').click()); ok('7. Back returns to the title', await ev(() => document.getElementById('chooser').hidden && !document.getElementById('title').classList.contains('choosing')));

  /* ===================== 8. a mixed save offers a split ===================== */
  const mk = await ev(() => { /* Room 3 = the shed + the lounge 6 m away, as an older build could have merged them (no room tags, old shape) */
    const m1 = JSON.parse(localStorage.getItem('base-camp-map-v1')), m2 = JSON.parse(localStorage.getItem('base-camp-map-v1.r2')), s1 = JSON.parse(localStorage.getItem('base-camp-save-v2')), s2 = JSON.parse(localStorage.getItem('base-camp-save-v2.r2'));
    const m = JSON.parse(JSON.stringify(m1)); delete m.room; m.build = 'build 23'; m.name = 'Mixed';
    for (const z of m2.zones) m.zones.push(Object.assign({}, z, { id: z.id + 100, cx: z.cx + 7 })); for (const s of m2.spots) m.spots.push(Object.assign({}, s, { id: s.id + 100, zid: s.zid + 100, x: s.x + 7 })); m.nextMZ = 300; m.nextSpot = 300;
    const sv = JSON.parse(JSON.stringify(s1)); for (const S of (s2 ? s2.settlements : [])) sv.settlements.push(Object.assign({}, S, { id: S.id + 5000, zid: S.zid + 100, cols: (S.cols || []).map((c) => Object.assign({}, c, { id: c.id + 50000 })), things: S.things.map((t) => Object.assign({}, t, { id: t.id + 50000, link: 0 })) }));
    localStorage.setItem('base-camp-map-v1.r3', JSON.stringify(m)); localStorage.setItem('base-camp-save-v2.r3', JSON.stringify(sv));
    __g.HOMES.rooms.push({ id: 'r3', name: 'Mixed', created: Date.now(), visits: 1, known: 0, post: [], last: Date.now() + 1000 }); __g.homesSave();
    return { zones: m.zones.length, a: m1.zones.length, b: m2.zones.length, sets: sv.settlements.length, mixed: localStorage.getItem('base-camp-map-v1.r3'), sv: JSON.stringify(sv) };
  });
  await p.reload(); await sleep(2500);
  const O8 = await ev(() => ({ offer: !!document.querySelector('#rooms [data-id="r3"] .rsplit'), txt: (document.querySelector('#rooms [data-id="r3"] .rsplit') || {}).innerText || '', others: document.querySelectorAll('#rooms .rsplit').length, groups: __g.rsCheck('r3') }));
  ok('8. a mixed save (two groups of zones far apart) offers "This room looks like two rooms. Split it?" once, on that room only', O8.offer && /two rooms\. Split it\?/.test(O8.txt) && O8.others === 1 && O8.groups === 2, JSON.stringify(O8));
  await p.evaluate(() => document.querySelector('#rooms [data-id="r3"]').scrollIntoView()); await shot('94-roomfix-split-offer.png');
  await p.click('#rooms [data-id="r3"] [data-act="split"]'); await sleep(800);
  const S8 = await ev(([mixed, mixedSvTxt]) => { const rooms = __g.HOMES.rooms.map((r) => r.id), nr = rooms.find((id) => !['r1', 'r2', 'r3'].includes(id)), ma = JSON.parse(localStorage.getItem('base-camp-map-v1.r3')), mb = nr && JSON.parse(localStorage.getItem('base-camp-map-v1.' + nr)), sa = JSON.parse(localStorage.getItem('base-camp-save-v2.r3')), sb = nr && JSON.parse(localStorage.getItem('base-camp-save-v2.' + nr) || 'null');
    const za = ma.zones.map((z) => z.id), zb = mb ? mb.zones.map((z) => z.id) : [];
    const mixedSv = JSON.parse(mixedSvTxt), main = mixedSv.settlements.filter((S) => S.zid).sort((x, y) => (y.cols || []).length - (x.cols || []).length)[0];
    const west = (m) => m.zones.every((z) => z.cx < 4), east = (m) => m.zones.every((z) => z.cx > 4);
    return { rooms, nr, za, zb, main: main && main.zid, mainKept: !!main && za.includes(main.zid), aOk: west(ma) || east(ma), bOk: mb && (west(mb) || east(mb)) && west(mb) !== west(ma), spotsA: ma.spots.every((s) => za.includes(s.zid)), spotsB: mb && mb.spots.every((s) => zb.includes(s.zid)), setsA: sa.settlements.every((S) => za.includes(S.zid) || !zb.includes(S.zid)), setsB: sb ? sb.settlements.every((S) => zb.includes(S.zid)) : null, nSets: [sa.settlements.length, sb ? sb.settlements.length : 0], backup: localStorage.getItem('bc-mapold-r3-1') === mixed, asked: __g.HOMES.rooms.find((r) => r.id === 'r3').splitAsked, offer: !!document.querySelector('#rooms .rsplit') };
  }, [mk.mixed, mk.sv]);
  ok('8. splitting gives two rooms, each with only its own zones, spots and camps; the camp with most colonists stays', !!S8.nr && S8.mainKept && S8.aOk && S8.bOk && S8.spotsA && S8.spotsB && S8.setsA && S8.setsB !== false && S8.za.length + S8.zb.length === mk.zones && S8.nSets[0] + S8.nSets[1] === mk.sets, JSON.stringify(S8));
  ok('8. the room guard backup of the mixed map was made first; the offer is not shown again', S8.backup && S8.asked && !S8.offer);
  await shot('95-roomfix-after-split.png');
  await p.click('#bPlay'); await sleep(500); const C8 = await ev(() => document.querySelectorAll('#chooser .chcard').length); await ev(() => document.getElementById('chBack').click());
  ok('8. both parts are rooms you can Continue', C8 === 4, C8 + ' cards');

  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 5)));
  const fails = res.filter((r) => !r).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
