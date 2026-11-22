/* The shared island world for the second showcase: ONE builder, four looks.
   Reads ../island.json (the seeded island from the first showcase, unchanged) and builds terrain, trees, rocks, camp and settlers from the shared kit (kit.js, people_kit.js).
   Styles never rebuild the world; they only convert materials / post-process / re-draw it. Deterministic: no Math.random anywhere. */
(function (root) {
  'use strict';
  const W = { J: null, N: 256, SIZE: 320, detail: 1 };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const hash = (a, b, c) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const fade = t => t * t * (3 - 2 * t);
  function vnoise(x, z, s) { const ix = Math.floor(x), iz = Math.floor(z), fx = fade(x - ix), fz = fade(z - iz); const a = hash(ix, iz, s), b = hash(ix + 1, iz, s), c = hash(ix, iz + 1, s), d = hash(ix + 1, iz + 1, s); return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz; }
  function fbm(x, z, s, o) { let a = .5, f = 1, sum = 0, n = 0; for (let i = 0; i < o; i++) { sum += a * vnoise(x * f, z * f, s + i * 17); n += a; a *= .5; f *= 2.03; } return sum / n; }
  W.noise = { hash, vnoise, fbm };
  W.load = async function (opts) {
    opts = opts || {}; W.J = await (await fetch('../island.json')).json(); W.H = Float32Array.from(W.J.heights_cm, v => v / 100);
    await Kit.load('assets/'); if (opts.water !== false) { const im = new Image(); im.src = '../water.png'; await im.decode(); W.waterImg = im; }
    const a = W.J.sun.az * Math.PI / 180, e = W.J.sun.el * Math.PI / 180; W.sunDir = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
    return W;
  };
  /* bilinear height in metres at world x,z (matches heightmap.sample) */
  W.h = function (x, z) { const N = W.N, S = W.SIZE; let j = (x + S / 2) / S * N - .5, i = (z + S / 2) / S * N - .5; j = clamp(j, 0, N - 1.001); i = clamp(i, 0, N - 1.001); const i0 = i | 0, j0 = j | 0, u = j - j0, v = i - i0, H = W.H; return (H[i0 * N + j0] * (1 - u) + H[i0 * N + j0 + 1] * u) * (1 - v) + (H[(i0 + 1) * N + j0] * (1 - u) + H[(i0 + 1) * N + j0 + 1] * u) * v; };
  W.slope = (x, z) => { const gx = (W.h(x + 1.25, z) - W.h(x - 1.25, z)) / 2.5, gz = (W.h(x, z + 1.25) - W.h(x, z - 1.25)) / 2.5; return Math.hypot(gx, gz); };
  /* ground albedo for any world point: sRGB 0..1 array. Port of scene2d.py's material rules (beach sand, grass, heath, banded rock, kelp floor). */
  const C = { sand: [.80, .64, .42], wet: [.52, .40, .27], grass: [.30, .43, .15], grass2: [.42, .48, .18], heath: [.40, .24, .31], heath2: [.30, .27, .14], rock: [.30, .27, .26], rock2: [.52, .40, .32], floor: [.18, .26, .22] };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  W.albedo = function (x, z) {
    const G = W.h(x, z), sl = W.slope(x, z), nn = fbm(x * .09, z * .09, 5, 3) - .5, nm = fbm(x * .03, z * .03, 9, 2) - .5, nf = vnoise(x * 1.7, z * 1.7, 3) - .5;
    const bd = Math.hypot((x - 4) / 1.5, z - 60), bw = Math.pow(clamp(1 - bd / 52, 0, 1), 1.3);
    const hmix = clamp((G - 6) / 8 + nn * 1.2, 0, 1);
    let a = mix(mix(C.grass, C.grass2, nn + .5), mix(C.heath2, C.heath, clamp(nm + .6, 0, 1)), hmix);
    const band = .5 + .5 * Math.sin(G * 3.1 + nn * 6);
    const rcol = mix(C.rock2, C.rock, band);
    const rw = clamp(clamp((sl - .55) * 3, 0, 1) + clamp(1 - (G - .2) * (G - .2) / 3.5, 0, 1) * (1 - bw) * .8 + nn * .6, 0, 1);
    a = mix(a, rcol, rw);
    let sw = clamp(clamp(bw * (G < 3.2 ? 1 : 0) * clamp(1 - sl * 1.2, 0, 1) * 1.4, 0, 1), 0, 1);
    let sd = mix(C.sand, [C.sand[0] * .82, C.sand[1] * .82, C.sand[2] * .82], clamp(.3 + nm * 1.5, 0, 1)); sd = mix(sd, C.wet, clamp((.45 - G) / .5, 0, 1));
    a = mix(a, sd, sw);
    if (G < 0) a = mix(a, C.floor, clamp(-G / 5, 0, 1));
    const k = 1 + nf * .16 * W.detail; return [a[0] * k, a[1] * k, a[2] * k];
  };
  /* terrain: full 256x256 grid, albedo as a 1024 texture (grade(rgb)->rgb lets a style restyle the palette) */
  W.terrain = function (grade, texSize) {
    const N = W.N, S = W.SIZE, step = S / N, pos = new Float32Array(N * N * 3), uv = new Float32Array(N * N * 2);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const k = i * N + j; pos[k * 3] = -S / 2 + (j + .5) * step; pos[k * 3 + 1] = W.H[k]; pos[k * 3 + 2] = -S / 2 + (i + .5) * step; uv[k * 2] = (j + .5) / N; uv[k * 2 + 1] = (i + .5) / N; }
    const idx = []; for (let i = 0; i < N - 1; i++) for (let j = 0; j < N - 1; j++) { const a = i * N + j, b = a + 1, c = a + N, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const T = texSize || 1024, cv = document.createElement('canvas'); cv.width = cv.height = T; const cx = cv.getContext('2d'), im = cx.createImageData(T, T);
    for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) { const x = -S / 2 + (px + .5) / T * S, z = -S / 2 + (py + .5) / T * S; let c = W.albedo(x, z); if (grade) c = grade(c, x, z); const o = (py * T + px) * 4; im.data[o] = clamp(c[0], 0, 1) * 255; im.data[o + 1] = clamp(c[1], 0, 1) * 255; im.data[o + 2] = clamp(c[2], 0, 1) * 255; im.data[o + 3] = 255; }
    cx.putImageData(im, 0, 0); const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.flipY = false;
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: tex })); m.receiveShadow = true; m.castShadow = true; m.name = 'terrain'; m.userData.albedoCanvas = cv; return m;
  };
  /* ---------------- props ---------------- */
  const place = (g, x, z, h, ry, sink) => { g.scale.setScalar(h); g.position.set(x, W.h(x, z) - (sink || 0) * h, z); g.rotation.y = ry || 0; return g; };
  W.layout = function () {
    if (W.L) return W.L; const J = W.J, R = Kit.mulberry(J.seed + 99), L = { conifers: [], broad: [], bushes: [], rocks: [], tents: [], boat: null, fire: null, people: [] };
    J.conifers.forEach((c, i) => L.conifers.push({ x: c.x, z: c.z, h: c.h, k: i % 3, ry: R() * 6.28 }));
    /* dressing (seeded, added on top of the shared 34 conifers so the island reads as a mixed wood): broadleaf on the lower slopes, bushes in the fringe */
    const taken = L.conifers.map(c => [c.x, c.z]); const near = (x, z, d) => taken.some(p => Math.hypot(p[0] - x, p[1] - z) < d);
    for (let t = 0; t < 9000 && L.broad.length < 46; t++) { const x = -95 + R() * 190, z = -85 + R() * 150, y = W.h(x, z); if (y > 2.2 && y < 9.5 && W.slope(x, z) < .8 && Math.hypot(x - 4, z - 55) > 20 && !near(x, z, 6)) { L.broad.push({ x, z, h: 4.2 + R() * 2.6, k: L.broad.length % 3, ry: R() * 6.28 }); taken.push([x, z]); } }
    for (let t = 0; t < 12000 && L.bushes.length < 90; t++) { const x = -100 + R() * 200, z = -90 + R() * 160, y = W.h(x, z); if (y > 1.4 && y < 6 && Math.hypot(x - 4, z - 55) > 9 && !near(x, z, 2.5)) { L.bushes.push({ x, z, h: .9 + R() * 1.0, ry: R() * 6.28 }); taken.push([x, z]); } }
    J.rocks.forEach((r, i) => L.rocks.push({ x: r.x, z: r.z, h: .5 * r.s + .25, k: (hash(i, 3, 1) * 6) | 0, ry: R() * 6.28 }));
    L.tents = J.camp.tents.map(t => ({ x: t.x, z: t.z, rot: t.rot, color: t.color })); L.boat = J.camp.boat; L.fire = J.camp.fire;
    /* three settlers: woman by the fire, man with the mallet by the orange tent, fisher with the rope by the boat */
    L.people = [{ key: 'woman', x: 7.4, z: 57.2, ry: -2.2 }, { key: 'man', x: -3.6, z: 50.6, ry: 2.6 }, { key: 'fish', x: -9.4, z: 61.6, ry: 1.2 }];
    return W.L = L;
  };
  /* returns {root, groups:{trees, bushes, rocks, camp, people}}; wires the same props for every style */
  W.props = function (opt) {
    opt = opt || {}; const L = W.layout(), root = new THREE.Group(), g = { trees: new THREE.Group(), bushes: new THREE.Group(), rocks: new THREE.Group(), camp: new THREE.Group(), people: new THREE.Group() };
    for (const k in g) { g[k].name = k; root.add(g[k]); }
    const tree = (c, mk) => { const t = mk(); place(t, c.x, c.z, c.h, c.ry, .02); const j = Kit.mulberry((c.x * 100 + c.z * 7) | 0), tint = [.9 + .2 * j(), .92 + .16 * j(), .88 + .2 * j()];
      t.traverse(o => { if (o.isMesh && o.material.alphaTest > 0) { o.material = o.material.clone(); o.material.color.setRGB(tint[0], tint[1], tint[2]); } }); g.trees.add(t); };
    L.conifers.forEach(c => tree(c, () => opt.procedural ? Kit.procConifer(c.k + 1) : Kit.conifer(c.k)));
    L.broad.forEach(c => tree(c, () => opt.procedural ? Kit.procBroadleaf(c.k + 3) : Kit.broadleaf(c.k)));
    L.bushes.forEach(c => { const b = Kit.bush(); place(b, c.x, c.z, c.h, c.ry, .05); g.bushes.add(b); });
    L.rocks.forEach(c => { const r = Kit.rock(c.k); place(r, c.x, c.z, c.h * ([1.4, 1.4, 1.4, .9, 1.1, .7][c.k % 6]), c.ry, .1); g.rocks.add(r); });
    L.tents.forEach(t => { const m = Kit.tent(t.color); place(m, t.x, t.z, 2.5, -t.rot * Math.PI / 180, 0); g.camp.add(m); });
    { const b = L.boat, m = Kit.canoe(); place(m, b.x, b.z, 4.2, -b.rot * Math.PI / 180, -.02); m.position.y += .1; g.camp.add(m); }
    { const f = L.fire, m = Kit.campfire(); place(m, f.x, f.z, 1.5, .5, 0); g.camp.add(m); const fl = new THREE.Group(); fl.name = 'flame'; fl.position.set(f.x, f.y + .1, f.z);
      [[.30, .95, 0xff8a1e], [.22, 1.25, 0xffb02e], [.12, 1.55, 0xffe27a]].forEach(([r, h, c], i) => { const cn = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), new THREE.MeshBasicMaterial({ color: c })); cn.position.y = h / 2 + .1; cn.rotation.y = i; fl.add(cn); }); g.camp.add(fl); }
    L.people.forEach(p => { const r = PeopleKit.make(p.key, .4); const o = r.root; o.position.set(p.x, W.h(p.x, p.z), p.z); o.rotation.y = p.ry; o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); g.people.add(o); });
    return { root, groups: g };
  };
  /* sky dome (gradient + sun glow); params let a style recolour it */
  W.sky = function (p) {
    p = p || {}; const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uSun: { value: W.sunDir }, uZen: { value: new THREE.Vector3(...(p.zen || [.10, .22, .52])) }, uHor: { value: new THREE.Vector3(...(p.hor || [.82, .68, .62])) }, uBand: { value: p.band || 0 }, uGlow: { value: p.glow === undefined ? 1 : p.glow } },
      vertexShader: 'varying vec3 vd;void main(){vd=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec3 vd;uniform vec3 uSun,uZen,uHor;uniform float uBand,uGlow;void main(){vec3 d=normalize(vd);float y=clamp(d.y,0.,1.);float k=1.-pow(1.-y,2.6);if(uBand>0.)k=floor(k*uBand+.5)/uBand;vec3 c=mix(uHor,uZen,k);float s=clamp(dot(d,uSun),0.,1.);
        if(uBand>0.){float b=floor(clamp(1.-pow(1.-y,2.6),0.,.999)*5.);c=b<1.?vec3(.99,.86,.66):b<2.?vec3(.84,.90,.90):b<3.?vec3(.60,.82,.95):b<4.?vec3(.38,.70,.95):vec3(.26,.57,.92);c=mix(c,vec3(1.,.95,.72),step(.9988,s)*uGlow);}else c+=vec3(1.,.6,.3)*(pow(s,8.)*.35+pow(s,80.)*.9+pow(s,1500.)*20.)*uGlow;gl_FragColor=vec4(c,1.);}` });
    return new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), m);
  };
  /* water plane: shared vertex stage + depth/shore lookup from water.png; the fragment shader is supplied by the style */
  W.water = function (frag, extra) {
    const wt = new THREE.Texture(W.waterImg); wt.needsUpdate = true; wt.minFilter = wt.magFilter = THREE.LinearFilter; wt.generateMipmaps = false; wt.flipY = false;
    const u = Object.assign({ uW: { value: wt }, uSun: { value: W.sunDir }, uBox: { value: new THREE.Vector4(-112, -100, 224, 212) }, uTime: { value: 3 } }, extra || {});
    const m = new THREE.ShaderMaterial({ transparent: true, fog: false, uniforms: u, vertexShader: 'varying vec3 wp;void main(){vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}', fragmentShader: frag });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), m); mesh.rotation.x = -Math.PI / 2; mesh.position.y = -.02; mesh.renderOrder = 2; return mesh;
  };
  W.CAMERA = { pos: [36, 15, 106], target: [-1, 3.5, 59], fov: 36 };   /* second-showcase camera: same for all four styles, tighter than the first showcase so trees and settlers read */
  W.camera = function (aspect) { const c = W.CAMERA, cam = new THREE.PerspectiveCamera(c.fov, aspect, 2, 1500); cam.position.set(...c.pos); cam.lookAt(...c.target); return cam; };
  /* the standard light rig (warm low sun from behind the island, cool sky, camera-side fill); style may scale it */
  W.lights = function (scene, o) {
    o = o || {}; scene.add(new THREE.HemisphereLight(new THREE.Color(.45, .58, .95), new THREE.Color(.55, .38, .24), o.hemi === undefined ? 1.2 : o.hemi));
    const sun = new THREE.DirectionalLight(new THREE.Color(1.0, .66, .36), o.sun === undefined ? 2.0 : o.sun), tgt = new THREE.Vector3(0, 0, 55); sun.position.copy(tgt).addScaledVector(W.sunDir, 260); sun.target.position.copy(tgt); scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(new THREE.Color(.95, .78, .62), o.fill === undefined ? .7 : o.fill); fill.position.set(80, 60, 160); scene.add(fill);
    sun.castShadow = true; sun.shadow.mapSize.set(o.shadow || 4096, o.shadow || 4096); const s = sun.shadow.camera; s.left = -100; s.right = 100; s.top = 100; s.bottom = -100; s.near = 20; s.far = 600; sun.shadow.bias = -.0004; sun.shadow.normalBias = .06; return { sun, fill };
  };
  /* material converter: every mesh under root gets mat = fn(oldMaterial, mesh); results are cached per source material */
  W.convert = function (root, fn) { const cache = new Map(); root.traverse(o => { if (!o.isMesh) return; const old = o.material; const key = old; if (!cache.has(key)) cache.set(key, fn(old, o)); o.material = cache.get(key); }); };
  W.fireLight = function (scene) { const f = W.J.camp.fire, l = new THREE.PointLight(0xff8a30, 2.4, 22, 1.6); l.position.set(f.x, f.y + 1.4, f.z); scene.add(l); return l; };
  W.renderer = function (w, h, extra) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; document.body.appendChild(cv); const r = new THREE.WebGLRenderer(Object.assign({ canvas: cv, antialias: true, preserveDrawingBuffer: true }, extra || {})); r.setPixelRatio(1); r.setSize(w, h, false); r.outputEncoding = THREE.sRGBEncoding; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; return r; };
  W.size = () => { const q = new URLSearchParams(location.search); return [+(q.get('w') || 1200), +(q.get('h') || 800)]; };
  root.World = W;
})(window);
