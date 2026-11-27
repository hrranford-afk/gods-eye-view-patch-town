# Opening film prototype: what the stills show (T3 item 4, 27 Nov 2026)

Files: `opening.js` (engine), `opening_proto.html` (page), `tests/opening-test.js` (node, 51 checks, all pass), `tests/opening-render.js` (the still renderer), `research/opening_proto_shots/t05 t15 t30 t45 t55 t65 t75 t88.jpg`.

How the stills were made: headless Chromium, software GL (SwiftShader), 1280 x 720, Radeon tier, `?ui=0&freeze=1&t=N`. Zero console errors in the run of all eight (the SwiftShader "GPU stall due to ReadPixels" driver warnings are filtered; they are not page errors). Software GL says NOTHING about speed on a device. Triangles as counted by three.js: Radeon tier 441k to 721k and 80 to 149 draw calls over the eight stills; iPad tier 90k to 174k and 40 to 97 calls (the iPad tier is above the 150k triangle GUESS in `tiers.js` at 65 s and 88 s: the island meshes and salvage models add up; nobody has measured whether that matters on the iPad).

Honest summary: the GEOGRAPHY, the TIMELINE, the SEA STATES and the MOOD of the ChatGPT frames are in place and the engine does what the plan said. The PICTURES are far plainer than the targets: painted detail, wet reflections, rope-bound rafts, light shafts, detailed robots and the working colony are not there, and every prop is a block placeholder. This is a film engine with a rough stage, not a look.

## Frame by frame

| Still | Target | What matches | What is missing or ugly |
|---|---|---|---|
| t05 night watch | 01 | Violet cloud, stars, the lighthouse on its island with the striped tower, a beam sweeping out of the lamp, no whirlpool (as the owner decided; the target needs a re-render without it), a tiny lit boat at the left foot of the island | The beam is a faint wedge, not the bright gold shaft of the target; the boat is one dot; the sea is flat dark violet with no gold glints (the glint code is there but weak at this angle); the camp island is out of frame, so no colony lights; star dots are square and too regular |
| t15 first light | 02 | The geography is right: split rock top left, lighthouse top right, camp island with its jetty bottom left, the lone-tree island bottom right, sun rising at the right edge, no whirlpool. Cloud streaks lit pink | Washed out and low contrast next to the target's gold and purple clouds and god rays; the camp island is cut by the frame edge so the shed and fire are not seen; the salvage reads as scattered specks, not the few meaningful planks of the target; no painted detail |
| t30 working quay | 03 | A finished jetty in evening light, a tracked robot carrying a crate down it, the lighthouse and low sun beyond, a sun glitter path, a floating barrel and buoy where the mooring rope goes | The four stock bays, the shed, the washing line, the people and the fire are all out of this frame (the camera looks along the jetty; they stand to its right). Only one robot is in view. The robot is two stacked boxes. No warm lanterns glow worth the name, no wet-deck reflections, the deck is a flat brown |
| t45 long swell | 04 | Dark violet storm cloud, the lighthouse island against a last sun glow, drifting timber, a low camera at swell height, no storm yet in the water | The swell is weak at this moment: no crest hides the far shore in this still (the node test finds a sight-line block elsewhere in the shot, for part of it). The rope the shot should follow is behind the camera. The target's whirlpool, growing, is not yet there (it starts at 46 s here), the target's rolling dark wave wall is not there, the debris is evenly scattered rather than gathered in lanes |
| t55 Great Wash | 05 | Storm sea: dark ceiling, rain streaks, white foam on a big surge, the jetty broken to snapped piles, the loose deck section with the cargo riding off the end of it, the camp island with its shed, the sea over the shore as a white wash | The giant crest of the target has already passed (it peaks at 50.5 s, the still is at 55); no lightning in this frame (flashes are on cues, none at 55); the raft is a deck with salvage on it, not the tangle of ropes, crates and floats of the target (the ropes exist but are thin and dark); the whirlpool is out of frame; foam is a flat sheet on the right, not breaking lines; the island is too dark; no light shafts |
| t65 wrack line | 06 | Grey dawn sky, a pale sun glow, the grounded hulk (rust box hull, grey cabin, a mast) on the shore, a still robot in the foreground with a dark lens, the lighthouse and the split rock beyond, calm grey sea with timber floating | No rainbow in this frame (it fades in from 64 s and the camera looks away from it); no wrack line of timber, glass and rope on the sand: the items exist (they appear from 54 s on the shore band) but the camera stands on the grass above them; the lower right is a big smooth green hill; no snapped piles, no drips, the hulk is two boxes; the robots are blocks; the weak swirl is behind the hulk and does not show |
| t75 arrival | 07 | Low boat bow with a rope coil, a thwart and a post in the foreground, the camp island with shed, lanterns, jetty and bays ahead, the rainbow, the hulk at the right, stubs of snapped piles, timber in the water, apricot evening colour | The bow is flat orange boxes, not a weathered boat with rust and canvas; the sea is plain; the whirlpool is not in this frame (it is a faint 0.18 and off to the left); the camp is a heap of boxes; no sun streak on the water; no kelp line |
| t88 first repair | 08 | One big robot with a lit lamp lens (the lens turns on at 86.4 s with the relay cue), a battery box at its side, the jetty deck, the sea, the sun low, the split rock | Blocks: no rivets, wear or cables; the gloved hands have withdrawn out of this frame (they are boxes, and gone by 88 s); the camera sits too far to the side so the battery is small; the sea behind is bright white glare; the pale sky is empty. This still is the one furthest from its target |

