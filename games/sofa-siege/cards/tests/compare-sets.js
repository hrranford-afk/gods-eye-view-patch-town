/* Round Table Kingdom cards: Set 1 against Set 2, side by side, from the saved results of recognise-test.js.
   Run from games/sofa-siege/cards:  node tests/compare-sets.js [seed]     (writes tests/set-compare.md) */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), seed = process.argv[2] || '20261118';
const load = (s) => JSON.parse(fs.readFileSync(path.join(DIR, 'tests', 'results-set' + s + '-full-seed' + seed + '.json'), 'utf8'));
const R = { 1: load('1'), 2: load('2') }, NAMES = { '00': 'WORLD ANCHOR', '01': 'BLUE BASE', '02': 'RED BASE', '03': 'CAPTURE FLAG', '04': 'HILL', '05': 'BUILD CAMP' };
const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : 'n/a', med = (a) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[(s.length / 2) | 0]; }, p90 = (a) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, (s.length * 0.9) | 0)]; }, f1 = (v) => isNaN(v) ? 'n/a' : v.toFixed(1);
const singles = (s, res) => R[s].results.filter((x) => x.t === 'single' && x.r === res);
const cell = (L) => { const n = L.length, tp = L.filter((x) => x.c[0][1] === 'tp').length, wr = L.filter((x) => x.c[0][1] === 'wrong').length; return n ? pct(tp, n) + ' / ' + pct(wr, n) + ' / ' + pct(n - tp - wr, n) : 'n/a'; };
const tpOnly = (L) => { const n = L.length, tp = L.filter((x) => x.c[0][1] === 'tp').length; return pct(tp, n) + ' (' + tp + '/' + n + ')'; };
const DBN = ['0.4-0.7 m', '0.7-1.0 m', '1.0-1.5 m'], EBN = ['20-35 deg', '35-55 deg', '55-75 deg'];
let md = 'Same seed (' + seed + '), same camera, distances, angles, backgrounds and thresholds. Each set at its true printed size: Set 1 is A5 (210 x 148.5 mm), Set 2 is A6 (148 x 105 mm), so a Set 2 card covers half the area in the picture at the same distance.\nCells: right card / wrong card / missed.\n\n';
for (const res of ['640x480', '1280x720']) { md += '### One card in view, ' + res + '\n\n| | Set 1 (A5 engraved) | Set 2 (A6 bold) |\n|---|---|---|\n';
  md += '| **all frames** | **' + cell(singles(1, res)) + '** | **' + cell(singles(2, res)) + '** |\n';
  for (let d = 0; d < 3; d++) md += '| ' + DBN[d] + ' | ' + cell(singles(1, res).filter((x) => x.d === d)) + ' | ' + cell(singles(2, res).filter((x) => x.d === d)) + ' |\n';
  for (let e = 0; e < 3; e++) md += '| ' + EBN[e] + ' | ' + cell(singles(1, res).filter((x) => x.e === e)) + ' | ' + cell(singles(2, res).filter((x) => x.e === e)) + ' |\n';
  md += '| part covered (10-30%) | ' + cell(singles(1, res).filter((x) => x.o)) + ' | ' + cell(singles(2, res).filter((x) => x.o)) + ' |\n';
  for (const id of Object.keys(NAMES)) md += '| ' + id + ' ' + NAMES[id] + ' | ' + cell(singles(1, res).filter((x) => x.c[0][0] === id)) + ' | ' + cell(singles(2, res).filter((x) => x.c[0][0] === id)) + ' |\n';
  md += '\nRight-card rate, distance by angle:\n\n| | Set 1: 20-35 | Set 1: 35-55 | Set 1: 55-75 | Set 2: 20-35 | Set 2: 35-55 | Set 2: 55-75 |\n|---|---|---|---|---|---|---|\n';
  for (let d = 0; d < 3; d++) md += '| ' + DBN[d] + ' | ' + [1, 2].map((s) => [0, 1, 2].map((e) => tpOnly(singles(s, res).filter((x) => x.d === d && x.e === e))).join(' | ')).join(' | ') + ' |\n';
  md += '\n'; }
