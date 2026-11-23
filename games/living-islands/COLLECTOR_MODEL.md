# COLLECTOR_MODEL: the hero model of the first beach collector (23 Nov 2026)

The owner's pick: design A (the low tortoise) with design D's tip-up shell. This is the 3D model that the live page, the inspect view and the island pictures will use. It is built by a fixed script, exported as GLB at three levels of detail, and checked by a test.

Files
- `blender/collector_model.py` builds the geometry, bakes the wear and writes the GLB files (pure python and numpy, so it also runs under plain `python3`; no Blender needed).
- `blender/collector_shots.py` renders pictures from the GLB files (needs Blender or the `bpy` module).
- `assets/collector/collector_hero.glb`, `collector_live.glb`, `collector_far.glb` (rest pose) and `collector_report.json` (triangles, vertices, bytes, triangles per node).
- `tests/test_collector_model.py` is the model check.
- Pictures in `shots/`: `collector-hero-1.png` (three-quarter, rest), `-2` (sun pose), `-3` (close-up of wear and tracks), `-4` (grab pose with a bottle), `collector-lods.png` (hero, live, far; shaded on top, wire below).

## What it is
A dog-sized tracked machine, 1.08 m long, 0.68 m wide over the tracks, 0.60 m tall at rest (the research note asked for about 1.0 m, 0.6 m wide, 0.6 m tall; the length and width come out a little over because the hopper sits behind the shell and the track frames stand proud of the body).
- **Shell.** A long domed solar shell in two halves, a split carapace with a slot down the middle. Every cell is a raised quad on the dome (200 per half on the hero), faded and dusty, with one cracked cover held with tape and a repair patch in the wrong colour on the other half. Faded sage-green paint, edge wear to bare metal, a gasket line at the foot, rim bolts with rust runs under them. The halves are hinged at the front and tip up at the back, a little differently (clumsy), to catch the light.
- **Arm.** Folded flat in the slot between the shell halves like a folded leg: upper arm lying back, forearm folded forward beside it, a two-finger gripper with rubber pads, a visible cable with slack, clamps and a second thin rod. Faded orange, so it reads in the slot. Three joints and a yaw at the shoulder.
- **Head.** A small pod on a ribbed neck at the front. One wide dark visor band under a brow hood and one small side sensor, both dull and hazed; no round eyes. The one amber status lamp sits on its top on a short stalk, so it tips with the head.
- **Hopper.** A bin at the back with a hinged lid (own node), litter in it, towing bar, rivets. About 11 litres inside (0.141 x 0.336 x 0.228 m), against the 15 L of the research note.
- **Tracks.** Two tracks, 0.13 m wide, 0.54 m on the ground. On the hero every tread link is modelled (pad, two cleats, guide tooth: 52 links a side) and the running gear is seen through the open side: sprocket and idler drums, four road wheels, a frame bar, hubs with bolts. Live: a solid belt with a cleat every few pitches. Far: a plain belt slab.
- **Marks of age.** Tape, twine, a data plate with nothing written on it, a bleached arrow (the only mark; no letters, no numbers, no maker names), louvres, conduit, a dented skid, sand drifted against the sprocket, rust runs that follow Z under fixings, salt crust in the lowest 17 cm, a sand-scoured band, sand in the joints (near every pivot and wherever occlusion is high).

## Node names for animation
The glTF frame is Y up and the machine faces +Z (+X is its left). Every node is at rest with an identity rotation in the committed files, and the pivot is the joint, so the page rotates a node by name about its own origin. `scenes[0].extras.poses` holds the pose table and each node has `extras.axes` with the axis, the usable range and a note. Angles below are degrees in the machine's own frame (x forward, y left, z up; rotation about +y by a positive angle lowers whatever points forward, so it lifts the rear of the shell).

