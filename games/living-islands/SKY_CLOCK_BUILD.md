# Sky clock: what was built (task 15)

Switch: `islands_look.html?clock=1`. Without it the page is untouched: default hash `8d962c0c`, 88,790 triangles, no extra script, no `__li.clock`. Research: `research/SKY_CLOCK.md` (the gate in `RESEARCH_FIRST.md` is met for this layer; the numbers below carry the note's tags). Do not put real place names in game code, assets or recipes: none are used.

Tags: VERIFIED = a standard value or definition; PLAUSIBLE = standard astronomy from memory, checked by running it; COMPUTED = measured by `tests/sky-clock-test.js`; TUNING = a look or game number I chose; UNVERIFIED = not checked.

Files:
| File | What |
|---|---|
| `sky_clock.js` | the pure clock: no DOM, no `Math.random`, no wall clock. `window.SkyClock` / `globalThis.SkyClock` / `module.exports` |
| `islands_look.html` | the wiring behind `&clock=1` (block "sky clock wiring" near the weather chip, plus 12 one-line hooks) |
| `tests/sky-clock-test.js` | node, pure: 60 checks |
| `tests/clock-page-test.js` | playwright: page checks |
| `tests/clock-render.js` | the pictures: `shots/clock-sheet.png` (3 x 4) and `shots/clock-1..4.png` |

## 1. The clock (`sky_clock.js`)

`clock(seed, gameTimeHours, {lat, doy0})` returns, as one plain object: `lat`, `band`, `doy`, `dayIndex`, `lst` (local mean solar time), `season {name, index, yearFrac, midsummer, midwinter}`, `sun {elev, az, dir, decl, eotMin, up}`, `sunrise`, `sunset`, `dayLength`, `polar`, `noonElev`, `midnightElev`, `day` (civil, nautical and astronomical twilight edges), `twilight {stage, name, darkness}` (day, civil, nautical, astronomical, night), `moon {age, phase, illum, name, waxing, elong, elev, az, dir, limbPA}`, `tide {h, level, rate, spring}`, `stars {angle, lat}` and `phases {day, month, tide, star}`.

- Time. `gameTimeHours` is hours since an epoch that is a NEW MOON at the moment the moon crosses the meridian at local solar noon. So local solar time is `(hours + 12) mod 24`. This is the same epoch `macro_sea.js` uses (its hour 0 is a new moon, its high water is 5.5 h after the lunar transit), so the two agree by construction. Day of year at hour 0 is `doy0` (macro_sea.js: 290). The year is 365 days with no leap rule (TUNING). Axes: x east, y up, z south; north is -z; azimuth from north clockwise: `dir = (cos alt sin az, sin alt, -cos alt cos az)`. In the default camera (sitting south of the table looking north) the sun rises on the right and sets on the left.
- Latitude per seed (`latitudeFor(seed)`): 48 to 64 degrees north, the cool temperate (35 to 55) and subpolar (55 to 65) bands of `globe/planet.py` (`BAND_EDGES`), a hash of the seed (TUNING; 400 seeds span 48.01 to 63.96, tested). The default page without `?seed=` uses 57.5 (`DEFAULT_LAT`, the research tables' latitude); `&clat=` overrides. A world page (`?world=N`) draws its latitude from the world seed.
- Sun: Spencer's declination and equation-of-time series, hour angle, altitude and azimuth (PLAUSIBLE, COMPUTED against the research table, see section 2). Sunrise, sunset and the twilight edges come from `dayInfo`; a day where the sun never dips below a depth reports `always-above` (midsummer: no nautical and no astronomical night at 57.5 N), one where it never reaches it `always-below`.
- Moon: mean elongation `2 pi age / 29.530588 d` (error up to about half a day, PLAUSIBLE), ecliptic position = sun longitude + elongation, latitude from the 5.145 degree orbit tilt through the 27.21 day nodal cycle, converted to right ascension and declination, then to altitude and azimuth through the hour angle. So the moon rises about 50 minutes later each day (measured 50), a full moon is opposite the sun, high in winter and low in summer, the waxing moon is east of the sun. Phase name and illuminated fraction `(1 - cos elongation) / 2`.
- Tide: the five harmonics of `macro_sea.js` (M2 12.4206 h, S2 12.000, N2, K1, O1; amplitudes 1.40, 0.50, 0.28, 0.07, 0.06 m), the same phase rules (hour 0 = new moon, high water 5.5 h after transit, strongest springs 36 h after new and full moon), `level = clamp(h / 2.2, -1, 1) * 1.1` game metres. M2 turns with the moon's hour angle and S2 with the sun's, so `M2 phase - S2 phase = -2 x elongation + a constant`: spring and neap are the sun and moon phase (tested to 1e-2 rad). Seasonal and lunar modulation (TUNING): equinox boost +4 percent on M2 and S2, peaking on days 80 and 262; perigee boost +3 percent on M2 over 27.55 d. `tide.spring` (0 to 1) is the lagged beat. Where both run, the clock tide and `macro(seed, hour).tide.level` are equal to 1e-9 (tested at 400 hours); with `&clock=1&macro=1` there is one hour (the macro's) and one tide.
- Stars: `stars.angle` is the hour angle of the vernal equinox, linear in time at 15.0411 degrees per game hour (a solar day later the sky has moved 0.986 degrees). The pole sits at altitude = latitude, due north.
- Per-component phase accumulators: `createAccumulator({hours0, speed})` keeps one hour and four angles (solar day, lunar month, M2 tide, star rotation), each advanced by `rate x dh` per frame; `setSpeed` changes only the rate. They agree with the closed form `phasesAt(hours)` to 3e-13 rad after 20,000 frames and 7 speed changes (tested). Because everything is a pure function of the hour, replay, save and a skip of any length never leave a stale state.
- Light palette: `light(clock)` returns the linear colours and intensities the page reads (see section 3). It is also pure and tested for continuity.
- `hoursFor(doy, lst, moonAge)` gives the game hour for a calendar day, a solar time and a moon age (adds whole years until the moon matches): used by the pictures, the tests and the page API. `nextSunDown(seed, from, elev)` finds the next time the sun goes down through an elevation: used by the Dusk button. `starField(seed, n)` is a deterministic procedural star list (power-law magnitudes, a few bright landmarks, 30 percent along the galactic plane).

## 2. Numbers and confidence

| Quantity | Value in the build | Source or check | Tag |
|---|---|---|---|
| Noon sun, 21 Dec / 1 May / 21 Jun at 57.5 N | 9.08 / 47.33 / 55.95 deg | research table 9.1 / 47.3 / 56.0 | COMPUTED within 0.1 |
| Midnight sun (lowest), 21 Dec / 21 Jun | -55.9 / -9.05 deg | table -55.9 / -9.1 | COMPUTED within 0.05 |
| Day length 21 Dec / 20 Mar / 21 Jun | 6.59 / 12.11 / 18.04 h | table 6.58 / 12.12 / 18.03; the Stornoway search extract gives 18 h 14 at 58.2 N | COMPUTED, PLAUSIBLE |
| Day length monotonic winter to summer solstice | every day rises, every day falls after | test | COMPUTED |
| Summer to winter day-length ratio | 2.74 | research 2.7 | COMPUTED |
| Sunrise azimuth midsummer / equinox / midwinter | 40.2 / 90 / 135.8 deg | research 40 / 90 / 136 | COMPUTED within 3 |
| Midwinter noon shadow, midsummer | 6.24 and 0.67 times the height | research 6.2, 0.68 | COMPUTED |
| No astronomical dark on 1 May, present on 1 Feb; no nautical dark at midsummer | as listed | research section 3 | COMPUTED |
| Moon period measured over ten years | 29.5304 d (123 new moons) | 29.530588 | VERIFIED value, COMPUTED |
| Moon transit later each day | 50 min | research about 50 | COMPUTED |
| Full moon opposite the sun | within 7.2 deg worst (limit 8: the 5.1 deg orbit tilt plus the 1 to 2 deg mismatch between the declination series and the ecliptic longitude) | test | COMPUTED |
| Full moon peak altitude near midwinter and midsummer | above 45 and below 25 deg | research up to 60 and 9 to 16 | COMPUTED |
| Spring range over neap range (unclamped sum) | 1.99 (4.64 m against 1.69 m peak to peak) | research about 2 | COMPUTED, amplitudes TUNING |
| Largest tidal range | at moon age 0.5 d here (1.5 d lag minus the 36 h phase offset of S2: the test allows 1 to 2 d after new or full) | test | COMPUTED |
| High water interval | 12.35 h scanned (M2 12.42, S2 pulls it) | test | COMPUTED |
| Tide equals macro_sea.js | max difference 0 (1e-9 asserted) | test | COMPUTED |
| Star pole altitude, rotation, circumpolar limit | 57.5 deg; 15.04 deg/h; declination above 32.5 never sets | tests | VERIFIED geometry |
| Moon apparent size on the dome | 1.5 degrees (real 0.52) | game readability | TUNING (x2.9) |
| Sun disc on the dome | 1.6 degrees (real 0.53) | game readability | TUNING (x3) |
| Moon illusion | x1.25 near the horizon | research 1.3 to 1.5 | TUNING |
| Stars | 4,500 high, 2,200 low; magnitude slope 0.5; limiting magnitude 6.5 falling with the moon | research section 7 (first stars at sun -4, full at -15) | TUNING |
| Moonlight | `0.48 x illum^3.3` (a half disc gives 0.1 of full, tested) | research section 5 | PLAUSIBLE |

## 3. The page (`&clock=1`)

Query parameters (all optional): `cd` day of year (default 121, 1 May), `ch` local solar hour (18), `cm` moon age in whole days at noon of the start day (4, a waxing crescent in the evening), `clat` latitude, `cspeed` (1), `cfreeze=1` (stop the clock: pictures and tests), `cmoon` moon diameter in degrees, `cstars` star count, `clockdome=0` (the AR profile, below). `&clock=1` implies the sea=2 look (as `macro=1` does) because the old sea shader has no night path. With `&macro=1` the macro's hour is the clock (`mh`, `mt`, `mspeed` still work); the day of year is then macro's 290 and the clock only reads.

What each part does:
- One lamp. The page's directional light is the sun by day and the moon when the moon is brighter (they cross at the same intensity, so no pop). `sunDir` (shared with the sea shader, shadows, weather, animals) follows it, floored at 1.5 degrees above the horizon so shadows never run to infinity. Sun colour and intensity follow a table by elevation (warm and weak at 3 degrees: (1, 0.46, 0.19) at 1.45; cool and strong at 60: (1, 0.90, 0.76) at 2.45), the hemisphere fill follows the sky, and moonlight is `(0.70, 0.80, 1.0)` at up to 0.48.
- Sky. A gradient dome (`SphereGeometry(1200)`, drawn first, no depth) from a sun-side horizon, an anti-sun horizon and a zenith colour, all looked up by sun elevation (11 keyframes, smooth interpolation, +/- 0.5 LSB dither); a glow round the sun that widens as it sinks; at 57.5 N midsummer midnight the sun-side horizon glow circles the north. With `&weather=` the weather pass keeps its own dome and clouds and the clock re-tints them (sky colours by the ratio to the clear day sky, fog and haze colours, cloud lit colours by sun or moon).
- Sun disc and moon. Camera-facing quads on the dome. The moon is a shaded sphere lit from the sun's true direction, so the phase and the tilt of the lit limb are right; maria are six soft blobs, the dark part takes the sky colour behind the moon plus a little earthshine, and the disc keeps its brightness whatever the exposure.
- Stars. One `THREE.Points`: positions computed in the vertex shader from right ascension, declination, the clock's star angle and the latitude. Extinction near the horizon, twinkle (stronger low down), sizes and brightness by magnitude, colour by B-V (subtle). Fade by twilight and by the limiting magnitude (moonlight and midsummer glow remove the faint ones). The Milky Way is a per-pixel band from galactic latitude on a 24 x 12 sphere (no texture, no sprites).
- Sea. Body and foam brightness and tint, reflected sky and glitter colour become uniforms (`uCkB`, `uCkH`, `uCkZ`, `uCkG`); the glitter is the sun's by day and a pale moon glitter at night.
- Night. Windows: a warm quad on every house window and a soft pool on the ground (merged into two meshes; per-window brightness in vertex colours; each house has its own hash of when it lights and when it sleeps, 22:00 to 06:00 fewer lights). Tents glow with the fire. The campfire is one `PointLight` (colour (1, 0.45, 0.12), flicker from three sines) and the existing flames and glow plane fade with the day. Exposure (the post pass `uExp`) lifts from 1 to about 2.5 in the dark, moonlight takes part of it back, and it eases over 2.5 s.
- Floor. The floor under the table is tinted by the light and fades into the horizon colour towards its edge (a 4-line patch, uses the same azimuth lobe as the dome) so the edge never shows.
- Post. The tilt-shift blur fades out as the camera comes down (`phi` 0.18 to 0.6) and is off when the camera looks up: it smeared the stars into rings.
- Camera. In clock mode the camera has two extra keys, `ty` (height of the look-at point) and `fov`; the HUD button Sky turns toward the moon (night), the sun (day) or the north, a second press goes home. Minimum `phi` drops from 0.2 to 0.03.
- HUD. A chip: `May 1 · 18:00` and `waxing crescent 17%`; a speed button cycling paused, x1, x4, x16, x60 (x1 is 20 real seconds per game hour, 8 minutes a game day; the research cap for a smooth tide is about x1, so x4 and above are for looking and skipping); a Dusk button (next time the sun goes down through -2.5 degrees); a Sky button.
- API: `__li.clock` with `state()`, `light()`, `setSky(doy, lst, moonAge)`, `setHours`, `setSpeed`, `advance(dt)`, `dusk()`, `sky()`, `tide()`, `litFraction()`, `parts()`, `chip()`, `cam()`.

Hooks in `islands_look.html` (the rest is one self-contained block): the loader line, two constants, `SEA2` implied, camera keys `ty` and `fov` (only when the switch is on), weather `sunFree` and base lights (only when on), `ckBuild()` after the weather attach, `ckSeaPatch` after the weather sea patch, `ckUpdate`/`ckFrame` in the frame loop, the tide line, the chip, the API entry and 4 lines of CSS.

## 4. What is faked

Mean orbits for sun and moon (no nutation, evection or 18.6 year cycle; moon phase to about half a day, moon position to a few degrees); the year is 365 days; one latitude per seed and no longitude (no time zones, no daylight saving); a tide of five constituents with typical amplitudes, no weather surge on the clock alone (macro adds it); the moon and sun are 3 times larger than real and the moon has no libration or real albedo map; the moon's maria do not rotate with the parallactic angle; the sky is a three-colour gradient with a lobe, not Preetham or Hosek-Wilkie; stars are procedural (no catalogue), no planets; the Milky Way is analytic; a night is brighter and bluer than a real one for readability (exposure up to x2.5); windows light and sleep by a hash, not by anyone; cloud tinting under `&weather=` is a ratio of colours; no aurora, noctilucent clouds or bioluminescence (research section 7; not built); no atmospheric refraction flattening; the pace is x180 (8 real minutes a game day).

## 5. Tier costs

Measured in headless Chromium with software GL (SwiftShader), so triangle counts are exact and timing is not representative.

| Tier | Triangles (default page) | With `&clock=1` | What is added |
|---|---|---|---|
| desk, `?q=high` | 88,790 | 89,782 by day (+992), 90,336 at night (+1,546) | sky sphere 960 (not drawn when `&weather=` has its own dome), Milky Way sphere 528 (night only), moon and sun quads 4, window and glow quads 28 |
| handheld, `?q=low` | 60,752 | 61,744 by day (+992), 62,298 at night | the same; the star count drops from 4,500 to 2,200 |
| AR profile, `&clockdome=0` | 88,790 | 88,846 (+56 at night, 28 by day) | window and glow quads only |

Draw calls: the sky adds one (gradient dome), one (stars), one (Milky Way, night only), two (moon and sun quads), two (windows, glows): at most 7 over the default page, one `PointLight` (the campfire, forcing one shader recompile of the land materials when the page is built; no shadow). Per-frame JS: one `clock()` (a few hundred flops), one `light()`, about 14 window colours, no allocation except two small arrays. Shader cost: the sea gains 4 uniforms and a handful of multiplies (no new texture tap); the stars' vertex shader is about 40 ALU per star at 4,500 stars; the Milky Way fragment is about 60 ALU per pixel but only draws when the sun is below -10 degrees; the dome fragment is about 30 ALU. Fill rate is the risk on a tablet: the dome and Milky Way are full-screen (depth test off, so they cost the same under the table). Not measured on a device (gap 1). The page's own budget (under 150,000 triangles at high) holds: the whole stack with `&clock=1` is well under it.

## 6. AR notes

In AR the real sun and room light light the scene; the clock stops being the light source and stays the data source (tide, moon phase, calendar, season). `&clockdome=0` is that profile today: it builds no dome, stars, Milky Way, sun disc, moon or floor tint, leaves the post exposure and the tilt-shift alone (no screen-space effect is added in any mode), and keeps what is safe in AR: the window glows, the campfire light, the tide and the clock HUD. What is left to wire when the AR path exists: take the main light direction, intensity and colour from the WebXR light estimate (the sun-or-moon lamp then becomes a fallback only), feed `light().hemiSky` as a tint on the model only, keep the night state as colour grading of the model (never darken the room), draw no sky, put the shadows on a shadow-catcher plane, scale shadows short and soft for a 1:200 table, and keep emissive glows bright whatever the estimate says. `sky_clock.js` has no DOM and runs unchanged in any of these paths. Light estimation device support on tablets: UNVERIFIED.

## 7. Lab link idea (doc only, not deployed)

A Lab card "The sky clock": `islands_look.html?clock=1&seed=1122&cd=121&ch=18&cm=4` with a one-line caption ("one clock: sun, moon, stars, tide and window lights; try Dusk and Sky"), a second link with `&weather=auto&clock=1` (fog at dusk) and a third with `&clock=1&macro=1&mh=100` (storm season, one clock for both). Not added to `lab_index.html`.

## 8. Tests

- `node tests/sky-clock-test.js`: 60 checks, 0.5 s: the sun and day-length tables above, the moon period over ten years, spring and neap, the macro_sea.js agreement, determinism in any order, accumulators and speed changes, stars, twilight stages and the continuity of the palette. All pass.
- `NODE_PATH=$(npm root -g) node tests/clock-page-test.js`: 50 checks, all pass (about 10 minutes under software GL). Default page hash `8d962c0c`, 88,790 triangles, no `__li.clock`, no `sky_clock.js` script; `&clock=1` keeps the hash and adds 992 triangles; 0 console errors for default, `?q=low` and `?post=0` with `&clock=1` at dawn, noon, dusk and night; the speed, chip, Dusk and Sky buttons; `&clockdome=0`; `&clock=1&macro=1` (one hour, one tide); `&clock=1&weather=fog`; `&world=153&life=1&clock=1` and `&world=99&clock=1&post=0`.
- `NODE_PATH=$(npm root -g) node tests/clock-render.js`: writes the pictures. Look at every one; the iterations are in section 9.

## 9. Pictures and what I changed after looking

`shots/clock-sheet.png` is a 3 x 4 sheet: 1 dawn, 2 noon, 3 golden hour, 4 dusk, 5 night with stars, 6 moonlit sea (10 day moon), 7 full moon, 8 new moon (only the fire and windows), 9 midsummer midnight (never dark), 10 midwinter noon, 11 a night with window glows, 12 foggy dusk. `shots/clock-1.png` (golden hour), `clock-2.png` (dusk), `clock-3.png` (moonlit sea) and `clock-4.png` (window glows) are the same views at 1200 x 800. Iterations, each from looking at the picture:
1. Stars were a handful of snowflake shapes and almost nothing else. Cause 1: the tilt-shift blur of the post pass smears points into a ring of taps; it now fades out as the camera comes down. Cause 2: GLSL `smoothstep` with reversed edges (undefined by the spec; SwiftShader returned steps); all night-sky shaders use `1 - smoothstep(lo, hi, x)`. Cause 3: only 6 percent of the power-law stars were above magnitude 5; slope 0.5, a few dozen bright landmarks, bigger and brighter points, 4,500 stars.
2. The floor under the table went black when I scaled it to hide its edge (its texture is a dark centre with a ring; scaling pushed the dark centre over the view). Back to scale 1, and the floor now fades into the horizon colour with the dome's own azimuth lobe.
3. The sea glittered at a new moon: the sea shader's glitter colour was a constant, not `uSunCol`. Patched to a multiplier from the lamp (sun, moon, or none).
4. Window pools were orange plates the size of the houses; shrunk to a third and a quarter of the intensity; windows light at different dusks and sleep from 22:00.
5. The moon was a white blob with a black bite (the exposure of the post pass multiplied it, and the dark part was black); the disc is now exposure-compensated, maria show, the dark part takes the sky colour behind it.
6. The Milky Way as 8,000 sprites showed as soft discs and as 2,000 sprites as blobs; it is a per-pixel band, first too bright (a searchlight), then at 0.026 of that.
7. Noon was washed white and cyan; the noon sun intensity went from 3.1 to 2.45.

Still weak in the pictures: the table's wooden side is nearly black at night (only hemisphere light on it); the noon sea is more saturated than the default look; the foggy dusk has a faint moire in the far sea; tile 6's glitter reads as speckle rather than a path because the camera is low and the sea normal map is busy.

## 10. Honest gaps, ranked

1. Not measured on a device. Everything here is software GL; the cost of 4,500 star points, the full-sphere Milky Way shader (about 60 ALU per sky pixel at night) and the moon quad on an iPad is unknown. The Milky Way draws only when the sun is below -10 degrees.
2. The default camera never sees the sky: the stars, moon and sun disc show only from the Sky button or a low camera. In the table view the clock shows in the light, the sea, the windows, the floor and the HUD. A real game camera for the sky is a design question.
3. The moon is simple: three times real size, six blobs for maria, no libration, no rotation with the parallactic angle, a mean orbit. A first-quarter moon is lit on the right in the northern sky, which is right here; below the equator the sky is flipped and nothing here handles it (latitude is north only).
4. Cloud lighting under `&weather=` at dusk and night is a colour ratio, not a model: clouds lit from below by a set sun get a flat orange, not the sunset sequence.
5. Window lights are a hash, not a schedule tied to the people; no light on the water from windows; no light spill on walls.
6. Not built from the research: aurora, noctilucent clouds, bioluminescence, planets, an Earth-shadow arch and Belt of Venus (only the anti-sun horizon colour carries a hint).
7. Tide stream and flotsam: in clock-only mode `&flow=1` keeps its own tide; only with `&macro=1` does the flow follow the clock hour. The clock tide moves the sea level and the slider.
8. The gradient sky is three colours and a lobe; near-horizon haze and a sun-side glow that follows the sun's size are rough.
9. Sun and moon discs are exaggerated (x3); the low sun is not flattened by refraction.
10. The day-of-year epoch of the clock-only page (1 May) differs from the macro's (mid October); the sun is therefore at a different place for the same `mh` than for `ch`.
