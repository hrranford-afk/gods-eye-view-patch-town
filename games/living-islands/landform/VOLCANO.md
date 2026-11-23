# Province D: the volcano island and its table-edge cutaway (Living Islands, branch citylab/cloud-islands)
Do not put real place names into game code or assets. Source note: `research/VOLCANIC_ISLAND_AND_CUTAWAY.md` (the 8 rules, the cutaway recipe, the mistakes list). Files: `world.py` (province D, section "PROVINCE D"), `rock3d.py` (interior), `cutaway.py` (bake), `volcano_checks.py` (realism numbers), `volcano_pics.py` (plan, section, sheet), `volcano/` (shipped bake: `height.f32`, `colour.png`, 4 x 2 wall PNGs, `manifest.json`, 1.4 MB), `../cutaway.html` (the page), `../tests/cutaway-shoot.js`, `tests/test_volcano.py`. Pictures: `shots/volcano-plan.png`, `volcano-section.png`, `volcano-cutaway-1..3.png`, `volcano-sheet.png`.
Run: `python3 landform/cutaway.py bake 100` (rebuilds `volcano/`), `python3 landform/volcano_checks.py 20 513 100` (table), `python3 landform/tests/test_volcano.py`, page: serve `games/living-islands` over http and open `cutaway.html` (`?q=low`, `?post=0`, `?clouds=0`).

## 1 Design in one paragraph
One height field again, 1536 m across at n = 513 (3 m cells), sea level 0. The window is a CUTAWAY, not a map of a whole island: the vent sits 4 to 9 m inside the SOUTH edge, so the south wall slices through the crater, the feeder conduit and the magma chamber; the island is larger than the window to the south and west, so those edges cut the lava stack too; the north and east edges are sea (water cut face with the sea floor, sediment, basement and crust). You walk or orbit round the cone to see the far side (the flatlands, the collapse scar, the coves). The field is computed 72 m beyond the window and cropped, so erosion has no edge artefacts and the cut is exactly straight.

## 2 Province D build (world.make_world_D), all numbers TUNING unless marked
| Step | What | Numbers |
|---|---|---|
| params | `_d_params(seed)` draws every structural choice (JSON-able, `w.volcano`) | land radius 560 to 660 m, summit target 215 to 270 m |
| old edifice | 1-D radial table by integrating a slope: gentle skirt, steeper middle flank, a flat-ish dome; lobed (+-8.5% radius noise) and stretched 1.3 to 1.5x to the north (the FLATLANDS: gentler, 2 to 5 deg) | skirt 2 to 8.5 deg, middle flank to 15 deg |
| sea floor | narrow shelf then a steep submarine flank that flattens: depth = 0.04 d + D tanh((d - shelf) s / D) | shelf 25 to 60 m, flank tan 0.62 to 0.82, floor 170 to 195 m (edge depth about 210 m) |
| caldera | ring wall, flat floor (noise), ring ridge, radius 0.30 to 0.36 R, depth 36 to 50 m, not round (10% radius noise) | wall about 45 deg in the diorama |
| collapse scar | sector of 60 to 80 deg opening to the sea, carved by at most 70 m, fading to nothing at the coast, plus a hummocky debris fan on the sea floor beyond | |
| young cone | off centre (vent offset from the caldera centre by 0.38 rc), concave profile h = Hc (1 - r/rb)^1.1, base re-fitted so the summit hits the target; crater bowl | design mean slope 21 to 25 deg; measured median after erosion about 31 to 37 deg (see section 4) |
| rift ridges | 2 to 3 arms from the vent in the northern half-plane (25 to 152 deg), ridge 9 to 17 m high, wavy; 16 to 29 small cones placed on the arms (spacing >= 42 m, 8 to 25 m tall, 30 to 60 m radius, crater dip, 30% breached downwind) | |
| barrancos | isotropic noise (170 m scale, 3.6 m) on the surface, then 32 iterations of D8 flow routing + stream power + thermal relaxation (`fluvial_D`): stochastic routing (no stripes), incision fades on flat ground, 4-direction thermal | ash erodes 1.5x, old lava 0.9x, cliffs 0.6x (rock table) |
| waves | the existing `wave_and_deposit` (3 rounds) for cliffs, benches and drift deposits | |
| lava flows and deltas | 3 to 6 flows traced by noisy steepest descent on the eroded surface, valley-filling 2 to 5 m thick, 10 to 26 m wide (x1.5 on slopes under 4 deg), lobed edges; where they reach the sea a lobed delta bench 1.6 m above the sea with a steep fringe; painted after erosion so they sit in the barrancos | |
| surface rock | seven new rock ids: basalt_fresh (cliffs, benches), basalt_weathered (old surface), scoria_red (cone tops, small cones), ash_soil (gentle lower slopes), lava_flow, black_sand (coves, barranco mouths, delta fringe), obsidian_pumice (pale patches on the lee cone) plus the existing cobble id for boulder beaches | |
| belts | by fractions of the summit height H with noise: coastal scrub 0 to 0.15 (+0.10 on the dry lee), woodland 0.15 to 0.40 only where moisture > 0.5 (windward), pine/birch 0.27 to 0.57, high scrub 0.54 to 0.80, bare lava 0.80 to 0.93, summit rock above. Moisture = 0.5 + 0.32 x windward position + 0.18 x aspect to the wind. Cool Atlantic palette (heather, birch scrub, bare rock) with the warm-version zone logic | |
Provinces A, B and C are untouched: the only shared-code changes append to the tables (rock ids 14 to 20, veg ids 13 to 19, `PROV['D']`, a dispatch in `make_world`, a `surface_colour` branch for D). `test_volcano.py` compares 12 world hashes (seeds 1122, 2001, 2101, 2201 x A, B, C at n = 257) with the ones recorded before the change: identical. `test_world.py` still passes 39 of 39.
Vertical exaggeration: summit 215 to 280 m on a land radius of 560 to 660 m. A real island with the reference ratio (3.7 km summit over 25 km radius = 0.15) would peak at about 0.15 x R = 85 to 100 m, so the diorama is 2.3 to 3.2 times taller than true (median 2.8). The page prints this number. In AR keep any extra vertical exaggeration at 1.0 (do not stack).
Timing (this machine, one process, other jobs running): n = 513 world 7.3 to 11.6 s (median 8.5 s; erosion 4 s, classification 1 s); n = 257 about 2 s; walls 2.5 to 3.5 s each; full bake about 22 s.

