/* Pictures for REPAIR_PILOT.md. Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/repair-render.js [only=1,2] [tiles=1]
   One story on one page (?repair=1, seed 1122): the broken jetty, drifting planks, a plank in the hand over its glowing socket, partly repaired, fully repaired with a boat moored and the settler at the end, a surge.
   Writes 6 tiles to TILE_DIR (default /tmp/repair-tiles), shots/repair-sheet.png (labelled 2 x 3, python PIL) and shots/repair-1..3.png (1200 x 800: plank in the hand, broken, repaired).
   Tiles: 1 broken with loose planks, 2 a plank mid-drag with its glowing socket, 3 partly repaired, 4 fully repaired with a boat moored, 5 loose planks drifting in the shallows, 6 after a surge. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const only = (arg('only') || '1,2,3,4,5,6').split(',').map(Number);
const TILE_DIR = process.env.TILE_DIR || '/tmp/repair-tiles'; fs.mkdirSync(TILE_DIR, { recursive: true });
const CAPS = ['', 'Broken: decking lies on the sand and in the shallows', 'A plank in the hand, its socket glowing', 'Partly repaired: five of nine', 'Repaired: a boat moors, the settler walks out', 'Loose planks float and drift in the shallows', 'After a surge: the lashings gave way'];
const { browser, ctx } = await launch();
const p = await ctx.newPage(); await p.setViewportSize({ width: 1200, height: 800 }); const errs = [];
p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|GPU stall|ReadPixels/.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + ROOT + '/islands_look.html?ui=0&q=high&seed=1122&repair=1');
await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
await p.waitForFunction(() => __li.repair && __li.repair.ready(), null, { timeout: 120000 });
const view = async (v, wait = 2200) => { await p.evaluate(v => { const S = __li.repair.dbg().site; __li.repair.view({ theta: S.psi + v.theta, dist: v.dist, phi: v.phi, tx: v.tx, tz: v.tz }); }, v); await p.waitForTimeout(wait); };
const shot = async i => { const out = path.join(TILE_DIR, 'tile' + String(i).padStart(2, '0') + '.png'); await p.screenshot({ path: out }); console.log('wrote', out, JSON.stringify(await p.evaluate(() => ({ c: __li.repair.count(), tris: __li.repair.tris() })))); };
const step = n => p.evaluate(n => __li.repair.step(n), n);
const loc = (x, z) => p.evaluate(([x, z]) => { const r = __li.repair.local(x, 0, z); return { tx: r[0], tz: r[2] }; }, [x, z]);
/* 1 broken */
await step(120);
if (only.includes(1)) { await view({ theta: 1.0, dist: 10.5, phi: .5, ...(await loc(1.2, 0)) }); await shot(1); }
/* 5 drifting: a rising tide, the camera low over the shallows with the planks on the water */
if (only.includes(5)) {
  await p.evaluate(() => { __li.setTide(-.5); __li.repair.step(240); __li.setTide(.35); });
  await p.waitForTimeout(500); await step(120 * 5);
  const f = await p.evaluate(() => { const b = __li.repair.bodies().filter(b => b.sub > .3); const c = b.reduce((a, q) => [a[0] + q.p[0] / b.length, a[1] + q.p[2] / b.length], [0, 0]); return { n: b.length, tx: c[0], tz: c[1] }; });
  console.log('floating', f.n);
  await view({ theta: -1.9, dist: 11, phi: .42, tx: f.tx, tz: f.tz }, 2500); await shot(5);
}
/* 2 mid-drag */
if (only.includes(2) || only.includes(3) || only.includes(4) || only.includes(6)) {
  await p.evaluate(() => { __li.setTide(0); }); await step(240);
  await view({ theta: 1.0, dist: 9.5, phi: .5, ...(await loc(.9, 0)) }, 2000);
  const s0 = await p.evaluate(() => ({ b: __li.repair.bodies(), s: __li.repair.sockets() }));
  const sc = await p.evaluate(ids => ids.map(id => __li.repair.screen(id)), s0.b.filter(b => b.kind === 'plank' && !b.spare).map(b => b.id));
  const cand = s0.b.filter(b => b.kind === 'plank' && !b.spare); let pick = null;
  cand.forEach((b, i) => { const q = sc[i]; if (!pick && q[0] > 70 && q[0] < 1130 && q[1] > 120 && q[1] < 730 && b.state === 'dyn') pick = b; });
  if (!pick) pick = s0.b.find(b => b.kind === 'plank' && b.spare);
  const a = await p.evaluate(id => __li.repair.screen(id), pick.id), t = await p.evaluate(() => __li.repair.screenSock('deck3'));
  await p.mouse.move(a[0], a[1]); await p.mouse.down();
  for (let i = 1; i <= 4; i++) await p.mouse.move(a[0] + (t[0] - a[0]) * i / 4, a[1] + (t[1] - a[1]) * i / 4);
  await step(150); await p.waitForTimeout(600);
  if (only.includes(2)) await shot(2);
  await p.mouse.up(); await step(120);
  /* 3 partly repaired: the mouse fits the first, the rest are placed (fast) */
  await p.evaluate(() => { const S = __li.repair.sockets(); let n = 0; for (const s of S) { if (s.kind !== 'plank' || s.filled || n >= 4) continue; const o = __li.repair.bodies().find(b => b.kind === 'plank' && b.state === 'dyn' && !b.lost); if (!o) break; __li.repair.place(o.id, s.id); n++; if (n >= 3) break; } __li.repair.step(120); });
  await view({ theta: 1.0, dist: 10.5, phi: .5, ...(await loc(1.4, 0)) }, 2200);
  if (only.includes(3)) await shot(3);
  /* 4 fully repaired: everything, the boat, the settler at the end */
  await p.evaluate(() => { __li.repair.fitAll(); __li.repair.step(120); __li.repair.walk(); });
  for (let i = 0; i < 120; i++) { await p.waitForTimeout(300); if ((await p.evaluate(() => __li.repair.walkState())) !== 'walking') break; }
  await view({ theta: .85, dist: 11.5, phi: .46, ...(await loc(2.2, -.4)) }, 2500);
  if (only.includes(4)) await shot(4);
  /* 6 a surge */
  if (only.includes(6)) {
    await p.evaluate(() => __li.repair.surge());
    for (let i = 0; i < 6; i++) await step(120); await p.waitForTimeout(400);
    await view({ theta: .85, dist: 11.5, phi: .46, ...(await loc(1.2, 0)) }, 1500); await step(60);
    for (let i = 0; i < 9; i++) await step(120);
    await p.waitForTimeout(1500); await shot(6);
  }
}
console.log('errors', errs.length, errs.slice(0, 3));
await browser.close();
if (arg('tiles') === '1') process.exit(0);
const py = `
import sys, os, glob, shutil
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
sheet.save(os.path.join(out_dir, 'repair-sheet.png'))
for n, i in enumerate([2, 1, 4], 1):
    f = os.path.join(tile_dir, 'tile%02d.png' % i)
    if os.path.exists(f): shutil.copy(f, os.path.join(out_dir, 'repair-%d.png' % n))
print('sheet done')
`;
const r = spawnSync('python3', ['-c', py, TILE_DIR, path.join(ROOT, 'shots')], { encoding: 'utf8' });
console.log(r.stdout.trim(), r.stderr.trim());
