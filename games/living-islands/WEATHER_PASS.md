# Weather pass (`?weather=<state>`)

Clouds, sky, shadows, rain, fog, storms, a wet look and a seeded weather schedule for `islands_look.html`. Research: `research/WEATHER_AND_SKY.md` (climate, fronts, Beaufort, schedule) and `research/CLOUD_PHYSICS_FOR_VISUALS.md` (how clouds should look). Code: `weather.js` (loaded only with the switch, like `seabed.js`), 8 small hooks in `islands_look.html`. Test: `tests/weather-test.js`. Pictures: `shots/weather-*.png` (`tests/weather-render.js`).

## 1 How to use

| URL | Result |
|---|---|
| none | unchanged: world hash `8d962c0c`, 88,790 triangles, weather.js not even fetched |
| `?weather=clear` / `fair` / `overcast` / `showers` / `rain` / `fog` / `storm` / `goldenhour` | that state, fixed; implies the `?sea=2` look |
| `?weather=auto` | follows the seeded schedule; one game hour = 20 real seconds (`&wsec=` changes it, `&wh=` sets the start hour) |
| `&wt=<seconds>` | freeze the weather clock (shots, tests); `&sun=`, `&az=` override the state's sun elevation |
| UI chip (top bar) | cycles `clear > fair > ... > goldenhour > auto`; a manual tap blends over 3.5 s |

Works with `?sea=2`, `?flow=1`, `?seabed=1`, `?pass=landing`, `?q=low`, `?post=0` (tested). Console: `__li.weather()` returns the live state for other systems (section 6); `__li.weatherRT.set('storm')` changes state.

## 2 Design

One state table (`STATE_TABLE` in `weather.js`) drives everything; a state is a set of numbers. Changing state blends all numbers (3.5 s by hand, 0.4 game hours in auto), so nothing pops. Pure code (node-testable): the table, `params(name)`, `lerpParams`, `schedule(seed, hours)`, `at(seed, hour)`, `flash(seed, t, rate)`, `beaufort`, `seaOf`. Browser code: sky dome, cloud puffs, cloud deck, rain, light and fog application, chip.

| Part | How | Cost |
|---|---|---|
| Sky dome | inverted sphere (528 triangles) that follows the camera; gradient, sun glow, far clouds on a plane along the view ray (so they shrink and flatten toward the horizon), pink anti-solar band at golden hour; drawn first, no depth | 4 texture taps, only where the sky shows |
| Cumulus | 32 clouds x 5 instanced camera-facing quads (320 triangles at most), one shared flat base height, flat dark bottom, sphere-lit tops, rim light on the sunward edge, 60/30/10 percent crisp/mature/ragged edges, sizes many small few large; sorted far to near each frame | 3 taps per pixel of a puff |
| Cloud deck | one plane (2 triangles) a little above the islands, translucent noise sheet with a second tap for sun-side lighting, fades near the camera; deck height drops to 12 to 14 m in rain, fog and storm so peaks can sink into it | 5 taps |
| Cloud shadows | the same puff discs (a 32-entry uniform array) and the deck noise, looked up at the ground point moved along the sun ray by `base height / sun elevation`; multiplied into the sun term only of the sea shader and of the land material (terrain, props, sea bed); shadowed sea is tinted bluer | 2 taps and a 32-step loop in the sea shader, 2 taps and the loop on land |
| Shadow drift | puff positions advance `along = integral of 0.5 x wind dt` in the direction of the same `uWind` vector the sea shader uses for its chop and lee slicks, so shadows, clouds and waves share one wind | none |
| Sea | `uWind`, chop amplitude (steepness of all trains and the noise normals), swell (the 19 m train), white caps (count and threshold), glitter, sun term, ambient, saturation, sky reflection colours, rain rings (only close up), flash, fog, all from uniforms | +4 taps and about 40 ALU lines on the sea shader |
| Fog | `scene.fog = FogExp2` for lit materials; the same exp2 in the sea, dome, deck and puffs; fog colour is the sky horizon colour; the post shader adds a haze lift toward the top of the frame | none |
| Light | sun intensity and colour, sun elevation, hemisphere intensity, colour and desaturation, all scaled from the page's own values per state | none |
| Rain | one draw call, up to 1,800 instanced stretched quads (3,600 triangles) in a box that follows the look target; fall, wrap and downwind slant computed in the vertex shader; slant = 0.45 x wind / fall speed (about 18 degrees in rain, 32 in storm) | 1 draw call |
| Lightning | seeded flashes (storm only): a scalar added to hemisphere light, sky, deck and puffs, and to the sea and land fill | none |
| Wet look | land darkened 38 percent where it is above the tide and the state is wet; storm and rain 1.0, showers 0.55 | 0 taps |
| Grade | the existing post shader gets saturation, contrast, a cool tint and haze uniforms; no extra pass | 0 |

