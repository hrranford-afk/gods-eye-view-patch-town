# The sea and the storms of The Gift: audit, design, tiers, prototype, build order (plan, 26 Nov 2026)

Status: planning note. Nothing on the live page was changed. The only code is `sea_proto/index.html` (standalone, no game code). Every number marked TUNING is a guess; every cost marked EST is my arithmetic or experience, not a measurement. The only measurements here are software GL (SwiftShader) on a shared CPU and they say nothing about an iPad or the Radeon VII.

Tone rails: hopeful and cosy; a storm is awe plus a little danger; things break, nobody is hurt, people are counted not tracked, nothing gory.

## 0. The short version

1. **The sea you have today is pretty, but flat.** The water mesh is a flat 128-segment disc; all waves are normal-map ripples in the pixel shader (`li_sea.js` SEA2_FS). Nothing rises and falls, so a boat can only heave 10 to 25 cm and a storm cannot look like a storm from a deck. That is the one thing to change.
2. **Recommendation, one line:** put one Gerstner wave sum (swell sets with groups, wind sea, a little chop) into the vertex shader of a polar mesh, keep today's pixel ripples and glitter on top, drive it from `macro_sea.js` (which already produces swell trains, a sea state, tide and storms as a pure function of seed and hour), and port the same sum to JS so the boat, crates, wrack timber and damage model read the SAME height. 8 waves and 24k triangles on the iPad; 24 waves, 210k triangles, spray and 20,000 debris points on the Radeon.
3. **Do not build an FFT ocean first.** It can run on r128 WebGL2 (section 2.2) but the boat cannot read it on the CPU without a stalling readback, so it would give a pretty sea the game cannot touch. Use it later, on the Radeon only, for detail below 6 m (foam and normals), keeping the Gerstner sets for everything the boat feels.
4. **Storm types**: eight, from a summer squall to the Great Wash (section 4). Four are nearly free from what exists (fog, squall, ground swell, rainbow-after), because `weather.js`, `moods.js` and `macro_sea.js` already carry the sky and the numbers.
5. **Storm damage** (section 5): wave height plus run-up against the beach heights decides exposure; four states (fine, damaged, broken, washed away) with a repair cost and a salvage value; the player always has hand gathering, a starter sack, a repair list, a forecast and a save offer. The first big storm leaves plenty standing.
6. **Risks**: foam looks like snow if overdone (the prototype shows it); the iPad's float render-target support is unconfirmed (matters only for FFT, not for the recommendation); shore break needs the beach height field in the shader and is the least proven part; the damage section is design, not code.

## 1. Audit: what exists

Source of truth: the tree at `origin/citylab/cloud-islands` (HEAD f6aa1ad) plus the sibling worktrees. **Finding:** `storm.js`, `weather.js`, `sky_clock.js`, `moods.js` and `ultra.js` are NOT in the files of `origin/citylab/cloud-islands` as of this read; they exist in sibling worktrees (`li-day`, `li-spine`, `li-lab`, `li-phys`, `li-food`, `li-town`) and `islands_look.html` already loads some by `document.write`. Whoever merges must make sure these land on the branch before the build steps below. I read `storm.js` from `li-day`.

| Piece | What it does | How it is drawn | Cost (EST unless stated) | On the live Gift page? |
|---|---|---|---|---|
| `li_sea.js` (312 lines) | Shared sea code: noise generators, flow encoder, intertidal land GLSL, and SEA2_FS, the dark wind-chopped sea | Fragment shader only: 5 ripple trains (plus 3 more and wind-stretched chop at hiWaves), analytic slope, Fresnel to a small sky function, sun glitter with sub-pixel jitter, whitecaps from crest height, shore foam from the height texture `uH`, wake from 24 vec4 | Pixel-bound; roughly 25 texture reads and about 8 `exp` per pixel at hiWaves; triangles near zero | Used when the page runs the SEA2 branch (`sea=2`, or flow, seabed, weather, macro, clock or world flags imply it). The default build keeps an older sea. I did not verify which flags the shipping Gift URL sets |
| the sea mesh in `islands_look.html` (`buildSea`, line 1422) | The water object | `CircleGeometry(TABLE_R+.4, 128)`, flat, shader material, transparent, `waterMesh.position.y = tide` | About 256 triangles. Heave comes only from moving the whole plane with the tide | Yes (always) |
| `macro_sea.js` (393 lines) | Pure function of (seed, game hour): tide (5 harmonics), storm tracks, swell packets (honest dispersion, arrival times), wind sea, sea state, arrivals of drift, `seaComponents` (8 Stokes components on a diorama scale, a log map of honest wavelength to 0.5 to 2 km window), `seaH` for the CPU, `SEA_GLSL` for a shader, `seaHGlslPort` for parity tests | CPU numbers; one GLSL snippet (8 components, 2nd-order Stokes) | Trivial on CPU; 8 cos pairs per vertex if used | Only with `macro=1`. The sea plane is flat so its height only reaches the boat as a capped heave (comment at line 622: "the sea plane is flat in the mesh, so the heave is capped at 14 cm") |
| `macro_sea_view.html` | A canvas-2D timeline of storms, Hs, wind, tide, plus a 1D water profile from `seaH` | 2D canvas, no WebGL | Negligible | No (a lab page) |
| `seabed.js` (299 lines) | Pure seabed rules: seeded bathymetry, exposure, stream speed, sea colour, foam and drift inputs | Feeds `uB` and `uH` textures the sea shader reads (depth, exposure) | CPU once; one texture tap per pixel | Only with `seabed=1` |
| `storm.js` (913 lines, from `li-day`) | The first storm and the Great Wash: pure schedule and barometer; tidal swirl; surge as a page-level water raise (`LI_STORM_TIDE`); 24 haul heaps; one hulk (574 triangles, placeholder); debris pieces as InstancedMesh batches (9 light kinds on iPad, 20 on Radeon; caps 400 iPad, 3000 desktop, 20000 Radeon); a debris bench | The swirl is a flat shader disc on the water (about 40 triangles) that does not move the water; the surge raises the level uniformly; waves are the weather state's | Debris is the main cost; the swirl is trivial. iPad about 20 to 30k triangles for 400 pieces (the page test prints the figure); Radeon unmeasured, that is what the bench is for | Yes on `?game=gift` (off with `&storm=0`) |
| `boat_motion.js` (72 lines) | Pure: heave, pitch, roll from 5 sea heights, oar stroke, sail trim, rudder, LOD | CPU numbers | Trivial | Only with `boatkit=` |
| `boat_drive.js` (774 lines) | The tender you drive; speed, turning, tide grounding, wake and spray, its own 5-point rocking with caps (`heave .1`, angle `.06 + .08*amp` rad) | The rocking is applied to the boat mesh | Trivial | Yes on `?game=gift`. **The caps are why the boat sits still in a swell**, a design choice that must be loosened for storms |
| The sky clock tide link (`sky_clock.js`, `SKY_CLOCK.md`) | One clock for sun, moon, tide; the same five harmonics as `macro_sea.js` (a test checks they agree) | `tide` number into `U.uTide` and `waterMesh.position.y` | Trivial | With `clock=1` or moods |
| `weather.js` and `moods.js` | 8-state weather chain, wind, Beaufort, sea-state numbers, lightning; sky moods (rainbow, shower, rays, frost, sea smoke, clearing, clear night) as pure functions | Sky dome terms, cloud cards, rain; moods are layers on the 8 states | Small (research note estimates about 25 ALU per sky pixel for a rainbow) | Weather with `weather=`; moods with `moods=1` |
| `gpusim/ocean_gpgpu.html` | A shallow-water (virtual pipes) GPU sim on RGBA32F ping-pong textures; 7.3 ms per step at 256 square on software GL (measured there, not meaningful for a card) | Fullscreen passes with `texelFetch`; no float-linear needed | See file | No; a prototype. It proves float ping-pong works in this repo's headless Chromium |

