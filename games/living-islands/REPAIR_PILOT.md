# Repair pilot: the wrecked jetty as parts you can put back

Harry's question: "Shouldn't we be building stuff quite physics-based out of parts, so when you find a broken down something, you can put it back together?" This is a pilot of that on one piece, the wrecked jetty, behind a new switch `&repair=1`. The default page is untouched (hash `8d962c0c`, 88,790 triangles, `tests/look-test.js` unedited and passing).

Confidence tags used below: **MEASURED** (a test prints it), **COMPUTED** (follows from the code), **GUESS** (a tuning number nobody has checked against a device, a real jetty or a real plank).

## What it is

- `repair_physics.js`: a pure module (no DOM, no three.js, no downloads, about 270 lines). Rigid planks and posts, gravity, sleeping, ground from any height function, buoyancy from any water height function, a current, sockets with snap rules, joints with a break load. Fixed step of 1/120 s; `advance(dt)` runs whole steps, so one input always gives one state (the tests check the hash).
- `islands_look.html?repair=1`: a block of about 150 lines (`rp*` functions, marked in the file). The committed GLB `assets/kit/kit_wrecked_jetty_live.glb` stands on a shore found by a scan of the page's height function. Its posts and frame are static. Eight decking planks and one mooring post are gone: they lie loose, with three spare planks in a pile. A counter reads "Jetty repaired 3 of 9".
- You drag a part onto a gap, or tap it and then tap the gap. Near the gap the nearest socket glows; a good fit snaps with a soft click (an ease with a small overshoot and a ring of light, no sound because the page has no sound system). A wrong fit does not hold and the part drops, with a line saying why.
- Fitted planks are held by a rope lashing or a nail, each with a break load. A surge (button, or the test API) climbs the beach: lashings give way, nails mostly hold, a big surge takes nails as well. Loose planks float and drift with the tide and can be washed off the site and lost.
- All nine fitted: the jetty is "usable". A boat moors alongside (the kit dinghy with `&boatkit=1`, otherwise the page's own procedural boat) with a rope to the post, and "Walk out" sends a settler-sized marker along the deck. With a gap he stops in front of it.
- Files: `repair_physics.js`, the block in `islands_look.html`, `assets/repair/jetty_b64.js` (base64 twin of the live GLB so `file://` works; rebuilt by `tools/jetty_b64.py`), `tests/repair-test.js`, `tests/repair-page-test.js`, `tests/repair-render.js`.

## How it plays

| Input | Result |
|---|---|
| Mouse or touch down on a loose part, move | the part follows the hand (a spring, so it still collides with the ground and with other loose parts, not with the jetty frame); it is carried flat and rises to deck height as the hand nears the jetty |
| Release near a free socket of its kind, within the snap radius and angle | fits: eases in, click ring, counter goes up |
| Release anywhere else | drops; the line says "Too far from a socket", "Wrong way round: turn it" or "That socket takes something else" |
| Tap a part, tap a socket | the part goes in (kind and free slot still count; reach 18 m); a wrong kind hops to the socket, does not hold, drops |
| Tap a part, tap the ground or sea | it is put down there |
| "Turn plank" or `R` | quarter turn of the carried or picked plank |
| "Test surge" / "Big surge" | the sea comes up the beach and goes back over 12 s |
| "Walk out" | the settler walks the deck axis, stops at the first open plank |
| "More planks" | three more spares on the sand (planks washed away are gone, this is the honest way back) |

Near a socket the carried plank turns toward the slot if it is within about 50 degrees of it, so a careful hand fits; a plank turned a quarter turn stays wrong.

## The method (parts, sockets, joints)

1. A part is a **body**: a box with mass (from volume times density), drawn as the GLB mesh and collided as a row of spheres (a plank is two rows, a post one). Spheres keep contacts cheap and stable; point contacts against a height function and against static boxes are the only collision code besides sphere against sphere.
2. A **socket** is a pose (position and orientation of the part when fitted), a kind (`plank`, `post`), a snap radius, a snap angle and a joint. A part fits when it is of the kind, the socket is free, its centre is within the snap radius (height counts 45 percent, so a plank held a hand above the slot fits) and its orientation is within the snap angle of the slot or of any half turn of the box (a plank is symmetric under half turns about each of its axes).
3. A **joint** has a break load and the part has a health factor (0.8 to 1.05, seeded). The load on a fitted plank is the water: pressure on the underside once the sea is above it (1000 x 9.81 x area x depth, capped at 0.6 m of depth) minus the plank's weight, plus drag. Over the break load breaks at once; over half of it wears the joint (cubic fatigue); a broken joint releases the plank as a free body with the water's velocity.
4. **The same method for any piece**: each `movable` node in the GLB (the kit already lists them) becomes a body, each place it came from becomes a socket, each static neighbour becomes a static box.

## Numbers

| Item | Value | Tag |
|---|---|---|
| Plank | 0.19 x 0.046 x 1.66 m, density 520 kg/m3, so 7.5 kg; floats 52 percent wet | box from the GLB: MEASURED; density: GUESS (driftwood runs 400 to 700) |
| Post | 0.15 m round, 1.4 m, density 560, 13.9 kg | GUESS |
| Gravity, step | 9.81, 1/120 s, speed cap 6 m/s (0.05 m per step, under half a plank thickness) | cap is a design choice |
| Ground friction | 0.62 on sand, 0.5 on timber | GUESS |
| Sleep | under 4.5 cm/s and 0.16 rad/s for 0.7 s | GUESS |
| Snap radius | 0.27 m (planks), 0.40 m (post) | GUESS |
| Snap angle | 0.52 rad (30 degrees), 0.5 for the post | GUESS |
| Joint break load | lashing 300 N, nail 780 N, post lashing 330 N, times health 0.8 to 1.05 | GUESS (a rusty nail in soft wood pulls out at a few hundred newtons; I did not look it up) |
| Surge | peak sea 0.2 m over the underside of the deck (moderate) or 0.55 m (big), 12 s, current 1.5 m/s landward then back | GUESS |
| Water load on a plank | 3,079 N per metre of depth over the underside, 613 N at 0.2 m | COMPUTED |
| Lashed slots | the five at the landward end (broken stringer): 4 of 8 with the others on nails | design |
| Sockets | 9 at high quality (8 planks, 1 post); 6 at q=low (5 planks, 1 post) | MEASURED |
| Loose parts | high: 11 planks (3 spares) + post; low: 6 planks (1 spare) + post | MEASURED |
| Triangles | high page 91,180 (default 88,790: jetty adds 2,390, of which 1,802 from the live GLB and about 590 from ghosts, parts and the marker); q=low page 63,082 (default 60,752: adds 2,330); GLB failure: box fallback adds 1,048 | MEASURED, see test output |
| Physics cost | see the table in "Test results" | MEASURED (software GL; not device timings) |
| Build | the scan, the height grid (230 x 230 samples) and 6 s of settling run once at load | MEASURED in the test |

## Test results

(See the end of the file for the run output.)

## What is faked

- The jetty frame is collision boxes read off the GLB by hand (19 boxes, bounding boxes of each post and beam); the frame is not simulated and does not break. Broken posts are only stumps in the model.
- Planks are spheres in two rows, so a plank rolls over a 4 cm lip like a ladder of balls; there are no plank-on-plank friction subtleties and stacks of more than three are fiddly.
- A held part ignores the jetty frame (a hand does not snag). It still hits the ground and other loose parts.
- Water is a height function (tide, a macro-sea swell when `&macro=1`, or two small sines) plus a pull toward a current speed. There is no wave breaking, no wake, no splash. The surge is a scripted level and current; it is not the weather storm (the macro storm does not trigger it).
- Joint load is the water only. A settler walking, a boat tugging the rope and a plank falling on a plank add nothing. The settler's weight never breaks anything.
- The click is a ring of light and a 1.8 cm dip. No sound exists.
- The settler does not path: he walks the deck axis from a fixed start, steps up at the broken ramp by an interpolated height, and stops at the first open plank socket.
- The boat is a normal page boat added when the jetty becomes usable (the kit dinghy with `&boatkit=1`); it does not tug, it does not respond to the surge, and it stays moored if the jetty breaks again.
- Nothing is saved: a quality switch or a reload rebuilds the same broken jetty.

## Extending the method

Named nodes come from `KIT_PIECES.md` and the GLB `extras.movable`. The `plank_*` of the jetty are `take`; swing nodes (`door`, `lid`, `hatch`) would be hinge joints, not yet in the module.

| Piece | Parts (bodies) | Static | Sockets | Notes |
|---|---|---|---|---|
| Lean-to | `plank_*` roof boards, `door`, sail cloth pieces | the posts and rear wall | one per roof board, hinge socket for the door | the door needs a hinge joint (an angle limit and a break torque); cloth is out of scope |
| Drying rack | the cross poles, `fish_*` | the two frames | a notch per pole, a hook per fish | fish are tiny: carry a group, not each |
| Relic hull | `plate_*`, `hatch`, `drum` | ribs, keel | a frame station per plate | plates are thin sheets; sphere rows would not do, use boxes with 4 corner spheres |
| Jetty (this pilot) | `plank_*`, post, `bollard` | frame | deck slots, post slot | `bollard` could be a part with a socket on a plank |
| Crate stack | `crate_*` | the pallet | stack positions | the physics already stacks cubes poorly; give crates box colliders |
| Cairn | `stone_*`, `stone_cap` | the base | one per layer | stones are not boxes: spheres are the right shape for them |

To add a piece: write its static boxes, list its sockets (pose, kind, snap values, joint), list the body kinds with sphere rows and a density, add loose parts by a seeded plan and let `advance()` settle them. The page block is written for the jetty but the three pieces it depends on (site finder, socket list, part list) are the only jetty-specific code.

## Ranked gaps

1. Touch controls on a tablet are untested on a device. The code uses pointer events, a larger pick pad for touch (0.3 m instead of 0.14), tap to pick and tap to place, and a quarter-turn button, but I only drove it with a scripted mouse in a desktop browser. A finger hides a thin plank; I do not know whether the pad is big enough, whether two-finger camera gestures fight the drag, or whether the hit target feels fair at the default 15 m view. AR use is the same: the `?tier=ar` profile runs, the AR hand is not tried.
2. All strengths, masses and radii are tuning guesses; the surge is scripted, not tied to the weather.
3. No sound.
4. The jetty frame is static and does not break; broken posts are not repairable, so the "repair" is decking only, plus one post.
5. Planks are not taken from other wrecks (out of scope, a spare pile instead).
6. The physics runs from the render frame; with a slow device the fixed step falls behind real time (it drops time rather than spiral: at most 6 steps per frame).
7. The shore scan is by the page's own height; on some seeds the best site is far from the camp or none exists (then there is no repair layer and no error).
8. The sphere-row collision does not give plank-on-plank friction a fair test; deep piles are not tuned.
9. No save: the repair state is not kept across a reload.
10. The settler is a marker (the page's person mesh), not a character in the people system.
