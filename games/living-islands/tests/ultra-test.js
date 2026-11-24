/* ULTRA TEST (pure node): the dynamic resolution controller and the GPU name classifier of ultra.js. Run: node games/living-islands/tests/ultra-test.js */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
await import(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'ultra.js'));
const U = globalThis.LI_ULTRA;
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

/* ---- GPU names ---- */
const kind = s => U.classifyGpu(s).kind;
ok(kind('AMD Radeon VII') === 'discrete', 'AMD Radeon VII is discrete');
ok(kind('ANGLE (AMD, AMD Radeon VII Unknown Prefixed, OpenGL 4.1)') === 'discrete' && U.classifyGpu('ANGLE (AMD, AMD Radeon VII Unknown Prefixed, OpenGL 4.1)').name === 'AMD Radeon VII', 'Chrome ANGLE string for the Radeon VII reduces to AMD Radeon VII');
ok(kind('AMD Radeon Pro 5500M') === 'discrete' && kind('Radeon Pro') === 'discrete', 'Radeon Pro is discrete');
ok(kind('Intel(R) UHD Graphics 630') === 'integrated' && U.classifyGpu('Intel(R) UHD Graphics 630').integrated, 'Intel UHD Graphics 630 is integrated');
ok(kind('ANGLE (Intel Inc., Intel(R) UHD Graphics 630, OpenGL 4.1)') === 'integrated' && U.classifyGpu('ANGLE (Intel Inc., Intel(R) UHD Graphics 630, OpenGL 4.1)').name === 'Intel UHD Graphics 630', 'ANGLE Intel string reduces to Intel UHD Graphics 630');
ok(kind('Apple M1') === 'integrated' && kind('ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)') === 'integrated', 'Apple M1 is integrated');
ok(U.classifyGpu('ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)').name === 'Apple M1', 'Metal Renderer prefix removed');
ok(kind('NVIDIA GeForce RTX 3080') === 'discrete' && kind('ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)') === 'discrete', 'NVIDIA GeForce RTX is discrete');
ok(U.classifyGpu('ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)').name === 'NVIDIA GeForce RTX 3080', 'D3D11 tail removed');
ok(kind('Intel(R) Arc(TM) A770 Graphics') === 'discrete', 'Intel Arc is discrete');
ok(kind('Intel(R) Iris(TM) Plus Graphics 640') === 'integrated', 'Intel Iris is integrated');
ok(kind('AMD Radeon RX 6800 XT') === 'discrete' && kind('AMD Radeon(TM) Vega 8 Graphics') === 'integrated', 'RX is discrete, APU Vega 8 is integrated');
ok(kind('Google SwiftShader') === 'software' && kind('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)') === 'software' && kind('llvmpipe (LLVM 15.0.7, 256 bits)') === 'software', 'software renderers are flagged');
ok(kind('') === 'unknown' && kind(null) === 'unknown' && U.classifyGpu(undefined).name === '', 'no name is unknown');
const wl = U.gpuLine('Intel(R) UHD Graphics 630'), wd = U.gpuLine('AMD Radeon VII');
ok(wl.warn && wl.text.includes('On a Mac with two GPUs, Chrome may pick the built-in one') && wl.text.startsWith('GPU: Intel UHD Graphics 630'), 'integrated chip: HUD line carries the one-line hint');
ok(!wd.warn && wd.text === 'GPU: AMD Radeon VII', 'discrete chip: plain GPU: name, no warning');

/* ---- URL switches ---- */
const o = U.options('?q=ultra&ssaa=1.5&msaa=4&shadow=2048&herolod=0&dyn=0&bloom=0&terrain=0.5');
ok(o.ssaa === 1.5 && o.msaa === 4 && o.shadow === 2048 && o.herolod === false && o.dyn === false && o.bloom === 0 && o.terrain === .5, 'URL switches parse');
const d0 = U.options('');
ok(d0.ssaa === 2 && d0.msaa === 8 && d0.shadow === 4096 && d0.herolod && d0.dyn && d0.fps === 60, 'defaults are the full ultra');
const w = U.options('?ssaa=9&msaa=5&shadow=3000&terrain=0.01');
ok(w.ssaa === 2 && [0, 2, 4, 8].includes(w.msaa) && [1024, 2048, 4096, 8192].includes(w.shadow) && w.terrain >= .25, 'wild values are clamped');
ok(U.tierFrom('ultra', 'low') === 'ultra' && U.tierFrom(null, 'ultra') === 'ultra' && U.tierFrom(null, null) === 'high' && U.tierFrom('low', 'ultra') === 'low' && U.tierFrom('junk', null) === 'high', 'tier from URL then storage, default high');
const pi = U.planFor(U.options(''), 'integrated', { maxSamples: 4, maxTexture: 16384 }), pd = U.planFor(U.options(''), 'discrete', { maxSamples: 8, maxTexture: 16384 }), ps = U.planFor(U.options('?ssaa=2'), 'integrated', { maxSamples: 4 });
ok(pi.ssaa === 1.25 && pi.msaa === 4, 'integrated chip: scale 1.25 and 4 samples'); ok(pd.ssaa === 2 && pd.msaa === 8 && pd.shadow === 4096, 'discrete chip: the full set'); ok(ps.ssaa === 2, 'an explicit &ssaa is respected even on an integrated chip');
ok(U.planFor(U.options(''), 'discrete', { maxSamples: 4, maxTexture: 2048 }).msaa === 4 && U.planFor(U.options(''), 'discrete', { maxSamples: 4, maxTexture: 2048 }).shadow === 2048, 'caps clamp samples and shadow map');
let s = { ssaa: 2, msaa: 8, shadow: 4096 }, chain = [];
for (let i = 0; i < 20 && s; i++) { chain.push(s.shadow + '/' + s.msaa + '/' + s.ssaa); s = U.degrade(s); }
ok(s === null && chain[chain.length - 1] === '1024/0/1', 'degrade ladder ends at 1024 / 0 / 1: ' + chain.join(' > '));

