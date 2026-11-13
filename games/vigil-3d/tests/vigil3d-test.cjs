/* Vigil 3D robot test.
   Run:  NODE_PATH=$(npm root -g) node games/vigil-3d/tests/vigil3d-test.cjs
   It plays the 3D game through window.__v and plays the 2D game (games/vigil/index.html) through window.__vigil,
   with the same seeded dice, and checks that both give the same moves, the same odds and the same outcomes.
   Set VIGIL_SKIP_PARITY=1 to skip the 2D comparison (for example when the 2D page's CDN scripts cannot load). */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const URL3D = "file://" + path.join(ROOT, "vigil-3d", "index.html");
const URL2D = "file://" + path.join(ROOT, "vigil", "index.html");
const SKIP = !!process.env.VIGIL_SKIP_PARITY;
const W = 22, H = 22;
const SEED = +(process.env.VIGIL_SEED || 20260113);
const TURNS = +(process.env.VIGIL_TURNS || 10);

let fails = 0, passes = 0;
function check(name, ok, detail) {
  if (ok) { passes++; console.log("  ok   " + name); }
  else { fails++; console.log("  FAIL " + name + (detail !== undefined ? "  -> " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : "")); }
}

/* The 2D game's own source tells us which Math.random calls belong to the rules (dice, spawns, tie-breaks).
   Everything else in the 2D page (paint, particles) must not eat from the seeded stream. */
function ruleLines2D() {
  const lines = fs.readFileSync(path.join(ROOT, "vigil", "index.html"), "utf8").split("\n"), out = [];
  const RULE_FN = new Set(["rollDice", "hiveSpawn", "broodAct", "newBattle"]);
  let fn = null;
  lines.forEach((l, i) => {
    const m = l.match(/^(?:async function|function|const|let|var) ([A-Za-z0-9_]+)/);
    if (m) fn = m[1];
    if (l.includes("Math.random") && RULE_FN.has(fn)) out.push(i + 1);
  });
  return out;
}

const initScript = (rule2d, is2d) => `
(() => {
  const real = Math.random.bind(Math), rules = new Set(${JSON.stringify(rule2d)}), is2d = ${is2d};
  let a = 1, on = false;
  Error.stackTraceLimit = 3;
  const next = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  window.__rngReset = s => { a = s; on = true; window.__rngCount = 0; };
  window.__rngCount = 0;
  if (is2d) { const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => setTimeout(() => raf(cb), 1500); }
  Math.random = function () {
    if (!on) return real();
    const st = (new Error().stack || "").split("\\n")[2] || "";
    const m = st.match(/index\\.html:(\\d+):\\d+\\)?\\s*$/);
    if (m && (!is2d || rules.has(+m[1]))) { window.__rngCount++; return next(); }
    return real();
  };
})();`;

async function newPage(browser, url, is2d, size) {
  const ctx = await browser.newContext({ viewport: size || { width: 1180, height: 820 } });
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", e => errors.push(String(e.message || e)));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|favicon/.test(m.text())) errors.push("console: " + m.text()); });
  await page.addInitScript(initScript(ruleLines2D(), is2d));
  await page.goto(url, { waitUntil: is2d ? "domcontentloaded" : "load", timeout: 60000 });
  return { ctx, page, errors };
}

/* ---- one snapshot shape for both games (units matched by order, because the 2D ids start higher) ---- */
const snap3d = page => page.evaluate(() => {
  const s = __v.state(), idx = new Map(s.units.map((u, i) => [u.id, i]));
  return { phase: s.phase, round: s.round, extracted: s.extracted, kills: s.kills, sel: s.sel == null ? null : idx.get(s.sel),
    units: s.units.map(u => [u.kind, u.x, u.y, u.hp, u.ap, +u.moved, +u.attacked, +u.ow, +u.out, +u.burrowed, +u.lurk, +u.rescued, u.order, +u.deployed, u.charges]) };
});
const snap2d = page => page.evaluate(() => {
  const V = __vigil, us = V.units;
  return { phase: V.st.phase, round: V.st.round, extracted: V.st.extracted, kills: null, sel: null,
    units: us.map(u => [u.kind, u.x, u.y, u.hp, u.ap, +!!u.moved, +!!u.attacked, +!!u.ow, +!!u.out, +!!u.burrowed, +!!u.lurk, +!!u.rescued, u.order, +!!u.deployed, u.charges]) };
});
const same = (a, b) => JSON.stringify(a.units) === JSON.stringify(b.units) && a.phase === b.phase && a.round === b.round && a.extracted === b.extracted;
function firstDiff(a, b) {
  if (a.phase !== b.phase || a.round !== b.round || a.extracted !== b.extracted) return { phase: [a.phase, b.phase], round: [a.round, b.round], extracted: [a.extracted, b.extracted] };
  if (a.units.length !== b.units.length) return { count: [a.units.length, b.units.length] };
  for (let i = 0; i < a.units.length; i++) if (JSON.stringify(a.units[i]) !== JSON.stringify(b.units[i])) return { unit: i, d3: a.units[i], d2: b.units[i] };
  return null;
}

