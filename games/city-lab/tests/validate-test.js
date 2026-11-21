/* City Lab validator test. Run: NODE_PATH=$(npm root -g) node tests/validate-test.js
   The valid recipes pass; every hostile recipe is rejected, and none of them makes the validator throw or touches Object.prototype. */
'use strict';
const fs = require('fs');
const path = require('path');
const V = require('../validate.js');
const R = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'recipes', n + '.json'), 'utf8'));
let n = 0, bad = 0;
const ok = (name, cond, extra) => { n++; if (!cond) bad++; console.log((cond ? 'PASS ' : 'FAIL ') + name + (!cond && extra ? '  -> ' + extra : '')); };

/* ---- good recipes ---- */
['bakery', 'shed', 'cart_stall', 'house'].forEach((nm) => {
  const r = R(nm), v = V.validate(r);
  ok('valid: ' + nm + ' passes (' + r.parts.length + ' parts)', v.ok, v.errors.slice(0, 3).join(' | '));
  const p = V.parse(JSON.stringify(r));
  ok('valid: ' + nm + ' passes through parse(text) too', p.ok && p.recipe && p.recipe.id === r.id);
});
ok('the bakery has 40 to 60 parts', R('bakery').parts.length >= 40 && R('bakery').parts.length <= 60, R('bakery').parts.length);

