/* Living Islands: the ULTRA quality tier, pure parts (see ULTRA_TIER.md). No DOM, no wall clock, no Math.random, no dependencies, so tests/ultra-test.js can run it in plain node.
   window.LI_ULTRA in a page, globalThis.LI_ULTRA after a plain import in node, module.exports in CommonJS.
   1. classifyGpu / cleanGpuName: what the browser says the GPU is (WEBGL_debug_renderer_info), reduced to a short name and 'discrete' | 'integrated' | 'software' | 'unknown'.
   2. options: the URL switches (&ssaa=1.5 &msaa=4 &shadow=2048 &herolod=0 ...), parsed and clamped, one function so the page and the tests agree.
   3. createDynRes: the dynamic resolution controller. It is fed frame times and returns the render scale (1.0 to 2.0 in steps), with hysteresis.
   4. percentile, benchVerdict, benchReport: the numbers of the bench overlay.
   Tags: TUNING = a game number. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.LI_ULTRA = api;
}(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* ---------- 1. the GPU name ---------- */
  /* Chrome reports things like 'ANGLE (AMD, AMD Radeon VII Unknown Prefixed, OpenGL 4.1)' or 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)' or
     'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)'. cleanGpuName keeps the part a person would say. */
  function cleanGpuName(raw) {
    let s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    const m = /^ANGLE \((.*)\)$/i.exec(s);
    if (m) {
      const parts = m[1].split(',').map(x => x.trim());
      s = parts.length >= 2 ? parts[1] : parts[0];
      if (parts.length >= 2 && /^(unspecified|unknown)/i.test(s)) s = parts[0];
    }
    if (/swiftshader/i.test(s)) return 'Google SwiftShader (software)';
    if (/llvmpipe/i.test(s)) return 'llvmpipe (software)';
    const vk = /^Vulkan [\d.]+ \((.*)\)$/.exec(s); if (vk) s = vk[1];
    s = s.replace(/^ANGLE Metal Renderer:\s*/i, '').replace(/\s+(Direct3D\d*\w*|OpenGL\b).*$/i, '').replace(/\s+(vs_\d_\d|ps_\d_\d).*$/i, '')
      .replace(/\s+Unknown Prefixed$/i, '').replace(/\s+OpenGL Engine$/i, '').replace(/\(R\)|\(TM\)/gi, '').replace(/\s+/g, ' ').trim();
    return s;
  }
  /* kind: 'software' (no GPU in use), 'integrated' (shares memory with the CPU: Intel UHD / Iris / HD, Apple M-series and A-series, AMD APU Vega), 'discrete', or 'unknown' (no name) */
  function classifyGpu(raw) {
    const name = cleanGpuName(raw), n = name.toLowerCase();
    if (!n) return { name: '', kind: 'unknown', integrated: false, vendor: 'unknown' };
    const vendor = /nvidia|geforce|quadro|rtx|gtx|tesla/.test(n) ? 'nvidia' : /amd|radeon|ati\b/.test(n) ? 'amd' : /intel/.test(n) ? 'intel' : /apple/.test(n) ? 'apple' : /qualcomm|adreno/.test(n) ? 'qualcomm' : /mali|arm\b/.test(n) ? 'arm' : 'other';
    if (/swiftshader|llvmpipe|software|microsoft basic|softpipe|mesa offscreen/.test(n)) return { name, kind: 'software', integrated: false, vendor };
    if (/intel/.test(n) && /\barc\b/.test(n)) return { name, kind: 'discrete', integrated: false, vendor };
    if (/intel/.test(n)) return { name, kind: 'integrated', integrated: true, vendor };
    if (/apple\s*(m\d|a\d|gpu)|\bapple\b.*\b(m\d|a\d{1,2})\b/.test(n)) return { name, kind: 'integrated', integrated: true, vendor: 'apple' };
    if (/adreno|mali|powervr/.test(n)) return { name, kind: 'integrated', integrated: true, vendor };
    if (vendor === 'amd') {
      if (/radeon\s*(pro|rx|vii|r[579]|hd\s*\d{4}\b)|\brx\s*\d|firepro|instinct|vega\s*(56|64|frontier)|pro\s*vega|\bvii\b/.test(n)) return { name, kind: 'discrete', integrated: false, vendor };
      if (/vega\s*(3|6|8|10|11)\b|radeon\s*graphics|\bgraphics\b\s*$|760m|780m|680m|610m/.test(n)) return { name, kind: 'integrated', integrated: true, vendor };
      return { name, kind: 'discrete', integrated: false, vendor };
    }
    if (vendor === 'nvidia') return { name, kind: 'discrete', integrated: false, vendor };
    return { name, kind: 'unknown', integrated: false, vendor };
  }
  const INTEGRATED_HINT = 'On a Mac with two GPUs, Chrome may pick the built-in one';
  /* the one HUD line: 'GPU: AMD Radeon VII' and, for an integrated or software chip, the warning */
  function gpuLine(raw) {
    const c = classifyGpu(raw);
    if (!c.name) return { text: 'GPU: unknown (the browser hides it)', warn: false, cls: c };
    if (c.kind === 'software') return { text: 'GPU: ' + c.name + '  (software rendering, no graphics card is in use)', warn: true, cls: c };
    if (c.integrated) return { text: 'GPU: ' + c.name + '  (built-in chip). ' + INTEGRATED_HINT, warn: true, cls: c };
    return { text: 'GPU: ' + c.name, warn: false, cls: c };
  }

  /* ---------- 2. the URL switches ---------- */
  const num = (v, d) => { if (v === null || v === undefined || v === '') return d; const x = parseFloat(v); return isFinite(x) ? x : d; };
  const pick = (v, list, d) => { const x = Math.round(num(v, d)); let best = list[0]; for (const l of list) if (Math.abs(l - x) < Math.abs(best - x)) best = l; return best; };
  /* ssaa = the largest render scale (1 to 2), dyn = 0 pins the scale at ssaa, msaa = samples (0, 2, 4, 8), shadow = shadow map size, herolod = 0 turns the hero models off, herod = metres within which a hero shows
     (boats), kitd = same for the camp kit pieces, terrain = the terrain cell in metres (smaller = more triangles), aniso = anisotropy (0 = the most the GPU gives), bloom = strength (0 = off),
     profile = desk | tv | handheld (the viewing profile; absent = chosen from the screen), render = internal height in pixels on the tv profile (default 1800, 2160 = native), minscale = lowest render scale (below 1 only helps a 4K screen), uiscale = UI size, soft = shadow softness radius in shadow texels, fit = 0 turns the tight shadow frustum off, fps = target frame rate, maxpx = most pixels in the big render target, bench = 1 shows the bench panel. */
  function options(search) {
    const P = new URLSearchParams(search || '');
    const g = k => P.get(k);
    const o = {
      ssaa: clamp(num(g('ssaa'), 2), 1, 2), dyn: g('dyn') !== '0', msaa: pick(g('msaa'), [0, 2, 4, 8], 8), shadow: pick(g('shadow'), [1024, 2048, 4096, 8192], 4096),
      herolod: g('herolod') !== '0', herod: clamp(num(g('herod'), 60), 12, 200), kitd: clamp(num(g('kitd'), 150), 40, 400), terrain: clamp(num(g('terrain'), .40), .25, .9),
      aniso: Math.max(0, Math.round(num(g('aniso'), 0))), bloom: clamp(num(g('bloom'), .10), 0, .5), soft: clamp(num(g('soft'), 1.5), .5, 4), fit: g('fit') !== '0',
      fps: clamp(num(g('fps'), 60), 20, 240), render: clamp(num(g('render'), 0), 0, 4320), profile: ['desk', 'tv', 'handheld'].includes(g('profile')) ? g('profile') : '', minscale: clamp(num(g('minscale'), 1), .25, 1), uiscale: clamp(num(g('uiscale'), 0), 0, 3), maxpx: clamp(num(g('maxpx'), 8294400), 500000, 33177600), bench: g('bench') === '1',
      given: {}
    };
    for (const k of ['minscale', 'uiscale', 'ssaa', 'msaa', 'shadow', 'herolod', 'terrain', 'aniso', 'bloom', 'soft', 'fit', 'dyn']) o.given[k] = g(k) !== null;
    return o;
  }
  /* the tier asked for by the URL or by storage: 'low' | 'high' | 'ultra' */
  function tierFrom(q, stored) {
    const v = q !== null && q !== undefined ? q : stored;
    return v === 'low' ? 'low' : v === 'ultra' ? 'ultra' : 'high';
  }
  /* what ultra settles on once the GPU is known: an integrated chip gets a small scale and 4 samples unless the person asked otherwise in the URL */
  function planFor(opt, gpuKind, caps) {
    const p = { ssaa: opt.ssaa, msaa: opt.msaa, shadow: opt.shadow, notes: [] };
    if ((gpuKind === 'integrated' || gpuKind === 'software') && !opt.given.ssaa) { p.ssaa = Math.min(p.ssaa, gpuKind === 'software' ? 1 : 1.25); p.notes.push('built-in chip: scale limited to ' + p.ssaa); }
    if ((gpuKind === 'integrated' || gpuKind === 'software') && !opt.given.msaa) { p.msaa = Math.min(p.msaa, 4); p.notes.push('built-in chip: 4 samples'); }
    if (caps) {
      if (caps.maxSamples !== undefined && p.msaa > caps.maxSamples) { p.notes.push('MSAA ' + p.msaa + ' not available, using ' + caps.maxSamples); p.msaa = caps.maxSamples; }
      if (caps.maxTexture && p.shadow > caps.maxTexture) { p.notes.push('shadow map ' + p.shadow + ' too large, using ' + caps.maxTexture); p.shadow = caps.maxTexture; }
    }
    return p;
  }
  /* a failure ladder: each call returns the next lower setting, or null when there is nothing lower. Used when a render target or shadow map cannot be made. */
  function degrade(s) {
    const o = Object.assign({}, s);
    if (o.shadow > 2048) { o.shadow = o.shadow > 4096 ? 4096 : 2048; return o; }
    if (o.msaa > 4) { o.msaa = 4; return o; }
    if (o.ssaa > 1.25) { o.ssaa = 1.25; return o; }
    if (o.msaa > 0) { o.msaa = o.msaa > 2 ? 2 : 0; return o; }
    if (o.shadow > 1024) { o.shadow = 1024; return o; }
    if (o.ssaa > 1) { o.ssaa = 1; return o; }
    return null;
  }

  /* ---------- 3. dynamic resolution ---------- */
  /* ms values are the frame time the person feels: the work time of the frame (GPU time when the browser gives it, else a sampled finish) or the real interval when frames came late.
     Rules (TUNING): a moving window of the last 'win' samples; no decision until a fresh window is full after any change; LOWER when the window average is above 95 percent of the budget or its 95th percentile above
     150 percent (at least one step, more when far over, cost taken as proportional to scale squared), not sooner than 'downGap' seconds after the last change; RAISE one step only when the average is under 70 percent,
     the 95th percentile under 90 percent and the cost predicted at the next scale (average times (next/now) squared) is still under 85 percent of the budget, not sooner than 'upGap' seconds after the last change.
     The prediction sits below the lowering threshold, so a steady scene settles and stays: no oscillation. */
  function createDynRes(o) {
    o = o || {};
    const min = o.min !== undefined ? o.min : 1, max = o.max !== undefined ? o.max : 2, step = o.step || .125, target = o.target || 1000 / 60, win = o.win || 40;
    const downGap = o.downGap !== undefined ? o.downGap : 1.2, upGap = o.upGap !== undefined ? o.upGap : 3.5;
    const snap = v => clamp(Math.round(v / step) * step, min, max);
    const st = { scale: snap(o.start !== undefined ? o.start : min), buf: [], last: -1e9, changes: 0, now: 0, avg: 0, p95: 0, lastDir: 0 };
    function push(ms, now) {
      st.now = now; st.buf.push(ms); if (st.buf.length > win) st.buf.shift();
      if (st.buf.length < win) return st.scale;
      let sum = 0; for (const v of st.buf) sum += v;
      const avg = sum / st.buf.length, p95 = percentile(st.buf, .95); st.avg = avg; st.p95 = p95;
      const since = now - st.last; let ns = st.scale;
      if ((avg > target * .95 || p95 > target * 1.5) && since >= downGap && st.scale > min + 1e-9) {
        const want = st.scale * Math.sqrt(target * .82 / Math.max(avg, 1e-3));
        ns = Math.min(st.scale - step, Math.floor(want / step + 1e-9) * step);
      } else if (avg < target * .70 && p95 < target * .90 && since >= upGap && st.scale < max - 1e-9) {
        const nx = st.scale + step, pred = avg * (nx / st.scale) * (nx / st.scale);
        if (pred < target * .85) ns = nx;
      }
      ns = snap(ns);
      if (Math.abs(ns - st.scale) > 1e-9) { st.lastDir = ns > st.scale ? 1 : -1; st.scale = ns; st.last = now; st.buf.length = 0; st.changes++; }
      return st.scale;
    }
    return { push, state: () => ({ scale: st.scale, avg: st.avg, p95: st.p95, changes: st.changes, last: st.last, samples: st.buf.length, lastDir: st.lastDir }), get scale() { return st.scale; },
      set(s, now) { st.scale = snap(s); st.buf.length = 0; if (now !== undefined) st.last = now; }, config: { min, max, step, target, win, downGap, upGap } };
  }

  /* ---------- 4. the bench numbers ---------- */
  function percentile(arr, p) {
    if (!arr.length) return 0;
    const a = Array.prototype.slice.call(arr).sort((x, y) => x - y), i = clamp(Math.ceil(p * a.length) - 1, 0, a.length - 1);
    return a[i];
  }
  /* avgFps and p95 (ms) from the intervals between frames; workMs = average work time of a frame when known (GPU timer or sampled finish), else 0 */
  function benchVerdict(r, targetMs) {
    const t = targetMs || 1000 / 60, fpsFloor = 1000 / t;
    if (r.avgFps < fpsFloor * .92 || r.p95 > t * 1.5) return 'too heavy: lower the scale';
    if (r.avgFps < fpsFloor * .985 || r.p95 > t * 1.15 || (r.workMs > 0 && r.workMs > t * .80)) return 'near the limit';
    return 'plenty of headroom';
  }
  function benchReport(d) {
    const f = (v, n) => (typeof v === 'number' && isFinite(v) ? v.toFixed(n === undefined ? 1 : n) : 'n/a');
    const L = ['Living Islands bench', 'tier: ' + d.tier + (d.device ? '   device: ' + d.device : '') + (d.url ? '   url: ' + d.url : ''), 'GPU: ' + (d.gpu || 'unknown') + (d.gpuKind ? ' (' + d.gpuKind + ')' : ''),
      'screen: ' + d.screen + '   device pixel ratio: ' + f(d.dpr, 2) + '   real pixels: ' + (d.physical || 'n/a') + '   canvas: ' + d.canvas + ' px' + (d.bigRT ? '   big render target: ' + d.bigRT : ''), 'render scale: ' + f(d.scale, 3) + ' (dynamic ' + (d.dyn ? 'on' : 'off') + ', range ' + f(d.minScale === undefined ? 1 : d.minScale, 2) + ' to ' + f(d.maxScale, 2) + ')   msaa: ' + d.msaa + '   shadow map: ' + d.shadow + '   aniso: ' + d.aniso + (d.ui ? '   UI scale: ' + f(d.ui, 2) : ''),
      'triangles: ' + d.tris + '   draw calls: ' + d.calls];
    if (d.run) {
      L.push('benchmark: ' + f(d.run.seconds, 0) + ' s, ' + d.run.frames + ' frames, camera spinning', 'average ' + f(d.run.avgFps, 1) + ' fps (' + f(d.run.avgMs, 2) + ' ms), 95th percentile ' + f(d.run.p95, 2) + ' ms, worst ' + f(d.run.max, 1) + ' ms',
        'GPU/work time per frame: ' + (d.run.workMs > 0 ? f(d.run.workMs, 2) + ' ms' + (d.run.workSrc ? ' (' + d.run.workSrc + ')' : '') : 'not measured'), 'scale during the run: ' + f(d.run.scaleMin, 3) + ' to ' + f(d.run.scaleMax, 3), 'verdict: ' + d.run.verdict);
    } else L.push('benchmark: not run yet (press Run benchmark)');
    if (d.notes && d.notes.length) L.push('notes: ' + d.notes.join('; '));
    return L.join('\n');
  }
  /* ---------- 5. the preset step-down (the owner's iPad measurement: device=radeon on an iPad ran at 28.6 fps; see research/RADEON_FIRST_MEASUREMENT.md) ----------
     device = the preset asked for, gpuRaw = the browser's GPU string (may be empty), ua = the user agent, touch = navigator.maxTouchPoints, o.off = the &stepdown=0 switch.
     Only radeon and desktop step down, and only on a built-in or mobile GPU (an iPad, a phone, an integrated chip): to the ipad preset, with a one-line note. A real graphics card, software rendering and every other preset are left alone. */
  function deviceStepDown(device, gpuRaw, ua, touch, o) {
    const none = { step: false, to: device, note: '', why: '' };
    if ((device !== 'radeon' && device !== 'desktop') || (o && o.off)) return none;
    const c = classifyGpu(gpuRaw), u = String(ua || '');
    const phone = /iPad|iPhone|iPod|Android|Mobile/i.test(u) || (/Macintosh/.test(u) && (touch | 0) > 1);   /* an iPad that asks for the desktop site says Macintosh but has touch points */
    const integrated = c.kind === 'integrated';
    if (c.kind === 'software' || c.kind === 'discrete') return none;
    if (!phone && !integrated) return none;
    const what = phone ? 'a mobile device' : 'a built-in GPU (' + (c.name || 'unknown') + ')';
    return { step: true, to: 'ipad', why: phone ? 'mobile' : 'integrated', note: 'This looks like ' + what + ', so the iPad preset is used instead of ' + device + '. Add &stepdown=0 to keep ' + device + '.' };
  }
  return { cleanGpuName, classifyGpu, gpuLine, INTEGRATED_HINT, options, tierFrom, planFor, degrade, createDynRes, percentile, benchVerdict, benchReport, deviceStepDown };
}));
