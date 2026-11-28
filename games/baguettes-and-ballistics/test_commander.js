// Visible enemy commander test (Playwright, Chromium software GL).
//   NODE_PATH=$(npm root -g) node test_commander.js [path/to/index.html] [--only=order,danger,life,jobs,parity,play,memory] [--runs=6] [--secs=120] [--shots] [--v]
// The real-time loop is frozen and update(1/60) is stepped by hand, so every number is repeatable. Sections:
//   order   levels 1 to 5, 4 minutes each: every red turret (and upgrade, and toaster launcher) appears with the commander alive and standing beside it
//           (never while it is elsewhere); it really drives (it was far from the box at some point); the build crate shows during the build moment
//   danger  the commander's route round your turret's reach costs less reach than the plain shortest route
//   life    shield for the first 60 s, hp and hits, flees when hurt and mends at its box, dies (spill, banner, 12 s down, queue paused, toast when back)
//   jobs    upgrade (drives next to the turret first), claiming a bottle cap, riding along on a raid
//   parity  turrets at minute 3 and 6, upgrades, cereal spent and cars, commander ON vs the old invisible one (?nocmd), levels 1 to 5, --runs each: within 15 %
//   play    SECS (default 120) of play on all six levels (level 6 has no commander), 0 page errors
//   memory  geometry count flat over level -> level cycles, with the commander dying and coming back
// Exit code 0 only if every check passes. --shots writes PNGs to shots/ (commander building a turret, commander destroyed).
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const path = require('path');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const html = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(__dirname, 'index.html'));
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const ONLY = opt('only', '').split(',').filter(Boolean), SECS = +opt('secs', 120), RUNS = +opt('runs', 6), SHOTS = args.includes('--shots');
const want = (n) => !ONLY.length || ONLY.includes(n);
let fails = 0, passes = 0;
const ok = (c, msg, extra = '') => { if (c) passes++; else { fails++; console.log(`  FAIL ${msg} ${extra}`); } if (c && args.includes('--v')) console.log(`  ok   ${msg} ${extra}`); };
const errors = [];
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
async function openPage() {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const page = await ctx.newPage(); page.setDefaultTimeout(240000);
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_FAILED|net::/.test(m.text())) errors.push(`console: ${m.text()}`); });
  for (let tries = 0; ; tries++) { try { await page.goto(`file://${html}`); break; } catch (e) { if (tries >= 2) throw e; } }
  await page.waitForFunction(() => typeof update === 'function' && state && state.player);
  await page.evaluate(() => {
    window.__U = update; update = () => {}; // freeze the real-time loop; tests call __tick
    window.__tick = (n, dt = 1 / 60) => { for (let i = 0; i < n; i++) { state.dt = dt; window.__U(dt); } };
    window.__battle = (lv, cereal) => { // the real level, the Skip race loadout (what START on the card does)
      curLevel = lv; const L = LOADOUTS[lv];
      pendingLoad = { tools: [...BASICS, ...L.must], ai: [...BASICS, ...L.must, ...L.ai], freeUp: 0, bonus: 0, aiBonus: 0, place: 2 };
      reset(); $('start').hidden = true; $('lrIntro').hidden = true; $('lrCard').hidden = true;
      if (cereal !== undefined) state.cereal = [cereal, cereal];
      state.bases[BLUE].hp = state.bases[BLUE].maxHp = 1e9; // nobody wins while we watch
    };
  });
  return page;
}

