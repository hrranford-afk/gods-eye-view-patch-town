# Blend round 1: the best proven pieces in one scene

Page: `blend.html` (a copy of the committed landing-pass `islands_look.html`, which is untouched). `?blend=A|B|C`, `?post=0` for the no-post-pass path, `?freeze=3` freezes every clock (sea, flame, smoke, boat bob) for repeatable shots. Serve it over http (`python3 -m http.server` in this folder): the CC0 kit is glTF and a `file://` page cannot fetch it, so from `file://` the page quietly falls back to the landing pass look.

Shots (1200 x 900, same camera as the landing pass: `__li.home()` and `__li.zoomLanding()`, tide 0, clock frozen at 3 s):
- `shots/blend-A-wide.png`, `shots/blend-A-zoom.png`: live best mix.
- `shots/blend-B-zoom.png`: A plus inverted-hull ink on settlers, boat, tent.
- `shots/blend-C-zoom.png`: A plus the Blender pilot's rock (the pilot's committed `blender/assets/rock/rock_01.lod1.glb`).
Regenerate: `NODE_PATH=$(npm root -g) node tests/blend-render.js blend=A` (also `B`, `C`). Test: `tests/blend-test.js`.

## What is in A, layer by layer
| Layer | Source | What it contributed | What clashed |
|---|---|---|---|
| Land colour and light | `render_options` modes 3 and 6, plain daylight | Sun, sky and contact shadow burnt into terrain vertex colours once at load (about 0.2 s): soft tent, rock and tree shadows, cool shade, no shadow acne. The shadow map now only draws the settlers and the boat. Painted variation baked in the same pass (height tint, broad warm/cool patches, brush-direction streaks, a little desaturation). | Vertex spacing is 0.64 m, so the baked light is soft; fine texture comes only from the grain/fleck shader. The sun is fixed (see below). |
| Rocks | Quaternius and Kenney CC0 rocks (`approaches2/assets`) | Replace all 391 flat-shaded boulders: 3 Quaternius shapes for the big ones, Kenney stones for the rest, instanced (one draw per shape), seeded yaw, tilt and irregular scale. Material (no screen filter): texture pushed to warm grey, moss on up-facing faces, pale lichen specks, barnacle band, kelp below the tide line, same wet band and tide foam as the land. | Quaternius texture is a camouflage of blue-grey and green; I had to desaturate it in the material or it read as moss-camo. Strata are weak. |
| Near trees | Quaternius Pine_5 and Pine_1, the procedural conifer, CommonTree_3 | Real silhouettes for the 10 trees within 40 m of the landing, retinted darker and bluer than the pack's own green. | Pack colours are far too bright for the reference; the leaf-card broadleaf is the weakest tree. |
| Far trees | procedural conifer and broadleaf, rendered at load into one 640 x 384 atlas | The pine island and the grass island are 40 billboard sprites (2 triangles each, one draw). The atlas is lit by the scene's own sun and sky, so sprites share the grade; it is re-rendered when the camera azimuth changes by more than 0.3 rad. | The sprite is lit for one view azimuth; the lighting on it does not rotate when you orbit until the atlas refreshes. Broadleaf sprites read as soft balls. |
| Grass and heather | new, instanced | About 2,100 tussocks (7 blades, one draw), 480 heather mounds placed in clusters (one draw), 70 scrub mounds. Replaces the old flat tufts and blobs. | Tussock colour still reads slightly stiff and spiky up close. Heather is faceted; it needs a flower-dot layer to look like heather rather than purple pebbles. |
| Tent | landing-pass canvas tent, now its own mesh | Colour toned to a muted off-white (0.72, 0.69, 0.60), so it stops being the brightest thing on the island. | Still bare flat shading and plain crates. |
| Sea | the sea pass (`bc92cb6`, `SEA_PASS.md`) ported in | Wind chop, glitter, thin shallows, lee slicks. I added: darker deep colour, warp amplitude halved (the large curved swirl went), rotated glitter cells with per-cell brightness (the glitter lattice went). | One sun for everything means the sun moved to elevation 34, azimuth 128 (the sea pass used 32 / 172). Chop is still more combed than the reference's isotropic ripple; glitter is still a stipple. |
| Ink (B only) | new, inverted hull | Back-face hull pushed along smoothed normals, 12 mm plus 0.08 percent of distance, dark umber at 85 percent: about 1.5 px at the zoom and about 1 px at the wide. It is real geometry (about 11,000 triangles, 4 draws), not an edge detector. | Flat-shaded tent edges and the boat's lapstrake make the hull a little uneven. Low strength on purpose: the zoom still reads as the same picture. |
| Blender rock (C only) | the pilot's committed rock, LOD1 | 16 of the biggest or nearest rocks use it (700 triangles each, baked colour and normal map): proves the GLB path (loader, instancing, tide shader on a Standard material). | One shape repeated, strata like a stack of pancakes, lichen too yellow (desaturated and darkened in the material to sit in the scene). |

The land texture of the pilot (`island_land.glb`) was NOT used in C. It is the baked version of the pilot's own single island (56 m tile, 32,768 land triangles, sun azimuth 320 / elevation 20), not of this six-island world, so it cannot be draped over our terrain, and adding it as a seventh island would cost 32k triangles (C would be about 185k) and break the sea's shared height texture. A fair test needs the same world baked by Blender; that is round 3's job (it needs about 7 minutes of CPU bake per island and the world exported from the page).

