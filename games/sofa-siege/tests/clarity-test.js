/* Round Table Kingdom clarity test: stale cream rings, mend rings only where a mouse can mend, the first-run captions, the "?" legend, robot levels.
   Run: NODE_PATH=$(npm root -g) node tests/clarity-test.js [--shots] */
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
  const shots = process.argv.includes('--shots');
  const shot = (name) => p.screenshot({ path: path.resolve(__dirname, '..', 'shots', name) });
  await p.addInitScript(() => {
    /* a one-player match at the start of a fight, my lobber crewed, nobody bot-driven on my side */
    window.F1 = (seed) => { SG.hold = true; SG.start('blue', { seed: seed || 4242 }); SG.demo(11, 0); SG.sides[1].layout = 0; SG.skipBuild(); SG.begin(); SG.step(SG.CONFIG.count + .05); SG.sides[0].plan = { hill: 0, raid: 0, guard: 0, mend: 0 }; };
    window.WALL = (s) => SG.pieces.filter((q) => q.side === s && q.kind === 'wall')[0];
  });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__done', null, { timeout: 60000 });
  ok('page loads with 0 errors', errs.length === 0, errs.join(' | '));

  /* 1. the stale rings: a fight with fallen parts, then Play again / a new start: no cream ring may stay on the table */
  const r1 = await ev(() => { F1(); const w = WALL(0); ['wall.plank.1', 'wall.plank.2', 'wall.plank.3'].forEach((id) => SG.debug.knock(w.id, id)); SG.step(1.2); SG.render(); return { fight: SG.fallRings(), phase: SG.phase }; });
  ok('during a fight each fallen part of mine that a mouse can mend has a ring (3 knocked)', r1.fight >= 1 && r1.fight <= 3, JSON.stringify(r1));
  const r2 = await ev(() => { SG.start('blue', { seed: 77 }); SG.render(); const a = SG.fallRings(), ph = SG.phase; SG.reset && 0; return { a, ph }; });
  ok('a new start (Play again) leaves NO cream ring on the table at build (the bug: rings were left lit)', r2.ph === 'build' && r2.a === 0, JSON.stringify(r2));
  const r3 = await ev(() => { F1(); const w = WALL(0); SG.debug.knock(w.id, 'wall.plank.1'); SG.step(1.2); SG.render(); const a = SG.fallRings(); SG.reset(); SG.render(); const b2 = SG.fallRings(), ph = SG.phase; return { a, b2, ph }; });
  ok('SG.reset() (the Play again button) also clears every ring', r3.a >= 1 && r3.b2 === 0, JSON.stringify(r3));
  const r4 = await ev(() => { let worst = 0; for (let i = 0; i < 4; i++) { F1(i + 5); const w = WALL(0); SG.debug.knock(w.id, 'wall.plank.2'); SG.step(1.2); SG.render(); } SG.start('blue', { seed: 9 }); SG.render(); return { lit: SG.fallRings() }; });
  ok('after four rounds of play and a restart: still none lit', r4.lit === 0, JSON.stringify(r4));
  /* 2. rings only where a mouse can mend, never in the build phase */
  const r5 = await ev(() => { SG.start('blue', { seed: 4242 }); SG.demo(11, 0); SG.render(); const w = SG.pieces.filter((q) => q.side === 0 && q.kind === 'wall')[0]; if (w) SG.debug.knock(w.id, 'wall.plank.1'); SG.step(1); SG.render(); return { phase: SG.phase, lit: SG.fallRings(), mm: document.querySelectorAll('.pop.mendme').length }; });
  ok('build phase: a fallen part gets no ring and no "Mend me" label', r5.phase === 'build' && r5.lit === 0 && r5.mm === 0, JSON.stringify(r5));
  const r6 = await ev(() => { F1(); SG.sides[0].bot = false; const w = WALL(1); ['wall.plank.1', 'wall.plank.2'].forEach((id) => SG.debug.knock(w.id, id)); const m = WALL(0); SG.debug.knock(m.id, 'wall.plank.4'); SG.step(1.2); SG.render(); const lit = SG.fallRings(); return { lit, mm: [...document.querySelectorAll('.pop.mendme')].map((e) => e.textContent) }; });
  ok('only my own camp shows rings: the robot\'s fallen planks have none, mine has one, plus a "Mend me" label', r6.lit === 1 && r6.mm.length === 1 && /Mend me/.test(r6.mm[0]), JSON.stringify(r6));
  const r7 = await ev(() => { const w = WALL(0), q = w.ps.find((x) => x.id === 'wall.plank.4'); q.mender = 3; SG.render(); const a = SG.fallRings(), mm = document.querySelectorAll('.pop.mendme').length; q.mender = -1; q.glue = SG.clock + 9; SG.render(); const g = SG.fallRings(), mm2 = document.querySelectorAll('.pop.mendme').length; return { a, mm, g, mm2 }; });
  ok('a part a mouse is already mending has no ring (the hammer shows); a glued one has no "Mend me"', r7.a === 0 && r7.mm === 0 && r7.mm2 === 0, JSON.stringify(r7));
  if (shots) {
    await ev(() => { F1(); SG.hold = true; const w = WALL(0); ['wall.plank.1', 'wall.plank.2', 'wall.plank.4'].forEach((id) => SG.debug.knock(w.id, id)); SG.step(1.5); SG.coachReset(); SG.render(); SG.render(); });
    await shot('clarity-1.png');
  }

  /* 3. first-run captions: once, then never again */
  const c1 = await ev(() => { SG.coachReset(); SG.start('blue', { seed: 3 }); SG.render(); const a = SG.coach().shown; SG.coachTick(7); const gone = document.getElementById('coach').style.display === 'none'; SG.start('blue', { seed: 4 }); SG.render(); const again = SG.coach().shown; return { a, gone, again, keys: Object.keys(window.localStorage).filter((k) => /coach/.test(k)) }; });
  ok('first run: the build caption "Blue mice are yours" shows once and goes away', /Blue mice are yours/.test(c1.a) && c1.gone, JSON.stringify(c1));
  ok('it does not come back on the next game, and is remembered in localStorage', c1.again === '' && c1.keys.length === 1, JSON.stringify(c1));
  const c2 = await ev(() => { SG.coachReset(); F1(); SG.hold = true; SG.render(); const a = SG.coach().shown; SG.coachTick(7); SG.render(); const b2 = SG.coach().shown; const w = WALL(0); SG.debug.knock(w.id, 'wall.plank.2'); SG.step(1.2); SG.render(); SG.coachTick(0); return { a, b2, c: SG.coach().shown }; });
  ok('in the fight: the hill caption, then (once a part falls) the cream ring caption', /Hill: hold it/.test(c2.a) && /Cream ring = a fallen part/.test(c2.c), JSON.stringify(c2));
  ok('the captions survive a blocked or full localStorage (try/catch)', await ev(() => { const g = Storage.prototype.getItem, s = Storage.prototype.setItem; Storage.prototype.getItem = () => { throw new Error('no'); }; Storage.prototype.setItem = () => { throw new Error('no'); }; let okk = true; try { SG.coachReset(); SG.start('blue', { seed: 8 }); SG.render(); } catch (e) { okk = false; } Storage.prototype.getItem = g; Storage.prototype.setItem = s; return okk; }));
  /* 4. the "?" legend */
  const l1 = await ev(() => { SG.coachReset(); SG.start('blue', { seed: 6 }); SG.render(); const btn = document.getElementById('bHelp'), vis = btn.style.display; btn.click(); const open = document.getElementById('legend').style.display, txt = document.getElementById('legend').textContent, paused = SG.paused; return { vis, open, paused, txt }; });
  ok('a "?" button is on the table, and opens the legend (the game waits while it is open)', l1.vis === 'block' && l1.open === 'flex' && l1.paused, JSON.stringify(l1).slice(0, 300));
  ok('the legend explains the cream ring, the wrench and hammer, the honey pot, the number badges as build costs, the hill, the lobber', /cream ring/i.test(l1.txt) && /Mend me/.test(l1.txt) && /🔨/.test(l1.txt) && /🍯/.test(l1.txt) && /what a piece costs/.test(l1.txt) && /hill/i.test(l1.txt) && /pull back/i.test(l1.txt), l1.txt);
  if (shots) await shot('clarity-2.png');
  ok('"Got it" closes it and the game goes on', await ev(() => { document.getElementById('bHelpOk').click(); return document.getElementById('legend').style.display === 'none' && !SG.paused; }));
  /* 5. robot levels */
  const lv = await ev(() => { const L = SG.LEVELS; return { f: L.friendly, e: L.easy, n: L.normal, h: L.hard }; });
  ok('Fair (the old Easy), Normal and Fierce (the old Hard) numbers are unchanged', JSON.stringify(lv.e) === JSON.stringify({ err2: .2, fire: 13, err: .5, send: 5, raidLead: 6, preset: 'average' }) && JSON.stringify(lv.n) === JSON.stringify({ err2: .12, fire: 12, err: .45, send: 2.5, raidLead: 1.5, preset: 'average' }) && JSON.stringify(lv.h) === JSON.stringify({ err2: .06, fire: 11, err: .2, send: .6, raidLead: 2, preset: 'good' }), JSON.stringify(lv));
  ok('Friendly: aims wider, winds slower, no Big Marble', lv.f.err2 > lv.e.err2 && lv.f.reloadMul > 1 && lv.f.noBig === true, JSON.stringify(lv.f));
  const fr = await ev(() => { const out = {}; for (const lvl of ['friendly', 'easy']) { SG.hold = true; SG.start('blue', { seed: 4242, level: lvl }); SG.demo(11, 0); SG.sides[1].layout = 0; SG.skipBuild(); SG.begin(); SG.step(SG.CONFIG.count + .05); SG.sides[1].bot = true; SG.sides[1].big = 3; SG.sides[1].reload = 0; SG.lobbers(1).forEach((l) => { l.reload = 0; }); SG.stats.ammoShots = {}; let first = 0; SG.step(30, () => { if (!first && SG.lobbers(1).some((l) => l.reload > 0)) first = SG.lobbers(1).find((l) => l.reload > 0).reload; }); out[lvl] = { big: SG.stats.ammoShots.big || 0, shots: SG.stats.bySide[1].shots, firstReload: +(first || 0).toFixed(2) }; } return out; });
  ok('a Friendly robot with Big Marbles in hand never throws one; a Fair one does or fires more often', fr.friendly.big === 0 && fr.friendly.shots <= fr.easy.shots, JSON.stringify(fr));
  ok('the title screen offers Friendly, Fair and Fierce, and the first game starts on Friendly', await ev(() => { try { window.localStorage.removeItem('rtk.played'); } catch (e) {} return ['l_friendly', 'l_easy', 'l_hard'].every((id) => document.getElementById(id)) && document.getElementById('l_friendly').textContent === 'Friendly' && document.getElementById('l_easy').textContent === 'Fair' && document.getElementById('l_hard').textContent === 'Fierce' && document.getElementById('l_friendly').className.indexOf('on') >= 0; }));
  ok('no page errors', errs.length === 0, errs.join(' | '));
  console.log(bad ? 'FAILED ' + bad + ' of ' + n : 'ALL ' + n + ' PASSED');
  await b.close(); process.exit(bad ? 1 : 0);
};
run().catch((e) => { console.error(e); process.exit(1); });
