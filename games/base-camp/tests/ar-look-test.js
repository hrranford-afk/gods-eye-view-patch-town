// Base Camp build 7, what the AR view looks like on a CLUTTERED room: a busy test picture stands in for the camera feed (a fixed div behind the transparent canvas).
// Checks: no tall clutter towers, no floor wash, a compact toolbar, small top toast, colony markers. Screenshots go to shots/20-ar-look-*.png (landscape and portrait).
// Run:  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node games/base-camp/tests/ar-look-test.js
const fs = require('fs'), path = require('path');
const { serve, ROOT } = require('./lib.js'); const install = require('./ar-fake.js'); const { chromium } = require('playwright');
const POLY = fs.readFileSync(path.join(ROOT, 'webxr-polyfill.js'), 'utf8'); const OUT = path.join(ROOT, 'shots') + '/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const ROOM = [['floor', -1.2, 0, -1.5, 1.4, 1.4], ['desk', -0.55, -0.6, -2.6, 0.5, 0.3]]; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 34; i++) { const h = 0.05 + rnd() * 0.5, hw = 0.04 + rnd() * 0.1; ROOM.push(['bump' + i, -1.2 + h, (rnd() - 0.5) * 2.3, -1.5 + (rnd() - 0.5) * 2.3, hw, hw * (0.6 + rnd() * 0.8)]); }
(async () => {
  const { srv, url } = await serve(); const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 820, height: 1180 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
  await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 16, precipitation: 0, rain: 0, cloud_cover: 20, weather_code: 1, is_day: 1, wind_speed_10m: 4 }, daily: { sunrise: ['2026-11-11T07:10'], sunset: ['2026-11-11T16:20'] } }) }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|GL Driver|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await install(p, ROOM); await p.addInitScript({ content: POLY }); const ev = (f, a) => p.evaluate(f, a);
  await p.goto(url); await sleep(2500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await p.reload(); await sleep(2500);
  if (process.env.NO_OVERLAY) await ev(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
  await ev(() => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading';
    const c = document.createElement('canvas'); c.width = 400; c.height = 560; const g = c.getContext('2d'); let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 420; i++) { g.fillStyle = 'hsl(' + Math.floor(r() * 360) + ',' + Math.floor(25 + r() * 50) + '%,' + Math.floor(25 + r() * 50) + '%)'; g.fillRect(r() * 400, r() * 560, 10 + r() * 70, 6 + r() * 50); }
    const d = document.createElement('div'); d.id = 'fakeCam'; window.__bgUrl = c.toDataURL('image/jpeg', 0.8); });
  await p.click('#bPlay'); await sleep(800);
  await ev(() => { document.documentElement.style.setProperty('background', 'url(' + window.__bgUrl + ') center/cover', 'important'); }); // the stand-in camera feed
  await ev(() => { const T = window.__place(), look = (tx, ty, tz, off, hgt, ay, ap, dur) => { const q = [tx + off[0], ty + hgt, tz + off[1]], fx = tx - q[0], fy = ty - q[1], fz = tz - q[2], L = Math.hypot(fx, fy, fz); return { p: q, yaw: Math.atan2(-fx / L, -fz / L), pitch: Math.asin(fy / L), ay, ap, dur }; };
    window.__cam.path = [look(0, -1.2, -1.5, [0, 1.3], 1.6, 0.6, 0.25, 14), look(0.4, -1.2, -1.2, [0.3, 0.6], 1.3, 0.5, 0.2, 14), look(-0.4, -1.2, -1.8, [-0.2, 0.8], 1.3, 0.5, 0.2, 14), look(0, -1.2, -1.5, [0.3, -0.4], 1.7, 0.7, 0.25, 14)]; window.__cam.mode = 'sweep'; window.__cam.t0 = performance.now(); window.__cam.speed = 1; window.__cam.done = false; });
  const t0 = Date.now(); while (Date.now() - t0 < 120000) { await sleep(2000); if (await ev(() => window.__cam.done)) await ev(() => { window.__cam.t0 = performance.now(); window.__cam.done = false; }); if (await ev(() => __g.G.settlements.length > 0 && __g.AUTO.t > 70)) break; }
  await ev(() => { __g.toast('Smarter recognition on'); });
  await sleep(500); await p.screenshot({ path: OUT + '20-ar-look-portrait.png' });
  const S = await ev(() => ({ zones: __g.G.zones.length, objs: __g.G.zones.reduce((a, z) => a + z.land.objs.length, 0), tall: __g.G.zones.reduce((a, z) => a + (z.towers ? z.towers.children.filter((c) => c.visible && c.geometry && c.geometry.type === 'BoxGeometry').length : 0), 0), foot: __g.G.zones.reduce((a, z) => a + (z.towers ? z.towers.children.filter((c) => c.visible).length : 0), 0), bar: document.getElementById('bar').getBoundingClientRect().height, barW: document.getElementById('bar').getBoundingClientRect().width, toastTop: document.getElementById('toast').getBoundingClientRect().top, barTop: document.getElementById('bar').getBoundingClientRect().top, ring: __g.G.settlements.reduce((a, s) => a + s.cols.length, 0), H: innerHeight }));
  console.log(JSON.stringify(S));
  ok('clutter is found (many bumps) but no tall box is drawn', S.objs >= 5 && S.tall === 0, JSON.stringify({ objs: S.objs, tall: S.tall, footprints: S.foot }));
  ok('the toolbar is one compact row (under 70 px tall, portrait)', S.bar < 70, S.bar + ' px');
  ok('the toast is at the top, away from the toolbar', S.toastTop < S.H / 3 && S.toastTop < S.barTop);
  await sleep(2500); const gone = await ev(() => ({ toast: document.getElementById('toast').innerText, foot: __g.G.zones.reduce((a, z) => a + (z.towers ? z.towers.children.filter((c) => c.visible && c.userData.t0 && performance.now() - c.userData.t0 > 2300).length : 0), 0) })); // footprints older than 2 s are gone (newer ones may still be fresh)
  ok('the toast faded after about 2 s and the footprints are gone', gone.toast === '' && gone.foot === 0, JSON.stringify(gone));
  await p.click('#bCollapse'); await sleep(300); await p.screenshot({ path: OUT + '20-ar-look-collapsed.png' });
  ok('the toolbar collapses to one round button and comes back', await ev(() => document.getElementById('bar').getBoundingClientRect().width < 70 && !!document.getElementById('bExpand')));
  await p.click('#bExpand'); await sleep(200);
  await ev(() => { const S = __g.G.settlements[0]; window.__cam.mode = 'fixed'; window.__cam.fixed = [S.tf.x + 0.1, S.tf.y + 0.45, S.tf.z + 0.35, 0, -1.0]; }); await sleep(1500); await p.screenshot({ path: OUT + '20-ar-look-colony.png' });
  // colony off screen: turn the camera away
  await ev(() => { window.__cam.mode = 'fixed'; window.__cam.fixed = [0.2, 0.5, 0.2, 3.0, -0.2]; }); await sleep(1500); await p.screenshot({ path: OUT + '20-ar-look-away.png' });
  ok('a marker points to the colony when it is off screen', await ev(() => !document.getElementById('colMark').hidden));
  ok('0 page errors', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  const f = res.filter((r) => !r).length; console.log(f ? f + ' FAILED' : 'ALL ' + res.length + ' PASSED'); await b.close(); srv.close(); process.exit(f ? 1 : 0);
})();
