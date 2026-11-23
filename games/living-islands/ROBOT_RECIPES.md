# ROBOT_RECIPES: one recipe per machine, for the collector family (task 37, 23 Nov 2026)

The same idea as the island recipe layer (`RECIPE_LAYER.md`): a seed is turned into plain values that say what a machine is made of, before anything is built. The values then drive the part functions of the committed collector model (`COLLECTOR_MODEL.md`). Seed 1 is the committed v2 tortoise, byte for byte. Rails as in STORY_BRIEF and COLLECTOR_QUIRKS_BRIEF: hopeful, nothing gory, no brands, no legible writing, no real places; the robots are hard-coded machines with no speech or feelings, so no recipe field is a mood or a name.

Radical body plans (a walker, a pontoon boat-bot, a tall spotter, a round roller, a snail hauler, a crab sorter and the ear scout) are the optional `robot_recipe_for(seed, radical=True)`: see `ROBOT_RADICAL.md`. The default stays the tortoise plan described here.

## Files
- `blender/robot_recipe.py`: `robot_recipe_for(seed)`, pure python (no numpy, no Blender). Plain JSON-able values, deterministic (python `random.Random` seeded from the seed), a legacy seed unchanged.
- `blender/robot_build.py`: `write_robot(recipe, path, lod)`; python3 + numpy only. Imports the part functions of `collector_model.py`; `python3 robot_build.py --seed N --out DIR` writes `robot_seedN_hero.glb` and `_live.glb`.
- `blender/robot_shots.py` (one three-quarter picture of a GLB on sand, Blender), `blender/robot_sheet.py` (labelled contact sheet, numpy and PIL), `blender/robot_batch.py` (the driver).
- Small hooks in the collector files, all inert at their defaults (the committed hero is still byte-identical): `collector_model.py` has `Node.scale`, the road-wheel positions that follow the track length, `LAMP_BASE`, `EXTRA_SCENE`; `collector_tex.py` has `WEAR` multipliers (age, chips, rust, salt), the organic keys `leaf` and `soil`, and `glight` in the lens branch.
- `tests/test_robot_recipe.py` (pure python) and the menu tests in `tests/test_recipe.py`.

## What a recipe holds (and how it is chosen)
The role comes first (equal chances over six), then every other draw comes from the role's template (ranges and short lists in `TPL`), so a scout is small with a big head and a hauler is large with a big open bin. Every value is a range or a pick; all are TUNING (no real-world number is claimed).

| field | values | how it is made |
|---|---|---|
| role | cleaner (tortoise, concept A), scout (terrier, B), hauler (wheelbarrow, C), sorter (beetle, D), maintainer, planter (repurposed collector) | equal chance |
| overall size | 0.76 to 1.14 of the committed machine; length stretch 0.95 to 1.08, width stretch 0.80 to 1.25 | node scale on the root: scouts small, haulers large and wide |
| shell | dome height 0.14 to 0.50 m, half length 0.30 to 0.35, half width 0.28 to 0.33, superellipse 0.82 to 1.12; plates 1 (a closed shell), 2 (the committed split) or 4 (each half has a cross seam); slot half width; tilt of the halves 0 to 22 degrees at rest; finish solar cells or painted | role ranges; sorters tall and tipped, planters flat and open to the light |
| drive | tracks (axle distance 0.38 to 0.62, width 0.10 to 0.18) or wide wheels (2 or 3 a side, radius 0.115 to 0.135, lugs) | tracks 45 to 90 percent by role |
| head | scale 0.78 to 1.45 on three axes, shape pod, block or egg (superellipsoid exponents), roll -8 to 8 degrees; visor band, twin, trio, slit or tall | squares, slits and one tall window; never round eyes |
| arm | upper 0.20 to 0.38 m, fore 0.84 to 1.0 of that; 2, 3 or 4 joints; gripper pinch, wide pad, scoop or brush | joints and gripper change the look, the clips stay the committed three-joint ones |
| bin | back edge -0.82 to -0.47 m, width 0.34 to 0.38, height 0.31 to 0.52; lid flat, domed, slatted, grille or none; propped 0 to 26 degrees | haulers big and open |
| paint | one of 11 invented muted palettes (shell and head, tub and bin, arm accent, the wrong-colour patch, a second patch); the committed sage is one of them | weights by role, a family look not a rule |
| wear | age 4 to 45 years (bleaching and rain runs), salt 0.35 to 1.7, rust 0.35 to 1.8, chips 0.45 to 1.8 (multipliers of the committed 1.0) | `collector_tex.WEAR`, read by the baked shaders |
| lamp code | 6 codes of three colours (search, found, low charge); the patterns and strengths stay the committed ones | the emissive colour of the Lamp material is the search colour |
| quirks | 0 to 3 of: patch, mirror, trinket, hanging panel (the four committed slots) and tape, bent antenna, extra shell, plant pot (new) | weighted by role; lid quirks are not chosen without a lid; seed 1 keeps its four |
| modules | seedling bed, grow light, compost tray | the planter has bed and light; others now and then a compost tray |
| role part | scout: floppy ears (one up, one folded); hauler: push blade; sorter: two sorted bins; maintainer: tool rack | one per machine, about 85 percent of the time |

