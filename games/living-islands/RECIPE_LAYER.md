# Recipe layer for the Blender picture scripts (23 Nov 2026)

## What was asked
Hardware note CR-H02 (variety): the 61-seed batch "all looked alike". Every seed built the same camp (same two tents, fire, boat, row of pines, sky, camera) and only the coastline changed. The owner wanted "a bit more of a unique creation engine". The ask: a per-seed **recipe** chosen first, as plain values (island type, rock type, tree mix and density, what is there and where, time and weather, camera), written as `recipe.json` beside each output; hero_render builds from it with the parts that already exist; seed 1122 stays the legacy island as the cross-check; and a **variety judge** that runs after each batch and scores how alike the pictures are, so "unique" becomes a number.

## What was built
| File | What |
|---|---|
| `blender/recipe.py` | `recipe_for(seed)`, `legacy_recipe(seed)`, `plan_trees(recipe)`, `write_recipe`, `use_island`. Pure python + numpy, no Blender. |
| `blender/hero_render.py` | builds the scene from the recipe. `--legacy` = old camp picture on that seed's coast; `--recipe FILE`; `--recipe-only`. Writes `<output stem>.recipe.json` beside the picture. |
| `blender/li_props.py` | four simple original props: wreck, lighthouse, ruins, hut. |
| `blender/island_common.py` | a `STYLE` hook (island type) and `set_style()`; `STYLE=None` is the old behaviour (mesh hashes unchanged, tested). |
| `blender/li_scene.py` | `land_vertex_data` reads recipe ground colours; `make_sky` takes `overcast` and `haze` (0, 0 = old). |
| `blender/batch.py` | new phases `recipes` (writes `recipe_seed<N>.json`, no Blender) and `variety` (runs the judge last); `--legacy-scene` for the old look. |
| `blender/variety_judge.py` | the variety measure. |
| `tests/test_recipe.py` | pure python tests (run `python3 tests/test_recipe.py`). |

## What is chosen, and how
Everything comes from `np.random.default_rng([seed, 5113, 1])`, so a seed always gives the same recipe. Weights are TUNING, not measurements.

* **Island type** (equal weights): sandbar (long, low, pale shell sand), volcanic (cone with a crater, steep rocky flanks), cliffs (tableland with a ragged steep edge), lagoon ring (broken low ring around a shallow lagoon), archipelago (4 to 6 separate islets), plain (the earlier seed-random shape). These are reshapings of the existing island height field in `island_common` (the hook `_style_height`), not a new terrain engine.
* **Rock** A gneiss, B sandstone, C basalt, D volcanic (D always on volcanic islands, 18% on cliffs and plain). Palette from `landform/world.py` ROCKS (gneiss_grey, sandstone_red, basalt_columnar, basalt_fresh), bedding dip, columnar cracks for basalt; ground and sand colours follow the rock (red loam, black ash sand, pale shell sand on sandbar and lagoon).
* **Trees**: ten mixes (pine heath, birch and rowan, oak and hazel, dark spruce, wind-bent scrub, willow, dune scrub, ash birch, mixed, bare) with a density. `plan_trees` is map-driven: slope, rockiness, shelter from a seed-chosen wind side, wetness near the water and the rock's soil go into `li_trees.species_weights` (the same rules the landform scenes use), times the mix; trees are drawn at 0.5 to 0.65 of landform size because this island is tiny. Ground cover (juniper, gorse, bracken, heather, cotton grass) and driftwood (snags and logs) from the same maps. All 16 species can appear.
* **What is there** (camp 30, wreck 16, lighthouse 13, ruins 15, hut 15, nothing 11 %): the site is searched on a 1 m height map (camp, wreck, hut and empty beaches: gentle ground 2 to 7 m from water; lighthouse and ruins: high ground near the coast); the seaward direction is found from the map and the whole layout is turned to it. Camps get 1 to 3 tents in six weathered colours, a fire, and a boat (sometimes away). Props are low poly, no writing, hopeful: a lit lantern, a lit window, a roof that holds.
* **Time and weather** on the existing sky: five times (dawn, morning, noon, golden, dusk) set sun elevation (5 to 58 degrees), sun colour, energy (keeps the exposure steady) and exposure; four weathers (clear, hazy, cloudy, overcast) set cloud grey and haze (aerosol and air density on the Nishita sky) and soften the sun. The sun azimuth is chosen relative to the camera (mostly side-lit, some back-lit and front-lit).
* **Camera**: low beach (1.4 to 2 m above the ground, 7 to 15 m to the side), high wide (the legacy view, from the seaward side), from the sea (1.3 to 2.4 m above the water).

