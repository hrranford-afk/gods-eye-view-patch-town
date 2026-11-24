# KIT_PIECES: eight weathered shore pieces for the first settlement (24 Nov 2026, version 1)

Built the way the boat kit and the collector were: a fixed script builds the geometry, bakes the wear textures and writes the GLB files; a test checks them. Pure python and numpy; nothing here copies a real object, name or place, and there is no lettering.

Files: `blender/kit_model.py` (geometry, node trees, GLB writer), `blender/kit_tex.py` (procedural 3D materials and the atlas baker), `blender/kit_shots.py` (pictures from the GLBs with the cloud bpy module), `tests/test_kit_model.py`, `assets/kit/kit_<piece>_<hero|live|far>.glb` and `kit_report.json`. Pictures: `shots/kit-sheet.png` (labelled 2 x 4), `shots/kit-1.png` (relic hull), `kit-2.png` (lighthouse stump), `kit-3.png` (lean-to). Run: `python3 blender/kit_model.py --out assets/kit [--piece cairn --lod live]`.

## Which eight and why
The town's parts list (05_PARTS_SHOPPING_LIST) ranks: boat, hull, wreck 9; lighthouse, beam, lens 8; ruin, wall 6; garden 4; hut, house, cabin 4; pebbles, shells 3; rope, net, canvas 2. The shelter ladder (research/FIRST_SHELTER_AND_MATERIALS.md) needs driftwood, sailcloth, rope, stone, crates and wreck timber on the strandline, water first, a landing stage at era 2, and a stored catch. The eight pieces are where both agree:
1. relic_hull: half-buried old-world hull (hull 9, wreck timber and salvage, the machines that kept working). Hard-coded relics only: no faces, nothing that looks alive.
2. lighthouse_stump: collapsed tower with a toppled lantern and lens (lighthouse 8, the town's most repeated card).
3. crate_stack: washed-up crates, a drum, loose slats (crates and planks are the ladder's scavenged timber, the drift arrivals).
4. cairn: stone waymark (pebbles 3, stone is rung 2's material, a hopeful marker).
5. drying_rack: fish-drying rack (fisher's den cards, food stores, rope and canvas).
6. lean_to: driftwood and sailcloth shelter, rung 1 of the ladder, with stones on the hem and a fire ring.
7. rain_barrel: wall corner, rusty eave, gutter, downpipe and oak barrel (fresh water is the first need; hut 4).
8. wrecked_jetty: storm-broken landing stage (era 2 jetty in stages, boats).
Left out: the "fire in the stone" ruin wall (the impossible fire is fantasy, not on the ladder), garden and engine (no agreement with the ladder yet).

## Triangles and size per level (triangles / size)
| Piece | hero | live | far |
|---|---|---|---|
| relic_hull | 10758 / 358 KB | 2510 / 116 KB | 456 / 35 KB |
| lighthouse_stump | 11448 / 375 KB | 2310 / 93 KB | 586 / 26 KB |
| crate_stack | 12036 / 523 KB | 2710 / 180 KB | 360 / 36 KB |
| cairn | 10004 / 434 KB | 2228 / 117 KB | 626 / 33 KB |
| drying_rack | 9030 / 405 KB | 1992 / 115 KB | 572 / 42 KB |
| lean_to | 8970 / 366 KB | 2055 / 102 KB | 491 / 33 KB |
| rain_barrel | 8872 / 372 KB | 2646 / 122 KB | 504 / 32 KB |
| wrecked_jetty | 8356 / 420 KB | 1802 / 130 KB | 668 / 47 KB |

Budgets in the test: hero 8,000 to 15,000 and under 1 MB, live 1,500 to 4,000 and under 300 KB, far 300 to 700 and under 80 KB; the set is under 5 MB. Hero and live carry colour, normal and packed occlusion/roughness/metal JPEGs (hero atlas 1024, normal and ORM 512; live 512 and 256); far carries one 256 colour JPEG.

## Wear and textures
Every surface patch has its own chart in one atlas per level; the baker rasterises each triangle and evaluates 3D procedural materials at the true position: stone (granite, slate, warm, rust tones, lichen, moss, cracks), driftwood (silver bleach, checks, nail stains), rusted steel (rust runs, rust-through pits, plate seams, rivets, chipped old paint), whitewash over rubble and dressed masonry, sailcloth (panel seams, stitches, patches, faded stripe, mildew), rope (twist), sand and shingle, wrack, dried fish, glass, turf. Piece wear numbers (tide line and barnacles, salt, moss, lichen, bleach, chips, rust) are in the scene extras.

## Nodes, footprint, movable parts
Frame: glTF, +Y up, metres, y = 0 ground, centred on x = z = 0, front toward +Z. Node `footprint` is a flat polygon at y = 0.003 (invisible material, polygon also in its extras and in `scene.extras.footprint_polygon_xz`). Parts that move or can be taken are nodes with the pivot at the joint and `extras.movable` ("take" or "swing"): `plank_*`, `crate_*`, `stone_*`, `stone_cap`, `fish_*`, `door`, `lid`, `hatch`, `bucket`, `bollard`, `lantern`, `lens`, `plate_*`, `cover`, `drum`, `rag`, `gutter`, `sail`. Swinging nodes have an `open` clip. Lower levels may have fewer of the many small nodes (fish, planks, stones), but the required parts exist at every level.

## Gaps, ranked
1. Hull and lighthouse plating are thin sheets with stair-stepped holes; they read as ruins from 5 m, not from 1 m. The lighthouse stump is still pale and plain.
2. Texel density is about 100 to 140 per metre at hero, so very close cameras see soft texture.
3. Cloth has no real folds or tears; ropes over the lean-to sail are hard to see.
4. Ground mounds are flat discs with a visible edge; the page must blend them into terrain.
5. Moss, lichen and salt are procedural and a little uniform; no per-instance colour variants.
6. Far level has a coarse silhouette, no normals; some small nodes are missing at live and far.
7. Not placed in any page (islands_look.html untouched).
