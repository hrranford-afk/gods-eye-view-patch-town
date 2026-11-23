Do not put real place names into game code, assets or recipes.

# Cutaway finish pass (task 28, 23 Nov 2026)

Page: `cutaway.html?finish=1` (the old page is untouched without the switch). Pictures: `shots/cutaway-finish-1..4.png`, each BEFORE (left, the page as it was) and AFTER (right), wide, cone close, cut face close, sea edge. Tests: `tests/cutaway-finish-test.js`, `tests/cutaway-finish-render.js`.

Why: the owner said the volcano page "looks like a textbook, not Blender quality", because the brief never told the builder to use the finish stack (the bake bridge, the Filmic table, the sea=2 / flow / weather shader, the kit trees). This pass puts that stack on the block. It is a finish pass, not a redesign: the heightfield, the wall textures and the geometry are the same bytes as before (a test proves the world hash is unchanged with the switch on).

Confidence tags: VERIFIED = measured or read back in this pass, PLAUSIBLE = reasoned from something verified, TUNING = a chosen number, UNVERIFIED = not checked.

## 1 What changed
| Piece | Before | Now | Comes from |
|---|---|---|---|
| Land light | vertex colour + one Lambert sun + hemisphere | Cycles sky GI + AO as `lightMap` (uv2), sun visibility mask, sun = DirectionalLight S/pi, live weather scaling | `blender/bake_volcano.py`, `tools/volcano_pack.py`, `blender/li_bridge.js` (`makeBridgeLandMaterial`, moved out of `baked_bridge.html`) |
| Tone | ACES at 1.05, water and walls un-tone-mapped | the 65-entry Filmic table fitted in the bake bridge, in every material (exposure 2^-0.8, TUNING) | `blender/assets/bridge/bridge.json` -> `LI_BRIDGE.installFilmicFit` |
| Sea | one-off shader, three sine waves | `SEAF_FS`, the `?flow=1` sea of islands_look.html: wave trains, chop, glitter, foam on coasts, flow-map advected ripples, wake slots, terrain shadow on water; patched by `LI_WEATHER.patchSea` | `li_sea.js` (moved verbatim out of islands_look.html), `weather.js` |
| Weather | three painted cloud planes | `LI_WEATHER.create`: eight states (clear default, fair, overcast, showers, rain, fog, storm, goldenhour, auto), puffs, deck, rain, cloud shadows on sea, land and walls, wind, fog | `weather.js` unchanged |
| Land surface | smooth vertex colour | + grain, tide wetness, swash lace, underwater caustics (the page's own GLSL), slope tint, bump, weather wetness | `LI_SEA.LAND_WET_GLSL`, `LI_WEATHER.patchLand` |
| Trees, rocks | none (the surface colours only) | conifers, broadleaf, shrubs, heather, boulders placed from the world maps (vegetation belt, rock id, slope), instanced, with baked-light ambient occlusion and baked sun visibility per instance, plus soft shadow decals | `li_kit.js` (`PB`, `addConifer`, `addBroad`, `addShrub`, `blob`, moved verbatim out of islands_look.html), `landform/volcano/maps.png` |
| Cut faces | flat paint, MeshBasic | same wall textures, lit, with bed-parallel mottling at three scales, vertical joints, run-off streaks, pits, edge wear, a wet dark foot with a spray band and a blue-shifted underwater part, bump from the painted bed lines, warp that breaks the texture's stair-steps | `cutaway_finish.js` (`wallMaterial`) |
| Water edge | flat translucent sheet | a glass face: depth tint with the sea palette, fresnel sky reflection, a bright meniscus under the surface, soft caustic bands, the seabed visible through it | `cutaway_finish.js` (`glassMat`) |
| Base | brown box | black lacquer slab, a bevelled bronze step, a faint brass label plate ("section through the vent, diagrammatic, vertical scale x2.5"), no real names | `cutaway_finish.js` (`museumBase`) |

## 2 How it reuses the stack (and what it does not)
* Scale. The sea and weather code is written for the 200 m table (`TS = 100`, wavelengths of metres, clouds at 20 m). Rather than fork those shaders, finish draws everything in real metres inside `root` and scales `root` by K = 100 / 768 so the 1536 m block is the 200 m table the shaders know; the camera is placed in that space. The shaders, the weather module and the flow encoder are therefore used unchanged (plus small, listed patches, section 5).
* Moved, not copied: `li_sea.js` (sea shaders, noise generators, flow encoder, the land wet GLSL), `li_kit.js` (the kit), `blender/li_bridge.js` (Filmic fit and the bridge land material). `islands_look.html` and `blender/baked_bridge.html` now load them. Proof the refactor changed nothing: `islands_look.html` world hash 8d962c0c and 88,790 triangles unchanged in five modes (default, sea=2, flow=1, weather=fair q=low, landing), identical triangle part lists, 0 errors, screenshots pixel-identical bar clock animation (mean absolute difference 0 to 0.18 of 255); `tests/look-test.js` and `tests/bridge-test.js` pass (VERIFIED).
* Not shared, said plainly: (a) the flow field. The page's `flowRaw` is tied to its island list; finish builds a field of the same family (uniform tidal stream, turned tangent to the coast, speeded along it, shallow slowdown, unit amplitude times the tide cosine) from a distance transform of the coast and encodes it with the page's own `flowEncode`. (b) `seabed.js` is not used: the block has real bathymetry (down to 211 m), so the sea's depth and exposure texture is built from the heightfield and the world's wave exposure map. (c) the Blender pano and sky settings in `bake_volcano.py` repeat the pano block of `bake_bridge.py` (a script, not a module, so it cannot be imported).

## 3 Numbers (all measured in this pass, headless chromium with software GL, so VERIFIED for counts and sizes, UNVERIFIED for speed)
| | Old page | Finish |
|---|---|---|
| Frame triangles, high | 606,226 | 689,790 (+83,564: terrain 524,288 unchanged; kit 157,258; the old sea and clouds are gone) |
| Frame triangles, low (`?q=low`) | 153,618 | 199,364 |
| Draw calls | 15 | 37 high, 36 low |
| Kit, high | none | 1,494 instances in 23 instanced meshes: 250 conifers, 134 broadleaf, 372 shrubs, 176 heather, 562 rocks, 845 shadow decals |
| Kit, low | none | 607 instances, 64,144 triangles |
| Console errors, default / `q=low` / `post=0` | 0 | 0 in finish, finish+low, finish+post=0, finish+low+post=0 (and 0 in the three old modes) |
| World geometry hash (high / low) | 7f69ee24 / 92f60254 | the same with the switch on |
| Pixels of the page without the switch | | byte-identical to the page committed in 0315c54, same view, clock frozen |

Assets added (VERIFIED, `tests/cutaway-finish-test.js`): `finish/lightmap.jpg` 70,427 B, `finish/sunmask.jpg` 46,609 B, `finish/finish.json` 776 B, `finish/sky_pano.jpg` 18,587 B, `maps.png` 61,450 B; 0.20 MB in all (limit was about 4 MB), the whole volcano folder 1.66 MB. Light map: JPEG q92 4:4:4 against a 438,500 B PNG of the same map (84 percent smaller); JPEG error mean 0.0042, max 0.048 in linear light (VERIFIED). Light map p5 / p50 / p95 luminance 0.648 / 0.689 / 0.772: the sky light of an open volcano is nearly uniform, so the relief on the cone comes from the sun, the mask and the bump, not from the AO (VERIFIED, and a disappointment: the bake bridge island had more occlusion).

Bake (VERIFIED): Blender 5.3.0 (not 3.6; the patterns are 3.6-compatible and unchecked there), CPU Cycles, 4 free cores: 1024 x 1024 light map at 128 samples 182.7 s, panorama 2.0 s. The mesh is the 513 x 513 heightfield itself (524,288 triangles); its hash (dc085e36b73e1c37) is checked by the test when `BPY_PYTHON` is set, and was checked by hand here.

Sun mask (VERIFIED, with a changed method): Cycles' `SHADOW` bake type returned 1.0 on all but 0.04 percent of texels at sun elevation 30 degrees over a 237 m cone (the bridge pilot saw the same oddity and shrugged). The mask is therefore ray marched over the heightfield in `tools/volcano_pack.py` (exact for a heightfield, soft edge +-0.5 degrees of elevation): 15.0 percent of texels are in shadow, mean visibility 0.849. Cycles still bakes the sky light and AO. One sun position only (elevation 30, azimuth 235, TUNING chosen to light the south and west faces that the cut shows).

Tone: grey-row fit error of the table 0.0008 in sRGB units and 0.008 on land colours, from `BRIDGE_PILOT.md` (VERIFIED there, not re-measured here). The exposure of this scene (2^-0.8) was chosen by eye after the first render was too bright (TUNING).

## 4 Iterations, what I looked at
Every picture was read back. Round 1 (first run, no errors): boulders as big as houses and covering the island (sized 5 to 25 m, 1,100 of them) -> 2.5 to 11 m, 560; pumice patches read as snow -> warm toward tan with a knee; the water edge had vertical streaks like rain -> broad soft bands; the cut faces were washed out pastel and had a screen-door hatch from the grain texture aliasing -> darker, more saturated, three-scale mottling, mip bias on the grain; the heather was pink candy -> the landing palette. Round 2: first sun-lit view had the sun behind the camera (flat), the cone looked like concrete -> exposure -0.8 EV, tree shadow decals, camera moved to a raking angle; the wall texture's stair-steps -> a small domain warp, then halved because it looked like torn paper; the cut faces still read as vector paint -> bump from the painted bed lines (scale 0.6), vertical joints, run-off streaks. Round 3: the sea-edge picture was the weakest (dark, no sun) -> looked into the sun so the glitter and the glass catch the light. The wide and cone pictures were re-framed to the sun-lit side.

## 5 Patches to the shared shader text (so nobody is surprised)
`SEAF_FS`: `.b*14.0` -> `.b*32.0` (the cone is 31 table metres tall, the page's islands 14); the lit rim `length(p)` / `92.5..94` -> `max(abs(p.x),abs(p.y))` / `97..99.7` (square block, not round table). `LI_WEATHER.patchLand` is written for the page's Lambert chunk: finish hands it the line it looks for and keeps the Standard material's specular terms. The weather module's sky dome is hidden (the block stands against the page's studio gradient); puffs, deck, rain, fog, cloud shadows and the sea/land patches are live.

## 6 What is still faked
* Tide is drawn 4x (the slider +-1.1 m moves the water +-4.4 m; the volcano is 237 m high). TUNING.
* The sea's depth is compressed (`th = -5 (1 - exp(h K / 5))` below sea level) so the shader's 5 m palette spans 0 to 211 m; foam widths and the shallow colour band are therefore not metres. TUNING.
* The flow field is the page's family, not the page's field (see 2). The flow period (55 s), speeds (1.1 table m/s) and axis are the page's values or TUNING.
* Trees and rocks are the kit's flat-colour low-poly shapes (no leaf noise, no moss, no baked AO of their own; the ambient occlusion and sun visibility are sampled from the terrain bake at their feet). Their shadows are soft decals pointing away from the sun, not cast shadows; trees are not in the baked sun mask. Trees are drawn 17 to 34 m tall on a 1.5 km block (real ones would be invisible).
* The cut faces are the same painted strata (0.75 m texels); detail is procedural and the relief is the painted lines. At 1:1 the stair-steps of the bed boundaries still show.
* The sun does not move: the mask is for one position. Weather scales the sun and sky light and casts cloud shadows, but the cone's own shadow stays where it was baked.
* The land albedo is the 3 m vertex colour of `colour.png` (soft-kneed and warmed); there is no baked albedo or normal map for the block.
* The label text is generic ("diagrammatic, vertical scale x2.5, horizontal 1:1").

## 7 Sea and sky: the gap to Blender, honestly
The bridge pilot found the far sea and the sky far from Blender (far sea mean Y 0.71 against 0.44, dE 27; near sea dE about 20; sky strip dE 55). This pass changed the sea shader to the page's best one and tone-maps it with the Filmic table (previously it was not tone-mapped at all), but I did NOT render a Cycles beauty reference of this block, so there are no dE numbers for the new page and I do not claim a match. What I can see: the sea is a dark navy with good glitter, foam and flow texture but no Blender-like subsurface green near shores and no bright horizon haze; the sky is the page's flat studio gradient (the weather sky dome is hidden), so there is no sky to compare. These two are the biggest visible gap to the Blender hero look. Next step if wanted: render the block in Cycles (sea volume, nishita sky), compare with the pilot's `bridge_compare.py` regions, then tune `uSunCol`, the sea palette and the backdrop.

## 8 Ranked gaps
1. Sea and sky against Blender: unmeasured on this block, visibly darker and flatter than the Cycles sea (section 7).
2. Trees and rocks are toys next to Cycles trees (flat colours, faceted boulders, olive broadleaf lollipops, decal shadows).
3. The cut faces are still diagram strata with procedural grain: no real rock texture, no per-bed material, jagged bed edges at 1:1.
4. Terrain albedo and relief: 3 m vertex colour, near-uniform sky light (little AO contrast), one sun position; flats are bland.
5. Not measured at all: frame rate, iPad memory and decode, Blender 3.6, a Cycles reference for the block, the AR camera path on a device (`?post=0` runs without errors in software GL only).
6. Weather puffs and the deck are sized for the 200 m table, so they are large against the cone (they hide it in fair weather); `clear` is the default for that reason.
7. The default `cutaway.html` is unchanged; making finish the default is one line (`qs.get('finish') === '1'` -> `!== '0'`) once the owner agrees.

## 9 Files
`cutaway_finish.js` (the pass), `cutaway.html` (hooks: the loader tag, `FIN` calls in `build`, `applyCam`, the frame loop, tide, clouds, and `__cv.hash()` / `__cv.finish()`), `li_sea.js`, `li_kit.js`, `blender/li_bridge.js` (shared, moved), `islands_look.html` and `blender/baked_bridge.html` (now load them), `blender/bake_volcano.py`, `blender/tools/volcano_pack.py`, `landform/volcano_maps.py`, `landform/volcano/maps.png`, `landform/volcano/finish/*`, `tests/cutaway-finish-test.js`, `tests/cutaway-finish-render.js`, `shots/cutaway-finish-1..4.png`.
Commands: `python3 landform/volcano_maps.py 100`; `python blender/bake_volcano.py --work <float dir> --tex 1024 --samples 128 --passes light,pano` then `python3 blender/tools/volcano_pack.py --work <float dir> --vol landform/volcano`; `NODE_PATH=$(npm root -g) node tests/cutaway-finish-test.js` (add `BPY_PYTHON=<python with bpy>` for the mesh hash check); `NODE_PATH=$(npm root -g) node tests/cutaway-finish-render.js`. Page options: `?finish=1`, `q=low`, `post=0`, `weather=<state|auto>`, `wt=<s>` (freeze the weather clock), `seat=<s>` (freeze the sea clock), `exp=<EV>`, `albedo=<gain>`, `wbump=<scale>`; the panel has a weather menu.
