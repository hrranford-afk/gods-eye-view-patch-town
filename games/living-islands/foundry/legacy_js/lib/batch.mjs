/* foundry/lib/batch.mjs -- run N seeds on a worker pool (default: one worker per core), cache by recipe key, write catalogue + shortlist. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { HERE, sha } from './world.mjs';
import { cellFor } from './analyze.mjs';
import { recipeKey, readCache, CACHE_DIR } from './cache.mjs';
import { score, shortlist, SCORE, MMR } from './score.mjs';

export const SEEDS_DIR = process.env.FOUNDRY_SEEDS || path.resolve(HERE, '../seeds');   /* env override is for tests */
export async function runBatch({ n = 200, start = 1, size = 400, workers = os.cpus().length, K = 24, log = console.error } = {}) {
  const t0 = performance.now(), cell = cellFor(size), seeds = Array.from({ length: n }, (_, i) => start + i);
  const todo = [], got = new Map(); let hits = 0;
  for (const s of seeds) { const key = recipeKey(s, size, { cell }), c = readCache(key); if (c) { got.set(s, c); hits++; } else todo.push(s); }
  const cpuMs = []; let wall = 0;
  if (todo.length) {
    const tw = performance.now(), W = Math.min(workers, todo.length);
    await new Promise((resolve, reject) => {
      let next = 0, done = 0; const pool = [];
      const feed = (w) => { if (next < todo.length) w.postMessage({ seed: todo[next++], size, cell }); else w.postMessage('stop'); };
      for (let i = 0; i < W; i++) { const w = new Worker(path.join(HERE, 'worker.mjs')); pool.push(w);
        w.on('message', (m) => { cpuMs.push(m.ms); done++; if (done === todo.length) { pool.forEach((x) => x.terminate()); resolve(); } else feed(w); });
        w.on('error', reject); feed(w); }
    });
    wall = performance.now() - tw;
  }
  const rows = seeds.map((s) => { const c = got.get(s) || readCache(recipeKey(s, size, { cell })); return c.summary; });
  const rescored = rows.map((r) => ({ ...r, ...(() => { const x = score(r.metrics); return { score: x.score, parts: x.parts }; })() }));  /* weights may have changed since the cache was written */
  const list = shortlist(rescored, K);
  const catalogue = { schema: 'foundry_catalogue', version: 1, size_m: size, cell_m: cell, count: rows.length, playable: rescored.filter((r) => r.playable).length,
    seeds: rescored.map((r) => ({ seed: r.seed, manifest_hash: r.manifest_hash, playable: r.playable, score: r.score, home_kind: r.home_kind, metrics: r.metrics, failed: r.failed })) };
  const failCounts = {}; for (const r of rescored) for (const f of r.failed) { const k = f.split(':')[0]; failCounts[k] = (failCounts[k] || 0) + 1; }
  const sl = { schema: 'foundry_shortlist', version: 1, size_m: size, K, method: 'playability is a hard gate; then score = weighted mean of band desirabilities; then greedy diversity (score - lambda * similarity to those already chosen)',
    weights: SCORE.map((s) => ({ key: s.key, w: s.w, band: s.band, why: s.why })), diversity: MMR, playable_of_total: `${catalogue.playable}/${rows.length}`, failed_check_counts: failCounts,
    shortlist: list, rejected: rescored.filter((r) => !r.playable).map((r) => ({ seed: r.seed, failed: r.failed.map((f) => f.split(':')[0]) })),
    not_shortlisted_playable: rescored.filter((r) => r.playable && !list.some((l) => l.seed === r.seed)).map((r) => ({ seed: r.seed, score: r.score })) };
  fs.mkdirSync(SEEDS_DIR, { recursive: true });
  fs.writeFileSync(path.join(SEEDS_DIR, 'catalogue.json'), '{"schema":"foundry_catalogue","version":1,"size_m":' + size + ',"cell_m":' + cell + ',"count":' + rows.length + ',"playable":' + catalogue.playable + ',"seeds":[\n' + catalogue.seeds.map((s) => JSON.stringify(s)).join(',\n') + '\n]}\n');
  fs.writeFileSync(path.join(SEEDS_DIR, 'shortlist.json'), JSON.stringify(sl, null, 1) + '\n');
  const timing = { seeds: n, size_m: size, workers: todo.length ? Math.min(workers, todo.length) : 0, cache_hits: hits, computed: todo.length, wall_s: +((performance.now() - t0) / 1000).toFixed(2), compute_wall_s: +(wall / 1000).toFixed(2),
    cpu_ms_per_seed_mean: cpuMs.length ? +(cpuMs.reduce((a, b) => a + b, 0) / cpuMs.length).toFixed(1) : null };
  return { catalogue, shortlist: sl, rowsByseed: new Map(rescored.map((r) => [r.seed, r])), timing, cell };
}
