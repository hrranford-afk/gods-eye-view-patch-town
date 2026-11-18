/* Round Table Kingdom cards: the offline recognition experiment.
   Run from games/sofa-siege/cards:   node tests/recognise-test.js            (full run, about 15 minutes, one core)
                                      node tests/recognise-test.js --quick    (a sixth of the frames)
   Options: --seed N (default 20261118; the thresholds were tuned on seed 7, not on the default)
            --variants   also compare the four ways of telling the cards apart, on a subset
            --sheet      write shots/recognise-examples.png
   Everything here is MADE-UP camera frames (synth.js). Nothing here is a real camera or a real print. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readGray, writePNG } from './png.js';
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (f, name) => new Function(fs.readFileSync(path.join(DIR, f), 'utf8') + ';return ' + name + ';')();
const CV = load('cardvision.js', 'CV_CARDS'), SY = load('synth.js', 'CARD_SYNTH');
const args = process.argv.slice(2), has = (a) => args.includes(a), val = (a, d) => { const i = args.indexOf(a); return i >= 0 ? +args[i + 1] : d; };
const SETARG = args.includes('--set') ? args[args.indexOf('--set') + 1] : '1', MIXED = SETARG === 'mixed';
const SEED = val('--seed', 20261118), QUICK = has('--quick'), REPS = QUICK ? 1 : val('--reps', MIXED ? 2 : 6), EXTRA = QUICK ? 12 : 60;
const DB = [[0.4, 0.7], [0.7, 1.0], [1.0, 1.5]], EB = [[20, 35], [35, 55], [55, 75]], RES = [[640, 480], [1280, 720]];
const ims = []; for (const sn of (MIXED ? ['1', '2'] : [SETARG])) { const st = CV.SETS[sn]; for (const id of Object.keys(st.files).sort()) ims.push({ id: MIXED ? 'S' + sn + '-' + id : id, mm: has('--a5') ? { w: 210, h: 148.5 } : st.mm, ...readGray(path.join(DIR, st.dir, st.files[id])) }); }
const IDS = ims.map((m) => m.id), MM = {}, NAME = (id) => (MIXED ? 'set ' + id[1] + ' ' : '') + CV.NAMES[id.slice(-2)];
const lib = {}; ims.forEach((m) => { lib[m.id] = SY.mips({ d: m.gray, w: m.w, h: m.h }); MM[m.id] = m.mm; });
const decoys = SY.makeDecoys(ims.slice(0, 6), 99); decoys.forEach((m) => { lib[m.id] = SY.mips({ d: m.gray, w: m.w, h: m.h }); MM[m.id] = ims[0].mm; });
console.log('card set', SETARG, 'sizes mm', JSON.stringify(ims[0].mm), MIXED ? JSON.stringify(ims[6].mm) : '');
const t0 = Date.now(); const initStats = CV.init(ims); console.log('database built in', Date.now() - t0, 'ms; features per card', initStats.dbSizes.join(' '));
const VF = 'F corners + paper outline, dense check names the card (THE DEFAULT)';
const variants = has('--variants') ? { 'A corners: all, most inliers names the card': CV.create({ dbMode: 'all', idMode: 'inliers', quads: false }), 'B corners: distinct ones only, most inliers names the card': CV.create({ dbMode: 'distinct', idMode: 'inliers', quads: false }), 'C corners: all, dense check names the card': CV.create({ quads: false }), 'D corners: title + centre drawing only, most inliers names the card': CV.create({ dbMode: 'region', idMode: 'inliers', quads: false }), 'E paper outline only, dense check names the card': CV.create({ features: false }) } : {};
for (const k in variants) { const st = variants[k].init(ims); console.log(k, JSON.stringify(st)); }

/* ---------- the frame list (fixed by the seed) ---------- */
const frames = []; const r = SY.rng(SEED);
for (const [w, h] of RES) {
  for (const id of IDS) for (let d = 0; d < 3; d++) for (let e = 0; e < 3; e++) for (let k = 0; k < REPS; k++) { const sc = SY.singleScene(r, w, h, id, DB[d], EB[e], MM[id]); if (!sc) continue; const occ = (k % 4 === 3) || (QUICK && r() < 0.25); if (occ) sc.cards[0].occlWant = 0.1 + 0.2 * r(); frames.push({ type: 'single', w, h, sc, seed: (r() * 2 ** 31) | 0, d, e, occ, k }); }
  for (let k = 0; k < EXTRA; k++) frames.push({ type: 'none', w, h, sc: SY.emptyScene(r, w, h), seed: (r() * 2 ** 31) | 0 });
  for (let k = 0; k < EXTRA; k++) { const sc = SY.singleScene(r, w, h, ['D1', 'D2', 'D3'][k % 3], DB[k % 2], EB[1 + (k % 2)], MM.D1); if (sc) frames.push({ type: 'decoy', w, h, sc, seed: (r() * 2 ** 31) | 0 }); }
  for (let k = 0; k < EXTRA; k++) { const n = 2 + (k % 3), pool = IDS.slice().sort(() => r() - 0.5).slice(0, n); if (k % 4 === 3) pool[0] = ['D1', 'D2'][(k >> 2) & 1]; const sc = SY.multiScene(r, w, h, pool, (id) => MM[id]); if (sc) frames.push({ type: 'multi', w, h, sc, seed: (r() * 2 ** 31) | 0 }); }
}
console.log(frames.length, 'frames');

