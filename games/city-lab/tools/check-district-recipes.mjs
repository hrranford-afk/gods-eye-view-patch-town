/* Checks the four hand-detailed neighbourhood recipes with the REAL v1 validator, and that their systems blocks equal the ChatGPT recipes they replace (so figures do not move). */
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const V = require('../validate.js');
const pairs = [['home_cottage', '04'], ['market_hall', '03'], ['workshop', '05'], ['power_shed', '10']];
let bad = 0;
for (const [f, n] of pairs) {
  const t = fs.readFileSync(new URL('../recipes/' + f + '.json', import.meta.url), 'utf8'), r = V.parse(t);
  const o = JSON.parse(fs.readFileSync(new URL('../inputs/chatgpt-2026-11-21/recipes/recipe_' + n + '.json', import.meta.url), 'utf8'));
  const a = JSON.parse(t).systems, b = o.systems; delete a.inspect; delete b.inspect;
  const same = JSON.stringify(a) === JSON.stringify(b);
  console.log((r.ok && same ? 'PASS ' : 'FAIL ') + f + '  parts=' + JSON.parse(t).parts.length + '  validator ' + (r.ok ? 'ok' : 'REFUSED') + '  systems equal to recipe_' + n + (same ? ' yes' : ' NO'));
  if (!r.ok) r.errors.slice(0, 8).forEach((e) => console.log('    - ' + e));
  if (!(r.ok && same)) bad++;
}
process.exit(bad ? 1 : 0);
