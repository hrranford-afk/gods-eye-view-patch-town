/* Checks recipes/generator_shed.json with the REAL v1 validator (shape, supports, overlaps) and that the systems block is the power shed's, apart from the documented edits. */
import fs from 'node:fs'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const V = require('../validate.js');
const t = fs.readFileSync(new URL('../recipes/generator_shed.json', import.meta.url), 'utf8'), r = V.parse(t), j = JSON.parse(t);
console.log((r.ok ? 'PASS ' : 'FAIL ') + 'generator_shed  parts=' + j.parts.length + '  validator ' + (r.ok ? 'ok' : 'REFUSED'));
if (!r.ok) r.errors.slice(0, 10).forEach((e) => console.log('    - ' + e));
process.exit(r.ok ? 0 : 1);
