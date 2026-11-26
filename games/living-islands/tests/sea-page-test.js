/* THE WAVE SEA IN THE GIFT, page smoke (headless chromium, software GL: counts and errors only, nothing about speed on a device).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/sea-page-test.js [only=ipad,desktop,radeon] [shots=1]
   Per device (ipad 834x1062 touch, desktop 1280x720, radeon 1280x720): the wave sea is on with the right tier and wave count, the CPU height is finite and follows the weather (a forced gale is higher than calm),
   zero console errors at calm and in a storm, a screenshot of each when shots=1. Also: the default page keeps hash 8d962c0c and 88,790 triangles; &waves=0 keeps the old flat sea. */
import { launch, ROOT } from './shoot.js';
import path from 'node:path';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const only = (arg('only') || 'default,off,ipad,desktop,radeon').split(','), shots = arg('shots') === '1';
const { browser } = await launch(); const NOISE = /GL Driver|GPU stall|ReadPixels/;
const CFG = { ipad: { qs: '&device=ipad', w: 834, h: 1062, touch: true, tier: 'ipad', nw: 8 }, desktop: { qs: '&device=desktop&gpuname=AMD%20Radeon%20VII', w: 1280, h: 720, tier: 'desktop', nw: 16 }, radeon: { qs: '&device=radeon&gpuname=AMD%20Radeon%20VII', w: 1280, h: 720, tier: 'radeon', nw: 24 } };
async function open(qs, w, h, touch) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: !!touch, deviceScaleFactor: 1 }), fs = await import('node:fs');
  if (fs.existsSync('/tmp/three.js')) await c.route('**/three.min.js', r => r.fulfill({ path: '/tmp/three.js', contentType: 'application/javascript' }));
  const p = await c.newPage(); p.setDefaultTimeout(1800000); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs); await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2);
  if (/game=gift/.test(qs)) await p.waitForFunction(() => window.__gift && window.__gift.spots());
  return { p, errs };
}
if (only.includes('default')) { const { p, errs } = await open('?ui=0&q=high&seed=1122', 1280, 720); const r = await p.evaluate(() => ({ h: __li.hashStatic(), t: __li.stats().tris, sea: __li.sea.on() }));
  ok(r.h === '8d962c0c' && r.t === 88790 && !r.sea, 'default page: hash 8d962c0c, 88,790 triangles, no wave sea (' + r.h + ', ' + r.t + ')'); ok(errs.length === 0, 'default page: 0 console errors'); await p.close(); }
if (only.includes('off')) { const { p, errs } = await open('?game=gift&waves=0&device=ipad&ui=0&dev=1&glide=0', 834, 1062, true); const r = await p.evaluate(() => ({ on: __li.sea.on(), t: __li.sea.waterTris() }));
  ok(!r.on && r.t < 300, '&waves=0 keeps the old flat sea (' + r.t + ' triangles)'); ok(errs.length === 0, '&waves=0: 0 console errors'); await p.close(); }
for (const k of ['ipad', 'desktop', 'radeon']) {
  if (!only.includes(k)) continue; const C = CFG[k]; const { p, errs } = await open('?game=gift&ui=0&dev=1&glide=0&wxsea=calm,0' + C.qs, C.w, C.h, C.touch);
  const S = () => p.evaluate(() => ({ on: __li.sea.on(), tier: __li.sea.tier(), nw: __li.sea.nw(), name: __li.sea.name(), hs: __li.sea.hs(), tris: __li.sea.waterTris(), failed: __li.sea.failed(), spray: __li.sea.spray(), st: __li.stats().tris, h: __li.sea.h(10, 20), n: __li.sea.n(10, 20) }));
  const a = await S(); ok(a.on && a.tier === C.tier && a.nw === C.nw && !a.failed, k + ': wave sea on, tier ' + a.tier + ', ' + a.nw + ' waves (want ' + C.nw + ')');
  ok(Number.isFinite(a.h) && a.n.every(Number.isFinite), k + ': the CPU height and normal are finite'); console.log('INFO ' + k + ' calm: sea ' + a.tris + ' triangles, scene ' + a.st + ', Hs ' + a.hs.toFixed(2) + ' m, spray ' + JSON.stringify(a.spray));
  ok(errs.length === 0, k + ' calm: 0 console errors' + (errs[0] ? ' ' + errs[0] : '')); if (shots) await p.screenshot({ path: path.join(ROOT, 'shots', 'sea-' + k + '-calm.png') });
  await p.evaluate(() => __li.sea.force('gale', 1)); await p.evaluate(() => __li.sea.freeze(false)); await p.waitForTimeout(3000);
  const b = await p.evaluate(() => ({ name: __li.sea.name(), hs: __li.sea.hs(), spray: __li.sea.spray() }));
  ok(b.name === 'gale', k + ': forced to a gale'); await p.waitForTimeout(+arg('settle') || 20000); const c2 = await S(); ok(c2.hs > a.hs * 1.5, k + ': the sea rises with the weather (Hs ' + a.hs.toFixed(2) + ' to ' + c2.hs.toFixed(2) + ' m after settling)');
  ok(errs.length === 0, k + ' storm: 0 console errors' + (errs[0] ? ' ' + errs[0] : '')); if (shots) await p.screenshot({ path: path.join(ROOT, 'shots', 'sea-' + k + '-storm.png') }); await p.close();
}
console.log('\n' + (fails ? fails + ' FAILED of ' + n : 'all ' + n + ' passed')); await browser.close(); process.exit(fails ? 1 : 0);
