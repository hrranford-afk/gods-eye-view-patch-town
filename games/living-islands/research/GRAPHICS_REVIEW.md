# Graphics review and cost ladder (26 Nov)

Why this note exists: the owner asked for a full review of what we spend the graphics allowance on, and what we got wrong when we measured it. This is the audit (item 1 of the job). The tool that answers the open questions on a real device is the cost ladder (`&cost=1`, item 2), and the shared limits table is `tiers.js` (item 3).

**How to read the numbers.** Three kinds, never mixed:
- **Counted** (exact): triangles, draw calls, texture sizes, render target sizes, shader loops. Read from the code and from `renderer.info` in a headless run. They do not depend on the machine.
- **Owner-measured** (real devices): the iPad sea bench (26 Nov), the Radeon VII page run and the two iPad page runs (24 Nov). They are in `SEA_BENCH_IPAD_26NOV.md` and `RADEON_FIRST_MEASUREMENT.md`.
- **Software GL** (SwiftShader in headless Chromium, on a machine that other jobs also use): relative only. It draws with the CPU, so it is far more pixel-bound than any real GPU, and the same scene varied by up to 2x between two runs of the same build while the machine was busy. It says which layer is big in the code path; it does not say what an iPad or a Radeon will do. Nothing below claims real-device speed.

The Gift page was audited with `?game=gift&device=ipad|desktop|radeon&stepdown=0` (the Gift page is `islands_look.html` with `game=gift`). iPad at 834x1062, desktop and radeon at 1280x720, camera at the default camp view, day.

## 1. The cost lines

