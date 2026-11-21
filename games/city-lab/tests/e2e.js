/* City Lab end-to-end story, through the real page. Run: NODE_PATH=$(npm root -g) node tests/e2e.js
   A baseline minute, a delivery, a blast that hits the oven and the roof, the workers repair, production recovers. Prints a table of numbers. */
'use strict';
const L = require('./lib.js');
let n = 0, bad = 0;
const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (!cond && extra ? '  -> ' + extra : '')); };
(async () => {
  const { srv, base } = await L.serve(); const browser = await L.launch(); const page = await L.newPage(browser, { width: 1180, height: 820 });
  await L.open(page, base, '?auto=0');
  const ev = (f, a) => page.evaluate(f, a);
  const snap = (label) => ev((label) => {
    const S = CityApp.state(), m = CityApp.summary();
    return { label, t: Math.round(S.t), batches: S.prod.batches, loaves: +S.stock.loaf.toFixed(1), flour: +S.stock.flour.toFixed(1), spoiled: +(S.spoiled.flour || 0).toFixed(2), sold: S.sales.sold, power: S.power.state, status: m.status, missing: m.missing, balance: +m.balance.toFixed(1), repairs: S.costs.repairs, net: +m.net_per_min.toFixed(1) };
  }, label);
  const rows = [];
  await ev(() => CityApp.advance(60)); rows.push(await snap('1. baseline, first minute'));
  const m1 = rows[0];
  ok('baseline minute: 2 batches (24 loaves) finished, loaves are being sold, power ok', m1.batches === 2 && m1.sold >= 8 && m1.power === 'ok' && m1.missing === 0, JSON.stringify(m1));
  const f0 = await ev(() => CityApp.state().stock.flour);
  await ev(() => CityApp.advance(12)); rows.push(await snap('2. the 70 s cart has come (+12 flour)'));
  const log2 = await ev(() => CityApp.state().log.filter((e) => e.type === 'delivery').map((e) => e.text));
  ok('a cart delivered flour, water and fuel at 70 s (log lines: ' + log2.length + ')', log2.length >= 3 && log2.some((t) => /flour/.test(t)), JSON.stringify(log2));
  await ev(() => CityApp.advance(8)); const bBlast = await ev(() => CityApp.state().prod.batches);
  /* the blast: one at the oven, one on the roof */
  await ev(() => { CityApp.blastAt([-0.55, 0.4, -0.45], 0.25); CityApp.blastAt([-0.35, 1.4, -0.3], 0.28); });
  await ev(() => CityApp.advance(1)); rows.push(await snap('3. blast: oven and roof hit'));
  const d = await ev(() => { const s = CityApp.state(); return { oven: s.present.oven, roof: CityApp.tagIds('roof').filter((i) => s.present[i]).length, chim: s.present.chimney }; });
  ok('the blast destroyed the oven and part of the roof (oven ' + d.oven + ', tiles left ' + d.roof + ' of 12, chimney ' + d.chim + ')', d.oven === false && d.roof < 12 && d.roof > 0);
  const dm = await ev(() => CityApp.summary().missing); ok('the damage is partial, not the whole building (' + dm + ' of 57 parts missing)', dm >= 3 && dm <= 25, dm);
  await ev(() => CityApp.advance(45)); rows.push(await snap('4. 45 s later, nobody repairing: production dead, flour spoiling'));
  const r4 = rows[3], r3 = rows[2];
  ok('production stopped (no new batch after the blast), and flour spoiled', r4.batches === r3.batches && r3.batches === bBlast && r4.spoiled > 0.2 && /oven/.test(r4.status), JSON.stringify(r4));
  const sold4 = r4.sold;
  await ev(() => CityApp.repairAll()); await ev(() => CityApp.advance(5));
  const mid = await ev(() => CityApp.summary().workers.map((w) => w.text)); ok('workers walk out and repair (the list says: ' + mid.join('; ') + ')', mid.some((t) => /repair|walking/.test(t)));
  await ev(() => CityApp.advance(115)); rows.push(await snap('5. 2 minutes of repair'));
  const r5 = rows[4];
  ok('everything is repaired and the ovens are back', r5.missing === 0 && r5.repairs > 0, JSON.stringify(r5));
  await ev(() => CityApp.advance(90)); rows.push(await snap('6. 90 s after the repair: production recovers'));
  const r6 = rows[5];
  ok('production recovered: batches rise again, status working, income per minute back near 80', r6.batches >= r5.batches + 2 && /working|storage/.test(r6.status), JSON.stringify(r6));
  ok('the balance fell during the outage (repairs, wages, no income) and recovered', r5.balance < rows[0].balance + 40 && r6.balance > r5.balance, rows.map((r) => r.balance).join(','));
  console.log('\n' + ['step', 't', 'batches', 'loaves', 'flour', 'spoiled', 'sold', 'power', 'missing', 'repairs$', 'balance', 'net/min', 'status'].map((h, i) => h.padEnd(i ? 9 : 62)).join(''));
  rows.forEach((r) => console.log(r.label.padEnd(62) + [r.t, r.batches, r.loaves, r.flour, r.spoiled, r.sold, r.power, r.missing, r.repairs, r.balance, r.net, r.status].map((v) => String(v).padEnd(9)).join('')));
  ok('no page errors', page.errs.length === 0, page.errs.join('|'));
  console.log('\n' + (n - bad) + ' of ' + n + ' checks passed' + (bad ? ', ' + bad + ' FAILED' : ''));
  await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
