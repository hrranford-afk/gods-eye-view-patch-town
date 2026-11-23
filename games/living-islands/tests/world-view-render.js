/* WORLD VIEW pictures (Living Islands, WORLD_VIEW.md). Frozen sea clock, fixed sun and tide, so the pictures repeat.
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/world-view-render.js [mode=all|sheet|big] [only=153,174]
   sheet: the home view of all 12 exported worlds as a numbered, labelled contact sheet -> shots/world-view-sheet.png (raw tiles in $WV_RAW or the temp folder)
   big:   four larger pictures from four different worlds -> shots/world-view-1..4.png (village at the jetty, a whole island, the camp at the landing, the volcano coast) */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
const arg = (k, d) => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1] || d;
const mode = arg('mode', 'all'), only = arg('only', '').split(',').filter(Boolean).map(Number);
const RAW = process.env.WV_RAW || path.join(os.tmpdir(), 'world-view-raw'); fs.mkdirSync(RAW, { recursive: true });
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'landform/worlds/index.json'), 'utf8')).worlds;
const FIXED = '&ui=0&q=high&seat=3&sun=40&az=-65&tide=0.15';
const { browser, ctx } = await launch();
async function load(seed, extra) {
  const page = await ctx.newPage(); await page.setViewportSize({ width: 1200, height: 800 }); const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GPU stall|ReadPixels/.test(m.text())) errs.push(m.text()); }); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + ROOT + '/islands_look.html?world=' + seed + FIXED + (extra || ''));
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 300000 });
  return { page, errs };
}
async function settle(page) { await page.waitForTimeout(2600); }
if (mode === 'all' || mode === 'sheet') {
  const list = idx.filter(w => !only.length || only.includes(w.seed));
  for (const w of list) {
    const { page, errs } = await load(w.seed);
    await page.evaluate(() => __li.home()); await settle(page);
    const f = path.join(RAW, 'w' + String(w.seed).padStart(4, '0') + '.png'); await page.screenshot({ path: f });
    console.log('tile', w.seed, 'errors', errs.length, JSON.stringify(await page.evaluate(() => __li.world.report())).slice(0, 200)); await page.close();
  }
  if (!only.length) { const r = spawnSync('python3', [path.join(ROOT, 'tests/world-view-sheet.py'), RAW, path.join(ROOT, 'shots/world-view-sheet.png'), path.join(ROOT, 'landform/worlds/index.json')], { encoding: 'utf8' }); console.log(r.stdout, r.stderr); }
}
if (mode === 'all' || mode === 'big') {
  const BIG = [[153, 'village'], [174, 'island'], [99, 'camp'], [2, 'coast']];
  let n = 0;
  for (const [seed, kind] of BIG) {
    n++; if (only.length && !only.includes(seed)) continue;
    const { page, errs } = await load(seed);
    await page.evaluate(k => {
      const j = __li.world.jetty(), c = __li.world.camp();
      const cam = { village: () => ({ tx: j.x + j.dx * 4, tz: j.z + j.dz * 4, dist: 82, phi: .6, theta: Math.atan2(j.dx, j.dz) + .5 }),
        island: () => ({ tx: 0, tz: 4, dist: 250, phi: .72, theta: .5 }),
        camp: () => { const cp = __li.camp(), d = __li.world.landing(); return { tx: cp.x, tz: cp.z, dist: 56, phi: .58, theta: Math.atan2(j.dx, j.dz) + 1.6 }; },
        coast: () => ({ tx: 0, tz: 0, dist: 170, phi: .62, theta: .9 }) }[k]();
      __li.setView(cam);
    }, kind);
    await settle(page);
    const f = path.join(ROOT, 'shots', 'world-view-' + n + '.png'); await page.screenshot({ path: f });
    console.log('wrote', f, 'errors', errs.length); await page.close();
  }
}
await browser.close();
