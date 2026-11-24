/* City Lab: the district file validator (schema city_district, version 0). Pure JS, no DOM, runs in Node and in the browser.
   A district file is DATA: read with JSON.parse only, checked here, never executed, never evaluated, never fetched by this file. Strict keys, numeric ranges, no code-looking strings.
   validate(D, files, opts) never throws. It returns {ok, errors, details}. `files` is optional ({path: parsed JSON} of every recipe and sidecar the district names): when given,
   every recipe is checked with the real v1 recipe validator (validate.js), every sidecar must link to its recipe (id, version; sha256 too when opts.shas gives {path: hex}),
   and the recipe patched with the building's sidecars must STILL pass the v1 validator. A building's kind must fit its recipe (a shop needs a sales block). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./validate.js'), require('./district.js'));
  else root.CityDistrictValidate = factory(root.CityValidate, root.CityDistrict);
})(typeof self !== 'undefined' ? self : this, function (VAL, DI) {
  'use strict';
  var BAD = /(<|>|`|\$\{|=>|__proto__|constructor|prototype|eval|function|javascript|script|https?:|ftp:|data:|:\/\/|www\.|\bimport\b|\brequire\b|document\.|cookie|localstorage|innerhtml|onerror|onload|\.\.\/|\\|[\u0000-\u001f\u007f])/i;
  var ID_RE = /^[a-z][a-z0-9_]{0,31}$/, ITEM_RE = /^[a-z][a-z_]{0,23}$/, PATH_RE = /^[A-Za-z0-9_][A-Za-z0-9_\/.-]{0,119}\.json$/, TEXT_RE = /^[A-Za-z0-9 .,'!&()\/+-]*$/;
  var TOP = ['schema', 'version', 'id', 'name', 'seed', 'grid', 'roads', 'depot', 'power', 'coefficients', 'home_template', 'home_slots', 'buildings', 'events'];
  var TOP_REQ = ['schema', 'version', 'id', 'name', 'seed', 'grid', 'roads', 'depot', 'power', 'coefficients', 'home_template', 'home_slots', 'buildings'];
  var KINDS = ['home', 'shop', 'workshop', 'market', 'shed'];
  var B_KEYS = ['id', 'recipe', 'cell', 'kind', 'sidecars', 'residents', 'employs', 'hire_priority', 'draw_kw'], B_REQ = ['id', 'recipe', 'cell', 'kind'];
  var COEF = ['per_resident_per_min', 'wage_spend_boost', 'work_fraction', 'decay_per_cell', 'max_reach_cells', 'max_commute_cells', 'footfall', 'market_visitors_per_min'];
  var ACTIONS = ['block_road', 'open_road', 'supply_scale'];

  function isPlain(o) { if (o === null || typeof o !== 'object' || Array.isArray(o)) return false; var p = Object.getPrototypeOf(o); return p === Object.prototype || p === null; }

  function validate(D, files, opts) {
    opts = opts || {};
    var details = [], cap = 60;
    function E(path, msg) { if (details.length < cap) details.push({ path: path, msg: msg }); else if (details.length === cap) details.push({ path: '$', msg: 'more errors not shown' }); }
    try { run(); } catch (e) { E('$', 'could not be read safely (' + String(e && e.message).slice(0, 80).replace(BAD, '?') + ')'); }
    var errors = details.map(function (d) { return d.path + ': ' + d.msg; });
    return { ok: details.length === 0, errors: errors, details: details };

    function safe(s) { s = String(s).slice(0, 30); return BAD.test(s) ? '(refused key)' : s; }
    function keys(o, allowed, required, path) {
      if (!isPlain(o)) { E(path, 'must be an object'); return false; }
      var ks = Object.keys(o);
      if (ks.length > 100) { E(path, 'too many keys'); return false; }
      ks.forEach(function (k) { if (allowed.indexOf(k) < 0) E(path + '.' + safe(k), 'unknown key'); });
      (required || []).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(o, k)) E(path + '.' + k, 'is required'); });
      return true;
    }
    function num(v, path, lo, hi, intOnly) {
      if (typeof v !== 'number' || !isFinite(v)) { E(path, 'must be a finite number'); return false; }
      if (v < lo || v > hi) { E(path, 'must be between ' + lo + ' and ' + hi + ' (got ' + v + ')'); return false; }
      if (intOnly && Math.floor(v) !== v) { E(path, 'must be a whole number'); return false; }
      return true;
    }
    function str(v, path, re, maxLen) {
      if (typeof v !== 'string') { E(path, 'must be a string'); return false; }
      if (v.length > (maxLen || 80)) { E(path, 'is too long'); return false; }
      if (BAD.test(v)) { E(path, 'looks like code, a link or markup, which a district file may not contain'); return false; }
      if (re && !re.test(v)) { E(path, 'has characters or a shape that is not allowed'); return false; }
      return true;
    }
    function arr(v, path, max) { if (!Array.isArray(v)) { E(path, 'must be a list'); return false; } if (v.length > max) { E(path, 'has too many entries (limit ' + max + ')'); return false; } return true; }
    function cell(v, path, g) {
      if (!arr(v, path, 2) || v.length !== 2) { if (Array.isArray(v)) E(path, 'must be [column, row]'); return false; }
      var ok = num(v[0], path + '[0]', 0, g.cols - 1, true); ok = num(v[1], path + '[1]', 0, g.rows - 1, true) && ok; return ok;
    }

    function run() {
      if (!keys(D, TOP, TOP_REQ, '$')) return;
      if (D.schema !== 'city_district') E('$.schema', "must be 'city_district'");
      if (D.version !== 0) E('$.version', 'must be 0');
      str(D.id, '$.id', ID_RE, 32); str(D.name, '$.name', TEXT_RE, 60); num(D.seed, '$.seed', 0, 2147483647, true);
      var g = { cols: 8, rows: 6 };
      if (keys(D.grid, ['cols', 'rows'], ['cols', 'rows'], '$.grid')) { num(D.grid.cols, '$.grid.cols', 3, 16, true); num(D.grid.rows, '$.grid.rows', 3, 12, true); if (D.grid.cols >= 3 && D.grid.cols <= 16) g.cols = D.grid.cols; if (D.grid.rows >= 3 && D.grid.rows <= 12) g.rows = D.grid.rows; }

      /* roads */
      var road = {};
      if (arr(D.roads, '$.roads', 200)) D.roads.forEach(function (r, i) {
        var p = '$.roads[' + i + ']';
        if (!keys(r, ['cell', 'open'], ['cell', 'open'], p)) return;
        if (typeof r.open !== 'boolean') E(p + '.open', 'must be true or false');
        if (cell(r.cell, p + '.cell', g)) { var k = r.cell.join(','); if (road[k]) E(p + '.cell', 'is listed twice'); road[k] = 1; }
      });
      if (cell(D.depot, '$.depot', g) && !road[D.depot.join(',')]) E('$.depot', 'must be a road cell');

      /* power and the coefficients: every number the formulas use lives here */
      if (keys(D.power, ['supply_kw', 'home_base_kw', 'per_resident_kw'], ['supply_kw', 'home_base_kw', 'per_resident_kw'], '$.power')) { num(D.power.supply_kw, '$.power.supply_kw', 0, 200); num(D.power.home_base_kw, '$.power.home_base_kw', 0, 5); num(D.power.per_resident_kw, '$.power.per_resident_kw', 0, 2); }
      var C = D.coefficients;
      if (keys(C, COEF, COEF, '$.coefficients')) {
        if (keys(C.per_resident_per_min, Object.keys(isPlain(C.per_resident_per_min) ? C.per_resident_per_min : {}).filter(function (k) { return ITEM_RE.test(k) && !BAD.test(k); }), [], '$.coefficients.per_resident_per_min'))
          Object.keys(C.per_resident_per_min).forEach(function (k) { num(C.per_resident_per_min[k], '$.coefficients.per_resident_per_min.' + safe(k), 0, 20); });
        num(C.wage_spend_boost, '$.coefficients.wage_spend_boost', 0, 2); num(C.work_fraction, '$.coefficients.work_fraction', 0, 1);
        num(C.decay_per_cell, '$.coefficients.decay_per_cell', 0.05, 1); num(C.max_reach_cells, '$.coefficients.max_reach_cells', 1, 60, true); num(C.max_commute_cells, '$.coefficients.max_commute_cells', 1, 60, true);
        if (keys(C.footfall, ['market_bonus', 'decay_per_cell', 'cap'], ['market_bonus', 'decay_per_cell', 'cap'], '$.coefficients.footfall')) { num(C.footfall.market_bonus, '$.coefficients.footfall.market_bonus', 0, 2); num(C.footfall.decay_per_cell, '$.coefficients.footfall.decay_per_cell', 0.05, 1); num(C.footfall.cap, '$.coefficients.footfall.cap', 0, 2); }
        if (keys(C.market_visitors_per_min, Object.keys(isPlain(C.market_visitors_per_min) ? C.market_visitors_per_min : {}).filter(function (k) { return ITEM_RE.test(k) && !BAD.test(k); }), [], '$.coefficients.market_visitors_per_min'))
          Object.keys(C.market_visitors_per_min).forEach(function (k) { num(C.market_visitors_per_min[k], '$.coefficients.market_visitors_per_min.' + safe(k), 0, 100); });
      }

      /* building plots */
      var used = {};
      var T = D.home_template;
      if (keys(T, ['recipe', 'capacity'], ['recipe', 'capacity'], '$.home_template')) { str(T.recipe, '$.home_template.recipe', PATH_RE, 120); num(T.capacity, '$.home_template.capacity', 1, 12, true); }
      var slotKeys = {};
      if (arr(D.home_slots, '$.home_slots', 16)) D.home_slots.forEach(function (c, i) { if (cell(c, '$.home_slots[' + i + ']', g)) { var k = c.join(','); if (road[k]) E('$.home_slots[' + i + ']', 'is a road cell'); if (slotKeys[k]) E('$.home_slots[' + i + ']', 'is listed twice'); slotKeys[k] = 1; } });
      var ids = {}, nHomes = 0;
      if (arr(D.buildings, '$.buildings', 60)) D.buildings.forEach(function (b, i) {
        var p = '$.buildings[' + i + ']';
        if (!keys(b, B_KEYS, B_REQ, p)) return;
        if (str(b.id, p + '.id', ID_RE, 32)) { if (ids[b.id]) E(p + '.id', 'is used twice'); ids[b.id] = 1; }
        str(b.recipe, p + '.recipe', PATH_RE, 120);
        if (KINDS.indexOf(b.kind) < 0) E(p + '.kind', 'must be one of ' + KINDS.join(', '));
        if (cell(b.cell, p + '.cell', g)) {
          var k = b.cell.join(',');
          if (road[k]) E(p + '.cell', 'is a road cell'); if (used[k]) E(p + '.cell', 'is already taken by another building'); used[k] = 1;
          if (b.kind !== 'home' && slotKeys[k]) E(p + '.cell', 'sits on a home plot');
        }
        if (b.sidecars != null && arr(b.sidecars, p + '.sidecars', 4)) b.sidecars.forEach(function (s, j) { str(s, p + '.sidecars[' + j + ']', PATH_RE, 120); });
        if (b.kind === 'home') {
          nHomes++;
          if (keys(b.residents, ['capacity', 'now'], ['capacity', 'now'], p + '.residents')) { var okc = num(b.residents.capacity, p + '.residents.capacity', 1, 12, true); if (num(b.residents.now, p + '.residents.now', 0, 12, true) && okc && b.residents.now > b.residents.capacity) E(p + '.residents.now', 'cannot be more than the capacity'); }
          ['employs', 'hire_priority', 'draw_kw'].forEach(function (k) { if (b[k] != null) E(p + '.' + k, 'only machine buildings have this'); });
        } else {
          if (b.residents != null) E(p + '.residents', 'only homes have residents');
          if (b.employs != null && typeof b.employs !== 'boolean') E(p + '.employs', 'must be true or false');
          if (b.hire_priority != null) num(b.hire_priority, p + '.hire_priority', 0, 20, true);
          if (b.draw_kw != null) num(b.draw_kw, p + '.draw_kw', 0, 20);
        }
      });

      /* events */
      if (D.events != null && arr(D.events, '$.events', 40)) D.events.forEach(function (e, i) {
        var p = '$.events[' + i + ']';
        if (!keys(e, ['t', 'action', 'cell', 'value'], ['t', 'action'], p)) return;
        num(e.t, p + '.t', 0, 36000, true);
        if (ACTIONS.indexOf(e.action) < 0) { E(p + '.action', 'must be one of ' + ACTIONS.join(', ')); return; }
        if (e.action === 'supply_scale') { if (num(e.value, p + '.value', 0, 3) && e.cell != null) E(p + '.cell', 'a supply event has no cell'); }
        else { if (e.value != null) E(p + '.value', 'a road event has no value'); if (cell(e.cell, p + '.cell', g) && !road[e.cell.join(',')]) E(p + '.cell', 'is not a road cell'); }
      });

      /* recipes and sidecars: only when the files are given */
      if (files && details.length === 0) checkFiles();
    }

    function checkFiles() {
      var seenRecipe = {};
      function recipeOf(path, at) {
        var R = files[path]; if (!R) { E(at, "recipe file '" + path + "' was not provided"); return null; }
        if (!seenRecipe[path]) { seenRecipe[path] = 1; var v = VAL.validate(R); if (!v.ok) E(at, "recipe '" + path + "' fails the v1 validator: " + v.errors[0]); }
        return R;
      }
      recipeOf(D.home_template.recipe, '$.home_template.recipe');
      D.buildings.forEach(function (b, i) {
        var p = '$.buildings[' + i + ']', R = recipeOf(b.recipe, p + '.recipe'); if (!R) return;
        var Y = R.systems || {};
        if (b.kind === 'shop' || b.kind === 'market') { if (!Y.sales) E(p + '.kind', 'a ' + b.kind + ' needs a recipe with a sales block'); else if (!(D.coefficients.per_resident_per_min[Y.sales.item] > 0)) E(p + '.kind', "the district gives residents no demand for '" + Y.sales.item + "'"); }
        if (b.kind === 'workshop' && !Y.production) E(p + '.kind', 'a workshop needs a recipe with a production block');
        if (b.employs && !(Y.jobs && Y.jobs.length)) E(p + '.employs', 'this recipe has no jobs to fill');
        (b.sidecars || []).forEach(function (s, j) {
          var sc = files[s], sp = p + '.sidecars[' + j + ']';
          if (!sc) { E(sp, "sidecar file '" + s + "' was not provided"); return; }
          if (!isPlain(sc) || sc.schema !== 'city_evolution' || sc.version !== 0 || !Array.isArray(sc.branches)) { E(sp, 'is not a city_evolution version 0 sidecar'); return; }
          if (!sc.recipe || sc.recipe.id !== R.id || sc.recipe.version !== R.version) E(sp, 'is linked to another recipe (id or version does not match)');
          if (opts.shas && opts.shas[b.recipe] && sc.recipe && sc.recipe.sha256 !== opts.shas[b.recipe]) E(sp, 'recipe SHA-256 does not match the recipe file');
        });
        if (details.length === 0 && (b.sidecars || []).length) {
          try {
            var branches = []; b.sidecars.forEach(function (s) { files[s].branches.forEach(function (x) { branches.push(x); }); });
            var P = DI.applyBranches(R, branches), v = VAL.validate(P);
            if (!v.ok) E(p + '.sidecars', 'the patched recipe fails the v1 validator: ' + v.errors[0]);
          } catch (e) { E(p + '.sidecars', 'cannot be applied: ' + String(e.message).replace(BAD, '?').slice(0, 80)); }
        }
      });
    }
  }

  return { validate: validate, parse: function (text, files, opts) { var o; try { o = JSON.parse(text); } catch (e) { return { ok: false, errors: ['$: not valid JSON'], details: [{ path: '$', msg: 'not valid JSON' }] }; } var r = validate(o, files, opts); r.district = r.ok ? o : null; return r; } };
});