## Legacy and cross-check
Seed 1122 returns `legacy_recipe`, whose numbers are the constants of the old hero_render. Checked three ways: the test compares them one by one; the island mesh hashes for 1122, 77 and 2001 are unchanged; and a legacy render of 1122 from the old script and from the new one (480 x 320, 16 samples, CPU) differs by **0** in every pixel (max difference 0). One old quirk is kept for 1122 only: its shoreline search for the boat had an empty range, so the boat never moved off its start; recipe boats do walk to the shore.

## Numbers
* **Recipe spread over the 61 HW-3 seeds** (1122 and 2001 to 2060): island types 6 of 6 (sandbar 14, cliffs 13, volcanic 11, plain 10, lagoon 8, archipelago 5), rock types 4 of 4 (A 14, B 19, C 17, D 11), contents 6 of 6, cameras 3 of 3, times 5 of 5, weathers 4 of 4, tree mixes 10, **54 distinct** (island, rock, content, camera) combinations. The old batch had one of each.
* **Variety judge, method**: for each picture a joint RGB histogram (4 x 4 x 4 bins) and a 32 x 20 grey thumbnail (mean removed, unit length). Similarity of two pictures = 0.5 x histogram intersection + 0.5 x max(0, correlation of the thumbnails); 1 = the same picture. Headline = mean pairwise similarity (lower = more varied). Look-alike pair = similarity of 0.90 or more (a first guess; the pass mark is for the owner to set).
* **Baseline, old HW-3 batch (61 hero previews): mean pairwise similarity 0.833**; 105 of 1,830 pairs (5.7 %) at or above 0.90; 46 of 61 pictures have a look-alike; nearest-neighbour mean 0.911.
* **Same 12 seeds, old look: 0.840**, one look-alike pair.
* **New 12-seed recipe sheet** (`shots/recipe-sheet.png`, 640 x 420, 24 samples): **mean pairwise similarity 0.336**, no pair at or above 0.90, closest pair 0.63, nearest-neighbour mean 0.516, recipe spread 6 island types, 4 rocks, 6 contents, 3 cameras, 5 times, 4 weathers, 8 mixes in 12 pictures.
  The new number is roughly 0.5 lower than the old one. Caveat: the old numbers are 1200 x 800 JPEGs and the new are 640 x 420 PNGs (the judge shrinks both), and the judge scores difference, not beauty: it cannot say whether the pictures are good, only that they are not alike.

## What is still faked or missing
* Island types are reshapings of one height function, not the landform tool's real worlds (`landform_scene.py` remains the route for those); the volcano is a smooth cone, not the research volcano.
* Heights get +1 m in `plan_trees` (li_trees wants ground above 1.8 m and these islands are low), and the wind side, wetness and soil are cheap proxies, not the landform maps.
* Clouds are a grey mix on the sky, not a cloud model; haze is aerosol only. The flat gold band at the horizon (the sky fallback noted by hardware) is still there on low-sun pictures.
* Props are simple: the wreck is the camp rowboat scaled up with a mast and crates; ruins are plain blocks; no animals, people or boats at sea.
* Sites can sit awkwardly: ruins and lighthouse seeds on a rocky dome (for example 2008) can be framed very close, and a few cliff-top camps (2005) look straight down into the cove. Camera placement has no collision or framing check yet.
* Sea colour varies only by a density number; no storm, no night, no tide state.
* Only a 12-seed sheet was rendered, not all 61; the 61 are checked as recipes and through the tests. Tests run without Blender, so scene building is checked by renders only.
* Timing: about 25 to 45 s per 640 x 420 picture at 24 samples on the shared 4-core machine.

## How HW-4 would use it (about 60 seeds)
1. `python3 blender/batch.py --blender <blender> --seeds 1122,2001,...,2060 --out OUT --device GPU --gpu-name Radeon --require-gpu --phases recipes,previews,variety --no-bake --hero-samples 100` (hero, top and close view per seed, then the judge; `--phases recipes,previews,hires,variety` adds the large stills).
2. The `recipes` phase writes `recipe_seed<N>.json` first; every picture also has `<name>.recipe.json` beside it.
3. The `variety` phase writes `variety.txt` and `variety.json` (mean similarity, look-alike pairs, clusters, recipe spread). Compare with the baseline 0.833 and with the pass mark agreed with the owner. Re-roll look-alike pairs by changing one seed, or by editing a recipe and rendering with `--recipe`.
4. For a like-for-like check of the old look, run the same batch with `--legacy-scene`.
Cost: the hardware note puts the Radeon VII at about 100 pictures an hour, so 61 seeds with three views each is a little under 2 hours; hero only is about 40 minutes.
