/* Round Table Kingdom cards: what the recogniser sees in each card's artwork, set by set.
   Run from games/sofa-siege/cards:  node tests/art-stats.js     (writes tests/art-stats.md)
   Corner counts, look-alike corners shared with other cards, and how alike the cards are as small pictures. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readGray } from './png.js';
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CV = new Function(fs.readFileSync(path.join(DIR, 'cardvision.js'), 'utf8') + ';return CV_CARDS;')();
let md = '';
for (const sn of ['1', '2']) { const st = CV.SETS[sn], ids = Object.keys(st.files).sort(), ims = ids.map((id) => ({ id, mm: st.mm, ...readGray(path.join(DIR, st.dir, st.files[id])) }));
  const I = CV.create({ dbMode: 'distinct' }); const stats = I.init(ims); const J = CV.create({ frameLevels: 1, frameCap: 100000, perCell: 1000, fastThr: 16 });
  md += '## ' + st.label + ' (' + st.mm.w + ' x ' + st.mm.h + ' mm)\n\n| Card | corners at 130 px wide | corners at 260 px wide | corners at 520 px wide | database corners with no look-alike in two other cards |\n|---|---|---|---|---|\n';
  for (const m of ims) { const cnt = [130, 260, 520].map((W) => { const r = CV.util.resizeArea({ d: m.gray, w: m.w, h: m.h }, W, Math.round(W * m.h / m.w)), pad = 24, w = r.w + 2 * pad, h = r.h + 2 * pad, d = new Uint8Array(w * h).fill(250); for (let y = 0; y < r.h; y++) d.set(r.d.subarray(y * r.w, (y + 1) * r.w), (y + pad) * w + pad); return J.extract(d, w, h).n; }); md += '| ' + m.id + ' ' + CV.NAMES[m.id] + ' | ' + cnt.join(' | ') + ' | ' + stats['kept' + m.id] + ' |\n'; }
  /* whole-picture likeness at 84 x 60, lightly blurred (Pearson r), and each card against itself turned 180 degrees */
  const small = ims.map((m) => { const r = CV.util.resizeArea({ d: m.gray, w: m.w, h: m.h }, 84, 60); return Float32Array.from(r.d); });
  const pear = (a, b) => { let ma = 0, mb = 0; for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; } ma /= a.length; mb /= a.length; let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { s += (a[i] - ma) * (b[i] - mb); sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; } return s / Math.sqrt(sa * sb); };
  md += '\nWhole-card likeness at 84 x 60 pixels (1 = the same picture; lower is better between different cards). Last column: the card against itself turned 180 degrees.\n\n| | ' + ids.join(' | ') + ' | turned 180 |\n|---|' + ids.map(() => '---').join('|') + '|---|\n';
  ims.forEach((m, a) => { md += '| ' + m.id + ' ' + CV.NAMES[m.id] + ' | ' + ims.map((_, b) => pear(small[a], small[b]).toFixed(2)).join(' | ') + ' | ' + pear(small[a], Float32Array.from(small[a]).reverse()).toFixed(2) + ' |\n'; });
  md += '\nCell-by-cell likeness (mean over the 8 x 6 cells the identity check uses; this is what the recogniser has to tell apart):\n\n| | ' + ids.join(' | ') + ' |\n|---|' + ids.map(() => '---').join('|') + '|\n'; I.pairNcc.forEach((row, a) => { md += '| ' + ids[a] + ' | ' + row.map((v) => v.toFixed(2)).join(' | ') + ' |\n'; });
  md += '\nWhere the cards differ (0 = this cell looks the same on every card, 1 = quite different). Top row of the table = top of the card.\n\n```\n'; for (let y = 0; y < 6; y++) md += Array.from(I.cellW[1].slice(y * 8, y * 8 + 8)).map((v) => v.toFixed(2)).join('  ') + '\n'; md += '```\n\n';
}
fs.writeFileSync(path.join(DIR, 'tests', 'art-stats.md'), md); console.log(md);
