# AR mode

Put the toy war on a real table. Works with standard WebXR `immersive-ar`, so it runs in
**(a)** WebXRKit / the HelloXR iOS app (an ARKit to WebXR polyfill in a `WKWebView`, https://github.com/wem-technology/ios-webxr) and **(b)** Android Chrome.
On desktop and Safari there is no `navigator.xr`, the AR button stays hidden and nothing changes (checked: same draw calls and triangles with AR off).

## For the player
Title card: tap **AR** (shown only when the browser says `immersive-ar` is supported). Point at the table, move slowly until the white ring sits on it, tap to place.
Before placing: pinch to resize, twist two fingers to turn. After: the bar at the bottom has **Re-place**, turn left/right, a **Size** slider, **Quality** and **Exit AR**.
Default size: the long side of the board is 0.7 m (battle) or 1.2 m (the Kitchen Run course, which is a 4.5 m-long worktop in game units). Drive with the left thumb as normal: "up" drives away from you, whichever side of the table you stand.

## How it works (all in the last `<script>`, "AR mode")
- **Hooks in the main script** (search `AR hook`): the `AR` object and the renderer's `alpha: !!navigator.xr`; `stickDown` (the old pointerdown handler, now named so the AR touch layer can reuse it); `let [ix, iz] = AR.on ? arStick() : [input.x, input.z]` at the three stick reads (race, Kitchen Run, battle); `step` (rAF only when AR is off, otherwise the XR loop calls it with the frame; `arFrame`; the game waits until the table is chosen); the end of `render` (`arRender`); `burst`'s spark cap. With AR off each hook is one boolean test.
- **The world**: the whole `scene` is moved onto the table with `scene.position/rotation/scale` (T(hit) * Ry(yaw) * S(s) * T(-board centre)). Every mesh the game adds, now or later, lands on the table. Camera: the XR viewer pose is the camera. The game's follow camera still runs but its result is overwritten by three's XR camera; for the HUD arrows (`.project(camera)`) `arFrame` sets `camera.projectionMatrix` and `camera.matrixWorldInverse = viewInverse * sceneMatrix`.
- **Per-frame render swap** (`arRender`): `scene.background` and `scene.fog` set to null, hemisphere and sun scaled by the light estimate, the sun's shadow box and target scaled into real metres; all put back after the render, so the game's own code never sees AR.
- **Looks**: transparent clear colour (the camera shows through); the board (table slab) stays as a thin wooden mat; a `ShadowMaterial` plane under the board; the Kitchen Run's 700-wide floor, tiled wall and window plane are hidden (found by size, as the kitchen's static shapes are merged); a global clipping plane stops anything drawing more than 2 cm below the real table (the kitchen's cupboards). No post-processing exists in this game.
- **Placement**: a hit-test source on the `viewer` space (the screen centre). The reticle ring follows the first hit whose surface normal is nearly up. Tap (on `#arTouch`, a full-screen layer inside the DOM overlay) places and, if AR was started from the title card, starts the game (PLAY). Until then the game does not update.
- **Steering** (`arStick`): the stick vector is rotated by where the camera looks (plus where its top points, so looking straight down still works) in the table's own axes, then smoothed.
- **DOM overlay**: on entering AR every HUD element is moved into one `#arRoot` (restored in order on exit; a `MutationObserver` catches elements the game adds to `<body>` later). The root is passed as `domOverlay: { root }`. If the runtime grants no `domOverlayState` the session is ended with a message (the controls would not show).
- **Quality** (Medium by default, remembered in `localStorage` `bb-ar-quality`): High pixel ratio 2, shadow map 2048, 300 sparks; Medium 1.5, 1024, 150; Low 1, no shadows, 60. The pixel ratio and XR framebuffer scale apply at the next AR start (three cannot resize while presenting); shadows and sparks change live.
- **Exit** (`arEnded`, also runs when the OS ends the session): scene transform, clip plane, camera near/far, quality, DOM and body background all restored; reticle and shadow plane disposed. Checked over three enter/exit cycles: geometries, textures and scene children are identical each time.

## What WebXRKit's polyfill supports (read from its source, `webxr-polyfill.js`) and what that meant
| Feature | Polyfill | What AR mode does |
|---|---|---|
| `immersive-ar`, `inline` | yes (only these) | `immersive-ar` only |
| `viewer`, `local` (default), `local-floor` | yes; `local-floor` is a fixed 1.3 m under `local`, and must be requested | uses `local`, via `renderer.xr.setReferenceSpaceType('local')` |
| `hit-test` | yes, but only a **viewer-space** source, plane geometry only, the default ray (screen centre), result arrives one frame late. No transient-input hit test | viewer-space source, screen-centre reticle, tap places. Not a "hit at the finger" |
| `dom-overlay` | yes: `domOverlay.root` is honoured, but the polyfill **hides every `<body>` child that is not the root (or inside it)** and ignores touches on the overlay for XR select | all HUD moved into one `#arRoot`; steering and tap-to-place use DOM pointer events on a touch layer inside it, never XR `select` |
| light estimation | no standard feature. Non-standard `frame.getGlobalLightEstimate()` gives `indirectIrradiance` (ARKit ambient intensity / 1000) | used if present, clamped 0.6 to 1.4, polled once a second. On Chrome it is not used (no `getLightEstimate` mapping written) |
| anchors | non-standard `frame.addAnchor` only | not used: the world is placed once and ARKit tracking holds it. Re-place if it drifts |
| camera feed | drawn natively by an `ARSCNView` *behind* a transparent WKWebView; the canvas is moved into `.arkit-device-wrapper` and made transparent | needs a transparent canvas: `alpha: true` renderer, no `scene.background`, transparent `html`/`body` (the polyfill does the last too) |
| `bounded`, `unbounded` | no | not requested |
| framebuffer scale factor | ignored (the layer is the canvas size) | pixel ratio is what lowers cost |
| select events | touch outside the overlay = one `screen` input source | not used |

Polyfill quirks to know: `requestSession` requires `navigator.xr.isSessionSupported` to have been called first (we do, on load); frames are throttled and the camera image is a base64 JPEG (README: expect a heavy, lower-fps feed); on session end the polyfill restores body styles wrongly (it sets `undefined`), so we restore `html`/`body` background ourselves.

## Tested here (a mock, no real device)
`navigator.xr` was faked (a session with a fixed viewer pose, a floor hit 1 m ahead, a fake wooden "camera feed" behind the page; script in the session scratchpad: `mock-xr.js`, `art.js`). Checked: AR button appears; session starts; reticle shows; tap places at the right scale (long side 0.7 m, scene scale 0.0047); the Kitchen Run runs 25 s and the battle 35 s in AR with no page errors; exit restores everything; stick direction is correct for five different table turns and camera poses (the stick's world direction equals the camera's forward on the table to 2 decimals); normal mode: all six levels 90 s with 0 errors; draw calls and triangles identical with and without the AR code (848 to 860 calls, 37,134 triangles, level 1 after 40 s with a seeded `Math.random`). Screenshots: `shots/53-ar-place.png`, `53c-ar-race.png`, `54-ar-battle.png`.

## Needs a real iPad (HelloXR or our own WebXRKit app) and a real Android phone
1. Does `isSessionSupported('immersive-ar')` return true in the app, and does the canvas show the camera feed (alpha, premultiplied)? If the table shows black, check `renderer` alpha and `html`/`body` transparency.
2. Hit-test quality on a real table (plane detection takes a few seconds; hits are plane-geometry only). If it is poor, fall back to the "1 m ahead" preview (already shown when there is no hit) and place there.
3. Frame rate with the base64 camera feed and 2048 shadows; try Low. Is Medium the right default?
4. Touch: `touchstart` on the touch layer inside the overlay must not be turned into XR select by the polyfill (its fix says it ignores overlay touches). Check drag-to-drive and the build buttons.
5. Tracking drift over a 10 minute game; whether the Re-place button is enough.
6. Real light estimation range (0.6 to 1.4 clamp is a guess), shadow bias at table scale (a plane acne check), the board's look on a white table.
7. Chrome: needs `dom-overlay` (all Android Chrome with WebXR has it); not tested there at all.

## Wrapping in WebXRKit later
1. Add the Swift package `WebXRKit` (`ARWebView`, iOS 16+; needs `NSCameraUsageDescription`). Load the game URL (or a bundled `index.html` through `WebViewNavigationAction.load`).
2. The polyfill is injected at document start by `ARWebView`; the game needs no changes: `navigator.xr` appears, the AR button shows.
3. `ARWebView` shows the AR view behind a clear WKWebView only while `isARActive`; our Exit AR button calls `session.end()`, which the polyfill turns into the native stop.
4. Keep `hit-test` required and `dom-overlay` optional (the polyfill grants both). Do not require `local-floor`, `anchors` or `light-estimation`.
5. Test with Eruda (the app injects it) for the console on the iPad. three.js still comes from cdnjs: bundle it for an offline app.

## My Track: your own race track on your real table (build 36)
Owner: "we don't use preloaded tracks. We use the image for inspiration, and then we draw a map on the existing image." Two ways to make the track: **draw it** with a finger on the real surface, or **Auto** (the app builds one inside the scanned area).

### For the player
1. Title card: **AR**, then pick **Kitchen Run** (the old toy kitchen, unchanged) or **My Track**. Without AR (desktop, testing): **My Track** under PLAY uses a plain practice table (1.2 m x 0.65 m) seen from above.
2. **Scan**: sweep the iPad slowly over the table. The scanned area is painted soft blue on the table, with a brighter rim, and the bar says "Scanned 40 % — sweep a bit more" (100 % = 0.6 m²). Draw and Auto unlock at 25 %; scanning carries on while you draw.
3. **Draw**: drag a finger on the table; lift to stop. Several strokes join up in order; the ends join with a smooth curve, and a stroke that comes back near its start closes the loop by itself. The real track is shown at once. Red = off the table (or a bend too sharp to drive), orange = two bits of road overlapping: Race! stays off until you **Undo** or **Clear**. Tight bends are smoothed out for you.
4. **Auto**: one tap builds a loop inside the scan; **Another one** re-rolls.
5. **Race!**: the usual GO / Skip card, then 2 to 5 laps (about 75 s) against 3 red cars on the track at real scale: road 5.5 cm wide plus kerbs, toy cars about 1.7 cm. Start/finish gate plus 3 to 5 checkpoint gates (the next one glows), two orange boost strips, level 1's tool tokens. Drive off the road for 0.7 s, or off the table, and you are put back a little way behind. Steering is the same left-thumb stick, turned to the way the iPad looks.
6. **Battle**: the YOUR LOADOUT card, then a battle on a board fitted inside the scanned area (masking tape marks its edge), toy boxes at its two ends (blue at the end nearer you), level 1's props, piles and bottle caps stretched to the board.

### How it works (the last `<script>`, "My Track")
- **What the runtime gives.** WebXRKit sends the page no plane outlines, no meshes and no anchors: only the camera pose and hit tests from `viewer`-space rays (ARKit raycasts against the planes it found, `existingPlaneUsingGeometry`, so hits stop at the real plane's edge). Besides the centre ray, My Track asks for 4 more hit-test sources with an `offsetRay` (the polyfill turns each ray's direction into a screen point for ARKit), so one sweep fills 5 points a frame. If `XRRay` is missing it uses the centre ray alone.
- **`SURF`, the surface abstraction.** An occupancy grid of 2 cm cells (250 x 250 = 5 m around the first hit) at one height. Height: the median of the last 240 hit heights; hits more than 3 cm off it are dropped (the floor, a box on the table); if the median moves more than 4 cm the map starts again. Each hit marks a 3 cm disc, and two hits in a row from the same ray, up to 12 cm apart, paint the strip between them (a sweep). Every quarter second a morphological closing (grow 5 cm, shrink 5 cm) fills gaps the rays missed without moving the outer edge. Anything that knows "this is flat table" can fill it: `surfHit(point)` (AR hits, now), `surfFillPoly(polygon)` (for our own app later, which can send real ARKit plane outlines). `surfDist` is a distance-to-edge map (two-pass chamfer), used by Auto, the checks and the battle board.
- **Units.** 1 game unit = 5 mm (`MT_S`). In AR the scene is placed at the first hit (at the median height) with no turn and scale 0.005, so the race's x/z are the surface's own frame; the battle board is turned and moved onto its fitted rectangle (`mtArFrame`, called from `arFrame`; `arFit` steps aside).
- **Drawing.** A ray from the touch point through the camera (AR: the viewer pose and the XR projection; practice: the game camera), cut with the plane y = surface height, then into game units through the scene matrix. No hit test is needed for the finger. Capture-phase pointer listeners on `window` take the touches while drawing, so the drive stick never sees them.
- **Smoothing and checks** (`mtSmooth`, `mtCheck`): resample every 3 units, two light passes against hand wobble, then local smoothing only where a bend is tighter than 10 units (5 cm radius), resample every 1.25. Fails: centre line closer than road-half-width to the scan's edge, or near a finger point that was off the table; parts of the road closer than a road width to a part more than 40 units away along it; a kink tighter than 7.5 units left after smoothing; shorter than 0.8 m. The start goes in the middle of the straightest stretch (`mtRoll`).
- **Auto** (`mtAuto`): keep cells at least road half width + kerb + 1.5 cm from the edge, take the biggest connected piece, go round it from its most inside point with 90 rays at the distance each ray can reach (min-filtered), multiply by 1 - (one or two random sine wiggles), which only ever pulls the line inwards, so it stays inside; cap it at 5 m; smooth; check; up to 10 tries with smaller wiggles. Works for rectangles and fairly round tables; for an L or U shaped worktop it uses the part visible from its middle.
- **The road** (`mtRoadGeo`): one merged, vertex-coloured mesh: a 3 mm slab with dark sides, red/white kerbs every 1.5 cm, dashed centre line, start chequer, orange/yellow boost strips. Shown as the preview while drawing too (with red/orange where it fails).
- **The race** reuses the Kitchen Run engine: the loop is unrolled lap after lap into one long `kDone` path, so `krCar` (you), `krRival` (3 red cars, rubber band), `krCollide`, `krRespawn`, `krCam` (practice) and the token / loadout card code work unchanged; laps = distance / loop length. `mtOffRoad` adds the "off the road / off the table" respawn. Gates are `buildGate`.
- **The battle** (`mtFitBoard`, `mtBattleLevel`): the scan's main direction (PCA), then a rectangle grown from its middle while each new edge is at least 70 % scanned; board 150 x 96 to 300 x 190 units at real scale, shrunk (k < 1) if the table is smaller. Level 1 stretched to it, `bases` at its ends, `mtSpawn` for respawns. This is level 1's full battle logic on a rectangle, not a free-form map: the parts of the scan outside the rectangle are not used.

### Tested here (no real device)
- HelloXR's real `webxr-polyfill.js` with a fake native iOS bridge, without DOM overlay (as on the owner's iPad): a 1.2 m x 0.6 m table at y = -0.9 m (hit tests empty outside it), the camera sweeping it for 12 s; then Auto + 30 s race; then exit, re-enter, draw a loop with synthetic pointer events + 30 s race; Skip to the battle each time. Script: session scratchpad `hxr/mtar.js`. See HANDOVER.md for the numbers.
- Practice mode in Chromium (Playwright): scan, Auto, Another one, race, battle; draw with the mouse in two strokes, an off-the-table stroke (refused, red), Undo; geometry counts flat over runs. Script: scratchpad `mt/practice.js`.
- Screenshots (AR harness; its pretend camera feed is a plain grey room and a white table drawn into the 3D view): `shots/55-scan.png` (the scan paint), `56-draw.png`, `57-auto.png`, `58-mytrack-race.png`, `60-ar-battle.png`. Practice mode: `59-practice.png` (a drawn track), `59b-practice-offtable.png` (a stroke off the table: red, Race! off), `59c-practice-battle.png`.

### Needs a real iPad
1. Does ARKit answer the 4 off-centre `offsetRay` hit tests (5 native raycasts a frame)? Frame rate while scanning.
2. Hit noise and the 3 cm height gate on a real table; does the grid restart when the first hits land on the floor?
3. Finger drawing accuracy (pure math on the plane; check the XR projection matches the screen in the app's web view, especially with the safe areas).
4. Car and track size at 5 mm per unit: are 1.7 cm cars on a 5.5 cm road readable at arm's length?
5. Tracking drift: the scene is pinned to the first hit; no anchors.
