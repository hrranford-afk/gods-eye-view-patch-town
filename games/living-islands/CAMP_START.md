# CAMP_START: day one of the shelter ladder, with a robot yard (24 Nov 2026, version 1)

Owner words (Harry): the houses look low quality and are not supposed to be there yet, the settlers should build their own later; the little robots should have provisional places so we can see how they live. This pass does both on one switch: `islands_look.html?start=camp`. Off by default; the default page is unchanged (look-test: hash 8d962c0c, 88,790 triangles).

Confidence tags: VERIFIED = measured or run in this pass. PLAUSIBLE = reasoned from the repo notes. TUNING = a design number. UNVERIFIED = a guess.

## What it is
- **No village.** Under `&start=camp` the cottages, the village jetty and the two moored harbour boats are skipped (the code is kept, not deleted: `campPlace()` in the page empties `W.houses`, sets `W.jetty = null`, drops the moored boats and keeps the sailing boat). The settler camp stays: tents, fire with its flame, the three settlers, the beached boat.
- **Kit pieces by seed** (`camp_start.js`, `plan()`), from the committed `assets/kit` GLBs (HEAD versions): lean-to, rain barrel, drying rack, crate stack washed up on the strand, a cairn on high gentle ground, the relic hull half buried on a far shore, the wrecked jetty on the shore. The jetty reuses the `&repair=1` layer when it is on (that layer finds its own shore from the same obstacles, so the two never draw two jetties); without `&repair=1` the page draws the static GLB at the site the repair layer would pick. Live and far levels of detail by camera distance (live inside 78 page metres at high, 46 at low, 36 AR, with hysteresis; hidden by hiding meshes, not groups, so the page's triangle count stays honest).
- **The robot yard** (all procedural, no new GLB; about 5k triangles): a lean-to roof of salvaged solar panels on lashed posts (one panel per bay, three different panels, a taped repair, a steel patch), a back wall and a windward end wall of mixed sheets (the shelter for the night and the rain), a charging plate and cable per bay, a power box, a workbench (vice, parts tray, tools, battery, a spare panel, a bin of sorted bits, a coil of cable, a lamp post), a patch of swept sand in raked rings with a ring of stones (a gap faces the first work site), and three sorted piles (metal, plastic, wood) that grow with every delivery.
- **Robots** (`robots.js` recipes, family and radical, no pontoon): this world's own robots from `life.json` when the page is `?world=NNN`, topped up by recipes of `assets/collector/world_robots` by seed; on the default island table (no life.json) recipes by seed, a family tortoise first. Three at high, two at low, one in AR (`&bots=1..4` overrides the high count). GLBs load as the life layer does (fetch over http, the `robot_<hash>_live.js` base64 twin on file://); if both fail the committed tortoise (its twin is read only then) stands in; if that fails too a box-and-tracks stand-in. Zero console errors in each case.
- **Day routine** (pure, `simStep`): work the shore (a seeded, tide-aware list of strand sites, litter at each that disappears when picked and returns after the tide), carry the find to the matching pile, sorters sort at the pile, then the next site. They go home when the charge is under 0.28, at dusk (`&clock=1`: sun under 2.5 degrees), in rain (`&weather=` rain state above 0.3) or when every strand site is under water; they park in their own bay (one to one, never two in a bay), charge (0.020 per second in sun, 0.009 in rain, 0.004 at night) and leave again when it is day, dry and charged to 0.85. A robot gives way to a lower-numbered moving one that is close ahead.
- **Lamp colour code** (COLLECTOR_MODEL.md): amber blinking = searching or heading out, green steady = found or carrying, dim amber pulse = low charge. In the bay: dim amber below 0.55 charge, green above (our reading: "charged and parked"; PROVISIONAL).
- **Tracks the tide erases:** each robot stamps prints behind it (wheel pair, belt, feet, roller band by kind; 220 quads per robot, a ring); a print under the rising water is removed for good, the rest fade on a timer.
- **HUD:** a pill at bottom left: `Camp: day one · kit pieces 7 · robots 3 · in yard now 3` (people are counted, never tracked; the routine knows robots only).
- **Robots are relics:** no faces, no speech, no moods. The GLB carries a visor band and a faint glow strip; the glow strip is switched off here (the band remains, see gaps).

## How the placement works (rules tested in `tests/camp-test.js`)
Everything is a function of (seed, the page's own height function H, the tents and fire): deterministic. The yard goes first, as a rectangle (12.4 x 8.2 m at three bays) facing the fire, on ground whose interior stays above the strictest rung it can meet (0.9, 0.6, 0.4 or 0.3 m) and whose corners are no lower than 0.95 m under that, with a cut-and-fill terrace (three overlapping level pads under it, level above the highest tide, 1.2 m or the mean). Pieces then take the best site by score over a 2 m scan (ring of footprint samples dry and gentle, at the right distance from the fire for its role, a worse rung of the ground rules costs score so a near site on poorer ground can beat a far one on good ground), footprint circles from the catalogue (scaled), no overlap (0.7 m gap), nothing on the tents, fire, beached boat or yard. Trees, shrubs, tufts, logs and loose rocks inside a footprint or on a robot path are cleared (the fire ring stays); a level pad is added under each piece so it sits on its footprint, 3 cm sunk (the hull 0.45 m, half buried). Work sites: strand height 0.32 to 1.0 m, gentle, clear, reachable from the apron by a straight line or one bend round trees and big stones (small scrub along the way is cleared as a worn path).

## Numbers
| Measure | Value | Tag |
|---|---|---|
| Default page without the switch | hash 8d962c0c, 88,790 triangles high, 60,752 low | VERIFIED (look-test) |
| `start=camp` high, home view (far levels) | 106,619 triangles (about +17.8k: 3 robots about 10.5k, yard about 5k, far pieces about 3k, minus the 6 cottages and jetty) | VERIFIED |
| `start=camp` high, all pieces live | 118,885 | VERIFIED |
| `start=camp` low, home / live | 74,113 / 83,825 | VERIFIED |
| Frame cost, software GL 1200x800 (not a device) | high home 1456 ms to 1610 ms (+10 percent); low home 752 to 784 ms (+4 percent); low close 889 to 937 ms (+5 percent) | VERIFIED for software GL, UNVERIFIED on a phone |
| Build time (software) | 2.0 s against 0.9 s at high | VERIFIED |
| Extra bytes at high (file://) | `camp_start.js` 63 KB; `assets/camp/kit_b64.js` 1.56 MB (7 pieces, live and far); GLTFLoader 98 KB (vendored, already there for the other layers); 3 robot twins about 1.2 MB (read only for the chosen recipes); tortoise fallback 444 KB only when needed | VERIFIED |
| Extra bytes over http | kit twins as now; robots by fetch as `.glb` (about 1.0 MB for three) | PLAUSIBLE |
| Pieces: high / low / AR | 7 / 5 / 3 | VERIFIED |
| Robots, bays: high / low / AR | 3 / 2 / 1 | VERIFIED |
| Work sites on the default island | 4 (the island is small); 5 on world 1 | VERIFIED |
| Routine: first deliveries, 15 minutes | 8 to 10 per robot, heap 8 / 11 / 8 in the pure test | VERIFIED (synthetic world) |
| Robot speed | 0.75 to 0.9 page m per second (robots.js speeds times 1.5) | TUNING |
| Robot size | E_ROBOT 1.6 (a 1 m machine reads as 1.6 m) | TUNING |
| Charge: leave at 0.85, home at 0.28, drain 0.0046 per second moving | a cycle of about 2 to 3 minutes | TUNING |

Tests: `node tests/camp-test.js` (44 checks, pure node: determinism, dry ground, no overlap, footprints, sitting on the ground, tiers, the state machine: every state visited, never two in one bay, charge 0..1, deliveries, low charge goes home, dusk, rain, high tide, morning, sorting, no person tracked, the house hook); `NODE_PATH=$(npm root -g) node tests/camp-page-test.js` (headless: 0 console errors default high, q=low, post=0, AR, worlds 1 and 4, GLB failures, the layers together; no cottage, jetty or moored boat; robots enter bays at dusk with the sky clock; the look-test child run). Pictures: `NODE_PATH=$(npm root -g) node tests/camp-render.js` writes `shots/camp-sheet.png` (labelled 2 x 3) and `shots/camp-1..3.png` (1200 x 800: the yard by day, the camp wide, robots on the shore with tracks).

## What is provisional
The yard layout, the panel and sheet colours, the routine numbers, the lamp reading in the bay, the speed and size exaggeration, the tier counts, the 12 x 8 m terrace, the placement scores. The robots' work is a fixed loop with no stakes yet (no tide timetable, no tender, no wear).

## How to add the later house step (rung 2 or 3)
1. The page skips houses in `campPlace()` (`W.houses.length = 0`); that line is the only switch. Keep it for day one.
2. `LI_CAMP.shelterHook(rung, ctx)` (also `CP.hook` in the page) is the one place the page asks for a shelter: today it returns `{ drawn: false }`. When the ladder reaches rung 2, call it from the era logic and have it return a placement.
3. Add the shelter as one more entry of `PIECES` in `camp_start.js` (footprint centre and radius, scale, zone `camp`, tier), give it a GLB pair (live and far) through `tools/camp_b64.py` (add the name to its list), and `plan()` will find it dry gentle ground, clear it, level it and keep it off the tents, yard and other pieces. Rung 3 uses the existing cottage code (`addCottage`) the same way: add the footprint to the plan's circles, push a `W.houses` entry after `campPlace()`.
4. The old lean-to stays and becomes a store (research/FIRST_SHELTER_AND_MATERIALS.md: each rung is built beside the one before). Houses must be built by settlers, not placed at the start: gate the call on the ladder state, never on the seed.

## Gaps, ranked
1. **The camp island is too small for everything.** On the default table the yard takes the north half of the camp island (a terrace that levels the old hill top and fills a little into the shallows, brown trampled colour from the page's pad shading), and all other pieces land on the next island, 45 to 60 m away. On world pages they sit closer. A bigger camp island or a smaller yard (two bays) would keep the story in one place.
2. **The robot model still has a visor band** (the face-like dark strip). The glow strip is dark here, but the band reads as a face from close; it should be removed in the model script, not hidden by the page.
3. **Paths are straight lines with one bend**, planned once; there is no live avoidance beyond yielding to a lower-numbered robot, and robots can clip a pile or a bay stone when they turn. Robots do not carry a visible load (the pile grows when the drop ends).
4. **No yard light at night**: only the robot lamps and the existing fire glow; a second point light would cost a shader recompile on every page. A cheap glow sprite on the work lamp would do.
5. **Rain needs `&weather=` (or moods)**; without it nothing rains, so the rain rule only runs through the test hook (`campstart.rt().force({rain:true})`). The routine runs on real seconds, not game hours.
6. **Kit mound discs** (the dark sand discs under each GLB piece) show as dirty patches on grass; the hull's disc is visible at its sea edge.
7. **Only four strand sites on the default island**, so two robots often work the same stretch and the litter returns on a timer, not from the tide.
8. **The terrace blends over 2 m** with the page's own pad rule, so the edge reads as a plateau from some angles; a custom heightfield bump would be softer.
9. **Animals are not drawn under `start=camp`** on world pages (only the robot data of `life.js` is used); `&life=1` still adds them, with the robots of `robots.js` switched off so the yard's robots are the only ones.
10. **LOD swaps pop** (no cross-fade) at 78 m (high); the frame numbers are software GL, not a device.
