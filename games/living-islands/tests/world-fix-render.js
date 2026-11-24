/* WORLDS FIX pictures (WORLD_VIEW.md, section 'The fix'). Frozen sea clock, fixed sun and tide.
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/world-fix-render.js [mode=quick|sheet|big] [only=5,153] [tag=after]
   quick: home view of the listed worlds -> $WF_RAW/<tag>-NNNN.png ; sheet: all 12 home views plus the before and after of 153 and 5 -> shots/worlds-fix-sheet.png (needs $WF_BEFORE with b-0153.png, b-0005.png);
   big: two 1200 x 800 pictures (volcano coast, gneiss coast) -> shots/worlds-fix-1..2.png */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
const arg = (k, d) => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1] || d;
const mode = arg('mode', 'quick'), only = arg('only', '').split(',').filter(Boolean).map(Number), tag = arg('tag', 'after');
const RAW = process.env.WF_RAW || path.join(os.tmpdir(), 'world-fix-raw'); fs.mkdirSync(RAW, { recursive: true });
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'landform/worlds/index.json'), 'utf8')).worlds;
const FIXED = process.env.WF_FIXED || '&ui=0&q=high&seat=3&sun=40&az=-65&tide=0.15';
const { browser, ctx } = await launch();
async function load(seed) {
  const page = await ctx.newPage(); await page.setViewportSize({ width: 1200, height: 800 }); const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GPU stall|ReadPixels/.test(m.text())) errs.push(m.text()); }); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + ROOT + '/islands_look.html?world=' + seed + FIXED);
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 300000 });
  return { page, errs };
}
if (mode === 'quick' || mode === 'sheet') {
  for (const w of idx.filter(w => !only.length || only.includes(w.seed))) {
    const { page, errs } = await load(w.seed); await page.evaluate(() => __li.home()); await page.waitForTimeout(2600);
    await page.screenshot({ path: path.join(RAW, tag + '-' + String(w.seed).padStart(4, '0') + '.png') });
    console.log('tile', w.seed, 'errors', errs.length, JSON.stringify(await page.evaluate(() => LI_WORLD.last.stats(48)))); await page.close();
  }
  if (mode === 'sheet') { const r = spawnSync('python3', [path.join(ROOT, 'tests/world-fix-sheet.py'), RAW, process.env.WF_BEFORE || RAW, path.join(ROOT, 'shots/worlds-fix-sheet.png'), path.join(ROOT, 'landform/worlds/index.json')], { encoding: 'utf8' }); console.log(r.stdout, r.stderr); }
}
if (mode === 'big') {
  const VIEWS = JSON.parse(arg('views', '{}'));
  const BIG = [[arg('s1', '5'), 'coast'], [arg('s2', '153'), 'gneiss']]; let n = 0;
  for (const [seed, kind] of BIG) {
    n++; const { page, errs } = await load(Number(seed));
    await page.evaluate(([k, v]) => { __li.setView(v || (k === 'coast' ? { tx: -20, tz: 10, dist: 150, phi: .6, theta: .9 } : { tx: 0, tz: 4, dist: 120, phi: .55, theta: .5 })); }, [kind, VIEWS[n]]);
    await page.waitForTimeout(2800);
    const f = path.join(process.env.WF_OUT || path.join(ROOT, 'shots'), 'worlds-fix-' + n + '.png'); await page.screenshot({ path: f }); console.log('wrote', f, 'errors', errs.length); await page.close();
  }
}
await browser.close();
