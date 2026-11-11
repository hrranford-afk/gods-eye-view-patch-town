// Run from the repo root with the game served on port 8124: npx http-server games/night-meet -p 8124 -c-1, then NODE_PATH=$(npm root -g) node games/night-meet/tests/test.cjs <outdir>
// Night Meet tests: page errors, meet loads, pick a car by tapping it, 60 s drift run (bot holding the handbrake),
// memory over 3 runs, frame time per quality level.
const { chromium } = require('playwright');
const OUT = process.argv[2] || 'out';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
  const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGE ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  const t0 = Date.now();
  await p.goto('http://localhost:8124/index.html');
  await p.waitForFunction(() => window.NM_READY, null, { timeout: 90000 });
  console.log('loaded in', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await p.evaluate(() => { NM.SET.q = 1; NM.applyQuality(); });
  const sim = (sec, dt = 1 / 60) => p.evaluate(([sec, dt]) => { for (let i = 0; i < sec / dt; i++) update(dt); render(); }, [sec, dt]);
  await p.evaluate(() => document.getElementById('enterBtn').click()); await sim(1);
  const meet = await p.evaluate(() => ({ spots: NM.getArea('carpark').spots.length, types: [...new Set(NM.getArea('carpark').spots.map((s) => s.type))].length, meetHud: !document.getElementById('meetHud').hidden }));
  console.log('meet', JSON.stringify(meet));
  // tap on a car: project its centre to the screen and click there
  await p.evaluate(() => { MEET.yaw = -0.9; MEET.pitch = 0.35; MEET.dist = 40; MEET.idle = 0; }); await sim(3);
  const pt = await p.evaluate(() => { const s = NM.getArea('carpark').spots[6]; const v = s.car.position.clone(); v.y = 0.8; v.project(NM.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight, s.type]; });
  await p.mouse.click(pt[0], pt[1]); await sim(0.5);
  const picked = await p.evaluate(() => ({ open: !document.getElementById('inspect').hidden, name: document.getElementById('insName').textContent, type: MEET.spot && MEET.spot.type }));
  console.log('pick', pt[2], JSON.stringify(picked));
  // 60 s drift run, bot holding the handbrake
  await p.evaluate(() => { document.getElementById('driveDocks').click(); NM.DRIVE.bot = NM.botDriver(true); window.__stat = { maxB: 0, nan: 0, slide: 0, n: 0 }; });
  for (let s = 0; s < 62; s += 2) await p.evaluate(() => { for (let i = 0; i < 120; i++) { update(1 / 60); const c = NM.DRIVE.c; if (!isFinite(c.x + c.z + c.vx)) __stat.nan++; __stat.maxB = Math.max(__stat.maxB, Math.abs(c.beta)); __stat.n++; if (Math.abs(c.beta) > 0.21 && c.speed > 6) __stat.slide++; } });
  await sim(0.02);
  const run = await p.evaluate(() => { const D = NM.DRIVE; return { score: Math.round(D.score), bestCombo: D.bestCombo, crashes: D.crashes, left: +D.left.toFixed(1), state: D.state, maxAngleDeg: Math.round(__stat.maxB * 57.3), slidePct: Math.round(__stat.slide / __stat.n * 100), nan: __stat.nan, pos: [Math.round(D.c.x), Math.round(D.c.z)] }; });
  console.log('drift60 (car ' + picked.type + ')', JSON.stringify(run));
  await p.screenshot({ path: OUT + '/t-run.png' });
  // memory over 3 runs (each: start, 20 s with the bot, finish card, back to the meet)
  const mem = [];
  for (let r = 0; r < 4; r++) { // run 0 warms up (the town and the bus's wheel sizes are built once); runs 1 to 3 must match
    await p.evaluate((r) => { NM.driveStart(r % 2 ? 'town' : 'carpark', r ? 'bus' : 'lorry', 0xff0000, 0x22d3ff); NM.driveExit(); NM.driveStart(r % 2 ? 'carpark' : 'town', 'bus', 0xff0000, 0x22d3ff); NM.DRIVE.bot = NM.botDriver(); }, r);
    for (let s = 0; s < 20; s += 2) await p.evaluate(() => { for (let i = 0; i < 120; i++) update(1 / 60); });
    await p.evaluate(() => { NM.DRIVE.left = 0.01; update(1 / 60); render(); NM.driveExit(); update(1 / 60); render(); });
    mem.push(await p.evaluate(() => ({ geo: NM.renderer.info.memory.geometries, tex: NM.renderer.info.memory.textures, kids: NM.scene.children.length, progs: NM.renderer.info.programs.length, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(1) : null })));
  }
  console.log('memory per run', JSON.stringify(mem));
  // frame time per quality (CPU time of update+render; SwiftShader renders on the CPU, so these are not iPad numbers)
  const perf = {};
  await p.evaluate(() => { NM.driveStart('carpark', 'kaze', 0xdfe3e8, 0x22d3ff); NM.DRIVE.bot = NM.botDriver(); for (let i = 0; i < 300; i++) update(1 / 60); });
  for (const q of [0, 1, 2]) {
    perf[['Low', 'Medium', 'High'][q]] = await p.evaluate((q) => {
      NM.SET.q = q; NM.applyQuality(); const gl = NM.renderer.getContext(); update(1 / 60); render(); gl.finish();
      const px = new Uint8Array(4); const T = []; for (let i = 0; i < 8; i++) { const t = performance.now(); update(1 / 60); render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); T.push(performance.now() - t); }
      T.sort((a, b) => a - b); const I = NM.renderer.info; I.autoReset = false; I.reset(); update(1 / 60); render(); const r = { ms: +T[4].toFixed(1), calls: I.render.calls, tris: I.render.triangles }; I.autoReset = true; return r;
    }, q);
  }
  console.log('frame time (swiftshader, 1180x820)', JSON.stringify(perf));
  console.log('errors:', errs.length ? errs.slice(0, 10).join('\n') : 'none');
  await b.close();
})();
