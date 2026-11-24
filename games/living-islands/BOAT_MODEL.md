# BOAT_MODEL: the boat kit (24 Nov 2026, version 1)

Four original wooden boats of a cool Atlantic island coast as GLB files, built the way the collector robot was: a fixed script builds the geometry, bakes the textures and writes the files; a test checks them. Nothing here is a copy of a real boat plan; no maker names, no lettering. The kit is wired into `islands_look.html` behind `&boatkit=1` (see the wiring section at the end); without the switch the page is unchanged.

Files
- `blender/boat_model.py` geometry, node tree, poses, clips and the GLB writer (pure python and numpy, runs under plain `python3`).
- `blender/boat_tex.py` baked wear atlas (colour, normal map, occlusion/roughness/metal); `blender/collector_jpeg.py` (existing) writes the JPEGs.
- `blender/boat_shots.py` renders the pictures from the GLB files with the cloud `bpy` module (same sky and light as the island renders).
- `assets/boats/boat_<boat>_<lod>.glb` for boats `dinghy`, `sailer`, `work`, `wreck` and levels `hero`, `live`, `far` (rest pose), plus `boat_report.json`.
- `tests/test_boat_model.py` the check. Pictures in `shots/`: `boat-1.png` (dinghy rowing, afloat), `boat-2.png` (sailer, sail filled, heeled), `boat-3.png` (work boat, davit out), `boat-4.png` (the wreck on the strand), `boat-5.png` (dry inside of the dinghy), `boat-sheet.png` (3 boats x 3 views and the wreck, labelled), `boat-lods.png` (hero, live, far, shaded and wire).

Run: `python3 blender/boat_model.py --out assets/boats` (all), `--boat dinghy --lod live`, `--pose rowing` writes a pose into the file's node transforms.

## The boats (confidence tags: V verified in research/BOATS.md, P plausible, T tuning, our choice)
| Boat | Length x beam | Strakes per side | Draft / freeboard amidships | Contents |
|---|---|---|---|---|
| dinghy | 4.0 x 1.45 m (P, BOATS.md skiff range) | 5 | 0.15 / 0.34 m (T) | lapstrake hull with real 14 mm laps, 3 thwarts on knees, ribs every 0.26 m, raked transom, keel, stem, rubbing strake, inwale, floorboards, crutch rowlocks, pair of 2.5 m oars with leather collars, painter coiled in the bow, bailer |
| sailer | 6.0 x 1.95 m (P) | 6 | 0.30 / 0.50 m (T) | clinker hull, 4 thwarts, tapered mast 5.1 m with shrouds and forestay, boom on a gooseneck, gaff sail with two rows of reef points and boltropes, furled sail, rudder on pintles, tiller, pair of 2.9 m oars, cargo (3 sacks, hooped barrel, crate, anchor, coil) |
| work | 7.0 x 2.45 m (P) | 6 | 0.38 / 0.62 m (T) | half-decked (foredeck, cuddy with doorway, windows, roof, stove pipe, bitts), open cockpit with 2 thwarts and floorboards, 5 crates in two stacks, heap of net with floats, rope fenders, davit with block, rope and hook, rudder and tiller |
| wreck | the dinghy, broken | 5 | as dinghy | top strakes gone in places, sprung planks, ribs standing broken, half an oar pair, sand filling the hull, weed on the side, listing 8 degrees on the strand |

Hull shape: lofted from 4 curves (sheer, keel line, plan half-breadth, section exponent), then each strake is its own strip pushed 14 mm out at its lower edge, with a step face at every lap (outside facing down, inside ledge facing up). Sheer rise 8 to 9 percent of length at the bow and 4 to 6 percent at the stern, raked stem (20 to 28 degrees), raked transom. Length to beam is 2.8 to 2.9 for the dinghy (BOATS.md asks for at least 2.8), 3.1 for the sailer and 2.9 for the work boat. T.

