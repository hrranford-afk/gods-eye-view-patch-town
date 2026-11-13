// Build 16: make the fixture colony and the before / after picture (build 15 left, build 16 right, the SAME colony).
// Run: B15=/path/to/a/copy/of/the/build-15/games/base-camp NODE_PATH=$(npm root -g) node games/base-camp/tests/style-compare.js [--fixture]
//   --fixture  grow a fresh practice colony (simulate(9000)) and write tests/fixtures/style-colony.json from it
// Without --fixture the saved fixture colony is loaded into both builds (a save is the same format in both), so the two pictures and the draw-call numbers compare one colony.
const { serve, launch, ROOT } = require('./lib.js'); const fs = require('fs'), path = require('path'), http = require('http');
const OUT = path.join(ROOT, 'shots') + '/', FIX = path.join(__dirname, 'fixtures', 'style-colony.json'); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HIDE_UI = 'body > *:not(canvas) { visibility: hidden !important; }';
function serveDir(dir) { const T = { '.html': 'text/html', '.json': 'application/json', '.js': 'text/javascript' }; const srv = http.createServer((q, r) => { const f = path.join(dir, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+$/, '/index.html')); if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('no'); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }); return new Promise((res) => srv.listen(0, '127.0.0.1', () => res({ srv, url: 'http://127.0.0.1:' + srv.address().port + '/index.html' }))); }
async function start(p, url, store) {
  const ev = (f, a) => p.evaluate(f, a);
  await p.addInitScript(() => { let s = 4242; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
  await p.goto(url); await sleep(1500); await ev((st) => { localStorage.clear(); localStorage.setItem('bc-wxchoice', 'no'); if (st) for (const k in st) { let v = st[k]; /* restamp the save to now, so loading it does not run hours of away time */ try { const o = JSON.parse(v), n = Date.now(); if (k === 'base-camp-save-v2') o.t = n; if (k === 'base-camp-map-v1') o.saved = n; if (k === 'bc-rooms-v1') o.rooms.forEach((r) => { r.last = n; }); v = JSON.stringify(o); } catch (e) { /* keep as is */ } localStorage.setItem(k, v); } }, store || null);
  await p.reload(); await sleep(1500); await ev(() => { __g.ENV.hourOverride = 12; });
  await p.click('#bMore'); await p.click('#bPrac'); await sleep(300);
  for (let i = 0; i < 240; i++) { await sleep(500); if (await ev(() => __g.P.mode === 'orbit')) break; } await sleep(1000);
}
const view = (p, o) => p.evaluate((o) => { const hs = (S) => S.things.filter((t) => (t.kind === 'hut' || t.kind === 'farm') && t.built), S = __g.G.settlements.slice().sort((a, b) => hs(b).length - hs(a).length)[0], L = hs(S); let cx = 0, cz = 0; for (const t of L) { cx += t.x; cz += t.z; } cx /= Math.max(1, L.length); cz /= Math.max(1, L.length); const w = S.group.localToWorld(new __g.THREE.Vector3(cx, 0, cz)); __g.P.mode = 'orbit'; __g.P.yaw = o.yaw; __g.P.pitch = o.pitch; __g.focusOn(w.x + o.dx, w.y, w.z + o.dz, o.d); }, o);
const calls = (p) => p.evaluate(() => { const r = __g.renderer, i = r.info; i.reset(); r.render(__g.scene, __g.camera); return { calls: i.render.calls, tris: i.render.triangles }; });
async function measure(url, store, shotName) {
  const L = await launch(); const p = L.p; await start(p, url, store);
  await view(p, { yaw: 0.3, pitch: 0.55, dx: -0.1, dz: 0, d: 3.6 }); await sleep(2200); const room = await calls(p);
  await p.setViewportSize({ width: 900, height: 700 }); await p.addStyleTag({ content: HIDE_UI }); await sleep(500);
  await view(p, { yaw: 0.45, pitch: 0.55, dx: 0, dz: 0, d: 0.5 }); await sleep(2200); const close = await calls(p);
  await p.screenshot({ path: OUT + shotName });
  const errs = L.errs.slice(); await L.b.close(); return { room, close, errs };
}
(async () => {
  if (process.argv.includes('--fixture')) {
    const { srv, url } = await serve(); const L = await launch(); await start(L.p, url);
    await L.p.evaluate(() => __g.simulate(9000)); await sleep(1500); await L.p.evaluate(() => __g.persist(true));
    const st = await L.p.evaluate(() => { const o = {}; for (const k of ['base-camp-save-v2', 'base-camp-map-v1', 'bc-rooms-v1']) { const v = localStorage.getItem(k); if (v) o[k] = v; } return o; });
    fs.mkdirSync(path.dirname(FIX), { recursive: true }); fs.writeFileSync(FIX, JSON.stringify(st)); console.log('fixture written', Object.keys(st), JSON.stringify(st).length + ' bytes'); await L.b.close(); srv.close(); return;
  }
  const store = JSON.parse(fs.readFileSync(FIX, 'utf8')), B15 = process.env.B15;
  const a16 = await serve(); const r16 = await measure(a16.url, store, '_new.png'); a16.srv.close();
  console.log('build 16: whole room ' + r16.room.calls + ' calls / ' + r16.room.tris + ' tris, close-up ' + r16.close.calls + ' calls', r16.errs);
  if (!B15) { fs.unlinkSync(OUT + '_new.png'); return; }
  const a15 = await serveDir(path.resolve(B15)); const r15 = await measure(a15.url, store, '_old.png'); a15.srv.close();
  console.log('build 15: whole room ' + r15.room.calls + ' calls / ' + r15.room.tris + ' tris, close-up ' + r15.close.calls + ' calls', r15.errs);
  console.log('ratio whole room ' + (r16.room.calls / r15.room.calls).toFixed(3) + ', close-up ' + (r16.close.calls / r15.close.calls).toFixed(3));
  const o = fs.readFileSync(OUT + '_old.png').toString('base64'), n = fs.readFileSync(OUT + '_new.png').toString('base64'); fs.unlinkSync(OUT + '_old.png'); fs.copyFileSync(OUT + '_new.png', OUT + '51-one-style.png'); fs.unlinkSync(OUT + '_new.png');
  const L = await launch(); const q = await L.ctx.newPage(); await q.setViewportSize({ width: 1800, height: 740 });
  await q.setContent('<body style="margin:0;background:#222;font:600 22px sans-serif;color:#fff"><div style="display:flex"><div style="position:relative"><img width=900 height=700 src="data:image/png;base64,' + o + '"><div style="position:absolute;left:12px;top:10px;background:#000a;padding:4px 10px;border-radius:8px">build 15: props next to flat shapes</div></div><div style="position:relative"><img width=900 height=700 src="data:image/png;base64,' + n + '"><div style="position:absolute;left:12px;top:10px;background:#000a;padding:4px 10px;border-radius:8px">build 16: one toon + ink look</div></div></div></body>');
  await q.screenshot({ path: OUT + '52-style-before-after.png', clip: { x: 0, y: 0, width: 1800, height: 700 } }); await L.b.close();
  console.log('shots written');
})();
