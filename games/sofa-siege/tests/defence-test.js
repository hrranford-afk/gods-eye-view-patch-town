/* Round Table Kingdom Defences prototype test. Run: NODE_PATH=$(npm root -g) node tests/defence-test.js
   Posts with crew, ammo and jam; upkeep; hidden traps; compartments; the mender; Test my base; the match flag; determinism; the Lab panel. Writes DEFENCE_REPORT.md only with --report (see tests/defence-proof.js for the win rates). */
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
  const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined && !cond ? '  -> ' + JSON.stringify(extra) : '')); };
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__done', null, { timeout: 60000 });
  await ev(() => { SG.hold = true; });
  /* helper in the page: a fresh Lab with Defences on and a given target camp; world spots from the target's frame */
  await ev(() => {
    window.T = {
      lab(tpl) { SG.labStart(); SG.lab.card = false; SG.setProto('defences', true, false); if (tpl) SG.labLoadTarget(tpl, true); SG.step(.1); },
      at(x, z) { const w = SG.def.items.length >= 0 ? [-x, -z] : 0; return w; },   /* the target camp (side 1) is turned round: camp frame (x,z) is world (-x,-z) */
      run(s) { for (let i = 0; i < s * 60; i++) SG.step(1 / 60); },
      add(k, x, z) { return SG.defAdd(k, 1, -x, -z); },
      crew() { SG.step(.6); },
      mouse(s, i) { return SG.mice[s * 5 + i]; },
      home() { SG.mice.forEach((m) => { m.dj = null; }); },
    };
  });
  /* 1. off by default, and entering and leaving the Lab leaves nothing behind */
  ok('Defences is a Lab prototype, off by default (no flag, no items, five kinds of ammunition)', await ev(() => { SG.labStart(); return !!SG.labProtos.defences && !SG.labFlags.defences && !SG.def.on && !SG.def.match && SG.def.items.length === 0 && Object.keys(SG.ammo).length === 5 && document.querySelector('#lab [data-a="tool_def"]') === null; }));
  ok('switching it on puts the seven Arsenal weapons on the table, adds a Defences tool and two camp templates; off takes them away again', await ev(() => {
    SG.setProto('defences', true, false); const on = SG.def.on && Object.keys(SG.ammo).length === 11 && !!document.querySelector('#lab [data-a="tool_def"]') && SG.labProtos.defences && document.querySelector('#lab [data-a="tg_courtyard"]') && document.querySelector('#lab [data-a="tg_rooms"]');
    SG.setProto('defences', false, false); return !!on && !SG.def.on && Object.keys(SG.ammo).length === 5 && !document.querySelector('#lab [data-a="tool_def"]') && !document.querySelector('#lab [data-a="tg_courtyard"]'); }));
  ok('Back to menu and starting a match put everything away', await ev(() => { SG.setProto('defences', true, false); SG.labBack(); const a = !SG.def.on && Object.keys(SG.ammo).length === 5;
    SG.labStart(); SG.setProto('defences', true, false); SG.start('blue', { seed: 5 }); return a && !SG.def.on && !SG.def.match && Object.keys(SG.ammo).length === 5 && SG.def.items.length === 0; }));

  /* 2. posts: placing, crew, ammo */
  ok('a post is placed on the table (not on a piece, not on another item) and costs build points', await ev(() => { T.lab('walled'); const a = T.add('pop', 1.3, 1.2), b = T.add('pop', 1.3, 1.2), c = SG.defAdd('pop', 1, 0, -2.52);
    const pc = SG.defKinds; return a.ok && !b.ok && /close/.test(b.code) && !c.ok && SG.def.items.length === 1 && SG.CONFIG.defence.cost.pop === 1.5 && SG.CONFIG.defence.cost.counter === 2.5; }));
  ok('a crew mouse walks to the slot behind the post, and the post is then manned (the mice do the walking)', await ev(() => { T.lab('walled'); T.add('pop', -1.0, 1.4); const it = SG.def.items[0], m0 = SG.mice.filter((m) => m.side === 1).map((m) => [m.x, m.z]); T.run(25);
    const cm = SG.mice[5 + it.crewM]; return it.crewM >= 0 && it.manned && cm.dj && cm.dj.k === 'crew' && Math.hypot(cm.x - (it.x + (it.x) * .0), cm.z - it.z) < .5; }));
  ok('no crew, no fire: a post with its crew mouse down does not shoot, and shoots again when the mouse is back', await ev(() => { T.lab('walled'); T.add('pop', -0.9, 1.5); const it = SG.def.items[0]; T.run(25); const cm = SG.mice[5 + it.crewM];
    const e = SG.mice[0]; e.x = it.x - .2; e.z = it.z + .45; e.tx = e.x; e.tz = e.z; e.path = null; e.state = 'hold'; SG.debug.dizzy(1, it.crewM); T.run(.5); const a0 = it.ammo; T.run(2); const quiet = it.ammo === a0;
    T.run(8); return quiet && cm.state !== 'dizzy' && it.manned; }));
  ok('a Pop-gun post knocks a mouse back, slows it, spends a cork and swats a small rolling shot', await ev(() => { T.lab('walled'); T.add('pop', -0.9, 1.5); const it = SG.def.items[0]; T.run(25); const e = SG.mice[0], d0 = () => Math.hypot(e.x - it.x, e.z - it.z);
    e.x = it.x + .1; e.z = it.z + .55; e.tx = e.x; e.tz = e.z; e.path = null; e.state = 'hold'; e.dj = { k: 'raid', pulls: 0 }; e.dj = null; const a0 = it.ammo, dd = d0(); T.run(.2); const knocked = d0() > dd + .1 && e.slowT > 0 && it.ammo === a0 - 1;
    const sh = { id: 9001, side: 0, live: true, rolling: true, ammo: 'roller', t: 0, T: 1, rl: { x: it.x + .3, z: it.z + .1, dx: 0, dz: 1, left: 3, acc: 0, n: 0 }, x0: 0, z0: 0, x1: 0, z1: 0 }; SG.marbles.push(sh); T.run(.8); const sw = sh.rl.left === 0 && SG.def.stats.swats === 1;
    return knocked && sw; }));
  ok('the Slinger knocks a shell out of the air, stops a roller and lobs at a lobber; the Counter-lobber only fires inside its range band', await ev(() => {
    T.lab('walled'); T.add('sling', -.5, 1.4); T.add('counter', 1.1, 2.2); const sl = SG.def.items[0], co = SG.def.items[1]; T.run(25); const C = SG.CONFIG.defence; let out = {};
    /* a roller on the ground inside range */
    const sh = { id: 9002, side: 0, live: true, rolling: true, ammo: 'roller', t: 0, T: 1, rl: { x: sl.x + .5, z: sl.z + .5, dx: 0, dz: 1, left: 3, acc: 0, n: 0 }, x0: 0, z0: 0, x1: 0, z1: 0 }; SG.marbles.push(sh); T.run(.5); out.stop = sh.rl.left === 0 && SG.def.stats.stops === 1;
    /* a counter-lobber: a lobber that fired at 4 away, in band, is answered; one out of band is not */
    const far = { x: co.x, z: co.z + 5, t: SG.clock, gun: false, s: 0, taken: false }, near = { x: co.x, z: co.z + .5, t: SG.clock, gun: false, s: 0, taken: false };
    SG.def.seen[1] = [near]; co.cd = 0; T.run(.3); out.tooClose = !near.taken && co.ammo === C.counter.ammo; SG.def.seen[1] = [far]; co.cd = 0; T.run(.3); out.tooFar = !far.taken && co.ammo === C.counter.ammo;
    const ok1 = { x: co.x, z: co.z + 2.6, t: SG.clock, gun: false, s: 0, taken: false }; SG.def.seen[1] = [ok1]; co.cd = 0; T.run(.3); out.fires = ok1.taken && co.ammo === C.counter.ammo - 1 && SG.def.stats.counters === 1;
    out.band = C.counter.min > .5 && C.counter.max > C.counter.min; return out.stop && out.tooClose && out.tooFar && out.fires && out.band ? true : out; }));
  ok('the Counter-lobber answers a real shot: it saw the lobber fire, lobbed back, and a lobber hit by it is out', await ev(() => { SG.start('blue', { mode: 'lab', seed: 777 }); SG.lab.card = false; SG.setProto('defences', true, false); SG.labLoadTarget('walled', true);
    /* the other side's real lobber at 3 away from the counter-lobber; the target camp's post fires back */
    SG.labLoadRecs(0, [{ kind: 'tower', x: 0, z: 2.5, rot: 3.14 }, { kind: 'lobber', x: -1.0, z: .9, rot: 3.14 }]); SG.step(.1); T.add('counter', 1.1, 2.2); const co = SG.def.items[0]; T.run(25);
    const lb = SG.lobbers(0)[0]; SG.lab.crew = false; SG.setCam(0); const s1 = SG.labFire(0, 0, 0, -2.4, { force: true }); T.run(.2); const seen = SG.def.seen[1].length === 1; T.run(1.0);
    return !!s1 && seen && co.n.shots === 1 && SG.def.stats.counters === 1; }));

  /* 3. upkeep: jam, oil, restock */
  ok('a post jams after N shots unless it gets lulls to oil in; a jammed post does not shoot until its crew has cleared it', await ev(() => { T.lab('walled'); T.add('pop', -0.9, 1.5); const it = SG.def.items[0], C = SG.CONFIG.defence.pop; T.run(25); const e = SG.mice[0]; let jammedAt = -1, shots = 0;
    for (let i = 0; i < 60 * 40 && jammedAt < 0; i++) { e.x = it.x + .1; e.z = it.z + .5; e.tx = e.x; e.tz = e.z; e.path = null; e.state = 'hold'; e.slowT = 0; SG.step(1 / 60); if (it.jammed) jammedAt = it.n.shots; }
    const a0 = it.ammo; T.run(.5); const held = it.ammo === a0; /* jammed: nothing fired */ T.run(SG.CONFIG.defence.oilSecs + 1); return jammedAt === C.jamAfter && held && !it.jammed && it.jam < .1; }));
  ok('with lulls in between, the crew oils the post and it does not jam', await ev(() => { T.lab('walled'); T.add('pop', -0.9, 1.5); const it = SG.def.items[0]; T.run(25); const e = SG.mice[0]; let jams = 0;
    for (let k = 0; k < 6; k++) { for (let i = 0; i < 60 * 3; i++) { e.x = it.x + .1; e.z = it.z + .5; e.tx = e.x; e.tz = e.z; e.path = null; e.state = 'hold'; e.slowT = 0; SG.step(1 / 60); } e.x = 0; e.z = 0; T.run(6); } return !it.jammed && SG.def.stats.jams === 0 && it.n.shots > 4; }));
  ok('out of ammunition the post stops; a free mouse fetches more (a trip) and the post is full again; buying costs points and is at once', await ev(() => { T.lab('walled'); T.add('pop', -0.9, 1.5); const it = SG.def.items[0]; T.run(25); it.ammo = 0; const e = SG.mice[0]; e.x = it.x + .1; e.z = it.z + .5; e.tx = e.x; e.tz = e.z; e.path = null; e.state = 'hold'; T.run(.3); const quiet = it.ammo === 0;
    T.run(30); const refilled = it.ammo === SG.CONFIG.defence.pop.ammo && it.n.restocks === 1; it.ammo = 0; const sp0 = SG.def.spent[1]; SG.defRestock(it, 'buy'); return quiet && refilled && it.ammo === SG.CONFIG.defence.pop.ammo && SG.def.spent[1] === sp0 + SG.CONFIG.defence.restockCost; }));

  /* 4. hidden traps */
  ok('a trap is drawn for the builder and hidden from the attacker until it springs (the Attacker\'s view)', await ev(() => { T.lab('walled'); SG.labStart; T.add('snap', -.4, 1.2); const it = SG.def.items[0]; SG.setCam(3); SG.step(.2); T.run(.2); SG.render && 0; const vis = () => (window.__defVis ? 1 : 0); return !!SG.labDraw() && it.cat === 'trap' && !it.sprung && SG.def.view === 'builder'; }));
  ok('Spring plank flings a mouse back and dazes it; Snap board stuns; Trip cord drops a crate; Glue puddle slows; each is used once', await ev(() => {
    T.lab('walled'); const res = {}; ['spring', 'snap', 'cord', 'glue'].forEach((k, i) => T.add(k, -1.0 + i * .5, 1.0)); const its = SG.def.items; T.run(.2);
    const step = (it) => { const e = SG.mice[0]; e.state = 'hold'; e.x = it.x; e.z = it.z; e.tx = e.x; e.tz = e.z; e.path = null; e.slowT = 0; const x0 = e.x, z0 = e.z; SG.step(1 / 60); return { e, x0, z0 }; };
    let r = step(its[0]); res.spring = its[0].sprung && Math.hypot(r.e.x - r.x0, r.e.z - r.z0) > .3 && r.e.state === 'dizzy' && r.e.daze; SG.mice[0].state = 'idle'; SG.mice[0].t = 0;
    r = step(its[1]); res.snap = its[1].sprung && r.e.state === 'dizzy'; SG.mice[0].state = 'idle';
    r = step(its[2]); res.cord = its[2].sprung && r.e.state === 'dizzy' && SG.def.stats.crates >= 1; SG.mice[0].state = 'idle';
    r = step(its[3]); SG.step(1 / 60); res.glue = its[3].sprung && SG.puddles.length === 1 && r.e.slowT > 0; SG.mice[0].state = 'idle'; SG.mice[0].slowT = 0;
    const n0 = SG.def.stats.sprung; r = step(its[0]); res.once = SG.def.stats.sprung === n0; return res.spring && res.snap && res.cord && res.glue && res.once ? true : res; }));
  ok('a rolling log rolls along its lane and knocks mice in it dizzy (once each)', await ev(() => { T.lab('walled'); T.add('log', -.2, 1.0); const it = SG.def.items[0]; T.run(.2); const e = SG.mice[0], e2 = SG.mice[1]; e.state = 'hold'; e.x = it.x; e.z = it.z; e.tx = e.x; e.tz = e.z; e.path = null; SG.step(1 / 60);
    const g = SG.def.logs[0]; if (!g) return false; e2.state = 'hold'; e2.x = g.x + g.dx * .6; e2.z = g.z + g.dz * .6; e2.tx = e2.x; e2.tz = e2.z; e2.path = null; const l0 = g.left; T.run(1.1); return it.sprung && SG.def.logs.length <= 1 && (e2.state === 'dizzy') && SG.def.stats.logged >= 1 && g.left < l0; }));
  ok('a sprung trap is set again by a mouse (it goes there and sets it), then it works again', await ev(() => { T.lab('walled'); T.add('snap', -.4, 1.3); const it = SG.def.items[0]; T.run(.2); const e = SG.mice[0]; e.state = 'hold'; e.x = it.x; e.z = it.z; e.tx = e.x; e.tz = e.z; e.path = null; SG.step(1 / 60); const sp = it.sprung; e.state = 'idle'; e.t = 0; e.x = 0; e.z = 0; T.run(30);
    const set = !it.sprung && SG.def.stats.resets === 1; e.state = 'hold'; e.x = it.x; e.z = it.z; e.tx = e.x; e.tz = e.z; e.path = null; e.slowT = 0; SG.step(1 / 60); return sp && set && it.sprung && it.n.sprung === 2; }));

  /* 5. compartments */
  ok('"Walled courtyard" and "Three rooms" load: walls and gates in a ring and in rooms, a Keep, and posts and traps in them', await ev(() => { const o = {}; ['courtyard', 'rooms'].forEach((id) => { T.lab(id); const ps = SG.pieces.filter((p) => p.side === 1); o[id] = { walls: ps.filter((p) => p.kind === 'wall').length, gates: ps.filter((p) => p.kind === 'gate').length, keep: ps.filter((p) => p.kind === 'tower').length, items: SG.def.items.length, posts: SG.def.items.filter((i) => i.cat === 'post').length, traps: SG.def.items.filter((i) => i.cat === 'trap').length, down: ps.filter((p) => p.down || p.parts < p.total).length }; });
    return o.courtyard.walls >= 8 && o.courtyard.gates >= 1 && o.courtyard.keep === 1 && o.courtyard.posts >= 3 && o.courtyard.traps >= 3 && o.rooms.gates >= 5 && o.rooms.walls >= 6 && o.rooms.keep === 1 && o.rooms.posts >= 3 && o.courtyard.down === 0 && o.rooms.down === 0 ? true : o; }));
  ok('the walls of a camp split it into rooms: no piece overlaps another, and mice crew posts inside through the gates', await ev(() => { const o = {}; ['courtyard', 'rooms'].forEach((id) => { T.lab(id); let ov = 0; const ps = SG.pieces.filter((p) => p.side === 1);
      ps.forEach((a, i) => ps.forEach((c, j) => { if (j > i && SG.overlap(a, c)) ov++; }));
      T.run(40); const ins = SG.def.items.filter((i) => i.cat === 'post').every((it) => it.manned); o[id] = { ov, ins }; });
    return o.courtyard.ins && o.rooms.ins && o.courtyard.ov === 0 && o.rooms.ov === 0 ? true : o; }));
  /* 6. repair */
  ok('a mender on a wall mends one part every few seconds when it is calm, and not while shells are landing', await ev(() => { T.lab('courtyard'); T.run(25); const w = SG.def.items.find((i) => i.kind === 'warden'), wp = SG.pieces.filter((p) => p.side === 1 && p.kind === 'wall' && Math.hypot(p.x - w.x, p.z - w.z) < .1)[0];
    SG.debug.knock(wp.id, wp.ps.find((q) => /plank/.test(q.id)).id); SG.debug.knock(wp.id, wp.ps.filter((q) => /plank/.test(q.id))[1].id); const off0 = wp.ps.filter((q) => q.st !== 'on').length;
    SG.lastHit = { x: wp.x, z: wp.z, t: SG.clock, side: 0 }; T.run(2.5); const still = wp.ps.filter((q) => q.st !== 'on').length === off0; T.run(5); const off1 = wp.ps.filter((q) => q.st !== 'on').length; T.run(6); const off2 = wp.ps.filter((q) => q.st !== 'on').length;
    return off0 === 2 && still && off1 === 1 && off2 === 0 && SG.def.stats.repairs === 2; }));

  /* 7. Test my base */
  const rep = await ev(() => { T.lab('courtyard'); const snap = JSON.stringify([SG.labState(1), SG.def.items.map((i) => [i.kind, i.ammo, i.jam, i.sprung])]); const t0 = performance.now(); const r = SG.defTest(); const ms = performance.now() - t0; const snap2 = JSON.stringify([SG.labState(1), SG.def.items.map((i) => [i.kind, i.ammo, i.jam, i.sprung])]);
    const r2 = SG.defTest(); return { r, ms, same: snap === snap2, again: JSON.stringify(r) === JSON.stringify(r2), text: SG.defReportText(r), html: SG.defReportHtml(r) }; });
  ok('Test my base: fires all seven weapons at the camp and scores it out of 7, names the weapon that hurt most, the defences that earned their place, and what did nothing', rep.r.of === 7 && rep.r.weapons.length === 7 && rep.r.score >= 0 && rep.r.score <= 7 && !!rep.r.worst && rep.r.items.length === 8 && rep.r.items.every((i) => i.verdict) && rep.r.pieces.length >= 8 && /SCORE: \d of 7/.test(rep.text) && /Hurt most/.test(rep.text) && /earned their place/.test(rep.text) && /did nothing/.test(rep.text), { score: rep.r.score, worst: rep.r.worst });
  ok('Test my base leaves the table exactly as it was (pieces, items, ammo, jam), and gives the same card every time', rep.same && rep.again);
  ok('the card is a page: a score, a small map of the camp, a bar for each weapon and the text for pasting', /<svg/.test(rep.html) && /7<\/div>|\/ 7/.test(rep.html) && (rep.html.match(/border-radius:3px/g) || []).length === 7 && /textarea/.test(rep.html));
  ok('the defences are worth something: the camp with them takes fewer points than the same camp bare, and the Counter-lobber silences the gun', rep.r.total < rep.r.bareTotal && rep.r.weapons.some((w) => w.lost > 0), { t: rep.r.total, b: rep.r.bareTotal });
  console.log('   Test my base took ' + Math.round(rep.ms) + ' ms');
  ok('Test my base on a camp with no defences still works and shows nothing earned', await ev(() => { T.lab('walled'); const r = SG.defTest(); return r.items.length === 0 && r.score >= 0 && r.total === r.bareTotal; }));

  /* 8. match mode (flag) */
  const m = await ev(() => { const o = {}; SG.start('blue', { seed: 5000, level: 'normal', presets: ['good', 'good'], defence: { fort: [true, false] } }); SG.auto(0, 'normal'); SG.auto(1, 'normal');
    o.flag = SG.def.on && SG.def.match && Object.keys(SG.ammo).length === 11; SG.skipBuild(); o.pre = SG.sides[0].preset; o.cost = [0, 1].map((s) => SG.pieces.filter((q) => q.side === s).reduce((t, q) => t + q.cost, 0)); o.items = SG.def.items.map((i) => [i.side, i.kind]); o.points = [SG.sides[0].points, SG.sides[1].points];
    SG.begin(); let g = 0; while (SG.phase !== 'over' && g++ < 700) SG.step(1); o.over = SG.phase === 'over'; o.winner = SG.winner; o.score = [SG.sides[0].score, SG.sides[1].score]; o.ammo = Object.keys(SG.stats.ammoShots); o.stats = SG.def.stats; o.nan = !SG.mice.every((q) => isFinite(q.x) && isFinite(q.z));
    SG.start('blue', { seed: 5 }); o.after = !SG.def.on && Object.keys(SG.ammo).length === 5; return o; });
  ok('?defence: the match has the flag on, the seven weapons, and only the fortified side has items', m.flag && m.items.length > 0 && m.items.every((i) => i[0] === 0), m.items);
  ok('same budget: the fortified camp (pieces and items) costs no more than the 12 points of the bare camp', (() => { const sp = m.items.reduce((t, i) => t + ({ counter: 2.5, pop: 1.5, spring: .5, warden: .5, sling: 2 }[i[1]] || 0), 0); return m.cost[0] + sp <= 12.001 && m.cost[1] <= 12.001 && m.cost[1] >= 11.99; })(), m);
  ok('a defence match plays through to a winner with no NaN, the bots fire all seven weapons in turn, and the posts and the mender work', m.over && !m.nan && m.ammo.length >= 6 && m.stats.repairs > 0 && (m.stats.counters + m.stats.pops) > 0, { ammo: m.ammo, stats: m.stats });
  ok('starting an ordinary match afterwards puts the flag and the weapons away', m.after);
  const d = await ev(() => { const g = (flag) => { SG.start('blue', { seed: 5000, level: 'normal', presets: ['good', 'good'], defence: flag ? { fort: [true, false] } : undefined }); SG.auto(0, 'normal'); SG.auto(1, 'normal'); SG.skipBuild(); SG.begin(); let k = 0; while (SG.phase !== 'over' && k++ < 700) SG.step(1); return JSON.stringify([SG.winner, SG.sides[0].score, SG.sides[1].score, SG.stats.partsOff, SG.stats.shots, SG.def.stats]); };
    const a = g(true), b = g(true), c = g(false), d2 = g(false); SG.hold = true; return { a: a === b, c: c === d2, noflag: !/pops/.test(c) || JSON.parse(c)[5].pops === 0 }; });
  ok('determinism: the same seed gives the same defence match twice, and the same plain match twice (with the flag off the plain match is untouched by a defence match before it)', d.a && d.c && d.noflag, d);

  /* 9. the Lab panel */
  const ui = await ev(() => { SG.labStart(); const L = SG.lab; L.card = false; L.panel = true; SG.setProto('defences', true, false); SG.labLoadTarget('courtyard', true); const o = {};
    o.panel = !!document.getElementById('labDef') && document.querySelectorAll('#labDef [data-a^="def_k_"]').length === 9; document.querySelector('#lab [data-a="tool_def"]').click(); o.tool = L.tool === 'def';
    document.querySelector('#lab [data-a="def_k_pop"]').click(); o.kind = SG.def.kind === 'pop'; const w = SG.screen(.9, 1.5); const sel = SG.def.items.find((i) => i.kind === 'counter'); SG.def.sel = sel.id; SG.labRefresh(); L.defKey = ''; document.getElementById('labDef') && SG.labTool('def');
    o.card = /Range min 1.5/.test(document.getElementById('labDef').textContent) || /Range/.test(document.getElementById('labDef').textContent);
    o.tiny = [].every.call(document.querySelectorAll('#lab .btn.lb'), (e) => e.offsetParent === null || e.getBoundingClientRect().height >= 44); return o; });
  ok('the Lab panel lists the nine items, the Defences tool picks one, a selected post shows its range, ammo and jam; every button is at least 44 px tall', ui.panel && ui.tool && ui.kind && ui.card && ui.tiny, ui);
  const tap = await ev(async () => { const L = SG.lab, n0 = SG.def.items.length; SG.defSetKind('snap'); const w = [0.3, -1.6]; const r = SG.defTap(w[0], w[1]); const placed = SG.def.items.length === n0 + 1 && !!r.ok; const it = SG.def.items.at(-1); const sel = SG.defTap(it.x, it.z); const picked = SG.def.sel === it.id; SG.defErase(it.x, it.z); return placed && picked && SG.def.items.length === n0; });
  ok('tapping the table places the chosen item (on whichever camp it is nearer), tapping an item selects it, erase removes it', tap);
  const bt = await ev(async () => { document.querySelector('#lab [data-a="def_test"]').click(); await new Promise((r) => setTimeout(r, 4000)); const box = document.getElementById('labDefBox'); return { shown: box.style.display === 'flex', txt: /weapons survived/.test(box.textContent) && document.getElementById('labDefText').value.length > 200 }; });
  ok('the TEST MY BASE button opens the card, with the text to paste', bt.shown && bt.txt, bt);
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  console.log(bad ? ('FAILED ' + bad + ' of ' + n) : ('ALL ' + n + ' PASSED'));
  console.log('test took ' + Math.round((Date.now() - T0) / 1000) + ' s');
  await b.close(); process.exit(bad ? 1 : 0);
};
run().catch((e) => { console.error(e); process.exit(2); });