| Layer | iPad (`device=ipad`, tier low) | Desktop (`device=desktop`, ultra) | Radeon (`device=radeon`, ultra) | Cost kind | Notes |
|---|---|---|---|---|---|
| Render resolution, pixel ratio | canvas = css size 834x1062 (0.89 Mpix). Pixel ratio cap 1.0 (`QUAL.low.pr`), so the 1668x2124 screen shows it stretched 2x: soft | canvas = css size at ratio 1 to 2 (cap `ULT.q.pr` 2); offscreen target up to 1.25x (preset `ssaa=1.25`) | offscreen target up to 2.0x, at most 8.29 Mpix (`maxpx`); the 24 Nov run settled at 1.56x on 1360x680 | pixels | The single biggest knob on every device. Owner iPad: 1.5x css held 60 fps on the sea bench, 2x (native) took 24.1 ms, 3x 48.2 ms |
| MSAA | none (`QUAL.low.msaa` 0; the bench panel printed "msaa 4", which was wrong, see section 2) | 4 samples (preset), offscreen target | 8 samples asked, clamped to what the GPU gives; 24 Nov run used 8 | pixels, memory | 4 to 8 samples on a half-float target. Estimated target memory (formula, not measured): iPad 0; Radeon at 2125x1063 about 215 MB, at full 2x on 1080p about 800 MB |
| Shadow map: size | 1024 | 2048 | 4096 | memory, pixels | One directional light, one map, **no cascades** |
| Shadow map: coverage | square half-size `clamp(dist*0.62, 30, 112)` m, not snapped | tight frustum fitted to the visible ground each frame, snapped to texels (`ultraShadowFit`) | same, 4096 texels | pixels | Fitted + snapped = stable and sharper per texel |
| Shadow map: update rate | redrawn **every frame** (`autoUpdate` true) | every frame | every frame | vertices, draw calls | Nothing is cached. Pass counted in the Gift camp view: iPad 62,012 triangles and 162 draw calls, desktop 94,316 and 196, radeon 119,584 and 196 |
| Shadow type | PCF soft (3x3 hardware taps) | PCF, radius 1.5 texels | PCF, radius 1.5 texels | pixels | Terrain and the merged props mesh both **cast** shadows, so each is drawn twice per frame |
| Post effects | one full-screen pass: tilt-shift blur (9 spiral taps), ACES tone map, grade, vignette, grain | full-screen post with 22 taps, plus the downsample pass (Catmull-Rom 9 taps, contrast sharpen) when the target is not 1:1; bloom **off** in the preset | 22-tap post, downsample pass, bloom 0.10 (8 directions x 2 radii = 16 taps) | pixels | iPad render target is half-float where the GPU allows it. Post rung in the software ladder: iPad about +10 percent, desktop +36, radeon +42 (the larger share includes the offscreen target and MSAA resolve) |
| Sky | gradient dome, 528 triangles, drawn first with depth test off; sun and moon discs; star points (2,200, hidden by day) and a Milky Way dome (also hidden by day) | same | same | pixels (a screen-sized fill) | One pass over every pixel the sea and land do not cover |
| Clouds | 32 camera-facing instanced quads (cumulus puffs, 2 triangles each) drawn with a noise shader and fake sphere light, one cloud-deck quad, 1,800 rain quads when it rains | same | same | pixels (large alpha quads), shader loops | **Cloud shadows**: the sea and land fragment shaders loop over all 32 puffs plus two noise octaves for every pixel they draw (`weather.js`, NP = 32). That loop runs even on a clear day |
| Sea mesh | polar grid 72 x 160 = 23,040 triangles | 140 x 320 = 89,600 | 220 x 480 = 211,200 | vertices | One draw call. Camera does not cull it (`frustumCulled` false) |
| Sea vertex shader | 8 Gerstner waves (3 swell, 5 wind sea) | 16 (4, 7, 5 chop) | 24 (5, 9, 10 chop) | vertices | Wave evaluations per frame about 92 thousand, 717 thousand, 2.5 million |
| Sea fragment shader | 4 pixel ripples, sky reflection, sun glint, foam, shallow tint, fog, cloud-shadow loop | 7 ripples | 10 ripples | pixels | Full-screen on a sea-heavy view, so it scales with pixels, not with the mesh |
| Terrain | 11,810 triangles (cell 0.90 m) | 29,446 (cell 0.55) | 54,714 (cell 0.40) | vertices, pixels | One draw call, procedural land shader. Biggest single layer in the software ladder on every tier: 27 to 33 percent of the render |
| Trees, rocks, houses | one merged mesh, **no instancing**: 18,735 triangles | 27,533 | 27,533 | vertices | One draw call, cast + receive shadow, flat-lit (MeshLambert). Trees are not separate objects, so they cannot be turned off alone |
| Camp kit and gift pieces | about 22,500 (kit) + 5,200 (gift) + 2,400 (jetty) + 260 (boat) triangles, standard PBR material, about 120 small meshes | about 21,900 + 2,900 + 2,400 | same as desktop | draw calls, vertices | The draw-call count is mostly these small meshes (`MeshStandardMaterial` is the dearest per pixel material on the page) |
| Particles | smoke 40 points; spray 600 and stars 2,200 (hidden by day) | spray 4,000, stars 4,500 hidden | spray 12,000, stars 4,500 hidden | pixels (alpha), vertices | Nothing big is visible by day |
| Lights | 3: sun (shadow), hemisphere, one point light (campfire, 0 by day) | 3 | 3 | pixels | Lambert and Standard materials add a light-loop cost per pixel |
| Textures | 55 textures, about 32 MB with mip maps (estimate), largest 512 x 576 | 53, about 28 MB | 53, about 28 MB | memory | All small: this is the part of the allowance least used. Anisotropy: iPad 4, desktop and radeon the GPU maximum (16) |
| Draw calls | 260 per frame, of which 162 are the shadow pass | 401 (196 shadow) | 405 (196 shadow) | draw calls | `renderer.info` counts the shadow pass too |
| Triangles | 132,148 per frame, of which 62,012 shadow pass (70,136 drawn in the main pass) | 270,502 (94,316 shadow) | 442,807 (119,584 shadow) | vertices | The "150k triangles" iPad rule is counted this way too: **about 47 percent of the iPad figure is the shadow pass** |
| Dynamic resolution | off (only the ultra tier has it) | on, range 1.0 to 1.25 | on, range 1.0 to 2.0, steps of 1/16 | pixels | See section 3 |

### Layer share in the software ladder (relative, noisy, not a device)
Each layer is switched off alone and the render time is compared with the plain frame (median of 3 pairs, K = 1 because software GL is far over 33 ms per render). Percent of the plain render time. Read only the big differences. A negative number is noise.

