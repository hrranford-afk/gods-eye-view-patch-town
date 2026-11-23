# Seed foundry (Living Islands), v1 on the land formation tool

Do not put real place names into game code or assets. One orchestrator command sweeps worlds of `landform/world.py` (provinces A gneiss, B sandstone, C basalt), measures them, ranks them with a transparent score, makes one contact sheet to look at, and writes render orders as data. The earlier JavaScript foundry (invented-island generator, old seeds, old sheet) is kept under `foundry/legacy_js/` and is no longer the entry point.

## How it works now
```
python3 foundry/sweep.py --seeds 200 --provinces ABC --n 257 --workers 2     # sweep + shortlist + sheet + orders
python3 foundry/sweep.py sweep|shortlist|sheet|orders|tiles ...                # any single step
python3 foundry/tuning.py run|confirm|report                                   # parameter sensitivity (TUNING_REPORT.md)
python3 foundry/tests/test_foundry.py                                          # 17 checks, about 5 s
```
1. **Manifest and hash.** For each (province, seed): `{province, seed, size_m, n, world.py hash, checks.py hash, metrics hash, patch}`, hashed (sha256, 16 hex). Weights are not in the hash, so re-ranking never recomputes a world.
2. **Snapshot.** The sweep copies `world.py`, `checks.py`, `sheet.py` once into `.cache/snap/<hash>/` and every worker imports that copy. If someone edits `landform/world.py` while the sweep runs, the sweep still finishes with the hash it started with; the catalogue records `world_py_hash`, `world_py_hash_at_end` and `world_py_changed_during_sweep`. (This happened in the real run, see numbers.)
3. **Cache.** `foundry/.cache/worlds/<hash>.json` (metrics, array hash, timings, peak memory) and `<hash>.png` (224 px hillshade plan view). Git-ignored. A second run is all hits.
4. **Measures** (`lfmetrics.py`): everything in `landform/checks.py` (Korcak K, coast box dimension D, slope, sand share, land below 10 m, shelf, coves, landing candidates) plus: island size classes (skerries 64-500 m2), start island (below), distance from the start landing to the nearest landing on another island and to the nearest cove, row gap from the start island to the next island, islands that merge at low tide (count, largest group), deepest enclosed channel, narrowest strait, and four cheap visual numbers from the plan view (muted-palette share, land/sea contrast, edge energy, vegetation variety).
5. **Start island rule (mine, from the brief).** Largest island (area at least 1500 m2) whose bounding box is 60 to 200 m, is not within 14 m of the world edge, has a best landing scoring at least 0.85 (same formula as `blender/landform_scene.py`, copied because that file imports bpy), has fresh water (a loch of 20 m2, or 80 m2 of wet ground), timber soil (150 m2 of gentle sheltered ground with soil depth at least 0.15 m) and a sheltered lee landing (exposure at most 0.30). No island passing all six = no start = DISQUALIFIED. That is the only way to be disqualified.
6. **Shortlist** (`shortlist.py`, `weights.json`): score = weighted mean of 23 trapezoid desirabilities (realism 8 terms, archipelago 2, start/landings/coves/row gap 6, tide 1, seabed 2, visual 4). Greedy diversity pick (penalty for being close to an already chosen world of the same province on 9 features). Output `seeds/shortlist.json`: top 12 per province, top 24 overall (best 8 per province so the sheet shows all three; the unbalanced global top 24 is also listed), strongest and weakest terms and the failed terms of each, group totals, and a compact table of every other world with its score and failed checks.
7. **Sheet** (`sheet.py`): `seeds/shortlist_sheet.png`, 8 per province in one row each, stamped with province, seed, rank, score, island and skerry counts, K, D, coves, start island number and extent, row gap; the start landing is a yellow ring. 1828x688, 0.67 MB.
8. **Orders** (`orders.py`): `foundry/render_orders.json`, data only (see below). **Tiles** (`sweep.py tiles`): the tile table (128 m windows, 8 m overlap) of a world, data only.
9. **Parameter sensitivity** (`tuning.py`, `TUNING_REPORT.md`): monkeypatches the tool's constants in process (no edit of world.py). Proposals only.

## Token-saving rules (for whoever drives the foundry)
- Look only at `seeds/shortlist_sheet.png`. Never open the catalogue or the cache by eye; ask for a number by key with a small script, or read `shortlist.json`.
- Results are small JSON; the heavy things (world arrays, thumbnails) are cache and are never committed.
- Everything is cached by hash. Re-run freely: the second run of the whole command took 2 s. Changing `weights.json` never recomputes a world; changing metric code or `world.py` recomputes only what changed.
- Use the shortlist and the failed-check lists, not the 600-row table, to decide what to render.

