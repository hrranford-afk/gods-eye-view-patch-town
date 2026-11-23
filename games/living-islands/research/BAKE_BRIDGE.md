Do not put real place names into game code, assets or recipes.

# Bake bridge: bringing the Blender (Cycles) look into the live page (research note, 23 Nov 2026)

Goal: close as much of the gap between the offline Blender renders and the live three.js page (r128 global script, no build step, iPad Safari, AR, desktop) without breaking the tiers of `MODES_AR_DESKTOP_HANDHELD.md`. Gate note for the "bake" part of the Quality tiers row of `RESEARCH_FIRST.md`.
Tags: VERIFIED (read in a source or in our own files today, or measured), PLAUSIBLE (standard engineering knowledge, not re-read), UNVERIFIED (heard, not checked), TUNING (starting number to measure). Nothing here was run on an iPad or on a real GPU. Nothing was rendered in this job: it is a read-only research job.
Web access this job: raw.githubusercontent.com and github.com tree pages worked (three.js r128 source, glTF-Blender-IO docs); web search worked. NOT reachable: cdn.jsdelivr.net, docs.blender.org (Blender manual: the bake and colour-management pages were not read). So Blender-side details below come from our own scripts, the glTF exporter docs on GitHub and forum extracts.

## 0. Short answer
1. The gap is mostly light, not geometry: Cycles gives bounced sky light, soft sun shadow, contact AO and a filmic curve; the live page gives one hemisphere light, one sun with a shadow map and a tone curve.
2. Everything that is static (AO, sky bounce, colour bleed, soft sun shadow on land) can be baked into one 2048 texture per island (VERIFIED: we already do it, `blender/baked_land.html`).
3. The sun moves and the weather changes, so a baked sun must not be the only light. Honest split (section 8): bake AO + sky bounce (sun-independent) and a 3-sun shadow mask; keep the sun, the sea, clouds, movers and tide wetness live.
4. The tone curve and the grade are the cheapest big win and need no bake: replace r128's ACES chunk with a curve fitted to Blender's Filmic (section 4).
5. KTX2 is not available as a global script in r128; ship JPEG/PNG at power-of-two sizes first (section 2.7).

## 1. Why the gap exists
Local facts (VERIFIED, own files): the hero render is 256 samples + OpenImageDenoise, 10 bounces, Filmic "Medium High Contrast" (`LI_LOOK=bright`), about 4 to 10 minutes per frame on 4 CPU cores (`LANDFORM.md`); the live page draws about 89k triangles with one HemisphereLight, one DirectionalLight and a PCF shadow map, ACES at exposure 0.9 to 0.95 (`islands_look.html`, `RENDER_OPTIONS.md`). The bake `bake_land.py` took 411 s at 48 samples for a 2048 texture.

| Ingredient the owner sees in Blender | Why the live page lacks it | Can it be baked? | Live approximation | Must stay live |
|---|---|---|---|---|
| Global illumination (sky light bouncing off sand and rock) | one flat hemisphere term, no occluders | YES (indirect pass, sun off = sun-independent) | SH9 or baked env map for the sky colour | the sky colour and strength (clock, weather) |
| Soft sun shadows (large soft penumbra) | one 2048 shadow map, PCF, hard-ish, bias artefacts | YES for land on land, for ONE sun or a few | PCFSoft or VSM, `shadow.radius`, tight shadow box | shadows of movers (people, boats, birds) |
| Ambient occlusion (creases, tree bases, boulder contact) | no AO at all | YES, best value per byte | cheap SSAO (desktop only), blob contact shadows | none |
| Bounce / colour bleed (warm sand lighting a cool rock) | none | YES (RGB indirect, colour kept) | none that is cheap | none |
| Physically based materials, layered sea | simple Lambert/Standard, hand shader sea | partly (albedo and normal textures) | roughness, normal map, env reflection | sea, wet rock level |
| High-poly detail (cliff faces, 360k-vertex land, 270k veg triangles instanced) | 150k triangle budget | normal map plus AO fake it; land grid 129 (baked_land) | LODs, impostors (section 3) | none |
| High-sample antialiasing, denoise | MSAA or none; shimmer on grass/foliage | n/a | MSAA at DPR cap, mip + anisotropy, no alpha-test sparkle | none |
| Filmic tone mapping | r128 ACES (different shoulder and hue handling) | n/a (display step) | fitted curve (section 4) | exposure follows the clock |
| Colour grade, "bright" look | none | n/a | one 3x3 plus curve, or a small 3D LUT in post | none |
| Depth of field | tilt-shift post pass | n/a | tilt-shift desktop and handheld only; OFF in AR | none |

