# Living Islands: how differently could the same scene be produced?

Same island, same seed (1122), same camera and sun, five ways. Written 22 Nov 2026 (CLOUD). Every number below was measured on the build machine (4 CPU cores, no GPU, software rendering) unless it says "estimate". Every image is 1200x800 in `shots/`; `shots/appr-compare.jpg` puts them side by side.

| # | Image | Technique |
|---|---|---|
| 0 | `shots/appr-0.png` | The existing real-time look (`../islands_look.html`, three.js, close-up, the project's own people and low-poly props). Reference only, a different framing. |
| 1 | `shots/appr-1.png` | Offline ray-marched heightfield in numpy (`render_pathtraced.py`) |
| 2 | `shots/appr-2.png` | SDF ray-march fragment shader in WebGL (`sdf_raymarch.html`, `run_sdf.mjs`) |
| 3 | `shots/appr-3.png` | Painted storybook chart, numpy + PIL (`paint_illustration.py`) |
| 4 | `shots/appr-4.png` | Voxel world, three.js (`voxel_three.html`, `export_voxels.py`, `run_voxel.mjs`) |

## What is shared
`heightmap.py` is the one generator: domain-warped island outline, ridged noise, soft strata terraces, a carved south beach, then a thermal-erosion pass. It also places 34 conifers, 70 shore rocks, two tents, a campfire, a rowboat and three figures with a seeded generator. Output: `island.npy` (256x256 float32 metres) and `island.json` (heights in cm, props, camera, sun). Two fresh runs give identical bytes (`tests/approaches-test.js` checks this and that the files on disk match). `scene2d.py` turns it into a 0.25 m grid with albedo, props and a shoreline distance field, used by approaches 1, 3 and 4. Approach 2 reads only `island.json` and builds the terrain and props itself in the shader.

## The comparison

| | 0 Existing look | 1 Ray-marched heightfield (numpy) | 2 SDF shader (WebGL) | 3 Painted illustration | 4 Voxel (three.js) |
|---|---|---|---|---|---|
| Look, honestly | Warm, toy-like, readable people, strong colour. Low-poly faceting and noisy glitter show. | The softest, most photographic light: area-light sun shadows, sky occlusion, depth-tinted water, haze. Props are blobby (0.25 m grid), conifers read as cones, tents small. Moody and a bit brown; least "cheerful". | Crisp true shapes (tents, boat, tiered conifers), real soft shadows, glowing fire, volumetric haze, island reflected in the water. Terrain surface is slightly rippled/furry where the noise detail is too strong. Closest to a modern game look. | Warm storybook chart with paper, ink coast, compass and a title. Most charming and most legible as a map. Relief is weak (low island, soft light), strokes are procedural not hand-made, the dark sea band at the top is a flat fill. Not a 3D view: it cannot orbit. | Chunky 0.8 m blocks, terraced hills, ambient-occluded tops, translucent turquoise water with foam, fire and smoke blocks. Cleanest and friendliest; weakest sunlight (sun is behind, faces are mostly in shade) and the beach reads flat. Props are 4 to 6 voxels, so people and boat are tiny. |
| Compute to produce this image (here) | Real time; screenshot taken in about 6 s in software GL | Shadow and sky-occlusion bake about 100 s, then 36 s render with 9 samples per pixel on 4 cores: **about 2 min 20 s** total | **about 3 min** in software GL (CPU) at 4 samples per pixel. The same shader on a GPU is a different story (see next row) | **about 16 s** on one core | **about 4 s** (build 236k triangles, 4096 shadow map) |
| Real time on an iPad? | Yes (it is the shipped path) | No. Only the baked maps could be reused: the shadow and occlusion maps are a terrain bake that a real-time renderer can sample. | Probably at reduced resolution on a recent iPad Pro, not on older iPads. **Estimate, not measured**: the shader does 300 march steps, 56 shadow steps, 6 occlusion taps and a 16-step haze integral per sample, with 34 trees looped in the distance function. Cost grows with every prop. | Not as a live view. The illustration could be baked once to a texture or an overlay (map screen, loading card). | Yes. 236k triangles with one shadow map is within iPad range once the mesh is chunked and indexed (it is not yet: this prototype uses unindexed triangles). |
| Usable in AR? | Yes, same as the game. | Only as baked textures or lightmaps on an ordinary mesh. | Awkward. A full-screen ray-march has no natural depth to composite against the camera feed, and two eyes double the cost. Possible as a small table-top volume; not recommended. | No (flat). A painted texture draped on the terrain mesh could work. | Yes. A table-top voxel island is the easiest of the five to put into AR: plain meshes, small, shadow-friendly. |
| Can the player's builds change it live? | Yes | No. A change means a re-bake (2 min here; could be tiled and made much faster). New props would have to be added as ordinary meshes on top. | Yes in principle (add a primitive, edit the height texture), but every build adds loop cost and terrain edits must be re-uploaded. Fine for a few dozen builds, bad for hundreds. | No (about 16 s to repaint the whole thing; could stamp small patches). Good for a "story so far" snapshot after the fact. | Yes, the best fit: a build is a column edit and a local re-mesh. Natural for the ledger and for undo. |
| What the owner's hardware and skills must provide | Nothing new | Python + numpy and a few CPU minutes. Anyone who can read numpy can tune it. For production speed: a GPU path tracer (Blender Cycles, or a compute shader) and someone who can drive it. | GLSL skill is the scarce one: writing and debugging SDF shaders, and performance work on the actual iPad. A real GPU to iterate on (this build machine needs 3 minutes per frame). | Python + PIL for this procedural version. A real illustrator (Procreate, Krita) would beat it, so the honest production route is: this pipeline gives them an oblique underlay at the right proportions, they paint over it. | three.js (already in the project) and an eye for palettes. Lowest skill barrier of the four. |
| Best used for in the game | Reference for the live view | **Hero art and the terrain bake**: marketing stills, store art, loading screens; baked sun-shadow and sky-occlusion maps as texture input for the real-time terrain. | **A live-view candidate** if a GPU path is proven on the target iPad; today the best "what could the live look become" demo. Also good for hero stills of the live look. | **UI and storytelling**: chart screen, island map, journal pages, share cards, a printed poster. Also the natural way to show the fog-of-knowledge/survey state to the player. | **Live view and AR**, if the owner wants a stylised, build-friendly world; also the cheapest route to a very readable low-end iPad version. |

## Honest quality gaps
- None of these is finished art. They are four prototypes of the same island, each about a day of effort at most, made without a GPU. Use them to choose a direction, not as final assets.
- Approach 1 is a ray-marched heightfield with baked soft shadows and occlusion, not a full path tracer: no light bouncing between surfaces beyond a constant ground-bounce term, no real reflections (the sea reflects the sky only), no caustics. Props are rasterised into the height grid, so they have no overhangs and look soft. It is "physically soft" in the shadows and water tint, not physically exact.
- Approach 2 is correct as an effect but untuned for speed, and the iPad figure is an estimate. The swiftshader run proves it compiles and draws; it says nothing about GPU timing.
- Approach 3 is a pastiche. The wash wobble, edge pooling and strokes are procedural and repeat; the relief is flat because the island is low and the light is soft. People are tiny pictograms.
- Approach 4 has no baked "sun on the sand" feel at this camera (sun behind the island); the voxel size (0.8 m) is a compromise: smaller voxels make the people and boat legible but raise the triangle count a lot.
- Approach 0 is a different, closer framing, so it is a mood reference, not a like-for-like.
- All five use the same terrain and props, but each applies its own colour grading, so palettes are not locked yet.

## Reproduce
```
python3 heightmap.py              # island.npy + island.json (deterministic)
python3 render_pathtraced.py      # shots/appr-1.png   (needs scene2d cache; first run builds it)
NODE_PATH=$(npm root -g) node run_sdf.mjs shots/appr-2.png '?ts=100'    # about 3 min on CPU
python3 paint_illustration.py     # shots/appr-3.png
python3 export_voxels.py && NODE_PATH=$(npm root -g) node run_voxel.mjs # shots/appr-4.png
node tests/approaches-test.js     # determinism + images exist, 1200x800, not blank
```
`run_voxel.mjs` uses three.js r128 from `THREE_JS` or `/tmp/three.js` if present, else the CDN. Cache files (`.cache_*.npz`) are rebuilt on demand and are not committed.
