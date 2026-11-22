/* City Lab page: the scene, the camera, the Inspect panel and the buttons. The building comes from a validated recipe (build.js),
   the numbers from the simulation (sim.js). This file holds no building data and no economy numbers. */
(function () {
  'use strict';
  var SS = window.SS, SUP = window.CitySupports, VAL = window.CityValidate, SIM = window.CitySim, BUILD = window.CityBuild, WL = window.CityWhitelist;
  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(location.search);
  var A = window.CityApp = { speed: 1, paused: false, tool: 'inspect', selected: null, auto: q.get('auto') !== '0', errors: [] };
  var renderer, scene, camera, raycaster = new THREE.Raycaster(), table, felt, hemi, sun;
  var R = null, S = null, B = null, baseText = '', mice = [], fx = [], flow = null, cam = { az: 0.5, el: 0.62, dist: 5.2, tx: 0, ty: 0.45, tz: 0.15 }, lastInput = -99, clock = 0;
  var COLORS = { ok: 0x2fbf5e, low: 0xf2a21f, cut: 0xe04a3a, none: 0x9a9a9a };
  var TEAMS = ['blue', 'green', 'red'];
  var fps = { n: 0, ms: 0, last: 0 };

  function fmt(v, d) { d = d == null ? 1 : d; return (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1'); }
  function money(v) { return (v < 0 ? '-' : '') + fmt(Math.abs(v), 1); }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove('show'); }, 2200); }
  function label(id) { var l = R.systems.inspect.labels[id]; return l || id; }
  function part(id) { return R.parts.filter(function (p) { return p.id === id; })[0]; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------------- scene ---------------- */
  function initScene() {
    var canvas = $('view');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); scene.background = new THREE.Color(0xdfe9f2); scene.fog = new THREE.Fog(0xdfe9f2, 12, 26);
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    hemi = new THREE.HemisphereLight(0xfff4e0, 0x8a6a4a, 0.6); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff0d8, 0.8); sun.position.set(-3.2, 6, 4); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -3.5; sun.shadow.camera.right = 3.5; sun.shadow.camera.top = 3.5; sun.shadow.camera.bottom = -3.5; sun.shadow.camera.near = 1; sun.shadow.camera.far = 16; sun.shadow.bias = -0.0006;
    scene.add(sun);
    /* a wooden table with a green felt mat, in the toy wood style */
    var c = document.createElement('canvas'); c.width = 512; c.height = 512; var g = c.getContext('2d'); g.fillStyle = '#c99a62'; g.fillRect(0, 0, 512, 512);
    for (var i = 0; i < 9; i++) { g.fillStyle = i % 2 ? 'rgba(255,240,210,.14)' : 'rgba(90,50,20,.10)'; g.fillRect(0, i * 57, 512, 55); g.fillStyle = 'rgba(70,40,15,.5)'; g.fillRect(0, i * 57 + 55, 512, 2); }
    for (i = 0; i < 160; i++) { g.strokeStyle = 'rgba(100,60,25,' + (0.08 + Math.random() * 0.14) + ')'; g.lineWidth = 1; g.beginPath(); var y = Math.random() * 512, x = Math.random() * 512; g.moveTo(x, y); g.bezierCurveTo(x + 40, y + 2, x + 90, y - 2, x + 140 + Math.random() * 80, y + 1); g.stroke(); }
    var tt = new THREE.CanvasTexture(c); tt.encoding = THREE.sRGBEncoding; tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(2, 1.5);
    table = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 6), new THREE.MeshStandardMaterial({ map: tt, roughness: 0.85 })); table.position.y = -0.15; table.receiveShadow = true; scene.add(table);
    felt = new THREE.Mesh(new THREE.BoxGeometry(4, 0.02, 3), new THREE.MeshStandardMaterial({ color: 0x5b8a3e, roughness: 1 })); felt.position.y = 0.005; felt.receiveShadow = true; scene.add(felt);
    window.addEventListener('resize', resize); resize();
    bindInput(canvas);
  }
  function resize() {
    var c = $('view'), w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 1 ? 52 : 40; camera.updateProjectionMatrix();
  }
  function placeCamera() {
    var ce = Math.cos(cam.el), x = cam.tx + Math.sin(cam.az) * ce * cam.dist, y = cam.ty + Math.sin(cam.el) * cam.dist, z = cam.tz + Math.cos(cam.az) * ce * cam.dist;
    camera.position.set(x, y, z); camera.lookAt(cam.tx, cam.ty, cam.tz);
  }

  /* ---------------- input: orbit, pinch, tap ---------------- */
  function bindInput(canvas) {
    var ptr = {}, down = null, pinch = 0;
    canvas.addEventListener('pointerdown', function (e) {
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      ptr[e.pointerId] = { x: e.clientX, y: e.clientY };
      down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, n: Object.keys(ptr).length };
      if (Object.keys(ptr).length === 2) { var k = Object.keys(ptr); pinch = Math.hypot(ptr[k[0]].x - ptr[k[1]].x, ptr[k[0]].y - ptr[k[1]].y); }
      lastInput = clock;
    });
    canvas.addEventListener('pointermove', function (e) {
      var p = ptr[e.pointerId]; if (!p) return;
      var dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; lastInput = clock;
      var keys = Object.keys(ptr);
      if (keys.length === 1) { cam.az -= dx * 0.008; cam.el = Math.max(0.12, Math.min(1.5, cam.el + dy * 0.006)); if (down) down.moved += Math.abs(dx) + Math.abs(dy); }
      else if (keys.length === 2) { var d = Math.hypot(ptr[keys[0]].x - ptr[keys[1]].x, ptr[keys[0]].y - ptr[keys[1]].y); if (pinch > 0) cam.dist = Math.max(2.2, Math.min(9, cam.dist * pinch / d)); pinch = d; if (down) down.moved += 20; }
    });
    function up(e) {
      var wasOne = down && down.n === 1 && Object.keys(ptr).length === 1;
      delete ptr[e.pointerId];
      if (down && wasOne && down.moved < 8 && performance.now() - down.t < 600) tap(e.clientX, e.clientY);
      if (!Object.keys(ptr).length) down = null;
      pinch = 0;
    }
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', function (e) { delete ptr[e.pointerId]; down = null; });
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); cam.dist = Math.max(2.2, Math.min(9, cam.dist * (1 + e.deltaY * 0.001))); lastInput = clock; }, { passive: false });
  }
  function rayAt(cx, cy) {
    var r = $('view').getBoundingClientRect(), m = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld(); raycaster.setFromCamera(m, camera); return raycaster;
  }
  function tap(cx, cy) {
    var rc = rayAt(cx, cy), hit = B.pick(rc), pt = hit ? hit.point : null;
    if (!pt) { var pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), v = new THREE.Vector3(); if (rc.ray.intersectPlane(pl, v)) pt = v; }
    if (A.tool === 'blast') { if (pt) { A.blastAt([pt.x, Math.max(0.05, pt.y), pt.z], parseFloat($('blastR').value)); } setTool('inspect'); return; }
    if (A.tool === 'remove') { if (hit) A.destroy([hit.id], 'removed by hand'); else toast('Tap a part to remove it'); setTool('inspect'); return; }
    A.select(hit ? hit.id : null);
  }

  /* ---------------- the building, the sim, the mice ---------------- */
  function clearWorld() {
    if (B) { scene.remove(B.group); B.dispose(); }
    mice.forEach(function (m) { scene.remove(m.obj); });
    mice = []; fx.forEach(function (f) { scene.remove(f.obj); }); fx = [];
    if (flow) { scene.remove(flow.group); flow = null; }
  }
  function setRecipe(recipe, text) {
    clearWorld();
    B = BUILD.create(recipe); R = B.recipe; S = SIM.create(R, { seed: 1 });
    scene.add(B.group);
    baseText = text != null ? text : JSON.stringify(recipe);
    felt.scale.set(Math.max(1, (R.footprint.w + 1.8) / 4), 1, Math.max(1, (R.footprint.d + 2.6) / 3)); felt.position.z = 0.3;
    S.workers.forEach(function (w, i) {
      var m = SS.mouse(TEAMS[roleIndex(w.role)], { pose: 'idle' });
      m.name = 'worker' + i; scene.add(m); mice.push({ obj: m, i: i, hx: 0, hz: 1 });
    });
    buildFlow();
    A.selected = null; B.setSelected(null); B.setXray($('bX').classList.contains('on'));
    var w = R.footprint.w, d = R.footprint.d; cam.dist = Math.max(3.6, Math.max(w, d) * 2.35); cam.ty = 0.5; cam.tz = 0.2;
    $('ttl').textContent = 'City Lab: ' + R.name;
    fillSelects(); render_panel(true);
  }
  function roleIndex(role) { var roles = []; R.systems.jobs.forEach(function (j) { if (roles.indexOf(j.role) < 0) roles.push(j.role); }); return Math.max(0, roles.indexOf(role)) % 3; }
  function buildFlow() {
    var Y = R.systems; if (!Y.power) return;
    var meter = Y.power.meter_part, mach = (Y.production && Y.production.needs_parts[0]) || (Y.jobs[0] && Y.jobs[0].station_part), wire = Y.power.wire_part;
    if (!mach || !B.parts[meter] || !B.parts[mach]) return;
    var a = B.center(meter), m = B.center(wire), b = B.center(mach); b.y = Math.max(b.y, a.y - 0.05);
    var pts = [a, m, new THREE.Vector3((m.x + b.x) / 2, m.y + 0.02, (m.z + b.z) / 2), b], curve = new THREE.CatmullRomCurve3(pts);
    var g = new THREE.Group(), tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.014, 6, false), new THREE.MeshBasicMaterial({ color: COLORS.ok, depthTest: false, transparent: true, opacity: 0.9 }));
    tube.renderOrder = 10; g.add(tube);
    var dots = []; for (var i = 0; i < 6; i++) { var d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false })); d.renderOrder = 11; g.add(d); dots.push(d); }
    g.visible = false; scene.add(g); flow = { group: g, tube: tube, dots: dots, curve: curve };
  }
  function updateFlow(dt) {
    if (!flow) return;
    flow.group.visible = B.xray;
    if (!B.xray) return;
    var st = S.power.state, col = COLORS[st] || COLORS.none;
    flow.tube.material.color.setHex(col);
    var speed = st === 'ok' ? 0.5 : (st === 'low' ? 0.2 : 0);
    flow.phase = ((flow.phase || 0) + dt * speed) % 1;
    flow.dots.forEach(function (d, i) { var k = (flow.phase + i / flow.dots.length) % 1, p = flow.curve.getPoint(k); d.position.copy(p); d.visible = st !== 'cut'; d.material.color.setHex(st === 'low' ? 0xffe6a8 : 0xc9ffd8); });
  }

  /* ---------------- actions (also used by the tests) ---------------- */
  A.select = function (id) {
    A.selected = id; B.setSelected(id && B.parts[id] && B.parts[id].present ? id : null);
    render_panel(true); syncReplaceForm();
  };
  function applyFall(f) {
    f.direct.forEach(function (id) { B.removePart(id); });
    f.rounds.forEach(function (r, i) { r.forEach(function (id) { B.removePart(id, { delay: 0.12 + i * 0.16 }); }); });
    render_panel(true);
  }
  A.destroy = function (ids, cause) { var f = SIM.destroy(R, S, ids, cause); applyFall(f); if (f.direct.length) shake(0.12); return f; };
  A.blastAt = function (pt, radius) {
    var f = SIM.blast(R, S, pt, radius, 'blast'); applyFall(f);
    var m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.7, depthWrite: false }));
    m.position.set(pt[0], pt[1], pt[2]); scene.add(m); fx.push({ obj: m, t: 0, r: radius, kind: 'blast' }); shake(0.25);
    return f;
  };
  var shakeT = 0; function shake(a) { shakeT = Math.max(shakeT, a); }
  A.tagIds = function (tag) { return R.parts.filter(function (p) { return p.tag === tag; }).map(function (p) { return p.id; }); };
  A.cutWire = function () { var w = R.systems.power && R.systems.power.wire_part; if (w) return A.destroy([w], 'cut'); toast('No cable in this building'); };
  A.dropRoof = function () { var ids = A.tagIds('roof').filter(function (i) { return S.present[i]; }); if (!ids.length) { toast('No roof tiles left'); return null; } return A.destroy(ids, 'tiles dropped'); };
  A.smashOven = function () { var ids = A.tagIds('oven'); if (!ids.length) { toast('No oven in this building'); return null; } return A.destroy(ids, 'smashed'); };
  A.repair = function (id, worker) { var q = SIM.orderRepair(R, S, id, worker); if (!q.length) toast('Nothing to repair there, or a worker is already on it'); render_panel(true); return q; };
  A.repairAll = function () { var n = SIM.orderAll(R, S); if (!n) toast('Nothing is missing'); render_panel(true); return n; };
  A.replace = function (id, patch) {
    var r = B.replacePart(id, patch);
    if (!r.ok) { showMsg('repMsg', 'err', 'Replace refused', r.errors); return r; }
    showMsg('repMsg', 'ok', label(id) + ' replaced: ' + Object.keys(patch).map(function (k) { return k + ' ' + patch[k]; }).join(', '));
    render_panel(true); return r;
  };
  A.setSupply = function (kind) { var kw = kind === 'half' ? R.systems.power.supply_kw * 0.4 : (kind === 'zero' ? 0 : R.systems.power.supply_kw); SIM.setSupply(R, S, Math.round(kw * 100) / 100); render_panel(true); };
  A.advance = function (sec) { SIM.run(R, S, sec); B.sync(S.present); B.update(Math.min(sec, 0.05)); render_panel(true); };
  A.setSpeed = function (s) { A.speed = s; A.paused = false; ['bT1', 'bT5', 'bT20'].forEach(function (id) { $(id).classList.toggle('on', id === 'bT' + s); }); $('bP').classList.remove('on'); };
  A.setXray = function (on) { B.setXray(on); $('bX').classList.toggle('on', !!on); $('bX').setAttribute('aria-pressed', on ? 'true' : 'false'); };
  A.reset = function () { var r = VAL.parse(baseText); if (r.ok) setRecipe(r.recipe, baseText); };
  A.loadText = function (text) {
    var r = VAL.parse(text);
    if (!r.ok) { A.errors = r.errors; showMsg('rcMsg', 'err', 'This recipe was refused and nothing changed (' + r.errors.length + ' problem' + (r.errors.length > 1 ? 's' : '') + ')', r.errors.slice(0, 8).concat(r.errors.length > 8 ? ['... and ' + (r.errors.length - 8) + ' more'] : [])); return r; }
    A.errors = []; setRecipe(r.recipe, text); showMsg('rcMsg', 'ok', 'Loaded ' + r.recipe.name + ': ' + r.recipe.parts.length + ' parts, checked.'); return r;
  };
  A.screenOf = function (id) { var c = B.center(id).clone(); camera.updateMatrixWorld(); c.project(camera); var r = $('view').getBoundingClientRect(); return { x: r.left + (c.x + 1) / 2 * r.width, y: r.top + (1 - c.y) / 2 * r.height }; };
  A.camera = function () { return { az: cam.az, el: cam.el, dist: cam.dist }; };
  A.setCamera = function (az, el, dist) { cam.az = az; cam.el = el; if (dist) cam.dist = dist; A.auto = false; };
  A.state = function () { return S; }; A.recipe = function () { return R; }; A.builder = function () { return B; };
  A.summary = function () { return SIM.summary(R, S); }; A.hash = function () { return SIM.hash(S); };
  A.sceneSignature = function () { return B.group.children.length + ':' + R.id + ':' + B.meshCount(); };
  A.measure = function (n) { var t0 = performance.now(); for (var i = 0; i < n; i++) renderOnce(); return (performance.now() - t0) / n; };
  A.stats = function () { return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, meshes: B.meshCount(), parts: R.parts.length }; };
  A.render = function () { renderOnce(); };

  /* ---------------- panel ---------------- */
  function showMsg(id, kind, head, items) {
    var el = $(id);
    el.innerHTML = '<div class="' + (kind === 'err' ? 'err' : 'ok') + '"><b>' + esc(head) + '</b>' + (items && items.length ? '<ul>' + items.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
  }
  function setTool(t) { A.tool = t; $('tBlast').classList.toggle('on', t === 'blast'); $('tRemove').classList.toggle('on', t === 'remove'); $('hint').textContent = t === 'blast' ? 'Blast: tap the building or the table where the bang goes.' : (t === 'remove' ? 'Remove: tap a part to take it off.' : 'Tap a part to inspect it. Drag to turn the table. Pinch or scroll to zoom.'); }
  function fillSelects() {
    $('repMat').innerHTML = WL.MATERIALS.map(function (m) { return '<option value="' + m + '">' + m.replace(/_/g, ' ') + '</option>'; }).join('');
    $('workerSel').innerHTML = '<option value="-1">Nearest free worker</option>' + S.workers.map(function (w, i) { return '<option value="' + i + '">' + esc(w.role) + ' ' + (i + 1) + '</option>'; }).join('');
    var hasPower = !!R.systems.power; document.querySelectorAll('[data-sup]').forEach(function (b) { b.style.display = hasPower ? '' : 'none'; });
    $('dWire').style.display = hasPower ? '' : 'none'; $('dRoof').style.display = A.tagIds('roof').length ? '' : 'none'; $('dOven').style.display = A.tagIds('oven').length ? '' : 'none';
  }
  function syncReplaceForm() {
    var id = A.selected, p = id && part(id), box = $('repHelp');
    if (!p) { box.textContent = 'Select a replaceable part, pick a new look, press Replace.'; return; }
    box.textContent = p.replaceable ? 'Replacing: ' + label(id) + ' (' + p.kind + ')' : label(id) + ' is structure and cannot be replaced (the validator refuses it).';
    $('repMat').value = p.material; $('repVar').value = String(p.variant || 0); $('repLbl').value = p.label || '';
    $('repVar').parentNode && ($('repVar').style.display = p.kind === 'awning' ? '' : 'none'); $('repLbl').style.display = $('repLblL').style.display = p.kind === 'sign' ? '' : 'none';
  }
  var lastPanel = 0;
  function render_panel(force) {
    var now = performance.now(); if (!force && now - lastPanel < 220) return; lastPanel = now;
    var m = SIM.summary(R, S), Y = R.systems;
    $('f-time').textContent = Math.floor(m.t / 60) + ':' + ('0' + Math.floor(m.t % 60)).slice(-2);
    $('f-status').textContent = Y.production ? m.status : 'no production';
    var ps = $('f-power-state'); ps.textContent = Y.power ? (m.power.state === 'ok' ? 'power ok' : (m.power.state === 'low' ? 'power low' : 'power CUT')) : 'no power'; ps.className = 'pill ' + (Y.power ? m.power.state : 'none');
    $('f-power-supply').textContent = Y.power ? fmt(m.power.supply, 1) + ' kW' : 'n/a'; $('f-power-demand').textContent = Y.power ? fmt(m.power.demand, 1) + ' kW' : 'n/a'; $('f-power-draw').textContent = Y.power ? fmt(m.power.draw, 1) + ' kW (' + fmt(m.power.kwh, 2) + ' kWh)' : 'n/a';
    $('f-progress').style.width = Math.round(Math.max(0, Math.min(1, m.progress)) * 100) + '%';
    $('f-workers').innerHTML = m.workers.length ? m.workers.map(function (w) { return '<li>' + esc(w.text) + '</li>'; }).join('') : '<li>No workers in this building</li>';
    $('f-stock').innerHTML = Object.keys(m.capacity).map(function (k) { return '<li><span>' + esc(k) + '</span> <b style="float:right">' + fmt(m.stock[k], 1) + ' / ' + m.capacity[k] + '</b></li>'; }).join('') || '<li>No storage</li>';
    $('f-produced').textContent = fmt(m.produced, 0) + (m.batches ? ' (' + m.batches + ' batches)' : ''); $('f-sold').textContent = m.sold + (m.lost ? ' (' + m.lost + ' lost)' : '');
    $('f-income').textContent = money(m.income); $('f-costs').textContent = money(m.costs.total);
    $('f-ipm').textContent = money(m.income_per_min); $('f-cpm').textContent = money(m.cost_per_min); $('f-net').textContent = money(m.net_per_min);
    var bal = $('f-balance'); bal.textContent = money(m.balance); bal.style.color = m.balance < 0 ? 'var(--bad)' : 'var(--go)';
    $('f-costsplit').textContent = 'power ' + money(m.costs.power) + ', wages ' + money(m.costs.wages) + ', ingredients ' + money(m.costs.ingredients) + ', repairs ' + money(m.costs.repairs);
    $('f-events').innerHTML = m.events.map(function (e) { return '<div class="ev"><i>' + Math.floor(e.t / 60) + ':' + ('0' + Math.floor(e.t % 60)).slice(-2) + '</i><span>' + esc(e.text) + '</span></div>'; }).join('') || '<div class="small">Nothing yet</div>';
    /* missing parts as chips */
    var miss = R.parts.filter(function (p) { return !S.present[p.id]; });
    $('missing').innerHTML = miss.length ? miss.slice(0, 14).map(function (p) { return '<button class="chip off" data-fix="' + esc(p.id) + '">' + esc(label(p.id)) + '</button>'; }).join('') + (miss.length > 14 ? '<span class="small"> +' + (miss.length - 14) + ' more</span>' : '') : '<span class="small">Nothing is missing.</span>';
    renderPart();
  }
  function renderPart() {
    var id = A.selected, el = $('f-part');
    if (!id) { el.innerHTML = 'Tap a part of the building.'; $('partActions').innerHTML = ''; return; }
    var p = part(id), on = !!S.present[id], needs = (p.needs || []).map(label), by = SUP.neededBy(R.parts, id).map(label), casc = on ? SUP.cascade(R.parts, id, Object.keys(S.present).filter(function (k) { return !S.present[k]; })) : 0;
    el.innerHTML = '<b style="font-size:17px">' + esc(label(id)) + '</b> <span class="small">' + esc(id) + '</span>' +
      '<div class="kv"><span>Kind / tag</span><b>' + esc(p.kind) + ' / ' + esc(p.tag) + '</b></div>' +
      '<div class="kv"><span>Stage</span><b>' + esc(p.stage) + '</b></div>' +
      '<div class="kv"><span>Health</span><b style="color:' + (on ? 'var(--go)' : 'var(--bad)') + '">' + (on ? '100% (intact)' : '0% (destroyed)') + '</b></div>' +
      '<div class="kv"><span>Replaceable</span><b>' + (p.replaceable ? 'yes' : 'no') + '</b></div>' +
      '<div class="kv"><span>Needs</span><b style="text-align:right">' + (needs.length ? esc(needs.join(', ')) : 'nothing (on the ground)') + '</b></div>' +
      '<div class="kv"><span>Needed by</span><b style="text-align:right">' + (by.length ? esc(by.slice(0, 6).join(', ')) + (by.length > 6 ? ' +' + (by.length - 6) : '') : 'nothing') + '</b></div>' +
      (on ? '<div class="kv"><span>If it goes, also falls</span><b>' + casc + ' part' + (casc === 1 ? '' : 's') + '</b></div>' : '');
    $('partActions').innerHTML = on ? '<button class="btn bad" data-act="remove">Remove this part</button>' : '<button class="btn go" data-act="fix">Repair this part</button>';
  }

  function bindUi() {
    $('bX').onclick = function () { A.setXray(!B.xray); };
    $('bT1').onclick = function () { A.setSpeed(1); }; $('bT5').onclick = function () { A.setSpeed(5); }; $('bT20').onclick = function () { A.setSpeed(20); };
    $('bP').onclick = function () { A.paused = !A.paused; $('bP').classList.toggle('on', A.paused); };
    $('tBlast').onclick = function () { setTool(A.tool === 'blast' ? 'inspect' : 'blast'); };
    $('tRemove').onclick = function () { setTool(A.tool === 'remove' ? 'inspect' : 'remove'); };
    $('dWire').onclick = A.cutWire; $('dRoof').onclick = A.dropRoof; $('dOven').onclick = A.smashOven;
    $('blastR').oninput = function () { $('rv').textContent = parseFloat($('blastR').value).toFixed(2); };
    document.querySelectorAll('[data-sup]').forEach(function (b) { b.onclick = function () { A.setSupply(b.getAttribute('data-sup')); }; });
    $('rAll').onclick = A.repairAll;
    $('rSel').onclick = function () { if (A.selected) A.repair(A.selected, parseInt($('workerSel').value, 10)); else toast('Select a missing part first (tap a red chip)'); };
    $('missing').onclick = function (e) { var b = e.target.closest('[data-fix]'); if (!b) return; var id = b.getAttribute('data-fix'); A.selected = id; B.setSelected(null); A.repair(id, parseInt($('workerSel').value, 10)); syncReplaceForm(); };
    $('partActions').onclick = function (e) { var b = e.target.closest('[data-act]'); if (!b || !A.selected) return; if (b.getAttribute('data-act') === 'remove') A.destroy([A.selected], 'removed by hand'); else A.repair(A.selected, parseInt($('workerSel').value, 10)); };
    $('repGo').onclick = function () {
      var id = A.selected, p = id && part(id); if (!p) { showMsg('repMsg', 'err', 'Select a part first'); return; }
      var patch = { material: $('repMat').value };
      if (p.kind === 'awning') patch.variant = parseInt($('repVar').value, 10);
      if (p.kind === 'sign') patch.label = $('repLbl').value;
      A.replace(id, patch);
    };
    $('exGo').onclick = function () { loadExample($('exSel').value); };
    $('rcCopy').onclick = function () {
      var txt = JSON.stringify(R, null, 1); $('rcText').value = txt;
      try { navigator.clipboard.writeText(txt).then(function () { toast('Recipe copied'); }, function () { $('rcText').select(); toast('Recipe is in the box: copy it'); }); } catch (e) { $('rcText').select(); toast('Recipe is in the box: copy it'); }
    };
    $('rcLoad').onclick = function () { A.loadText($('rcText').value); };
    $('bReset').onclick = function () { A.reset(); toast('Reset'); };
  }
  function loadExample(name) {
    return fetch('recipes/' + name + '.json').then(function (r) { return r.text(); }).then(function (t) { return A.loadText(t); }).catch(function (e) { showMsg('rcMsg', 'err', 'Could not read the example (serve this folder over http)', [String(e && e.message)]); });
  }
  A.loadExample = loadExample;

  /* ---------------- frame loop ---------------- */
  function updateMice(dt) {
    mice.forEach(function (mm) {
      var w = S.workers[mm.i], o = mm.obj; if (!w) return;
      var dx = w.x - o.position.x, dz = w.z - o.position.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.002) mm.hx = Math.atan2(dx, dz);
      o.position.set(w.x, 0.05, w.z);
      var want = mm.hx, cur = o.rotation.y; var df = Math.atan2(Math.sin(want - cur), Math.cos(want - cur)); o.rotation.y = cur + df * Math.min(1, dt * 10);
      var pose = w.state === 'walking' || w.state === 'returning' ? 'walk' : (w.state === 'repairing' ? 'hammer' : (S.prod.status === 'working' && S.workers[mm.i].role === (R.systems.production && R.systems.production.role) ? 'hammer' : 'idle'));
      if (w.state === 'station') { var pr = R.systems.production; o.rotation.y = cur + Math.atan2(Math.sin((w.hz > 0 ? Math.PI : 0) - cur), Math.cos((w.hz > 0 ? Math.PI : 0) - cur)) * Math.min(1, dt * 6); if (!(pr && w.role === pr.role)) pose = 'idle'; }
      SS.pose(o, pose, clock * (pose === 'walk' ? 1.6 : 1));
      o.scale.setScalar(1.15);
    });
  }
  function updateFx(dt) {
    for (var i = fx.length - 1; i >= 0; i--) {
      var f = fx[i]; f.t += dt;
      if (f.kind === 'blast') { var k = f.t / 0.45, s = f.r * (0.3 + k * 1.1); f.obj.scale.set(s, s, s); f.obj.material.opacity = Math.max(0, 0.7 * (1 - k)); if (k >= 1) { scene.remove(f.obj); fx.splice(i, 1); } }
    }
  }
  function renderOnce() {
    var t0 = performance.now();
    var sx = 0, sy = 0; if (shakeT > 0) { sx = (Math.random() - 0.5) * shakeT * 0.2; sy = (Math.random() - 0.5) * shakeT * 0.2; }
    placeCamera(); camera.position.x += sx; camera.position.y += sy; camera.lookAt(cam.tx, cam.ty, cam.tz);
    renderer.render(scene, camera);
    fps.n++; fps.ms += performance.now() - t0;
  }
  function frame(ts) {
    var dt = Math.min(0.25, Math.max(0, (ts - (frame.last || ts)) / 1000)); frame.last = ts; clock += dt;
    if (!A.paused && R) { SIM.run(R, S, dt * A.speed); B.sync(S.present); }
    if (B) { B.update(dt); updateFlow(dt); updateMice(dt); updateFx(dt); }
    if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
    if (A.auto && clock - lastInput > 2.5) cam.az += dt * 0.12;
    renderOnce();
    if (R) render_panel(false);
    requestAnimationFrame(frame);
  }
  A.frameMs = function () { return fps.n ? fps.ms / fps.n : 0; };

  /* ---------------- start ---------------- */
  function start() {
    initScene(); bindUi();
    var ex = q.get('recipe') || 'bakery';
    if (!/^[a-z_]{1,20}$/.test(ex)) ex = 'bakery';
    loadExample(ex).then(function () {
      if (q.get('xray') === '1') A.setXray(true);
      A.ready = true; window.__done = true; requestAnimationFrame(frame);
    });
  }
  /* the library builds its texture atlas on first use; wait for its painted textures (at most 3 s) so the first picture is right */
  SS.materials(); SS.whenTextures(start, 3000);
})();