## What works (the engine and the staging)

- One clock drives everything: the camera, the sea (three weights plus the crest and the whirlpool), the sky and light colours, rain, the beam, fade dips and the cues. Seeking to any time gives the same picture as playing to it (checked in node, 51 checks). The page opens at any `t` with `&t=` and the stills were made that way.
- The sea is the real wave sea: the same Gerstner table in the shader and in the CPU height. The Great Wash crest is one extra wave in the table with its own amplitude track, so the camera floor, the salvage and the picture agree about it. At 51 s the crest is a clear wall of water with the loose deck section riding its top (seen in the working stills, not among the eight).
- The whirlpool is a track and nothing else: zero in the night watch, first light, quay and swell (tested), full at 54 s, a weak 0.28 to 0.05 after, zero in the last 5 s. It shows as a spiral funnel in the 47 s to 55 s stills.
- The camera is never under the sea or inside an island, on all four tiers, checked every 0.05 s against the real height query; the adapter also lifts a camera that is too low.
- Debug camera (free fly), captions off by default, speed 0.25x to 4x, scrub, skip, shot list, cue log, frame readout, tier switch.

## Open problems found

1. Sea facets: on the iPad tier the polar mesh shows faceting in the foreground (72 x 160). Ripple normals hide some of it. The sea looks flat and plastic at low light.
2. Light: pale and low contrast at dawn and dusk. The ACES-style tone curve and the first guess at colours need a grading pass against the ChatGPT palette samples. The target look uses far more purple and gold.
3. Foam: the crest foam is a sheet. It needs breaking lines and a timed pass.
4. Salvage reads as sprinkled specks. The target gathers it: lanes, a few meaningful planks, one orange crate. The salvage world does not know about the film's story; the staged items do, but only on the deck section.
5. Terrain: the island is one low landform used five times; the hills are smooth and green, the "split rock" is the same island squeezed tall and looks like it.
6. Placeholders: every robot, the quay, bays, hulk, boat, people and hands. Marked in the page panel.
7. No sound: the page only names the cues (cue log). Lightning is a flash on the sky and a thin line, not a bolt shader.
8. Speed on a device is unknown. The iPad tier counts are above the 150k guess at two stills.
9. Camera work: shot 4 should show the mooring rope and a crest hiding the shore; shot 6 should stand on the beach, not the hill; shot 8 should show the hands at the moment of fitting. These are camera data (cheap to change in `defaultFilm`), not engine work.

## What a next pass should do (in order)

1. Grade: sky, sea and fog colours against the palette samples, then add real cloud shapes.
2. Camera data for shots 3, 4, 6 and 8 as listed above (a day).
3. Replace the placeholder robots with the repo's robot models and the quay with the kit pieces.
4. Foam lines and the lightning bolt; a better pass on the sea mesh for iPad.
5. Wire the director into the game page (not done here: the page files belong to another job).
