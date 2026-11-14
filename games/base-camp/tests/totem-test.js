// Base Camp home totem + rooms, in AR with the REAL WebXRKit polyfill and the fake native side (ar-fake.js). Camera frames are mocked: the fake native camera picture
// (window.__video) is a synthetic textured card placed where the totem's 3D point projects.
//  U. matcher on synthetic frames: card found (flat, rotated, mild curve), strong curve reported, 24 frames without it: no false find; time per attempt
//  1. room A, first time: totem photo saved through the Menu file input (storage round trip across reload), totem found, 3D error, shrine = colony centre
//  2. return to room A (room turned and shifted): totem found, yaw-only homing: time, error vs the surface matcher
//  3. room B (different totem), "A new room" -> offer -> totem; then returns to A and B in turn start with the OTHER room selected: the totem loads the right room
//  4. no totems at all: the surface matcher across saved rooms picks the right room
// Run (about 12 minutes):  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node games/base-camp/tests/totem-test.js
const fs = require('fs'), path = require('path');
const { serve, ROOT } = require('./lib.js'); const install = require('./ar-fake.js'); const { chromium } = require('playwright');
const POLY = fs.readFileSync(path.join(ROOT, 'webxr-polyfill.js'), 'utf8'); const OUT = path.join(__dirname, '..', 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const ROOM_A = [['floor', -1.2, 0, -1.5, 1.4, 1.4], ['deskA', -0.45, -0.45, -1.2, 0.3, 0.25], ['speakerA', -0.45, 0.8, -1.0, 0.15, 0.125], ['shelf', 0.2, 0.0, -2.7, 0.7, 0.13], ['totemmark', 0.2, 0.35, -2.7, 0.004, 0.004]];
const ROOM_B = [['floor', -1.2, 0, -1.5, 1.0, 1.4], ['deskA', -0.45, 0.5, -1.3, 0.25, 0.3], ['speakerA', -0.8, -0.6, -1.0, 0.2, 0.2], ['shelf', 0.35, -0.2, -2.8, 0.5, 0.15], ['totemmark', 0.35, -0.5, -2.8, 0.004, 0.004]];
const WA = { yaw: 0.5, x: 0.5, z: -0.3 }, WB = { yaw: 0, x: 0, z: 0 };
(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, acceptDownloads: true, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { const N = Date.now.bind(Date); Date.now = () => N() + (+localStorage.getItem('bc-test-off') || 0); });
  await install(p, ROOM_A); await p.addInitScript({ content: POLY });
  // synthetic textured cards and frames (in the page)
  await p.addInitScript(() => {
    const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const shapes = (g, seed, w, h, n) => { const r = rng(seed); for (let i = 0; i < n; i++) { g.fillStyle = 'hsl(' + Math.floor(r() * 360) + ',' + (30 + r() * 70) + '%,' + (15 + r() * 70) + '%)'; const x = r() * w, y = r() * h, s = 6 + r() * w * 0.25, k = r(); if (k < 0.4) g.fillRect(x, y, s, s * (0.3 + r())); else if (k < 0.7) { g.beginPath(); g.arc(x, y, s / 2, 0, 6.3); g.fill(); } else { g.lineWidth = 2 + r() * 4; g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2); g.lineTo(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2); g.stroke(); } } };
    window.__card = (seed, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#e6dcc0'; g.fillRect(0, 0, w, h); shapes(g, seed, w, h, 70); g.strokeStyle = '#222'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4); return c; };
    // a camera frame 320 x 240: busy background (never the card), the card at (bx, by) = bottom centre, height ch px, rotated; curve > 0 wraps the card round a cylinder of that half angle
    window.__frame = (o) => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d'); g.fillStyle = '#8a8070'; g.fillRect(0, 0, 320, 240); shapes(g, o.bg || 99, 320, 240, o.bgn === undefined ? 26 : o.bgn);
      if (o.seed) { const cw = o.cw || 100, chh = o.ch || 100, card = window.__card(o.seed, 160, 160); g.save(); g.translate(o.bx, o.by); g.rotate((o.rot || 0) * Math.PI / 180); const sc = chh / 160;
        if (o.curve) { const a = o.curve * Math.PI / 180, R = cw / 2 / Math.sin(a), n = 80; for (let i = 0; i < n; i++) { const u0 = -a + 2 * a * i / n, u1 = -a + 2 * a * (i + 1) / n, x0 = R * Math.sin(u0), x1 = R * Math.sin(u1); g.drawImage(card, 160 * i / n, 0, 160 / n + 1, 160, x0, -chh, Math.max(1, x1 - x0 + 1), chh); } }
        else g.drawImage(card, -cw / 2, -chh, cw, chh); g.restore(); }
      const px = g.getImageData(0, 0, 320, 240); for (let i = 0; i < px.data.length; i += 4) { const nz = (Math.random() - 0.5) * 8; px.data[i] += nz; px.data[i + 1] += nz; px.data[i + 2] += nz; } g.putImageData(px, 0, 0); return c; };
    window.__setVideo = (o) => { window.__video = window.__frame(o).toDataURL('image/jpeg', 0.8).split(',')[1]; };
  });
  const ev = (f, a) => p.evaluate(f, a);
  const noOverlay = () => ev(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  const start = async () => { await p.goto(url); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); };
  const setRoom = (shed, W) => ev(([shed, W]) => { window.__SHED = shed; window.__W = W; }, [shed, W]);
  // a looping sweep over named surfaces
  const sweep = (legs, speed) => ev(([legs, speed]) => { const T = window.__place(), pick = (n) => T.find((t) => t.n === n);
    const look = (n, off, hgt, ay, ap, dur) => { const S = pick(n); if (!S) return null; const q = [S.cx + off[0], S.y + hgt, S.cz + off[1]], fx = S.cx - q[0], fy = S.y - q[1], fz = S.cz - q[2], L = Math.hypot(fx, fy, fz); return { p: q, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay, ap, dur }; };
    const D = { floor: [[0, 1.3], 1.6, 0.6, 0.25, 12], floor2: [[0.3, -0.4], 1.7, 0.7, 0.25, 9], deskA: [[0.1, 0.7], 0.8, 0.3, 0.15, 10], speakerA: [[0.1, 0.5], 0.55, 0.12, 0.1, 8], shelf: [[0, 0.6], 0.5, 0.18, 0.1, 10] };
    window.__cam.path = legs.map((l) => { const d = D[l], nme = l === 'floor2' ? 'floor' : l; return look(nme, d[0], d[1], d[2], d[3], d[4]); }).filter(Boolean); window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = speed; window.__cam.done = false; }, [legs, speed]);
  const keep = async () => { if (await ev(() => window.__cam.done)) await ev(() => { window.__cam.t0 = performance.now(); window.__cam.done = false; }); };
  const waitFor = async (fn, ms, every) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await keep(); if (await ev(fn)) return Date.now() - t0; await sleep(every || 600); } return -1; };
  // a fixed close-up of the totem: the camera looks at its point from 25 cm; the card (12 cm) is drawn where the point projects
  const closeUp = (seedKey, o) => ev(([seedKey, o]) => { const S = window.__place().find((t) => t.n === 'totemmark'), q = [S.cx + (o.dx || 0), S.y + 0.2, S.cz + 0.22 + (o.dz || 0)], fx = S.cx - q[0], fy = S.y + 0.04 - q[1], fz = S.cz - q[2], L = Math.hypot(fx, fy, fz);
    window.__cam.fixed = [q[0], q[1], q[2], Math.atan2(-fx / L, -fz / L), Math.asin(fy / L)]; window.__cam.mode = 'fixed'; window.__truthTotem = [S.cx, S.y, S.cz]; }, [seedKey, o]);
  const showCard = (seed, o) => ev(([seed, o]) => { const T = window.__truthTotem, v = new __g.THREE.Vector3(T[0], T[1], T[2]).applyMatrix4(__g.AR.viewInv).applyMatrix4(__g.AR.projM), bx = (v.x + 1) / 2 * 320, by = (1 - v.y) / 2 * 240;
    window.__setVideo(Object.assign({ seed, bx, by, cw: 100, ch: 100, rot: 3 }, o || {})); return [bx, by]; }, [seed, o]);
  const plain = () => ev(() => window.__setVideo({ seed: 0, bg: 5 }));
  const truthErr = () => ev(() => { const T = window.__truthTotem, L = __g.TOTEM.live; return L && T ? Math.hypot(L.x - T[0], L.z - T[2]) * 100 : null; }); // game frame == fake world frame at the start of a session
  const wt = (W, x, z) => { const c = Math.cos(W.yaw), s = Math.sin(W.yaw); return [x * c + z * s + W.x, -x * s + z * c + W.z]; };
  const errOf = (lock, W, prev) => { const cp = Math.cos(lock.phi), sp = Math.sin(lock.phi); let worst = 0; for (const [x, z] of [[0, 0], [0, -1.5], [0.8, -1.0], [-0.45, -1.2], [0, -2.7], [-0.6, -1.0]]) { const a = wt(W, x, z), sv = wt(prev, x, z), q = [sv[0] * cp - sv[1] * sp + lock.tx, sv[0] * sp + sv[1] * cp + lock.tz]; worst = Math.max(worst, Math.hypot(a[0] - q[0], a[1] - q[1])); } const dW = Math.atan2(Math.sin(W.yaw - prev.yaw), Math.cos(W.yaw - prev.yaw)), d = Math.atan2(Math.sin(lock.phi + dW), Math.cos(lock.phi + dW)); return { yawDeg: Math.abs(d) * 180 / Math.PI, posCm: worst * 100 }; };
  const pngOf = (seed) => ev((seed) => window.__card(seed, 240, 240).toDataURL('image/png').split(',')[1], seed).then((b64) => ({ name: 'totem.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }));
  const setTotemViaMenu = async (seed) => { await p.click('#bMenu'); await p.click('#mTotem'); await sleep(300); await p.setInputFiles('#tShot', await pngOf(seed)); await sleep(1200); const txt = await ev(() => document.getElementById('modal').innerText); await ev(() => { document.getElementById('modal').hidden = true; }); return txt; };
  const memNow = () => ev(() => ({ geo: __g.renderer.info.memory.geometries, tex: __g.renderer.info.memory.textures, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : 0 }));
  const endSession = async () => { await ev(() => __g.AR.session.end()); await sleep(1200); };
  const advance = (h) => ev((h) => localStorage.setItem('bc-test-off', String((+localStorage.getItem('bc-test-off') || 0) + h * 3600 * 1000)), h);

  // ===================== U. the matcher on synthetic frames =====================
  await start(); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await p.reload(); await sleep(2500);
  const U = await ev(async () => { const F = __g.FEAT, out = { runs: [], fp: 0, fpn: 0, ms: [] };
    const tpl = (seed) => { const c = window.__card(seed, 256, 256), g = F.gray(c, 256, 256, 256); return F.extract(g, 5, 200, 12); };
    const frameOf = (o) => { const c = window.__frame(o), g = F.gray(c, 320, 240, 320); return F.extract(g, 3, 300, 12); };
    const T1 = tpl(11), T2 = tpl(22); out.kps = T1.n;
    const cases = { flat: { seed: 11, bx: 160, by: 190, cw: 110, ch: 110, rot: 0 }, rotated: { seed: 11, bx: 120, by: 200, cw: 90, ch: 90, rot: 15 }, rot25: { seed: 11, bx: 120, by: 200, cw: 90, ch: 90, rot: 25 }, small: { seed: 11, bx: 220, by: 170, cw: 80, ch: 80, rot: -10 }, curve30: { seed: 11, bx: 160, by: 190, cw: 110, ch: 110, curve: 30 }, curve60: { seed: 11, bx: 160, by: 190, cw: 110, ch: 110, curve: 60 }, curve80: { seed: 11, bx: 160, by: 190, cw: 110, ch: 110, curve: 80 } };
    for (const k in cases) { const t0 = performance.now(), f = frameOf(Object.assign({ bg: 7 }, cases[k])), r = F.find(T1, f), ms = performance.now() - t0; out.runs.push({ k, found: r.found, inl: r.inl, m: r.matches, ms: Math.round(ms) }); out.ms.push(ms); }
    for (let i = 0; i < 60; i++) { const f = frameOf({ bg: 300 + i, seed: i % 3 === 0 ? 22 : 0, bx: 160, by: 190, cw: 100, ch: 100 }), r = F.find(T1, f); out.fpn++; if (r.found) out.fp++; } // other cards and plain busy frames: never the totem
    const f2 = frameOf({ seed: 22, bx: 160, by: 190, cw: 110, ch: 110, bg: 8 }); out.other = F.find(T2, f2).found; out.otherWrong = F.find(T1, f2).found; return out; });
  console.log('matcher', JSON.stringify(U.runs), 'template kps', U.kps);
  const R = (k) => U.runs.find((r) => r.k === k);
  ok('U1 flat card found (front-on)', R('flat').found, 'inliers ' + R('flat').inl + ' of ' + R('flat').m);
  ok('U2 rotated card (15 deg) found', R('rotated').found, 'inliers ' + R('rotated').inl);
  ok('U3 small card (80 px of a 320 px frame) found', R('small').found, 'inliers ' + R('small').inl);
  ok('U4 mildly curved card (30 deg half angle) found', R('curve30').found, 'inliers ' + R('curve30').inl);
  console.log('INFO 25 deg rotation found=' + R('rot25').found + ' (inl ' + R('rot25').inl + '); strongly curved card: 60 deg found=' + R('curve60').found + ' (inl ' + R('curve60').inl + '), 80 deg found=' + R('curve80').found + ' (inl ' + R('curve80').inl + ')');
  ok('U5 no false find on 60 frames without the card (other card, busy background)', U.fp === 0, U.fp + ' of ' + U.fpn);
  ok('U6 another totem is found by its own photo and not by the wrong one', U.other && !U.otherWrong);
  console.log('time per attempt (frame features + match + RANSAC): ' + Math.round(U.ms.reduce((a, c) => a + c, 0) / U.ms.length) + ' ms average, max ' + Math.round(Math.max(...U.ms)) + ' ms (sandbox CPU)');

  if (process.env.ONLY_U) { const fails0 = res.filter((r) => !r).length; await b.close(); srv.close(); process.exit(fails0 ? 1 : 0); }
  /* Build 21 repair: since build 6/7 the home totem is OFF on purpose (HOME_TOTEM = false, HANDOVER "Rooms (build 7, ON) and the totem (still OFF)"); the Menu's
     totem / guardian / rooms entries were removed and #bHomes stays hidden. The matcher above (U) is still in the file and still tested. Sections 1 to 3 used to drive
     the totem screens; they now check the same promises (room A settles and is saved, returns lock accurately, room B is told apart, the right room loads) through the
     path a player has today: the surface matcher, with the totem screens unreachable and the matcher never run. */
  // ===================== 1. room A, first time =====================
  await start(); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay();
  await setRoom(ROOM_A, WB); await ev(() => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; });
  const m0 = await memNow();
  const gate = await ev(() => { const bh = document.getElementById('bHomes'); bh.click(); return { flag: __g.HOME_TOTEM, hidden: bh.hidden, modal: document.getElementById('modal').hidden || !/totem/i.test(document.getElementById('modal').innerText) }; });
  ok('the totem screens are unreachable while HOME_TOTEM is off (button hidden, a click opens nothing)', gate.flag === false && gate.hidden && gate.modal, JSON.stringify(gate));
  await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); await setRoom(ROOM_A, WB);
  ok('no totem or guardian picture is stored by the game on its own', await ev(() => !__g.imgLoad('totem', 'r1') && !__g.imgLoad('guardian', 'r1') && !Object.keys(localStorage).some((k) => /^bc-guardian/.test(k))));
  await ev(() => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; });
  await p.click('#bPlay'); await sleep(900);
  await closeUp('a', {}); await sleep(500); await showCard(11);
  await waitFor(() => __g.AUTO.t > 12, 60000, 500);
  const tr1 = await ev(() => ({ tries: __g.TOTEM.stats.tries, sightings: __g.TOTEM.sightings, live: !!__g.TOTEM.live }));
  ok('A first time: with the totem off, the feature matcher is never run on camera frames', tr1.tries === 0 && tr1.sightings === 0, JSON.stringify(tr1));
  ok('...and no live totem position is made up', !tr1.live);
  await plain(); await sweep(['shelf', 'deskA', 'floor', 'speakerA', 'floor2', 'shelf'], 1.0);
  const tS = await waitFor(() => __g.G.settlements.length > 0, 150000, 600);
  const cz = await ev(() => { const S = __g.G.settlements[0]; return S && { zone: S.zoneName, spot: !!__g.totemSpot(), area: +S.zoneRef.area.toFixed(2) }; });
  ok('A first time: the colony settles on a scanned surface (no totem shrine)', tS > 0 && cz && !cz.spot && cz.area > 0.05, JSON.stringify(cz));
  await p.screenshot({ path: OUT + '18b-totem-colony.png' });
  ok('no guardian billboard is shown', await ev(() => !(__g.TOTEM.group && __g.TOTEM.group.visible)));
  await sweep(['shelf', 'deskA', 'floor', 'speakerA', 'floor2', 'shelf', 'deskA', 'floor'], 1.0); await waitFor(() => window.__cam.done, 200000, 2000);
  await ev(() => { __g.simulate(120, 0.5); __g.persist(true); }); await sleep(500);
  const savedA = await ev(() => ({ spot: JSON.parse(localStorage.getItem('base-camp-map-v1')).spots.filter((s) => s.src === 'totem').length, zones: __g.G.zones.length, known: __g.mapKnown() }));
  ok('room A saved with its map (and no totem place)', savedA.spot === 0 && savedA.zones >= 3, JSON.stringify(savedA));
  await endSession();

  // ===================== 2. return to A: the surface matcher =====================
  const lockTimes = [];
  for (let cyc = 0; cyc < 2; cyc++) {
    await advance(8); const prevW = cyc === 0 ? WB : WA, W = cyc === 0 ? WA : { yaw: -0.4, x: -0.3, z: 0.4 };
    await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); await setRoom(ROOM_A, W); await ev(() => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; });
    await p.click('#bPlay'); await sleep(900); const t0 = Date.now(); await plain(); await sweep(['shelf', 'deskA', 'speakerA', 'floor', 'floor2'], 1.0);
    await waitFor(() => __g.G.locked || __g.RELOC.state === 'asking', 240000, 400); const L = await ev(() => ({ st: __g.RELOC.state, lock: __g.RELOC.lock, secs: __g.RELOC.scanSecs, cur: __g.HOMES.cur }));
    ok('return ' + (cyc + 1) + ': "We’re home!" through the surface matcher (not the totem)', L.st === 'locked' && L.lock && L.lock.how !== 'totem' && L.cur === 'r1', 'how ' + (L.lock && L.lock.how) + ', lock after ' + (L.lock ? L.lock.scanSecs.toFixed(1) : '?') + ' scan s, wall ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
    if (L.lock) { lockTimes.push(L.lock.scanSecs); await waitFor(() => __g.AUTO.commitAt === 0, 90000, 800); const lk = await ev(() => __g.RELOC.lock); const e0 = errOf(L.lock, W, prevW); const e = errOf(lk, W, prevW); console.log('homing return ' + (cyc + 1) + ': first lock error yaw ' + e0.yawDeg.toFixed(2) + ' deg, ' + e0.posCm.toFixed(1) + ' cm; after refinement ' + e.yawDeg.toFixed(2) + ' deg, ' + e.posCm.toFixed(1) + ' cm'); ok('return ' + (cyc + 1) + ': accurate (yaw < 3 deg, position < 8 cm)', e.yawDeg < 3 && e.posCm < 8); }
    else ok('return ' + (cyc + 1) + ': accurate (yaw < 3 deg, position < 8 cm)', false, 'no lock');
    if (cyc === 0) await p.screenshot({ path: OUT + '18d-totem-home.png' });
    await sleep(1500); await ev(() => { document.getElementById('diary').hidden = true; __g.persist(true); }); await endSession();
  }
  console.log('homing (scan seconds): ' + lockTimes.map((s) => s.toFixed(1)).join(', '));

  // ===================== 3. room B, new room; the right room loads =====================
  await advance(3); await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); await setRoom(ROOM_B, WB); await ev(() => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; });
  await p.click('#bPlay'); await sleep(900); await closeUp('b', {}); await sleep(400); await plain(); await sweep(['shelf', 'deskA', 'speakerA', 'floor', 'floor2'], 1.0);
  const tAsk = await waitFor(() => __g.RELOC.state === 'asking', 240000, 800);
  ok('room B (never seen): no false lock, and after ~60 scan seconds the question', tAsk > 0 && !(await ev(() => __g.G.locked)), 'asked after ' + (await ev(() => __g.RELOC.scanSecs)).toFixed(1) + ' scan s');
  const falseTot = await ev(() => __g.TOTEM.stats.found); ok('no false totem find in room B', falseTot === 0, 'finds ' + falseTot);
  await p.click('#rmNew'); await sleep(1200);
  const rooms1 = await ev(() => ({ n: __g.HOMES.rooms.length, cur: __g.HOMES.cur, prev: !!localStorage.getItem('base-camp-map-v1-prev'), a: !!localStorage.getItem('base-camp-map-v1') }));
  ok('"A new room" creates a second room and keeps room A untouched', rooms1.n === 2 && rooms1.cur === 'r2' && rooms1.a && rooms1.prev, JSON.stringify(rooms1));
  const tS2 = await waitFor(() => __g.G.settlements.length > 0, 150000, 800);
  await sleep(4000);
  ok('...and does not offer a totem for the new room (the totem is off)', await ev(() => !__g.TOTEM.offer && !/Want to give it a totem/.test(document.getElementById('ask').innerText)), 'colony settled after ' + tS2 + ' ms');
  await sweep(['shelf', 'deskA', 'speakerA', 'floor', 'floor2', 'shelf'], 1.0); await waitFor(() => window.__cam.done, 200000, 2000);
  await ev(() => { __g.simulate(60, 0.5); __g.persist(true); }); await sleep(300);
  const rm = await ev(() => ({ rooms: __g.HOMES.rooms.map((r) => [r.id, r.name, r.visits, r.known]), tot: !!__g.imgLoad('totem', 'r2'), cols: __g.G.settlements.length, keys: Object.keys(localStorage).filter((k) => /^base-camp-(map|save)/.test(k) && !/-(bak|prev)$/.test(k)) }));
  ok('room B has its own map and colony', !rm.tot && rm.cols > 0 && rm.keys.length === 4, JSON.stringify(rm));
  await endSession();
  // the other room is selected on purpose: the surface matcher decides
  for (const [name, shed, W, want] of [['A', ROOM_A, { yaw: 0.3, x: 0.2, z: 0.3 }, 'r1'], ['B', ROOM_B, { yaw: -0.5, x: -0.2, z: 0.4 }, 'r2'], ['A again', ROOM_A, { yaw: -0.2, x: 0.1, z: -0.3 }, 'r1']]) {
    await advance(4); await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); await setRoom(shed, W); await ev((want) => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; __g.homeSelect(want === 'r1' ? 'r2' : 'r1'); }, want); // start with the wrong room selected
    await p.click('#bPlay'); await sleep(900); const t0 = Date.now(); await plain(); await sweep(['shelf', 'deskA', 'speakerA', 'floor', 'floor2'], 1.0);
    await waitFor(() => __g.G.locked || __g.RELOC.state === 'asking', 240000, 400); const L = await ev(() => ({ st: __g.RELOC.state, how: __g.RELOC.lock && __g.RELOC.lock.how, cur: __g.HOMES.cur, secs: __g.RELOC.lock && __g.RELOC.lock.scanSecs, cols: __g.G.settlements.reduce((a, S) => a + S.cols.length, 0) }));
    ok('start with the wrong room selected, room ' + name + ': room ' + want + ' loads and locks', L.st === 'locked' && L.cur === want && L.how !== 'totem' && L.cols >= 3, JSON.stringify(L) + ' wall ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
    await sleep(1500); await ev(() => { document.getElementById('diary').hidden = true; __g.persist(true); }); await endSession();
  }
  // ===================== 4. no totems: the surface matcher across saved rooms =====================
  await ev(() => { localStorage.removeItem('bc-totem-r1'); localStorage.removeItem('bc-totem-r2'); });
  for (const [name, shed, W, want] of [['A', ROOM_A, { yaw: 0.4, x: -0.3, z: 0.2 }, 'r1'], ['B', ROOM_B, { yaw: 0.2, x: 0.3, z: 0.1 }, 'r2']]) {
    await advance(4); await p.reload(); await sleep(2500); if (process.env.NO_OVERLAY) await noOverlay(); await setRoom(shed, W); await ev((want) => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; __g.homeSelect(want === 'r1' ? 'r2' : 'r1'); }, want);
    await p.click('#bPlay'); await sleep(900); const t0 = Date.now(); await plain(); await sweep(['floor', 'shelf', 'deskA', 'speakerA', 'floor2'], 1.0);
    const tL = await waitFor(() => __g.G.locked || __g.RELOC.state === 'asking', 240000, 500); const L = await ev(() => ({ st: __g.RELOC.state, how: __g.RELOC.lock && __g.RELOC.lock.how, cur: __g.HOMES.cur, secs: __g.RELOC.lock && __g.RELOC.lock.scanSecs, hist: __g.RELOC.hist.filter((e) => e.res).slice(-4).map((e) => [e.room, Math.round(e.res.score), e.ok]) }));
    ok('no totem, room ' + name + ' (other room selected): the surface matcher picks room ' + want, L.st === 'locked' && L.cur === want, JSON.stringify(L) + ' wall ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
    await sleep(1000); await ev(() => { document.getElementById('diary').hidden = true; __g.persist(true); }); await endSession();
  }
  const m1 = await memNow(); console.log('memory', JSON.stringify(m0), JSON.stringify(m1)); ok('memory flat (geometries / textures bounded)', m1.geo < m0.geo + 400 && m1.tex < m0.tex + 100);
  const rep = await ev(() => JSON.parse(__g.buildReport('test'))); ok('field report holds the totem section (no attempts while it is off) and the rooms', rep.totem && rep.totem.attempts.length === 0 && rep.totem.stats.tries === 0 && rep.rooms.length === 2, rep.totem.attempts.length + ' attempts, ' + (JSON.stringify(rep).length / 1024).toFixed(0) + ' KB');
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
  const fails = res.filter((r) => !r).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