## Levels of detail, triangles and sizes
The tests count every triangle in the file including the mask and waterline lid (small). The first number is that count, rendered meshes are the same minus the mask and the waterline band (about 40 to 150 triangles).
| File | Triangles | KB |
|---|---|---|
| dinghy hero / live / far | 16,334 / 2,754 / 502 | 601 / 150 / 39 |
| sailer hero / live / far | 24,714 / 5,584 / 854 | 841 / 243 / 73 |
| work hero / live / far | 21,394 / 4,258 / 954 | 775 / 197 / 52 |
| wreck hero / live / far | 15,570 / 2,934 / 836 | 603 / 152 / 46 |
Set under `assets/boats`: about 3.7 MB with the report, under the 4 MB cap. Budgets in the test: hero 15,000 to 25,000 and under 1.5 MB, live 2,600 to 5,800 and under 400 KB, far 480 to 1,000 and under 100 KB. The live and far counts are a little outside the brief's rough 3 to 5 thousand and 600 to 900 for some boats (the small ones are lower, the sailer's live level is higher); the budget table says so honestly instead of padding.
Hero and live carry an atlas (hero 1024 x 1152 colour JPEG, normal and ORM at 512 x 576; live half of that). Far uses vertex colours sampled from a small bake of the same atlas.

## Textures and wear (baked, deterministic)
Planking bands are mapped by strake (u along the hull, s across the strake) and the wear is computed from the real height above the waterline: weathered paint with chips (concentrated at lap edges, the bow, the gunwale and the keel line), tar in every lap, plank butts, a replaced newer plank, rows of rivets with rust streaks, a pale boot-top band at the waterline with a hand-painted wavy edge, algae and weed in a band at the waterline, barnacles below, red antifoul. Inside: pale scrubbed wood, darker and wetter toward the bilge, salt bloom. Swatches for thwarts, floorboards, ribs, oars (with a painted blade end), rope (twisted), iron, leather, canvas with stitched panels, deck, cabin boards, crates, net, sacks, glass, barrel, sand and weed. The normal map carries laps, seams, grain, rivets and the paint edge; ORM carries occlusion in the laps, roughness and metal rivets. Wreck wear is 2.2 times the others.

## Node names, pivots, poses
Tree: `boat` (root) with `hull`, `hullmask`, `waterline`, `oar_l`, `oar_r`, `mast` (sailer; children `boom`, `sail`, `sail_furled`), `rudder_pin` (children `rudder`, `tiller`; sailer and work), `davit` (work), `seat_1` .. `seat_n`.
- `oar_l`, `oar_r`: pivot at the rowlock. The mesh is built in the rowing position, so pose `rowing` is nearly identity; the rest pose ships the oars along the thwarts.
- `mast` pivot at the step; `boom` pivot at the gooseneck; `sail` and `sail_furled` pivot on the mast axis at boom height (rotate about Z with the boom). `rudder_pin` pivot at the pintles (rotate about Z); `tiller` and `rudder` are its children. `davit` pivot at its base on the starboard gunwale.
- `seat_n`: empty markers at the thwart tops on the centre line (the hip point of a seated figure); dinghy and wreck 3, sailer 4, work 2. No crew exists yet.
- Poses (in the scene extras `poses`, and as one-keyframe clips `pose_rest`, `pose_sailing`, `pose_rowing`, `pose_beached`, `pose_working`): rest (oars shipped, sail furled, davit stowed), sailing (sail filled and boom out 26 degrees, furled sail hidden by scale 0.001, rudder 5 degrees, 7 degrees heel on the `boat` node), rowing (oars out in the rowlocks), beached (oars shipped, `boat` rolled 8 degrees; the wreck lies like this at rest), working (davit swung out 78 degrees). Loop clips: `row` (oars swing 14 degrees each way, 2.4 s) and `rudder_swing`.
- Frame in the file: glTF, +Y up, bow toward +Z, +X to port, metres, `y = 0` is the design waterline. `draft_m`, `freeboard_m`, `ground_y_when_beached` are in the scene extras.

## How the page will use them, the hullmask and the waterline
1. Load the live file, put the boat at its seed position and float it so that file `y = 0` lies on the sea height; pitch and roll from the wave slope as the page already does.
2. `hullmask`: a one-strip lid closing the opening just under the inwale (for the work boat only the open cockpit). Material `HullMask` is flagged `depthOnly`. Draw it after the opaque hull and before the sea with `colorWrite false, depthWrite true, depthTest true, renderOrder 1` exactly as BOATS_PASS.md describes; the sea plane then cannot show inside the hull. Keep the hull material free of the shore shader's swash foam (`uWet 0`), as `?boats=2` already does. The wreck's mask is a single degenerate triangle: it must not be used while beached (and a swamped boat should drop it).
3. `waterline`: a flat band at `y = 0` 5 cm wide just outside the hull, material `Waterline` (translucent): use it as the foam or contact ring or swap the material. Hide it when the boat is on land.
4. Per-boat colour variety: change the base colour factor or the seed in a later bake; the atlas has the wear baked in.
5. Beached: apply the `beached` pose, place the keel on the sand at `ground_y_when_beached` below the origin, hide the waterline.
6. The depth-only trick has been shown here as a Boolean hole in the sea plane cut along the waterline outline; the pictures are the proof that the interior reads dry.

