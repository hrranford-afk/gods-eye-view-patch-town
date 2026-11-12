#!/usr/bin/env node
// Builds ../exercises.json from the source files here and PROVES the answer key:
//  - every planted/real bug: the test shows the bug in the snippet as written, and does NOT show it once the stated fix (patch) is applied;
//  - every clean snippet: the test (invariants / property checks) passes.
// Run:  node checks/build_and_verify.cjs        (writes ../exercises.json, ids.json; exit 1 on any failure)
//       node checks/build_and_verify.cjs --no-write
const fs = require('fs'), path = require('path');
const all = [].concat(require('./src_real.cjs'), require('./src_planted.cjs'), require('./src_clean.cjs'));
const write = !process.argv.includes('--no-write');
let failed = 0;
const say = (ok, msg) => { if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + msg); };

function load(code, names, env) {
  env = env || {}; const keys = Object.keys(env);
  return new Function(...keys, code + '\nreturn {' + names.join(',') + '};')(...keys.map((k) => env[k]));
}
async function runTest(ex, code) {
  const env = ex.env ? ex.env() : {};
  const ns = load(code, ex.names, env);
  return !!(await ex.test(ns, env));
}
function applyPatch(code, patch) {
  for (const [o, n] of patch) { const parts = code.split(o); if (parts.length !== 2) throw new Error('patch text must occur exactly once: ' + o.slice(0, 50) + ' (found ' + (parts.length - 1) + ')'); code = parts.join(n); }
  return code;
}
const BRANDS = /\b(google|apple|iphone|ipad|safari|chrome|android|microsoft|windows|amazon|facebook|nintendo|lego|disney|pokemon|minecraft|hoover|dyson|ikea|nike|coca|pepsi|netflix|youtube|twitter|openai|anthropic|claude)\b/i;

(async () => {
  const keys = new Set();
  for (const ex of all) {
    const tag = ex.key + ' ';
    if (keys.has(ex.key)) say(false, tag + 'duplicate key'); keys.add(ex.key);
    const lines = ex.snippet.split('\n').length;
    say(lines >= 15 && lines <= 50, tag + 'snippet is ' + lines + ' lines (want 15 to 50)');
    say(!/`/.test(ex.snippet) && !BRANDS.test(ex.snippet + ex.context), tag + 'no backticks or brand names');
    try {
      if (ex.answer.bug) {
        const names = [ex.answer.function].concat(ex.answer.function_also || []);
        say(names.every((n) => new RegExp('\\b' + n + '\\b').test(ex.snippet)), tag + 'named function(s) exist in the snippet');
        const buggy = await runTest(ex, ex.snippet);
        say(buggy === true, tag + 'bug shows in the snippet as written');
        ex.fixed = applyPatch(ex.snippet, ex.patch);
        const fixedBug = await runTest(ex, ex.fixed);
        say(fixedBug === false, tag + 'bug is gone once the fix is applied');
      } else {
        say(!!ex.trap, tag + 'has a trap');
        let ok = true; for (let i = 0; i < 3; i++) ok = ok && await runTest(ex, ex.snippet);
        say(ok, tag + 'clean snippet passes its invariant checks (3 runs)');
      }
    } catch (e) { say(false, tag + 'threw ' + e.stack.split('\n').slice(0, 3).join(' | ')); }
  }
  // deterministic shuffle, so position and id do not reveal source or level
  let a = 12 * 7919 >>> 0; const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const order = all.slice(); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const out = [], ids = {};
  order.forEach((ex, i) => {
    const id = 'e' + String(i + 1).padStart(2, '0'); ids[ex.key] = id;
    const o = { id, level: ex.level, snippet: ex.snippet, context: ex.context, answer: ex.answer.bug ? Object.assign({}, ex.answer, { fixed_snippet: ex.fixed }) : { bug: false }, source: ex.source };
    if (ex.source === 'clean') o.trap = ex.trap;
    out.push(o);
  });
  const cnt = {}; for (const e of out) { const k = e.source + ' L' + e.level; cnt[k] = (cnt[k] || 0) + 1; }
  console.log('\n' + out.length + ' exercises', JSON.stringify(cnt));
  if (failed) { console.log('\n' + failed + ' FAILED'); process.exit(1); }
  if (write) {
    fs.writeFileSync(path.join(__dirname, '..', 'exercises.json'), JSON.stringify(out, null, 1) + '\n');
    fs.writeFileSync(path.join(__dirname, 'ids.json'), JSON.stringify(ids, null, 1) + '\n');
    console.log('wrote exercises.json and checks/ids.json');
  }
  console.log('ALL CHECKS PASSED');
})();
