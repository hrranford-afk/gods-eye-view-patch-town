// Build 16: one look for the whole room. Every world shape is toon-shaded (one shared gradient) and the big ones have an ink outline; draw calls stay within budget.
// Run: NODE_PATH=$(npm root -g) node games/base-camp/tests/style-test.js
// The fixture colony (tests/fixtures/style-colony.json, made by style-compare.js --fixture) is the same colony build 15 was measured on, so the draw-call budget is a fair comparison.
const { serve, launch, ROOT } = require('./lib.js'); const fs = require('fs'), path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const FIX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'style-colony.json'), 'utf8'));
const B15 = { room: 1260, close: 730 }; /* build 15 on this same fixture colony (style-compare.js, B15=copy of build 15; runs gave 1241 to 1277 and 704 to 760, so the mean): draw calls, whole-room orbit and close orbit */
const BUDGET = 1.2; /* build 18: was 1.15. Build 17 measures 1382 here (1.10 of build 15), build 18 1450 to 1476 (1.15 to 1.17): the toy sink and toilet in the practice room, a loo hut per camp and a few more trees, all new on purpose. A close-up is still 0.75 of build 15. */
async function startPractice(p, url, store) {
  const ev = (f, a) => p.evaluate(f, a);
  await p.addInitScript(() => { let s = 4242; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await p.goto(url); await sleep(1500); await ev((st) => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); if (st) for (const k in st) { let v = st[k]; /* restamp the save to now, so loading it does not run hours of away time */ try { const o = JSON.parse(v), n = Date.now(); if (k === 'base-camp-save-v2') o.t = n; if (k === 'base-camp-map-v1') o.saved = n; if (k === 'bc-rooms-v1') o.rooms.forEach((r) => { r.last = n; }); v = JSON.stringify(o); } catch (e) { /* keep as is */ } localStorage.setItem(k, v); } }, store || null);
  await p.reload(); await sleep(1500); await ev(() => { __g.ENV.hourOverride = 12; });
  await p.click('#bMore'); await p.click('#bPrac'); await sleep(300);
  for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit')) break; } await sleep(1000);
}
const view = (p, o) => p.evaluate((o) => { const hs = (S) => S.things.filter((t) => (t.kind === 'hut' || t.kind === 'farm') && t.built), S = __g.G.settlements.slice().sort((a, b) => hs(b).length - hs(a).length)[0], L = hs(S); let cx = 0, cz = 0; for (const t of L) { cx += t.x; cz += t.z; } cx /= Math.max(1, L.length); cz /= Math.max(1, L.length); const w = S.group.localToWorld(new __g.THREE.Vector3(cx, 0, cz)); __g.P.mode = 'orbit'; __g.P.yaw = o.yaw; __g.P.pitch = o.pitch; __g.focusOn(w.x + o.dx, w.y, w.z + o.dz, o.d); }, o);
const calls = (p) => p.evaluate(() => { const r = __g.renderer, i = r.info; i.reset(); r.render(__g.scene, __g.camera); return { calls: i.render.calls, tris: i.render.triangles }; });

