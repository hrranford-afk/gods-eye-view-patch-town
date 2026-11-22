#!/usr/bin/env node
/* City Lab: the cottage contact sheet generator. Writes recipes/variants/cottage_01.json .. cottage_24.json (rtk.building v1, data only).
   Run: node tools/gen-cottage-variants.js        (a developer's script, not part of any page; it never touches the other recipes)
   Each cottage is made by small helpers (a walled box, a roof, a door, windows, a chimney, a porch ...). The helpers only emit plain parts.
   Parts that sink into each other (a roof over a post, a chimney through a roof) are tied together with `needs`, which is what the overlap rule allows;
   the pass at the end (tie()) adds those links automatically, always from the later part to the earlier one, so the graph stays free of cycles. */
'use strict';
const fs = require('fs');
const path = require('path');
const V = require('../validate.js');
const SUP = require('../supports.js');
const PI = Math.PI;
const r3 = (x) => Math.round(x * 1000) / 1000;

/* ------------------------------------------------------------------ the toolbox ------------------------------------------------------------------ */
function Cot(id, name) {
  this.id = id; this.name = name; this.parts = []; this.byId = {}; this.n = {}; this.labels = {};
}
Cot.prototype.uid = function (base) { this.n[base] = (this.n[base] || 0) + 1; return this.n[base] === 1 ? base : base + '.' + this.n[base]; };
/* add a part. o: { rotY, variant, rep, id } */
Cot.prototype.add = function (idBase, kind, pos, size, mat, stage, needs, tag, o) {
  o = o || {};
  const p = { id: o.exact ? idBase : this.uid(idBase), kind, pos: pos.map(r3), size: size.map(r3), material: mat, stage, needs: (needs || []).slice(), tag, replaceable: !!o.rep };
  if (o.rotY) p.rotY = r3(o.rotY);
  if (o.variant) p.variant = o.variant;
  this.parts.push(p); this.byId[p.id] = p;
  return p.id;
};

const FL = 0.05, TH = 0.05;

/* a walled box. o: { pre, cx, cz, w, d, y0, H (absolute wall top), wall, frame (material or null), pv (panel look), floor (material or null), floorNeeds, floorMat }
   returns what the roofs and doors need to know */
