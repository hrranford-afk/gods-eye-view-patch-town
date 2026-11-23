Do not put real place names into game code, assets or recipes.

# Three modes: AR, DESKTOP, HANDHELD (research note, 23 Nov 2026)

Owner requirement: everything we build works in all three modes. This note is the gate for the "Quality tiers and devices" row of RESEARCH_FIRST.md.
Tags: VERIFIED (read in a source or measured here), PLAUSIBLE (standard engineering knowledge, not re-read today), UNVERIFIED (heard, not checked), TUNING (a starting number to measure on a device). Nothing in the budgets has been run on a real iPad, phone, headset or big GPU. All our measurements so far are SwiftShader (software GL), which is no proxy for fps.
Web access this session: web search worked; caniuse.com and the immersive-web spec pages were not reachable (not in the network allow list), so spec details below that are not in a search result are PLAUSIBLE.

## 1. What each mode is, who uses it, where it runs

| Mode | Device | Input | Who | Main risk |
|---|---|---|---|---|
| AR | phone, tablet or headset with a camera feed behind a transparent canvas | touch on the screen, or hand/controller on a headset | the owner on a table at home; show a friend | the camera feed eats the frame budget; the world must be a 1 m miniature |
| DESKTOP | laptop or tower, mouse, keyboard, maybe gamepad, large screen | mouse, keys, wheel | development, reference look, long sessions | assuming a big GPU; fullscreen/high-DPI cost |
| HANDHELD | iPad or phone in Safari or an app WebView, touch, battery | one and two finger touch | the owner on the sofa; the main play mode | heat, battery, Safari memory kills |

### Where AR can actually run (state at 23 Nov 2026)
| Route | Works? | Confidence | Notes |
|---|---|---|---|
| iPhone / iPad Safari, WebXR `immersive-ar` | NO | VERIFIED (search 23 Nov: Apple forum answers say immersive-ar is not supported on iOS; a 2026 guide lists iOS Safari as unsupported) | `navigator.xr` is absent or `isSessionSupported('immersive-ar')` is false. Treat as absent until WebKit bug 208988 (the WebXR tracker) says otherwise. |
| Vision Pro Safari | immersive-VR yes; `immersive-ar` NO | VERIFIED: Apple engineer reply on the developer forum, June 2026: "The WebXR immersive-ar mode isn't currently supported in visionOS" (suggests Quick Look and immersive web environments instead). A user says the AR module setting is removed in visionOS 27: UNVERIFIED. | So Vision Pro is a VR-style mode (a virtual table), not AR. |
| Android Chrome (ARCore phones) | YES | VERIFIED: Google's ARCore comparison page marks Hit Test, Anchors, Depth, Lighting Estimation as shipped in Chrome; Plane Detection is developer trial | Device list is on the ARCore supported-devices page (not read). DOM overlay in Chrome Android: shipped since about Chrome 83 (PLAUSIBLE; the one page found called it an old flag). Depth sensing needs a depth-capable phone. |
| Quest Browser (Quest 3 / 3S, Pro) | YES, passthrough | VERIFIED: Meta docs, `immersive-ar` needs a transparent background; Quest 2 passthrough is greyscale, Pro/3 colour | Hit test uses the depth API since Horizon Browser 40.4 (Meta-sourced article). Use runtime feature detection, never the user agent (Meta says so). Plane and mesh detection: UNVERIFIED on device. |
| iOS wrapper apps with the polyfill (HelloXR style, WebXRKit) | YES, polyfilled ARKit | PLAUSIBLE: read from our own AR.md (source read of `webxr-polyfill.js`); never run by us | See the polyfill table in `.worktrees/ar-mode/games/baguettes-and-ballistics/AR.md`. Only `immersive-ar` and `inline`, viewer-space hit test only, DOM overlay honoured, camera feed is a native view behind a clear WebView. |
| Our PatchTown iOS app | would be the same polyfill plus room maps, plane stream, hit classification | UNVERIFIED: README says "written on Linux, never been built"; every claim there is untested | Free build for the owner's own iPad: 7 day expiry (BUILD_AND_TESTFLIGHT.md). We do not build or run it here. |
| Apple Quick Look (`<a rel="ar">` with a USDZ) | YES on iOS/iPadOS Safari, as a viewer, not our engine | VERIFIED: WebKit blog and Apple docs: needs MIME `model/vnd.usdz+zip`, link wraps one `img`; user places and scales by touch | A static or animated model only. No live shaders, no tide, no game logic. Useful as a "place a still of your island" export, nothing more. Known forum gripes: PNG transparency, iOS 26 share regression (UNVERIFIED). |
| Mozilla WebXR Viewer (old iOS app) | UNVERIFIED | UNVERIFIED | Believed unmaintained; do not plan on it. |