| Layer off | iPad | Desktop | Radeon |
|---|---|---|---|
| sea | 7 | 4 | 14 |
| terrain | 30 | 33 | 27 |
| trees, rocks, houses | 4 | 13 | 6 |
| sky and clouds | -1 | 5 | 10 |
| particles | 5 | -3 | -6 |
| shadows off entirely | 12 | 7 | 19 |
| post chain and render target | 10 | 36 | 42 |
| MSAA (iPad has none: the number is what 4 samples would add) | +32 | 24 | 19 |
| resolution fit: milliseconds that do not depend on pixels, then per million pixels | 105 + 723 per Mpix | 186 + 1,147 | 880 + 1,436 |

The straight line over the five resolution rungs fits (r2 0.99 or better on iPad and desktop), so in software almost everything scales with pixels. That is a property of drawing with a CPU. The new ladder measures the same split on the real device.

## 2. What we got wrong

1. **The benchmarks were locked to 60 Hz.** A page that runs at vsync reads 16.7 ms whether the GPU needs 3 ms or 16 ms. The sea bench rung "16.7 ms average" for 2M triangles, 96 waves, 400k spray and 100k debris only says "at least 60 fps". How much headroom is left is unknown. Fix: the cost ladder renders K times per frame and divides, so the lock cannot hide it.
2. **Safari on the iPad gives no GPU timer.** `EXT_disjoint_timer_query_webgl2` is missing, so "GPU ms" read 1.01 and 1.35 ms in the page reports and 0.00 in the sea report. Those were sampled `gl.finish()` calls, which Safari does not make wait, so they say nothing. The page printed them in a "GPU time" line and a verdict ("near the limit") built partly from them. Fix: the ladder times wall clock around `gl.finish()` plus a 1-pixel `readPixels` (a read always waits), and uses the timer only when it exists, and says which.
3. **The sea bench "everything up" rung was confounded.** It also used 2x render scale, which alone costs 24.1 ms, so 97.4 ms says nothing about the combined geometry limit. Fix: combined rungs at 1x and 1.5x, no scale change inside a combined rung.
4. **On the owner's iPad (Apple GPU, dpr 2, 834x1062) the sea held 60 fps with 2M triangles, 96 waves, 400k spray, 100k debris and the islands on. Only render scale 2x (24.1 ms) and 3x (48.2 ms) failed.** Fill rate (pixels) is the limit, not triangles. We had treated triangles as the scarce thing.
5. **The 150k triangle iPad rule was a guess.** The camp scene measured 153,747 triangles and 163 calls at 58.9 fps, which is a place that worked, not a limit. About half of that count is the shadow pass (see the table above). `tiers.js` now marks the rule `guess`.
6. **The sea_proto iPad tier allowed a pixel ratio of 2** (`prCap: 2`, never measured). The owner's iPad took 24.1 ms at that setting. `tiers.js` sets the iPad cap to 1.5 (what held) and sea_proto reads it with `&cost=1`.
7. **The Radeon VII was only about 18 percent busy on the Radeon sea**, and about 11 of 16.7 ms on the page. Dynamic resolution turns spare time into pixels (it settled at 1.56x), so a low "busy" figure is not waste by itself, but detail did not grow: "ultra adds sharpness, not new content" (24 Nov note).
8. **The bench panel prints "msaa 4" on the iPad preset, but the tier has no MSAA** (`QUAL.low.msaa` 0, and `makeRT` reads that). The third iPad report therefore listed a setting that was not on. The ladder reports the real samples (0 here) and its MSAA rung shows what turning 4 on would cost.
9. **Draw calls and triangles include the shadow pass.** We budgeted "160 calls and 150k triangles" as if they were the picture. On the Gift iPad view 162 of 260 calls and 62k of 132k triangles are shadows.
10. **The page's own `stats().calls` reads 1** outside the bench panel, because `renderer.info` resets on every render and the last render is the post quad. Any number read from it without `autoReset` off is wrong.
11. **Measurements on software GL are noisy** (we saw the plain frame read 725 ms and 1,317 ms in the same run). Relative sizes only, never ms.
12. **The iPad picture is soft by choice, not by need.** Canvas at 1.0 css on a dpr 2 screen draws about a quarter of the pixels the glass has (0.89 of 3.54 Mpix). The sea bench shows 1.5x held on that glass. We have not measured the whole page at 1.25x or 1.5x, and the new ladder is the way to do it.
13. **Dynamic resolution cannot see headroom without a timer** (inference from the code, not a measurement). It raises the scale only when the work time is under 70 percent of the frame. Where no timer exists the work time is a sampled finish that, on Safari, reads about 1 ms, so the controller would see "plenty of room", climb, then be pushed down by late frames, over and over. The iPad is on the low tier, which has no dynamic resolution, so this has not bitten yet; `device=radeon` on an iPad reached 0.625 and 28.6 fps, which is what that looks like.