function walledBox(C, o) {
  const pre = o.pre, cx = o.cx, cz = o.cz, w = o.w, d = o.d, y0 = o.y0 || 0, yb = y0 + FL, H = o.H, fr = o.frame, pv = o.pv || 0;
  const bx = { pre, cx, cz, w, d, yb, H, frame: !!fr, ins: fr ? 0.04 : 0.025, ids: {}, walls: {}, tops: {}, posts: [] };
  const plinth = o.plinth == null ? 0.04 : o.plinth;
  bx.floor = C.add(pre + 'floor', 'floor', [cx, y0, cz], [w + plinth * 2, FL, d + plinth * 2], o.floorMat || 'wood_pale', 'frame', o.floorNeeds || [], 'floor');
  const E = fr ? H + 0.07 : H; bx.E = E;
  const wallH = H - yb;
  if (fr) {
    [['fl', -1, 1], ['fr', 1, 1], ['bl', -1, -1], ['br', 1, -1]].forEach((q) => {
      bx.posts.push(C.add(pre + 'post.' + q[0], 'post', [cx + q[1] * (w / 2 - 0.04), yb, cz + q[2] * (d / 2 - 0.04)], [0.08, E - yb, 0.08], fr, 'frame', [bx.floor], 'post'));
    });
    const P = bx.posts;
    bx.tops.f = C.add(pre + 'beam.f', 'beam', [cx, H, cz + d / 2 - 0.04], [w, 0.07, 0.08], fr, 'frame', [P[0], P[1]], 'beam');
    bx.tops.b = C.add(pre + 'beam.b', 'beam', [cx, H, cz - d / 2 + 0.04], [w, 0.07, 0.08], fr, 'frame', [P[2], P[3]], 'beam');
    bx.tops.l = C.add(pre + 'beam.l', 'beam', [cx - w / 2 + 0.04, H, cz], [0.08, 0.07, d - 0.16], fr, 'frame', [P[0], P[2]], 'beam');
    bx.tops.r = C.add(pre + 'beam.r', 'beam', [cx + w / 2 - 0.04, H, cz], [0.08, 0.07, d - 0.16], fr, 'frame', [P[1], P[3]], 'beam');
  }
  const L = fr ? w - 0.16 : w, D = fr ? d - 0.16 : d - 0.1, i = bx.ins;
  const nd = (s) => (fr ? [bx.tops[s]] : [bx.floor]);
  if (!o.skip || o.skip.indexOf('f') < 0) bx.walls.f = C.add(pre + 'wall.f', 'panel', [cx, yb, cz + d / 2 - i], [L, wallH, TH], o.wall, 'walls', nd('f'), 'wall', { variant: pv });
  if (!o.skip || o.skip.indexOf('b') < 0) bx.walls.b = C.add(pre + 'wall.b', 'panel', [cx, yb, cz - d / 2 + i], [L, wallH, TH], o.wall, 'walls', nd('b'), 'wall', { rotY: PI, variant: pv });
  if (!o.skip || o.skip.indexOf('l') < 0) bx.walls.l = C.add(pre + 'wall.l', 'panel', [cx - w / 2 + i, yb, cz], [D, wallH, TH], o.wall, 'walls', nd('l'), 'wall', { rotY: -PI / 2, variant: pv });
  if (!o.skip || o.skip.indexOf('r') < 0) bx.walls.r = C.add(pre + 'wall.r', 'panel', [cx + w / 2 - i, yb, cz], [D, wallH, TH], o.wall, 'walls', nd('r'), 'wall', { rotY: PI / 2, variant: pv });
  if (!fr) { bx.tops = bx.walls; }
  return bx;
}
/* where a thing on a wall goes: side f b l r, along = world offset along the wall, out = how far in front of the panel */
function onWall(bx, side, along, out) {
  const i = bx.ins, o = out || 0;
  if (side === 'f') return { p: [bx.cx + along, bx.cz + bx.d / 2 - i + o], rot: 0 };
  if (side === 'b') return { p: [bx.cx + along, bx.cz - bx.d / 2 + i - o], rot: PI };
  if (side === 'r') return { p: [bx.cx + bx.w / 2 - i + o, bx.cz + along], rot: PI / 2 };
  return { p: [bx.cx - bx.w / 2 + i - o, bx.cz + along], rot: -PI / 2 };
}
function door(C, bx, side, along, mat, o) {
  o = o || {}; const w = o.w || 0.3, h = o.h || Math.min(0.62, bx.H - bx.yb - 0.1), q = onWall(bx, side, along, 0.04);
  return C.add('door', 'door', [q.p[0], bx.yb, q.p[1]], [w, h, 0.05], mat, 'walls', [bx.walls[side]], 'door', { rotY: q.rot, rep: true, exact: !!o.exact });
}
function win(C, bx, side, along, o) {
  o = o || {}; const w = o.w || 0.28, h = o.h || 0.26, y = o.y == null ? bx.yb + 0.24 : o.y, q = onWall(bx, side, along, 0.045);
  const id = C.add('window', 'window', [q.p[0], y, q.p[1]], [w, h, 0.05], o.frame || 'wood_dark', 'walls', [bx.walls[side]], 'window', { rotY: q.rot, rep: true });
  if (o.shut) {
    [-1, 1].forEach((s) => {
      const q2 = onWall(bx, side, along + s * (w / 2 + 0.075), 0.055);
      C.add('shutter', 'shutter', [q2.p[0], y - 0.01, q2.p[1]], [0.12, h + 0.02, 0.03], o.shut, 'trim', [id], 'shutter', { rotY: q2.rot, rep: true });
    });
  }
  return id;
}
/* a roof of two slopes. o: axis x|z (the ridge direction), hr rise, ov eaves overhang, ox gable end overhang, ro ridge offset, look (tile variant 0-3), mat, gmat, ridge (material or null), gv (gable variant) */
function gableRoof(C, bx, o) {
  const ax = o.axis || 'x', hr = o.hr, ov = o.ov == null ? 0.1 : o.ov, ox = o.ox == null ? 0.06 : o.ox, ro = o.ro || 0, E = o.E == null ? bx.E : o.E;
  const len = ax === 'x' ? bx.w : bx.d, span = ax === 'x' ? bx.d : bx.w, R0 = ax === 'z' ? PI / 2 : 0;
  const T = (u, v) => (ax === 'x' ? [bx.cx + u, bx.cz + v] : [bx.cx + v, bx.cz - u]);
  const pre = o.pre || '', ids = [], lookv = o.look || 0;
  const sf = hr / (span / 2 - ro), sb = hr / (span / 2 + ro), Df = span / 2 - ro + ov, Db = span / 2 + ro + ov, Lw = len + 2 * ox;
  const tf = T(0, ro + Df / 2), tb = T(0, ro - Db / 2);
  /* the gable ends first, so that the slopes can be tied to them */
  const gs = [];
  [-1, 1].forEach((e) => {
    const u = e * (len / 2 - 0.04);
    if (ro === 0) { const g = T(u, 0); gs.push(C.add(pre + 'gable', 'gable', [g[0], E, g[1]], [0.05, hr, span], o.gmat || bx.wallMat, 'walls', o.gneeds || [], 'gable', { rotY: R0, variant: o.gv || 0 })); }
    else {
      const Rf = span / 2 - ro, Rb = span / 2 + ro, g1 = T(u, ro + Rf / 2), g2 = T(u, ro - Rb / 2);
      gs.push(C.add(pre + 'gable', 'gable', [g1[0], E, g1[1]], [0.05, hr, Rf], o.gmat, 'walls', o.gneeds || [], 'gable', { rotY: R0, variant: 1 }));
      gs.push(C.add(pre + 'gable', 'gable', [g2[0], E, g2[1]], [0.05, hr, Rb], o.gmat, 'walls', o.gneeds || [], 'gable', { rotY: R0 + PI, variant: 1 }));
    }
  });
  const a = C.add(pre + 'roof', 'roof_tile', [tf[0], E - sf * ov, tf[1]], [Lw, sf * Df, Df], o.mat, 'trim', o.needs || [], 'roof', { rotY: R0, variant: lookv, rep: true });
  const b = C.add(pre + 'roof', 'roof_tile', [tb[0], E - sb * ov, tb[1]], [Lw, sb * Db, Db], o.mat, 'trim', o.needs || [], 'roof', { rotY: R0 + PI, variant: lookv, rep: true });
  ids.push(a, b);
  let rid = null;
  if (o.ridge) { const rp = T(0, ro); rid = C.add(pre + 'ridge', 'ridge', [rp[0], E + hr - 0.032, rp[1]], [Lw + 0.04, 0.07, 0.12], o.ridge, 'trim', [a, b], 'ridge', { rotY: R0 }); }
  return { ids, gables: gs, ridge: rid, E, hr, T, ax, front: a, back: b, ro };
}
/* a hipped roof: o { hr, ov, mat, pyr } */
function hipRoof(C, bx, o) {
  const ov = o.ov == null ? 0.12 : o.ov, mn = Math.min(bx.w, bx.d), s = o.hr / (mn / 2), h = s * (mn / 2 + ov);
  const id = C.add(o.pre ? o.pre + 'roof' : 'roof', 'roof_hip', [bx.cx, bx.E - s * ov, bx.cz], [bx.w + 2 * ov, h, bx.d + 2 * ov], o.mat, 'trim', o.needs || [], 'roof', { variant: o.pyr ? 1 : 0, rep: true });
  return { ids: [id], E: bx.E, hr: o.hr, id };
}
/* a one-slope roof falling to the front. o { hr, ovf, ovb, ox, mat, look, fill (material for the two end triangles and the back strip) } */
function skillion(C, bx, o) {
  const ovf = o.ovf == null ? 0.12 : o.ovf, ovb = o.ovb == null ? 0.06 : o.ovb, ox = o.ox == null ? 0.08 : o.ox, hr = o.hr, s = hr / bx.d, D = bx.d + ovf + ovb, E = bx.E;
  const zc = bx.cz + (ovf - ovb) / 2;
  const ids = [];
  [-1, 1].forEach((e) => ids.push(C.add('end', 'gable', [bx.cx + e * (bx.w / 2 - 0.04), E, bx.cz], [0.05, hr, bx.d], o.fill, 'walls', o.endNeeds || [], 'gable', { variant: 1 })));
  const bk = C.add('upper.b', 'panel', [bx.cx, E, bx.cz - bx.d / 2 + bx.ins], [bx.frame ? bx.w - 0.16 : bx.w, hr, TH], o.fill, 'walls', [bx.tops.b], 'wall', { rotY: PI });
  const t = C.add('roof', 'roof_tile', [bx.cx, E - s * ovf, zc], [bx.w + 2 * ox, s * D, D], o.mat, 'trim', [bk].concat(o.needs || []), 'roof', { variant: o.look || 0, rep: true });
  return { ids: [t], ends: ids, back: bk, id: t, E, hr };
}
/* a chimney standing on the ground beside or through a roof. pos is the middle of its base */
function chimney(C, x, z, y, h, w, d, mat, v, needs) {
  return C.add('chimney', 'chimney', [x, y, z], [w, h, d], mat, 'trim', needs || [], 'chimney', { variant: v || 0, rep: true });
}
/* a lean-to / porch pent roof facing a direction: face = 'f' (low edge to +z) 'r' (+x) 'l' (-x). x0,z0 = centre of its footprint, wd = size across, ln = run from wall to the low edge */
function pent(C, face, cx, cz, along, run, yLow, rise, mat, needs, tag, look) {
  const rot = face === 'f' ? 0 : (face === 'r' ? PI / 2 : (face === 'l' ? -PI / 2 : PI));
  return C.add('pent', 'roof_tile', [cx, yLow, cz], [along, rise, run], mat, 'trim', needs || [], tag || 'roof', { rotY: rot, variant: look || 0, rep: true });
}

