/* City Lab: the city_infra file validator (schema city_infra, version 0). Pure JS, no DOM, no requires: runs in Node and in the browser.
   An infra file is DATA: read with JSON.parse only, checked here, never executed, evaluated or fetched by this file. Strict keys (unknown keys refused), numeric ranges,
   ids that must exist in the district it is linked to (by id, version and SHA-256), a TREE of cables (exactly one parent each, no cycles, a single root), sources only at the
   root, and no code-looking strings. validate(I, D, opts) never throws; it returns {ok, errors, details}. D is the parsed district file; opts.districtSha is its SHA-256 (hex)
   when the caller can compute it (the link is then checked, otherwise only id and version are). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CityInfraValidate = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var BAD = /(<|>|`|\$\{|=>|__proto__|constructor|prototype|eval|function|javascript|script|https?:|ftp:|data:|:\/\/|www\.|\bimport\b|\brequire\b|document\.|cookie|localstorage|innerhtml|onerror|onload|\.\.\/|\\|[\u0000-\u001f\u007f])/i;
  var ID_RE = /^[a-z][a-z0-9_]{0,31}$/, TEXT_RE = /^[A-Za-z0-9 .,'!&()\/+-]*$/, SHA_RE = /^[0-9a-f]{64}$/;
  var TOP = ['schema', 'version', 'id', 'name', 'district', 'root', 'junctions', 'sources', 'cables', 'home_cable'];
  var TOP_REQ = ['schema', 'version', 'id', 'name', 'district', 'root', 'junctions', 'sources', 'cables'];
  var J_KEYS = ['id', 'name', 'cell'], J_REQ = ['id', 'name'];
  var S_KEYS = ['id', 'building', 'kw', 'build_cost', 'upkeep_per_min', 'at'], S_REQ = ['id', 'building', 'kw', 'build_cost', 'upkeep_per_min'];
  var C_KEYS = ['id', 'name', 'from', 'to', 'capacity_kw', 'build_cost', 'upkeep_per_min'];
  var H_KEYS = ['to', 'capacity_kw', 'build_cost', 'upkeep_per_min'];
  function isPlain(o) { if (o === null || typeof o !== 'object' || Array.isArray(o)) return false; var p = Object.getPrototypeOf(o); return p === Object.prototype || p === null; }

  function validate(I, D, opts) {
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
      if (ks.length > 60) { E(path, 'too many keys'); return false; }
      ks.forEach(function (k) { if (allowed.indexOf(k) < 0) E(path + '.' + safe(k), 'unknown key'); });
      (required || []).forEach(function (k) { if (!Object.prototype.hasOwnProperty.call(o, k)) E(path + '.' + k, 'is required'); });
      return true;
    }
    function num(v, path, lo, hi) {
      if (typeof v !== 'number' || !isFinite(v)) { E(path, 'must be a finite number'); return false; }
      if (v < lo || v > hi) { E(path, 'must be between ' + lo + ' and ' + hi + ' (got ' + v + ')'); return false; }
      return true;
    }
    function str(v, path, re, maxLen) {
      if (typeof v !== 'string') { E(path, 'must be a string'); return false; }
      if (v.length > (maxLen || 60)) { E(path, 'is too long'); return false; }
      if (BAD.test(v)) { E(path, 'looks like code, a link or markup, which an infra file may not contain'); return false; }
      if (re && !re.test(v)) { E(path, 'has characters or a shape that is not allowed'); return false; }
      return true;
    }
    function arr(v, path, max) { if (!Array.isArray(v)) { E(path, 'must be a list'); return false; } if (v.length > max) { E(path, 'has too many entries (limit ' + max + ')'); return false; } return true; }
    function cost(o, k, path) { num(o[k], path + '.' + k, 0, 100000); }

    function run() {
      if (!keys(I, TOP, TOP_REQ, '$')) return;
      if (I.schema !== 'city_infra') E('$.schema', "must be 'city_infra'");
      if (I.version !== 0) E('$.version', 'must be 0');
      str(I.id, '$.id', ID_RE, 32); str(I.name, '$.name', TEXT_RE, 60);
      /* the link to ONE district: id, version, SHA-256 */
      if (keys(I.district, ['id', 'version', 'sha256'], ['id', 'version', 'sha256'], '$.district')) {
        str(I.district.id, '$.district.id', ID_RE, 32); num(I.district.version, '$.district.version', 0, 0);
        if (str(I.district.sha256, '$.district.sha256', SHA_RE, 64)) { if (opts.districtSha && I.district.sha256 !== opts.districtSha) E('$.district.sha256', 'does not match the district file (it was changed after this infra file was made)'); }
        if (D && isPlain(D)) { if (I.district.id !== D.id) E('$.district.id', "is linked to another district ('" + safe(I.district.id) + "' is not this district)"); if (I.district.version !== D.version) E('$.district.version', 'does not match the district version'); }
      }
      if (!D || !isPlain(D) || !Array.isArray(D.buildings)) { if (D !== undefined) E('$', 'the district file is needed to check the ids'); }
      var g = D && isPlain(D) && D.grid ? D.grid : { cols: 16, rows: 12 }, bld = {};
      if (D && Array.isArray(D.buildings)) D.buildings.forEach(function (b) { if (b && typeof b.id === 'string') bld[b.id] = b; });
      var node = {};   /* every id a cable may name: junctions and buildings (never both) */

      /* junctions */
      var rootOk = str(I.root, '$.root', ID_RE, 32), jn = {};
      if (arr(I.junctions, '$.junctions', 24)) I.junctions.forEach(function (j, i) {
        var p = '$.junctions[' + i + ']'; if (!keys(j, J_KEYS, J_REQ, p)) return;
        if (str(j.id, p + '.id', ID_RE, 32)) { if (jn[j.id]) E(p + '.id', 'is used twice'); else if (bld[j.id]) E(p + '.id', 'is also a building id'); jn[j.id] = 1; node[j.id] = 'junction'; }
        str(j.name, p + '.name', TEXT_RE, 40);
        if (j.cell != null) { if (arr(j.cell, p + '.cell', 2) && j.cell.length === 2) { num(j.cell[0], p + '.cell[0]', 0, g.cols - 1); num(j.cell[1], p + '.cell[1]', 0, g.rows - 1); if (Math.floor(j.cell[0]) !== j.cell[0] || Math.floor(j.cell[1]) !== j.cell[1]) E(p + '.cell', 'must be whole numbers'); } else if (Array.isArray(j.cell)) E(p + '.cell', 'must be [column, row]'); }
      });
      if (rootOk && !jn[I.root]) E('$.root', 'must be one of the junction ids');

      /* sources: all at the root; a building may be a source once */
      var sb = {}, sid = {};
      if (arr(I.sources, '$.sources', 8)) {
        if (I.sources.length === 0) E('$.sources', 'needs at least one source');
        I.sources.forEach(function (s, i) {
          var p = '$.sources[' + i + ']'; if (!keys(s, S_KEYS, S_REQ, p)) return;
          if (str(s.id, p + '.id', ID_RE, 32)) { if (sid[s.id]) E(p + '.id', 'is used twice'); sid[s.id] = 1; }
          if (str(s.building, p + '.building', ID_RE, 32)) {
            if (!bld[s.building]) E(p + '.building', "is not a building of the district ('" + safe(s.building) + "')");
            else if (bld[s.building].kind !== 'shed') E(p + '.building', 'a source must stand in a shed building (a generator shed), not a ' + bld[s.building].kind);
            if (sb[s.building]) E(p + '.building', 'this building is already a source (give each generator its own shed)'); sb[s.building] = 1;
          }
          num(s.kw, p + '.kw', 0.1, 200); cost(s, 'build_cost', p); cost(s, 'upkeep_per_min', p);
          if (s.at != null) { if (typeof s.at !== 'string' || s.at !== I.root) E(p + '.at', 'in this version a source may only sit at the root junction; a source elsewhere would be a separate tree, which is not supported'); }
        });
      }

      /* cables: a tree */
      var parent = {}, kids = {}, cid = {};
      if (arr(I.cables, '$.cables', 80)) I.cables.forEach(function (c, i) {
        var p = '$.cables[' + i + ']'; if (!keys(c, C_KEYS, C_KEYS, p)) return;
        if (str(c.id, p + '.id', ID_RE, 32)) { if (cid[c.id]) E(p + '.id', 'is used twice'); cid[c.id] = 1; }
        str(c.name, p + '.name', TEXT_RE, 40); num(c.capacity_kw, p + '.capacity_kw', 0.1, 500); cost(c, 'build_cost', p); cost(c, 'upkeep_per_min', p);
        var okF = str(c.from, p + '.from', ID_RE, 32), okT = str(c.to, p + '.to', ID_RE, 32);
        if (okF) { if (!node[c.from] && !bld[c.from]) E(p + '.from', "is not a junction or a building ('" + safe(c.from) + "')"); else if (!node[c.from]) E(p + '.from', 'a building cannot feed another one: only junctions have cables leaving them'); }
        if (okT) {
          if (!node[c.to] && !bld[c.to]) E(p + '.to', "is not a junction or a building ('" + safe(c.to) + "')");
          else if (sb[c.to]) E(p + '.to', 'a generator shed powers itself and takes no cable');
          else if (I.root === c.to) E(p + '.to', 'the root junction cannot have a cable coming into it');
          else if (parent[c.to]) E(p + '.to', "has two cables coming in ('" + safe(c.to) + "'): a tree allows exactly one parent");
          else { parent[c.to] = c.from; if (okF) { (kids[c.from] = kids[c.from] || []).push(c.to); } }
        }
        if (okF && okT && c.from === c.to) E(p, 'a cable cannot join a junction to itself');
      });
      /* a single root: every other junction has a parent and is reachable from the root (this also refuses any cycle) */
      if (rootOk && jn[I.root] && details.length === 0) {
        var seen = {}, q = [I.root], h = 0; seen[I.root] = 1;
        while (h < q.length) { var k = q[h++]; (kids[k] || []).forEach(function (n) { if (!seen[n]) { seen[n] = 1; q.push(n); } }); }
        Object.keys(jn).forEach(function (j) { if (j !== I.root && !seen[j]) E('$.junctions', "'" + j + "' cannot be reached from the root (a second root, an orphan or a cycle): v0 allows one tree"); });
        Object.keys(parent).forEach(function (n) { if (!seen[n]) E('$.cables', "'" + n + "' hangs on a part of the network that does not reach the root"); });
      }
      /* homes added later attach to one junction by one small cable each */
      if (I.home_cable != null && keys(I.home_cable, H_KEYS, H_KEYS, '$.home_cable')) {
        if (str(I.home_cable.to, '$.home_cable.to', ID_RE, 32) && !jn[I.home_cable.to]) E('$.home_cable.to', 'must be a junction id');
        num(I.home_cable.capacity_kw, '$.home_cable.capacity_kw', 0.1, 50); cost(I.home_cable, 'build_cost', '$.home_cable'); cost(I.home_cable, 'upkeep_per_min', '$.home_cable');
      }
    }
  }
  return { validate: validate, parse: function (text, D, opts) { var o; try { o = JSON.parse(text); } catch (e) { return { ok: false, errors: ['$: not valid JSON'], details: [{ path: '$', msg: 'not valid JSON' }] }; } var r = validate(o, D, opts); r.infra = r.ok ? o : null; return r; } };
});
