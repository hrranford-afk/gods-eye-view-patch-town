# Brick Lab physics on the island ground: audit, prototype, plan

Owner idea, 25 Nov: put Brick Lab's physics on the island terrain. Shots and washed-up plastics roll over the ground and sometimes get stuck. Some ammo is small and rapid, some is big and heavy. Brick by brick on the Radeon, fewer pieces on the iPad. Bases of different materials with different toughness. Slow motion only as a deliberate replay.

Confidence tags: [high] measured or read in code, [medium] measured here but a guess for other machines, [low] a guess.
Honesty rules for every number below: Node timings are from a shared cloud core. Page pictures are software GL (SwiftShader). Nothing here says anything about a real GPU. The only real-device numbers are Harry's iPad run of Brick Lab on 21 Nov, quoted from BRICKLAB.md.

The prototype is in `games/living-islands/rubble/` (page, sim, tests, pictures). Nothing outside that folder and this file was touched. Brick Lab was only read.

## 1. Headline findings

1. Brick Lab's engine is a library, not custom code: Rapier (Rust, compiled to WebAssembly). The Lab's own code is small: `sim.js` is 266 lines. [high]
2. Rapier can do the island ground. It has a heightfield collider. I fed it the island's own height grid and 400 random ray tests agree with the grid to 1.6 cm. [high]
3. A heightfield has ONE friction and ONE bounce for the whole collider. So per-ground-type material needs the ground cut into tiles. I used 2 m tiles (400 colliders for a 40 m window). The empty tiles cost 0.12 ms a step. [high]
4. Rapier has no rolling resistance. A ball on sand would roll like a ball on glass. I added a constant rolling friction per ground type. Now a ball stops where the slope is gentler than the ground's number. [high]
5. Two real engine problems showed up and are handled, not fixed: Rapier's own cylinder shape fell through heightfields in about one random drop in five, and a heightfield has no thickness, so thin or crushed bodies leak through. I replaced cylinders by 24-sided prisms and added a guard that puts a leaked body back on top and counts it. See section 4. [high]
6. Sleeping is the whole budget. 1000 pieces asleep cost 0.6 ms a step. The same 1000 awake cost 7.9 ms. [medium]
7. Rapid-fire small shots are cheap if they do not collide with each other: 300 acorns cost 0.65 ms a step that way and 2.3 ms when they do. [medium]
8. Tide works with a simple buoyancy rule: wood and plastic float, glass and tin sink, and an ebbing tide leaves floaters stranded on the beach. [high]
9. Replays are exact. Same scene, same logged shots, same hash at the same step. The replay code of a fixed volley is `8ab9af4f` in Node and in Chromium (same build). Whether an iPad gives the same code is not tested yet; the bench report prints it. [high for Node and Chromium, untested on iPad]
10. Slow motion is only the replay: it rebuilds the scene and runs the same 1/60 s steps at a quarter of the speed, drawing between steps. It never changes the time step, so it cannot change the result. [high]

## 2. Audit of Brick Lab's physics

Files read: `games/brick-lab/BRICKLAB.md`, `sim.js`, `index.html`, `tests/phys-test.js`, `tests/phys-results.json`, the `vendor/` folder. Branch `game/brick-lab`.

### 2.1 What the engine is
- Rapier by Dimforge. Three builds are vendored unmodified: 0.14.0 (2 MB), 0.21.0 (4.3 MB), 0.21.0 SIMD (4.6 MB). Apache-2.0. [high]
- It runs as WebAssembly on one thread. Same code in Node (tests) and in the browser (page). [high]
- Harry's iPad run (21 Nov, Safari, 8 cores) says 0.21 SIMD is the fastest build and the standard to use. [high, real device]

### 2.2 Bodies, shapes, material
- Every brick, plank, post, beam, tile and crate is its own dynamic rigid body with one cuboid collider. A ball is a dynamic body with a ball collider and continuous collision on. [high]
- The only ground is one fixed cylinder, radius 3.25, a 65 cm round table (1 world unit is 20 cm). No heightfield, capsule, hull or compound shape is used. [high]
- Friction and bounce are set per collider. Brick 0.75 friction (combine rule Max, so the stronger wins), bounce 0.05. Tile 0.8 and 0.03. Table 0.9 and 0.1. [high]
- Damping: linear 0.1 and angular 0.5 for pieces, 0.01 and 0.2 for balls. [high]

### 2.3 Solver and time
- Fixed step 1/60 s. The page runs an accumulator with at most 3 steps per picture. [high]
- 6 solver iterations and 2 internal PGS iterations (Rapier defaults are 4 and 1). Allowed error 0.001 and prediction distance 0.002 are set by hand on every build so all are tuned alike. `lengthUnit` 0.2. [high]
- Gravity is -9.81 in units of 20 cm. So the world falls like a world 5 times bigger. Gravity -20 or -30 collapsed stacks on 0.14. On 0.21 stacks stood at -20 in tests. [high]
- Sleeping is Rapier's own. The page settles 90 steps after a build, makes that the home pose and puts everything to sleep. A ball or a falling piece wakes what it touches. [high]

### 2.4 Real limits, in the Lab's own words and numbers
| Limit | Number | Where from |
|---|---|---|
| Pieces | 1955 bricks stand (0.21), 15 fps on the iPad when awake, smooth to about 460 | iPad run, real [high] |
| Tunnelling | balls have CCD; bricks do not. No test of a fast brick. | sim.js [high] |
| Stacking | a one-brick wall 10 times taller than thick falls by itself; needed 6:1 proportions, interlocking courses, no loose-rafter roof | BRICKLAB.md [high] |
| Ball cap | 48 balls drawn per kind | index.html [high] |
| Determinism | same build, same seed, same hash on Node, Chromium and the iPad | iPad run [high]. Different builds give different hashes |
| Sag | 3 to 16 mm of soft-contact sag in the first 1.5 s, baked into the home pose | phys-test [high] |

