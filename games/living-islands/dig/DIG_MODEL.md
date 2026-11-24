# Dig toy model: report and honest limits

Files: `dig_toy.py` (the model), `test_dig_toy.py` (39 checks, all pass, about 45 s), `maps/` (three PNG maps). Python 3 and numpy only; Pillow is used only to write the maps. Deterministic: the only random draw is a seeded `numpy.random.default_rng`.
Run: `python3 dig/test_dig_toy.py`, or `python3 dig/dig_toy.py` to redraw the maps and print the best sites.
Research note: `research/DIGGING_IN_GEOGRAPHY.md`. Terrain: the exported windows `landform/worlds/seed0005` (volcanic cone, 87 x 87 cells of 3 m) and `seed0062` (gneiss, 129 x 129 cells of 2 m). Drainage uses `landform/hydrology.py` (`priority_flood`, `accumulate`) by import, with a small built-in copy if it is missing. No page, blender file or asset is touched. No real place or weapon name appears in the code.

## What it does

1. **Ground.** Reads `world.bin`. Each cell gets a surface height, the top of the bedrock (a soil mantle sits on it, thick under peat, machair or woodland, thin on steep ground), a rock material from the rock id (gneiss and dyke to hard rock, sandstone and schist to soft rock, ash and scoria to ash or gravel, and so on) and the export wetness. Eight materials: sand, peat, soil, clay, gravel, ash, soft rock, hard rock.
2. **A fine window.** The game grid is 2 to 3 m. A trench is 1 m wide. So `refine()` cuts a 24 m window out at 0.5 m cells. All digging and slumping happens there. (This is a design finding for the game too: see the note, section 3.)
3. **Cut and fill.** `dig_trench` cuts a channel to a depth below each cell's own ground and banks the spoil in a strip set back 1 m from the lip. Loose spoil is the removed volume times a bulking factor (1.12 sand to 1.55 hard rock). `level_pad` benches a pad with cut equal to fill.
4. **Cost.** Person-hours from a rate per material (metres cubed per person-hour), a soil layer and a rock layer costed separately, 20 percent more for each metre below 1 m, and frozen soil at 30 percent of the thawed rate.
5. **Slump.** A cellular automaton. A face taller than its material stands (dry sand 0.35 m, soft rock 3 m, hard rock 8 m, clay 1.6 m, wet clay less, with timber props 1.8 m more) relaxes down to the angle of repose. A soil layer only fails over its own thickness. Heaped spoil has no cohesion. Ground that already stood before the cut is allowed to keep standing. Material moves from the higher cell to the lower, so the sum of heights is conserved to rounding.
6. **Sight.** `viewshed` and `los_points` march a sight line over the heightfield (eye 1.6 m, target 0.5 m, sea clipped at sea level). The result is a margin: how many metres of ground are in the way. Margin at or below 0 means seen. A margin above 0 is dead ground, and its size is the cover.
7. **Drainage.** Priority-Flood fills the pits. The fill depth is the standing water in a new trench if nobody bails. `carve_drain` follows the flow path downhill from the trench and cuts a ditch that falls 1 percent.
8. **Best dugout site.** Every land cell is scored: reverse-slope cover 30 percent, concealment 15, drainage 20, dig cost 15, view of the approach 20; the sum is then multiplied by 0.4 plus 0.6 times the drainage score, so a wet hollow cannot win on cover alone. Cover is the viewshed margin from three landing points. Concealment is not-seen plus plant cover. Drainage asks that a 1.4 m floor stays above the water table, that the cell is not a hollow, not on a channel, not a pond. View is how much of a lane toward each landing a lookout (highest cell within 15 m, less for a long walk) can see.

## Tests (all pass)

