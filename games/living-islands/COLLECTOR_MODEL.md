# COLLECTOR_MODEL: the hero model of the first beach collector (23 Nov 2026, version 2)

The owner's pick: design A (the low tortoise) with design D's tip-up shell. This is the 3D model that the live page, the inspect view and the island pictures use. A fixed script builds it, bakes the textures and writes GLB files at three levels of detail; a test checks them. Version 2 is the finish pass: baked textures with real wear and a normal map, a face, a lamp code, four optional quirk parts and animation clips. Version 1 pictures stay in `shots/collector-hero-*.png` for comparison.

Files
- `blender/collector_model.py` builds the geometry, the node tree, the clips and writes the GLB files (pure python and numpy, so it also runs under plain `python3`; no Blender needed).
- `blender/collector_tex.py` unwraps the mesh and bakes the textures (charts, atlas, per-texel wear, height to normal map, occlusion, roughness, metal).
- `blender/collector_jpeg.py` is a small baseline JPEG writer (numpy and plain python), so the textures inside the GLB are small without an imaging package.
- `blender/collector_shots.py` renders pictures from the GLB files (needs Blender or the `bpy` module).
- `assets/collector/collector_hero.glb`, `collector_live.glb`, `collector_far.glb` (rest pose; the same names as version 1, rewritten) and `collector_report.json` (triangles, vertices, bytes, triangles per node, atlas stats).
- `tests/test_collector_model.py` is the model check.
- Pictures in `shots/`: `collector-v2-1.png` (three-quarter, rest), `-2` (sun pose), `-3` (close-up of wear and tracks), `-4` (grab pose with a bottle), `-face` (head close-up), `-quirks` (the four quirk parts, two views), `collector-v2-lods.png` (hero, live, far; shaded on top, wire below).

## What changed in version 2
1. **Baked textures that survive glTF.** Hero: three material groups, one atlas each: `Body` (painted shell, chassis, head, arm, tape, twine, rust runs), `Metal` (steel, guards, hubs, tracks, rubber, bolts), `Glass` (solar cells, visor and lens, litter). Each has a base colour map (JPEG), a tangent-space normal map (JPEG) and one packed map with occlusion in R, roughness in G and metal in B (JPEG; the same image is both the `occlusionTexture` and the `metallicRoughnessTexture`). Live: one atlas for everything (material `Collector`). Far: vertex colours only, as before.
2. **Real wear, computed from the mesh.** Hard edges are found in the triangles (convex ones lose paint and shine, concave ones collect dirt). Each texel then gets: sun-bleached chalk on upward faces, rain runs on the walls, edge wear to primer and bare steel (paint chips grow where edges, fixings and the ground are), rust that starts at chips and runs down under every bolt (bolt positions are recorded when the parts are built), a splash and grime zone near the ground, sand-scoured paint below 16 cm, salt crust in the lowest 20 cm, sand and dirt where occlusion is high, panel seams with rivets, tread grooves on the pads, pits and rust flakes on steel, dust film and a spider crack on the solar glass. The same facts drive height (turned into the normal map) and roughness and metal (bare steel is shiny and metallic, rust, salt and chalk are rough, dust on glass roughens it). Ambient occlusion is per texel and uses the part itself plus the static body, so it does not depend on the pose (a tipped shell or a reaching arm keeps a sensible occlusion).
3. **A face.** The head pod is asymmetric and a little cocked. A wide dark visor band, taller on the left and drooping on the right, under a tilted brow hood; a faint glow strip along the inner lower edge of the visor (material `Glow`, the colour of the lamp at about 8 per cent of its strength); one small rounded-square sensor window low on the right; hearing slits on the left side. No round eyes anywhere. The head pivots at the neck (pitch, roll for the tilt, a little yaw).
4. **A lamp code in the file.** The lamp is two nodes: `lamp` (stalk, bezel, a dark smoky cap) and `lamp_dome` (the emissive dome, material `Lamp`). Scene extras hold the code: amber search (slow blink), green found (steady with a 2 s flicker), dim amber low charge (slow pulse), and an emissive strength range of 0.3 to 8 (default 6). The page sets the material colour and strength; the clip `lamp_blink` scales the dome between 1.0 and 0.88 with STEP keys (at 0.88 it sits inside the cap, so the lamp looks off while the housing stays), so no emissive animation is needed.
5. **Quirk slots.** Four optional parts, each its own node named `quirk_*`, with a category and a note in its extras and in the scene extras (see the table below).
6. **Animation clips.** Seven standard glTF animations (node rotation and scale keyframes). The model works without them: every node is at rest in the committed files.
7. Smaller things: the guide teeth under the tread links are gone (hidden, and they cost vertices), bolts and solar cells are shaded smooth (shared vertices), the hopper litter was pulled inside the walls (a bottle neck used to poke through), the paint is a less minty olive sage.

