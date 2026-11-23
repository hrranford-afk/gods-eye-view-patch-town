# Life view: the first animals and robots in the live page (task 22, branch citylab/cloud-islands)

`islands_look.html?world=NNN&life=1` draws the first life on the twelve exported landform worlds: grey and harbour seals hauled out on the shore, gannets gliding and plunge-diving, puffins and colony birds, kelp, fish shoals under the surface, and one to three beach collector robots with a fixed routine and a trail of track prints. Without `&life=1` nothing changes: default page hash `8d962c0c`, 88,790 triangles, no extra script loaded, no `__li.life` (tested; `look`, `landing`, `sea`, `flow`, `seabed`, `weather`, `boats`, `macro-wire`, `macro-sea` and `world-view` suites unchanged).
Confidence tags as in `RESEARCH_FIRST.md`: VERIFIED = measured by a test in this commit; PLAUSIBLE = reasoned, not measured; TUNING = my choice; UNVERIFIED = not checked.
Gate (`RESEARCH_FIRST.md`): the look and motion note is `research/ANIMALS_LOOK_AND_MOTION.md` (first slice of five, tier budgets, shader formulas, exaggeration); numbers in it are TUNING there too. Animals are counted, not tracked; robots are fixed routines with no speech; nothing gory; no danger is drawn.

## What was built
| file | what |
|---|---|
| `landform/export_life.py` | numpy only, deterministic. For each of the 12 world seeds: re-makes the tool world (the same call as `export_world.py`), runs `ecosystem/wildlife_place.py` and `ecosystem/shore_catch.py`, keeps what is in the 256 m window and writes `landform/worlds/seedNNNN/life.json` (and `life.js`, the same text in a classic script so `file://` works). `python3 landform/export_life.py check` re-derives all 12 and compares byte for byte. About 35 s. |
| `animals.js` | loaded only with `&life=1`. The five animals, the disturbance API, the tier caps. |
| `robots.js` | loaded only with `&life=1`. Loads the committed collector GLB, places 1 to 3 robots, plays the routine, stamps track prints. |
| `vendor/GLTFLoader.r128.js` | the GLTFLoader of three.js r128 (npm `three@0.128.0`, `examples/js/loaders/GLTFLoader.js`), unchanged under an MIT licence header. The page's own three.js is r128 from the CDN, so the loader matches. |
| `assets/collector/collector_live_b64.js` | `collector_live.glb` (325 KB) as base64 in a classic script (444 KB), so the model loads from `file://` and from a server by the same path. The hero GLB (1.35 MB) is not loaded: see gaps. |
| `islands_look.html` | seven small edits, all behind the `LIFE` flag: one loader line, the flag, one call in `build()`, one in `frame()`, `__li.life`, and two options (`&tier=`, `&robots=0`). |
| `tests/life-test.js`, `tests/life-render.js` | the checks and the pictures (below). `lab_index.html` has a "life" link beside each of the 12 worlds. |

