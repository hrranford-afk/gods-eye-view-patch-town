/* C06a headless tests: the city_infra validator and hostile files, the allocation arithmetic by hand, the district integration (dark building, two sources, a local brownout
   that leaves the other street untouched, determinism), districts WITHOUT an infra file unchanged (state hashes equal to the ones recorded from the code before C06a),
   the shipped generator shed recipe, and the C03b rule under LOCAL brownouts. Run from games/city-lab: node tests/infra-test.js */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const DI = require(path.join(ROOT, 'district.js')), DV = require(path.join(ROOT, 'district-validate.js')), IV = require(path.join(ROOT, 'infra-validate.js')), INFRA = require(path.join(ROOT, 'infra.js')), VAL = require(path.join(ROOT, 'validate.js'));
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')), clone = (o) => JSON.parse(JSON.stringify(o));
let n = 0, bad = 0; const ok = (name, c, x) => { n++; if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + name + (!c && x !== undefined ? '  -> ' + (typeof x === 'string' ? x : JSON.stringify(x)).slice(0, 400) : '')); };
const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 1e-6 : t);

const HAND = rd('districts/patch_row_hand.json'), POW = rd('districts/patch_row_power.json'), I0 = rd('infra/patch_row_power.infra.json');
const files = {}; [...POW.buildings.map((b) => b.recipe), POW.home_template.recipe, 'shared/cloud/examples/bakery.stone_deck_oven.json'].forEach((p) => { files[p] = rd(p); });
const powBuf = fs.readFileSync(path.join(ROOT, 'districts/patch_row_power.json')), powSha = crypto.createHash('sha256').update(powBuf).digest('hex');

/* ---------- 1. the shipped files ---------- */
{
  const r = IV.validate(I0, POW, { districtSha: powSha });
  ok('the shipped infra file passes the strict validator (linked to the district by id, version and SHA-256)', r.ok, r.errors);
  ok('the district file passes the district validator (with every recipe, including the generator shed)', DV.validate(POW, files, {}).ok, DV.validate(POW, files, {}).errors);
  const gs = rd('recipes/generator_shed.json'), v = VAL.validate(gs);
  ok('recipes/generator_shed.json passes the REAL v1 recipe validator (shape, supports, overlaps) and has about 50 parts (' + gs.parts.length + ')', v.ok && gs.parts.length >= 45 && gs.parts.length <= 60, v.errors);
  ok('the generator recipe holds no kW of output: its power block is only its own control-room draw', gs.systems.power.demand_kw === 0.8 && !JSON.stringify(gs).includes('output_kw'));
  ok('the shipped district is a copy of the hand-made one plus the generator shed (same roads, homes, coefficients)', JSON.stringify(Object.assign({}, POW, { id: 0, name: 0, buildings: 0 })) === JSON.stringify(Object.assign({}, HAND, { id: 0, name: 0, buildings: 0 })) && POW.buildings.length === HAND.buildings.length + 1 && POW.buildings.some((b) => b.id === 'gen_1' && b.recipe === 'recipes/generator_shed.json'));
  ok('the district hash in the infra file is the real SHA-256 of districts/patch_row_power.json', I0.district.sha256 === powSha);
  ok('the ten original recipes and the sofa-siege game are untouched (git shows no change)', (() => { try { return require('child_process').execSync('git status --porcelain -- inputs ../sofa-siege', { cwd: ROOT }).toString().trim() === ''; } catch (e) { return true; } })());
}

