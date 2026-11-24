/* BOATKIT TEST: boat_motion.js (pure node, no browser). Run: node games/living-islands/tests/boatkit-test.js
   Checks (see BOAT_MODEL.md, wiring section): float motion is zero on a flat sea, signs follow the slopes, soft caps hold in a storm, is deterministic and has no NaN;
   the oar stroke is periodic, the blade is lifted in the recovery and in the water in the drive, the sweep covers the whole range; sail trim: boom out on the lee side, more sheet
   out downwind, small when close hauled, heel on the lee side and capped, mirror symmetry; rudder follows the turn and is capped; level of detail by distance with hysteresis,
   no hero at low or AR; the GLB files carry the nodes the page needs and the page twin scripts match the files. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
await import(path.join(here, '..', 'boat_motion.js')); const M = globalThis.LI_BOAT_MOTION;
let fails = 0;
const ok = (c, msg, extra) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + msg + (extra !== undefined ? '  [' + extra + ']' : '')); };
const D = Math.PI / 180, f3 = x => +x.toFixed(3);

/* 1. float motion */
{
  const z = M.floatMotion({ c: 0, bow: 0, stern: 0, port: 0, stbd: 0 }, 4, 1.45);
  ok(z.heave === 0 && z.pitch === 0 && z.roll === 0, 'flat sea: no heave, pitch or roll');
  const a = M.floatMotion({ c: .2, bow: .5, stern: -.1, port: .3, stbd: .0 }, 4, 1.45);
  ok(a.heave > 0 && a.pitch > 0 && a.roll > 0, 'high bow gives bow-up pitch, high port gives port-up roll, crest gives heave', [f3(a.heave), f3(a.pitch), f3(a.roll)].join(' '));
  const b = M.floatMotion({ c: .2, bow: -.1, stern: .5, port: 0, stbd: .3 }, 4, 1.45);
  ok(b.pitch < 0 && b.roll < 0, 'mirrored slopes give mirrored signs');
  const s = M.floatMotion({ c: 9, bow: 30, stern: -30, port: 30, stbd: -30 }, 4, 1.45);
  ok(s.heave <= M.CAPS.heave + 1e-9 && s.pitch <= M.CAPS.angle + 1e-9 && s.roll <= M.CAPS.angle + 1e-9, 'storm sea saturates at the caps', [f3(s.heave), f3(s.pitch), f3(s.roll)].join(' '));
  const small = M.floatMotion({ c: .02, bow: .02, stern: -.02, port: .01, stbd: -.01 }, 4, 1.45);
  ok(Math.abs(small.pitch - Math.atan(.04 / 4)) < 5e-4, 'a small slope passes through nearly unchanged (tanh is linear near zero)', f3(small.pitch));
  const again = M.floatMotion({ c: .2, bow: .5, stern: -.1, port: .3, stbd: .0 }, 4, 1.45);
  ok(JSON.stringify(a) === JSON.stringify(again), 'deterministic');
  let nan = 0; for (let i = 0; i < 200; i++) { const r = M.floatMotion({ c: Math.sin(i), bow: Math.cos(i * 2), stern: Math.sin(i * 3), port: Math.cos(i * 5), stbd: Math.sin(i * 7) }, 3 + i % 5, 1 + i % 3); if (![r.heave, r.pitch, r.roll].every(Number.isFinite)) nan++; }
  ok(nan === 0, 'no NaN over 200 mixed inputs');
  const wide = M.floatMotion({ c: 0, bow: .3, stern: -.3, port: 0, stbd: 0 }, 4, 1.45), longer = M.floatMotion({ c: 0, bow: .3, stern: -.3, port: 0, stbd: 0 }, 7, 2.4);
  ok(longer.pitch < wide.pitch, 'the same height difference over a longer hull is a smaller pitch');
}
/* 2. oars */
{
  const P = 2.4; let minS = 9, maxS = -9, inW = 0, n = 0, liftOut = 0, liftIn = 0, cIn = 0, cOut = 0;
  for (let i = 0; i < 240; i++) { const o = M.oarStroke(i * P / 240, P); minS = Math.min(minS, o.sweep); maxS = Math.max(maxS, o.sweep); n++;
    if (o.inWater) { inW++; liftIn += o.lift; cIn++; } else { liftOut += o.lift; cOut++; } }
  ok(Math.abs(minS + 1) < .01 && Math.abs(maxS - 1) < .01, 'sweep covers catch (-1) to finish (+1)', f3(minS) + ' .. ' + f3(maxS));
  ok(Math.abs(inW / n - M.DRIVE) < .01, 'blade is in the water for the drive fraction', f3(inW / n));
  ok(liftOut / cOut > .5 && liftIn / cIn < 0, 'blade lifted in the recovery, dipped in the drive', f3(liftOut / cOut) + ' / ' + f3(liftIn / cIn));
  const a = M.oarStroke(.37, P), b = M.oarStroke(.37 + P * 5, P);
  ok(Math.abs(a.sweep - b.sweep) < 1e-9 && Math.abs(a.lift - b.lift) < 1e-9, 'periodic');
  const c0 = M.oarStroke(0, P), c1 = M.oarStroke(P * M.DRIVE, P);
  ok(c0.sweep < -.99 && c1.sweep > .99, 'catch at phase 0, finish at the end of the drive');
  const half = M.oarStroke(.2, P, .5), full = M.oarStroke(.2, P, 1);
  ok(Math.abs(half.sweep - full.sweep * .5) < 1e-9, 'rate scales the sweep');
  ok(M.strokePeriod(.8) > M.strokePeriod(1.4) && M.strokePeriod(.1) <= 60 / 16 + 1e-9 && M.strokePeriod(9) >= 60 / 30 - 1e-9, 'a faster boat has a shorter stroke period, within 16 to 30 strokes per minute');
}
/* 3. sail */
{
  const ps = M.sailTrim(90 * D, 6), pp = M.sailTrim(-90 * D, 6);
  ok(ps.boom < 0 && pp.boom > 0 && Math.abs(ps.boom + pp.boom) < 1e-9, 'wind from starboard puts the boom to port (negative in the file) and the mirror is exact', f3(ps.boom / D) + ' / ' + f3(pp.boom / D));
  ok(ps.heel > 0 && pp.heel < 0 && Math.abs(ps.heel + pp.heel) < 1e-9, 'heel is to the lee side, mirrored');
  const ch = Math.abs(M.sailTrim(45 * D, 6).boom), br = Math.abs(M.sailTrim(90 * D, 6).boom), ru = Math.abs(M.sailTrim(170 * D, 6).boom);
  ok(ch < br && br < ru && ch < 20 * D && ru > 60 * D && ru < 85 * D, 'sheet out grows from close hauled to a run', [ch, br, ru].map(x => f3(x / D)).join(' / ') + ' deg');
  ok(M.sailTrim(10 * D, 6).luff && !M.sailTrim(60 * D, 6).luff, 'head to wind luffs');
  ok(Math.abs(M.sailTrim(90 * D, 30).heel) <= 12 * D + 1e-9 && Math.abs(M.sailTrim(90 * D, 3).heel) < Math.abs(M.sailTrim(90 * D, 8).heel), 'heel grows with the wind and is capped at 12 degrees');
  ok(Math.abs(M.sailTrim(90 * D, 6).aa - Math.PI / 2) < 1e-9 && Math.abs(M.sailTrim(450 * D, 6).boom - ps.boom) < 1e-9, 'angles wrap');
  ok(Math.abs(M.sailTrim(160 * D, 4).heel) < Math.abs(M.sailTrim(80 * D, 4).heel), 'a run heels less than a beam reach');
}
/* 4. rudder */
{
  ok(M.rudderAngle(.2) > 0 && M.rudderAngle(-.2) < 0 && M.rudderAngle(0) === 0 && Math.abs(M.rudderAngle(5)) <= 14 * D + 1e-9, 'rudder follows the turn and is capped at 14 degrees');
}
/* 5. level of detail */
{
  ok(M.lodFor(5, 'high', 'live', true) === 'hero' && M.lodFor(5, 'high', 'live', false) === 'live', 'hero close up at high quality, only when the file is loaded');
  ok(M.lodFor(60, 'high', 'far', true) === 'live' && M.lodFor(200, 'high', 'live', true) === 'far', 'live within 90 m, far beyond');
  ok(M.lodFor(5, 'low', 'far', true) !== 'hero' && M.lodFor(5, 'ar', 'far', true) !== 'hero', 'no hero at low or AR');
  ok(M.lodFor(60, 'low', 'far') === 'far' && M.lodFor(30, 'low', 'far') === 'live', 'low quality turns far sooner');
  ok(M.lodFor(95, 'high', 'live') === 'live' && M.lodFor(95, 'high', 'far') === 'far', 'hysteresis: a boat on the edge keeps its level');
}
/* 6. files */
{
  const D0 = path.join(here, '..', 'assets', 'boats');
  const need = ['boat', 'hull', 'hullmask', 'waterline'];
  const nodesOf = f => { const b = fs.readFileSync(f); const l = b.readUInt32LE(12); const j = JSON.parse(b.slice(20, 20 + l).toString()); return { names: j.nodes.map(n => n.name), anim: (j.animations || []).map(a => a.name) }; };
  let all = true, why = '';
  for (const boat of ['dinghy', 'sailer', 'work', 'wreck']) for (const lod of ['live', 'far']) {
    const n = nodesOf(path.join(D0, `boat_${boat}_${lod}.glb`));
    for (const k of need) if (!n.names.includes(k)) { all = false; why += ` ${boat}_${lod}:${k}`; }
    if (boat !== 'work') for (const k of ['oar_l', 'oar_r']) if (!n.names.includes(k)) { all = false; why += ` ${boat}_${lod}:${k}`; }
    if (boat === 'sailer') for (const k of ['mast', 'boom', 'sail', 'sail_furled', 'rudder_pin']) if (!n.names.includes(k)) { all = false; why += ` ${boat}_${lod}:${k}`; }
    for (const k of ['pose_rowing', 'pose_sailing', 'pose_beached']) if (!n.anim.includes(k)) { all = false; why += ` ${boat}_${lod}:${k}`; }
  }
  ok(all, 'live and far files of all four boats carry hull, hullmask, waterline, oar_l, oar_r, the sailer its rig, and the pose clips' + why);
  for (const lod of ['live', 'far']) {
    const src = fs.readFileSync(path.join(D0, '..', 'boatkit', `boats_${lod}_b64.js`), 'utf8'); let same = true;
    for (const boat of ['dinghy', 'sailer', 'work', 'wreck']) { const m = src.match(new RegExp(`LI_BOAT_GLB\\['${boat}_${lod}'\\]='([^']+)'`)); if (!m || !Buffer.from(m[1], 'base64').equals(fs.readFileSync(path.join(D0, `boat_${boat}_${lod}.glb`)))) same = false; }
    ok(same, `the ${lod} page twin script matches the four GLB files (run tools/boats_b64.py to rebuild)`);
  }
}
console.log(fails ? fails + ' FAILED' : 'all passed');
process.exit(fails ? 1 : 0);
