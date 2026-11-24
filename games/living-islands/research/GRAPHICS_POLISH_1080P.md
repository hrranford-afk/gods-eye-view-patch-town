# Graphics polish: what makes the island diorama beautiful at 1080p and at 4K (research note, 24 Nov 2026)

Do not put real place names into game code, assets or recipes. Real product names appear below only as sources.
Confidence tags: High, Medium, Low. Cost figures for the Radeon VII are ESTIMATES from pixel counts and bandwidth, not measurements. We have only ever measured in software GL (SwiftShader), which says nothing about speed.

## 0. How this note was made, and what I could not check
- I read the page code (`islands_look.html`, 24 Nov), `SKY_FIX.md`, `EVOLUTION_TREE.md`, `weather.js`, `sky_clock.js`, `macro_sea.js` and the earlier notes in `research/` (clouds, beautiful weather, sea state, light and fog, animals, `MODES_AR_DESKTOP_HANDHELD.md`).
- `ULTRA_TIER.md` did not exist on the branch when I looked. So I do not repeat the ultra tier (supersampling with dynamic resolution, MSAA, bigger shadows, hero LODs, benchmark panel). Where I mention those, I only say what else the 4K case needs.
- **Web access in this session was thin.** Searches worked. Opening full pages was blocked for most hosts (developer.chrome.com, developer.nvidia.com, threejs.org, wikipedia, matthias-research.github.io all failed to resolve). So every web claim below rests on search result text, not on a full read. I mark that. Claims from my own background knowledge are Medium at best.
- Not verified anywhere: the actual cost of any item on the Radeon VII over Thunderbolt, on an iPad, or in this page. All need one measurement run on the real machine (the benchmark panel from the ultra tier is the right tool).

