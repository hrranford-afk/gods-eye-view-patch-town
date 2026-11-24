# The ULTRA quality tier (&q=ultra)

A third state for the Quality button: Low, High, Ultra. It exists to use a real graphics card (Harry's Radeon VII in the Razer Core X) and a big screen (1080p at the desk, a 4K TV in the lounge). **Low, High and the AR profile are unchanged** (default page hash 8d962c0c, 88,790 triangles, `tests/look-test.js` passes untouched). Ultra is desktop only: `&tier=ar` and `&clock=1&clockdome=0` refuse it and stay on High.

**What was NOT measured, plainly.** Everything here was run on software GL (SwiftShader, no graphics card, a machine shared with other jobs). That proves the settings are applied, nothing breaks, and the pictures; it says nothing about real speed on the Radeon, the Thunderbolt link, or a TV. Every cost number below is an estimate. The benchmark panel is how Harry measures it.

## Files
- `ultra.js`: the pure parts (GPU name classifier, URL switches, the dynamic resolution controller, bench verdict and report text). No DOM, tested in node.
- `islands_look.html`: the ultra block (search for "the ULTRA tier"), plus small hooks. Default paths are the old code; ultra paths are behind `ULT.on`.
- `camp_start.js`: two opt-in options (`hero`, `lodScale`), absent means unchanged.
- `tests/ultra-test.js` (pure node, 68 checks), `tests/ultra-page-test.js` (playwright, software GL), `tests/ultra-render.js` (the pictures).

## Settings per tier
| | Low | High | Ultra |
|---|---|---|---|
| Output pixel ratio cap | 1.0 | 1.5 | device ratio up to 2 (real pixels) |
| Internal render scale | 1.0 | 1.0 | dynamic: 1.0 to 2.0 supersampling on a 1080p-class screen; on a 4K-class screen below native (0.5 to the profile's top) then a sharpening upscale |
| Multisampling (WebGL2 render target) | 0 | 4 | 8 (4 on the tv and handheld profiles), clamped to what the GPU allows, falls back to 4, 2, 0 |
| Shadow map | 1024 | 2048, PCF soft | 4096 (2048 on handheld), PCF with radius 1.5 texels (17 taps), frustum fitted to the visible ground and snapped to the texels |
| Terrain cell | 0.90 m | 0.55 m | 0.40 m (`&terrain=`) |
| Terrain + props triangles, default view | 60,752 | 88,790 | 127,738 |
| Anisotropy | page 4, GLB 1 | same | the most the GPU gives (16 on most), applied to GLB textures too |
| Bloom | none | none | gentle (0.10) in the downsample pass: only values above 0.9 linear glow |
| Boats | no hero | hero within 12 m (http only) | hero within 60 m, live out to 260 m (`&herod=`) |
| Camp kit pieces | live and far | same | hero within 90 m (`&kitd=`), live out to 1.8 times as far; hero GLBs over http only |
| Repair jetty | live frame | live frame | hero frame (8,356 triangles instead of 1,802), over http only |
| Triangles in the pictures (software GL, with heroes) | | camp 118,719 / dinghy 135,764 / jetty 106,878 | camp 210,884 / dinghy 206,542 / jetty 164,752 |
| HUD | fps, tris, tier | same | adds scale, msaa, shadow, profile, dpr, window, canvas, render size, UI scale |

Over `file://` the hero models cannot be fetched, so ultra keeps the live level there (everything else still applies). The world robots only have a live GLB (no hero level exists), so the robot yard is already at full detail; the sea is a fragment shader on a flat quad, so there are no sea segments to raise.

## Switches (all in the URL, all optional)
`&q=ultra` `&ssaa=1.5` (largest scale, 1 to 2) `&dyn=0` (pin the scale at ssaa) `&minscale=0.6` `&msaa=4` `&shadow=2048` `&soft=2` `&fit=0` `&terrain=0.5` `&aniso=8` `&bloom=0` `&herolod=0` `&herod=40` `&kitd=60` `&fps=30` (target) `&maxpx=8294400` (largest big render target) `&bench=1` `&profile=desk|tv|handheld` `&render=2160` (tv internal height, default 1800) `&uiscale=2`.
The choice made with the Quality button is kept in `localStorage` (inside try/catch); an explicit `&q=` beats it; automation (`navigator.webdriver`) never reads it, so the tests see the plain default.

## Dynamic resolution
`LI_ULTRA.createDynRes` in `ultra.js`. It is fed one number per frame: the work time of the frame (the GPU timer query `EXT_disjoint_timer_query_webgl2` when Chrome offers it, otherwise a `gl.finish()` sampled every 4th frame) or, when a frame came late, the real interval. A moving window of 40 samples; no decision until a fresh window after any change. **Lower** when the window average is over 95 percent of the budget (16.7 ms for 60 fps) or its 95th percentile over 150 percent, at least one step, more when far over (cost taken as proportional to scale squared), not sooner than 1.2 s after the last change. **Raise** one step only when the average is under 70 percent, the 95th percentile under 90 percent, and the cost predicted at the next scale (average times (next/now) squared) is still under 85 percent of the budget, not sooner than 3.5 s after the last change. The prediction sits below the lowering threshold, so a steady scene settles and stays (tested: six cost models, noisy, no two changes closer than the gap, no up-down-up repeat, settles inside 30 s, always inside the range). A single hitch does not move it. Steps are 1/16 (0.0625). Changing the scale makes the render target again (a small hitch, rare).
On an integrated or software chip ultra starts with the maximum scale 1.25 (1.0 for software) and 4 samples unless the URL says otherwise.

## Render path in ultra
scene, into a multisampled half-float target of (output size times scale); then one **present pass** into an output-size target: for scale above 1 a 3x3 downsample with a small kernel (a real supersample resolve) plus bloom; for scale 1 up to 1.5 a light contrast-adaptive sharpen; for scale **below 1** a Catmull-Rom bicubic upscale (9 bilinear taps) followed by contrast adaptive sharpening (the idea of AMD's CAS, written here from its description, no code copied); then the page's own post pass (tilt-shift, grade, vignette, grain). With `post=0` there is no chain: the canvas itself is made larger and the browser scales it down, with `antialias:true` if ultra was asked for at load. A render target that cannot be made, or a failed probe of the shadow map, falls back down a ladder (shadow 4096 to 2048, samples 8 to 4, scale to 1.25, samples 2 or 0, shadow 1024, scale 1) and, if nothing works, drops to High. Tested with 0 console errors.

## 4K: why it looked bad, and what ultra does (CAIRN notes, items 1, 2, 3, 4, 10 of the APPLY LIST)
**Why 4K looks bad today (read from the code).** `size()` sets `dpr = min(devicePixelRatio, 1.5)` for High (1.0 for Low), calls `setPixelRatio(1)` and leaves the canvas CSS at 100 percent, so the browser stretches the canvas. On a 4K TV in macOS "looks like 1080p" mode the device pixel ratio is 2 and the window is 1920 CSS px wide: the canvas is 2880 by 1620 and the browser stretches it 1.33 times with a plain bilinear filter (soft). In native 4K mode (ratio 1, 3840 CSS px) the canvas is 3840 wide but the 14 px and 44 px UI are tiny from a sofa. (This is the same diagnosis as `research/GRAPHICS_POLISH_1080P.md`; I could not see Harry's screen, so it is the likely cause, not a proven one.) High and Low keep that behaviour on purpose.
**Done inside ultra only:**
1. Item 1, diagnosis line: the ultra HUD line shows `dpr`, `window WxH`, `canvas WxH`, the render size and the UI scale; the bench panel and report give the device pixel ratio, the real pixels (window times ratio), the canvas in real pixels, the big target and the scale range.
2. Item 2, size by physical pixels and a final present pass: the canvas is `innerWidth*dpr` by `innerHeight*dpr` with dpr up to 2, so the browser never stretches it (canvas equals real pixels). The internal size is the render scale of that. The tv profile defaults to 1800p internal (`render=1800`), MSAA 4, and the sharpening bicubic upscale to 2160p; native 2160 is a menu choice (`TV 4K native`, or `&render=2160`). The dynamic controller may go down to 0.5 of native, then the same present pass upscales. Pixel budget: the big target never exceeds 8.29 million pixels (`&maxpx=`), so ultra never supersamples at 4K.
3. Item 3, pixel-valued post: the tilt-shift radius was already proportional to the height (`hpx*.0085`) and the vignette is in uv units, so only the grain was fixed in pixels: in ultra the grain cell grows with `round(H/1080)`.
4. Item 4, UI profiles with a menu: a `Profile` menu in the top bar (auto, Desk 1080p, TV 4K 1800p, TV 4K native, Handheld). Auto picks tv for 3000 or more real pixels across, handheld for a coarse pointer on a small screen, else desk. The UI (top bar, tide bar, HUD, bench panel) is zoomed by CSS `zoom`: tv 1.5 times, and a window that is 3840 CSS px wide is zoomed again by width/1920 (so up to 3.0); `&uiscale=N` overrides. The HUD lines move up with the zoom so they do not overlap the tide bar.
10. Item 10, shadow camera fit and 4096: the shadow frustum is fitted each frame from the four corner rays of the camera met with the ground (kept inside the table), in the light's own frame, a square snapped to shadow texels so it does not shimmer; 4096 on desk and tv.
**Not done (as asked):** items 5 to 9, 11, 12 (aerial perspective, hemisphere and white balance, water, wetness, wind, bloom mip chain and god rays, depth-aware tilt-shift). No ambient occlusion or contact shadows were added (see gaps). The bloom here is the small one inside the downsample pass.
**Plug the TV into the Razer box, not the Mac** (CAIRN research): frames from a TV on the Mac cross the Thunderbolt link.

## Device presets (&device=)
One switch, four named sets of **defaults**. A preset only fills in parameters the URL does not already have, so an explicit `&q=`, `&tier=`, `&post=0`, `&ssaa=` and so on always win (the AR tier is the one safety exception: ultra is refused under AR even if asked). The URL itself is not rewritten. No `&device=` (or an unknown name) changes nothing: default page hash 8d962c0c, 88,790 triangles. The small readout (the info line) ends with `device <name>`; the bench report carries `device:`; `__li.ultra.device()` returns it.
| `&device=` | Fills in (only where absent) | Result |
|---|---|---|
| `ar` | `tier=ar`, `clockdome=0`, `q=low` | the lightest page: Low tier, the AR profile (no sky dome with the clock, one rung of the camp, no hero models), ultra refused |
| `ipad` | `q=low`; the page gets `dev-touch`: buttons at least 52 px, tide slider 44 px, font 16 px | Low tier (pixel ratio cap 1.0, 1024 shadows, no ultra effects) with bigger touch targets |
| `desktop` | `q=ultra`, `ssaa=1.25`, `msaa=4`, `shadow=2048`, `terrain=0.55`, `bloom=0` | the ultra tier with only its cheap and safe parts: fitted 2048 shadows (4 times the effective texel density of High), 4 samples, up to 1.25 supersampling that the dynamic controller can drop, finest anisotropy, hero models, finer-than-High terrain at the High cell size; profile auto (1080p desk or 4K tv with the 1800p internal size and the bigger UI) |
| `radeon` | `q=ultra`, `bench=1` | everything in ultra (supersampling 1 to 2 dynamic, 8 samples, 4096 shadows, bloom 0.10, terrain 0.40, hero LODs), the bench panel open, the GPU readout (always on), dynamic resolution on. On a built-in chip ultra still limits itself unless `&ssaa=` is given |
Examples: `?device=radeon&q=high` is High with the bench panel; `?device=desktop&post=0&q=high` is plain High without the post chain; `?device=ar&q=high` is the AR profile at High. Tested in `tests/ultra-page-test.js` (cases `device-*`).

## The bench panel
Press **Bench** (shown in ultra, or `&bench=1` on any tier). It shows frame ms average and 95th percentile over the last 180 frames, draw calls, triangles, canvas pixels, device pixel ratio, render scale and range, the GPU work time and its source, and the GPU line (in amber for a built-in chip: "On a Mac with two GPUs, Chrome may pick the built-in one"). **Run benchmark (10 s)** spins the camera for 10 seconds with the scale held, then prints average fps, average ms, p95, worst frame, work time, the scale during the run and a verdict: `plenty of headroom`, `near the limit`, or `too heavy: lower the scale`. **Copy report** puts the text on the clipboard (the box also lets you select it). It works on High and Low too, so Harry can compare tiers.

## How Harry should test (about 10 minutes)
1. Serve the folder over http (the hero models do not load from file://): `cd games/living-islands && python3 -m http.server 8000`, open `http://localhost:8000/islands_look.html?q=ultra&bench=1`. (Or the usual page URL with `&q=ultra&bench=1`.)
2. Look at the GPU line. If it says Intel or Apple, Chrome picked the built-in chip: plug the TV into the Razer box and make it the primary display, check Activity Monitor, GPU History.
3. Press **Run benchmark** and paste the report. Do it at: `?q=high&bench=1`, `?q=ultra&bench=1` (the default dynamic scale), `?q=ultra&bench=1&dyn=0&ssaa=2` (fixed 2x), and on the TV with the Profile menu on `TV 4K (1800p)` then `TV 4K native`.
4. Paste back: the four reports; on the TV also the HUD lines (dpr, window, canvas, render size); whether the picture is sharp, whether the buttons are readable from the sofa, and any flicker when the scale changes.
5. `&herolod=0`, `&shadow=2048`, `&msaa=4`, `&bloom=0` isolate the cost of each feature.

## Pictures (software GL, 2400 x 1350, same view and frozen clocks)
`shots/ultra-compare.png` (High left, Ultra right: camp day one, the dinghy, the repair jetty, each with two 2x crop insets), `shots/ultra-crops.png` (the same crops at 3x), `shots/ultra-1.png` (camp, ultra), `shots/ultra-2.png` (the repair jetty, ultra). Ultra was forced to the full 2x scale and 4 samples (software GL allows 4).
**How much better, honestly.** Visible and real, but modest on a still frame: (a) stair-stepped edges of rocks, posts and roof ridges in High are smooth in Ultra (supersampling); (b) the hero kit pieces and the hero jetty frame show detail High never draws (corrugated roof with moss, rounded posts); (c) shadows are crisper and better placed (fitted frustum, 4x the texels), not softer: the soft look is a 1.5 texel penumbra; (d) the dinghy picture is almost the same in both because High already shows the hero boat within 12 m (only edges differ; the oar pose differs because the rowing clock is not frozen by the clock hold). Bloom is barely visible at 0.10. Iterations: the first camp view was wrong (looked at the sea) and was redone twice (target and distance); the crop boxes were re-picked after looking at full-size frames. I did not raise the effect strengths just to make the sheet look dramatic.

## Tests
- `node tests/ultra-test.js`: 68 pass (GPU names: AMD Radeon VII, Radeon Pro, Intel UHD Graphics 630, Apple M1, NVIDIA GeForce RTX, Intel Arc, Iris, Vega 8, RX, SwiftShader; URL switches; the ladder; the controller raises on low frame time, lowers on high, never moves faster than the gaps, stays in range, settles, ignores a hitch, works below 1.0; verdicts; report text).
- `tests/ultra-page-test.js` (software GL, 640x400 windows; 90+ checks): 0 console errors on default, high, low, ultra, ultra with every switch, post=0 (high and ultra), AR (two ways), camp, boatkit, repair, clock, light, moods, world+life, everything at once; the HUD shows a GPU name; the button cycles High, Ultra, Low, High (two states in AR); the choice is remembered and an explicit `&q` beats it; the failure ladder; the bench run and report; a 3840x2160 window (profile tv, range 0.5 to 0.833, UI zoom 3, canvas 3840x2160, internal 3200x1800, scale 0.5 renders 1920x1080).
- Existing tests re-run on the final code: look-test 7 of 7 (hash 8d962c0c, 88,790 / 60,752 triangles), moods-page-test 52, clock-page-test 50, camp-page-test 38, boatkit-page-test 40, camp-test and boatkit-test pass. light-page-test (58 pass, 1 fail: "world 5 with life: lighthouse stands on high ground") and repair-page-test (62 pass, 1 fail: "tap the plank, then tap its slot: fitted (1 of 9)") each have one failure that is **identical on the commit before this work (609ac10, checked in a clean worktree)**, so it is not caused by the ultra tier.

## Ranked gaps
1. **No real measurement.** Speed, the GPU timer, the Thunderbolt cost, whether Chrome picks the Radeon: all unknown until Harry runs the bench.
2. The controller's work-time source on Chrome for Mac is unverified (timer query may be off, then the sampled `gl.finish()` stands in; it over-reads a little, so ultra may settle a step low).
3. Scale changes remake the render target (a hitch); steps are rare but not free.
4. Shadows: soft PCF only; no contact hardening or cascades; shadow bias was not retuned for 4096 and may show acne on some slopes.
5. No ambient occlusion, no contact shadows, no temporal AA (the sea glitter and fine noise still shimmer; MSAA does not touch shader aliasing).
6. Hero levels need http; none for the world robots or the sea; camp hero pieces are not LOD-blended.
7. Bloom is a simple 2-ring tap, not a mip chain.
8. The 4K diagnosis is from the code and CAIRN's note; Harry's `devicePixelRatio, innerWidth, innerHeight` from the HUD will confirm it.
9. UI zoom uses CSS `zoom` (Chrome and Safari fine; very old Firefox ignores it).
10. The first-run auto quality (autoQ) steps ultra down to High, never to Low.

## A LEVEL 2 rewrite on a newer three.js would add
Cascaded shadow maps and PCSS in the box; a proper `RenderTarget` with a depth texture and MSAA together (SSAO, depth-aware tilt-shift, contact shadows, soft particles); `OutputPass` and a maintained post stack (bloom mip chain, SMAA/TAA, FXAA fallback); WebGPU renderer with compute (the Radeon's strength: bandwidth), indirect and instanced culling for forests; timestamp queries that work the same everywhere; KTX2 textures with mip bias for the upscaler; physically based sky and aerial perspective; modern `MeshPhysicalMaterial` baked-AO workflow; and a real scene-graph LOD with cross-fade.
