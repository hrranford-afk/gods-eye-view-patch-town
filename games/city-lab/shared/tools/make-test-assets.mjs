#!/usr/bin/env node
/* TEST FIXTURES for the asset contract: writes small GLB assets WITHOUT Blender (a hand-written binary glTF writer), so the verifier and the importer can be tested in the cloud.
   These are test fixtures, NOT produced by the workshop. The manifest numbers are computed here from how each box was built, independently of asset-verify.mjs.
   usage: node make-test-assets.mjs <outDir>   (writes valid/ and one folder per hostile case) */
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, '../..');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
function crc32(b) { let c, crc = ~0; for (let i = 0; i < b.length; i++) { c = (crc ^ b[i]) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; crc = (crc >>> 8) ^ c; } return (~crc) >>> 0; }
function png(w, h, rgb) { const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = rgb[0] + ((x ^ y) & 15); raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; } }
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2; return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }
function box(cx, cy, cz, sx, sy, sz) {   /* centre and size; 24 vertices, 12 triangles */
  const hx = sx / 2, hy = sy / 2, hz = sz / 2, F = [[[1, 0, 0], [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]]], [[-1, 0, 0], [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]]], [[0, 1, 0], [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]]],
    [[0, -1, 0], [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]]], [[0, 0, 1], [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]]], [[0, 0, -1], [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]]]];
  const P = [], N = [], U = [], I = []; F.forEach(([n, vs], f) => { vs.forEach((v, k) => { P.push(v[0] + cx, v[1] + cy, v[2] + cz); N.push(...n); U.push(k & 1, k >> 1); }); I.push(f * 4, f * 4 + 1, f * 4 + 2, f * 4, f * 4 + 2, f * 4 + 3); }); return { P, N, U, I }; }
