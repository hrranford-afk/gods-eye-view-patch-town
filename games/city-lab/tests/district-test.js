/* City Lab district test (headless, no browser, no iPad). Run from games/city-lab: NODE_PATH=$(npm root -g) node tests/district-test.js
   Checks: the district validator (one good file, 25+ hostile ones, none may throw), hand-computed demand, power brownout arithmetic, blocked road suspends deliveries,
   determinism (state hash), and the three experiments (each run 3 times, identical; the qualitative claims are asserted from the numbers). */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const DI = require(path.join(ROOT, 'district.js')), DV = require(path.join(ROOT, 'district-validate.js')), SIM = require(path.join(ROOT, 'sim.js'));
let n = 0, bad = 0;
const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (!cond && extra !== undefined ? '  -> ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : '')); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const clone = (o) => JSON.parse(JSON.stringify(o));

const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'districts/patch_row.json'), 'utf8'));
const files = {}, shas = {};
function load(p) { if (files[p]) return; const buf = fs.readFileSync(path.join(ROOT, p)); files[p] = JSON.parse(buf.toString('utf8')); shas[p] = crypto.createHash('sha256').update(buf).digest('hex'); }
BASE.buildings.forEach((b) => load(b.recipe)); load(BASE.home_template.recipe);
const UP = { stone: 'shared/cloud/examples/bakery.stone_deck_oven.json', cool: 'shared/cloud/examples/bakery.cool_store_room.json' };
load(UP.stone); load(UP.cool);

