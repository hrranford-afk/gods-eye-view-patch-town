#!/usr/bin/env node
/* C01, reproducible: run the REAL validator (../../validate.js) on the ten original recipes and compare each file's SHA-256 with the recorded one.
   usage: node games/city-lab/shared/tools/c01-validate.mjs   (from the repository root). Exit 0 only if all ten are byte-identical to the record AND valid. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const V = require('../../validate.js');
const D = new URL('../../inputs/chatgpt-2026-11-21/', import.meta.url).pathname;
const rec = JSON.parse(fs.readFileSync(D + 'C01_RESULTS.json', 'utf8'));
let pass = 0, same = 0;
for (const r of rec.recipes) {
  const buf = fs.readFileSync(D + 'recipes/' + r.file), sha = crypto.createHash('sha256').update(buf).digest('hex');
  const ok = V.parse(buf.toString('utf8')).ok, ident = sha === r.sha256;
  if (ok) pass++; if (ident) same++;
  console.log((ok && ident ? 'PASS ' : 'FAIL ') + r.file + '  ' + r.name + '  sha256 ' + (ident ? 'matches the record' : 'DIFFERS') + '  validator ' + (ok ? 'ok' : 'REFUSED'));
}
console.log('\nvalidator ok: ' + pass + ' of ' + rec.recipes.length + '; bytes identical to the record: ' + same + ' of ' + rec.recipes.length);
process.exit(pass === rec.recipes.length && same === rec.recipes.length ? 0 : 1);
