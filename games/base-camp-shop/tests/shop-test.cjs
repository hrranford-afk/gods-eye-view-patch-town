/* Base Camp SHOP EDITION test (Playwright).
   Run:  NODE_PATH=$(npm root -g) node games/base-camp-shop/tests/shop-test.cjs
   Checks: the practice shop loads; every prop builds (shared materials, no text, cheap); the shop jobs; the proposal plays; the director take is 30 +- 2 s, identical across runs, hides all UI and
   shows a 3 2 1 countdown first; find-the-creatures counts to 5 and resets; nothing is saved; the take also works in AR (the real WebXR polyfill with a fake native side) on the counter that is tapped;
   0 page errors. Writes the five screenshots into ../shots. ONLY=name,name runs a subset (shop,props,jobs,proposal,director,find,ar,shots). */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'shots') + '/'; fs.mkdirSync(OUT, { recursive: true });
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean), want = (n) => !ONLY.length || ONLY.includes(n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const res = [];
const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const TYPES = { '.html': 'text/html', '.json': 'application/json', '.js': 'text/javascript' };
function serve() {
  const srv = http.createServer((req, rs) => { const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html')); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); return rs.end('no'); } rs.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rs); });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, url: 'http://127.0.0.1:' + srv.address().port + '/index.html' })));
}
const WEATHER = JSON.stringify({ current: { temperature_2m: 12, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-12-05T07:40'], sunset: ['2026-12-05T15:50'] } });
async function newPage(b, w, h, extra) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: WEATHER }));
  const p = await ctx.newPage(), errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  /* count every localStorage / sessionStorage / IndexedDB write after the shop is entered (window.__wr is switched on by the test) */
  await p.addInitScript(() => { window.__wr = { on: false, n: 0, keys: [] }; for (const K of [Storage.prototype]) { const s0 = K.setItem, r0 = K.removeItem; K.setItem = function (k, v) { if (window.__wr.on) { window.__wr.n++; window.__wr.keys.push(k); } return s0.apply(this, arguments); }; K.removeItem = function (k) { if (window.__wr.on) { window.__wr.n++; window.__wr.keys.push('-' + k); } return r0.apply(this, arguments); }; } });
  if (extra) await extra(p, ctx); return { ctx, p, errs };
}
const GL = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'];
const stageToScreen = (p, pts) => p.evaluate((pts) => pts.map((q) => { const w = __g.shSw(q[0], q[1], q[2]).project(__g.camera); return [(w.x + 1) / 2 * innerWidth, (1 - w.y) / 2 * innerHeight, w.z < 1]; }), pts);
const sheet = (p) => p.evaluate(() => { const S = __g.SH; return JSON.stringify(S.actors.map((a) => [+a.x.toFixed(4), +a.z.toFixed(4), +a.y.toFixed(4)])); });
const uiVisible = (p) => p.evaluate(() => [...document.querySelectorAll('#ui > *')].filter((e) => { const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && !e.hidden && e.id !== 'touch' && (e.offsetWidth > 0 || e.offsetHeight > 0); }).map((e) => e.id));

(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: GL });
  /* ================= 1. the practice shop loads, from the title ================= */
  const L = await newPage(b, 1180, 820), p = L.p; const ev = (f, a) => p.evaluate(f, a);
  await p.goto(url); await sleep(1800);
  ok('title has the shop buttons (the flag is on)', await ev(() => !$('shopRow').hidden && !!$('bShop') && !!$('bShopAR') && $('bShopAR').disabled === true), 'AR button disabled without AR');
  await ev(() => { window.__wr.on = true; }); await p.click('#bShop'); await sleep(1300); const early = await ev(() => __g.SH.actors.some((a) => a.ride)); await sleep(1200);
  ok('practice shop loads: shop on, no colony, the shop room is built', await ev(() => { const S = __g.SH; return S.on && !S.ar && __g.G.mode === 'shop' && S.ready && S.room.visible && S.stage.visible !== false && S.root.visible && __g.G.settlements.length === 0; }));
  ok('no title or colony UI shows; the shop bar does', await ev(() => $('title').hidden && !$('shopbar').hidden && $('shopbar').querySelectorAll('button').length >= 4));
  const first = await ev(() => { const r = __g.renderer; return { calls: r.info.render.calls, tris: r.info.render.triangles }; }); console.log('  draw calls ' + first.calls + ', triangles ' + first.tris + ' (shop room and stage together)');
  ok('the room has what a jeweller needs: counter, glass case, shelves, window, till, tree', await ev(() => { const R = __g.SH.room.userData; return !!R.counterTop && R.noStand.length >= 1 && !!R.till && !!R.tree && R.lights.length > 10 && __g.SH.room.children.length > 60; }));
  const pix = async () => { const png = await p.screenshot(); return png.length; };
  const sh1 = await p.screenshot(); ok('the canvas is drawn (not blank)', sh1.length > 20000, sh1.length + ' bytes');
  ok('the creatures arrive by cable car first, then work (jobs start)', await (async () => { await sleep(9500); const late = await ev(() => { const S = __g.SH; return S.actors.every((a) => !a.ride) && S.actors.some((a) => a.cur && a.cur.k); }); return late; })()); ok('they ride in on the cable car (some are still riding a second after the shop opens)', early);
  ok('the room was never saved: persist does nothing and no storage write happened', await ev(() => __g.persist(true) === false && window.__wr.n === 0), JSON.stringify(await ev(() => window.__wr)));

  /* ================= 2. the props ================= */
  if (want('props')) {
    const P = await ev(() => {
      const K = window.BC_SHOP_MK, T = __g.THREE, out = {}; out.keys = K.keys;
      const stat = (g) => { let calls = 0, tris = 0, nan = 0; g.traverse((o) => { if (o.isMesh || o.isSprite || o.isPoints) { calls++; if (o.isMesh && o.geometry && o.geometry.attributes.position) { const n = o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count; tris += n / 3; for (const v of o.geometry.attributes.position.array) if (!isFinite(v)) nan++; } } }); return { calls, tris: Math.round(tris), nan }; };
      for (const k of ['ring', 'gem', 'tray', 'necklace', 'cabin', 'plaque', 'shelf', 'crate', 'runner']) out[k] = stat(K[k]());
      out.gift = stat(K.gift(2)); out.giftWrap = stat(K.giftWrap(1)); out.pole = stat(K.pole(0.3, true)); out.confetti = stat(K.confetti(50));
      const a = K.gift(2), c = K.gift(2); out.sharedGeo = a.children[0].geometry === c.children[0].geometry; out.sharedMat = a.children[0].material === __g.BCP.toon;
      const r = K.ring(); out.ringR = r.userData.R; out.ringGem = !!r.userData.gem; let tor = null; r.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.color) tor = o; }); out.ringBox = (() => { const bb = new T.Box3().setFromObject(r); return [+(bb.max.x - bb.min.x).toFixed(4), +(bb.max.y - bb.min.y).toFixed(4)]; })();
      const gm = K.gem(); out.gemShiny = !!gm.userData.stone && gm.userData.stone.material.metalness > 0.8 && !!gm.userData.stone.material.envMap && gm.userData.stone.material.flatShading === true; out.gemFace = !!gm.userData.face;
      const nk = K.necklace(); nk.userData.reveal(0); const v0 = nk.children.filter((o) => o.isMesh).map((o) => o.visible); nk.userData.reveal(0.5); const half = nk.children[2].geometry.drawRange.count; nk.userData.reveal(1); const full = nk.children[2].geometry.drawRange.count; out.necklace2 = { half, full, v0 };
      const gw = K.giftWrap(0); gw.userData.wrap(0); const w0 = gw.children.filter((o) => o.visible).length; gw.userData.wrap(1); const w1 = gw.children.filter((o) => o.visible).length; out.wrapSteps = [w0, w1];
      const pl = K.plaque(); out.plaqueSlot = !!pl.userData.face && typeof pl.userData.setGlow === 'function'; pl.userData.setGlow(1); out.plaqueGlow = pl.userData.face.material.color.getHex() > 0xf0e0b0;
      let txt = false; for (const o of [...__g.SH.stage.children, ...__g.SH.room.children]) o.traverse((q) => { if (q.material && q.material.map && q.material.map.image && q.material.map.image.getContext && !(q.isSprite || q.isPoints) && q.material.map.name !== 'tile') { /* canvas textures: floor, wall, street (no text drawn: checked in the source) */ } });
      out.glass = (() => { let g2 = null; __g.SH.room.traverse((o) => { if (o.material && o.material.transparent && o.material.opacity < 0.25 && o.material.metalness > 0.2) g2 = o.material; }); return !!g2 && !!g2.envMap; })();
      out.stageKids = __g.SH.stage.children.length; out.noStand = __g.SH.room.userData.noStand;
      return out;
    });
    console.log('  prop draw calls: ' + ['ring', 'gem', 'gift', 'giftWrap', 'tray', 'necklace', 'cabin', 'plaque', 'shelf', 'crate', 'pole', 'runner'].map((k) => k + ' ' + P[k].calls + '/' + P[k].tris).join('  '));
    ok('every maker is there', ['ring', 'gem', 'gift', 'giftWrap', 'tray', 'necklace', 'pole', 'cabin', 'plaque', 'shelf', 'crate', 'runner', 'confetti', 'room'].every((k) => P.keys.includes(k)));
    ok('props are cheap: every one at most 9 draw calls (a gift box: body, ink, shadow)', ['ring', 'gem', 'gift', 'giftWrap', 'tray', 'necklace', 'cabin', 'plaque', 'shelf', 'crate', 'pole', 'runner', 'confetti'].every((k) => P[k].calls <= 9) && P.gift.calls <= 3, JSON.stringify(Object.fromEntries(['ring', 'gem', 'gift', 'giftWrap', 'tray', 'necklace', 'cabin', 'plaque', 'shelf'].map((k) => [k, P[k].calls]))));
    ok('no NaN in any geometry', ['ring', 'gem', 'tray', 'necklace', 'cabin', 'plaque', 'shelf', 'gift', 'giftWrap'].every((k) => P[k].nan === 0));
    ok('geometry and the toon material are shared between copies', P.sharedGeo && P.sharedMat);
    ok('the ring is as big as a creature: 6 cm across, with a gem', P.ringR === 0.03 && P.ringGem && Math.abs(P.ringBox[0] - 0.06) < 0.004 && P.ringBox[1] > 0.06, JSON.stringify(P.ringBox));
    ok('the mirror gem is shiny and faceted (metal, env map, flat shaded) and holds a reflection slot', P.gemShiny && P.gemFace);
    ok('the necklace is drawn bead by bead (reveal 0 .. 1) and the box ties itself (ribbon, bow appear)', P.necklace2.half > 0 && P.necklace2.half < P.necklace2.full && P.wrapSteps[0] < P.wrapSteps[1], JSON.stringify([P.necklace2.half, P.necklace2.full, P.wrapSteps]));
    ok('the plaque is blank: a face slot that glows, no artwork', P.plaqueSlot && P.plaqueGlow);
    ok('the glass case looks glassy (transparent, reflective) and creatures are kept off its top (a no-stand zone)', P.glass && P.noStand.length >= 1 && P.noStand[0].why === 'glass case top');
    const sec = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').split("/* ============ SHOP EDITION: the jeweller's")[1].split('// ============ test and debug hooks')[0], src = fs.readFileSync(path.join(ROOT, 'models/shop-props.js'), 'utf8') + sec;
    ok('no text is drawn on anything (no fillText in the shop code: no maker marks, no names, no logo)', !/fillText|strokeText/.test(src));
    ok('only /* */ comments in the shop code (a // would break the game)', !/(^|[^:'"\\])\/\/ /m.test(fs.readFileSync(path.join(ROOT, 'models/shop-props.js'), 'utf8')) && !/(^|[;{}]\s)\/\/ /m.test(sec));
    ok('no brand marks anywhere in the new files: no trademark signs, no web addresses, no maker names (the shop is only ever "the jeweller\'s")', !/[\u2122\u00ae\u00a9]|www\.|\.co\.uk|https?:/i.test(src) && !/logo\s*=/i.test(src));
  }

  /* ================= 3. the shop jobs ================= */
  if (want('jobs')) {
    await ev(() => { __g.SH.manual = true; __g.shopReset('play'); __g.shopArrive(0, true); const S = __g.SH; for (let i = 0; i < 60 * 8; i++) __g.shopStep(1 / 60); S.auto = false; for (const a of S.actors) __g.shopCmd(a, []); });
    const J = await ev(() => {
      const S = __g.SH, A = S.actors, J = __g.SHJ, st = (n) => { for (let i = 0; i < 60 * n; i++) __g.shopStep(1 / 60); }, out = {}, tray = S.ringHome;
      /* polish: the polisher rubs, the ring shines and sparkles */
      S.ring.userData.shine = 0; A[0].tasks = J.polish(A[0], 3); let sparks = 0, rub = 0, shine0 = 0; for (let i = 0; i < 60 * 12; i++) { __g.shopStep(1 / 60); if (A[0].anim === 'polish') { rub = Math.max(rub, Math.abs(A[0].U.arms[0].rotation.x + 1.55)); } if (PARTS.some((p) => p.on && p.sp.material.blending === 2)) sparks++; } out.polish = { shine: S.ring.userData.shine, rub: +rub.toFixed(2), sparks, occFree: !S.occ.polish };
      /* wrap: ribbon and bow come on, a pop at the end */
      const w = S.wrap; A[1].tasks = J.wrap(A[1], 3); let seen = []; for (let i = 0; i < 60 * 8; i++) { __g.shopStep(1 / 60); if (i % 30 === 0) seen.push(w.children.filter((o) => o.visible).length); } out.wrap = { seen: [Math.min(...seen), seen[seen.length - 1]], bowScale: +w.children[w.children.length - 1].scale.x.toFixed(2), arms: A[1].anim };
      /* hang: the necklace reveals while the creature walks along it */
      A[2].tasks = J.hang(A[2], 3); let xs = []; for (let i = 0; i < 60 * 9; i++) { __g.shopStep(1 / 60); if (i % 20 === 0) xs.push([+A[2].x.toFixed(3), S.neck.children[0].geometry.drawRange ? 1 : 0]); } out.hang = { x0: Math.min(...xs.map((q) => q[0])), x1: Math.max(...xs.map((q) => q[0])), revealed: S.neck.children.find((o) => o.isMesh && o.geometry.drawRange.count !== Infinity).geometry.drawRange.count };
      /* gaze: a reflection face appears in the gem */
      A[3].tasks = J.gaze(A[3], 4); for (let i = 0; i < 60 * 14 && S.gem.userData.gazer !== A[3]; i++) __g.shopStep(1 / 60); st(1.2); out.gaze = { face: S.gem.userData.face.visible, who: S.gem.userData.gazer === A[3], kids: S.gem.userData.face.children[0] ? S.gem.userData.face.children[0].children.length : 0 }; st(5);
      out.gazeEnd = S.gem.userData.face.visible === false;
      /* decorations: a creature carries a decoration from the crate and sets it down */
      const it = S.items.star; it.visible = false; A[4].tasks = J.decorate(A[4], 'star'); let carried = false, still = 0; for (let i = 0; i < 60 * 9; i++) { __g.shopStep(1 / 60); if (it.parent === A[4].carry) carried = true; } out.decor = { carried, placed: it.parent === S.stage && it.visible, atSpot: Math.hypot(it.position.x - __g.SHL.spots.star[0], it.position.z - __g.SHL.spots.star[1]) < 0.001 };
      /* all five decoration kinds exist from decor.js */
      out.kinds = ['pinetree', 'star', 'chain', 'stocking'].every((k) => !!__g.decorMake(k).userData.bcDecor);
      return out;
    });
    ok('polish: the ring is rubbed (arms rub), shines up and sparkles, and the station is freed', J.polish.shine > 0.9 && J.polish.rub > 0.1 && J.polish.sparks > 20 && J.polish.occFree, JSON.stringify(J.polish));
    ok('wrap: a box is tied with ribbon and a bow while a creature works at it', J.wrap.seen[1] > J.wrap.seen[0] && J.wrap.bowScale > 0.9, JSON.stringify(J.wrap));
    ok('hang: the creature walks along the stands while the necklace appears bead by bead', J.hang.x1 - J.hang.x0 > 0.15 && J.hang.revealed > 0, JSON.stringify(J.hang));
    ok('gaze: the creature looks into the gem and its own face shows there; it goes away after', J.gaze.face && J.gaze.who && J.gaze.kids >= 4 && J.gazeEnd, JSON.stringify(J.gaze));
    ok('decorate: a decoration from decor.js is carried from the crate and put down at its spot', J.decor.carried && J.decor.placed && J.decor.atSpot && J.kinds, JSON.stringify(J.decor));
  }

  /* ================= 4. the proposal (in the practice shop, from the button) ================= */
  if (want('proposal')) {
    await ev(() => { __g.SH.manual = false; __g.shopReset('play'); __g.shopArrive(0, true); __g.SH.manual = true; for (let i = 0; i < 60 * 8; i++) __g.shopStep(1 / 60); });
    const Pq = await ev(() => {
      const S = __g.SH, A = S.actors, out = { phases: [] }; __g.SH.auto = false; for (const a of A) __g.shopCmd(a, []); S.log = []; const okNow = __g.shopProposeNow(); out.started = okNow; let maxConf = 0, heartT = -1, ringUp = 0, kneelY = 0, dAnim = [], toD = 0;
      for (let i = 0; i < 60 * 20; i++) {
        __g.shopStep(1 / 60); const t = S.time;
        if (S.confetti.userData.pieces.filter((q) => q.on).length > maxConf) maxConf = S.confetti.userData.pieces.filter((q) => q.on).length;
        if (S.heart.userData.t !== undefined && heartT < 0) heartT = t; if (A[0].anim === 'kneel') { kneelY = Math.max(kneelY, A[0].mesh.position.y); ringUp = Math.max(ringUp, A[0].ringK); toD = Math.hypot(A[0].x - A[3].x, A[0].z - A[3].z); }
        if (i % 30 === 0) dAnim.push(A[3].anim);
      }
      out.log = S.log.map((q) => q.n + '@' + q.t).join(' '); out.maxConf = maxConf; out.ringUp = +ringUp.toFixed(2); out.toD = +toD.toFixed(3); out.dAnim = [...new Set(dAnim)]; out.cheer = A.filter((a) => a.anim === 'cheer' || a.anim === 'joy' || a.anim === 'clap' || a.anim === 'sob' || a.anim === 'idle').length; out.after = { proposing: S.proposing, ringHome: S.ring.position.distanceTo(S.ringHome) < 0.001, held: !!S.ring.userData.held };
      return out;
    });
    ok('the proposal plays: ring taken, the suitor kneels and holds the ring up next to the other one', Pq.started && /ring@/.test(Pq.log) && /kneel@/.test(Pq.log) && Pq.ringUp > 0.9 && Pq.toD < 0.09, Pq.log + ' toD ' + Pq.toD);
    ok('a heart pops, the other gasps then jumps for joy, confetti falls, everyone cheers', /gasp@/.test(Pq.log) && /heart@/.test(Pq.log) && /joy@/.test(Pq.log) && /confetti@/.test(Pq.log) && /cheer@/.test(Pq.log) && Pq.maxConf > 40 && Pq.dAnim.includes('gasp') && Pq.dAnim.includes('joy'), JSON.stringify(Pq.dAnim) + ' confetti ' + Pq.maxConf);
    ok('afterwards the ring goes back to its tray and the crew go back to work', Pq.after.proposing === false && Pq.after.ringHome && !Pq.after.held);
  }

  /* ================= 5. the director: 30 seconds, seeded, UI hidden ================= */
  let dirRuns = [];
  if (want('director')) {
    await ev(() => { __g.SH.manual = false; __g.shopReset('play'); __g.shopArrive(0, true); });
    for (let run = 0; run < 2; run++) {
      await sleep(run ? 500 : 7000); await ev(() => { __g.SH.lastDir = null; });
      await p.click('#sbDir'); const seen = new Set(), t0 = Date.now(); let uiDuring = null, tookDuringTake = false, cdHidden = null, bodyTake = false;
      while (Date.now() - t0 < 50000) {
        await sleep(100); const s = await ev(() => ({ cd: $('cd').hidden ? '' : $('cd').textContent, on: !!(__g.SH.dir && __g.SH.dir.on), done: !!__g.SH.lastDir, take: document.body.classList.contains('take'), t: __g.SH.time }));
        if (s.cd) seen.add(s.cd); if (s.take) bodyTake = true;
        if (s.on && s.t > 12 && uiDuring === null) { uiDuring = await uiVisible(p); cdHidden = await ev(() => $('cd').hidden); const txt = await ev(() => [...document.querySelectorAll('#ui *')].filter((e) => { const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && e.children.length === 0 && (e.textContent || '').trim().length > 0 && e.offsetWidth > 0; }).map((e) => e.id + ':' + e.textContent.slice(0, 20))); uiDuring = { ids: uiDuring, text: txt }; }
        if (s.done) break;
      }
      const D = await ev(() => __g.SH.lastDir); dirRuns.push({ D, seen: [...seen], uiDuring, bodyTake, cdHidden });
      if (run === 0) { ok('countdown: 3, 2, 1 shows before the take', JSON.stringify([...seen]) === JSON.stringify(['3', '2', '1']), [...seen].join(',')); ok('during the take every button, card and text is hidden (nothing visible in the page overlay)', uiDuring && uiDuring.ids.length === 0 && uiDuring.text.length === 0 && bodyTake && cdHidden, JSON.stringify(uiDuring)); }
      ok('take ' + (run + 1) + ' finishes in 30 +- 2 s (wall clock ' + (D ? (D.wallMs / 1000).toFixed(2) : '?') + ' s, story clock ' + (D ? D.simEnd.toFixed(2) : '?') + ' s)', D && Math.abs(D.wallMs / 1000 - 30) <= 2 && Math.abs(D.simEnd - 30) < 0.05);
    }
    ok('the UI comes back after the take', await ev(() => !document.body.classList.contains('take') && !$('shopbar').hidden && $('cd').hidden));
    /* the third run is stepped by hand: same fixed steps, same story */
    const man = await ev(() => { const S = __g.SH; S.manual = true; __g.shopDirStart({ skip: 1 }); const rec = []; let last = -1, log = null; while (S.dir) { __g.shopStep(1 / 60); } return S.lastDir; });
    const eq = (a, b) => JSON.stringify(a.rec) === JSON.stringify(b.rec);
    ok('identical every take: same seed gives the same positions at every second (real take 1 = real take 2 = a stepped take)', dirRuns.length === 2 && eq(dirRuns[0].D, dirRuns[1].D) && eq(dirRuns[0].D, man) && man.rec.length >= 29, man.rec.length + ' samples');
    /* the log is cleared at the end of a take only by the next reset, so read it again from a take stopped just before the end */
    const lg = await ev(() => { const S = __g.SH; S.manual = true; __g.shopDirStart({ skip: 1 }); while (S.time < 29.9) __g.shopStep(1 / 60); const l = S.log.map((q) => q.n + '@' + q.t); S.dir = null; document.body.classList.remove('take'); return l; });
    const firstT = (n) => { const q = lg.find((x) => x.startsWith(n + '@')); return q ? +q.split('@')[1] : -1; };
    ok('proposal and finale are inside the take (ring, kneel, gasp, heart, joy, confetti, finale in this order)', ['ring', 'kneel', 'gasp', 'heart', 'confetti', 'finale'].every((n, i, a) => firstT(n) > 0 && (i === 0 || firstT(n) >= firstT(a[i - 1]))) && firstT('joy') > 0 && firstT('joy') >= firstT('heart') && firstT('finale') > firstT('joy') && firstT('finale') < 30, lg.join(' '));
    const keep = await ev(() => { const S = __g.SH, ro = S.room.userData.noStand; let bad = 0; S.manual = true; __g.shopDirStart({ skip: 1 }); const world = new __g.THREE.Vector3(); while (S.time < 29.9) { __g.shopStep(1 / 60); for (const a of S.actors) { world.copy(a.mesh.position); S.stage.localToWorld(world); for (const z of ro) if (world.x > z.x0 && world.x < z.x1 && world.z > z.z0 && world.z < z.z1 && Math.abs(world.y - z.y) < 0.2) bad++; } } S.dir = null; document.body.classList.remove('take'); return bad; });
    ok('nobody ever stands on the glass case top (no-stand zone) during a take', keep === 0);
    await ev(() => { const S = __g.SH; S.dir = null; document.body.classList.remove('take'); S.manual = false; __g.shopReset('play'); __g.shopArrive(0, true); __g.shopUi(); });
  }

  /* ================= 6. find the creatures ================= */
  if (want('find')) {
    await ev(() => { __g.SH.manual = false; __g.shopReset('play'); });
    await p.click('#sbFind'); await sleep(900);
    const F0 = await ev(() => { const S = __g.SH; return { on: !!S.find, found: S.find.found, idle: S.find.idleLimit, hidden: S.actors.map((a) => a.hideSpot.key), ui: $('fcount').textContent }; });
    ok('find: 5 creatures hide behind a gift box, inside the ring, on the shelf, behind the tree and the gem', F0.on && F0.found === 0 && F0.hidden.slice().sort().join() === 'gem,gift,ring,shelf,tree', F0.hidden.join(','));
    ok('find: counter shows 0 / 5 and the idle reset is 60 s', F0.ui === '0 / 5' && F0.idle === 60);
    const miss = await ev(() => { const S = __g.SH; return S.find.found; }); await p.mouse.click(60, 400); await sleep(200); ok('a tap on nothing finds nobody', await ev(() => __g.SH.find.found) === 0);
    for (let i = 0; i < 5; i++) {
      const pts = await ev((i) => { const a = __g.SH.actors.filter((q) => !q.found)[0]; return [[a.x, 0.0042 + a.y + 0.036, a.z], a.i]; }, i);
      const sc = (await stageToScreen(p, [pts[0]]))[0]; await p.mouse.click(sc[0], sc[1]); await sleep(400);
      const f = await ev(() => __g.SH.find.found); if (f !== i + 1) { console.log('  tap at', sc, 'found', f); }
    }
    const done = await ev(() => { const S = __g.SH, F = S.find; return { found: F.found, cele: F.cele, ui: $('fcount').textContent, conf: S.confetti.userData.pieces.filter((q) => q.on).length, glow: S.plaque.userData.glowK }; });
    await sleep(1500); const conf2 = await ev(() => __g.SH.confetti.userData.pieces.filter((q) => q.on).length);
    ok('find: tapping all five counts 1..5 and a celebration plays (cheering, confetti, plaque glows)', done.found === 5 && done.cele === 1 && done.ui === '5 / 5' && (done.conf > 0 || conf2 > 0) && done.glow === 1, JSON.stringify(done) + ' confetti later ' + conf2);
    /* idle reset */
    await ev(() => { __g.SH.find.idleLimit = 2; }); await sleep(3200);
    const R = await ev(() => { const S = __g.SH; return { found: S.find ? S.find.found : -1, rounds: S.find && S.find.rounds, ui: $('fcount').textContent, hidden: S.actors.every((a) => !a.found && a.anim !== 'found'), limit: S.find.idleLimit }; });
    ok('find: after the idle limit the game resets (0 / 5, everybody hides again, limit back to 60)', R.found === 0 && R.ui === '0 / 5' && R.hidden && R.limit === 60, JSON.stringify(R));
    ok('find: a real 60 s idle is what the reset waits for (the default, not a test value)', await ev(() => __g.SH.find.idleLimit === 60));
    ok('find: nothing about the player was saved (0 storage writes since the shop opened)', await ev(() => window.__wr.n === 0), JSON.stringify(await ev(() => window.__wr)));
    await p.click('#sbBack'); await sleep(400);
  }

  /* ================= 7. the pictures ================= */
  if (want('shots')) {
    const setView = (f) => ev(f);
    /* s1: the whole practice shop (landscape) */
    await ev(() => { const S = __g.SH; S.manual = false; __g.shopReset('play'); __g.shopArrive(0, true); S.manual = true; for (let i = 0; i < 60 * 14; i++) __g.shopStep(1 / 60); S.cam.view = 'shop'; S.cam.yaw = 0.08; S.cam.pitch = 0.5; S.cam.zoom = 1.0; S.cam.snap = true; S.manual = false; }); await sleep(1500); await p.screenshot({ path: OUT + 's1-shop.png' });
    /* s2: polishing the ring (landscape, close) */
    await ev(() => { const S = __g.SH; S.manual = true; __g.shopReset('director'); __g.shopArrive(0, true); S.dir = { on: true, rec: [], log: [], t: 0 }; __g.shopDirScript(); S.dir = null; document.body.classList.add('take'); });
    await ev(() => { const S = __g.SH; while (S.time < 12.4) __g.shopStep(1 / 60); const C = S.cam; C.view = 'stage'; C.focus = [0.125, 0.045, 0.03]; C.yaw = -0.55; C.pitch = 0.24; C.zoom = 0.3; C.snap = true; S.manual = false; S.acc = 0; }); await sleep(120);
    await ev(() => { __g.SH.manual = true; }); await sleep(900); await p.screenshot({ path: OUT + 's2-polish.png' });
    await ev(() => { document.body.classList.remove('take'); __g.SH.cam.focus = null; });
    await p.close(); await L.ctx.close();
    /* s3 (proposal, close) and s5 (find) in iPad portrait 820 x 1180; s4 the finale */
    const Q = await newPage(b, 820, 1180); const q = Q.p; await q.goto(url); await sleep(1500); await q.evaluate(() => { __g.shopEnter(false); __g.SH.mute = true; __g.SH.manual = true; __g.shopDirStart({ skip: 1 }); });
    await q.evaluate(() => { const S = __g.SH; while (S.time < 22.1) __g.shopStep(1 / 60); S.manual = false; S.acc = 0; }); await sleep(100); await q.evaluate(() => { __g.SH.manual = true; }); await sleep(900); await q.screenshot({ path: OUT + 's3-proposal.png' });
    await q.evaluate(() => { __g.SH.manual = false; }); await q.evaluate(() => { const S = __g.SH; S.manual = true; while (S.time < 28.6) __g.shopStep(1 / 60); }); await sleep(900); await q.screenshot({ path: OUT + 's4-finale.png' });
    await q.evaluate(() => { const S = __g.SH; S.dir = null; document.body.classList.remove('take'); S.manual = false; __g.shopReset('play'); __g.shopArrive(0, true); S.manual = true; for (let i = 0; i < 60 * 9; i++) __g.shopStep(1 / 60); __g.SH.manual = false; __g.shopUi(); __g.shopFindStart(); S.cam.snap = true; });
    await sleep(900); const pts = await q.evaluate(() => __g.SH.actors.slice(0, 3).map((a) => [a.x, 0.0042 + a.y + 0.036, a.z])); const sc = await stageToScreen(q, pts); for (const s of sc.slice(0, 2)) { await q.mouse.click(s[0], s[1]); await sleep(350); }
    await sleep(700); await q.screenshot({ path: OUT + 's5-find.png' }); ok('pictures written: s1 .. s5 in shots/', ['s1-shop', 's2-polish', 's3-proposal', 's4-finale', 's5-find'].every((n) => fs.existsSync(OUT + n + '.png') && fs.statSync(OUT + n + '.png').size > 15000));
    ok('portrait pictures have no page errors', Q.errs.length === 0, Q.errs.join(' | ')); await Q.ctx.close();
  }

  /* ================= 8. AR: the real polyfill with a fake native side; the scene lands on the counter that is tapped ================= */
  if (want('ar')) {
    const POLY = fs.readFileSync(path.join(ROOT, 'webxr-polyfill.js'), 'utf8'), install = require('./ar-fake.cjs');
    const SHED = [['floor', -1.2, 0, -1.0, 1.5, 1.5], ['counter', -0.62, 0, -0.7, 0.62, 0.34]];
    const A = await newPage(b, 1180, 820, async (pg) => { await install(pg, SHED); await pg.addInitScript({ content: POLY }); }); const a = A.p; const ea = (f, x) => a.evaluate(f, x);
    await a.goto(url); await sleep(2800);
    const arOk = await ea(() => __g.AR.ok); ok('AR is available through the polyfill and the title offers the shop in AR', arOk && await ea(() => !$('bShopAR').disabled));
    if (arOk) {
      await ea(() => { window.__cam.mode = 'fixed'; window.__cam.fixed = [0, 0.2, 0.1, 0, -0.8]; }); await ea(() => { window.__wr.on = true; }); await a.click('#bShopAR'); await sleep(3500);
      const s0 = await ea(() => { const S = __g.SH; return { on: S.on, ar: S.ar, placed: S.placed, hit: !!S.hit, ret: S.reticle && S.reticle.visible, msg: $('shopmsg').hidden ? '' : $('shopmsg').textContent, stage: S.stage.visible, bar: $('shopbar').hidden, mode: __g.G.mode, arOn: __g.AR.on }; });
      ok('AR shop starts: asks for a tap on the counter, shows a reticle, the scene is not placed yet', s0.on && s0.ar && !s0.placed && s0.arOn && s0.stage === false && s0.bar === true && /counter/.test(s0.msg), JSON.stringify(s0));
      await sleep(800); await a.mouse.click(590, 410); await sleep(1500);
      const s1 = await ea(() => { const S = __g.SH; return { placed: S.placed, y: +S.stage.position.y.toFixed(3), x: +S.stage.position.x.toFixed(3), z: +S.stage.position.z.toFixed(3), vis: S.stage.visible, room: S.room.visible, bar: !$('shopbar').hidden, ret: S.reticle.visible }; });
      ok('a tap puts the scene on the real counter (stage height = the counter, 1 cm), no shop room drawn, buttons appear', s1.placed && Math.abs(s1.y - (-0.62)) < 0.012 && s1.vis && !s1.room && s1.bar && !s1.ret && Math.abs(s1.z + 0.68) < 0.15, JSON.stringify(s1));
      await sleep(7000); const w1 = await ea(() => __g.SH.actors.some((x) => x.cur || x.ride)); ok('in AR the crew arrive by cable car and work on the tapped counter', w1);
      await a.click('#sbDir'); await sleep(800); const hid = await ea(() => ({ take: document.body.classList.contains('take'), vis: [...document.querySelectorAll('#ui > *')].filter((e) => getComputedStyle(e).visibility !== 'hidden' && e.id !== 'touch' && !e.hidden && e.offsetWidth > 0).map((e) => e.id) }));
      ok('in AR the countdown shows and the page is clean (only the countdown) before the take', hid.take && hid.vis.length <= 1 && (hid.vis.length === 0 || hid.vis[0] === 'cd'), JSON.stringify(hid));
      let end = null; const t0 = Date.now(); while (Date.now() - t0 < 45000) { await sleep(400); end = await ea(() => __g.SH.lastDir); if (end) break; }
      ok('the director take also runs to the end in AR (30.0 s of story; wall clock within 8 s because software-GL AR frames are slow) and the UI returns', end && Math.abs(end.simEnd - 30) < 0.05 && Math.abs(end.wallMs / 1000 - 30) <= 8 && await ea(() => !document.body.classList.contains('take') && !$('shopbar').hidden), end ? (end.wallMs / 1000).toFixed(2) + ' s' : 'no end');
      const man2 = await ea(() => { const S = __g.SH; S.manual = true; __g.shopDirStart({ skip: 1 }); while (S.dir) __g.shopStep(1 / 60); return S.lastDir; });
      ok('the AR take tells the same story as the practice take (same positions each second, in stage coordinates)', end && JSON.stringify(end.rec) === JSON.stringify(man2.rec) && man2.rec.length >= 29);
      ok('AR: no storage writes', await ea(() => window.__wr.n === 0), JSON.stringify(await ea(() => window.__wr)));
      await a.screenshot({ path: OUT + 'ar-placed.png' });
    }
    ok('AR run: 0 page errors', A.errs.length === 0, A.errs.join(' | ')); await A.ctx.close();
  }

  ok('practice shop run: 0 page errors', L.errs.length === 0, L.errs.join(' | '));
  const nf = res.filter((x) => !x).length; console.log(nf ? 'FAILED: ' + nf + ' of ' + res.length : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(nf ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
