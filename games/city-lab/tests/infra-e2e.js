/* C06a end-to-end story (headless, no browser): a scripted run of the power network with a printed table. Run from games/city-lab: node tests/infra-e2e.js
   Story: a steady 4-home street; homes arrive until the homes cable overloads (only that street dims); the cable is widened and the generator becomes the limit;
   a short and a long generator cut (the C03b lesson: stock covers the short one); the main feeder is cut (a dark shop street keeps paying wages); the read-only comparison
   at the end changes nothing. Every window is whole delivery cycles (700 s = 10 cycles of the 70 s carts and 7 of the 100 s carts). */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DI = require(path.join(ROOT, 'district.js')), IX = require(path.join(ROOT, 'infra-exp.js'));
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const D = rd('districts/patch_row_power.json'), I = rd('infra/patch_row_power.infra.json'), files = {};
[...D.buildings.map((b) => b.recipe), D.home_template.recipe].forEach((p) => { files[p] = rd(p); });
let n = 0, bad = 0; const ok = (name, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + name + (!c && x !== undefined ? '  -> ' + JSON.stringify(x).slice(0, 300) : '')); };
const W = DI.make(DI.withHomes(D, 4), files, { seed: D.seed, infra: I }).W, rows = [];
const bak = () => W.S.b.find((b) => b.kind === 'shop');
function leg(name, seconds, act) {
  if (act) act();
  const a = DI.snap(W); DI.run(W, seconds); const b = DI.snap(W), r = DI.between(W, a, b), ia = W.S.env.infra, ed = (id) => ia.edges.find((e) => e.id === id);
  const row = { step: name, homes: W.S.b.filter((x) => x.kind === 'home').length, gen: ia.source_kw, hc: ed('homes_branch').want.toFixed(1) + '/' + ed('homes_branch').cap.toFixed(1) + ' ' + ed('homes_branch').state, mf: ed('main_feeder').want.toFixed(1) + '/' + ed('main_feeder').cap.toFixed(1) + ' ' + ed('main_feeder').state,
    homesPc: Math.round(ia.factor.home_1 * 100) + '%', bakPc: Math.round(ia.factor.bakery * 100) + '%', net: r.d.net_pm, bakNet: r.b.bakery.net_pm, sold: r.b.bakery.sold_pm, shelf: Math.round(bak().sim.stock.loaf), wages: r.b.bakery.wages / r.minutes };
  rows.push(row); return row;
}
DI.run(W, 1800);
const s1 = leg('1 steady, 4 homes', 700);
const s2 = leg('2 homes arrive: 8 homes', 700, () => { for (let i = 0; i < 4; i++) DI.addHome(W); DI.run(W, 1800); });
const s3 = leg('3 two more homes: 10', 700, () => { DI.addHome(W); DI.addHome(W); DI.run(W, 1200); });
const s4 = leg('4 generator 60%, 140 s only', 140, () => { DI.setScale(W, 0.6, 'short cut'); }); DI.setScale(W, 1, 'restored'); DI.run(W, 1800);
const s5 = leg('5 generator 60%, 1400 s', 1400, () => { DI.setScale(W, 0.6, 'long cut'); }); DI.setScale(W, 1, 'restored'); DI.run(W, 1800);
const s6 = leg('6 homes cable widened to 4.0', 700, () => { DI.setCable(W, 'homes_branch', 4.0); DI.run(W, 1200); });
const s7 = leg('7 main feeder cut (after 700 s)', 700, () => { DI.cutCable(W, 'main_feeder', true); DI.run(W, 700); });
DI.cutCable(W, 'main_feeder', false); DI.run(W, 1800);
const s8 = leg('8 reconnected, 700 s', 700);
console.log('\nstep                             homes  gen kW  homes cable           main feeder           homes%  bakery%  district net/min  bakery net/min  loaves sold/min  shelf  bakery wages/min');
rows.forEach((r) => console.log(r.step.padEnd(34) + String(r.homes).padEnd(7) + String(r.gen).padEnd(8) + r.hc.padEnd(22) + r.mf.padEnd(22) + r.homesPc.padEnd(8) + r.bakPc.padEnd(9) + r.net.toFixed(2).padEnd(18) + r.bakNet.toFixed(2).padEnd(16) + r.sold.toFixed(2).padEnd(17) + String(r.shelf).padEnd(7) + r.wages.toFixed(2)));
console.log('');
ok('steady 4 homes: every cable green, everyone at 100 percent, the district nets about 40 a minute', s1.homesPc === '100%' && s1.bakPc === '100%' && /green/.test(s1.hc) && s1.net > 30, s1);
ok('8 homes: only the homes street dims (94%), the bakery stays at 100%, the homes cable is red and the main feeder green', s2.homesPc === '94%' && s2.bakPc === '100%' && /red/.test(s2.hc) && /green/.test(s2.mf), s2);
ok('10 homes: the homes cable is still red and the homes get 75%; the bakery is still at 100%', s3.homesPc === '75%' && s3.bakPc === '100%' && /red/.test(s3.hc), s3);
ok('district net per minute rises with homes (more customers): 4 homes < 8 homes < 10 homes', s1.net < s2.net && s2.net < s3.net, [s1.net, s2.net, s3.net]);
ok('a short generator cut (140 s, 56 percent): the bakery sells as much as before (the shelf covers it) and the net does NOT fall by much', s4.sold >= s3.sold - 0.3 && s4.shelf < s3.shelf, [s4.sold, s3.sold, s4.shelf, s3.shelf]);
ok('a long generator cut (1400 s): the bakery sells LESS than before (the shelf runs out) and its net falls well below the clean window (the gain reverses)', s5.sold < s3.sold - 3 && s5.bakNet < s3.bakNet - 10, [s5.sold, s3.sold, s5.bakNet, s3.bakNet]);
ok('widening the homes cable at 10 homes makes the GENERATOR the limit (4.0 + 10.5 = 14.5 wanted, 13.5 given): everyone gets 93 percent, the bakery too', s6.homesPc === '93%' && s6.bakPc === '93%', s6);
ok('and that COSTS money (rule A shares the shortage with the shops, the homes earn nothing): net falls by more than 2 a minute compared with the dim homes street', s6.net < s3.net - 2, [s6.net, s3.net]);
ok('main feeder cut: the bakery is dark, sells nothing and its net is exactly minus its wages (15 a minute): a dark SHOP street is NOT cheap, the wages go on', s7.bakPc === '0%' && s7.sold === 0 && Math.abs(s7.bakNet + 15) < 0.01 && Math.abs(s7.wages - 15) < 0.01, s7);
ok('reconnected: the bakery is back to its widened-cable figures within 1.5 a minute', Math.abs(s8.bakNet - s6.bakNet) < 1.5 && s8.bakPc === '93%', [s8.bakNet, s6.bakNet, s8.bakPc]);
const cfg = IX.configOf(W), h0 = DI.hash(W), t0 = W.S.t, c = IX.compare(D, files, I, cfg, { type: 'generator', kw: 3 });
ok('the read-only comparison at the end changes nothing in the live world (hash, time, log)', DI.hash(W) === h0 && W.S.t === t0 && c.ok, [h0, DI.hash(W)]);
ok('every infrastructure change in the story wrote a log line with numbers (changes in the log: ' + W.S.log.filter((l) => l.type === 'change').length + ')', W.S.log.filter((l) => l.type === 'change' && /kW/.test(l.text)).length >= 9);
console.log('\n' + (bad ? bad + ' FAILED of ' + n : n + ' of ' + n + ' checks passed')); process.exit(bad ? 1 : 0);
