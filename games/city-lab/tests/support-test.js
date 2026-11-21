/* City Lab support-rule equivalence test. Run: NODE_PATH=$(npm root -g) node tests/support-test.js
   It loads the real game (../sofa-siege/index.html?lab=1), takes the Cottage and the Market stall from the Building Yard, and compares which parts fall
   for the same removed parts, game against the pure function in supports.js.

   WHAT IS COMPARED
   1. DATA: the game's own part table (SS.bldInfo, and the live piece's part list) is turned into recipe-shaped data {id, needs, needsMin, stage} by a mechanical converter. The
      converted data must equal what the live piece carries, part for part.
   2. THE RULE, by removing parts directly: every single part, every pair of parts, and 400 seeded random sets of 1 to 8 parts are taken off the live piece (their state set to off,
      exactly what knock() does to a part) and the game's own predicate (bFloating, via SG.bldFloating()) is run round after round, as bSettle runs it. The set that fell and the rounds it
      fell in must equal supports.fall() on the recipe data.
   3. THE REAL BSETTLE, end to end: real shots (Marble, High lob, Big Marble, and salvos) are fired at the building with the game's own code (SG.labFire, Chain topple off). The parts the blast
      itself knocked off (their debris record has chain depth 0) are the roots; the parts that fell by the support rule (depth 1) are what bSettle did. supports.fall(roots) must equal all parts that came off.
   WHAT IS NOT COMPARED
   - Which parts a blast hits (that is geometry and blast radius, not the support rule; the real shots feed the game's own choice of roots to both sides).
   - The timing of falls (the game delays later rounds by 0.2 s and the windmill sails by 0.5 s); only the set and the round grouping are compared.
   - The recipe geometry: there is no hand-made Cottage recipe with positions, so the validator's overlap and stand-at-start rules are not run on the converted data.
   - Anything that is not a Yard building (walls, gates, Keeps have their own rules in the game). */
'use strict';
const L = require('./lib.js');
const SUP = require('../supports.js');
let n = 0, bad = 0;
const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (!cond && extra ? '  -> ' + extra : '')); };
const same = (a, b) => JSON.stringify(a.slice().sort()) === JSON.stringify(b.slice().sort());
const sameRounds = (a, b) => a.length === b.length && a.every((r, i) => same(r, b[i]));
function rng(seed) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