// ---------------------------------------------------------------- order
async function sectionOrder() {
  console.log('[order] every turret appears with the commander beside it, levels 1 to 5, 4 minutes each');
  const page = await openPage();
  for (let lv = 0; lv < 5; lv++) {
    const r = await page.evaluate((lv) => {
      CMD_OFF = false; __battle(lv);
      const seen = new Map(), kinds = {}, out = { kinds, built: 0, ups: 0, toasters: 0, badTurret: [], badUp: [], badToaster: [], far: 0, maxFromBox: 0, crate: 0, noCmd: 0, label: 0, jobsAtBuild: 0 };
      let tCount = 0;
      for (let s = 0; s < 240 * 60; s++) {
        __tick(1);
        const C = state.cmd, u = C && C.u;
        if (!C) { out.noCmd++; continue; }
        if (u) out.maxFromBox = Math.max(out.maxFromBox, Math.hypot(u.x - state.bases[RED].x, u.z - state.bases[RED].z));
        if (C.job) kinds[C.job.k] = (kinds[C.job.k] || 0) + 1;
        if (C.building && C.marker.visible) out.crate++;
        if (C.labelT > 0 && /building/.test(C.label)) out.label++;
        for (const e of entities) {
          if (e.kind !== 'turret' || e.team !== RED || e.type === 'wall') continue;
          const prev = seen.get(e);
          if (prev === undefined) { // a new red turret
            seen.set(e, e.level);
            const d = u ? Math.hypot(u.x - e.x, u.z - e.z) : 999;
            out.built++;
            if (!u || d > 9) out.badTurret.push(`${e.type}@${Math.round(e.x)},${Math.round(e.z)} d=${Math.round(d)} t=${Math.round(state.time)}`);
          } else if (e.level > prev) { // upgraded
            seen.set(e, e.level); out.ups++;
            const d = u ? Math.hypot(u.x - e.x, u.z - e.z) : 999;
            if (!u || d > 9) out.badUp.push(`d=${Math.round(d)} t=${Math.round(state.time)}`);
          }
        }
        if (toasters.length !== tCount) {
          const t = toasters[toasters.length - 1];
          if (toasters.length > tCount && t.team === RED) { out.toasters++; const d = u ? Math.hypot(u.x - t.x, u.z - t.z) : 999; if (!u || d > 10) out.badToaster.push(`d=${Math.round(d)}`); }
          tCount = toasters.length;
        }
      }
      out.firstSeen = [...seen.keys()].length;
      return out;
    }, lv);
    console.log(`  level ${lv + 1}: ${r.built} turrets built, ${r.ups} upgrades, ${r.toasters} toasters; farthest from its box ${Math.round(r.maxFromBox)}; crate frames ${r.crate}; job frames ${JSON.stringify(r.kinds)}`);
    ok(r.noCmd === 0, `level ${lv + 1}: the commander exists from the first tick`);
    ok(r.badTurret.length === 0, `level ${lv + 1}: no turret appeared with the commander elsewhere`, r.badTurret.join('; '));
    ok(r.badUp.length === 0, `level ${lv + 1}: no upgrade happened with the commander elsewhere`, r.badUp.join('; '));
    ok(r.badToaster.length === 0, `level ${lv + 1}: the toaster launcher appeared beside the commander`, r.badToaster.join('; '));
    if (lv !== 3) ok(r.built >= 2, `level ${lv + 1}: it built turrets (${r.built})`);
    if (r.built) ok(r.crate > 60 && r.label > 60, `level ${lv + 1}: the build crate and the floating label showed (${r.crate} / ${r.label} frames)`);
    ok(r.built === 0 || r.maxFromBox > 12, `level ${lv + 1}: it really drove out (${Math.round(r.maxFromBox)} from its box)`);
  }
  // level 6 and the old path
  const r6 = await page.evaluate(() => { __battle(5); __tick(300); return { cmd: !!state.cmd, units: entities.filter((e) => e.cmd).length }; });
  ok(!r6.cmd && r6.units === 0, 'level 6: no commander (the squads and the army cap keep the old instant build)');
  const rOff = await page.evaluate(() => { CMD_OFF = true; __battle(0); __tick(90 * 60); const n = entities.filter((e) => e.kind === 'turret' && e.team === RED).length; CMD_OFF = false; return { cmd: !!state.cmd, n }; });
  ok(!rOff.cmd && rOff.n >= 1, `?nocmd keeps the old behaviour (no commander, ${rOff.n} red turrets at 90 s)`);
  await page.context().close();
}