## life.json (what the page is told)
Page coordinates (x east, z south, metres from the window centre), counts and sites only; nothing is an individual.
- `seals`: haul-out sites. The ecosystem rule of `wildlife_place.py` (a low flat top that dries at low tide, deep water within 100 m: height between sea minus tide range and +3 m, slope under 0.5), cut to what a picture needs: within 8 m of open water, not woodland or scrub, 40 m from the page landing (the village), at least 20 m2 (WILDLIFE.md section 11), and a long shore apron cut into 24 m blocks (one haul-out is a place a group fills, not a whole coast). Per site: centre, a principal-axis ellipse (`a1`, `a2`, `rot`), `n` seals now (the ecosystem's `seal_count` for November, full trust, low tide, with the village-lane disturbance), `pups` (18 percent of a grey haul-out, TUNING), `capacity` (area / 4 m2), kind (grey, or common where exposure is under 0.25), `D` (disturbance 0 to 1), `eco` (an ecosystem site lies within 15 m).
- `colonies`: skerry-top colonies from the ecosystem (gannet, tern, gull; pairs for a June look), minus those within 62 m of the landing.
- `puffins`: turf and pasture within 25 m of the coast and 3 m or more over the sea (made here from the veg and height maps; the ecosystem only counts the area), up to 5 sites, pairs from the ecosystem's puffin density 0.15 per m2 times 0.25 usable.
- `kelp`: up to 110 patch centres on a jittered 7 m grid, hard bed 1 to 10 m deep within 150 m of land (the kelp rule of the ecosystem), thinned by a seeded smooth field so beds have edges; shuffled so any prefix is an even thinning.
- `shoals`: up to 4 shoal cells (index 0 to 1, depth, radius). The ecosystem has no shoal engine; the index is made here from the rule in WILDLIFE.md section 6 as far as the world has the inputs: 3 to 16 m of water, 10 to 80 m off land, more over a steep bed (a front), more near kelp, a little less in deeper water, times a seeded smooth field.
- `robots`: up to 5 beach sites (the first 1 to 3 are `use`), each with a shore path (two end points along the shore, up to 18 m), the shore normal, the beach kind, and the recipe of `blender/robot_recipe.py` for seed `10 * world + i + 2`: role, palette name and paint colours, lamp code and colours, scale, drive, quirks, age.

## What is drawn (and how)
All meshes are indexed, flat or smooth shaded vertex colour in linear space (like the page's props), shared per kind and drawn with `InstancedMesh` (one call per kind per pose), `frustumCulled = false` because the instances are spread over the window. Motion is in the vertex shader (`onBeforeCompile` on a Lambert material, a time uniform and per-instance `aPhase`, `aParam`, `aAmp` so nothing moves in sync) or an analytic function of the clock, so a frozen clock repeats a picture (`__li.life.setTime(t)`).
| animal | mesh (desk / low) | motion | exaggeration E |
|---|---|---|---|
| grey and harbour seals | lofted body with flat belly, 3 pose variants (banana, head-up alert, flat) of 252 / about 80 triangles, a far blob of 60 | breathing hump in the shader (period 5 s), a travelling hump while shuffling; slip into the sea and vanish when disturbed | 2.0 (pups half size, pale) |
| gannets (flying) | one mesh with both wings, aW = span fraction: about 114 / 62 triangles | wing flap in the shader (2.7 Hz bursts over a 0.07 glide), a periodic plunge dive with the wings folded back, a splash crown | 2.0 |
| gannets, terns, gulls (colony) | standing bird, about 130 / 50 triangles | slots on the skerry top; tern and gull are tints and scales of the same mesh | 2.0 |
| puffins | standing bird with a banded bill, a variant with sand eels in the bill; flying variant of the gannet builder | perched shiver; racetracks out over the water with 8 Hz wings | 2.4 |
| kelp | 16 frond ribbons in three clumps, 96 / 48 triangles | sway in the shader (swell period 7 s plus a faster ripple); height follows the tide | 1.5 to 2.2 footprint, height 1 to 5 m from the water depth |
| fish | 20 / 14 triangles, a spindle with a tail | body sine in the shader (4.2 Hz); each shoal is a swirl round a drifting centre | 3.0 |
| collector robots | the committed `collector_live.glb` (3,780 triangles each) | clips `arm_unfold`, `arm_stow`, `head_tilt`, `lamp_blink` (lamp_dome scaled), `sun_open` / `sun_close` at midday, sampled by hand from the file's own tracks | 1.8 |
Things under the sea are drawn after the sea as transparent objects that fade and turn blue with their depth: the page's sea alpha is `1 - 0.95 exp(-3.2 d)`, so an opaque fish half a metre down would be 80 percent hidden whatever its colour. Kelp tops and fish are therefore visible in the top two or three metres only (that is the look; it is not a bug).

### Seals (rule: counted slots, never tracked)
Each site gets slots by dart throwing inside its ellipse (spacing 1.4 E, ground slope under 0.5, dry at tide 0.12, highest slot first, so the lowest leave first when the tide rises); `n` seals are put in the first `n` slots (fewer if the site is too small: the drawn number is `min(n, slots)`, listed in `life.sites()`). Each tier draws the nearest `near` seals with the full mesh (inside 130 m) and the next `far` with a 60-triangle blob; the rest are not drawn. A seal that is under the tide, or whose site is disturbed, slides head first along the shortest way to open water, sinks and vanishes (2 to 3.5 s) and comes back when the cause is gone (7 s). Camera eye or a boat within `FLEE_M` = 12 m makes seals slip away; within `ALERT_M` = 26 m they raise their heads (pose swap). Distances are real metres, not exaggerated.
`window.__li.life.setDisturbance(siteId, level)` is the hook for the rubbish rule: level above 0.5 makes the site leave, below 0.4 lets it return (a little hysteresis); `siteId` is the `id` in `life.json` `seals`, or `'all'`. `life.sites()` returns `{id, x, z, n, slots, gone, visible}` per site; `life.sealsVisible()` the number on shore; `life.advance(seconds)` steps the simulation without drawing (tests).

### Gannets
Each flyer circles a colony (or the open water of the window when it has none: gannets are wide-ranging) at 34 to 68 m radius, 9 to 21 m up, 5 to 7 m/s (real gannets cruise faster; slowed so the table is readable, TUNING). Every 34 to 56 s a dive happens (7 s): climb 4 m with flapping, fold the wings back (`aParam`), fall on the shoal's own centre at the middle of the dive (so the fish are under the splash), enter the water at the surface, go under (hidden by the sea within half a metre), come up and rejoin the circle. A splash crown (12 spikes on a foam ring) rises and collapses. Position and pose are a function of the clock only.

### Robots
One to three per world at the `use` beach sites of `life.json`. A site that collides with the page's own houses, tents, camp, jetty, rocks or trees is moved along the shore and up the beach in steps until it is clear. The routine is a 70 s cycle: drive along the shore path (0.55 m/s real, 18 s a leg), stop, `arm_unfold` (3.6 s, lamp turns the recipe's "found" colour), hold, `arm_stow`, `head_tilt`, drive back, and (only when the sun is high, sun elevation above 30 degrees) face the sea and `sun_open` for 12 s then `sun_close`. The lamp blinks (clip `lamp_blink`) while it searches. When the tide covers the beach under the path the robot waits further up the beach (the path shifts inland). Behind a driving robot a strip of track prints (two tread bands with a chevron cleat pattern, 150 quads per robot, drawn on the ground) is stamped every 0.55 m; each print fades after a seeded erase time (80 to 160 s).
Recipe tint: the committed model is the sage tortoise, so a role's body plan is NOT rebuilt. Instead the fragment shader takes texels that are sage (green above red and blue) and re-colours them with the recipe's paint, keeping the baked brightness (so wear and rust stay), and the orange arm takes the recipe's accent. This is cheap and reads in pictures (world 174's hauler is ochre) but it is a tint, not a different machine; all roles share the tortoise body.

