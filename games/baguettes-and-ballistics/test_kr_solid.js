// Kitchen Run solids test (Playwright, Chromium software GL).
//   NODE_PATH=$(npm root -g) node test_kr_solid.js [path/to/index.html] [--runs=30] [--quick] [--nolaps] [--only=AreaName]
// Steps the real car code (krUpdate, 1/60 s per step) with random, imperfect drivers started at every kind of transition on the
// course, and counts "clip events": (a) the car inside a solid prop volume (an oracle list built here from the course data, not from the
// game's own collision list), (b) the car's height jumping up or down more than 1 unit in one frame while it is on the ground,
// (c) the car below the worktop, (d) the car switching to a road at another height. Also: the three shortcuts with a bot that takes them, full laps of a perfect bot
// on all six levels (lap time), a smoke of drift mode and My Track, page errors and geometry count.
// Exit code 0 only if there are zero clip events, shortcuts work, laps are within 3 s of the baseline, 0 page errors, flat memory.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url); // (the repo's package.json says "type": "module"; NODE_PATH still finds playwright through require)
const { chromium } = require('playwright');
const path = require('path');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const html = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(__dirname, 'index.html'));
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
// This bot (steers at the path 7 points ahead, no tokens) lapped in 36.9 s (37.8 s on level 5) on the code before the solids fix; the notes' 40.2 s / 41.1 s came from a bot that also collected tokens.
const LAP_BASE = 36.9, LAP_BASE_L5 = 37.8;
const RUNS = +opt('runs', 30), QUICK = args.includes('--quick'), LAPS = !args.includes('--nolaps');