/* ---- percentile ---- */
ok(U.percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], .95) === 10 && U.percentile([5], .95) === 5 && U.percentile([], .5) === 0, 'percentile');

/* ---- dynamic resolution: a cost model, ms(scale) = k * scale^2, with a little noise from a seeded generator ---- */
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function sim(k, seconds, o, noise = .06, seed = 1, hz = 60, start) {
  const c = U.createDynRes(Object.assign({ target: 1000 / 60 }, o || {})), R = rng(seed); if (start !== undefined) c.set(start, 0);
  let t = 0; const log = []; let prev = c.scale;
  for (let i = 0; i < seconds * hz; i++) { t = i / hz; const ms = k * c.scale * c.scale * (1 + (R() - .5) * 2 * noise); const ns = c.push(ms, t); if (ns !== prev) { log.push({ t, from: prev, to: ns }); prev = ns; } }
  return { c, log, final: c.scale, t };
}
const cfg = U.createDynRes({}).config;
let r = sim(4, 120);   /* 4 ms at scale 1: lots of headroom, 16 ms at 2.0 */
ok(r.final > 1.7 && r.final <= 2 + 1e-9, 'low frame time (4 ms at 1.0): the scale rises to ' + r.final.toFixed(3));
r = sim(30, 120, null, .06, 2, 60, 2);   /* 30 ms at scale 1 would be 120 at 2: far over budget */
ok(r.final === 1, 'very heavy scene: the scale falls to the floor 1.0 (got ' + r.final + ')');
r = sim(12, 120, null, .05, 3, 60, 2);   /* 12 * 4 = 48 ms at 2.0; fits 16.7 at about 1.0..1.15 */
ok(r.final >= 1 && r.final <= 1.25, 'heavy scene (12 ms at 1.0) settles near 1.0 to 1.25: ' + r.final.toFixed(3));
r = sim(6, 120, null, .05, 4, 60, 1);   /* 6*s^2 <= ~14.2 -> s <= 1.54 */
ok(r.final >= 1.375 && r.final <= 1.625, 'middle scene (6 ms at 1.0) settles in the middle: ' + r.final.toFixed(3));
for (const [k, seed] of [[3, 5], [5, 6], [7, 7], [9, 8], [4.2, 9], [6.5, 10]]) {
  const x = sim(k, 180, null, .07, seed, 60, 1), gaps = x.log.slice(1).map((e, i) => e.t - x.log[i].t), lastChange = x.log.length ? x.log[x.log.length - 1].t : 0;
  ok(x.final >= 1 && x.final <= 2 && x.log.every(e => e.to >= 1 && e.to <= 2), 'k=' + k + ': always within 1.0 and 2.0');
  ok(gaps.every(g => g >= Math.min(cfg.downGap, cfg.upGap) - 1e-9), 'k=' + k + ': no two changes closer than the hysteresis (' + cfg.downGap + ' s), smallest ' + (gaps.length ? Math.min(...gaps).toFixed(2) : 'n/a'));
  ok(lastChange < 100 && x.log.length <= 14, 'k=' + k + ': settles (last change at ' + lastChange.toFixed(1) + ' s, ' + x.log.length + ' changes) and does not hunt');
  /* no up-down ping-pong: after a lowering, the scale must not rise back to the level it came from */
  let pong = 0; for (let i = 2; i < x.log.length; i++) if (x.log[i].to === x.log[i - 2].to && x.log[i].from === x.log[i - 2].from) pong++;
  ok(pong === 0, 'k=' + k + ': no up-down-up repeat of the same step');
}
/* the load changes mid-run: a heavy scene appears after 40 s */
{
  const c = U.createDynRes({ target: 1000 / 60 }), R = rng(11); let k = 4, t = 0, atLow = null; const times = [];
  for (let i = 0; i < 60 * 150; i++) { t = i / 60; if (t === 60) k = 10; if (t === 100) atLow = c.scale; const ns = c.push(k * c.scale * c.scale * (1 + (R() - .5) * .1), t); if (c.state().last === t) times.push(t); }
  ok(atLow < 1.5, 'after the heavy scene appears the scale drops (to ' + atLow + ' by 100 s)');
  ok(times.every((x, i) => i === 0 || x - times[i - 1] >= 1.2 - 1e-9), 'changes stay spaced after a load change');
}
/* a one-frame hitch does not move the scale */
{
  const c = U.createDynRes({ target: 1000 / 60 }); c.set(1.5, 0); let t = 0; for (let i = 0; i < 400; i++) { t = i / 60; c.push(i === 200 ? 90 : 9, t); }
  ok(c.scale >= 1.5, 'a single 90 ms hitch in a calm run does not lower the scale');
}
/* pinned: min = max */
{ const c = U.createDynRes({ min: 1.5, max: 1.5, start: 1.5 }); for (let i = 0; i < 600; i++) c.push(2, i / 60); ok(c.scale === 1.5 && c.state().changes === 0, 'min = max pins the scale'); }
/* steps are on the grid */
{ const x = sim(4, 90, { step: .125 }); ok(x.log.every(e => Math.abs(e.to * 8 - Math.round(e.to * 8)) < 1e-9), 'scales are multiples of the 0.125 step'); }

