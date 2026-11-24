/* ULTRA PAGE TEST: the ultra tier in islands_look.html (headless chromium, software GL, a small window so the heavy tier finishes).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/ultra-page-test.js [only=name,name]
   Checks: 0 console errors or warnings (the driver's own GL messages and GPU stall notes are left out, as in the other page tests) on default, high, low, ultra, ultra with every switch,
   post=0, the AR profile and the page features (&start=camp &boatkit=1 &repair=1 &clock=1 &light=1 &moods=1 ?world=1&life=1); the HUD names a GPU; the Quality button cycles Low, High, Ultra
   (and two states in AR); the choice is remembered; a failed render target falls back down the ladder with no console error; high and low keep their old settings; the bench panel and its
   report. Software GL cannot say how fast a real card is: these tests only prove that nothing breaks and that the settings are applied. */
import path from 'node:path';
import fs from 'node:fs';
import { launch, ROOT } from './shoot.js';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const only = ((process.argv.find(a => a.startsWith('only=')) || '').split('=')[1] || '').split(',').filter(Boolean);
const want = n => !only.length || only.includes(n);
const { browser, ctx: ctx0 } = await launch(); await ctx0.close();
const local = process.env.THREE_JS || '/tmp/three.js';
async function newCtx() {
  const c = await browser.newContext({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 });
  if (fs.existsSync(local)) await c.route('**/three.min.js', r => r.fulfill({ path: local, contentType: 'application/javascript' }));
  return c;
}
const ctx = await newCtx();
const NOISE = /GL Driver Message|GPU stall|ReadPixels/;
async function open(c, qs, wait) {
  const page = await c.newPage(), errs = [];
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + path.join(ROOT, 'islands_look.html') + qs);
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 240000 });
  if (wait) await wait(page);
  await page.waitForTimeout(1500);
  return { page, errs };
}
async function run(name, qs, check, wait) {
  if (!want(name)) return;
  const t0 = Date.now(); let r;
  try { r = await open(ctx, qs, wait); } catch (e) { ok(false, name + ': failed to load: ' + String(e).slice(0, 200)); return; }
  ok(r.errs.length === 0, name + ': 0 console errors/warnings' + (r.errs.length ? ': ' + r.errs.slice(0, 3).join(' | ') : ''));
  try { await check(r.page, r); } catch (e) { ok(false, name + ': check threw ' + String(e).slice(0, 200)); }
  const late = r.errs.length; await r.page.waitForTimeout(300); if (r.errs.length !== late) ok(false, name + ': late console error ' + r.errs[r.errs.length - 1]);
  await r.page.close(); console.log('   (' + name + ' took ' + Math.round((Date.now() - t0) / 1000) + ' s)');
}
const U = p => p.evaluate(() => __li.ultra.state()), G = p => p.evaluate(() => __li.ultra.gpu());
const hud = p => p.evaluate(() => ({ gpu: document.getElementById('gpuInfo').textContent, info: document.getElementById('info').textContent, btn: document.getElementById('qBtn').textContent }));
const gpuShown = async (p, n) => { const h = await hud(p), g = await G(p); ok(/^GPU: \S/.test(h.gpu) && g.name.length > 0 && h.gpu.includes(g.name), n + ': HUD shows a GPU name (' + h.gpu.slice(0, 70) + ')'); };

/* ---- the three plain tiers ---- */
await run('default', '?seed=1122', async p => {
  const h = await hud(p), s = await U(p); await gpuShown(p, 'default');
  ok(h.btn === 'Quality: High' && !s.on && s.tier === 'high', 'default: Quality: High, ultra off');
  ok(await p.evaluate(() => document.getElementById('benchBtn').style.display === 'none'), 'default: the Bench button is hidden');
  const st = await p.evaluate(() => __li.stats()); ok(st.quality === 'high', 'default: stats().quality is high');
});
await run('high', '?ui=0&q=high&seed=1122', async p => {
  const s = await U(p), st = await p.evaluate(() => __li.stats()); ok(!s.on, 'high: ultra off');
  ok(s.shadowType === 'PCFSoft' && s.big === null, 'high: soft PCF shadow type and no big render target');
  ok(st.tris === 88790, 'high: 88,790 triangles (' + st.tris + ')');
});
await run('low', '?ui=0&q=low&seed=1122', async p => { const s = await U(p), st = await p.evaluate(() => __li.stats()); ok(!s.on && s.shadowType === 'PCFSoft' && st.quality === 'low', 'low: tier low, ultra off (' + st.tris + ' triangles)'); });

