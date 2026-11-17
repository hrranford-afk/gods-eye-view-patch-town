/* Base Camp (17 Nov, build 30): the title poster (title-poster.html) hides the room's sticker in the art. Does the game still find it?
   For each of the three designs: the poster at 1280 x 800 in Chromium (sized as on a TV, and as on a desk monitor), a screenshot, then a pretend iPad camera
   picture of that screen (640 x 480, the TV's real size from the bank-card sizing, seen from a distance with a turn and a tilt, the screen's contrast as a camera
   sees it, a little blur, JPEG), and the game's own detector on it: stkDetect (js-aruco2 in the hidden iframe, the game's BC_STICKERS dictionary), stkRefine and
   stkPose with the game's limits (side at least 16 px, reprojection at most 1.5 px). Every picture must give the right sticker and no other.
   Margins: how far away, how blurred and how far to the side the sticker is still found (the same sweep for every design).
   Shots 150 to 160. Run (about 3 minutes):  NODE_PATH=$(npm root -g) node tests/poster-test.js */
const fs = require('fs'), path = require('path');
const { serve, launch, ROOT } = require('./lib.js'); const OUT = path.join(ROOT, 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const NAMES = { 1: 'Camp at dusk', 2: 'Toy-room wall', 3: 'Scout badge' };
/* TV: 1280 CSS px over 853 mm (a 40 inch TV), 1.5 px a mm, the black square 120 px. Monitor: 3 px a mm (a 17 inch screen at 1280 px), the black square 240 px. Six ids over the six runs. */
const RUNS = [{ name: 'TV', k: 1.5, ids: { 1: 2, 2: 4, 3: 6 } }, { name: 'monitor', k: 3.0, ids: { 1: 5, 2: 1, 3: 3 } }];
const BASE = [{ n: 'near, a little to the side', D: 1.2, yaw: 15, pitch: 5, roll: 2, blur: 0.6 }, { n: 'turned 35 degrees, tilted', D: 1.6, yaw: -35, pitch: 10, roll: -3, blur: 1.0 }, { n: 'across the room', D: 1.8, yaw: 20, pitch: -6, roll: 1, blur: 0.8 }];

(async () => {
  const { srv, url } = await serve(); const { b, ctx, p, errs } = await launch();
  await p.goto(url); await sleep(2500); await p.evaluate(() => { localStorage.setItem('bc-wxchoice', 'no'); });
  const libOK = await p.evaluate(async () => { if (__g.STK.state !== 'ready') { __g.STK.state = 'off'; __g.stkLoad(); await new Promise((r) => { const t = setInterval(() => { if (__g.STK.state !== 'loading') { clearInterval(t); r(); } }, 100); }); } return __g.STK.state; });
  ok('the game\'s sticker finder loads (js-aruco2, BC_STICKERS)', libOK === 'ready', libOK);
  ok('BUILD is still build 30', await p.evaluate(() => __g.BUILD === 'build 30'));
  const link = await p.evaluate(() => { __g.menuUi(); const a = document.getElementById('mPoster'), s = document.getElementById('mStick'); const r = a ? { href: a.getAttribute('href'), txt: a.innerText, target: a.target, afterStickers: !!s && s.nextElementSibling === a } : null; document.getElementById('modal').hidden = true; return r; });
  ok('the Menu has "Show the title poster on a TV" next to "Print room stickers"', link && link.href === 'title-poster.html' && /Show the title poster on a TV/.test(link.txt) && link.target === '_blank' && link.afterStickers, JSON.stringify(link));

  /* the pretend camera, in the game's page: the screenshot is the TV's picture, k px a mm gives its real size */
  await p.evaluate(() => {
    window.__cam = async function (key, o) {
      const P = window.__posters[key], SW = P.w, SH = P.h, src = P.d, Wm = SW / P.k / 1000, Hm = SH / P.k / 1000, W = 640, H = 480, fx = 520, fy = fx, cx = W / 2, cy = H / 2;
      const rad = Math.PI / 180, cyw = Math.cos(o.yaw * rad), syw = Math.sin(o.yaw * rad), cp = Math.cos(o.pitch * rad), sp = Math.sin(o.pitch * rad), cr = Math.cos((o.roll || 0) * rad), sr = Math.sin((o.roll || 0) * rad);
      const rot = (v) => { let x = v[0] * cr - v[1] * sr, y = v[0] * sr + v[1] * cr, z = v[2]; let y2 = y * cp - z * sp, z2 = y * sp + z * cp; return [x * cyw + z2 * syw, y2, -x * syw + z2 * cyw]; };
      const ax = rot([1, 0, 0]), ay = rot([0, 1, 0]), n = rot([0, 0, 1]);
      const ml = [(P.mx / SW - 0.5) * Wm, (0.5 - P.my / SH) * Hm], aim = [o.ox || 0.04, o.oy || -0.03, -o.D];
      const C = [aim[0] - ax[0] * ml[0] - ay[0] * ml[1], aim[1] - ax[1] * ml[0] - ay[1] * ml[1], aim[2] - ax[2] * ml[0] - ay[2] * ml[1]], cn = C[0] * n[0] + C[1] * n[1] + C[2] * n[2];
      let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const out = new ImageData(W, H), d = out.data, ss = 2;
      for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
        let r = 0, g = 0, bb = 0;
        for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
          const dx = (u + (sx + 0.5) / ss - cx) / fx, dy = -(v + (sy + 0.5) / ss - cy) / fy, dn = dx * n[0] + dy * n[1] - n[2], t = cn / dn;
          const q = [dx * t - C[0], dy * t - C[1], -t - C[2]], a = q[0] * ax[0] + q[1] * ax[1] + q[2] * ax[2], b2 = q[0] * ay[0] + q[1] * ay[1] + q[2] * ay[2];
          const X = (a / Wm + 0.5) * SW, Y = (0.5 - b2 / Hm) * SH;
          if (t > 0 && X >= 0 && Y >= 0 && X < SW - 1 && Y < SH - 1) { /* the screen: bilinear, then the camera's contrast (a lit screen's white is not 255, its black is not 0) */
            const x0 = Math.floor(X), y0 = Math.floor(Y), fx0 = X - x0, fy0 = Y - y0, i00 = (y0 * SW + x0) * 4, i10 = i00 + 4, i01 = i00 + SW * 4, i11 = i01 + 4;
            const s = (c) => (src[i00 + c] * (1 - fx0) + src[i10 + c] * fx0) * (1 - fy0) + (src[i01 + c] * (1 - fx0) + src[i11 + c] * fx0) * fy0;
            r += 28 + s(0) * 0.8; g += 28 + s(1) * 0.8; bb += 30 + s(2) * 0.78;
          } else if (t > 0 && Math.abs(a) < Wm / 2 + 0.02 && Math.abs(b2) < Hm / 2 + 0.02) { r += 22; g += 22; bb += 24; } /* the bezel */
          else { const w = 120 + 30 * (u / W) - 20 * (v / H); r += w; g += w * 0.95; bb += w * 0.86; } /* the wall */
        }
        const i = (v * W + u) * 4, nz = (rnd() - 0.5) * 8; d[i] = r / 4 + nz; d[i + 1] = g / 4 + nz; d[i + 2] = bb / 4 + nz; d[i + 3] = 255;
      }
      const c1 = document.createElement('canvas'); c1.width = W; c1.height = H; c1.getContext('2d').putImageData(out, 0, 0);
      const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; const g2 = c2.getContext('2d', { willReadFrequently: true }); g2.fillStyle = '#888'; g2.fillRect(0, 0, W, H); g2.filter = 'blur(' + (o.blur || 0) + 'px)'; g2.drawImage(c1, 0, 0); g2.filter = 'none';
      const jpg = c2.toDataURL('image/jpeg', 0.8), im = new Image(); await new Promise((r) => { im.onload = r; im.src = jpg; }); g2.drawImage(im, 0, 0); const pic = g2.getImageData(0, 0, W, H);
      const found = __g.stkDetect(__g.STK.lib, __g.STK.det, { width: W, height: H, data: pic.data });
      const gray = new Uint8Array(W * H); for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = (pic.data[j] * 77 + pic.data[j + 1] * 150 + pic.data[j + 2] * 29) >> 8;
      const K = { fx, fy: fx, cx: cx - 0.5, cy: cy - 0.5 }, truthD = Math.hypot(aim[0], aim[1], aim[2]);
      const marks = found.map((m) => { const cs0 = m.corners.map((c) => [c.x, c.y]), cs = __g.stkRefine(gray, W, H, cs0) || cs0, side = Math.min(...cs.map((c, i) => Math.hypot(c[0] - cs[(i + 1) % 4][0], c[1] - cs[(i + 1) % 4][1]))), q = __g.stkPose(__g.STK.lib, cs, K, __g.STK_SIZE);
        return { id: m.id, ham: m.hammingDistance, side: +side.toFixed(1), rms: q ? +q.rms.toFixed(2) : 99, dist: q ? +Math.hypot(q.t[0], q.t[1], q.t[2]).toFixed(3) : 0 }; });
      const want = marks.filter((m) => m.id === P.id), other = marks.filter((m) => m.id !== P.id), m = want[0];
      const used = !!m && m.side >= 16 && m.rms <= 1.5 && m.dist <= 4; /* the game's own limits in stkRun */
      return { ok: used && !other.length, found: !!m, used, other: other.map((x) => x.id), m, truthD: +truthD.toFixed(3), jpg: o.keep ? jpg : undefined };
    };
  });

  /* the margin sweeps: the last value at which the sticker is still found within the game's limits (stopping at the first miss), and any wrong sticker seen on the way */
  const sweep = async (key, vals, mk) => { let last = null; for (const v of vals) { const r = await p.evaluate(([key, o]) => window.__cam(key, o), [key, mk(v)]); if (r.other.length) return Object.assign({ falseId: r.other }, last); if (!r.ok) break; last = { v, side: r.m.side, rms: r.m.rms }; } return last; };
  const margin = async (key) => {
    const far = await sweep(key, [1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5], (D) => ({ D, yaw: 20, pitch: 5, roll: 1, blur: 0.8 }));
    const blur = await sweep(key, [1, 1.5, 2, 2.5, 3, 3.5, 4, 5], (bl) => ({ D: 1.5, yaw: 20, pitch: 5, roll: 1, blur: bl }));
    const side = await sweep(key, [30, 40, 50, 55, 60, 65, 70, 75, 80], (y) => ({ D: 1.2, yaw: y, pitch: 5, roll: 1, blur: 0.6 }));
    console.log('MARGIN ' + key + ': farthest ' + (far ? far.v + ' m (side ' + far.side + ' px)' : '-') + '; most blur at 1.5 m ' + (blur ? blur.v + ' px' : '-') + '; most turn at 1.2 m ' + (side ? side.v + ' deg (side ' + side.side + ' px)' : '-'));
    return { far, blur, side };
  };
  /* a grid of 80 views (1 to 2.2 m, turned up to 40 degrees each way, tilted up and down, two blurs): how many give the sticker within the game's limits */
  const GRID = []; for (const D of [1.0, 1.4, 1.8, 2.2]) for (const yaw of [-40, -20, 0, 20, 40]) for (const pitch of [-8, 6]) for (const blur of [0.6, 1.2]) GRID.push({ D, yaw, pitch, roll: yaw / 20, blur, ox: 0.03 * Math.sign(yaw), oy: -0.02 });
  const grid = async (key) => { let n = 0, wrong = 0; const miss = []; for (const o of GRID) { const r = await p.evaluate(([key, o]) => window.__cam(key, o), [key, o]); if (r.ok) n++; else miss.push(o.D + 'm/' + o.yaw + '/' + o.pitch + '/' + o.blur); if (r.other.length) wrong++; } console.log('GRID ' + key + ': ' + n + '/' + GRID.length + (wrong ? ' WRONG ' + wrong : '') + (miss.length ? '  missed ' + miss.join(' ') : '')); return { n, wrong, miss }; };
  const loadPic = (key, png, k, id, geo) => p.evaluate(async ([key, png, k, id, geo]) => { const im = new Image(); await new Promise((r) => { im.onload = r; im.src = 'data:image/png;base64,' + png; }); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const D = g.getImageData(0, 0, c.width, c.height);
    (window.__posters = window.__posters || {})[key] = { w: c.width, h: c.height, d: D.data, k, id, mx: geo.x + geo.w / 2, my: geo.y + geo.h / 2 }; }, [key, png, k, id, geo]);

  const pp = await ctx.newPage(); await pp.setViewportSize({ width: 1280, height: 800 }); const purl = url.replace('index.html', 'title-poster.html'); let shotN = 150; const shots = [], margins = [];
  const shot = async (pg, name, full) => { const f = (shotN++) + '-' + name + '.png'; await pg.screenshot({ path: OUT + f, fullPage: !!full }); shots.push(f); console.log('shot ' + f); };

  /* the picker */
  await pp.goto(purl); await pp.evaluate(() => localStorage.setItem('bc-screen-sticker', JSON.stringify({ id: 3, k: 1.5 }))); await pp.reload(); await sleep(400);
  const pk = await pp.evaluate(() => ({ thumbs: document.querySelectorAll('#designs button svg').length, show: document.getElementById('show').hidden, set: !document.getElementById('set').hidden, txt: document.body.innerText }));
  ok('no ?design: the setup page with the three designs to pick from, the poster hidden', pk.thumbs === 3 && pk.show && pk.set && /Camp at dusk/.test(pk.txt) && /Toy-room wall/.test(pk.txt) && /Scout badge/.test(pk.txt), JSON.stringify({ thumbs: pk.thumbs }));
  await shot(pp, 'poster-picker', true);
  await pp.click('#designs button:nth-child(2)'); await pp.click('#go'); await sleep(400);
  const go = await pp.evaluate(() => ({ q: location.search, shown: !document.getElementById('show').hidden, n: document.querySelectorAll('#show svg').length }));
  ok('picking design 2 and "Show the poster" shows it (and keeps ?design=2 for a reload)', go.shown && go.n === 1 && go.q === '?design=2', JSON.stringify(go));
  await pp.mouse.click(640, 400); await sleep(200); ok('a tap goes back to the setup', await pp.evaluate(() => document.getElementById('show').hidden && !document.getElementById('set').hidden));
  ok('the screen sticker page and the poster share one sizing (bc-screen-sticker)', await (async () => { const sp = await ctx.newPage(); await sp.goto(url.replace('index.html', 'screen-sticker.html')); const t = await sp.evaluate(() => document.getElementById('kv').textContent); await sp.close(); return /1\.50 px per mm/.test(t) && /sticker 3/.test(t); })());

  /* the baseline: the plain screen sticker (screen-sticker.html) on the same TV, through the same sweeps */
  await pp.goto(url.replace('index.html', 'screen-sticker.html')); await pp.evaluate(() => localStorage.setItem('bc-screen-sticker', JSON.stringify({ id: 2, k: 1.5 }))); await pp.reload(); await pp.click('#go'); await sleep(400);
  const pg0 = await pp.evaluate(() => { const r = document.querySelector('#mk svg').getBoundingClientRect(), w = r.width * 6 / 7; return { x: r.left + r.width / 14, y: r.top + r.height / 14, w, h: w }; });
  await loadPic('plain', (await pp.screenshot()).toString('base64'), 1.5, 2, pg0); const plain = await margin('plain'), plainG = await grid('plain');
  ok('baseline: the plain screen sticker is found by the same sweeps', plain.far && plain.blur && plain.side, JSON.stringify(plain));

  for (const R of RUNS) {
    for (const d of [1, 2, 3]) {
      const id = R.ids[d], key = R.name + d;
      await pp.goto(purl); await pp.evaluate((s) => localStorage.setItem('bc-screen-sticker', JSON.stringify(s)), { id, k: R.k }); await pp.goto(purl + '?design=' + d); await sleep(500);
      const geo = await pp.evaluate(() => { const s = document.querySelector('#show svg'), g = s.lastElementChild, r = g.children[1]; const t = [].slice.call(s.querySelectorAll('text')).map((x) => x.textContent).join(' | ');
        return { last: g.getAttribute('class') === 'stk' && g.getAttribute('shape-rendering'), x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width'), h: +r.getAttribute('height'), fill: r.getAttribute('fill'), mat: +g.children[0].getAttribute('width'), texts: t, sw: s.getBoundingClientRect().width, nan: /NaN|undefined|Infinity/.test(s.outerHTML) }; });
      const mm = geo.w / R.k;
      ok(R.name + ' / ' + d + ' ' + NAMES[d] + ': the sticker is drawn last (nothing covers it, every number in the art is a number), black square ' + mm.toFixed(2) + ' mm (8 cm), white edge of 1.25 cells', !geo.nan && geo.last === 'crispEdges' && geo.fill === '#000' && geo.w === geo.h && Math.abs(mm - 80) < 0.5 && geo.mat - geo.w >= 2 * Math.round(geo.w / 6 * 1.25) - 1, JSON.stringify({ w: geo.w, mat: geo.mat }));
      if (R.name === 'TV') ok(R.name + ' / ' + d + ': no words on the poster but "Base Camp" and "point the iPad here"', geo.texts.split(' | ').every((t) => /^(Base ?Camp|Base|Camp|point the iPad here|[A-Z ])$/.test(t)), geo.texts.slice(0, 120));
      const png = (await pp.screenshot()).toString('base64');
      if (R.name === 'TV') await shot(pp, 'poster-' + d + '-' + NAMES[d].toLowerCase().replace(/[^a-z]+/g, '-') + '-tv');
      else if (d === 3 || d === 1) await shot(pp, 'poster-' + d + '-monitor');
      /* the screenshot into the game's page; the white edge really is white all round in the picture */
      const q = await p.evaluate(async ([key, png, k, id, geo]) => { const im = new Image(); await new Promise((r) => { im.onload = r; im.src = 'data:image/png;base64,' + png; }); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const D = g.getImageData(0, 0, c.width, c.height);
        (window.__posters = window.__posters || {})[key] = { w: c.width, h: c.height, d: D.data, k, id, mx: geo.x + geo.w / 2, my: geo.y + geo.h / 2 };
        const q = Math.round(geo.w / 6), x0 = geo.x - q, y0 = geo.y - q, x1 = geo.x + geo.w + q, y1 = geo.y + geo.h + q; let minW = 255, maxB = 0;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * c.width + x) * 4, v = Math.min(D.data[i], D.data[i + 1], D.data[i + 2]), inside = x >= geo.x && x < geo.x + geo.w && y >= geo.y && y < geo.y + geo.h; if (!inside) minW = Math.min(minW, v); else if (x < geo.x + q || x >= geo.x + geo.w - q || y < geo.y + q || y >= geo.y + geo.h - q) maxB = Math.max(maxB, Math.max(D.data[i], D.data[i + 1], D.data[i + 2])); }
        return { minW, maxB }; }, [key, png, R.k, id, geo]);
      ok(R.name + ' / ' + d + ': in the screenshot a full cell of pure white surrounds the black square and its black border is pure black', q.minW >= 250 && q.maxB <= 5, JSON.stringify(q));
      /* the pretend iPad pictures */
      const rs = []; for (const o of BASE) rs.push(Object.assign({ n: o.n }, await p.evaluate(([key, o]) => window.__cam(key, o), [key, Object.assign({ keep: R.name === 'TV' && o === BASE[1] }, o)])));
      ok(R.name + ' / ' + d + ' ' + NAMES[d] + ' (sticker ' + id + '): found in all 3 camera pictures, no other sticker, within the game\'s limits', rs.every((r) => r.ok), rs.map((r) => r.n + ': ' + (r.m ? 'id ' + r.m.id + ' side ' + r.m.side + ' px, rms ' + r.m.rms + ' px, bits wrong ' + r.m.ham + ', distance ' + r.m.dist + ' m (true ' + r.truthD + ')' : 'not found') + (r.other.length ? ' OTHER ' + r.other : '')).join('; '));
      ok(R.name + ' / ' + d + ': the distance from the 8 cm square matches the truth within 3 % (the sizing is right)', rs.every((r) => r.m && Math.abs(r.m.dist - r.truthD) / r.truthD < 0.03), rs.map((r) => r.m ? r.m.dist + '/' + r.truthD : '-').join(' '));
      if (R.name === 'TV') { const jp = rs[1].jpg; if (jp) { fs.writeFileSync(OUT + shotN + '-poster-' + d + '-camera.png', Buffer.from(await p.evaluate(async (jp) => { const im = new Image(); await new Promise((r) => { im.onload = r; im.src = jp; }); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); return c.toDataURL('image/png').split(',')[1]; }, jp), 'base64')); shots.push(shotN + '-poster-' + d + '-camera.png'); console.log('shot ' + shotN + '-poster-' + d + '-camera.png'); shotN++; } }
      /* margins (TV sizing only): the same sweep for every design */
      if (R.name === 'TV') {
        margins.push(Object.assign({ d }, await margin(key), { grid: await grid(key) }));
      }
    }
  }
  const step = { far: 0.25, blur: 0.5, side: 5 }, notWorse = (m) => ['far', 'blur', 'side'].every((k) => m[k] && !m[k].falseId && m[k].v >= plain[k].v - step[k]);
  ok('margins: every design is found as far away, as blurred and as far to the side as the plain screen sticker (within one step), and never as another sticker', margins.length === 3 && margins.every(notWorse), JSON.stringify({ plain, designs: margins }));
  ok('the grid of 80 views: every design gives its sticker in at least as many views as the plain screen sticker, less 4, and never another sticker', margins.every((m) => m.grid.n >= plainG.n - 4 && !m.grid.wrong) && !plainG.wrong, 'plain ' + plainG.n + '/80, designs ' + margins.map((m) => m.d + ': ' + m.grid.n + '/80').join(', '));
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 5)));
  const fails = res.filter((r) => !r).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