## 3 Interior: rock3d.rock(x, y, z) (vectorised numpy, 2 M samples about 2.5 s)
Material ids: air, sea, soil, lava beds, ash and tuff, scoria, old basement, oceanic crust, sea-floor sediment, dike pale, magma, feeder conduit, baked contact rock, hydrothermal, fresh-water lens, caldera fill, young lava flow, dike dark.
* Beds follow the OLD surface (`h_shield`, kept from the build), so they dip away from the vent and are steeper near the summit; thickness 6 to 14 m (thinner near the vent), wobbled by a 3-D sine field so beds are lens-shaped; bed type by a hash of the bed index with ash and scoria more likely near the cone; red bole line on top of lava beds.
* The young pile (cone, ash, flows) above the old surface has beds parallel to the PRESENT surface, 3 to 6 m. Young flows are a separate slab where the surface has a flow; a 1 to 1.6 m soil strip tops the land.
* Caldera: ring faults dip inward with depth, drop the stack by `dcol` (caldera depth + 10 to 16 m), and the dropped block is capped by flat fill beds (`kind` 2); the fault is drawn as a dark line.
* 30 dikes (thin tilted planes through the conduit region, denser along the rift azimuths, tapering, 1 to 2.6 m, pale or dark) cut the beds; 2 to 4 sills (flat slabs, 2 to 3 m).
* Feeder conduit: wavy pipe 13 to 17 m radius from the chamber to the crater, magma-orange up to 55% of the way, dark-red plug above; deep feeder pipe below the chamber to the base; hydrothermal halo (yellow-green, patchy) within 40 m of the conduit above the chamber.
* Chamber: flat ellipsoid, semi-axes about 110 x 100 x 27 m, centre 48 to 62 m below sea level (about 300 m below the summit in the diorama, which is 1 to 2 km scaled by the 1 m = 15 m vertical rule), baked contact aureole 1.35x, flat orange with a lighter core.
* Crust (dark blue-grey) at the base, thin sea-floor sediment (3 to 15 m, thicker at the foot of the flank and under the scar), old basement darker below a depth that grows with the surface height.
* Fresh water lens, Ghyben-Herzberg: base depth = 40 x head, head from the world's smoothed land mask (max 1.0 to 1.5 m, so a lens up to 40 to 60 m thick), zero at the shore, pale cyan blended over the beds. The tide line is a flag at |z| < 0.9.