Where the gap is worth most, in my order (PLAUSIBLE, to be judged by the pilot): 1 tone curve and exposure, 2 AO, 3 sky bounce on shaded sides, 4 soft shadow edge, 5 fine detail, 6 DOF. A baked-only screenshot (`shots/blender-baked-live.png`) exists; it already shows how much of the look is "light in the texture".

## 2. The baking pipeline, Blender to page
### 2.1 What to bake (one island = one UV atlas)
| Map | Blender source | Content | Use in page | Bytes (2048) |
|---|---|---|---|---|
| Albedo (flat colour) | Bake DIFFUSE with only Color pass, or the vertex-colour/material colour | land colour without light | `map` | JPEG about 0.8 to 1.5 MB (UNVERIFIED) |
| Sky GI + AO (sun off) | Bake DIFFUSE Direct+Indirect, no Color, sun lamp muted, sky on | RGB irradiance, scene-linear | `lightMap` (RGB) or fold the grey into `aoMap` | JPEG about 0.5 to 1 MB |
| Sun shadow mask(s) | Bake SHADOW (or direct pass with white albedo, sun on, no sky) per sun position | 1 channel each, 3 suns in R, G, B | custom shader term (section 8) | one more 2048 JPEG |
| Normal map | bake from high-poly to low-poly (selected-to-active with cage), tangent space | fine rock and sand detail | `normalMap` | PNG or JPEG q90 |
| Combined beauty | Bake DIFFUSE Direct+Indirect+Color | what `baked_land.html` uses now (unlit) | `MeshBasicMaterial.map` | the 7.4 MB PNG we have |
VERIFIED local: `bake_land.py` uses `bpy.ops.object.bake(type='DIFFUSE')` with Direct, Indirect, Color all on, margin 8, margin type EXTEND, a 2048 float image, then tone-maps by hand (`1-exp(-rgb*0.88)`, +0.03) and writes an sRGB 8-bit PNG. That is a DISPLAY-referred bake: the light is frozen, it cannot respond to the clock. It is the right choice for the cheapest tiers, the wrong one for T0 to T2.

### 2.2 Light units that make r128 match Blender (VERIFIED by reading r128 `lights_fragment_maps`)
r128 samples `lightMap` with `vUv2`, converts the texel to linear, multiplies by `lightMapIntensity`, and (when `physicallyCorrectLights` is false, our default) multiplies by PI ("not meant to be there, kept to avoid breaking output"), then adds to `irradiance`. The Lambert BRDF divides by PI. Net result: reflected light = albedo x texel. So a Cycles diffuse bake with white albedo (Direct+Indirect, NO Color) can go into `lightMap` unchanged, and the page multiplies by `map` (albedo). If the page ever sets `physicallyCorrectLights = true`, multiply the texel by PI at bake time. (PLAUSIBLE derivation; the pilot checks it by a white-card test: a white plane in sun must read the same in Blender and the page.)
`aoMap` (VERIFIED: GLTFLoader r128 maps `occlusionTexture` to `aoMap`, and copies `uv` to `uv2` if the mesh has no `uv2`): scales indirect light only (PLAUSIBLE; the lights_fragment_end chunk was not readable), so direct sun is not darkened by it. That is what we want for "AO + live sun".

### 2.3 UV rules
- Lightmap UVs must be a second set, no overlaps, no mirroring, every face with a texel area proportional to its world area (Blender "Smart UV Project" is not enough for terrain: use a planar top-down projection for the land heightfield, since it is a 2.5D surface; PLAUSIBLE, it is what `bake_land.py` does with a 129 grid).
- Padding: bake margin 8 px at 2048 with type EXTEND; add the same padding at every mip level you can see: at 2048 the 5th mip has 1 px texels per 32 px, so seams between UV islands show in the distance with bleed. Keep 16 px at 2048, 8 px at 1024 between islands (TUNING). Planar land needs none (one island).
- Texel density target for land: 56 m island window / 2048 = 2.7 cm per texel (VERIFIED arithmetic for the existing bake); a 200 m island window gives 10 cm per texel, enough for AO, too soft for tree shadows (TUNING: use 4096 for T0 or add a second 1024 detail tile at the camp).
- r128 loads the second set as `uv2`: GLTFLoader maps `TEXCOORD_1` to `uv2` (VERIFIED). Whether Blender writes a second UV map as TEXCOORD_1 is not stated on the exporter doc page I read (UNVERIFIED): check by printing `geometry.attributes` after load.
- Textures from glTF load with `flipY = false`; textures you load yourself with `TextureLoader` use `flipY = true`. Set `flipY = false` on a hand-loaded lightmap that shares the glTF UVs (PLAUSIBLE, forum-reported).

