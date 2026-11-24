#!/usr/bin/env node
/* Checks a result file returned from another machine or engine against the expected figures. usage: node shared/tools/sweep-check.mjs <result.json> [expected.json]
   The result is the page's `result` object (rows, result_hash, canary_identical ...). Exit 0 only if the fingerprint, the row count and EVERY row are identical. Read-only. */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const got = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), exp = JSON.parse(fs.readFileSync(process.argv[3] || path.join(here, '../jobs/sweep-1/expected.json'), 'utf8'));
const r = got.result || got; let bad = 0; const say = (ok, m) => { if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + m); };
say(r.result_hash === exp.result_hash, 'fingerprint ' + r.result_hash + ' against expected ' + exp.result_hash);
say(r.cells === exp.cells, 'cells ' + r.cells + ' against ' + exp.cells);
say(r.canary_identical === true, 'canary (first cell run twice) identical: ' + r.canary_identical);
say(r.rows_with_breach_or_error === 0, 'rows with an invariant breach or error: ' + r.rows_with_breach_or_error);
let diff = 0, first = null; (exp.rows || []).forEach((e, i) => { if (JSON.stringify(e) !== JSON.stringify((r.rows || [])[i])) { diff++; if (!first) first = { index: i, expected: e, got: (r.rows || [])[i] }; } });
say(diff === 0, 'rows that differ: ' + diff + (first ? '  first: ' + JSON.stringify(first).slice(0, 300) : ''));
console.log(bad ? 'RESULT DIFFERS (report both engines, do not average, do not tidy)' : 'RESULT IDENTICAL: same numbers on this machine');
process.exit(bad ? 1 : 0);
