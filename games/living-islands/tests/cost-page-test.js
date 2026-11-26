/* COST LADDER PAGE SMOKE TEST (headless chromium, software GL / SwiftShader: NOT a device, the milliseconds it prints say nothing about any real iPad, desktop or Radeon).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/cost-page-test.js [only=ipad,desktop,radeon,default] [quick=1]
   Checks, for device=ipad (834x1062, touch), device=desktop and device=radeon (1280x720), each WITH and WITHOUT &cost=1, on the Gift page:
     zero console errors or warnings (the driver's own GL lines are left out as in the other page tests);
     without &cost=1: no panel, no __li.cost, neither cost_ladder.js nor tiers.js loaded (nothing changes);
     with &cost=1: the panel with its warning, Start, Stop and Copy report; a Start runs a short ladder (&costrungs=...) and ends by itself with a report that names the renderer string, the pixel ratio, the canvas
     size, the method, the baseline, the 'estimated headroom at 60 fps' and a row per rung; everything is put back (canvas size, MSAA, shadow map, triangles, hash);
     the stop rule: &costmax=1 stops the run at the first rung and says so; the Stop button stops a run;
     the default page (no switches) keeps hash 8d962c0c and 88,790 triangles, also with &cost=1. */
import fs from 'node:fs';
import { launch, ROOT } from './shoot.js';
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const onlyArg = ((process.argv.find(a => a.startsWith('only=')) || '').split('=')[1] || '').split(',').filter(Boolean);
const want = k => !onlyArg.length || onlyArg.includes(k);
const quick = process.argv.includes('quick=1');
const { browser, ctx: c0 } = await launch(); await c0.close();
const NOISE = /GL Driver|GPU stall|ReadPixels/;
const RUNGS = quick ? 'sea,post,scale0.5' : 'sea,props,sky,particles,shadows,post,msaa,scale0.5,scale1.5';
async function open(qs, w, h, touch) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: !!touch, deviceScaleFactor: 1 });
  if (fs.existsSync('/tmp/three.js')) await c.route('**/three.min.js', r => r.fulfill({ path: '/tmp/three.js', contentType: 'application/javascript' }));
  const p = await c.newPage(); p.setDefaultTimeout(900000); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs);
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  if (/game=gift/.test(qs)) await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }).catch(() => { });
  await p.waitForTimeout(1500);
  return { p, errs, c };
}
const state = p => p.evaluate(() => { const s = __li.ultra.state(); return { canvas: s.canvas.join('x'), msaa: s.msaaGot, shadow: s.shadow, tier: s.tier, tris: __li.stats().tris, hash: __li.hashStatic() }; });
const GIFT = '&game=gift&glide=0&dev=1&physical=0&stepdown=0';
const CFG = { ipad: [834, 1062, true], desktop: [1280, 720, false], radeon: [1280, 720, false] };
const finishRun = p => p.waitForFunction(() => { const s = __li.cost.state(); return !s.running && s.data; }, null, { timeout: 1500000, polling: 1500 });

