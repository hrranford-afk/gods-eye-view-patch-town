/* Round Table Kingdom rolling shots test (Lab). Run: NODE_PATH=$(npm root -g) node tests/roll-test.js [--shots]
   A Marble lands, hops 1 to 3 times, then rolls on along its flight line, knocking loose parts; heavy things stop it. Off in matches. */
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
  const shot = (name) => p.screenshot({ path: path.resolve(__dirname, '..', 'shots', name), clip: { x: 340, y: 230, width: 600, height: 400 } });   /* the middle of the table, cropped, so the ball is big enough to see */
  await p.addInitScript(() => {
    /* my lobber at the near edge; one target piece (or none) across the table; set rolling; fire a marble to land at tz, and run it out */
    window.SETUP = (kind, z, rolling) => { SG.labLoadTarget('empty'); SG.labLoadRecs(0, [{ kind: 'lobber', side: 0, x: 0, z: 2.05, rot: Math.PI }]); SG.labLoadRecs(1, kind ? [{ kind, side: 1, x: 0, z, rot: 0 }] : []); SG.setRolling(rolling); SG.stats.bounces = 0; SG.marbles.length = 0; SG.sides[0].aim.on = false; };
    window.SHOOT = (ammo, tz, settle) => { SG.labSetAmmo(ammo); SG.labSetHigh(false); const off0 = SG.stats.partsOff, a = SG.labFire(0, 0, 0, tz, { force: true, seed: 5 }); if (settle !== false) SG.labSettle(12); return { a, off: SG.stats.partsOff - off0, hz: +a.hz.toFixed(3), hx: +a.hx.toFixed(3), n: a.rm ? a.rm.n : -1, E: a.rm ? a.rm.E : -1, E0: a.rm ? a.rm.E0 : -1, by: SG.lastKnock && SG.lastKnock.by, bounces: SG.stats.bounces }; };
  });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__done', null, { timeout: 60000 });
  await ev(() => { document.getElementById('m_lab').click(); SG.hold = true; SG.lab.card = false; SG.lab.crew = false; });
  ok('the Lab has rolling shots on by default; a match has them off (CONFIG.v2.rolling.on is false)', await ev(() => SG.rollingOn() === true && SG.CONFIG.v2.rolling.on === false));

  /* a marble that lands short of a wall rolls into it */
  const w1 = await ev(() => { SETUP('wall', -1.5, false); const off = SHOOT('marble', -.9); SETUP('wall', -1.5, true); const on = SHOOT('marble', -.9); return { off, on }; });
  ok('rolling off: a marble that lands 0.6 short of a wall knocks nothing (as before)', w1.off.off === 0 && w1.off.n === -1, JSON.stringify(w1.off));
  ok('rolling on: the same shot rolls into the wall and knocks a part off, by "roll"', w1.on.off >= 1 && w1.on.by === 'roll' && w1.on.hz > -1.9, JSON.stringify(w1.on));
  /* hops */
  const hp = await ev(() => { SETUP(null, 0, true); const a = SHOOT('marble', -1); SG.CONFIG.v2.rolling.marble.hops = 3; SETUP(null, 0, true); const b3 = SHOOT('marble', -1); SG.CONFIG.v2.rolling.marble.hops = 2; SETUP(null, 0, true); const bg = SHOOT('big', -1); return { a: a.bounces, b3: b3.bounces, big: bg.bounces, hz: [a.hz, b3.hz, bg.hz] }; });
  ok('a bounce count: a Marble hops twice, three when set to 3 (CONFIG), a Big Marble once', hp.a === 2 && hp.b3 === 3 && hp.big === 1, JSON.stringify(hp));
  ok('it rolls on past its hops: it ends well beyond where it landed, and the Big Marble goes furthest', hp.hz[0] < -2 && hp.hz[2] < hp.hz[0] - .3, JSON.stringify(hp.hz));
  /* a gate: bare and intact are different from a wall */
  const gt = await ev(() => { SETUP('gate', -1.5, true); const g = SG.pieces.filter((q) => q.side === 1 && q.kind === 'gate')[0]; g.ps.filter((q) => /door|lintel/.test(q.id)).forEach((q) => SG.debug.knock(g.id, q.id)); SG.step(1); const bare = SHOOT('marble', -.9);
    SETUP('wall', -1.5, true); const wl = SHOOT('marble', -.9); return { bare, wl, ps: g.ps.map((q) => q.id + ':' + q.st).join(' ') }; });
  ok('a gate with no door and no lintel: the marble rolls through it (no part touched, ends past the gate)', gt.bare.n === 0 && gt.bare.hz < -1.9, JSON.stringify(gt));
  ok('a wall stops the same marble short of the far side', gt.wl.hz > -1.9 && gt.wl.E <= 0, JSON.stringify(gt.wl));
  /* a hit slows it */
  const sl = await ev(() => { SETUP('wall', -1.5, true); SG.labSetAmmo('marble'); const a = SG.labFire(0, 0, 0, -.9, { force: true, seed: 5 }); let v0 = 0, v1 = 0, hit = false, steps = 0; const trace = [];
    while (steps++ < 700 && !(a.rm && a.rm.done)) { SG.step(1 / 60); if (a.rm) { if (!v0 && a.rolling && a.rm.n === 0) v0 = a.rm.v; if (a.rm.n >= 1 && !hit) { hit = true; v1 = a.rm.v; } if (steps % 20 === 0) trace.push(+a.rm.v.toFixed(2)); } }
    return { v0, v1, hit, E: a.rm && a.rm.E0 }; });
  ok('a hit slows it: its speed just after knocking a part is lower than just before', sl.hit && sl.v1 < sl.v0 * .8, JSON.stringify(sl));
  const lo = await ev(() => { SETUP(null, 0, true); const a = SHOOT('marble', -.9); SETUP('wall', -1.5, true); const b2 = SHOOT('marble', -.9); return { free: a.hz, wall: b2.hz }; });
  ok('a wall in the way shortens the roll (ends nearer than on open table)', lo.wall > lo.free + .5, JSON.stringify(lo));
  /* the Big Marble ploughs, and a Keep stops everything */
  const bg = await ev(() => { SETUP('wall', -1.5, true); const m = SHOOT('marble', -.9); SETUP('wall', -1.5, true); const b2 = SHOOT('big', -.9); SETUP('tower', -1.5, true); const t = SHOOT('big', -.9); return { m, b2, t: { off: t.off, hz: t.hz } }; });
  ok('a Big Marble ploughs through more of the wall than a Marble and gets further', bg.b2.off > bg.m.off && bg.b2.hz < bg.m.hz - .5, JSON.stringify(bg));
  ok('a Keep stops even a Big Marble (no part rolled off it)', bg.t.hz > -1.9, JSON.stringify(bg.t));
  /* deterministic */
  const det = await ev(() => { const r = () => { SETUP('wall', -1.5, true); const s = SHOOT('marble', -.9); return JSON.stringify([s.hz, s.hx, s.off, s.n, SG.pieces.filter((q) => q.side === 1)[0].ps.map((q) => q.st + q.rx.toFixed(3)).join('')]); }; return [r(), r()]; });
  ok('the same seed gives the same roll, the same parts and the same places (deterministic)', det[0] === det[1], det.join(' / '));
  /* a Bouncer and the cork and glue are as before */
  const bn = await ev(() => { SETUP('wall', -1.5, true); const b2 = SHOOT('bouncer', -1.8); return b2; });
  ok('a Bouncer hops over a wall and lands past it (1 bounce)', bn.bounces === 1 && bn.hz < -1.75, JSON.stringify(bn));
  ok('corks and glue do not roll', await ev(() => { SETUP('wall', -1.5, true); const c = SHOOT('corks', -.9), g = SHOOT('glue', -.9); return c.n === -1 && g.n === -1; }));
  /* matches: off, identical */
  ok('in a match no ball rolls on (rolling is off), and ?rolling=1 or SG.setRolling(true) turns it on', await ev(() => { SG.hold = true; SG.start('blue', { seed: 4242 }); SG.demo(11, 0); SG.sides[1].layout = 0; SG.skipBuild(); SG.begin(); SG.step(SG.CONFIG.count + .05); SG.sides[0].bot = SG.sides[1].bot = false; SG.stepUntil(() => SG.debug.crewReady(0), 15); SG.sides[0].reload = 0;
    const off = SG.rollingOn(), a = SG.fire(0, 0, -.8); SG.step(3); const ran = !!a.rm; SG.setRolling(true); const on = SG.rollingOn(); SG.setRolling(false); return off === false && !ran && on === true && SG.rollingOn() === false; }));
  /* screenshots */
  if (shots) {
    /* near the camera, with the panels hidden: the marble comes down 0.6 short of a wall and rolls into it */
    await ev(() => { document.getElementById('m_lab').click(); SG.hold = true; SG.lab.card = false; SG.lab.crew = false; ['lab', 'hud', 'bar', 'say', 'tag'].forEach((id) => { const e = document.getElementById(id); if (e) e.style.display = 'none'; }); document.querySelectorAll('.bar,.pop,#ui .btn').forEach((e) => { e.style.display = 'none'; });
      SETUP('wall', .55, true); SG.labSetAmmo('marble'); SG.labFire(0, 0, 0, 1.0, { force: true, seed: 5 }); SG.setCam(0); SG.camSnap = true; });
    for (let i = 0; i < 60; i++) { const st = await ev(() => { SG.step(.04); const m = SG.marbles[0]; return m && m.rm ? m.rm.hi : -1; }); if (st >= 0) break; }
    await ev(() => { SG.step(.15); SG.render(); }); await shot('roll-1.png');
    await ev(() => { SG.step(.45); SG.render(); }); await shot('roll-2.png');
    await ev(() => { SETUP('gate', .55, true); const g = SG.pieces.filter((q) => q.side === 1 && q.kind === 'gate')[0]; g.ps.filter((q) => /door|lintel/.test(q.id)).forEach((q) => SG.debug.knock(g.id, q.id)); SG.step(1); SG.labSetAmmo('big'); SG.labFire(0, 0, 0, 1.25, { force: true, seed: 5 }); SG.step(1.5); SG.render(); });
    await shot('roll-3.png');
  }
  ok('no page errors', errs.length === 0, errs.join(' | '));
  console.log(bad ? 'FAILED ' + bad + ' of ' + n : 'ALL ' + n + ' PASSED');
  await b.close(); process.exit(bad ? 1 : 0);
};
run().catch((e) => { console.error(e); process.exit(1); });
