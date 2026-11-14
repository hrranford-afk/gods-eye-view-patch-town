/* Base Camp room guard (build 22, HANDOVER "Room guard"), in AR with the real WebXRKit polyfill and the fake native side (ar-fake.js).
   The rooms are those of totem-test.js: room B has a floor and a desk top at the same heights as room A, which the surface matcher alone can take for room A.
    1. room A, first time: the colony settles and the map is saved (one saved room).
    2. return to room A (turned and shifted): the lock is on probation (nothing written), a second top lines it up, then it saves; backup 1 = the map before this session.
    3. room B with only room A saved: "Is this the same room?" instead of a silent lock; even after "Yes, same room" nothing reaches room A while on probation,
       a correction throws the held saves away, and room A's map is byte for byte what it was.
    4. backups rotate and keep 2 (in the page, synthetic maps).
    5. restore: More..., "Restore this room's last map", tap again: backup 1 is the map again and the replaced map becomes backup 1.
   Run (about 8 minutes):  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node tests/roomguard-test.js */
const fs = require('fs'), path = require('path');
const { serve, ROOT } = require('./lib.js'); const install = require('./ar-fake.js'); const { chromium } = require('playwright');
const POLY = fs.readFileSync(path.join(ROOT, 'webxr-polyfill.js'), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const ROOM_A = [['floor', -1.2, 0, -1.5, 1.4, 1.4], ['deskA', -0.45, -0.45, -1.2, 0.3, 0.25], ['speakerA', -0.45, 0.8, -1.0, 0.15, 0.125], ['shelf', 0.2, 0.0, -2.7, 0.7, 0.13]];
const ROOM_B = [['floor', -1.2, 0, -1.5, 1.0, 1.4], ['deskA', -0.45, 0.5, -1.3, 0.25, 0.3], ['speakerA', -0.8, -0.6, -1.0, 0.2, 0.2], ['shelf', 0.35, -0.2, -2.8, 0.5, 0.15]];
const WA = { yaw: 0.5, x: 0.5, z: -0.3 }, WB = { yaw: 0, x: 0, z: 0 };
(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { const N = Date.now.bind(Date); Date.now = () => N() + (+localStorage.getItem('bc-test-off') || 0); });
  await install(p, ROOM_A); await p.addInitScript({ content: POLY });
  const ev = (f, a) => p.evaluate(f, a);
  const noOverlay = () => ev(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  const fresh = async () => { await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); };
  const setRoom = (shed, W) => ev(([shed, W]) => { window.__SHED = shed; window.__W = W; }, [shed, W]);
  const sweep = (legs, speed) => ev(([legs, speed]) => { const T = window.__place(), pick = (n) => T.find((t) => t.n === n);
    const look = (n, off, hgt, ay, ap, dur) => { const S = pick(n); if (!S) return null; const q = [S.cx + off[0], S.y + hgt, S.cz + off[1]], fx = S.cx - q[0], fy = S.y - q[1], fz = S.cz - q[2], L = Math.hypot(fx, fy, fz); return { p: q, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay, ap, dur }; };
    const D = { floor: [[0, 1.3], 1.6, 0.6, 0.25, 12], floor2: [[0.3, -0.4], 1.7, 0.7, 0.25, 9], deskA: [[0.1, 0.7], 0.8, 0.3, 0.15, 10], speakerA: [[0.1, 0.5], 0.55, 0.12, 0.1, 8], shelf: [[0, 0.6], 0.5, 0.18, 0.1, 10] };
    window.__cam.path = legs.map((l) => { const d = D[l], nme = l === 'floor2' ? 'floor' : l; return look(nme, d[0], d[1], d[2], d[3], d[4]); }).filter(Boolean); window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = speed; window.__cam.done = false; }, [legs, speed]);
  const keep = async () => { if (await ev(() => window.__cam.done)) await ev(() => { window.__cam.t0 = performance.now(); window.__cam.done = false; }); };
  const waitFor = async (fn, ms, every) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await keep(); if (await ev(fn)) return Date.now() - t0; await sleep(every || 600); } return -1; };
  const endSession = async () => { await ev(() => __g.AR.session.end()); await sleep(1500); };
  const advance = (h) => ev((h) => localStorage.setItem('bc-test-off', String((+localStorage.getItem('bc-test-off') || 0) + h * 3600 * 1000)), h);
  const mapA = () => ev(() => localStorage.getItem('base-camp-map-v1'));
  const guard = () => ev(() => ({ prob: __g.RG.prob, confirmed: __g.RG.confirmed, tops: __g.RG.tops, holds: __g.RG.holds, held: !!__g.RG.held, locked: __g.G.locked, st: __g.RELOC.state, how: __g.RELOC.lock && __g.RELOC.lock.how, score: __g.RELOC.lock && Math.round(__g.RELOC.lock.score), ov: __g.RELOC.lock && __g.RELOC.lock.overlap }));

  await p.goto(url); await sleep(2500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await fresh();
  ok('BUILD is build 26', await ev(() => __g.BUILD === 'build 26'));

  /* ===================== 1. room A, first time ===================== */
  await setRoom(ROOM_A, WB); await ev(() => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; });
  await p.click('#bPlay'); await p.evaluate(() => { const c = document.getElementById('chooser'); if (c && !c.hidden) document.getElementById('chFind').click(); }); /* build 26: the start chooser; Find keeps the old Play */ await sleep(900); await sweep(['shelf', 'deskA', 'floor', 'speakerA', 'floor2', 'shelf'], 1.0);
  const tS = await waitFor(() => __g.G.settlements.length > 0, 150000, 600);
  await sweep(['shelf', 'deskA', 'floor', 'speakerA', 'floor2', 'shelf', 'deskA', 'floor'], 1.0); await waitFor(() => window.__cam.done, 200000, 2000);
  await ev(() => { __g.simulate(120, 0.5); __g.persist(true); }); await sleep(500);
  await endSession(); /* the session end saves once more: A0 is the map as it is after that */
  const A0 = await mapA();
  ok('1. room A settles and its map is saved; a first session makes no backup', tS > 0 && !!A0 && (await ev(() => !localStorage.getItem('bc-mapold-r1-1'))), 'settled after ' + tS + ' ms, map ' + (A0 || '').length + ' chars');

  /* ===================== 2. return to room A: a strong lock, probation, then it saves ===================== */
  await advance(8); await fresh(); await setRoom(ROOM_A, WA); await ev(() => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; });
  await p.click('#bPlay'); await p.evaluate(() => { const c = document.getElementById('chooser'); if (c && !c.hidden) document.getElementById('chFind').click(); }); /* build 26: the start chooser; Find keeps the old Play */ await sleep(900); await sweep(['shelf', 'deskA', 'speakerA', 'floor', 'floor2'], 1.0);
  await waitFor(() => __g.G.locked || __g.RELOC.state === 'asking', 240000, 300);
  const g2 = await guard(); const same2 = (await mapA()) === A0;
  ok('2. the real room locks silently (no question)', g2.locked && g2.how === 'auto' && (await ev(() => document.getElementById('ask').hidden || !document.getElementById('rmSame'))), JSON.stringify(g2));
  ok('...the fresh lock is on probation and has written nothing yet', (g2.prob || g2.confirmed === 'surface') && same2, JSON.stringify({ prob: g2.prob, confirmed: g2.confirmed, same: same2 }));
  const tC = await waitFor(() => !__g.RG.prob, 90000, 500); const g2b = await guard();
  ok('...a second top lines up: the lock is confirmed well before ' + (await ev(() => __g.RG_PROB)) + ' s', tC >= 0 && g2b.confirmed === 'surface' && g2b.tops >= 2, JSON.stringify(g2b) + ' after ' + tC + ' ms');
  await waitFor(() => __g.AUTO.commitAt === 0, 90000, 800); await ev(() => { document.getElementById('diary').hidden = true; __g.persist(true); }); await sleep(400);
  const A1 = await mapA(), bk1 = await ev(() => localStorage.getItem('bc-mapold-r1-1'));
  ok('...after the probation the room saves (strong lock in the real room)', !!A1 && A1 !== A0 && JSON.parse(A1).saved > JSON.parse(A0).saved, (A1 || '').length + ' chars');
  ok('...and backup 1 is the map from before this session, byte for byte', bk1 === A0 && (await ev(() => !localStorage.getItem('bc-mapold-r1-2'))));
  await endSession();

  /* ===================== 3. room B with only room A saved ===================== */
  await advance(3); await fresh(); await setRoom(ROOM_B, WB); await ev(() => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; });
  const aBefore = await mapA(), bkBefore = await ev(() => [localStorage.getItem('bc-mapold-r1-1'), localStorage.getItem('bc-mapold-r1-2')]);
  await p.click('#bPlay'); await p.evaluate(() => { const c = document.getElementById('chooser'); if (c && !c.hidden) document.getElementById('chFind').click(); }); /* build 26: the start chooser; Find keeps the old Play */ await sleep(900); await sweep(['shelf', 'deskA', 'speakerA', 'floor', 'floor2'], 1.0);
  await waitFor(() => __g.G.locked || __g.RELOC.state === 'asking', 240000, 500); await sleep(800);
  const g3 = await guard(), q3 = await ev(() => ({ ask: !document.getElementById('ask').hidden, text: document.getElementById('ask').innerText.slice(0, 60), same: !!document.getElementById('rmSame'), nw: !!document.getElementById('rmNew'), rec: __g.REC.reloc.filter((r) => r.guard).slice(-3), secs: +__g.RELOC.scanSecs.toFixed(1) }));
  ok('3. room B: no silent lock, the question "Is this the same room?" instead', !g3.locked && q3.ask && q3.same && q3.nw && /same room/i.test(q3.text), JSON.stringify(q3) + ' ' + JSON.stringify(g3));
  ok('...room A\'s map is untouched while asking', (await mapA()) === aBefore);
  /* the worst case: the player taps "Yes, same room" in the wrong room */
  if (q3.same) await p.click('#rmSame'); else if (!g3.locked) await ev(() => { if (__g.RELOC.result) __g.relocLock(__g.RELOC.result, 'asked'); });
  await sleep(500); const g3b = await guard();
  ok('..."Yes, same room" locks, on probation', g3b.locked && g3b.prob, JSON.stringify(g3b));
  await sweep(['shelf', 'deskA', 'speakerA', 'floor', 'floor2', 'shelf'], 1.0);
  for (let i = 0; i < 7; i++) { await keep(); await sleep(5000); await ev(() => __g.persist(true)); }
  const g3c = await guard();
  ok('...35 s and repeated saves later: still on probation, no second top in room B, the saves are held in memory', g3c.prob && g3c.tops < 2 && g3c.holds > 0 && g3c.held, JSON.stringify(g3c));
  ok('...room A\'s map is byte for byte what it was', (await mapA()) === aBefore);
  await ev(() => __g.relocManual()); await sleep(300); const g3d = await guard();
  ok('...a correction (line up by hand) throws the held saves away', !g3d.prob && !g3d.held && g3d.holds === 0 && (await ev(() => __g.REC.reloc.some((r) => r.guard === 'dropped'))), JSON.stringify(g3d));
  await endSession();
  const aAfter = await mapA(), bkAfter = await ev(() => [localStorage.getItem('bc-mapold-r1-1'), localStorage.getItem('bc-mapold-r1-2')]);
  ok('...after the session ends: room A\'s map and its backups are byte for byte what they were', aAfter === aBefore && bkAfter[0] === bkBefore[0] && bkAfter[1] === bkBefore[1], (aAfter || '').length + ' chars');

  /* ===================== 4. backups rotate and keep 2 ===================== */
  const rot = await ev(() => { const k = 'base-camp-map-v1.r9', mk = (n) => JSON.stringify({ v: 1, kind: 'base-camp-room-map', name: 'T' + n, saved: n, zones: [] }), out = [];
    for (let n = 1; n <= 4; n++) { localStorage.setItem(k, mk(n)); __g.rgBackup('r9', k); out.push([localStorage.getItem(__g.rgOldKey('r9', 1)), localStorage.getItem(__g.rgOldKey('r9', 2)), localStorage.getItem(__g.rgOldKey('r9', 3))].map((s) => (s ? JSON.parse(s).name : null))); }
    __g.rgBackup('r9', k); const dup = [localStorage.getItem(__g.rgOldKey('r9', 1)), localStorage.getItem(__g.rgOldKey('r9', 2))].map((s) => JSON.parse(s).name);
    localStorage.setItem(k, '{broken'); const bad = __g.rgBackup('r9', k), after = JSON.parse(localStorage.getItem(__g.rgOldKey('r9', 1))).name;
    for (const x of [k, __g.rgOldKey('r9', 1), __g.rgOldKey('r9', 2)]) localStorage.removeItem(x); return { out, dup, bad, after }; });
  ok('4. backups rotate and keep the last 2', JSON.stringify(rot.out) === JSON.stringify([['T1', null, null], ['T2', 'T1', null], ['T3', 'T2', null], ['T4', 'T3', null]]), JSON.stringify(rot.out));
  ok('...the same map is not kept twice, and a damaged map never pushes a good backup out', JSON.stringify(rot.dup) === '["T4","T3"]' && rot.bad === false && rot.after === 'T4', JSON.stringify(rot));

  /* ===================== 5. restore ===================== */
  await ev(() => { if (__g.G.phase !== 'title') __g.showTitle && __g.showTitle(); }); await sleep(500);
  const cur5 = await mapA(), b15 = await ev(() => localStorage.getItem('bc-mapold-r1-1'));
  await p.click('#bMore'); await sleep(300);
  const btn = await ev(() => { const b = document.getElementById('bRestore'); return { shown: !b.hidden, text: b.textContent }; });
  ok('5. More... shows "Restore this room\'s last map"', btn.shown && /Restore this room/.test(btn.text), JSON.stringify(btn));
  await p.click('#bRestore'); await sleep(300);
  const ask5 = await ev(() => ({ text: document.getElementById('bRestore').textContent, same: localStorage.getItem('base-camp-map-v1') }));
  ok('...the first tap only asks to confirm', /Tap again/.test(ask5.text) && ask5.same === cur5, ask5.text);
  await p.click('#bRestore'); await sleep(600);
  const r5 = await ev(() => ({ map: localStorage.getItem('base-camp-map-v1'), b1: localStorage.getItem('bc-mapold-r1-1'), info: document.getElementById('mapInfo').textContent }));
  ok('...the second tap restores: backup 1 is the room\'s map again (byte for byte)', r5.map === b15 && r5.map === A0, r5.info);
  ok('...and the map it replaced is kept as backup 1 (a second restore undoes it)', r5.b1 === cur5);
  const back = await ev(() => __g.rgRestore('r1') && localStorage.getItem('base-camp-map-v1'));
  ok('...undo by restoring again', back === cur5 && (await ev(() => localStorage.getItem('bc-mapold-r1-1'))) === A0);
  await ev(() => __g.rgRestore('r1')); /* leave room A on its first map and play it: it loads and locks like any map */
  await advance(2); await fresh(); await setRoom(ROOM_A, { yaw: -0.3, x: 0.2, z: 0.2 }); await ev(() => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; });
  await p.click('#bPlay'); await p.evaluate(() => { const c = document.getElementById('chooser'); if (c && !c.hidden) document.getElementById('chFind').click(); }); /* build 26: the start chooser; Find keeps the old Play */ await sleep(900); await sweep(['shelf', 'deskA', 'speakerA', 'floor', 'floor2'], 1.0);
  await waitFor(() => __g.G.locked || __g.RELOC.state === 'asking', 240000, 400); const g5 = await guard();
  ok('...the restored map loads and the real room locks again', g5.locked && g5.st === 'locked', JSON.stringify(g5));
  await endSession();

  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
  const fails = res.filter((r) => !r).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
