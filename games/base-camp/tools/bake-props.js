// Bakes picked CC0 GLBs into models/props.js (vertex-coloured, quantised, base64).
// Run: node tools/bake-props.js   (needs playwright + chromium, used only to decode PNG colour maps)
// Works whether the enclosing package is CommonJS or "type": "module".
// (Node 22+: process.getBuiltinModule; createRequire loads playwright from the global/NODE_PATH install.)
const fs = process.getBuiltinModule('fs'), path = process.getBuiltinModule('path');
const req = process.getBuiltinModule('module').createRequire(path.resolve(process.argv[1]));
const ROOT = path.join(path.dirname(path.resolve(process.argv[1])), '..');
const SRC = path.join(ROOT, 'models', 'cc0');
const OUT = path.join(ROOT, 'models', 'props.js');
// prop name -> source file (without .glb)
const PICKS = {
  matchboxHut: 'quaternius-survival-matchbox',
  canHut: 'kenney-food-can',
  canHutOpen: 'kenney-food-can-open',
  peanutJar: 'kenney-food-peanut-jar',
  honeyJar: 'kenney-food-honey',
  well: 'quaternius-village-well',
  pulleyFrame: 'kenney-survival-pulley-frame',
  lookoutFrame: 'kenney-survival-lookout-frame',
  carrot: 'kenney-food-carrot',
  corn: 'kenney-food-corn',
  pumpkin: 'kenney-food-pumpkin',
  mushroom: 'kenney-food-mushroom',
  mushrooms: 'kenney-nature-mushrooms',
  match: 'quaternius-survival-match',
};
const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function parseGlb(buf) {
  let off = 12, json = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === 0x4E4F534A) json = JSON.parse(data.toString('utf8')); else if (type === 0x004E4942) bin = data;
    off += 8 + len;
  }
  return { json, bin };
}
function readAcc(g, i, norm) {
  const a = g.json.accessors[i], bv = g.json.bufferViews[a.bufferView];
  const T = CT[a.componentType], n = NC[a.type], base = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const stride = bv.byteStride || n * T.BYTES_PER_ELEMENT;
  const out = new Float64Array(a.count * n);
  const dv = new DataView(g.bin.buffer, g.bin.byteOffset, g.bin.byteLength);
  const get = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[a.componentType];
  const div = !norm && !a.normalized ? 1 : { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[a.componentType] || 1;
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) {
    const p = base + k * stride + c * T.BYTES_PER_ELEMENT;
    out[k * n + c] = (T.BYTES_PER_ELEMENT === 1 ? dv[get](p) : dv[get](p, true)) / div;
  }
  return { data: out, n, count: a.count };
}
// 4x4 column-major helpers
const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
function nodeMat(n) {
  if (n.matrix) return n.matrix;
  const t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
  const [x, y, z, w] = q;
  const r = [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, 0, 0, 0, 1];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 4 + j] *= s[i];
  r[12] = t[0]; r[13] = t[1]; r[14] = t[2];
  return r;
}
const INK = { canHutOpen: 0.012 }; // concave props need a thinner hull or it shows through the opening
const RAW_FACTOR = new Set(['kenney-nature-mushrooms']); // factors authored as display colours (the pack's PBR look is metallic=1, which only reads dark without an env map)
const srgb = (c) => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