What is missing for a beautiful sea: real vertical wave displacement, waves that shoal and break at the beach, foam that comes from wave geometry rather than noise, spray, a whirlpool that actually bends the water, and a height function the game can query.

## 2. Design

### 2.1 What the waves are made of (the part that is the same on every tier)

One **Gerstner sum**: each wave moves a surface point as x = x0 - Q A d sin(th), y = A cos(th), with th = k d.p0 - w t + phi and the deep-water dispersion w = sqrt(g k). Three bands:

* **Swell sets**: 3 to 5 waves with close wavelengths (0.78 to 1.3 times the peak) and close directions (a few degrees). Their different speeds beat against each other, so you get **groups**: a run of big waves, then a lull. This is the single most important thing for "it looks real" and costs nothing extra. `macro_sea.js` already supplies trains with period, Hs and direction; map each train to one set.
* **Wind sea**: 5 to 9 waves, wider direction spread, shorter.
* **Chop**: 10 short waves (Radeon only in the vertex shader; on the iPad these are the pixel ripples that exist now).

Pinch factor Q per wave is set so the sum of Q k A is about 1; slightly over 1 folds the crests. The **Jacobian** of the horizontal map comes out of the same loop for free, and where it goes small crests are folding: that is **foam from geometry**, a better source than noise. Waves fade out with distance from the camera once they are much shorter than the distance (the mesh could not draw them anyway), which stops shimmer.

The diorama scale issue (the table is 122 m across): `macro_sea.js` already solves it with a log map of honest wavelength to window size (`dioramaL`). Keep that; the prototype uses real metres (swell 60 to 150 m) because it is a free-standing sea.

### 2.2 Options compared, honest cost

| Option | Looks | iPad 60 fps? | Radeon? | The game can read the height? | Verdict |
|---|---|---|---|---|---|
| **A. Gerstner sum in the vertex shader** (8 to 24 waves, polar mesh) | Good: real swell, groups, folding crests, foam from the Jacobian. Weak at short chop | Yes, comfortably: 8 waves is about 16 sin/cos per vertex on about 12k vertices (EST under 1 ms of vertex work on an A12-class GPU; pixel shader is the real cost) | Overkill | **Yes**: a 20-line JS port; exact for the vertex displacement (the prototype does this) | **Recommended base for both tiers** |
| **B. Normal-map ripples only** (what exists) | Pretty from above, flat from a deck | Yes | Yes | Only the tide | Keep as the top detail layer |
| **C. FFT ocean** (Tessendorf, GPU) | Best: real spectrum, hundreds of waves, great chop and foam | Doubtful (needs float or half-float render targets; see below) | Yes, easily | **No** without a readback; a readback stalls the pipeline, or you keep a 64 square FFT on the CPU (EST 1 to 3 ms in JS, a lot) | Later, Radeon only, for detail below 6 m |
| **D. Shallow-water sim** (`gpusim`) | Real wakes, run-up, harbour sloshing | No | Yes | Same readback problem | Use only locally (wakes, harbour, the whirlpool), not for the open sea |
| **E. Pre-baked animated heightmap** (looping textures) | Cheap, repeating | Yes | Yes | Yes if kept on the CPU too | A fallback if vertex texture reads are slow on old iPads |

