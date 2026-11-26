/* COST LADDER TEST (pure node): the parts of cost_ladder.js that need no page: findK (the doubling), median, fitPixels (the pixel line), rowOf, the rung list and the report formatter.
   Run: node games/living-islands/tests/cost-test.js
   Also checks the report has no file path, no user name and no home directory, and says which timing method was used. Software GL numbers are never claimed to be device numbers. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
await import(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'cost_ladder.js'));
const C = globalThis.LI_COST;
let fails = 0, n = 0;
const ok = (c, m) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const near = (a, b, e) => Math.abs(a - b) <= (e === undefined ? 1e-9 : e);

/* ---- median ---- */
ok(C.median([3, 1, 2]) === 2 && C.median([4, 1, 3, 2]) === 2.5 && C.median([]) === 0 && C.median([NaN, 5, 7]) === 6, 'median: odd, even, empty, and it skips NaN');

/* ---- findK: doubling until the batch is over 33 ms ---- */
{
  const calls = []; const r = C.findK(K => { calls.push(K); return K * 5; });   /* 5 ms per render: 1, 2, 4, 8 (40 ms) */
  ok(r.K === 8 && near(r.perRender, 5) && !r.capped && calls.join() === '1,2,4,8', 'findK: 5 ms a render doubles 1,2,4,8 and stops at K 8 (40 ms)');
  const r2 = C.findK(K => K * 40); ok(r2.K === 1 && near(r2.perRender, 40), 'findK: a render already over 33 ms keeps K 1');
  const r3 = C.findK(K => K * 0.01, { maxK: 64 }); ok(r3.K === 64 && r3.capped, 'findK: a very fast device hits the cap and says so');
  const r4 = C.findK(K => K * 16.7); ok(r4.K === 2 && near(r4.perRender, 16.7) && r4.batchMs > C.OVER_MS, 'findK: a vsync-sized frame (16.7 ms) is measured with K 2 (33.4 ms in one frame), so the lock cannot hide it');
  const r5 = C.findK(() => NaN); ok(r5.bad === true, 'findK: a broken timer is reported, not looped forever');
  const r6 = C.findK(K => K * 3, { over: 100 }); ok(r6.K === 64 && r6.batchMs === 192, 'findK: the over limit can be changed');
}

/* ---- rowOf: the sign of a cost ---- */
{
  const a = C.rowOf('sea', 'sea', 10, 6, 1); ok(near(a.deltaMs, 4) && near(a.pct, 40), 'rowOf: a layer switched off that saves 4 of 10 ms costs 4 ms (40 percent)');
  const b = C.rowOf('s2', 'x', 10, 25, -1); ok(near(b.deltaMs, 15) && near(b.pct, 150), 'rowOf: a heavier setting that adds 15 ms is +15 ms (150 percent)');
  const z = C.rowOf('z', 'z', 0, 0, 1); ok(z.pct === 0, 'rowOf: a zero baseline gives 0 percent, not NaN');
}

/* ---- fitPixels: ms = fixed + perMpix x megapixels ---- */
{
  const pts = [0.5, 1, 2, 4].map(m => ({ mpix: m, ms: 3 + 2.5 * m }));
  const f = C.fitPixels(pts);
  ok(near(f.fixed, 3, 1e-9) && near(f.perMpix, 2.5, 1e-9) && near(f.r2, 1, 1e-9) && f.n === 4, 'fitPixels: an exact line gives fixed 3, 2.5 ms per megapixel, r2 1');
  ok(C.fitPixels([{ mpix: 1, ms: 5 }]) === null && C.fitPixels([{ mpix: 1, ms: 5 }, { mpix: 1, ms: 6 }]) === null && C.fitPixels([]) === null, 'fitPixels: fewer than two distinct sizes gives null');
  const m = C.mpixAtFrame(f, C.FRAME_MS); ok(near(m, (C.FRAME_MS - 3) / 2.5, 1e-9), 'mpixAtFrame: the pixel count where the line meets 16.7 ms');
  ok(C.mpixAtFrame({ fixed: 20, perMpix: 1 }, C.FRAME_MS) === null && C.mpixAtFrame({ fixed: 1, perMpix: 0 }, C.FRAME_MS) === null && C.mpixAtFrame(null) === null, 'mpixAtFrame: null when the fixed part alone is over the frame, when the line is flat, or with no fit');
  /* the iPad sea bench shape: 1.5x held (16.7 locked), 2x 24.1, 3x 48.2: a straight line in pixels (2x -> 4 units of area, 3x -> 9) */
  const g = C.fitPixels([{ mpix: 4, ms: 24.1 }, { mpix: 9, ms: 48.2 }]); ok(g.perMpix > 4.5 && g.perMpix < 5 && g.fixed < 6 && g.fixed > 3, 'fitPixels: the owner iPad sea numbers (2x 24.1 ms, 3x 48.2 ms) fit about 4.8 ms per unit of area and a small fixed part');
}

