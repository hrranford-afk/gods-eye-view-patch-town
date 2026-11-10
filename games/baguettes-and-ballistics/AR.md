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
