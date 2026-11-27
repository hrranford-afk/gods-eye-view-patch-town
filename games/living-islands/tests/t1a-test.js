/* T1a picture fixes 1 to 3 (cream shape, film grain moire, sky banding). Software GL, not a device.
   Run: NODE_PATH=$(npm root -g) node tests/t1a-test.js [only=1,2,3] */
import fs from 'node:fs';
import { launch, ROOT } from './shoot.js';
import { checkPng, worldShot } from './pixel-check.js';
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const only = (arg('only') || '1,2,3,4').split(',').map(Number), want = n => only.includes(n);
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const { browser, ctx } = await launch(); const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs, w, h) {
  const p = await ctx.newPage(); p.setDefaultTimeout(300000); await p.setViewportSize({ width: w || 1000, height: h || 625 }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.text()); }); p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs + '&glide=0'); await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  if (/game=gift/.test(qs)) await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 });
  await p.waitForTimeout(3000); return { p, errs };
}
/* ===== 1. the cream shape is a gull: no gull may be drawn within 60 m of the gift camera ===== */
if (want(1)) {
  const { p, errs } = await open('?game=gift&q=high&device=desktop&dev=1');
  const sp = await p.evaluate(() => __gift.spots().build.cottage);
  await p.evaluate(sp => { window.__bad = 0; window.__n = 0; window.__mind = 1e9; window.__gulls = 0; const sc = __li.boatkit.dbg().scene; sc.onBeforeRender = (r, s, c) => { window.__n++; sc.children.forEach(o => { if (o.isMesh && o.geometry && o.geometry.attributes.position.count === 6 && o.material.type === 'MeshBasicMaterial' && o.position.y > 4) { window.__gulls++; const d = o.position.distanceTo(c.position); if (o.visible && d < window.__mind) window.__mind = d; if (o.visible && d < 60) window.__bad++; } }); }; }, sp);
  for (let i = 0; i < 10; i++) { await p.evaluate(([x, z, d]) => __li.setView({ tx: x, tz: z, dist: d, phi: .8, theta: .6 }), [sp.x, sp.z, 12 + (i % 4) * 4]); await p.waitForTimeout(2500); }
  const r = await p.evaluate(() => ({ frames: window.__n, bad: window.__bad, gulls: window.__gulls, mind: window.__mind }));
  ok(r.frames > 5 && r.gulls >= 9 * 5, 'cream shape: the check really looked (' + r.frames + ' rendered frames, ' + r.gulls + ' gull draws considered)');
  ok(r.bad === 0, 'cream shape: no gull quad was drawn within 60 m of the camera at render time in ' + r.frames + ' frames (nearest drawn gull ' + r.mind.toFixed(0) + ' m; before the fix 4 m and 369 bad draws in 54 frames)');
  const buf = await worldShot(p, 'cream-build'); const c = checkPng(buf);
  ok(c.stats.creamCells === 0 || !c.why.some(w => /cream/.test(w)), 'cream shape: no large flat cream quad in the build-site shot (' + JSON.stringify(c.stats) + ')');
  ok(errs.length === 0, 'gift page: 0 console errors' + (errs[0] ? ' ' + errs[0] : '')); await p.close();
}
if (want(4)) {
  const { p, errs } = await open('?ui=0&q=high&seed=1122');
  const r = await p.evaluate(() => ({ hash: __li.hashStatic(), tris: __li.stats().tris }));
  ok(r.hash === '8d962c0c', 'default page hash is 8d962c0c (' + r.hash + ')'); ok(r.tris === 88790, 'default page is 88,790 triangles (' + r.tris + ')');
  ok(errs.length === 0, 'default page: 0 console errors'); await p.close();
}
await browser.close(); console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
