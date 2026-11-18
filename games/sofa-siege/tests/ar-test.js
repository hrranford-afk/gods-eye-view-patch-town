/* Round Table Kingdom AR test, with the fake WebXR in ar-fake.js. Run: NODE_PATH=$(npm root -g) node tests/ar-test.js
   This proves the game's own AR logic. It does NOT prove anything about HelloXR or a real iPad: see AR_NOTES.md. */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import installFakeAR from './ar-fake.js';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require('playwright');
const T0 = Date.now(), SHOTS = path.resolve(__dirname, '..', 'shots'), url = 'file://' + path.resolve(__dirname, '..', 'index.html');
const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  let n = 0, bad = 0; const errs = [];
  const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra && !cond ? '  -> ' + extra : '')); };
  const open = async (fake, query) => { const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    if (fake) await installFakeAR(p, fake); await p.goto(url + (query || '')); await p.waitForFunction('window.__done', null, { timeout: 60000 }); await p.waitForTimeout(200); return p; };

  /* the page starts with and without WebXR */
  let p = await open(null);
  ok('with no WebXR at all the page starts, with the small AR line and no AR button', await p.evaluate(() => SG.phase === 'start' && SG.ar.supported === false && getComputedStyle(document.getElementById('bAR')).display === 'none' && /AR needs the HelloXR app\. Practice table works here\./.test(document.getElementById('arNote').textContent)));
  await p.click('#bPlay'); ok('  and the practice table plays as before', await p.evaluate(() => SG.phase === 'build' && SG.ar.on === false)); await p.close();
  p = await open({ supported: false });
  ok('with WebXR but no immersive-ar the page starts the same way', await p.evaluate(() => SG.ar.supported === false && getComputedStyle(document.getElementById('bAR')).display === 'none')); await p.close();
  p = await open({ supported: true, failStart: true });
  await p.click('#bAR'); await p.waitForTimeout(300);
  ok('if the session will not start, the title says so and the practice table still works', await p.evaluate(() => SG.ar.on === false && /could not start/.test(document.getElementById('arNote').textContent) && SG.phase === 'start')); await p.close();

  /* a session */
  p = await open({ supported: true, anchors: true }, '?dev=1');
  const ev = (f, a) => p.evaluate(f, a);
  const frames = (k) => p.evaluate((k) => new Promise((r) => { let i = 0; (function f() { if (++i > k) r(); else requestAnimationFrame(f); })(); }), k || 3);
  const look = async (pos, target) => { await ev(([pos, target]) => { __XRF.cam = { pos, target }; }, [pos, target]); await frames(3); };
  /* the table-local point (x, z) on the screen, worked out by the fake from the known table pose: not by the game */
  const scr = (x, z, pose) => ev(([x, z, pose]) => { const k = pose.unit, c = Math.cos(pose.yaw), s = Math.sin(pose.yaw); return __XRF.project([pose.x + (x * c + z * s) * k, pose.y, pose.z + (-x * s + z * c) * k]); }, [x, z, pose]);
  /* a camera picture to put behind the game for the shots: the fake room's floor and table, drawn from the fake camera */
  const backdrop = () => ev(() => { let c = document.getElementById('fakeCam'); if (!c) { c = document.createElement('canvas'); c.id = 'fakeCam'; c.style.cssText = 'position:fixed;left:0;top:0;z-index:-1'; document.body.insertBefore(c, document.body.firstChild); }
    c.width = innerWidth; c.height = innerHeight; const g = c.getContext('2d'), T = __XRF.table; const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, '#6f7780'); gr.addColorStop(1, '#3d4248'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = -8; i <= 8; i++) { const a = __XRF.project([i * .5, T.y - .72, -4]), q = __XRF.project([i * .5, T.y - .72, 1]); if (a.front && q.front) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(q.x, q.y); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.08)'; g.stroke(); } }
    const ring = (r, y, fill) => { g.beginPath(); for (let i = 0; i <= 48; i++) { const a = i / 48 * 6.283, q = __XRF.project([T.cx + Math.cos(a) * r, y, T.cz + Math.sin(a) * r]); if (i) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); } g.fillStyle = fill; g.fill(); };
    ring(T.r, T.y - .03, '#5a3d24'); ring(T.r, T.y, '#b98850'); ring(T.r * .93, T.y, '#c4935a'); });
  ok('with immersive-ar the title offers "Play on my table (AR)"', await ev(() => SG.ar.supported === true && getComputedStyle(document.getElementById('bAR')).display !== 'none' && /Play on my table \(AR\)/.test(document.getElementById('bAR').textContent) && getComputedStyle(document.getElementById('arNote')).display === 'none'));
  await ev(() => { __XRF.cam = { pos: [0, 0, 0], target: [0, 0.3, -1] }; }); /* looking up, away from the table */
  await p.click('#bAR'); await p.waitForFunction('SG.ar.on', null, { timeout: 10000 }); await frames(4);
  await ev(() => { SG.noGuard = true; });   /* this machine draws slowly; the guard is tested on its own below */
  ok('the session starts, with hit-test asked for and the dom overlay given', await ev(() => SG.ar.on && SG.ar.state === 'find' && __XRF.sessions === 1 && __XRF.session.init.requiredFeatures.indexOf('hit-test') >= 0 && __XRF.session.init.domOverlay.root === document.getElementById('ui') && SG.ar.overlay === 'screen'));
  ok('the practice room and its table top are not drawn in AR; the page is see-through', await ev(() => document.body.className === 'ar' && document.getElementById('start').style.display === 'none' && getComputedStyle(document.getElementById('bCam')).display === 'none'));
  ok('looking away from the table: no reticle, and the bar says to find it', await ev(() => SG.ar.reticle === false && /Find your table/.test(document.getElementById('arText').textContent)));
  await look([0, 0, 0], [0, -0.45, -0.9]);
  ok('pointing at the fake table: the reticle appears on it', await ev(() => SG.ar.reticle === true && /Tap/.test(document.getElementById('arText').textContent) && __XRF.hitCalls > 3));
  await backdrop(); await p.screenshot({ path: path.join(SHOTS, 'ar-1-find.png') });
  await p.mouse.click(590, 300); await frames(3);
  let A = await ev(() => SG.ar);
  ok('a tap places the table centre where the reticle is', A.state === 'placed' && Math.abs(A.pose.x) < 1e-6 && Math.abs(A.pose.y + 0.45) < 1e-6 && Math.abs(A.pose.z + 0.9) < 1e-6 && Math.abs(A.unitMetres - 0.16) < 1e-9 && A.size === 100, JSON.stringify(A));
  await p.mouse.move(500, 300); await p.mouse.down(); await p.mouse.move(600, 300, { steps: 5 }); await p.mouse.up(); await frames(2);
  A = await ev(() => SG.ar); ok('a drag turns the table', A.state === 'placed' && Math.abs(A.pose.yaw - 0.8) < 0.12, JSON.stringify(A.pose));
  await p.click('#arL'); const y2 = (await ev(() => SG.ar)).pose.yaw; ok('the turn buttons turn it too', Math.abs(y2 - A.pose.yaw - Math.PI / 12) < 1e-6);
  await ev(() => { const s = document.getElementById('arSize'); s.value = 130; s.oninput(); }); A = await ev(() => SG.ar);
  ok('the size slider resizes it between 60 and 140 cm', A.size === 130 && Math.abs(A.unitMetres - 0.208) < 1e-9 && await ev(() => { SG.arResize(20); const lo = SG.ar.size; SG.arResize(500); const hi = SG.ar.size; SG.arResize(100); return lo === 60 && hi === 140; }));
  await ev(() => { SG.arTurn(-SG.ar.pose.yaw + 0.5); });   /* a known turn for the tap checks below */
  await p.click('#arLock'); await frames(4);
  A = await ev(() => SG.ar);
  ok('Lock table locks it, makes an XR anchor where the device offers one, and the build step starts', A.state === 'locked' && A.anchorKind === 'xr anchor' && await ev(() => SG.phase === 'build' && __XRF.anchorsMade === 1 && document.getElementById('arbar').style.display === 'none' && document.getElementById('bar').style.display === 'flex'), JSON.stringify(A));
  await ev(() => { SG.hold = true; });
  const pose = { x: A.pose.x, y: A.pose.y, z: A.pose.z, yaw: A.pose.yaw, unit: A.unitMetres };
  await backdrop(); await ev(() => SG.render()); await p.screenshot({ path: path.join(SHOTS, 'ar-2-locked.png') });

  /* taps become rays from the XR camera into the table: a piece lands at the right table position from three camera poses */
  const poses = [[[0, 0, 0], [0, -0.45, -0.9]], [[0.55, 0.1, -0.35], [0, -0.45, -0.9]], [[-0.35, 0.25, -1.75], [0.05, -0.45, -0.95]]];
  const spots = [[0, 1.3], [-0.9, 1.75], [0.95, 2.0]], kit = [0, 7, 9];
  for (let i = 0; i < 3; i++) {
    await look(poses[i][0], poses[i][1]); await ev(() => SG.render());
    const ks = await ev((k) => SG.sides[0].kit[k], kit[i]); let q = await scr(ks.x, ks.z, pose); await p.mouse.click(q.x, q.y);
    const sel = await ev(() => SG.sel); q = await scr(spots[i][0], spots[i][1], pose); await p.mouse.click(q.x, q.y); await frames(2);
    const pc = await ev((k) => SG.pieces.filter((x) => x.side === 0 && x.slot === k)[0] || null, kit[i]);
    ok('camera pose ' + (i + 1) + ': a tap picks the right tray piece and places it within 3 mm of the tapped table spot', sel === kit[i] && pc && Math.hypot(pc.x - spots[i][0], pc.z - spots[i][1]) * pose.unit < 0.003, JSON.stringify({ sel, pc, q }));
  }
  ok('SG.screen and the fake camera agree on where a table spot is', await (async () => { const q = await scr(0.6, 1.1, pose), g = await ev(() => SG.screen(0.6, 1.1)); return Math.hypot(q.x - g.x, q.y - g.y) < 1.5; })());

  /* tracking loss pauses and resumes */
  await ev(() => { SG.hold = false; }); await frames(3); const c0 = await ev(() => SG.clock);
  await ev(() => { __XRF.track = false; }); await p.waitForTimeout(1500); await frames(3);
  const lost = await ev(() => ({ lost: SG.ar.lost, paused: SG.paused, text: document.getElementById('say').textContent, c: SG.clock })); await p.waitForTimeout(400); const c1 = await ev(() => SG.clock);
  ok('no pose for over a second: the match pauses and says so', lost.lost && lost.paused && /Tracking lost/.test(lost.text) && c1 === lost.c && lost.c > c0, JSON.stringify(lost));
  await ev(() => { __XRF.track = true; }); await frames(4); await p.waitForTimeout(300);
  ok('when the pose comes back the match goes on', await ev((c1) => !SG.ar.lost && !SG.paused && SG.clock > c1, c1));

  /* re-place the table */
  await ev(() => { SG.hold = true; SG.render(); });
  ok('"Re-place table" is offered', await ev(() => getComputedStyle(document.getElementById('bReplace')).display !== 'none'));
  await p.click('#bReplace'); await frames(2);
  ok('re-placing unlocks the table and the match waits', await ev(() => SG.ar.state === 'placed' && SG.paused && SG.pieces.length >= 3 && document.getElementById('arbar').style.display === 'flex'));
  await look([0.2, 0, 0], [0.2, -0.45, -0.8]); await p.mouse.click(700, 200); await frames(2); await p.click('#arLock'); await frames(3);
  const A2 = await ev(() => SG.ar);
  ok('tap, lock: the table sits at the new place and the match goes on with its pieces', A2.state === 'locked' && Math.abs(A2.pose.x - 0.2) < 1e-6 && Math.abs(A2.pose.z + 0.8) < 1e-6 && await ev(() => !SG.paused && SG.pieces.length >= 3 && SG.phase === 'build'), JSON.stringify(A2));

  /* a full bot match inside the session */
  await ev(() => { SG.hold = true; SG.noGuard = true; SG.auto(0, 'normal'); let g = 0; while (SG.phase === 'build' && g++ < 1300) SG.step(.1); SG.begin(); SG.step(SG.CONFIG.count + 12); });
  await look([0.75, 0.25, -0.2], [0.2, -0.45, -0.8]); await backdrop(); await ev(() => SG.render()); await p.waitForTimeout(600); await ev(() => SG.render());
  await p.screenshot({ path: path.join(SHOTS, 'ar-3-fight.png') });
  const m = await ev(() => { let g = 0; while (SG.phase !== 'over' && g++ < 400) SG.step(1); SG.render(); return { over: SG.phase === 'over', winner: SG.winner, stuck: SG.stats.stuck, shots: SG.stats.shots, built: SG.pieces.filter((q) => q.built).length, ar: SG.ar.on, state: SG.ar.state }; });
  ok('a full bot match runs inside the AR session and ends with a winner', m.over && m.winner >= 0 && m.stuck === 0 && m.shots > 5 && m.ar && m.state === 'locked', JSON.stringify(m));
  ok('the dev line shows the session state, hit tests, frame rate, draw calls and the anchor kind', await ev(() => { const t = document.getElementById('dev').textContent; return /AR locked/.test(t) && /hits\/s \d+/.test(t) && /fps \d+/.test(t) && /calls \d+/.test(t) && /anchor xr anchor/.test(t); }), await ev(() => document.getElementById('dev').textContent));
  ok('the slow-frame guard drops shadows and says so once', await ev(() => new Promise((r) => { SG.noGuard = false; const t0 = performance.now(); (function w() { if (!SG.ar.shadows || performance.now() - t0 > 9000) r(/shadows off/.test(document.getElementById('dev').textContent) || SG.ar.fps > 26); else requestAnimationFrame(w); })(); })));
  await ev(() => SG.arLeave()); await frames(3);
  ok('leaving AR ends the session and goes back to the title and the practice room', await ev(() => !SG.ar.on && SG.phase === 'start' && document.body.className === '' && __XRF.ended === 1 && document.getElementById('start').style.display === 'flex'));
  await p.click('#bPlay'); await frames(3); ok('  and the practice table still plays', await ev(() => SG.phase === 'build' && !SG.ar.on && SG.screen(0, 0).x > 500)); await p.close();

  /* no anchors, no overlay, and a saved card layout */
  p = await open({ supported: true, anchors: false, overlay: false });
  await p.evaluate(() => { try { localStorage.setItem('rtk.locked_placements.v1', JSON.stringify({ schema_version: 1, placements: [['blue_base', -304, 0, -90], ['red_base', 304, 0, 90], ['capture_flag', 0, 0, 0]].map((q) => ({ kind: q[0], transform_anchor_relative: { x_mm: q[1], y_mm: q[2], z_mm: 0, yaw_deg: q[3] } })) })); } catch (e) {} });
  await p.click('#bAR'); await p.waitForFunction('SG.ar.on'); await p.waitForTimeout(200); await p.mouse.click(590, 300); await p.waitForTimeout(150); await p.click('#arLock'); await p.waitForTimeout(200);
  ok('without anchors the lock keeps the fixed pose; without the overlay the session still runs', await p.evaluate(() => SG.ar.state === 'locked' && SG.ar.anchorKind === 'fixed pose' && SG.ar.overlay === 'none'));
  const hasStore = await p.evaluate(() => !!SG.savedCardLayout());
  if (hasStore) { ok('a saved card layout is offered after the lock', await p.evaluate(() => document.getElementById('arAsk').style.display === 'flex' && SG.phase === 'start'));
    await p.click('#arCards'); await p.waitForTimeout(150); ok('  and using it starts the match on that layout, in AR', await p.evaluate(() => SG.phase === 'build' && SG.layout.custom && Math.abs(SG.layout.bases.blue.x + 1.9) < 1e-6 && SG.ar.on));
    await p.evaluate(() => localStorage.removeItem('rtk.locked_placements.v1')); }
  await p.close();
  ok('no page errors in any of it', errs.length === 0, errs.join(' | '));
  console.log('test took ' + ((Date.now() - T0) / 1000).toFixed(0) + ' s');
  console.log(bad ? ('FAILED ' + bad + ' of ' + n) : ('ALL ' + n + ' PASSED'));
  await b.close(); process.exit(bad ? 1 : 0);
};
run();