(async () => {
  const { srv, base } = await L.serve(); const browser = await L.launch(); const page = await L.newPage(browser, { width: 900, height: 600 });
  await page.goto(base + '/sofa-siege/index.html?lab=1'); await page.waitForFunction('window.__done', null, { timeout: 60000 });
  await page.evaluate(() => { SG.hold = true; });
  const TARGETS = [['Cottage', 'cottage', 'cottage'], ['Market stall', 'market', 'stall']];
  const total = { single: 0, pair: 0, random: 0, shots: 0, shotParts: 0 };

  for (const [nice, targetId, kind] of TARGETS) {
    console.log('\n== ' + nice + ' (target "' + targetId + '", piece kind "' + kind + '")');
    /* 1. data */
    const data = await page.evaluate(([t, k]) => {
      SG.labLoadTarget(t); SG.lab.topple = false;
      const pc = SG.pieces.filter((q) => q.kind === k && q.side === 1)[0], info = SS.bldInfo(k).parts;
      return { live: pc.ps.map((q) => ({ id: q.id, need: q.need, min: q.min, stg: q.stg })), info: Object.keys(info).map((id) => ({ id, need: info[id].need, min: info[id].min, stg: info[id].stg })), n: pc.ps.length };
    }, [targetId, kind]);
    const toRecipe = (list) => list.map((q) => ({ id: q.id, needs: q.need.slice(), needsMin: q.need.length ? q.min : undefined, stage: ['trim', 'walls', 'frame'][q.stg] }));
    const R = toRecipe(data.live);
    ok(nice + ': the converted recipe data has the same parts, needs, min and stage as the live piece and the game table (' + data.n + ' parts)',
      JSON.stringify(R) === JSON.stringify(toRecipe(data.info).sort((a, b) => R.findIndex((x) => x.id === a.id) - R.findIndex((x) => x.id === b.id))) && R.length === data.n);
    ok(nice + ': every need exists, no needs cycle (the same graph check the validator uses)', R.every((p) => p.needs.every((x) => R.some((y) => y.id === x))) && SUP.findCycle(R) === null);
    ok(nice + ': needsMin is a whole number from 1 to the number of needs wherever there are needs', R.every((p) => !p.needs.length || (Number.isInteger(p.needsMin) && p.needsMin >= 1 && p.needsMin <= p.needs.length)));

    /* 2. direct removals: the game's predicate, round by round */
    const sets = [], ids = R.map((p) => p.id);
    ids.forEach((a) => sets.push([a]));
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) sets.push([ids[i], ids[j]]);
    const r = rng(777 + n); const nSingle = ids.length, nPair = sets.length - nSingle;
    for (let i = 0; i < 400; i++) { const k = 1 + Math.floor(r() * 8), s = new Set(); while (s.size < k) s.add(ids[Math.floor(r() * ids.length)]); sets.push([...s]); }
    const game = await page.evaluate(([t, k, sets]) => {
      const pc = SG.pieces.filter((q) => q.kind === k && q.side === 1)[0], out = [];
      sets.forEach((rem) => {
        pc.ps.forEach((q) => { q.st = 'on'; }); rem.forEach((id) => { pc.ps[pc.pi[id]].st = 'off'; });
        const rounds = []; let guard = 0;
        while (guard++ < 14) {
          const f = SG.bldFloating().filter((s) => s.indexOf(k + ':') === 0).map((s) => s.slice(k.length + 1));
          if (!f.length) break; rounds.push(f); f.forEach((id) => { pc.ps[pc.pi[id]].st = 'off'; });
        }
        out.push({ rounds, left: SG.bldFloating().length, off: pc.ps.filter((q) => q.st !== 'on').map((q) => q.id) });
      });
      pc.ps.forEach((q) => { q.st = 'on'; });
      return out;
    }, [targetId, kind, sets]);
    let bs = { single: 0, pair: 0, random: 0 }, mism = [];
    sets.forEach((rem, i) => {
      const f = SUP.fall(R, rem), g = game[i], gotAll = [].concat(...g.rounds);
      const equal = same(f.fallen, gotAll) && sameRounds(f.rounds, g.rounds) && same(f.all, g.off) && g.left === 0;
      const cls = i < nSingle ? 'single' : (i < nSingle + nPair ? 'pair' : 'random');
      if (equal) bs[cls]++; else if (mism.length < 4) mism.push(JSON.stringify({ rem, pure: f.rounds, game: g.rounds }));
    });
    ok(nice + ': all ' + nSingle + ' single removals fall exactly as in the game (same set, same rounds)', bs.single === nSingle, mism.join(' '));
    ok(nice + ': all ' + nPair + ' pairs fall exactly as in the game', bs.pair === nPair, mism.join(' '));
    ok(nice + ': all 400 seeded random sets of 1 to 8 parts fall exactly as in the game', bs.random === 400, mism.join(' '));
    /* a negative control: the same comparison with a deliberately wrong rule (needsMin ignored, every need required) must disagree with the game, or the test could not tell */
    const wrong = R.map((p) => Object.assign({}, p, { needsMin: undefined })); let wrongDiff = 0;
    sets.forEach((rem, i) => { if (!same(SUP.fall(wrong, rem).fallen, [].concat(...game[i].rounds))) wrongDiff++; });
    ok(nice + ': negative control: a wrong rule (needsMin ignored) disagrees with the game on ' + wrongDiff + ' of ' + sets.length + ' sets, so the comparison can tell rules apart', wrongDiff > 0);
    ok(nice + ': after the rounds the game has no floating part for any of the ' + sets.length + ' sets', game.every((g) => g.left === 0));
    ok(nice + ': at least some removals really cascade (the test is not trivial): ' + sets.filter((s, i) => SUP.fall(R, s).fallen.length > 0).length + ' of ' + sets.length, sets.filter((s) => SUP.fall(R, s).fallen.length > 0).length > sets.length * 0.3);
    total.single += bs.single; total.pair += bs.pair; total.random += bs.random;

    /* 3. the real bSettle after real shots */
    const plans = [];
    ['marble', 'big'].forEach((am) => [[0, 0], [0.18, 0.05], [-0.2, 0.1], [0.05, -0.18], [0.3, 0.2], [-0.12, -0.25]].forEach((o, i) => plans.push({ am, high: false, dx: o[0], dz: o[1], seed: 11 + i })));
    plans.push({ am: 'marble', high: true, dx: 0, dz: 0, seed: 40 }, { am: 'marble', high: true, dx: 0.15, dz: 0.1, seed: 41 });
    const shots = await page.evaluate(async ([t, k, plans]) => {
      const out = [];
      for (const pl of plans) {
        SG.labLoadTarget(t); SG.lab.topple = false; SG.sides.forEach((sd) => { sd.big = 99; });
        const pc = SG.pieces.filter((q) => q.kind === k && q.side === 1)[0];
        const record = { roots: [], collapsed: [], shots: [] }, seen = {};
        let prior = [];
        for (let s = 0; s < 3; s++) {   /* up to 3 shots in a row at the same building, nothing mended between */
          SG.labSetAmmo(pl.am); SG.labSetHigh(pl.high);
          const before = pc.ps.filter((q) => q.st !== 'on').map((q) => q.id);
          SG.labFire(0, 'gun', pc.x + pl.dx * (s + 1), pc.z + pl.dz * (s + 1), { force: true, seed: pl.seed + s * 7 });
          const newRoots = [], newFell = [];
          for (let i = 0; i < 420; i++) { SG.step(1 / 60); SG.debris.forEach((d) => { const key = d.pid + ':' + d.i; if (!(key in seen)) { seen[key] = 1; const id = pc.ps[d.i].id; if (d.pid === pc.id) (d.dep === 0 ? newRoots : newFell).push(id); else record.other = (record.other || 0) + 1; } }); }
          const after = pc.ps.filter((q) => q.st !== 'on').map((q) => q.id);
          record.shots.push({ before, roots: newRoots, fell: newFell, after, floating: SG.bldFloating().length, maxDep: 0 });
        }
        out.push({ plan: pl, record });
      }
      return out;
    }, [targetId, kind, plans]);
    let shotOk = 0, shotMismatch = [], shotParts = 0, cascades = 0, chainOnly = 0;
    shots.forEach((s) => s.record.shots.forEach((sh) => {
      const f = SUP.fall(R, sh.roots, { gone: sh.before });
      const eq = same(f.all.concat(sh.before), sh.after) && same(f.fallen, sh.fell) && sh.floating === 0;
      shotParts += sh.roots.length + sh.fell.length; if (sh.fell.length) cascades++; if (!sh.roots.length && !sh.fell.length) chainOnly++;
      if (eq) shotOk++; else if (shotMismatch.length < 3) shotMismatch.push(JSON.stringify({ plan: s.plan, roots: sh.roots, fellGame: sh.fell, fellPure: f.fallen }));
    }));
    const nShots = shots.reduce((a, s) => a + s.record.shots.length, 0);
    ok(nice + ': ' + nShots + ' real shots (Marble, High lob, Big Marble, three in a row each): after each, the parts the support rule dropped equal supports.fall() of the roots the game chose, and nothing floats (' + shotOk + ' of ' + nShots + ')', shotOk === nShots, shotMismatch.join(' '));
    ok(nice + ': the shots are not trivial: ' + cascades + ' of them dropped parts by the support rule, ' + shotParts + ' parts came off in all', cascades >= 3 && shotParts > 40);
    total.shots += nShots; total.shotParts += shotParts;
  }
  ok('the page ran without errors', page.errs.length === 0, page.errs.join(' | '));
  console.log('\nCompared: ' + total.single + ' single removals, ' + total.pair + ' pairs, ' + total.random + ' random sets, ' + total.shots + ' real shots (' + total.shotParts + ' parts) on the Cottage (40 parts) and a Market stall (13 parts).');
  console.log('\n' + (n - bad) + ' of ' + n + ' checks passed' + (bad ? ', ' + bad + ' FAILED' : ''));
  await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
