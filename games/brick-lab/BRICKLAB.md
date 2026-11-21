# Brick Lab: a real-physics siege, as a feasibility spike

Branch `game/brick-lab`, folder `games/brick-lab/`. The toy game in `games/sofa-siege/` is untouched.

## What it is

"Brick by brick, stick by stick." Every brick, plank, post, beam, roof tile and crate is its own rigid body in the Rapier physics engine (Rapier 0.14.0 compat build, Apache-2.0, saved in `vendor/rapier/` with Harry's yes). Walls stand by friction and weight and fall by real collisions. There are no hit points and no support rules. A round wooden table (same look as the toy game), a catapult you pull back to aim, and three balls with real mass: marble, big marble, acorn.

It is a spike to answer three questions: how hard is this, does it run on an iPad, does it look and feel good. The toy rule-based game stays the kids' and AR version. This would be a second version of the same engine.

## How to run

Serve the folder over http (the page loads Rapier as an ES module and the textures as images, so `file://` will not do):

```
cd games/brick-lab
npx http-server -p 8765 -c-1 .      (or any static server)
open http://localhost:8765/index.html
```

| Address | What you get |
|---|---|
| `index.html` | The game. Pick Brick wall / Tower / Cottage / Castle gate, press, drag back, let go. |
| `index.html?preset=castle` | Start on a preset. |
| `index.html?bench=1` | The benchmark for the iPad. Shows four big buttons first: Rapier 0.14, Rapier 0.21, Rapier 0.21 SIMD (greyed out, with a reason, if the device has no wasm simd128), or all three. A run does seven builds (wall 120, tower 153, cottage 234, castle 383, and three stress blocks of about 460, 1035 and 1955 bricks); each is 10 s standing still, five shots, 8 s crumbling, then a drawing-only pass. About 4 minutes per physics build in real time. The card for each build has, per row: pieces, how far it moved standing still, physics ms (avg / worst), frame ms, pictures a second, draw-only ms, which one limits (physics or drawing), and a plain verdict from the frame ms on that device (Smooth 18 ms or less, OK to 26, Slow to 40, Too slow above). With "all three" a one-line comparison at the top says which build is fastest on this device. Numbers are also in `window.__bench` (JSON) and there is a Copy numbers button. |
| `index.html?bench=1&rapier=014` (or `021`, `021simd`, `all`) | Skip the chooser. Add `&list=wall,castle` to run only some builds. |
| `index.html?bench=1&quick=1&rapier=...` | Same, but 12 physics steps per picture so it finishes fast on a slow machine. Frame numbers and verdicts mean little in this mode. Used by the tests. |
| `index.html?rapier=021` | The game itself on another physics build. |

The server must send `.mjs` files as JavaScript (`text/javascript`); a server that does not will make the 0.21 builds fail with a plain "cannot start" message (this bit the test server once).

In the game: top row builds a preset, "Build by hand" lets you tap the table to place a brick, plank, post, beam, tile or crate on a snapped grid (pieces stack, Turn rotates them, Undo, Clear), and Settle makes them real bodies so gravity takes over. "Base as text" shows and loads a base as plain text. Bottom row: ammo, Flat shot or Lob, a sweet band on the pull meter (green: no wobble; outside: a few degrees of random spread), camera turn and zoom. A sudden wave of fallen pieces gives slow-mo ("Crumble!" / "CRASH!"), impacts shake the camera and puff dust, the corner panel counts pieces, awake, moved and fallen.

Tests:

```
NODE_PATH=$(npm root -g) node tests/phys-test.js            (Node only, about 40 s)
NODE_PATH=$(npm root -g) node tests/page-test.js [--bench]  (Playwright, software GL)
```

## Files

| File | What |
|---|---|
| `sim.js` | The simulation layer, shared by the page and by Node. Kit, presets, world, text format, hash, the determinism run. No three.js, no DOM. |
| `index.html` | Page: three.js r128 (same as the toy game), instanced meshes, catapult, input, HUD, benchmark. |
| `vendor/rapier/`, `vendor/rapier-0.21-compat/`, `vendor/rapier-0.21-simd-compat/`, `vendor/three/`, `tex/` | Three builds of Rapier (all unmodified, Apache-2.0: 0.14.0 about 2 MB, 0.21.0 4.3 MB, 0.21.0 SIMD 4.6 MB), three.js r128 (copy of the file the toy game loads from its CDN), the toy game's wood/red/blue/tin textures. |
| `tests/phys-test.js`, `tests/page-test.js`, `tests/build-compare.js` | The tests. Results go to `tests/phys-results.json`, `tests/bench-quick.json`, `tests/bench-quick-all.json` and `tests/build-compare.json`. |
| `shots/brick-1..6.png` | Screenshots (software GL, 1180x820). |

## The build kit (all numbers in world units, 1 unit = 20 cm, so the table is 65 cm across)

| Piece | Size (L x H x D) | Density |
|---|---|---|
| brick | 0.30 x 0.12 x 0.20 | 1.0 |
| plank | 0.90 x 0.06 x 0.20 | 0.9 |
| post | 0.14 x 0.70 x 0.14 | 0.9 |
| beam | 1.20 x 0.12 x 0.20 | 0.9 |
| roof tile | 0.30 x 0.04 x 0.26 | 0.8 |
| crate | 0.30 x 0.30 x 0.30 | 0.7 |
| marble (ball) | radius 0.09 | 8 |
| big marble | radius 0.16 | 20 |
| acorn | radius 0.07 | 3 |

Presets: three stress blocks (10 courses, rows of 12 and 11 bricks, 4, 9 and 17 walls deep: 460, 1035 and 1955 bricks) and the four below. Brick wall 120 bricks (12 and 11 alternating, 10 courses plus a 5-brick cap), Tower 153 (round, 17 per course, 9 courses), Cottage 234 (brick shell with a door and a lintel beam, 12 beams across the top, 45 roof tiles), Castle gate 383 (two crenellated round towers with a gate wall between, a beam lintel over the opening).

## Results

All Node numbers are from this sandbox (a shared cloud CPU, Node 22, Rapier wasm). Browser numbers are Chromium with software GL (SwiftShader) on the same shared CPU, where the graphics also steal the CPU: **relative numbers only**.

### Does a wall stand? (Node, `phys-test.js`)

| Build | Pieces | Sag in the first 1.5 s | Then 10 s still: max move | Asleep by itself |
|---|---|---|---|---|
| Brick wall | 120 | 7.8 mm | 0.7 mm | 0.6 s |
| Tower | 153 | 2.8 mm | 0.1 mm | 0.6 s |
| Cottage | 234 | 15.7 mm | 1.0 mm | not within 10 s (about 12 to 20 s) |
| Castle gate | 383 | 11.5 mm | 1.2 mm | 5.4 s |

"mm" means millimetres at the 1 unit = 200 mm scale. The requirement was under 2 mm for the wall of 120: it passes (0.7 mm). All four presets pass the same 2 mm bar, but only after the soft-contact sag in the first 1.5 s, which is 3 to 16 mm and is baked in: the page runs that settle at build time, then puts the pieces to sleep and uses the settled pose as "home".

### Hits (Node)

| Shot | Bricks moved (of 120, moved means more than 30 mm) |
|---|---|
| Marble, 14 u/s | 5 |
| Acorn, 14 u/s | 1 |
| Big marble, 12 / 16 / 20 / 24 u/s | 11 / 20 / 22 / 21 |
| Volley of three big marbles, 16 u/s, left / middle / right | 77, and 108 bricks end up low on the table |

One ball punches a hole and shakes loose the bricks around it. More speed does not help much, because a ball only gives its momentum to what it touches. A volley brings the wall down. That feels right for a real wall.

### Determinism (Node, and Node against Chromium)

Same seed, same steps: three runs give the same hash (`9f08783c`) and the same positions to 1e-9. A different seed gives a different hash. The browser (Chromium, wasm) gives the same hash as Node, checked in `page-test.js`. All on one machine. A real iPad (Safari, ARM) has not been tested; the bench card prints the same hash so that Harry can compare it by eye (`9f08783c` for Rapier 0.14; the newer builds have their own hashes, see the build comparison).

### Cost (Node, ms per 60 Hz step, one thread)

| Bodies | Asleep | First 1.5 s after build (all awake, settling) | Collapse: avg / p95 / worst (3 big marbles) | Peak awake | Moved |
|---|---|---|---|---|---|
| 120 | 0.03 | 2.2 | 1.4 / 2.2 / 4.2 | 123 | 65 |
| 234 | 0.07 | 6.8 | 2.2 / 4.1 / 7.0 | 237 | 202 |
| 383 | 0.11 | 15.9 | 7.2 / 13.0 / 15.9 | 386 | 126 |
| 1000 | 0.41 | 20.2 | 14.5 / 19.1 / 34.2 | 977 | 841 |

The budget for 60 pictures a second is 16.7 ms for everything. Rule of thumb from these numbers: roughly 40 microseconds per awake body per step when most of it is in contact, about 20 when it is a loose collapse, near zero asleep. The worst moments are the first 1.5 s of a build and a collapse where everything touches.

### Benchmark page (Chromium, software GL, quick mode: relative only)

| Build | Pieces | Stood 10 s: max move | Physics ms avg (standing / crumbling) | Worst step (crumbling) | Peak awake | Moved / fell | Frame ms (SwiftShader) |
|---|---|---|---|---|---|---|---|
| Brick wall | 120 | 0.66 mm | 0.26 / 1.28 | 5.5 | 125 | 54 / 51 | 297 |
| Tower | 153 | 0.25 mm | 1.41 / 2.03 | 51.1 | 158 | 95 / 91 | 419 |
| Cottage | 234 | 0.94 mm | 4.55 / 3.57 | 12.9 | 239 | 138 / 125 | 435 |
| Castle gate | 383 | 1.29 mm | 10.61 / 8.87 | 35.4 | 388 | 36 / 30 | 451 |

The page runs the same four builds as the benchmark card for Harry: 10 s standing, then five shots (marble, big, big, marble, big) 0.67 s apart, then crumbling to 8 s. The "standing" physics average includes the seconds before the structure falls asleep (cottage: about 7 s, castle: about 8 s), which is why it is higher than the crumbling average for those. Worst-step outliers (tower 51 ms, cottage 42 ms) are single spikes on a shared, loaded CPU while SwiftShader draws; I have not tried to explain them. Determinism line on the card: `9f08783c`, equal to Node.

(Quick mode ran 12 steps per picture. The real-time mode, which the iPad will run, was only started, not run to the end: after 15 s on software GL it had simulated 2.2 s of the first 10 s stand (the page runs slower than real time when pictures are slow, by design, so the physics result is the same and the benchmark just takes longer). A full pass would take about 8 minutes here and says nothing about an iPad.)

### Stress blocks and the three Rapier builds

Harry asked how we know it is too much for an iPad: we do not. So there are now three stress blocks (about 460, 1035 and 1955 bricks) in the page and in the benchmark, and two newer Rapier builds saved next to the old one. **Node numbers are not iPad numbers. Harry's iPad physics was about twice as slow as this cloud core**, so double every millisecond below as a first guess, and use the benchmark card on the iPad for real figures.

Node, same scenes, `tests/build-compare.js`. Physics ms per step while five big marbles crumble each scene, average / worst, with steps per second in brackets (one thread on this shared cloud core; 60 steps a second is real time):

| Scene | Bodies | Rapier 0.14.0 | Rapier 0.21.0 | Rapier 0.21.0 SIMD |
|---|---|---|---|---|
| Brick wall | 120 | 1.19 / 4.4 (838) | 0.44 / 1.4 (2276) | 0.31 / 1.5 (3248) |
| Cottage | 234 | 3.00 / 8.8 (334) | 1.03 / 3.2 (974) | 0.73 / 5.0 (1374) |
| Castle gate | 383 | 7.17 / 16.1 (139) | 1.36 / 4.4 (736) | 1.10 / 3.4 (909) |
| Block 460 | 460 | 7.51 / 15.9 (133) | 3.15 / 8.4 (318) | 1.60 / 3.9 (627) |
| Block 1035 | 1035 | 23.42 / 50.5 (43) | 11.12 / 21.8 (90) | 4.80 / 11.9 (208) |
| Block 1955 | 1955 | 67.85 / 125.2 (15) | 30.46 / 54.0 (33) | 13.19 / 24.3 (76) |

Stand-still behaviour per build: sag in the first 1.5 s (mm) / biggest move over the next 10 s (mm) / all asleep at:

| Scene | Rapier 0.14.0 | Rapier 0.21.0 | Rapier 0.21.0 SIMD |
|---|---|---|---|
| Brick wall | 7.7 / 0.66 / 0.6 s | 4.0 / 0.00 / 0.0 s | 4.0 / 0.00 / 0.0 s |
| Cottage | 15.7 / 0.94 / 6.8 s | 6.5 / 0.00 / 0.0 s | 6.5 / 0.00 / 0.0 s |
| Castle gate | 11.5 / 1.29 / 8.2 s | 10.6 / 0.00 / 0.0 s | 10.6 / 0.00 / 0.0 s |
| Block 460 | 5.9 / 0.90 / 8.6 s | 3.9 / 0.00 / 0.0 s | 3.9 / 0.00 / 0.0 s |
| Block 1035 | 6.0 / 1.24 / not in 10 s | 4.0 / 0.00 / 0.0 s | 4.0 / 0.00 / 0.0 s |
| Block 1955 | 14.1 / 13.32 / not in 10 s | 4.0 / 0.00 / 0.0 s | 4.0 / 0.00 / 0.0 s |

Build comparison:

| | 0.14.0 | 0.21.0 | 0.21.0 SIMD |
|---|---|---|---|
| File to download | about 2 MB | 4.3 MB | 4.6 MB |
| Time to load and start | Node 90 ms, Chromium page 53 ms | Node 79 ms, Chromium page about 970 ms | Node 66 ms, Chromium page about 840 ms |
| Determinism hash (`detRun`, seed 1234) | `9f08783c` | `dd9f66ff` | `4b748a06` |
| Same hash on 3 runs in a row | yes | yes | yes |
| Same hash in Chromium as in Node | yes | yes | yes |
| Speed against 0.14 (collapse average over the six scenes) | 1x | 2.1 to 5.3 times faster | 3.8 to 6.5 times faster (1.3 to 2.3 times faster than plain 0.21) |
| Biggest scene that stands | 1035 (the 1955 block drifts 13 mm and never sleeps) | 1955 (4 mm sag, no later movement) | 1955 (same) |

The page load times are Chromium over local http, where the 4 MB wasm is decoded and compiled: about a second for the new builds, a possible extra cost on a tablet and on a slow network (twice the download). The Node numbers are the same decode on a faster path.

**Determinism: the three builds give three different hashes** (`9f08783c`, `dd9f66ff`, `4b748a06`). So 0.21 does not reproduce 0.14, and the SIMD build does not reproduce the plain 0.21 build. Each build is exactly repeatable against itself (3 runs equal, and Node equals Chromium). The page and the bench card print the hash of the build that is running. A replay must therefore record which build made it, and two devices must run the same build. Whether an iPad gives the same hash as this machine for the same build is still untested (the card prints it so Harry can read it out). SIMD arithmetic may legitimately give different last digits from the plain build, which is probably why they differ, but I have not confirmed the cause.

**API changes between 0.14 and 0.21.** `sim.js` needed no code change to run: `World`, `RigidBodyDesc`, `ColliderDesc`, `EventQueue`, `setBodyType`, `isSleeping`, `lengthUnit`, `numSolverIterations` and `numInternalPgsIterations` all work the same. What I found: the defaults `normalizedAllowedLinearError` (0.001 to 0.005) and `normalizedPredictionDistance` (0.002 to 0.02) were changed in 0.21, so `sim.js` now sets the 0.14 values on every build, so all are tuned alike (`keepDefaults` leaves the build's own; I ran both and the results were within a millimetre). `numAdditionalFrictionIterations` and `minIslandSize` no longer exist, and 0.21 has soft-body settings we do not use. All three builds load through `BL.loadRapier(key)` in `sim.js` (dynamic import in the page, `require` in Node, with a plain error for an unknown key). The SIMD build is checked first with `BL.simdSupported()` (it validates a tiny wasm module that uses simd128): on a device without it the bench chooser greys the button and says why, and `?rapier=021simd` shows "This device cannot run the SIMD build" with a Back link, not a blank page. In this sandbox the check says yes for both Node and Chromium.

**Does the stability tuning (gravity -9.81, 6 solver and 2 PGS iterations, damping) still hold?** Yes on all three, and 0.21 needs less. On 0.21 and 0.21 SIMD every scene stands with 4 to 11 mm sag and no later movement. On 0.21 the wall, castle and 1955 block also stand with Rapier's default solver (4 and 1, so cheaper) and with gravity -20, where on 0.14 gravity -20 collapses the wall and the 1955 block. So with 0.21 gravity could go up toward real toy scale and the solver effort down, which would be faster again; I did not retune or time that. One caution: on 0.21 everything is asleep within the first 1.5 s, so the "10 s still" figure there is 0 mm largely because nothing is awake any more. The sag and the crumbling results are the real tests. Worth checking by eye on the iPad that 0.21 does not put pieces to sleep too eagerly in the middle of a collapse; in these runs the volleys moved about the same number of bricks as on 0.14 (wall 87 against 71, castle 136 against 147).

**What this means for the iPad question.** On 0.14 with a 2x slower iPad, the 383-piece castle would cost about 14 ms per step while crumbling (7 ms here) and the 1035 block about 47 ms: Slow to Too slow. On 0.21 SIMD (if the iPad supports simd128) the same figures are about 2 ms and 10 ms, and even the 1955 block would be about 26 ms. That would put the big blocks in play. The iPad has to say so: run `?bench=1`, pick "all three", and read the line at the top and each card.

### Stress blocks in the page (Chromium, software GL, `?bench=1&quick=1&rapier=014`: relative only, not iPad)

| Build | Pieces | Stood 10 s | Physics ms avg / worst | Frame ms (SwiftShader) | Draw-only ms |
|---|---|---|---|---|---|
| Brick wall | 120 | 0.66 mm | 1.2 / 5 | 220 | 192 |
| Tower | 153 | 0.25 mm | 1.9 / 7 | 231 | 204 |
| Cottage | 234 | 0.94 mm | 3.4 / 8 | 280 | 232 |
| Castle gate | 383 | 1.29 mm | 8.7 / 22 | 384 | 267 |
| Block 460 | 460 | 0.90 mm | 6.8 / 30 | 351 | 236 |
| Block 1035 | 1035 | 1.24 mm | 20.7 / 40 | 607 | 350 |
| Block 1955 | 1955 | 13.32 mm | 61.0 / 126 | 1338 | 603 |

Here drawing (software GL on the same CPU) costs 190 to 600 ms a picture and dwarfs physics, so every verdict says Too slow and the Limit column says drawing; that is the software renderer, not the iPad. The point of these rows is that the card works: it measures drawing alone (physics stopped) separately from drawing plus physics, so on the iPad one can see which is the limit. On a 60 Hz screen the draw-only figure cannot go below 16.7 ms, so a draw-only figure of 16.7 means drawing is not the limit.

## Honest assessment

**Stability: does a wall stand?** Yes, but only after tuning, and this is the main finding. Out of the box it did not: a 10-high wall of bricks that were 0.15 deep and 0.14 high collapsed on its own. Four things mattered:

1. **Proportions.** A one-brick wall that is 10 times taller than it is thick will fall over from numerical noise alone. Bricks are now 0.2 deep and 0.12 high (a 6:1 wall).
2. **Gravity.** The soft-contact solver sags more as the weight above grows, and at -20 or -30 the 10-high stacks collapsed for any setting I tried. At -9.81 world units per second squared they stand. So the world falls like a world five times bigger (a 1 m wall, not a 20 cm toy one): slower, heavier-looking. Slow-mo is cheap to add and the camera makes it read as "chunky". Real toy-scale gravity (49) would need a different solver setup that I did not find.
3. **Solver effort.** 6 solver iterations and 2 internal PGS iterations (the defaults are 4 and 1). With the defaults the cottage and castle crept 7 to 8 mm after settling and took 13 to 16 s to fall asleep; with these they creep about 1 mm and the castle sleeps in 5 s. The price is more solver work per step (in the first quick comparison the awake wall went from about 0.5 to about 1.1 ms per step).
4. **Damping.** A little linear (0.1) and a strong angular (0.5) damping, which also kills the endless tiny wobble that keeps a structure awake.

Design rules found on the way: corners need interlocking courses (thickness must be half the length, or small gaps are accepted), round towers need a radius large enough that neighbours do not overlap at the inner corners (0.9 for 17 bricks), and a lintel beam must sit exactly in the course height. **A pitched roof does not work with loose rafters:** the two slopes push the thin walls outward (a real roof has a tie beam) and the cottage fell apart; my first three roofs collapsed. The cottage here has a flat deck of beams with tiles on top. A pitched roof needs a tie beam, or gable walls, plus a ridge beam, and that is a design job.

**Cost per body.** About 20 to 40 microseconds per awake body per step on this CPU, about 0.2 to 0.4 microseconds asleep. Sleeping is the saving that matters: a settled castle of 383 costs 0.11 ms per step, the same castle when everything wakes up costs 7 to 16 ms.

**iPad projection (not tested, and I want to be plain about that).** I have not run this on an iPad and have no iPad here. The sandbox CPU is a shared cloud core under load, and the browser runs here use software GL on that same core, so the frame numbers are not usable and even the physics numbers are only a rough guide. A recent iPad core is usually faster than a cloud core for this kind of wasm, and Safari runs Rapier's wasm without threads, so one thread is what we use here too. If it is 1 to 2 times as fast as this sandbox, then 120 and 234 bodies would be comfortable at 60 pictures a second, 383 bodies would hold 60 most of the time and dip during the first second after build and the worst of a collapse, and 1000 would not hold 60 in a collapse (about 14 to 20 ms of physics alone). If it is slower than this sandbox, the castle is borderline. Harry's reading of the benchmark card on the iPad replaces all of this guessing. Things to watch on the real device: the stand-still row for the castle, the worst physics step in the crumbling rows, the first-build time (the 1.5 s settle runs inside one page frame), Safari memory with 1000 instances, and thermal throttling after a few minutes. Not measured: battery.

**Determinism.** Yes on one machine: identical to the last digit across three runs, and identical between Node and Chromium. That means a replay can be stored as the starting base plus a list of (time step, ball kind, position, velocity), and played back exactly, as long as the physics code and the Rapier binary stay the same and the same fixed 1/60 step is used. The page steps with a fixed accumulator, so display speed does not change the result, but slow-mo and the "at most 3 steps per frame" rule do change which real frame a step lands on, so a replay must count steps, not seconds. Not tested: iPad against desktop. Rapier's compat build is not documented to be cross-platform deterministic (WebAssembly floating point is deterministic by the spec for the basic operations, but I have not tested ARM). Before building anything that needs two devices to agree (two-player over a network, bots that run on the server), this must be tested on the real iPad: the bench card prints the hash for exactly that reason.

**A base as text.** Yes, trivially. One piece per line: `type x y z qx qy qz qw`, for example `brick -0.600 0.059 -0.900 0.0003 0.0000 -0.0002 1.0000`. A castle is about 20 KB of text, the cottage 12 KB (234 pieces, three decimals; most of it is the rotation, and presets could store it as a recipe of a few lines instead). The page has "Base as text", both show and load. It round-trips (tested). Because the engine is deterministic, a base plus a shot list is a full replay, and a bot can use it in the same way: a bot "plays" by choosing ball kind, aim and power and running the simulation headless in Node (as `phys-test.js` does) at about 740 steps a second for 120 pieces, 460 for 234, 140 for 383 (a collapse). An 8 second shot is 480 steps, so one candidate shot costs about 0.7 s on the wall, 1 s on the cottage, 3.5 s on the castle. That is fast enough for a bot to check a handful of shots before it fires on small bases, not dozens per second.

**What it shares with the toy engine, and what differs.**

| Shared | Notes |
|---|---|
| Piece data | The kit (sizes, kinds) maps to the toy game's piece table (`FOOT0`, `KIT`). Presets are data lists in both. |
| Models and textures | Same wood, red, blue and tin textures; the same three.js r128; the same table and camera look. |
| Bases as text | The toy game saves designs as data in the Lab's Designs; here a base is a list of pieces. The same idea, a different record. |
| Weapon records | The toy `AMMO` table (marble, big marble, acorn, and the others) would map to ball records: radius, density, speed range, bounce. They are already a record here (`BALLS`). |
| The Lab | The toy Lab (build, erase, inspect, shooting range, readout) has the same screens; here only "Build by hand" and the benchmark exist. |
| Pull-back aiming, sweet band | Same input idea as the toy lobber. |

| Differs | What |
|---|---|
| The simulation layer | The toy game decides damage and collapse by rules (support lines, hit points, blast). This one asks the physics engine, and has no rules at all. Everything that the toy game says ("this wall is supported by that tower", "this piece is crippled") would become something you read from contacts and speeds, not something you decide. |
| Pieces | The toy pieces are a few big things (wall, gate, keep, brace). Here a wall is 120 bricks. |
| Mice | The toy game's mice build, mend and fight. They are not in this spike. Mending a physical wall would mean picking up a brick and placing it back, which is possible (set a body's position, zero its speed) but it is new game design. |
| Cost and platform | The toy game is cheap and runs anywhere. This one needs wasm, fixed step handling, and the speed numbers above. |

**Recommendation.** Use Rapier 0.21 (SIMD where the device allows it, plain 0.21 otherwise) in any next step: it is 2 to 6 times faster here, stands bigger structures, and needs less solver effort, at the price of a 4.3 to 4.6 MB download and a different determinism hash. Continue, but as a second mode with a clear role, not a replacement. It looks good and it feels good (the collapse, the dust, the slow-mo are hard to get from rules), it passes a real stand-still test, and the code is small: `sim.js` is 229 lines and the page 415. The open risks are the iPad speed, cross-device determinism, and design effort for pieces that must hold up as real structures (roofs, arches, overhangs), which the toy rules never needed.

Next three steps:

1. **Put it in front of the iPad (30 minutes of Harry's time).** Open `?bench=1`, read the card aloud, say whether it felt smooth, and compare the determinism number (`9f08783c`). Decide on the iPad's own numbers whether 250 or 400 bodies is the limit. If 383 is not smooth, stay with small bases (wall, tower, cottage) or use fewer, larger pieces.
2. **Make a structure design kit that stands.** A pitched roof with a tie beam, arches and a gate, a half brick, a small catalogue of "known good" shapes; and a "Check" button in the builder that runs the settle on the player's base and says "this will stand / this will fall" before a battle begins. This is the part of the game that a child would see as hard, and it is a design problem more than a code one.
3. **Wire in the game around it.** Two camps and a turn order using the toy game's rules for turns, ammunition, and winning, with "what counts as knocked down" read from the physics (a Keep brick count below a limit, or pieces off the table). The record of a base and its shots is then a replay; a bot picks the shot by simulating candidates headless. Only after steps 1 and 2.

## What is not tested

- **A real iPad. Nothing here has run on one** (that includes the wasm SIMD build, and whether an iPad gives the same hashes as this machine for any of the three Rapier builds). All frame times are software GL on a shared cloud core.
- Real GPU rendering cost (instancing, shadows at 2048 or 1024, pixel ratio 2).
- Memory and thermal behaviour on a phone or tablet over a long session.
- Determinism between devices (iPad against desktop, Safari against Chromium); only Node against Chromium on one machine.
- Touch input on a real touchscreen (the drag, the tap-to-place). It was tested with a mouse in Playwright.
- More than 1000 bodies in the page (the Node number is above), and the 48 ball limit.
- Long sessions (many shots, many rebuilds, memory growth); the page rebuilds the whole world each time.
- Replays and bots: described above, but not built.
- Mice, rules, turns, two players, AR: none exists in this spike.
- Pitched roofs and any shapes other than boxes and balls (round pieces, arches, an acorn that looks like an acorn).
- Other browsers (only Chromium).
- Sound.
- The real-time (non-quick) benchmark was not run to the end for all seven builds or all three Rapier builds here (software GL makes it very slow); the quick mode was, for every build and scene listed above.
- Whether Rapier 0.21 sleeps pieces too eagerly during a collapse (only counts of moved bricks were compared).

## Harry's iPad results, 21 Nov 2026 (REAL DEVICE)
Device: iPad in Safari 26.6.3 (desktop user agent), Apple GPU, 8 cores, 834 x 1062 at dpr 2. Full (not quick) benchmark, all three builds, no errors. Runs at 17:33, 17:57 (old test, 0.14 only) and 18:32 (all three). The 0.14 numbers were identical across the runs (repeatable).
Replay codes on the iPad equal the cloud's, for ALL THREE builds: 0.14 = 9f08783c, 0.21 = dd9f66ff, 0.21 SIMD = 4b748a06. So cross-device determinism holds for the same build (this iPad against Node and Chromium in the cloud).
Fastest on this device: 0.21 SIMD.

Physics ms per step while crumbling (average), and the frame verdict (Smooth <= 18 ms, OK <= 26, Slow <= 40):
| Scene (bodies) | 0.14 | 0.21 | 0.21 SIMD |
|---|---|---|---|
| Wall 120 | 2.2 Smooth | 1.5 Smooth | 1.1 Smooth |
| Tower 153 | 3.1 OK | 1.3 Smooth | 1.1 Smooth |
| Cottage 234 | 5.1 Slow | 2.7 Smooth | 1.9 Smooth |
| Castle 383 | 12.5 Too slow (44 ms frames) | 2.1 Smooth | 1.5 Smooth |
| Block 460 | 10.2 Too slow (41 ms) | 4.3 Smooth (18 ms) | 2.5 Smooth (17 ms) |
| Block 1035 | 28.6 Too slow (134 ms) | 13.5 Too slow (58 ms) | 6.6 OK (24 ms) |
| Block 1955 | 81.3 Too slow (344 ms) | 35.1 Too slow (133 ms) | 15.8 Too slow (64 ms) |
Drawing is cheap: a drawing-only pass costs about 0.7 to 2 ms of CPU even for 1955 bodies, so physics is the limit, not rendering.
Collapse results are consistent across builds (block 460: 301 / 303 / 305 bricks moved), so the newer builds' faster sleeping is not distorting the physics. Both 0.21 builds put a resting scene to sleep in under 0.1 s, so "stands still" is 0 mm there.
Load cost on the iPad: about 0.03 s (0.14, 2 MB), 1.0 s (0.21, 4.3 MB), 0.9 s (SIMD, 4.6 MB).
Conclusion: use 0.21 SIMD as the standard build (fall back to 0.21 plain if the device lacks SIMD) and record the build with every replay. Smooth at about 460 awake bodies, about 40 fps at about 1000, about 15 fps at about 2000. First-second spikes at build time still exist for big scenes (up to about 1 s at 1955).