// ---------------------------------------------------------------- danger
async function sectionDanger() {
  console.log('[danger] the route keeps off your turret\'s reach');
  const page = await openPage();
  const r = await page.evaluate(() => {
    CMD_OFF = false; __battle(0, 0); __tick(10);
    const C = state.cmd, u = C.u; navDirty = true; navBuild();
    const p0 = findPath(51, 7, -10, 0, closed), M = p0[1]; // a bend of the plain route: your turret goes right there
    const t = makeTurret('gun', BLUE, M[0], M[1] + 7), R = t.weapon.range; // beside the route, not on it: the plain route does not change, but it is inside the reach
    navDirty = true; navBuild();
    const plain = findPath(51, 7, -10, 0, closed), cost = (cmdDanger(), findPath(51, 7, -10, 0, closed, cmdCost));
    const inside = (P) => { let n = 0, len = 0, a = [51, 7]; for (const b of P) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let k = 0; k < L; k += 1) { const x = a[0] + (b[0] - a[0]) * k / L, z = a[1] + (b[1] - a[1]) * k / L; if (Math.hypot(x - M[0], z - M[1] - 7) < R) n++; } len += L; a = b; } return [n, Math.round(len)]; };
    return { R, plain: inside(plain), cost: inside(cost), nogo: !!cost, pp: JSON.stringify(plain.map(q=>q.map(Math.round))), cp: JSON.stringify(cost.map(q=>q.map(Math.round))) };
  });
  console.log(`  turret reach ${r.R}: plain route ${r.plain[0]} steps in reach (${r.plain[1]} long), commander route ${r.cost[0]} (${r.cost[1]} long)`);
  if (args.includes('--v')) console.log(r.pp, r.cp);
  ok(r.plain[0] > 5, 'the plain route does go through the reach (the test is meaningful)');
  ok(r.cost[0] < r.plain[0] * 0.3, 'the commander route spends far fewer steps in reach');
  await page.context().close();
}

