# Weather and sky for a cool temperate Atlantic island

Plain-words research for the Living Islands weather pass (see `../WEATHER_PASS.md`). Tags: VERIFIED = read in a source this session; PLAUSIBLE = standard meteorology from memory, not read here; UNVERIFIED = a design guess or a number I could not check.

Research limits, said plainly. This was a short search session. `en.wikipedia.org` pages were not fetched (only search extracts came back), `www.wpc.ncep.noaa.gov` did not resolve (not on the session's allowed hosts), and the Met Office Beaufort page showed only a search snippet, not its table. So the Beaufort wave heights below are mostly PLAUSIBLE; two rows are confirmed by a search extract of the NOAA table. Month-by-month cloud-cover percentages were not found.

## 1. Sources and licences

| Source | Used for | Licence | Tag |
|---|---|---|---|
| Met Office, Coastal fog https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/fog/coastal-fog | haar / sea fret by warm air over cold sea | Crown copyright, facts only, no text copied (OGL v3 for most Met Office pages) | VERIFIED |
| Met Office, Weather fronts https://weather.metoffice.gov.uk/learn-about/weather/atmosphere/weather-fronts and blog https://www.metoffice.gov.uk/blog/2025/what-are-weather-fronts | front sequence, wind veer | same | VERIFIED (extract) |
| Met Office Beaufort page https://weather.metoffice.gov.uk/guides/coast-and-sea/beaufort-scale | table exists with wave height and sea state, lag between wind and sea | same | VERIFIED (that it exists, numbers not read) |
| NOAA WPC Beaufort table https://www.wpc.ncep.noaa.gov/html/beaufortbody.html | force 5 about 2 to 2.5 m, force 8 about 5.5 to 7.5 m (search extract only) | US government work, public domain | VERIFIED (2 rows) |
| W3C WebXR Lighting Estimation https://www.w3.org/TR/webxr-lighting-estimation-1 and MDN XRLightProbe | AR light estimate: spherical harmonics, main light direction and intensity; fallback direction straight up | W3C document licence; MDN CC-BY-SA | VERIFIED |
| three.js forum and Codrops cloud threads https://discourse.threejs.org/t/efficient-volumetric-clouds/66067 https://tympanus.net/codrops/2020/01/28/how-to-create-procedural-clouds-using-three-js-sprites/ | sprite clouds with noise-warped edges; scrolling noise on a sky dome; baked FBM | forum posts and tutorial text: ideas only, no code copied | VERIFIED (that they exist) |
| Met Office radar notes (search extract) | rain of 4 mm/h or more is "heavy" | Crown copyright | VERIFIED |
| Project notes `SEDIMENT_PHYSICS.md`, `WILDLIFE.md`, `SEA_PASS.md`, `FLOW_PASS.md` | storm event design, wildlife and storms, our sea shader | project | n/a |

## 2. Climate in one paragraph

Temperate oceanic (Koppen Cfb): mild, wet, windy in the west, and the Atlantic sets the weather. VERIFIED (search extract). Stratocumulus is among the commonest clouds over the British Isles, and thick layers give drizzle on windward coasts. VERIFIED (Met Office and colweather extracts). Cumulus grows big only when the air is unstable. VERIFIED (extract).

## 3. Cloud types and cover by season (game numbers)

| Cloud | What it looks like | Height | When | Game use | Tag |
|---|---|---|---|---|---|
| Fair-weather cumulus (Cu hum/med) | cotton puffs with flat grey-blue bases, lit tops, 20 to 50 percent cover | base 0.5 to 1.5 km, grows by day over warm land, weaker over cool sea | spring to summer afternoons, after a cold front | state `fair`: 25 to 45 percent cover of puffs that cast shadows | PLAUSIBLE |
| Stratocumulus deck | lumpy grey-white sheet with gaps, the commonest sky | 0.5 to 2 km | all year, most in winter | state `overcast` (cover 85 to 100 percent), `showers` with gaps | VERIFIED (commonest), PLAUSIBLE (rest) |
| Altostratus | thin grey veil, sun a pale disc | 2 to 6 km | ahead of a warm front | the first sign of a front in the schedule: thin veil, shadows soften | PLAUSIBLE |
| Nimbostratus | thick dark rain deck | 0.5 to 4 km | on the warm front | `rain`: dark deck, no sun, no cloud shadows | PLAUSIBLE |
| Cumulonimbus | tall dark towers, anvil, hail, squall | base 0.6 to 1 km | on and behind a cold front | `showers` and `storm` | VERIFIED (cold front is Cb with heavy rain, maybe hail and thunder) |
| Cirrus | high hairs | above 6 km | ahead of a front | decor on the dome only | PLAUSIBLE |

Seasonal tilt (PLAUSIBLE, no percentages found): winter is greyer and windier (more `overcast`, `rain`, `storm`), spring has the most `fog` over a cold sea, summer has the most `fair` and `golden` hours, autumn is the stormiest after the sea is warm. Our schedule weights follow this.

## 4. Fronts: the sequence a player should see

| Step | Sky | Wind | Rain | Typical time | Tag |
|---|---|---|---|---|---|
| 1 ahead of warm front | cirrus, then altostratus, sun dims, pressure falls | backs and freshens | none | 6 to 12 h | VERIFIED (cloud thickens as front nears, pressure falls) |
| 2 warm front | nimbostratus, grey, low | steady, then veers (clockwise, e.g. S-SW to W-SW) at the front | steady rain, heaviest on the front | 3 to 6 h | VERIFIED (veer, rain heaviest on the front) |
| 3 warm sector | low grey stratocumulus, drizzle, mild, mist on hills; fog on a cold sea | steady W-SW | drizzle | 3 to 8 h | PLAUSIBLE |
| 4 cold front | Cb line, dark wall, brief heavy rain, maybe hail | gusts, sharp veer to W or NW, pressure turns | heavy for a short time | 0.5 to 2 h | VERIFIED |
| 5 behind it | clearing, then cumulus and showers | NW, strong and gusty, cooler | showers | 6 to 24 h | VERIFIED (showers follow) |
| squall line | narrow dark line with a gust front just before it | jump of 5 to 10 m/s for minutes | burst | 10 to 30 min | PLAUSIBLE |

Cold fronts move faster than warm fronts (typically about 27 mph, 12 m/s, one source). VERIFIED (extract). Wind turns clockwise at both fronts. VERIFIED. Our model: a full sequence in about 24 game hours.

## 5. Wind bands, Beaufort and the sea

Beaufort speed bands are standard (m/s at 10 m): F1 0.5-1.5, F2 1.6-3.3, F3 3.4-5.4, F4 5.5-7.9, F5 8.0-10.7, F6 10.8-13.8, F7 13.9-17.1, F8 17.2-20.7, F9 20.8-24.4, F10 24.5-28.4. VERIFIED (long-standing scale; table not re-read this session). The Met Office notes the sea lags the wind. VERIFIED.

| Force | Wind m/s | Sea look | Hs (m) | Peak period (s) | Tag |
|---|---|---|---|---|---|
| 1 to 2 | 0.5 to 3.3 | ripples, glassy patches, no caps | 0.1 to 0.3 | 2 to 4 | PLAUSIBLE |
| 3 | 3.4 to 5.4 | large wavelets, a few scattered caps | 0.5 to 0.7 | 3 to 5 | PLAUSIBLE |
| 4 | 5.5 to 7.9 | small waves, frequent caps | 1.0 | 4 to 6 | PLAUSIBLE |
| 5 | 8.0 to 10.7 | moderate waves, many caps, spray | 2.0 to 2.5 | 5 to 7 | VERIFIED (NOAA extract 2 to 2.5 m) |
| 6 | 10.8 to 13.8 | large waves, white foam everywhere | 3.0 | 6 to 8 | PLAUSIBLE |
| 7 | 13.9 to 17.1 | sea heaps up, foam in streaks | 4.0 | 7 to 9 | PLAUSIBLE |
| 8 | 17.2 to 20.7 | high waves, long foam streaks, spindrift | 5.5 to 7.5 | 8 to 11 | VERIFIED (NOAA extract) |
| 9 to 10 | 20.8 to 28.4 | very high, white sea, visibility poor | 7 to 9+ | 10 to 13 | PLAUSIBLE |

Rule of thumb for a fully grown open sea: `Hs ~ 0.021 U^2` (U in m/s, Hs in m), peak period `Tp ~ 0.55 to 0.7 U`. PLAUSIBLE (Pierson-Moskowitz form, from memory). A small island sea is fetch-limited, so real Hs is below this (a 20 km fetch at 10 m/s gives roughly 1 m, PLAUSIBLE). Link to our shader: the sea normal map is a sum of wave trains of 19, 9.3, 4.7, 2.45 m and shorter (`SEA_PASS.md`). Chop (the short trains and the noise normal) follows local wind; swell (the 19 m train) follows distant storms and lasts hours after the wind drops. Game map: `chop = clamp((U/6.5)^1.1, 0.3, 2.3)` (fair weather is 1.0, the current look), `swell` rises with the storm state and decays slowly. UNVERIFIED (tuning).

## 6. Fog, haar, rain, visibility

| Item | Fact | Game number | Tag |
|---|---|---|---|
| Sea fog / haar | warm moist air blown over a much colder sea cools to its dew point and condenses (advection fog) | state `fog` needs light wind (1 to 4 m/s), onshore | VERIFIED |
| Season | mostly spring and summer, when the sea is still cold | `fog` weight highest in spring and early summer | VERIFIED |
| Inland | onshore wind carries it in; warm land burns it off, cool land lets it linger | fog lifts after 3 to 7 game hours, or when the wind picks up above 6 m/s | VERIFIED (qualitative) |
| Visibility | fog is under 1 km, mist 1 to 5 km, haze above (convention) | fog exp2 density 0.0055 (50 percent at about 150 m on the 200 m map); rain 0.002; clear 0.0003 | PLAUSIBLE (convention), UNVERIFIED (map scaling) |
| Rain rate | 4 mm/h or more is heavy (Met Office radar note); light under 0.5, moderate 0.5 to 4 (convention) | rain intensity 0.35 drizzle, 0.65 rain, 1.0 heavy; streak count scales with it | VERIFIED (4 mm/h), PLAUSIBLE (bands) |
| Rain look | visibility 2 to 5 km, grey, wet surfaces darker, sea surface stippled with dimples, no glitter | `rain`: sun x0.18, glitter 0, wet 1.0 | PLAUSIBLE |

## 7. Light

| Moment | Sun elevation | Look | Tag |
|---|---|---|---|
| High summer noon at 55 N | about 58 degrees | hard white, short shadows | PLAUSIBLE |
| Golden hour | 0 to 10 degrees | orange sun, long shadows, blue-purple shade, strong glitter path | PLAUSIBLE |
| Overcast | any | flat light, no shadows, low contrast, desaturated, sea grey-green, no glitter | PLAUSIBLE |
| Breaks in cloud | any | patches of sun moving over the sea, crepuscular rays when cloud edge and low sun line up | PLAUSIBLE |
| Storm | any | dark, green-grey, sudden flashes | PLAUSIBLE |

Cloud shadows travel at the wind speed at cloud level, typically 5 to 15 m/s. PLAUSIBLE (brief says the same; wind at 1 km is about 1.5 to 2 times 10 m wind). For a 200 m diorama a real speed crosses in 20 s. Game choice: shadow speed = `0.5 x wind` so a shadow crosses the table in about a minute. UNVERIFIED (tuning).

## 8. Storm surge, waves and the sediment events

`SEDIMENT_PHYSICS.md` makes storms seeded EVENTS, `Hs` 2.5 to 4 times calm, 20 to 40 play seconds, bars stripped and rebuilt (line 109). The weather schedule is the natural owner of that timeline: a `storm` segment IS the storm event. A surge adds 0.3 to 1 m to the tide for a few hours when low pressure and onshore wind coincide (PLAUSIBLE; UK surges are commonly under 1 m). Hand-off: `__li.weather().seaHs` and `surge` (m) are read by the sediment step; storm segments carry an index so `(seed, storm_index)` is the same key the sediment note asks for.

## 9. Wildlife and boats

| Weather | Seabirds | Seals | Boats | Tag |
|---|---|---|---|---|
| clear / fair | feeding, gannets diving, auks on ledges | hauled out at low water | sail and row | PLAUSIBLE |
| fog | colonies noisy, few flights, birds sit | haul-out continues | do not go out; sound signals | PLAUSIBLE |
| rain | sheltering, fewer gulls up | hauled out, indifferent | row boats stay in | PLAUSIBLE |
| storm | birds ashore or far out, chick loss on low ledges (WILDLIFE.md: PLAUSIBLE); sea wrecks auks | pups at risk on low rocks (WILDLIFE.md) | all boats in; moored boats snub and roll; beached boats need hauling above wrack | PLAUSIBLE |

Safe-to-sail rule (game): row boat up to F3, small sail up to F5, work boat up to F7 (UNVERIFIED, TUNING). Exposed in `__li.weather().sailOk`.

## 10. A seedable weather schedule

States: `clear, fair, overcast, showers, rain, fog, storm, goldenhour`. Each segment has a state, a start (game hours), a duration, and a wind direction (degrees, compass, clockwise). A seeded Markov chain picks the next state. Rows are the current state; numbers are weights (UNVERIFIED, TUNING, shaped by the front sequence above).

| from \ to | clear | fair | overcast | showers | rain | fog | storm | goldenhour |
|---|---|---|---|---|---|---|---|---|
| clear | 1 | 5 | 2 | 0 | 0 | 1 | 0 | 2 |
| fair | 2 | 3 | 4 | 2 | 0 | 1 | 0 | 2 |
| overcast | 0 | 1 | 2 | 1 | 5 | 1 | 0 | 0 |
| rain | 0 | 0 | 2 | 3 | 1 | 0 | 2 | 0 |
| showers | 0 | 4 | 2 | 1 | 1 | 0 | 1 | 1 |
| fog | 1 | 3 | 3 | 0 | 0 | 1 | 0 | 1 |
| storm | 0 | 1 | 1 | 5 | 2 | 0 | 0 | 0 |
| goldenhour | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |

Durations in game hours: clear 3-8, fair 4-10, overcast 3-7, showers 2-4, rain 3-6, fog 3-7, storm 2-5, goldenhour 0.8-1.2. Wind veer on entering a state: overcast from fair backs 15 deg (ahead of the front), rain veers +25 deg (warm front), showers after rain veers +55 deg (cold front), storm adds +10, others +/-8 random. Wind speed per state is the state value plus a seeded gust factor. Between states the numbers blend over 8 real seconds (about 0.4 game hours), so there is never a pop. Time compression: 1 game hour = 20 real seconds by default (`?wsec=`); a front sequence of about 24 game hours is 8 real minutes. Deterministic: the whole timeline is a pure function of `(seed, hour)`; lightning is a pure function of `(seed, second)`. All design, UNVERIFIED.

## 11. Cheap real-time techniques for three.js r128, no build, iPad

| Need | Technique | Cost | Tag |
|---|---|---|---|
| Sky | inverted sphere (about 800 triangles) following the camera, gradient plus sun glow plus noise clouds on a plane projected from the view ray; `depthWrite` off, drawn first | one fragment shader, 2 taps | VERIFIED (forum: noise offset by a time uniform on a sky dome) |
| Cloud puffs | instanced camera-facing quads, noise-warped edges, fake sphere lighting from the sun in view space; sort far to near | 120 quads = 240 triangles | VERIFIED (Codrops: sprites with fbm edges, "not volumetric") |
| Cloud deck | one big plane at height, 2 to 3 noise taps, threshold by cover, fake lit edges, fades near the camera | 2 triangles | PLAUSIBLE |
| Cloud shadows | the same cloud shapes evaluated in the lighting: puff discs (uniform array) and deck noise, sampled at the ground point shifted along the sun ray `p + L.xz * h / L.y`, multiplied into the sunlit term only | 1 to 3 taps plus a 24-iteration loop | PLAUSIBLE |
| Rain | instanced stretched quads in a camera-relative box, fall and wrap computed in the vertex shader from a time uniform, wind slant, alpha by distance; sea gets hashed expanding rings | 1 draw call | PLAUSIBLE |
| Fog | `scene.fog = FogExp2` for lit materials, the same exp2 formula in the custom sea shader, fog colour equal to the sky horizon colour | no cost | PLAUSIBLE |
| Wet look | darken and slightly saturate diffuse in the existing material patch | 0 taps | PLAUSIBLE |
| Lightning | one scalar flash, seeded, added to the hemisphere light, the sky and the deck | 0 | PLAUSIBLE |
| Grading | uniforms in the existing post shader (saturation, contrast), no extra pass | 0 | PLAUSIBLE |

## 12. Augmented reality (what I know)

In AR the camera image is the sky. So: no sky dome, no screen-space post (the browser composites the camera under our canvas; we cannot blur or fog pixels we do not own), no fog on the real world. What still works: (1) scale the scene lights by the weather state, and where the device gives a light estimate (WebXR `XRLightEstimate`: spherical harmonics, main light direction, intensity, VERIFIED) multiply the weather scale on top of it, since the real light is already cloudy or sunny; (2) cloud shadows as a scrolling multiply on our own ground and sea shaders (our content only, drawn small on the table); (3) a handful of billboard puffs above the model, scaled to the model; (4) rain particles around the model, not around the room; (5) wet-darkening of our own materials; (6) fog only as a fade on our model edges, not the room. The light-estimate API is experimental and not on every browser (MDN: limited availability, VERIFIED); when it is missing the spec's default light points straight up. VERIFIED. I did not find an iOS Safari WebXR AR path this session (UNVERIFIED), so the pass stays screen-based and keeps these rules.

## 13. What the build takes from this

State table with numeric parameters; the Markov schedule above; wind and cloud direction as one number shared with the sea shader; cloud shapes shared between billboards and shadows; light scaling only; fog colour equal to the horizon colour; post grading by uniform only. Gaps are listed in `../WEATHER_PASS.md`.