/* the pass that ties parts that sink into each other, then checks everything */
function finish(C, fpExtra) {
  const parts = C.parts;
  parts.forEach((p, j) => {
    const orig = p.needs.length, add = [];
    for (let i = 0; i < j; i++) {
      const q = parts[i];
      if (p.needs.indexOf(q.id) >= 0) continue;
      if (SUP.overlaps(p, q)) add.push(q.id);
    }
    if (add.length) { p.needs = p.needs.concat(add); p.needsMin = Math.max(1, orig); }
    if (!p.needs.length && SUP.aabb(p).min[1] > 0.03) {
      const touch = [];
      for (let i = 0; i < j && touch.length < 4; i++) if (SUP.gap(SUP.aabb(p), SUP.aabb(parts[i])) <= 0.02) touch.push(parts[i].id);
      p.needs = touch;
    }
    if (p.needs.length > 12) throw new Error(C.id + ': ' + p.id + ' needs ' + p.needs.length);
    if (p.needsMin != null && p.needsMin > p.needs.length) p.needsMin = p.needs.length;
  });
  /* the plot: smallest footprint that holds the building (parts may stick out by 0.9) */
  let mx = 0.8, mz = 0.6;
  parts.forEach((p) => { const b = SUP.aabb(p); mx = Math.max(mx, Math.abs(b.min[0]), Math.abs(b.max[0])); mz = Math.max(mz, Math.abs(b.min[2]), Math.abs(b.max[2])); });
  const fw = Math.min(4, Math.max(0.4, r3((mx * 2) - 0.2))), fd = Math.min(4, Math.max(0.4, r3((mz * 2) - 0.2)));
  const labels = {};
  ['door', 'chimney', 'roof', 'window'].forEach((k) => { if (C.byId[k]) labels[k] = { door: 'Front door', chimney: 'Chimney', roof: 'Roof', window: 'Window' }[k]; });
  return {
    schema: 'rtk.building', version: 1, id: C.id, name: C.name, footprint: { w: fw, d: fd }, parts,
    systems: {
      jobs: [], storage: { coal: 10 }, start_stock: { coal: 5 },
      costs: { power_per_kwh: 24, wage_per_worker_per_minute: 0, ingredient_prices: { coal: 1 }, repair_material_price: 2 },
      repair: { seconds: 5, material_units: 1, walk_speed: 0.3, worker_roles: [] },
      inspect: { labels }
    }
  };
}

/* ------------------------------------------------------------------ the 24 cottages ------------------------------------------------------------------ */
const S = [];   /* each: [name, function(C)] */
const def = (name, fn) => S.push([name, fn]);

