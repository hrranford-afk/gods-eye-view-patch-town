#!/usr/bin/env node
/* C06 REFERENCE CALCULATOR for the paper tests (design aid, NOT the feature): the allocation rule the design note proposes, in about 30 lines, so the hand numbers can be checked
   by code and later compared with the real implementation. Tree only. Rule A, "proportional to capped demand": each node offers its parent min(cable capacity, own demand + what its
   children can take); when a node cannot supply everything below it, it scales ALL branches below it by the same factor. Sources sit at the root and add up.
   Exit 0 only if every expected number matches. Read-only. */
const near = (a, b) => Math.abs(a - b) < 1e-6;
function capped(n) { n.kids = n.kids || []; n.own = n.demand || 0; n.kids.forEach(capped); const want = n.own + n.kids.reduce((s, k) => s + k.capped, 0); n.capped = n.cap == null ? want : Math.min(n.cap, want); return n.capped; }
function give(n, avail, out) {   /* avail is what the cable above lets through; share it out below */
  const take = Math.min(avail, n.capped), want = n.own + n.kids.reduce((s, k) => s + k.capped, 0), f = want > 0 ? take / want : 0;
  if (n.own) out[n.id] = n.own * f; n.kids.forEach((k) => give(k, k.capped * f, out)); return out;
}
function allocate(root, sources) { capped(root); return give(root, sources, {}); }
let bad = 0; const ok = (name, cond, got) => { if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  got ' + JSON.stringify(got))); };
const tree = (homesCap, bakeryDemand) => ({ id: 'root', kids: [{ id: 'homes', demand: 2.8, cap: homesCap }, { id: 'bakery', demand: bakeryDemand, cap: 6.0 }] });
let o = allocate(tree(2.0, 6.0), 9);
ok('P1 power, local bottleneck: homes get 2.0 (71.43%), bakery 6.0, total 8.0', near(o.homes, 2.0) && near(o.bakery, 6.0) && near(o.homes / 2.8, 0.714286) && near(o.homes + o.bakery, 8.0), o);
o = allocate(tree(4.0, 6.0), 9);
ok('P1 after the homes cable is 4.0: homes get 2.8 (100%), bakery 6.0, total 8.8', near(o.homes, 2.8) && near(o.bakery, 6.0) && near(o.homes + o.bakery, 8.8), o);
o = allocate(tree(2.0, 6.0), 6);
ok('P4 (the missing rule): a SHORT source. 6 kW for capped demand 8.0 scales both branches by 0.75: homes 1.5 (53.6% of 2.8), bakery 4.5 (75%)', near(o.homes, 1.5) && near(o.bakery, 4.5) && near(o.homes / 2.8, 0.535714) && near(o.bakery / 6, 0.75), o);
o = allocate(tree(2.0, 6.0), 6 + 3);
ok('P5 a second 3 kW generator at the root (6 + 3 = 9) gives exactly P1', near(o.homes, 2.0) && near(o.bakery, 6.0), o);
const water = (pipe) => ({ id: 'root', kids: [{ id: 'homes', demand: 2.0 }, { id: 'bakery', demand: 1.5, cap: pipe }] });
o = allocate(water(1.0), 4.0);
ok('P2 water, partial pipe: homes 2.0, bakery 1.0 (shortage 0.5), total 3.0', near(o.homes, 2.0) && near(o.bakery, 1.0) && near(1.5 - o.bakery, 0.5) && near(o.homes + o.bakery, 3.0), o);
o = allocate(water(2.0), 4.0);
ok('P2 with the bakery pipe raised to 2.0: bakery 1.5, shortage 0, total 3.5', near(o.bakery, 1.5) && near(o.homes + o.bakery, 3.5), o);
const w = (cells, trips, cap, decay) => Math.pow(decay, cells * Math.max(1, trips / cap));
ok('P3 roads: 4 cells, 6 trips against capacity 4, decay 0.8: effective distance 6, weight 0.262144 against 0.4096 (36% lower)', near(w(4, 6, 4, 0.8), 0.262144) && near(w(4, 4, 4, 0.8), 0.4096) && near(1 - w(4, 6, 4, 0.8) / w(4, 4, 4, 0.8), 0.36), [w(4, 6, 4, 0.8)]);
ok('P3 with capacity raised to 6 the weight returns to 0.4096', near(w(4, 6, 6, 0.8), 0.4096));
console.log('\n' + (bad ? bad + ' FAILED' : 'all paper tests match the hand numbers')); process.exit(bad ? 1 : 0);
