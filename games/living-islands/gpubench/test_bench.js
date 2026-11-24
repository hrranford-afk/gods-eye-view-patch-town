/* Smoke test for radeon_bench.html with software GL (structure only, numbers mean nothing).
   Run: NODE_PATH=/opt/node-tools/node_modules node gpubench/test_bench.js [--shots]
   Chrome: set CHROME_PATH to a chrome binary if playwright has none installed. */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pw; try { pw = require('playwright'); } catch (e) { pw = require('playwright-core'); }
const shots = process.argv.includes('--shots');
const page_url = 'file://' + path.join(__dirname, 'radeon_bench.html') + '?smoke=1';
const KEYS = ['sys', 'fill', 'tri', 'math', 'band', 'vram', 'read', 'water', 'wild', 'gwater', 'gagents'];
let fails = 0;
const ck = (c, m) => { if (!c) { fails++; console.log('FAIL: ' + m); } else console.log('ok:   ' + m); };
(async () => {
  const exe = process.env.CHROME_PATH || undefined;
  const b = await pw.chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--enable-features=Vulkan'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.goto(page_url);
  ck(await p.isVisible('#runQuick'), 'Run button visible');
  await p.click('#runQuick');
  await p.waitForTimeout(2500);
  if (shots) await p.screenshot({ path: path.join(__dirname, '..', 'shots', 'bench-1.png') });
  await p.waitForFunction(() => window.__bench && window.__bench.done, null, { timeout: 170000 });
  const r = await p.evaluate(() => ({ res: window.__bench.results, rep: window.__bench.report, m: window.__bench.metrics }));
  for (const k of KEYS) {
    const t = r.res[k];
    if (!t) { ck(false, k + ' has a result'); continue; }
    const nums = t.rows.filter(x => x.n !== null && isFinite(x.n)).length;
    const good = (t.status === 'ok' && nums > 0) || (t.status === 'unsupported' && t.reason && t.reason.length > 8);
    ck(good, k + ': ' + t.status + (t.reason ? ' (' + t.reason + ')' : '') + ', numeric rows ' + nums + ', ' + t.secs.toFixed(1) + ' s');
    ck(t.secs < 20, k + ' stayed inside the time budget');
  }
  const lines = r.rep.split('\n');
  ck(/^RADEON-BENCH v1 \| .+ \| .+ \| \d{4}-\d\d-\d\d \d\d:\d\d \|/.test(lines[0]), 'report header line: ' + lines[0]);
  ck(r.rep.includes('VERDICTS') && r.rep.includes('TESTS') && r.rep.includes('WHAT 16 GB GIVES US'), 'report has VERDICTS, TESTS, WHAT 16 GB GIVES US');
  ck(await p.locator('#sumTable tbody tr').count() >= 7, 'summary table has verdict rows');
  ck(await p.locator('#memTable tbody tr').count() === 10, 'memory table has 10 rows');
  ck(errs.length === 0, 'console errors: ' + errs.length + (errs.length ? ' ' + JSON.stringify(errs.slice(0, 3)) : ''));
  if (shots) { await p.evaluate(() => { document.querySelector('#sumWrap h2').scrollIntoView(); window.scrollBy(0, -10); }); await p.screenshot({ path: path.join(__dirname, '..', 'shots', 'bench-2.png') }); }
  console.log(lines.slice(0, 40).join('\n'));
  await b.close();
  console.log(fails ? 'FAILED ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('crash', e); process.exit(2); });
