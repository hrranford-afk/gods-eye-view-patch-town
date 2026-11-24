/* Pictures for SKY_CLOCK_BUILD.md. Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/clock-render.js [only=1,5] [tiles=1]
   One page with &clock=1 (frozen sea clock, frozen game clock), the sky set per picture with __li.clock.setSky(day of year, local solar hour, moon age), then a screenshot.
   Writes 12 tiles to the scratch folder (TILE_DIR, default /tmp/clock-tiles), shots/clock-sheet.png (3 x 4 sheet with captions, made with python PIL) and shots/clock-1..4.png (larger).
   Tiles: 1 dawn, 2 noon, 3 golden hour, 4 dusk, 5 night with stars, 6 moonlit sea, 7 full moon, 8 new moon (no moonlight), 9 midsummer midnight, 10 midwinter noon, 11 a night with window glows, 12 foggy dusk.
   Sun and moon positions are searched here with sky_clock.js so every picture looks at the right part of the sky. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
await import(path.join(ROOT, 'sky_clock.js')); const C = globalThis.SkyClock;
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const only = (arg('only') || '1,2,3,4,5,6,7,8,9,10,11,12').split(',').map(Number);
const TILE_DIR = process.env.TILE_DIR || '/tmp/clock-tiles'; fs.mkdirSync(TILE_DIR, { recursive: true });
const LAT = 57.5, D2R = Math.PI / 180;
/* the local solar hour at which the sun crosses elev (rising or setting) on a calendar day */
function lstAt(doy, elev, rising) { let best = null, bv = 1e9; for (let m = 0; m < 1440; m++) { const lst = m / 60, c = C.clock(1122, C.hoursFor(doy, lst, null, { doy0: 100 }), { lat: LAT, doy0: 100 }); const slope = (C.clock(1122, C.hoursFor(doy, lst + 0.02, null, { doy0: 100 }), { lat: LAT, doy0: 100 }).sun.elev - c.sun.elev) > 0; if (slope === rising && Math.abs(c.sun.elev - elev) < bv) { bv = Math.abs(c.sun.elev - elev); best = lst; } } return best; }
const at = (doy, lst, age) => C.clock(1122, C.hoursFor(doy, lst, age, { doy0: 100 }), { lat: LAT, doy0: 100 });
/* a camera that looks at azimuth az (degrees from north) with a given pitch above the horizon; theta = -az because the camera sits at +z looking north at theta 0 */
const sky = (az, pitch, fov, dist, phi) => { dist = dist || 190; phi = phi || .1; const camH = Math.sin(phi) * dist; return { tx: 0, tz: 0, dist, phi, theta: -az * D2R, ty: camH + Math.cos(phi) * dist * Math.tan(pitch * D2R), fov: fov || 56 }; };
const HOME = { tx: 0, tz: 2, dist: 290, phi: .93, theta: .42, ty: 0, fov: 30 };
const MID = az => ({ tx: 0, tz: 0, dist: 150, phi: .34, theta: -az * D2R, ty: 14, fov: 46 });
const VILL = { tx: -42, tz: 26, dist: 62, phi: .5, theta: .5, ty: 0, fov: 30 };
const T = [];   /* [name, caption, doy, lst, moonAge, camera, weather page?] */
const dawnLst = lstAt(110, 1.0, true), goldLst = lstAt(121, 4.5, false), duskLst = lstAt(121, -3.0, false);
const sunAz = (doy, lst, age) => at(doy, lst, age).sun.az, moonAz = (doy, lst, age) => at(doy, lst, age).moon.az;
T[1] = ['dawn', 'Dawn, 10 Apr, sun +1 deg', 110, dawnLst, 4, sky(sunAz(110, dawnLst, 4), 14, 58)];
T[2] = ['noon', 'Noon, 1 May, sun 47 deg', 121, 12.4, 4, HOME];
T[3] = ['golden', 'Golden hour, sun +4.5 deg', 121, goldLst, 4, MID(sunAz(121, goldLst, 4) - 18)];
T[4] = ['dusk', 'Dusk, civil twilight, sun -3 deg', 121, duskLst, 4, sky(sunAz(121, duskLst, 4), 16, 60)];
T[5] = ['stars', 'Night, stars rotating', 300, 22.5, 24, sky(35, 40, 62)];
T[6] = ['moonlit', 'Moonlit sea, moon 10 d old', 300, 21.5, 10, sky(moonAz(300, 21.5, 10) + 6, 20, 70, 190, .12)];
T[7] = ['full', 'Full moon, up all night', 300, 23.5, 14.8, sky(moonAz(300, 23.5, 14.8), 24, 74, 190, .1)];
T[8] = ['new', 'New moon: only the fire and windows', 300, 23.0, 0.4, { tx: -38, tz: 28, dist: 82, phi: .55, theta: .5, ty: 0, fov: 30 }];
T[9] = ['midsummer', 'Midsummer midnight, never dark', 172, 23.9, 4, sky(5, 8, 66)];
T[10] = ['midwinter', 'Midwinter noon, sun 9 deg', 355, 12.0, 4, { tx: 0, tz: 2, dist: 230, phi: .62, theta: .1, ty: 0, fov: 30 }];
T[11] = ['windows', 'A night with window glows', 300, 20.2, 3, VILL];
T[12] = ['foggy', 'Foggy dusk (weather=fog)', 121, lstAt(121, -1.5, false), 4, { tx: -30, tz: 20, dist: 120, phi: .3, theta: .45, ty: 6, fov: 40 }, 'fog'];
const { browser, ctx } = await launch();
async function page(qs) {
  const p = await ctx.newPage(); await p.setViewportSize({ width: 1200, height: 800 }); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs);
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  return { p, errs };
}
const base = '?ui=0&q=high&seed=1122&clock=1&cfreeze=1&seat=3&boats=2';
let main = null, wx = null; const made = [];
for (const i of only) {
  const t = T[i]; if (!t) continue; const [name, cap, doy, lst, age, cam, weather] = t;
  let h;
  if (weather) { if (!wx) wx = await page(base + '&weather=' + weather + '&wt=1'); h = wx; } else { if (!main) main = await page(base); h = main; }
  await h.p.evaluate(([d, l, a]) => { __li.clock.setSky(d, l, a); __li.clock.setSpeed(0); }, [doy, lst, age]);
  for (let k = 0; k < 3; k++) { await h.p.evaluate(c => __li.setView(c), cam); await h.p.waitForTimeout(900); }
  const out = path.join(TILE_DIR, 'tile' + String(i).padStart(2, '0') + '-' + name + '.png'); await h.p.screenshot({ path: out }); made.push([i, out, cap]);
  const info = await h.p.evaluate(() => { const c = __li.clock.state().c; return { lst: +c.lst.toFixed(2), sun: +c.sun.elev.toFixed(1), moon: +c.moon.elev.toFixed(1), illum: +c.moon.illum.toFixed(2), win: +__li.clock.litFraction().toFixed(2) }; });
  console.log('wrote', out, JSON.stringify(info), 'errors', (main ? main.errs.length : 0) + (wx ? wx.errs.length : 0));
}
await browser.close();
if (arg('tiles') === '1') process.exit(0);
/* the sheet and the four larger pictures */
const have = fs.readdirSync(TILE_DIR).filter(f => /^tile\d\d-/.test(f)).sort();
const py = `
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont
tile_dir, out_dir = sys.argv[1], sys.argv[2]
caps = ${JSON.stringify(Array.from({ length: 13 }, (_, i) => T[i] ? T[i][1] : ''))}
files = sorted(glob.glob(os.path.join(tile_dir, 'tile*.png')))
W, H = 600, 400
sheet = Image.new('RGB', (W * 3, H * 4), (20, 20, 24))
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 17)
except Exception: font = ImageFont.load_default()
for f in files:
    i = int(os.path.basename(f)[4:6])
    im = Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(im, 'RGBA'); txt = '%d  %s' % (i, caps[i]); w = d.textlength(txt, font=font)
    d.rectangle([0, H - 28, w + 18, H], fill=(0, 0, 0, 150)); d.text((9, H - 25), txt, fill=(255, 255, 255, 255), font=font)
    c, r = (i - 1) % 3, (i - 1) // 3
    sheet.paste(im, (c * W, r * H))
sheet.save(os.path.join(out_dir, 'clock-sheet.png'))
print('sheet', len(files), 'tiles')
`;
const r = spawnSync('python3', ['-c', py, TILE_DIR, path.join(ROOT, 'shots')], { encoding: 'utf8' }); console.log(r.stdout.trim(), r.stderr.trim());
/* the four larger pictures are straight copies of four tiles at full size: golden hour, dusk, moonlit sea, window glows */
for (const [n, i] of [[1, 3], [2, 4], [3, 6], [4, 11]]) { const f = have.find(x => x.startsWith('tile' + String(i).padStart(2, '0'))); if (f) fs.copyFileSync(path.join(TILE_DIR, f), path.join(ROOT, 'shots', 'clock-' + n + '.png')); }
