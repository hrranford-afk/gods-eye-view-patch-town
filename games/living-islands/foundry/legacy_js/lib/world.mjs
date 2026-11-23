/* foundry/lib/world.mjs  --  the ONE source of truth for island terrain: the game's own generator.
   The functions islSd / islH / baseH (and the noise they use) are cut out of ../../islands_look.html as TEXT at run time and
   compiled headlessly with new Function. Nothing is copied, so the foundry can never drift from the game.
   The game's island list (ISL) is hand authored; the foundry adds only what the game does not have: a seeded LAYOUT sampler that
   emits ISL-shaped specs (the world is data). Terrain from spec = the game's code, unchanged. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const GAME_HTML = path.resolve(HERE, '../../../islands_look.html');
export const sha = (s, n = 16) => crypto.createHash('sha256').update(s).digest('hex').slice(0, n);

function cut(src, from, to, what) {
  const a = src.indexOf(from); if (a < 0) throw new Error('foundry: cannot find start marker for ' + what + ': ' + from);
  const b = src.indexOf(to, a + from.length); if (b < 0) throw new Error('foundry: cannot find end marker for ' + what + ': ' + to);
  return src.slice(a, b);
}
let _core = null;
/* returns {factory, sourceHash, seabed}; factory(seed, ISL, BARS) -> {baseH, gI()} */
export function gameCore() {
  if (_core) return _core;
  const src = fs.readFileSync(GAME_HTML, 'utf8');
  const util = cut(src, 'function mulberry32', 'function lin(', 'noise utilities');
  const init = cut(src, 'ISL.forEach(', 'const BARS=', 'island init');
  const m = /const SEABED=(-?[\d.]+)/.exec(src); if (!m) throw new Error('foundry: SEABED not found');
  const terr = cut(src, 'function islSd', 'function padDist', 'terrain functions');
  const code = util + '\nconst PADS=[];let gI=-1,gSd=-99,gExpo=0;\n' + init + '\n' + terr + '\nreturn {baseH, gI:()=>gI, gSd:()=>gSd, mulberry32, hash2, fbm, vnoise, sm, clamp};';
  const factory = new Function('SEED', 'ISL', 'BARS', 'SEABED', code);
  _core = { factory, seabed: parseFloat(m[1]), sourceHash: sha(util + init + terr) };
  return _core;
}

/* a world "spec" = { seed, size, isl:[ISL-shaped], bars:[{ax,az,bx,bz,w,peak,s}], home:index }  (pure data, JSON) */
export function terrain(spec) {
  const core = gameCore();
  const isl = JSON.parse(JSON.stringify(spec.isl)), bars = JSON.parse(JSON.stringify(spec.bars || []));
  const t = core.factory(spec.seed >>> 0, isl, bars, core.seabed);
  return { H: t.baseH, owner: t.gI, isl, seabed: core.seabed, core: t };
}

/* heightfield on a world-aligned grid: sample (i,j) sits at x=-S/2+(i+.5)*cell  (cell centres), so any sub-window is a pure
   function of position and tiles reassemble exactly. */
export function field(spec, x0i, z0j, nx, nz, cell, T) {
  T = T || terrain(spec);
  const S = spec.size, out = new Float32Array(nx * nz), own = new Int16Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = -S / 2 + (x0i + i + .5) * cell, z = -S / 2 + (z0j + j + .5) * cell;
    out[j * nx + i] = T.H(x, z); own[j * nx + i] = T.owner();
  }
  return { h: out, own, nx, nz, cell, x0i, z0j };
}

/* ------------------------------------------------------------------ layout sampler (seeded, the foundry's own) */
export function rng32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rr = (R, a, b) => a + (b - a) * R();
const r3 = (v) => Math.round(v * 1000) / 1000;

