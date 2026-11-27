# The opening film: build plan (T3 OPENING FILM ENGINE, 27 Nov 2026)

Status: plan, written before the engine. The engine is `opening.js`, the standalone proof is `opening_proto.html`, the node test is `tests/opening-test.js`. Nothing here edits a game page: wiring into `islands_look.html` is a later job for whoever owns the page (T1).

## 0. The short version

The opening is a CAMERA FILM, about 90 seconds, not a level. It is eight shots and one clock. A pure module (`opening.js`, no THREE in the maths) holds a keyframed timeline: camera position, target and field of view as eased splines; "state tracks" for sea energy, storm progress, light, fog and so on; and named event cues for sound. Any time `t` gives one answer, so play, pause, scrub, skip and replay all agree. A small THREE adapter drives a camera and hands the sea, sky and light states to the page.

The sea is the real wave sea (`sea_waves.js`, one Gerstner sum shared by the GPU shader and the CPU height query). The only new wave code is ONE staged wave added to the table: the Great Wash crest, with its own amplitude track, so the camera, the salvage and the picture all agree about it. The whirlpool belongs to the Great Storm only: it is a track that is zero in every calm frame, rises with the storm, and lingers weakly after.

What the page must really build: sea, sky, four islands, the quay and its four stock bays, the lighthouse and its beam, robots as simple shapes with lamp eyes, the staged crest, the raft that forms, the hulk, the wrack line, rain and spray. What is faked: people (flat silhouettes, counted not tracked), smoke, light shafts, rainbow, washing line, wet reflections on the deck, the close-up hands.

## 1. Rules carried from the owner's decisions (fixed)

- About 90 s. Night watch, first light, working quay at evening, long swell, the Great Wash, the wrack line at grey dawn, the arrival by boat, the first repair.
- The whirlpool is NOT permanent. Calm frames (night watch, first light, working quay, first repair) have a normal sea. It appears only with the Great Storm and lingers weakly after (frames 06 and 07 keep a dying swirl).
- Robots: old, plain, worn; lamp or lens eyes; no mouths, no speech, no written feelings. Nobody hurt on screen; no hidden helper shown. No real brands or places. People in the quay frame are scenery silhouettes, not tracked characters.
- Tone: hopeful, awe plus a little danger. The storm is big, not cruel.

## 2. Shot list and timings

ChatGPT's camera plan is kept almost as given. Adjustments are in the last column. Times are seconds on the film clock; `sunElev` is degrees (negative is below the horizon, as in `sky_clock.js`).