// Collect world-space triangles-with-attributes from one GLB.
function collect(g, tex, raw) {
  const verts = [], idx = []; // verts: {p,n,c}
  const walk = (ni, parent) => {
    const nd = g.json.nodes[ni], m = mul(parent, nodeMat(nd));
    if (nd.mesh !== undefined) for (const pr of g.json.meshes[nd.mesh].primitives) {
      if (pr.mode !== undefined && pr.mode !== 4) continue;
      const P = readAcc(g, pr.attributes.POSITION), N = pr.attributes.NORMAL !== undefined ? readAcc(g, pr.attributes.NORMAL) : null;
      const UV = pr.attributes.TEXCOORD_0 !== undefined ? readAcc(g, pr.attributes.TEXCOORD_0, true) : null;
      const CO = pr.attributes.COLOR_0 !== undefined ? readAcc(g, pr.attributes.COLOR_0, true) : null;
      const mat = g.json.materials ? g.json.materials[pr.material] : null;
      const pbr = (mat && mat.pbrMetallicRoughness) || {};
      const f = pbr.baseColorFactor || [1, 1, 1, 1];
      const hasTex = pbr.baseColorTexture !== undefined && UV && tex;
      const base = verts.length;
      for (let k = 0; k < P.count; k++) {
        const x = P.data[k * 3], y = P.data[k * 3 + 1], z = P.data[k * 3 + 2];
        const p = [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
        let n = [0, 1, 0];
        if (N) { const a = N.data[k * 3], b = N.data[k * 3 + 1], c = N.data[k * 3 + 2]; n = [m[0] * a + m[4] * b + m[8] * c, m[1] * a + m[5] * b + m[9] * c, m[2] * a + m[6] * b + m[10] * c]; const l = Math.hypot(...n) || 1; n = n.map(v => v / l); }
        let col;
        if (hasTex) { col = tex.sample(UV.data[k * 2], UV.data[k * 2 + 1]); }
        else { col = raw ? [f[0], f[1], f[2]] : [srgb(f[0]), srgb(f[1]), srgb(f[2])]; if (CO) col = col.map((v, i) => v * srgb(CO.data[k * CO.n + i])); col = col.map(v => v * 255); }
        verts.push({ p, n, c: col });
      }
      let ix;
      if (pr.indices !== undefined) ix = readAcc(g, pr.indices).data; else { ix = new Float64Array(P.count); for (let i = 0; i < P.count; i++) ix[i] = i; }
      // handle mirrored transforms (negative determinant) by flipping winding
      const det = m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5]);
      for (let i = 0; i < ix.length; i += 3) det < 0 ? idx.push(base + ix[i], base + ix[i + 2], base + ix[i + 1]) : idx.push(base + ix[i], base + ix[i + 1], base + ix[i + 2]);
    }
    for (const c of nd.children || []) walk(c, m);
  };
  const id = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const r of g.json.scenes[g.json.scene || 0].nodes) walk(r, id);
  return { verts, idx };
}

