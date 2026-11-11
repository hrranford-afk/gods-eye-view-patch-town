const { chromium } = require('playwright');
const OUT = '/home/user/gods-eye-view-patch-town/.worktrees/room-colony/games/base-camp/shots/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 } });
  let fetched = [];
  await ctx.route('**/api.open-meteo.com/**', (r) => { fetched.push(r.request().url()); r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 11, precipitation: 1.2, rain: 1.2, cloud_cover: 95, weather_code: 63, is_day: 1, wind_speed_10m: 20 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }); });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver/.test(m.text())) errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.argv[2]); await p.waitForTimeout(1200);
  await p.evaluate(() => { __g.ENV.hourOverride = 12; });
  await p.click('#bPrac'); await p.click('#bAuto');
  await p.waitForFunction(() => !__g.P.auto, null, { timeout: 120000 });
  await p.waitForTimeout(1500);
  console.log('zones', await p.evaluate(() => JSON.stringify(__g.SCAN.zones.map((z) => [z.id, z.type, z.name, +z.area.toFixed(2)]))));
  await p.screenshot({ path: OUT + 'dbg-p-scan.png' });
  await p.click('#bDone'); await p.waitForTimeout(800);
  await p.evaluate(() => __g.settle('TABLE')); await p.waitForTimeout(2500); await p.screenshot({ path: OUT + 'dbg-p-settle.png' });
  // weather card with a mocked fetch: pick a town; rounded location only
  await p.click('#bMenu'); await p.waitForTimeout(300); await p.click('#wxTownGo'); await p.waitForTimeout(800);
  console.log('weather', await p.evaluate(() => JSON.stringify({ loc: localStorage.getItem('bc-loc'), choice: localStorage.getItem('bc-wxchoice'), rain: __g.ENV.rain, wind: __g.ENV.wx.wind, temp: __g.ENV.wx.temp, sunset: __g.ENV.sunset, windy: __g.ENV.windy })), fetched.map((u) => u.replace(/^.*forecast/, '')));
  await p.evaluate(() => __g.setWxPick('clear'));
  // 10 minutes of colony
  const mem = () => p.evaluate(() => ({ geo: __g.renderer.info.memory.geometries, tex: __g.renderer.info.memory.textures, calls: __g.renderer.info.render.calls, heapMB: Math.round(performance.memory.usedJSHeapSize / 1e6), parts: __g.scene.children.length }));
  const m0 = await mem();
  await p.evaluate(() => __g.simulate(600)); await p.waitForTimeout(500);
  const m1 = await mem();
  console.log('colony', await p.evaluate(() => { const S = __g.G.settlements[0]; return JSON.stringify({ cols: S.cols.length, thr: S.thriving, stock: S.stock, kinds: S.things.reduce((a, t) => { a[t.kind] = (a[t.kind] || 0) + 1; return a; }, {}), reqs: __g.G.requests.map((r) => r.def.id) }); }));
  await p.evaluate(() => { __g.simulate(600); __g.simulate(600); }); await p.waitForTimeout(500);
  const m2 = await mem(); console.log('mem', JSON.stringify([m0, m1, m2]));
  // requests: make the colony thirsty with no well, hot day, then give
  await p.evaluate(() => { const S = __g.G.settlements[0]; S.things = S.things.filter((t) => t.kind !== 'well'); S.stock.water = 0; S.stock.seeds = 0; __g.setWxPick('hot'); __g.envUpdate(); S.reqT = 0; __g.simulate(10); });
  console.log('requests', await p.evaluate(() => JSON.stringify(__g.G.requests.map((r) => r.def.id + ':' + r.who))));
  await p.waitForTimeout(600); await p.screenshot({ path: OUT + 'dbg-p-requests.png' });
  const j0 = await p.evaluate(() => __g.G.settlements[0].cols.reduce((a, c) => a + c.needs.joy, 0) / __g.G.settlements[0].cols.length);
  await p.evaluate(() => { for (const r of __g.G.requests.slice()) __g.giveRequest(r); });
  const j1 = await p.evaluate(() => __g.G.settlements[0].cols.reduce((a, c) => a + c.needs.joy, 0) / __g.G.settlements[0].cols.length);
  console.log('joy before/after give', j0.toFixed(2), j1.toFixed(2), 'reqs left', await p.evaluate(() => __g.G.requests.length));
  // night
  await p.evaluate(() => { __g.setWxPick('clear'); __g.ENV.hourOverride = 2; __g.envUpdate(); __g.simulate(90); });
  await p.waitForTimeout(600);
  console.log('night', await p.evaluate(() => JSON.stringify({ night: __g.ENV.night, grow: __g.ENV.grow, inside: __g.G.settlements[0].cols.filter((c) => c.inside).length + '/' + __g.G.settlements[0].cols.length })));
  await p.screenshot({ path: OUT + 'dbg-p-night.png' });
  // rain
  await p.evaluate(() => { __g.ENV.hourOverride = 12; __g.setWxPick('rain'); __g.envUpdate(); __g.simulate(40); }); await p.waitForTimeout(800);
  console.log('rain', await p.evaluate(() => JSON.stringify({ rain: __g.ENV.rain, inside: __g.G.settlements[0].cols.filter((c) => c.inside).length + '/' + __g.G.settlements[0].cols.length })));
  await p.screenshot({ path: OUT + 'dbg-p-rain.png' });
  // sun slider: bright vs dim growth
  console.log('grow', await p.evaluate(() => { const r = {}; __g.setWxPick('clear'); __g.ENV.hourOverride = 12; for (const s of [0.6, 1, 1.4]) { __g.ENV.sun = s; __g.envUpdate && 0; } return 'see ENV'; }));
  // expand: cable car desk -> shelf
  await p.evaluate(() => { __g.setWxPick('clear'); __g.ENV.hourOverride = 12; __g.ENV.sun = 1; const S = __g.G.settlements[0]; S.stock.wood = 10; const zs = __g.G.settlements[0].zoneRef, sh = __g.SCAN.zones.find((z) => z.type === 'SHELF'); __g.ensureDist(sh); window.__l = __g.makeLink(S, S.tf.x - 0.3, S.tf.z - 0.1, sh, sh.core[0], sh.core[1]); __g.simulate(200); });
  console.log('link', await p.evaluate(() => JSON.stringify({ links: __g.G.links.length, ready: __g.G.links.map((l) => l.ready), sett: __g.G.settlements.map((s) => s.zoneName + ':' + s.cols.length + ':' + s.awaiting) })));
  await p.evaluate(() => { __g.simulate(300); const l = __g.G.links[0]; while (!(l.g.state === 'run' && l.g.s > 0.3 && l.g.s < 0.6)) __g.simulate(1, 0.5); }); await p.waitForTimeout(500);
  console.log('after rides', await p.evaluate(() => JSON.stringify({ sett: __g.G.settlements.map((s) => s.zoneName + ':' + s.cols.length + ':' + s.things.length), riders: __g.G.links[0] && __g.G.links[0].g.riders.length })));
  // screenshots: practice room overview, cable car close
  await p.evaluate(() => { const z = __g.SCAN.zones.find((q) => q.type === 'SHELF'); __g.G.phase = 'play'; __g.P.yaw = 0.5; __g.P.pitch = 0.45; __g.focusOn(-0.3, 1.0, -0.9, 2.2); });
  await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '05-practice-room.png' });
  await p.evaluate(() => { const l = __g.G.links[0], v = new __g.THREE.Vector3(); l.cab.getWorldPosition(v); __g.P.yaw = 0.6; __g.P.pitch = 0.25; __g.focusOn(v.x, v.y, v.z, 0.45); }); await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '04b-cablecar-close.png' });
  // save / load round trip inside the practice room (time skip 40 min)
  await p.evaluate(() => { __g.saveNow(); const d = JSON.parse(localStorage.getItem('base-camp-save-v1')); d.t -= 40 * 60000; localStorage.setItem('base-camp-save-v1', JSON.stringify(d)); window.__sumBefore = JSON.stringify(d.settlements.map((s) => [s.zoneName, s.cols.length, s.things.length, +s.things.reduce((a, t) => a + (t.kind === 'tree' ? t.g : 0), 0).toFixed(1)])); });
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => { __g.ENV.hourOverride = 12; });
  await p.click('#bCont'); await p.click('#bAuto'); await p.waitForFunction(() => !__g.P.auto, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  await p.click('#bDone'); await p.waitForTimeout(500);
  console.log('replace', await p.evaluate(() => __g.G.phase + ' pending=' + __g.G.pending.length + ' hint=' + document.getElementById('hint').textContent));
  const info = await p.evaluate(() => { const out = []; for (const d of __g.G.pending.slice()) { } return __g.G.pending.map((d) => d.zoneName); });
  console.log('pending', info);
  for (let i = 0; i < 3 && (await p.evaluate(() => __g.G.pending.length)); i++) {
    const [px, py] = await p.evaluate(() => { const d = __g.G.pending[0], zs = __g.SCAN.zones.filter((z) => !z.settled); let best = null, bs = 1e9; for (const z of zs) { const s = (z.type === d.zoneType ? 0 : 5) + Math.abs(Math.log((z.area + 0.01) / (d.area + 0.01))); if (s < bs) { bs = s; best = z; } } __g.focusZone(best); window.__tz = best; return [0, 0]; });
    await p.waitForTimeout(2500);
    const sc = await p.evaluate(() => { const z = window.__tz, v = new __g.THREE.Vector3(z.core[0], z.y, z.core[1]).project(__g.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; });
    await p.mouse.click(sc[0], sc[1]); await p.waitForTimeout(700);
    if (i === 0) await p.screenshot({ path: OUT + 'dbg-p-replace.png' });
    await p.click('#rR'); await p.click('#rL'); await p.click('#rLock'); await p.waitForTimeout(600);
  }
  console.log('after', await p.evaluate(() => JSON.stringify({ phase: __g.G.phase, sett: __g.G.settlements.map((s) => [s.zoneName, s.cols.length, s.things.length, +s.things.reduce((a, t) => a + (t.kind === 'tree' ? t.g : 0), 0).toFixed(1)]), links: __g.G.links.length })), 'before', await p.evaluate(() => 0) || '');
  console.log('page errors:', errs.slice(0, 8));
  await b.close();
})();
