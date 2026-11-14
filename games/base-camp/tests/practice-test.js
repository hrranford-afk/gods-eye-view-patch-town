/* Base Camp practice room: the colony lives through weather, night, rain, requests, a cable car and a save / return.
   Build 21: this was a print-only debug script from the very first builds (a hard-coded file path in another worktree, the old Continue / Done / re-place flow, no PASS or
   FAIL). It now serves the game with tests/lib.js, uses today's automatic practice flow, and checks every promise the script used to print.
   Run:  NODE_PATH=$(npm root -g) node games/base-camp/tests/practice-test.js */
const path = require('path');
const { serve, launch, ROOT } = require('./lib.js');
const OUT = path.join(ROOT, 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
(async () => {
  const { srv, url } = await serve(); const { b, ctx, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  const fetched = [];
  /* a rainy town: registered after lib.js's sunny route, so this one answers first */
  await ctx.route('**/api.open-meteo.com/**', (r) => { fetched.push(r.request().url()); r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 11, precipitation: 1.2, rain: 1.2, cloud_cover: 95, weather_code: 63, is_day: 1, wind_speed_10m: 20 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }); });
  /* wait on game time (AUTO.t), not wall time: the sandbox lags under load. Wall time is only a safety cap. */
  const waitGame = async (fn, gameSecs, capMs) => { const g0 = await ev(() => __g.AUTO.t), t0 = Date.now(); while (Date.now() - t0 < (capMs || 600000)) { if (await ev(fn)) return true; if ((await ev(() => __g.AUTO.t)) - g0 > gameSecs) return !!(await ev(fn)); await sleep(500); } return false; };
  const insideOf = () => ev(() => { const cs = __g.G.settlements.flatMap((S) => S.cols); return { inside: cs.filter((c) => c.inside).length, fire: cs.filter((c) => c.job && c.job.type === 'fireside').length, n: cs.length }; });

  await p.goto(url); await sleep(1500);
  await ev(() => { localStorage.clear(); __g.ENV.hourOverride = 12; }); await p.reload(); await sleep(1500); await ev(() => { __g.ENV.hourOverride = 12; });

  /* ---- the practice room scans itself and the colony settles ---- */
  await p.click('#bMore'); await p.click('#bPrac');
  const settled = await waitGame(() => __g.G.settlements.length > 0, 180);
  ok('practice room: the auto-scan settles a colony by itself (the old Done scanning + settle)', settled, await ev(() => __g.G.settlements.map((S) => S.zoneName).join(', ')));
  await waitGame(() => __g.P.mode === 'orbit' && !__g.P.auto, 300);
  const zs = await ev(() => __g.G.zones.map((z) => [z.type, +z.area.toFixed(2)]));
  ok('the scan found the practice room surfaces (floor, desk, shelf...)', zs.length >= 4 && zs.some((z) => z[0] === 'FLOOR') && zs.some((z) => z[0] === 'TABLE') && zs.some((z) => z[0] === 'SHELF'), JSON.stringify(zs));

  /* ---- weather: pick a town; only a rounded location is kept ---- */
  await ev(() => { for (const id of ['ask', 'diary', 'wx']) { const e = document.getElementById(id); if (e) e.hidden = true; } });
  await p.click('#bMenu'); await sleep(300); await p.click('#mWx'); await sleep(300); await p.click('#wxTownGo');
  const wxOk = await waitGame(() => __g.ENV.rain > 0, 30, 60000);
  const wx = await ev(() => ({ loc: JSON.parse(localStorage.getItem('bc-loc') || 'null'), choice: localStorage.getItem('bc-wxchoice'), rain: __g.ENV.rain, wind: __g.ENV.wx.wind, temp: __g.ENV.wx.temp }));
  const q = fetched.length ? new URL(fetched[fetched.length - 1]).searchParams : null;
  const dec = (v) => (String(v).split('.')[1] || '').length;
  ok('weather by town: the forecast is fetched and its rain reaches the game', wxOk && fetched.length > 0 && wx.rain > 0 && wx.choice === 'town', JSON.stringify(wx));
  ok('only a rounded location (0.1 degree) is stored and sent', wx.loc && dec(wx.loc.lat) <= 1 && dec(wx.loc.lon) <= 1 && q && dec(q.get('latitude')) <= 1 && dec(q.get('longitude')) <= 1, q ? 'lat=' + q.get('latitude') + ' lon=' + q.get('longitude') : 'no fetch');
  await ev(() => { document.getElementById('modal').hidden = true; document.getElementById('wx').hidden = true; __g.setWxPick('clear'); __g.envUpdate(); });

  /* ---- 10 minutes of colony, then 20 more: growth and flat memory ---- */
  const mem = () => ev(() => ({ geo: __g.renderer.info.memory.geometries, tex: __g.renderer.info.memory.textures, heapMB: Math.round(performance.memory.usedJSHeapSize / 1e6) }));
  const c0 = await ev(() => { const S = __g.G.settlements[0]; return { cols: S.cols.length, things: S.things.length }; });
  const m0 = await mem(); await ev(() => __g.simulate(600)); await sleep(500); const m1 = await mem();
  const c1 = await ev(() => { const S = __g.G.settlements[0]; return { cols: S.cols.length, things: S.things.length, kinds: S.things.reduce((a, t) => { a[t.kind] = (a[t.kind] || 0) + 1; return a; }, {}) }; });
  ok('10 minutes of colony: it grows (more things built, nobody lost)', c1.things > c0.things && c1.cols >= c0.cols, JSON.stringify([c0, c1]));
  await ev(() => { __g.simulate(600); __g.simulate(600); }); await sleep(500); const m2 = await mem();
  ok('memory stays flat over 20 more minutes', m2.geo - m1.geo < 150 && m2.tex - m1.tex < 30 && m2.heapMB - m1.heapMB < 80, JSON.stringify([m0, m1, m2]));

  /* ---- requests: thirsty on a hot day with no well; giving helps ---- */
  /* build 19 + first10: in the first session the scout's "My seeds spilled!" comes first and other requests wait for it, so answer it the way a player does (Seeds button, then a seed by the camp) */
  const seed = await ev(() => { const r = __g.G.requests.find((q2) => q2.def.f10); if (!r) return 'none'; __g.giveRequest(r); __g.giveRequest(r); return __g.F10.reqDone ? 'done' : 'open'; });
  await ev(() => { __g.G.requests.length = 0; __g.simulate(15); });
  const rq = await ev(() => { const S = __g.G.settlements[0]; S.things = S.things.filter((t) => t.kind !== 'well'); S.stock.water = 0; S.stock.seeds = 0; __g.setWxPick('hot'); __g.envUpdate(); S.reqT = 0; for (let i = 0; i < 30 && !__g.G.requests.some((r) => !r.def.f10); i++) { __g.FUN.queue.length = 0; __g.FUN.bannerT = 0; __g.simulate(10); } /* build 21: asks wait behind celebration banners, which only clear frame by frame; this fast-forward has no frames, so clear them here */ return __g.G.requests.filter((r) => !r.def.f10).map((r) => r.def.id + ':' + r.who); });
  ok('a thirsty colony on a hot day asks the Giant for something (after the seed request)', rq.length > 0, 'seed request ' + seed + ', then ' + JSON.stringify(rq));
  await sleep(600); await p.screenshot({ path: OUT + 'practice-requests.png' });
  const j0 = await ev(() => { const S = __g.G.settlements[0]; for (const c of S.cols) c.needs.joy = 0.5; return 0.5; }); /* joy sits near 1 after half an hour of play; start from 0.5 so a gift can show */
  await ev(() => { for (const r of __g.G.requests.filter((q2) => !q2.def.f10)) __g.giveRequest(r); });
  const j1 = await ev(() => { const S = __g.G.settlements[0]; return S.cols.reduce((a, c) => a + c.needs.joy, 0) / S.cols.length; });
  ok('giving the requests makes the colony happier and clears them', j1 > j0 && (await ev(() => __g.G.requests.filter((q2) => !q2.def.f10).length)) < rq.length, j0.toFixed(2) + ' -> ' + j1.toFixed(2));

  /* ---- night: in the first session everyone sits round the campfire (build 19 + first10), after it they go to bed ---- */
  await ev(() => { __g.setWxPick('clear'); __g.ENV.hourOverride = 2; __g.envUpdate(); __g.simulate(90); });
  const nf = await insideOf(); const f10 = await ev(() => __g.F10.on);
  ok('night in the first session: everybody is at the campfire or tucked in', !f10 || nf.fire + nf.inside >= Math.ceil(nf.n * 0.6), JSON.stringify(Object.assign({ f10 }, nf)));
  await ev(() => { __g.F10.on = false; __g.simulate(90); }); await sleep(600);
  const ni = await insideOf();
  ok('night after the first session: most colonists go inside', ni.inside >= Math.ceil(ni.n * 0.5), ni.inside + '/' + ni.n);
  await p.screenshot({ path: OUT + 'practice-night.png' });

  /* ---- rain: they shelter ---- */
  await ev(() => { __g.ENV.hourOverride = 12; __g.envUpdate(); __g.simulate(60); __g.setWxPick('rain'); __g.envUpdate(); __g.simulate(40); }); await sleep(600);
  const ri = await insideOf(); const rainNow = await ev(() => __g.ENV.rain);
  ok('rain: most colonists shelter', rainNow > 0 && ri.inside >= Math.ceil(ri.n * 0.5), 'rain ' + rainNow + ', inside ' + ri.inside + '/' + ri.n);

  /* ---- a cable car carries settlers to another surface ---- */
  const lk = await ev(() => { __g.setWxPick('clear'); __g.ENV.hourOverride = 12; __g.envUpdate(); const S = __g.G.settlements[0]; S.stock.wood = 10;
    const free = __g.G.zones.filter((z) => !z.settled && !z.ceil && z.area > 0.05 && z.id !== S.zid).sort((a, b2) => Math.hypot(a.cx - S.tf.x, a.cz - S.tf.z) - Math.hypot(b2.cx - S.tf.x, b2.cz - S.tf.z));
    let made = null; for (const z of free) { __g.ensureDist(z); if (!z.core) continue; made = __g.makeLink(S, S.tf.x, S.tf.z, z, z.core[0], z.core[1]); if (made) { window.__lz = z.id; break; } }
    __g.simulate(500); const Sb = made && __g.G.zones.find((z) => z.id === window.__lz).settled;
    return { made: !!made, ready: made && made.ready, cols: Sb ? Sb.cols.length : 0, already: __g.G.links.filter((l) => l.ready).length, sett: __g.G.settlements.map((s) => s.zoneName + ':' + s.cols.length) }; });
  ok('a cable car to a new surface is built and carries settlers there', (lk.made && lk.ready && lk.cols > 0) || (!lk.made && lk.already > 0 && lk.sett.length >= 2), JSON.stringify(lk));
  await ev(() => { __g.P.yaw = 0.5; __g.P.pitch = 0.45; __g.focusOn(-0.3, 1.0, -0.9, 2.2); }); await sleep(2500); await p.screenshot({ path: OUT + '05-practice-room.png' });
  const cabOk = await ev(() => { const l = __g.G.links.find((q2) => q2.ready && q2.cab); if (!l) return false; const v = new __g.THREE.Vector3(); l.cab.getWorldPosition(v); __g.P.yaw = 0.6; __g.P.pitch = 0.25; __g.focusOn(v.x, v.y, v.z, 0.45); return true; });
  if (cabOk) { await sleep(2500); await p.screenshot({ path: OUT + '04b-cablecar-close.png' }); }

  /* ---- save, 40 minutes away, come back: the colony finds its home again (the old manual re-place is automatic since build 4) ---- */
  const before = await ev(() => { __g.persist(true); return { n: __g.G.settlements.length, cols: __g.G.settlements.reduce((a, S) => a + S.cols.length, 0) }; });
  await ev(() => { document.getElementById('diary').hidden = true; __g.comeBackLater(40 / 60); });
  const locked = await waitGame(() => __g.G.locked, 240, 600000);
  const after = await ev(() => ({ n: __g.G.settlements.length, placed: __g.G.settlements.filter((S) => S.placed).length, cols: __g.G.settlements.reduce((a, S) => a + S.cols.length, 0), diary: document.getElementById('diary').innerText.slice(0, 60) }));
  ok('after 40 minutes away the room is found again and every colony is back in place', locked && after.n >= before.n && after.placed === after.n && after.cols >= before.cols - 1, JSON.stringify([before, after]));
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 4)));
  const fails = res.filter((r) => !r).length; console.log(fails ? fails + ' FAILED' : 'ALL ' + res.length + ' PASSED');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
