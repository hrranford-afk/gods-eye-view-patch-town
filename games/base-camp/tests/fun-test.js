// Base Camp build 8, FUN PASS 1: the first ten minutes in the PRACTICE ROOM, scripted like a new player, with timestamps:
//   first celebration, first build by the colony, poke reaction, pick up + drop, crumb feast, music dance, an album entry, a rainbow after a rain preset,
//   a pebble after a 6-hour "come back later". Then the same colony through AR (ar-fake.js): a close look with a speech bubble.
// Pace targets (the owner's): a celebration within 2 minutes, something built within 3, a funny reaction within 30 s of tapping a colonist.
// Screenshots: shots/21-poke.png, 22-celebration.png, 23-music.png, 24-rainbow.png, 25-album.png, 26-ar-fun.png. Memory flat, 0 page errors.
// Run (about 6 minutes):  NO_OVERLAY=1 NODE_PATH=$(npm root -g) node games/base-camp/tests/fun-test.js
const fs = require('fs'), path = require('path');
const { serve, launch, ROOT } = require('./lib.js'); const install = require('./ar-fake.js'); const { chromium } = require('playwright');
const OUT = path.join(ROOT, 'shots') + '/'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = []; const ok = (n, c, x) => { res.push(!!c); console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : '')); };
const T = {}; let T0 = 0; const mark = (k) => { if (T[k] === undefined) { T[k] = (Date.now() - T0) / 1000; console.log('  t=' + T[k].toFixed(1) + ' s  ' + k); } };
(async () => {
  const { srv, url } = await serve(); const { b, p, errs } = await launch(); const ev = (f, a) => p.evaluate(f, a);
  await p.goto(url); await sleep(1500); await ev(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await p.reload(); await sleep(1500);
  await ev(() => { __g.ENV.hourOverride = 12; __g.setWxPick('clear'); });
  const mem0 = await ev(() => ({ heap: performance.memory ? performance.memory.usedJSHeapSize : 0 }));
  await p.click('#bMore'); await p.click('#bPrac'); T0 = Date.now();
  const logHas = (k, since) => ev(([k, s]) => __g.FUN.log.some((l) => l.k === k && l.t >= s), [k, since || 0]);
  const pageNow = () => ev(() => performance.now());
  // 1. hands off: the colony lands and the first celebration pops (a "We landed!" banner with confetti)
  for (let i = 0; i < 240; i++) { await sleep(500); if (await logHas('celebrate')) { mark('first celebration'); break; } }
  ok('a celebration within 2 minutes (pace target)', T['first celebration'] !== undefined && T['first celebration'] < 120, T['first celebration'] + ' s');
  // wait until the practice camera has finished its first look around (the auto-scan lap) and comes to the orbit view
  for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit')) break; if (await logHas('giantBuilt') || await ev(() => __g.G.settlements.some((S) => S.things.some((t) => ['hut', 'well', 'farm'].includes(t.kind) && t.built)))) mark('first colony build finished'); }
  mark('orbit view');
  const focus = (d, pitch, yaw) => ev(([d, pitch, yaw]) => { const S = __g.G.settlements[0]; __g.focusOn(S.tf.x, S.tf.y + 0.02, S.tf.z, d); __g.P.pitch = pitch; if (yaw !== undefined) __g.P.yaw = yaw; }, [d, pitch, yaw]);
  await focus(0.42, 0.62); await sleep(2200);
  const colScreen = () => ev(() => { const S = __g.G.settlements[0], out = []; for (const c of S.cols) { if (c.inside || c.spawn > 0 || c.held || c.fall || !c.mesh.visible) continue; const [wx, wz] = [S.tf.x + c.x * Math.cos(S.tf.yaw) + c.z * Math.sin(S.tf.yaw), S.tf.z - c.x * Math.sin(S.tf.yaw) + c.z * Math.cos(S.tf.yaw)]; const [sx, sy, vis] = __g.toScreen(new __g.THREE.Vector3(wx, S.tf.y + 0.026, wz)); if (vis && sx > 80 && sx < innerWidth - 80 && sy > 120 && sy < innerHeight - 130) out.push({ name: c.name, sx, sy, moving: c.moving }); } out.sort((a, b) => a.moving - b.moving); return out; });
  // 2. poke: tap a colonist -> squeak, jump, a reaction in character and a speech bubble with their name
  let cs = []; for (let i = 0; i < 30 && !cs.length; i++) { cs = await colScreen(); if (!cs.length) await sleep(500); }
  ok('a colonist is on screen to tap', cs.length > 0, JSON.stringify(cs.slice(0, 3)));
  if (cs.length) { // bring the camera close to the colonist first (as a player leans in)
    await ev((nm) => { const S = __g.G.settlements[0], c = S.cols.find((q) => q.name === nm); const wx = S.tf.x + c.x * Math.cos(S.tf.yaw) + c.z * Math.sin(S.tf.yaw), wz = S.tf.z - c.x * Math.sin(S.tf.yaw) + c.z * Math.cos(S.tf.yaw); __g.focusOn(wx, S.tf.y + 0.03, wz, 0.3); __g.P.pitch = 0.5; }, cs[0].name); await sleep(1500);
    cs = (await colScreen()).sort((a, b) => Math.hypot(a.sx - 590, a.sy - 410) - Math.hypot(b.sx - 590, b.sy - 410));
    const s0 = await pageNow(); const tap = Date.now(); await p.mouse.click(cs[0].sx, cs[0].sy); mark('first poke');
    await sleep(450); await p.screenshot({ path: OUT + '21-poke.png' });
    const r = await ev((s0) => { const L = __g.FUN.log.filter((l) => l.t >= s0); const S = __g.G.settlements[0]; return { poke: L.find((l) => l.k === 'poke'), say: L.find((l) => l.k === 'say'), tags: S.cols.filter((c) => c.tagT > 0).map((c) => c.name), sel: !document.getElementById('sel').hidden, react: S.cols.filter((c) => c.react && c.react.t > 0).map((c) => c.react.k) }; }, s0);
    ok('poke: they squeak, jump, react in character and say something (with a name tag)', !!r.poke && !!r.say && r.tags.length > 0 && r.react.length > 0, JSON.stringify(r) + ', ' + (Date.now() - tap) + ' ms after the tap');
  }
  // 3. touch and hold: pick a colonist up, carry it, drop it somewhere else on the colony
  await focus(0.42, 0.62); await sleep(1500); cs = await colScreen(); if (cs.length) {
    const s0 = await pageNow(), c0 = cs[cs.length > 1 ? 1 : 0]; await p.mouse.move(c0.sx, c0.sy); await p.mouse.down(); await sleep(650);
    const held = await ev(() => !!__g.FUN.hold); const tx = c0.sx + (c0.sx < 590 ? 90 : -90), ty = c0.sy + 30;
    for (let i = 1; i <= 8; i++) { await p.mouse.move(c0.sx + (tx - c0.sx) * i / 8, c0.sy + (ty - c0.sy) * i / 8 - 20 * Math.sin(i / 8 * 3.14)); await sleep(60); }
    await sleep(200); await p.mouse.up(); await sleep(1600);
    const r = await ev((s0) => { const L = __g.FUN.log.filter((l) => l.t >= s0); return { lift: L.find((l) => l.k === 'lift'), drop: L.find((l) => l.k === 'drop'), says: L.filter((l) => l.k === 'say').map((l) => l.x) }; }, s0);
    ok('pick up (hold), carry and drop: they complain, then shrug', held && !!r.lift && !!r.drop && r.says.length >= 2, JSON.stringify(r)); if (r.drop) mark('pick-up and drop');
  }
  // 4. tap the ground: a crumb drops, they rush to it, a tiny feast
  { const s0 = await pageNow(); const g = await ev(() => { const S = __g.G.settlements[0]; for (let i = 0; i < 60; i++) { const a = Math.random() * 6.28, d = 0.03 + Math.random() * 0.06, lx = Math.cos(a) * d, lz = Math.sin(a) * d; if (!S.things.some((t) => Math.hypot(t.x - lx, t.z - lz) < t.r + 0.01)) { const wx = S.tf.x + lx * Math.cos(S.tf.yaw) + lz * Math.sin(S.tf.yaw), wz = S.tf.z - lx * Math.sin(S.tf.yaw) + lz * Math.cos(S.tf.yaw), [sx, sy, v] = __g.toScreen(new __g.THREE.Vector3(wx, S.tf.y, wz)); const gp = __g.groundPick(sx, sy); if (v && gp && gp.zone.settled === S && !__g.colPick(sx, sy)) return [sx, sy]; } } return null; });
    if (g) { await p.mouse.click(g[0], g[1]); mark('first crumb'); }
    let fed = false; for (let i = 0; i < 50 && !fed; i++) { await sleep(400); fed = await logHas('feast', s0); }
    if (fed) mark('crumb feast'); ok('a crumb: they rush over and have a tiny feast', !!g && fed, T['crumb feast'] !== undefined ? 'feast ' + (T['crumb feast'] - T['first crumb']).toFixed(1) + ' s after the crumb' : '');
  }
  // 5. build something: the Build tool, a berry lantern (2 wood, scavenged), placed on the ground; the colonists hammer it together
  { await p.click('button[data-tool="build"]'); await sleep(200); await p.click('button[data-build="lantern"]'); await sleep(200);
    const s0 = await pageNow(); const g = await ev(() => { const S = __g.G.settlements[0]; S.stock.wood = Math.max(S.stock.wood, 2); for (let i = 0; i < 80; i++) { const a = Math.random() * 6.28, d = 0.04 + Math.random() * 0.08, lx = Math.cos(a) * d, lz = Math.sin(a) * d; if (!S.things.some((t) => Math.hypot(t.x - lx, t.z - lz) < t.r + 0.02)) { const wx = S.tf.x + lx * Math.cos(S.tf.yaw) + lz * Math.sin(S.tf.yaw), wz = S.tf.z - lx * Math.sin(S.tf.yaw) + lz * Math.cos(S.tf.yaw), [sx, sy, v] = __g.toScreen(new __g.THREE.Vector3(wx, S.tf.y, wz)); const gp = __g.groundPick(sx, sy); if (v && gp && gp.zone.settled === S && !__g.colPick(sx, sy) && sy < innerHeight - 140) return [sx, sy]; } } return null; });
    if (g) await p.mouse.click(g[0], g[1]);
    const placed = await logHas('build', s0); if (placed) mark('the player built something (placed a lantern)');
    ok('something built within 3 minutes (pace target)', placed && T['the player built something (placed a lantern)'] < 180, T['the player built something (placed a lantern)'] + ' s');
    await p.click('button[data-tool="look"]');
    for (let i = 0; i < 80; i++) { await sleep(500); if (await ev(() => __g.FUN.log.some((l) => l.k === 'celebrate' && l.x === 'giant'))) break; }
    await sleep(700); await p.screenshot({ path: OUT + '22-celebration.png' });
    const cel = await ev(() => ({ banner: document.getElementById('banner').className, text: document.getElementById('banner').innerText, lanterns: __g.G.settlements[0].things.filter((t) => t.kind === 'lantern' && t.built).length }));
    if (cel.lanterns) mark('lantern finished'); ok('the colonists finish it and the colony celebrates (banner, confetti, a cheer)', cel.lanterns > 0 && cel.banner === 'on', JSON.stringify(cel));
  }
  // 6. music: they dance (the council's mosh pit) and the huts bounce
  { await p.click('#bParty'); mark('music on'); await sleep(5000); await focus(0.5, 0.55); await sleep(900);
    const r = await ev(() => { const S = __g.G.settlements[0]; return { party: __g.FUN.party, dancing: S.cols.filter((c) => c.dancing).length, cols: S.cols.length, pulse: +__g.FUN.pulse.toFixed(2), mus: !!__g.FUN.mus || !__g.SND.ctx }; });
    await p.screenshot({ path: OUT + '23-music.png' });
    ok('music: most of them dance in a mosh pit, the huts bounce', r.party && r.dancing >= Math.max(1, r.cols - 2), JSON.stringify(r)); if (r.dancing) mark('dance');
    await p.click('#bParty'); await sleep(500); ok('music off: back to work', await ev(() => !__g.FUN.party && !__g.G.settlements[0].cols.some((c) => c.job && c.job.type === 'mosh')));
  }
  // 7. the Colony album (Menu): entries with a date
  { await p.click('#bMenu'); await sleep(300); await p.click('#mAlbum'); await sleep(400); await p.screenshot({ path: OUT + '25-album.png' });
    const a = await ev(() => ({ n: __g.FUN.album.length, ids: __g.FUN.album.map((e) => e.id), rows: document.querySelectorAll('#modal .alb').length, date: (document.querySelector('#modal .alb .ad') || {}).textContent }));
    ok('the Colony album lists the milestones with a date', a.n >= 3 && a.rows === a.n && !!a.date, JSON.stringify(a)); mark('album opened');
    await p.click('#aClose'); await sleep(200); }
  // 8. rain, then sun: a rainbow arcs over the colony (The Town Brain)
  { await ev(() => { __g.setWxPick('rain'); }); await sleep(4500); await ev(() => { __g.setWxPick('clear'); }); await sleep(2600); await focus(0.95, 0.32); await sleep(1500);
    const r = await ev(() => ({ rainbow: !!__g.FUN.rainbow, album: __g.FUN.album.some((e) => e.id === 'rainbow') })); await p.screenshot({ path: OUT + '24-rainbow.png' });
    ok('after the rain stops, a rainbow arcs over the colony', r.rainbow && r.album, JSON.stringify(r)); if (r.rainbow) mark('rainbow'); }
  // 9. let the colony live a while (time x6 for about a minute: ~6 more minutes of colony time) and see what the council's moments do
  { await ev(() => { __g.G.speed = 6; }); for (let i = 0; i < 70; i++) { await sleep(1000); if (await logHas('river')) mark('Pip found a river'); if (await logHas('festival')) mark('festival'); }
    await ev(() => { __g.G.speed = 1; });
    const r = await ev(() => ({ album: __g.FUN.album.map((e) => e.id), cols: __g.G.settlements.reduce((a, S) => a + S.cols.length, 0), things: __g.G.settlements[0].things.map((t) => t.kind).join(','), unl: __g.FUN.unl }));
    console.log('after about ten minutes of colony time:', JSON.stringify(r));
    ok('Pip named a river and built a bridge (The Dell Scholar)', /bridge/.test(r.things));
    ok('new things unlock as the colony grows (the reading nook at least)', r.unl.includes('nook'), JSON.stringify(r.unl)); }
  // 10. memory: flat over more play
  const g0 = await ev(() => ({ geo: __g.renderer.info.memory.geometries, tex: __g.renderer.info.memory.textures, heap: performance.memory ? performance.memory.usedJSHeapSize : 0 }));
  for (let k = 0; k < 3; k++) { await ev(() => { __g.partyToggle(true); }); await sleep(2500); await ev(() => { __g.partyToggle(false); const S = __g.G.settlements[0]; __g.dropCrumb(S, 0.05, 0.05); __g.rainbowAt(S); }); await sleep(3000); await ev(() => { __g.FUN.rainbow && (__g.FUN.rainbow.t = 99); }); await sleep(600); }
  const g1 = await ev(() => ({ geo: __g.renderer.info.memory.geometries, tex: __g.renderer.info.memory.textures, heap: performance.memory ? performance.memory.usedJSHeapSize : 0 }));
  ok('memory flat (geometries, textures, heap) over parties, crumbs and rainbows', g1.geo <= g0.geo + 12 && g1.tex <= g0.tex + 8 && (!g0.heap || g1.heap < g0.heap * 1.5 + 8e6), JSON.stringify({ g0, g1 }));
  // 11. come back after 6 hours: the colony finds its home, a polished pebble "we kept your spot warm" sits at the edge (The Town Brain)
  { await ev(() => { __g.persist(true); __g.comeBackLater(6); }); const c0 = Date.now(); let locked = false;
    for (let i = 0; i < 300 && !locked; i++) { await sleep(500); locked = await ev(() => __g.G.locked); }
    const lockS = (Date.now() - c0) / 1000; let peb = false; for (let i = 0; i < 40 && !peb; i++) { await sleep(500); peb = await logHas('pebble'); }
    const r = await ev(() => ({ pebbles: __g.G.settlements.reduce((a, S) => a + S.things.filter((t) => t.kind === 'pebble').length, 0), back: __g.FUN.album.some((e) => e.id === 'back'), diary: (__g.G.awayRes && __g.G.awayRes.lines || []).map((l) => l.text).find((t) => /pebble/.test(t)), album: __g.FUN.album.length }));
    ok('after 6 hours away: a pebble at the edge, "we kept your spot warm", and "First visit back" in the album', locked && peb && r.pebbles >= 1 && r.back && !!r.diary, 'home after ' + lockS.toFixed(0) + ' s; ' + JSON.stringify(r)); }
  console.log('PACE (seconds after pressing Practice room): ' + Object.entries(T).map(([k, v]) => k + ' ' + v.toFixed(1)).join(' | '));
  ok('0 page errors (practice)', errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  await b.close();
  // 12. AR (real WebXRKit polyfill, fake native side): the colony up close, a poke and its speech bubble
  if (!process.env.SKIP_AR) {
    const POLY = fs.readFileSync(path.join(ROOT, 'webxr-polyfill.js'), 'utf8'); const SHED = [['floor', -1.2, 0, -1.5, 1.2, 1.2], ['speakerA', -0.45, 0.9, -1.2, 0.15, 0.125], ['speakerB', -0.25, -0.9, -1.2, 0.15, 0.125], ['shelf', 0.2, 0.0, -2.7, 0.7, 0.13], ['cup', -0.17, -0.85, -1.2, 0.04, 0.04]];
    const b2 = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const ctx = await b2.newContext({ viewport: { width: 1180, height: 820 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)' });
    await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', body: '{}' }));
    const q = await ctx.newPage(); const e2 = []; q.on('pageerror', (e) => e2.push(e.message)); const ev2 = (f, a) => q.evaluate(f, a);
    await install(q, SHED); await q.addInitScript({ content: POLY }); await q.goto(url); await sleep(2500); await ev2(() => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); }); await q.reload(); await sleep(2500);
    if (process.env.NO_OVERLAY) await ev2(() => { const rs = navigator.xr.requestSession.bind(navigator.xr); navigator.xr.requestSession = async (m, o) => { const ss = await rs(m, o); try { Object.defineProperty(ss, 'domOverlayState', { value: undefined, configurable: true }); } catch (e) {} for (const sym of Object.getOwnPropertySymbols(ss)) { const d = ss[sym] && ss[sym].device; if (d) d._domOverlayRoot = null; } return ss; }; });
    await ev2(() => { __g.ENV.hourOverride = 12; __g.RECOG.coco.state = 'loading'; const c = document.createElement('canvas'); c.width = 600; c.height = 400; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 400); gr.addColorStop(0, '#c9b49a'); gr.addColorStop(1, '#8d7358'); g.fillStyle = gr; g.fillRect(0, 0, 600, 400); for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(60,40,20,.12)'; g.fillRect(0, i * 30, 600, 2); } window.__bgUrl = c.toDataURL('image/jpeg', 0.85); });
    await q.click('#bPlay'); await sleep(800); await ev2(() => { document.documentElement.style.setProperty('background', 'url(' + window.__bgUrl + ') center/cover', 'important'); window.__sweep(1.6); });
    const a0 = Date.now(); while (Date.now() - a0 < 150000) { await sleep(1500); if (await ev2(() => window.__cam.done)) await ev2(() => window.__sweep(1.6)); if (await ev2(() => __g.G.settlements.length > 0 && __g.AUTO.t > 30)) break; }
    await ev2(() => { __g.simulate(90, 0.25); const S = __g.G.settlements[0]; window.__cam.mode = 'fixed'; window.__cam.fixed = [S.tf.x + 0.02, S.tf.y + 0.34, S.tf.z + 0.36, 0, -0.72]; }); await sleep(2500);
    const pk = await ev2(() => { const S = __g.G.settlements[0], c = S.cols.find((q) => !q.inside && q.mesh.visible) || S.cols[0]; __g.pokeCol(c); return c.name; }); await sleep(500);
    await q.screenshot({ path: OUT + '26-ar-fun.png' });
    const r = await ev2(() => ({ ar: __g.AR.on, says: __g.FUN.log.filter((l) => l.k === 'say').length, album: __g.FUN.album.map((e) => e.id), toastTop: document.getElementById('toast').getBoundingClientRect().top, bar: document.getElementById('bar').getBoundingClientRect().height }));
    ok('AR: poke ' + pk + ' up close, a speech bubble; the toolbar stays one compact row', r.ar && r.says > 0 && r.bar < 70, JSON.stringify(r));
    ok('0 page errors (AR)', e2.length === 0, JSON.stringify(e2.slice(0, 3))); await b2.close();
  }
  srv.close(); const f = res.filter((x) => !x).length; console.log(f ? f + ' FAILED' : 'ALL ' + res.length + ' PASSED'); process.exit(f ? 1 : 0);
})();