## What is faked
Water is a plane (a transmissive plane with noise, not a simulation). The mask is a lid. Hull shape comes from four curves, not a fairing; there is no hydrostatics, draft and trim are values. Plank thickness is a constant lap step; plank butts, rivets and chips are texture. Ribs sit on the inner skin without notches. The sail is a smooth bilinear sheet with a belly and light flutter (no cloth). Poses are keyed node transforms, not physics. The sailing sail and the furled sail are two nodes (one hidden by scale) because the cloth shape differs. Ropes are tubes with a twist texture. The page-visible foam is the band mesh plus a shader the page owns.

## Gaps, ranked (honest)
1. The hull is smooth-shaded planking with a simple section: it reads as a real clinker boat at 3 to 10 m, but a plank-by-plank loft (garboard taper, hood ends, stealers) is missing; strakes simply taper with the hull.
2. Live and far levels are budget-driven and plainer; the sailer's live level is at the top of the budget, the dinghy's at the bottom. Far boats lose the laps (colour only).
3. No crew; seats are markers. No people-in-boat height check was done beyond the BOATS.md numbers.
4. Oars: no feathering clip; shipped oars rest slightly above the thwarts (no contact solving). Painter and ropes do not move.
5. The sail has no luffing or reefing clip; reef points hang straight.
6. Textures are 1024 x 1152 and the normal map half that, so the closest camera (under 1 m) will see soft grain; rivets are drawn, not modelled.
7. The work boat's cuddy interior is a dark box; no engine, no wheel, no lights.
8. The wreck's sand fill is a smooth heap; weed is five ribbons.
9. Page integration is done behind `&boatkit=1` (wiring section below); per-boat colour variants are not (one baked livery per boat).
10. The pictures use a transmissive sea plane with a Boolean hole; the page will use the depth lid, so the pictures show the look, not the page cost.

## Wiring into the page: `&boatkit=1` (24 Nov 2026)

Files: `boat_motion.js` (pure helper: heave, pitch and roll from five sea heights, oar stroke clock, sail trim and heel from the wind angle, rudder from the turn rate, level of detail with hysteresis; tests in `tests/boatkit-test.js`, node, 31 checks); `assets/boatkit/boats_live_b64.js` and `boats_far_b64.js` (outside `assets/boats`, whose 4 MB cap the model test checks) (the live and far GLBs as base64 classic scripts so that `file://` pages can read them, 1.0 MB and 0.29 MB, rebuilt by `tools/boats_b64.py`, a test checks they match the GLBs); `vendor/GLTFLoader.r128.js` (already vendored for the robots); the code block `bk*` in `islands_look.html` just before `buildBoats`. Page tests: `tests/boatkit-page-test.js` (playwright). Pictures: `tests/boatkit-render.js` writes `shots/boatkit-sheet.png` (labelled 2 x 3) and `shots/boatkit-1..3.png` (1200 x 800).

