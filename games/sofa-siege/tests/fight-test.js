/* Round Table Kingdom fight test. Run: NODE_PATH=$(npm root -g) node tests/fight-test.js
   (The balance sweep and BOT_REPORT.md come from tests/sweep.js.) */
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
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  let n = 0, bad = 0;
  const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra && !cond ? '  -> ' + extra : '')); };
  const ev = async (f, a) => { const t = Date.now(); const r = await p.evaluate(f, a); if (Date.now() - t > 5000) console.log('  (slow step: ' + ((Date.now() - t) / 1000).toFixed(1) + ' s)'); return r; };
  await p.addInitScript(() => {
    /* a fresh match at the start of round 1, both camps from preset 0, nobody bot-driven unless asked */
    window.FIGHT = (team, bots) => { SG.hold = true; SG.quick(team || 'blue', { seed: 4242 }); SG.sides[0].bot = !!bots; SG.sides[1].bot = !!bots; };
    /* wait for a mouse to reach the lobber, then have it wound up */
    window.CREW = (s) => { const ok = SG.stepUntil(() => SG.debug.crewReady(s), 15); SG.sides[s].reload = 0; return ok; };
    window.WALL = (s) => SG.pieces.filter((q) => q.side === s && q.kind === 'wall').sort((a, c) => Math.hypot(a.x, a.z) - Math.hypot(c.x, c.z))[0];
    window.KIND = (s, k) => SG.pieces.filter((q) => q.side === s && q.kind === k)[0];
  });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__done', null, { timeout: 60000 });
  ok('page loads with 0 errors', errs.length === 0, errs.join(' | '));
  ok('the game is called Round Table Kingdom', await ev(() => document.title === 'Round Table Kingdom' && /Round Table Kingdom/.test(document.querySelector('#start h1').textContent)));

  /* flow: Camp ready waits for Start battle, then 3-2-1 */
  await p.click('#bPlay'); await ev(() => { SG.hold = true; SG.demo(11, 0); SG.done(); SG.step(8); SG.render(); });
  ok('"Camp ready" waits for the Start battle button', await ev(() => SG.phase === 'ready' && document.getElementById('bStart').offsetParent !== null));
  await p.click('#bStart'); await ev(() => { SG.step(.5); SG.render(); });
  ok('each round starts with a 3-2-1', await ev(() => SG.phase === 'count' && SG.round === 1 && document.getElementById('big').style.display === 'block' && document.getElementById('big').textContent === '3'));
  ok('then round 1 runs, with two camps of 11 built pieces', await ev(() => { SG.step(2.6); return SG.phase === 'fight' && SG.pieces.length === 22 && SG.pieces.every((q) => q.built) && SG.sides[0].lobber > 0 && SG.sides[1].lobber > 0; }));

  /* the crew rule */
  const cr = await ev(() => { SG.hold = true; SG.start('blue', { seed: 4242 }); SG.demo(11, 0); SG.skipBuild(); SG.begin(); SG.step(.2); const early = SG.lobberBlock(0); SG.step(SG.CONFIG.count); SG.sides[1].bot = false;
    const m0 = SG.mice[SG.sides[0].crew]; SG.debug.dizzy(0, m0.i); SG.sides[0].reload = 0; const b0 = SG.lobberBlock(0) + '/' + early, f0 = SG.fire(0, 1.6, -.2); const ready = CREW(0); const who = SG.sides[0].crew, b1 = SG.lobberBlock(0);
    SG.debug.dizzy(0, who); const b2 = SG.lobberBlock(0), f2 = SG.fire(0, 1.6, -.2); const again = SG.stepUntil(() => SG.debug.crewReady(0), 15); return { b0, f0: !!f0, ready, who, b1, b2, f2: !!f2, again, who2: SG.sides[0].crew }; });
  ok('the lobber cannot fire until a mouse stands beside it', cr.b0.indexOf('crew/') === 0 && !cr.f0 && cr.ready && cr.b1 === '', JSON.stringify(cr));
  ok('a dizzy crew means no shots until another mouse arrives', cr.b2 === 'crew' && !cr.f2 && cr.again && cr.who2 !== cr.who, JSON.stringify(cr));

  /* a marble lands where the arc says */
  const shot = await ev(() => { FIGHT('blue'); CREW(0); const a = SG.arc(0, 1.6, -.2); const f = SG.fire(0, 1.6, -.2); SG.stepUntil(() => SG.lastHit, 8); return { a, f: !!f, hit: SG.lastHit, reload: SG.sides[0].reload, cfg: SG.CONFIG.reload }; });
  ok('a marble with a fixed aim lands where predicted (within 0.02)', shot.f && shot.a.hit === null && shot.hit && Math.hypot(shot.hit.x - shot.a.x1, shot.hit.z - shot.a.z1) < .02 && shot.hit.piece === 0, JSON.stringify(shot));
  ok('the lobber then winds for ' + shot.cfg + ' seconds and cannot fire meanwhile', shot.reload > shot.cfg - 2.5 && shot.reload < shot.cfg && await ev(() => SG.lobberBlock(0) === 'winding' && SG.fire(0, 1, 0) === null));

  /* a hit on a wall knocks exactly one named part off */
  const hit = await ev(() => { FIGHT('blue'); CREW(0); const w = WALL(1), before = w.parts, total = SG.pieces.reduce((s, q) => s + q.parts, 0); const a = SG.arc(0, w.x, w.z); SG.fire(0, w.x, w.z); SG.stepUntil(() => SG.lastHit, 8);
    const off = w.ps.filter((q) => q.st === 'off'); return { before, after: w.parts, off: off.map((q) => q.id), hit: SG.lastHit, wall: w.id, pre: a.hit && a.hit.piece, lost: total - SG.pieces.reduce((s, q) => s + q.parts, 0), partsOff: SG.stats.partsOff, pops: SG.pops.map((q) => q.text) }; });
  ok('a marble on a wall knocks off exactly one named part (' + hit.off.join(',') + ')', hit.off.length === 1 && hit.before - hit.after === 1 && hit.lost === 1 && hit.partsOff === 1 && hit.hit.piece === hit.wall && hit.pre === hit.wall && hit.hit.part === hit.off[0] && /^wall\./.test(hit.off[0]), JSON.stringify(hit));
  ok('a pop-up names the part that fell', hit.pops.some((t) => / off!$/.test(t)), JSON.stringify(hit.pops));
  ok('lobbers and workshops lose parts too', await ev(() => { const l = KIND(1, 'lobber'), w = KIND(1, 'workshop'); return l.total === 4 && w.total === 4 && SG.debug.knock(l.id, 'lobber.crank') && SG.debug.knock(w.id, 'workshop.board') && l.parts === 3 && w.parts === 3 && SG.lobberBlock(1) === 'broken'; }));

  /* your own pieces are in the way too */
  const own = await ev(() => { FIGHT('blue'); CREW(0); const l = KIND(0, 'lobber'), t = KIND(0, 'tower'); const tx = l.x + (t.x - l.x) * 2.2, tz = l.z + (t.z - l.z) * 2.2; const a = SG.arc(0, tx, tz); const before = t.parts; SG.fire(0, tx, tz); SG.stepUntil(() => SG.lastHit, 8);
    SG.aim = { on: true, tx, tz }; SG.render(); return { pre: a.hit, tower: t.id, hit: SG.lastHit, lost: before - t.parts, ownHits: SG.stats.ownHits, shown: SG.aim.own }; });
  ok('the arc knows when your own piece is in the way, and shows red', own.pre && own.pre.own && own.pre.piece === own.tower && own.shown === true, JSON.stringify(own));
  ok('a marble aimed too low hits your own piece and knocks a part off it', own.hit.own && own.hit.piece === own.tower && own.lost === 1 && own.ownHits === 1, JSON.stringify(own));

  /* walls: walking and seeing */
  const wl = await ev(() => { FIGHT('red'); const w = WALL(0), d = Math.hypot(w.x, w.z), inP = [w.x * (1 + .32 / d), w.z * (1 + .32 / d)], outP = [w.x * (1 - .32 / d), w.z * (1 - .32 / d)];
    const blocked = !SG.sightClear(inP[0], inP[1], outP[0], outP[1]), open = SG.sightClear(0, .5, .3, -.5) && SG.sides[1].team === 'blue', wallShut = !SG.debug.isOpen(1, w.x, w.z) && !SG.debug.isOpen(0, w.x, w.z), g = KIND(0, 'gate'), gateMine = SG.debug.isOpen(0, g.x, g.z), gateTheirs = !SG.debug.isOpen(1, g.x, g.z);
    const keep = SG.CONFIG.squadRing; SG.CONFIG.squadRing = 0; SG.order(0, inP[0], inP[1]); SG.order(1, outP[0], outP[1]); let inside = 0, through = 0; for (let i = 0; i < 100; i++) { SG.step(.1); inside += SG.inWall(); } const c0 = SG.stats.corks, b0 = SG.stats.sightBlocked; for (let i = 0; i < 80; i++) { SG.step(.1); SG.corks.forEach((c) => { if (!SG.sightClear(c.x0, c.z0, c.x1, c.z1)) through++; }); } const refused = SG.stats.sightBlocked - b0;
    const near = SG.mice.filter((m) => m.side === 0 && Math.hypot(m.x - inP[0], m.z - inP[1]) < .6).length, nearRed = SG.mice.filter((m) => m.side === 1 && Math.hypot(m.x - outP[0], m.z - outP[1]) < .25).length, corks1 = through;
    w.ps.forEach((q) => { if (/plank/.test(q.id)) SG.debug.knock(w.id, q.id); }); const seeNow = SG.sightClear(inP[0], inP[1], outP[0], outP[1]), walkNow = SG.debug.isOpen(1, w.x, w.z); SG.step(7); SG.CONFIG.squadRing = keep;
    return { refused, blocked, open, wallShut, gateMine, gateTheirs, inside, near, nearRed, corks1, seeNow, walkNow, corks2: SG.stats.corks - c0 }; });
  ok('an intact wall shuts the walking grid for both teams; your own gate is open to you only', wl.wallShut && wl.gateMine && wl.gateTheirs, JSON.stringify(wl));
  ok('corks are blocked by a wall: with squads either side of one, shots are refused and none crosses it', wl.blocked && wl.open && wl.near >= 3 && wl.nearRed >= 3 && wl.corks1 === 0 && wl.refused > 0, JSON.stringify(wl));
  ok('with the planks knocked out the wall lets mice and corks through', wl.seeNow && wl.walkNow && wl.corks2 > 0, JSON.stringify(wl));
  ok('a gap of two planks in a wall is a way through', await ev(() => { FIGHT('blue'); const w = WALL(0), q = w.ps.filter((x) => /plank/.test(x.id)).sort((a, c) => (a.wx - c.wx) || (a.wz - c.wz)); SG.debug.knock(w.id, q[2].id); const one = SG.debug.isOpen(1, (q[2].wx), (q[2].wz)); SG.debug.knock(w.id, q[3].id);
    const mx = (q[2].wx + q[3].wx) / 2, mz = (q[2].wz + q[3].wz) / 2; return !one && SG.debug.isOpen(1, mx, mz) && SG.debug.blocks(w.id); }));
  ok('a mouse with no way in waits with a "?", then takes the nearest spot it can reach', await ev(() => { FIGHT('blue'); const t = KIND(1, 'tent'); SG.order(0, t.x, t.z); let asked = false; SG.stepUntil(() => { if (SG.pops.some((q) => q.text === '?')) asked = true; return false; }, 14);
    const sq = SG.mice.filter((m) => m.side === 0 && m.i !== SG.sides[0].crew); return asked && SG.stats.noPath >= 1 && SG.stats.stuck === 0 && sq.every((m) => m.state === 'hold') && SG.inWall() === 0; }));

  /* dizzy, then home */
  const dz = await ev(() => { FIGHT('blue'); SG.order(1, 0, -.3); CREW(0); SG.stepUntil(() => SG.onHill()[1] === 4, 15); SG.step(.5); SG.sides[0].reload = 0; const foe = SG.mice.filter((m) => m.side === 1 && Math.hypot(m.x, m.z) < 1); const t = foe[0]; SG.fire(0, t.x, t.z); SG.stepUntil(() => SG.lastHit, 8);
    const d = foe.filter((m) => m.state === 'dizzy'); const who = d[0]; if (!who) return { n: 0, hit: SG.lastHit }; const at = [who.x, who.z]; SG.step(2); const still = who.state === 'dizzy' && who.x === at[0]; SG.step(SG.CONFIG.dizzy - 2 + .1);
    return { n: d.length, still, state: who.state, home: Math.hypot(who.x, who.z), z: who.z }; });
  ok('a marble on the hill makes enemy mice dizzy (' + dz.n + ' hit)', dz.n >= 1, JSON.stringify(dz));
  ok('a dizzy mouse sits for 5 seconds, then pops back to its own camp', dz.still && dz.state !== 'dizzy' && dz.home > 1.6 && dz.z < 0, JSON.stringify(dz));
  ok('both teams are dizzy for the same 5 seconds', await ev(() => { FIGHT('blue'); SG.debug.dizzy(0, 0); SG.debug.dizzy(1, 0); return SG.mice[0].t === 5 && SG.mice[5].t === 5 && SG.CONFIG.redDizzy === undefined; }));
  ok('a dizzy mouse does not count on the hill', await ev(() => { FIGHT('blue'); SG.order(1, 0, -.3); SG.stepUntil(() => SG.onHill()[1] === 4, 15); const before = SG.onHill()[1]; const m = SG.mice.filter((q) => q.side === 1 && Math.hypot(q.x, q.z) < 1)[0]; SG.debug.dizzy(1, m.i); return before === 4 && SG.onHill()[1] === 3; }));

  /* mending */
  const md = await ev(() => { FIGHT('blue'); const w = WALL(0); SG.debug.knock(w.id, 'wall.plank.2'); SG.step(1); const q = w.ps.find((x) => x.id === 'wall.plank.2'); const first = SG.mend(0, w.id);
    const seen = {}; let popped = false; SG.stepUntil(() => { SG.mice.forEach((m) => { if (m.side === 0) seen[m.state] = 1; }); if (SG.pops.some((x) => x.text === '+1 plank')) popped = true; return q.st === 'on'; }, 30);
    const mended = q.st === 'on' && w.parts === w.total; SG.debug.knock(w.id, 'wall.plank.2'); SG.step(1); const second = SG.mend(0, w.id); SG.step(12);
    return { first, seen: Object.keys(seen), mended, popped, used: q.used, second, final: q.st, mendedCount: SG.stats.partsMended }; });
  ok('a mouse carries the fallen part back and hammers it on, with a "+1 plank" pop-up', md.first && md.mended && md.popped && md.seen.includes('toPart') && md.seen.includes('bring') && md.seen.includes('fix'), JSON.stringify(md));
  ok('a part can be reclaimed once only', md.used && md.second === false && md.final === 'off' && md.mendedCount === 1, JSON.stringify(md));
  const brk = await ev(() => { FIGHT('blue'); const w = WALL(0); SG.debug.knock(w.id, 'wall.plank.1'); SG.debug.knock(w.id, 'wall.plank.4'); SG.stepUntil(() => SG.phase === 'mend', 70); SG.step(.3); SG.render(); const inBreak = SG.phase === 'mend' && w.parts === w.total - 2, text = document.getElementById('say').textContent;
    SG.stepUntil(() => SG.phase === 'count', 12); const cnt = SG.phase === 'count' && SG.round === 2; SG.stepUntil(() => SG.phase === 'fight', 5); return { inBreak, text, cnt, round: SG.round, whole: w.parts === w.total }; });
  ok('in the mend break free mice mend by themselves, and the break says what ("' + brk.text + '")', brk.inBreak && /mending: 2 planks/.test(brk.text) && brk.whole, JSON.stringify(brk));
  ok('round 2 follows the break after another 3-2-1', brk.cnt && brk.round === 2);

  /* the flag meter */
  const mt = await ev(() => { FIGHT('blue'); const keep = SG.CONFIG.corkChance; SG.CONFIG.corkChance = 0; SG.order(0, 0, .3); SG.stepUntil(() => SG.onHill()[0] === 4, 15); SG.step(2.2); const a = [SG.sides[0].score, SG.sides[1].score], on = SG.onHill(); SG.step(5); const b2 = [SG.sides[0].score, SG.sides[1].score];
    SG.order(1, 0, -.3); SG.stepUntil(() => SG.onHill()[1] === 4, 15); SG.step(1.1); const c = [SG.sides[0].score, SG.sides[1].score]; SG.step(5); const d = [SG.sides[0].score, SG.sides[1].score]; SG.CONFIG.corkChance = keep; return { a, on, b2, c, d, share: SG.blueShare(), gain: SG.CONFIG.gain, flips: SG.stats.hillFlips, holder: SG.lastHolder }; });
  ok('the meter fills only for the side with more mice on the hill', mt.on[0] === 4 && mt.on[1] === 0 && Math.abs((mt.b2[0] - mt.a[0]) - 5 * 4 * mt.gain) < .01 && mt.b2[1] === 0 && mt.d[1] === 0 && mt.holder === 0, JSON.stringify(mt));
  ok('with equal numbers on the hill nobody gains', Math.abs(mt.d[0] - mt.c[0]) < .01, JSON.stringify(mt));
  ok('the flag blends toward the leader', mt.share > .6, String(mt.share));

  /* team skills */
  ok('blue mice pop corks at enemies they can see', await ev(() => { FIGHT('blue'); SG.order(0, 0, .3); SG.order(1, 0, -.3); SG.step(10); return SG.stats.corks > 3; }));
  ok('red scrappers knock parts off a piece they can reach', await ev(() => { FIGHT('red'); const w = WALL(1); const k = (Math.hypot(w.x, w.z) - .3) / Math.hypot(w.x, w.z); SG.order(0, w.x * k, w.z * k); SG.step(14); return SG.stats.partsOff >= 1 && SG.lastKnock.by === 'scrap'; }));

  /* controls */
  await ev(() => { FIGHT('blue'); CREW(0); SG.hold = false; SG.render(); });
  const hs = await ev(() => SG.screen(0, .3));
  await p.mouse.click(hs.x, hs.y);
  ok('tapping the hill sends the squad there', await ev(() => SG.sides[0].order && Math.hypot(SG.sides[0].order.x, SG.sides[0].order.z - .3) < .08));
  await p.click('#b_lobber');
  const ls = await ev(() => { SG.sides[0].reload = 0; const l = SG.debug.piece(SG.sides[0].lobber); return [SG.screen(l.x, l.z), SG.screen(l.x, l.z + .9)]; });
  await p.mouse.move(ls[0].x, ls[0].y); await p.mouse.down(); await p.mouse.move(ls[1].x, ls[1].y, { steps: 4 });
  const aiming = await ev(() => ({ on: SG.aim.on, tz: SG.aim.tz, lz: SG.debug.piece(SG.sides[0].lobber).z }));
  await p.mouse.up();
  ok('dragging back from the lobber aims forward, and letting go fires one marble', aiming.on && aiming.tz < aiming.lz - 1.5 && await ev(() => SG.stats.shots === 1 && SG.sides[0].reload > 3), JSON.stringify(aiming));
  await p.click('#bCam'); const c1 = await ev(() => SG.cam); await p.click('#bCam'); const c2 = await ev(() => SG.cam); await p.click('#bCam');
  ok('the camera button steps through whole table, my camp, the hill', c1 === 1 && c2 === 2 && await ev(() => SG.cam === 0 && /Whole table/.test(document.getElementById('bCam').textContent)));
  await p.click('#bPause'); const t1 = await ev(() => SG.clock); await p.waitForTimeout(300);
  ok('pause stops the clock', await ev((t1) => SG.paused && SG.clock === t1, t1));
  await p.click('#bPause');

  /* a win shows the win screen */
  await ev(() => { FIGHT('blue'); SG.order(0, 0, .3); SG.stepUntil(() => SG.onHill()[0] >= 3, 15); SG.sides[0].score = 99; SG.step(2.5); SG.render(); });
  ok('first to 100 wins; the win screen offers Play again', await ev(() => SG.phase === 'over' && SG.winner === 0 && document.getElementById('win').style.display !== 'none' && /Blue wins/.test(document.getElementById('winTitle').textContent) && !!document.getElementById('bAgain')));

  /* five full bot matches, watched every tenth of a second: nobody inside an intact wall, nobody stuck */
  const watch = await ev(() => { let inside = 0, stuck = 0, samples = 0, over = 0, rounds = 0; for (let i = 0; i < 5; i++) { const lvl = ['easy', 'normal', 'hard'][i % 3]; SG.hold = true; SG.start(i % 2 ? 'red' : 'blue', { seed: 700 + i * 977, level: lvl }); SG.auto(0, lvl);
      let g = 0; while (SG.phase !== 'over' && g++ < 4000) { SG.step(.1); inside += SG.inWall(); samples++; } if (SG.phase === 'over') over++; stuck += SG.stats.stuck; rounds = Math.max(rounds, SG.round); } return { inside, stuck, samples, over, rounds }; });
  ok('no mouse is ever inside an intact wall in 5 full bot matches (' + watch.samples + ' looks)', watch.inside === 0 && watch.over === 5, JSON.stringify(watch));
  ok('no mouse got stuck in those matches', watch.stuck === 0, JSON.stringify(watch));

  /* 20 quick bot-against-bot matches */
  const rows = await ev(() => { const r = []; for (let i = 0; i < 20; i++) { const lvl = ['easy', 'normal', 'hard'][i % 3]; SG.hold = true; SG.start(i % 2 ? 'red' : 'blue', { seed: 5000 + i * 131, level: lvl }); SG.auto(0, lvl); SG.skipBuild(); SG.begin(); let g = 0; while (SG.phase !== 'over' && g++ < 400) SG.step(1);
      r.push({ over: SG.phase === 'over', winner: SG.winner >= 0 ? SG.sides[SG.winner].team : '', round: SG.round, len: SG.stats.fightTime, stuck: SG.stats.stuck }); } return r; });
  ok('20 bot-against-bot matches all end with a winner inside 3 rounds', rows.every((r) => r.over && r.winner && r.round <= 3 && r.len <= 180.2), JSON.stringify(rows.filter((r) => !r.over)));
  ok('no mouse got stuck in 20 matches', rows.reduce((s, r) => s + r.stuck, 0) === 0);
  ok('still 0 errors', errs.length === 0, errs.join(' | '));

  /* the self-measuring auto-play page, sped up */
  const p2 = await b.newPage({ viewport: { width: 480, height: 360 } }); const errs2 = []; p2.on('pageerror', (e) => errs2.push(e.message));
  await p2.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?auto=both&level=normal&report=1&speed=30&skipbuild=1');
  await p2.waitForFunction('window.SG_REPORT', null, { timeout: 100000 }).catch(() => {});
  const rp = await p2.evaluate(() => ({ r: window.SG_REPORT, started: document.getElementById('start').style.display === 'none', panel: !!document.getElementById('report'), text: document.getElementById('reportText') ? document.getElementById('reportText').value : '', copy: !!document.getElementById('bCopy') }));
  const r = rp.r || {};
  ok('?auto=both plays a whole match with no title screen and fills SG_REPORT', !!rp.r && rp.started && (r.winner === 'blue' || r.winner === 'red') && r.rounds >= 1 && r.rounds <= 3 && r.matchSeconds > 20 && r.scores.front.team !== r.scores.far.team, JSON.stringify(r));
  ok('the report has frame times, draw calls, triangles and match numbers', r.frames > 5 && r.fpsAverage > 0 && r.fpsWorst1pc > 0 && r.fpsWorst1pc <= r.fpsAverage + .01 && r.longestFrameMs > 0 && r.peakDrawCalls > 50 && r.peakTriangles > 10000 && r.partsKnockedOff >= 0 && r.dizzies >= 0 && r.hillChanges >= 0 && Array.isArray(r.pageErrors) && r.pageErrors.length === 0 && /Mozilla/.test(r.userAgent || '') && r.canvas && r.canvas.width > 0, JSON.stringify(r));
  ok('report=1 shows it in a panel that can be selected, with a Copy button', rp.panel && rp.copy && rp.text.indexOf('"fpsAverage"') > 0 && JSON.parse(rp.text).winner === r.winner);
  await p2.close(); await ev(() => { SG.hold = true; });
  const p3 = await b.newPage({ viewport: { width: 800, height: 600 } });
  await p3.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?auto=red&level=hard'); await p3.waitForFunction('window.__done');
  ok('?auto=red skips the title: the bot plays red and you play blue', await p3.evaluate(() => SG.phase === 'build' && SG.team === 'blue' && SG.sides[1].team === 'red' && SG.sides[1].bot && !SG.sides[0].bot && SG.level === 'hard' && document.getElementById('start').style.display === 'none'));
  ok('a normal start has no report and no panel', await ev(() => window.SG_REPORT === undefined && !document.getElementById('report')));
  ok('the auto pages had 0 errors', errs2.length === 0, errs2.join(' | '));

  console.log('auto report: ' + JSON.stringify({ winner: r.winner, fps: r.fpsAverage, worst1pc: r.fpsWorst1pc, longestMs: r.longestFrameMs, calls: r.peakDrawCalls, tris: r.peakTriangles }));
  console.log('test took ' + ((Date.now() - T0) / 1000).toFixed(0) + ' s');
  console.log(bad ? ('FAILED ' + bad + ' of ' + n) : ('ALL ' + n + ' PASSED'));
  await b.close(); process.exit(bad ? 1 : 0);
};
run();
