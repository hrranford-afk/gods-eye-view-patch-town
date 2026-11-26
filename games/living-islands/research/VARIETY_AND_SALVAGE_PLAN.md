Do not put real place names or brands into game code, assets or recipes. No text on objects.

# Salvage kit and variety plan (CAIRN, 26 Nov 2026)

Why: the owner looked at the test sea and saw dots. Spray and debris in `sea_proto` are placeholder points. The ChatGPT round (`targets/opening/`, frames 04 to 06, `SEA_AND_SALVAGE_FROM_CHATGPT.md`) shows what the sea should carry: salt-worn driftwood, sawn planks, rope, glass floats in netting, tin and hinges, crates, kelp, shells. Aim: real small models in groups, never the same twice. The owner's iPad (`SEA_BENCH_IPAD_26NOV.md`) held 2M sea triangles at 60 fps, and its limit is fill rate, not triangles. So hundreds of real objects of a few hundred to a few thousand triangles are affordable; large screen-covering transparent things are not.
Tags: TUNING = a starting number to measure. VERIFIED = measured here. Nothing below was run on a real device.

## 1. The kit (what `sea_proto/salvage.js` builds, procedural three.js r128)

Sizes are metres in the prototype's honest scale and are multiplied by one page knob (object size, default 1.35) so they read from a boat-height camera. Triangles are LOD0 / LOD1 / LOD2 (TUNING; the prototype prints real counts on the kit board). Materials: M = matte (wood, cork, shell, kelp, rope, pebble; Lambert), T = metal (Phong), G = glass (Phong, transparent). Three materials in total across the whole kit.

| Kind | Variants | Tris LOD0 / 1 / 2 | Mat | In water | Lands | Story hooks and far-away look |
|---|---|---|---|---|---|---|
| Plank | 5: clean sawn, split end, nail holes and a rusty nail, broken jetty panel (3 boards on a batten), pale painted end (the marked plank) | 600 / 200 / 24 | M | rides flat, rolls slowly, long end pitches first; boards fan apart | high wrack line, fans against piles | The marked plank has a stable id, `plank-pale-01`. Jetty panels say "someone's dock broke". From far away: pale grey boards from the open ocean, dark tarred ones from the near islands |
| Driftwood log | 4: straight, forked, with branch stubs, root ball | 900 / 300 / 36 | M | half awash, rolls; branches jam on piles | tangles at the high wrack line | Bleached silver from far away, dark and barky if new |
| Cork float | 3: single, pair on a rope, bundle of four | 260 / 90 / 20 | M | rides high, marks the gear below | everywhere, in lines | Cork is the gear marker. A string of floats means a lost net |
| Glass float | 4: bare green, aqua in netting, blue in netting with a loop, small amber | 1100 / 380 / 60 | G+M | sealed, bobs very high | rare, in the tide pool and wrack | Rare finds, count capped. Colour tells which sea it came from: green and aqua from the warm south, amber and blue from the cold north |
| Bottle | 3: wine shape, round flask, long neck | 380 / 130 / 24 | G | sealed rides high, flooded rides low | shingle and gravel | A flooded one sits at the waterline. Fragments are a separate cheap decal on the beach later |
| Crate | 5: sealed, sealed with metal corners, breached (slats missing, hole), half-open lid, small box | 700 / 250 / 40 | M+T | sealed rides high, breached rides low and spills | sealed strands above ordinary wash; breached sits in the wet band | Orange paint for the one story crate (hero, by hand). Open ones have a stable id for contents later |
| Barrel | 3: whole with hoops, staved (breached), sealed bung | 800 / 280 / 36 | M+T | rolls along its axis; floats high when sealed | rolls into coves | Hoop colour is the region mark |
| Pulley | 3: single, double, block with rope loop | 900 / 320 / 40 | T | sinks, so only seen pinned to a timber or on shingle | in the shallows, beside the wreck | Rusty brown is the age; pale tin means recent |
| Hinge | 3: strap, T, butterfly | 260 / 90 / 16 | T | sinks, so only seen on a plank or crate lid | shingle | Lifts the "this was a door" story |
| Kelp | 4 strands of 3 blades | 360 / 120 / 18 | M | trails the current line, floats flat, sways | wrack line, in clumps | Olive and amber; a clump traces where water went |
| Shell | 5: scallop, cockle, spiral, mussel pair, limpet | 220 / 80 / 14 | M | does not float | tide line and runnels | Scenery. Cream, rose, grey-blue |
| Rope coil | 3: loose coil, hank, lashing wrap | 700 / 240 / 30 | M | wet rope sags and sinks to a half float | snagged on timber | The lashing wrap joins rafts together |
| Pebble | 4 | 100 / 40 / 12 | M | none | the wet band | Scenery |
| Net clump | 2: with cork floats, tangled | 520 / 180 / 24 | M | drifts low | wrack line | Tangles around logs |

Totals: 14 kinds, 53 variants. Per object an average of 500 triangles at LOD0; 500 objects at LOD0 is about 250k, which the iPad bench says is fine for triangles. Because the iPad is fill-rate bound the budget that matters is overdraw: glass is the only transparent kind, it is small, and it is drawn with depth write off and in one call.