// ---------------------------------------------------------------- life
async function sectionLife() {
  console.log('[life] shield, hits, retreat, destroyed, back');
  const page = await openPage();
  let r = await page.evaluate(() => {
    CMD_OFF = false; __battle(0, 0); __tick(60);
    const u = state.cmd.u, hp0 = u.hp, kinds = entities.filter((e) => e.cmd).length;
    for (let i = 0; i < 20; i++) hurt(u, 10, BLUE, WEAPONS.mg);
    const afterShield = u.hp, bubble = u.bubble.visible;
    state.time += 61; __tick(1);
    return { hp0, afterShield, bubble, kinds, gone: u.bubble.visible, maxHp: u.maxHp, racerHp: VEHICLES.racer.hp, mesh: !!u.mesh.parent };
  });
  ok(r.kinds === 1 && r.mesh, 'one commander car, in the scene');
  ok(r.afterShield === r.hp0 && r.bubble, `first minute: shield takes ${r.hp0 - r.afterShield} of 200 damage, bubble shown`);
  ok(!r.gone, 'the bubble goes after 60 s');
  ok(r.maxHp <= r.racerHp * 1.5 && r.maxHp >= r.racerHp, `hp like a racer (${r.maxHp} vs ${r.racerHp})`);
  // hits after the shield, then retreat and mend
  r = await page.evaluate(() => {
    const C = state.cmd, u = C.u; u.x = 20; u.z = 20; u.vx = u.vz = 0;
    hurt(u, 20, BLUE, WEAPONS.mg); const hit = u.hp;
    u.hp = 20; __tick(2); const mode = u.mode, st = C.status;
    __tick(60 * 25);
    return { hit, mode, st, back: Math.hypot(u.x - C.px, u.z - C.pz), hp: u.hp, now: u.mode };
  });
  ok(r.hit === 60, `a hit takes hp (${r.hit}/80)`);
  ok(r.mode === 'flee' && /retreat/.test(r.st), 'hurt: it retreats to its box');
  ok(r.back < 14 && r.hp >= 72 && r.now !== 'flee', `and mends there (hp ${Math.round(r.hp)}, ${Math.round(r.back)} from the spot)`);
  // destroyed: spill, banner, down 12 s, queue paused, back with a toast
  r = await page.evaluate(() => {
    const C = state.cmd, u = C.u; state.cereal[RED] = 400; state.time = 100; // (aiTime well past the quiet minute)
    const spills0 = spills.length, turrets0 = redTurrets().length, job0 = C.job;
    u.x = 10; u.z = 25;
    hurt(u, 999, BLUE, WEAPONS.mg);
    const banner1 = $('banner').textContent, down = !state.cmd.u, spill = spills.length - spills0;
    state.aiClock = 0; __tick(60 * 11); // eleven seconds
    const still = !state.cmd.u, jobs = state.cmd.job !== job0, turrets1 = redTurrets().length, cars = entities.filter((e) => e.cmd && e.hp > 0).length;
    __tick(60 * 2);
    const back = !!state.cmd.u, toastT = $('toast').textContent, banner2 = $('banner').textContent, hp = state.cmd.u && state.cmd.u.hp, st = state.cmd.u && Math.hypot(state.cmd.u.x - state.bases[RED].x, state.cmd.u.z - state.bases[RED].z);
    return { banner1, down, spill, still, jobs, turrets0, turrets1, cars, back, toastT, banner2, hp, st, ecoDown: null };
  });
  ok(r.down && /DOWN/i.test(r.banner1), 'destroyed: the banner says so', r.banner1);
  ok(r.spill >= 1, 'it drops a cereal spill');
  ok(r.still && !r.jobs && r.turrets1 === r.turrets0 && r.cars === 0, `down for 12 s: nothing built, nothing decided (turrets ${r.turrets0} -> ${r.turrets1})`);
  ok(r.back && /back/i.test(r.banner2) && r.hp === 80 && r.st < 25, `back after about 12 s, full hp, at its box (${Math.round(r.st)} away)`, r.banner2 + ' ' + r.toastT);
  // a real turret of yours shoots it dead (it is a target like any car)
  r = await page.evaluate(() => {
    const C = state.cmd, u = C.u; state.time = 200; u.shieldT = 0;
    u.x = 0; u.z = -30; u.vx = u.vz = 0; C.job = null; C.u.mode = 'patrol'; C.patX = u.x; C.patZ = u.z; C.modeT = 99;
    const t = makeTurret('gun', BLUE, 6, -30); let hits = 0, died = false;
    for (let i = 0; i < 60 * 12; i++) { const h = state.cmd.u ? state.cmd.u.hp : 0; __tick(1); if (!state.cmd.u) { died = true; break; } if (state.cmd.u.hp < h) hits++; }
    return { hits, died, hp: state.cmd.u && state.cmd.u.hp };
  });
  ok(r.died || r.hits > 0, `your turret can shoot it (${r.hits} hits, ${r.died ? 'died' : 'fled'})`);
  await page.context().close();
}