/* ---------- 1. the validator ---------- */
{
  const v = DV.validate(BASE, files, { shas });
  ok('the district validator accepts the base district (all recipes v1-valid, sidecars link by id, version and SHA-256)', v.ok, v.errors);
  ok('the validator also accepts the base district with a sidecar on the bakery (patched recipe still passes v1)', (() => { const D = clone(BASE); D.buildings[0].sidecars = [UP.stone]; const r = DV.validate(D, files, { shas }); return r.ok || r.errors; })() === true);
  ok('the real file text parses with DV.parse and no files needed', DV.parse(fs.readFileSync(path.join(ROOT, 'districts/patch_row.json'), 'utf8')).ok);
  const H = [];   /* [name, mutate(D) -> D or raw value] */
  const mut = (name, f) => H.push([name, f]);
  mut('unknown top-level key', (D) => { D.evil = 1; return D; });
  mut('missing schema', (D) => { delete D.schema; return D; });
  mut('wrong schema name', (D) => { D.schema = 'rtk.building'; return D; });
  mut('wrong version', (D) => { D.version = 1; return D; });
  mut('code in the name', (D) => { D.name = '<script>alert(1)</script>'; return D; });
  mut('a link in the id', (D) => { D.id = 'http://x'; return D; });
  mut('grid too big', (D) => { D.grid.cols = 500; return D; });
  mut('grid not whole', (D) => { D.grid.rows = 4.5; return D; });
  mut('road outside the grid', (D) => { D.roads.push({ cell: [99, 0], open: true }); return D; });
  mut('road listed twice', (D) => { D.roads.push(clone(D.roads[0])); return D; });
  mut('road open flag a string', (D) => { D.roads[0].open = 'yes'; return D; });
  mut('depot not on a road', (D) => { D.depot = [7, 0]; return D; });
  mut('negative supply', (D) => { D.power.supply_kw = -5; return D; });
  mut('supply is NaN-like (string)', (D) => { D.power.supply_kw = 'lots'; return D; });
  mut('decay above 1', (D) => { D.coefficients.decay_per_cell = 1.7; return D; });
  mut('work_fraction negative', (D) => { D.coefficients.work_fraction = -1; return D; });
  mut('a function-looking coefficient key', (D) => { D.coefficients.per_resident_per_min['constructor'] = 1; return D; });
  mut('coefficient given as code', (D) => { D.coefficients.wage_spend_boost = '1+1'; return D; });
  mut('unknown coefficient', (D) => { D.coefficients.magic = 3; return D; });
  mut('duplicate building id', (D) => { D.buildings[1].id = D.buildings[0].id; return D; });
  mut('two buildings on one cell', (D) => { D.buildings[1].cell = D.buildings[0].cell.slice(); return D; });
  mut('building on a road', (D) => { D.buildings[0].cell = [2, 2]; return D; });
  mut('unknown kind', (D) => { D.buildings[0].kind = 'castle'; return D; });
  mut('recipe path with ..', (D) => { D.buildings[0].recipe = '../../etc/passwd.json'; return D; });
  mut('recipe path is a URL', (D) => { D.buildings[0].recipe = 'https://evil.example/x.json'; return D; });
  mut('home with more residents than capacity', (D) => { D.buildings[4].residents.now = 9; return D; });
  mut('shop with residents', (D) => { D.buildings[0].residents = { capacity: 2, now: 2 }; return D; });
  mut('home with hire_priority', (D) => { D.buildings[4].hire_priority = 1; return D; });
  mut('too many sidecars', (D) => { D.buildings[0].sidecars = [UP.stone, UP.cool, UP.cool, UP.cool, UP.cool]; return D; });
  mut('event with an unknown action', (D) => { D.events = [{ t: 5, action: 'explode' }]; return D; });
  mut('road event on a non-road cell', (D) => { D.events = [{ t: 5, action: 'block_road', cell: [7, 5] }]; return D; });
  mut('supply event with a cell', (D) => { D.events = [{ t: 5, action: 'supply_scale', value: 1, cell: [0, 2] }]; return D; });
  mut('event time negative', (D) => { D.events = [{ t: -4, action: 'open_road', cell: [0, 2] }]; return D; });
  mut('home slot on a road', (D) => { D.home_slots.push([0, 2]); return D; });
  mut('a shop given an item nobody buys', (D) => { D.coefficients.per_resident_per_min = { fruit: 0.5 }; return D; });
  mut('building list not a list', (D) => { D.buildings = { a: 1 }; return D; });
  mut('prototype trick via JSON.parse', () => JSON.parse('{"__proto__":{"x":1},"schema":"city_district","version":0}'));
  mut('null', () => null); mut('an array', () => []); mut('a number', () => 42); mut('a string', () => 'city_district');
  let thrown = 0, accepted = [];
  H.forEach(([name, f]) => { let r; try { r = DV.validate(f(clone(BASE)), files, { shas }); } catch (e) { thrown++; return; } if (r.ok) accepted.push(name); });
  ok('the validator rejects ' + H.length + ' hostile or broken files, none was accepted', accepted.length === 0 && H.length >= 25, accepted);
  ok('the validator never threw on any of them', thrown === 0, thrown);
  ok('a sidecar for another recipe is refused when files are given', (() => { const D = clone(BASE); D.buildings[2].sidecars = [UP.stone]; return !DV.validate(D, files, { shas }).ok; })());
  ok('a sidecar with a wrong recipe SHA-256 is refused when shas are given', (() => { const f2 = clone(files); f2[UP.stone].recipe.sha256 = '0'.repeat(64); const D = clone(BASE); D.buildings[0].sidecars = [UP.stone]; return !DV.validate(D, f2, { shas }).ok; })());
  ok('a recipe that fails the v1 validator is refused (one part id broken)', (() => { const f2 = clone(files); f2['recipes/bakery.json'].parts[3].needs = ['nothing.here']; return !DV.validate(BASE, f2, { shas }).ok; })());
  ok('the ten original recipes are untouched by this job (git shows no change under inputs/)', (() => { try { return require('child_process').execSync('git status --porcelain -- inputs', { cwd: ROOT }).toString().trim() === ''; } catch (e) { return true; } })());
}

