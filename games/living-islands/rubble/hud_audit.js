/* shared by test_hud.js and test_page_smoke.js: the visible controls and text blocks as rectangles (collect runs in the page), and the audit (on screen, 44 px, no overlaps) */
'use strict';
/* runs in the page: the visible controls and text blocks, as rectangles */
function collect(scope) {
  var W = innerWidth, H = innerHeight, root = scope ? document.querySelector(scope) : document, out = [];
  function vis(e) { var cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return null; var r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return null; return r; }
  Array.prototype.forEach.call(root.querySelectorAll('button,input,select,textarea'), function (e) {
    if (!scope && e.closest('#drawer')) { if (!vis(e)) return; }
    var r = vis(e); if (!r) return; out.push({ id: e.id || (e.dataset && e.dataset.k ? 'ammo:' + e.dataset.k : e.className || e.tagName), r: { l: r.left, t: r.top, r: r.right, b: r.bottom }, ctl: true });
  });
  if (!scope) ['score', 'keepEnd', 'hint', 'ammoNote', 'status'].forEach(function (id) { var e = document.getElementById(id), r = e && vis(e); if (r) out.push({ id: '#' + id, r: { l: r.left, t: r.top, r: r.right, b: r.bottom }, ctl: false }); });
  return { W: W, H: H, items: out };
}
function audit(check, label, d, minSize) {
  var it = d.items, probs = [], i, j, a, b;
  for (i = 0; i < it.length; i++) {
    a = it[i]; var w = a.r.r - a.r.l, h = a.r.b - a.r.t;
    if (a.r.l < -0.5 || a.r.t < -0.5 || a.r.r > d.W + 0.5 || a.r.b > d.H + 0.5) probs.push('off screen: ' + a.id);
    if (a.ctl && (w < minSize - 0.5 || h < minSize - 0.5)) probs.push('too small ' + a.id + ' ' + Math.round(w) + 'x' + Math.round(h));
    for (j = i + 1; j < it.length; j++) { b = it[j]; var ox = Math.min(a.r.r, b.r.r) - Math.max(a.r.l, b.r.l), oy = Math.min(a.r.b, b.r.b) - Math.max(a.r.t, b.r.t); if (ox > 2 && oy > 2) probs.push('overlap ' + a.id + ' / ' + b.id); }
  }
  check(label + ': ' + it.filter(function (x) { return x.ctl; }).length + ' controls, all on screen, 44 px or more, no overlaps', probs.length === 0, probs.slice(0, 6).join('; '));
  return probs;
}
module.exports = { collect: collect, audit: audit };
