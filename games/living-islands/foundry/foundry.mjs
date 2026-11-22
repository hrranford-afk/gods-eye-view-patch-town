#!/usr/bin/env node
/* foundry -- the Living Islands seed foundry. One orchestrator command, small JSON out. See FOUNDRY.md.
   node foundry/foundry.mjs make    --seed N [--size S] [--out file]     world manifest JSON (stdout or file) + hash
   node foundry/foundry.mjs measure --seed N [--size S]                  metrics + playability + score (short JSON)
   node foundry/foundry.mjs batch   [--n 200] [--start 1] [--size 400] [--workers W] [--k 24]
   node foundry/foundry.mjs sheet                                        contact sheet of the shortlist (the one image to look at)
   node foundry/foundry.mjs render-orders                                render orders for the shortlist (data only, nothing is run)
   node foundry/foundry.mjs tiles   --seed N [--size 1024] [--tile 128] [--overlap 8] [--out dir]
   node foundry/foundry.mjs all     [batch options]                      batch + sheet + render-orders */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HERE } from './lib/world.mjs';
import { runSeed, summary } from './lib/seedrun.mjs';
import { runBatch, SEEDS_DIR } from './lib/batch.mjs';
import { recipeKey, readCache } from './lib/cache.mjs';
import { cellFor } from './lib/analyze.mjs';
import { sheet, encodePNG } from './lib/render.mjs';
import { makeOrders } from './lib/orders.mjs';
import { tileWorld } from './lib/tiles.mjs';

const argv = process.argv.slice(2), cmd = argv[0];
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const num = (k, d) => Number(arg(k, d));

async function doSheet(res) {
  const sl = res.shortlist.shortlist.slice(0, 24), size = res.catalogue.size_m;
  const items = sl.map((e) => { const c = readCache(recipeKey(e.seed, size, { cell: res.cell })), s = c.summary, x = s.metrics, hl = s.home_landing;
    return { img: c.thumb, mark: hl ? [[(hl[0] + size / 2) / size, (hl[1] + size / 2) / size]] : [],
      lines: [`#${e.rank} SEED ${e.seed} S${e.score.toFixed(2)}`, `LAND ${(x.land_fraction * 100).toFixed(0)}% ISL ${x.island_count} ${s.home_kind || ''}`, `SHELT ${x.sheltered_landings} ROW ${x.nearest_neighbour_row_min}M`] }; });
  const img = sheet(items, 6, 192), png = encodePNG(img.rgb, img.w, img.h), out = path.join(SEEDS_DIR, 'shortlist-sheet.png');
  fs.writeFileSync(out, png); return { out, bytes: png.length, w: img.w, h: img.h };
}

try {
  if (cmd === 'make') {
    const seed = num('seed', 1122), size = num('size', 400), r = runSeed(seed, size, { cell: arg('cell') ? num('cell') : undefined });
    const json = JSON.stringify(r.manifest, null, 1) + '\n', out = arg('out');
    if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, json); console.log(JSON.stringify({ out, manifest_hash: r.manifest.manifest_hash, islands: r.manifest.islands.length, bytes: json.length })); } else process.stdout.write(json);
  } else if (cmd === 'measure') {
    const seed = num('seed', 1122), size = num('size', 400), r = runSeed(seed, size);
    console.log(JSON.stringify({ ...summary(r), checks: r.play.checks }, null, 1));
  } else if (cmd === 'batch' || cmd === 'all') {
    const res = await runBatch({ n: num('n', 200), start: num('start', 1), size: num('size', 400), workers: num('workers', os.cpus().length), K: num('k', 24) });
    console.log(JSON.stringify({ timing: res.timing, playable: `${res.catalogue.playable}/${res.catalogue.count}`, shortlist: res.shortlist.shortlist.map((s) => s.seed) }));
    if (cmd === 'all') {
      const sh = await doSheet(res); const ord = makeOrders(res); console.log(JSON.stringify({ sheet: sh, orders: ord }));
    }
  } else if (cmd === 'sheet' || cmd === 'render-orders') {
    const res = await runBatch({ n: num('n', 200), start: num('start', 1), size: num('size', 400), workers: num('workers', os.cpus().length), K: num('k', 24) });   /* all cache hits after a batch */
    console.log(JSON.stringify(cmd === 'sheet' ? await doSheet(res) : makeOrders(res)));
  } else if (cmd === 'tiles') {
    const t = tileWorld({ seed: num('seed', 1122), size: num('size', 1024), tile: num('tile', 128), overlap: num('overlap', 8), cell: num('cell', 1), out: arg('out'), write: !!arg('out') });
    console.log(JSON.stringify(t.summary));
  } else { console.error(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 12).join('\n')); process.exit(cmd ? 2 : 0); }
} catch (e) { console.error(e.stack || e); process.exit(1); }
