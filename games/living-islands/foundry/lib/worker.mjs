/* foundry/lib/worker.mjs -- a pool worker: receives {seed,size,cell,over}, computes, writes the cache, answers with the summary. */
import { parentPort } from 'node:worker_threads';
import { runSeed, summary } from './seedrun.mjs';
import { recipeKey, writeCache } from './cache.mjs';
parentPort.on('message', (t) => {
  if (t === 'stop') { process.exit(0); }
  const t0 = performance.now(), r = runSeed(t.seed, t.size, { cell: t.cell, over: t.over }), key = recipeKey(t.seed, t.size, t);
  const s = summary(r); writeCache(key, { key, summary: s, manifest: r.manifest }, r.img);
  parentPort.postMessage({ key, seed: t.seed, ms: performance.now() - t0 });
});