/* ---- hostile recipes: each is a function that makes a recipe (object or text) ---- */
const B = () => R('bakery');
const mut = (f) => () => { const r = B(); f(r); return r; };
const H = [];
const add = (name, make, expectRe) => H.push({ name, make, expectRe });
add('prototype pollution: __proto__ key in the text', () => '{"__proto__":{"polluted":"yes"},' + JSON.stringify(B()).slice(1), /key|code|prototype/);
add('prototype pollution: constructor.prototype on a part', mut((r) => { r.parts[0].constructor = { prototype: { polluted: 1 } }; }), /unknown key|prototype|constructor/);
add('prototype pollution: __proto__ inside systems (text)', () => JSON.stringify(B()).replace('"jobs"', '"__proto__":{"x":1},"jobs"'), /key|prototype/);
add('prototype pollution: an item called __proto__ in storage (text)', () => JSON.stringify(B()).replace('"flour":60', '"__proto__":60'), /prototype|item|key/);
add('prototype pollution: a non-plain object with an inherited key', () => { const r = B(); r.parts[3] = Object.assign(Object.create({ polluted: 1 }), r.parts[3]); return r; }, /plain object/);
add('huge number: position 1e308', mut((r) => { r.parts[2].pos[0] = 1e308; }), /between/);
add('huge number: Infinity from JSON text 1e999', () => JSON.stringify(B()).replace('"batch_seconds":28', '"batch_seconds":1e999'), /finite|JSON/);
add('huge number: size 1e9', mut((r) => { r.parts[5].size = [1e9, 1, 1]; }), /between/);
add('huge number: demand 1e12 kW', mut((r) => { r.systems.power.demand_kw = 1e12; }), /between/);
add('NaN as a position', mut((r) => { r.parts[4].pos[1] = NaN; }), /finite/);
add('NaN as a price', mut((r) => { r.systems.sales.price = NaN; }), /finite/);
add('negative batch time', mut((r) => { r.systems.production.batch_seconds = -5; }), /between/);
add('zero batch time', mut((r) => { r.systems.production.batch_seconds = 0; }), /between/);
add('numbers as strings', mut((r) => { r.systems.sales.price = '4'; }), /finite/);
add('cyclic needs: two parts hold each other up', mut((r) => { const a = r.parts.find((p) => p.id === 'post.fl'), b = r.parts.find((p) => p.id === 'beam.f'); a.needs = ['beam.f']; b.needs = ['post.fl', 'post.fr']; }), /cycle/);
add('cyclic needs: a part needs itself', mut((r) => { r.parts[3].needs = [r.parts[3].id]; }), /itself/);
add('code string: script tag in the name', mut((r) => { r.name = '<script>alert(1)</script>'; }), /code|markup|characters/);
add('code string: function in a label', mut((r) => { r.parts.find((p) => p.kind === 'sign').label = 'function(){}'; }), /code|link|markup/);
add('code string: arrow function in an inspect label', mut((r) => { r.systems.inspect.labels.oven = 'x=>x'; }), /code|link|markup/);
add('code string: eval in a tag', mut((r) => { r.parts[0].tag = 'eval'; }), /code|link|markup/);
add('code string: backticks and ${} in a label', mut((r) => { r.systems.inspect.labels.door = '`${1+1}`'; }), /code|link|markup/);
add('code string: a URL in the sign label', mut((r) => { r.parts.find((p) => p.kind === 'sign').label = 'http://evil.example/x.js'; }), /code|link|markup/);
add('code string: data: URI in the name', mut((r) => { r.name = 'data:text/html,hi'; }), /code|link|markup/);
add('code string: import( in a label', mut((r) => { r.systems.inspect.labels.floor = 'import("x")'; }), /code|link|markup/);
add('code string: javascript: scheme', mut((r) => { r.systems.inspect.labels.floor = 'javascript:alert(1)'; }), /code|link|markup/);
add('code string: constructor in an id', mut((r) => { r.parts[1].id = 'constructor'; }), /code|link|markup/);
add('code string: control characters', mut((r) => { r.name = 'Bakery\u0000\u0007'; }), /code|link|markup|characters/);
add('unknown part kind', mut((r) => { r.parts[7].kind = 'dragon'; }), /unknown kind/);
add('unknown material', mut((r) => { r.parts[7].material = 'lava'; }), /unknown material/);
add('unknown stage', mut((r) => { r.parts[7].stage = 'roof'; }), /stage/);
add('unknown top-level key', mut((r) => { r.hack = 1; }), /unknown key/);
add('unknown part key', mut((r) => { r.parts[2].onclick = 'x'; }), /unknown key/);
add('unknown systems key', mut((r) => { r.systems.cheat = { money: 1e9 }; }), /unknown key/);
add('oversize parts array (200 parts)', mut((r) => { const p = r.parts[0]; for (let i = 0; i < 150; i++) r.parts.push(Object.assign({}, p, { id: 'x' + i })); }), /too many|limit/);
add('oversize array: a sparse list of a million entries', mut((r) => { r.parts = new Array(1e6); }), /too many|limit|list/);
add('oversize needs list', mut((r) => { r.parts[3].needs = new Array(500).fill('floor'); }), /too many|limit|twice/);
add('oversize storage object (hundreds of items)', mut((r) => { const s = {}; for (let i = 0; i < 300; i++) s['item_' + String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + ((i / 26) | 0))] = 5; r.systems.storage = s; }), /too many/);
add('deep nesting: 5000 levels in the text', () => '{"schema":' + '['.repeat(5000) + ']'.repeat(5000) + '}', /nested|deep/);
add('deep nesting: 60 levels in an object', mut((r) => { let o = {}; const top = o; for (let i = 0; i < 60; i++) { o.a = {}; o = o.a; } r.systems.inspect.labels = top; }), /deep|label|not a part/);
add('deep nesting: an object that contains itself', mut((r) => { const o = {}; o.self = o; r.systems.inspect.labels = o; }), /deep|not a part|label/);
add('a very long string (10k characters)', mut((r) => { r.name = 'A'.repeat(10000); }), /long/);
add('a huge text (1 MB)', () => ' '.repeat(1000000) + '{}', /long/);
add('not JSON at all', () => '{this is not json', /JSON/);
add('empty string', () => '', /JSON/);
add('null', () => null, /object|string/);
add('a list instead of an object', () => [1, 2, 3], /object/);
add('a number', () => 42, /object|string/);
add('undefined', () => undefined, /object|string/);
add('a function value inside the recipe', mut((r) => { r.parts[2].tag = () => 1; }), /not data|string/);
add('a getter that throws', mut((r) => { Object.defineProperty(r, 'parts', { enumerable: true, get() { throw new Error('boom'); } }); }), /read safely|boom|parts/);
add('duplicate part ids', mut((r) => { r.parts[6].id = r.parts[5].id; }), /duplicate/);
add('a need that does not exist', mut((r) => { r.parts[6].needs = ['ghost']; }), /not a part/);
add('uppercase id with spaces', mut((r) => { r.parts[6].id = 'My Part'; }), /allowed|shape|characters/);
add('needsMin larger than needs', mut((r) => { r.parts.find((p) => p.id === 'beam.f').needsMin = 5; }), /between|needsMin/);
add('size and scale together', mut((r) => { r.parts[6].scale = 1; }), /not both/);
add('a label on something that is not a sign', mut((r) => { r.parts.find((p) => p.id === 'oven').label = 'Hot'; }), /only a sign/);
add('overlapping parts (a crate inside the oven)', mut((r) => { r.parts.find((p) => p.id === 'crate.c').pos = [-0.55, 0.05, -0.5]; }), /overlap/);
add('a floating part (a sack in mid air that needs nothing)', mut((r) => { const s = r.parts.find((p) => p.id === 'sack.b'); s.needs = []; s.pos[1] = 2; }), /does not stand/);
add('a part that touches nothing it needs (shutter far from its window)', mut((r) => { r.parts.find((p) => p.id === 'shutter.0').pos[0] = -0.2; r.parts.find((p) => p.id === 'shutter.0').pos[2] = 0.2; }), /does not stand|overlap/);
add('a part far outside the plot', mut((r) => { const c = r.parts.find((p) => p.id === 'crate.c'); c.pos = [4, 0, 1]; }), /sticks out|between/);
add('footprint too big', mut((r) => { r.footprint = { w: 100, d: 100 }; }), /between/);
add('footprint zero', mut((r) => { r.footprint = { w: 0, d: 0 }; }), /between/);
add('no parts at all', mut((r) => { r.parts = []; }), /at least/);
add('wire_part that does not exist', mut((r) => { r.systems.power.wire_part = 'nothing'; }), /not a part/);
add('station_part that does not exist', mut((r) => { r.systems.jobs[0].station_part = 'nothing'; }), /not a part/);
add('needs_parts that does not exist', mut((r) => { r.systems.production.needs_parts = ['nothing']; }), /not a part/);
add('production input that is not in storage', mut((r) => { r.systems.production.inputs.gold = 5; }), /not in storage/);
add('delivery of an unknown item', mut((r) => { r.systems.deliveries[0].item = 'gold'; }), /not in storage/);
add('delivery every 0 seconds', mut((r) => { r.systems.deliveries[0].every_seconds = 0; }), /between/);
add('delivery by a non-cart', mut((r) => { r.systems.deliveries[0].via = 'rocket'; }), /cart/);
add('a negative price', mut((r) => { r.systems.costs.power_per_kwh = -3; }), /between/);
add('a worker count of one million', mut((r) => { r.systems.jobs[0].count = 1e6; }), /between/);
add('an effect on a tag no part has', mut((r) => { r.systems.effects.spoil[0].tag = 'moon'; }), /no part has/);
add('spoilage fraction above 1', mut((r) => { r.systems.effects.spoil[0].items.flour = 5; }), /between/);
add('start stock above capacity', mut((r) => { r.systems.start_stock.flour = 1000; }), /capacity/);