### 2.4 Vertex-colour baking for the cheap tiers
Blender can bake to vertex colours (Bake target "Vertex Colors" in 3.6 and later; PLAUSIBLE). The exporter writes them as COLOR_0 (mode "Active" or "Material" in the exporter, VERIFIED on the GitHub doc). One island has about 33k land vertices at grid 129 (VERIFIED in `bake_info.json`: 32768 land triangles), which is 4 bytes x 17k = about 70 KB. Resolution is the vertex grid (0.43 m at 56 m / 129), so it holds AO and broad shade but no shadow edges. Use for T4 (AR) distant islands and T5, and as the "first paint" of every island (section 5).

### 2.5 Baked environment (sky) for image-based light
- Render an equirectangular panorama from the Blender sky: a camera at the island centre, type Panorama / Equirectangular, 1024 x 512, sun disc off (we already set `sun_disc = False`), sun glow kept low so the live sun is not doubled. Save as Radiance HDR (RGBE) or 8-bit PNG.
- r128 facts (VERIFIED, source read): `PMREMGenerator` has `fromScene`, `fromEquirectangular`, `fromCubemap`; faces are 256 px (SIZE_MAX 256, LOD_MAX 8), output a 768 x 768 CubeUV target; it accepts 8-bit linear/sRGB input as LDR and RGBE as HDR; input of 1024 x 512 is the documented best fit. `RGBELoader.js` and `EXRLoader.js` exist as global scripts in `examples/js/loaders` (VERIFIED, listing).
- Cube vs equirect: equirect is smaller and easier to render in Blender; PMREM makes the cube for you at load (cost not measured). Ship equirect 1024 x 512 (RGBE about 0.4 to 0.6 MB; UNVERIFIED size).
- Cheaper again, and the one that fits AR: SH9. 27 floats per sky state (about 0.2 KB). The page already has the SH9 sky (`RENDER_OPTIONS.md` mode 4). Compute SH9 offline from the Blender panorama at 5 to 8 sun elevations plus overcast plus night, store in one JSON, interpolate by the sky clock. In AR, replace with the device's light estimate (same nine vec3).
- Use: `scene.environment = pmrem.fromEquirectangular(tex).texture` (r128: `scene.environment` applies to MeshStandardMaterial; PLAUSIBLE) on T0 and T1 for wet rock and glossy things only. Diffuse sky light on land comes from SH9 + baked AO.

### 2.6 glTF/GLB export from Blender and what r128's GLTFLoader accepts
Exporter (VERIFIED, glTF-Blender-IO docs on GitHub, current main): extensions KHR_materials_clearcoat/transmission/unlit/emissive_strength/volume/sheen/specular/anisotropy/dispersion/ior/variants, KHR_texture_transform, EXT_texture_webp, KHR_texture_basisu, KHR_lights_punctual, EXT_mesh_gpu_instancing, KHR_draco_mesh_compression, EXT_meshopt_compression. Occlusion needs a custom node group named "glTF Material Output" with an input "Occlusion" holding an Image Texture (R channel; same image can hold roughness in G and metal in B). The exporter has no lightmap slot. I read the docs from `main`; which of these are in Blender 3.6 versus 5.x is UNVERIFIED (3.6 has fewer: assume only clearcoat, transmission, unlit, texture_transform, draco; PLAUSIBLE).

| Extension | r128 GLTFLoader (`examples/js`, source read) | What to do |
|---|---|---|
| KHR_materials_clearcoat, transmission, unlit | supported | fine; transmission is costly, avoid on handheld |
| KHR_materials_sheen, specular, ior, volume, emissive_strength | NOT supported (VERIFIED: not in the EXTENSIONS list) | turn them off in the exporter; no Principled Specular tint, no IOR change; set emissive brightness in JS (emissive_strength above 1 would be lost: lamps and fire would go dim) |
| KHR_texture_transform | supported | OK for tiled rock detail |
| KHR_mesh_quantization | name only, no special code (VERIFIED) | accessors are normalised ints; works if the node transform dequantises (PLAUSIBLE); test once |
| KHR_draco_mesh_compression | supported via `DRACOLoader` (global script exists); decoder path must be set, wasm and wrapper fetched from there (VERIFIED) | `examples/js/libs/draco` folder exists in r128 (VERIFIED, listing); files must be served beside the page (no CDN needed if copied) |
| EXT_meshopt_compression | supported via `setMeshoptDecoder(MeshoptDecoder)`; `examples/js/libs/meshopt_decoder.js` exists (VERIFIED) | better for animated/skinned and decodes fast; our meshes are small (1.8 MB GLB), so compression is optional |
| KHR_texture_basisu | plugin exists but needs `setKTX2Loader` (VERIFIED) | see 2.7 |
| EXT_texture_webp | in the list (VERIFIED) | WebP on Safari 14+ macOS 11+; PLAUSIBLE; keep a JPEG path |
| KHR_materials_pbrSpecularGlossiness, lights_punctual | supported | do not export lights (we light live) |
Export settings for the pilot (TUNING): +Y up, images "JPEG" (quality 85) for colour and "PNG" for normal if banding shows, vertex colour "Active", no lights, no cameras, apply modifiers, merge by material, no Draco for the first test (find bugs one at a time).
Our `baked_land.html` loader already swaps materials after load (baked map to `MeshBasicMaterial`). Keep that pattern: load the GLB for geometry and UVs, then build the materials in code so the exporter's material quirks do not matter.

