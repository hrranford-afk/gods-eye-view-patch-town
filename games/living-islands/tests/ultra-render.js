/* Pictures for ULTRA_TIER.md. Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/ultra-render.js [only=1,2,3] [tiles=1] [w=2400] [h=1350]
   Three scenes, each drawn twice at 2400 x 1350 with the same view and the same frozen clocks: Quality High (&q=high) and Quality Ultra (&q=ultra&ssaa=2&dyn=0&msaa=8, forced to the full 2x because software GL would
   otherwise keep a built-in chip's small scale). The page is served over http from a small node server so that the hero models (boats, kit pieces, the repair jetty) load; over file:// ultra keeps the live level.
   Scenes: 1 camp day one (kit pieces, robot yard), 2 the dinghy close (boat kit hero), 3 the repair jetty (hero frame). Software GL: every frame of the ultra page takes a long time, so the script waits for the
   hero models and then for a few frames. Writes TILE_DIR (default /tmp/ultra-tiles), shots/ultra-compare.png (labelled, 2 columns x 3 rows, high left and ultra right, with a 3x crop inset in each picture),
   shots/ultra-crops.png and shots/ultra-1.png, shots/ultra-2.png (full 2400 x 1350 ultra frames). The crop boxes are in CROPS below ([x, y, w, h] in picture pixels): one over an edge, one over a shadow. */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const only = (arg('only') || '1,2,3').split(',').map(Number);