| node | parent | what | axis and range |
|---|---|---|---|
| `collector` | | root | |
| `chassis` | root | tub, belly, guards, front plate, deck | static |
| `track_l`, `track_r` | root | tread, wheels, frame | rigid; see the gaps |
| `shell_l`, `shell_r` | root | the two tip-up halves, hinge at the front (x 0.25, the pivot) | y, 0 to 32 |
| `head` | root | head pod, neck pivot at x 0.335 | y (pitch, -14 to 16), then x (roll, +-18) |
| `lamp` | head | the amber dome, the only emissive material | none (set strength and colour per the status code) |
| `arm_base` | root | shoulder housing and upper arm | z yaw +-60, then y pitch 0 to 180 (0 stowed pointing back, about 175 swung up and over to reach forward and down) |
| `arm_mid` | arm_base | elbow and forearm | y, -200 to 10, relative to the upper arm |
| `arm_tip` | arm_mid | wrist and palm | y, -40 to 80, relative to the forearm |
| `finger_l`, `finger_r` | arm_tip | the two fingers | z, plus or minus 30 to open |
| `hopper` | root | the bin | static |
| `hopper_lid` | hopper | lid, hinged at its front edge | y, 0 to 70 |

Poses (`--pose`; the angles are in `pose_rotations()` in the script)
- `rest`: shell down, arm stowed, lid shut.
- `sun`: shell_l 24, shell_r 19 (tipped to the light), head up 9 and rolled 6.
- `grab`: the arm reaches out and down to the left front, found by a two-link solution (`arm_ik`) for fingertips at (0.575, 0.25, 0.115) m: yaw 24.6, shoulder 175, elbow -165, wrist 64, fingers open 14, head down 11 and rolled, shell_l 12 (lets the arm out), lid 38.
- `park`: shell_l 29, shell_r 26, head 5 down. Facing the sea is a placement (a yaw of the whole machine), not a node.

The status light colours of the research note are for the page to set on the `lamp` material.

## Budgets and what was measured (committed files, rest pose)
| level | triangles | vertices | file | budget | height | notes |
|---|---|---|---|---|---|---|
| hero | 18,644 | 33,555 | 1,439 KB | about 20,000; 1,500 KB | 0.602 m | 2 embedded grey detail textures (512 paint, 256 dirt) |
| live | 3,338 | 5,197 | 311 KB | about 4,000; 400 KB | 0.593 m | same textures at 256 |
| far | 892 | 1,290 | 64 KB | about 800; 100 KB | 0.564 m | vertex colour only, no textures |
Total of the three: 1.78 MB (limit 3 MB for committing). Triangles by part on the hero: tracks 8,124, shells 5,852, chassis 1,536, hopper and lid 1,148, head 836, arm and fingers 976, lamp 172. Pose variants (`--pose sun` and so on) are the same size and are not committed (they are node rotations the page can set itself).

The files load in `trimesh` and `pygltflib` (checked in a scratch environment), the importer of Blender (`bpy` 5.3) reads them, and the test finds 0 triangles whose winding disagrees with the stored normals.

## How to run
```
blender -b --python games/living-islands/blender/collector_model.py -- --out DIR [--lod hero|live|far|all] [--pose rest|sun|grab|park|all] [--seed 7]
python3 games/living-islands/blender/collector_model.py --out DIR            # the same, without Blender
blender -b --python games/living-islands/blender/collector_shots.py -- --glb DIR --out PICS [--w 1200 --h 800 --samples 64] [--only 1,2,3,4,lods]
python3 games/living-islands/tests/test_collector_model.py
```
The pictures need the `rest`, `sun` and `grab` hero GLBs plus live and far in `--glb DIR` (run the model with `--pose all`). They are rendered from the GLB files, not from the builder, with the shared Living Islands sky and look (`li_scene.make_sky` and `render_settings`, the bright look), the concept sheet's sand with real tread prints, CPU Cycles, 64 samples, a fixed seed. The committed pictures were made at 1200 x 800 with the cloud `bpy` module through a wrapper that mimics `blender -b --python`.

The test checks: the arguments; no network, subprocess or delete calls, no web addresses, private paths, secrets or forbidden words in the scripts and this note; per level the glTF container, the named nodes, no external uris, no private paths in the bytes, the triangle budget, the file size, exactly one emissive material used only by the lamp, whole triangles with normals and vertex colours; size (about 1.0 m long, 0.55 to 0.65 m tall, about 0.6 m wide, standing on the ground); the poses move the right nodes; the grab pose reaches its target; the build is deterministic; the shared part functions exist.