### 2.7 Texture compression, sizes, iOS limits
| Item | Finding | Tag |
|---|---|---|
| KTX2Loader in r128 | NO global script: `examples/js/loaders/KTX2Loader.js` is a 404; the module `examples/jsm/loaders/KTX2Loader.js` exists and reuses `BasisTextureLoader`; it reads sRGB from the file's transfer function | VERIFIED |
| BasisTextureLoader (global, `examples/js/loaders`) | exists; needs `basis_transcoder.js` + `.wasm` from `examples/js/libs/basis`; `detectSupport(renderer)` first; picks ASTC (UASTC), BC7, DXT, ETC2, ETC1, PVRTC (PVRTC needs power of two); falls back to uncompressed RGBA32 with a console warning; does NOT set sRGB encoding (set `texture.encoding` yourself); mipmaps come from the file | VERIFIED |
| Use it? | Transcode UASTC to ASTC would cut GPU memory (ASTC 4x4 is 8 bits per pixel, 4 MB for 2048 squared, versus 22 MB for RGBA8 with mips) on devices with ASTC (Apple A8 and later; PLAUSIBLE). Cost: toktx or basisu toolchain, one more decoder, worker blob, a fallback. Defer; first prove JPEG/PNG. | PLAUSIBLE |
| Fallback | JPEG (colour, lightmap) and PNG (normal, masks) at 1024 / 2048 / (4096 only T0), power of two, mipmaps ON (`generateMipmaps` with `LinearMipmapLinearFilter`), anisotropy 4 on handheld, 8 on desktop (`renderer.capabilities.getMaxAnisotropy()`) | PLAUSIBLE |
| Max texture size on iOS | not documented in a source I could read; 4096 is the safe floor and recent devices report 8192 or more (UNVERIFIED). Read `gl.getParameter(gl.MAX_TEXTURE_SIZE)` at load and cap at 2048 for handheld anyway (our tier rule). | UNVERIFIED |
| Memory | one 4096 x 4096 RGBA8 is 64 MB (about 85 MB with mips); iPad page kills reported at about 1.25 GB, safe aim 300 to 500 MB; huge or many textures give "black texture and GPU process crash via Jetsam" (WebKit bug 232357) | VERIFIED as reports and arithmetic |
| Upload cost | JPEG decode and a 2048 upload can stall a frame; decode off-thread with `createImageBitmap` where available (r128 `ImageBitmapLoader` exists; PLAUSIBLE), and upload one island per frame | PLAUSIBLE |
Arithmetic (COMPUTED): 2048 squared RGBA8 = 16.8 MB, with mips 22.4 MB; 1024 squared = 4.2 MB, with mips 5.6 MB; 512 squared = 1.4 MB with mips. An island with albedo + lightmap + normal at 2048 is 67 MB of GPU memory, too much for T2 with several islands resident: see section 5.