/* ---------- 2. hostile files: all rejected, none throws ---------- */
const H = [], mut = (name, f) => H.push([name, f]);
{
  mut('unknown top-level key', (I) => { I.extra = 1; return I; });
  mut('wrong schema name', (I) => { I.schema = 'city_district'; return I; });
  mut('wrong version', (I) => { I.version = 1; return I; });
  mut('linked to another district id', (I) => { I.district.id = 'somewhere_else'; return I; });
  mut('wrong district SHA-256', (I) => { I.district.sha256 = '0'.repeat(64); return I; });
  mut('SHA-256 not hex', (I) => { I.district.sha256 = 'zz'; return I; });
  mut('source in a building that is not in the district', (I) => { I.sources[0].building = 'nowhere'; return I; });
  mut('source in a home', (I) => { I.sources[0].building = 'home_1'; return I; });
  mut('source in a bakery (not a shed)', (I) => { I.sources[0].building = 'bakery'; return I; });
  mut('a source elsewhere than the root', (I) => { I.sources[0].at = 'main'; return I; });
  mut('source kw negative', (I) => { I.sources[0].kw = -3; return I; });
  mut('source kw a string', (I) => { I.sources[0].kw = '13'; return I; });
  mut('source kw huge', (I) => { I.sources[0].kw = 1e9; return I; });
  mut('source cost negative', (I) => { I.sources[0].build_cost = -1; return I; });
  mut('no source at all', (I) => { I.sources = []; return I; });
  mut('two sources in one building', (I) => { I.sources.push(Object.assign({}, I.sources[0], { id: 'gen_b' })); return I; });
  mut('a cable into the root (a cycle)', (I) => { I.cables.push({ id: 'loop', name: 'Loop', from: 'main', to: 'root', capacity_kw: 5, build_cost: 1, upkeep_per_min: 0 }); return I; });
  mut('two cables into one building (not a tree)', (I) => { I.cables.push({ id: 'twice', name: 'Twice', from: 'homes_j', to: 'bakery', capacity_kw: 5, build_cost: 1, upkeep_per_min: 0 }); return I; });
  mut('a cycle between two junctions that never reaches the root', (I) => { I.junctions.push({ id: 'ja', name: 'ja' }, { id: 'jb', name: 'jb' }); I.cables.push({ id: 'c1', name: 'C1', from: 'ja', to: 'jb', capacity_kw: 5, build_cost: 1, upkeep_per_min: 0 }, { id: 'c2', name: 'C2', from: 'jb', to: 'ja', capacity_kw: 5, build_cost: 1, upkeep_per_min: 0 }); return I; });
  mut('a second root (an orphan junction)', (I) => { I.junctions.push({ id: 'island', name: 'island' }); return I; });
  mut('a building feeding another building', (I) => { I.cables.push({ id: 'b2b', name: 'B to B', from: 'bakery', to: 'market', capacity_kw: 1, build_cost: 1, upkeep_per_min: 0 }); return I; });
  mut('a cable to an id that does not exist', (I) => { I.cables[1].to = 'ghost_house'; return I; });
  mut('a cable from an id that does not exist', (I) => { I.cables[1].from = 'ghost_junction'; return I; });
  mut('the generator shed on a cable', (I) => { I.cables.push({ id: 'gcab', name: 'G cable', from: 'main', to: 'gen_1', capacity_kw: 5, build_cost: 1, upkeep_per_min: 0 }); return I; });
  mut('cable capacity zero', (I) => { I.cables[0].capacity_kw = 0; return I; });
  mut('cable capacity NaN-like string', (I) => { I.cables[0].capacity_kw = 'NaN'; return I; });
  mut('cable capacity negative', (I) => { I.cables[0].capacity_kw = -2; return I; });
  mut('a cable name that looks like markup', (I) => { I.cables[0].name = '<img src=x onerror=alert(1)>'; return I; });
  mut('a junction name that looks like code', (I) => { I.junctions[0].name = 'function(){}'; return I; });
  mut('a link inside a name', (I) => { I.name = 'see https://example.com'; return I; });
  mut('junction cell outside the grid', (I) => { I.junctions[0].cell = [99, 99]; return I; });
  mut('junction id equal to a building id', (I) => { I.junctions[1].id = 'bakery'; return I; });
  mut('duplicate cable id', (I) => { I.cables[1].id = I.cables[0].id; return I; });
  mut('too many cables', (I) => { for (let i = 0; i < 90; i++) I.cables.push({ id: 'x' + i, name: 'X', from: 'main', to: 'x' + i, capacity_kw: 1, build_cost: 0, upkeep_per_min: 0 }); return I; });
  mut('an unknown key inside a cable', (I) => { I.cables[0].loss = 0.1; return I; });
  mut('a missing key inside a cable', (I) => { delete I.cables[0].build_cost; return I; });
  mut('root is not a junction id', (I) => { I.root = 'bakery'; return I; });
  mut('home cable to a building instead of a junction', (I) => { I.home_cable.to = 'bakery'; return I; });
  mut('upkeep absurdly large', (I) => { I.cables[0].upkeep_per_min = 1e12; return I; });
  mut('prototype trick via JSON.parse', () => JSON.parse('{"__proto__":{"x":1},"schema":"city_infra","version":0}'));
  mut('constructor key', () => JSON.parse('{"constructor":{"prototype":{"x":1}},"schema":"city_infra","version":0}'));
  mut('null', () => null); mut('an array', () => []); mut('a number', () => 42); mut('a string', () => 'city_infra');
  mut('cables not a list', (I) => { I.cables = { a: 1 }; return I; });
  mut('a string with a control character', (I) => { I.name = 'ok\u0000bad'; return I; });
  let thrown = 0; const accepted = [];
  H.forEach(([name, f]) => { let r; try { r = IV.validate(f(clone(I0)), POW, { districtSha: powSha }); } catch (e) { thrown++; return; } if (r.ok) accepted.push(name); });
  ok('the validator rejects ' + H.length + ' hostile or broken files, none was accepted', accepted.length === 0 && H.length >= 20, accepted);
  ok('the validator never threw on any of them', thrown === 0, thrown);
  const msg = (f) => IV.validate(f(clone(I0)), POW, { districtSha: powSha }).errors.join(' | ');
  ok('a source elsewhere than the root is refused with a clear message', /only sit at the root/.test(msg((I) => { I.sources[0].at = 'main'; return I; })), msg((I) => { I.sources[0].at = 'main'; return I; }));
  ok('two parents are refused with a clear message', /exactly one parent/.test(msg((I) => { I.cables.push({ id: 'twice', name: 'Twice', from: 'homes_j', to: 'bakery', capacity_kw: 5, build_cost: 1, upkeep_per_min: 0 }); return I; })));
  ok('a second root and a cycle are refused with a clear message', /one tree/.test(msg((I) => { I.junctions.push({ id: 'island', name: 'island' }); return I; })));
  ok('a changed district file is caught by the SHA-256 link', /does not match the district file/.test(IV.validate(I0, POW, { districtSha: '1'.repeat(64) }).errors.join('|')));
  ok('parse() refuses text that is not JSON without throwing', !IV.parse('{not json', POW).ok);
}

