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
  p = await open({ supported: true, anchors: true, timeStep: 16 }, '?dev=1');   /* the session clock runs at 60 frames a second whatever this machine manages */
  const ev = (f, a) => p.evaluate(f, a);
  const frames = (k) => p.evaluate((k) => new Promise((r) => { let i = 0; (function f() { if (++i > k) r(); else requestAnimationFrame(f); })(); }), k || 3);
  /* the iPad is carried to a new place over a few frames (a real one never jumps a metre in one frame) */
  const look = async (pos, target) => { const from = await ev(() => __XRF.cam); for (let k = 1; k <= 5; k++) { await ev(([from, pos, target, k]) => { const m = (a, b) => a.map((v, i) => v + (b[i] - v) * k / 5); __XRF.cam = { pos: m(from.pos, pos), target: m(from.target, target) }; }, [from, pos, target, k]); await frames(1); } await frames(3); };
  const jump = async (pos, target) => { await ev(([pos, target]) => { __XRF.cam = { pos, target }; }, [pos, target]); await frames(3); };
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
  await ev(() => { __XRF.track = false; }); await frames(80);
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
  await ev(() => { SG.hold = true; SG.auto(0, 'normal'); let g = 0; while (SG.phase === 'build' && g++ < 1300) SG.step(.1); SG.begin(); SG.step(SG.CONFIG.count + 12); });
  await look([0.75, 0.25, -0.2], [0.2, -0.45, -0.8]); await backdrop(); await ev(() => SG.render()); await p.waitForTimeout(600); await ev(() => SG.render());
  await p.screenshot({ path: path.join(SHOTS, 'ar-3-fight.png') });
  const m = await ev(() => { let g = 0; while (SG.phase !== 'over' && g++ < 400) SG.step(1); SG.render(); return { over: SG.phase === 'over', winner: SG.winner, stuck: SG.stats.stuck, shots: SG.stats.shots, built: SG.pieces.filter((q) => q.built).length, ar: SG.ar.on, state: SG.ar.state }; });
  ok('a full bot match runs inside the AR session and ends with a winner', m.over && m.winner >= 0 && m.stuck === 0 && m.shots > 5 && m.ar && m.state === 'locked', JSON.stringify(m));
  ok('the dev line shows the session state, hit tests, frame rate, draw calls and the anchor kind', await ev(() => { const t = document.getElementById('dev').textContent; return /AR locked/.test(t) && /hits\/s \d+/.test(t) && /fps \d+/.test(t) && /calls \d+/.test(t) && /anchor xr anchor/.test(t); }), await ev(() => document.getElementById('dev').textContent));
  /* page touches are in use here, so XR selects are ignored and no in-scene buttons show */
  ok('with a working overlay the input path is page touches, with no in-scene buttons', await ev(() => { const n = SG.pieces.length; __XRF.tap(600, 400); return SG.ar.inputPath === 'page touches' && SG.ar.sceneUi === false && SG.ar.buttons.length === 0 && SG.pieces.length === n; }));
  ok('in AR the mats are outlines, not cloth, and Exit AR is always there', await ev(() => getComputedStyle(document.getElementById('bExit')).display !== 'none' && SG.debug.matLook().cloth === 0 && SG.debug.matLook().outline >= 4));
  /* a pose jump of over a metre: pause and ask, do not move the table */
  const before = await ev(() => { SG.start('blue', { seed: 3 }); SG.hold = false; return SG.ar.pose; }); await frames(3);
  await jump([2.6, 0.1, -0.4], [2.6, -0.45, -1.3]);
  const jm = await ev(() => ({ j: SG.ar.jumped, paused: SG.paused, pose: SG.ar.pose, ask: document.getElementById('arJump').style.display, rep: getComputedStyle(document.getElementById('bReplace')).display }));
  ok('a pose jump of more than 1 m pauses, asks, offers Re-place table, and leaves the table where it was', jm.j && jm.paused && jm.ask === 'flex' && jm.rep !== 'none' && jm.pose.x === before.x && jm.pose.z === before.z, JSON.stringify(jm));
  await p.click('#jFine'); ok('"Table is fine" carries on', await ev(() => !SG.ar.jumped && !SG.paused && document.getElementById('arJump').style.display === 'none'));
  /* a pose frozen for 2 seconds while the motion sensors say the iPad is moving */
  await frames(140); ok('a still pose with no motion events is NOT called lost (an iPad on a stand)', await ev(() => !SG.ar.lost && !SG.paused));
  await p.waitForTimeout(1600); await ev(() => { for (let i = 0; i < 3; i++) window.dispatchEvent(new DeviceMotionEvent('devicemotion', { rotationRate: { alpha: 90, beta: 10, gamma: 0 } })); }); await frames(4);
  ok('a pose frozen for 2 s while the iPad is moving is treated as tracking lost', await ev(() => SG.ar.lost && SG.paused && SG.arLogData().events.some((e) => /pose frozen/.test(e.kind))), JSON.stringify(await ev(() => [SG.ar.lost, SG.paused, SG.arLogData().events.slice(-3)])));
  await look([0.3, 0.1, -0.1], [0.2, -0.45, -0.8]); ok('and it comes back when the pose moves again', await ev(() => !SG.ar.lost && !SG.paused));
  /* the slow-frame guard: must NOT have tripped at 60 frames a second, and MUST trip at 60 ms a frame */
  ok('at 16 ms a frame the guard has not tripped', await ev(() => SG.ar.shadows === true && !/shadows off/.test(document.getElementById('dev').textContent)));
  await ev(() => { __XRF.timeStep = 60; }); await frames(40); const mid = await ev(() => SG.ar.shadows); await frames(40);
  ok('at 60 ms a frame it trips after about 3 seconds, drops shadows, and says so once', mid === true && await ev(() => SG.ar.shadows === false && (document.getElementById('dev').textContent.match(/shadows off/g) || []).length === 1), JSON.stringify([mid, await ev(() => document.getElementById('dev').textContent)]));
  await ev(() => { __XRF.timeStep = 16; });
  /* the AR log */
  const lg = await ev(() => SG.arLogData()); await p.click('#bLog'); const shown = await ev(() => document.getElementById('logText').value);
  ok('Copy AR log gives the agreed numbers and nothing about the camera or the room', lg.kind === 'round-table-kingdom-ar-log' && /rtk-ar/.test(lg.build) && /Mozilla/.test(lg.userAgent) && lg.overlay === 'screen' && lg.inputPath === 'page touches' && lg.anchorKind === 'xr anchor' && lg.fpsAverage > 0 && lg.worstFrameMs > 0 && lg.hitTestsPerSecond >= 0 && lg.tableSizeCm === 100
    && lg.events.some((e) => /tracking lost \(no pose\)/.test(e.kind) && e.t > 0) && lg.events.some((e) => /pose jumped/.test(e.kind)) && Array.isArray(lg.pageErrors) && lg.pageErrors.length === 0 && JSON.parse(shown).build === lg.build && !/camera|picture|room|plane/i.test(Object.keys(lg).join(' ')), JSON.stringify(lg).slice(0, 900));
  ok('the dev line carries the build label', await ev(() => /^rtk-ar-\d+/.test(document.getElementById('dev').textContent)));
  await ev(() => SG.arLeave()); await frames(3);
  ok('Exit AR ends the session and goes back to the title and the practice room', await ev(() => !SG.ar.on && SG.phase === 'start' && document.body.className === '' && __XRF.ended === 1 && document.getElementById('start').style.display === 'flex'));
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

  /* ---- no overlay at all: the buttons are drawn in the scene and every touch comes through XR select ---- */
  const scene = async (label, fake, firstTapPlaces) => {
    p = await open(Object.assign({ supported: true, timeStep: 16 }, fake)); const ev2 = (f, a) => p.evaluate(f, a), fr = (k) => p.evaluate((k) => new Promise((r) => { let i = 0; (function f() { if (++i > k) r(); else requestAnimationFrame(f); })(); }), k || 3);
    const tap = async (x, y) => { await ev2(([x, y]) => __XRF.tap(x, y), [x, y]); await fr(3); }, btn = async (id) => { const q = await ev2((id) => SG.sceneButtonXY(id), id); if (!q) return false; await tap(q.x, q.y); return true; };
    await p.click('#bAR'); await p.waitForFunction('SG.ar.on'); await fr(4);
    if (firstTapPlaces) { ok(label + ': at first the overlay is trusted and no scene buttons show', await ev2(() => SG.ar.sceneUi === false)); await tap(590, 300); await p.waitForTimeout(500); await fr(4);
      ok(label + ': a tap seen by XR select that never reaches the page turns the in-scene buttons on', await ev2(() => SG.ar.sceneUi && SG.ar.inputPath === 'xr select' && SG.ar.state === 'placed'), JSON.stringify(await ev2(() => SG.ar))); }
    else { await fr(100); ok(label + ': 1.5 seconds in with no overlay, the buttons are drawn in the scene', await ev2(() => SG.ar.sceneUi && SG.ar.overlay === 'none' && SG.ar.buttons.indexOf('exit') >= 0), JSON.stringify(await ev2(() => SG.ar)));
      await tap(590, 300); ok(label + ': a tap through XR select places the table', await ev2(() => SG.ar.state === 'placed' && SG.ar.inputPath === 'xr select')); }
    const s0 = await ev2(() => SG.ar.size); await btn('bigger'); await btn('arL');
    ok(label + ': the scene buttons turn and resize the table', await ev2((s0) => SG.ar.size === s0 + 10 && Math.abs(SG.ar.pose.yaw - Math.PI / 12) < 1e-6, s0));
    await ev2(() => { __XRF.press(400, 300); }); await fr(2); for (let k = 1; k <= 5; k++) { await ev2((k) => __XRF.drag(400 + k * 20, 300), k); await fr(2); } await ev2(() => __XRF.release()); await fr(2);
    ok(label + ': a held select dragged sideways turns the table (drags work on this path)', await ev2(() => Math.abs(SG.ar.pose.yaw - Math.PI / 12 - 0.8) < 0.15), JSON.stringify(await ev2(() => SG.ar.pose)));
    await ev2(() => { SG.arTurn(-SG.ar.pose.yaw); SG.arResize(100); }); await btn('lock'); await fr(3);
    ok(label + ': the Lock table scene button locks and the build starts, with Done and Exit AR in the scene', await ev2(() => SG.ar.state === 'locked' && SG.phase === 'build' && ['done', 'undo', 'replace', 'exit'].every((b) => SG.ar.buttons.indexOf(b) >= 0)), JSON.stringify(await ev2(() => SG.ar.buttons)));
    await ev2(() => { SG.hold = true; }); const A = await ev2(() => SG.ar), pose = { x: A.pose.x, y: A.pose.y, z: A.pose.z, yaw: A.pose.yaw, unit: A.unitMetres };
    const sc = (x, z) => ev2(([x, z, pose]) => { const k = pose.unit, c = Math.cos(pose.yaw), s = Math.sin(pose.yaw); return __XRF.project([pose.x + (x * c + z * s) * k, pose.y, pose.z + (-x * s + z * c) * k]); }, [x, z, pose]);
    const k0 = await ev2(() => SG.sides[0].kit[0]); let q = await sc(k0.x, k0.z); await tap(q.x, q.y); q = await sc(0, 1.3); await tap(q.x, q.y);
    const k7 = await ev2(() => SG.sides[0].kit[7]), a = await sc(k7.x, k7.z), c = await sc(-1.0, 1.9);
    await ev2(([a]) => __XRF.press(a.x, a.y), [a]); await fr(2); for (let k = 1; k <= 4; k++) { await ev2(([a, c, k]) => __XRF.drag(a.x + (c.x - a.x) * k / 4, a.y + (c.y - a.y) * k / 4), [a, c, k]); await fr(2); } await ev2(() => __XRF.release()); await fr(2);
    const pcs = await ev2(() => SG.pieces.filter((x) => x.side === 0).map((x) => ({ kind: x.kind, x: x.x, z: x.z })));
    ok(label + ': a tapped wall and a dragged tower land where the finger was', pcs.length === 2 && Math.hypot(pcs[0].x, pcs[0].z - 1.3) < 0.03 && pcs[1].kind === 'tower' && Math.hypot(pcs[1].x + 1.0, pcs[1].z - 1.9) < 0.03, JSON.stringify(pcs));
    await btn('undo'); ok(label + ': Undo', await ev2(() => SG.pieces.filter((x) => x.side === 0).length === 1));
    await ev2(() => SG.demo(11, 0)); await btn('done'); ok(label + ': Done ends the build; Start battle is offered in the scene', await ev2(() => SG.phase === 'ready' && SG.ar.buttons.indexOf('start') >= 0));
    await btn('start'); await ev2(() => { SG.step(SG.CONFIG.count + .1); SG.sides[1].bot = false; SG.stepUntil(() => SG.debug.crewReady(0), 15); SG.sides[0].reload = 0; }); await fr(3);
    ok(label + ': the fight shows Squad, Lobber, Mend, Pause and Exit AR in the scene', await ev2(() => SG.phase === 'fight' && ['squad', 'lobber', 'mend', 'pause', 'exit'].every((b) => SG.ar.buttons.indexOf(b) >= 0)), JSON.stringify(await ev2(() => SG.ar.buttons)));
    if (label === 'overlay missing') { await ev2(() => { document.body.style.background = 'linear-gradient(#6f7780,#3d4248)'; SG.render(); }); await fr(2); await p.screenshot({ path: path.join(SHOTS, 'ar-4-scene-buttons.png') }); }
    q = await sc(0.1, 0.3); await tap(q.x, q.y); ok(label + ': a tap sends the squad', await ev2(() => SG.sides[0].order && Math.hypot(SG.sides[0].order.x - 0.1, SG.sides[0].order.z - 0.3) < 0.05));
    await btn('lobber'); const d0 = await sc(-1.0, 1.4), d1 = await sc(-1.0, 2.3);
    await ev2(([d0]) => __XRF.press(d0.x, d0.y), [d0]); await fr(2); for (let k = 1; k <= 4; k++) { await ev2(([d0, d1, k]) => __XRF.drag(d0.x + (d1.x - d0.x) * k / 4, d0.y + (d1.y - d0.y) * k / 4), [d0, d1, k]); await fr(2); }
    const aiming = await ev2(() => SG.sides[0].aim.on); await ev2(() => __XRF.release()); await fr(2);
    ok(label + ': Lobber, then drag back and let go fires a marble', aiming && await ev2(() => SG.sides[0].tool === 'lobber' && SG.stats.shots === 1));
    await btn('mend'); ok(label + ': Mend', await ev2(() => SG.sides[0].tool === 'mend'));
    await btn('pause'); ok(label + ': Pause, and Re-place table appears', await ev2(() => SG.paused && SG.ar.buttons.indexOf('replace') >= 0));
    await btn('replace'); ok(label + ': Re-place table unlocks the table', await ev2(() => SG.ar.state === 'placed'));
    await btn('lock'); await btn('exit'); await fr(3);
    ok(label + ': Exit AR in the scene ends the session', await ev2(() => !SG.ar.on && SG.phase === 'start' && __XRF.ended === 1));
    await p.close(); };
  await scene('overlay missing', { overlay: false }, false);
  await scene('overlay present but deaf', { overlay: true }, true);
  /* Exit AR works even if the session never answers */
  p = await open({ supported: true, timeStep: 16 }); await p.click('#bAR'); await p.waitForFunction('SG.ar.on');
  await p.evaluate(() => { __XRF.session.end = () => new Promise(() => {}); SG.arLeave(); }); await p.waitForTimeout(1100);
  ok('Exit AR tidies up even when the session never answers', await p.evaluate(() => !SG.ar.on && SG.phase === 'start' && document.body.className === '')); await p.close();
  ok('no page errors in any of it', errs.length === 0, errs.join(' | '));
  console.log('test took ' + ((Date.now() - T0) / 1000).toFixed(0) + ' s');
  console.log(bad ? ('FAILED ' + bad + ' of ' + n) : ('ALL ' + n + ' PASSED'));
  await b.close(); process.exit(bad ? 1 : 0);
};
run();
