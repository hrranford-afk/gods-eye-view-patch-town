# SEAL_MODEL: baked, rigged, animated seals (24 Nov 2026, version 1)

The owner looked at the life view seals (a smooth brown tube, no spots, no whiskers, two black squares for ears and eyes) and called them rubbish. That was fair: the boats, the collector robots and the kit pieces are proper baked GLB models with real anatomy, wear and levels of detail, and the seals were still the 252-triangle placeholder from `animals.js`. This note describes the replacement: four animals built the same way as the collector (a fixed script builds the geometry, bakes the textures, writes the GLB files; a test checks them).

Files
- `blender/seal_model.py` geometry, rig, clips, GLB writer (pure python and numpy; runs under plain `python3`, also inside Blender).
- `blender/seal_tex.py` the baked coat (colour, normal map, occlusion/roughness map). Reuses `collector_jpeg.py` (JPEG writer) and `collector_tex.py` (noise) by import; reuses the quaternion helpers of `collector_model.py`. None of those files was changed.
- `blender/seal_shots.py` pictures rendered from the GLB files (needs `bpy`).
- `assets/seals/seal_<species>_<lod>.glb` (12 files: grey_male, grey_female, grey_pup, harbour, each hero, live, far) and `seal_report.json`.
- `tests/test_seal_model.py` the check (about 3 minutes).
- Pictures in `shots/`: `seal-1.png` (haul-out of six), `seal-2.png` (portrait), `seal-3.png` (sliding into the sea), `seal-sheet.png` (labelled 3 x 5), `seal-variants.png` (six variants).

## 1. The four animals
| model | what | length (nose to hind flipper tips) | modelled mass | real range |
|---|---|---|---|---|
| `grey_male` | adult male grey seal: heavy bean, long sloping "Roman" nose, thick neck with skin rolls, scars | 2.30 m | 226 kg | 170 to 310 kg, 1.95 to 2.5 m |
| `grey_female` | adult female: smaller, finer head, shorter snout, silver with dark blotches | 1.80 m | 112 kg | 103 to 180 kg, 1.65 to 2.1 m |
| `grey_pup` | white-coated pup, round big-eyed head, short snout | 1.00 m | 17 kg | 10 to 18 kg, 0.9 to 1.05 m |
| `harbour` | spotted harbour seal: round dog-like head, dished forehead, nostrils in a V | 1.62 m | 82 kg | 45 to 170 kg, 1.2 to 1.9 m |

Sources (the same as `research/ANIMALS_LOOK_AND_MOTION.md` section 3.1): the pinnipeds.org grey seal page (male 1.95 to 2.5 m and 170 to 310 kg, female 1.65 to 2.1 m and 103 to 180 kg, pup 0.9 to 1.05 m, 10 to 18 kg; VERIFIED), the Mammal Society grey and harbour seal pages (female average 1.8 m, 155 kg; banana resting pose; VERIFIED), marinebio and NOAA fisheries harbour seal pages (VERIFIED, secondary). The anatomy that is not a number comes from standard descriptions of phocid seals and is tagged below.

## 2. Anatomy and what the model does with it
| fact | model | confidence |
|---|---|---|
| a phocid body is a spindle: a deep trunk, thickest behind the shoulders, tapering to a thin rump; blubber makes the cross-section broad and round | one lofted body of rings from nose to rump, each ring a superellipse (flat belly exponent about 3.4, round back), half width and top and bottom heights from tables (grey male widest 0.63 m, 0.47 m high) | Medium (proportions from photographs, not from a measured scan) |
| grey seal: long flat "Roman" snout, no steep forehead, widely spaced parallel nostrils; harbour seal: short dog-like face, concave forehead, nostrils forming a V | snout factor (1.0 male, 0.86 female, 0.6 pup, 0.58 harbour), a bridge bump on the muzzle (male raised, harbour dished), nostril slits parallel on grey seals and tilted into a V on pup and harbour | VERIFIED for the descriptions (research note), Medium for the shapes |
| the head joins the body through a thick neck with transverse skin folds | sinusoidal rolls across the neck (amplitude 5 percent male, 1.8 female), deeper underneath and on the sides, dark creases baked into the colour and the normal map, a skin fold wave along the flank | Medium |
| front flippers: short paddles with five digits and five claws, held back along the flanks at rest | height-field plate with five scalloped digit tips (digit I longest), claws as bent cones, 0.34 m (male) to 0.16 m (pup) | Medium |
| hind flippers trail together and are fused into a fan, soles up when the animal lies prone | two plates, five scalloped toes, turned soles up, pivoting from one `flipper_hind` joint with a splay joint each, a short tail between | Medium |
| nostrils are slits that close; large dark eyes, no white; no external ear, only a small hole behind the eye; whiskers (vibrissae) on the muzzle pad and above the eyes, undulating, up to about 12 cm on the male | slit decals, glossy near-black eye spheres with a clear coat in a dark lid collar and a baked tear streak, ear hole decals, 30 vibrissae a side on the male (flat curved ribbons, 4 segments) and 4 brow ones | Medium |
| resting seals are never symmetrical: the belly spreads and sags to one side, the spine curves (the "banana") | the lower ring spreads by 11 percent on the left and less on the right, the spine bends 4.5 cm sideways, the head end more | Medium |
| males carry scars on the neck and chest and are darker with pale blotches; females are paler silver with dark blotches; pups are white and moult; harbour seals are spotted with rings | baked coat, see section 3 | VERIFIED (research note colour starting points), Medium for the patterns |

