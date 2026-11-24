/* Pictures for LIGHTHOUSE_BUILD.md. Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/light-render.js [only=1,5] [tiles=1]
   Pages with &light=1&clock=1 (frozen sea clock, frozen game clock, frozen flash time so the picture shows a lit flash and a chosen beam angle). Writes 12 tiles to TILE_DIR (default /tmp/light-tiles),
   shots/light-sheet.png (3 x 4 sheet with captions, made with python PIL) and shots/light-1..4.png (larger: fog night, dusk, harbour at night with windows, world 153 at night).
   Tiles: 1 dusk beam in clear air, 2 night beam in clear air, 3 fog night, 4 to 7 the rungs (fire, post lamp, small lens, big lens), 8 ring of sight in mist, 9 relic beacon,
   10 harbour at night with windows and a marked mouth, 11 world 153 at night, 12 the morning after a wreck (salvage crate near the reef). */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const only = (arg('only') || '1,2,3,4,5,6,7,8,9,10,11,12').split(',').map(Number);
const TILE_DIR = process.env.TILE_DIR || '/tmp/light-tiles'; fs.mkdirSync(TILE_DIR, { recursive: true });
const SKY = { dusk: [121, 20.0, 4], night: [121, 23.0, 4] };
const T = [];   /* [name, caption, page key, sky, setup fn string run in the page] */
const tower = (dist, phi, side) => `__li.light.view('tower',{dist:${dist},phi:${phi},side:${side}})`;
T[1] = ['dusk', 'Dusk, clear air: a faint beam, a lit flash', 'main', SKY.dusk, `__li.light.setRung(3);__li.light.setChar('Fl2_10');__li.light.setYaw(340);${tower(140, .15, .6)}`];
T[2] = ['night', 'Night, clear air: the flash carries it', 'main', SKY.night, `__li.light.setRung(3);__li.light.setChar('Fl2_10');__li.light.setYaw(20);${tower(75, .2, .9)}`];
T[3] = ['fog', 'Fog night: the beam and the halo show', 'fog', SKY.night, `__li.light.setRung(3);__li.light.setChar('Fl2_10');__li.light.setYaw(0);${tower(150, .2, .7)}`];
T[4] = ['fire', 'Rung 0: fire on the headland, 10 nm', 'main', SKY.night, `__li.light.setRung(0);${tower(50, .26, .9)}`];
T[5] = ['post', 'Rung 1: lamp on a post, 3.1 nm', 'main', SKY.night, `__li.light.setRung(1);__li.light.setChar('Oc8');${tower(44, .24, .9)}`];
T[6] = ['small', 'Rung 2: small lens, 12.7 nm', 'main', SKY.night, `__li.light.setRung(2);__li.light.setChar('Fl5');__li.light.setFreeze(.25);__li.light.setYaw(335);${tower(80, .2, .9)}`];
T[7] = ['big', 'Rung 3: big lens, 15 nm in clear air', 'main', SKY.night, `__li.light.setRung(3);__li.light.setChar('Fl2_10');__li.light.setYaw(35);${tower(85, .22, .8)}`];
T[8] = ['ring', 'Ring of sight, big lens, mist (2 km): 3.3 nm', 'main', SKY.night, `__li.light.setRung(3);__li.light.setChar('Fl2_10');__li.light.setYaw(30);__li.light.setVis(2);__li.light.setRing(true);__li.setView({tx:0,tz:2,dist:235,phi:.7,theta:.42,ty:0,fov:30})`];
T[9] = ['relic', 'Relic beacon: an old mast that still blinks', 'main', SKY.night, `__li.light.setRung(4);__li.light.setChar('Fl3_15');__li.light.setFreeze(4.4);__li.light.setYaw(200);${tower(72, .2, .9)}`];
T[10] = ['harbour', 'Harbour at night: windows and a marked mouth', 'harbour', [121, 22.0, 4], `__li.light.setRung(3);__li.light.setChar('Fl2_10');__li.light.setFreeze(.25);__li.light.setYaw(340);__li.setView({tx:-30,tz:40,dist:75,phi:.32,theta:.5,ty:3,fov:34})`];
T[11] = ['world', 'World 153 at night', 'world', SKY.night, `__li.light.setRung(3);__li.light.setChar('Fl2_10');__li.light.setYaw(25);${tower(120, .22, .8)}`];
T[12] = ['salvage', 'The morning after a wreck: a crate by the reef', 'main', null, `__li.light.setRung(3);const r=__li.light.state().reef;__li.setView({tx:r.x,tz:r.z,dist:36,phi:.45,theta:.5,ty:0,fov:30})`];
const { browser, ctx } = await launch();
const QS = { main: '?ui=0&q=high&seed=1122&clock=1&cfreeze=1&seat=3&light=1&lfreeze=2.25&boats=2', fog: '?ui=0&q=high&seed=1122&clock=1&cfreeze=1&seat=3&light=1&lfreeze=2.25&boats=2&weather=fog&wt=1',
  harbour: '?ui=0&q=high&seed=1122&clock=1&cfreeze=1&seat=3&light=1&lfreeze=2.25&boats=2&lmark=1', world: '?ui=0&q=high&clock=1&cfreeze=1&seat=3&light=1&lfreeze=2.25&world=153' };