// ---------------------------------------------------------------- jobs
async function sectionJobs() {
  console.log('[jobs] upgrade, claim a cap, ride on a raid');
  const page = await openPage();
  let r = await page.evaluate(() => {
    CMD_OFF = false; __battle(0, 0); __tick(300);
    const C = state.cmd; state.time = 200; state.cereal[RED] = 500;
    for (const t of redTurrets()) { t.hp = 0; } __tick(2);
    const ts = RED_HOME.map(([x, z]) => makeTurret('gun', RED, x, z)); // the three home turrets stand: the next decision is an upgrade
    const lv0 = ts.map((t) => t.level), c0 = state.cereal[RED], rnd = Math.random; Math.random = () => 0.01;
    let job = null, d = 999, levelled = null;
    for (let i = 0; i < 60 * 60 && !levelled; i++) {
      __tick(1);
      if (C.job && C.job.k === 'upgrade') { job = C.job; }
      const t = ts.find((q, k) => q.level > lv0[k]);
      if (t) { levelled = t; d = Math.hypot(C.u.x - t.x, C.u.z - t.z); }
    }
    Math.random = rnd;
    return { job: !!job, levelled: !!levelled, d, paid: c0 - state.cereal[RED] };
  });
  ok(r.job && r.levelled && r.d < 9, `upgrade: the commander drove up and the turret levelled with it beside it (${Math.round(r.d)} away)`, JSON.stringify(r));
  r = await page.evaluate(() => {
    CMD_OFF = false; __battle(0, 0); __tick(10);
    const C = state.cmd, o = outposts.find((q) => q.x > 0) || outposts[0]; o.owner = -1; o.progress = 0; C.claimAt = 0; state.time = 200; state.cereal[RED] = 0;
    RED_HOME.map(([x, z]) => makeTurret('gun', RED, x, z)); // nothing else to build
    while (workersOf(RED, 'truck').length < 4) spawnWorker('truck', RED); while (workersOf(RED, 'digger').length < 3) spawnWorker('digger', RED); // (the economy comes first in commander())
    for (const q of outposts) if (q !== o) q.cmdBad = 1e9;
    let seen = false, near = false;
    for (let i = 0; i < 60 * 80; i++) { __tick(1); if (C.job && C.job.k === 'claim') { seen = true; if (Math.hypot(C.u.x - o.x, C.u.z - o.z) < o.r) near = true; } if (o.owner === RED) break; }
    return { seen, near, owner: o.owner };
  });
  ok(r.seen && r.near && r.owner === 1, 'claim: it drove onto a bottle cap and took it', JSON.stringify(r));
  r = await page.evaluate(() => {
    CMD_OFF = false; __battle(1, 0); __tick(10);
    const C = state.cmd; state.time = 150; C.u.hp = C.u.maxHp; C.job = null; C.u.mode = 'idle';
    const rnd = Math.random; Math.random = () => 0.9; spawnRaid(); Math.random = rnd;
    const j = C.job && C.job.k; let near = 999;
    for (let i = 0; i < 60 * 20; i++) { __tick(1); const tr = workersOf(BLUE, 'truck')[0]; if (tr && C.u) near = Math.min(near, Math.hypot(C.u.x - tr.x, C.u.z - tr.z)); }
    return { j, near };
  });
  ok(r.j === 'raid', 'raid: the commander rides along when a raid is sent', JSON.stringify(r));
  await page.context().close();
}

