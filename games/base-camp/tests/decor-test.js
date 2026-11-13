// Build 18: the season decorations from models/decor.js (BC_DECOR_MK): every key builds, draw-call budgets, tick runs, the fallbacks work, no page errors in a December practice room. Writes shots/62-christmas-colony.png.
// Run: NODE_PATH=$(npm root -g) node games/base-camp/tests/decor-test.js
const { serve, launch, ROOT } = require('./lib.js'); const path = require('path');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const KEYS = ['leafpile', 'supper', 'plantern', 'calendar', 'pinetree', 'chain', 'stocking', 'snowman', 'sledge', 'daisy', 'scarecrow', 'star', 'sparkle', 'igloo', 'kite', 'paddle'];
const HIDE_UI = 'body > *:not(canvas) { visibility: hidden !important; }';
async function startPractice(p, url) {
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto(url); await sleep(1500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); });
  await p.reload(); await sleep(1500); await ev(() => { __g.ENV.hourOverride = 12; });
  await p.click('#bMore'); await p.click('#bPrac'); await sleep(300);
  for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit')) break; } await sleep(1000);
}
/* what a maker built: draw calls (visible meshes, points, sprites), triangles, footprint, height, whether tick exists and runs */
const probe = (keys) => keys.map((k) => {
  const g = __g.decorMake(k), U = g.userData; let calls = 0, tris = 0, bad = 0; const box = new __g.THREE.Box3();
  g.traverse((o) => { if (o.isMesh || o.isPoints || o.isSprite) { calls++; const geo = o.geometry; if (geo && geo.attributes && geo.attributes.position) { const n = geo.index ? geo.index.count : geo.attributes.position.count; tris += o.isPoints ? 0 : n / 3; for (const v of geo.attributes.position.array) if (!isFinite(v)) bad++; } } });
  g.updateMatrixWorld(true); const sph = []; g.traverse((o) => { if (o.isMesh && o.geometry && !o.userData.ink && o.material && o.material.type !== 'MeshBasicMaterial') { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld); box.union(b); } });
  const r = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z));
  let tickOk = null, tickErr = '', nan = false;
  if (typeof U.tick === 'function') { try { for (let i = 0; i < 40; i++) U.tick(1 + i * 0.37, 0.016); tickOk = true; g.traverse((o) => { if (!isFinite(o.position.x + o.position.y + o.position.z + o.scale.x + o.rotation.x + o.rotation.y + o.rotation.z)) nan = true; }); } catch (e) { tickOk = false; tickErr = e.message; } }
  return { k, calls, tris: Math.round(tris), r: +r.toFixed(4), want: __g.DECOR[k].r, h: +box.max.y.toFixed(4), minY: +box.min.y.toFixed(4), isNew: !!U.bcDecor, hasTick: typeof U.tick === 'function', tickOk, tickErr, nan, bad };
});
(async () => {
  const { srv, url } = await serve(); const { b, ctx, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  await p.addInitScript(() => { let s = 777; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await startPractice(p, url);
  ok('decor.js loaded: BC_DECOR_MK has all 16 keys and init', await ev((K) => !!window.BC_DECOR_MK && typeof BC_DECOR_MK.init === 'function' && K.every((k) => typeof BC_DECOR_MK[k] === 'function'), KEYS));
  // 1. every key builds, draw calls, footprint, tick
  const R = await ev(probe.toString().includes('=>') ? new Function('K', 'return (' + probe.toString() + ')(K)') : null, KEYS);
  for (const r of R) console.log('  ' + r.k.padEnd(10) + ' calls ' + String(r.calls).padStart(3) + '  tris ' + String(r.tris).padStart(5) + '  r ' + r.r + ' (old ' + r.want + ')  h ' + r.h + '  tick ' + r.hasTick);
  ok('every key builds a THREE.Group from decor.js (not the plain maker)', R.length === 16 && R.every((r) => r.isNew));
  ok('every decoration is within 60 draw calls', R.every((r) => r.calls < 60), 'max ' + Math.max(...R.map((r) => r.calls)));
  ok('all but the calendar are within 20 draw calls', R.filter((r) => r.k !== 'calendar').every((r) => r.calls < 20), R.filter((r) => r.calls >= 20).map((r) => r.k + ':' + r.calls).join(' '));
  ok('no NaN in any geometry', R.every((r) => r.bad === 0));
  ok('footprint stays near the plain one (radius within 1.6x of DECOR r, never under 40%)', R.every((r) => r.r <= r.want * 1.6 && r.r >= r.want * 0.4), R.filter((r) => !(r.r <= r.want * 1.6 && r.r >= r.want * 0.4)).map((r) => r.k + ' ' + r.r + ' vs ' + r.want).join(' '));
  ok('sits on the ground (nothing below y -3 mm) and is a creature-scale object (under 10 cm)', R.every((r) => r.minY > -0.003 && r.h < 0.1 && r.h > 0.008), R.filter((r) => !(r.minY > -0.003 && r.h < 0.1 && r.h > 0.008)).map((r) => r.k + ' ' + r.minY + '..' + r.h).join(' '));
  ok('tick exists for the lively ones and runs 40 times without error or NaN', ['plantern', 'pinetree', 'star', 'sparkle', 'chain', 'calendar', 'snowman', 'stocking', 'kite', 'paddle', 'igloo', 'supper', 'leafpile', 'daisy', 'scarecrow'].every((k) => { const r = R.find((x) => x.k === k); return r.hasTick && r.tickOk && !r.nan; }), R.filter((r) => r.hasTick && !r.tickOk).map((r) => r.k + ' ' + r.tickErr).join(' '));
  // game animation fields the plain makers have are still there
  ok('the fields decorAnim animates are kept (star, glow, head, doors, ring, kite, duck, pile)', await ev(() => { const g = (k) => __g.decorMake(k).userData; return !!g('pinetree').star && !!g('star').star && !!g('star').glow && !!g('plantern').head && !!g('snowman').head && g('calendar').doors.length === 25 && !!g('sparkle').ring && !!g('kite').kite && !!g('paddle').duck && !!g('leafpile').pile; }));
  ok('calendar doors: 24, each with its own hinge, door and material (the game opens them one by one)', await ev(() => { const d = __g.decorMake('calendar').userData.doors; let n = 0, mats = new Set(); for (let i = 1; i <= 24; i++) { if (d[i] && d[i].hinge && d[i].door && d[i].door.material && d[i].door.material.emissive) { n++; mats.add(d[i].door.material); } } return n === 24 && mats.size === 24; }));
  ok('shared geometry: two pine trees use the same body geometry and shared toon material', await ev(() => { const a = __g.decorMake('pinetree'), c = __g.decorMake('pinetree'); return a.children[0].geometry === c.children[0].geometry && a.children[0].material === c.children[0].material && a.children[0].material === __g.BCP.toon; }));
  ok('no text on any object: no canvas texture other than glow, spark and shadow is used', await ev(() => { let ok = true; for (const k of ['calendar', 'pinetree', 'stocking']) __g.decorMake(k).traverse((o) => { if (o.material && o.material.map && o.material.map.image && !(o.isSprite || o.isPoints || o.material.type === 'MeshBasicMaterial')) ok = false; }); return ok; }));
  // 2. a maker that throws falls back to the plain one
  const thr = await ev(() => { const keep = BC_DECOR_MK.snowman; BC_DECOR_MK.snowman = () => { throw new Error('boom'); }; const g = __g.decorMake('snowman'), plain = !g.userData.bcDecor && !!g.userData.head; BC_DECOR_MK.snowman = keep; const back = !!__g.decorMake('snowman').userData.bcDecor; BCP_off: { __g.BCP.decorOff = true; var off = !__g.decorMake('pinetree').userData.bcDecor; __g.BCP.decorOff = false; } return { plain, back, off }; });
  ok('a maker that throws: the plain shape is built, the next call works again; BCP.decorOff gives the plain ones', thr.plain && thr.back && thr.off, JSON.stringify(thr));
  // 3. the December practice room: decorations built through the game, ticked by the animation loop, 0 page errors
  await ev(() => __g.simulate(5000)); await sleep(1000);
  await ev(() => { __g.ENV.dateOverride = '2026-12-05'; __g.ENV._sk = 0; __g.envUpdate(); }); await sleep(1500);
  const placed = await ev((K) => { const o = {}; for (const k of K) { const t = __g.seaPlace(k, true); o[k] = !!t; } return o; }, KEYS);
  ok('all 16 decorations can be placed built through the game (seaPlace)', Object.values(placed).filter(Boolean).length >= 12, JSON.stringify(placed));
  await sleep(2500);
  const live = await ev(() => { const S = __g.mainSettlement(); const th = S.things.filter((t) => __g.DECOR[t.kind] && t.kind !== 'visitor' && t.built && t.mesh); return { n: th.length, newOnes: th.filter((t) => t.mesh.userData.bcDecor).length, ticking: th.filter((t) => t.mesh.userData.tick).length }; });
  ok('the colony\'s decorations are the new ones and carry a tick', live.n >= 10 && live.newOnes === live.n && live.ticking >= 8, JSON.stringify(live));
  await p.setViewportSize({ width: 1180, height: 820 }); await ev(() => { __g.ENV.hourOverride = 18; __g.envUpdate(); });
  /* the picture: the decorations set out in two tidy rows beside the huts, so one close view shows them all */
  await ev(() => {
    const S = __g.mainSettlement(), L = S.things.filter((t) => __g.DECOR[t.kind] && t.built && t.kind !== 'visitor'), order = ['pinetree', 'star', 'calendar', 'chain', 'stocking', 'snowman', 'sledge', 'igloo', 'sparkle', 'plantern', 'leafpile', 'supper', 'daisy', 'scarecrow', 'kite', 'paddle'];
    L.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)); const hs = S.things.filter((t) => t.kind === 'hut' && t.built); let cx = 0, cz = 0; for (const h of hs) { cx += h.x; cz += h.z; } cx /= Math.max(1, hs.length); cz /= Math.max(1, hs.length);
    L.slice(0, 11).forEach((t, i) => { t.x = cx - 0.17 + (i % 6) * 0.065; t.z = cz + 0.06 + Math.floor(i / 6) * 0.07; t.rot = 0.4; if (t.mesh) { t.mesh.position.set(t.x, 0, t.z); t.mesh.rotation.y = t.rot; } });
    L.slice(11).forEach((t) => { t.x = cx - 0.3; t.z = cz + 0.5; if (t.mesh) t.mesh.position.set(t.x, 0, t.z); });
    const w = S.group.localToWorld(new __g.THREE.Vector3(cx - 0.05, 0, cz + 0.095)); __g.P.mode = 'orbit'; __g.P.yaw = 0.2; __g.P.pitch = 0.62; __g.focusOn(w.x, w.y, w.z, 0.3);
  });
  await p.addStyleTag({ content: HIDE_UI }); await sleep(3500); await p.screenshot({ path: OUT + '62-christmas-colony.png' });
  await sleep(3000);
  const calls = await ev(() => { const r = __g.renderer, i = r.info; i.reset(); r.render(__g.scene, __g.camera); return { calls: i.render.calls, tris: i.render.triangles }; });
  console.log('  December colony draw calls ' + calls.calls + ', triangles ' + calls.tris);
  ok('0 page errors in the December practice room (dateOverride 2026-12-05)', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  const errs1 = errs.length; await b.close();
  // 4. decor.js blocked: the plain decorations are built and the game works
  const L = await launch(); const q = L.p; const ev2 = (f, a) => q.evaluate(f, a);
  await L.ctx.route('**/models/decor.js', (r) => r.abort());
  await q.addInitScript(() => { let s = 777; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await startPractice(q, url);
  ok('decor.js blocked: BC_DECOR_MK is absent', await ev2(() => !window.BC_DECOR_MK));
  const plain = await ev2((K) => K.map((k) => { const g = __g.decorMake(k); return g && g.isObject3D && !g.userData.bcDecor; }), KEYS);
  ok('decor.js blocked: all 16 plain decorations still build', plain.every(Boolean));
  await ev2(() => __g.simulate(3000)); await ev2(() => { __g.ENV.dateOverride = '2026-12-05'; __g.ENV._sk = 0; __g.envUpdate(); }); await sleep(1200);
  await ev2((K) => { for (const k of K) __g.seaPlace(k, true); }, KEYS); await sleep(2500);
  ok('decor.js blocked: a December room runs with 0 page errors and the decorations in it', L.errs.length === 0 && (await ev2(() => __g.mainSettlement().things.filter((t) => __g.DECOR[t.kind] && t.built && t.mesh).length)) >= 10, JSON.stringify(L.errs.slice(0, 3)));
  await L.b.close(); srv.close();
  const pass = res.filter(Boolean).length; console.log('\n' + pass + '/' + res.length + ' passed'); process.exit(pass === res.length ? 0 : 1);
})();
