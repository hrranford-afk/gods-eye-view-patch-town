/* Build 18: WATERWORKS (an idea by Harry). A network of straws (sink to farms) and bucket lines (camp to toilet), with a mouse who finds the sources first.
   Run (about 6 minutes):  NODE_PATH=$(npm root -g) node games/base-camp/tests/water-test.js
   Parts: A the toys in the practice room and the scout's expedition; B a straw (droplets move, the farm stays watered, the water store refills); C a bucket line (ploop, fanfare, the empty comes back, compost);
   D compost speeds growth; E breakdowns that fix themselves (and one tap); F look mode; G the save round-trips, a build 17 save loads; H a grown colony, draw calls and screenshots 55 to 57; I 0 page errors. */
const { serve, launch, ROOT } = require('./lib.js'); const fs = require('fs'), path = require('path');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'style-colony.json'), 'utf8')), OLD17 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'build17-save.json'), 'utf8'));
const B17 = { room: 1363, close: 620 }; /* build 17 on the same fixture colony, measured the style-test.js way on a copy of build 17: 1393 / 597 (style-test), 1346 / 623 and 1350 / 639 (three runs, so about +-3% noise); the mean is used */
const stamp = (st) => { const o = {}; for (const k in st) { let v = st[k]; try { const j = JSON.parse(v), n = Date.now(); if (k === 'base-camp-save-v2') j.t = n; if (k === 'base-camp-map-v1') j.saved = n; if (k === 'bc-rooms-v1') j.rooms.forEach((r) => { r.last = n; }); v = JSON.stringify(j); } catch (e) { /* as is */ } o[k] = v; } return o; };
async function boot(p, url, store) {
  const ev = (f, a) => p.evaluate(f, a);
  await p.addInitScript(() => { let s = 4242; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await p.goto(url); await sleep(1500); await ev((st) => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); if (st) for (const k in st) localStorage.setItem(k, st[k]); }, store ? stamp(store) : null);
  await p.reload(); await sleep(1500); await ev(() => { __g.ENV.hourOverride = 12; });
  await p.click('#bMore'); await p.click('#bPrac'); await sleep(300);
  for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit')) break; } await sleep(1000);
}
const calls = (p) => p.evaluate(() => { const r = __g.renderer, i = r.info; i.reset(); r.render(__g.scene, __g.camera); return { calls: i.render.calls, tris: i.render.triangles }; });
/* paired: the same frame drawn with and without everything build 18 added (loo huts, the toy sink and toilet, the network), so the creatures' sprites and the camera cannot blur the comparison */
const paired = (p) => p.evaluate(() => {
  const G = __g, add = []; for (const S of G.G.settlements) for (const t of S.things) if (t.kind === 'loo' && t.mesh) add.push(t.mesh); for (const q of G.PROPS) if (q.id === 'sink' || q.id === 'toilet') add.push(q.mesh); for (const r of G.G.net.pipes.concat(G.G.net.lines)) add.push(r.group); for (const id in G.G.net.marks) add.push(G.G.net.marks[id]); if (G.G.net.rope) add.push(G.G.net.rope);
  const was = add.map((o) => o.visible), r = G.renderer, i = r.info; i.reset(); r.render(G.scene, G.camera); const all = i.render.calls; for (const o of add) o.visible = false; i.reset(); r.render(G.scene, G.camera); const base = i.render.calls; add.forEach((o, k) => { o.visible = was[k]; }); return { all, base };
});
const view = (p, o) => p.evaluate((o) => { const hs = (S) => S.things.filter((t) => (t.kind === 'hut' || t.kind === 'farm') && t.built), S = __g.G.settlements.slice().sort((a, b) => hs(b).length - hs(a).length)[0], L = hs(S); let cx = 0, cz = 0; for (const t of L) { cx += t.x; cz += t.z; } cx /= Math.max(1, L.length); cz /= Math.max(1, L.length); const w = S.group.localToWorld(new __g.THREE.Vector3(cx, 0, cz)); __g.P.mode = 'orbit'; __g.P.yaw = o.yaw; __g.P.pitch = o.pitch; __g.focusOn(w.x + o.dx, w.y + 0.03, w.z + o.dz, o.d); }, o);
const clean = (p) => p.evaluate(() => { for (const id of ['banner', 'toast']) { const e = document.getElementById(id); if (e) { e.className = ''; e.innerHTML = ''; } } __g.FUN.queue.length = 0; });
(async () => {
  const { srv, url } = await serve(); const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  await boot(p, url, null);
  /* a helper in the page: step the sim in small steps, calling fn(step) after each; stops when fn returns true */
  await ev(() => { window.__run = (sec, fn, step) => { step = step || 0.5; let t = 0; for (; t < sec; t += step) { __g.simulate(step, step); if (fn && fn(t)) return t; } return -1; }; __g.G.speed = 0; window.__sfxLog = []; const f = window.sfx; window.sfx = function (k) { window.__sfxLog.push(k); return f.apply(this, arguments); }; });
  /* ---------- A. the toys and the scout's expedition ---------- */
  ok('build 20', await ev(() => __g.BUILD === 'build 20'));
  ok('the practice room has a toy sink and a toy toilet as room objects', await ev(() => { const a = __g.PROPS.find((q) => q.id === 'sink'), t = __g.PROPS.find((q) => q.id === 'toilet'); return !!a && !!t && a.kind === 'sink' && t.kind === 'toilet' && __g.room.children.includes(a.mesh) && __g.room.children.includes(t.mesh); }));
  ok('the practice eyes know both (COCO classes sink and toilet), and the table has toilet', await ev(() => !!__g.COCO_ROLES.toilet && !!__g.COCO_ROLES.sink && __g.waterKind({ name: 'sink', src: 'auto' }) === 'sink' && __g.waterKind({ name: 'toilet', src: 'auto' }) === 'toilet' && __g.waterKind({ name: 'plant', src: 'auto' }) === 'pot' && __g.waterKind({ name: 'vase', src: 'auto' }) === 'vase' && __g.waterKind({ name: 'cup', src: 'auto' }) === 'cup' && __g.waterKind({ name: 'Floor', src: 'default' }) === ''));
  ok('qualities: sink fresh, plant pot and vase green, cup tea, toilet waste only', await ev(() => __g.WSRC.sink.q === 'fresh' && __g.WSRC.pot.q === 'green' && __g.WSRC.vase.q === 'green' && __g.WSRC.cup.q === 'tea' && __g.WSRC.toilet.q === 'waste'));
  for (let i = 0; i < 60 && !(await ev(() => __g.G.spots.some((s) => __g.waterKind(s) === 'sink') && __g.G.spots.some((s) => __g.waterKind(s) === 'toilet'))); i++) await sleep(500);
  const seen = await ev(() => ({ sinks: __g.G.spots.filter((s) => __g.waterKind(s) === 'sink').length, toilets: __g.G.spots.filter((s) => __g.waterKind(s) === 'toilet').length }));
  ok('the scan recognises the toy sink and toilet as spots (one each)', seen.sinks === 1 && seen.toilets === 1, JSON.stringify(seen) + JSON.stringify(await ev(() => __g.G.spots.filter((s) => __g.waterKind(s)).map((s) => [s.name, +s.x.toFixed(2), +s.y.toFixed(2), +s.z.toFixed(2)]))));
  await ev(() => { const g = __g; for (const [id, kind] of [['sink', 'sink'], ['toilet', 'toilet']]) if (!g.G.spots.some((s) => g.waterKind(s) === kind)) { const q = g.PROPS.find((x) => x.id === id), [wx, wz] = g.PLACE ? [q.x, q.z] : [0, 0]; g.addSpot({ tag: 'other', name: kind, x: wx, y: q.base + q.h, z: wz, area: 0.02, src: 'auto' }); } });
  const S0 = await ev(() => { const S = __g.mainSettlement(); S.t = Math.max(S.t, 30); S.stock.wood = 40; __g.G.net.found = {}; __g.G.net.exp = null; __g.G.net.xt = 0; __g.G.speed = 0; return { cols: S.cols.length, scouts: S.cols.filter((c) => c.scout).length, loo: !!__g.looOf(S) }; });
  ok('the colony is up with one scout; each camp has a loo hut', S0.cols >= 3 && S0.scouts === 1 && S0.loo, JSON.stringify(S0));
  const refuse = await ev(() => { const S = __g.mainSettlement(), sp = __g.G.spots.find((s) => __g.waterKind(s) === 'sink'); return { err: __g.netCanLay('pipe', S, sp), lay: !!__g.netLay('pipe', S, S.tf.x, S.tf.z, sp), n: __g.G.net.pipes.length, modes: __g.netModes().join() }; });
  ok('before the scout finds the sink no straw can be laid: "Nobody has found the sink yet"', /Nobody has found the sink/.test(refuse.err) && !refuse.lay && refuse.n === 0 && !refuse.modes.includes('waste'), JSON.stringify(refuse)); /* the cup (tea) is open at once, so straws to it are offered; the toilet is not */
  /* the expedition: walk, climb, look around, cheer; the toast says who found it; step the sim and watch the scout */
  const ex = { phases: [], toast: '', shot: false, name: '', walked: false };
  await ev(() => { window.__rec = { phases: [], toast: '', name: '', walked: false }; window.__expFn = () => { const R = window.__rec, N = __g.G.net, S = __g.mainSettlement(), c = S.cols.find((q) => q.scout), j = c && c.job, ph = j && j.type === 'expedition' ? j.ph : ''; if (ph && R.phases[R.phases.length - 1] !== ph) R.phases.push(ph); if (ph === 'go' && c.moving) R.walked = true; const t = document.getElementById('toast').textContent; if (/found the/.test(t)) { R.toast = t; R.name = c.name; } return false; }; });
  for (let round = 0; round < 8; round++) {
    const r = await ev(() => { let lookAt = false; __run(240, () => { window.__expFn(); const S = __g.mainSettlement(), c = S.cols.find((q) => q.scout), j = c && c.job; if (j && j.type === 'expedition' && j.ph === 'look' && !window.__shot && __g.waterKind(__g.spotById(j.sp)) === 'sink') { window.__shot = true; lookAt = true; return true; } return Object.keys(__g.G.net.found).length >= 2 && !(j && j.type === 'expedition'); }, 0.25); return { lookAt, found: Object.keys(__g.G.net.found).length }; });
    if (r.lookAt && !ex.shot) { ex.shot = true; await ev(() => { const S = __g.mainSettlement(), c = S.cols.find((q) => q.scout), w = S.group.localToWorld(new __g.THREE.Vector3(c.x, c.yOff || 0, c.z)); __g.P.mode = 'orbit'; __g.P.yaw = 0.5; __g.P.pitch = 0.3; __g.focusOn(w.x, w.y + 0.02, w.z, 0.42); }); await sleep(2200); await clean(p); await sleep(300); await p.screenshot({ path: OUT + '57-scout-expedition.png' }); continue; }
    if (r.found >= 2) break;
  }
  Object.assign(ex, await ev(() => window.__rec));
  console.log('  expedition phases ' + ex.phases.join(' > ') + ', toast "' + ex.toast.replace(/\s+/g, ' ').slice(0, 90) + '"');
  ok('the scout goes on an expedition: walk there, climb, LookAround, cheer, and walks back', ex.walked && ex.phases.includes('look') && ex.phases.includes('cheer') && ex.phases.includes('back'), ex.phases.join());
  ok('the toast says who found it ("Pip found the sink!") and is tagged as a placeholder', /found the (sink|toilet)/.test(ex.toast) && ex.toast.includes(ex.name) && /CAIRN \(placeholder\)/.test(ex.toast), ex.toast.slice(0, 120));
  const unl = await ev(() => { const N = __g.G.net, sk = __g.G.spots.find((s) => __g.waterKind(s) === 'sink'), tl = __g.G.spots.find((s) => __g.waterKind(s) === 'toilet'); return { sink: !!N.found[sk.id], toilet: !!N.found[tl.id], exps: N.st.expeds, modes: __g.netModes().join(), scoutBack: !__g.mainSettlement().cols.find((c) => c.scout).job || __g.mainSettlement().cols.find((c) => c.scout).job.type !== 'expedition' }; });
  ok('the expedition unlocks the sink and then the toilet (two expeditions, the toolbar offers straws and buckets)', unl.sink && unl.toilet && unl.exps >= 2 && unl.modes === 'car,pipe,waste', JSON.stringify(unl));
  ok('every invented text is marked by: CAIRN (placeholder)', await ev(() => Object.keys(__g.WW).every((k) => __g.WW[k].by === 'CAIRN (placeholder)') && Object.keys(__g.WW).length > 15 && __g.KINDS.loo.by === 'CAIRN (placeholder)'));
  ok('the milestones credit Harry', await ev(() => /Harry/.test(__g.MILESTONES.straw.join(' ')) && /Harry/.test(__g.MILESTONES.flush.join(' '))));
  /* ---------- B. a straw ---------- */
  const farmSetup = await ev(() => { const S = __g.mainSettlement(); S.stock.wood = 40; let f = S.things.find((t) => t.kind === 'farm' && t.built); if (!f) { f = __g.addThing(S, 'farm', 0.09, -0.04, { built: true, g: 0.2 }); } f.g = 0.2; f.tend = 0; return { farms: S.things.filter((t) => t.kind === 'farm').length, id: f.id }; });
  const lay = await ev(() => { const S = __g.mainSettlement(), sp = __g.G.spots.find((s) => __g.waterKind(s) === 'sink'), [wx, wz] = __g.l2w(S, 0.0, 0.1), w0 = S.stock.wood, p = __g.netLay('pipe', S, wx, wz, sp); return { made: !!p, spent: w0 - S.stock.wood, ready: p && p.ready, q: p && p.q, again: __g.netCanLay('pipe', S, sp) }; });
  ok('dragging from the camp to the sink lays a straw (4 wood); a second one is refused', lay.made && lay.spent === 4 && !lay.ready && lay.q === 'fresh' && /already joined/.test(lay.again), JSON.stringify(lay));
  await ev(() => __run(10)); await sleep(500);
  const pipeOK = await ev(() => { const p = __g.G.net.pipes[0], k = {}; for (const n of ['tube', 'ink', 'glow', 'tank', 'spr', 'drops']) k[n] = !!p[n]; return { ready: p.ready, parts: k, ink: p.ink.userData.ink === 1, striped: !!p.tube.material.map, toon: p.tube.material.isMeshToonMaterial && p.tube.material.gradientMap === __g.BCP.grad, tank: p.tank.geometry === __g.tankGeo('fresh'), len: +p.len.toFixed(2), blue: p.drops.material.color.getHex() === 0x4aa8e8 }; });
  ok('the straw is a thin toon-inked striped tube with a bottle-cap tank, a sprinkler and blue droplets', pipeOK.ready && Object.values(pipeOK.parts).every(Boolean) && pipeOK.ink && pipeOK.striped && pipeOK.toon && pipeOK.tank && pipeOK.blue && pipeOK.len > 0.3, JSON.stringify(pipeOK));
  const d0 = await ev(() => Array.from(__g.G.net.pipes[0].drops.geometry.attributes.position.array.slice(0, 9))); await sleep(700);
  const d1 = await ev(() => Array.from(__g.G.net.pipes[0].drops.geometry.attributes.position.array.slice(0, 9)));
  const moved = Math.hypot(d1[0] - d0[0], d1[1] - d0[1], d1[2] - d0[2]);
  ok('droplets visibly travel along the straw', moved > 0.01, moved.toFixed(3) + ' m in 0.7 s');
  const wet = await ev(() => { const S = __g.mainSettlement(), f = __g.pipeFarm(S, __g.G.net.pipes[0]), c0 = S.stock.water, bk = __g.G.net.brkT; const P0 = __g.G.net.pipes[0]; if (P0.kink) __g.netFix(P0, 'self'); /* a random breakdown (every 80 to 140 s) must not land in this 40 s check */ __g.G.net.brkT = 1e9; S.stock.water = 1; f.tend = 0; __run(40); __g.G.net.brkT = Math.min(bk, 100); const f2 = __g.pipeFarm(S, __g.G.net.pipes[0]) || f; /* a nearer farm may have been finished during the 40 s: the sprinkler follows the nearest built one */ return { piped: !!f2.piped, tend: Math.max(f.tend, f2.tend), water: S.stock.water, on: S.pipeOn, nearest: !!f }; });
  ok('a piped farm never dries out (tend stays up) and the camp water store refills', wet.piped && wet.tend >= 15 && wet.water > 3.5 && wet.on, JSON.stringify(wet));
  const strawMile = await ev(() => __g.FUN.album.some((e) => e.id === 'straw'));
  ok('the first straw is a milestone', strawMile);
  /* ---------- C. a bucket line ---------- */
  const lnS = await ev(() => { const S = __g.mainSettlement(), sp = __g.G.spots.find((s) => __g.waterKind(s) === 'toilet'), [wx, wz] = __g.l2w(S, 0.0, 0.1); S.waste = 2; S.compost = 0; window.__sfxLog.length = 0; const ln = __g.netLay('waste', S, wx, wz, sp); return { made: !!ln, kind: ln && ln.k, loo: !!__g.looOf(S), refusedWater: __g.netCanLay('pipe', S, sp) }; });
  ok('a bucket line is laid from the loo hut to the toilet; a straw to the toilet is refused', lnS.made && lnS.kind === 'waste' && lnS.loo && /toilet takes buckets/.test(lnS.refusedWater), JSON.stringify(lnS));
  const seenSt = []; let shot56 = false;
  await ev(() => { window.__seen = []; window.__shot56 = false; });
  for (let round = 0; round < 6; round++) {
    const r = await ev(() => { let want = false; __run(300, () => { const N = __g.G.net, ln = N.lines[0]; if (window.__seen[window.__seen.length - 1] !== ln.st) window.__seen.push(ln.st); if (ln.st === 'run' && ln.s > 0.4 && !window.__shot56) { window.__shot56 = true; want = true; return true; } return N.st.returns >= 1 && N.st.tips >= 1; }, 0.25); const N = __g.G.net; return { want, done: N.st.returns >= 1 && N.st.tips >= 1 }; });
    if (r.want && !shot56) { shot56 = true; await ev(() => { const ln = __g.G.net.lines[0]; __g.P.mode = 'orbit'; __g.P.yaw = 0.45; __g.P.pitch = 0.32; __g.focusOn(ln.cab.position.x, ln.cab.position.y - 0.01, ln.cab.position.z, 0.55); }); await sleep(2200); await clean(p); await sleep(300); await p.screenshot({ path: OUT + '56-flush-run.png' }); continue; }
    if (r.done) break;
  }
  seenSt.push(...(await ev(() => window.__seen)));
  const cyc = await ev(() => { const ln = __g.G.net.lines[0], N = __g.G.net, S = __g.mainSettlement(), L = N.log.map((e) => e.k); return { states: ln.st, tips: N.st.tips, fan: N.st.fanfares, ret: N.st.returns, log: L.filter((k, i) => L.indexOf(k) === i).join(), sfx: window.__sfxLog.filter((k) => k === 'ploop' || k === 'trumpet').join(), comp: S.compost, load: ln.load }; });
  console.log('  bucket states ' + seenSt.join(' > ') + ' | ' + JSON.stringify(cyc));
  ok('a bucket rides out, tips in at the toilet, and the empty bucket rides back to the loo hut', seenSt.includes('run') && seenSt.includes('tip') && seenSt.includes('back') && cyc.tips >= 1 && cyc.ret >= 1 && cyc.states === 'dock' && !cyc.load, seenSt.join());
  ok('the tip makes a "ploop" and then a tiny trumpet fanfare (sfx and events), and the creatures cheer', cyc.fan >= 1 && /ploop/.test(cyc.sfx) && /trumpet/.test(cyc.sfx) && /fanfare/.test(cyc.log) && /ploop/.test(cyc.log) && cyc.sfx.indexOf('ploop') < cyc.sfx.indexOf('trumpet'), cyc.sfx + ' | ' + cyc.log);
  ok('the waste feeds the compost heap', cyc.comp > 0.2);
  ok('the loo hut and the bucket are toon and inked', await ev(() => { const S = __g.mainSettlement(), loo = __g.looOf(S), ln = __g.G.net.lines[0]; const ink = (m) => m.children.some((c) => c.userData.ink); return !!loo && ink(loo.mesh.children[0]) && ink(ln.bucket) && loo.mesh.children[0].material === __g.BCP.toon; }));
  ok('the first flush run is a milestone', await ev(() => __g.FUN.album.some((e) => e.id === 'flush')));
  /* ---------- D. compost speeds growth ---------- */
  const gr = await ev(() => {
    const S = __g.mainSettlement(), f = S.things.find((t) => t.kind === 'farm' && t.built), out = {};
    for (const comp of [0, 1]) { f.g = 0.1; f.tend = 30; S.compost = comp; S.waste = 0; const l = __g.G.net.lines[0]; if (l) l.tm = 99; __g.simulate(8, 0.5); out['c' + comp] = f.g - 0.1; }
    return { out, k1: __g.compostK({ compost: 1 }), k0: __g.compostK({ compost: 0 }) };
  });
  ok('compost makes the farms grow faster (about 1.6 times with a full heap)', gr.out.c1 > gr.out.c0 * 1.4 && gr.k1 > gr.k0, JSON.stringify(gr));
  /* ---------- E. breakdowns that mend themselves ---------- */
  const wake = () => ev(() => { for (const c of __g.mainSettlement().cols) { c.needs.rest = 1; c.needs.food = 1; c.needs.water = 1; if (c.inside || (c.job && ['sleep', 'shelter'].includes(c.job.type))) { c.job = null; c.inside = false; c.mesh.visible = true; } c.cool = 0; } });
  await wake();
  const k = await ev(() => { const S = __g.mainSettlement(), p = __g.netBreak('pipe') || __g.G.net.pipes.find((q) => q.kink); if (!p) return { none: 1 }; /* the game may already have broken it by itself */ const f = S.things.find((t) => t.kind === 'farm' && t.built); f.tend = 0; S.pipeOn = false; return { kinked: p.kink, anyBroken: __g.netAnyBroken(), ku: p.ku }; });
  ok('a kinked straw happens: the droplets stop and pile up before the kink', k.kinked && k.anyBroken && k.ku > 0.8, JSON.stringify(k));
  await sleep(500); const kd0 = await ev(() => Array.from(__g.G.net.pipes[0].drops.geometry.attributes.position.array.slice(0, 6))); await sleep(600); const kd1 = await ev(() => Array.from(__g.G.net.pipes[0].drops.geometry.attributes.position.array.slice(0, 6)));
  ok('the dripping really stops while kinked', Math.hypot(kd1[0] - kd0[0], kd1[1] - kd0[1], kd1[2] - kd0[2]) < 0.0005);
  const fixRes = { t: -1, by: '', jobSeen: false };
  fixRes.t = await ev(() => __run(90, () => { const S = __g.mainSettlement(); if (S.cols.some((c) => c.job && c.job.type === 'fix')) window.__fixSeen = true; return !__g.netAnyBroken(); }, 0.5));
  const fixLog = await ev(() => ({ log: __g.G.net.log.filter((e) => e.k === 'fix').map((e) => e.by), seen: !!window.__fixSeen, kink: __g.G.net.pipes[0].kink }));
  console.log('  kink fixed after ' + fixRes.t + ' s by ' + JSON.stringify(fixLog.log));
  ok('a creature walks over and unkinks it, within a game minute', fixRes.t >= 0 && fixRes.t <= 70 && fixLog.seen && !fixLog.kink && fixLog.log.length >= 1 && fixLog.log[fixLog.log.length - 1] !== 'self', JSON.stringify([fixRes.t, fixLog]) + (fixLog.seen ? '' : ' ' + JSON.stringify(await ev(() => __g.mainSettlement().cols.map((c) => [c.name, c.job && c.job.type, c.inside, c.cool])))));
  /* a stuck bucket: wait for a bucket on the move, then it sticks, a creature climbs and wiggles it */
  await wake(); await ev(() => { const S = __g.mainSettlement(); S.waste = 3; });
  const stuckT = await ev(() => __run(120, () => { const l = __g.G.net.lines[0]; return l.st === 'run' && l.s > 0.15; }, 0.5));
  const st1 = await ev(() => { const l = __g.netBreak('line') || __g.G.net.lines.find((q) => q.st === 'stuck'); window.__fixSeen = false; return { st: l && l.st, any: __g.netAnyBroken() }; });
  ok('a bucket sticks on its line (it stops and swings)', stuckT >= 0 && st1.st === 'stuck' && st1.any, JSON.stringify([stuckT, st1]));
  const climbT = await ev(() => __run(90, () => { const S = __g.mainSettlement(); if (S.cols.some((c) => c.job && c.job.type === 'fix' && c.working)) window.__fixSeen = true; return !__g.netAnyBroken(); }, 0.5));
  const cl = await ev(() => ({ seen: !!window.__fixSeen, by: __g.G.net.log.filter((e) => e.k === 'fix').map((e) => e.by).slice(-1)[0], st: __g.G.net.lines[0].st }));
  ok('a creature climbs up and wiggles it free within a game minute', climbT >= 0 && climbT <= 70 && cl.seen && cl.by !== 'self' && cl.st !== 'stuck', JSON.stringify([climbT, cl]));
  /* a tap speeds it up, and with nobody around the straw mends itself anyway */
  const tap = await ev(() => { const p = __g.G.net.pipes[0]; __g.netBreak('pipe'); if (!p.kink) p.kink = true; const P = __g.ptAt(p, p.ku, new __g.THREE.Vector3()); __g.focusOn(P.x, P.y, P.z, 0.5); return true; }); await sleep(2000);
  const tapR = await ev(() => { const p = __g.G.net.pipes[0], P = __g.ptAt(p, p.ku, new __g.THREE.Vector3()), [sx, sy] = __g.toScreen(P), was = p.kink; __g.tapAt(sx, sy); return { was, now: p.kink, by: __g.G.net.log.slice(-1)[0] }; });
  ok('a tap from the Giant fixes it at once', tapR.was && !tapR.now && tapR.by.k === 'fix' && tapR.by.by === 'tap', JSON.stringify(tapR));
  const selfT = await ev(() => { __g.mainSettlement().cols.forEach((c) => { c.inside = true; }); const p = __g.G.net.pipes[0]; __g.netBreak('pipe'); if (!p.kink) { p.kink = true; p.fixT = 60; } const t = __run(90, () => !p.kink, 0.5); __g.mainSettlement().cols.forEach((c) => { c.inside = false; }); return t; });
  ok('with every creature asleep a break still mends itself within about a minute', selfT >= 0 && selfT <= 75, String(selfT));
  /* a bucket line can run via a ceiling hook, like a cable car (a pretend ceiling with a hook is added for this) */
  const viaR = await ev(() => {
    const g = __g, G = g.G, S = g.mainSettlement(), ln = G.net.lines[0], log = G.net.log.filter((e) => e.line === ln.id), s0 = log.find((e) => e.k === 'send'), r0 = log.find((e) => e.k === 'return' && e.t > s0.t), straight = r0.t - s0.t - 2.4;
    const Z = { id: 900, name: 'Pretend ceiling', type: 'CEIL', spec: '', ceil: true, y: 2.4, h: 0, cx: S.tf.x, cz: S.tf.z, ang: 0, w: 1.2, d: 1.2, area: 1.4, color: 0xffffff, land: null, settled: null, label: null, core: null };
    G.zones.push(Z); const h = g.addHook(Z, S, { built: true, o: [0, 0] }); ln.via = h.id; ln.key = ''; ln.st = 'dock'; ln.s = 0; ln.tm = 0; ln.load = false; S.waste = 3; const ret0 = G.net.st.returns, t0 = G.simT;
    const t = __run(300, () => G.net.st.returns > ret0, 0.25); const log2 = G.net.log.filter((e) => e.line === ln.id && e.t >= t0), s1 = log2.find((e) => e.k === 'send'), r1 = log2.find((e) => e.k === 'return');
    const hooked = s1 && r1 ? r1.t - s1.t - 2.4 : -1, passes = h.passes | 0, built = !!linkHookOK(ln);
    function linkHookOK(l) { return g.linkHook(l); }
    ln.via = 0; ln.key = ''; g.hooksDrop(); G.zones.splice(G.zones.indexOf(Z), 1); return { straight: +straight.toFixed(1), hooked: +hooked.toFixed(1), ratio: +(hooked / straight).toFixed(2), passes, built, t };
  });
  ok('a bucket line can run via a ceiling hook: the bell rings and the trip takes about 0.7 of the straight trip', viaR.passes >= 2 && viaR.built && viaR.ratio > 0.5 && viaR.ratio < 0.9, JSON.stringify(viaR));
  /* ---------- F. look mode: blue pipes, brown lines ---------- */
  const look = await ev(() => { __g.setTool('look'); __g.netVisual(0.016, 1); const p = __g.G.net.pipes[0], ln = __g.G.net.lines[0], on = [p.glow.visible, ln.glow.visible, p.glow.material.color.getHex(), ln.glow.material.color.getHex()]; __g.setTool('seed'); __g.netVisual(0.016, 1); return { on, off: [p.glow.visible, ln.glow.visible] }; });
  ok('Look mode: pipes glow blue, waste lines glow brown (and not in other tools)', look.on[0] && look.on[1] && look.on[2] === 0x4ab4ff && look.on[3] === 0xb87a3a && !look.off[0] && !look.off[1], JSON.stringify(look));
  await ev(() => __g.setTool('look'));
  /* ---------- G. save, reload, old saves ---------- */
  const sv = await ev(() => { __g.mainSettlement().compost = 0.5; __g.saveMap(); __g.saveNow(); const s = JSON.parse(localStorage.getItem('base-camp-save-v2')); return { net: s.net && { pipes: s.net.pipes.length, lines: s.net.lines.length, found: s.net.found.length }, comp: s.settlements[0].comp, v: s.v }; });
  ok('the save has the network (straw, line, found sources) and the compost; still v2', sv.v === 2 && sv.net && sv.net.pipes === 1 && sv.net.lines === 1 && sv.net.found === 2 && sv.comp > 0.3, JSON.stringify(sv));
  await p.reload(); await sleep(2500);
  const back = await ev(() => { const okc = __g.prepareContinue(); const N = __g.G.net, S = __g.G.settlements[0]; return { okc, pipes: N.pipes.length, lines: N.lines.length, found: Object.keys(N.found).length, ready: N.pipes[0] && N.pipes[0].ready, lready: N.lines[0] && N.lines[0].ready, comp: S && S.compost, loo: !!(S && __g.looOf(S)), farms: S.things.filter((t) => t.kind === 'farm').length }; });
  ok('after a reload the straw, the bucket line, the found sources, the compost and the loo hut are all back', back.okc && back.pipes === 1 && back.lines === 1 && back.found === 2 && back.ready && back.lready && back.comp > 0.3 && back.loo, JSON.stringify(back));
  await ev(() => { __g.G.speed = 0; window.__run = (sec, fn, step) => { step = step || 0.5; let t = 0; for (; t < sec; t += step) { __g.simulate(step, step); if (fn && fn(t)) return t; } return -1; }; });
  const live = await ev(() => { __g.G.holdPlace = false; for (const S of __g.G.settlements) S.placed = true; __g.G.phase = 'play'; __run(60); const N = __g.G.net; return { pipeOn: __g.G.settlements.some((S) => S.pipeOn), tips: N.st.tips }; });
  ok('the restored network keeps running', live.pipeOn);
  /* an old build 17 save (made by the real build 17) loads: no network yet, no errors, loo huts appear */
  await ev(() => { window.persist = () => {}; }); /* the page saves itself when it unloads: not this time */
  await p.evaluate((st) => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); for (const k in st) localStorage.setItem(k, st[k]); }, stamp(OLD17)); await p.reload(); await sleep(2500);
  const old = await ev(() => { let err = ''; let okc = false; try { okc = __g.prepareContinue(); } catch (e) { err = String(e && e.stack || e).slice(0, 200); } const N = __g.G.net; return { okc, err, camps: __g.G.settlements.length, pipes: N.pipes.length, lines: N.lines.length, found: Object.keys(N.found).length, cols: __g.G.settlements.reduce((a, S) => a + S.cols.length, 0), waste: __g.G.settlements[0] && __g.G.settlements[0].waste }; });
  ok('a build 17 save (no network fields) loads, with the defaults', old.okc && !old.err && old.camps >= 1 && old.pipes === 0 && old.lines === 0 && old.found === 0 && old.cols >= 3, JSON.stringify(old));
  const old2 = await ev(() => { __g.G.holdPlace = false; for (const S of __g.G.settlements) S.placed = true; __g.G.phase = 'play'; __g.G.speed = 0; for (const S of __g.G.settlements) S.t = Math.max(S.t, 60); __g.simulate(40, 0.5); return { loos: __g.G.settlements.map((S) => !!__g.looOf(S)), save: (() => { __g.saveNow(); const s = JSON.parse(localStorage.getItem('base-camp-save-v2')); return !!s.net && s.v === 2; })() }; });
  ok('the old colony grows a loo hut in every camp and saves in the new format', old2.loos.every(Boolean) && old2.save, JSON.stringify(old2));
  ok('0 page errors (parts A to G)', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  await b.close();
  /* ---------- H. a grown colony: draw calls and screenshot 55 ---------- */
  const L = await launch(); const p2 = L.p, ev2 = (f, a) => p2.evaluate(f, a);
  await boot(p2, url, FIX); await ev2(() => { __g.G.speed = 0; });
  await ev2(() => { __g.G.settlements.forEach((S) => { S.cols.forEach((c) => { c.mesh.visible = true; }); }); });
  ok('the fixture colony (build 15 save) loaded in build 18', await ev2(() => __g.G.settlements.reduce((a, S) => a + S.cols.length, 0) >= 6 && __g.G.settlements.length >= 2));
  await view(p2, { yaw: 0.3, pitch: 0.55, dx: -0.1, dz: 0, d: 3.6 }); await sleep(2200); const r0 = await calls(p2), q0 = await paired(p2);
  await p2.setViewportSize({ width: 900, height: 700 }); await p2.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' }); await sleep(500);
  await view(p2, { yaw: 0.45, pitch: 0.55, dx: 0, dz: 0, d: 0.5 }); await sleep(2200); const c0 = await calls(p2), cq0 = await paired(p2);
  console.log('  draw calls without pipes: whole room ' + r0.calls + ' / close ' + c0.calls + '  (build 17: ' + B17.room + ' / ' + B17.close + ', ratio ' + (r0.calls / B17.room).toFixed(3) + ' / ' + (c0.calls / B17.close).toFixed(3) + ')');
  console.log('  paired (same frame with and without what build 18 added): whole room ' + q0.all + ' vs ' + q0.base + ' (' + (q0.all / q0.base).toFixed(3) + '), close ' + cq0.all + ' vs ' + cq0.base + ' (' + (cq0.all / cq0.base).toFixed(3) + ')');
  ok('draw calls within 10% of build 17 for a colony without pipes (loo huts and toys added: whole room, close orbit)', q0.all <= q0.base * 1.1 && cq0.all <= cq0.base * 1.1, JSON.stringify([q0, cq0]));
  await p2.setViewportSize({ width: 1180, height: 820 }); await sleep(500);
  /* two straws (sink to the two biggest camps) and one waste line */
  const net = await ev2(() => {
    const g = __g, G = g.G; g.ENV.hourOverride = 12;
    const sinkP = g.PROPS.find((q) => q.id === 'sink'), toiP = g.PROPS.find((q) => q.id === 'toilet'), at = (q) => { const c = Math.cos(g.PLACE.yaw), s = Math.sin(g.PLACE.yaw); return [q.x * c + q.z * s + g.PLACE.x, -q.x * s + q.z * c + g.PLACE.z]; };
    let sk = G.spots.find((s) => g.waterKind(s) === 'sink'), tl = G.spots.find((s) => g.waterKind(s) === 'toilet');
    if (!sk) { const [x, z] = at(sinkP); sk = g.addSpot({ tag: 'other', name: 'sink', x, y: sinkP.base + sinkP.h, z, area: 0.02, src: 'auto' }); }
    if (!tl) { const [x, z] = at(toiP); tl = g.addSpot({ tag: 'other', name: 'toilet', x, y: toiP.base + toiP.h, z, area: 0.02, src: 'auto' }); }
    G.net.found[sk.id] = true; G.net.found[tl.id] = true;
    const camps = G.settlements.filter((S) => g.campOK(S)).sort((a, b) => b.things.length - a.things.length), out = [];
    for (const S of camps.slice(0, 2)) { S.stock.wood = 40; if (!S.things.some((t) => t.kind === 'farm' && t.built)) g.addThing(S, 'farm', 0.1, 0.02, { built: true, g: 0.5 }); const [wx, wz] = g.l2w(S, -0.1, 0.0); const p = g.netLay('pipe', S, wx, wz, sk); out.push(!!p); }
    const S0 = camps[0]; S0.stock.wood = 40; const [wx, wz] = g.l2w(S0, -0.1, 0.0); out.push(!!g.netLay('waste', S0, wx, wz, tl));
    return { out, camps: camps.length, pipes: G.net.pipes.length, lines: G.net.lines.length };
  });
  await ev2(() => { window.__run = (sec, fn, step) => { step = step || 0.5; let t = 0; for (; t < sec; t += step) { __g.simulate(step, step); if (fn && fn(t)) return t; } return -1; }; __run(30); __g.G.net.pipes.forEach((p) => { p.kink = false; }); });
  ok('two straws and one bucket line laid on the grown colony', net.out.every(Boolean) && net.pipes === 2 && net.lines === 1, JSON.stringify(net));
  await view(p2, { yaw: 0.3, pitch: 0.55, dx: -0.1, dz: 0, d: 3.6 }); await sleep(2200); const r1 = await calls(p2), q1 = await paired(p2);
  await p2.setViewportSize({ width: 900, height: 700 }); await sleep(500); await view(p2, { yaw: 0.45, pitch: 0.55, dx: 0, dz: 0, d: 0.5 }); await sleep(2200); const c1 = await calls(p2), cq1 = await paired(p2);
  console.log('  draw calls with two straws and one bucket line: whole room ' + r1.calls + ' / close ' + c1.calls + '  (ratio to build 17 ' + (r1.calls / B17.room).toFixed(3) + ' / ' + (c1.calls / B17.close).toFixed(3) + ')');
  console.log('  paired with the network: whole room ' + q1.all + ' vs ' + q1.base + ' (' + (q1.all / q1.base).toFixed(3) + '), close ' + cq1.all + ' vs ' + cq1.base + ' (' + (cq1.all / cq1.base).toFixed(3) + ')');
  ok('draw calls within 20% of build 17 with two straws and one bucket line', q1.all <= q1.base * 1.2 && cq1.all <= cq1.base * 1.2, JSON.stringify([q1, cq1]));
  await p2.setViewportSize({ width: 1180, height: 820 }); await sleep(500);
  const aud = await ev2(() => { const G = __g, grad = G.BCP.grad, inks = new Set(Object.values(G.BCP.inks)); const o = { toon: 0, ink: 0, exc: 0, bad: [] }; const vis = (m) => { for (let q = m; q; q = q.parent) if (!q.visible) return false; return true; }; for (const run of G.G.net.pipes.concat(G.G.net.lines)) run.group.traverse((m) => { if (!m.isMesh || !vis(m)) return; const mt = m.material; if (mt.isMeshToonMaterial && mt.gradientMap === grad) o.toon++; else if (inks.has(mt)) o.ink++; else if (mt.isMeshBasicMaterial && mt.transparent) o.exc++; else o.bad.push(mt.type + ' ' + m.geometry.type); }); return o; });
  ok('every visible mesh of the network is toon, ink or a soft overlay', aud.bad.length === 0 && aud.toon > 3 && aud.ink > 3, JSON.stringify(aud));
  /* screenshot 55: straws from the sink to the farms, droplets visible */
  await ev2(() => { const g = __g, G = g.G; g.setTool('look'); for (const S of G.settlements) for (const c of S.cols) if (c.job && c.job.type === 'expedition') { c.job = null; c.yOff = 0; c.moving = false; } G.net.exp = null; if (G.net.rope) G.net.rope.visible = false; const p0 = G.net.pipes[0], A = g.ptAt(p0, 0.0, new g.THREE.Vector3()), T = g.ptAt(p0, 0.95, new g.THREE.Vector3()), N = p0.N, S = G.settlements.find((q) => q.id === p0.sid); const cx = (A.x + N.x) / 2, cz = (A.z + N.z) / 2; let dx = N.x - A.x, dz = N.z - A.z; const dl = Math.hypot(dx, dz) || 1; let px = -dz / dl, pz = dx / dl; if (px * (S.tf.x - cx) + pz * (S.tf.z - cz) < 0) { px = -px; pz = -pz; } g.P.mode = 'orbit'; g.P.yaw = Math.atan2(px, pz); g.P.pitch = 0.36; g.focusOn(cx, (A.y + N.y) / 2 - 0.08, cz, Math.max(0.9, A.distanceTo(N) * 1.5)); });
  await sleep(2600); await clean(p2); await sleep(300); await p2.screenshot({ path: OUT + '55-waterworks.png' });
  ok('0 page errors (grown colony)', L.errs.length === 0, JSON.stringify(L.errs.slice(0, 3)));
  await L.b.close();
  console.log(res.filter(Boolean).length + '/' + res.length + ' passed'); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})();
