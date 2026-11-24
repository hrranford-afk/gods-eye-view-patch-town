# Beautiful weather: the minimal sky moods (task 35)

Switch: `islands_look.html?moods=1` (default off), or `&mood=rainbow|shower|rays|frost|clearing|night` to start with one mood held. Without either nothing changes: default hash `8d962c0c`, 88,790 triangles, no `__li.moods`, `moods.js` not loaded (tested). Research: `research/BEAUTIFUL_WEATHER.md` (its section 17 minimal list, the geometry of section 1, the recipes of section 9). The owner asked for it because the weather is mostly miserable: the page now has lovely options and a way to see them.
Tags: VERIFIED (a physical fact the note checked), PLAUSIBLE (standard lore), COMPUTED (checked by a test here), TUNING (a game number I chose), UNVERIFIED (not checked). No real place names are used.

## What the page does
`&moods=1` implies `&clock=1` (sun, moon, stars from `sky_clock.js`) and `&weather=auto` (the 8 states of `weather.js`), and the weather then follows the clock hour: a pure function of `(seed, game hour)`. On top of that it draws six moods:
| Mood | What you see | Natural gate (pure, `moods.js`) |
|---|---|---|
| Rainbow | primary bow 40 to 42.4 degrees round the antisolar point, violet inside, red outside, a faint supernumerary band inside it (high tier), Alexander's dark band, the reversed secondary 50.3 to 53.5 at 0.4 of the strength, a dark rain curtain and squall base on the antisolar side | sun 0.3 to 42.4 degrees, a rain cell on the antisolar side, sun disc visible, a keyed draw |
| Sun shower | warm bright sun, rain still falling (more streaks, longer, brighter), a silver-lit curtain beside the sun, glittering sea | `showers`, sun above 2 degrees, sun visible, keyed draw |
| Crepuscular rays | shafts fanning from the sun and converging again on the antisolar point (40 percent), drifting slowly, plus faint dark wedges between them | sun 1 to 36 degrees, haze or humid air, `fair` or `showers` cloud cover 0.12 to 0.78, or thin fog with the sun up, keyed draw |
| Frost and sea smoke | white rime on up-facing ground, roofs and boughs (patchy, with glints, melting first on sunlit slopes), calm sea, a pink and violet dawn; sea smoke (soft wisps rising off the water, lit warm by the low sun) on a rarer subset | cold season (Nov to Mar, fading to mid May and mid September), `clear` at dawn, wind under 3.4 m/s, no rain, keyed draw; the frost melts with the sun (1 to 3 h) |
| Post-storm clearing | blue sky, bright cumulus, a big swell still running, a wet shining shore, long visibility (60 km), the squall leaving as a curtain on the far side | within about 12 hours after `storm` (weight 1) or `rain` (0.55), decaying with a 6 h time constant, daylight, not itself in rain, fog or overcast |
| Clear night | stars brighter (limit magnitude +0.7, alpha x1.6), a stronger Milky Way, a meteor every 11 s, a rare northern glow (green curtains, magenta tops), lit windows and campfire from the clock | sun below -8 degrees and a cloudless sky; glow only on 16 percent of dark nights, never with a bright moon, never on a frost night, never at midsummer |

Buttons (top bar): Rainbow, Sun shower, Rays, Frost, Clearing, Clear night (each holds the mood: it sets the date, hour and weather state, freezes the clock and frames a camera), Auto (back to the weather and the clock at speed 1), Next (jumps to the next natural beautiful moment of the seeded schedule), and a chip that names the mood showing and its strength. `__li.moods.force(name)`, `.auto()`, `.next()`, `.view(name)`, `.state()`, `.hide(part, bool)` (parts: bow, rays, frost, smoke, aurora, cell, sheen, dome), `.parts()`, `.tris()`.

