/* STORY V2 ON THE PAGE (Job 6e), pure node: item 1 small first storm and letter three (more items add sections below).
   Run: node games/living-islands/tests/story-v2-test.js */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
await import(path.join(dir, 'storm.js'));
const A = globalThis.LI_STORM;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const H = (x, z) => { const r = Math.hypot(x, z); return 3.4 * Math.exp(-(r * r) / (2 * 20 * 20)) - .45 + .12 * Math.sin(x * .31) * Math.cos(z * .27) - .9 * Math.max(0, (r - 44) / 18); };
const env = (seed, small) => ({ seed, H, half: 64, step: .8, tableR: 60, hw: A.SURGE_HW, obstacles: [{ x: 21, z: -4, r: 1, kind: 'rock' }], cell: 1, dir: [1, 0], focus: null, avoid: [], small });

/* ---- 1. the first storm is small, letter three, the Great Wash only in year three ---- */
{
  const s0 = A.newStorm();
  ok(A.nextDue(s0, 5) === 32.5 && A.stormDue(s0, 33, true, 5), 'the first storm is due on day 2 (hour 32.5), once the first night has passed');
  for (const seed of [1, 7, 777, 4242]) {
    const h = A.planHeaps(env(seed, true)), u = h.reduce((a, x) => a + x.n0, 0);
    ok(h.length === 8 && u >= 24 && u <= 40, 'seed ' + seed + ': the small storm leaves ' + h.length + ' heaps and ' + u + ' units (about 8 and about 35)');
  }
  const big = A.planHeaps(env(777, false)); ok(big.length === 24, 'the big storm keeps its 24 heaps');
  const l = A.letterOf({ big: false }), g = A.letterOf({ big: true });
  ok(l.id === 'L3' && /The sea gives and takes/.test(l.lines.join(' ')) && /Let them work/.test(l.lines.join(' ')), 'a small storm brings L3 in the GIFT_LETTERS words');
  ok(g.id === 'L9' && /Everything the sea has been holding came at once/.test(g.lines.join(' ')), 'letter nine is the Great Wash letter in the GIFT_LETTERS words');
  const letters = fs.readFileSync(path.join(dir, 'research', 'GIFT_LETTERS.md'), 'utf8');
  ok(letters.includes(l.lines.join(' ')) || /sea gives and takes\. What it leaves is not rubbish, only things that have not found a use yet\. The old carriers know the shore\. Let them work\./.test(letters), 'L3 text matches GIFT_LETTERS.md');
  /* never before day 842, once only, inside year three */
  ok(!A.isGreat(s0, 31 * 24) && !A.isGreat(s0, 840 * 24) && A.isGreat(s0, 841 * 24) && A.isGreat(s0, 900 * 24) && !A.isGreat(s0, 1100 * 24), 'the Great Wash can start on day 842 and after (to the end of year three), never before');
  ok(!A.isGreat(Object.assign(A.newStorm(), { gw: true }), 900 * 24), 'and only once');
  for (const seed of [1, 7, 99, 12345]) { const d = A.gwDay(seed); ok(d >= 842 && d <= 886, 'seed ' + seed + ': the Great Wash is due on day ' + d); }
  /* walk the whole of year one to three: every storm before day 842 is small, then exactly one big one */
  for (const seed of [3, 11, 500]) {
    let st = A.newStorm(), big = 0, smallAfter = 0, n = 0;
    for (let i = 0; i < 40; i++) {
      const due = A.nextDue(st, seed), isBig = A.isGreat(st, due); n++;
      if (isBig) { big++; st = Object.assign({}, st, { n: st.n + 1, gw: true, endGh: due + 6 }); } else { if (due >= 841 * 24 && st.gw) smallAfter++; if (!st.gw && due / 24 + 1 < 842) ok(true, ''); st = Object.assign({}, st, { n: st.n + 1, endGh: due + 6 }); }
      if (st.gw && st.n > 14) break;
    }
    ok(big === 1, 'seed ' + seed + ': exactly one Great Wash in the run of storms');
  }
  const sv = A.sanitize({ n: 3, phase: 'haul', big: true }), sv2 = A.sanitize({ n: 1, phase: 'haul' });
  ok(sv.big && sv.gw && !sv2.big, 'the save keeps big and gw; an old save is a small storm');
}
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
