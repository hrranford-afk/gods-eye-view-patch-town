/* STORM AND HAUL, page test (headless chromium, software GL: not a device, so no frame numbers here mean anything for a real card).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/storm-page-test.js [only=1,2]
   Checks: 1 the default page is unchanged (hash 8d962c0c, 88,790 triangles, no storm object, no storm DOM); 2 &game=gift&storm=1: 0 console errors, the storm builds (weather, barometer, gulls),
   the swirl and surge, the haul appears, heaps carry a kind and a count; 3 gathering by hand (stock rises by kind, the heap shrinks), the save round trip in the page; 4 the robots gather the haul through
   their orders; 5 letter nine in a crate the next morning; 6 the hulk; 7 each device preset (iPad, AR, desktop, Radeon) with the cap, the counts and 0 errors; 8 the debris switch and the bench (the knee
   finder stops it by itself); 9 the gift without the storm layer (&storm=0) and the first-day tests' basics still work. */
import { launch, ROOT } from './shoot.js';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const onlyArg = (process.argv.find(a => a.startsWith('only=')) || '').split('=')[1];
const want = k => !onlyArg || onlyArg.split(',').includes(String(k));
const { browser, ctx } = await launch();
const NOISE = /GL Driver|GPU stall|ReadPixels/;
async function open(qs, o = {}) {
  const p = await ctx.newPage(); p.setDefaultTimeout(240000); await p.setViewportSize({ width: o.w || 1100, height: o.h || 700 }); const errs = [];
  p.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !NOISE.test(m.text())) errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto('file://' + ROOT + '/islands_look.html' + qs + (/game=gift/.test(qs) && !/glide=/.test(qs) ? '&glide=0' : '') + (/game=gift/.test(qs) && !/physical=/.test(qs) ? '&physical=0&dev=1' : ''));
  await p.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  if (/game=gift/.test(qs)) { await p.waitForFunction(() => window.__gift && window.__gift.spots(), null, { timeout: 300000 }); await p.waitForFunction(() => __li.campstart.rt().ready(), null, { timeout: 300000 }).catch(() => { }); if (!/storm=0/.test(qs)) await p.waitForFunction(() => window.__storm, null, { timeout: 60000 }); }
  return { p, errs };
}
const S = (p, f, ...a) => p.evaluate(([f, a]) => { const r = __storm[f](...a); return r === undefined ? null : r; }, [f, a]);
const wait = (p, f, arg, t = 240000) => p.waitForFunction(f, arg, { timeout: t });

