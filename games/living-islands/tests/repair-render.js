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
const CAPS = ['', 'Broken: decking lies on the sand and in the shallows', 'A plank in the hand, its socket glowing', 'Partly repaired', 'Repaired: a boat moors, the settler walks out', 'Loose planks float and drift in the shallows', 'After a surge: the lashings gave way'];
const { browser, ctx } = await launch();
const p = await ctx.newPage(); await p.setViewportSize({ width: 1200, height: 800 }); const errs = [];
p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|GPU stall|ReadPixels/.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + ROOT + '/islands_look.html?ui=0&q=high&seed=1122&repair=1&boatkit=1');
await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
await p.waitForFunction(() => __li.repair && __li.repair.ready() && __li.boatkit && __li.boatkit.ready(), null, { timeout: 120000 });
const view = async (v, wait = 2200) => { await p.evaluate(v => { const S = __li.repair.dbg().site; __li.repair.view({ theta: S.psi + v.theta, dist: v.dist, phi: v.phi, tx: v.tx, tz: v.tz }); }, v); await p.waitForTimeout(wait); };
const COUNT = {};
const shot = async i => { const out = path.join(TILE_DIR, 'tile' + String(i).padStart(2, '0') + '.png'); await p.screenshot({ path: out }); const c = await p.evaluate(() => __li.repair.count()); COUNT[i] = c; console.log('wrote', out, JSON.stringify({ c, tris: await p.evaluate(() => __li.repair.tris()) })); };
const step = n => p.evaluate(n => __li.repair.step(n), n);
const loc = (x, z) => p.evaluate(([x, z]) => { const r = __li.repair.local(x, 0, z); return { tx: r[0], tz: r[2] }; }, [x, z]);
/* 1 broken */
await step(120);
if (only.includes(1)) { await view({ theta: 1.05, dist: 12.5, phi: .55, ...(await loc(1.0, .3)) }); await shot(1); }
/* 5 drifting: a rising tide, the camera low on the sea side over the shallows with the planks on the water */
if (only.includes(5)) {
  await p.evaluate(() => { __li.setTide(-.4); __li.repair.step(240); __li.setTide(.9); });
  await p.waitForTimeout(500); await step(120 * 9);
  const f = await p.evaluate(() => { const b = __li.repair.bodies().filter(b => b.sub > .3 && b.kind === 'plank'); const S = __li.repair.site(); b.sort((u, v) => { const lu = (u.p[0] - S.ox) * Math.cos(S.psi) - (u.p[2] - S.oz) * Math.sin(S.psi), lv = (v.p[0] - S.ox) * Math.cos(S.psi) - (v.p[2] - S.oz) * Math.sin(S.psi); return Math.abs(lu - 3) - Math.abs(lv - 3); }); return { n: b.length, tx: b[0].p[0], tz: b[0].p[2] }; });
  console.log('floating', f.n);
  await view({ theta: 1.1, dist: 9.5, phi: .5, tx: f.tx, tz: f.tz }, 2500); await shot(5);
}
/* 2 mid-drag: a plank lifted off the sand, carried toward the glowing gap */
if (only.includes(2) || only.includes(3) || only.includes(4) || only.includes(6)) {
  await p.evaluate(() => { __li.setTide(0); }); await step(240);
  await view({ theta: .65, dist: 6.8, phi: .72, ...(await loc(.35, .1)) }, 2000);
  const s0 = await p.evaluate(() => ({ b: __li.repair.bodies(), s: __li.repair.sockets() }));
  const cand = s0.b.filter(b => b.kind === 'plank' && b.state === 'dyn');
  const sc = await p.evaluate(ids => ids.map(id => __li.repair.screen(id)), cand.map(b => b.id)); let pick = null, best = 1e9;
  const tg = await p.evaluate(() => __li.repair.screenSock('deck3'));
  cand.forEach((b, i) => { const q = sc[i]; if (q[0] > 90 && q[0] < 1110 && q[1] > 140 && q[1] < 720) { const d = Math.hypot(q[0] - tg[0], q[1] - tg[1]); if (d > 160 && d < best) { best = d; pick = b; } } });
  if (!pick) pick = cand[0];
  const a = await p.evaluate(id => __li.repair.screen(id), pick.id), t = [tg[0] + 38, tg[1] - 26];
  await p.mouse.move(a[0], a[1]); await p.mouse.down();
  for (let i = 1; i <= 4; i++) await p.mouse.move(a[0] + (t[0] - a[0]) * i / 4, a[1] + (t[1] - a[1]) * i / 4);
  await step(200); await p.waitForTimeout(700);
  console.log('hold', JSON.stringify(await p.evaluate(() => ({ hold: __li.repair.hold(), near: __li.repair.near() }))), 'pick', pick.id, 'from', a.map(Math.round), 'to', t.map(Math.round));
  if (only.includes(2)) await shot(2);
  await p.mouse.move(tg[0], tg[1]); await step(200); await p.mouse.up(); await step(120);
  /* 3 partly repaired: the mouse fitted the first, the rest are placed */
  await p.evaluate(() => { const S = __li.repair.sockets(); let n = 0; for (const s of S) { if (s.kind !== 'plank' || s.filled || n >= 3) continue; const o = __li.repair.bodies().find(b => b.kind === 'plank' && b.state === 'dyn' && !b.lost); if (!o) break; __li.repair.place(o.id, s.id); n++; } __li.repair.step(120); });
  await view({ theta: 1.05, dist: 12.5, phi: .55, ...(await loc(1.0, .3)) }, 2200);
  if (only.includes(3)) await shot(3);
  /* 4 fully repaired: everything, the boat, the settler at the end */
  await p.evaluate(() => { __li.repair.fitAll(); __li.repair.step(120); __li.repair.walk(); });
  for (let i = 0; i < 120; i++) { await p.waitForTimeout(300); if ((await p.evaluate(() => __li.repair.walkState())) !== 'walking') break; }
  await view({ theta: 2.5, dist: 12.5, phi: .45, ...(await loc(2.4, -.9)) }, 2500);
  if (only.includes(4)) await shot(4);
  /* 6 a surge, then the camera on the landward side to see the gaps and the planks that floated off */
  if (only.includes(6)) {
    await p.evaluate(() => __li.repair.surge());
    for (let i = 0; i < 10; i++) await step(120); await step(60);
    await view({ theta: -.3, dist: 11, phi: .45, ...(await loc(.8, .3)) }, 2500); await shot(6);
  }
}
console.log('errors', errs.length, errs.slice(0, 3));
await browser.close();
if (arg('tiles') === '1') process.exit(0);
const CAPJ = JSON.stringify(CAPS.map((c, i) => (i === 3 || i === 6) && COUNT[i] ? c + ': ' + COUNT[i].fitted + ' of ' + COUNT[i].total : c));
const py = `
import sys, os, glob, shutil
from PIL import Image, ImageDraw, ImageFont
tile_dir, out_dir = sys.argv[1], sys.argv[2]
caps = ${CAPJ}
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
