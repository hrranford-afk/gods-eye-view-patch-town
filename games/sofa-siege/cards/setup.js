/* setup.js: the card setup flow for Round Table Kingdom, as separate small modules (handover section 6).
   One global: RTK_SETUP = { CARDS, CardRegistry, CardDetectorAdapter, PlacementPreview, SetupState, LockedPlacementStore }.
   Plain JavaScript, no libraries, no DOM needed (PlacementPreview.draw takes a 2D canvas context).
   It knows nothing about the game's rules: it only turns card sightings into a locked JSON record.

   THE TABLE FRAME (what every saved number means):
     origin  = the centre of the WORLD ANCHOR card
     x       = to the right of the anchor's artwork
     y       = towards the TOP of the anchor's artwork (away from its tagline)
     z       = up from the table
     yaw_deg = turn of a card about z, counter-clockwise seen from above; 0 = same way up as the anchor
     units   = millimetres, taken from the anchor's printed size (210 x 148.5 mm)
   How a card's place is found: both cards lie on the same table, so (anchor homography)^-1 x (card homography)
   maps the card straight into the anchor's millimetres. No camera lens data is needed for that.
   Card art is untrusted picture data. Nothing read from a card is ever run. */
var RTK_SETUP = (function () {
  'use strict';
  var CARD_W = 210, CARD_H = 148.5, SCHEMA = 1, STORE_KEY = 'rtk.locked_placements.v1';
  var CARDS = [
    { id: '00', kind: 'world_anchor', name: 'WORLD ANCHOR', required: true },
    { id: '01', kind: 'blue_base', name: 'BLUE BASE', required: true },
    { id: '02', kind: 'red_base', name: 'RED BASE', required: true },
    { id: '03', kind: 'capture_flag', name: 'CAPTURE FLAG', required: true },
    { id: '04', kind: 'hill', name: 'HILL', required: false },
    { id: '05', kind: 'build_camp', name: 'BUILD CAMP', required: false }
  ];
  function byId(id) { for (var i = 0; i < CARDS.length; i++) if (CARDS[i].id === id) return CARDS[i]; return null; }
  function inv3(m) { var a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5], g = m[6], h = m[7], i = m[8], A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C; if (Math.abs(det) < 1e-18) return null; return [A / det, (c * h - b * i) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, (c * d - a * f) / det, C / det, (b * g - a * h) / det, (a * e - b * d) / det]; }
  function mul3(A, B) { var C = new Array(9); for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return C; }
  function ap(H, x, y) { var w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; }
  function median(a) { if (!a.length) return NaN; var s = a.slice().sort(function (x, y) { return x - y; }); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; }
  function wrapDeg(a) { a = a % 360; if (a > 180) a -= 360; if (a <= -180) a += 360; return a; }

  /* Where is card B in the anchor's table frame? Ha, Hb: card mm (x right, y DOWN the artwork, centred) -> picture pixels. */
  function relative(Ha, Hb) {
    var Hi = inv3(Ha); if (!Hi) return null; var M = mul3(Hi, Hb), src = [[-CARD_W / 2, -CARD_H / 2], [CARD_W / 2, -CARD_H / 2], [CARD_W / 2, CARD_H / 2], [-CARD_W / 2, CARD_H / 2]], q = [], i, cx = 0, cy = 0;
    for (i = 0; i < 4; i++) { var w = M[6] * src[i][0] + M[7] * src[i][1] + M[8]; if (!(w * M[8] > 0)) return null; var p = ap(M, src[i][0], src[i][1]); q.push([p[0], -p[1]]); cx += p[0] / 4; cy += -p[1] / 4; } /* flip to y up */
    var a = 0, b = 0, pp = 0; for (i = 0; i < 4; i++) { var px = src[i][0], py = -src[i][1], qx = q[i][0] - cx, qy = q[i][1] - cy; a += px * qx + py * qy; b += px * qy - py * qx; pp += px * px + py * py; }
    var yaw = Math.atan2(b, a), sc = Math.sqrt(a * a + b * b) / pp, c = Math.cos(yaw), s = Math.sin(yaw), res = 0;
    for (i = 0; i < 4; i++) { var px2 = src[i][0], py2 = -src[i][1], ex = cx + c * px2 - s * py2 - q[i][0], ey = cy + s * px2 + c * py2 - q[i][1]; res += ex * ex + ey * ey; }
    return { x_mm: cx, y_mm: cy, yaw_deg: yaw * 180 / Math.PI, scale: sc, residual_mm: Math.sqrt(res / 4) };
  }

  /* ---------- CardRegistry: what has been seen, when, and in what state ---------- */
  function CardRegistry(opts) {
    opts = opts || {}; var lostAfter = opts.lostAfterMs || 1500, ambMargin = opts.ambiguousMargin === undefined ? 0.1 : opts.ambiguousMargin, R = { entries: {}, events: [] };
    CARDS.forEach(function (c) { R.entries[c.id] = { id: c.id, kind: c.kind, name: c.name, required: c.required, state: 'NOT_SEEN', first_seen_ms: null, last_seen_ms: null, sightings: 0, ambiguous: 0, last: null, samples: [] }; });
    function ev(t, type, id, extra) { var e = { t_ms: Math.round(t), type: type, card_id: id }; if (extra) for (var k in extra) e[k] = extra[k]; R.events.push(e); if (R.events.length > 400) R.events.shift(); }
    R.update = function (sightings, t) { /* returns the sightings that are safe to use for placement */
      var good = [];
      (sightings || []).forEach(function (s) { var e = R.entries[s.id]; if (!e) { ev(t, 'unknown_id', String(s.id)); return; }
        if (s.margin !== undefined && s.margin !== null && s.margin < ambMargin) { e.ambiguous++; ev(t, 'ambiguous_identity', s.id, { margin: +s.margin.toFixed(3) }); return; } /* never guess between two cards */
        if (e.state === 'NOT_SEEN') { e.first_seen_ms = Math.round(t); ev(t, 'first_seen', s.id); } else if (e.state === 'LOST') ev(t, 'regained', s.id);
        e.state = 'TRACKING'; e.last_seen_ms = Math.round(t); e.sightings++; e.last = s;
        e.samples.push({ t_ms: Math.round(t), inliers: s.inliers === undefined ? null : s.inliers, quality: s.quality === undefined ? null : +(+s.quality).toFixed(3), distance_mm: s.pose ? Math.round(s.pose.distance_mm) : null }); if (e.samples.length > 60) e.samples.shift();
        good.push(s); });
      CARDS.forEach(function (c) { var e = R.entries[c.id]; if (e.state === 'TRACKING' && t - e.last_seen_ms > lostAfter) { e.state = 'LOST'; ev(t, 'lost', c.id); } });
      return good; };
    R.event = ev;
    R.snapshot = function () { return CARDS.map(function (c) { var e = R.entries[c.id], d = e.samples.map(function (s) { return s.distance_mm; }).filter(function (v) { return v !== null; });
      return { card_id: e.id, kind: e.kind, name: e.name, state: e.state, first_seen_ms: e.first_seen_ms === null ? 'UNKNOWN' : e.first_seen_ms, last_seen_ms: e.last_seen_ms === null ? 'UNKNOWN' : e.last_seen_ms, sightings: e.sightings, ambiguous_sightings: e.ambiguous, distance_mm: d.length ? { min: Math.min.apply(null, d), median: median(d), max: Math.max.apply(null, d) } : 'UNKNOWN', recent: e.samples.slice(-20) }; }); };
    return R;
  }

  /* ---------- CardDetectorAdapter: the only place that knows which tracker is used ---------- */
  function CardDetectorAdapter(cv) {
    /* cv: CV_CARDS (or anything with init/detect/pose of the same shape). Another tracker can be swapped in by
       writing another adapter that returns the same sighting objects. */
    return { provider: 'cardvision.js natural-feature matcher',
      init: function (images) { return cv.init(images); },
      detect: function (gray, w, h, K) { return this.normalise(cv.detect(gray, w, h), K, function (d) { return cv.pose(d, K, { w: CARD_W, h: CARD_H }); }); },
      normalise: function (dets, K, poseFn) { return (dets || []).map(function (d) { var c = byId(d.id), p = d.pose !== undefined ? d.pose : (K && poseFn ? poseFn(d) : null);
        return { id: d.id, kind: c ? c.kind : 'unknown', name: c ? c.name : 'UNKNOWN', inliers: d.inliers, quality: d.score, margin: d.margin, corners: d.corners, H: d.H, pose: p || null }; }); } };
  }

  /* ---------- SetupState: previews follow the cards until LOCK TABLE; after that nothing moves ---------- */
  function SetupState(opts) {
    opts = opts || {}; var windowMs = opts.windowMs || 1500, maxSamples = opts.maxSamples || 12, lostAfter = opts.lostAfterMs || 1500;
    var S = { state: 'SCANNING', table_id: opts.tableId || 'local_test_table', anchorSeen: false, anchorVisible: false, anchorLast: null, placements: {}, locked: null, log: [] };
    CARDS.forEach(function (c) { if (c.id !== '00') S.placements[c.id] = { card_id: c.id, kind: c.kind, status: 'NOT_SCANNED', source: null, t: null, samples: [], last_seen_ms: null, quality: null }; });
    function note(t, type, id, extra) { var e = { t_ms: Math.round(t), type: type, card_id: id || null }; if (extra) for (var k in extra) e[k] = extra[k]; S.log.push(e); if (S.log.length > 300) S.log.shift(); if (opts.onEvent) opts.onEvent(e); }
    S.update = function (sightings, t) { /* sightings: the SAFE ones from CardRegistry.update, all from ONE camera frame */
      if (S.state === 'LOCKED') return; /* locked: cards are no longer controls */
      var anchor = null, i; for (i = 0; i < sightings.length; i++) if (sightings[i].id === '00') anchor = sightings[i];
      S.anchorVisible = !!anchor; if (anchor) { S.anchorSeen = true; S.anchorLast = t; }
      if (anchor) sightings.forEach(function (s) { var p = S.placements[s.id]; if (!p || p.source === 'manual_touch') return; var rel = relative(anchor.H, s.H);
        if (!rel || Math.abs(rel.scale - 1) > 0.12 || rel.residual_mm > 15) { note(t, 'bad_geometry', s.id, rel ? { scale: +rel.scale.toFixed(3), residual_mm: +rel.residual_mm.toFixed(1) } : null); return; } /* the two outlines do not agree on one flat table: do not use */
        p.samples.push({ t: t, x: rel.x_mm, y: rel.y_mm, yaw: rel.yaw_deg, res: rel.residual_mm, sc: rel.scale, q: s.quality }); p.last_seen_ms = t; });
      CARDS.forEach(function (c) { var p = S.placements[c.id]; if (!p || p.source === 'manual_touch') return;
        p.samples = p.samples.filter(function (m) { return t - m.t <= windowMs; }).slice(-maxSamples);
        if (p.samples.length) { var mx = median(p.samples.map(function (m) { return m.x; })), my = median(p.samples.map(function (m) { return m.y; })), sx = 0, sy = 0; p.samples.forEach(function (m) { sx += Math.cos(m.yaw * Math.PI / 180); sy += Math.sin(m.yaw * Math.PI / 180); });
          if (p.status === 'LOST') note(t, 'placement_regained', c.id); p.status = 'PREVIEW'; p.source = 'card_scan';
          p.t = { x_mm: mx, y_mm: my, z_mm: 0, yaw_deg: Math.atan2(sy, sx) * 180 / Math.PI };
          p.quality = { samples: p.samples.length, spread_mm: median(p.samples.map(function (m) { return Math.hypot(m.x - mx, m.y - my); })), rigid_residual_mm: median(p.samples.map(function (m) { return m.res; })), scale: median(p.samples.map(function (m) { return m.sc; })) }; }
        else if (p.status === 'PREVIEW' && p.last_seen_ms !== null && t - p.last_seen_ms > lostAfter) { p.status = 'LOST'; note(t, 'placement_lost', c.id); } }); };
    S.setManual = function (id, x_mm, y_mm, yaw_deg, t) { var p = S.placements[id]; if (!p || S.state === 'LOCKED') return false; p.status = 'MANUAL'; p.source = 'manual_touch'; p.samples = []; p.t = { x_mm: x_mm, y_mm: y_mm, z_mm: 0, yaw_deg: wrapDeg(yaw_deg || 0) }; p.quality = null; note(t || 0, 'manual_place', id); return true; };
    S.clearManual = function (id, t) { var p = S.placements[id]; if (!p || S.state === 'LOCKED' || p.source !== 'manual_touch') return false; p.status = 'NOT_SCANNED'; p.source = null; p.t = null; note(t || 0, 'manual_clear', id); return true; };
    S.mode = function () { var scan = 0, man = 0; CARDS.forEach(function (c) { var p = S.placements[c.id]; if (!p || !p.t) return; if (p.source === 'manual_touch') man++; else scan++; }); return man && scan ? 'mixed' : man ? 'manual_touch' : 'card_scan'; };
    S.canLock = function () { var missing = []; CARDS.forEach(function (c) { if (c.required && c.id !== '00' && !S.placements[c.id].t) missing.push(c.name); });
      var mode = S.mode(); if (mode !== 'manual_touch' && !S.anchorSeen) missing.unshift('WORLD ANCHOR'); /* all-touch layouts use the virtual table centre as the anchor */
      return { ok: missing.length === 0 && S.state !== 'LOCKED', missing: missing }; };
    S.lock = function (t) { var c = S.canLock(); if (!c.ok) { note(t || 0, 'lock_refused', null, { missing: c.missing }); return { ok: false, reason: S.state === 'LOCKED' ? 'Already locked' : 'Not placed yet: ' + c.missing.join(', '), missing: c.missing }; }
      S.locked = LockedPlacementStore.build(S); S.state = 'LOCKED'; note(t || 0, 'locked'); return { ok: true, locked: S.locked }; };
    S.unlock = function (t) { if (S.state !== 'LOCKED') return false; S.state = 'SCANNING'; S.locked = null; CARDS.forEach(function (c) { var p = S.placements[c.id]; if (p && p.source !== 'manual_touch') { p.samples = []; if (p.t) { p.status = 'LOST'; } } }); note(t || 0, 'unlocked'); return true; };
    S.messages = function (t) { var m = [];
      if (S.state === 'LOCKED') { m.push({ level: 'ok', text: 'Table locked. Moving a card now changes nothing. Press "Unlock and re-scan" to change the layout.' }); return m; }
      var mode = S.mode();
      if (!S.anchorSeen && mode !== 'manual_touch') m.push({ level: 'info', text: 'Put WORLD ANCHOR flat on the table and point the camera at it. Or place the pieces by touch below.' });
      else if (S.anchorSeen && !S.anchorVisible) m.push({ level: 'warn', text: 'WORLD ANCHOR is out of view. Previews are frozen until the camera sees it again. Keep it in the picture with the other cards.' });
      CARDS.forEach(function (c) { var p = S.placements[c.id]; if (p && p.status === 'LOST') m.push({ level: 'warn', text: c.name + ' is lost from view. Showing its last place. Show the card again, or place it by touch.' }); });
      var cl = S.canLock(); if (cl.ok) m.push({ level: 'ok', text: 'All needed cards are placed. Check the layout, then press LOCK TABLE.' }); else if (S.anchorSeen || mode === 'manual_touch') m.push({ level: 'info', text: 'Still to place: ' + cl.missing.join(', ') + '.' });
      PlacementPreview.check(PlacementPreview.layout(S), opts).forEach(function (w) { m.push({ level: 'warn', text: w }); });
      return m; };
    return S;
  }

  /* ---------- PlacementPreview: the layout as plain items, its warnings, and a small top-down drawing ---------- */
  var COLOURS = { world_anchor: '#f2c14e', blue_base: '#4a8df0', red_base: '#e2553d', capture_flag: '#f4f1e8', hill: '#5fb760', build_camp: '#b58a5a' };
  var PlacementPreview = {
    layout: function (S) { var src = S.state === 'LOCKED' && S.locked ? null : S, items = [{ card_id: '00', kind: 'world_anchor', name: 'WORLD ANCHOR', x_mm: 0, y_mm: 0, yaw_deg: 0, status: S.anchorSeen ? (S.state === 'LOCKED' ? 'LOCKED' : S.anchorVisible ? 'PREVIEW' : 'LOST') : (S.mode() === 'manual_touch' ? 'VIRTUAL' : 'NOT_SCANNED') }];
      CARDS.forEach(function (c) { var p = S.placements[c.id]; if (!p || !p.t) return; items.push({ card_id: c.id, kind: c.kind, name: c.name, x_mm: p.t.x_mm, y_mm: p.t.y_mm, yaw_deg: p.t.yaw_deg, status: S.state === 'LOCKED' ? 'LOCKED' : p.status, source: p.source }); });
      return items; },
    check: function (items, opts) { opts = opts || {}; var w = [], i, j, get = function (k) { for (var n = 0; n < items.length; n++) if (items[n].kind === k) return items[n]; return null; };
      for (i = 0; i < items.length; i++) for (j = i + 1; j < items.length; j++) { var d = Math.hypot(items[i].x_mm - items[j].x_mm, items[i].y_mm - items[j].y_mm); if (d < 150) w.push(items[i].name + ' and ' + items[j].name + ' overlap. Move them apart.'); }
      var b = get('blue_base'), r = get('red_base'), f = get('capture_flag'), h = get('hill');
      if (b && r) { var dbr = Math.hypot(b.x_mm - r.x_mm, b.y_mm - r.y_mm); if (dbr < 400) w.push('BLUE BASE and RED BASE are very close (' + Math.round(dbr) + ' mm). Put them at opposite edges.'); }
      if (b && r && f) { var df1 = Math.hypot(f.x_mm - b.x_mm, f.y_mm - b.y_mm), df2 = Math.hypot(f.x_mm - r.x_mm, f.y_mm - r.y_mm); if (Math.max(df1, df2) > 2.5 * Math.min(df1, df2)) w.push('CAPTURE FLAG is much nearer one base than the other. That may not be fair.'); }
      if (h) [b, r].forEach(function (x) { if (x && Math.hypot(h.x_mm - x.x_mm, h.y_mm - x.y_mm) < 250) w.push('HILL covers ' + x.name + '. Move it.'); });
      if (opts.tableRadiusMM) items.forEach(function (it) { if (Math.hypot(it.x_mm - (opts.tableCentreX || 0), it.y_mm - (opts.tableCentreY || 0)) > opts.tableRadiusMM - 80) w.push(it.name + ' is off the table edge.'); });
      return w; },
    viewScale: function (w, h, opts) { return Math.min(w, h) / 2 / ((opts && opts.viewRadiusMM) || 650); },
    toMM: function (px, py, w, h, opts) { var k = PlacementPreview.viewScale(w, h, opts); return [(px - w / 2) / k, -(py - h / 2) / k]; },
    draw: function (ctx, w, h, items, opts) { opts = opts || {}; var k = PlacementPreview.viewScale(w, h, opts), R = (opts.viewRadiusMM || 650), i;
      ctx.save(); ctx.fillStyle = '#3a2a1c'; ctx.fillRect(0, 0, w, h); ctx.translate(w / 2, h / 2);
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; for (i = 100; i <= R; i += 100) { ctx.beginPath(); ctx.arc(0, 0, i * k, 0, 2 * Math.PI); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-R * k, 0); ctx.lineTo(R * k, 0); ctx.moveTo(0, -R * k); ctx.lineTo(0, R * k); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '10px system-ui, sans-serif'; ctx.fillText('rings: 100 mm', -w / 2 + 6, h / 2 - 6);
      items.forEach(function (it) { ctx.save(); ctx.translate(it.x_mm * k, -it.y_mm * k); ctx.rotate(-it.yaw_deg * Math.PI / 180); var cw = CARD_W * k, ch = CARD_H * k, col = COLOURS[it.kind] || '#fff';
        ctx.globalAlpha = it.status === 'LOST' ? 0.5 : 1; ctx.fillStyle = col; ctx.strokeStyle = it.status === 'LOCKED' ? '#fff' : '#111'; ctx.lineWidth = it.status === 'LOCKED' ? 2.5 : 1.5; ctx.setLineDash(it.status === 'LOST' ? [5, 4] : it.status === 'MANUAL' || it.status === 'VIRTUAL' ? [2, 3] : []);
        ctx.fillRect(-cw / 2, -ch / 2, cw, ch); ctx.strokeRect(-cw / 2, -ch / 2, cw, ch); ctx.setLineDash([]);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(0, -ch / 2 + 3); ctx.lineTo(-5, -ch / 2 + 11); ctx.lineTo(5, -ch / 2 + 11); ctx.fill(); /* a small arrow at the top of the artwork */
        ctx.font = 'bold ' + Math.max(9, Math.round(ch * 0.26)) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(it.card_id, 0, 2); ctx.restore(); });
      ctx.restore(); }
  };

  /* ---------- LockedPlacementStore: the versioned JSON record, saved on the device ---------- */
  var LockedPlacementStore = {
    key: STORE_KEY,
    build: function (S) { var r3 = function (v) { return Math.round(v * 10) / 10; };
      return { schema_version: SCHEMA, table_id: S.table_id, reference_card_id: '00', placement_mode: S.mode(), locked_at: new Date().toISOString(),
        card_size_mm: { width: CARD_W, height: CARD_H }, units: { length: 'mm', angle: 'deg' },
        frame: 'origin = centre of card 00; x = right of its artwork; y = top of its artwork; z = up from the table; yaw_deg = counter-clockwise seen from above',
        anchor_scanned: !!S.anchorSeen,
        placements: CARDS.filter(function (c) { return c.id !== '00'; }).map(function (c) { var p = S.placements[c.id]; if (!p.t) return { card_id: c.id, kind: c.kind, transform_anchor_relative: null, status: 'NOT_SCANNED' };
          return { card_id: c.id, kind: c.kind, transform_anchor_relative: { x_mm: r3(p.t.x_mm), y_mm: r3(p.t.y_mm), z_mm: 0, yaw_deg: r3(wrapDeg(p.t.yaw_deg)) }, status: 'LOCKED', source: p.source, seen_at_lock: p.status === 'PREVIEW' || p.status === 'MANUAL', quality: p.quality ? { samples: p.quality.samples, spread_mm: r3(p.quality.spread_mm), rigid_residual_mm: r3(p.quality.rigid_residual_mm) } : null }; }) }; },
    validate: function (o) { var errs = []; if (!o || typeof o !== 'object') return ['not an object']; if (o.schema_version !== SCHEMA) errs.push('schema_version must be ' + SCHEMA); if (o.reference_card_id !== '00') errs.push('reference_card_id must be "00"'); if (!Array.isArray(o.placements)) errs.push('placements missing');
      else o.placements.forEach(function (p) { if (!byId(p.card_id)) errs.push('unknown card_id ' + p.card_id); else if (byId(p.card_id).kind !== p.kind) errs.push('kind does not match card ' + p.card_id); var t = p.transform_anchor_relative; if (t !== null && !(t && isFinite(t.x_mm) && isFinite(t.y_mm) && isFinite(t.yaw_deg))) errs.push('bad transform for ' + p.card_id); if (t === null && p.status !== 'NOT_SCANNED') errs.push('null transform but status ' + p.status); });
      return errs; },
    save: function (o, storage) { var e = LockedPlacementStore.validate(o); if (e.length) return { ok: false, errors: e }; try { (storage || localStorage).setItem(STORE_KEY, JSON.stringify(o)); return { ok: true }; } catch (x) { return { ok: false, errors: ['storage: ' + x.message] }; } },
    load: function (storage) { try { var s = (storage || localStorage).getItem(STORE_KEY); if (!s) return null; var o = JSON.parse(s); return LockedPlacementStore.validate(o).length ? null : o; } catch (x) { return null; } },
    clear: function (storage) { try { (storage || localStorage).removeItem(STORE_KEY); } catch (x) { /* nothing to clear */ } },
    /* For the game: millimetres on the real table -> the game's own table units (three.js: x right, z towards the player, y up).
       opts: { mmPerUnit (needed), originX, originZ (where the anchor sits in the game, default 0,0), turnDeg (anchor's turn in the game, default 0) } */
    toTableUnits: function (o, opts) { opts = opts || {}; var k = 1 / (opts.mmPerUnit || 1000), a = (opts.turnDeg || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      return o.placements.map(function (p) { var t = p.transform_anchor_relative; if (!t) return { card_id: p.card_id, kind: p.kind, placed: false }; var x = t.x_mm * k, y = t.y_mm * k, gx = c * x - s * y, gy = s * x + c * y;
        return { card_id: p.card_id, kind: p.kind, placed: true, x: (opts.originX || 0) + gx, z: (opts.originZ || 0) - gy, rotY: (t.yaw_deg + (opts.turnDeg || 0)) * Math.PI / 180, source: p.source }; }); }
  };

  return { CARDS: CARDS, CARD_W: CARD_W, CARD_H: CARD_H, relative: relative, CardRegistry: CardRegistry, CardDetectorAdapter: CardDetectorAdapter, PlacementPreview: PlacementPreview, SetupState: SetupState, LockedPlacementStore: LockedPlacementStore, COLOURS: COLOURS };
})();
