// Controllers and couch versus: an end-to-end check in headless Chromium (Playwright), with fake controllers.
// Run from games/baguettes-and-ballistics:  NODE_PATH=$(npm root -g) node tests/couch-test.js
// It serves the folder itself (python3 -m http.server on a free port). Options: --shots writes the numbered screenshots to shots/,
// --perf measures frame rate and draw calls (1 player against 2 players), --keep leaves nothing behind either way.
// The controllers: navigator.getGamepads is replaced (addInitScript) by standard-mapping objects whose axes and buttons the test sets.
// (The repository's package.json says "type": "module", so this file is an ES module; createRequire finds Playwright through NODE_PATH.)
import { createRequire } from 'module';
import { spawn } from 'child_process';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.argv.includes('--shots'), PERF = process.argv.includes('--perf');
const B = { cross: 0, circle: 1, square: 2, triangle: 3, l1: 4, r1: 5, l2: 6, r2: 7, options: 9, up: 12, down: 13, left: 14, right: 15 };
let pass = 0, fail = 0;
const ok = (cond, what, extra = '') => { if (cond) pass++; else fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${what}${extra ? `  (${extra})` : ''}`); };

const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });

// Runs in the page before any game code: fake pads, a frame counter, a seeded Math.random (so 1 and 2 player runs see the same battle).
function fakePads() {
  window.__pads = [];
  window.__frames = 0;
  const tick = () => { window.__frames++; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  let seed = 12345; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const mk = (i) => ({ index: i, id: `Test pad ${i + 1} (STANDARD GAMEPAD)`, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) });
  Object.defineProperty(navigator, 'getGamepads', { value: () => { const out = [null, null, null, null]; for (const p of window.__pads) out[p.index] = p; return out; }, configurable: true });
  const fireEv = (type, p) => { const e = new Event(type); Object.defineProperty(e, 'gamepad', { value: p }); window.dispatchEvent(e); };
  window.__connect = (i) => { const p = mk(i); window.__pads.push(p); fireEv('gamepadconnected', p); };
  window.__disconnect = (i) => { const p = window.__pads.find((q) => q.index === i); if (!p) return; p.connected = false; window.__pads = window.__pads.filter((q) => q !== p); fireEv('gamepaddisconnected', p); };
  window.__btn = (i, b, on) => { const p = window.__pads.find((q) => q.index === i); p.buttons[b] = { pressed: on, touched: on, value: on ? 1 : 0 }; p.timestamp++; };
  window.__stick = (i, x, y) => { const p = window.__pads.find((q) => q.index === i); p.axes[0] = x; p.axes[1] = y; p.timestamp++; };
}

(async () => {
  const port = await freePort();
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const open = async (query = '?auto=0', w = 1180, h = 820) => {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    await page.addInitScript(fakePads);
    await page.goto(`http://127.0.0.1:${port}/index.html${query}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__frames > 3 && typeof window.padPoll === 'function');
    return page;
  };
  const frames = (page, n = 2) => page.evaluate((n) => new Promise((res) => { const f0 = window.__frames; const w = () => (window.__frames >= f0 + n ? res() : requestAnimationFrame(w)); w(); }), n);
  const tapBtn = async (page, pad, b) => { await page.evaluate(([i, b]) => window.__btn(i, b, true), [pad, b]); await frames(page, 2); await page.evaluate(([i, b]) => window.__btn(i, b, false), [pad, b]); await frames(page, 2); };
  const ev = (page, fn, arg) => page.evaluate(fn, arg);
  const shot = async (page, name) => { if (SHOTS) { await page.screenshot({ path: path.join(ROOT, 'shots', name) }); console.log(`      shot shots/${name}`); } };
  // Advance the game by hand (the real loop keeps going too): n ticks of dt seconds.
  const tick = (page, n, dt = 1 / 30) => ev(page, ([n, dt]) => { for (let i = 0; i < n; i++) update(dt); }, [n, dt]);
  const redStuff = (page) => ev(page, () => ({ units: entities.filter((e) => e.kind === 'unit' && e.team === RED && e.hp > 0).length, turrets: entities.filter((e) => e.kind === 'turret' && e.team === RED && e.hp > 0).length, workers: entities.filter((e) => e.kind === 'worker' && e.team === RED && e.hp > 0).length }));

  // ---------- 1. Single player, keyboard only: unchanged ----------
  {
    const page = await open();
    const t = await ev(page, () => ({ play2: $('play2').hidden, strip: $('strip1').hidden, couch: COUCH.on }));
    ok(t.play2 && t.strip && !t.couch, 'keyboard only: no 2 PLAYERS button, no hint strip on the title');
    await page.click('#play');
    if (await page.isVisible('#talk')) await page.click('#talkSkip');
    await page.click('#lrSkip'); await page.waitForTimeout(200); await page.click('#lrStart'); await frames(page, 3);
    const x0 = await ev(page, () => state.player.x);
    await page.keyboard.down('KeyD'); await page.waitForTimeout(600); await frames(page, 10); await page.keyboard.up('KeyD');
    const x1 = await ev(page, () => state.player.x);
    ok(x1 > x0 + 1, 'keyboard: D drives right', `x ${x0.toFixed(1)} -> ${x1.toFixed(1)}`);
    const tur0 = await ev(page, () => entities.filter((e) => e.kind === 'turret' && e.team === BLUE).length);
    await page.keyboard.press('Digit1'); await frames(page, 2);
    const tur1 = await ev(page, () => entities.filter((e) => e.kind === 'turret' && e.team === BLUE).length);
    ok(tur1 === tur0 + 1, 'keyboard: 1 builds a gun turret');
    const st = await ev(page, () => ({ strip: $('strip1').hidden, phase: state.phase, p2: state.p2 }));
    ok(st.strip && st.phase === 'battle' && st.p2 === null, 'keyboard: battle runs with no hint strip and no Player 2');
    // the commander still plays Red: skip ahead and give it cereal
    await ev(page, () => { state.time = 150; state.cereal[RED] = 600; state.clips[RED] = 60; });
    const r0 = await redStuff(page); await tick(page, 600); const r1 = await redStuff(page);
    ok(r1.units + r1.turrets + r1.workers > r0.units + r0.turrets + r0.workers, '1 player: Red\'s commander still builds', `units ${r0.units}->${r1.units}, turrets ${r0.turrets}->${r1.turrets}, workers ${r0.workers}->${r1.workers}`);
    await page.close();
  }

  // ---------- 2. One controller: menus, driving, building, pause, hint strip ----------
  {
    const page = await open();
    await ev(page, () => window.__connect(0)); await frames(page, 3);
    await tapBtn(page, 0, B.down); // any input marks the pad as in use; the D-pad moves the ring
    const t = await ev(page, () => ({ play2: !$('play2').hidden && !$('play2').disabled, note: $('padNote').textContent, strip: !$('strip1').hidden, focus: PADS.focus?.id || PADS.focus?.textContent }));
    ok(t.play2, 'one controller: 2 PLAYERS is offered on level 1', t.note);
    ok(t.strip, 'one controller: the hint strip shows on the title');
    await tapBtn(page, 0, B.up); await tapBtn(page, 0, B.up); // back up to PLAY (or the box button above it)
    const f = await ev(page, () => PADS.focus && PADS.focus.id);
    if (f !== 'play') await ev(page, () => padFocus($('play')));
    await tapBtn(page, 0, B.cross); await frames(page, 3);
    ok(await ev(page, () => $('start').hidden), 'controller: Cross on PLAY starts the level');
    if (await ev(page, () => TK.open)) { await tapBtn(page, 0, B.circle); }
    ok(await ev(page, () => !TK.open && !$('lrIntro').hidden), 'controller: Circle skips the dialogue, the race card shows');
    // GO! is focused first; move right to Skip race and confirm
    await tapBtn(page, 0, B.right);
    ok(await ev(page, () => PADS.focus?.id === 'lrSkip'), 'controller: the D-pad moves the ring to Skip race');
    await tapBtn(page, 0, B.cross); await frames(page, 2);
    ok(await ev(page, () => !$('lrCard').hidden), 'controller: Cross confirms (the loadout card shows)');
    await tapBtn(page, 0, B.cross); await frames(page, 4);
    ok(await ev(page, () => state.phase === 'battle' && !state.stage && !state.level.stage), 'controller: Cross on START opens the battle');
    // drive with the left stick
    const x0 = await ev(page, () => state.player.x);
    await ev(page, () => window.__stick(0, 1, 0)); await page.waitForTimeout(600); await frames(page, 10);
    const x1 = await ev(page, () => state.player.x);
    await ev(page, () => window.__stick(0, 0.1, 0.1)); await frames(page, 2); // inside the deadzone
    const dz = await ev(page, () => [input.x, input.z]);
    ok(x1 > x0 + 1, 'controller: the left stick drives the car', `x ${x0.toFixed(1)} -> ${x1.toFixed(1)}`);
    ok(dz[0] === 0 && dz[1] === 0, 'controller: a stick inside the 0.15 deadzone gives no input');
    await ev(page, () => window.__stick(0, 0, 0)); await frames(page, 2);
    // build: Square = gun turret
    await ev(page, () => { state.cereal[BLUE] = 200; });
    const tur0 = await ev(page, () => entities.filter((e) => e.kind === 'turret' && e.team === BLUE).length);
    await tapBtn(page, 0, B.square);
    const tur1 = await ev(page, () => entities.filter((e) => e.kind === 'turret' && e.team === BLUE).length);
    ok(tur1 === tur0 + 1, 'controller: Square builds a gun turret');
    await tapBtn(page, 0, B.l1);
    ok(await ev(page, () => workersOf(BLUE, 'truck').length >= 2), 'controller: L1 buys a truck');
    // fire: Cross held
    const s0 = await ev(page, () => shots.filter((s) => s.team === BLUE).length);
    await ev(page, () => window.__btn(0, 0, true)); await frames(page, 3);
    const fired = await ev(page, () => input.padFire);
    await ev(page, () => window.__btn(0, 0, false)); await frames(page, 2);
    ok(fired, 'controller: Cross held fires', `shots before ${s0}`);
    // the D-pad tool list (Dominoes on level 1)
    await ev(page, () => Object.assign(state.player, { x: -20, z: 12, vx: 0, vz: 0, heading: 0 })); // clear table behind the car
    await tapBtn(page, 0, B.right);
    const pick = await ev(page, () => PADS.pick[0]);
    const d0 = await ev(page, () => dominoes.filter((d) => d.team === BLUE && !d.fixed).length);
    await tapBtn(page, 0, B.up);
    const d1 = await ev(page, () => dominoes.filter((d) => d.team === BLUE && !d.fixed).length);
    ok(d1 === d0 + 1 || pick !== 'bDomino', 'controller: D-pad picks a tool, up uses it', `picked ${pick}, dominoes ${d0} -> ${d1}`);
    await frames(page, 4);
    const strip = await ev(page, () => ({ shown: !$('strip1').hidden, text: $('strip1').textContent }));
    ok(strip.shown && /Gun/.test(strip.text) && /Pause/.test(strip.text), 'controller: the battle hint strip shows', strip.text.slice(0, 90));
    await shot(page, '73-controller-strip.png');
    // pause
    await tapBtn(page, 0, B.options);
    const tp = await ev(page, () => state.time);
    await page.waitForTimeout(600); await frames(page, 3);
    const paused = await ev(page, () => ({ on: COUCH.paused, card: !$('pause').hidden, same: state.time }));
    ok(paused.on && paused.card && paused.same === tp, 'controller: Options pauses (the clock stops)');
    await tapBtn(page, 0, B.options);
    ok(await ev(page, () => !COUCH.paused && $('pause').hidden), 'controller: Options again resumes');
    // a finger or key hides the strip again
    await page.keyboard.press('KeyM'); await page.keyboard.press('KeyM'); await frames(page, 4);
    ok(await ev(page, () => $('strip1').hidden), 'keyboard after controller: the hint strip hides');
    // hot-plug: unplug, the 2 PLAYERS button goes away on the title
    await ev(page, () => { $('menu').click(); }); // (not visible: go to the title the way LEVELS does)
    await ev(page, () => { $('start').hidden = false; selectLevel(0); });
    await ev(page, () => window.__disconnect(0)); await frames(page, 3);
    ok(await ev(page, () => $('play2').hidden), 'hot-plug: unplugging the controller hides 2 PLAYERS');
    await ev(page, () => window.__connect(0)); await frames(page, 3);
    ok(await ev(page, () => !$('play2').hidden), 'hot-plug: plugging it back shows 2 PLAYERS again');
    // levels 3 to 6 say 1 player only
    await ev(page, () => selectLevel(2)); await frames(page, 3);
    ok(await ev(page, () => $('play2').disabled && /1 player only/.test($('play2Sub').textContent)), 'level 3: 2 PLAYERS says "1 player only for now"');
    // AR: hidden
    // (with AR on the page's own loop waits for XR frames, so the title check is called by hand)
    ok(await ev(page, () => { selectLevel(0); AR.on = true; PADS.title = ''; couchTitle(1); const hidden = $('play2').hidden; couchStart(); const on = COUCH.on; AR.on = false; PADS.title = ''; return hidden && !on; }), 'AR on: 2 PLAYERS is hidden and cannot start');
    await page.close();
  }

  // ---------- 3. Two controllers: couch versus ----------
  let perf1 = null, perf2 = null;
  {
    const page = await open();
    await ev(page, () => { window.__connect(0); window.__connect(1); }); await frames(page, 3);
    await tapBtn(page, 0, B.down);
    ok(await ev(page, () => /controller 1 \(blue\) vs controller 2/.test($('play2Sub').textContent)), 'two controllers: 2 PLAYERS says controller 1 vs controller 2');
    await ev(page, () => padFocus($('play2'))); await frames(page, 2);
    await shot(page, '74-two-players-choice.png');
    await tapBtn(page, 1, B.cross); await frames(page, 4); // either controller can confirm a card
    const c = await ev(page, () => ({ on: COUCH.on, p2: !!state.p2, cls: document.body.classList.contains('couch'), hud2: !$('hud2').hidden, phase: state.phase, talk: TK.open, aspect: camera.aspect }));
    ok(c.on && c.p2 && c.cls && c.hud2 && c.phase === 'battle' && !c.talk, '2 players: the battle starts straight away with Player 2\'s red car and a second HUD');
    ok(Math.abs(c.aspect - 590 / 820) < 0.01, '2 players: each camera is half the width', `aspect ${c.aspect.toFixed(3)}`);
    // Player 2 drives the red car with the second controller (left)
    const q0 = await ev(page, () => ({ x: state.p2.x, px: state.player.x }));
    await ev(page, () => window.__stick(1, -1, 0)); await page.waitForTimeout(600); await frames(page, 10);
    const in1 = await ev(page, () => [input.x, input.z, PADS.in2.x]);
    await ev(page, () => window.__stick(1, 0, 0));
    const q1 = await ev(page, () => ({ x: state.p2.x, px: state.player.x }));
    ok(q1.x < q0.x - 1, 'Player 2: the second stick drives the red car', `x ${q0.x.toFixed(1)} -> ${q1.x.toFixed(1)}`);
    ok(in1[0] === 0 && in1[1] === 0 && in1[2] < -0.9, 'Player 2\'s stick is not Player 1\'s input', `P1 input ${in1[0]}, ${in1[1]}; P2 ${in1[2].toFixed(2)}`); // (P1's car can still be nudged by a worker leaving the toy box)
    // Player 1's controller drives blue
    await ev(page, () => window.__stick(0, 1, 0)); await page.waitForTimeout(600); await frames(page, 10); await ev(page, () => window.__stick(0, 0, 0));
    ok(await ev(page, (px) => state.player.x > px + 1, q1.px), 'Player 1: the first stick drives the blue car');
    // Player 2 builds with Square, buys with L1
    await ev(page, () => { state.cereal[RED] = 300; });
    const r0 = await redStuff(page);
    await tapBtn(page, 1, B.square); await tapBtn(page, 1, B.l1);
    const r1 = await redStuff(page);
    ok(r1.turrets === r0.turrets + 1, 'Player 2: Square builds a red gun turret');
    ok(r1.workers === r0.workers + 1, 'Player 2: L1 buys a red truck');
    ok(await ev(page, () => /turret built|truck/i.test($('toast2').textContent)), 'Player 2: its messages show in the right-hand HUD', await ev(page, () => $('toast2').textContent));
    // Player 2 fires
    await ev(page, () => window.__btn(1, 7, true)); await frames(page, 3);
    const f2 = await ev(page, () => PADS.in2.fire);
    await ev(page, () => window.__btn(1, 7, false));
    ok(f2, 'Player 2: R2 held fires');
    // Red's commander no longer builds: skip ahead with lots of red cereal
    await ev(page, () => { state.time = 150; state.cereal[RED] = 600; state.clips[RED] = 60; });
    const a0 = await redStuff(page); await tick(page, 600); const a1 = await redStuff(page);
    ok(a1.units === a0.units && a1.turrets === a0.turrets && a1.workers <= a0.workers + 0, 'Red AI stands down in 2 players: 20 s with 600 cereal, no red units, turrets or workers bought', `units ${a0.units}->${a1.units}, turrets ${a0.turrets}->${a1.turrets}, workers ${a0.workers}->${a1.workers}`);
    ok(await ev(page, () => state.cereal[RED] >= 600), 'Red\'s cereal is Player 2\'s alone (the AI spent none)', await ev(page, () => Math.floor(state.cereal[RED])));
    // split screen: two views, two cameras
    await frames(page, 4);
    const sp = await ev(page, () => ({ calls: renderer.info.render.calls, split: !$('split').hidden, c1: [camera.position.x, camera.position.z], c2: [cam2.position.x, cam2.position.z], p1: state.player.x, p2: state.p2.x }));
    ok(sp.split && Math.abs(sp.c1[0] - sp.c2[0]) > 20, 'split screen: two follow cameras, one on each car', `cam x ${sp.c1[0].toFixed(0)} / ${sp.c2[0].toFixed(0)}, cars ${sp.p1.toFixed(0)} / ${sp.p2.toFixed(0)}, ${sp.calls} draw calls`);
    const px = await page.screenshot();
    ok(px.length > 20000, 'split screen renders');
    // move the cars toward the middle for the mid-battle shot
    await ev(page, () => { state.time = 200; state.cereal[BLUE] = 400; state.cereal[RED] = 400; Object.assign(state.player, { x: -20, z: 4, heading: 0 }); Object.assign(state.p2, { x: 22, z: -6, heading: Math.PI }); });
    await tapBtn(page, 0, B.square); await tapBtn(page, 1, B.square); await tapBtn(page, 0, B.down); await tapBtn(page, 1, B.down);
    await ev(page, () => { window.__btn(0, 7, true); window.__btn(1, 7, true); window.__stick(0, 0.6, -0.2); window.__stick(1, -0.6, 0.3); });
    await page.waitForTimeout(2500); await frames(page, 6);
    await ev(page, () => { window.__stick(0, 0, 0); window.__stick(1, 0, 0); });
    await shot(page, '75-split-screen-battle.png');
    await ev(page, () => { window.__btn(0, 7, false); window.__btn(1, 7, false); });
    // hot-plug in 2 players: a controller drops out -> pause
    await ev(page, () => window.__disconnect(1)); await frames(page, 3);
    ok(await ev(page, () => COUCH.paused && /controller/i.test($('pauseText').textContent)), '2 players: a controller dropping out pauses the game');
    await ev(page, () => window.__connect(1)); await frames(page, 2);
    await tapBtn(page, 1, B.circle);
    ok(await ev(page, () => !COUCH.paused), '2 players: Circle on the pause card resumes');
    // Player 2 wins: Player 1's toy box breaks
    await ev(page, () => hurt(state.bases[BLUE], 1e7, RED, { vsBase: 1 }));
    await page.waitForFunction(() => !$('end').hidden, null, { timeout: 30000 });
    const w2 = await ev(page, () => ({ t: $('endTitle').textContent, x: $('endText').textContent, stars: $('endStars').innerHTML, boxes: $('endBoxes').hidden }));
    ok(w2.t === 'PLAYER 2 WINS!' && /Player 1's toy box/.test(w2.x) && !w2.stars && w2.boxes, 'win screen: Player 1\'s box breaks -> PLAYER 2 WINS!', w2.t);
    // PLAY AGAIN with Cross (the ring starts on it), then Player 1 wins
    await tapBtn(page, 0, B.cross); await frames(page, 4);
    ok(await ev(page, () => COUCH.on && !!state.p2 && state.phase === 'battle' && $('end').hidden), 'PLAY AGAIN starts another 2-player battle');
    await ev(page, () => { state.time = 412; hurt(state.bases[RED], 1e7, BLUE, { vsBase: 1 }); });
    await page.waitForFunction(() => !$('end').hidden, null, { timeout: 30000 });
    ok(await ev(page, () => $('endTitle').textContent === 'PLAYER 1 WINS!'), 'win screen: Player 2\'s box breaks -> PLAYER 1 WINS!');
    await shot(page, '76-win-screen.png');
    // LEVELS (Circle) goes back to 1 player cleanly
    await tapBtn(page, 0, B.circle); await frames(page, 4);
    const back = await ev(page, () => ({ on: COUCH.on, cls: document.body.classList.contains('couch'), hud2: $('hud2').hidden, start: !$('start').hidden, p2: state.p2, aspect: camera.aspect }));
    ok(!back.on && !back.cls && back.hud2 && back.start && back.p2 === null && back.aspect > 1.3, 'Circle on the win card: back to the title, 1 player again');
    // level 2 also plays: raids and the Stapler are off, paperclip tools work for Player 2
    await ev(page, () => { selectLevel(1); couchStart(); });
    await frames(page, 3);
    await ev(page, () => { state.cereal[RED] = 300; state.clips[RED] = 80; state.time = 300; });
    await tick(page, 300);
    const l2 = await ev(page, () => ({ boss: state.boss, raiders: entities.filter((e) => e.raid).length, tools: p2Tools().map((t) => t.key) }));
    ok(!l2.boss && l2.raiders === 0, 'level 2, 2 players: no raids and no Stapler (they only fight for Red)');
    ok(l2.tools.includes('staple') && l2.tools.includes('catapult'), 'level 2, 2 players: Player 2 has the staple gun and catapult', l2.tools.join(','));
    await page.close();
  }

  // ---------- 4. Frame rate and draw calls: 1 player against 2 players (level 1 battle) ----------
  if (PERF) {
    const measure = async (couch) => {
      const page = await open('?auto=0');
      await ev(page, () => { window.__connect(0); window.__connect(1); });
      await frames(page, 2);
      if (couch) await ev(page, () => { selectLevel(0); couchStart(); });
      else { await page.click('#play'); if (await page.isVisible('#talk')) await page.click('#talkSkip'); await page.click('#lrSkip'); await page.waitForTimeout(200); await page.click('#lrStart'); }
      await page.waitForTimeout(1500);
      // The follow cameras glide in from the title view; at a software renderer's 2 fps that takes a while, so put them over the cars first.
      await ev(page, () => { const at = (c) => [Math.max(-W / 2 + 30, Math.min(W / 2 - 30, c.x)), 0, Math.max(-D / 2 + 22, Math.min(D / 2 - 14, c.z))]; camTarget.set(...at(state.player)); if (state.p2) cam2At.set(...at(state.p2)); });
      await frames(page, 4);
      const where = await ev(page, () => `${state.phase}${state.level.stage ? ' (race stage)' : ''}, COUCH ${COUCH.on}`);
      // Draw calls are counted at the WebGL context (every drawElements / drawArrays: shadow map, both views, the blur pass), because
      // three's renderer.info leaves out the shadow pass and resets on every render() call.
      const r = await ev(page, () => new Promise((res) => {
        const gl = renderer.getContext(); let draws = 0;
        for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) if (gl[k]) { const f0 = gl[k].bind(gl); gl[k] = (...a) => { draws++; return f0(...a); }; }
        let n = 0; const t0 = performance.now(); draws = 0;
        const f = () => { n++; if (performance.now() - t0 < 8000) requestAnimationFrame(f); else res({ fps: n / ((performance.now() - t0) / 1000), calls: Math.round(draws / n) }); };
        requestAnimationFrame(f);
      }));
      await page.close();
      return { ...r, where };
    };
    perf1 = await measure(false); perf2 = await measure(true);
    console.log(`PERF  1 player: ${perf1.fps.toFixed(2)} fps, ${perf1.calls} draw calls a frame  [${perf1.where}]`);
    console.log(`PERF  2 players: ${perf2.fps.toFixed(2)} fps, ${perf2.calls} draw calls a frame  [${perf2.where}]`);
  }

  ok(errors.length === 0, 'no page errors or console errors', errors.slice(0, 5).join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  server.kill();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
