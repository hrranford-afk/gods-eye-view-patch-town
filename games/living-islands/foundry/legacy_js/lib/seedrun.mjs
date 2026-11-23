/* foundry/lib/seedrun.mjs -- one seed end to end (pure function of seed, size, cell, code version). Used by the CLI and by the workers. */
import { layout } from './world.mjs';
import { analyze } from './analyze.mjs';
import { computeMetrics, playability } from './metrics.mjs';
import { score } from './score.mjs';
export function runSeed(seed, size, opts = {}) {
  const spec = opts.spec || layout(seed, size, opts.over);
  const A = analyze(spec, opts);
  const { metrics, img } = computeMetrics(A);
  const play = playability(A.manifest, metrics), sc = score(metrics);
  return { spec, A, manifest: A.manifest, metrics, img, play, sc };
}
export function summary(r) {
  const m = r.manifest, hl = m.landing_sites.find((s) => s.home);
  return { seed: m.world_seed, size_m: m.size_m, manifest_hash: m.manifest_hash, playable: r.play.ok, failed: r.play.checks.filter((c) => !c.pass).map((c) => c.id + ': ' + c.detail),
    score: r.sc.score, parts: r.sc.parts, metrics: r.metrics, home_kind: m.islands.find((i) => i.is_home)?.kind, home_landing: hl ? [hl.x, hl.z] : null };
}
