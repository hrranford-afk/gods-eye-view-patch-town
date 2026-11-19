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
const f0 = (x) => x.toFixed(0), f1 = (x) => x.toFixed(1), yes = (c) => (c ? 'yes' : '**NO**');
/* BOT_REPORT.md: the four proofs asked for, then the averages, then what was changed to get there */
function writeReport(out) { const E = out.exps, need = ['build', 'aim', 'even']; if (!need.every((k) => E[k])) return; const b = E.build, a = E.aim, e = E.even, C = out.config.v2, md = [];
  const pm = (x) => '±' + f0(196 * Math.sqrt(.25 / x.n));
  md.push('# Round Table Kingdom v2 ("Break the camp"): proof by bots', '', 'Made by `tests/proof.js`. Every match is bot against bot, stepped headless (no frames drawn), at the default piece size (' + out.config.pieceScale + '), with the numbers in `CONFIG` as committed. In each experiment the two sides differ only in the thing being measured; the side that has it swaps ends and teams from match to match. Seeds start at ' + out.seedBase + '.',
    '', 'The old rules (`?rules=1`) have their own report in `BOT_REPORT_V1.md`.', '', '## The four proofs', '', '| Proof | Asked for | Measured | Matches | Holds |', '|---|---|---|---|---|',
    '| 1. A good camp beats a bad camp (same bots) | good wins 70% or more | good wins **' + f0(b.aWins) + '%** | ' + b.n + ' | ' + yes(b.aWins >= 70) + ' |',
    '| 2. A bot that aims beats a bot that fires anywhere (same camps) | aimer wins 70% or more | aimer wins **' + f0(a.aWins) + '%** | ' + a.n + ' | ' + yes(a.aWins >= 70) + ' |',
    '| 3a. Collapses in a match | 2 or more | **' + f1(e.col) + '** on average; ' + f0(e.col2) + '% of matches had 2 or more | ' + e.n + ' | ' + yes(e.col >= 2) + ' |',
    '| 3b. A Keep comes down | in 40 to 70% of matches | **' + f0(e.keep) + '%** | ' + e.n + ' | ' + yes(e.keep >= 40 && e.keep <= 70) + ' |',
    '| 3c. Camp parts off at the end | about a third to a half | **' + f0(e.share) + '%** (winner ' + f0(e.winnerShare) + '%, loser ' + f0(e.loserShare) + '%) | ' + e.n + ' | ' + yes(e.share >= 30 && e.share <= 52) + ' |',
    '| 3d. Longest stretch with nothing happening | under 12 s | average **' + f1(e.gap) + ' s**, worst of all matches ' + f0(e.gapMax) + ' s; under 12 s in ' + f0(e.gapOk) + '% of matches | ' + e.n + ' | ' + yes(e.gapMax < 12) + ' |',
    '| 4. Blue against red, same camps and bots | each wins 45 to 55% | blue **' + f0(e.blue) + '%**, red ' + (100 - Math.round(e.blue)) + '% | ' + e.n + ' | ' + yes(e.blue >= 45 && e.blue <= 55) + ' |',
    '| Stuck mice (20 s with a goal and no move) | none | ' + (b.stuck + a.stuck + e.stuck) + ' | ' + (b.n + a.n + e.n) + ' | ' + yes(b.stuck + a.stuck + e.stuck === 0) + ' |', '',
    'A win share from ' + e.n + ' matches is good to about ' + pm(e) + ' points, so read every percentage here with that in mind.', '',
    'What the camps and bots are:', '', '- **Good camp:** the Keep at the back with two braces propping it, three walls close in front of it, a gate and two more walls as a forward screen, a workshop, a spring trap. 12 points.',
    '- **Bad camp:** the Keep out in front with nothing before it; the walls, gate, tent and workshop behind it. 12 points.', '- **Average camp** (what the easy and normal bots build): walls spread wide round the hill side, nothing close to the Keep.',
    '- **Aiming bot:** for every shot it looks at what would really come off (the Keep\'s braces, the legs they held, a wall about to fall, standing mice), tries the low and the high lob, allows for its own wobble, and saves Big Marbles for the Keep.',
    '- **Random-fire bot:** fires at a random spot in the other camp, and uses a Big Marble as soon as it has one. Its mice follow the same orders as the aimer\'s.', '',
    '## Averages for a match', '', '| | ' + Object.keys(E).map((k) => E[k].name).join(' | ') + ' |', '|---|' + Object.keys(E).map(() => '---').join('|') + '|');
  const row = (t, f) => md.push('| ' + t + ' | ' + Object.keys(E).map((k) => f(E[k])).join(' | ') + ' |');
  row('Matches', (x) => x.n); row('Bot level', (x) => x.level); row('First-named side wins', (x) => f0(x.aWins) + '%'); row('Blue wins', (x) => f0(x.blue) + '%'); row('Front seat wins', (x) => f0(x.front) + '%'); row('A Keep comes down', (x) => f0(x.keep) + '%'); row('Keeps felled by', (x) => x.by.replace(/marble/, 'a marble').replace(/big/, 'a Big Marble').replace(/raid/, 'raiders').replace(/debris/, 'flying parts'));
  row('Collapses', (x) => f1(x.col)); row('Parts knocked off', (x) => f0(x.off)); row('Parts mended back', (x) => f0(x.mended)); row('Camp parts off at the end', (x) => f0(x.share) + '%'); row('  the winner\'s camp', (x) => f0(x.winnerShare) + '%'); row('  the loser\'s camp', (x) => f0(x.loserShare) + '%');
  row('Dizzies', (x) => f0(x.diz)); row('Marbles fired', (x) => f0(x.shots)); row('Raider pulls', (x) => f0(x.raid)); row('Spring traps sprung', (x) => f1(x.trapped)); row('Fight length (of 180 s)', (x) => f0(x.len) + ' s'); row('Longest quiet stretch, average', (x) => f1(x.gap) + ' s'); row('Longest quiet stretch, worst', (x) => f0(x.gapMax) + ' s'); row('Stuck mice', (x) => x.stuck);
  md.push('', NOTES, '', '## The numbers used', '', '```', JSON.stringify(C).replace(/,"/g, ', "'), 'levels: ' + JSON.stringify(out.config.levels).replace(/,"/g, ', "'), '```', '');
  fs.writeFileSync(path.resolve(__dirname, '..', 'BOT_REPORT.md'), md.join('\n')); console.log('wrote BOT_REPORT.md'); }
const NOTES = [
  '## What was changed to make the proofs hold',
  '',
  'The first measurements failed badly: the good camp won 42 to 53%, the aimer lost to random fire, the Keep of an average camp fell in 97% of matches and a good camp\'s never, and only 12 to 21% of a camp was off at the end. These are the changes, rules first, then numbers.',
  '',
  '**Rules**',
  '',
  '1. **A Big Marble always flies low.** It is too heavy for the high lob. So a wall in front of the Keep stops it (the first piece along the arc takes the hit), and the attacker has to open a lane first. This is what makes a wall worth building.',
  '2. **A Big Marble that lands on a Keep breaks the leg nearest to where it hit, braced or not.** Before, it had to land within a share of its blast of the leg, which worked from one side of the Keep and not from another.',
  '3. **Keep braces and unbraced legs are sturdier.** A brace comes off only when the hit is within 70% of the blast, an unbraced leg within 50%.',
  '4. **Score counts whole pieces, not parts.** A whole Keep is worth 54, a lobber 8, a wall 5, a gate 3.5; each part off counts its share. A collapse is worth 2, not 5. Before, every part was 1 point, so a camp with many walls handed points to the other side, and blue\'s seven-plank walls gave away more than red\'s five-plank ones.',
  '5. **The marble lands exactly where the dotted arc says.** The arc shown, the spot the bot reckons with and the real landing used to differ by up to 5 cm of table, enough to miss a brace.',
  '6. **Red no longer pulls parts twice as fast** (`redRaid` 1). With it red won nearly every match that went to points. Blue keeps its longer guard corks. **Red\'s mice now walk 17% quicker in the fight** (`redWalk`): without it blue won about two matches in three. I do not fully understand where blue\'s edge comes from (the two teams\' wall and tent models differ); the number is a counterweight, not a cure.',
  '7. **The bot keeps two mice on the hill**, sends one to raid and one to mend, and calls the raider back to guard when raiders are in its camp. Before, it pulled mice off the hill to mend whenever four parts were down, which was nearly always.',
  '8. **The aiming bot is new.** For each shot it works out what would really come off, low lob and high, a little to each side for its own wobble, and takes the best. It saves Big Marbles for the Keep. It also fires at mice that are standing still.',
  '',
  '**Numbers** (all in `CONFIG.v2`): blast 0.2 to 0.3; mending 4 s to 12 s a part (a whole workshop still halves it); a Big Marble for every 24 s of holding the hill, not 10; raiders pull every 3 s, not 5; mouse speed 0.5 to 0.42 (camp to hill in about 6.5 s at the small size); the normal bot\'s aim wobble 0.12.',
  '',
  '## What to know before trusting this',
  '',
  '- **These are bots, not people.** They show that the rules reward a good camp and good aim when both are played competently. They do not show that the game is fun.',
  '- **Two good camps never lose a Keep to each other** (see the "equal good camps" and "hard bots" columns; the hard bot builds the good camp): the walls stop every Big Marble and the bots do not manage to open a lane and use it in time. Those matches all go the full three rounds and are decided on points. So the "Keep down in 40 to 70%" target holds for the normal bot and its average camp, not for the hard bot, and with easy bots it is lower too. A person may find the lane; the bots do not.',
  '- **The first two proofs came out at 100%, not just over 70%.** The bad camp is very bad (its Keep stands in front of everything) and random fire is very poor. The proofs say building and aiming matter; they do not say by how much between two sensible players.',
  '- **Keeps are felled by Big Marbles, almost never by ordinary marbles.** Ordinary marbles strip walls, braces and roofs and send mice home. So the hill matters a great deal: no hill, no Big Marbles, no Keep.',
  '- **Spring traps hardly ever go off** in bot matches (see the row): raiders go for the nearest wall and seldom cross the trap. The trap works when a mouse steps on it (it is tested), but the bots do not show it earning its 2 points.',
  '- **There are a lot of dizzies** (see the row), far more than under the old rules, because the aiming bot fires at mice that stand still. It may feel busy. `aimWorth.mouse` turns it down, but the proofs would need running again.',
  '- **Blue against red rests on one counterweight number** (`redWalk`), as said above.',
  '- The good camp spends its 12 points on a propped Keep, five walls, a gate, a workshop and a trap. It has no tent. The bad camp has the same value in pieces, badly placed.',
].join('\n');
const run = async () => {
  if (process.argv[2] === 'report') { writeReport(JSON.parse(fs.readFileSync(path.resolve(__dirname, 'proof-result.json'), 'utf8'))); process.exit(0); }   /* write BOT_REPORT.md again from the last results */
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
        r.push({ over: SG.phase === 'over', aWon: SG.winner === aSide, front: SG.winner === 0, team: SG.sides[SG.winner].team, keep: !!st.keepDown, by: st.keepBy || '', col: st.collapses, off: st.partsOff, mended: st.partsMended, diz: st.dizzies, len: st.fightTime, gap: st.longestGap, stuck: st.stuck,
          share: (off[0] / total[0] + off[1] / total[1]) / 2, loserShare: off[1 - SG.winner] / total[1 - SG.winner], winnerShare: off[SG.winner] / total[SG.winner], raid: st.raidPulls, trapped: st.trapped, shots: st.shots, placed: SG.pieces.length, rounds: SG.round }); } return r; }, [i, level, presets, aims, seedBase]));
    const R = rows.slice(0, N), avg = (f) => R.reduce((s, r) => s + f(r), 0) / R.length, pct = (f) => 100 * R.filter(f).length / R.length;
    const o = { name, level, n: R.length, allOver: R.every((r) => r.over), aWins: pct((r) => r.aWon), blue: pct((r) => r.team === 'blue'), front: pct((r) => r.front), keep: pct((r) => r.keep), col: avg((r) => r.col), off: avg((r) => r.off), mended: avg((r) => r.mended), share: 100 * avg((r) => r.share), winnerShare: 100 * avg((r) => r.winnerShare), loserShare: 100 * avg((r) => r.loserShare),
      col2: pct((r) => r.col >= 2), gapOk: pct((r) => r.gap < 12), diz: avg((r) => r.diz), len: avg((r) => r.len), gap: avg((r) => r.gap), gapMax: Math.max(...R.map((r) => r.gap)), stuck: R.reduce((s, r) => s + r.stuck, 0), raid: avg((r) => r.raid), trapped: avg((r) => r.trapped), shots: avg((r) => r.shots), placed: avg((r) => r.placed), by: ['marble', 'big', 'raid', 'debris'].map((k) => k + ' ' + R.filter((r) => r.by === k).length).join(', ') };
    console.log(name.padEnd(26) + ' A wins ' + o.aWins.toFixed(0) + '%  blue ' + o.blue.toFixed(0) + '%  front ' + o.front.toFixed(0) + '%  | Keep down ' + o.keep.toFixed(0) + '%  collapses ' + o.col.toFixed(1) + '  parts off ' + o.off.toFixed(0) + ' (mended ' + o.mended.toFixed(0) + ')  camp off at end ' + o.share.toFixed(0) + '% (winner ' + o.winnerShare.toFixed(0) + ', loser ' + o.loserShare.toFixed(0) + ')  dizzies ' + o.diz.toFixed(0) +
      '  len ' + o.len.toFixed(0) + ' s  quiet avg ' + o.gap.toFixed(1) + ' max ' + o.gapMax.toFixed(0) + ' s  raids ' + o.raid.toFixed(0) + '  traps ' + o.trapped.toFixed(1) + '  shots ' + o.shots.toFixed(0) + '  stuck ' + o.stuck + '  pieces ' + o.placed.toFixed(0) + '  Keeps felled by: ' + o.by);
    return o; };
  const out = { n: N, seedBase, config: await p.evaluate(() => JSON.parse(JSON.stringify(SG.CONFIG))), exps: {} };
  const list = [['build', 'good camp against bad camp', 'normal', ['good', 'bad'], ['aim', 'aim']], ['aim', 'aimer against random fire', 'normal', ['average', 'average'], ['aim', 'random']], ['even', 'equal camps and bots', 'normal', ['average', 'average'], ['aim', 'aim']],
    ['evenGood', 'equal good camps', 'normal', ['good', 'good'], ['aim', 'aim']], ['easy', 'equal, easy bots', 'easy', ['average', 'average'], ['aim', 'aim']], ['hard', 'equal, hard bots', 'hard', ['good', 'good'], ['aim', 'aim']]];
  for (const [key, name, level, presets, aims] of list) { if (only && only.split(',').indexOf(key) < 0) continue; out.exps[key] = await exp(name, level, presets, aims); }
  out.errors = errs; if (errs.length) console.log('errors:', errs.slice(0, 3));
  /* a run of only some experiments keeps the others from the last run, as long as the numbers in CONFIG are the same */
  const file = path.resolve(__dirname, 'proof-result.json'); let old = null; try { old = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { old = null; }
  if (old && JSON.stringify(old.config) === JSON.stringify(out.config) && old.seedBase === seedBase) out.exps = Object.assign({}, old.exps, out.exps);
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
  if (!sets.length) writeReport(out);
  await b.close();
};
run();
