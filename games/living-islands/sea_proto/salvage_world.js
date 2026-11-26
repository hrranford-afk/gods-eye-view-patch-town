/* Living Islands sea prototype: the SALVAGE WORLD (research/VARIETY_AND_SALVAGE_PLAN.md, items 3). Needs salvage.js (window.LI_SALVAGE) and three.js r128.
   window.LI_SALVAGE.makeWorld(opts) puts the instanced kit into the sea and on the beach:
   - SEA: objects ride the CPU wave height (heave, pitch, roll from three samples), drift on a flow field (wind drift, wind lanes that gather things into rows, slow eddies, the tide's push toward the shore, the whirlpool),
     slow down in the lee of an island (the wave shadow), ground in the shallows and refloat on a later tide. Rope-bound rafts of planks turn together. Scattered by rules, not uniformly.
   - BEACH: wrack-line clusters on the tide band (timber, kelp lines, shell and pebble runnels, a few hardware finds), tilted to the slope, partly buried, wet by the tide.
   env (all supplied by the page): seaH(x,z,t), ground(x,z), tide(t), shadow(x,z), wind() radians, storm() 0..1, vort() -> {x,z,R,k}|null, islands() bool, isl [{cx,cz}], camera.
   Deterministic: hashed seeds only, so the same id is the same object. State is plain objects; drift is integrated in dt steps (settle() runs a fixed run-in so a still picture is repeatable). Tags: TUNING = a game number. */
