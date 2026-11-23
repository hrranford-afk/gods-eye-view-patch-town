# Light, fog and the lighthouse (research note, 23 Nov 2026)

Gate note under `RESEARCH_FIRST.md`. Covers the "Light, fog and the lighthouse" idea in `EVOLUTION_TREE.md`. Reads with `WEATHER_AND_SKY.md` (fog and visibility), `CLOUD_PHYSICS_FOR_VISUALS.md` (optics), `SKY_CLOCK.md` (night, fire and lantern light), `MODES_AR_DESKTOP_HANDHELD.md` (tiers, AR), `MACRO_SEA.md` (keyed arrivals), `FLOW_TYPES.md` (tide, races, reefs), `weather.js` (the 8 states).

How the sources were handled: this session had search snippets only (full pages were not fetched, and the cloud blocks many sites). Every number carries a tag:
- VERIFIED: a search result stated it, or it is arithmetic/definition. The URL is given.
- PLAUSIBLE: standard physics or practice I know, not seen in a source this session.
- UNVERIFIED: remembered, shaky, or sources disagree.
- TUNING: a game number with no real measurement.
- COMPUTED: my own arithmetic from the tagged inputs (script run in this session, results in section 2.4).
The note keeps real place names out; the game code and assets must too.

## 0. One-page summary (what the game needs)
1. A light is seen when the sky path to it is clear in two senses: geometry (the earth's curve hides it beyond the geographic range) and brightness (the light must still reach the eye above a threshold after the air has dimmed it: luminous range). The seen distance is the smaller of the two. COMPUTED from VERIFIED definitions.
2. Geographic range in nautical miles is about 2.08 x (sqrt(light height m) + sqrt(eye height m)). Bright lights are limited by this on clear nights; weak lights and everything in fog are limited by the air.
3. At night a light is seen much further than daytime visibility in fog: dense fog of 200 m visibility still shows a strong lens light at about 0.5 nm (900 m) and a small fire at about 0.3 nm (550 m). COMPUTED (Allard, T per metre from 5 percent contrast at visibility V).
4. Lights identify themselves by pattern (flash character): fixed, flashing, long flash, occulting, isophase, quick, group flashing, Morse, with a period in seconds. The pattern is the light's name. VERIFIED (names), PLAUSIBLE (typical periods).
5. A lens makes a beam by collecting the light of a small flame over a wide arc and refracting it into a thin sheet. Rotating the lens turns the sheet into flashes. VERIFIED qualitatively (NPS).
6. In fog, a beam is visible from the side because droplets scatter it. In clear air it is nearly invisible. Fog also hides distant beams (extinction) and puts a glow halo round every light (multiple scattering). PLAUSIBLE.
7. Game ladder: fire on a headland, lamp on a post, lens lighthouse, relic beacon. Each gets a number for intensity and height; the visible range comes from a pure function (section 8) that the arrival rule calls.
8. Cheap drawing: additive beam cards and cones, glow sprites, a flash pattern uniform, layered quads for the volumetric fake. No screen-space tricks, so it also works in AR.

## 1. How far a light can be seen

### 1.1 Geographic range (the curved earth)
| Item | Fact or number | Tag and source |
|---|---|---|
| Definition | geographic range is the distance at which a light first dips below the horizon for an observer at the sea surface (or at a stated eye height); it ignores atmosphere | VERIFIED, https://www.britannica.com/technology/lighthouse/Intensity-visibility-and-character-of-lights |
| Formula, metric | range (nm) = 2.08 to 2.10 x (sqrt(h_light m) + sqrt(h_eye m)) | VERIFIED (two coefficients quoted in search results: https://www.boatnews.com/story/48559/the-range-of-lighthouses-at-sea-understanding-and-calculating-distances ; 1.17 x sqrt(feet) is the same thing) |
| Standard atmosphere | the 2.08 (vs 1.93 for a pure geometric horizon) includes average refraction that bends light round the curve; in cold air over cold sea (our haar and inversion weather) refraction is stronger and lights are seen a little further; superior mirage | PLAUSIBLE |
| Britannica example | a light 30.5 m high seen by an eye at 4.6 m is about 16 nm (29.6 km); the formula gives 2.08 x (5.52 + 2.14) = 15.9 nm | VERIFIED example, COMPUTED check |
| Our values | light 8 m, eye 2 m: 8.8 nm; light 25 m, eye 2 m: 13.3 nm; light 35 m, eye 2 m: 15.2 nm; light 3 m (a lamp on a small post at the shore) with eye 1.5 m: 6.2 nm | COMPUTED |
| A low coast | the shore itself is under the horizon at long range: a 20 m headland is hull-down for a boat 16 nm off, but a 30 m lamp on it is not | COMPUTED |
| Real distance unit | 1 nm = 1.852 km = 1,852 m | VERIFIED |

A boat's lookout at 2 m eye height sees the sea horizon at 2.08 x sqrt(2) = 2.9 nm (COMPUTED). At the table (island window 0.5 to 2 km, see `MACRO_SEA.md`) all of this is far outside the window. A lamp on a post at 8 m is seen beyond the window by any boat anywhere in the nearby sea if the air is clear.

### 1.2 Luminous range, nominal range and the atmosphere
| Item | Fact | Tag and source |
|---|---|---|
| Luminous range | the greatest distance at which a light can be seen in the weather of the moment, ignoring earth curvature and height | VERIFIED, https://www.britannica.com/technology/lighthouse/Intensity-visibility-and-character-of-lights ; https://uslhs.org/gr/light_lists/glossary.php |
| Nominal range | the luminous range when meteorological visibility is 10 nm (18.5 km); this is what charts and light lists print; if visibility is less, the real range is less | VERIFIED (US Coast Guard light list definition seen in search result), https://navcen.uscg.gov/sites/default/files/pdf/msi/LightList_V6_2024.pdf |
| Allard's law | illuminance at the eye E = I x T^d / d^2 (I candela, d metres, T transmissivity per metre); the light is seen while E is above a threshold E_t | VERIFIED name and form (AMS glossary, IALA E-200-2: https://glossary.ametsoc.org/wiki/Allard%27s_law , https://www.ancientportsantiques.com/wp-content/uploads/Documents/ETUDESarchivees/IALA%20Navguide/IALA-E200-2.pdf ) |
| Transmissivity from visibility | meteorological visibility V is the distance at which a black object has 5 percent contrast (C = 0.05, the agreed value), so T per unit = 0.05^(1/V); at V = 10 nm the transmissivity is 0.74 per nm | VERIFIED convention (Blaise and Petry paper, snippet), 0.74 COMPUTED |
| Night threshold E_t | about 2e-7 lux for a dark-adapted lookout with no other lights (the figure used for nominal range: IALA/COLREG practice) | UNVERIFIED (remembered; the snippet's "0.2 x 10^-7" was unclear); the game uses 2e-7 as TUNING |
| Visibility classes | fog under 1 km, mist 1 to 5 km, haze above, clear at 10 km and beyond (convention) | PLAUSIBLE (already in `WEATHER_AND_SKY.md`); weather.js `vis`: clear 40,000 m, fair 30,000, overcast 12,000, showers 8,000, rain 4,000, storm 1,500, fog 400 (all TUNING) |
| Day vs night | in fog a bright light is seen further than a daytime object is, because the eye's threshold for a light at night is far lower than the contrast needed in daylight | VERIFIED concept (Allard form), numbers COMPUTED |
| Background light | glare and shore lights raise the threshold (a brightly lit town behind a lamp can make it vanish); moonlit sea has a little | PLAUSIBLE |
| Flash effect | a flash shorter than about 0.2 s looks weaker than a steady light of the same peak intensity (Blondel-Rey); a flash of 0.5 s or more is near full | PLAUSIBLE; game ignores it except to say flashes under 0.15 s lose 20 percent range (TUNING) |
| Rain | heavy rain cuts visibility but much less than fog does for lights: drizzle 2 to 5 km, moderate rain 4 to 10 km, heavy rain 1 to 2 km | PLAUSIBLE, UNVERIFIED numbers |
| Haze | sea haze (humid air with salt aerosol) 5 to 10 km; in a strong sunset the sun is red through 1 airmass of dust; by night the same air blurs lights | PLAUSIBLE |
| Atmospheric refraction | light curves with the air: mirage and looming (lights seen from below the horizon over cold sea) are real, brief and rare; do not draw | PLAUSIBLE |

### 1.3 Visible range by light strength and visibility (COMPUTED)
This is the luminous range in nautical miles from Allard with E_t = 2e-7 lux, T = 0.05^(1/V). Columns are meteorological visibility in km.
| Light | 0.2 km (dense fog) | 0.4 km (fog) | 1 km | 2 km | 4 km | 10 km | 18.5 km (nominal) | 40 km |
|---|---|---|---|---|---|---|---|---|
| 1 cd candle-lantern | 0.15 | 0.24 | 0.40 | 0.56 | 0.73 | 0.93 | 1.03 | 1.12 |
| 10 cd lamp | 0.21 | 0.35 | 0.64 | 0.98 | 1.42 | 2.12 | 2.59 | 3.08 |
| 50 cd small fire | 0.25 | 0.43 | 0.84 | 1.34 | 2.05 | 3.36 | 4.41 | 5.74 |
| 300 cd big fire | 0.30 | 0.53 | 1.07 | 1.78 | 2.87 | 5.09 | 7.15 | 10.26 |
| 2,000 cd | 0.36 | 0.64 | 1.33 | 2.28 | 3.82 | 7.24 | 10.76 | 16.82 |
| 20,000 cd (lens, oil era) | 0.43 | 0.78 | 1.67 | 2.93 | 5.07 | 10.17 | 15.85 | 26.74 |
| 80,000 cd (large lens) | 0.47 | 0.86 | 1.88 | 3.34 | 5.86 | 12.05 | 19.20 | 33.49 |
| 1,000,000 cd (electric) | 0.55 | 1.02 | 2.26 | 4.10 | 7.36 | 15.66 | 25.68 | 46.85 |
Reading it: the top row shows a candle lantern is useless beyond 1 nm in any air; going from 10 cd to 80,000 cd (a factor 8,000) raises the range by only a factor of 4 to 5 in clear air and only 2 in dense fog. Power gives diminishing returns, so height and lens collimation matter. In dense fog nothing reaches past about 0.5 nm, so a lighthouse cannot help a boat that is further out than a kilometre; a fog signal (horn, bell, gun) is what real stations add. That is a good fact for the game: fog needs a bell (a rung beyond the lens). PLAUSIBLE (fog signals are real), range of a bell UNVERIFIED (about 1 km in calm).

Real intensities for scale: Argand lamp alone about 5 candlepower, with reflector mirrors up to about 20,000, and a Fresnel lens with the same lamp about 80,000 (Britannica), a later first-order oil system about 70,000 and a pressurised kerosene one about 160,000 (a state-parks page); sources disagree and mix measurements, so all VERIFIED as "reported" but UNVERIFIED as comparable. https://www.britannica.com/technology/lighthouse/Optical-equipment ; https://parks.ca.gov/?page_id=22008

### 1.4 How a light dims in each weather state (the table for the game)
| weather.js state | vis (m, TUNING) | Night effect on lights | Game visibility class for lights |
|---|---|---|---|
| clear | 40,000 | geographic range is the limit for strong lights | A |
| fair | 30,000 | same | A |
| goldenhour | 25,000 | lights not lit yet | A |
| overcast | 12,000 | slightly shorter; a dark night (no moon through cloud) | B |
| showers | 8,000 | squalls cut it for minutes; gaps between | B/C |
| rain | 4,000 | lens still shows at 5 nm, fire at 2 | C |
| storm | 1,500 | spray and rain; lens at 3 nm | C/D |
| fog | 400 | lens 0.9 nm, fire 0.5, lamp 0.35 | D |
Plus the two new weather states from `BEAUTIFUL_WEATHER.md` (clear starry night: class A; mist burning off: class C then B).

## 2. Flash characters (how lights name themselves)

### 2.1 The vocabulary
| Name (IALA abbreviation) | Pattern | Tag and source |
|---|---|---|
| Fixed (F) | steady light | VERIFIED, https://en.wikipedia.com/wiki/Flashing_light |
| Flashing (Fl) | single flash repeated regularly, rate under 50 per minute, flash shorter than the dark | VERIFIED, same |
| Long flash (LFl) | one flash of 2 s or more | VERIFIED, same |
| Occulting (Oc) | steady light with regular short eclipses (light longer than dark) | VERIFIED (name), pattern PLAUSIBLE |
| Isophase (Iso) | light and dark equal | VERIFIED name |
| Quick (Q) | 50 to 80 flashes per minute (sources differ: 50-60 and 50-80 both seen) | UNVERIFIED band; the game uses 60 per minute |
| Very quick (VQ) | 80 to under 160 per minute | VERIFIED snippet |
| Group flashing, e.g. Fl(2), Fl(3) | a set of flashes, then a longer dark | VERIFIED notation |
| Composite group, e.g. Fl(2+1) | two groups of different counts in one cycle | VERIFIED notation |
| Morse (Mo(A)) | flashes spell a letter | VERIFIED |
| Colours | white, red, green (sectors); buoy and mark colours show the side | PLAUSIBLE |
The authority is IALA R0110, https://iala-aism.org/e-110-ed-4-rhythmic-characters-of-lights-on-aids-to-navigation_16dec2016-2 (title only seen; not read).

### 2.2 Periods and numbers a game can use
| Character | Example cycle | Flash length | Feel |
|---|---|---|---|
| Fl 5 s | 0.5 s light, 4.5 s dark | 0.5 | a slow heartbeat |
| Fl 10 s | 1 s light, 9 s dark | 1.0 | big light |
| Fl(2) 10 s | two 0.5 s flashes, 1.5 s apart, 7.5 s dark | 0.5 | "double" |
| Fl(3) 15 s | three 0.5 s flashes 1.5 s apart, 11.5 s dark | 0.5 | |
| LFl 10 s | 2 s on, 8 s off | 2.0 | long, stately |
| Oc 8 s | 6 s on, 2 s dark | | a light that blinks |
| Iso 4 s | 2 s on, 2 s off | | steady metronome |
| Q | 0.5 s cycle: 0.25 on | | busy, hazard (cardinal-mark style) |
| Mo(A) 12 s | short-long then dark | | "message" light (old beacon) |
Real stations use anything from about 2 s to 30 s cycles; the commonest group counts are 1 to 4 flashes (PLAUSIBLE). A lookout needs to count two full cycles to be sure of the identity, so a long-period character takes about 30 s to read and a short one 10 s. In fog, a boat sees only the flashes that fall in its bearing, so a rotating beam in fog is sometimes read wrongly (PLAUSIBLE).

### 2.3 How a rotating lens makes the character
- A rotating lens with N bull's-eye panels throws N beams; flashes per rotation = N, so the period between flashes = rotation period / N. VERIFIED qualitatively (the flash rate is set by number of panels and rotation speed; early plans had eight panels for one flash a minute and 16 for two), https://www.nps.gov/caha/learn/historyculture/fresnellens.htm . Example: one beam, 10 s rotation gives Fl 10 s. Two beams at 180 degrees and 10 s gives Fl 5 s. Group flashes use clusters of panels (two or three bull's-eyes close together) and a gap. PLAUSIBLE.
- Flash length = beam width / angular speed. A 3 degree beam turning at 36 deg/s (10 s per turn) lasts 0.083 s: very short. Real lights lengthen the flash by using a wider beam or a slower turn. Lighthouse flashes at 360 deg/10 s with a 4 to 6 degree total beam give 0.11 to 0.17 s peak; they look long because the beam "sweeps" past and a distant eye sees a smoothed rise and fall. COMPUTED; beam angles UNVERIFIED.
- The game flashes are an exaggerated version: use flash 0.4 to 1.0 s so the player can see the pattern at 30 fps. TUNING.

### 2.4 Where the numbers in this note came from
A short Python script run in the session (not committed; the same maths is given in section 8 as a spec for the headless test). Inputs: E_t 2e-7 lux, T = 0.05^(1/V), geographic range 2.08 x (sqrt(h) + sqrt(eye)), eye 2 m.

## 3. Lens optics: why a lens makes a beam

### 3.1 The idea
- A bare flame sends light in all directions; most of it is wasted over the sea and sky. A lens puts the flame at its focus so the light leaves as a nearly parallel bundle. VERIFIED idea.
- A conventional lens with this aperture and focal length would be a thick lump of glass; a Fresnel lens replaces it with thin concentric prisms, so large aperture and short focal length come without the weight. VERIFIED, https://en.wikipedia.org/wiki/Fresnel_lens (search snippet) and https://www.nps.gov/articles/fresnel-lens.htm
- The bull's-eye panel is a lens focusing in both horizontal and vertical directions: it makes a narrow horizontal beam which also stays flat near the horizon. A drum lens (fixed light) focuses only vertically and spreads the light round the horizon. VERIFIED (NPS snippet: panels refracted horizontally and vertically), PLAUSIBLE (drum).
- Prisms above and below the panel (catadioptric rings) catch light that would go up or down and bend it by total internal reflection into the same beam. PLAUSIBLE.

### 3.2 Real numbers
| Item | Number | Tag |
|---|---|---|
| Largest (first order) lens | up to about 12 ft (3.7 m) high, over 6 ft (1.8 m) wide | VERIFIED (NPS) |
| Orders | six sizes, focal length of first order 920 mm, sixth 150 mm (intermediate: second 700, third 500, fourth 250, fifth 187.5 mm) | first and sixth VERIFIED (snippet, https://en.wikipedia.com/wiki/Fresnel_Lens); intermediate values UNVERIFIED (remembered) |
| Visible range of a first-order lens | beam seen "over twenty miles" out to sea | VERIFIED (NPS) |
| Beam divergence | horizontal and vertical full width roughly source size / focal length: a 25 mm flame at f = 920 mm gives about 1.6 degrees; real lenses add 1 to 4 degrees of spread so the beam is not missed by a rolling boat; a typical real beam is 3 to 6 degrees | COMPUTED geometry; the real angle is UNVERIFIED (no source found) |
| Gain | a lens raises the intensity of the same lamp by a factor of 1,000 to 10,000 compared with an uncovered flame; bare 5 cp lamp to tens of thousands | VERIFIED as reported (Britannica) but sources differ |
| Rotation | one turn in 10 to 60 s (a floating mercury bath or ball bearings, clockwork weights wound every few hours by a keeper) | PLAUSIBLE |
| Weight | a first-order lens plus its frame is several tons (a first-order lens is 1.5 to 3 t of glass and brass); a floating mercury bath was used for the heaviest | PLAUSIBLE, UNVERIFIED |
| Cost and rarity | made of hand-ground pressed glass prisms; fragile; a salvaged one is a prized relic | design |
| Glass in a collapse | window glass can be melted or ground into rough lenses (bottle bottoms, bull's-eyes); a cheap relic lens is a plastic Fresnel sheet from a collapsed old-world appliance (a cheap magnifier is a few millimetres thick): PLAUSIBLE |

### 3.3 Game mapping
- Lens = multiplier on the intensity inside a narrow arc, near zero outside. A rotating beam is a function `I(theta) = I_peak * exp(-(dtheta / w)^2)`; the flat flash pattern is the same function seen from a fixed bearing as the lens turns.
- Game values: peak intensity of the beam 1,000 to 100,000 cd depending on the rung; beam half-width w = 3 to 6 degrees for the picture (exaggerated 2 to 3 times) and 2 degrees for the rule. TUNING.
- Fixed lens (a drum): steady, 360 degrees; lower intensity (for a 300 to 5,000 cd class). Occulting characters use a fixed lens and a rotating shutter. PLAUSIBLE.

## 4. Fuels and sources through history, and what a post-collapse island could burn or power
### 4.1 The sequence
| Era | Source | Number | Tag |
|---|---|---|---|
| Ancient and early | open fire (wood, coal) on a tower or a hilltop; a brazier on a pole | a bonfire: hundreds of candela but the flame is a poor point source; smoke by day, red flicker by night | PLAUSIBLE |
| 1700s | many candles or simple oil lamps with tin or glass | about 1 cd per candle; a chandelier of 24 candles 20 to 30 cd | PLAUSIBLE |
| 1782 | Argand lamp: a hollow round wick with a chimney gives a steady, smokeless flame; burned whale or fish oil, then vegetable oil, by 1860 mineral oil | about 5 cp | VERIFIED (Britannica snippet) |
| 1700s-1800s | reflectors: silvered copper or glass mirrors behind lamps | up to about 20,000 cp with many lamps; "almost 400 times" | VERIFIED (Britannica) |
| 1822 onward | Fresnel lens with an oil lamp (multi-wick) | about 80,000 cp reported | VERIFIED (Britannica) |
| mid-1800s | sperm oil, then colza (rapeseed) oil, then mineral oil, then kerosene | oil types in the order given | VERIFIED (Britannica/USLHS snippets) |
| 1880s-1900s | vaporised kerosene burning under an incandescent mantle: about 6 times more powerful than the wick lamps | factor 6 | VERIFIED (snippet, https://pharology.eu/howlighthouseswork/H16_vapourisedparaffin.html) |
| 1900-1910 | acetylene gas (from calcium carbide and water) with a pulsing valve: unattended, automatic; the "sun valve" turns it off by day to save gas | | VERIFIED (snippet, https://en.wikipedia.org/wiki/Dal%C3%A9n_light) |
| 1800s on | electric arc lamps (brief), then filament, then discharge lamps; modern LED beacons draw a few watts from a solar panel and a battery | | PLAUSIBLE; arc lamp trials VERIFIED only by name |
| Today | rotating lenses replaced by fixed LED arrays that flash electronically | | PLAUSIBLE |

### 4.2 Fuel for an island after the collapse (design, with real basis)
| Source | Basis | What it gives | Limits |
|---|---|---|---|
| Driftwood, peat, dried kelp and dung | open fire | a few hundred cd, smoke | needs a keeper; wet weather; the fire must be fed all night (about 5 to 10 kg of dry wood per night for a bonfire, TUNING) |
| Seal, whale or fish oil (rendered blubber, liver) | the same oils real lights burned (sperm and fish oil in the early era) | a steady wick lamp of 5 to 20 cd | smell and smoke; needs animals (wildlife layer) and care; a "no kill" soft rule might suit the game's tone, so fish and washed-up carcasses only |
| Rapeseed or flax oil (crops) | colza oil was a standard lighthouse oil | a good lamp | needs a field and a press |
| Tallow and beeswax candles | candles | 1 cd each | many needed |
| Methane from a rotted heap (biogas) | the same chemistry as the old acetylene gas systems | a small gas flame | needs a tank and valves; mid game |
| Charcoal gas or wood gas | possible, complex | | UNVERIFIED |
| Salvaged battery and solar panel with an LED | old relics; solar plus LED beacons are real small aids today | a small LED flasher of 5 to 100 cd lasts years if the battery is alive | batteries die after 5 to 15 years (PLAUSIBLE); needs the relic layer |
| A rebuilt tidal turbine or wind generator | the "unfinished projects" idea | an electric light | far stage |
| Mirrors from windows, tin or polished copper | reflector lamp: tin reflectors multiplied the light a few times | a 5 to 10 times gain for a lamp | needs metalwork |
Rule to keep: each fuel appears at its own rung (section 6) and costs something the ledger can see (oil units a night, a keeper's hours). A hint, not a lecture. TUNING.

## 5. Fog physics for visuals

### 5.1 What happens
| Phenomenon | Physics | Visual | Tag |
|---|---|---|---|
| Extinction | fog droplets (typically 5 to 20 micrometres in diameter, concentration 10 to 500 per cm^3) scatter light out of the beam; for light at visibility V the extinction is sigma = 3/V (about, with the 5 percent contrast = ln(20) = 3.0) | a light dims by exp(-3 d / V) | PLAUSIBLE (droplet sizes standard), formula COMPUTED |
| Mie scattering | droplets are comparable to the wavelength, so scattering is strong, nearly colour-neutral (fog is white) and sharply forward-peaked | looking toward a light through fog you see a bright halo; from the side a beam looks fainter than head-on | PLAUSIBLE |
| Halo | light scattered into the line of sight from the fog around the lamp; it is brightest at the lamp and fades with distance from it; the halo radius grows with fog density | a soft glow round every lamp; the denser the fog, the wider and dimmer it is, and the lamp core fades first | PLAUSIBLE |
| Beam in fog | the lens beam lights the droplets along its path; the side view shows a bright sword near the lamp that fades with distance from extinction and spreading; a rotating beam is a sweeping blade | the standard lighthouse picture | PLAUSIBLE |
| Beam in clear air | air scatters little, so the beam is nearly invisible from the side, except in haze, dust, or at the lamp | no beam, only flashes seen when the beam sweeps across the eye | VERIFIED idea (sources describe beams as visible "over twenty miles" by flashes only; the side view is my knowledge) |
| Why fog hides distant beams | two effects: extinction (exp(-3d/V)) and 1/d^2 spreading, plus the background fog glows from ambient light | the beam fades into the fog glow after a few hundred metres | PLAUSIBLE |
| Fog and lamp colour | warm lamps look orange-white in the middle of a white halo; a coloured sector light shows as a coloured glow | | PLAUSIBLE |
| Wet air | rain streaks lit by a lamp are bright, short and diagonal; halos are smaller | | PLAUSIBLE |
| Rainbows and light pillars | light pillars (a lamp's column in cold air with ice crystals) are real and rare at below -10 C; skip | | PLAUSIBLE |

### 5.2 Numbers for the look (TUNING mostly)
- Fog visibility V to glow radius: halo radius on screen about 0.3 x V (in metres) for a lamp, 0.6 x V for a lens beam's head-on flash; core fades once distance > V. TUNING.
- Beam visible length in fog: about 1.5 x V at the half-intensity point, with an exponential fade; at V = 400 m the beam reads for about 600 m and then fades. TUNING from exp(-3 d / V).
- Beam brightness at the lamp end is several times the glow; fade the card alpha with `exp(-3 d / V)` and keep a floor of 2 percent so you can still see the direction.
- In clear air (V above 10 km) the beam card alpha is near 0.05 to 0.1 (haze), the glow stays tight, and flashes carry the signal.
- Relation to weather.js: it already has fog density `fogD` (fog 0.0058 exp2 per game metre) and `haze` (0.35 in fog). The beam alpha can use `1 - exp(-fogD * k)` or the same `vis` as above, so there is no second fog model.

## 6. Night lighting for houses and boats
- Windows: oil and candle light is 1,800 to 2,300 K (colour (1.0, 0.6, 0.25) at TUNING), and a fire is 1,500 to 1,900 K (from `SKY_CLOCK.md`, PLAUSIBLE). From outside a lit window is a warm yellow-orange rectangle with a soft bloom; the rest of the house is dark; the light spills a small patch on the ground (1 to 2 window widths) and the colour is a strong complement to the cool blue of night.
- Brightness: one candle about 1 cd (12 lm), a lamp 5 to 20 cd. A lit window of 0.5 m by 0.8 m in a house is seen from the sea at about 1 to 2 km in clear air at night (Allard with 10 to 30 cd: 1 to 3 nm at V = 10 km, but window shutters and glass reduce it a lot). COMPUTED, PLAUSIBLE.
- Flicker: 5 to 15 Hz, amplitude 5 to 10 percent for a lamp and 15 to 25 percent for a fire; keep colour constant (`SKY_CLOCK.md` section 8, TUNING).
- Houses: window quad with an emissive material at night only; no real lights except one or two near the camera; the rest are baked emissive (see budgets in section 9). Chimney smoke is lit warm from below at dusk. A dark house means "nobody home", a lit one is a human signal: a feature for gameplay (the count of lit windows is a cheap measure of people on the island).
- Boats: real rule (COLREGs) says power vessels carry red to port, green to starboard and a white masthead, a sailing boat red/green sidelights and a white stern light, and a small boat may carry a white lantern; the lights are seen at 1 to 3 nm. PLAUSIBLE (known, not fetched). For the game: a single warm lantern on the mast of every boat at night (a small additive sprite, no real light), a red and a green dot for boats of the later gig and decked class. A boat's light is how you see boats arrive in fog: you see the lantern before the hull.
- Moon and sea glitter: a moon path on the sea (see `SKY_CLOCK.md`), plus the lens flash that crosses the water; a lens beam on the sea gives a white streak when the beam is low. PLAUSIBLE.
- Eye adaptation: a fire dims the stars and the dark parts of the scene (VERIFIED in `SKY_CLOCK.md`); a light-rich scene needs the exposure to follow, not a flat black. TUNING.
- Avoid the pole of light pollution: the world has almost no light after the collapse, so even one lit window is a big thing at night. Design.

## 7. Signal ladder with numbers
Numbers: intensity I (cd, peak toward the observer), height of the source above sea h (m), eye 2 m. Visible range = min(geographic, luminous) from section 1. All I and h are TUNING (chosen from the real orders of magnitude above); all ranges are COMPUTED.

| Rung | What | I (cd) | h (m) | Geographic (nm) | Visible at V = 18.5 km (clear) | at V = 2 km | at V = 0.4 km (fog) | Notes |
|---|---|---|---|---|---|---|---|---|
| 0 | nothing; a lit window only | 10 per window | 3 | 6.2 | about 2.5 nm | 0.9 | 0.3 | a faint warm speck |
| 1 | fire on a headland | 300 (bonfire, omni) | 25 | 13.3 | 7.2 | 1.8 | 0.53 | red-orange flicker; smoke by day; needs a keeper; flares in rain |
| 2 | lamp on a post (a lantern with a mirror, a pole) | 10 (30 with a tin reflector) | 8 | 8.8 | 2.6 (4.0) | 1.0 | 0.35 | warm steady dot |
| 3a | small lens lighthouse (oil lamp, fixed or hand-turned lens) | 5,000 (peak toward you) | 22 | 12.7 | 12.7 | 2.5 | 0.69 | white flash; its pattern is its name |
| 3b | full lens lighthouse (big lens, mantle lamp) | 80,000 | 35 | 15.2 | 15.2 | 3.3 | 0.86 | beam visible in fog from the side |
| 4 | old relic beacon (a solar LED mast that keeps flashing) | 100,000 | 20 | 12.2 | 12.2 | 3.4 | 0.88 | flashes for nobody; same effect as 3b but no keeper cost |
| + | bell or horn (fog signal) | n/a | | | | | about 1 km | the only thing a lens cannot do in fog |

What it means at table scale (the island window is 0.5 to 2 km): the whole local sea is inside the range of every rung except fog; the rung does not change which lamp you see inside the window, it changes who can see it from outside it. Drawing: inside the window the picture compresses with a monotone map: ring radius on screen = window_half * (range_nm / 12)^0.5 clamped. For the UI, show a "ring of sight" around the island in a map overlay with the rung and weather. TUNING.

### 7.1 Mapping to the arrival rule
Existing: "new settlers and visiting boats come on the existing seeded arrival schedule" (`EVOLUTION_TREE.md`), keyed `seed:kind:index`, one slot per game hour, boats by day below 13 m/s (`MACRO_SEA.md` section 5). Proposed extension (pure function, no stored state):
1. Each boat event already has a bearing. Add `dist_nm`, drawn from the key's own RNG (`mulberry32(hash(key))`), uniform 1 to 20 nm on a log scale (TUNING).
2. A boat can "see" the island if `dist_nm <= visible_range(rung, weather, hour)`. Without a light the island is seen only in daylight by its silhouette: use the same function with I = 0 and a daytime visibility for a 40 m island (about 16 nm clear with the eye at 2 m, COMPUTED 2.08 x (sqrt(40) + sqrt(2))), but at night nothing.
3. Seen boats are "attracted": probability of landfall `p = p_base * (1 + k * seen)`, `p_base` today, `k` 1 to 3 per rung (TUNING). Unseen boats pass by or drift somewhere else (the existing arrival table).
4. Weather and tide: landfall needs `sailOk` (wind) and enough water at the harbour mouth (tide level against a draught); in fog the boat must also hear a bell or see the lens within 1 nm; a storm means a boat may be wrecked instead of arriving (a wreck event exists after storms in the macro sea). Tide: at low water a reef near a harbour mouth is drying; at spring low it is a hazard (see `FLOW_TYPES.md` for races and `SEDIMENT_PHYSICS.md` for bars). PLAUSIBLE.
5. Stakes: a light draws boats toward the island, including to a reef if the harbour is not marked. Define `marked` as having a second small light on the harbour mouth (a lamp on a post at the harbour, or a Fl pair) or a leading line (two lamps in a row). With an unmarked mouth, `p_wreck = 0.05 to 0.2` per arrival at night or in fog, and the wreck becomes a salvage find the next morning (a gentle cost, never a person's death on screen). TUNING.
6. Globe arrivals (`GLOBE_AND_DRIFT.md`): ships and survivors arriving from specific shores come in on long routes over days: they see the island only in the last day. Treat them the same way, with `dist_nm` drawn at the final approach. Drift goods do not see lights.
7. Counting, never tracking: each arrival is a count in the ledger with an idempotent key; the light changes the count only. Display "n boats saw the light, m landed".
8. Visible ring in the UI: the visible ring changes with the weather state, so the player feels the fog take the light's range away. The "stakes, quiet" tone from `EVOLUTION_TREE.md` holds.

## 8. Calculator spec (the pure function)
```
horizonNm(hLightM, hEyeM)     = 2.08 * (sqrt(hLightM) + sqrt(hEyeM))
transPerM(VisKm)              = 0.05 ^ (1 / (VisKm * 1000))
lumRangeNm(I_cd, VisKm, Et)   = solve d: I * T^d / d^2 = Et      (bisection, d in m, / 1852)
visibleNm(I, hL, hE, VisKm)   = min(horizonNm(hL, hE), lumRangeNm(I, VisKm, 2e-7))
beamI(thetaDeg, t, rung)      = Ipeak * exp(-(wrap(theta - rot(t)) / w)^2)   // seen from a bearing
```
All pure, no clocks; weather gives VisKm = `STATE_TABLE[state].vis / 1000` (blend with the existing smoothing), the rung gives I and h. Used by the arrival rule and by the picture (ring of sight, beam length). A 5-line JS port of this table needs only `Math`.

## 9. Cheap rendering recipes for three.js r128
All materials: `fog: false` on additive pieces, `depthWrite: false`, `blending: THREE.AdditiveBlending`, `transparent: true`; compute fog attenuation in the shader from the same `uFogD` as weather.js (the scene fog does not darken additive blending correctly).

| Piece | How | Triangles | Shader cost | Notes |
|---|---|---|---|---|
| Glow sprite | `THREE.Sprite` with a canvas radial gradient (64 x 64, white to transparent, power 2.2), additive, `sizeAttenuation` true, tinted warm; scaled by fog glow radius (section 5.2); alpha follows flash | 2 | trivial | one per light; also for windows and boat lanterns; instancing not needed at under 40 |
| Beam card (axis-billboard) | a plane 1 x L along the beam direction, rotates about the beam axis to face the camera (do the billboard in the vertex shader: `right = normalize(cross(axis, viewDir))`); alpha = cross profile `(1-|u|)^2` times along-length fade `exp(-3 d / V)`; one extra card at 90 degrees makes a cross for AR; texture-free | 2 per card, 4 with the cross | about 12 ALU | a rotating beam = card orientation about the vertical axis at the angular speed |
| Additive cone | `ConeGeometry` open-ended, 12 to 16 segments, apex at the lens; fragment alpha fades with distance along the axis and with `abs(dot(N, V))` (fresnel-like, so the silhouette soft edge hides the facets) | 24 to 32 | about 15 ALU | two layers (an outer faint and an inner bright) is the full look; draws with `side: DoubleSide` |
| Flash pattern uniform | `uniform float uSeq[8]` holding alternating on/off durations (seconds), `uniform float uPeriod`, `uniform float uT`; the fragment (or the CPU, one float per light) walks the 8 numbers once: `float t = mod(uT, uPeriod); float a = 0.; for(int i=0;i<8;i+=2){ if(t < uSeq[i]) { a = 1.; break; } t -= uSeq[i]; if(t < uSeq[i+1]) { break; } t -= uSeq[i+1]; }` with a short smoothstep fade (0.05 s) at each edge | 0 | about 20 ALU if in the shader; free if done on CPU | prefer the CPU: 1 float per light, no shader loop, no GPU divergence; the character table lives in JS |
| Rotating beam, bearing-based | the beam card's yaw follows `2 pi t / period`; the flash seen by a boat is when the yaw crosses the bearing; flash length 0.4 to 1.0 s via beam half-width | 0 | | exaggerated beam width 8 to 15 degrees for the picture, 2 degrees for the rule |
| Volumetric fake (layered quads) | 6 to 10 quads along the beam axis, each a camera-facing soft disc with alpha `exp(-3 d / V)` and a size growing with distance; additive; or a stack of 4 to 6 nested cone shells | 12 to 20 | trivial | the usual cheap trick; looks right in fog, nothing in clear air (turn off when V > 10 km) |
| Light pool on the water | a flat quad with a radial additive gradient under the lamp (or a streak along the beam toward the camera on the sea); the sea shader already has glitter | 2 | 5 ALU | the sea gets sun-glitter from `glit`; a lamp glitter column is a stretched sprite |
| Window glow | emissive additive quad on the wall, plus a slightly larger sprite at night only; flicker from a hash of the house id and time | 2 to 4 per house | trivial | no real light |
| Lantern on a boat | one sprite, one small point (only the nearest 2 get a real light) | 2 | | |
| Real point lights | at most 4 to 8 on desktop; 2 on handheld; 0 in AR (baked emissive instead) | | | the budget from `SKY_CLOCK.md` section 8 |
| Fog halo in AR | glow sprites only; no post-process bloom | | | no screen-space tricks |

No screen-space bloom is needed: a glow sprite with the same alpha profile reads as bloom. The sprite approach also works in AR because it is geometry, not a post pass (`MODES_AR_DESKTOP_HANDHELD.md`: post is off in AR).

### 9.1 Tier budgets (TUNING until measured)
| Tier | Lights with sprite | Beams | Beam type | Real point lights | Glow size cap | Flash |
|---|---|---|---|---|---|---|
| T0/T1 desktop | up to 60 (houses, boats, lamps) | up to 4 | cone shell x2 plus cross cards plus 8 layered quads | 6 | full | full sine fade |
| T2 handheld high | 40 | 2 | one cone plus one card | 3 | 80 percent | full |
| T3 handheld low | 20 | 1 | two crossed cards | 1 | 60 percent | on/off with 0.1 s fade |
| T5 small phone | 12 | 1 | one card | 0 | 50 percent | on/off |
| T4 AR | 20 | 1 | crossed cards only (table scale, short) | 0 | 60 percent, scaled with the table (see below) | on/off |
Cost in total: triangles under 600 for the lights on the highest tier, under 100 on the lowest; additive overdraw is the cost, not triangles: keep each glow under about 15 percent of the screen at the nearest zoom (one big glow filling the view can cost more than the sea). PLAUSIBLE.

### 9.2 AR notes
- The table is 0.7 to 1.2 m across (1:200 to 1:500, `MODES_AR_DESKTOP_HANDHELD.md`). A lighthouse of 35 m is 7 to 17 cm tall: the beam card length of 1 to 2 km game would be 5 m on the table, so cap the visible beam at about 0.4 table-widths, and fade out. TUNING.
- The beam must be visible against a real room: additive beams on a bright room look washed out; use a slightly higher alpha, or a mild "halo lit" ring rather than a thin blade. TUNING.
- Night in AR: the real room is not dark, so the "night glow" is mostly a small glow and a warm window; the game cannot dim the real room, so window glows and lamps are drawn brighter than their dark-mode values (a little emissive boost) and a faint "dim the sea" is done by darkening the miniature sea surface only. PLAUSIBLE.
- Flash timing is the signal: in AR the pattern and the sound of the bell carry more than the glow, so the pattern must stay clean at 30 fps.

## 10. Looks and time
- Day: a lighthouse is a white tower with a dark lantern room; a lens glints in sunlight as a sparkle (a small point reflection, sun dependent); an unlit fire is a black ring with smoke; a lamp on a post is a pole with a glass box.
- Dusk: the keeper lights the lamp at sunset (the sky clock gives the time: civil twilight begins when the sun is 0 to -6 degrees); light is on from sunset to sunrise or when visibility drops under about 5 km (a real rule: lights are lit by day in fog); in the game the lens turns on at civil dusk and in fog.
- Night: the rest of the world is dark; the light is the main gradient; flashes illuminate the sea and the tower sides; the moon changes how well the sea shows the lamp's pool.
- Dawn: lights go out; the beam fades first in the brighter sky.
- Seasons at 57.5 N: summer nights are short and never fully dark (civil twilight round the clock near midsummer, `SKY_CLOCK.md`), so lamps matter less in June and more from September to March; winter has about 17 hours of night and fog is commonest in spring and early summer (`WEATHER_AND_SKY.md`). The game's fog and the dark long nights are therefore at different times: the best signals are spring fog by day and winter night. PLAUSIBLE.
- Time to become a rung: a fire takes an hour to build, a lamp a day, a lens many days of work and salvaged glass (design).
- Fuel clock: a fire burns the wood stack for 6 to 10 hours; a lamp burns about 20 to 30 g of oil per hour for a wick lamp (a real Argand burner used about 0.2 to 0.4 litres per hour, UNVERIFIED), so one night costs about 3 to 5 litres of oil for a full lens. TUNING.

## 11. Interactions with other layers
| Layer | Link |
|---|---|
| Sky clock | lamp on at dusk; moon phase changes the contrast and the glitter; summer twilight reduces the need |
| Weather | `vis` and `fogD` set the range and the glow; rain streaks catch the beam; fog is the main stage; storm gives wind that puts out a fire (above F6, TUNING) and breaks a lamp's glass |
| Macro sea and tide | arrival slots, boats by day below 13 m/s, wrecks after storms; tide level decides reef danger at the harbour mouth; spring low at night is the dangerous time |
| Flow field | a race or overfall near a headland can be marked by the lamp: "light the dangerous mouth" |
| Seabed and sediment | reefs and drying bars at harbour mouths; a changing bar changes where the safe channel is; a leading light pair marks the channel |
| Boats | each boat has a lantern; sailing boats need wind; boats approach the strongest visible light, with a bearing |
| Wildlife | birds are drawn to bright lights in fog at night (real: seabirds strike lanterns in fog; PLAUSIBLE), moths and insects swarm lamps (sprite specks); seals and fish: no effect; a keeper's lamp pools attract squid and fish at night (real fishing technique, PLAUSIBLE) |
| People | a keeper is a person on the island with a job; the count of lit windows is the settlement's size |
| Relics | old beacons that keep flashing for no one: hard-coded character and rung, no thinking; the player can restore (give power) or ignore |
| Economy and ledger | oil, wood, glass, keeper hours; idempotent keys for arrivals |
| Globe | distant arrivals see the light only on final approach |

## 12. Common mistakes
1. Treating range as a single number: it is min(geographic, luminous), and luminous changes with the weather. A bright light is not seen from 50 nm because the earth is in the way.
2. A beam always visible in clear air (it is not; only in haze or fog or at the lamp).
3. A glow that is a sharp disc: fog glow is wide, soft and fades from a hot centre; a hard ring looks like a sticker.
4. Flash too fast to read (under 0.3 s at 30 fps; the real flash is 0.1 s but the picture cannot show it).
5. Every light the same: the character is the identity; two neighbouring lights need different patterns.
6. Lights on in broad daylight (they are lit at dusk, off at dawn); a fire's smoke shows by day.
7. Warm and cool mixed wrongly: lamps are orange (1,800 to 2,300 K); the lens flash is white (a mantle burns at about 3,000 K, an arc or LED is whiter); night ambient is blue, not black.
8. Fog that hides the sea but not the light: fog fades the light as exp(-3 d / V) too.
9. A rotating beam that stays on one side (it must sweep a full turn, a flash only on the bearing it points to).
10. Point lights everywhere: 40 real lights on a tablet kills the frame rate; use sprites.
11. Lamps that flicker like strobes: use the slow flicker values; a fixed light flickers 5 to 10 percent only.
12. A rotating beam clipping into the tower (make the lantern room glass and the beam start at the lens).
13. Real names for lights in the game assets (use made-up names from the models).
14. A harbour light that always saves boats: unmarked mouths and spring-low reefs are the stakes.
15. Screen-space bloom in AR.

## 13. Visual and behavioural checklist
- Range: for a rung at fog 0.4 km the visible ring is 0.35 to 0.9 nm; at clear it is 2.6 to 15 nm (table 7). The ring on the UI changes with the state.
- Pattern: each lighthouse has a character from the list, with a period between 5 and 30 s; the flash length is 0.4 to 1.0 s; two lights within 10 nm have different characters.
- Fog: the beam is visible from the side up to about 1.5 x the visibility, then fades; a halo surrounds the lamp; at clear the beam is invisible except a faint haze cone near the lamp.
- Night: the lit windows are warm, the sea cool; a single flame reads as warm; the fire flickers; the tone mapper keeps the fire core from going to flat white.
- Arrival: with no light and at night no boat lands; with a lit rung more land; with fog and a bell, more land than fog without; with an unmarked mouth and spring low at night the wreck count rises.
- Budget: counts of lights, beams and real lights per tier as in 9.1; frame time unchanged within 10 percent at night versus day on the same tier.
- AR: no post-process; beam cards short; window glows readable at table scale.

## 14. What is faked in the game
- The earth's curve: boats are not simulated at 10 nm; the visible range is a number, the arrival is a draw (section 7.1).
- The beam: one card or cone stands in for a real thing that is nearly invisible in clean air; the width is exaggerated 2 to 3 times; the flash is slower than a real flash.
- Fog: a density and a glow radius, not a droplet model; no multiple scattering.
- Rain: the visibility class table is simplified.
- Lamps: warm sprites; real lights only for the nearest few.
- Intensities: tuned, not measured; the fire at 300 cd is a guess.
- Fuels: a short list with simple costs; no combustion model; no real chemistry beyond the names.
- The relic beacon's power: unexplained on purpose (a solar LED surviving decades is fiction).
- Real stations, real names and real characters are not used: the characters are generated.
- Mirage, looming, light pillars, green flash: skipped.
- Colour sectors: skipped at first (one white light), a red/green sector pair later for harbour mouths.

## 15. What the town's models can draft (text only)
Short text, not code, checked by the rules in `WORKER_CONTRACT.md`:
1. Names of lights (no real places): "the Grey Lamp", "Tern Rock Light", "Old Nan's Post": 40 names, each with a flash character and a one-line mood ("two quick flashes, then a long rest").
2. Bottle messages about lights, 10 to 25 words, in the island's voice: "We saw your fire over the haar and turned in. Keep it burning." Ask for 30 in three tones: grateful, warning, funny.
3. Keeper's log lines for a fog night, a clear night, a night the fire went out (8 each).
4. Boat captains' lines on seeing the light for the first time.
5. Labels for the ladder (what to call each rung) in plain words.
6. Short notices for the relic beacon ("the old mast still blinks twice, then waits").
Rules to give them: no brands, no real place names, nothing graphic, a way back always, no more than 25 words, return as JSON lines with `key` and `text` so the ledger can dedupe.

## 16. Test plan
Headless (node, no browser):
1. `visibleNm` reproduces the table in 1.3 and 7 within 2 percent (a snapshot test of the numbers above).
2. Monotone: range rises with I, with height, with visibility; never exceeds the geographic range; zero for I = 0 at night.
3. The seeded arrival counts over 200 seeds x 30 game days per rung (0 to 4) x weather mix, with the expected order: count(rung 0) < count(rung 1) <= count(rung 3b); fog cuts counts for rungs 1 to 2 more than for rung 3; with a bell, fog counts rise; the unmarked-mouth wreck count is above 0 and below 20 percent of arrivals; the same seed gives the same counts (determinism); a second run in a different call order gives the same keys.
4. Flash pattern: the character table produces the period and the on-fraction that it says (sample 1,000 times).
5. No NaN for V = 0.05 km and V = 100 km.
Visual (browser, `?shot` style like the other pages):
6. Night and fog sheet: a grid of rungs 1, 2, 3a, 3b, 4 against clear, haze, fog, dense fog, rain, at night, on desktop and a low tier; compare to the checklist; save to `shots/`.
7. A flash strip: 12 frames across one period for three characters.
8. Frame time: night with 40 sprites and 2 beams within the tier budget.
9. AR mock: the beam card cap at table scale.

## 17. Staged build plan
1. Stage 0 (no art): the calculator and the character table as a pure JS module, with the node test (tests 1 to 5). Wire into the arrival draw in a headless sim only.
2. Stage 1: the picture on one island: glow sprites, window glow at night, one fire with flicker, and the visibility ring on the UI. No beams yet.
3. Stage 2: the lamp on a post and the lens lighthouse with beam card plus cone, flash by the character table, fog attenuation from weather.js `vis`.
4. Stage 3: the ledger: fuel and keeper hours, the rung upgrade path (needs glass, the collector and trade), arrivals now depend on the rung, the "saw the light" counter.
5. Stage 4: the harbour mark, wrecks and the quiet stakes; the fog bell.
6. Stage 5: relic beacons, in the relic layer.
7. Stage 6: AR table-scale version and tier pass on a device; then the town's text.
Each stage ends with the sheet and the headless numbers; nothing is locked.

## 18. Minimal first build (10 lines)
1. One pure function `visibleNm(I, hLight, hEye, visKm)` and a table of 5 rungs.
2. A character table of 8 patterns with a period and on-off pairs.
3. Glow sprite and warm window quads at night, only.
4. One lighthouse: lamp sprite plus one beam card, rotating at its character's period.
5. Beam alpha and halo radius from weather.js `vis`.
6. A "ring of sight" overlay for the player, set by the rung and the weather.
7. The arrival draw takes `visibleNm`: seen boats land with higher probability.
8. Unmarked harbour mouth at night or in fog gives a small chance of a wreck.
9. Low tier: on/off flash, no cone, 20 sprites; AR: crossed short cards only.
10. A node test and a night-and-fog sheet.

## 19. Could not verify (do not rely on)
- The night threshold illuminance (2e-7 lux): remembered; the search result was garbled.
- Beam divergence of a real lens in degrees: no source found; the numbers are geometry and guesses.
- The focal lengths of the second to fifth orders.
- The quick-flash band (50 to 60 or 50 to 80 per minute): sources differ.
- Actual rain visibility numbers for lights; the game's ladder is TUNING.
- Oil burn rate per hour in a real lens lamp; fire fuel per night.
- The range of a fog bell or horn.
- Real intensity of a bonfire as a signal (300 cd is a guess).
- Whether a solar LED beacon with a battery could really still flash after 20 years or more (battery life is the weak point).
- Flash timing numbers from IALA R0110 (the page was not read).
- Colour of the flash for a mantle lamp.
- Light pillars and the green flash: not looked up.
- Bird strikes and fish attraction: standard but unsourced here.

## 20. Sources (search extracts only; full pages not read unless the tag says so)
- https://www.britannica.com/technology/lighthouse/Intensity-visibility-and-character-of-lights (geographic range, luminous range)
- https://www.britannica.com/technology/lighthouse/Optical-equipment (Argand, mirrors, lens candlepower)
- https://www.britannica.com/technology/lighthouse/20th-century-lighthouses
- https://www.boatnews.com/story/48559/the-range-of-lighthouses-at-sea-understanding-and-calculating-distances (formula 2.10)
- https://uslhs.org/gr/light_lists/glossary.php ; https://navcen.uscg.gov/sites/default/files/pdf/msi/LightList_V6_2024.pdf (nominal range)
- https://glossary.ametsoc.org/wiki/Allard%27s_law ; IALA E-200-2 on ancientportsantiques.com (Allard, T)
- https://www.nps.gov/caha/learn/historyculture/fresnellens.htm ; https://www.nps.gov/articles/fresnel-lens.htm (lens size, panels, flash rate)
- https://en.wikipedia.com/wiki/Fresnel_Lens (orders, focal length)
- https://en.wikipedia.com/wiki/Flashing_light ; https://iala-aism.org/e-110-ed-4-rhythmic-characters-of-lights-on-aids-to-navigation_16dec2016-2 (characters)
- https://pharology.eu/howlighthouseswork/H16_vapourisedparaffin.html ; https://en.wikipedia.org/wiki/Dal%C3%A9n_light (fuels)
- https://parks.ca.gov/?page_id=22008 (first-order candlepower)
Licences: facts only, no text copied; all numbers are stated in our own words.