/* ---- ultra and every switch ---- */
await run('ultra', '?q=ultra&seed=1122', async p => {
  const s = await U(p), h = await hud(p); await gpuShown(p, 'ultra');
  ok(s.on && s.tier === 'ultra' && h.btn === 'Quality: Ultra', 'ultra: tier ultra, button says Ultra');
  ok(s.msaaGot > 0 && s.msaaGot <= s.caps.maxSamples, 'ultra: multisample target made (' + s.msaaGot + ' of at most ' + s.caps.maxSamples + ')');
  ok(s.shadow === 4096 && s.shadowType === 'PCF' && s.shadowRadius > 1, 'ultra: 4096 shadow map, soft PCF with radius ' + s.shadowRadius);
  ok(s.fitHalf > 5 && s.fitHalf <= 96, 'ultra: shadow frustum fitted (half width ' + s.fitHalf.toFixed(1) + ' m)');
  ok(s.aniso === s.maxAniso && s.aniso >= 1, 'ultra: anisotropy at the GPU maximum (' + s.aniso + ')');
  ok(s.terrainCell === 0.4 && s.tris > 100000, 'ultra: finer terrain, ' + s.tris + ' triangles');
  ok(/ultra/.test(h.info) && /scale/.test(h.info), 'ultra: HUD line shows the tier and the scale');
  ok(await p.evaluate(() => document.getElementById('benchBtn').style.display !== 'none'), 'ultra: the Bench button shows');
  ok(s.dynOn === false && s.notes.length > 0, 'ultra on software GL: scale kept at 1 and a note says why (' + s.notes.join('; ') + ')');
});
await run('ultra-all-switches', '?q=ultra&ssaa=1.5&msaa=4&shadow=2048&herolod=0&terrain=0.5&bloom=0.2&aniso=4&soft=2&fit=0&dyn=0&fps=30&bench=1', async p => {
  const s = await U(p); await gpuShown(p, 'switches');
  ok(s.on && s.scale === 1.5 && s.scaleReal === 1.5 && s.big && s.big[0] === 960 && s.big[1] === 600, 'switches: &ssaa=1.5 &dyn=0 pins the scale at 1.5, big target ' + JSON.stringify(s.big) + ' for a 640x400 canvas');
  ok(s.shadow === 2048 && s.msaaGot === 4 && s.terrainCell === 0.5 && s.bloom === 0.2 && s.aniso === 4 && s.shadowRadius === 2 && s.fitHalf === 0, 'switches: shadow 2048, msaa 4, terrain 0.5, bloom 0.2, aniso 4, soft 2, fit off');
  ok(await p.evaluate(() => __li.ultra.panelVisible()), 'switches: &bench=1 shows the bench panel');
});
await run('ultra-dynamic', '?q=ultra&ssaa=1.5&seed=1122', async p => {
  const s = await U(p); ok(s.dynOn && s.maxScale === 1.5 && s.scale >= 1 && s.scale <= 1.5, 'dynamic: on, range 1.0 to 1.5, now ' + s.scale);
  const c = await p.evaluate(() => __li.ultra.ctl()); ok(c && c.scale >= 1 && c.scale <= 1.5, 'dynamic: the controller state is readable');
});
await run('ultra-msaa0-ssaa1', '?q=ultra&ssaa=1&msaa=0&bloom=0&shadow=1024', async p => { const s = await U(p); ok(s.on && s.msaaGot === 0 && s.big === null && s.shadow === 1024, 'plain ultra settings: no multisampling, no big target, shadow 1024'); });
await run('ultra-post0', '?q=ultra&post=0&ssaa=1.25&dyn=0&seed=1122', async p => { const s = await U(p); ok(s.on && s.canvas[0] === 800 && s.canvas[1] === 500, 'post=0 + ultra: the canvas itself is the big target (' + s.canvas.join('x') + ')'); });
await run('high-moods', '?ui=0&q=high&moods=1&weather=auto&seed=1122', async p => { ok(await p.evaluate(() => !!__li.moods) && !(await U(p)).on, 'high + moods: the weather patch of the post shader still applies (uniform line untouched)'); });
await run('post0', '?ui=0&post=0&q=high&seed=1122', async p => { const s = await U(p); ok(!s.on, 'post=0 high: ultra off'); });

