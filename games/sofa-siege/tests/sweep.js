/* Round Table Kingdom balance sweep: bot against bot, stepped headless.
   Run: NODE_PATH=$(npm root -g) node tests/sweep.js [matches per level, default 200] [key=value ...]
   key=value pairs override CONFIG numbers for a trial run, e.g. blast=.28 levels.easy.fire=12 .
   Prints one line per level and writes sweep-result.json beside this file. */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require('playwright');
const N = +(process.argv[2] || 200);
const sets = process.argv.slice(3).map((s) => s.split('='));
const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForFunction('window.__done', null, { timeout: 60000 });
  await p.evaluate((sets) => { SG.hold = true; sets.forEach(([k, v]) => { const ks = k.split('.'); let o = SG.CONFIG; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = +v; }); }, sets);
  const out = { n: N, config: await p.evaluate(() => JSON.parse(JSON.stringify(SG.CONFIG))), levels: {} };
  for (const lvl of ['easy', 'normal', 'hard']) {
    const rows = [];
    for (let i = 0; i < N; i += 10) {   /* ten matches a call keeps each browser call short */
      rows.push(...await p.evaluate(([i0, lvl]) => { const r = []; for (let i = i0; i < i0 + 10; i++) {
        SG.start(i % 2 ? 'red' : 'blue', { seed: 9000 + i * 131, level: lvl }); SG.auto(0, lvl); SG.skipBuild(); SG.begin(); let g = 0; while (SG.phase !== 'over' && g++ < 400) SG.step(1);
        const st = SG.stats, off = SG.pieces.reduce((s, q) => s + q.ps.filter((x) => x.st !== 'on').length, 0);
        r.push({ over: SG.phase === 'over', win: SG.sides[SG.winner].team, front: SG.winner === 0, len: st.fightTime, diz: st.dizzies, daze: st.dazes, flips: st.hillFlips, off: st.partsOff, mended: st.partsMended, still: off, shots: st.shots, stuck: st.stuck, noPath: st.noPath, own: st.ownHits, gap: st.longestGap,
          margin: Math.abs(SG.sides[0].score - SG.sides[1].score) }); } return r; }, [i, lvl]));
    }
    const R = rows.slice(0, N), avg = (f) => R.reduce((s, r) => s + f(r), 0) / R.length, pct = (f) => 100 * R.filter(f).length / R.length;
    const L = out.levels[lvl] = { blue: pct((r) => r.win === 'blue'), red: pct((r) => r.win === 'red'), front: pct((r) => r.front), allOver: R.every((r) => r.over), len: avg((r) => r.len), early: pct((r) => r.len < 179.9),
      dizzies: avg((r) => r.diz), dazes: avg((r) => r.daze), flips: avg((r) => r.flips), partsOff: avg((r) => r.off), mendedPct: 100 * avg((r) => r.mended) / Math.max(1, avg((r) => r.off)), shots: avg((r) => r.shots),
      stuck: R.reduce((s, r) => s + r.stuck, 0), noPath: avg((r) => r.noPath), ownHits: avg((r) => r.own), gapMax: Math.max(...R.map((r) => r.gap)), margin: avg((r) => r.margin) };
    console.log(lvl.padEnd(7) + ' blue ' + L.blue.toFixed(0) + '%  red ' + L.red.toFixed(0) + '%  front ' + L.front.toFixed(0) + '%  | dizzies ' + L.dizzies.toFixed(1) + ' (dazes ' + L.dazes.toFixed(1) + ')  flips ' + L.flips.toFixed(1) + '  parts off ' + L.partsOff.toFixed(1) + '  mended ' + L.mendedPct.toFixed(0) + '%  shots ' + L.shots.toFixed(0) +
      '  len ' + L.len.toFixed(0) + ' s  early ' + L.early.toFixed(0) + '%  margin ' + L.margin.toFixed(0) + '  stuck ' + L.stuck + '  no-path ' + L.noPath.toFixed(1) + '  own hits ' + L.ownHits.toFixed(2) + '  quiet ' + L.gapMax.toFixed(0) + ' s');
  }
  out.errors = errs; fs.writeFileSync(path.resolve(__dirname, 'sweep-result.json'), JSON.stringify(out, null, 1));
  if (errs.length) console.log('errors:', errs);
  await b.close();
};
run();
