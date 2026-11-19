/* Round Table Kingdom v2: proof by bots. Run: NODE_PATH=$(npm root -g) node tests/proof.js [matches per experiment, default 200] [key=value ...]
   key=value pairs override CONFIG numbers for a trial run (for example v2.blast=.18 levels.normal.err=.3); only a run with no overrides writes BOT_REPORT.md.
   seedBase=N plays a different set of matches. Everything runs at the default piece size, stepped headless. */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require('playwright');
const N = +(process.argv[2] || 200), all = process.argv.slice(3).map((s) => s.split('=')), sets = all.filter((q) => q[0] !== 'seedBase' && q[0] !== 'only'), seedBase = +((all.find((q) => q[0] === 'seedBase') || [0, 40000])[1]), only = (all.find((q) => q[0] === 'only') || [0, ''])[1];
const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForFunction('window.__done', null, { timeout: 60000 });
  await p.evaluate((sets) => { SG.hold = true; sets.forEach(([k, v]) => { const ks = k.split('.'); let o = SG.CONFIG; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = isNaN(+v) ? v : +v; }); }, sets);
  /* one experiment: matches where the two sides differ only in what is being measured; "A" is the side given the first of each pair, and it swaps ends and teams from match to match */
  const exp = async (name, level, presets, aims) => { const rows = [];
    for (let i = 0; i < N; i += 10) rows.push(...await p.evaluate(([i0, level, presets, aims, seedBase]) => { const r = [];
      for (let i = i0; i < i0 + 10; i++) { const aSide = (i >> 1) % 2, pr = aSide ? [presets[1], presets[0]] : presets, am = aSide ? [aims[1], aims[0]] : aims;
        SG.start(i % 2 ? 'red' : 'blue', { seed: seedBase + i * 131, level, presets: pr, aim: am }); SG.auto(0, level); SG.skipBuild(); const total = [0, 1].map((s) => SG.pieces.filter((q) => q.side === s).reduce((n, q) => n + q.total, 0)); SG.begin(); let g = 0; while (SG.phase !== 'over' && g++ < 500) SG.step(1);
        const st = SG.stats, off = [0, 1].map((s) => SG.pieces.filter((q) => q.side === s).reduce((n, q) => n + q.ps.filter((x) => x.st !== 'on').length, 0));
        r.push({ over: SG.phase === 'over', aWon: SG.winner === aSide, front: SG.winner === 0, team: SG.sides[SG.winner].team, keep: !!st.keepDown, col: st.collapses, off: st.partsOff, mended: st.partsMended, diz: st.dizzies, len: st.fightTime, gap: st.longestGap, stuck: st.stuck,
          share: (off[0] / total[0] + off[1] / total[1]) / 2, loserShare: off[1 - SG.winner] / total[1 - SG.winner], winnerShare: off[SG.winner] / total[SG.winner], raid: st.raidPulls, trapped: st.trapped, shots: st.shots, placed: SG.pieces.length, rounds: SG.round }); } return r; }, [i, level, presets, aims, seedBase]));
    const R = rows.slice(0, N), avg = (f) => R.reduce((s, r) => s + f(r), 0) / R.length, pct = (f) => 100 * R.filter(f).length / R.length;
    const o = { name, level, n: R.length, allOver: R.every((r) => r.over), aWins: pct((r) => r.aWon), blue: pct((r) => r.team === 'blue'), front: pct((r) => r.front), keep: pct((r) => r.keep), col: avg((r) => r.col), off: avg((r) => r.off), mended: avg((r) => r.mended), share: 100 * avg((r) => r.share), winnerShare: 100 * avg((r) => r.winnerShare), loserShare: 100 * avg((r) => r.loserShare),
      diz: avg((r) => r.diz), len: avg((r) => r.len), gap: avg((r) => r.gap), gapMax: Math.max(...R.map((r) => r.gap)), stuck: R.reduce((s, r) => s + r.stuck, 0), raid: avg((r) => r.raid), trapped: avg((r) => r.trapped), shots: avg((r) => r.shots), placed: avg((r) => r.placed) };
    console.log(name.padEnd(26) + ' A wins ' + o.aWins.toFixed(0) + '%  blue ' + o.blue.toFixed(0) + '%  front ' + o.front.toFixed(0) + '%  | Keep down ' + o.keep.toFixed(0) + '%  collapses ' + o.col.toFixed(1) + '  parts off ' + o.off.toFixed(0) + ' (mended ' + o.mended.toFixed(0) + ')  camp off at end ' + o.share.toFixed(0) + '% (winner ' + o.winnerShare.toFixed(0) + ', loser ' + o.loserShare.toFixed(0) + ')  dizzies ' + o.diz.toFixed(0) +
      '  len ' + o.len.toFixed(0) + ' s  quiet avg ' + o.gap.toFixed(1) + ' max ' + o.gapMax.toFixed(0) + ' s  raids ' + o.raid.toFixed(0) + '  traps ' + o.trapped.toFixed(1) + '  shots ' + o.shots.toFixed(0) + '  stuck ' + o.stuck + '  pieces ' + o.placed.toFixed(0));
    return o; };
  const out = { n: N, seedBase, config: await p.evaluate(() => JSON.parse(JSON.stringify(SG.CONFIG))), exps: {} };
  const list = [['build', 'good camp against bad camp', 'normal', ['good', 'bad'], ['aim', 'aim']], ['aim', 'aimer against random fire', 'normal', ['average', 'average'], ['aim', 'random']], ['even', 'equal camps and bots', 'normal', ['average', 'average'], ['aim', 'aim']],
    ['evenGood', 'equal good camps', 'normal', ['good', 'good'], ['aim', 'aim']], ['easy', 'equal, easy bots', 'easy', ['average', 'average'], ['aim', 'aim']], ['hard', 'equal, hard bots', 'hard', ['good', 'good'], ['aim', 'aim']]];
  for (const [key, name, level, presets, aims] of list) { if (only && only.split(',').indexOf(key) < 0) continue; out.exps[key] = await exp(name, level, presets, aims); }
  out.errors = errs; if (errs.length) console.log('errors:', errs.slice(0, 3));
  fs.writeFileSync(path.resolve(__dirname, 'proof-result.json'), JSON.stringify(out, null, 1));
  await b.close();
};
run();
