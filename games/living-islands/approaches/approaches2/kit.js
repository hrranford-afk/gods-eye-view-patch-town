/* Shared tree / rock / prop kit for the second styles showcase. three.js r128 global THREE + GLTFLoader (assets/GLTFLoader.js) required.
   Real models: Quaternius Stylized Nature MegaKit (CC0) and Kenney Nature Kit (CC0). Procedural: conifer + broadleaf generators below.
   Everything is deterministic (seeded). Every prototype is normalised: base on y=0, height 1 unit, trunk axis at x=z=0. */
(function (root) {
  'use strict';
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const Kit = { src: {}, mulberry };
  const FILES = ['Pine_1', 'Pine_3', 'Pine_5', 'CommonTree_1', 'CommonTree_3', 'TwistedTree_2', 'Bush_Common', 'Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3'];
  const GLBS = ['rock_largeA', 'rock_tallA', 'rock_smallB', 'tent_smallOpen', 'canoe', 'campfire_logs', 'log'];
  Kit.load = async function (base) {
    base = base || 'assets/'; const L = new THREE.GLTFLoader();
    const get = (u) => new Promise((res, rej) => L.load(base + u, g => res(g.scene), undefined, rej));
    for (const n of FILES) Kit.src[n] = await get(n + '.gltf');
    for (const n of GLBS) Kit.src[n] = await get(n + '.glb');
    const C = c => new THREE.Color().setRGB(c[0], c[1], c[2]).convertSRGBToLinear();
    /* Kenney glTF colour factors are authored far brighter than the pack's own previews: re-colour by material name with a muted island palette */
    const KP = { colorRed: [.80, .42, .20], colorRedDark: [.62, .31, .15], wood: [.47, .32, .20], dirt: [.43, .39, .35], grass: [.33, .42, .24], leafsFall: [.63, .44, .26], leafsGreen: [.30, .45, .22], stone: [.46, .45, .43], stoneDark: [.34, .33, .32], metal: [.4, .4, .4], woodBark: [.35, .25, .17], woodDark: [.25, .17, .11], woodInner: [.60, .45, .30], bark: [.33, .23, .15] };
    for (const k in Kit.src) Kit.src[k].traverse(o => { if (o.isMesh && !o.material.map && KP[o.material.name]) { o.material = new THREE.MeshStandardMaterial({ color: C(KP[o.material.name]), roughness: 1, metalness: 0, name: o.material.name }); } });
    for (const k in Kit.src) Kit.src[k].traverse(o => { if (o.isMesh) { const m = o.material; if (m.map) { m.map.encoding = THREE.sRGBEncoding; m.map.anisotropy = 4; } m.metalness = 0; m.roughness = 1; if (m.alphaMode === 'MASK' || (m.map && /Leaf|Leaves/.test(m.map.image && m.map.image.src || ''))) { m.alphaTest = .45; m.transparent = false; m.side = THREE.DoubleSide; } o.castShadow = true; o.receiveShadow = true; } });
    return Kit;
  };
  /* clone a source model normalised to height 1, base at y 0, centred on its bounding box in xz (tents/boats keep their centre) */
  Kit.norm = function (name, opt) {
    opt = opt || {}; const src = Kit.src[name]; const g = new THREE.Group(); const c = src.clone(true); g.add(c);
    const bb = new THREE.Box3().setFromObject(c); const s = (opt.len ? 1 / Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) : 1 / (bb.max.y - bb.min.y));
    c.scale.setScalar(s); c.updateMatrixWorld(true); const b2 = new THREE.Box3().setFromObject(c);
    c.position.set(-(b2.min.x + b2.max.x) / 2, -b2.min.y, -(b2.min.z + b2.max.z) / 2); g.userData.aspect = (b2.max.x - b2.min.x) / (b2.max.y - b2.min.y);
    return g;
  };
  /* ---------------- procedural vertex-coloured geometry helpers ---------------- */
  const lin = c => c.map(v => Math.pow(v, 2.2));
  function paint(geo, fn) { const p = geo.attributes.position, n = p.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const c = fn(p.getX(i), p.getY(i), p.getZ(i), i); a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; }
  function merge(list) { let n = 0; list.forEach(g => n += g.attributes.position.count); const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0; list.forEach(g => { P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }); const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3)); out.setAttribute('color', new THREE.BufferAttribute(C, 3)); return out; }
  const MATV = new THREE.MeshLambertMaterial({ vertexColors: true });
  /* conifer: tapered trunk + 8..11 whorls of irregular drooping boughs, each bough a flattened, bent cone; colour darkens inward and downward, lightens at tips */
  Kit.procConifer = function (seed, o) {
    o = o || {}; const R = mulberry(seed * 7919 + 13), tiers = 12 + Math.floor(R() * 3), H = 1; const parts = [];
    const bark = [.30, .21, .14], g0 = o.green || [.07, .24, .12], g1 = o.tip || [.26, .46, .19];
    const tr = new THREE.CylinderGeometry(.012, .035, H * .8, 7, 4); tr.translate(0, H * .4, 0);
    parts.push(paint(tr.toNonIndexed(), () => lin(bark.map(v => v * (.8 + .4 * R())))));
    /* dark inner core so the crown never shows sky through the boughs */
    const core = new THREE.ConeGeometry(.15, .8, 9, 1, true); core.translate(0, .52, 0); parts.push(paint(core.toNonIndexed(), (x, y) => lin(g0.map(v => v * .55))));
    for (let t = 0; t < tiers; t++) {
      const u = t / (tiers - 1), y = .10 + Math.pow(u, .92) * .86, rad = (.32 * (1 - u * .94) + .025) * (.9 + .2 * R()), nb = Math.max(4, Math.round(10 - u * 5 + R() * 2)), a0 = R() * 6.28;
      for (let b = 0; b < nb; b++) {
        const a = a0 + b / nb * 6.2832 + (R() - .5) * .45, len = rad * (.8 + .45 * R()), w = len * (.40 + .15 * R());
        const geo = new THREE.ConeGeometry(w, len, 6, 4, true); geo.rotateZ(-Math.PI / 2); geo.translate(len / 2, 0, 0);   /* points along +x */
        const dr = .30 + .12 * R(), pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) / len, ph = b * 1.7 + t; pos.setY(i, pos.getY(i) * .5 - x * x * len * dr + Math.sin(x * 14 + ph) * w * .10); pos.setZ(i, pos.getZ(i) * (1 + .3 * Math.sin(x * 9 + b)) + Math.sin(x * 11 + ph * 2) * w * .12); }
        geo.rotateY(-a); geo.translate(0, y + (R() - .5) * .02, 0);
        const sh = .75 + .5 * R(), dk = .5 + .5 * u;
        parts.push(paint(geo.toNonIndexed(), (x, yy, z) => { const r = Math.hypot(x, z) / (.34); const k = Math.min(1, r) * .8 + .1; return lin([0, 1, 2].map(i => (g0[i] * (1 - k) + g1[i] * k) * sh * (.6 + .55 * dk))); }));
      }
    }
    const geo = merge(parts); const m = new THREE.Mesh(geo, MATV.clone()); m.material.side = THREE.DoubleSide; m.castShadow = m.receiveShadow = true; const g = new THREE.Group(); g.add(m); return g;
  };
  /* broadleaf: trunk with three limbs, canopy of 9..13 displaced blob clusters, lit top / dark underside colour ramp */
  Kit.procBroadleaf = function (seed, o) {
    o = o || {}; const R = mulberry(seed * 104729 + 7), parts = [], bark = [.34, .24, .16], g0 = o.green || [.16, .34, .12], g1 = o.tip || [.46, .60, .20];
    const tr = new THREE.CylinderGeometry(.02, .05, .5, 7, 3); tr.translate(0, .25, 0);
    parts.push(paint(tr.toNonIndexed(), () => lin(bark.map(v => v * (.8 + .4 * R())))));
    const nl = 3 + Math.floor(R() * 2), blobs = 10 + Math.floor(R() * 5);
    for (let l = 0; l < nl; l++) { const a = R() * 6.28 + l * 2.1, e = .5 + R() * .4; const lb = new THREE.CylinderGeometry(.008, .02, .3, 5, 1); lb.translate(0, .15, 0); lb.rotateZ(e); lb.rotateY(a); lb.translate(0, .38, 0); parts.push(paint(lb.toNonIndexed(), () => lin(bark.map(v => v * .85)))); }
    for (let b = 0; b < blobs; b++) {
      const a = R() * 6.28, rr = Math.sqrt(R()) * .28, cx = Math.cos(a) * rr, cz = Math.sin(a) * rr, cy = .62 + (1 - rr / .28) * .2 + R() * .16, s = .15 + .08 * R() + (1 - rr / .28) * .05;
      const geo = new THREE.IcosahedronGeometry(1, 2); const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = 1 + .22 * Math.sin(x * 5 + b) * Math.cos(z * 4 + b * 2) + .12 * Math.sin(y * 7 + b * 3) + .1 * (R() - .5); p.setXYZ(i, x * d * s, y * d * s * .8, z * d * s); }
      geo.translate(cx, cy, cz); geo.computeVertexNormals(); const sh = .8 + .35 * R(); const ng = geo.toNonIndexed(); ng.computeVertexNormals();
      parts.push(paint(ng, (x, y, z) => { const k = Math.min(1, Math.max(0, (y - .45) / .5)); const sun = Math.min(1, Math.max(0, (cx * .3 + x * .5 + z * .2) / .3 * .5 + .5)); return lin([0, 1, 2].map(i => (g0[i] * (1 - k) + g1[i] * k) * sh * (.7 + .4 * sun))); }));
    }
    const geo = merge(parts); const m = new THREE.Mesh(geo, MATV.clone()); m.castShadow = m.receiveShadow = true; const g = new THREE.Group(); g.add(m); return g;
  };
  /* the OLD tree, for the honest comparison: a plain stack of cones, as in the first showcase */
  Kit.oldCone = function () { const g = new THREE.Group(); const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(0x1f5a2e).convertSRGBToLinear() }); for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(.3 - i * .07, .45, 8), m); c.position.y = .38 + i * .22; g.add(c); } const t = new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, .2, 6), new THREE.MeshLambertMaterial({ color: new THREE.Color(0x4b3523).convertSRGBToLinear() })); t.position.y = .1; g.add(t); return g; };
  /* ---------------- named kit lookups used by every style ---------------- */
  Kit.conifer = i => Kit.norm(['Pine_1', 'Pine_3', 'Pine_5'][i % 3]);
  Kit.broadleaf = i => Kit.norm(['CommonTree_1', 'CommonTree_3', 'TwistedTree_2'][i % 3]);
  Kit.bush = () => Kit.norm('Bush_Common');
  Kit.rock = i => Kit.norm(['Rock_Medium_1', 'Rock_Medium_2', 'Rock_Medium_3', 'rock_largeA', 'rock_tallA', 'rock_smallB'][i % 6]);
  Kit.tent = (col) => { const g = Kit.norm('tent_smallOpen'); const T = { orange: [.86, .46, .18], blue: [.22, .40, .70] }[col || 'orange']; g.traverse(o => { if (o.isMesh && /^colorRed/.test(o.material.name)) { o.material = o.material.clone(); const k = o.material.name === 'colorRed' ? 1 : .78; o.material.color.setRGB(T[0] * k, T[1] * k, T[2] * k).convertSRGBToLinear(); } }); return g; };
  Kit.canoe = () => Kit.norm('canoe', { len: true });
  Kit.campfire = () => Kit.norm('campfire_logs', { len: true });
  root.Kit = Kit;
})(window);
