/* TIERS TEST (pure node): tiers.js, the shared table of limits per device (iPad, desktop, Radeon, Radeon MAX).
   Run: node games/living-islands/tests/tiers-test.js
   Checks: every device has every group and key; every cell has a value, a status from the allowed list and a source; every Radeon and Radeon MAX number is 'unmeasured'; no limit contradicts the measured results
   (the evidence list), and the evidence matches the numbers written in the research notes it quotes; the iPad sea bench cap (pixel ratio 2) that failed is gone; seaFor gives the names sea_proto uses;
   the rows of the tables in sea_waves.js and sea_proto/index.html that the table was filled from still say the same numbers. */
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..');
await import(path.join(root, 'tiers.js'));
const T = globalThis.LI_TIERS;
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

/* ---- complete ---- */
ok(JSON.stringify(T.DEVICES) === JSON.stringify(['ipad', 'desktop', 'radeon', 'max']) && T.DEVICES.every(d => T.TIERS[d]), 'the four devices are ipad, desktop, radeon, max');
let cellsN = 0, bad = [];
for (const d of T.DEVICES) {
  ok(typeof T.TIERS[d].label === 'string' && T.TIERS[d].label.length > 0, d + ': has a label');
  for (const [p, c] of T.cells(d)) {
    cellsN++;
    if (!c) { bad.push(d + '.' + p + ' missing'); continue; }
    if (!(typeof c.v === 'number' && isFinite(c.v)) && !(c.v === null && c.s === 'unmeasured')) bad.push(d + '.' + p + ' value ' + c.v);
    if (!T.STATUS.includes(c.s)) bad.push(d + '.' + p + ' status ' + c.s);
    if (typeof c.src !== 'string' || !c.src.length) bad.push(d + '.' + p + ' no source');
    if (c.s === 'measured' && !/research\//.test(c.src)) bad.push(d + '.' + p + ' measured without a research note');
  }
}
ok(bad.length === 0, 'every cell of every device has a value (or null only when unmeasured), a status and a source (' + cellsN + ' cells)' + (bad.length ? ': ' + bad.slice(0, 4).join('; ') : ''));
ok(cellsN === T.DEVICES.length * Object.values(T.SHAPE).reduce((a, g) => a + g.length, 0), 'the table has exactly the cells of the shape: no extra, no missing');

/* ---- Radeon and MAX: unmeasured everywhere ---- */
for (const d of ['radeon', 'max']) ok(T.cells(d).every(([p, c]) => c.s === 'unmeasured'), d + ': every number is unmeasured');
ok(T.cells('desktop').every(([p, c]) => c.s === 'unmeasured' || c.s === 'code'), 'desktop: no number is claimed as measured (there is no desktop report)');
ok(T.cells('ipad').some(([p, c]) => c.s === 'measured') && T.cells('ipad').some(([p, c]) => c.s === 'guess'), 'ipad: some numbers are measured and the guesses are marked as guesses');
ok(T.TIERS.ipad.scene.tris.s === 'guess' && T.TIERS.ipad.scene.tris.v === 150000, 'ipad: the 150,000 triangle rule is marked a guess');

/* ---- no contradiction with the measured results ---- */
ok(T.contradictions().length === 0, 'no limit contradicts the measured results' + (T.contradictions().length ? ': ' + T.contradictions().join('; ') : ''));
{
  const saved = JSON.stringify(T.TIERS.ipad.render.pixelRatioCap); T.TIERS.ipad.render.pixelRatioCap.v = 2;
  ok(T.contradictions().some(s => /ipad-scale-2-failed/.test(s)), 'the checker works: a pixel ratio cap of 2 on the iPad is caught (2x took 24.1 ms)');
  T.TIERS.ipad.render.pixelRatioCap = JSON.parse(saved);
  const s2 = T.TIERS.ipad.render.renderScaleMax.v; T.TIERS.ipad.render.renderScaleMax.v = 1.25;
  ok(T.contradictions().some(s => /radeon-preset-failed/.test(s)), 'the checker works: the radeon-preset scale on the iPad is caught (it ran at 28.6 fps)');
  T.TIERS.ipad.render.renderScaleMax.v = s2;
  ok(T.contradictions().length === 0, 'the table is back to clean after the checker tests');
}
ok(T.TIERS.ipad.render.pixelRatioCap.v < 2 && T.TIERS.ipad.render.pixelRatioCap.v >= 1.5, 'ipad pixel ratio cap is 1.5 (1.5x held, 2x failed)');

/* ---- the evidence says what the notes say ---- */
const rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const bench = rd('research/SEA_BENCH_IPAD_26NOV.md'), rad = rd('research/RADEON_FIRST_MEASUREMENT.md');
const ev = id => T.EVIDENCE.find(e => e.id === id);
ok(/2M triangles, 16\.7 ms/.test(bench) && ev('ipad-sea-tris-held').value === 2000000, 'evidence: 2M sea triangles held, as the iPad bench note says');
ok(/\| Waves \| 96/.test(bench) && ev('ipad-waves-held').value === 96, 'evidence: 96 waves held');
ok(/400k points/.test(bench) && ev('ipad-spray-held').value === 400000 && /100k points/.test(bench) && ev('ipad-debris-held').value === 100000, 'evidence: 400k spray and 100k debris held');
ok(/1\.5x ok \(16\.7\), 2x 24\.1 ms, 3x 48\.2 ms/.test(bench) && ev('ipad-scale-2-failed').ms === 24.1 && ev('ipad-scale-3-failed').ms === 48.2 && ev('ipad-scale-1.5-held').value === 1.5, 'evidence: render scale 1.5x held, 2x 24.1 ms and 3x 48.2 ms failed');
ok(/28\.6 fps/.test(rad) && ev('ipad-page-radeon-preset-failed').fps === 28.6, 'evidence: the radeon preset on the iPad ran at 28.6 fps');
ok(/153,747 \/ 163/.test(rad) && ev('ipad-page-tris-held').value === 153747 && ev('ipad-page-calls-held').value === 163 && /58\.9 fps/.test(rad) && ev('ipad-page-tris-held').fps === 58.9, 'evidence: the iPad preset held 153,747 triangles and 163 draw calls at 58.9 fps');
ok(T.EVIDENCE.every(e => fs.existsSync(path.join(root, e.src))), 'every evidence line names a research note that exists');

/* ---- the sea numbers are the ones the code used ---- */
const sw = rd('sea_waves.js'), sp = rd('sea_proto/index.html');
const swT = k => { const m = new RegExp(k + ': \\{ name: \'[^\']*\', nSw: (\\d+), nWs: (\\d+), nCh: (\\d+), rings: (\\d+), segs: (\\d+), rip: (\\d+), spray: (\\d+)').exec(sw); return m && m.slice(1).map(Number); };
for (const d of ['ipad', 'desktop', 'radeon']) {
  const m = swT(d), s = T.TIERS[d].sea;
  ok(!!m, d + ': found its row in sea_waves.js');
  ok(!!m && s.rings.v === m[3] && s.segs.v === m[4] && s.ripples.v === m[5] && s.spray.v === m[6] && s.chop.v === m[2], d + ': rings, segs, ripples, spray and chop equal the sea_waves.js row');
  ok(!!m && s.waves.v === m[0] + m[1] + m[2], d + ': waves equal swell plus wind sea plus chop in sea_waves.js (' + (m ? m[0] + m[1] + m[2] : '?') + ')');
}
ok(/ipad:\{[^}]*rings:72,segs:160[^}]*spray:600,debris:400/.test(sp) && /radeon:\{[^}]*rings:220,segs:480[^}]*spray:12000,debris:20000/.test(sp), 'sea_proto still has the iPad and Radeon rows the table was filled from');
const sf = T.seaFor('ipad'); ok(sf.rings === 72 && sf.segs === 160 && sf.nTot === 8 && sf.spray === 600 && sf.prCap === 1.5 && T.seaFor('nope') === null, 'seaFor: gives the names sea_proto uses (rings, segs, nTot, spray, prCap) and null for an unknown device');
/* ---- both pages read it only behind &cost=1 ---- */
const il = rd('islands_look.html');
ok(il.split('\n').filter(l => /tiers\.js/.test(l)).every(l => /cost=1/.test(l)) && /tiers\.js/.test(il), 'islands_look.html loads tiers.js only on a line that tests for cost=1');
ok(sp.split('\n').filter(l => /tiers\.js/.test(l)).every(l => /cost=1/.test(l)) && /tiers\.js/.test(sp) && /Q\.get\('cost'\)==='1'&&window\.LI_TIERS/.test(sp), 'sea_proto/index.html loads tiers.js and reads it only behind cost=1');
ok(!/LI_TIERS/.test(il.replace(/.*cost.*LI_TIERS.*/g, '')), 'islands_look.html uses LI_TIERS only inside the cost=1 block');
console.log('tiers-test: ' + (n - fails) + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
