# Opening detail kit: what was built and what the stills show (27 Nov 2026)

Files: `details.js` (the kit), `details_board.html` (the board), `tests/details-test.js` (80 checks), changes in `opening_proto.html` and `opening.js` (the film now uses the kit; `tests/opening-test.js` still 51 of 51), stills in `research/opening_proto_shots/` (radeon tier, 1280 x 720, Chromium software GL), board pictures in `research/details_board_shots/`.

All numbers below are triangle COUNTS and draw-call counts as three.js reports them. Software GL says nothing about speed on an iPad or any device; nothing here claims real-device speed.

## What the kit is

`details.js` makes procedural three.js r128 geometry in two steps: `plan(kind, opts)` is pure data (no THREE, no clock, no Math.random) and `build(kit, kind, opts)` turns it into a Group. Wear is baked in: a seeded wear model writes vertex colours (paint chipped to bare metal at the edges and rust around the chips, rust streaks, grime low down, weed and barnacles at the waterline, salt on wood), plus a few generated data textures (grunge, wood grain, rust, hull plating with real alpha holes). The wear slider (0 to 1) and the seed change the baked bytes. Repeated pieces are `InstancedMesh`: every jetty plank (own length, width, tone, warp and tilt; the warp is a vertex-shader bend), every pile (three variants plus snapped stubs). Three levels of detail (0 full, 1 about a third to a half, 2 about a tenth to a fifth).

| Piece | Triangles lod 0 / 1 / 2 | Size (m) |
|---|---|---|
| Robot hauler | 4143 / 1838 / 813 | 2.0 x 1.5 x 1.1 |
| Robot sorter | 3999 / 1874 / 849 | 2.1 x 1.9 x 1.0 |
| Robot stacker | 4146 / 1826 / 801 | 2.4 x 1.5 x 1.3 |
| Hulk (trawler aground) | 4121 / 2013 / 309 | 15.0 long, 4.8 beam, 11.5 with mast |
| Jetty u -2 to 38 with apron, crane | 15060 / 7392 / 4574 | 40 x 9.8 |
| Bay 1 sawn planks | 1344 / 888 / 768 | 2.8 x 0.8 x 1.9 |
| Bay 2 rope coils | 2292 / 816 / 492 | same |
| Bay 3 bottles and glass floats | 2292 / 1224 / 984 | same |
| Bay 4 metal sheets, pipes, gear | 1520 / 740 / 612 | same |
| Camp hut with corrugated roof and 3 lanterns | 4640 / 2331 / 475 (+ lanterns) | 12.1 x 5.9 x 7.1 |
| Lantern (glass, warm halo sprite) | 218 / 153 / 153 | |
| Washing line (7 cloths, sway shader) | 468 / 348 / 348 | 10.3 long |
| Fire pit (stones, logs, 3 flame sprites, 14 embers) | 700 / 282 / 279 | |
| Barrels (3) | 1260 / 522 / 453 | |
| Battery block | 286 / 106 / 60 | |
| Gloved hands (knit cuffs, leather) | 680 / 520 / 424 | |

Robots: rounded bevelled bodies, rivet rows, panel seams, tracks with link cleats and wheel hubs and a few missing cleats, a jointed arm (shoulder, ram, elbow, wrist, two-claw gripper), one lens eye (rim, dark well, glass dome and an inner glow, a halo sprite; `setLens(0..1.5)`), a battery hatch with hinge on the rear edge (`setHatch(0..1)`) and a battery block behind it (`setBattery(out)`). No mouth, no face, no grille: the test checks part names and the head volume. The three kinds differ (hauler: toolbox; sorter: tall neck and a front bin; stacker: wide tracks, counterweight).

Hulk: lofted plating hull with alpha holes and rust texture, plank deck, wheelhouse with windows (some dark and broken), funnel, mast with boom and rigging lines (one cut and dangling), rails with gaps, hatch, winch, rope coil, barnacle band and hanging weed. Jetty: the broken state (`broken`, `snap`, `side`, `loose`) has snapped piles with splinters, missing and hanging planks, loose planks, fallen braces. Bays: stock height (`stack`) 0 to 1.

## Triangle budget for the whole opening scene

The recipe in `tests/details-test.js` (jetty in three pieces, four bays, hut, six lanterns, washing line, fire, barrels, hulk, seven robots, hands, battery): **31248 triangles at the iPad tier** (lod 1 for props, lod 0 for hands and battery), **55082 at the desktop tier** (lod 0 for the near props). The goal was about 60k, so there is headroom. In the film page the whole frame counts as follows (everything: islands, sea, salvage, kit), iPad tier: 94k to 181k triangles, 68 to 138 draw calls over the eight stills. Before the kit the report said 90k to 174k and 40 to 97 calls: the kit adds about 30k triangles and 30 to 40 calls in the shots that show the camp. The iPad total is still over the 150k GUESS in `tiers.js` at 65, 75 and 88 s; the island meshes and salvage models are the larger part. Nobody has measured whether that matters on the iPad.

## Frame by frame against the ChatGPT frames