/* ---- the 2D game through its own hook ---- */
const g2 = {
  select: (p, i) => p.evaluate(i => { const u = __vigil.units[i]; __vigil.select(u); return true; }, i),
  reach: (p, i) => p.evaluate(i => { const u = __vigil.units[i]; return [...__vigil.reach(u, u.mv).dist.keys()].sort((a, b) => a - b); }, i),
  tile: (p, i, x, y) => p.evaluate(async ([i, x, y]) => { const u = __vigil.units[i]; const a = [u.x, u.y, u.ap]; await __vigil.clickTile({ x, y }); return u.x !== a[0] || u.y !== a[1] || u.ap !== a[2]; }, [i, x, y]),
  ow: p => p.evaluate(() => { __vigil.overwatch(); return true; }),
  heal: p => p.evaluate(() => { __vigil.heal(); return true; }),
  ext: p => p.evaluate(async () => { await __vigil.extract(); return true; }),
  end: p => p.evaluate(() => __vigil.endPlayerTurn()),
  info: (p, ai, ti) => p.evaluate(([ai, ti]) => { const V = __vigil, i = V.attackInfo(V.units[ai], V.units[ti]); return i && { melee: i.melee, need: i.need, dice: i.dice, dmg: i.dmg, p: i.p, exp: i.exp, kill: i.kill, burn: i.burn || 0, splash: (i.splash || []).map(s => V.units.indexOf(s)) }; }, [ai, ti]),
  grid: (p, seed) => p.evaluate(seed => __vigil.genCity(seed).g.map(r => r.join("")), seed),
};

