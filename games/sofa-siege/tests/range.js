/* Round Table Kingdom: the range report. Run: NODE_PATH=$(npm root -g) node tests/range.js
   Fires every weapon at every target camp with the Lab's own SG.labRange (headless, stepped, no real time) and writes RANGE_REPORT.md.
   The weapons: the five kinds a match uses (and the high lob of those that can), the six Workshop presets (Tether marble, Pocket Earthquake, Acorn drum, Bead shot, Pop bomb, Triple bouncer),
   and every saved weapon: the ones in tests/range-weapons.json are saved into the page's localStorage first, so that saved weapons are covered the way a player's are.
   The targets: the seven old camps and the five big ones (Castle, Village, Wall maze, Domino row, Tower stack). Then "Rate it" is run for every weapon, with Chain topple on and off.
   With the argument --print it only prints the report. */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = require('playwright');
const PRINT = process.argv.indexOf('--print') >= 0;
const TEMPLATES = [['walled', 'Walled Keep (a Keep behind a gate and two walls)'], ['braced', 'Braced Keep (a Keep and two braces)'], ['glass', 'Glass house (a lone Keep on four thin legs, no braces)'], ['longwall', 'Long wall (six walls in a row)'], ['workshops', 'Workshop cluster (three workshops and two tents)'], ['fortress', 'Fortress (the 12-point good camp the bots build)'], ['copy', 'My camp copy (the starter camp, a Keep and two lobbers, mirrored)'],
  ['castle', 'Castle (a Keep, four corner towers, walls, a gate, a courtyard)'], ['village', 'Village (ten small camps and a chief\'s hall)'], ['maze', 'Wall maze (three rings of walls, a gate in each)'], ['domino', 'Domino row (three lines of eight unbraced walls)'], ['stack', 'Tower stack (seven Keeps braced together)']];