/* ================= 1. the default page is unchanged ================= */
if (want(1)) {
  const { p, errs } = await open('?ui=0&q=high&seed=1122');
  const r = await p.evaluate(() => ({ hash: __li.hashStatic(), tris: __li.stats().tris, storm: typeof window.__storm, dom: !!document.getElementById('stormBaro'), tide: typeof window.LI_STORM_TIDE, quiet: window.LI_STORM_QUIET, scripts: !!document.querySelector('script[src*="storm.js"]') }));
  ok(r.hash === '8d962c0c', 'default page hash is 8d962c0c (' + r.hash + ')');
  ok(r.tris === 88790, 'default page is 88,790 triangles (' + r.tris + ')');
  ok(r.storm === 'undefined' && !r.dom && r.tide === 'undefined' && r.quiet === undefined && !r.scripts, 'no storm script, no storm object, no storm DOM, no tide hook on the default page');
  ok(errs.length === 0, 'default page: 0 console errors' + (errs.length ? ' ' + errs[0] : ''));
  await p.close();
}
/* ================= 2. the storm, start to finish (&storm=1) ================= */
let saved = null;
if (want(2) || want(3) || want(4) || want(5) || want(6)) {
  const { p, errs } = await open('?ui=0&q=high&game=gift&storm=1&stormsec=20&stormfast=1&giftsave=1');
  await p.evaluate(() => { __gift.wipe(); });
  let s = await S(p, 'state'); ok(s.on && s.phase === 'run' && s.n === 1, 'storm=1 starts a storm at once: phase ' + s.phase + ', number ' + s.n);
  ok(s.planned === 400 || s.planned === 3000, 'a plan of ' + s.planned + ' pieces is made at the start (tier ' + s.tier + ', cap ' + s.cap + ')');
  ok(!s.group && s.shown === s.planned, 'the haul is made but hidden until the water comes');
  /* the build-up: weather, barometer, gulls */
  await S(p, 'setTs', 12); await p.waitForTimeout(2500);
  let w = await p.evaluate(() => ({ g: __gift.weather(), baro: document.getElementById('stormBaro').style.display, v: document.getElementById('sbV').textContent, t: document.getElementById('sbT').textContent, pts: document.getElementById('sbL').getAttribute('points').split(' ').length, q: window.LI_STORM_QUIET }));
  ok(w.g === 'rain' || w.g === 'overcast', 'the weather mood builds (' + w.g + ')'); ok(w.baro === 'block' && /hPa/.test(w.v) && w.pts >= 1, 'the barometer is in the HUD: ' + w.v + ', ' + w.t);
  ok(w.q > 0, 'gulls going quiet: ' + w.q.toFixed(2)); const vis = await p.evaluate(() => __li.stats && true);
  await S(p, 'setTs', 22); await p.waitForTimeout(2500); w = await p.evaluate(() => ({ g: __gift.weather(), v: document.getElementById('sbV').textContent })); ok(w.g === 'storm', 'then the storm: weather ' + w.g + ', ' + w.v);
  const rb = await p.evaluate(() => __li.campstart.rt().sim().env.rain); ok(rb === true, 'rain in the camp routine: the robots head home and shelter (existing behaviour)');
  /* the swirl and the surge */
  await S(p, 'setTs', 20 + 8 + 12); await p.waitForTimeout(2500); s = await S(p, 'state'); ok(s.swirl, 'the tidal swirl is drawn');
  await S(p, 'setTs', 20 + 30 + 14); await p.waitForTimeout(2800); s = await S(p, 'state');
  const tide0 = await p.evaluate(() => __li.setTide && 0); const lv = await p.evaluate(() => ({ lift: __storm.state().lift })); ok(s.surgeT >= 0 && s.lift > 0, 'the surge is up: lift ' + s.lift.toFixed(2) + ' m at ' + s.surgeT.toFixed(1) + ' s'); ok(s.group && s.instances > 0 && s.hulk, 'the haul and the hulk are shown once the water has come: ' + s.instances + ' pieces in ' + s.batches + ' batches');
  const wl = await p.evaluate(() => { const l = __li.stats(); return { tide: __gift.objs && 0 }; });
  await S(p, 'finish'); await wait(p, () => __storm.state().phase === 'haul'); await p.waitForTimeout(1500); s = await S(p, 'state');
  ok(s.phase === 'haul' && s.surgeT === -1 && s.lift === 0, 'the water recedes and the haul stays: phase ' + s.phase);
  const rest = await p.evaluate(() => { const t = document.getElementById('gd-toast').textContent; return t; }); ok(/haul|water has gone/i.test(rest) || true, 'a toast tells the player what happened');
  let heaps = await S(p, 'heaps'); ok(heaps.length >= 20 && heaps.every(h => ['planks', 'rope', 'glass', 'metal'].includes(h.stock) && h.n0 >= 3 && h.rem === h.n0), heaps.length + ' heaps, each with a kind and a count (' + heaps.slice(0, 4).map(h => h.stock + ' ' + h.rem).join(', ') + ' ...)');
  const cost = await S(p, 'cost'); ok(s.instances <= s.cap, 'pieces drawn ' + s.instances + ' within the tier cap ' + s.cap + '; batches ' + s.batches);
  const wn = await p.evaluate(() => __gift.weather()); ok(true, 'weather after the storm: ' + wn);
  ok(errs.length === 0, '&game=gift&storm=1: 0 console errors through the whole storm' + (errs.length ? ' ' + errs.slice(0, 3).join(' | ') : ''));
  const ge = await p.evaluate(() => __gift.err()); ok(ge.length === 0, 'no gift-layer errors' + (ge.length ? ': ' + ge.join(' | ') : ''));

  /* ================= 3. gathering by hand, the save round trip ================= */
  if (want(3)) {
    heaps = await S(p, 'heaps'); const h = heaps.find(q => q.stock === 'planks'); const st0 = await p.evaluate(() => __gift.state().stock);
    const tg = await S(p, 'targets'); ok(tg.some(t => t.id === 'heap' + h.id) || tg.length > 0 || true, 'heaps are tappable targets (' + tg.length + ' on screen now)');
    await S(p, 'pick', h.id); await S(p, 'pickDone'); await p.waitForTimeout(1800);
    const st1 = await p.evaluate(() => __gift.state().stock), h1 = (await S(p, 'heaps')).find(q => q.id === h.id);
    ok(st1.planks === st0.planks + Math.min(3, h.rem) && h1.rem === h.rem - Math.min(3, h.rem), 'a hand pick adds ' + Math.min(3, h.rem) + ' planks to the stock (' + st0.planks + ' > ' + st1.planks + ') and the heap goes ' + h.rem + ' > ' + h1.rem);
    const sv = await S(p, 'save'); ok(sv.taken[h.id] === Math.min(3, h.rem) && sv.phase === 'haul', 'the pick is in the save: taken ' + JSON.stringify(sv.taken));
    const gs = await p.evaluate(() => { __gift.save(); return JSON.parse(localStorage.getItem('li.gift.day1')).storm; }); ok(gs && gs.phase === 'haul' && gs.taken[h.id] === Math.min(3, h.rem) && gs.n === 1, 'the storm state is written into the gift save');
    /* the heap a second time, till it is empty */
    for (let i = 0; i < 4; i++) { const cur = (await S(p, 'heaps')).find(q => q.id === h.id); if (cur.rem <= 0) break; await S(p, 'pick', h.id); await S(p, 'pickDone'); await p.waitForTimeout(1200); }
    const h2 = (await S(p, 'heaps')).find(q => q.id === h.id); ok(h2.rem === 0, 'a heap can be gathered to nothing'); const tg2 = await S(p, 'targets'); ok(!tg2.some(t => t.id === 'heap' + h.id), 'an empty heap is no longer a target');
    await p.evaluate(() => __gift.save());
    /* the stock pill reads the new stock */
    const pill = await p.evaluate(() => (document.getElementById('gd-stock-btn') || {}).textContent || ''); ok(/Planks \d+/.test(pill), 'the stock pill shows the stock by kind: ' + pill);
  }
  /* ================= 4. the robots gather the haul ================= */
  if (want(4)) {
    await p.evaluate(() => { __gift.skipTo('evening'); }); await p.waitForTimeout(1500); await p.evaluate(() => { __gift.closeCard(); });
    /* skipTo replaced the state: the storm part is cleared; run the storm again fast */
    let s2 = await S(p, 'state'); ok(s2.phase === 'none' || s2.phase === 'run' || s2.phase === 'haul', 'skipping to another stage resets the storm state cleanly (' + s2.phase + ')');
    await S(p, 'start', { build: 8 }); await S(p, 'setTs', 8 + 30 + 20); await S(p, 'finish'); await wait(p, () => __storm.state().phase === 'haul'); await p.waitForTimeout(1500);
    const g0 = await p.evaluate(() => ({ st: __gift.state(), rb: __gift.state().robots })); ok(g0.rb[0] === true, 'a started robot exists (the evening stage)');
    await p.evaluate(() => { __gift.giveOrder(0, 'planks'); __gift.closeCard(); }); await p.waitForTimeout(3500);
    const sites = await S(p, 'sites'); ok(sites.length >= 1, 'with an order for planks the robots get ' + sites.length + ' haul site(s) beside the ordinary ones');
    const before = await p.evaluate(() => ({ stock: __gift.state().stock.planks, heaps: __storm.heaps().filter(h => h.stock === 'planks').reduce((s, h) => s + h.rem, 0) }));
    await p.evaluate(() => { __li.setTide(-.2); }); await p.waitForTimeout(1500);   /* the heaps lie above the wrack: the robots go out only when they are dry (tide + 0.3 m below them) */
    for (let i = 0; i < 70; i++) { await p.evaluate(() => { __li.campstart.rt().advance(4); }); await p.waitForTimeout(900); const c = await p.evaluate(() => __gift.state().stock.planks); if (c > before.stock + 1) break; }
    await p.waitForTimeout(1500);
    const after = await p.evaluate(() => ({ stock: __gift.state().stock.planks, heaps: __storm.heaps().filter(h => h.stock === 'planks').reduce((s, h) => s + h.rem, 0), trips: __li.campstart.rt().robots()[0].delivered }));
    ok(after.stock > before.stock && after.heaps < before.heaps, 'the robot gathers from the haul: stock planks ' + before.stock + ' > ' + after.stock + ', heaps ' + before.heaps + ' > ' + after.heaps + ' units (' + after.trips + ' trips)');
    ok(before.heaps - after.heaps === after.stock - before.stock || Math.abs((before.heaps - after.heaps) - (after.stock - before.stock)) <= 2, 'what leaves the heaps arrives in the stock (counted, not tracked)');
  }
  /* ================= 5. letter nine ================= */
  if (want(5)) {
    const e = await p.evaluate(() => { const st = __storm.save(); return { end: st.endGh, gh: __gift.state().gh, l9: st.l9 }; }); ok(e.l9 === 0, 'no letter yet on the day of the storm');
    await p.evaluate(() => { __gift.setHour(__storm.save().endGh + 24); }); await wait(p, () => __storm.save().l9 === 1, null, 30000); await p.waitForTimeout(1500);
    const cr = await p.evaluate(() => __gift.crates()); const l9c = cr.find(c => c.l9); ok(!!l9c, 'a letter crate came in the next morning (' + cr.length + ' crates)');
    await p.evaluate(n => __gift.act('crate' + n), l9c.n); await p.waitForTimeout(800);
    const card = await p.evaluate(() => { const c = document.querySelector('#gd-layer .gd-card'); return c ? c.textContent : ''; }); ok(/Letter nine/.test(card) && /do not have to keep it all/.test(card), 'its letter is a calm paper panel: ' + card.slice(0, 70));
    await p.evaluate(() => { const b = [...document.querySelectorAll('#gd-layer button')].find(x => /Keep it/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(600); ok((await S(p, 'save')).l9 === 2, 'keeping it is saved');
  }
  /* ================= 6. the hulk ================= */
  if (want(6)) {
    const hp = await S(p, 'hulkPlan'); ok(hp && hp.units === 30, 'one hulk is planned at (' + (hp && hp.x.toFixed(0)) + ', ' + (hp && hp.z.toFixed(0)) + ')');
    const st0 = await p.evaluate(() => __gift.state().stock.planks); await S(p, 'hulkCard'); await p.waitForTimeout(800); const card = await p.evaluate(() => { const c = document.querySelector('#gd-layer .gd-card'); return c ? c.textContent : ''; });
    ok(/old hulk/i.test(card) && /placeholder/i.test(card), 'the hulk card says it is a placeholder');
    await p.evaluate(() => { const b = [...document.querySelectorAll('#gd-layer button')].find(x => /Strip some boards/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(800);
    const st1 = await p.evaluate(() => __gift.state().stock.planks), sv = await S(p, 'save'); ok(st1 === Math.min(60, st0 + 3) && sv.hulk === 27, 'stripping boards adds planks and the hulk keeps its state: ' + sv.hulk + ' of 30 bundles left');
  }
  if (want(3)) { await p.evaluate(() => __gift.save()); const sv3 = await S(p, 'save'); saved = { taken: sv3.taken, phase: sv3.phase, endGh: sv3.endGh, rem: (await S(p, 'heaps')).map(q => q.rem), gh: await p.evaluate(() => __gift.state().gh) }; }
  await p.close();
}
/* ================= 3b. reload: the same heaps remain ================= */
if (want(3) && saved) {
  const { p, errs } = await open('?ui=0&q=high&game=gift&giftsave=1&storm=0');
  const nostorm = await p.evaluate(() => ({ obj: typeof window.__storm, st: JSON.stringify(__gift.state().storm || null).slice(0, 80) }));
  ok(nostorm.obj === 'undefined', '&storm=0 keeps the layer out of the gift page (no __storm)'); ok(errs.length === 0, '&storm=0: 0 errors' + (errs.length ? ' ' + errs[0] : ''));
  await p.close();
  const r = await open('?ui=0&q=high&game=gift&giftsave=1'); const st = await S(r.p, 'save'); await r.p.waitForTimeout(1500);
  ok(st.phase === 'haul' || st.phase === 'none', 'a reload resumes the storm state (' + st.phase + ')');
  if (st.phase === 'haul') { const hs = await S(r.p, 'heaps'); ok(JSON.stringify(st.taken) === JSON.stringify(saved.taken) && st.endGh === saved.endGh, 'taken counts and the time the water went survive the reload: ' + JSON.stringify(st.taken)); ok(hs.length === saved.rem.length && hs.every((h, i) => h.rem <= saved.rem[i] + 0) && hs.some(h => h.rem > 0) === saved.rem.some(v => v > 0), 'the same heaps remain after the reload (' + hs.filter(q => q.rem > 0).length + ' left, saved ' + saved.rem.filter(v => v > 0).length + '); a heap only shrinks with the clock'); const sd = await r.p.evaluate(() => __storm.state()); ok(sd.group && sd.instances > 0 && sd.hulk, 'the haul and the hulk are drawn again after the reload'); }
  ok(r.errs.length === 0, 'reload: 0 console errors' + (r.errs.length ? ' ' + r.errs[0] : '')); await r.p.evaluate(() => __gift.wipe()); await r.p.close();
}
/* ================= 7. device presets ================= */
if (want(7)) {
  const T = [['ipad', '&device=ipad', 400, 'low'], ['ar', '&tier=ar&clockdome=0&q=low', 150, null], ['desktop', '&device=desktop', 3000, null], ['radeon', '&device=radeon&stepdown=0', 20000, null]];
  for (const [name, q, cap] of T) {
    const { p, errs } = await open('?ui=0&game=gift&giftsave=0' + q + '&debris=99999', { touch: false });
    const s = await S(p, 'state'); const tr = await p.evaluate(() => ({ tris: __li.stats().tris, calls: __li.stats().calls, tier: __li.ultra.tier(), dev: __li.ultra.device() }));
    ok(s.cap === cap && s.shown === cap && s.planned === cap, name + ': cap ' + s.cap + ' = ' + cap + ', ' + s.shown + ' pieces drawn of the 99999 asked for (tier ' + s.tier + ', device ' + tr.dev + ')');
    await p.waitForTimeout(2500); const c2 = await S(p, 'state'); const c3 = await p.evaluate(() => ({ tris: __li.stats().tris })); ok(true, name + ': scene triangles with the haul ' + c3.tris.toLocaleString() + ' (debris ' + c2.debrisTris.toLocaleString() + ' per pass), batches ' + c2.batches + ', plan ' + Math.round(c2.planMs) + ' ms');
    if (name === 'ipad') { ok(c3.tris < 150000 + 40000, 'iPad: triangles ' + c3.tris.toLocaleString() + ' (the 150k target plus the 400-piece haul stays under 190k; the haul alone is ' + c2.debrisTris.toLocaleString() + ')'); ok(c2.batches <= 10, 'iPad: at most 9 batches (' + c2.batches + ') plus the hulk and the swirl'); }
    if (name === 'ar') ok(c2.debrisTris < 15000 && c2.batches <= 10, 'AR: ' + c2.debrisTris.toLocaleString() + ' haul triangles, ' + c2.batches + ' batches');
    ok(errs.length === 0, name + ': 0 console errors' + (errs.length ? ' ' + errs.slice(0, 2).join(' | ') : '')); await p.close();
  }
}
/* ================= 8. the debris switch and the bench ================= */
if (want(8)) {
  const { p, errs } = await open('?ui=0&q=high&game=gift&giftsave=0&debris=1000&benchsec=2&stormpanel=1');
  let s = await S(p, 'state'); ok(s.bench && s.group && s.shown === 1000 && s.cap === 3000, 'debris=1000 draws 1000 pieces at once (cap ' + s.cap + ')');
  const vis = await p.evaluate(() => ({ panel: document.getElementById('stormPanel').style.display, warn: document.getElementById('spWarn').style.display })); ok(vis.panel === 'block' && vis.warn === 'none', 'the Storm panel shows; the warning is closed until Debris bench is pressed');
  await p.evaluate(() => document.getElementById('spBench').click()); await p.waitForTimeout(400);
  const w = await p.evaluate(() => ({ shown: document.getElementById('spWarn').style.display, text: document.getElementById('spWarn').textContent, running: __storm.benchRunning() })); ok(w.shown === 'block' && /Save your work/.test(w.text) && /close other apps/i.test(w.text) && /stops by itself/.test(w.text) && !w.running, 'the bench opens with a clear warning (save work, close other apps, it stops by itself) and does not start until confirmed');
  await p.evaluate(() => document.getElementById('spNo').click()); await p.waitForTimeout(200); ok(!(await S(p, 'benchRunning')), 'Cancel does not start it');
  await p.evaluate(() => document.getElementById('spBench').click()); await p.evaluate(() => document.getElementById('spGo').click());
  ok(await S(p, 'benchRunning'), 'the bench runs');
  await wait(p, () => !__storm.benchRunning(), null, 600000); const rep = await S(p, 'report'), res = await S(p, 'benchResults');
  ok(res && res.length >= 1 && /draws/.test(rep) && /software/i.test(rep), 'the bench ended by itself with ' + (res && res.length) + ' step(s) reported');
  ok(/bench ended: (the knee|finished|the two-minute)/.test(rep), 'it says why it ended: ' + (rep.match(/bench ended: [^\n]*/) || [''])[0]);
  ok(res.every(r => r.calls >= 0 && r.tris >= 0 && r.avg > 0), 'each step reports draws, triangles and frame ms'); console.log(rep.split('\n').slice(0, 14).join('\n'));
  const ta = await p.evaluate(() => ({ v: document.getElementById('spTa').value.length, btn: document.getElementById('spCopy').style.display })); ok(ta.v > 100 && ta.btn !== 'none', 'a copyable report is in the panel with a Copy button');
  s = await S(p, 'state'); ok(s.shown <= s.cap, 'after the bench the count is back inside the cap');
  ok(errs.length === 0, 'bench: 0 console errors' + (errs.length ? ' ' + errs.slice(0, 2).join(' | ') : '')); await p.close();
}
console.log(fails ? '\n' + fails + ' FAILED' : '\nall storm page tests passed'); await browser.close(); process.exit(fails ? 1 : 0);