/* ---------- scoring one frame ---------- */
const inQuad = (q, x, y) => { for (let k = 0; k < 4; k++) { const a = q[k], b = q[(k + 1) % 4]; if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false; } return true; };
const centre = (q) => [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4];
const rotErr = (A, B) => { let tr = 0; for (let i = 0; i < 9; i++) tr += A[i] * B[i]; return Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2))) * 180 / Math.PI; };
function score(dets, truth, intr) {
  const used = new Set(), cards = [];
  for (const t of truth) { const wpx = (Math.hypot(t.corners[1][0] - t.corners[0][0], t.corners[1][1] - t.corners[0][1]) + Math.hypot(t.corners[2][0] - t.corners[3][0], t.corners[2][1] - t.corners[3][1])) / 2;
    const here = dets.map((d, i) => ({ d, i })).filter((o) => { const c = centre(o.d.corners); return inQuad(t.corners, c[0], c[1]); });
    const o = { id: t.id, decoy: t.id[0] === 'D', dist: t.dist, elev: t.elev, occl: t.occl, wpx, outcome: 'miss', got: 'none' };
    const same = here.find((x) => x.d.id === t.id);
    if (same) { const errs = same.d.corners.map((p, i) => Math.hypot(p[0] - t.corners[i][0], p[1] - t.corners[i][1])), mean = errs.reduce((a, b) => a + b, 0) / 4; used.add(same.i);
      if (mean < 0.15 * wpx) { o.outcome = 'tp'; o.got = t.id; o.cornerMean = mean; o.cornerMax = Math.max(...errs); o.inliers = same.d.inliers; o.score = same.d.score; o.glob = same.d.glob; o.margin = same.d.margin; o.all = same.d.all; o.via = same.d.via; const p = CV.pose(same.d, intr); if (p) { o.reproj = p.reproj_px; o.tErr = Math.hypot(p.t[0] - t.t[0], p.t[1] - t.t[1], p.t[2] - t.t[2]); o.dErr = Math.abs(p.distance_mm - t.dist); o.rErr = rotErr(p.R, t.R); } }
      else { const e2 = same.d.corners.map((p, i) => Math.hypot(p[0] - t.corners[(i + 2) % 4][0], p[1] - t.corners[(i + 2) % 4][1])).reduce((a, b) => a + b, 0) / 4; o.outcome = e2 < 0.15 * wpx ? 'flipped' : 'badOutline'; o.got = t.id; } }
    else if (here.length) { o.outcome = 'wrong'; o.got = here[0].d.id; o.bad = here[0].d; here.forEach((x) => used.add(x.i)); }
    cards.push(o); }
  if (has('--dev')) { cards.forEach((c) => { if (c.outcome === 'tp') console.log('DEV TP', c.via, 'wpx', c.wpx | 0, 'sc', c.score.toFixed(2), 'gl', c.glob.toFixed(2), 'mg', c.margin.toFixed(2), 'all', c.all.toFixed(2)); else if (c.bad) console.log('DEV WRONG', c.id, '->', c.got, c.bad.via, 'sc', c.bad.score.toFixed(2), 'gl', c.bad.glob.toFixed(2), 'mg', c.bad.margin.toFixed(2), 'all', c.bad.all.toFixed(2)); }); dets.filter((d, i) => !used.has(i)).forEach((d) => console.log('DEV PHANTOM', d.id, d.via, 'sc', d.score.toFixed(2), 'gl', d.glob.toFixed(2), 'mg', d.margin.toFixed(2), 'all', d.all.toFixed(2), 'inl', d.inliers)); }
  return { cards, phantoms: dets.filter((d, i) => !used.has(i)).map((d) => d.id) };
}

