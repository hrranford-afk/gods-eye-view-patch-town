/* Living Islands: the cutaway FINISH PASS (task 28, CUTAWAY_FINISH.md). Loaded by cutaway.html only with ?finish=1 (classic script, sets window.LI_CUTFIN).
   Absent the switch cutaway.html is byte for byte what it was. What this adds, and where each piece comes from (nothing below is a private copy of a stack function):
     land light     Blender-baked sky GI + AO (blender/bake_volcano.py) as lightMap on uv2, sun visibility mask, sun = DirectionalLight S/pi: LI_BRIDGE.makeBridgeLandMaterial (blender/li_bridge.js)
     tone           the 65-entry Filmic table fitted in the bake bridge (blender/assets/bridge/bridge.json) via LI_BRIDGE.installFilmicFit
     sea            LI_SEA.SEAF_FS (the ?flow=1 sea of islands_look.html) + LI_WEATHER.patchSea, a flow field, a depth/exposure texture of the heightfield
     weather        LI_WEATHER.create (weather.js): states, puffs, deck, rain, cloud shadows on sea and land, fog
     land colour    LI_SEA.LAND_WET_GLSL (grain, tide wetness, swash lace, caustics) + LI_WEATHER.patchLand
     trees, rocks   LI_KIT (li_kit.js): PB, addConifer, addBroad, addShrub, blob, placed from landform/volcano/maps.png (rock id, vegetation belt, exposure)
   Scale: the sea and weather code is written for the 200 m table (TS = 100, wavelengths of metres, clouds at 20 m). So everything finish draws lives in cutaway's real metres inside
   root, and root is scaled by K = 100 / 768 (the 1536 m block becomes the 200 m table the shaders know); the camera is placed in that scaled space (placeCamera). */
