/* PIXEL CHECK (reusable render check, software GL, not a device).
   Why: the physical builder found every instanced piece drew BLACK until a colour-buffer bug was fixed, and no test noticed. This file renders key scenes headless and fails on
   - large black or near-black patches (the instanced heaps, stage pieces, floats, the dock, the robots),
   - a large cream parallelogram or any other big unexplained flat-colour shape,
   - an instanced mesh whose projected position is dark while the sky is bright (the "drew black" bug), by luminance statistics with tolerances.
   Pure-node PNG decode (no dependencies). The HUD is hidden before each shot so only the world is judged.
   Run: NODE_PATH=$(npm root -g) node tests/pixel-check.js [only=arrival,ferry,heaps,build,storm,boat] [w=1000]
   Also exported (checkPng, decodePng, blobs) so other page tests can call it on a screenshot buffer. */
import zlib from 'node:zlib';
import path from 'node:path';
import fs from 'node:fs';
import { launch, ROOT } from './shoot.js';

/* ---- PNG decode: 8-bit, non interlaced, colour type 2 or 6 ---- */
export function decodePng(buf) {
  let p = 8, W = 0, H = 0, ct = 6, idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8); if (type === 'IHDR') { W = buf.readUInt32BE(p + 8); H = buf.readUInt32BE(p + 12); ct = buf[p + 17]; } else if (type === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len)); p += 12 + len; }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), out = Buffer.alloc(W * H * 4), stride = W * bpp; let prev = Buffer.alloc(stride), pos = 0;
  for (let y = 0; y < H; y++) {
    const f = raw[pos++], line = Buffer.from(raw.subarray(pos, pos + stride)); pos += stride;
    for (let i = 0; i < stride; i++) { const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); } line[i] = v & 255; }
    for (let x = 0; x < W; x++) { out[(y * W + x) * 4] = line[x * bpp]; out[(y * W + x) * 4 + 1] = line[x * bpp + 1]; out[(y * W + x) * 4 + 2] = line[x * bpp + 2]; out[(y * W + x) * 4 + 3] = bpp === 4 ? line[x * bpp + 3] : 255; }
    prev = line;
  }
  return { W, H, data: out };
}
const lum = (d, i) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;

/* a grid of cells, each with mean colour, luminance and spread; connected blobs of cells that satisfy a test */
export function cells(img, cw) {
  const gx = Math.floor(img.W / cw), gy = Math.floor(img.H / cw), out = new Array(gx * gy);
  for (let cy = 0; cy < gy; cy++) for (let cx = 0; cx < gx; cx++) {
    let r = 0, g = 0, b = 0, l = 0, l2 = 0, n = 0;
    for (let y = cy * cw; y < cy * cw + cw; y++) for (let x = cx * cw; x < cx * cw + cw; x++) { const i = (y * img.W + x) * 4, L = lum(img.data, i); r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; l += L; l2 += L * L; n++; }
    l /= n; out[cy * gx + cx] = { r: r / n, g: g / n, b: b / n, l, sd: Math.sqrt(Math.max(0, l2 / n - l * l)) };
  }
  return { gx, gy, c: out, cw };
}
export function blobs(grid, test) {
  const { gx, gy, c } = grid, seen = new Uint8Array(gx * gy), res = [];
  for (let s = 0; s < gx * gy; s++) { if (seen[s] || !test(c[s])) continue; const q = [s], cellsIn = []; seen[s] = 1;
    while (q.length) { const k = q.pop(); cellsIn.push(k); const x = k % gx, y = (k / gx) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= gx || ny >= gy) continue; const j = ny * gx + nx; if (!seen[j] && test(c[j])) { seen[j] = 1; q.push(j); } } }
    const xs = cellsIn.map(k => k % gx), ys = cellsIn.map(k => (k / gx) | 0); res.push({ n: cellsIn.length, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }); }
  return res.sort((a, b) => b.n - a.n);
}
/* crisp black blobs with a bright rim (a metal piece drawing black: the two black ovals of the arrival picture). Pixel level: connected pixels with every channel under 40 (of 255),
   at least minPx pixels at a 1000 px wide picture (scaled for other sizes), and at least an eighth of the ring of pixels just outside them brighter than 0.45 (the thin white outline). Dark pine shadows have no bright rim. */
