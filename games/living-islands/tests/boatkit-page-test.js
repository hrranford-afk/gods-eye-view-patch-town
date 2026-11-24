/* BOATKIT PAGE TEST for islands_look.html?boatkit=1 (headless chromium, software GL).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/boatkit-page-test.js
   Checks: default page untouched (hash 8d962c0c, 88,790 tris, no __li.boatkit); boatkit=1 loads the four GLB boats with 0 console errors in the default scene, q=low, post=0, the AR profile
   (clockdome=0), the landing pass, ?world=153 and ?world=153&life=1, with clock+light and with a sky mood; low quality uses far or live levels only; the depth-only hull mask is drawn after the hull and
   before the sea (colorWrite false, depthWrite true, renderOrder 1 against the sea's 5) and is off for the wreck; pixel probe: no sea colour inside a hull with the mask, sea colour with ?nomask=1;
   the macro sea moves the boats (pitch and roll nonzero and capped); oars stroke with the clock; the sail boom sits on the lee side and the rudder follows the turn; the wreck lies on land;
   a failed or corrupt load (?boatkit=fail, ?boatkit=bad) falls back to the procedural boats with 0 console errors; triangle budgets are printed for high and low. */
import { launch, ROOT } from './shoot.js';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const GOLD = '8d962c0c', GOLD_TRIS = 88790;
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
const ONLY = process.env.ONLY || '';   /* ONLY=pixels (or default, profiles, mask, motion, fail) runs one section */
const want = k => !ONLY || ONLY === k;
const { browser, ctx } = await launch();
async function openKit(qs, wait = true) {
  const page = await ctx.newPage(); await page.setViewportSize({ width: 480, height: 320 }); const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + ROOT + '/islands_look.html' + (qs || ''));
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  if (wait) await page.waitForFunction(() => __li.boatkit && (__li.boatkit.ready() || __li.boatkit.failed()), null, { timeout: 120000 });
  await page.waitForTimeout(1200);
  return { page, errs: () => errs.filter(e => !noise(e)) };
}
const snap = page => page.evaluate(() => ({ st: __li.stats(), kit: __li.boatkit ? { ready: __li.boatkit.ready(), failed: __li.boatkit.failed(), boats: __li.boatkit.boats() } : null, boats: __li.boats() }));

