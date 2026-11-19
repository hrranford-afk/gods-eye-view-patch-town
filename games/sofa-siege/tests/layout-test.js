/* Round Table Kingdom layout-hook test. Run: NODE_PATH=$(npm root -g) node tests/layout-test.js
   Checks SG.applyLayout and ?layout= with three good layouts and bad ones, then plays 30 bot matches on an off-centre table. */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require('playwright');
const T0 = Date.now();
/* a locked record in the cards' schema_version 1 shape; places in millimetres from the anchor, y toward the top of the anchor card */
const rec = (pl, extra) => Object.assign({ schema_version: 1, table_id: 'test', reference_card_id: '00', placement_mode: 'manual_touch', units: { length: 'mm', angle: 'deg' },
  placements: Object.keys(pl).map((kind) => ({ card_id: { blue_base: '01', red_base: '02', capture_flag: '03', hill: '04' }[kind], kind, transform_anchor_relative: pl[kind] ? { x_mm: pl[kind][0], y_mm: pl[kind][1], z_mm: 0, yaw_deg: pl[kind][2] } : null, status: pl[kind] ? 'LOCKED' : 'NOT_SCANNED' })) }, extra || {});
const GOOD = {
  'camps east and west': rec({ blue_base: [-304, 0, -90], red_base: [304, 0, 90], capture_flag: [0, 0, 0], hill: null }),
  'camps not opposite, flag off-centre': rec({ blue_base: [-250, -240, -40], red_base: [330, -60, 100], capture_flag: [40, 130, 0] }),
  'a mound, and another scale': rec({ blue_base: [0, -600, 0], red_base: [80, 590, 175], capture_flag: [-60, 0, 0], hill: [520, -40, 0] }, { mm_per_unit: 320 })
};
const BAD = {
  'bases too close': [rec({ blue_base: [-150, -280, 0], red_base: [150, -280, 0], capture_flag: [0, 100, 0] }), /too close/],
  'flag off the table': [rec({ blue_base: [0, -304, 0], red_base: [0, 304, 180], capture_flag: [420, 0, 0] }), /CAPTURE FLAG/],
  'a base on the flag hill': [rec({ blue_base: [0, -120, 0], red_base: [0, 304, 180], capture_flag: [0, 0, 0] }), /BLUE BASE is on top of the flag hill/],
  'a base off the table': [rec({ blue_base: [0, -304, 0], red_base: [500, 300, 180], capture_flag: [0, 0, 0] }), /RED BASE is off the table/],
  'a base facing away from the flag': [rec({ blue_base: [0, -304, 180], red_base: [0, 304, 180], capture_flag: [0, 0, 0] }), /faces away/],
  'red base not placed': [rec({ blue_base: [0, -304, 0], red_base: null, capture_flag: [0, 0, 0] }), /Not placed yet: RED BASE/],
  'the mound on a base': [rec({ blue_base: [0, -304, 0], red_base: [0, 304, 180], capture_flag: [0, 0, 0], hill: [40, -300, 0] }), /HILL covers a base/],
  'wrong schema': [{ schema_version: 2, placements: [] }, /schema_version 1/]
};
const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1180, height: 820 } }); await p.addInitScript(() => { window.__RULES = 1; });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  let n = 0, bad = 0;
  const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra && !cond ? '  -> ' + extra : '')); };
  const ev = (f, a) => p.evaluate(f, a);
  const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
  await p.goto(url); await p.waitForFunction('window.__done', null, { timeout: 60000 }); await ev(() => { SG.hold = true; });
  ok('the default layout is the usual table', await ev(() => SG.layout.custom === false && SG.layout.hill.x === 0 && SG.layout.bases.blue.z === 1.9 && SG.layout.bases.red.z === -1.9));
  ok('the usual table written as a card record gives the same camps', await ev((r) => { const a = SG.applyLayout(r); const L = SG.layout; const same = a.ok && Math.abs(L.bases.blue.z - 1.9) < 1e-9 && Math.abs(L.bases.red.z + 1.9) < 1e-9 && Math.abs(L.bases.red.phi - Math.PI) < 1e-9;
    SG.start('blue', { seed: 3 }); const k0 = SG.sides[0].kit[5], k1 = SG.sides[1].kit[5]; SG.clearLayout(); SG.start('blue', { seed: 3 }); const d0 = SG.sides[0].kit[5], d1 = SG.sides[1].kit[5];
    return same && Math.hypot(k0.x - d0.x, k0.z - d0.z) < 1e-6 && Math.hypot(k1.x - d1.x, k1.z - d1.z) < 1e-6; }, rec({ blue_base: [0, -304, 0], red_base: [0, 304, 180], capture_flag: [0, 0, 0] })));

  /* bad layouts are refused with a reason, and the layout in use stays */
  for (const [name, [json, re]] of Object.entries(BAD)) {
    const r = await ev((j) => { const before = JSON.stringify(SG.layout); const r = SG.applyLayout(j); return { r, kept: JSON.stringify(SG.layout) === before }; }, json);
    ok('refused: ' + name + ' ("' + r.r.reason + '")', r.r.ok === false && re.test(r.r.reason || '') && r.kept, JSON.stringify(r));
  }
  ok('a string that is not JSON is refused too', await ev(() => SG.applyLayout('{oops').ok === false && SG.layout.custom === false));

  /* good layouts: the whole game works from them */
  for (const [name, json] of Object.entries(GOOD)) {
    const r = await ev(([j, full]) => { const a = SG.applyLayout(j); if (!a.ok) return { a }; const L = SG.layout, out = { a: true, hill: L.hill, mound: !!L.mound };
      SG.start('blue', { seed: 77, level: 'normal' }); SG.auto(0, 'normal'); let inside = 0, g = 0;
      if (full) { while (SG.phase === 'build' && g++ < 1400) { SG.step(.1); inside += SG.inWall(); } } else SG.skipBuild();
      out.placed = [SG.sides[0].placed, SG.sides[1].placed]; out.built = SG.pieces.filter((q) => q.built).length; out.kitOnTable = SG.sides.every((s) => s.kit.every((k) => Math.hypot(k.x, k.z) <= 3.0));
      out.ownSide = SG.pieces.every((q) => { const m = L.bases[SG.sides[q.side].team], o = L.bases[SG.sides[1 - q.side].team]; return Math.hypot(q.x - m.x, q.z - m.z) < Math.hypot(q.x - o.x, q.z - o.z) && Math.hypot(q.x, q.z) < 2.9 && Math.hypot(q.x - L.hill.x, q.z - L.hill.z) > 1.0; });
      SG.begin(); g = 0; let onHill = 0, moundHits = 0; while (SG.phase !== 'over' && g++ < 4000) { SG.step(.1); inside += SG.inWall(); const h = SG.onHill(); onHill = Math.max(onHill, h[0] + h[1]);
        if (L.mound) SG.mice.forEach((m) => { if (Math.hypot(m.x - L.mound.x, m.z - L.mound.z) < L.mound.r - .08) moundHits++; }); }
      out.over = SG.phase === 'over'; out.winner = SG.winner; out.stuck = SG.stats.stuck; out.inside = inside; out.onHill = onHill; out.moundHits = moundHits; out.score = [SG.sides[0].score, SG.sides[1].score]; out.shots = SG.stats.shots; out.partsOff = SG.stats.partsOff;
      out.hillFar = Math.max(...SG.mice.map((m) => Math.hypot(m.x, m.z))); return out; }, [json, name.startsWith('camps not')]);
    ok('good layout "' + name + '" is accepted', r.a === true, JSON.stringify(r));
    ok('  both bots build their camp in their own zone (' + (r.placed || []).join(' and ') + ' of 11 placed)', r.kitOnTable && r.ownSide && r.placed[0] >= 9 && r.placed[1] >= 9 && r.built === r.placed[0] + r.placed[1], JSON.stringify(r));
    ok('  a whole bot match runs: mice reach the moved hill, score, shoot, and it ends with a winner', r.over && r.winner >= 0 && r.onHill >= 4 && r.score[0] + r.score[1] > 20 && r.shots > 5, JSON.stringify(r));
    ok('  no mouse stuck, none inside a wall' + (r.mound ? ', none walking over the mound' : ''), r.stuck === 0 && r.inside === 0 && r.moundHits === 0, JSON.stringify(r));
  }

  /* Table mode on a layout where the camps are side by side: a touch belongs to the nearer camp */
  await ev((j) => { SG.applyLayout(j); SG.hold = true; SG.start('blue', { mode: 'table', seed: 5 }); SG.setTilt(0); SG.render(); SG.camSnap = true; SG.render(); }, GOOD['camps east and west']);
  const pt = async (side, lx, lz) => ev(([side, lx, lz]) => { const L = SG.layout.bases[SG.sides[side].team], c = Math.cos(L.phi), s = Math.sin(L.phi), x = L.x + lx * c + lz * s, z = L.z - lx * s + lz * c; return SG.screen(x, z); }, [side, lx, lz]);
  const slot = async (side, i) => ev(([side, i]) => SG.screen(SG.sides[side].kit[i].x, SG.sides[side].kit[i].z, .07), [side, i]);
  let q = await slot(1, 0); await p.mouse.click(q.x, q.y); q = await pt(1, 0, -.5); await p.mouse.click(q.x, q.y);
  q = await slot(0, 0); await p.mouse.click(q.x, q.y); q = await pt(0, 0, -.5); await p.mouse.click(q.x, q.y);
  ok('Table mode from a layout: each player picks from their own tray and builds by their own base', await ev(() => SG.pieces.length === 2 && SG.pieces[0].side === 1 && SG.pieces[1].side === 0 && SG.pieces[0].x > 0 && SG.pieces[1].x < 0), JSON.stringify(await ev(() => [SG.pieces, SG.sides[0].msg, SG.sides[1].msg])));
  ok('the hill and both camps are drawn where the layout says', await ev(() => { const r = SG.screen(SG.layout.bases.red.x, SG.layout.bases.red.z), bl = SG.screen(SG.layout.bases.blue.x, SG.layout.bases.blue.z); return bl.y > r.y + 200 && Math.abs(r.x - bl.x) < 30; }));   /* blue's camp is turned to the bottom edge */

  ok('with red\'s camp to blue\'s right, red\'s panel sits on the right edge, turned to face that player', await ev((j) => { SG.applyLayout(j); SG.start('blue', { mode: 'table', seed: 5 }); SG.render(); const c = document.getElementById('pp1'), r = c.getBoundingClientRect(); return SG.sides[1].edge === 'right' && c.className === 'pp right' && r.left > innerWidth - 90 && r.height > innerHeight * .9; }, rec({ blue_base: [0, -304, 0], red_base: [304, 0, 90], capture_flag: [0, 0, 0] })), JSON.stringify(await ev(() => [SG.sides[1].edge, document.getElementById('pp1').className, document.getElementById('pp1').getBoundingClientRect()])));
  ok('the one-player camera stands behind your own camp', await ev((j) => { SG.applyLayout(j); SG.start('blue', { seed: 5 }); SG.camSnap = true; SG.render(); const b = SG.layout.bases.blue, r = SG.layout.bases.red, sb = SG.screen(b.x, b.z), sr = SG.screen(r.x, r.z); return sb.y > sr.y + 100 && Math.abs(sb.x - sr.x) < 60; }, GOOD['camps east and west']));
  ok('on a custom layout the bot keeps its preset camp shape (two thirds or more of the pieces at their fitted preset spots)', await ev((j) => { SG.applyLayout(j); SG.start('blue', { seed: 77 }); SG.auto(0, 'normal'); SG.skipBuild(); let at = 0; SG.pieces.forEach((q) => { const s = SG.debug.layoutSpot(q.side, q.slot); if (Math.hypot(q.x - s[0], q.z - s[1]) < .3) at++; }); return at >= 14 && SG.pieces.length >= 20 ? 'x' : at + ' of ' + SG.pieces.length; }, GOOD['camps not opposite, flag off-centre']) === 'x');

  /* the address form */
  const b64 = Buffer.from(JSON.stringify(GOOD['camps not opposite, flag off-centre'])).toString('base64');
  await p.goto(url + '?layout=' + encodeURIComponent(b64)); await p.waitForFunction('window.__done');
  ok('?layout=<base64 json> loads a layout', await ev(() => SG.layout.custom === true && Math.abs(SG.layout.hill.x - .25) < 1e-6 && /loaded/.test(document.getElementById('layoutNote').textContent)));
  await p.goto(url + '?layout=' + encodeURIComponent(Buffer.from(JSON.stringify(BAD['bases too close'][0])).toString('base64'))); await p.waitForFunction('window.__done');
  ok('a bad ?layout= is refused on the title screen and the usual table is kept', await ev(() => SG.layout.custom === false && /refused: .*too close/.test(document.getElementById('layoutNote').textContent)));
  await p.goto(url + '?layout=%%%'); await p.waitForFunction('window.__done').catch(() => {});
  ok('an unreadable ?layout= does not break the page', await ev(() => SG.layout.custom === false && SG.phase === 'start'));

  /* a layout locked on the cards page (saved under the key cards/setup.js uses) is offered on the title screen */
  await p.goto(url); await p.waitForFunction('window.__done');
  ok('with no saved card layout the title has no "Use my card layout"', await ev(() => getComputedStyle(document.getElementById('bCards')).display === 'none'));
  const stored = await ev((j) => { try { localStorage.setItem('rtk.locked_placements.v1', JSON.stringify(j)); return true; } catch (e) { return false; } }, Object.assign({}, GOOD['camps east and west'], { placements: GOOD['camps east and west'].placements.concat([{ card_id: '05', kind: 'build_camp', transform_anchor_relative: { x_mm: 10, y_mm: 10, z_mm: 0, yaw_deg: 0 }, status: 'LOCKED' }]) }));
  if (stored) { await p.goto(url); await p.waitForFunction('window.__done'); await p.click('#bCards');
    ok('a saved locked record (with build_camp in it) is offered, and "Use my card layout" applies it', await ev(() => SG.layout.custom === true && Math.abs(SG.layout.bases.blue.x + 1.9) < 1e-6 && /Using your card layout/.test(document.getElementById('layoutNote').textContent)));
    await p.click('#bCards'); ok('pressing it again goes back to the usual table', await ev(() => SG.layout.custom === false));
    await ev(() => localStorage.removeItem('rtk.locked_placements.v1')); }
  else ok('(localStorage is blocked here, so the saved-layout button could not be tested)', true);
  ok('applyLayout takes mmPerUnit as an option', await ev((j) => { const r = SG.applyLayout(j, { mmPerUnit: 152 }); const x = SG.layout.bases.blue.x; SG.clearLayout(); return r.ok && Math.abs(x + 2) < 1e-6; }, GOOD['camps east and west']));

  /* how unfair is an off-centre table? 30 bot matches, teams swapping who is the front side */
  await ev(() => { SG.hold = true; });
  const fair = await ev((j) => { SG.applyLayout(j); const L = SG.layout, d = (t) => Math.hypot(L.bases[t].x - L.hill.x, L.bases[t].z - L.hill.z); const out = { blue: 0, red: 0, dBlue: d('blue'), dRed: d('red'), stuck: 0, over: 0, margin: 0 };
    for (let i = 0; i < 30; i++) { SG.start(i % 2 ? 'red' : 'blue', { seed: 31000 + i * 97, level: 'normal' }); SG.auto(0, 'normal'); SG.skipBuild(); SG.begin(); let g = 0; while (SG.phase !== 'over' && g++ < 400) SG.step(1);
      if (SG.phase === 'over') { out.over++; out[SG.sides[SG.winner].team]++; } out.stuck += SG.stats.stuck; const bs = SG.sides.find((s) => s.team === 'blue').score, rs = SG.sides.find((s) => s.team === 'red').score; out.margin += (bs - rs) / 30; } SG.clearLayout(); return out; }, GOOD['camps not opposite, flag off-centre']);
  ok('30 bot matches on the off-centre table all finish, nobody stuck', fair.over === 30 && fair.stuck === 0, JSON.stringify(fair));
  console.log('--- off-centre table (blue base ' + fair.dBlue.toFixed(2) + ' from the flag, red base ' + fair.dRed.toFixed(2) + '): blue won ' + fair.blue + ' of 30, red ' + fair.red + '; average score gap blue minus red ' + fair.margin.toFixed(1));
  ok('0 page errors', errs.length === 0, errs.join(' | '));
  console.log('test took ' + ((Date.now() - T0) / 1000).toFixed(0) + ' s');
  console.log(bad ? ('FAILED ' + bad + ' of ' + n) : ('ALL ' + n + ' PASSED'));
  await b.close(); process.exit(bad ? 1 : 0);
};
run();
