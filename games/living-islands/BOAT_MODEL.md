# BOAT_MODEL: the boat kit (24 Nov 2026, version 1)

Four original wooden boats of a cool Atlantic island coast as GLB files, built the way the collector robot was: a fixed script builds the geometry, bakes the textures and writes the files; a test checks them. Nothing here is a copy of a real boat plan; no maker names, no lettering. This is model files and pictures only: nothing is wired into the page yet.

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
9. Nothing is wired into `islands_look.html`; page integration, the `?boats=3` switch and the colour variants come later.
10. The pictures use a transmissive sea plane with a Boolean hole; the page will use the depth lid, so the pictures show the look, not the page cost.