## 3. Levels of detail and impostors
Existing contract (VERIFIED, `blender/assets/rock/manifest.json`): `lods` array with triangle counts (rock: 1900 and 700), `files.lods` list, textures with sizes and formats (rock_color and rock_normal, 1024, JPEG), sockets, collider box, producer record. Finding: `rock_01.lod1.glb` (575 KB) is LARGER than `rock_01.glb` (526 KB) although it has 37% of the triangles, so each LOD embeds its own copy of the textures. Fix: LODs share one texture file (external URI or one atlas), so a LOD costs only its geometry.
Proposal (TUNING, extends the manifest with `lods[].distance_m`, `lods[].kind`):
| Level | Use | Triangles per tree (existing species: 100 to 2200 at LOD0) | Distance (island scale) | Notes |
|---|---|---|---|---|
| LOD0 | hero close view, camp | 1000 to 2200 | under 25 m | leaf cards with alpha test, `alphaTest` not blending |
| LOD1 | normal play distance | 250 to 600 | 25 to 80 m | fewer cards, merged crown |
| LOD2 | far on the island | 40 to 80 (crossed quads) | 80 to 160 m | baked-in AO tint |
| Impostor | beyond 160 m, crowds, far islands | 2 (one quad) | beyond | 8 azimuth views |
- Impostor atlas from Blender: orthographic or 32 mm camera, film transparent, tree lit by sky only (flat), 8 azimuths (every 45 deg) x 1 elevation of 20 deg, 256 x 256 each, packed 4 x 2 into 1024 x 512 (JPEG cannot hold alpha: PNG about 100 to 250 KB each, or JPEG + a separate 8-bit alpha PNG; UNVERIFIED sizes). An optional second atlas holds the normal (for live sun shading) at 128 px per view. Page: a billboard shader picks the frame from the angle between camera and instance yaw and cross-fades two frames; fade between LOD2 and impostor by a dither (`discard` on a noise threshold), not blending.
- Instancing in r128: `InstancedMesh` with `setMatrixAt` and `setColorAt` (per-instance colour, added around r119; PLAUSIBLE, not re-read). One `InstancedMesh` per species per LOD: 6 species x 4 levels is 24 draw calls; too many for T3 (40) alongside everything else, so T3 uses LOD1 + impostor only and 3 species (TUNING).
- Re-bucketing: recompute each instance's LOD only when the camera moves more than 2 m or every 10 frames, rewrite matrices into the matching InstancedMesh, set `count`; avoid per-frame full rebuild (CPU cost UNVERIFIED).
- Crowd (people far away): the same impostor path with 4 poses, tinted per instance; at AR scale people are dots anyway (`MODES` table).
- Verifier changes (proposal): check `lods[i].triangles` decreasing, texture paths shared across LODs, impostor atlas present for trees, bounds equal across LODs within 5%.

## 4. The look match (live page settings)
First, what the Blender side actually is (VERIFIED, `li_scene.render_settings`): view transform Filmic with look "Medium High Contrast" (default, `LI_LOOK=bright`); exposure -0.4 on the camp hero and -0.15 on landform shots; single-scattering sky (Nishita on 3.6, Single Scattering on 5.x), air density 2.3, dust 0.35, sun disc off, sky strength 0.22; indirect clamp 8. The "moody" alternative is AgX at default look.
| Setting | Blender bright look | Live page starting value (TUNING, r128) |
|---|---|---|
| Tone mapping | Filmic, Medium High Contrast | replace the ACES chunk with a fitted Filmic curve (below); fallback `ACESFilmicToneMapping` |
| Exposure | -0.15 to -0.4 EV | `toneMappingExposure` 0.85 to 1.0 with the ACES fallback (r128 divides by 0.6 inside ACES: VERIFIED); with the fitted curve use 2^(EV) directly |
| Output encoding | sRGB display | `renderer.outputEncoding = THREE.sRGBEncoding` on every path including post (set output encoding once, at the last pass) |
| Hemisphere | sky light is the Nishita sky at strength 0.22 | sky colour from SH9 (the current constants (.36,.46,.62) / (.26,.23,.18) at 0.85 are a start); ground colour from bounce (sand-warm) |
| Sun | warm, elevation 20 deg, az 320 deg in the bake | colour 0xffc88a at 1.1 (the value in `baked_land.html`); colour temperature follows `SKY_CLOCK.md` section 4 table |
| Shadow softness | area sun, large penumbra | `PCFSoftShadowMap`, `shadow.radius` 2 to 4 (radius is ignored by PCFSoft in r128 and works with VSM/PCF; PLAUSIBLE: test), `normalBias` 0.25 (current), map 2048; VSM has light bleeding |
| Fog / haze | aerial perspective from the sky model | exponential fog colour = horizon colour of the sky state; density tuned so a 300 m object loses about 30% contrast (TUNING); matches the sea shader's own `far` mix |
| Bloom | none in the Cycles still | desktop T0/T1 only, threshold high (only sun glints and fire); OFF in AR and T3 and below |
| Grade | Medium High Contrast look | a contrast S-curve plus mild saturation in the final shader; or a 16 x 16 x 16 LUT strip (256 x 16 PNG) built from Blender (see below) |
Matching the curve (method, PLAUSIBLE, not yet run): in Blender render a grey step wedge (21 emissive patches, scene-linear 0.001 to 16) with the exact view settings, read the display values, and fit a 1D curve plus a per-channel desaturation toward white. Put the fit (LUT of 64 floats, or a 5-parameter formula) into the shader chunk `THREE.ShaderChunk.tonemapping_pars_fragment` BEFORE any material compiles, replacing the body of `ACESFilmicToneMapping` (r128 chunks are plain strings: PLAUSIBLE). Every material that includes `tonemapping_fragment` (including our ShaderMaterial sea, which already ends with that include) gets the same curve, in the no-post paths (AR, T3) too. Filmic and ACES differ most in highlight roll-off and in how saturated bright colours desaturate; expect the sun-lit sand to be the visible difference.
How to measure the match (script, section 6): same camera, same island, same sun, same sky; compare luminance histogram and mean colour.