async function main() {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

  if (!process.env.ONLY_REPLAY) {
  /* ========== 1. the 3D page on its own ========== */
  console.log("3D page, landscape");
  const A = await newPage(browser, URL3D, false);
  await A.page.waitForFunction(() => window.__v && __v.state().phase === "player", null, { timeout: 30000 });
  check("hook window.__v has state/select/moveTo/attack/endTurn", await A.page.evaluate(() => ["state", "select", "moveTo", "attack", "endTurn"].every(k => typeof __v[k] === "function")));
  check("WebGL canvas is drawn", await A.page.evaluate(() => { const c = document.getElementById("gl"); return !!c && c.width > 100 && !!(c.getContext("webgl2") || c.getContext("webgl")); }));
  check("banner says Your turn", (await A.page.textContent("#bannerT")).trim() === "Your turn");
  const s0 = await A.page.evaluate(() => __v.state());
  const wd0 = s0.units.filter(u => u.side === "w" && !u.drone), dr0 = s0.units.filter(u => u.drone), br0 = s0.units.filter(u => u.side === "b");
  check("six wardens, two drones", wd0.length === 6 && dr0.length === 2, [wd0.length, dr0.length]);
  check("wardens: sergeant, gunner, 2 troopers, scout, medic", wd0.map(u => u.kind).join() === "sergeant,gunner,trooper,trooper,scout,medic", wd0.map(u => u.kind));
  check("hp/mv match the 2D game (5/4, 4/3, 4/4, 4/4, 3/6, 4/4)", wd0.map(u => u.hp + "/" + u.mv).join() === "5/4,4/3,4/4,4/4,3/6,4/4", wd0.map(u => u.hp + "/" + u.mv));
  check("brood waits in the dark (one per nest, up to 6)", br0.length >= 1 && br0.length <= 6, br0.length);
  check("a warden is selected at the start", s0.sel === wd0[0].id, s0.sel);
  check("selected warden has glowing move tiles", s0.reach.length > 8, s0.reach.length);

  /* illegal things are refused, exactly as in 2D */
  const cap = await A.page.evaluate(() => { const s = __v.state(), u = s.units.find(v => v.id === s.sel); return { x: u.x, y: u.y, ap: u.ap, wall: (() => { for (let y = 0; y < 22; y++) for (let x = 0; x < 22; x++) if (s.grid[y][x] === "1") return [x, y]; })() }; });
  check("cannot walk into a wall", (await A.page.evaluate(([x, y]) => __v.moveTo(x, y), cap.wall)) === false);
  check("cannot walk to the far corner in one move", (await A.page.evaluate(() => __v.moveTo(20, 1))) === false);
  check("cannot attack a unit that is not there (own warden id)", (await A.page.evaluate(id => __v.attack(id), wd0[1].id)) === false);
  check("cannot select an enemy", (await A.page.evaluate(id => __v.select(id), br0[0].id)) === false);
  const s0b = await A.page.evaluate(() => __v.state());
  check("refused actions changed nothing", JSON.stringify(s0b.units) === JSON.stringify(s0.units));

  /* a real move: reachable tile, spends 1 of 2 actions */
  const mv = await A.page.evaluate(async () => { const s = __v.state(), u = s.units.find(v => v.id === s.sel), t = s.reach[s.reach.length - 1]; const ok = await __v.moveTo(t[0], t[1]); const n = __v.state().units.find(v => v.id === u.id); return { ok, from: [u.x, u.y], to: t, now: [n.x, n.y], ap: n.ap, moved: n.moved }; });
  check("moving to a lit tile works and costs one action", mv.ok && mv.now[0] === mv.to[0] && mv.now[1] === mv.to[1] && mv.ap === 1 && mv.moved, mv);
  await A.ctx.close();

  /* ========== 2. real finger taps on the 3D board ========== */
  console.log("3D page, real taps");
  const T = await newPage(browser, URL3D + "?seed=777", false);
  await T.page.waitForFunction(() => window.__v && __v.state().phase === "player", null, { timeout: 30000 });
  await T.page.evaluate(() => { __v.fast(0.15); __v.camera({ az: 0.2, pol: 0.9, dist: 22 }); });
  await T.page.waitForTimeout(500);
  const scr = (x, y) => T.page.evaluate(([x, y]) => __v.tileXY(x, y), [x, y]);
  const w2 = await T.page.evaluate(() => __v.state().units.filter(u => u.side === "w" && !u.drone)[2]);
  const pt = await scr(w2.x, w2.y);
  await T.page.mouse.click(pt.x, pt.y - 10);
  await T.page.waitForTimeout(150);
  const sSel = await T.page.evaluate(() => __v.state());
  check("tapping a soldier selects it", sSel.sel === w2.id, [sSel.sel, w2.id]);
  const dest = sSel.reach.find(([x, y]) => x > w2.x);
  const pd = await scr(dest[0], dest[1]);
  await T.page.mouse.click(pd.x, pd.y);
  await T.page.waitForFunction(id => { const u = __v.state().units.find(v => v.id === id); return u.ap === 1; }, w2.id, { timeout: 8000 }).catch(() => {});
  const sMv = await T.page.evaluate(id => __v.state().units.find(v => v.id === id), w2.id);
  check("tapping a lit tile moves the soldier there", sMv.x === dest[0] && sMv.y === dest[1] && sMv.ap === 1, [sMv, dest]);
  /* a drag must orbit the camera, not tap */
  const before = await T.page.evaluate(() => __v.camera({}));
  await T.page.mouse.move(600, 300); await T.page.mouse.down(); await T.page.mouse.move(700, 330, { steps: 6 }); await T.page.mouse.up();
  const after = await T.page.evaluate(() => __v.camera({}));
  check("dragging orbits the camera", Math.abs(after.az - before.az) > 0.2, [before.az, after.az]);
  const wb = await T.page.evaluate(() => __v.state().units.filter(u => u.side === "w" && !u.drone).map(u => [u.x, u.y, u.ap].join()).join("|"));
  check("a drag does not move or select anything", wb.includes(sMv.x + "," + sMv.y + ",1"), wb);
  await T.page.mouse.move(600, 300); await T.page.mouse.wheel(0, -400);
  const zoomed = await T.page.evaluate(() => __v.camera({}));
  check("scroll wheel zooms in", zoomed.dist < after.dist - 1, [after.dist, zoomed.dist]);
  /* the enemy turn banner */
  await T.page.click("#endBtn");
  let sawEnemy = false, sawDrones = false, t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    const txt = (await T.page.textContent("#bannerT")).trim();
    if (txt === "Enemy turn") sawEnemy = true; if (txt === "Drones") sawDrones = true;
    if (sawEnemy && txt === "Your turn") break;
    await T.page.waitForTimeout(40);
  }
  check("banner shows Enemy turn, then Your turn again", sawEnemy && (await T.page.textContent("#bannerT")).trim() === "Your turn");
  check("drones get their own banner", sawDrones);
  check("round counter went to 2", (await T.page.textContent("#roundN")).trim() === "2");
  check("tap page: 0 page errors", T.errors.length === 0, T.errors);
  await T.ctx.close();

  /* ========== 3. iPad portrait and landscape layout ========== */
  for (const [label, size] of [["portrait 820x1180", { width: 820, height: 1180 }], ["landscape 1180x820", { width: 1180, height: 820 }]]) {
    console.log("3D page, iPad " + label);
    const L = await newPage(browser, URL3D + "?seed=5", false, size);
    await L.page.waitForFunction(() => window.__v && __v.state().phase === "player", null, { timeout: 30000 });
    await L.page.waitForTimeout(400);
    const lay = await L.page.evaluate(() => {
      const r = id => { const b = document.getElementById(id).getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
      const cards = [...document.querySelectorAll("#squad .unit")].map(e => e.getBoundingClientRect());
      return { end: r("endBtn"), ow: r("owBtn"), banner: r("banner"), home: r("homeBtn"), dock: r("dock"), sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, minCard: Math.min(...cards.map(c => Math.min(c.width, c.height))) };
    });
    check(label + ": big touch targets (buttons at least 56px)", lay.end.h >= 56 && lay.end.w >= 56 && lay.ow.h >= 56 && lay.ow.w >= 56 && lay.home.h >= 44 && lay.minCard >= 56, lay);
    check(label + ": nothing sticks out sideways", lay.sw <= lay.iw && lay.end.r <= lay.iw + 1 && lay.banner.r <= lay.iw + 1 && lay.banner.x >= -1, lay);
    check(label + ": banner is on screen at the top, dock at the bottom", lay.banner.y >= 0 && lay.banner.b < lay.ih / 3 && lay.dock.b <= lay.ih + 1, lay);
    check(label + ": 0 page errors", L.errors.length === 0, L.errors);
    await L.ctx.close();
  }

  }

  /* ========== 4. a played game: same seed twice gives the same game ========== */
  console.log("3D page, replay with the same seed");
  const runs = [];
  for (let k = 0; k < 2; k++) {
    const R = await newPage(browser, URL3D, false);
    await R.page.waitForFunction(() => window.__v && __v.state().phase === "player", null, { timeout: 30000 });
    await R.page.evaluate(s => { __v.fast(true); __rngReset(s); __v.newGame(); }, SEED);
    const log = await playTurns(R.page, "3d", TURNS, null);
    runs.push(JSON.stringify(log.states[log.states.length - 1]));
    check("replay " + (k + 1) + ": 0 page errors", R.errors.length === 0, R.errors);
    await R.ctx.close();
  }
  check("same seed, same moves, same final board", runs[0] === runs[1]);

  /* ========== 5. parity with the 2D game ========== */
  if (SKIP) console.log("2D parity skipped (VIGIL_SKIP_PARITY)");
  else {
    console.log("parity: 3D rules against the 2D game, seed " + SEED);
    const R3 = await newPage(browser, URL3D, false), R2 = await newPage(browser, URL2D, true, { width: 480, height: 360 });
    await R3.page.waitForFunction(() => window.__v && __v.state().phase === "player", null, { timeout: 30000 });
    let ok2d = true;
    try { await R2.page.waitForFunction(() => window.__vigil && window.__vigil.newBattle, null, { timeout: 40000 }); } catch (e) { ok2d = false; }
    check("2D page loaded (needs its CDN scripts)", ok2d, R2.errors.slice(0, 3));
    if (ok2d) {
      await R3.page.evaluate(s => { __v.fast(true); __rngReset(s); __v.newGame(); }, SEED);
      await R2.page.evaluate(s => { __vigil.SPEED.v = 0; __rngReset(s); __vigil.newBattle(); }, SEED);
      const st3 = await R3.page.evaluate(() => __v.state()), seed = st3.seed;
      const grid2 = await g2.grid(R2.page, seed);
      check("same city map for the same seed (" + seed + ")", JSON.stringify(grid2) === JSON.stringify(st3.grid));
      const a = await snap3d(R3.page), b = await snap2d(R2.page);
      check("same start: units, places, wounds", same(a, b), firstDiff(a, b));
      const log = await playTurns(R3.page, "3d", TURNS, { page2: R2.page });
      check("moves allowed match on every selection (" + log.reachChecks + " checks)", log.reachBad.length === 0, log.reachBad.slice(0, 2));
      check("attack odds match on every pair (" + log.infoChecks + " checks)", log.infoBad.length === 0, log.infoBad.slice(0, 2));
      check("same result after every action (" + log.stateChecks + " checks)", log.stateBad.length === 0, log.stateBad.slice(0, 2));
      check("dice drawn the same number of times", log.rng[0] === log.rng[1], log.rng);
      check("game played through " + log.turns + " turns with " + log.attacks + " attacks, " + log.moves + " moves", log.turns >= 3 && log.moves > 5, log);
      check("exercised overwatch, heal or extract", log.specials > 0, log.specials);
      console.log("  info: kills " + log.states.at(-1).kills + ", extracted " + log.states.at(-1).extracted + ", round " + log.states.at(-1).round + ", phase " + log.states.at(-1).phase);
    }
    check("parity 3D page: 0 page errors", R3.errors.length === 0, R3.errors);
    check("parity 2D page: 0 page errors", R2.errors.length === 0, R2.errors.slice(0, 3));
    await R3.ctx.close(); await R2.ctx.close();
  }

  await browser.close();
  console.log("\n" + passes + " passed, " + fails + " failed");
  process.exit(fails ? 1 : 0);
}

