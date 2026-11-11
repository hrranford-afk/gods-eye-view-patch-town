// Base Camp in AR with HelloXR's real WebXR polyfill and a fake native iOS side: floor, desk, shelf.
const fs = require('fs');
const { chromium } = require('playwright');
const HX = '/tmp/claude-0/-home-user-gods-eye-view-patch-town/fdb99453-405c-5d2e-981d-011c52aa5323/scratchpad/hxr';
const POLY = fs.readFileSync(HX + '/src/WebXRKit/Sources/WebXRKit/Resources/webxr-polyfill.js', 'utf8');
const OUT = '/home/user/gods-eye-view-patch-town/.worktrees/room-colony/games/base-camp/shots/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 24, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 10 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(() => {
    try { delete Navigator.prototype.xr; delete WebGLRenderingContext.prototype.makeXRCompatible; delete WebGL2RenderingContext.prototype.makeXRCompatible; } catch (e) {} for (const k of Object.getOwnPropertyNames(window)) if (/^XR/.test(k)) { try { delete window[k]; } catch (e) {} }
    const reply = (cb, data) => setTimeout(() => window[cb] && window[cb](data), 5);
    window.__native = { hits: 0, empty: 0 };
    const h = (name, fn) => ({ postMessage: (body) => { fn && fn(body); } });
    let dataCb = null, timer = null;
    const SURF = [{ n: 'floor', y: -1.2, x0: -1.5, x1: 1.5, z0: -3, z1: 0 }, { n: 'desk', y: -0.45, x0: -0.6, x1: 0.6, z0: -1.8, z1: -1.2 }, { n: 'shelf', y: 0.2, x0: 0.4, x1: 1.2, z0: -2.6, z1: -2.35 }];
    window.__surf = SURF;
    const asp = 1180 / 820, f = 1 / Math.tan(0.5);
    const proj = [f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (100 + 0.01) / (0.01 - 100), -1, 0, 0, (2 * 100 * 0.01) / (0.01 - 100), 0];
    const VIEWS = [{ p: [0, 0.7, 0.3], yaw: 0, pitch: -0.62, ay: 0.55, ap: 0.3 }, { p: [0, 0.8, 0.3], yaw: 0, pitch: -1.0, ay: 0.9, ap: 0.3 }, { p: [0.8, 0.95, -1.5], yaw: 0, pitch: -0.62, ay: 0.35, ap: 0.18 }, { p: [0.8, 0.95, -1.7], yaw: 0.1, pitch: -0.8, ay: 0.3, ap: 0.15 }, { p: [0.1, 0.8, -0.2], yaw: 0, pitch: -0.75, ay: 1.1, ap: 0.35 }, { p: [-0.3, 0.8, 0.2], yaw: 0.15, pitch: -1.15, ay: 0.7, ap: 0.3 }];
    window.__cam = { mode: 'sweep', t0: performance.now(), fixed: [0.2, 0.9, 0.2, 0, -0.75] };
    const PV = 7, ease = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const camNow = () => {
      const C = window.__cam; let x, y, z, yaw, pitch;
      if (C.mode === 'fixed') [x, y, z, yaw, pitch] = C.fixed;
      else {
        const t = (((performance.now() - C.t0) / 1000) * 0.3) % (VIEWS.length * PV), i = Math.floor(t / PV), v = VIEWS[i], pr = VIEWS[Math.max(0, i - 1)], u = (t - i * PV) / PV, fr = ease(0, 0.18, u), w = u * 6.283 * 1.5;
        x = pr.p[0] + (v.p[0] - pr.p[0]) * fr; y = pr.p[1] + (v.p[1] - pr.p[1]) * fr; z = pr.p[2] + (v.p[2] - pr.p[2]) * fr;
        yaw = pr.yaw + (v.yaw - pr.yaw) * fr + Math.sin(w) * v.ay * fr; pitch = pr.pitch + (v.pitch - pr.pitch) * fr + Math.sin(w * 2.3 + 1) * v.ap * fr;
      }
      const cy = Math.cos(yaw), sy = Math.sin(yaw), c = Math.cos(pitch), s = Math.sin(pitch);
      return [cy, 0, -sy, 0, sy * s, c, cy * s, 0, sy * c, -s, cy * c, 0, x, y, z, 1];
    };
    const inv = (m) => { const r = [m[0], m[4], m[8], 0, m[1], m[5], m[9], 0, m[2], m[6], m[10], 0, 0, 0, 0, 1], t = [m[12], m[13], m[14]]; r[12] = -(r[0] * t[0] + r[4] * t[1] + r[8] * t[2]); r[13] = -(r[1] * t[0] + r[5] * t[1] + r[9] * t[2]); r[14] = -(r[2] * t[0] + r[6] * t[1] + r[10] * t[2]); return r; };
    let cam = camNow();
    window.webkit = { messageHandlers: {
      initAR: h('initAR', (b) => b.callback && reply(b.callback, 'ios-ar-device-id')),
      requestSession: h('requestSession', (b) => {
        dataCb = b.data_callback; reply(b.callback, { cameraAccess: false, worldAccess: true, webXRAccess: true }); clearInterval(timer);
        timer = setInterval(() => { cam = camNow(); window.NativeARData = window.NativeARData || {}; Object.assign(window.NativeARData, { timestamp: performance.now(), light_intensity: window.__light || 1000, camera_transform: cam, camera_view: inv(cam), projection_camera: proj, video_updated: false }); if (dataCb && window[dataCb]) window[dataCb](); }, 33);
      }),
      stopAR: h('stopAR', (b) => { clearInterval(timer); if (b && b.callback) reply(b.callback, {}); }),
      hitTest: h('hitTest', (b) => {
        const nx = b.x * 2 - 1, ny = 1 - b.y * 2, dc = [nx * asp / f, ny / f, -1], m = cam, d = [m[0] * dc[0] + m[4] * dc[1] + m[8] * dc[2], m[1] * dc[0] + m[5] * dc[1] + m[9] * dc[2], m[2] * dc[0] + m[6] * dc[1] + m[10] * dc[2]];
        const out = []; let bt = 1e9, bh = null;
        if (d[1] < -1e-3) for (const S of SURF) { const t = (S.y - m[13]) / d[1]; if (t <= 0) continue; const hx = m[12] + d[0] * t, hz = m[14] + d[2] * t; if (hx > S.x0 && hx < S.x1 && hz > S.z0 && hz < S.z1 && t < bt) { bt = t; bh = [hx, S.y, hz]; } }
        if (bh) out.push({ world_transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, bh[0], bh[1] + (Math.random() - 0.5) * 0.006, bh[2], 1] });
        window.__native[out.length ? 'hits' : 'empty']++; reply(b.callback, out);
      }),
      onUpdate: h('onUpdate'), removeAnchors: h('removeAnchors'), setUIOptions: h('setUIOptions'),
    } };
    // a pretend camera feed for screenshots: floor, desk and shelf drawn as real-size slabs
    window.__feed = () => {
      renderer.setClearColor(0x9b9184, 1); if (window.__feedG) return; window.__feedG = new THREE.Group();
      const mk = (S, col) => { const m = new THREE.Mesh(new THREE.BoxGeometry(S.x1 - S.x0, 0.03, S.z1 - S.z0), new THREE.MeshBasicMaterial({ color: col })); m.position.set((S.x0 + S.x1) / 2, S.y - 0.016, (S.z0 + S.z1) / 2); window.__feedG.add(m); };
      mk(SURF[0], 0x8a7660); mk(SURF[1], 0xd6c29a); mk(SURF[2], 0xc9b087); scene.add(window.__feedG);
    };
  });
  await p.addInitScript({ content: POLY });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(2500);
  if (process.env.NO_OVERLAY) await p.evaluate(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  console.log('before AR:', await p.evaluate(() => JSON.stringify({ status: document.getElementById('arStatus').textContent, btnHidden: document.getElementById('bAR').hidden })));
  const shot = async (name) => { await p.evaluate(() => { window.__feed(); }); await p.waitForTimeout(250); await p.screenshot({ path: OUT + name }); };
  const mem = () => p.evaluate(() => ({ geo: __g.renderer.info.memory.geometries, tex: __g.renderer.info.memory.textures, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : 0, kids: __g.scene.children.length }));
  const toScreen = (x, y, z) => p.evaluate(([x, y, z]) => { const v = new __g.THREE.Vector3(x, y, z).applyMatrix4(__g.AR.viewInv).applyMatrix4(__g.AR.projM); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [x, y, z]);
  await p.evaluate(() => { __g.ENV.hourOverride = 12; localStorage.setItem('bc-wxchoice', 'no'); });
  await p.click('#bAR'); await p.waitForTimeout(500);
  const m0 = await mem();
  console.log('phase', await p.evaluate(() => __g.G.phase + ' ar=' + __g.AR.on + ' srcs=' + __g.AR.srcs.length));
  for (const L of [1400, 600, 1000]) { await p.evaluate((L) => { window.__light = L; }, L); await p.waitForTimeout(2500); console.log('light', L, await p.evaluate(() => JSON.stringify({ arLight: __g.AR.light, sun: __g.ENV.sun, hot: __g.ENV.hot, dim: __g.ENV.dim, grow: +__g.ENV.grow.toFixed(2) }))); }
  await p.waitForTimeout(8000); await shot('dbg-ar-scan-half.png');
  await p.waitForFunction(() => performance.now() - window.__cam.t0 > 118000, null, { timeout: 200000 });
  const zs = await p.evaluate(() => __g.SCAN.zones.map((z) => ({ id: z.id, type: z.type, name: z.name, area: +z.area.toFixed(2), y: +z.y.toFixed(2), h: +z.h.toFixed(2), bands: __g.SCAN.bands.length })));
  console.log('zones', JSON.stringify(zs), 'hits', await p.evaluate(() => window.__native.hits + '/' + window.__native.empty));
  await p.evaluate(() => { window.__cam.mode = 'fixed'; }); await p.waitForTimeout(800);
  await shot('01-scan-zones.png');
  await p.click('#bDone'); await p.waitForTimeout(600);
  const dz = await toScreen(0, -0.45, -1.5); console.log('desk px', dz);
  const close = () => p.evaluate(() => { window.__cam.fixed = [0.0, -0.1, -0.85, 0, -0.62]; });
  await p.mouse.click(dz[0], dz[1]); await close(); await p.waitForTimeout(3500);
  console.log('settled', await p.evaluate(() => __g.G.phase + ' ' + __g.G.settlements.length + ' cols=' + __g.G.settlements[0].cols.length + ' ' + __g.G.settlements[0].zoneName));
  await shot('02-settle.png');
  await p.evaluate(() => __g.simulate(600, 0.5)); await p.waitForTimeout(1500);
  const st = await p.evaluate(() => { const S = __g.G.settlements[0]; return { cols: S.cols.length, thr: S.thriving, stock: S.stock, things: S.things.map((t) => t.kind + (t.built ? '' : '*')).join(' ') }; });
  console.log('after 10 min', JSON.stringify(st));
  await shot('03-growing.png');
  const m1 = await mem();
  await p.evaluate(() => { window.__cam.fixed = [0.15, 0.55, -0.5, 0.0, -0.4]; }); await p.waitForTimeout(800);
  // cable car desk -> shelf, drawn with the finger
  const a = await toScreen(-0.3, -0.45, -1.7), bsh = await toScreen(0.8, 0.2, -2.48);
  await p.evaluate(() => { __g.G.settlements[0].stock.wood = Math.max(__g.G.settlements[0].stock.wood, 8); __g.setTool('cable'); });
  await p.mouse.move(a[0], a[1]); await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(a[0] + (bsh[0] - a[0]) * i / 12, a[1] + (bsh[1] - a[1]) * i / 12); await p.waitForTimeout(40); }
  await shot('dbg-cable-drag.png');
  await p.mouse.up(); await p.waitForTimeout(500);
  console.log('cable px', JSON.stringify([a, bsh]), 'toast:', await p.evaluate(() => document.getElementById('toast').textContent));
  console.log('links', await p.evaluate(() => __g.G.links.length + ' settlements ' + __g.G.settlements.map((s) => s.zoneName + ':' + s.cols.length + ':' + s.awaiting).join(' | ')));
  await p.evaluate(() => __g.simulate(150, 0.5)); await p.waitForTimeout(1200);
  console.log('after link', await p.evaluate(() => __g.G.settlements.map((s) => s.zoneName + ' cols=' + s.cols.length + ' awaiting=' + s.awaiting + ' things=' + s.things.length).join(' | ') + ' links ready=' + __g.G.links.map((l) => l.ready + ':' + l.g.state).join(',')));
  await shot('04-cablecar.png');
  await p.evaluate(() => __g.simulate(300, 0.5));
  const m2 = await mem(); console.log('mem', JSON.stringify([m0, m1, m2]));
  // save, skip 40 minutes, reload, re-place
  await p.evaluate(() => { __g.saveNow(); const d = JSON.parse(localStorage.getItem('base-camp-save-v1')); d.t -= 40 * 60000; localStorage.setItem('base-camp-save-v1', JSON.stringify(d)); });
  const before = await p.evaluate(() => JSON.stringify(__g.G.settlements.map((s) => [s.zoneName, s.cols.length, s.things.length])));
  await p.evaluate(() => document.getElementById('bQuit') ? 0 : 0); await p.evaluate(() => __g.AR.session.end()); await p.waitForTimeout(1500);
  await p.reload(); await p.waitForTimeout(2500);
  await p.evaluate(() => { __g.ENV.hourOverride = 12; });
  console.log('cont visible', await p.evaluate(() => !document.getElementById('bCont').hidden));
  await p.evaluate(() => { window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); });
  await p.click('#bCont'); await p.waitForTimeout(118000);
  await p.evaluate(() => { window.__cam.mode = 'fixed'; }); await p.waitForTimeout(600);
  await p.click('#bDone'); await p.waitForTimeout(600);
  console.log('replace phase', await p.evaluate(() => __g.G.phase + ' pending ' + __g.G.pending.length));
  await shot('dbg-replace-1.png');
  const dz2 = await toScreen(0, -0.45, -1.5);
  await p.mouse.click(dz2[0], dz2[1]); await p.waitForTimeout(800);
  console.log('ghost', await p.evaluate(() => !!__g.G.placing));
  await p.click('#rL'); await p.waitForTimeout(300); await shot('dbg-replace-2.png'); await p.click('#rLock'); await p.waitForTimeout(800);
  const dz3 = await toScreen(0.8, 0.2, -2.48);
  console.log('after reload', await p.evaluate(() => __g.G.phase + ' pending=' + __g.G.pending.length + ' ' + JSON.stringify(__g.G.settlements.map((s) => [s.zoneName, s.cols.length, s.things.length])) + ' links=' + __g.G.links.length));
  console.log('before save', before);
  const pend = await p.evaluate(() => __g.G.pending.length);
  if (pend) { await p.mouse.click(dz3[0], dz3[1]); await p.waitForTimeout(600); await p.click('#rLock').catch(() => {}); await p.waitForTimeout(600); }
  console.log('final', await p.evaluate(() => __g.G.phase + ' pending=' + __g.G.pending.length + ' ' + JSON.stringify(__g.G.settlements.map((s) => [s.zoneName, s.cols.length, s.things.length])) + ' links=' + __g.G.links.length));
  await shot('dbg-replaced.png');
  console.log('page errors:', errs.slice(0, 8));
  await b.close();
})();