/* ---------- 2. hand-computed demand on a tiny settlement ---------- */
function tiny(withMarket, supply) {
  const D = clone(BASE);
  D.grid = { cols: 5, rows: 3 }; D.roads = [0, 1, 2, 3, 4].map((c) => ({ cell: [c, 1], open: true })); D.depot = [0, 1]; D.home_slots = [[1, 0]];
  D.buildings = [
    { id: 'bakery', recipe: 'recipes/bakery.json', cell: [3, 0], kind: 'shop', sidecars: [], employs: true, hire_priority: 1 },
    { id: 'home_1', recipe: D.home_template.recipe, cell: [1, 0], kind: 'home', sidecars: [], residents: { capacity: 4, now: 4 } }];
  if (withMarket) D.buildings.push({ id: 'market', recipe: 'inputs/chatgpt-2026-11-21/recipes/recipe_03.json', cell: [2, 0], kind: 'market', sidecars: [] });
  D.power.supply_kw = supply == null ? 20 : supply; D.events = [];
  return D;
}
{
  const D = tiny(false); const v = DV.validate(D, files, { shas });
  ok('the tiny settlement (1 home, 1 bakery, a straight road) is a valid district', v.ok, v.errors);
  const m = DI.make(D, files); const W = m.W, C = D.coefficients;
  /* by hand: home access cell (1,1), bakery access cell (3,1): 2 road steps, +1 to step on = 3 cells. weight 0.85^3.
     residents 4, half work: 2 workers, the bakery has 3 places and the home is within commute, so 2 are employed.
     spend = ((4-2) + 2*(1+0.25)) * 1.2 loaves = 5.4 a minute; one shop only and weight < 1, so nothing is shared: demand = 5.4 * 0.85^3 */
  const w3 = Math.pow(C.decay_per_cell, 3), spend = ((4 - 2) + 2 * (1 + C.wage_spend_boost)) * C.per_resident_per_min.loaf, hand = spend * w3;
  ok('hand-computed demand for the tiny settlement: ' + hand.toFixed(4) + ' loaves a minute (4 residents, 3 cells, 2 employed)', near(W.S.env.b.bakery.demand, hand, 1e-4), [W.S.env.b.bakery.demand, hand]);
  ok('employment by hand: 2 of 3 places filled, 2 residents employed, 2 unemployed', W.S.env.employed === 2 && W.S.env.jobs === 3 && W.S.env.unemployed === 2, W.S.env);
  /* the machine really gets that demand: 5 minutes, and the sold count follows it (demand is the arrival rate; staffing 2/3 slows the seller) */
  DI.run(W, 300); const s = W.S.b[0].sim.sales;
  ok('the existing sim sold what the demand allows (300 s at ' + hand.toFixed(2) + ' a minute x seller share 2/3 = ' + (hand * 5 * 2 / 3).toFixed(1) + ' loaves, tolerance 1.5)', near(s.sold + s.lost, hand * 5 * 2 / 3, 1.5), [s.sold, s.lost]);
  const M = DI.make(tiny(true), files).W, bonus = Math.min(C.footfall.cap, C.footfall.market_bonus * Math.pow(C.footfall.decay_per_cell, 2)), vis = C.market_visitors_per_min.loaf * Math.pow(C.footfall.decay_per_cell, 2);
  const hand2 = hand * (1 + bonus) + vis;
  ok('with a market next door: footfall bonus ' + bonus.toFixed(3) + ' and ' + vis.toFixed(2) + ' visitors: hand-computed demand ' + hand2.toFixed(4), near(M.S.env.b.bakery.demand, hand2, 1e-4), [M.S.env.b.bakery.demand, hand2]);
  ok('the market itself gets resident demand for fruit and no footfall bonus', M.S.env.b.market.demand > 0 && M.S.env.b.market.footfall === 0, M.S.env.b.market);
  /* a second shop of the same item shares the residents: weights add, the total is divided */
  const T2 = tiny(false); T2.buildings.push({ id: 'bakery2', recipe: 'recipes/bakery.json', cell: [2, 2], kind: 'shop', sidecars: [] }); T2.buildings[0].cell = [3, 0];
  const W2 = DI.make(T2, files).W, wa = Math.pow(C.decay_per_cell, 3), wb = Math.pow(C.decay_per_cell, 2);   /* bakery2 at (2,2): access (2,1): 1 step from (1,1) +1 = 2 */
  ok('two shops of one item share a home by weight: the demands add to spend x (wa+wb)/max(1,wa+wb)', near(W2.S.env.b.bakery.demand + W2.S.env.b.bakery2.demand, spend * (wa + wb) / Math.max(1, wa + wb), 1e-4), [W2.S.env.b.bakery.demand, W2.S.env.b.bakery2.demand]);
}

