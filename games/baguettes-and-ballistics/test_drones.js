// Standard drones + race choice test (Playwright, Chromium software GL).
//   NODE_PATH=$(npm root -g) node test_drones.js [path/to/index.html] [--only=buttons,types,ai,play,memory,race] [--secs=90] [--shots]
// Steps the game by hand (update(1/60), the real-time loop frozen) so every number is repeatable. Sections:
//   buttons  the Drones button on all six levels with no token won (Skip race, and a race that wins nothing)
//   types    each drone type: spawns, costs, army cap, shield soaks, repair heals friends only, scout reveals in the dark, bomber damages buildings
//   ai       the enemy still builds drones (Gunners, and its loadout's types)
//   play     SECS (default 90) seconds of play on every level, drones bought, 0 page errors
//   memory   geometry count flat over race -> level -> race cycles
//   race     the race choice: Kitchen Run, Classic box race, Skip race, remembered choice, classic on every level it is offered
// Exit code 0 only if every check passes. --shots writes PNGs to shots/ (drones and the intro card).
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const path = require('path');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const html = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(__dirname, 'index.html'));
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const ONLY = opt('only', '').split(',').filter(Boolean), SECS = +opt('secs', 90), SHOTS = args.includes('--shots');
const want = (n) => !ONLY.length || ONLY.includes(n);
let fails = 0, passes = 0;
const ok = (c, msg, extra = '') => { if (c) passes++; else { fails++; console.log(`  FAIL ${msg} ${extra}`); } if (c && args.includes('--v')) console.log(`  ok   ${msg} ${extra}`); };
const errors = [];

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
async function openPage(storage) {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const page = await ctx.newPage(); page.setDefaultTimeout(60000);
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_FAILED|net::/.test(m.text())) errors.push(`console: ${m.text()}`); });
  if (storage) await page.addInitScript((s) => { try { for (const k in s) localStorage.setItem(k, s[k]); } catch (e) { /* ignore */ } }, storage);
  for (let tries = 0; ; tries++) { try { await page.goto(`file://${html}`); break; } catch (e) { if (tries >= 2) throw e; } } // (three.js comes from a CDN: retry a slow load)
  await page.waitForFunction(() => typeof update === 'function' && state && state.player);
  await page.evaluate(() => {
    window.__U = update; update = () => {}; // freeze the real-time loop; tests call __tick
    window.__tick = (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) { state.dt = dt; window.__U(dt); } };
    // a battle with a given set of won tools (the real level, no race): what START on the loadout card does
    window.__battle = (lv, tools = [], cereal = 300) => {
      curLevel = lv; const L = LOADOUTS[lv];
      pendingLoad = { tools: [...BASICS, ...L.must, ...tools], ai: [...BASICS, ...L.must, ...L.ai], freeUp: 0, bonus: 0, aiBonus: 0, place: 2 };
      reset(); state.cereal = [cereal, cereal]; $('start').hidden = true; $('lrIntro').hidden = true; $('lrCard').hidden = true;
    };
    window.__count = (type, team) => entities.filter((e) => e.type === type && e.team === team && e.hp > 0).length;
  });
  return page;
}
const evalIn = (page, fn, arg) => page.evaluate(fn, arg);