### 2.5 Materials and ammo in the code
Plain tables in `sim.js`. `KIT`: brick, plank, post, beam, tile, crate with `hx hy hz` half sizes, `dens fr rest tex col`. `BALLS`: marble (r 0.09, density 8, bounce 0.45), big marble (r 0.16, density 20, bounce 0.35), acorn (r 0.07, density 3, bounce 0.25). Densities are relative, not kg per cubic metre. A marble is 3.4 times heavier than a brick. [high]

### 2.6 Base as text
`toText` writes one piece per line: `type x y z qx qy qz qw`, three or four decimals. `fromText` reads it back. A castle is about 20 KB, a cottage 12 KB. It round-trips in a test. Because the engine is deterministic, a base plus a shot list is a full replay. [high]

### 2.7 How the performance panel measures
- The corner panel shows pieces, awake, moved and fallen, and the average of the last 90 step times, measured with `performance.now()` around `sim.step()` plus the event drain. [high]
- The bench card also measures drawing alone (physics stopped) so it can say which one is the limit, and gives a verdict from the frame time: Smooth 18 ms or less, OK to 26, Slow to 40, Too slow above. [high]

### 2.8 Test results (Lab)
`phys-test.js`: 19 checks, all pass: walls stand (0.7 mm over 10 s for the 120 wall), a marble moves 5 bricks, a volley brings the wall down, determinism, sleeping, text round-trip. Page test and bench pass in software GL. [high]

### 2.9 Reuse, change, new
| Part | Verdict |
|---|---|
| Rapier 0.21 builds, vendor layout, `loadRapier` | reuse as is (I copied the plain 0.21 `.mjs` into `rubble/vendor/`, 4.3 MB; the SIMD build is a one-line swap) |
| Solver settings (6 and 2, error margins, lengthUnit) | reuse as is; rubble uses the same |
| `KIT` numbers, `toText`, `fromText`, `rng`, hash, `aimAt`, replay idea | reuse as is |
| Instanced meshes, fixed accumulator, sleeping skips matrix writes | reuse as is |
| `makeSim` | does not fit: it builds a cylinder table, uses Lab units and keeps balls in a separate list capped at 48. So I wrote `rubble/sim_terrain.js` (about 330 lines) with the same settings. Merge them later (2 days). |
| Table, settle, `maxDisp` | change: ground becomes tiled heightfields; settle must run until quiet |
| Ball list and cap | change: ammo recycling by age and a tier cap |
| Gravity and size | taste question: Lab units are a slow, big world. Rubble uses real metres and -9.81, bricks 30 x 12 x 20 cm |

## 3. What the prototype does (`rubble/index.html`)

Serve `games/living-islands/` over http (the page imports a module and a `.js` file from a sibling folder), open `rubble/index.html`. `?tier=ipad` or `?tier=radeon`, `?terrain=proc` forces the procedural ground, `?pieces=N`.

