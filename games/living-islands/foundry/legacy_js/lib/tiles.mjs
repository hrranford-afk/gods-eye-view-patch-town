/* foundry/lib/tiles.mjs -- the tile split for large maps.
   A world of S metres is cut into tiles of T metres (default 1024 -> 8 x 8 of 128 m) with an overlap of O metres each side (default 8).
   The terrain is a pure function of world position (the game's baseH), and every LOD grid is world-aligned (sample i of a grid with cell c sits at
   x = -S/2 + (i+.5)c), so a tile never needs its neighbours: bake any tile alone, in any order, on any machine, and the edges match to the bit.
   LOD tiers: cell c, 2c, 4c, 8c (default 1, 2, 4, 8 m). A coarse sample is the true height at its own position (a decimation, not a blur).
   Cost per tile is flat: it only depends on tile size and LOD, never on the world size. Heights are quantised to int16 centimetres (the same unit as approaches/island.json). */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { layout, terrain, field, sha } from './world.mjs';

const FAR = { x: 1e9, z: 1e9, rx: 1, rz: 1, peak: 0, sb: .1, bw: 1, Rin: 1, under: .3, rough: 0, lump: 0, surf: 0, warp: 0, rot: 0 };
/* a per-tile spec keeps the FULL island index list (a game island's noise seed depends on its index) but swaps unreached islands for far-away dummies */
export function tileSpec(spec, T, bbox) {
  const [x0, z0, x1, z1] = bbox, near = (x, z) => { const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1); return Math.hypot(dx, dz); };
  const reach = [];
  spec.isl.forEach((I, i) => { if (near(I.x, I.z) <= T.isl[i].br + (I.cres ? 20 : 0) + 1) reach.push(i); });
  const isl = spec.isl.map((I, i) => reach.includes(i) ? I : { ...FAR, id: 'far' });
  const bars = (spec.bars || []).filter((B) => { /* distance from bbox centre-ish: use segment-to-box test by sampling */
    let m = 1e9; for (let t = 0; t <= 1; t += .05) m = Math.min(m, near(B.ax + (B.bx - B.ax) * t, B.az + (B.bz - B.az) * t)); return m <= B.w * 2.4 + 1; });
  return { spec: { ...spec, isl, bars }, reach };
}
const q16 = (f) => { const o = new Int16Array(f.length); for (let i = 0; i < f.length; i++) o[i] = Math.max(-32768, Math.min(32767, Math.round(f[i] * 100))); return o; };
const hashI16 = (a) => sha(Buffer.from(a.buffer, a.byteOffset, a.byteLength), 16);

export function bakeTile(spec, Tfull, o, tx, tz, lod) {
  const S = spec.size, c = o.cell * 2 ** lod, pad = o.overlap, side = (o.tile + 2 * pad) / c;
  if (!Number.isInteger(side)) throw new Error(`tile+2*overlap (${o.tile + 2 * pad}) must be a multiple of the LOD cell ${c}`);
  const bbox = [-S / 2 + tx * o.tile - pad, -S / 2 + tz * o.tile - pad, -S / 2 + (tx + 1) * o.tile + pad, -S / 2 + (tz + 1) * o.tile + pad];
  const { spec: ts, reach } = tileSpec(spec, Tfull, bbox), T = terrain(ts);
  const i0 = Math.round((tx * o.tile - pad) / c), j0 = Math.round((tz * o.tile - pad) / c);
  const F = field(ts, i0, j0, side, side, c, T), h16 = q16(F.h);
  let mn = 1e9, mx = -1e9; for (const v of h16) { if (v < mn) mn = v; if (v > mx) mx = v; }
  return { h16, side, cell: c, i0, j0, bbox, reach, min_cm: mn, max_cm: mx, hash: hashI16(h16) };
}

export function tileWorld({ seed, size = 1024, tile = 128, overlap = 8, cell = 1, lods = 4, spec = null, out = null, write = false, only = null }) {
  if (size % tile) throw new Error('size must be a multiple of tile');
  const sp = spec || layout(seed, size), T = terrain(sp), nT = size / tile, o = { tile, overlap, cell }, t0 = performance.now();
  const tiles = [], ms = [];
  for (let tz = 0; tz < nT; tz++) for (let tx = 0; tx < nT; tx++) {
    if (only && !only.some((p) => p[0] === tx && p[1] === tz)) continue;
    const ta = performance.now(), lodsOut = [];
    for (let L = 0; L < lods; L++) { const b = bakeTile(sp, T, o, tx, tz, L); lodsOut.push({ lod: L, cell_m: b.cell, samples: `${b.side}x${b.side}`, hash: b.hash, min_m: b.min_cm / 100, max_m: b.max_cm / 100, _b: b }); }
    ms.push(performance.now() - ta);
    const b0 = lodsOut[0]._b, man = { tile: [tx, tz], core_m: [-size / 2 + tx * tile, -size / 2 + tz * tile, -size / 2 + (tx + 1) * tile, -size / 2 + (tz + 1) * tile], padded_m: b0.bbox, overlap_m: overlap,
      islands_in_reach: b0.reach, lods: lodsOut.map(({ _b, ...r }) => r) };
    man.hash = sha(JSON.stringify(man), 16);
    tiles.push({ man, lods: lodsOut.map((l) => l._b) });
  }
  const world = { schema: 'foundry_tiles', version: 1, world_seed: sp.seed, size_m: size, tile_m: tile, overlap_m: overlap, grid: [nT, nT], lod_cells_m: Array.from({ length: lods }, (_, i) => cell * 2 ** i), height_unit: 'int16 centimetres', spec_hash: sha(JSON.stringify(sp)),
    tiles: tiles.map((t) => ({ tile: t.man.tile, hash: t.man.hash })) };
  world.world_hash = sha(JSON.stringify(world), 16);
  if (write && out) {
    fs.mkdirSync(out, { recursive: true });
    for (const t of tiles) { const id = `t_${t.man.tile[0]}_${t.man.tile[1]}`; fs.writeFileSync(path.join(out, id + '.json'), JSON.stringify(t.man, null, 1));
      t.lods.forEach((b, L) => fs.writeFileSync(path.join(out, `${id}.lod${L}.h16z`), zlib.deflateSync(Buffer.from(b.h16.buffer, b.h16.byteOffset, b.h16.byteLength), { level: 6 }))); }
    fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(world, null, 1));
  }
  const nonEmpty = ms.length;
  return { world, tiles, spec: sp, summary: { world_hash: world.world_hash, tiles: nonEmpty, size_m: size, tile_m: tile, overlap_m: overlap, lods, islands: sp.isl.length,
    total_s: +((performance.now() - t0) / 1000).toFixed(2), ms_per_tile_mean: +(ms.reduce((a, b) => a + b, 0) / nonEmpty).toFixed(1), ms_per_tile_max: +Math.max(...ms).toFixed(1), out: write ? out : null } };
}

/* reassemble LOD0 (or any lod) from tile cores into one world grid of int16 cm */
export function assemble(res, lod = 0) {
  const { world, tiles } = res, S = world.size_m, c = world.lod_cells_m[lod], n = Math.round(S / c), out = new Int16Array(n * n), T = world.tile_m, pad = world.overlap_m, core = T / c, po = pad / c;
  for (const t of tiles) { const b = t.lods[lod], [tx, tz] = t.man.tile;
    for (let j = 0; j < core; j++) for (let i = 0; i < core; i++) out[(tz * core + j) * n + tx * core + i] = b.h16[(j + po) * b.side + i + po]; }
  return { h16: out, n, cell: c };
}