/* 1. default untouched */
if (want('default')) {
  const { page, errs } = await openKit('?ui=0&q=high&seed=1122', false);
  const r = await page.evaluate(() => ({ h: __li.hashStatic(), t: __li.stats().tris, kit: __li.boatkit }));
  ok(r.h === GOLD && r.t === GOLD_TRIS, 'default page: hash ' + r.h + ', ' + r.t + ' triangles (gold ' + GOLD + ', ' + GOLD_TRIS + ')');
  ok(r.kit === null && errs().length === 0, 'default page: no boat kit API, 0 console errors');
  await page.close();
}
/* 2. the kit in each profile */
const profiles = [
  ['default high', '?ui=0&q=high&seed=1122&boatkit=1'],
  ['q=low', '?ui=0&q=low&seed=1122&boatkit=1'],
  ['post=0', '?ui=0&q=high&seed=1122&boatkit=1&post=0'],
  ['AR profile (clockdome=0)', '?ui=0&q=low&seed=1122&boatkit=1&clock=1&clockdome=0&tier=ar'],
  ['landing pass', '?ui=0&q=high&seed=1122&boatkit=1&pass=landing'],
  ['world 153', '?ui=0&q=high&boatkit=1&world=153'],
  ['world 153 + life', '?ui=0&q=high&boatkit=1&world=153&life=1'],
  ['clock + light', '?ui=0&q=high&seed=1122&boatkit=1&clock=1&light=1'],
  ['clock + mood', '?ui=0&q=high&seed=1122&boatkit=1&clock=1&mood=rainbow'],
  ['macro sea', '?ui=0&q=high&seed=1122&boatkit=1&macro=1&weather=auto&mh=30&mt=0&sea=2&seat=5']
];
const numbers = {};
for (const [name, qs] of want('profiles') ? profiles : []) {
  const { page, errs } = await openKit(qs); const s = await snap(page);
  const lods = s.kit.boats.map(b => b.kind + ':' + b.lod);
  ok(s.kit.ready && !s.kit.failed && errs().length === 0, name + ': kit loaded, 0 console errors, boats ' + lods.join(' ') + ', ' + s.st.tris + ' triangles' + (errs().length ? ' ERR ' + errs().slice(0, 2).join(' | ') : ''));
  const want = /landing/.test(name) ? ['work', 'sailer', 'dinghy'] : ['work', 'sailer', 'wreck', 'dinghy'];   /* the landing pass has no camp, so no wreck */
  ok(s.kit.boats.length >= 3 && want.every(k => s.kit.boats.some(b => b.kind === k)), name + ': ' + want.join(', ') + ' present');
  if (/q=low|AR/.test(name)) ok(s.kit.boats.every(b => b.lod === 'far' || b.lod === 'live'), name + ': only far or live levels');
  numbers[name] = s.st.tris;
  if (name === 'default high') {
    const t = await page.evaluate(() => __li.boatkit.lodTris());
    console.log('     triangles per level (rendered meshes incl. mask and waterline lid): ' + JSON.stringify(t));
    ok(t.dinghy.live > t.dinghy.far && t.sailer.live > t.sailer.far && t.work.live > t.work.far, 'live has more triangles than far for every boat');
    const base = s.st.tris - s.kit.boats.reduce((a, b) => a + b.tris, 0);
    const live = s.kit.boats.reduce((a, b) => a + t[b.kind].live, 0), far = s.kit.boats.reduce((a, b) => a + t[b.kind].far, 0);
    console.log('     scene without boats ' + base + '; all boats far ' + (base + far) + ', all boats live ' + (base + live));
    ok(base + live < 150000, 'worst case at high quality (every boat at the live level) stays under 150,000: ' + (base + live));
    numbers.farAll = base + far; numbers.liveAll = base + live;
  }
  if (name === 'q=low') {
    const t = await page.evaluate(() => __li.boatkit.lodTris());
    const base = s.st.tris - s.kit.boats.reduce((a, b) => a + b.tris, 0), live = s.kit.boats.reduce((a, b) => a + t[b.kind].live, 0);
    console.log('     q=low scene without boats ' + base + '; all boats live ' + (base + live)); numbers.lowLiveAll = base + live;
  }
  if (name === 'macro sea') {
    await page.evaluate(() => { __li.holdClock(false); });
    let maxP = 0, maxR = 0, minY = 9, maxY = -9;
    for (let i = 0; i < 12; i++) { await page.waitForTimeout(350); const b = await page.evaluate(() => __li.boatkit.boats().filter(b => b.afloat).map(b => [b.pitch, b.roll, b.y])); for (const q of b) { maxP = Math.max(maxP, Math.abs(q[0])); maxR = Math.max(maxR, Math.abs(q[1])); minY = Math.min(minY, q[2]); maxY = Math.max(maxY, q[2]); } }
    ok(maxP > .002 && maxR > .002 && maxP < .6 && maxR < .6, 'macro sea: afloat boats pitch and roll (max ' + maxP.toFixed(3) + ' / ' + maxR.toFixed(3) + ' rad) within caps');
  }
  await page.close();
}
/* 3. mask state */
if (want('mask')) {
  const { page } = await openKit('?ui=0&q=high&seed=1122&boatkit=1');
  const m = await page.evaluate(() => __li.boatkit.maskInfo()); const b = await page.evaluate(() => __li.boatkit.boats());
  const afloat = m.filter((q, i) => b[i].afloat);
  ok(afloat.length >= 3 && afloat.every(q => q.visible && q.colorWrite === false && q.depthWrite === true && q.depthTest === true && q.renderOrder === 1 && q.renderOrder < q.seaOrder), 'mask: ' + afloat.length + ' afloat boats have a visible depth-only lid (colorWrite false, depthWrite true, renderOrder 1, sea ' + afloat[0].seaOrder + ')');
  const w = m.find((q, i) => b[i].kind === 'wreck'); const wb = b.find(q => q.kind === 'wreck');
  ok(w && !w.visible && !wb.afloat, 'mask: the wreck on land has no lid');
  const g = await page.evaluate(() => { const w = __li.boatkit.boats().find(b => b.kind === 'wreck'); return [w.y, __li.H(w.x, w.z)]; });
  ok(g[0] > g[1] && g[0] - g[1] < .6 && g[1] > 0, 'wreck: lies on dry ground (hull origin ' + g[0].toFixed(2) + ' m over ground ' + g[1].toFixed(2) + ' m)');
  await page.close();
}
/* 4. pixel check: top-down on the dinghy, boat clock held, the sea turned pure magenta (same mesh, same draw order, same depth state (only the fragment shader is swapped)) so that any sea inside the hull is unmistakable */
async function shot(qs) {
  const { page } = await openKit(qs); await page.setViewportSize({ width: 800, height: 600 });
  await page.evaluate(() => { __li.holdClock(true); __li.clockT(20); __li.setTide(0); __li.boatkit.force('live'); const d = __li.boatkit.dbg(); const wm = d.waterMesh.material; wm.fragmentShader = 'void main(){gl_FragColor=vec4(1.0,0.0,1.0,1.0);}'; wm.needsUpdate = true; });
  for (let i = 0; i < 3; i++) { await page.evaluate(() => { const p = __li.boatkit.pos(3); __li.setView({ tx: p.x, tz: p.z, ty: 0, dist: 8, phi: 1.35, theta: 2.3, fov: 30 }); }); await page.waitForTimeout(900); }
  const b64 = (await page.screenshot()).toString('base64');
  const out = await page.evaluate(async b => {
    const im = await createImageBitmap(await (await fetch('data:image/png;base64,' + b)).blob()); const c = new OffscreenCanvas(im.width, im.height), x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const pr = __li.boatkit.project(3), W = im.width, H = im.height;
    const d = x.getImageData(0, 0, W, H).data, at = (px, py) => { const i = (Math.round(py) * W + Math.round(px)) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    return { refs: pr.refs.map(p => at(p[0], p[1])), sample: pr.pts.map(p => at(p[0], p[1])), W, H };
  }, b64);
  await page.close(); return out;
}
const isMag = c => c[0] > 150 && c[2] > 150 && c[1] < .6 * Math.min(c[0], c[2]);
if (want('pixels')) {
  const A = await shot('?ui=0&q=high&seed=1122&boatkit=1&seat=3.7'), N = await shot('?ui=0&q=high&seed=1122&boatkit=1&seat=3.7&nomask=1');
  const rA = A.refs.filter(isMag).length, nA = A.sample.filter(isMag).length, nN = N.sample.filter(isMag).length;
  ok(rA >= 6, 'pixels: the probe sees the magenta sea beside the boat (' + rA + ' of ' + A.refs.length + ' reference points)');
  ok(nA === 0, 'pixels (lid on): 0 of ' + A.sample.length + ' points inside the dinghy hull show the sea');
  ok(nN >= 3, 'pixels control (?nomask=1): ' + nN + ' of ' + N.sample.length + ' points inside the hull show the sea, so the probe does see water when the lid is absent');
}
/* 5. motion: oars, sail, rudder */
if (want('motion')) {
  const { page } = await openKit('?ui=0&q=high&seed=1122&boatkit=1');
  await page.evaluate(() => { __li.holdClock(true); __li.boatkit.force('live'); });
  const at = async (t, w = 500) => { await page.evaluate(t => __li.clockT(t), t); await page.waitForTimeout(w); return page.evaluate(() => ({ b: __li.boatkit.boats(), tip: __li.boatkit.oarTip(3) })); };
  const a = await at(20), c = await at(20.9);
  const d = a.b.find(q => q.kind === 'dinghy'), d2 = c.b.find(q => q.kind === 'dinghy');
  ok(d.stroke && d2.stroke && Math.abs(d.stroke.sweep - d2.stroke.sweep) > .05, 'rowing: the stroke sweep changes with the clock (' + d.stroke.sweep.toFixed(2) + ' then ' + d2.stroke.sweep.toFixed(2) + ')');
  ok(a.tip && c.tip && a.tip.length === 2 && Math.hypot(a.tip[0][1] - c.tip[0][1], a.tip[0][3] - c.tip[0][3]) > .05, 'rowing: the oar moves in the boat frame (blade box centre shifts ' + Math.hypot(a.tip[0][1] - c.tip[0][1], a.tip[0][3] - c.tip[0][3]).toFixed(2) + ' m)');
  const s = (await at(20, 2500)).b.find(q => q.kind === 'sailer');
  ok(s.trim && Math.sign(s.trim.boom) === -Math.sign(s.trim.rel) && Math.abs(s.trim.boom) > .1, 'sail: the boom lies on the lee side of the wind (wind angle ' + (s.trim.rel * 57.3).toFixed(0) + ' deg, boom ' + (s.trim.boom * 57.3).toFixed(0) + ' deg)');
  await page.evaluate(() => { __li.holdClock(false); });   /* the clock runs: the sailer sails its circle */
  await page.waitForTimeout(2500);
  const r1 = (await page.evaluate(() => __li.boatkit.boats())).find(x => x.kind === 'sailer'); await page.waitForTimeout(2500);
  const r2 = (await page.evaluate(() => __li.boatkit.boats())).find(x => x.kind === 'sailer');
  const dyaw = Math.atan2(Math.sin(r2.yaw - r1.yaw), Math.cos(r2.yaw - r1.yaw));
  ok(Math.abs(r2.rud) > .02 && Math.abs(r2.rud) <= 14 / 57.2958 + 1e-9 && Math.sign(r2.rud) === Math.sign(dyaw), 'rudder: follows the turn (yaw change ' + (dyaw * 57.3).toFixed(1) + ' deg in 2.5 s, rudder ' + (r2.rud * 57.3).toFixed(1) + ' deg, cap 14)');
  ok(Math.abs(r2.trim.boom - r1.trim.boom) > .005 || Math.abs(r2.trim.rel - r1.trim.rel) > .05, 'sail: the trim changes as the boat swings round (wind angle ' + (r1.trim.rel * 57.3).toFixed(0) + ' to ' + (r2.trim.rel * 57.3).toFixed(0) + ' deg, boom ' + (r1.trim.boom * 57.3).toFixed(0) + ' to ' + (r2.trim.boom * 57.3).toFixed(0) + ')');
  await page.close();
}
/* 6. failures: no console error, procedural boats stay */
for (const [name, qs] of !want('fail') ? [] : [['boatkit=fail (no files)', '?ui=0&q=high&seed=1122&boatkit=fail'], ['boatkit=bad (corrupt GLB data)', '?ui=0&q=high&seed=1122&boatkit=bad']]) {
  const { page, errs } = await openKit(qs); const s = await snap(page);
  ok(s.kit.failed && !s.kit.ready && s.kit.boats.length === 0 && s.boats.length >= 3 && s.boats.every(b => b.mask) && errs().length === 0, name + ': fell back to the ' + s.boats.length + ' procedural boats (with masks), ' + s.st.tris + ' triangles, 0 console errors' + (errs().length ? ' ERR ' + errs()[0] : ''));
  await page.close();
}
console.log('NUMBERS ' + JSON.stringify(numbers));
console.log(fails ? 'FAILED ' + fails : 'ALL PASSED'); await browser.close(); process.exit(fails ? 1 : 0);