/* archetypes: parameter ranges taken from the game's six hand-authored islands */
const ARCH = {
  pine:    (R, k) => ({ kind: 'pine', rx: rr(R, 11, 18) * k, rz: rr(R, 9, 14) * k, peak: rr(R, 5.5, 9), sb: .55, bw: 1.4, Rin: rr(R, 8, 12) * k, under: .34, rough: 1.5, crag: 1.3, lump: 1.1, lcell: 4.2, surf: .55, warp: rr(R, 3.6, 5) }),
  grass:   (R, k) => ({ kind: 'grass', rx: rr(R, 12, 18) * k, rz: rr(R, 10, 14) * k, peak: rr(R, 3.4, 5.6), sb: .2, bw: 3, Rin: rr(R, 9, 12) * k, under: .26, rough: .7, lump: .25, surf: .2, warp: rr(R, 2.4, 3.4) }),
  sand:    (R, k) => ({ kind: 'sand', rx: rr(R, 7, 11) * k, rz: rr(R, 5, 8) * k, peak: rr(R, 1.2, 2), sb: .12, bw: 5, Rin: 5, under: .2, rough: .32, lump: 0, surf: .2, warp: rr(R, 1.2, 2) }),
  skerry:  (R, k) => ({ kind: 'skerry', rx: rr(R, 5, 8) * k, rz: rr(R, 4, 6.5) * k, peak: rr(R, 2.6, 4), sb: .8, bw: 1, Rin: 4, under: .5, rough: 1, crag: 1.8, lump: 1.5, lcell: 3.8, surf: 1, warp: rr(R, 1.4, 2.2) }),
  shingle: (R, k) => ({ kind: 'shingle', rx: rr(R, 11, 15) * k, rz: rr(R, 9, 12) * k, peak: rr(R, 3, 4.2), sb: .16, bw: 5, Rin: 7, under: .24, rough: .5, lump: .2, surf: .25, warp: rr(R, 2.4, 3.4) }),
  harbour: (R, k) => ({ kind: 'harbour', cres: 1, Ra: rr(R, 20, 28) * k, Rb: rr(R, 11, 14) * k, peak: rr(R, 7, 9.5), sb: .22, bw: 5, Rin: 11 * k, under: .28, rough: .6, lump: .35, surf: .25, warp: rr(R, 2.2, 3.2) })
};
const footprint = (I) => I.cres ? I.Ra * 1.25 + I.Rb * .4 : Math.max(I.rx, I.rz) * 1.1 + I.warp * 1.2 + 3;
const pick = (R, w) => { let t = 0; for (const k in w) t += w[k]; let u = R() * t; for (const k in w) { u -= w[k]; if (u <= 0) return k; } return Object.keys(w)[0]; };

