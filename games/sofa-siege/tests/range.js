/* Round Table Kingdom: the range report for every target template. Run: NODE_PATH=$(npm root -g) node tests/range.js
   Fires every kind of ammunition (and the high lob of those that can) at a fresh copy of each target camp, with the Lab's own "Test all ammo" (SG.labRange),
   headless and stepped (no real time). Writes RANGE_REPORT.md. With the argument --print it only prints the matrix. */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require('playwright');
const PRINT = process.argv.indexOf('--print') >= 0;
const TEMPLATES = [['walled', 'Walled Keep (a Keep behind a gate and two walls)'], ['braced', 'Braced Keep (a Keep and two braces)'], ['glass', 'Glass house (a lone Keep on four thin legs, no braces)'], ['longwall', 'Long wall (six walls in a row)'], ['workshops', 'Workshop cluster (three workshops and two tents)'], ['fortress', 'Fortress (the 12-point good camp the bots build)'], ['copy', 'My camp copy (the starter camp, a Keep and two lobbers, mirrored)']];
const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForFunction('window.__done', null, { timeout: 60000 });
  const out = await p.evaluate((T) => {
    SG.hold = true; SG.labStart(); SG.lab.card = false; const res = [], info = { pieceScale: SG.pieceSize, mm: SG.MM_PER_UNIT, v2: JSON.parse(JSON.stringify(SG.CONFIG.v2)) };
    T.forEach((t) => {
      SG.labLoadTarget(t[0]); const ps = SG.pieces.filter((q) => q.side === 1 && q.built), keep = ps.filter((q) => q.kind === 'tower')[0], main = SG.labDefaultSpot(),
        front = ps.filter((q) => q.kind !== 'brace' && q.kind !== 'trap').sort((a, c) => c.z - a.z)[0] || ps[0], spots = [['the Keep (or the middle of the camp)', main]];
      if (front && (!keep || front !== keep)) spots.push(['the front piece (' + front.kind + ')', { x: front.x, z: front.z }]);
      const mice = SG.mice.filter((m) => m.side === 1), mc = { x: mice.reduce((a, m) => a + m.x, 0) / mice.length, z: mice.reduce((a, m) => a + m.z, 0) / mice.length }; if (spots.every((q) => Math.hypot(q[1].x - mc.x, q[1].z - mc.z) > .2)) spots.push(['the mice (the middle of the five target mice)', mc]);
      const item = { id: t[0], title: t[1], pieces: ps.map((q) => q.kind).sort().join(', ') || 'nothing', runs: [] };
      spots.forEach((sp) => { const r = SG.labRange({ spot: sp[1] }); item.runs.push({ aim: sp[0], spot: sp[1], rows: r.rows, settings: r.settings }); });
      res.push(item);
    });
    /* probe: eight Marbles, one after another, at the Walled Keep's gate, nothing mended in between */
    SG.labLoadRecs(0, []); SG.labLoadTarget('walled'); SG.lab.quick = true; SG.labSetAmmo('marble'); SG.labSetHigh(false); const sp = SG.labDefaultSpot(), g0 = SG.pieces.filter((q) => q.side === 1 && q.kind === 'gate')[0], probe = [];
    for (let i = 0; i < 8; i++) { SG.labFire(0, 'gun', sp.x + (i % 3 - 1) * .1, sp.z, { force: true, seed: 5 + i }); const c = SG.labSettle(10); const g = SG.pieces.filter((q) => q.side === 1 && q.kind === 'gate')[0]; probe.push({ off: c.partsOff, landed: c.landings[0] ? c.landings[0].hit : '-', gateLeft: g.ps.filter((q) => q.st === 'on').map((q) => q.id.replace('gate.', '')).join(', ') }); }
    return { res, info, ammo: SG.ammoOrder.slice(), probe }; }, TEMPLATES);
  await b.close();
  if (errs.length) { console.error('page errors', errs); process.exit(1); }
  const sv = (r) => (r.salvo ? r.salvo.parts + ' · ' + r.salvo.collapses + ' · ' + (r.salvo.keepAt ? 'down at shot ' + r.salvo.keepAt : 'stands') : '-');
  const f = (r) => '| ' + [r.name, r.partsOff, r.collapses, r.keep ? 'yes' : 'no', r.dizzies, r.glued, r.landed, sv(r)].join(' | ') + ' |';
  const head = '| Ammo | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |\n|---|---|---|---|---|---|---|---|';
  const md = [];
  md.push('# Round Table Kingdom: range report', '', 'Made by `tests/range.js`, which runs the Lab\'s own "Test all ammo" (`SG.labRange`) on every target template. **Nothing here is estimated: each cell is one shot, fired through the real game code (`SG.fire`, the blast, the support and collapse rules, `CONFIG.v2` as committed).**', '');
  md.push('## Settings used', '', '- Rules v2, piece size **' + out.info.pieceScale + '** (the default), table layout: the usual practice table, one-player Lab.',
    '- Each shot is fired from the **free gun** on the near rim of the table (the gun stands at x = 0.35 times the aim x, clamped to about plus or minus 1.1, on the circle of radius 3.15). A shot from the free gun clears the first 30% of its flight, so it passes over my own camp; my camp is taken off the table for the test anyway.',
    '- Every shot is at a **fresh copy** of the target: the camp is rebuilt whole and the mice put at their resting places before each shot. A row is one shot, never an average. The glue row "after a Marble" fires a Marble first, then the Glue blob at the same spot.',
    '- Reload: quick (0.3 s), crew not needed, unlimited ammunition (so a Big Marble is always there; in a match it is earned on the hill).',
    '- The random seed is fixed (424242) before every shot, so the table is the same every time you run it. Only the flight of thrown parts depends on it; which parts come off and what collapses does not.',
    '- "Parts off" counts parts knocked off by the shot and by what it brought down (chain collapses and thrown parts landing on others), counted until nothing is left flying. Mice made dizzy counts the 5 mice of the target camp standing at their resting places beside the Keep (camp-frame x from -0.68 to +0.68, z 2.42, moved aside if a piece stands there).',
    '- **A single shot** (the first columns) shows what one shot does. A **salvo** (the last column) is the same ammunition ten times running with nothing mended in between, the ten shots spread over the camp round the aim spot (the spot itself, four spots 0.22 units to each side and four on the diagonals, then the spot again; seeds 424243 to 424252), because one shot rarely brings anything down: "parts off · collapses · Keep" are the totals over the ten, and the Keep is "down at shot n" or "stands". The salvo is not run for the Glue-after-a-Marble row.',
    '- Aim spots: the Keep (or the middle of the camp when there is no Keep), the front piece (the piece of the camp nearest to the gun), and the middle of the five mice. A flat shot at the Keep is stopped by whatever stands in front of it, as in a match.', '');
  out.res.forEach((it) => { md.push('## ' + it.title, '', 'Pieces: ' + it.pieces + '.', ''); it.runs.forEach((r) => { md.push('Aimed at ' + r.aim + ' (' + r.spot.x.toFixed(2) + ', ' + r.spot.z.toFixed(2) + '):', '', head); r.rows.forEach((x) => md.push(f(x))); md.push(''); }); });
  md.push('## Probe: eight Marbles, one after another, at the Walled Keep\'s gate', '', 'Aimed at the Keep through the gate, each shot a little to one side (x - 0.1, 0, +0.1, ...), nothing mended in between.', '', '| Shot | Parts off | Landed on | Parts of the gate still on |', '|---|---|---|---|');
  out.probe.forEach((q, i) => md.push('| ' + (i + 1) + ' | ' + q.off + ' | ' + q.landed + ' | ' + q.gateLeft + ' |')); md.push('');
  /* totals by ammunition, over every cell: useless or broken ammunition shows up as a row of zeros */
  const tot = {}; out.res.forEach((it) => it.runs.forEach((r) => r.rows.forEach((x) => { const k = x.name; const t = tot[k] || (tot[k] = { sKeep: 0, sCol: 0, sRuns: 0, sParts: 0, shots: 0, off: 0, col: 0, keep: 0, diz: 0, glued: 0, bounces: 0, nonzero: 0 }); t.shots++; t.off += x.partsOff; t.col += x.collapses; t.keep += x.keep ? 1 : 0; t.diz += x.dizzies; t.glued += x.glued; t.bounces += x.bounces || 0; if (x.partsOff || x.collapses || x.dizzies || x.glued) t.nonzero++; if (x.salvo) { t.sRuns++; t.sParts += x.salvo.parts; t.sCol += x.salvo.collapses; if (x.salvo.keepAt) t.sKeep++; } })));
  md.push('## Totals over every shot above', '', '| Ammo | Single shots | Parts off | Collapses | Keeps felled | Mice dizzy | Parts glued | Shots that did anything | Salvos of 10: parts off | collapses | Keeps felled |', '|---|---|---|---|---|---|---|---|---|---|---|');
  Object.keys(tot).forEach((k) => { const t = tot[k]; md.push('| ' + [k, t.shots, t.off, t.col, t.keep, t.diz, t.glued, t.nonzero + ' of ' + t.shots, t.sRuns ? t.sParts : '-', t.sRuns ? t.sCol : '-', t.sRuns ? t.sKeep + ' of ' + t.sRuns : '-'].join(' | ') + ' |'); });
  md.push('');
  let notes = ''; try { notes = fs.readFileSync(path.resolve(__dirname, 'range-notes.md'), 'utf8'); } catch (e) { notes = ''; }
  if (notes) md.push(notes.trim(), '');
  const text = md.join('\n');
  if (PRINT) console.log(text); else { fs.writeFileSync(path.resolve(__dirname, '..', 'RANGE_REPORT.md'), text); console.log('wrote RANGE_REPORT.md (' + out.res.length + ' targets, ' + Object.keys(tot).length + ' ammunition rows)'); }
  console.log(Object.keys(tot).map((k) => k + ': ' + tot[k].nonzero + '/' + tot[k].shots + ' did something').join('\n'));
};
run().catch((e) => { console.error(e); process.exit(2); });