const W = +(arg('w') || 2400), H = +(arg('h') || 1350);
const TILE_DIR = process.env.TILE_DIR || '/tmp/ultra-tiles'; fs.mkdirSync(TILE_DIR, { recursive: true });
const CAPS = ['', 'Camp day one: kit pieces and the robot yard', 'The dinghy close: boat kit', 'The repair jetty'];
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(res => server.listen(0, '127.0.0.1', res)); const PORT = server.address().port;
const { browser, ctx } = await launch();
const ULTRA = '&q=ultra&ssaa=2&dyn=0&msaa=8&maxpx=33177600&bloom=0.10';
const SC = {
  1: { base: '?ui=0&seed=1122&start=camp&campwarm=0&clock=1&cfreeze=1&seat=3', wait: p => p.waitForFunction(() => __li.campstart && __li.campstart.rt() && __li.campstart.rt().ready(), null, { timeout: 900000 }), ultraWait: p => p.waitForFunction(() => { const h = __li.campstart.rt().heroStat(); return h.loaded >= 1 && __li.campstart.rt().kit().some(k => k.lod === 'hero'); }, null, { timeout: 900000 }),
    view: async p => { const Y = await p.evaluate(() => { const y = __li.campstart.rt().yard(); return { x: y.x, z: y.z, yaw: y.yaw }; }); const c = await p.evaluate(() => __li.camp());
      const ks = await p.evaluate(() => __li.campstart.rt().kit().map(k => ({ kind: k.kind, x: k.cx, z: k.cz, yaw: k.yaw }))); const a = ks.find(k => k.kind === 'lean_to') || ks[0];
      await p.evaluate(v => { __li.setView(v); }, { tx: (a.x * 2 + Y.x) / 3, tz: (a.z * 2 + Y.z) / 3, ty: .8, dist: 34, phi: .5, theta: (a.yaw || 1.4) + .55, fov: 30 }); } },
  2: { base: '?ui=0&seed=1122&boatkit=1&clock=1&cfreeze=1&seat=3', wait: p => p.waitForFunction(() => __li.boatkit && __li.boatkit.ready(), null, { timeout: 900000 }), ultraWait: p => p.waitForFunction(() => __li.boatkit.boats().some(b => b.lod === 'hero'), null, { timeout: 900000 }),
    view: async p => { await p.evaluate(() => { __li.holdClock(true); __li.clockT(20); __li.clock.setSky(121, 16.5, 4); __li.clock.setSpeed(0); const b = __li.boatkit.pos(3); __li.setView({ tx: b.x, tz: b.z, ty: .3, fov: 30, dist: 8.5, phi: .38, theta: 1.1 }); }); } },
  3: { base: '?ui=0&seed=1122&repair=1&boatkit=1', wait: async p => { await p.waitForFunction(() => __li.repair && __li.repair.ready() && __li.boatkit && __li.boatkit.ready(), null, { timeout: 900000 }); }, ultraWait: p => p.waitForFunction(() => __li.ultra.state().repairHero, null, { timeout: 900000 }),
    view: async p => { await p.evaluate(() => { __li.repair.step(120); const S = __li.repair.dbg().site, r = __li.repair.local(1.0, 0, .3); __li.repair.view({ theta: S.psi + 1.05, dist: 12.5, phi: .55, tx: r[0], tz: r[2] }); }); } }
};
const CROPS = { 1: [[900, 500, 200, 130], [1300, 700, 200, 130]], 2: [[1000, 450, 200, 130], [1250, 800, 200, 130]], 3: [[1000, 500, 200, 130], [1300, 750, 200, 130]] };
fs.writeFileSync(path.join(TILE_DIR, 'crops.json'), JSON.stringify(CROPS));
async function shootOne(i, tier) {
  const s = SC[i], p = await ctx.newPage(); await p.setViewportSize({ width: W, height: H }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|GPU stall|ReadPixels/.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://127.0.0.1:${PORT}/islands_look.html${s.base}${tier === 'ultra' ? ULTRA : '&q=high'}`);
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 1, null, { timeout: 900000 });
  await s.wait(p);
  if (tier === 'ultra') { await s.view(p); await s.ultraWait(p); } else { await s.view(p); await p.waitForTimeout(2000); }
  await s.view(p); await p.evaluate(() => __li.holdClock && __li.holdClock(true));
  const f0 = await p.evaluate(() => window.__liFrames); await p.waitForFunction(f => window.__liFrames > f + 3, f0, { timeout: 900000 });
  const out = path.join(TILE_DIR, `s${i}-${tier}.png`); await p.screenshot({ path: out, timeout: 900000 });
  const info = await p.evaluate(() => ({ tris: __li.stats().tris, u: __li.ultra.state() }));
  console.log('wrote', out, 'errors', errs.length, errs.slice(0, 2).join(' | '), JSON.stringify({ tris: info.tris, renderTris: info.u.renderTris, calls: info.u.calls, scale: info.u.scaleReal, msaa: info.u.msaaGot, shadow: info.u.shadow, shadowType: info.u.shadowType, big: info.u.big, boat: info.u.boatLods, camp: info.u.campLods.filter(x => x === 'hero').length + ' hero kit pieces', repairHero: info.u.repairHero }));
  await p.close(); return info;
}
const INFO = {};
for (const i of only) { INFO[i] = { high: await shootOne(i, 'high'), ultra: await shootOne(i, 'ultra') }; }
fs.writeFileSync(path.join(TILE_DIR, 'info.json'), JSON.stringify(INFO));
await browser.close(); server.close();
if (arg('tiles') === '1') process.exit(0);
const py = `
import sys, os, json
from PIL import Image, ImageDraw, ImageFont
tile_dir, out_dir = sys.argv[1], sys.argv[2]
crops = json.load(open(os.path.join(tile_dir, 'crops.json')))
caps = ${JSON.stringify(CAPS)}
info = json.load(open(os.path.join(tile_dir, 'info.json')))
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26); small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
except Exception: font = small = ImageFont.load_default()
CW, CH = 1200, 675
rows = [i for i in (1, 2, 3) if os.path.exists(os.path.join(tile_dir, 's%d-ultra.png' % i))]
sheet = Image.new('RGB', (CW * 2, CH * len(rows)), (20, 20, 24))
cropsheet = Image.new('RGB', (1560, 400 * len(rows) * 1), (20, 20, 24))
def label(d, x, y, txt, f):
    w = d.textlength(txt, font=f); d.rectangle([x, y, x + w + 20, y + 38], fill=(0, 0, 0, 170)); d.text((x + 10, y + 4), txt, fill=(255, 255, 255, 255), font=f)
for r, i in enumerate(rows):
    for c, tier in enumerate(('high', 'ultra')):
        im = Image.open(os.path.join(tile_dir, 's%d-%s.png' % (i, tier))).convert('RGB'); full = im.copy()
        sm = im.resize((CW, CH), Image.LANCZOS); d = ImageDraw.Draw(sm, 'RGBA')
        k = CW / full.width
        for n, (x, y, w, h) in enumerate(crops[str(i)]):
            d.rectangle([x * k, y * k, (x + w) * k, (y + h) * k], outline=(255, 220, 80, 255), width=2)
            ins = full.crop((x, y, x + w, y + h)).resize((w * 2, h * 2), Image.NEAREST)
            sm.paste(ins, (CW - (n + 1) * (w * 2 + 8) - 4, CH - h * 2 - 4)); d.rectangle([CW - (n + 1) * (w * 2 + 8) - 4, CH - h * 2 - 4, CW - n * (w * 2 + 8) - 12, CH - 4], outline=(255, 220, 80, 255), width=2)
        label(d, 8, 8, ('Quality: High' if tier == 'high' else 'Quality: Ultra') + '   ' + caps[i], font)
        sheet.paste(sm, (c * CW, r * CH))
    for n, (x, y, w, h) in enumerate(crops[str(i)]):
        for c, tier in enumerate(('high', 'ultra')):
            im = Image.open(os.path.join(tile_dir, 's%d-%s.png' % (i, tier))).convert('RGB')
            cr = im.crop((x, y, x + w, y + h)).resize((w * 3, h * 3), Image.NEAREST)
            cropsheet.paste(cr, (n * 800 + c * 0 + 0, 0)) if False else None
sheet.save(os.path.join(out_dir, 'ultra-compare.png'))
# the crops sheet: per scene, per crop: high | ultra at 3x (nearest)
cw, ch = 200 * 3, 130 * 3
cs = Image.new('RGB', (cw * 4 + 30, (ch + 8) * len(rows)), (20, 20, 24)); d2 = ImageDraw.Draw(cs, 'RGBA')
for r, i in enumerate(rows):
    for n, (x, y, w, h) in enumerate(crops[str(i)]):
        for c, tier in enumerate(('high', 'ultra')):
            im = Image.open(os.path.join(tile_dir, 's%d-%s.png' % (i, tier))).convert('RGB')
            cr = im.crop((x, y, x + w, y + h)).resize((cw, ch), Image.NEAREST); px = (n * 2 + c) * (cw + 10); cs.paste(cr, (px, r * (ch + 8)))
            label(d2, px + 4, r * (ch + 8) + 4, tier, small)
cs.save(os.path.join(out_dir, 'ultra-crops.png'))
import shutil
for n, i in enumerate([1, 3], 1):
    f = os.path.join(tile_dir, 's%d-ultra.png' % i)
    if os.path.exists(f): shutil.copy(f, os.path.join(out_dir, 'ultra-%d.png' % n))
print('sheet done')
`;
const r = spawnSync('python3', ['-c', py, TILE_DIR, path.join(ROOT, 'shots')], { encoding: 'utf8' });
console.log(r.stdout.trim(), r.stderr.trim());