function merge(boxes) { const P = [], N = [], U = [], I = []; let base = 0; boxes.forEach((b) => { P.push(...b.P); N.push(...b.N); U.push(...b.U); b.I.forEach((i) => I.push(i + base)); base += b.P.length / 3; }); return { P, N, U, I }; }
function pad4(b, fill) { const n = (4 - (b.length % 4)) % 4; return n ? Buffer.concat([b, Buffer.alloc(n, fill)]) : b; }
function glb(opts) {   /* opts: name, boxes[], tex {w,h}|null, nodesExtra, json patch fn, binPad, materials, sockets[{name,pos}], collider [w,h,d], lodName */
  const g = merge(opts.boxes), pos = Buffer.from(new Float32Array(g.P).buffer), nor = Buffer.from(new Float32Array(g.N).buffer), uv = Buffer.from(new Float32Array(g.U).buffer), idx = Buffer.from(new Uint16Array(g.I).buffer);
  const img = opts.tex ? png(opts.tex.w, opts.tex.h, [150, 110, 70]) : null; const parts = [pos, nor, uv, idx]; if (img) parts.push(img); if (opts.binPad) parts.push(Buffer.alloc(opts.binPad));
  const views = [], padded = parts.map((p) => pad4(p, 0)); let off = 0; padded.forEach((p, i) => { views.push({ buffer: 0, byteOffset: off, byteLength: parts[i].length }); off += p.length; });
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < g.P.length; i += 3) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], g.P[i + a]); mx[a] = Math.max(mx[a], g.P[i + a]); }
  const json = { asset: { version: '2.0', generator: 'cloud test fixture writer' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ name: opts.name, children: [1, ...(opts.sockets || []).map((_, i) => 2 + i), 2 + (opts.sockets || []).length] }, { name: opts.lodName, mesh: 0 }, ...(opts.sockets || []).map((s) => ({ name: 'socket_' + s.name, translation: s.pos })), { name: 'collider', extras: { box: opts.collider } }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
    materials: Array.from({ length: opts.materials || 1 }, (_, i) => ({ name: 'mat' + i, pbrMetallicRoughness: { baseColorFactor: [0.6, 0.45, 0.3, 1], metallicFactor: 0, roughnessFactor: 0.9, ...(img && i === 0 ? { baseColorTexture: { index: 0 } } : {}) } })),
    accessors: [{ bufferView: 0, componentType: 5126, count: g.P.length / 3, type: 'VEC3', min: mn, max: mx }, { bufferView: 1, componentType: 5126, count: g.N.length / 3, type: 'VEC3' }, { bufferView: 2, componentType: 5126, count: g.U.length / 2, type: 'VEC2' }, { bufferView: 3, componentType: 5123, count: g.I.length, type: 'SCALAR' }],
    bufferViews: views.slice(0, 4).map((v, i) => ({ ...v, target: i === 3 ? 34963 : 34962 })), buffers: [{ byteLength: off }] };
  if (img) { json.bufferViews.push(views[4]); json.images = [{ bufferView: 4, mimeType: 'image/png' }]; json.samplers = [{}]; json.textures = [{ source: 0, sampler: 0 }]; }
  if (opts.patch) opts.patch(json); const J = pad4(Buffer.from(JSON.stringify(json)), 0x20), Bn = pad4(Buffer.concat(padded), 0);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + J.length + 8 + Bn.length, 8);
  const ch = (t, d) => { const h = Buffer.alloc(8); h.writeUInt32LE(d.length, 0); h.writeUInt32LE(t, 4); return Buffer.concat([h, d]); };
  return { bytes: Buffer.concat([head, ch(0x4E4F534A, J), ch(0x004E4942, Bn)]), tris: g.I.length / 3, bounds: { min: mn, max: mx } };
}
/* a small shed: floor 1.2 x 1.0, four posts, four wall panels, a roof slab; LOD1 is a single box with a roof */
const SHED_LOD0 = () => [box(0, 0.025, 0, 1.2, 0.05, 1.0), ...[[-0.56, -0.46], [0.56, -0.46], [-0.56, 0.46], [0.56, 0.46]].map(([x, z]) => box(x, 0.45, z, 0.08, 0.8, 0.08)), box(0, 0.45, 0.46, 1.04, 0.8, 0.04), box(0, 0.45, -0.46, 1.04, 0.8, 0.04), box(-0.56, 0.45, 0, 0.04, 0.8, 0.84), box(0.56, 0.45, 0, 0.04, 0.8, 0.84), box(0, 0.9, 0, 1.2, 0.06, 1.0)];
const SHED_LOD1 = () => [box(0, 0.025, 0, 1.2, 0.05, 1.0), box(0, 0.45, 0, 1.1, 0.8, 0.9), box(0, 0.9, 0, 1.2, 0.06, 1.0)];
export function make(outDir, name, o = {}) {
  const dir = path.join(outDir, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const recipePath = path.join(ROOT, 'recipes/shed.json'), recipeBuf = fs.readFileSync(recipePath), recipe = JSON.parse(recipeBuf), cls = o.class || 'building';
  const common = { name: 'shed_01', sockets: o.sockets === undefined ? [{ name: 'door', pos: [0, 0.4, 0.5] }] : o.sockets, collider: o.collider === undefined ? [1.2, 0.93, 1.0] : o.collider, materials: o.materials || 1 };
  const boxes0 = o.boxes0 || SHED_LOD0(); if (o.below) boxes0.push(box(0, -0.5, 0, 0.2, 0.2, 0.2)); if (o.wide) boxes0.push(box(0, 0.3, 0, 1.6, 0.1, 1.0)); if (o.manyBoxes) for (let i = 0; i < o.manyBoxes; i++) boxes0.push(box(0, 0.3 + (i % 5) * 0.01, 0, 0.01, 0.01, 0.01));
  const a = glb({ ...common, lodName: 'shed_01_lod0', boxes: boxes0, tex: o.tex === undefined ? { w: 64, h: 64 } : o.tex, binPad: o.binPad, patch: o.patch0 });
  const b = glb({ ...common, lodName: 'shed_01_lod1', boxes: o.lod1Heavy ? SHED_LOD0() : SHED_LOD1(), tex: null });
  let f0 = a.bytes, f1 = b.bytes; if (o.badMagic) { f0 = Buffer.from(f0); f0.writeUInt32LE(0x12345678, 0); } if (o.truncate) f0 = f0.slice(0, Math.floor(f0.length / 2));
  fs.writeFileSync(path.join(dir, 'shed_01.glb'), f0); fs.writeFileSync(path.join(dir, 'shed_01.lod1.glb'), f1);
  const prev = png(64, 64, [200, 200, 200]); fs.writeFileSync(path.join(dir, 'shed_01.preview.png'), prev);
  const M = { schema: 'asset_manifest', version: 0, asset_id: 'shed_01', recipe: { id: recipe.id, version: recipe.version, sha256: o.wrongRecipe ? '0'.repeat(64) : sha(recipeBuf) }, class: cls, units: 'm', up: 'y', front: '+z',
    files: { glb: { path: 'shed_01.glb', sha256: sha(f0), bytes: f0.length }, lods: [{ path: 'shed_01.lod1.glb', sha256: sha(f1), bytes: f1.length }], preview_png: { path: 'shed_01.preview.png', sha256: sha(prev), bytes: prev.length } },
    footprint: { w: o.badFootprint ? 1.5 : recipe.footprint.w, d: recipe.footprint.d }, bounds: { min: a.bounds.min.map((v) => Math.round(v * 1e4) / 1e4), max: a.bounds.max.map((v) => Math.round(v * 1e4) / 1e4) },
    lods: [{ triangles: o.claimTris !== undefined ? o.claimTris : a.tris }, { triangles: b.tris }], materials: common.materials, textures: [{ name: 'shed_01_base', w: 64, h: 64, format: 'png' }],
    sockets: o.manifestSockets === undefined ? (common.sockets || []).map((s) => ({ name: s.name, pos: s.pos })) : o.manifestSockets, collider: { box: [1.2, 0.93, 1.0] },
    producer: { machine_class: 'cloud test fixture', converter_id: 'fixture_writer_v0', converter_sha256: sha(Buffer.from(fs.readFileSync(fileURLToPath(import.meta.url)))), seconds: 0 },
    inspection: o.inspection || { checks_total: 12, checks_passed: 12, failed: [] }, run_approved_by_owner: o.approved === undefined ? true : o.approved, warnings: ['TEST FIXTURE: not produced by the workshop'] };
  if (o.unknownKey) M.evil = 1; if (o.traversal) M.files.preview_png.path = '../shed_01.preview.png'; if (o.tamper) fs.appendFileSync(path.join(dir, 'shed_01.glb'), Buffer.alloc(4)); if (o.missing) fs.rmSync(path.join(dir, 'shed_01.lod1.glb'));
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(M, null, 1)); fs.writeFileSync(path.join(dir, 'request.json'), JSON.stringify({ request_id: 'ASSET-T01', recipe_path: 'recipes/shed.json', recipe_sha256: sha(recipeBuf), validator_commit: 'fixture', class: cls, wanted_outputs: ['glb', 'preview_png', 'inspection_json'], machine_run_approved: false, notes: 'test fixture request' }, null, 1));
  return { dir, manifest: path.join(dir, 'manifest.json'), request: path.join(dir, 'request.json'), tris0: a.tris, tris1: b.tris };
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) { const out = path.resolve(process.argv[2] || path.join(ROOT, 'shared/assets/fixtures')); const r = make(out, 'valid'); console.log('wrote ' + r.dir + ' (LOD0 ' + r.tris0 + ' triangles, LOD1 ' + r.tris1 + ')'); }