### Region-of-origin looks (drift from far away)
Each drift item carries an `origin` 0..3 that tints and chooses details. This is the "where it came from" look and it lets one kit say four seas:
- 0 home reef (default): warm grey-brown wood, green glass, orange crate.
- 1 cold north: pale driftwood, amber and blue glass, dark tarred planks, ropes of tan hemp.
- 2 warm south: bleached white wood, aqua glass, coral-rose shells, yellow rope.
- 3 far west: dark red cedar, no glass, blue-painted planks, green hoops.
The origin is a per-instance tint and per-kind variant bias, not new geometry, so it costs nothing at draw time. Floats that travelled far look more worn (wear amount is raised by the age of the drift).

## 2. The variation system

Per instance, from one integer seed (the stable id of the item): scale (0.75 to 1.35, plus a separate length stretch for planks and logs), tilt (a small lean, plus a rest roll), colour (a tint in hue, saturation and value around the base), wear amount (0 to 1), a grain phase, a wetness amount, a variant index. All seeds are hashed, never `Math.random`, so the same id always gives the same object (save and reload, and screenshot checks, are repeatable).

Wear sits where use and water would put it. It is baked into the geometry as a second vertex colour layer, "worn colour plus mask", and the per-instance wear amount only mixes it in:
- planks: ends and edges bleached and rounded (mask by distance to the end faces), faces gain silver grain; the underside stays darker and wetter; nail holes ring rusty.
- logs: bark stripped at the ends and on the top; barnacle-pale patches on the bottom half.
- metal: rust at corners, hinges' pins and the lower half; clean flat faces stay paler.
- cork: dark rim where it was handled; rope eye ring worn pale.
- crates: paint flaked at corners and the upper edge, wet and dark at the base, rust at the metal corners.
- glass: no wear in colour; sea-frosted rim only (a pale vertex band at the neck).
- kelp: tips pale and curled, stipe dark.
Wetness (per instance) darkens and glosses; objects in the swash band get raised wetness, objects high on the beach dry out.

Surface detail that does not tile: the material shader makes grain procedurally from local object position plus a per-instance phase, with two noise octaves stretched along the grain. There is no texture to repeat. When an image texture is baked later (section 6) use stochastic or hex-tiling sampling (blend three randomly offset samples per pixel), or triplanar sampling with a per-instance offset, plus a low-frequency macro tint from world position, so that tiles never line up. A macro-variation term (world-position noise, wavelength 40 to 90 m) tints whole beach patches so that a wrack line is not one even colour.

Per-seed recipes: a variant is `recipe(kind, variantIndex)` and a per-instance `seed`. The recipe is fixed (marks, damage); the seed changes proportions (lengths, branch positions, number of nails, split depth) at geometry build time for generated variants. Seed sets that are too similar are rejected by a distance check on a vector of proportions (the repetition checks below).

Hero pieces versus generated variants:
- by hand (Blender, section 6): the orange story crate, the marked plank, a rope-wrapped driftwood beam, a rusty winch pulley, the largest glass float, a broken jetty section. Around a dozen pieces with proper geometry, bevels and baked textures. They appear once or twice per scene and have stable ids.
- generated (procedural, this prototype): everything else, from recipes with seeds.
Rule of thumb: the eye reads a hero once and generated stock thousands of times; one hero per screen, hundreds of generated pieces.

## 3. Avoiding repeated patterns (techniques and checks)

Techniques:
1. More variants than the eye can memorise per kind (4 to 5), with proportions generated from seeds, not just colour swaps.
2. Per-instance scale, stretch, tilt, tint, wear and grain phase (section 2).
3. Never place on a grid. Use rules: wind lanes, eddies, the tide line, shelter. Poisson-disc spacing at the same radius gives the "evenly dotted" look, so use clusters: a cluster has a centre, a spread, a main heading and 20 percent that disagree.
4. Group by story, not by kind: a raft (planks plus lashing plus a crate), a net with floats, a log with kelp caught on it. Groups carry mixed kinds and mixed ages.
5. Headings follow the water (aligned along the current, with a spread), and the spread depends on size: big things align less to waves, small things more.
6. Density varies at three scales: a lane (tens of metres), a patch (metres), a clump (centimetres). Empty gaps are as important as clusters.
7. Hero objects break up the field: one large piece per screen draws the eye and hides small repeats.
8. Procedural grain and no repeating textures; world-position macro tint.
9. Stagger bobbing phase and period by seed so floats never rise in step (period 0.8 to 1.3 times the wave period).
10. LOD swaps hidden by distance fog; never swap on a ring around the camera at one radius (add 15 percent per-item jitter on the switch distance).

