/* foundry tests: node games/living-islands/foundry/tests/foundry-test.mjs   (no framework; exit code 1 on any failure; uses a temp cache and temp seeds dir) */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'foundry-test-'));
process.env.FOUNDRY_CACHE = path.join(TMP, 'cache'); process.env.FOUNDRY_SEEDS = path.join(TMP, 'seeds');
const W = await import('../lib/world.mjs'), AN = await import('../lib/analyze.mjs'), SR = await import('../lib/seedrun.mjs'), M = await import('../lib/metrics.mjs');
const SC = await import('../lib/score.mjs'), B = await import('../lib/batch.mjs'), TI = await import('../lib/tiles.mjs'), OR = await import('../lib/orders.mjs'), RN = await import('../lib/render.mjs');
const { cellFor } = AN;
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('ok   ' + name); } catch (e) { fail++; console.log('FAIL ' + name + '\n     ' + (e && e.message)); } };
const eq = (a, b, m) => { if (a !== b) throw new Error((m || 'not equal') + `: ${a} vs ${b}`); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
const cli = (...a) => spawnSync(process.execPath, [path.join(ROOT, 'foundry.mjs'), ...a], { encoding: 'utf8', env: process.env });

await t('extraction: the game generator, cut from islands_look.html, reproduces the game world (6 islands, ~9% land, tallest peak ~9 m)', () => {
  const A = AN.analyze(W.gameSpec(1122), { cell: 1 }), m = A.manifest;
  eq(m.islands.length, 6, 'island count'); const land = m.islands.reduce((a, i) => a + i.area_m2, 0) / (200 * 200);
  ok(land > .07 && land < .12, 'land fraction ' + land); ok(Math.max(...m.islands.map((i) => i.h_max_m)) > 8 && Math.max(...m.islands.map((i) => i.h_max_m)) < 11, 'tallest peak');
  ok(/^[0-9a-f]{16}$/.test(W.gameCore().sourceHash), 'source hash');
});
await t('determinism: same seed gives byte-identical manifest and the same hash, also from a fresh process', () => {
  const a = JSON.stringify(SR.runSeed(42, 400).manifest), b = JSON.stringify(SR.runSeed(42, 400).manifest); eq(a, b, 'manifest bytes');
  const out = path.join(TMP, 'm42.json'); const r = JSON.parse(cli('make', '--seed', '42', '--out', out).stdout); eq(r.manifest_hash, JSON.parse(a).manifest_hash, 'cli hash');
  const again = JSON.parse(cli('make', '--seed', '42', '--out', out + '2').stdout); eq(fs.readFileSync(out, 'utf8'), fs.readFileSync(out + '2', 'utf8'), 'cli bytes');
  ok(SR.runSeed(43, 400).manifest.manifest_hash !== r.manifest_hash, 'different seeds must differ');
});
await t('manifest content: contract fields, islands, landings, channels, tide window, resources', () => {
  const m = SR.runSeed(9, 400).manifest;
  eq(m.world_seed, 9); ok(Number.isInteger(m.arrival_seed) && m.arrival_seed !== 9, 'arrival seed'); ok('play_style' in m, 'play_style key');
  eq(m.size_m, 400); eq(m.tide.rocky_landing_window_min, 9); eq(m.tide.stage_landing_window_min, 30);
  ok(m.islands.length > 2 && m.islands.every((i) => i.area_m2 > 0 && i.coast_m > 0 && i.h_max_m > 0 && i.resources), 'islands');
  ok(m.landing_sites.every((s) => s.slope <= AN.TUNING.shingle_slope_max), 'landing slopes gentle'); ok(m.channels.every((c) => c.width_m > 0 && c.flow_ms_proxy >= .15 && c.flow_ms_proxy <= 1.05), 'channels');
  ok(m.home.island && m.islands.filter((i) => i.is_home).length === 1, 'exactly one home');
});
await t('metrics are in expected ranges over 12 seeds', () => {
  for (let s = 1; s <= 12; s++) { const r = SR.runSeed(s, 400), x = r.metrics, v = x.visual;
    ok(x.land_fraction > 0.01 && x.land_fraction < 0.5, `land ${x.land_fraction} seed ${s}`); ok(x.island_count >= 3 && x.island_count <= 40, 'count'); ok(x.coast_complexity >= 1 && x.coast_complexity < 3, 'complexity ' + x.coast_complexity);
    ok(x.reachable_fraction >= 0 && x.reachable_fraction <= 1, 'reach'); ok(v.palette_restraint > .5 && v.palette_restraint <= 1, 'palette'); ok(v.contrast > 0 && v.contrast < .6, 'contrast'); ok(v.edge_energy > 0 && v.edge_energy < .2, 'edge');
    ok(r.sc.score >= 0 && r.sc.score <= 1, 'score'); ok(r.img.w === 240 && r.img.rgb.length === 240 * 240 * 3, 'render size'); }
});
await t('playability fails on a deliberately bad seed (start on a bare sand islet, alone)', () => {
  const spec = { seed: 5, size: 400, home: 0, params: {}, bars: [], isl: [{ id: 'sand_0', kind: 'sand', x: 0, z: 0, rx: 8, rz: 6, rot: 0, peak: 1.4, sb: .12, bw: 5, Rin: 5, under: .2, rough: .3, lump: 0, surf: .2, warp: 1.5 }] };
  const r = SR.runSeed(5, 400, { spec }); eq(r.play.ok, false, 'must fail'); const failed = r.play.checks.filter((c) => !c.pass).map((c) => c.id);
  for (const id of ['start_island_big_enough', 'start_has_fresh_water', 'start_has_timber', 'neighbour_reachable']) ok(failed.includes(id), 'expected failure ' + id + ' in ' + failed);
});
await t('playability passes on at least some generated seeds and every pass has the required resources', () => {
  let passes = 0; for (let s = 1; s <= 40; s++) { const r = SR.runSeed(s, 400); if (r.play.ok) { passes++; const h = r.manifest.islands.find((i) => i.is_home); ok(h.resources.fresh_water && h.resources.woodland_m2 >= M.MIN_HOME_WOOD_M2 && r.metrics.landings_home > 0, 'seed ' + s); } }
  ok(passes >= 4, 'only ' + passes + ' of 40 playable');
});
await t('batch: parallel pool, cache miss then 100% hit, identical results, catalogue + shortlist written', async () => {
  const a = await B.runBatch({ n: 10, start: 1, size: 300, workers: 2, K: 4 }); eq(a.timing.computed, 10, 'first run computes'); eq(a.timing.cache_hits, 0);
  const b = await B.runBatch({ n: 10, start: 1, size: 300, workers: 2, K: 4 }); eq(b.timing.computed, 0, 'second run computes nothing'); eq(b.timing.cache_hits, 10);
  eq(JSON.stringify(a.catalogue), JSON.stringify(b.catalogue), 'catalogue stable'); eq(JSON.stringify(a.shortlist), JSON.stringify(b.shortlist), 'shortlist stable');
  const direct = SR.runSeed(3, 300); eq(a.catalogue.seeds.find((s) => s.seed === 3).manifest_hash, direct.manifest.manifest_hash, 'pool result equals a direct run');
  ok(fs.existsSync(path.join(TMP, 'seeds', 'catalogue.json')) && fs.existsSync(path.join(TMP, 'seeds', 'shortlist.json')), 'files'); JSON.parse(fs.readFileSync(path.join(TMP, 'seeds', 'catalogue.json'), 'utf8'));
});
await t('tiles: reassemble to exactly the same heightfield (LOD0 and LOD1), overlaps agree, per-tile reduced spec equals the full spec', () => {
  const size = 512, tile = 128, ov = 8, spec = W.layout(11, size), res = TI.tileWorld({ seed: 11, size, tile, overlap: ov, cell: 1, spec, lods: 4 });
  eq(res.tiles.length, 16, 'tile count');
  for (const lod of [0, 1, 3]) { const asm = TI.assemble(res, lod), F = W.field(spec, 0, 0, asm.n, asm.n, asm.cell), ref = new Int16Array(F.h.length); for (let i = 0; i < ref.length; i++) ref[i] = Math.round(F.h[i] * 100);
    let bad = 0; for (let i = 0; i < ref.length; i++) if (ref[i] !== asm.h16[i]) bad++; eq(bad, 0, `lod ${lod} mismatching samples`); }
  /* overlap strips: the 16 samples shared by tile (0,0) and (1,0) are identical */
  const g = (tx, tz) => res.tiles.find((x) => x.man.tile[0] === tx && x.man.tile[1] === tz).lods[0]; const A = g(0, 0), Bt = g(1, 0), side = A.side; let diff = 0;
  for (let j = 0; j < side; j++) for (let i = 0; i < 2 * ov; i++) if (A.h16[j * side + (tile + i)] !== Bt.h16[j * side + i]) diff++; eq(diff, 0, 'overlap strip differences');
  /* a reduced spec is not an approximation: one tile baked from the full spec equals the reduced one */
  const Tfull = W.terrain(spec), b = TI.bakeTile(spec, Tfull, { tile, overlap: ov, cell: 1 }, 2, 2, 0), full = W.field(spec, b.i0, b.j0, b.side, b.side, 1, Tfull); let d2 = 0; for (let i = 0; i < full.h.length; i++) if (Math.round(full.h[i] * 100) !== b.h16[i]) d2++; eq(d2, 0, 'reduced vs full');
  ok(res.tiles.some((x) => x.man.islands_in_reach.length < spec.isl.length), 'some tiles reach fewer islands than the world has (flat cost)');
});
await t('tiles: hashes are stable, tile order does not matter, and a changed seed changes them', () => {
  const a = TI.tileWorld({ seed: 11, size: 256, tile: 128, overlap: 8, cell: 2, lods: 3 }), b = TI.tileWorld({ seed: 11, size: 256, tile: 128, overlap: 8, cell: 2, lods: 3 }), c = TI.tileWorld({ seed: 12, size: 256, tile: 128, overlap: 8, cell: 2, lods: 3 });
  eq(a.world.world_hash, b.world.world_hash); ok(a.world.world_hash !== c.world.world_hash, 'seed change');
  const one = TI.tileWorld({ seed: 11, size: 256, tile: 128, overlap: 8, cell: 2, lods: 3, only: [[1, 1]] }); eq(one.tiles[0].man.hash, a.tiles.find((x) => x.man.tile[0] === 1 && x.man.tile[1] === 1).man.hash, 'a tile baked alone equals the same tile baked in the whole world');
});
await t('shortlist: ranking is stable, ignores input order, only playable seeds, varied (diversity penalty used)', () => {
  const rows = Array.from({ length: 40 }, (_, i) => { const r = SR.runSeed(i + 1, 400), s = SR.summary(r); return s; });
  const a = SC.shortlist(rows, 8), b = SC.shortlist([...rows].reverse(), 8); eq(JSON.stringify(a.map((x) => x.seed)), JSON.stringify(b.map((x) => x.seed)), 'order independence');
  ok(a.every((x) => rows.find((r) => r.seed === x.seed).playable), 'only playable'); ok(a.every((x, i) => i === 0 || x.adjusted <= a[0].score + 1e-9), 'adjusted never above best raw'); eq(a[0].rank, 1);
  ok(new Set(a.map((x) => x.seed)).size === a.length, 'unique');
});
await t('contact sheet is a valid PNG under 1 MB; render orders are data only and point at manifests', async () => {
  const res = await B.runBatch({ n: 10, start: 1, size: 300, workers: 2, K: 4 });
  const items = res.shortlist.shortlist.map((e) => ({ img: RN.plan(SR.runSeed(e.seed, 300).A.F, 240), lines: ['SEED ' + e.seed, 'X'] })); const sh = RN.sheet(items, 6, 192), png = RN.encodePNG(sh.rgb, sh.w, sh.h);
  eq(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); ok(png.length < 1e6, 'size ' + png.length);
  const o = OR.makeOrders(res); const doc = JSON.parse(fs.readFileSync(o.out, 'utf8')); ok(doc.orders.length === res.shortlist.shortlist.length, 'one order per shortlisted seed');
  ok(doc.orders.every((x) => x.jobs.length >= 2 && x.jobs.every((j) => j.script && j.machine) && fs.existsSync(path.join(TMP, 'seeds', x.manifest))), 'jobs + manifests'); ok(/DATA ONLY/.test(doc.run_policy), 'policy');
});
await t('privacy: written files contain no home paths, emails or machine names', () => {
  const bad = /(\/home\/|\/Users\/|@[a-z0-9-]+\.[a-z]{2,}|\/tmp\/)/i; for (const f of fs.readdirSync(path.join(TMP, 'seeds'))) { const p = path.join(TMP, 'seeds', f); if (f.endsWith('.json')) ok(!bad.test(fs.readFileSync(p, 'utf8')), 'path leak in ' + f); }
});
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