// ---- runs inside the page ----
function harness(cfg) {
  update = () => {}; render = () => {};
  const rnd = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = { areas: {}, events: [], laps: [], total: 0, respawns: 0 };
  const lv = cfg.level;
  curLevel = lv; reset();
  const R = state.race, K = R.kr, M = K.main, N = M.named, c = state.player;
  R.intro = false; R.hold = 0; state.phase = 'race';
  const [Dr, Sp, Ru] = K.br;
  // ---- the oracle: solid volumes, from the course data (mirrors what krScene builds) ----
  const S = []; // {k: 'obb'|'cyl'|'slab', ...}
  const BACK = -86, FRONT = 0, WEST = -232, EAST = 222;
  const A = (P, nm) => P.pts[P.named[nm].i0], B = (P, nm) => P.pts[P.named[nm].i1];
  const obb = (name, a, b, w, y0, y1, d = 0) => { const L = Math.hypot(b.x - a.x, b.z - a.z) + d; S.push({ k: 'obb', name, cx: (a.x + b.x) / 2, cz: (a.z + b.z) / 2, h: Math.atan2(b.z - a.z, b.x - a.x), hl: L / 2, hw: w / 2, y0, y1 }); };
  const aabb = (name, x0, x1, y0, y1, z0, z1) => S.push({ k: 'obb', name, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, h: 0, hl: (x1 - x0) / 2, hw: (z1 - z0) / 2, y0, y1 });
  const cyl = (name, x, z, r, y0, y1) => S.push({ k: 'cyl', name, cx: x, cz: z, r, y0, y1 });
  const slab = (name, P, nm, w, t) => { const a = A(P, nm), b = B(P, nm); S.push({ k: 'slab', name, a, b, hw: w / 2, t, L: Math.hypot(b.x - a.x, b.z - a.z), h: Math.atan2(b.z - a.z, b.x - a.x) }); };
  obb('bin', A(M, 'bin'), B(M, 'bin'), 15, 0, 10);
  obb('tin', A(M, 'tin'), B(M, 'tin'), 14, 0, 7);
  slab('board', M, 'board', 13, 1.4); slab('tinramp', M, 'tinramp', 13, 1.6); slab('ramp1', M, 'ramp1', 16, 7); slab('ramp2', M, 'ramp2', 16, 7);
  slab('knife', M, 'knife', 7, 0.6); slab('spatula', M, 'spatula', 9.5, 0.6); slab('slide', M, 'slide', 14, 0.8);
  slab('spoon1', Dr, 'spoon1', 6, 1); slab('spoon2', Dr, 'spoon2', 6, 1);
  // the box that holds a bend exactly (road edges, start plane to end plane, in the start's frame): the books under the platform and the tea tin
  const bend = (name, P, nm, y0, y1) => { const s0 = P.named[nm], q0 = P.pts[s0.i0], h = P.head[s0.i0], tx = Math.cos(h), tz = Math.sin(h), nx = -tz, nz = tx; let u0 = 0, u1 = -1e9, w0 = 1e9, w1 = -1e9; for (let i = s0.i0; i <= s0.i1; i++) { const q = P.pts[i], hh = P.head[i]; for (const sd of [-1, 1]) { const x = q.x - Math.sin(hh) * q.hw * sd - q0.x, z = q.z + Math.cos(hh) * q.hw * sd - q0.z, u = x * tx + z * tz, w = x * nx + z * nz; u1 = Math.max(u1, u); w0 = Math.min(w0, w); w1 = Math.max(w1, w); } } const cu = (u0 + u1) / 2, cw = (w0 + w1) / 2; S.push({ k: 'obb', name, cx: q0.x + tx * cu + nx * cw, cz: q0.z + tz * cu + nz * cw, h, hl: (u1 - u0) / 2, hw: (w1 - w0) / 2, y0, y1 }); };
  bend('books', M, 'plat', 0, 16);
  const sill = (() => { let x0 = 1e9, x1 = -1e9; for (const nm of ['sillT', 'sill1', 'plant', 'sill2']) { const s = N[nm]; for (let i = s.i0; i <= s.i1; i++) { x0 = Math.min(x0, M.pts[i].x - M.pts[i].hw); x1 = Math.max(x1, M.pts[i].x + M.pts[i].hw); } } return [x0 - 10, x1 + 4]; })();
  const sy = M.pts[N.sill1.i0].y; aabb('sill', sill[0], sill[1], sy - 4, sy, BACK, Math.min(-63, M.pts[N.sillT.i0].z - 0.05));
  bend('caddy', M, 'caddy', 0, sy);
  const ta = A(M, 'toaster'), th = M.head[N.toaster.i0]; S.push({ k: 'obb', name: 'toaster', cx: ta.x + Math.cos(th) * 8, cz: ta.z + 2.5, h: th, hl: 8, hw: 7.5, y0: 0, y1: 8 });
  { const a = A(M, 'cake'), b = B(M, 'cake'), f = 10.5 / Math.hypot(b.x - a.x, b.z - a.z); cyl('cake', a.x + (b.x - a.x) * f, a.z + (b.z - a.z) * f, 4.5, 0, 5.05); }
  const fA = A(M, 'fridge'), fB = B(M, 'fridge'), fx0 = Math.min(fA.x, fB.x) - 2, fx1 = Math.max(fA.x, fB.x) + 2, fz = fA.z;
  aabb('fridge', fx0, fx1, 6.6, 31, fz - 15, fz + 15);
  for (const [x, z] of [[fx0 + 2, fz - 13], [fx1 - 2, fz - 13], [fx0 + 2, fz + 13], [fx1 - 2, fz + 13]]) cyl('fridgeLeg', x, z, 1.1, 0, 7);
  const mI = B(M, 'mwIn'), mx = mI.x, mz = mI.z;
  aabb('mwRoof', mx - 30, mx, 16.4, 18, mz - 15, mz + 15); aabb('mwWallN', mx - 30, mx, 0, 18, mz - 15, mz - 13); aabb('mwWallS', mx - 30, mx, 0, 18, mz + 13, mz + 15); aabb('mwBack', mx - 30, mx - 28.4, 0, 18, mz - 15, mz + 15);
  // the cutlery drawer
  const dd = (() => { let x0 = 1e9, x1 = -1e9, z1 = -1e9; for (const nm of ['drT1', 'rim0', 'rimB', 'rim', 'drT2']) { const s = Dr.named[nm]; for (let i = s.i0; i <= s.i1; i++) { const q = Dr.pts[i]; x0 = Math.min(x0, q.x - q.hw); x1 = Math.max(x1, q.x + q.hw); z1 = Math.max(z1, q.z + q.hw); } } return [x0 - 6, x1 + 6, FRONT - 1, Math.max(z1 + 14, FRONT + 26)]; })();
  const dyT = Dr.pts[Dr.named.rim.i0].y, rz = Dr.pts[Dr.named.rim.i0].z;
  aabb('drFloor', dd[0], dd[1], dyT - 9.5, dyT - 8.5, dd[2], dd[3]); aabb('drWallW', dd[0] - 0.7, dd[0] + 0.7, dyT - 9, dyT, dd[2], dd[3]); aabb('drWallE', dd[1] - 0.7, dd[1] + 0.7, dyT - 9, dyT, dd[2], dd[3]); aabb('drWallS', dd[0], dd[1], dyT - 9, dyT, dd[3] - 0.7, dd[3] + 0.7);
  aabb('drDiv', dd[0], dd[1], dyT - 8.5, dyT - 0.5, rz - 0.5, rz + 0.5);
  for (const z of [rz + 8, rz + 15]) aabb('drTray', dd[0], dd[1], dyT - 8.6, dyT - 0.6, z - 0.4, z + 0.4);
  // worktops (a slab 4 thick: a car between y -0.6 and -4 over one is inside it; below that is the cupboard, which has the open drawer in it), minus the sink basin
  const bb = (P, names, pad) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const nm of names) { const s = P.named[nm]; for (let i = s.i0; i <= s.i1; i++) { const q = P.pts[i]; x0 = Math.min(x0, q.x - q.hw); x1 = Math.max(x1, q.x + q.hw); z0 = Math.min(z0, q.z - q.hw); z1 = Math.max(z1, q.z + q.hw); } } return [x0 - pad, x1 + pad, z0 - pad, z1 + pad]; };
  const basin = bb(M, ['sink0', 'sink1', 'sinkW', 'sinkOut'], 3); basin[2] = Math.min(basin[2], -31); basin[3] = Math.max(basin[3], -1);
  const isl = bb(M, ['land', 'hob0', 'hob2', 'cake', 'fridge', 'mwIn'], 12); isl[0] -= 26; isl[3] += 6;
  const tops = [[WEST, EAST, BACK, FRONT], isl];
  const inObb = (s, x, z) => { const dx = x - s.cx, dz = z - s.cz, cs = Math.cos(s.h), sn = Math.sin(s.h), u = dx * cs + dz * sn, v = -dx * sn + dz * cs; return Math.abs(u) < s.hl - 0.3 && Math.abs(v) < s.hw - 0.3; };
  const inside = (x, y, z) => {
    const py = y + 0.35;
    for (const s of S) {
      if (s.k === 'obb') { if (py > s.y0 + 0.25 && py < s.y1 - 0.65 && inObb(s, x, z)) return s.name; }
      else if (s.k === 'cyl') { if (py > s.y0 + 0.25 && py < s.y1 - 0.65 && Math.hypot(x - s.cx, z - s.cz) < s.r - 0.3) return s.name; }
      else { const dx = x - s.a.x, dz = z - s.a.z, cs = Math.cos(s.h), sn = Math.sin(s.h), u = dx * cs + dz * sn, v = -dx * sn + dz * cs; if (u > 0.5 && u < s.L - 0.5 && Math.abs(v) < s.hw - 0.3) { const top = s.a.y + (s.b.y - s.a.y) * (u / s.L); if (py < top - 0.25 && py > top - s.t + 0.25) return s.name; } }
    }
    if (py < -0.6 && py > -3.7) for (const [x0, x1, z0, z1] of tops) if (x > x0 && x < x1 && z > z0 && z < z1 && !(x > basin[0] && x < basin[1] && z > basin[2] && z < basin[3])) return 'worktop';
    return null;
  };
  // ---- the driver ----
  const pathOf = { M, Dr, Sp, Ru };
  const place = (P, i, speed) => {
    const q = P.pts[i], h = P.head[i];
    Object.assign(c, { kp: P, wp: i, x: q.x, z: q.z, y: q.y, vy: 0, heading: h, vx: Math.cos(h) * speed, vz: Math.sin(h) * speed, krAir: false, scr: null, good: [P, i], goodY: q.y, wob: 0, boostT: 0, spinT: 0, sog: 0, lastKick: -1, prog: krMainS(P, i) });
  };
  const runOne = (P, i0, seconds, seed, mode, branch) => {
    const r = rnd(seed), ev = [];
    while (i0 > 1 && (!P.pts[i0].solid || P.pts[i0].scr || P.pts[i0].kick || !P.pts[i0 + 1].solid)) i0--; // (start on real road, not in a gap or a ride)
    place(P, i0, 12 + r() * 12);
    let off = (r() - 0.5) * 6, offT = off, beh = 0, behT = 0, t = 0, prevY = c.y, inName = null, inStart = 0, jumpOpen = 0, stuck = 0, rev = 0, bank = 0;
    const steps = Math.round(seconds * 60);
    for (let f = 0; f < steps; f++) {
      behT -= 1 / 60;
      if (behT <= 0) { behT = 0.4 + r() * 1.4; beh = mode === 'edge' ? (r() < 0.7 ? 1 : 0) : Math.floor(r() * 5); offT = (r() - 0.5) * 2 * ((c.kp.pts[c.wp].hw || 5) + 3); if (beh === 1) offT = (r() < 0.5 ? -1 : 1) * ((c.kp.pts[c.wp].hw || 5) + r() * 2 - 1.2); if (beh === 3) rev = 0.3 + r() * 0.6; if (beh === 4 && r() < 0.5) c.spinT = 0.8; bank = (r() - 0.5) * 1.8; }
      const Pp = (branch && c.kp === M) ? branch : c.kp;
      const useP = branch && c.kp === M && c.wp >= branch.from - 12 && r() < 0.0 ? Pp : c.kp;
      const P2 = c.kp, j = Math.min(P2.pts.length - 1, c.wp + 6), q = P2.pts[j], nrm = P2.nor[j];
      off += (offT - off) * 0.05;
      let tx = q.x + nrm[0] * off, tz = q.z + nrm[1] * off;
      if (branch && c.kp === M && c.wp >= branch.from - 14 && c.wp <= branch.from + 2) { const bq = branch.pts[Math.min(12, branch.pts.length - 1)]; tx = bq.x; tz = bq.z; }
      if (beh === 2) { const a = P2.head[j] + bank; tx = c.x + Math.cos(a) * 20; tz = c.z + Math.sin(a) * 20; }
      let ix = tx - c.x, iz = tz - c.z; const l = Math.hypot(ix, iz) || 1; ix /= l; iz /= l;
      if (rev > 0) { rev -= 1 / 60; ix = -ix; iz = -iz; }
      input.keys.clear(); input.x = ix; input.z = iz;
      state.phase = 'race'; R.winner = null; // (a fuzz run that crosses the finish must not end the race)
      const before = { y: c.y, air: c.krAir, scr: !!c.scr };
      const rs0 = c.wob, kp0 = c.kp;
      krUpdate(1 / 60);
      if (c.kp !== kp0 && !c.scr && !before.scr && !before.air && c.wob < rs0 + 0.5) { const q2 = c.kp.pts[c.wp]; if (Math.abs(q2.y - c.y) > 2.5) ev.push({ type: 'wrongPath', t: +t.toFixed(2), dy: +(q2.y - c.y).toFixed(1), x: +c.x.toFixed(1), y: +c.y.toFixed(1), z: +c.z.toFixed(1), P: c.kp.name || 'M', wp: c.wp }); } // (a grounded car switching to a road at another height; a car falling into the sink is about to respawn anyway)
      t += 1 / 60;
      if (c.wob > rs0 + 0.5) out.respawns++;
      if (before.scr || c.scr) { prevY = c.y; inName = null; continue; }
      const dy = c.y - prevY; prevY = c.y;
      let tag = null;
      if (!before.air && !c.krAir && Math.abs(dy) > 1.0 && c.wob < 0.89) tag = dy > 0 ? 'snapUp' : 'snapDown';
      const s = c.y > -80 ? inside(c.x, c.y, c.z) : null;
      if (s) { if (inName !== s) { inName = s; inStart = f; ev.push({ type: 'inside:' + s, t: +t.toFixed(2), x: +c.x.toFixed(1), y: +c.y.toFixed(1), z: +c.z.toFixed(1), wp: c.wp, P: c.kp.name || 'M', air: c.krAir }); } } else inName = null;
      if (tag) ev.push({ type: tag, t: +t.toFixed(2), dy: +dy.toFixed(2), x: +c.x.toFixed(1), y: +c.y.toFixed(1), z: +c.z.toFixed(1), wp: c.wp, P: c.kp.name || 'M' });
    }
    return ev;
  };
  // ---- the areas: every transition type ----
  const areas = [];
  const seg = (P, nm, back = 12, extra = 3) => { const s = P.named[nm]; areas.push({ name: (P.name || 'M') + ':' + nm, P, i: Math.max(1, s.i0 - back), sec: (P.cum[Math.min(P.pts.length - 1, s.i1 + 8)] - P.cum[Math.max(1, s.i0 - back)]) / 20 + extra }); };
  for (const nm of ['start', 'board', 'bin', 'gap1', 'tin', 'tinramp', 'loopA', 'tube', 'loopC', 'preC', 'ramp1', 'plat', 'ramp2', 'sillT', 'plantA', 'plant', 'sill2', 'caddy', 'slide', 'sinkT', 'sink0', 'sink2', 'sinkW', 'sinkOut', 'knife', 'toaster', 'land', 'hobIn', 'hob1', 'hob2', 'foil2', 'spatula', 'cake', 'land2', 'fridge', 'mwIn', 'ovenIn', 'ovendoor']) seg(M, nm);
  for (const nm of ['spoon1', 'rimB', 'spoon2', 'drOut']) seg(Dr, nm); seg(Sp, 'pad'); for (const nm of ['ruler', 'ruOut']) seg(Ru, nm);
  const forks = [[M, Dr, 'forkA'], [M, Sp, 'forkS'], [M, Ru, 'forkR']];
  for (const [, Bp, nm] of forks) areas.push({ name: 'fork:' + nm, P: M, i: Math.max(1, Bp.from - 14), sec: 7, branch: Bp });
  const only = cfg.only;
  const total = { snapUp: 0, snapDown: 0, inside: 0, wrongPath: 0 }, perType = {};
  const lines = [];
  for (const a of areas) {
    if (only && !a.name.includes(only)) continue;
    let n = 0, ex = null;
    for (let r = 0; r < cfg.runs; r++) {
      const ev = runOne(a.P, a.i, a.sec, 1000 + r * 7919 + a.i * 31 + lv * 101, r % 3 === 1 ? 'edge' : 'mix', a.branch);
      for (const e of ev) { n++; const k = e.type.startsWith('inside') ? e.type : e.type; perType[k] = (perType[k] || 0) + 1; if (e.type.startsWith('inside')) total.inside++; else total[e.type]++; if (!ex) ex = e; if (out.events.length < 40) out.events.push({ area: a.name, ...e }); }
    }
    out.areas[a.name] = n;
  }
  out.total = total.snapUp + total.snapDown + total.inside + total.wrongPath; out.totalBy = total; out.perType = perType;
  // ---- the three shortcuts with a bot that takes them: must still get through, without a respawn, and save time on the main line ----
  if (cfg.lap) {
    out.cuts = [];
    for (const [Bp, nm] of [[Dr, 'drawer'], [Sp, 'whisk'], [Ru, 'ruler']]) {
      const run = (useCut) => {
        place(M, Math.max(1, Bp.from - 14), 22); c.good = [M, c.wp]; c.prog = krMainS(M, c.wp);
        let t = 0, resp = 0, w0 = 0, took = false;
        while (t < 14 && !(c.kp === M && c.wp >= Bp.to + 2)) {
          state.phase = 'race'; R.winner = null;
          const P = c.kp; let tx, tz;
          if (useCut && P === M && c.wp >= Bp.from - 14 && c.wp <= Bp.from + 2) { const bq = Bp.pts[Math.min(10, Bp.pts.length - 1)]; tx = bq.x; tz = bq.z; }
          else if (P === Bp && c.wp > P.pts.length - 8) { const q = M.pts[Math.min(M.pts.length - 1, Bp.to + 8)]; tx = q.x; tz = q.z; } // (the end of the shortcut: aim on along the main line)
          else { const q = P.pts[Math.min(P.pts.length - 1, c.wp + 7)]; tx = q.x; tz = q.z; }
          if (c.kp === Bp) took = true;
          let ix = tx - c.x, iz = tz - c.z; const l = Math.hypot(ix, iz) || 1; input.keys.clear(); input.x = ix / l; input.z = iz / l;
          const wb = c.wob; krUpdate(1 / 60); t += 1 / 60; if (c.wob > wb + 0.5) resp++;
        }
        return { t: +t.toFixed(2), resp, took, done: c.kp === M && c.wp >= Bp.to + 2 };
      };
      const cut = run(true), main = run(false);
      out.cuts.push({ name: nm, cut, main, saves: +(main.t - cut.t).toFixed(2) });
    }
  }
  // ---- a perfect-bot lap ----
  if (cfg.lap) {
    reset(); const R2 = state.race, c2 = state.player; R2.intro = false; R2.hold = 0; state.phase = 'race';
    let t = 0, snaps = 0, ins = 0, prevY = c2.y; const insN = {};
    while (t < 100 && !R2.winner) {
      const P = c2.kp, i = Math.min(P.pts.length - 1, c2.wp + 7), q = P.pts[i];
      let ix = q.x - c2.x, iz = q.z - c2.z; const l = Math.hypot(ix, iz) || 1;
      input.keys.clear(); input.x = ix / l; input.z = iz / l;
      const wasAir = c2.krAir, wasScr = !!c2.scr;
      krUpdate(1 / 60); t += 1 / 60;
      if (!wasScr && !c2.scr && !wasAir && !c2.krAir && Math.abs(c2.y - prevY) > 1.0) snaps++;
      prevY = c2.y;
      if (!c2.scr) { const s2 = inside(c2.x, c2.y, c2.z); if (s2) { ins++; insN[s2] = (insN[s2] || 0) + 1; } }
    }
    out.laps.push({ level: lv + 1, t: +t.toFixed(1), won: !!R2.winner, snaps, insideFrames: ins, insideBy: insN });
  }
  out.geo = renderer.info.memory.geometries;
  return out;
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const errs = [];
  const levels = QUICK ? [0] : [0, 1, 2, 3, 4, 5];
  let totalClips = 0; const cutRes = [], lapRes = [], geos = [], perArea = {}, perType = {}; const examples = [];
  for (const lv of levels) {
    const p = await b.newPage({ viewport: { width: 640, height: 400 } });
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) errs.push('console: ' + m.text()); });
    await p.goto('file://' + html, { waitUntil: 'load' }); await p.waitForTimeout(1200);
    const out = await p.evaluate(harness, { level: lv, runs: RUNS, lap: LAPS, only: opt('only', '') });
    totalClips += out.total; lapRes.push(...out.laps); geos.push(out.geo); if (out.cuts) cutRes.push({ level: lv + 1, cuts: out.cuts });
    for (const [k, v] of Object.entries(out.areas)) perArea[k] = (perArea[k] || 0) + v;
    for (const [k, v] of Object.entries(out.perType)) perType[k] = (perType[k] || 0) + v;
    for (const e of out.events) if (examples.length < 25) examples.push({ level: lv + 1, ...e });
    console.log(`level ${lv + 1}: clip events ${out.total} (snapUp ${out.totalBy.snapUp}, snapDown ${out.totalBy.snapDown}, inside ${out.totalBy.inside}, wrongPath ${out.totalBy.wrongPath}); respawns ${out.respawns}; lap ${JSON.stringify(out.laps[0])}`);
    await p.close();
  }
  console.log('\nclip events by area (all levels):'); for (const [k, v] of Object.entries(perArea).filter(([, v]) => v).sort((a, b2) => b2[1] - a[1])) console.log('  ', k, v);
  console.log('clip events by type:', JSON.stringify(perType));
  console.log('examples:'); for (const e of examples.slice(0, 12)) console.log('  ', JSON.stringify(e));
  console.log('laps:', lapRes.map((l) => `L${l.level} ${l.t}s${l.won ? '' : ' (NOT FINISHED)'} snaps ${l.snaps} inside ${l.insideFrames}`).join(' | '));
  for (const r of cutRes) console.log(`shortcuts L${r.level}:`, r.cuts.map((x) => `${x.name} ${x.cut.done && x.cut.took && !x.cut.resp ? 'ok' : 'BROKEN'} ${x.cut.t}s vs main ${x.main.t}s (saves ${x.saves}s)`).join(' | '));
  console.log('geometries per level page:', geos.join(', '));
  // memory: a second page of cycles of reset(), geometry count must stay flat
  const pm = await b.newPage({ viewport: { width: 640, height: 400 } }); pm.on('pageerror', (e) => errs.push(e.message));
  await pm.goto('file://' + html, { waitUntil: 'load' }); await pm.waitForTimeout(1200);
  const mem = await pm.evaluate(() => { update = () => {}; render = () => {}; const g = []; for (let k = 0; k < 4; k++) { curLevel = k % 6; reset(); for (let f = 0; f < 120; f++) { state.race.intro = false; state.race.hold = 0; krUpdate(1 / 60); } renderer.render(scene, camera); g.push(renderer.info.memory.geometries); } return g; });
  console.log('geometry count over 4 race builds:', mem.join(', '));
  // smoke: drift mode and My Track (both reuse krStart / krCar / krRival) load and run a few seconds in the real loop with no page errors
  const ps = await b.newPage({ viewport: { width: 640, height: 400 } }); const smokeErrs = [];
  ps.on('pageerror', (e) => smokeErrs.push(e.message)); ps.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::/.test(m.text())) smokeErrs.push('console: ' + m.text()); });
  await ps.goto('file://' + html, { waitUntil: 'load' }); await ps.waitForTimeout(1200);
  await ps.evaluate(() => { driftBegin(); }); await ps.waitForTimeout(800);
  await ps.evaluate(() => { const R = state.race; if (R) R.intro = false; if (R && R.hold) R.hold = 0; }); await ps.keyboard.down('KeyW'); await ps.waitForTimeout(2500); await ps.keyboard.up('KeyW');
  const driftOk = await ps.evaluate(() => !!(state.race && state.race.drift));
  await ps.reload({ waitUntil: 'load' }); await ps.waitForTimeout(1200);
  // (the practice table is scanned as time passes, so retry the auto track for a few seconds)
  const mt = await ps.evaluate(async () => { mtBegin(false); let okc = false; for (let k = 0; k < 24 && !okc; k++) { await new Promise((r) => setTimeout(r, 500)); mtAutoGo(); okc = !!(MT.cand && MT.cand.chk.ok); } if (okc) { mtGo(); await new Promise((r) => setTimeout(r, 400)); const R = state.race; if (R) { R.intro = false; R.hold = 0; $('lrIntro').hidden = true; } } return okc; });
  await ps.keyboard.down('KeyW'); await ps.waitForTimeout(2500); await ps.keyboard.up('KeyW');
  const mtRaced = await ps.evaluate(() => !!(state.race && state.race.kr && state.race.mt));
  await ps.evaluate(() => { mtExit(); }); await ps.waitForTimeout(500);
  console.log(`smoke: drift ${driftOk ? 'ran' : 'DID NOT START'}, My Track auto-track ${mt ? 'built' : 'NOT BUILT'}, race ${mtRaced ? 'ran' : 'DID NOT START'}, page errors ${smokeErrs.length}`, smokeErrs.slice(0, 3));
  errs.push(...smokeErrs); if (!driftOk || !mt || !mtRaced) errs.push('smoke: a mode did not start');
  await ps.close();
  console.log('page errors:', errs.length, errs.slice(0, 3));
  await b.close();
  let ok = totalClips === 0 && errs.length === 0 && mem.every((g) => g === mem[0]);
  if (LAPS) for (const l of lapRes) { const base = l.level === 5 ? LAP_BASE_L5 : LAP_BASE; if (!l.won || Math.abs(l.t - base) > 3.0) ok = false; }
  for (const r of cutRes) for (const x of r.cuts) if (!(x.cut.done && x.cut.took && !x.cut.resp)) ok = false;
  console.log(`\nRESULT: ${ok ? 'PASS' : 'FAIL'} (clip events: ${totalClips})`);
  process.exit(ok ? 0 : 1);
})();