Checks:
- Data check (every frame count, cheap): the signature collision rate. A signature is (kind, variant, scale to 10 percent, yaw to 15 degrees, tint to 8 levels, wear to 4 levels). Rate is the share of visible instances whose signature has been seen before. The page shows it (`__sea.salvage.stats().repetition`).
- Image check (screenshot test): the patch repetition score. Take 20 px square patches on a 10 px stride over pixels with real texture (edge energy above a floor, which skips smooth sea and sky), reduce each to an 8 by 8 grey patch with the mean taken out, and for each patch find its nearest other patch (a small hash grid of coarse features keeps it linear). The score is the share of patches whose nearest distance is under a fixed small threshold. Identical objects at the same scale and heading give low distance; varied ones do not. Report the score with variation off and on for the same camera, time and seed (`sea_proto/repeat_score.cjs`).
- A fixed-camera tile check: autocorrelate the screenshot's horizontal luminance rows over the object band, report the strongest peak at lags above 12 px. A periodic pattern shows as a peak.
- Human check: the owner's rule is "does it look samey". Every screenshot goes through a short review: name the three most obvious repeats.

## 4. Draw-call strategy

- One `InstancedMesh` per (kind, variant, LOD). Three materials in the whole kit, so the state changes are few. Per-instance data lives in an instanced attribute (wear, wet, grain seed) and `instanceColor` (tint). Empty meshes are hidden, so draw calls follow what is visible.
- Per frame, each item is culled against the camera frustum (a sphere test on the CPU), picks its LOD by distance (with the 15 percent jitter), and writes its matrix into the bucket. Capacity per bucket is the item count of its kind, so memory is a few MB at 2000 objects.
- LOD distances (TUNING): LOD0 under 30 m, LOD1 to 90 m, LOD2 to 260 m, nothing beyond (the sea fog is dense by then; spray and the sea itself carry the far field). The iPad tier uses 0.6 times these distances.
- The CPU wave query is the main cost: each floating object samples 4 points through the same Gerstner sum as the shader. Objects beyond 120 m from the camera sample every third frame (staggered), beyond 220 m every sixth, and use 1 point. A raft samples once for all members.
- Worst-case draw calls at the upper limit: 53 variants times 3 LODs is 159, but a typical frame touches about a third of them. If an iPad run shows draw calls as the limit, merge LOD2 into one mesh per kind and drop it (record in the bench).
- Spray stays as `Points`; it is a mist, not a model.

## 5. Budgets (TUNING; nothing measured on a real device here)

| Tier | Salvage objects (Pretty) | Slider max | Triangles from salvage | Notes |
|---|---|---|---|---|
| iPad | 300 to 400 | 2000 | about 100k at LOD mix | fill rate is the iPad limit (owner's bench); keep glass small and few; LOD distances times 0.6 |
| Desktop | 600 | 2000 | about 250k | |
| Radeon | 1200 | 2000 | about 500k | Radeon VII (`RADEON_VII_SPECIALITIES.md`) leaves room; the 2000 cap stays a slider |

Frame budget: 16.7 ms on the Radeon, 33.3 ms candidate on the iPad as `SEA_AND_SALVAGE_FROM_CHATGPT.md` suggests. The iPad bench shows 2M sea triangles at 60 fps, so 100k to 250k object triangles is small beside that; the CPU query (about 4 sea samples per object) and pixel fill are the risks, so the slider and the bench both stay. tiers.js may appear from another agent; this prototype does not depend on it and reads its own tier name from the page.

## 6. What to make in Blender on the Radeon and bake

The Blender work runs by hardware through fixed orders on the owner's machine (`blender/`, `BAKE_BRIDGE.md`). The prototype geometry is procedural so it runs anywhere; these would be better baked:
1. Hero pieces (section 2): sculpted with bevels, real split wood fibres, rope with proper twist. Export GLB with LOD0, LOD1, LOD2 as separate meshes, as the boat kit does (`BOATS.md`).
2. Wood: one 1024 texture atlas of 8 worn timber patches (albedo, tangent normal, roughness), with stochastic sampling so a plank never shows an obvious tile. Baked AO per variant into vertex colour, since the sun moves but contact darkness does not.
3. Glass float with netting: Cycles-baked normal map for the twisted netting and a thickness-faked refraction texture (a real refraction pass is too costly on the iPad).
4. Rope: a baked normal map on a simple tube (the twist) is far cheaper than geometry at distance and nicer close up.
5. Shell set: photo-scan-quality scallop and spiral with baked colour (the prototype shells are lathe shapes with ribs).
6. Kelp: a hand-modelled strand with baked translucency; the prototype's ribbons stay as the generated filler.
7. Rust and salt crust masks per metal variant, baked as the second vertex-colour layer this prototype already reads (`aWorn`), so a baked mask drops in with no shader change.
8. Impostors for LOD2 of the largest pieces (a baked eight-view card set).
The shader contract for baked parts is the same as for procedural ones: `color` (base), `aWorn` (worn colour and mask), `aGr` (grain strength), and the instanced `aVar` and instance colour.

## 7. Delivery in this job
1. This plan.
2. `sea_proto/salvage.js` (kit, instancing, kit board, repetition control).
3. The sea and the beach use it: heave, pitch and roll on the CPU wave height, drift along wind lanes, eddies and the tide current, grounding in the shallows, rope-bound rafts, a wrack line on the beach, an object count slider (0 to 2000) and LOD.
4. Screenshots and a repetition score before and after variation is switched off (`research/sea_proto_shots/`, `SALVAGE_LOOK_REPORT.md`).
