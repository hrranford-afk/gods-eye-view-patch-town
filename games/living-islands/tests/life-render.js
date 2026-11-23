/* LIFE pictures (Living Islands, LIFE_VIEW.md). Frozen sea clock and a frozen life clock, fixed sun and tide, so the pictures repeat.
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/life-render.js [mode=all|sheet|big] [only=1,2,3,4]
   sheet: all 12 worlds with &life=1, numbered and labelled -> shots/life-sheet.png (raw tiles in $LIFE_RAW or the temp folder; tests/world-view-sheet.py draws the labels)
   big:   four larger pictures -> shots/life-1..4.png: (1) seals on a haul-out, (2) a gannet plunge-dive with its splash, (3) a robot on a beach with its tracks, (4) kelp and a fish shoal under the surface. */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
const arg = (k, d) => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1] || d;
const mode = arg('mode', 'all'), only = arg('only', '').split(',').filter(Boolean).map(Number);
const RAW = process.env.LIFE_RAW || path.join(os.tmpdir(), 'life-raw'); fs.mkdirSync(RAW, { recursive: true });
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'landform/worlds/index.json'), 'utf8')).worlds;
const FIXED = '&ui=0&q=high&seat=3&sun=40&az=-65&tide=0.15&life=1';
const { browser, ctx } = await launch();
async function load(seed, extra) {
  const page = await ctx.newPage(); await page.setViewportSize({ width: 1200, height: 800 }); const errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver Message|GPU stall|ReadPixels/.test(m.text())) errs.push(m.text()); }); page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + ROOT + '/islands_look.html?world=' + seed + FIXED + (extra || ''));
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 300000 });
  await page.waitForFunction(() => !__li.life.robots || __li.life.robots.count() === 0 || __li.life.robots.loaded(), null, { timeout: 300000 });
  return { page, errs };
}
const settle = async page => { await page.waitForTimeout(2200); };
if (mode === 'all' || mode === 'sheet') {
  for (const w of idx.filter(w => !only.length || only.includes(w.seed))) {
    const { page, errs } = await load(w.seed);
    await page.evaluate(() => { const L = __li.life; L.setTime(37);
      /* centre of the life: mean of the seal sites, colonies, puffins and robots, so every tile shows animals */
      const pts = L.sites().filter(s => s.slots > 0).map(s => [s.x, s.z]).concat(L.birds().colony.slice(0, 6).map(b => [b.x, b.z]), L.robots.list().map(r => [r.x, r.z]));
      const cx = pts.reduce((a, p) => a + p[0], 0) / Math.max(1, pts.length), cz = pts.reduce((a, p) => a + p[1], 0) / Math.max(1, pts.length);
      __li.setView({ tx: cx * .6, tz: cz * .6, dist: 215, phi: .78, theta: .5 }); });
    await settle(page);
    const f = path.join(RAW, 'w' + String(w.seed).padStart(4, '0') + '.png'); await page.screenshot({ path: f });
    console.log('tile', w.seed, 'errors', errs.length, JSON.stringify(await page.evaluate(() => __li.life.counts())).slice(0, 220)); await page.close();
  }
  if (!only.length) { const r = spawnSync('python3', [path.join(ROOT, 'tests/world-view-sheet.py'), RAW, path.join(ROOT, 'shots/life-sheet.png'), path.join(ROOT, 'landform/worlds/index.json')], { encoding: 'utf8' }); console.log(r.stdout, r.stderr); }
}
const BIG = [[5, 'seals'], [153, 'gannet'], [174, 'robot'], [5, 'kelp']];
if (mode === 'all' || mode === 'big') {
  let n = 0;
  for (const [seed, kind] of BIG) {
    n++; if (only.length && !only.includes(n)) continue;
    const { page, errs } = await load(seed, kind === 'robot' ? '' : '&robots=0');
    await page.evaluate(k => { const L = __li.life, H = __li.H;
      if (k === 'seals') { L.setTime(12); const s = L.sites().sort((a, b) => b.slots - a.slots)[0]; let m = L.seals().filter(q => q.site === s.id); const cx0 = m.reduce((a, q) => a + q.x, 0) / m.length, cz0 = m.reduce((a, q) => a + q.z, 0) / m.length; m = m.sort((a, b) => Math.hypot(a.x - cx0, a.z - cz0) - Math.hypot(b.x - cx0, b.z - cz0)).slice(0, 8); const mx = m.reduce((a, q) => a + q.x, 0) / m.length, mz = m.reduce((a, q) => a + q.z, 0) / m.length; __li.setView({ tx: mx, tz: mz, dist: 22, phi: .62, theta: .9 }); }
      if (k === 'gannet') { const d = L.gannetDive(0), t = d.start + d.P + d.len * .545; const g = L.gannetAt(0, t); L.setTime(t); __li.setView({ tx: g.x, tz: g.z, dist: 13, phi: .55, theta: .9 }); }
      if (k === 'robot') { L.robots.forceSun(false); const c = L.robots.cycle(0, 2); for (let t = c.start; t < c.start + c.leg * .8; t += .4) L.setTime(t); const r = L.robots.list()[0]; __li.setView({ tx: r.x, tz: r.z, dist: 13, phi: .95, theta: r.yaw + Math.PI + .5 }); }
      if (k === 'kelp') { L.setTime(40); const K = L.kelp().filter(q => q.bed > -3.4 && q.bed < -1.0), s = L.shoals()[0]; let best = K[0] || L.kelp()[0], bs = -1e9; for (const q of K) { const dens = K.filter(p => Math.hypot(p.x - q.x, p.z - q.z) < 14).length - Math.hypot(q.x - s.x, q.z - s.z) * .05; if (dens > bs) { bs = dens; best = q; } }
        const bd = Math.hypot(best.x - s.x, best.z - s.z); __li.setView({ tx: (best.x + s.x * .5) / 1.5, tz: (best.z + s.z * .5) / 1.5, dist: 24 + bd * .7, phi: .5, theta: .9 }); }
    }, kind);
    await settle(page);
    const f = path.join(ROOT, 'shots', 'life-' + n + '.png'); await page.screenshot({ path: f });
    console.log('wrote', f, 'errors', errs.length, errs[0] || ''); await page.close();
  }
}
await browser.close();