## Files
| File | What |
|---|---|
| `moods.js` | pure module (UMD, `LI_MOODS`): bow geometry (`bowFade`, `bowTop`, `arcPoints`), rain cells (`cellsAt`), mood strengths (`rainbowAt`, `showerAt`, `raysAt`, `frostAt`, `nightAt`, `clearingAt`, `moodsAt`), `tweakWeather`, the chooser (`seasonWeights`, `chooseMood`), the finders (`nextOccurrence`, `nextBeautiful`), presets (`plan`, `view`). No DOM, no `Math.random`, no wall clock |
| `islands_look.html` | block "sky moods" (about 150 lines: sky overlay shader, land shader term, sea smoke, AR arch, HUD, API) plus 9 small hooks (loader line, `MDON`, `WXS` default, `CKON`, landMat patch, build, two frame hooks, weather `atFn` and `tweak`, init, API) |
| `weather.js` | one change: `opt.tweak(P)` bends a COPY of the parameter set (absent = exactly as before) |
| `tests/moods-test.js` | node, pure: 53 checks, about 40 s |
| `tests/moods-page-test.js` | playwright: 52 checks (default page, high, low, `post=0` and AR tiers with every mood held, pixel checks, buttons, `&light=1`, `?world=5&life=1`, `?world=153`); `only=tiers|pixels|ui|mix` runs one part, `quick=1` skips low, post=0 and the world pages |
| `tests/moods-render.js` | `shots/moods-sheet.png` (2 x 3, labelled) and `shots/moods-1..4.png` (1200 x 800: rainbow, rays, frost with sea smoke, clear night) |

## 1. moods.js
- Geometry (VERIFIED physics, COMPUTED by the test over 852 sun positions): the primary is zero from 42.4 degrees up, the secondary from 51 up; the top of a bow of radius R is `R - sun elevation` at the azimuth opposite the sun; every arc point is exactly R from the antisolar direction; with the sun on the horizon half the circle is up. Band edges are the note's numbers (40 to 42.4 and 50.3 to 53.5).
- Rain cells (the note's 2.3, TUNING): a `showers` segment carries two cells; a cell enters from the upwind bearing, swings through 180 degrees round one side (the side is a keyed draw) and leaves downwind, half width 26 to 48 degrees, strength `sin(pi q)^0.6`. The rainbow only appears when a cell sits within about half its width of the antisolar azimuth (soft edge). With the cell on the sun's side the strength is 0.000 (tested).
- Gates are products of smooth factors, so a mood fades in and out; everything is keyed by `(seed, day)` through one 32-bit hash. Strength is always 0..1 (tested over 80,000 days).
- Frequency (200 seeds x 100 days, share of days with the mood above 0.3 at any half hour, COMPUTED): rainbow 7 to 12 percent in every season (target 8 to 15), sun shower 10 to 13, rays 20 to 22, frost mornings 6.3 percent of winter days (about 1 in 16; 0 in midsummer), sea smoke 1.1 percent of winter days (0.7 in autumn), northern glow 4.9 percent of winter days (0 at midsummer), post-storm clearing 10 to 17, dark clear nights 38 percent of winter days and 1.7 at midsummer. No two rare treats on one night (frost and glow never together: 0 clashes in 80,000 days).
- `tweakWeather(P, k)` blends the weather parameters toward each mood's targets by its strength (rainbow: sun scale 1.0, thin deck, cover 0.3, rain 0.2; shower: rain 0.5, sun scale 1.0; rays: haze 0.2, cover 0.55; frost: wind 1.8 m/s and the sea state recomputed, cover 0.05, cool tint; clearing: swell 1.9, whitecaps 1.6, wet 0.85, visibility 60 km, saturation 1.28; night: cover 0.04, no rain, no cirrus). Tested: all zero leaves the weather untouched, half strength gives half the change.
- Chooser: `chooseMood(seed, doy)` picks the day's featured mood by season weights (frost only in the cold season, night in winter, rainbow near the equinoxes) with a keyed draw; never frost in July, every mood picked by some seed in some season, different seeds give different picks.
- Presets (`plan`): rainbow = day 268, sun 15 degrees in the afternoon, a wide cell on the antisolar side; shower = day 140, sun 26 degrees, curtain beside the sun; rays = day 285, sun 9 degrees; frost = day 345, 0.55 h after sunrise; clearing = day 300, sun 19 degrees, a squall on the far side; night = the darkest of days 318 to 352 at 23:36 (a thin crescent above the sea if one stands there). The moon age cannot be asked for: `SkyClock.hoursFor` with a moon age adds whole years until the phase fits, which puts the hour centuries out and makes the weather schedule millions of segments long (measured: 6 million hours, 10 fps). The presets use the date only.

## 2. The page
- Sky overlay: one low-poly sphere (224 triangles high, 120 low) at 1,000 m round the camera, drawn after the clouds and before the rain, depth-tested against the land and sea, premultiplied alpha (so one shader can both darken for the rain curtain and add light for the bows, rays and glow). The bow is the note's recipe 9.1 in a per-pixel term (angle to the antisolar point, a 7-stop spectrum, Alexander's band, the inner glow), the rain mask is the cell's azimuth window widened to 1.8 x its half width so the whole arch shows. Rays are shafts in planes through the sun and antisolar axis, so one noise pattern about that axis serves both sides.
- Frost and wet sheen: one block in the land shader (up-facing surfaces only, above the tide line, grain-modulated so it is patchy, glints from a hash, thinning on sunlit slopes by `uMelt`) and a Fresnel sheen on the wet shore band. Zero triangles.
- Sea smoke: 150 camera-facing billboards (300 triangles) placed once on open water by rejection sampling of the page's height function, rising and thinning in the vertex shader, faded near the camera, colour from the sky and the low sun.
- Weather coupling: the weather is `LI_WEATHER.at(seed, clock hour)` in auto mode and each mood bends it through `opt.tweak`; a held mood sets the state, snaps it (no 3.5 s blend) and freezes the clock.

