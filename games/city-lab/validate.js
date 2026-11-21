/* City Lab: the recipe validator (schema rtk.building, version 1). Pure JS, no DOM, runs in Node and in the browser.
   A recipe is DATA. It is read with JSON.parse only and checked here before anything is built. It is never executed, never evaluated, never fetched.
   validate(obj) and parse(text) never throw: they return {ok, errors, details, recipe?}. errors is a list of readable strings, each starting with its JSON path. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./whitelist.js'), require('./supports.js'));
  else root.CityValidate = factory(root.CityWhitelist, root.CitySupports);
})(typeof self !== 'undefined' ? self : this, function (WL, SUP) {
  'use strict';
  var L = WL.LIMITS, ID_RE = new RegExp(L.idRe), ITEM_RE = new RegExp(L.itemRe), TAG_RE = /^[a-z][a-z0-9_]{0,23}$/, ROLE_RE = /^[a-z][a-z_]{0,23}$/;
  var TEXT_RE = /^[A-Za-z0-9 .,'!&()\/+-]*$/;
  /* anything that looks like code, markup, a link or a prototype trick is refused in every string and every key */
  var BAD = /(<|>|`|\$\{|=>|__proto__|constructor|prototype|eval|function|javascript|script|https?:|ftp:|data:|:\/\/|www\.|\bimport\b|\brequire\b|document\.|cookie|localstorage|innerhtml|onerror|onload|\.\.\/|\\|[\u0000-\u001f\u007f])/i;
  var HEAD = ['schema', 'version', 'id', 'name', 'footprint', 'parts', 'systems'];
  var PART_KEYS = ['id', 'kind', 'pos', 'size', 'scale', 'rotY', 'material', 'stage', 'needs', 'needsMin', 'tag', 'replaceable', 'variant', 'label'];
  var PART_REQ = ['id', 'kind', 'pos', 'material', 'stage', 'needs', 'tag', 'replaceable'];
  var SYS_KEYS = ['power', 'jobs', 'production', 'storage', 'start_stock', 'deliveries', 'sales', 'costs', 'repair', 'effects', 'inspect'];
  var SYS_REQ = ['jobs', 'storage', 'costs', 'repair', 'inspect'];

  function isPlain(o) {
    if (o === null || typeof o !== 'object' || Array.isArray(o)) return false;
    var pr = Object.getPrototypeOf(o);
    return pr === Object.prototype || pr === null;
  }

  function validate(recipe) {
    var details = [];
    var cap = 60;
    function E(path, msg) { if (details.length < cap) details.push({ path: path, msg: msg }); else if (details.length === cap) details.push({ path: '$', msg: 'more errors not shown' }); }
    try { run(recipe); } catch (e) { E('$', 'could not be read safely (' + String(e && e.message).slice(0, 80).replace(BAD, '?') + ')'); }
    var errors = details.map(function (d) { return d.path + ': ' + d.msg; });
    return { ok: details.length === 0, errors: errors, details: details, recipe: details.length === 0 ? recipe : null };

    /* ---- small checkers ---- */
    function keys(o, allowed, required, path) {
      if (!isPlain(o)) { E(path, 'must be an object'); return false; }
      var ks = Object.keys(o);
      if (ks.length > 200) { E(path, 'too many keys'); return false; }
      ks.forEach(function (k) { if (allowed.indexOf(k) < 0) E(path + '.' + safe(k), 'unknown key'); });
      (required || []).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(o, k)) E(path + '.' + k, 'is required'); });
      return true;
    }
    function safe(s) { s = String(s).slice(0, 30); return BAD.test(s) ? '(refused key)' : s; }
    function num(v, path, lo, hi, intOnly) {
      if (typeof v !== 'number' || !isFinite(v)) { E(path, 'must be a finite number'); return false; }
      if (v < lo || v > hi) { E(path, 'must be between ' + lo + ' and ' + hi + ' (got ' + v + ')'); return false; }
      if (intOnly && Math.floor(v) !== v) { E(path, 'must be a whole number'); return false; }
      return true;
    }
    function str(v, path, re, maxLen) {
      if (typeof v !== 'string') { E(path, 'must be a string'); return false; }
      if (v.length > (maxLen || L.maxStr)) { E(path, 'is too long (limit ' + (maxLen || L.maxStr) + ')'); return false; }
      if (BAD.test(v)) { E(path, 'looks like code, a link or markup, which a recipe may not contain'); return false; }
      if (re && !re.test(v)) { E(path, 'has characters or a shape that is not allowed'); return false; }
      return true;
    }
    function arr(v, path, max) {
      if (!Array.isArray(v)) { E(path, 'must be a list'); return false; }
      if (v.length > max) { E(path, 'has too many entries (limit ' + max + ')'); return false; }
      return true;
    }
    /* every string and every key anywhere in the tree, with a depth limit and a size limit; refuses anything code-like */
    function scan(v, path, depth, budget) {
      if (budget.n++ > 20000) { if (!budget.hit) { E('$', 'too large (more than 20000 values)'); budget.hit = true; } return; }
      if (depth > L.maxDepth) { if (!budget.deep) { E(path, 'is nested too deeply (limit ' + L.maxDepth + ')'); budget.deep = true; } return; }
      var t = typeof v;
      if (t === 'string') { if (BAD.test(v)) E(path, 'a string looks like code, a link or markup'); else if (v.length > 400) E(path, 'a string is too long'); return; }
      if (t === 'function' || t === 'symbol' || t === 'bigint' || t === 'undefined') { E(path, 'a value of type ' + t + ' is not data'); return; }
      if (v === null || t === 'number' || t === 'boolean') return;
      if (Array.isArray(v)) { if (v.length > 2000) { E(path, 'list too long'); return; } for (var i = 0; i < v.length; i++) scan(v[i], path + '[' + i + ']', depth + 1, budget); return; }
      if (!isPlain(v)) { E(path, 'is not a plain object'); return; }
      var ks = Object.keys(v);
      if (ks.length > 2000) { E(path, 'too many keys'); return; }
      ks.forEach(function (k) { if (BAD.test(k)) E(path, 'a key looks like code or a prototype trick (' + safe(k) + ')'); else scan(v[k], path + '.' + k, depth + 1, budget); });
    }

    function run(r) {
      if (!isPlain(r)) { E('$', 'a recipe must be a JSON object'); return; }
      scan(r, '$', 0, { n: 0 });
      if (details.length) return;   /* hostile shape: stop before reading anything else */
      keys(r, HEAD, HEAD, '$');
      if (r.schema !== 'rtk.building') E('$.schema', "must be the text 'rtk.building'");
      if (r.version !== 1) E('$.version', 'must be the number 1');
      str(r.id, '$.id', ID_RE, 32);
      str(r.name, '$.name', TEXT_RE, L.maxLabel);
      var fp = r.footprint, fpOk = false;
      if (keys(fp, ['w', 'd'], ['w', 'd'], '$.footprint')) fpOk = num(fp.w, '$.footprint.w', L.footprintMin, L.footprintMax) & num(fp.d, '$.footprint.d', L.footprintMin, L.footprintMax);
      if (!arr(r.parts, '$.parts', L.maxParts)) return;
      if (r.parts.length < L.minParts) { E('$.parts', 'needs at least ' + L.minParts + ' part'); return; }
      var ids = Object.create(null), good = [], byId = Object.create(null);
      r.parts.forEach(function (p, i) {
        var path = '$.parts[' + i + ']';
        if (!keys(p, PART_KEYS, PART_REQ, path)) return;
        var ok = true;
        if (!str(p.id, path + '.id', ID_RE, 32)) ok = false;
        else if (ids[p.id]) { E(path + '.id', "duplicate id '" + p.id + "'"); ok = false; } else ids[p.id] = true;
        if (typeof p.kind !== 'string' || !Object.prototype.hasOwnProperty.call(WL.KINDS, p.kind)) { E(path + '.kind', 'unknown kind (allowed: ' + Object.keys(WL.KINDS).join(', ') + ')'); ok = false; }
        if (typeof p.material !== 'string' || WL.MATERIALS.indexOf(p.material) < 0) { E(path + '.material', 'unknown material (allowed: ' + WL.MATERIALS.join(', ') + ')'); ok = false; }
        if (typeof p.stage !== 'string' || WL.STAGES.indexOf(p.stage) < 0) { E(path + '.stage', "must be 'trim', 'walls' or 'frame'"); ok = false; }
        if (!str(p.tag, path + '.tag', TAG_RE, 24)) ok = false;
        if (typeof p.replaceable !== 'boolean') { E(path + '.replaceable', 'must be true or false'); ok = false; }
        if (!arr(p.pos, path + '.pos', 3) || p.pos.length !== 3) { if (Array.isArray(p.pos)) E(path + '.pos', 'must be [x, y, z]'); ok = false; }
        else { for (var a = 0; a < 3; a++) if (!num(p.pos[a], path + '.pos[' + a + ']', a === 1 ? -0.001 : -L.posMax, L.posMax)) ok = false; }
        if (p.size != null && p.scale != null) { E(path, 'give size or scale, not both'); ok = false; }
        if (p.size != null) {
          if (!arr(p.size, path + '.size', 3) || p.size.length !== 3) { if (Array.isArray(p.size)) E(path + '.size', 'must be [w, h, d]'); ok = false; }
          else for (var b = 0; b < 3; b++) if (!num(p.size[b], path + '.size[' + b + ']', L.sizeMin, L.sizeMax)) ok = false;
        }
        if (p.scale != null && !num(p.scale, path + '.scale', 0.25, 3)) ok = false;
        if (p.rotY != null && !num(p.rotY, path + '.rotY', -7, 7)) ok = false;
        if (p.variant != null && !num(p.variant, path + '.variant', 0, 3, true)) ok = false;
        if (p.label != null) { if (!str(p.label, path + '.label', TEXT_RE, L.maxLabel)) ok = false; else if (p.kind !== 'sign') { E(path + '.label', 'only a sign can have a label'); ok = false; } }
        if (!arr(p.needs, path + '.needs', L.maxNeeds)) ok = false;
        else p.needs.forEach(function (n, j) { if (!str(n, path + '.needs[' + j + ']', ID_RE, 32)) ok = false; });
        if (ok) { good.push(p); byId[p.id] = p; }
      });
      /* references and the needs graph */
      good.forEach(function (p) {
        var i = r.parts.indexOf(p), path = '$.parts[' + i + ']', seen = Object.create(null), n = p.needs.length;
        p.needs.forEach(function (id, j) {
          if (id === p.id) E(path + '.needs[' + j + ']', 'a part cannot need itself');
          else if (!ids[id]) E(path + '.needs[' + j + ']', "needs '" + id + "', which is not a part of this recipe");
          if (seen[id]) E(path + '.needs[' + j + ']', "'" + id + "' is listed twice"); seen[id] = true;
        });
        if (p.needsMin != null) { if (num(p.needsMin, path + '.needsMin', 1, Math.max(1, n), true) && n === 0) E(path + '.needsMin', 'a part with no needs cannot have needsMin'); }
      });
      if (good.length === r.parts.length && !details.length) {
        var cyc = SUP.findCycle(good);
        if (cyc) E('$.parts', "the needs graph has a cycle through '" + cyc + "' (a part cannot hold up what holds it up)");
      }
      /* the geometry rules: inside the plot, no overlaps, everything stands at the start */
      if (fpOk && good.length === r.parts.length && !details.length) {
        var hw = fp.w / 2 + L.margin, hd = fp.d / 2 + L.margin;
        good.forEach(function (p, i) {
          var b = SUP.aabb(p), path = '$.parts[' + i + ']';
          if (b.min[0] < -hw || b.max[0] > hw || b.min[2] < -hd || b.max[2] > hd) E(path, "'" + p.id + "' sticks out of the plot by more than " + L.margin);
          if (b.max[1] > 4) E(path, "'" + p.id + "' is taller than 4");
          if (!SUP.standsAtStart(p, byId)) E(path, "'" + p.id + "' does not stand: " + (p.needs.length ? 'it touches none of the parts it needs' : 'it needs nothing and is not on the ground'));
        });
        for (var x = 0; x < good.length && details.length < cap; x++) for (var y = x + 1; y < good.length; y++) if (SUP.overlaps(good[x], good[y])) E('$.parts[' + x + ']', "'" + good[x].id + "' overlaps '" + good[y].id + "'");
      }
      systems(r.systems, ids, byId);
    }

    function itemMap(o, path, itemsOk, lo, hi) {
      if (!isPlain(o)) { E(path, 'must be an object of item: number'); return; }
      var ks = Object.keys(o);
      if (ks.length > L.maxItems) { E(path, 'too many items'); return; }
      ks.forEach(function (k) {
        if (!ITEM_RE.test(k) || BAD.test(k)) { E(path + '.' + safe(k), 'is not a good item name'); return; }
        if (itemsOk && !itemsOk[k]) E(path + '.' + k, "item '" + k + "' is not in storage");
        num(o[k], path + '.' + k, lo, hi);
      });
    }

    function systems(S, ids, byId) {
      var P = '$.systems';
      if (!keys(S, SYS_KEYS, SYS_REQ, P)) return;
      var roles = Object.create(null), items = Object.create(null), tags = Object.create(null);
      Object.keys(byId).forEach(function (k) { tags[byId[k].tag] = true; });
      function partRef(v, path) { if (str(v, path, ID_RE, 32) && !ids[v]) E(path, "'" + v + "' is not a part of this recipe"); }
      if (S.power != null && keys(S.power, ['demand_kw', 'supply_kw', 'wire_part', 'meter_part'], ['demand_kw', 'supply_kw', 'wire_part', 'meter_part'], P + '.power')) {
        num(S.power.demand_kw, P + '.power.demand_kw', 0, 50); num(S.power.supply_kw, P + '.power.supply_kw', 0, 100);
        partRef(S.power.wire_part, P + '.power.wire_part'); partRef(S.power.meter_part, P + '.power.meter_part');
      }
      if (arr(S.jobs, P + '.jobs', L.maxJobs)) S.jobs.forEach(function (j, i) {
        var p = P + '.jobs[' + i + ']';
        if (!keys(j, ['role', 'count', 'station_part'], ['role', 'count', 'station_part'], p)) return;
        if (str(j.role, p + '.role', ROLE_RE, 24)) { if (roles[j.role]) E(p + '.role', 'role listed twice'); roles[j.role] = true; }
        num(j.count, p + '.count', 1, 6, true); partRef(j.station_part, p + '.station_part');
      });
      if (isPlain(S.storage)) {
        var sk = Object.keys(S.storage);
        if (sk.length > L.maxItems) E(P + '.storage', 'too many items');
        else sk.forEach(function (k) { if (!ITEM_RE.test(k) || BAD.test(k)) E(P + '.storage.' + safe(k), 'is not a good item name'); else { items[k] = true; num(S.storage[k], P + '.storage.' + k, 0, 10000); } });
      } else E(P + '.storage', 'must be an object of item: capacity');
      if (S.start_stock != null) {
        itemMap(S.start_stock, P + '.start_stock', items, 0, 10000);
        Object.keys(S.start_stock).forEach(function (k) { if (items[k] && typeof S.start_stock[k] === 'number' && S.start_stock[k] > S.storage[k]) E(P + '.start_stock.' + k, 'is more than the storage capacity'); });
      }
      var pr = S.production;
      if (pr != null && keys(pr, ['role', 'inputs', 'outputs', 'batch_seconds', 'needs_power', 'needs_parts'], ['role', 'inputs', 'outputs', 'batch_seconds', 'needs_power', 'needs_parts'], P + '.production')) {
        if (str(pr.role, P + '.production.role', ROLE_RE, 24) && !roles[pr.role]) E(P + '.production.role', "no job has the role '" + pr.role + "'");
        itemMap(pr.inputs, P + '.production.inputs', items, 0, 1000); itemMap(pr.outputs, P + '.production.outputs', items, 0, 1000);
        if (isPlain(pr.outputs) && !Object.keys(pr.outputs).length) E(P + '.production.outputs', 'needs at least one output');
        num(pr.batch_seconds, P + '.production.batch_seconds', 1, 3600);
        if (typeof pr.needs_power !== 'boolean') E(P + '.production.needs_power', 'must be true or false');
        else if (pr.needs_power && !S.power) E(P + '.production.needs_power', 'needs a systems.power block');
        if (arr(pr.needs_parts, P + '.production.needs_parts', 12)) pr.needs_parts.forEach(function (n, i) { partRef(n, P + '.production.needs_parts[' + i + ']'); });
      }
      if (S.deliveries != null && arr(S.deliveries, P + '.deliveries', L.maxDeliveries)) S.deliveries.forEach(function (d, i) {
        var p = P + '.deliveries[' + i + ']';
        if (!keys(d, ['item', 'amount', 'every_seconds', 'via', 'drop_part'], ['item', 'amount', 'every_seconds', 'via'], p)) return;
        if (str(d.item, p + '.item', ITEM_RE, 24) && !items[d.item]) E(p + '.item', "item '" + d.item + "' is not in storage");
        num(d.amount, p + '.amount', 0, 10000); num(d.every_seconds, p + '.every_seconds', 5, 3600);
        if (d.via !== 'cart') E(p + '.via', "must be 'cart'");
        if (d.drop_part != null) partRef(d.drop_part, p + '.drop_part');
      });
      if (S.sales != null && keys(S.sales, ['item', 'price', 'demand_per_minute', 'role', 'noise'], ['item', 'price', 'demand_per_minute'], P + '.sales')) {
        var s = S.sales;
        if (str(s.item, P + '.sales.item', ITEM_RE, 24) && !items[s.item]) E(P + '.sales.item', "item '" + s.item + "' is not in storage");
        num(s.price, P + '.sales.price', 0, 1000); num(s.demand_per_minute, P + '.sales.demand_per_minute', 0, 600);
        if (s.role != null && str(s.role, P + '.sales.role', ROLE_RE, 24) && !roles[s.role]) E(P + '.sales.role', "no job has the role '" + s.role + "'");
        if (s.noise != null) num(s.noise, P + '.sales.noise', 0, 0.5);
      }
      var c = S.costs;
      if (keys(c, ['power_per_kwh', 'wage_per_worker_per_minute', 'ingredient_prices', 'repair_material_price'], ['power_per_kwh', 'wage_per_worker_per_minute', 'ingredient_prices', 'repair_material_price'], P + '.costs')) {
        num(c.power_per_kwh, P + '.costs.power_per_kwh', 0, 1000); num(c.wage_per_worker_per_minute, P + '.costs.wage_per_worker_per_minute', 0, 1000);
        num(c.repair_material_price, P + '.costs.repair_material_price', 0, 1000); itemMap(c.ingredient_prices, P + '.costs.ingredient_prices', items, 0, 1000);
      }
      var rp = S.repair;
      if (keys(rp, ['seconds', 'material_units', 'walk_speed', 'worker_roles', 'seconds_by_tag'], ['seconds', 'material_units', 'walk_speed', 'worker_roles'], P + '.repair')) {
        num(rp.seconds, P + '.repair.seconds', 0.5, 600); num(rp.material_units, P + '.repair.material_units', 0, 100); num(rp.walk_speed, P + '.repair.walk_speed', 0.05, 5);
        if (arr(rp.worker_roles, P + '.repair.worker_roles', L.maxJobs)) rp.worker_roles.forEach(function (n, i) { if (str(n, P + '.repair.worker_roles[' + i + ']', ROLE_RE, 24) && !roles[n]) E(P + '.repair.worker_roles[' + i + ']', "no job has the role '" + n + "'"); });
        if (rp.seconds_by_tag != null) {
          if (!isPlain(rp.seconds_by_tag)) E(P + '.repair.seconds_by_tag', 'must be an object of tag: seconds');
          else Object.keys(rp.seconds_by_tag).slice(0, 40).forEach(function (k) { if (!TAG_RE.test(k)) E(P + '.repair.seconds_by_tag.' + safe(k), 'is not a tag'); else { if (!tags[k]) E(P + '.repair.seconds_by_tag.' + k, "no part has the tag '" + k + "'"); num(rp.seconds_by_tag[k], P + '.repair.seconds_by_tag.' + k, 0.5, 600); } });
        }
      }
      if (S.effects != null && keys(S.effects, ['spoil', 'demand'], [], P + '.effects')) {
        var ef = S.effects;
        if (ef.spoil != null && arr(ef.spoil, P + '.effects.spoil', 4)) ef.spoil.forEach(function (e, i) {
          var p = P + '.effects.spoil[' + i + ']';
          if (!keys(e, ['tag', 'items'], ['tag', 'items'], p)) return;
          if (str(e.tag, p + '.tag', TAG_RE, 24) && !tags[e.tag]) E(p + '.tag', "no part has the tag '" + e.tag + "'");
          itemMap(e.items, p + '.items', items, 0, 1);
        });
        if (ef.demand != null && arr(ef.demand, P + '.effects.demand', 4)) ef.demand.forEach(function (e, i) {
          var p = P + '.effects.demand[' + i + ']';
          if (!keys(e, ['tag', 'loss'], ['tag', 'loss'], p)) return;
          if (str(e.tag, p + '.tag', TAG_RE, 24) && !tags[e.tag]) E(p + '.tag', "no part has the tag '" + e.tag + "'");
          num(e.loss, p + '.loss', 0, 1);
        });
      }
      if (keys(S.inspect, ['labels'], ['labels'], P + '.inspect')) {
        var lb = S.inspect.labels;
        if (!isPlain(lb)) E(P + '.inspect.labels', 'must be an object of part id: text');
        else { var lk = Object.keys(lb); if (lk.length > L.maxParts) E(P + '.inspect.labels', 'too many labels');
          else lk.forEach(function (k) { if (!ids[k]) E(P + '.inspect.labels.' + safe(k), 'is not a part of this recipe'); else str(lb[k], P + '.inspect.labels.' + k, TEXT_RE, L.maxLabel); }); }
      }
    }
  }

  /* text -> recipe, with JSON.parse only (never eval, never Function). Checks the size and the nesting before parsing. */
  function parse(text) {
    function bad(msg) { return { ok: false, errors: ['$: ' + msg], details: [{ path: '$', msg: msg }], recipe: null }; }
    if (typeof text !== 'string') return bad('the recipe text must be a string');
    if (text.length > L.maxText) return bad('the recipe text is too long (limit ' + L.maxText + ' characters)');
    var depth = 0, inStr = false, esc = false, i, ch;
    for (i = 0; i < text.length; i++) {
      ch = text.charCodeAt(i);
      if (inStr) { if (esc) esc = false; else if (ch === 92) esc = true; else if (ch === 34) inStr = false; continue; }
      if (ch === 34) inStr = true; else if (ch === 91 || ch === 123) { if (++depth > L.maxDepth) return bad('nested too deeply (limit ' + L.maxDepth + ')'); } else if (ch === 93 || ch === 125) depth--;
    }
    var obj;
    try { obj = JSON.parse(text); } catch (e) { return bad('not valid JSON (' + String(e.message).slice(0, 80).replace(BAD, '?') + ')'); }
    return validate(obj);
  }

  /* a change to one part (replace): only these keys, the same checks as a whole part */
  function validatePatch(recipe, id, patch) {
    var errs = [];
    function e(m) { errs.push('$.patch: ' + m); }
    try {
      if (!isPlain(patch)) return ['$.patch: must be an object'];
      var allowed = ['kind', 'material', 'variant', 'label', 'size', 'scale', 'tag'];
      Object.keys(patch).forEach(function (k) { if (allowed.indexOf(k) < 0) e('unknown key ' + safe(k)); else if (typeof patch[k] === 'string' && BAD.test(patch[k])) e(k + ' looks like code'); });
      var part = (recipe.parts || []).filter(function (p) { return p.id === id; })[0];
      if (!part) return ['$.patch: no part ' + safe(id)];
      if (!part.replaceable) e("part '" + id + "' is not replaceable");
      if (patch.kind != null && (typeof patch.kind !== 'string' || !Object.prototype.hasOwnProperty.call(WL.KINDS, patch.kind))) e('unknown kind');
      if (patch.material != null && WL.MATERIALS.indexOf(patch.material) < 0) e('unknown material');
      if (patch.variant != null && !(typeof patch.variant === 'number' && patch.variant >= 0 && patch.variant <= 3 && Math.floor(patch.variant) === patch.variant)) e('variant must be 0 to 3');
      if (patch.label != null && !(typeof patch.label === 'string' && patch.label.length <= L.maxLabel && TEXT_RE.test(patch.label))) e('bad label');
      if (patch.tag != null && !(typeof patch.tag === 'string' && TAG_RE.test(patch.tag))) e('bad tag');
      if (patch.size != null && !(Array.isArray(patch.size) && patch.size.length === 3 && patch.size.every(function (v) { return typeof v === 'number' && isFinite(v) && v >= L.sizeMin && v <= L.sizeMax; }))) e('bad size');
      if (patch.scale != null && !(typeof patch.scale === 'number' && isFinite(patch.scale) && patch.scale >= 0.25 && patch.scale <= 3)) e('bad scale');
      if (patch.size != null && patch.scale != null) e('size or scale, not both');
      if (!errs.length) {
        /* the patched part must still stand and not overlap anything */
        var np = Object.assign({}, part, patch);
        if (patch.size != null) delete np.scale; if (patch.scale != null) delete np.size;
        var byId = {};
        recipe.parts.forEach(function (p) { byId[p.id] = p.id === id ? np : p; });
        if (!SUP.standsAtStart(np, byId)) e('the replaced part would not stand');
        recipe.parts.forEach(function (q) { if (q.id !== id && SUP.overlaps(np, q)) e('the replaced part would overlap ' + q.id); });
      }
    } catch (x) { e('could not be checked'); }
    return errs;
  }
  return { validate: validate, parse: parse, validatePatch: validatePatch, isPlain: isPlain };
});
