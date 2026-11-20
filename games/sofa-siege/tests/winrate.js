/* Robot win rates by level, from bot-vs-bot matches (headless, stepped). Run: NODE_PATH=$(npm root -g) node tests/winrate.js [games per cell, default 12]
   The robot (a level) plays a stand-in for a person: "average" = the Normal robot with an average camp; "beginner" = a bot with an average camp that fires at random
   spots in the robot's camp (the way a first-time player does). Sides and teams swap from game to game. Prints a table; paste it into BOT_REPORT.md. */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require('playwright');
const N = +(process.argv[2] || 12), sets = process.argv.slice(3).filter((a) => a.includes('=')).map((s) => s.split('=')), only = (process.argv.find((a) => a.startsWith('only=')) || '').slice(5).split(',').filter(Boolean);   /* key=value (levels.friendly.reloadMul=3) tries a number; only=friendly,easy picks levels */
const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForFunction('window.__done', null, { timeout: 60000 });
  await p.evaluate((sets) => { SG.hold = true; sets.filter((q) => q[0] !== 'only').forEach(([k, v]) => { const ks = k.split('.'); let o = SG.CONFIG; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = isNaN(+v) ? v : +v; }); }, sets);
  const out = {};
  for (const stand of ['average', 'beginner']) for (const level of ['friendly', 'easy', 'normal', 'hard'].filter((l) => !only.length || only.includes(l))) {
    const rows = [];
    for (let i = 0; i < N; i += 4) rows.push(...await p.evaluate(([i0, n, level, stand]) => { const r = [];
      for (let i = i0; i < Math.min(i0 + 4, n); i++) { const rs = i % 2, so = 1 - rs, aim = {}; if (stand === 'beginner') aim[so] = 'random';
        SG.start(i % 4 < 2 ? 'blue' : 'red', { seed: 9000 + i * 97, level, aim, presets: rs ? ['average', undefined] : [undefined, 'average'] }); SG.auto(rs, level); SG.auto(so, stand === 'average' ? 'normal' : 'easy'); SG.sides[so].preset = SG.sides[so].preset || 'average'; SG.skipBuild(); SG.begin(); let g = 0; while (SG.phase !== 'over' && g++ < 600) SG.step(1);
        r.push({ over: SG.phase === 'over', robotWon: SG.winner === rs, secs: Math.round(SG.stats.fightTime || 0) }); } return r; }, [i, N, level, stand]));
    const w = rows.filter((x) => x.robotWon).length, done = rows.filter((x) => x.over).length;
    out[stand + '/' + level] = { games: rows.length, finished: done, robotWon: w, pct: Math.round(100 * w / rows.length), avgSecs: Math.round(rows.reduce((s, x) => s + x.secs, 0) / rows.length) };
    console.log(stand, level, JSON.stringify(out[stand + '/' + level]));
  }
  console.log('JSON ' + JSON.stringify(out));
  await b.close();
};
run().catch((e) => { console.error(e); process.exit(1); });
