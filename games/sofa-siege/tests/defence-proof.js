/* Match-level proof for the Defences prototype (Lab flag mode). Run: NODE_PATH=$(npm root -g) node tests/defence-proof.js [games per direction, default 20] [key=value ...] [level=normal] [json=out.json]
   Bots play whole matches (stepped, no drawing). One side builds the fortified camp ('goodF': the 'good' camp without its trap, workshop and one wall, and what that frees spent on posts and traps),
   the other the plain 'good' camp: the same 12 points. Both sides fire the seven Arsenal weapons in turn. Sides and teams swap from game to game. key=value sets a CONFIG number (defence.counter.every=8).
   It also plays the same matches with no defences on either side, so a side bias shows. Prints a table and a JSON line. */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require('playwright');
const args = process.argv.slice(2), N = +(args.find((a) => /^\d+$/.test(a)) || 20), sets = args.filter((a) => a.includes('=') && !/^(level|json|seed0|only)=/.test(a)).map((s) => s.split('='));
const opt = (k, d) => { const a = args.find((x) => x.startsWith(k + '=')); return a ? a.slice(k.length + 1) : d; };
const level = opt('level', 'normal'), jsonOut = opt('json', ''), seed0 = +opt('seed0', 5000), only = opt('only', '');
const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForFunction('window.__done', null, { timeout: 60000 });
  await p.evaluate((sets) => { SG.hold = true; sets.forEach(([k, v]) => { const ks = k.split('.'); let o = SG.CONFIG; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = isNaN(+v) ? v : +v; }); }, sets);
  const game = (i, fort, level, seed) => p.evaluate(([i, fort, level, seed]) => {
    SG.start(i % 4 < 2 ? 'blue' : 'red', { seed, level, presets: ['good', 'good'], defence: { fort } }); SG.auto(0, level); SG.auto(1, level);
    SG.skipBuild(); SG.begin(); let g = 0; while (SG.phase !== 'over' && g++ < 700) SG.step(1);
    const st = SG.stats, D = SG.def.stats, it = SG.def.items;
    return { over: SG.phase === 'over', winner: SG.winner, score: [Math.round(SG.sides[0].score), Math.round(SG.sides[1].score)], secs: Math.round(st.fightTime), keepDown: st.keepDown, keepBy: st.keepBy, items: [it.filter((x) => x.side === 0).length, it.filter((x) => x.side === 1).length],
      points: [SG.sides[0].points, SG.sides[1].points], def: D, partsLost: [st.bySide[0].partsLost, st.bySide[1].partsLost], hillSecs: [Math.round(st.bySide[0].hillSecs), Math.round(st.bySide[1].hillSecs)], shots: [st.bySide[0].shots, st.bySide[1].shots] };
  }, [i, fort, level, seed]);
  const out = {};
  const sets3 = only ? [only] : ['bare', 'fortFront', 'fortFar'];
  for (const name of sets3) {
    const fort = name === 'fortFront' ? [true, false] : name === 'fortFar' ? [false, true] : [false, false], rows = [];
    for (let i = 0; i < N; i++) rows.push(await game(i, fort, level, seed0 + i * 97));
    const fs0 = fort[0] ? 0 : (fort[1] ? 1 : -1), wins = rows.filter((r) => r.over && (fs0 < 0 ? r.winner === 0 : r.winner === fs0)).length;
    const avg = (f) => Math.round(rows.reduce((s, r) => s + f(r), 0) / rows.length * 10) / 10;
    out[name] = { games: rows.length, finished: rows.filter((r) => r.over).length, wins, pct: Math.round(100 * wins / rows.length), keepFelled: rows.filter((r) => r.keepDown).length, avgSecs: avg((r) => r.secs),
      avgScore: [avg((r) => r.score[0]), avg((r) => r.score[1])], avgPartsLost: [avg((r) => r.partsLost[0]), avg((r) => r.partsLost[1])], avgHill: [avg((r) => r.hillSecs[0]), avg((r) => r.hillSecs[1])], avgShots: [avg((r) => r.shots[0]), avg((r) => r.shots[1])],
      def: Object.fromEntries(Object.keys(rows[0].def).map((k) => [k, avg((r) => r.def[k])])), rows };
    const o = out[name]; console.log(name, 'wins of the ' + (fs0 < 0 ? 'front side' : 'fortified side') + ':', wins + '/' + rows.length, o.pct + '%', 'avg score', JSON.stringify(o.avgScore), 'parts lost', JSON.stringify(o.avgPartsLost), 'hill secs', JSON.stringify(o.avgHill), 'keeps felled', o.keepFelled);
  }
  const f = ['fortFront', 'fortFar'].filter((k) => out[k]), tw = f.reduce((s, k) => s + out[k].wins, 0), tg = f.reduce((s, k) => s + out[k].games, 0);
  if (f.length) { out.fortified = { wins: tw, games: tg, pct: Math.round(100 * tw / tg) }; console.log('FORTIFIED OVERALL', tw + '/' + tg, out.fortified.pct + '%'); }
  if (errs.length) console.log('PAGE ERRORS', errs.slice(0, 3));
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(out, null, 1));
  console.log('JSON ' + JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.rows ? { games: v.games, wins: v.wins, pct: v.pct } : v]))));
  await b.close();
};
run().catch((e) => { console.error(e); process.exit(1); });
