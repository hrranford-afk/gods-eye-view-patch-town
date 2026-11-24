# Level 1: build plan (from seed 29 to the real page level)

Read research/LEVEL1_DESIGN.md first. Day numbers are developer days, plus or minus half, guesses. Nothing here edits the first-day page; the first-day builder owns `islands_look.html`, `gift_day.js` and `landform/worlds/seed9001`.

## What is already done (this folder)
`layout.py` builds the table, `validate.py` judges it, `sweep.py` runs 50 seeds, `test_layout.py` has 21 tests, `level1/out/` holds seed 29 in the page's export format (`world.bin` 349 kB, `manifest.json`), `maps/` has the pictures. All numpy and PIL, about 5 s a layout on 4 cores.

## What reuses seed9001 and what does not
- **Reused as is:** the home island (heights, rock, veg, wetness, the lamp at (52,-34) and hut at (22,-2) of its window). It sits at (34, -26) on the table. Five shore cells differ (the bars raise them).
- **New:** everything outside the home window: five islands cut from landform worlds (shortlist worlds 8, 174, 131, 175, 54), the sea floor, the Hoard bar and link, the woods sill, the reef, the depot terrace and foot path, the seal ledges, the woodland overlay.
- **Run on the hardware (not on this machine's cloud, optional):** nothing is required; the pool of 473 islands is cut from n=257 worlds that take 1.3 s each. On the Radeon box the same worlds can be made at n=513 (1 m cells, 5 s each) and the layout rebuilt at 1 m for the hero render; the code keeps `DX=2.0` as one constant but the cut windows and bars need a resample (see step 7).

## Ordered steps
| # | Step | Needs | Days | Done when |
|---|---|---|---|---|
| 1 | **Table size in the page.** Behind a new switch (`?game=gift&level=1`, never the default) set table radius 196, height texture to cover 416 m (`TS` from 128 to 256 at 2 m texels, or 208 at 2 m), scale the camera home and limits by 1.6, scale the flow field cut-off and flotsam spawn radius. | the first-day builder | 3 | the table draws with `world=level1` and the default page hash 8d962c0c and 88,790 triangles are unchanged |
| 2 | **Load the table.** `world_view.js` already reads `nx` from the manifest; point it at `level1/out` (copy to `landform/worlds/level1/` with `world.js` base64 as the exporter does), read the new manifest keys (`roles`, `bars`, `depot`, `reef`, `ledges`, `landmarks`, `spots`). | step 1 | 2 | `?world=level1` shows all six islands, no errors |
| 3 | **Content by role.** Home: the builder's camp, jetty, hut, yard unchanged. Woods: trees on veg 14 and 15 (the page already plants by veg class), a sawmill-shed spot, the spring marker at the head cell. Hoard: depot pad props (heaps, drums, crates, a faint stamp), five cairns on the bar, a path decal. Seals: 3 ledge sites for the seal module (the seals exist in the model, not yet in the page). Reef: the wreck mesh at the highest head, ribs at spring low, a lone tree on the bare rock. | step 2, `SEAL_MODEL.md`, the boat kit | 6 | each role has its props and the wrack list per shore |
| 4 | **Tides on the bars.** The page already has the tide; add the robot rule: wet stretch under +0.5 m is crossed only when level <= crest + 0.10; show the tide card; cross-window logic for the Hoard run (leave at window start, stay a tide). | robots.js, camp_start.js | 4 | a robot reaches the depot on day 5 22:01 and not before |
| 5 | **Boat routes.** Waypoints from `level1/out/manifest.json` (the trips are in `chosen.json`) for the delivery tender and the player's boat (Job 2); keel depth rule 0.45 m; the reef as a no-go ring. | Job 2 boat | 3 | the tender reaches the woods in about 81 s at 2.0 m/s and slows around the reef |
| 6 | **Lamp and sight.** Light range from the stump (LIGHT_H 9 m); the lamp shows the woods, seals and depot as specks on night 2; the lamp beam capped at 0.4 table widths (LIGHT_FOG_AND_LIGHTHOUSE.md). | `light_range.js` | 2 | night 2 shows the three specks |
| 7 | **Hero render at 1 m (optional).** Run the layout at 1 m cells on the Radeon box: resample the cut windows (the tool already makes 513-cell worlds), keep the bars at 6 m, repaint the reef at 1 m; render with `blender/landform_scene.py`. | Blender, 8 GB RAM | 3 | one still of the whole table for the cover |
| 8 | **Budgets.** Measure the page with the table: triangles and draw calls per tier (the estimate says 96k and 58 calls high, 33k and 34 calls AR, one call over the T5 phone limit). Use the page's own `?tier=` and the Radeon reports; fix the mesh cell if needed. | the Radeon, a device | 3 | numbers recorded; T2 and T4 under budget |
| 9 | **Balance.** Run `ecosystem/food_model.py`, `collector_econ.py`, `shelter_ladder.py` on the table (they take the exported world); check the first year with the woods supply (10.7 m3), the tide gate on the Hoard, the seals. | the table in the loader | 4 | a year-one run with no dead end |
| 10 | **Sea chart link.** Register the table as the home parcel; use `build_layout(seed)` for neighbouring tables; survey cards from the validator numbers. | `gift/parcels.py` | 5 | the chart shows the home table and 8 neighbours |
Total about 35 developer days, of which 7 for the first-day page changes. Each step ends with something playable.

## What the first-day builder would need to change (small list)
1. A second world id (`level1`) and the table radius switch; the default and `world=9001` stay as they are.
2. The yard: put it on the south or west of the hut (CHANGELOG suggestion A); the yard to causeway walk is 195 m now.
3. The tide card in the evening (suggestion B); the first low under -0.74 m is day 5.
4. Keep the robot job list open for a "Hoard run" job.
5. Place the lamp on night 2 to show the depot (suggestion D).
Nothing else in `gift_day.js` depends on the map; the letter and ledger stay.

## 15-minute guided path on this map (day 1; the second sitting is in LEVEL1_DESIGN.md section 13)
0 to 1: landing, dawn, the whole table (cairns left, woods right, lamp behind). 1 to 3: crate, letter, key. 3 to 6: hut, barrel, the roof catches rain. 6 to 8: one plank. 8 to 10: walk west along the strand, find the first finds, see the cairns on the skerry. 10 to 12: walk to the lamp, see woods and seals. 12 to 14: the yard, a robot starts. 14 to 15: it patrols the wrack. The Hoard bar is shut on day 1 (tide -0.34 to +0.40 m) and opens on day 5.

## Placeholders and honest gaps
- The sediment and sandbar engine is not built: bars and the reef are designed shapes.
- The woodland is a rule (the tool paints no trees).
- Seal ledges and the depot terrace are painted.
- The tool's relief is steep (median 37 degrees), so the non-home islands will look rough next to the builder's gentle island.
- Triangle and call numbers are estimates; no device was used.
- Seams in deep water at the pasted window edges (needs a feather).
- Surge exposure is low everywhere because the tool caps fetch at 166 m; the ranking is used.
- Only one woods source (world 8, island 2) passes all limits; the pool needs more woods candidates, or a bigger table, for variety.

## Questions for the owner (taste only)
1. Is a Hoard that opens only on day 5 right, or should the first low water of day 2 or 3 let a robot out (the crest would drop 0.15 m)?
2. One woods island with the only spring, or a spring on the home island too (less reason to row)?
3. Do you want the cairn line (BOLD B1), the ribs (B2) and the lone tree (B3), or any dropped?
4. Seals and birds so close to the home lamp (about 70 m from the headland) or further out?
5. Gneiss for the seal rock (hard, grey, steep) or a granite look in the art pass?
6. Is 416 m with six islands too much to take in on a phone, or should the AR tier hide the bare rock and wreck until a boat exists?