**Can r128 on WebGL2 do an FFT ocean? Yes in principle.** r128 creates a WebGL2 context when the browser has one (the prototype reports `isWebGL2`). It supports `WebGLRenderTarget` with `FloatType` or `HalfFloatType`, so a ping-pong chain of full-screen `ShaderMaterial` passes works; you write about 60 lines yourself (r128's GPUComputationRenderer is in the examples folder and is not in this repo's vendor copy; do not download). Needs: `EXT_color_buffer_float` for rendering to RGBA32F (present on desktop Chrome with a Radeon; **on iPad Safari I could not confirm it, treat as unknown and test at runtime**; `EXT_color_buffer_half_float` is the likelier fallback), and vertex texture fetch (standard in WebGL2). A 256 square cascade is about 8 butterfly stages in two directions, in a few packed RGBA targets, so roughly 20 to 30 passes over 65k texels: EST well under 1 ms on the Radeon VII. A second 64 m cascade gives the sub-metre detail. Not possible in r128: compute shaders (WebGPU only). The repo's `gpusim` proves float ping-pong in headless Chromium; it does not prove it on a device.

**Where an FFT would earn its place:** the Radeon's close-up water (detail normals and foam below the boat's 6 m cut-off). Keep the Gerstner sets for the big shapes so the CPU query stays exact. Hybrid plan, later.

### 2.3 Foam, shore, spray, light (what each costs)

| Feature | iPad | Radeon | Notes |
|---|---|---|---|
| **Foam from Jacobian** | Per vertex, interpolated; noise-masked in the pixel shader | Same plus per-pixel extra chop terms | Free with the Gerstner loop. The prototype shows the failure mode: too much reads as snow (section 6) |
| **Foam from slope or crest height** | A cheap second term | Same | Used for whitecaps in a gale |
| **Persistent foam trails** (foam that fades after a wave passes) | No | A ping-pong foam texture, decay 0.97 per frame, injected where the Jacobian is low (EST 0.2 ms) | Needs half-float or 8-bit target (8-bit works) |
| **Shore break and run-up** | Shader reads `uH` (already there). Shoaling: amplitude grows as depth^-1/4 (Green's law), wavelength shortens, steepness caps at H about 0.78 d, then a foam band; swash line = water level plus run-up | Same with a second band and a wet-sand darkening that lags | The beach heights give the depth. Run-up R (Stockdon-type, TUNING at diorama scale) is the number the damage model uses too |
| **Spray particles** | 600 points, vertex-animated, only at folding crests | 12,000 points, plus 3,000 at the shore break | The prototype does these on the GPU with no CPU per-particle work |
| **Storm whitecap streaks** | A stretched-noise term along the wind | Same plus streak foam texture | Already half exists (`streak` in li_sea.js) |
| **Underwater tint and caustics** | Tint by depth (exists); caustics only in shallow bands (exists in the land pass) | A scrolling caustic texture on the seabed under 3 m, refraction-style distortion of the seabed | The sea is transparent now (alpha by depth); keep it |
| **Reflection of the sky clock** | The sea already reflects a small `sky()` function. Replace it with the dome's gradient (same colours as the sky shader) so sunrise, a rainbow and lightning reflect | Add the cloud term (the prototype's Radeon tier does this) | One small cube-free approach: compute the sky colour analytically in the water shader, no reflection render |
| **Fog** | Exp2 by distance, colour from the horizon band | Same plus a low sea-smoke layer | One uniform pair per type |

### 2.4 How boats, crates and timber ride the same waves

* **One height function, two implementations.** `seaHeight(x, z, t)` in JS is the shader's sum, minus the camera-distance fade and minus waves shorter than 6 m (a 4.4 m boat does not follow them). The horizontal pinch means the surface point above (x, z) came from a different p0; a 4-step fixed-point iteration inverts it (the prototype does exactly this). Boat: five points (centre, bow, stern, port, starboard) feed pitch, roll and heave as `boat_motion.floatMotion` does now. **Loosen the caps in storms**: today `CAPS = {heave .25, angle .12}` and `boat_drive` uses `.1` and `.06..14`; a gale with 2 m waves should allow 0.3 to 0.4 rad. The prototype uses 0.38 rad for the boat and shows a real list.
* **Crates, planks, wrack**: same query, one point each, plus a drift velocity from the wind and the orbital velocity. They ride, bob, and move toward the beach by the wave-averaged drift (Stokes drift, a small term toward the wave direction).
* **Parity test**: the existing `seaHGlslPort` pattern. Add a test that renders 64 points to an RGBA8 target and compares with the JS (a day of work, listed in the build order). I did NOT machine-check shader/JS parity in the prototype; the boat sits on the crests in the pictures, which is a visual check only.
* **Heave and the game height**: the boat grounding rule in `boat_drive.js` uses depth = tide minus ground. Use effective level = tide + surge + wave setup, not instantaneous wave height, so a hull does not ground and un-ground every wave.

### 2.5 How the tide, the wrack line and timber are fed by the swell

* `macro_sea.js` `arrivals()` already decides what drift reaches the window each hour (a pure function of seed and hour). Keep it as the source of **what**; add **where it stops**: the highest line the water reached in the last 12 hours = high-water mark + the larger of the storm surge and the run-up of the biggest swell packet. Timber (and later, other wrack) deposits at that height with a seeded scatter. Bigger swell, higher line, more timber, further up the beach.
* The sky clock tide and `macro_sea` tide agree already (a test). Surge from `LI_STORM_TIDE` is added to the page's tide; the wave sum rides on top. The damage model reads the same three numbers (tide + surge + run-up).

### 2.6 The Great Wash, the whirlpool and the 20,000 pieces

