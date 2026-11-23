# World view: the live page draws a different island group per seed (task 9, branch citylab/cloud-islands)

`islands_look.html?world=NNN` draws one exported world of the land formation tool (`landform/world.py`) instead of the six hand-placed islands. Twelve worlds are exported; the picker is `lab_index.html` and an on-page selector (top bar, only with the switch). Without `?world` nothing changes: default hash `8d962c0c`, 88,790 triangles, no `__li.world` (tested, and `look`, `landing`, `sea`, `flow`, `seabed`, `weather`, `boats`, `macro-wire`, `macro-sea` suites still pass).
Confidence tags: VERIFIED = measured by a test in this commit; PLAUSIBLE = reasoned, not measured; TUNING = my choice; UNVERIFIED = not checked.

## What was built
- `landform/export_world.py` (numpy only). Per seed: a 256 m window (D: 258 m) of the tool's n=257 field (2 m cells), centred on the start island, as `landform/worlds/seedNNNN/world.bin` (height int16 1/256 m, rock id, vegetation class, shore class, exposure, wetness, bed hardness; 133 kB), `manifest.json` (island table, start landing and normal, tool landing candidates, shore segments from `ecosystem/shore_catch.py`, rock colours, hashes, label) and `world.js` (the same bytes as base64 in a classic script, so the page loads from `file://` and from a server). `worlds/index.json|js` lists them. `python3 landform/export_world.py check` re-derives all 12 and compares the sha (VERIFIED, bit for bit).
- The 12 worlds: gneiss 153, 147, 62; sandstone 139, 23, 174; basalt 56, 99, 106 (the first three of each province in `foundry/seeds/shortlist.json` that pass the start rules on the current `world.py`; start island, landing and rules from `foundry/lfmetrics.start_island`); volcanic 1, 2, 5 (no foundry entry: the window is put on the best gentle landing of the cone, seeds picked by eye; seed 3 was dropped for a flat artefact box). Total 3.4 MB for the folder including the base64 copies (VERIFIED, test limit 6 MB).
- `world_view.js` (loaded only with the switch): bicubic height `H(x,z)` (the last 16 m before the table edge sink to deep water so no land is cut by the wall), terrain colour from the maps (veg class, shore class, the tool's rock colours, page tide zoning, noise, dirt round pads), content placement, and the seabed adapter.
- `islands_look.html` edits, all behind `WORLD`: table radius 122 and height texture 256 m (`TS=128`), sea shaders patched for the new `TS` and rim, `baseH` reads the world, `placeWorld` calls `WV.place`, terrain mesh at 2x the cell size, camera home and limits scaled, flow field cut-off scaled (`max(3600, (3.6a)^2)`, identical for the default islands) and flotsam spawn radius scaled, island list for flow, gulls and weather made from the world's largest islands, seed selector and `__li.world`.
- Content from the maps: trees by vegetation class, province, exposure, slope and a copse noise (`LI_KIT` conifer, broadleaf, shrub, tuft, rock, the same builders as the default page); rocks on the shore band and steep ledges; jetty at the start landing, out to water deeper than 1.9 m; 10 houses on gentle ground within 62 m, turned to the water; camp (fire, two tents, three people, beached rowboat) on a second shore of the start island; two moored boats pushed seaward until they float at the lowest tide; one sailing boat on a 12 m circle of open water; driftwood on beaches. Sea is `sea=2`; weather, macro sea, flow and boats=2 work on top.
- `lab_index.html`: the Lab index of this branch with the world picker (12 links with rock and island type). No index existed in the tree, so this is a new page.
- Tests: `tests/world-view-test.js` (below), `tests/world-view-render.js` and `tests/world-view-sheet.py`.

## Numbers
| item | value | tag |
|---|---|---|
| default page | hash `8d962c0c`, 88,790 triangles, 0 errors | VERIFIED |
| world pages, high | 48k to 119k triangles (A 48-62k, B 65-85k, C 82-103k, D 90-119k); budget 150k | VERIFIED |
| world pages, `?q=low` | 32k to 58k | VERIFIED |
| world + flow + seabed + weather + macro + boats=2 | under 150k (153: about 71k; the test asserts the bound) | VERIFIED |
| build time (software GL) | 0.75-0.9 s | VERIFIED |
| variety, mean pairwise similarity, 12 renders | terrain crop 0.37 (limit 0.6); full frame with the table ring 0.73 | VERIFIED |
| fps on a handheld | not measured | UNVERIFIED |
Budgets: terrain mesh cell 1.0 m high, 1.6 m low (blocks of 4 cells merged when shallow, skipped when deeper than 3 m with the seabed adapter or 4.35 m without); caps per world high/low: 150/80 conifers, 44/24 broadleaf, 120/60 shrubs, 420/200 tufts, 80/45 rocks (plus satellites), 10/6 houses. All TUNING.
Variety note: every frame has the same camera and the same wooden ring, which the judge reads as similarity, so the verdict is on the middle 60 x 65 percent of the frame. The full-frame figure is reported next to it in the test output.

## What is still faked
- The tool's world is 512 m; the page shows a 256 m window, so islands at the edge are cut and fade into deep sea over the last 16 m. Real-metre scale: the tool compresses real archipelago scale about 20 to 50x, so slopes are steep (gneiss median 37 degrees) and read as hills; relief is not relaxed.
- Terrain is the 2 m field bicubic-upsampled; colours are 2 m class maps blended and noise broken. Shore foam and wet band come from the page shader on the height, not from the tool's exposure beyond the foam weight.
- Lochs are coloured patches on the terrain, not water surfaces. Rock in the tool is a 2-D map: no cliff overhangs, caves or stack openings, basalt columns are colour only.
- Village, jetty and camp are placed by rules from the landing sites, not designed; the start landing of most worlds is a "scan" site (the tool had no sand or ledge candidate).
- The seabed pass uses an adapter (`WV.seabed`): depth, bed hardness and exposure come from the field; stream speed uses width = twice the distance to land. Channel scour holes, sills and sand links of `seabed.js` are not built and its debug overlay is off in world mode. The flow field is the same analytic potential flow around the largest islands (as discs), not a solve on the real coast.
- Volcanic windows (1, 2, 5) are a flat lowland beside a cone: they read as a green plain with a straight coast, not as an island. Tree and tuft density there is generic.
- Shadows: the shadow map stores heights up to 14 m, so peaks above that cast partial shadows.
- Sun glitter on the sea is large near the sun direction (the page's own sea shader at a larger table); pictures use a sun that keeps it out of frame.

## How HW orders can export more worlds
1. Add `(province, seed)` to `WORLDS` in `landform/export_world.py` (A, B, C need a start island that passes `foundry/lfmetrics.start_island`; run `foundry/sweep.py` and `shortlist.py` to rank new seeds).
2. `python3 landform/export_world.py` (35 s for 12 worlds, numpy only). It rewrites `worlds/seedNNNN/*`, `index.json` and `index.js`; commit them. Each world is about 133 kB (186 kB with its base64 copy).
3. Open `islands_look.html?world=NNN`. The picker and selector read the index, no page change needed. Run `tests/world-view-test.js`; change the "12" count in it.
A worker order for a new province needs only a rock table entry in `world_view.js` palettes (veg classes 0-19 are handled) and a tree weight row.

## Tests (`tests/world-view-test.js`)
Files (12 worlds, four provinces, under 6 MB, sha, exporter reproduces); default page unchanged; for each world 0 console errors in default, `?q=low`, `?post=0`; budget; low smaller; nothing floats or sinks (trees, houses, tents, moored boats checked against the height function); 12 distinct hashes; hash identical on reload and with other clocks (`seat`, `auto`); full stack under budget; variety. See the commit message for the counts of the final run.

## Pictures
`shots/world-view-sheet.png` (12 worlds, numbered and labelled), `shots/world-view-1..4.png` (village at the jetty of 153, a whole island 174, the camp and landing of 99, the volcano coast of 2), frozen sea clock `seat=3`, sun 40/-65, tide +0.15.
Iterations on the weakest: (1) gneiss ground was a mauve smear and a purple heather wash: heather mix cut from 0.8 to 0.42, rock colours desaturated 35 percent, fine value noise added; (2) the volcano windows were uniformly lime with a dense forest: ground colour now mixes in the rock table's ash and loam, tree weights cut to a third; (3) houses lined up in an arc at the jetty: distance sort jittered; moored boats sat on the bed in two worlds: pushed seaward until the bed is below -1.5 m; (4) sun glare turned the sea white in the pictures: sun moved. Still weak after that: gneiss colour (dull grey-mauve, known from LANDFORM.md), the volcano windows, a bare camp on a spit in world 99, and in world 106 the moored boats are about 55 m from the jetty because the shelf there is shallow (they are pushed out until the bed is below -1.5 m).