## Numbers
| item | value | tag |
|---|---|---|
| default page | hash `8d962c0c`, 88,790 triangles, 0 errors, no life script loaded | VERIFIED (life-test, look-test) |
| life.json | 12 files, 52,813 bytes in total (limit 200,000); each 2.6 to 6.3 KB; reproduced byte for byte by `export_life.py check` | VERIFIED |
| animal triangles drawn, worst of 5 or 6 views per world (home, two haul-outs, a colony, a kelp patch) | desk: 7,879 (world 1) to 17,411 (world 23); handheld low: 1,967 to 4,529; `&tier=hhhi` 11,288, `&tier=ar` 3,312 (world 153) | VERIFIED |
| tier allowances (all animals) | desk 25,000; handheld high 15,000; handheld low 9,000; AR 6,000. Capacity (the most the caps could ever draw): desk 23,770; hhhi 14,920 (15,310 before its caps were trimmed; re-checked in the quick run); low 5,300; AR 3,965 | VERIFIED (budget and drawn counts) |
| whole scene with life, high | 62,139 (world 147) to 140,445 (world 2, three robots) triangles (limit 150,000); each robot adds 3,780 plus 300 of track prints | VERIFIED |
| life layer build + first frame | not timed separately; the page build stays under a second in software GL | UNVERIFIED |
| fps on a handheld | not measured | UNVERIFIED |
| exaggeration E | seal 2.0, gannet 2.0, puffin 2.4, fish 3.0, robot 1.8 (research note: 2 to 3) | TUNING |
| flee 12 m, alert 26 m, seals leave in 2 to 3.5 s and return in 7 s | | TUNING (the research note's 150 m is the ecosystem's disturbance radius for the rubbish rule, not the flee distance) |
| gannet speed 5 to 7 m/s, dive 7 s every 34 to 56 s, flap 2.7 Hz; puffin flutter 8 Hz; breathing 5 s; kelp swell 7 s; fish 4.2 Hz | | TUNING |
| pups 18 percent of a grey haul-out in November; capacity area / 4 m2; cap 300 | | TUNING (from `wildlife_place.py`) |

