/* REPAIR PAGE TEST for islands_look.html?repair=1 (headless chromium, software GL).
   Run: NODE_PATH=$(npm root -g) node games/living-islands/tests/repair-page-test.js     (ONLY=default|profiles|fallback|hand|surge|usable|float|cost|look runs one section)
   Checks (see REPAIR_PILOT.md): the default page is untouched (hash 8d962c0c, 88,790 triangles, no repair API, 0 console errors) and tests/look-test.js still passes; &repair=1 builds the jetty with 0 console errors
   in the default scene, q=low (fewer planks: 6 sockets), post=0, the AR profile, ?world=153, ?world=153&life=1, with &boatkit=1, with clock + light + mood and with the macro sea; the parts are settled by the
   physics (loose planks lie on the sand or float, none inside the jetty); a failed or corrupt GLB (?repair=fail, ?repair=bad) falls back to box planks with 0 console errors and the same game;
   a scripted mouse drag lifts a plank and fits it (the counter goes 0 to 1), a plank dropped far away, turned a quarter turn, or on the wrong socket does not hold, tap to pick then tap the slot fits;
   a surge breaks lashed joints and not the nails (a big surge breaks nails too) and the planks float off; all fitted: the jetty is usable, a boat moors (the kit dinghy with &boatkit=1) and the settler walks
   to the end, with a gap he stops; loose planks float in the water and drift with the tide; the physics step cost is measured. */
import { spawnSync } from 'node:child_process';
import { launch, ROOT } from './shoot.js';
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const GOLD = '8d962c0c', GOLD_TRIS = 88790;
const noise = e => /GL Driver Message|GPU stall|ReadPixels/.test(e);
const ONLY = process.env.ONLY || '', want = k => !ONLY || ONLY === k;
const { browser, ctx } = await launch();
async function open(qs, size = [480, 320]) {
  const page = await ctx.newPage(); await page.setViewportSize({ width: size[0], height: size[1] }); const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('file://' + ROOT + '/islands_look.html' + (qs || ''));
  await page.waitForFunction(() => window.__li && window.__li.ready && window.__liFrames > 2, null, { timeout: 900000 });
  if (/repair=/.test(qs)) await page.waitForFunction(() => __li.repair && (__li.repair.ready() || __li.repair.failed()), null, { timeout: 120000 });
  await page.waitForTimeout(1000);
  return { page, errs: () => errs.filter(e => !noise(e)) };
}
const st = p => p.evaluate(() => ({ c: __li.repair.count(), b: __li.repair.bodies(), s: __li.repair.sockets() }));
/* a real mouse drag of one plank onto a socket, steps of the page's own physics after release */
async function drag(page, id, to, o = {}) {
  const T0 = Date.now(), lg = m => { if (process.env.DEBUG_T) console.log('   t+' + (Date.now() - T0) + ' ' + m); };
  const a = await page.evaluate(id => __li.repair.screen(id), id), b = typeof to === 'string' ? await page.evaluate(s => __li.repair.screenSock(s), to) : to;
  lg('start'); await page.mouse.move(a[0], a[1]); lg('moved'); await page.mouse.down(); lg('down');
  for (let i = 1; i <= 4; i++) await page.mouse.move(a[0] + (b[0] - a[0]) * i / 4, a[1] + (b[1] - a[1]) * i / 4);
  lg('moves done'); await page.evaluate(() => __li.repair.step(150));   /* the carried part catches up with the hand (software GL runs few frames) */
  await page.waitForTimeout(200);
  const mid = await page.evaluate(() => ({ hold: __li.repair.hold(), near: __li.repair.near() }));
  if (o.turn) { await page.evaluate(() => __li.repair.turn()); await page.evaluate(() => __li.repair.step(150)); await page.waitForTimeout(200); }
  const mid2 = await page.evaluate(() => ({ near: __li.repair.near() }));
  lg('before up'); await page.mouse.up(); lg('up'); await page.evaluate(() => __li.repair.step(120)); await page.waitForTimeout(300);
  return { mid, mid2, msg: await page.evaluate(() => __li.repair.msg()) };
}
const visible = (page, ids) => Promise.all(ids.map(id => page.evaluate(id => __li.repair.screen(id), id)));

