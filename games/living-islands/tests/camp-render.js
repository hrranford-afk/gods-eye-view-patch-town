/* Pictures for CAMP_START.md. Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/camp-render.js [only=1,2] [tiles=1]
   Three pages (software GL): the default island table with &start=camp (tiles 1, 2, 3, 5), the same with &clock=1 at dusk (tile 4), a world page &world=1&start=camp (tile 6).
   Tiles: 1 camp on day one, wide; 2 the robot yard by day (all three robots parked, one low on charge); 3 robots working the shore with their tracks; 4 robots parked in the yard at dusk (lamps lit);
   5 kit pieces close up; 6 a world page with start=camp. Writes TILE_DIR (default /tmp/camp-tiles), shots/camp-sheet.png (labelled 2 x 3, python PIL) and shots/camp-1..3.png (1200 x 800). */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const only = (arg('only') || '1,2,3,4,5,6').split(',').map(Number);
const TILE_DIR = process.env.TILE_DIR || '/tmp/camp-tiles'; fs.mkdirSync(TILE_DIR, { recursive: true });
const CAPS = ['', 'Day one: the camp island with its robot yard, no village', 'The robot yard by day: solar canopy, bays, bench, sorted heap', 'Robots work the shore; the tide will wipe their tracks', 'Dusk: all robots in their bays, lamps lit', 'Kit pieces: lean-to, drying rack, rain barrel, crates, cairn', 'A world page (world 1) with start=camp'];
const { browser, ctx } = await launch();
const errs = [];
async function page(qs) {
  const p = await ctx.newPage(); await p.setViewportSize({ width: 1200, height: 800 });
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|GPU stall|ReadPixels/.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs);
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  await p.waitForFunction(() => __li.campstart && __li.campstart.rt() && __li.campstart.rt().ready(), null, { timeout: 120000 });
  return p;
}
const shot = async (p, i) => { const out = path.join(TILE_DIR, 'tile' + String(i).padStart(2, '0') + '.png'); await p.screenshot({ path: out }); console.log('wrote', out); };
const rt = (p, f, a) => p.evaluate(([f, a]) => __li.campstart.rt()[f](...(a || [])), [f, a]);
const view = async (p, v, wait = 1800) => { await p.evaluate(v => __li.setView(v), v); await p.waitForTimeout(wait); };
const base = '?ui=0&q=high&seed=1122&start=camp';
const yardOf = p => p.evaluate(() => { const y = __li.campstart.rt().yard(); return { x: y.x, z: y.z, yaw: y.yaw }; });
if (only.some(i => [1, 2, 3, 5].includes(i))) {
  const p = await page(base + '&campwarm=0'); const Y = await yardOf(p);
  const camp = await p.evaluate(() => __li.camp());
  if (only.includes(1)) { await view(p, { tx: (Y.x + camp.x) / 2 - 12, tz: Y.z + 12, dist: 100, phi: .66, theta: .55 }, 2500); await shot(p, 1); }
  if (only.includes(2)) {
    await p.evaluate(() => { const c = __li.campstart.rt(); c.force({ rain: true }); c.advance(240); c.force({ rain: null }); c.sim().robots[1].charge = .2; c.advance(0); });
    await rt(p, 'force', [{ rain: true }]);
    await view(p, { tx: Y.x - Math.sin(Y.yaw) * .6, tz: Y.z - Math.cos(Y.yaw) * .6, dist: 17, phi: .62, theta: Y.yaw - .6 }, 2200); await shot(p, 2);
  }
  if (only.includes(3)) {
    await rt(p, 'force', [{ rain: false }]);
    /* run the day: advance until a robot is working with a trail behind it */
    await p.evaluate(() => { const c = __li.campstart.rt(); c.sim().robots.forEach(r => { r.charge = .95; r.timer = r.id * 4; }); c.advance(95); });
    const r = await p.evaluate(() => { const y = __li.campstart.rt().yard(), l = __li.campstart.rt().robots().filter(q => q.state !== 'bay' && Math.hypot(q.x - y.x, q.z - y.z) > 9); l.sort((a, b) => b.prints - a.prints); return l[0] || null; });
    console.log('shore robot', JSON.stringify(r && { s: r.state, p: r.prints }));
    if (r) await view(p, { tx: r.x, tz: r.z, dist: 14, phi: .56, theta: r.yaw + .6 }, 2200); await shot(p, 3);
  }
  if (only.includes(5)) {
    const ks = await p.evaluate(() => __li.campstart.rt().kit().map(k => ({ kind: k.kind, x: k.cx, z: k.cz, yaw: k.yaw })));
    const a = ks.find(k => k.kind === 'lean_to'), b = ks.find(k => k.kind === 'rain_barrel'), c = ks.find(k => k.kind === 'drying_rack');
    await p.evaluate(() => __li.campstart.rt().forceLod('live'));
    const mid = [a, b, c].filter(Boolean); const tx = mid.reduce((s, k) => s + k.x, 0) / mid.length, tz = mid.reduce((s, k) => s + k.z, 0) / mid.length;
    await view(p, { tx, tz, dist: 36, phi: .5, theta: (a ? a.yaw : 1.4) + .55 }, 2500); await shot(p, 5);
  }
  await p.close();
}
if (only.includes(4)) {
  const p = await page(base + '&clock=1&cfreeze=1&seat=3&boats=2');
  await p.evaluate(() => { __li.clock.setSky(121, -0, 4); __li.clock.setSpeed(0); });
  /* sun at about -3 degrees: civil twilight */
  await p.evaluate(() => { const C = SkyClock; let best = 12, bv = 1e9; for (let m = 600; m < 1440; m++) { const lst = m / 60, c = C.clock(1122, C.hoursFor(121, lst, 4, { doy0: __li.clock.state().doy0 }), { lat: __li.clock.state().lat, doy0: __li.clock.state().doy0 }); const d = Math.abs(c.sun.elev + 3) + (c.lst < 14 ? 99 : 0); if (d < bv) { bv = d; best = lst; } } __li.clock.setSky(121, best, 4); __li.clock.setSpeed(0); });
  await p.waitForTimeout(800);
  const Y = await yardOf(p);
  await p.evaluate(() => { const c = __li.campstart.rt(); c.sim().robots.forEach(r => { r.charge = .5 + r.id * .18; }); c.advance(240); c.sim().robots[0].charge = .3; });
  console.log('dusk states', JSON.stringify(await rt(p, 'robots')).slice(0, 400));
  await view(p, { tx: Y.x - Math.sin(Y.yaw) * .6, tz: Y.z - Math.cos(Y.yaw) * .6, dist: 17, phi: .6, theta: Y.yaw - .6 }, 2500); await shot(p, 4);
  await p.close();
}
if (only.includes(6)) {
  const p = await page('?ui=0&q=high&world=1&start=camp&campwarm=0'); const Y = await yardOf(p);
  await p.evaluate(() => { const c = __li.campstart.rt(); c.advance(70); });
  await view(p, { tx: Y.x + 4, tz: Y.z - 2, dist: 52, phi: .58, theta: Y.yaw + 1.2 }, 2500); await shot(p, 6);
  await p.close();
}
console.log('errors', errs.length, errs.slice(0, 3));
await browser.close();
if (arg('tiles') === '1') process.exit(0);
const py = `
import sys, os, shutil
from PIL import Image, ImageDraw, ImageFont
tile_dir, out_dir = sys.argv[1], sys.argv[2]
caps = ${JSON.stringify(CAPS)}
order = [1, 2, 3, 4, 5, 6]
W, H = 800, 533
sheet = Image.new('RGB', (W * 2, H * 3), (20, 20, 24))
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
except Exception: font = ImageFont.load_default()
for n, i in enumerate(order):
    f = os.path.join(tile_dir, 'tile%02d.png' % i)
    if not os.path.exists(f): continue
    im = Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(im, 'RGBA'); txt = '%d  %s' % (i, caps[i]); w = d.textlength(txt, font=font)
    d.rectangle([0, H - 32, w + 20, H], fill=(0, 0, 0, 150)); d.text((10, H - 28), txt, fill=(255, 255, 255, 255), font=font)
    sheet.paste(im, ((n % 2) * W, (n // 2) * H))
sheet.save(os.path.join(out_dir, 'camp-sheet.png'))
for n, i in enumerate([2, 1, 3], 1):
    f = os.path.join(tile_dir, 'tile%02d.png' % i)
    if os.path.exists(f): shutil.copy(f, os.path.join(out_dir, 'camp-%d.png' % n))
print('sheet done')
`;
const r = spawnSync('python3', ['-c', py, TILE_DIR, path.join(ROOT, 'shots')], { encoding: 'utf8' });
console.log(r.stdout.trim(), r.stderr.trim());