* **Today:** a flat swirl disc, a uniform surge, debris instanced and "arrives with the water" by a vertex-injected front (`storm.js`).
* **Whirlpool, proposed:** a funnel in the Gerstner vertex stage (a Gaussian depression, 6 to 9 m deep, about 25 m radius; the prototype has it) with spiral foam arms, plus an analytic swirl current (a Burgers vortex: tangential speed Gamma/(2 pi r) times (1 - exp(-r^2/rc^2))). The same function drives: debris orbit (GPU), boat drift (CPU, so the tender is gently pushed round, never swallowed), the existing flow-map texture. Nothing is pulled under; it is an eddy and a race, as in the current story text.
* **20,000 pieces on the Radeon:** `storm.js` already caps at 20,000 and instances 20 kinds. For the Wash they are driven on the GPU (orbit radius, angle, rate from a seed; height from the same sea function in the vertex shader; the prototype does this with points as stand-ins). They are **visual**, counted not tracked, same as the haul heaps.
* **Link to rubble-style Rapier debris (separate job):** expose three pure functions from the sea module: `waterLevel(x, z, t)`, `waterVelocity(x, z, t)` (orbital plus swirl plus run-up flow), and `swirl(x, z)`. Rapier bodies get buoyancy and drag from them (force = k (v_water - v_body) when below `waterLevel`). Only pieces within about 40 m of the player and above a size threshold are **promoted** from instanced visual to a Rapier body (budget 200 to 400), and **demoted** back to instances when asleep. Settled pieces become the heaps the haul already uses. The sea module never imports Rapier; Rapier imports the sea functions.

## 3. Tiers

Targets from the brief: iPad about 150k triangles and 160 draw calls at 60 fps. The sea must leave room: the island, haul batches (20 to 30k), boat, people, sky. Budget: **sea 25k triangles, 12 draw calls** on the iPad.

| | **iPad** | **Desktop** | **Radeon** |
|---|---|---|---|
| Vertex waves | 8 (3 swell set, 5 wind sea) | 16 (4 / 7 / 5) | 24 (5 / 9 / 10) |
| Pixel ripples | 4 | 7 | 10 plus FFT detail later |
| Mesh (polar rings x segments) | 72 x 160 = 23k tri (measured count in the prototype: 24,072 total scene) | 140 x 320 = 90k tri | 220 x 480 = 211k tri (measured: 212,232 scene) |
| Foam | Jacobian + crest + noise | same + streaks | same + persistent foam texture |
| Spray points | 600 | 4,000 | 12,000 (+3,000 shore) |
| Debris in the Wash | 400 | 3,000 | 20,000 |
| Draw calls for sea + spray + sky + debris | about 4 | about 4 | about 5 |
| Pixel ratio cap | 2 (1.5 if frame time slips) | 2 | 2 and up to the ULTRA tier's dynamic scale |
| Vertex cost (EST) | well under 1 ms | about 1 ms | 1 to 3 ms; pixel shader dominates |
| Pixel cost (EST) | the risk: about 25 ALU-heavy lines plus 4 ripples; use 0.75 render scale in a storm if needed | fine | fine |
| Measured here (software GL, **not real**) | 24,072 triangles, 11 draw calls, 30 to 70 ms per frame on a shared CPU | not run | 212,232 triangles, 11 draw calls, over 1 s per frame on a shared CPU |

How to use the existing tier switch: `QL().hiWaves`, the ULTRA tier (`ultra.js`) and `&device=ipad|radeon` already select; add the sea counts to those tables rather than inventing a second switch. Step-down rule (iPad): if the 95th-percentile frame goes over 20 ms for 2 s, drop to render scale 0.8, then drop pixel ripples to 2, then spray to 0.

## 4. Storm types

The owner wants variety, not one storm. All types are the **same sea module** with different inputs, so each costs a table row plus a sky and sound recipe. Parameters are the prototype's (kA = steepness k times amplitude, L = wavelength in metres); they are TUNING.