## 4 Realism numbers (20 D seeds, n = 513, seeds 100, 107, ... 233; `out/checks_D_20seeds.txt`)
Status column: IN BAND = measured inside the band in at least 80% of worlds; every BAND is TUNING (the research note gives qualitative rules and real-volcano figures, not diorama numbers), so "verified" here means "measured on the field", not "verified against a real island". Items marked TUNING NEEDED are the honest misses.
| metric | band | median [min..max] | in band | status |
|---|---|---|---|---|
| summit height m | 200 to 280 | 265.7 [219.0..281.9] | 90% | IN BAND (two worlds slightly over 280: erosion and the rift ridge add to the target) |
| vertical exaggeration x | 2.0 to 3.2 | 2.78 [2.26..3.17] | 100% | IN BAND |
| skirt slope median deg (outside the cone, 0.62 to 0.95 R) | 3 to 12 | 6.2 [2.6..7.3] | 85% | IN BAND |
| young cone slope median deg (caldera wall excluded) | 20 to 35 | 33.9 [30.8..37.5] | 65% | TUNING NEEDED: the design slope is 21 to 25 deg but gully walls (35 deg thermal cap) raise the measured median; 7 of 20 worlds above 35 |
| small cones | 12 to 30 | 16.5 [11..24] | 95% | IN BAND |
| barrancos per 360 deg (valleys deeper than 4 m crossing 0.45 and 0.60 R) | 8 to 30 | 13.9 [8.9..20.8] | 100% | IN BAND |
| shoreline to the -50 m contour m | 20 to 160 | 85 [60..201] | 95% | IN BAND (narrow shelf) |
| black sand share of shore | 0.02 to 0.35 | 0.18 [0.02..0.33] | 95% | IN BAND |
| boulder beach share | 0 to 0.30 | 0.03 [0..0.13] | 100% | IN BAND (low: exposed gentle shore is rare) |
| rock cliff / bench share | 0.35 to 0.95 | 0.78 [0.58..0.89] | 100% | IN BAND |
| flows reaching the sea | 1 to 9 | 1 [0..4] | 85% | IN BAND (3 worlds have no delta) |
| altitude belts present | 4 to 6 | 6 [6..6] | 100% | IN BAND |
| moisture west minus east | above 0.05 | 0.53 | 100% | IN BAND (by construction of the rule) |
| time n = 513 s | under 15 | 8.5 [7.3..11.6] | 100% | IN BAND |
Slope histograms by zone are in `volcano_checks.measure_D` (skirt, cone). The shipped world is seed 100 (summit 237 m, VE 2.5).

## 5 The cutaway bake (cutaway.py)
Four wall textures, 2048 x 1024 (desktop) and 1024 x 512 (handheld / AR tier), looking at the block from outside (S: west to east, E: south to north, N: east to west, W: north to south), flat lighting, standard block-diagram colours, thin dark lines at bed boundaries (darker at contacts, unconformities and ring faults), a dark-blue tide stripe at z = 0, lens blended pale cyan, 4 px edge padding, the colour above the profile is the topmost rock of the column (mip bleed harmless). Palette-quantised PNG: the front wall is 100 to 150 kB. `height.f32` (Float32 little endian, 1.05 MB, row 0 south) and `colour.png` (surface colour of the field, north row first) feed the page. `manifest.json` has the wall directions and origins, z range (-256 to 290 m), legend, vent, chamber and exaggeration. An optional arbitrary vertical slice strip is `cutaway.slice_strip` (and `python3 cutaway.py slice`, 9 W-E strips): not used by the page yet.