export function blackOvals(img, o = {}) {
  const sc = (img.W / 1000) ** 2, minPx = Math.max(8, Math.round((o.minPx || 18) * sc)), W = img.W, H = img.H, d = img.data, seen = new Uint8Array(W * H), res = [];
  const dark = i => d[i * 4] < 40 && d[i * 4 + 1] < 40 && d[i * 4 + 2] < 40;
  for (let s0 = 0; s0 < W * H; s0++) {
    if (seen[s0] || !dark(s0)) continue; const q = [s0], px = []; seen[s0] = 1;
    while (q.length && px.length < 4000) { const k = q.pop(); px.push(k); const x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!seen[j] && dark(j)) { seen[j] = 1; q.push(j); } } }
    if (px.length < minPx || px.length >= 4000) continue;
    const inS = new Set(px); let ring = 0, bright = 0;
    for (const k of px) { const x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (inS.has(j)) continue; ring++; if (lum(d, j * 4) > .45) bright++; } }
    const xs0 = px.map(k => k % W), ys0 = px.map(k => (k / W) | 0), bw = Math.max(...xs0) - Math.min(...xs0) + 1, bh = Math.max(...ys0) - Math.min(...ys0) + 1, round = bw / bh > .5 && bw / bh < 2 && px.length / (bw * bh) > .6 && px.length < 900 * sc;   /* round and small: an open top, not a shadowed hull */
    if (round && ring && bright / ring > .12) { const xs = px.map(k => k % W), ys = px.map(k => (k / W) | 0); res.push({ n: px.length, x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2), y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2) }); }
  }
  return res;
}
/* the verdict on one picture. Returns { pass, why[], stats }. Tolerances are fractions of the picture area. */
export function checkPng(buf, o = {}) {
  const img = decodePng(buf), cw = o.cell || Math.max(6, Math.round(img.W / 100)), g = cells(img, cw), total = g.gx * g.gy, why = [], area = n => n / total;
  /* near-black cells: luminance under 0.045 (the dark sea of a night picture is bluer and brighter than this; shadows are soft) */
  const dark = blobs(g, c => c.l < .045 && c.sd < .03), maxDark = o.maxDark === undefined ? .006 : o.maxDark;
  if (dark.length && area(dark[0].n) > maxDark) why.push('black patch: ' + dark[0].n + ' cells (' + (area(dark[0].n) * 100).toFixed(2) + '% of the picture) at cells x ' + dark[0].x0 + '-' + dark[0].x1 + ', y ' + dark[0].y0 + '-' + dark[0].y1);
  /* cream: warm, bright, nearly flat, and not sand-textured: a flat cream blob */
  const cream = blobs(g, c => c.l > .62 && c.r > c.b * 1.12 && c.r - c.b < 90 && c.sd < .018), maxCream = o.maxCream === undefined ? .004 : o.maxCream;
  if (cream.length && area(cream[0].n) > maxCream) why.push('flat cream shape: ' + cream[0].n + ' cells (' + (area(cream[0].n) * 100).toFixed(2) + '%) at cells x ' + cream[0].x0 + '-' + cream[0].x1 + ', y ' + cream[0].y0 + '-' + cream[0].y1);
  /* any other big perfectly flat patch that is not water or sky (blue dominant): unexplained flat colour */
  const flat = blobs(g, c => c.sd < .006 && !(c.b > c.r * 1.05) && c.l > .14), maxFlat = o.maxFlat === undefined ? .02 : o.maxFlat;
  if (flat.length && area(flat[0].n) > maxFlat) why.push('flat colour patch: ' + flat[0].n + ' cells (' + (area(flat[0].n) * 100).toFixed(2) + '%)');
  const ov = blackOvals(img, o); if (ov.length) why.push(ov.length + ' black blob(s) with a bright rim (a piece drawing black) at ' + ov.slice(0, 3).map(v => v.x + ',' + v.y).join(' and '));
  const mean = g.c.reduce((a, c) => a + c.l, 0) / total;
  if (o.minMean !== undefined && mean < o.minMean) why.push('the whole picture is too dark (mean luminance ' + mean.toFixed(3) + ')');
  return { pass: !why.length, why, stats: { ovals: ov.length, W: img.W, H: img.H, mean: +mean.toFixed(3), darkCells: dark[0] ? dark[0].n : 0, creamCells: cream[0] ? cream[0].n : 0, flatCells: flat[0] ? flat[0].n : 0, total } };
}
/* the mean luminance of a screen box (pixels) in a picture: the "instanced mesh drew black" test looks at the box around each projected heap */
export function boxLum(buf, x, y, w, h) {
  const img = decodePng(buf); let s = 0, n = 0, mx = 0;
  for (let j = Math.max(0, y | 0); j < Math.min(img.H, (y + h) | 0); j++) for (let i = Math.max(0, x | 0); i < Math.min(img.W, (x + w) | 0); i++) { const L = lum(img.data, (j * img.W + i) * 4); s += L; n++; if (L > mx) mx = L; }
  return { mean: n ? s / n : 0, max: mx, n };
}