- Ground: the lee beach of island seed 9001, a 40 m window centred on island (-23, 29). Heights come from the world file by the page's own bicubic sampler, resampled to 0.5 m. Ground type per 2 m cell comes from the shore and vegetation arrays: sand, shingle, turf, rock. Wet sand is drawn and simulated from the tide line. If the world file does not load, a procedural beach with the same layout is used and the page says so. [high]
- Stand-in layer (labelled, because the island's 2 m grid is very smooth): fine noise, a V gully, a hollow, a shingle berm at the wrack line, two rock outcrops, a levelled pad for the brick block. The island has no rock or shingle in this window, so those two are painted. [high]
- Launcher on the beach (a plain catapult). Tap the ground to aim, power slider, nudge buttons, a dotted arc. Hold Fire to repeat at the ammo's rate. [high]
- Ammo: acorn burst (10 a second), marble, coconut, tin lid (flat, spinning), glass float, bottle (rolls in an arc), big rod (a 1.3 m, 12 kg driftwood log). All harmless things from the hard rules. [high]
- Targets: a brick block on the pad (wall of 6 to 8 courses, deeper as the pieces slider goes up), rows of tin cans on the slope, and wash-up (bottles, tins, lids, floats, sticks, crates, coconuts) laid along the wrack line. [high]
- Pieces slider with a tier: iPad tier caps at 250 and 40 live shots, Radeon tier goes to 4000 and 400 live shots. Ground override (all sand, all wet sand, all shingle, all turf, all rock). Tide slider and an auto tide. [high]
- Performance panel: pieces, awake, live shots, physics ms per frame and per step, frame ms, fps, triangles, draw calls, guard rescues. [high]
- Replay slow: rebuilds the scene and plays the logged shots again at a quarter speed with interpolation. Stop skips to the end. At the end the hash is compared with the live hash. [high]
- Bench: a button opens a warning (save your work first, it can freeze the tab) and the user presses start. Levels go 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 4000 pieces (iPad tier stops at 250). Each level builds, warms up, then fires a scripted volley for 90 frames and records frame and physics times. It stops by itself when the frame time is over 100 ms for 5 frames in a row. The report is plain text with a Copy button, the GPU name, the replay code and a clear WARNING when the graphics are software. It finds two numbers: the last level that is smooth (about 60 fps) and the knee (30 fps or better). [high]

## 4. Physics findings from the prototype tests

Tests: `rubble/test_terrain_physics.js` (pure Node, 30 checks, all pass) and `rubble/test_page_smoke.js` (Chromium, software GL, zero console errors). Raw numbers: `test_results.json`.

| Test | Result |
|---|---|
| Determinism with a seed | same hash on two runs, different seed gives a different hash [high] |
| Energy | a marble dropped 2 m on rock gains at most 2.2 percent at first contact (soft-contact push-out), bounces 0.41 then 0.08 m; a woken scene of 117 bodies gains none (0.04 J of 3860) [high] |
| Ball on an 11 degree ramp | rolls 17 m down and stops 0.07 m from the bowl centre of a hollow, asleep after 16 s [high] |
| Rod rolls straight | 8 m on a 12 degree slope, 0.11 m sideways, axis turned 1.6 degrees [high] |
| Rod wedges | dropped across a 0.9 m V gully it bridges it, asleep, centre 0.5 m above the floor [high] |
| Rod in a V trench | rolls in and settles within 1 cm of the trench line [high] |
| Friction differs by material | a sliding crate stops after 0.30 m (dry sand), 0.34 (shingle), 0.37 (rock), 0.41 (wet sand), 0.46 (turf). A rolling marble goes 1.9 m on dry sand, 2.1 shingle, 2.9 turf, 3.9 wet sand, 6.6 rock. Bounce from 1 m: 0.06, 0.06, 0.11, 0.10, 0.21 m [high] |
| Sleeping | 1000 pieces asleep 0.62 ms a step, all awake 7.9 ms; woken bodies are asleep again within 10 s except 13 of 1000 [medium] |
| 1000 random drops | none ends below the ground; 3 leaked and were put back by the guard. With the guard off, 88 samples were below ground, all tin lids [high] |
| Tide | coconut and log float, marble sinks, coconut rises 1.2 m with the water, and ebbing leaves it stranded and asleep on the beach [high] |
| Brick block | 113 bricks stand 10 s on the levelled pad, 0.00 cm movement; 38 cans stand on the slope [high] |
| Rapid shots | 300 acorns that do not collide with each other 0.65 ms a step, colliding 2.29 ms [medium] |

Engine problems found, and what I did:
1. **Rapier's cylinder shape falls through heightfields.** About 20 percent of random cylinder drops, even on a flat plane, at low speed. A convex prism of 24 sides does not. Cans, bottles and lids are prisms now. [high]
2. **A heightfield has no thickness.** Thin bodies (a 4 cm lid) tunnel, and bodies crushed under others get pushed through. Soft CCD, more solver iterations, other contact settings and CCD substeps did not remove it (tried each; the best, 8 CCD substeps, cut leaks by about 70 percent and still left some). The guard moves any awake body whose centre is more than 6 cm under the surface back onto it and counts it. In the build test the guard fired 0 times for 100 pieces, 1 for 250, 4 for 500, 23 for 1000, 97 for 2000 and 209 for 3948. Wash-up laid in two or three layers on a small area was much worse (about 1 in 7) before I spread it wider and let each layer settle. [high]
3. **Rapier's sleep test never passes for thin rods under rolling resistance.** Their spin is high at tiny speeds. A rolling body held still by the ground for half a second is put to sleep by hand. Without this, about 60 of 1000 wash-up pieces (the thin ones: sticks and bottles) were still awake after a minute. [high]
4. **Rolling resistance had to be written.** Constant slowing, same fraction on speed and spin so a roll stays a roll, scaled so the number means "stops where the slope tangent is below it". Values are guesses (dry sand 0.16, shingle 0.12, turf 0.07, wet sand 0.045, rock 0.012). [medium]
5. **The ground mesh and the physics share one grid**, so what you see is what the bodies touch. The heightfield's own triangle split differs from my bilinear height by up to 1.6 cm; the guard threshold sits above that. [high]
6. **Tile materials are coarse.** One type per 2 m tile, and the wet line moves tile by tile. The drawn wet line is smoother than the physical one. [high]

## 5. What it would take (answers to the brief)

**Uneven terrain.** Heightfield from our height array: done. Per-cell material from veg, shore, rock and wetness arrays: done for four types plus wet; rock type (sandstone flag, mudstone) could set friction too. The real page needs the window to follow the player (stream tiles in and out) or a heightfield per island; 400 tiles for 40 m is cheap, 256 m at 2 m tiles is 16,000 colliders, which is not. Use bigger tiles away from the action. [medium]

**Balls, rods, bottles and tins rolling and wedging.** Balls and rods roll and wedge in the tests. Cans, lids and bottles need convex prisms. A bottle rolls in an arc because its neck is a second, thinner collider. Wedging comes for free from contacts. The missing part is sand sinking: a ball partly buried. The rolling resistance stands in for it. [high]

**Rapid-fire small shots against big rods.** Two bodies kinds, one engine. Small shots: no collision with each other (collision groups), a live cap by tier, recycle the oldest, go to sleep fast. Big rods: few, heavy, continuous collision on. A harder step is a ballistic-dot path for hundreds of shots a second that only turns into a body on contact; not built. [medium]

**Tide.** Buoyancy and drag per body from a tide height: built, 20 lines. Floating, stranding and wake-up when the water rises work. Not built: waves and the real sea surface of the page (`li_sea.js`), currents, and the Great Wash depositing debris along the wrack line by flow. Those need the sea height and flow field handed to the physics each step. [medium]

**Different base materials and toughness.** Material is a table row: density, friction, bounce (as in `KIT`). Toughness is not in Rapier. Plan: turn on contact-force events, and when a piece takes more than its limit in one hit, swap it for a few smaller pieces (a plank into splinters, a glass float into harmless confetti). Sandbags: small boxes with high friction and low bounce. Not built. [low]

**Brick by brick on the Radeon, fewer on the iPad.** One data switch: tier sets pieces cap, live shots, shadow size and pixel ratio. Built.

**Deliberate slow-motion replay.** Built and tested (section 4, finding 9 and 10).

## 6. Budgets (software numbers only)

Node here is a shared cloud core, one thread. Harry's real iPad run of the Lab's block of 460 bricks (0.21 plain) took 4.3 ms a step while crumbling; the same block took 3.15 ms in Node here. So the iPad is about 1.4 times slower than this core for plain 0.21 and, with SIMD, about as fast (2.5 ms). Read the iPad tier as: multiply the Node numbers by 1.4 for plain 0.21. A guess for the island scene, not a measurement.

| Pieces (wash-up, cans, bricks) | Node ms per step, average / worst, peak awake | Verdict for 60 fps if physics may take 4 ms |
|---|---|---|
| 100 | 0.30 / 1.1, 51 | fine on any tier |
| 250 | 0.69 / 4.6, 118 | iPad tier cap (about 1 ms on an iPad if the 1.4 guess holds) |
| 500 | 1.31 / 6.6, 230 | fine on the Radeon |
| 1000 | 3.47 / 15.7, 487 | fine on the Radeon |
| 2000 | 4.64 / 20.1, 960 | Radeon, with sleeping and short bursts |
| 3948 | 15.16 / 73.7, 1518 | over budget while about 1500 are awake; fine when most sleep. Two runs gave 10.5 and 15.2 ms: this core is noisy |

Draw side, software GL, 4000 pieces: 323,000 triangles in 14 to 18 draw calls (one instanced mesh per kind). That is over the iPad's 150,000 triangle budget at 4000 pieces and fine at 250 (about 34,000 triangles, 17 draw calls). Real GPU frame times: not measured, not claimed. [medium]

Build time, Node: 250 pieces 0.3 s, 1000 pieces 1.3 s, 4000 pieces 7 s (the build settles for 1.7 s of simulated time first). A big build must not run inside one frame. [medium]

## 7. Ranked work plan (developer days, guesses)

| # | Job | Days |
|---|---|---|
| 1 | Make the ground tile builder a shared module the island page uses (same sampler as the mesh, window follows the player) | 2 |
| 2 | Ground materials from veg, shore, rock, wetness and tide; tune the numbers by feel; per-ground sound later | 2 |
| 3 | Leak guard and pile policy: lay-down rules, layered drops, tests; thicker lids; look again at a thick ground made from prism columns | 2 |
| 4 | Ammo kit as data (7 kinds, sizes, speeds, rates), launcher, aiming for touch, recycling, tier caps | 3 |
| 5 | Cheap rapid-fire path (groups, sleep fast, optional ballistic dots that become bodies on contact) | 3 |
| 6 | Tide hookup to the page's sea height and waves, wrack line deposit, the Great Wash debris | 4 |
| 7 | Materials and toughness (contact-force events, break into smaller pieces, sandbags, planks, tin) | 4 |
| 8 | Replay: record format with the Rapier build tag, slow-motion player, share a base plus shots | 2 |
| 9 | iPad pass on a real device: SIMD build with fallback, pixel ratio, shadows, first-second build spike, heat | 2 (needs Harry) |
| 10 | Merge `rubble/sim_terrain.js` with Brick Lab's `sim.js` into one shared module | 2 |
| 11 | Integration in the island page: world coordinates, camera, living with waves, robots and weather, a robot crew at the launchers | 6 to 8 |
| | Total | about 32 to 34 |

Order: 1, 2, 3 first (nothing else is trustworthy without them), then 4, 8, 9 (something Harry can press on the iPad), then 5, 6, 7, then 10 and 11.

## 8. Risks
- The leak problem is an engine property, not a bug I can fix here. Heavy piles on a heightfield will always need the guard. A thick ground (prism columns) is the real fix and is untested. [high]
- Rapier 0.21's cylinder bug may be fixed or changed in a later release; a rebuild changes every replay hash. Pin the build and tag every replay. [medium]
- Cross-device determinism holds for the Lab on one iPad. Rubble's code `8ab9af4f` is not yet read from a device. [medium]
- Streaming ground tiles around the player could pop bodies in and out. [medium]
- Scale: 2 m cells are far coarser than 30 cm bricks. Gullies and cobbles come from a stand-in layer, not from data. A real "digging in" ground edit would have to update tiles live. [high]
- Heat and battery on the iPad with many awake bodies are unknown. [low]
- Brick Lab untouched means two copies of the sim until job 10. [medium]

## 9. Open taste questions for the owner
1. Size of the world: real metres with 30 cm blocks (Rubble now), or the Lab's slow, big, chunky feel?
2. Which ammo do you want first? The seven here are acorn burst, marble, coconut, tin lid, glass float, bottle, big rod. Anything to cut or add (pine cones, shells)?
3. How fast should a ball stop on sand? Now a ball stops on dry sand wherever the slope is gentler than about 9 degrees (so on most of the lee beach), and wet sand lets it roll on. Too sticky, too slippery?
4. Toughness: should a hit plank splinter, or just fall apart into its pieces? Should anything shatter at all (glass floats into confetti)?
5. Should the tide wash a sand fort away, and how fast?
6. Replay: a button only (as now), or also a "save the best crash" list to share with a friend?
7. Pieces on the iPad: is 250 enough to feel like brick by brick, or should we trade shadows and wash-up for more bricks?

## 10. Castle Sound (read after the audit, 25 Nov)

Read from `origin/gh-pages`, folder `living-islands-lab/castle-sound/` (`game.js` about 20 KB, `sim.js` 17 KB, `yard.js`, `START_HERE.txt`). Not edited. I did not run it; this is a code reading, so every line is [high] for what the code says and untested for how it plays.

**Rapier or Brick Lab's own sim?** They are the same thing. Brick Lab's `sim.js` is a thin layer on Rapier, and Castle Sound ships that file unchanged (its header still says Brick Lab) and loads Rapier 0.21 SIMD with a fall back to plain 0.21. So the question is whether to keep the Lab's layer or call Rapier directly for the island. Rapier is the base either way, and I tested it on the island ground: heightfield from the seed 9001 array, per-tile friction and bounce, rolling, wedging, sleeping, CCD, tide (sections 3 and 4). The Lab's layer cannot do the island ground as it stands: it hard-wires a cylinder table and Lab units. Castle Sound works around that by removing the table and adding flat fixed cylinders for its islands (radius 1.54, a flat top). Piece counts and software physics ms for the tiers are in section 6 (iPad tier 250 pieces, 0.7 ms a step in Node; Radeon tier up to about 4000 pieces, 5 ms at 2000, 10 to 15 ms at 3948 with about 1500 awake). Software numbers only.

**What Castle Sound already does that this plan wanted**
- A real, playable loop on the Lab engine: two forts, a bell to knock down, sixteen shots, a draw rule. [high]
- Ammo variety by rig: lobber, flat flinger, and a scatter popper that spends one round for three acorns; a hopper cycles marble, big marble, acorn. [high]
- A replay button (see below), 'Grand ramparts' (extra physical outer walls for both players), three fort kits (Tide Gate, Needle Keep, Twin Piers), a repair post with three positions. [high]
- A two-seat relay: the host runs the simulation, the guest sends aim and power and watches the host's poses. The server is local Wi-Fi only and was left out of the deploy. [high]
- SIMD with fallback, pixel ratio capped at 1.6, 1024 shadow map, instanced meshes (384 per kind). [high]

**What I looked for and did not find**
- Material toughness. There are no hit points or breakage in `game.js`. Pieces come from the Lab's `KIT` (wood, tile, crate); kits differ by layout, not by material. Toughness in my plan (section 5) is still all to do.
- A true replay. It records a sampled pose every 4 steps and plays the poses back at 9 a second. That shows the shot again, but it is not a re-simulation: no exact slow motion, no shareable shot list. The deterministic replay in `rubble/` is the other half.

**What it lacks for the island game**
| Island need | Castle Sound | Rubble prototype |
|---|---|---|
| Terrain | flat cylinders, solid ground | heightfield from the world file, tiled materials |
| Rolling, sticking, wedging | none by design (flat) | rolling resistance, gully, hollow, trench tested |
| Tides, floating, stranding | a flat sea at a fixed height, no physics | buoyancy and stranding tested |
| Materials | the Lab's three kits | five ground types; base materials still a table row |
| Robots, weather, waves | none | none |
| Budgets | 384 per kind, small forts | tiers 250 and 4000 with a bench that finds the knee |
| Slow motion | sampled poses | exact deterministic replay at 1/4 speed |
| Multi-player | relay (local) | none |

**Use of it:** take Castle Sound's turn rules, rigs, bell win rule, relay and Grand ramparts as the game layer; take Rubble's ground, materials, tide and replay as the physics layer. Merge job (section 7, job 10) should be done once, for both. [medium]

## 11. Pictures (`rubble/shots/`, software GL, 1180 x 760, honest captions)
- `rubble-1-start`: the start, 250 pieces. Flaws: the wash-up sits on a visible 0.8 m grid (jittered but still dotted); the beach is very pale; the frame is 160 ms because it is software GL.
- `rubble-2-volley`, `rubble-3-rods`: shots in flight and a big-rod hit on the brick block. Flaws: stills show little motion; the launcher is cut off by the buttons on a short screen.
- `rubble-4-rock-hightide`: ground forced to all rock, tide +0.80. Flaw: the whole island turns one salmon colour, which is the point, but the sea is a flat plane with no foam.
- `rubble-5-ipad-tier`: iPad tier, 250 pieces, 40 live shots. `rubble-6-radeon-4000`: 3948 pieces, 322,850 triangles, 18 draw calls. Flaws: at high tide most of the lower wash-up floats, so it reads as a mess; the test left the tide at +0.80.
- `rubble-7-replay`: the replay banner. Flaw: the test replay was only a few steps long because software GL runs few steps; the long replay is proved in Node (560 steps).
- `rubble-8-bench-warning`, `rubble-9-bench-report`: the warning and a finished software-GL report. Flaw: panels overlap the scene behind them.
- `rubble-10-procedural`: the procedural fallback. Flaw: it is flat and plain; the first version sat below sea level and was drawn all under water, fixed.

## 12. Fort target (Rubble, 26 Nov)
The loose beach pieces had nothing big to fire at, so Rubble now builds one fort: Wall, Tower or Castle, from stacked bricks and beams with a bell on top (`rubble/fort.js`, tests in `rubble/test_fort.js` and `rubble/test_page_smoke.js`).
- **Exact count.** The Pieces slider (40 up to 20,000 in steps) is the piece count: the fort has exactly that many bodies (bricks, beams and one bell). A footing of flat bricks round the foot takes up what the shape cannot, so the count is exact. A loose Rubble field is a switch, off by default, counted apart.
- **Brick size.** (Superseded by section 13: bricks are now always full size, 0.30 m, at every count.) This first version used half or quarter size bricks above about 2,000 pieces because the pad was about 5 m by 5 m. Stacks above 15 courses leaned or fell in test with the Brick Lab solver settings (6 iterations, 2 PGS; 8 or more made it worse), so height is capped and big forts are wider rather than taller.
- **Settle.** The fort is built whole, then settled for at least 1 s and until under 1 percent of the bodies are awake (at most 10 s), then put to sleep. The page shows Settling... and then Ready; shots wait. If drift after the settle is over 12 cm it is rebuilt once with tighter joints and the page says so (never needed in test).
- **Win and score.** Bell down = it fell more than 0.32 m. That is Castle Sound's number, and its bricks are the same 0.30 m ones, so its units are metres. Pieces moved = displaced more than 0.20 m (a brick width). Standing = the rest. Shots used. Rebuild resets the same seeded fort (same hash every time) and the replay code still matches (`fortCode`, Node and Chromium agree).
- **Numbers (Node, software only, one shared cloud core, plain Rapier). NOT iPad numbers, not any real device.** A settled castle asleep costs 0.17, 0.35, 0.66 and 1.26 ms per step at 250, 1,000, 2,000 and 4,000 pieces. Once a rod wakes it the whole connected fort is awake and costs 1.3, 5.0, 16.3 and 51.8 ms per step. At 8,000, 12,000 and 20,000 it costs 92, 181 and 511 ms per step awake: they build and settle but would not run in real time here. The owner's iPad ran 4,000 pieces fine; that is a report, not something measured by these tests. Every shape settles and sleeps at 250, 1,000, 4,000 and 8,000; the castle also at 12,000 and 20,000.
- **Honest limits.** A hit wakes the whole fort (Rapier wakes a whole touching island), so the cost under fire is the awake number, not the asleep one. The ground under the fort is the existing levelled pad; the fort is not yet fitted to uneven ground (it checks the spread under it and reports it; on the pad it is under 1 mm).
- **Look.** A Pretty / Plain switch (Pretty is the default; `?look=plain`) carries over Castle Sound's warm sky, water shader, wood photograph and bell, with a mortar-lined brick skin, a flag and a small windmill. One InstancedMesh per kind stays, so draw calls stay low. The look never touches the physics (the hash is the same in both).

## 13. Grand Fort (Rubble, 26 Nov)
The owner's iPad plays 4,000 pieces without trouble and he wants an absolutely huge fort. Work is in `rubble/` only (`fort.js`, `terrain.js`, `sim_terrain.js`, `index.html`, `test_grand.js`, `test_fort.js`, `test_page_smoke.js`). Hopeful, cosy: bricks and bells.
- **Full-size bricks at any count (item 1).** The shrinking is gone: every count from 40 to 20,000 uses the 0.30 m brick (kinds `brickh`/`brickq` removed). More pieces now means a bigger footprint, thicker walls, more towers, and the same 15-course limit for Wall, Tower and Castle. The count stays exact.
- **Bigger ground.** The old levelled pad (5.2 m by 4.8 m) cannot hold 20,000 full-size bricks, so the site gets `leeSite(isl, { grand: true })`: a levelled turf pad of 27 m by 21 m (centre z -7, blend margin 1.6 m) cut and filled in the stand-in sculpt layer. This is not real data: the real 2 m heights are not that flat, so the shelf is invented (measured: it fills up to 1.05 m at the south edge and cuts up to 0.68 m at the north edge, a terrace). Its tiles are forced to one ground type (turf) so a fort never stands half on sand and half on rock. The page and `test_fort.js` / `test_grand.js` use it; the old small pad is still the default of `leeSite()`. The fort fits the pad's size (`site.sculpt.pad`). The windmill and flag moved off the pad. Side effect: the loose-piece replay code changed (`43dc9b59`, in `test_fort_results.json`; the page smoke compares to that file now).
- **Grand shape (item 2).** An outer curtain wall (crenelled, 1 to 6 bricks thick, up to 13 courses) with four corner towers and mid-wall towers about every 5.4 m, a gatehouse on the front facing the launcher (passage 0.6 m wide and 0.72 m high between two piers, laid as flush blocks; beams across it rest 0.3 m on each pier; solid above, 9 to 15 courses), an inner ward wall (flat topped, closed ring) and a keep that is battered: each tier one module (0.30 m a side) narrower every 3 courses, with a two-beam deck. Six bells: keep, gatehouse and the four corner towers. A corbelled arch was not used: a half-brick corbel needs half bricks, a lone end brick that overhangs 0.15 m falls (found in test: an opening in the ward wall and the top of the gatehouse both shed bricks until the ends were made flush), so the lintel is the robust form. The first gatehouse had its beams on a 0.15 m jamb zigzag and dropped them; piers laid as blocks fixed it.
- **Deterministic.** The shape is a pure function of seed and count (`design('grand', n, seed)`); another seed changes the bond pattern. Below 1,602 pieces there is not enough for a Grand fort, so the designer builds a castle of exactly that count and the page says so.
- **How tall can the keep go.** A keep alone on the pad, stands = settles with drift under 12 cm and no tilt. A plain 3-module (1.8 m) tower: 25 courses (3.0 m) stands, 30 does not. 5-module foot: 30 (3.6 m) stands, 33 does not. 7-module: 33 stands, 36 does not. 9-module foot: 36 courses (4.3 m) stands, 40 does not. They do not topple (tilt stays 0.000); past those heights they sink and slide more than 12 cm while settling, so the earlier cap of 15 courses was about lean for narrow stacks and is not the limit for a wide battered keep. The Grand fort keeps a margin: keep height cap 24 / 30 / 33 courses by foot width (the biggest fort has a keep of 31 courses, 3.7 m of brick, 4.1 m with the bell).
- **Bells.** `Bells down: x of 6` in the score (each bell counts as down after 0.32 m; the replay and hash cover all of them). `ses.bellDown` means the primary bell for the one-bell forts and every bell for the Grand fort.
- **Settle (page).** Settling... with a percent, and after 10 s of real time a line with steps, seconds so far and a request to wait for Ready before the first shot (shots are disabled until Ready). Measured: the page in software Chromium settled 10,000 pieces in 58 to 67 s over two runs. The settle runs 10 steps at a time, so at the top counts the picture freezes for about a second between updates.
- **Camera and aims (item 3).** The camera now grows its distance until all eight corners of the fort's box are on screen (a test checks it), the sun's shadow box follows the fort, wheel and pinch zoom reach 160 m. Quick aim buttons Gate, Tower (alternates the two front corner towers) and Keep turn the launcher to those bells; Fly round orbits the camera (about 0.22 rad per second); Big rod and Burst are kept.
- **Tests.** `node test_grand.js [--tall]` (56 checks): count exact at 2,000, 5,000, 10,000 and 20,000 (and 1,700 to 15,000), full-size bricks, nothing below ground, open gate passage, settled and asleep with all bells up, a big rod at the gate drops the gatehouse bell (3 rods at every count), deterministic design and replay code (`33227fdb` for the 3,000-piece fort), seeds 2 to 4. `node test_fort.js` includes the Grand shape; the page smoke (Chromium, software GL) checks zero console errors.
- **Numbers (Node, software only, one shared cloud core, plain Rapier). NOT iPad numbers, not any real device.** Physics ms per step, settled fort asleep / awake after a hit (three rods at the gatehouse, 4 s): 5,000 pieces 1.6 / 49.8; 10,000 pieces 2.7 / 131.4; 20,000 pieces 8.6 / 163.3 (2,000 pieces 0.6 / 16.3). A hit wakes nearly the whole fort (11,480 of 20,000 bodies awake at peak). Build and settle in Node: 2,000 5 s, 5,000 19 s, 10,000 60 s, 20,000 171 s (most of it creating the bodies).
- **Draw cost (Pretty look, 10,000 pieces, software GL counts).** See the page smoke: one InstancedMesh per kind (brick, beam, bell and the rest), 135,030 triangles and 13 draw calls in Pretty (134,314 and 7 in Plain).
- **Honest limits.** Nothing here says how it runs on an iPad; the owner's 4,000 is a report. 20,000 full-size pieces will probably be slow to settle on a tablet (Node needed minutes), so Grand forts above about 5,000 should be tried on the device with Bench first. The fort heights are small (the Grand fort is 1.3 to 4 m tall) because the bricks are 12 cm high. Not done: a real corbelled arch (needs half bricks), a gate that can be opened, Grand forts under 1,602 pieces.

## 14. Keep the Bell, and better flight (Rubble, 26 Nov)
The owner's idea: destroy as much of the base as you can and leave the bell standing. Work is in `rubble/` (`fort.js`, `sim_terrain.js`, `index.html`, `test_keep.js`, `test_flight.js`, `test_page_smoke.js`). Software numbers only, none of this says how it runs on an iPad.
- **Mode and perch.** A switch `Topple the bell` (the old game, default) or `Keep the bell` (`?mode=keep`). In Keep mode the shape's own core and extra bells are dropped and one bell stands on its own perch: a pillar of bricks, 4 modules (2.4 m) wide at the foot at 2,000 pieces, one module narrower every three courses down to 2 modules (1.2 m), 16 courses, a two-beam deck, the bell on top. The size grows with the count (3, 4, 5, 6 modules and 14 to 18 courses at 1,500, 4,500 and 9,000 pieces). The rest of the shape (walls, towers, ward) is grown to the count minus the perch, held lower than the perch, kept clear of its footprint, and any piece left overhanging a gap by the cut is pruned (a first try without pruning let a cut wall collapse). Keep mode needs at least 1,000 pieces (the page raises a lower count and says so). The perch alone stands, settles and does not creep at 2,000, 5,000 and 10,000 (drift 6 to 8 cm, bell moved under 0.1 mm over 10 s awake), so the bell was not made heavier. The whole fort has the exact count and settles for castle 2,000, 5,000, 10,000, wall, tower and grand.
- **Score and round.** `Knocked out: x percent` (pieces moved more than 0.20 m or lost off the island, not counting the perch or the bell), `Bell: standing` or `Bell down`, shots left (12 by default, slider 6 to 40), stars: bell standing 1, from 50 percent 2, over 80 percent 3 (exactly 80 is 2), none if the bell fell. When the bell falls 0.32 m the round ends with `Bell down, try again` and Rebuild; after the last shot or Done the round waits for the bricks to rest (2 to 10 s of simulated time) and shows the result. Best per shape and count is kept in localStorage inside try/catch (a blocked localStorage still plays). The round logic is `ses.keepState` in `sim_terrain.js`, so the Node test and the page agree.
- **Ammo cards.** Each ammo is `strong` or `gentle` by its energy at full power (0.5 m v squared, 1,000 J): tin lid and bolt are strong; acorn, marble, coconut, glass float and bottle are gentle. A card under the ammo row says what that means for the perch.
- **Measured (Node, castle 2,000, 12 shots spread along the front wall, after the flight changes below):** 12 marbles knock out 6.2 percent of the base (20 percent of the front wall), 12 tin lids 8.6 percent (22 percent of the front wall, 3 perch bricks nudged), 12 bolts 12.1 percent (40 percent of the front wall); the bell stood in all three, and a bolt aimed at the perch dropped the bell with the first shot. Before the flight changes the same lids did 13.2 and the rods 6.9 percent. 40 scripted shots at the thin 1,000-piece wall reached 47 percent with lids. So 80 percent is a hard goal on purpose: the walls are real stacks, a shot moves about a dozen bricks, the far sides cannot be reached from the launcher. If it feels too hard, change `KEEP_RULES` or lower the count; it is one line.
- **Bug found on the way.** A piece thrown off the island is removed from the physics (the window guard); `score()` then crashed on its dead body. It now counts a lost piece as knocked out and a lost bell as down.
- **Bolt (B1).** The Big rod is now the Bolt (id `rod`, label changed): thrown along its velocity with a slow spin about its own axis (6 rad/s, no random tumble), 1.1 m long, 12 kg, quadratic drag (0.002 per m) and a weathervane each step in the air (angular velocity += 24 x speed x axis-cross-velocity x dt, the sideways spin damped), which stops at the first knock. `qFromTo` tilted the long axis the wrong way (it also did so for the bottle); fixed. Over 200 scripted launches (6 to 15 m, four powers) the axis stayed within 6.95 degrees of the velocity until first contact (the same launches without the weathervane reach 165). Four bolts at fresh 3,000-piece Grand forts hit the gate within 0.24 m sideways and up/down. `aimAt(..., fly)` now allows for drag and lift by a secant search with the physics' own stepping. Pointed or blunt head is a button (looks only).
- **Other ammo (B2).** Acorns and marbles: no spin, drag 0.0006; coconut: 5 rad/s about its flight direction; tin lid: spin 30 and a small lift (17.2 m against 16.6 m without it); glass float: natural tumble, light drag; bottle: neck first, within 4.4 degrees of its flight. Pretty look: a fading streak per shot in the air, one `LineSegments` (one draw call, no triangles: 250 pieces gave 8 draw calls and 16,718 triangles before, 10 calls and 17,154 triangles with trails and a flying shot, software GL counts, not an iPad). Switchable with `Trails`.
- **Aim line (B3).** The faint arc is the first 0.67 s as `predict()` flies it (gravity, damping, drag, lift); a test compares it with the real first 0.5 s for all seven ammo at four aims: within 5 cm (worst per kind in `test_flight_results.json`). A power bar and `Aim line: on/off` switch it. The shot's own random spread is not drawn.
- **Replay codes changed on purpose** (the Bolt and the other flights change the physics): loose 43dc9b59 to 4839943c, fort bcdf5115 to 2441ab8d, grand 33227fdb to 921f8e08 (all in `test_fort_results.json` and `test_grand_results.json`, the page smoke checks that Chromium agrees). The older `test_results.json` (terrain physics test) still holds its old code and was not re-run.
- **Tests.** `node test_keep.js` (31 checks), `node test_flight.js` (14 checks), `node test_fort.js` (82), `node test_grand.js` (40), `NODE_PATH=$(npm root -g) node test_page_smoke.js` (add `--keep-only` or `--flight-only` for the new parts; Chromium software GL with SwiftShader).

## 15. Fort juice and HUD (Rubble, 28 Nov)
The owner said the mechanics are cool but it is not fun to look at. Look and UI only: no physics file, no replay code touched (the codes are still loose 4839943c, fort 2441ab8d, grand 921f8e08). Work is in `rubble/` (`index.html`, new `juice.js`, `hud_audit.js`, `test_hud.js`, `test_juice.js`, `test_hit_replay.js`, `test_look.js`, the page smoke).
- **HUD.** A top row (gear, mode switch, Rebuild, Done in Keep), a score strip of four pills (knocked out percent, bells down x of n, shots or shots left, standing or stars), and a bottom dock: Gate / Tower / Keep chips, a Power slider, seven round ammo buttons with drawn SVG icons (no images), Big bolt, Burst and a round FIRE. Everything else (pieces, shape, rubble, tier, tide, ground, look, juice, shake, trails, bolt head, shadows, aim line, fly round, nudge arrows, Replay slow, Bench, the perf numbers and the tested-up-to text) is in a Settings drawer that is closed while you play (gear button, Escape or the scrim closes it). `test_hud.js` (49 checks) opens the page at 834 x 1062 touch, 1280 x 720 and 700 x 460, in Topple and Keep, and checks that every visible control is on screen, at least 44 px each way and overlaps no other control or text block, with the drawer closed and open (and with Replay the hit showing).
- **Juice** (`juice.js`, on in Pretty, off in Plain, one Juice switch in the drawer). Dust puffs and brick chips on any sudden drop in speed between two frames (read from the positions the physics already has), a small camera shake on a big hit (0.06 m at most, gone in a quarter second, its own switch), ring waves and a glow when a bell is hit or falls, confetti and a flash when the bell falls in Topple or on three stars in Keep, score pop-ups (`+12%`, `Bell down!`). One pooled `THREE.Points` (640 particles) and one 10-quad `InstancedMesh`, both hidden when idle: iPad tier at 4,000 pieces, software GL: 11 draw calls and 62,436 triangles in Pretty with the juice idle, 13 calls and 62,456 triangles while it plays (+2 calls, +20 triangles). Pop-ups and the flash are CSS animations. Nothing is allocated per frame: after warm-up 3,000 busy frames moved the heap by about 70 KB (some of that is the test's own loop); spawning an effect does allocate a little, once per event.
- **Replay the hit.** A gold button when the bell has fallen (Topple) or on three stars (Keep). It reuses the existing replay: the scene is rebuilt, the early shots run fast (about 40 ms of physics a frame), the last shot plays at a quarter speed (a few steps before the shot until 50 steps after the bell is down, or 150 steps after the shot in Keep) with a close camera that follows the bell or the shot, then it catches up and ends on the same hash at the same step as the live game, and the camera goes back where it was. Skip replay ends it early. Slow motion exists only in a replay (a test reads the source: the quarter speed is used in one branch).
- **Look.** Pretty only (Plain is the old look, for comparing Bench numbers): each brick has its own warmth and brightness, a few pale and a few dark ones, and the courses near the ground take a moss tint and wear (instance colour, still one InstancedMesh per kind); red pennant banners that sway on the highest brick beside each bell and at the far corners (one `InstancedMesh`, ridden on bricks so they tumble with them); two lanterns on the front wall; foam along the waterline found by marching squares over the ground grid and rebuilt when the tide moves; a richer sunset sky and a warmer sun, and the far water fades its stripes so it stops shimmering. +3 draw calls in Pretty (banners, lanterns, foam). Plain 7 calls and 61,094 triangles against Pretty 11 calls and 62,436 on the iPad tier at 4,000 pieces (software GL, counts only; not a real-device speed). The same shots and 300 steps give the same hash in both looks.
- **Tests I ran** (Chromium with software GL: `--use-gl=swiftshader --enable-unsafe-swiftshader --no-sandbox`): `test_hud.js` 49 of 49, `test_juice.js` 13 of 13, `test_hit_replay.js` 11 of 11, `test_look.js` 10 of 10, `test_page_smoke.js` (HUD, juice and Replay the hit added, controls in the drawer used the way a player does) all passed with zero console errors, `test_fort.js --bench` 87 of 87, `test_grand.js` 40 of 40, `test_keep.js` 31 of 31, `test_flight.js` 14 of 14.
- **What still looks wrong** (pictures `rubble/shots/rubble-30` to `rubble-37`, `rubble-40`): the island is still a flat bright-green table that stops at a straight line where the water starts, so the foam never shows from the default camera (it is on the real beach behind the launcher, turn the camera round); confetti and chips are hard-edged flat squares, dust puffs are faint; the lanterns are plain glowing boxes with no light on the bricks; bricks are still one flat texture with big flat tops; a Bolt that lands near the camera looks huge; the sea has a faint moire at a distance on a small screen. The 700 x 460 view is crammed (the aim chips, power slider and ammo cards take most of the height) though nothing overlaps. Nothing here was run on a real iPad.
