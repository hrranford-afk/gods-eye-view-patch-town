// Base Camp build 13: CEILINGS are rigging (hooks, via-hook cable cars, a sock nest); nobody lives up there. Built on the build 12 ceiling detection, in AR with the REAL WebXRKit polyfill and a fake native side (ar-fake.js). The fake shed has a ceiling plane
// ('ceilBoards', 1.6 m above the start, only rays that look UP hit it) and a chandelier top that is hit from ABOVE (it must not be taken for a ceiling).
//  A. three trials with different seeds and sweep orders (ceiling first, floor first, a down-facing ceiling normal): the ceiling is found as `ceil`, the first landing is never on it
//  B. ceiling hooks: no camp on a ceiling (autoExpand, settleZone, the Cable car tool all refuse it); "<name> wants to hang a hook up there!" only after a cable car works; "Yes!" sends a tea-bag balloon,
//     the hook appears under the ceiling above the camps; a via-hook cable car carries goods about 30% faster than a straight one; the Cable car tool's "via the ceiling hook" switch; the sock lookout nest;
//     milestone "First ceiling hook"; screenshots 42 and 43
//  C. layout at 390 x 844 and 1120 x 2000 (portrait, body.inar): toolbar fully on screen (both toolbars), compact report under 30% of the height, toast / banner / report / status do not overlap
//  D. save and reload keep `ceil`, the hook, the nest and the via-hook line; an old map without `ceil` loads; a build 12 save with a hanging camp comes down safely (settlers to the nearest camp, a kind toast,
//     the camp's buildings and cable car removed, a hook left behind, nothing upside down); a colony on boards that the scan then sees as a ceiling comes down too (or stays if it is alone)
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
  const boot = async (seed, normal) => { await p.goto(url); await sleep(1500); await ev((seed) => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); localStorage.setItem('bc-seed', String(seed)); }, seed); await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); await ev((n) => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; window.__native.ceilNormal = !!n; }, normal); await p.click('#bPlay'); await p.evaluate(() => { const c = document.getElementById('chooser'); if (c && !c.hidden) document.getElementById('chFind').click(); }); /* build 26: the start chooser; Find keeps the old Play */ await sleep(800); };

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

  // ===================== B. ceiling hooks (continues in the last trial's session) =====================
  const S0 = await ev(() => { const S = __g.G.settlements[0]; S.thriving = true; S.stock.wood = 60; return S.id; });
  await ev(() => { __g.ceilTick(); });
  ok('no ceiling request while there is no cable car yet', await ev(() => !__g.G.requests.some((r) => r.def.id === 'ceiling')));
  await waitFor(() => __g.G.zones.filter((z) => !z.ceil).length >= 3, 120000);
  await ev(() => { __g.autoExpand(); });
  let nlinks = await ev(() => __g.G.links.length);
  if (!nlinks) await ev(() => { const S = __g.G.settlements[0], Zt = __g.G.zones.find((z) => !z.ceil && !z.settled && z.land && z.area > 0.04); __g.ensureDist(Zt); __g.ensureDist(S.zoneRef); __g.makeLink(S, S.zoneRef.core[0], S.zoneRef.core[1], Zt, Zt.core[0], Zt.core[1]); });
  await ev(() => { __g.simulate(40, 0.5); });
  const aE = await ev(() => ({ links: __g.G.links.map((l) => l.ready), toCeil: __g.G.settlements.some((S) => S.zoneRef.ceil), ceilZone: __g.G.zones.some((z) => z.ceil && !z.settled), flip: __g.G.settlements.some((S) => S.tf.flip) }));
  ok('no camp on a ceiling: autoExpand made a cable car but never took the ceiling, nothing is upside down', aE.links.length >= 1 && aE.links.every((x) => x) && !aE.toCeil && aE.ceilZone && !aE.flip, JSON.stringify(aE));
  ok('a camp cannot be founded on the ceiling by hand either (settleZone just says no)', await ev(() => { const z = __g.G.zones.find((q) => q.ceil), n = __g.G.settlements.length; __g.settleZone(z); return __g.G.settlements.length === n && !z.settled; }));
  ok('the Cable car tool refuses a ceiling end ("hooks and lanterns, not houses")', await ev(() => { const S = __g.G.settlements[0], z = __g.G.zones.find((q) => q.ceil); return /hooks and lanterns/.test(__g.canLink(S, S.tf.x, S.tf.z, z, z.cx, z.cz)); }));
  await ev(() => { __g.G.settlements[0].stock.wood = 60; __g.ceilTick(); });
  const rq = await ev(() => { const r = __g.G.requests.find((q) => q.def.id === 'ceiling'); return r && { text: r.def.text, give: r.def.give, key: r.def.key }; });
  ok('with a working cable car, somebody asks "<name> wants to hang a hook up there!"', !!rq && /^\S.* wants to hang a hook up there!$/.test(rq.text) && rq.key === 'hook', JSON.stringify(rq));
  ok('the old "wants to try the ceiling" camp offer is gone (nothing else is on offer yet)', await ev(() => !__g.G.requests.some((r) => /try the ceiling/.test(r.def.text)) && __g.G.requests.filter((r) => r.def.id === 'ceiling').length === 1));
  await ev(() => { const r = __g.G.requests.find((q) => q.def.id === 'ceiling'); __g.giveRequest(r); });
  const hk0 = await ev(() => ({ n: __g.G.hooks.length, built: __g.G.hooks[0] && __g.G.hooks[0].built, reqLeft: __g.G.requests.some((r) => r.def.id === 'ceiling'), camps: __g.G.settlements.length }));
  ok('"Yes!" sends up a tea-bag balloon (hook not hung yet) and the request is answered', hk0.n === 1 && hk0.built === false && !hk0.reqLeft, JSON.stringify(hk0));
  await sleep(1200);
  await ev(() => { __g.simulate(12, 0.5); });
  const HK = await ev(() => {
    const h = __g.G.hooks[0], Z = __g.zoneById(h.zid), P = __g.hookPos(h, new __g.THREE.Vector3()), camps = __g.G.settlements.filter((q) => q.placed);
    const cx = camps.reduce((a, q) => a + q.tf.x, 0) / camps.length, cz = camps.reduce((a, q) => a + q.tf.z, 0) / camps.length, mx = Math.max(...camps.map((q) => q.tf.y));
    return { built: h.built, ceil: !!Z.ceil, dy: +(Z.y - P.y).toFixed(3), above: +(P.y - mx).toFixed(2), off: +Math.hypot(P.x - cx, P.z - cz).toFixed(2), grp: !!h.group && h.group.visible };
  });
  ok('the hook is placed under the ceiling, above the room\'s camps', HK.built && HK.ceil && HK.dy > 0.05 && HK.dy < 0.4 && HK.above > 0.5 && HK.off < 1.0, JSON.stringify(HK));
  await sleep(1500);
  ok('the hook has a mesh (plate, rope, pulley wheel, bell, 3 lanterns) that hangs from the ceiling zone', await ev(() => { const g = __g.G.hooks[0].group; return !!g && g.visible && g.userData.lans.length === 3 && !!g.userData.wheel && !!g.userData.bell; }));
  ok('milestone "First ceiling hook" is in the album, ', await ev(() => { const e = __g.FUN.album.find((q) => q.id === 'hook'); return !!e && !__g.FUN.album.some((q) => q.id === 'hang'); }));

  /* a cable car via the hook: same two camps, goods (a colonist) ride it, and it is quicker than a straight line */
  const V = await ev(() => {
    const G = __g.G, Sa = G.settlements.find((q) => q.placed && !q.zoneRef.ceil), Sb = G.settlements.find((q) => q.placed && q !== Sa && !q.zoneRef.ceil); if (!Sb) return { err: 'one camp only' };
    Sa.stock.wood = 60; __g.ensureDist(Sb.zoneRef); __g.ensureDist(Sa.zoneRef); const hid = __g.hookFor(Sa, Sb.zoneRef.core[0], Sb.zoneRef.core[1]);
    const l = __g.makeLink(Sa, Sa.zoneRef.core[0], Sa.zoneRef.core[1], Sb.zoneRef, Sb.zoneRef.core[0], Sb.zoneRef.core[1], hid); if (!l) return { err: 'no link', hid };
    __g.simulate(30, 0.5); return { id: l.id, via: l.via, hid, ready: l.ready, tool: null };
  });
  ok('a via-hook cable car is built between two camps on different surfaces and gets ready', !!V && !V.err && V.via === V.hid && V.hid > 0 && V.ready, JSON.stringify(V));
  const TR = await ev((vid) => {
    const G = __g.G, l = G.links.find((q) => q.id === vid), [A, B, Sa, Sb] = __g.linkEnds(l), run = (via) => {
      l.via = via; const c = __g.addColonist(Sa, { x: 0, z: 0.03 }); Sa.cols.splice(Sa.cols.indexOf(c), 1); c.riding = l; c.job = null; l.cab.add(c.mesh); l.g.riders = [c]; Object.assign(l.g, { s: 0, dir: 1, state: 'run', end: 'a', timer: 9 });
      let t = 0, ding = 0; const h = G.hooks.find((q) => q.id === vid2), d0 = h.passes | 0; while (l.g.state === 'run' && t < 2000) { __g.linkStep(l, 0.05, __g.ENV, true); t += 0.05; } return { t: +t.toFixed(1), arrived: Sb.cols.includes(c), pass: (h.passes | 0) - d0, c };
    };
    const vid2 = l.via, hv = run(vid2), dr = run(0); l.via = vid2; const hid = vid2;
    const hh = G.hooks.find((q) => q.id === hid), H = __g.hookPos(hh, new __g.THREE.Vector3());
    return { tHook: hv.t, tDirect: dr.t, ratio: +(hv.t / dr.t).toFixed(2), arrivedHook: hv.arrived, arrivedDirect: dr.arrived, passes: hv.pass, hy: +H.y.toFixed(2), ay: +A.y.toFixed(2), by: +B.y.toFixed(2) };
  }, V.id);
  ok('goods carried on the hooked line arrive, and the trip takes about 30% less time than the straight one', TR.arrivedHook && TR.arrivedDirect && TR.ratio > 0.62 && TR.ratio < 0.78, JSON.stringify(TR));
  ok('the hooked line goes up to the hook and the bell dings once per trip (a V: the hook is far above both stations)', TR.passes === 1 && TR.hy > TR.ay + 0.4 && TR.hy > TR.by + 0.4, JSON.stringify(TR));
  /* the swoop: nose down on the downhill leg */
  const SW = await ev((vid) => {
    const G = __g.G, l = G.links.find((q) => q.id === vid), [A, B] = __g.linkEnds(l), h = G.hooks.find((q) => q.id === l.via), H = __g.hookPos(h, new __g.THREE.Vector3()), hh = A.distanceTo(H) / (A.distanceTo(H) + H.distanceTo(B));
    l.g.state = 'run'; l.g.dir = 1; l.g.s = hh + (1 - hh) * 0.5; l.g.timer = 9; return { hh: +hh.toFixed(2) };
  }, V.id);
  await sleep(500);
  const tilt = await ev((vid) => { const l = __g.G.links.find((q) => q.id === vid); return { z: +l.cab.rotation.z.toFixed(2), s: +l.g.s.toFixed(2) }; }, V.id);
  ok('mid-swoop the cabin tilts with the line', Math.abs(tilt.z) > 0.15, JSON.stringify(tilt));
  ok('a camp linked through a hook counts as linked (ceilOK, the link is in G.links with via)', await ev(() => __g.ceilOK() && __g.G.links.some((l) => l.via && l.ready)));
  const AUTO = await ev(() => { const G = __g.G, Sa = G.settlements.find((q) => q.placed && !q.zoneRef.ceil); return { hook: __g.hookFor(Sa, Sa.tf.x + 0.3, Sa.tf.z + 0.3) }; });
  ok('the cheap automatic cable car prefers a hook when one is up (hookFor picks it)', AUTO.hook > 0, JSON.stringify(AUTO));
  /* the Cable car tool offers "via the ceiling hook" */
  await ev(() => { __g.setTool('cable'); }); await sleep(300);
  const bv = await ev(() => { const b = document.getElementById('bVia'); return b && { label: b.getAttribute('aria-label'), on: b.classList.contains('on') }; });
  ok('the Cable car tool shows a "via the ceiling hook" switch, on by default', !!bv && bv.label === 'via the ceiling hook' && bv.on, JSON.stringify(bv));
  await ev(() => { document.getElementById('bVia').click(); }); await sleep(200);
  ok('the switch can be turned off (cable cars go straight) and on again', await ev(() => { const off = __g.G.cableVia === false && !document.getElementById('bVia').classList.contains('on'); document.getElementById('bVia').click(); return off && __g.G.cableVia !== false; }));
  await ev(() => { __g.setTool('look'); });

  /* the sock lookout nest */
  await ev(() => { __g.G.ceilCd = 0; __g.ceilTick(); });
  const rq2 = await ev(() => { const r = __g.G.requests.find((q) => q.def.id === 'ceiling'); return r && { text: r.def.text, key: r.def.key }; });
  ok('next somebody asks to hang a sock nest from the hook', !!rq2 && /sock nest/.test(rq2.text) && rq2.key === 'nest', JSON.stringify(rq2));
  const fx0 = await ev(() => __g.G.settlements.map((q) => __g.fxOf(q).lookout | 0).reduce((a, b2) => a + b2, 0));
  await ev(() => { __g.giveRequest(__g.G.requests.find((q) => q.def.id === 'ceiling')); }); await sleep(1500);
  const NS = await ev(() => { const h = __g.G.hooks[0], C = __g.G.settlements.find((q) => q.id === h.sid); return { nest: h.nest, mesh: !!(h.group && h.group.userData.nest), lookout: C ? __g.fxOf(C).lookout | 0 : -1, total: __g.G.settlements.map((q) => __g.fxOf(q).lookout | 0).reduce((a, b2) => a + b2, 0) }; });
  ok('the sock nest hangs from the hook and acts as a lookout for the camp below', NS.nest && NS.mesh && NS.lookout >= 1 && NS.total === fx0 + 1, JSON.stringify(NS) + ' before ' + fx0);
  await ev(() => { __g.G.ceilCd = 0; __g.ceilTick(); });
  ok('nothing more is offered (one hook, one nest)', await ev(() => !__g.G.requests.some((r) => r.def.id === 'ceiling')));
  ok('CEIL_THINGS is a table: hook and nest, each with text, icon, when, zone and make', await ev(() => Object.keys(__g.CEIL_THINGS).join() === 'hook,nest' && Object.values(__g.CEIL_THINGS).every((t) => typeof t.text === 'function' && t.icon && typeof t.when === 'function' && typeof t.zone === 'function' && typeof t.make === 'function')));

  /* screenshot 42: a hook, a V-shaped line and a cabin mid-swoop; 43: the same from below, close to the hook */
  const SH = async (name, mode) => {
    const put = () => ev((mode) => {
      const G = __g.G, l = G.links.find((q) => q.via), [A, B] = __g.linkEnds(l), h = G.hooks.find((q) => q.id === l.via), H = __g.hookPos(h, new __g.THREE.Vector3());
      const hh = A.distanceTo(H) / (A.distanceTo(H) + H.distanceTo(B)); l.g.state = 'run'; l.g.dir = 1; l.g.timer = 9; l.g.s = hh + (1 - hh) * (mode === 'below' ? 0.1 : 0.14);
      const ab = Math.atan2(B.z - A.z, B.x - A.x), side = ab + Math.PI / 2, d = mode === 'below' ? 1.7 : 2.7, q = mode === 'below' ? [H.x + Math.cos(side) * d * 0.45 + Math.cos(ab) * 0.25, H.y - 1.05, H.z + Math.sin(side) * d * 0.45 + Math.sin(ab) * 0.25] : [H.x + Math.cos(side) * d, H.y - 0.55, H.z + Math.sin(side) * d];
      const tx = H.x, ty = H.y - (mode === 'below' ? 0.1 : 0.62), tz = H.z, fx = tx - q[0], fy = ty - q[1], fz = tz - q[2], L = Math.hypot(fx, fy, fz); window.__cam.fixed = [q[0], q[1], q[2], Math.atan2(-fx / L, -fz / L), Math.asin(fy / L)]; window.__cam.mode = 'fixed'; document.documentElement.style.background = 'linear-gradient(#6f6a62,#4b463f)';
    }, mode);
    await put(); await ev(() => { __g.FUN.queue.length = 0; const m = document.getElementById('msgs'); if (m) m.style.display = 'none'; const hn = document.getElementById('hint'); if (hn) hn.hidden = true; }); await sleep(500); await put(); await sleep(100); await p.screenshot({ path: OUT + name });
    await ev(() => { const m = document.getElementById('msgs'); if (m) m.style.display = ''; });
  };
  await SH('42-ceiling-hook.png', 'side'); await SH('43-ceiling-hook-below.png', 'below');

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
  const sv = await ev(() => { __g.persist(true); const ceilZ = __g.G.zones.filter((z) => z.ceil).map((z) => z.id); return { ceilZ, map: !!localStorage.getItem('base-camp-map-v1'), save: !!localStorage.getItem('base-camp-save-v2'), hooks: __g.G.hooks.length, via: __g.G.links.filter((l) => l.via).length }; });
  ok('the map and colony are saved (with the hook and the via-hook line)', sv.map && sv.save && sv.ceilZ.length >= 1 && sv.hooks === 1 && sv.via === 1, JSON.stringify(sv));
  const mapTxt = await ev(() => localStorage.getItem('base-camp-map-v1')); ok('the saved map carries "ceil":true on the boards', /"ceil":true/.test(mapTxt));
  const saveTxt = await ev(() => localStorage.getItem('base-camp-save-v2'));
  await ev(() => { __g.AR.session.end(); }); await sleep(1500); await p.reload(); await sleep(2500);
  const L = await ev(() => { const okc = __g.prepareContinue(); const h = __g.G.hooks[0]; return { okc, zones: __g.G.zones.filter((z) => z.ceil).length, hooks: __g.G.hooks.length, built: h && h.built, nest: h && h.nest, sid: h && h.sid, onCeil: __g.G.settlements.filter((q) => q.zoneRef.ceil || q.tf.flip).length, via: __g.G.links.filter((l) => l.via === (h && h.id)).length, links: __g.G.links.length, n: __g.G.settlements.length }; });
  ok('after reload the ceiling is still ceil, the hook, its sock nest and the via-hook line are back, no camp on the ceiling', L.okc && L.zones >= 1 && L.hooks === 1 && L.built && L.nest && L.sid > 0 && L.onCeil === 0 && L.via === 1, JSON.stringify(L));
  /* an OLD save (before build 12) has no ceil fields at all */
  const OLD = await ev((mapTxt) => { const d = JSON.parse(mapTxt); for (const z of d.zones) { delete z.ceil; if (z.type === 'CEIL') z.type = 'SHELF'; } d.build = 'build 11'; __g.resetWorld(); const err = __g.mapFromJSON(d); return { err, zones: __g.G.zones.length, ceil: __g.G.zones.filter((z) => z.ceil).length }; }, mapTxt);
  ok('an older map without ceil loads fine (no ceilings, no errors)', OLD.err === '' && OLD.zones >= 3 && OLD.ceil === 0, JSON.stringify(OLD));
  /* a BUILD 12 save with a hanging camp: its settlers come down by cable car to the nearest camp, the huts go, a hook stays, nothing is upside down */
  const OLD12 = await ev(([mapTxt, saveTxt]) => {
    __g.resetWorld(); __g.mapFromJSON(JSON.parse(mapTxt)); const d = JSON.parse(saveTxt); const Z = __g.G.zones.find((z) => z.ceil); if (!Z) return { err: 'no ceiling zone' };
    d.hooks = []; d.links = d.links.filter((l) => !l.via); const homeIds = d.settlements.map((q) => q.id); const baseCols = d.settlements.reduce((a, q) => a + q.cols.length, 0);
    const hang = JSON.parse(JSON.stringify(d.settlements[0])); hang.id = 9001; hang.zid = Z.id; hang.o = [0, 0]; hang.awaiting = false; hang.lost = false; hang.things = hang.things.filter((t) => t.kind !== 'station').map((t, i) => Object.assign(t, { id: 9100 + i })); hang.cols = d.settlements.flatMap((q) => q.cols).slice(0, 3).map((c, i) => Object.assign(JSON.parse(JSON.stringify(c)), { id: 9200 + i }));
    const hut = JSON.parse(JSON.stringify(hang.things.find((t) => t.kind === 'tent') || hang.things[0])); hut.id = 9150; hut.kind = 'hut'; hut.x = 0.06; hut.z = 0.02; hut.built = true; hut.prog = 1; hang.things.push(hut);
    hang.things.push({ id: 9160, kind: 'station', x: 0.1, z: 0.1, built: true, prog: 1, link: 9300, end: 'b' });
    const home = d.settlements[0]; const st = (home.things.find((t) => t.kind === 'station') || { id: 7777 }); d.links.push({ id: 9300, how: 'cable car', a: { sid: home.id, tid: st.id }, b: { sid: 9001, tid: 9160 }, prog: 1, ready: true });
    d.settlements.push(hang); localStorage.setItem('base-camp-save-v2', JSON.stringify(d)); return { homeIds, baseCols, hangCols: hang.cols.length, ceilZ: Z.id };
  }, [mapTxt, saveTxt]);
  ok('an old save with a hanging camp is built for the test', !OLD12.err && OLD12.hangCols === 3, JSON.stringify(OLD12));
  await ev(() => { document.getElementById('toast').innerHTML = ''; __g.resetWorld(); });
  const CAME = await ev(() => {
    let err = ''; try { const okc = __g.prepareContinue(); if (!okc) err = 'prepareContinue false'; } catch (e) { err = String(e && e.stack || e).slice(0, 300); }
    const G = __g.G, cols = G.settlements.reduce((a, q) => a + q.cols.length, 0) + G.links.reduce((a, l) => a + l.g.riders.length, 0), Z = G.zones.find((z) => z.ceil);
    return { err, n: G.settlements.length, onCeil: G.settlements.filter((q) => q.zoneRef.ceil).length, flip: G.settlements.filter((q) => q.tf.flip || Math.abs(q.group.rotation.x) > 0.01).length, cols, hook: !!(Z && G.hooks.some((h) => h.zid === Z.id && h.built)), badLink: G.links.filter((l) => l.a.sid === 9001 || l.b.sid === 9001).length, hut: G.settlements.some((q) => q.id === 9001), toast: document.getElementById('toast').innerText };
  });
  ok('the old hanging camp loads without errors: settlers come down to the nearest camp (none lost), the camp is gone, its cable car is gone, a hook is left in its place', CAME.err === '' && CAME.onCeil === 0 && CAME.flip === 0 && !CAME.hut && CAME.badLink === 0 && CAME.hook && CAME.cols === OLD12.baseCols + 3, JSON.stringify(CAME) + ' base ' + OLD12.baseCols);
  ok('a kind toast says so: "The ceiling crew came down for tea"', /ceiling crew came down for tea/.test(CAME.toast), CAME.toast);
  /* the scan finally recognises boards that an older build colonised (liveReclass): with a second camp they come down, with only one camp they stay put */
  const FIX = await ev(() => {
    const G = __g.G; __g.resetWorld(); const d = JSON.parse(localStorage.getItem('base-camp-map-v1')); for (const z of d.zones) { delete z.ceil; if (z.type === 'CEIL') z.type = 'SHELF'; } __g.mapFromJSON(d);
    const Z = G.zones.find((z) => z.type === 'SHELF' && z.y > 1), F = Z && G.zones.find((z) => z !== Z && z.land && z.y < Z.y - 1); if (!Z || !F) return { err: 'no zones' };
    const fz = { ceil: true, type: 'CEIL', name: 'Ceiling – hanging', spec: 'hanging', h: 2.8, band: { nh: 400, nb: 380 } };
    const S = __g.newSettlement(Z); S.placed = true; __g.addColonist(S, { x: 0, z: 0.03 }); __g.liveReclass(Z, fz); const alone = { still: Z.settled === S, ceil: !!Z.ceil, flip: S.tf.flip };
    const H = __g.newSettlement(F); H.placed = true; const n0 = H.cols.length; __g.liveReclass(Z, fz);
    return { alone, gone: !Z.settled && !G.settlements.includes(S), ceil: !!Z.ceil, moved: H.cols.length - n0, hook: G.hooks.length, flip: G.settlements.filter((q) => q.tf.flip).length };
  });
  ok('a colony on boards that the scan then sees as a ceiling stays if it is alone, and comes down (leaving a hook) if there is another camp', !FIX.err && FIX.alone.still && !FIX.alone.ceil && !FIX.alone.flip && FIX.gone && FIX.ceil && FIX.moved === 1 && FIX.hook === 1 && FIX.flip === 0, JSON.stringify(FIX));

  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 5)));
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed'); await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error('TEST CRASH', e); process.exit(2); });