## What is faked
- Proportions are low-poly caricatures: the seal is a lofted tube with a head bump, the gannet a cigar with swept ribbons, the puffin an egg with a banded wedge, the heron-like "standing bird" legs are one flat triangle (no legs at all: the research note's "heron-like proportions" for the standing birds are what a body, a neck and a head give). Kelp is ribbons, not blades with a holdfast. The fish are spindles.
- Colour is vertex colour with per-vertex hash noise for blotches (no atlas, no normal map); seals read as brown and grey shapes, not as spotted coats.
- All motion periods are tuned by eye (see the table above), not measured from film.
- The seal count is `min(n, slots)` per site, and `n` comes from the November rule at low tide, not from a tide-by-day simulation; the far mass (the seals that do not fit the cap, or the ground) is not drawn as a texture smear.
- The ecosystem has no shoal engine and no cliff-top puffin layer; both are made in `export_life.py` from the maps (flagged above). Gannet "ledges" are skerry tops (the ecosystem's colonies), not cliff ledges; worlds with no gannet colony in the window (147, 174, the volcanic three) have only passing gannets.
- Robots all share the committed tortoise body and the sage palette is tinted; roles change colour and lamp code only.
- Things under the sea fade over the page's opaque sea instead of being seen through it.
- Weather: the animals do not take the weather pass's tint or snow (they use their own Lambert material), so with `&weather=` they look the same in a storm.

## How the hardware could export more life.json
1. Add `(province, seed)` to `WORLDS` in `landform/export_world.py` and export the world (`WORLD_VIEW.md`), then `python3 landform/export_life.py` (35 s for 12 worlds, numpy only). It writes `life.json` and `life.js` beside each `world.bin`; the page needs no change.
2. More animals of the same kinds: raise `SEAL_SITES_MAX`, `KELP_MAX`, `SHOAL_MAX`, `PUFFIN_SITES_MAX`, `ROBOT_CANDIDATES` in `export_life.py` (the tier caps in `animals.js` decide what is drawn), or lower `RELAX_MIN_FLAT_M2` for smaller groups.
3. A real shoal or tide-by-day count: replace `shoal_block` by the ecosystem's engine when one exists, or write `n` per site per day into `life.json` (the page reads `n` once at build; `setDisturbance` is the only run-time hook).
4. A worker order for the `ecosystem/` side only needs to keep `place_wildlife(w, segs, village, seed)` and `seal_count(site, month, fidelity, tide_low)` stable.

## Tests (`tests/life-test.js`, `tests/life-render.js`)
`NODE_PATH=$(npm root -g) node games/living-islands/tests/life-test.js [quick=1]`: files (12 life.json, under 200 KB, the exporter reproduces them); default page unchanged and the world page without the switch loads no life script; for every world with `&life=1` 0 console errors in default, `?q=low` and `?post=0`; animals' triangles under the allowance at 6 views per world (desk 25k, low 9k) and the capacity under the allowance; whole scene under 150k at high; life placement hash identical on reload and with other clocks (`seat`, `auto`) and different between worlds; placement sanity (seals on the ground and not under the tide, colony birds and puffins on the terrain at 1.1 m or more, kelp rooted on the bed, fish under the surface and above the bed, gannets between 2.3 m under the sea and 45 m through two full cycles with dives and splashes, robots on gentle ground above the tide); the disturbance API (a site leaves and comes back, `'all'`, the camera at 9 m makes seals leave and they return); robots (1 to 3, they drive, play `arm_unfold`, `arm_stow`, `head_tilt` and `sun_open`, stamp prints); the full stack (`flow`, `seabed`, `weather`, `macro`, `boats=2`) stays under 150k with 0 errors. `life-render.js` writes the pictures.
Full run (12 worlds): 99 PASS, 0 FAIL, including 0 console errors for all 12 worlds in default, `?q=low` and `?post=0`, the exporter reproducing all 12 files, and the placement hash identical on reload and with other clocks. `look-test.js` (hash 8d962c0c, 88,790 triangles) and `world-view-test.js` (59 PASS) pass with the new code in the tree. The other suites were not re-run (the edits are behind the flag).

## Pictures
`shots/life-sheet.png` (12 worlds with life, numbered and labelled, frozen clocks), `shots/life-1.png` (a haul-out on the black-sand coast of volcanic world 5), `life-2.png` (a gannet plunging into a shoal, world 153), `life-3.png` (the hauler robot of world 174 on a beach with its track prints), `life-4.png` (kelp and a fish shoal off the coast of world 5). Frozen sea clock `seat=3`, sun 40/-65, tide +0.15, life clock frozen.
Iterations on the weakest (at least three, each looked at):
1. Seals stood among the houses and, in a volcanic world, were invisible: the ecosystem's haul-out rule accepts any low flat land by the sea, including meadow at the village, and a 150 m coast was one "site" whose centre lay in the water. Now shore only (8 m from water, not woodland, 40 m from the landing) and aprons cut into 24 m blocks. Seals also were leaf-shaped blobs close up (far mesh used near), pale, and the alert pose stood them up like cones: far mesh 60 triangles, near cap 12, darker coat, head lifted 0.19 instead of 0.34.
2. Fish and kelp did not show at all, then as pale slabs: a NaN depth (the shoal had no depth) and the page's opaque sea. Now drawn after the sea with depth fade, dark olive ribbons, shoals gather near kelp. The splash was a flat translucent octagon, then a milky disc: now a crown of spikes on a narrow foam ring.
3. The robot picture looked along a slope from below the beach and showed sand only: camera now behind and above the robot (elevation 0.95), tracks visible. Robots clashed with houses or seals (one world had none): sites move along the shore, with a fallback so every world has one.
4. Colony birds had heads floating off the body and spiky wings: neck added, folded wings flat.
Still weak: the seals are brown shapes without spots, the kelp reads as sticks, the splash is stylised, gannet fold looks like a paper dart, the sheet shows life only as white specks at that distance.

## Gaps, ranked
1. Looks: seals have no coat pattern and are not tilted to the ground in roll; the standing birds have no legs; kelp is sparse ribbons; every robot is the tortoise body (tinted).
2. Real-device speed is unmeasured (software GL only). In software GL the robot GLB takes 20 to 60 s to parse and upload, so robots appear late; the hero GLB (1.35 MB) is not loaded.
3. Seals: drawn number is `min(n, slots)` (a 300-seal haul-out draws about 30), the far mass is not drawn; only seals react to `setDisturbance`; the count is read once at build, not by day and tide.
4. Things under the sea are visible only in the top 2 to 3 m; sun glare at low camera angles hides them.
5. Shoals and puffin turf are made in the exporter, not by the ecosystem; no cliff-ledge gannets; worlds 147, 174 and the volcanic three have no gannet colony.
6. Animals ignore the weather pass; boats scare seals only through the page's own boat list (real distance 12 m).
7. The sheet's distance (215 m) makes animals specks; the four larger pictures carry the look.