## How it is built
`applied(recipe)` changes the module constants of `collector_model.py` for the length of one build and restores them (the shell, bin, wheel list, head pod, arm lengths, track offsets, paint colours, wear, lamp colours, node list, quirk list; a test checks they come back). The overall size, the length and width stretch, and the head size are node scales in the GLB (the page rotates nodes by name; scale is free). New parts are functions that draw into a node: wide wheels, visor styles, grippers, extra joints, lid styles, cross seams, the seedling bed, grow light, compost tray, four new quirks, four role parts. The recipe is written into the scene extras of the GLB (`robot_recipe`) and into `robot_recipe_seedN.json`. Node names are the committed ones plus `module_seedbed`, `module_grow_light`, `module_compost`, `part_ears`, `part_blade`, `part_bins`, `part_tools` and the `quirk_*` nodes the recipe chose (the scene extras list only those).

## Numbers (measured)
- Seed 1: `write_robot` calls `collector_model.build`, byte-identical to `assets/collector/collector_hero.glb` (checked by the test). The same values through the generic builder (`--force-generic`) give the same geometry hash on all nodes.
- Spread over seeds 1 to 60 (test): roles cleaner 10, planter 9, sorter 11, hauler 9, maintainer 6, scout 15; tracks 38, wheels 22; 11 of 11 palettes; quirk counts 0:12, 1:27, 2:14, 3:6 (and seed 1 with its four); all 8 quirks; all 3 modules; all 4 grippers, 5 visors, 5 lids, plates 1/2/4, joints 2/3/4, 6 lamp codes, 3 head shapes; solar 36, painted 24; all 60 recipes different and 60 distinct (role, drive, palette, visor, gripper, quirks) looks. Recipe hash of the 60: `69bc0cb7b7a9836e`.
- GLB sizes (sample of six, one per role; the test limits are 1.5 MB hero and 400 KB live): hero 1,095 to 1,440 KB and 12,504 to 18,692 triangles (planter 1,220, sorter 1,440, hauler 1,339, cleaner 1,331, maintainer 1,113, scout 1,095); live 333 to 383 KB and 3,732 to 4,382 triangles. Beyond the sample: all 60 live files were built (311 to 383 KB, at most 4,402 triangles, none over 400 KB) and the 24 tracked-drive seeds most likely to be heavy (4 plates, modules, side bins, blade, 3 quirks) as hero (1,172 to 1,440 KB, none over 1,500 KB). The committed collector is 1,352 KB and 325 KB. Wheel robots are the lightest (fewer triangles than tread links); the other 36 heroes were not built.
- Time: about 35 to 45 s for a hero and 5 s for a live per robot on one core (the sixty take about 25 minutes with `--jobs 4`); a preview is about 20 s at 640 x 420, 24 samples on four CPU cores.
- Variety: `shots/robot-recipe-sheet.png` (12 robots: seeds 1, 2, 3, 4, 8, 9, 10, 11, 12, 14, 19, 21; 640 x 420, 24 samples, cloud `bpy` through the fakeblender wrapper, CPU) scores a mean pairwise similarity of 0.9106 whole picture (lower is more varied; 39 of 66 pairs at or above 0.90, because the sand and sky are the same in every frame) and 0.7852 robot-only (9 of 66 pairs at or above 0.90). The first sheet, before the painted shells and the role parts were added, scored 0.9400 whole picture. Iterations: (1) first sheet: same dome and solar grid on everything, three sage machines; (2) painted shells, role parts (ears, blade, bins, tool rack), bigger head spread, sage made rare. Menu items: `shots/menu-items-sheet.png`.

