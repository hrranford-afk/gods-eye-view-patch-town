/* ROBOTS IN THE WORLDS pictures (Living Islands, LIFE_VIEW.md). Frozen sea clock and a frozen life clock, fixed sun and tide, so the pictures repeat.
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/robots-world-render.js [mode=all|sheet|big] [only=1,2,3]
   sheet: all 12 worlds with &life=1, a camera close enough that the machines read, numbered and labelled -> shots/robots-world-sheet.png (raw tiles in $LIFE_RAW or the temp folder; tests/world-view-sheet.py draws the labels)
   big:   three larger pictures -> shots/robots-world-1..3.png: (1) a walker on the beach, (2) a pontoon on the water of a harbour with its wake, (3) a snail on sand. */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
const arg = (k, d) => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1] || d;
const mode = arg('mode', 'all'), only = arg('only', '').split(',').filter(Boolean).map(Number);
const RAW = process.env.LIFE_RAW || path.join(os.tmpdir(), 'robots-world-raw'); fs.mkdirSync(RAW, { recursive: true });
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'landform/worlds/index.json'), 'utf8')).worlds;
const FIXED = '&ui=0&q=high&seat=3&sun=40&az=-65&tide=0.15&life=1&robots=1';
const { browser, ctx } = await launch();
async function load(seed, extra) {
  const page = await ctx.newPage(); await page.setViewportSize({ width: 1200, height: 800 }); const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GPU stall|ReadPixels/.test(m.text())) errs.push(m.text()); }); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + ROOT + '/islands_look.html?world=' + seed + FIXED + (extra || ''));
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 300000 });
  await page.waitForFunction(() => !__li.life.robots || __li.life.robots.count() === 0 || __li.life.robots.loaded(), null, { timeout: 300000 });
  await page.evaluate(AIM);
  return { page, errs };
}
/* the page looks at height 0 of the target, so on high ground the target is moved away from the camera by h / tan(phi) to centre the machine */
const AIM = `window.aim = (r, dist, phi, theta) => { const h = Math.max(0, r.y || 0), d = h / Math.tan(phi); __li.setView({ tx: r.x - Math.sin(theta) * d, tz: r.z - Math.cos(theta) * d, dist, phi, theta }); };`;
const settle = async page => { await page.waitForTimeout(2200); };
if (mode === 'all' || mode === 'sheet') {
  for (const w of idx.filter(w => !only.length || only.includes(w.seed))) {
    const { page, errs } = await load(w.seed);
    const info = await page.evaluate(() => { const L = __li.life, R = L.robots; R.forceSun(false); for (let t = 0; t <= 36; t += .5) L.setTime(t);   /* walk the clock so the prints and wakes exist */
      const li = R.list(); let k = li.findIndex(r => r.plan !== 'family'); if (k < 0) k = 0; const r = li[k];   /* the first radical machine of the world, else the first robot */
      aim(r, r.plan === 'pontoon' ? 19 : 15, .8, r.yaw + Math.PI + .6); return li.map(r => r.plan + (r.plan === 'family' ? '' : '')); });
    await settle(page);
    const f = path.join(RAW, 'w' + String(w.seed).padStart(4, '0') + '.png'); await page.screenshot({ path: f });
    console.log('tile', w.seed, 'errors', errs.length, info.join(',')); await page.close();
  }
  if (!only.length) { const r = spawnSync('python3', [path.join(ROOT, 'tests/world-view-sheet.py'), RAW, path.join(ROOT, 'shots/robots-world-sheet.png'), path.join(ROOT, 'landform/worlds/index.json')], { encoding: 'utf8' }); console.log(r.stdout, r.stderr); }
}
const BIG = [[5, 'walker'], [5, 'pontoon'], [5, 'snail']];
if (mode === 'all' || mode === 'big') {
  let n = 0;
  for (const [seed, plan] of BIG) {
    n++; if (only.length && !only.includes(n)) continue;
    const { page, errs } = await load(seed);
    const i = await page.evaluate(k => { const L = __li.life, R = L.robots; R.forceSun(false); const li = R.list(), i = li.findIndex(r => r.plan === k); const c = R.cycle(i, 2);
      for (let t = c.start - 2; t < c.start + c.leg * (k === 'pontoon' ? .95 : .8); t += .4) L.setTime(t); const r = R.list()[i];
      aim(r, k === 'pontoon' ? 16 : 11, k === 'pontoon' ? .85 : .95, r.yaw + Math.PI + .6); return i; }, plan);
    await settle(page);
    const f = path.join(ROOT, 'shots', 'robots-world-' + n + '.png'); await page.screenshot({ path: f });
    console.log('wrote', f, 'robot', i, 'errors', errs.length, errs[0] || ''); await page.close();
  }
}
await browser.close();
