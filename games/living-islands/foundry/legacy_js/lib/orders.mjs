/* foundry/lib/orders.mjs -- render orders for the shortlist: DATA ONLY. Nothing here runs a renderer. A machine with the right hardware picks the file up later. */
import fs from 'node:fs';
import path from 'node:path';
import { SEEDS_DIR } from './batch.mjs';
import { recipeKey, readCache } from './cache.mjs';

export function makeOrders(res) {
  const size = res.catalogue.size_m, orders = [];
  for (const e of res.shortlist.shortlist) {
    const c = readCache(recipeKey(e.seed, size, { cell: res.cell })), m = c.manifest, home = m.islands.find((i) => i.is_home), L = m.landing_sites.find((s) => s.home);
    const wide = { name: 'wide', pos: [Math.round(size * .62), Math.round(size * .42), Math.round(size * .62)], target: [0, 0, 0], fov: 38, note: 'raised oblique view from the south-east corner over the whole map' };
    const lx = L ? L.x - L.approach[0] * -1 : home.x, lz = L ? L.z : home.z;
    const landing = L ? { name: 'landing', pos: [+(L.x + L.approach[0] * 26).toFixed(1), 7, +(L.z + L.approach[1] * 26).toFixed(1)], target: [L.x, 0.6, L.z], fov: 34, note: 'low view from the sea onto the start landing' }
                      : { name: 'landing', pos: [home.x + 30, 8, home.z + 30], target: [home.x, 0.5, home.z], fov: 34, note: 'no landing found; frame the start island' };
    orders.push({ seed: e.seed, manifest_hash: e.manifest_hash, rank: e.rank, size_m: size,
      manifest: `manifests/${e.seed}.json`,
      jobs: [
        { id: `land-bake-${e.seed}`, machine: 'hardware', script: 'games/living-islands/blender/bake_land.py', args: ['--seed', e.seed, '--tex', 2048, '--samples', 48, '--grid', 257], needs: 'blender (bpy), several minutes on 4 cores', status: 'blocked: bake_land.py does not yet read a foundry spec (it builds its own island from --seed). Needs a --spec/--heightfield input; tile heightfields from `foundry tiles` are the intended input.' },
        { id: `hero-${e.seed}`, machine: 'hardware', script: 'games/living-islands/blender/hero_render.py', args: ['--seed', e.seed, '--samples', 100, '--grid', 257], resolution: [1200, 800], samples: 100, cameras: [wide, landing], needs: 'blender (bpy)', status: 'blocked: same as above' },
        { id: `live-${e.seed}`, machine: 'any browser', script: 'games/living-islands/islands_look.html', query: `?seed=${e.seed}&pass=landing`, resolution: [1280, 800], cameras: [wide, landing], status: 'partial: ?seed only changes noise; the hand-authored island layout is fixed. A spec-injection hook (?spec=<manifest>) is needed in the game to show a foundry layout.' }
      ] });
  }
  const doc = { schema: 'foundry_render_orders', version: 1, run_policy: 'DATA ONLY. Not executed by the foundry. Hardware jobs are for a machine with the renderer installed; check capacity first.', orders };
  const dir = path.join(SEEDS_DIR, 'manifests'); fs.mkdirSync(dir, { recursive: true });
  for (const e of res.shortlist.shortlist) { const c = readCache(recipeKey(e.seed, size, { cell: res.cell })); fs.writeFileSync(path.join(dir, e.seed + '.json'), JSON.stringify(c.manifest, null, 1) + '\n'); }
  fs.writeFileSync(path.join(SEEDS_DIR, 'render-orders.json'), JSON.stringify(doc, null, 1) + '\n');
  return { out: path.join(SEEDS_DIR, 'render-orders.json'), orders: orders.length, manifests: dir };
}