## What it is
A dog-sized tracked machine, 1.08 m long, 0.68 m wide over the tracks, 0.60 m tall at rest (the research note asked for about 1.0 m, 0.6 m wide, 0.6 m tall; length and width come out a little over because the hopper sits behind the shell and the track frames stand proud of the body).
- **Shell.** A long domed solar shell in two halves, a split carapace with a slot down the middle. Every cell is a raised quad on the dome (200 per half on the hero), faded and dusty, one cracked cover held with tape, a repair patch in the wrong colour on the other half. Sage-green paint, edge wear to primer and steel, a gasket line at the foot, rim bolts with rust runs under them. The halves are hinged at the front and tip up at the back, a little differently (clumsy).
- **Arm.** Folded flat in the slot between the shell halves like a folded leg: upper arm lying back, forearm folded forward beside it, a two-finger gripper with rubber pads, a cable with slack, clamps and a thin second rod. Faded orange. Three joints and a yaw at the shoulder.
- **Head.** See the face above. The status lamp sits on top on a short stalk, so it tips with the head.
- **Hopper.** A bin at the back with a hinged lid, litter in it, towing bar, rivets. About 11 litres inside (the research note said 15 L).
- **Tracks.** Two tracks, 0.13 m wide, 0.54 m on the ground. Hero: every tread link modelled (pad and two cleats; 52 links a side) and the running gear seen through the open side. Live: a solid belt with cleats. Far: a plain belt slab.
- **Marks of age.** Tape, twine, an unwritten data plate, a bleached arrow (the only mark; no letters, no numbers, no maker names), louvres, conduit, a dented skid, sand against the sprocket.

## Node names for animation
The glTF frame is Y up and the machine faces +Z (+X is its left). Every node is at rest with an identity rotation in the committed files, and the pivot is the joint, so the page rotates a node by name about its own origin. `scenes[0].extras.poses` holds the pose table and each node has `extras.axes` with the axis, the usable range and a note. Angles are degrees in the machine's own frame (x forward, y left, z up).

| node | parent | what | axis and range |
|---|---|---|---|
| `collector` | | root | |
| `chassis` | root | tub, belly, guards, front plate, deck | static |
| `track_l`, `track_r` | root | tread, wheels, frame | rigid; see the gaps |
| `shell_l`, `shell_r` | root | the two tip-up halves, hinge at the front | y, 0 to 32 |
| `head` | root | head pod with visor, glow strip and sensor; neck pivot | y pitch -14 to 16, x roll +-18, z yaw +-20 |
| `lamp` | head | stalk, bezel, smoky cap | static |
| `lamp_dome` | lamp | the emissive dome (material `Lamp`) | scale 1.0 lit, 0.88 off |
| `arm_base` | root | shoulder housing and upper arm | z yaw +-60, then y pitch 0 to 180 |
| `arm_mid` | arm_base | elbow and forearm | y, -200 to 10 |
| `arm_tip` | arm_mid | wrist and palm | y, -40 to 80 |
| `finger_l`, `finger_r` | arm_tip | the two fingers | z, plus or minus 30 to open |
| `hopper` | root | the bin | static |
| `hopper_lid` | hopper | lid, hinged at its front edge | y, 0 to 70 |
| `quirk_patch`, `quirk_mirror`, `quirk_trinket`, `quirk_panel` | see below | optional parts | hide or delete |

