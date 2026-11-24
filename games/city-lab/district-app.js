/* City Lab district page: the neighbourhood from above, with a plain-language "What changed and why" log, overlays for power, delivery routes and demand,
   controls, and the three experiments run IN THE PAGE with the same deterministic functions the tests use (district.js). This file holds no economy numbers:
   every figure comes from the district file and the simulation. It builds no second building engine: each building is a validated recipe built by build.js. */
(function () {
  'use strict';
  var SS = window.SS, BUILD = window.CityBuild, SIM = window.CitySim, DI = window.CityDistrict, INF = window.CityInfra, IX = window.CityInfraExp;
  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(location.search);
  var DIST_PATH = q.get('district') || 'districts/patch_row_hand.json', INFRA_PATH = q.get('infra') || null, I = null, distSha = null;
  var SIDECARS = ['shared/cloud/examples/bakery.stone_deck_oven.json', 'shared/cloud/examples/bakery.cool_store_room.json'];
  var A = window.CityDistrictApp = { speed: 1, paused: false, errors: [], ready: false, expResults: {}, auto: q.get('auto') !== '0' };
  var CELL = 1.0, K = 0.38;   /* world units per grid cell; scale of a building (a recipe footprint is about 2.4 wide) */
  var COL = { ok: 0x2fbf5e, low: 0xf2a21f, cut: 0xe04a3a, route: 0x5aa2f0, road: 0x7d6a58, mat: 0x5b8a3e };
  var renderer, scene, camera, raycaster = new THREE.Raycaster(), table, felt, cam = { az: 0.12, el: 1.12, dist: 9.4, tx: 0, ty: 0, tz: 0.35 };
  var D, files = {}, W = null, glows = [], hlCable = null, selCable = null, world, bmap = {}, roadMeshes = {}, cableGroup, routeGroup, cart, fxList = [], labelEls = {}, selected = null;
  var clock = 0, lastUI = -9, lastLogN = 0, fps = { n: 0, ms: 0, last: 0 }, toastTimer = 0, viewing = 'base';

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  function pct(v) { return Math.round(v * 100) + '%'; }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 4200); }
  function fail(e) { A.errors.push(String(e && e.message || e)); var c = $('whylog'); if (c) c.innerHTML = '<div class="err">' + esc(String(e && e.message || e)) + '</div>'; }
  function pos(cell) { return new THREE.Vector3((cell[0] - (D.grid.cols - 1) / 2) * CELL, 0, (cell[1] - (D.grid.rows - 1) / 2) * CELL); }

  /* ---------------- scene ---------------- */
  function initScene() {
    var canvas = $('view');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0xdfe9f2); scene.fog = new THREE.Fog(0xdfe9f2, 16, 34);
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x8a6a4a, 0.62));
    var sun = new THREE.DirectionalLight(0xfff0d8, 0.85); sun.position.set(-4, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    ['left', 'bottom'].forEach(function (k) { sun.shadow.camera[k] = -7; }); ['right', 'top'].forEach(function (k) { sun.shadow.camera[k] = 7; }); sun.shadow.camera.near = 1; sun.shadow.camera.far = 30; scene.add(sun);
    var c = document.createElement('canvas'); c.width = 512; c.height = 512; var g = c.getContext('2d'); g.fillStyle = '#c99a62'; g.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 9; i++) { g.fillStyle = i % 2 ? 'rgba(255,240,210,.14)' : 'rgba(90,50,20,.10)'; g.fillRect(0, i * 57, 512, 55); g.fillStyle = 'rgba(70,40,15,.5)'; g.fillRect(0, i * 57 + 55, 512, 2); }
    var tt = new THREE.CanvasTexture(c); tt.encoding = THREE.sRGBEncoding; tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(3, 2);
    table = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 9), new THREE.MeshStandardMaterial({ map: tt, roughness: 0.85 })); table.position.y = -0.17; table.receiveShadow = true; scene.add(table);
    window.addEventListener('resize', resize); resize(); bindInput(canvas);
  }
  function resize() {
    var c = $('view'), w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 58 : 40; camera.updateProjectionMatrix();
  }
  function placeCamera() {
    var ce = Math.cos(cam.el);
    camera.position.set(cam.tx + Math.sin(cam.az) * ce * cam.dist, cam.ty + Math.sin(cam.el) * cam.dist, cam.tz + Math.cos(cam.az) * ce * cam.dist); camera.lookAt(cam.tx, cam.ty, cam.tz);
  }
  function bindInput(canvas) {
    var ptr = {}, down = null, pinch = 0;
    canvas.addEventListener('pointerdown', function (e) { canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); ptr[e.pointerId] = { x: e.clientX, y: e.clientY }; down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; });
    canvas.addEventListener('pointermove', function (e) {
      var p = ptr[e.pointerId]; if (!p) return; var ids = Object.keys(ptr);
      if (ids.length >= 2) { var o = ptr[ids.filter(function (i) { return +i !== e.pointerId; })[0]], d = Math.hypot(e.clientX - o.x, e.clientY - o.y); if (pinch) cam.dist = Math.max(5, Math.min(18, cam.dist * pinch / d)); pinch = d; }
      else { var dx = e.clientX - p.x, dy = e.clientY - p.y; if (down) down.moved += Math.abs(dx) + Math.abs(dy); cam.az -= dx * 0.008; cam.el = Math.max(0.35, Math.min(1.45, cam.el + dy * 0.006)); }
      p.x = e.clientX; p.y = e.clientY;
    });
    function up(e) { delete ptr[e.pointerId]; pinch = 0; if (down && down.moved < 8 && performance.now() - down.t < 500) pick(e.clientX, e.clientY); down = null; }
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); cam.dist = Math.max(5, Math.min(18, cam.dist * (e.deltaY > 0 ? 1.08 : 0.92))); }, { passive: false });
  }
  function pick(x, y) {
    var r = $('view').getBoundingClientRect(); raycaster.setFromCamera({ x: ((x - r.left) / r.width) * 2 - 1, y: -((y - r.top) / r.height) * 2 + 1 }, camera);
    var hits = raycaster.intersectObjects(world.children, true);
    for (var i = 0; i < hits.length; i++) { var o = hits[i].object; while (o && !o.userData.bid && !o.userData.cable) o = o.parent; if (o) { if (o.userData.cable) selectCable(o.userData.cable); else select(o.userData.bid); return; } }
  }

  /* ---------------- the world from the district state ---------------- */
  var PAL = [['paint_cream', 'paint_red', 'paint_blue'], ['wood_pale', 'paint_blue', 'paint_red'], ['paint_cream', 'wood_dark', 'paint_blue'], ['wood_pale', 'paint_red', 'paint_cream']];
  function lerpColor(a, b, t) { return new THREE.Color(a).lerp(new THREE.Color(b), t); }
  function mk(geo, color) { return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: color, roughness: 0.9 })); }
  function rebuild() {
    if (world) { scene.remove(world); }
    world = new THREE.Group(); scene.add(world); bmap = {}; roadMeshes = {}; fxList = []; labelEls = {}; $('labels').innerHTML = '';
    var cols = D.grid.cols, rows = D.grid.rows;
    felt = mk(new THREE.BoxGeometry(cols * CELL + 0.6, 0.03, rows * CELL + 0.6), COL.mat); felt.position.y = 0.012; felt.receiveShadow = true; world.add(felt);
    D.roads.forEach(function (r) {
      var m = mk(new THREE.BoxGeometry(CELL * 0.94, 0.02, CELL * 0.94), COL.road), p = pos(r.cell); m.position.set(p.x, 0.035, p.z); m.receiveShadow = true; m.userData.road = r.cell.join(','); world.add(m);
      var x1 = mk(new THREE.BoxGeometry(CELL * 0.9, 0.02, 0.07), COL.cut), x2 = mk(new THREE.BoxGeometry(CELL * 0.9, 0.02, 0.07), COL.cut);
      x1.rotation.y = Math.PI / 4; x2.rotation.y = -Math.PI / 4; x1.position.set(p.x, 0.06, p.z); x2.position.set(p.x, 0.06, p.z); world.add(x1); world.add(x2);
      roadMeshes[r.cell.join(',')] = { base: m, x: [x1, x2] };
    });
    var dp = pos(W.S.depot), dep = new THREE.Group(); dep.position.set(dp.x, 0.05, dp.z);
    var db = mk(new THREE.BoxGeometry(0.5, 0.16, 0.34), 0x8a5a2b); db.position.y = 0.08; dep.add(db); var dr = mk(new THREE.BoxGeometry(0.56, 0.05, 0.4), 0xe8c07a); dr.position.y = 0.17; dep.add(dr); world.add(dep);
    var homeN = 0;
    W.S.b.forEach(function (b) {
      var R = JSON.parse(JSON.stringify(W.R[b.id]));
      if (b.kind === 'home') { var pal = PAL[homeN++ % PAL.length]; R.parts.forEach(function (p) { if (p.tag === 'wall' || p.tag === 'gable') p.material = pal[0]; else if (p.tag === 'roof') p.material = pal[1]; else if (p.tag === 'door' || p.tag === 'shutter') p.material = pal[2]; }); }
      var B = BUILD.create(R), g = B.group, fp = R.footprint, k = K * (b.kind === 'home' ? 0.96 : 1), p = pos(b.cell);
      g.scale.set(k, k, k); g.position.set(p.x, 0.03, p.z); g.traverse(function (o) { o.userData.bid = b.id; });
      world.add(g); bmap[b.id] = { b: b, B: B, g: g, p: p };
      var el = document.createElement('div'); el.className = 'lb'; $('labels').appendChild(el); labelEls[b.id] = el;
      if (b.kind === 'home') addResidents(b, p);
    });
    cableGroup = new THREE.Group(); world.add(cableGroup); routeGroup = new THREE.Group(); world.add(routeGroup);
    cart = new THREE.Group(); var cb = mk(new THREE.BoxGeometry(0.22, 0.1, 0.14), 0xc2410c); cb.position.y = 0.1; cart.add(cb);
    [-0.07, 0.07].forEach(function (x) { var w = mk(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 10), 0x333333); w.rotation.x = Math.PI / 2; w.position.set(x, 0.045, 0); cart.add(w); }); world.add(cart);
    drawRoads(); drawGrid(); drawRoutes(); updateLabels();
  }
  function addResidents(b, p) {
    var n = b.residents, i;
    for (i = 0; i < n; i++) {
      try {
        var m = SS.mouse(['blue', 'red', 'green'][i % 3], { pose: 'idle' }); m.scale.setScalar(0.23);
        m.position.set(p.x - 0.28 + (i % 4) * 0.19, 0.03, p.z + 0.55 + (i % 2) * 0.12); m.rotation.y = 0.3 * (i % 3 - 1); m.userData.bid = b.id; m.userData.resident = true; world.add(m);
      } catch (e) { /* a missing mouse must not stop the page */ }
    }
  }
  function drawRoads() { D.roads.forEach(function (r) { var k = r.cell.join(','), open = W.S.roads[k] === 1, m = roadMeshes[k]; m.base.material.color.setHex(open ? COL.road : 0x4a3a30); m.x.forEach(function (x) { x.visible = !open; }); }); }
  function cyl(a, b, color, r) {
    var d = new THREE.Vector3().subVectors(b, a), len = d.length(), m = mk(new THREE.CylinderGeometry(r, r, len, 6), color);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
  }
  /* ---- the power network (only when a city_infra file is loaded): cables as a tree, thickness by capacity, colour by load; dark buildings; generator glow ---- */
  var NETCOL = { green: 0x2fbf5e, amber: 0xf2a21f, red: 0xe04a3a, cut: 0x555555, dark: 0x777777 };
  function nodePos(id) {
    if (bmap[id]) { var p = bmap[id].p.clone(); p.y = 0.62; return p; }
    var jn = null; W.I.junctions.forEach(function (j) { if (j.id === id) jn = j; });
    if (jn && jn.cell) { var q2 = pos(jn.cell); q2.y = 0.5; return q2; }
    return new THREE.Vector3(0, 0.5, 0);
  }
  function srcKw(id) { var t = 0; W.I.sources.forEach(function (x) { if (x.building === id) t += x.kw; }); return t * W.S.scale; }
  function drawNet() {
    var ia = W.S.env.infra; glows = [];
    W.I.junctions.forEach(function (j) { var p = nodePos(j.id), g = p.clone(); g.y = 0.04; cableGroup.add(cyl(g, p, 0x5a4636, 0.022)); var b = mk(new THREE.SphereGeometry(0.05, 10, 8), 0x5a4636); b.position.copy(p); cableGroup.add(b); });
    ia.edges.forEach(function (e) {
      var a = nodePos(e.from), b = nodePos(e.to), r = 0.012 + 0.010 * Math.sqrt(e.cap), col = NETCOL[e.state] || NETCOL.green, mid = a.clone().lerp(b, 0.5); mid.y += 0.1;
      var m1 = cyl(a, mid, col, r), m2 = cyl(mid, b, col, r); m1.userData.cable = e.id; m2.userData.cable = e.id; cableGroup.add(m1); cableGroup.add(m2);
      var f1m = cyl(a, mid, 0xffffff, 0.085), f2m = cyl(mid, b, 0xffffff, 0.085); [f1m, f2m].forEach(function (m) { m.material.transparent = true; m.material.opacity = 0; m.material.depthWrite = false; m.userData.cable = e.id; cableGroup.add(m); });   /* fat invisible hit area for a finger */
      if (hlCable === e.id) [cyl(a, mid, 0xffffff, r + 0.035), cyl(mid, b, 0xffffff, r + 0.035)].forEach(function (m) { m.material.transparent = true; m.material.opacity = 0.55; m.material.depthWrite = false; cableGroup.add(m); });
    });
    var root = nodePos(W.I.root);
    W.I.sources.forEach(function (sx) {
      var bp = bmap[sx.building]; if (!bp) return; var top = bp.p.clone(); top.y = 0.7;
      cableGroup.add(cyl(top, root, 0xffd24a, 0.03));
      var gl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.45, depthWrite: false })); gl.position.copy(top); gl.position.y = 0.95; cableGroup.add(gl); glows.push(gl);
    });
    W.S.b.forEach(function (b) {
      var e = bmap[b.id], f = ia.factor[b.id]; if (!e || W.I.srcB[b.id]) return;
      if (ia.dark[b.id]) { var o = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.85, 0.82), new THREE.MeshBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.62, depthWrite: false })); o.position.set(e.p.x, 0.46, e.p.z); cableGroup.add(o); }
      else if (f < 0.999 && ia.demand[b.id] > 0) { var rg = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 40), new THREE.MeshBasicMaterial({ color: f >= 0.75 ? 0xf2a21f : 0xe04a3a, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })); rg.rotation.x = -Math.PI / 2; rg.position.set(e.p.x, 0.08, e.p.z); cableGroup.add(rg); }
    });
  }
  function drawGrid() {   /* power cables from the power shed to every building, coloured by the brownout */
    while (cableGroup.children.length) cableGroup.remove(cableGroup.children[0]);
    if (W.I) { drawNet(); drawNetCard(); return; }
    var env = W.S.env, f = env.power.factor, color = f >= 0.999 ? COL.ok : (f >= 0.75 ? COL.low : COL.cut), shed = W.S.b.filter(function (b) { return b.kind === 'shed'; })[0] || W.S.b[0];
    var s = bmap[shed.id].p.clone(); s.y = 0.7;
    W.S.b.forEach(function (b) { if (b === shed) return; var e = bmap[b.id].p.clone(); e.y = 0.62; var mid = s.clone().lerp(e, 0.5); mid.y += 0.18; cableGroup.add(cyl(s, mid, color, 0.016)); cableGroup.add(cyl(mid, e, color, 0.016)); });
  }
  function bfsPath(fromKey, toKeys) {
    var prev = {}, q = [fromKey], h = 0, dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]; prev[fromKey] = null;
    if (W.S.roads[fromKey] !== 1) return null;
    while (h < q.length) {
      var k = q[h++]; if (toKeys.indexOf(k) >= 0) { var out = [], c = k; while (c) { out.unshift(c); c = prev[c]; } return out; }
      var p = k.split(','), c0 = +p[0], r0 = +p[1];
      dirs.forEach(function (d) { var n = (c0 + d[0]) + ',' + (r0 + d[1]); if (W.S.roads[n] === 1 && !(n in prev)) { prev[n] = k; q.push(n); } });
    }
    return null;
  }
  var cartPath = null;
  function drawRoutes() {   /* the delivery route from the depot to each shop: blue dots when a road is open, a red dotted line when it is not */
    while (routeGroup.children.length) routeGroup.remove(routeGroup.children[0]);
    cartPath = null; var dk = W.S.depot.join(','), env = W.S.env;
    W.S.b.forEach(function (b) {
      if (!b.sim || !(W.R[b.id].systems.deliveries || []).length) return;
      var acc = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(function (d) { return (b.cell[0] + d[0]) + ',' + (b.cell[1] + d[1]); }).filter(function (k) { return W.S.roads[k] === 1; });
      var path = bfsPath(dk, acc), ok = env.b[b.id] && env.b[b.id].deliveries;
      if (path && ok) {
        for (var i = 0; i < path.length; i++) { var c = path[i].split(',').map(Number), p = pos(c), m = mk(new THREE.BoxGeometry(0.16, 0.05, 0.16), COL.route); m.position.set(p.x, 0.1, p.z); routeGroup.add(m); }
        var e = bmap[b.id].p; var m2 = mk(new THREE.BoxGeometry(0.16, 0.05, 0.16), COL.route); m2.position.set(e.x, 0.1, e.z + 0.3); routeGroup.add(m2);
        if (!cartPath || b.kind === 'shop') cartPath = path.map(function (k) { return pos(k.split(',').map(Number)); });
      } else {
        var a = pos(W.S.depot), z = bmap[b.id].p, n = 9;
        for (var j = 1; j < n; j++) { var t = j / n, m3 = mk(new THREE.BoxGeometry(0.14, 0.05, 0.14), COL.cut); m3.position.set(a.x + (z.x - a.x) * t, 0.12, a.z + (z.z - a.z) * t); routeGroup.add(m3); }
      }
    });
  }
  function ring(id, color) {
    var e = bmap[id]; if (!e) return; var r = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 40), new THREE.MeshBasicMaterial({ color: color || 0xf2b73a, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }));
    r.rotation.x = -Math.PI / 2; r.position.set(e.p.x, 0.13, e.p.z); world.add(r); fxList.push({ m: r, t: 0, life: 2.4 });
  }

  /* ---------------- labels, panel, log ---------------- */
  function updateLabels() {
    var env = W.S.env;
    W.S.b.forEach(function (b) {
      var el = labelEls[b.id], e = env.b[b.id] || {}, txt = '', cls = 'lb';
      if (b.kind === 'home') txt = b.residents + ' residents\n' + e.employed + ' work';
      else if (b.kind === 'shop') { txt = 'BAKERY\ndemand ' + f1(e.demand) + '/min from ' + e.from_homes + ' homes'; if (e.footfall > 0.001) txt += '\nmarket boost +' + pct(e.footfall); txt += '\nworkers ' + e.filled + '/' + e.slots; }
      else if (b.kind === 'market') txt = 'MARKET\ndemand ' + f1(e.demand) + '/min\nbrings shoppers';
      else if (b.kind === 'workshop') txt = 'WORKSHOP\nworkers ' + e.filled + '/' + e.slots;
      else if (W.I && W.I.srcB[b.id]) txt = 'GENERATOR\n' + f1(srcKw(b.id)) + ' kW';
      else txt = 'POWER SHED\ngrid ' + f1(env.power.draw) + ' of ' + f1(env.power.supply) + ' kW';
      if (W.I && !W.I.srcB[b.id]) {   /* per-building power label from the network */
        var ia = env.infra, fb = ia.factor[b.id];
        if (ia.dark[b.id]) { txt += '\nNO POWER'; cls += ' dark'; }
        else if (fb < 0.999) { txt += '\npower ' + pct(fb) + (b.kind === 'home' ? '' : ' (' + f1(ia.delivered[b.id]) + ' of ' + f1(ia.demand[b.id]) + ' kW)'); cls += fb < 0.75 ? ' bad' : ' warn'; }
        else if (ia.demand[b.id] > 0 && b.kind !== 'home') txt += '\npower ok, ' + f1(ia.demand[b.id]) + ' kW';
      }
      if (e.deliveries === false && !(W.I && W.I.srcB[b.id])) { txt += '\nNO DELIVERIES'; cls += ' bad'; }
      else if (!W.I && env.power.factor < 0.999) cls += ' warn';
      el.className = cls; if (el.textContent !== txt) el.textContent = txt;
    });
  }
  function projectLabels() {
    var r = $('view').getBoundingClientRect(), v = new THREE.Vector3();
    W.S.b.forEach(function (b) {
      var el = labelEls[b.id], e = bmap[b.id]; if (!el || !e) return;
      v.copy(e.p); v.y = b.kind === 'home' ? 0.62 : 0.75; v.project(camera);
      el.style.left = ((v.x * 0.5 + 0.5) * r.width) + 'px'; el.style.top = ((-v.y * 0.5 + 0.5) * r.height) + 'px'; el.style.display = v.z > 1 ? 'none' : 'block';
    });
  }
  function fmtT(t) { return Math.floor(t / 60) + ':' + ('0' + Math.floor(t % 60)).slice(-2); }
  function renderLog(fresh) {
    var L = W.S.log.slice(-14).reverse(), h = '';
    L.forEach(function (e, i) { h += '<div class="why ' + e.type + (fresh && i < fresh ? ' fresh' : '') + '"><i>' + fmtT(e.t) + '</i><span>' + (e.type === 'change' ? '<b>Change.</b> ' : '') + esc(e.text) + '</span></div>'; });
    $('whylog').innerHTML = h || '<div class="small">Nothing yet.</div>';
  }
  function panelNumbers() {
    var S = W.S, env = S.env, snap = DI.snap(W), rep = DI.between(W, null, snap), bk = S.b.filter(function (b) { return b.kind === 'shop'; })[0], eb = bk && env.b[bk.id];
    $('d-time').textContent = DI.clock(S.t);
    $('d-res').textContent = env.residents + ' (' + env.employed + ' / ' + env.jobs + ')';
    $('d-grid').textContent = f1(env.power.draw) + ' / ' + f1(env.power.supply) + ' kW (' + pct(env.power.factor) + ')';
    var pl = $('d-pill'), f = env.power.factor; pl.textContent = f >= 0.999 ? 'ok' : (W.I ? (f <= 0 ? 'dark street' : 'dim street, lowest ' + pct(f)) : (f >= 0.5 ? 'brownout ' + pct(f) : 'cut')); pl.className = 'pill' + (f >= 0.999 ? '' : (f >= 0.5 ? ' low' : ' cut'));
    var rb = bk ? rep.b[bk.id] : null;
    $('d-bak').textContent = eb ? f1(eb.demand) + ' / ' + (rb && S.t > 20 ? f1(rb.sold_pm) : '-') + ' per min' : '-';
    $('d-money').textContent = f1(rep.d.income_pm) + ' / ' + f1(rep.d.cost_pm);
    var net = rep.d.net_pm; $('d-net').textContent = (S.t > 20 ? f1(net) : '-'); $('d-net').style.color = net < 0 ? '#c93c2c' : '';
    if (selected) selectedCard();
  }
  function select(id) {
    selected = id; selCable = null; ring(id, 0x2f6fe6); refreshHl(); selectedCard();
  }
  function refreshHl() {   /* TAP A DIM OR DARK BUILDING: its limiting cable lights up */
    var h = null;
    if (W.I && selected) { var ia = W.S.env.infra, lim = ia.limiter[selected]; if (lim && lim.cable && !W.I.srcB[selected] && (ia.factor[selected] < 0.999 || ia.dark[selected])) h = lim.cable; }
    if (!selected && !selCable) h = null; else if (selCable) h = selCable;
    if (h !== hlCable) { hlCable = h; drawGrid(); }
  }
  function selectCable(id) { selected = null; selCable = id; hlCable = id; drawGrid(); selectedCard(); }
  function labelOf(id) { var b = DI.byId(W, id); return b ? b.label : id; }
  function junctionName(id) { var n = id; W.I.junctions.forEach(function (j) { if (j.id === id) n = j.name; }); return n; }
  function whySentence(id) { return INF.explain(W.I, W.S.env.infra, id, labelOf, junctionName); }
  function drawNetCard() {
    var ia = W.S.env.infra, h = '<table class="res cab"><tr><th>Cable</th><th>wants</th><th>carries</th><th>of</th><th></th></tr>';
    ia.edges.forEach(function (e) { if (e.synthesized) return; h += '<tr data-cab="' + esc(e.id) + '"' + (hlCable === e.id ? ' class="hl"' : '') + '><td>' + esc(e.name) + '</td><td>' + f1(e.want) + '</td><td>' + f1(e.flow) + '</td><td>' + f1(e.cap) + ' kW</td><td class="st ' + e.state + '">' + e.state + '</td></tr>'; });
    h += '</table><div class="small">Generators give ' + f1(ia.source_kw) + ' kW; the cables ask for ' + f1(ia.root_want) + ' kW. Tap a row or a cable to inspect it; tap a dim or dark building to see its limiting cable.</div>';
    $('netCard').innerHTML = h;
    Array.prototype.forEach.call($('netCard').querySelectorAll('tr[data-cab]'), function (tr) { tr.onclick = function () { selectCable(tr.getAttribute('data-cab')); }; });
  }
  function cableCard() {
    var ia = W.S.env.infra, e = null; ia.edges.forEach(function (x) { if (x.id === selCable) e = x; });
    if (!e) { $('selCard').textContent = 'Tap a building.'; return; }
    var from = W.I.junctions.some(function (j) { return j.id === e.from; }) ? junctionName(e.from) : labelOf(e.from), to = W.I.junctions.some(function (j) { return j.id === e.to; }) ? junctionName(e.to) : labelOf(e.to);
    $('selCard').innerHTML = '<b>' + esc(e.name) + '</b> <span class="small">(cable, ' + esc(from) + ' to ' + esc(to) + ')</span><div class="kv"><span>Capacity</span><b>' + f1(e.cap) + ' kW' + (e.cut ? ' (CUT)' : '') + '</b></div><div class="kv"><span>Everything below it wants</span><b>' + f1(e.want) + ' kW</b></div><div class="kv"><span>It carries</span><b>' + f1(e.flow) + ' kW</b></div><div class="kv"><span>Load</span><b>' + (e.cap > 0 ? Math.round(e.want / e.cap * 100) + '% of capacity' : '-') + ' (' + e.state + ')</b></div>';
  }
  function selectedCard() {
    if (selCable && W.I) { cableCard(); return; }
    var e = bmap[selected]; if (!e) { $('selCard').textContent = 'Tap a building.'; return; }
    var b = e.b, env = W.S.env, ev = env.b[b.id] || {}, h = '<b>' + esc(b.label) + '</b> <span class="small">(' + b.kind + ', cell ' + b.cell.join(',') + ')</span>';
    if (b.kind === 'home') h += '<div class="kv"><span>Residents</span><b>' + b.residents + '</b></div><div class="kv"><span>Working</span><b>' + ev.employed + '</b></div><div class="kv"><span>Power draw</span><b>' + f2(ev.draw) + ' kW</b></div>';
    else {
      var s = SIM.summary(W.R[b.id], b.sim);
      h += '<div class="kv"><span>Status</span><b>' + esc(s.status) + '</b></div><div class="kv"><span>Power</span><b>' + esc(s.power.state) + ' (' + pct(ev.factor) + ')</b></div>';
      if (ev.demand != null) h += '<div class="kv"><span>Demand from residents</span><b>' + f1(ev.demand) + '/min</b></div>';
      h += '<div class="kv"><span>Made / sold (lost)</span><b>' + s.produced + ' / ' + s.sold + ' (' + s.lost + ')</b></div><div class="kv"><span>Income / costs per minute</span><b>' + f1(s.income_per_min) + ' / ' + f1(s.cost_per_min) + '</b></div><div class="kv"><span>Net per minute</span><b>' + f1(s.net_per_min) + '</b></div>';
      if (ev.slots != null) h += '<div class="kv"><span>Workers</span><b>' + ev.filled + ' of ' + ev.slots + '</b></div>';
      h += '<div class="kv"><span>Deliveries</span><b>' + (ev.deliveries ? 'can reach' : 'NO ROAD') + '</b></div>';
      if (b.sidecars.length) h += '<div class="small">Upgrades: ' + b.sidecars.map(function (p) { return esc(p.split('/').pop().replace('.json', '')); }).join(', ') + '</div>';
    }
    if (W.I) {
      var ia = W.S.env.infra;
      if (W.I.srcB[b.id]) h += '<div class="kv"><span>Generator output</span><b>' + f1(srcKw(b.id)) + ' kW</b></div><div class="small">It powers itself; its running cost is the upkeep in the infra file.</div>';
      else { h += '<div class="kv"><span>Power received</span><b>' + pct(ia.factor[b.id]) + ' (' + f1(ia.delivered[b.id]) + ' of ' + f1(ia.demand[b.id]) + ' kW)</b></div>'; if (ia.factor[b.id] < 0.999 || ia.dark[b.id]) h += '<div class="why-card" id="whyPower">' + esc(whySentence(b.id)) + '</div>'; }
    }
    $('selCard').innerHTML = h;
  }

  /* ---------------- actions: every one writes its explanation to the log ---------------- */
  function after(res, ids) {
    if (!res.ok) { toast(res.error || 'Could not do that'); return res; }
    W.S.env = DI.refresh(W); drawRoads(); drawGrid(); drawRoutes(); updateLabels(); renderLog(1); panelNumbers(); if (W.I) refreshHl();
    toast(res.text); (res.ids || ids || []).forEach(function (id) { ring(id); });
    if (res.id) ring(res.id); return res;
  }
  var act = A.act = {
    addHome: function () { var r = DI.addHome(W); if (r.ok) { rebuild(); } return after(r, []); },
    removeHome: function () { var r = DI.removeHome(W); if (r.ok) { rebuild(); } return after(r, []); },
    toggleRoad: function (cellKey) {
      var c = cellKey.split(',').map(Number), open = W.S.roads[cellKey] === 1, r = DI.setRoad(W, c, !open, 'Road at ' + c.join(',') + (open ? ' blocked by the player' : ' reopened by the player'));
      var o = after(r, []); var m = roadMeshes[cellKey]; if (m) fxFlashRoad(c); return o;
    },
    setSupply: function (v) { return after(DI.setScale(W, v, (W.I ? 'Generator output set to ' : 'Grid supply set to ') + pct(v) + ' by the player'), []); },
    setCable: function (id, kw) { var r = DI.setCable(W, id, kw); return after(r, []); },
    cutCable: function (id, cut) { var r = DI.cutCable(W, id, cut); return after(r, []); },
    upgrade: function (path) { var r = DI.applySidecar(W, W.S.b.filter(function (b) { return b.kind === 'shop'; })[0].id, path); if (r.ok) rebuild(); return after(r, []); },
    reset: function () { start(D, 'base'); toast('Neighbourhood reset'); }
  };
  function fxFlashRoad(c) { var p = pos(c), r = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.42, 32), new THREE.MeshBasicMaterial({ color: 0xe04a3a, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.set(p.x, 0.14, p.z); world.add(r); fxList.push({ m: r, t: 0, life: 2.4 }); }

  /* ---------------- experiments, in the page ---------------- */
  function htmlTable(rows, cols) {
    var h = '<table class="res"><tr>' + cols.map(function (c) { return '<th>' + esc(c.h) + '</th>'; }).join('') + '</tr>';
    rows.forEach(function (r) { h += '<tr>' + cols.map(function (c) { var v = c.f ? c.f(r) : r[c.k]; return '<td>' + esc(v == null ? '-' : v) + '</td>'; }).join('') + '</tr>'; });
    return h + '</table>';
  }
  function expl(list) { return '<ul class="expl">' + list.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'; }
  function runExpNow(n) {
    var E = DI['exp' + n](D, files), h = '<div class="card"><b>' + esc(E.title) + '</b> <span class="small">(identical on every run)</span>';
    if (n === 1) {
      h += htmlTable(E.rows, [{ h: 'Homes', k: 'homes' }, { h: 'Residents', k: 'residents' }, { h: 'Demand /min', f: function (r) { return f1(r.bakery_demand_pm); } }, { h: 'Sold /min', f: function (r) { return f1(r.bakery_sold_pm); } },
        { h: 'Lost /min', f: function (r) { return f1(r.bakery_lost_pm); } }, { h: 'Net /min', f: function (r) { return f1(r.bakery_net_pm); } }, { h: 'Grid kW', f: function (r) { return f1(r.grid_draw_kw) + '/' + f1(r.grid_supply_kw); } }, { h: 'Limit', f: function (r) { return r.limiter.split(' (')[0]; } }]);
      h += expl(DI.explain1(E));
    } else if (n === 2) {
      var rows = [];
      Object.keys(E.upgrades).forEach(function (v) { var u = E.upgrades[v]; [E.few, E.many].forEach(function (k) { var x = u.by_homes[k]; rows.push({ up: v.replace(/_/g, ' '), homes: k, base: x.net_base, upg: x.net_upgrade, gain: x.gain_pm, coins: u.coins, be: u.break_even_homes_payback_within_60_min }); }); });
      h += htmlTable(rows, [{ h: 'Upgrade', k: 'up' }, { h: 'Homes', k: 'homes' }, { h: 'Net before', f: function (r) { return f1(r.base); } }, { h: 'Net after', f: function (r) { return f1(r.upg); } }, { h: 'Gain /min', f: function (r) { return f1(r.gain); } }, { h: 'Cost', k: 'coins' }, { h: 'Pays back at', f: function (r) { return r.be == null ? 'never' : r.be + ' homes'; } }]);
      h += expl(DI.explain2(E));
    } else {
      var ks = ['A', 'B', 'control_1', 'control_2'];
      h += htmlTable(ks.map(function (k) { var r = E.runs[k]; return { name: k, d: r.bakery_demand_pm, s: r.bakery_sold_pm, m: r.deliveries_missed_visits, n: r.bakery_net_pm, h: r.homes_reaching != null ? r.homes_reaching : r.access_homes }; }),
        [{ h: 'Run', k: 'name' }, { h: 'Demand /min', f: function (r) { return f1(r.d); } }, { h: 'Sold /min', f: function (r) { return f1(r.s); } }, { h: 'Missed carts', k: 'm' }, { h: 'Net /min', f: function (r) { return f1(r.n); } }]);
      h += htmlTable(E.causes, [{ h: 'Change B to match A in', k: 'change' }, { h: 'Net /min', f: function (r) { return f1(r.net_pm); } }, { h: 'Change', f: function (r) { return (r.delta_net_pm >= 0 ? '+' : '') + f1(r.delta_net_pm); } }]);
      h += expl(DI.explain3(E)) + '<div class="row"><button class="btn" id="vA">View neighbourhood A</button><button class="btn" id="vB">View neighbourhood B</button><button class="btn" id="vBase">Back to Patch Row</button></div>';
    }
    h += '</div>'; $('expOut').innerHTML = h; A.expResults[n] = E;
    if (n === 3) { $('vA').onclick = function () { viewSettlement('A'); }; $('vB').onclick = function () { viewSettlement('B'); }; $('vBase').onclick = function () { start(D, 'base'); }; }
    return E;
  }
  A.runExpNow = runExpNow;
  /* ---- power: read-only comparison and the two power experiments, in the page (same functions as the tests) ---- */
  function labelsMap() { var o = {}; W.S.b.forEach(function (b) { o[b.id] = b.label; }); return o; }
  function renderCompare(c) {
    var h = '<div class="card"><b>Read-only comparison</b> <span class="small">(nothing in the live neighbourhood was changed)</span>';
    if (!c.ok) h += '<div class="err">' + esc(c.error) + '</div>';
    else {
      h += '<div class="kv"><span>Build cost</span><b>' + f2(c.build_cost) + '</b></div><div class="kv"><span>Upkeep per minute</span><b>' + f2(c.upkeep_pm) + '</b></div><div class="kv"><span>District net per minute</span><b>' + f2(c.before.net_pm) + ' to ' + f2(c.after.net_pm) + '</b></div><div class="kv"><span>Change before / after upkeep</span><b>' + (c.gain_gross_pm >= 0 ? '+' : '') + f2(c.gain_gross_pm) + ' / ' + (c.gain_net_pm >= 0 ? '+' : '') + f2(c.gain_net_pm) + '</b></div><div class="kv"><span>Payback</span><b id="cmpPayback">' + (c.payback_min == null ? 'never' : f1(c.payback_min) + ' min') + '</b></div>';
      h += expl(IX.sayCompare(c, labelsMap()));
    }
    $('cmpOut').innerHTML = h + '</div>'; A.lastCompare = c; return c;
  }
  A.compareNow = function (opt) { return renderCompare(IX.compare(D, files, I, IX.configOf(W), opt)); };
  function cmpOpt() { var kw = parseFloat($('cmpKw').value); return $('cmpKind').value === 'generator' ? { type: 'generator', kw: kw } : { type: 'cable', cable: $('cmpCable').value, to_kw: kw }; }
  function runPowerExp(n) {
    $('expOut').innerHTML = '<div class="card">Running experiment E' + n + '... (a few seconds: each case is 65 simulated minutes)</div>';
    setTimeout(function () {
      try {
        var E = n === 4 ? IX.e4(D, files, I) : IX.e5(D, files, I), h = '<div class="card"><b>' + esc(E.title) + '</b> <span class="small">(identical on every run; steady state)</span>';
        if (n === 4) h += htmlTable(E.rows, [{ h: 'Homes', k: 'homes' }, { h: '1st gen kW', k: 'base_source_kw' }, { h: 'Wanted kW', f: function (r) { return f1(r.wanted_kw); } }, { h: 'Net before', f: function (r) { return f1(r.net_before_pm); } }, { h: 'Net after', f: function (r) { return f1(r.net_after_pm); } }, { h: 'After upkeep', f: function (r) { return (r.gain_net_pm >= 0 ? '+' : '') + f1(r.gain_net_pm); } }, { h: 'Payback', f: function (r) { return r.payback_min == null ? 'never' : f1(r.payback_min) + ' min'; } }]);
        else h += htmlTable(['as_built', 'homes_cable_upgraded', 'main_feeder_overloaded'].map(function (k) { var c = E.cases[k]; return { name: k.replace(/_/g, ' '), h: c.street.homes_min, m: c.street.main_min, net: c.net_pm, kw: c.delivered_kw }; }), [{ h: 'Case', k: 'name' }, { h: 'Homes get', f: function (r) { return pct(r.h); } }, { h: 'Main street gets', f: function (r) { return pct(r.m); } }, { h: 'Delivered kW', f: function (r) { return f2(r.kw); } }, { h: 'Net /min', f: function (r) { return f2(r.net); } }]);
        h += expl(n === 4 ? IX.sayE4(E) : IX.sayE5(E)) + '</div>'; $('expOut').innerHTML = h; A.expResults['E' + n] = E;
      } catch (e) { fail(e); }
    }, 40);
  }
  A.runPowerExpNow = function (n) { return n === 4 ? IX.e4(D, files, I) : IX.e5(D, files, I); };
  function runExp(n) { $('expOut').innerHTML = '<div class="card">Running experiment ' + n + '... (about 15 simulated minutes per case)</div>'; setTimeout(function () { try { runExpNow(n); } catch (e) { fail(e); } }, 40); }
  function viewSettlement(c) {
    var E = DI.settlement(D, DI.COND[c]); start(E, c); W.S.t = 0; DI.run(W, 150); W.S.env = DI.refresh(W); drawRoads(); drawGrid(); drawRoutes(); updateLabels(); renderLog(); panelNumbers();
    toast('Neighbourhood ' + c + ': ' + DI.COND[c].homes + ' homes, bakery at ' + DI.COND[c].bakery.join(',') + ', market at ' + DI.COND[c].market.join(',') + '. Time is running: watch the events happen.');
  }

  /* ---------------- start, loop ---------------- */
  function start(Dist, tag) {
    var m = DI.make(Dist, files, { seed: Dist.seed, infra: I && tag === 'base' ? I : null }); if (!m.ok) { fail(m.errors.join('; ')); return; }
    D = Dist; W = m.W; viewing = tag; selected = null; selCable = null; hlCable = null; clock = 0; lastLogN = W.S.logN; rebuild(); renderLog(); panelNumbers(); $('ttl').textContent = D.name + (tag === 'base' ? '' : ' (experiment ' + tag + ')'); selectedCard();
    var net = !!W.I; $('netPanel').hidden = !net; $('oldExp').hidden = net;
    if (net) { var opts = W.I.cables.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + ' (' + f1(c.capacity_kw) + ' kW)</option>'; }).join(''); $('cabSel').innerHTML = opts; $('cmpCable').innerHTML = opts; $('cabSel').value = 'homes_branch'; $('cmpCable').value = 'homes_branch'; }
    var rs = $('roadSel'); rs.innerHTML = D.roads.map(function (r) { return '<option value="' + r.cell.join(',') + '">Road at cell ' + r.cell.join(',') + '</option>'; }).join('');
  }
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.1, (now - (frame.last || now)) / 1000); frame.last = now; clock += dt;
    if (W && !A.paused) { try { DI.run(W, dt * A.speed); } catch (e) { fail(e); A.paused = true; } }
    if (W && W.S.logN !== lastLogN) {   /* a scheduled event or a change happened: say so, highlight it */
      var added = W.S.logN - lastLogN; lastLogN = W.S.logN; W.S.log.slice(-added).forEach(function (e) { if (e.type === 'change' || e.type === 'event') { toast(e.text); (e.ids || []).forEach(function (id) { ring(id); }); } });
      W.S.env = DI.refresh(W); drawRoads(); drawGrid(); drawRoutes(); updateLabels(); renderLog(added);
    }
    if (W && clock - lastUI > 0.25) { lastUI = clock; panelNumbers(); updateLabels(); }
    fxList = fxList.filter(function (f) { f.t += dt; var u = f.t / f.life; f.m.scale.setScalar(1 + u * 0.6); f.m.material.opacity = Math.max(0, 0.95 * (1 - u)); if (u >= 1) { world.remove(f.m); return false; } return true; });
    if (cart) { if (cartPath && cartPath.length > 1) { var t = (clock * 0.7) % (cartPath.length - 1), i = Math.floor(t), a = cartPath[i], b = cartPath[Math.min(i + 1, cartPath.length - 1)], u2 = t - i; cart.visible = true; cart.position.set(a.x + (b.x - a.x) * u2, 0.08, a.z + (b.z - a.z) * u2); cart.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2; } else { cart.visible = false; } }
    glows.forEach(function (g, i) { g.scale.setScalar(1 + 0.15 * Math.sin(clock * 3 + i)); g.material.opacity = 0.32 + 0.16 * Math.sin(clock * 3 + i) * Math.min(1, W.S.scale); g.visible = W.S.scale > 0; });
    placeCamera(); renderer.render(scene, camera); projectLabels();
    fps.n++; fps.ms += dt * 1000; if (fps.n === 30) { A.frameMs = fps.ms / 30; fps.n = 0; fps.ms = 0; }
  }

  /* ---------------- boot ---------------- */
  var distText = '';
  function getText(p) { return fetch(p).then(function (r) { if (!r.ok) throw new Error(p + ': HTTP ' + r.status); return r.text(); }); }
  function sha256Hex(text) {
    try { if (!(window.crypto && crypto.subtle)) return Promise.resolve(null); return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (b) { return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }); } catch (e) { return Promise.resolve(null); }
  }
  function getJSON(p) { return fetch(p).then(function (r) { if (!r.ok) throw new Error(p + ': HTTP ' + r.status); return r.json(); }); }
  function boot() {
    initScene();
    getText(DIST_PATH).then(function (txt) {
      distText = txt; var d = JSON.parse(txt);
      D = d; var paths = {}; d.buildings.forEach(function (b) { paths[b.recipe] = 1; }); paths[d.home_template.recipe] = 1; SIDECARS.forEach(function (p) { paths[p] = 1; });
      return Promise.all(Object.keys(paths).map(function (p) { return getJSON(p).then(function (j) { files[p] = j; }); }));
    }).then(function () {
      if (!INFRA_PATH) return;
      return getJSON(INFRA_PATH).then(function (j) {
        I = j; return sha256Hex(distText).then(function (h) {
          distSha = h; var v = window.CityInfraValidate.validate(I, D, { districtSha: h || undefined });
          if (!v.ok) { I = null; throw new Error('infra file refused: ' + v.errors.slice(0, 3).join('; ')); }
          A.infraLink = h ? 'verified (SHA-256 matches)' : 'id and version checked (no SHA-256 in this browser)';
        });
      });
    }).then(function () { start(D, 'base'); A.ready = true; window.__ddone = true; requestAnimationFrame(frame); }).catch(fail);
    $('bT1').onclick = function () { setSpeed(1); }; $('bT5').onclick = function () { setSpeed(5); }; $('bT20').onclick = function () { setSpeed(20); };
    $('bP').onclick = function () { A.paused = !A.paused; $('bP').classList.toggle('on', A.paused); $('bP').textContent = A.paused ? 'Resume' : 'Pause'; };
    $('aAdd').onclick = function () { act.addHome(); }; $('aDel').onclick = function () { act.removeHome(); };
    $('aRoad').onclick = function () { act.toggleRoad($('roadSel').value); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-sup]'), function (b) { b.onclick = function () { act.setSupply(parseFloat(b.getAttribute('data-sup'))); }; });
    $('aUp').onclick = function () { act.upgrade($('upSel').value); }; $('aReset').onclick = function () { act.reset(); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-gen]'), function (b) { b.onclick = function () { act.setSupply(parseFloat(b.getAttribute('data-gen'))); }; });
    $('aCapSet').onclick = function () { act.setCable($('cabSel').value, parseFloat($('cabKw').value)); };
    $('aCut').onclick = function () { var id = $('cabSel').value, cut = !(W.S.infra && W.S.infra.cut[id]); act.cutCable(id, cut); };
    $('cmpKind').onchange = function () { var g = $('cmpKind').value === 'generator'; $('cmpCable').hidden = g; $('cmpKw').value = g ? '3' : '4'; };
    $('aCmp').onclick = function () { $('cmpOut').innerHTML = '<div class="card">Comparing... (two copies of the neighbourhood, 65 simulated minutes each)</div>'; setTimeout(function () { try { A.compareNow(cmpOpt()); } catch (e) { fail(e); } }, 40); };
    $('e4').onclick = function () { runPowerExp(4); }; $('e5').onclick = function () { runPowerExp(5); };
    $('x1').onclick = function () { runExp(1); }; $('x2').onclick = function () { runExp(2); }; $('x3').onclick = function () { runExp(3); };
  }
  function setSpeed(s) { A.speed = s; ['bT1', 'bT5', 'bT20'].forEach(function (id) { $(id).classList.toggle('on', id === 'bT' + s); }); }
  A.state = function () { return W; };
  A.cableHex = function () { var o = {}; cableGroup.children.forEach(function (m) { if (m.userData.cable && m.material.opacity === 1 && !(m.userData.cable in o)) o[m.userData.cable] = m.material.color.getHex(); }); return o; };
  A.highlighted = function () { return hlCable; };
  A.darkOverlays = function () { return cableGroup.children.filter(function (m) { return m.material && m.material.color && m.material.color.getHex() === 0x2a2a2a; }).length; };
  A.screenOf = function (id) { camera.updateMatrixWorld(); var v = bmap[id].p.clone(); v.y = 0.35; v.project(camera); var r = $('view').getBoundingClientRect(); return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height }; };
  A.setSpeed = setSpeed; A.select = select; A.selectCable = selectCable; A.viewSettlement = viewSettlement; A.infra = function () { return I; };
  boot();
})();