/* A fixed little policy: shoot what you can, else walk to the landing pad; one soldier watches, the medic heals, the pad extracts.
   The policy reads the 3D game and sends each choice to both games, then compares. */
async function playTurns(page, _kind, turns, par) {
  const P2 = par && par.page2, log = { states: [], reachBad: [], infoBad: [], stateBad: [], reachChecks: 0, infoChecks: 0, stateChecks: 0, turns: 0, attacks: 0, moves: 0, specials: 0, rng: [0, 0] };
  const cmp = async (what) => {
    if (!P2) return;
    const a = await snap3d(page), b = await snap2d(P2); log.stateChecks++;
    if (!same(a, b) && log.stateBad.length < 4) log.stateBad.push({ at: what, diff: firstDiff(a, b) });
  };
  for (let t = 0; t < turns; t++) {
    if (process.env.DEBUG) console.log("   turn", t, new Date().toISOString().slice(14, 23));
    let s = await page.evaluate(() => __v.state());
    if (s.phase !== "player") break;
    const wIdx = s.units.map((u, i) => [u, i]).filter(([u]) => u.side === "w" && !u.drone && u.hp > 0 && !u.out);
    for (const [w, wi] of wIdx) {
      s = await page.evaluate(() => __v.state());
      if (s.phase !== "player") break;
      const me = s.units[wi]; if (me.hp <= 0 || me.out) continue;
      if (process.env.DEBUG) console.log("     unit", wi, me.kind);
      await page.evaluate(id => __v.select(id), me.id); if (P2) await g2.select(P2, wi);
      s = await page.evaluate(() => __v.state());
      if (P2) {
        const r2 = await g2.reach(P2, wi), r3 = await page.evaluate(id => __v.reach(id), me.id); log.reachChecks++;
        if (JSON.stringify(r2) !== JSON.stringify(r3) && log.reachBad.length < 3) log.reachBad.push({ turn: t, unit: wi, only3d: r3.filter(k => !r2.includes(k)).slice(0, 5), only2d: r2.filter(k => !r3.includes(k)).slice(0, 5) });
        for (const [ti, tu] of s.units.map((u, i) => [i, u])) {
          if (tu.side !== "b") continue;
          const i3 = await page.evaluate(([a, b]) => __v.info(a, b), [me.id, tu.id]), i2 = await g2.info(P2, wi, ti); log.infoChecks++;
          const eq = (!i3 && !i2) || (i3 && i2 && ["melee", "need", "dice", "dmg", "burn"].every(k => i3[k] === i2[k]) && Math.abs(i3.p - i2.p) < 1e-9 && Math.abs(i3.exp - i2.exp) < 1e-9 && Math.abs(i3.kill - i2.kill) < 1e-9 && JSON.stringify(i3.splash.map(id => s.units.findIndex(u => u.id === id))) === JSON.stringify(i2.splash));
          if (!eq && log.infoBad.length < 3) log.infoBad.push({ turn: t, unit: wi, target: ti, i3, i2 });
        }
      }
      /* special actions, spread over turns so every kind is exercised */
      if (me.kind === "medic" && me.ap > 0) {
        const hurt = s.units.some(u => u.side === "w" && !u.drone && u.hp > 0 && u.hp < u.maxhp && Math.max(Math.abs(u.x - me.x), Math.abs(u.y - me.y)) <= 1);
        if (hurt) { const ok = await page.evaluate(() => __v.heal()); if (P2 && ok) await g2.heal(P2); await cmp("heal"); if (ok) { log.specials++; } }
      }
      s = await page.evaluate(() => __v.state());
      if (s.units[wi].hp <= 0) continue;
      /* shoot the first thing we can */
      if (s.targets.length && s.units[wi].ap > 0 && !s.units[wi].attacked) {
        const tid = s.targets[0], ti = s.units.findIndex(u => u.id === tid), tu = s.units[ti];
        const ok = await page.evaluate(id => __v.attack(id), tid); log.attacks += ok ? 1 : 0;
        if (P2) { const ok2 = await g2.tile(P2, wi, tu.x, tu.y); if (ok2 !== ok && log.stateBad.length < 4) log.stateBad.push({ at: "attack allowed?", a3: ok, a2: ok2 }); }
        await cmp("attack t" + t + " u" + wi);
      }
      s = await page.evaluate(() => __v.state());
      const m2 = s.units[wi]; if (m2.hp <= 0 || m2.out || m2.ap < 1) continue;
      /* the gunner keeps watch on turn 2, to exercise overwatch */
      if (m2.kind === "gunner" && t === 1) { const ok = await page.evaluate(() => __v.overwatch()); if (P2 && ok) await g2.ow(P2); await cmp("overwatch"); if (ok) log.specials++; continue; }
      /* on the pad: leave */
      if (m2.x >= W - 3 && m2.y <= 2) { const ok = await page.evaluate(() => __v.extract()); if (P2 && ok) await g2.ext(P2); await cmp("extract"); if (ok) log.specials++; continue; }
      /* else walk toward the pad: the lit tile nearest to it */
      s = await page.evaluate(() => __v.state());
      if (!s.reach.length) continue;
      let best = null, bd = 1e9;
      for (const [x, y] of s.reach) { const d = Math.hypot(x - (W - 2), y - 1) + 0.001 * (y * W + x); if (d < bd) { bd = d; best = [x, y]; } }
      const ok = await page.evaluate(([x, y]) => __v.moveTo(x, y), best); log.moves += ok ? 1 : 0;
      if (P2) { const ok2 = await g2.tile(P2, wi, best[0], best[1]); if (ok2 !== ok && log.stateBad.length < 4) log.stateBad.push({ at: "move allowed?", a3: ok, a2: ok2, best }); }
      await cmp("move t" + t + " u" + wi);
    }
    s = await page.evaluate(() => __v.state());
    if (s.phase !== "player") break;
    await page.evaluate(() => __v.endTurn()); if (P2) await g2.end(P2);
    await cmp("end turn " + t); log.turns++;
    log.states.push(await snap3d(page));
    const after = await page.evaluate(() => __v.state().phase); if (after === "over") break;
  }
  if (!log.states.length) log.states.push(await snap3d(page));
  const last = await snap3d(page); log.states[log.states.length - 1] = last;
  if (P2) log.rng = [await page.evaluate(() => window.__rngCount), await P2.evaluate(() => window.__rngCount)];
  return log;
}

main().catch(e => { console.error("TEST CRASHED:", e); process.exit(2); });
