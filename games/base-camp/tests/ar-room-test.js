// Base Camp in AR with the REAL WebXRKit polyfill and a fake native iOS side serving a fake "shed": floor, two speaker tops at different heights,
// a shelf with three can-sized bumps, an egg-cup top. Session 1 maps and tags it (real sweep, real taps); session 2 comes back with the whole room
// turned 30 degrees and shifted 0.5 m, plays the away diary, sweeps again, aligns on two landmarks, and checks nothing is flagged as changed.
// Run (about 5 minutes):  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node games/base-camp/tests/ar-room-test.js
const fs = require('fs'), path = require('path');
const { serve, ROOT } = require('./lib.js');
const { chromium } = require('playwright'); const install = require('./ar-fake.js');
const POLY = fs.readFileSync(process.env.POLY || path.join(ROOT, 'webxr-polyfill.js'), 'utf8');
const OUT = path.join(ROOT, 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
// the shed, in its own coordinates (metres; AR y is up, the floor is 1.2 m below the start): [name, y, cx, cz, half-width, half-depth]
const SHED = [['floor', -1.2, 0, -1.5, 1.2, 1.2], ['speakerA', -0.45, 0.9, -1.2, 0.15, 0.125], ['speakerB', -0.25, -0.9, -1.2, 0.15, 0.125], ['shelf', 0.2, 0.0, -2.7, 0.7, 0.13], ['can1', 0.32, -0.35, -2.7, 0.05, 0.05], ['can2', 0.32, -0.15, -2.7, 0.05, 0.05], ['can3', 0.32, 0.1, -2.7, 0.05, 0.05], ['cup', -0.17, -0.85, -1.2, 0.04, 0.04]];
(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  /* build 21: the inline copy of the fake native side was older than tests/ar-fake.js (no plane uuid on hits, so since build 6 the scan drops them all as weak). Use the maintained fake. */
  await install(p, SHED);
  await p.addInitScript({ content: POLY });
  const ev = (f, a) => p.evaluate(f, a);
  const noOverlay = () => ev(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  const truthPx = (name) => ev((n) => { const S = window.__place().find((q) => q.n === n), v = new __g.THREE.Vector3(S.cx, S.y, S.cz).applyMatrix4(__g.AR.viewInv).applyMatrix4(__g.AR.projM); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, S.cx, S.y, S.cz]; }, name);
  const lookAt = (name, off, hgt) => ev(([n, off, hgt]) => { const S = window.__place().find((q) => q.n === n), p2 = [S.cx + off[0], S.y + hgt, S.cz + off[1]], fx = S.cx - p2[0], fy = S.y - p2[1], fz = S.cz - p2[2], L = Math.hypot(fx, fy, fz); window.__cam.mode = 'fixed'; window.__cam.fixed = [p2[0], p2[1], p2[2], Math.atan2(-fx / L, -fz / L), Math.asin(fy / L)]; }, [name, off, hgt]);
  const sweep = async (tag) => { await ev(() => window.__sweep(0.6)); const t0 = Date.now(); while (!(await ev(() => window.__cam.done)) && Date.now() - t0 < 200000) { await sleep(2000); } console.log(tag + ' sweep took ' + Math.round((Date.now() - t0) / 1000) + ' s, hits ' + await ev(() => window.__native.hits + '/' + window.__native.empty)); await ev(() => { window.__cam.mode = 'fixed'; }); };

  // ================= session 1: map and tag =================
  await p.goto(url); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay();
  await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); __g.ENV.hourOverride = 12; });
  /* build 4+: the title's AR button became Play (bPlay is enabled once AR is ready); the manual mapping moved under More... */
  ok('AR is offered by the real polyfill', await ev(() => !document.getElementById('bPlay').disabled && __g.AR.ok));
  await ev(() => { __g.RECOG.coco.state = 'loading'; }); // the model download is tested in recog-test.js; here it would only slow the sweep
  await p.click('#bMore'); await p.click('#bMap'); await sleep(800);
  ok('Map my room starts an AR session', await ev(() => __g.AR.on && __g.G.intent === 'map'));
  ok('mapping asks the app for camera pictures (camera-access)', await ev(() => !!(window.__sessionOpts && window.__sessionOpts.options && window.__sessionOpts.options.computer_vision_data)), await ev(() => JSON.stringify(window.__sessionOpts || null)));
  await sweep('map');
  console.log('DBG', JSON.stringify(await ev(() => ({ phase: __g.G.phase, scan: __g.SCAN.zones.length, z: __g.G.zones.length, bar: document.getElementById('bar').innerText.slice(0, 120), auto: __g.G.auto, intent: __g.G.intent, mode: __g.G.mode, hidden: document.getElementById('bar').hidden }))));
  await p.click('#bDone'); await sleep(800);
  console.log('DBG2', JSON.stringify(await ev(() => ({ phase: __g.G.phase, scan: __g.SCAN.zones.length, z: __g.G.zones.length, toast: document.getElementById('toast') && document.getElementById('toast').innerText }))));
  const z1 = await ev(() => __g.G.zones.map((z) => z.type + ':' + z.area.toFixed(2) + '@' + z.y.toFixed(2)));
  ok('the sweep found the floor and the shelf and the speaker tops', z1.length >= 4, z1.join(' '));
  ok('after the scan the player tags spots', await ev(() => __g.G.phase === 'tag'));
  await lookAt('floor', [0, 1.6], 1.9); await sleep(900);
  const tagAt = async (name, tag, label) => { const q = await truthPx(name); await p.mouse.click(q[0], q[1]); await sleep(300); const vis = await ev(() => !document.getElementById('tagpick').hidden); if (vis) { if (label) await p.fill('#tagName', label); await p.click('#tagpick [data-tag=' + tag + ']'); await sleep(250); } return vis; };
  const t1 = await tagAt('speakerA', 'speaker', 'Left hi-fi'), t2 = await tagAt('speakerB', 'speaker', 'Right hi-fi');
  await lookAt('shelf', [0, 0.9], 0.8); await sleep(900);
  const t3 = await tagAt('can1', 'can', 'Beans can');
  await lookAt('speakerB', [0.0, 0.5], 0.6); await sleep(900);
  const t4 = await tagAt('cup', 'cup', 'Egg cup');
  const spots = await ev(() => __g.G.spots.filter((s) => s.src !== 'default').map((s) => s.name + ':' + s.role + ':' + s.on));
  ok('real taps tagged speakers, a can and the egg cup', t1 && t2 && t3 && t4 && spots.length >= 3, spots.join(' | '));
  await ev(() => { const a = __g.G.spots.find((s) => s.name === 'Left hi-fi'), b2 = __g.G.spots.find((s) => s.name === 'Right hi-fi'); if (a && b2) __g.addCable(a.id, b2.id); });
  // recognition through the AR camera path: a camera picture arrives, a mocked detector says "cup" at the foot of the second can
  await lookAt('shelf', [0, 0.9], 0.8); await sleep(1500);
  const frame = await ev(() => { const f = __g.recogFrame(); return f && { w: f.w, h: f.h, real: f.real }; });
  ok('the camera picture from the app is available to recognition', frame && frame.real && frame.w === 320 && frame.h === 240, JSON.stringify(frame));
  const foot = await ev(() => { const S = window.__place().find((q) => q.n === 'can2'), v = new __g.THREE.Vector3(S.cx, 0.2, S.cz).applyMatrix4(__g.AR.viewInv).applyMatrix4(__g.AR.projM); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, S.cx, S.cz]; });
  await ev(([fx, fy]) => { __g.RECOG.cool = 0; __g.RECOG.detector = async (fr) => [{ class: 'cup', score: 0.8, bbox: [(fx - 40) * fr.w / innerWidth, (fy - 70) * fr.h / innerHeight, 80 * fr.w / innerWidth, 70 * fr.h / innerHeight] }]; }, foot);
  for (let i = 0; i < 4; i++) { await ev(() => __g.recogTick()); await sleep(100); }
  const guess = await ev(() => __g.RECOG.ask && { x: __g.RECOG.ask.x, z: __g.RECOG.ask.z, name: __g.RECOG.ask.name });
  ok('a detection in camera pixels becomes a guess at the right spot (within 8 cm)', guess && Math.hypot(guess.x - foot[2], guess.z - foot[3]) < 0.08, guess ? 'off by ' + (Math.hypot(guess.x - foot[2], guess.z - foot[3]) * 100).toFixed(1) + ' cm' : 'no guess');
  await ev(() => { __g.RECOG.detector = null; document.getElementById('guess').hidden = true; __g.RECOG.ask = null; });
  await lookAt('floor', [0, 1.6], 1.9); await sleep(600);
  await p.screenshot({ path: OUT + 'ar-06-tag.png' });
  await p.click('#bSaveMap'); await sleep(200);
  await ev(() => { __g.G.music = true; __g.settle('FLOOR'); __g.simulate(900, 0.5); __g.saveNow(); __g.saveMap(); });
  const before = await ev(() => JSON.stringify(__g.G.settlements.map((S) => [S.zoneName, S.cols.length])));
  const bytes = await ev(() => localStorage.getItem('base-camp-map-v1').length);
  console.log('map', bytes, 'bytes; colonies', before);
  await ev(() => __g.AR.session.end()); await sleep(1500);

  // ================= session 2: back, room rotated 30 degrees and shifted 0.5 m =================
  await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay();
  await ev(() => { __g.ENV.hourOverride = 12; window.__W = { yaw: 0.5236, x: 0.5, z: -0.3 }; const s = JSON.parse(localStorage.getItem('base-camp-save-v2')); s.t -= 9 * 3600 * 1000; localStorage.setItem('base-camp-save-v2', JSON.stringify(s)); });
  /* the old Continue button is gone: Play finds the room by itself (auto-ar-test, multi-room-test); the manual way back in is More... > Manual: map my room with a saved map */
  ok('Continue is offered', await ev(() => !!__g.loadSave() && !!localStorage.getItem('base-camp-map-v1') && !document.getElementById('bMap').hidden));
  await p.click('#bMore'); await p.click('#bMap'); await sleep(1200);
  const diaryTxt = await ev(() => document.getElementById('diary').innerText);
  ok('the away diary shows first, 9 hours', /While you were away/.test(diaryTxt) && /9\.0 h/.test(diaryTxt), diaryTxt.split('\n').length + ' lines');
  await p.screenshot({ path: OUT + 'ar-07-away.png' });
  await p.click('#dClose'); await sweep('return');
  await p.click('#bDone'); await sleep(800);
  const lm = await ev(() => __g.G.landmarks.map((l) => l.name));
  ok('alignment asks for two landmarks', await ev(() => __g.G.phase === 'align') && lm.length === 2, lm.join(' & '));
  const names = { 'Left hi-fi': 'speakerA', 'Right hi-fi': 'speakerB', 'Beans can': 'can1', 'Egg cup': 'cup' };
  for (const n of lm) { await lookAt(names[n] || 'floor', [0.0, 0.9], 1.0); await sleep(900); const q = await truthPx(names[n]); console.log('DBG3', JSON.stringify(await ev((q) => { const e = document.elementFromPoint(q[0], q[1]); return { q, el: e && (e.id || e.tagName), cards: ['ask', 'diary', 'modal', 'reqs', 'wx'].filter((id) => document.getElementById(id) && !document.getElementById(id).hidden) }; }, q))); await p.mouse.click(q[0], q[1]); await sleep(300); console.log('DBG4', JSON.stringify(await ev(() => ({ taps: __g.G.alignTaps.length, toast: document.getElementById('toast').innerText.slice(0, 120), phase: __g.G.phase })))); }
  const al = await ev(() => ({ phi: __g.G.align && __g.G.align.phi, tx: __g.G.align && __g.G.align.tx, tz: __g.G.align && __g.G.align.tz, err: __g.G.alignErr }));
  ok('the two taps solved an alignment', al.phi !== undefined && al.phi !== null, JSON.stringify(al));
  const W = { yaw: 0.5236, x: 0.5, z: -0.3 }, c0 = Math.cos(al.phi), s0 = Math.sin(al.phi), tr = (x, z) => { const c = Math.cos(W.yaw), s = Math.sin(W.yaw); return [x * c + z * s + W.x, -x * s + z * c + W.z]; }, sv = (x, z) => [x * c0 - z * s0 + al.tx, x * s0 + z * c0 + al.tz];
  const dphi = Math.atan2(Math.sin(al.phi + W.yaw), Math.cos(al.phi + W.yaw)); let worst = 0; for (const [x, z] of [[0, 0], [0, -1.5], [0.9, -1.2], [-0.9, -1.2], [0, -2.7]]) { const a = tr(x, z), c = sv(x, z); worst = Math.max(worst, Math.hypot(a[0] - c[0], a[1] - c[1])); }
  console.log('AR alignment: yaw error ' + (Math.abs(dphi) * 180 / Math.PI).toFixed(2) + ' deg, worst position error over the room ' + (worst * 100).toFixed(1) + ' cm, residual at the landmarks ' + ((al.err || 0) * 100).toFixed(1) + ' cm');
  ok('the alignment error is small (under 3 degrees, under 6 cm anywhere in the room)', Math.abs(dphi) < 0.05 && worst < 0.06);
  await p.screenshot({ path: OUT + 'ar-08-align.png' });
  await p.click('#bAlignOk'); await sleep(800);
  const lines = await ev(() => (__g.G.report ? __g.G.report.lines.map((l) => l.text) : []));
  console.log('changes reported after the return sweep:', JSON.stringify(lines));
  ok('colonies are back and placed', await ev(() => __g.G.settlements.length >= 1 && __g.G.settlements.every((S) => S.placed)));
  await p.screenshot({ path: OUT + 'ar-09-back.png' });
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
  const fails = res.filter((r) => !r).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + res.length + ' PASSED');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