/* ---------- 3. allocation arithmetic, by hand (the real allocate(), small trees) ---------- */
const tree = (cables, kw, junctions) => ({ root: 'root', junctions: (junctions || []).map((j) => ({ id: j, name: j })), sources: (Array.isArray(kw) ? kw : [kw]).map((k, i) => ({ id: 's' + i, building: 'g' + i, kw: k })), cables: cables.map((c) => ({ id: c[0], name: c[0], from: c[1], to: c[2], capacity_kw: c[3] })) });
const alloc = (I, demand, extra, st, sc) => INFRA.allocate(I, Object.keys(demand).map((id) => ({ id: id, kind: 'shop' })).concat((I.sources).map((s) => ({ id: s.building, kind: 'shed' })), extra || []), demand, st, sc == null ? 1 : sc);
{
  /* T1: P1 by hand: homes want 2.8 through a 2.0 cable, bakery 6.0 through 6.0, 9 kW: homes 2.0 (71.43%), bakery 6.0, total 8.0 */
  let r = alloc(tree([['ch', 'root', 'homes', 2], ['cb', 'root', 'bakery', 6]], 9), { homes: 2.8, bakery: 6 });
  ok('T1 hand arithmetic: homes get 2.0 of 2.8 (71.43%), bakery 6.0, total 8.0', near(r.delivered.homes, 2) && near(r.factor.homes, 0.714286) && near(r.delivered.bakery, 6) && near(r.delivered.homes + r.delivered.bakery, 8), r.delivered);
  /* T2: a nested tree with no shortage. A(cap 5) holds a1 (3, cable 3) and a2 (4 wanted, cable 2.5); B takes 2. A wants 3 + 2.5 = 5.5, cap 5: scale 5/5.5 */
  const T2 = tree([['cA', 'root', 'ja', 5], ['c1', 'ja', 'a1', 3], ['c2', 'ja', 'a2', 2.5], ['cB', 'root', 'b', 5]], 20, ['ja']);
  r = alloc(T2, { a1: 3, a2: 4, b: 2 });
  ok('T2 hand arithmetic: A is clipped by its own cable; a1 3 x 5/5.5 = 2.7273, a2 2.5 x 5/5.5 = 2.2727, B untouched (exactly 2.0, factor 1)', near(r.delivered.a1, 3 * 5 / 5.5, 1e-5) && near(r.delivered.a2, 2.5 * 5 / 5.5, 1e-5) && r.delivered.b === 2 && r.factor.b === 1, r.delivered);
  ok('T2 the limiting cable of a1 is cA (the nearest-to-root clip), of a2 it is c2, and B has none', r.limiter.a1.cable === 'cA' && r.limiter.a2.cable === 'c2' && r.limiter.b.kind === 'none', r.limiter);
  /* T3: the same tree with a SHORT source of 6: root wants 5 + 2 = 7, f = 6/7. A takes 5 x 6/7 = 4.2857 of its 5.5 wanted: f_A = 0.77922 */
  r = alloc(T2, { a1: 3, a2: 4, b: 2 }, [], null, 1); const T3 = tree([['cA', 'root', 'ja', 5], ['c1', 'ja', 'a1', 3], ['c2', 'ja', 'a2', 2.5], ['cB', 'root', 'b', 5]], 6, ['ja']); r = alloc(T3, { a1: 3, a2: 4, b: 2 });
  ok('T3 hand arithmetic, short source 6 kW: a1 2.3377, a2 1.9481, B 1.7143 (all branches scaled together; total 6.0)', near(r.delivered.a1, 3 * (5 * 6 / 7) / 5.5, 1e-5) && near(r.delivered.a2, 2.5 * (5 * 6 / 7) / 5.5, 1e-5) && near(r.delivered.b, 2 * 6 / 7, 1e-5) && near(r.delivered.a1 + r.delivered.a2 + r.delivered.b, 6, 1e-5), r.delivered);
  ok('T3 the limiter of B is the source (no cable clips it) and the sentence says so', r.limiter.b.kind === 'source' && /generators give 6.0 kW/.test(INFRA.explain(T3, r, 'b', (x) => x, (x) => x)), [r.limiter.b, INFRA.explain(T3, r, 'b', (x) => x, (x) => x)]);
  /* T4: P4 and P5 */
  const P = (kw) => alloc(tree([['ch', 'root', 'homes', 2], ['cb', 'root', 'bakery', 6]], kw), { homes: 2.8, bakery: 6 });
  r = P(6); ok('T4 P4: 6 kW for a capped demand of 8.0 gives homes 1.5, bakery 4.5', near(r.delivered.homes, 1.5) && near(r.delivered.bakery, 4.5), r.delivered);
  const two = P([6, 3]), one = P(9); ok('T5 P5: a second 3 kW generator at the root adds: 6 + 3 equals one 9 kW source, exactly', two.delivered.homes === one.delivered.homes && two.delivered.bakery === one.delivered.bakery && two.source_kw === 9, [two.source_kw]);
  /* T6: three levels; the middle cable is the tightest; deeper clips do not hide it */
  const T6 = tree([['top', 'root', 'j1', 10], ['mid', 'j1', 'j2', 2], ['leaf', 'j2', 'x', 3], ['other', 'j1', 'y', 4]], 50, ['j1', 'j2']);
  r = alloc(T6, { x: 3, y: 4 });
  ok('T6 three levels: x wants 3 through a 2.0 middle cable (gets 2.0, 66.67%), y untouched; the limiter of x is mid and the sentence names it', near(r.delivered.x, 2) && r.delivered.y === 4 && r.limiter.x.cable === 'mid' && /^mid 2.0 kW; j2 wants 3.0 kW; x gets 67 percent/.test(INFRA.explain(T6, r, 'x', (z) => z, (z) => z)), [r.delivered, INFRA.explain(T6, r, 'x', (z) => z, (z) => z)]);
  /* T7: dark buildings: one with no cable at all, one under a cut cable, one with zero demand */
  const T7 = tree([['c1', 'root', 'lit', 5], ['c2', 'root', 'cutme', 5], ['c3', 'root', 'quiet', 5]], 20);
  r = alloc(T7, { lit: 3, cutme: 3, quiet: 0, lost: 2 }, [], { caps: {}, cut: { c2: 1 } });
  ok('T7 dark: a building with no cable has factor 0 and is dark; a cut cable darkens what hangs on it; a connected zero-demand building is not dark', r.factor.lost === 0 && r.dark.lost && r.factor.cutme === 0 && r.dark.cutme && r.factor.lit === 1 && r.factor.quiet === 1 && !r.dark.quiet, [r.factor, r.dark]);
  ok('T7 the sentences for dark buildings say why', /no cable to a source/.test(INFRA.explain(T7, r, 'lost', (z) => z, (z) => z)) && /c2 is cut/.test(INFRA.explain(T7, r, 'cutme', (z) => z, (z) => z)));
  /* T8: cable colours: green under 90 percent, amber 90 to 100, red over capacity */
  const col = (want, cap) => alloc(tree([['c', 'root', 'x', cap]], 50), { x: want }).edges[0].state;
  ok('T8 colours: 80 percent green, 90 percent amber, 100 percent amber, 101 percent red', col(0.8, 1) === 'green' && col(0.9, 1) === 'amber' && col(1, 1) === 'amber' && col(1.01, 1) === 'red', [col(0.8, 1), col(0.9, 1), col(1, 1), col(1.01, 1)]);
  /* T9: capacity overrides (the page's cable edit) and the source scale */
  r = alloc(tree([['ch', 'root', 'homes', 2], ['cb', 'root', 'bakery', 6]], 9), { homes: 2.8, bakery: 6 }, [], { caps: { ch: 4 }, cut: {} });
  ok('T9 P1 after: the homes cable edited to 4.0 gives homes 2.8 (100%), bakery 6.0, total 8.8', near(r.delivered.homes, 2.8) && near(r.delivered.bakery, 6) && near(r.delivered.homes + r.delivered.bakery, 8.8), r.delivered);
  r = alloc(tree([['ch', 'root', 'homes', 4], ['cb', 'root', 'bakery', 6]], 10), { homes: 2.8, bakery: 6 }, [], null, 0.5);
  ok('T9 a source scale of 50 percent halves the output: 5 kW for 8.8 gives 56.8 percent to every branch', near(r.source_kw, 5) && near(r.factor.homes, 5 / 8.8) && near(r.factor.bakery, 5 / 8.8), r.factor);
}