## 1. The finding that matters most: why 4K looks horrible
Read from `islands_look.html` (High confidence that the code does this; Medium that it is the whole story, because I cannot see Harry's screen).

**What the code does**
- `size()` (line 1972): `dpr = min(devicePixelRatio, QUAL[quality].pr)`; canvas width and height are `innerWidth*dpr` and `innerHeight*dpr`; then `renderer.setPixelRatio(1)`, `setSize(w,h,false)`, CSS 100% by 100%. `QUAL.high.pr = 1.5`, `QUAL.low.pr = 1.0`.
- So the canvas is never more than 1.5 device pixels per CSS pixel. The browser stretches it to fill the screen.
- The post shader (`buildPost`, line 1881) has a tilt-shift blur whose radius is `uBlur = 6` PIXELS with a fixed tap count. Vignette and grain use `gl_FragCoord`.
- Shadow map 2048 (high) or 1024 (low). MSAA 4 on a half-float render target. CSS UI is in fixed CSS pixels (14 px text, 44 px buttons).
- `autoQ()` drops to low if fps under 18 in the first 10 s. It never goes up.

**Likely causes, in order of how much I believe them**
1. **The canvas is upscaled by the browser (soft, blurry). Medium-High.** On a 4K TV, macOS very often runs the "looks like 1920x1080" scaled mode, so `devicePixelRatio = 2` and `innerWidth = 1920`. The page picks `dpr = min(2, 1.5) = 1.5`, so the canvas is 2880 by 1620 and the browser stretches it 1.33 times to 3840 by 2160 with a plain bilinear filter. Everything is slightly soft, edges shimmer, and nothing is sharp like the 1080p case. At 1080p on a 1080p screen, `dpr = 1`, the canvas maps 1 to 1, so it "looks great". That fits Harry's report exactly.
2. **Every effect sized in pixels changes meaning. High (it is in the code).** If the canvas is 3840 wide (macOS native mode, `dpr = 1`, so `innerWidth = 3840`), the 6 px tilt-shift blur is now half as strong compared with the picture. The "miniature" look weakens. Grain at 1/255 per pixel becomes too fine to see. Line widths of any drawn outline halve.
3. **The UI is tiny from the sofa. High (it is in the code).** With `innerWidth = 3840` the 44 px buttons are 2 percent of the screen height. On a TV 3 m away that is unreadable. If the mode is scaled (`dpr = 2`) the UI is fine.
4. **Texture and shadow detail tuned for 1080p. Medium.** At 1080p, 2048 shadow texels over a camera that sees about 200 to 300 m is soft but acceptable. At 4K each shadow texel covers twice as many screen pixels in each direction, so the stair-step edge is twice as visible. Canvas textures (palette, noise) made at 256 to 512 px show their pixels at 4K close views. Mip bias is the default, so nothing is wrong, but nothing adds detail either.
5. **Aliasing and shimmer scale with how far the TV is from the sofa, not with pixels. Medium.** A bigger, sharper picture shows more thin-detail crawl (rigging, grass, waves) because MSAA only fixes geometry edges, not shader aliasing (the sea glitter, fine noise).

**How Harry can tell which one in 30 seconds (needs his Mac, taste not required)**
Open the page on the TV, press the browser console key, type `devicePixelRatio, innerWidth, innerHeight`. If the numbers are `2, 1920, 1080` it is cause 1. If they are `1, 3840, 2160` it is causes 2 and 3. I recommend the page shows this in its info line (one line of code, `updateInfo()` already exists).

**The fix (all tiers of one policy)**
- Decide the render size by TARGET PIXELS, not by dpr: `physical = innerWidth*dpr` by `innerHeight*dpr`. Pick `renderScale` (0.5 to 1.0 of physical, or above 1.0 for supersampling at 1080p). Render at `physical*renderScale`, then do ONE final pass that upscales to physical with a sharpening filter (section 7). Never let the browser do the stretch.
- Scale every pixel-valued effect by `H/1080` where H is the internal render height: tilt-shift blur radius, grain size, vignette softness, outline widths, point sprite sizes. (The smoke already uses `uScale = h/(2 tan(fov/2))`, which is correct.)
- UI scale: use CSS `rem` with the root font size set from the shorter side of the screen in CSS pixels at a viewing-distance profile (desk 1.0, TV 1.5). See section 8.
- Shadows: pick the shadow map size so the texel is about one screen pixel at the focus distance (section 8 table).

## 2. What native 4K costs on the Radeon VII, honestly
Numbers from AMD's launch table (13.8 TFLOPS peak FP32, 1 TB/s HBM2, 16 GB, 64 ROPs, 3840 shaders) via the [Tom's Hardware launch article](https://www.tomshardware.com/uk/news/amd-radeon-vii-7nm-gpu-specs,38400.html) and [AnandTech's review](https://anandtech.com/show/13923/3). High confidence for the spec numbers.

**Estimate by pixel count (Medium).** Harry says the page uses about 10 percent of the card at 1080p and 60 fps. If it were all pixel-bound, 4K has 4.0 times the pixels, so about 40 percent at 60 fps. Parts that do not scale with pixels (terrain vertices, cloud and sea geometry, CPU draw calls) stay the same, so the true figure is likely 25 to 40 percent. **Native 4K at 60 fps is affordable on this card for the current page.** What eats the margin is anything we ADD: supersampling ON TOP of 4K (a 1.5x supersample at 4K is 5.8K, 2.25 times the pixels again), SSR, volumetric clouds at full resolution.

**Memory at 4K (arithmetic, High for the arithmetic).** 3840 x 2160 = 8.29 M pixels. Half-float RGBA colour = 8 bytes; 24-bit depth plus 8 stencil or float depth = 4 bytes. With 4x MSAA: 8.29 M x 12 B x 4 = 398 MB, plus a 66 MB resolve target. Plenty for 16 GB. Bandwidth for one full MSAA write plus resolve plus post read is about 0.8 GB per frame, so 48 GB/s at 60 fps, about 5 percent of 1 TB/s.

**The Thunderbolt catch (Medium-Low).** The finished frame must reach the TV. If the TV is plugged into the eGPU box's own HDMI or DisplayPort, the picture never crosses the cable. If the TV is plugged into the Mac, every frame is copied back over the Thunderbolt link. Reviews measure Thunderbolt 3 eGPU data at roughly 22 Gbps (about 2.7 GB/s) usable ([AnandTech eGFX article](https://at-web1.www.anandtech.com/show/13944/exploring-tb3-egfx-with-powercolor-gaming-station-rx-vega-56-nano/2), [CNX Software](https://www.cnx-software.com/2021/03/14/using-an-egpu-with-a-mini-pc-intel-nuc-7-8/)). One 4K frame at 4 bytes per pixel is 33 MB; at 60 fps that is 2.0 GB/s, most of the link. At 1080p it is 0.5 GB/s. So: **plug the TV into the Razer box, not the Mac.** This is Medium-Low confidence because I found forum and press claims, not a measured Radeon VII number. Apple's own page says an app uses the GPU of the primary display ([Apple support: external graphics processor](https://support.apple.com/en-qa/102363)), so the box's display should also be the primary display. Chrome's `powerPreference` is only a hint ([graphics-dev thread](https://groups.google.com/a/chromium.org/g/graphics-dev/c/OYnvvfhS8h4)). Check Activity Monitor, GPU History, to see which GPU is working.

**Better than native: render scale plus an upscaler (recommended default for 4K)**
| Internal size | Pixels vs 1080p | Pixels vs native 4K | Look |
|---|---|---|---|
| 1920 x 1080 | 1.0 | 0.25 | soft on a 4K TV, even with sharpening |
| 2560 x 1440 | 1.78 | 0.44 | good with a sharpening upscale; the usual sweet spot |
| 3200 x 1800 | 2.78 | 0.69 | very close to native; cheap enough |
| 3840 x 2160 | 4.0 | 1.0 | native, sharpest, 4x MSAA is the main cost |
Recommendation: default 4K to 1800p internal with MSAA 4x and a sharpening upscale to 2160p; offer native 4K as a menu choice because the card can afford it. High confidence that it is a good trade, Medium on the exact numbers until measured.

## 3. Ranked list: gain per cost
Ranking is my judgement (Medium). "Gain" is how much better the picture looks to a person on a TV or monitor. Costs: R = Radeon VII at 1080p (percent of frame time, estimate), iPad = a recent iPad in Safari (estimate, Low confidence; we have never run on one).

| # | Item | Visual gain | R cost | iPad cost | Where |
|---|---|---|---|---|---|
| 1 | Final-pass sharpening and correct render scale (section 7) | high at 4K, medium at 1080p | <0.3% | 2 to 4% | all |
| 2 | Sky-lit hemisphere ambient and ground bounce colour | high | ~0 | ~0 | all |
| 3 | Tone map plus colour grade plus white balance by time of day | high | <0.2% | <1% | all (partly done) |
| 4 | Aerial perspective (distance fog tinted by sky colour) and height fog | high | <0.2% | <1% | all |
| 5 | Water: sky reflection from the real sky, depth colour, shoreline foam | high | 1 to 2% | 3 to 6% | all |
| 6 | Shadow colour, soft penumbra, tighter cascade | medium-high | 1 to 3% | 5 to 10% | high and ultra |
| 7 | Wind motion in trees and grass, secondary motion | high (life) | <0.5% | 1 to 2% | all |
| 8 | Bloom, restrained | medium | 0.5 to 1% | 3 to 5% | high and ultra |
| 9 | Tilt-shift that scales with resolution, plus bokeh weight | medium-high | 1 to 2% | 4 to 8% | all |
| 10 | Baked AO and light bounce in the Blender bakes | high on buildings | 0 at run time | 0 | all (asset work) |
| 11 | Contact shadows (short screen-space) | medium | 1 to 2% | 5 to 8% | ultra |
| 12 | Screen-space reflections on calm water | medium | 2 to 4% | too dear | ultra only |
| 13 | Caustics on sand | medium | 0.3% | 1% | high and ultra |
| 14 | God rays | medium | 0.5 to 1% | 3% | high and ultra |
| 15 | Temporal anti-aliasing | medium-high | 0.5% plus risk | 3% plus risk | ultra only |
| 16 | Film grain, vignette, chromatic aberration, lens flare | low (taste) | <0.2% | <1% | all, mild |

## 4. Lighting and colour (items 2, 3, 10, 16)
**Sky-lit hemisphere ambient.** Use `THREE.HemisphereLight(skyColour, groundColour, intensity)`. Sky colour from the sky clock at the zenith, ground colour from the land and sea albedo (warm sand and green-brown). This is what makes shadows blue-cool in daytime and warm at dusk instead of grey. In r128 this is built in, one extra light, no cost. Gain high, risk very low. High confidence (standard technique, built-in three.js class).
**Shadow colour.** Shadows in daylight are lit by the blue sky, so they are cool and a little saturated, not black. Do it by raising the hemisphere light, not by a per-material hack. The sun key stays warm, the fill is cool. This is the classic warm-light cool-shadow scheme every stylised game uses. High.
**Tone mapping.** The page already runs ACES in `postMat` (and `ACESFilmicToneMapping` when `NOPOST`). Keep. Two improvements: (a) set exposure from the sky clock so dusk is not mid-grey; (b) gentle saturation lift (the page does 1.16) and a contrast curve instead of a plain pow. Medium: ACES is slightly harsh on saturated blues; Khronos' PBR Neutral tone mapper keeps colour more faithful. Source: [Khronos PBR Neutral announcement](https://github.com/KhronosGroup/ToneMapping) (not opened in this session; Medium). It is a 10-line function, easy to drop into the post shader and compare.
**White balance by time of day.** Scale the final colour by a temperature ramp: golden hour warmer (multiply by about 1.05, 1.0, 0.9), blue hour cooler, overcast neutral. The page already has one fixed mix of cool shadows and warm highlights; make it follow `SkyClock`. Cost zero. High gain on mood.
**Baked AO and bounce.** Blender bakes can store ambient occlusion in a separate texture (or vertex colour) and the page multiplies it into the ambient term only, not the sun term. That gives the "contact darkening" in crevices that makes models look grounded. Cost at run time is zero, work is in `blender/` (not my area; flagged for CAIRN). High.
**Restraint list.** Film grain: very low, a little helps hide banding in the sky. Vignette: 0.14 is already right for land. Chromatic aberration: 0.3 px at the screen edge at most, or leave it out. Lens flare: only on the sun disc and only when the sun is on screen. All taste, all cheap. Tag: Medium.

## 5. Depth cues (items 4, 14)
**Aerial perspective.** Far things get lighter, bluer and lower in contrast. In the page, distant islands and sea should blend into the horizon colour the sky shader produces. Implement as exponential distance fog whose colour is sampled from the sky dome at the view direction (not a flat colour). In r128: `scene.fog` uses a single colour; use a custom injection into the material (the page already uses `onBeforeCompile` for the sky, line 2141). Cost near zero. This is the single biggest "depth" gain in a diorama. High. The earlier fix in `SKY_FIX.md` (sea reaches the horizon; horizon blend) is the right precondition.
**Height fog.** Density falls with height (`exp(-h/H)`), thick over the sea at dawn. Same hook, one more term. Medium-high gain on moods (morning mist). Source for the maths: Inigo Quilez, ["Better fog"](https://iquilezles.org/articles/fog/) (not opened this session; Medium).
**Distance desaturation.** Part of aerial perspective: mix toward the luminance of the fog colour. Done in the same line.
**Atmospheric scattering look.** Do not run a full scattering model per pixel. Precompute a sky colour table from `SkyClock` (sun elevation) and use it for fog and ambient. Reference for the real thing: Hillaire, ["A Scalable and Production Ready Sky and Atmosphere Rendering Technique"](https://sebh.github.io/publications/egsr2020.pdf) (EGSR 2020; found in search results, not opened; Medium). The lookup-table version costs under 0.1 ms.
**God rays.** Radial blur of a thresholded sky and sun mask toward the sun's screen position, 24 to 32 taps, at quarter resolution, added before tone mapping. Visible only when the sun is low or behind cloud. Cost at 1080p: about 0.5 to 1 percent on the Radeon, 3 percent on an iPad. Gain: strong on golden hour. Tie its strength to cloud cover from `weather.js`. Medium.

## 6. Water (items 5, 12, 13)
The sea shader is already custom (`SEA_PASS.md`), with glitter and wind chop. Order of value:
1. **Reflection from the real sky.** Sample the same sky colour function used for the dome in the water's fragment shader, using the reflected view vector and a Fresnel term (`pow(1 - dot(n, v), 5)`). It is what makes water look like it belongs under THIS sky. Already half-done by the sky fix; ensure the reflected sample uses the live sky clock, including cloud brightness. Cost near zero. High.
2. **Depth colour and refraction.** Shallow water is light turquoise over sand, deep water dark blue-green. The page has a seabed texture (`seabed.js`, `sbTex`), so use the real water depth under each pixel to blend colour; absorption is `exp(-k * depth)` per channel, red dies first. High gain on the coast, cost near zero. Refraction offset of the seabed lookup by the wave normal costs one more texture read. Medium.
3. **Foam from depth and steepness.** Foam where depth is under about 0.3 m (shore line), where wave steepness (Jacobian of the wave displacement) is high (crests), and trailing behind boats. Use a foam texture scrolled twice at different speeds. High. Flow and wake data exist already (`WAKE`, `FL`).
4. **Subsurface glints.** On back-lit waves the thin crest glows green. Add `pow(max(dot(viewDir, -sunDir),0), 4) * crestHeight * tint`. Cheap, a very noticeable "alive" cue at golden hour. Medium.
5. **Caustics on sand.** In shallow water (depth under 3 m) multiply the seabed by a moving caustic pattern (two scrolled voronoi-like textures, min of them). Cost one or two texture reads. Medium gain, low risk.
6. **Shoreline wetness.** A band above the waterline that tracks the tide (the page has `tide`): darker, slightly glossier sand for the last 0.3 m of height, fading with `exp`. Cheap, good realism. High.
7. **Screen-space reflections (SSR).** Raymarch the depth buffer along the reflected ray for ships, cliffs and the lighthouse standing in calm water. Cost 2 to 4 percent on the Radeon at 1080p with half-resolution rays, too much for an iPad. In r128 you have to write it yourself (the `SSRPass` example exists but is heavy and tuned for desktop). Gain: medium, and only in calm weather. Put in ultra only. Medium. A cheaper fake is a planar mirror of the few tall objects, rendered at quarter resolution.

## 7. Anti-aliasing, resolution and sharpening at 1080p and 4K
| Method | What it fixes | Blur | Cost | Fit for this page |
|---|---|---|---|---|
| MSAA 4x (in use) | geometry edges | none | memory and bandwidth, rises with pixels | keep as the base; WebGL2 only |
| FXAA | edges and some shader aliasing | noticeable, softens text and thin lines | ~0.2 ms | acceptable on low tier only |
| SMAA | edges, better shapes than FXAA | small | ~0.4 ms, three passes | good add-on to MSAA on thin lines |
| TAA | everything, including shader shimmer, and gives free supersampling over time | ghosting and softness if done badly | ~0.3 ms, but needs motion vectors or a static camera, jitter, history buffer | strong visual win in a calm diorama (the camera moves slowly), but risky with moving water and boats |
| Supersampling 1.5x to 2x | everything | none (needs a good downsample) | 2.25x to 4x the pixel cost | the ultra tier's job; not duplicated here |
Sources: Karis, ["High Quality Temporal Supersampling"](https://advances.realtimerendering.com/s2014/index.html) (SIGGRAPH 2014; found in search, not opened; Medium), Jimenez et al., SMAA (2012, cited in an NVIDIA paper in search results, Medium), AMD, ["FidelityFX Super Resolution 1"](https://gpuopen.com/fidelityfx-superresolution/) (read from search text: EASU upscaler plus RCAS sharpening, spatial, "needs input with good anti-aliasing"; High for that statement).
**My ranking for this page.** (1) MSAA 4x remains. (2) At 1080p, a mild sharpen after the tone-map. (3) TAA only as an ultra-tier option and only with a "history reset when the camera or water changes fast" rule. TAA over the animated sea will ghost unless the sea is excluded or the history weight lowered; I rate that risk Medium.
**The right sharpening to avoid blur.** Contrast Adaptive Sharpening, or the RCAS idea: for each pixel take the min and max of the 4 neighbours, set a sharpening weight from how much headroom there is before clipping, apply `(centre*(1+4w) - sum(neighbours)*w)/(1+...)`. It does not halo, it does not amplify noise in flat areas. Amount 0.2 to 0.35 for a render scale of 1.0, up to 0.5 when upscaling. AMD's CAS is MIT licensed in FidelityFX, so we can port the idea with credit (licence not opened by me this session: check before copying; I would write our own 15-line version from the description). Medium.
**Upscaling choices for the 4K case**
1. Bilinear by the browser (what happens now). Soft. No.
2. Our own final pass: a Catmull-Rom (bicubic) filter, 9 taps with bilinear tricks, then CAS. Cheap, sharp, no temporal risk. Recommended.
3. FSR 1 style (EASU edge-adaptive plus RCAS). Better edges than bicubic at 1.5x to 2x, about 0.5 ms at 4K. Needs a GLSL port; the original is MIT in FidelityFX-FSR (verify). Medium. Next step if bicubic plus CAS is not enough.
4. Temporal upscaling (FSR 2 / TAAU style). Best quality, needs motion vectors, jitter and history. Not for this page now. Low priority.

## 8. Resolution-aware settings for each target
Viewing distance: desk monitor about 0.6 m, TV on a sofa about 2.5 to 3 m. The picture is bigger but farther, so text and buttons need to be about 1.5 to 2 times larger in angle.

| Setting | Desk 1080p | Lounge 4K TV | iPad |
|---|---|---|---|
| Internal render | 1920 x 1080 x 1.0 (or 1.5x supersample in ultra) | 3200 x 1800 default, native 3840 x 2160 as choice | 0.75 to 1.0 of 2x pixel ratio, capped at about 2.2 M pixels |
| Present | direct | bicubic plus CAS up to 2160p | direct |
| MSAA | 4x | 4x | off, FXAA or SMAA instead (tile memory) |
| UI scale (rem root) | 100% | 150 to 175% of the 1080p CSS size, minimum body text 16 px at CSS 1920 | 100%, tap targets 44 px |
| Shadow map | 2048 | 4096, tighter fit (section 9) | 1024 |
| Texture sizes | as now | one level up for hero close-ups only; mip bias 0 | halve the biggest |
| Texture mip bias at 4K | n/a | -0.5 on terrain and rock when rendering below native and upscaling, to keep detail | 0 |
| Anisotropy | 4 | 8 (16 on the Radeon is fine) | 2 to 4 |
| Tilt-shift blur radius | 6 px at 1080 | 6 x (H/1080) px | scale the same way |
| Grain | 1/255 at pixel | scale grain size to 2 px | off |
Why the numbers: the UI scale for a TV follows the common 10-foot rule (text subtends about the same angle as on a desk); I did not find a single authoritative source this session, so Medium. Mip bias -0.5 is the standard companion to upscalers (FSR documentation recommends a negative bias when rendering below native; read from search text only; Medium).

## 9. Shadows
- **Soft penumbra.** The page uses `PCFSoftShadowMap`. Good for low. For ultra, PCSS-style variable softness (contact hardening: sharp near the caster, soft far away) costs a blocker search per pixel. Gain medium at golden hour when shadows are long. r128 has no built-in PCSS; the three.js example `webgl_shadowmap_pcss` shows how to patch `shadowmap_pars_fragment`. Medium-Low confidence on cost; test on the Radeon.
- **Cascades.** One sun, a camera that can zoom from the whole island to a boat. A fixed 2048 map over 520 m far plane (`sun.shadow.camera.far=520`) is the problem when close: texels are 25 cm. Fit the shadow camera to the visible ground footprint each frame (a "fit to frustum" step), or use 2 cascades (near 0 to 60 m with 2048, far with 2048). r128 has no built-in cascades; the `CSM` addon exists in examples (`three/examples/js/csm/CSM.js`, MIT as part of three.js). Medium.
- **Contact shadows.** A short screen-space depth march (8 to 16 taps, 0.3 m) toward the sun, multiplied into the lit term. Fixes "floating" at the base of buildings, rocks, people. Cost 1 to 2 percent on the Radeon. Gain: medium-high on close-ups. Ultra only.
- **Shadow colour.** Section 4.
- **Shadow size for 4K.** Texel size on the ground should be near one screen pixel at the focus point: ground footprint of the view / shadow size. At 4K the footprint in pixels doubles, so 4096 is the right match to 2048 at 1080p. 4096 x 4096 x 4 bytes = 67 MB. Cost on the Radeon: shadow pass about 2x time; estimate under 1 ms. High for the arithmetic.

## 10. Materials
- **PBR from the Blender bakes.** Use `MeshStandardMaterial` with `roughness` and `metalness` from baked maps, `normalMap` from baked normals. Check `li_kit.js` and the GLB loader for whether it already uses `MeshStandardMaterial`; I did not trace every material path (flag: not verified). Cost: standard material is about 1.5 to 2 times the fragment cost of Lambert. On the Radeon at 1080p: fine. On iPad: use Lambert or a baked-lit variant for far LODs. High.
- **Normal-map detail.** A tiling detail normal (rock grain, bark, thatch) blended in at close range gives crisp surface at 4K without bigger base textures. 1 texture read. Medium-high.
- **Micro-variation.** Per-instance hue and value jitter (a few percent), and a world-space noise multiplied into albedo at very low frequency (breaks repetition). Cheap, high gain on forests and rock fields. High.
- **Wet sand and moss.** Wetness from tide height and `wetM` (the world export has a `wetness` array, `landform/worlds/*/manifest.json`) darkens albedo and lowers roughness. Moss: green tint on upward-facing normals in damp, shaded places (`normal.y > 0.7` and low sun exposure from the `exposure` array). Both are data the world already carries. High, cheap.

## 11. Post (items 8, 9, 16)
- **Bloom.** Threshold high, soft knee, several blurred mips added at low strength (0.05 to 0.15), so only the sun, sea glitter, lamps and windows glow. Needs a mip-chain downsample: 5 passes at falling resolution, about 0.5 ms at 1080p on the Radeon. Gain medium; essential for the lighthouse and night windows. Use the half-float target the page already creates. Medium-high.
- **Tilt-shift done well.** The page's blur is a disc kernel with 22 or 9 taps weighted by brightness (a good start). Improvements: (a) scale radius by `H/1080`; (b) make the in-focus band follow the camera pitch and distance so the focus plane sits on the island; (c) blur by DEPTH (circle of confusion from the real depth, not just screen y) so a tall tower inside the in-focus band stays sharp; (d) fade the blur at the horizon so the sea does not turn to mud. Gain high for the signature look. Cost as now. Medium.
- **Vignette, grain, chromatic aberration, lens flare.** Restraint rule: if you can notice it at first glance, turn it down. Medium.

## 12. Motion
- **Wind in trees and grass.** Vertex shader displacement: `sin(time*speed + dot(worldPos.xz, windDir)*freq)` weighted by height squared (roots fixed), plus a slower gust field from `weather.js` wind. Cost: tiny vertex work. Gain: the world feels alive. High. A second noise at 3x frequency gives secondary motion (leaf flutter). In r128 this is `onBeforeCompile` on `MeshStandardMaterial`, or a custom shader.
- **Secondary motion.** Ropes and flags with a spring-damped angle; smoke trails from chimneys already exist (`smoke`). Medium.
- **Wave-driven boat motion.** Already built (`boat_motion.js`, `MC_HEAVE`, `MC_ANG`). Check that the boat samples the SAME wave field as the rendered sea so the hull and the water agree. Done by sampling the macro sea function, as the code comments say. High that it exists; Medium that the sea shader and the CPU function agree exactly (not tested by me).

## 13. Particles
Spray at the bow and where waves hit rocks, rain streaks, falling leaves, dust and smoke, fireflies at dusk, seabirds. In r128: `THREE.Points` with a custom shader and size attenuation, or instanced quads. Keep alpha test over blending where possible (blending needs sorting). Up to 20 to 50 thousand points is trivial for the Radeon; keep to a few thousand on iPad. A GPU-simulated version is in `GPU_WORLD_SIMULATION.md`. Medium.

## 14. Art direction: what makes diorama and tabletop games read well
This part is from knowledge of released games and talks, not from a fetched source. Confidence Medium. I list games as public references, not as things to copy.
- **A strong value structure.** Squint at the picture: three or four clear tone groups (sky, sea, land, buildings), with the focal point (village, lighthouse, boat) at the highest contrast. Everything else is calmer.
- **Warm against cool.** Warm lit land, cool sea and shadow. Small warm accents (windows, fire, red sails) against a cool field are seen from far away.
- **Silhouette first.** Every building, tree and animal must be recognisable as a black shape at 5 percent of the screen. Exaggerate: chimneys a little big, roofs steep, towers tall. Our Blender kit pieces (`KIT_PIECES.md`, `STAR_FORT_KIT.md`) already follow a modular system; check silhouettes by rendering them flat black.
- **Limited palette with variation inside it.** Games in this genre (Islanders, Townscaper, Dorfromantik, Tiny Glade, Dave the Diver's surface art, Monument Valley) use 5 to 8 hues, each with value steps, and let light do the rest. Tiny Glade is the best reference for "diorama feel with real lighting" at game scale. I could not open its talks in this session; Low-Medium.
- **Tilt-shift as a scale cue.** A little blur at the top and bottom, strong colour saturation, and slightly high contrast make a scene read as a model. Keep the blur subtle at the focus band.
- **Detail density where the eye lands.** Fine detail (grass blades, bricks, rope) near the focus, simple shapes far away. LODs and fog do this for us.
- **Rule of three for the sea.** Dark deep blue, light shallow turquoise, white foam. Everything else is a gradient between them. Cool Atlantic: grey-green rather than tropical cyan.
- **Colour of light changes the whole mood.** Dawn pink-gold, noon neutral, golden hour amber, dusk violet, night blue with warm windows. The sky clock already drives this; make every material respond through the hemisphere light and fog, not through hand-tuned materials.

## 15. APPLY LIST (at most 12), for CAIRN to queue
Which target it matters most for: D = 1080p desk, T = 4K TV, both = both. Cost is an estimate on the Radeon VII (Medium-Low). Risk is risk of breaking or hurting the page.

| # | Change | Expected gain | Cost | Risk | Tier | Matters most |
|---|---|---|---|---|---|---|
| 1 | Add `devicePixelRatio, innerWidth, canvas size, render scale` to the info line (diagnosis) | lets us confirm cause 1 vs 2 | 0 | none | all | T |
| 2 | Render-size policy by physical pixels plus a final bicubic-plus-CAS present pass (no more browser stretch) | fixes the main 4K softness; adds crispness at 1080p | <0.5% | low: one extra pass, must handle resize | high, ultra | T first, D too |
| 3 | Scale pixel-valued post (tilt-shift radius, grain, vignette softness) by `H/1080` | restores the miniature look at any size | 0 | very low | all | T |
| 4 | UI scale by viewing profile (desk, TV, handheld) with a menu switch | readable from the sofa | 0 | low (layout) | all | T |
| 5 | Aerial perspective and height fog using the live sky colour; desaturate with distance | big depth gain | <0.2% | low | all | both |
| 6 | Hemisphere ambient from the sky clock; cool shadows; white balance by time of day | big mood and realism gain | ~0 | low | all | both |
| 7 | Water: sky-fresnel reflection, depth colour, shore foam from depth and steepness, glints | big gain on every shot | 1 to 2% | low-medium (shader work on the live sea) | all (glints, caustics in high+) | both |
| 8 | Wetness band from tide on sand, wet-sand darkening and moss from the world arrays | grounded coast | ~0 | low | all | both |
| 9 | Wind sway with height weight and a gust field from `weather.js` | the world feels alive | <0.5% | low | all | both |
| 10 | Shadow camera fit to view (and 4096 map on the 4K profile); shadow colour fix | sharper shadows, cleaner close-ups | <1 ms | low | high, ultra | T first |
| 11 | Restrained bloom (mip chain) plus god rays tied to cloud cover | golden hour and night windows | 1 to 2% | medium (tuning) | high, ultra | both |
| 12 | Depth-aware tilt-shift (circle of confusion from depth, focus follows camera, horizon fade) | cleaner, more convincing miniature | ~+0.3% | medium (needs the depth texture in the RT) | high, ultra | D first |
Not on the list on purpose: TAA, SSR, PCSS (ultra tier decides after the benchmark panel exists); full volumetric clouds (see `CLOUD_PHYSICS_FOR_VISUALS.md`).
Order I suggest: 1, 3, 2, 6, 5, 7, 9, 8, 4, 10, 11, 12.

## 16. Open questions for Harry (taste only)
1. Should 4K default to the faster, softer-edge 1800p internal with a sharpen, or to native 2160p? (Both will be in the menu; this is only the default.)
2. For the TV from the sofa, is bigger text better, or do you want the UI as small as at the desk?
3. At golden hour, how strong do you want the glow and god rays: gentle painting, or dramatic?