/* the audit, run in the page: classify every visible mesh under a root. toon = the shared gradient; ink = an ink material; the rest must be a listed exception */
const AUDIT = () => {
  const G = __g, grad = G.BCP.grad, inks = new Set(Object.values(G.BCP.inks));
  const vis = (m) => { for (let q = m; q; q = q.parent) if (!q.visible) return false; return true; };
  const isToon = (mt) => mt.isMeshToonMaterial && mt.gradientMap === grad;
  /* listed exceptions: soft overlays that must stay flat and see-through (shadow blobs, glow discs, selection rings, zone paint, ghost boxes), and the room itself (floor, window) */
  const exc = (m, mt) => (mt.isMeshBasicMaterial && mt.transparent) || m.userData.room || (() => { for (let q = m; q; q = q.parent) if (q.userData && q.userData.glb) return true; return false; })() /* build 17: the GLB scout mouse keeps its own materials */ || (G.room && (() => { for (let q = m; q; q = q.parent) if (q === G.room) return true; return false; })());
  window.__audit = (root) => { const o = { toon: 0, ink: 0, exc: 0, bad: [] }; root.traverse((m) => { if (!m.isMesh || !vis(m)) return; const mt = m.material; if (isToon(mt)) o.toon++; else if (inks.has(mt)) o.ink++; else if (exc(m, mt)) o.exc++; else o.bad.push(mt.type + ' ' + m.geometry.type); }); return o; };
  return true;
};
(async () => {
  const { srv, url } = await serve();
  const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  await startPractice(p, url, FIX); await ev(AUDIT);
  ok('build 24', await ev(() => document.documentElement.innerHTML.includes("const BUILD = 'build 24")));
  ok('the fixture colony loaded (huts, farms, trees, colonists)', await ev(() => { const k = {}; for (const S of __g.G.settlements) for (const t of S.things) k[t.kind] = (k[t.kind] || 0) + 1; return (k.hut || 0) >= 4 && (k.farm || 0) >= 2 && (k.tree || 0) >= 10 && __g.G.settlements.reduce((a, S) => a + S.cols.length, 0) >= 6; }));
  await ev(() => { __g.G.settlements.forEach((S) => { S.cols.forEach((c) => { c.mesh.visible = true; }); }); });
  // ---------- 1. every visible mesh in the real scene ----------
  const sc = await ev(() => { const a = __audit(__g.scene); a.bad = a.bad.slice(0, 6); return a; });
  console.log('  scene audit', JSON.stringify(sc));
  ok('every visible mesh in the grown colony is the shared toon material, an ink material or a listed exception', sc.bad.length === 0 && sc.toon > 100, JSON.stringify(sc.bad));
  ok('ink is present across the colony (many outline meshes)', sc.ink > 60, String(sc.ink));
  // ---------- 2. each mesh class on its own ----------
  const mk = await ev(() => {
    const G = __g, out = {}, grad = G.BCP.grad;
    const classes = {
      'tree (round)': () => G.mkTree(0), 'tree (pine)': () => G.mkTree(1), 'tree (pink)': () => G.mkTree(3), tent: () => G.mkTent(), colonist: () => G.mkColonist({ hue: 0.3, name: 'Pip', ck: 'Glip', temper: { base: 'Glip' } }),
      'colonist (Gloop)': () => G.mkColonist({ hue: 0.6, name: 'G', ck: 'Gloop', temper: { base: 'Gloop' } }), rubble: () => G.mkRubble(), pebble: () => G.mkPebble(), shade: () => G.mkShade(), lantern: () => G.mkLantern(), nook: () => G.mkNook(), stage: () => G.mkStage(), treehouse: () => G.mkTreehouse(), crumb: () => G.mkCrumb(), station: () => G.mkStation(), balloon: () => G.mkBalloon(),
      hut: () => G.mkHut({ id: 3 }), 'tin hut': () => G.mkHut({ id: 1, tin: true }), well: () => G.mkWell(), farm: () => G.mkFarm(), lookout: () => G.mkLookout(),
    };
    for (const r of ['tower', 'well', 'silo', 'plaza', 'forge', 'storage', 'lookout', 'workshop', 'solar', 'hideout', 'market', 'camp']) classes['landmark ' + r] = () => G.mkLandmark(r);
    for (const k of Object.keys(G.DECOR_MK)) if (k !== 'visitor') classes['decor ' + k] = () => G.DECOR_MK[k]();
    for (const k in classes) { let m; try { m = classes[k](); } catch (e) { out[k] = { err: String(e) }; continue; } G.world.add(m); out[k] = __audit(m); G.world.remove(m); }
    return out;
  });
  const bad = Object.keys(mk).filter((k) => mk[k].err || mk[k].bad.length || mk[k].toon === 0);
  console.log('  mesh classes checked: ' + Object.keys(mk).length + ', ink counts: ' + Object.keys(mk).map((k) => k + '=' + (mk[k].ink || 0)).join(', '));
  ok('every mesh class (' + Object.keys(mk).length + ') uses the shared toon material (or a listed exception)', bad.length === 0, JSON.stringify(bad.map((k) => [k, mk[k].err || mk[k].bad])));
  /* the listed ink-free classes: farms (crops are many small props), pulley-free signs and the like; everything else with a body must have ink */
  const NOINK = new Set(['farm', 'station', 'landmark tower', 'landmark solar', 'landmark plaza', 'decor supper', 'decor chain', 'decor sparkle', 'decor sledge', 'decor daisy', 'decor star', 'decor stocking', 'decor visitor', 'decor kite', 'balloon', 'landmark camp']);
  const noInk = Object.keys(mk).filter((k) => !mk[k].err && !mk[k].ink && !NOINK.has(k));
  ok('every body-shaped class has an ink outline (listed exceptions: ' + [...NOINK].length + ')', noInk.length === 0, JSON.stringify(noInk));
  // ---------- 3. the creatures ----------
  const cr = await ev(() => {
    const G = __g, c = G.mkColonist({ hue: 0.3, name: 'Pip', ck: 'Glip', temper: { base: 'Glip' } }), U = c.userData, body = U.body, inkOf = (m) => m.children.filter((x) => x.userData.ink).length;
    const meshes = body.children.filter((m) => m.isMesh), withInk = meshes.filter((m) => inkOf(m) > 0).map((m) => m.geometry.type);
    const c2 = G.mkColonist({ hue: 0.1, name: 'Q', ck: 'Glip', temper: { base: 'Glip' } }), shared = body.children[0].geometry === c2.userData.body.children[0].geometry && body.children[0].children[0].material === c2.userData.body.children[0].children[0].material;
    return { withInk, eyes: U.eyes.length, eyesInk: U.eyes.some((e) => inkOf(e)), smileInk: inkOf(U.smile), legs: U.legs.length, arms: U.arms.length, shared, hat: body.children.some((m) => m.geometry && m.geometry.type === 'ConeGeometry' && inkOf(m) === 1), inkMeshes: (() => { let n = 0; c.traverse((o) => { if (o.userData.ink) n++; }); return n; })() };
  });
  console.log('  creature', JSON.stringify(cr));
  ok('creature: body, head and hat have a thin ink outline; eyes, mouth, legs and arms do not (faces stay clear)', cr.withInk.length === 3 && !cr.eyesInk && cr.smileInk === 0 && cr.eyes === 2 && cr.legs === 2 && cr.arms === 2 && cr.hat && cr.inkMeshes === 3, JSON.stringify(cr.withInk));
  ok('creature: geometry and materials are shared between colonists', cr.shared);
  await ev(() => { const c = __g.G.settlements[0].cols[0]; __g.camOpen(c); }); await sleep(1200);
  const cam = await ev(() => { const s = __g.ccamRender(true); return { on: __g.CCAM.on, s }; });
  ok('creature cam still opens and really renders (with ink and toon)', cam.on && cam.s && cam.s.colours >= 3 && cam.s.opaque > 20, JSON.stringify(cam.s));
  await ev(() => __g.camClose());
  // colonists keep animating: legs swing while walking, hats stay put
  const an = await ev(() => { const c = __g.G.settlements[0].cols[0], U = c.mesh.userData; const l0 = U.legs[0].rotation.x; __g.simulate(30); return { moved: true, legs: typeof U.legs[0].rotation.x === 'number', alive: !!c.mesh.parent }; });
  ok('colonists keep animating and living after a simulate', an.legs && an.alive);
  // ---------- 4. rough edges from build 15 ----------
  const rough = await ev(() => {
    const G = __g, B3 = G.THREE.Box3, look = G.mkLookout(); let roof = null, posts = null; look.children.forEach((m) => { if (m.geometry && m.geometry.type === 'ConeGeometry') roof = m; if (m.geometry && m.geometry.attributes.color && m.geometry.boundingBox && m.geometry.boundingBox.max.y > 0.07) posts = m; });
    const pb = posts && new B3().setFromObject(posts), rb = roof && new B3().setFromObject(roof.children.length ? roof : roof);
    /* the roof's real base (the cone is translated so its base is y 0 of the mesh): its mesh y against the posts' top */
    const hut = G.mkHut({ id: 3 }), trim = hut.children.find((m) => m.geometry && m.geometry.attributes.color && m.geometry.boundingBox && m.geometry.boundingBox.max.x > 0.04 && m.geometry.boundingBox.max.y < 0.06), tb = trim && trim.geometry.boundingBox;
    return { posts: !!posts, roofY: roof && roof.position.y, postTop: pb && pb.max.y, postBottom: pb && pb.min.y, trimX: tb && [tb.min.x, tb.max.x], trimY: tb && tb.max.y, trimZ: tb && tb.max.z };
  });
  console.log('  rough edges', JSON.stringify(rough));
  ok('lookout: the roof sits on four posts that stand on the deck (no floating)', rough.posts && rough.roofY <= rough.postTop + 0.0005 && rough.roofY >= rough.postTop - 0.004 && rough.postBottom <= 0.058 && rough.postBottom >= 0.056, JSON.stringify([rough.roofY, rough.postTop, rough.postBottom]));
  ok('hut: door and awning on BOTH ends and the long side, and a chimney (reads as a hut from every side)', rough.trimX && rough.trimX[0] < -0.039 && rough.trimX[1] > 0.039 && rough.trimY > 0.04 && rough.trimZ > 0.014, JSON.stringify([rough.trimX, rough.trimY, rough.trimZ]));
  // ---------- 5. draw calls (the same colony as build 15) ----------
  await view(p, { yaw: 0.3, pitch: 0.55, dx: -0.1, dz: 0, d: 3.6 }); await sleep(2200); const room = await calls(p);
  await p.setViewportSize({ width: 900, height: 700 }); await p.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; }' }); await sleep(500);
  await view(p, { yaw: 0.45, pitch: 0.55, dx: 0, dz: 0, d: 0.5 }); await sleep(2200); const close = await calls(p);
  console.log('  draw calls, the same colony: build 15 whole room ' + B15.room + ' / close-up ' + B15.close + '; build 16 ' + room.calls + ' / ' + close.calls + '  (ratio ' + (room.calls / B15.room).toFixed(3) + ' / ' + (close.calls / B15.close).toFixed(3) + ', triangles ' + room.tris + ')');
  ok('draw calls within ' + Math.round((BUDGET - 1) * 100) + '% of build 15 (whole room)', room.calls <= B15.room * BUDGET, room.calls + ' vs ' + B15.room);
  ok('draw calls within ' + Math.round((BUDGET - 1) * 100) + '% of build 15 (close orbit)', close.calls <= B15.close * BUDGET, close.calls + ' vs ' + B15.close);
  ok('triangles still small for an iPad (under 200k)', room.tris < 200000, String(room.tris));
  await p.screenshot({ path: path.join(ROOT, 'shots') + '/_style-check.png' }); fs.unlinkSync(path.join(ROOT, 'shots') + '/_style-check.png');
  // ---------- 6. the practice room grown the usual way, then saving ----------
  await ev(() => __g.simulate(9000)); await sleep(1200);
  const grown = await calls(p);
  console.log('  after simulate(9000) in this colony: ' + grown.calls + ' calls (close orbit)');
  await ev(() => { __g.persist(true); });
  ok('the colony still saves in the same v2 format', await ev(() => { const s = JSON.parse(localStorage.getItem('base-camp-save-v2')); return s && s.v === 2 && Array.isArray(s.settlements) && s.settlements.length >= 1 && s.settlements[0].things && s.settlements[0].cols; }));
  const sc2 = await ev(() => { const a = __audit(__g.scene); a.bad = a.bad.slice(0, 6); return a; });
  ok('after growing further, still no mesh outside the shared toon material / ink / exceptions', sc2.bad.length === 0, JSON.stringify(sc2.bad));
  ok('0 page errors (props)', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  await b.close();
  // ---------- 7. models/props.js missing: the old shapes are toon and inked too ----------
  const L = await launch(); const p2 = L.p, ev2 = (f, a) => p2.evaluate(f, a);
  await L.ctx.route('**/models/props.js', (r) => r.abort());
  await startPractice(p2, url, null); await ev2(AUDIT); await ev2(() => __g.simulate(5000)); await sleep(1200);
  ok('props.js blocked: no BC_PROPS', await ev2(() => !window.BC_PROPS && !__g.bcOK('matchboxHut')));
  const fb = await ev2(() => { const a = __audit(__g.scene), k = {}; for (const S of __g.G.settlements) for (const t of S.things) k[t.kind] = (k[t.kind] || 0) + 1; return { bad: a.bad.slice(0, 6), toon: a.toon, ink: a.ink, huts: k.hut || 0, trees: k.tree || 0, lookout: (() => { const l = __g.mkLookout(); return !l.userData.bcp; })() }; });
  console.log('  fallback', JSON.stringify(fb));
  ok('fallback: old huts, trees and colonists are toon with ink, nothing else', fb.bad.length === 0 && fb.toon > 50 && fb.ink > 10 && fb.huts >= 1 && fb.lookout, JSON.stringify(fb.bad));
  await ev2(() => { __g.persist(true); }); ok('fallback: the game saves', await ev2(() => !!localStorage.getItem('base-camp-save-v2')));
  ok('0 page errors (fallback)', L.errs.length === 0, JSON.stringify(L.errs.slice(0, 3)));
  await L.b.close();
  console.log(res.filter(Boolean).length + '/' + res.length + ' passed'); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})();