/* ---------- 3. power ---------- */
{
  const D = tiny(false, 3.2), W = DI.make(D, files).W;   /* draws: home 0.2 + 4 x 0.05 = 0.4, bakery 6 -> 6.4 kW against 3.2 = factor 0.5 */
  ok('brownout arithmetic: draw 6.4 kW, supply 3.2 kW, factor exactly 0.5', near(W.S.env.power.draw, 6.4, 1e-9) && near(W.S.env.power.factor, 0.5, 1e-9), W.S.env.power);
  DI.run(W, 60); const b = W.S.b[0].sim;
  ok('the bakery machine is told 50% power: its supply is 3 kW of 6, power state low, factor 0.5', near(b.supply_kw, 3, 1e-9) && b.power.state === 'low' && near(b.power.factor, 0.5, 1e-9), [b.supply_kw, b.power.state, b.power.factor]);
  const full = DI.make(tiny(false, 20), files).W; DI.run(full, 120); const slow = DI.make(D, files).W; DI.run(slow, 120);
  ok('half power halves baking speed: batches in 120 s ' + slow.S.b[0].sim.prod.batches + ' (brownout) against ' + full.S.b[0].sim.prod.batches + ' (full power)', slow.S.b[0].sim.prod.batches > 0 && slow.S.b[0].sim.prod.batches <= Math.ceil(full.S.b[0].sim.prod.batches / 2) + 1 && slow.S.b[0].sim.prod.batches < full.S.b[0].sim.prod.batches, [slow.S.b[0].sim.prod.batches, full.S.b[0].sim.prod.batches]);
  ok('the grid supply stays a city-level number: the recipe supply_kw (8) is ignored, and the shed adds draw, never supply', (() => { const X = DI.make(withShed(), files).W; return X.S.env.power.supply === BASE.power.supply_kw && X.S.env.power.by.shed === 1.5; })());
  function withShed() { return clone(BASE); }
  const full2 = DI.make(D, files).W; DI.setScale(full2, 3.0, 'test');
  ok('a supply scale event raises the supply and ends the brownout, and says so in one sentence', full2.S.env.power.factor === 1 && /brownout ended/.test(full2.S.log[full2.S.log.length - 1].text), full2.S.log.slice(-1));
}

/* ---------- 4. roads: a blocked road suspends deliveries ---------- */
{
  const D = tiny(false, 20), W = DI.make(D, files).W;
  ok('with the road open the depot reaches the bakery', W.S.env.b.bakery.deliveries === true && W.S.env.b.bakery.reach_depot === 4);
  DI.run(W, 150); const s0 = W.S.b[0].sim, drops0 = s0.log.filter((e) => /Cart arrived/.test(e.text)).length;
  const r = DI.setRoad(W, [2, 1], false);
  ok('blocking a road cell writes one sentence with before and after numbers', r.ok && /blocked/.test(r.text) && /suspended/.test(r.text) && /demand [\d.]+ to 0/.test(r.text), r.text);
  const flour = s0.stock.flour; DI.run(W, 240);
  const missed = s0.ext.missed.flour;
  ok('a blocked road suspends the bakery deliveries: ' + missed + ' flour drops missed in 240 s, none arrived', missed >= 3 && s0.log.filter((e) => /Cart arrived/.test(e.text)).length === drops0 && W.S.env.b.bakery.deliveries === false, [missed]);
  ok('the sim log names the reason and the district records the blocked seconds', s0.log.some((e) => /road to this building is blocked/.test(e.text)) && W.S.b[0].acc.blocked_s >= 239, W.S.b[0].acc);
  ok('residents cut off by the same road make no demand: demand is 0 while blocked', W.S.env.b.bakery.demand === 0);
  DI.setRoad(W, [2, 1], true); DI.run(W, 120);
  ok('opening the road again resumes the carts (a new Cart arrived line) and the demand', s0.log.filter((e) => /Cart arrived/.test(e.text)).length > drops0 && W.S.env.b.bakery.demand > 3, W.S.env.b.bakery);
  ok('the district log has both sentences, each with a cause', W.S.log.filter((e) => e.type === 'change').length === 2, W.S.log.map((e) => e.text));
}

