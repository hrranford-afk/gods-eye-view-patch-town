/* C03 end-to-end story, headless (no browser, no iPad): one neighbourhood, a scripted sequence of changes, a printed table of what each change did, and the checks.
   Run from games/city-lab: node tests/district-e2e.js . Uses the hand-made district (districts/patch_row_hand.json). Deterministic: the story is run twice and must end in the same state hash. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DI = require(path.join(ROOT, 'district.js'));
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const D = rd('districts/patch_row_hand.json'), files = {};
[...D.buildings.map((b) => b.recipe), D.home_template.recipe, 'shared/cloud/examples/bakery.stone_deck_oven.json'].forEach((p) => { files[p] = rd(p); });
let n = 0, bad = 0; const ok = (name, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + name + (!c && x !== undefined ? '  -> ' + JSON.stringify(x) : '')); };
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);

function story() {
  const m = DI.make(D, files, { seed: D.seed }); if (!m.ok) throw new Error(m.errors.join('; ')); const W = m.W, rows = [];
  const bk = W.S.b.find((b) => b.kind === 'shop').id;
  let last = DI.snap(W);
  function leg(label, secs) {   /* run, then record the per-minute figures for just this leg */
    DI.run(W, secs); const s = DI.snap(W), rep = DI.between(W, last, s), b = rep.b[bk], e = W.S.env.b[bk];
    rows.push({ label, secs, residents: W.S.env.residents, demand: e.demand, sold_pm: b.sold_pm, lost_pm: b.lost_pm, net_pm: b.net_pm, draw: W.S.env.power.draw, supply: W.S.env.power.supply, factor: W.S.env.power.factor, deliveries: e.deliveries, brown_s: b.brown_s });
    last = s; return rows[rows.length - 1];
  }
  const out = { W, rows, steps: {} };
  out.steps.base = leg('1 baseline (4 homes)', 300);
  for (let i = 0; i < 4; i++) DI.addHome(W);
  out.steps.homes = leg('2 after 4 more homes (8)', 300);
  out.steps.homesLog = W.S.log.filter((l) => l.type === 'change' && /Home added/.test(l.text)).length;
  DI.setRoad(W, [5, 2], false, 'Road at 5,2 blocked (story)');
  out.steps.blocked = leg('3 road 5,2 blocked', 120);
  DI.setRoad(W, [5, 2], true, 'Road at 5,2 reopened (story)');
  out.steps.reopen = leg('4 road reopened', 120);
  DI.setScale(W, 0.6, 'Grid supply cut to 60% (story)');
  out.steps.brown = leg('5 grid at 60%', 120);
  DI.setScale(W, 1, 'Grid back to 100% (story)');
  out.steps.back = leg('6 grid restored', 120);
  out.steps.up = DI.applySidecar(W, bk, 'shared/cloud/examples/bakery.stone_deck_oven.json');
  out.steps.upgraded = leg('7 stone deck oven applied', 300);
  out.hash = DI.hash(W); out.log = W.S.log;
  return out;
}
const A = story(), B = story(), S = A.steps;
console.log('\n' + 'leg'.padEnd(30) + 'homes-res  demand  sold  lost   net   draw/supply  power  carts');
A.rows.forEach((r) => console.log(r.label.padEnd(30) + String(r.residents).padStart(8) + f1(r.demand).padStart(8) + f1(r.sold_pm).padStart(6) + f1(r.lost_pm).padStart(6) + f1(r.net_pm).padStart(7) + (f1(r.draw) + '/' + f1(r.supply)).padStart(13) + (Math.round(r.factor * 100) + '%').padStart(7) + (r.deliveries ? '   ok' : '   NO ROAD')));
console.log('');
ok('the story ran twice and ended in the same state hash (deterministic)', A.hash === B.hash, [A.hash, B.hash]);
ok('every figure of the two runs is identical', JSON.stringify(A.rows) === JSON.stringify(B.rows));
ok('4 more homes: demand rises (and the log says so)', S.homes.demand > S.base.demand + 1 && S.homesLog === 4, [S.base.demand, S.homes.demand, S.homesLog]);
ok('4 more homes: the bakery sells more per minute', S.homes.sold_pm > S.base.sold_pm, [S.base.sold_pm, S.homes.sold_pm]);
ok('blocking road 5,2 suspends deliveries to the bakery', S.blocked.deliveries === false && S.homes.deliveries === true);
ok('blocking road 5,2 cuts demand (customers cannot reach the shop)', S.blocked.demand < S.homes.demand * 0.6, [S.homes.demand, S.blocked.demand]);
ok('reopening the road restores demand and deliveries', S.reopen.deliveries === true && Math.abs(S.reopen.demand - S.homes.demand) < 0.01);
ok('a 60% grid causes a brownout: every building runs below full power', S.brown.factor < 0.999 && S.brown.brown_s > 100, [S.brown.factor, S.brown.brown_s]);
ok('restoring the grid returns power to where it was before the cut (95%: 8 homes already draw 13.7 kW against 13.0 kW), up from 57%', S.back.factor > S.brown.factor + 0.3 && Math.abs(S.back.factor - S.homes.factor) < 1e-9, [S.brown.factor, S.back.factor, S.homes.factor]);
ok('the upgrade is accepted, costs 40 coins once, and appears in the log', S.up.ok && S.up.coins === 40 && A.log.some((l) => l.type === 'change' && /Upgrade Stone deck oven/.test(l.text)), S.up);
ok('every change in the story has a plain sentence with numbers in the log', A.log.filter((l) => l.type === 'change').every((l) => /\d/.test(l.text) && l.text.length > 30));
console.log('\n' + (bad ? bad + ' FAILED of ' + n : n + ' of ' + n + ' checks passed'));
process.exit(bad ? 1 : 0);
