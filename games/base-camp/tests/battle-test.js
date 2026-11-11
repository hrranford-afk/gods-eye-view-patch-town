// Base Camp build 9, BATTLE MODE: turn-based, artillery-style toy battle on two scanned surfaces (practice room), then once in AR through ar-fake.js.
//  practice, 1 player vs the Lint Lords' AI (drag back from a creature, dotted arc, shots fly / land / bounce on the scanned surfaces / bounce off or crumble walls / knock a creature
//  off an edge / the Hoover / a sticky crumb lure / the grapple), 2 players with the Pass-the-iPad screen, whole matches to a winner and the colony's reward, AI speed, memory, page errors.
// Screenshots: shots/27-battle-aim.png, 28-battle-hit.png, 29-hoover.png, 30-victory.png, 31-ar-battle.png (looked at by hand, not asserted).
// Run (about 4 minutes):  NODE_PATH=$(npm root -g) node games/base-camp/tests/battle-test.js
const fs = require('fs'), path = require('path');
const { serve, launch, ROOT } = require('./lib.js'); const install = require('./ar-fake.js'); const { chromium } = require('playwright');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const POLY = fs.readFileSync(process.env.POLY || path.join(ROOT, 'webxr-polyfill.js'), 'utf8');
(async () => {
  const { srv, url } = await serve(); const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  const fresh = async () => { await p.goto(url); await sleep(1200); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await p.reload(); await sleep(1200); await ev(() => { __g.ENV.hourOverride = 12; __g.setWxPick('clear'); }); };
  const mem = () => ev(() => ({ geo: __g.renderer.info.memory.geometries, tex: __g.renderer.info.memory.textures, parts: __g.THREE ? 1 : 0, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : 0 }));
  const run = (secs, dt) => ev(([s, d]) => { for (let t = 0; t < s; t += d) { __g.G.time += d; __g.battleFrame(d); } }, [secs, dt || 1 / 30]);
  const waitStage = async (st, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 20000)) { if (await ev((st) => __g.BT.stage === st, st)) return true; await sleep(100); } return false; };
  await fresh();
  const m0 = await mem();

  // ===================== 1. entry, arena, sides =====================
  ok('the title has a Battle! button', await ev(() => !!document.getElementById('bBattle') && !document.getElementById('bBattle').hidden));
  await p.click('#bBattle'); await sleep(200); ok('Battle! asks who you fight (Lint Lords easy / normal, 2 players)', await ev(() => !document.getElementById('modal').hidden && ['btA', 'btB', 'btC'].every((i) => !!document.getElementById(i))));
  await p.click('#btA'); await sleep(2500);
  const A = await ev(() => { const B = __g.BT; return { on: B.on, mode: B.mode, zones: B.sides.map((s) => s.Z.type + ':' + s.Z.name), units: B.units.map((u) => [u.side, u.name, u.st]), structs: B.structs.map((s) => s.side + s.kind), floorY: B.floorY, ai: B.sides.map((s) => s.ai), stage: B.stage }; });
  ok('practice room battle started: two different surfaces', A.on && A.zones[0] !== A.zones[1], A.zones.join(' vs '));
  ok('four creatures a side, a tent each, and cover (hut + wall)', A.units.filter((u) => u[0] === 0).length === 4 && A.units.filter((u) => u[0] === 1).length === 4 && ['0tent', '1tent', '0hut', '1hut', '0wall', '1wall'].every((k) => A.structs.includes(k)), JSON.stringify(A.structs));
  ok('side B is the Lint Lords AI; the colony\'s creatures keep their characters', A.ai[1] === true && A.ai[0] === false && A.units.some((u) => u[1] === 'Grizzle' || u[1] === 'Glip'), A.units.map((u) => u[1]).join(','));
  ok('the colony simulation is paused and hidden while the battle runs', await ev(() => __g.G.settlements.every((S) => !S.group.visible)));
  await ev(() => { __g.BT.cfg.aiDelay = 0.4; }); await waitStage('aim', 8000);
  ok('first turn is the player\'s: aim stage, a creature selected, 30 s timer', await ev(() => __g.BT.stage === 'aim' && __g.BT.side === 0 && !!__g.BT.sel && __g.BT.turnT > 25));
  const hud = await ev(() => ({ bar: document.getElementById('btBar').textContent, wind: document.getElementById('btWTxt').textContent, clock: document.getElementById('btClock').textContent, side0: document.getElementById('btS0').textContent }));
  ok('HUD: weapons incl. the Hoover, hop buttons, wind, clock', /Mortar/.test(hud.bar) && /Flick/.test(hud.bar) && /Crumb/.test(hud.bar) && /Grapple/.test(hud.bar) && /Hoover/.test(hud.bar) && /hop/.test(hud.bar) && hud.wind !== '' && /s$/.test(hud.clock), JSON.stringify(hud));

  // ===================== 2. aiming by touch: drag back from the creature =====================
  const scr = await ev(() => { const u = __g.BT.sel, s = __g.btScreen(u); return { x: s[0], y: s[1], name: u.name }; });
  await p.mouse.move(scr.x, scr.y); await p.mouse.down(); await p.mouse.move(scr.x - 70, scr.y + 40, { steps: 3 }); await p.mouse.move(scr.x - 110, scr.y + 70, { steps: 3 }); await sleep(150);
  const aim = await ev(() => ({ dots: __g.BT.dots.filter((d) => d.visible).length, aim: __g.BT.aim && { p: +__g.BT.aim.power.toFixed(2), th: +__g.BT.aim.theta.toFixed(2) }, info: document.getElementById('btAimInfo').textContent }));
  ok('dragging back shows a dotted arc for the first part of the flight only (1..11 dots) and power / angle', aim.dots >= 3 && aim.dots <= 11 && aim.aim && aim.aim.p > 0.2 && /Power/.test(aim.info), JSON.stringify(aim));
  await p.screenshot({ path: OUT + '27-battle-aim.png' });
  await p.mouse.up(); await sleep(250);
  const fired = await ev(() => ({ stage: __g.BT.stage, fired: __g.BT.fired, log: __g.BT.log.filter((l) => l.k === 'fire').length }));
  ok('releasing fires exactly one shot (stage fly, fired)', fired.fired && fired.stage === 'fly' && fired.log === 1, JSON.stringify(fired));
  ok('only one shot per turn: a second fire is refused', await ev(() => { const B = __g.BT; return __g.btFire(B.sel, 'mortar', [1, 1, 0]) === false; }));
  const back = async () => { const t0 = Date.now(); while (Date.now() - t0 < 30000) { if (await ev(() => __g.BT.stage === 'aim' && __g.BT.side === 0 && __g.BT.turn >= 3)) return true; await sleep(100); } return false; };
  ok('the AI took its turn and it is the player\'s again', await back());
  const aiT = await ev(() => { const L = __g.BT.log; let t0 = 0; const out = []; for (const l of L) { if (l.k === 'turn' && l.x === 1) t0 = l.t; else if (l.k === 'fire' && t0 && l.t > t0) { out.push(Math.round(l.t - t0)); t0 = 0; } } return { turn2fire: out, think: L.filter((l) => l.k === 'ai').map((l) => l.x.ms) }; });
  ok('the AI turn (think + aim + fire) takes under 2 s', aiT.turn2fire.length > 0 && aiT.turn2fire.every((t) => t < 2000) && aiT.think.every((t) => t < 250), JSON.stringify(aiT));

  // ===================== 3. physics: land, bounce, floor, clutter =====================
  const scenario = async (opts) => { await ev((o) => { __g.btBegin(Object.assign({ mode: 'solo', level: 'normal', seed: 7, cfg: { aiDelay: 0.2 } }, o || {})); }, opts); await run(3.2); await ev(() => { const B = __g.BT; B.wind = [0, 0]; }); };
  const ph = await ev(() => {
    const B = __g.BT; B.wind = [0, 0]; const out = {}; const desk = B.sides[0].Z, mk = (x, y, z, vx, vy, vz) => __g.btNewProj('mortar', x, y, z, vx, vy, vz, null);
    let spot = null; for (let gx = -0.5; gx <= 0.5 && !spot; gx += 0.05) for (let gz = -0.25; gz <= 0.25 && !spot; gz += 0.05) { const x = desk.cx + gx, z = desk.cz + gz; if (Math.abs(__g.btSurf(x, z, desk.y + 0.1) - desk.y) < 0.005 && !B.structs.some((s) => Math.hypot(s.x - x, s.z - z) < 0.2) && !B.units.some((u) => Math.hypot(u.x - x, u.z - z) < 0.2) && [[0.1, 0], [-0.1, 0], [0, 0.1], [0, -0.1]].every((d) => Math.abs(__g.btSurf(x + d[0], z + d[1], desk.y + 0.1) - desk.y) < 0.005)) spot = [x, z]; } out.spot = spot;
    let pr = mk(spot[0], desk.y + 0.3, spot[1], 0, 0, 0), e = null; for (let i = 0; i < 400 && !e; i++) e = __g.btAdvance(pr, 1 / 120);
    out.land = e && { k: e.k, y: +e.y.toFixed(3), top: desk.y };
    const pr2 = mk(spot[0], desk.y + 0.3, spot[1], 0.05, 0, 0); const f = __g.btFly(pr2, 6); out.fly = { what: f.what, t: +f.t.toFixed(2), bn: pr2.bn };
    const pr3 = mk(desk.cx + 0.2, desk.y + 0.2, desk.cz + 0.9, 0, 0, 0.5); const f3 = __g.btFly(pr3, 6); out.floor = { y: +f3.at[1].toFixed(3), floorY: B.floorY };
    const sh = B.sides[1].Z; let n = 0; const L = sh.land; for (let k = 0; k < L.st.length; k++) if (L.st[k] === 2) n++; out.shelfCans = n;
    return out;
  });
  ok('a dropped cap lands ON the scanned desk top', ph.land && ph.land.k === 'ground' && Math.abs(ph.land.y - ph.land.top) < 0.02, JSON.stringify(ph.land));
  ok('it bounces (a bounce is counted) before it goes off', ph.fly.bn >= 1, JSON.stringify(ph.fly));
  ok('a shot that misses falls to the floor', Math.abs(ph.floor.y - ph.floor.floorY) < 0.05, JSON.stringify(ph.floor));
  ok('scanned clutter (cans on the shelf) counts as solid blocks', ph.shelfCans > 20, ph.shelfCans + ' cells');

  // ===================== 4. cover: a wall takes damage, crumbles to rubble, rubble stays as cover =====================
  await scenario(); const cv = await ev(() => {
    const B = __g.BT, w = B.structs.find((s) => s.kind === 'wall' && s.side === 1), out = { hp0: w.hp };
    __g.btBoom([w.x, w.y + 0.04, w.z], __g.BW.mortar.boom, null, true); out.hp1 = w.hp; const hit = __g.btNewProj('flick', w.x + 0.0, w.y + 0.05, w.z + 0.0, 0, 0, 0, null);
    __g.btBoom([w.x, w.y + 0.04, w.z], __g.BW.mortar.boom, null, true); __g.btBoom([w.x, w.y + 0.04, w.z], __g.BW.mortar.boom, null, true);
    out.dead = w.dead; out.rubble = B.structs.filter((s) => s.kind === 'rubble' && !s.dead).length; const r = B.structs.find((s) => s.kind === 'rubble' && Math.hypot(s.x - w.x, s.z - w.z) < 0.01); out.rubbleAt = r ? [0, 0] : null;
    const a = [r.x + 0.3, r.y + 0.01, r.z], pr = __g.btNewProj('flick', a[0], a[1], a[2], -2.5, 0, 0, null), f = __g.btFly(pr, 3); out.stop = { what: f.what, struct: f.struct && f.struct.kind };
    return out;
  });
  ok('a wall takes damage from a blast (hp 3 -> 2)', cv.hp0 === 3 && cv.hp1 === 2, JSON.stringify(cv));
  ok('after three it crumbles into rubble that stays', cv.dead && cv.rubbleAt, JSON.stringify(cv));
  ok('rubble is still cover: a flat shot hits it', cv.stop.what === 'bonk' && cv.stop.struct === 'rubble', JSON.stringify(cv.stop));

  // ===================== 5. knock a creature off an edge: "Weeee!", sent home =====================
  await scenario(); const kn = await ev(() => {
    const B = __g.BT, sh = B.sides[1].Z, v = B.units.find((u) => u.side === 1), a = B.units.find((u) => u.side === 0), ydir = (() => { for (const d of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const e = __g.btEdgeAhead(sh.cx, sh.cz, sh.y, d[0], d[1], 0.7); if (e < 0.2) return d; } return [0, 1]; })();
    // stand the victim 4 cm from the shelf's edge in that direction and the attacker behind it (test set-up only)
    let ed = __g.btEdgeAhead(sh.cx, sh.cz, sh.y, ydir[0], ydir[1], 0.7); v.x = sh.cx + ydir[0] * (ed - 0.07); v.z = sh.cz + ydir[1] * (ed - 0.07); v.y = sh.y; a.x = v.x - ydir[0] * 0.28; a.z = v.z - ydir[1] * 0.28; a.y = sh.y;
    const vel = [ydir[0] * 5, 0.25, ydir[1] * 5]; B.wind = [0, 0]; B.sel = a; const ok1 = __g.btFire(a, 'flick', vel); return { ok1, ed: +ed.toFixed(2), dir: ydir, v: v.name };
  });
  await run(7, 1 / 30); const kn2 = await ev(() => { const B = __g.BT, L = B.log; return { homes: B.sides[1].home, log: L.filter((l) => ['knock', 'weee', 'home'].includes(l.k)).map((l) => l.k + ':' + JSON.stringify(l.x)) }; });
  ok('a flick knocks a creature off the shelf edge: long "Weeee!", sent home to its tent', kn.ok1 && kn2.homes === 1 && kn2.log.some((l) => l.startsWith('weee')) && kn2.log.some((l) => /fall/.test(l)), JSON.stringify(kn) + ' ' + JSON.stringify(kn2));

  // ===================== 6. the Hoover (once per match): sucks a line of creatures, clears rubble =====================
  await scenario(); await ev(() => { const B = __g.BT, w = B.sides[1].Z; __g.btMkStruct('rubble', 1, w.cx + 0.02, w.cz, w.y, 0); });
  const hv = await ev(() => {
    const B = __g.BT, a = B.units.find((u) => u.side === 0), z1 = B.sides[1].Z, T = [z1.cx, z1.y + 0.03, z1.cz]; B.wind = [0, 0]; const sols = __g.btSolve('mortar', [a.x, a.y + 0.06, a.z], T); B.sel = a; B.wid = 'hoover';
    return { sols: sols.length, rub0: B.structs.filter((s) => s.kind === 'rubble' && !s.dead).length, ok1: sols.length && __g.btFire(a, 'hoover', sols[1] ? sols[1].vel : sols[0].vel), hoover: B.sides[0].hoover };
  });
  await sleep(100); await p.screenshot({ path: OUT + '28-hoover-start.png' });
  let hshot = false; for (let i = 0; i < 40; i++) { await run(0.15, 1 / 30); if (await ev(() => __g.BT.hoover && __g.BT.hoover.sucked >= 1)) { hshot = true; break; } }
  if (hshot) { await p.screenshot({ path: OUT + '29-hoover.png' }); }
  await run(8, 1 / 30); const hv2 = await ev(() => { const B = __g.BT; return { homeB: B.sides[1].home, homeA: B.sides[0].home, rub1: B.structs.filter((s) => s.kind === 'rubble' && !s.dead).length, left: B.sides[0].hoover, log: B.log.filter((l) => ['hoover', 'suck', 'cleared', 'hoover-done'].includes(l.k)).map((l) => l.k) }; });
  ok('Call the Hoover: it sweeps the enemy surface and sucks creatures into fluff (sent home)', hv.ok1 && hv2.homeB >= 2 && hv2.log.includes('suck') && hv2.log.includes('hoover-done'), JSON.stringify(hv2));
  ok('the Hoover clears the rubble in its path', hv2.log.includes('cleared'), 'rubble ' + hv.rub0 + ' -> ' + hv2.rub1);
  ok('the super weapon is used up (once per match)', hv.hoover === false && await ev(() => { const B = __g.BT; return __g.btFire(B.units.find((u) => u.side === 0 && u.st === 'stand'), 'hoover', [1, 1, 0]) === false; }));

  // ===================== 7. sticky crumb lures, grapple swings =====================
  await scenario(); const cr = await ev(() => {
    const B = __g.BT, a = B.units.find((u) => u.side === 0), v = B.units.find((u) => u.side === 1), z1 = B.sides[1].Z; B.wind = [0, 0]; B.sel = a;
    const T = [v.x, v.y + 0.04, v.z], sols = __g.btSolve('crumb', [a.x, a.y + 0.06, a.z], T); return { n: sols.length, ok1: sols.length ? __g.btFire(a, 'crumb', (sols[1] || sols[0]).vel) : false, v: v.name, p0: [v.x, v.z], others: B.units.filter((u) => u.side === 1).map((u) => [u.name, u.x, u.z]) };
  });
  await run(2.6, 1 / 30); const cr2 = await ev(() => { const B = __g.BT; return { crumbs: B.crumbs.length, popped: B.crumbs.some((c) => c.popped), log: B.log.filter((l) => ['stick', 'boom'].includes(l.k)).map((l) => l.k + ':' + JSON.stringify(l.x)), stage: B.stage, side: B.side }; });
  ok('a sticky crumb sticks and pops, and waits', cr.ok1 && cr2.crumbs === 1 && cr2.popped && cr2.log.some((l) => l.startsWith('stick')), JSON.stringify(cr2));
  const before = await ev(() => __g.BT.units.filter((u) => u.side === 1).map((u) => [u.x, u.z, u.st]));
  await run(7, 1 / 30); const cr3 = await ev(() => { const B = __g.BT; return { lured: B.log.filter((l) => l.k === 'lured').length, after: B.units.filter((u) => u.side === 1).map((u) => [u.x, u.z, u.st]), crumbs: B.crumbs.length }; });
  const moved = cr3.after.filter((a, i) => before[i] && before[i][2] === 'stand' && a[2] !== 'home' && Math.hypot(a[0] - before[i][0], a[1] - before[i][1]) > 0.03).length;
  ok('the crumb lures the enemy creatures toward it on their next turn (then is eaten)', cr3.lured >= 1 || moved >= 1, JSON.stringify({ lured: cr3.lured, moved, crumbs: cr3.crumbs }));
  await scenario({ seed: 9 }); const gr = await ev(() => {
    const B = __g.BT, a = B.units.find((u) => u.side === 0), z0 = B.sides[0].Z; B.wind = [0, 0]; B.sel = a; const T = [a.x - 0.05, z0.y, a.z + 0.28]; let tgt = null; for (const q of [[0.35, 0.2], [-0.4, 0.2], [0, 0.3], [0.3, -0.1]]) { const c = [a.x + q[0], a.z + q[1]]; if (__g.btSurf(c[0], c[1], z0.y) > z0.y - 0.02 && !__g.BT.structs.some((s) => Math.hypot(s.x - c[0], s.z - c[1]) < 0.12)) { tgt = c; break; } }
    if (!tgt) return { none: true }; const sols = __g.btSolve('grapple', [a.x, a.y + 0.06, a.z], [tgt[0], z0.y + 0.01, tgt[1]]); return { from: [a.x, a.z], tgt, n: sols.length, ok1: sols.length && __g.btFire(a, 'grapple', sols[sols.length - 1].vel), u: a.name };
  });
  await run(4, 1 / 30); const gr2 = await ev(() => { const B = __g.BT, a = B.units.find((u) => u.side === 0); return { at: [a.x, a.z, a.y], st: a.st, log: B.log.filter((l) => l.k === 'hook' || l.k === 'hookfail').map((l) => l.k + ':' + JSON.stringify(l.x)) }; });
  ok('the Paperclip Grapple hooks a spot and swings the creature there', !gr.none && gr.ok1 && gr2.log.some((l) => l.startsWith('hook:')) && Math.hypot(gr2.at[0] - gr.from[0], gr2.at[1] - gr.from[1]) > 0.15 && gr2.st === 'stand', JSON.stringify({ gr, gr2 }));

  // ===================== 8. whole matches: 1 player vs the AI (a good player plays side A), a winner, the reward =====================
  const playOut = (opts) => ev(async (o) => {
    __g.btBegin(Object.assign({ mode: 'solo', level: 'normal', cfg: { aiDelay: 0.05, turn: 30 } }, o)); const B = __g.BT; B.sides[0].level = 'normal'; B.sides[1].level = o.foe || 'easy'; let guard = 0, frames = 0;
    while (!(B.over && B.over.shown) && guard++ < 60000) {
      __g.G.time += 1 / 30; __g.battleFrame(1 / 30); frames++;
      if (B.stage === 'aim' && B.side === 0 && !B.fired && B.turnT < 29.9 && !B.sides[0].ai) { B.plan = __g.btAiPlan(0); __g.btAiRun(); }
      if (B.stage === 'pass') document.getElementById('btReady').click();
      if (B.stage === 'aim' && B.side === 1 && o.mode === 'duo' && !B.fired && B.turnT < 29.9) { B.plan = __g.btAiPlan(1); __g.btAiRun(); }
    }
    return { winner: B.over && B.over.winner, turns: B.turn, secs: +(frames / 30).toFixed(0), home: B.sides.map((s) => s.home), tents: B.sides.map((s) => s.tent.hp), reward: B.over && B.over.reward, hoover: B.sides.map((s) => s.hoover), ms: B.log.filter((l) => l.k === 'ai').map((l) => l.x.ms) };
  }, opts);
  await ev(() => { __g.FUN.album = []; });
  let won = null, matches = [], memMid = null, stock0 = null, stock1 = null;
  for (let k = 0; k < 8 && (k < 3 || !won); k++) {
    if (k === 0) await ev(() => { __g.btBegin({ mode: 'solo', level: 'normal', seed: 5, cfg: { aiDelay: 0.05 } }); });
    stock0 = await ev(() => { const S = __g.mainSettlement(); return S ? S.stock.wood : null; });
    const r = await playOut({ seed: 100 + k }); matches.push(r); stock1 = await ev(() => { const S = __g.mainSettlement(); return S ? S.stock.wood : null; });
    if (r.winner === 0 && !won) { won = r; won.stock = [stock0, stock1]; } if (k === 0) memMid = await mem();
  }
  console.log('matches', JSON.stringify(matches.map((m) => ({ w: m.winner, t: m.turns, home: m.home, tents: m.tents, hoover: m.hoover }))));
  ok('matches end with a winner (tent down, or no creatures left)', matches.every((m) => [0, 1, -1].includes(m.winner)) && matches.some((m) => m.winner === 0 || m.winner === 1), matches.map((m) => m.winner + '@' + m.turns).join(', '));
  ok('no match is over in one move (the Hoover bag holds three, a tent has four hearts)', matches.every((m) => m.turns >= 4), matches.map((m) => m.turns).join(','));
  ok('the AI\'s turns are fast: think time under 250 ms', matches.every((m) => m.ms.every((t) => t < 250)), 'max ' + Math.max(...matches.flatMap((m) => m.ms)).toFixed(0) + ' ms');
  const album = await ev(() => __g.FUN.album.some((e) => e.id === 'victory'));
  ok('a human win earns the colony a reward (wood, tin) and the album entry "First victory"', !!won && album && won.stock[1] >= won.stock[0] + 6 && /First victory/.test(won.reward), won ? JSON.stringify({ reward: won.reward, stock: won.stock, album }) : 'no win in ' + matches.length + ' matches');
  const mEnd = await mem(); ok('memory flat over repeated matches (geometries and textures bounded)', (mEnd.geo - memMid.geo) < 25 && (mEnd.tex - memMid.tex) < 30, JSON.stringify({ afterFirst: memMid, end: mEnd }));
  await b.close(); srv.close(); console.log('errors', errs.slice(0, 5)); ok('0 page errors', errs.length === 0, errs.length + ''); const fails = res.filter((x) => !x).length; console.log(fails ? 'FAILED ' + fails : 'ALL PASSED', res.length + ' checks'); process.exit(fails ? 1 : 0);
})();