/* ---------- 4. inside the district: the real machines get the factor ---------- */
const mk = (E, I) => { const m = DI.make(E, files, { seed: POW.seed, infra: I }); if (!m.ok) throw new Error(m.errors.join('; ')); return m.W; };
const withHomes = (k) => DI.withHomes(POW, k);
const bakery = (W) => W.S.b.find((b) => b.kind === 'shop');
{
  const W = mk(withHomes(8), clone(I0)), env = W.S.env, ia = env.infra;
  ok('shipped network at 8 homes: the homes cable overloads (3.2 wanted, 3.0 carried, red) BEFORE the main feeder does (10.5 of 12.0, green)', ia.edges.find((e) => e.id === 'homes_branch').state === 'red' && ia.edges.find((e) => e.id === 'main_feeder').state === 'green' && near(ia.edges.find((e) => e.id === 'homes_branch').want, 3.2), ia.edges.map((e) => [e.id, e.want, e.cap, e.state]));
  ok('only the homes street is dim: every home 93.75%, every other building exactly 100%', ia.factor.home_1 === 0.9375 && ia.factor.home_8 === 0.9375 && ia.factor.bakery === 1 && ia.factor.workshop === 1 && ia.factor.shed === 1 && ia.factor.market === 1, ia.factor);
  ok('the generator shed powers itself: it is not counted in the grid draw and has factor 1', ia.factor.gen_1 === 1 && near(env.power.draw, 13.7, 1e-6) && env.power.supply === 13.5, env.power);
  const W4 = mk(withHomes(4), clone(I0)); ok('at 4 homes nothing is dim and the homes cable is green', W4.S.env.infra.min_factor === 1 && W4.S.env.infra.edges.find((e) => e.id === 'homes_branch').state === 'green');
  DI.run(W, 60);
  ok('the bakery machine runs on supply = demand x its own factor (6.0 kW of 6.0)', near(bakery(W).sim.supply_kw, 6) && bakery(W).sim.power.state === 'ok');
}
{
  /* a local brownout: cut the bakery line to 3.0 kW: ONLY the bakery dims */
  const W = mk(withHomes(8), clone(I0)); DI.run(W, 100);
  const before = { workshop: W.S.env.infra.factor.workshop, homes: W.S.env.infra.factor.home_1, market: W.S.env.infra.factor.market, shed: W.S.env.infra.factor.shed };
  const r = DI.setCable(W, 'bakery_line', 3.0); DI.run(W, 5); const f = W.S.env.infra.factor;
  ok('a local brownout: the bakery line cut to 3.0 kW gives the bakery exactly 50 percent', r.ok && f.bakery === 0.5, f);
  ok('the OTHER streets are untouched: workshop, market, shed, every home keep exactly the factors they had', f.workshop === before.workshop && f.market === before.market && f.shed === before.shed && f.home_1 === before.homes && f.home_8 === before.homes, f);
  ok('the bakery machine is told 3.0 kW of 6.0 (state low, factor 0.5); the workshop machine still has its full 3.0 kW', near(bakery(W).sim.supply_kw, 3) && bakery(W).sim.power.state === 'low' && near(bakery(W).sim.power.factor, 0.5) && near(W.S.b.find((b) => b.id === 'workshop').sim.supply_kw, 3), [bakery(W).sim.supply_kw]);
  ok('the log explains the change with cable numbers before and after, who dims, shelf stock and energy saved', /Bakery line capacity set from 7 to 3 kW/.test(r.text) && /Bakery line wants 6 to 6 kW and carries 6 to 3 kW/.test(r.text) && /Miniature Bakery power 100% to 50%/.test(r.text) && /Shelf stock at Miniature Bakery \(loaf\): \d+/.test(r.text) && /Energy saved: up to [\d.]+ coins a minute/.test(r.text) && /only for that reason/.test(r.text), r.text);
  ok('the log line is in the district log as a change', W.S.log[W.S.log.length - 1].type === 'change' && W.S.log[W.S.log.length - 1].text === r.text);
  /* dark: cut the main feeder */
  const c = DI.cutCable(W, 'main_feeder', true); DI.run(W, 30); const g = W.S.env.infra;
  ok('cutting the main feeder makes bakery, workshop, market and shed DARK (factor 0) while the homes street keeps its power', g.factor.bakery === 0 && g.factor.workshop === 0 && g.factor.market === 0 && g.factor.shed === 0 && g.dark.bakery && g.dark.market && g.factor.home_1 === 0.9375 && !g.dark.home_1, g.factor);
  ok('a dark bakery machine is in a power cut (state cut, factor 0) and says so in its own log', bakery(W).sim.power.state === 'cut' && bakery(W).sim.supply_kw === 0 && /DARK/.test(c.text), [bakery(W).sim.power.state, c.text]);
  ok('the limiter of a dark building names the cut cable', g.limiter.bakery.kind === 'cut' && g.limiter.bakery.cable === 'main_feeder' && /Main feeder is cut/.test(INFRA.explain(W.I, g, 'bakery', (x) => DI.byId(W, x).label, (x) => x)));
  const bk = DI.cutCable(W, 'main_feeder', false); DI.run(W, 30);
  ok('reconnecting restores the network as it was (the bakery line is still at 3 kW, so the bakery is back at 50 percent, the workshop at 100) and the log says so', W.S.env.infra.factor.bakery === 0.5 && W.S.env.infra.factor.workshop === 1 && /reconnected/.test(bk.text), bk.text);
  ok('bad edits are refused without changing anything: unknown cable, zero capacity', !DI.setCable(W, 'nope', 3).ok && !DI.setCable(W, 'main_feeder', 0).ok && !DI.cutCable(W, 'nope', true).ok);
}
{
  /* adding a home overloads the homes cable: the log says so */
  const W = mk(withHomes(6), clone(I0)); const h = JSON.stringify(W.S.env.infra.factor.home_1);
  const r = DI.addHome(W); const r2 = DI.addHome(W);
  ok('adding homes overloads the homes cable and the log says it, with the numbers (6 homes 2.4 kW green; 8 homes 3.2 of 3.0 red)', r.ok && r2.ok && /Homes cable wants 2\.8 to 3\.2 kW and carries 2\.8 to 3 kW \(capacity 3 kW, amber to red\)/.test(r2.text) && /homes power 100% to 94%/.test(r2.text), [r.text, r2.text]);
  ok('new homes attach by their own small cable (home_cable) and are part of the network (not dark)', !W.S.env.infra.dark.home_7 && !W.S.env.infra.dark.home_8 && h === '1');
}
{
  /* two sources at the root add (P5 through the district): a second generator shed */
  const E = withHomes(10), I2 = clone(I0); I2.sources[0].kw = 9; const a = mk(E, I2).S.env.infra.factor.bakery;
  const E2 = withHomes(10); E2.buildings.push({ id: 'gen_2', recipe: 'recipes/generator_shed.json', cell: [5, 5], kind: 'shed', sidecars: [] }); const I3 = clone(I2); I3.sources[0].kw = 6; I3.sources.push({ id: 'gen_b', building: 'gen_2', kw: 3, build_cost: 1, upkeep_per_min: 0 });
  const b = mk(E2, I3).S.env.infra;
  ok('two generator sheds at the root (6 + 3 kW) give exactly what one 9 kW source gives', a === b.factor.bakery && b.source_kw === 9 && JSON.stringify(mk(E, I2).S.env.infra.factor.home_1) === JSON.stringify(b.factor.home_1), [a, b.factor.bakery]);
  ok('infra with a source building that is not in the district is refused by make()', !DI.make(withHomes(4), files, { infra: (() => { const J = clone(I0); J.sources[0].building = 'gen_9'; return J; })() }).ok);
}