The mouth is real. The upper head and the lower jaw are separate pieces along a lip line (97.5 degrees from the back); behind them a dark lining, a tongue and small teeth sit inside, so the `yawn` and `pup_cry` clips show an open mouth. When closed the two pieces coincide and a thin dark lip line shows.

## 3. Coat (baked textures)
Hero: one atlas 2048 x 768 (the body chart is the loft itself, 1536 x 768, the head with twice the texel density; two 256 x 256 flipper charts, back on the top half and sole on the bottom half), colour 2048 x 768, normal 1024 x 384, packed occlusion/roughness/metal 512 x 192, all JPEG. Live: atlas 1024 x 384. Far: vertex colours sampled from the same baked map.
- Grey male: dark grey-brown with cream-grey blotches (warped noise thresholds with ragged edges), paler belly, darker head, dapple of fine flecks, long pale scars on the neck and shoulders, claw scratches.
- Grey female: silver base with dark blotches, pale belly, dark speckle.
- Pup: white (`#ece8dc`) with a cream hint on the face and belly, hair grain along the body, grey moult patches (amount per variant), damp smudges; sheen material for the fluff.
- Harbour seal: tan-grey with dark spots and pale rings from a 3D cell grid, so the spots are round on the curved body; belly pale.
- All: black nose pad (glossy), dark lips, dark eye rims and a tear streak, whisker pad with follicle dots, ear region, neck creases, sand dusting low on the flanks (rough, pale), salt crust on the back, damp darkening where it lies on the sand, scratches.
- Six variants for every animal (`--variant 0..5`: standard, pale, dark, warm, blotched, scarred and sandy) from a params dict plus the seed. Deterministic (the test builds twice and compares bytes). Only variant 0 is committed; the others are built on demand (about 40 s each at hero level). `shots/seal-variants.png` shows the six male variants.
- Wet and dry: the file has two materials and the standard `KHR_materials_variants` extension (variants `dry` and `wet`). Wet is the same textures with a base colour factor of 0.62 (about 20 percent darker, as in the research note), roughness 0.34 and a clear coat. `--wet` makes wet the default material (the pictures of seals in the water use that). The wet look is a material change, not a different picture of clumped fur.

## 4. Nodes and rig
The mesh node `seal_skin` is skinned (a real glTF skin) to the joints below; the clips animate the joint nodes. Every joint is at rest with an identity rotation in the committed files, and its pivot is the joint. Angles are (yaw, pitch, roll) in degrees in the animal frame (x forward, y left, z up); positive yaw turns left, positive pitch lifts the front, positive roll lifts the left side. Each node has `extras.axes` with the usable range.

`root` (whole animal) > `body` (mid trunk) > `chest` > `neck` > `head` > `jaw`; `body` > `hips` > `tail` > `flipper_hind` > `flipper_hind_l`, `flipper_hind_r`; `chest` > `flipper_fl_l`, `flipper_fl_r`; `head` > `eye_l`, `eye_r`, `whisker_l`, `whisker_r` (rigid mesh nodes; eyes close by scaling z to 0.15); `root` > `footprint` (an empty with the ground ellipse in its extras: semi-axes 0.8 m by 0.33 m for the male, which the page uses to pack haul-out slots). The scene extras hold the dimensions, the model mass, the pose table, the clip table (duration, loop, nodes, root motion) and the wet factors.