## 3. What dynamic resolution in `ultra.js` does and how it reacts
`createDynRes` returns a render scale between `min` and `max` in steps (the page uses 1/16). It is fed frame times: the GPU timer value when the browser has one (every second frame), otherwise a `gl.finish()` timing every fourth frame, plus any real frame interval longer than 125 percent of the target (late frames).
- It waits for a full window of 40 samples after any change.
- **Lower** when the window average is over 95 percent of the budget or its 95th percentile over 150 percent, but not sooner than 1.2 s after the last change. It lowers by at least one step, more when far over (cost taken as proportional to scale squared).
- **Raise** one step only when the average is under 70 percent and the 95th percentile under 90 percent, and the cost predicted at the next scale is still under 85 percent, and not sooner than 3.5 s after the last change.
- The prediction sits below the lowering line, so a steady scene settles and stays.
- Range: desk profile 1.0 to the preset maximum; tv profile 0.5 to the 1800p target; handheld 0.6 to 1.0; any display over 4 Mpix may go down to 0.5. The ladder switches it off while it measures and puts it back.
- Only the ultra tier has it. The iPad preset (tier low) renders at one fixed scale.
- Its blind spot is in section 2, item 13.

## 4. Where the allowance is not being spent
**iPad** (owner-measured):
- Sea triangles: in use 23,040, held 2,000,000 (87x spare). Waves 8 in use, 96 held. Spray 600 in use, 400,000 held. Debris 400 in use, 100,000 held. These are one-axis results on a light base, so they are not all spendable together, but none of them is the limit.
- Pixels are the scarce thing, and they are the one thing we are spending the least of: the page draws 25 percent of the glass.
- Texture memory is tiny (about 32 MB of small textures).
- Unknown and worth one ladder run: how much of the 16.7 ms frame the whole Gift page uses at 1.0, and the fixed versus per-pixel split on this GPU.

**Desktop**: no report exists. The preset (1.25x, MSAA 4, shadow 2048, bloom off) is a guess. Nothing can be said about unspent allowance until one run of the ladder comes back. Note a "desktop" browser on an integrated chip steps down to the iPad preset (by design).

**Radeon VII** (24 Nov, owner-measured; every number in `tiers.js` stays `unmeasured` until a ladder report arrives):
- GPU timer 11.02 of 16.7 ms at 1360x680, 1.56x, MSAA 8, shadow 4096: about 5.7 ms a frame spare at that window. At full-screen 1080p the pixels roughly double and that spare time is gone, so the unspent part is mostly in the window case.
- Not spent at all: triangles (236k page, 211k sea; the MAX sea is 1M), texture memory (about 30 MB of textures on a card with 15.5 GB), the particle budget (12,000 spray, MAX 100,000), terrain detail (cell 0.40), and the sea_proto numbers (18 percent busy).
- Spent on sharpness only: supersampling, MSAA 8 and a 4096 shadow map are the whole of what ultra adds.

## 5. Picture fixes, ranked by value over cost
Value = how much it improves what the owner sees, 1 to 5. Cost = estimated extra frame time and work. Estimates are mine; the ladder replaces them with numbers.

