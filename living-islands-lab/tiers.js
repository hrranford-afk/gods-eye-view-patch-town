/* Living Islands: the SHARED TIER TABLE. Pure data, no THREE, no DOM, no clock: one table of limits per device, read by islands_look.html (when the URL says &cost=1) and by sea_proto/index.html
   (also only with &cost=1). window.LI_TIERS in a page, globalThis.LI_TIERS after a plain import in node, module.exports in CommonJS. Tested by tests/tiers-test.js. See research/GRAPHICS_REVIEW.md.
   Every number is {v, s, src}:
     v    the value we use (or, for 'held' lines, the value we have seen work);
     s    its status: 'measured' = the owner's device report says it works (the src names the report), 'code' = the number the code already used before this table existed (no report behind it),
          'guess' = a rule of thumb nobody measured, 'unmeasured' = no report exists for this device at all;
     src  a short pointer to the report or the file.
   RULE: every Radeon and Radeon MAX number is 'unmeasured' until a real report from that machine arrives (the Radeon VII page run of 24 Nov is kept as evidence, but it measured the page, not these limits).
   EVIDENCE: the measured results this table must not contradict. tests/tiers-test.js checks every limit against it and checks the evidence against the research notes it quotes.
   Software GL (SwiftShader) numbers are never put here: they say nothing about a device. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.LI_TIERS = api;
}(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';
  const IPAD26 = 'research/SEA_BENCH_IPAD_26NOV.md', RAD24 = 'research/RADEON_FIRST_MEASUREMENT.md', CODE_SEA = 'sea_waves.js TIERS / sea_proto TIERS', CODE_PAGE = 'islands_look.html DEV_PRESETS and QUAL', NONE = 'no report yet';
  const n = (v, s, src) => ({ v, s, src });
  const STATUS = ['measured', 'code', 'guess', 'unmeasured'];
  const DEVICES = ['ipad', 'desktop', 'radeon', 'max'];

  /* the groups and keys every device must have. 'sea' = the wave sea, 'render' = pixels and passes, 'scene' = the whole-scene budget, 'frame' = the target */
  const SHAPE = {
    sea: ['rings', 'segs', 'waves', 'chop', 'ripples', 'spray', 'debris'],
    render: ['pixelRatioCap', 'renderScaleMax', 'msaa', 'shadowMap', 'aniso'],
    scene: ['tris', 'drawCalls'],
    frame: ['targetMs']
  };

  /* ---- iPad (the owner's Safari on an Apple GPU, 834x1062 css px, dpr 2) ---- */
  const ipad = {
    label: 'iPad',
    sea: {
      rings: n(72, 'code', CODE_SEA), segs: n(160, 'code', CODE_SEA), waves: n(8, 'code', CODE_SEA), chop: n(0, 'code', CODE_SEA), ripples: n(4, 'code', CODE_SEA),
      spray: n(600, 'code', CODE_SEA), debris: n(400, 'code', CODE_SEA)
    },
    render: {
      /* the sea bench: 1.5x the css size held 60 fps, 2x (native on this iPad) took 24.1 ms. The old sea_proto cap of 2 was never measured and fails on this iPad. */
      pixelRatioCap: n(1.5, 'measured', IPAD26 + ': render scale 1.5x 16.7 ms, 2x 24.1 ms, 3x 48.2 ms'),
      renderScaleMax: n(1, 'measured', RAD24 + ': the ipad preset at scale 1.0 held 58.9 fps'),
      msaa: n(0, 'code', CODE_PAGE + ' (QUAL.low msaa 0; the bench panel printed 4, which was wrong)'),
      shadowMap: n(1024, 'measured', RAD24 + ': third report, shadow 1024'),
      aniso: n(4, 'measured', RAD24 + ': third report, aniso 4')
    },
    scene: {
      /* the camp scene was 153,747 triangles and 163 draw calls at 58.9 fps: that is a place it works, not a limit. The 150k rule was a guess. */
      tris: n(150000, 'guess', RAD24 + ': 153,747 held 58.9 fps; the 150k rule is a guess, the sea bench held 2M sea triangles'),
      drawCalls: n(160, 'guess', RAD24 + ': 163 held 58.9 fps; a guess')
    },
    frame: { targetMs: n(16.67, 'code', 'the 60 fps frame') }
  };
  /* the numbers the iPad bench showed holding (for the 'held' checks): the sea alone, one axis at a time, on a light base */
  ipad.held = {
    seaTris: n(2000000, 'measured', IPAD26 + ': 2M sea triangles 16.7 ms (1M had one 49 ms spike)'),
    waves: n(96, 'measured', IPAD26 + ': 96 waves 16.7 ms'),
    spray: n(400000, 'measured', IPAD26 + ': 400k points 16.7 ms'),
    debris: n(100000, 'measured', IPAD26 + ': 100k points 16.7 ms'),
    renderScaleCss: n(1.5, 'measured', IPAD26 + ': 1.5x ok, 2x 24.1 ms fails')
  };

  /* ---- desktop (an integrated chip or a modest card): no report at all ---- */
  const desktop = {
    label: 'Desktop',
    sea: {
      rings: n(140, 'unmeasured', CODE_SEA), segs: n(320, 'unmeasured', CODE_SEA), waves: n(16, 'unmeasured', CODE_SEA), chop: n(5, 'unmeasured', CODE_SEA), ripples: n(7, 'unmeasured', CODE_SEA),
      spray: n(4000, 'unmeasured', CODE_SEA), debris: n(4000, 'unmeasured', 'between the iPad 400 and the Radeon 20000: sea_proto has no desktop sea')
    },
    render: {
      pixelRatioCap: n(2, 'unmeasured', CODE_PAGE), renderScaleMax: n(1.25, 'unmeasured', CODE_PAGE + ' (device=desktop ssaa 1.25)'), msaa: n(4, 'unmeasured', CODE_PAGE), shadowMap: n(2048, 'unmeasured', CODE_PAGE), aniso: n(16, 'unmeasured', CODE_PAGE)
    },
    scene: { tris: n(null, 'unmeasured', NONE + ': no desktop report'), drawCalls: n(null, 'unmeasured', NONE + ': no desktop report') },
    frame: { targetMs: n(16.67, 'code', 'the 60 fps frame') }
  };

  /* ---- Radeon VII (a real card on a Mac): every number 'unmeasured' ---- */
  const radeon = {
    label: 'Radeon',
    sea: {
      rings: n(220, 'unmeasured', CODE_SEA), segs: n(480, 'unmeasured', CODE_SEA), waves: n(24, 'unmeasured', CODE_SEA), chop: n(10, 'unmeasured', CODE_SEA), ripples: n(10, 'unmeasured', CODE_SEA),
      spray: n(12000, 'unmeasured', CODE_SEA), debris: n(20000, 'unmeasured', CODE_SEA)
    },
    render: {
      pixelRatioCap: n(2, 'unmeasured', CODE_PAGE), renderScaleMax: n(2, 'unmeasured', CODE_PAGE + ' (device=radeon ssaa 2)'), msaa: n(8, 'unmeasured', CODE_PAGE), shadowMap: n(4096, 'unmeasured', CODE_PAGE), aniso: n(16, 'unmeasured', CODE_PAGE)
    },
    scene: { tris: n(null, 'unmeasured', RAD24 + ': the page ran 236,374 triangles and 202 calls at 58.3 fps (GPU timer 11.02 ms); that is a place it worked, not a limit'), drawCalls: n(null, 'unmeasured', RAD24 + ': 202 calls seen, not a limit') },
    frame: { targetMs: n(16.67, 'unmeasured', 'the 60 fps frame') }
  };

  /* ---- Radeon MAX (the sea_proto top rung, picked from a bench knee that has not been run on this card) ---- */
  const max = {
    label: 'Radeon MAX',
    sea: {
      rings: n(480, 'unmeasured', CODE_SEA), segs: n(1056, 'unmeasured', CODE_SEA), waves: n(48, 'unmeasured', CODE_SEA), chop: n(20, 'unmeasured', CODE_SEA), ripples: n(12, 'unmeasured', CODE_SEA),
      spray: n(100000, 'unmeasured', CODE_SEA), debris: n(20000, 'unmeasured', CODE_SEA)
    },
    render: {
      pixelRatioCap: n(2, 'unmeasured', CODE_PAGE), renderScaleMax: n(2, 'unmeasured', CODE_PAGE), msaa: n(8, 'unmeasured', CODE_PAGE), shadowMap: n(4096, 'unmeasured', CODE_PAGE), aniso: n(16, 'unmeasured', CODE_PAGE)
    },
    scene: { tris: n(null, 'unmeasured', NONE), drawCalls: n(null, 'unmeasured', NONE) },
    frame: { targetMs: n(16.67, 'unmeasured', 'the 60 fps frame') }
  };

  const TIERS = { ipad, desktop, radeon, max };

  /* the measured results the table must not contradict. kind 'held' = this much worked (a limit may be at most this) or 'failed' = this much did not (a limit must stay below it). */
  const EVIDENCE = [
    { id: 'ipad-sea-tris-held', device: 'ipad', key: 'seaTris', kind: 'held', value: 2000000, src: IPAD26 },
    { id: 'ipad-waves-held', device: 'ipad', key: 'waves', kind: 'held', value: 96, src: IPAD26 },
    { id: 'ipad-spray-held', device: 'ipad', key: 'spray', kind: 'held', value: 400000, src: IPAD26 },
    { id: 'ipad-debris-held', device: 'ipad', key: 'debris', kind: 'held', value: 100000, src: IPAD26 },
    { id: 'ipad-scale-1.5-held', device: 'ipad', key: 'pixelRatioCap', kind: 'held', value: 1.5, src: IPAD26 },
    { id: 'ipad-scale-2-failed', device: 'ipad', key: 'pixelRatioCap', kind: 'failed', value: 2, ms: 24.1, src: IPAD26 },
    { id: 'ipad-scale-3-failed', device: 'ipad', key: 'pixelRatioCap', kind: 'failed', value: 3, ms: 48.2, src: IPAD26 },
    { id: 'ipad-page-radeon-preset-failed', device: 'ipad', key: 'renderScaleMax', kind: 'failed', value: 1.25, fps: 28.6, src: RAD24, note: 'the radeon preset on the iPad: dynamic scale fell to 0.625 and it still ran at 28.6 fps' },
    { id: 'ipad-page-scale-1-held', device: 'ipad', key: 'renderScaleMax', kind: 'held', value: 1, fps: 58.9, src: RAD24 },
    { id: 'ipad-page-tris-held', device: 'ipad', key: 'scene.tris', kind: 'held', value: 153747, fps: 58.9, src: RAD24 },
    { id: 'ipad-page-calls-held', device: 'ipad', key: 'scene.drawCalls', kind: 'held', value: 163, fps: 58.9, src: RAD24 }
  ];

  function get(device, path) {
    const t = TIERS[device]; if (!t) return undefined;
    let o = t; for (const k of String(path).split('.')) { if (o === undefined || o === null) return undefined; o = o[k]; }
    return o;
  }
  /* every {v,s,src} cell of a tier as [path, cell] */
  function cells(device) {
    const t = TIERS[device], out = [];
    for (const g of Object.keys(SHAPE)) for (const k of SHAPE[g]) out.push([g + '.' + k, t[g] && t[g][k]]);
    return out;
  }
  /* the sea numbers in the names sea_proto's TIERS and sea_waves.js use (for a page that wants to take them from this table) */
  function seaFor(device) {
    const t = TIERS[device]; if (!t) return null; const s = t.sea;
    return { rings: s.rings.v, segs: s.segs.v, nTot: s.waves.v, nCh: s.chop.v, rip: s.ripples.v, spray: s.spray.v, debris: s.debris.v, prCap: t.render.pixelRatioCap.v };
  }
  /* check the table against the evidence. Returns a list of strings, empty when nothing contradicts. */
  function contradictions() {
    const bad = [];
    for (const e of EVIDENCE) {
      const t = TIERS[e.device]; if (!t) { bad.push(e.id + ': no such device'); continue; }
      let cell;
      if (e.key === 'seaTris') cell = { v: t.sea.rings.v * t.sea.segs.v * 2 };
      else if (e.key.indexOf('.') >= 0) cell = get(e.device, e.key);
      else if (t.sea && t.sea[e.key]) cell = t.sea[e.key];
      else if (t.render && t.render[e.key]) cell = t.render[e.key];
      if (!cell) { bad.push(e.id + ': the table has no ' + e.key); continue; }
      if (cell.v === null) continue;
      if (e.kind === 'held' && cell.v > e.value && cell.s === 'measured') bad.push(e.id + ': limit ' + cell.v + ' is above what held (' + e.value + ')');
      if (e.kind === 'failed' && cell.v >= e.value) bad.push(e.id + ': limit ' + cell.v + ' is at or above what failed (' + e.value + ')');
    }
    return bad;
  }
  return { SHAPE, DEVICES, STATUS, TIERS, EVIDENCE, get, cells, seaFor, contradictions };
}));
