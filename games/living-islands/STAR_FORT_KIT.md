# STAR_FORT_KIT: a modular star fort in stone and turf (24 Nov 2026, version 1)

Harry chose the star fort as the first fortification style, the forts he walked round with his parents (`EVOLUTION_TREE.md`, owner decisions, item 1; `research/FORTIFICATIONS_THROUGH_THE_AGES.md` section 2.6 and the Star Fort table in section 8). This is the kit for it, built the way the island kit and the boat kit were: a fixed script writes the geometry, bakes the wear into one atlas per level and writes the GLB files; a layout script joins the parts through their sockets; a test checks everything. Pure python and numpy, nothing downloaded, no Blender needed to build. Tone: architecture, grass, old stone, a friendly skirmish with crumbling walls and a little dust. No people are modelled and the cannon is a plain prop. Nothing here copies a real fort, name or place; there is no lettering.

Confidence tags: **MEASURED** (a test or the build prints it), **COMPUTED** (follows from the code), **High, Medium, Low** (the research note's scale, for numbers taken from real forts), **TUNING** (a game number nobody has checked).

## Files

- `blender/starfort_model.py`: the parts (geometry, damage states, sockets, node tree) and the GLB writer. Imports the builder and the baker of `kit_model.py` / `kit_tex.py` (not edited) and uses the same writer pattern. A tighter atlas packer replaces the kit's shelf packer for this kit (max-rects), and normal and packed maps are baked smaller than the colour (divisors 2 and 8).
- `blender/starfort_tex.py`: the materials added to the kit baker: dressed stone in 25 cm courses (`ashlar`), rubble stone (`rough`), the cut section of a breach (`core`), bare earth, bright turf (`grass`), gravel, brick, clay tile, loose stone (`frag`), rubble slope (`heap`), plain flag cloth.
- `blender/starfort_layout.py`: pure python, deterministic: `layout(n, radius, ditch, yaw)` returns every placed part; `fire_check` and `dead_ground` test the star-fort property.
- `blender/starfort_shots.py`: the pictures, rendered from the GLB files (cloud bpy, same sky and look as the island renders, sea out to the horizon).
- `tests/test_starfort_model.py`: the tests. `assets/starfort/`: 66 GLB files (22 pieces x hero, live, far) and `starfort_report.json`.
- Pictures: `shots/starfort-sheet.png` (labelled 3 x 3), `shots/starfort-1.png`, `-2.png`, `-3.png` (1200 x 800).

Run: `python3 blender/starfort_model.py --out DIR [--piece NAME|all] [--lod hero|live|far|all]`, then `blender -b --python blender/starfort_shots.py -- --glb DIR --out DIR`.

## The numbers

Frame in every file: glTF, +Y up, metres. **y = 0 is the natural ground and the courtyard level.** The ditch floor is at y = -2.0 (COMPUTED from the choice below).

A **wall piece** is a run of wall along +X whose OUTER FACE LINE at y = 0 passes through the origin; +Z points out toward the enemy (the front of the piece), -Z is the fort. This is not the island kit's "centred on x = z = 0": a wall piece is placed by its face line, which makes the sockets simple. Corner pieces have the origin at the corner vertex of the face line. Buildings and props are centred on x = z = 0 like the island kit. Every piece has a `footprint` node (a flat polygon at y = 0.003, the polygon also in the node extras).

Rampart cross-section, outer to inner (z outward, y up). Why these numbers: the research note lists the parts and what they do (High); the sizes are game scale, taken down from real forts so a star fits an island window (Low).

| Part | z, y (m) | Notes |
|---|---|---|
| ditch floor | y = -2.00 | ditch 6 m wide by default (real ditches 10 to 30 m: Low) |
| scarp wall | from (0.20, -2.00) up to (-0.20, 2.58) | dressed stone, batter 1 in 11.5 (Medium: real scarps lean 1 in 5 to 1 in 10 and more), 25 cm courses, weeps at y = -1.15 every 1.25 m, quoins at corners |
| cordon | round stringcourse at y = 2.58 to 2.82, pale dressed stone | the line the eye follows along a bastion (High) |
| parapet, outer slope | (-0.20, 2.82) to (-1.45, 4.00), turf | |
| parapet crest | (-1.45, 4.00) to (-2.50, 4.20), turf | the superior slope falls toward the enemy |
| inner face of the parapet | (-2.50, 4.20) to (-2.65, 3.10), dry stone | |
| banquette | tread at y = 3.10, 0.9 m wide, one step | the riser is dressed stone |
| terreplein | y = 2.60, 3.0 m wide, gravel | the cannon platform is 3 m square so it fits |
| inner slope | (-6.60, 2.60) to (-8.70, 0.00), turf | total depth 8.7 m (the real earth rampart is 10 to 25 m at the base: Low) |
| counterscarp | masonry wall 2 m high on the far side of the ditch, coping at y = 0.2 | |
| covered way | gravel walk at y = 0 behind a low parapet, two banquette steps, crest at y = 1.24 | |
| glacis | from the crest (y = 0.95) down to the ground over 12.5 m, about 1 in 13 | research: 1 in 10 to 1 in 20 (Low) |

Segments: a curtain segment is **4 m** long (the brief; the research table had 3 m); a bastion face segment is **6 m** (research: `fort_bastion_point` 6 x 6); a flank segment 4 m; a gate segment 4 m with a 2 m opening. These are measured by the test from the sockets and from the bounding box.

## The 22 pieces

All 22 have hero, live and far. Wall pieces have the three damage-state nodes; the table says what else.

| Piece | What it is | Sockets | Nodes the page uses |
|---|---|---|---|
| `curtain` | the plain rampart run, 4 m | `socket_a`, `socket_b` | `intact`, `cracked`, `breached`, `endcap_a`, `endcap_b` |
| `bastion_face` | the same section, 6 m, for the faces of a bastion | a, b | same |
| `bastion_flank` | the same section, 4 m, with a stair of seven steps up the inner slope | a, b | same, `stairs` |
| `bastion_salient` | the bastion tip: a mitred corner, 60 degree interior angle (turn 120), arms 15.2 m so the rear mitre fits | a, b | same |
| `bastion_shoulder_a75` | face to flank corner, turn 75 (105 degree interior), arms 6.9 m, for the 3 and 4 bastion stars | a, b | same |
| `bastion_shoulder_a66` | the same, turn 66 (114 degree interior), arms 5.7 m, for the 5 bastion star | a, b | same |
| `flank_junction` | the re-entrant corner where the flank meets the curtain, 90 degrees, arms 2 m | a, b | same |
| `flank_junction_a75` | the same at 75 degrees, for the 3 bastion star (a leaning flank) | a, b | same |
| `bastion_gorge` | a retaining wall 2.6 m high facing the courtyard with a raised gravel floor behind it, 4 m; closes the open back of a bastion (the face is toward +Z, so it is placed turned round) | a, b | same |
| `sally_gate` | a 4 m curtain run with a 2 m arched passage, arch ring and tunnel, two plank leaves and a hinged drawbridge deck | a, b, `socket_bridge` | states, `frame`, `tunnel`, `door`, `door_2`, `bridge` |
| `ravelin_wall` | a lower rampart run for the detached triangle in front of a curtain, 4 m | a, b | states |
| `ravelin_salient` | the 60 degree tip of the ravelin, arms 9.2 m | a, b | states |
| `counterscarp` | the ditch revetment, 4 m, 2 m high; the face is toward +Z, placed turned round | a, b | states |
| `ditch_floor` | the ditch floor with a drainage channel, 4 m by 6 m (stretch across to fit another width) | a, b | `intact`, `silted` |
| `glacis` | a turf slope 4 m by 12.5 m | a, b | `intact` (turf), `cracked` (rain gullies), `breached` (a shell crater with a raised rim) |
| `covered_way` | the walk and low parapet with two banquette steps, 4 m | a, b | states |
| `gun_platform` | a timber deck on stone sleepers, 3 m square, a plain iron cannon on a four-wheeled carriage and a few cannonballs | `socket_terreplein`, `socket_muzzle` | states (the deck), `carriage`, `barrel`, `ammo` |
| `powder_store` | a low brick barrel vault under turf with a door and barrels; no contents are modelled | `socket_door` | states, `door`, `barrel_01..03` |
| `sentry_box` | a round corbelled stone turret with loops, a doorway and a tiled cone, for a bastion corner | `socket_mount` | states |
| `guardhouse` | a whitewashed block 6 m by 4 m under a tiled roof, door, two windows, chimney | `socket_door` | states, `door` |
| `flagstaff` | a 7 m mast on a stone plinth and a plain two-field cloth | `socket_base` | `intact`, `breached` (snapped), `flag` |
| `loose_props` | four dressed blocks, three gabions, a pile of 14 cannonballs, three barrels | none | `stone_block_01..04`, `gabion_01..03`, `cannonballs`, `barrel_01..03` |

Why one shoulder piece serves two stars and a junction serves two: the turns of one unit of wall (junction, flank, shoulder, face, salient, face, shoulder, flank, junction) must add up to -360 / n degrees. With the tip at 60 degrees and the flank at 90 degrees to the curtain, the shoulder angle that closes a 3 or a 4 bastion star is the same (105), the 5 bastion star wants 114, and the 3 bastion star needs a flank leaning to 75. The test checks the sum for all three.

### Names, sockets, extras

Every node name above is in the GLB; footprints, sockets and the movable parts are named nodes as in the island kit. A **socket** is an empty node `socket_*` at the joint on the face line at y = 0, rotated about Y by `yaw_deg`; **its local +Z points out of the piece**. Two pieces join when their sockets coincide (within 1 cm: tested) and face each other (yaws differ by 180 degrees). The socket list is also in the scene extras with `position` and `yaw_deg` and a `kind` (`wall`, `ditch`, `glacis`, `bridge`, `platform`, `aim`, `mount`, `door`). `extras.movable` says how a part moves (`swing` with the axis and the open angle, `slide`, `elevate`, `take`); the gate has an `open` clip that swings `door`, `door_2` and `bridge` in 1.5 s. `extras.hp_hint` is on the scene (with `state_hp`), and each state node of a wall carries `hp`, the hit points that state stands for (see below). `extras.hide_in = ['breached']` marks the nodes the page hides in the breached state (the gate arch, tunnel and leaves, the doors of the stores).

## Damage states

Each structural part has three child nodes, shown one at a time:

- `intact`: sound masonry, turf and gravel.
- `cracked`: spalled facing (the geometry is pushed in and the texture shows the grey lime-and-rubble core in the same places, from one shared noise field), crack networks, chipped coping, moss and tufts in the cracks, torn turf, a few fallen facing stones at the foot.
- `breached`: a gap about 2 m wide: two stub walls with ragged ends (the cut steps by course in the dressed stone), the cut faces show the real structure (dressed skin 0.9 m thick, a core of rounded stones in lime mortar, earth backing), a rubble slope from the ditch floor up over the gap and down the inner side, and 14 to 26 loose dressed stones on it.

Corners breach around the vertex. `glacis` has gullies and a crater; the stores, the guardhouse and the sentry box crack and open (a hole in the vault, a hole in the roof, the top of the turret on the ground); the deck of the platform splits; the flagstaff snaps. The ditch floor has `intact` and `silted`.

Build, in the script: each state sweeps the cross-section along the face line with mitred offsets (so a corner of any angle has no gap, arms permitting), one section at a time (scarp, cordon, outer slope, crest, inner face, banquette, riser, terreplein, inner slope), each its own chart. Texture charts of the sections are shared between the three states (the cracked scarp has its own); this is why one 1024 atlas holds three states at about 120 texels per metre on the stone of the straight runs (the hero level; 33 on the salient, 55 to 75 on the other corner pieces, 60 to 70 on the brick buildings, up to 200 on the small pieces; `starfort_report.json` has the number for every file; turf and the cut faces get a third to half of it) (MEASURED).

### Hit points (from the toy model)

`extras.hp_hint` (COMPUTED from `fortify/ballistics_toy.py`, MATERIALS and Part: hit points = hit points per metre x thickness; a part is damaged at half and failed at zero): the scarp facing is stone, 52 per metre, 1.6 m thick for a curtain (83 hp), 1.8 m on faces and corners (94 hp); the earth backing is 30 per metre, 3.8 m (114 hp). The toy builds a wall of 2 m parts, so a 4 m piece is two toy parts (`parts_in_piece`). The suggested swap: `cracked` when the facing falls to half, `breached` at zero; the backing then takes the shots. A timber door is 24 per metre x 0.12 m = 2.9 hp. All of this is TUNING (Low): the toy's tables are tuning numbers, not measurements, and the toy's own limit is that real walls fail by cracking and shear and share their load.

## The layout

`starfort_layout.layout(n, radius, ditch, yaw)` (pure python, deterministic, about 0.1 s) returns `parts`: dicts with `piece`, `x`, `z`, `yaw` (degrees about +Y), `y` (height offset), `scale` ([sx, sy, sz]), `role` and more; `polygons`; the closure numbers. Placement: world = Ry(yaw) * local + (x, y, z), Ry as in glTF.

- **Closure.** The wall is walked piece by piece, each starting where the last ended and turning by the exact angle of its shape; one unit is junction, flank, shoulder, face, salient, face, shoulder, flank, junction, then the curtain pieces of that side (k of them, one of the curtains holds the gate). The turns of a unit add up to -360 / n, so n units close exactly. MEASURED by the test for n = 3, 4, 5 at several radii and yaws: every pair of neighbouring sockets (including the last to the first) coincides within 1 cm (in fact about 1e-13 m) and faces the other.
- **Radius.** The radius asked picks the number k of curtain pieces; the radius you get is reported. The smallest fort (k = 1 or 2): tip radius about 42 m for 3 bastions, 44 m for 4, 49 m for 5; with the ditch, covered way and glacis the whole thing reaches about 66 to 73 m from the centre (MEASURED, `layout()`). That is big for a small island (see the gaps).
- **Outer works.** Ditch floor, counterscarp, covered way and glacis follow the mitred offset of the same outline; each straight run is cut into whole pieces and the pieces are stretched along their length by 0.8 to 1.25 so they fit (scale x). At convex corners the counterscarp, covered way and glacis runs overlap by thickness x tan(half the turn) to close the wedge. The ditch width scales the ditch floor module across (scale z = ditch / 6).
- **Ravelins.** One detached triangle (two `ravelin_wall`, one `ravelin_salient`, two ditch floor strips along its faces) in front of every curtain, standing on the line of the covered way; the covered way, counterscarp and glacis leave a gap in front of it.
- **Details.** A sentry box at every tip (on the crest, 3.3 m in from the vertex, y = 4), a cannon platform on the terreplein in the middle of every face with a few props, the guardhouse behind the gate, a flagstaff in the middle, a powder store.

### The star-fort property (no dead ground)

`fire_check` and `dead_ground` test the defining property on the outline, in plan, with a line-of-fire angle check. For every flank, three fire points lie 0.5 m outside its face line (at 15, 50 and 85 percent along it). A target is covered when some fire point sees it by a straight line that does not cross the wall outline and lies within 78 degrees of the flank's outward normal. Checked: every point 1.2 m in front of (a) the curtain the flank looks along and (b) the whole face of the neighbouring bastion that borders that curtain, for all flanks; and every point 1.2 m in front of every curtain is seen from at least one flank (no dead ground). MEASURED for n = 3, 4, 5 at several radii: all covered (fractions 1.0, zero unseen samples). The tip angle of 60 degrees and the shoulder angles above were chosen because they pass: with a 90 degree shoulder the neighbour's face lies edge-on to the flank and is not seen, and the first design (70 degree tip, 80 to 100 degree shoulders) failed this check for the 3 bastion star. The check is for the plan only; nothing about height, cover or range is tested.

## Triangles and sizes (triangles / size)

| Piece | hero | live | far |
|---|---|---|---|
| `curtain` | 8078 / 264 KB | 1684 / 75 KB | 408 / 25 KB |
| `bastion_face` | 8050 / 260 KB | 1576 / 71 KB | 428 / 26 KB |
| `bastion_flank` | 8044 / 267 KB | 1758 / 78 KB | 430 / 27 KB |
| `bastion_salient` | 8334 / 245 KB | 1562 / 65 KB | 546 / 27 KB |
| `bastion_shoulder_a75` | 8028 / 259 KB | 1638 / 73 KB | 470 / 27 KB |
| `bastion_shoulder_a66` | 8048 / 258 KB | 1570 / 71 KB | 470 / 27 KB |
| `flank_junction` | 8042 / 265 KB | 1718 / 76 KB | 410 / 26 KB |
| `flank_junction_a75` | 8042 / 267 KB | 1718 / 76 KB | 410 / 26 KB |
| `ravelin_wall` | 8190 / 268 KB | 1594 / 73 KB | 408 / 25 KB |
| `ravelin_salient` | 8036 / 254 KB | 1574 / 68 KB | 510 / 27 KB |
| `counterscarp` | 8080 / 256 KB | 1610 / 71 KB | 352 / 23 KB |
| `covered_way` | 8130 / 220 KB | 1572 / 61 KB | 368 / 22 KB |
| `bastion_gorge` | 8056 / 263 KB | 1594 / 71 KB | 340 / 23 KB |
| `sally_gate` | 8148 / 278 KB | 1566 / 84 KB | 544 / 36 KB |
| `ditch_floor` | 8912 / 230 KB | 1660 / 57 KB | 344 / 18 KB |
| `glacis` | 8068 / 232 KB | 1744 / 60 KB | 340 / 19 KB |
| `gun_platform` | 8270 / 296 KB | 1636 / 87 KB | 668 / 37 KB |
| `powder_store` | 8200 / 279 KB | 1820 / 79 KB | 584 / 28 KB |
| `sentry_box` | 8048 / 256 KB | 1576 / 69 KB | 466 / 23 KB |
| `guardhouse` | 8112 / 284 KB | 1644 / 85 KB | 314 / 27 KB |
| `flagstaff` | 8114 / 186 KB | 1566 / 50 KB | 328 / 16 KB |
| `loose_props` | 8171 / 199 KB | 1714 / 62 KB | 586 / 29 KB |

Budgets in the test: hero 8,000 to 15,000 triangles and under 1 MB, live 1,500 to 4,000 and under 300 KB, far 300 to 700 and under 80 KB; the set under 8 MB. MEASURED: hero 5.46 MiB, live 1.53 MiB, far 0.55 MiB, all 7.53 MiB. A hero file holds all three states (about 3,000 triangles each) and a colour atlas of 1024 (normal map 512, packed occlusion/roughness/metal 128), live 512 (256, 64), far one 256 colour JPEG; each JPEG has a byte cap (hero colour 68 KB, normal 30 KB; live 21 KB and 8.5 KB; far 6.8 KB) and the writer lowers the quality until it fits, which is how the set stays under 8 MB. One texture atlas per level per piece, shared by the three states; sharing one atlas across pieces is not possible without external files, and the files must be self-contained. Each level has the same node names: far names are a subset of live, live of hero (tested).

## Textures and wear

Stone is warm grey with lighter dressed quoins and cordon; turf is green on earth, brighter on top. Baked from the true 3D position, so there are no seams: courses 25 cm high with running bond and block lengths 0.46 to 0.88 m, mortar stained dark below the weeps, drafted margins on the quoins, chipped arrises, moss at the foot and on the shaded faces, lichen, salt crust on the lower courses, algae on the damp base, rust on iron fittings (hinges, straps, ties, the chain of the drawbridge), brick with efflorescence, tile with moss. Everything comes from hashed noise: the same input gives the same bytes (tested).

## How the page will assemble it and swap states

1. Call `layout(n, radius, ditch, yaw)` (a JS twin of the pure python, or its output stored as json) and group `parts` by `piece`.
2. Load each GLB once per level and instance it: 22 meshes in the whole fort, so about 22 draw calls per level for roughly 360 to 620 placed parts; the far level can be one merged strip per run.
3. Place each part with its `x`, `z`, `yaw`, `y` and `scale`. For wall parts hide `endcap_a` and `endcap_b` when a neighbour is joined on that side (they are the cut section at the end of a run; they are hidden by the neighbour anyway, so hiding them is only a saving).
4. Show exactly one of `intact`, `cracked`, `breached` (`silted` for the ditch floor, `disabled` for a cannon is a pose of `barrel`: `extras.cannon.disabled_pose`) per part by its hit points: facing hp above half: `intact`; at or below half: `cracked`; zero: `breached`. Hide the nodes listed in `hide_in` in `breached`.
5. Swap level by distance: hero within about 40 m, live to 120 m, far beyond.
6. Movable nodes: `door` and `door_2` swing about Y (92 degrees open), `bridge` about X (-86 degrees raised), `barrel` about X (elevation), `carriage` slides along -Z (recoil), `flag` about Y; props with `movable: take` can be picked up.

## How it ties to `repair_physics.js` and fortify

`repair_physics.js` already treats a part as a body with a mass (volume x density), a socket as a pose with a kind and snap rules, and a joint as a break load with a seeded health factor (0.8 to 1.05); `REPAIR_PILOT.md` section "The method" says the same method serves any piece with `movable` nodes. For the fort:

- Every wall piece's two sockets are exactly such sockets (kind `wall`, pose from the layout, snap radius 0.3 m, snap angle 0.3 rad): a failed piece is a body that can be lifted out and a replacement fitted back. The mortar joint is the joint, with a break load; the health factor per piece stops walls failing on a clean line (`FORTIFICATIONS_THROUGH_THE_AGES.md` section 8.4).
- Wall volume per piece is in the file (bounding box and footprint); mass = stone facing volume x 2,400 kg/m3 (Low) plus earth x 1,600 (Low).
- Earth is not a rigid part (research 8.4): the rampart behind the facing is a height-field edit with a work cost, which the `breached` rubble slope stands in for. `loose_props` holds 4 dressed blocks and 3 gabions as `take` nodes: the repair materials.
- `fortify/ballistics_toy.py`: `hp_hint` carries its numbers; rubble heights (earth 35 percent, stone 25) are matched by the breach slope; the toy's `bastion` style (stone, 30 degree lean) is what the batter and the faces stand for.
- Not wired: nothing in `repair_physics.js`, `fortify/` or a page file is changed.

## What is faked

- The damage states are three prebuilt swaps, not a simulation; where a breach happens is fixed per piece (the middle for straight runs, the vertex for corners); the rubble stones in a breach are baked into the state, not separate bodies.
- The gate tunnel is a visual passage: it runs through the rampart in the model and has a rear portal where it comes out of the inner slope, with nothing behind it.
- The earth rampart is drawn as surfaces; the section inside is only shown at the cut faces of a breach and at the end caps.
- Texels are baked once for the whole piece: every instance of a piece looks the same (same moss, same weeps).
- The ravelin stands on the line of the covered way; real ravelins sit inside the main ditch. The outer works are straight runs that overlap at corners; there are no corner pieces for them.
- Heights: the ground, the courtyard and the beach in the pictures are the scene's own planes, not part of the kit.
- The sentry box is set on the parapet crest, not hung from the cordon.
- The research note's sizes are scaled: ditch 6 m (real 10 to 30), rampart depth 8.7 m (real 10 to 25).

## Gaps, ranked

1. Not placed in any page: no JS twin of the layout, no instancing code, no run on a tablet, nothing measured on a device.
2. The fort is big. The smallest star has a tip radius of 42 to 49 m and reaches about 66 to 73 m with the outer works; the research note says to keep it small for an island. The long mitre arms (the salient piece spans about 30 m) come from the thick rampart and the 60 degree tip; a thinner rampart or a half-size piece set would shrink it.
3. Outer works at corners: counterscarp, covered way and glacis are straight runs that overlap or leave small flat wedges at the corners; no corner pieces; the ravelin gap breaks the ring.
4. Bastions are hollow rings; `bastion_gorge` exists as a piece but the layout does not place it; no firing deck inside a bastion; the cannon platforms sit on the terreplein.
5. Texel density is about 120 per metre on the stone of the straight runs but only 33 on the salient and 55 to 75 on the other corners (their charts are big), and about a third of that on turf, so a camera under 3 m shows soft texture; all instances of a piece are identical.
6. Damage is three swaps; no partial spalling in steps; hit points of a 4 m piece are two toy parts, not one.
7. The gate leaves, the bridge and the cannon are single static states with a swing or slide, no physics.
8. Total size is near the 8 MB limit; quantised positions (KHR_mesh_quantization) would save about 10 percent but the page's loader support was not checked.
9. No audio, no particles: the dust of a breach is for the page.
10. The property check is plan-only (no height, no cover, no range).

## Pictures

`shots/starfort-sheet.png`: 1 the 5-bastion star from above, 2 a 3-bastion fort low at golden hour, 3 a bastion with the cannon, 4 the sally gate with the bridge down and the leaves open, 5 intact, cracked and breached curtain side by side, 6 the powder store, guardhouse, flagstaff and props, 7 the ditch and glacis from the covered way, 8 ruin mode (a half-ruined, overgrown 4-bastion fort with ravelins), 9 the parts catalogue. `starfort-1.png` to `-3.png`: the three best at 1200 x 800, 64 samples.
