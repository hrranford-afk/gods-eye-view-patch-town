// Build 15: the CC0 props (models/props.js) replace the simple shapes; the old shapes are the fallback; draw calls stay close to before.
// Run: NODE_PATH=$(npm root -g) node games/base-camp/tests/props-test.js
const { serve, launch, ROOT } = require('./lib.js'); const path = require('path');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
async function startPractice(p, url) {
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto(url); await sleep(1500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); });
  await p.reload(); await sleep(1500); await ev(() => { __g.ENV.hourOverride = 12; });
  await p.click('#bMore'); await p.click('#bPrac'); await sleep(300);
  for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit')) break; } await sleep(1000);
}
const HIDE_UI = 'body > *:not(canvas) { visibility: hidden !important; }';
(async () => {
  const { srv, url } = await serve(); const ev0 = { url };
  // ---------- page 1: the props are loaded ----------
  const { b, ctx, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a); ev.url = url;
  await p.addInitScript(() => { let s = 4242; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await startPractice(p, url);
  ok('props.js loaded: BC_PROPS and bcOK', await ev(() => !!window.BC_PROPS && Object.keys(window.BC_PROPS).length >= 14 && __g.bcOK('matchboxHut') && __g.bcOK('well')));
  ok('build 19', await ev(() => document.body.innerHTML.includes('build 15') || true) && (await ev(() => document.documentElement.innerHTML.includes("const BUILD = 'build 19"))));
  await ev(() => __g.simulate(9000)); await sleep(1500);
  const kinds = await ev(() => { const o = {}; for (const S of __g.G.settlements) for (const t of S.things) { const k = t.kind + (t.mesh.userData.bcp ? '+props' : ''); o[k] = (o[k] || 0) + 1; } return o; });
  console.log('  colony things', JSON.stringify(kinds));
  ok('the grown colony has huts made from the props (matchbox / can)', (kinds['hut+props'] || 0) >= 4 && !kinds.hut, JSON.stringify(kinds));
  ok('its farms are made from the props', (kinds['farm+props'] || 0) >= 2 && !kinds.farm);
  ok('its well is made from the props', (kinds['well+props'] || 0) >= 1 && !kinds.well);
  const mk = await ev(() => {
    const has = (m) => !!m.userData.bcp, meshN = (m) => { let n = 0; m.traverse((o) => { if (o.isMesh) n++; }); return n; };
    const tin = __g.mkHut({ tin: true, id: 1 }), tin2 = __g.mkHut({ tin: true, id: 2 }), plain = __g.mkHut({ id: 3 }), farm = __g.mkFarm(), well = __g.mkWell(), look = __g.mkLookout(), lw = __g.mkLandmark('well'), ls = __g.mkLandmark('silo'), lm = __g.mkLandmark('market'), lp = __g.mkLandmark('plaza'), sup = __g.DECOR_MK.supper();
    const names = (m) => { const a = []; m.traverse((o) => { if (typeof o.userData.bcp === 'string') a.push(o.userData.bcp); }); return a; };
    return { plain: names(plain), tin: names(tin), tin2: names(tin2), farmCrops: farm.userData.crops.length, farmKinds: new Set(farm.userData.crops.map((c) => names(c)[0])).size, well: has(well) || names(well).join(), look: names(look), lw: names(lw), ls: names(ls), lm: names(lm), lp: names(lp), supper: names(sup) };
  });
  console.log('  makers', JSON.stringify(mk));
  ok('plain hut = the matchbox on its side', mk.plain.join() === 'matchLying');
  ok('a hut bought with tin = a can (open or closed)', mk.tin.join() === 'canHutOpen' && mk.tin2.join() === 'canHut');
  ok('farm: 15 prop crops of 3 or more kinds', mk.farmCrops === 15 && mk.farmKinds >= 3, mk.farmCrops + ' crops, ' + mk.farmKinds + ' kinds');
  ok('well, lookout and the well / silo / market / plaza landmarks use props', mk.well && mk.look.join() === 'lookoutFrame' && mk.lw.join() === 'well' && mk.ls.join() === 'peanutJar' && mk.lm.includes('honeyJar') && mk.lp.filter((x) => x === 'match').length === 4);
  ok('the harvest supper has a pumpkin and corn', mk.supper.join() === 'pumpkin,corn');
  const sh = await ev(() => { const a = __g.mkHut({ id: 1 }), c = __g.mkHut({ id: 2 }), f1 = __g.mkFarm(), f2 = __g.mkFarm(); const g = (m) => m.children[0].children[0]; return { geo: g(a).geometry === g(c).geometry, mat: g(a).material === g(c).material && g(a).material === __g.BCP.toon, ink: Object.keys(__g.BCP.inks).length, crop: f1.userData.crops[0].children[0].children[0].material === f2.userData.crops[3].children[0].children[0].material, noInkOnCrops: f1.userData.crops.every((c) => c.children[0].children.length === 1) }; });
  ok('geometry and material are shared between huts, farms and crops', sh.geo && sh.mat && sh.crop && sh.ink <= 2, JSON.stringify(sh));
  ok('crops have no ink outline (no black leaf fleck, fewer draw calls)', sh.noInkOnCrops);
  // draw calls: the same colony with props, then with BC_PROPS deleted (the old shapes), then restored
  const meas = (label) => ev(() => { const r = __g.renderer, i = r.info; i.reset(); r.render(__g.scene, __g.camera); return { calls: i.render.calls, tris: i.render.triangles }; });
  const shot = async (name, o) => { await ev((o) => { const hs = (S) => S.things.filter((t) => (t.kind === 'hut' || t.kind === 'farm') && t.built), S = __g.G.settlements.slice().sort((a, b) => hs(b).length - hs(a).length)[0], L = hs(S); let cx = 0, cz = 0; for (const t of L) { cx += t.x; cz += t.z; } cx /= Math.max(1, L.length); cz /= Math.max(1, L.length); const w = S.group.localToWorld(new __g.THREE.Vector3(cx, 0, cz)); __g.P.mode = 'orbit'; __g.P.yaw = o.yaw; __g.P.pitch = o.pitch; __g.focusOn(w.x + o.dx, w.y, w.z + o.dz, o.d); }, o); await sleep(2200); if (name) await p.screenshot({ path: OUT + name }); };
  const view = (yaw) => ({ yaw, pitch: 0.62, dx: 0, dz: 0, d: 0.5 });
  await shot(null, { yaw: 0.3, pitch: 0.55, dx: -0.1, dz: 0.8 - 0.8, d: 3.6 });
  await ev(() => { __g.G.settlements.forEach((S) => { S.mood = S.mood; }); });
  const room1 = await meas(), propsRoom = room1;
  const saved = await ev(() => { window.__bcSaved = window.BC_PROPS; delete window.BC_PROPS; __g.bcRebuild(); return !window.BC_PROPS; });
  await sleep(800); const roomOld = await meas();
  await ev(() => { window.BC_PROPS = window.__bcSaved; __g.bcRebuild(); }); await sleep(800); const roomNew = await meas();
  const ratio = roomNew.calls / roomOld.calls;
  console.log('  practice room after simulate(9000), whole-room orbit: old shapes ' + roomOld.calls + ' calls / ' + roomOld.tris + ' tris; props ' + roomNew.calls + ' calls / ' + roomNew.tris + ' tris; ratio ' + ratio.toFixed(2));
  ok('draw calls with props stay within 20% of before (whole room)', saved && roomOld.calls > 100 && ratio <= 1.2, roomOld.calls + ' -> ' + roomNew.calls);
  ok('triangle count stays small enough for an iPad (under 200k)', roomNew.tris < 200000, String(roomNew.tris));
  // the close-up shots: same colony, old shapes left, props right
  await p.setViewportSize({ width: 900, height: 700 }); await p.addStyleTag({ content: HIDE_UI }); await sleep(500);
  await shot('49-props-colony.png', { yaw: 0.45, pitch: 0.55, dx: 0, dz: 0, d: 0.5 });
  const close = await meas();
  await ev(() => { delete window.BC_PROPS; __g.bcRebuild(); }); await shot('_old.png', { yaw: 0.45, pitch: 0.55, dx: 0, dz: 0, d: 0.5 });
  const closeOld = await meas(); console.log('  close-up: old ' + closeOld.calls + ' calls, props ' + close.calls + ' calls');
  await ev(() => { window.BC_PROPS = window.__bcSaved; __g.bcRebuild(); }); await sleep(300);
  ok('close-up draw calls also stay within 20%', close.calls <= closeOld.calls * 1.2, closeOld.calls + ' -> ' + close.calls);
  const fs = require('fs'), a = fs.readFileSync(OUT + '_old.png').toString('base64'), c = fs.readFileSync(OUT + '49-props-colony.png').toString('base64'); fs.unlinkSync(OUT + '_old.png');
  const q = await ctx.newPage(); await q.setViewportSize({ width: 1800, height: 740 });
  await q.setContent('<body style="margin:0;background:#222;font:600 22px sans-serif;color:#fff"><div style="display:flex;gap:0"><div style="position:relative"><img width=900 height=700 src="data:image/png;base64,' + a + '"><div style="position:absolute;left:12px;top:10px;background:#000a;padding:4px 10px;border-radius:8px">old shapes</div></div><div style="position:relative"><img width=900 height=700 src="data:image/png;base64,' + c + '"><div style="position:absolute;left:12px;top:10px;background:#000a;padding:4px 10px;border-radius:8px">new props</div></div></div></body>'); await sleep(400);
  await q.screenshot({ path: OUT + '50-props-before-after.png', clip: { x: 0, y: 0, width: 1800, height: 700 } }); await q.close();
  // the colony keeps working and saving with props
  await ev(() => __g.simulate(600)); await ev(() => { __g.persist(true); });
  const sv = await ev(() => { const s = JSON.parse(localStorage.getItem('base-camp-save-v2')); return s && s.v === 2 && s.settlements.length >= 1; });
  ok('the colony saves in the same v2 format', sv);
  ok('0 page errors (props)', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  await b.close();
  // ---------- page 2: props.js does not load: the old shapes ----------
  const L = await launch(); const p2 = L.p, ev2 = (f, a) => p2.evaluate(f, a); ev2.url = url;
  await L.ctx.route('**/models/props.js', (r) => r.abort());
  await startPractice(p2, url);
  ok('props.js blocked: no BC_PROPS, bcOK false', await ev2(() => !window.BC_PROPS && !__g.bcOK('well') && !__g.bcOK('matchboxHut')));
  await ev2(() => __g.simulate(6000)); await sleep(1500);
  const fb = await ev2(() => { const o = { huts: 0, hutsProps: 0, farms: 0, crops: 0, wells: 0 }; for (const S of __g.G.settlements) for (const t of S.things) { if (t.kind === 'hut') { o.huts++; if (t.mesh.userData.bcp) o.hutsProps++; } if (t.kind === 'farm') { o.farms++; o.crops += t.mesh.userData.crops.length; } if (t.kind === 'well') o.wells++; } return o; });
  ok('fallback: huts, farms and wells are built with the old shapes', fb.huts >= 3 && fb.hutsProps === 0 && fb.farms >= 1 && fb.crops === fb.farms * 24 && fb.wells >= 1, JSON.stringify(fb));
  const fk = await ev2(() => ({ lm: __g.mkLandmark('silo').children.length > 1, supper: __g.DECOR_MK.supper().children.length > 5, look: !__g.mkLookout().userData.bcp }));
  ok('fallback: landmarks, the supper and the lookout still build', fk.lm && fk.supper && fk.look, JSON.stringify(fk));
  await ev2(() => { __g.persist(true); }); ok('fallback: the game saves', await ev2(() => !!localStorage.getItem('base-camp-save-v2')));
  ok('0 page errors (fallback, props.js blocked)', L.errs.length === 0, JSON.stringify(L.errs.slice(0, 3)));
  await L.b.close();
  // ---------- page 3: BC_PROPS removed after the game started (the "deleted" fallback) ----------
  const D = await launch(); const ev3 = (f, a) => D.p.evaluate(f, a); ev3.url = url;
  await startPractice(D.p, url); await ev3(() => { delete window.BC_PROPS; }); await ev3(() => __g.simulate(4000)); await sleep(1000);
  ok('BC_PROPS deleted at run time: new huts and farms are old shapes, no errors', await ev3(() => !__g.mkHut().userData.bcp && !__g.mkFarm().userData.bcp && __g.G.settlements.length >= 1) && D.errs.length === 0, JSON.stringify(D.errs.slice(0, 3)));
  await D.b.close();
  console.log(res.filter(Boolean).length + '/' + res.length + ' passed'); srv.close(); process.exit(res.every(Boolean) ? 0 : 1);
})();
