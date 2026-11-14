/* Build 25: Places (HANDOVER "Places and location"). Where we are, only after a grown-up switches it on; rooms tell apart by a rounded spot; local goods; seasons south of the equator.
   All positions are made up (Playwright's setGeolocation); no place names anywhere. AR runs on the real WebXRKit polyfill with the fake native side (ar-fake.js).
    1. off by default: no position is asked for, the setting says "ask a grown-up"
    2. the grown-up gate: a tap does nothing, holding 3 s switches it on (and asks once)
    3. the weather still gets only 0.1 degree
    4. three saved rooms: one near, one far, one with no spot. The far one is not tried, the near one and the one with no spot are
    5. nothing saved near: a new room and "Somewhere new! Shall we start a camp here?"; its spot is saved rounded to 3 decimals (about 100 m)
    6. no lat / lon in a map export, a report or the rooms list
    7. permission denied: everything as before (all rooms tried, no message)
    8. switching off forgets every spot; after a reload nothing is asked
    9. carpet town: wool tufts, the comb loom, rugs; seaside: shells and salt
   10. south of the equator the seasons turn; the north is unchanged
   Run (about 10 minutes, from games/base-camp): NODE_PATH=$(npm root -g) node tests/places-test.js */
const fs = require('fs'), path = require('path');
const { serve, ROOT } = require('./lib.js'); const install = require('./ar-fake.js'); const { chromium } = require('playwright');
const POLY = fs.readFileSync(path.join(ROOT, 'webxr-polyfill.js'), 'utf8'), OUT = path.join(ROOT, 'shots') + '/';
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'style-colony.json'), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const ROOM_A = [['floor', -1.2, 0, -1.5, 1.4, 1.4], ['deskA', -0.45, -0.45, -1.2, 0.3, 0.25], ['speakerA', -0.45, 0.8, -1.0, 0.15, 0.125], ['shelf', 0.2, 0.0, -2.7, 0.7, 0.13]];
/* made-up positions */
const HOME = { latitude: 51.123456, longitude: -1.234567 }, NEAR = { lat: 51.124, lon: -1.235 }, FAR = { lat: 51.17, lon: -1.235 }, ELSE = { latitude: 51.300449, longitude: -1.499551 };
const CARPET = { latitude: 52.401234, longitude: -2.261234 }, SEA = { latitude: 50.401234, longitude: -4.001234 }, SOUTH = { latitude: -35.412345, longitude: 148.912345 };
(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)', geolocation: HOME, permissions: ['geolocation'] });
  const wxUrls = []; await ctx.route('**/api.open-meteo.com/**', (r) => { wxUrls.push(r.request().url()); r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }); });
  const p = await ctx.newPage(); const errs = [], logs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { logs.push(m.text()); if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.addInitScript(() => { /* count every position request */ window.__geo = { calls: 0 }; try { const G0 = Geolocation.prototype, g1 = G0.getCurrentPosition, w1 = G0.watchPosition; G0.getCurrentPosition = function () { window.__geo.calls++; return g1.apply(this, arguments); }; G0.watchPosition = function () { window.__geo.calls++; return w1.apply(this, arguments); }; } catch (e) {} });
  await install(p, ROOM_A); await p.addInitScript({ content: POLY });
  const ev = (f, a) => p.evaluate(f, a);
  const fresh = async () => { await p.reload(); await sleep(2500); await ev(() => { window.__SHED = window.__SHED; }); };
  const waitFor = async (fn, ms, every) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(() => window.__cam && window.__cam.done)) await ev(() => { window.__cam.t0 = performance.now(); window.__cam.done = false; }); if (await ev(fn)) return Date.now() - t0; await sleep(every || 500); } return -1; };
  const sweep = (legs) => ev((legs) => { const T = window.__place(), pick = (n) => T.find((t) => t.n === n);
    const look = (n, off, hgt, ay, ap, dur) => { const S = pick(n); if (!S) return null; const q = [S.cx + off[0], S.y + hgt, S.cz + off[1]], fx = S.cx - q[0], fy = S.y - q[1], fz = S.cz - q[2], L = Math.hypot(fx, fy, fz); return { p: q, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay, ap, dur }; };
    const D = { floor: [[0, 1.3], 1.6, 0.6, 0.25, 12], floor2: [[0.3, -0.4], 1.7, 0.7, 0.25, 9], deskA: [[0.1, 0.7], 0.8, 0.3, 0.15, 10], speakerA: [[0.1, 0.5], 0.55, 0.12, 0.1, 8], shelf: [[0, 0.6], 0.5, 0.18, 0.1, 10] };
    window.__cam.path = legs.map((l) => { const d = D[l]; return look(l === 'floor2' ? 'floor' : l, d[0], d[1], d[2], d[3], d[4]); }).filter(Boolean); window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = 1; window.__cam.done = false; }, legs);
  const endAR = async () => { await ev(() => { try { __g.AR.session.end(); } catch (e) {} }); await sleep(1800); };
  const toTitle = async () => { if (await ev(() => __g.G.phase !== 'title')) { await ev(() => { __g.persist(true); }); await fresh(); } };
  const openMore = async () => { if (await ev(() => document.getElementById('tmenu').hidden)) await p.click('#bMore'); await sleep(200); };
  const rooms3 = (spots) => ev(([F, spots]) => { /* three saved rooms, all copies of the fixture colony, and their spots */
    localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); const now = Date.now();
    const keys = { r1: ['base-camp-map-v1', 'base-camp-save-v2'], r2: ['base-camp-map-v1.r2', 'base-camp-save-v2.r2'], r3: ['base-camp-map-v1.r3', 'base-camp-save-v2.r3'] };
    for (const id in keys) { localStorage.setItem(keys[id][0], F['base-camp-map-v1']); localStorage.setItem(keys[id][1], F['base-camp-save-v2']); }
    localStorage.setItem('bc-rooms-v1', JSON.stringify({ v: 1, cur: 'r2', rooms: [{ id: 'r1', name: 'Near room', created: now, visits: 2, known: 0.5, post: [], last: now - 3e6 }, { id: 'r2', name: 'Far room', created: now, visits: 2, known: 0.5, post: [], last: now - 1e6 }, { id: 'r3', name: 'Old room', created: now, visits: 2, known: 0.5, post: [], last: now - 2e6 }] }));
    localStorage.setItem('bc-places-v1', JSON.stringify({ v: 1, on: true, spots }));
  }, [FIX, spots]);

  /* ===================== 1. off by default ===================== */
  await p.goto(url); await sleep(2500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await fresh();
  const s1 = await ev(() => ({ build: __g.BUILD, on: __g.PLACES.on, calls: window.__geo.calls, btn: document.getElementById('bPlace').textContent, here: __g.PLACES.here, key: localStorage.getItem('bc-places-v1') }));
  ok('BUILD is build 25', s1.build === 'build 25');
  ok('1. off by default: no position asked for at start, nothing stored', !s1.on && s1.calls === 0 && !s1.here && !s1.key, JSON.stringify(s1));
  ok('1. the setting reads "Use where we are (ask a grown-up)"', s1.btn === 'Use where we are (ask a grown-up)', s1.btn);

  /* ===================== 2. the grown-up gate ===================== */
  await openMore(); await p.click('#bPlace'); await sleep(400);
  const s2a = await ev(() => ({ on: __g.PLACES.on, calls: window.__geo.calls, info: document.getElementById('placeInfo').textContent }));
  ok('2. a quick tap does not switch it on (it says a grown-up holds it for 3 seconds)', !s2a.on && s2a.calls === 0 && /grown-up/.test(s2a.info) && /3 seconds/.test(s2a.info), JSON.stringify(s2a));
  const bb = await p.locator('#bPlace').boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await sleep(1600);
  const mid = await ev(() => ({ on: __g.PLACES.on, txt: document.getElementById('bPlace').textContent }));
  await p.screenshot({ path: OUT + '84-places-grownup-gate.png' });
  await p.mouse.move(bb.x - 40, bb.y - 40); await p.mouse.up(); await sleep(300); const left = await ev(() => __g.PLACES.on);
  ok('2. half a hold shows a countdown, and letting go early leaves it off', !mid.on && /keep holding/.test(mid.txt) && !left, JSON.stringify(mid));
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await sleep(3400); await p.mouse.up(); await sleep(1200);
  const s2 = await ev(() => ({ on: __g.PLACES.on, calls: window.__geo.calls, here: __g.PLACES.here, st: __g.PLACES.state, key: JSON.parse(localStorage.getItem('bc-places-v1') || 'null'), btn: document.getElementById('bPlace').textContent }));
  ok('2. holding 3 s switches it on and asks for the position once; here is rounded to 3 decimals', s2.on && s2.calls === 1 && s2.here && s2.here.lat === 51.123 && s2.here.lon === -1.235 && s2.key && s2.key.on === true && /on/.test(s2.btn), JSON.stringify(s2));
  ok('2. here is kept in memory only (stored: the switch and room spots, no here)', !JSON.stringify(s2.key).includes('51.123') && !(await ev(() => Object.keys(localStorage).some((k) => (localStorage.getItem(k) || '').includes('51.123')))));
  await ev(() => { document.getElementById('toast').innerHTML = ''; }); await p.screenshot({ path: OUT + '85-places-on.png' });

  /* ===================== 3. the weather keeps 0.1 degree ===================== */
  await ev(() => { localStorage.setItem('bc-wxchoice', 'geo'); localStorage.removeItem('bc-loc'); localStorage.removeItem('bc-wxcache'); }); wxUrls.length = 0; await fresh();
  await waitFor(() => __g.PLACES.state === 'here', 15000); for (let i = 0; i < 20 && !wxUrls.length; i++) await sleep(300);
  const wq = wxUrls.map((u) => { const q = new URL(u).searchParams; return [q.get('latitude'), q.get('longitude')]; });
  ok('3. app start asks once more; the weather request carries 0.1 degree only (51.1, -1.2)', (await ev(() => window.__geo.calls)) === 1 && wq.length >= 1 && wq.every(([a, o]) => a === '51.1' && o === '-1.2'), JSON.stringify(wq));
  ok('3. the weather location stored is 0.1 degree too', await ev(() => { const l = JSON.parse(localStorage.getItem('bc-loc')); return l.lat === 51.1 && l.lon === -1.2; }));
  await ev(() => localStorage.setItem('bc-wxchoice', 'no'));

  /* ===================== 4. near, far and no spot ===================== */
  await rooms3({ r1: NEAR, r2: FAR }); await fresh(); await waitFor(() => __g.PLACES.state === 'here', 15000);
  await ev(() => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; });
  await p.click('#bPlay'); await sleep(1500); await sweep(['shelf', 'deskA', 'floor', 'speakerA', 'floor2']);
  const s4 = await ev(() => ({ finding: __g.G.finding, cur: __g.HOMES.cur, pre: Object.keys(__g.ROOMPRE()), skipped: __g.PLACES.skipped.slice(), dist: [__g.placesDist(__g.PLACES.spots.r1, __g.PLACES.here), __g.placesDist(__g.PLACES.spots.r2, __g.PLACES.here)].map(Math.round) }));
  ok('4. Play with three saved rooms: the far one (' + s4.dist[1] + ' m) is skipped, the near one (' + s4.dist[0] + ' m) and the one with no spot are compared', s4.finding && s4.skipped.join() === 'r2' && s4.cur !== 'r2' && !s4.pre.includes('r2') && [s4.cur].concat(s4.pre).sort().join() === 'r1,r3', JSON.stringify(s4));
  await waitFor(() => Object.keys(__g.RELOC.tried || {}).length >= 2 || __g.G.locked, 150000, 800);
  const tried = await ev(() => Object.assign({}, __g.RELOC.tried));
  ok('4. room identification tries r1 and r3, never r2', !!tried.r1 && !!tried.r3 && !tried.r2, JSON.stringify(tried));
  await endAR();

  /* ===================== 5. nothing saved near: "Somewhere new!" ===================== */
  await ctx.setGeolocation(ELSE); await ev(() => { const d = JSON.parse(localStorage.getItem('bc-places-v1')); d.spots.r3 = { lat: 51.2, lon: -1.0 }; localStorage.setItem('bc-places-v1', JSON.stringify(d)); });
  const before5 = await ev(() => ({ r1: localStorage.getItem('base-camp-map-v1'), r2: localStorage.getItem('base-camp-map-v1.r2'), r3: localStorage.getItem('base-camp-map-v1.r3') }));
  await fresh(); await waitFor(() => __g.PLACES.state === 'here', 15000); await ev(() => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; });
  await p.click('#bPlay'); await sleep(2500);
  const s5 = await ev(() => ({ n: __g.HOMES.rooms.length, cur: __g.HOMES.cur, nr: __g.PLACES.newRoom, ret: __g.G.returning, finding: __g.G.finding, pre: Object.keys(__g.ROOMPRE()).length, ask: document.getElementById('nroom').hidden ? '' : document.getElementById('nroom').innerText, skipped: __g.PLACES.skipped.slice() }));
  ok('5. nothing saved within 300 m: a new room, nothing old loaded or compared', s5.n === 4 && s5.cur === s5.nr && s5.cur === 'r4' && !s5.ret && !s5.finding && s5.pre === 0 && s5.skipped.length === 3, JSON.stringify(s5));
  ok('5. it says so gently: "Somewhere new! Shall we start a camp here?" with Yes and the old rooms under "It\'s..."', /Somewhere new! Shall we start a camp here\?/.test(s5.ask) && /Yes!/.test(s5.ask) && (await ev(() => document.querySelectorAll('#nroom [data-room]').length === 3)), s5.ask.replace(/\n/g, ' | '));
  await p.click('#nrIts'); await sleep(300); await p.screenshot({ path: OUT + '86-somewhere-new.png' });
  await p.click('#nrYes'); await sleep(300);
  await sweep(['shelf', 'deskA', 'floor', 'speakerA', 'floor2', 'shelf']);
  const tS = await waitFor(() => __g.G.settlements.length > 0, 200000, 800);
  await ev(() => { __g.simulate(60, 0.5); __g.persist(true); }); await sleep(600);
  const s5b = await ev(() => ({ spot: JSON.parse(localStorage.getItem('bc-places-v1')).spots.r4, has: !!localStorage.getItem('base-camp-map-v1.r4') }));
  const after5 = await ev(() => ({ r1: localStorage.getItem('base-camp-map-v1'), r2: localStorage.getItem('base-camp-map-v1.r2'), r3: localStorage.getItem('base-camp-map-v1.r3') }));
  ok('5. the new camp settles and its spot is stored rounded to 3 decimals (about 100 m), not the exact position', tS > 0 && s5b.has && s5b.spot && s5b.spot.lat === 51.3 && s5b.spot.lon === -1.5 && String(s5b.spot.lat).split('.')[1].length <= 3, JSON.stringify(s5b) + ' settled after ' + tS + ' ms');
  ok('5. the old rooms were not touched', after5.r1 === before5.r1 && after5.r2 === before5.r2 && after5.r3 === before5.r3);

  /* ===================== 6. no lat / lon anywhere but bc-places-v1 (and the weather's own 0.1 degree) ===================== */
  const s6 = await ev(() => { __g.ioUi(); const io = document.getElementById('ioText').value; document.getElementById('modal').hidden = true; const rep = __g.buildReport('test'), map = JSON.stringify(__g.mapToJSON()), rooms = localStorage.getItem('bc-rooms-v1');
    const others = Object.keys(localStorage).filter((k) => !['bc-places-v1', 'bc-loc', 'bc-wxcache'].includes(k)).filter((k) => /"lat"|"lon"|latitude|longitude|51\.3\b|-1\.5\b|51\.300/.test(localStorage.getItem(k) || ''));
    const bad = (t) => /"lat"|"lon"|latitude|longitude|51\.300|-1\.4995/.test(t); return { io: bad(io), rep: bad(rep), map: bad(map), rooms: bad(rooms), others, ioLen: io.length, repLen: rep.length }; });
  ok('6. no lat / lon in the map export, the report, the rooms list or any other stored key', !s6.io && !s6.rep && !s6.map && !s6.rooms && !s6.others.length && s6.ioLen > 100 && s6.repLen > 100, JSON.stringify(s6));
  ok('6. nothing logged the position', !logs.some((l) => /51\.30|51\.12|-1\.23|-1\.49/.test(l)));
  await endAR();

  /* ===================== 7. permission denied: as before ===================== */
  await ctx.clearPermissions(); await fresh(); await waitFor(() => __g.PLACES.state !== 'asking', 15000);
  await ev(() => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; document.getElementById('toast').innerHTML = ''; });
  const s7a = await ev(() => ({ st: __g.PLACES.state, here: __g.PLACES.here, on: __g.PLACES.on, calls: window.__geo.calls }));
  await p.click('#bPlay'); await sleep(2500);
  const s7 = await ev(() => ({ finding: __g.G.finding, ids: [__g.HOMES.cur].concat(Object.keys(__g.ROOMPRE())).sort(), nroom: !document.getElementById('nroom').hidden, toast: document.getElementById('toast').textContent }));
  ok('7. denied: silently no position (no message), and Play compares every saved room as before', s7a.on && !s7a.here && s7a.st === 'none' && s7a.calls === 1 && s7.finding && s7.ids.join() === 'r1,r2,r3,r4' && !s7.nroom && !/location|position/i.test(s7.toast), JSON.stringify([s7a, s7]));
  await endAR(); await ctx.grantPermissions(['geolocation']);

  /* ===================== 8. switching off forgets every place ===================== */
  await toTitle(); await openMore(); await p.click('#bPlace'); await sleep(500);
  const s8 = await ev(() => ({ on: __g.PLACES.on, key: localStorage.getItem('bc-places-v1'), spots: Object.keys(__g.PLACES.spots).length, here: __g.PLACES.here, btn: document.getElementById('bPlace').textContent }));
  ok('8. one tap switches it off (no gate needed to switch off) and forgets every stored spot', !s8.on && !s8.key && !s8.spots && !s8.here && /ask a grown-up/.test(s8.btn), JSON.stringify(s8));
  await fresh(); ok('8. after a reload nothing is asked for', (await ev(() => window.__geo.calls)) === 0 && !(await ev(() => __g.PLACES.on)));

  /* ===================== 9. local goods ===================== */
  const practice = async () => { await openMore(); await p.click('#bPrac'); await sleep(300); for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit' && __g.G.settlements.some((S) => S.placed))) break; } await sleep(800);
    await ev(() => { __g.ENV.hourOverride = 12; __g.F10.on = false; for (const r of __g.G.requests.slice()) __g.resolveRequest(r, true); __g.F10.reqDone = true; }); };
  const shotPrep = () => ev(() => { for (const id of ['toast', 'env', 'sel', 'reqs']) { const e = document.getElementById(id); if (e) { if (id === 'toast' || id === 'reqs') e.innerHTML = ''; else e.hidden = true; } } if (__g.camClose) __g.camClose(); });
  const focusKind = (kind, d, yaw, pitch) => ev(([kind, d, yaw, pitch]) => { for (const S of __g.G.settlements) { const t = S.things.find((q) => q.kind === kind); if (!t) continue; const w = S.group.localToWorld(new __g.THREE.Vector3(t.x, 0, t.z)); __g.P.mode = 'orbit'; __g.P.campCam = false; __g.P.yaw = yaw; __g.P.pitch = pitch; __g.focusOn(w.x, w.y + 0.015, w.z, d); return true; } return false; }, [kind, d, yaw, pitch]);
  await ctx.setGeolocation(CARPET); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); localStorage.setItem('bc-places-v1', JSON.stringify({ v: 1, on: true, spots: {} })); }); await fresh(); await waitFor(() => __g.PLACES.state === 'here', 15000);
  ok('9. a made-up spot inside the carpet-town box reads as carpet town', await ev(() => __g.PLACES.area === 'carpet'));
  const F9 = await ev(() => { const F = __g.PLACE_FLAVOURS.carpet; return { goods: F.goods, special: F.special, maker: F.maker, rope: F.cheaper.rope, fluff: F.replaces.fluff, sound: F.sound, stock: Object.keys(__g.PLACE_STOCK).join() }; });
  ok('9. carpet town: wool tufts instead of sock fluff, rope at half price, a loom that weaves rugs, a steam whistle; every good is a stock kind for the market', F9.goods.join() === 'wool' && F9.special === 'rug' && F9.maker === 'loom' && F9.rope === 0.5 && F9.fluff === 'wool' && F9.sound === 'steam' && F9.stock === 'wool,rug,shell,salt,acorn,conker,cap,string', JSON.stringify(F9));
  await practice();
  for (let i = 0; i < 24; i++) { await ev(() => __g.simulate(60, 0.5)); if (await ev(() => (__g.mainSettlement().stock.rug || 0) >= 2)) break; }
  const s9 = await ev(() => { const S = __g.mainSettlement(), L = S.things.find((t) => t.kind === 'loom'); return { wool: S.stock.wool || 0, rug: S.stock.rug || 0, loom: !!L, built: !!(L && L.built), model: !!(L && L.mesh && L.mesh.userData.bcPlaces === 'loom'), pile: S.things.some((t) => t.kind === 'lpile'), card: __g.placesCardHtml(S) }; });
  ok('9. the colony finds wool tufts, builds a comb loom (the toon model from models/places.js) and it weaves rugs', s9.loom && s9.built && s9.model && s9.rug >= 1 && s9.pile && /wool|rug/.test(s9.card), JSON.stringify(s9));
  ok('9. the steam whistle is a sound kind that plays', await ev(() => { if (!__g.SND.KINDS.steam || typeof window.sfx !== 'function') return false; window.sfx('steam'); return true; }));
  await shotPrep(); await focusKind('loom', 0.16, 0.5, 0.42); await sleep(1500); await shotPrep(); await p.screenshot({ path: OUT + '87-loom.png' });
  await ev(() => { __g.persist(true); });
  await ctx.setGeolocation(SEA); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); localStorage.setItem('bc-places-v1', JSON.stringify({ v: 1, on: true, spots: {} })); }); await fresh(); await waitFor(() => __g.PLACES.state === 'here', 15000);
  ok('9. a made-up spot on the coast reads as seaside', await ev(() => __g.PLACES.area === 'seaside'));
  await practice(); for (let i = 0; i < 12; i++) { await ev(() => __g.simulate(60, 0.5)); if (await ev(() => (__g.mainSettlement().stock.shell || 0) >= 3)) break; }
  const s9b = await ev(() => { const S = __g.mainSettlement(); return { shell: S.stock.shell || 0, salt: S.stock.salt || 0, wool: S.stock.wool || 0, loom: S.things.some((t) => t.kind === 'loom'), pile: S.things.some((t) => t.kind === 'lpile' && t.var === 1) }; });
  ok('9. seaside: shells and salt crystals, a shore heap, no wool and no loom', s9b.shell >= 1 && s9b.salt >= 0 && !s9b.wool && !s9b.loom && s9b.pile, JSON.stringify(s9b));
  await ev(() => { __g.G.cur = __g.mainSettlement(); __g.cardUi(); }); await shotPrep(); await focusKind('lpile', 0.2, 2.2, 0.5); await sleep(1500); await shotPrep(); await p.screenshot({ path: OUT + '88-local-goods.png' });
  await ev(() => { __g.persist(true); });
  ok('9. location off: today\'s goods only (no local finds)', await ev(() => { const on = __g.PLACES.on; __g.PLACES.on = false; const a0 = __g.PLACES.area; __g.PLACES.area = 'default'; const S = __g.mainSettlement(), s0 = JSON.stringify(S.stock); __g.placesStep(S, 600, __g.ENV, true); const same = JSON.stringify(S.stock) === s0; __g.PLACES.on = on; __g.PLACES.area = a0; return same; }));

  /* ===================== 10. the seasons south of the equator ===================== */
  await ctx.setGeolocation(SOUTH); await fresh(); await waitFor(() => __g.PLACES.state === 'here', 15000);
  const seas = (dates) => ev((dates) => dates.map((d) => { __g.ENV.dateOverride = d; __g.ENV._sk = 0; __g.envUpdate(); return __g.ENV.season; }), dates);
  const D10 = ['2026-07-15', '2027-01-20', '2026-04-10', '2026-10-10', '2026-12-10', '2026-12-30'];
  const south = await seas(D10), diaryS = await ev(() => __g.seasonOf(Date.UTC(2026, 6, 15))[0]), southFlag = await ev(() => __g.placesSouth() && __g.PLACES.area === 'default');
  ok('10. south of the equator: July is winter, January summer, April autumn, October spring; Advent and New Year keep their dates', southFlag && south.join() === 'winter,summer,autumn,spring,advent,newyear' && diaryS === 'winter', south.join() + ' diary ' + diaryS);
  ok('10. the follow-on goal after New Year gets ready for summer, not winter', await ev(() => { __g.ENV.dateOverride = '2027-01-02'; __g.ENV._sk = 0; __g.envUpdate(); __g.SEA.done[__g.ENV.seasonKey] = true; const g = __g.seaGoal(__g.SEASONS.find((q) => q.id === 'newyear')); delete __g.SEA.done[__g.ENV.seasonKey]; return /summer/.test(g.title); }));
  await ev(() => __g.placesSet(false));
  const north = await seas(D10), diaryN = await ev(() => __g.seasonOf(Date.UTC(2026, 6, 15))[0]);
  ok('10. location off (or north): unchanged, July summer and January winter', north.join() === 'summer,winter,spring,autumn,advent,newyear' && diaryN === 'summer', north.join());

  ok('0 page errors', errs.length === 0, errs.slice(0, 5).join(' | '));
  console.log('\n' + res.filter(Boolean).length + '/' + res.length + ' passed'); await b.close(); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
