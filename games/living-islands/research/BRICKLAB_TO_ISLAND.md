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