Consequence (PLAUSIBLE, firm): for the owner's iPad, real AR means a wrapper app (HelloXR/WebXRKit today, PatchTown app later). Safari alone gives HANDHELD only. On Android and Quest the same web page can do AR with no wrapper. The page must feature-detect at load and show the AR button only when `isSessionSupported('immersive-ar')` resolves true (our AR.md does exactly this; with AR off the draw calls are identical, VERIFIED there).

## 2. AR specifics

### 2.1 Scale and placement
- World 200 to 500 m across on a 1 m table: 1:200 to 1:500. At 1:400 a 1.8 m person is 4.5 mm, a 10 m tree 2.5 mm, a 30 m cottage 7.5 mm, a 0.3 m ripple wavelength 0.75 mm, a 2 m swell wave height 5 mm (arithmetic, VERIFIED as arithmetic).
- One scene scale factor `s` (metres per world unit on the table). Put the whole world in one group; move and scale that group (our AR.md does this with `scene.position/rotation/scale`, tested only in a mock). Never edit individual meshes. Lights and shadow boxes must be scaled with it.
- The camera must be the XR viewer pose, near plane about 1 cm, far about 20 m (PLAUSIBLE; depth precision at table scale). Keep world units in metres inside the world and only rescale at the group.
- Default footprint on placement: 0.7 to 1.2 m across (the long side), the same numbers AR.md uses for its table (VERIFIED in AR.md; not tried on a real table). Allow pinch to scale 0.3 to 3 m (TUNING).
- Hit test: Chrome and Quest give a hit-test source and plane results; the polyfill gives only a viewer-space source (screen centre), plane geometry only, one frame late (VERIFIED from AR.md). So design the UI as "aim the ring, then tap", never "tap anywhere". Plane detection takes seconds; show "move the phone slowly" until the ring is on a near-horizontal hit (normal.y above about 0.9).
- Anchors: Chrome ships them, the polyfill has only a non-standard form. Plan: place once, re-place by button. Do not depend on anchors (PLAUSIBLE).
- Tracking drift: expect small drift over minutes and larger jumps when tracking is lost. A "Re-place" button is mandatory; auto re-place is a later upgrade. Drift size over 10 minutes: UNVERIFIED (AR.md lists it as a device question).
- Occlusion by real objects (a hand, a cup): not available on the polyfill and not by default in Chrome. Depth sensing exists on some Android phones and on Quest, but we do not plan on it (PLAUSIBLE). Result: the miniature always draws over your hand. Say so in the UI; do not fake it.

### 2.2 The miniature fidelity problem
Reality at 1:400 looks wrong in two ways: (a) small things vanish (ripples under 1 mm), (b) things look too smooth and "like a CG toy" because real tabletop models carry exaggerated texture and a close-up depth of field. Photographers get the "miniature" read with a narrow depth of field, a high viewpoint and saturated colour (tilt-shift); a real diorama also has visible material grain, sharp painted edges, clear resin water and exaggerated height. Source basis: general photography practice (PLAUSIBLE; no licensed source quoted).

| Feature | Real size at 1:400 | In AR: what to do | Tag |
|---|---|---|---|
| Ripple wavelength | 0.75 mm | exaggerate: make the shortest ripple 3 to 6 mm on the table (about 1.2 to 2.4 m in the world), drop everything shorter. The sea shader already fades each train by its own wavelength against pixel footprint (SEA_PASS), so raise the footprint floor in AR | TUNING |
| Swell wave height | 5 mm | exaggerate vertical 3 to 5x (a resin-sea diorama look) | TUNING |
| Foam and whitecaps | hairline | thicken foam bands to 2 to 4 mm; fewer, bolder flecks | TUNING |
| Glitter | real glints are sub-pixel | keep, but only toward the real light direction, and cap intensity; do not fake a sun on a room with no sun | TUNING |
| Tide | 0.5 to 2 m of tide = 1 to 5 mm | show it by shore line (wet band, sand/rock colour change) and a marker post; exaggerate tide range 2 to 3x in AR only | TUNING |
| Trees | 10 m tree = 2.5 mm | scale trees up 1.5 to 2.5x; keep trunk plus crown silhouette, drop leaf detail | TUNING |
| People | 4.5 mm | scale 2 to 3x or draw as a coloured dot with a tiny shadow; a lit window or smoke wisp reads better than a figure | TUNING |
| Houses | 7 mm | keep, add 1.5x height; dark window and chimney smoke carry life | TUNING |
| Terrain height | 0.5 m per 200 m island | vertical exaggeration 1.5 to 3x; a flat island on a table reads as a map | TUNING |
| Clouds | km scale | do not draw a sky; use a small cloud layer 0.3 to 0.6 m above the island, a few puffs, and moving cloud shadows (see 2.5) | TUNING |