## How the family reuses the parts
Each shared part is its own function that draws into a node, with the dimensions as constants at the top of the file:
- `part_tracks(node, side, LOD, wheels, yc, width)`: any tracked side (the terrier uses three wheels and a longer hull, the wheelbarrow longer tracks). `track_loop` makes the tread path.
- `part_lamp(node, at, LOD)`: the one status lamp, the same dome and bezel on every machine.
- `part_shell_half(node, side, LOD, seed, ...)` with `dome_z`, `shell_surface`, `shell_cells`: a tip-up solar shell half from the `SHELL` dict (centre, half length, half width, height, exponents). The beetle uses the same function with a different `SHELL` and a front hinge.
- `part_hopper(bin_node, lid_node, LOD, seed, hop)`: a bin and lid from the `HOP` dict.
- `part_head`, `part_arm` (arm lengths `ARM_L1`, `ARM_L2`, `arm_ik` for reach), `part_chassis`.
- `bake_colour(key, P, N, edge, mode, seed, pivots, ao)`: the weathering. A different paint is one entry of `MATS`; a different machine is a different `--seed` (dirt differs, design does not).
- `Node`, `build`, `write_glb`: nodes with pivots, the level-of-detail table `LOD`, and the GLB writer.
Faded green is the tortoise's paint; the other roles change `MATS['paint']` and `MATS['paint2']` (the sheet used yellow for the terrier, red-orange for the wheelbarrow, pale blue for the beetle) and keep the tracks, lamp, shell panel and hopper functions.

## What is faked or simplified
- No rig and no animation clips. The poses are static node rotations written into the file; the page animates by setting node rotations. The pose table and axes are in the file's extras.
- The wear is frozen into vertex colours (large-scale fade, chalk, edge wear, salt, sand, rust, a baked ambient occlusion from a 12 mm voxel grid of the rest pose) plus two small grey multiply textures (grain, scratches, chips, faint dirt streaks). There is no normal map and roughness is one value per material. The occlusion is baked at rest, so it does not follow a tipped shell or a reaching arm.
- The vertex colours are sampled at the vertices, so fine wear lives in the texture (box projection, tiling every 0.5 m, so the pattern repeats); the dome, tracks and chassis therefore look similar close up, only the large-scale dirt differs.
- The tracks are rigid. The research note says UV scroll of a normal-mapped belt on the live level; that is not done here (the live belt has real cleats and no scroll). The page can rock the body and move the sand instead.
- The lamp is a plain emissive material (`KHR_materials_emissive_strength` 6); the blink and colour code are not in the file.
- The cell grid follows the dome (each grid quad of the surface is one cell), not a real cell layout; busbars are not drawn.
- The hopper holds about 11 L, not 15 L; the arm reach (0.58 m of links plus 0.17 m of gripper) was set by eye and checked only by the grab pose.
- Litter in the bin is a handful of caps, shards and one bottle, placed by a seeded scatter.

## Honest gaps
- The hero is 18.6k triangles against about 20k. Going to 20k pushes the file past 1.5 MB, because the file has no compression (positions, normals, UVs and colours at 36 bytes a vertex, 33.6k vertices; flat-shaded parts cannot share vertices). A Draco or meshopt pass would fix that; none is applied.
- Length 1.08 m and width 0.68 m are a few centimetres over the research note's 1.0 m by 0.6 m (the tracks' running gear stands outside the body; the hopper adds length).
- Blender 3.6 was not run here: the model script needs only numpy, the pictures were rendered with the cloud `bpy` 5.3 import of the GLBs, and the picture script uses the 3.6-safe patterns of the other scenes (guarded Principled names, sky and look fallbacks). The glTF importer in 3.6 should read the files (core glTF plus one emissive-strength extension), but it was not tested.
- The shell halves are solid closed bodies with a flat underside; the slot floor and the arm do not collide in the stowed pose, but in the grab pose the arm leaves through the front with shell_l tipped 12 degrees, and no collision test was run beyond looking at the pictures.
- The look is close to the bar of the island pictures in colour and light but not in finish: the surfaces are low-resolution (no baked high-poly detail, flat-shaded parts, 12-sided hubs), and the vertex-baked wear is softer than a real baked texture would be.
- Not checked on a phone or in WebGL: the live page's own tier budgets (research note MODES_AR_DESKTOP_HANDHELD.md) were not read for this job; the three numbers come from BEACH_COLLECTOR.md.
- The side-on silhouette shows the arm stowed in the slot only from above and in front; from the side it is hidden behind the shell. The checklist wants the arm visible in the silhouette; it is, from the front and from the top, not from the side.
- Seen only at the camera angles of the four pictures; no turntable.