// ---------------------------------------------------------------- parity
async function sectionParity() {
  console.log(`[parity] the new commander vs the old invisible one, ${RUNS} runs a level, levels 1 to 5, 6 minutes each`);
  const page = await openPage();
  const run = (lv, off) => page.evaluate(({ lv, off }) => {
    CMD_OFF = off; __battle(lv);
    let bought = 0; const sp0 = spawnUnit; spawnUnit = (type, team, x, z) => { if (team === RED && type !== 'commander' && !ENEMY_TYPES[type].dr && type !== 'drone') bought++; return sp0(type, team, x, z); };
    let prev = state.cereal[RED], spent = 0; const at = {};
    const snap = (k) => { const t = redTurrets(); at[k] = { n: t.length, lv: t.reduce((a, e) => a + e.level, 0), spent: Math.round(spent), cars: bought, caps: outposts.filter((o) => o.owner === RED).length }; };
    for (let s = 1; s <= 360; s++) {
      __tick(60);
      const c = state.cereal[RED]; if (c < prev) spent += prev - c; prev = c; // (only drops: what it spent; refunds and income go up)
      if (s === 180 || s === 360) snap(s);
    }
    CMD_OFF = false; spawnUnit = sp0;
    return at;
  }, { lv, off });
  const sum = { 180: {}, 360: {} };
  for (let lv = 0; lv < 5; lv++) {
    const A = { on: [], off: [] };
    for (let k = 0; k < RUNS; k++) for (const mode of ['off', 'on']) A[mode].push(await run(lv, mode === 'off'));
    const avg = (arr, t, key) => arr.reduce((a, r) => a + r[t][key], 0) / arr.length;
    for (const t of [180, 360]) {
      const row = {};
      for (const key of ['n', 'lv', 'spent', 'cars']) row[key] = [avg(A.off, t, key), avg(A.on, t, key)];
      console.log(`  level ${lv + 1} at ${t / 60} min: turrets ${row.n[0].toFixed(1)} -> ${row.n[1].toFixed(1)}   upgrades(lvl sum) ${row.lv[0].toFixed(1)} -> ${row.lv[1].toFixed(1)}   spent ${row.spent[0].toFixed(0)} -> ${row.spent[1].toFixed(0)}   cars bought ${row.cars[0].toFixed(1)} -> ${row.cars[1].toFixed(1)}`);
      for (const key of Object.keys(row)) { (sum[t][key] ||= [0, 0]); sum[t][key][0] += row[key][0]; sum[t][key][1] += row[key][1]; }
    }
  }
  for (const t of [180, 360]) {
    const s = sum[t];
    const rel = (k) => (s[k][1] - s[k][0]) / Math.max(1, s[k][0]);
    console.log(`  ALL levels at ${t / 60} min: turrets ${s.n[0].toFixed(1)} -> ${s.n[1].toFixed(1)} (${(rel('n') * 100).toFixed(1)} %), spent ${s.spent[0].toFixed(0)} -> ${s.spent[1].toFixed(0)} (${(rel('spent') * 100).toFixed(1)} %), cars bought ${(rel('cars') * 100).toFixed(1)} %`);
    ok(Math.abs(rel('n')) <= 0.15, `minute ${t / 60}: turrets within 15 % of the old AI`, `${(rel('n') * 100).toFixed(1)} %`);
    ok(Math.abs(rel('spent')) <= 0.15, `minute ${t / 60}: cereal spent within 15 %`, `${(rel('spent') * 100).toFixed(1)} %`);
    ok(Math.abs(rel('cars')) <= 0.15, `minute ${t / 60}: cars bought within 15 %`, `${(rel('cars') * 100).toFixed(1)} %`);
  }
  await page.context().close();
}

// ---------------------------------------------------------------- play
async function sectionPlay() {
  console.log(`[play] ${SECS} s on all six levels, 0 page errors`);
  const page = await openPage();
  for (let lv = 0; lv < 6; lv++) {
    const e0 = errors.length;
    const r = await page.evaluate(({ lv, secs }) => {
      CMD_OFF = false; __battle(lv);
      const p = state.player; let steps = 0, shown = 0, dead = 0, labels = 0;
      for (let s = 0; s < secs * 60; s++) {
        // a simple player: drive about the middle, fire, build a turret now and then
        const a = s / 90; input.keys.clear(); input.keys.add(Math.cos(a) > 0 ? 'KeyD' : 'KeyA'); if (Math.sin(a) > 0.3) input.keys.add('KeyW'); input.keys.add('Space');
        if (s % 600 === 0) build('gun');
        __tick(1);
        if (s % 60 === 0) { render(1); const t = $('cmdTag'); if (state.cmd && state.cmd.u && !t.hidden) shown++; if (!$('cmdFloat').hidden) labels++; }
        if (state.cmd && !state.cmd.u) dead++;
        steps++;
      }
      input.keys.clear();
      return { cmd: !!state.cmd, up: state.cmd && !!state.cmd.u, shown, dead, labels, over: state.over };
    }, { lv, secs: SECS });
    if (lv === 5) ok(!r.cmd, 'level 6: no commander, squads and army cap untouched');
    else { ok(r.cmd, `level ${lv + 1}: commander in play (tag shown ${r.shown} renders, label ${r.labels}, down ${r.dead} ticks)`); }
    ok(errors.length === e0, `level ${lv + 1}: ${SECS} s with no page errors`, errors.slice(e0, e0 + 3).join(' | '));
  }
  await page.context().close();
}

