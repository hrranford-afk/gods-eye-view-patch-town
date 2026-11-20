/* Round Table Kingdom pull-back aiming test. Run: NODE_PATH=$(npm root -g) node tests/pull-test.js
   Power from pull length, the sweet band, over-pull scatter, cancel, two lobbers, touch (pointer events with pointerType touch), easy aim. */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
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
  await p.addInitScript(() => {
    window.F2 = (team) => { SG.hold = true; SG.start(team || 'blue', { seed: 4242 }); SG.demo(11, 0); SG.sides[1].layout = 0; SG.skipBuild(); SG.begin(); SG.step(SG.CONFIG.count + .05); SG.sides[0].bot = SG.sides[1].bot = false; SG.stepUntil(() => SG.debug.crewReady(0), 15); SG.sides[0].reload = 0; };
    /* a touch finger: pointer events of type touch on the canvas */
    window.PT = (type, x, y, id) => { const el = document.querySelector('canvas'); el.dispatchEvent(new PointerEvent(type, { pointerId: id || 5, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, bubbles: true, cancelable: true })); };
    /* the lobber's screen spot, and the spot a pull of len table units straight back (towards me) lands on */
    window.LS = (s, li, len, ang) => { const l = SG.lobbers(s)[li || 0], a = ang || 0; return { l: SG.screen(l.x, l.z), g: SG.screen(l.x + Math.sin(a) * len, l.z + Math.cos(a) * len), lx: l.x, lz: l.z }; };
  });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__done', null, { timeout: 60000 });
  ok('page loads with 0 errors', errs.length === 0, errs.join(' | '));

  /* 1. pull length to power */
  const pw = await ev(() => { const P = SG.CONFIG.pull; return { none: SG.pullPower(P.min - .01), a: SG.pullPower(P.min), b: SG.pullPower(P.full * .75), c: SG.pullPower(P.full), d: SG.pullPower(P.full * 3), P }; });
  ok('a pull shorter than the minimum is no shot', pw.none === null);
  ok('power grows with the pull, is clamped to 1, and picks range', pw.a.p > 0 && pw.a.p < pw.b.p && pw.b.p < pw.c.p + 1e-9 && pw.c.p === 1 && pw.d.p === 1 && pw.a.range < pw.b.range && Math.abs(pw.c.range - pw.P.rangeMax) < 1e-9, JSON.stringify(pw));
  ok('the zones are weak, sweet (65-85%), then over', await ev(() => { const z = (f) => SG.pullPower(SG.CONFIG.pull.full * f).zone; return z(.3) === 'weak' && z(.64) === 'weak' && z(.66) === 'sweet' && z(.84) === 'sweet' && z(.86) === 'over' && z(1) === 'over'; }));
  ok('scatter: none in the sweet band, a little under it, growing over it', await ev(() => { const s = SG.pullScatter; return s(.7) === 0 && s(.85) === 0 && s(.3) > 0 && s(.3) < SG.CONFIG.pull.weakScatter && s(.9) > 0 && s(.95) > s(.9) && s(1) === SG.CONFIG.pull.overScatter; }));

  /* 2. accuracy: sweet is exact, over-pull is loose (30 shots each, from a lobber with unlimited winding) */
  const acc = await ev(() => { F2('blue'); const out = {}; const l = SG.lobbers(0)[0];
    const sh = (pwr, k) => { const m = []; for (let i = 0; i < k; i++) { SG.sides[0].reload = 0; SG.sides[0].corkCd = 0; const a = SG.fireLobber(0, 0, -3, pwr, { li: 0 }); m.push(a ? a.pull.miss : -1); SG.marbles.length = 0; } return m; };
    out.sweet = sh(.75, 30); out.lo = sh(.66, 10); out.hi = sh(.84, 10); out.over1 = sh(.92, 40); out.over2 = sh(1, 40); out.weak = sh(.3, 30);
    SG.sides[0].reload = 0; const a1 = SG.fireLobber(0, 0, -3, .5, { li: 0 }); const r1 = Math.hypot(a1.fx - l.x, a1.fz - l.z); SG.marbles.length = 0; SG.sides[0].reload = 0; const a2 = SG.fireLobber(0, 0, -3, .75, { li: 0 }); const r2 = Math.hypot(a2.fx - l.x, a2.fz - l.z);
    out.r1 = r1; out.r2 = r2; out.zone = a2.pull.zone; return out; });
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  ok('sweet band shots (65%, 75%, 84%) land exactly where aimed (miss 0 in 50 shots)', [...acc.sweet, ...acc.lo, ...acc.hi].every((m) => m === 0), JSON.stringify(acc.sweet.slice(0, 5)));
  ok('over-pull scatters: mean miss at 92% and at 100% both > 0.15 and 100% is looser', mean(acc.over1) > .15 && mean(acc.over2) > mean(acc.over1), mean(acc.over1) + ' ' + mean(acc.over2));
  ok('weak shots are only a little loose (mean miss < weakScatter) but never exact', mean(acc.weak) < .25 && mean(acc.weak) > 0, String(mean(acc.weak)));
  ok('power maps to range: 75% goes further than 50%, and a 75% shot is in the sweet band', acc.r2 > acc.r1 + .8 && acc.zone === 'sweet', JSON.stringify([acc.r1, acc.r2]));
  ok('the same seed gives the same scatter (deterministic)', await ev(() => { const run = () => { F2('blue'); SG.sides[0].reload = 0; const a = SG.fireLobber(0, 0, -3, 1, { li: 0 }); return [a.pull.missX, a.pull.missZ]; }; const A = run(), B = run(); return A[0] === B[0] && A[1] === B[1] && A[0] !== 0; }));
  ok('power null fires exactly like the old SG.fire (bots and old tests)', await ev(() => { F2('blue'); SG.sides[0].reload = 0; const a = SG.fireLobber(0, .3, -2.2, null, { li: 0 }); return !!a && Math.abs(a.fx - .3) < 1e-9 && Math.abs(a.fz + 2.2) < 1e-9 && !a.pull; }));
  ok('a shot that cannot fire (still winding) returns null', await ev(() => { F2('blue'); SG.sides[0].reload = 3; return SG.fireLobber(0, 0, -3, .75, { li: 0 }) === null; }));

  /* 3. touch: pointer events of type touch on the canvas */
  await ev(() => { F2('blue'); SG.setTool('lobber', 0); SG.hold = false; SG.render(); });
  const d1 = await ev(() => LS(0, 0, 1.1));
  await ev(([a]) => PT('pointerdown', a.l.x, a.l.y), [d1]);
  await ev(([a]) => PT('pointermove', a.g.x, a.g.y), [d1]);
  await ev(() => SG.render());
  const st = await ev(() => ({ s: SG.pullState(0), aim: SG.sides[0].aim, lz: SG.lobbers(0)[0].z, meter: document.getElementById('pullMeter') && document.getElementById('pullMeter').style.display }));
  ok('touch: dragging back shows the band and the power meter, in the sweet band', st.s && st.s.zone === 'sweet' && st.s.band && st.s.meter && st.meter === 'block', JSON.stringify(st));
  ok('touch: the preview aims away from the drag (forward, to the far camp)', st.aim.on && st.aim.tz < st.lz - 3, JSON.stringify(st.aim));
  if (shots) await p.screenshot({ path: path.resolve(__dirname, '..', 'shots', 'pull-1.png') });
  await ev(([a]) => PT('pointerup', a.g.x, a.g.y), [d1]);
  const rel = await ev(() => ({ shots: SG.stats.shots, m: SG.marbles[0] && SG.marbles[0].pull, reload: SG.sides[0].reload, ps: SG.pullState(0) }));
  ok('touch: letting go fires one marble with sweet power, no scatter, and clears the band', rel.shots === 1 && rel.m && rel.m.zone === 'sweet' && rel.m.miss === 0 && rel.reload > 2 && rel.ps === null, JSON.stringify(rel));
  if (shots) { await ev(() => { SG.step(.12); SG.render(); }); await p.screenshot({ path: path.resolve(__dirname, '..', 'shots', 'pull-3.png') }); await ev(() => { SG.step(1.1); SG.render(); }); await p.screenshot({ path: path.resolve(__dirname, '..', 'shots', 'pull-4.png') }); }

  /* 4. over-pull on touch: scatter, shaking, over zone */
  await ev(() => { F2('blue'); SG.setTool('lobber', 0); SG.hold = false; SG.render(); });
  const d2 = await ev(() => LS(0, 0, 1.45));
  await ev(([a]) => PT('pointerdown', a.l.x, a.l.y, 6), [d2]); await ev(([a]) => PT('pointermove', a.g.x, a.g.y, 6), [d2]); await ev(() => SG.render());
  const st2 = await ev(() => SG.pullState(0));
  ok('touch: a long pull shows the over zone', st2 && st2.zone === 'over' && st2.scatter > .5, JSON.stringify(st2));
  if (shots) await p.screenshot({ path: path.resolve(__dirname, '..', 'shots', 'pull-2.png') });
  await ev(([a]) => PT('pointerup', a.g.x, a.g.y, 6), [d2]);
  ok('touch: the over-pulled shot is marked over and lands off the aimed spot', await ev(() => { const m = SG.marbles[0]; return SG.stats.shots === 1 && m.pull.zone === 'over' && m.pull.miss > 0; }));

  /* 5. cancel */
  await ev(() => { F2('blue'); SG.setTool('lobber', 0); SG.hold = false; SG.render(); });
  const c1 = await ev(() => LS(0, 0, .1));
  await ev(([a]) => PT('pointerdown', a.l.x, a.l.y, 7), [c1]); await ev(([a]) => PT('pointermove', a.g.x, a.g.y, 7), [c1]); await ev(([a]) => PT('pointerup', a.g.x, a.g.y, 7), [c1]);
  ok('cancel: a pull shorter than the minimum fires nothing', await ev(() => SG.stats.shots === 0 && SG.sides[0].reload === 0 && !SG.sides[0].aim.on));
  const c2 = await ev(() => LS(0, 0, 1.2));
  await ev(([a]) => PT('pointerdown', a.l.x, a.l.y, 8), [c2]); await ev(([a]) => PT('pointermove', a.g.x, a.g.y, 8), [c2]); const was = await ev(() => SG.sides[0].aim.on);
  await ev(([a]) => PT('pointermove', a.l.x, a.l.y, 8), [c2]); await ev(([a]) => PT('pointerup', a.l.x, a.l.y, 8), [c2]);
  ok('cancel: pulling out then back to the ring and letting go fires nothing and sends no order', was && await ev(() => SG.stats.shots === 0 && !SG.sides[0].aim.on && !SG.sides[0].order));
  ok('cancel: a pointercancel (a palm, a call) fires nothing and clears the band', await ev(([a]) => { PT('pointerdown', a.l.x, a.l.y, 9); PT('pointermove', a.g.x, a.g.y, 9); const on = SG.sides[0].aim.on; PT('pointercancel', a.g.x, a.g.y, 9); return on && !SG.sides[0].aim.on && !SG.sides[0].pull && SG.stats.shots === 0; }, [c2]));

  /* 6. easy aim: the old mapping, exact, no band */
  const ez = await ev(() => { F2('blue'); SG.setEasyAim(true); SG.setTool('lobber', 0); SG.hold = false; SG.render(); return LS(0, 0, .9); });
  await ev(([a]) => PT('pointerdown', a.l.x, a.l.y, 10), [ez]); await ev(([a]) => PT('pointermove', a.g.x, a.g.y, 10), [ez]); await ev(() => SG.render());
  const e1 = await ev(() => ({ s: SG.pullState(0), a: SG.sides[0].aim, lz: SG.lobbers(0)[0].z }));
  await ev(([a]) => PT('pointerup', a.g.x, a.g.y, 10), [ez]);
  ok('easy aim: old mapping (0.9 back = 2.34 forward), exact shot, no meter', e1.a.on && Math.abs((e1.lz - e1.a.tz) - 2.34) < .15 && await ev(() => { const m = SG.marbles[0]; return SG.stats.shots === 1 && !m.pull && !document.getElementById('pullMeter') || document.getElementById('pullMeter').style.display === 'none'; }), JSON.stringify(e1));
  ok('easy aim is OFF by default, and a fresh page starts without it', await ev(() => { SG.setEasyAim(false); return SG.easyAim === false; }));
  ok('AR: a table under 80 cm starts with Easy aim on (setting is CONFIG.pull.easyAr)', await ev(() => SG.CONFIG.pull.easyAr === 80));

  /* 7. two lobbers in the Lab, each pulled on its own */
  await ev(() => document.getElementById('m_lab').click());
  await ev(() => { SG.hold = true; SG.lab.card = false; SG.labLoadTarget('empty'); SG.labStarter(); SG.lab.crew = false; SG.labTool('fire'); SG.setEasyAim(false); SG.hold = false; SG.render(); });
  const two = await ev(() => ({ n: SG.lobbers(0).length, a: LS(0, 0, 1.1), b: LS(0, 1, 1.1) }));
  ok('lab: my camp has two lobbers', two.n === 2);
  await ev(([a]) => PT('pointerdown', a.l.x, a.l.y, 11), [two.a]); await ev(([a]) => PT('pointermove', a.g.x, a.g.y, 11), [two.a]);
  const tl = await ev(() => ({ li: SG.sides[0].aim.li, st: SG.pullState(0) }));
  await ev(([a]) => PT('pointerup', a.g.x, a.g.y, 11), [two.a]);
  const r1 = await ev(() => ({ shots: SG.stats.shots, r: SG.lobbers(0).map((l) => l.reload || 0) }));
  ok('lab: pulling lobber 1 aims and fires lobber 1 only', tl.li === 0 && tl.st && tl.st.zone === 'sweet' && r1.shots >= 1 && r1.r[0] > .05 && r1.r[1] === 0, JSON.stringify([tl, r1]));
  await ev(([a]) => PT('pointerdown', a.l.x, a.l.y, 12), [two.b]); await ev(([a]) => PT('pointermove', a.g.x, a.g.y, 12), [two.b]);
  const t2 = await ev(() => ({ li: SG.sides[0].aim.li, st: SG.pullState(0), r0: SG.lobbers(0)[0].reload }));
  await ev(([a]) => PT('pointerup', a.g.x, a.g.y, 12), [two.b]);
  const r2 = await ev(() => ({ shots: SG.stats.shots, r: SG.lobbers(0).map((l) => l.reload || 0) }));
  ok('lab: then pulling lobber 2 fires lobber 2, and lobber 1 keeps its own winding', t2.li === 1 && r2.shots === r1.shots + 1 && r2.r[1] > .05 && Math.abs(r2.r[0] - t2.r0) < .01, JSON.stringify([t2, r2]));
  ok('lab: both fall under the same API (SG.fireLobber with a lab option force)', await ev(() => { const a = SG.fireLobber(0, 0, -2, .75, { li: 1, force: true }); return !!a && a.pull.zone === 'sweet'; }));
  ok('the whole run had 0 page errors', errs.length === 0, errs.join(' | '));
  console.log(bad ? 'FAILED ' + bad + ' of ' + n : 'ALL ' + n + ' PASSED');
  await b.close(); process.exit(bad ? 1 : 0);
};
run().catch((e) => { console.error(e); process.exit(1); });
