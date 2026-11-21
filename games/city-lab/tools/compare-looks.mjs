/* Proves the hand-made buildings changed only the LOOKS: the three experiments on districts/patch_row_hand.json (hand-made recipes) give the same figures as on
   districts/patch_row.json (ChatGPT's small recipes). Exit 0 only if every figure is identical. Read-only. */
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const DI = require('../district.js'), DV = require('../district-validate.js');
const rd = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
function load(D) { const f = {}; const add = (p) => { f[p] = rd(p); }; D.buildings.forEach((b) => add(b.recipe)); add(D.home_template.recipe); add('shared/cloud/examples/bakery.stone_deck_oven.json'); add('shared/cloud/examples/bakery.cool_store_room.json'); return f; }
const strip = (o) => JSON.stringify(o, (k, v) => (k === 'hash' || k === 'state_hash' || k === 'world' ? undefined : v));
let bad = 0;
const A = rd('districts/patch_row.json'), B = rd('districts/patch_row_hand.json'), fA = load(A), fB = load(B);
const vB = DV.validate(B, fB); console.log('hand district validates: ' + vB.ok + (vB.ok ? '' : ' ' + vB.errors.join('; ')));
for (const k of ['exp1', 'exp2', 'exp3']) {
  const a = strip(DI[k](A, fA)), b = strip(DI[k](B, fB)), same = a === b; if (!same) bad++;
  console.log((same ? 'IDENTICAL ' : 'DIFFERENT ') + k + ' (' + a.length + ' characters of figures)');
}
process.exit(bad || !vB.ok ? 1 : 0);