/* ---------- 5. determinism, and districts WITHOUT infra byte-identical to before ---------- */
{
  const run = () => { const W = mk(withHomes(8), clone(I0)); DI.run(W, 300); DI.setCable(W, 'bakery_line', 3.6); DI.run(W, 600); DI.cutCable(W, 'workshop_line', true); DI.run(W, 200); DI.setScale(W, 0.6, 'grid'); DI.run(W, 200); return DI.hash(W); };
  const h = [run(), run(), run()];
  ok('the infra scenario (edits, a cut, a source scale) is deterministic: three runs give the same state hash (' + h[0] + ')', h[0] === h[1] && h[1] === h[2], h);
  /* reference hashes recorded from the code as it was BEFORE C06a (git HEAD of 21 Nov, district.js without infra) */
  const REF = { open: 'bb4a5994', run600: 'e510ace8', h8cut: '89c3ecb4', mixed: '19d38164', condB: '3ce73935' };
  const F = Object.assign({}, files); const mkh = (E) => DI.make(E, F, { seed: HAND.seed }).W; const got = {};
  F['recipes/home_cottage.json'] = files['recipes/home_cottage.json'];
  let W = mkh(HAND); got.open = DI.hash(W); DI.run(W, 600); got.run600 = DI.hash(W);
  W = mkh(DI.withHomes(HAND, 8)); DI.run(W, 300); DI.setScale(W, 0.6, 'cut'); DI.run(W, 900); got.h8cut = DI.hash(W);
  W = mkh(HAND); DI.run(W, 200); DI.addHome(W); DI.setRoad(W, [5, 2], false); DI.run(W, 400); DI.applySidecar(W, 'bakery', 'shared/cloud/examples/bakery.stone_deck_oven.json'); DI.run(W, 300); got.mixed = DI.hash(W);
  W = mkh(DI.settlement(HAND, DI.COND.B)); DI.run(W, 700); got.condB = DI.hash(W);
  ok('districts WITHOUT an infra file: all five state hashes equal the ones recorded before C06a', JSON.stringify(got) === JSON.stringify(REF), [got, REF]);
  ok('a district without infra has no infra key in its state and no infra key in its environment', !('infra' in mkh(HAND).S) && !('infra' in mkh(HAND).S.env));
}