| Type | Waves (Gerstner inputs) | Sky and light | Sound | What arrives; what to prepare | Warning and forecast | Cost per tier | Cheap from what exists? |
|---|---|---|---|---|---|---|---|
| **Summer squall** (short, bright, rainbow after) | Wind sea kA .15 at L 15; swell kA .05 at L 60; chop .10; q 1.15. Gusty: the wind term pulses (the existing `gust` factor). Ten minutes of game time | Bright sun at the edge, a dark cell with rain (a moods rain cell), then **rainbow, rays and a gold clearing** (`moods.js` rainbow, rays, clearing). Prototype: "Squall just gone" | Wind rising, rain on canvas, then birdsong and drips | A little loose timber and a few floating crates. Prepare: pull the boat in, cover the stock | 20 to 30 game minutes: sky darkens on one side; the barometer line dips slightly | iPad ~ same as calm; Radeon adds spray | **Yes** (weather + moods + wave table) |
| **Autumn gale** (steady wind, big swell, lots of timber) | Swell kA .10 at L 120; wind sea kA .19 at L 34; chop .10; q 1.3; whitecap streaks | Grey, low sun, long light gaps; dim. Prototype: "Autumn gale" | A steady roar that rises and falls; rope creak | **Lots of washed-up timber** along a high wrack line for days after; some boats and crates float off if loose. Prepare: tie boats, move stock above the line, lay out collecting robots for the morning | A day or two: barometer falls, forecast pill says "gale in 30 hours" (macro_sea storm tracks give this honestly) | iPad: 8 waves, 600 spray; Radeon: full | Mostly (macro_sea + haul heaps from `storm.js`) |
| **Fog bank** (calm, no visibility, lighthouse, quiet drift arrivals) | Swell kA .02 at L 90; wind sea almost none; q .7. The sea is glassy | Fog density about 0.03 per metre: the horizon vanishes at about 60 m; **the lighthouse beam matters** (`LIGHT_FOG_AND_LIGHTHOUSE.md`); sun a pale disc | Foghorn, dripping, distant bell, oars in the dark | Quiet drift arrivals: single parcels bumping gently on the shore. Prepare: light the lighthouse; do not drive far (boat has a "lost" rule, never a danger: the compass turns you home) | Visible at dawn; forecast "fog likely this morning" from the dew-point proxy in `weather.js` | Nearly free: fog uniform, fewer pixels | **Yes** (prototype already looks right) |
| **Thunderstorm** (lightning on the sea, fast and loud) | Swell .07 at L 90, wind sea .17 at L 26, chop .11; q 1.25; gusts strong | Very dark; **lightning**: a sky flash plus a bolt line plus a brief water flash (the prototype flashes every 7 s of game time, deterministic); rain curtain | Thunder with the right delay (distance/340), rain roar, a ringing in the quiet after | Loose things float; robots go indoors (existing rain rule). Prepare: nothing special; a scare, not a loss | 10 to 20 minutes: anvil clouds, first distant flashes, a counted gap between flash and thunder | iPad: bolt off, flash only; Radeon: bolt plus lit foam | Mostly (weather lightning exists) |
| **Ground swell** (clear sky, long glassy powerful swell from a far storm) | Swell kA .085 at L 150, direction 60 degrees off the wind, spread 3 degrees; wind sea .004. Period about 14 s | **Blue clear sky**, warm low sun, glitter lines along the faces. The danger is that it is beautiful | Slow deep boom of waves on rocks; gulls | Big surf at the beach, strong **run-up with no warning in the sky**; timber and the odd parcel arrive on the surge. Prepare: stay off the low jetty; moor with long lines | **Two days ahead**: `swellArrivalHours` gives the arrival time of a far storm honestly; a "long swell from the west, building" line on the tide table | Same as calm; the surf band is the cost | **Yes** (macro_sea packets already do this) |
| **Winter storm** (dark, cold, then frost and sea smoke; real danger to the dock) | Swell .09 at L 130; wind sea .17 at L 30; chop .09; q 1.25; streaks | Dark, low sun at 5 degrees, cold blue. **After**: clear, **frost on up-facing surfaces and sea smoke** (`moods.js` frost and smoke) | Wind in the wires, ice ticking, a deep quiet after | The **dock and moorings are at real risk**; stock heaps low on the beach may wash; a wide wrack line. Prepare: strengthen or lift the dock, move stock uphill, take the boat to the haul-out | 36 to 48 hours: forecast and barometer; a hard-frost warning | Radeon: sea smoke layer; iPad: tint only | Partly (frost and smoke moods exist; damage model is new) |
| **The Great Wash** (once: whirlpool, hulk, 20,000 pieces) | Swell kA .13 at L 140; wind sea .17; q 1.25; **surge +1.2 m**; **funnel** 9 m deep, 28 m radius with spiral foam | Sodden gold-brown dusk, a gap of low sun and **crepuscular rays** at the edge, then a calm clearing | A long low rumble, then a vast quiet; the whirlpool's hush | The hulk lies on the sheltered stretch; 20,000 pieces (Radeon) or 400 (iPad) as heaps over days. Prepare: the whole forecast chain; see section 5 | 48 hours: letters and the barometer; the camera eases over to the swirl | iPad: funnel 8 waves; Radeon: 24 waves, 20,000 points | Partly: swirl, surge, heaps and hulk exist (`storm.js`); funnel and damage are new |

Prototype menu: Calm, Summer squall, Squall just gone (rainbow), Autumn gale, Fog bank, Ground swell, Thunderstorm, Winter storm, The Great Wash, with a "how far it has risen" slider (0 calm to 1 full).

## 5. Storm damage

The owner wants big storms to be able to break things. Design rules first: it must feel fair, it must be recoverable, and the first big one must teach, not punish.

### 5.1 What decides what is hit

Per storm, compute three numbers (all pure functions of storm state and the beach height field):

* **Water level at the shore** WL = tide + surge + wave setup (about 0.17 Hs for a steep beach; TUNING).
* **Run-up reach** RU = WL + the 2 percent run-up of the biggest swell packet (Stockdon-type: R about 0.4 * sqrt(H0 L0) at a typical slope; TUNING at diorama scale). This is the highest line the water touches.
* **Wave energy** E = Hs squared, scaled by exposure of that shore (the `exposure` field `seabed.js` already has: open to the swell direction means high).

An object at ground height h and distance d from the shoreline is **exposed** if h < RU. Its **load** is: E_shore * (1 - (h - WL) / (RU - WL)) for things between WL and RU (above the still water, the swash only); things below WL get the full wave: E_shore * (1 + 0.5 * submergence depth), reduced by shelter (a rock, a headland or a wall upwind: the lee idea already in `li_sea.js`). Distance matters because run-up energy decays inland (about 0.5 per 5 m beyond the water line at the diorama scale).

### 5.2 Damage model