| Still | What matches the target now | What is still wrong |
|---|---|---|
| t05 night watch | Unchanged from the first cut (same bytes): violet sky, stars, lighthouse and beam; the lone-tree island is at the right edge, the camp island is out of frame. | Still a faint beam, flat violet sea, square star dots; the kit is not visible here. |
| t15 first light | Camp island with its real jetty and the hut visible at the far left edge. Four islands, sun. | Camp is a few pixels; washed out next to the gold and purple target; no god rays strong enough. |
| t30 working quay (03) | The four bays are in frame with their stock (bottles in crates, rope coils, metal and a gear), planked deck with lanterns, piles with braces, a crane, a robot with a crate at the far end, a camera that looks over the bays. Real planks, no longer a flat brown deck. | The hut, fire and washing line are NOT in this frame (they are behind the camera; I traded them for the bays). Robots are small. Lanterns glow weakly, no wet-deck reflections, the sand mound in the foreground is a big smooth orange hill. The bays read low and dark: contents are small. |
| t45 long swell (04) | Unchanged sea mood; debris now in a spread. | No whirlpool yet at this time, no rolling wave wall, the rope is not in frame; the kit is not visible. |
| t55 Great Wash (05) | The jetty is broken to snapped piles with splinters, loose planks around them, the deck section drifting; the camp hut with warm lights on the island. | Foam is a flat sheet, no lightning at this time, the raft is a deck with salvage, not a tangle; the section is small in frame. |
| t65 wrack line (06) | The hulk now reads as a stranded trawler on the sand: plated hull with rust holes and weed, wheelhouse with windows, funnel, mast and rigging, listing; three still robots with dark lenses in grey dawn on the beach; lighthouse and sea beyond. | No rainbow in frame; no wrack line of timber, glass and rope on the sand in front; no snapped piles in the sea (they are off to the left); the robots are crowded and partly cut by the frame; the hull's lower edge floats a little above the sand on the near side; the beach is a smooth brown ramp; the split rock is out of frame. |
| t75 arrival (07) | Over the bow: jetty with diagonal braces, snapped stubs, the apron with bays, a crane, washing line with cloths, the hut and robots on the deck, rainbow, trees. | The bow is still flat orange boxes (not part of this job); the whirlpool is not in this frame; the sea is plain; sand is smooth orange. |
| t88 first repair (08) | The nearest to its target now: one big worn robot with a lit lens (rim, inner glow, halo), an open hatch with the hatch door swung out, the battery block with amber contacts seated in the bay, rivets, panel seams, chipped paint, a crane behind, gloved hands with knit cuffs on both sides of the battery. | The glove is small and crude (blocky fingers); the cuffs are long straight tubes; the robot is yellow and clean next to the target's orange, heavily chipped and rusted paint; no cables glow; the deck rails cross the shot; the sea behind is empty. |

Honest summary: the props are no longer blocks. The robots, the hulk, the jetty and the bays have real detail and wear. The stills are still far plainer than ChatGPT's frames in light and atmosphere (painted gold and purple skies, wet reflections, god rays, rock and grass detail, a visible whirlpool) because that comes from the sea, sky and terrain, which this job did not touch. People are simple coloured figures, the arrival boat bow and the crate on the robot's arm are still blocks.

## Camera changes (film data in `opening.js`)

- Shot 3 (20 to 36 s) is a slow dolly from the land beside the apron, high enough to look down on the four bays, then a cut at 36 s to shot 4, which follows the rope out as before (the rope pan no longer hides a long camera move).
- Shot 6 (59 to 70 s): the camera stands on the beach next to the camp, with the hulk and the still robots ahead; the hulk moved from the water (ground -2.6 m) to the east beach of the camp island (jetty frame u 26.5, w 15.8).
- Shot 8 (81 to 90 s): camera at 45 degrees to the robot's front and hatch side, close, so the lens, hatch, battery and both gloved hands are in frame at 88 s (the hands now let go after 88.7 s, not at 86.4 s). Cues unchanged (relay and key at 86.4 s, battery seat 85.4 s). The whirlpool track is untouched, still storm-only.

## Tests

`tests/details-test.js`: 80 of 80 (node plus headless Chromium): every piece builds at three levels, budgets hold, lod falls, scene budget within 60000 at the iPad tier, same seed gives identical bytes for all 16 pieces, different seed and different wear change them, no NaN, robots (3 kinds x 3 levels) have only allowed named parts, exactly one lens and one rim at the head front centre and nothing in the head volume or below the lens, jetty planks all differ (333 planks, 331 distinct) and the pieces tile, stock height works on all four bays, the board has zero console errors for every piece view, the film page has zero console errors at 5, 30, 65 and 88 s (iPad tier), and at 88 s the kit pieces are in the film with the hatch open, lens lit and hands on. `tests/opening-test.js`: 51 of 51.

## Open items

1. Sky, sea and terrain grading, so the stills approach the target atmosphere (the largest gap now).
2. Shot 3 should also show the hut, fire and washing line (a second camera angle or a short cut on the apron); lantern glow and wet-deck look.
3. Better gloved hands (rounded fingers, shorter cuffs); robot paint heavier, more orange, with cables.
4. A real wrack line on the beach in shot 6 (timber, glass, rope, crates), the rainbow in frame, snapped piles in the sea.
5. The arrival boat bow, people, crate on the arm and trees are still simple shapes.
6. iPad tier total triangles and draw calls are above the guess in `tiers.js` in shots 6 to 8; measure on the device before deciding what to cut (the kit lods are ready).
