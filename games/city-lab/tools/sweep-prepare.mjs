#!/usr/bin/env node
/* Prepares the SWEEP job: runs the task in Node (the cloud) to make the EXPECTED result, and bundles everything into ONE self-contained page (sweep-1.html: code, data and task inline,
   no network, no files to fetch) that any browser can open and that shows the result hash. usage: node tools/sweep-prepare.mjs shared/jobs/sweep-1 */
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), dir = path.resolve(ROOT, process.argv[2] || 'shared/jobs/sweep-1');
const task = JSON.parse(fs.readFileSync(path.join(dir, 'task.json'), 'utf8'));
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const D = rd(task.district_path), data = { districts: { [task.district]: D }, files: {} };
[...D.buildings.map((b) => b.recipe), D.home_template.recipe].forEach((p) => { data.files[p] = rd(p); });
const Core = require(path.join(ROOT, 'shared/jobs/sweep-core.js'));
const t0 = Date.now(), res = Core.run(task, data); res.node_seconds = (Date.now() - t0) / 1000;
fs.writeFileSync(path.join(dir, 'expected.json'), JSON.stringify(res, null, 1) + '\n');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/<\/script>/gi, '<\\/script>');
const parts = ['whitelist.js', 'supports.js', 'validate.js', 'sim.js', 'district.js', 'shared/jobs/sweep-core.js'].map(src);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>City Lab sweep job: ${task.id}</title>
<style>body{font:16px/1.4 -apple-system,system-ui,sans-serif;margin:0;padding:18px;background:#fbf6ec;color:#2b2118}h1{font-size:20px;margin:0 0 8px}.big{font:700 34px/1.2 ui-monospace,Menlo,monospace;background:#fff;border:3px solid #cdbb98;border-radius:14px;padding:14px;margin:12px 0}
.ok{color:#1d5a30}.bad{color:#8a2a1e}.small{font-size:13px;color:#6f6253}pre{white-space:pre-wrap;font-size:12px}</style></head><body>
<h1>City Lab sweep job: ${task.id}</h1><div class="small">Data only. This page runs a fixed simulation grid and shows a fingerprint. It reads nothing, sends nothing and never changes. Do not touch the screen while it runs.</div>
<div id="state" class="big">running...</div><div id="detail"></div><pre id="rows"></pre>
${parts.map((p) => '<script>\n' + p + '\n</script>').join('\n')}
<script>
(function () {
  var TASK = ${JSON.stringify(task)}; var DATA = ${JSON.stringify(data)}; var EXPECTED = ${JSON.stringify({ result_hash: res.result_hash, cells: res.cells })};
  window.__sweep = { done: false };
  function show(r, secs) {
    var ok = r.result_hash === EXPECTED.result_hash && r.cells === EXPECTED.cells && r.canary_identical && r.rows_with_breach_or_error === 0;
    document.getElementById('state').innerHTML = (ok ? '<span class="ok">MATCH</span> ' : '<span class="bad">DIFFERENT</span> ') + r.result_hash;
    document.getElementById('detail').innerHTML = 'cells ' + r.cells + ' | canary identical ' + r.canary_identical + ' | breaches or errors ' + r.rows_with_breach_or_error + ' | expected hash ' + EXPECTED.result_hash + ' | seconds ' + secs + '<br><span class="small">' + navigator.userAgent + '</span>';
    document.getElementById('rows').textContent = JSON.stringify(r.rows.slice(0, 3), null, 1) + '\\n... (' + r.rows.length + ' rows in window.__sweep.result)';
    window.__sweep = { done: true, match: ok, result: r, seconds: secs, userAgent: navigator.userAgent };
  }
  setTimeout(function () { try { var t0 = Date.now(), r = SweepCore.run(TASK, DATA, function (i, n) { document.getElementById('state').textContent = 'running ' + i + ' of ' + n; }); show(r, (Date.now() - t0) / 1000); } catch (e) { document.getElementById('state').innerHTML = '<span class="bad">ERROR</span>'; document.getElementById('detail').textContent = String(e && e.message); window.__sweep = { done: true, match: false, error: String(e && e.message) }; } }, 50);
})();
</script></body></html>`;
fs.writeFileSync(path.join(dir, path.basename(dir) + '.html'), html);
console.log('cells ' + res.cells + ' | canary identical ' + res.canary_identical + ' | breaches ' + res.rows_with_breach_or_error + ' | result hash ' + res.result_hash + ' | node ' + res.node_seconds + ' s | page ' + Math.round(html.length / 1024) + ' KB');