/* ---------- run ---------- */
const SHEET_ONLY = has('--sheet-only');
const results = [], times = { '640x480': [], '1280x720': [] }, vres = {}, sheet = [], wantSheet = has('--sheet');
let done = 0; const tRun = Date.now();
const WANT = [['1280x720', 0, 2, 0], ['1280x720', 1, 1, 3], ['1280x720', 2, 0, 1], ['1280x720', 2, 2, 2], ['1280x720', 1, 0, 4], ['640x480', 0, 1, 5], ['640x480', 1, 2, 3], ['640x480', 2, 1, 0]];
{ const cnt = {}; frames.forEach((f) => { const key = f.w + 'x' + f.h; if (f.type === 'single') { const wi = WANT.findIndex((q) => q[0] === key && q[1] === f.d && q[2] === f.e && IDS[q[3] % IDS.length] === f.sc.cards[0].id); if (wi >= 0 && !cnt['s' + wi]) { cnt['s' + wi] = 1; f.sheet = true; } } else { const k2 = f.type + key; cnt[k2] = (cnt[k2] || 0) + 1; if ((f.type === 'multi' && ((key === '1280x720' && cnt[k2] <= 2) || (key === '640x480' && cnt[k2] === 2))) || (f.type === 'decoy' && key === '1280x720' && cnt[k2] === 1)) f.sheet = true; } }); }
for (const f of frames) {
  if (SHEET_ONLY && !f.sheet) continue;
  const img = SY.render(f.sc, lib, f.seed), key = f.w + 'x' + f.h;
  const ta = performance.now(), fr = CV.extract(img.gray, f.w, f.h), dets = CV.detectFr(fr), ms = performance.now() - ta; times[key].push(ms);
  const sc = score(dets, f.sc.cards, f.sc.cam.intr); results.push({ type: f.type, res: key, d: f.d, e: f.e, occ: !!f.occ, blur: img.blur, cards: sc.cards, phantoms: sc.phantoms });
  if (Object.keys(variants).length && ((f.type === 'single' && f.k % 2 === 0) || f.type === 'decoy' || f.type === 'none')) { for (const k in variants) { const dv = variants[k].detectFr(fr), sv = score(dv, f.sc.cards, f.sc.cam.intr); (vres[k] = vres[k] || []).push({ type: f.type, res: key, cards: sv.cards, phantoms: sv.phantoms }); } (vres[VF] = vres[VF] || []).push({ type: f.type, res: key, cards: sc.cards, phantoms: sc.phantoms }); }
  if ((wantSheet || SHEET_ONLY) && f.sheet) sheet.push({ img, f, dets, sc });
  if (++done % 50 === 0) console.log(done, '/', frames.length, ((Date.now() - tRun) / 1000).toFixed(0) + ' s');
}