// ---------------------------------------------------------------- memory
async function sectionMemory() {
  console.log('[memory] geometry count over level cycles with the commander dying and coming back');
  const page = await openPage();
  const geos = [];
  for (let cycle = 0; cycle < 4; cycle++) {
    const g = await page.evaluate((off) => {
      CMD_OFF = off;
      for (let lv = 0; lv < 6; lv++) {
        __battle(lv); __tick(60 * 5);
        if (state.cmd && state.cmd.u) { state.cmd.u.shieldT = 0; hurt(state.cmd.u, 999, BLUE, WEAPONS.mg); __tick(60 * 13); } // dies, comes back
        __tick(60 * 3); render(0.1);
      }
      __battle(0); __tick(30); render(0.1);
      return { geo: renderer.info.memory.geometries, tex: renderer.info.memory.textures, mat: renderer.info.programs ? renderer.info.programs.length : 0 };
    }, args.includes('--nocmd')); // (--nocmd: the same cycles with the old invisible commander, to show the texture growth is not the commander's)
    geos.push(g.geo); console.log(`  cycle ${cycle + 1}: geometries ${g.geo}, textures ${g.tex}`);
  }
  ok(geos[3] === geos[2] && geos[2] === geos[1], `geometries flat after the first cycle (${geos.join(', ')})`);
  await page.context().close();
}

// ---------------------------------------------------------------- shots
async function sectionShots() {
  console.log('[shots] commander building, commander destroyed');
  const page = await openPage();
  await page.setViewportSize({ width: 1180, height: 760 });
  await page.evaluate(() => { CMD_OFF = false; __battle(0, 300); __tick(2); state.time = 100; state.cmd.u.shieldT = 0; });
  // run until the commander is building, then put the camera there
  let got = false;
  for (let i = 0; i < 4000 && !got; i++) {
    got = await page.evaluate(() => { __tick(6); return state.cmd.building; });
  }
  ok(got, 'the commander reached a build spot (screenshot run)');
  if (got) {
    await page.evaluate(() => { const C = state.cmd, p = state.player; p.x = C.u.x - 3; p.z = C.u.z - 3; p.vx = p.vz = 0; state.level.camZoom = 0.75; camTarget.set(C.u.x, 0, C.u.z); $('toast').textContent = ''; __tick(20); for (let i = 0; i < 6; i++) render(0.3); });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(__dirname, 'shots', 'commander-building.png') });
    await page.evaluate(() => { const C = state.cmd; const u = C.u; u.x = C.job ? C.job.x - 6 : u.x; __tick(1); state.cmd.u.shieldT = 0; hurt(state.cmd.u, 999, BLUE, WEAPONS.mg); __tick(12); for (let i = 0; i < 4; i++) render(0.1); });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(__dirname, 'shots', 'commander-destroyed.png') });
  }
  await page.context().close();
}

try {
  if (want('order')) await sectionOrder();
  if (want('danger')) await sectionDanger();
  if (want('life')) await sectionLife();
  if (want('jobs')) await sectionJobs();
  if (want('parity')) await sectionParity();
  if (want('play')) await sectionPlay();
  if (want('memory')) await sectionMemory();
  if (SHOTS) await sectionShots();
} catch (e) { fails++; console.log('  EXCEPTION', e.stack || e.message); }
ok(errors.length === 0, 'no page errors anywhere', errors.slice(0, 5).join(' | '));
await browser.close();
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
