/* Round Table Kingdom build-step test. Run: NODE_PATH=$(npm root -g) node tests/build-test.js */
/* The repo is "type": "module", so this file is an ES module; playwright is found through NODE_PATH. */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require('playwright');
const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  let n = 0, bad = 0;
  const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra && !cond ? '  -> ' + extra : '')); };
  const ev = (f, a) => p.evaluate(f, a);
  await p.addInitScript(() => { window.MINE = () => SG.pieces.filter((q) => q.side === 0); window.MICE = () => SG.mice.filter((m) => m.side === 0); });
  const tapWorld = async (x, z) => { const s = await ev(([x, z]) => SG.screen(x, z), [x, z]); await p.mouse.click(s.x, s.y); };
  const tapSlot = async (i) => { const s = await ev((i) => SG.screen(SG.kit[i].x, SG.kit[i].z, .07), i); await p.mouse.click(s.x, s.y); };

  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__done', null, { timeout: 60000 });
  ok('page loads with 0 errors', errs.length === 0, errs.join(' | '));
  ok('start screen shows the title and the mock note', await ev(() => document.getElementById('start').style.display !== 'none' && /Round Table Kingdom/.test(document.querySelector('#start h1').textContent) && /Mock table/.test(document.getElementById('start').textContent)));
  await p.click('#tRed'); await p.click('#tBlue'); await p.click('#bPlay');
  await ev(() => { SG.hold = true; });   /* the test drives time itself */
  ok('Play starts the build phase: 2:00, 11 kit pieces, 5 mice a side', await ev(() => SG.phase === 'build' && SG.time > 119 && SG.time <= 120 && SG.kit.length === 11 && SG.mice.filter((m) => m.side === 0).length === 5 && SG.mice.length === 10 && SG.team === 'blue'));

  /* placing by taps */
  await tapSlot(0);
  ok('tapping a wall on the mat selects it', await ev(() => SG.sel === 0));
  await tapWorld(0, 1.25);
  ok('tapping the table places the wall', await ev(() => MINE().length === 1 && MINE()[0].kind === 'wall' && Math.abs(MINE()[0].z - 1.25) < .03 && SG.kit[0].used));
  ok('the next wall is selected, with its ghost beside the first wall and valid', await ev(() => SG.sel === 1 && SG.ghost.ok && Math.abs(Math.abs(SG.ghost.sx - MINE()[0].x) - 2 * SG.FOOT.wall[0]) < .01 && Math.abs(SG.ghost.sz - MINE()[0].z) < .01));
  await tapWorld(.72, 1.3);
  ok('a second wall snaps end to end', await ev(() => { const a = MINE()[0], c = MINE()[1]; return MINE().length === 2 && Math.abs((c.x - SG.FOOT.wall[0]) - (a.x + SG.FOOT.wall[0])) < .005 && Math.abs(c.z - a.z) < .005; }), JSON.stringify(await ev(() => MINE())));
  await tapSlot(7); await p.keyboard.press('q');
  ok('Q turns the ghost', await ev(() => SG.sel === 7 && Math.abs(SG.ghost.rot - Math.PI / 12) < 1e-6));
  await p.keyboard.press('e'); await tapWorld(-1.2, 1.75);
  ok('the tower is placed by taps', await ev(() => MINE().length === 3 && MINE()[2].kind === 'tower'));

  /* refusals */
  const refuse = async (name, x, z, code) => { await tapSlot(2); await tapWorld(x, z); const r = await ev(() => ({ n: MINE().length, code: SG.msg.code, text: SG.msg.text, bad: SG.ghost.ok === false })); await p.waitForTimeout(80);
    const shown = await ev(() => document.getElementById('say').className === 'bad' && document.getElementById('say').textContent.length > 5);
    ok('refused: ' + name + ' ("' + r.text + '")', r.n === 3 && r.code === code && r.bad && shown, JSON.stringify(r)); };
  await ev(() => { SG.hold = false; });
  await refuse('outside your third', 0, -1.6, 'third');
  await refuse('on the hill ring', 0, .6, 'hill');
  await refuse('overlapping another piece', -1.2, 1.75, 'overlap');
  await ev(() => { SG.hold = true; });

  /* the mice build */
  const t0 = await ev(() => SG.time);
  await ev(() => SG.step(1.5));
  ok('mice set off for the mat', await ev(() => MICE().filter((m) => m.state === 'toMat' || m.state === 'carry' || m.state === 'hammer').length === 3), JSON.stringify(await ev(() => MICE().map((m) => m.state))));
  await ev(() => SG.step(40));
  ok('mice finish all placed pieces when stepped forward', await ev(() => MINE().length === 3 && MINE().every((q) => q.built && q.parts > 0) && MICE().every((m) => m.state === 'idle' || m.state === 'wander')), JSON.stringify(await ev(() => [MINE(), MICE().map((m) => m.state)])));
  ok('the timer counted down', await ev((t0) => Math.abs(SG.time - (t0 - 41.5)) < .05, t0), String(await ev(() => SG.time)));

  /* undo */
  await p.click('#bUndo');
  ok('undo takes the last piece back to the mat', await ev(() => MINE().length === 2 && SG.kit[7].used === false && SG.kit[7].picked === false && MINE().every((q) => q.kind === 'wall')));

  /* a whole camp, then the timer */
  await ev(() => { SG.start('red'); SG.hold = true; });
  const res = await ev(() => SG.demo(11));
  ok('all 11 kit pieces can be placed', res.every((r) => r.ok) && await ev(() => MINE().length === 11), JSON.stringify(res));
  await ev(() => SG.step(75));
  const st = await ev(() => ({ built: MINE().filter((q) => q.built).length, phase: SG.phase, time: SG.time, mice: MICE().map((m) => m.state) }));
  ok('five mice build all 11 pieces inside the time', st.built === 11 && st.phase === 'build', JSON.stringify(st));
  ok('mice end up outside the built pieces', await ev(() => MICE().every((m) => MINE().every((q) => Math.hypot(m.x - q.x, m.z - q.z) > .05))));
  await ev(() => SG.stepUntil(() => SG.phase !== 'build', 60));
  ok('the timer ends the phase at 0:00', await ev(() => SG.phase === 'ready' && SG.clock > 119.9 && SG.clock < 120.1));
  await ev(() => SG.render());
  ok('"Camp ready" shows the count, and the mice cheer', await ev(() => document.getElementById('end').style.display !== 'none' && /Camp ready/.test(document.getElementById('end').textContent) && /11 of 11/.test(document.getElementById('endText').textContent) && MICE().every((m) => m.state === 'cheer')));

  /* Done ends early and finishes what was ordered */
  await ev(() => SG.reset()); await p.click('#bPlay'); await ev(() => { SG.hold = true; SG.demo(2); });
  await p.click('#bDone'); await ev(() => SG.render());
  ok('Done ends early with the pieces placed so far', await ev(() => SG.phase === 'ready' && MINE().length === 2 && MINE().every((q) => q.built) && /2 of 11/.test(document.getElementById('endText').textContent)));
  ok('SG is plain data', await ev(() => { const o = JSON.parse(JSON.stringify(SG)); return o.phase === 'ready' && o.pieces.length >= 2 && 'rot' in o.pieces[0] && 'state' in o.mice[0]; }));
  ok('still 0 errors at the end', errs.length === 0, errs.join(' | '));
  console.log(bad ? ('FAILED ' + bad + ' of ' + n) : ('ALL ' + n + ' PASSED'));
  await b.close(); process.exit(bad ? 1 : 0);
};
run();