## 5. Device tiers: what applies where
Tiers are those of `MODES_AR_DESKTOP_HANDHELD.md` section 6 (T0 to T5). Sizes are TUNING; MB are file sizes, "GPU" is memory after upload.
| Tier | Baked assets per island | Live effects | Island download | Textures per island | GPU per island | Whole world download (about 15 to 23 islands) |
|---|---|---|---|---|---|---|
| T0 reference desktop | albedo 2048 + sky GI 2048 + 3-sun mask 2048 + normal 2048 (4096 for a hero island if MAX_TEXTURE_SIZE allows), env equirect | sun with PCFSoft 4096, SH9 + env map, bloom, tilt-shift, fitted tone curve | about 8 to 10 MB | 4 | about 90 MB (resident: 2 to 3 islands) | about 60 MB, streamed |
| T1 desktop | same at 2048, no mask (AO + live sun) | PCFSoft 2048, SH9, light post | about 6 MB | 3 | about 67 MB, 2 resident | about 45 MB |
| T2 handheld high | albedo-with-AO 2048 + 1024 normal, or ONE combined 2048 for far islands | sun 2048 or baked, SH9, light post | about 3 to 4 MB | 2 | about 28 MB, 3 resident | about 25 MB |
| T3 handheld low | ONE combined 1024 (baked beauty, unlit), vertex colour far | no sun shadow on land, blob shadows for movers, no post | about 1 MB | 1 | 5.6 MB | about 12 MB |
| T4 AR | combined 1024 + vertex AO, bake direction at placement or accept a fixed sun | SH9 from the device light estimate, shadow catcher, 1024 shadow for movers, NO post | about 1 MB | 1 | 5.6 MB | about 12 MB |
| T5 small phone | vertex colours only (about 70 KB), 512 impostors | blob shadows, nothing else | under 0.2 MB | 0 to 1 | under 2 MB | about 3 MB |
Loading strategy (PLAUSIBLE, TUNING): (1) first paint in under 3 MB: geometry + vertex-colour AO + 256 px preview texture for the island the player sees; (2) then fetch the 1024 combined, then the full set for the island under the camera and its two nearest neighbours; (3) fade between texture levels over 0.5 s; (4) dispose textures of islands farther than N metres (`texture.dispose()`) and keep the 1024 as the always-resident level; (5) Cache API or service worker precache with a version key, capped at tens of MB (iOS may evict after about 7 days: `MODES` note); (6) one island uploaded per frame to avoid hitches; (7) tier changes swap files, never the seed or the world.

## 6. Pilot plan: the smallest experiment that proves the bridge
Pilot ("Bridge 1"): island seed 1122 (the camp island, already in `bake_land.py`), one camera, sun az 320 el 20 deg.
1. In Blender: bake with the sun off (sky GI + AO, RGB, no colour) and, separately, albedo and the sun-on beauty; write a 2048 `albedo.jpg`, `skygi.jpg`, `sunmask.jpg` (R = az 320 el 20, G and B left for later). Render the same camera as a Cycles still at 256 samples (existing hero script) and a 1024 x 512 sky panorama; compute SH9 from it. Render the grey wedge for the curve fit.
2. Page: a copy of `baked_land.html` (do not touch `islands_look.html`). Land = `MeshStandardMaterial` with `map` = albedo, `lightMap` = sky GI (uv2), live sun with the mask applied by `onBeforeCompile`, SH9 hemisphere, fitted tone curve, live sea untouched.
3. Same camera at 1200 x 800 in headless Chromium (our existing render scripts), five variants: A current live look, B baked beauty (today), C bridge, D bridge with sun off (overcast), E bridge at another sun elevation.
4. Script `bridge_compare.py` (numpy + PIL): per image convert sRGB to linear, Rec.709 luminance Y; 64-bin histogram of Y in display space (0 to 1); region masks (land, sky, sea by hand-drawn rectangles saved once); outputs per region: mean RGB, mean Y, p5/p50/p95 Y, histogram EMD (earth mover) distance to the Blender image, mean saturation, and a block (16 x 16 px) mean-colour ΔE; plus a side-by-side PNG and a difference heat map.
5. Visual checklist (human): shaded sides are blue-grey not black; creases at tree bases and boulders are dark; sun shadows have soft edges; sand does not clip; seams do not show at any zoom; no light halo on the coast; rotating the camera does not change the baked light (it must not shimmer).
6. Cost check: renderer.info (triangles, draw calls, textures) is exact in software GL, GPU memory by arithmetic; fps only on a real iPad (not part of pass/fail here).
Success numbers (TUNING; the first run defines the real baselines): land region mean Y within 0.03 (display 0 to 1) of Blender; p5 and p95 Y within 0.05; histogram EMD under 0.04 for C versus under half of A's EMD (the bridge must at least halve the distance of today's look); median block ΔE76 under 8 on land; frame triangles unchanged from mode 3 (about 92k); one island under 7 MB; load to first paint under 3 MB.
What would make it fail: (a) lightMap or uv2 not honoured by the loaded mesh (no second UV set); (b) banding in the 8-bit sky GI in shadow (then use RGBM or 16-bit PNG); (c) seams at island edges; (d) the curve fit cannot reproduce Filmic highlights (then accept ACES + a grade and lower the success bar); (e) the sun mask and the live shadow double up and look dirty; (f) iPad decode stalls on 2048 uploads (fall back to 1024 + vertex colour).

