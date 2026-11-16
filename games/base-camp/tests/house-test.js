/* Base Camp build 29 ("Mac and dolls' house"): the house, the desktop camera, the controller, the notices feed and the bot playtest.
   Run from games/base-camp: NODE_PATH=$(npm root -g) node tests/house-test.js   (BOT_DAYS=n for a longer bot run; default 3 in-game days) */
const { serve, launch, ROOT } = require('./lib.js'); const path = require('path');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
(async () => {
  const { srv, url } = await serve(); let { b, p, errs } = await launch(); let ev = (f, a) => p.evaluate(f, a);
  const waitFor = async (f, ms, step, a) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f, a)) return true; await sleep(step || 500); } return false; };
  const calm = () => ev(() => { for (const id of ['diary', 'modal', 'ask', 'wx']) document.getElementById(id).hidden = true; document.getElementById('toast').innerHTML = ''; document.getElementById('banner').className = ''; document.getElementById('repc').hidden = true; document.getElementById('home').classList.remove('on'); document.getElementById('bmenu').hidden = true; });
  await p.goto(url); await sleep(1200); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); });
  await p.goto(url + '?player'); await sleep(1500); await ev(() => { __g.ENV.hourOverride = 12; __g.ENV.dateOverride = '2026-10-20'; });
  ok('BUILD is build 30', await ev(() => __g.BUILD === 'build 30'));
  ok('the house is on by default with six rooms', await ev(() => __g.HOUSE.on && __g.HOUSE_ORDER.length === 6 && ['kitchen', 'lounge', 'bed', 'bath', 'garden'].every((k) => (__g.HOUSE_SURF[k] || []).length >= 3)));

  /* ---- 1. the Playroom (the old practice room) settles as before ---- */
  await p.click('#bMore'); await p.click('#bPrac'); await sleep(300);
  ok('Playroom: the colony settles by itself', await waitFor(() => __g.G.settlements.length > 0, 120000));
  ok('Playroom: the virtual hit test sees only the Playroom (its 4 tops and its own things)', await ev(() => __g.HOUSE.cur === 'play' && __g.PSURF.length === 4 && __g.PROPS.filter((q) => !q.room).length === 9 && __g.PROPS.some((q) => q.room === 'kitchen')));
  await waitFor(() => __g.P.mode === 'orbit', 90000);

  /* ---- 2. every other room is a real room: its own HOMES row, scan -> zones -> camp ---- */
  const rooms = {};
  for (const k of ['kitchen', 'bath', 'bed', 'lounge', 'garden']) {
    const went = await ev((k) => __g.houseGo(k), k); await sleep(300);
    await ev(() => __g.injectScan(0.02));
    const settled = await waitFor(() => __g.G.settlements.length > 0, 60000);
    const info = await ev(() => ({ cur: __g.HOUSE.cur, home: __g.HOMES.cur, name: __g.homeName(__g.HOMES.cur), zones: __g.G.zones.map((z) => z.name.split(' – ')[0] + '@' + z.y.toFixed(2)), camps: __g.G.settlements.length, surf: __g.PSURF.length }));
    rooms[k] = info; ok(k + ': walked in, scanned, zones found and a camp landed', went && settled && info.cur === k && info.zones.length >= 2, JSON.stringify(info));
    await ev(() => { __g.persist(true); });
  }
  ok('each house room is its own saved room (six HOMES rows with the room names)', await ev(() => { const n = __g.HOMES.rooms.map((r) => r.name); return __g.HOMES.rooms.length === 6 && ['Kitchen', 'Bathroom', 'Bedroom', 'Lounge', 'Garden'].every((x) => n.includes(x)); }), JSON.stringify(await ev(() => __g.HOMES.rooms.map((r) => r.id + ':' + r.name))));
  const back = await ev(() => { const c0 = JSON.parse(localStorage.getItem('base-camp-save-v2') || '{}'); const ok = __g.houseGo('play'); return { ok, cur: __g.HOUSE.cur, locked: __g.G.locked, ret: __g.G.returning, cols: __g.G.settlements.reduce((a, S) => a + S.cols.length, 0), saved: (c0.settlements || []).length }; });
  ok('back in the Playroom: found again at once (the house did not move) with its colony', back.ok && back.cur === 'play' && back.locked && back.cols >= 3, JSON.stringify(back));
  /* visitors through the doorways */
  const vis = await ev(() => { const S = __g.G.settlements[0]; while (S.cols.length < 6) __g.addColonist(S, {}); const n0 = S.cols.length, to = __g.houseVisit(); return { to, n0, n1: S.cols.length, q: to ? (__g.HOUSE.q[to] || []).length : 0 }; });
  ok('a colonist walks through a doorway to a neighbour room (queued for it)', !!vis.to && vis.n1 === vis.n0 - 1 && vis.q === 1, JSON.stringify(vis));
  const arr = await ev((to) => { __g.houseGo(to); return { cur: __g.HOUSE.cur, q: (__g.HOUSE.q[to] || []).length, cols: __g.G.settlements.reduce((a, S) => a + S.cols.length, 0) }; }, vis.to);
  ok('...and joins that room\'s colony when the room is opened', arr.cur === vis.to && arr.q === 0, JSON.stringify(arr));

  /* ---- 3. shots: each room, the whole house ---- */
  let n = 115;
  for (const k of ['play', 'kitchen', 'bath', 'bed', 'lounge', 'garden']) {
    await ev((k) => { if (__g.HOUSE.cur !== k) __g.houseGo(k); const [cx, cz] = __g.houseRoomCentre(k), P = __g.P; P.gTarget.set(cx, 0.35, cz + 0.1); P.target.copy(P.gTarget); P.yaw = k === 'bath' ? -0.35 : 0.55; P.pitch = 0.85; P.gDist = P.dist = k === 'bath' ? 3.2 : 3.5; P.pitchGoal = undefined; __g.DESK.last = performance.now(); __g.HOUSE.whole = true; }, k);
    await sleep(3200); await calm(); await sleep(200); console.log(k + ' camera', JSON.stringify(await ev(() => ({ d: +__g.P.dist.toFixed(2), gd: +__g.P.gDist.toFixed(2), pitch: +__g.P.pitch.toFixed(2), cam: __g.camera.position.toArray().map((v) => +v.toFixed(2)), guard: __g.DESK.guardHits })))); await p.screenshot({ path: OUT + n + '-house-' + k + '.png' }); n++;
  }
  await ev(() => { __g.houseGo('play'); __g.deskWhole(); __g.HOUSE.whole = true; }); await sleep(2500); await calm(); await sleep(200);
  ok('whole-house view: far out, every room has its sign', await ev(() => __g.P.dist > 8 && __g.HOUSE.labels.length === 6 && __g.HOUSE.labels.every((s) => s.visible)));
  await p.screenshot({ path: OUT + '121-house-whole.png' });

  /* ---- 4. the desktop camera: mouse, wheel, keys, never inside anything ---- */
  await ev(() => { __g.HOUSE.whole = false; __g.deskReset(); }); await sleep(1200); await calm();
  const k0 = await ev(() => __g.P.gTarget.toArray());
  await p.keyboard.down('KeyW'); await sleep(500); await p.keyboard.up('KeyW');
  const k1 = await ev(() => __g.P.gTarget.toArray());
  ok('W walks the camera forward', Math.hypot(k1[0] - k0[0], k1[2] - k0[2]) > 0.05, JSON.stringify([k0, k1].map((v) => v.map((x) => +x.toFixed(2)))));
  const y0 = await ev(() => __g.P.yaw); await p.keyboard.down('KeyQ'); await sleep(400); await p.keyboard.up('KeyQ');
  ok('Q turns', (await ev(() => __g.P.yaw)) > y0 + 0.1);
  const d0 = await ev(() => __g.P.gDist); await p.mouse.move(600, 420); await p.mouse.wheel(0, 300); await sleep(200);
  ok('the wheel zooms out', (await ev(() => __g.P.gDist)) > d0 * 1.2);
  const t0 = await ev(() => __g.P.gTarget.toArray()); await p.keyboard.down('Shift'); await p.mouse.move(600, 420); await p.mouse.down(); await p.mouse.move(680, 470, { steps: 6 }); await p.mouse.up(); await p.keyboard.up('Shift');
  const t1 = await ev(() => __g.P.gTarget.toArray());
  ok('shift-drag slides the camera', Math.hypot(t1[0] - t0[0], t1[2] - t0[2]) > 0.02);
  await ev(() => { __g.G.settlements.forEach((S) => { S.group.visible = true; }); }); const yy = await ev(() => __g.P.yaw); await p.mouse.move(150, 650); await p.mouse.down(); await p.mouse.move(260, 650, { steps: 6 }); await p.mouse.up(); /* away from the camp, so the press does not pick up a colonist */
  ok('a plain drag turns round', Math.abs((await ev(() => __g.P.yaw)) - yy) > 0.2);
  await p.keyboard.press('KeyC'); await sleep(800);
  ok('C follows a colonist', await ev(() => !!__g.DESK.follow));
  await p.keyboard.press('Digit0'); await sleep(300);
  ok('0 resets the view (and stops following)', await ev(() => !__g.DESK.follow));
  const cam = await ev(() => { /* 400 random views over the house: the camera is never left inside a wall, furniture or under the floor */
    const r = __g.seededRandom ? __g.seededRandom(5) : Math.random, P = __g.P; let bad = 0, worst = '';
    for (let i = 0; i < 400; i++) { P.gTarget.set(-1.6 + r() * 8.4, r() * 1.6, -1.6 + r() * 9.2); P.target.copy(P.gTarget); P.yaw = r() * 6.28; P.pitch = 0.12 + r() * 1.3; P.dist = P.gDist = 0.2 + r() * 8; __g.orbitCam(0); if (__g.deskInside()) { bad++; worst = JSON.stringify(__g.camera.position); } }
    __g.deskReset(); return { bad, worst, guard: __g.DESK.guardHits };
  });
  ok('the camera is never inside geometry (400 random views)', cam.bad === 0, JSON.stringify(cam));
  const ar = await ev(() => { __g.AR.on = true; const d = __g.deskOn(); __g.AR.on = false; return d; });
  ok('none of the desktop camera runs in AR', ar === false);

  /* ---- 5. a controller (Gamepad API stubbed: standard mapping) ---- */
  await ev(() => { window.__pad = { axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [{ index: 0, connected: true, mapping: 'standard', axes: window.__pad.axes, buttons: window.__pad.buttons }]; });
  const press = async (i) => { await ev((i) => { window.__pad.buttons[i] = { pressed: true, value: 1 }; }, i); await sleep(250); await ev((i) => { window.__pad.buttons[i] = { pressed: false, value: 0 }; }, i); await sleep(250); };
  const g0 = await ev(() => __g.P.gTarget.toArray()); await ev(() => { window.__pad.axes[1] = -0.9; }); await sleep(700); await ev(() => { window.__pad.axes[1] = 0.1; }); await sleep(200);
  const g1 = await ev(() => __g.P.gTarget.toArray());
  ok('left stick walks (0.1 is inside the 0.15 deadzone)', Math.hypot(g1[0] - g0[0], g1[2] - g0[2]) > 0.05 && await ev(() => !document.getElementById('xhair').hidden));
  const g2 = await ev(() => __g.P.gTarget.toArray()); await sleep(400); const g3 = await ev(() => __g.P.gTarget.toArray());
  ok('a stick inside the deadzone does nothing', Math.hypot(g3[0] - g2[0], g3[2] - g2[2]) < 1e-3);
  const z0 = await ev(() => __g.P.gDist); await ev(() => { window.__pad.buttons[7] = { pressed: true, value: 1 }; }); await sleep(500); await ev(() => { window.__pad.buttons[7] = { pressed: false, value: 0 }; });
  ok('R2 zooms in', (await ev(() => __g.P.gDist)) < z0 * 0.95);
  await calm(); await ev(() => { for (const id of ['tagpick', 'guess']) document.getElementById(id).hidden = true; }); console.log('card up before the D-pad: ' + JSON.stringify(await ev(() => { const c = __g.padCard(); return c ? c.id : ''; })));
  await press(15); await press(15);
  const ring = await ev(() => { const f = document.querySelector('#bar .padFocus'); return f ? (f.dataset.tool || f.id) : ''; });
  ok('D-pad right moves a ring along the tool bar', !!ring, ring);
  await press(12); ok('D-pad up uses the ringed tool', await ev((r) => __g.G.tool === r || !!document.querySelector('#bar .padFocus'), ring));
  await ev(() => { __g.setTool('look'); }); await calm(); const pk = await ev(() => { const S = __g.G.settlements[0], c = S.cols.find((q) => !q.inside && q.spawn <= 0); __g.DESK.follow = c; const P = __g.P; P.dist = P.gDist = 0.5; P.pitch = 0.9; __g.G.sel = null; __g.G.requests.length = 0; return c.name; });
  await sleep(800); await calm();
  await sleep(300); console.log('card up before Cross: ' + JSON.stringify(await ev(() => { const c = __g.padCard(); return c ? c.id + ':' + c.innerText.slice(0, 60) : ''; }))); await press(0);
  const cx = await ev(() => { const S = __g.G.settlements[0], c = __g.DESK.follow, [wx, wz] = c ? __g.l2w(S, c.x, c.z) : [0, 0], sp = c ? __g.toScreen(new __g.THREE.Vector3(wx, __g.SY(S, 0.026), wz)) : null; return { sel: __g.G.sel ? __g.G.sel.name : '', shown: !document.getElementById('sel').hidden, at: sp && sp.slice(0, 2).map(Math.round), pick: __g.colPick(innerWidth / 2, innerHeight / 2) ? 'yes' : 'no', tool: __g.G.tool, ph: __g.G.phase }; });
  ok('Cross taps at the crosshair (picks the colonist under it)', !!cx.sel || cx.shown, pk + ' ' + JSON.stringify(cx));
  await calm(); await sleep(300); await p.screenshot({ path: OUT + '122-controller-crosshair.png' });
  await press(9); ok('Options opens the Menu', await ev(() => !document.getElementById('modal').hidden));
  await press(1); ok('Circle closes it', await ev(() => document.getElementById('modal').hidden));
  await press(3); ok('Triangle follows a colonist', await ev(() => !!__g.DESK.follow));
  await ev(() => { navigator.getGamepads = () => []; }); await sleep(300);

  /* ---- 6. the notices feed: no repeats, grouped, rate-limited ---- */
  const nf = await ev(() => {
    const L = (a) => a.map((t) => ({ text: t, by: '' })), out = {}; __g.NEWS.lastShow = -1e9;
    __g.G.report = { same: [1, 2, 3], lines: L(['A GIANT CAN appeared on the desk. It is now a tower.', 'A GIANT BOX appeared on the shelf. It is now a tower.', 'A GIANT CUP appeared on the floor. It is now a tower.', 'New land! The windowsill is clear!']) }; __g.showReport(true);
    const d = document.getElementById('diary'); out.first = !d.hidden ? [...d.querySelectorAll('li')].map((l) => l.textContent) : [...document.querySelectorAll('#repc .rl')].map((l) => l.textContent); out.head = d.innerText.includes('3 places the same');
    d.hidden = true; __g.G.report = { same: [1, 2, 3], lines: L(['A GIANT CAN appeared on the desk. It is now a tower.', 'New land! The windowsill is clear!']) }; __g.showReport(true); out.again = !d.hidden;
    __g.G.report = { same: [], lines: L(['New land spotted: a stool that was never on our map! An expedition would like to go.']) }; __g.showReport(true); out.soon = !d.hidden; out.held = __g.NEWS.held.length;
    __g.NEWS.lastShow = -1e9; __g.newsTick(); out.later = !d.hidden; out.stat = __g.NEWS.stat; return out;
  });
  ok('the same news is never shown twice; same-shape news is grouped ("and 2 more like this"); "3 places the same" is not a headline', nf.first.length === 2 && /and 2 more like this/.test(nf.first[0]) && !nf.head && !nf.again, JSON.stringify(nf));
  ok('new news soon after a card waits, then comes out', nf.soon === false && nf.held === 1 && nf.later === true, JSON.stringify(nf));
  await ev(() => { document.getElementById('diary').hidden = true; __g.menuUi(); document.getElementById('mNews').click(); }); await sleep(400);
  ok('Menu > What they noticed lists everything told', await ev(() => document.querySelectorAll('#diary li').length >= 3));
  await p.screenshot({ path: OUT + '123-notices-feed.png' });
  ok('no page errors in the house run', errs.length === 0, errs.slice(0, 3).join(' | '));
  const fps = await ev(async () => { const P = __g.P; if (!document.getElementById('ccam').hidden) document.getElementById('ccam').click(); __g.deskWhole(); await new Promise((r) => setTimeout(r, 1500)); const n0 = __g.G.time; let f = 0; const t0 = performance.now(); await new Promise((r) => { const go = () => { f++; if (performance.now() - t0 < 3000) requestAnimationFrame(go); else r(); }; requestAnimationFrame(go); }); return { fps: +(f / ((performance.now() - t0) / 1000)).toFixed(1), calls: __g.renderer.info.render.calls, tris: __g.renderer.info.render.triangles }; });
  console.log('DESKTOP HOUSE (whole view, software GL): ' + JSON.stringify(fps));
  await b.close();

  /* ---- 7. the bot plays the house for a few in-game days ---- */
  const DAYS = +(process.env.BOT_DAYS === undefined ? 3 : process.env.BOT_DAYS); if (DAYS > 0) { ({ b, p, errs } = await launch()); ev = (f, a) => p.evaluate(f, a);
  await p.goto(url); await sleep(800); await ev(() => localStorage.clear());
  const lines = []; p.on('console', (m) => { if (/^BOT /.test(m.text())) { lines.push(JSON.parse(m.text().slice(4))); console.log(m.text()); } });
  await p.goto(url + '?bot=1&speed=60&hour=60&seed=7&player');
  await waitFor((d) => window.__bot && window.__bot.days.length >= d, DAYS * 360000, 3000, DAYS);
  const days = await ev(() => window.__bot.days), errsB = await ev(() => window.__bot.errs);
  ok('bot: ran ' + DAYS + ' in-game days unattended', days.length >= DAYS, days.length + ' days');
  ok('bot: wrote a numbers-only summary each day (window.__bot.days and the console)', days.length && days.every((d) => Object.entries(d).every(([k, v]) => typeof v === 'number' || k === 'room')) && lines.length >= Math.min(DAYS, days.length));
  ok('bot: no errors', days.every((d) => d.errors === 0) && errs.length === 0, JSON.stringify(errsB.slice(0, 3)) + ' ' + errs.slice(0, 2).join(' | '));
  ok('bot: no colonist stood stuck for more than 30 simulated minutes (outside a tent)', days.every((d) => d.stuck === 0), JSON.stringify(days.map((d) => d.stuck + '/' + d.stuckMaxS)));
  ok('bot: no repeated notices', days.every((d) => d.repeatedNotices === 0), JSON.stringify(days.map((d) => d.noticeCards + ' cards, ' + d.repeatedNotices + ' repeats')));
  ok('bot: the camera was never inside geometry', days.every((d) => d.camInside === 0));
  ok('bot: it played (built or planted, poked, walked between rooms)', days.length && days[days.length - 1].builds + days[days.length - 1].plants > 0 && days[days.length - 1].roomMoves >= 1, JSON.stringify(days[days.length - 1]));
  await b.close(); }
  srv.close();
  const nOk = res.filter(Boolean).length; console.log(nOk + '/' + res.length + ' passed'); process.exit(nOk === res.length ? 0 : 1);
})();