| Test | Result printed by the run |
|---|---|
| Volume conserved (dig, bank, slump), three materials | worst relative error 3e-14; limit stated 1 percent |
| Level pad: cut equals fill | 75.6 m3 and 75.6 m3 |
| Slump converges, and a second pass moves nothing | 61 iterations to 0.004 m; second pass 0.0009 m3 |
| Trench in hard rock keeps its walls | 1.20 of 1.20 m deep, 1.0 m wide, slump moved 0.000 m3 |
| The same trench in sand slumps | 0.69 of 1.20 m deep, 2.0 m wide, 3.63 m3 moved |
| Soft rock stands at 1.2 m; clay stands dry and slumps soaked | soft rock 1.20 m; clay 1.20 m dry, 0.73 m soaked |
| Clay cut deeper than its stand height slumps | cut 2.2 m stands at 1.14 m |
| Timber props hold a sand trench | 1.11 m with props, 0.69 m without; moved 1.30 against 3.63 m3 |
| Slumped sand face is no steeper than repose | steepest 34.6 degrees, repose 34 |
| Frozen ground stands taller and costs about 3 times | 1.52 m against 1.02 m (cut 1.9); cost ratio 3.33 |
| Cost order sand < soil < clay < gravel < soft rock < hard rock | person-hours per m3 of 1.7, 2.0, 2.5, 2.9, 10.0, 50.0 (1 m trench) |
| Deeper costs more than double per m3 | depth 2 m costs 2.4 times the 1 m trench |
| Viewshed shrinks behind a ridge | 100 percent seen on the near side, 0 behind a 14 m ridge |
| A 3 m mound across the lane halves the view | 1.00 to 0.50 |
| Real cone has dead ground | 23 percent of the volcanic window's land hidden from the first landing |
| Water pools in a new trench; a drain ditch lets it out | 1.19 m standing depth; 0.00 m after a 19-cell, 5.3 m3 drain |
| Site finder prefers the dry reverse slope | best columns 54, 54, 54 (ridge at 50, wet hollow 66 to 80); best 0.67 against 0.19 in the hollow and 0.29 on the forward slope |
| Best sites on both real windows beat average land on cover and drainage; no wet hollow beats the best site | cover 1.00 against 0.69 (volcanic) and 0.54 (gneiss); drain 0.98 and 0.99 |
| Deterministic | same digests twice (volcanic 87486c079ee3, gneiss a4e2bd9dddeb) |
| 60 random sites (30 on each window): run, conserve, converge | 60 of 60 converge; worst bank error 2e-16; standing depth after slump from 0.03 to 1.20 m (cut 1.2) |

## Maps (dig/maps)

- `viewshed_seed0005.png`: the volcanic window seen from one landing (ring). Yellow is seen.
- `deadground_seed0005.png`: blue is hidden from all three landings. It is the lee side of the cone and the gullies.
- `sites_seed0005.png`: score from dark to bright yellow, the five best sites ringed in red, landings in white.

## Honest limits: what is real and what is a toy

**Real physics, in outline.**
- Angle of repose of loose sand and gravel (about 33 to 40 degrees). A cut face in cohesive soil stands to a limited height (the textbook value for clay is about 4c/g, a few metres for firm clay, less with a tension crack). Rock holds a vertical face. Timber or sheet support lets a trench go deeper. Wet ground is weaker. Frozen soil is stronger and much slower to dig. These are well known; the numbers in the PROPS table sit inside the ranges in the note.
- Line of sight over terrain, and the reverse-slope idea (ground behind a crest is hidden and shielded).
- Priority-Flood filling of pits (Barnes, Lehman and Mulla 2014), and the fact that a trench below the water table or without an outlet fills.
- Conservation of volume. In a real dig the spoil is bulkier than the hole; the model uses a bulking factor.

**Toy.**
- The slump rule is a local cellular automaton, not a limit-equilibrium or finite-element slope check. It ignores slip circles, tension cracks, seepage force, time (creep), vibration and roots. Stand heights and repose angles are one number per material, TUNING inside the ranges. A soil layer on rock is two layers only.
- Dig rates are person-metres-cubed per hour for steady work, taken from a few public tables and rounded. They ignore skill, tools, rests, shoring and hauling beyond a small depth penalty. Real field positions take two to three times longer than the pure rate (one old manual gives about 4 hours for a one-person pit in medium soil). Hard-rock hand digging (0.02) is a Low-confidence guess; in real life you would split it with wedges and fire or not dig it.
- Water table depth comes from the export wetness plus a little height. It is not groundwater flow. Rain softening is a single soak number set by hand; there is no rain model inside this file. The pond depth is a worst case with nothing bailing.
- Cover is "metres of ground in the way", not a material-by-material penetration model. No weapon is modelled and no soldier. "Approach" means three landing points.
- Concealment uses a plant-cover table, not a canopy or shadow model.
- The 3 m grid cannot show a 1 m trench. Fine windows are bilinear copies of coarse data, so they carry no real micro-relief.
- Sea cells are flat at sea level; tide, surf and sea caves are not modelled here (the note covers them).
- The best-site finder's view term is low for the very best hidden sites on the real windows (0.01 to 0.11), because a site hidden from all three landings rarely has a lookout that sees a lane to all three. That is the real trade-off, and the weights are a taste choice.
- Only two of the thirteen windows were used: seed 5 (volcanic) and seed 62 (gneiss). Sandstone and basalt windows are not tested here.