## 6 The page (cutaway.html)
three.js r128 global from the pinned cdnjs URL, no build step. Terrain from the heightfield (vertex colours from the rock table's surface colour, sea floor tinted by depth); four wall strips whose top vertices ARE the terrain edge vertices (so the cut is exactly straight; `__cv.edgeCheck()` reports a maximum difference of 0 over 2052 samples), UV to the wall textures, down to a flat base and a plinth; a translucent animated sea (shader: cyan to deep blue by depth, waves fading to 0 at the block edges, foam on shallows) and water cut faces (depth gradient, a dark stripe at mean sea level, a bright top edge) that follow the tide uniform; black LineSegments outline; own orbit controls (drag, wheel, pinch, two-finger pan, arrow keys; the camera goes all the way round and stays above the ground); tide slider (+-1.1 m); quality switch (Low: 257 x 257 terrain, 1024 walls; High: 513 x 513 = 524k triangles, 2048 walls); a vertical exaggeration readout; `?post=0` (no tone mapping, no antialias, pixel ratio 1; nothing in the page is screen-space either way); the volcano's own cloud (`?clouds=0` turns it off; default on): three canvas-noise planes at 0.26, 0.33 and 0.40 H, a clear lee wedge widening downwind of the summit, thicker on the windward side, the summit standing above the deck. Test hooks: `window.__cv` (`setView`, `setTide`, `setQuality`, `edgeCheck`, `stats`).
Not done: the clipping-plane SLICE tool (stretch goal; the baked strips exist but nothing uses them).

## 7 What is faked
Height 2.3 to 3.2x taller than true; horizontal 30 to 50x shrunk; one erosion pass makes barrancos in "no time"; the cone, the flows and the old shield all coexist with no ages; slopes are steeper than real; rock is 18 flat colours and a hash for bed type, not chemistry; dikes are planes, the chamber is an ellipsoid, the conduit a wavy pipe; the lens is the 40 x rule with a sharp base; walls are baked paint with a texel size of 0.75 m; the sea is a clear slab with a shader (no refraction); the cloud deck is three textured planes (no physics, no shadows); the section is one straight cut; obsidian shares the pumice id and colour; lava delta collapse and littoral cones are not modelled.

## 8 How it connects
* Sea state: `w.exposure` (fetch rays from the wave direction, 16 bearings) is already in the D world; `w.volcano['wave_from']` and `['wind_from']` set the wind shadow side. The cone's lee wedge is where `CLOUD_PHYSICS_FOR_VISUALS.md` wants calm dark water 3 to 8 island heights downwind (about 800 to 2000 m: beyond the window, so only the first part shows); the corner speed-up (x1.3 to 1.5 at the flanks) is not yet applied to the sea shader.
* Sediment: rock ids black_sand, cobble, lava_flow and the delta fringe give the `SEDIMENT_PHYSICS` grain classes; `w.delta` marks fresh delta benches (unstable: no building); barranco mouths (`acc` > threshold) are the sand sources.
* Wildlife and landing: `w.landing_candidates`, `w.islands`, the coves (black sand, low exposure), boulder beaches (rowboat only), the lee coves; veg belts give the habitat rows (seabirds on the cliffs, seals on the black-sand coves).
* Cloud layers: the deck at 0.25 to 0.4 H pierced by the summit is the deliberate exception in `CLOUD_PHYSICS_FOR_VISUALS.md` (a tall mountain pierces the deck); the small-island world keeps its 150 to 300 m fog bases.
* Look match: the page uses ACES at 1.05 with Lambert and one sun; walls and water ignore tone mapping so the block-diagram colours read true. The Filmic fit of `BAKE_BRIDGE.md` is not applied.
* Fresh water: `rock3d` lens thickness (40 x head) gives well depth; springs would sit where the lens meets a dike or a flow contact (not computed).

## 9 What a Blender render would add
The `blender/landform_scene.py` path can take the D window (`island_window` with a 1536 m size) and the same wall textures on extruded edge loops with Closest interpolation and emission-only materials; it would add true soft shadows and AO inside the barrancos and the caldera, volumetric sea absorption (the depth gradient for free), the cloud deck as real volume with the cone piercing it, and Freestyle outlines. About 4 to 5 minutes per 1200 x 800 frame at 64 samples (the island heroes' figure, not measured for D).

## 10 Ranked gaps
1. Cone slope median is above the 20 to 35 band in 7 of 20 worlds (gullies steepen the cone); the valleys read dendritic rather than a few deep radial barrancos; no V to U change with distance.
2. The flatlands are bland: smooth noise swells, no old eroded cones, no plateaus, very few lakes; belts are mostly one colour because 70% of the land is below 0.15 H (true to the fractions, dull to look at).
3. The slice tool is not built; the E and N walls show only sea-floor strata (the vent is at the south wall), so only two walls (S and W) show the stack.
4. Lava flows are thin sausages with a few lobes, they follow barrancos but do not branch; deltas are lobed discs.
5. The cone is smooth-shaded vertex colour with no shadows or AO; the page has no Filmic fit.
6. Collapse scar is a sector carve, not a horseshoe with a talus apron; the debris fan is a bump.
7. The lens is a pale blue band across the whole island (flat top at the sea line): reads as water more than as a lens shape; head is smoothed land mask, not a flow solution.
8. n = 1025 not run (4x per iteration, expected 30 s or more); the page needs a network for three.js unless a local copy is routed in.
9. Not tested on a device; the AR path (`?post=0`, `q=low`) is only a software-GL screenshot test.