Poses (`--pose`; angles in `pose_rotations()`): `rest`; `sun` (shell_l 24, shell_r 19, head up 9 and rolled 6); `grab` (the arm reaches out and down to the left front by a two-link solution, `arm_ik`, for fingertips at (0.575, 0.25, 0.115) m, shell_l 12, lid 38); `park` (shell_l 29, shell_r 26, head 5 down).

## Quirk slots
Each quirk is a separate node named `quirk_*`, present in the rest pose (default visible). A resident's pick later plugs in by showing or hiding a node (or replacing its mesh); the scene extras (`quirk_slots`) list them with parent, category and note.

| node | parent | category | what you see |
|---|---|---|---|
| `quirk_patch` | `hopper` | repair | a riveted repair plate in the wrong colour (blue-grey) with a dark sealant rim and crossed tape, on the right wall of the bin; 6 bolts that carry rust runs |
| `quirk_mirror` | `head` | accessory | a small mirror on a bent wire, taped to the top of the head, turned to look behind; it tips with the head |
| `quirk_trinket` | `hopper_lid` | keepsake | a blue glass bead and a pale cone shell tied to the lid with twine, kept there; it lifts with the lid |
| `quirk_panel` | `hopper` | damage | a cover panel hanging by one top bolt, leaning out 17 degrees from the left wall of the bin, a scrap of tape on it |

The four are from four categories (repair, accessory, keepsake, damage). They are light: 192, 72, 148 and 48 triangles on the hero.

## Lamp code (scene extras `lamp_code`)
| state | colour (linear rgb) | strength | pattern |
|---|---|---|---|
| search | amber 1.0, 0.62, 0.08 | 4.0 | slow blink, 1 s period, half on (clip `lamp_blink`) |
| found | green 0.30, 0.95, 0.32 | 6.0 | steady with a 2 s flicker (the page jitters 4 to 8) |
| low_charge | dim amber 1.0, 0.45, 0.04 | 0.6 | slow pulse of 4 s between 0.3 and 0.9 |

Emissive strength range 0.3 to 8, default 6. Only one colour at a time (the research checklist): the visor glow strip follows the lamp colour at 8 per cent. The research note's own list (steady pale green working, amber blinks for full or waiting) maps onto the same colours; the code is old and not logical, on purpose.

## Animation clips (standard glTF animations, in every GLB)
| clip | seconds | what |
|---|---|---|
| `sun_open` | 2.6 | rest to the sun pose: shell_l first, then shell_r (clumsy, slightly later), then the head lifts and cocks |
| `sun_close` | 2.6 | the reverse |
| `arm_unfold` | 3.6 | shell_l tips 12 degrees; the shoulder swings the arm up and over, the elbow and wrist unfold, the shoulder yaws to the left front, the fingers open (it ends in the grab pose) |
| `arm_stow` | 3.6 | the reverse |
| `lamp_blink` | 2.0 | lamp_dome scale 1.0, 0.88, 1.0, 0.88, 1.0 with STEP keys; loop it |
| `head_tilt` | 3.0 | a small curious tilt (roll about 9 degrees, a little yaw) and back; loop it |
| `lid_open` | 1.4 | the hopper lid lifts 38 degrees |

Tread scroll is not a clip: the tread is real geometry baked into the atlas, so a UV offset cannot move it (the scene extras `tread_scroll` says so). The page shows motion by rocking the body and moving the sand and the track prints.

## Budgets and what was measured (committed files, rest pose)
| level | triangles | vertices | file | budget | height | textures |
|---|---|---|---|---|---|---|
| hero | 18,268 | 25,210 | 1,352 KB | about 20,000; 1,500 KB | 0.60 m | 9 JPEGs, 500 KB: Body 1024 colour, 512 normal, 512 packed; Metal 1024 colour, 512 normal, 512 packed; Glass 512 colour, 512 normal, 256 packed |
| live | 3,780 | 6,377 | 325 KB | about 4,000 (limit 5,200); 400 KB | 0.59 m | 3 JPEGs, 90 KB: one atlas, 512 colour, 512 normal, 256 packed |
| far | 1,024 | 1,466 | 92 KB | about 1,000 (limit 1,100); 100 KB | 0.56 m | none (vertex colours) |