let polluted = false;
H.forEach((h) => {
  let res, threw = false, input;
  try { input = h.make(); res = typeof input === 'string' ? V.parse(input) : V.validate(input); } catch (e) { threw = true; }
  const rejected = !threw && res && res.ok === false && Array.isArray(res.errors) && res.errors.length > 0;
  const readable = rejected && res.errors.every((e) => typeof e === 'string' && /^\$/.test(e));
  const matches = rejected && (!h.expectRe || res.errors.some((e) => h.expectRe.test(e)));
  ok('hostile: ' + h.name + ' is rejected without throwing', rejected && readable, threw ? 'it threw' : (res && res.errors ? res.errors.slice(0, 2).join(' | ') : 'accepted'));
  ok('hostile: ' + h.name + ' -> the error says why', matches, res && res.errors ? res.errors.slice(0, 3).join(' | ') : '');
  if (({}).polluted !== undefined || Object.prototype.polluted !== undefined) polluted = true;
});
ok('Object.prototype was never polluted by any recipe', !polluted && ({}).polluted === undefined && ({}).x === undefined);
ok('there are at least 25 hostile recipes (this run: ' + H.length + ')', H.length >= 25);
ok('a rejected recipe returns recipe: null', V.validate(Object.assign(B(), { hack: 1 })).recipe === null);
ok('errors carry a JSON path and a message', (() => { const v = V.validate(Object.assign(B(), { hack: 1 })); return v.details.length === 1 && /^\$\./.test(v.details[0].path) && v.details[0].msg.length > 3; })());

/* ---- patches (the Replace button) ---- */
const rr = B();
ok('patch: a different awning material is allowed', V.validatePatch(rr, 'awning', { material: 'paint_red', variant: 2 }).length === 0);
ok('patch: a sign label can change', V.validatePatch(rr, 'sign', { label: 'BREAD' }).length === 0);
ok('patch: a part that is not replaceable is refused', V.validatePatch(rr, 'floor', { material: 'stone' }).length > 0);
ok('patch: an unknown kind is refused', V.validatePatch(rr, 'awning', { kind: 'dragon' }).length > 0);
ok('patch: code in a label is refused', V.validatePatch(rr, 'sign', { label: '<b>x</b>' }).length > 0);
ok('patch: a __proto__ key is refused', V.validatePatch(rr, 'awning', JSON.parse('{"__proto__":{"x":1}}')).length > 0);
ok('patch: an overlapping size is refused', V.validatePatch(rr, 'oven', { size: [3, 3, 3] }).length > 0);
ok('patch: an unknown part is refused', V.validatePatch(rr, 'nothing', { material: 'wood' }).length > 0);

console.log('\n' + (n - bad) + ' of ' + n + ' checks passed' + (bad ? ', ' + bad + ' FAILED' : ''));
process.exit(bad ? 1 : 0);