(function () {
'use strict';
const K = 100 / 768;
const TIDE_X = 4;                                   /* the tide slider is drawn 4x (the volcano is 237 m high: +-1.1 m would never show) */
const TAU = Math.PI * 2;
const FLOW_P = 55, FLOW_N = 64, U0 = 1.1, FLOW_BASE = 2;   /* the page's tide period (s), flow grid, stream speed (table m/s), whole cycles added so drift has spread */
let toneInstalled = false;

function create(env) {
  const { THREE, renderer, scene, camera, root, hemi: oldHemi, sun: oldSun, qs, POST, BASE, $, loadTex } = env;
  const SEAT = qs.get('seat') !== null ? parseFloat(qs.get('seat')) : null;
  const WTQ = qs.get('wt') !== null ? parseFloat(qs.get('wt')) : null;
  let LOW = (qs.get('q') || 'high').toLowerCase() === 'low';
  const F = { K, TIDE_X, info: {}, kit: { tris: 0, instances: 0, meshes: 0 }, cur: { tx: 0, tz: 0 } };
  const S = { tideR: 0, tex: {}, mats: {}, last: 0, flowT: -1, flowPh: 9, ready: false };
  const MIX = THREE.MathUtils;
  const kit = window.LI_KIT, sea = window.LI_SEA, bridge = window.LI_BRIDGE, WX = window.LI_WEATHER;

  /* ------------------------------------------------------------ renderer, root, lights (sync) */
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;          /* switches the chunk on; its body is the Filmic table once load() has run */
  renderer.toneMappingExposure = Math.pow(2, parseFloat(qs.get('exp') || '-0.8'));
  renderer.shadowMap.enabled = false;
  root.scale.setScalar(K);
  camera.near = 0.5; camera.far = 1500; camera.updateProjectionMatrix();
  scene.remove(oldHemi); scene.remove(oldSun);
  try { document.body.style.background = 'radial-gradient(ellipse at 50% 38%, var(--bg1), var(--bg2) 85%)'; } catch (e) { /* cosmetic */ }
  const sunL = new THREE.DirectionalLight(0xffffff, 1); scene.add(sunL); scene.add(sunL.target);
  const hemiL = new THREE.HemisphereLight(0xffffff, 0x888888, 1); scene.add(hemiL);
  const sunDir = new THREE.Vector3(0, 1, 0);
  const U = { uTide: { value: 0 }, uTideR: { value: 0 }, uTime: { value: 0 }, uGrain: { value: null }, uGrainAmt: { value: 0.55 }, uWet: { value: 1 }, uK: { value: K } };
  const baseSun = { i: 1, c: [1, 1, 1] }, baseHemi = { i: 1, c: [0.5, 0.7, 0.9], g: [0.1, 0.1, 0.1] };
  let WXR = null, seaMat = null, flow = null, heightTex = null;

  /* ------------------------------------------------------------ load: bake outputs, maps, tone table, noise textures */
  function hAtL(x, y) {                               /* bilinear heightfield, x east, y north (m); 0 outside (same as cutaway.html hAt) */
    const M = F.M, HF = F.HF, n = M.n, half = M.size_m / 2, d = M.cell_m, gx = (x + half) / d, gy = (y + half) / d;
    if (gx < 0 || gy < 0 || gx > n - 1 || gy > n - 1) return 0;
    const j = Math.min(Math.floor(gx), n - 2), i = Math.min(Math.floor(gy), n - 2), fx = gx - j, fy = gy - i;
    return (HF[i * n + j] * (1 - fx) + HF[i * n + j + 1] * fx) * (1 - fy) + (HF[(i + 1) * n + j] * (1 - fx) + HF[(i + 1) * n + j + 1] * fx) * fy;
  }
  F.load = async function (M, HF) {
    F.M = M; F.HF = HF;
    const J = u => fetch(u).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
    const bridgeUrl = qs.get('bridge') || BASE + '../../blender/assets/bridge/bridge.json';
    const [fin, br] = await Promise.all([J(BASE + 'finish/finish.json'), J(bridgeUrl)]);
    S.fin = fin; S.br = br;
    const loadImg = u => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image ' + u)); im.src = u; });
    const px = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height); };
    const [lightImg, maskImg, mapsImg] = await Promise.all([loadImg(BASE + 'finish/' + fin.files.lightmap), loadImg(BASE + 'finish/' + fin.files.sunmask), loadImg(BASE + 'maps.png')]);
    const mk = (im, srgb) => { const t = new THREE.Texture(im); t.flipY = false; t.encoding = srgb ? THREE.sRGBEncoding : THREE.LinearEncoding; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true; return t; };
    S.tex.light = mk(lightImg, true); S.tex.mask = mk(maskImg, false);
    S.lightPx = px(lightImg); S.maskPx = px(maskImg); S.mapsPx = px(mapsImg);
    S.tex.grain = sea.makeGrain(100); S.tex.seaN = sea.makeSeaNormal(100); S.tex.flowK = sea.makeFlowNoise(100); U.uGrain.value = S.tex.grain;
    if (!toneInstalled) { bridge.installFilmicFit(br.tone); toneInstalled = true; }
    /* lights from the bake: S/pi sun (same colour and strength the Cycles scene used), sky colours from the panorama */
    sunDir.set(...fin.sun_dir_three).normalize();
    baseSun.i = fin.sun_strength_w_m2 / Math.PI; baseSun.c = fin.sun_color_linear.slice();
    baseHemi.c = fin.sky_up.slice(); baseHemi.g = fin.ground.slice();
    sunL.position.copy(sunDir).multiplyScalar(500); sunL.target.position.set(0, 0, 0); sunL.intensity = baseSun.i; sunL.color.setRGB(...baseSun.c);
    hemiL.color.setRGB(...baseHemi.c); hemiL.groundColor.setRGB(...baseHemi.g); hemiL.intensity = 1;
    buildHeightTex(); buildFlow();
    initWeather();
    S.ready = true;
  };

  /* ------------------------------------------------------------ the sea's height/exposure texture (the page's uH): R = (th + 5) / 8, G exposure, B land height / 32, th = table-unit height with the deep sea compressed */
  function sampleMaps(x, y) {                       /* x east, y north (m) -> [rock, veg, exposure] of the cell */
    const n = F.M.n, d = F.M.cell_m, half = F.M.size_m / 2;
    const j = Math.min(n - 1, Math.max(0, Math.round((x + half) / d))), i = Math.min(n - 1, Math.max(0, Math.round((y + half) / d))), o = ((n - 1 - i) * n + j) * 4, p = S.mapsPx.data;
    return [p[o], p[o + 1], p[o + 2] / 255];
  }
  function thEnc(h) { return h > 0 ? Math.min(K * h, 3) : -5 * (1 - Math.exp(K * h / 5)); }
  function buildHeightTex() {
    const GN = 256, d = new Uint8Array(GN * GN * 4), half = F.M.size_m / 2, c = (F.M.size_m) / GN;
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) {
      const x = -half + (i + 0.5) * c, y = half - (j + 0.5) * c;           /* texture row j <-> world z = -y (north is -z) */
      const h = hAtL(x, y), th = thEnc(h), ex = sampleMaps(x, y)[2], k = (j * GN + i) * 4;
      d[k] = MIX.clamp(Math.round((th + 5) / 8 * 255), 0, 255); d[k + 1] = MIX.clamp(Math.round(Math.min(1, ex * 1.3) * 255), 0, 255);
      d[k + 2] = MIX.clamp(Math.round(Math.max(h, 0) * K / 32 * 255), 0, 255); d[k + 3] = 255;
    }
    heightTex = new THREE.DataTexture(d, GN, GN, THREE.RGBAFormat); heightTex.minFilter = heightTex.magFilter = THREE.LinearFilter; heightTex.generateMipmaps = false; heightTex.needsUpdate = true;
    S.tex.height = heightTex;
  }

  /* ------------------------------------------------------------ flow: the page's family of fields (tidal stream along one axis, flow around the land, shallow slowdown),
     here from a distance transform of the heightfield's coast instead of the page's per-island doublets. Encoded by LI_SEA.flowEncode (shared with the page). */
  function buildFlow() {
    const CN = 129, half = F.M.size_m / 2, c = F.M.size_m / (CN - 1), land = new Uint8Array(CN * CN);
    for (let j = 0; j < CN; j++) for (let i = 0; i < CN; i++) land[j * CN + i] = hAtL(-half + i * c, -half + j * c) > 0.3 ? 1 : 0;
    const D = new Float32Array(CN * CN).fill(1e9);                       /* distance (cells) to the nearest land cell, sea cells only */
    for (let k = 0; k < CN * CN; k++) if (land[k]) D[k] = 0;
    const r2 = Math.SQRT2;
    for (let j = 0; j < CN; j++) for (let i = 0; i < CN; i++) { let v = D[j * CN + i]; if (i > 0) v = Math.min(v, D[j * CN + i - 1] + 1); if (j > 0) { v = Math.min(v, D[(j - 1) * CN + i] + 1); if (i > 0) v = Math.min(v, D[(j - 1) * CN + i - 1] + r2); if (i < CN - 1) v = Math.min(v, D[(j - 1) * CN + i + 1] + r2); } D[j * CN + i] = v; }
    for (let j = CN - 1; j >= 0; j--) for (let i = CN - 1; i >= 0; i--) { let v = D[j * CN + i]; if (i < CN - 1) v = Math.min(v, D[j * CN + i + 1] + 1); if (j < CN - 1) { v = Math.min(v, D[(j + 1) * CN + i] + 1); if (i < CN - 1) v = Math.min(v, D[(j + 1) * CN + i + 1] + r2); if (i > 0) v = Math.min(v, D[(j + 1) * CN + i - 1] + r2); } D[j * CN + i] = v; }
    /* box-blur twice so the outward normal is smooth */
    let A = D.slice(); const B2 = new Float32Array(CN * CN);
    for (let pass = 0; pass < 3; pass++) { for (let j = 0; j < CN; j++) for (let i = 0; i < CN; i++) { let s = 0, m = 0; for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const ii = Math.min(CN - 1, Math.max(0, i + di)), jj = Math.min(CN - 1, Math.max(0, j + dj)); s += A[jj * CN + ii]; m++; } B2[j * CN + i] = s / m; } A.set(B2); }
    S.coast = { CN, c, D, A, land };
    const axis = 0.5;                                                    /* tide axis (rad, table x toward z): TUNING, like the page's seeded axis */
    const ex = Math.cos(axis), ez = Math.sin(axis), Dw = 14;             /* coast wrap width (cells, 170 m) */
    flow = { tex: null, data: new Uint8Array(FLOW_N * FLOW_N * 4), U: new Float32Array(FLOW_N * FLOW_N * 2), cell: 200 / FLOW_N, axis };
    for (let i = 0; i < FLOW_N * FLOW_N; i++) { flow.data[i * 4] = flow.data[i * 4 + 1] = flow.data[i * 4 + 2] = flow.data[i * 4 + 3] = 128; }
    flow.tex = new THREE.DataTexture(flow.data, FLOW_N, FLOW_N, THREE.RGBAFormat); flow.tex.minFilter = flow.tex.magFilter = THREE.LinearFilter; flow.tex.generateMipmaps = false; flow.tex.needsUpdate = true;
    /* base (unit amplitude) field on the 64 grid, table coordinates: x east, z south (z = -north) */
    const g = (arr, x, y) => { const fx = MIX.clamp((x + half) / c, 0, CN - 1.001), fy = MIX.clamp((y + half) / c, 0, CN - 1.001), i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
      return (arr[j * CN + i] * (1 - tx) + arr[j * CN + i + 1] * tx) * (1 - ty) + (arr[(j + 1) * CN + i] * (1 - tx) + arr[(j + 1) * CN + i + 1] * tx) * ty; };
    flow.base = new Float32Array(FLOW_N * FLOW_N * 2);
    for (let j = 0; j < FLOW_N; j++) for (let i = 0; i < FLOW_N; i++) {
      const xt = -100 + (i + 0.5) * flow.cell, zt = -100 + (j + 0.5) * flow.cell, x = xt / K, y = -zt / K;     /* real metres, y north */
      const d0 = g(A, x, y), dx = g(A, x + c, y) - g(A, x - c, y), dy = g(A, x, y + c) - g(A, x, y - c), nl = Math.hypot(dx, dy) || 1, nxr = dx / nl, nyr = dy / nl;   /* outward normal (away from land) in (x east, y north) */
      const nx = nxr, nz = -nyr, w = Math.exp(-d0 / Dw), en = ex * nx + ez * nz;
      let u = ex - w * nx * en, v = ez - w * nz * en;                    /* the stream turns tangent to the coast */
      const sp = 1 + 0.55 * w * (1 - Math.abs(en));                      /* and speeds up along it (headland and channel race) */
      const hh = hAtL(x, y), dep = -hh, sh = 0.3 + 0.7 * smooth(dep / 14);   /* shallow-water slowdown */
      const m = (hh > 0.3 ? 0 : 1) * sh * U0 * sp;
      flow.base[(j * FLOW_N + i) * 2] = u * m; flow.base[(j * FLOW_N + i) * 2 + 1] = v * m;
    }
  }
  function smooth(t) { t = Math.min(Math.max(t, 0), 1); return t * t * (3 - 2 * t); }
  function flowUpdate(T) {
    const ph = Math.cos(TAU * T / FLOW_P);
    if (Math.abs(ph - S.flowPh) < 0.004) return; S.flowPh = ph;
    for (let k = 0; k < FLOW_N * FLOW_N * 2; k++) flow.U[k] = flow.base[k] * ph;
    sea.flowEncode(flow.U, FLOW_N, flow.cell, 3, flow.data); flow.tex.needsUpdate = true;
  }

  /* ------------------------------------------------------------ weather (weather.js, unchanged) */
  function initWeather() {
    const mode = qs.get('weather') || 'clear';
    WXR = WX.create({ seed: 100, islands: [], mode: WX.STATES.includes(mode) ? mode : 'auto', nopost: true, quality: LOW ? 'low' : 'high', sunDir, setSun: () => {}, sunFree: false, camera, getCur: () => F.cur, getH: () => renderer.domElement.height,
      hourSec: parseFloat(qs.get('wsec') || '') > 0 ? parseFloat(qs.get('wsec')) : undefined, wt: WTQ, hour0: qs.get('wh') !== null ? parseFloat(qs.get('wh')) : 6, baseSun, baseHemi });
    WXR.attach(scene, sunL, hemiL);
    const parts = WXR.parts(); if (parts && parts.dome) parts.dome.visible = false;       /* the diorama stands against the page's studio gradient, not a sky dome */
    if (!POST) scene.fog = null;                                                          /* AR-safe path: no fog */
    const row = document.createElement('div'); row.className = 'row'; row.innerHTML = '<label for="wx">Weather</label><select id="wx"></select>';
    const sel = row.querySelector('select'); sel.style.cssText = 'flex:1;min-height:32px;font:inherit';
    ['auto'].concat(WX.STATES).forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o); }); sel.value = WX.STATES.includes(mode) ? mode : 'auto';
    sel.onchange = () => WXR.set(sel.value);
    const ui = $('ui'); if (ui) ui.insertBefore(row, ui.children[3] || null);
  }
  F.setWeather = n => { if (WXR) WXR.set(n); };
  F.setClouds = b => { const p = WXR && WXR.parts(); if (p && p.puffs) p.puffs.visible = b; F.cloudsOn = b; };

  /* ------------------------------------------------------------ the sea (SEAF_FS = the ?flow=1 sea of islands_look.html, patched for this block) */
  function R1(src, a, b) { if (!src.includes(a)) throw new Error('finish shader patch failed: ' + a.slice(0, 60)); return src.split(a).join(b); }
  function buildSea() {
    if (seaMat) return seaMat;
    let fs = sea.SEAF_FS;
    fs = R1(fs, '.b*14.0', '.b*32.0');                                                    /* land height scale of uH.b: the cone is 31 table m tall, the page's islands 14 */
    fs = R1(fs, 'float r=length(p);float rimL=smoothstep(92.5,94.0,r);', 'float r=max(abs(p.x),abs(p.y));float rimL=smoothstep(97.0,99.7,r);');   /* the lit rim sits on the square block edge, not the round table */
    fs = WX.patchSea(fs);
    const wake = Array.from({ length: 24 }, () => new THREE.Vector4(0, 0, 1, 0));
    seaMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, defines: { NOPOST: 1 },
      uniforms: { uTime: U.uTime, uTide: U.uTide, uH: { value: heightTex }, uN: { value: S.tex.seaN }, uSun: { value: sunDir }, uSunCol: { value: new THREE.Vector3(3.0, 1.85, 1.05) }, uQ: { value: LOW ? 0 : 1 }, uLand: { value: 0 }, uTideV: { value: 0 }, uWake: { value: wake },
        uSeaT: { value: 0 }, uDbg: { value: 0 }, uPix: { value: 0.001 }, uWind: { value: new THREE.Vector2(0.45, -0.89).normalize() }, uFlow: { value: flow.tex }, uK: { value: S.tex.flowK }, uAxis: { value: new THREE.Vector2(Math.cos(flow.axis), Math.sin(flow.axis)) } },
      vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}', fragmentShader: fs });
    seaMat.__shared = true;
    WXR.attachSea(seaMat);
    return seaMat;
  }

  /* ------------------------------------------------------------ the glass cut edge of the water */
  function glassMat(nrm) {
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, defines: { NOPOST: 1 },
      uniforms: { uTideR: U.uTideR, uTime: U.uTime, uSun: { value: sunDir }, uN: { value: nrm }, uGrain: U.uGrain, uK: U.uK },
      vertexShader: `attribute float isTop; uniform float uTideR; varying vec3 vW; varying float vY; varying float vTop;
        void main(){ vec3 p=position; if(isTop>.5) p.y=max(uTideR, position.y); vY=p.y; vTop=isTop; vec4 w=modelMatrix*vec4(p,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `precision highp float; uniform float uTideR,uTime,uK; uniform vec3 uSun,uN; uniform sampler2D uGrain; varying vec3 vW; varying float vY; varying float vTop;
        void main(){
          float d=max(uTideR-vY,0.0);
          vec3 V=normalize(cameraPosition-vW); float ndv=abs(dot(normalize(uN),V)); float fres=0.02+0.98*pow(1.0-ndv,5.0);
          vec3 deepC=vec3(0.005,0.048,0.100),midC=vec3(0.011,0.092,0.158),shalC=vec3(0.03,0.30,0.33);
          vec3 body=mix(shalC,midC,smoothstep(0.0,22.0,d)); body=mix(body,deepC,smoothstep(14.0,150.0,d));
          float zc=vW.y; vec2 cw=vec2(dot(vW,normalize(vec3(uN.z,0.0,-uN.x)))*0.9+uTime*0.015, zc*0.5);
          float s1=texture2D(uGrain,cw*vec2(0.16,0.045)).r, s2=texture2D(uGrain,cw*vec2(0.5,0.12)+0.4).r;
          float caus=smoothstep(0.30,1.0,s1*0.7+s2*0.3)*exp(-d/55.0);
          vec3 col=body*(0.92+0.18*caus)+vec3(0.08,0.18,0.18)*caus*0.12;
          vec3 R=reflect(-V,normalize(uN)); float yv=max(R.y,0.0); vec3 sky=mix(vec3(0.20,0.30,0.44),vec3(0.02,0.075,0.26),pow(yv,0.55));
          col=mix(col,sky*0.9,fres*0.7);
          float a=mix(0.48,0.80,1.0-exp(-d/90.0)); a=max(a,fres*0.8);
          float lip=smoothstep(7.0,0.0,d); col=mix(col,vec3(0.55,0.78,0.80),lip*0.55); a=max(a,lip*0.9);     /* the bright meniscus under the surface */
          float edge=smoothstep(1.4,0.0,d)*(0.5+0.5*s2); col+=vec3(0.45,0.55,0.55)*edge; a=max(a,edge);
          gl_FragColor=vec4(col,a);
          #ifdef NOPOST
          #include <tonemapping_fragment>
          #include <encodings_fragment>
          #endif
        }` });
    return m;
  }

  /* LI_WEATHER.patchLand is written for the Lambert chunk of the islands page; give it the line it looks for and keep the specular terms of r128's Standard material */
  function weatherLand(sh) {
    const a = 'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;';
    if (!sh.fragmentShader.includes(a)) throw new Error('finish: standard outgoingLight line not found');
    sh.fragmentShader = sh.fragmentShader.replace(a, 'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;\noutgoingLight += reflectedLight.directSpecular + reflectedLight.indirectSpecular;');
    WX.patchLand(sh);
  }

  /* ------------------------------------------------------------ land material: bake bridge + intertidal pass + weather */
  function landMaterial() {
    if (S.mats.land) return S.mats.land;
    const m = bridge.makeBridgeLandMaterial({ light_intensity: S.fin.light_intensity }, null, S.tex.light, null, S.tex.mask, { normalScale: 0, cacheKey: 'cutfin-land-v1' });
    m.vertexColors = true;
    const base = m.onBeforeCompile;
    m.onBeforeCompile = sh => {
      base(sh);
      Object.assign(sh.uniforms, { uTide: U.uTide, uTime: U.uTime, uGrain: U.uGrain, uGrainAmt: U.uGrainAmt, uWet: U.uWet });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;varying vec3 vWN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP=(modelMatrix*vec4(position,1.0)).xyz;vWN=normalize(mat3(modelMatrix)*normal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;varying vec3 vWN;uniform float uTide,uTime,uGrainAmt,uWet;uniform sampler2D uGrain;')
        .replace('#include <color_fragment>', `#include <color_fragment>
${sea.LAND_WET_GLSL}
      { float upN=clamp(vWN.y,0.0,1.0); float steep=smoothstep(0.82,0.50,upN);
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.80,0.76,0.74)*0.82,steep*0.65); }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { float dist=length(cameraPosition-vWP); float amp=1.0-smoothstep(25.0,150.0,dist); float stp=0.5+smoothstep(0.92,0.5,vWN.y);
        vec2 q=vWP.xz*0.9; vec2 q1=q+vec2(0.03,0.0), q2=q+vec2(0.0,0.03);
        float h0=texture2D(uGrain,q).r*0.6+texture2D(uGrain,q*3.7+0.3).r*0.4;
        float hx=texture2D(uGrain,q1).r*0.6+texture2D(uGrain,q1*3.7+0.3).r*0.4;
        float hz=texture2D(uGrain,q2).r*0.6+texture2D(uGrain,q2*3.7+0.3).r*0.4;
        vec3 dn=vec3(-(hx-h0),0.0,-(hz-h0))*(0.12/0.03)*amp*stp;
        normal=normalize(normal+mat3(viewMatrix)*dn); }`);
      weatherLand(sh);
    };
    m.customProgramCacheKey = () => 'cutfin-land-v1';
    m.__shared = true; S.mats.land = m; return m;
  }

  /* ------------------------------------------------------------ cut faces: strata with grain, bump, edge wear and a wet foot */
  function wallMaterial(nm, tex, nrm, tan) {
    tex.encoding = THREE.sRGBEncoding; tex.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: parseFloat(qs.get('wbump') || '0.6'), roughness: 0.93, metalness: 0, side: THREE.DoubleSide });   /* the painted bed lines double as a relief: dark lines read as grooves, bed changes as steps */
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, { uTide: U.uTide, uTideR: U.uTideR, uTime: U.uTime, uGrain: U.uGrain, uK: U.uK, uWT: { value: tan }, uWL: { value: F.M.size_m * K }, uWH: { value: (F.M.zmax - F.M.z0) * K } });
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP=(modelMatrix*vec4(position,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;uniform float uTide,uTideR,uTime,uK,uWL,uWH;uniform vec3 uWT;uniform sampler2D uGrain;')
        .replace('#include <map_fragment>', `
      vec2 cw0=vec2(dot(vWP,uWT),vWP.y);
      vec2 warp=(vec2(texture2D(uGrain,cw0*vec2(1.1,2.2)).r,texture2D(uGrain,cw0*vec2(2.1,1.7)+0.5).r)-0.5)*vec2(0.0007,0.0014);
      vec4 texelColor=texture2D(map,vUv+warp); texelColor=mapTexelToLinear(texelColor); diffuseColor*=texelColor;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
      float cfWet=0.0; vec3 cfDn=vec3(0.0);
      { vec2 cw=vec2(dot(vWP,uWT),vWP.y);
        float g1=texture2D(uGrain,cw*vec2(0.35,2.1),2.0).r, g2=texture2D(uGrain,cw*vec2(1.3,5.2)+0.37,2.0).r, g3=texture2D(uGrain,cw*vec2(4.6,8.5)+0.71,2.0).r;
        float gn=clamp((g1*0.45+g2*0.30+g3*0.25-0.5)*3.0+0.5,0.0,1.0);
        diffuseColor.rgb*=0.50+0.80*gn;                                                        /* bed-parallel mottling: three scales, stretched along the beds */
        float jt=texture2D(uGrain,vec2(cw.x*0.62,cw.y*0.045)+0.2,2.0).r;                           /* vertical joints: faint dark lines at irregular spacing */
        float jn=texture2D(uGrain,vec2(cw.x*0.15,cw.y*0.02),2.0).r;
        diffuseColor.rgb*=1.0-0.34*smoothstep(0.030,0.0,abs(fract(cw.x*0.55+jn*2.2)-0.5)*0.5+jt*0.012-0.002)*smoothstep(0.35,0.65,g1);
        float stk=texture2D(uGrain,vec2(cw.x*5.5,cw.y*0.10)+0.6,2.0).r;                            /* run-off streaks hanging from the top edge */
        diffuseColor.rgb*=1.0-0.30*smoothstep(0.55,0.82,stk)*smoothstep(0.35,0.75,g2);
        diffuseColor.rgb*=1.0-smoothstep(0.05,0.0,abs(g3-0.5))*0.30;                           /* pits */
        float lm=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));
        diffuseColor.rgb=mix(vec3(lm),diffuseColor.rgb,1.05)*0.62;
        float eu=min(vUv.x,1.0-vUv.x)*uWL, ev=vUv.y*uWH;
        float edge=smoothstep(0.7,0.0,min(eu,ev));
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.5+0.02,edge*(0.3+0.7*g2));
        float yR=vWP.y/uK-uTideR;
        float spray=step(0.0,yR)*smoothstep(16.0,0.0,yR), under=step(yR,0.0);
        cfWet=max(spray,under);
        diffuseColor.rgb*=mix(1.0,0.62,cfWet);
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.84,0.97,1.14),under*0.65);
        float dist=length(cameraPosition-vWP); float amp=1.0-smoothstep(25.0,170.0,dist);
        float e=0.12; float hb=g2*0.6+g3*0.4;
        float hbu=texture2D(uGrain,(cw+vec2(e,0.0))*vec2(1.3,5.2)+0.37).r*0.6+texture2D(uGrain,(cw+vec2(e,0.0))*vec2(4.6,8.5)+0.71).r*0.4;
        float hbv=texture2D(uGrain,(cw+vec2(0.0,e))*vec2(1.3,5.2)+0.37).r*0.6+texture2D(uGrain,(cw+vec2(0.0,e))*vec2(4.6,8.5)+0.71).r*0.4;
        cfDn=(uWT*(-(hbu-hb))+vec3(0.0,-(hbv-hb),0.0))*(0.5/e)*0.07*amp;
      }`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,0.32,cfWet*0.8);')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal=normalize(normal+mat3(viewMatrix)*cfDn);');
      weatherLand(sh);
    };
    m.customProgramCacheKey = () => 'cutfin-wall-v1';
    return m;
  }

  /* ------------------------------------------------------------ museum base: slab, bevelled step, label plate */
  function labelTexture() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 96; const g = c.getContext('2d');
    g.fillStyle = '#b79a63'; g.fillRect(0, 0, 1024, 96);
    const gr = g.createLinearGradient(0, 0, 0, 96); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 96);
    g.strokeStyle = 'rgba(60,40,15,.55)'; g.lineWidth = 3; g.strokeRect(6, 6, 1012, 84);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '600 34px Georgia, "Times New Roman", serif'; g.fillStyle = 'rgba(255,240,205,.55)'; g.fillText('VOLCANIC ISLAND  -  SECTION THROUGH THE VENT', 513, 37);
    g.fillStyle = 'rgba(52,34,12,.78)'; g.fillText('VOLCANIC ISLAND  -  SECTION THROUGH THE VENT', 512, 36);
    g.font = '400 22px Georgia, "Times New Roman", serif'; g.fillStyle = 'rgba(255,240,205,.45)'; g.fillText('diagrammatic  -  vertical scale x' + F.M.vertical_exaggeration.toFixed(1) + '  -  horizontal 1:1', 513, 71);
    g.fillStyle = 'rgba(52,34,12,.7)'; g.fillText('diagrammatic  -  vertical scale x' + F.M.vertical_exaggeration.toFixed(1) + '  -  horizontal 1:1', 512, 70);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function museumBase(g) {
    const L = F.M.size_m, z0 = F.M.z0, grp = new THREE.Group();
    const slabH = 44, stepH = 16, slabHalf = L / 2 + 70, topHalf = L / 2 + 16;
    const slabMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.030, 0.026, 0.024), roughness: 0.38, metalness: 0.12 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(slabHalf * 2, slabH, slabHalf * 2), slabMat); slab.position.set(0, z0 - stepH - slabH / 2, 0); grp.add(slab);
    const stepMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.075, 0.056, 0.040), roughness: 0.30, metalness: 0.35 });
    const step = new THREE.Mesh(new THREE.CylinderGeometry(topHalf * Math.SQRT2, slabHalf * Math.SQRT2, stepH, 4, 1), stepMat); step.rotation.y = Math.PI / 4; step.position.set(0, z0 - stepH / 2 - 0.4, 0); grp.add(step);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(560, 52.5), new THREE.MeshStandardMaterial({ map: labelTexture(), roughness: 0.42, metalness: 0.5 }));
    plate.position.set(0, z0 - stepH - slabH * 0.52, slabHalf + 0.6); grp.add(plate);
    g.add(grp); return grp;
  }

  /* ------------------------------------------------------------ kit trees and rocks, placed from the world maps */
  function scatter(g, q, ctx) {
    kit.setLand(true);                                 /* the landing-pass palette: a duller heather and lichen than the table's pink */
    const { M, hAt } = ctx, n = M.n, d = M.cell_m, half = M.size_m / 2, dens = q === 'low' ? 0.4 : 1.0;
    const rnd = kit.mulberry32(4242), lin = kit.lin;
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    mat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSun;varying float vSunV;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvSunV=aSun;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vSunV;');
      const begin = THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );', 'getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );\n\t\tdirectLight.color *= vSunV;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', begin);
    };
    mat.customProgramCacheKey = () => 'cutfin-kit-v1';
    const T = { conifer: [], broad: [], shrub: [], heather: [], rock: { basalt: [], lava: [], scoria: [], pumice: [], ash: [] } };
    const geo = pb => { const gm = pb.build(); return { gm, tris: pb.tris }; };
    for (let v = 0; v < 4; v++) { const pb = new kit.PB(); kit.addConifer(pb, { x: 0, y: 0.15, z: 0, h: 4, s: v + 1 }, kit.mulberry32(11 + v)); T.conifer.push(geo(pb)); }
    for (let v = 0; v < 3; v++) { const pb = new kit.PB(); kit.addBroad(pb, { x: 0, y: 0.1, z: 0, h: 4 }, kit.mulberry32(31 + v)); T.broad.push(geo(pb)); }
    for (let v = 0; v < 3; v++) { const pb = new kit.PB(); kit.addShrub(pb, { x: 0, y: 0, z: 0, h: 1.4 }, kit.mulberry32(51 + v), false); T.shrub.push(geo(pb)); }
    for (let v = 0; v < 2; v++) { const pb = new kit.PB(); kit.addShrub(pb, { x: 0, y: 0, z: 0, h: 1.4 }, kit.mulberry32(61 + v), true); T.heather.push(geo(pb)); }
    const PAL = { basalt: [0.22, 0.21, 0.22], lava: [0.11, 0.10, 0.11], scoria: [0.55, 0.25, 0.17], pumice: [0.80, 0.74, 0.62], ash: [0.36, 0.30, 0.24] };
    const lichen = kit.lin([0.62, 0.62, 0.40]);
    for (const k of Object.keys(PAL)) for (let v = 0; v < 2; v++) {
      const base = kit.lin(PAL[k]).map(x => x), seed = 70 + v * 13 + k.length, pb = new kit.PB();
      const cf = (p, nn) => { const lc = kit.vnoise(p[0] * 1.3 + seed, p[2] * 1.3, 9); let c = base.map(x => x * (0.80 + 0.30 * Math.max(0, nn[1]) + 0.14 * (lc - 0.5)));
        if (Math.abs(kit.vnoise(p[0] * 3.1 + seed, p[1] * 3.1 + p[2] * 1.7, 21) - 0.5) < 0.03) c = c.map(x => x * 0.6);
        if (k === 'basalt' && nn[1] > 0.6 && lc > 0.55) c = kit.mix3(c, lichen.map(x => x * 0.7), Math.min(1, (lc - 0.55) * 3));
        return c; };
      kit.blob(pb, 0, 0.45, 0, 1.0, 0.62, 0.9, v * 1.7, seed, cf, 0.42, 0.5); T.rock[k].push(geo(pb));
    }
    /* sample the baked light and sun mask where an instance stands */
    const lp = S.lightPx, mp = S.maskPx, TT = S.fin.tex, PAD = S.fin.pad_px;
    const texAt = (px, x, y) => { const u = (PAD + (x + half) / M.size_m * (TT - 2 * PAD)), v = (PAD + (1 - (y + half) / M.size_m) * (TT - 2 * PAD)); const j = MIX.clamp(Math.floor(u), 0, TT - 1), i = MIX.clamp(Math.floor(v), 0, TT - 1); const o = (i * TT + j) * 4; return [px.data[o], px.data[o + 1], px.data[o + 2]]; };
    const lists = new Map(), shadows = [], az = Math.atan2(sunDir.x, -sunDir.z), tanEl = sunDir.y / Math.hypot(sunDir.x, sunDir.z);
    const add = (tpl, idx, x, y, h, sc, yaw, tint, objH, objW, cm) => {
      let L = lists.get(tpl[idx]); if (!L) { L = { t: tpl[idx], x: [] }; lists.set(tpl[idx], L); }
      const lt = texAt(lp, x, y), ao = MIX.clamp(((lt[0] + lt[1] + lt[2]) / 3 / 255 - 0.55) / 0.22, 0, 1), sv = texAt(mp, x, y)[0] / 255;
      L.x.push([x, h, y, sc, yaw, tint * (0.60 + 0.40 * ao), 0.25 + 0.75 * sv, cm || null]);
      if (objH && sv > 0.6) shadows.push([x, h, y, objH / tanEl, objW]);      /* a soft shadow decal pointing away from the sun (the baked mask has no trees in it) */
    };
    const slopeAt = (x, y) => { const e = d; return Math.hypot(hAt(x + e, y) - hAt(x - e, y), hAt(x, y + e) - hAt(x, y - e)) / (2 * e); };
    let cnt = { conifer: 0, broad: 0, shrub: 0, heather: 0, rock: 0 };
    const step = 2;
    for (let i = 2; i < n - 2; i += step) for (let j = 2; j < n - 2; j += step) {
      const x = -half + (j + rnd() - 0.5) * d, y = -half + (i + rnd() - 0.5) * d, h = hAt(x, y);
      if (h < 2.0) continue;
      const mp2 = sampleMaps(x, y), rock = mp2[0], veg = mp2[1], sl = slopeAt(x, y), r = rnd(), tint = 0.82 + 0.36 * rnd();
      let pc = 0, pb = 0, ps = 0, ph = 0, pr = 0;
      if (veg === 15) { pc = 0.11; pb = 0.025; ps = 0.03; }                       /* pine / birch belt */
      else if (veg === 14) { pc = 0.07; pb = 0.05; ps = 0.04; }                   /* woodland */
      else if (veg === 13) { ps = 0.022; pb = 0.003; ph = 0.01; }                  /* coastal scrub */
      else if (veg === 16) { ph = 0.03; ps = 0.02; }                               /* high scrub */
      if (sl > 0.62) { pc *= 0.15; pb *= 0.15; ps *= 0.5; }
      if (veg === 2) pr = 0.025; else if (veg === 17) pr = 0.04; else if (veg === 19) pr = 0.01; else if (veg === 18) pr = 0.05; else if (veg === 9 || veg === 10) pr = 0.03;
      pr += Math.min(0.04, Math.max(0, sl - 0.40) * 0.10) + (h < 12 ? 0.02 : 0);
      pc *= dens; pb *= dens; ps *= dens; ph *= dens; pr *= dens;
      const yaw = rnd() * TAU;
      if (r < pc) { { const hh = 20 + 14 * rnd(); add(T.conifer, (rnd() * T.conifer.length) | 0, x, y, h - 0.5, hh / 4, yaw, tint, hh, hh * 0.28); } cnt.conifer++; }
      else if (r < pc + pb) { { const hh = 16 + 10 * rnd(); add(T.broad, (rnd() * T.broad.length) | 0, x, y, h - 0.5, hh / 4, yaw, tint, hh * 0.9, hh * 0.55, [0.66, 0.88, 0.72]); } cnt.broad++; }
      else if (r < pc + pb + ps) { add(T.shrub, (rnd() * T.shrub.length) | 0, x, y, h - 0.3, (6 + 5 * rnd()) / 1.4, yaw, tint, null, null, [0.85, 0.9, 0.85]); cnt.shrub++; }
      else if (r < pc + pb + ps + ph) { add(T.heather, (rnd() * T.heather.length) | 0, x, y, h - 0.3, (5 + 4 * rnd()) / 1.4, yaw, tint, null, null, [0.72, 0.8, 0.72]); cnt.heather++; }
      else if (r < pc + pb + ps + ph + pr) {
        const kind = rock === 16 ? 'scoria' : rock === 18 ? 'lava' : (rock === 20 && rnd() < 0.3) ? 'pumice' : (rock === 17 || rock === 15) ? 'ash' : 'basalt';
        const sz = 2.5 + 8.5 * Math.pow(rnd(), 2.4);
        add(T.rock[kind], (rnd() * 2) | 0, x, y, h - sz * 0.12, sz, yaw, 0.85 + 0.3 * rnd(), sz * 0.55, sz * 0.9); cnt.rock++;
      }
    }
    const grpK = new THREE.Group(); let tris = 0, inst = 0;
    const tmp = new THREE.Object3D(), colr = new THREE.Color();
    lists.forEach(L => {
      const N = L.x.length; if (!N) return;
      const gm = L.t.gm.clone(); gm.setAttribute('aSun', new THREE.InstancedBufferAttribute(new Float32Array(L.x.map(a => a[6])), 1));
      const im = new THREE.InstancedMesh(gm, mat, N);
      for (let k = 0; k < N; k++) { const a = L.x[k]; tmp.position.set(a[0], a[1], -a[2]); tmp.rotation.set(0, a[4], 0); tmp.scale.setScalar(a[3]); tmp.updateMatrix(); im.setMatrixAt(k, tmp.matrix); colr.setRGB(a[5] * (a[7] ? a[7][0] : 1), a[5] * (a[7] ? a[7][1] : 1), a[5] * (a[7] ? a[7][2] : 1)); im.setColorAt(k, colr); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; im.frustumCulled = false; grpK.add(im);
      tris += L.t.tris * N; inst += N;
    });
    /* shadow decals: one instanced quad per object, long axis away from the sun, alpha from a soft elongated blob */
    if (shadows.length) {
      const c = document.createElement('canvas'); c.width = 128; c.height = 64; const cg = c.getContext('2d'), gr = cg.createRadialGradient(40, 32, 2, 64, 32, 62);
      gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.38)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); cg.fillStyle = gr; cg.fillRect(0, 0, 128, 64);
      const shm = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, color: 0x0b1018, toneMapped: false });
      const pg = new THREE.PlaneGeometry(1, 1); pg.rotateX(-Math.PI / 2);
      const sm2 = new THREE.InstancedMesh(pg, shm, shadows.length);   /* long axis +x rotated to point away from the sun */
      const ax = -sunDir.x, az3 = -sunDir.z, rot = Math.atan2(-az3, ax), cx = Math.cos(rot), sz2 = Math.sin(rot);
      shadows.forEach((a, k) => { const len = Math.min(a[3], 70), wid = Math.max(a[4], 4); tmp.position.set(a[0] + cx * len * 0.5, a[1] + 0.9, -a[2] + (-sz2) * len * 0.5); tmp.rotation.set(0, rot, 0); tmp.scale.set(len, 1, wid); tmp.updateMatrix(); sm2.setMatrixAt(k, tmp.matrix); });
      sm2.instanceMatrix.needsUpdate = true; sm2.frustumCulled = false; sm2.renderOrder = 2; grpK.add(sm2);
    }
    g.add(grpK);
    F.kit = { tris: tris + shadows.length * 2, instances: inst, meshes: grpK.children.length, counts: cnt, shadowDecals: shadows.length };
  }

  /* ------------------------------------------------------------ dress: called by cutaway.html after every build() */
  F.dress = function (built, q, ctx) {
    LOW = q === 'low';
    const g = built.group, M = ctx.M;
    if (!S.ready) throw new Error('finish assets not loaded');
    built.sea.visible = false; built.clouds.visible = false;
    g.children.forEach(o => { if (o.isLineSegments) o.visible = false; if (o.geometry && o.geometry.type === 'BoxGeometry') o.visible = false; });
    /* terrain: linear albedo from the vertex colours, uv = uv2 = the bake's planar atlas (flipY false: file row 0 = north) */
    const tg = built.terrain.geometry, pos = tg.attributes.position.array, nv = pos.length / 3, col = tg.attributes.color.array, uv = new Float32Array(nv * 2), TT = S.fin.tex, PAD = S.fin.pad_px, half = M.size_m / 2;
    const gain = parseFloat(qs.get('albedo') || '0.9');
    for (let k = 0; k < nv; k++) {
      uv[k * 2] = (PAD + (pos[k * 3] + half) / M.size_m * (TT - 2 * PAD)) / TT; uv[k * 2 + 1] = (PAD + (1 - (-pos[k * 3 + 2] + half) / M.size_m) * (TT - 2 * PAD)) / TT;
      { const r0 = col[k * 3], g0 = col[k * 3 + 1], b0 = col[k * 3 + 2], lu = 0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0, br = Math.max(0, (lu - 0.62) * 2.6);    /* bright pale patches (pumice, sand) warm toward tan */
        const rr = [r0, g0, b0].map((v, c) => { const w = lu + (v - lu) * 0.95; return w * (1 - br * [0.06, 0.14, 0.30][c]); });
        for (let c = 0; c < 3; c++) { const v = Math.pow(rr[c], 2.2) * gain; col[k * 3 + c] = v < 0.26 ? v : 0.26 + (v - 0.26) * 0.45; } }   /* sRGB to linear, then a soft knee: the palette's pale pumice and sand would clip white under the sun */
    }
    tg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); tg.setAttribute('uv2', new THREE.BufferAttribute(uv.slice(), 2)); tg.attributes.color.needsUpdate = true;
    built.terrain.material = landMaterial();
    /* walls and the glass */
    const NRM = { s: [0, 0, 1], e: [1, 0, 0], n: [0, 0, -1], w: [-1, 0, 0] }, TAN = { s: [1, 0, 0], e: [0, 0, -1], n: [-1, 0, 0], w: [0, 0, 1] };
    for (const nm of ctx.WALLS) {
      const wi = built.wallInfo[nm], nn = wi.nn, nrm = new THREE.Vector3(...NRM[nm]), tan = new THREE.Vector3(...TAN[nm]);
      const nrmArr = new Float32Array(nn * 2 * 3); for (let k = 0; k < nn * 2; k++) nrmArr.set(NRM[nm], k * 3);
      wi.geom.setAttribute('normal', new THREE.BufferAttribute(nrmArr, 3));
      const tex = wi.mesh.material.map; wi.mesh.material = wallMaterial(nm, tex, nrm, tan);
      wi.water.material = glassMat(nrm); wi.water.renderOrder = 6;
    }
    museumBase(g);
    /* sea */
    const sm = buildSea(); const sg = new THREE.PlaneGeometry(M.size_m, M.size_m, 1, 1); sg.rotateX(-Math.PI / 2);
    const seaMesh = new THREE.Mesh(sg, sm); seaMesh.renderOrder = 5; seaMesh.frustumCulled = false; g.add(seaMesh); built.seaFinish = seaMesh; S.seaMesh = seaMesh;
    scatter(g, q, ctx);
    F.setTide(ctx.state.tide);
    F.setClouds(ctx.state.clouds);
    F.info.q = q; F.info.tiers = q;
  };

  /* ------------------------------------------------------------ per frame */
  F.setTide = function (t) {
    S.tideR = t * TIDE_X; U.uTideR.value = S.tideR; U.uTide.value = K * S.tideR;
    if (S.seaMesh) S.seaMesh.position.y = S.tideR;
    if (seaMat) seaMat.uniforms.uTideV.value = 0;
  };
  F.placeCamera = function (px, py, pz, cam) {
    camera.position.set(px * K, py * K, pz * K); camera.lookAt(cam.tx * K, cam.ty * K, cam.tz * K);
    F.cur.tx = cam.tx * K; F.cur.tz = cam.tz * K;
  };
  F.frame = function (t) {
    const dt = Math.min(0.1, Math.max(0, t - S.last)); S.last = t;
    const st = SEAT !== null ? SEAT : t;
    U.uTime.value = st;
    if (seaMat) {
      const u = seaMat.uniforms; u.uSeaT.value = st; u.uPix.value = 2 * Math.tan(camera.fov * Math.PI / 360) / Math.max(1, renderer.domElement.height); u.uQ.value = LOW ? 0 : 1;
      flowUpdate(FLOW_P * FLOW_BASE + st);
    }
    if (WXR) {
      WXR.frame(dt, camera);
      /* weather scales the sky light: the land's baked light map gets the hemisphere colour ratio, trees and walls use the hemisphere light itself */
      const s = WXR.state, hs = hemiL.intensity; const U2 = S.mats.land && S.mats.land.userData.U;
      if (U2) U2.uSkyTint.value.set(hemiL.color.r / baseHemi.c[0] * hs, hemiL.color.g / baseHemi.c[1] * hs, hemiL.color.b / baseHemi.c[2] * hs);
      F.weather = s ? { name: s.name, k: s.k || 0, windMs: s.windMs, sunScale: s.sunScale, hemiScale: s.hemiScale } : null;
    }
  };
  F.stats = function () {
    return { K, kit: F.kit, tideX: TIDE_X, weather: F.weather || null, q: LOW ? 'low' : 'high', toneInstalled, exposure: renderer.toneMappingExposure, seaUniforms: seaMat ? Object.keys(seaMat.uniforms).length : 0,
      files: S.fin ? S.fin.files : null, sun: S.fin ? { el: S.fin.sun_el, az: S.fin.sun_az } : null, fog: !!scene.fog };
  };
  F.debug = { U, S, uniforms: () => seaMat && seaMat.uniforms, wx: () => WXR, sunL, hemiL };
  return F;
}
window.LI_CUTFIN = { create, K };
})();
