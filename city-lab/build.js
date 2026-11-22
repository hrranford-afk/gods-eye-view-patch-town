/* City Lab: recipe -> THREE.Group. Needs three.js r128, the toy library (SS), whitelist.js, supports.js, validate.js and parts.js.
   Every part is its own group named by its id (userData.partId). Parts can be replaced, removed (they fall) and restored.
   Stages are tagged as in the Building Yard: trim comes off first, then walls, then frame. */
(function (root) {
  'use strict';
  var SUP = root.CitySupports, VAL = root.CityValidate, P = root.CityParts;
  var GHOST_KINDS = { panel: 1, gable: 1, roof_tile: 1, door: 1, window: 1, shutter: 1, awning: 1, chimney: 1, ridge: 1 };
  var _ghost = null;
  function ghostMat() {
    if (!_ghost) { var base = root.SS.materials().mat; _ghost = base.clone(); _ghost.transparent = true; _ghost.opacity = 0.13; _ghost.depthWrite = false; }
    return _ghost;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function create(recipe, opts) {
    opts = opts || {};
    var R = clone(recipe), group = new THREE.Group(), B = { recipe: R, group: group, parts: {}, debris: [], xray: false, selected: null, helper: null, stageOn: { trim: true, walls: true, frame: true } };
    group.name = 'building:' + R.id;
    R.parts.forEach(function (def) {
      var g = P.build(def); group.add(g);
      B.parts[def.id] = { def: def, group: g, present: true, fallen: null };
    });

    function applyGhost(id) {
      var e = B.parts[id]; if (!e) return;
      var ghost = B.xray && GHOST_KINDS[e.def.kind];
      e.group.traverse(function (o) {
        if (!o.isMesh) return;
        if (ghost) { if (!o.userData.mat0) o.userData.mat0 = o.material; o.material = ghostMat(); o.castShadow = false; }
        else if (o.userData.mat0) { o.material = o.userData.mat0; o.userData.mat0 = null; o.castShadow = true; }
      });
    }
    function shown(e) { return e.present && B.stageOn[e.def.stage]; }
    function refresh(id) { var e = B.parts[id]; if (e && !e.fallen) e.group.visible = shown(e); }

    /* a part comes off: it tumbles to the ground and lies there a few seconds */
    B.removePart = function (id, o) {
      o = o || {}; var e = B.parts[id]; if (!e || !e.present) return false;
      e.present = false;
      if (o.instant || !e.group.visible) { e.group.visible = false; e.fallen = null; return true; }
      var a = (o.angle != null ? o.angle : Math.random() * 6.283), sp = 0.25 + Math.random() * 0.5;
      e.fallen = { delay: o.delay || 0, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 1.2 + Math.random() * 0.8, wx: (Math.random() - 0.5) * 6, wy: (Math.random() - 0.5) * 6, wz: (Math.random() - 0.5) * 6, rest: 0, landed: false };
      B.debris.push(id);
      return true;
    };
    B.restorePart = function (id) {
      var e = B.parts[id]; if (!e || e.present) return false;
      e.present = true; e.fallen = null; var i = B.debris.indexOf(id); if (i >= 0) B.debris.splice(i, 1);
      e.group.position.set(e.def.pos[0], e.def.pos[1], e.def.pos[2]); e.group.rotation.set(0, e.def.rotY || 0, 0); e.group.scale.set(1, 1, 1);
      e.group.visible = shown(e); applyGhost(id); return true;
    };
    /* replace a part with another look (kind, material, variant, label, size). Checked by the same validator; nothing is built from unchecked data. */
    B.replacePart = function (id, patch) {
      var e = B.parts[id]; if (!e) return { ok: false, errors: ['no part ' + id] };
      var errs = VAL.validatePatch(R, id, patch);
      if (errs.length) return { ok: false, errors: errs };
      var def = e.def, i;
      ['kind', 'material', 'variant', 'label', 'tag'].forEach(function (k) { if (patch[k] != null) def[k] = patch[k]; });
      if (patch.size != null) { def.size = patch.size.slice(); delete def.scale; }
      if (patch.scale != null) { def.scale = patch.scale; delete def.size; }
      var old = e.group, g = P.build(def); group.add(g); group.remove(old);
      old.traverse(function (o) { if (o.isMesh && o.geometry) o.geometry.dispose(); });
      e.group = g; g.visible = e.present && B.stageOn[def.stage]; applyGhost(id);
      if (B.selected === id) B.setSelected(id);
      return { ok: true, errors: [] };
    };
    B.setXray = function (on) { B.xray = !!on; Object.keys(B.parts).forEach(applyGhost); };
    B.setStageVisible = function (stage, on) { B.stageOn[stage] = !!on; Object.keys(B.parts).forEach(refresh); };
    /* make the building look like a state's present map (parts that are off fall, parts that are on come back) */
    B.sync = function (present, o) {
      Object.keys(B.parts).forEach(function (id) {
        var want = present[id] !== false, e = B.parts[id];
        if (want && !e.present) B.restorePart(id); else if (!want && e.present) B.removePart(id, o && o.delays ? { delay: o.delays[id] || 0 } : null);
      });
    };
    B.update = function (dt) {
      for (var i = B.debris.length - 1; i >= 0; i--) {
        var id = B.debris[i], e = B.parts[id], f = e.fallen, g = e.group;
        if (!f) { B.debris.splice(i, 1); continue; }
        if (f.delay > 0) { f.delay -= dt; continue; }
        if (!f.landed) {
          f.vy -= 7 * dt; g.position.x += f.vx * dt; g.position.y += f.vy * dt; g.position.z += f.vz * dt;
          g.rotation.x += f.wx * dt; g.rotation.y += f.wy * dt; g.rotation.z += f.wz * dt;
          if (g.position.y <= 0.01) { g.position.y = 0.01; f.landed = true; }
        } else {
          f.rest += dt;
          if (f.rest > 2.2) { var s = Math.max(0, 1 - (f.rest - 2.2) / 0.6); g.scale.set(s, s, s); if (s <= 0) { g.visible = false; g.scale.set(1, 1, 1); e.fallen = null; B.debris.splice(i, 1); } }
        }
      }
      if (B.helper) B.helper.update();
    };
    B.setSelected = function (id) {
      if (B.helper) { group.remove(B.helper); B.helper = null; }
      B.selected = id || null;
      if (id && B.parts[id] && B.parts[id].present) { B.helper = new THREE.BoxHelper(B.parts[id].group, 0xffc83a); group.add(B.helper); }
    };
    /* which part does this ray hit? ghosts are skipped in X-ray, so you pick what you can see */
    B.pick = function (raycaster) {
      var meshes = [];
      Object.keys(B.parts).forEach(function (id) {
        var e = B.parts[id]; if (!e.present || !e.group.visible || e.fallen) return;
        if (B.xray && GHOST_KINDS[e.def.kind]) return;
        e.group.traverse(function (o) { if (o.isMesh) meshes.push(o); });
      });
      var hits = raycaster.intersectObjects(meshes, false);
      if (!hits.length) return null;
      var o = hits[0].object; while (o && !(o.userData && o.userData.partId)) o = o.parent;
      return o ? { id: o.userData.partId, point: hits[0].point.clone(), distance: hits[0].distance } : null;
    };
    B.center = function (id) { var c = SUP.centre(B.parts[id].def); return new THREE.Vector3(c[0], c[1], c[2]); };
    B.meshCount = function () { var n = 0; group.traverse(function (o) { if (o.isMesh) n++; }); return n; };
    B.dispose = function () { group.traverse(function (o) { if (o.isMesh && o.geometry) o.geometry.dispose(); }); };
    return B;
  }
  root.CityBuild = { create: create, GHOST_KINDS: GHOST_KINDS };
})(typeof self !== 'undefined' ? self : this);
