/* Playwright test for the GPU sim prototypes, in software GL (SwiftShader). Run from this folder:
     NODE_PATH=$(npm root -g) node test_gpusim.js [quick=1] [big=1]
   It checks, for both pages: GPU result against the numpy reference (ocean_cpu.py / flood_cpu.py compare mode), volume conservation,
   no NaN over 2,000 steps, determinism (two fresh runs identical), and records the step cost. SwiftShader is a CPU renderer: the times say nothing about the Radeon. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, '..', 'shots');
const arg = k => (process.argv.find(a => a.startsWith(k + '=')) || '').split('=')[1];
const QUICK = arg('quick') === '1', BIG = arg('big') !== '0';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gpusim-'));
const results = []; let fails = 0;
function check(name, ok, detail) { results.push({ name, ok, detail }); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); }
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
async function open(file, qs, attempt = 1) {
  try { return await open1(file, qs); } catch (e) { if (attempt >= 4) throw e; console.log('page open failed (' + String(e.message).split('\n')[0] + '), retry ' + attempt); return open(file, qs, attempt + 1); }
}
async function open1(file, qs) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('pageerror ' + e.message));
  await page.goto('file://' + path.join(HERE, file) + '?auto=0&' + qs);
  await page.waitForFunction(() => window.GPUSIM && window.GPUSIM.ready, null, { timeout: 60000 });
  return { page, ctx, errs };
}
const dump = async (page, name) => { const arr = await page.evaluate(() => Array.from(new Uint8Array(window.GPUSIM.readDepth().buffer))); const b = Buffer.from(arr); const f = path.join(TMP, name + '.f32'); fs.writeFileSync(f, b); return f; };
function py(args) { const r = spawnSync('python3', [...args], { cwd: HERE, encoding: 'utf8' }); return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }; }

async function suite(label, file, qs, n, steps, stabilitySteps) {
  console.log('--- ' + label + ' n=' + n);
  let { page, ctx, errs } = await open(file, qs);
  const cfg = await page.evaluate(() => window.GPUSIM.config());
  const s0 = await page.evaluate(() => window.GPUSIM.stats());
  check(label + ' renderer reported', true, s0.renderer);
  /* 1. GPU against the CPU reference */
  await page.evaluate(k => window.GPUSIM.step(k), steps);
  const f1 = await dump(page, label + n + '_a');
  const st1 = await page.evaluate(() => window.GPUSIM.stats());
  const cmp = py(['cpu_compare.py', label, String(n), String(steps), f1, file.includes('flood') ? String(cfg.seed) : '0']);
  console.log(cmp.out.trim());
  check(label + ' GPU vs numpy after ' + steps + ' steps (tolerances in cpu_compare.py)', cmp.code === 0, cmp.out.trim().split('\n').pop());
  /* 2. volume */
  const rel = Math.abs(st1.volumeM3 - st1.expectedVolumeM3) / st1.expectedVolumeM3;
  check(label + ' volume conserved (|V - (V0 + sources)| / V < 1e-4)', rel < 1e-4, 'V=' + st1.volumeM3.toFixed(2) + ' expected=' + st1.expectedVolumeM3.toFixed(2) + ' rel=' + rel.toExponential(2));
  /* 3. determinism: close this page (two GPU pages at once crash SwiftShader), open a fresh one, same steps, byte-identical; the fresh page then carries on to the stability run */
  await ctx.close();
  const p2 = await open(file, qs); await p2.page.evaluate(k => window.GPUSIM.step(k), steps); const f2 = await dump(p2.page, label + n + '_b');
  const same = Buffer.compare(fs.readFileSync(f1), fs.readFileSync(f2)) === 0; check(label + ' deterministic on this machine (two fresh runs byte-identical)', same);
  const page2 = p2.page;
  /* 4. stability: run on to stabilitySteps with checks for NaN and for volume every 250 steps */
  page = page2; ctx = p2.ctx; errs = p2.errs; let bad = 0, worstRel = 0, done = steps; const t0 = Date.now();
  while (done < stabilitySteps) { const k = Math.min(250, stabilitySteps - done); await page.evaluate(k2 => window.GPUSIM.step(k2), k); done += k; const s = await page.evaluate(() => window.GPUSIM.stats()); if (s.nan > 0 || !isFinite(s.maxDepth)) bad++; worstRel = Math.max(worstRel, Math.abs(s.volumeM3 - s.expectedVolumeM3) / s.expectedVolumeM3); }
  const sf = await page.evaluate(() => window.GPUSIM.stats());
  check(label + ' no NaN or Inf over ' + stabilitySteps + ' steps', bad === 0 && sf.nan === 0, 'max depth ' + sf.maxDepth.toFixed(3));
  check(label + ' volume still conserved at ' + stabilitySteps + ' steps (worst rel over checks < 1e-4)', worstRel < 1e-4, 'worst=' + worstRel.toExponential(2));
  await page.evaluate(() => window.GPUSIM.render());
  const stepMs = sf.meanStepMs; check(label + ' step cost recorded (software GL)', true, stepMs.toFixed(2) + ' ms per step, n=' + n + ', ' + sf.renderer + ', wall ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s for the stability run');
  check(label + ' page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  return { page, ctx, stepMs, n };
}
const out = { runs: [] };
const SHOT = (p, f) => p.screenshot({ path: path.join(SHOTS, f), clip: { x: 0, y: 0, width: 800, height: 800 } }).catch(() => {});
{ const r = await suite('ocean', 'ocean_gpgpu.html', 'n=256', 256, QUICK ? 150 : 300, QUICK ? 400 : 2000);
  /* picture: step on to a lively moment */
  await r.page.evaluate(() => { window.GPUSIM.step(700, { track: false }); window.GPUSIM.render(); }); await r.page.locator('canvas').screenshot({ path: path.join(SHOTS, 'gpusim-1.png') }); out.runs.push({ page: 'ocean', n: 256, stepMs: r.stepMs }); await r.ctx.close(); }
{ const r = await suite('flood', 'flood_gpgpu.html', 'n=256&seed=153', 256, QUICK ? 150 : 300, QUICK ? 400 : 2000);
  await r.page.evaluate(() => { window.GPUSIM.reset(); window.GPUSIM.step(700, { track: false }); window.GPUSIM.render(); }); await r.page.locator('canvas').screenshot({ path: path.join(SHOTS, 'gpusim-2.png') });
  await r.page.evaluate(() => { window.GPUSIM.step(900, { track: false }); window.GPUSIM.render(); }); await r.page.locator('canvas').screenshot({ path: path.join(SHOTS, 'gpusim-3.png') }); out.runs.push({ page: 'flood', n: 256, stepMs: r.stepMs }); await r.ctx.close(); }
if (BIG) { const r = await suite('ocean', 'ocean_gpgpu.html', 'n=1024', 1024, QUICK ? 20 : 60, QUICK ? 80 : 2000); out.runs.push({ page: 'ocean', n: 1024, stepMs: r.stepMs }); await r.ctx.close(); }
fs.writeFileSync(path.join(HERE, 'last_run.json'), JSON.stringify({ when: 'run by test_gpusim.js', quick: QUICK, results, runs: out.runs }, null, 1));
await browser.close();
console.log('\n' + (fails ? fails + ' FAILED' : 'ALL PASSED') + ' (' + results.length + ' checks)'); process.exit(fails ? 1 : 0);