## What runs where
| step | where | cost |
|---|---|---|
| sweep, metrics, shortlist, sheet, tuning, tests | any machine with python3 + numpy + PIL; CPU only, 2 worker processes, under 100 MB each | minutes |
| orders (n=513 rebuild of 24 + 12 spare worlds) | same, 58 s on 2 workers | about 1 min |
| Blender renders (the orders' commands) | a machine with Blender 3.6+ (CPU or GPU through batch.py); NOT run here | hero about 4.5 min at 64 samples, per `landform/LANDFORM.md`; 100 and 256 samples are estimates |
| legacy JS foundry | node, `foundry/legacy_js/` | not used |

## Render orders
`foundry/render_orders.json`: for each of the top 24, seed, province, the start island id at n=513 (and at n=257), what batch.py's `choose_island` would pick, the landing, two camera presets from `island_camera` (from the south, and from the side of the start landing), and the commands: `python3 blender/batch.py --blender $BLENDER --seeds S --out $OUT/hero --phases landform --lf-provinces P --lf-samples 100 --hero-w 1200 --hero-h 800 --device CPU` (hero) and the same with `--lf-samples 256 --hero-w 2400 --hero-h 1600` for the overall top 6 (hires), plus the direct `landform_scene.py ... --island N` call for worlds where the batch phase would pick another island (2 of 24). Note: batch.py's landform phase uses `--lf-samples` and `--hero-w/--hero-h` (not `--hi-*`). Heads up from the real run: the render builds the world at n=513, the sweep at n=257, and they differ: for 8 of the 24 the start island id changed, and 6 of 24 have no start island at n=513 (all but one of them basalt), so each order carries `start_ok_n513` and, where it fails, `replace_with` (next shortlisted world that still passes at n=513; 4 of 6 replaced).

## Real numbers (this machine: 4 cores shared with other jobs, 2 workers, n=257, 200 seeds per province, seeds 1 to 200)
- Sweep of 600 worlds: 446 s wall, first run, nothing cached (0.74 s per world wall on 2 workers). CPU time summed over worlds: A 213 s world + 34 s metrics, B 249 + 37, C 315 + 41 (so about 124, 143, 178 s wall per province of 200 worlds when two workers share them). World build 1.06 / 1.25 / 1.58 s mean (A / B / C), metrics and plan 0.17-0.20 s.
- Peak memory: 96 MB resident per worker process, 19 MB in the parent (resource.getrusage); the tuning study (n=129) 59 MB per worker.
- Second run of the same command (600 cache hits, shortlist, sheet and orders rebuilt): 2.2 s.
- world.py changed on disk during the first sweep (tree/basalt job); the sweep finished on its snapshot, hash `2b3433504179929c`; the file at the end was `4bd68886f2b16132`. A rerun on the new file would recompute everything (new hashes) and may shortlist different worlds, especially for C.
- Playability: start island found in 117/200 (A), 134/200 (B), 79/200 (C); total 270 of 600 disqualified. Failed rules of the best partial island: A size 70, water 10, landing 2, edge 2; B size 62, water 2, landing 2; C size 62, edge 43, water 29, landing 6 (counts overlap). Mostly "size": no island within the 60-200 m box that also passes the rest.
- Realism means over 200 worlds (A / B / C): K 0.52 / 0.48 / 0.43 (band 0.5-0.85), coast D 1.17 / 1.18 / 1.10 (band 1.10-1.35), median land slope 37 / 34 / 28 deg, skerries (64-500 m2) 10 / 8.8 / 4.4, islands 23.5 / 22 / 13, sand share 0.19 / 0.13 / 0.00, land below 10 m 0.82 / 0.88 / 0.82, coves 7.4 / 10.1 / 2.1, shelf share 0.86 / 0.82 / 0.41. Row gap from the start island to the next one: median 22 / 16 / 33 m. Islands that merge at low tide: 6.5 / 4.1 / 2.6 on average.
- Best scores: A 0.936, B 0.920, C 0.936 (mean of qualified A 0.857, B 0.837, C 0.743). The unbalanced global top 24 is 18 A, 5 B, 1 C, hence the 8-per-province top 24.
- Tuning study: 1710 worlds at n=129 in 258 s, plus 240 confirmation worlds at n=257. Findings are in `TUNING_REPORT.md` (proposals, not applied).

## Honest limits
- The metrics cannot judge beauty. They measure bands (K, D, slope, counts, gaps) and a few crude picture numbers; a high score means "inside the bands and playable by my rules", not "good looking". Look at the sheet and the renders.
- The palette/visual score is crude: saturation and contrast of a hillshade plan view with the tool's own colours (`sheet.render_plan`); vegetation variety is an entropy. It has low weights on purpose.
- The start island rule and every weight and band in `weights.json` are my design (TUNING), not facts. 46% of worlds fail it, 60% of basalt; the size rule is the usual reason.
- The sweep runs at n=257 (2 m cells); the render builds n=513. They differ (see render orders): treat the n=257 shortlist as a proxy and use the n=513 check in the orders before spending render hours. K and D depend on the grid.
- Skerry counts, K and D use the tool's 4-cell island floor (64 m2 at n=257). Tidal merge and strait numbers use the tool's own +-1.1 m tide and edge-point sampling (80 points per island), so strait widths are approximate to a cell or two.
- Freshwater and timber are map-based guesses (lochs, wet ground, soil depth from the rock table); they do not model streams or real tree growth.
- Basalt (C) mostly fails the start rule because its islands are large or at the edge; the tool has no basalt landing candidates in many worlds (landing falls back to a shore scan).
- Provinces P4-P8 do not exist in the tool; the diversity pick works only within a province.
- Tuning proposals were found on a coarse grid and confirmed on 20 seeds only; effects are linear fits.

## Files
`sweep.py` (orchestrator, cache, snapshot, tiles), `lfmetrics.py`, `shortlist.py`, `weights.json`, `sheet.py`, `orders.py`, `tuning.py`, `render_orders.json`, `TUNING_REPORT.md`, `tests/test_foundry.py`, `seeds/{catalogue,shortlist,tuning_results}.json`, `seeds/shortlist_sheet.png`, `.cache/` (ignored), `legacy_js/`.
