/* Build 17: the Backpack Scout mouse (ChatGPT's animated GLB, sent by Harry). One scout per camp, GLB with five clips, procedural fallback, normal-creature fallback.
   Run: NODE_PATH=$(npm root -g) node games/base-camp/tests/scout-test.js   (about 6 minutes; writes shots/53-mouse-scout.png and shots/54-mouse-walk.png) */
const { serve, launch, ROOT } = require('./lib.js'); const fs = require('fs'), path = require('path');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'style-colony.json'), 'utf8'));
const SEED = () => { let s = 4242; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
async function startPractice(p, url, store, wait) {
  const ev = (f, a) => p.evaluate(f, a);
  await p.addInitScript(SEED);
  await p.goto(url); await sleep(1500);
  await ev((st) => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); if (st) for (const k in st) { let v = st[k]; try { const o = JSON.parse(v); if (k === 'base-camp-save-v2') o.t = Date.now(); v = JSON.stringify(o); } catch (e) { /* keep as is */ } localStorage.setItem(k, v); } }, store);
  await p.reload(); await sleep(wait || 3000); await ev(() => { __g.ENV.hourOverride = 12; });
  await openPractice(p);
}
/* More, then Practice room; retried, because a click that lands while the page is still settling shows nothing */
async function openPractice(p) {
  const ev = (f, a) => p.evaluate(f, a);
  for (let k = 0; k < 6; k++) { try { await p.click('#bMore', { timeout: 8000 }); await p.click('#bPrac', { timeout: 4000 }); break; } catch (e) { await sleep(1500); } }
  await sleep(300);
  for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit')) break; } await sleep(1000);
}
/* what the colony's scouts look like right now */
const SCOUTS = () => {
  const camps = __g.G.settlements.filter((S) => S.cols.length);
  return {
    camps: camps.length,
    perCamp: camps.map((S) => S.cols.filter((c) => c.scout).length),
    glb: camps.map((S) => S.cols.filter((c) => c.scout && c.mesh.userData.scout17).length),
    proc: camps.map((S) => S.cols.filter((c) => c.scout && !c.mesh.userData.scout17 && c.mesh.userData.ears).length),
    normal: camps.reduce((n, S) => n + S.cols.filter((c) => !c.scout && !c.mesh.userData.scout17 && !c.mesh.userData.ears).length, 0),
    status: __g.SCOUT17.status, clips: __g.SCOUT17.clips.length, loader: !!__g.THREE.GLTFLoader,
  };
};
const glbMeshes = (p) => p.evaluate(() => { let n = 0; __g.scene.traverse((o) => { if (o.userData && o.userData.glb) o.traverse((m) => { if (m.isMesh) n++; }); }); return n; });
/* wait (game time runs) until the scout stands clear of the others and nobody is parading, so the picture shows the mouse and not a crowd */
const calm = (p, id, wantMoving) => p.evaluate(async ([id, wantMoving]) => {
  for (let i = 0; i < 1200; i++) {
    const S = __g.G.settlements.find((S) => S.cols.some((q) => q.id === id)), c = S.cols.find((q) => q.id === id);
    const near = Math.min(...S.cols.filter((q) => q !== c).map((q) => Math.hypot(q.x - c.x, q.z - c.z)), 9), crowd = S.cols.some((q) => q.job && (q.job.type === 'parade' || q.job.type === 'cross')) || !!(__g.FUN && __g.FUN.fest);
    const C = c.mesh.userData.scout17, ok = near > 0.06 && !crowd && !c.held && (!wantMoving || (c.moving && C && C.name === 'Walk' && C.actions.Walk.time > 0.35));
    if (ok) return i; await new Promise((r) => setTimeout(r, 50));
  }
  return -1;
}, [id, wantMoving]);
const follow = (p, c, d) => p.evaluate(([id, d]) => { const col = __g.G.settlements.flatMap((S) => S.cols).find((q) => q.id === id), v = new __g.THREE.Vector3(); col.mesh.getWorldPosition(v); __g.P.mode = 'orbit'; __g.focusOn(v.x, v.y + 0.012, v.z, d || 0.16); __g.P.target.set(v.x, v.y + 0.012, v.z); __g.P.dist = d || 0.16; }, [c, d]);
/* pick a yaw from which nothing solid stands between the camera and the scout (a tree in front spoils the picture), then frame him */
const clearShot = (p, id, d, pitch, wait) => p.evaluate(async ([id, d, pitch, wait]) => {
  const T = __g.THREE, c = __g.G.settlements.flatMap((S) => S.cols).find((q) => q.id === id), v = new T.Vector3(), rc = new T.Raycaster(); rc.camera = __g.camera; let best = 0.5, bestN = 1e9;
  const frame = (v) => { __g.focusOn(v.x, v.y + 0.012, v.z, d); __g.P.target.set(v.x, v.y + 0.012, v.z); __g.P.dist = d; };
  const solid = (o) => { for (let q = o; q; q = q.parent) { if (q === c.mesh) return false; } const m = o.material; return o.isMesh && !(m && (m.transparent || m.depthWrite === false)) && !o.userData.ink; };
  for (let k = 0; k < 16; k++) {
    const yaw = 0.5 + k * 0.39; c.mesh.getWorldPosition(v); __g.P.mode = 'orbit'; __g.P.yaw = yaw; __g.P.pitch = pitch; frame(v);
    await new Promise((r) => setTimeout(r, wait)); __g.camera.updateMatrixWorld(true);
    const tgt = new T.Vector3(v.x, v.y + 0.03, v.z), org = __g.camera.getWorldPosition(new T.Vector3()), dir = tgt.clone().sub(org), len = dir.length(); rc.set(org, dir.normalize()); rc.far = len;
    const hits = rc.intersectObjects(__g.scene.children, true).filter((h) => solid(h.object)).length;
    if (hits < bestN) { bestN = hits; best = yaw; } if (!hits) break;
  }
  c.mesh.getWorldPosition(v); __g.P.yaw = best; frame(v); await new Promise((r) => setTimeout(r, wait)); return bestN;
}, [id, d, pitch, wait || 400]);
(async () => {
  const { srv, url } = await serve();
  /* ================= page 1: the GLB mouse, a fresh practice room grown for a while ================= */
  const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  await startPractice(p, url, process.env.FAST ? FIX : undefined, 3500); /* FAST=1: start from the fixture colony instead of growing one (quick check of the pictures) */
  ok('build 26', await ev(() => __g.BUILD === 'build 26'));
  ok('the GLB loaded: status loaded, 5 clips (Idle Walk Wave LookAround Hop)', await ev(() => __g.SCOUT17.status === 'loaded' && __g.SCOUT17.clips.map((c) => c.name).join() === 'Idle,Walk,Wave,LookAround,Hop'), await ev(() => __g.SCOUT17.status + ' ' + __g.SCOUT17.clips.length));
  if (!process.env.FAST) await ev(() => __g.simulate(9000)); await sleep(1500);
  let s = await ev(SCOUTS); console.log('  scouts', JSON.stringify(s));
  ok('the colony grew into several camps', s.camps >= 2, String(s.camps));
  ok('exactly one scout per camp', s.perCamp.every((n) => n === 1), JSON.stringify(s.perCamp));
  ok('every scout wears the GLB model (one GLB mouse per camp), and no scout is left procedural', s.glb.every((n) => n === 1) && s.proc.every((n) => n === 0), JSON.stringify([s.glb, s.proc]));
  ok('the other colonists are the usual creatures', s.normal >= 1, String(s.normal));
  const per = await glbMeshes(p); console.log('  GLB mesh nodes in the scene: ' + per + ' (' + s.camps + ' camps)');
  ok('the GLB scene holds about 53 meshes per camp', per === 53 * s.camps, String(per));
  ok('the scouts are named and tagged as backpack scouts; the card line has the mouse', await ev(() => { const c = __g.G.settlements[0].cols.find((q) => q.scout); return __g.charKey(c) === 'Scout' && !!__g.CHAR.Scout && __g.G.settlements.flatMap((S) => S.cols).filter((q) => !q.scout).every((q) => __g.charKey(q) !== 'Scout'); }));
  /* animation: Walk while moving, Idle when still */
  const seen = await ev(async () => {
    const out = { walkWhileMoving: 0, walkWhileStill: 0, idleStill: 0, names: {}, running: 0 };
    for (let i = 0; i < 400; i++) {
      await new Promise((r) => setTimeout(r, 50));
      for (const S of __g.G.settlements) for (const c of S.cols) if (c.scout && c.mesh.userData.scout17) {
        const C = c.mesh.userData.scout17; out.names[C.name] = 1;
        if (c.moving && C.name === 'Walk') { out.walkWhileMoving++; if (C.actions.Walk.isRunning()) out.running++; }
        if (!c.moving && C.name === 'Walk' && !c.held) out.walkWhileStill++;
        if (!c.moving && C.name === 'Idle') out.idleStill++;
      }
      if (out.walkWhileMoving > 6 && out.idleStill > 6) break;
    }
    return out;
  });
  console.log('  animation', JSON.stringify(seen));
  ok('the animation switches to Walk while the scout moves (and the Walk action runs)', seen.walkWhileMoving > 3 && seen.running > 3, JSON.stringify(seen));
  ok('and rests on Idle when it stands still', seen.idleStill > 3);
  /* other clips: poke the game state and read the choice back */
  const clips = await ev(() => {
    const c = __g.G.settlements.flatMap((S) => S.cols).find((q) => q.scout && q.mesh.userData.scout17), C = c.mesh.userData.scout17, out = {};
    const keep = { moving: c.moving, job: c.job, held: c.held, hop: c.hop, cheerT: c.cheerT, dancing: c.dancing, fall: c.fall };
    const pick = (set) => { c.moving = false; c.job = null; c.held = false; c.hop = 0; c.cheerT = 0; c.dancing = false; c.fall = null; set(); __g.scout17Tick(c, 0.016); return C.name; };
    out.wave = pick(() => { c.cheerT = 5; });
    out.hop = pick(() => { c.held = true; });
    out.look = pick(() => { c.job = { type: 'read' }; });
    out.walk = pick(() => { c.moving = true; });
    out.idle = pick(() => {});
    Object.assign(c, keep);
    return out;
  });
  console.log('  clips', JSON.stringify(clips));
  ok('every state picks its clip: Wave cheering, Hop held, LookAround reading, Walk moving, Idle still', clips.wave === 'Wave' && clips.hop === 'Hop' && clips.look === 'LookAround' && clips.walk === 'Walk' && clips.idle === 'Idle', JSON.stringify(clips));
  /* creature cam, tap, save */
  const sc = await ev(() => { const c = __g.G.settlements.flatMap((S) => S.cols).find((q) => q.scout); __g.camOpen(c); return c.id; }); await sleep(1500);
  const cam = await ev(() => { const r = __g.ccamRender(true); return { on: __g.CCAM.on, r }; });
  ok('the creature cam opens on the scout and really renders', cam.on && cam.r && cam.r.colours >= 3 && cam.r.opaque > 20, JSON.stringify(cam.r));
  await ev(() => __g.camClose());
  await ev(() => { __g.persist(true); });
  const saved = await ev(() => { const o = JSON.parse(localStorage.getItem('base-camp-save-v2')); return o.settlements.map((S) => S.cols.filter((c) => c.scout === true).length + '/' + S.cols.length); });
  ok('the save carries the scout flag (one per camp) and is still v2', await ev(() => JSON.parse(localStorage.getItem('base-camp-save-v2')).v === 2) && saved.every((q) => q.startsWith('1/')), JSON.stringify(saved));
  /* reload: the same scouts come back */
  const ids0 = await ev(() => __g.G.settlements.flatMap((S) => S.cols.filter((c) => c.scout).map((c) => c.name)).sort().join());
  await p.reload(); await sleep(3500); await openPractice(p); await sleep(500);
  const ids1 = await ev(() => __g.G.settlements.flatMap((S) => S.cols.filter((c) => c.scout).map((c) => c.name)).sort().join());
  ok('after a reload the same colonists are the scouts', ids0.length > 0 && ids0 === ids1, ids0 + ' | ' + ids1);
  s = await ev(SCOUTS); ok('and they wear the GLB again', s.glb.every((n) => n === 1), JSON.stringify(s.glb));
  /* the source has no // comment inside the ported code (a mid-line one breaks the game) */
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), a = html.indexOf('const SCOUT16_TEX'), z = html.indexOf('function mkColonist(c)');
  ok('the ported code has no // comments', a > 0 && z > a && !/(^|[^:'"])\/\/(?!\/)/.test(html.slice(a, z).replace(/https?:\/\/\S+/g, '')));
  ok('0 page errors (GLB)', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  /* screenshots */
  await p.setViewportSize({ width: 900, height: 700 }); await p.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' }); await sleep(500);
  await ev(() => { __g.ENV.hourOverride = 12; });
  const pickScout = await ev(() => { const c = __g.G.settlements.slice().sort((x, y) => y.things.length - x.things.length).flatMap((S) => S.cols).find((q) => q.scout); return c.id; });
  await ev((id) => { const c = __g.G.settlements.flatMap((S) => S.cols).find((q) => q.id === id); c.job = null; c.moving = false; c.cheerT = 0; }, pickScout);
  console.log('  calm scout after ' + (await calm(p, pickScout, false)) + ' polls');
  const blocked = await clearShot(p, pickScout, 0.2, 0.28, 400); console.log('  shot: solid things between camera and scout: ' + blocked);
  for (let i = 0; i < 3; i++) { await follow(p, pickScout, 0.2); await sleep(250); }
  await p.screenshot({ path: OUT + '53-mouse-scout.png' });
  /* mid-stride: wait for a clear walk (a few strides in, nobody close), frame him, check the line of sight, shoot */
  let got = false;
  for (let k = 0; k < 8 && !got; k++) {
    const w = await calm(p, pickScout, true);
    if (w < 0) { await sleep(500); continue; }
    await clearShot(p, pickScout, 0.2, 0.28, 60);
    got = await ev((id) => { const c = __g.G.settlements.flatMap((S) => S.cols).find((q) => q.id === id), C = c.mesh.userData.scout17; return !!(c.moving && C && C.name === 'Walk'); }, pickScout);
  }
  await p.screenshot({ path: OUT + '54-mouse-walk.png' });
  ok('screenshots written (53 scout, 54 mid-stride)', got && fs.existsSync(OUT + '53-mouse-scout.png') && fs.existsSync(OUT + '54-mouse-walk.png'));
  await b.close();

  /* ================= page 2: an OLD save (no scout field anywhere) ================= */
  {
    const old = JSON.parse(FIX['base-camp-save-v2']); let had = 0, cols = 0;
    for (const S of old.settlements) for (const c of S.cols) { cols++; if ('scout' in c) had++; delete c.scout; }
    const store = Object.assign({}, FIX, { 'base-camp-save-v2': JSON.stringify(old) });
    const L = await launch(); const e2 = (f, a) => L.p.evaluate(f, a);
    await startPractice(L.p, url, store, 3500);
    const o = await e2(SCOUTS); console.log('  old save', JSON.stringify(o), 'fields before:', had, 'cols:', cols);
    ok('old save (no scout field): it really has none', had === 0 && cols >= 6);
    ok('old save: the first colonist of every camp becomes the scout, and only that one', o.perCamp.length >= 2 && o.perCamp.every((n) => n === 1), JSON.stringify(o.perCamp));
    ok('old save: the scouts wear the GLB and the others stay creatures', o.glb.every((n) => n === 1) && o.normal >= 3, JSON.stringify([o.glb, o.normal]));
    ok('old save: the game runs on (simulate) and saves the flag', await e2(() => { __g.simulate(600); __g.persist(true); return JSON.parse(localStorage.getItem('base-camp-save-v2')).settlements.every((S) => !S.cols.length || S.cols.filter((c) => c.scout).length === 1); }));
    ok('0 page errors (old save)', L.errs.length === 0, JSON.stringify(L.errs.slice(0, 3)));
    await L.b.close();
  }

  /* ================= page 3: the GLB is blocked (a real 404) ================= */
  {
    const L = await launch(); const e3 = (f, a) => L.p.evaluate(f, a);
    await L.ctx.route('**/*.glb', (r) => r.fulfill({ status: 404, body: 'no' }));
    await startPractice(L.p, url); await e3(() => __g.simulate(3000)); await sleep(1000);
    const o = await e3(SCOUTS); console.log('  glb 404', JSON.stringify(o));
    ok('GLB blocked: status fallback, no clips', o.status === 'fallback' && o.clips === 0, o.status);
    ok('GLB blocked: every camp still has one scout, now the procedural mouse', o.perCamp.length >= 1 && o.perCamp.every((n) => n === 1) && o.proc.every((n) => n === 1) && o.glb.every((n) => n === 0), JSON.stringify([o.perCamp, o.proc]));
    ok('GLB blocked: the procedural mouse is toon and inked (the shared look)', await e3(() => { const c = __g.G.settlements[0].cols.find((q) => q.scout); const grad = __g.BCP.grad; let toon = 0, ink = 0, bad = []; c.mesh.traverse((m) => { if (!m.isMesh) return; const mt = m.material; if (m.userData.ink) ink++; else if (mt.isMeshToonMaterial && mt.gradientMap === grad) toon++; else if (!(mt.isMeshBasicMaterial && mt.transparent)) bad.push(mt.type); }); return toon > 40 && ink === 2 && bad.length === 0; }));
    ok('GLB blocked: the game still plays (simulate, save, creature cam)', await e3(() => { __g.simulate(600); __g.persist(true); const c = __g.G.settlements[0].cols.find((q) => q.scout); __g.camOpen(c); const r = __g.ccamRender(true); __g.camClose(); return !!localStorage.getItem('base-camp-save-v2') && r && r.opaque > 20; }));
    ok('0 page errors (GLB blocked)', L.errs.length === 0, JSON.stringify(L.errs.slice(0, 3)));
    await L.b.close();
  }

  /* ================= page 4: GLTFLoader.js is blocked ================= */
  {
    const L = await launch(); const e4 = (f, a) => L.p.evaluate(f, a);
    await L.ctx.route('**/GLTFLoader.js', (r) => r.abort());
    await startPractice(L.p, url); await e4(() => __g.simulate(3000)); await sleep(1000);
    const o = await e4(SCOUTS); console.log('  no loader', JSON.stringify(o));
    ok('GLTFLoader blocked: no loader, status no-loader', !o.loader && o.status === 'no-loader', o.status);
    ok('GLTFLoader blocked: one procedural scout per camp, no GLB', o.perCamp.length >= 1 && o.perCamp.every((n) => n === 1) && o.proc.every((n) => n === 1) && o.glb.every((n) => n === 0), JSON.stringify([o.perCamp, o.proc]));
    ok('GLTFLoader blocked: nothing waits for a model that will never come', await e4(() => __g.SCOUT17.waiting.length === 0));
    ok('0 page errors (GLTFLoader blocked)', L.errs.length === 0, JSON.stringify(L.errs.slice(0, 3)));
    await L.b.close();
  }

  /* ================= page 5: the procedural mouse itself fails: a normal creature, never a broken game ================= */
  {
    const L = await launch(); const e5 = (f, a) => L.p.evaluate(f, a);
    await L.ctx.route('**/*.glb', (r) => r.fulfill({ status: 404, body: 'no' }));
    await L.p.addInitScript(() => { const ce = document.createElement.bind(document); document.createElement = function (t) { if (String(t).toLowerCase() === 'canvas' && new Error().stack.includes('scout16Texture')) throw new Error('test: no canvas for the scout'); return ce.apply(document, arguments); }; });
    await startPractice(L.p, url); await e5(() => __g.simulate(3000)); await sleep(1000);
    const o = await e5(SCOUTS); console.log('  procedural fails', JSON.stringify(o));
    ok('procedural mouse fails: every colonist is a normal creature (no scout left, no GLB)', o.camps >= 1 && o.perCamp.every((n) => n === 0) && o.glb.every((n) => n === 0) && o.proc.every((n) => n === 0), JSON.stringify(o));
    ok('procedural mouse fails: the colony still lives and saves', await e5(() => { const n0 = __g.G.settlements.flatMap((S) => S.cols).length; __g.simulate(600); __g.persist(true); return n0 >= 3 && !!localStorage.getItem('base-camp-save-v2'); }));
    ok('0 page errors (procedural fails)', L.errs.length === 0, JSON.stringify(L.errs.slice(0, 3)));
    await L.b.close();
  }
  srv.close();
  const f = res.filter((x) => !x).length; console.log(f ? 'FAILED ' + f + ' of ' + res.length : 'ALL ' + res.length + ' PASSED'); process.exit(f ? 1 : 0);
})().catch((e) => { console.log('CRASH', e); process.exit(2); });
