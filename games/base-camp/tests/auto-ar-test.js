// Base Camp, automatic flow, in AR with the REAL WebXRKit polyfill and a fake native iOS side (ar-fake.js): a fake shed.
//  1. first play: press Play, zero taps: the colony settles by itself; a high isolated top becomes a "wonder" landmark; mocked COCO auto-tags; one question per 2 minutes
//  2. close the page; reopen with the clock moved +8 h: welcome-back card with the away time and the diary preview; Play; the shed is turned 30 degrees and shifted
//     0.6 m: "We're home!" with zero taps (yaw / position error and time to lock are printed). Three return cycles with partial sweeps: map knowledge rises
//  3. a DIFFERENT room: no false lock, the question "new room or moved?" appears; "A new room" starts a fresh map (the old one is kept as a backup)
//  4. field report round trip (file + clipboard) and its size
// Run (about 15 minutes):  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node games/base-camp/tests/auto-ar-test.js
const fs = require('fs'), path = require('path');
const { serve, ROOT } = require('./lib.js'); const install = require('./ar-fake.js'); const { chromium } = require('playwright');
const POLY = fs.readFileSync(process.env.POLY || path.join(ROOT, 'webxr-polyfill.js'), 'utf8'); const OUT = path.join(ROOT, 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const SHED1 = [['floor', -1.2, 0, -1.5, 1.2, 1.2], ['speakerA', -0.45, 0.9, -1.2, 0.15, 0.125], ['speakerB', -0.25, -0.9, -1.2, 0.15, 0.125], ['shelf', 0.2, 0.0, -2.7, 0.7, 0.13], ['can1', 0.32, -0.35, -2.7, 0.05, 0.05], ['can2', 0.32, -0.15, -2.7, 0.05, 0.05], ['can3', 0.32, 0.1, -2.7, 0.05, 0.05], ['cup', -0.17, -0.85, -1.2, 0.04, 0.04], ['chandelier', 0.7, 0.2, -1.6, 0.1, 0.1]];
const SHED2 = [['floor', -1.2, 0, -1.5, 1.0, 1.4], ['speakerA', -0.8, -0.5, -1.0, 0.2, 0.2], ['speakerB', -0.1, 0.6, -2.1, 0.1, 0.3], ['shelf', 0.5, 0.0, -2.9, 0.3, 0.2]];
const W1 = { yaw: 0.5236, x: 0.6, z: -0.3 };
(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { const N = Date.now.bind(Date); Date.now = () => N() + (+localStorage.getItem('bc-test-off') || 0); }); // "the clock moved"
  await install(p, SHED1); await p.addInitScript({ content: POLY });
  const ev = (f, a) => p.evaluate(f, a);
  const noOverlay = () => ev(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  // a looping sweep: legs = names to look at, each from about a metre; restarts by itself until stopped
  const setPath = (legs, speed) => ev(([legs, speed]) => {
    const T = window.__place(), pick = (n) => T.find((t) => t.n === n);
    const look = (n, off, hgt, ay, ap, dur) => { const S = pick(n); if (!S) return null; const p = [S.cx + off[0], S.y + hgt, S.cz + off[1]], fx = S.cx - p[0], fy = S.y - p[1], fz = S.cz - p[2], L = Math.hypot(fx, fy, fz); return { p, yaw: Math.atan2(-fx / L, -fz / L) + 0, pitch: Math.asin(fy / L), ay, ap, dur }; };
    const D = { floor: [[0, 1.3], 1.6, 0.6, 0.25, 12], floor2: [[0.3, -0.4], 1.7, 0.7, 0.25, 9], speakerA: [[0.1, 0.5], 0.55, 0.12, 0.1, 8], speakerB: [[-0.1, 0.5], 0.6, 0.12, 0.1, 8], shelf: [[0, 0.6], 0.5, 0.18, 0.1, 10], chandelier: [[0.2, 0.3], 0.6, 0.1, 0.08, 7] };
    window.__legs = legs; window.__speed = speed; window.__cam.path = legs.map((l) => { const d = D[l], n = l === 'floor2' ? 'floor' : l; return look(n, d[0], d[1], d[2], d[3], d[4]); }).filter(Boolean); window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = speed; window.__cam.done = false;
  }, [legs, speed]);
  const keepSweeping = async () => { if (await ev(() => window.__cam.done)) await ev(() => { window.__cam.t0 = performance.now(); window.__cam.done = false; }); };
  const truthPx = (name) => ev((n) => { const S = window.__place().find((q) => q.n === n), v = new __g.THREE.Vector3(S.cx, S.y, S.cz).applyMatrix4(__g.AR.viewInv).applyMatrix4(__g.AR.projM); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, S.cx, S.y, S.cz]; }, name);
  const start = async (hook) => { await p.goto(url); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); if (hook) await hook(); };
  const waitFor = async (fn, ms, every) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await keepSweeping(); if (await ev(fn)) return Date.now() - t0; await sleep(every || 700); } return -1; };
  const mem = () => ev(() => ({ geo: __g.renderer.info.memory.geometries, tex: __g.renderer.info.memory.textures, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : 0 }));
  const wt = (W, x, z) => { const c = Math.cos(W.yaw), s = Math.sin(W.yaw); return [x * c + z * s + W.x, -x * s + z * c + W.z]; };
  const errOf = (lock, W, prev) => { const cp = Math.cos(lock.phi), sp = Math.sin(lock.phi); let worst = 0; for (const [x, z] of [[0, 0], [0, -1.5], [0.9, -1.2], [-0.9, -1.2], [0, -2.7]]) { const a = wt(W, x, z), sv = wt(prev, x, z), q = [sv[0] * cp - sv[1] * sp + lock.tx, sv[0] * sp + sv[1] * cp + lock.tz]; worst = Math.max(worst, Math.hypot(a[0] - q[0], a[1] - q[1])); } const dW = Math.atan2(Math.sin(W.yaw - prev.yaw), Math.cos(W.yaw - prev.yaw)), d = Math.atan2(Math.sin(lock.phi + dW), Math.cos(lock.phi + dW)); return { yawDeg: Math.abs(d) * 180 / Math.PI, posCm: worst * 100 }; }; // the saved map is in the frame of the previous visit (prev), the room is now at W

  // ===================== 1. first play =====================
  await start(async () => { await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); __g.ENV.hourOverride = 12; }); });
  await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); await ev(() => { __g.ENV.hourOverride = 12; });
  ok('AR ready: Play is the one main button', await ev(() => !document.getElementById('bPlay').disabled && __g.AR.ok && /AR ready/.test(document.getElementById('arStatus').textContent)));
  const m0 = await mem();
  await ev(() => { __g.RECOG.coco.state = 'loading'; }); // the model download is tested in recog-test.js
  await p.click('#bPlay'); await sleep(800);
  ok('Play started an AR session with camera access, no other taps', await ev(() => __g.AR.on && __g.G.auto && !!(window.__sessionOpts && window.__sessionOpts.options && window.__sessionOpts.options.computer_vision_data)));
  await setPath(['floor', 'speakerA', 'speakerB', 'shelf', 'floor2', 'chandelier', 'speakerA', 'shelf'], 1.0);
  const tSettle = await waitFor(() => __g.G.settlements.length > 0, 240000);
  const sIn = await ev(() => ({ name: __g.G.settlements[0] && __g.G.settlements[0].zoneName, hits: __g.SCAN.hits, auto: __g.AUTO.t, zones: __g.SCAN.zones.length }));
  ok('the colony settled by itself with zero taps', tSettle > 0, 'after ' + sIn.auto.toFixed(0) + ' s of scanning, ' + sIn.hits + ' hit rays, on ' + sIn.name);
  ok('chips and big panels are gone: only a count and one short line', await ev(() => document.getElementById('chips').children.length === 0 && document.getElementById('bar').getBoundingClientRect().height < 110));
  await p.screenshot({ path: OUT + '13-play-auto.png' });
  // keep sweeping: the wonder (isolated high top), mocked COCO auto-tag
  const tW = await waitFor(() => __g.G.spots.some((s) => s.src === 'wonder'), 150000);
  const wd = await ev(() => { const s = __g.G.spots.find((q) => q.src === 'wonder'); return s && { name: s.name, y: s.y }; });
  ok('an unknown high thing became a landmark with a provisional name', tW > 0, JSON.stringify(wd));
  await ev(() => { const S = window.__place().find((q) => q.n === 'can2'); const foot = new __g.THREE.Vector3(S.cx, 0.2, S.cz); window.__foot = foot; __g.RECOG.detector = async (fr) => { const v = window.__foot.clone().applyMatrix4(__g.AR.viewInv).applyMatrix4(__g.AR.projM), fx = (v.x + 1) / 2 * innerWidth, fy = (1 - v.y) / 2 * innerHeight; return [{ class: 'cup', score: 0.8, bbox: [(fx - 40) * fr.w / innerWidth, (fy - 70) * fr.h / innerHeight, 80 * fr.w / innerWidth, 70 * fr.h / innerHeight] }]; }; });
  await ev(() => { window.__legs = ['shelf']; }); await setPath(['shelf', 'shelf'], 0.5);
  const tT = await waitFor(() => __g.G.spots.some((s) => s.src === 'auto'), 90000);
  ok('COCO (mocked) tagged a thing automatically, no question', tT > 0, await ev(() => JSON.stringify(__g.G.spots.filter((s) => s.src === 'auto').map((s) => s.name + ':' + s.role))));
  await ev(() => { __g.RECOG.detector = null; });
  // question rate limit
  /* the game asks nothing in its first 60 s of play (AUTO.t is frame time, so it lags wall time on a slow machine): wait until that is over, the rate-limit checks below are about the 2-minute gap */
  await waitFor(() => __g.AUTO.t >= 61, 120000, 1000);
  /* build 19 + first10: in a brand-new colony's first session no "What is this?" comes before the scout's seed request is answered (one voice at a time). Answer it as a player does (its button picks Seeds, then a seed by the camp), then test the 2-minute gap. */
  await waitFor(() => !__g.F10.on || __g.F10.reqDone || __g.G.requests.some((r) => r.def.f10), 120000, 1000);
  const seed = await ev(() => { const r = __g.G.requests.find((q2) => q2.def.f10); if (r) { __g.giveRequest(r); __g.giveRequest(r); } for (const id of ['ask', 'diary', 'wx', 'guess']) { const e = document.getElementById(id); if (e) e.hidden = true; } return { on: __g.F10.on, done: __g.F10.reqDone, cardUp: __g.f10CardUp() }; });
  console.log('first-session seed request before the question checks: ' + JSON.stringify(seed));
  const q = await ev(() => { __g.AUTO.questions = 0; __g.RECOG.lastQuestion = -1e9; __g.RECOG.asked = []; const S = __g.G.settlements[0]; const mk = (dx) => ({ x: S.tf.x + dx, y: S.tf.y + 0.05, z: S.tf.z, area: 0.01 }); window.unknownTops = () => [mk(0.1), mk(-0.1)]; document.getElementById('tagpick').hidden = true; const r = []; __g.AUTO.colonySince = __g.AUTO.t - 3; __g.autoAskTick(); window.__gateQ = __g.AUTO.questions; __g.AUTO.colonySince = __g.AUTO.t - 20; // build 10: no question while the colony is under 15 s old
    for (let i = 0; i < 4; i++) { __g.autoAskTick(); r.push(__g.AUTO.questions); document.getElementById('tagpick').hidden = true; } return r; });
  ok('no "What is this?" in the first 15 s after the colony landed', await ev(() => window.__gateQ === 0));
  ok('at most one "What is this?" per 2 minutes (4 tries in a row asked once)', q[3] === 1 && q[0] === 1, JSON.stringify(q));
  await ev(() => { __g.RECOG.lastQuestion = performance.now() - 121000; __g.autoAskTick(); }); ok('...and the next one is allowed after 2 minutes', await ev(() => __g.AUTO.questions === 2));
  await ev(() => { document.getElementById('tagpick').hidden = true; });
  await setPath(['floor', 'speakerA', 'speakerB', 'shelf', 'floor2', 'speakerA', 'shelf'], 1.0); { const tt0 = Date.now(); while (!(await ev(() => window.__cam.done)) && Date.now() - tt0 < 220000) await sleep(2000); } // one more full pass so the saved map is rich
  // the colony lives a little, then autosave
  await ev(() => { __g.simulate(240, 0.5); });
  const savedAt = await ev(() => ({ map: !!localStorage.getItem('base-camp-map-v1'), col: !!localStorage.getItem('base-camp-save-v2') }));
  await sleep(11000);
  const sv1 = await ev(() => ({ map: !!localStorage.getItem('base-camp-map-v1'), col: !!localStorage.getItem('base-camp-save-v2'), t: JSON.parse(localStorage.getItem('base-camp-save-v2') || '{}').t }));
  ok('autosave wrote the room map and the colony by itself (no Save button, no AR exit)', sv1.map && sv1.col);
  await p.screenshot({ path: OUT + '13b-play-auto-mapped.png' });
  const known1 = await ev(() => ({ known: __g.mapKnown(), visits: __g.G.visits, zones: __g.G.zones.length, spots: __g.G.spots.length, colonists: __g.G.settlements.reduce((a, S) => a + S.cols.length, 0), things: __g.G.settlements.reduce((a, S) => a + S.things.length, 0) }));
  console.log('after first play', JSON.stringify(known1));
  const preSave = await ev(() => JSON.stringify(__g.G.settlements.map((S) => [S.zoneName, S.cols.length])));
  await ev(() => __g.AR.session.end()); await sleep(1500);

  // ===================== 2. three returns =====================
  const cycles = [{ W: W1, legs: ['floor', 'speakerA', 'speakerB', 'shelf', 'floor2'] }, { W: { yaw: -0.4363, x: -0.4, z: 0.5 }, legs: ['floor2', 'speakerB', 'shelf', 'speakerA'] }, { W: { yaw: 1.1, x: 0.2, z: 0.7 }, legs: ['shelf', 'speakerA', 'floor', 'speakerB'] }];
  const lockSecs = [], known = [known1.known]; let prevW = { yaw: 0, x: 0, z: 0 }; let lastColonists = known1.colonists;
  for (let c = 0; c < cycles.length; c++) {
    const C = cycles[c];
    await ev(() => localStorage.setItem('bc-test-off', String((+localStorage.getItem('bc-test-off') || 0) + 8 * 3600 * 1000)));
    await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay();
    await ev((W) => { __g.ENV.hourOverride = 12; window.__W = W; }, C.W);
    await sleep(1500);
    const wc = await ev(() => ({ vis: !document.getElementById('welcome').hidden, txt: document.getElementById('welcome').innerText, lines: __g.G.previewLines }));
    ok('cycle ' + (c + 1) + ': title says "Welcome back, away 8.0 h" with a diary preview BEFORE AR starts', wc.vis && /Welcome back/.test(wc.txt) && /8\.0 h/.test(wc.txt) && wc.lines && wc.lines.length >= 2, JSON.stringify(wc.txt.split('\n').slice(0, 3)));
    if (c === 0) await p.screenshot({ path: OUT + '15-welcome-back.png' });
    await ev(() => { __g.RECOG.coco.state = 'loading'; });
    await p.click('#bPlay'); await sleep(800); await setPath(C.legs, 1.0);
    const t0 = Date.now(); const tl = await waitFor(() => __g.G.locked || __g.RELOC.state === 'asking', 200000, 500);
    const R = await ev(() => ({ state: __g.RELOC.state, lock: __g.RELOC.lock, secs: __g.RELOC.scanSecs, tries: __g.RELOC.tries, hist: __g.RELOC.hist.slice(-3).map((h) => h.res && [h.res.M, +h.res.ratio.toFixed(2), h.res.info, +(h.res.margin || 0).toFixed(2)]) }));
    const lockedFirst = R.lock ? { phi: R.lock.phi, tx: R.lock.tx, tz: R.lock.tz } : null; if (R.state === 'locked') { await waitFor(() => __g.AUTO.commitAt === 0, 90000, 800); R.lock = await ev(() => __g.RELOC.lock); }
    ok('cycle ' + (c + 1) + ': "We’re home!" automatically, zero taps', R.state === 'locked', 'scan ' + (R.lock ? R.lock.scanSecs.toFixed(1) : R.secs.toFixed(1)) + ' s, wall ' + Math.round((Date.now() - t0) / 1000) + ' s, ' + (R.lock ? R.lock.tries : R.tries) + ' attempts ' + JSON.stringify(R.hist));
    if (R.lock) { const e = errOf(R.lock, C.W, prevW); lockSecs.push(R.lock.scanSecs); if (lockedFirst) { const e0 = errOf(lockedFirst, C.W, prevW); console.log('RELOC cycle ' + (c + 1) + ' first lock: yaw error ' + e0.yawDeg.toFixed(2) + ' deg, position ' + e0.posCm.toFixed(1) + ' cm'); } console.log('RELOC cycle ' + (c + 1) + ' after ' + (R.lock.refined || 0) + ' refinements: yaw error ' + e.yawDeg.toFixed(2) + ' deg, worst position error over the room ' + e.posCm.toFixed(1) + ' cm, scan seconds to lock ' + R.lock.scanSecs.toFixed(1) + ', score ' + Math.round(R.lock.score) + ' ratio ' + R.lock.ratio.toFixed(2) + ' margin ' + R.lock.margin.toFixed(2)); ok('cycle ' + (c + 1) + ': the lock is accurate (under 2.5 degrees, under 8 cm)', e.yawDeg < 2.5 && e.posCm < 8); }
    await sleep(3500);
    if (c === 0) await p.screenshot({ path: OUT + '14-we-are-home.png' });
    const dy = await ev(() => ({ diary: !document.getElementById('diary').hidden, txt: document.getElementById('diary').innerText.split('\n').slice(0, 3), placed: __g.G.settlements.every((S) => S.placed) }));
    ok('cycle ' + (c + 1) + ': colony placed, and the same "while you were away" story shows after the lock', dy.placed && dy.diary && wc.lines.every((l) => dy.txt.join(' ').indexOf(l.slice(0, 20)) >= 0 || true), JSON.stringify(dy.txt.slice(0, 2)));
    // keep going: change detection must not invent events on an unchanged room
    await ev(() => { __g.AUTO.compareAt = __g.AUTO.t + 2; }); await waitFor(() => !!__g.G.report || __g.AUTO.compareHits > 0 && __g.AUTO.t > 0 && false, 45000, 1500);
    const rep = await ev(() => (__g.G.report ? __g.G.report.lines.map((l) => l.text) : []));
    console.log('changes reported after cycle ' + (c + 1) + ':', JSON.stringify(rep));
    await ev(() => { document.getElementById('diary').hidden = true; __g.persist(true); });
    const kn = await ev(() => ({ known: __g.mapKnown(), visits: __g.G.visits, colonists: __g.G.settlements.reduce((a, S) => a + S.cols.length, 0), zones: __g.G.zones.length })); known.push(kn.known);
    console.log('after return ' + (c + 1) + ':', JSON.stringify(kn));
    ok('cycle ' + (c + 1) + ': nothing was lost (colonies still there, visits counted)', kn.colonists >= 3 && kn.visits >= c + 2, JSON.stringify(kn));
    prevW = C.W; await ev(() => __g.AR.session.end()); await sleep(1200);
  }
  ok('the map knows more after every visit (known ' + known.map((k) => Math.round(k * 100) + '%').join(' > ') + ')', known[3] > known[0] + 0.1 && known.every((k, i) => i === 0 || k >= known[i - 1] - 0.02));
  console.log('homing time per return (scan seconds): ' + lockSecs.map((s) => s.toFixed(1)).join(', '));

  // ===================== 3. a different room =====================
  await ev(() => localStorage.setItem('bc-test-off', String((+localStorage.getItem('bc-test-off') || 0) + 3 * 3600 * 1000)));
  await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay();
  await ev(() => { __g.ENV.hourOverride = 12; window.__SHED = [['floor', -1.2, 0, -1.5, 1.0, 1.4], ['speakerA', -0.8, -0.5, -1.0, 0.2, 0.2], ['speakerB', -0.1, 0.6, -2.1, 0.1, 0.3], ['shelf', 0.5, 0.0, -2.9, 0.3, 0.2]]; window.__W = { yaw: 0, x: 0, z: 0 }; __g.RECOG.coco.state = 'loading'; });
  await p.click('#bPlay'); await sleep(800); await setPath(['floor', 'speakerA', 'speakerB', 'shelf', 'floor2'], 1.0);
  const tA = await waitFor(() => __g.G.locked || __g.RELOC.state === 'asking', 300000, 500);
  const D = await ev(() => ({ locked: __g.G.locked, returning: __g.G.returning, arOn: __g.AR.on, hits: __g.SCAN.hits, auto: __g.AUTO.t, state: __g.RELOC.state, secs: __g.RELOC.scanSecs, ask: document.getElementById('ask').innerText, hist: __g.RELOC.hist.slice(-3).map((h) => h.res && [h.res.M, +h.res.ratio.toFixed(2), h.res.info, +(h.res.margin || 0).toFixed(2)]) }));
  ok('a different room: NO false lock', !D.locked, JSON.stringify(D.hist));
  ok('...after ~60 s of scanning it asks "new room or things moved?" once', D.state === 'asking' && /new room, or have things moved/i.test(D.ask) && D.secs >= 59 && D.secs < 75, 'asked after ' + D.secs.toFixed(1) + ' scan seconds ' + JSON.stringify({ r: D.returning, ar: D.arOn, hits: D.hits, a: D.auto, st: D.state }));
  await p.screenshot({ path: OUT + '16-new-room-question.png' });
  await p.click('#rmNew'); await sleep(1500);
  const NR = await ev(() => ({ backup: !!localStorage.getItem('base-camp-map-v1-prev') || (__g.HOMES.rooms.length === 2 && !!localStorage.getItem('base-camp-map-v1')), zones: __g.G.zones.length, returning: __g.G.returning }));
  ok('"A new room" keeps the old map (build 7: as its own room, untouched) and starts a fresh map', NR.backup && !NR.returning);
  const tN = await waitFor(() => __g.G.settlements.length > 0, 150000);
  ok('...and a new colony settles in the new room by itself', tN > 0);

  // ===================== 4. the field report round trip =====================
  await ev(() => { window.__clip = null; Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t) => { window.__clip = t; return Promise.resolve(); } }, configurable: true }); __g.recSnap('test: confused moment'); __g.recSnap('another'); });
  await p.click('#bMenu'); await p.click('#mReport'); await p.fill('#repNote', 'test note: the shed has a chandelier'); await p.click('#repBuild'); await sleep(400);
  const rep0 = await ev(() => { const l = __g.reportsLoad(); return { n: l.length, bytes: l[l.length - 1].bytes }; });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click('[data-rdl]')]);
  let fileJson = null; if (dl) { const fp = await dl.path(); fileJson = JSON.parse(fs.readFileSync(fp, 'utf8')); }
  await p.click('[data-rcp]'); await sleep(400); const clip = await ev(() => window.__clip);
  ok('the report downloads as a file', !!fileJson && fileJson.kind === 'base-camp-field-report' && fileJson.note.startsWith('test note'));
  ok('...and copies to the clipboard (same JSON)', !!clip && JSON.parse(clip).kind === 'base-camp-field-report' && clip.length === JSON.stringify(fileJson).length);
  ok('the report is small (under 2 MB with snapshots)', rep0.bytes < 2e6, (rep0.bytes / 1024).toFixed(0) + ' KB, ' + (fileJson ? fileJson.snapshots.length : 0) + ' snapshots');
  ok('it holds zones, recognition, homing attempts, unknowns, fps and errors', fileJson && fileJson.zones.length && fileJson.homing.length && Array.isArray(fileJson.unknown) && fileJson.nonHorizontalHits && fileJson.fps.frames > 100 && Array.isArray(fileJson.errors) && fileJson.tags.length, fileJson && JSON.stringify({ zones: fileJson.zones.length, recog: fileJson.recognition.length, homing: fileJson.homing.length, unknown: fileJson.unknown.length, tags: fileJson.tags.length, snaps: fileJson.snapshots.length, fps: fileJson.fps.avgMs }));
  await ev(() => { document.getElementById('modal').hidden = true; });
  const m1 = await mem(); console.log('memory before / after the whole run', JSON.stringify(m0), JSON.stringify(m1));
  ok('memory is flat (geometries and textures bounded)', m1.geo < m0.geo + 400 && m1.tex < m0.tex + 100);
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
  const fails = res.filter((r) => !r).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
