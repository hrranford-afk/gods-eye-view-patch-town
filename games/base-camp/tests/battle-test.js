// Base Camp build 10, BATTLE MODE: turn-based, artillery-style toy battle on two scanned surfaces (practice room), then once in AR through ar-fake.js.
//  build 10: the council's rivals (picker), weapons, the Oops bridge, wobble from music / a speaker, rugs, the earned Hoover, dizzy first hits, the 30-turn limit, Crown / Ribbon / rebuilt tent endings, knock-out lines, the credits panel, a perfect-aim AI match length check.
//  practice, 1 player vs the Lint Lords' AI (drag back from a creature, dotted arc, shots fly / land / bounce on the scanned surfaces / bounce off or crumble walls / knock a creature
//  off an edge / the Hoover / a sticky crumb lure / the grapple), 2 players with the Pass-the-iPad screen, whole matches to a winner and the colony's reward, AI speed, memory, page errors.
// Screenshots: shots/27-battle-aim.png, 28-battle-hit.png, 29-hoover.png, 30-victory.png, 31-ar-battle.png, 32-rivals.png, 33-weapons.png, 34-oops-bridge.png, 35-ending.png (looked at by hand, not asserted).
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
  const waitAr = async (qe, st) => { const t0 = Date.now(); while (Date.now() - t0 < 20000) { if (await qe((st) => __g.BT.stage === st, st)) return true; await sleep(200); } return false; };
  const waitArSide = async (qe, side) => { const t0 = Date.now(); while (Date.now() - t0 < 30000) { if (await qe((side) => __g.BT.stage === 'aim' && __g.BT.side === side && !__g.BT.fired, side)) return true; await sleep(150); } return false; };
  const run = (secs, dt) => ev(([s, d]) => { for (let t = 0; t < s; t += d) { __g.G.time += d; __g.battleFrame(d); } }, [secs, dt || 1 / 30]);
  const waitStage = async (st, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 20000)) { if (await ev((st) => __g.BT.stage === st, st)) return true; await sleep(100); } return false; };
  await fresh();
  const m0 = await mem();

  // ===================== 1. entry, arena, sides =====================
  ok('the title has a Battle! button', await ev(() => !!document.getElementById('bBattle') && !document.getElementById('bBattle').hidden));
  await p.click('#bBattle'); await sleep(200); ok('Battle! asks who you fight (a rivals picker, easy / normal, 2 players, music, the council\'s ideas)', await ev(() => !document.getElementById('modal').hidden && ['btA', 'btB', 'btC', 'btMusC', 'btIdeas'].every((i) => !!document.getElementById(i)) && document.querySelectorAll('#btRivals .rvc').length === 5));
  await p.click('#btA'); await sleep(2500);
  const A = await ev(() => { const B = __g.BT; return { on: B.on, mode: B.mode, zones: B.sides.map((s) => s.Z.type + ':' + s.Z.name), units: B.units.map((u) => [u.side, u.name, u.st, u.ck]), structs: B.structs.map((s) => s.side + s.kind), floorY: B.floorY, ai: B.sides.map((s) => s.ai), stage: B.stage }; });
  ok('practice room battle started: two different surfaces', A.on && A.zones[0] !== A.zones[1], A.zones.join(' vs '));
  ok('four creatures a side, a tent each, and cover (hut + wall)', A.units.filter((u) => u[0] === 0).length === 4 && A.units.filter((u) => u[0] === 1).length === 4 && ['0tent', '1tent', '0hut', '1hut', '0wall', '1wall'].every((k) => A.structs.includes(k)), JSON.stringify(A.structs));
  ok('side B is the Lint Lords AI; the colony\'s creatures keep their characters', A.ai[1] === true && A.ai[0] === false && A.units.filter((u) => u[0] === 0).every((u) => ['Glip', 'Grizzle', 'Glimmerfluff', 'Gloop', 'Fluffflur', 'Scout'].includes(u[3])) && A.units.some((u) => u[1] === 'Lord Fuzzbucket'), A.units.map((u) => u[1] + '/' + u[3]).join(','));
  ok('the colony simulation is paused and hidden while the battle runs', await ev(() => __g.G.settlements.every((S) => !S.group.visible)));
  await waitStage('aim', 8000); // the AI keeps its normal 0.95 s thinking time here: its whole turn is timed below
  ok('first turn is the player\'s: aim stage, a creature selected, 30 s timer', await ev(() => __g.BT.stage === 'aim' && __g.BT.side === 0 && !!__g.BT.sel && __g.BT.turnT > 25));
  const hud = await ev(() => ({ bar: document.getElementById('btBar').textContent, wind: document.getElementById('btWTxt').textContent, clock: document.getElementById('btClock').textContent, side0: document.getElementById('btS0').textContent }));
  ok('HUD: the six council weapons plus the Hoover (a dust meter), hop buttons, wind, clock, turn counter', /Bomber/.test(hud.bar) && /Band/.test(hud.bar) && /Tea/.test(hud.bar) && /Clips/.test(hud.bar) && /Sock/.test(hud.bar) && /Tape/.test(hud.bar) && /0%/.test(hud.bar) && /hop/.test(hud.bar) && hud.wind !== '' && /s$/.test(hud.clock) && /Turn 1\/30/.test(await ev(() => document.getElementById('btTurn').textContent)), JSON.stringify(hud));

  // ===================== 2. aiming by touch: drag back from the creature =====================
  const scr = await ev(() => { const u = __g.BT.sel, s = __g.btScreen(u); return { x: s[0], y: s[1], name: u.name }; });
  await p.mouse.move(scr.x, scr.y); await p.mouse.down(); await p.mouse.move(scr.x + 70, scr.y + 40, { steps: 3 }); await p.mouse.move(scr.x + 110, scr.y + 70, { steps: 3 }); await sleep(150);
  const aim = await ev(() => ({ dots: __g.BT.dots.filter((d) => d.visible).length, aim: __g.BT.aim && { p: +__g.BT.aim.power.toFixed(2), th: +__g.BT.aim.theta.toFixed(2) }, info: document.getElementById('btAimInfo').textContent }));
  ok('dragging back shows a dotted arc for the first part of the flight only (1..11 dots) and power / angle', aim.dots >= 3 && aim.dots <= 11 && aim.aim && aim.aim.p > 0.2 && /Power/.test(aim.info), JSON.stringify(aim));
  await p.screenshot({ path: OUT + '27-battle-aim.png' });
  await p.mouse.up(); await sleep(250);
  const fired = await ev(() => ({ stage: __g.BT.stage, fired: __g.BT.fired, log: __g.BT.log.filter((l) => l.k === 'fire').length }));
  ok('releasing fires exactly one shot (stage fly, fired)', fired.fired && fired.stage === 'fly' && fired.log === 1, JSON.stringify(fired));
  ok('only one shot per turn: a second fire is refused', await ev(() => { const B = __g.BT; return __g.btFire(B.sel, 'bomber', [1, 1, 0]) === false; }));
  const back = async () => { const t0 = Date.now(); while (Date.now() - t0 < 30000) { if (await ev(() => __g.BT.stage === 'aim' && __g.BT.side === 0 && __g.BT.turn >= 3)) return true; await sleep(100); } return false; };
  ok('the AI took its turn and it is the player\'s again', await back());
  const aiT = await ev(() => { const L = __g.BT.log; let t0 = 0; const out = []; for (const l of L) { if (l.k === 'turn' && l.x === 1) t0 = l.t; else if (l.k === 'fire' && t0 && l.t > t0) { out.push(Math.round(l.t - t0)); t0 = 0; } } return { turn2fire: out, think: L.filter((l) => l.k === 'ai').map((l) => l.x.ms) }; });
  ok('the AI turn (think + aim + fire) takes under 2 s', aiT.turn2fire.length > 0 && aiT.turn2fire.every((t) => t < 2000) && aiT.think.every((t) => t < 250), JSON.stringify(aiT));

  // ===================== 3. physics: land, bounce, floor, clutter =====================
  const scenario = async (opts) => { await ev((o) => { __g.btBegin(Object.assign({ mode: 'solo', level: 'normal', seed: 7, cfg: { aiDelay: 0.2 } }, o || {})); }, opts); await run(3.2); await ev(() => { const B = __g.BT; B.wind = [0, 0]; }); };
  const ph = await ev(() => {
    const B = __g.BT; B.wind = [0, 0]; const out = {}; const desk = B.sides[0].Z, mk = (x, y, z, vx, vy, vz) => __g.btNewProj('bomber', x, y, z, vx, vy, vz, null);
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
    __g.btBoom([w.x, w.y + 0.04, w.z], __g.BW.bomber.boom, null, true); out.hp1 = w.hp; const hit = __g.btNewProj('band', w.x + 0.0, w.y + 0.05, w.z + 0.0, 0, 0, 0, null);
    __g.btBoom([w.x, w.y + 0.04, w.z], __g.BW.bomber.boom, null, true); __g.btBoom([w.x, w.y + 0.04, w.z], __g.BW.bomber.boom, null, true);
    out.dead = w.dead; out.rubble = B.structs.filter((s) => s.kind === 'rubble' && !s.dead).length; const r = B.structs.find((s) => s.kind === 'rubble' && Math.hypot(s.x - w.x, s.z - w.z) < 0.01); out.rubbleAt = r ? [0, 0] : null;
    const a = [r.x + 0.3, r.y + 0.01, r.z], pr = __g.btNewProj('band', a[0], a[1], a[2], -2.5, 0, 0, null), f = __g.btFly(pr, 3); out.stop = { what: f.what, struct: f.struct && f.struct.kind };
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
    const vel = [ydir[0] * 5, 0.25, ydir[1] * 5]; B.wind = [0, 0]; B.sel = a; const ok1 = __g.btFire(a, 'band', vel); return { ok1, ed: +ed.toFixed(2), dir: ydir, v: v.name };
  });
  await run(7, 1 / 30); const kn2 = await ev(() => { const B = __g.BT, L = B.log; return { homes: B.sides[1].home, log: L.filter((l) => ['knock', 'weee', 'home'].includes(l.k)).map((l) => l.k + ':' + JSON.stringify(l.x)) }; });
  ok('a band shot knocks a creature off the shelf edge: long "Weeee!", sent home to its tent', kn.ok1 && kn2.homes === 1 && kn2.log.some((l) => l.startsWith('weee')) && kn2.log.some((l) => /fall/.test(l)), JSON.stringify(kn) + ' ' + JSON.stringify(kn2));

  // ===================== 6. the Hoover (earned from the dust meter): sucks a line of creatures, clears rubble =====================
  await scenario(); await ev(() => { const B = __g.BT, w = B.sides[1].Z; __g.btMkStruct('rubble', 1, w.cx + 0.02, w.cz, w.y, 0); });
  const hv = await ev(() => {
    const B = __g.BT, a = B.units.find((u) => u.side === 0), z1 = B.sides[1].Z, T = [z1.cx, z1.y + 0.03, z1.cz]; B.wind = [0, 0]; const sols = __g.btSolve('bomber', [a.x, a.y + 0.06, a.z], T); B.sel = a; B.wid = 'hoover'; B.sides[0].dust = 100; B.sides[0].hoover = true;
    return { sols: sols.length, rub0: B.structs.filter((s) => s.kind === 'rubble' && !s.dead).length, ok1: sols.length && __g.btFire(a, 'hoover', sols[1] ? sols[1].vel : sols[0].vel), hoover: B.sides[0].hoover };
  });
  await sleep(100); await p.screenshot({ path: OUT + '28-hoover-start.png' });
  let hshot = false; for (let i = 0; i < 40; i++) { await run(0.15, 1 / 30); if (await ev(() => __g.BT.hoover && __g.BT.hoover.sucked >= 1)) { hshot = true; break; } }
  if (hshot) { await p.screenshot({ path: OUT + '29-hoover.png' }); }
  await run(8, 1 / 30); const hv2 = await ev(() => { const B = __g.BT; return { homeB: B.sides[1].home, homeA: B.sides[0].home, rub1: B.structs.filter((s) => s.kind === 'rubble' && !s.dead).length, left: B.sides[0].hoover, log: B.log.filter((l) => ['hoover', 'suck', 'cleared', 'hoover-done'].includes(l.k)).map((l) => l.k) }; });
  ok('Call the Hoover: it sweeps the enemy surface and sucks creatures into fluff (sent home)', hv.ok1 && hv2.homeB >= 2 && hv2.log.includes('suck') && hv2.log.includes('hoover-done'), JSON.stringify(hv2));
  ok('the Hoover clears the rubble in its path', hv2.log.includes('cleared'), 'rubble ' + hv.rub0 + ' -> ' + hv2.rub1);
  ok('the Hoover empties the dust meter: it must be earned again', hv.hoover === false && await ev(() => __g.BT.sides[0].dust === 0) && await ev(() => { const B = __g.BT; return __g.btFire(B.units.find((u) => u.side === 0 && u.st === 'stand'), 'hoover', [1, 1, 0]) === false; }));

  // ===================== 7. the Tape-Toss: a Tape Bridge moves a friendly creature =====================
  await scenario({ seed: 9 }); const gr = await ev(() => {
    const B = __g.BT, a = B.units.find((u) => u.side === 0), z0 = B.sides[0].Z; B.wind = [0, 0]; B.sel = a; const T = [a.x - 0.05, z0.y, a.z + 0.28]; let tgt = null; for (const q of [[0.35, 0.2], [-0.4, 0.2], [0, 0.3], [0.3, -0.1]]) { const c = [a.x + q[0], a.z + q[1]]; if (__g.btSurf(c[0], c[1], z0.y) > z0.y - 0.02 && !__g.BT.structs.some((s) => Math.hypot(s.x - c[0], s.z - c[1]) < 0.12)) { tgt = c; break; } }
    if (!tgt) return { none: true }; const sols = __g.btSolve('tape', [a.x, a.y + 0.06, a.z], [tgt[0], z0.y + 0.01, tgt[1]]); return { from: [a.x, a.z], tgt, n: sols.length, ok1: sols.length && __g.btFire(a, 'tape', sols[sols.length - 1].vel), u: a.name };
  });
  await run(4, 1 / 30); const gr2 = await ev(() => { const B = __g.BT, a = B.units.find((u) => u.side === 0); return { at: [a.x, a.z, a.y], st: a.st, log: B.log.filter((l) => l.k === 'hook' || l.k === 'hookfail').map((l) => l.k + ':' + JSON.stringify(l.x)) }; });
  ok('the Tape-Toss sticks and makes a Tape Bridge: the creature moves to that spot', !gr.none && gr.ok1 && gr2.log.some((l) => l.startsWith('hook:')) && Math.hypot(gr2.at[0] - gr.from[0], gr2.at[1] - gr.from[1]) > 0.15 && gr2.st === 'stand', JSON.stringify({ gr, gr2 }));

  const playOut = (opts) => ev(async (o) => {
    __g.btBegin(Object.assign({ mode: 'solo', level: 'normal', cfg: { aiDelay: 0.05, turn: 30 } }, o)); const B = __g.BT; B.sides[0].level = 'normal'; B.sides[1].level = o.foe || 'easy'; let guard = 0, frames = 0, passes = 0;
    while (!(B.over && B.over.shown) && guard++ < 60000) {
      __g.G.time += 1 / 30; __g.battleFrame(1 / 30); frames++;
      if (B.stage === 'aim' && B.side === 0 && !B.fired && B.turnT < 29.9 && !B.sides[0].ai) { B.plan = __g.btAiPlan(0); __g.btAiRun(); }
      if (B.stage === 'pass') { passes++; document.getElementById('btReady').click(); }
      if (B.stage === 'aim' && B.side === 1 && o.mode === 'duo' && !B.fired && B.turnT < 29.9) { B.plan = __g.btAiPlan(1); __g.btAiRun(); }
    }
    return { winner: B.over && B.over.winner, passes, turns: B.turn, secs: +(frames / 30).toFixed(0), home: B.sides.map((s) => s.home), tents: B.sides.map((s) => s.tent.hp), reward: B.over && B.over.reward, hoover: B.sides.map((s) => s.hoover), ms: B.log.filter((l) => l.k === 'ai').map((l) => l.x.ms) };
  }, opts);

  // ===================== 7a. controls: hop, pick another creature, skip, the 30 s timer, leave =====================
  await scenario({ cfg: { aiDelay: 0.2, turn: 6 } }); await sleep(300);
  const c0 = await ev(() => { const u = __g.BT.sel; return { x: u.x, z: u.z, hops: __g.BT.hops, name: u.name }; });
  await p.click('#btBar button[data-hop="1"]'); await sleep(700); const c1 = await ev(() => { const u = __g.BT.sel; return { x: u.x, z: u.z, hops: __g.BT.hops, n: __g.BT.log.filter((l) => l.k === 'hop').length }; });
  ok('hop right / left moves the creature a little (about 5 cm along the screen), 3 hops a turn', Math.hypot(c1.x - c0.x, c1.z - c0.z) > 0.03 && Math.hypot(c1.x - c0.x, c1.z - c0.z) < 0.09 && c1.hops === c0.hops - 1, JSON.stringify({ c0, c1 }));
  const other = await ev(() => { const B = __g.BT, o = B.units.find((u) => u.side === 0 && u !== B.sel && u.st === 'stand'), s = __g.btScreen(o); return { x: s[0], y: s[1], name: o.name }; });
  await p.mouse.click(other.x, other.y); await sleep(500); ok('tap another of your creatures to pick it (it hops, name tag shows)', await ev((n) => __g.BT.sel.name === n, other.name));
  const tt0 = await ev(() => __g.BT.turnT); await sleep(1100); ok('the turn timer counts down (30 s default)', await ev((t0) => __g.BT.turnT < t0 - 0.8, tt0) && await ev(() => __g.BT.cfg.turn === 6));
  await ev(() => { __g.BT.drag = null; }); await sleep(5800); const to = await ev(() => ({ side: __g.BT.side, stage: __g.BT.stage, log: __g.BT.log.some((l) => l.k === 'timeup') }));
  ok('when the timer runs out the turn is skipped ("Time\'s up!")', to.log, JSON.stringify(to));
  await scenario({ cfg: { aiDelay: 0.2 } }); await sleep(300); await p.click('#btSkip'); await sleep(300); ok('Skip ends the turn without firing', await ev(() => __g.BT.side === 1 && __g.BT.log.filter((l) => l.k === 'fire').length === 0));
  await scenario({ cfg: { aiDelay: 0.2 } }); await p.click('#btLeave'); await sleep(200); ok('the X asks "Leave the battle?" first', await ev(() => !document.getElementById('modal').hidden && /Leave the battle/.test(document.getElementById('modal').textContent) && __g.BT.on)); await p.click('#btLv1'); await sleep(200); ok('"Keep fighting" carries on', await ev(() => __g.BT.on));

  // ===================== 7b. a direct hit: comic reaction, slow-mo, fluff, home (screenshot 28) =====================
  await scenario({ seed: 3 }); await sleep(400); const dh = await ev(() => { const B = __g.BT, a = B.units.find((u) => u.side === 0), v = B.units.find((u) => u.side === 1); B.wind = [0, 0]; B.wob = 0; B.sel = a; v.hp = 1; const sols = __g.btSolve('bomber', [a.x, a.y + 0.06, a.z], [v.x, v.y + B.uh, v.z]); return { ok1: sols.length && __g.btFire(a, 'bomber', (sols[1] || sols[0]).vel), v: v.name }; });
  let gotHit = false; for (let i = 0; i < 80; i++) { await sleep(40); if (await ev(() => __g.BT.log.some((l) => l.k === 'hit'))) { gotHit = true; break; } }
  await sleep(250); const slow = await ev(() => ({ scale: +__g.BT.timeScale.toFixed(2), slowT: +__g.BT.slowT.toFixed(2), say: __g.BT.bub.filter((b) => b.on).map((b) => b.sp.material.map && b.u.name) })); await p.screenshot({ path: OUT + '28-battle-hit-0.png' }); for (let i = 0; i < 80; i++) { await sleep(30); if (await ev(() => __g.BT.log.some((l) => l.k === 'home'))) break; } await sleep(140); await p.screenshot({ path: OUT + '28-battle-hit.png' });
  await sleep(1800); const dh2 = await ev(() => ({ home: __g.BT.sides[1].home, lines: __g.BT.log.filter((l) => l.k === 'say').map((l) => l.x) }));
  ok('a second direct hit pops the creature into fluff and sends it home (tent glows: home 1/4), in comic slow-mo, with a line in character', dh.ok1 && gotHit && dh2.home >= 1 && slow.scale < 0.9 && dh2.lines.length > 0, JSON.stringify({ slow, dh2 }));

  // ===================== 7d. the rivals picker (screenshot 32) =====================
  await ev(() => { __g.btLeave(false); }); await sleep(300); await p.click('#bMenu'); await p.click('#mBattle'); await sleep(200);
  const rv = await ev(() => { const chips = [...document.querySelectorAll('#btRivals .rvc')]; return { n: chips.length, by: chips.map((c) => c.textContent), info: document.getElementById('btRvInfo').textContent, on: chips.filter((c) => c.classList.contains('on')).map((c) => c.dataset.rv) }; });
  ok('the picker lists five rivals, the Lint-Lords selected by default, each with its "idea by" seat', rv.n === 5 && rv.on[0] === 'lint' && /The Lint-Lords/.test(rv.by[0]) && /idea by The Town Brain/.test(rv.by[0]) && /idea by The Dell Surveyor/.test(rv.by[1]) && /idea by The Radeon Coder/.test(rv.by[2]) && /idea by The Dell Reasoner/.test(rv.by[3]) && /idea by The Dell Coder/.test(rv.by[4]), JSON.stringify(rv.by));
  ok('the Lint-Lords\' own words are shown as written (made of / lives / why)', /static-charged fluff and lost hair ties/.test(rv.info) && /Top of the Bookshelf \(opposing your Speaker or Worktop\)/.test(rv.info) && /"Great Polishing Cloth of Power" \(a lonely sock\)/.test(rv.info), rv.info);
  await p.click('#btRivals [data-rv="crumble"]'); await sleep(150); await p.screenshot({ path: OUT + '32-rivals.png' });
  const riv = {}; for (const k of ['lint', 'crumble', 'snore', 'crusaders', 'grumble']) {
    await p.click('#btRivals [data-rv="' + k + '"]'); await sleep(60); const inf = await ev(() => document.getElementById('btRvInfo').textContent);
    const st = await ev((k) => { __g.btCleanup(); const ok = __g.btBegin({ mode: 'solo', level: 'easy', rival: k, seed: 3 }); const B = __g.BT, R = __g.RIVALS[k], u1 = B.units.filter((u) => u.side === 1), u0 = B.units.filter((u) => u.side === 0); return { ok, key: B.rv.key, names: u1.map((u) => u.name), side: B.sides[1].name, col: B.sides[1].col, props: u1.every((u) => u.mesh.children[0].children.length > u0[0].mesh.children[0].children.length), msg: document.getElementById('btMsg').textContent, rvName: R.name, whyOk: B.units.length === 8 }; }, k);
    riv[k] = Object.assign(st, { inf }); await ev(() => { __g.btCleanup(); }); await p.click('#bMenu'); await p.click('#mBattle'); await sleep(120);
  }
  ok('each rival can be fought: its own name, four creatures with their own names and a prop', Object.entries(riv).every(([k, v]) => v.ok && v.key === k && v.side === v.rvName && v.names.length === 4 && v.props), JSON.stringify(Object.values(riv).map((v) => [v.key, v.names.join('/'), v.props])));
  ok('every rival has its own colour', new Set(Object.values(riv).map((v) => v.col)).size === 5, Object.values(riv).map((v) => v.col.toString(16)).join(','));
  ok('the intro shows the rival\'s why-we-fight line from its answer, credited', Object.values(riv).every((v) => v.msg.includes(v.inf.split('Why they fight: ')[1].split('Look:')[0].trim().slice(0, 40)) && /idea by/.test(v.msg)), Object.values(riv).map((v) => v.msg.slice(0, 80)).join(' | '));
  ok('the Crumble Clan, Snore Squad, Crumb Crusaders and Grumble Tribe words are used as written', /Mostly biscuit crumbs and stray tea leaves, held together with sticky jam\./.test(riv.crumble.inf) && /because they can't decide who gets to snore the loudest/.test(riv.snore.inf) && /crumbs, glitter, and old snack wrappers/.test(riv.crusaders.inf) && /They think the Glip's snack stash is a conspiracy to make them all fat, so they throw crumbs and glitter to 'defend' their crumbs\./.test(riv.crusaders.inf) && /because they're tired of being squished and want more space to rumble around/.test(riv.grumble.inf));
  await p.click('#bMenu'); await p.click('#mBattle'); await sleep(150); await p.click('#btIdeas'); await sleep(150);
  const cr = await ev(() => { const t = document.getElementById('modal').textContent; return { t, n: document.querySelectorAll('#modal .cred > span').length / 2, entries: __g.COUNCIL_CREDITS.length }; });
  const seats = ['The Town Brain', 'The Dell Surveyor', 'The Radeon Coder', 'The Dell Reasoner', 'The Dell Coder', 'Musician, tiny expert', 'Toymaker, tiny expert'];
  ok('the "Ideas by the council" panel lists every idea used, each with its seat', /Ideas by the council/.test(cr.t) && cr.n === cr.entries && cr.n >= 20 && ['The Town Brain', 'The Dell Surveyor', 'The Radeon Coder', 'The Dell Reasoner', 'The Dell Coder', 'Musician, tiny expert', 'Toymaker, tiny expert'].every((q) => cr.t.includes(q)) && ['Crumble Clan', 'Snore Squad', 'Crumb Crusaders', 'Grumble Tribe', 'Lint-Lords', 'Bottle Cap Bomber', 'Elastic Band Cannon', 'Tea Bag Rocket', 'Paperclip Barrage', 'Sock-Sling', 'Tape-Toss', 'Oops', 'Crown of the Crumb', 'Resilience Ribbon', 'Rebuild', 'dust meter', '30 turns', 'I am a frog', 'what\'s this'].every((q) => new RegExp(q, 'i').test(cr.t)), cr.n + ' entries');
  ok('every credit names a real council seat and every weapon credits its seat', await ev((seats) => __g.COUNCIL_CREDITS.every(([w, s]) => s.split(/, | and /).every((x) => seats.includes(x.trim()) || seats.includes(s))) && Object.values(__g.BW).every((w) => w.by && w.by.split(' and ').every((x) => seats.includes(x))), seats));
  await p.click('#btCrBack'); await sleep(100); await p.click('#btX').catch(() => {}); await ev(() => { document.getElementById('modal').hidden = true; });

  // ===================== 7e. the weapons (screenshot 33), each with its credit =====================
  await scenario({ seed: 41 }); const wk = await ev(() => { const B = __g.BT, a = B.units.find((u) => u.side === 0); B.wind = [0, 0]; B.wob = 0; const out = { order: __g.BT_ORDER.slice(), by: __g.BT_ORDER.map((id) => __g.BW[id].by), n: 0 }; B.sel = a; B.sides[0].dust = 100; B.sides[0].hoover = true; const ids = ['bomber', 'band', 'tea', 'clips', 'sock', 'tape']; for (const id of ids) { B.fired = false; B.stage = 'aim'; B.side = 0; B.projs.length = 0; __g.btFire(a, id, [1.4, 1.4, 0.2]); out.n++; } out.credits = B.log.filter((l) => l.k === 'credit').map((l) => l.x); return out; });
  ok('the bar holds six council weapons and the earned Hoover', wk.order.length === 7 && wk.order.slice(0, 6).join() === 'bomber,band,tea,clips,sock,tape' && wk.order[6] === 'hoover', wk.order.join());
  ok('every weapon shows its "idea by" credit when first fired', ['Bottle Cap Bomber · idea by The Dell Surveyor and The Dell Coder', 'Elastic Band Cannon · idea by The Dell Reasoner', 'Tea Bag Rocket · idea by The Dell Reasoner', 'Paperclip Barrage · idea by The Dell Reasoner', 'Sock-Sling · idea by The Town Brain', 'Tape-Toss · idea by The Town Brain'].every((c) => wk.credits.includes(c)), JSON.stringify(wk.credits));
  await run(0.3, 1 / 30); await ev(() => { const B = __g.BT; B.stage = 'aim'; B.fired = false; B.side = 0; B.wid = 'tea'; __g.btUi(true); }); await sleep(100); await p.screenshot({ path: OUT + '33-weapons.png' });
  await run(9, 1 / 30);
  const w1 = await ev(() => { const B = __g.BT, a = B.units.find((u) => u.side === 0); B.wind = [0, 0]; B.wob = 0; B.projs.length = 0; B.fired = false; B.stage = 'aim'; B.side = 0; B.sel = a; B.log.length = 0; const ok = __g.btFire(a, 'clips', [1.6, 2.0, 0.5]); const n = B.projs.length; return { ok, n }; });
  ok('the Paperclip Barrage throws a cluster of 3 to 5 clips', w1.ok && w1.n >= 3 && w1.n <= 5, JSON.stringify(w1)); await run(5, 1 / 30);
  const bn = await ev(() => { const B = __g.BT; const a = B.units.find((u) => u.side === 0), d = B.sides[0].Z, sp = (() => { for (let gx = -0.4; gx <= 0.4; gx += 0.05) for (let gz = -0.2; gz <= 0.2; gz += 0.05) { const x = d.cx + gx, z = d.cz + gz; if (Math.abs(__g.btSurf(x, z, d.y + 0.1) - d.y) < 0.005 && !B.structs.some((s) => Math.hypot(s.x - x, s.z - z) < 0.15)) return [x, z]; } return null; })(); B.wind = [0, 0]; B.wob = 0; const pr = __g.btNewProj('band', sp[0], d.y + 0.15, sp[1], 1.2, -0.3, 0, null), f = __g.btFly(pr, 8); return { bn: pr.bn, what: f.what, t: +f.t.toFixed(2) }; });
  ok('the Elastic Band Cannon bounces (more than once) and stops at its bounce cap', bn.bn >= 2 && bn.bn <= 6 + 1 && bn.what === 'drop', JSON.stringify(bn));
  const rob = await ev(() => { const B = __g.BT, a = B.units.find((u) => u.side === 0); B.wind = [0.4, -0.3]; B.wob = 8; const ids = ['bomber', 'band', 'tea', 'clips', 'sock', 'tape']; let rs = 12345, bad = 0, n = 0, maxBn = 0, maxT = 0; const r = () => (rs = (rs * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 1000; i++) { const id = ids[i % 6], w = __g.BW[id], th = -0.2 + r() * 1.6, ha = r() * 6.283, v = w.vmin + r() * (w.vmax - w.vmin), c = Math.cos(th), pr = __g.btNewProj(id, a.x, a.y + 0.08, a.z, v * c * Math.sin(ha), v * Math.sin(th), v * c * Math.cos(ha), a), f = __g.btFly(pr, 25); n++; if (f.what === 'time') bad++; maxBn = Math.max(maxBn, pr.bn); maxT = Math.max(maxT, f.t); } B.wob = 0; return { n, bad, maxBn, maxT: +maxT.toFixed(2) }; });
  ok('Robot Tester check (Town Brain): 1000 random shots, no infinite bounce loop, every one ends (bounces capped)', rob.n === 1000 && rob.bad === 0 && rob.maxBn <= 7 && rob.maxT < 25, JSON.stringify(rob));
  const tz = await ev(() => { const B = __g.BT, a = B.units.find((u) => u.side === 0), v = B.units.find((u) => u.side === 1); B.wind = [0, 0]; B.wob = 0; B.log.length = 0; v.hp = 2; v.dizzy = false; const pr = __g.btNewProj('tea', v.x, v.y + B.uh, v.z, 0, 0, 0, a); __g.btApply(pr, { end: true, what: 'boom', at: [v.x, v.y + B.uh, v.z], unit: v }); return { hp: v.hp, dizzy: v.dizzy, st: v.st, damp: B.damp.length, say: B.log.filter((l) => l.k === 'say').map((l) => l.x).join('|') }; });
  ok('the Tea Bag Rocket: the target sneezes, is pushed a little, and the tea leaves a damp patch', tz.hp === 1 && tz.dizzy && tz.st === 'air' && tz.damp >= 1 && /CHOO|choo/i.test(tz.say), JSON.stringify(tz));
  await run(2, 1 / 30);
  const sk = await ev(() => { const B = __g.BT, a = B.units.find((u) => u.side === 0), v = B.units.find((u) => u.side === 1 && u.st === 'stand'); B.wind = [0, 0]; B.wob = 0; B.log.length = 0; B.sides[0].dust = 0; const d0 = 0; const pr = __g.btNewProj('sock', v.x, v.y + B.uh, v.z, 0, 0, 0, a); __g.btApply(pr, { end: true, what: 'wrap', at: [v.x, v.y + B.uh, v.z], unit: v }); const r = { wob: B.sides[1].wobble, hat: !!v.hat, dust: B.sides[0].dust - d0 }; B.side = 1; B.fired = false; B.stage = 'aim'; B.sel = v; B.projs.length = 0; const vel = [1.2, 1.8, 0.3]; r.fire = __g.btFire(v, 'bomber', vel); const f = B.log.filter((l) => l.k === 'fire').pop(); r.differs = Math.hypot(f.x.vel[0] - vel[0], f.x.vel[1] - vel[1], f.x.vel[2] - vel[2]) > 0.08; r.after = B.sides[1].wobble; r.hatAfter = !!v.hat; r.wlog = B.log.some((l) => l.k === 'wobble'); return r; });
  ok('the Sock-Sling: the target wears a Sock-Hat and its side\'s next shot gets a random aim wobble (once)', sk.wob && sk.hat && sk.dust === 15 && sk.fire && sk.differs && !sk.after && !sk.hatAfter && sk.wlog, JSON.stringify(sk));
  await run(8, 1 / 30);

  // ===================== 7f. the 'Oops' Bridge (screenshot 34) =====================
  await scenario({ seed: 43 }); const ob = await ev(() => {
    const B = __g.BT, a = B.units.find((u) => u.side === 0), z1 = B.sides[1].Z; B.wind = [0, 0]; B.wob = 0; let spot = null;
    for (let gx = -0.5; gx <= 0.5 && !spot; gx += 0.05) for (let gz = -0.3; gz <= 0.3 && !spot; gz += 0.05) { const x = z1.cx + gx, z = z1.cz + gz; if (__g.btClearSpot([x, z1.y + 0.002, x * 0 + z]) && !B.structs.some((s) => Math.hypot(s.x - x, s.z - z) < 0.2) && !B.units.some((u) => Math.hypot(u.x - x, u.z - z) < 0.2)) spot = [x, z]; }
    const pr = __g.btNewProj('bomber', spot[0], z1.y + 0.2, spot[1], 0, 0, 0, a), f = __g.btFly(pr, 4); // a miss that lands on a clear patch of the enemy's surface
    __g.btApply(pr, f); const r = { what: f.what, n: B.bridges.length, side: B.bridges[0] && B.bridges[0].side, spot, a: [a.x, a.z, a.y] };
    const fl = B.floorY, d = B.sides[0].Z; const fpr = __g.btNewProj('bomber', d.cx + 0.2, fl + 0.2, d.cz + 0.9, 0, 0, 0, a); __g.btApply(fpr, __g.btFly(fpr, 4)); r.n2 = B.bridges.length; r.floorClear = __g.btClearSpot([d.cx + 0.2, fl + 0.002, d.cz + 0.9]);
    r.foeCan = !!__g.btBridgeFor(B.units.find((u) => u.side === 1)); return r;
  });
  ok('a miss that lands on a clear surface leaves a bridge for the shooter\'s side', ob.n === 1 && ob.side === 0 && ob.what === 'boom', JSON.stringify(ob));
  ok('a miss on the floor leaves nothing (the floor is no-man\'s-land), and the other side cannot use the bridge', ob.n2 === 1 && ob.floorClear === null && ob.foeCan === false, JSON.stringify(ob));
  await run(4, 1 / 30); await ev(() => { const B = __g.BT; B.stage = 'aim'; B.fired = false; B.side = 0; B.crossed = false; B.sel = B.units.find((u) => u.side === 0 && u.st === 'stand'); B.turnT = 30; __g.btUi(true); }); await sleep(100);
  const ob2 = await ev(() => ({ btn: !!document.getElementById('btCross'), txt: document.getElementById('btCross') && document.getElementById('btCross').textContent, pips: document.getElementById('btS0').textContent, msgs: __g.BT.log.filter((l) => l.k === 'oops').length }));
  ok('it is shown clearly: a 🌉 cross button, a bridge count in the HUD, a marker in the arena', ob2.btn && /cross 1/.test(ob2.txt) && /🌉×1/.test(ob2.pips) && ob2.msgs === 1, JSON.stringify(ob2));
  await ev(() => { const B = __g.BT, b = B.bridges[0]; B.cfg.hops = 3; __g.btFocus(b.x, b.y + 0.05, b.z, 3, 0.2); }); await run(1.2, 1 / 30); await p.screenshot({ path: OUT + '34-oops-bridge.png' });
  const f0 = await ev(() => { const B = __g.BT, u = B.sel, b = B.bridges[0]; return { d0: Math.hypot(u.x - b.x, u.z - b.z), y0: u.y, by: b.y }; });
  await p.click('#btCross'); await run(3, 1 / 30);
  const f1 = await ev(() => { const B = __g.BT, u = B.sel; return { d1: B.bridges.length ? null : 'gone', x: u.x, z: u.z, y: u.y, st: u.st, crossed: B.crossed, bridges: B.bridges.length, log: B.log.filter((l) => l.k === 'cross').length, z1y: B.sides[1].Z.y }; });
  const near = await ev((f0) => { const B = __g.BT, u = B.sel; return Math.hypot(u.x - f0.sx, u.z - f0.sz); }, Object.assign(f0, { sx: ob.spot[0], sz: ob.spot[1] }));
  ok('one creature moves to the bridge, and the bridge is used up', f1.log === 1 && f1.bridges === 0 && f1.st === 'stand' && near < 0.16 && Math.abs(f1.y - f1.z1y) < 0.06 && f0.d0 > 0.4, JSON.stringify({ f0, f1, near }));
  ok('only one crossing a turn', await ev(() => { const B = __g.BT, u = B.units.find((q) => q.side === 0 && q.st === 'stand' && q !== B.sel); __g.btOops(0, u.x + 0.02, u.y, u.z + 0.02); return __g.btCross(u) === false && B.bridges.length === 1; }));

  // ===================== 7g. the room matters: wobble from music or a speaker, rugs kill bounces, the floor is no-man's-land =====================
  await scenario({ seed: 47 }); const rmx = await ev(() => {
    const B = __g.BT, a = B.units.find((u) => u.side === 0), d = B.sides[0].Z, r = {}; B.wind = [0, 0]; __g.G.music = false; B.music = false; __g.btRoomFx(); r.none = B.wob; __g.btUi(true); r.iconOff = document.getElementById('btShake').hidden;
    const fly = () => { const pr = __g.btNewProj('bomber', a.x, a.y + 0.08, a.z, 2.2, 2.2, 0.4, a); return __g.btFly(pr, 8).at; };
    const p0 = fly(); __g.G.music = true; __g.btRoomFx(); r.music = B.wob; r.why = B.wobWhy; __g.btUi(true); r.iconOn = !document.getElementById('btShake').hidden; r.txt = document.getElementById('btShakeTxt').textContent; const p1 = fly(); r.moved = Math.hypot(p0[0] - p1[0], p0[2] - p1[2]); __g.G.music = false;
    __g.btRoomFx(); r.afterOff = B.wob; const sp = __g.addSpot({ tag: 'speaker', zid: d.id, x: d.cx, y: d.y, z: d.cz }); __g.btRoomFx(); r.speaker = B.wob; r.spWhy = B.wobWhy; __g.removeSpot(sp); __g.btRoomFx(); r.spOff = B.wob;
    return r;
  });
  ok('with no music and no speaker, shots do not wobble (no shake icon)', rmx.none === 0 && rmx.iconOff && rmx.afterOff === 0 && rmx.spOff === 0, JSON.stringify(rmx));
  ok('when music plays, airborne shots wobble (the landing spot moves) and a shake icon shows', rmx.music > 0 && rmx.why === 'music' && rmx.iconOn && /music/.test(rmx.txt) && rmx.moved > 0.01, JSON.stringify(rmx));
  ok('a creature standing on a speaker zone makes shots wobble too', rmx.speaker > 0 && rmx.spWhy === 'speaker', JSON.stringify(rmx));
  const rug = await ev(() => { const B = __g.BT, d = B.sides[0].Z, q = B.zs.find((z) => z.Z === d); B.wind = [0, 0]; B.wob = 0; const sp = (() => { for (let gx = -0.4; gx <= 0.4; gx += 0.05) for (let gz = -0.2; gz <= 0.2; gz += 0.05) { const x = d.cx + gx, z = d.cz + gz; if (Math.abs(__g.btSurf(x, z, d.y + 0.1) - d.y) < 0.005 && !B.structs.some((s) => Math.hypot(s.x - x, s.z - z) < 0.15)) return [x, z]; } return null; })(); const go = (wid) => { const pr = __g.btNewProj(wid, sp[0], d.y + 0.2, sp[1], 0.4, -0.2, 0, null); const f = __g.btFly(pr, 8); return { bn: pr.bn, what: f.what, soft: !!f.soft }; };
    const hard = { band: go('band'), bomber: go('bomber'), sock: go('sock') }; q.soft = true; const soft = { band: go('band'), bomber: go('bomber'), sock: go('sock') }; q.soft = false; return { hard, soft }; });
  ok('a rug (soft surface) kills the bounces of the band, the cap and the sock', rug.hard.band.bn >= 2 && rug.soft.band.bn === 1 && rug.soft.band.what === 'drop' && rug.soft.bomber.bn === 1 && rug.soft.bomber.what === 'boom' && rug.hard.bomber.bn >= 2 && rug.soft.sock.bn === 1 && rug.soft.sock.what === 'drop', JSON.stringify(rug));
  const nml = await ev(() => { const B = __g.BT, a = B.units.find((u) => u.side === 0), d = B.sides[0].Z; B.log.length = 0; const pr = __g.btNewProj('tape', d.cx + 0.2, B.floorY + 0.002, d.cz + 0.9, 0, 0, 0, a); __g.btApply(pr, { end: true, what: 'hook', at: [d.cx + 0.2, B.floorY + 0.002, d.cz + 0.9], n: [0, 1, 0], floor: true }); return { fail: B.log.filter((l) => l.k === 'hookfail').map((l) => l.x), st: a.st }; });
  ok('the floor is no-man\'s-land: the Tape-Toss will not stick to it', nml.fail.length === 1 && /No-man's-land/.test(nml.fail[0]) && nml.st === 'stand', JSON.stringify(nml));

  // ===================== 7h. the Hoover is earned (dust meter), a first hit makes a creature dizzy =====================
  await scenario({ seed: 51 }); const dz = await ev(() => { const B = __g.BT, a = B.units.find((u) => u.side === 0), vs = B.units.filter((u) => u.side === 1), r = { start: [B.sides[0].dust, B.sides[0].hoover], refused: __g.btFire(a, 'hoover', [1, 1, 0]) === false, hearts: B.sides.map((s) => s.tent.hp), hp: vs[0].hp };
    r.h1 = __g.btHit(vs[0], [0, 0, 0], a); r.d1 = B.sides[0].dust; r.st1 = vs[0].st; r.dizzy = vs[0].dizzy; r.hp1 = vs[0].hp; r.h2 = __g.btHit(vs[0], [0, 0, 0], a); r.d2 = B.sides[0].dust; r.st2 = vs[0].st; r.h3 = __g.btHit(vs[1], [0, 0, 0], a); r.d3 = B.sides[0].dust; B.sides[0].dust = 80; __g.btHit(vs[2], [0, 0, 0], a); r.ready = B.sides[0].hoover; B.side = 0; B.stage = 'aim'; B.fired = false; __g.btUi(true); r.bar = document.getElementById('btBar').textContent; r.logs = B.log.filter((l) => ['dizzy', 'hit', 'hoover-ready'].includes(l.k)).map((l) => l.k); r.pips = document.getElementById('btS1').textContent; return r; });
  ok('the Hoover starts empty: the dust meter is 0 and the super weapon is refused', dz.start[0] === 0 && dz.start[1] === false && dz.refused, JSON.stringify(dz.start));
  ok('a first hit makes a creature dizzy (still out), the second sends it home; tents have 6 hearts', dz.h1 === 'dizzy' && dz.st1 !== 'popping' && dz.dizzy && dz.hp1 === 1 && dz.h2 === 'pop' && dz.st2 === 'popping' && dz.hearts[0] === 6 && dz.hearts[1] === 6 && /◐/.test(dz.pips), JSON.stringify(dz));
  ok('hits fill the dust meter (20 dizzy, 25 home), and a full meter lights the Hoover', dz.d1 === 20 && dz.d2 === 45 && dz.d3 === 65 && dz.ready && /Hoover!/.test(dz.bar) && dz.logs.includes('hoover-ready'), JSON.stringify([dz.d1, dz.d2, dz.d3, dz.ready]));
  await run(2, 1 / 30);

  // ===================== 7i. the 30-turn limit and the kind endings (screenshot 35) =====================
  const limit = (mode, mt) => ev(([mode, mt]) => { __g.btBegin({ mode: 'solo', level: 'easy', seed: 21, cfg: { aiDelay: 0.05, maxTurns: mt } }); const B = __g.BT; B.sides[1].ai = false; for (let i = 0; i < 120; i++) { __g.G.time += 1 / 30; __g.battleFrame(1 / 30); } if (mode === 'more') __g.btPop(B.units.find((u) => u.side === 1), 'test'); if (mode === 'fewer') __g.btPop(B.units.find((u) => u.side === 0), 'test'); let g = 0; while (!B.over && g++ < 6000) { if (B.stage === 'aim') __g.btEndTurn(); __g.G.time += 1 / 30; __g.battleFrame(1 / 30); } return { over: B.over && { w: B.over.winner, why: B.over.why }, turn: B.turn, n: B.sides.map((s) => __g.btAlive(s.i).length), dance: B.units.filter((u) => u.st !== 'home').map((u) => u.dance) }; }, [mode, mt]);
  const l1 = await limit('more', 4), l2 = await limit('fewer', 4), l3 = await limit('tie', 4);
  ok('at the turn limit the side with more creatures still out wins', l1.over && l1.over.w === 0 && l1.over.why === 'limit' && l1.turn === 4 && l1.n[0] > l1.n[1], JSON.stringify(l1));
  ok('...in either direction', l2.over && l2.over.w === 1 && l2.over.why === 'limit' && l2.n[1] > l2.n[0], JSON.stringify(l2));
  ok('a tie at the limit is a draw dance (everybody dances)', l3.over && l3.over.w === -1 && l3.over.why === 'limit' && l3.dance.every((d) => d === 1), JSON.stringify(l3));
  ok('the default hard limit is 30 turns', await ev(() => { __g.btBegin({ mode: 'solo', seed: 5 }); return __g.BT.cfg.maxTurns === 30; }));
  await scenario({ seed: 61 }); await ev(() => { __g.FUN.album = []; const B = __g.BT; for (const u of B.units.filter((q) => q.side === 1).slice(0, 3)) __g.btPop(u, 'test'); __g.btDamage(B.sides[1].tent, 99, [0, 0, 0], null); B.stage = 'aim'; __g.btCheckEnd(); });
  await run(0.6, 1 / 30); const e0 = await ev(() => ({ dead: __g.BT.sides[1].tent.dead })); await run(0.5, 1 / 30); const e1 = await ev(() => ({ badges: __g.BT.badges.map((b) => b.kind), stage: __g.BT.stage, dead: __g.BT.sides[1].tent.dead })); await run(5.2, 1 / 30); await sleep(150);
  const e2 = await ev(() => { const B = __g.BT; return { badges: B.badges.map((b) => b.kind + ':' + b.side), dead: B.sides[1].tent.dead, hp: B.sides[1].tent.hp, hpMax: B.sides[1].tent.hpMax, card: document.getElementById('btEnd').textContent, shown: B.over.shown, log: B.log.filter((l) => ['rebuild', 'badge'].includes(l.k)).map((l) => l.k), album: __g.FUN.album.map((e) => e.id), loserDance: B.units.filter((u) => u.side === 1 && u.st !== 'home').map((u) => u.dance), reward: B.over.reward }; });
  ok('the winners get the Crown of the Crumb badge (and the existing reward)', e1.badges.includes('crown') && e2.badges.includes('crown:0') && /Crown of the Crumb for The Colony/.test(e2.card) && /idea by The Town Brain/.test(e2.card) && /\+6 wood/.test(e2.reward) && e2.album.includes('victory') && e2.album.includes('crown'), JSON.stringify(e2));
  ok('the loser\'s tent was down when the match ended (so the rebuild is an animation, not a given)', e0.dead === true, JSON.stringify(e0));
  ok('...the tent stands again with full hearts, the ribbon is pinned to it, the losers cheer', !e2.dead && e2.hp === e2.hpMax && e2.log.includes('rebuild') && e2.badges.includes('ribbon:1') && /Resilience Ribbon for The \w/.test(e2.card) && /idea by The Dell Surveyor/.test(e2.card) && e2.loserDance.every((d) => d > 0) && e2.shown, JSON.stringify(e2));
  await p.screenshot({ path: OUT + '35-ending.png' });
  await scenario({ seed: 62 }); await ev(() => { __g.FUN.album = []; const B = __g.BT; __g.btDamage(B.sides[0].tent, 99, [0, 0, 0], null); B.stage = 'aim'; __g.btCheckEnd(); }); await run(7, 1 / 30); await sleep(100);
  const e3 = await ev(() => ({ card: document.getElementById('btEnd').textContent, album: __g.FUN.album.map((e) => e.id), over: __g.BT.over.winner }));
  ok('a loss is kind: the Resilience Ribbon with the Dell Surveyor\'s own message (and no crown for the colony)', e3.over === 1 && /Resilience Ribbon for The Colony/.test(e3.card) && /You showed great skill! Let's play again and learn new strategies!/.test(e3.card) && e3.album.includes('ribbon') && !e3.album.includes('crown'), JSON.stringify(e3));
  const ko = await ev(() => { const B = __g.BT, u = B.units.find((q) => q.side === 1); let n = 0; const seen = new Set(); for (let i = 0; i < 60; i++) { B.turn += 2; const before = B.log.filter((l) => l.k === 'ko').length; __g.btKoLine(u); if (B.log.filter((l) => l.k === 'ko').length > before) { n++; seen.add(B.log.filter((l) => l.k === 'ko').pop().x); } } __g.btKoLine(u, true); const b = B.bub.find((q) => q.on && q.u === u && q.kind === 'say'); return { n, seen: [...seen], cred: document.getElementById('btCred').textContent, lines: __g.BT_KO.map((k) => k.t) }; });
  ok('knock-out lines from the tiny experts are said sometimes, not every time', ko.n >= 8 && ko.n <= 45 && /tiny expert/.test(ko.cred) && ko.seen.length === 2, JSON.stringify(ko));
  ok('the lines are the sparks as written, credited', ko.lines[0] === 'I am a frog!\nWhat am I going to do when I get home?' && ko.lines[1] === "Now, what's this?" && ko.seen.includes('Musician, tiny expert') && ko.seen.includes('Toymaker, tiny expert'), JSON.stringify(ko.lines));
  await ev(() => { __g.btCleanup(); });

  // ===================== 7c. two players: pass the iPad =====================
  await ev(() => { __g.btLeave(false); }); await sleep(300); ok('back in the colony after leaving: HUD gone, colony visible again', await ev(() => !document.body.classList.contains('battle') && document.getElementById('btHud').hidden && __g.G.settlements.some((S) => S.group.visible)));
  await p.click('#bMenu'); await p.click('#mBattle'); await p.click('#btC'); await sleep(300); await ev(() => { __g.BT.cfg.turn = 30; }); await run(3.2);
  const d1 = await ev(() => ({ mode: __g.BT.mode, ai: __g.BT.sides.map((s) => s.ai), stage: __g.BT.stage, side: __g.BT.side, names: __g.BT.sides.map((s) => s.name), s1: __g.BT.units.filter((u) => u.side === 1).map((u) => u.name) }));
  ok('2 players: no AI, Player 1 first, cousins on the other side', d1.mode === 'duo' && !d1.ai[0] && !d1.ai[1] && d1.stage === 'aim' && d1.side === 0 && d1.names[1] === 'Player 2', JSON.stringify(d1));
  await ev(() => { const B = __g.BT, u = B.sel; B.wind = [0, 0]; __g.btFire(u, 'bomber', [-1.6, 2.2, -0.4]); }); await run(8, 1 / 30);
  const d2 = await ev(() => ({ stage: __g.BT.stage, side: __g.BT.side, pass: !document.getElementById('btPass').hidden, txt: document.getElementById('btPass').textContent, turnT: __g.BT.turnT }));
  ok('after the shot: a "Pass to Player 2" screen covers the arena', d2.stage === 'pass' && d2.pass && /Pass to Player 2/.test(d2.txt), JSON.stringify(d2));
  await run(5, 1 / 30); const d2b = await ev(() => ({ turnT: __g.BT.turnT, stage: __g.BT.stage })); ok('the timer waits while the iPad is being passed', d2b.stage === 'pass' && d2b.turnT === d2.turnT);
  await p.click('#btReady'); await run(1.5, 1 / 30); const d3 = await ev(() => ({ stage: __g.BT.stage, side: __g.BT.side, bar: document.getElementById('btBar').textContent, who: document.getElementById('btWho').textContent, sel: __g.BT.sel && __g.BT.sel.side }));
  ok('Player 2\'s turn: weapon bar, own creature selected', d3.stage === 'aim' && d3.side === 1 && /Bomber/.test(d3.bar) && d3.sel === 1, JSON.stringify(d3));
  await ev(() => { const B = __g.BT, u = B.sel; B.wind = [0, 0]; __g.btFire(u, 'band', [3, 0.2, 3]); }); await run(8, 1 / 30); ok('and the iPad is passed back', await ev(() => __g.BT.stage === 'pass' && __g.BT.side === 0));
  const dm = await playOut({ mode: 'duo', seed: 321 }); ok('a 2-player match plays out to a winner with the pass screens', [0, 1].includes(dm.winner) && dm.passes >= 3, JSON.stringify({ w: dm.winner, turns: dm.turns, passes: dm.passes }));
  console.log('2P', JSON.stringify(dm));

  // ===================== 8. whole matches: 1 player vs the AI (a good player plays side A), a winner, the reward =====================
  await ev(() => { __g.FUN.album = []; });
  let won = null, matches = [], memMid = null, stock0 = null, stock1 = null;
  for (let k = 0; k < 8 && (k < 3 || !won); k++) {
    if (k === 0) await ev(() => { __g.btBegin({ mode: 'solo', level: 'normal', seed: 5, cfg: { aiDelay: 0.05 } }); });
    stock0 = await ev(() => { const S = __g.mainSettlement(); return S ? S.stock.wood : null; });
    const r = await playOut({ seed: 100 + k }); matches.push(r); stock1 = await ev(() => { const S = __g.mainSettlement(); return S ? S.stock.wood : null; });
    if (r.winner === 0 && !won) { won = r; won.stock = [stock0, stock1]; await sleep(1800); await p.screenshot({ path: OUT + '30-victory.png' }); } if (k === 0) memMid = await mem();
  }
  console.log('matches', JSON.stringify(matches.map((m) => ({ w: m.winner, t: m.turns, home: m.home, tents: m.tents, hoover: m.hoover }))));
  ok('matches end with a winner (tent down, or no creatures left)', matches.every((m) => [0, 1, -1].includes(m.winner)) && matches.some((m) => m.winner === 0 || m.winner === 1), matches.map((m) => m.winner + '@' + m.turns).join(', '));
  const avgH = matches.reduce((a, m) => a + m.turns, 0) / matches.length; console.log('human-like match turns', matches.map((m) => m.turns).join(','), 'avg', avgH.toFixed(1));
  ok('pace: no match is over in a few shots (a good side no longer wins in about 3 turns: dizzy first hits, six-heart tents)', matches.every((m) => m.turns >= 6) && avgH >= 8, matches.map((m) => m.turns).join(',') + ' avg ' + avgH.toFixed(1));
  ok('the AI\'s turns are fast: think time under 250 ms', matches.every((m) => m.ms.every((t) => t < 250)), 'max ' + Math.max(...matches.flatMap((m) => m.ms)).toFixed(0) + ' ms');
  const album = await ev(() => __g.FUN.album.some((e) => e.id === 'victory'));
  ok('a human win earns the colony a reward (wood, tin) and the album entry "First victory"', !!won && album && won.stock[1] >= won.stock[0] + 6 && /First victory/.test(won.reward), won ? JSON.stringify({ reward: won.reward, stock: won.stock, album }) : 'no win in ' + matches.length + ' matches');
  // ===================== 8b. AI vs AI: a scripted perfect-aim match lasts a while; the rival plays at least four weapons =====================
  const aiMatch = (seed, level, extra) => ev(async ([seed, level, extra]) => { __g.btBegin(Object.assign({ mode: 'solo', level, seed, cfg: { aiDelay: 0.05 } }, extra || {})); const B = __g.BT; B.sides[0].ai = true; let guard = 0; while (!(B.over && B.over.shown) && guard++ < 90000) { __g.G.time += 1 / 30; __g.battleFrame(1 / 30); } return { winner: B.over && B.over.winner, why: B.over && B.over.why, turns: B.turn, wids: [...new Set(B.log.filter((l) => l.k === 'fire').map((l) => l.x.wid))], ms: B.log.filter((l) => l.k === 'ai').map((l) => l.x.ms), oops: B.log.filter((l) => l.k === 'oops').length, crosses: B.log.filter((l) => l.k === 'cross').length }; }, [seed, level, extra]);
  const perf = []; for (let k = 0; k < 5; k++) perf.push(await aiMatch(200 + k, 'perfect'));
  const avgP = perf.reduce((a, m) => a + m.turns, 0) / perf.length; console.log('perfect-aim AI vs AI turns', perf.map((m) => m.turns + (m.why === 'limit' ? 'L' : '')).join(','), 'avg', avgP.toFixed(1));
  ok('a scripted perfect-aim AI vs AI match lasts at least 6 turns on average (and always finishes)', perf.every((m) => m.winner !== undefined && m.winner !== null && m.turns <= 30) && avgP >= 6, perf.map((m) => m.turns).join(',') + ' avg ' + avgP.toFixed(1));
  const wset = new Set(perf.flatMap((m) => m.wids).concat(matches.length ? [] : [])); for (const k of [300, 301]) { const m = await aiMatch(k, 'normal'); m.wids.forEach((w) => wset.add(w)); perf.push(m); }
  ok('the rival (and the other side when AI) uses at least four of the council weapons', [...wset].filter((w) => ['bomber', 'band', 'tea', 'clips', 'sock'].includes(w)).length >= 4, [...wset].join(','));
  ok('AI planning stays fast with five weapons to choose from (think time under 250 ms)', perf.every((m) => m.ms.every((t) => t < 250)), 'max ' + Math.max(...perf.flatMap((m) => m.ms)).toFixed(0) + ' ms');
  const mEnd = await mem(); ok('memory flat over repeated matches (geometries and textures bounded)', (mEnd.geo - memMid.geo) < 25 && (mEnd.tex - memMid.tex) < 30, JSON.stringify({ afterFirst: memMid, end: mEnd }));
  // ===================== 9. AR: one battle on the real (fake) room through ar-fake.js, speaker top vs shelf =====================
  const SHED1 = [['floor', -1.2, 0, -1.5, 1.2, 1.2], ['speakerA', -0.45, 0.9, -1.2, 0.15, 0.125], ['speakerB', -0.25, -0.9, -1.2, 0.15, 0.125], ['shelf', 0.2, 0.0, -2.7, 0.7, 0.13], ['can1', 0.32, -0.35, -2.7, 0.05, 0.05], ['can2', 0.32, -0.15, -2.7, 0.05, 0.05], ['can3', 0.32, 0.1, -2.7, 0.05, 0.05], ['cup', -0.17, -0.85, -1.2, 0.04, 0.04], ['chandelier', 0.7, 0.2, -1.6, 0.1, 0.1]];
  const b2 = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b2.newContext({ viewport: { width: 820, height: 1180 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const q = await ctx.newPage(); const aerrs = []; q.on('pageerror', (e) => aerrs.push(e.message)); q.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) aerrs.push('console: ' + m.text()); });
  await install(q, SHED1); await q.addInitScript({ content: POLY }); const qe = (f, a) => q.evaluate(f, a);
  await q.goto(url); await sleep(2500); await qe(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await q.reload(); await sleep(2500);
  await qe(() => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; const c = document.createElement('canvas'); c.width = 400; c.height = 560; const g = c.getContext('2d'); let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 420; i++) { g.fillStyle = 'hsl(' + Math.floor(r() * 360) + ',' + Math.floor(25 + r() * 50) + '%,' + Math.floor(25 + r() * 50) + '%)'; g.fillRect(r() * 400, r() * 560, 10 + r() * 70, 6 + r() * 50); } window.__bgUrl = c.toDataURL('image/jpeg', 0.8); });
  ok('AR ready: Play is the one main button', await qe(() => !document.getElementById('bPlay').disabled && __g.AR.ok));
  await q.click('#bPlay'); await sleep(800);
  await qe(() => { const T = window.__place(), pick = (n) => T.find((t) => t.n === n); const look = (n, off, hgt, ay, ap, dur) => { const S = pick(n); if (!S) return null; const p = [S.cx + off[0], S.y + hgt, S.cz + off[1]], fx = S.cx - p[0], fy = S.y - p[1], fz = S.cz - p[2], L = Math.hypot(fx, fy, fz); return { p, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay, ap, dur }; };
    const D = { floor: [[0, 1.3], 1.6, 0.6, 0.25, 12], speakerA: [[0.1, 0.5], 0.55, 0.12, 0.1, 8], speakerB: [[-0.1, 0.5], 0.6, 0.12, 0.1, 8], shelf: [[0, 0.6], 0.5, 0.18, 0.1, 10] }; window.__cam.path = ['floor', 'speakerA', 'speakerB', 'shelf', 'floor'].map((l) => { const d = D[l]; return look(l, d[0], d[1], d[2], d[3], d[4]); }); window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = 1; window.__cam.done = false; });
  const t0 = Date.now(); while (Date.now() - t0 < 240000) { await sleep(1500); if (await qe(() => window.__cam.done)) await qe(() => { window.__cam.t0 = performance.now(); window.__cam.done = false; }); if (await qe(() => __g.G.settlements.length > 0 && __g.G.zones.length >= 3 && __g.G.zones.filter((z) => z.type !== 'FLOOR').length >= 2)) break; }
  const zs = await qe(() => __g.G.zones.map((z) => z.type + ' ' + z.area.toFixed(2) + ' y' + z.y.toFixed(2))); ok('AR: the room was scanned into zones (floor, speaker tops, shelf)', zs.length >= 3, zs.join(' | '));
  await sleep(1500); await q.click('#bMenu'); await sleep(200); ok('AR: the in-game Menu has a Battle! button', await qe(() => !!document.getElementById('mBattle')));
  await q.click('#mBattle'); await sleep(200); await q.click('#btA'); await sleep(500);
  const ar = await qe(() => ({ on: __g.BT.on, ar: __g.AR.on, zones: __g.BT.sides.map((s) => s.Z.type + ' ' + s.Z.area.toFixed(2)), k: +__g.BT.k.toFixed(2), units: __g.BT.units.length }));
  ok('AR: the battle starts on two scanned zones of the real room', ar.on && ar.ar && ar.units === 8 && ar.zones[0] !== ar.zones[1], JSON.stringify(ar));
  // look at the arena from where a person would stand: back and to the side, the camera fixed (the player walks; here the fake room does not move)
  const placeCam = (dist) => qe((dist) => { const B = __g.BT, a = B.sides[0].Z, b = B.sides[1].Z, mx = (a.cx + b.cx) / 2, mz = (a.cz + b.cz) / 2, my = (a.y + b.y) / 2, dx = b.cx - a.cx, dz = b.cz - a.cz, L = Math.hypot(dx, dz), nx = -dz / L, nz = dx / L, sg = (nz > 0 ? 1 : -1); const cam = [mx + sg * nx * dist, my + 0.35 + dist * 0.35, mz + sg * nz * dist]; const fx = mx - cam[0], fy = my - cam[1], fz = mz - cam[2], l = Math.hypot(fx, fy, fz); window.__cam.mode = 'fixed'; window.__cam.fixed = [cam[0], cam[1], cam[2], Math.atan2(-fx / l, -fz / l), Math.asin(fy / l)]; }, dist);
  for (const d of [1.35, 1.8, 2.4, 3.0]) { await placeCam(d); await sleep(900); const vis = await qe(() => { const B = __g.BT, us = B.units.filter((u) => u.st !== 'home').map((u) => __g.btScreen(u)); return us.every((s) => s[2] && s[0] > 40 && s[0] < 780 && s[1] > 130 && s[1] < 1090); }); if (vis) break; }
  await qe(() => { document.documentElement.style.setProperty('background', 'url(' + window.__bgUrl + ') center/cover', 'important'); __g.BT.cfg.aiDelay = 0.6; }); await sleep(3500);
  const tl = await qe(() => { const r = document.getElementById('btTop').getBoundingClientRect(), bar = document.getElementById('btBar').getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), barH: Math.round(bar.height), W: innerWidth, barTop: Math.round(bar.top), msg: document.getElementById('btMsg').textContent }; });
  ok('AR: the HUD is compact and keeps clear of HelloXR\'s Exit AR button (top-left)', tl.left > 110 && tl.barH < 125 && tl.barTop > 1000, JSON.stringify(tl));
  const sc = await qe(() => { const s = __g.btScreen(__g.BT.sel); return { x: s[0], y: s[1], vis: s[2], st: __g.BT.stage }; });
  ok('AR: the selected creature is on screen and it is the player\'s aim stage', sc.vis && sc.x > 20 && sc.x < 800 && sc.y > 80 && sc.y < 1100 && sc.st === 'aim', JSON.stringify(sc));
  await q.mouse.move(sc.x, sc.y); await q.mouse.down(); await q.mouse.move(sc.x + 50, sc.y + 40, { steps: 4 }); await q.mouse.move(sc.x + 90, sc.y + 70, { steps: 4 }); await sleep(300);
  const ad = await qe(() => ({ dots: __g.BT.dots.filter((d) => d.visible).length, info: document.getElementById('btAimInfo').textContent }));
  ok('AR: aiming by dragging on screen from the creature shows the dotted arc', ad.dots >= 3, JSON.stringify(ad)); await q.screenshot({ path: OUT + '31-ar-aim.png' });
  await q.mouse.up(); await sleep(200);
  await qe(() => { const B = __g.BT, a = B.sel; B.wind = [0, 0]; }); // then a good shot, so the screenshot shows an impact
  await waitArSide(qe, 0); await sleep(300); const tf = await qe(() => { const B = __g.BT; const a = B.sel, v = B.units.find((u) => u.side === 1 && u.st === 'stand'); B.wind = [0, 0]; B.wob = 0; const sols = __g.btSolve('bomber', [a.x, a.y + 0.06 * B.k, a.z], [v.x, v.y + B.uh, v.z]); if (sols.length) __g.btFire(a, 'bomber', (sols[1] || sols[0]).vel); return performance.now(); });
  let got = false; for (let i = 0; i < 160; i++) { await sleep(30); if (await qe((t) => __g.BT.log.some((l) => (l.k === 'hit' || l.k === 'boom') && l.t > t), tf)) { got = true; break; } }
  await sleep(100); await q.screenshot({ path: OUT + '31-ar-battle.png' });
  await sleep(2500); await waitAr(qe, 'aim'); ok('AR: shots flew, the AI answered, the game carried on', await qe(() => __g.BT.log.filter((l) => l.k === 'fire').length >= 2));
  ok('AR: 0 page errors', aerrs.length === 0, aerrs.slice(0, 3).join(' | '));
  await b2.close(); await b.close(); srv.close(); console.log('errors', errs.slice(0, 5)); ok('0 page errors', errs.length === 0, errs.length + ''); const fails = res.filter((x) => !x).length; console.log(fails ? 'FAILED ' + fails : 'ALL PASSED', res.length + ' checks'); process.exit(fails ? 1 : 0);
})();
