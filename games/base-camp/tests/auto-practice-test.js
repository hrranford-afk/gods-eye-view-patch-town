// Practice room, fully automatic: Play -> auto-scan -> auto-settle with zero taps; "Come back later" -> automatic relocalisation (room turned and shifted)
// Run: NODE_PATH=$(npm root -g) node games/base-camp/tests/auto-practice-test.js
const { serve, launch, ROOT } = require('./lib.js'); const path = require('path');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
(async () => {
  const { srv, url } = await serve(); const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  await p.goto(url); await sleep(1500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); __g.ENV.hourOverride = 12; });
  await p.reload(); await sleep(1500);
  ok('title has one main button: Play', await ev(() => !document.getElementById('bPlay').hidden && document.getElementById('bMore') && document.getElementById('tmenu').hidden));
  await p.click('#bMore'); ok('More... opens the small menu', await ev(() => !document.getElementById('tmenu').hidden)); 
  await p.click('#bPrac'); await sleep(300);
  const t0 = Date.now(); let settledAt = 0;
  while (Date.now() - t0 < 120000) { await sleep(500); if (await ev(() => __g.G.settlements.length > 0)) { settledAt = Date.now() - t0; break; } }
  const st = await ev(() => ({ taps: 0, zones: __g.G.zones.length, name: __g.G.settlements[0] && __g.G.settlements[0].zoneName, t: __g.AUTO.t, hits: __g.SCAN.hits }));
  ok('first play: the colony settled by itself, zero taps', settledAt > 0, settledAt + ' ms wall, ' + JSON.stringify(st));
  // let it scan the whole room (the auto path runs by itself), then wait until the camera has moved on to the orbit view
  for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit')) break; }
  await sleep(1500);
  const info1 = await ev(() => ({ zones: __g.G.zones.map((z) => z.type + ':' + z.area.toFixed(2)), spots: __g.G.spots.length, known: __g.mapKnown(), visits: __g.G.visits }));
  console.log('map after first play', JSON.stringify(info1));
  ok('zones grew live while it scanned (several surfaces, no Done scanning)', info1.zones.length >= 4, info1.zones.join(' '));
  await ev(() => { __g.simulate(600, 0.5); __g.persist(true); });
  const saved = await ev(() => ({ map: !!localStorage.getItem('base-camp-map-v1'), save: !!localStorage.getItem('base-camp-save-v2') }));
  ok('autosave wrote the map and the colony (no Save button)', saved.map && saved.save);
  const YAW = 0.5236, SX = 0.6, SZ = -0.4;
  await ev(() => { __g.comeBackLater(); }); await sleep(300);
  const t1 = Date.now(); let lockAt = 0; const tt = await ev(() => 0);
  for (let i = 0; i < 400; i++) { await sleep(500); if (await ev(() => __g.G.locked)) { lockAt = Date.now() - t1; break; } if (await ev(() => __g.RELOC.state === 'asking')) break; }
  const R = await ev(() => ({ lock: __g.RELOC.lock, state: __g.RELOC.state, secs: __g.RELOC.scanSecs, tries: __g.RELOC.tries, ms: __g.RELOC.lastMs, place: __g.PLACE, hist: __g.RELOC.hist.slice(-3).map((h) => h.res && [h.res.M, h.res.ratio.toFixed(2), h.res.info, (h.res.margin || 0).toFixed(2), (h.res.phi * 57.3).toFixed(1)]) }));
  console.log('reloc', JSON.stringify(R));
  ok('returning: "We\u2019re home" automatically with zero taps', R.state === 'locked', 'scan seconds ' + (R.secs || 0).toFixed(1) + ', wall ' + lockAt + ' ms');
  if (R.lock) {
    const pl = R.place, c = Math.cos(pl.yaw), s = Math.sin(pl.yaw); let worst = 0;
    for (const [x, z] of [[0, 0], [1, 1], [-1, -1], [1.2, -1.2], [-1.4, 0.5]]) { const tw = [x * c + z * s + pl.x, -x * s + z * c + pl.z], cp = Math.cos(R.lock.phi), sp = Math.sin(R.lock.phi), sv = [x * cp - z * sp + R.lock.tx, x * sp + z * cp + R.lock.tz]; worst = Math.max(worst, Math.hypot(tw[0] - sv[0], tw[1] - sv[1])); }
    const dphi = Math.atan2(Math.sin(R.lock.phi + pl.yaw), Math.cos(R.lock.phi + pl.yaw));
    console.log('PRACTICE RELOC: yaw error ' + (Math.abs(dphi) * 57.2958).toFixed(2) + ' deg, worst position error ' + (worst * 100).toFixed(1) + ' cm, scan seconds to lock ' + R.lock.scanSecs.toFixed(1));
    ok('the lock is accurate (under 2.5 degrees, under 6 cm)', Math.abs(dphi) < 0.044 && worst < 0.06);
  }
  await sleep(800); await p.screenshot({ path: OUT + '14-we-are-home.png' });
  console.log('errors', errs.slice(0, 5));
  await b.close(); srv.close();
})();