/* ---------- tables ---------- */
const pct = (a, b) => b ? (100 * a / b).toFixed(0) + '%' : 'n/a', med = (a) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[(s.length / 2) | 0]; }, p90 = (a) => { if (!a.length) return NaN; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, (s.length * 0.9) | 0)]; }, f1 = (v) => isNaN(v) ? 'n/a' : v.toFixed(1);
let md = '';
const out = (s) => { md += s + '\n'; };
const singles = results.filter((x) => x.type === 'single');
const rate = (list) => { const n = list.length, tp = list.filter((x) => x.cards[0].outcome === 'tp').length, wr = list.filter((x) => x.cards[0].outcome === 'wrong').length, bo = list.filter((x) => x.cards[0].outcome === 'badOutline' || x.cards[0].outcome === 'flipped').length; return { n, tp, wr, bo, miss: n - tp - wr - bo }; };
const cell = (list) => { const q = rate(list); return q.n ? pct(q.tp, q.n) + ' / ' + pct(q.wr, q.n) + ' / ' + pct(q.miss + q.bo, q.n) : 'n/a'; };
out('Card set: ' + SETARG + (MIXED ? ' (both sets in one database, 12 cards)' : ' (' + ims[0].mm.w + ' x ' + ims[0].mm.h + ' mm)') + '. Seed ' + SEED + ', ' + frames.length + ' frames' + (QUICK ? ' (QUICK run)' : '') + '. Each cell: right card / wrong card / missed (a right name on a badly placed or upside-down outline counts as missed).\n');
for (const [w, h] of RES) { const key = w + 'x' + h, S = singles.filter((x) => x.res === key);
  out('### One card in view, ' + key + ' (' + S.length + ' frames)\n'); out('| Card | all | 0.4-0.7 m | 0.7-1.0 m | 1.0-1.5 m | 20-35 deg | 35-55 deg | 55-75 deg |'); out('|---|---|---|---|---|---|---|---|');
  for (const id of IDS.concat(['ALL'])) { const L = S.filter((x) => id === 'ALL' || x.cards[0].id === id); out('| ' + (id === 'ALL' ? '**all cards**' : id + ' ' + NAME(id)) + ' | ' + cell(L) + ' | ' + [0, 1, 2].map((d) => cell(L.filter((x) => x.d === d))).join(' | ') + ' | ' + [0, 1, 2].map((e) => cell(L.filter((x) => x.e === e))).join(' | ') + ' |'); }
  out('\nRight-card rate by distance (rows) and camera height angle (columns), all six cards:\n'); out('| | 20-35 deg | 35-55 deg | 55-75 deg |'); out('|---|---|---|---|'); for (let d = 0; d < 3; d++) out('| ' + DB[d][0] + '-' + DB[d][1] + ' m | ' + [0, 1, 2].map((e) => { const q = rate(S.filter((x) => x.d === d && x.e === e)); return pct(q.tp, q.n) + ' (' + q.tp + '/' + q.n + ')'; }).join(' | ') + ' |');
  const occ = rate(S.filter((x) => x.occ)), noc = rate(S.filter((x) => !x.occ)); out('\nPart-covered cards (10-30% hidden): right ' + pct(occ.tp, occ.n) + ' of ' + occ.n + '. Uncovered: right ' + pct(noc.tp, noc.n) + ' of ' + noc.n + '.\n');
}
out('### Confusion matrix (rows: the card really shown; columns: what the detector said at that spot)\n');
for (const grp of [['single', 'one card in view, both resolutions'], ['multi', 'two to four pages in view, both resolutions']]) { const L = results.filter((x) => x.type === grp[0]); out('**' + grp[1] + '**\n'); out('| shown \\ said | ' + IDS.join(' | ') + ' | nothing | upside down | bad outline |'); out('|---|' + IDS.map(() => '---').join('|') + '|---|---|---|');
  for (const id of IDS) { const row = IDS.map(() => 0); let none = 0, bad = 0, flip = 0; L.forEach((x) => x.cards.forEach((c) => { if (c.id !== id) return; if (c.outcome === 'flipped') flip++; else if (c.outcome === 'badOutline') bad++; else if (c.got === 'none') none++; else row[IDS.indexOf(c.got)]++; })); out('| ' + id + ' ' + NAME(id) + ' | ' + row.join(' | ') + ' | ' + none + ' | ' + flip + ' | ' + bad + ' |'); } out(''); }
{ let fl = 0, tot = 0, viaQ = 0, tpAll = 0; results.forEach((x) => x.cards.forEach((c) => { if (c.decoy) return; tot++; if (c.outcome === 'flipped') fl++; if (c.outcome === 'tp') { tpAll++; if (c.via === 'outline') viaQ++; } })); out('**Upside-down (180 degree) mistakes: ' + fl + ' of ' + tot + ' cards shown.** Of the ' + tpAll + ' right sightings, ' + viaQ + ' came from the paper-outline finder and ' + (tpAll - viaQ) + ' from corner matching.\n'); }
out('### Frames that should give nothing\n'); out('| Kind | res | frames | frames with any false sighting | what was claimed |'); out('|---|---|---|---|---|');
for (const [w, h] of RES) { const key = w + 'x' + h;
  const none = results.filter((x) => x.type === 'none' && x.res === key), nf = none.filter((x) => x.phantoms.length); out('| no card, wood or clutter | ' + key + ' | ' + none.length + ' | ' + nf.length + ' (' + pct(nf.length, none.length) + ') | ' + (nf.map((x) => x.phantoms.join('+')).join(', ') || '-') + ' |');
  const dec = results.filter((x) => x.type === 'decoy' && x.res === key), df = dec.filter((x) => x.phantoms.length || x.cards.some((c) => c.got !== 'none')); out('| a different printed page (decoy) | ' + key + ' | ' + dec.length + ' | ' + df.length + ' (' + pct(df.length, dec.length) + ') | ' + (df.map((x) => x.cards.map((c) => c.id + '->' + c.got).join('+') + (x.phantoms.length ? ' phantom ' + x.phantoms.join('+') : '')).join(', ') || '-') + ' |');
  const mul = results.filter((x) => x.type === 'multi' && x.res === key); let real = 0, tp = 0, wr = 0, dcy = 0, dacc = 0, ph = 0; mul.forEach((x) => { ph += x.phantoms.length; x.cards.forEach((c) => { if (c.decoy) { dcy++; if (c.got !== 'none') dacc++; } else { real++; if (c.outcome === 'tp') tp++; else if (c.outcome === 'wrong') wr++; } }); });
  out('| 2-4 pages at once (' + real + ' real cards, ' + dcy + ' decoys) | ' + key + ' | ' + mul.length + ' | right ' + pct(tp, real) + ', wrong ' + pct(wr, real) + ', missed ' + pct(real - tp - wr, real) + ' | decoys named as a card: ' + dacc + '; sightings away from any page: ' + ph + ' |'); }