## 5. Clips (all in every GLB, standard glTF animations, linear keys, 5 to 24 keys a channel)
| clip | s | loop | what | when the page plays it |
|---|---|---|---|---|
| `rest` | 5.0 | yes | breathing (chest and body swell), a slow double blink, a small head drift | haul-out default; offset the phase per seal (period 5 s, as the life view's breathing hump) |
| `alert` | 6.0 | yes | head up, looks left then right, whiskers forward and twitching, settles | when the camera or a boat is inside the alert distance (26 m on the page, 1.5 D in the research ladder) |
| `scratch` | 4.2 | one-shot | rolls a little and rakes the left foreflipper over the flank in four strokes | a random idle once every 20 to 60 s per seal (research note: 0.6 to 1.2 s idle moves) |
| `hump_crawl` | 2.8 | yes | caterpillar shuffle: chest reaches and the foreflippers pull, then the hips arch up and follow; root travels 0.30 m a cycle | disturbance stage 1 (shuffle to the water edge), and any move on land |
| `slide_in` | 3.8 | one-shot | two humps, then the belly slide: root moves 1.95 m forward, 0.68 m down and 41 degrees nose down, hind flippers beat last | the final stage of a flush (at 0.7 D); the page removes the animal when it is under |
| `swim` | 1.6 | yes | undulating glide with the hind flippers sculling, foreflippers tucked | the swim away (up to 60 m), and seals fishing the shoal |
| `surface_look` | 5.0 | yes | spy hop: front rises, head looks round, whiskers droop and shake | the periscope heads that return 40 to 90 s after a slip-in; and curiosity at a boat |
| `pup_cry` | 3.0 | yes | head up, mouth opens three times, one foreflipper waves | pups in the sanctuary loop when hungry, or when the mother is away; the page can pair the sound |
| `yawn` | 3.4 | one-shot | head tips back, jaw opens 40 degrees, eyes squeeze shut | a random idle on the haul-out |

Poses (`scenes[0].extras.poses`, also writable as a file with `--pose NAME`): `rest`, `alert`, `alert_left`, `banana` (head and tail up on the belly, the Mammal Society resting pose), `flat_asleep`, `swim`, `spy_hop`, `yawn`. The three of the old page map to `banana`, `alert`, `flat_asleep`.

How the page uses them (the wiring is not in this change): one skinned instance per near seal (the live level, one mixer each, hero for the inspect view), the far level for the rest. Haul-out: `rest` with a random phase, an occasional `yawn` or `scratch`; a pup stays within a body length of its mother and plays `pup_cry` when she is away. Disturbance: `alert` at 26 m, `hump_crawl` towards the nearest open water at the flee distance, `slide_in` at the edge, then remove; the return after the quiet period plays `surface_look` (heads at the surface), then `swim`, then `hump_crawl` onto the rock, `rest`. Sanctuary pup care: the pup in care plays `rest`, `pup_cry` when the fish ration is late, `yawn` after feeding; release plays `slide_in` and then `swim`. Strip the `root` translation channel of `hump_crawl` and `swim` if the page moves the animal itself.

## 6. Budgets and measurements (committed files, rest pose)
See `assets/seals/seal_report.json`. Hero about 14,300 to 14,700 triangles and 540 to 580 KB; live about 3,000 triangles and 185 to 210 KB; far 504 triangles and 74 KB; the set of 12 is about 3.3 MB. Limits tested: hero 8,000 to 15,000 triangles and under 1 MB, live 1,500 to 4,000 and under 300 KB, far 300 to 700 and under 80 KB, set under 4 MB. Vertex format: position and normal (float), texture coordinates (normalized 16-bit), joints (bytes) and weights (normalized bytes that sum to 255). The far level has vertex colours instead of texture coordinates.

## 7. What is faked
- The coat is a baked picture: no individual hairs; the pup's fluff is a sheen material, a grain texture and a normal map (a real fur shell would cost a lot).
- Wet is a material swap (darker, glossy) not clumped fur; no drips (the whiskers droop in `surface_look`, the water is the page's job).
- Muscle and blubber do not move when the body bends: skinning stretches the ring mesh (the hump of `hump_crawl` is a hump of joints, kept to 0.15 m of stretch each way).
- The flippers are rigid plates (five digits shaped and ridged, not articulated). Claws are fixed cones.
- Mass is computed from the lofted volume at the density of water; the real ranges are higher for the male (heavy blubber is not modelled as extra bulk).
- Eyes have no iris, no eyelid geometry (a collar and a scale squeeze); no pupil response.
- Teeth, tongue and lining are plain materials.
- Nostrils are static slits (they do not open); there is no whisker physics.
- The six variants differ only in colour and pattern, not in shape (a fat and a thin seal would need a shape param; there is one for the sag and roll but it is per species).

## 8. Ranked gaps (honest)
1. Proportions are tuned by eye against described photographs, not from a measured scan: the head to neck transition and the shoulder hump are the least certain; a side by side with real photographs by someone who knows seals would move several centimetres.
2. The fur is flat: close up the male reads as a smooth skin with a pattern, the pup as a clean white seal with a sheen. A shell-fur pass (about 3 layers) would help at inspect distance and cost 3 times the triangles.
3. Wet fur: no clumping, no sheen change with the clip; the wet variant is only a darker glossy copy.
4. Flippers do not articulate and the foreflippers do not carry weight in `hump_crawl` (they swing, they do not push on the ground).
5. The mouth interior is plain; teeth are tiny cones.
6. Only variant 0 is committed; the other five need a 40 s build each or a texture-only extra pack.
7. The skinned clips have not been measured on the page's frame budget: one skinned seal with 13 joints is cheap, the research note allows one hero skinned animal at a time; the page should skin only the nearest few.
8. No sound. The grey seal croon and the pup call are in the research note and should be matched to `pup_cry` and `yawn` when the sound layer is wired.
9. Harbour seal pups (spotted, not white) are not a separate model; `grey_pup` is the only pup.
10. The old seal (`animals.js` `sealGeo`) is untouched; nothing on the page uses the new files yet.

## 9. Proposed plan for the next animals (the 12-species list of `research/FOOD_AND_WILDLIFE.md`)
The pattern is the same: one script per family, a lofted body or the parts, baked coat, named nodes, 6 or more clips, three levels of detail, a test, a note. The seal's rig and shot code are reused; only the profile tables, the part functions and the clips change.
| order | species | build | clips | cost (a day each unless noted) |
|---|---|---|---|---|
| 1 | gannet | lofted cigar body, long pointed wings as 3-segment plates (shoulder, wrist, hand), dagger bill, yellow head wash, black wing tips | glide (soar), flap, fold-and-plunge dive, sit | 1.5 days (the wing rig) |
| 2 | puffin | egg body, banded wedge bill (three colour bands baked), orange feet and legs | stand, walk, whirring flight, bill with fish, burrow peek | 1 day |
| 3 | herring gull | same bird body family as the gannet with a different profile table, yellow bill with a red spot, pink legs | stand, walk, glide, flap, steal-and-run | 1 day (reuses the bird rig) |
| 4 | shag | slim dark body, long snaky neck with a hook bill, green gloss in the roughness map, wing drying pose | swim and dive, wings-out dry, stand | 1 day |
| 5 | guillemot | upright bird family, dark head, white belly, pointed bill, ledge crowding | stand on ledge, swim, dive, call | 0.5 day |
| 6 | arctic tern | slender body, forked tail, black cap, red bill, narrow wings | hover, dive, glide | 0.5 day |
| 7 | oystercatcher | black and white, long orange bill, pink legs, walks along the tideline | probe, walk, run, flight | 0.5 day |
| 8 | otter | the seal's loft with a long tail, short legs and a small head; fur needs the shell pass (the otter is where it matters) | run, swim, roll, groom, stand up | 2 days |
| 9 | fish shoal | not a model: a school as a vertex-shader mesh of a few hundred spindles with one baked herring (blue back, silver flank) | the shoal wave and the bait ball; fish count from the shoal index | 1 day |
| 10 | shore crab | five-part body (shell, legs as bent tubes, claws), baked mottled shell | sidestep walk, claw wave, burrow | 1 day |
| 11 | kelp | frond ribbons with a holdfast and bladders, baked amber gradient, sway in the vertex shader | sway (tide-driven) | 0.5 day |
| 12 | tide turtle (legend) | same loft as the seal with a shell plate | glide | 1 day, last |
Reuse: `Body.eval` (superellipse loft with profile tables and caps), `plate_mesh` (wing, fin, fan), `spine_weights`, the clip sampler, the writer with skin, variants, wet and dry. A shared `fauna_model.py` would be worth extracting after the second species.

## 10. How to run
```
python3 games/living-islands/blender/seal_model.py --out DIR [--species grey_male|grey_female|grey_pup|harbour|all] [--lod hero|live|far|all] [--variant 0..5] [--wet] [--pose NAME]
blender -b --python games/living-islands/blender/seal_shots.py -- --glb DIR --out PICS [--w 1200 --h 800 --samples 64] [--only 1,2,3,sheet,variants] [--prefix seal]
python3 games/living-islands/tests/test_seal_model.py
```
The pictures are rendered from the GLB files with the shared Living Islands sky (the sea reaches the horizon and fades into it; no flat band), light and look, CPU Cycles, 64 samples, a fixed seed. The seals are posed by evaluating the clips stored in the GLB, which also proves the clips play. The committed pictures were made with the cloud `bpy` module through a wrapper that mimics `blender -b --python`.