## 3 States (all numbers TUNING; sources in the research notes)

| State | Wind m/s (Beaufort) | Sea Hs m | Chop x | Cover (puffs / deck) | Sun x, elev | Fog exp2 | Rain | Glitter | Notes |
|---|---|---|---|---|---|---|---|---|---|
| clear | 3.5 (F3) | 0.14 | 0.5 | 6 percent / 0 | 1.05, 36 | 0.00025 | 0 | 1.0 | sharp shadows, few clouds |
| fair | 6.5 (F4) | 0.49 | 1.0 (the page's current sea) | 62 percent / 0 | 1.0, 34 | 0.0004 | 0 | 1.0 | cumulus and moving shadows; one small island cumulus on 10 percent of seeds |
| overcast | 7 (F4) | 0.57 | 1.08 | 0 / 95 percent, op 0.35 | 0.26, 30 | 0.0010 | 0 | 0 | grey-blue, sea desaturated to 0.42, mottled deck shade |
| showers | 9.5 (F5) | 1.0 | 1.5 | 40 / 35 percent | 0.62, 28 | 0.0013 | 0.45 (2 mm/h) | 0.35 | dark-based puffs, patchy sun |
| rain | 11 (F6) | 1.4 | 1.8 | 0 / 100 percent | 0.15, 24 | 0.0016 | 0.75 (4.5 mm/h) | 0 | wet 1.0, deck at 12 m |
| fog | 2 (F2) | 0.05 | 0.3 | none | 0.3, 18 | 0.0058 | 0 | 0 | visibility 400 m, islands stay readable |
| storm | 21 (F9) | 5.1 | 2.3 | 0 / 100 percent, dark | 0.1, 20 | 0.0032 | 1.0 (9 mm/h) | 0 | caps 1.4, swell 2.6, lightning, surge 0.8 m |
| goldenhour | 3 (F2) | 0.1 | 0.5 | 22 percent / 0 | 1.3, 7 | 0.0008 | 0 | 1.8 | orange sun, blue fill, orange cloud undersides, pink band opposite the sun |

## 4 Schedule (`?weather=auto`)

Seeded Markov chain over the 8 states (weights in `weather.js`, taken from the front sequence in the research note: overcast leads to rain, rain to showers or storm, showers to fair, golden hour only after clear or fair). Durations 0.8 to 10 game hours by state. Wind angle veers clockwise through fronts (+25 degrees into rain, +55 degrees from rain to showers) and backs 15 degrees ahead of a warm front. `at(seed, hour)` is a pure function; so is `flash(seed, second, rate)`. Storm segments carry an index `(seed, storm_index)` that the sediment note asks for.

## 5 Cost (measured; software GL, shared CPU, so fps numbers mean little)

| Item | Number |
|---|---|
| Triangles, landing + flow + seabed | about 144.4k baseline; with weather clear 145,009, fair 145,149, overcast 144,991, rain 147,691, fog 144,989, storm 148,591, goldenhour 145,049. All under 150k with no trim |
| Added meshes | dome 528, deck 2, puffs up to 320, rain up to 3,600 (only in rain states, scaled by intensity and halved in Low) |
| Draw calls | +4 (dome, deck, puffs, rain), no extra post pass; `?post=0` has none either (dome, deck, puffs, rain, sea tonemap themselves) |
| Sea shader taps | +4 (cloud noise for the deck term, sky, rings do not use textures) |
| Land shader | +2 taps and the 32-step puff loop on terrain, props and bed |
| Texture | one 256 x 256 RGBA noise (generated in 60 ms) |
| Uniform vectors | one 32 x vec4 array shared by sea and land |

## 6 How later systems read it

`__li.weather()` returns: `state`, `from`, `to`, `k` (blend), `hour` (auto), `t`, `windMs`, `windAngle`, `windDir` (unit x,z the sea shader and shadows use), `beaufort`, `cloudSpeed`, `cloudOffset`, `cover`, `deck`, `rain`, `rainMm`, `fogDensity`, `visibility`, `sunScale`, `sunElev`, `wet`, `seaHs`, `seaTp`, `seaChop`, `swell`, `caps`, `glitter`, `surge` (m), `flash`, `storm` (storm index or -1), `sailOk` (row, sail, work boat). Sediment storm events: use `seaHs`, `surge`, `storm`. Wildlife: `windMs`, `rain`, `visibility`, `storm`. Boats and machines: `sailOk`, `beaufort`. Pure code in node: `LI_WEATHER.at(seed, hour)`, `.schedule`, `.params`.

## 7 AR rules

In AR the camera image is the sky and the room. Do not draw the dome, the deck, the post haze or the fog on anything but our own model. Keep: light scaling (multiply the WebXR light estimate by `sunScale` and `hemiScale`, or use them alone when no estimate exists), cloud shadows as a multiply on our own sea and ground shaders, a few puffs scaled to the model, rain around the model, wet darkening. Nothing here needs a screen-space pass except the optional grade and haze uniforms, which are off in `?post=0`.

## 8 Rules from `CLOUD_PHYSICS_FOR_VISUALS.md`: applied and not

| Rule | Status |
|---|---|
| 1 one flat base, dark and blue; tops billowy | applied: one base height, flat bottom cut, base darkened and blued, lumpy noise-warped tops |
| 2 smaller and flatter toward the horizon | applied on the dome (clouds on a plane along the view ray); the puffs are in the diorama volume, not near the horizon |
| 3 size mix, crisp and ragged, spacing | applied: many small few large; 60/30/10 percent crisp/mature/ragged; spacing is set by 32 slots in a 210 m box, not by 2 to 4 widths |
| 4 shadow = base shape offset by `h / tan(el)`, moving at cloud speed, softer, bluer | applied (offset, speed, softness, blue tint); the shadow is a disc, not the exact base outline |
| 5 nothing pure white, rim light | applied: cloud top about 0.95 after tone mapping, rim on the sunward edge |
| 6 pale hazy horizon, distant objects lighter and bluer | partly: exp2 fog in the horizon colour, haze lift in post, pale dome horizon; no height fog, and the page's own table and floor still show at the frame edge |
| 7 overcast no hard shadows and no glint; rain slants downwind under a dark base; golden orange with blue fill and a pink band | applied; the pink band shows only on the dome (low views) |
| 8 tiny islands make no cloud of their own | applied: only one rare small downwind cumulus on 10 percent of seeds in fair weather; deck drops to 12 to 14 m in rain, fog and storm so the highest island sinks into it |
| streets, altocumulus, lenticulars, virga | not done |
| `CLOUD_ATLAS.md` high layer | partly: cirrus fibres on the dome only (noise stretched about 10:1, direction 45 degrees off the wind, clear 0.8, fair 0.3, golden hour 0.7 and tinted gold so high cloud keeps the colour longest); no straight lines or contrails. Left for a cloud-library pass: cirrostratus veil and 22 degree halo, altostratus with a blurred sun disc, altocumulus rows and castellanus, separate scroll rates per layer, cumulonimbus anvils, scud under storm cloud |

## 9 What is faked

Clouds are billboards and a noise sheet, not volumes. The cloud height (20 m) is a diorama number. Shadows are discs. The sea is still a flat plane with normal-map waves: storm swell changes shading, not height, and boats do not yet pitch more. Rain does not splash on land and rings on the sea appear only in close views. Lightning is a flash, no bolt. Wet land is a darkening, no gloss. Fog has no height falloff. Wind direction is one global angle (the sea shader still adds its own slow regional drift).

## 10 Ranked gaps

1. Cumulus still look like clean marshmallows from above; they need cauliflower noise geometry (3 to 5 billboards per cloud is too few) and a soft contact with their own shadow.
2. Shadows are discs of the puff's radius, so the pattern of light and dark on the sea is weaker than in a real sky; an offscreen cloud-base map would fix this.
3. In the default high camera there is no horizon, so the dome, the horizon haze and the pink band are never seen; the shots use the page's own high view.
4. Boats, gulls and the settlers do not react (no `sailOk` use, no shelter, no pitching).
5. Rain needs splashes on land and the camp fire should hiss; fog needs a height falloff.
6. Cloud shadows do not reach the pebbles, tent, boats and people (they use other materials).
7. In the sea shader `rip()` waves travel against `uWind` while chop and lee slicks travel with it (existing quirk, not touched); clouds follow the lee and chop direction.
8. Software-GL runs here were slow (minutes per page under load), so the iPad frame rate is unmeasured.
