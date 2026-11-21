#!/usr/bin/env node
/* City Lab job board. Reads the two job tables from the two branches (git only, read-only, no network except git fetch) and prints one board.
   usage: node jobboard.mjs            print the board
          node jobboard.mjs check C03  say whether job C03 (or any id) is already on either side, and with what status
   Statuses allowed: PLANNED WORKING PASSED FAILED BLOCKED. Anything else is reported. */
import { execFileSync } from 'node:child_process';
const OK = ['PLANNED', 'WORKING', 'PASSED', 'FAILED', 'BLOCKED'];
const SIDES = [
  { name: 'CLOUD', ref: 'citylab/cloud-work', file: 'games/city-lab/shared/cloud/JOBS_CLOUD.md' },
  { name: 'HARDWARE', ref: 'citylab/hardware-work', file: 'games/city-lab/shared/hardware/JOBS_HARDWARE.md' }];
const git = (a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
try { git(['fetch', '-q', 'origin']); } catch (e) { console.log('warning: git fetch failed (' + String(e.message).split('\n')[0] + '). Showing what is already local.'); }
function read(side) {
  for (const ref of ['origin/' + side.ref, side.ref]) {
    try { return { text: git(['show', ref + ':' + side.file]), ref }; } catch (e) { /* try next */ }
  }
  return null;
}
const rows = [];
for (const s of SIDES) {
  const r = read(s);
  if (!r) { console.log(s.name + ': no job record on branch ' + s.ref + ' yet (' + s.file + ')'); continue; }
  for (const line of r.text.split('\n')) {
    const c = line.split('|').map((x) => x.trim());
    if (c.length < 7 || !/^[CHU]\d\d$/.test(c[1])) continue;
    rows.push({ side: s.name, id: c[1], owner: c[2], status: c[3], updated: c[4], evidence: c[5], next: c[6], ref: r.ref });
  }
}
const cmd = process.argv[2], id = process.argv[3];
if (cmd === 'check' && id) {
  const hit = rows.filter((r) => r.id === id.toUpperCase());
  if (!hit.length) { console.log(id + ': not recorded on either branch. Safe to start (set it to WORKING in your own table first).'); process.exit(0); }
  hit.forEach((r) => console.log(r.id + ' on ' + r.side + ' (' + r.ref + '): ' + r.status + ' | ' + r.evidence));
  const other = hit.filter((r) => r.status === 'PASSED' || r.status === 'WORKING');
  if (other.length) { console.log('=> do NOT start a competing version. Review it or write a CHANGE_REQUEST.'); process.exit(2); }
  process.exit(0);
}
console.log('\nID   | SIDE     | STATUS   | UPDATED    | EVIDENCE / NEXT');
let bad = 0;
for (const r of rows) {
  if (!OK.includes(r.status)) bad++;
  console.log([r.id.padEnd(4), r.side.padEnd(8), (r.status + (OK.includes(r.status) ? '' : ' (NOT ALLOWED)')).padEnd(8), r.updated.padEnd(10), r.evidence.slice(0, 70) + (r.next ? '  -> ' + r.next.slice(0, 50) : '')].join(' | '));
}
console.log('\n' + rows.length + ' jobs listed; ' + bad + ' with a status outside ' + OK.join('/'));
process.exit(bad ? 1 : 0);
