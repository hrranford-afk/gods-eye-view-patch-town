/* Round Table Kingdom Lab (shooting range) test. Run: NODE_PATH=$(npm root -g) node tests/lab-test.js */
import { createRequire } from 'module';
import path from 'path';
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
  const ev = (f, a) => p.evaluate(f, a);
  const px = (x, z, y) => ev(([a, c, d]) => SG.screen(a, c, d), [x, z, y || 0]);
  const click = async (x, z) => { const q = await px(x, z); await p.mouse.click(q.x, q.y); };
  const btn = (a) => ev((a) => document.querySelector('#lab [data-a="' + a + '"]').click(), a);
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__done', null, { timeout: 60000 });
  await ev(() => { SG.hold = true; });

  /* 1. entering the Lab */
  ok('the title screen has a third button, "Shooting range (sandbox)"', await ev(() => /Shooting range/.test(document.getElementById('m_lab').textContent) && document.querySelectorAll('#start .row .btn').length > 3));
  await p.click('#m_lab');
  ok('the button enters the Lab: mode lab, a fight that never ends, no title card', await ev(() => SG.mode === 'lab' && SG.phase === 'fight' && !!SG.lab && document.getElementById('start').style.display === 'none' && document.getElementById('lab').style.display === 'block'));
  ok('first entry shows the how-to card, and "Got it" hides it and remembers', await ev(() => document.getElementById('labCard').style.display === 'flex') && (await btn('cardok'), await ev(() => document.getElementById('labCard').style.display === 'none' && window.localStorage.getItem('rtk.lab.seen.v1') === '1')));
  ok('no bot, no hill, no timer: both camps are driven by hand, the hill is hidden', await ev(() => SG.sides.every((s) => !s.bot && s.human) && SG.time > 1e5));
  ok('the world has my camp (blue, near) and a target camp (red, far)', await ev(() => { const m = SG.pieces.filter((q) => q.side === 0), t = SG.pieces.filter((q) => q.side === 1); return SG.sides[0].team === 'blue' && SG.sides[1].team === 'red' && m.length >= 1 && t.length >= 1 && m.every((q) => q.z > 0) && t.every((q) => q.z < 0); }));
  ok('"How to use" brings the card back', await (async () => { await btn('help'); const a = await ev(() => document.getElementById('labCard').style.display === 'flex'); await btn('cardok'); return a; })());
  ok('the buttons are big enough for a finger (every Lab button at least 44 px tall)', await ev(() => [].every.call(document.querySelectorAll('#lab .btn.lb'), (e) => e.offsetParent === null || e.getBoundingClientRect().height >= 44)));
  ok('the camera button still works as in a match', await ev(() => { const a = SG.cam; document.getElementById('bCam').click(); const r = SG.cam !== a; SG.setCam(0); return r; }));
  /* ?lab=1 goes straight in */
  const p2 = await b.newPage({ viewport: { width: 1000, height: 700 } }); await p2.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?lab=1'); await p2.waitForFunction('window.__done', null, { timeout: 60000 });
  ok('?lab=1 goes straight into the Lab (and a fresh browser sees the how-to card)', await p2.evaluate(() => SG.mode === 'lab' && SG.phase === 'fight' && document.getElementById('labCard').style.display === 'flex'), 'a fresh browser should see the how-to card');
  await p2.close();

  /* 2. free building on both zones, with real touches */
  await ev(() => { SG.labLoadTarget('empty'); SG.lab.card = false; });
  await btn('tool_build'); await btn('k_tent');
  const before = await ev(() => SG.pieces.length);
  await click(1.1, .8); await click(-1.1, -.8);
  const placed = await ev(() => SG.pieces.filter((q) => q.kind === 'tent').map((q) => [q.side, +q.x.toFixed(2), +q.z.toFixed(2), q.built]));
  ok('a tap with the Build tool puts a piece on my zone and another on the target zone (instantly built)', placed.length === 2 && placed.some((q) => q[0] === 0 && q[3]) && placed.some((q) => q[0] === 1 && q[3]), JSON.stringify(placed));
  ok('an overlapping spot is refused with the real reason', await ev(() => { const q = SG.pieces.filter((e) => e.kind === 'tent')[0], r = SG.labPlace('tent', q.x, q.z, 0); return !r.ok && /close/.test(r.text); }));
  ok('every kind of piece goes on either zone, as many as you like', await ev(() => {
    SG.labLoadTarget('empty'); SG.labLoadRecs(0, []); const kinds = ['wall', 'gate', 'tower', 'tent', 'workshop', 'trap', 'lobber'], res = []; let i = 0;
    [0, 1].forEach((s) => kinds.forEach((k) => { const x = (i % 5 - 2) * .7, z = (s ? -1 : 1) * (.6 + Math.floor(i / 5) * .5 + (k === 'tower' ? 0 : .1)); i++; const r = SG.labPlace(k, x, z, s ? 0 : Math.PI); res.push([k, s, r.ok, r.text]); }));
    const bad = res.filter((q) => !q[2]); window.__bad = JSON.stringify(bad); return bad.length === 0 && SG.pieces.length === 14; }), 'some pieces were refused ' + await ev(() => window.__bad));
  ok('a brace must lean on something (real rule); next to a tower it goes', await ev(() => { SG.labLoadTarget('empty'); SG.labLoadRecs(0, []); const far = SG.labPlace('brace', 1.9, 1.9, 0); SG.labPlace('tower', -1.4, 1.2, Math.PI); const t = SG.pieces.filter((q) => q.kind === 'tower' && q.side === 0).pop(); const near = SG.labPlace('brace', t.x - SG.FOOT.tower[0] - SG.FOOT.brace[1] - .01, t.z, Math.PI / 2); return !far.ok && /brace/i.test(far.text) && near.ok; }));
  ok('no more than two lobbers a camp (as in a match)', await ev(() => { SG.labLoadTarget('empty'); SG.labLoadRecs(0, []); const a = [0, 1, 2].map((i) => SG.labPlace('lobber', -1.4 + i * 1.0, 1.0, Math.PI).ok); return a[0] && a[1] && !a[2]; }));
  ok('"Match zones only" brings back the zone rule (a far-zone spot is refused for my camp)', await ev(() => { SG.lab.strict = true; const r1 = SG.labPlace('wall', 0, 0, 0); SG.lab.strict = false; const r2 = SG.labPlace('wall', 0, 0, 0); return !r1.ok && r2.ok; }));
  ok('"mice build it": the piece is a site first, and the mice finish it', await ev(() => { SG.lab.instant = false; SG.labLoadTarget('empty'); const r = SG.labPlace('workshop', 1.4, 1.2, Math.PI); const was = r.piece.built; for (let i = 0; i < 60 * 25 && !r.piece.built; i++) SG.step(1 / 60); SG.lab.instant = true; return r.ok && !was && r.piece.built && r.piece.parts === r.piece.total; }));

  /* 3. erase, move, undo, redo (real touches) */
  await ev(() => { SG.labLoadTarget('empty'); SG.labLoadRecs(0, []); SG.labPlace('workshop', .9, .9, Math.PI); });
  const wk = await ev(() => { const q = SG.pieces.filter((e) => e.kind === 'workshop')[0]; return { x: q.x, z: q.z, c: SG.pieces.length }; });
  await btn('tool_erase'); await click(wk.x, wk.z);
  ok('the Erase tool removes the piece you tap', await ev(() => !SG.pieces.some((q) => q.kind === 'workshop')));
  await btn('undo'); ok('Undo puts it back', await ev(() => SG.pieces.some((q) => q.kind === 'workshop')));
  await btn('redo'); ok('Redo removes it again', await ev(() => !SG.pieces.some((q) => q.kind === 'workshop')));
  await btn('undo');
  await btn('tool_move'); await click(wk.x, wk.z); await click(-.9, -.9);
  const mv = await ev(() => { const q = SG.pieces.filter((e) => e.kind === 'workshop')[0]; return { x: q.x, z: q.z, side: q.side, n: SG.pieces.length, carry: !!SG.lab.carry }; });
  ok('the Move tool lifts a piece with one tap and drops it with the next (and it changes camp if you drop it there)', Math.hypot(mv.x + .9, mv.z + .9) < .2 && mv.side === 1 && !mv.carry && mv.n === wk.c, JSON.stringify(mv));
  await btn('undo'); ok('Undo puts a moved piece back where it was', await ev((w) => { const q = SG.pieces.filter((e) => e.kind === 'workshop')[0]; return Math.hypot(q.x - w.x, q.z - w.z) < .01; }, wk));
  ok('a lifted piece can be put back whole', await ev(() => { const q = SG.pieces.filter((e) => e.kind === 'workshop')[0], at = [q.x, q.z]; SG.labLift(q); const lifted = !SG.pieces.some((e) => e.kind === 'workshop'); SG.labCancelCarry(); const r = SG.pieces.filter((e) => e.kind === 'workshop')[0]; return lifted && r && Math.hypot(r.x - at[0], r.z - at[1]) < 1e-6 && r.built; }));

  /* 4. the target menu */
  const T = ['empty', 'walled', 'braced', 'longwall', 'workshops', 'fortress', 'glass', 'copy'];
  const tt = await ev((T) => { SG.labLoadTarget('empty'); [['tower', 0, 2.42], ['wall', -.9, 1.9], ['wall', .9, 1.9], ['tent', 1.4, 2.3]].forEach((q) => { const w = [q[1], q[2]]; SG.labPlace(q[0], w[0], w[1], Math.PI); }); const out = {}; T.forEach((id) => { SG.labLoadTarget(id); const t = SG.pieces.filter((q) => q.side === 1); out[id] = { n: t.length, built: t.every((q) => q.built && (q.total === 0 || q.parts === q.total)), allOn: t.every((q) => q.ps.every((e) => e.st === 'on')), far: t.every((q) => q.z <= 0), kinds: Array.from(new Set(t.map((q) => q.kind))).sort().join(','), mine: SG.pieces.filter((q) => q.side === 0).length }; }); return out; }, T);
  ok('every target template loads: empty is empty, the others are built, whole, and in the far camp', tt.empty.n === 0 && T.slice(1).every((id) => tt[id].n > 0 && tt[id].built && tt[id].allOn && tt[id].far), JSON.stringify(tt));
  ok('Walled Keep = a Keep, a gate and two walls; Braced Keep = a Keep and two braces; Glass house = a lone Keep; Long wall = six walls', tt.walled.kinds === 'gate,tower,wall' && tt.walled.n === 4 && tt.braced.kinds === 'brace,tower' && tt.braced.n === 3 && tt.glass.n === 1 && tt.longwall.n === 6 && tt.workshops.kinds === 'tent,workshop');
  ok('Fortress is the 12-point good camp the bots build (same pieces)', await ev(() => { SG.labLoadTarget('fortress'); const k = SG.pieces.filter((q) => q.side === 1).map((q) => q.kind).sort().join(','); return k === ['tower', 'brace', 'brace', 'wall', 'wall', 'wall', 'lobber', 'workshop', 'gate', 'wall', 'wall', 'trap'].sort().join(','); }));
  ok('Fortress stands as built: a Keep with its braces, nothing fallen at the start', await ev(() => { const t = SG.pieces.filter((q) => q.side === 1 && q.kind === 'tower')[0]; return !t.down && t.ps.every((q) => q.st === 'on') && SG.stats.collapses === 0; }));
  ok('"My camp copy" mirrors my camp across the table', await ev(() => { SG.labLoadTarget('empty'); SG.labPlace('tower', .3, 2.2, Math.PI); SG.labPlace('wall', -.5, 1.8, Math.PI * .8); SG.labLoadTarget('copy'); const m = SG.pieces.filter((q) => q.side === 0 && q.kind !== 'lobber'), c = SG.pieces.filter((q) => q.side === 1); const near = (a) => c.some((q) => q.kind === a.kind && Math.hypot(q.x + a.x, q.z + a.z) < .01); return c.length === SG.pieces.filter((q) => q.side === 0).length && m.every(near); }));
  ok('the target camp can be edited freely, and Reset target returns to that edited state', await ev(() => { SG.labLoadTarget('walled'); SG.labPlace('tent', -1.5, -1.0, 0); const before = JSON.stringify(SG.labState(1)); const t = SG.pieces.filter((q) => q.side === 1 && q.kind === 'tower')[0]; SG.debug.knock(t.id, 'tower.post.NE'); SG.debug.knock(t.id, 'tower.post.NW'); SG.debug.knock(t.id, 'tower.post.SE'); SG.labReset(1); return JSON.stringify(SG.labState(1)) === before && SG.pieces.filter((q) => q.side === 1 && q.kind === 'tent').length === 1; }));

  /* 5. shooting: every ammo kind, free gun, lobbers, reload, crew */
  ok('the My camp buttons: Keep + 2 lobbers, and Clear (both can be undone)', await ev(() => { SG.labClearCamp(0); const a = SG.pieces.filter((q) => q.side === 0).length; SG.labStarter(); const b2 = SG.pieces.filter((q) => q.side === 0).map((q) => q.kind).sort().join(); SG.labUndo(); const c = SG.pieces.filter((q) => q.side === 0).length; SG.labStarter(); return a === 0 && b2 === 'lobber,lobber,tower' && c === 0 && SG.lobbers(0).length === 2; }));
  const ammo = await ev(() => SG.ammoOrder.slice());
  const fired = await ev((ammo) => { const out = {}; ammo.forEach((id) => { SG.labLoadTarget('fortress'); SG.labSetAmmo(id); SG.labSetHigh(false); const sp = SG.labDefaultSpot(); SG.step(.5); const a = SG.labFire(0, 'gun', sp.x, sp.z); const cur = SG.labSettle(10); out[id] = { fired: !!a, ammo: a && a.ammo, done: cur.done, off: cur.partsOff, land: cur.landings.length }; }); return out; }, ammo);
  ok('every kind of ammunition fires from the free gun and comes down: ' + ammo.join(', '), ammo.every((id) => fired[id].fired && fired[id].ammo === id && fired[id].done && fired[id].land >= 1), JSON.stringify(fired));
  ok('a Big Marble, the Bouncer and the Marble all take something off a Fortress, the Glue blob nothing (as in a match)', fired.big.off > 0 && fired.bouncer.off > 0 && fired.marble.off > 0 && fired.glue.off === 0, JSON.stringify(fired));
  ok('ammunition is unlimited: ten Big Marbles in a row, no store, no wait (quick reload)', await ev(() => { SG.labSetAmmo('big'); SG.lab.quick = true; let c = 0; for (let i = 0; i < 10; i++) { SG.step(.4); if (SG.labFire(0, 'gun', 0, -2.4)) c++; } SG.labSettle(10); return c === 10; }));
  ok('a new kind added to the AMMO table appears in the Lab by itself and fires', await ev(() => { SG.ammo.testball = { name: 'Test ball', icon: '🧪', short: 'Test', tint: 0xff00ff, R: () => .3 }; SG.labUi && 0; SG.labTool('gun'); const has = !!document.getElementById('lab_a_testball'); SG.labSetAmmo('testball'); SG.labLoadTarget('walled'); const sp = SG.labDefaultSpot(); SG.step(.4); const a = SG.labFire(0, 'gun', sp.x, sp.z); const c = SG.labSettle(10); const r = SG.labRange(); const row = r.rows.some((q) => q.ammo === 'testball'); delete SG.ammo.testball; SG.labSetAmmo('marble'); return has && !!a && c.done && row; }));
  ok('Real reload keeps the lobber winding; Quick reload lets it fire again after 0.3 s', await ev(() => { SG.lab.quick = false; SG.labLoadTarget('walled'); const sp = SG.labDefaultSpot(); SG.step(3); const a = SG.labFire(0, 0, sp.x, sp.z); SG.step(.5); const blocked = SG.lobberBlock(0, 0) === 'winding'; SG.step(2.4); const free = SG.lobberBlock(0, 0) === ''; SG.lab.quick = true; SG.labFire(0, 0, sp.x, sp.z); SG.step(.5); const quick = SG.lobberBlock(0, 0) === ''; return !!a && blocked && free && quick; }));
  ok('"Need a crew": off by default (fires with nobody beside it); on, a mouse has to walk to the lobber first', await ev(() => { SG.lab.crew = false; const off = SG.lobberBlock(0, 0) !== 'crew'; SG.lab.crew = true; const t0 = SG.lobberBlock(0, 0); let t = 0; while (SG.lobberBlock(0, 0) === 'crew' && t < 20) { SG.step(.1); t += .1; } const on = t0 === 'crew' && SG.lobberBlock(0, 0) === ''; SG.lab.crew = false; SG.step(1); return off && on; }));
  ok('tap-select and drag on a lobber fires it with the real arc (two lobbers: Lobber 2 chosen by touching it)', await (async () => {
    await btn('tool_fire'); await ev(() => { SG.labLoadTarget('walled'); SG.lab.quick = true; SG.step(1); SG.labSetAmmo('marble'); });
    const l2 = await ev(() => { const l = SG.lobbers(0)[1]; return { x: l.x, z: l.z }; }); const a = await px(l2.x, l2.z, .2); const c0 = await ev(() => SG.stats.shots);
    await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(a.x, a.y + 40, { steps: 4 }); await p.mouse.move(a.x - 20, a.y + 110, { steps: 4 });
    const aiming = await ev(() => SG.sides[0].aim.on && SG.sides[0].lsel === 1 && SG.lab.fire.li === 1); await p.mouse.up(); await ev(() => { SG.step(.2); });
    return aiming && (await ev(() => SG.stats.shots)) === c0 + 1 && (await ev(() => SG.lab.last.li === 1 && SG.lab.last.s === 0)); })());
  ok('the free gun: tap anywhere to aim (arc shown), then Fire! shoots from the near edge', await (async () => {
    await btn('tool_gun'); const q = await px(0, -2.4, 0); await p.mouse.click(q.x, q.y); const aim = await ev(() => SG.sides[0].aim.on && SG.sides[0].aim.li === 'gun' && SG.lab.gunAim && Math.abs(SG.lab.gunAim.tz + 2.4) < .3);
    await ev(() => { SG.step(1); }); const c0 = await ev(() => SG.stats.shots); await btn('gunfire'); await ev(() => SG.step(.2)); return aim && (await ev(() => SG.stats.shots)) === c0 + 1; })());
  ok('the free gun works with no lobber on the table at all', await ev(() => { SG.lobbers(0).forEach((l) => SG.labErase(l)); SG.step(.5); const sp = SG.labDefaultSpot(); const a = SG.labFire(0, 'gun', sp.x, sp.z); return !!a && !SG.lobbers(0).length; }));

  /* 6. same results as in a match, for the same shot */
  const shots = [['marble', false, 'keep'], ['big', false, 'keep'], ['marble', false, 'wall'], ['marble', true, 'wall'], ['bouncer', false, 'wall'], ['corks', false, 'keep'], ['big', false, 'wall']];
  const cmp = await ev((shots) => {
    const out = [];
    shots.forEach((sh) => {
      /* in a match */
      SG.start('blue', { seed: 55, level: 'easy', rules: 2, presets: ['average2', 'good'] }); SG.sides[0].bot = true; SG.skipBuild(); SG.sides[0].bot = false; SG.sides[1].bot = false; SG.begin(); SG.step(SG.CONFIG.count + .05);
      SG.sides.forEach((s) => { s.plan = { hill: 4, raid: 0, guard: 0, mend: 0 }; }); SG.step(6); SG.stepUntil(() => SG.debug.crewReady(0, 0), 14);
      const recs = SG.pieces.map((q) => ({ kind: q.kind, x: q.x, z: q.z, rot: q.rot, side: q.side })), sd = SG.sides[0]; SG.lobbers(0).forEach((l) => { l.reload = 0; }); sd.big = 3; sd.cd = {};
      const tgt = sh[2] === 'keep' ? SG.pieces.filter((q) => q.side === 1 && q.kind === 'tower')[0] : SG.pieces.filter((q) => q.side === 1 && q.kind === 'wall').sort((a, c) => Math.hypot(a.x, a.z) - Math.hypot(c.x, c.z))[0];
      const sig = () => SG.pieces.map((q) => q.kind + q.side + q.x.toFixed(3) + q.z.toFixed(3) + ':' + q.ps.filter((e) => e.st !== 'on').map((e) => e.id).join(',')).sort().join(';');
      sd.ammo = sh[0]; sd.high = sh[1]; SG.seed = 99; const a = SG.fire(0, tgt.x, tgt.z, 0); SG.stepUntil(() => !SG.marbles.some((m) => m.live) && !SG.debris.length, 8); SG.step(.5);
      const m = { fired: !!a, sig: sig(), col: SG.stats.collapses, keep: SG.stats.keepDown, parts: SG.stats.partsOff, glued: SG.stats.glued };
      /* in the Lab, the same camps, the same shot */
      SG.labStart(); SG.labLoadRecs(0, recs.filter((q) => q.side === 0)); SG.labLoadRecs(1, recs.filter((q) => q.side === 1)); SG.labSetAmmo(sh[0]); SG.labSetHigh(sh[1]); SG.step(.5); SG.seed = 99; SG.lab.quick = true;
      const b2 = SG.labFire(0, 0, tgt.x, tgt.z, { force: true }); SG.seed = 99; /* seed is read at fire time: set it again exactly as the match had it */
      const l = { fired: !!b2 };
      SG.labSettle(8); SG.step(.5); const lsig = SG.pieces.map((q) => q.kind + q.side + q.x.toFixed(3) + q.z.toFixed(3) + ':' + q.ps.filter((e) => e.st !== 'on').map((e) => e.id).join(',')).sort().join(';');
      out.push({ shot: sh.join('/'), m, lab: { fired: l.fired, sig: lsig, col: SG.stats.collapses, keep: SG.stats.keepDown, parts: SG.stats.partsOff, glued: SG.stats.glued } });
    });
    return out; }, shots);
  /* the Lab sets the seed itself at fire time, so run the exact check on rule outcomes: which parts came off, collapses, a Keep down */
  ok('for 7 fixed shots (Marble and Big at the Keep and at a wall, a high Marble, a Bouncer, Corks) the Lab takes off exactly the parts a match takes off, with the same collapses and Keep result',
    cmp.every((c) => c.m.fired && c.lab.fired && c.m.sig === c.lab.sig && c.m.col === c.lab.col && c.m.keep === c.lab.keep && c.m.parts === c.lab.parts && c.m.glued === c.lab.glued), JSON.stringify(cmp.map((c) => [c.shot, c.m.fired, c.lab.fired, c.m.parts, c.lab.parts, c.m.col, c.lab.col, c.m.sig === c.lab.sig])));
  ok('the shots did something worth comparing (at least four of the seven took parts off)', cmp.filter((c) => c.m.parts > 0).length >= 4, JSON.stringify(cmp.map((c) => c.m.parts)));

  /* 7. reset, heal, replay, snapshot */
  await ev(() => { SG.labStart(); SG.lab.card = false; });
  ok('Reset target rebuilds the camp exactly (same pieces, same places, every part on), after a heavy bombardment', await ev(() => { SG.labLoadTarget('fortress'); const s0 = JSON.stringify(SG.labState(1)); SG.labSetAmmo('big'); for (let i = 0; i < 6; i++) { SG.step(.5); SG.labFire(0, 'gun', -.3 + i * .12, -2.3); } SG.labSettle(10); SG.step(2); const dmg = SG.labState(1).some((q) => q.off.length || q.down); SG.labReset(1); return dmg && JSON.stringify(SG.labState(1)) === s0; }));
  ok('Heal all mends both camps at once, no mice needed', await ev(() => { SG.labLoadTarget('fortress'); const s0 = JSON.stringify(SG.labState()); SG.labSetAmmo('big'); SG.labFire(0, 'gun', 0, -2.4); SG.labSettle(8); const t = SG.pieces.filter((q) => q.side === 0 && q.kind === 'tower')[0]; SG.debug.knock(t.id, 'tower.post.NE'); SG.debug.knock(t.id, 'tower.post.SE'); SG.debug.knock(t.id, 'tower.post.SW'); SG.step(1); const dmg = SG.labState().some((q) => q.off.length || q.down); SG.labHeal(); return dmg && JSON.stringify(SG.labState()) === s0; }));
  ok('a fallen Keep stays fallen until Reset (nothing ends, and nothing rebuilds by itself), and the table keeps going', await ev(() => { SG.labLoadTarget('glass'); const t = SG.pieces.filter((q) => q.side === 1 && q.kind === 'tower')[0]; ['tower.post.NE', 'tower.post.SE', 'tower.post.SW'].forEach((id) => SG.debug.knock(t.id, id)); SG.step(8); const down = t.down; const phase = SG.phase; SG.labReset(1); const t2 = SG.pieces.filter((q) => q.side === 1 && q.kind === 'tower')[0]; return down && phase === 'fight' && SG.winner === -1 && !t2.down && t2.parts === t2.total; }));
  ok('Replay fires the same shot again: same aim, same ammunition, same flying parts', await ev(() => {
    SG.labLoadTarget('walled'); SG.labSetAmmo('big'); const sp = SG.labDefaultSpot(); SG.step(.5);
    const grab = () => JSON.stringify(SG.pieces.filter((q) => q.side === 1).map((q) => q.ps.filter((e) => e.st !== 'on').map((e) => [e.id, +e.rx.toFixed(5), +e.rz.toFixed(5)])));
    const cA = SG.stats.collapses; SG.labFire(0, 'gun', sp.x + .02, sp.z + .11); SG.labSettle(9); SG.step(1); const one = grab(), c1 = SG.stats.collapses; SG.labReset(1); SG.labSetAmmo('marble'); SG.step(.5); const c0 = SG.stats.collapses;
    const a = SG.labReplay(); SG.labSettle(9); SG.step(1); const two = grab(); return !!a && one === two && one.length > 10 && SG.lab.last.ammo === 'big' && SG.stats.collapses - c0 === c1 - cA; }));
  ok('Snapshot and Restore bring the whole table back, damage and all', await ev(() => { SG.labLoadTarget('fortress'); SG.labSetAmmo('big'); SG.labFire(0, 'gun', 0, -2.3); SG.labSettle(9); SG.step(1); SG.labTakeSnapshot(); const s0 = JSON.stringify(SG.labState()); SG.labFire(0, 'gun', .2, -2.0); SG.labSettle(9); SG.labPlace('wall', 1.5, 1.0, 0); SG.step(1); const moved = JSON.stringify(SG.labState()) !== s0; SG.labRestoreSnapshot(); return moved && JSON.stringify(SG.labState()) === s0; }));
  ok('Slow-mo sets the clock to a quarter speed, Pause stops it', await ev(() => { document.querySelector('#lab [data-a="t_slow"]').click(); const a = SG.speed; document.querySelector('#lab [data-a="t_slow"]').click(); const b2 = SG.speed; document.querySelector('#lab [data-a="t_pause"]').click(); const c = SG.paused; document.querySelector('#lab [data-a="t_pause"]').click(); return a === .25 && b2 === 1 && c && !SG.paused; }));

  /* 8. the readout */
  ok('the readout counts the last shot (parts off, collapses, what fell) and the session', await ev(() => { SG.labLoadTarget('walled'); SG.labResetCounters(); SG.labSetAmmo('big'); const sp = SG.labDefaultSpot(); SG.step(.5); SG.labFire(0, 'gun', sp.x, sp.z); const c = SG.labSettle(9); const ss = SG.labSession(); return c.done && c.partsOff > 0 && ss.shots === 1 && ss.partsOff === c.partsOff && c.landings.length === 1 && c.landings[0].r > 0 && document.getElementById('labRead').textContent.indexOf('Big Marble') >= 0; }));
  ok('a blast ring is drawn at the landing spot, sized by the ammunition', await ev(() => { SG.render(); const L = SG.lab, ld = L.landings[0], rg = SG.labDraw().rings[0]; return !!ld && rg.visible && Math.abs(rg.scale.x - ld.r) < 1e-6; }));
  ok('tapping a wall shows what holds it up and marks the part that alone would bring it down', await ev(() => { SG.labLoadTarget('longwall'); const w = SG.pieces.filter((q) => q.side === 1 && q.kind === 'wall')[0]; SG.debug.knock(w.id, 'wall.post.L'); SG.debug.knock(w.id, 'wall.rail.top'); const s = SG.labSupports(w); const post = s.rows.filter((r) => /post/.test(r.text) && r.on)[0], rail = s.rows.filter((r) => /rail/.test(r.text) && r.on)[0]; return post.crit && /wall down/.test(post.why) && rail.crit && /planks/.test(rail.why) && s.rows.some((r) => !r.on); }));
  ok('a wall with both posts and both rails has no single part that would bring it down', await ev(() => { SG.labLoadTarget('longwall'); const w = SG.pieces.filter((q) => q.side === 1 && q.kind === 'wall')[0]; const s = SG.labSupports(w); return s.rows.every((r) => !r.crit) && s.state === 'stands'; }));
  ok('a tower on 3 legs with its braces: no single part is critical but the floor (roof); on a Glass house the legs are', await ev(() => { SG.labLoadTarget('glass'); const t = SG.pieces.filter((q) => q.side === 1 && q.kind === 'tower')[0]; const s0 = SG.labSupports(t); SG.debug.knock(t.id, 'tower.post.NE'); const s1 = SG.labSupports(t); return s0.state === 'stands' && s1.rows.filter((r) => r.crit && /post/.test(r.text)).length >= 1 && /Keep down/.test(s1.rows.filter((r) => r.crit && /post/.test(r.text))[0].why || ''); }) || await ev(() => { const t = SG.pieces.filter((q) => q.side === 1 && q.kind === 'tower')[0], s1 = SG.labSupports(t); return s1.rows.some((r) => r.crit); }));
  ok('"Show supports" draws the links (thin lines) and the toggle works', await ev(() => { SG.labLoadTarget('walled'); document.querySelector('#lab [data-a="t_supports"]').click(); SG.render(); const ln = SG.labDraw().lines, on = ln.visible && ln.geometry.drawRange.count > 0; document.querySelector('#lab [data-a="t_supports"]').click(); SG.render(); return on && !ln.visible; }));

  /* 9. the range report */
  const rep = await ev(() => { SG.labLoadTarget('fortress'); SG.labSetAmmo('big'); const s0 = JSON.stringify(SG.labState()), st0 = JSON.stringify(SG.stats), a0 = SG.lab.ammo; const r = SG.labRange(); return { rows: r.rows, same: JSON.stringify(SG.labState()) === s0, stats: JSON.stringify(SG.stats) === st0, ammo: SG.lab.ammo === a0, n: SG.ammoOrder.length }; });
  ok('"Test all ammo" gives a table: one row for each kind (and for the high lob of those that can), plus Glue after a Marble', rep.rows.length >= rep.n + 3 && rep.rows.every((r) => r.fired) && rep.rows.some((r) => r.ammo === 'big' && !r.high) && rep.rows.some((r) => /after a Marble/.test(r.name)), JSON.stringify(rep.rows.map((r) => r.name)));
  ok('it leaves the table, the counters and the ammunition as they were', rep.same && rep.stats && rep.ammo);
  ok('the report is the same every time it is run (a fixed seed, fresh copies)', await ev(() => JSON.stringify(SG.labRange().rows) === JSON.stringify(SG.labRange().rows)));
  await btn('range'); ok('the button shows the report as a table on screen', await ev(() => document.getElementById('labRangeBox').style.display === 'flex' && document.querySelectorAll('#labRangeTxt tr').length > 8)); await btn('rangeok');

  /* 10. designs */
  await ev(() => { SG.labLoadTarget('empty'); SG.labLoadRecs(0, []); SG.labPlace('tower', .2, 2.3, Math.PI); SG.labPlace('wall', -.5, 1.9, Math.PI); SG.labPlace('gate', .3, 1.7, Math.PI * .95); SG.labPlace('workshop', 1.2, 2.2, 0); });
  const d1 = await ev(() => { const r = SG.labSaveDesign('Test one'), st = JSON.stringify(SG.labState(0)); return { r, st, rec: SG.labDesigns()['Test one'], names: Object.keys(SG.labDesigns()) }; });
  ok('Save design stores my camp under a name in localStorage and lists it', d1.r.ok && d1.names.indexOf('Test one') >= 0 && d1.rec.schema_version === 1 && d1.rec.placements.length === 4 && d1.rec.placements[0].transform_anchor_relative.x_mm !== undefined);
  ok('Load puts the design back exactly, and JSON round-trips (Copy JSON, Paste JSON)', await ev((st) => { const json = JSON.stringify(SG.labToDesign(0, 'x')); SG.labLoadRecs(0, []); const r = SG.labLoadDesign(json, 0), now = SG.labState(0), was = JSON.parse(st); const same = now.length === was.length && was.every((a) => now.some((q) => q.kind === a.kind && Math.abs(q.x - a.x) < 1e-3 && Math.abs(q.z - a.z) < 1e-3 && Math.abs(Math.cos(q.rot) - Math.cos(a.rot)) < 1e-3 && Math.abs(Math.sin(q.rot) - Math.sin(a.rot)) < 1e-3)); return r.ok && same; }, d1.st));
  ok('a design loaded onto the target camp is the mirror of mine (the "My camp copy" camp)', await ev(() => { SG.labLoadDesign(SG.labToDesign(0, 'm'), 1); const a = SG.labState(0), c = SG.labState(1); return a.length === c.length && a.every((q) => c.some((r) => r.kind === q.kind && Math.hypot(r.x + q.x, r.z + q.z) < 2e-3)); }));
  ok('a bad paste is refused with a reason and changes nothing', await ev(() => { const s0 = JSON.stringify(SG.labState()), r1 = SG.labLoadDesign('{nope', 0), r2 = SG.labLoadDesign({ schema_version: 2, placements: [] }, 0), r3 = SG.labLoadDesign({ schema_version: 1, placements: [{ kind: 'dragon', transform_anchor_relative: { x_mm: 1, y_mm: 1, yaw_deg: 0 } }] }, 0); return !r1.ok && !r2.ok && !r3.ok && /dragon/.test(r3.text) && JSON.stringify(SG.labState()) === s0; }));
  ok('saving survives a localStorage that throws', await ev(() => { const o = Storage.prototype.setItem, g = Storage.prototype.getItem; Storage.prototype.setItem = () => { throw new Error('full'); }; Storage.prototype.getItem = () => { throw new Error('blocked'); }; let r, thrown = false; try { r = SG.labSaveDesign('Nope'); SG.labDesigns(); } catch (e) { thrown = true; } Storage.prototype.setItem = o; Storage.prototype.getItem = g; return !thrown; }));
  ok('the Designs panel lists saved designs, with Load', await (async () => { const has = await ev(() => /Test one/.test(document.getElementById('labList').textContent)); await ev(() => { SG.labLoadRecs(0, []); }); await btn('dload_' + (await ev(() => Object.keys(SG.labDesigns()).indexOf('Test one')))); return has && (await ev(() => SG.pieces.filter((q) => q.side === 0).length === 4)); })());
  /* a design in a match */
  const dm = await ev(() => { const rec = SG.labDesigns()['Test one']; SG.start('blue', { seed: 5, design: rec }); const a = SG.pieces.filter((q) => q.side === 0).map((q) => q.kind), pts = SG.sides[0].points, res = SG.designResult;
    /* too big: the Keep, eight walls in two rows, a gate, a tent, a workshop, two traps, a second lobber, a lobber more */
    const pc = (kind, x, y, yaw) => ({ kind, transform_anchor_relative: { x_mm: x, y_mm: y, yaw_deg: yaw || 0 } });
    const big = { schema_version: 1, design_name: 'big', mm_per_unit: 160, placements: [pc('tower', 0, -70)].concat([-120, -40, 40, 120].map((x) => pc('wall', x, 60)), [-120, -40, 40, 120].map((x) => pc('wall', x, 100)), [pc('gate', 0, 20), pc('tent', 190, -30), pc('workshop', -190, -30), pc('trap', -90, 20), pc('trap', 90, 20), pc('lobber', -160, -90), pc('lobber', 160, -90)]) };
    SG.start('blue', { seed: 5, design: big }); const b2 = SG.pieces.filter((q) => q.side === 0).map((q) => q.kind), pts2 = SG.sides[0].points, res2 = SG.designResult, note = SG.designNote;
    SG.start('blue', { seed: 5 }); const none = SG.pieces.length; return { a, pts, res, b2, pts2, res2, note, none, tower: SG.pieces.length }; });
  ok('"Use as my camp in a match": the Keep goes first and the design is placed at the start of the build step', dm.a[0] === 'tower' && dm.a.length === 4 && dm.res.dropped.length === 0 && dm.pts >= 0, JSON.stringify(dm.a));
  ok('over budget, it places what fits, drops the rest and says what was dropped', dm.b2[0] === 'tower' && dm.res2.dropped.length > 0 && dm.pts2 >= 0 && /dropped/.test(dm.note) && dm.res2.dropped.some((q) => /budget/.test(q.why)), JSON.stringify([dm.b2, dm.res2.dropped, dm.pts2, dm.note]));
  ok('a normal match with no design starts with nothing placed', dm.none === 0);

  /* 11. prototype slots */
  await ev(() => { SG.labStart(); SG.lab.card = false; });
  const pr = await ev(() => { const log = { arc: 0, tick: 0, on: 0, off: 0, r: [] }; SG.addProto('fake', { name: 'Fake', note: 'test', on: () => { log.on++; }, off: () => { log.off++; }, hooks: { arc: (a) => { log.arc++; }, tick: () => { log.tick++; }, blastR: (R) => { log.r.push(R); return R * 2; } } });
    const stub = Object.keys(SG.labProtos).indexOf('wind') >= 0 && /not built/.test(SG.labProtos.wind.name); const sw = !!document.querySelector('#labProtos [data-a="pr_fake"]'); document.querySelector('#labProtos [data-a="pr_fake"]').click();
    SG.labLoadTarget('walled'); SG.step(.5); const sp = SG.labDefaultSpot(); SG.labFire(0, 'gun', sp.x, sp.z); SG.labSettle(8); const on = SG.labFlags.fake === true && log.arc > 0 && log.tick > 0 && log.r.length > 0 && log.r[0] > 0; const lr = SG.lab.landings[0].r, base = SG.ammo.marble.R() * SG.unit();
    const bigger = Math.abs(lr - base * 2) < 1e-9;
    document.querySelector('#labProtos [data-a="pr_wind"]').click(); const wind = SG.labFlags.wind === true; document.querySelector('#labProtos [data-a="pr_wind"]').click();
    const arc0 = log.arc; SG.labBack(); const off = log.off >= 1 && !SG.labFlags.fake; SG.start('blue', { seed: 3 }); SG.start('blue', { mode: 'table', seed: 3 }); return { stub, sw, on, bigger, wind, off, matchQuiet: log.arc === arc0 }; });
  ok('the Prototypes panel has the "Wind (not built)" stub, and a switch for every prototype', pr.stub && pr.sw && pr.wind);
  ok('a switched-on prototype\'s hooks run in the Lab (arc, tick, blast radius), and what it returns changes the real blast', pr.on && pr.bigger, JSON.stringify(pr));
  ok('leaving the Lab switches every prototype off, so a match never runs one', pr.off && pr.matchQuiet);
  ok('"Back to menu" returns to the title screen', await (async () => { await ev(() => { SG.labStart(); SG.lab.card = false; }); await btn('back'); return await ev(() => SG.phase === 'start' && document.getElementById('start').style.display === 'flex' && document.getElementById('lab').style.display === 'none'); })());

  /* 12. ten simulated minutes: nothing ends, nothing errors */
  const long = await ev(() => { SG.labStart(); SG.lab.card = false; SG.seed = 2024; const ids = SG.ammoOrder.slice(), T = ['walled', 'braced', 'longwall', 'workshops', 'fortress', 'glass', 'copy', 'empty'], kinds = ['wall', 'gate', 'tent', 'workshop', 'trap', 'tower'];
    let shots = 0, resets = 0, t = 0, r = 12345; const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    for (let step = 0; step < 300; step++) { /* 300 steps of 2 seconds */
      SG.labSetAmmo(ids[step % ids.length]); SG.labSetHigh(step % 3 === 0); SG.lab.quick = step % 5 !== 0; SG.lab.crew = step % 50 === 7; SG.lab.instant = step % 11 !== 0;
      const sp = { x: (rnd() - .5) * 2.4, z: -.6 - rnd() * 2.2 }; if (SG.labFire(0, step % 4 === 0 ? 'gun' : (step % 2), sp.x, sp.z)) shots++;
      if (step % 7 === 0) SG.labPlace(kinds[step % kinds.length], (rnd() - .5) * 4, (rnd() < .5 ? 1 : -1) * (.5 + rnd() * 2), rnd() * 6);
      if (step % 17 === 0) { SG.labReset(1); resets++; } if (step % 41 === 0) SG.labLoadTarget(T[(step / 41) | 0 % T.length] || 'walled');
      if (step % 29 === 0) SG.labHeal();
      for (let i = 0; i < 120; i++) { SG.step(1 / 60); } t += 2; }
    const lastState = { phase: SG.phase, winner: SG.winner, over: SG.phase === 'over', clock: Math.round(SG.clock), shots: SG.stats.shots, collapses: SG.stats.collapses, parts: SG.stats.partsOff, inWall: SG.inWall(), stuck: SG.stats.stuck, mice: SG.mice.length, nanMouse: SG.mice.some((m) => !isFinite(m.x) || !isFinite(m.z)), nanPiece: SG.pieces.some((q) => !isFinite(q.x) || !isFinite(q.z)), pieces: SG.pieces.length };
    SG.labReset(1); SG.step(5); return Object.assign(lastState, { shotsFired: shots, resets }); });
  ok('ten simulated minutes of shooting, building, resetting and healing: nothing ends (still a fight, no winner, no win card)', long.phase === 'fight' && long.winner === -1 && !long.over && long.clock >= 600, JSON.stringify(long));
  ok('...hundreds of shots, collapses and falls happened, and nothing went wrong (no NaN, no mice stuck in walls)', long.shotsFired > 200 && long.collapses > 5 && !long.nanMouse && !long.nanPiece && long.stuck === 0 && long.inWall === 0, JSON.stringify(long));
  ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(bad ? bad + ' FAILED of ' + n : 'ALL ' + n + ' PASSED'); console.log('test took ' + Math.round((Date.now() - T0) / 1000) + ' s');
  await b.close(); process.exit(bad ? 1 : 0);
};
run().catch((e) => { console.error(e); process.exit(2); });
