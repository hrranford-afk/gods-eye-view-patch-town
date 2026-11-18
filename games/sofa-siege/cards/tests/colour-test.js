/* Round Table Kingdom cards: does a simple colour cue help the colour set (2b in colour)?
   Run from games/sofa-siege/cards:   node tests/colour-test.js        (about 20 minutes on one core; writes tests/colour-results.md)
   The recogniser still works on a GREY picture. The cue is the main hue of the coloured parts inside a found outline,
   after balancing to the card's own paper white (CV_CARDS.colourCue). It is tried in three lights:
     neutral light, colour print  |  warm lamp, colour print  |  neutral light, the colour file printed on a grey-only printer.
   Made-up frames only. NOT TESTED on a real camera or print. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readRGB } from './png.js';
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (f, name) => new Function(fs.readFileSync(path.join(DIR, f), 'utf8') + ';return ' + name + ';')();
const CV = load('cardvision.js', 'CV_CARDS'), SY = load('synth.js', 'CARD_SYNTH');
const args = process.argv.slice(2), QUICK = args.includes('--quick'), SEED = 20261118, st = CV.SETS['2bc'], IDS = Object.keys(st.files).sort();
const rgb = IDS.map((id) => ({ id, ...readRGB(path.join(DIR, st.dir, st.files[id])) }));
const lum = (m) => { const g = new Uint8Array(m.w * m.h); for (let i = 0; i < g.length; i++) g[i] = (m.r[i] * 77 + m.g[i] * 150 + m.b[i] * 29) >> 8; return g; };
const grey = rgb.map((m) => ({ id: m.id, mm: st.mm, gray: lum(m), w: m.w, h: m.h }));
CV.init(grey); console.log('card hues (degrees):', JSON.stringify(CV.initColour(rgb)));
const mkLib = (pick) => { const ims = rgb.map((m, i) => ({ id: m.id, gray: pick(m, i), w: m.w, h: m.h })), lib = {}; ims.forEach((m) => { lib[m.id] = SY.mips({ d: m.gray, w: m.w, h: m.h }); }); SY.makeDecoys(ims, 99).forEach((m) => { lib[m.id] = SY.mips({ d: m.gray, w: m.w, h: m.h }); }); return lib; };
const LIB = { r: mkLib((m) => m.r), g: mkLib((m) => m.g), b: mkLib((m) => m.b), y: mkLib((m, i) => grey[i].gray) };
const LIGHTS = [{ name: 'neutral light, colour print', tint: [1, 1, 1], libs: ['r', 'g', 'b'] }, { name: 'warm lamp, colour print', tint: [1, 0.82, 0.55], libs: ['r', 'g', 'b'] }, { name: 'neutral light, printed grey', tint: [1, 1, 1], libs: ['y', 'y', 'y'] }];
const DB = [[0.4, 0.7], [0.7, 1.0], [1.0, 1.5]], EB = [[20, 35], [35, 55], [55, 75]], RES = [[640, 480], [1280, 720]], REPS = QUICK ? 1 : 2, EXTRA = QUICK ? 6 : 30;
const frames = [], r = SY.rng(SEED);
for (const [w, h] of RES) { for (const id of IDS) for (let d = 0; d < 3; d++) for (let e = 0; e < 3; e++) for (let k = 0; k < REPS; k++) { const sc = SY.singleScene(r, w, h, id, DB[d], EB[e], st.mm); if (sc) frames.push({ type: 'single', w, h, sc, seed: (r() * 2 ** 31) | 0 }); }
  for (let k = 0; k < EXTRA; k++) frames.push({ type: 'none', w, h, sc: SY.emptyScene(r, w, h), seed: (r() * 2 ** 31) | 0 });
  for (let k = 0; k < EXTRA; k++) { const sc = SY.singleScene(r, w, h, ['D1', 'D2', 'D3'][k % 3], DB[k % 2], EB[1 + (k % 2)], st.mm); if (sc) frames.push({ type: 'decoy', w, h, sc, seed: (r() * 2 ** 31) | 0 }); }
  for (let k = 0; k < EXTRA; k++) { const pool = IDS.slice().sort(() => r() - 0.5).slice(0, 2 + (k % 3)); const sc = SY.multiScene(r, w, h, pool, () => st.mm); if (sc) frames.push({ type: 'multi', w, h, sc, seed: (r() * 2 ** 31) | 0 }); } }
console.log(frames.length, 'frames x', LIGHTS.length, 'lights');
const inQuad = (q, x, y) => { for (let k = 0; k < 4; k++) { const a = q[k], b = q[(k + 1) % 4]; if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false; } return true; };
const centre = (q) => [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4];
const onCard = (d, truth) => { const c = centre(d.corners); for (const t of truth) { if (!inQuad(t.corners, c[0], c[1])) continue; const wpx = Math.hypot(t.corners[1][0] - t.corners[0][0], t.corners[1][1] - t.corners[0][1]), err = d.corners.map((p, i) => Math.hypot(p[0] - t.corners[i][0], p[1] - t.corners[i][1])).reduce((a, b) => a + b, 0) / 4; return { t, good: err < 0.15 * wpx, wpx }; } return null; };
const O = CV.opt, noiseR = SY.rng(4242), gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += noiseR(); return (u - 3) * 1.4142; };
let md = '';
const out = (s) => { md += s + '\n'; console.log(s); };
out('Colour set: ' + st.label + '. Seed ' + SEED + ', ' + frames.length + ' frames in each light (' + frames.filter((f) => f.type === 'single').length + ' single-card, ' + frames.filter((f) => f.type === 'multi').length + ' multi-page, ' + frames.filter((f) => f.type === 'decoy').length + ' decoy, ' + frames.filter((f) => f.type === 'none').length + ' no-card). Made-up frames.\n');
out('The rule tried ("colour-assisted"): keep every grey sighting as it is. In addition, take back a near-miss (a candidate the grey check turned down with at least 80% of the needed scores) when the hue inside it is within 15 degrees of that card\'s own hue and at least 10 degrees clearer than the next card\'s hue. And count how often the hue disagrees with a grey sighting.\n');
out('| Light | real cards shown | grey: right / wrong / missed | hue could be read on right sightings | of those, hue agrees with the card | hue points to another card | near-misses taken back: right | near-misses taken back: WRONG | with colour: right / wrong / missed | false sightings on decoy + no-card frames (grey -> with colour) |'); out('|---|---|---|---|---|---|---|---|---|---|');
const detail = {};
for (const L of LIGHTS) { let shown = 0, tp = 0, wrong = 0, read = 0, agree = 0, other = 0, resR = 0, resW = 0, falseG = 0, falseC = 0; const byW = {}; let done = 0; const t0 = Date.now();
  for (const f of frames) { const ch = L.libs.map((k) => SY.render(f.sc, LIB[k], f.seed)), n = f.w * f.h, R = new Uint8Array(n), G = new Uint8Array(n), B = new Uint8Array(n), Y = new Uint8Array(n);
    for (let i = 0; i < n; i++) { const a = ch[0].gray[i] * L.tint[0] + 2.5 * gauss(), b = ch[1].gray[i] * L.tint[1] + 2.5 * gauss(), c = ch[2].gray[i] * L.tint[2] + 2.5 * gauss(); R[i] = a < 0 ? 0 : a > 255 ? 255 : a; G[i] = b < 0 ? 0 : b > 255 ? 255 : b; B[i] = c < 0 ? 0 : c > 255 ? 255 : c; Y[i] = (R[i] * 77 + G[i] * 150 + B[i] * 29) >> 8; }
    const dets = CV.detect(Y, f.w, f.h), rej = CV.stats.rejected.slice(), src = { r: R, g: G, b: B }, truth = f.sc.cards, real = truth.filter((t) => t.id[0] !== 'D'); shown += real.length;
    const got = new Set();
    for (const d of dets) { const oc = onCard(d, truth); if (oc && oc.good && oc.t.id === d.id) { tp++; got.add(d.id); const q = CV.colourCue(d, src, f.w, f.h), band = oc.wpx < 80 ? 'under 80 px' : oc.wpx < 130 ? '80-130 px' : oc.wpx < 200 ? '130-200 px' : 'over 200 px'; byW[band] = byW[band] || { n: 0, read: 0, agree: 0 }; byW[band].n++; if (q && q.hue_deg !== null) { read++; byW[band].read++; if (q.best === d.id) { agree++; byW[band].agree++; } else other++; } }
      else { if (real.length && oc && oc.t.id[0] !== 'D') wrong++; if (f.type === 'none' || f.type === 'decoy') { falseG++; falseC++; } } }
    for (const c of rej) { if (!c.H) continue; const thrS = c.via === 'outline' ? O.quadNccMin : O.nccMin, thrG = c.via === 'outline' ? O.quadGlobMin : O.globMin; if (c.score < 0.8 * thrS || (c.glob || 0) < 0.8 * thrG || got.has(c.id)) continue;
      const q = CV.colourCue(c, src, f.w, f.h); if (!q || q.hue_deg === null || q.best !== c.id || q.best_diff_deg > 15 || q.runner_up_diff_deg < q.best_diff_deg + 10) continue;
      const oc = onCard(c, truth); if (oc && oc.good && oc.t.id === c.id) { resR++; got.add(c.id); } else { resW++; if (f.type === 'none' || f.type === 'decoy') falseC++; } }
    if (++done % 50 === 0) console.error(L.name, done, '/', frames.length, ((Date.now() - t0) / 1000 | 0) + ' s'); }
  const pc = (a, b) => b ? Math.round(100 * a / b) + '%' : 'n/a';
  out('| ' + L.name + ' | ' + shown + ' | ' + pc(tp, shown) + ' / ' + pc(wrong, shown) + ' / ' + pc(shown - tp - wrong, shown) + ' | ' + read + ' of ' + tp + ' (' + pc(read, tp) + ') | ' + agree + ' of ' + read + ' (' + pc(agree, read) + ') | ' + other + ' | ' + resR + ' | ' + resW + ' | ' + pc(tp + resR, shown) + ' / ' + pc(wrong + resW, shown) + ' / ' + pc(shown - tp - resR - wrong - resW, shown) + ' | ' + falseG + ' -> ' + falseC + ' |'); detail[L.name] = byW; }
out('\nCould the hue be read, and was it the right one, by how wide the card is in the picture (right sightings only):\n'); out('| Light | under 80 px | 80-130 px | 130-200 px | over 200 px |'); out('|---|---|---|---|---|');
for (const L of LIGHTS) out('| ' + L.name + ' | ' + ['under 80 px', '80-130 px', '130-200 px', 'over 200 px'].map((b) => { const v = detail[L.name][b]; return v ? 'read ' + v.read + '/' + v.n + ', right ' + v.agree + '/' + v.read : 'n/a'; }).join(' | ') + ' |');
fs.writeFileSync(path.join(DIR, 'tests', 'colour-results' + (QUICK ? '-quick' : '') + '.md'), md);