/* ---------- 6. the C03b rule under LOCAL brownouts: a short cut raises net only by the energy saved, a long one reverses ---------- */
const sum = (o) => Object.values(o || {}).reduce((s, v) => s + v, 0);
const shop = (W) => W.S.b.find((b) => b.kind === 'shop');
function grab(W) { const b = shop(W), m = b.sim; return { t: W.S.t, income: m.sales.income, sold: m.sales.sold, lost: m.sales.lost, made: m.prod.made, power: m.costs.power, wages: m.costs.wages, ingr: m.costs.ingredients, loaf: m.stock.loaf, factor: W.S.env.b[b.id].factor }; }
function win(a, b) { const mins = (b.t - a.t) / 60, g = (k) => (b[k] - a[k]) / mins, cost = (b.power - a.power + b.wages - a.wages + b.ingr - a.ingr) / mins; return { made: g('made'), sold: g('sold'), lost: g('lost'), income: g('income'), power: g('power'), wages: g('wages'), ingr: g('ingr'), cost, net: g('income') - cost, loaf: b.loaf, factor: b.factor }; }
const runW = (W, s) => { const a = grab(W); DI.run(W, s); return win(a, grab(W)); };
{
  const CUT = 350, A = mk(withHomes(8), clone(I0)), B = mk(withHomes(8), clone(I0)); DI.run(A, CUT); DI.run(B, CUT); DI.setCable(B, 'bakery_line', 3.6);   /* 60 percent of the bakery's 6.0 kW */
  const base = runW(A, 140), cut = runW(B, 140);
  ok('local short cut (bakery line to 60 percent): the bakery power factor is 0.6, other streets unchanged', near(cut.factor, 0.6) && B.S.env.infra.factor.workshop === 1 && B.S.env.infra.factor.home_1 === 0.9375, [cut.factor]);
  ok('local short cut: SALES DO NOT CHANGE (the shelf covers them), no customer lost, stock falls', near(cut.sold, base.sold, 0.01) && cut.lost === 0 && cut.loaf < base.loaf - 8, [cut.sold, base.sold, cut.lost, cut.loaf, base.loaf]);
  ok('local short cut: net rises by EXACTLY the electricity saved (the C03b rule), and only that', near(cut.net - base.net, base.power - cut.power, 0.01) && cut.net > base.net && near(cut.ingr, base.ingr, 0.01) && near(cut.wages, base.wages, 1e-9), [cut.net - base.net, base.power - cut.power]);
  const A2 = mk(withHomes(8), clone(I0)), B2 = mk(withHomes(8), clone(I0)); DI.run(A2, 300); DI.run(B2, 300); DI.setCable(B2, 'bakery_line', 3.6);
  const w = []; for (let i = 0; i < 8; i++) w.push({ base: runW(A2, 300), cut: runW(B2, 300) });
  ok('local LONG cut: from the third 5-minute window the net is LOWER than baseline by more than 10 a minute, every window (the gain reverses)', w.slice(2).every((x) => x.cut.net < x.base.net - 10), w.map((x) => [x.cut.net, x.base.net]));
  ok('local long cut: sales stay below baseline once the shelf is empty and customers walk away', w.slice(2).every((x) => x.cut.sold < x.base.sold - 3 && x.cut.lost > 1), w.map((x) => [x.cut.sold, x.base.sold, x.cut.lost]));
  const depth = []; for (const cap of [6, 5.4, 4.8, 4.2, 3.6, 3, 2.4]) { const W = mk(withHomes(8), clone(I0)); DI.run(W, 300); DI.setCable(W, 'bakery_line', cap); DI.run(W, 1800); depth.push({ cap, ...runW(W, 600) }); }
  ok('local depth: steady-state net NEVER rises as the bakery line is cut deeper', depth.every((d, i) => i === 0 || d.net <= depth[i - 1].net + 0.01), depth.map((d) => [d.cap, d.net]));
}
console.log('\n' + (bad ? bad + ' FAILED of ' + n : n + ' of ' + n + ' checks passed')); process.exit(bad ? 1 : 0);