// ---------------------------------------------------------------- buttons
async function sectionButtons() {
  console.log('[buttons] Drones button on all six levels, with nothing won');
  const page = await openPage();
  for (let lv = 0; lv < 6; lv++) {
    // (a) Skip race: the real buttons
    await page.evaluate((lv) => { curLevel = lv; start(); }, lv);
    await page.evaluate(() => { for (const id of ['talk']) { const t = $(id); if (t) t.hidden = true; } lrIntro(); });
    await page.click('#lrSkip'); await page.click('#lrGo');
    await page.waitForFunction(() => !$('lrCard').hidden);
    await page.click('#lrStart');
    await page.waitForFunction(() => state.phase === 'battle' && !state.race);
    let r = await page.evaluate(() => ({ vis: $('bDrones').offsetParent !== null, off: $('bDrones').classList.contains('off'), on: toolOn('drones'), tile: [...$('lrTiles').children].length, type: $('bDroneType').hidden }));
    ok(r.vis && !r.off && r.on, `level ${lv + 1} Skip race: Drones button visible`, JSON.stringify(r));
    // it buys: Gunner drones, 20 cereal
    r = await page.evaluate(() => { state.cereal[BLUE] = 100; drones(); return { c: state.cereal[BLUE], n: __count('drone', BLUE) }; });
    ok(r.c === 80 && r.n === 3, `level ${lv + 1} Skip race: Gunner drones bought (20 cereal, 3 drones)`, JSON.stringify(r));
    // (b) a race that wins nothing: finish with no tokens held (the other cars win)
    await page.evaluate((lv) => { curLevel = lv; start(); lrIntro(); $('talk').hidden = true; }, lv);
    await page.click('#lrGo');
    await page.evaluate(() => { const R = state.race; R.carried.length = 0; finishRace(R.rivals[0]); });
    await page.waitForFunction(() => !$('lrCard').hidden);
    r = await page.evaluate(() => ({ tiles: [...$('lrTiles').querySelectorAll('b')].map((b) => b.textContent) }));
    ok(r.tiles.some((t) => /Gunner drones/.test(t)), `level ${lv + 1} no tokens won: the card lists Gunner drones`, r.tiles.join('|'));
    await page.click('#lrStart');
    await page.waitForFunction(() => state.phase === 'battle' && !state.race);
    r = await page.evaluate(() => ({ vis: $('bDrones').offsetParent !== null, key: (() => { state.cereal[BLUE] = 100; const n0 = __count('drone', BLUE); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit3' })); return __count('drone', BLUE) - n0; })() }));
    ok(r.vis, `level ${lv + 1} race won nothing: Drones button visible`);
    ok(r.key === 3, `level ${lv + 1} key 3 buys three Gunner drones`, String(r.key));
  }
  await page.context().close();
}

// ---------------------------------------------------------------- types
async function sectionTypes() {
  console.log('[types] each drone type');
  const page = await openPage();
  const T = [['dr_shield', 'dshield', 25, 2], ['dr_repair', 'drepair', 25, 2], ['dr_scout', 'dscout', 20, 2], ['dr_bomber', 'dbomber', 30, 2]];
  // spawn + cost + selection + cap, on level 1 with all four types
  await page.evaluate(() => __battle(0, ['dr_shield', 'dr_repair', 'dr_scout', 'dr_bomber']));
  for (const [id, unit, cost, n] of T) {
    const r = await page.evaluate(([id, unit]) => {
      state.cereal[BLUE] = 100; state.droneSel = id; droneUi();
      const label = $('droneName').textContent, price = $('droneCost').textContent, typeBtn = !$('bDroneType').hidden;
      drones();
      const us = entities.filter((e) => e.type === unit && e.team === BLUE);
      return { c: state.cereal[BLUE], n: us.length, fly: us.every((u) => u.fly && u.dr), label, price, typeBtn, mesh: us.every((u) => u.mesh && u.mesh.children.length >= 3), kids: us[0].mesh.children.length };
    }, [id, unit]);
    ok(r.c === 100 - cost && r.n === n, `${id}: ${n} drones, ${cost} cereal`, JSON.stringify(r));
    ok(r.fly && r.mesh, `${id}: flies, model built (${r.kids} meshes)`);
    ok(r.price === String(cost) && r.typeBtn, `${id}: button shows ${r.label} ${r.price}, type button shown`);
  }
  // cycling: Gunner -> Shield -> Repair -> Scout -> Bomber -> Gunner
  let r = await page.evaluate(() => { state.droneSel = 'drones'; const seq = []; for (let i = 0; i < 5; i++) { droneCycle(); seq.push(state.droneSel); } return seq; });
  ok(r.join() === 'dr_shield,dr_repair,dr_scout,dr_bomber,drones', 'type button cycles through the five types', r.join());
  // only owned types are offered; the button is hidden with a single type
  r = await page.evaluate(() => { __battle(0, []); droneUi(); return { hidden: $('bDroneType').hidden, own: droneOwned().join() }; });
  ok(r.hidden && r.own === 'drones', 'no types won: type button hidden, only Gunner drones', JSON.stringify(r));
  r = await page.evaluate(() => { __battle(0, ['dr_scout']); const n = $('bDroneType').getBoundingClientRect(); return { hidden: $('bDroneType').hidden, w: n.width, h: n.height, wd: $('bDrones').getBoundingClientRect().height }; });
  ok(!r.hidden && r.w >= 44 && r.h >= 44 && r.wd >= 44, 'type button and Drones button are at least 44 px', JSON.stringify(r));
  // an unwon type cannot be bought (falls back to Gunner)
  r = await page.evaluate(() => { __battle(0, []); state.droneSel = 'dr_bomber'; state.cereal[BLUE] = 100; drones(); return { b: __count('dbomber', BLUE), g: __count('drone', BLUE) }; });
  ok(r.b === 0 && r.g === 3, 'a type you have not won cannot be bought (Gunners instead)', JSON.stringify(r));
  // not enough cereal
  r = await page.evaluate(() => { __battle(0, ['dr_shield']); state.droneSel = 'dr_shield'; state.cereal[BLUE] = 24; drones(); return { n: __count('dshield', BLUE), c: state.cereal[BLUE] }; });
  ok(r.n === 0 && r.c === 24, 'not enough cereal: nothing bought, nothing paid');
  // drone cap outside level 6 (12 per side)
  r = await page.evaluate(() => { __battle(0, ['dr_scout']); state.cereal[BLUE] = 999; for (let i = 0; i < 12; i++) drones(); return { n: droneCount(BLUE), cap: DRONE_CAP }; });
  ok(r.n <= r.cap && r.n >= 9, `drone limit respected (${r.n} of ${r.cap})`);
  // level 6: ARMY_CAP counts drones; armyOf correct
  r = await page.evaluate(() => {
    __battle(5, ['dr_scout', 'dr_repair']); state.cereal[BLUE] = 9999; state.droneSel = 'dr_scout';
    const before = armyOf(BLUE); drones(); const after = armyOf(BLUE);
    let guard = 0; while (armyOf(BLUE) + 2 <= ARMY_CAP && guard++ < 40) drones();
    const full = armyOf(BLUE), c0 = state.cereal[BLUE]; drones();
    return { before, after, full, refused: state.cereal[BLUE] === c0 && armyOf(BLUE) === full, cap: ARMY_CAP };
  });
  ok(r.after - r.before === 2 && r.full <= r.cap && r.refused, `level 6: scouts count in armyOf (+2), the cap ${r.cap} stops buying at ${r.full}`, JSON.stringify(r));

  // ---- shield absorbs
  await page.evaluate(() => __battle(0, ['dr_shield']));
  r = await page.evaluate(() => {
    const p = state.player; state.droneSel = 'dr_shield'; drones(); __tick(240);
    const sh = entities.filter((e) => e.type === 'dshield' && e.team === BLUE);
    const guards = sh.map((s) => s.guard && s.guard.kind);
    const near = sh.every((s) => s.guard && Math.hypot(s.x - s.guard.x, s.z - s.guard.z) < (s.guard.r || 2) + 6);
    const hp0 = p.hp, sh0 = sh.reduce((a, s) => a + s.hp, 0);
    const myGuard = sh.filter((s) => s.guard === p);
    if (!myGuard.length) { for (const s of sh) droneGuard(s, p); }
    hurt(p, 20, RED, WEAPONS.mg);
    const hp1 = p.hp, sh1 = sh.reduce((a, s) => a + s.hp, 0);
    return { guards, near, hpLost: hp0 - hp1, shLost: sh0 - sh1 };
  });
  ok(r.near, 'shield drones hover beside what they guard', JSON.stringify(r.guards));
  ok(r.hpLost === 0 && r.shLost > 15, `a hit on your car is soaked by the shield drones (car lost ${r.hpLost}, shields lost ${r.shLost.toFixed(1)})`);
  r = await page.evaluate(() => { // an enemy hit is not soaked by our shields; a shield drone pops when its hp is gone; the rest passes through
    const p = state.player, sh = entities.filter((e) => e.type === 'dshield' && e.team === BLUE);
    for (const s of sh) droneGuard(s, p);
    const total = sh.reduce((a, s) => a + s.hp, 0), hp0 = p.hp;
    hurt(p, total + 30, RED, WEAPONS.mg);
    return { dead: sh.filter((s) => s.hp <= 0.02 || entities.indexOf(s) < 0).length, hpLost: hp0 - p.hp, total };
  });
  ok(r.dead === 2 && Math.abs(r.hpLost - 30) < 0.5, `a big hit pops both shield drones and the leftover (30) reaches the car`, JSON.stringify(r));
  r = await page.evaluate(() => { // a turret and the toy box can be guarded too; hob/null damage ignores shields
    __battle(0, ['dr_shield']); state.droneSel = 'dr_shield'; state.cereal[BLUE] = 500;
    const t = makeTurret('gun', BLUE, -40, 10); const b = state.bases[BLUE];
    drones(); drones();
    const sh = entities.filter((e) => e.type === 'dshield' && e.team === BLUE);
    droneGuard(sh[0], t); droneGuard(sh[1], b);
    const t0 = t.hp, b0 = b.hp, s0 = sh[0].hp, s1 = sh[1].hp;
    hurt(t, 10, RED, WEAPONS.mg); hurt(b, 100, RED, WEAPONS.mg); // (mg hits a toy box for a third)
    const nullHit = (() => { const h = t.hp; hurt(t, 5, null); return h - t.hp; })();
    return { tLost: t0 - t.hp - nullHit, bLost: b0 - b.hp, s0: s0 - sh[0].hp, s1: s1 - sh[1].hp, nullHit };
  });
  ok(r.tLost === 0 && r.s0 >= 9.9, 'a guarded turret takes no damage while its shield lives', JSON.stringify(r));
  ok(r.bLost === 0 && r.s1 > 0, 'a guarded toy box takes no damage while its shield lives', JSON.stringify(r));
  ok(r.nullHit === 5, 'damage with no attacker (hot hob rings) goes straight through');

  // ---- repair heals friends only
  await page.evaluate(() => __battle(0, ['dr_repair']));
  r = await page.evaluate(() => {
    const myT = makeTurret('gun', BLUE, -30, 12), foeT = makeTurret('gun', RED, 30, 12), myW = entities.find((e) => e.kind === 'worker' && e.team === BLUE), foeW = entities.find((e) => e.kind === 'worker' && e.team === RED);
    const myB = state.bases[BLUE], foeB = state.bases[RED];
    myT.hp = 40; foeT.hp = 40; myW.hp = myW.maxHp * 0.3; foeW.hp = foeW.maxHp * 0.3; myB.hp = myB.maxHp * 0.5; foeB.hp = foeB.maxHp * 0.5;
    const before = { myT: myT.hp, foeT: foeT.hp, myW: myW.hp, foeW: foeW.hp, myB: myB.hp, foeB: foeB.hp };
    state.cereal[RED] = 0; // no enemy drones/turret purchases during this check
    state.droneSel = 'dr_repair'; drones();
    // keep the enemy from hurting anything: freeze their units' weapons by removing them
    for (const e of entities) if ((e.kind === 'unit' || e.kind === 'worker') && e.team === RED) { e.vx = e.vz = 0; }
    __tick(60 * 25);
    const post = { myT: myT.hp, foeT: foeT.hp, myW: myW.hp, foeW: foeW.hp, myB: myB.hp, foeB: foeB.hp };
    const rate = (post.myT - before.myT) / 25;
    return { before, post, rate, maxT: myT.maxHp };
  });
  ok(r.post.myT > r.before.myT + 20 && r.rate < 15, `repair drones heal your turret slowly (${r.before.myT} -> ${r.post.myT.toFixed(0)} in 25 s)`);
  ok(r.post.myB > r.before.myB, 'repair drones heal your toy box', `${r.before.myB} -> ${r.post.myB.toFixed(0)}`);
  ok(r.post.myW > r.before.myW, 'repair drones heal your truck/digger', `${r.before.myW.toFixed(0)} -> ${r.post.myW.toFixed(0)}`);
  ok(r.post.foeT <= r.before.foeT && r.post.foeB <= r.before.foeB && r.post.foeW <= r.before.foeW + 0.001, 'repair drones never heal the enemy', JSON.stringify({ foe: [r.before.foeT, r.post.foeT, r.before.foeB, r.post.foeB] }));

  // ---- bomber damages buildings
  await page.evaluate(() => __battle(0, ['dr_bomber']));
  r = await page.evaluate(() => {
    const foeT = makeTurret('gun', RED, 40, 0), foeB = state.bases[RED];
    foeT.weapon.dmg = 0; foeB.weapon.dmg = 0; // look at the bombs only (the real turret would also shoot the drones; checked by the guns being left alone in 'play')
    const t0 = foeT.hp, b0 = foeB.hp;
    state.droneSel = 'dr_bomber'; drones();
    for (let i = 0; i < 30; i++) { for (const e of entities) if (e.team === RED && e.kind === 'unit') e.hp = 0; state.cereal[RED] = 0; __tick(60); } // (the enemy's own cars would shoot the bombers down: keep them out of this check)
    const bombers = entities.filter((e) => e.type === 'dbomber' && e.team === BLUE).length;
    return { tLost: t0 - foeT.hp, bLost: b0 - foeB.hp, gone: foeT.hp <= 0, bombers };
  });
  ok(r.tLost > 0 || r.gone, `bomber drones damage the enemy turret (lost ${r.tLost.toFixed(0)}${r.gone ? ', destroyed' : ''})`);
  r = await page.evaluate(() => { // then the toy box (turret gone)
    const foeB = state.bases[RED]; foeB.weapon.dmg = 0; const b0 = foeB.hp;
    for (const e of entities) if (e.kind === 'turret' && e.team === RED) e.hp = 0;
    for (let i = 0; i < 30; i++) { for (const e of entities) if (e.team === RED && e.kind === 'unit') e.hp = 0; state.cereal[RED] = 0; __tick(60); }
    return { bLost: b0 - foeB.hp };
  });
  ok(r.bLost > 20, `bomber drones go on to bomb the toy box (lost ${r.bLost.toFixed(0)})`);
  r = await page.evaluate(() => { // our own things are never hit by our crumbs
    const myT = makeTurret('gun', BLUE, -20, 0), t0 = myT.hp; bombBlast({ x: -20, z: 0, y: 0, team: BLUE, dmg: DRN.bomb.dmg, splash: DRN.bomb.splash, vsT: DRN.bomb.vsT }); return { lost: t0 - myT.hp };
  });
  ok(r.lost === 0, 'a bomber\'s crumb bomb does not hurt your own turret');

  // ---- scout reveals in the dark (level 3) and extends turret sight
  await page.evaluate(() => __battle(2, ['dr_scout', 'laser']));
  r = await page.evaluate(() => {
    for (const e of entities) if (e.team === RED && e.kind === 'unit') e.hp = 0;
    state.player.x = -52; state.player.z = 0; __tick(30); render(1 / 60);
    let spot = null; // a dark corner: no lit circle reaches it
    for (let x = 0; x < 60 && !spot; x += 4) for (let z = -40; z <= 40 && !spot; z += 4) { const q = { x, z }; if (!isLit(q)) spot = q; }
    const foe = spawnUnit('scout', RED, spot.x, spot.z); foe.vx = foe.vz = 0; foe.think = 999; foe.speed = 0;
    __tick(60); render(1 / 60); // (the dark rule runs in render)
    const hiddenBefore = foe.mesh.visible === false; window.__dbg = { vis: foe.mesh.visible, lit: isLit(foe), spot, dark: darkNow(), seenT: foe.seenT, flash: foe.flashT, t: state.time };
    state.droneSel = 'dr_scout'; drones();
    const sc = entities.filter((e) => e.type === 'dscout' && e.team === BLUE);
    for (const s of sc) { s.x = spot.x - 6; s.z = spot.z; s.vx = s.vz = 0; s.alt = 5.5; }
    // keep the scouts where they are for the check (they would drift to you): pin their goal by holding think
    let seen = false;
    for (let i = 0; i < 30; i++) { for (const s of sc) { s.x = spot.x - 6; s.z = spot.z; } __tick(1); render(1 / 60); }
    seen = foe.mesh.visible === true;
    // and a scout is a wide lantern
    return { hiddenBefore, seen, lit: litN, dbg: window.__dbg };
  });
  ok(r.hiddenBefore, 'level 3: an enemy car far from every light is hidden', JSON.stringify(r.dbg));
  ok(r.seen, 'level 3: a scout drone near it reveals it');
  r = await page.evaluate(() => { // scouts let a turret see a quarter further
    __battle(0, ['dr_scout']);
    const t = makeTurret('gun', BLUE, -20, 0);
    const foe = spawnUnit('scout', RED, -20 + t.weapon.range * 1.15, 0); foe.speed = 0; foe.think = 999;
    for (const e of entities) if (e !== foe && e.team === RED && e.kind === 'unit') e.hp = 0;
    const far = turretTarget(t) === foe;
    state.droneSel = 'dr_scout'; drones();
    const sc = entities.filter((e) => e.type === 'dscout' && e.team === BLUE);
    for (const s of sc) { s.x = foe.x - 10; s.z = 0; }
    for (let i = 0; i < 20; i++) { for (const s of sc) { s.x = foe.x - 10; s.z = 0; } __tick(1); }
    return { far, withScout: turretTarget(t) === foe, range: t.weapon.range };
  });
  ok(!r.far && r.withScout, `a scout nearby lets a turret target 1.15 x its range (${r.range})`, JSON.stringify(r));
  await page.context().close();
}

// ---------------------------------------------------------------- ai
async function sectionAi() {
  console.log('[ai] the enemy builds drones');
  const page = await openPage();
  for (let lv = 0; lv < 6; lv++) {
    const r = await page.evaluate((lv) => {
      __battle(lv, []); state.cereal[RED] = 400;
      const log = {}; const sp0 = spawnUnit; spawnUnit = (type, team, x, z) => { if (team === RED) log[type] = (log[type] || 0) + 1; return sp0(type, team, x, z); };
      for (let i = 0; i < 60 * 130; i++) { state.dt = 1 / 60; if (i % 600 === 0) state.cereal[RED] = Math.max(state.cereal[RED], 400); window.__U(1 / 60); if (state.over) break; }
      spawnUnit = sp0;
      return { army: armyOf(RED), gunners: log.drone || 0, types: ['dshield', 'drepair', 'dscout', 'dbomber'].filter((t) => log[t]), seen: state.aiTypes || null, over: state.over, load: [...state.aiLoad].filter((x) => x.startsWith('dr_')) };
    }, lv);
    console.log(`  level ${lv + 1}: enemy Gunners ${r.gunners}, types ${r.types.join(',') || '-'} (its loadout: ${r.load.join(',') || '-'})`);
    ok(r.gunners > 0 || r.over || (lv === 5 && r.army >= 20), `level ${lv + 1}: the enemy builds Gunner drones`, `(its army ${r.army})`);
    for (const t of r.types) ok(r.load.some((l) => DR_UNIT_OF[l] === t), `level ${lv + 1}: enemy type ${t} is in its loadout`);
  }
  await page.context().close();
}
const DR_UNIT_OF = { dr_shield: 'dshield', dr_repair: 'drepair', dr_scout: 'dscout', dr_bomber: 'dbomber' };

// ---------------------------------------------------------------- play
async function sectionPlay() {
  console.log(`[play] ${SECS} s of play on every level`);
  const page = await openPage();
  for (let lv = 0; lv < 6; lv++) {
    const e0 = errors.length;
    const r = await page.evaluate(([lv, secs]) => {
      __battle(lv, LOADOUTS[lv].pool.filter((id) => id.startsWith('dr_')), 200);
      const types = droneOwned(); let bought = 0, t = 0;
      const p = state.player;
      for (let i = 0; i < 60 * secs; i++) {
        state.dt = 1 / 60;
        if (i % 120 === 0) { // buy a drone type in turn, keep driving to the middle
          state.cereal[BLUE] = Math.max(state.cereal[BLUE], 60); state.droneSel = types[bought % types.length]; const n = entities.length; drones(); if (entities.length > n) bought++;
        }
        if (i % 6 === 0) { p.vx = 0; }
        input.x = Math.sin(i / 90); input.z = Math.cos(i / 130); input.fire = (i % 300) < 150;
        window.__U(1 / 60);
        if (i % 20 === 0) render(1 / 60);
        if (state.over) break;
      }
      input.x = input.z = 0; input.fire = false;
      return { t: state.time, over: state.over, bought, blueDrones: droneCount(BLUE), redDrones: droneCount(RED), army: armyOf(BLUE), cap: ARMY_CAP, fin: !!state.finale, geo: renderer.info.memory.geometries };
    }, [lv, SECS]);
    console.log(`  level ${lv + 1}: ${r.t.toFixed(0)} s, bought ${r.bought} drone batches, blue drones ${r.blueDrones}, red drones ${r.redDrones}, geometries ${r.geo}${r.over ? ' (game ended)' : ''}`);
    ok(errors.length === e0, `level ${lv + 1}: ${SECS} s with 0 page errors`, errors.slice(e0).join(' | '));
    ok(r.bought >= 2, `level ${lv + 1}: drones were bought during play`);
    ok(!r.fin || r.army <= r.cap, `level ${lv + 1}: army within the cap`, `${r.army}/${r.cap}`);
  }
  await page.context().close();
}

// ---------------------------------------------------------------- memory
async function sectionMemory() {
  console.log('[memory] geometries over race -> level -> race cycles');
  const page = await openPage();
  const geo = [];
  for (let cyc = 0; cyc < 3; cyc++) {
    for (let lv = 0; lv < 6; lv++) {
      await page.evaluate((lv) => {
        curLevel = lv; start(); $('talk').hidden = true; lrIntro(); skipRace(); lrStartGo();
        // all drone types out for a few seconds
        state.cereal = [500, 500];
        for (const id of droneOwned()) { state.droneSel = id; drones(); }
        for (const id of ['dr_shield', 'dr_repair', 'dr_scout', 'dr_bomber']) { state.load?.add(id); }
        for (const id of ['dr_shield', 'dr_repair', 'dr_scout', 'dr_bomber']) { state.droneSel = id; drones(); }
        __tick(60 * 4);
      }, lv);
    }
    await page.evaluate(() => { curLevel = 0; start(); $('talk').hidden = true; });
    geo.push(await page.evaluate(() => ({ g: renderer.info.memory.geometries, tex: renderer.info.memory.textures, kids: scene.children.length })));
  }
  console.log('  after each cycle:', geo.map((x) => `geo ${x.g} tex ${x.tex} children ${x.kids}`).join(' | '));
  ok(geo[2].g === geo[1].g && geo[1].g === geo[0].g, 'geometry count is flat from cycle to cycle', geo.map((x) => x.g).join(','));
  ok(geo[2].kids === geo[1].kids, 'scene children flat', geo.map((x) => x.kids).join(','));
  await page.context().close();
}

// ---------------------------------------------------------------- race choice
async function sectionRace() {
  console.log('[race] the race choice');
  let page = await openPage();
  // the card shows the three choices; Kitchen Run is the default
  let r = await page.evaluate(() => { curLevel = 0; start(); $('talk').hidden = true; lrIntro(); return { sel: [...document.querySelectorAll('#lrModes .sel')].map((b) => b.dataset.mode), n: document.querySelectorAll('#lrModes button').length, go: $('lrGo').textContent, vis: !$('lrIntro').hidden }; });
  ok(r.n === 3 && r.sel.join() === 'kitchen' && r.vis, 'intro card: three choices, Kitchen Run selected by default', JSON.stringify(r));
  const sz = await page.evaluate(() => [...document.querySelectorAll('#lrModes button, #lrGo')].map((b) => { const q = b.getBoundingClientRect(); return Math.min(q.width, q.height); }));
  ok(sz.every((x) => x >= 44), 'choice buttons and GO are at least 44 px', sz.join());
  // Kitchen Run: GO starts the race, tokens exist, finish gives the loadout card
  await page.click('#lrGo');
  r = await page.evaluate(() => ({ kr: !!state.race.kr, intro: state.race.intro, tokens: state.race.tokens.length, hudHidden: $('raceHud').hidden }));
  ok(r.kr && !r.intro && r.tokens > 0, 'Kitchen Run: GO starts the race with tokens', JSON.stringify(r));
  await page.evaluate(() => { const R = state.race; R.carried.push('dr_shield'); finishRace(state.player); });
  await page.waitForFunction(() => !$('lrCard').hidden);
  r = await page.evaluate(() => [...$('lrTiles').querySelectorAll('b')].map((b) => b.textContent));
  ok(r.some((x) => /Shield drones/.test(x)) && r.some((x) => /Gunner drones/.test(x)), 'Kitchen Run finish: the card shows the won Shield drones and the standard Gunner drones', r.join('|'));
  await page.click('#lrStart');
  await page.waitForFunction(() => state.phase === 'battle' && !state.race);
  r = await page.evaluate(() => ({ stage: !!stageL, type: !$('bDroneType').hidden, tools: [...state.load].join() }));
  ok(!r.stage && r.type, 'Kitchen Run: START builds the real level with the type button shown', JSON.stringify(r));

  // Skip race: choice then GO
  r = await page.evaluate(() => { start(); $('talk').hidden = true; lrIntro(); return true; });
  await page.click('#lrSkip');
  r = await page.evaluate(() => ({ sel: [...document.querySelectorAll('#lrModes .sel')].map((b) => b.dataset.mode).join(), go: $('lrGo').textContent, stored: localStorage.getItem('bb-racemode-v1') }));
  ok(r.sel === 'skip' && r.stored === 'skip' && /SKIP/.test(r.go), 'Skip race: selecting it is remembered and GO becomes SKIP RACE', JSON.stringify(r));
  await page.click('#lrGo');
  await page.waitForFunction(() => !$('lrCard').hidden);
  r = await page.evaluate(() => ({ skipped: state.race.skipped, res: $('lrRes').textContent }));
  ok(r.skipped && /skipped/i.test(r.res), 'Skip race: GO skips to the loadout card', JSON.stringify(r));
  await page.click('#lrStart');
  await page.waitForFunction(() => state.phase === 'battle' && !state.race);

  // remembered across a reload
  await page.reload(); await page.waitForFunction(() => typeof update === 'function' && state && state.player);
  r = await page.evaluate(() => { curLevel = 0; start(); $('talk').hidden = true; lrIntro(); return [...document.querySelectorAll('#lrModes .sel')].map((b) => b.dataset.mode).join(); });
  ok(r === 'skip', 'the choice is remembered after a reload', r);
  await page.context().close();

  // Classic on level 1
  page = await openPage({ 'bb-racemode-v1': 'classic' });
  r = await page.evaluate(() => { curLevel = 0; start(); $('talk').hidden = true; lrIntro(); return { sel: [...document.querySelectorAll('#lrModes .sel')].map((b) => b.dataset.mode).join(), title: $('lrTitle').textContent, text: $('lrText').textContent.slice(0, 60) }; });
  ok(r.sel === 'classic', 'a stored Classic choice is shown selected', JSON.stringify(r));
  await page.click('#lrGo');
  r = await page.evaluate(() => { const R = state.race; return { classic: R.classic, kr: !!R.kr, crates: R.crates.length, spots: R.spots.length, tokens: R.tokens.length, laps: R.laps, stage: !!stageL, intro: R.intro, phase: state.phase, workers: entities.filter((e) => e.kind === 'worker').length, level: state.level.name, rivals: R.rivals.length }; });
  ok(r.classic && !r.kr && r.crates === 8 && r.tokens === 0 && r.laps === 2 && !r.stage && r.rivals === 3 && r.workers === 0, 'level 1 Classic: the real table, 8 boxes, 2 laps, 3 rivals, no tokens, no workers yet', JSON.stringify(r));
  // drive it: an autopilot that picks up a box, drops it near home, laps the track
  r = await page.evaluate(() => {
    const R = state.race, p = state.player, T = R.track, n = T.n;
    window.__classicBot = () => {
      let best = 0, bd = 1e9; for (let j = 0; j < n; j++) { const d = (p.x - T.pts[j][0]) ** 2 + (p.z - T.pts[j][1]) ** 2; if (d < bd) { bd = d; best = j; } }
      const la = (best + 4) % n; let gx = T.pts[la][0], gz = T.pts[la][1];
      if (!p.carry) { const c = R.crates.find((b) => b.state === 'idle' && Math.hypot(b.x - p.x, b.z - p.z) < 14); if (c) { gx = c.x; gz = c.z; } }
      const dx = gx - p.x, dz = gz - p.z, d = Math.hypot(dx, dz) || 1; input.x = dx / d; input.z = dz / d;
    };
    let carried = 0, dropped = 0, t = 0;
    for (; t < 60 * 120 && state.phase === 'race'; t++) {
      state.dt = 1 / 60;
      if (t % 5 === 0) window.__classicBot();
      if (R.hold <= 0 && p.carry && !carried) { carried = 1; }
      if (p.carry && Math.hypot(p.x + 48, p.z) < 14 && R.hold <= 0) { dropCrate(p); dropped++; }
      window.__U(1 / 60);
    }
    input.x = input.z = 0;
    return { t: t / 60, phase: state.phase, carried, dropped, winner: R.winner && (R.winner === p ? 'you' : R.winner.name), passed: p.passed, crates: R.crates.filter((c) => c.state === 'dropped').length };
  });
  console.log('  classic lap bot:', JSON.stringify(r));
  ok(r.phase === 'countdown' || r.phase === 'battle', 'level 1 Classic: the race finishes by itself', JSON.stringify(r));
  r = await page.evaluate(() => { __tick(60 * 5); return { phase: state.phase, race: !!state.race, workers: entities.filter((e) => e.kind === 'worker').length, turrets: entities.filter((e) => e.kind === 'turret').length, load: state.load ? [...state.load].join() : null, cereal: state.cereal.map(Math.round), dronesBtn: $('bDrones').offsetParent !== null }; });
  ok(r.phase === 'battle' && !r.race && r.workers >= 4, 'level 1 Classic: after the countdown it is a battle with the workers spawned', JSON.stringify(r));
  ok(r.load && r.load.includes('drones') && r.dronesBtn, 'level 1 Classic: Gunner drones in the loadout, button visible', r.load);
  // classic skip button mid-race, and Classic on level 1 again, with the HUD Skip race
  r = await page.evaluate(() => { curLevel = 0; classicNext = true; reset(); const R = state.race; R.intro = false; R.hold = 0; __tick(30); skipRace(); return { phase: state.phase, race: !!state.race, workers: entities.filter((e) => e.kind === 'worker').length, px: state.player.x }; });
  ok(r.phase === 'battle' && !r.race && r.workers === 4 && r.px < -40, 'Classic: the HUD Skip race goes straight to the battle', JSON.stringify(r));
  await page.context().close();

  // classic on every level where it is offered; unavailable ones say so
  page = await openPage();
  for (let lv = 0; lv < 6; lv++) {
    const e0 = errors.length;
    const r = await page.evaluate((lv) => {
      curLevel = lv; start(); $('talk').hidden = true; raceMode = 'classic'; lrIntro();
      const ok = classicOk(lv), note = $('lrModeNote').textContent, dis = $('lrModeClassic').getAttribute('aria-disabled'), sel = [...document.querySelectorAll('#lrModes .sel')].map((b) => b.dataset.mode).join();
      if (!ok) { document.getElementById('lrModeClassic').click(); return { ok, note, dis, sel, still: curMode() }; }
      document.getElementById('lrGo').click();
      const R = state.race;
      const spots = R.spots.length, t = R.track, bad = [];
      // the circuit is clear of the real level
      for (let j = 0; j < t.n; j++) for (const o of obstacles) { if (o.kind === 'turret' || o.kind === 'base') continue; const dx = Math.abs(t.pts[j][0] - o.x) - o.w / 2, dz = Math.abs(t.pts[j][1] - o.z) - o.d / 2; if (Math.max(dx, dz) < 2.2) { bad.push([t.pts[j][0] | 0, t.pts[j][1] | 0]); break; } }
      return { ok, classic: R.classic, spots, laps: R.laps, level: curLevel, blocked: bad.length, firstBad: bad[0] || null, dark: !!state.level.dark, water: !!state.water };
    }, lv);
    if (!r.ok) { ok(!!r.note && r.dis === 'true' && r.sel === 'kitchen' && r.still === 'kitchen', `level ${lv + 1}: Classic is not offered, the card says why and falls back to the Kitchen Run`, JSON.stringify(r)); continue; }
    ok(r.classic && r.spots === 8 && r.blocked === 0, `level ${lv + 1}: Classic race starts on the real table (8 boxes), circuit clear of obstacles`, JSON.stringify(r));
    // run the race to the end with the rivals only (the player idles): it must finish, then the battle starts
    const f = await page.evaluate(() => {
      const R = state.race; R.hold = 0; let t = 0;
      for (; t < 60 * 200 && state.phase === 'race'; t++) { state.dt = 1 / 60; window.__U(1 / 60); if (t % 30 === 0) render(1 / 60); }
      const finished = state.phase !== 'race';
      for (let i = 0; i < 60 * 6 && state.phase !== 'battle'; i++) { state.dt = 1 / 60; window.__U(1 / 60); }
      __tick(60 * 3);
      return { finished, secs: t / 60, phase: state.phase, workers: entities.filter((e) => e.kind === 'worker').length, turrets: entities.filter((e) => e.kind === 'turret' && e.type !== 'wall').length, over: state.over, load: [...state.load].filter((x) => x.startsWith('dr_')).join() };
    });
    console.log(`  level ${lv + 1} classic: ${JSON.stringify(f)}`);
    ok(f.finished && f.phase === 'battle' && f.workers >= 4, `level ${lv + 1}: the Classic race finishes and the battle starts`, JSON.stringify(f));
    ok(errors.length === e0, `level ${lv + 1}: Classic race with 0 page errors`, errors.slice(e0).join('|'));
  }
  // the other modes still work afterwards: Kitchen Run, My Track (smoke), drift (smoke)
  const e0 = errors.length;
  let r2 = await page.evaluate(() => { raceMode = 'kitchen'; curLevel = 2; start(); $('talk').hidden = true; lrIntro(); document.getElementById('lrGo').click(); const R = state.race; for (let i = 0; i < 60 * 3; i++) { state.dt = 1 / 60; window.__U(1 / 60); } return { kr: !!R.kr, phase: state.phase }; });
  ok(r2.kr && r2.phase === 'race', 'Kitchen Run still works after a Classic race', JSON.stringify(r2));
  r2 = await page.evaluate(() => { try { driftOn = true; curLevel = 0; reset(); const R = state.race; for (let i = 0; i < 60; i++) { state.dt = 1 / 60; window.__U(1 / 60); } return { drift: !!R.drift }; } catch (e) { return { err: String(e) }; } });
  ok(r2.drift, 'drift mode still starts', JSON.stringify(r2));
  ok(errors.length === e0, 'no page errors in the follow-up modes', errors.slice(e0).join('|'));
  await page.context().close();
}

// ---------------------------------------------------------------- screenshots
async function sectionShots() {
  console.log('[shots] screenshots');
  const page = await openPage();
  const dir = path.join(__dirname, 'shots');
  const snap = async (name) => { await page.evaluate(() => { for (let i = 0; i < 60; i++) render(1 / 60); }); await page.screenshot({ path: path.join(dir, name) }); console.log(`  ${name}`); };
  // intro card: Kitchen selected on level 1, and level 4 with Classic unavailable
  await page.evaluate(() => { curLevel = 0; start(); $('talk').hidden = true; lrIntro(); });
  await page.waitForTimeout(300); await snap('drone-intro-l1.png');
  await page.evaluate(() => { curLevel = 3; start(); $('talk').hidden = true; lrIntro(); });
  await page.waitForTimeout(300); await snap('drone-intro-l4.png');
  // each type, hovering in a battle with the camera over it
  const setup = async (lv, tools) => { await page.evaluate(([lv, tools]) => { __battle(lv, tools); state.cereal[BLUE] = 500; }, [lv, tools]); };
  await setup(0, ['dr_shield', 'dr_repair', 'dr_scout', 'dr_bomber']);
  await page.evaluate(() => {
    const p = state.player; p.x = -20; p.z = 2; p.heading = 0;
    for (const e of entities) if (e.team === RED && e.kind === 'unit') e.hp = 0;
    const t = makeTurret('gun', BLUE, -14, -8); t.hp = 60;
    for (const id of ['dr_shield', 'dr_repair', 'dr_scout', 'dr_bomber', 'drones']) { state.droneSel = id; drones(); }
    const spots = { shield: [-14, 6], repair: [-26, -4], scout: [-8, 2], bomber: [-26, 8] };
    const gun = entities.filter((e) => e.type === 'drone' && e.team === BLUE);
    gun.forEach((u, i) => { u.x = -16 + i * 3; u.z = 12; u.speed = 0; });
    for (const u of entities.filter((e) => e.dr && e.team === BLUE)) { const s = spots[u.dr]; u.x = s[0]; u.z = s[1]; u.speed = 0; u.vx = u.vz = 0; u.heading = 0; u.alt = DRN.alt[u.dr]; u.think = 999; }
    window.__keep = () => { for (const u of entities.filter((e) => e.dr && e.team === BLUE)) { const s = spots[u.dr]; u.x = s[0]; u.z = s[1]; } };
  });
  await page.evaluate(() => { for (let i = 0; i < 90; i++) { window.__keep(); render(1 / 60); } });
  await snap('drone-types-l1.png');
  await snap('drone-bar-l1.png');
  await page.context().close();
}

try {
  if (want('buttons')) await sectionButtons();
  if (want('types')) await sectionTypes();
  if (want('ai')) await sectionAi();
  if (want('play')) await sectionPlay();
  if (want('memory')) await sectionMemory();
  if (want('race')) await sectionRace();
  if (SHOTS) await sectionShots();
} catch (e) { fails++; console.log('  EXCEPTION', e.message); }
ok(errors.length === 0, 'no page errors anywhere', errors.slice(0, 5).join(' | '));
await browser.close();
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
