#!/usr/bin/env node
/* ASSET VERIFIER (CLOUD, contract v0). Independently checks an `asset_manifest` and the files it lists, from the BYTES: it never trusts the manifest's own claims, a producer's inspector or a
   screenshot. Pure Node, no dependencies, reads only. Pass or fail is decided by 12 named checks; every failure says exactly what was found.
   usage: node asset-verify.mjs <manifest.json> [--request request.json] [--json]    Exit 0 only if all checks pass. It never throws on hostile input: a bad file is a FAIL line. */
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
export const BUDGETS = {   /* TUNING: starting budgets for an iPad, to be replaced by measurements (see ASSET_CONTRACT.md section 7) */
  prop: { tris: 2000, materials: 2, tex: 1024, bytes: 1.5e6, sockets_min: 0 }, building: { tris: 8000, materials: 4, tex: 1024, bytes: 4e6, sockets_min: 1 },
  hero: { tris: 20000, materials: 6, tex: 2048, bytes: 8e6, sockets_min: 1 }, terrain_tile: { tris: 12000, materials: 3, tex: 2048, bytes: 6e6, sockets_min: 0 } };
const NAME_RE = /^[A-Za-z0-9_.-]{1,48}$/, ID_RE = /^[a-z][a-z0-9_]{0,31}$/, HEX_RE = /^[0-9a-f]{64}$/, REL_RE = /^[A-Za-z0-9_][A-Za-z0-9_\/.-]{0,119}$/;
const MANIFEST_KEYS = ['schema', 'version', 'asset_id', 'recipe', 'class', 'units', 'up', 'front', 'files', 'footprint', 'bounds', 'lods', 'materials', 'textures', 'sockets', 'collider', 'producer', 'inspection', 'run_approved_by_owner', 'warnings'];
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
/* ---- minimal GLB reader ---- */
function readGlb(buf) {
  if (buf.length < 20) throw new Error('file shorter than a GLB header');
  if (buf.readUInt32LE(0) !== 0x46546C67) throw new Error('bad magic (not a GLB)');
  if (buf.readUInt32LE(4) !== 2) throw new Error('GLB version is not 2');
  if (buf.readUInt32LE(8) !== buf.length) throw new Error('GLB length field ' + buf.readUInt32LE(8) + ' differs from file size ' + buf.length);
  let off = 12, json = null, bin = null;
  while (off + 8 <= buf.length) { const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4), s = off + 8, e = s + len; if (e > buf.length) throw new Error('chunk runs past the end of the file');
    if (type === 0x4E4F534A && json === null) json = JSON.parse(buf.slice(s, e).toString('utf8')); else if (type === 0x004E4942 && bin === null) bin = buf.slice(s, e); off = e; }
  if (!json) throw new Error('no JSON chunk'); return { json, bin: bin || Buffer.alloc(0) };
}
function mulMat(a, b) { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; }
function nodeMat(n) {
  if (Array.isArray(n.matrix) && n.matrix.length === 16) return n.matrix.map(Number);
  const t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1], [x, y, z, w] = q;
  const xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  return [(1 - 2 * (yy + zz)) * s[0], (2 * (xy + wz)) * s[0], (2 * (xz - wy)) * s[0], 0, (2 * (xy - wz)) * s[1], (1 - 2 * (xx + zz)) * s[1], (2 * (yz + wx)) * s[1], 0, (2 * (xz + wy)) * s[2], (2 * (yz - wx)) * s[2], (1 - 2 * (xx + yy)) * s[2], 0, t[0], t[1], t[2], 1];
}
function inspectGlb(buf) {
  const { json, bin } = readGlb(buf), R = { tris: 0, materials: 0, images: [], extensions: [], names: [], sockets: {}, collider: null, bounds: null, problems: [], bytes: buf.length, hasCamera: false, hasLight: false, hasAnim: false, hasSkin: false, externalUri: false };
  R.extensions = [...(json.extensionsUsed || []), ...(json.extensionsRequired || [])]; R.hasCamera = !!(json.cameras && json.cameras.length); R.hasAnim = !!(json.animations && json.animations.length); R.hasSkin = !!(json.skins && json.skins.length);
  R.hasLight = JSON.stringify(json).indexOf('KHR_lights_punctual') >= 0; R.materials = (json.materials || []).length;
  (json.buffers || []).forEach((b) => { if (b.uri) R.externalUri = true; }); (json.images || []).forEach((im) => { if (im.uri) R.externalUri = true; });
  const nodes = json.nodes || [], acc = json.accessors || [], meshes = json.meshes || [], bv = json.bufferViews || [];
  nodes.forEach((n) => { if (n.name !== undefined) R.names.push(String(n.name)); });
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; let anyBounds = false;
  const seen = new Set(); function walk(i, parent, depth) {
    if (depth > 32 || seen.has(i) || !nodes[i]) { if (depth > 32) R.problems.push('node tree deeper than 32'); return; } seen.add(i);
    const n = nodes[i], m = mulMat(parent, nodeMat(n)), name = String(n.name || '');
    if (/^socket_/.test(name)) R.sockets[name.slice(7)] = [m[12], m[13], m[14]]; if (name === 'collider') R.collider = n.extras && Array.isArray(n.extras.box) ? n.extras.box.map(Number) : [];
    if (n.mesh !== undefined && meshes[n.mesh]) (meshes[n.mesh].primitives || []).forEach((p) => {
      if ((p.mode === undefined ? 4 : p.mode) !== 4) { R.problems.push('primitive mode ' + p.mode + ' is not triangles'); return; }
      const pa = acc[p.attributes && p.attributes.POSITION]; if (!pa || !pa.min || !pa.max) { R.problems.push('POSITION accessor without min and max'); return; }
      R.tris += p.indices !== undefined ? Math.floor((acc[p.indices] ? acc[p.indices].count : 0) / 3) : Math.floor(pa.count / 3);
      for (let cx = 0; cx < 2; cx++) for (let cy = 0; cy < 2; cy++) for (let cz = 0; cz < 2; cz++) { const px = cx ? pa.max[0] : pa.min[0], py = cy ? pa.max[1] : pa.min[1], pz = cz ? pa.max[2] : pa.min[2];
        const X = m[0] * px + m[4] * py + m[8] * pz + m[12], Y = m[1] * px + m[5] * py + m[9] * pz + m[13], Z = m[2] * px + m[6] * py + m[10] * pz + m[14];
        lo[0] = Math.min(lo[0], X); lo[1] = Math.min(lo[1], Y); lo[2] = Math.min(lo[2], Z); hi[0] = Math.max(hi[0], X); hi[1] = Math.max(hi[1], Y); hi[2] = Math.max(hi[2], Z); anyBounds = true; }
    });
    (n.children || []).forEach((c) => walk(c, m, depth + 1));
  };
  const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], sc = (json.scenes || [])[json.scene || 0]; ((sc && sc.nodes) || []).forEach((i) => walk(i, I, 0));
  if (anyBounds) R.bounds = { min: lo, max: hi };
  (json.images || []).forEach((im) => { const v = bv[im.bufferView]; if (!v) { R.images.push({ w: 0, h: 0, fmt: 'none' }); return; } const b = bin.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
    if (b.length > 24 && b.readUInt32BE(0) === 0x89504E47) R.images.push({ w: b.readUInt32BE(16), h: b.readUInt32BE(20), fmt: 'png' });
    else if (b[0] === 0xFF && b[1] === 0xD8) { let o = 2, found = null; while (o + 9 < b.length) { if (b[o] !== 0xFF) { o++; continue; } const mk = b[o + 1]; if (mk >= 0xC0 && mk <= 0xCF && mk !== 0xC4 && mk !== 0xC8 && mk !== 0xCC) { found = { w: b.readUInt16BE(o + 7), h: b.readUInt16BE(o + 5), fmt: 'jpeg' }; break; } o += 2 + b.readUInt16BE(o + 2); } R.images.push(found || { w: 0, h: 0, fmt: 'jpeg?' }); }
    else R.images.push({ w: 0, h: 0, fmt: 'unknown' }); });
  return R;
}
/* ---- the 12 checks ---- */
export function verify(manifestPath, requestPath) {
  const out = [], fail = (name, why) => out.push({ name, ok: false, why }), pass = (name, note) => out.push({ name, ok: true, why: note || '' });
  let M; const dir = path.dirname(path.resolve(manifestPath));
  try { M = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (e) { fail('1 manifest is valid JSON', String(e.message).slice(0, 120)); return out; }
  /* 1 manifest shape */
  const probs = []; if (!isObj(M)) probs.push('not an object'); else { Object.keys(M).forEach((k) => { if (!MANIFEST_KEYS.includes(k)) probs.push('unknown key ' + k); });
    if (M.schema !== 'asset_manifest' || M.version !== 0) probs.push('schema must be asset_manifest version 0'); if (!ID_RE.test(String(M.asset_id))) probs.push('bad asset_id'); if (!BUDGETS[M.class]) probs.push('unknown class ' + M.class);
    if (M.units !== 'm' || M.up !== 'y' || M.front !== '+z') probs.push('units must be m, up y, front +z');
    if (!isObj(M.recipe) || !ID_RE.test(String(M.recipe.id)) || !HEX_RE.test(String(M.recipe.sha256))) probs.push('recipe link needs id, version and sha256');
    if (!isObj(M.files) || !isObj(M.files.glb)) probs.push('files.glb is required'); }
  if (probs.length) { fail('1 manifest shape: strict keys, ids, units, class', probs.join('; ')); return out; } pass('1 manifest shape: strict keys, ids, units, class');
  /* 2 request link */
  if (requestPath) { try { const Q = JSON.parse(fs.readFileSync(requestPath, 'utf8')), bad = [];
    if (Q.recipe_sha256 !== M.recipe.sha256) bad.push('recipe sha256 differs from the request'); if (Q.request_id === undefined || !Q.recipe_path) bad.push('request lacks request_id or recipe_path'); if (Q.class && Q.class !== M.class) bad.push('class differs from the request');
    bad.length ? fail('2 the manifest answers the request (recipe id, sha256, class)', bad.join('; ')) : pass('2 the manifest answers the request (recipe id, sha256, class)'); } catch (e) { fail('2 the manifest answers the request (recipe id, sha256, class)', 'request unreadable: ' + String(e.message).slice(0, 80)); } }
  else pass('2 the manifest answers the request (recipe id, sha256, class)', 'no request given: skipped');
  /* 3 files exist, stay inside the folder, have the right hash and size */
  const entries = []; const walkFiles = (v, key) => { if (isObj(v) && typeof v.path === 'string') entries.push([key, v]); else if (Array.isArray(v)) v.forEach((x, i) => walkFiles(x, key + '[' + i + ']')); else if (isObj(v)) Object.keys(v).forEach((k) => walkFiles(v[k], key + '.' + k)); };
  walkFiles(M.files, 'files'); const fbad = [], bufs = {};
  entries.forEach(([key, f]) => { if (!REL_RE.test(f.path) || f.path.split('/').includes('..') || !/\.(glb|png|json)$/.test(f.path)) { fbad.push(key + ': unsafe or unsupported path'); return; }
    const full = path.resolve(dir, f.path); if (!full.startsWith(dir + path.sep)) { fbad.push(key + ': path leaves the folder'); return; }
    if (!fs.existsSync(full)) { fbad.push(key + ': file missing'); return; } const b = fs.readFileSync(full); bufs[key] = b;
    if (!HEX_RE.test(String(f.sha256)) || sha(b) !== f.sha256) fbad.push(key + ': sha256 does not match the file'); if (f.bytes !== b.length) fbad.push(key + ': size ' + b.length + ' differs from claimed ' + f.bytes); });
  fbad.length ? fail('3 files: present, inside the folder, sha256 and size match', fbad.join('; ')) : pass('3 files: present, inside the folder, sha256 and size match', entries.length + ' files');
  const B = BUDGETS[M.class]; let R = null, lod0 = null;
  try { lod0 = bufs['files.glb'] ? inspectGlb(bufs['files.glb']) : null; R = lod0; } catch (e) { fail('4 GLB is well formed (header, chunks, JSON)', String(e.message).slice(0, 140)); return out; }
  if (!R) { fail('4 GLB is well formed (header, chunks, JSON)', 'the GLB could not be read'); return out; } pass('4 GLB is well formed (header, chunks, JSON)');
  /* 5 nothing executable or external */
  const xb = []; if (R.extensions.length) xb.push('extensions: ' + R.extensions.join(',')); if (R.hasCamera) xb.push('camera'); if (R.hasLight) xb.push('light'); if (R.hasAnim) xb.push('animation (v0 is static)'); if (R.hasSkin) xb.push('skin'); if (R.externalUri) xb.push('external or data URI');
  R.problems.forEach((p) => xb.push(p)); R.names.forEach((n) => { if (!NAME_RE.test(n)) xb.push('node name not plain: ' + JSON.stringify(n).slice(0, 40)); });
  xb.length ? fail('5 static, self-contained: no extensions, cameras, lights, animation, external links, odd names', xb.join('; ')) : pass('5 static, self-contained: no extensions, cameras, lights, animation, external links, odd names');
  /* 6 triangles, 7 LODs */
  const tbad = []; if (R.tris > B.tris) tbad.push('LOD0 has ' + R.tris + ' triangles, budget ' + B.tris); if (M.lods && M.lods.length) { /* claim */ const cl = M.lods[0]; if (cl && cl.triangles !== R.tris) tbad.push('manifest claims ' + cl.triangles + ' triangles, the file has ' + R.tris); }
  tbad.length ? fail('6 triangles within the class budget and equal to the claim', tbad.join('; ')) : pass('6 triangles within the class budget and equal to the claim', R.tris + ' triangles');
  const lbad = []; let prevTris = R.tris; (Array.isArray(M.files.lods) ? M.files.lods : []).forEach((l, i) => { const b = bufs['files.lods[' + i + ']']; if (!b) return; try { const r = inspectGlb(b);
    if (r.tris >= prevTris) lbad.push('LOD' + (i + 1) + ' has ' + r.tris + ' triangles, not fewer than ' + prevTris); prevTris = r.tris;
    if (r.bounds && R.bounds) for (let a = 0; a < 3; a++) { const e0 = R.bounds.max[a] - R.bounds.min[a], e1 = r.bounds.max[a] - r.bounds.min[a]; if (Math.abs(e1 - e0) > 0.05 * Math.max(e0, 1e-6)) lbad.push('LOD' + (i + 1) + ' size differs from LOD0 on axis ' + 'xyz'[a]); } } catch (e) { lbad.push('LOD' + (i + 1) + ': ' + String(e.message).slice(0, 60)); } });
  lbad.length ? fail('7 detail levels get strictly lighter and keep the same size', lbad.join('; ')) : pass('7 detail levels get strictly lighter and keep the same size');
  /* 8 materials and textures */
  const mbad = []; if (R.materials > B.materials) mbad.push(R.materials + ' materials, budget ' + B.materials); R.images.forEach((im, i) => { const pot = (v) => v > 0 && (v & (v - 1)) === 0; if (!pot(im.w) || !pot(im.h)) mbad.push('texture ' + i + ' is ' + im.w + 'x' + im.h + ' (power of two, readable PNG or JPEG required)'); if (im.w > B.tex || im.h > B.tex) mbad.push('texture ' + i + ' is ' + im.w + 'x' + im.h + ', limit ' + B.tex); });
  mbad.length ? fail('8 materials and textures within budget, power-of-two sizes', mbad.join('; ')) : pass('8 materials and textures within budget, power-of-two sizes', R.materials + ' materials, ' + R.images.length + ' textures');
  /* 9 file size */
  const total = Object.values(bufs).reduce((s, b) => s + b.length, 0); R.bytes > B.bytes || total > 3 * B.bytes ? fail('9 file size within the class cap', 'glb ' + R.bytes + ' bytes (cap ' + B.bytes + '), all files ' + total) : pass('9 file size within the class cap', R.bytes + ' bytes');
  /* 10 base on the ground, origin at base centre, footprint matches the recipe */
  const gbad = []; if (!R.bounds) gbad.push('no geometry bounds'); else { const b = R.bounds, h = b.max[1] - b.min[1], w = b.max[0] - b.min[0], d = b.max[2] - b.min[2];
    if (Math.abs(b.min[1]) > 0.02 * Math.max(h, 0.01)) gbad.push('base is not on y=0 (min y ' + b.min[1].toFixed(3) + ')'); const cx = (b.max[0] + b.min[0]) / 2, cz = (b.max[2] + b.min[2]) / 2; if (Math.abs(cx) > 0.05 * Math.max(w, 0.01) || Math.abs(cz) > 0.05 * Math.max(d, 0.01)) gbad.push('origin is not at the base centre');
    if (M.footprint && isObj(M.footprint)) { if (Math.abs(w - M.footprint.w) > 0.02 * M.footprint.w || Math.abs(d - M.footprint.d) > 0.02 * M.footprint.d) gbad.push('footprint ' + w.toFixed(3) + ' x ' + d.toFixed(3) + ' differs from the recipe ' + M.footprint.w + ' x ' + M.footprint.d + ' by more than 2 percent'); }
    if (M.bounds && isObj(M.bounds) && Array.isArray(M.bounds.max) && Math.abs(M.bounds.max[1] - b.max[1]) > 0.02 * Math.max(h, 0.01)) gbad.push('claimed height differs from the file'); }
  gbad.length ? fail('10 base on the ground, origin at the base centre, footprint equals the recipe', gbad.join('; ')) : pass('10 base on the ground, origin at the base centre, footprint equals the recipe');
  /* 11 sockets and collider */
  const sbad = [], want = Array.isArray(M.sockets) ? M.sockets : []; if (want.length < B.sockets_min) sbad.push('class ' + M.class + ' needs at least ' + B.sockets_min + ' socket(s)'); want.forEach((s) => { const got = R.sockets[s.name]; if (!got) sbad.push('socket ' + s.name + ' missing in the file'); else if (Array.isArray(s.pos) && s.pos.some((v, i) => Math.abs(v - got[i]) > 0.01)) sbad.push('socket ' + s.name + ' is not where the manifest says'); });
  Object.keys(R.sockets).forEach((n) => { if (!want.some((s) => s.name === n)) sbad.push('socket ' + n + ' in the file but not in the manifest'); }); if (!R.collider || R.collider.length !== 3 || R.collider.some((v) => !(v > 0))) sbad.push('collider node with a positive box [w,h,d] is required');
  sbad.length ? fail('11 sockets and collider present, named and placed as claimed', sbad.join('; ')) : pass('11 sockets and collider present, named and placed as claimed', Object.keys(R.sockets).length + ' sockets');
  /* 12 the producer's own inspection claims are consistent with what we found */
  const ibad = []; const I = M.inspection; if (!isObj(I) || !Number.isInteger(I.checks_total) || !Number.isInteger(I.checks_passed) || !Array.isArray(I.failed)) ibad.push('inspection needs checks_total, checks_passed and failed[]');
  else { if (I.checks_passed + I.failed.length !== I.checks_total) ibad.push('inspection counts do not add up'); if (I.failed.length && M.run_approved_by_owner === true) ibad.push('the producer reports failed checks (' + I.failed.join(',') + ') on an approved run'); }
  if (typeof M.run_approved_by_owner !== 'boolean') ibad.push('run_approved_by_owner must be true or false'); else if (M.run_approved_by_owner !== true) ibad.push('the run was not approved by the owner');
  ibad.length ? fail('12 the producer\'s inspection record is consistent and the run was approved', ibad.join('; ')) : pass('12 the producer\'s inspection record is consistent and the run was approved');
  return out;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const a = process.argv.slice(2), mp = a.find((x) => !x.startsWith('--')), qi = a.indexOf('--request'); if (!mp) { console.log('usage: node asset-verify.mjs <manifest.json> [--request request.json] [--json]'); process.exit(2); }
  let res; try { res = verify(mp, qi >= 0 ? a[qi + 1] : null); } catch (e) { res = [{ name: 'verifier', ok: false, why: String(e.message).slice(0, 160) }]; }
  if (a.includes('--json')) console.log(JSON.stringify(res, null, 1)); else { res.forEach((r) => console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.why ? '  [' + r.why + ']' : ''))); }
  const bad = res.filter((r) => !r.ok).length; console.log(bad ? '\nASSET REJECTED: ' + bad + ' check(s) failed' : '\nASSET ACCEPTED: all checks passed'); process.exit(bad ? 1 : 0);
}