| Rank | Fix | Debt it clears | Value | Cost | Why this order |
|---|---|---|---|---|---|
| 1 | Switch layers off one at a time with the ladder (and the existing toggles) to find which layer draws the **cream shape** | unexplained cream shape | 4 | no frame cost, under an hour | It is a visible fault with an unknown cause. The tool exists now |
| 2 | Move the film grain to the real pixel size and stop adding it where the canvas is stretched, or use interleaved-gradient noise instead of a `sin` hash | moire grain | 4 | none (a different formula in one existing pass) | Moire is the beat between per-pixel noise and the 2x browser stretch on the iPad. It is in every frame |
| 3 | Dither the sky gradient and the post output in the half-float target; break the streak term in the sky dome | sky streaks | 3 | none | Banding and streaks are low-bit gradients plus the rain curtain streak function. Same pass as rank 2 |
| 4 | Use the idle iPad budget: pixel ratio 1.0 to 1.25 after one ladder run, sea mesh 23k to about 90k triangles, 8 to 16 waves | soft picture, flat sea | 5 | pixels cost on this GPU (measure first); the sea mesh and waves are cheap (held 2M and 96) | The only change that makes the whole iPad picture sharper. Measure the page at 1.25 before shipping |
| 5 | Extend the sea past the table edge and blend it into haze, hide the rim at the horizon (the page already has a rim switch and a 3x scale test) | table-rim look at the horizon | 4 | one large cheap mesh, a little fog | Fixes the first thing seen in every wide view |
| 6 | Make storm foam streaks along the wind and fade by distance, not white points | snow-like storm foam | 3 | fragment only, small | Looks like snow because the specks are round and uniform |
| 7 | Turn terrain `castShadow` off or cull it by distance in the shadow pass | table: terrain is 19 percent of the iPad shadow triangles | 2 | saves about 12k triangles a frame, no look change if the hills still shade through the props | Cheap saving; pays for rank 4 |
| 8 | Depth-tinted shallows from the seabed field (`seabed=1`) so near-shore water is clear, then green, then deep | flat shallows | 4 | one extra texture read in the sea fragment shader | A true picture gain, but the sea fragment shader is already pixel-heavy |
| 9 | Cloud shading by height: flat bases, horizon bank, many small puffs at distance, one cloud layer drawn into the dome; drop the 32-puff shadow loop on clear days | floating blob clouds | 5 | the largest: new sky shader work; but dropping the loop saves | The most visible debt and the most work. Measure the sky and cloud rung first |

The first three cost nothing at run time and clear three of the seven debts. Do them before anything that spends pixels.

## 6. What this changes in the build
- `&cost=1` on `islands_look.html` (item 2): `cost_ladder.js`, a panel with a warning, Start, Stop and Copy report, K-per-frame timing without the vsync lock, GPU timer when present, estimated headroom at 60 fps. Works for `device=ipad`, `desktop` and `radeon`. Default page unchanged (hash 8d962c0c, 88,790 triangles; the render size multiplier is 1 unless the ladder sets it).
- `tiers.js` (item 3): one table of limits per device, with a status on every number. Read by the ladder report and by `sea_proto` (both only with `&cost=1`).
- What the ladder cannot do: it measures the render of the scene, not the game scripts, physics, garbage collection or the browser's compositing, so "headroom" is the headroom of the draw, not of the whole frame. Run it on the iPad (Safari, no timer: wall clock plus readPixels) and on the Radeon (timer present: both are shown).
- Asked of the owner: open `islands_look.html?game=gift&device=ipad&cost=1` on the iPad, press Start, then Copy report and paste it back. Same on the Radeon with `device=radeon`.
- Tests: `tests/cost-test.js` (formatter, doubling, pixel fit, rung list: 43 checks), `tests/tiers-test.js` (table complete, no contradiction with the measured results, Radeon all unmeasured: 38), `tests/cost-page-test.js` (Chromium on software GL: iPad 834x1062 touch, desktop and radeon 1280x720, each with and without `&cost=1`, the stop rules, and the default page hash 8d962c0c with 88,790 triangles: 44). Software GL proves the tool runs and puts everything back; the milliseconds it prints are not device numbers.