## What is faked
- Size, length, width and head size are scales of the committed meshes, not different meshes (a stretched hero keeps its texel density, so a hauler is a little softer than a scout). Wheels become ellipses only when length and height are stretched differently (at most 8 percent).
- The tub, hinges and arm turret are fixed; a long bin hangs behind the tub on two struts.
- Joint count and gripper change what is drawn, not how the arm moves: the clips and poses are the committed three-joint ones, and the grab target is moved in so that a short arm still reaches it.
- The grow light panel is not emissive (the only light on a robot is the lamp). Plants and soil are a few small shapes with a baked soft shader.
- Rest tilts of the shell halves and the head roll are node rotations; the clips start from zero and so override them.
- Wear is baked per machine (multipliers on the committed shader), not simulated. The far level builds for every recipe but a planter or sorter can have up to about 1,340 triangles against the 1,100 budget; only hero and live are budgeted here.

## Running it for an order (python3 + numpy for the models; Blender for the pictures)
```
python3 blender/robot_batch.py --out OUT --phases recipes,models --jobs 4                 # no Blender: 60 recipes and 120 GLBs
python3 blender/robot_batch.py --blender BLENDER --out OUT --phases previews,variety,sheet --device GPU --gpu-name Radeon --require-gpu
```
`--seeds 1,5,9` or `--count N` change the seeds (default 60, seeds 1 to 60). Previews are rendered from the GLB files in OUT, 640 x 420 and 24 samples by default (`--w --h --samples --zoom`), checked by `picture_guard.py`; `variety` runs `variety_judge.py` on `robot_seed*.png` and also on `robot_only_seed*.png` (the pixels that differ from the empty scene `robot_empty.png`); `sheet` makes `robot_sheet.png` of the first `--sheet-n` pictures. It writes only inside OUT, never deletes, never uses the network, and the same seeds give the same recipes and GLB bytes.

## Menu items for the hardware residents (scene recipes)
Four new `CONTENTS` values in `blender/recipe.py`: `fish_hut` (a plump lofted fish with a forked tail, dorsal fin, a door and a round lit window where the eye would be), `seabird_hut` (a hut on stilts with a ladder, a lit window and a perch pole on the ridge with two gulls), `playset_wreck` (a ship-shaped play structure heeled over in the sand: deck on posts, prow, mast with a blank faded flag, a slide, a ladder, a rope net, old toy colours) and `boat_house` (a big hull with a small house built in it: walls, roof, door, lit window, stove pipe). The props are in `blender/li_props.py`, original low-poly shapes, no writing, no brands, lit windows for the hopeful tone.

They are chosen only when asked: `recipe_for(seed, menu='fish_hut')` (or `'any'`, or a list); the default is off, nothing changes for any recipe that does not ask (the test compares all 61 recipes, the legacy 1122 and the HW-3, HW-4 and HW-6 seeds 2001 to 2060, with hashes taken at commit 179e5d4). A menu recipe is the ordinary recipe of that seed with the content replaced, a `menu` field `{item, requested}`, and a prop entry (drawn from its own generator, so the main draws stay put); the beach site and the framing check are the ordinary ones (the subject sizes for the new props are in `_subject`). The legacy seed and `legacy_scene` ignore the menu. `hero_render.py --menu ITEM` and `batch.py --menu ITEM` carry it through.

## Honest gaps
- The variety judge compares whole pictures that are mostly the same sand and sky, so its numbers are high for any set of robots; the robot-only number is the fairer one, and neither has a pass mark (the owner sets it).
- Machines are distinct in silhouette, palette, head and bin, but they share one solar-cell texture, one tread, one lamp and one family face; two machines of the same role can still be close cousins.
- Only a three-quarter view on flat sand was rendered; not checked in WebGL, on a phone, or with the animation clips on a recipe machine (the clips run on the committed node names, but collisions of long arms with tall domes were not checked frame by frame).
- Sizes are TUNING: nothing here comes from a real machine. The research note for the family (BEACH_COLLECTOR.md) covers the beach cleaner only; the other roles are design, not research.
- The menu props were rendered once each in the island scene (see the picture), not tuned; the playset and the boat house have the roughest shapes.
- The hardware orders are not written here (the owner packages them).
