/* Round Table Kingdom rules v2 ("Break the camp") test. Run: NODE_PATH=$(npm root -g) node tests/v2-test.js */
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
  await p.addInitScript(() => {
    /* round 1 of a v2 match, both camps from preset 0, nobody bot-driven, the lobber crewed and wound */
    window.F2 = (team, o) => { SG.hold = true; SG.start(team || 'blue', Object.assign({ seed: 4242 }, o || {})); SG.demo(11, 0); SG.sides[1].layout = 0; SG.skipBuild(); SG.begin(); SG.step(SG.CONFIG.count + .05); SG.sides[0].bot = SG.sides[1].bot = false; SG.sides[0].human = true;
      SG.sides.forEach((s) => { s.plan = { hill: 0, raid: 0, guard: 0, mend: 0 }; s.plan.hill = 4; }); };
    window.K = (s, k) => SG.pieces.filter((q) => q.side === s && q.kind === k).sort((a, c) => Math.hypot(a.x, a.z) - Math.hypot(c.x, c.z))[0];
    window.ON = (pc, re) => pc.ps.filter((q) => q.st === 'on' && re.test(q.id)).length;
    window.KN = (pc, ids) => ids.forEach((id) => SG.debug.knock(pc.id, id));
  });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__done', null, { timeout: 60000 });
  ok('v2 is the default; ?rules=1 (or rules: 1) plays the old rules', await ev(() => { SG.hold = true; SG.start('blue', { seed: 1 }); const a = SG.rules; SG.start('blue', { seed: 1, rules: 1 }); return a === 2 && SG.rules === 1; }));

  /* A1: the Keep is placed first and cannot be skipped */
  await ev(() => { SG.start('blue', { seed: 1 }); SG.render(); });
  ok('the Keep goes first: another piece cannot be picked until the tower is placed', await ev(() => SG.select(0) === false && SG.sides[0].kit[SG.sel].kind === 'tower' && /Keep/.test(SG.sides[0].msg.text)));
  ok('once the tower is placed the rest of the kit opens', await ev(() => { const r = SG.tryPlace(-1.2, 1.9, Math.PI); return r.ok && SG.select(0) === true; }));
  ok('a camp finished without a tower gets its Keep anyway', await ev(() => { SG.start('blue', { seed: 2 }); SG.done(); return SG.pieces.filter((q) => q.side === 0 && q.kind === 'tower').length === 1 && SG.sides[0].keep > 0 && SG.sides[1].keep > 0; }));
  ok('the bot places its Keep first', await ev(() => { SG.start('blue', { seed: 3 }); SG.step(4); const r = SG.pieces.filter((q) => q.side === 1); return r.length >= 1 && r[0].kind === 'tower'; }));

  /* B1: a blast knocks off everything in reach, nearest thrown furthest */
  const bl = await ev(() => { F2('blue'); const w = K(1, 'wall'), q = w.ps.find((x) => x.id === 'wall.plank.3'), before = w.parts; const R = SG.CONFIG.v2.blast * SG.unit(), nk = SG.debug.blast(q.wx, q.wy + .13 * SG.unit(), q.wz, R, 0, false);
    const off = w.ps.filter((x) => x.st !== 'on').map((x) => ({ id: x.id, d: Math.hypot(x.wx - q.wx, x.wz - q.wz), far: Math.hypot(x.rx - x.wx, x.rz - x.wz) })).sort((a, c) => a.d - c.d); F2('blue'); const w3 = K(1, 'wall'), c3 = w3.ps.find((x) => x.id === 'wall.plank.2'); SG.debug.blast(c3.wx, c3.wy, c3.wz, R * 2, 0, false); const far = w3.ps.filter((x) => x.st !== 'on' && /plank/.test(x.id)).map((x) => ({ id: x.id, d: Math.hypot(x.wx - c3.wx, x.wz - c3.wz), far: Math.hypot(x.rx - x.wx, x.rz - x.wz) })).sort((a, c) => a.d - c.d);
    return { nk, before, after: w.parts, off, R, far }; });
  ok('a marble knocks off every part within its blast (' + bl.nk + ' parts), not one', bl.nk >= 3 && bl.before - bl.after >= bl.nk, JSON.stringify(bl));
  ok('the nearest parts are thrown furthest', bl.far.length >= 4 && bl.far[0].far > bl.far[bl.far.length - 1].far * 1.25, JSON.stringify(bl.far));
  ok('a Big Marble reaches further', await ev(() => { const at = (R, big) => { F2('blue'); const w = K(1, 'wall'), q0 = w.ps.find((x) => x.id === 'wall.plank.0'), q1 = w.ps.find((x) => x.id === 'wall.plank.1'), dx = q0.wx - q1.wx, dz = q0.wz - q1.wz, l = Math.hypot(dx, dz); SG.debug.blast(q0.wx + dx / l * .03, q0.wy, q0.wz + dz / l * .03, R * SG.unit(), 0, big); return w.ps.filter((x) => x.st !== 'on' && /plank/.test(x.id)).length; };
    const C = SG.CONFIG.v2; return at(C.bigBlast, true) > at(C.blast, false) && C.bigBlast > C.blast; }));

  /* B2: supports */
  ok('a wall stands with one post and one rail', await ev(() => { F2('blue'); const w = K(1, 'wall'); KN(w, ['wall.post.L', 'wall.rail.top']); return ON(w, /plank/) === w.ps.filter((q) => /plank/.test(q.id)).length && SG.stats.collapses === 0; }));
  ok('with both rails gone its planks fall together: a collapse, with CRASH!', await ev(() => { F2('blue'); const w = K(1, 'wall'); KN(w, ['wall.rail.top', 'wall.rail.low']); return ON(w, /plank/) === 0 && ON(w, /post/) === 2 && SG.stats.collapses === 1 && SG.pops.some((q) => q.text === 'CRASH!') && SG.slowT > 0 && SG.shake > 0; }));
  ok('with both posts gone the whole wall falls', await ev(() => { F2('blue'); const w = K(1, 'wall'); KN(w, ['wall.post.L', 'wall.post.R']); return w.parts === 0 && SG.stats.collapses === 1 && SG.debug.blocks(w.id) === false; }));
  ok('a gate needs both posts', await ev(() => { F2('blue'); const g = K(1, 'gate'); KN(g, ['gate.post.L']); return ON(g, /lintel|door/) === 0 && ON(g, /gate\.post/) === 1 && SG.stats.collapses === 1; }));
  ok('a tower stands on three legs', await ev(() => { F2('blue'); const t = K(1, 'tower'); KN(t, ['tower.post.NE']); return SG.phase === 'fight' && !t.down; }));
  ok('on two legs it stands only if the brace across the open side is intact', await ev(() => { F2('blue'); const t = K(1, 'tower'); KN(t, ['tower.post.NE', 'tower.post.SE']); const held = !t.down && SG.phase === 'fight'; KN(t, ['tower.brace.E']); return held && t.down && SG.phase === 'fall'; }));
  ok('a roof needs its floor', await ev(() => { F2('blue'); const t = K(1, 'tower'); KN(t, ['tower.floor']); return ON(t, /roof/) === 0 && !t.down && SG.stats.collapses === 1; }));

  /* A1: the Keep falls, the match ends */
  const kd = await ev(() => { F2('blue'); const t = K(1, 'tower'); KN(t, ['tower.post.NE', 'tower.post.SE', 'tower.post.NW']); const ph = SG.phase, w0 = SG.winner; SG.step(1); const mid = SG.phase; SG.step(SG.CONFIG.v2.keepFall); SG.render();
    return { ph, w0, mid, end: SG.phase, winner: SG.winner, kd: SG.stats.keepDown, card: document.getElementById('win').style.display, text: document.getElementById('winTitle').textContent + ' ' + document.getElementById('winText').textContent, mend: SG.mend(1, t.id) }; });
  ok('when a Keep falls that side loses at once: a slow fall first, then the win card', kd.ph === 'fall' && kd.w0 === -1 && kd.mid === 'fall' && kd.end === 'over' && kd.winner === 0 && kd.kd && kd.card === 'flex' && /Blue wins/.test(kd.text) && /Red's Keep is down/.test(kd.text) && kd.mend === false, JSON.stringify(kd));

  /* C1: ammunition */
  const leg = await ev(() => { F2('blue'); const t = K(1, 'tower'), q = t.ps.find((x) => x.id === 'tower.post.SE'); const a = SG.debug.blast(q.wx, q.wy, q.wz, .12, 0, false), on1 = ON(t, /tower\.post/); const b2 = SG.debug.blast(q.wx, q.wy, q.wz, .12, 0, true, t.id), on2 = ON(t, /tower\.post/);
    F2('blue'); const t2 = K(1, 'tower'); KN(t2, ['tower.brace.S', 'tower.brace.E']); const q2 = t2.ps.find((x) => x.id === 'tower.post.SE'); SG.debug.blast(q2.wx, q2.wy, q2.wz, .12, 0, false); return { on1, on2, unbraced: ON(t2, /tower\.post/) }; });
  ok('an ordinary marble cannot take a braced tower leg; a Big Marble that lands on the Keep breaks one outright; with its braces gone a marble can', leg.on1 === 4 && leg.on2 === 3 && leg.unbraced === 3, JSON.stringify(leg));
  const sh = await ev(() => { F2('blue'); SG.stepUntil(() => SG.debug.crewReady(0), 15); SG.sides[0].reload = 0; const w = K(1, 'wall'); const a = SG.fire(0, w.x, w.z); const rl = SG.sides[0].reload; SG.stepUntil(() => SG.lastHit, 8); return { fired: !!a, rl, hit: SG.lastHit, off: w.ps.filter((q) => q.st !== 'on').length, cfg: SG.CONFIG.v2.reload }; });
  ok('the lobber winds for 2.5 seconds, and a marble on a wall takes several parts off', sh.fired && sh.rl === 2.5 && sh.hit.knocked >= 2 && sh.off >= 2, JSON.stringify(sh));
  const ck = await ev(() => { F2('blue'); SG.sides[1].plan = { hill: 4, raid: 0, guard: 0, mend: 0 }; SG.sides[0].plan = { hill: 0, raid: 0, guard: 4, mend: 0 }; SG.stepUntil(() => SG.onHill()[1] >= 4 && SG.debug.crewReady(0), 20); SG.step(1); SG.sides[0].reload = 0; const off0 = SG.stats.partsOff, noBig = (SG.setAmmo(0, 'big'), SG.lobberBlock(0));
    SG.setAmmo(0, 'corks'); const m = SG.mice.filter((q) => q.side === 1 && q.role === 'hill')[0]; SG.fire(0, m.x, m.z); const flying = SG.marbles.filter((q) => q.ammo === 'corks').length; const cd = SG.sides[0].corkCd; SG.step(2.5);
    return { flying, cd, diz: SG.mice.filter((q) => q.side === 1 && q.state === 'dizzy').length, parts: SG.stats.partsOff - off0, again: (SG.setAmmo(0, 'corks'), SG.lobberBlock(0)), noBig, ammoBack: SG.sides[0].ammo }; });
  ok('cork scatter: five corks, mice go dizzy, no parts break, then an 8-second wait', ck.flying === 5 && ck.cd === 8 && ck.diz >= 1 && ck.parts === 0 && ck.again === 'corks', JSON.stringify(ck));
  ok('a Big Marble cannot be fired until one is earned', ck.noBig === 'nobig');

  /* A3 and A2: the hill feeds the lobber; the score */
  const hl = await ev(() => { F2('blue'); SG.sides[1].plan = { hill: 0, raid: 0, guard: 4, mend: 0 }; SG.stepUntil(() => SG.onHill()[0] >= 4, 20); SG.time = 500; SG.sides[0].holdT = 0; SG.sides[0].big = 0; const t0 = SG.clock; SG.stepUntil(() => SG.sides[0].big >= 1, SG.CONFIG.v2.hillSecs + 4); const t1 = SG.clock - t0; SG.step(SG.CONFIG.v2.hillSecs * 2.5);
    const big = SG.sides[0].big, hill = SG.sides[0].hill, sc = SG.sides[0].score; const w = K(1, 'wall'); KN(w, ['wall.plank.1', 'wall.plank.2']); SG.step(.1); const sc2 = SG.sides[0].score; KN(w, ['wall.rail.top', 'wall.rail.low']); SG.sides[0].collapses = 1; SG.step(.1);
    return { t1, big, hill, sc, sc2, sc3: SG.sides[0].score, off: w.ps.filter((q) => q.st !== 'on').length, total: w.total, red: SG.sides[1].big, pts: SG.CONFIG.v2 }; });
  ok('holding the hill gives a Big Marble every ' + hl.pts.hillSecs + ' seconds, up to ' + hl.pts.bigMax, hl.t1 > hl.pts.hillSecs - 1 && hl.t1 < hl.pts.hillSecs + 2.5 && hl.big === hl.pts.bigMax && hl.red === 0, JSON.stringify(hl));
  const wp = hl.pts.piecePts.wall / hl.total;
  ok('score = each part off the enemy counts its share of the piece (a whole wall ' + hl.pts.piecePts.wall + ', the Keep ' + hl.pts.piecePts.tower + ') + ' + hl.pts.collapsePts + ' a collapse + a small share for the hill, shown live', Math.abs(hl.sc - Math.round(hl.hill * 10) / 10) < .11 && Math.abs(hl.sc2 - hl.sc - 2 * wp) < .3 && Math.abs(hl.sc3 - (hl.sc2 + (hl.off - 2) * wp + hl.pts.collapsePts)) < .4, JSON.stringify(hl));
  const rd = await ev(() => { F2('blue'); const w = K(1, 'wall'); KN(w, ['wall.plank.1', 'wall.plank.2', 'wall.plank.4']); SG.sides[1].plan = { hill: 4, raid: 0, guard: 0, mend: 0 }; SG.stepUntil(() => SG.phase === 'mend', 70); const bank = SG.sides[0].bank, left = SG.pieces.filter((q) => q.side === 1).reduce((s, q) => s + q.ps.filter((x) => x.st !== 'on').length, 0), worth = SG.pieces.filter((q) => q.side === 1 && q.total).reduce((s, q) => s + q.ps.filter((x) => x.st !== 'on').length * (SG.CONFIG.v2.piecePts[q.kind] || 1) / q.total, 0); return { bank, left, worth }; });
  ok('at a round\'s end each part still off the enemy is banked', Math.abs(rd.bank - rd.worth) < 1e-6 && rd.left >= 3, JSON.stringify(rd));

  /* B3 and B4: thumps and mending */
  ok('a part that lands on a mouse makes it dizzy; so does a collapse beside it', await ev(() => { F2('blue'); const w = K(1, 'wall'); const m = SG.mice[6]; SG.debug.knock(w.id, 'wall.plank.3'); const q = w.ps.find((x) => x.id === 'wall.plank.3'); SG.phase = 'fight'; for (let i = 0; i < 18 && m.state !== 'dizzy'; i++) { m.x = q.rx; m.z = q.rz; SG.step(.05); } const a = m.state === 'dizzy';
    F2('blue'); const g = K(1, 'gate'), m2 = SG.mice[7]; m2.x = g.x + .05; m2.z = g.z + .2 * SG.unit(); m2.state = 'hold'; KN(g, ['gate.post.R']); return a && m2.state === 'dizzy'; }));
  const md = await ev(() => { F2('blue'); const w = K(0, 'wall'); KN(w, ['wall.plank.2', 'wall.post.L', 'wall.rail.low']); SG.step(1); SG.setPlan(0, 'mend', 1); const order = []; let t0 = SG.clock, first = 0; const seen = {};
    SG.stepUntil(() => { w.ps.forEach((q) => { if (q.st === 'on' && q.used && !seen[q.id]) { seen[q.id] = 1; order.push(q.id); if (!first) first = SG.clock; } }); return order.length === 3; }, 120); return { order, mender: SG.mice.filter((m) => m.side === 0 && m.role === 'mend').length, cfg: SG.CONFIG.v2.mendTime }; });
  ok('mending goes in support order: post, then rail, then plank (' + md.order.join(' > ') + ')', md.order.length === 3 && /post/.test(md.order[0]) && /rail/.test(md.order[1]) && /plank/.test(md.order[2]) && md.mender === 1 && md.cfg > 0, JSON.stringify(md));

  /* C2 and C3: orders */
  const pl = await ev(() => { F2('blue'); SG.setPlan(0, 'raid', 2); const a = JSON.stringify(SG.sides[0].plan); SG.setPlan(0, 'guard', 1); SG.setPlan(0, 'mend', 1); const b2 = JSON.stringify(SG.sides[0].plan); const r = SG.debug.roles().slice(0, 5); SG.setPlan(0, 'hill', 4); return { a, b2, r, c: JSON.stringify(SG.sides[0].plan) }; });
  ok('orders split the four field mice; the rest stay on the hill', pl.a === '{"hill":2,"raid":2,"guard":0,"mend":0}' && pl.b2 === '{"hill":0,"raid":2,"guard":1,"mend":1}' && pl.r.filter((x) => x === 'crew').length === 1 && pl.r.filter((x) => x === 'raid').length === 2 && pl.c === '{"hill":4,"raid":0,"guard":0,"mend":0}', JSON.stringify(pl));
  const raid = await ev(() => { const go = (team) => { F2(team); SG.sides[1].plan = { hill: 4, raid: 0, guard: 0, mend: 0 }; SG.setPlan(0, 'raid', 2); let first = 0; SG.stepUntil(() => { if (!first && SG.stats.raidPulls) first = SG.clock; return false; }, 45); return { pulls: SG.stats.raidPulls, off: SG.stats.partsOff, kinds: [...new Set(SG.pieces.filter((q) => q.side === 1 && q.parts < q.total).map((q) => q.kind))] }; }; return { blue: go('blue'), red: go('red') }; });
  ok('raiders walk to the nearest enemy wall and pull parts off (blue ' + raid.blue.pulls + ' pulls, red ' + raid.red.pulls + ')', raid.blue.pulls >= 3 && raid.blue.kinds.every((k) => k === 'wall' || k === 'gate'), JSON.stringify(raid));
  ok('red and blue raiders pull at the same rate (redRaid is 1: red\'s old head start made red win nearly every match on points)', Math.abs(raid.red.pulls - raid.blue.pulls) <= 4 && await ev(() => SG.CONFIG.v2.redRaid === 1), JSON.stringify(raid));
  const gd = await ev(() => { const go = (team) => { F2(team); SG.sides[1].plan = { hill: 0, raid: 4, guard: 0, mend: 0 }; SG.setPlan(0, 'guard', 3); SG.step(9); const k = K(0, 'tower'), g = SG.mice.filter((m) => m.side === 0 && m.role === 'guard'), near = g.length === 3 && g.every((m) => Math.hypot(m.x - k.x, m.z - k.z) < 1.3); SG.step(31); return { corks: SG.stats.guardCorks, near, diz: SG.stats.bySide[1].dizzied }; }; return { blue: go('blue'), red: go('red'), cfg: SG.CONFIG.v2 }; });
  ok('guards stand by their Keep and pop corks at raiders, sending some home dizzy', gd.blue.near && gd.blue.corks >= 2 && gd.blue.diz >= 1, JSON.stringify([gd.blue, gd.red]));
  ok('blue\'s guard corks reach further (' + gd.cfg.blueGuard + ' times)', gd.cfg.blueGuard > 1 && gd.blue.corks >= gd.red.corks, JSON.stringify([gd.blue, gd.red]));

  /* D: the budget, the new pieces, the high lob, the piece size */
  const bud = await ev(() => { SG.hold = true; SG.start('blue', { seed: 5 }); const C = SG.CONFIG.v2, P = () => SG.sides[0].points, o = { start: P(), max: C.points, steps: [] }; const put = (slot, x, z) => { SG.select(slot); const r = SG.tryPlace(x, z, Math.PI); o.steps.push([SG.sides[0].kit[slot].kind, r.ok, P(), r.code || '']); return r; };
    put(7, 0, 2.3); put(8, -.9, 2.0); put(0, 0, 1.3); put(10, .9, 2.2); put(17, -.5, 1.6); put(16, .9, 1.6); put(9, -1.5, 1.5); put(1, .6, 1.3); put(2, -.6, 1.3); const dear = put(18, 0, 1.75); SG.render();
    o.dear = dear; o.labels = [...document.querySelectorAll('.pop.cost')].map((e) => e.textContent); o.count = document.getElementById('hCount').textContent; o.cost = C.cost; return o; });
  ok('a camp has ' + bud.max + ' points: the Keep and the first lobber are free, a wall 1, a workshop 2, a trap 2, a second lobber 3, a tent 1', bud.start === bud.max && bud.steps.slice(0, 9).every((q) => q[1]) && JSON.stringify(bud.steps.slice(0, 9).map((q) => q[2])) === JSON.stringify([12, 12, 11, 9, 7, 4, 3, 2, 1]), JSON.stringify(bud.steps));
  ok('a piece that costs more than is left cannot be placed, and says why', bud.dear.ok === false && bud.dear.code === 'points' && /points/.test(bud.dear.text), JSON.stringify(bud.dear));
  ok('the mat shows what each piece costs, and the bar shows the points left', bud.labels.length >= 5 && bud.labels.some((t) => /^[123]$/.test(t)) && /Points left 1 of 12/.test(bud.count), JSON.stringify([bud.labels, bud.count]));
  await ev(() => { window.F3 = (pa, pb, team) => { SG.hold = true; SG.start(team || 'blue', { seed: 77, presets: [pa, pb] }); SG.sides[0].bot = true; SG.skipBuild(); SG.begin(); SG.step(SG.CONFIG.count + .05); SG.sides[0].bot = SG.sides[1].bot = false; SG.sides.forEach((q) => { q.plan = { hill: 4, raid: 0, guard: 0, mend: 0 }; }); SG.time = 500; }; });
  const prs = await ev(() => { const o = {}; ['good', 'average', 'bad'].forEach((k) => { F3(k, k); const mine = SG.pieces.filter((q) => q.side === 0); o[k] = { n: mine.length, left: SG.sides[0].points, spent: mine.reduce((t, q) => t + (q.cost || 0), 0), keep: !!SG.sides[0].keep, built: mine.every((q) => q.built) }; }); return o; });
  ok('the three bot camps (good, average, bad) all fit the 12 points', ['good', 'average', 'bad'].every((k) => prs[k].spent <= 12 && prs[k].left >= 0 && prs[k].keep && prs[k].built && prs[k].n >= 10), JSON.stringify(prs));
  const prop = await ev(() => { F3('good', 'bad'); const g = K(0, 'tower'), bd = K(1, 'tower'), br = SG.pieces.filter((q) => q.side === 0 && q.kind === 'brace'); KN(g, ['tower.post.NE', 'tower.post.SE', 'tower.brace.E']); const held = !g.down; F3('good', 'bad'); const b2 = K(1, 'tower'); KN(b2, ['tower.post.NE', 'tower.post.SE', 'tower.brace.E']); return { braces: br.length, props: br.map((q) => q.props === g.id), held, plain: b2.down }; });
  ok('a brace piece set against the Keep props it: on two legs with that side\'s own brace gone it still stands, where an unpropped Keep falls', prop.braces === 2 && prop.props.every(Boolean) && prop.held && prop.plain, JSON.stringify(prop));
  const trap = await ev(() => { F3('good', 'bad'); const C = SG.CONFIG, t = SG.pieces.find((q) => q.side === 0 && q.kind === 'trap'), a = SG.mice[5], c = SG.mice[6]; a.x = t.x; a.z = t.z; a.state = 'hold'; SG.step(.05); const o = { flung: a.state === 'dizzy', t: Math.round(a.t * 10) / 10, sprung: !!t.sprung, n: SG.stats.trapped, tent: SG.pieces.some((q) => q.side === 1 && q.kind === 'tent') };
    c.x = t.x; c.z = t.z; c.state = 'hold'; SG.step(.05); o.second = c.state === 'dizzy'; SG.sides[1].plan = { hill: 0, raid: 0, guard: 4, mend: 0 }; c.x = 0; c.z = -2.5; SG.setPlan(0, 'mend', 1); const t0 = SG.clock; SG.stepUntil(() => !t.sprung, 40); o.reset = !t.sprung; o.took = SG.clock - t0;
    const tn = SG.pieces.find((q) => q.side === 1 && q.kind === 'tent'); KN(tn, [tn.ps[0].id]); const d = SG.mice[7]; d.x = t.x; d.z = t.z; d.state = 'hold'; SG.step(.05); o.again = d.state === 'dizzy'; o.dbg = [t.sprung, SG.phase, SG.mice.map((m) => m.side + m.state + (Math.hypot(m.x - t.x, m.z - t.z) < .15 ? '*' : '')).join(' ')]; o.t2 = Math.round(d.t * 10) / 10; o.cfg = [C.v2.tentDizzy, C.dizzy]; return o; });
  ok('a spring trap flings the first raider home dizzy (BOING!), then does nothing until a mender sets it again', trap.flung && trap.sprung && trap.n === 1 && !trap.second && trap.reset && trap.took > 1 && trap.again, JSON.stringify(trap));
  ok('with a whole tent a mouse is dizzy for ' + trap.cfg[0] + ' s, not ' + trap.cfg[1] + '; with a part off the tent it is ' + trap.cfg[1] + ' again', trap.tent && Math.abs(trap.t - trap.cfg[0]) < .2 && Math.abs(trap.t2 - trap.cfg[1]) < .2, JSON.stringify(trap));
  const two = await ev(() => { const go = (second) => { SG.hold = true; SG.start('blue', { seed: 9 }); [[7, 0, 2.3], [8, -.9, 1.9]].concat(second ? [[16, .9, 1.9]] : []).forEach((q) => { SG.select(q[0]); SG.tryPlace(q[1], q[2], Math.PI); }); SG.skipBuild(); SG.begin(); SG.step(SG.CONFIG.count + .05); SG.sides[1].bot = false; SG.stepUntil(() => SG.debug.crewReady(0), 20); SG.sides[0].reload = 0; SG.fire(0, 0, -2); return SG.sides[0].reload; }; return { one: go(false), two: go(true), cfg: SG.CONFIG.v2 }; });
  ok('a second lobber makes the winding quicker (' + two.one + ' s down to ' + two.two.toFixed(2) + ' s)', Math.abs(two.one - two.cfg.reload) < 1e-6 && Math.abs(two.two - two.cfg.reload * two.cfg.twoLobbers) < 1e-6, JSON.stringify([two.one, two.two]));
  const shop = await ev(() => { const go = (whole) => { F3('good', 'bad'); const sh = SG.pieces.find((q) => q.side === 0 && q.kind === 'workshop'); if (!whole) { KN(sh, [sh.ps[0].id]); sh.ps[0].used = true; } const w = K(0, 'wall'); KN(w, ['wall.plank.1']); SG.step(1); SG.setPlan(0, 'mend', 1); let t0 = 0, t1 = 0; SG.stepUntil(() => { const f = SG.mice.some((m) => m.side === 0 && m.state === 'fix'); if (f && !t0) t0 = SG.clock; if (t0 && !f && !t1) t1 = SG.clock; return !!t1; }, 60); return t1 - t0; }; return { whole: go(true), broken: go(false), cfg: SG.CONFIG.v2 }; });
  ok('a whole workshop mends twice as fast (' + shop.whole.toFixed(1) + ' s a part, against ' + shop.broken.toFixed(1) + ' s with a part off the workshop)', Math.abs(shop.whole - shop.cfg.mendTime * shop.cfg.shopMend) < .3 && Math.abs(shop.broken - shop.cfg.mendTime) < .3, JSON.stringify([shop.whole, shop.broken]));
  const lob = await ev(() => { F3('good', 'bad'); const C = SG.CONFIG.v2, sA = SG.sides[0]; { const s0 = sA; s0.high = false; var lo = SG.arc(0, 0, -1.2); s0.high = true; var hi = SG.arc(0, 0, -1.2); s0.big = 1; SG.setAmmo(0, 'big'); var bg = SG.arc(0, 0, -1.2); SG.setAmmo(0, 'marble'); s0.high = false; }
    /* red (the average camp) fires a Big Marble low at the good Keep: the wall in front takes it */
    F3('good', 'average'); const gk = K(0, 'tower'), s1 = SG.sides[1]; s1.big = 1; s1.ammo = 'big'; const blocked = SG.arc(1, gk.x, gk.z), bp = blocked.hit ? SG.debug.piece(blocked.hit.piece) : null; s1.ammo = 'marble'; s1.high = true; const over = SG.arc(1, gk.x, gk.z), op = over.hit ? SG.debug.piece(over.hit.piece) : null; s1.high = false;
    F3('good', 'bad'); const kp = K(1, 'tower'), s0 = SG.sides[0];
    /* blue fires a Big Marble at the bad Keep, which has nothing in front of it */
    SG.stepUntil(() => SG.debug.crewReady(0), 20); s0.reload = 0; s0.big = 1; SG.setAmmo(0, 'big'); const legs0 = ON(kp, /tower\.post/), br0 = ON(kp, /tower\.brace/); SG.fire(0, kp.x, kp.z); SG.lastHit = null; SG.stepUntil(() => SG.lastHit, 8);
    return { loH: lo.h, hiH: hi.h, hiHigh: hi.high, bigHigh: bg.high, bigH: bg.h, blockedBy: bp && bp.kind + bp.side, overHits: op && op.kind + op.side, legs0, legs1: ON(kp, /tower\.post/), br0, hitKeep: SG.lastHit.piece === kp.id, half: C.highBlast }; });
  ok('the high lob flies a higher arc; a Big Marble is too heavy for it and always flies low', lob.hiHigh && lob.hiH > lob.loH * 1.5 && lob.bigHigh === false && Math.abs(lob.bigH - lob.loH) < 1e-6, JSON.stringify(lob));
  ok('a wall in front of the Keep stops a low shot at it (the first piece along the arc); the high lob goes over the wall', /^(wall|gate)0$/.test(lob.blockedBy) && lob.overHits === 'tower0', JSON.stringify(lob));
  ok('a Big Marble that lands on a Keep breaks a leg even while its braces are on', lob.hitKeep && lob.br0 >= 3 && lob.legs0 === 4 && lob.legs1 === 3, JSON.stringify(lob));
  const hb = await ev(() => { const go = (high) => { F3('good', 'bad'); const w = K(1, 'wall'), s0 = SG.sides[0]; SG.stepUntil(() => SG.debug.crewReady(0), 20); s0.reload = 0; s0.high = high; SG.lastHit = null; const a = SG.fire(0, w.x, w.z); SG.stepUntil(() => SG.lastHit, 8); return { k: SG.lastHit.knocked, T: a.T }; }; return { low: go(false), high: go(true) }; });
  ok('a high lob takes longer and knocks off less (half the blast): ' + hb.high.k + ' parts against ' + hb.low.k, hb.high.T > hb.low.T * 1.2 && hb.high.k < hb.low.k && hb.low.k >= 3, JSON.stringify(hb));
  const sz = await ev(() => { const o = {}; ['small', 'medium', 'large'].forEach((z) => { SG.hold = true; SG.start('blue', { seed: 3, pieces: z, presets: ['average', 'average'] }); SG.sides[0].bot = true; SG.skipBuild(); const t0 = SG.clock; SG.begin(); SG.stepUntil(() => SG.onHill()[0] >= 1, 30); o[z] = { unit: Math.round(SG.unit() * 100) / 100, foot: SG.FOOT.wall[0], walk: Math.round((SG.clock - t0) * 10) / 10, zone: SG.ZONE.rMin }; });
    SG.start('blue', { seed: 3 }); o.def = SG.pieceSize; SG.start('blue', { seed: 3, rules: 1 }); o.v1 = SG.pieceSize; o.cfg = SG.CONFIG.pieceScale; return o; });
  ok('pieces come in three sizes; small is the default (about a third smaller than large), and the old rules keep the large ones', sz.def === 'small' && sz.cfg === 'small' && sz.v1 === 'large' && sz.large.unit === 1 && sz.small.unit > .6 && sz.small.unit < .7 && sz.small.foot < sz.medium.foot && sz.medium.foot < sz.large.foot, JSON.stringify(sz));
  ok('at the small size a mouse takes about 6 to 8 seconds from its camp to the hill (' + sz.small.walk + ' s)', sz.small.walk >= 5.8 && sz.small.walk <= 8.2, JSON.stringify(sz));
  await ev(() => { SG.hold = false; SG.reset(); SG.render(); });
  await p.click('#z_large'); await p.click('#bPlay'); const zl = await ev(() => SG.pieceSize); await ev(() => { SG.reset(); SG.render(); }); await p.click('#z_small'); await p.click('#bPlay'); const zs = await ev(() => SG.pieceSize);
  ok('the title has a "Pieces" choice: small, medium or large', zl === 'large' && zs === 'small' && await ev(() => /small/i.test(document.getElementById('z_small').textContent) && /large/i.test(document.getElementById('z_large').textContent)));

  /* the buttons */
  await ev(() => { F2('blue'); SG.hold = false; SG.render(); });
  ok('the fight bar has the four orders, the lobber and a pause; the old bar is away', await ev(() => document.getElementById('fbar2').style.display === 'flex' && document.getElementById('fbar').style.display === 'none' && /Hill 4/.test(document.getElementById('o_hill').textContent)));
  await p.click('#o_raid'); const row = await ev(() => document.getElementById('nrow').style.display); await p.click('#n2');
  ok('tap an order, then a number: Raid 2', row === 'flex' && await ev(() => SG.sides[0].plan.raid === 2 && SG.sides[0].plan.hill === 2 && document.getElementById('nrow').style.display === 'none' && /Raid 2/.test(document.getElementById('o_raid').textContent)));
  await p.click('#b2_lobber'); const pick = await ev(() => ['a_marble', 'a_big', 'a_corks'].map((i) => getComputedStyle(document.getElementById(i)).display !== 'none')); await p.click('#a_corks');
  ok('the lobber button opens the ammo picker: Marble, Big, Corks', pick.every(Boolean) && await ev(() => SG.sides[0].tool === 'lobber' && SG.sides[0].ammo === 'corks' && document.getElementById('a_corks').className === 'btn on'));
  await ev(() => { SG.hold = true; SG.stepUntil(() => SG.debug.crewReady(0), 15); SG.sides[0].reload = 0; SG.hold = false; SG.setAmmo(0, 'marble'); SG.render(); });
  const ls = await ev(() => { const l = SG.debug.piece(SG.sides[0].lobber); return [SG.screen(l.x, l.z), SG.screen(l.x, l.z + .9)]; });
  await p.mouse.move(ls[0].x, ls[0].y); await p.mouse.down(); await p.mouse.move(ls[1].x, ls[1].y, { steps: 4 }); const aim = await ev(() => SG.sides[0].aim.on); await p.mouse.up();
  ok('drag back and let go fires', aim && await ev(() => SG.stats.shots === 1));

  /* bots */
  const bots = await ev(() => { SG.hold = true; const o = { over: 0, keep: 0, col: 0, off: 0, stuck: 0, n: 12, inside: 0 }; for (let i = 0; i < o.n; i++) { SG.start(i % 2 ? 'red' : 'blue', { seed: 8100 + i * 91, level: 'normal' }); SG.auto(0, 'normal'); SG.skipBuild(); SG.begin(); let g = 0; while (SG.phase !== 'over' && g++ < 2500) { SG.step(.2); o.inside += SG.inWall(); }
      if (SG.phase === 'over' && SG.winner >= 0) o.over++; if (SG.stats.keepDown) o.keep++; o.col += SG.stats.collapses; o.off += SG.stats.partsOff; o.stuck += SG.stats.stuck; } return o; });
  ok('12 bot matches under v2 all end with a winner; nobody stuck, nobody inside a wall', bots.over === bots.n && bots.stuck === 0 && bots.inside === 0, JSON.stringify(bots));
  console.log('--- 12 bot matches: Keep down in ' + bots.keep + ', collapses ' + (bots.col / bots.n).toFixed(1) + ' a match, parts off ' + (bots.off / bots.n).toFixed(0) + ' a match (the tuned numbers are in BOT_REPORT.md)');
  ok('no page errors', errs.length === 0, errs.join(' | '));
  console.log('test took ' + ((Date.now() - T0) / 1000).toFixed(0) + ' s');
  console.log(bad ? ('FAILED ' + bad + ' of ' + n) : ('ALL ' + n + ' PASSED'));
  await b.close(); process.exit(bad ? 1 : 0);
};
run();
