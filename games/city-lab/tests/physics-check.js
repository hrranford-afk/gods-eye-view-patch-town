/* PHYSICS CROSS-CHECK (optional stretch, not part of the main test suite). Run: NODE_PATH=$(npm root -g) node tests/physics-check.js
   It is NOT the bakery: it is a small frame in the Brick Lab's own kit (4 posts, 4 beams on two courses, a plank deck, 12 tiles, a crate; 27 rigid bodies, Rapier 0.21 SIMD
   build, sim.js from the sibling brick-lab worktree) built with the same topology as a recipe: posts on the ground, beams on posts, deck planks on beams, tiles on planks.
   The kit has only six box shapes, so the bakery's own sizes, sloped roof and wall panels cannot be baked into it, and the frame sits as a different arrangement than the bakery's
   (the second beam course rests on the first). What it checks: for each of the 27 pieces taken out alone, do the same pieces fall in real physics as the support rule predicts for
   the recipe-shaped graph of this frame? and what does a real ball do to it? Result: printed, and written to tests/physics-check.json. Disagreements are listed, not hidden. */
'use strict';
const fs = require('fs');
const path = require('path');
const SUP = require('../supports.js');
const BLDIR = ['/home/user/gods-eye-view-patch-town/.worktrees/brick-lab/games/brick-lab', path.resolve(__dirname, '..', '..', 'brick-lab')].find((d) => fs.existsSync(path.join(d, 'sim.js')));
if (!BLDIR) { console.log('SKIP: the brick-lab worktree (sim.js and vendor/rapier-0.21-simd-compat) is not here'); process.exit(0); }
const BL = require(path.join(BLDIR, 'sim.js'));

const qy = (a) => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
function frame() {
  const P = [], G = [];   /* P: physics pieces; G: the recipe-shaped graph */
  const add = (id, t, x, y, z, q, needs, min) => { P.push({ id, t, x, y, z, q: q || [0, 0, 0, 1] }); G.push({ id, needs: needs || [], needsMin: needs && needs.length ? (min || needs.length) : undefined }); };
  ['fl', 'fr', 'bl', 'br'].forEach((k) => add('post.' + k, 'post', k[1] === 'l' ? -0.5 : 0.5, 0.35, k[0] === 'f' ? 0.35 : -0.35));
  add('beam.f', 'beam', 0, 0.76, 0.35, null, ['post.fl', 'post.fr']); add('beam.b', 'beam', 0, 0.76, -0.35, null, ['post.bl', 'post.br']);
  add('beam.l', 'beam', -0.5, 0.88, 0, qy(Math.PI / 2), ['beam.f', 'beam.b']); add('beam.r', 'beam', 0.5, 0.88, 0, qy(Math.PI / 2), ['beam.f', 'beam.b']);
  const zs = [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5];
  zs.forEach((z, i) => add('plank.' + i, 'plank', 0, 0.97, z, null, ['beam.l', 'beam.r']));
  [-0.39, -0.13, 0.13, 0.39].forEach((z, j) => [-0.3, 0, 0.3].forEach((x, i) => {
    const near = zs.map((q, k) => [Math.abs(q - z), k]).sort((a, b) => a[0] - b[0]).slice(0, 2).map((e) => 'plank.' + e[1]);
    add('tile.' + j + i, 'tile', x, 1.02, z, null, near, 1);
  }));
  add('crate', 'crate', -0.2, 0.15, 0, null, []);
  return { P, G };
}

(async () => {
  const lo = await BL.loadRapier('021simd', BLDIR), R = lo.R;
  const { P, G } = frame();
  const settle = (s) => { for (let i = 0; i < 60; i++) s.step(); s.rebase(); };
  const base = BL.makeSim(R); base.build(P); settle(base);
  const stands = base.maxDisp();
  console.log('Rapier ' + lo.label + ', ' + P.length + ' bodies; the untouched frame, settled, then 3 s more: max displacement ' + (stands * BL.UNIT_MM).toFixed(2) + ' mm-equivalent');
  for (let i = 0; i < 180; i++) base.step();
  const standsOk = base.maxDisp() * BL.UNIT_MM < 3; base.dispose();
  const rows = []; let agree = 0, ruleOnly = [], physOnly = [];
  for (const p of P) {
    const s = BL.makeSim(R); s.build(P); settle(s);
    const rec = s.pieces[P.findIndex((q) => q.id === p.id)]; s.removePiece(rec);
    for (let i = 0; i < 240; i++) s.step();
    const moved = []; s.pieces.forEach((pc) => { const t = pc.body.translation(), d = Math.hypot(t.x - pc.x0, t.y - pc.y0, t.z - pc.z0); if (d > 0.15) moved.push(P[BL.KIT ? s.pieces.indexOf(pc) + (s.pieces.indexOf(pc) >= P.findIndex((q) => q.id === p.id) ? 1 : 0) : 0].id); });
    const rule = SUP.fall(G, [p.id]).fallen.slice().sort(), phys = moved.slice().sort();
    const eq = JSON.stringify(rule) === JSON.stringify(phys); if (eq) agree++;
    else { const ro = rule.filter((x) => phys.indexOf(x) < 0), po = phys.filter((x) => rule.indexOf(x) < 0); ruleOnly.push([p.id, ro]); physOnly.push([p.id, po]); }
    rows.push({ removed: p.id, rule: rule.length, physics: phys.length, same: eq });
    s.dispose();
  }
  console.log('Single removals, 27 pieces: the support rule and the physics agree on exactly which pieces fall for ' + agree + ' of 27.');
  console.log('Rule says falls, physics keeps standing: ' + JSON.stringify(ruleOnly.filter((r) => r[1].length)));
  console.log('Physics says moved, rule keeps: ' + JSON.stringify(physOnly.filter((r) => r[1].length)));
  /* a real ball: a Big marble at the front-left post from the front, speed 14 */
  const shots = {};
  for (const [name, tgt] of [['post.fl', { x: -0.5, y: 0.35, z: 0.35 }], ['beam.f', { x: 0, y: 0.76, z: 0.35 }], ['crate-side (a roof tile)', { x: 0.3, y: 1.02, z: 0.39 }]]) {
    const s = BL.makeSim(R); s.build(P); settle(s);
    const from = { x: tgt.x, y: Math.max(0.5, tgt.y + 0.2), z: 3 }, v = BL.aimAt(tgt.x, tgt.y, tgt.z, from, 14);
    s.addBall('big', from, v); for (let i = 0; i < 300; i++) s.step();
    const gone = []; s.pieces.forEach((pc, idx) => { const t = pc.body.translation(); if (Math.hypot(t.x - pc.x0, t.y - pc.y0, t.z - pc.z0) > 0.15) gone.push(P[idx].id); });
    shots[name] = { moved: gone.length, ids: gone, stillStanding: P.length - gone.length, hash: s.hash() }; s.dispose();
    console.log('Big marble at ' + name + ': ' + gone.length + ' of 27 pieces moved more than 3 cm-equivalent: ' + gone.join(' ') + (SUP.fall(G, gone.filter((id) => /^(post|beam)\./.test(id)).slice(0, 1)).fallen.length ? '' : ''));
  }
  const out = { when: new Date().toISOString(), rapier: lo.label, bodies: P.length, standsStill: standsOk, singleRemovalAgreement: agree + ' of 27', ruleOnly, physOnly, rows, shots };
  fs.writeFileSync(path.join(__dirname, 'physics-check.json'), JSON.stringify(out, null, 1));
  process.exit(0);
})().catch((e) => { console.log('physics check could not run: ' + e.message); process.exit(0); });