for (const dev of ['ipad', 'desktop', 'radeon']) {
  if (!want(dev)) continue;
  const [w, h, touch] = CFG[dev];
  /* ---- without the switch ---- */
  {
    const t0 = Date.now(); const r = await open('?device=' + dev + GIFT, w, h, touch);
    ok(r.errs.length === 0, dev + ' without cost: 0 console errors/warnings' + (r.errs.length ? ': ' + r.errs.slice(0, 2).join(' | ') : ''));
    const g = await r.p.evaluate(() => ({ panel: !!document.getElementById('costp'), api: !!(window.__li && window.__li.cost), lib: typeof window.LI_COST, tiers: typeof window.LI_TIERS }));
    ok(!g.panel && !g.api && g.lib === 'undefined' && g.tiers === 'undefined', dev + ' without cost: no panel, no __li.cost, neither cost_ladder.js nor tiers.js is loaded');
    await r.c.close(); console.log('   (' + dev + ' plain took ' + Math.round((Date.now() - t0) / 1000) + ' s)');
  }
  /* ---- with the switch ---- */
  {
    const t0 = Date.now(); const r = await open('?device=' + dev + '&cost=1&costn=1&costmax=1000000&costrungs=' + RUNGS + GIFT, w, h, touch);
    ok(r.errs.length === 0, dev + ' with cost=1: 0 console errors/warnings' + (r.errs.length ? ': ' + r.errs.slice(0, 2).join(' | ') : ''));
    const pan = await r.p.evaluate(() => { const p = document.getElementById('costp'); return p ? { go: !!p.querySelector('#costGo'), stop: !!p.querySelector('#costStop'), copy: !!p.querySelector('#costCopy'), warn: /Warning/.test(p.textContent) && /stop by itself|stops by itself/.test(p.textContent), lib: typeof window.LI_COST, tiers: typeof window.LI_TIERS } : null; });
    ok(pan && pan.go && pan.stop && pan.copy && pan.warn && pan.lib === 'object' && pan.tiers === 'object', dev + ' with cost=1: the panel has the warning, Start, Stop and Copy report; both scripts are loaded');
    const before = await state(r.p);
    await r.p.click('#costGo');
    await finishRun(r.p);
    const rep = await r.p.evaluate(() => __li.cost.report()), st = await r.p.evaluate(() => { const s = __li.cost.state(); return { rows: s.rows.length, data: { stopped: s.data.stopped || '', baseMs: s.data.baseMs, K: s.data.K } }; });
    ok(/^Living Islands cost ladder/.test(rep) && /renderer: \S/.test(rep) && /device pixel ratio: \d/.test(rep) && /canvas: \d+x\d+ px/.test(rep), dev + ': the report names the renderer, the pixel ratio and the canvas size');
    ok(/method: .*gl\.finish\(\).*readPixels/.test(rep) && /GPU timer \(EXT_disjoint_timer_query_webgl2\): (present|not available)/.test(rep), dev + ': the report says which method was used and whether the GPU timer exists');
    ok(/estimated headroom at 60 fps: -?\d+\.\d\d ms/.test(rep) && /BASELINE: \d+\.\d\d ms per scene render/.test(rep), dev + ': the report has the baseline and the estimated headroom at 60 fps');
    ok(st.rows >= (quick ? 3 : 9) && st.data.stopped === '' && /sea \(water mesh/.test(rep) && /resolution 0\.5x/.test(rep), dev + ': the ladder ran by itself to the end (' + st.rows + ' rungs, no stop)');
    ok(!/\/home\/|\/Users\/|C:\\|file:\/\/|\/tmp\//.test(rep) && !/NaN|undefined/.test(rep), dev + ': the report has no path and no NaN');
    const after = await state(r.p);
    const same = after.canvas === before.canvas && after.msaa === before.msaa && after.shadow === before.shadow && after.hash === before.hash && Math.abs(after.tris - before.tris) <= before.tris * 0.10;   /* the Gift scene moves by itself (boats, kit detail levels): its visible triangle count drifts a few percent with time, so that one gets 10 percent; the exact check is the layer flags below */
    const chk = await r.p.evaluate(() => __li.cost.check()); ok(chk.layersVisible && chk.shadowsOn, dev + ': the sea, terrain and props are visible again and the shadow map is on and updating (' + JSON.stringify(chk) + ')');
    ok(same, dev + ': everything is put back (canvas ' + after.canvas + ', msaa ' + after.msaa + ', shadow ' + after.shadow + ', triangles ' + before.tris + ' to ' + after.tris + ', hash ' + after.hash + ')' + (same ? '' : ' BEFORE ' + JSON.stringify(before)));
    ok(r.errs.length === 0, dev + ' after the run: still 0 console errors/warnings' + (r.errs.length ? ': ' + r.errs.slice(0, 2).join(' | ') : ''));
    await r.c.close(); console.log('   (' + dev + ' ladder took ' + Math.round((Date.now() - t0) / 1000) + ' s)');
  }
}

/* ---- the stop rules (small window, ipad preset) ---- */
if (want('stop')) {
  let r = await open('?device=ipad&cost=1&costn=1&costmax=1&costrungs=sea,post' + GIFT, 400, 500, true);
  await r.p.click('#costGo'); await finishRun(r.p);
  let d = await r.p.evaluate(() => __li.cost.state().data), rep = await r.p.evaluate(() => __li.cost.report());
  ok(/over the 1 ms limit/.test(d.stopped || '') && /STOPPED:/.test(rep) && d.rows.length === 0, 'stop rule: a plain frame over the limit stops the ladder before any layer is changed, and says so');
  ok(r.errs.length === 0, 'stop rule: 0 console errors/warnings'); await r.c.close();
  r = await open('?device=ipad&cost=1&costn=1&costmax=1000000' + GIFT, 400, 500, true);
  await r.p.click('#costGo');
  await r.p.evaluate(() => new Promise(res => { const t = () => { if (/rung 2\//.test(__li.cost.state().progress)) { document.getElementById('costStop').click(); res(); } else requestAnimationFrame(t); }; t(); }));   /* the Stop button, pressed in the page the moment rung 2 starts */
  await finishRun(r.p);
  d = await r.p.evaluate(() => __li.cost.state().data); const sz = await state(r.p);
  ok(/Stop button/.test(d.stopped || '') && d.rows.length >= 1 && d.rows.length < 14, 'stop rule: the Stop button ends the run with a note after ' + d.rows.length + ' rungs');
  ok(sz.canvas === '400x500' && r.errs.length === 0, 'stop rule: after Stop the canvas is back to ' + sz.canvas + ' and there are 0 console errors'); await r.c.close();
}

/* ---- the default page is untouched ---- */
if (want('default')) {
  for (const qs of ['?ui=0&q=high&seed=1122', '?ui=0&q=high&seed=1122&cost=1']) {
    const r = await open(qs, 640, 400, false);
    const i = await r.p.evaluate(() => ({ h: __li.hashStatic(), t: __li.stats().tris }));
    ok(i.h === '8d962c0c' && i.t === 88790, 'default page ' + qs + ': hash 8d962c0c and 88,790 triangles (' + i.h + ', ' + i.t + ')');
    ok(r.errs.length === 0, 'default page ' + qs + ': 0 console errors/warnings' + (r.errs.length ? ': ' + r.errs[0] : '')); await r.c.close();
  }
}
console.log('cost-page-test: ' + (n - fails) + ' passed, ' + fails + ' failed');
await browser.close();
process.exit(fails ? 1 : 0);
