/* City Lab: the shape of a recipe, without colour. Pure JS, no THREE.
   shape(recipe) samples every part's solid (a slope as a slab, a gable as a triangle, a hip roof as its hull, a cone and a round tower as round things)
   and projects it on a coarse grid seen from the front, the side and above. Used by tests/contact-test.js to prove that two cottages differ in
   SILHOUETTE and not only in colour. Materials never enter the result. */
'use strict';
const crypto = require('crypto');
const SUP = require('../supports.js');
const GX = 60, GY = 34, CELL = 0.1;   /* 6.0 wide, 3.4 high, cells of 0.1 table units */
function sampleLocal(p, size, emit) {
  const [w, h, d] = size, k = p.kind, v = p.variant || 0, st = 0.05;
  const box = () => { for (let x = -w / 2; x <= w / 2 + 1e-9; x += st) for (let y = 0; y <= h + 1e-9; y += st) for (let z = -d / 2; z <= d / 2 + 1e-9; z += st) emit(x, y, z); };
  if (k === 'roof_tile' || k === 'rafter' || k === 'awning') {
    for (let x = -w / 2; x <= w / 2 + 1e-9; x += st) for (let z = -d / 2; z <= d / 2 + 1e-9; z += 0.025) { const y = h * (0.5 - z / d); emit(x, y, z); emit(x, Math.max(0, y - 0.04), z); }
  } else if (k === 'gable') {
    for (let x = -w / 2; x <= w / 2 + 1e-9; x += Math.max(st, w / 2)) for (let z = -d / 2; z <= d / 2 + 1e-9; z += 0.025) {
      const top = v === 1 ? h * (0.5 - z / d) : h * (1 - Math.abs(z) / (d / 2)); for (let y = 0; y <= top + 1e-9; y += st) emit(x, y, z);
    }
  } else if (k === 'roof_hip') {
    const pyr = v === 1, hx = w / 2, hz = d / 2; let rx, rz;
    if (pyr) { rx = 0; rz = 0; } else if (w >= d) { rx = (w - d) / 2; rz = 0; } else { rx = 0; rz = (d - w) / 2; }
    for (let x = -hx; x <= hx + 1e-9; x += st) for (let z = -hz; z <= hz + 1e-9; z += st) {
      const tx = Math.max(0, Math.abs(x) - rx) / (hx - rx || 1e-9), tz = Math.max(0, Math.abs(z) - rz) / (hz - rz || 1e-9);
      const top = h * (1 - Math.max(pyr ? Math.max(Math.abs(x) / hx, Math.abs(z) / hz) : Math.max(tx, tz), 0));
      for (let y = 0; y <= top + 1e-9; y += st) emit(x, y, z);
    }
  } else if (k === 'roof_cone') {
    for (let x = -w / 2; x <= w / 2 + 1e-9; x += st) for (let z = -d / 2; z <= d / 2 + 1e-9; z += st) {
      const r = Math.sqrt((x / (w / 2)) ** 2 + (z / (d / 2)) ** 2); if (r > 1) continue; for (let y = 0; y <= h * (1 - r) + 1e-9; y += st) emit(x, y, z);
    }
  } else if (k === 'tower') {
    for (let x = -w / 2; x <= w / 2 + 1e-9; x += st) for (let z = -d / 2; z <= d / 2 + 1e-9; z += st) if ((x / (w / 2)) ** 2 + (z / (d / 2)) ** 2 <= 1) for (let y = 0; y <= h + 1e-9; y += st) emit(x, y, z);
  } else box();
}
function cells(recipe) {
  const F = new Uint8Array(GX * GY), Sd = new Uint8Array(GX * GY), T = new Uint8Array(GX * GY);
  const mark = (arr, u, v) => { const i = Math.floor(u / CELL + GX / 2), j = Math.floor(v / CELL); if (i >= 0 && i < GX && j >= 0 && j < GY) arr[j * GX + i] = 1; };
  recipe.parts.forEach((p) => {
    if (p.kind === 'floor' && (p.pos[1] > 0.03)) { /* upper slabs count like any box */ }
    const size = SUP.effSize(p), r = p.rotY || 0, c = Math.cos(r), s = Math.sin(r);
    sampleLocal(p, size, (x, y, z) => {
      const wx = p.pos[0] + x * c + z * s, wz = p.pos[2] - x * s + z * c, wy = p.pos[1] + y;
      mark(F, wx, wy); mark(Sd, wz, wy); mark(T, wx, wz + 1.7);   /* the top view is drawn on a grid whose rows run over z (shifted so they stay positive) */
    });
  });
  return { front: F, side: Sd, top: T };
}
function hashOf(c) { const h = crypto.createHash('sha1'); h.update(Buffer.from(c.front)); h.update(Buffer.from(c.side)); h.update(Buffer.from(c.top)); return h.digest('hex').slice(0, 12); }
/* the fraction of cells (front, side and top views) in which two shapes differ, out of the cells either one fills */
function distance(a, b) {
  let diff = 0, uni = 0;
  ['front', 'side', 'top'].forEach((k) => { for (let i = 0; i < a[k].length; i++) { if (a[k][i] || b[k][i]) { uni++; if (a[k][i] !== b[k][i]) diff++; } } });
  return uni ? diff / uni : 0;
}
/* a hash of the recipe's geometry alone: kinds, sizes, positions, turns and looks, to 0.05, in sorted order. Materials, labels and ids are left out. */
function geoHash(recipe) {
  const q = (x) => Math.round(x / 0.05);
  const rows = recipe.parts.map((p) => { const s = SUP.effSize(p); return [p.kind, p.variant || 0, q(p.pos[0]), q(p.pos[1]), q(p.pos[2]), q(s[0]), q(s[1]), q(s[2]), Math.round((p.rotY || 0) * 20)].join(','); }).sort();
  return crypto.createHash('sha1').update(rows.join(';')).digest('hex').slice(0, 12);
}
module.exports = { cells, hashOf, distance, geoHash, GX, GY, CELL };