## 7. Common mistakes
| # | Mistake | Result | Fix |
|---|---|---|---|
| 1 | lightMap and baked beauty together, or live hemisphere + `MeshBasicMaterial` baked beauty plus live sun | double lighting, washed out, no shadow depth | one source per term: beauty = unlit Basic only; split bake = Standard with albedo, `lightMap`=sky GI only, live sun on top |
| 2 | wrong colour space: lightmap/albedo JPEG loaded without `texture.encoding = THREE.sRGBEncoding`; or the renderer left at Linear output | too dark/light, wrong contrast | colour textures sRGBEncoding, normal/mask textures Linear, `renderer.outputEncoding = sRGBEncoding` (r128 has no `colorSpace`) |
| 3 | tone-mapping the bake and then tone-mapping again in the page (our current bake does the first) | flat, double-curved | split bakes are SCENE-LINEAR (scaled), the tone curve is applied once, in the page |
| 4 | UV padding too small at the island edge | dark/light lines in the distance (mips blend neighbours) | 16 px padding at 2048, EXTEND, check at mip 4 |
| 5 | lightmap resolution too low for shadows | blurry, wobbly shadow edges | soft sun shadows only; keep small-object shadows live; 4096 on T0 or a detail tile |
| 6 | normal-map handedness (Blender OpenGL +Y, three.js also +Y; DirectX maps are flipped) | bumps look inverted | bake tangent-space OpenGL; if inverted set `material.normalScale.y = -1`; test with a grazing-sun sphere |
| 7 | AO baked into albedo AND `aoMap` used | doubly dark creases | AO in one place only |
| 8 | baked sun for one time of day shown at another | shadows point wrong way at dusk | section 8 |
| 9 | bake with the sea present | tidal flats and wet sand dark, not lit as dry land | bake with the sea plane removed and the seabed continuous; wetness live |
| 10 | missing `uv2` | `lightMap` silently samples nothing or the first UV set | assert `geometry.attributes.uv2` at load |
| 11 | sun disc in the environment map and a live sun | two suns in glints | env map without the disc; live sun only |
| 12 | `onBeforeCompile` shaders without a program cache key | wrong shader reused between materials | set `material.customProgramCacheKey` (PLAUSIBLE) |
| 13 | 8-bit lightmap clipping the sun-lit sand | flat white sand | scale by 1/4 before saving and `lightMapIntensity = 4`, or RGBM |
| 14 | upscaling the GLB land grid but not the lightmap | stair steps | keep grid and texture in step |
| 15 | measuring match on a single pixel row or on the sparkling sea | noisy numbers | region means, histograms, block ΔE |
| 16 | a different LOD with its own texture copy | download grows (seen in rock_01.lod1.glb) | share textures |