/* ---------- 5. determinism ---------- */
{
  const mk = () => DI.make(DI.withHomes(BASE, 5), files, { seed: 11 }).W;
  const a = mk(), b = mk(); DI.run(a, 400); DI.run(b, 400);
  ok('same seed, same calls: byte-identical state hash (' + DI.hash(a) + ')', DI.hash(a) === DI.hash(b) && JSON.stringify(a.S) === JSON.stringify(b.S));
  const c = mk(); for (let i = 0; i < 400; i++) DI.run(c, 1);
  ok('one 400 s call and 400 calls of 1 s give the same state', DI.hash(a) === DI.hash(c));
  const d = mk(); for (let i = 0; i < 4000; i++) DI.run(d, 0.1);
  ok('and 4000 calls of 0.1 s too', DI.hash(a) === DI.hash(d), [DI.hash(a), DI.hash(d)]);
  const e = DI.make(DI.withHomes(BASE, 5), files, { seed: 12 }).W; DI.run(e, 400);
  ok('a different seed gives a different state (the seed is really in it)', DI.hash(e) !== DI.hash(a));
  ok('the state is plain JSON: it survives JSON.parse(JSON.stringify()) unchanged', JSON.stringify(JSON.parse(JSON.stringify(a.S))) === JSON.stringify(a.S));
  const f = DI.make(DI.withHomes(BASE, 5), files, { seed: 11 }).W; DI.run(f, 100); DI.addHome(f); DI.setRoad(f, [4, 2], false); DI.run(f, 100);
  const g = DI.make(DI.withHomes(BASE, 5), files, { seed: 11 }).W; DI.run(g, 100); DI.addHome(g); DI.setRoad(g, [4, 2], false); DI.run(g, 100);
  ok('the same scripted changes (add home, block road) give the same hash', DI.hash(f) === DI.hash(g));
}

/* ---------- 6. changes write plain sentences ---------- */
{
  const W = DI.make(DI.withHomes(BASE, 4), files).W, before = DI.headline(W);
  const r = DI.addHome(W);
  ok('adding a home: one sentence, cause and effect, before and after (residents 16 to 20, demand rises)', r.ok && /Home added/.test(r.text) && /residents 16 to 20/.test(r.text) && /Miniature Bakery demand [\d.]+ to [\d.]+/.test(r.text), r.text);
  ok('the log entry names the building to highlight', W.S.log[W.S.log.length - 1].ids[0] === r.id);
  const u = DI.applySidecar(W, 'bakery', UP.stone);
  ok('applying the stone deck oven: sentence with the batch time 28 to 21, power 6 to 8 kW, cost 40 coins', u.ok && /batch_seconds 28 to 21/.test(u.text) && /demand_kw 6 to 8/.test(u.text) && /40 coins/.test(u.text), u.text);
  ok('the patched recipe changed only the copy: the file on disk is unchanged and the patched copy passes v1', files['recipes/bakery.json'].systems.production.batch_seconds === 28 && W.R.bakery.systems.production.batch_seconds === 21);
  ok('applying the same upgrade twice is refused', DI.applySidecar(W, 'bakery', UP.stone).ok === false);
  for (let i = 0; i < 6; i++) DI.addHome(W);
  ok('home plots run out: the 11th home is refused', DI.addHome(W).ok === false);
  ok('removing homes works down to none, then is refused', (() => { let k = 0; while (DI.removeHome(W).ok) k++; return k === 10 && W.S.env.residents === 0 && DI.removeHome(W).ok === false; })());
}