const pages = {};
async function page(key) {
  if (pages[key]) return pages[key];
  const p = await ctx.newPage(); await p.setViewportSize({ width: 1200, height: 800 }); const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + QS[key]);
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  return pages[key] = { p, errs };
}
const made = [];
for (const i of only) {
  const t = T[i]; if (!t) continue; const [name, cap, key, sky, setup] = t; const h = await page(key);
  await h.p.evaluate(([s, code]) => {
    __li.light.setYaw(null); __li.light.setVis(null); __li.light.setRing(false); __li.light.setFreeze(2.25); __li.light.setNight(null); __li.light.forceSalvage(false);
    if (s) { __li.clock.setSky(...s); __li.clock.setSpeed(0); }
    eval(code); __li.light.update(0, true);
  }, [sky, setup]);
  if (i === 12) {   /* the first wreck at an unmarked mouth, the morning after */
    const sv = await h.p.evaluate(() => { const r = __li.light.arrivals(0, 24 * 120, { rung: 'big', marked: false }); const e = r.events.find(e => e.salvage); return e ? e.salvage.hour : null; });
    await h.p.evaluate(hr => { __li.clock.setHours(hr + 0.8); __li.clock.setSpeed(0); __li.light.update(0, true); }, sv);
  }
  for (let k = 0; k < 3; k++) { await h.p.waitForTimeout(800); await h.p.evaluate(() => __li.light.update(0, true)); }
  const out = path.join(TILE_DIR, 'tile' + String(i).padStart(2, '0') + '-' + name + '.png'); await h.p.screenshot({ path: out }); made.push([i, out, cap]);
  const info = await h.p.evaluate(() => { const s = __li.light.state(); return { rung: s.rung, char: s.char, on: +s.on.toFixed(2), range: +s.rangeNm.toFixed(2), vis: s.visKm, crate: __li.light.parts().crate, tris: __li.stats().tris }; });
  console.log('wrote', out, JSON.stringify(info), 'errors', Object.values(pages).reduce((a, x) => a + x.errs.length, 0));
}
await browser.close();
if (arg('tiles') === '1') process.exit(0);
const py = `
import sys, os, glob, shutil
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
sheet.save(os.path.join(out_dir, 'light-sheet.png'))
for n, i in enumerate([3, 1, 10, 11], 1):
    g = glob.glob(os.path.join(tile_dir, 'tile%02d-*.png' % i))
    if g: shutil.copy(g[0], os.path.join(out_dir, 'light-%d.png' % n))
print('sheet', len(files), 'tiles')
`;
const r = spawnSync('python3', ['-c', py, TILE_DIR, path.join(ROOT, 'shots')], { encoding: 'utf8' });
console.log(r.stdout.trim(), r.stderr.trim());