/* ---- a 4K-class window: the scale may go below native, the UI grows, the panel names the real pixels ---- */
if (want('ultra-4k')) {
  const c4 = await browser.newContext({ viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 1 });
  if (fs.existsSync(local)) await c4.route('**/three.min.js', r => r.fulfill({ path: local, contentType: 'application/javascript' }));
  try {
    const r = await open(c4, '?q=ultra&msaa=0&bloom=0&shadow=1024&bench=1&seed=1122');
    ok(r.errs.length === 0, 'ultra-4k: 0 console errors/warnings' + (r.errs.length ? ': ' + r.errs[0] : ''));
    const rg = await r.page.evaluate(() => __li.ultra.range()), ui = await r.page.evaluate(() => __li.ultra.ui()), st = await U(r.page);
    ok(rg.min === 0.5 && Math.abs(rg.max - 1800 / 2160) < 1e-6 && rg.big && rg.profile === 'tv', 'ultra-4k: profile tv, range 0.5 to 0.833 (1800p internal): ' + JSON.stringify(rg));
    ok(ui === 3 && await r.page.evaluate(() => document.getElementById('top').style.zoom === '3'), 'ultra-4k: UI scale 3 (tv profile 1.5 x 3840/1920 css) at 1x');
    ok(st.canvas[0] === 3840 && st.canvas[1] === 2160 && st.big && st.big[0] === 3200 && st.big[1] === 1800, 'ultra-4k: canvas 3840x2160 real pixels, internal 3200x1800 (' + JSON.stringify(st.big) + ') upscaled by the present pass');
    await r.page.evaluate(() => __li.ultra.setScale(0.5)); await r.page.waitForFunction(() => __li.ultra.state().big && __li.ultra.state().big[0] === 1920, null, { timeout: 240000 });
    const s2 = await U(r.page); ok(s2.big[1] === 1080 && s2.canvas[0] === 3840, 'ultra-4k: scale 0.5 renders 1920x1080 and upscales to the 3840x2160 canvas');
    const txt = await r.page.evaluate(() => __li.ultra.panelText()); ok(/canvas 3840x2160 px/.test(txt) && /device pixel ratio 1.00/.test(txt), 'ultra-4k: the panel shows canvas pixels and the device pixel ratio');
    await r.page.close();
  } catch (e) { ok(false, 'ultra-4k threw ' + String(e).slice(0, 200)); }
  await c4.close();
}
/* ---- the AR profile caps itself at high ---- */
await run('ar', '?tier=ar&q=ultra&seed=1122', async p => {
  const s = await U(p), h = await hud(p); ok(!s.on && h.btn === 'Quality: High', 'AR: q=ultra is refused, the tier is high');
  const seen = [], nx = ['Quality: Low', 'Quality: High', 'Quality: Low', 'Quality: High']; for (let i = 0; i < 4; i++) { await p.evaluate(() => document.getElementById('qBtn').click()); await p.waitForFunction(t => document.getElementById('qBtn').textContent === t, nx[i], { timeout: 120000 }); seen.push((await hud(p)).btn); }
  ok(seen.join('|') === 'Quality: Low|Quality: High|Quality: Low|Quality: High', 'AR: the button has two states (' + seen.join(' > ') + ')');
});
await run('ar-clock', '?clock=1&clockdome=0&q=ultra&seed=1122', async p => { const s = await U(p); ok(!s.on, 'AR (&clockdome=0): ultra refused'); });

/* ---- the Quality button cycles three states; the choice is remembered ---- */
if (want('cycle')) {
  const c2 = await newCtx(); await c2.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });
  const r = await open(c2, '?seed=1122'); const seen = [await r.page.evaluate(() => document.getElementById('qBtn').textContent)];
  const next = ['Quality: Ultra', 'Quality: Low', 'Quality: High'];   /* a click is handled a moment later on a loaded machine: wait for the label, not for a fixed time */
  for (let i = 0; i < 3; i++) { await r.page.evaluate(() => document.getElementById('qBtn').click()); await r.page.waitForFunction(t => document.getElementById('qBtn').textContent === t, next[i], { timeout: 120000 }); seen.push(next[i]); }
  ok(seen.join('|') === 'Quality: High|Quality: Ultra|Quality: Low|Quality: High', 'cycle: High > Ultra > Low > High (' + seen.join(' > ') + ')');
  ok(r.errs.length === 0, 'cycle: 0 console errors while cycling' + (r.errs.length ? ': ' + r.errs[0] : ''));
  { const f0 = await r.page.evaluate(() => window.__liFrames); await r.page.waitForFunction(f => window.__liFrames > f + 2, f0, { timeout: 120000 }); }
  await r.page.evaluate(() => document.getElementById('qBtn').click()); await r.page.waitForFunction(() => localStorage.getItem('li.quality') === 'ultra', null, { timeout: 120000 });
  ok(true, 'cycle: the choice is stored in localStorage');
  await r.page.close();
  const r2 = await open(c2, '?seed=1122');
  ok(await r2.page.evaluate(() => document.getElementById('qBtn').textContent) === 'Quality: Ultra' && (await U(r2.page)).on, 'cycle: a reload with no &q comes back in Ultra');
  await r2.page.close();
  const r3 = await open(c2, '?seed=1122&q=high');
  ok(await r3.page.evaluate(() => document.getElementById('qBtn').textContent) === 'Quality: High', 'cycle: an explicit &q=high beats the stored choice');
  await r3.page.close();
  /* automation does not read the stored choice, so the other tests (and look-test) keep seeing the plain default */
  const r4 = await open(ctx, '?seed=1122'); ok(await r4.page.evaluate(() => document.getElementById('qBtn').textContent) === 'Quality: High', 'cycle: under automation the stored choice is ignored');
  await r4.page.close(); await c2.close();
}