const allSingleMulti = results.filter((x) => x.type === 'single' || x.type === 'multi'); let phAll = 0; allSingleMulti.forEach((x) => { phAll += x.phantoms.length; }); out('\nSightings away from any page in the single and multi frames: ' + phAll + ' in ' + allSingleMulti.length + ' frames.\n');
out('### How exact the outline and the pose are (right-card sightings only)\n'); out('| res | distance | sightings | corner error px: median / 90% / worst | position error mm: median / 90% | distance error mm: median / 90% | tilt-and-turn error deg: median / 90% |'); out('|---|---|---|---|---|---|---|');
for (const [w, h] of RES) { const key = w + 'x' + h; for (let d = 0; d <= 3; d++) { const T = []; results.filter((x) => x.res === key && (x.type === 'single' || x.type === 'multi')).forEach((x) => x.cards.forEach((c) => { if (c.outcome === 'tp' && (d === 3 || (c.dist / 1000 >= DB[d][0] && c.dist / 1000 < DB[d][1]))) T.push(c); }));
  out('| ' + key + ' | ' + (d === 3 ? 'all' : DB[d][0] + '-' + DB[d][1] + ' m') + ' | ' + T.length + ' | ' + f1(med(T.map((c) => c.cornerMean))) + ' / ' + f1(p90(T.map((c) => c.cornerMean))) + ' / ' + f1(Math.max(...T.map((c) => c.cornerMax), 0)) + ' | ' + f1(med(T.map((c) => c.tErr))) + ' / ' + f1(p90(T.map((c) => c.tErr))) + ' | ' + f1(med(T.map((c) => c.dErr))) + ' / ' + f1(p90(T.map((c) => c.dErr))) + ' | ' + f1(med(T.map((c) => c.rErr))) + ' / ' + f1(p90(T.map((c) => c.rErr))) + ' |'); } }
out('\n### Time per frame in Node on this machine (one core; see the Chromium numbers in the report)\n'); for (const k in times) out('- ' + k + ': median ' + f1(med(times[k])) + ' ms, 90% ' + f1(p90(times[k])) + ' ms over ' + times[k].length + ' frames');
if (Object.keys(vres).length) { out('\n### Six ways of finding and naming the cards (single-card, decoy and no-card frames)\n'); out('| Way | res | right card | wrong card | missed | decoy pages named as a card | no-card frames with a sighting |'); out('|---|---|---|---|---|---|---|');
  for (const k of Object.keys(vres).sort()) for (const [w, h] of RES) { const key = w + 'x' + h, V = vres[k].filter((x) => x.res === key), S2 = V.filter((x) => x.type === 'single'), q = rate(S2), D2 = V.filter((x) => x.type === 'decoy'), da = D2.filter((x) => x.cards.some((c) => c.got !== 'none') || x.phantoms.length).length, N2 = V.filter((x) => x.type === 'none'), na = N2.filter((x) => x.phantoms.length).length; out('| ' + k + ' | ' + key + ' | ' + pct(q.tp, q.n) + ' (' + q.tp + '/' + q.n + ') | ' + pct(q.wr, q.n) + ' (' + q.wr + ') | ' + pct(q.miss + q.bo, q.n) + ' | ' + da + '/' + D2.length + ' | ' + na + '/' + N2.length + ' |'); } }