/* a 4K-class range: the scale may fall below 1.0 (to 0.5) when the frame time needs it */
{
  const R = rng(21), c = U.createDynRes({ min: .5, max: 1, start: 1, target: 1000 / 60 }); let t = 0;
  for (let i = 0; i < 60 * 60; i++) { t = i / 60; c.push(40 * c.scale * c.scale * (1 + (R() - .5) * .08), t); }   /* 40 ms at native: needs about 0.6 */
  ok(c.scale < 1 && c.scale >= .5, '4K range: a heavy frame drops the scale below native, to ' + c.scale);
  const c2 = U.createDynRes({ min: .5, max: 1, start: .5, target: 1000 / 60 }); for (let i = 0; i < 60 * 60; i++) c2.push(5 * c2.scale * c2.scale, i / 60);
  ok(c2.scale === 1, '4K range: a light frame climbs back to native 1.0 and no further (' + c2.scale + ')');
  ok(U.options('?minscale=0.6&uiscale=1.5').minscale === .6 && U.options('?minscale=0.6&uiscale=1.5').uiscale === 1.5 && U.options('').minscale === 1, '4K switches parse: &minscale and &uiscale');
}
/* ---- the bench verdict ---- */
const T = 1000 / 60;
ok(U.benchVerdict({ avgFps: 60, p95: 16.9, workMs: 6 }, T) === 'plenty of headroom', 'verdict: plenty of headroom');
ok(U.benchVerdict({ avgFps: 58.5, p95: 18, workMs: 0 }, T) === 'near the limit', 'verdict: near the limit (a few dropped frames)');
ok(U.benchVerdict({ avgFps: 60, p95: 17, workMs: 14 }, T) === 'near the limit', 'verdict: near the limit (work time 14 ms of 16.7)');
ok(U.benchVerdict({ avgFps: 38, p95: 30, workMs: 0 }, T) === 'too heavy: lower the scale', 'verdict: too heavy');
const rep = U.benchReport({ tier: 'ultra', gpu: 'AMD Radeon VII', gpuKind: 'discrete', screen: '1920x1080 css px', dpr: 2, physical: '3840x2160', minScale: 0.5, canvas: '1920x1080', bigRT: '3840x2160', scale: 2, dyn: true, maxScale: 2, msaa: 8, shadow: 4096, aniso: 16, tris: 120000, calls: 210,
  run: { seconds: 10, frames: 600, avgFps: 60, avgMs: 16.67, p95: 16.9, max: 20, workMs: 7.1, workSrc: 'GPU timer', scaleMin: 2, scaleMax: 2, verdict: 'plenty of headroom' } });
ok(/device pixel ratio: 2.00/.test(rep) && /real pixels: 3840x2160/.test(rep) && /range 0.50 to 2.00/.test(rep), 'bench report names the device pixel ratio, the real pixels and the scale range');
ok(/GPU: AMD Radeon VII \(discrete\)/.test(rep) && /verdict: plenty of headroom/.test(rep) && /95th percentile 16.90 ms/.test(rep) && rep.split('\n').length >= 9, 'bench report is plain copyable text');
process.exit(fails ? 1 : 0);