/* the Building Yard (20 Nov): six buildings and a yard of three, every weapon on each, like the rest */
TEMPLATES.push(['cottage', 'Cottage (one building, 40 parts: tiles, shutters, walls, door, frame)'], ['barn', 'Barn (one building, 40 parts: big doors, hayloft, lean-to)'], ['lookout', 'Watch tower house (one building, 31 parts: floors, steps, flag roof)'], ['bridge', 'Bridge + gatehouse (one building, 28 parts: two towers, a deck, a hanging gate)'], ['windmill', 'Windmill (one building, 21 parts: tiers, hub, four sails)'], ['market', 'Market row (three stalls of 13 parts, awnings and crates)'], ['yard', 'Building yard of 3 (a cottage, a barn and a windmill, side by side)']);
let saved = []; try { saved = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'range-weapons.json'), 'utf8')); } catch (e) { saved = []; }
const run = async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForFunction('window.__done', null, { timeout: 60000 });
  const out = await p.evaluate(([T, SAVED]) => {
    SG.hold = true; SG.labStart(); SG.lab.card = false; Object.keys(SG.labFlags).forEach((id) => SG.setProto(id, false, false)); SG.lab.topple = true;
    const info = { pieceScale: SG.pieceSize, mm: SG.MM_PER_UNIT, v2: JSON.parse(JSON.stringify(SG.CONFIG.v2)), workshop: JSON.parse(JSON.stringify(SG.CONFIG.workshop)) };
    const ids = SG.ammoOrder.slice(), meta = {};
    SG.labPresets.forEach((pr) => { SG.setProto('p_' + pr.key, true, false); ids.push('p_' + pr.key); });
    SAVED.forEach((r) => { const s = SG.labWeaponSave(r); if (!s.ok) throw new Error('weapon not saved: ' + s.text); });
    Object.keys(SG.labWeapons()).forEach((n) => { const k = SG.labWkLoad(SG.labWeapons()[n]); if (!k.ok) throw new Error(k.text); ids.push(k.id); });
    ids.forEach((id) => { meta[id] = { name: SG.ammo[id].name, maker: SG.ammo[id].maker || '', price: SG.wPrice(SG.ammo[id].w), w: SG.wCopy(SG.ammo[id].w) }; });
    const res = [];
    T.forEach((t) => {
      SG.labLoadTarget(t[0]); const ps = SG.pieces.filter((q) => q.side === 1 && q.built), keep = SG.pieces.filter((q) => q.side === 1 && q.kind === 'tower')[0], main = SG.labDefaultSpot(),
        front = ps.filter((q) => q.kind !== 'brace' && q.kind !== 'trap').sort((a, c) => c.z - a.z)[0] || ps[0], spots = [['the Keep (or the middle of the camp)', main, 10]];
      if (front && (!keep || Math.hypot(front.x - main.x, front.z - main.z) > .15)) spots.push(['the front piece (' + front.kind + ')', { x: front.x, z: front.z }, 0]);
      const mice = SG.mice.filter((m) => m.side === 1), mc = { x: mice.reduce((a, m) => a + m.x, 0) / mice.length, z: mice.reduce((a, m) => a + m.z, 0) / mice.length }; if (spots.every((q) => Math.hypot(q[1].x - mc.x, q[1].z - mc.z) > .2)) spots.push(['the mice (the middle of the five target mice)', mc, 0]);
      const kinds = {}; ps.forEach((q) => { kinds[q.kind] = (kinds[q.kind] || 0) + 1; });
      const item = { id: t[0], title: t[1], pieces: ps.length, kinds: Object.keys(kinds).sort().map((k) => kinds[k] + ' ' + k).join(', ') || 'nothing', runs: [] };
      spots.forEach((sp) => { const r = SG.labRange({ spot: sp[1], ammo: ids, salvo: sp[2] }); item.runs.push({ aim: sp[0], spot: sp[1], salvo: sp[2], rows: r.rows }); });
      res.push(item);
    });
    /* Rate it for every weapon, with Chain topple on and off */
    const rate = { on: {}, off: {} }; [true, false].forEach((tp) => { SG.lab.topple = tp; ids.forEach((id) => { const r = SG.labRate(id); rate[tp ? 'on' : 'off'][id] = { verdict: r.verdict, tooStrong: r.tooStrong, price: r.price, t: r.totals[id], marble: r.totals.marble.score, big: r.totals.big.score, targets: r.targets.map((x) => [x.id, x.rows[id].partsOff, x.rows[id].collapses, x.rows[id].keep, x.rows[id].dizzies, x.keep]) }; }); });
    SG.lab.topple = true;
    /* probe: eight Marbles at the Walled Keep's gate, nothing mended in between (the bug the first range report found: a bare frame stopped every shot) */
    SG.labLoadRecs(0, []); SG.labLoadTarget('walled'); SG.lab.quick = true; SG.labSetAmmo('marble'); SG.labSetHigh(false); SG.lab.topple = false; const sp0 = SG.labDefaultSpot(), probe = [];
    for (let i = 0; i < 8; i++) { SG.labFire(0, 'gun', sp0.x + (i % 3 - 1) * .1, sp0.z, { force: true, seed: 5 + i }); const c = SG.labSettle(10); const g = SG.pieces.filter((q) => q.side === 1 && q.kind === 'gate')[0]; probe.push({ off: c.partsOff, landed: c.landings[0] ? c.landings[0].hit : '-', gateLeft: g.ps.filter((q) => q.st === 'on').map((q) => q.id.replace('gate.', '')).join(', ') }); }
    /* the Building Yard, building by building: what a Marble, a high lob, a light touch, eight Marbles running, a Big Marble and two Big Marbles do, by stage, and whether anything is left floating */
    SG.lab.topple = true; SG.lab.quick = true; const yard = [];
    const shotY = (id, high, x, z, seed) => { SG.lab.ammo = id; SG.lab.high = !!high; SG.sides.forEach((q) => { q.ammo = id; q.high = !!high; }); SG.labFire(0, 'gun', x, z, { force: true, seed }); const c = SG.labSettle(10), st = SG.labStages(); return { off: c.partsOff, trim: st.trim, walls: st.walls, frame: st.frame, col: c.collapses, chain: c.chain }; };
    [['cottage', 'Cottage'], ['barn', 'Barn'], ['lookout', 'Watch tower house'], ['bridge', 'Bridge + gatehouse'], ['windmill', 'Windmill'], ['market', 'Market row'], ['yard', 'Yard of 3']].forEach(([t, nm]) => {
      SG.labLoadTarget(t); const ps = SG.pieces.filter((q) => q.side === 1), cx = ps.reduce((a, q) => a + q.x, 0) / ps.length, cz = ps.reduce((a, q) => a + q.z, 0) / ps.length, hit0 = ps.slice().sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx))[0], hx = ps.length > 1 ? hit0.x : cx, hz = ps.length > 1 ? hit0.z : cz;
      const row = { name: nm, id: t, pieces: ps.length, parts: ps.reduce((a, q) => a + q.total, 0), stages: [0, 1, 2].map((g) => ps.reduce((a, q) => a + SG.bldStats(q).stage[g].n, 0)) };
      const R = .3 * SG.unit(), fz = Math.max(...ps.map((q) => SG.FOOT[q.kind][1]));
      SG.labReset(1); row.touch = shotY('marble', false, cx, cz + fz + R * 1.15, 5).off;
      SG.labReset(1); row.marble = shotY('marble', false, hx, hz, 5); SG.labReset(1); row.high = shotY('marble', true, hx, hz, 5);
      SG.labReset(1); row.seq = []; for (let i = 0; i < 8; i++) { const r = shotY('marble', false, hx, hz, 6 + i); row.seq.push(r); } row.seqFloat = SG.bldFloating().length;
      SG.labReset(1); row.big = shotY('big', false, hx, hz, 5); row.bigOn = SG.pieces.filter((q) => q.side === 1).reduce((a, q) => a + q.parts, 0); row.bigFloat = SG.bldFloating().length; row.big2 = shotY('big', false, hx, hz, 9); row.big2On = SG.pieces.filter((q) => q.side === 1).reduce((a, q) => a + q.parts, 0); row.big2Float = SG.bldFloating().length;
      SG.labReset(1); SG.lab.topple = false; row.bigNoTopple = shotY('big', false, hx, hz, 5); row.bigNoToppleOn = SG.pieces.filter((q) => q.side === 1).reduce((a, q) => a + q.parts, 0); SG.lab.topple = true;
      /* a salvo of ten Marbles over the building, nothing mended: parts off, collapses, and whether anything floats */
      SG.labReset(1); let sOff = 0, sCol = 0; const off = [[0, 0], [.22, 0], [-.22, 0], [0, .22], [0, -.22], [.16, .16], [-.16, .16], [.16, -.16], [-.16, -.16], [0, 0]]; off.forEach((o2, i) => { const r = shotY('marble', i % 3 === 2, hx + o2[0] * SG.unit(), hz + o2[1] * SG.unit(), 20 + i); sOff += r.off; sCol += r.col; }); row.salvo = { off: sOff, col: sCol, on: SG.pieces.filter((q) => q.side === 1).reduce((a, q) => a + q.parts, 0), float: SG.bldFloating().length };
      yard.push(row); });
    SG.labLoadTarget('walled'); SG.lab.topple = true;
    return { res, info, ids, meta, rate, probe, yard }; }, [TEMPLATES, saved]);
  await b.close();
  if (errs.length) { console.error('page errors', errs); process.exit(1); }
  const sv = (r) => (r.salvo ? r.salvo.parts + ' · ' + r.salvo.collapses + ' · ' + (r.salvo.keepAt ? 'down at ' + r.salvo.keepAt : 'stands') : '-');
  const f = (r, salvo) => '| ' + [r.name, r.partsOff, r.collapses, r.keep ? 'yes' : 'no', r.dizzies, r.glued, r.landed].concat(salvo ? [sv(r)] : []).join(' | ') + ' |';
  const headS = '| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |\n|---|---|---|---|---|---|---|---|', headN = '| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |\n|---|---|---|---|---|---|---|';
  const md = [];
  md.push('# Round Table Kingdom: range report', '', 'Made by `tests/range.js`, which runs the Lab\'s own range (`SG.labRange`) with every weapon on every target camp, then "Rate it" (`SG.labRate`) for every weapon. **Nothing here is estimated: each cell is one shot, fired through the real game code (`SG.fire`, the blast, the support and collapse rules, `CONFIG.v2` and `CONFIG.workshop` as committed).**', '');
  let notes = ''; try { notes = fs.readFileSync(path.resolve(__dirname, 'range-notes.md'), 'utf8'); } catch (e) { notes = ''; }
  if (notes) md.push(notes.trim(), '');
  md.push('## Settings used', '', '- Rules v2, piece size **' + out.info.pieceScale + '** (the default), the usual practice table, one-player Lab. The bare-frame fix is in (a wall or gate that is only posts and braces no longer stops a flat shot).',
    '- **Chain topple is ON** (the Lab\'s default): a wall, gate or Keep that falls lands on the pieces in the way it falls and knocks parts off them, at most ' + out.info.workshop.topple.max + ' topples a shot, and a wall or gate that has lost its frame counts as having fallen even if the blast took its planks. With Chain topple off a shot behaves exactly as in a match; the Rate it tables below show both.',
    '- Each shot is fired from the **free gun** on the near rim of the table (x = 0.35 times the aim x, clamped to about plus or minus 1.1, on the circle of radius 3.15). A shot from the free gun clears the first 30% of its flight, so it passes over my own camp; my camp is taken off the table for the test anyway.',
    '- Every shot is at a **fresh copy** of the target: the camp is rebuilt whole (the same looks every time) and the mice put at their resting places before each shot. A row is one shot, never an average. The glue row "after a Marble" fires a Marble first, then the Glue blob at the same spot.',
    '- Reload: quick (0.3 s), crew not needed, unlimited ammunition (so a Big Marble is always there; in a match it is earned on the hill). Mice stand still beside the Keep (they cannot be dodged); there are no raiders and nothing is mended.',
    '- The random seed is fixed (424242) before every shot, so the table is the same every time you run it.',
    '- "Parts off" counts parts knocked off by the shot and by what it brought down (chain collapses, topples and thrown parts landing on others), counted until nothing is left flying or waiting on a fuse. Mice made dizzy counts the 5 mice of the target camp.',
    '- A **salvo** (the last column of the first table of each target) is the same weapon ten times running with nothing mended in between, spread over the camp round the aim spot (the spot itself, four spots 0.22 units to each side, four on the diagonals, then the spot again; seeds 424243 to 424252). For a weapon that needs damage to work on (Pocket Earthquake) the Rate it salvo fires a Marble before every shot. Other aim spots (the front piece, the mice) show single shots only.',
    '- The weapons: ' + out.ids.map((id) => out.meta[id].name + (out.meta[id].maker ? ' (' + out.meta[id].maker + ')' : '')).join('; ') + '. Saved weapons come from `tests/range-weapons.json`, saved into the page\'s localStorage first.',
    '- Reading "Rate it": one flat shot and a salvo of five at each of eleven targets (every target but the empty one and my camp copy), summed; the verdict compares the weapon\'s score with a Marble\'s and a Big Marble\'s (`CONFIG.workshop.rate`: a part off counts 1, a collapse 4, a Keep felled 15, a mouse dizzy .5; a salvo counts .3 of a single shot).', '');
  md.push('## Weapon prices and numbers', '', '| Weapon | Price (points) | Blast | Flat | Bounces | Scatter | Fuse | Stick | Slow | Dizzy radius | Tether | Quake | Roll | Cap | Cooldown |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  out.ids.forEach((id) => { const m = out.meta[id], w = m.w; md.push('| ' + [m.name, m.price, w.blast, w.flat ? 'yes' : '', w.bounces || '', w.scatter > 1 ? w.scatter : '', w.fuse || '', w.stick || '', w.slowSecs ? Math.round((1 - w.slowTo) * 100) + '% for ' + w.slowSecs + ' s' : '', w.dizzyR < 0 ? 'blast' : w.dizzyR, w.tether || '', w.quake || '', w.roll || '', w.cap || '', w.cd || ''].join(' | ') + ' |'); });
  md.push('');
  /* Rate it for every weapon */
  const tr = (r) => r.t.parts + ' · ' + r.t.collapses + ' · ' + r.t.keeps + ' of ' + r.t.keepTargets + ' · ' + r.t.dizzies;
  md.push('## Rate it: every weapon against every target', '', 'One flat shot at each of the eleven targets, summed (parts off · collapses · Keeps felled · mice dizzy), the score, and the verdict. Marble and Big Marble are the yardsticks.', '', '| Weapon | Price | Chain topple ON: shots | score | verdict | Chain topple OFF: shots | score | verdict |', '|---|---|---|---|---|---|---|---|');
  out.ids.forEach((id) => { const a = out.rate.on[id], c = out.rate.off[id]; md.push('| ' + [out.meta[id].name, a.price, tr(a), a.t.score, a.verdict + (a.tooStrong ? ' (TOO STRONG)' : ''), tr(c), c.t.score, c.verdict + (c.tooStrong ? ' (TOO STRONG)' : '')].join(' | ') + ' |'); });
  md.push('', 'And the salvos of five (parts off · collapses · Keeps felled), Chain topple on:', '', '| Weapon | Salvo parts | Salvo collapses | Keeps felled by a salvo (of the targets with a Keep) |', '|---|---|---|---|');
  out.ids.forEach((id) => { const a = out.rate.on[id].t; md.push('| ' + [out.meta[id].name, a.sParts, a.sCollapses, a.sKeeps + ' of ' + a.keepTargets].join(' | ') + ' |'); });
  md.push('');
  out.res.forEach((it) => { md.push('## ' + it.title, '', it.pieces + ' pieces: ' + it.kinds + '.', ''); it.runs.forEach((r) => { md.push('Aimed at ' + r.aim + ' (' + r.spot.x.toFixed(2) + ', ' + r.spot.z.toFixed(2) + '):', '', r.salvo ? headS : headN); r.rows.forEach((x) => md.push(f(x, !!r.salvo))); md.push(''); }); });
  /* the Building Yard probes */
  md.push('## Building Yard: stage by stage', '', 'Each row is a fresh copy of the building (the yard of 3 is aimed at its middle building, the market row at its middle stall), the free gun, seed fixed, Chain topple on unless said. **Trim** is shutters, tiles, flags, awnings, crates; **walls** are panels, doors, floors, sails; **frame** is posts, beams, rafters. "Floating" is a part still on that stands on a part that is gone: it must always be 0.', '',
    '| Building | Pieces | Parts (trim / walls / frame) | Light touch (a Marble just out of reach) | One Marble: off (trim / walls / frame), collapses | High lob | Eight Marbles running: trim / walls / frame off, first collapse at shot | One Big Marble: parts left of whole, collapses | Two Big Marbles: parts left | One Big Marble, Chain topple off: parts left | Salvo of ten Marbles: off, collapses, left | Floating (after each) |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  out.yard.forEach((r) => { const sum = r.seq.reduce((a, q) => [a[0] + q.trim, a[1] + q.walls, a[2] + q.frame], [0, 0, 0]), fc = r.seq.findIndex((q) => q.col > 0); md.push('| ' + [r.name, r.pieces, r.parts + ' (' + r.stages.join(' / ') + ')', r.touch, r.marble.off + ' (' + r.marble.trim + ' / ' + r.marble.walls + ' / ' + r.marble.frame + '), ' + r.marble.col, r.high.off, sum.join(' / ') + ', ' + (fc < 0 ? 'none' : fc + 1), r.bigOn + ' of ' + r.parts + ', ' + r.big.col, r.big2On + ' of ' + r.parts, r.bigNoToppleOn + ' of ' + r.parts, r.salvo.off + ', ' + r.salvo.col + ', ' + r.salvo.on, [r.seqFloat, r.bigFloat, r.big2Float, r.salvo.float].join(' / ')].join(' | ') + ' |'); });
  md.push('');
  md.push('## Probe: eight Marbles, one after another, at the Walled Keep\'s gate (the bug the first report found)', '', 'Aimed at the Keep through the gate, each shot a little to one side (x - 0.1, 0, +0.1, ...), nothing mended in between, Chain topple off. Before the fix, after the doors and lintel went, the bare posts and braces stopped every Marble and nothing more came off (shots 3 to 8: 0 parts, landed on the Gate). Now a Marble passes between the posts and lands on the Keep.', '', '| Shot | Parts off | Landed on | Parts of the gate still on |', '|---|---|---|---|');
  out.probe.forEach((q, i) => md.push('| ' + (i + 1) + ' | ' + q.off + ' | ' + q.landed + ' | ' + q.gateLeft + ' |')); md.push('');
  /* totals by weapon over every cell */
  const tot = {}; out.res.forEach((it) => it.runs.forEach((r) => r.rows.forEach((x) => { const k = x.name; const t = tot[k] || (tot[k] = { sKeep: 0, sCol: 0, sRuns: 0, sParts: 0, shots: 0, off: 0, col: 0, keep: 0, diz: 0, glued: 0, bounces: 0, nonzero: 0 }); t.shots++; t.off += x.partsOff; t.col += x.collapses; t.keep += x.keep ? 1 : 0; t.diz += x.dizzies; t.glued += x.glued; t.bounces += x.bounces; if (x.partsOff || x.collapses || x.dizzies || x.glued || x.bounces || x.keep) t.nonzero++;
    if (x.salvo) { t.sRuns++; t.sParts += x.salvo.parts; t.sCol += x.salvo.collapses; if (x.salvo.keepAt) t.sKeep++; } })));
  md.push('## Totals over every shot above', '', '| Weapon | Single shots | Parts off | Collapses | Keeps felled | Mice dizzy | Parts glued | Shots that did anything | Salvos of 10: parts off | collapses | Keeps felled |', '|---|---|---|---|---|---|---|---|---|---|---|');
  Object.keys(tot).forEach((k) => { const t = tot[k]; md.push('| ' + [k, t.shots, t.off, t.col, t.keep, t.diz, t.glued, t.nonzero + ' of ' + t.shots, t.sRuns ? t.sParts : '-', t.sRuns ? t.sCol : '-', t.sRuns ? t.sKeep + ' of ' + t.sRuns : '-'].join(' | ') + ' |'); });
  md.push('');
  const text = md.join('\n');
  if (PRINT) console.log(text); else { fs.writeFileSync(path.resolve(__dirname, '..', 'RANGE_REPORT.md'), text); console.log('wrote RANGE_REPORT.md (' + out.res.length + ' targets, ' + Object.keys(tot).length + ' weapon rows, ' + text.split('\n').length + ' lines)'); }
  console.log(Object.keys(tot).map((k) => k + ': ' + tot[k].nonzero + '/' + tot[k].shots + ' did something; salvo keeps ' + tot[k].sKeep + '/' + tot[k].sRuns).join('\n'));
  console.log('\nRate it (topple on):\n' + out.ids.map((id) => out.meta[id].name + ' [' + out.rate.on[id].price + ' pts]: ' + out.rate.on[id].verdict + ' | score ' + out.rate.on[id].t.score + ' (Marble ' + out.rate.on[id].marble + ', Big ' + out.rate.on[id].big + ') | topple off: ' + out.rate.off[id].verdict).join('\n'));
};
run().catch((e) => { console.error(e); process.exit(2); });
