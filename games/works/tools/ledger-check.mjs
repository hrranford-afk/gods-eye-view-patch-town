#!/usr/bin/env node
/* PatchTown Works ledger checker.
   Usage (from the repo root):  node games/works/tools/ledger-check.mjs [ledger.jsonl ...]
   With no file it checks games/works/ledger.jsonl. Exit code 0 when every line passes, 1 when any line is refused.

   It runs the very same rules the page uses: they live in games/works/index.html between the markers
   LEDGER-RULES-START and LEDGER-RULES-END, and this script reads them from there. So the page and the checker can never
   disagree, and a line this script refuses is also a line the town refuses to draw.

   The rules: one valid JSON object per line; the needed fields (t, who, where, what, kind, trust); a known kind
   (including "heartbeat"); a known trust (measured, reported, typed, sample); tests need a suite and a status; and no
   personal data: no email addresses, phone numbers, street addresses or postcodes, secret tokens, and no exact clock
   times on iPad lines. Problems are reported by line number and rule only, never by echoing the text. */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKS = path.resolve(HERE, '..');

export function loadRules(page = path.join(WORKS, 'index.html')) {
  const html = fs.readFileSync(page, 'utf8');
  const a = html.indexOf('/* LEDGER-RULES-START */'), b = html.indexOf('/* LEDGER-RULES-END */');
  if (a < 0 || b < a) throw new Error('ledger rules markers not found in ' + page);
  const ctx = {};
  vm.runInNewContext(html.slice(a, b) + '\nthis.WORKS_RULES = WORKS_RULES;', ctx, { filename: 'index.html (ledger rules)' });
  return ctx.WORKS_RULES;
}

export function checkText(txt) { return loadRules().checkText(txt); }
export function checkLine(obj) { return loadRules().checkLine(obj); }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rules = loadRules();
  const files = process.argv.slice(2).length ? process.argv.slice(2) : [path.join(WORKS, 'ledger.jsonl')];
  let bad = 0;
  for (const f of files) {
    const r = rules.checkText(fs.readFileSync(f, 'utf8'));
    for (const x of r.refused) { bad++; console.log(f + ':' + x.line + ': ' + x.why.join('; ')); }
    console.log(f + ': ' + r.ok.length + ' lines pass, ' + r.refused.length + ' refused');
  }
  process.exit(bad ? 1 : 0);
}