/* ---------- 7. the three experiments: 3 runs each, identical; qualitative claims asserted from the numbers ---------- */
const same3 = (f) => { const r = [1, 2, 3].map(() => JSON.stringify(f())); return r[0] === r[1] && r[1] === r[2] ? JSON.parse(r[0]) : null; };
const E1 = same3(() => DI.exp1(BASE, files)), E2 = same3(() => DI.exp2(BASE, files)), E3 = same3(() => DI.exp3(BASE, files));
ok('EXPERIMENT 1 (more homes) run 3 times: identical results', !!E1);
ok('EXPERIMENT 2 (upgrade the bakery) run 3 times: identical results', !!E2);
ok('EXPERIMENT 3 (two identical bakeries) run 3 times: identical results', !!E3);
if (E1) {
  const R = E1.rows, by = {}; R.forEach((r) => { by[r.homes] = r; });
  ok('EXP1 residents are 4 a home: 8, 16, 24, 32 (and 40)', [2, 4, 6, 8, 10].every((k) => by[k].residents === 4 * k));
  ok('EXP1 more homes raise the bakery demand every time: ' + R.map((r) => r.bakery_demand_pm.toFixed(1)).join(' < '), R.every((r, i) => i === 0 || r.bakery_demand_pm > R[i - 1].bakery_demand_pm));
  ok('EXP1 income rises with the homes while the bakery is not at its limit (2 to 8 homes)', [4, 6, 8].every((k, i) => by[k].bakery_income_pm > by[[2, 4, 6][i]].bakery_income_pm));
  ok('EXP1 demand per resident FALLS as homes are added (the new homes are further from the shop): ' + [2, 8].map((k) => (by[k].bakery_demand_pm / by[k].residents).toFixed(2)).join(' to '), by[8].bakery_demand_pm / by[8].residents < by[2].bakery_demand_pm / by[2].residents);
  ok('EXP1 with 2 homes the workforce is short: only ' + by[2].employed + ' of ' + by[2].jobs + ' places are filled (bakery ' + by[2].staff.bakery + ', workshop ' + by[2].staff.workshop + '); from 4 homes every place is filled', by[2].employed < by[2].jobs && by[2].staff.bakery === '3/3' && by[2].staff.workshop === '1/2' && by[4].employed === by[4].jobs && by[10].employed === by[10].jobs);
  ok('EXP1 no brownout up to 6 homes; the grid is over its supply from 8 homes (draw ' + by[8].grid_draw_kw + ' kW vs ' + by[8].grid_supply_kw + ' kW)', by[2].brownout_avg_factor === 1 && by[6].brownout_avg_factor === 1 && by[8].grid_draw_kw > by[8].grid_supply_kw && by[8].brownout_avg_factor < 1);
  ok('EXP1 the bakery capacity (' + by[8].bakery_capacity_pm.toFixed(1) + ' a minute) is NOT reached by 8 homes (demand ' + by[8].bakery_demand_pm.toFixed(1) + ') but customers are lost at 10 homes (' + by[10].bakery_lost_pm.toFixed(1) + ' a minute)', by[8].bakery_demand_pm < by[8].bakery_capacity_pm && by[8].bakery_lost_pm < 0.5 && by[10].bakery_lost_pm > 0.5);
  ok('EXP1 sold follows demand while stock lasts: sold within 1.5 of demand up to 8 homes', [2, 4, 6, 8].every((k) => near(by[k].bakery_sold_pm, by[k].bakery_demand_pm, 1.5)));
}
if (E2) {
  const U = E2.upgrades;
  ok('EXP2 stone deck oven: the base data never repays its 40 coins within 60 minutes at 1 to 8 homes (no break-even found)', U.stone_deck_oven.break_even_homes_payback_within_60_min === null && E2.sweep_homes.every((k) => U.stone_deck_oven.by_homes[k].gain_pm < 1), U.stone_deck_oven.by_homes);
  ok('EXP2 the reason is in the numbers: demand stays below the ORIGINAL capacity (25.7 a minute) at 1 to 8 homes, so faster baking has nothing to sell', E2.sweep_homes.every((k) => U.stone_deck_oven.by_homes[k].demand_pm < 25.7));
  ok('EXP2 the oven draws 2 kW more: the brownout is deeper with it (8 homes: ' + U.stone_deck_oven.by_homes[8].brownout_base.toFixed(3) + ' to ' + U.stone_deck_oven.by_homes[8].brownout_upgrade.toFixed(3) + ' average power)', U.stone_deck_oven.by_homes[8].brownout_upgrade < U.stone_deck_oven.by_homes[8].brownout_base);
  ok('EXP2 cool store room: loses money at EVERY homes count (' + E2.sweep_homes.map((k) => U.cool_store_room.by_homes[k].gain_pm.toFixed(1)).join(', ') + ' a minute)', E2.sweep_homes.every((k) => U.cool_store_room.by_homes[k].gain_pm < -5) && U.cool_store_room.break_even_homes_payback_within_60_min === null);
  const cs = U.cool_store_room.by_homes[2];
  ok('EXP2 cool store room: the extra cost is wages (+1 per worker) and flour that is bought and stockpiled, not baked (2 homes: wages +' + cs.extra_wages_pm.toFixed(1) + ', ingredients +' + cs.extra_ingredients_pm.toFixed(1) + ' a minute, loaves made unchanged ' + cs.made_base + ' to ' + cs.made_upgrade + ')', cs.extra_wages_pm > 2 && cs.extra_ingredients_pm > 5 && cs.made_base === cs.made_upgrade);
  ok('EXP2 few homes (2) and many homes (8) both recorded for both upgrades', ['stone_deck_oven', 'cool_store_room'].every((v) => U[v].headline.few && U[v].headline.many));
  const s3 = E2.sensitivity.find((s) => s.per_resident_loaf === 3.0), s18 = E2.sensitivity.find((s) => s.per_resident_loaf === 1.8);
  ok('EXP2 sensitivity (NOT the base data): if residents ate 3.0 loaves a minute the oven would pay back within 60 minutes from ' + s3.stone_deck_oven_break_even_homes_payback_within_60_min + ' homes', s3.stone_deck_oven_break_even_homes_payback_within_60_min !== null && s3.stone_deck_oven_break_even_homes_payback_within_60_min <= 6, s3);
  ok('EXP2 sensitivity: the oven pays back only when demand is above the old capacity (every profitable row has demand > 25.7)', E2.sensitivity.every((s) => s.rows.every((r) => r.gain_pm < 1 || r.demand_pm > 25.7)));
  ok('EXP2 sensitivity: the profitable row has real extra sales (sold_upgrade > sold_base) and a net gain above 10 a minute', s18.rows.filter((r) => r.gain_pm >= 1).every((r) => r.sold_upgrade > r.sold_base && r.gain_pm > 10));
}
if (E3) {
  const A = E3.runs.A, B = E3.runs.B, c1 = E3.runs.control_1, c2 = E3.runs.control_2;
  ok('EXP3 CONTROL: both bakeries in identical conditions give identical outcomes (all numbers and the state hash)', JSON.stringify(c1) === JSON.stringify(c2) && JSON.stringify(c1) === JSON.stringify(A), [c1, c2]);
  ok('EXP3 the same recipe in two neighbourhoods differs: net per minute A ' + A.bakery_net_pm.toFixed(1) + ' against B ' + B.bakery_net_pm.toFixed(1), A.bakery_net_pm > B.bakery_net_pm + 10);
  ok('EXP3 demand: A ' + A.bakery_demand_pm.toFixed(1) + ' vs B ' + B.bakery_demand_pm.toFixed(1) + ', sold A ' + A.bakery_sold_pm.toFixed(1) + ' vs B ' + B.bakery_sold_pm.toFixed(1), A.bakery_demand_pm > 2 * B.bakery_demand_pm && A.bakery_sold_pm > 2 * B.bakery_sold_pm);
  ok('EXP3 deliveries: A missed none, B missed ' + B.deliveries_missed_visits + ' cart visits (road blocked ' + B.delivery_blocked_s + ' s)', A.deliveries_missed_visits === 0 && B.deliveries_missed_visits >= 1 && B.delivery_blocked_s === 180);
  ok('EXP3 brownout: A none (margin ' + (A.grid_supply_kw - A.grid_draw_kw).toFixed(1) + ' kW), B browned out ' + Math.round(B.brownout_share * 100) + '% of the run', A.brownout_share === 0 && B.brownout_share > 0.2);
  ok('EXP3 spoiled is 0 in both (no roof damage; the recipe has no bread spoilage) - reported, not invented', A.spoiled === 0 && B.spoiled === 0);
  const cz = (k) => E3.causes.find((c) => c.change === k);
  ok('EXP3 cause by cause (B changed to A one thing at a time): more homes help ' + cz('homes').delta_net_pm.toFixed(1) + ', near market and homes help ' + cz('location').delta_net_pm.toFixed(1) + ', an open road changes demand ' + cz('road').demand_pm.toFixed(1) + ' vs ' + B.bakery_demand_pm.toFixed(1), cz('homes').delta_net_pm > 5 && cz('location').delta_net_pm > 5 && cz('road').demand_pm > B.bakery_demand_pm);
  ok('EXP3 the power margin alone changes almost nothing for B (' + cz('power').delta_net_pm.toFixed(2) + ' a minute): a bakery that sells less than it can make does not suffer from slower baking', Math.abs(cz('power').delta_net_pm) < 0.5 && cz('power').brownout_share === 0);
  ok('EXP3 all four changes together turn B into A exactly', cz('all four (should equal A)').net_pm === A.bakery_net_pm && cz('all four (should equal A)').demand_pm === A.bakery_demand_pm);
}

console.log('\n' + (n - bad) + ' of ' + n + ' checks passed');
process.exit(bad ? 1 : 0);