| # | Shot | Time | Camera (path in words) | Sky and light | Sea | Needs | Change from the ChatGPT plan |
|---|------|------|------------------------|---------------|-----|-------|------------------------------|
| 1 | Night watch | 0 to 9 | 3 m above swell, skim toward the lighthouse; beam sweep reveals a small lit boat for one beat | sunElev -14 to -9, deep violet cloud, lamp warm | calm, small swell | lighthouse tower and rotating beam cone, boat with a lamp, stars optional | 9 s kept. Beam period 9 s so one sweep crosses the boat at about 5 s. |
| 2 | First light | 9 to 20 | beam hands over to a gold strip of water; climb from 4 m to 55 m and pull back until four islands surround the centre | sunElev -9 rising to +4; the sunrise streak runs along the water | calm, no whirlpool | four islands, camp island lit (windows), lighthouse beam fades as day comes | Dissolve (dip to dark 0.5 s) at 9 s: this is a time jump. |
| 3 | Working quay | 20 to 36 | hard cut to evening; track beside a crate on a robot's gripper down the finished jetty, past the four bays, end at a taut mooring rope | sunElev +4 to +1.5, orange low sun, long deck shadows | calm, sheltered (low, small waves under the jetty) | quay deck, 2 robots, crate, four bays (planks, rope, glass, metal), washing line, lanterns, fire, 3 flat silhouettes | Camera height 1.6 to 2.4 m on the deck; no cut mid-shot. |
| 4 | Long swell | 36 to 47 | follow the rope out to sea; the first rise of water hides the far shore for a moment | sunElev +1.5 to -2, cloud wall darkening to violet | swell weight 0 to 0.8; storm weight begins at 44 s | rope (a drawn catenary), long swell, far shore hidden by crest | The swell is the long ground-swell type, then the wash blends in from 44 s. The camera is low enough that a crest really hides the lighthouse foot (checked in the test by a sight-line probe). |
| 5 | Great Wash | 47 to 59 | cut wide; horizon held steady at about 20 m up; follow one broken jetty section until a rope snags a crate and the tangle turns together | sunElev -2, storm ceiling, lightning flashes | wash weight 1, the staged crest passes the jetty at 50.5 s, whirlpool rises 48 to 55 s | crest wave, foam, spray, rain card, jetty sections (placeholders), 2 ropes, crate, planks, floats, raft that forms at 54 s | The raft is formed by a staged event (below), not by physics. A few outer pieces stay loose. |
| 6 | Wrack line | 59 to 70 | the roar cuts; creep sideways at 2.5 m past the grounded hulk and still robots; one drip | sunElev +3, grey dawn, rainbow rises at 64 s | after-storm weight 1 falling to 0.5; whirlpool a weak swirl (0.3 falling to 0.2) | hulk, 3 still robots (lamps dark), broken piles, wrack line items, wet sand, drip | The shot is stillness. Thunder cue ends at 58.5, silence cue at 59. |
| 7 | Arrival | 70 to 81 | rowing speed (about 1.5 m/s) just above the bow; the snapped piles slide apart to show the landing | sunElev +3 to +7, apricot cloud, sun streak | after weight 0.5 falling to 0.2; whirlpool 0.2 falling to 0.05 | boat bow with rope and lantern, the broken jetty, hulk, wrack | The boat is a foreground prop riding the CPU height. |
| 8 | First repair | 81 to 90 | cut close on the battery latch (fixed pose); the gloved hand withdraws; camera stops; the lens lights | sunElev +7, warm low sun | calm | one robot (big, near), battery box, two gloved hands (boxes) | The click cue and the lens light share one frame (cue `relay` at 86.4 s sets track `lens` from 0 to 1 in 0.15 s). |

Total 90.0 s. The cuts are at 9 (dissolve), 20 (cut), 36 (cut hidden by the rope pan), 47 (cut), 59 (cut with sound drop), 70 (dissolve), 81 (cut).

Continuity items carried through shots 3, 5 and 6 (ChatGPT's request): ONE painted mooring post (pale ring, ochre float) and the pale-ended plank (id `plank-pale-01`, already in `salvage_world.js` as the first raft's second plank). The page keeps the same instance in all three shots.

## 3. What each shot needs, from which state

Every picture comes from three states, all produced by one function of film time: the CAMERA state, the SEA state and the LIGHT state (plus a few stage tracks).

- SKY AND LIGHT: `sunElev`, `sunAz` (degrees) and colour tracks `hor`, `zen`, `cloud`, `fogC`, `sunCol` (RGB, same space as `sea_proto` and `weather.js`). Authored by hand from the ChatGPT palette (below) but built to be swappable: the adapter takes an optional `skyFn(sunElev) -> look` so the page can instead call `SkyClock.light(SkyClock.clock(...))` at the same elevation and keep only the authored mood colours (cloud, fog, storm darkening). The sky clock owns the sun path; the film owns the mood.
- SEA: three weights `seaSwell`, `seaStorm`, `seaAfter` (0 to 1) blend the `swell`, `wash` and `after` weather types of `sea_waves.js` over the calm base (normalised if they sum above 1). One more track `crest` (metres) is the staged Great Wash wave. One track `vortex` (0 to 1) is the whirlpool depth factor and is the ONLY thing that makes a whirlpool; at 0 the sea has none, in the shader and in the CPU height.
- WAVE CLOCK: when the weather moves, wave periods move, so `w t` would jump. The engine accumulates phase along the film instead (`phase_i(t) = integral of w_i(weather(tau)) d tau`, tabulated every 0.25 s from the tracks), which is deterministic and seekable. The page does NOT keep a running phase.
- STAGE: `beam` (lighthouse beam power), `rain`, `lightning` (flash level, a deterministic function of time), `raft` (0 to 1: how far the rope-bound raft has formed), `lens` (robot lamp), `fade` (dip to dark), `windows` (lit windows), `smoke`.
- CUES: `cue('thunder')`, `cue('key')` (a held note under the opening, see below), `cue('drip')` and others; the full list is in section 5.