/* 1. default untouched, and look-test */
if (want('default')) {
  const { page, errs } = await open('?ui=0&q=high&seed=1122');
  const r = await page.evaluate(() => ({ h: __li.hashStatic(), t: __li.stats().tris, rp: __li.repair, hud: !!document.getElementById('rpHud') }));
  ok(r.h === GOLD && r.t === GOLD_TRIS, 'default page: hash ' + r.h + ', ' + r.t + ' triangles (gold ' + GOLD + ', ' + GOLD_TRIS + ')');
  ok(r.rp === null && !r.hud && errs().length === 0, 'default page: no repair API, no repair HUD, 0 console errors');
  const r0 = await open('?ui=0&q=high&seed=1122&repair=0'); ok((await r0.page.evaluate(() => __li.repair)) === null && r0.errs().length === 0, '&repair=0 is off');
  await page.close(); await r0.page.close();
}
if (want('look')) {
  const r = spawnSync('node', ['tests/look-test.js'], { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env) });
  const out = (r.stdout || '') + (r.stderr || ''); const fl = out.split('\n').filter(l => /^FAIL/.test(l));
  ok(r.status === 0 && fl.length === 0 && /8d962c0c/.test(out) && /88790/.test(out), 'tests/look-test.js (unedited) still passes: hash 8d962c0c, 88790 triangles' + (fl.length ? ' ' + fl[0] : ''));
}
/* 2. profiles */
const nums = {};
if (want('profiles')) {
  const profiles = [['default high', '?ui=0&q=high&seed=1122&repair=1', 9], ['q=low', '?ui=0&q=low&seed=1122&repair=1', 6], ['post=0', '?ui=0&q=high&seed=1122&repair=1&post=0', 9],
    ['AR profile', '?ui=0&q=low&seed=1122&repair=1&clock=1&clockdome=0&tier=ar', 6], ['world 153', '?ui=0&q=high&world=153&repair=1', 9], ['world 153 + life', '?ui=0&q=high&world=153&life=1&repair=1', 9],
    ['boatkit', '?ui=0&q=high&seed=1122&repair=1&boatkit=1', 9], ['clock + light + mood', '?ui=0&q=high&seed=1122&repair=1&clock=1&light=1&mood=rainbow', 9], ['macro sea', '?ui=0&q=high&seed=1122&repair=1&macro=1&weather=auto&mh=30&mt=0&sea=2&seat=5', 9]];
  for (const [name, qs, total] of profiles) {
    const { page, errs } = await open(qs);
    const r = await page.evaluate(() => ({ ready: __li.repair.ready(), glb: __li.repair.glb(), c: __li.repair.count(), tris: __li.repair.tris(), all: __li.stats().tris, ms: __li.repair.ms(), b: __li.repair.bodies(), site: __li.repair.site(), h: __li.hashStatic() }));
    ok(r.ready && r.glb && r.c.total === total && errs().length === 0, name + ': jetty built from the GLB, ' + r.c.total + ' sockets, ' + r.tris + ' repair triangles (page ' + r.all + '), 0 console errors' + (errs().length ? ' ERR ' + errs().slice(0, 2).join(' | ') : ''));
    const loose = r.b.filter(b => b.kind === 'plank').length, posts = r.b.filter(b => b.kind === 'post').length;
    ok(loose >= total - 1 && posts === 1 && r.b.every(b => b.p.every(Number.isFinite)), name + ': ' + loose + ' loose planks and ' + posts + ' post settled by the physics');
    if (name === 'default high') {
      nums.hi = r; nums.hiAll = r.all;
      const inside = await page.evaluate(() => { const S = __li.repair.dbg().site; return __li.repair.bodies().filter(b => { const dx = b.p[0] - S.ox, dz = b.p[2] - S.oz, lx = dx * S.c - dz * S.s, lz = dx * S.s + dz * S.c; return b.state === 'dyn' && lx > -.2 && lx < 4.4 && Math.abs(lz) < .7 && b.p[1] < S.deckY - .2 && b.p[1] > S.y0 + 1.2; }).length; });
      ok(inside === 0, 'no loose part was left inside the deck frame');
      const onSand = r.b.filter(b => b.kind === 'plank' && b.sub < .05).length, afloat = r.b.filter(b => b.sub > .3).length;
      ok(onSand >= 4 && afloat >= 1, 'loose planks lie on the sand (' + onSand + ') and float in the shallows (' + afloat + ')');
    }
    if (name === 'q=low') nums.lo = r;
    await page.close();
  }
  console.log('     triangles: high page ' + nums.hiAll + ' (default 88,790, jetty adds ' + (nums.hi.tris) + '), low page ' + nums.lo.all + ' (default low 60,752, jetty adds ' + nums.lo.tris + ')');
}
/* 3. fallback */
if (want('fallback')) {
  for (const m of ['fail', 'bad']) {
    const { page, errs } = await open('?ui=0&q=high&seed=1122&repair=' + m);
    const r = await page.evaluate(() => ({ ready: __li.repair.ready(), glb: __li.repair.glb(), c: __li.repair.count(), tris: __li.repair.tris() }));
    ok(r.ready && !r.glb && r.c.total === 9 && errs().length === 0, '?repair=' + m + ': box planks and a box frame, ' + r.c.total + ' sockets, ' + r.tris + ' triangles, 0 console errors' + (errs().length ? ' ERR ' + errs().slice(0, 2).join(' | ') : ''));
    const fit = await page.evaluate(() => { __li.repair.fitAll(); __li.repair.step(90); return __li.repair.count(); });
    ok(fit.fitted === 9 && fit.usable, '?repair=' + m + ': the same game works: all fitted, usable');
    await page.close();
  }
}
/* 4. the hand */
if (want('hand')) {
  const VW = 960, VH = 640;
  const { page, errs } = await open('?ui=0&q=high&seed=1122&repair=1', [VW, VH]);
  await page.evaluate(() => __li.repair.view({ theta: __li.repair.dbg().site.psi + 1.0, dist: 11, phi: .5 })); await page.waitForTimeout(1800);
  const s0 = await st(page); ok(s0.c.fitted === 0, 'counter starts at 0 of ' + s0.c.total);
  const planks = s0.b.filter(b => b.kind === 'plank' && !b.spare && b.state === 'dyn');
  const sc = await visible(page, planks.map(b => b.id)); const vis = planks.filter((b, i) => sc[i][0] > 50 && sc[i][0] < VW - 50 && sc[i][1] > 80 && sc[i][1] < VH - 60);
  ok(vis.length >= 2, vis.length + ' loose planks are in view at 11 m');
  const sock = await page.evaluate(() => __li.repair.sockets().filter(s => s.kind === 'plank').map(s => s.id));
  const target = sock.find(s => s === 'deck3') || sock[0];
  /* a) right plank, right slot: fits, counter 0 to 1 */
  const d1 = await drag(page, vis[0].id, target);
  ok(d1.mid.hold !== null && d1.mid.near && d1.mid.near.ok, 'mid drag: the plank is in the hand and the nearest socket glows ready (' + JSON.stringify(d1.mid.near) + ')');
  const fitId = d1.mid.hold, s1 = await st(page); ok(s1.c.fitted === 1 && s1.s.find(s => s.id === d1.mid.near.id).filled, 'a scripted mouse drag fitted the plank: counter 0 to ' + s1.c.fitted + ' of ' + s1.c.total);
  /* b) dropped far from any slot: does not hold */
  const far = await page.evaluate(() => { const r = __li.repair.screenSock('deck23'); return [r[0] + 200, r[1] + 170]; });
  const rest = vis.filter(b => b.id !== fitId);
  const d2 = await drag(page, rest[0].id, far);
  const s2 = await st(page); ok(s2.c.fitted === 1 && s2.b.find(b => b.id === rest[0].id).state === 'dyn', 'a plank dropped on the sand away from the slots does not hold (' + s2.c.fitted + ' of ' + s2.c.total + ')');
  /* c) turned a quarter turn over its slot: wrong angle, does not hold */
  const d3 = await drag(page, rest[0].id, 'deck2', { turn: true });
  const s3 = await st(page); ok(s3.c.fitted === 1 && /Wrong way round/.test(d3.msg), 'a plank turned a quarter turn over a slot does not hold: "' + d3.msg + '"');
  /* d) tap to pick, tap the slot */
  const pid = rest[0].id; const p1 = await page.evaluate(id => __li.repair.screen(id), pid);
  const settled = await page.evaluate(() => { __li.repair.step(200); return 1; });
  const p1b = await page.evaluate(id => __li.repair.screen(id), pid);
  await page.mouse.click(p1b[0], p1b[1]); await page.waitForTimeout(200);
  const sel = await page.evaluate(() => __li.repair.sel()); ok(sel === pid, 'a tap picks the plank (selected, glowing)');
  const t2 = await page.evaluate(() => __li.repair.screenSock('deck2')); await page.mouse.click(t2[0], t2[1]); await page.evaluate(() => __li.repair.step(120)); await page.waitForTimeout(300);
  const s4 = await st(page); ok(s4.c.fitted === 2 && s4.s.find(s => s.id === 'deck2').filled, 'tap the plank, then tap its slot: fitted (' + s4.c.fitted + ' of ' + s4.c.total + ')');
  /* e) the wrong kind: a plank sent to the post socket does not hold */
  const o = (await st(page)).b.filter(b => b.kind === 'plank' && b.state === 'dyn' && !b.lost)[0];
  const r5 = await page.evaluate(id => { const a = __li.repair.place(id, 'post'); return { ok: a.ok, reason: a.reason }; }, o.id); ok(!r5.ok && r5.reason === 'kind', 'a plank offered to the post socket is refused (wrong kind)');
  const r6 = await page.evaluate(() => { const post = __li.repair.bodies().find(b => b.kind === 'post'); __li.repair.teleport(post.id, __li.repair.sockets().find(s => s.id === 'deck5').p, 0); return __li.repair.testFit(post.id); }); ok(!r6.ok, 'the post held over a deck slot does not fit it (' + r6.reason + ')');
  ok(errs().length === 0, 'the hand section: 0 console errors' + (errs().length ? ' ERR ' + errs().slice(0, 2).join(' | ') : ''));
  await page.close();
}
/* 5. surge */
if (want('surge')) {
  const { page, errs } = await open('?ui=0&q=high&seed=1122&repair=1');
  await page.evaluate(() => { __li.setTide(0); __li.repair.fitAll(); __li.repair.step(60); });
  const a = await st(page); ok(a.c.fitted === 9 && a.c.usable, 'all fitted: ' + a.c.fitted + ' of ' + a.c.total + ', usable');
  const before = a.s.map(s => s.type + ':' + s.strength);
  await page.evaluate(() => __li.repair.surge()); const msgs = [];
  for (let i = 0; i < 14; i++) { await page.evaluate(() => __li.repair.step(120)); }
  const b = await st(page);
  const lashed = b.s.filter(s => s.type === 'lash' && s.id !== 'post'), nailed = b.s.filter(s => s.type === 'nail');
  ok(lashed.filter(s => s.hits > 0).length >= 3 && nailed.every(s => s.hits === 0) && b.c.fitted < 9 && !b.c.usable, 'a moderate surge breaks ' + lashed.filter(s => s.hits > 0).length + ' of ' + lashed.length + ' lashed joints and none of the ' + nailed.length + ' nails (fitted ' + b.c.fitted + ' of 9, usable ' + b.c.usable + ')');
  ok(lashed.filter(s => s.hits > 0).every(s => s.peak >= s.strength * .8) && nailed.every(s => s.peak < s.strength * .8), 'joints broke only where the load passed their strength (peak loads ' + lashed.map(s => Math.round(s.peak)).join(',') + ' N on lashings of ~300, ' + nailed.map(s => Math.round(s.peak)).join(',') + ' N on nails of ~780)');
  ok(b.b.filter(x => x.lost).length + b.b.filter(x => x.state === 'dyn' && !x.lost).length >= 5, 'the broken planks are loose again (some washed away: ' + b.b.filter(x => x.lost).length + ')');
  await page.evaluate(() => __li.repair.surge(.6)); for (let i = 0; i < 14; i++) await page.evaluate(() => __li.repair.step(120));
  const c = await st(page); ok(c.s.filter(s => s.type === 'nail' && s.hits > 0).length >= 1, 'a big surge breaks nails too (' + c.s.filter(s => s.type === 'nail' && s.hits > 0).length + ' of ' + nailed.length + ')');
  ok(errs().length === 0, 'the surge section: 0 console errors');
  /* with no surge a calm tide does nothing */
  const q = await open('?ui=0&q=high&seed=1122&repair=1');
  await q.page.evaluate(() => { __li.setTide(1.1); __li.repair.fitAll(); __li.repair.step(60); __li.repair.step(120 * 20); });
  const d = await st(q.page); ok(d.c.fitted === 9, 'at the top of the tide (+1.1 m) with no surge the repair holds for 20 s (' + d.c.fitted + ' of 9)');
  await page.close(); await q.page.close();
}
/* 6. usable: boat and settler */
if (want('usable')) {
  for (const [name, qs, kind] of [['procedural boat', '?ui=0&q=high&seed=1122&repair=1', 'procedural'], ['boat kit', '?ui=0&q=high&seed=1122&repair=1&boatkit=1', 'dinghy']]) {
    const { page, errs } = await open(qs);
    if (/boatkit/.test(qs)) await page.waitForFunction(() => __li.boatkit && __li.boatkit.ready(), null, { timeout: 120000 });
    await page.evaluate(() => { const S = __li.repair.dbg(); });
    const nb0 = await page.evaluate(() => __li.boats().length);
    /* with a gap the settler stops */
    await page.evaluate(() => { __li.repair.walk(); });
    for (let i = 0; i < 60; i++) { await page.waitForTimeout(250); const w = await page.evaluate(() => __li.repair.walkState()); if (w !== 'walking') break; }
    const w1 = await page.evaluate(() => ({ s: __li.repair.walkState(), m: __li.repair.marker() })); ok(w1.s === 'blocked' && w1.m.x < -.2, 'with open gaps the settler stops before the first one (x = ' + w1.m.x.toFixed(2) + ' m) and says so');
    await page.evaluate(() => { __li.repair.fitAll(); __li.repair.step(90); });
    await page.waitForTimeout(500);
    const c = await page.evaluate(() => ({ c: __li.repair.count(), boat: __li.repair.boat(), n: __li.boats().length, rope: __li.repair.rope() }));
    ok(c.c.usable && c.c.moored && c.boat && c.n === nb0 + 1 && (kind === 'procedural' ? c.boat.kind === 'procedural' : c.boat.kind === 'dinghy'), name + ': all fitted, the jetty is usable and a ' + (c.boat && c.boat.kind) + ' boat moors at it (boats ' + nb0 + ' to ' + c.n + '), rope ' + c.rope);
    const berth = await page.evaluate(() => { const b = __li.repair.boat(), S = __li.repair.site(), dx = b.x - S.ox, dz = b.z - S.oz; return { lx: dx * Math.cos(S.psi) - dz * Math.sin(S.psi), lz: dx * Math.sin(S.psi) + dz * Math.cos(S.psi), h: __li.H(b.x, b.z) }; });
    ok(berth.lx > 1.5 && berth.lx < 4 && berth.lz < -1.2 && berth.lz > -2.6 && berth.h < .1, name + ': the boat lies alongside the deck, on the sea side (jetty frame ' + berth.lx.toFixed(1) + ', ' + berth.lz.toFixed(1) + ', ground ' + berth.h.toFixed(2) + ' m)');
    await page.evaluate(() => { __li.repair.walk(); });
    for (let i = 0; i < 80; i++) { await page.waitForTimeout(250); const w = await page.evaluate(() => __li.repair.walkState()); if (w !== 'walking') break; }
    const w2 = await page.evaluate(() => ({ s: __li.repair.walkState(), m: __li.repair.marker() })); ok(w2.s === 'arrived' && w2.m.x > 4, name + ': the settler walks to the end of the jetty (x = ' + w2.m.x.toFixed(2) + ' m)');
    ok(errs().length === 0, name + ': 0 console errors' + (errs().length ? ' ERR ' + errs().slice(0, 2).join(' | ') : ''));
    await page.close();
  }
}
/* 7. floating and drifting */
if (want('float')) {
  const { page, errs } = await open('?ui=0&q=high&seed=1122&repair=1');
  await page.evaluate(() => { __li.setTide(-.9); __li.repair.step(240); });
  const lo = await st(page); await page.evaluate(() => { __li.setTide(.9); }); await page.waitForTimeout(600); await page.evaluate(() => __li.repair.step(120 * 8));
  const hi = await st(page);
  const moved = lo.b.filter(b => b.kind === 'plank' && !b.lost).map(b => { const o = hi.b.find(q => q.id === b.id); return o && !o.lost ? Math.hypot(o.p[0] - b.p[0], o.p[2] - b.p[2]) : 0; });
  const wet = hi.b.filter(b => b.sub > .3).length;
  ok(moved.filter(m => m > .5).length >= 2, 'a rising tide moves loose planks (' + moved.filter(m => m > .5).length + ' moved more than 0.5 m, most ' + Math.max(...moved).toFixed(1) + ' m)');
  ok(wet >= 3, wet + ' loose parts float at high tide (more than 30 percent wet)');
  ok(hi.b.every(b => b.p.every(Number.isFinite)) && hi.b.filter(b => b.lost).length === 0, 'nothing exploded or got lost in an ordinary tide');
  const lvl = await page.evaluate(() => { const b = __li.repair.bodies().find(b => b.sub > .3); return b && Math.abs(b.p[1] - __li.repair.water(b.p[0], b.p[2])) < .1; }); ok(lvl, 'a floating plank rides the water line');
  ok(errs().length === 0, 'the float section: 0 console errors');
  await page.close();
}
/* 8. cost */
if (want('cost')) {
  const { page } = await open('?ui=0&q=high&seed=1122&repair=1');
  const r = await page.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 600; i++) __li.repair.step(1); const dt = performance.now() - t0; return { per: dt / 600, ms: __li.repair.ms() }; });
  ok(r.per < 4, 'physics step (1/120 s, ' + r.ms.bodies + ' bodies): ' + r.per.toFixed(3) + ' ms per step, so about ' + (2 * r.per).toFixed(2) + ' ms per 60 fps frame (software GL, in-page JS; not a device timing); per-frame average measured in the page loop ' + r.ms.avg.toFixed(2) + ' ms, worst ' + r.ms.max.toFixed(1) + ' ms');
  const rl = await open('?ui=0&q=low&seed=1122&repair=1'); const l = await rl.page.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 600; i++) __li.repair.step(1); return { per: (performance.now() - t0) / 600, n: __li.repair.ms().bodies }; });
  ok(l.per < r.per + .5, 'q=low (' + l.n + ' bodies): ' + l.per.toFixed(3) + ' ms per step');
  await page.close(); await rl.page.close();
}
await browser.close();
console.log(fails ? fails + ' FAILED' : 'ALL PASS');
process.exit(fails ? 1 : 0);
