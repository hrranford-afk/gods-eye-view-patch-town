// Run from the repo root with the game served on port 8124: npx http-server games/night-meet -p 8124 -c-1, then NODE_PATH=$(npm root -g) OUT=<outdir> NO_OVERLAY=1 node games/night-meet/tests/ar.cjs
// Night Meet in AR (adapted from the My Track harness mtar.js) with HelloXR's real WebXR polyfill and a fake native iOS side (extends real.js).
// The fake ARKit: a table plane at y = -0.9 m, x -0.6..0.6, z -1.1..-0.5 (1.2 m x 0.6 m); hit tests outside it are empty.
// The camera sweeps over it while scanning, then holds still for drawing. Run with NO_OVERLAY=1 to match the owner's iPad.
const fs = require('fs');
const { chromium } = require('playwright');
const POLY = fs.readFileSync(__dirname + '/../webxr-polyfill.js', 'utf8'); // the same unmodified polyfill the HelloXR app injects
const OUT = process.env.OUT || __dirname;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1180, height: 820 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  const errs = [], logs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
  await p.addInitScript(() => {
    try { delete Navigator.prototype.xr; delete WebGLRenderingContext.prototype.makeXRCompatible; delete WebGL2RenderingContext.prototype.makeXRCompatible; } catch (e) {} for (const k of Object.getOwnPropertyNames(window)) if (/^XR/.test(k)) { try { delete window[k]; } catch (e) {} }
    const reply = (cb, data) => setTimeout(() => window[cb] && window[cb](data), 5);
    window.__native = { calls: [], hits: 0, empty: 0 };
    const h = (name, fn) => ({ postMessage: (body) => { window.__native.calls.push(name); fn && fn(body); } });
    let dataCb = null, timer = null;
    const TABLE = { y: -0.9, x0: -0.6, x1: 0.6, z0: -1.1, z1: -0.5 };
    window.__table = TABLE;
    const asp = 1180 / 820, f = 1 / Math.tan(0.5);
    const proj = [f / asp, 0, 0, 0, 0, f, 0, 0, 0, 0, (100 + 0.01) / (0.01 - 100), -1, 0, 0, (2 * 100 * 0.01) / (0.01 - 100), 0];
    // camera: position (x, y, z), pitch a (down is negative), no yaw. The sweep: rows across the table over 10 s.
    window.__cam = { mode: 'fixed', t0: performance.now(), fixed: [0, -0.3, -0.2, -0.87] };
    const camNow = () => {
      const C = window.__cam;
      let x, y, z, a;
      if (C.mode === 'fixed') [x, y, z, a] = C.fixed;
      else { const t = ((performance.now() - C.t0) / 1000) % 12, row = Math.floor(t / 2), fr = (t % 2) / 2; x = (row % 2 ? 1 - fr : fr) * 1.0 - 0.5; z = -0.2 - row * 0.09; y = -0.45; a = -0.96; }
      const c = Math.cos(a), s = Math.sin(a);
      return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, x, y, z, 1];
    };
    const inv = (m) => { const r = [m[0], m[4], m[8], 0, m[1], m[5], m[9], 0, m[2], m[6], m[10], 0, 0, 0, 0, 1], t = [m[12], m[13], m[14]]; r[12] = -(r[0] * t[0] + r[4] * t[1] + r[8] * t[2]); r[13] = -(r[1] * t[0] + r[5] * t[1] + r[9] * t[2]); r[14] = -(r[2] * t[0] + r[6] * t[1] + r[10] * t[2]); return r; };
    let cam = camNow();
    window.webkit = { messageHandlers: {
      initAR: h('initAR', (b) => b.callback && reply(b.callback, 'ios-ar-device-id')),
      requestSession: h('requestSession', (b) => {
        dataCb = b.data_callback;
        reply(b.callback, { cameraAccess: false, worldAccess: true, webXRAccess: true });
        clearInterval(timer);
        timer = setInterval(() => {
          cam = camNow();
          window.NativeARData = window.NativeARData || {};
          Object.assign(window.NativeARData, { timestamp: performance.now(), light_intensity: 1000, camera_transform: cam, camera_view: inv(cam), projection_camera: proj, video_updated: false });
          if (dataCb && window[dataCb]) window[dataCb]();
        }, 33);
      }),
      stopAR: h('stopAR', (b) => { clearInterval(timer); window.__native.stopped = true; if (b && b.callback) reply(b.callback, {}); }), // (the real app answers; without the answer the polyfill never starts a second session)
      // ARKit raycast from screen point (x, y in 0..1) against the one plane: hit only inside the table
      hitTest: h('hitTest', (b) => {
        const nx = b.x * 2 - 1, ny = 1 - b.y * 2, dc = [nx * asp / f, ny / f, -1];
        const m = cam, d = [m[0] * dc[0] + m[4] * dc[1] + m[8] * dc[2], m[1] * dc[0] + m[5] * dc[1] + m[9] * dc[2], m[2] * dc[0] + m[6] * dc[1] + m[10] * dc[2]];
        const out = [];
        if (d[1] < -1e-4) {
          const t = (TABLE.y - m[13]) / d[1], hx = m[12] + d[0] * t, hz = m[14] + d[2] * t;
          if (hx > TABLE.x0 && hx < TABLE.x1 && hz > TABLE.z0 && hz < TABLE.z1) out.push({ world_transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, hx, TABLE.y + (Math.random() - 0.5) * 0.004, hz, 1] });
        }
        window.__native[out.length ? 'hits' : 'empty']++;
        reply(b.callback, out);
      }),
      onUpdate: h('onUpdate'), removeAnchors: h('removeAnchors'), setUIOptions: h('setUIOptions'),
    } };
    // A pretend camera feed: the table drawn in perspective behind the transparent page (screenshots only).
    window.__feed = () => { // a pretend camera feed for screenshots: a room colour and the table, drawn in the 3D view in real metres
      renderer.setClearColor(0x9b9184, 1);
      if (window.__feedMesh) return;
      const T = TABLE, m = new THREE.Mesh(new THREE.PlaneGeometry(T.x1 - T.x0, T.z1 - T.z0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe6e0d4 }));
      m.matrixAutoUpdate = false;
      const place = new THREE.Matrix4().makeTranslation((T.x0 + T.x1) / 2, T.y - 0.0015, (T.z0 + T.z1) / 2);
      m.onBeforeRender = () => { m.matrix.copy(scene.matrixWorld).invert().multiply(place); m.matrixWorld.copy(place); };
      m.renderOrder = -1; scene.add(m); window.__feedMesh = m;
    };
  });
  await p.addInitScript({ content: POLY });
  await p.goto('http://localhost:8124/index.html');
  await p.waitForFunction(() => window.NM_READY, null, { timeout: 90000 });
  await p.waitForTimeout(2500);
  if (process.env.NO_OVERLAY) await p.evaluate(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  const pre = await p.evaluate(() => ({ xr: !!navigator.xr, status: document.getElementById('arStatus').textContent, btnHidden: document.getElementById('arBtn').hidden }));
  console.log('before AR:', JSON.stringify(pre));
  const shot = async (name) => { await p.evaluate(() => window.__feed()); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/' + name }); console.log('shot', name); };
  const results = [];
  for (let run = 0; run < 2; run++) {
    await p.click(run ? '#meetAr' : '#arBtn');
    await p.waitForFunction(() => AR.on && AR.hasHit, null, { timeout: 60000 });
    const st = await p.evaluate(() => ({ on: AR.on, hit: AR.hit.toArray().map((v) => +v.toFixed(3)), log: (document.getElementById('arLog') || {}).textContent, root: !!document.getElementById('arRoot'), overlay: !!(AR.session && AR.session.domOverlayState) }));
    await p.evaluate(() => { const el = document.getElementById('arTouch'), r = el.getBoundingClientRect(), ev = (t) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 3, clientX: r.width / 2, clientY: r.height / 2, pointerType: 'touch', isPrimary: true })); ev('pointerdown'); ev('pointerup'); });
    await p.waitForTimeout(1500);
    const placed = await p.evaluate(() => ({ placed: AR.placed, s: +AR.s.toFixed(5), scene: scene.position.toArray().map((v) => +v.toFixed(3)), sky: SKY.visible, plinth: CUR.area.plinth.visible }));
    if (run === 0) await shot('ar-meet.png');
    // tap a car through the AR camera, then drive it on the table
    const tap = await p.evaluate(() => { const s = NM.getArea('carpark').spots[0]; const v = new THREE.Vector3(); s.car.getWorldPosition(v); v.y += 0.01; v.project(camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
    await p.evaluate(([x, y]) => { const el = document.getElementById('arTouch'), ev = (t) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 4, clientX: x, clientY: y, pointerType: 'touch', isPrimary: true })); ev('pointerdown'); ev('pointerup'); }, tap);
    await p.waitForTimeout(800);
    const picked = await p.evaluate(() => ({ inspect: !document.getElementById('inspect').hidden, name: document.getElementById('insName').textContent, inRoot: document.getElementById('arRoot').contains(document.getElementById('inspect')) }));
    await p.evaluate(() => { document.getElementById('driveDocks').click(); NM.DRIVE.bot = NM.botDriver(); });
    await p.waitForTimeout(12000);
    const drive = await p.evaluate(() => ({ active: NM.DRIVE.active, state: NM.DRIVE.state, speed: +NM.DRIVE.c.speed.toFixed(1), score: Math.round(NM.DRIVE.score), hud: !document.getElementById('drHud').hidden, t: +NM.DRIVE.t.toFixed(1) }));
    if (run === 0) { await p.evaluate(() => { for (let i = 0; i < 400; i++) update(1 / 60); }); await shot('ar-drive.png'); }
    await p.click('#arExit').catch(() => {});
    await p.waitForTimeout(1500);
    const after = await p.evaluate(() => ({ arOn: AR.on, root: !!document.getElementById('arRoot'), scale: scene.scale.x, sky: SKY.visible, geo: renderer.info.memory.geometries, tex: renderer.info.memory.textures, kids: scene.children.length, q: NM.SET.q, composer: !!composer }));
    await p.evaluate(() => NM.driveExit());
    results.push({ run, st, placed, tap, picked, drive, after });
    console.log('run', run, JSON.stringify({ st, placed, picked, drive, after }));
  }
  console.log('native calls:', JSON.stringify(await p.evaluate(() => { const c = {}; for (const k of window.__native.calls) c[k] = (c[k] || 0) + 1; return c; })));
  console.log('page errors:', errs.slice(0, 5));
  console.log('console errors:', logs.filter((l) => !/GPU stall|GL Driver/.test(l)).slice(0, 8));
  await b.close();
})();