Total of the three: 1.73 MB (limit 4 MB for committing). Texel density on the hero: Body about 500 texels per metre (2 mm), Metal 460, Glass 560; live about 143 (7 mm). Hero triangles by part: tracks 7,084, shells 5,852, chassis 1,536, hopper and lid 1,148, head 940, arm and fingers 976, lamp 272, quirks 460. The vertex format on the textured levels is position, normal (float) and texture coordinates (normalized 16-bit); no vertex colours and no tangents (the viewer derives them, as glTF says). Vertex bytes were the budget problem, so bolts and solar cells share vertices (smooth shading), the guide teeth went, and the textures are JPEG. Pose variants (`--pose sun` and so on) have the same size and are not committed.

The files load in `trimesh` and `pygltflib` (version 1 was checked in a scratch environment) and the importer of Blender (`bpy` 5.3) reads them, with the textures, the normal map, the packed map, the emissive strength and the clips; the test finds whole triangles with normals, texture coordinates inside 0 to 1, valid animation channels, and only standard glTF 2.0 (the one extension is `KHR_materials_emissive_strength`, the ratified one).

## How the baking works (for whoever changes it)
1. Every triangle of the machine (rest pose) with normals, an edge value and a material key goes into its group.
2. Hard edges (more than 28 degrees, or open edges) are found by position; convex ones feed wear, concave ones feed dirt. A ray test from each triangle decides whether it is seen at all (the ground blocks rays): hidden triangles (insides, undersides, and all bolts) share a tiny flat swatch of their material instead of a chart.
3. Charts: triangles that share a soft edge and lean less than about 37 degrees from the chart's first triangle (within 0.2 m) form a flat chart; each chart is turned to the smallest rectangle (the tread pads keep fixed axes) and projected. Charts are packed on shelves; the texel density is the highest that fits the atlas.
4. The atlas is rasterised; every texel knows its 3D position, normal, distance to hard edges, occlusion (voxel grid, 12 mm, 14 rays), and the halo and rust run of the nearest fixings (a voxel field made from the bolt list).
5. A shader per group turns that into colour, height, roughness and metal. The height gives the normal map by differences inside the chart (OpenGL convention, green up the image; a test pins the direction).
6. Gutters are filled, the images are converted (colour sRGB 4:2:0, normal and packed 4:4:4 JPEG), and written into the GLB.

## How to run
```
blender -b --python games/living-islands/blender/collector_model.py -- --out DIR [--lod hero|live|far|all] [--pose rest|sun|grab|park|all] [--seed 7]
python3 games/living-islands/blender/collector_model.py --out DIR            # the same, without Blender (about 25 s for the hero)
blender -b --python games/living-islands/blender/collector_shots.py -- --glb DIR --out PICS [--w 1200 --h 800 --samples 64] [--only 1,2,3,4,face,quirks,lods] [--prefix collector-v2]
python3 games/living-islands/tests/test_collector_model.py
```
The pictures need the `rest`, `sun` and `grab` hero GLBs plus live and far in `--glb DIR` (run the model with `--pose all` for the hero, then once more for live and far). They are rendered from the GLB files, not from the builder, with the shared Living Islands sky and look, the concept sheet's sand with real tread prints, CPU Cycles, 64 samples, a fixed seed. The committed pictures were made at 1200 x 800 with the cloud `bpy` module through a wrapper that mimics `blender -b --python`; the lamp is set to strength 3.2 in the pictures (the file says 6).

The test (about 1 minute) checks: the arguments; the JPEG writer; the normal-map convention; no network, subprocess or delete calls, web addresses, private paths, secrets or forbidden words in the scripts and this note; per level the glTF container, the named nodes (including the quirk nodes and `lamp_dome`), no external uris, no private paths in the bytes, the triangle budget, the file size, only standard glTF 2.0, two emissive materials with the right users, the image count, JPEG sizes against the plan, materials with colour, normal and packed maps, texture coordinates inside 0 to 1 and spread over the atlas, all seven clips with valid channels, the lamp code and the four quirk slots; size (about 1.0 m long, 0.55 to 0.65 m tall, about 0.6 m wide, standing on the ground); the poses; the grab target; the clip content (sun_open starts at rest, arm_unfold ends in the grab pose, the lamp scale stays between 0.88 and 1); determinism of live and far (geometry, textures and clips); the shared part functions.

