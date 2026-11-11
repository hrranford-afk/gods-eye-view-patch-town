// Base Camp build 7, MULTI-ROOM in AR (real WebXRKit polyfill + fake native side, ar-fake.js): a fake SHED, a fake KITCHEN and a third unknown room.
//  (a) map the shed, then "+ New room" -> map the kitchen (the shed's saved bytes do not change)
//  (b) Play in the (turned, shifted) kitchen: the game works out the room silently, no false Shed lock, no percentages on screen
//  (c) Play in the (turned, shifted) shed: identified as the Shed
//  (d) Continue on the Shed's row: homes within that room only
//  (e) a third unknown room: one small prompt "New room?" after ~45 s of scanning ("It's..." goes to the two-tap alignment); "Yes" makes Room 3 and the colony settles by itself
//  (f) migration from single-room saves (build 5 / 6 / 6b shape: current keys + '-prev' backups); delete is two-tap and keeps nothing
//  (g) reload persistence, memory flat, 0 page errors.   Identification time and accuracy are printed.
// Run (about 25 minutes):  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node games/base-camp/tests/multi-room-test.js
const fs = require('fs'), path = require('path');
const { serve, ROOT } = require('./lib.js'); const install = require('./ar-fake.js'); const { chromium } = require('playwright');
const POLY = fs.readFileSync(process.env.POLY || path.join(ROOT, 'webxr-polyfill.js'), 'utf8'); const OUT = path.join(ROOT, 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const SHED = [['floor', -1.2, 0, -1.5, 1.2, 1.2], ['speakerA', -0.45, 0.9, -1.2, 0.15, 0.125], ['speakerB', -0.25, -0.9, -1.2, 0.15, 0.125], ['shelf', 0.2, 0.0, -2.7, 0.7, 0.13], ['can1', 0.32, -0.35, -2.7, 0.05, 0.05], ['can2', 0.32, -0.15, -2.7, 0.05, 0.05], ['can3', 0.32, 0.1, -2.7, 0.05, 0.05], ['cup', -0.17, -0.85, -1.2, 0.04, 0.04], ['chandelier', 0.7, 0.2, -1.6, 0.1, 0.1]];
const KITCHEN = [['floor', -1.2, 0, -1.8, 1.3, 1.1], ['counter', -0.3, -0.2, -3.0, 0.95, 0.3], ['island', -0.4, 0.55, -1.5, 0.35, 0.3], ['stool', -0.75, -0.85, -1.3, 0.13, 0.13], ['bin', -0.9, 0.95, -2.4, 0.14, 0.14], ['rack', 0.0, -0.9, -2.3, 0.2, 0.12]];
const THIRD = [['floor', -1.2, 0, -1.5, 0.8, 1.6], ['desk', -0.55, 0.3, -2.8, 0.5, 0.25], ['crate', -0.9, -0.5, -1.0, 0.2, 0.2], ['ledge', -0.2, -0.45, -2.9, 0.3, 0.1]];
const PTS = { shed: [[0, 0], [0, -1.5], [0.9, -1.2], [-0.9, -1.2], [0, -2.7]], kitchen: [[0, -1.8], [0.55, -1.5], [-0.85, -1.3], [-0.2, -3.0], [0.95, -2.4]] };
const W_SHED = { yaw: 0.5236, x: 0.6, z: -0.3 }, W_KIT = { yaw: -0.5, x: -0.4, z: 0.5 }, W_SHED2 = { yaw: -0.3, x: 0.2, z: 0.4 };
(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { const N = Date.now.bind(Date); Date.now = () => N() + (+localStorage.getItem('bc-test-off') || 0); });
  await install(p, SHED); await p.addInitScript({ content: POLY });
  const ev = (f, a) => p.evaluate(f, a);
  const noOverlay = () => ev(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  // a looping sweep over named things of the current fake room (floor from 1.6 m, the rest from about half a metre)
  const setPath = (legs, speed) => ev(([legs, speed]) => {
    const T = window.__place(), pick = (n) => T.find((t) => t.n === n);
    const look = (n, off, hgt, ay, ap, dur) => { const S = pick(n); if (!S) return null; const q = [S.cx + off[0], S.y + hgt, S.cz + off[1]], fx = S.cx - q[0], fy = S.y - q[1], fz = S.cz - q[2], L = Math.hypot(fx, fy, fz); return { p: q, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay, ap, dur }; };
    window.__cam.path = legs.map((l) => { const f = l === 'floor' || l === 'floor2', n = l === 'floor2' ? 'floor' : l, S = pick(n); if (!S) return null; return f ? look(n, l === 'floor' ? [0, 1.3] : [0.3, -0.4], l === 'floor' ? 1.6 : 1.7, l === 'floor' ? 0.6 : 0.7, 0.25, l === 'floor' ? 12 : 9) : look(n, [0.1, S.hd + 0.35], 0.55, 0.12, 0.1, 8); }).filter(Boolean);
    window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = speed; window.__cam.done = false;
  }, [legs, speed]);
  const keepSweeping = async () => { if (await ev(() => window.__cam.done)) await ev(() => { window.__cam.t0 = performance.now(); window.__cam.done = false; }); };
  const waitFor = async (fn, ms, every, spy) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await keepSweeping(); if (spy) spy.push(await ev(() => ({ hint: document.getElementById('hint').hidden ? '' : document.getElementById('hint').innerText, dot: !document.getElementById('idDot').hidden, nroom: !document.getElementById('nroom').hidden, ask: !document.getElementById('ask').hidden, modal: !document.getElementById('modal').hidden }))); if (await ev(fn)) return Date.now() - t0; await sleep(every || 700); } return -1; };
  const mem = () => ev(() => ({ geo: __g.renderer.info.memory.geometries, tex: __g.renderer.info.memory.textures, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : 0 }));
  const wt = (W, x, z) => { const c = Math.cos(W.yaw), s = Math.sin(W.yaw); return [x * c + z * s + W.x, -x * s + z * c + W.z]; };
  const errOf = (lock, W, prev, pts) => { const cp = Math.cos(lock.phi), sp = Math.sin(lock.phi); let worst = 0; for (const [x, z] of pts) { const a = wt(W, x, z), sv = wt(prev, x, z), q = [sv[0] * cp - sv[1] * sp + lock.tx, sv[0] * sp + sv[1] * cp + lock.tz]; worst = Math.max(worst, Math.hypot(a[0] - q[0], a[1] - q[1])); } const dW = Math.atan2(Math.sin(W.yaw - prev.yaw), Math.cos(W.yaw - prev.yaw)), d = Math.atan2(Math.sin(lock.phi + dW), Math.cos(lock.phi + dW)); return { yawDeg: Math.abs(d) * 180 / Math.PI, posCm: worst * 100 }; };
  const boot = async (room, W) => { await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); await ev(([room, W]) => { __g.ENV.hourOverride = 12; window.__SHED = room; window.__W = W; __g.RECOG.coco.state = 'loading'; }, [room, W]); await sleep(800); };
  const rows = () => ev(() => [...document.querySelectorAll('#rooms .lib')].map((r) => ({ id: r.dataset.id, name: (r.querySelector('b') || r.querySelector('input') || {}).textContent || (r.querySelector('input') || {}).value, sub: r.querySelector('.sub').textContent })));
  const rename = async (id, name) => { await p.click('#rooms .lib[data-id="' + id + '"] [data-act="ren"]'); await p.fill('#rooms .lib[data-id="' + id + '"] input.rn', name); await p.press('#rooms .lib[data-id="' + id + '"] input.rn', 'Enter'); await sleep(300); };
  const mapPasses = async (legs, passes) => { for (let i = 0; i < passes; i++) { await setPath(legs, 1.0); const t0 = Date.now(); while (!(await ev(() => window.__cam.done)) && Date.now() - t0 < 200000) await sleep(1500); } };
  const finishSession = async () => { await ev(() => { __g.simulate(120, 0.5); __g.persist(true); }); await sleep(500); await ev(() => __g.AR.session.end()); await sleep(1500); };
  const idTrial = async (name, room, W, prevW, pts, legs, wantId, wantName) => {
    await boot(room, W); const before = await ev(() => ({ n: __g.HOMES.rooms.length })); await p.click('#bPlay'); await sleep(800); await setPath(legs, 1.0); const spy = [];
    const t0 = Date.now(); const tl = await waitFor(() => __g.G.locked, 240000, 400, spy);
    const R = await ev(() => ({ cur: __g.HOMES.cur, name: __g.G.mapName, lock: __g.RELOC.lock, finding: __g.G.finding, locked: __g.G.locked }));
    const bad = spy.filter((s) => /Looking|%|\d+ s\)/.test(s.hint) || s.ask || s.modal); const dots = spy.filter((s) => s.dot).length;
    ok(name + ': identified ' + wantName + ' by itself, zero taps', tl > 0 && R.cur === wantId && R.name === wantName, 'room ' + R.cur + ' "' + R.name + '", scan ' + (R.lock ? R.lock.scanSecs.toFixed(1) : '?') + ' s, wall ' + Math.round((Date.now() - t0) / 1000) + ' s');
    ok(name + ': the screen stayed clean while identifying (no text, no percentages, no modal; just the dot)', bad.length === 0 && dots > 0, 'samples ' + spy.length + ', dot on ' + dots + ', bad ' + JSON.stringify(bad.slice(0, 2)));
    let e = null; if (R.lock) { await waitFor(() => __g.AUTO.commitAt === 0, 90000, 800); const L2 = await ev(() => __g.RELOC.lock); e = errOf(L2, W, prevW, pts); ok(name + ': the lock is accurate (under 2.5 degrees, under 8 cm)', e.yawDeg < 2.5 && e.posCm < 8, e.yawDeg.toFixed(2) + ' deg, ' + e.posCm.toFixed(1) + ' cm'); }
    return { tl, R, e, secs: R.lock ? R.lock.scanSecs : null, wall: tl };
  };

  // ===================== (a) map the shed, then a new room and map the kitchen =====================
  await p.goto(url); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay();
  await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await boot(SHED, { yaw: 0, x: 0, z: 0 });
  ok('AR ready; build 7 or later; a fresh start has no rooms list', await ev(() => !document.getElementById('bPlay').disabled && /^build ([7-9]|\d\d)/.test(__g.BUILD) && document.getElementById('rooms').hidden && __g.MULTI_ROOM === true && __g.HOMES.rooms.length === 1));
  ok('the main button just says Play (no "find my room")', await ev(() => document.getElementById('bPlay').textContent.trim() === 'Play'));
  const m0 = await mem();
  await p.click('#bPlay'); await sleep(800); await setPath(['floor', 'speakerA', 'speakerB', 'shelf', 'floor2', 'chandelier'], 1.0);
  const tS = await waitFor(() => __g.G.settlements.length > 0, 240000);
  ok('shed: the colony settled by itself', tS > 0);
  await mapPasses(['floor', 'speakerA', 'speakerB', 'shelf', 'floor2', 'speakerA', 'shelf'], 2);
  await finishSession();
  const shedKeys = await ev(() => ({ map: localStorage.getItem('base-camp-map-v1'), save: localStorage.getItem('base-camp-save-v2'), n: __g.HOMES.rooms.length }));
  ok('shed saved under the first room keys', !!shedKeys.map && !!shedKeys.save && shedKeys.n === 1, 'map ' + (shedKeys.map || '').length + ' chars, save ' + (shedKeys.save || '').length);
  await ev(() => localStorage.setItem('bc-test-off', String(2 * 3600 * 1000 + 600000))); // two hours later
  await boot(KITCHEN, { yaw: 0, x: 0, z: 0 });
  let R0 = await rows(); console.log('rows', JSON.stringify(R0));
  ok('title: one row "Room 1 · N colonists · last visit 2 h ago · map NN%" with Continue and + New room', R0.length === 1 && /\d+ colonists? · last visit 2 h ago · map \d+%/.test(R0[0].sub) && await ev(() => !!document.querySelector('#rooms [data-act="go"]') && !!document.getElementById('rNew')), JSON.stringify(R0[0]));
  await rename('r1', 'The Shed'); R0 = await rows();
  ok('rename works with an inline text field, no prompt() (name shows in the list and survives a reload)', R0[0].name === 'The Shed' && await ev(() => __g.HOMES.rooms[0].name === 'The Shed'));
  await p.screenshot({ path: OUT + '18-rooms-title.png' });
  await p.click('#rNew'); await sleep(1800);
  ok('+ New room starts AR scanning a fresh room (Room 2)', await ev(() => __g.AR.on && __g.G.auto && !__g.G.returning && __g.HOMES.rooms.length === 2 && __g.HOMES.cur === 'r2' && __g.G.mapName === 'Room 2'));
  await setPath(['floor', 'island', 'counter', 'stool', 'bin', 'rack', 'floor2'], 1.0);
  const tK = await waitFor(() => __g.G.settlements.length > 0, 240000);
  ok('kitchen: the colony settled by itself', tK > 0);
  await mapPasses(['floor', 'island', 'counter', 'stool', 'bin', 'rack', 'floor2', 'island', 'counter'], 2);
  await finishSession();
  const shedAfter = await ev(() => ({ map: localStorage.getItem('base-camp-map-v1'), save: localStorage.getItem('base-camp-save-v2') }));
  ok('(a) the shed room was not touched by the new room (same saved bytes)', shedAfter.map === shedKeys.map && shedAfter.save === shedKeys.save);
  ok('(a) the kitchen is its own room with its own keys', await ev(() => !!localStorage.getItem('base-camp-map-v1.r2') && !!localStorage.getItem('base-camp-save-v2.r2')));
  await boot(KITCHEN, { yaw: 0, x: 0, z: 0 }); await rename('r2', 'Kitchen'); R0 = await rows();
  console.log('rows', JSON.stringify(R0)); ok('title lists both rooms, most recent first', R0.length === 2 && R0[0].name === 'Kitchen' && R0[1].name === 'The Shed');
  const store1 = await ev(() => ({ info: document.getElementById('storeInfo').textContent, total: __g.storeChars(), r1: __g.roomChars('r1'), r2: __g.roomChars('r2') }));
  console.log('storage', JSON.stringify(store1)); ok('the menu reports the storage used across rooms', /Storage: \d+ KB of about 5000 KB used/.test(store1.info) && store1.total > store1.r1 + store1.r2 - 1, store1.info);

  // ===================== (c) Play in the shed (the kitchen was used last, so it loads first and must be switched away from) =====================
  await ev(() => { localStorage.setItem('bc-test-off', String((+localStorage.getItem('bc-test-off') || 0) + 3 * 3600 * 1000)); });
  const tc = await idTrial('(c) Play in the shed', SHED, W_SHED, { yaw: 0, x: 0, z: 0 }, PTS.shed, ['floor', 'speakerA', 'speakerB', 'shelf', 'floor2'], 'r1', 'The Shed');
  const shedVisits = await ev(() => __g.HOMES.rooms.find((r) => r.id === 'r1').visits);
  await finishSession();
  // ===================== (b) Play in the kitchen (the shed was used last now) =====================
  await ev(() => { localStorage.setItem('bc-test-off', String((+localStorage.getItem('bc-test-off') || 0) + 1 * 3600 * 1000)); });
  const shedBefore = await ev(() => localStorage.getItem('base-camp-save-v2'));
  const tb = await idTrial('(b) Play in the kitchen', KITCHEN, W_KIT, { yaw: 0, x: 0, z: 0 }, PTS.kitchen, ['floor', 'island', 'counter', 'stool', 'bin', 'floor2', 'rack'], 'r2', 'Kitchen');
  const shedKept = await ev(() => localStorage.getItem('base-camp-save-v2'));
  ok('(b) no false Shed lock: the shed colony was not loaded as the live room or re-saved', shedKept === shedBefore);
  await finishSession();
  // identification once more in each room, other order: accuracy over four trials
  const td = await idTrial('(c2) Play in the shed again', SHED, W_SHED2, W_SHED, PTS.shed, ['shelf', 'speakerA', 'floor', 'speakerB'], 'r1', 'The Shed');
  await finishSession();

  // ===================== (d) Continue on the Shed's row =====================
  await boot(SHED, W_SHED);
  const tD0 = Date.now(); await p.click('#rooms .lib[data-id="r1"] [data-act="go"]'); await sleep(800); await setPath(['floor', 'speakerA', 'speakerB', 'shelf', 'floor2'], 1.0);
  const fin = await ev(() => __g.G.finding); const spyD = [];
  const tdl = await waitFor(() => __g.G.locked, 200000, 400, spyD);
  const RD = await ev(() => ({ cur: __g.HOMES.cur, lock: __g.RELOC.lock, pre: Object.keys(__g.ROOMPRE()).length }));
  ok('(d) Continue on the Shed: homes within that room only (no room comparison), silent', tdl > 0 && RD.cur === 'r1' && !fin && RD.pre === 0 && !spyD.some((s) => /Looking|%/.test(s.hint)), 'scan ' + (RD.lock ? RD.lock.scanSecs.toFixed(1) : '?') + ' s, wall ' + Math.round((Date.now() - tD0) / 1000) + ' s');
  await waitFor(() => __g.AUTO.commitAt === 0, 90000, 800); await finishSession();

  // ===================== (e) a third, unknown room =====================
  if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, JSON.stringify(await ev(() => Object.assign({}, localStorage))));
  const shedBeforeE = await ev(() => ({ m: localStorage.getItem('base-camp-map-v1'), s: localStorage.getItem('base-camp-save-v2') }));
  await boot(THIRD, { yaw: 0.3, x: 0.2, z: -0.2 });
  await p.click('#bPlay'); await sleep(800); await setPath(['floor', 'desk', 'crate', 'ledge', 'floor2'], 1.0);
  const spyE = []; const tE = await waitFor(() => !document.getElementById('nroom').hidden || __g.G.locked, 200000, 500, spyE);
  const E = await ev(() => ({ locked: __g.G.locked, secs: __g.RELOC.scanSecs, txt: document.getElementById('nroom').innerText, ask: !document.getElementById('ask').hidden, modal: !document.getElementById('modal').hidden, state: __g.RELOC.state, nroomH: document.getElementById('nroom').getBoundingClientRect().height, bar: __g.G.phase }));
  if (E.locked) console.log('FALSE LOCK DEBUG', JSON.stringify(await ev(() => ({ cur: __g.HOMES.cur, lock: __g.RELOC.lock, tried: __g.RELOC.tried, rp: __g.RELOC.rp, hist: __g.RELOC.hist.slice(-9).map((h) => ({ room: h.room, ok: h.ok, t: +h.t.toFixed(1), M: h.res && h.res.M, X: h.res && h.res.X, ratio: h.res && +h.res.ratio.toFixed(2), info: h.res && h.res.info, infoX: h.res && h.res.infoX, ov: h.res && +(h.res.overlap || 0).toFixed(2), margin: h.res && +(h.res.margin || 0).toFixed(2), score: h.res && Math.round(h.res.score) })) }))));
  ok('(e) unknown room: no false lock', !E.locked);
  ok('(e) after ~45 s of scanning ONE small prompt "New room?" (not a modal wall; the other prompts stay hidden)', tE > 0 && /New room\?/.test(E.txt) && /Yes/.test(E.txt) && /It.s/.test(E.txt) && E.secs >= 44 && E.secs < 60 && !E.ask && !E.modal && E.state === 'search' && E.nroomH < 120, JSON.stringify({ secs: +E.secs.toFixed(1), h: E.nroomH, txt: E.txt }));
  await p.screenshot({ path: OUT + '19-new-room-prompt.png' });
  await p.click('#nrIts'); await sleep(300);
  ok('(e) "It’s…" lists the saved rooms', await ev(() => [...document.querySelectorAll('#nroom [data-room]')].map((b) => b.textContent).sort().join('|') === 'Kitchen|The Shed'));
  await p.click('#nroom [data-room="r1"]'); await sleep(1200);
  const itsShed = await ev(() => ({ cur: __g.HOMES.cur, phase: __g.G.phase, state: __g.RELOC.state, hidden: document.getElementById('nroom').hidden, zones: __g.G.zones.length }));
  ok('(e) choosing "It’s The Shed" loads the Shed and starts the two-tap alignment', itsShed.cur === 'r1' && itsShed.phase === 'align' && itsShed.hidden && itsShed.zones > 0, JSON.stringify(itsShed));
  await ev(() => __g.AR.session.end()); await sleep(1500);
  const shedSame = await ev(() => localStorage.getItem('base-camp-save-v2')); // nothing is saved while a room is only being aligned
  await boot(THIRD, { yaw: 0.3, x: 0.2, z: -0.2 });
  await p.click('#bPlay'); await sleep(800); await setPath(['floor', 'desk', 'crate', 'ledge', 'floor2'], 1.0);
  await waitFor(() => !document.getElementById('nroom').hidden || __g.G.locked, 200000, 500);
  await p.click('#nrYes'); await sleep(1200);
  const Y = await ev(() => ({ cur: __g.HOMES.cur, name: __g.G.mapName, n: __g.HOMES.rooms.length, hidden: document.getElementById('nroom').hidden, returning: __g.G.returning }));
  ok('(e) "Yes" creates Room 3 and the old rooms stay as they are', Y.cur === 'r3' && Y.name === 'Room 3' && Y.n === 3 && Y.hidden && !Y.returning, JSON.stringify(Y));
  const tY = await waitFor(() => __g.G.settlements.length > 0, 240000);
  ok('(e) the colony auto-settles in Room 3', tY > 0);
  await mapPasses(['floor', 'desk', 'crate', 'ledge', 'floor2'], 1); await finishSession();
  const shedAfterE = await ev(() => ({ m: localStorage.getItem('base-camp-map-v1'), s: localStorage.getItem('base-camp-save-v2'), r3: !!localStorage.getItem('base-camp-map-v1.r3') }));
  ok('(e) the Shed map and colony are byte-for-byte untouched; Room 3 has its own keys', shedAfterE.m === shedBeforeE.m && shedAfterE.s === shedBeforeE.s && shedAfterE.r3);

  // ===================== (f) migration from single-room saves =====================
  const snap = await ev(() => { const o = {}; for (const id of ['r1', 'r2', 'r3']) { const k = __g.HOMES.rooms.find((r) => r.id === id); o[id] = { map: localStorage.getItem(id === 'r1' ? 'base-camp-map-v1' : 'base-camp-map-v1.' + id), save: localStorage.getItem(id === 'r1' ? 'base-camp-save-v2' : 'base-camp-save-v2.' + id) }; } return o; });
  await ev((s) => { // a build 5 / 6 / 6b single-room save: current keys hold the kitchen, the "-prev" backup holds the shed, the damaged-write backup slot exists too, no registry at all
    const old = (str) => { const d = JSON.parse(str); d.name = 'My room'; d.build = 'build 6b'; return JSON.stringify(d); };
    for (const k of Object.keys(localStorage)) if (/^base-camp-(map|save)/.test(k) || k === 'bc-rooms-v1') localStorage.removeItem(k);
    localStorage.setItem('base-camp-map-v1', old(s.r2.map)); localStorage.setItem('base-camp-save-v2', s.r2.save); localStorage.setItem('base-camp-map-v1-bak', old(s.r2.map));
    localStorage.setItem('base-camp-map-v1-prev', old(s.r1.map)); localStorage.setItem('base-camp-save-v2-prev', s.r1.save);
  }, snap);
  await boot(SHED, W_SHED);
  const M = await ev(() => ({ rooms: __g.HOMES.rooms.map((r) => [r.id, r.name]), prev: [localStorage.getItem('base-camp-map-v1-prev'), localStorage.getItem('base-camp-save-v2-prev')], r2map: localStorage.getItem('base-camp-map-v1.r2') && JSON.parse(localStorage.getItem('base-camp-map-v1.r2')).zones.length, r2save: localStorage.getItem('base-camp-save-v2.r2') === null ? null : localStorage.getItem('base-camp-save-v2.r2').length, cur: __g.HOMES.cur }));
  console.log('migrated', JSON.stringify(M));
  ok('(f) migration: the current save is "Room 1", the -prev backup is "Room 2 (earlier)", the -prev keys are gone, no data lost', JSON.stringify(M.rooms) === JSON.stringify([['r1', 'Room 1'], ['r2', 'Room 2 (earlier)']]) && M.prev[0] === null && M.prev[1] === null && M.r2map > 0 && M.r2save === snap.r1.save.length && await ev(([a]) => JSON.parse(localStorage.getItem('base-camp-save-v2')).settlements.length > 0 && localStorage.getItem('base-camp-save-v2') === a, [snap.r2.save]));
  R0 = await rows(); console.log('rows', JSON.stringify(R0));
  ok('(f) both migrated rooms show in the list with their colonists and map numbers', R0.length === 2 && R0.every((r) => /colonist/.test(r.sub) && /map \d+%/.test(r.sub)), JSON.stringify(R0.map((r) => r.sub)));
  // the migrated rooms really play: Play recognises the (old) shed saved under Room 2 (earlier)
  const tf = await idTrial('(f) migrated rooms: Play in the shed', SHED, { yaw: 0.9, x: -0.3, z: 0.2 }, W_SHED, PTS.shed, ['floor', 'speakerA', 'speakerB', 'shelf', 'floor2'], 'r2', 'Room 2 (earlier)');
  await finishSession();
  // delete: two taps, keeps nothing
  await boot(SHED, W_SHED);
  await p.click('#rooms .lib[data-id="r2"] [data-act="del"]'); await sleep(200);
  const del1 = await ev(() => ({ n: __g.HOMES.rooms.length, txt: document.querySelector('#rooms .lib[data-id="r2"] [data-act="del"]').textContent }));
  ok('delete needs a second tap and says nothing is kept', del1.n === 2 && /Nothing is kept/.test(del1.txt), del1.txt);
  await p.click('#rooms .lib[data-id="r2"] [data-act="del"]'); await sleep(300);
  const del2 = await ev(() => ({ n: __g.HOMES.rooms.length, left: Object.keys(localStorage).filter((k) => /\.r2/.test(k)), r1: !!localStorage.getItem('base-camp-save-v2') }));
  ok('second tap deletes the room: its map, colony and backups are all gone; the other room stays', del2.n === 1 && del2.left.length === 0 && del2.r1, JSON.stringify(del2));
  await ev(() => { localStorage.setItem('bc-test-off', String((+localStorage.getItem('bc-test-off') || 0) + 1000)); });

  // ===================== (g) reload persistence, memory, errors =====================
  await p.reload(); await sleep(2500);
  const after = await ev(() => ({ n: __g.HOMES.rooms.length, rows: document.querySelectorAll('#rooms .lib').length }));
  ok('(g) the rooms registry survives a reload', after.n === 1 && after.rows === 1);
  const m1 = await mem(); console.log('memory before / after the whole run', JSON.stringify(m0), JSON.stringify(m1));
  ok('(g) memory is flat (geometries and textures bounded)', m1.geo < m0.geo + 500 && m1.tex < m0.tex + 120);
  ok('(g) 0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
  const t = [tc, tb, td, tf].filter((x) => x.secs !== null);
  console.log('IDENTIFICATION: ' + t.length + '/4 trials right; scan seconds to lock ' + t.map((x) => x.secs.toFixed(1)).join(', ') + '; wall seconds ' + t.map((x) => Math.round(x.wall / 1000)).join(', ') + '; errors ' + t.map((x) => x.e ? x.e.yawDeg.toFixed(2) + 'deg/' + x.e.posCm.toFixed(1) + 'cm' : '?').join(', ') + '; continue-in-room scan seconds ' + (RD.lock ? RD.lock.scanSecs.toFixed(1) : '?'));
  const fails = res.filter((r) => !r).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