The palette from ChatGPT is a grading target, not a pixel target. Samples used: first light current `#234C60`, water reflection `#365061`, sunlit cloud `#A2848C`, cloud shadow `#6F6F8B`; the Great Wash ceiling `#232436`, crest shadow `#14303C`, wash `#A7B2C8`, wreckage `#2B2B2D`; wrack line sky `#D2C3C0`, horizon `#627788`, shore `#647182`, foreground `#6F615E`.

## 4. The director format

One JSON object, evaluated by `opening.js`. The same object is the in-memory film, the file you export, and what a page could load later.

```
{ "version": 1, "name": "gift-opening", "duration": 90,
  "shots":  [ { "id": "night-watch", "t0": 0, "t1": 9, "frame": "01", "note": "..." }, ... ],
  "camera": { "pos":    [ { "t": 0, "v": [x,y,z], "ease": "none", "cut": false } ... ],
              "target": [ ... ],
              "fov":    [ { "t": 0, "v": 52 } ... ] },
  "tracks": { "seaStorm": [ { "t": 44, "v": 0 }, { "t": 48, "v": 1, "interp": "smooth" } ... ], ... },
  "vtracks": { "hor": [ { "t": 0, "v": [r,g,b] } ... ] },
  "cues":   [ { "t": 47.0, "name": "thunder", "arg": 0.8 } ... ] }
```
- A key is `{ t, v, ease?, cut?, interp? }`. Camera tracks and vector tracks are Catmull-Rom (cubic Hermite, tangents from the neighbours' times) between keys, continuous in velocity, so a move through several keys does not stop at each one. `ease`: `none` (default), `smooth`, `in`, `out` re-time the segment that STARTS at this key. `cut: true` ends the run: the camera jumps to this key and the spline starts afresh (no tangent crosses a cut). Scalar tracks default to a monotone cubic (no overshoot, so a 0-to-1 weight never leaves 0..1); `interp: "linear"` or `"step"` per key.
- `shots` only name and time the film (for the skip control and the shot list). They do not drive the camera.
- Cues are `{t, name, arg?}`. `director.update(dt)` fires the cues crossed in the step in time order; `seek` fires none and moves the read position, so scrubbing never plays a thunderclap. `director.cuesBetween(a, b)` is the pure version used by the test.
- Transport: `play()`, `pause()`, `speed` (0.25 to 4), `seek(t)`, `skip()` (to the next shot start; from the last shot to the end), `skipToEnd()`, `toJSON()` and `Director.fromJSON(obj)`.
- Pure evaluation: `director.at(t)` returns `{ t, shot, camera: {pos, target, fov}, s: {...tracks}, v: {...vectors} }`. No time source, no random, no THREE.
- THREE adapter: `attachThree(director, { camera, floor })` has `apply(t)`: sets position, lookAt and fov, then clamps the camera above `floor(x, z, t)` (sea height plus ground, plus 0.5 m) and records that it did. The adapter also exposes `seaParams(state)`, `skyLook(state)` and the staged wave so the page does not repeat that code.

Sound cues (the page decides what sound; the film only names the moment). The list is the contract with the sound job:
`beam-sweep` (each sweep), `boat-lamp` (5.0), `dawn-bell` (9.6), `winch` (24.0, the two-note winch that returns at 87), `crate-set` (31), `rope-taut` (35.6), `swell-rise` (41), `thunder` (46, 49.5, 56), `crest` (50.5), `snag` (53.8), `raft-turn` (55), `roar-cut` (59.0), `drip` (61.5, 65.2, 68.0), `rainbow` (64), `oar` (71.0 and every 3.2 s after), `piles-slide` (76.5), `battery-seat` (85.4), `relay` (86.4), `key` (86.4, the held note under the first repair that the game's music can resolve).

## 5. Sea, storm and the whirlpool

- The Great Wash crest. One extra wave is appended to the table: long (140 m), travelling with the wind, steep (Q at 1), amplitude `crest(t)` metres. Its phase is fixed by one rule: the crest peak is at the jetty at `t = 50.5`. Because it is in the table, `height`, the shader, the salvage floating on it, and the test's camera-clearance probe all see it. The amplitude track rises to 6.5 m at 50.5 and falls by 58. Honest limit: it is a long-crested wave train shaped by amplitude, not a mesh that curls over; the foam pass (Jacobian from the Gerstner pinch plus a timed foam boost) sells the break. If this reads weak in the stills, the fallback is a second wave in the same band, not a new system.
- The whirlpool. `vortex` track and a Gaussian dip at the centre of the four islands (radius 26 m, depth 9 m at 1), the same form as `sea_proto`, with spiral foam arms and a swirl in the flow of the drifting salvage. Zero in shots 1 to 4 and 8. The track also drives the spiral foam in the shader, so no part of it exists at 0.
- The raft that forms. A staged event, deterministic in `t`: from 50.5 the jetty section, a crate, six planks, two floats and two ropes drift on the wash flow; at `snag` (53.8) a rope end locks to the crate and the members' positions are interpolated from their free drift into a rigid group pose (`raft` track 0 to 1 over 3 s) that turns about one point; four outer pieces stay free. No physics; the member poses are a closed-form function of `t`, so scrubbing is safe. It uses the instanced salvage kit (crate, plank, cork, rope, barrel variants), the same models as the sea.
- The drifting salvage everywhere else is `salvage_world.js` (`LI_SALVAGE.makeWorld`) fed a film `env`: CPU height from the film sea, ground from the island field, storm from the track. Its drift is a stepped simulation, so after a seek the page re-runs a 20 s settle; this background is not cue-critical and is allowed to differ between runs. The staged raft is not.

## 6. Budget (iPad and Radeon)

All numbers are targets, UNMEASURED on a device. SwiftShader stills prove the picture, never the speed. Source for the limits: `tiers.js` (iPad pixel ratio cap 1.5 and the 8-wave sea are the only measured or code-held values; scene triangle and draw-call numbers there are guesses; Radeon and MAX numbers are unmeasured).

| Item | iPad (tier `ipad`) | Radeon (tier `radeon`) | How |
|---|---|---|---|
| Pixel ratio | 1.5 cap (tiers.js, measured on the owner's iPad) | 2 cap | `LI_TIERS.get(tier,'render.pixelRatioCap')` |
| Sea waves | 8 + the Wash crest | 24 + crest | `sea_waves.js` TIERS |
| Sea mesh | 72 x 160 rings (23,040 triangles) | 220 x 480 (211,200) | polar grid, as `sea_proto` |
| Island terrain | 4 islands, 3 m cells (about 36k triangles together) | 1.5 m cells (about 140k) | reuse seed 9001 field, scaled copies |
| Salvage models | 150 background + staged 40 | 600 + 40 | instanced kit, LOD, 14 kinds |
| Spray and rain | 600 spray points, rain card | 12,000 points | points, no particles |
| Total triangles | under 150k (the tiers.js guess) | no cap set | counted in the page readout |
| Draw calls | under 160 (guess) | no cap set | counted in the readout |
| Frame target | 16.7 ms stated, 33 ms acceptable for a film | 16.7 ms | a film can drop to 30 fps; the game cannot |
| Lighthouse beam | one additive cone, one texture-free shader | same plus a ground-glint quad | fake |
| Rain | one full-screen card, scrolling streaks | same with two layers | fake |

Memory and load: nothing downloaded. Kit geometry builds at load (procedural). The film data is a few kilobytes.

## 7. Built versus faked

| Thing | In the page | Faked |
|---|---|---|
| Sea, waves, foam, crest, whirlpool | real, shader | none |
| Sky, sun, rainbow, rays, lightning | sky shader (from `sea_proto`) | cloud shapes are noise, not painted |
| Four islands | real height field (seed 9001), scaled and rotated | the two rocks and the sand island are scaled copies of the one island |
| Lighthouse and beam | tower mesh, beam cone, rotating | the lit lamp room is an emissive box |
| Quay, bays, jetty | boxes and cylinders in the right layout, instanced where repeated | detail (rope wrap, pallets) is vertex colour only |
| Robots | simple tracked boxes with a lamp eye (PLACEHOLDER) | no animation beyond a bob and an arm tilt |
| People | none | three flat dark silhouettes on the camp deck |
| Washing line, lanterns, fire, smoke | lines, emissive spheres, a flickering sprite | all fake |
| Raft and snag | staged closed form, instanced kit | no rope physics; the rope is a sagging polyline |
| Hulk and wrack line | hull as boxes (PLACEHOLDER) plus the salvage world's beach clusters | rust is a colour |
| Reflections on wet deck | none | a sky-tinted gloss on the deck material |
| Close-up repair | a big robot box, battery box, two glove boxes | fixed pose, no hand animation except a withdraw slide |

Every placeholder is marked `PLACEHOLDER` in the page and listed in its panel so no one mistakes it for a final model.

## 8. Tests (node, no browser)

`tests/opening-test.js`: determinism (same `t` twice and across two fresh directors); seek equals play (stepping 0.02 s for 90 s lands on the same state as `seek`); cue order and no cue lost or doubled across a variable step; no NaN or Infinity in any output at 0.05 s steps; camera above `sea height + 0.5` and above the island ground plus 0.5 at every step; shot list covers 0 to 90 with no gap; the whirlpool track is 0 outside the storm window; JSON round trip equals; skip control; speed does not change the answer at a given `t`; the wave clock is continuous (no phase jump above a tolerance between steps).

## 9. Risks

1. Crest reads as a smooth bump, not a break. Mitigation above; judged in the stills, honestly reported.
2. The rain card and foam cost on the iPad: unmeasured. Both scale by a quality constant and can be dropped.
3. The island is one low, 100 m wide landform; four islands from it will look related. The two rocks need a vertical stretch, which can look wrong. Mitigated by taking small crops and leaving the true shape for the camp and lighthouse islands.
4. The sea inside the quay (sheltered water) would need the island wave shadow and shoaling of `sea_proto`. The first film does without: shot 3 keeps the camera on the deck looking over water that is nearly calm anyway.
5. Seed: `salvage_world.js` places its items by its own rules; the pale plank and the first raft are in the first spawn only for some counts. The staged raft does not depend on it.
6. Software GL (SwiftShader) is slow and shows no speed; stills only.
7. Time of day is a film device. The page that plays it must not push those hours into the game clock afterwards.
8. People silhouettes are the one place the targets show humans; kept flat, counted, no faces.
9. Disk: the repo is large; work happens in a sparse worktree that is removed at the end.
10. Wiring: `islands_look.html` is owned by another agent; this job ships files only.

## 10. Order of work

1. This plan. 2. `opening.js` and `tests/opening-test.js`. 3. `opening_proto.html`. 4. Stills at t = 5, 15, 30, 45, 55, 65, 75, 88 s, `research/OPENING_PROTO_REPORT.md`.
