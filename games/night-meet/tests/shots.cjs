// Run from the repo root with the game served on port 8124: npx http-server games/night-meet -p 8124 -c-1, then NODE_PATH=$(npm root -g) node games/night-meet/tests/shots.cjs <outdir>
// screenshots: meet, inspect, drift car park, town, smoke+bloom. Usage: node shots.js outdir [quality]
const { chromium } = require('playwright');
const OUT = process.argv[2], QL = +(process.argv[3] || 2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGE ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.goto('http://localhost:8124/index.html');
  await p.waitForFunction(() => window.NM_READY, null, { timeout: 90000 });
  await p.evaluate((q) => { NM.SET.q = q; NM.applyQuality(); window.__manual = true; }, QL);
  const sim = (sec, fn) => p.evaluate(([sec, fn]) => { if (fn) eval(fn); for (let i = 0; i < sec * 30; i++) update(1 / 30); render(); }, [sec, fn || '']);
  const shot = async (n) => { await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/' + n }); console.log('shot', n); };
  await sim(0.5); await shot('01-title.png');
  await p.evaluate(() => document.getElementById('enterBtn').click());
  await sim(1, 'MEET.yaw=-0.9; MEET.pitch=0.2; MEET.dist=30; MEET.idle=0;'); await shot('01-meet.png');
  await p.evaluate(() => NM.inspect(NM.getArea('carpark').spots[0])); await sim(3); await shot('02-inspect.png');
  await p.evaluate(() => { NM.DRIVE.bot = NM.botDriver(); document.getElementById('driveDocks').click(); });
  const until = async (fn, max) => p.evaluate(([fn, max]) => { const f = eval(fn); for (let t = 0; t < max; t += 1 / 30) { update(1 / 30); if (f()) break; } render(); }, [fn.toString(), max]);
  const sliding = () => { const c = NM.DRIVE.c; return NM.DRIVE.state === 'run' && Math.abs(c.beta) > 0.45 && c.speed > 9 && NM.FX.puffs.filter((q) => q.s.visible).length > 25 && !/CRASH/.test(document.getElementById('drCombo').textContent + (document.getElementById('drCombo').className.includes('pop') ? '' : '')); };
  await sim(5); await until(sliding, 25); await shot('03-drift-carpark.png');
  await sim(3); await until(sliding, 25); await shot('05-smoke-bloom.png');
  await p.evaluate(() => { document.getElementById('drQuit').click(); NM.inspect(NM.getArea('carpark').spots[1]); document.getElementById('driveTown').click(); NM.DRIVE.bot = NM.botDriver(); });
  await sim(6); await until(sliding, 25); await shot('04-town.png'); if (process.env.DBG) { await p.evaluate(() => { NM.getArea('town').cones.visible = false; render(); }); await shot('04b-nocones.png'); await p.evaluate(() => { NM.getArea('town').cones.visible = true; NM.getArea('town').group.children.filter(o => o.isPoints).forEach(o => o.visible = false); render(); }); await shot('04c-nohalos.png'); }
  console.log(await p.evaluate(() => JSON.stringify({ score: NM.DRIVE.score, calls: NM.renderer.info.render.calls, tris: NM.renderer.info.render.triangles })));
  console.log(errs.slice(0, 10).join('\n'));
  await b.close();
})();
