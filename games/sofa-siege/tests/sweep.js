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
const all = process.argv.slice(3).map((s) => s.split('='));
const sets = all.filter((q) => q[0] !== 'seedBase');   /* seedBase=N plays a different set of matches, to check the tuning on fresh ones */
const seedBase = +((all.find((q) => q[0] === 'seedBase') || [0, 9000])[1]);
const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForFunction('window.__done', null, { timeout: 60000 });
  await p.evaluate((sets) => { SG.hold = true; sets.forEach(([k, v]) => { const ks = k.split('.'); let o = SG.CONFIG; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = +v; }); }, sets);
  const out = { n: N, config: await p.evaluate(() => JSON.parse(JSON.stringify(SG.CONFIG))), levels: {} };
  for (const lvl of ['easy', 'normal', 'hard']) {
    const rows = [];
    for (let i = 0; i < N; i += 10) {   /* ten matches a call keeps each browser call short */
      rows.push(...await p.evaluate(([i0, lvl, seedBase]) => { const r = []; for (let i = i0; i < i0 + 10; i++) {
        SG.start(i % 2 ? 'red' : 'blue', { seed: seedBase + i * 131, level: lvl }); SG.auto(0, lvl); SG.skipBuild(); const lay = [SG.sides[0].layout, SG.sides[1].layout]; SG.begin(); let g = 0; while (SG.phase !== 'over' && g++ < 400) SG.step(1);
        const st = SG.stats, off = SG.pieces.reduce((s, q) => s + q.ps.filter((x) => x.st !== 'on').length, 0);
        r.push({ lay, over: SG.phase === 'over', win: SG.sides[SG.winner].team, front: SG.winner === 0, len: st.fightTime, diz: st.dizzies, daze: st.dazes, flips: st.hillFlips, off: st.partsOff, mended: st.partsMended, still: off, shots: st.shots, stuck: st.stuck, noPath: st.noPath, own: st.ownHits, gap: st.longestGap,
          margin: Math.abs(SG.sides[0].score - SG.sides[1].score) }); } return r; }, [i, lvl, seedBase]));
    }
    const R = rows.slice(0, N), avg = (f) => R.reduce((s, r) => s + f(r), 0) / R.length, pct = (f) => 100 * R.filter(f).length / R.length;
    const L = out.levels[lvl] = { blue: pct((r) => r.win === 'blue'), red: pct((r) => r.win === 'red'), front: pct((r) => r.front), allOver: R.every((r) => r.over), len: avg((r) => r.len), early: pct((r) => r.len < 179.9),
      dizzies: avg((r) => r.diz), dazes: avg((r) => r.daze), flips: avg((r) => r.flips), partsOff: avg((r) => r.off), mendedPct: 100 * avg((r) => r.mended) / Math.max(1, avg((r) => r.off)), shots: avg((r) => r.shots),
      layouts: [0, 1, 2].map((k) => { const g = R.filter((r) => r.lay[0] !== r.lay[1] && (r.lay[0] === k || r.lay[1] === k)); return g.length ? Math.round(100 * g.filter((r) => r.lay[r.front ? 0 : 1] === k).length / g.length) : -1; }),
      stuck: R.reduce((s, r) => s + r.stuck, 0), noPath: avg((r) => r.noPath), ownHits: avg((r) => r.own), gapMax: Math.max(...R.map((r) => r.gap)), margin: avg((r) => r.margin) };
    console.log(lvl.padEnd(7) + ' blue ' + L.blue.toFixed(0) + '%  red ' + L.red.toFixed(0) + '%  front ' + L.front.toFixed(0) + '%  | dizzies ' + L.dizzies.toFixed(1) + ' (dazes ' + L.dazes.toFixed(1) + ')  flips ' + L.flips.toFixed(1) + '  parts off ' + L.partsOff.toFixed(1) + '  mended ' + L.mendedPct.toFixed(0) + '%  shots ' + L.shots.toFixed(0) +
      '  len ' + L.len.toFixed(0) + ' s  early ' + L.early.toFixed(0) + '%  margin ' + L.margin.toFixed(0) + '  stuck ' + L.stuck + '  no-path ' + L.noPath.toFixed(1) + '  own hits ' + L.ownHits.toFixed(2) + '  quiet ' + L.gapMax.toFixed(0) + ' s  | camp presets win ' + L.layouts.join('/') + '%');
  }
  out.errors = errs; fs.writeFileSync(path.resolve(__dirname, 'sweep-result.json'), JSON.stringify(out, null, 1));
  if (!sets.length) {   /* a run with the numbers as they are in game.js writes the report */
    const L = out.levels, c = out.config, f0 = (x) => x.toFixed(0), f1 = (x) => x.toFixed(1), row = (name, f) => '| ' + name + ' | ' + ['easy', 'normal', 'hard'].map((k) => f(L[k])).join(' | ') + ' |';
    const inR = (x, a, b2) => x >= a && x <= b2 ? 'yes' : 'NO';
    const md = ['# Round Table Kingdom: balance sweep, bot against bot', '',
      'Made by `tests/sweep.js`: ' + N + ' matches at each level, stepped headless (no frames drawn). Both sides are the same bot at the same level. The teams swap ends every match. Both camps are the same preset, so the only differences are the team rules and the dice. All matches start from finished camps.', '',
      seedBase === 9000 ? 'These are the matches the numbers were tuned on, so the win shares flatter them a little.' : '**Fresh seeds:** this run used seedBase ' + seedBase + ', matches the numbers were never tuned on. Nothing was changed after seeing it.', '',
      '## Results', '', '| | Easy | Normal | Hard |', '|---|---|---|---|',
      row('Blue wins', (x) => f0(x.blue) + '%'), row('Red wins', (x) => f0(x.red) + '%'), row('Each team inside 45–55%', (x) => inR(x.blue, 45, 55)),
      row('Front seat wins', (x) => f0(x.front) + '%'), row('Front seat under 55%', (x) => x.front < 55 ? 'yes' : 'NO'),
      row('Dizzies a match (target 15–25)', (x) => f1(x.dizzies) + ', of which cork dazes ' + f1(x.dazes)), row('Hill changes hands (target 6–12)', (x) => f1(x.flips)),
      row('Parts knocked off a match', (x) => f1(x.partsOff)), row('Mended back by the end (target about 70%)', (x) => f0(x.mendedPct) + '%'), row('Marbles fired a match', (x) => f0(x.shots)),
      row('Fight length, of 180 s', (x) => f0(x.len) + ' s'), row('Ended early at 100 points', (x) => f0(x.early) + '%'), row('Average winning margin, points', (x) => f0(x.margin)),
      row('Stuck mice (no move for 20 s with a goal)', (x) => String(x.stuck)), row('"?" no-way-through moments a match', (x) => f1(x.noPath)), row('Marbles into own pieces a match', (x) => x.ownHits.toFixed(2)),
      row('Longest stretch with no event, worst of ' + N, (x) => f0(x.gapMax) + ' s'), '',
      'With ' + N + ' matches a win share is good to about ±3.5 points, so "50%" here means "somewhere from 46 to 54".', '',
      '## What was changed, and why', '', 'Only numbers in the `CONFIG` object at the top of `game.js` were tuned. "Before" is the build of the last report (commit 54fad53).', '',
      '| Number | Before | Now | Why |', '|---|---|---|---|',
      '| `dizzy` (red) | 4.9 s | ' + c.dizzy + ' s, same as blue | Asked for: no special case. |',
      '| `redParts` | 2 | ' + c.redParts + ' | Once lobbers could lose parts, a two-part marble broke the other lobber too easily: red won 68% on easy and 85% on normal and hard. |',
      '| `corkChance` | 0.04 | ' + c.corkChance + ' | The cork works the same at every level, so it decided easy matches: blue won about 65% there. A daze still lasts ' + c.corkDaze + ' s and never sends a mouse home. |',
      '| `blast` | 0.34 | ' + c.blast + ' | Calm down: fewer mice caught by one marble. |',
      '| `reload` | 4 s | ' + c.reload + ' s | Calm down: fewer marbles. It only winds while a mouse crews the lobber. |',
      '| `squadRing` | 0.42 | ' + c.squadRing + ' | Squads stand further apart, so one marble rarely gets more than one or two. |',
      '| `holdSecs` | none | ' + c.holdSecs + ' s | New: the hill only "changes hands" when a side has had more mice on it for this long. It stops the callout flickering. Scoring is unchanged. |',
      '| `gain` | 0.8 | ' + c.gain + ' | Four mice a side reach the hill now (the fifth crews the lobber), so each counts a little more. |',
      '| `mendTime` | 3 s | ' + c.mendTime + ' s | So that mending keeps up: about 52% of fallen parts came back before, about 70% now. |',
      '| `botMendAt` | none | ' + c.botMendAt + ' | New: a bot sends one mouse to mend during a round once this many of its parts lie fallen. |',
      '| `scrapEvery` | 4 s | ' + c.scrapEvery + ' s | Calm down: fewer parts off. |',
      '| `wallShots` | 0.38 | ' + c.wallShots + ' | Share of bot marbles aimed at pieces. |',
      '| bot `fire` (easy, normal, hard) | 10, 6.5, 4.4 s | ' + c.levels.easy.fire + ', ' + c.levels.normal.fire + ', ' + c.levels.hard.fire + ' s | Calm down. Easy now fires least often, with aim error ' + c.levels.easy.err + ' (was 0.8 with many misses): fewer, better-aimed shots. |',
      '| `personal` | none | ' + c.personal + ' | New: mice that have stopped keep this far apart, and each claims its own spot. |',
      '| bot camp preset | one of three at random | always the third | The three were far from even: in hard bot matches the first won 8% and the third 69 to 78%. The other two are kept for demos and tests only. |',
      '| bot `raidLead` (easy, normal, hard) | 8 for all | ' + c.levels.easy.raidLead + ', ' + c.levels.normal.raidLead + ', ' + c.levels.hard.raidLead + ' | The strongest balance lever found. The red bot sends one scrapper to the nearest enemy wall when it is this many points ahead. The scrapper stands at the hill\'s edge, away from the marbles, and still counts on the hill. It is a jumpy lever and one value does not fit all three levels, so it is set per level; a negative value means the scrapper goes even when red is a little behind. |', '',
      'Team rules that survived: blue corks (now need a clear line of sight), red scrappers (reach ' + c.scrapReach + '), the red bot\'s wall raid. Dropped: red\'s shorter dizzy and red\'s two-part marble.', '',
      '## Final numbers', '', '```', JSON.stringify(c, null, 1), '```', ''];
    fs.writeFileSync(path.resolve(__dirname, '..', 'BOT_REPORT.md'), md.join('\n'));
  }
  if (errs.length) console.log('errors:', errs);
  await b.close();
};
run();