## 3. Numbers
| Item | Value | Tag |
|---|---|---|
| default page | hash `8d962c0c`, 88,790 triangles, 0 errors, no `moods.js` | COMPUTED |
| `&moods=1` world hash | `8d962c0c` unchanged in every tier | COMPUTED |
| moods' own geometry, high | 524 triangles (sky sphere 224 + 150 smoke billboards 300) | COMPUTED |
| moods' own geometry, low | 260 (sphere 120 + 70 wisps 140) | COMPUTED |
| moods' own geometry, AR | 168 (two arch ribbons 96 + 36 wisps 72) | COMPUTED |
| whole page with a mood held, high | 89,672 to 91,486 triangles (the weather's own rain streaks add up to 1,800 in a shower: 0.5 x 1,800 x 2) | COMPUTED |
| budget | under 1,000 at high, fewer at low | met |
| pixel tests (720 x 480) | saturated green 3,479 px with the bow and 0 without; none with the sun at 56 degrees; rays change 34,164 sky px; frost whitens 9,542 ground px; sea smoke lightens 90,822 px; glow 45,441 green px against 0 hidden; 290 star points | COMPUTED |
| `&light=1&moods=1&mood=night` | lamp lit (1.00), 0 errors | COMPUTED |
| `?world=5&life=1&moods=1&mood=frost` (q=low) | 44,697 triangles, 0 errors; `?world=153&moods=1&mood=rainbow` 0 errors | COMPUTED |
| other suites after the change | look-test 7/7 (hash, 88,790, low 60,752), weather-test 48/48, clock-page-test 50/50, light-page-test quick 39/39, moods-test 53/53 | COMPUTED |
| frame time on a device | not measured (software GL only) | UNVERIFIED |

Tiers: high = sphere 16 x 8, supernumeraries, 150 wisps, meteor and glow; low = sphere 12 x 6, no supernumeraries, 70 wisps; post-processing off (`&post=0`) works the same (tone mapping chunk in the shaders). Shader cost: the overlay is one full-sky pass (about 25 ALU for the bows when on, 20 for rays, 20 for the glow, branches skipped when a strength is 0), and the sphere is hidden when no mood is on.

## 4. What is faked
- The bow's brightness and band width are art controls, not a spectral calculation; the supernumerary band is a sine; the spectrum is a 7-stop gradient.
- Rain cells are azimuth windows on a track, not a radar field; the curtain is a shader shape on the sky sphere, not rain in the air near the camera (the weather's own streaks fall everywhere in the box round the look target).
- Rays are noise about the sun axis, not driven by real cloud gaps; they are stronger where the weather has haze.
- Frost, sea smoke and the "cold" are a proxy from the date, state and wind (no temperature, humidity or dew point in the weather); the sea smoke is billboards, not a heat and mass model.
- The clearing's big swell is the weather's swell multiplier, not the macro sea's storm tracks (`&macro=1` is not coupled).
- The northern glow is a coloured curtain, the meteor a short streak; the moon age is not chosen by the presets.
- The year is compressed (one game day is 8 real minutes), so the per-day frequencies are higher per hour of play than in nature.
- Latitude 57.5 for the sun and the numbers; the AR arch geometry is false by design (a toy arch at table scale, not 42 degrees).

## 5. AR notes
`&clockdome=0` (or `&moodar=1`) is the profile: no sky sphere, so the sky effects become table ornaments. The rainbow is a pair of flat ribbons (primary, and the reversed secondary 22 percent larger and fainter, 48 triangles each, additive, a slow pulse) standing on the side of the table away from the light, facing the table centre. Frost and the wet sheen are on the island and work unchanged; sea smoke drops to 36 small wisps; rays, glow, meteor and halo are skipped (no sky). The real light direction should come from the WebXR light estimate when there is one; here the clock's sun stands in. Not done on a device: the arch against a bright room, the frost white against the real light, and whether additive ribbons read in daylight.

## 6. Pictures and what I changed after looking
`shots/moods-sheet.png` (2 x 3): 1 rainbow, 2 sun shower, 3 rays, 4 frost and sea smoke, 5 clearing, 6 clear night. `shots/moods-1..4.png` (1200 x 800): rainbow, rays, frost, clear night.
1. First rainbow: the arcs were right but the sky overlay was drawn under the cloud deck, so the rain curtain was invisible and the bows hid behind clouds; moved the overlay after the clouds. The curtain was then a pale smudge (its tint was as bright as the sky: tinted dark, 0.1 of the horizon luminance), then a jagged dark mountain (soft gradient base and top instead), then rays of dark light (streaks made finer and nearly vertical, a lighter rain veil under the base).
2. Supernumeraries drew as a dozen hatch lines inside the bow: period widened to 1.3 degrees, faded away from the bow, strength 0.03.
3. Sun shower: the first picture was a hazy golden sky with nothing falling. The curtain now goes silver-gold near the sun (backlit rain), the streaks are fine, the weather's rain is thicker (0.5) and the camera looks beside the sun so the sun, the veil and the glittering sea are all in frame.
4. Frost: the first coat was white snow on everything: made patchy (grain-modulated threshold), 0.8 opacity, glints; a pink-white blob of sea smoke sat on the lens: wisps fade near the camera; the frame was half empty sky: camera tilted down 7 degrees.
5. Clearing: first a cream carpet like a sunset; cover cut to 0.3, a squall curtain added on the far side, sun at 19 degrees. Night: the glow had a hard ridge at its base and covered the whole sky: soft lower edge, narrower window, intensity 0.32.

## 7. Ranked gaps (most important first)
1. The rain in the air is not located: the weather's streaks fall everywhere round the look target, while the curtain is painted on the sky sphere. A near cell (rain on one side of the table, a bright gap on the other) needs the rain instancing to take a mask from `cellsAt`.
2. Not tried on a device or a real AR session: frame time, the arch against a real room, the frost against real light. Software GL gives about 10 frames a second here, so only correctness is tested.
3. Halos, sun dogs, the circumzenithal arc, fogbow, moonbow, first snow, wet-shore glitter beyond the sheen, and mist burning off are not built (the note's stages 2 to 4 beyond the minimal list); the fogbow and the mist lifting are the cheapest next.
4. No sound and no mood lines (the note's section 15 asks the town's models for 6 to 16 word lines per mood, shown once when a mood begins).
5. Macro sea is not coupled: the clearing's swell should come from `macro_sea.js` storm tracks, the cold snap for sea smoke from its pressure and wind, and the rain cell's side from its wind.
6. The cloud deck and puffs still look like a flat carpet from low camera angles (weather.js, not touched here); with the bow and rays on top the sky is good, but cumulus towers would lift every picture.
7. Wildlife and boats do not react (birds gathering on a frost morning, boats staying in for a squall, a light in the window for the glow).
8. The sea smoke is sprites without depth sorting between wisps; a few wisps pop when the camera crosses one. A noise-scrolled sheet or a particle layer would be smoother.
9. The preset moon is whatever the date gives; a chosen thin crescent over the sea would complete the night picture.
