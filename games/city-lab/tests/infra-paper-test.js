/* C06a: the paper tests P1, P4 and P5 (shared/tools/c06-paper-tests.mjs, saved output shared/cloud/evidence/C06_paper_tests.txt) re-run through the REAL district code:
   a tiny district (one home that wants 2.8 kW, the real bakery recipe that wants 6.0 kW, one or two generator sheds), a real city_infra tree, the real allocation, the real machines.
   The same numbers must come out. Run from games/city-lab: node tests/infra-paper-test.js */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const DI = require(path.join(ROOT, 'district.js')), IV = require(path.join(ROOT, 'infra-validate.js'));
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')), clone = (o) => JSON.parse(JSON.stringify(o));
let n = 0, bad = 0; const ok = (name, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + name + (!c && x !== undefined ? '  -> ' + JSON.stringify(x).slice(0, 300) : '')); };
const near = (a, b) => Math.abs(a - b) < 1e-6;
const POW = rd('districts/patch_row_power.json'), files = {}; [...POW.buildings.map((b) => b.recipe), POW.home_template.recipe].forEach((p) => { files[p] = rd(p); });

function tiny(twoGenerators) {
  const D = clone(POW); D.id = 'paper'; D.grid = { cols: 5, rows: 3 }; D.roads = [0, 1, 2, 3, 4].map((c) => ({ cell: [c, 1], open: true })); D.depot = [0, 1]; D.home_slots = [[1, 0]];
  D.power = { supply_kw: 99, home_base_kw: 2.8, per_resident_kw: 0 };   /* one home draws exactly 2.8 kW; the supply number is ignored once a network exists */
  D.buildings = [{ id: 'bakery', recipe: 'recipes/bakery.json', cell: [3, 0], kind: 'shop', sidecars: [], employs: true, hire_priority: 1 }, { id: 'home_1', recipe: D.home_template.recipe, cell: [1, 0], kind: 'home', sidecars: [], residents: { capacity: 4, now: 4 } },
    { id: 'gen_1', recipe: 'recipes/generator_shed.json', cell: [2, 0], kind: 'shed', sidecars: [] }];
  if (twoGenerators) D.buildings.push({ id: 'gen_2', recipe: 'recipes/generator_shed.json', cell: [4, 0], kind: 'shed', sidecars: [] });
  D.events = []; return D;
}
function infra(kws, homesCap) {
  const sources = kws.map((k, i) => ({ id: 's' + i, building: 'gen_' + (i + 1), kw: k, build_cost: 10, upkeep_per_min: 0.1 }));
  return { schema: 'city_infra', version: 0, id: 'paper_net', name: 'Paper', district: { id: 'paper', version: 0, sha256: '0'.repeat(64) }, root: 'root', junctions: [{ id: 'root', name: 'root' }], sources,
    cables: [{ id: 'homes_cable', name: 'Homes cable', from: 'root', to: 'home_1', capacity_kw: homesCap, build_cost: 1, upkeep_per_min: 0 }, { id: 'bakery_cable', name: 'Bakery cable', from: 'root', to: 'bakery', capacity_kw: 6, build_cost: 1, upkeep_per_min: 0 }] };
}
function world(kws, homesCap) { const D = tiny(kws.length > 1), I = infra(kws, homesCap), v = IV.validate(I, D, {}); if (!v.ok) throw new Error(v.errors.join('; ')); const m = DI.make(D, files, { infra: I }); if (!m.ok) throw new Error(m.errors.join('; ')); return m.W; }
const out = (W) => { const ia = W.S.env.infra; return { homes: ia.delivered.home_1, bakery: ia.delivered.bakery, total: ia.delivered.home_1 + ia.delivered.bakery, hf: ia.factor.home_1, bf: ia.factor.bakery }; };

ok('the reference calculator (shared/tools/c06-paper-tests.mjs) still matches the hand numbers', (() => { try { cp.execSync('node shared/tools/c06-paper-tests.mjs', { cwd: ROOT, stdio: 'pipe' }); return true; } catch (e) { return false; } })());
{
  const W = world([9], 2.0), o = out(W);
  ok('the tiny district has the paper demands: home 2.8 kW, bakery 6.0 kW', near(W.S.env.infra.demand.home_1, 2.8) && near(W.S.env.infra.demand.bakery, 6.0), W.S.env.infra.demand);
  ok('P1 (real code): 9 kW, homes cable 2.0: homes get 2.0 of 2.8 (71.43 percent), bakery 6.0, total 8.0', near(o.homes, 2.0) && near(o.hf, 0.714286) && near(o.bakery, 6.0) && near(o.total, 8.0), o);
  DI.run(W, 60);
  ok('P1 through the real machine: the bakery machine is told 6.0 kW of 6.0 (no brownout there)', near(W.S.b[0].sim.supply_kw, 6) && W.S.b[0].sim.power.state === 'ok');
  const r = DI.setCable(W, 'homes_cable', 4.0), o2 = out(W);
  ok('P1 after (real code): the homes cable raised to 4.0: homes get 2.8 (100 percent), bakery 6.0, total 8.8', r.ok && near(o2.homes, 2.8) && near(o2.bakery, 6.0) && near(o2.total, 8.8), o2);
}
{
  const W = world([6], 2.0), o = out(W);
  ok('P4 (real code): a SHORT source of 6 kW for capped demand 8.0: homes 1.5 (53.6 percent of 2.8), bakery 4.5 (75 percent)', near(o.homes, 1.5) && near(o.bakery, 4.5) && near(o.hf, 0.535714) && near(o.bf, 0.75), o);
  DI.run(W, 60);
  ok('P4 through the real machine: the bakery machine runs at 75 percent (4.5 kW of 6.0, state low)', near(W.S.b[0].sim.supply_kw, 4.5) && W.S.b[0].sim.power.state === 'low' && near(W.S.b[0].sim.power.factor, 0.75), [W.S.b[0].sim.supply_kw]);
}
{
  const W = world([6, 3], 2.0), o = out(W), W1 = world([9], 2.0), o1 = out(W1);
  ok('P5 (real code): a second 3 kW generator shed at the root (6 + 3 = 9) gives exactly P1: homes 2.0, bakery 6.0', near(o.homes, 2.0) && near(o.bakery, 6.0) && W.S.env.infra.source_kw === 9, o);
  ok('P5: identical to the single 9 kW source in every number', JSON.stringify(o) === JSON.stringify(o1));
}
console.log('\n' + (bad ? bad + ' FAILED of ' + n : n + ' of ' + n + ' checks passed')); process.exit(bad ? 1 : 0);