## 8. Weather, the sky clock and baked light (honest recommendation)
Facts from the project notes: the sky clock is one pure function of `t_game` (sun position, colour, moon, tide); sun altitude at the latitude of the model swings from 9 deg (midwinter noon) to about 56 deg (`SKY_CLOCK.md`, VERIFIED numbers there); weather states (clear, fair, overcast, fog, rain, storm, golden) change sky colour, sun strength and clouds live (`WEATHER_AND_SKY.md`, `CLOUD_PHYSICS_FOR_VISUALS.md`). A baked sun is right for exactly one moment.
| Term | Bake? | Why / how |
|---|---|---|
| AO (contact darkening) | BAKE | independent of sun and weather; also right under overcast |
| Sky bounce GI, sun off | BAKE (RGB) | depends on sky colour only as a multiplier: scale it live by the SH9 sky strength and tint (via a uniform in `onBeforeCompile`; r128 `lightMapIntensity` is a scalar) |
| Sun shadow on land | BAKE as masks for 3 sun positions (R,G,B = e.g. az 90 el 25, az 180 el 45, az 270 el 25), blend by sun direction; outside the range fade shadows to the live shadow map; at night and under overcast mask weight goes to 0 | PLAUSIBLE ("shadow mask" pattern), TUNING; a cheaper start: ONE mask, shadows fade out outside +-20 deg of it |
| Direct sun light (colour, strength) | LIVE | one DirectionalLight from `SKY_CLOCK`; shadows from the mask term on land, from the shadow map for movers |
| Sun bounce colour bleed (warm sand lit by sun onto cool rock) | skip or bake only for the golden-hour pose | sun-dependent: faking it by tinting AO is TUNING |
| Sea, foam, glitter, depth tint | LIVE | water moves, tide changes; the sea shader already reads the sky |
| Clouds and cloud shadows | LIVE | cloud shadows can multiply the sun term live (a moving noise texture) without touching the bake |
| Moving things (people, boats, birds, smoke) | LIVE | shadow map 1024 to 2048 or blobs |
| Tide and wetness | LIVE | one uniform: darken and smooth the albedo below the swash height; the baked land always includes the whole seabed so exposed surfaces are lit |
| Fog, rain | LIVE | fog colour from the sky state; rain darkens albedo through the same wetness term; baked shadow masks go to 0 in rain |
| Night | LIVE | moon as a weak sun, no mask, SH9 night set, baked AO still applies |
Recommendation (PLAUSIBLE; the pilot is the judge): bake the sun-independent parts (AO, sky GI, albedo, normal), keep the sun, the weather, the tide, the sea and the movers live, and add a 3-position sun mask only where it earns it (T0, T1). For AR and T3, bake the beauty for ONE sun ("golden afternoon", the look the owner liked) and accept that it does not move; in AR rotate the whole island group (not the baked light) to align the baked sun with the real one if the light estimate gives a direction (UNVERIFIED on a device). The owner-facing rule: "baked light is a photograph of one afternoon; the clock needs a live sun."

## 9. What is faked and what only a real device can answer
Faked or stand-in in this note: all budgets and sizes (TUNING); the JPEG sizes (UNVERIFIED); the Filmic fit (a method, not a result); the three-sun mask (a design, not built); impostor numbers (design). Not run: any bake, any render, any page.
Only a real device can answer: iPad Safari max texture size, memory at which the page is killed with 3 resident islands; JPEG decode and upload stalls; ASTC availability and the Basis path; heat and fps with PCFSoft and the sun mask; AR light estimate quality; whether the fitted tone curve looks right on the iPad panel (P3, brightness).
Could not verify (sources blocked or not read): the Blender manual (bake options, margin types, colour management, the Filmic stop range), which exporter extensions exist in Blender 3.6 versus 5.x, whether a second UV map is exported as TEXCOORD_1, `lights_fragment_end` (how `aoMap` is applied), `InstancedMesh.setColorAt` in r128, WebP and createImageBitmap behaviour on Safari, Blender's bake to vertex colours in 3.6, per-device iOS texture and memory limits, KTX2 via the jsm module inside a global-script page, cdn.jsdelivr.net (not reachable here).

## 10. Sources and licences
| Source | Used for | Licence |
|---|---|---|
| three.js r128 source on GitHub (GLTFLoader, KTX2Loader jsm, BasisTextureLoader, DRACOLoader, PMREMGenerator, WebGLRenderer, lights_fragment_maps, tonemapping_pars_fragment, libs folder listings), github.com/mrdoob/three.js | extension list, uv2, lightMap maths, PMREM sizes, tone curves, decoders | MIT |
| glTF-Blender-IO docs (github.com/KhronosGroup/glTF-Blender-IO, `scene_gltf2.rst`) | exporter extensions, occlusion node group, vertex colour modes, image formats | Apache-2.0 (PLAUSIBLE; check) ; Blender itself GPL, rendered output is ours |
| three.js forum threads (discourse.threejs.org: aoMap of GLB, lightmaps vs AO, lightMap from Blender) | lightmap in emissive or occlusion slot, UV channel 1, flipY | forum text, facts only |
| WebKit Bugzilla 232357, 300782, 228208; Apple developer forum threads | memory kills, huge textures, canvas limits | public reports, facts only |
| Draco, meshoptimizer, Basis Universal decoders shipped in three.js `examples/js/libs` | compression options | Apache-2.0 / MIT / Apache-2.0 (PLAUSIBLE) |
| Local: `bake_land.py`, `baked_land.html`, `bake_info.json`, `li_scene.py`, `islands_look.html`, `assets/rock/manifest.json`, `LANDFORM.md`, `RENDER_OPTIONS.md`, `MODES_AR_DESKTOP_HANDHELD.md`, `SKY_CLOCK.md` | project facts | own project |
