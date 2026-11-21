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
| `index.html?bench=1` | The benchmark for the iPad. Runs by itself, about 1.5 minutes, then shows a big plain result card. Numbers are also in `window.__bench` (JSON) and there is a Copy numbers button. |
| `index.html?bench=1&quick=1` | Same, but 12 physics steps per picture so it finishes fast on a slow machine. Frame numbers mean little in this mode. Used by the tests. |

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
| `vendor/rapier/`, `vendor/three/`, `tex/` | Rapier (unmodified), three.js r128 (copy of the file the toy game loads from its CDN), the toy game's wood/red/blue/tin textures. |
| `tests/phys-test.js`, `tests/page-test.js` | The tests. Results are written to `tests/phys-results.json` and `tests/bench-quick.json`. |
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

Presets: Brick wall 120 bricks (12 and 11 alternating, 10 courses plus a 5-brick cap), Tower 153 (round, 17 per course, 9 courses), Cottage 234 (brick shell with a door and a lintel beam, 12 beams across the top, 45 roof tiles), Castle gate 383 (two crenellated round towers with a gate wall between, a beam lintel over the opening).

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

Same seed, same steps: three runs give the same hash (`9f08783c`) and the same positions to 1e-9. A different seed gives a different hash. The browser (Chromium, wasm) gives the same hash as Node, checked in `page-test.js`. All on one machine. A real iPad (Safari, ARM) has not been tested; the bench card prints the same hash so that Harry can compare it by eye (`9f08783c`).

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

**Recommendation.** Continue, but as a second mode with a clear role, not a replacement. It looks good and it feels good (the collapse, the dust, the slow-mo are hard to get from rules), it passes a real stand-still test, and the code is small: `sim.js` is 229 lines and the page 415. The open risks are the iPad speed, cross-device determinism, and design effort for pieces that must hold up as real structures (roofs, arches, overhangs), which the toy rules never needed.

Next three steps:

1. **Put it in front of the iPad (30 minutes of Harry's time).** Open `?bench=1`, read the card aloud, say whether it felt smooth, and compare the determinism number (`9f08783c`). Decide on the iPad's own numbers whether 250 or 400 bodies is the limit. If 383 is not smooth, stay with small bases (wall, tower, cottage) or use fewer, larger pieces.
2. **Make a structure design kit that stands.** A pitched roof with a tie beam, arches and a gate, a half brick, a small catalogue of "known good" shapes; and a "Check" button in the builder that runs the settle on the player's base and says "this will stand / this will fall" before a battle begins. This is the part of the game that a child would see as hard, and it is a design problem more than a code one.
3. **Wire in the game around it.** Two camps and a turn order using the toy game's rules for turns, ammunition, and winning, with "what counts as knocked down" read from the physics (a Keep brick count below a limit, or pieces off the table). The record of a base and its shots is then a replay; a bot picks the shot by simulating candidates headless. Only after steps 1 and 2.

## What is not tested

- **A real iPad. Nothing here has run on one.** All frame times are software GL on a shared cloud core.
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