md += '### Same apparent size: right-card rate by how wide the card is in the picture (single-card frames, both resolutions)\n\nThis takes the paper size out of the comparison.\n\n| card width in the picture | Set 1 | Set 2 |\n|---|---|---|\n';
{ const F = 0.9, wpx = (x) => { const s = x.c[0], W = +x.r.split('x')[0]; return (s[0] && 1) * (W * F) * (x.set === 2 ? 148 : 210) / s[3]; }; const bands = [[0, 60], [60, 90], [90, 130], [130, 200], [200, 2000]];
  const all = (s) => R[s].results.filter((x) => x.t === 'single').map((x) => Object.assign({ set: s }, x));
  for (const b of bands) md += '| ' + (b[1] > 1000 ? 'over ' + b[0] + ' px' : b[0] + '-' + b[1] + ' px') + ' | ' + [1, 2].map((s) => tpOnly(all(s).filter((x) => wpx(x) >= b[0] && wpx(x) < b[1]))).join(' | ') + ' |\n'; md += '\n(Width here is the face-on width for that distance, before the tilt squeezes it.)\n\n'; }
md += '### Mistakes\n\n| | Set 1 | Set 2 |\n|---|---|---|\n';
const count = (s, f) => { let n = 0; R[s].results.forEach((x) => x.c.forEach((c) => { if (c[0][0] !== 'D' && f(c, x)) n++; })); return n; };
const total = (s) => count(s, () => true);
md += '| real cards shown (all frame kinds) | ' + total(1) + ' | ' + total(2) + ' |\n';
md += '| named as a different card | ' + count(1, (c) => c[1] === 'wrong') + ' | ' + count(2, (c) => c[1] === 'wrong') + ' |\n';
md += '| right name but upside down (180 degrees) | ' + count(1, (c) => c[1] === 'flipped') + ' | ' + count(2, (c) => c[1] === 'flipped') + ' |\n';
md += '| right name, outline badly placed | ' + count(1, (c) => c[1] === 'badOutline') + ' | ' + count(2, (c) => c[1] === 'badOutline') + ' |\n';
const fr = (s, t, f) => { const L = R[s].results.filter((x) => x.t === t); return L.filter(f).length + ' of ' + L.length; };
md += '| no-card frames with a false sighting | ' + fr(1, 'none', (x) => x.p.length) + ' | ' + fr(2, 'none', (x) => x.p.length) + ' |\n';
md += '| decoy-page frames where something was named | ' + fr(1, 'decoy', (x) => x.p.length || x.c.some((c) => c[2] !== 'none')) + ' | ' + fr(2, 'decoy', (x) => x.p.length || x.c.some((c) => c[2] !== 'none')) + ' |\n';
const multi = (s, res) => { let real = 0, tp = 0, wr = 0; R[s].results.filter((x) => x.t === 'multi' && x.r === res).forEach((x) => x.c.forEach((c) => { if (c[0][0] === 'D') return; real++; if (c[1] === 'tp') tp++; else if (c[1] === 'wrong') wr++; })); return pct(tp, real) + ' / ' + pct(wr, real) + ' / ' + pct(real - tp - wr, real) + ' of ' + real; };
md += '| 2-4 pages at once, 640x480 (right / wrong / missed) | ' + multi(1, '640x480') + ' | ' + multi(2, '640x480') + ' |\n| 2-4 pages at once, 1280x720 | ' + multi(1, '1280x720') + ' | ' + multi(2, '1280x720') + ' |\n';
md += '\n### Outline and pose error (right sightings, single and multi frames)\n\n| | Set 1, 640x480 | Set 2, 640x480 | Set 1, 1280x720 | Set 2, 1280x720 |\n|---|---|---|---|---|\n';
const tps = (s, res) => { const T = []; R[s].results.filter((x) => x.r === res && (x.t === 'single' || x.t === 'multi')).forEach((x) => x.c.forEach((c) => { if (c[1] === 'tp') T.push(c); })); return T; };
const row = (name, f) => { md += '| ' + name + ' | ' + ['640x480', '1280x720'].map((res) => [1, 2].map((s) => f(tps(s, res))).join(' | ')).join(' | ') + ' |\n'; };
row('sightings', (T) => T.length); row('corner error px, median / 90%', (T) => f1(med(T.map((c) => c[5]))) + ' / ' + f1(p90(T.map((c) => c[5])))); row('position error mm, median / 90%', (T) => f1(med(T.map((c) => c[6]))) + ' / ' + f1(p90(T.map((c) => c[6])))); row('tilt-and-turn error deg, median / 90%', (T) => f1(med(T.map((c) => c[7]))) + ' / ' + f1(p90(T.map((c) => c[7]))));
fs.writeFileSync(path.join(DIR, 'tests', 'set-compare.md'), md); console.log(md);
