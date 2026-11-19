/* Round Table Kingdom two-player "Table mode" test. Run: NODE_PATH=$(npm root -g) node tests/table-test.js
   Two fingers at once are sent as real multi-touch through the browser's own touch input, not through SG calls. */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require('playwright');
const T0 = Date.now(), V1 = process.env.RULES === '1';   /* RULES=1 runs this test under the old rules; the default is v2, where the Keep is placed first and the panels carry the four orders */
const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
  const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p); await p.addInitScript((r) => { if (r) window.__RULES = 1; }, process.env.RULES === '1');
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  let n = 0, bad = 0;
  const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra && !cond ? '  -> ' + extra : '')); };
  const ev = (f, a) => p.evaluate(f, a);
  /* fingers: [{id, x, y}] in screen pixels; all listed fingers are down */
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q) => ({ x: Math.round(q.x), y: Math.round(q.y), id: q.id, radiusX: 4, radiusY: 4, force: 1 })) });
  const world = (x, z) => ev(([x, z]) => SG.screen(x, z), [x, z]);
  const slot = (s, i) => ev(([s, i]) => SG.screen(SG.sides[s].kit[i].x, SG.sides[s].kit[i].z, .07), [s, i]);
  const btn = (s, a) => ev(([s, a]) => { const r = document.querySelector('#pp' + s + ' button[data-a="' + a + '"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, [s, a]);
  /* both players do the same kind of thing in the same touch frames */
  const both = async (a, c, moveA, moveC) => { await touch('touchStart', [{ id: 1, ...a }, { id: 2, ...c }]);
    if (moveA) for (let k = 1; k <= 4; k++) await touch('touchMove', [{ id: 1, x: a.x + (moveA.x - a.x) * k / 4, y: a.y + (moveA.y - a.y) * k / 4 }, { id: 2, x: c.x + (moveC.x - c.x) * k / 4, y: c.y + (moveC.y - c.y) * k / 4 }]);
    await p.waitForTimeout(moveA ? 700 : 80); return moveA; };   /* touch moves are handed to the page once a frame, and frames are slow here */
  const lift = async () => { await touch('touchEnd', []); await p.waitForTimeout(80); };

  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__done', null, { timeout: 60000 });
  ok('the title offers 1 player and 2 players', await ev(() => /1 player/.test(document.getElementById('m_solo').textContent) && /2 players/.test(document.getElementById('m_table').textContent)));
  await p.click('#m_table'); await p.click('#bPlay'); await ev(() => { SG.hold = true; SG.render(); });
  ok('2 players starts Table mode: both sides human, blue at the bottom, red at the top', await ev(() => SG.mode === 'table' && SG.phase === 'build' && SG.sides[0].human && SG.sides[1].human && !SG.sides[0].bot && !SG.sides[1].bot && SG.sides[0].team === 'blue' && SG.sides[1].team === 'red'
    && SG.screen(0, 2.5).y > SG.screen(0, -2.5).y && Math.abs(SG.screen(0, 2.5).x - SG.screen(0, -2.5).x) < 2));
  ok('the camera looks straight down', await ev(() => Math.abs(SG.screen(1, 0, 0).x - SG.screen(1, 0, .8).x) < 12 && Math.abs(SG.screen(1, 0).y - SG.screen(-1, 0).y) < 1));
  ok('each player has a panel at their own edge, and red\'s is turned round', await ev(() => { const a = document.getElementById('pp0'), c = document.getElementById('pp1'), ra = a.getBoundingClientRect(), rc = c.getBoundingClientRect(), t = getComputedStyle(c).transform;
    return a.style.display === 'flex' && c.style.display === 'flex' && ra.top > innerHeight / 2 && rc.bottom < innerHeight / 2 && /matrix\(-1, 0, 0, -1/.test(t) && document.getElementById('hud').style.display === 'none'; }));

  /* build: both pick and place at once */
  const first = V1 ? 0 : 7; await both(await slot(0, first), await slot(1, first)); await lift();
  ok('two fingers pick a piece each from their own mat at the same time', await ev((f) => SG.sides[0].sel === f && SG.sides[1].sel === f, first));
  await both(await world(0, 1.25), await world(0, -1.25)); await lift();
  let st = await ev(() => SG.pieces.map((q) => ({ side: q.side, kind: q.kind, z: q.z })));
  ok('both place in the same frames, each in their own half', st.length === 2 && st.some((q) => q.side === 0 && q.z > 1) && st.some((q) => q.side === 1 && q.z < -1) && st.every((q) => q.kind === (V1 ? 'wall' : 'tower')), JSON.stringify(st));
  /* drag from the mat: tower for blue, gate for red, fingers moving together */
  const sa = await slot(0, V1 ? 7 : 0), sc = await slot(1, 6), ta = await world(-1.3, 1.9), tc = await world(.9, -1.9);
  await both(sa, sc, ta, tc);
  const mid = await ev(() => ({ a: SG.sides[0].sel, c: SG.sides[1].sel, ga: SG.sides[0].ghost, gc: SG.sides[1].ghost }));
  await lift();
  st = await ev(() => SG.pieces.map((q) => ({ side: q.side, kind: q.kind, x: q.x, z: q.z })));
  ok('both drag a piece from their mat at the same time; each ghost follows its own finger', mid.a === (V1 ? 7 : 0) && mid.c === 6 && Math.abs(mid.ga.x + 1.3) < .08 && Math.abs(mid.ga.z - 1.9) < .08 && Math.abs(mid.gc.x - .9) < .08 && Math.abs(mid.gc.z + 1.9) < .08, JSON.stringify(mid));
  ok('and both pieces land where they were dragged, nothing crossed over', st.length === 4 && st.some((q) => q.side === 0 && q.kind === (V1 ? 'tower' : 'wall') && q.x < -1 && q.z > 0) && st.some((q) => q.side === 1 && q.kind === 'gate' && q.z < 0) && st.filter((q) => q.side === 0).length === 2, JSON.stringify(st));
  /* a blue finger cannot build in red's half, and red is not disturbed */
  await touch('touchStart', [{ id: 1, ...(await slot(0, 1)) }]); await touch('touchEnd', []);
  const redSel = await ev(() => { SG.select(2, 1); return SG.sides[1].sel; });
  const q1 = await world(.5, 1.6), q2 = await world(.5, -1.6);
  await touch('touchStart', [{ id: 1, ...q1 }]); await touch('touchMove', [{ id: 1, ...q2 }]); await touch('touchEnd', []);
  ok('a blue finger dragged into red\'s half places nothing there, and red\'s pick is untouched', await ev((redSel) => SG.pieces.length === 4 && SG.sides[0].msg.code === 'third' && SG.sides[1].sel === redSel && SG.sides[1].msg.code !== 'third', redSel), JSON.stringify(await ev(() => [SG.pieces.length, SG.sides[0].msg, SG.sides[1].sel])));
  ok('a touch that starts in red\'s half cannot move blue\'s ghost', await (async () => { const g0 = await ev(() => [SG.sides[0].ghost.x, SG.sides[0].ghost.z]); await touch('touchStart', [{ id: 3, ...(await world(-.6, -1.4)) }]); await touch('touchEnd', []);
    return ev((g0) => SG.sides[0].ghost.x === g0[0] && SG.sides[0].ghost.z === g0[1], g0); })());
  /* turn buttons are per player and work together */
  const r0 = await ev(() => [SG.sides[0].ghost.rot, SG.sides[1].ghost.rot]);
  await both(await btn(0, 'L'), await btn(1, 'R')); await lift();
  ok('both press their own Turn button at once', await ev((r0) => Math.abs(SG.sides[0].ghost.rot - r0[0] - Math.PI / 12) < 1e-6 && Math.abs(SG.sides[1].ghost.rot - r0[1] + Math.PI / 12) < 1e-6, r0));
  /* the mice of both camps build */
  await ev(() => SG.step(30));
  ok('both camps\' mice build their pieces', await ev(() => SG.pieces.length >= 4 && SG.pieces.filter((q) => q.built).length >= 4));

  /* ready */
  await touch('touchStart', [{ id: 1, ...(await btn(0, 'ready')) }]); await lift();
  ok('one Ready is not enough: the build goes on, and that player cannot place any more', await ev(() => SG.phase === 'build' && SG.sides[0].ready && !SG.sides[1].ready && SG.select(3, 0) === false));
  await touch('touchStart', [{ id: 2, ...(await btn(1, 'ready')) }]); await lift(); await ev(() => SG.render());
  ok('when both are ready the battle starts with a 3-2-1 shown to each player', await ev(() => SG.phase === 'count' && SG.round === 1 && [0, 1].every((s) => { const e = document.querySelector('#pp' + s + ' .pbig'); return e.style.display === 'block' && e.textContent === '3'; })));
  ok('the timer also starts the battle if nobody presses Ready', await ev(() => { const keep = JSON.stringify(SG.pieces.length); SG.start('blue', { mode: 'table', seed: 5 }); SG.hold = true; SG.demo(11, 0); SG.demo(11, 1); SG.step(SG.CONFIG.build + .1); return SG.phase === 'count' && !SG.sides[0].ready && SG.pieces.length === 22 && SG.pieces.every((q) => q.built); }));

  /* fight: both use their own buttons and aim at once */
  await ev(() => { SG.step(SG.CONFIG.count + .05); SG.stepUntil(() => SG.debug.crewReady(0) && SG.debug.crewReady(1), 15); SG.sides[0].reload = SG.sides[1].reload = 0; SG.render(); });
  ok('nobody is a robot in the fight', await ev(() => SG.phase === 'fight' && !SG.sides[0].bot && !SG.sides[1].bot && SG.sides[0].order === null && SG.sides[1].order === null));
  await both(await world(.3, .4), await world(-.3, -.4)); await lift();
  ok('both tap to send their squads at once, each to their own tap', await ev(() => { const a = SG.sides[0].order, c = SG.sides[1].order; return a && c && Math.hypot(a.x - .3, a.z - .4) < .08 && Math.hypot(c.x + .3, c.z + .4) < .08; }));
  await both(await btn(0, 'lobber'), await btn(1, 'lobber')); await lift(); await ev(() => SG.render());
  ok('both switch to the Lobber on their own panel at once', await ev(() => SG.sides[0].tool === 'lobber' && SG.sides[1].tool === 'lobber' && document.querySelector('#pp1 button[data-a="lobber"]').className === 'btn on'));
  if (!V1) { const rows = await ev(() => [0, 1].map((s) => { const r = document.querySelector('#pp' + s + ' .pammo'), bs = [...r.querySelectorAll('button')], rc = r.getBoundingClientRect(); return { shown: getComputedStyle(r).display !== 'none', n: bs.length, names: bs.map((b) => b.querySelector('.ai').textContent + ' ' + b.querySelector('.an').textContent + ' ' + b.querySelector('.ac').textContent), inside: rc.left >= 0 && rc.right <= innerWidth + 1 && rc.top >= -1 && rc.bottom <= innerHeight + 1, on: bs.filter((b) => /\bon\b/.test(b.className)).length }; }));
    ok('each player has their own ammo row on their own panel: five buttons with icon, name and count, one highlighted', rows.every((r) => r.shown && r.n === 5 && r.inside && r.on === 1 && /Marble ∞/.test(r.names[0]) && /Big Marble ×0/.test(r.names[1]) && /Glue blob ∞/.test(r.names[4])), JSON.stringify(rows));
    await both(await btn(0, 'am_bouncer'), await btn(1, 'am_glue')); await lift(); await ev(() => SG.render());
    ok('both pick ammo at once, each on their own panel: blue the Bouncer, red the Glue blob, and each row shows its own highlight', await ev(() => SG.sides[0].ammo === 'bouncer' && SG.sides[1].ammo === 'glue' && /\bon\b/.test(document.querySelector('#pp0 button[data-a="am_bouncer"]').className) && /\bon\b/.test(document.querySelector('#pp1 button[data-a="am_glue"]').className) && !/\bon\b/.test(document.querySelector('#pp0 button[data-a="am_glue"]').className)));
    await both(await btn(0, 'am_marble'), await btn(1, 'am_marble')); await lift(); await ev(() => SG.render());
    ok('with one lobber each there is no Lobber 1 / 2 button', await ev(() => ['#pp0', '#pp1'].every((q) => getComputedStyle(document.querySelector(q + ' button[data-a="lsel"]')).display === 'none') && SG.sides[0].ammo === 'marble' && SG.sides[1].ammo === 'marble')); }
  const a0 = await world(-1.2, 1.2), a1 = await world(-1.2, 2.2), c0 = await world(1.2, -1.2), c1 = await world(1.2, -2.2);
  await both(a0, c0, a1, c1);
  const aim = await ev(() => ({ a: SG.sides[0].aim, c: SG.sides[1].aim, la: SG.debug.piece(SG.sides[0].lobber).z, lc: SG.debug.piece(SG.sides[1].lobber).z }));
  await lift();
  ok('both drag back in their own half and aim at once, each toward the other camp', aim.a.on && aim.c.on && aim.a.tz < aim.la - 1.5 && aim.c.tz > aim.lc + 1.5, JSON.stringify(aim));
  ok('letting go fires one marble each', await ev(() => SG.stats.shots === 2 && SG.marbles.length === 2 && SG.marbles.some((m) => m.side === 0) && SG.marbles.some((m) => m.side === 1) && SG.sides[0].reload > 2 && SG.sides[1].reload > 2), JSON.stringify(await ev(() => [SG.stats.shots, SG.marbles.length, SG.sides[0].reload, SG.sides[1].reload, SG.lobberBlock(0), SG.lobberBlock(1), SG.sides[0].msg, SG.sides[1].msg])));
  /* an order from a touch that wanders into the other half stays at home */
  if (V1) { await both(await btn(0, 'squad'), await btn(1, 'squad')); await lift(); } else { await both(await btn(0, 'lobber'), await btn(1, 'lobber')); await lift(); }   /* v2: the Lobber button is pressed again to put the lobber down */
  await touch('touchStart', [{ id: 1, ...(await world(.2, .6)) }]); await touch('touchMove', [{ id: 1, ...(await world(.2, -1.2)) }]); await lift();
  ok('a blue touch that ends in red\'s half still orders blue only, inside blue\'s half', await ev(() => SG.sides[0].order.z >= 0 && Math.hypot(SG.sides[1].order.x + .3, SG.sides[1].order.z + .4) < .08));
  if (V1) { await both(await btn(0, 'mend'), await btn(1, 'squad')); await lift(); ok('each panel keeps its own tool', await ev(() => SG.sides[0].tool === 'mend' && SG.sides[1].tool === 'squad')); }
  else { const pl = await ev(() => [SG.sides[0].plan.raid, SG.sides[1].plan.guard]); await both(await btn(0, 'o_raid'), await btn(1, 'o_guard')); await lift(); await ev(() => SG.render());
    ok('each panel gives its own orders: blue adds a raider while red adds a guard', await ev((pl) => SG.sides[0].plan.raid === pl[0] + 1 && SG.sides[1].plan.guard === pl[1] + 1 && SG.sides[0].plan.guard === 0 && SG.sides[1].plan.raid === pl[0] && new RegExp((pl[0] + 1) + '$').test(document.querySelector('#pp0 button[data-a="o_raid"]').textContent) && new RegExp((pl[1] + 1) + '$').test(document.querySelector('#pp1 button[data-a="o_guard"]').textContent), pl), JSON.stringify(await ev(() => [SG.sides[0].plan, SG.sides[1].plan, document.querySelector('#pp0 button[data-a="o_raid"]').textContent, document.querySelector('#pp1 button[data-a="o_guard"]').textContent]))); }
  const mnd = await ev(() => { const w = SG.pieces.filter((q) => q.side === 1 && q.kind === 'wall')[0]; SG.debug.knock(w.id, 'wall.plank.2'); SG.step(1); const q = w.ps.find((x) => x.id === 'wall.plank.2'); if (SG.rules === 1) SG.setTool('mend', 1); return { x: q.rx, z: q.rz, id: w.id }; });
  await touch('touchStart', [{ id: 2, ...(await world(mnd.x, mnd.z)) }]); await lift(); await ev(() => SG.render());
  ok('red taps its own fallen plank and a red mouse goes to mend it; a hammer shows over the wall', await ev((id) => SG.mice.some((m) => m.side === 1 && m.state === 'toPart' && m.job === id) && !SG.mice.some((m) => m.side === 0 && m.job === id) && [...document.querySelectorAll('.pop.icon')].length >= 1 && SG.sides[1].msg.code === 'mend', mnd.id), JSON.stringify(await ev(() => [SG.mice.map((m) => m.side + m.role + ':' + m.state).join(' '), document.querySelectorAll('.pop.icon').length, SG.sides[1].msg])));

  /* two lobbers in table mode: the player with two gets a Lobber 1 / 2 button; the other does not */
  if (!V1) { await ev(() => { SG.start('blue', { mode: 'table', seed: 31, presets: ['average2', 'average'] }); SG.hold = true; SG.skipBuild(); SG.step(SG.CONFIG.count + .1); SG.stepUntil(() => SG.debug.crewReady(0, 0) && SG.debug.crewReady(0, 1) && SG.debug.crewReady(1), 30); SG.setTool('lobber', 0); SG.setTool('lobber', 1); SG.hold = false; SG.render(); });
    const ls = await ev(() => ({ n: [SG.lobbers(0).length, SG.lobbers(1).length], b0: getComputedStyle(document.querySelector('#pp0 button[data-a="lsel"]')).display !== 'none', b1: getComputedStyle(document.querySelector('#pp1 button[data-a="lsel"]')).display !== 'none', t: document.querySelector('#pp0 button[data-a="lsel"]').textContent }));
    ok('only the player with two lobbers has a Lobber 1 / 2 button', ls.n[0] === 2 && ls.n[1] === 1 && ls.b0 && !ls.b1 && /Lobber 1 \/ 2/.test(ls.t), JSON.stringify(ls));
    await touch('touchStart', [{ id: 1, ...(await btn(0, 'lsel')) }]); await lift(); await ev(() => SG.render());
    ok('pressing it chooses the other lobber, the ring moves, and the button says so', await ev(() => SG.sides[0].lsel === 1 && /Lobber 2 \/ 2/.test(document.querySelector('#pp0 button[data-a="lsel"]').textContent) && SG.debug.lring(0)[1] && SG.sides[1].lsel === 0));
    const tl = await ev(() => { SG.sides[0].aim = { on: false, tx: 0, tz: 0 }; SG.lobbers(0).forEach((l) => { l.reload = 0; }); const w = SG.pieces.find((q) => q.side === 1 && q.kind === 'wall'); SG.sides[0].lsel = 1; const a = SG.fire(0, w.x, w.z); return { r: SG.lobbers(0).map((l) => l.reload), from: a && a.from, id: SG.lobbers(0)[1].id }; });
    ok('a shot goes from the chosen lobber only', tl.from === tl.id && tl.r[0] === 0 && tl.r[1] > 2, JSON.stringify(tl)); }

  /* callouts and the win are shown to both */
  await ev(() => { if (SG.rules === 1) { SG.sides[0].score = 100; SG.step(.3); } else { const k = SG.debug.piece(SG.sides[1].keep); ['tower.post.NE', 'tower.post.SE', 'tower.post.NW'].forEach((id) => SG.debug.knock(k.id, id)); SG.step(SG.CONFIG.v2.keepFall + .5); } SG.render(); });
  ok('the win is shown twice, once facing each player', await ev(() => { const a = document.querySelector('#pp0 .pcard'), c = document.querySelector('#pp1 .pcard'); return SG.phase === 'over' && SG.winner === 0 && a.style.display === 'block' && c.style.display === 'block' && /You win/.test(a.textContent) && /Blue wins/.test(c.textContent) && document.getElementById('win').style.display === 'none'; }));
  await touch('touchStart', [{ id: 1, ...(await ev(() => { const r = document.querySelector('#pp1 button[data-a="again"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })) }]); await lift();
  ok('Play again goes back to the title', await ev(() => SG.phase === 'start' && document.getElementById('start').style.display === 'flex'));

  /* mice keep apart */
  ok('mice sent to one blocked spot spread out round it and do not stack', await ev(() => { SG.start('blue', { mode: 'table', seed: 9 }); SG.hold = true; SG.demo(11, 0); SG.demo(11, 1); SG.done(0); SG.done(1); SG.step(SG.CONFIG.count + .1); const t = SG.pieces.filter((q) => q.side === 1 && q.kind === 'tent')[0];
    const keep = SG.CONFIG.squadRing; SG.CONFIG.squadRing = 0; SG.order(0, t.x, t.z); SG.order(1, 0, -.3); SG.step(16); SG.CONFIG.squadRing = keep; const M = SG.mice; let least = 9;
    for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) least = Math.min(least, Math.hypot(M[i].x - M[j].x, M[i].z - M[j].z)); return least > SG.CONFIG.personal * .8 && SG.inWall() === 0; }));

  /* sound: never needed, starts only after a tap, mute is remembered */
  const snd = await ev(() => ({ a: SG.audio(), muted: SG.muted }));
  ok('sound is optional and off until the first tap; here it ' + (snd.a.started ? 'started after the taps' : 'never started') + ', and the game ran either way', typeof snd.a.started === 'boolean' && snd.muted === false);
  await ev(() => { SG.start('blue', {}); SG.render(); }); await p.click('#bMute');
  ok('the mute button mutes, and remembers it', await ev(() => { let v = null; try { v = localStorage.getItem('rtk-mute'); } catch (e) { v = 'blocked'; } return SG.muted === true && (v === '1' || v === 'blocked') && document.getElementById('bMute').textContent === '🔇'; }));
  const p2 = await ctx.newPage(); await p2.addInitScript(() => { window.__RULES = 1; }); const errs2 = []; p2.on('pageerror', (e) => errs2.push(e.message));
  await p2.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p2.waitForFunction('window.__done');
  ok('a fresh page starts with no audio at all, and the mute is still on', await p2.evaluate(() => { let v = null; try { v = localStorage.getItem('rtk-mute'); } catch (e) { v = 'blocked'; } return SG.audio().started === false && (v === 'blocked' || SG.muted === true); }));
  await p2.evaluate(() => { SG.setMute(false); }); await p2.close();
  ok('0 errors in the whole run', errs.length === 0 && errs2.length === 0, errs.concat(errs2).join(' | '));
  console.log('test took ' + ((Date.now() - T0) / 1000).toFixed(0) + ' s');
  console.log(bad ? ('FAILED ' + bad + ' of ' + n) : ('ALL ' + n + ' PASSED'));
  await b.close(); process.exit(bad ? 1 : 0);
};
run();