/* ---- page driving (only when run directly) ---- */
export const HIDE_HUD = 'body > *:not(canvas):not(script){visibility:hidden !important} #gd,#gd *{visibility:hidden !important}';
export async function worldShot(p, name) {
  const h = await p.addStyleTag({ content: HIDE_HUD }); await p.waitForTimeout(2500);
  const buf = await p.screenshot(); await p.evaluate(() => 1); await h.evaluate(e => e.remove()); if (name) { try { fs.mkdirSync(path.join(ROOT, 'shots', '_pixel'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'shots', '_pixel', name + '.png'), buf); } catch (e) { /* the picture is a courtesy */ } } return buf;
}
const isMain = process.argv[1] && process.argv[1].endsWith('pixel-check.js');
if (isMain) {
  const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1], only = (arg('only') || 'arrival,ferry,heaps,build,storm,boat').split(','), W = +(arg('w') || 1000), H = Math.round(W * .625);
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const { browser, ctx } = await launch(); const NOISE = /GL Driver|GPU stall|ReadPixels/;
  async function open(qs, w, h) {
    const p = await ctx.newPage(); p.setDefaultTimeout(300000); await p.setViewportSize({ width: w || W, height: h || H }); const errs = [];
    p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
    await p.goto('file://' + ROOT + '/islands_look.html' + qs + '&glide=0'); await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
    await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { }); await p.waitForTimeout(3000); return { p, errs };
  }
  const view = (p, x, z, dist, phi, theta) => p.evaluate(v => __li.setView(v), { tx: x, tz: z, dist, phi, theta });
  const adv = (p, s) => p.evaluate(s => __gift.phys().advance(s), s);
  /* project the world position of every instanced heap piece to the screen, and read the luminance of the box round it: a heap must not be near-black */
  const heapBoxes = p => p.evaluate(() => { const P = __gift.phys(), L = P.layout(), out = []; const cam = window.__cam; if (!cam) return out; const T = THREE; L.stores.forEach(s => { const v = new T.Vector3(s.x, __gift.phys().state ? 0 : 0, s.z); const gy = __li.hAt ? 0 : 0; v.y = (__li.hAt ? __li.hAt(s.x, s.z) : 0) + .3; v.project(cam); out.push({ x: (v.x * .5 + .5) * innerWidth, y: (1 - (v.y * .5 + .5)) * innerHeight, z: v.z }); }); return out; });
  const hook = p => p.evaluate(() => { const sc = __li.boatkit && __li.boatkit.dbg && __li.boatkit.dbg().scene; if (sc) sc.onBeforeRender = (r, s, c) => { window.__cam = c; }; return !!sc; });
  const judge = (name, buf, o) => { const r = checkPng(buf, o); ok(r.pass, name + ': no black patch, no flat cream shape, no big flat colour (' + JSON.stringify(r.stats) + ')' + (r.why.length ? ' -> ' + r.why.join('; ') : '')); return r; };
  const heapCheck = async (name, p, buf) => { const bs = await heapBoxes(p); const lits = bs.filter(b => b.z < 1 && b.x > 40 && b.x < p.viewportSize().width - 40 && b.y > 40 && b.y < p.viewportSize().height - 40).map(b => boxLum(buf, b.x - 18, b.y - 30, 36, 36)); ok(lits.length > 0 && lits.every(l => l.max > .12), name + ': every heap on screen is lit (max luminance per heap ' + lits.map(l => l.max.toFixed(2)).join(', ') + ')'); };
  if (only.includes('arrival') || only.includes('ferry')) {
    const { p, errs } = await open('?game=gift&q=high&device=desktop&dev=0'); await hook(p);
    const L = await p.evaluate(() => __gift.phys().layout()), l = await p.evaluate(() => __boat.landings().find(l => l.id === 'beach')); await adv(p, 2);
    if (only.includes('arrival')) { await view(p, (L.dock.tip.x + l.berth.x) / 2, (L.dock.tip.z + l.berth.z) / 2, 46, .75, .7); judge('arrival', await worldShot(p, 'arrival')); }
    if (only.includes('ferry')) { const f = await p.evaluate(() => __gift.phys().floats().filter(f => !f.gone)[0]); await p.evaluate(([x, z]) => { __boat.teleport(x - 3, z, 0, 'drive'); __gift.phys().advance(.3); __boat.teleport(x, z, .3, 'drive'); __gift.phys().advance(.6); }, [f.x, f.z]); await view(p, f.x, f.z, 22, .8, .5); judge('ferrying', await worldShot(p, 'ferry')); }
    ok(errs.length === 0, 'no console errors'); await p.close();
  }
  if (only.includes('heaps') || only.includes('build')) {
    const { p, errs } = await open('?game=gift&q=high&device=desktop&stage=evening'); await hook(p);
    for (const [k, n] of [['planks', 14], ['metal', 8], ['rope', 6], ['glass', 6]]) await p.evaluate(([k, n]) => __gift.addStock(k, n), [k, n]); await adv(p, 8);
    const L = await p.evaluate(() => __gift.phys().layout()), c = L.stores.reduce((a, s) => ({ x: a.x + s.x / 4, z: a.z + s.z / 4 }), { x: 0, z: 0 });
    if (only.includes('heaps')) { await view(p, c.x, c.z, 15, .8, .4); const buf = await worldShot(p, 'heaps'); judge('heaps', buf, { maxDark: .02 }); await heapCheck('heaps', p, buf); }
    if (only.includes('build')) {
      await p.evaluate(() => { __gift.doBuild('cottage'); }); await p.locator('#gd button', { hasText: 'Build it' }).first().click({ force: true }); await p.evaluate(() => __gift.closeCard()); await adv(p, 3);
      const sp = await p.evaluate(() => __gift.spots().build.cottage);
      for (let i = 0; i < 60; i++) { const st = await p.evaluate(() => __gift.phys().state()); if (st.beam) break; const need = await p.evaluate(() => { const P = __gift.phys(), x = P.state(), b = x.ph.b; if (!b) return null; const pl = P.planFor(b.id), a = b.stage - 1; return b.stage === 0 ? 'stake' : (a >= 0 && a < 4 && b.placed[a] >= pl.need[a] && b.hand.length === 0 && a !== 1) ? 'hold' : null; }); if (need) { await p.evaluate(() => { __gift.phys().startAct('site', true); __gift.phys().advance(3); }); continue; } await adv(p, 10); }
      await view(p, sp.x, sp.z, 24, .8, .6); judge('build stage (frame)', await worldShot(p, 'build'), { maxDark: .08 });
    }
    ok(errs.length === 0, 'no console errors'); await p.close();
  }
  if (only.includes('storm')) {
    const { p, errs } = await open('?game=gift&q=high&device=desktop&stage=evening'); await hook(p);
    await p.waitForFunction(() => window.__storm, null, { timeout: 300000 }); await p.evaluate(() => { __gift.closeCard(); __storm.start({ build: 8 }); __storm.setTs(8 + 30 + 20); __storm.finish(); }); await p.waitForFunction(() => __storm.state().phase === 'haul', null, { timeout: 200000 }); await p.evaluate(() => __li.setTide(-.2)); await p.waitForTimeout(1500);
    await adv(p, 6); const L = await p.evaluate(() => __gift.phys().layout()); await view(p, L.post.x, L.post.z, 24, .8, .4); judge('storm haul', await worldShot(p, 'storm')); ok(errs.length === 0, 'no console errors'); await p.close();
  }
  if (only.includes('boat')) {
    const { p, errs } = await open('?game=gift&q=high&device=desktop&dev=0'); await hook(p); await adv(p, 2);
    const l = await p.evaluate(() => __boat.landings().find(l => l.id === 'beach')); await p.evaluate(l => { __boat.teleport(l.berth.x, l.berth.z, l.berth.yaw, 'drive'); __gift.phys().advance(.5); }, l); await view(p, l.berth.x, l.berth.z, 14, .8, .5); judge('boat', await worldShot(p, 'boat')); ok(errs.length === 0, 'no console errors'); await p.close();
  }
  await browser.close(); console.log(fails ? 'pixel-check: ' + fails + ' FAILED' : 'pixel-check: all passed'); process.exit(fails ? 1 : 0);
}
