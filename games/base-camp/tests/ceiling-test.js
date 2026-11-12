// Base Camp build 12: CEILINGS and the hanging base, in AR with the REAL WebXRKit polyfill and a fake native side (ar-fake.js). The fake shed has a ceiling plane
// ('ceilBoards', 1.6 m above the start, only rays that look UP hit it) and a chandelier top that is hit from ABOVE (it must not be taken for a ceiling).
//  A. three trials with different seeds and sweep orders (ceiling first, floor first, a down-facing ceiling normal): the ceiling is found as `ceil`, the first landing is never on it
//  B. an expedition offered ("<name> wants to try the ceiling!") only after a cable car works; accepting founds an upside-down camp: the group's world up vector points down,
//     huts and colonists hang below the boards, lanterns, milestone "Upside-down camp"; autoExpand never takes the ceiling by itself
//  C. layout at 390 x 844 and 1120 x 2000 (portrait, body.inar): toolbar fully on screen (both toolbars), compact report under 30% of the height, toast / banner / report / status do not overlap
//  D. save and reload keep `ceil` (and the camp hangs again); an old map without `ceil` loads; a colony saved on a ceiling by an older build is hung up when the scan sees the boards
//  E. 0 page errors
// Run (about 8 minutes):  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node games/base-camp/tests/ceiling-test.js
const fs = require('fs'), path = require('path');
const { serve, ROOT } = require('./lib.js'); const install = require('./ar-fake.js'); const { chromium } = require('playwright');
const POLY = fs.readFileSync(process.env.POLY || path.join(ROOT, 'webxr-polyfill.js'), 'utf8'); const OUT = path.join(ROOT, 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const SHED = [['floor', -1.2, 0, -1.5, 1.2, 1.2], ['speakerA', -0.45, 0.9, -1.2, 0.15, 0.125], ['speakerB', -0.25, -0.9, -1.2, 0.15, 0.125], ['shelf', 0.2, 0.0, -2.7, 0.7, 0.13], ['chandelier', 0.7, 0.2, -1.6, 0.1, 0.1], ['ceilBoards', 1.6, 0.0, -1.5, 1.4, 1.4]];
(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  /* a seeded Math.random (localStorage bc-seed) so each trial is a different but repeatable run */
  await p.addInitScript(() => { let a = 0; try { a = +localStorage.getItem('bc-seed') || 0; } catch (e) {} if (a) Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
  await install(p, SHED); await p.addInitScript({ content: POLY });
  const ev = (f, a) => Promise.race([p.evaluate(f, a), new Promise((_, rej) => setTimeout(() => rej(new Error('page did not answer for 60 s (hung?)')), 60000))]);
  const noOverlay = () => ev(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  /* a looping sweep over named things; 'ceil' looks UP at the boards from standing height */
  const setPath = (legs, speed) => ev(([legs, speed]) => {
    const T = window.__place(), pick = (n) => T.find((t) => t.n === n);
    const look = (tx, ty, tz, off, hgt, ay, ap, dur) => { const q = [tx + off[0], ty + hgt, tz + off[1]], fx = tx - q[0], fy = ty - q[1], fz = tz - q[2], L = Math.hypot(fx, fy, fz); return { p: q, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay, ap, dur }; };
    const D = { floor: [[0, 1.3], 1.6, 0.6, 0.25, 12], floor2: [[0.3, -0.4], 1.7, 0.7, 0.25, 9], speakerA: [[0.1, 0.5], 0.55, 0.12, 0.1, 8], speakerB: [[-0.1, 0.5], 0.6, 0.12, 0.1, 8], shelf: [[0, 0.6], 0.5, 0.18, 0.1, 10], chandelier: [[0.2, 0.3], 0.6, 0.1, 0.08, 7] };
    window.__cam.path = legs.map((l) => { if (l === 'ceil') { const S = pick('ceilBoards'); return look(S.cx, S.y, S.cz, [0, 0.7], -1.3, 0.5, 0.22, 11); } const d = D[l], n = l === 'floor2' ? 'floor' : l, S = pick(n); return look(S.cx, S.y, S.cz, d[0], d[1], d[2], d[3], d[4]); });
    window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = speed; window.__cam.done = false;
  }, [legs, speed]);
  const keepSweeping = async () => { if (await ev(() => window.__cam.done)) await ev(() => { window.__cam.t0 = performance.now(); window.__cam.done = false; }); };
  const waitFor = async (fn, ms, every) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await keepSweeping(); if (await ev(fn)) return Date.now() - t0; await sleep(every || 700); } return -1; };
  const boot = async (seed, normal) => { await p.goto(url); await sleep(1500); await ev((seed) => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); localStorage.setItem('bc-seed', String(seed)); }, seed); await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); await ev((n) => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; window.__native.ceilNormal = !!n; }, normal); await p.click('#bPlay'); await sleep(800); };

  // ===================== A. detection and the first landing =====================
  const TRIALS = [{ name: 'ceiling first', seed: 11, legs: ['ceil', 'ceil', 'floor', 'speakerA', 'speakerB', 'shelf', 'floor2', 'chandelier'], normal: false }, { name: 'floor first', seed: 23, legs: ['floor', 'speakerA', 'ceil', 'speakerB', 'shelf', 'ceil', 'floor2', 'chandelier'], normal: false }, { name: 'ceiling hits face down', seed: 37, legs: ['ceil', 'floor', 'ceil', 'speakerA', 'speakerB', 'shelf', 'floor2', 'chandelier'], normal: true }];
  for (let ti = 0; ti < TRIALS.length; ti++) {
    if (process.env.ONLY && +process.env.ONLY !== ti + 1) continue; const T = TRIALS[ti]; await boot(T.seed, T.normal); await setPath(T.legs, 1.0);
    const tS = await waitFor(() => __g.G.settlements.length > 0, 240000);
    const tC = await waitFor(() => __g.G.zones.some((z) => z.ceil), 120000);
    const R = await ev(() => { const S = __g.G.settlements[0], zs = __g.G.zones.map((z) => ({ id: z.id, name: z.name, ceil: !!z.ceil, y: +z.y.toFixed(2), type: z.type, area: +z.area.toFixed(2) })); const cz = __g.G.zones.find((z) => z.ceil), bd = __g.SCAN.bands.find((b) => cz && Math.abs(b.y - cz.y) < 0.05); return { s: S && { name: S.zoneName, ceil: !!S.zoneRef.ceil, flip: !!S.tf.flip, y: +S.zoneRef.y.toFixed(2) }, zs, frac: bd ? +(bd.nb / bd.nh).toFixed(2) : null, chand: __g.SCAN.zones.filter((z) => Math.abs(z.y - 0.7) < 0.1).map((z) => ({ ceil: z.ceil, name: z.name })), hasCeilType: __g.G.zones.some((z) => z.ceil && z.type === 'CEIL') }; });
    ok('[' + T.name + '] the colony settled by itself', tS > 0, JSON.stringify(R.s));
    ok('[' + T.name + '] the first landing is not on the ceiling', tS > 0 && R.s && !R.s.ceil && !R.s.flip && R.s.y < 0, 'zones ' + JSON.stringify(R.zs));
    ok('[' + T.name + '] the boards were found and marked ceil (type CEIL, mostly hit from below)', tC > 0 && R.hasCeilType && R.frac >= 0.5, 'hit-from-below fraction ' + R.frac);
    ok('[' + T.name + '] the chandelier top (hit from above, 1.9 m up) is not a ceiling', R.chand.every((z) => !z.ceil), JSON.stringify(R.chand));
    if (ti < TRIALS.length - 1) await ev(() => { __g.AR.session.end(); });
  }

  // ===================== B. the hanging base (continues in the last trial's session) =====================
  const S0 = await ev(() => { const S = __g.G.settlements[0]; S.thriving = true; S.stock.wood = 40; return S.id; });
  await ev(() => { __g.ceilTick(); });
  ok('no ceiling request while there is no cable car yet', await ev(() => !__g.G.requests.some((r) => r.def.id === 'ceiling')));
  await waitFor(() => __g.G.zones.filter((z) => !z.ceil).length >= 3, 120000);
  await ev(() => { __g.autoExpand(); });
  let nlinks = await ev(() => __g.G.links.length);
  if (!nlinks) await ev(() => { const S = __g.G.settlements[0], Zt = __g.G.zones.find((z) => !z.ceil && !z.settled && z.land && z.area > 0.04); __g.ensureDist(Zt); __g.ensureDist(S.zoneRef); __g.makeLink(S, S.zoneRef.core[0], S.zoneRef.core[1], Zt, Zt.core[0], Zt.core[1]); });
  await ev(() => { __g.simulate(40, 0.5); });
  const aE = await ev(() => ({ links: __g.G.links.map((l) => l.ready), toCeil: __g.G.settlements.some((S) => S.zoneRef.ceil), ceilZone: __g.G.zones.some((z) => z.ceil && !z.settled) }));
  ok('autoExpand made a cable car but never took the ceiling by itself', aE.links.length >= 1 && aE.links.every((x) => x) && !aE.toCeil && aE.ceilZone, JSON.stringify(aE));
  await ev(() => { __g.G.settlements[0].stock.wood = 40; __g.ceilTick(); });
  const rq = await ev(() => { const r = __g.G.requests.find((q) => q.def.id === 'ceiling'); return r && { text: r.def.text, give: r.def.give }; });
  ok('with a working cable car, somebody asks to try the ceiling', !!rq && /wants to try the ceiling/.test(rq.text), JSON.stringify(rq));
  await ev(() => { const r = __g.G.requests.find((q) => q.def.id === 'ceiling'); __g.giveRequest(r); });
  const mk = await ev(() => ({ n: __g.G.settlements.length, last: (() => { const S = __g.G.settlements.find((q) => q.zoneRef.ceil); return S && { awaiting: S.awaiting, flip: S.tf.flip }; })() }));
  ok('"Yes!" starts a cable car to the ceiling (a camp waiting up there)', !!mk.last && mk.last.flip === true, JSON.stringify(mk));
  await ev(() => { __g.simulate(240, 0.5); });
  const H = await ev(() => {
    const S = __g.G.settlements.find((q) => q.zoneRef.ceil); if (!S) return null; const V = __g.THREE, up = new V.Vector3(0, 1, 0).transformDirection(S.group.matrixWorld), zy = S.zoneRef.y;
    const hut = S.things.find((t) => t.kind === 'tent' || t.kind === 'hut'), hp = hut && hut.mesh.localToWorld(new V.Vector3(0, 0.02, 0)), col = S.cols.find((c) => !c.inside), cp = col && col.mesh.localToWorld(new V.Vector3(0, 0.02, 0)); /* a point 2 cm above each one's own ground */
    const [wx, wz] = __g.l2w(S, 0.05, 0.03), [bx, bz] = __g.w2l(S, wx, wz);
    return { awaiting: S.awaiting, cols: S.cols.length, upY: +up.y.toFixed(3), name: S.zoneName, zy, hutDy: hp ? +(hp.y - zy).toFixed(3) : null, colDy: cp ? +(cp.y - zy).toFixed(3) : null, lanterns: S.hang ? S.hang.children.length : 0, roundTrip: Math.hypot(bx - 0.05, bz - 0.03) < 1e-6, album: __g.FUN.album.some((e) => e.id === 'hang'), ceilYtf: S.tf.y === zy, links: __g.G.links.length };
  });
  ok('an upside-down camp stands on the boards with settlers', !!H && !H.awaiting && H.cols >= 1, JSON.stringify(H));
  ok('it renders hanging: the group\'s world up vector points down', !!H && H.upY < -0.99, 'up.y = ' + (H && H.upY));
  ok('huts and colonists hang BELOW the boards', !!H && H.hutDy < 0 && (H.colDy === null || H.colDy < 0), '2 cm above their own ground is ' + (H && H.hutDy) + ' m (hut) and ' + (H && H.colDy) + ' m (colonist) relative to the boards');
  ok('lanterns hang on strings (the special touch); local <-> world maths agree upside down', !!H && H.lanterns >= 5 && H.roundTrip);
  await sleep(800);
  ok('milestone "Upside-down camp" is in the album, with a celebration queued or shown', await ev(() => __g.FUN.album.some((e) => e.id === 'hang') && (__g.FUN.log.some((l) => l.k === 'celebrate' && l.x === 'hang') || __g.FUN.queue.some((q) => q.id === 'hang'))));
  /* a screenshot from below: the camera stands under the camp, looking up at it */
  await ev(() => { const S = __g.G.settlements.find((q) => q.zoneRef.ceil), q = [S.tf.x + 0.12, S.tf.y - 0.34, S.tf.z + 0.55], fx = S.tf.x - q[0], fy = S.tf.y - 0.05 - q[1], fz = S.tf.z - q[2], L = Math.hypot(fx, fy, fz); window.__cam.fixed = [q[0], q[1], q[2], Math.atan2(-fx / L, -fz / L), Math.asin(fy / L)]; window.__cam.mode = 'fixed'; document.documentElement.style.background = 'linear-gradient(#6f6a62,#4b463f)'; });
  await ev(() => { __g.simulate(60, 0.5); }); await sleep(2500); await ev(() => { __g.FUN.queue.length = 0; document.getElementById('banner').className = ''; document.getElementById('toast').innerHTML = ''; }); await sleep(400);
  await p.screenshot({ path: OUT + '39-hanging-camp.png' });

  // ===================== C. layout: messages and the toolbar at phone and at iPad-portrait sizes =====================
  const stuff = () => ev(() => {
    const S = __g.G.settlements.find((q) => !q.zoneRef.ceil); __g.G.report = { same: [{}, {}], lines: [{ text: 'A new thing appeared on the desk: the colonists named it "the blue brick" and want a hut near it.', by: 'Glip' }, { text: 'The cup moved to the shelf and the old cup land is free again for a farm or two.', by: '' }, { text: 'Three cans were squashed flat and made 9 wood of new roof tin.', by: 'Pip' }, { text: 'A gift: new land beside the speaker, as the box was taken away.', by: '' }, { text: 'Someone hung a lantern on the shelf edge.', by: '' }] };
    __g.toast('Hooray! The colonists found a lovely spot on the Floor and landed.', 8); __g.FUN.album = __g.FUN.album.filter((e) => e.id !== 'festival'); __g.celebrate('festival', S); __g.RECOG.coco.state = 'ready'; __g.RECOG.clip.on = true; __g.RECOG.clip.state = 'ready'; __g.RECOG.statKey = ''; __g.recogStatus(); __g.showReport();
  });
  const rect = (sel) => ev((sel) => { const e = document.querySelector(sel); if (!e) return null; const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return cs.display === 'none' || e.hidden || !r.width ? null : { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
  const overlap = (a, b2) => a && b2 && a.l < b2.r - 0.5 && b2.l < a.r - 0.5 && a.t < b2.b - 0.5 && b2.t < a.b - 0.5;
  const layout = async (w, h, tag, shot) => {
    await p.setViewportSize({ width: w, height: h }); await sleep(900);
    await ev(() => { __g.FUN.queue.length = 0; });
    for (const mode of ['auto', 'classic']) {
      await ev((mode) => { const auto = mode === 'auto'; __g.G.auto = auto; document.body.classList.toggle('auto', auto); __g.G.barMin = false; __g.G.tool = 'look'; __g.barUi(); }, mode); await sleep(300);
      const bar = await rect('#bar'), btns = await ev(() => [...document.querySelectorAll('#bar button')].map((x) => { const r = x.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, h: r.height, w: r.width, txt: x.textContent.trim().slice(0, 12) }; }));
      const inside = bar && bar.l >= -0.5 && bar.r <= w + 0.5 && bar.b <= h + 0.5 && btns.every((x) => x.l >= -0.5 && x.r <= w + 0.5 && x.b <= h + 0.5);
      ok('[' + tag + ' ' + mode + '] the bottom toolbar is fully on screen', inside, 'bar ' + (bar ? Math.round(bar.l) + '..' + Math.round(bar.r) + ' of ' + w : 'none') + ', ' + btns.length + ' buttons, widest right edge ' + Math.round(Math.max(...btns.map((x) => x.r))));
      ok('[' + tag + ' ' + mode + '] every toolbar button is easy to hit (at least 40 px high, 40 wide)', btns.every((x) => x.h >= 39.5 && x.w >= 39.5), 'smallest ' + Math.round(Math.min(...btns.map((x) => x.h))) + ' x ' + Math.round(Math.min(...btns.map((x) => x.w))));
    }
    await ev(() => { __g.G.auto = true; document.body.classList.add('auto'); __g.barUi(); }); await stuff(); await sleep(700);
    const R = { toast: await rect('#toast'), banner: await rect('#banner'), rep: await rect('#repc'), stat: await rect('#rstat') }, list = Object.entries(R).filter(([, v]) => v);
    let clash = []; for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (overlap(list[i][1], list[j][1])) clash.push(list[i][0] + '/' + list[j][0]);
    ok('[' + tag + '] toast, banner, report and recognition status are all showing and do not overlap', list.length === 4 && clash.length === 0, list.map(([k, v]) => k + ' ' + Math.round(v.t) + '-' + Math.round(v.b)).join(', ') + (clash.length ? ' CLASH ' + clash : ''));
    ok('[' + tag + '] the report card is compact (under 30% of the screen height)', R.rep && R.rep.h < 0.3 * h && R.rep.r <= w && R.rep.l >= 0, R.rep && Math.round(R.rep.h) + ' px of ' + h + ' = ' + Math.round(R.rep.h / h * 100) + '%');
    ok('[' + tag + '] the report has at most 2 lines and a More button', await ev(() => document.querySelectorAll('#repc .rl').length <= 2 && !!document.getElementById('repMore')));
    ok('[' + tag + '] the whole stack stays inside the screen and below the Exit-AR corner', (() => { const bt = Math.max(...list.map(([, v]) => v.b)); const lf = Math.min(...list.map(([, v]) => v.l)), rt = Math.max(...list.map(([, v]) => v.r)); return bt < h * 0.5 && lf >= 0 && rt <= w; })());
    if (shot) { await p.screenshot({ path: OUT + shot }); }
    return R;
  };
  await ev(() => { document.body.classList.add('inar'); __g.G.phase = 'play'; });
  ok('layout checks run in AR (body.inar)', await ev(() => document.body.classList.contains('inar') && __g.AR.on));
  await layout(1120, 2000, 'iPad 1120x2000', '40-ar-report-compact.png');
  /* More opens the full list; the compact card hides by itself after about 6 s */
  await ev(() => { __g.reportCompact([{ text: 'Line one is here.', by: '' }, { text: 'Line two is here.', by: '' }, { text: 'Line three is only in the full list.', by: '' }]); });
  await sleep(6700); ok('the compact report hides itself after about 6 s', await ev(() => document.getElementById('repc').hidden));
  await ev(() => { __g.reportCompact([{ text: 'Line one.', by: '' }, { text: 'Line two.', by: '' }, { text: 'Line three is only in the full list.', by: '' }]); document.getElementById('repMore').click(); });
  ok('More opens the full list (3 lines) and stops the timer', await ev(() => !document.getElementById('diary').hidden && document.querySelectorAll('#diary li').length === 3 && document.getElementById('repc').hidden)); await ev(() => { document.getElementById('dClose').click(); });
  await layout(390, 844, 'phone 390x844', '41-toolbar-narrow.png');
  await layout(1180, 820, 'iPad landscape 1180x820', null);
  await p.setViewportSize({ width: 1180, height: 820 }); await sleep(500);

  // ===================== D. save, reload; old saves =====================
  const sv = await ev(() => { __g.persist(true); const ceilZ = __g.G.zones.filter((z) => z.ceil).map((z) => z.id); return { ceilZ, map: !!localStorage.getItem('base-camp-map-v1'), save: !!localStorage.getItem('base-camp-save-v2') }; });
  ok('the map and colony are saved', sv.map && sv.save && sv.ceilZ.length >= 1, JSON.stringify(sv));
  const mapTxt = await ev(() => localStorage.getItem('base-camp-map-v1')); ok('the saved map carries "ceil":true on the boards', /"ceil":true/.test(mapTxt));
  await ev(() => { __g.AR.session.end(); }); await sleep(1500); await p.reload(); await sleep(2500);
  const L = await ev(() => { const okc = __g.prepareContinue(); const S = __g.G.settlements.find((q) => q.zoneRef.ceil), V = __g.THREE; return { okc, zones: __g.G.zones.filter((z) => z.ceil).length, flip: S && S.tf.flip, upY: S && +new V.Vector3(0, 1, 0).transformDirection(S.group.matrixWorld).y.toFixed(3), lanterns: S && S.hang ? S.hang.children.length : 0, n: __g.G.settlements.length, links: __g.G.links.length }; });
  ok('after reload the ceiling zone is still ceil and the camp hangs again', L.okc && L.zones >= 1 && L.flip === true && L.upY < -0.99 && L.lanterns >= 5, JSON.stringify(L));
  /* an OLD save (before build 12) has no ceil fields at all */
  const OLD = await ev((mapTxt) => { const d = JSON.parse(mapTxt); for (const z of d.zones) { delete z.ceil; if (z.type === 'CEIL') z.type = 'SHELF'; } d.build = 'build 11'; __g.resetWorld(); const err = __g.mapFromJSON(d); return { err, zones: __g.G.zones.length, ceil: __g.G.zones.filter((z) => z.ceil).length }; }, mapTxt);
  ok('an older map without ceil loads fine (no ceilings, no errors)', OLD.err === '' && OLD.zones >= 3 && OLD.ceil === 0, JSON.stringify(OLD));
  const FIX = await ev(() => { /* a colony that an older build put on the boards: the scan sees the boards from below and hangs it */
    const Z = __g.G.zones.find((z) => z.type === 'SHELF' && z.y > 1); if (!Z) return { err: 'no boards zone' }; const S = __g.newSettlement(Z); S.placed = true; const before = S.tf.flip;
    __g.liveReclass(Z, { ceil: true, type: 'CEIL', name: 'Ceiling – hanging', spec: 'hanging', h: 2.8, band: { nh: 400, nb: 380 } });
    return { before: !!before, after: S.tf.flip, hang: !!S.hang, up: +new __g.THREE.Vector3(0, 1, 0).transformDirection(S.group.matrixWorld).y.toFixed(2) };
  });
  ok('a colony an older build left standing on the boards is hung up once the scan sees them from below', FIX.before === false && FIX.after === true && FIX.hang && FIX.up < -0.99, JSON.stringify(FIX));

  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 5)));
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed'); await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
