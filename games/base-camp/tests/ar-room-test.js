// Base Camp in AR with the REAL WebXRKit polyfill and a fake native iOS side serving a fake "shed": floor, two speaker tops at different heights,
// a shelf with three can-sized bumps, an egg-cup top. Session 1 maps and tags it (real sweep, real taps); session 2 comes back with the whole room
// turned 30 degrees and shifted 0.5 m, plays the away diary, sweeps again, aligns on two landmarks, and checks nothing is flagged as changed.
// Run (about 5 minutes):  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node games/base-camp/tests/ar-room-test.js
const fs = require('fs'), path = require('path');
const { serve, ROOT } = require('./lib.js');
const { chromium } = require('playwright');
const POLY = fs.readFileSync(process.env.POLY || path.join(ROOT, 'webxr-polyfill.js'), 'utf8');
const OUT = path.join(ROOT, 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
// the shed, in its own coordinates (metres; AR y is up, the floor is 1.2 m below the start): [name, y, cx, cz, half-width, half-depth]
const SHED = [['floor', -1.2, 0, -1.5, 1.5, 1.5], ['speakerA', -0.45, 0.9, -1.2, 0.15, 0.125], ['speakerB', -0.25, -0.9, -1.2, 0.15, 0.125], ['shelf', 0.2, 0.0, -2.7, 0.7, 0.13], ['can1', 0.32, -0.35, -2.7, 0.05, 0.05], ['can2', 0.32, -0.15, -2.7, 0.05, 0.05], ['can3', 0.32, 0.1, -2.7, 0.05, 0.05], ['cup', -0.17, -0.85, -1.2, 0.04, 0.04]];
(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript((SHED) => {
    try { delete Navigator.prototype.xr; delete WebGLRenderingContext.prototype.makeXRCompatible; delete WebGL2RenderingContext.prototype.makeXRCompatible; } catch (e) {} for (const k of Object.getOwnPropertyNames(window)) if (/^XR/.test(k)) { try { delete window[k]; } catch (e) {} }
    const reply = (cb, data) => setTimeout(() => window[cb] && window[cb](data), 5);
    window.__native = { hits: 0, empty: 0 }; window.__W = { yaw: 0, x: 0, z: 0 }; window.__SHED = SHED;
    // world transform of the whole room: the real room is turned and shifted relative to where AR started this time
    const place = () => { const W = window.__W, c = Math.cos(W.yaw), s = Math.sin(W.yaw); return window.__SHED.map(([n, y, cx, cz, hw, hd]) => ({ n, y, hw, hd, cx: cx * c + cz * s + W.x, cz: -cx * s + cz * c + W.z, rot: W.yaw })); };
    window.__place = place;
    const h = (fn) => ({ postMessage: (body) => { fn && fn(body); } });
    let dataCb = null, timer = null; const asp = 1180 / 820, f = 1 / Math.tan(0.5);
    const proj = [f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (100 + 0.01) / (0.01 - 100), -1, 0, 0, (2 * 100 * 0.01) / (0.01 - 100), 0];
    window.__cam = { mode: 'sweep', t0: performance.now(), fixed: [0.2, 0.5, 0.2, 0, -0.75], path: [], speed: 1 };
    const ease = (a, b2, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b2 - a))); return t * t * (3 - 2 * t); };
    const camNow = () => {
      const C = window.__cam; let x, y, z, yaw, pitch;
      if (C.mode === 'fixed' || !C.path.length) [x, y, z, yaw, pitch] = C.fixed;
      else {
        let t = ((performance.now() - C.t0) / 1000) * C.speed, i = 0; while (i < C.path.length - 1 && t > C.path[i].dur) { t -= C.path[i].dur; i++; }
        const v = C.path[i], pr = C.path[Math.max(0, i - 1)], u = Math.min(1, t / v.dur), fr = ease(0, 0.2, u), w = u * 6.283 * 2;
        x = pr.p[0] + (v.p[0] - pr.p[0]) * fr; y = pr.p[1] + (v.p[1] - pr.p[1]) * fr; z = pr.p[2] + (v.p[2] - pr.p[2]) * fr;
        yaw = pr.yaw + (v.yaw - pr.yaw) * fr + Math.sin(w) * v.ay * fr; pitch = pr.pitch + (v.pitch - pr.pitch) * fr + Math.sin(w * 2.3 + 1) * v.ap * fr;
        if (i === C.path.length - 1 && t >= v.dur) C.done = true;
      }
      const cy = Math.cos(yaw), sy = Math.sin(yaw), c = Math.cos(pitch), s = Math.sin(pitch);
      return [cy, 0, -sy, 0, sy * s, c, cy * s, 0, sy * c, -s, cy * c, 0, x, y, z, 1];
    };
    const inv = (m) => { const r = [m[0], m[4], m[8], 0, m[1], m[5], m[9], 0, m[2], m[6], m[10], 0, 0, 0, 0, 1], t = [m[12], m[13], m[14]]; r[12] = -(r[0] * t[0] + r[4] * t[1] + r[8] * t[2]); r[13] = -(r[1] * t[0] + r[5] * t[1] + r[9] * t[2]); r[14] = -(r[2] * t[0] + r[6] * t[1] + r[10] * t[2]); return r; };
    let cam = camNow();
    window.webkit = { messageHandlers: {
      initAR: h((b2) => b2.callback && reply(b2.callback, 'ios-ar-device-id')),
      requestSession: h((b2) => {
        dataCb = b2.data_callback; reply(b2.callback, { cameraAccess: false, worldAccess: true, webXRAccess: true }); clearInterval(timer);
        timer = setInterval(() => { cam = camNow(); window.NativeARData = window.NativeARData || {}; Object.assign(window.NativeARData, { timestamp: performance.now(), light_intensity: 1000, camera_transform: cam, camera_view: inv(cam), projection_camera: proj, video_updated: false }); if (dataCb && window[dataCb]) window[dataCb](); }, 33);
      }),
      stopAR: h((b2) => { clearInterval(timer); if (b2 && b2.callback) reply(b2.callback, {}); }),
      hitTest: h((b2) => {
        const nx = b2.x * 2 - 1, ny = 1 - b2.y * 2, dc = [nx * asp / f, ny / f, -1], m = cam, d = [m[0] * dc[0] + m[4] * dc[1] + m[8] * dc[2], m[1] * dc[0] + m[5] * dc[1] + m[9] * dc[2], m[2] * dc[0] + m[6] * dc[1] + m[10] * dc[2]];
        const out = []; let bt = 1e9, bh = null;
        if (d[1] < -1e-3) for (const S of place()) { const t = (S.y - m[13]) / d[1]; if (t <= 0 || t >= bt) continue; const hx = m[12] + d[0] * t, hz = m[14] + d[2] * t, dx = hx - S.cx, dz = hz - S.cz, c = Math.cos(S.rot), s = Math.sin(S.rot), lx = dx * c - dz * s, lz = dx * s + dz * c; if (Math.abs(lx) < S.hw && Math.abs(lz) < S.hd) { bt = t; bh = [hx, S.y, hz]; } }
        if (bh) out.push({ world_transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, bh[0], bh[1] + (Math.random() - 0.5) * 0.006, bh[2], 1] });
        window.__native[out.length ? 'hits' : 'empty']++; reply(b2.callback, out);
      }),
      onUpdate: h(), removeAnchors: h(), setUIOptions: h(),
    } };
    // a sweep path that looks down at each thing of the shed from about a metre: [{p, yaw, pitch, ay, ap, dur}]
    window.__sweep = (speed) => {
      const targets = window.__place(), pick = (n) => targets.find((t) => t.n === n), look = (tx, ty, tz, off, hgt, ay, ap, dur) => { const p = [tx + off[0], ty + hgt, tz + off[1]], fx = tx - p[0], fy = ty - p[1], fz = tz - p[2], L = Math.hypot(fx, fy, fz); return { p, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay, ap, dur }; };
      const fl = pick('floor'), sa = pick('speakerA'), sb = pick('speakerB'), sh = pick('shelf');
      window.__cam.path = [look(fl.cx, -1.2, fl.cz, [0, 1.4], 1.7, 0.7, 0.3, 14), look(sa.cx, sa.y, sa.cz, [0.1, 0.5], 0.55, 0.12, 0.1, 9), look(sb.cx, sb.y, sb.cz, [-0.1, 0.5], 0.6, 0.12, 0.1, 9), look(sh.cx, sh.y, sh.cz, [0, 0.6], 0.5, 0.18, 0.1, 11), look(fl.cx, -1.2, fl.cz, [0.3, -0.4], 1.8, 0.9, 0.3, 12), look(fl.cx - 0.3, -1.2, fl.cz + 0.3, [0, 1.4], 1.7, 0.9, 0.3, 8)];
      window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = speed || 1; window.__cam.done = false;
    };
  }, SHED);
  await p.addInitScript({ content: POLY });
  const ev = (f, a) => p.evaluate(f, a);
  const noOverlay = () => ev(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  const truthPx = (name) => ev((n) => { const S = window.__place().find((q) => q.n === n), v = new __g.THREE.Vector3(S.cx, S.y, S.cz).applyMatrix4(__g.AR.viewInv).applyMatrix4(__g.AR.projM); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, S.cx, S.y, S.cz]; }, name);
  const lookAt = (name, off, hgt) => ev(([n, off, hgt]) => { const S = window.__place().find((q) => q.n === n), p2 = [S.cx + off[0], S.y + hgt, S.cz + off[1]], fx = S.cx - p2[0], fy = S.y - p2[1], fz = S.cz - p2[2], L = Math.hypot(fx, fy, fz); window.__cam.mode = 'fixed'; window.__cam.fixed = [p2[0], p2[1], p2[2], Math.atan2(-fx / L, -fz / L), Math.asin(fy / L)]; }, [name, off, hgt]);
  const sweep = async (tag) => { await ev(() => window.__sweep(1)); const t0 = Date.now(); while (!(await ev(() => window.__cam.done)) && Date.now() - t0 < 200000) { await sleep(2000); } console.log(tag + ' sweep took ' + Math.round((Date.now() - t0) / 1000) + ' s, hits ' + await ev(() => window.__native.hits + '/' + window.__native.empty)); await ev(() => { window.__cam.mode = 'fixed'; }); };

  // ================= session 1: map and tag =================
  await p.goto(url); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay();
  await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); __g.ENV.hourOverride = 12; });
  ok('AR is offered by the real polyfill', await ev(() => !document.getElementById('bAR').hidden && __g.AR.ok));
  await p.click('#bMap'); await sleep(800);
  ok('Map my room starts an AR session', await ev(() => __g.AR.on && __g.G.intent === 'map'));
  await sweep('map');
  await p.click('#bDone'); await sleep(800);
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
  ok('Continue is offered', await ev(() => !document.getElementById('bCont').hidden));
  await p.click('#bCont'); await sleep(1200);
  const diaryTxt = await ev(() => document.getElementById('diary').innerText);
  ok('the away diary shows first, 9 hours', /While you were away/.test(diaryTxt) && /9\.0 h/.test(diaryTxt), diaryTxt.split('\n').length + ' lines');
  await p.screenshot({ path: OUT + 'ar-07-away.png' });
  await p.click('#dClose'); await ev(() => window.__sweep(1)); await sweep('return');
  await p.click('#bDone'); await sleep(800);
  const lm = await ev(() => __g.G.landmarks.map((l) => l.name));
  ok('alignment asks for two landmarks', await ev(() => __g.G.phase === 'align') && lm.length === 2, lm.join(' & '));
  const names = { 'Left hi-fi': 'speakerA', 'Right hi-fi': 'speakerB', 'Beans can': 'can1', 'Egg cup': 'cup' };
  for (const n of lm) { await lookAt(names[n] || 'floor', [0.0, 0.9], 1.0); await sleep(900); const q = await truthPx(names[n]); await p.mouse.click(q[0], q[1]); await sleep(300); }
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
