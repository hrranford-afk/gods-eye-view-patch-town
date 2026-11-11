# Night Meet: handover (code map)

Everything is in `index.html`: HTML and CSS at the top, then seven `<script>` blocks in this order. Search for the
quoted headings or function names (line numbers drift).

| Block | Heading to search | What is in it |
|---|---|---|
| 1 | `Core: names, renderer` | `GAME` (name, build tag, storage key), `store` (localStorage in try/catch), seeded `rnd`, the `AR` hook object, renderer (ACES, sRGB, PCF soft shadows), scene, fog, camera, hemisphere + moon lights, `QUALITY` presets and `applyQuality`, the bloom composer (`buildComposer`), canvas textures (`smokeTex`, `streakTex`, `plateTex`, `signTex`...), shared materials `MAT` and `paintMat` (clearcoat), `setEnv`, asset loading (`ASSET_LIST`, `loadAssets`, `prepEnv` darkens the HDRI), `prop()` for Poly Haven models, input (stick, keys, `holdBtn`). |
| 2 | `==PHYSICS BEGIN==` | The car model (`physInit`, `physStep`, `physSub`), no three.js inside so it can be tested in node. Then the sounds made in code (`SFX`, `engineUpdate` with a pretend gearbox, `screech`). |
| 3 | `Cars. Every car is ONE function call` | `CAR_TYPES` (stats, names, blurbs), `PAINTS`, `NEONS`, `physParams` (stats -> physics numbers), wheels (`wheelGeo`, `addWheel`), shape helpers (`sideShape`, `extrude`), `buildGlbCar` (Quaternius models restyled: `glbMeta` finds the paint slot and wheel centres), `buildCodeCar` (muscle, kei, pickup, bus, lorry), **`makeCar(typeId, paint, neon, opts)`**, `mergeParts` (one mesh per material), `setNeon`, `setPaint`, `disposeCar`, `poseCar` (roll, pitch, wheel spin and steer). |
| 4 | `The world. An AREA` | `AREAS`, `AREA_BUILDERS`, `getArea`, `Merger`, `boxM` (UVs in metres), world textures (windows, container ribs, chain-link, puddles), `buildSky` (dome shader + skyline), `groundMat` / `groundPlane` / `bakeLight` (lamp pools baked into a light map) / `markingsMesh` / `drawZone` / `puddles`, lamps (`lampPole`, `wallLamp`, `lightDressing`: halos, light cones, the wet-road reflection streaks updated by `streaksUpdate`), dressing (`fenceRun`, `container`, `addProp`, `parkedCar`, `plinth`), **`buildCarPark`** and **`buildTown`**, `areaQuality`. |
| 5 | `Lights: a small pool` ... `Main loop` | `lightsQuality` / `lightsUpdate` (3 to 7 real spotlights moved to the lamps nearest the action; the count never changes mid-game), effects (`fxInit`, `puff`, `sparks`, `skid`, `lightAt` tints smoke by nearby lamps), driving (`showArea`, `driveStart`, `driveReset`, `driveExit`, `collide`, scoring `scoreStep` / `bank` / `crash`, `driveFinish` = results card and best scores, `driveInput`, `driveUpdate`, `driveFx`, `driveCam`, `driveHud`), the meet (`MEET`, `meetEnter`, `meetUpdate` orbit camera, `inspect` card, `pickCar`, pointer handlers), `botDriver` (test driver), `update` / `render` / `step` (main loop, `?perf` meter), UI wiring, `boot`, and `window.NM` (hooks for tests). |
| 6 | `AR mode` | Copied from baguettes-and-ballistics and adapted (see its AR.md for the polyfill details): iPad fix (`arIpadFix` loads `webxr-polyfill.js`), AR button + status line with the build tag, `arBuildRoot` (DOM overlay root, touch layer: place / pinch / twist / drive / tap a car), `arLog` (on-screen steps), `arStart` (forces Low quality, no bloom), `arEnded` (restores everything), `arShowWorld` (sky, skyline, water hidden; plinth shown), `arFit`, `arFrame` (pose, hit test, scene transform, camera matrices for picking, eye position for the reflections), `arRender` (no fog, light reach scaled to the diorama). |
| 7 | `boot();` | Starts the game. |

## How the look is made (cheap tricks, all in code)
- Night: the Poly Haven `rooftop_night` HDRI is used only for reflections (`envMap` per material, not as the scene's
  light) and darkened to a quarter in `prepEnv`. Very low hemisphere + moon light. Fog and sky colours are given in
  linear (r128 does not convert them).
- Lamp light on the ground: baked into a canvas light map per area (`bakeLight`), plus a few real spotlights that
  follow the action (`lightsUpdate`) so cars, smoke and walls near you are lit for real, with shadows on Medium/High.
- Wet road: low-roughness asphalt with its normal map, dark mirror puddles, and a reflection streak per nearby lamp
  re-aimed at the camera every frame (`streaksUpdate`).
- Bloom (`UnrealBloomPass`) on lamps, neon, tail lights; the two widest blur levels are off and the blur buffers are
  half-float when the GPU allows (both stop square artefacts round bright lights).
- Smoke: soft sprites tinted at birth by the lamps above them, the tail lights and the neon (`lightAt`, `driveFx`).

## Physics in one paragraph
A bicycle model with weight transfer (front/rear loads change with acceleration), a Pacejka-like tyre curve, a rear
friction circle (power uses up side grip: throttle-oversteer), handbrake = less rear grip plus drag, traction control
when gripping, and a drift assist: while sliding (and on the gas) the yaw rate is eased towards "turn rate of the
travel direction + a correction towards the angle the stick asks for" (`driftAng`). Per-car strength `assistK`:
the bus and lorry have a weak assist and a small angle, which is what makes them hard. Tuning numbers: `physParams`.
Tests used while tuning: steady drift at full stick holds about 37 degrees at about 100 km/h (Kaze); releasing the
stick straightens it; lifting off decays the slide; flicking without the handbrake starts a slide.

## Tests (scripts are in the session scratchpad, not in the repo)
Playwright + SwiftShader, viewport 1180x820, served with `npx http-server` (GLB/glTF loading needs http):
- `test.js`: no page errors; the meet loads (13 parked cars, 11 types); a real mouse tap on a parked car opens its
  card; a 60 s run with the bot holding the handbrake; memory over 3 runs; frame time per quality.
- `ar.js`: the real HelloXR/WebXRKit polyfill with a fake native ARKit side (adapted from mtar.js), `NO_OVERLAY=1`:
  AR button appears, session starts (overlay connected by the game), hit test, tap to place, tap a car through the AR
  camera, drive, exit; twice.
- `shots.js`: the screenshots in `shots/`.

## Known gaps / next steps
See the end of README.md's sections and the final report: real-device AR and iPad frame rates are untested here;
the Quaternius cars are low-poly (good silhouettes, faceted surfaces); no other cars drive; one game mode.