| Thing | Exposed by | Fine / damaged / broken / washed away thresholds on load (TUNING) | Repair cost | Salvage |
|---|---|---|---|---|
| **Stock heaps** (planks, rope, glass, metal) | height and distance | 0.2 / 0.5 / 0.8: lose 0, 25, 60, 100 percent of units | none (restock) | lost units become wrack timber/rope/glass downshore |
| **Dock and moorings** | low by design | 0.3 damaged (some planks float off), 0.6 broken (**pier loses its end**), 0.9 washed away outer section | planks and rope by the plank count | broken boards become wrack |
| **Parked robots** | height | 0.35 knocked over, 0.7 "needs a clean and a check" (down for 1 game day, not destroyed). Robots are relics; nothing gory | oil and a day | none |
| **Boats** | tied or not, in the water or hauled | tied and sheltered: scratches only; untied: floats off (found within 1 to 3 islands' shores, always findable); hauled above RU: fine | planks and caulk | a lost boat is found, never deleted |
| **Half-built stages** (the camp stages being built) | height | 0.4: scaffolding down (progress back one step), 0.8: stage reverts one step; never to zero | the materials of the lost step, 50 percent returned as salvage | 50 percent |
| **Kit crates** | height, tied or not | 0.4 floats off; 0.9 breaks open | none | contents stay in the crate (washed up) |
| **Props** (benches, signs, small items) | height | 0.5 knocked over, 0.8 washed away | a plank each | wrack |

States: **fine**, **damaged** (works, with a visible wound, repair is cheap), **broken** (does not work, repair is moderate), **washed away** (gone from the spot, the pieces are on the beach or at sea; **rebuild cost is higher but salvage is high**). Wrecked things become **washed-up timber and salvage**, using the wrack line and haul heap code that exists. The salvage value is always at least half the cost, so a storm is a trade, not a loss. People are counted not tracked: "the crew sheltered at the old fort" is a line in the summary, never a risk.

### 5.3 Protection choices (all optional, all visible)

* **Move stock uphill** (carry, or robot order "stock above the line"): the single best cheap action. The forecast screen draws the predicted run-up line on the beach so you see what will be hit.
* **Tie boats down** or haul them out (a rope item each).
* **Breakwater** (rocks off a beach; reduces E_shore for the shore behind it by a seeded factor, 30 to 60 percent).
* **Seawall** (reduces load on what it protects by 70 percent and cuts the run-up reach behind it; the sea can still overtop it in the Great Wash).
* **Sturdy builds** (stone footing, post and beam: +1 step of threshold each).
* **Robots helping**: with a warning of N hours, N robots can carry stock up; show "6 robots, 3 hours, 40 percent of the heaps will be above the line".
* **Forecast and warning time**: every big storm has a macro_sea storm track, so the forecast is honest and early. Squall: 25 minutes; thunderstorm: 15 minutes; gale: 1 to 2 days; ground swell: 2 days; winter storm: 36 to 48 hours; Great Wash: 48 hours, with letters.

### 5.4 Rules so the player is never stuck

* **Hand gathering always works**, even with every robot "needing a check". The starter sack (a small stock of planks, rope and nails that is NOT stored on the beach and cannot be hit) is always in the player's pocket.
* **A clear repair list** after each storm: what is damaged, broken, gone, the cost in materials, the salvage waiting on the beach, and one suggested first step ("fix the dock end first; there are 11 planks on the north beach").
* **An offered save** before every big storm ("a gale is coming; save now?"), not forced.
* **The first big storm leaves plenty standing and says exactly what happened and why.** Cap damage at one fifth of exposed things (the first storm is "a small one" per `storm.js` STORY V2); a card says: "The water reached this line; these things were below it; these three planks came off the pier because it was untied at the end." No surprise losses.
* **Nothing the player carries or has stored in a roofed building is ever lost.** Washed-away things are always recoverable as salvage within 10 game hours, then thin out softly, as the haul already does.
* **No storm in the first two days** of a new camp, and **never two big storms inside 10 game days**.

### 5.5 How the island visibly changes

| Change | iPad (cheap) | Radeon (rich) |
|---|---|---|
| Planks float off | Instanced planks leave the dock (swap to the loose-piece batch), 10 to 30 pieces | The pieces are Rapier bodies near the player, ride the waves with buoyancy from the sea functions |
| Pier loses its end | Swap to a "broken end" model, hide 2 to 4 segments | Same plus splinter sprites and a ragged cut |
| Scour of the sand | Lower the beach height by 10 to 30 cm in the exposed band (the `uH` height texture is written once; terrain is the same mesh) | Same, with a wet-sand lag and a darker scour mark at the dune foot |
| Debris on the beach | Haul heap code (`storm.js`) places counted batches along the wrack line | Same, plus the 20,000 GPU pieces settling, and promoted Rapier pieces near the player |
| Salt-white high line | A decal band at RU | A noise-edged band that dries over a day |
| Boats float off and are found | A boat object moved to a seeded find spot | Same, drifting with the wave drift for a few hours |

**Link with the rubble-style Rapier debris job:** it needs the sea's `waterLevel`, `waterVelocity` and `swirl` (section 2.6) and a **damage event stream** (`{kind, id, position, impulse, time}`) from the damage model; when a thing breaks, the event spawns Rapier pieces if the player is within 40 m, else just a heap. The damage model never depends on Rapier running. Everything on the iPad works with Rapier off.

### 5.6 Open taste questions (with my recommendation for each)

1. **Can big storms destroy built things permanently, or only damage them?**
   Options: (a) only damage and "washed away" is always recoverable by rebuilding from salvage; (b) permanent loss of some things; (c) permanent loss only in the Great Wash and for non-core props.
   **Recommendation: (a) plus a little of (c).** Built things can be damaged, broken or washed away, and the cost to rebuild is real, but the salvage returns at least half, and the core of the camp (the shelter you sleep in, the boat, the starter sack) is never destroyed. Anything you built after day 20 can be lost in the Great Wash; you are told 48 hours before. This keeps "real danger" without grief.
2. **Can a seawall fully prevent damage, or only reduce it?**
   Options: (a) fully prevent; (b) reduce by a fixed 70 percent; (c) reduce, and overtop in the biggest storm.
   **Recommendation: (c).** A seawall gives most of the protection (70 percent less load, run-up cut behind it) and is worth the cost, but the Great Wash overtops it, and a wall built badly (no footing) can lose a section. That makes it a good choice, not a magic one, and gives the Wash its awe.

## 6. The prototype and what it honestly shows

`sea_proto/index.html` (standalone, r128 from `rubble/vendor/three/three.min.js`, no game code). Buttons: **iPad sea** and **Radeon sea**; a **storm type menu** (Calm, Summer squall, Squall just gone, Autumn gale, Fog bank, Ground swell, Thunderstorm, Winter storm, The Great Wash); a slider for how far the weather has risen. A boat-sized box and three crates ride the CPU `seaHeight` query (5-point pitch and roll). A hulk lies at the whirlpool's edge in the Wash. The panel shows tier, wave counts, mesh size, triangles, draw calls, and frame ms (flagged as SOFTWARE GL when the renderer says so). URL switches: `?tier=ipad|radeon&type=gale&s=1&t=20&freeze=1&ui=0`.

Pictures (software GL, 960 by 540, SwiftShader) are in `research/sea_proto_shots/`: `ipad_calm`, `ipad_rising`, `ipad_storm`, `ipad_wash`, `radeon_calm`, `radeon_rising`, `radeon_storm`, `radeon_after` (rainbow), `radeon_thunder`, `radeon_wash`, `ipad_squall`, `ipad_fog`, `ipad_swell`.

**What I see, honestly:**

* **Calm (both tiers): good.** A soft teal sea with a hazy horizon, fine ripple texture. The Radeon version is smoother because of 0.5 m mesh spacing and 10 ripples.
* **Rising: right idea, a bit busy.** Longer swell shapes appear and crests whiten; there is a regular ring-like pattern in the pixel ripples (a seam from the ripple directions), worst on the iPad version. Needs per-ripple random warp (partly added) and fewer ripples at distance.
* **Gale (the storm): not yet beautiful.** The foam comes out as **big soft white blankets**, like snow, not as streaks and lace; foam edges need a sharper threshold and a streak texture. The wave shapes are hard to read from a 7.5 m camera: the swell is long (120 m) and the sea reads as a tilted sheet rather than ridges. A real storm needs the camera lower and nearer the crests, a darker trough colour, and foam lines following crests. The boat does tilt and sit lower in the troughs but looks small for the sea.
* **Squall: the best of the storm set.** Dark sky, whitecaps in streaks, a believable chop.
* **Squall just gone: the rainbow works** (visible on the Radeon tier, with the warm gap), the lit sea reads cheerful. Rays are weak.
* **Fog: right.** Nearly nothing visible past 60 m, boat sits in a pearl bowl.
* **Ground swell: too blank.** The swell is there (the camera was in a trough, height -3.3 m) but a glassy sea needs glitter lines and sky-gradient bands on the faces to show shape; my sky is too uniform to reflect. Choose a lower sun toward the camera for this type.
* **Thunderstorm (Radeon): good.** A jagged bolt in a purple-grey sky over dark water with long streaky foam lines; the long foam lines read as a real storm sea and are better than the iPad gale blankets (higher mesh and more waves helps). The bolt is a plain line; the sea does not light up under the flash beyond the sky tint.
* **Great Wash:** the sky (sodden gold-brown) and the hulk silhouette read well; **the whirlpool funnel is not visible** from the camera I chose (about 100 m away, low, partly behind the foam), so the picture does not sell the hero moment. Needs a camera closer to the funnel, a stronger spiral foam, a brighter rim light. The 20,000 debris points on the Radeon tier show as a speckle band around the hulk (reads as a lot of wreckage, but as dust, not as planks and barrels); they would be instanced pieces in the game.
* **Not shown at all:** shore break, run-up, rain (no rain streaks), sea smoke, caustics, persistent foam. Shader/JS parity is not machine-checked.
* **Numbers (software GL only, not a device):** iPad 24,072 triangles and 11 draw calls; Radeon 212,232 triangles and 11 draw calls; frame time 30 to 70 ms (iPad tier) and over 1 s (Radeon tier) on a shared CPU renderer. These prove the counts, nothing about speed.

## 7. Build order

Strictly scoped steps; each is shippable alone. Day estimates are EST for one builder with the files in front of them. "OWNER" marks steps that need the owner on a device.

| # | Step | Days | Needs the owner? | Risk |
|---|---|---|---|---|
| 0 | Land `storm.js`, `weather.js`, `sky_clock.js`, `moods.js`, `ultra.js` on `citylab/cloud-islands` (they are in sibling worktrees only) | 0.5 | no | merge conflicts in `islands_look.html` hooks |
| 1 | `sea_module.js`: pure `seaHeight`, `waterLevel`, `waterVelocity`, `swirl`, wave table from `macro_sea` state; node test with parity against `seaHGlslPort` | 1.5 | no | formula drift from the shader; the test is the guard |
| 2 | Vertex displacement behind `&sea=3`: polar mesh, Gerstner vertex stage, keep pixel ripples and glitter, replace the flat disc; iPad tier counts | 2 | OWNER: iPad check of frame time and look | pixel-shader cost; keep 0.8 render scale fallback |
| 3 | Boat and crates on `seaHeight`; loosen caps in storms; grounding on effective level | 1 | no | boats feel too rocky; add a "calm boat" accessibility switch |
| 4 | Foam from Jacobian, crest and streaks; sharpen against the prototype's snow problem | 1 | no | foam as snow; tune with pictures |
| 5 | Spray points (GPU only) | 0.5 | no | none |
| 6 | Shore break and run-up from `uH` (shoaling, breaking foam, swash line, wet sand) | 2.5 | OWNER: look at the beach | least proven; the diorama scale may need a fudge |
| 7 | Storm type table wired to `weather.js` and `macro_sea` (squall, gale, fog, ground swell first); sky reflection from the dome gradient | 2 | no | colour matching between dome and sea |
| 8 | Thunderstorm (flash, bolt, thunder delay), winter storm (frost and smoke moods link) | 1.5 | no | audio asset availability |
| 9 | Forecast pill and warning times; offered save; "what the sea will reach" line on the beach | 1.5 | no | UX clarity |
| 10 | Damage model, pure (loads, states, repair list, salvage), tests; the first-storm rules | 3 | no | tuning; start permissive |
| 11 | Visible damage, iPad path (swap models, hide segments, scour, wrack from the haul code) | 2.5 | OWNER: iPad | model swaps need small assets (can reuse existing pieces) |
| 12 | Whirlpool funnel, swirl current, hulk on the waves, Great Wash type | 2 | OWNER: Radeon | the funnel can look fake without a rim light |
| 13 | Radeon extras: 24 waves, 12,000 spray, 20,000 GPU debris, bench integration | 1.5 | OWNER: Radeon, run the bench | real frame cost unknown until measured |
| 14 | Rapier link: `waterLevel/waterVelocity` exposure, promote/demote, damage event stream (with the rubble job) | 3 | OWNER: Radeon | physics budget; keep Rapier optional |
| 15 | FFT detail on the Radeon (float ping-pong, 256 cascade, normals and foam below 6 m) | 4 | OWNER: Radeon; needs a float-target check on iPad if used there | `EXT_color_buffer_float` availability |

Recommended first slice (about 7 days, steps 0 to 5): the sea moves, the boat rides it, a gale looks like a gale. Then 6 and 7 (the beach and storm variety). Damage (10 and 11) can proceed in parallel with the rendering steps because it is pure logic.

## 8. Risks, in one list

* Foam can make a storm look like snow or cloth; keep the sharpness knob and tune with pictures on the owner's actual screen.
* The pixel shader, not the mesh, is the iPad risk; keep a render-scale step-down.
* Shader/JS parity needs a test from day one (step 1).
* The beach shoaling and run-up are the least proven pieces; the diorama scale (122 m table) stretches honest physics.
* Float render targets on iPad are unconfirmed; the recommendation does not depend on them.
* `storm.js` and friends are not on the branch yet (step 0).
* Damage tuning can feel unfair; the first-storm rules and the salvage rule are the guard.
* No real-device number appears in this note; everything measured is software GL.

## 17. Benchmark and maxed tier (sea_proto, 26 Nov 2026)

What the prototype page gained after the owner first ran it on the Radeon VII (the card was about 18 percent busy: the Radeon sea is far below its limit, and there was no context).

* **GPU readout.** Frame ms, GPU ms from `EXT_disjoint_timer_query_webgl2` (a sampled `gl.finish()` when the browser hides the timer, labelled rough), "GPU busy about N percent of a 16.7 ms frame" (an estimate), the raw renderer string, triangles, draw calls, resolution. It says whether the page is limited by the 60 Hz display, by the GPU, or by something else.
* **Bench ladder.** A Bench button, a warning, then Start. Each rung about 6 s after a 1.2 s warm-up; axes one at a time from a light base: mesh 24k to 2M triangles, waves 8 to 96, spray 0 to 400k, debris 0 to 100k, islands off/on, render scale 1x to 3x, then one combined rung at each axis's last good value. An axis stops at the first rung over 33 ms for 5 frames; if the very first rung is over, the bench stops (software GL does). An error (lost context, shader error) stops it at once. The report lists GPU ms per rung, the last good rung per axis, a suggested Radeon MAX from the 55 fps knee, and has a Copy report button. No paths, URLs or user data in it.
* **Radeon MAX.** 48 waves, a 500k-triangle polar mesh that is re-centred on the camera (so the dense rings are where you look), 100k spray, 20k flotsam points drifting with the wind round the viewer. "Use these limits for Radeon MAX" in the report applies the bench knee. Defaults are guesses until a real report arrives.
* **Storm foam fixed.** The first version covered whole slopes in white. Now: whitecaps need a folded crest AND height on the wave AND a noise threshold; a thin trailing foam; wind streaks that are short, sparse and never opaque; troughs darker. Pictures: `sea_proto_shots/radeon_gale_foam_before.jpg` and `..._fixed.jpg`. Still wrong: the water is teal rather than slate, the pixel-ripple layer leaves a moire grain at low angles, and the 100k spray is barely visible at this point size.

### 17.1 Islands in the sea
Two copies of the seed 9001 island (heights and ground class from the landform arrays, bicubic as `rubble/terrain.js` reads them), one turned so its lee beach faces the waves. Approximations, each with what it gets wrong:

* **Shoaling and breaking limit:** amplitude grows as depth^-1/4 (Green's law, capped at 1.6x), and the summed height is held under 0.9 of the depth. Wrong: no nonlinear steepening, saturated surf looks flatter than a real surf zone.
* **Shorter wavelength:** an extra phase path PHI (the integral of n-1 along the wind, n from the tanh dispersion) is made on a 4 m grid for a swell and a wind-sea length. Wrong: one heading (the wind) for all waves, rays are straight, so strong refraction round headlands is not right.
* **Refraction (Radeon, MAX):** each wave's direction is its own plus the gradient of PHI, so crests bend to run along the shore. The iPad tier has no refraction (phase and damping only).
* **Wave shadow:** three rays 10 m apart along the wind; a blocked ray damps waves by up to 85 percent. Wrong: no diffraction, edges are a guess.
* **Breaking foam:** where wave height over depth is above about 0.77 (depth under 1.3 wave heights), in lines along the crests, plus a lace band in the last 0.6 m of depth, plus spray off the breakers.
* **Swash and wet sand:** the island mesh runs the same wave sum at 0.4 of the height with no depth limit, fading with height above the tide; where it is above the ground there is a thin water sheet, a foam lip and lace; sand is darkened up to the swash envelope. The tide is the world's 1.1 m cut to 0.6 m on a 4 minute period so it can be watched. Wrong: it is not a hydrodynamic run-up, there is no backwash memory.
* **Boat and crates:** with Drift on they slip downwind, slow as the water gets as deep as their hull, ground out and take the slope; the CPU query is the same maths as the shader, minus refraction direction.
Pictures: `sea_proto_shots/*_isl_*.jpg` (three tiers, calm, rising, storm) and `close_calm_hi/lo.jpg` (the same beach at high and low tide). All software GL: they show the look, never the speed.