/* ---- the failure ladder: a render target that cannot be made falls back, no console errors ---- */
await run('fallback', '?q=ultra&ssaa=1.5&msaa=4&seed=1122&dyn=0', async (p, r) => {
  await p.evaluate(() => { __li.ultra.forceFail(2); __li.ultra.remake(); });
  await p.waitForTimeout(1500);
  const s = await U(p);
  ok(s.fails.length >= 2 && s.on, 'fallback: two failures noted (' + s.fails.join(' | ').slice(0, 160) + ')');
  ok(s.msaaGot === 2 && s.big && s.big[0] === 800, 'fallback: ended on 2 samples at scale 1.25 (' + s.msaaGot + ' samples, big ' + JSON.stringify(s.big) + ')');
  await p.evaluate(() => { __li.ultra.forceFail(99); __li.ultra.remake(); }); await p.waitForTimeout(2500);
  const t = await U(p); ok(!t.on && t.tier === 'high', 'fallback: when nothing works the page drops to High (' + t.tier + ')');
});

/* ---- the bench panel ---- */
await run('bench', '?q=ultra&bench=1&ssaa=1&seed=1122', async p => {
  ok(await p.evaluate(() => { const t = __li.ultra.panelText(); return /frame .* ms avg/.test(t) && /draw calls \d+/.test(t) && /triangles/.test(t) && /render scale/.test(t); }), 'bench: the panel shows frame ms, p95, draw calls, triangles and scale');
  ok(await p.evaluate(() => /GPU: /.test(document.getElementById('benchGpu').textContent)), 'bench: the panel shows the GPU');
  await p.evaluate(() => __li.ultra.benchStart());
  await p.waitForFunction(() => !__li.ultra.benchRunning(), null, { timeout: 120000 });
  const rep = await p.evaluate(() => ({ r: __li.ultra.benchResult(), text: __li.ultra.report(), ta: document.getElementById('benchTa').value }));
  ok(rep.r && rep.r.seconds >= 9.5 && rep.r.frames > 3 && isFinite(rep.r.avgFps) && isFinite(rep.r.p95), 'bench: a 10 s run reports ' + rep.r.frames + ' frames, ' + rep.r.avgFps.toFixed(1) + ' fps, p95 ' + rep.r.p95.toFixed(0) + ' ms');
  ok(/too heavy|near the limit|plenty of headroom/.test(rep.r.verdict), 'bench: a verdict (' + rep.r.verdict + ')');
  ok(rep.text === rep.ta && /GPU: /.test(rep.text) && /verdict:/.test(rep.text), 'bench: the report is in a text box and starts "Living Islands bench"');
});

