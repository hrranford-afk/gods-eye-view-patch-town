/* Pictures for BOAT_MODEL.md (wiring section). Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/boatkit-render.js [only=1,2] [tiles=1]
   Pages with &boatkit=1, the boat clock held at a chosen time so a picture repeats. Writes 6 tiles to TILE_DIR (default /tmp/boatkit-tiles), shots/boatkit-sheet.png (labelled 2 x 3, python PIL)
   and shots/boatkit-1..3.png (1200 x 800: dinghy rowing, sailer under sail, harbour at dusk).
   Tiles: 1 dinghy rowing close, 2 sailer under sail, 3 work boat at the jetty, 4 wreck on the beach, 5 harbour at dusk with boats, 6 storm sea with a boat. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const only = (arg('only') || '1,2,3,4,5,6').split(',').map(Number);
const TILE_DIR = process.env.TILE_DIR || '/tmp/boatkit-tiles'; fs.mkdirSync(TILE_DIR, { recursive: true });
const DAY = '?ui=0&q=high&seed=1122&boatkit=1&clock=1&cfreeze=1&seat=3', DUSK = [121, 19.7, 4], NOON = [121, 16.5, 4];
/* [name, caption, page key, boat index (kit order: work, sailer, wreck, dinghy), boat clock, sky, camera relative to the boat] */
const T = [];
T[1] = ['dinghy', 'Dinghy rowing: oars in the rowlocks, dry inside', 'day', 3, 20, NOON, { dist: 8.5, phi: .38, theta: 1.1, ty: .3 }];
T[2] = ['sailer', 'Sailer under sail: boom on the lee side, heeled', 'day', 1, 14, NOON, { dist: 13, phi: .3, theta: .75, ty: 1.4 }];
T[3] = ['work', 'Work boat at the jetty, cuddy, crates, davit', 'day', 0, 20, NOON, { dist: 10.5, phi: .36, theta: 2.15, ty: .8 }];
T[4] = ['wreck', 'Wreck on the beach, no sea inside', 'day', 2, 20, NOON, { dist: 8.5, phi: .5, theta: .5, ty: .4 }];
T[5] = ['harbour', 'Harbour at dusk with boats', 'day', -1, 20, DUSK, { tx: -22, tz: 56, dist: 36, phi: .26, theta: .55, ty: 1 }];
T[6] = ['storm', 'Storm sea, the sailer under a heavy sky', 'storm', 1, 20, null, { dist: 11, phi: .34, theta: .6, ty: .8 }];
const QS = { day: DAY, storm: '?ui=0&q=high&seed=135&boatkit=1&sea=2&seat=5&wt=1&weather=auto&macro=1&mh=30&mt=0' };
const { browser, ctx } = await launch();
const pages = {};
async function page(key) {
  if (pages[key]) return pages[key];
  const p = await ctx.newPage(); await p.setViewportSize({ width: 1200, height: 800 }); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + QS[key]);
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  await p.waitForFunction(() => __li.boatkit && __li.boatkit.ready(), null, { timeout: 120000 });
  return pages[key] = { p, errs };
}
const made = [];
for (const i of only) {
  const [name, cap, key, bi, bt, sky, cam] = T[i]; const h = await page(key);
  await h.p.evaluate(([s, bt]) => { __li.holdClock(true); __li.clockT(bt); if (s && __li.clock) { __li.clock.setSky(...s); __li.clock.setSpeed(0); } }, [sky, bt]);
  const setCam = () => h.p.evaluate(([bi, cam]) => { const p = bi >= 0 ? __li.boatkit.pos(bi) : {}; __li.setView(Object.assign({ tx: p.x, tz: p.z, ty: .5, fov: 30 }, cam)); }, [bi, cam]);
  for (let k = 0; k < 3; k++) { await setCam(); await h.p.waitForTimeout(1500); }
  const out = path.join(TILE_DIR, 'tile' + String(i).padStart(2, '0') + '-' + name + '.png'); await h.p.screenshot({ path: out }); made.push([i, out, cap]);
  const info = await h.p.evaluate(() => ({ boats: __li.boatkit.boats().map(b => b.kind + ':' + b.lod + ':' + b.tris), tris: __li.stats().tris }));
  console.log('wrote', out, JSON.stringify(info), 'errors', Object.values(pages).reduce((a, x) => a + x.errs.length, 0));
}
await browser.close();
if (arg('tiles') === '1') process.exit(0);
const py = `
import sys, os, glob, shutil
from PIL import Image, ImageDraw, ImageFont
tile_dir, out_dir = sys.argv[1], sys.argv[2]
caps = ${JSON.stringify(Array.from({ length: 7 }, (_, i) => T[i] ? T[i][1] : ''))}
files = sorted(glob.glob(os.path.join(tile_dir, 'tile*.png')))
W, H = 800, 533
sheet = Image.new('RGB', (W * 2, H * 3), (20, 20, 24))
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
except Exception: font = ImageFont.load_default()
for f in files:
    i = int(os.path.basename(f)[4:6])
    im = Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(im, 'RGBA'); txt = '%d  %s' % (i, caps[i]); w = d.textlength(txt, font=font)
    d.rectangle([0, H - 32, w + 20, H], fill=(0, 0, 0, 150)); d.text((10, H - 28), txt, fill=(255, 255, 255, 255), font=font)
    c, r = (i - 1) % 2, (i - 1) // 2
    sheet.paste(im, (c * W, r * H))
sheet.save(os.path.join(out_dir, 'boatkit-sheet.png'))
for n, i in enumerate([1, 2, 5], 1):
    g = glob.glob(os.path.join(tile_dir, 'tile%02d-*.png' % i))
    if g: shutil.copy(g[0], os.path.join(out_dir, 'boatkit-%d.png' % n))
print('sheet', len(files), 'tiles')
`;
const r = spawnSync('python3', ['-c', py, TILE_DIR, path.join(ROOT, 'shots')], { encoding: 'utf8' });
console.log(r.stdout.trim(), r.stderr.trim());
