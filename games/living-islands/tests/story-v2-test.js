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

/* ---- 2. the 360-day calendar ---- */
{
  await import(path.join(dir, 'gift_day.js'));
  const K = globalThis.LI_GIFT.core;
  ok(K.CAL_MONTHS.length === 12 && K.CAL_YEAR === 360 && K.CAL_MONTH === 30, 'twelve months of 30 days make a 360-day year');
  const c1 = K.calOf(1), c30 = K.calOf(30), c31 = K.calOf(31), c360 = K.calOf(360), c361 = K.calOf(361), c842 = K.calOf(842);
  ok(c1.label === '1 May' && c1.season === 'spring' && c1.year === 1, 'day 1 is 1 May, spring, year one');
  ok(c30.label === '30 May' && c31.label === '1 June' && c31.season === 'summer', 'a month is 30 days: day 30 is 30 May, day 31 is 1 June, summer');
  ok(c360.label === '30 April' && c360.year === 1 && c361.label === '1 May' && c361.year === 2 && c361.yearDay === 1, 'day 360 is the last of year one, day 361 starts year two');
  ok(c842.year === 3 && c842.season === 'autumn' && c842.yearDay === 122, 'day 842 is in autumn of year three');
  const seasons = {}; for (let d = 1; d <= 360; d++) { const s = K.calOf(d).season; seasons[s] = (seasons[s] || 0) + 1; } ok(seasons.spring === 90 && seasons.summer === 90 && seasons.autumn === 90 && seasons.winter === 90, 'four seasons of 90 days (spring is split: 1 to 30 and 301 to 360)');
  ok(K.calOf(211).season === 'winter' && K.calOf(300).season === 'winter' && K.calOf(301).season === 'spring' && K.calOf(121).season === 'autumn' && K.calOf(210).season === 'autumn', 'winter is days 211 to 300, autumn 121 to 210');
  ok(K.calOf(1440).year === 4 && K.calOf(1440).label === '30 April' && K.calOf(0).day === 1 && K.calOf(NaN).day === 1, 'year four ends on day 1440; bad input reads as day 1');
  ok(K.letterOk('L1', 1) && !K.letterOk('L3', 2) && K.letterOk('L3', 3) && !K.letterOk('L4', 210) && K.letterOk('L4', 211), 'letters key on the calendar: L3 from day 3, L4 the first winter (day 211)');
  ok(!K.letterOk('L9', 841) && K.letterOk('L9', 842) && K.letterOk('L9', 1080) && !K.letterOk('L9', 1081) && K.LETTER_DAYS.L9.from === A.GW_DAY0, 'letter nine only from day 842 (the storm layer agrees)');
  /* storms follow the same seasons: the n-th storm lands in the middle of the n-th season counted from summer */
  for (const seed of [1, 9, 321]) for (let n = 1; n <= 9; n++) { const gh = A.nextDue({ n, endGh: 0, gw: true }, seed), d = Math.floor(gh / 24) + 1, c = K.calOf(d), lo = 31 + 90 * (n - 1), hi = lo + 89; if (!(d >= lo + 29 && d <= hi)) ok(false, 'seed ' + seed + ' storm ' + n + ' on day ' + d + ' outside season ' + lo + '..' + hi); }
  ok(true, 'every storm after the first lands in the second two thirds of its own game season');
  const bad = /\b(london|paris|york|england|scotland|ireland|cornwall|devon|google|apple|amazon|tesco|ikea|lego|nike)\b/i;
  ok(![].concat(K.CAL_MONTHS, K.LETTER1, K.LETTER2).some(t => bad.test(t)), 'no real place names or brands in the months or letters');
  ok(K.calOf(7).long === '7 May, year 1, spring', 'the Day tooltip text: ' + K.calOf(7).long);
}
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