/* ---- the four &device= presets: defaults only, explicit params win, the readout names the preset ---- */
const info = p => p.evaluate(() => document.getElementById('info').textContent);
await run('device-ar', '?device=ar&seed=1122', async p => { const s = await U(p), st = await p.evaluate(() => __li.stats()); ok(!s.on && st.quality === 'low' && /device ar/.test(await info(p)), 'device=ar: low, ultra off, AR tier (readout: ' + (await info(p)).split('\n')[0].slice(-30) + ')'); ok(await p.evaluate(() => __li.ultra.device()) === 'ar' && await p.evaluate(() => new URLSearchParams(location.search).get('tier') === null), 'device=ar: the URL itself is untouched, the preset only fills defaults'); });
await run('device-ipad', '?device=ipad&seed=1122', async p => { const s = await U(p), st = await p.evaluate(() => __li.stats()); ok(!s.on && st.quality === 'low' && /device ipad/.test(await info(p)), 'device=ipad: low, no ultra effects'); ok(await p.evaluate(() => document.body.classList.contains('dev-touch') && parseInt(getComputedStyle(document.getElementById('homeBtn')).minHeight) >= 52), 'device=ipad: bigger touch targets (52 px)'); });
await run('device-desktop', '?device=desktop&seed=1122', async p => { const s = await U(p); ok(s.on && s.shadow === 2048 && s.bloom === 0 && s.terrainCell === 0.55 && s.maxScale <= 1.25 && /device desktop/.test(await info(p)), 'device=desktop: ultra effects, light: shadow 2048, no bloom, terrain 0.55, scale up to 1.25 (' + JSON.stringify({ sh: s.shadow, ms: s.maxScale, cell: s.terrainCell }) + ')'); ok(s.msaaGot > 0 && s.msaaGot <= 4, 'device=desktop: 4 samples at most'); });
await run('device-radeon', '?device=radeon&ssaa=1.5&seed=1122', async p => { const s = await U(p); ok(s.on && s.shadow === 4096 && s.maxScale === 1.5 && /device radeon/.test(await info(p)), 'device=radeon: everything in ultra (shadow 4096), explicit &ssaa=1.5 wins'); ok(await p.evaluate(() => __li.ultra.panelVisible()), 'device=radeon: the bench panel is on'); ok(/^GPU: \S/.test((await hud(p)).gpu), 'device=radeon: the GPU readout is on'); });
await run('device-explicit', '?device=radeon&q=high&seed=1122', async p => { const s = await U(p); ok(!s.on && s.tier === 'high' && await p.evaluate(() => __li.ultra.panelVisible()), 'device=radeon&q=high: the explicit q wins, the rest of the preset stays (bench panel)'); });
await run('device-explicit2', '?device=desktop&post=0&q=high&seed=1122', async p => { const s = await U(p); ok(!s.on && s.canvas[0] === 640, 'device=desktop&post=0&q=high: both explicit values win'); });
await run('device-none', '?seed=1122', async p => { ok(!/device/.test(await info(p)) && await p.evaluate(() => __li.ultra.device()) === '', 'no &device=: the readout has no device and nothing changed'); });
await run('device-junk', '?device=toaster&seed=1122', async p => { ok(await p.evaluate(() => __li.ultra.device()) === '' && !(await U(p)).on, 'an unknown &device= is ignored'); });

/* ---- the page's own features with ultra ---- */
const feat = [
  ['camp', '?q=ultra&start=camp&seed=1122', async p => { await p.waitForFunction(() => __li.campstart && __li.campstart.rt() && __li.campstart.rt().ready(), null, { timeout: 120000 }); ok((await U(p)).on, 'camp: ultra on with the camp yard'); }],
  ['boatkit', '?q=ultra&boatkit=1&seed=1122', async p => { await p.waitForFunction(() => __li.boatkit && __li.boatkit.ready(), null, { timeout: 120000 }); const s = await U(p); ok(s.on && s.boatLods.length >= 2, 'boatkit: ultra with ' + s.boatLods.length + ' kit boats (' + s.boatLods.join(',') + '; hero only over http)'); }],
  ['repair', '?q=ultra&repair=1&seed=1122', async p => { await p.waitForFunction(() => __li.repair && __li.repair.ready(), null, { timeout: 120000 }); ok((await U(p)).on, 'repair: ultra with the jetty'); }],
  ['clock', '?q=ultra&clock=1&seed=1122', async p => { ok((await U(p)).on && await p.evaluate(() => !!__li.clock), 'clock: ultra with the sky clock'); }],
  ['light', '?q=ultra&light=1&seed=1122', async p => { ok((await U(p)).on && await p.evaluate(() => !!__li.light), 'light: ultra with the lighthouse'); }],
  ['moods', '?q=ultra&moods=1&seed=1122', async p => { ok((await U(p)).on && await p.evaluate(() => !!__li.moods), 'moods: ultra with the sky moods'); }],
  ['world-life', '?q=ultra&world=1&life=1', async p => { ok((await U(p)).on && await p.evaluate(() => !!__li.life), 'world 1 + life: ultra on a world page'); }],
  ['everything', '?q=ultra&start=camp&boatkit=1&repair=1&clock=1&light=1&moods=1&seed=1122', async p => { await p.waitForFunction(() => __li.campstart && __li.campstart.rt() && __li.campstart.rt().ready(), null, { timeout: 120000 }); ok((await U(p)).on, 'everything at once: ultra on'); }]
];
for (const [n, qs, chk] of feat) await run(n, qs, chk);

await browser.close();
process.exit(fails ? 1 : 0);