if (!SHEET_ONLY) {
console.log('\n' + md);
const tag = 'set' + SETARG + (has('--a5') ? 'a5' : '') + '-' + (QUICK ? 'quick' : 'full') + (args.includes('--tag') ? '-' + args[args.indexOf('--tag') + 1] : '');
fs.writeFileSync(path.join(DIR, 'tests', 'results-' + tag + '-seed' + SEED + '.md'), md);
fs.writeFileSync(path.join(DIR, 'tests', 'results-' + tag + '-seed' + SEED + '.json'), JSON.stringify({ seed: SEED, quick: QUICK, frames: frames.length, node: process.version, opt: CV.opt, results: results.map((x) => ({ t: x.type, r: x.res, d: x.d, e: x.e, o: x.occ ? 1 : 0, c: x.cards.map((c) => [c.id, c.outcome, c.got, Math.round(c.dist), Math.round(c.elev), c.cornerMean === undefined ? null : +c.cornerMean.toFixed(2), c.tErr === undefined ? null : +c.tErr.toFixed(1), c.rErr === undefined ? null : +c.rErr.toFixed(2), c.score === undefined ? null : +c.score.toFixed(2)]), p: x.phantoms })) }));

}
/* ---------- the contact sheet ---------- */
if ((wantSheet || SHEET_ONLY) && sheet.length) {
  const TW = 480, TH = 270, cols = 4, rows = Math.ceil(sheet.length / cols), W = TW * cols, H = TH * rows, px = new Uint8Array(W * H * 3).fill(24);
  const G = { '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111', '.': '000000000000010', 'm': '000000111111101', 'D': '110101101101110', 'x': '000101010101000', '-': '000000111000000', '?': '111001011000010', ' ': '000000000000000' };
  const dot = (x, y, c) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; };
  const text = (s, x, y, c, k) => { for (const ch of s) { const g = G[ch] || G['?']; for (let j = 0; j < 15; j++) if (g[j] === '1') for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) { dot(x + (j % 3) * k + a + 1, y + ((j / 3) | 0) * k + b + 1, [0, 0, 0]); } for (let j = 0; j < 15; j++) if (g[j] === '1') for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) dot(x + (j % 3) * k + a, y + ((j / 3) | 0) * k + b, c); x += 4 * k; } };
  const line = (a, b, c, th) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])) + 1; for (let i = 0; i <= n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n; for (let u = 0; u < th; u++) for (let v = 0; v < th; v++) dot(x + u, y + v, c); } };
  sheet.forEach((s, n) => { const ox = (n % cols) * TW, oy = ((n / cols) | 0) * TH, k = Math.min(TW / s.img.w, TH / s.img.h), w2 = Math.round(s.img.w * k), h2 = Math.round(s.img.h * k), small = CV.util.resizeArea({ d: s.img.gray, w: s.img.w, h: s.img.h }, w2, h2), dx = ox + ((TW - w2) >> 1), dy = oy + ((TH - h2) >> 1);
    for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) { const v = small.d[y * w2 + x]; dot(dx + x, dy + y, [v, v, v]); }
    const P = (p) => [dx + p[0] * k, dy + p[1] * k];
    s.sc.cards.forEach((c) => { if (c.outcome !== 'tp') { const t = s.f.sc.cards.find((q) => q.id === c.id); for (let i = 0; i < 4; i++) line(P(t.corners[i]), P(t.corners[(i + 1) % 4]), c.decoy ? [90, 160, 255] : [255, 170, 0], 1); const ce = P(centre(t.corners)); text(c.decoy ? c.id : c.id.slice(-2) + '?', ce[0] - 10, ce[1] + 8, c.decoy ? [90, 160, 255] : [255, 170, 0], 2); } });
    s.dets.forEach((d) => { const t = s.sc.cards.find((c) => c.outcome === 'tp' && c.id === d.id), col = t ? [60, 230, 90] : [255, 60, 60]; for (let i = 0; i < 4; i++) line(P(d.corners[i]), P(d.corners[(i + 1) % 4]), col, 2); line(P(d.corners[0]), P(d.corners[1]), [255, 255, 255], 1); const ce = P(centre(d.corners)); text(d.id.slice(-2), ce[0] - 10, ce[1] - 8, col, 3); });
    const c0 = s.f.sc.cards[0]; text(s.f.w + 'x' + s.f.h + (c0 ? ' ' + (c0.dist / 1000).toFixed(1) + 'm ' + Math.round(c0.elev) : ''), ox + 6, oy + 6, [255, 255, 120], 2); });
  fs.mkdirSync(path.join(DIR, 'shots'), { recursive: true }); writePNG(path.join(DIR, 'shots', 'recognise-examples-set' + SETARG + (has('--a5') ? 'a5' : '') + '.png'), px, W, H, 3); console.log('wrote shots/recognise-examples-set' + SETARG + '.png');
}