/* ---- the rung list ---- */
{
  const ids = C.RUNGS.map(r => r.id);
  ok(new Set(ids).size === ids.length, 'rungs: every id is different');
  for (const want of ['sea', 'shadows', 'sky', 'props', 'particles', 'post', 'bloom', 'msaa', 'scale0.5', 'scale2']) ok(ids.includes(want), 'rungs: has ' + want);
  const sc = C.RUNGS.filter(r => r.scale).map(r => r.scale); ok(Math.min(...sc) === 0.5 && Math.max(...sc) === 2, 'rungs: resolution goes from 0.5x to 2x');
  ok(C.RUNGS.every(r => r.kind === 'layer' || r.kind === 'heavy') && C.RUNGS.filter(r => r.scale).every(r => r.kind === 'heavy' && r.dir === -1), 'rungs: every rung has a kind, and resolution rungs are heavy changes that add work');
}

/* ---- the report ---- */
{
  const rows = [C.rowOf('sea', 'sea (water mesh and its shader)', 9.2, 5.1, 1, { dCalls: -1, dTris: -23040 }), C.rowOf('scale2', 'resolution 2x', 9.1, 31.4, -1, { note: 'canvas 1668x2124, 3.54 Mpix' }),
    C.rowOf('bloom', 'bloom (ultra tier only)', 9.2, NaN, 1, { note: 'not in use on this tier' })];
  const fit = C.fitPixels([{ mpix: 0.9, ms: 9.2 }, { mpix: 3.5, ms: 31.4 }]); fit.mpixAt60 = C.mpixAtFrame(fit, C.FRAME_MS);
  const d = { method: { timer: false }, device: 'ipad', tier: 'low', query: '?game=gift&device=ipad&cost=1', gpu: 'Apple GPU', gpuKind: 'integrated', dpr: 2, screen: '834x1062 css px', canvas: '834x1062', msaa: 0, shadow: 1024, tris: 153747, calls: 163, K: 4, samples: 3, baseMs: 9.2, cpuMs: 2.1, rows, fit };
  const r = C.formatReport(d);
  ok(/renderer: Apple GPU \(integrated\)/.test(r) && /device pixel ratio: 2.00/.test(r) && /canvas: 834x1062 px/.test(r), 'report: names the renderer, the pixel ratio and the canvas');
  ok(/GPU timer \(EXT_disjoint_timer_query_webgl2\): not available/.test(r) && /gl\.finish\(\)/.test(r) && /readPixels/.test(r), 'report: says which method was used and that the GPU timer was not available');
  ok(/estimated headroom at 60 fps: 7\.47 ms/.test(r), 'report: estimated headroom at 60 fps is 16.67 minus the baseline (7.47 ms)');
  ok(/render alone/.test(r) && /NOT in this number/.test(r), 'report: says what the headroom does not include');
  ok(/sea \(water mesh and its shader\) \| 9\.20 \| 5\.10 \| \+4\.10 \| 45% \| -1 \| -23040/.test(r), 'report: the sea row has the with, changed, cost, percent, calls and triangles');
  ok(/resolution 2x \| 9\.10 \| 31\.40 \| \+22\.30/.test(r) && /pixel fit/.test(r), 'report: the resolution row and the pixel fit are there');
  ok(/bloom .* \| n\/a \| n\/a/.test(r), 'report: a rung that could not run says n/a and why');
  ok(!/\/home\/|\/Users\/|C:\\|file:\/\/|\/tmp\//.test(r) && !/@/.test(r), 'report: no file path, no home directory, no email');
  ok(r.split('\n').length >= 12 && !/NaN|undefined|Infinity/.test(r), 'report: plain text, no NaN or undefined');
  const rt = C.formatReport({ method: { timer: true }, K: 2, baseMs: 14, gpuMs: 11.02, rows: [], stopped: 'rung "x" takes 250 ms per render, over the 200 ms limit', notes: ['a note'] });
  ok(/timer.*present, used/.test(rt) && /gpu timer 11\.02 ms/.test(rt) && /STOPPED: rung "x"/.test(rt) && /notes: a note/.test(rt), 'report: with a timer it says so and shows the GPU ms; a stop reason and notes are printed');
  const rn = C.formatReport({}); ok(/BASELINE: not measured/.test(rn) && !/NaN|undefined/.test(rn), 'report: an empty run still prints, with no NaN');
  const over = C.formatReport({ baseMs: 40, rows: [] }); ok(/headroom at 60 fps: -23\.33 ms/.test(over), 'report: a frame over 16.7 ms shows negative headroom');
}
console.log('cost-test: ' + (n - fails) + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
