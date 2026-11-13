/* Takes the three README screenshots at 1180x820.
   Run:  NODE_PATH=$(npm root -g) node games/vigil-3d/tests/vigil3d-shots.cjs [seed] */
const { chromium } = require("playwright");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const SEED = +(process.argv[2] || 20260113);
(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await (await browser.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
  const errs = []; page.on("pageerror", e => errs.push(String(e)));
  await page.goto("file://" + path.join(ROOT, "index.html") + "?seed=" + SEED);
  await page.waitForFunction(() => window.__v && __v.state().phase === "player");
  await page.waitForTimeout(1500);
  await page.evaluate(() => __v.camera({ az: 0.5, pol: 0.88, dist: 24 }));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(ROOT, "shots", "v1-board.png") });

  /* v2: pick the scout (long reach) and show the glowing tiles */
  await page.evaluate(() => { const s = __v.state(), u = s.units.filter(v => v.side === "w" && !v.drone)[2]; __v.select(u.id); __v.camera({ az: 0.45, pol: 0.85, dist: 19 }); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ROOT, "shots", "v2-move.png") });

  /* v3: play fast until someone can shoot, then do it slowly and catch the shot in the air */
  let found = null;
  for (let turn = 0; turn < 12 && !found; turn++) {
    const s = await page.evaluate(() => { __v.fast(true); return __v.state(); });
    if (s.phase !== "player") break;
    for (const w of s.units.filter(u => u.side === "w" && !u.drone && u.hp > 0 && !u.out)) {
      await page.evaluate(id => __v.select(id), w.id);
      const st = await page.evaluate(() => __v.state());
      const near = id => { const a = st.units.find(u => u.id === w.id), b = st.units.find(u => u.id === id); return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); };
      const close = st.targets.find(id => near(id) <= 6);
      if (close) { found = { w: w.id, t: close }; break; }
      let best = null, bd = 1e9;
      for (const [x, y] of st.reach) { const d = Math.hypot(x - 20, y - 1); if (d < bd) { bd = d; best = [x, y]; } }
      if (best) await page.evaluate(([x, y]) => __v.moveTo(x, y), best);
      const st2 = await page.evaluate(() => __v.state());
      const close2 = st2.targets.find(id => { const a = st2.units.find(u => u.id === w.id), b = st2.units.find(u => u.id === id); return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 6; });
      if (close2) { found = { w: w.id, t: close2 }; break; }
    }
    if (!found) await page.evaluate(() => __v.endTurn());
  }
  if (found) {
    const pos = await page.evaluate(({ w, t }) => { const s = __v.state(), a = s.units.find(u => u.id === w), b = s.units.find(u => u.id === t); return { a, b }; }, found);
    const slow = +(process.env.SHOT_SLOW || 12);
    await page.evaluate(({ a, b, slow }) => { __v.fast(slow); __v.camera({ az: 0.5, pol: 0.82, dist: 9 + Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) * 1.3, tx: (a.x + b.x) / 2 - 10.5, tz: (a.y + b.y) / 2 - 10.5 }); }, { ...pos, slow });
    await page.waitForTimeout(1200);
    await page.evaluate(({ w, t }) => { __v.select(w); __v.attack(t); }, found);
    const times = (process.env.SHOT_MS || "11500").split(",").map(Number);
    let prev = 0;
    for (const ms of times) { await page.waitForTimeout(ms - prev); prev = ms; await page.screenshot({ path: path.join(ROOT, "shots", times.length > 1 ? "v3-attack-" + ms + ".png" : "v3-attack.png") }); }
  } else console.log("no shot found");
  console.log(errs.length ? "ERRORS " + errs.join("\n") : "no page errors");
  await browser.close();
})();