async function main() {
  const { chromium } = req('playwright');
  const browser = await chromium.launch(); const page = await browser.newPage();
  const decodePng = async (bytes) => page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    return { w: img.width, h: img.height, d: Array.from(x.getImageData(0, 0, img.width, img.height).data) };
  }, Buffer.from(bytes).toString('base64'));

  const props = {}; let total = 0; const report = [];
  for (const [name, file] of Object.entries(PICKS)) {
    const g = parseGlb(fs.readFileSync(path.join(SRC, file + '.glb')));
    let tex = null;
    if (g.json.images && g.json.images.length) {
      const bv = g.json.bufferViews[g.json.images[0].bufferView];
      const png = g.bin.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
      const im = await decodePng(png);
      tex = { sample(u, v) { // glTF uv origin is top-left; clamp, nearest
        const x = Math.min(im.w - 1, Math.max(0, Math.floor(u * im.w))), y = Math.min(im.h - 1, Math.max(0, Math.floor(v * im.h))), i = (y * im.w + x) * 4;
        return [im.d[i], im.d[i + 1], im.d[i + 2]]; } };
    }
    const { verts, idx } = collect(g, tex, RAW_FACTOR.has(file));
    // bounds -> centre x/z, base y=0, scale so height = 1
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (const v of verts) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], v.p[i]); mx[i] = Math.max(mx[i], v.p[i]); }
    const H = mx[1] - mn[1], cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2;
    const w = (mx[0] - mn[0]) / H, d = (mx[2] - mn[2]) / H;
    const R = Math.max(w, d) / 2 * 1.0001 || 1; // quant range for x/z; y range 0..1 uses own scale
    const RY = 1;
    // quantise + weld
    const map = new Map(), P = [], N = [], C = [], I = [];
    const q = (v, r) => Math.max(-32767, Math.min(32767, Math.round(v / r * 32767)));
    const vid = (v) => {
      const px = q((v.p[0] - cx) / H, R), py = q((v.p[1] - mn[1]) / H * 2 - 1, RY), pz = q((v.p[2] - cz) / H, R);
      const nx = Math.round(v.n[0] * 127), ny = Math.round(v.n[1] * 127), nz = Math.round(v.n[2] * 127);
      const cr = Math.round(v.c[0]), cg = Math.round(v.c[1]), cb = Math.round(v.c[2]);
      const key = [px, py, pz, nx, ny, nz, cr, cg, cb].join(',');
      let id = map.get(key);
      if (id === undefined) { id = P.length / 3; map.set(key, id); P.push(px, py, pz); N.push(nx, ny, nz); C.push(cr, cg, cb); }
      return id;
    };
    for (let i = 0; i < idx.length; i += 3) {
      const a = vid(verts[idx[i]]), b = vid(verts[idx[i + 1]]), c = vid(verts[idx[i + 2]]);
      if (a !== b && b !== c && a !== c) I.push(a, b, c);
    }
    const b64 = (T, arr) => Buffer.from(new T(arr).buffer).toString('base64');
    const o = { pos: b64(Int16Array, P), nor: b64(Int8Array, N), col: b64(Uint8Array, C), idx: b64(Uint16Array, I),
      // h: aspect info. w,d = width/depth relative to height 1; r = x/z quantisation half-range; h0 = source height (source units)
      h: { w: +w.toFixed(4), d: +d.toFixed(4), r: +R.toFixed(5), h0: +H.toFixed(5), ink: INK[name] || 0.045, tris: I.length / 3, verts: P.length / 3 } };
    props[name] = o;
    const sz = o.pos.length + o.nor.length + o.col.length + o.idx.length; total += sz;
    report.push({ name, src: file, w: o.h.w, d: o.h.d, tris: o.h.tris, verts: o.h.verts, kb: +(sz / 1024).toFixed(1) });
  }
  await browser.close();

  const runtime = `
// Base Camp baked CC0 props. Generated by tools/bake-props.js: do not edit by hand.
// Decoder: bcPropGeometry(name) -> THREE.BufferGeometry (height 1, centred on x/z, base at y=0).
// bcPropMesh(name, opts) -> THREE.Group (toon mesh + optional inverted-hull ink outline).
(function (root) {
  var BC_PROPS = ${JSON.stringify(props)};
  function bcB64(s, T) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); }
  var bcGeoCache = {};
  function bcPropGeometry(name) {
    if (bcGeoCache[name]) return bcGeoCache[name];
    var p = BC_PROPS[name]; if (!p) throw new Error('bcPropGeometry: unknown prop ' + name);
    var q = bcB64(p.pos, Int16Array), n8 = bcB64(p.nor, Int8Array), c8 = bcB64(p.col, Uint8Array), ix = bcB64(p.idx, Uint16Array);
    var pos = new Float32Array(q.length), nor = new Float32Array(q.length), col = new Float32Array(q.length), r = p.h.r;
    for (var i = 0; i < q.length; i += 3) {
      pos[i] = q[i] / 32767 * r; pos[i + 1] = (q[i + 1] / 32767 + 1) / 2; pos[i + 2] = q[i + 2] / 32767 * r;
      nor[i] = n8[i] / 127; nor[i + 1] = n8[i + 1] / 127; nor[i + 2] = n8[i + 2] / 127;
      col[i] = c8[i] / 255; col[i + 1] = c8[i + 1] / 255; col[i + 2] = c8[i + 2] / 255;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(ix, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    bcGeoCache[name] = g; return g;
  }
  var bcToonGrad = null;
  function bcGradient() {
    if (!bcToonGrad) {
      bcToonGrad = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.LuminanceFormat);
      bcToonGrad.minFilter = bcToonGrad.magFilter = THREE.NearestFilter; bcToonGrad.generateMipmaps = false; bcToonGrad.needsUpdate = true;
    }
    return bcToonGrad;
  }
  // opts: height (default 1), ink (default true), inkWidth (fraction, default per prop ~0.045), inkColor (default 0x1a1410),
  //       shading 'toon' | 'flat' | 'lambert' (default 'toon'), tint (THREE.Color multiplier)
  function bcPropMesh(name, opts) {
    opts = opts || {};
    var g = bcPropGeometry(name), h = opts.height == null ? 1 : opts.height, grp = new THREE.Group();
    var shading = opts.shading || 'toon', m;
    // DoubleSide: some pieces (leaves, can lids) are single-sheet geometry that must be visible from behind
    if (shading === 'flat') m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    else if (shading === 'lambert') m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    else m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: bcGradient(), side: THREE.DoubleSide });
    if (opts.tint) m.color.copy(opts.tint);
    var mesh = new THREE.Mesh(g, m); grp.add(mesh);
    if (opts.ink !== false) {
      var im = new THREE.MeshBasicMaterial({ color: opts.inkColor == null ? 0x1a1410 : opts.inkColor, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 });
      var s = 1 + (opts.inkWidth == null ? BC_PROPS[name].h.ink : opts.inkWidth), ink = new THREE.Mesh(g, im);
      ink.scale.set(s, s, s); ink.position.y = 0.5 - 0.5 * s; // scale about the vertical centre so the base stays on the ground
      ink.renderOrder = -1; grp.add(ink); grp.userData.ink = ink;
    }
    grp.scale.setScalar(h);
    grp.userData.prop = name; grp.userData.aspect = BC_PROPS[name].h;
    return grp;
  }
  root.BC_PROPS = BC_PROPS; root.bcPropGeometry = bcPropGeometry; root.bcPropMesh = bcPropMesh;
})(typeof window !== 'undefined' ? window : this);
`;
  fs.writeFileSync(OUT, runtime);
  console.table(report);
  console.log('payload KB', (total / 1024).toFixed(1), 'file KB', (fs.statSync(OUT).size / 1024).toFixed(1));
}
main().catch(e => { console.error(e); process.exit(1); });