/* params: size (m), density (islands per 100x100 m), gap (m), mix weights; all derived from the seed unless overridden */
export function layout(seed, size, over = {}) {
  const R = rng32(seed * 2654435761 ^ 0x9e3779b9);
  const P = {
    density: over.density ?? rr(R, .35, .85),
    gap: over.gap ?? rr(R, 10, 34),
    big: over.big ?? rr(R, 0, 1),                 // 0: all small islands, 1: a few large ones
    rocky: over.rocky ?? rr(R, .5, 2.2),           // weight of rocky archetypes
    ragged: over.ragged ?? rr(R, .8, 2.4),         // multiplies coast warp: smooth ovals .. ragged coasts
    cluster: over.cluster ?? rr(R, 0, .8),         // chance an island is placed hard against an existing one (chains, channels, fords)
    aspect: over.aspect ?? rr(R, 0, 1)             // share of islands stretched into long shapes
  };
  const n = Math.max(3, Math.round(P.density * size * size / 1e4 * (size < 250 ? 1.6 : 1)));
  const homeKind = pick(R, { harbour: 1.3, grass: 1, shingle: .6 });
  const isl = [];
  const ks = Math.pow(Math.min(3, Math.max(1, size / 200)), .9);
  const mk = (kind, kscale) => { const hb = kind === 'harbour'; /* the game's crescent bay is hard-wired (offset 14.5 m, one direction): keep it at game scale */
    const I = ARCH[kind](R, hb ? Math.min(kscale, 1.1) : kscale * ks); if (!hb) { I.warp *= Math.sqrt(ks) * P.ragged; if (kind !== 'sand' && R() < P.aspect * .6) { I.rz *= rr(R, .4, .7); I.crag && (I.crag *= 1); } } I.id = kind + '_' + isl.length; I.rot = r3(rr(R, -1.2, 1.2)); return I; };
  const home = mk(homeKind, rr(R, 1.0, 1.4)); if (home.peak < 4.8) home.peak = r3(rr(R, 4.8, 6.2));
  const place = (I) => {
    const rad = footprint(I), near = R() < P.cluster && isl.length > 0 ? isl[Math.floor(R() * isl.length)] : null;
    for (let t = 0; t < 500; t++) {
      const m = rad + 4; let x = rr(R, -size / 2 + m, size / 2 - m), z = rr(R, -size / 2 + m, size / 2 - m);
      if (near) { const a = R() * 6.2832, d = rad + footprint(near) + rr(R, 4, 16); x = near.x + Math.cos(a) * d; z = near.z + Math.sin(a) * d; if (Math.abs(x) > size / 2 - m || Math.abs(z) > size / 2 - m) continue; }
      let ok = true;
      for (const J of isl) { if (Math.hypot(x - J.x, z - J.z) < rad + footprint(J) + (near ? 3 : P.gap * (.5 + R()))) { ok = false; break; } }
      if (ok) { I.x = r3(x); I.z = r3(z); return true; }
    }
    return false;
  };
  home.x = r3(rr(R, -.12, .12) * size); home.z = r3(rr(R, -.12, .12) * size); isl.push(home);
  const kinds = []; for (let i = 0; i < n - 1; i++) {
    kinds.push(pick(R, { pine: P.rocky * .7 * (.4 + P.big), grass: 1 + P.big, sand: 1.1, skerry: P.rocky * .8, shingle: .8, harbour: .25 * (.3 + P.big) }));
  }
  const objs = kinds.map((k) => mk(k, k === 'skerry' || k === 'sand' ? rr(R, .8, 1.25) : rr(R, .7, 1.25 + .7 * P.big)));
  objs.sort((a, b) => footprint(b) - footprint(a));
  for (const I of objs) if (place(I)) isl.push(I);
  isl.forEach((I, i) => { I.i = undefined; delete I.i; for (const k of Object.keys(I)) if (typeof I[k] === 'number') I[k] = r3(I[k]); });
  // sand bars between close neighbours (shallow fords, below sea level like the game's)
  const bars = [];
  for (let a = 0; a < isl.length; a++) for (let b = a + 1; b < isl.length; b++) {
    const A = isl[a], B = isl[b], d = Math.hypot(A.x - B.x, A.z - B.z), gap = d - footprint(A) * .75 - footprint(B) * .75;
    if (gap < 14 && gap > -2 && R() < .5 && bars.length < Math.max(2, n / 3)) {
      const ux = (B.x - A.x) / d, uz = (B.z - A.z) / d, ra = footprint(A) * .7, rb = footprint(B) * .7;
      bars.push({ ax: r3(A.x + ux * ra), az: r3(A.z + uz * ra), bx: r3(B.x - ux * rb), bz: r3(B.z - uz * rb), w: r3(rr(R, 2.4, 3.6)), peak: r3(-rr(R, .45, .7)), s: seed + 501 + bars.length * 16 });
    }
  }
  return { seed: seed >>> 0, size, home: 0, params: Object.fromEntries(Object.entries(P).map(([k, v]) => [k, r3(v)])), isl, bars };
}

/* the game's own island list as a spec (used by tests to prove the extraction reproduces the game) */
export function gameSpec(seed = 1122) {
  const src = fs.readFileSync(GAME_HTML, 'utf8');
  const lit = cut(src, 'const ISL=[', ';\nISL.forEach', 'ISL literal').replace('const ISL=', '');
  const barsLit = cut(src, 'const BARS=[', ';\nconst PADS', 'BARS literal').replace('const BARS=', '');
  const isl = new Function('return ' + lit)();
  const bars = new Function('SEED', 'return ' + barsLit)(seed);
  return { seed, size: 200, home: 4, isl, bars };
}
