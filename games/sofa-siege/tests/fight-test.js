/* Sofa siege fight test. Run: NODE_PATH=$(npm root -g) node tests/fight-test.js
   Also plays 20 bot-against-bot matches and writes BOT_REPORT.md. */
/* The repo is "type": "module", so this file is an ES module; playwright is found through NODE_PATH. */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require('playwright');
const T0 = Date.now();
const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  let n = 0, bad = 0;
  const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra && !cond ? '  -> ' + extra : '')); };
  const ev = async (f, a) => { const t = Date.now(); const r = await p.evaluate(f, a); if (Date.now() - t > 5000) console.log('  (slow step: ' + ((Date.now() - t) / 1000).toFixed(1) + ' s)'); return r; };
  await p.addInitScript(() => {
    /* a fresh match at the start of round 1, both camps from preset 0, nobody bot-driven unless asked */
    window.FIGHT = (team, bots) => { SG.hold = true; SG.start(team || 'blue', { seed: 4242 }); SG.demo(11, 0); SG.sides[1].layout = 0; SG.skipBuild(); SG.step(SG.RULES.ready + .05); SG.sides[0].bot = !!bots; SG.sides[1].bot = !!bots; };
    window.WALL = (s) => SG.pieces.filter((q) => q.side === s && q.kind === 'wall').sort((a, c) => Math.hypot(a.x, a.z) - Math.hypot(c.x, c.z))[0];
  });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__done', null, { timeout: 60000 });
  ok('page loads with 0 errors', errs.length === 0, errs.join(' | '));

  /* the match goes on after the build step */
  await ev(() => FIGHT('blue'));
  ok('after "Camp ready" round 1 starts, with two camps of 11 built pieces', await ev(() => SG.phase === 'fight' && SG.round === 1 && SG.pieces.length === 22 && SG.pieces.every((q) => q.built) && SG.sides[0].lobber > 0 && SG.sides[1].lobber > 0));

  /* a marble lands where the arc says */
  const shot = await ev(() => { SG.sides[0].reload = 0; const a = SG.arc(0, 1.6, -.2); const f = SG.fire(0, 1.6, -.2); SG.stepUntil(() => SG.lastHit, 8); return { a, f: !!f, hit: SG.lastHit, reload: SG.sides[0].reload }; });
  ok('a marble with a fixed aim lands where predicted (within 0.02)', shot.f && shot.hit && Math.hypot(shot.hit.x - shot.a.x1, shot.hit.z - shot.a.z1) < .02 && shot.hit.piece === 0, JSON.stringify(shot));
  ok('the lobber then reloads for about 4 seconds and cannot fire meanwhile', shot.reload > 2 && shot.reload < 4 && await ev(() => SG.fire(0, 1, 0) === null));

  /* a hit on a wall knocks exactly one named part off */
  const hit = await ev(() => { FIGHT('blue'); SG.sides[0].reload = 0; const w = WALL(1), before = w.parts, total = SG.pieces.reduce((s, q) => s + q.parts, 0); SG.fire(0, w.x, w.z); SG.stepUntil(() => SG.lastHit, 8);
    const off = w.ps.filter((q) => q.st === 'off'); return { before, after: w.parts, off: off.map((q) => q.id), hit: SG.lastHit, wall: w.id, lost: total - SG.pieces.reduce((s, q) => s + q.parts, 0), partsOff: SG.stats.partsOff }; });
  ok('a blue marble on a wall knocks off exactly one named part (' + hit.off.join(',') + ')', hit.off.length === 1 && hit.before - hit.after === 1 && hit.lost === 1 && hit.partsOff === 1 && hit.hit.piece === hit.wall && hit.hit.part === hit.off[0] && /^wall\./.test(hit.off[0]), JSON.stringify(hit));
  ok('the fallen part comes to rest as debris near the wall', await ev(() => { const w = WALL(1), q = w.ps.find((x) => x.st === 'off'); return Math.hypot(q.rx - w.x, q.rz - w.z) < 1.2 && Math.hypot(q.rx, q.rz) < 3.1; }));
  ok('a wall with fewer than half its planks stops blocking', await ev(() => { const w = WALL(1); const planks = w.ps.filter((q) => /plank/.test(q.id)); let i = 0; const before = SG.debug.blocks(w.id);
    while (planks.filter((q) => q.st === 'on').length >= planks.length / 2) SG.debug.knock(w.id, planks[i++].id); return before === true && SG.debug.blocks(w.id) === false; }));

  /* dizzy, then home */
  const dz = await ev(() => { FIGHT('blue'); SG.order(1, 0, -.3); SG.step(4); SG.sides[0].reload = 0; const foe = SG.mice.filter((m) => m.side === 1); const t = foe[0]; SG.fire(0, t.x, t.z); SG.stepUntil(() => SG.lastHit, 8);
    const d = foe.filter((m) => m.state === 'dizzy'); const who = d[0]; if (!who) return { n: 0, hit: SG.lastHit }; const at = [who.x, who.z]; SG.step(2); const still = who.state === 'dizzy' && who.x === at[0]; SG.step(SG.RULES.dizzy - 2 + .1);
    return { n: d.length, still, state: who.state, home: Math.hypot(who.x, who.z), z: who.z, onHillAfter: Math.hypot(who.x, who.z) < 1 }; });
  ok('a marble on the hill makes enemy mice dizzy (' + dz.n + ' hit)', dz.n >= 1, JSON.stringify(dz));
  ok('a dizzy mouse sits for 5 seconds, then pops back to its own camp', dz.still && dz.state !== 'dizzy' && dz.home > 1.6 && dz.z < 0 && !dz.onHillAfter, JSON.stringify(dz));
  ok('a dizzy mouse does not count on the hill', await ev(() => { FIGHT('blue'); SG.order(1, 0, -.3); SG.step(4); const before = SG.onHill()[1]; SG.debug.dizzy(1, 0); return before === 5 && SG.onHill()[1] === 4; }));

  /* mending */
  const md = await ev(() => { FIGHT('blue'); const w = WALL(0); SG.debug.knock(w.id, 'wall.plank.2'); SG.step(1); const q = w.ps.find((x) => x.id === 'wall.plank.2'); const first = SG.mend(0, w.id);
    const seen = {}; SG.stepUntil(() => { SG.mice.forEach((m) => { if (m.side === 0) seen[m.state] = 1; }); return q.st === 'on'; }, 30);
    const mended = q.st === 'on' && w.parts === w.total; SG.debug.knock(w.id, 'wall.plank.2'); SG.step(1); const second = SG.mend(0, w.id); SG.step(12);
    return { first, seen: Object.keys(seen), mended, used: q.used, second, final: q.st, mendedCount: SG.stats.partsMended }; });
  ok('a mouse carries the fallen part back and hammers it on', md.first && md.mended && md.seen.includes('toPart') && md.seen.includes('bring') && md.seen.includes('fix'), JSON.stringify(md));
  ok('a part can be reclaimed once only', md.used && md.second === false && md.final === 'off' && md.mendedCount === 1, JSON.stringify(md));
  ok('in the mend break free mice mend by themselves', await ev(() => { FIGHT('blue'); const w = WALL(0); SG.debug.knock(w.id, 'wall.plank.1'); SG.debug.knock(w.id, 'wall.plank.4'); SG.stepUntil(() => SG.phase === 'mend', 70); const inBreak = SG.phase === 'mend' && w.parts === w.total - 2; SG.stepUntil(() => SG.phase === 'fight', 12); return inBreak && SG.round === 2 && w.parts === w.total; }));

  /* the flag meter */
  const mt = await ev(() => { FIGHT('blue'); const keep = SG.RULES.corkChance; SG.RULES.corkChance = 0; SG.order(0, 0, .3); SG.stepUntil(() => SG.onHill()[0] === 5, 15); SG.step(1.1); const a = [SG.sides[0].score, SG.sides[1].score], on = SG.onHill(); SG.step(5); const b2 = [SG.sides[0].score, SG.sides[1].score];
    SG.order(1, 0, -.3); SG.stepUntil(() => SG.onHill()[1] === 5, 15); SG.step(1.1); const c = [SG.sides[0].score, SG.sides[1].score]; SG.step(5); const d = [SG.sides[0].score, SG.sides[1].score]; SG.RULES.corkChance = keep; return { a, on, b2, c, d, share: SG.blueShare() }; });
  ok('the meter fills only for the side with more mice on the hill', mt.on[0] === 5 && mt.on[1] === 0 && Math.abs((mt.b2[0] - mt.a[0]) - 5 * 5 * .8) < .01 && mt.b2[1] === 0 && mt.d[1] === 0, JSON.stringify(mt));
  ok('with equal numbers on the hill nobody gains', Math.abs(mt.d[0] - mt.c[0]) < .01, JSON.stringify(mt));
  ok('the flag blends toward the leader', mt.share > .6, String(mt.share));

  /* team skills */
  ok('blue mice pop corks at enemies in range', await ev(() => { FIGHT('blue'); SG.order(0, 0, .3); SG.order(1, 0, -.3); SG.step(9); return SG.stats.corks > 3; }));
  ok('red scrappers knock planks off a wall they can reach', await ev(() => { FIGHT('red'); const w = WALL(1); const k = (Math.hypot(w.x, w.z) - .3) / Math.hypot(w.x, w.z); SG.order(0, w.x * k, w.z * k); SG.step(12); return SG.stats.partsOff >= 1 && SG.lastKnock.by === 'scrap'; }));

  /* controls */
  await ev(() => { FIGHT('blue'); SG.hold = false; SG.sides[0].reload = 0; });
  const hs = await ev(() => SG.screen(0, .3));
  await p.mouse.click(hs.x, hs.y);
  ok('tapping the hill sends the squad there', await ev(() => SG.sides[0].order && Math.hypot(SG.sides[0].order.x, SG.sides[0].order.z - .3) < .08));
  await p.click('#b_lobber');
  const ls = await ev(() => { const l = SG.debug.piece(SG.sides[0].lobber); return [SG.screen(l.x, l.z), SG.screen(l.x, l.z + .9)]; });
  await p.mouse.move(ls[0].x, ls[0].y); await p.mouse.down(); await p.mouse.move(ls[1].x, ls[1].y, { steps: 4 });
  const aiming = await ev(() => ({ on: SG.aim.on, tz: SG.aim.tz, tx: SG.aim.tx, lz: SG.debug.piece(SG.sides[0].lobber).z }));
  await p.mouse.up();
  ok('dragging back from the lobber aims forward, and letting go fires one marble', aiming.on && aiming.tz < aiming.lz - 1.5 && await ev(() => SG.stats.shots === 1 && SG.marbles.length === 1 && SG.sides[0].reload > 3), JSON.stringify(aiming));
  await p.click('#bPause'); const t1 = await ev(() => SG.clock); await p.waitForTimeout(300);
  ok('pause stops the clock', await ev((t1) => SG.paused && SG.clock === t1, t1));
  await p.click('#bPause');

  /* a win shows the win screen */
  await ev(() => { FIGHT('blue'); SG.order(0, 0, .3); SG.step(4.5); SG.sides[0].score = 99; SG.step(1.5); SG.render(); });
  ok('first to 100 wins; the win screen offers Play again', await ev(() => SG.phase === 'over' && SG.winner === 0 && document.getElementById('win').style.display !== 'none' && /Blue wins/.test(document.getElementById('winTitle').textContent) && !!document.getElementById('bAgain')));

  /* 20 bot-against-bot matches, stepped fast */
  const rows = [];
  for (let i = 0; i < 20; i++) {
    rows.push(await ev((i) => { const lvl = ['easy', 'normal', 'hard'][i % 3]; SG.hold = true; SG.start(i % 2 ? 'red' : 'blue', { seed: 5000 + i * 131, level: lvl }); SG.auto(0, lvl);
      if (i === 0) { let g = 0; while (SG.phase === 'build' && g++ < 200) SG.step(1); } else SG.skipBuild();
      const built = SG.pieces.filter((q) => q.built).length; let g2 = 0; while (SG.phase !== 'over' && g2++ < 400) SG.step(1);
      return { i, level: lvl, front: SG.sides[0].team, over: SG.phase === 'over', winner: SG.winner >= 0 ? SG.sides[SG.winner].team : '', winSide: SG.winner, round: SG.round, score: [Math.round(SG.sides[0].score), Math.round(SG.sides[1].score)], built,
        len: SG.stats.fightTime, flips: SG.stats.hillFlips, partsOff: SG.stats.partsOff, mended: SG.stats.partsMended, dizzies: SG.stats.dizzies, shots: SG.stats.shots, stuck: SG.stats.stuck, gap: SG.stats.longestGap }; }, i));
  }
  ok('20 bot-against-bot matches all end with a winner inside 3 rounds', rows.every((r) => r.over && r.winner && r.round <= 3 && r.len <= 180.2), JSON.stringify(rows.filter((r) => !r.over)));
  ok('the bots build both camps in a full build step (match 1: ' + rows[0].built + ' pieces)', rows[0].built === 22);
  ok('no mouse got stuck in 20 matches', rows.reduce((s, r) => s + r.stuck, 0) === 0, 'stuck: ' + rows.reduce((s, r) => s + r.stuck, 0));
  ok('still 0 errors at the end', errs.length === 0, errs.join(' | '));

  const sum = (f) => rows.reduce((s, r) => s + f(r), 0), avg = (f) => (sum(f) / rows.length);
  const wins = { blue: rows.filter((r) => r.winner === 'blue').length, red: rows.filter((r) => r.winner === 'red').length };
  const by = (lvl) => { const q = rows.filter((r) => r.level === lvl); return q.length + ' matches: blue ' + q.filter((r) => r.winner === 'blue').length + ', red ' + q.filter((r) => r.winner === 'red').length; };
  const rep = ['# Sofa siege: bot against bot, 20 matches', '',
    'Made by `tests/fight-test.js` (headless, stepped fast, no drawing of frames). Both sides are the same bot at the same level; the teams swap ends every match. Match 1 plays the full 2-minute build step; the others start from preset camps.', '',
    '| What | Result |', '|---|---|',
    '| Wins | blue ' + wins.blue + ', red ' + wins.red + ' |',
    '| Wins by end of table | front ' + rows.filter((r) => r.winSide === 0).length + ', far ' + rows.filter((r) => r.winSide === 1).length + ' |',
    '| Easy | ' + by('easy') + ' |', '| Normal | ' + by('normal') + ' |', '| Hard | ' + by('hard') + ' |',
    '| Average fight length | ' + avg((r) => r.len).toFixed(0) + ' s of 180 s (shortest ' + Math.min(...rows.map((r) => r.len)).toFixed(0) + ' s) |',
    '| Ended early by reaching 100 | ' + rows.filter((r) => r.len < 179.9).length + ' of 20 |',
    '| Hill changed hands | ' + avg((r) => r.flips).toFixed(1) + ' times a match (least ' + Math.min(...rows.map((r) => r.flips)) + ', most ' + Math.max(...rows.map((r) => r.flips)) + ') |',
    '| Parts knocked off | ' + avg((r) => r.partsOff).toFixed(1) + ' a match; ' + avg((r) => r.mended).toFixed(1) + ' mended back |',
    '| Mice made dizzy | ' + avg((r) => r.dizzies).toFixed(1) + ' a match |',
    '| Marbles fired | ' + avg((r) => r.shots).toFixed(1) + ' a match |',
    '| Stuck mice (no move for 20 s while it had a goal) | ' + sum((r) => r.stuck) + ' |',
    '| Longest stretch with no event | ' + Math.max(...rows.map((r) => r.gap)).toFixed(1) + ' s (average worst ' + avg((r) => r.gap).toFixed(1) + ' s) |', '',
    'An event is a marble fired, a part knocked off or mended, a mouse going dizzy or popping home, or the hill changing hands.', '',
    'Twenty matches is a small sample: a 13 to 7 split can come from chance alone. The quiet stretch of about 20 s is the 10 s mend break (no marbles, no scoring) plus the slow easy-level lobber on either side of it.', '',
    '| # | Level | Front team | Winner | Score front:far | Fight s | Hill flips | Parts off | Mended | Dizzy | Longest quiet s |', '|---|---|---|---|---|---|---|---|---|---|---|']
    .concat(rows.map((r) => '| ' + (r.i + 1) + ' | ' + r.level + ' | ' + r.front + ' | ' + r.winner + ' | ' + r.score[0] + ':' + r.score[1] + ' | ' + r.len.toFixed(0) + ' | ' + r.flips + ' | ' + r.partsOff + ' | ' + r.mended + ' | ' + r.dizzies + ' | ' + r.gap.toFixed(1) + ' |'));
  fs.writeFileSync(path.resolve(__dirname, '..', 'BOT_REPORT.md'), rep.join('\n') + '\n');
  console.log('--- 20 bot matches: blue ' + wins.blue + ', red ' + wins.red + '; average ' + avg((r) => r.len).toFixed(0) + ' s; hill flips ' + avg((r) => r.flips).toFixed(1) + '; parts off ' + avg((r) => r.partsOff).toFixed(1) + '; stuck ' + sum((r) => r.stuck) + '; longest quiet ' + Math.max(...rows.map((r) => r.gap)).toFixed(1) + ' s');
  console.log('test took ' + ((Date.now() - T0) / 1000).toFixed(0) + ' s');
  console.log(bad ? ('FAILED ' + bad + ' of ' + n) : ('ALL ' + n + ' PASSED'));
  await b.close(); process.exit(bad ? 1 : 0);
};
run();