## Rules held (owner's AR rules)
- No screen-space post filter: the grade pass is the existing tone map and vignette only (no blur, no edge detection, no painterly filter); `?post=0` renders the whole scene with the renderer's own ACES and works (the picture is slightly paler and more yellow-green than the post path).
- Outlines are geometry (inverted hull), B only.
- Painterly look is baked: ground variation is in the terrain vertex colours; moss, lichen and kelp are material shading on the rocks, not a screen effect.
- Sprites only for the 40 far trees (and nothing else).
- One sun and one grade: terrain bake, rocks, trees, sprites atlas, boat, tent, settlers and sea all read `sun`, `hemi` and `sunDir`; the sprite atlas is lit with the same lights and decoded into the same linear pipeline (an early version tone-mapped twice in the `?post=0` path and rendered black trees; fixed).

## Score card (1 to 5, honest; landing pass baseline is my own estimate of the same image, not a recorded score)
| Criterion | Landing pass | A | B | C |
|---|---|---|---|---|
| 1 Sea surface | 2 | 3 | 3 | 3 |
| 2 Land meets water | 2 | 3 | 3 | 3 |
| 3 Rock | 2 | 3 | 3 | 3 |
| 4 Ground | 2 | 3 | 3 | 3 |
| 5 Light | 3 | 4 | 4 | 4 |
| 6 People | 3 | 3 | 4 | 3 |
| 7 Buildings and props | 3 | 3 | 3 | 3 |
| 8 Feels real | 2 | 3 | 3 | 3 |
| 9 Detail density | 2 | 3 | 3 | 3 |
| 10 Palette restraint | 2 | 4 | 4 | 3 |
| Total (of 50) | 23 | 32 | 33 | 31 |

Notes on the numbers. Rock is 3, not 4, because the kit rocks are good silhouettes but plain; C's Blender rock has real ledges up close, but it is one shape and its strata are too regular, so no gain overall. People gain a point in B only because the thin hull separates the settlers from the ground at the zoom. Palette loses a point in C for the yellow lichen. The scene is scored as a game picture ("a good game" is 3); nothing here is mistakable for the reference.

## Cost (software GL, headless; no fps claim; nothing measured on a device)
| | A | B | C |
|---|---|---|---|
| Scene triangles | about 147,000 | about 153,000 before trimming, see note | about 152,000 |
| Draw calls (by construction) | about 40: terrain, props, tent, boat, 2 settlers, pebbles, sea, rim and table, 18 instanced layers (one per kit shape or material part), sprites, fire parts | A plus 4 ink hulls | A with 2 more instanced layers |
| Load-time work | build about 1.0 s; terrain bake about 0.25 s; atlas about 40 ms | same | same, plus one 700-triangle GLB (575 KB with two 1024 textures) |
| Shadow pass | settlers and boat only (the old scene drew every prop) | same | same |

The first A build was 209,000 triangles. To get under 150,000 I: made the pebbles 480 (icosahedra, 20 triangles each), cut the terrain mesh from 0.55 m to 0.64 m cells and made seabed deeper than 0.9 m use the coarse 4 x 4 quads (the sea is opaque there), used Kenney's 80-triangle rock for mid rocks and only the 244 to 522 triangle Quaternius rocks for the big ones, and reduced tussocks to 7 blades. Everything is a count in `BLK` and the `spec` table in `buildGround`, so the owner's hardware can trade them.

AR (estimates, not measured): the three biggest wins for a tablet are the baked land light (the shadow pass shrinks to two movers), the 40 sprites replacing about 35 trees at 1.6 to 5k triangles, and instancing (no per-object draws). Things to watch: the 20-tap-per-pixel sea (SEA_PASS.md estimate 1.5 to 2 ms on an A12 at 1.5x), the instanced tussock overdraw close to the camera, and the 2048 shadow map, which could drop to 1024 now that only people cast. The baked sun cannot follow a real-world sun estimate without a re-bake (0.25 s here), so in AR bake at placement from the device's light estimate; the sprite atlas re-renders in tens of milliseconds for the same reason. Sprites are billboards, so a user walking round the table sees them turn with them: acceptable at the far side of a table, wrong within about 40 cm.

## Weak criteria, and the four rounds of iteration on them
I looked at every shot myself. Order of what I fixed, weakest first:
1. Rock and ground read as flat low-poly blobs and camouflage: swapped to kit rocks, then desaturated the camouflage texture and added moss, lichen and kelp in the material; added baked painted variation and a fleck layer to the terrain shader (the bare ground near the tent was a smooth smear).
2. Trees and heather too bright and too round: retinted the kit trees and the sprite atlas darker and bluer; heather went from evenly spaced big purple dots to small clusters, and the lumpy purple scrub blob was shrunk.
3. Triangle budget (209k, then 163k, 155k, 149k): trimmed as listed above; B and C needed a second trim.
4. Sea: swirl and glitter lattice (above), and `?post=0` black sprites (double tone map).

## Biggest remaining mismatch with the reference
The islands still look like arranged objects on a table: the reference land is one continuous, damp, heavily textured surface (every rock rimmed with foam and lichen, grass in tufts of mixed height that hides the ground, small flowers) while ours is a smooth baked surface with scatter on top, and the sea is a bright stippled blue rather than a dark fine-rippled one. Next in line: the round wooden rim (the reference is a table corner), the harbour island still cut by the left frame edge, and people 1.7 m tall at 40 px.

## Honest limits
- Everything is judged on one seed, one camera pair, software GL.
- A, B and C are the same world; only B and C differ in layers. Triangle counts above come from `renderer`-independent counting of scene meshes (instances counted) and exclude the shadow pass.
- The kit's licences are in `approaches/approaches2/assets/LICENSES.md` (CC0, plus MIT for the loader). The Blender rock is the pilot's own output. The owner's private reference photograph was only viewed; nothing derived from it is in the repo.
