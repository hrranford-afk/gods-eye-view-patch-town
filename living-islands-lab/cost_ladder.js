/* Living Islands: the COST LADDER (&cost=1). See research/GRAPHICS_REVIEW.md.
   What it answers: how many milliseconds does each graphics layer cost on THIS device, measured without the 60 Hz lock. A page locked to vsync reads 16.7 ms whether the GPU needs 3 ms or 16 ms, so
   a frame-time average hides the headroom. This panel renders the scene K extra times inside one displayed frame (K found by doubling until that frame is over 33 ms), waits for the GPU with
   gl.finish() plus a 1-pixel readPixels, and divides by K. One layer is switched off (or one setting changed) at a time and put back; the difference is that layer's cost.
   Two halves in one file:
   1. the pure part (no DOM, no THREE, no clock: node tests run it): findK, median, fitPixels, rowOf, formatReport, RUNGS.
   2. attach(api): the panel and the runner. The page hands over its own handles (renderer, scene, how to render a full frame, how to change the render scale and the MSAA count...).
   Nothing here runs unless the URL says &cost=1. Numbers measured in software GL (SwiftShader) say nothing about any real device. Tags: TUNING = a game number. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.LI_COST = api;
}(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';
  const FRAME_MS = 1000 / 60;      /* the 60 fps frame */
  const OVER_MS = 33;              /* the batch of K renders must take longer than this (TUNING) */
  const STOP_MS = 200;             /* a rung whose single render takes longer than this stops the ladder (TUNING) */
  const MAX_K = 512;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const isNum = v => typeof v === 'number' && isFinite(v);
  const f = (v, n) => isNum(v) ? v.toFixed(n === undefined ? 2 : n) : 'n/a';

  function median(a) {
    const b = Array.prototype.slice.call(a).filter(isNum).sort((x, y) => x - y), n = b.length;
    if (!n) return 0;
    return n & 1 ? b[(n - 1) >> 1] : (b[n / 2 - 1] + b[n / 2]) / 2;
  }

  /* findK: timeBatch(K) renders K times and returns the wall milliseconds for the whole batch (synced). Start at K = 1 and double until the batch is over 'over' ms or K reaches maxK.
     Returns {K, batchMs, perRender, capped, tries}. 'capped' = true when maxK was reached with the batch still under 'over' (a very fast device: the number is then the best we can say). */
  function findK(timeBatch, o) {
    o = o || {};
    const over = o.over !== undefined ? o.over : OVER_MS, maxK = o.maxK || MAX_K;
    let K = 1, ms = 0, tries = 0;
    for (;;) {
      ms = timeBatch(K); tries++;
      if (!isNum(ms)) return { K, batchMs: NaN, perRender: NaN, capped: false, tries, bad: true };
      if (ms > over || K >= maxK) break;
      K = Math.min(maxK, K * 2);
    }
    return { K, batchMs: ms, perRender: ms / K, capped: ms <= over, tries };
  }

  /* least squares ms = fixed + perMpix * megapixels over the resolution rungs. fixed = what does not depend on the pixel count (vertices, draw calls, shadow pass); perMpix = the pixel cost.
     Returns null with fewer than 2 distinct sizes. r2 says how straight the line is (a near 1 means fill rate really is what changes). */
  function fitPixels(points) {
    const p = (points || []).filter(q => q && isNum(q.mpix) && isNum(q.ms));
    const n = p.length; if (n < 2) return null;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const q of p) { sx += q.mpix; sy += q.ms; sxx += q.mpix * q.mpix; sxy += q.mpix * q.ms; }
    const den = n * sxx - sx * sx; if (Math.abs(den) < 1e-12) return null;
    const b = (n * sxy - sx * sy) / den, a = (sy - b * sx) / n;
    let ssr = 0, sst = 0; const my = sy / n;
    for (const q of p) { const e = q.ms - (a + b * q.mpix); ssr += e * e; sst += (q.ms - my) * (q.ms - my); }
    return { fixed: a, perMpix: b, r2: sst > 1e-12 ? 1 - ssr / sst : 1, n };
  }
  /* the pixel count (in megapixels) at which the line meets the 60 fps frame, or null when it never does (the fixed part alone is over) or the line is flat */
  function mpixAtFrame(fit, frameMs) {
    if (!fit || !(fit.perMpix > 1e-9)) return null;
    const fr = frameMs || FRAME_MS; if (fit.fixed >= fr) return null;
    return (fr - fit.fixed) / fit.perMpix;
  }

  /* one table row from the baseline and the changed measurement. ms are per render. 'cost' = base minus changed for a layer switched OFF (positive = the layer costs that much), changed minus base for a
     setting that makes the frame heavier or lighter; the caller says which with dir (+1: the change is "layer off", -1: the change is "more work"). */
  function rowOf(id, label, baseMs, changedMs, dir, extra) {
    const r = Object.assign({ id, label, baseMs, changedMs }, extra || {});
    const d = (dir === -1 ? changedMs - baseMs : baseMs - changedMs);
    r.deltaMs = d; r.pct = baseMs > 1e-6 ? 100 * d / baseMs : 0;
    return r;
  }

  /* the rungs, in order. kind: 'layer' = hide and show (A/B pairs); 'heavy' = needs a resize or a shader rebuild (measured in a run, base before and after). dir as in rowOf. */
  const RUNGS = [
    { id: 'sea', label: 'sea (water mesh and its shader)', kind: 'layer', dir: 1 },
    { id: 'terrain', label: 'terrain', kind: 'layer', dir: 1 },
    { id: 'props', label: 'trees, rocks and houses (one merged mesh)', kind: 'layer', dir: 1 },
    { id: 'sky', label: 'sky dome, stars, cloud puffs and deck', kind: 'layer', dir: 1 },
    { id: 'particles', label: 'particles (smoke, spray, rain)', kind: 'layer', dir: 1 },
    { id: 'shadowpass', label: 'shadow map pass only (map not redrawn)', kind: 'layer', dir: 1 },
    { id: 'shadows', label: 'shadows off entirely (no pass, no lookups)', kind: 'heavy', dir: 1 },
    { id: 'post', label: 'post chain and its render target (draw straight to the canvas)', kind: 'layer', dir: 1 },
    { id: 'bloom', label: 'bloom (ultra tier only)', kind: 'layer', dir: 1 },
    { id: 'msaa', label: 'MSAA (switched to the other setting)', kind: 'heavy', dir: 1 },
    { id: 'scale0.5', label: 'resolution 0.5x', kind: 'heavy', dir: -1, scale: 0.5 },
    { id: 'scale0.75', label: 'resolution 0.75x', kind: 'heavy', dir: -1, scale: 0.75 },
    { id: 'scale1.5', label: 'resolution 1.5x', kind: 'heavy', dir: -1, scale: 1.5 },
    { id: 'scale2', label: 'resolution 2x', kind: 'heavy', dir: -1, scale: 2 }
  ];

  /* the shared tier table (tiers.js) next to what this run saw. T = window.LI_TIERS, key = ipad | desktop | radeon | max, now = {pixelRatio, scale, msaa, shadow, tris, calls}. Returns report lines. */
  function tableLines(T, key, now) {
    if (!T || !T.TIERS || !T.TIERS[key]) return [];
    const t = T.TIERS[key], c = (g, k) => t[g] && t[g][k], now_ = now || {};
    const cell = x => x ? (x.v === null ? 'none set' : x.v) + ' (' + x.s + ')' : 'n/a';
    const L = ['tier table (tiers.js) for ' + t.label + ' against this run:'];
    L.push('  pixel ratio cap: table ' + cell(c('render', 'pixelRatioCap')) + ', this run ' + (isNum(now_.pixelRatio) ? f(now_.pixelRatio, 2) : 'n/a'));
    L.push('  render scale max: table ' + cell(c('render', 'renderScaleMax')) + ', this run ' + (isNum(now_.scale) ? f(now_.scale, 2) : 'n/a'));
    L.push('  MSAA samples: table ' + cell(c('render', 'msaa')) + ', this run ' + (now_.msaa === undefined ? 'n/a' : now_.msaa));
    L.push('  shadow map: table ' + cell(c('render', 'shadowMap')) + ', this run ' + (now_.shadow === undefined ? 'n/a' : now_.shadow));
    L.push('  triangles per frame (shadow pass included): table ' + cell(c('scene', 'tris')) + ', this run ' + (now_.tris === undefined ? 'n/a' : now_.tris));
    L.push('  draw calls per frame (shadow pass included): table ' + cell(c('scene', 'drawCalls')) + ', this run ' + (now_.calls === undefined ? 'n/a' : now_.calls));
    return L;
  }

  /* ---------- the report ---------- */
  /* d = {method:{...}, device, tier, gpu, dpr, screen, canvas, big, msaa, shadow, tris, calls, K, baseMs, cpuMs, gpuMs, rows:[row], fit, stopped, notes:[]}. No paths, no names: the URL is the query string only. */
  function formatReport(d) {
    d = d || {};
    const L = [];
    L.push('Living Islands cost ladder (not vsync-locked)');
    L.push('device preset: ' + (d.device || 'none') + '   tier: ' + (d.tier || 'n/a') + '   query: ' + (d.query || ''));
    L.push('renderer: ' + (d.gpu || 'unknown') + (d.gpuKind ? ' (' + d.gpuKind + ')' : ''));
    L.push('device pixel ratio: ' + f(d.dpr, 2) + '   screen: ' + (d.screen || 'n/a') + '   canvas: ' + (d.canvas || 'n/a') + ' px' + (d.big ? '   offscreen target: ' + d.big : ''));
    L.push('msaa: ' + (d.msaa === undefined ? 'n/a' : d.msaa) + '   shadow map: ' + (d.shadow || 'n/a') + '   triangles: ' + (d.tris === undefined ? 'n/a' : d.tris) + '   draw calls: ' + (d.calls === undefined ? 'n/a' : d.calls));
    const m = d.method || {};
    L.push('method: ' + (m.main || 'K renders per displayed frame, then gl.finish() and a 1 pixel readPixels, divided by K') + '; GPU timer (EXT_disjoint_timer_query_webgl2): ' + (m.timer ? 'present, used for the gpu column' : 'not available on this browser, gpu column is empty'));
    L.push('K (renders per frame): ' + (d.K === undefined ? 'n/a' : d.K) + (d.Kcapped ? ' (hit the cap: the device is faster than this test can measure)' : '') + '   samples per rung: ' + (d.samples === undefined ? 'n/a' : d.samples));
    if (isNum(d.baseMs)) {
      const used = 100 * d.baseMs / FRAME_MS;
      L.push('BASELINE: ' + f(d.baseMs) + ' ms per scene render (cpu submit ' + f(d.cpuMs) + ' ms' + (isNum(d.gpuMs) ? ', gpu timer ' + f(d.gpuMs) + ' ms' : '') + ')');
      L.push('estimated headroom at 60 fps: ' + f(FRAME_MS - d.baseMs) + ' ms of a ' + f(FRAME_MS, 1) + ' ms frame (' + f(used, 0) + ' percent used by the render alone; game scripts, physics and the browser are NOT in this number)');
    } else L.push('BASELINE: not measured');
    L.push('');
    L.push('layer | with ms | changed ms | cost ms | percent | draw calls change | triangles change | note');
    for (const r of (d.rows || [])) {
      L.push([r.label, f(r.baseMs), isNum(r.changedMs) ? f(r.changedMs) : 'n/a', isNum(r.deltaMs) ? (r.deltaMs >= 0 ? '+' : '') + f(r.deltaMs) : 'n/a', isNum(r.pct) ? f(r.pct, 0) + '%' : 'n/a',
        r.dCalls === undefined ? '' : r.dCalls, r.dTris === undefined ? '' : r.dTris, (r.gpuDelta !== undefined && isNum(r.gpuDelta) ? 'gpu timer ' + f(r.gpuDelta) + ' ms; ' : '') + (r.note || '')].join(' | '));
    }
    if (d.fit) {
      L.push('');
      L.push('pixel fit over the resolution rungs: ms = ' + f(d.fit.fixed) + ' + ' + f(d.fit.perMpix) + ' x megapixels (straightness r2 ' + f(d.fit.r2, 3) + ', ' + d.fit.n + ' points)');
      L.push('so about ' + f(d.fit.fixed) + ' ms does not depend on resolution (vertices, draw calls, shadow pass) and ' + f(d.fit.perMpix) + ' ms per million pixels does'
        + (isNum(d.fit.mpixAt60) ? '; the 60 fps frame would be reached near ' + f(d.fit.mpixAt60, 1) + ' million pixels (estimate, render only)' : '; no resolution reaches the 60 fps frame on this line'));
    }
    if (d.table && d.table.length) { L.push(''); for (const x of d.table) L.push(x); }
    if (d.stopped) { L.push(''); L.push('STOPPED: ' + d.stopped); }
    if (d.notes && d.notes.length) { L.push(''); L.push('notes: ' + d.notes.join('; ')); }
    return L.join('\n');
  }

  /* ---------- the page half ---------- */
  function attach(api) {
    const doc = typeof document !== 'undefined' ? document : null; if (!doc) return null;
    const R = api.renderer, gl = R.getContext(), S = { running: false, stop: false, rows: [], report: '', data: null, progress: '' };
    const Q = new URLSearchParams(location.search);
    const limit = Q.get('costmax') ? parseFloat(Q.get('costmax')) : STOP_MS;     /* tests raise it: software GL is slow */
    const nSamp = Math.max(1, Math.min(9, parseInt(Q.get('costn') || '3', 10) || 3));
    const only = (Q.get('costrungs') || '').split(',').filter(Boolean);        /* &costrungs=sea,post,scale0.5 runs only those rungs (tests, or a quick look) */
    const rungs = only.length ? RUNGS.filter(r => only.includes(r.id)) : RUNGS;
    const gl2 = R.capabilities && R.capabilities.isWebGL2;
    let ext = null; try { ext = gl2 ? gl.getExtension('EXT_disjoint_timer_query_webgl2') : null; } catch (x) { ext = null; }
    const px = new Uint8Array(4);
    const frame = () => new Promise(r => requestAnimationFrame(() => r()));
    const sync = () => { try { R.setRenderTarget(null); } catch (x) { } try { gl.finish(); } catch (x) { } try { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } catch (x) { } };
    /* K renders of fn, synced at both ends; returns {ms, cpu, gpu} for the whole batch */
    function batch(K, fn) {
      sync();
      let q = null;
      if (ext) { try { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); } catch (x) { q = null; } }
      const t0 = performance.now();
      for (let i = 0; i < K; i++) fn();
      const tc = performance.now();
      if (q) { try { gl.endQuery(ext.TIME_ELAPSED_EXT); } catch (x) { q = null; } }
      sync();
      const t1 = performance.now();
      let gpu = NaN;
      if (q) { try { if (gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) && !gl.getParameter(ext.GPU_DISJOINT_EXT)) gpu = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6; gl.deleteQuery(q); } catch (x) { } }
      return { ms: t1 - t0, cpu: tc - t0, gpu };
    }
    const counts = fn => { R.info.autoReset = false; R.info.reset(); fn(); const c = { calls: R.info.render.calls, tris: Math.round(R.info.render.triangles) }; return c; };

    /* what each rung changes. apply() returns false when there is nothing to change (the layer is not there or already off). restore() puts it back. render = the function that draws (default: the full frame). */
    function visToggle(list) {
      let saved = null;
      return { apply() { const on = list().filter(o => o && o.visible); if (!on.length) return false; saved = on; on.forEach(o => { o.visible = false; }); return on.length; }, restore() { if (saved) saved.forEach(o => { o.visible = true; }); saved = null; } };
    }
    const allObjs = () => { const a = []; api.scene.traverse(o => a.push(o)); return a; };
    const isSky = o => (o.isMesh || o.isPoints) && o.material && ((Array.isArray(o.material) ? o.material[0] : o.material).side === 1 || o.renderOrder <= -90);
    const mats = () => { const s = new Set(); api.scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => s.add(m)); }); return [...s]; };
    const lay$ = k => { const l = (api.layers || {})[k]; return [].concat(typeof l === 'function' ? l() : (l || [])).filter(Boolean); };
    function build(id) {
      switch (id) {
        case 'sea': return visToggle(() => lay$('sea'));
        case 'terrain': return visToggle(() => lay$('terrain'));
        case 'props': return visToggle(() => lay$('props'));
        case 'sky': return visToggle(() => allObjs().filter(isSky).concat(lay$('clouds')));
        case 'particles': return visToggle(() => allObjs().filter(o => o.isPoints && !isSky(o)).concat(lay$('rain')));
        case 'shadowpass': { return { apply() { if (!R.shadowMap.enabled || !R.shadowMap.autoUpdate) return false; R.shadowMap.autoUpdate = false; return 1; }, restore() { R.shadowMap.autoUpdate = true; } }; }
        case 'shadows': { let was = null; return { apply() { if (!R.shadowMap.enabled) return false; was = R.shadowMap.enabled; R.shadowMap.enabled = false; mats().forEach(m => { m.needsUpdate = true; }); return 1; }, restore() { if (was !== null) { R.shadowMap.enabled = true; R.shadowMap.needsUpdate = true; mats().forEach(m => { m.needsUpdate = true; }); } was = null; } }; }
        case 'post': return { render: api.renderDirect, apply() { return api.hasPost() ? 1 : false; }, restore() { } };
        case 'bloom': return { apply() { if (!api.bloom || !(api.bloom.get() > 0)) return false; this.v = api.bloom.get(); api.bloom.set(0); return 1; }, restore() { if (this.v !== undefined) api.bloom.set(this.v); this.v = undefined; } };
        case 'msaa': return { apply() { if (!api.msaa) return false; this.was = api.msaa.get(); this.to = this.was > 0 ? 0 : Math.min(4, api.msaa.max()); if (this.to === this.was) return false; api.msaa.set(this.to); return this.to; }, restore() { if (this.was !== undefined) api.msaa.set(this.was); this.was = undefined; } };
        default: {
          const r = RUNGS.find(x => x.id === id);
          return { apply() { api.scale.set(r.scale); this.on = true; return r.scale; }, restore() { if (this.on) { this.on = false; api.scale.set(1); } } };
        }
      }
    }

    async function run() {
      if (S.running) return; S.running = true; S.stop = false; S.rows = []; S.report = ''; setStatus('starting');
      const d = { method: { timer: !!ext }, device: api.device(), tier: api.tier(), query: location.search, gpu: api.gpuName(), gpuKind: api.gpuKind(), dpr: window.devicePixelRatio || 1, screen: innerWidth + 'x' + innerHeight + ' css px', notes: [], samples: nSamp, rows: [] };
      const restoreAll = [], autoReset0 = R.info.autoReset;
      try {
        api.freeze(true);
        window.addEventListener('webglcontextlost', onLost);
        await frame(); await frame();
        const full = () => api.renderFull();
        const sz = api.sizes(); d.canvas = sz.canvas; d.big = sz.big || ''; d.msaa = api.msaa ? api.msaa.get() : 0; d.shadow = api.shadowSize();
        full(); sync(); full(); sync();       /* warm up: shader compile, texture upload */
        const c0 = counts(full); d.calls = c0.calls; d.tris = c0.tris;
        const kk = findK(K => batch(K, full).ms);
        if (kk.bad) throw new Error('timing failed');
        d.K = kk.K; d.Kcapped = kk.capped;
        const K = kk.K, base = batch(K, full), allBase = [base.ms / K], allCpu = [base.cpu / K], allGpu = isNum(base.gpu) ? [base.gpu / K] : [];
        d.baseMs = base.ms / K; d.cpuMs = base.cpu / K; d.gpuMs = allGpu.length ? allGpu[0] : undefined;
        if (d.baseMs > limit) { d.stopped = 'the plain frame already takes ' + f(d.baseMs, 0) + ' ms per render, over the ' + f(limit, 0) + ' ms limit; nothing was changed'; return; }
        if (api.tiers && api.tierKey) { const w = parseInt(String(d.canvas).split('x')[0], 10) || 0; d.table = tableLines(api.tiers, api.tierKey(), { pixelRatio: innerWidth ? w / innerWidth : NaN, scale: sz.big ? parseInt(sz.big, 10) / Math.max(1, w) : 1, msaa: d.msaa, shadow: d.shadow, tris: d.tris, calls: d.calls }); }
        const total = rungs.length, fitPts = [{ mpix: sz.pixels / 1e6, ms: d.baseMs }];
        for (let i = 0; i < total; i++) {
          if (S.stop) { d.stopped = 'stopped by the Stop button'; break; }
          const r = rungs[i], h = build(r.id); const rp = r.render || (h.render || full);
          setStatus('rung ' + (i + 1) + '/' + total + ': ' + r.label); await frame();
          let row = null, ok = false;
          restoreAll.push(h);
          try {
            const bs = [], rs = [], bg = [], rg = []; let cc = null, applied = false, counts1 = null;
            const cBefore = counts(full);       /* draw calls and triangles of a plain frame right now, so the change is not mixed with a camera or shadow change between rungs */
            if (r.kind === 'layer') {
              for (let s = 0; s < nSamp; s++) {
                const b = batch(K, full); bs.push(b.ms / K); allBase.push(b.ms / K); if (isNum(b.gpu)) { bg.push(b.gpu / K); allGpu.push(b.gpu / K); }
                applied = h.apply(); if (applied === false) break;
                if (s === 0) { rp(); sync(); counts1 = counts(rp); }
                const x = batch(K, h.render || full); rs.push(x.ms / K); if (isNum(x.gpu)) rg.push(x.gpu / K);
                h.restore();
                if (x.ms / K > limit) { d.stopped = 'rung "' + r.label + '" takes ' + f(x.ms / K, 0) + ' ms per render, over the ' + f(limit, 0) + ' ms limit'; break; }
              }
            } else {
              for (let s = 0; s < 2; s++) { const b = batch(K, full); bs.push(b.ms / K); allBase.push(b.ms / K); if (isNum(b.gpu)) { bg.push(b.gpu / K); allGpu.push(b.gpu / K); } }
              applied = h.apply();
              if (applied !== false) {
                await frame(); full(); sync(); full(); sync();
                counts1 = counts(full);
                const z = api.sizes(); cc = z;
                for (let s = 0; s < nSamp; s++) { const x = batch(K, full); rs.push(x.ms / K); if (isNum(x.gpu)) rg.push(x.gpu / K); if (x.ms / K > limit) { d.stopped = 'rung "' + r.label + '" takes ' + f(x.ms / K, 0) + ' ms per render, over the ' + f(limit, 0) + ' ms limit'; break; } }
              }
              h.restore();
              if (applied !== false) { await frame(); full(); sync(); full(); sync(); const b = batch(K, full); bs.push(b.ms / K); if (isNum(b.gpu)) bg.push(b.gpu / K); }
            }
            if (applied === false || !rs.length) {
              row = rowOf(r.id, r.label, d.baseMs, NaN, r.dir, { note: applied === false ? (r.id === 'bloom' ? 'not in use on this tier (bloom is already off)' : r.id === 'msaa' ? 'cannot change MSAA here' : r.id === 'post' ? 'no post chain' : 'nothing to switch off (not visible or not present)') : 'no sample' });
            } else {
              const bm = median(bs), rm = median(rs);
              row = rowOf(r.id, r.label, bm, rm, r.dir, { gpuDelta: (bg.length && rg.length) ? (r.dir === -1 ? median(rg) - median(bg) : median(bg) - median(rg)) : undefined });
              if (counts1) { row.dCalls = counts1.calls - cBefore.calls; row.dTris = counts1.tris - cBefore.tris; }
              if (r.id === 'msaa') {
                if (d.msaa > 0) row.note = 'now ' + d.msaa + ' samples; cost = what switching MSAA off saves';
                else { row.deltaMs = rm - bm; row.pct = bm > 1e-6 ? 100 * row.deltaMs / bm : 0; row.note = 'now no MSAA; cost = what switching ' + applied + ' samples ON adds'; }
              }
              if (r.scale && cc) { row.note = 'canvas ' + cc.canvas + (cc.big ? ', offscreen ' + cc.big : '') + ', ' + f(cc.pixels / 1e6, 2) + ' Mpix'; fitPts.push({ mpix: cc.pixels / 1e6, ms: rm }); }
              ok = true;
            }
          } finally { try { h.restore(); } catch (x) { } }
          d.rows.push(row); S.rows = d.rows; S.data = d; show(d);
          if (d.stopped) break;
        }
        if (allBase.length > 1) d.baseMs = median(allBase);       /* the baseline is the median of every plain-frame batch taken during the run (the first one alone can be a slow one) */
        if (allGpu.length) d.gpuMs = median(allGpu);
        if (fitPts.length) fitPts[0].ms = d.baseMs;
        const fit = fitPixels(fitPts);
        if (fit) { fit.mpixAt60 = mpixAtFrame(fit, FRAME_MS); d.fit = fit; }
      } catch (e) {
        d.stopped = 'error: ' + String(e && e.message || e).slice(0, 160);
      } finally {
        for (const h of restoreAll) { try { h.restore(); } catch (x) { } }
        try { api.scale.set(1); } catch (x) { }
        try { R.info.autoReset = autoReset0; } catch (x) { }
        try { api.freeze(false); } catch (x) { }
        window.removeEventListener('webglcontextlost', onLost);
        S.running = false; S.data = d; show(d); setStatus(d.stopped ? 'stopped' : 'done');
      }
    }
    function onLost() { S.stop = true; }
    function show(d) { S.report = formatReport(d); if (S.ta) { S.ta.value = S.report; S.ta.style.display = 'block'; } if (S.copy) S.copy.style.display = 'inline-block'; }
    function setStatus(t) { S.progress = t; if (S.st) S.st.textContent = t; if (S.go) S.go.disabled = S.running; }

    /* the panel */
    const st = doc.createElement('style');
    st.textContent = '#costp{position:fixed;left:10px;bottom:70px;width:360px;max-width:calc(100vw - 20px);max-height:80vh;overflow:auto;font-size:11px;z-index:6}#costp .bh{font-weight:800;display:flex;justify-content:space-between;margin-bottom:4px}#costp p{margin:0 0 6px;line-height:1.35}#costp .warn{color:#8a3b00;font-weight:700}#costp .bb{min-height:36px;padding:4px 10px;border-radius:10px;border:2px solid var(--line,#cdbb98);background:#fff;color:var(--ink,#2b2118);font:inherit;font-weight:700;cursor:pointer;margin-right:4px}#costp .bb:disabled{opacity:.5}#costp textarea{width:100%;margin-top:6px;font:11px/1.3 ui-monospace,Menlo,Consolas,monospace;resize:vertical}';
    doc.head.appendChild(st);
    const p = doc.createElement('div'); p.id = 'costp'; p.className = 'pill';
    p.innerHTML = '<div class="bh">Cost ladder <button class="bb" id="costX" aria-label="close" style="min-height:26px">x</button></div>'
      + '<p class="warn">Warning: this makes the picture stutter and flicker for about half a minute while each layer is switched off and on. It pushes the graphics chip hard on purpose. Do not run it on a hot or low battery device. It stops by itself on an error or if one step is over ' + f(limit, 0) + ' ms.</p>'
      + '<p>It renders the scene several times per shown frame, so the 60 Hz lock cannot hide the answer. Numbers are for this device only.</p>'
      + '<button class="bb" id="costGo">Start</button><button class="bb" id="costStop">Stop</button><button class="bb" id="costCopy" style="display:none">Copy report</button><p id="costSt" style="margin-top:6px">ready</p><textarea id="costTa" readonly rows="14" style="display:none"></textarea>';
    doc.body.appendChild(p);
    S.el = p; S.go = p.querySelector('#costGo'); S.ta = p.querySelector('#costTa'); S.copy = p.querySelector('#costCopy'); S.st = p.querySelector('#costSt');
    S.go.addEventListener('click', () => { run(); });
    p.querySelector('#costStop').addEventListener('click', () => { S.stop = true; });
    p.querySelector('#costX').addEventListener('click', () => { p.style.display = 'none'; });
    S.copy.addEventListener('click', () => {
      const t = S.report, done = () => { S.copy.textContent = 'Copied'; setTimeout(() => { S.copy.textContent = 'Copy report'; }, 1500); };
      const fb = () => { S.ta.focus(); S.ta.select(); try { doc.execCommand('copy'); done(); } catch (x) { } };
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fb); else fb(); } catch (x) { fb(); }
    });
    return { check: () => ({ layersVisible: [].concat(lay$('sea'), lay$('terrain'), lay$('props')).every(o => o.visible), shadowsOn: !!(R.shadowMap.enabled && R.shadowMap.autoUpdate), autoReset: R.info.autoReset }), run, state: () => ({ running: S.running, progress: S.progress, rows: S.rows.slice(), report: S.report, data: S.data }), stop: () => { S.stop = true; }, report: () => S.report, timer: () => !!ext, limit: () => limit };
  }

  return { FRAME_MS, OVER_MS, STOP_MS, MAX_K, RUNGS, median, findK, fitPixels, mpixAtFrame, rowOf, tableLines, formatReport, attach };
}));