The rule: exaggerate by what the eye can see at arm's length (about 2 to 3 pixels, 1 to 1.5 mm at 40 cm on a phone), not by the physics. Keep one "AR exaggeration" parameter set (a table of multipliers) so it can be dialled on a device. (Pixel size: a 60 degree field at 0.5 m is about 0.58 m wide; across about 1200 px that is about 0.5 mm per pixel. PLAUSIBLE arithmetic.)

### 2.3 Compositing and what to turn off
- Transparent canvas: `alpha: true`, `scene.background = null`, `scene.fog = null`, `premultipliedAlpha` consistent, html and body background transparent (VERIFIED in AR.md; also needed on Quest, VERIFIED Meta docs).
- No sky dome, no sky colour, no horizon haze, no vignette, no screen-space post: the camera image is composited by the system, so our post pass cannot see it. Tilt-shift, bloom, colour grading, fog-as-post, and the current islands post pass must be off. Anything that writes alpha 1 over the whole frame turns the feed black (the classic mistake).
- Sea in AR: the sea mesh stays but must fade to alpha 0 at the island rim (a tank edge), or end in a visible rim/wall (a "diorama box"). An infinite sea against a real room looks wrong. Choose a clear edge rather than a soft fade (TUNING; owner to choose by looking).
- Tone mapping: AR needs the same tone map as the camera is plausible-looking; keep tone mapping on the materials not on a post pass, and expect a mismatch: the feed has its own exposure (PLAUSIBLE).
- Fog and weather: no global fog. Rain only as particles inside a box about 0.3 to 0.5 m above the island, 100 to 400 streaks (TUNING). Lightning: flash the island's own lights and the cloud puffs, never the whole screen. Fog: a thin low-lying mist sheet on the water, not distance fog. Weather in AR is mostly light colour and cloud shadow. WEATHER_PASS 7 already has AR rules; read it before building.
- Light estimation: ARCore/Chrome offers light estimation (VERIFIED, shipped per Google's page) with spherical harmonics, main light direction and intensity. The polyfill offers only a non-standard ambient intensity (AR.md). Our SH9 sky (RENDER_OPTIONS mode 4) takes the same nine coefficients, so the island can take the room's light (PLAUSIBLE; not built). Fallback: ambient scale clamped 0.6 to 1.4 (AR.md guess, TUNING) and a fixed warm key light.
- Shadow catcher: a `ShadowMaterial` plane under the island so the table gets a soft contact shadow; the island's own shadows from one directional light, shadow map 1024 (AR.md uses 2048 high, 1024 medium; TUNING). Baked land shadows (RENDER_OPTIONS modes 3 and 6) halve frame triangles and are the cheap choice; they fix the sun direction, so bake at placement from the estimate or accept a fixed sun.

### 2.4 Controls and UI in AR
- Gestures (VERIFIED as what AR.md built, mock-tested only): before placing, one finger drag does nothing; two-finger pinch scales; two-finger twist rotates; tap places. After placing: Re-place, turn left/right, Size slider, Quality, Exit AR in a bottom bar.
- DOM overlay rules (VERIFIED from AR.md for the polyfill; PLAUSIBLE for Chrome): pass `domOverlay: {root}` and put every HUD element inside that one root. The polyfill hides every other body child. Touches inside the overlay must be ordinary DOM pointer events; the polyfill does not turn them into XR select. If `domOverlayState` is not granted, end the session with a message. Chrome fullscreen-s the overlay root; keep it `pointer-events:none` except on buttons so touches reach our touch layer.
- Fixed UI sizes in CSS pixels, thumb reachable at the bottom, 44 px minimum targets, dark text on light chips because the background is a live camera of unknown brightness (PLAUSIBLE).

### 2.5 Performance in AR
- Camera feed cost: on the polyfill the feed is a native view and (per AR.md) frames are throttled and the image is a base64 JPEG, so expect a heavy, lower-fps feed (UNVERIFIED on a device; that is AR.md's own warning). Chrome Android composites the camera natively: cost is small but the phone also runs ARCore tracking (PLAUSIBLE).
- Budget AR as a handheld-low tier or lower (section 6). Pixel ratio 1.0 to 1.5, no post, shadows 1024 or baked only, sparks and particles capped (AR.md: High 300, Medium 150, Low 60 sparks; its High pixel ratio 2).
- Re-run the AR on/off check we already do in the mock: same draw calls and triangles with AR off (VERIFIED in AR.md for that game).

## 3. HANDHELD specifics

### 3.1 Touch and layout (all PLAUSIBLE standard practice; tuned on device later)
| Item | Rule |
|---|---|
| Camera | one finger drag = orbit; two-finger pinch = zoom; two-finger drag = pan; tap = select; double tap = focus. Use `pointer events` with `touch-action: none` on the canvas; track pointers by id; ignore a pointer that started on UI. |
| Tap targets | 44 CSS px minimum (Apple HIG number, PLAUSIBLE), 8 px gaps; selection by raycast with a 12 to 20 px tolerance for tiny people and animals. |
| Safe areas | `viewport-fit=cover`, use `env(safe-area-inset-*)` on HUD edges. Do not put buttons under the home indicator or notch. |
| Orientation | listen to `resize` and `orientationchange`; debounce 150 ms; resize the renderer once, not every frame. iOS reports stale sizes in the first frames after rotation, so re-read after 200 ms. Resizing an on-screen WebGL canvas repeatedly has been reported to leak memory on iPad (VERIFIED as a report: Apple developer forum thread 668999; treat as real). |
| Gestures vs browser | disable double-tap zoom and pull-to-refresh on the canvas (`touch-action`, `overscroll-behavior: none`); prevent page scroll on the HUD only where needed. |

### 3.2 Battery, heat and frame rate
- Cap at 30 fps for the first minute on handheld low, 60 on handheld high; drop to 30 when the frame time is over 20 ms for 2 seconds; rise again only with a manual setting (TUNING).
- Dynamic resolution: change pixel ratio in steps (1.5, 1.25, 1.0, 0.85) based on a rolling average of frame time over 90 frames; do not change the canvas size more than once every 5 seconds (see the leak report above). Alternative with no resize: render to a smaller viewport and scale with CSS. (TUNING.)
- Heat: sustained 60 fps at full DPR on a phone throttles within minutes (PLAUSIBLE). Offer "Battery saver": 30 fps, DPR 1, post off, sea Low path, particles halved.
- Pause the render loop when `document.hidden` or the window is blurred; stop timers that cost power. iOS suspends background tabs and may kill the page; save state on `visibilitychange` and `pagehide` (PLAUSIBLE; ledger/save format is in LI1A_WORLD_CONTRACT).
- Idle detection: after 30 s with no input and nothing moving, drop to 15 fps (TUNING). A slow scene still has tide, so only if animation is imperceptible.

### 3.3 Memory, context loss and limits on iOS Safari
| Item | What is known | Tag |
|---|---|---|
| Context loss | Safari can lose a WebGL context under memory pressure; WebKit bug reports describe heavy pages being killed and reloaded in a loop. Always register `webglcontextlost` (call `preventDefault`) and `webglcontextrestored` and rebuild GPU resources; the world itself must rebuild from `world_seed` plus the ledger (it is deterministic by contract). | VERIFIED as reports (WebKit bugzilla 300782 and others, search 23 Nov) |
| Memory is the usual cause | one 4096 x 4096 RGBA texture is 64 MB uncompressed (67 MB reported, with mips about 85 MB); "context lost" can be a red herring for plain memory exhaustion | VERIFIED as arithmetic and as one developer report |
| Canvas size | Safari has clamped the WebGL drawing buffer to 4096 per side; total canvas memory across canvases is capped (one write-up: 16,777,216 pixels per canvas area; a "total canvas memory" error appears with several large canvases) | PLAUSIBLE; per-version values UNVERIFIED |
| Page memory | one report: the browser process terminated at about 1.25 GB on iPad; Android loads 4 to 16 times more. A whole-page working set under 300 to 500 MB is a safe aim | PLAUSIBLE (reports), number is TUNING |
| Texture size | keep every texture at or under 2048 on handheld, 1024 for noise and masks; share one atlas; no uncompressed 4096 | TUNING |
| Triangles | recent iPads (A14 to M-class) and iPhones (A15 and later) can draw a few hundred thousand lit triangles at 60 fps in WebGL; 150k scene triangles (our current budget) is safe on those; older or base phones: 60 to 100k | PLAUSIBLE, not measured; per-device numbers UNVERIFIED |
| Draw calls | keep under 100 on handheld, under 50 on low (our scenes: about 30 to 40, RENDER_OPTIONS) | TUNING |
| Fragment cost | the sea at 21 taps (sea=2) and about 45 taps (flow=1) is the main risk on a phone because the sea covers most pixels (SEA_PASS, FLOW_PASS own estimates, unmeasured) | measured as counts, fps UNVERIFIED |

- Audio unlock: iOS needs a user gesture before an `AudioContext` plays; resume the context on the first tap, and also on `visibilitychange` back to visible (PLAUSIBLE standard). A "Sound on" first-tap button is the safest.
- Offline caching: a service worker with a versioned precache of the page, scripts, textures and `world` data; three.js bundled, not from a CDN, in the wrapper app (AR.md and PatchTown README both say bundle it). Cap the cache at tens of MB; iOS evicts caches for sites not used for about 7 days (PLAUSIBLE, UNVERIFIED today). The wrapper app does not have that eviction (custom scheme, UNVERIFIED).

## 4. DESKTOP specifics
| Item | Rule | Tag |
|---|---|---|
| Input | mouse: drag orbit, right-drag pan, wheel zoom to cursor, click select; keys WASD pan, Q/E rotate, space pause, 1 to 6 speed, F fullscreen; gamepad via the Gamepad API (stick pan, triggers zoom) | PLAUSIBLE |
| Fullscreen | `requestFullscreen` on a user gesture; handle Esc; on Mac Safari the fullscreen API is webkit-prefixed in older versions | PLAUSIBLE |
| High-DPI | DPR up to 2 on desktop by default; allow 1, 1.5, 2, "native" in settings; on 4K at DPR 2 the sea shader runs on 8 M pixels: provide a render-scale slider | TUNING |
| Shadows | 4096 map for a 500 m box is fine on a discrete GPU; use cascades or a tight box that follows the camera if softness shows; keep 2048 as the default | TUNING |
| GPU choice | `powerPreference: "high-performance"` is a hint at context creation. Spec guidance: the browser may only honour it if you register context lost/restored handlers. On dual-GPU Macs Safari has honoured it (WebKit bug 228298: fixed in Safari 15, VERIFIED as a report); Chrome historically only on OpenGL, later with Metal (old mailing list, UNVERIFIED today). | VERIFIED as reports, current status UNVERIFIED |
| eGPU on macOS | Apple's support page says eGPUs need an Intel Mac; Apple Silicon Macs do not use eGPUs. For an Intel Mac with an eGPU the user picks the GPU per app (Finder > Get Info > "Prefer External GPU") and the browser is the app. Apple Silicon: one GPU, nothing to choose. | VERIFIED (Apple support page found by search; Intel-only statement), steps for Get Info are PLAUSIBLE |
| Windows / Linux | per-app GPU in Windows Settings > Graphics for the browser (PLAUSIBLE); Chrome flags for ANGLE backend (PLAUSIBLE) | PLAUSIBLE |
| Show which GPU | read `WEBGL_debug_renderer_info` (`UNMASKED_RENDERER_WEBGL`) and show it in the self-test page and in a corner of the settings panel. Safari reports a generic "Apple GPU" (Mozilla bug report; older iOS data shows a specific A-series name: UNVERIFIED which now). Chrome may show an ANGLE string with the real GPU. Always also show `gl.getParameter(gl.RENDERER)`, max texture size, and our measured frame time. | VERIFIED as reports |
| Frame rate | do not assume 60 fps: laptops on battery, integrated GPUs and 120/144 Hz displays all differ. Use the same adaptive loop as handheld with a higher ceiling (60, or monitor rate when stable). | TUNING |

## 5. Feature x mode matrix (everything built or planned so far)

Costs are from our own docs (software GL counts, no fps). "keep / change / drop" is the proposal. T = triangles.

| Feature (switch) | DESKTOP | HANDHELD | AR | Cost note |
|---|---|---|---|---|
| Landing pass (`?pass=landing`) | keep, full | keep; pebbles 1,000 to 400 on low | keep, props scaled up 2x, people as dots at far size | 124k T (default 88.8k); +35.7k T, 28 meshes |
| Sea `?sea=2` | keep High (21 taps) | keep; Low path (about 12 taps, 5 trains) on low | simplify: Low path, longer min wavelength, bolder foam, edge treatment; drop tilt-shift and far glitter | shader only, T unchanged |
| Flow `?flow=1` | keep High (about 45 taps) | Low (about 25 taps) or drop streak layers; flotsam halved | Low; keep flotsam but 2x bigger, current arrows as 3 to 4 mm streaks | 143k T with landing; roughly 2x sea=2 per pixel |
| Seabed `?seabed=1` | keep | keep | keep but only seen through clear shallows; cut shelf width if the rim is a tank edge | +8.4k T |
| Weather `?weather=` clouds | keep dome and puffs | dome off; puffs only (64 to 150) | no dome; puffs 0.3 to 0.6 m above table, cloud shadow on island; sun scale from light estimate | +4 draw calls, +2 taps land, 32-step loop |
| Rain | full (up to 3,600 tris) | halved (Low rule) | box above island, 100 to 400 streaks | up to 3,600 T |
| Fog | distance fog | density fog, cheaper | mist sheet on water only, no scene fog | one uniform |
| Lightning | flash dome + lights | flash lights only | flash island lights + puffs, never full screen | cheap |
| Sky clock (sun, moon, stars) | full sky, stars, moon | sun and moon discs, fewer stars | no sky; keep the sun direction as the shadow light; show time by light colour and a small clock UI; moon/stars as a small orb or HUD | stars as points, cheap |
| Trees and vegetation | full, instanced | instanced, fewer variants, no leaf alpha | scale 1.5 to 2.5x; silhouettes only | instancing keeps draw calls low; alpha leaves cost overdraw |
| People styles | full, with shadows | simplified, shadows blobbed | dots or 2 to 3x figures; no names in 3D, use DOM chips | counted, not tracked (ledger rule) |
| Wildlife | full | fewer, seals and birds only at a distance cap | exaggerated, birds as bright flecks; seals on rocks only | counted, deterministic |
| Ledger | UI panel | bottom sheet | DOM overlay card | pure UI, no 3D cost |
| Landform worlds | full | full; smaller heightmap on low | full, vertical exaggeration | load-time cost, memory |
| Blender baked land | 2048 baked textures | 1024 baked | 1024 baked; bake direction at placement or accept fixed sun | texture memory is the main cost |
| Particles (sparks, spray, smoke) | full | half | quarter (Low = 60 sparks in AR.md) | per particle overdraw |
| Post (tilt-shift, grade) | on | on high only; off on low | OFF (hard rule) | 22 taps on blurred rows (RENDER_OPTIONS) |

## 6. Tier ladder (all numbers TUNING until measured on a device)

| Tier | Target device | Triangles | Draw calls | Texture memory | Sea taps/px | Particles | Shadow | Post | DPR cap | fps |
|---|---|---|---|---|---|---|---|---|---|---|
| T0 reference | big desktop GPU | 250k | 120 | 400 MB | 45 (flow) | full | 4096 | on | 2 | 60 to monitor rate |
| T1 desktop | laptop, integrated | 150k | 80 | 250 MB | 21 to 45 | full | 2048 | on | 1.5 | 60 |
| T2 handheld high | recent iPad, recent iPhone Pro | 150k | 60 | 200 MB | 21 | 75% | 2048 or baked | light | 1.5 | 60 (30 on heat) |
| T3 handheld low | older iPad, base phone | 90k | 40 | 100 MB | about 12 (Low) | 50% | baked only or 1024 | off | 1.0 | 30 |
| T4 AR | Android, Quest, wrapper app | 90k | 40 | 100 MB | about 12 | 25% | 1024 or baked + catcher | OFF | 1.25 | 30 to 60 |
| T5 phone small | small phone screen | 60k | 30 | 64 MB | 5 trains, no chop | 25% | none, blob shadows | off | 1.0 | 30 |

Auto-pick method:
1. Detect: `navigator.xr` immersive-ar support (offer AR only if true), pointer type (`coarse` means handheld), screen size and DPR, `hardwareConcurrency`, `deviceMemory` where present (Chrome only, PLAUSIBLE), GPU string, max texture size.
2. Benchmark at load for about 1 second: render the real sea at 3 resolutions into the real canvas, measure median frame time using `requestAnimationFrame` deltas (not `gl.finish`, which is unreliable); pick the highest tier whose frame time is under 70% of the budget (11.6 ms for 60, 23 ms for 30). Never time the first frames: shader compile hitches (AR.md notes a recompile hitch on the first frame of a level).
3. Runtime adaptation: rolling 90-frame average. Over budget for 2 s: step down one knob in this order: DPR, particles, post, shadows, sea Low path, triangles. Under 60% for 10 s: step up one. At most one change per 5 s; never resize the canvas more than once per 5 s.
4. Manual override: Auto, High, Medium, Low, Battery saver, with the chosen tier and measured ms shown. Remember the choice in `localStorage` under one key (wrap in try/catch; private mode can throw). Store the tier and the device signature so a different device re-benchmarks.
5. Always show the active tier in a small corner readout. Never silently drop below T3.

## 7. Testing without a device

| Tool | What it can do | What it cannot |
|---|---|---|
| Playwright with a mock `navigator.xr` (AR.md did this: fixed viewer pose, floor hit 1 m ahead, fake camera feed, scripts `mock-xr.js` and `art.js` in a session scratchpad, not in the repo) | AR button logic, session start, placement maths, scale 0.7 m long side, DOM overlay moves, exit restores scene (checked over 3 cycles), stick direction | camera feed cost, hit-test quality, light estimation, drift |
| Playwright touch emulation (`hasTouch`, `isMobile`, iPad and iPhone viewport sizes, `devices[...]`) | layout, safe-area CSS (with fake insets), touch gestures via dispatched pointer events, rotation | real Safari behaviour, memory kills |
| Software GL (SwiftShader) frame time | relative cost between two builds only (taps, passes); triangle and draw call counts are exact | absolute fps, thermal, memory; our own notes say numbers under load were noise |
| `renderer.info`, texture memory estimates from sizes | exact counts of draw calls, triangles, textures; texture bytes by arithmetic | driver memory overhead |
| Meta Immersive Web Emulator (a browser extension) | UNVERIFIED for our use; lists AR, hit test, plane, mesh modules (Meta blog) | not tried; extension install is out of scope here |

Only a real device can answer: fps and heat over 10 minutes on each tier; whether Safari kills the page and at what memory; whether the camera feed shows (alpha, premultiplied); the polyfill's real hit-test quality, drift and light estimation range; touch feel and tap sizes; audio unlock; whether `immersive-ar` support is true in the owner's wrapper app; what GPU string Safari reports; the PatchTown app building at all; the look of exaggerated waves on a real table.

### On-device self-test page (spec, to build later)
One static page `device_check.html`, no assets, owner opens it and reads one line back. It does: create a WebGL canvas (`powerPreference: "high-performance"`, with context lost handlers), read renderer string (debug info extension) and `gl.getParameter(gl.RENDERER)`, max texture size, `deviceMemory` and `hardwareConcurrency`, DPR, screen size, `navigator.xr` presence and `isSessionSupported('immersive-ar')` result, `matchMedia('(pointer: coarse)')`; run a 5 second synthetic load (a full-screen noise fragment shader plus 100k triangles) and report median and 95th percentile frame time at DPR 1 and native; allocate 8 textures of 2048 x 2048 and report if context is lost. Output: one copyable line like `iPad | Apple GPU | tex16384 | dpr2 | xr:no | med 8.3ms p95 14ms | 2048x8 ok`. This is a design only; we do not build it in this note.

## 8. Common mistakes
| Mode | Mistake | Fix |
|---|---|---|
| AR | opaque `scene.background` or renderer `alpha:false` left on | null it; transparent html/body |
| AR | any post filter, tilt-shift, bloom | disable the whole post pass in AR |
| AR | shadow map too big (4096 for a 1 m island) | 1024 or baked; fit the shadow box to the island |
| AR | units not rescaled (world 400 m shown 400 m wide; or lights and fog left at world scale) | one group scale; scale lights, shadow box, near/far |
| AR | HUD outside the DOM overlay root | move all UI into the one root; polyfill hides the rest |
| AR | ripples, foam and people at real size | exaggeration table in 2.2 |
| AR | infinite sea and sky dome | rim or tank edge; no dome |
| AR | tapping places only with a hit that never comes | preview ring plus a "1 m ahead" fallback |
| AR | AR code changes the non-AR path | check draw calls and triangles equal with AR off |
| Handheld | too many draw calls, alpha-blended particles with full-screen overdraw | merge, instance, cap particles |
| Handheld | huge textures (4096) and no memory counting | 2048 cap, one atlas |
| Handheld | no context-loss handling | handlers plus deterministic rebuild |
| Handheld | tap targets under 44 px | enlarge, add tolerance |
| Handheld | resizing the canvas every frame or on every address-bar change | debounce; scale with CSS |
| Handheld | 60 fps at DPR 3 on a phone | cap DPR at 1.5; battery saver |
| Handheld | audio before a user gesture | unlock on first tap |
| Desktop | assumes 60 fps on every machine | adaptive loop, show ms |
| Desktop | assumes the big GPU is used | show the GPU string, hint high-performance, document the OS setting |
| All | tier chosen from the user agent | detect features and measure |
| All | switching tier mid-session changes the world (random draws) | tier changes only the look, never the seed or ledger |

## 9. What is faked
- AR "occlusion", real room lighting and a real horizon: none. The island always draws over the real scene; light is a coarse estimate or a fixed key light.
- The miniature: waves, trees, people and tide are exaggerated on purpose; the physics inside the world stays at real size.
- Tilt-shift: it is a post pass on desktop and handheld only; in AR the real camera supplies depth of field.
- Quick Look is a static model, not the game.
- All budgets in section 6 are guesses until a device measures them. All fps claims in this repo so far are unmeasured (software GL).

## Could not verify
- Whether iOS 27 or any Safari build added `immersive-ar` after the sources found (no WebKit tracker page was readable).
- Whether Chrome Android DOM overlay is on by default in current builds (only an old page found); the ARCore supported-device list.
- Quest Browser plane and mesh detection on device; current Chrome GPU selection on dual-GPU Macs; the exact Safari WebGL renderer string on current iOS.
- Real iPad/iPhone triangle, texture and memory limits; thermal behaviour; service-worker cache eviction timing today.
- Spec text (immersive-web.github.io, caniuse) was not reachable; light-estimation details are from Google's feature table only.

## Sources
| Source | Used for | Licence / note |
|---|---|---|
| Apple developer forum thread 826845 (WebXR AR module, visionOS, Jun 2026) | visionOS immersive-ar not supported | forum text, quoted briefly, not reused |
| Apple developer forum threads on WebXR iOS (search results) and a 2026 WebXR support guide | iOS Safari immersive-ar unsupported | search summary; not re-read in full |
| WebKit bug 208988 (WebXR tracker) | status pointer | public bug tracker |
| WebKit blog 8421, Apple Quick Look docs | Quick Look USDZ, MIME type, `rel="ar"` | public docs |
| Google ARCore WebXR comparison page, developer.android.com XR web page | Chrome shipped features | public docs |
| Meta Horizon WebXR mixed reality docs, Horizon Browser 40.4 article, Immersive Web Emulator blog | Quest passthrough, hit test, emulator | public docs |
| WebKit bugs 228298, 300782, 289601 and others; Apple forum 668999; pqina canvas-limit posts | GPU hint, memory kills, canvas limits | public reports; numbers are reports |
| Mozilla bug on Safari "Apple GPU"; MDN WEBGL_debug_renderer_info | GPU string | MDN is CC-BY-SA; used as fact only |
| Apple support: external graphics processor with your Mac | eGPU Intel-only | public page |
| Local: baguettes AR.md, HANDOVER.md; PatchTown iOS README, NATIVE_BRIDGE.md, BUILD_AND_TESTFLIGHT.md (the owner's own repo) | polyfill table, AR design, app status | own project, read only, not built or run |
| Local: RENDER_OPTIONS, SEA_PASS, FLOW_PASS, SEABED_PASS, LANDING_PASS, WEATHER_PASS | cost numbers | own project |