(function (root) {
  'use strict';
  const S = root.LI_SALVAGE; if (!S) return;
  const { KINDS, KIND, hash, rng, clamp, lerp, n3, derive, rawFor } = S, TAU = Math.PI * 2, sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const LANE = 34, SEA_R = 330;   /* TUNING: wind lane spacing, radius of the region the objects live in */

  function makeWorld(o) {
    const T = o.THREE, env = o.env, kit = o.kit, W = { items: [], rafts: [], count: 0, V: o.variation === undefined ? 1 : o.variation, sizeK: o.size || 1.35, lodK: o.lodK || 1, seed: o.seed || 7, enabled: true, frameNo: 0 };
    let set = null; const frustum = new T.Frustum(), pm = new T.Matrix4(), q1 = new T.Quaternion(), q2 = new T.Quaternion(), qr = new T.Quaternion(), e1 = new T.Euler(0, 0, 0, 'YZX'), p1 = new T.Vector3(), s1 = new T.Vector3(), m1 = new T.Matrix4(), sph = new T.Sphere(), v3 = new T.Vector3();
    const lights = { hemi: new T.HemisphereLight(0xcfe0f0, 0x3a4a48, .65), sun: new T.DirectionalLight(0xfff0d8, 1) }; lights.sun.position.set(-30, 40, 20); o.scene.add(lights.hemi, lights.sun);
    const tmpF = [0, 0], dd = {}; let tNow = 0;

    /* ------------------------------------------------------------ flow ------------------------------------------------------------ */
    function laneW(x, z) { const w = env.wind(), c = -x * Math.sin(w) + z * Math.cos(w), a = x * Math.cos(w) + z * Math.sin(w), q = TAU * (c / LANE + .15 * Math.sin(a / 90 + 1.3)); return { q, w: Math.pow(.5 + .5 * Math.cos(q), 2.4) }; }
    /* the surface flow (m/s) at (x,z): wind drift, lane convergence, eddies, tide push, whirlpool, lee shelter. out = [vx, vz]; returns the lee amount 0..1 */
    function flow(x, z, t, out) {
      const w = env.wind(), st = env.storm(), cw = Math.cos(w), sw = Math.sin(w), s0 = .2 + .9 * st; let vx = cw * s0, vz = sw * s0;
      const L = laneW(x, z), conv = -(.07 + .12 * st) * Math.sin(L.q); vx += -sw * conv; vz += cw * conv;
      const ea = .3 * (1 + st), e = 3, n0 = n3(x / 55 + t / 420 + 3, z / 55 - t / 360, 1.7), nx = n3(x / 55 + t / 420 + 3 + .1, z / 55 - t / 360, 1.7), nz = n3(x / 55 + t / 420 + 3, z / 55 - t / 360 + .1, 1.7);
      vx += (nz - n0) * 10 * ea; vz += -(nx - n0) * 10 * ea;
      let lee = 0;
      if (env.islands()) {
        lee = env.shadow(x, z); const g = env.ground(x, z);
        if (g > -9) { const gx = (env.ground(x + 2, z) - env.ground(x - 2, z)) / 4, gz = (env.ground(x, z + 2) - env.ground(x, z - 2)) / 4, gl = Math.hypot(gx, gz) || 1, dT = (env.tide(t + 2) - env.tide(t - 2)) / 4, k = 22 * dT * sm(9, 1, -g + 0); vx += gx / gl * k; vz += gz / gl * k; }
        const sp = 1 - .6 * lee; vx *= sp; vz *= sp;
      }
      const V = env.vort(); if (V) { const rx = x - V.x, rz = z - V.z, r = Math.hypot(rx, rz) || 1, f = V.k * Math.exp(-Math.pow((r - V.R * .8) / (V.R * .9), 2)); vx += (-rz / r * 1.6 - rx / r * .5) * f; vz += (rx / r * 1.6 - rz / r * .5) * f; }
      out[0] = vx; out[1] = vz; return lee;
    }

    /* ------------------------------------------------------------ spawning by rules ------------------------------------------------------------ */
    const ABBR = { plank: 'PL', log: 'LG', cork: 'CK', gfloat: 'GF', bottle: 'BT', crate: 'CR', barrel: 'BR', pulley: 'PU', hinge: 'HN', kelp: 'KP', shell: 'SH', rope: 'RP', pebble: 'PB', net: 'NT' };
    let nextN = 0;
    function mk(kind, R, extra) {
      const n = nextN++, id = ABBR[kind] + '-' + ((hash(n, W.seed) * 1048576 | 0).toString(16)), K = KIND[kind];
      const it = Object.assign({ n, id, kind, raw: rawFor(n * 3 + W.seed * 977), org: hash(n, 77) < .6 ? 0 : 1 + (hash(n, 78) * 3 | 0), state: 0, x: 0, z: 0, yaw: R() * TAU, vx: 0, vz: 0, pitch: 0, roll: 0, y: 0, bury: 0, raft: null, lx: 0, ly: 0, lz: 0, lyaw: 0, fixed: false, beach: false, spin: R(), sxl: 1, szl: 1, lodj: hash(n, 40), age: R() }, extra || {});
      it.alt = hash(n, 55); return it;
    }
    function seaPos(R, near) {
      for (let k = 0; k < 40; k++) {
        const r = near ? -30 * Math.log(1 - R() * .96) : -95 * Math.log(1 - R() * .96), a = R() * TAU, x = Math.cos(a) * Math.min(r, SEA_R), z = Math.sin(a) * Math.min(r, SEA_R);
        const dep = env.tide(0) - env.ground(x, z); if (dep < 1.4) continue;
        const L = laneW(x, z), lee = env.islands() ? env.shadow(x, z) : 0, p = .12 + .88 * L.w + .35 * lee; if (R() < p) return [x, z];
      }
      return [0, 0];
    }
    function pickKind(R) { let tot = 0; for (const K of KINDS) tot += K.sea ? K.w : 0; let r = R() * tot; for (const K of KINDS) { if (!K.sea) continue; r -= K.w; if (r <= 0) return K.id; } return 'plank'; }
    function spawnRaft(R, first) {
      const np = 4 + (R() * 3 | 0), pos = first ? [7, 9] : seaPos(R, false), yaw = first ? .5 : env.wind() + (R() - .5) * 1.4, raft = { x: pos[0], z: pos[1], yaw, vx: 0, vz: 0, om: 0, L: 2.2, Wd: 0, members: [], state: 0, hh: 0, pitch: 0, roll: 0, stamp: -1, n: W.rafts.length };
      raft.Wd = np * .21; const mem = [];
      for (let i = 0; i < np; i++) { const it = mk('plank', R, { raft, lx: (R() - .5) * .3, lz: (i - (np - 1) / 2) * .22, ly: 0, lyaw: (R() - .5) * .1 }); if (first && i === 1) { it.id = 'plank-pale-01'; it.pinV = 4; } else it.pinV = i % 4; mem.push(it); }
      for (const sx of [-.7, .7]) mem.push(mk('rope', R, { raft, lx: sx, lz: 0, ly: 0, lyaw: 0, pinV: 2, szl: raft.Wd + .1 }));
      if (first || R() < .45) mem.push(mk('crate', R, { raft, lx: (R() - .5) * .5, lz: (R() - .5) * .25, ly: .37, lyaw: (R() - .5) * .8, pinV: first ? 1 : (R() < .5 ? 0 : 4) }));
      if (R() < .5) mem.push(mk('hinge', R, { raft, lx: (R() - .5) * 1.4, lz: (R() - .5) * .3, ly: .045, lyaw: R() * TAU, pinV: R() * 3 | 0 }));
      if (R() < .4) mem.push(mk('cork', R, { raft, lx: 1.2, lz: (R() - .5) * .5, ly: .07, lyaw: R() * 6, pinV: 1 }));
      raft.members = mem; for (const m of mem) m.pinned = true; W.rafts.push(raft); return mem;
    }
    function spawnSea(budget, R) {
      const out = []; let first = true;
      while (out.length < budget) {
        const r = R();
        if (r < .13 && budget - out.length >= 7) { for (const m of spawnRaft(R, first)) out.push(m); first = false; continue; }
        if (first && out.length === 0 && budget >= 9) { first = false; for (const m of spawnRaft(R, true)) out.push(m); continue; }
        const kind = pickKind(R), near = R() < .38, pos = seaPos(R, near);
        let cl = 1, style = 0;
        if (kind === 'kelp') cl = 3 + (R() * 4 | 0); else if (kind === 'cork') { cl = R() < .5 ? 1 : 4 + (R() * 5 | 0); style = 1; } else if (kind === 'plank') cl = R() < .4 ? 2 + (R() * 3 | 0) : 1; else if (kind === 'bottle') cl = R() < .3 ? 2 + (R() * 2 | 0) : 1; else if (kind === 'log') cl = R() < .2 ? 2 : 1;
        const hd = R() * TAU, w = env.wind(), line = style ? w + Math.PI / 2 : hd;
        for (let i = 0; i < cl && out.length < budget; i++) {
          const k = (i - (cl - 1) / 2), sp = style ? 1.6 : (kind === 'kelp' ? 2.5 : 3.5), it = mk(kind, R, { x: pos[0] + Math.cos(line) * k * sp + (R() - .5) * sp, z: pos[1] + Math.sin(line) * k * sp + (R() - .5) * sp });
          it.yaw = style ? w + (R() - .5) * .8 : (cl > 1 ? hd + (R() - .5) * (kind === 'plank' ? .9 : 2.5) : R() * TAU); out.push(it);
        }
      }
      return out;
    }
    /* beach clusters on the tide band */
    function grad(x, z) { return [(env.ground(x + 1.5, z) - env.ground(x - 1.5, z)) / 3, (env.ground(x, z + 1.5) - env.ground(x, z - 1.5)) / 3]; }
    function findBand(R, near) {
      for (let k = 0; k < 160; k++) {
        const I = env.isl[R() * env.isl.length | 0], x = near ? 30 + (R() - .5) * 60 : I.cx + (R() - .5) * 190, z = near ? 30 + (R() - .5) * 60 : I.cz + (R() - .5) * 190, h = env.ground(x, z);
        if (h > .12 && h < 1.5) { const g = grad(x, z), gl = Math.hypot(g[0], g[1]); if (gl > .02 && gl < .8) return { x, z, g, gl, h }; }
      }
      return null;
    }
    const BEACH_STYLES = [
      [['log', 1.2], ['plank', 3], ['rope', .8], ['crate', .5], ['hinge', .5], ['kelp', 2], ['shell', 2], ['pebble', 2], ['net', .3]],
      [['shell', 6], ['pebble', 6], ['kelp', 2], ['bottle', .8], ['gfloat', .3], ['pulley', .2], ['cork', .6]],
      [['kelp', 6], ['cork', 2], ['net', .5], ['log', 1], ['shell', 2], ['plank', 1], ['bottle', .5], ['gfloat', .3]],
      [['crate', 1], ['barrel', 1], ['pulley', .8], ['hinge', .8], ['rope', 1], ['plank', 2], ['pebble', 2], ['kelp', 1]]];
    function spawnBeach(budget, R) {
      const out = []; if (!env.islands() || !env.isl.length) return out; let ci = 0, guard = 0;
      while (out.length < budget && guard++ < 80) {
        const c = findBand(R, ci < 4 || R() < .3); if (!c) break; ci++;
        const st = BEACH_STYLES[R() * BEACH_STYLES.length | 0], gx = c.g[0] / c.gl, gz = c.g[1] / c.gl, tx = -gz, tz = gx, size = 9 + (R() * 12 | 0), yawL = Math.atan2(tz, tx), len = 3 + R() * 7;
        for (let i = 0; i < size && out.length < budget; i++) {
          let tot = 0; for (const e of st) tot += e[1]; let r = R() * tot, kind = 'pebble'; for (const e of st) { r -= e[1]; if (r <= 0) { kind = e[0]; break; } }
          const small = kind === 'shell' || kind === 'pebble', t = (R() - .5) * 2 * len * (small ? 1.2 : 1), s = (R() - .5) * 2 * (small ? 2.4 : 1.1) + .2;
          const x = c.x + tx * t + gx * s, z = c.z + tz * t + gz * s, h = env.ground(x, z); if (h < .08 || h > 2.2) { i--; if (R() < .5) continue; else continue; }
          const gg = grad(x, z), it = mk(kind, R, { x, z, state: 1, beach: true, bury: small ? .1 + R() * .3 : R() * (kind === 'crate' || kind === 'barrel' ? .3 : .45) });
          it.ul = small ? 1.9 : 1; it.yaw = yawL + (R() < .2 ? R() * Math.PI : (R() - .5) * (small ? 6 : .9)); it.g = gg;
          const cy = Math.cos(it.yaw), sy = Math.sin(it.yaw); it.pitch = Math.atan(gg[0] * cy + gg[1] * sy); it.roll = Math.atan(-gg[0] * sy + gg[1] * cy); it.gh = h;
          it.fixed = h > .9 || it.bury > .28 || kind === 'pebble' || kind === 'shell' || kind === 'pulley' || kind === 'hinge'; out.push(it);
        }
      }
      return out;
    }
    function regen() {
      nextN = 0; W.items = []; W.rafts = []; const R = rng(W.seed * 1013 + 5), n = W.count, hasI = env.islands() && env.isl.length, nb = hasI ? Math.round(n * .36) : 0;
      const sea = spawnSea(n - nb, R), beach = spawnBeach(nb, R); W.items = sea.concat(beach);
      const caps = {}; for (const K of KINDS) caps[K.id] = 0; for (const it of W.items) caps[it.kind]++; for (const k in caps) caps[k] = Math.max(caps[k], 1);
      if (set) set.dispose(); set = new S.InstSet(kit, o.mats, o.scene, caps); W.set = set; W.settle(env.time ? env.time() : 0, 90);
    }

    /* ------------------------------------------------------------ the run-in and the step ------------------------------------------------------------ */
    const fv = [0, 0], fa = [0, 0], fb = [0, 0];
    function respawn(it, R) { /* upwind of the region, in a lane */
      const w = env.wind(), c = (hash(it.n + Math.floor(tNow), 91) - .5) * 520, a = -SEA_R * .98; it.x = Math.cos(w) * a - Math.sin(w) * c; it.z = Math.sin(w) * a + Math.cos(w) * c; it.state = 0; it.fixed = false;
      const L = laneW(it.x, it.z); if (hash(it.n + Math.floor(tNow), 92) > .15 + .85 * L.w) { it.x += -Math.sin(w) * (LANE * .5); it.z += Math.cos(w) * (LANE * .5); }
    }
    function stepItem(it, dt, t) {
      const K = KIND[it.kind], sc = W.sizeK * (it.dsx || 1), draft = Math.max(.03, K.h * sc * K.float * .7);
      if (it.state === 1) {   /* aground: wait for a tide high enough to float it */
        if (!it.fixed && K.float > 0) { const dep = env.tide(t) - env.ground(it.x, it.z); if (dep > draft * 1.7 + .08 && hash(it.n, Math.floor(t / 30)) < .4) { it.state = 0; it.beach = false; } }
        return;
      }
      const lee = flow(it.x, it.z, t, fv), g = env.ground(it.x, it.z), dep = env.tide(t) - g;
      if (dep < draft + .02) { it.state = 1; it.vx = it.vz = 0; it.fixed = hash(it.n, 3) < .35; const gg = grad(it.x, it.z), cy = Math.cos(it.yaw), sy = Math.sin(it.yaw); it.g = gg; it.gh = g; return; }
      const f = clamp((dep - draft) / 1.2, 0, 1), k = (K.float > .7 ? 1.15 : .85 + .3 * hash(it.n, 6)) * (.2 + .8 * f);   /* light things go with the wind, heavy ones lag; the shallows slow everything */
      const ax = (fv[0] * k - it.vx) * Math.min(1, dt * .8), az = (fv[1] * k - it.vz) * Math.min(1, dt * .8); it.vx += ax; it.vz += az; it.x += it.vx * dt; it.z += it.vz * dt;
      const w = env.wind(), tgt = w + (it.alt - .5) * 2.6 + (K.len ? Math.PI * .5 * (hash(it.n, 8) < .5 ? 1 : 0) : 0), dy = Math.atan2(Math.sin(tgt - it.yaw), Math.cos(tgt - it.yaw));
      it.yaw += (dy * .05 * (1 - lee) + .06 * Math.sin(t * .09 + it.alt * 40)) * dt;
      if (it.x * it.x + it.z * it.z > SEA_R * SEA_R * 1.15) respawn(it, null);
    }
    function stepRaft(r, dt, t) {
      const K = KIND.plank, cy = Math.cos(r.yaw), sy = Math.sin(r.yaw), g = env.ground(r.x, r.z), dep = env.tide(t) - g;
      if (r.state === 1) { if (dep > .5 && hash(r.n, Math.floor(t / 40)) < .35) r.state = 0; else return; }
      if (dep < .16) { r.state = 1; r.vx = r.vz = 0; return; }
      const lee = flow(r.x, r.z, t, fv); flow(r.x + cy * r.L / 2, r.z + sy * r.L / 2, t, fa); flow(r.x - cy * r.L / 2, r.z - sy * r.L / 2, t, fb);
      const f = clamp((dep - .1) / 1.2, 0, 1) * (1 - .0), ax = (fv[0] * (.2 + .8 * f) - r.vx) * Math.min(1, dt * .6), az = (fv[1] * (.2 + .8 * f) - r.vz) * Math.min(1, dt * .6); r.vx += ax; r.vz += az; r.x += r.vx * dt; r.z += r.vz * dt;
      const rel = (fa[0] - fb[0]) * -sy + (fa[1] - fb[1]) * cy, w = env.wind(), brd = Math.sin(w + Math.PI / 2 - r.yaw), target = rel / r.L * 2.2 + .035 * brd * (1 + env.storm() * 2);
      r.om += (target - r.om) * Math.min(1, dt * .5); r.yaw += r.om * dt;
      if (r.x * r.x + r.z * r.z > SEA_R * SEA_R * 1.15) { const w2 = env.wind(), c = (hash(r.n + Math.floor(tNow), 93) - .5) * 400, a = -SEA_R * .98; r.x = Math.cos(w2) * a - Math.sin(w2) * c; r.z = Math.sin(w2) * a + Math.cos(w2) * c; r.state = 0; }
    }
    W.step = function (dt, t) {
      if (!W.items.length) return; tNow = t; dt = Math.min(dt, .25);
      for (const it of W.items) if (!it.raft) stepItem(it, dt, t); for (const r of W.rafts) stepRaft(r, dt, t);
    };
    W.settle = function (tEnd, dur) { if (!W.items.length) return; for (let t = tEnd - dur; t < tEnd; t += .5) W.step(.5, t); tNow = tEnd; };

    /* ------------------------------------------------------------ drawing ------------------------------------------------------------ */
    const sig = new Set(); let visSig = 0, visTot = 0;
    function quatOf(q, yaw, pitch, roll) { e1.set(roll, -yaw, pitch, 'YZX'); return q.setFromEuler(e1); }
    function heave(x, z, yaw, d, t, far, out) {
      const c = Math.cos(yaw), s = Math.sin(yaw), hc = env.seaH(x, z, t); out[0] = hc; if (far) { out[1] = 0; out[2] = 0; return; }
      const hf = env.seaH(x + c * d, z + s * d, t), hs = env.seaH(x - s * d, z + c * d, t); out[1] = Math.atan((hf - hc) / d); out[2] = Math.atan((hs - hc) / d);
    }
    const hv = [0, 0, 0], hr = [0, 0, 0], st = { drawn: 0, calls: 0, tris: 0, vis: 0, repetition: 0, tot: 0, float: 0, aground: 0, beach: 0, rafts: 0 };
    const LOD_D = [30, 90, 260];
    W.render = function (t, cam) {
      if (!set) return st; set.begin(); W.frameNo++; const fn = W.frameNo;
      cam.updateMatrixWorld(); pm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); frustum.setFromProjectionMatrix(pm); const cp = cam.position, V = W.V, storm = env.storm(), sc = W.sizeK, wv = 1.5 + 3 * storm;
      sig.clear(); let nvis = 0, dup = 0, nf = 0, na = 0, nb = 0;
      for (const it of W.items) {
        const K = KIND[it.kind], r = it.raft;
        derive(it.kind, it.raw, V, dd, it.org); it.dsx = dd.sx;
        const ul = it.ul || 1, sx = sc * ul * dd.sx * (it.sxl || 1), sy = sc * ul * dd.sy, sz = sc * ul * dd.sz, variant = r ? (it.kind === 'rope' ? 2 : (V > .001 ? Math.min(it.pinV | 0, K.nV - 1) : 0)) : dd.variant;
        const rad = kit.get(it.kind, variant, 0).rad * Math.max(sx, sy, sz); let yaw, pitch, roll, y;
        if (r) {   /* a member of a rope-bound raft: the raft has one pose, queried once */
          if (r.stamp !== fn) {
            r.stamp = fn; sph.set(v3.set(r.x, 0, r.z), 2.6 + wv); r.on = frustum.intersectsSphere(sph);
            if (r.on) { heave(r.x, r.z, r.yaw, r.L * .5, t, Math.hypot(r.x - cp.x, r.z - cp.z) > 150, hr); r.hh = hr[0]; r.pitch = hr[1]; r.roll = hr[2]; if (r.state === 1) { r.roll *= .3; r.pitch *= .3; const g = env.ground(r.x, r.z) + .05; if (g > r.hh) r.hh = g; } }
          }
          if (!r.on) continue;
          quatOf(qr, r.yaw, r.pitch + .02 * Math.sin(t * 1.3 + r.n), r.roll); v3.set(it.lx, it.ly, it.lz).applyQuaternion(qr);
          e1.set(0, -it.lyaw, 0, 'YZX'); q2.setFromEuler(e1); q1.copy(qr).multiply(q2); p1.set(r.x + v3.x, r.hh + v3.y - .01, r.z + v3.z);
          if (it.kind === 'rope') s1.set(sc, sc, it.szl); else s1.set(sx, sy, sz);
        } else if (it.state === 1) {   /* aground or on the beach */
          sph.set(v3.set(it.x, env.ground(it.x, it.z), it.z), rad + .4); if (!frustum.intersectsSphere(sph)) continue;
          const gh = sph.center.y, gg = it.beach ? it.g : grad(it.x, it.z), cy = Math.cos(it.yaw), sy2 = Math.sin(it.yaw);
          pitch = Math.atan(gg[0] * cy + gg[1] * sy2); roll = Math.atan(-gg[0] * sy2 + gg[1] * cy); y = gh + K.h * sy * (.5 - (it.beach ? it.bury : .1));
          if (K.float > 0 && !it.beach) { const hh = env.seaH(it.x, it.z, t); y = Math.max(y, hh - K.h * sy * (K.float - .5)); }
          quatOf(q1, it.yaw, pitch, roll); p1.set(it.x, y, it.z); s1.set(sx, sy, sz); it._wet = clamp((env.tide(t) + .3 - gh) / .8, 0, 1) * .85 + .05;
        } else {   /* floating single item */
          sph.set(v3.set(it.x, 0, it.z), rad + 1.2 + wv); if (!frustum.intersectsSphere(sph)) continue;
          const dist = Math.hypot(it.x - cp.x, it.z - cp.z), d = clamp(K.rad * sx * .25, .25, 1.4); heave(it.x, it.z, it.yaw, d, t, dist > 140, hv);
          const ph = dd.ph * 6.28, vv = V > .001 ? 1 : 0, bp = .035 * (1 + 2 * storm) * Math.sin(t * (1.3 + .6 * it.raw.tilt2 * vv) + ph), br = .05 * (1 + 2 * storm) * Math.sin(t * (.9 + .5 * it.raw.tilt * vv) + ph * 1.7);
          pitch = hv[1] + bp + dd.rtilt * .12 * (K.len ? .3 : 1); roll = hv[2] + br + dd.rtilt2 * .25 * (it.kind === 'barrel' || it.kind === 'log' ? 2 : (it.kind === 'kelp' ? .3 : .6));
          if (it.kind === 'barrel' || it.kind === 'log') roll += (it.spin - .5) * 3 * V;
          y = hv[0] - K.h * sy * (K.float - .5) + (it.kind === 'kelp' ? .02 : 0); quatOf(q1, it.yaw, pitch, roll); p1.set(it.x, y, it.z); s1.set(sx, sy * (it.kind === 'kelp' ? .6 : 1), sz);
        }
        const dist = p1.distanceTo(cp), lodk = W.lodK * (1 + (it.lodj - .5) * .3); let lod = 0; if (dist > LOD_D[0] * lodk) lod = 1; if (dist > LOD_D[1] * lodk) lod = 2; if (dist > LOD_D[2] * lodk * (K.rad < .3 ? .55 : 1)) continue;
        m1.compose(p1, q1, s1);
        set.add(it.kind, variant, lod, m1.elements, dd.wear, r ? .6 : it.state === 1 ? (it._wet === undefined ? .3 : it._wet) : .75, dd.gp, dd.tr, dd.tg, dd.tb); nvis++;
        const key = it.kind + variant + '|' + Math.round(Math.log(dd.sx) / .1) + '|' + Math.round(((it.yaw % TAU) + TAU) % TAU / .26) + '|' + Math.round(dd.tr * 8) + Math.round(dd.tb * 8) + '|' + Math.round(dd.wear * 4);
        if (sig.has(key)) dup++; else sig.add(key);
        if (it.state === 1) { if (it.beach) nb++; else na++; } else nf++;
      }
      const e = set.end(); st.drawn = nvis; st.calls = e.calls; st.tris = e.tris; st.repetition = nvis ? dup / nvis : 0; st.tot = W.items.length; st.float = nf; st.aground = na; st.beach = nb; st.rafts = W.rafts.length; return st;
    };
    W.updateLights = function (P, sunDir) {
      const h = P.hor, z = P.zen; lights.hemi.color.setRGB((h[0] + z[0]) * .5 + .25, (h[1] + z[1]) * .5 + .25, (h[2] + z[2]) * .5 + .25); lights.hemi.groundColor.setRGB(.2, .24, .24);
      lights.hemi.intensity = .5 + .25 * clamp(P.sunI, 0, 1.5); lights.sun.intensity = clamp(.25 + .75 * P.sunI, .15, 1.6); lights.sun.position.copy(sunDir).multiplyScalar(60); lights.sun.color.setRGB(1, .93 - .1 * (1 - clamp(P.sunEl / 40, 0, 1)), .82 - .25 * (1 - clamp(P.sunEl / 40, 0, 1)));
      if (!o.scene.fog) o.scene.fog = new T.FogExp2(0xaabbcc, .001); o.scene.fog.color.setRGB(P.fogC[0], P.fogC[1], P.fogC[2]); o.scene.fog.density = P.fog;
    };
    W.setCount = function (n) { n = clamp(Math.round(n), 0, 2000); if (n === W.count && set) return; W.count = n; regen(); };
    W.regen = regen;
    W.setVariation = function (v) { W.V = clamp(v, 0, 1); };
    W.setSize = function (k) { W.sizeK = clamp(k, .5, 3); };
    W.setVisible = function (v) { if (set) set.group.visible = v; lights.hemi.visible = lights.sun.visible = v; };
    W.stats = () => st; W.dispose = function () { if (set) set.dispose(); o.scene.remove(lights.hemi, lights.sun); };
    W.lights = lights;
    return W;
  }
  S.makeWorld = makeWorld;
}(typeof window !== 'undefined' ? window : globalThis));