## How the family reuses the parts
Each shared part is its own function that draws into a node, with the dimensions as constants at the top of the file:
- `part_tracks(node, side, LOD, wheels, yc, width)`: any tracked side. `track_loop` makes the tread path.
- `part_lamp(node, dome_node, at, LOD)`: the one status lamp, the same cap, dome and bezel on every machine.
- `part_shell_half(node, side, LOD, seed, ...)` with `dome_z`, `shell_surface`, `shell_cells`: a tip-up solar shell half from the `SHELL` dict.
- `part_hopper(bin_node, lid_node, LOD, seed, hop)`, `part_head` (the face), `part_arm`, `part_chassis`, and the four `part_quirk_*` functions.
- `bake_colour(...)` is the far level's vertex weathering; the textured levels use `collector_tex.bake_group` with one shader per group (`shade_body`, `shade_metal`, `shade_glass`). A different paint is one entry of `MATS`; a different machine is a different `--seed` (dirt differs, design does not).
- `Node`, `build`, `clip_table`, `write_glb`: nodes with pivots, the level-of-detail table `LOD` (including the atlas plan), the clips and the GLB writer.

## What is faked or simplified
- The wear is baked, so it does not change with the weather or the days; the page can darken or wet the whole machine with the material factors only. The baked occlusion ignores the other moving parts (by design, so it holds in every pose), which also means no contact shadow from the arm on the shell: the renderer's own shadows do that.
- No rig. The clips and poses are node rotations (and one scale), not a skin.
- The charts are planar projections, so a strongly curved part has a few seams; the normal map and colour are computed from 3D position, so the seams do not show, but a texel is a little stretched on a slanted chart.
- Hidden and tiny parts (all bolts, insides, undersides) share a flat swatch, so a bolt head has no wear of its own; the rust run under it is on the surface below.
- The tracks are rigid and their grooves and wear are in the atlas, so the tread cannot scroll. The research note's UV scroll on a normal-mapped belt is not possible with baked unique textures.
- The cell grid follows the dome (each grid quad of the surface is one cell), not a real cell layout; the busbars exist only in the texture.
- The hopper holds about 11 L, not 15 L; the arm reach was set by eye and checked only by the grab pose.
- Litter in the bin is a handful of caps, shards and one bottle placed by a seeded scatter.

## Honest gaps
- The textures are 2 to 3.5 mm per texel on the hero and 7 mm on the live level: fine for the pictures, soft if the camera is within about 20 cm of a panel. A bigger atlas would not fit the 1.5 MB budget without compression better than JPEG (no Draco, no meshopt, no KTX2 here).
- The hero is 18.3k triangles against about 20k (version 1: 18.6k): the guide teeth were cut and the quirks and the face added. Live is 3.8k and far 1.0k, both inside their limits and near the top.
- The live level is the weakest: half of its triangles share swatches (hidden threshold 0.16) and its density is low.
- The arm clips were not checked for collisions between the arm and the shell halves beyond the end poses; the shoulder swings through the slot, and shell_l tips 12 degrees first, but a frame by frame check was not run.
- Length 1.08 m and width 0.68 m are a few centimetres over the research note's 1.0 m by 0.6 m.
- Blender 3.6 was not run here: the pictures were rendered with the cloud `bpy` 5.3 import of the GLBs. The file uses only core glTF 2.0 plus `KHR_materials_emissive_strength`, and normalized 16-bit texture coordinates (core glTF allows them; the importers of the 3.x series read them, but 3.6 itself was not tested).
- The lamp colour changes need the page to set the material factors; the file only carries the code. The visor glow strip shares the material `Glow`, so it cannot be dimmed apart from the lamp except by that ratio.
- Not checked on a phone or in WebGL: the live page's own tier budgets were not read for this job; the three numbers come from BEACH_COLLECTOR.md.
- Seen only at the camera angles of the pictures; no turntable. The quirk panel and patch sit on the hopper walls because the tub flanks are hidden behind the tracks.