How it works
- `&boatkit=1` writes the three scripts into the page head (only then), implies `&boats=2` as the fallback, and parses the eight live and far GLBs asynchronously. When all eight are ready `buildBoats()` runs again with the kit; until then, and for good if any file is missing or fails to parse (`&boatkit=fail` and `&boatkit=bad` test both paths), the procedural boats of the boats pass stay and nothing is logged. Without the switch nothing is loaded: default hash 8d962c0c and 88,790 triangles are unchanged (the test checks it).
- Which boat is which: the first plain moored boat is the work boat (scale 0.75, 5.3 m), the old sailing boat is the sailer (0.85, 5.1 m) on a bigger circle (the old 4.6 m circle is kept only where no deeper circle of 6 to 14 m fits all round), the camp boat is the wreck (1.05), a dinghy (1.1, 4.4 m) rows a small circle beyond the jetty tip (kit only; skipped if no circle of deep water fits), any further plain moored boat in a world is a dinghy at its mooring, and the landing pass boat is a dinghy. Positions, yaw and the old orbit and arrival logic are reused (`b.sail` orbit; a per-boat angular rate `w` so a bigger circle keeps the same speed, 1.35 m/s for the sailer and 0.85 m/s for the dinghy); there are no arrival boats in the page to wire (the `&light=1` arrivals are pure data), so `&light=1`, `&clock=1`, `&mood=` and the night sky simply light the boats.
- Frame: the file's bow is +Z and its origin is the stern, so each boat is an outer group (page position, yaw, pitch, roll; `rotateZ` is the pitch, `rotateX` the roll, as the page already does) holding an inner group (yaw +90 degrees to put the bow on +x, page scale) holding the level's root moved by half the length. The file's `y = 0` waterline is put on the tide height plus a small bob.
- Levels: far (vertex colours) and live (atlas) are both in memory; only the one in use is in the scene, so nothing hidden is drawn or counted. By camera distance (`lodFor`, 12 percent hysteresis): high quality hero under 12 m, live under 90 m, far beyond; q=low live under 45 m and never hero; AR (`tier=ar`, or any `&clock=1&clockdome=0` page) live under 30 m and never hero. The default home view is 290 m away, so every boat there is far; zoomed in (the usual 40 to 80 m) they are live. Hero files are 0.6 to 0.9 MB each and have no base64 twin: they are fetched only over http(s), once, the first time a boat is within 30 m of the camera, and used under 12 m (a close-up). From `file://` the live level is the closest level.
- Sea: pitch, roll and heave come from five heights under the hull (`mcH`, the macro sea's own formula) through `floatMotion` with soft caps (heave 16 cm because the sea mesh itself is a flat plane, angles 8.6 degrees). Without `&macro=1` there is no CPU sea height, so the page's gentle bob stays (about 3 cm, 2 degrees). The sailer adds its heel (up to 12 degrees, to leeward, from the wind speed) and the work boat and dinghy only the sea motion.
- Oars: the dinghy's `oar_l` and `oar_r` are put in the `pose_rowing` rowlock positions read from the file's clips and swept about the vertical axis by 14 degrees each side of the 8 degree rest angle on a stroke clock (drive 40 percent, recovery 60 percent, blade dipped in the drive and lifted 11 degrees in the recovery); the stroke period follows the boat's speed over the ground (16 to 30 strokes a minute). Boats not rowing keep the oars shipped (`pose_rest`).
- Sail: the sailer takes `pose_sailing` (sail filled, furled sail hidden), then the boom and sail yaw follow `sailTrim(wind angle off the bow, wind speed)`: 8 degrees of sheet close hauled up to about 80 downwind, on the lee side, eased over 0.7 s so a gybe is never a jump, a small flutter (a faster one head to wind). The wind is the macro wind when `&macro=1` runs, else a steady 6.5 m/s from the west-south-west. The rudder follows the smoothed turn rate (1.6 degrees per 0.01 rad/s, capped at 14 degrees), so on its circle the rudder is held over a few degrees.
- The lid: the `hullmask` node of every level gets one shared depth-only material (colorWrite false, depthWrite true, depthTest true, renderOrder 1), the sea is renderOrder 5, the hull renders at 0: exactly BOATS_PASS.md's order. It is off for the wreck and for any boat on land (the landing dinghy turns it on when the tide floats it). `&nomask=1` is the debug switch that turns it off. The `waterline` node gets a translucent white material (0.42, renderOrder 6) as the foam line, and a soft dark ring (96 triangles, vertex alpha) lies on the water as a contact shadow.
- The wreck's berth is chosen by seed from the camp's shore: the lowest slope under a 4 m hull on ground 0.35 to 1.4 m above mean sea, not near the fire, the settlers or a tent, with some fall line to lie along, bow up the slope with a seeded turn of up to 0.4 rad. It lies along the slope (pitch up to 29 degrees, roll up to 17) with its keel 9 cm in the sand.
- Materials: the GLB's own PBR materials (MeshStandardMaterial with atlas, normal and occlusion/roughness maps), lit by the page's sun and hemisphere lights, shadow cast and received. They do not use the land shader, so the shore swash, caustics, frost and wet sheen of the moods do not touch them (a gain for the dry look, a gap for frost).

Numbers (software GL, headless; all from `tests/boatkit-page-test.js`)
| | triangles in the page |
|---|---|
| default page, no switch (gold) | 88,790 (hash 8d962c0c) |
| `&boats=2` for comparison | 92,432 |
| `&boatkit=1`, home view, high (all four boats far) | 91,344 (hidden levels are not in the scene) |
| the same with every boat at the live level (worst case) | 103,928 |
| `&boatkit=1&q=low`, far / all live | 63,306 / 75,890 |
| `post=0` | 91,344 (same meshes) |
| AR profile (`tier=ar`, low) | 63,334 |
| landing pass | 125,315 |
| world 153 / with `&life=1` | 57,153 / 76,770 |
| `&clock=1&light=1` / `&clock=1&mood=rainbow` / macro sea | 93,216 / 98,630 / 92,082 |

Rendered triangles per boat and level, with the lid and the waterline band (the sailer at live is 5,046 in use because the furled sail is hidden under sail, 5,670 with both sails): dinghy far 536, live 2,840; sailer far 864, live 5,670; work boat far 954, live 4,330; wreck far 836, live 2,934. Hero over http, measured in a close-up: work boat 21,530, dinghy 16,484. Draw calls: about 15 meshes per live boat (hull, lid, band, two oars, rig parts) plus the ring; far boats about 5. Every profile above has 0 console errors, including `&boatkit=fail` and `&boatkit=bad`, which fall back to the 92,432-triangle procedural boats.

The dry-hull proof (`tests/boatkit-page-test.js`, top-down on the dinghy, the sea fragment shader swapped for pure magenta so any water is unmistakable, same mesh, order and depth state): 8 of 8 reference points beside the boat are magenta, 0 of 81 points inside the hull are magenta with the lid, 6 of 81 are with `&nomask=1` (the floorboards and thwarts hide most of the rest, so the control is small but not zero).


What is faked
The sea mesh is flat, so heave is a capped offset and not a ride on the wave; the pitch and roll read the real macro sea at five points but the hull does not displace water, throw spray or leave a wake except the existing sailer wake. The mask is still a lid under the inwale. The sail trim is a table, not aerodynamics (no luffing physics, no reefing). Rudder and oar angles are keyed formulas, not forces. The wind of non-macro pages is a constant. The stroke has no feathering. Hero is a distance switch, not a cross-fade. The wreck's berth is a search of a 19 by 19 m patch, not a boat that was dragged there. The boats have no crew and no lights.

Gaps, ranked (honest)
1. The sea does not move under the boats (flat plane, no wake, no splash, no drips from the oars, no bow wave on the rowing dinghy): the hulls sit on the water rather than in it. The waterline foam band and the contact ring carry the contact, and they read at 8 to 15 m but not close up.
2. Hero is http-only and for the nearest boat only; from `file://` and in AR the closest picture is the live level (2.8 to 5.7 thousand triangles, 512 px atlas), which shows laps and rivets at 8 m but softens under 4 m. A base64 twin of the hero files would add about 4.9 MB to the page.
3. One baked livery per boat: no colour variants by seed, and the old white and red page boats are gone from the picture (the page's `hull` and `stripe` colours are ignored).
4. No night life: no navigation lights, no lit cuddy window, no lantern (the moored work boat is a dark shape at dusk; the light and clock layers cannot see it).
5. The wind-less pages (no `&macro=1`) have no sea pitch and roll beyond the old bob, and a constant wind for the sail.
6. The sailer's gybe is an eased swing through the centre line, not a real gybe with the sail passing over; it happens twice a lap on its circle. The sail does not luff on the tack.
7. The davit of the work boat is stowed and never works; the dinghy's second oar is hidden from some angles by the hull, as it should be, but oars never splash.
8. The wreck's berth can be a flat patch that no one would drag a boat to; it is not tied to a story (no tide line, no salvage hook to `&light=1` arrivals; the wreck of `light_range.js` is data only and still has no boat on the page).
9. Materials are not the land shader: no frost, no wet sheen, no caustics on the hulls; the fog of the weather pass reaches the boats only through the scene fog.
10. 1.3 MB of base64 script is parsed on start with the switch (about 0.1 s here); a binary fetch would be smaller but needs http.
