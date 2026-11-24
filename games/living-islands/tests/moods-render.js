/* Pictures for MOODS_BUILD.md. Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/moods-render.js [only=1,3] [tiles=1]
   Pages with &moods=1&mood=NAME (frozen game clock, frozen weather time, frozen sea clock so every run gives the same picture). Writes 6 tiles to TILE_DIR (default /tmp/moods-tiles),
   shots/moods-sheet.png (2 x 3 sheet with captions, made with python PIL) and shots/moods-1..4.png (1200 x 800: rainbow, rays, frost with sea smoke, clear night).
   Tiles: 1 rainbow (double bow over a rain curtain), 2 sun shower, 3 crepuscular rays, 4 frost and sea smoke at dawn, 5 post-storm clearing, 6 clear night with a northern glow. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const only = (arg('only') || '1,2,3,4,5,6').split(',').map(Number);
const TILE_DIR = process.env.TILE_DIR || '/tmp/moods-tiles'; fs.mkdirSync(TILE_DIR, { recursive: true });
const T = [];   /* [file name, caption, mood, extra page code run after the mood is held] */
T[1] = ['rainbow', 'Rainbow: a double bow over a passing shower', 'rainbow', ''];
T[2] = ['shower', 'Sun shower: rain falling through bright sun', 'shower', ''];
T[3] = ['rays', 'Rays: shafts through cloud at low sun', 'rays', ''];
T[4] = ['frost', 'Frost and sea smoke on a cold clear dawn', 'frost', ''];
T[5] = ['clearing', 'Clearing: the washed day after a storm', 'clearing', ''];
T[6] = ['night', 'Clear night: stars and a northern glow', 'night', ''];
const { browser, ctx } = await launch();
const made = [];
for (const i of only) {
  const t = T[i]; if (!t) continue; const [name, cap, mood, code] = t;
  const p = await ctx.newPage(); await p.setViewportSize({ width: 1200, height: 800 }); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + ROOT + '/islands_look.html?ui=0&q=high&seed=1122&moods=1&mood=' + mood + '&cfreeze=1&seat=3&wt=1');
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  if (code) await p.evaluate(code);
  for (let k = 0; k < 5; k++) { await p.waitForTimeout(900); }
  const out = path.join(TILE_DIR, 'tile' + String(i).padStart(2, '0') + '-' + name + '.png'); await p.screenshot({ path: out }); made.push([i, out, cap]);
  const info = await p.evaluate(() => { const s = __li.moods.state(); return { k: s.k, smoke: +s.smoke.toFixed(2), aurora: +s.aurora.toFixed(2), tris: __li.stats().tris, moodTris: __li.moods.tris() }; });
  console.log('wrote', out, JSON.stringify(info), 'errors', errs.filter(e => !/GL Driver|GPU stall|ReadPixels/.test(e)).length);
  await p.close();
}
await browser.close();
if (arg('tiles') === '1') process.exit(0);
const py = `
import sys, os, glob, shutil
from PIL import Image, ImageDraw, ImageFont
tile_dir, out_dir = sys.argv[1], sys.argv[2]
caps = ${JSON.stringify(Array.from({ length: 7 }, (_, i) => T[i] ? T[i][1] : ''))}
files = sorted(glob.glob(os.path.join(tile_dir, 'tile*.png')))
W, H = 600, 400
sheet = Image.new('RGB', (W * 3, H * 2), (20, 20, 24))
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 17)
except Exception: font = ImageFont.load_default()
for f in files:
    i = int(os.path.basename(f)[4:6])
    im = Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(im, 'RGBA'); txt = '%d  %s' % (i, caps[i]); w = d.textlength(txt, font=font)
    d.rectangle([0, H - 28, w + 18, H], fill=(0, 0, 0, 150)); d.text((9, H - 25), txt, fill=(255, 255, 255, 255), font=font)
    c, r = (i - 1) % 3, (i - 1) // 3
    sheet.paste(im, (c * W, r * H))
sheet.save(os.path.join(out_dir, 'moods-sheet.png'))
for n, i in enumerate([1, 3, 4, 6], 1):
    g = glob.glob(os.path.join(tile_dir, 'tile%02d-*.png' % i))
    if g: shutil.copy(g[0], os.path.join(out_dir, 'moods-%d.png' % n))
print('sheet', len(files), 'tiles')
`;
const r = spawnSync('python3', ['-c', py, TILE_DIR, path.join(ROOT, 'shots')], { encoding: 'utf8' });
console.log(r.stdout.trim(), r.stderr.trim());