/* 01 plain gable, clay tiles, brick chimney: the baseline everything else is compared to */
def('Brick Chimney Gable', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 1.8, d: 1.3, H: 0.8, wall: 'paint_cream', frame: 'wood_dark', floorMat: 'stone' });
  bx.wallMat = 'paint_cream';
  const g = gableRoof(C, bx, { axis: 'x', hr: 0.5, ov: 0.12, ox: 0.08, mat: 'clay', gmat: 'paint_cream', ridge: 'clay' });
  door(C, bx, 'f', 0, 'paint_blue', { exact: true }); win(C, bx, 'f', -0.55, { shut: 'paint_blue' }); win(C, bx, 'f', 0.55, { shut: 'paint_blue' });
  chimney(C, 0.55, -0.1, bx.E + 0.05, 0.62, 0.2, 0.2, 'brick', 0, []);
});
/* 02 steep front gable, tall and narrow, with a stone chimney on the side wall */
def('Steep Front Gable', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 1.25, d: 1.5, H: 0.95, wall: 'paint_butter', frame: 'wood_dark', floorMat: 'stone' });
  bx.wallMat = 'paint_butter';
  gableRoof(C, bx, { axis: 'z', hr: 1.0, ov: 0.1, ox: 0.1, mat: 'slate', gmat: 'paint_butter', ridge: 'iron' });
  door(C, bx, 'f', -0.28, 'paint_red', { exact: true }); win(C, bx, 'f', 0.3, { shut: 'paint_red', y: bx.yb + 0.28 });
  win(C, bx, 'l', 0.2, {});
  chimney(C, 0.78, -0.2, 0, 1.72, 0.24, 0.34, 'stone', 2, []);
});
/* 03 wide, low hip roof with a fat central chimney */
def('Low Wide Hip', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 2.3, d: 1.5, H: 0.62, wall: 'plaster', frame: null, floorMat: 'stone' });
  bx.wallMat = 'plaster';
  hipRoof(C, bx, { hr: 0.3, ov: 0.2, mat: 'roof_green' });
  door(C, bx, 'f', 0, 'paint_ochre', { exact: true, w: 0.34 }); win(C, bx, 'f', -0.62, { shut: 'paint_ochre', w: 0.32 }); win(C, bx, 'f', 0.62, { shut: 'paint_ochre', w: 0.32 });
  win(C, bx, 'r', 0, {});
  chimney(C, -0.2, 0, bx.E, 0.52, 0.28, 0.24, 'brick', 1, []);
});
/* 04 pyramid roof on a square cottage */
def('Pyramid Roof', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 1.5, d: 1.5, H: 0.8, wall: 'paint_sage', frame: 'oak_dark', floorMat: 'stone' });
  bx.wallMat = 'paint_sage';
  hipRoof(C, bx, { hr: 0.85, ov: 0.14, mat: 'brick', pyr: true });
  door(C, bx, 'f', 0, 'paint_cream', { exact: true }); win(C, bx, 'f', -0.5, { shut: 'oak_dark' }); win(C, bx, 'f', 0.5, { shut: 'oak_dark' });
  win(C, bx, 'r', 0, { frame: 'paint_cream' }); win(C, bx, 'l', 0, { frame: 'paint_cream' });
});
/* 05 one-slope cabin, standing-seam roof, board walls */
def('One Slope Cabin', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 1.9, d: 1.3, H: 0.62, wall: 'wood', pv: 2, frame: 'wood_dark', floorMat: 'wood_dark' });
  skillion(C, bx, { hr: 0.5, ovf: 0.2, ovb: 0.04, ox: 0.1, mat: 'roof_seam', fill: 'wood' });
  door(C, bx, 'f', -0.55, 'paint_teal', { exact: true }); win(C, bx, 'f', 0.45, { w: 0.5, h: 0.32, frame: 'paint_teal' }); win(C, bx, 'r', 0, { w: 0.3 });
  chimney(C, 0.7, -0.35, bx.E + 0.2, 0.52, 0.14, 0.14, 'iron', 0, []);
});
/* 06 gable with a dormer window in the front slope */
def('Dormer Cottage', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 1.9, d: 1.4, H: 0.72, wall: 'paint_rose', frame: 'wood_dark', floorMat: 'stone' });
  bx.wallMat = 'paint_rose';
  const g = gableRoof(C, bx, { axis: 'x', hr: 0.66, ov: 0.12, ox: 0.07, mat: 'clay', gmat: 'paint_rose', ridge: 'clay', gv: 2 });
  /* the dormer: a little front, a window, its own two slopes and a triangle */
  const zr = 0.28, y0 = bx.E + g.hr * (1 - zr / 0.7) - 0.06, dw = 0.42;
  const f = C.add('dormer.f', 'panel', [0, y0, zr], [dw, 0.3, TH], 'paint_cream', 'walls', [g.front], 'wall');
  C.add('dormer.win', 'window', [0, y0 + 0.05, zr + 0.045], [0.22, 0.2, 0.05], 'wood_dark', 'walls', [f], 'window', { rep: true });
  C.add('dormer.tri', 'gable', [0, y0 + 0.3, zr], [0.05, 0.2, dw], 'paint_cream', 'walls', [f], 'gable', { rotY: PI / 2, variant: 2 });
  const dl = 0.5;
  C.add('dormer.roof', 'roof_tile', [0.12 + 0.015, y0 + 0.3, zr - dl / 2 + 0.03], [dl, 0.2, 0.26], 'clay', 'trim', [f], 'roof', { rotY: PI / 2 });
  C.add('dormer.roof', 'roof_tile', [-0.12 - 0.015, y0 + 0.3, zr - dl / 2 + 0.03], [dl, 0.2, 0.26], 'clay', 'trim', [f], 'roof', { rotY: -PI / 2 });
  door(C, bx, 'f', -0.6, 'paint_blue', { exact: true }); win(C, bx, 'f', 0.0, { shut: 'paint_blue', y: bx.yb + 0.22 }); win(C, bx, 'f', 0.62, { shut: 'paint_blue' });
  chimney(C, -0.82, 0, bx.E, 0.78, 0.18, 0.3, 'brick', 1, []);
});
/* 07 half-timber upper storey that juts out over a stone ground floor */
def('Jettied Half-Timber', (C) => {
  const lo = walledBox(C, { pre: 'g.', cx: 0, cz: 0, w: 1.5, d: 1.1, H: 0.62, wall: 'stone', pv: 3, frame: 'oak_dark', floorMat: 'stone' });
  const up = walledBox(C, { pre: 'u.', cx: 0, cz: 0.05, w: 1.8, d: 1.3, y0: lo.E, H: lo.E + FL + 0.55, wall: 'plaster', pv: 1, frame: 'oak_dark', floorMat: 'oak_dark', floorNeeds: [lo.tops.f, lo.tops.b, lo.tops.l, lo.tops.r], plinth: 0 });
  up.wallMat = 'plaster';
  /* brackets under the overhang */
  [-0.6, -0.2, 0.2, 0.6].forEach((x) => C.add('bracket', 'beam', [x, lo.E - 0.09, 0.62], [0.06, 0.06, 0.1], 'oak_dark', 'trim', [], 'beam'));
  gableRoof(C, up, { axis: 'x', hr: 0.5, ov: 0.1, ox: 0.1, mat: 'slate', gmat: 'plaster', ridge: 'iron', gv: 2, pre: '' });
  door(C, lo, 'f', 0, 'oak_dark', { exact: true, w: 0.32 }); win(C, lo, 'f', -0.5, { w: 0.26, frame: 'oak_dark' }); win(C, lo, 'f', 0.5, { w: 0.26, frame: 'oak_dark' });
  win(C, up, 'f', -0.5, { w: 0.3, y: up.yb + 0.15, frame: 'oak_dark' }); win(C, up, 'f', 0, { w: 0.3, y: up.yb + 0.15, frame: 'oak_dark' }); win(C, up, 'f', 0.5, { w: 0.3, y: up.yb + 0.15, frame: 'oak_dark' });
  chimney(C, -0.6, -0.15, up.E + 0.1, 0.72, 0.2, 0.2, 'stone', 0, []);
});
/* 08 low walls under a deep thatched roof, chimney on the end wall */
def('Thatched Cottage', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 1.9, d: 1.3, H: 0.66, wall: 'paint_cream', frame: null, floorMat: 'stone' });
  bx.wallMat = 'paint_cream';
  gableRoof(C, bx, { axis: 'x', hr: 0.62, ov: 0.15, ox: 0.12, mat: 'thatch', gmat: 'paint_cream', ridge: 'thatch', gv: 2 });
  door(C, bx, 'f', 0.1, 'oak_dark', { exact: true, w: 0.3, h: 0.5 }); win(C, bx, 'f', -0.55, { w: 0.26, h: 0.24, y: bx.yb + 0.18, frame: 'oak_dark', shut: 'paint_sage' }); win(C, bx, 'f', 0.65, { w: 0.26, h: 0.24, y: bx.yb + 0.18, frame: 'oak_dark', shut: 'paint_sage' });
  chimney(C, 1.05, -0.05, 0, 1.45, 0.26, 0.4, 'stone', 2, []);
});
/* 09 main gable with a low lean-to on one side */
def('Lean-To Cottage', (C) => {
  const bx = walledBox(C, { pre: '', cx: -0.35, cz: 0, w: 1.5, d: 1.2, H: 0.8, wall: 'paint_ochre', frame: 'wood_dark', floorMat: 'stone' });
  bx.wallMat = 'paint_ochre';
  gableRoof(C, bx, { axis: 'x', hr: 0.55, ov: 0.1, ox: 0.06, mat: 'brick', gmat: 'paint_ochre', ridge: 'brick', gv: 2 });
  const ln = walledBox(C, { pre: 'x.', cx: 0.78, cz: 0.05, w: 0.7, d: 1.0, H: 0.52, wall: 'wood_pale', pv: 2, frame: null, floorMat: 'stone', skip: ['l'] });
  pent(C, 'r', 0.78 + 0.05, 0.05, 1.12, 0.78, ln.E - 0.15 + 0.02, 0.2, 'wood_dark', [ln.tops.f, ln.tops.b, ln.tops.r], 'roof', 0);
  door(C, bx, 'f', -0.2, 'paint_red', { exact: true }); win(C, bx, 'f', -0.75, { shut: 'paint_red' }); win(C, ln, 'f', 0, { w: 0.3, frame: 'paint_cream' });
  chimney(C, -0.9, 0.0, bx.E + 0.02, 0.66, 0.2, 0.2, 'stone', 0, []);
});
/* 10 gable cottage with a front porch on posts */
def('Porch Cottage', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: -0.15, w: 2.15, d: 1.1, H: 0.78, wall: 'paint_butter', frame: 'wood_dark', floorMat: 'stone' });
  bx.wallMat = 'paint_butter';
  gableRoof(C, bx, { axis: 'x', hr: 0.38, ov: 0.12, ox: 0.07, mat: 'paint_teal', gmat: 'paint_butter', ridge: 'paint_teal', gv: 2 });
  door(C, bx, 'f', 0, 'paint_red', { exact: true }); win(C, bx, 'f', -0.75, { shut: 'paint_cream' }); win(C, bx, 'f', 0.75, { shut: 'paint_cream' });
  const z0 = bx.cz + bx.d / 2;
  const deck = C.add('deck', 'floor', [0, 0, z0 + 0.22], [0.9, FL, 0.44], 'wood_pale', 'frame', [], 'porch');
  const p1 = C.add('porch.post', 'post', [-0.4, FL, z0 + 0.38], [0.07, 0.62, 0.07], 'paint_cream', 'frame', [deck], 'porch'), p2 = C.add('porch.post', 'post', [0.4, FL, z0 + 0.38], [0.07, 0.62, 0.07], 'paint_cream', 'frame', [deck], 'porch');
  pent(C, 'f', 0, z0 + 0.22 + 0.02, 1.0, 0.5, 0.57, 0.22, 'paint_teal', [p1, p2, bx.walls.f], 'roof', 0);
  C.add('rail', 'beam', [-0.4, 0.3, z0 + 0.38], [0.04, 0.04, 0.04], 'paint_cream', 'trim', [p1], 'porch');
  chimney(C, -0.6, -0.3, bx.E + 0.1, 0.62, 0.2, 0.2, 'brick', 1, []);
});
/* 11 front gable with a bay window box and its own little roof */
def('Bay Window Gable', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 1.5, d: 1.5, H: 0.78, wall: 'paint_rose', frame: 'wood_dark', floorMat: 'stone' });
  bx.wallMat = 'paint_rose';
  gableRoof(C, bx, { axis: 'z', hr: 0.7, ov: 0.1, ox: 0.1, mat: 'slate', gmat: 'paint_rose', ridge: 'iron' });
  door(C, bx, 'f', 0.38, 'paint_cream', { exact: true, w: 0.3 });
  const by = walledBox(C, { pre: 'b.', cx: -0.35, cz: 0.9, w: 0.7, d: 0.5, H: 0.58, wall: 'paint_rose', frame: null, floorMat: 'stone', skip: ['b'] });
  win(C, by, 'f', 0, { w: 0.34, h: 0.3, y: by.yb + 0.12, frame: 'paint_cream' }); win(C, by, 'l', 0, { w: 0.26, h: 0.3, y: by.yb + 0.12, frame: 'paint_cream' }); win(C, by, 'r', 0, { w: 0.26, h: 0.3, y: by.yb + 0.12, frame: 'paint_cream' });
  C.add('bay.roof', 'roof_tile', [-0.35, by.E - 0.0, 0.97], [0.86, 0.2, 0.52], 'slate', 'trim', [by.tops.f, by.tops.l, by.tops.r], 'roof', { rep: true });
  chimney(C, 0.55, -0.45, bx.E + 0.2, 0.72, 0.18, 0.18, 'brick', 0, []);
});
/* 12 three tiers, each smaller than the one below, a pyramid on top */
def('Stepped Tiers', (C) => {
  const a = walledBox(C, { pre: 'a.', cx: 0, cz: 0, w: 2.1, d: 1.5, H: 0.5, wall: 'paint_ochre', frame: 'wood_dark', floorMat: 'stone' });
  const slabA = C.add('a.deck', 'floor', [0, a.E, 0], [2.18, FL, 1.58], 'clay', 'trim', [a.tops.f, a.tops.b, a.tops.l, a.tops.r], 'roof');
  const b = walledBox(C, { pre: 'b.', cx: 0.1, cz: -0.05, w: 1.4, d: 1.0, y0: a.E + FL - FL, H: a.E + FL + 0.5, wall: 'paint_cream', frame: 'wood_dark', floorMat: 'wood_dark', floorNeeds: [slabA], plinth: 0 });
  b.floor && 0;
  const slabB = C.add('b.deck', 'floor', [0.1, b.E, -0.05], [1.48, FL, 1.08], 'clay', 'trim', [b.tops.f, b.tops.b, b.tops.l, b.tops.r], 'roof');
  const c = walledBox(C, { pre: 'c.', cx: 0.25, cz: -0.05, w: 0.8, d: 0.7, y0: b.E, H: b.E + FL + 0.45, wall: 'paint_rose', frame: 'wood_dark', floorMat: 'wood_dark', floorNeeds: [slabB], plinth: 0 });
  c.wallMat = 'paint_rose';
  hipRoof(C, c, { hr: 0.5, ov: 0.1, mat: 'clay', pyr: true });
  door(C, a, 'f', -0.5, 'paint_blue', { exact: true }); win(C, a, 'f', 0.2, { shut: 'paint_cream' }); win(C, a, 'f', 0.75, { shut: 'paint_cream' });
  win(C, b, 'f', 0.1, { y: b.yb + 0.15, shut: 'paint_cream' }); win(C, b, 'f', 0.55, { y: b.yb + 0.15 }); win(C, c, 'f', 0, { w: 0.24, y: c.yb + 0.12, frame: 'paint_cream' });
});
/* 13 gable cottage with a round tower at the front corner, pointed roof */
def('Corner Tower', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0.2, cz: 0, w: 1.6, d: 1.2, H: 0.76, wall: 'paint_cream', frame: 'wood_dark', floorMat: 'stone' });
  bx.wallMat = 'paint_cream';
  gableRoof(C, bx, { axis: 'x', hr: 0.5, ov: 0.1, ox: 0.06, mat: 'brick', gmat: 'paint_cream', ridge: 'brick', gv: 2 });
  const t = C.add('tower', 'tower', [-0.78, 0, 0.38], [0.74, 1.15, 0.74], 'stone', 'walls', [], 'tower', { rep: true });
  C.add('tower.roof', 'roof_cone', [-0.78, 1.15, 0.38], [0.86, 0.72, 0.86], 'slate', 'trim', [t], 'roof', { rep: true });
  door(C, bx, 'f', 0.4, 'paint_red', { exact: true }); win(C, bx, 'f', 0.85, { shut: 'paint_red', w: 0.24 });
  chimney(C, 0.75, -0.1, bx.E + 0.1, 0.6, 0.2, 0.2, 'brick', 0, []);
});
/* 14 a steep hip roof and a tall tapered chimney, brick walls */
def('Brick Hip, Tall Stack', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 1.7, d: 1.25, H: 0.8, wall: 'brick', pv: 3, frame: 'paint_cream', floorMat: 'stone' });
  bx.wallMat = 'brick';
  hipRoof(C, bx, { hr: 0.65, ov: 0.1, mat: 'slate' });
  door(C, bx, 'f', 0, 'paint_cream', { exact: true }); win(C, bx, 'f', -0.55, { frame: 'paint_cream' }); win(C, bx, 'f', 0.55, { frame: 'paint_cream' });
  win(C, bx, 'r', 0, { frame: 'paint_cream' });
  chimney(C, 0.5, 0, bx.E, 1.2, 0.26, 0.26, 'brick', 2, []);
});
/* 15 saltbox: the ridge sits near the front, so the back slope runs long and low */
def('Saltbox Cottage', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 1.8, d: 1.5, H: 0.78, wall: 'wood_pale', pv: 2, frame: 'wood_dark', floorMat: 'stone' });
  bx.wallMat = 'wood_pale';
  gableRoof(C, bx, { axis: 'x', hr: 0.62, ro: 0.34, ov: 0.1, ox: 0.07, mat: 'paint_red', gmat: 'wood_pale', ridge: 'paint_red' });
  door(C, bx, 'f', 0.45, 'paint_blue', { exact: true }); win(C, bx, 'f', -0.3, { shut: 'paint_blue' }); win(C, bx, 'f', -0.7, { shut: 'paint_blue' });
  chimney(C, -0.2, 0.34, bx.E + 0.3, 0.6, 0.2, 0.2, 'stone', 0, []);
});
/* 16 a cross-gable wing sticks out of the front */
def('Cross Gable Wing', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: -0.2, w: 2.0, d: 1.2, H: 0.74, wall: 'plaster', frame: 'oak_dark', floorMat: 'stone' });
  bx.wallMat = 'plaster';
  gableRoof(C, bx, { axis: 'x', hr: 0.58, ov: 0.1, ox: 0.07, mat: 'roof_green', gmat: 'plaster', ridge: 'roof_green', gv: 2 });
  const wg = walledBox(C, { pre: 'w.', cx: 0.45, cz: 0.82, w: 0.8, d: 0.6, H: 0.74, wall: 'paint_rose', frame: 'oak_dark', floorMat: 'stone', skip: ['b'] });
  wg.wallMat = 'paint_rose';
  const gr = gableRoof(C, wg, { axis: 'z', hr: 0.4, ov: 0.06, ox: 0.08, mat: 'roof_green', gmat: 'paint_rose', ridge: 'roof_green', pre: 'w.' });
  door(C, wg, 'f', 0, 'paint_blue', { exact: true, w: 0.3 }); win(C, bx, 'f', -0.6, { shut: 'paint_cream' }); win(C, bx, 'f', -0.05, { shut: 'paint_cream' });
  chimney(C, -0.75, -0.2, bx.E + 0.1, 0.7, 0.2, 0.2, 'brick', 1, []);
});
/* 17 a tall, narrow tower house */
def('Tower House', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 1.15, d: 1.15, H: 1.55, wall: 'paint_teal', frame: 'oak_dark', floorMat: 'stone' });
  bx.wallMat = 'paint_teal';
  hipRoof(C, bx, { hr: 0.8, ov: 0.1, mat: 'clay', pyr: true });
  door(C, bx, 'f', 0, 'paint_cream', { exact: true, w: 0.3 });
  win(C, bx, 'f', 0, { y: bx.yb + 0.62, w: 0.26, shut: 'paint_cream' }); win(C, bx, 'f', 0, { y: bx.yb + 1.1, w: 0.22, h: 0.24, frame: 'paint_cream' });
  win(C, bx, 'r', 0, { y: bx.yb + 0.62, w: 0.24 }); win(C, bx, 'l', 0, { y: bx.yb + 0.9, w: 0.24 });
});
/* 18 a round cottage under a thatched cone */
def('Round Cottage', (C) => {
  const fl = C.add('floor', 'floor', [0, 0, 0], [1.4, FL, 1.4], 'stone', 'frame', [], 'floor');
  const t = C.add('wall', 'tower', [0, FL, 0], [1.3, 0.7, 1.3], 'paint_cream', 'walls', [fl], 'wall', { rep: true });
  C.add('roof', 'roof_cone', [0, FL + 0.7, 0], [1.65, 0.95, 1.65], 'thatch', 'trim', [t], 'roof', { rep: true });
  C.add('door', 'door', [0, FL, 0.67], [0.3, 0.5, 0.05], 'oak_dark', 'walls', [t], 'door', { rep: true, exact: true });
  C.add('window', 'window', [-0.45, FL + 0.26, 0.56], [0.24, 0.22, 0.05], 'oak_dark', 'walls', [t], 'window', { rotY: -0.7, rep: true });
  C.add('window', 'window', [0.45, FL + 0.26, 0.56], [0.24, 0.22, 0.05], 'oak_dark', 'walls', [t], 'window', { rotY: 0.7, rep: true });
});
/* 19 twin gables side by side */
def('Twin Gables', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 2.2, d: 1.2, H: 0.75, wall: 'paint_butter', frame: 'wood_dark', floorMat: 'stone' });
  bx.wallMat = 'paint_butter';
  [-1, 1].forEach((s, k) => {
    const half = { cx: s * 0.55, cz: 0, w: 1.1, d: 1.2, E: bx.E, wallMat: 'paint_butter' };
    gableRoof(C, half, { axis: 'z', hr: 0.6, ov: 0.0, ox: 0.1, mat: k ? 'paint_red' : 'paint_red', gmat: 'paint_butter', ridge: 'paint_red', pre: 'g' + k + '.', gv: 0 });
  });
  door(C, bx, 'f', 0, 'paint_blue', { exact: true, w: 0.3 }); win(C, bx, 'f', -0.55, { shut: 'paint_blue' }); win(C, bx, 'f', 0.55, { shut: 'paint_blue' });
  chimney(C, 0, 0, bx.E + 0.05, 0.9, 0.2, 0.2, 'brick', 1, []);
});
/* 20 chalet: very wide eaves, a balcony on posts */
def('Wide Eave Chalet', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 1.6, d: 1.3, H: 0.8, wall: 'wood_pale', pv: 2, frame: 'wood_dark', floorMat: 'wood_dark' });
  bx.wallMat = 'wood_pale';
  gableRoof(C, bx, { axis: 'z', hr: 0.4, ov: 0.26, ox: 0.3, mat: 'wood', gmat: 'wood_pale', ridge: 'wood_dark', look: 2 });
  door(C, bx, 'f', 0, 'paint_red', { exact: true, w: 0.3 }); win(C, bx, 'f', -0.5, { shut: 'paint_red' }); win(C, bx, 'f', 0.5, { shut: 'paint_red' });
  const z0 = bx.cz + bx.d / 2;
  const deck = C.add('deck', 'floor', [0, 0.0, z0 + 0.22], [1.3, FL, 0.44], 'wood_dark', 'frame', [], 'porch');
  [-0.6, 0.6].forEach((x) => C.add('deck.post', 'post', [x, FL, z0 + 0.4], [0.06, 0.28, 0.06], 'wood_dark', 'frame', [deck], 'porch'));
  C.add('rail', 'beam', [0, FL + 0.28, z0 + 0.4], [1.3, 0.04, 0.04], 'wood_dark', 'trim', [], 'porch');
});
/* 21 long low house with a little gabled porch roof over the middle door */
def('Long Low House', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 2.9, d: 1.0, H: 0.55, wall: 'paint_rose', frame: null, floorMat: 'stone' });
  bx.wallMat = 'paint_rose';
  gableRoof(C, bx, { axis: 'x', hr: 0.34, ov: 0.12, ox: 0.08, mat: 'slate', gmat: 'paint_rose', ridge: 'slate', gv: 2, look: 2 });
  door(C, bx, 'f', 0, 'paint_cream', { exact: true, w: 0.3 }); [-1.0, -0.5, 0.5, 1.0].forEach((x) => win(C, bx, 'f', x, { shut: 'paint_cream', w: 0.24, h: 0.24, y: bx.yb + 0.15 }));
  const z0 = bx.cz + bx.d / 2;
  C.add('porch.l', 'post', [-0.3, 0, z0 + 0.3], [0.06, 0.45, 0.06], 'paint_cream', 'frame', [], 'porch'); C.add('porch.r', 'post', [0.3, 0, z0 + 0.3], [0.06, 0.45, 0.06], 'paint_cream', 'frame', [], 'porch');
  C.add('porch.roof', 'roof_tile', [0, 0.45, z0 + 0.15], [0.8, 0.2, 0.42], 'slate', 'trim', [], 'roof', { rep: true });
  chimney(C, -1.1, -0.05, bx.E + 0.02, 0.5, 0.2, 0.2, 'brick', 0, []); chimney(C, 1.1, -0.05, bx.E + 0.02, 0.5, 0.2, 0.2, 'brick', 1, []);
});
/* 22 two one-slope blocks whose roofs fall toward each other: a V-shaped valley between a tall and a low block */
def('Butterfly Blocks', (C) => {
  const a = walledBox(C, { pre: 'a.', cx: -0.6, cz: 0, w: 1.2, d: 1.3, H: 0.92, wall: 'plaster', frame: null, floorMat: 'stone' });
  const b = walledBox(C, { pre: 'b.', cx: 0.6, cz: 0, w: 1.2, d: 1.3, H: 0.6, wall: 'paint_ochre', frame: null, floorMat: 'stone' });
  const mk = (bx, dir, hr, mat) => {
    const lo = 0.1, hi = 0.08, s = hr / bx.w, D = bx.w + lo + hi;
    const t = C.add(bx.pre + 'roof', 'roof_tile', [bx.cx + dir * (lo - hi) / 2, bx.E - s * lo, bx.cz], [bx.d + 0.16, s * D, D], mat, 'trim', [bx.tops.f, bx.tops.b], 'roof', { rotY: dir * PI / 2, rep: true, variant: 3 });
    [-1, 1].forEach((e) => C.add(bx.pre + 'end', 'gable', [bx.cx, bx.E, bx.cz + e * (bx.d / 2 - 0.04)], [0.05, hr, bx.w], bx.wall0, 'walls', [bx.tops.f], 'gable', { rotY: dir * PI / 2, variant: 1 }));
    return t;
  };
  a.wall0 = 'plaster'; b.wall0 = 'paint_ochre';
  mk(a, 1, 0.42, 'roof_seam'); mk(b, -1, 0.34, 'roof_seam');
  door(C, b, 'f', 0.15, 'paint_teal', { exact: true }); win(C, a, 'f', 0, { w: 0.4, h: 0.42, y: a.yb + 0.22, frame: 'paint_teal' }); win(C, b, 'r', 0, { w: 0.3 });
  chimney(C, -1.0, -0.4, a.E + 0.1, 0.5, 0.16, 0.16, 'iron', 0, []);
});
/* 23 a tall nave with a low aisle roof on each side */
def('Aisled Cottage', (C) => {
  const bx = walledBox(C, { pre: '', cx: 0, cz: 0, w: 1.2, d: 1.5, H: 0.95, wall: 'plaster', frame: 'oak_dark', floorMat: 'stone', skip: [] });
  bx.wallMat = 'plaster';
  gableRoof(C, bx, { axis: 'z', hr: 0.65, ov: 0.04, ox: 0.1, mat: 'brick', gmat: 'plaster', ridge: 'brick' });
  [-1, 1].forEach((s) => {
    const ax = walledBox(C, { pre: s < 0 ? 'l.' : 'r.', cx: s * 0.85, cz: 0, w: 0.56, d: 1.5, H: 0.5, wall: 'paint_sage', frame: null, floorMat: 'stone', skip: [s < 0 ? 'r' : 'l'] });
    pent(C, s < 0 ? 'l' : 'r', s * 0.88, 0, 1.56, 0.66, ax.E - 0.14, 0.26, 'brick', [ax.tops.f, ax.tops.b], 'roof', 0);
    win(C, ax, 'f', 0, { w: 0.26, frame: 'oak_dark' });
  });
  door(C, bx, 'f', 0, 'paint_red', { exact: true, w: 0.3 }); win(C, bx, 'f', 0, { y: bx.yb + 0.58, w: 0.26, shut: 'oak_dark' });
});
/* 24 hip roof with a tall round turret at the back corner */
def('Turret Hip', (C) => {
  const bx = walledBox(C, { pre: '', cx: -0.2, cz: 0.1, w: 1.6, d: 1.3, H: 0.7, wall: 'paint_butter', frame: 'wood_dark', floorMat: 'stone' });
  bx.wallMat = 'paint_butter';
  hipRoof(C, bx, { hr: 0.42, ov: 0.14, mat: 'brick' });
  const t = C.add('tower', 'tower', [0.75, 0, -0.35], [0.7, 1.45, 0.7], 'stone', 'walls', [], 'tower', { rep: true });
  C.add('tower.roof', 'roof_cone', [0.75, 1.45, -0.35], [0.82, 0.5, 0.82], 'brick', 'trim', [t], 'roof', { rep: true });
  door(C, bx, 'f', -0.2, 'paint_teal', { exact: true }); win(C, bx, 'f', -0.75, { shut: 'paint_teal' }); win(C, bx, 'f', 0.4, { shut: 'paint_teal' });
});

/* ------------------------------------------------------------------ write ------------------------------------------------------------------ */
function buildAll() {
  return S.map(([name, fn], i) => {
    const id = 'cottage_' + String(i + 1).padStart(2, '0');
    const C = new Cot(id, name); fn(C);
    return finish(C);
  });
}
module.exports = { buildAll, names: S.map((s) => s[0]) };

if (require.main === module) {
  const out = path.join(__dirname, '..', 'recipes', 'variants');
  fs.mkdirSync(out, { recursive: true });
  let bad = 0;
  buildAll().forEach((r) => {
    const v = V.validate(r);
    if (!v.ok) { bad++; console.log('INVALID ' + r.id + ' (' + r.name + ')'); v.errors.slice(0, 12).forEach((e) => console.log('  ' + e)); }
    else console.log('ok ' + r.id + ' ' + r.name + ' (' + r.parts.length + ' parts)');
    fs.writeFileSync(path.join(out, r.id + '.json'), JSON.stringify(r, null, 1) + '\n');
  });
  process.exit(bad ? 1 : 0);
}
