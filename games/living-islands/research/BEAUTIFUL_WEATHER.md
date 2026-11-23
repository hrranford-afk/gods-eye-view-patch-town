# Beautiful weather (research note, 23 Nov 2026)

Gate note under `RESEARCH_FIRST.md`. Covers "Weather needs beautiful days too" in `EVOLUTION_TREE.md`. Reads with `WEATHER_AND_SKY.md` (fronts, fog, the seeded schedule), `CLOUD_PHYSICS_FOR_VISUALS.md` (optics), `CLOUD_ATLAS.md`, `SKY_CLOCK.md` (sun table for 57.5 N, night sky, aurora), `MODES_AR_DESKTOP_HANDHELD.md` (tiers, AR), `MACRO_SEA.md` (storm tracks, pressure), `weather.js` (the 8 states), and the sister note `LIGHT_FOG_AND_LIGHTHOUSE.md` (fog and halo glow).

How the sources were handled: search snippets only this session (full pages were not fetched; many sites are blocked from the cloud). Tags:
- VERIFIED: a search result stated it (URL given) or it is plain arithmetic.
- PLAUSIBLE: standard physics or weather lore I know but did not see in a source this session.
- UNVERIFIED: remembered but shaky, or sources disagree.
- TUNING: a game number with no real measurement.
- COMPUTED: my own arithmetic or a headless run in this session.
Real place names stay inside this note; game code and assets must not use them.

## 0. One-page summary
1. Beautiful weather is mostly geometry plus the right sky: a bright sun low behind you and rain or fog in front gives a rainbow; thin ice cloud with the sun gives halos; a gap in cloud gives rays; cold clear calm air gives frost and stars. Each needs the sun's elevation and direction from the sky clock, so they cannot be random decoration.
2. Recommendation: do not add states to the 8-state Markov chain in `weather.js`. Add "sky moods": pure functions of (seed, game hour, the blended weather, the sun and moon from the sky clock, the date). They are layers on top of the 8 states (as lightning already is). The schedule stays as it is.
3. Rainbow rules (VERIFIED): the primary bow is a circle of radius 42 degrees (red outside, violet inside at about 40) around the antisolar point (the point opposite the sun, below the horizon by the sun's elevation). If the sun is above about 42 degrees the primary bow is entirely below the horizon. The secondary bow is at 50 to 51 degrees with colours reversed, with a dark band between (Alexander's band).
4. At our 57.5 N the noon sun is above 42 degrees from about mid April to the end of August (noon 47 degrees on 1 May, 56 at midsummer), so in summer a rainbow can only be seen in the morning and evening hours; in winter, all day. COMPUTED from the table in `SKY_CLOCK.md`.
5. Costs are small: a rainbow is one extra term in the sky dome shader (about 25 ALU per sky pixel, no triangles); rays are 6 to 12 cards (12 to 24 triangles); halos are a ring term in the same dome shader; frost is a tint on up-facing surfaces; snow is a tint plus particles.
6. AR has no sky dome, so the sky effects become table-scale ornaments (a small arc over the table, a few shaft cards) or are skipped. The best fit for AR is frost rim, snow dusting, wet glitter and mist (all things on the island); the sky arcs are optional.
7. Measured in a headless run of the existing schedule (section 4): raw "a shower with the sun at 2 to 40 degrees" happens on 25 percent of days (December) to 43 percent (June), far too many for a treat, so the moods need extra gates (a rain cell on the antisolar side, a clear sun, a random keyed draw) to bring rainbows to about 8 to 15 percent of days.

## 1. Rainbow geometry and brightness

### 1.1 Geometry
| Item | Fact | Tag and source |
|---|---|---|
| Primary bow | radius 42 degrees (red edge) and 40 degrees (violet edge) around the antisolar point; violet inside, red outside | VERIFIED, https://cloudatlas.wmo.int/en/primary-rainbow.html |
| Elevation limit | if the sun is above 42 degrees the primary bow is below the horizon; the top of the bow is at 42 minus the sun's elevation | VERIFIED (WMO), arithmetic COMPUTED |
| Independent of drop size | the bow angle depends on the refractive index (so on the colour), not on the drop size | VERIFIED, https://physicsworld.com/a/the-subtlety-of-rainbows/ and search extract |
| Secondary bow | radius about 50 to 51 degrees, colours reversed (red inside, violet outside), caused by two internal reflections; sources give 50 and 51 | VERIFIED (range), https://www.pas.rochester.edu/~dmw/phy218/Lectures/Lect_73b.pdf |
| Secondary visible when | the sun's elevation is below about 50 degrees (the secondary's top is at 51 minus the sun elevation); so there is a window between sun elevation 42 and 50 where only the secondary shows | COMPUTED from the angle |
| Alexander's dark band | the sky between the bows is darker (no rays are sent to those angles); the sky inside the primary is brighter | VERIFIED (search extract), brightness PLAUSIBLE |
| Width | a primary band is about 1.7 to 2 degrees across (40.3 to 42.3), widened by the sun's 0.5 degree disc; the secondary is wider (about 3 degrees) and fainter | PLAUSIBLE (standard values), UNVERIFIED here |
| Supernumerary bows | faint pink and green bands just inside the primary, from interference; best when the drops are all about the same size, small (about 0.3 to 1 mm), typically at the top of the bow; the bow is also vaguely pale and wide when drops are tiny | VERIFIED qualitatively (search extract: most visible when drops are nearly uniform), sizes PLAUSIBLE |
| Brightness, drop size | drops 0.5 to 1 mm (shower rain) give the brightest, most saturated bows; drizzle under 0.2 mm gives broad pale bows with the red missing, tending to a white fogbow below 0.05 mm; very large drops (2 to 3 mm, thunderstorm) give a narrow, red-green, bright bow with weak blue | PLAUSIBLE (standard), exact limits UNVERIFIED |
| Brightness, sky | a bow is far brighter against a dark background (a grey-black rain curtain) than against pale cloud; direct sun with a clear disc is needed (cloud near the sun kills it) | PLAUSIBLE |
| Polarisation | the primary is strongly polarised; ignore | PLAUSIBLE |
| Full circle | from the air the bow is a full circle; from the ground the horizon cuts it, so a low sun gives a near half-circle (sun at the horizon: exactly a semicircle) | VERIFIED geometry |
| Foot of the bow | the bow has no ground position (it is an angle); it follows you. Under a shower the lit rain shaft ends at the ground, so the visible bow appears to touch the rain's bottom edge | VERIFIED idea |
| Reflection bows | a bow's reflected twin is seen over calm water (rarely) and the sun's reflection makes extra bows; skip | PLAUSIBLE |

What the player must see, in order of importance: (1) the bow sits opposite the sun (it moves as the sun moves, goes down as the sun rises, vanishes at 42 degrees); (2) it only shows where it is raining in that direction; (3) the secondary is fainter with the colours reversed and the dark band between; (4) the sky inside is a bit brighter.

### 1.2 Moonbow and fogbow
| Item | Fact | Tag and source |
|---|---|---|
| Moonbow | the same geometry with the moon as the source; the moon must be below 42 degrees (a lower moon is better), full or nearly, a dark clear sky and rain on the opposite side; it looks white or pale because the eye's night vision does not see colour well (the colours are present in a long exposure) | VERIFIED geometry (https://www.timeanddate.com/astronomy/moonbows.html, https://almanac.com/moonbows), colour claim PLAUSIBLE |
| Fogbow | a white (colourless), broad bow of radius about 38 to 40 degrees, much wider (several degrees up to 10 or more), from fog or cloud droplets smaller than about 0.05 mm, where diffraction smears the colours; often has an outer faint reddish rim and an inner bluish one | VERIFIED (drop size 0.05 mm, https://hyperphysics.gsu.edu/hbase/atmos/fogbow.html and https://www.wikipedia.org/wiki/Fog_bow; the 20 micrometre figure I first tried was not supported) ; radius and fringes PLAUSIBLE |
| When | fog (thin, with the sun shining through, sun elevation below about 40 degrees) seen from a hill or from a boat with the sun behind; common over sea fog in the morning; short lived as the fog thins | PLAUSIBLE |
| Glory | a small coloured ring round your shadow on the fog from above; skip | PLAUSIBLE |

## 2. Sun showers and squalls

### 2.1 Physics
| Item | Fact | Tag |
|---|---|---|
| What a sun shower is | rain falling while the sun is shining; usually from cumuliform clouds (shower clouds) with gaps, from wind carrying rain from a nearby shower, or a passing edge of a rain cloud while the sun sits in a clear gap | VERIFIED (search extracts, https://en.wikipedia.org/wiki/Sunshower) |
| Cause in a cool Atlantic climate | cold polar air over a warmer sea after a cold front: the sea heats the lowest layers, and cumulus and cumulonimbus build, each a few km wide, with clear gaps between; showers are short (10 to 30 min) with a bright sky around | PLAUSIBLE (standard post-front pattern; already in `WEATHER_AND_SKY.md` section 4) |
| Squall | the shower's leading edge: a gust front with a wind jump of 5 to 10 m/s, a sharp rain onset, a drop in temperature of 2 to 4 degrees, often a dark arc cloud (shelf) with bright sun beyond; short, 5 to 30 min | PLAUSIBLE |
| Size and speed | a shower cell is about 5 to 20 km wide and moves with the wind at 8 to 20 m/s; at 12 m/s a cell crosses a 2 km window in about 3 minutes real-world, and passes a place in 15 to 30 min | PLAUSIBLE, COMPUTED |
| Hail and graupel | showers in cold air can bring small hail with a sudden white sea of hail on the ground; skip or later | PLAUSIBLE |
| Bright sun with violent squall | the "sun and showers" day is the signature of our climate; the sea shows a dark squall line and glitter outside it | PLAUSIBLE |
| Wind with showers | the wind veers (turns clockwise) by about 50 to 90 degrees when the cold front passes and gusts in each shower (`weather.js` already veers rain to showers by +0.96 rad) | VERIFIED in code, PLAUSIBLE in nature |

### 2.2 Look
- A grey-blue curtain of rain under a dark cloud base, edges soft, streaks slanted by the wind and sun-lit in white where the sun is behind (backlit rain looks bright); the sky beside the curtain is blue with fair-weather cumulus; shadows of the shower cloud move over the sea; the sea inside the curtain is dull and steel, outside it bright with glitter.
- The state `showers` in `weather.js` has `cover` 0.4, `deck` 0.35, `sunScale` 0.62 and `rain` 0.45: that is already a sun and showers day. The mood adds: the rain curtain as a located cell (not uniform rain), and the bright gap.

### 2.3 Game rule
A "cell" is a pure function of the schedule segment: during a `showers` segment (2 to 4 game hours), the rain curtain is a soft disc moving downwind at `windMs` across the window. Phase `p = (hour - start) / dur`. The cell's centre azimuth is the upwind bearing at p = 0 (cell arriving) and the downwind bearing at p = 1 (cell leaving); with two to four such cells per segment from the key `seed:cell:index`. TUNING. This gives the rainbow its side: it forms in the antisolar direction when a cell is there. In a west wind the cell comes from the west: morning (sun east, the bow in the west) fits the arriving cell; afternoon (sun west, the bow in the east) fits the departing cell: both well-known folk patterns. PLAUSIBLE.

## 3. Crepuscular and anticrepuscular rays
| Item | Fact | Tag and source |
|---|---|---|
| Cause | shafts of sunlight and shadow: cloud gaps let sunlit air (lit haze, dust, droplets) show beside the shadowed air under the cloud; the lit columns are scattered light from the particles | VERIFIED (search extracts, https://atoptics.co.uk/blog/opod-anticrepuscular-rays/ ) |
| Parallel rays | the rays are practically parallel; they appear to diverge from the sun (and converge towards the antisolar point) by perspective, like railway lines | VERIFIED (several search extracts, https://www.scientificamerican.com/article/what-are-crepuscular-rays/ ) |
| Anticrepuscular rays | the same shafts seen on the side opposite the sun, converging to the antisolar point; dimmer than crepuscular rays because backscatter is weaker than forward scatter | VERIFIED (search extract) |
| What is needed | the sun low or through gaps, cloud edges or towers (cumulus, cumulonimbus, a thin altocumulus deck), and hazy or humid air to scatter (clean dry air shows no rays); also fog and mist give strong beams through trees and over the island | VERIFIED idea (extract: no cloud edge or scatter, no rays), conditions PLAUSIBLE |
| When best | sun elevation under 30 degrees, golden hour; also near a shower with the sun in a gap | PLAUSIBLE |
| Angular width | single shafts 1 to 5 degrees wide, spreading over 30 to 120 degrees of the sky | PLAUSIBLE |
| Rays on the ground | in mist or smoke, lit shafts reach the ground (sun through a gap onto the sea: a "searchlight" patch moving across the sea with the cloud shadow) | PLAUSIBLE |
| Moon rays | very faint; skip | |
Visual: a few soft bright wedges from the sun's direction, white-gold, additive, with soft edges and a slow drift following the cloud motion; fade with haze (needs `haze` above about 0.1). Mirror them on the antisolar side at 40 percent strength.

## 4. Halos, sun dogs and the ice crystal types
| Item | Fact | Tag and source |
|---|---|---|
| Where they come from | ice crystals in high thin cloud (cirrus, cirrostratus, at 6 to 10 km in our latitude) or in diamond dust in very cold air; the cloud is thin enough to leave the sun visible, often a milky sky ahead of a warm front | VERIFIED (extract: thin ice cloud, https://www.rmets.org/metmatters/haloes-and-sun-dogs ), heights PLAUSIBLE |
| 22 degree halo | a ring 22 degrees from the sun (inside reddish, outside bluish-white fading), from randomly oriented hexagonal crystals (columns or plates in random orientation); the sky inside the ring is darker | VERIFIED (extract), colour PLAUSIBLE |
| Sun dogs (parhelia) | bright coloured spots on the ring at the sun's elevation, one on each side; from flat hexagonal plates that fall with their large faces horizontal; red toward the sun | VERIFIED (extract) |
| Sun dog position | about 22 degrees from the sun at low sun, moving outward as the sun rises (about 25 degrees at 30 degrees elevation, 29 at 45: UNVERIFIED remembered); azimuth offset from the sun is about 22 / cos(elevation) for a rough game value | UNVERIFIED, COMPUTED |
| Circumzenithal arc | a small, vivid, upturned rainbow-arc high up near the zenith, from the same plates, only when the sun is under about 32 degrees (best near 22) | VERIFIED qualitatively (extract: the same crystals as sun dogs and tied to the sun's elevation), 32 degrees PLAUSIBLE |
| 46 degree halo | rare, fainter and larger, from columns through the prism and base faces; a halo at 46 degrees is often confused with the supralateral arc | VERIFIED (extract) |
| Upper tangent arc, light pillars | from oriented columns and plates; pillars through the sun at sunset (cold air) | PLAUSIBLE |
| Brightness | usually faint: a ring that is a few percent brighter than the sky; sun dogs are the brightest part (as bright as the sun's glare nearly) | PLAUSIBLE |
| Frequency | a 22 degree halo is seen on something like one day in three in temperate lands, mostly unnoticed (a statement I remember; UNVERIFIED) | UNVERIFIED |
| Forecast meaning | a halo often means a front is coming within 12 to 24 h (the old saying; the thickening cirrostratus is the lead of a warm front: VERIFIED as the sequence in `WEATHER_AND_SKY.md` section 4) | PLAUSIBLE |
Game rule: a halo mood runs on the lead-in to rain: the segment before an `overcast>rain` or `fair>overcast` transition, when `cirrus` is above 0.3 (weather.js `cirrus` ranges 0 to 0.8, with 0.8 in clear); sun elevation above 5 degrees; and a keyed draw. The halo is strongest at `cirrus` between 0.3 and 0.7 with no thick deck.

## 5. Frost, sea smoke, first snow

### 5.1 Frost mornings
| Item | Fact | Tag |
|---|---|---|
| Air frost and ground frost | ground frost (surface under 0 C) happens on clear, calm nights when the surface radiates heat to space and cools several degrees below the air; an air temperature near 2 C can give frost on grass and roofs | PLAUSIBLE |
| Conditions | clear (or thin cloud), light wind (under 3 m/s), long night, dry air; cold air drains into hollows | PLAUSIBLE |
| Coastal moderation | the sea around a cool Atlantic island stays about 6 to 10 C in winter and moderates the air, so air frost is uncommon near the shore and ground frost on exposed or upland and low places is more common; frost needs a cold, continental-origin air flow (a northerly or easterly) in a high-pressure spell | PLAUSIBLE; the numbers of frost days are UNVERIFIED (about 15 to 30 a year on an exposed west coast island; I did not find a source) |
| Look | white rim on grass, rocks and boards (not on warm wet sand or the wave-washed shoreline), the first 1 to 3 hours after sunrise; melts first on sunny slopes, stays in shade; breath mist; ice skin on puddles and pools; the sky pale yellow-pink at the low sun; long blue shadows | PLAUSIBLE |
| Game rule | a night flag when: season Nov to Mar (some in Oct and Apr), the weather at the end of the night is `clear` or `fair` with cover < 0.3, wind < 3.5 m/s, plus a pure keyed draw (hash of seed and day); target about 20 frost mornings a year (1 per 18 game days), TUNING | TUNING |
| Fades | until the sun gets about 8 to 12 degrees high, or 1 to 3 game hours after sunrise, whichever first (frost burns off quickly in the sun); in shade longer | TUNING |

### 5.2 Sea smoke (steam fog over the sea)
| Item | Fact | Tag and source |
|---|---|---|
| What it is | steam fog or "sea smoke": very cold air moving over much warmer water; evaporation from the water saturates the cold air above it and the vapour condenses at once into wisps that rise like smoke or steam | VERIFIED (extracts, https://skybrary.aero/index.php/Steam_Fog , https://en.wikipedia.org/wiki/Sea_smoke , https://seagrant.umaine.edu/resource/cold-enough-yet-the-science-behind-sea-smoke ) |
| Temperature difference | sources disagree: rivers and small water bodies show it at 10 C or more colder air than water; larger cases at 20 C; a local forecaster's rule of 30 C difference for the sea; a stable, cold air layer (a surface inversion) is needed | VERIFIED that the sources differ; the game threshold is TUNING |
| Our climate | winter sea about 8 C, so we need air of about -2 C (difference 10) for the faintest wisps to -12 C (difference 20) for thick sea smoke; on a west coast island that happens only in a rare cold snap from the east or north; hence very rare (a few mornings in some winters; UNVERIFIED) | PLAUSIBLE, COMPUTED; the count is UNVERIFIED |
| Wind | needs light wind (under 4 m/s); strong wind disperses it and mixes the air | VERIFIED qualitatively (extracts) |
| Look | low wisps and columns 1 to 10 m (up to 30 m in thick cases) dancing over the water, bright and white with the low sun behind, moving with the wind; the sea beneath looks dark and steaming; the wisps lean into the wind and dissolve upward | PLAUSIBLE |
| Game rule | as frost, but also needs `fair` or `clear` and a cold-snap flag from the macro sea (high pressure above about 1025 hPa and a wind from the north or east sector); target 2 to 4 mornings in a game year, TUNING | TUNING |

### 5.3 First snow dusting
| Item | Fact | Tag and source |
|---|---|---|
| Rain-snow line | precipitation falls as snow when the near-surface wet-bulb temperature is about 1 C or less (a reanalysis study gives about 1.0 C over land and 1.1 C over oceans for a 50 percent chance) | VERIFIED, https://arxiv.org/pdf/1905.07776 and https://escholarship.org/content/qt69s488kq/qt69s488kq.pdf (extracts) |
| Sea level at a cool Atlantic coast | the warm sea makes snow at the shore less common and less lasting than inland and uphill: it falls with cold north and northwest air behind a cold front (showers off the sea, often sleet and hail mixed), or with an east wind from a cold continent; a dusting often melts within hours; lasts longest on roofs, grass tips and post tops, not on the wet sand, the rock at the tide line or the sea | PLAUSIBLE |
| Season | the first flakes usually come between November and January (a rough statement; sea-level days of lying snow are few: UNVERIFIED about 5 to 15 a year on this kind of coast) | PLAUSIBLE, UNVERIFIED count |
| Look | big flakes (5 to 15 mm) falling slowly (about 1 m/s, against 5 to 9 m/s for rain) and drifting with the wind; visibility 0.5 to 3 km; light dusting reads as a thin white film on up-facing surfaces with the dark grass showing through; the sea stays dark against the white land; the sky is a uniform grey-white, the light flat and bright (snow reflects), sound is quiet | PLAUSIBLE |
| Game rule | a snow mood when: the date is in the cold season (Nov to Mar, TUNING), the state is `showers` or `rain` (as precipitation), the temperature proxy is cold (see below) and wind is from the north sector (about 300 to 40 degrees); the dusting amount accumulates by the hour while it falls (0.1 per game hour, TUNING), melts at 0.25 per game hour in sun, 0.08 per game hour in cloud, and is masked by wetness near the tide line | TUNING |
| Temperature proxy | `weather.js` has no air temperature. Add a pure function: `T(doy, hour, state, wind) = Tmean(doy) + diurnal(hour) + airmass(wind direction) + clearNightCooling`, with `Tmean` about 4.5 C in January and 13.5 C in July (a cool Atlantic island; PLAUSIBLE, from my memory of coastal station normals), diurnal plus and minus 2 C, airmass -3 C for north and northeast, +2 for southwest, clear night cooling -3 C, all TUNING | TUNING |
| Hail and graupel | a white hail layer in cold squalls melts quickly; skip at first | PLAUSIBLE |

## 6. Post-storm clearing, wet-shore glitter and mist burning off

### 6.1 Post-storm clearing (the "washed" day)
| Item | Fact | Tag |
|---|---|---|
| Sequence | after the cold front: pressure rises, wind veers northwest and eases, showers fade, the cloud breaks into bright cumulus with big blue gaps; visibility is excellent (40 km or more, the air is clean after rain: aerosols washed out) and colours are saturated | PLAUSIBLE (standard; same sequence as `WEATHER_AND_SKY.md` section 4 and `CLOUD_ATLAS.md`) |
| The sea | the swell of the storm lasts for many hours after the wind drops (long period waves from the storm keep arriving: `MACRO_SEA.md`), so the sea is still big while the sky is lovely; breakers on rocks throw spray that glows against the sun | VERIFIED by `MACRO_SEA.md` physics (swell arrival), PLAUSIBLE visually |
| The shore | wet dark sand and rocks, kelp and wrack thrown up, pools, shining tidal flats | PLAUSIBLE |
| Game hook | the transition `storm>showers` and `showers>fair` (weights in `weather.js`: storm to showers 5, showers to fair 4, fair then clear) plus the macro sea's swell above its calm value; mood strength = swell remaining (a decay with 12 h time constant: TUNING) times clearness |

### 6.2 Wet-shore glitter
| Item | Fact | Tag |
|---|---|---|
| Wet surface | a thin water film on sand or rock reflects the sky and the sun like a mirror (specular), far more at low angles of view: Fresnel reflectance of water is 2 percent at normal incidence and about 10 percent at 70 degrees, 35 percent at 80 degrees, 100 percent at 90 degrees from the normal | VERIFIED physics (standard Fresnel numbers; the search did not confirm; PLAUSIBLE) |
| When | a wet beach appears as the tide falls, or after rain; the film drains and sinks into sand in minutes, the sand dries within an hour in sun and wind, rocks in hours, thick kelp and pools stay wet | PLAUSIBLE |
| Look | long bright streaks and mirrored sky and rock on the flats with a low sun behind them; rock faces shine; spray glints; the road of glitter on the sea toward the sun (existing `glit` term in `weather.js`: golden hour 1.8, clear 1.0, rain 0) | PLAUSIBLE |
| Game rule | the `wet` parameter already exists (0 to 1, rain 1.0, showers 0.55). Mood: after rain stops, `wet` decays with a time constant of 1.5 game hours in sun and 3 in cloud, while a new strip of wet appears as the tide falls (the existing tide level); glitter strength = wet x (1 - sun elevation / 60) x sun visible, and the sun must be behind the shore from the viewer (low sun, 3 to 30 degrees) | TUNING |

### 6.3 Mist burning off
| Item | Fact | Tag |
|---|---|---|
| Fog types | radiation fog or mist forms on clear calm nights over land, in hollows and over damp fields; advection (sea) fog or haar forms when warm moist air flows over cold sea and is much more persistent | VERIFIED (`WEATHER_AND_SKY.md` section 6) |
| Burning off | after sunrise the sun warms the ground and the lowest air; the fog base lifts, the fog becomes low stratus, thins to patches, then goes, typically 1 to 3 hours after sunrise for radiation fog in autumn, longer in winter; sea fog does not burn off from sun alone over the cold sea, only a change of wind or warmer water does | PLAUSIBLE |
| Look | sun a soft white disc in the mist (`sunScale` 0.3 in fog), the light bright and diffuse, blue sky showing as a circle overhead first, shafts of light through the thinning mist (strong crepuscular rays), a fogbow possible on the fog opposite the sun, the island's tops appear first and the sea fog withdraws from the land edge; colours return; dew shines; the far shore appears | PLAUSIBLE |
| Game rule | an extra phase at the end of a fog segment when the sun is up and the wind is under 3 m/s: lengthen the fog to fair/clear blend to 1 to 3 game hours (the weather.js blend is 0.4 h); strength `1 - k`, with `fogD` decaying from fog 0.0058 toward fair 0.0004; stronger the lower the sun; suppressed if the wind picks up beyond 6 m/s (fog lifts abruptly) or if sea fog flag is set | TUNING |

## 7. Clear starry nights and aurora
(`SKY_CLOCK.md` section 7 holds the star field, circumpolar stars and the first aurora notes; this section adds the weather gate.)
| Item | Fact | Tag and source |
|---|---|---|
| Star night | clear (cover under 0.2) and a new or small moon; the Milky Way best in autumn and winter evenings away from the moon; the naked eye reaches magnitude about 6.5 in dark clean air; the long winter night (17 h) gives many hours; the midsummer night never gets dark (sun above -9.1 degrees at 57.5 N) | PLAUSIBLE; midsummer VERIFIED in `SKY_CLOCK.md` |
| Moon gate | a bright moon (above about 40 percent lit and high) washes out all but the brightest stars and the aurora; new moon is at game hour 0 in `macro_sea.js` | PLAUSIBLE |
| Aurora at our latitude | seen from the far north of Scotland every few months on average, less often further south (BGS wording) with sources disagreeing on the Kp needed: about Kp 5 for Shetland and Kp 6 for Orkney and the north mainland in one guide, while another tool says from Kp 3 for Shetland and the Outer Hebrides | VERIFIED that the sources differ, https://geomag.bgs.ac.uk/education/viewing_aurora.html and https://auroraforecast.me/guides/northern-lights-scotland |
| Typical look at this latitude | a pale green-grey glow low on the northern horizon, sometimes with rays and a purple or red top edge in big storms, hardly any colour to the eye except in strong events, moving slowly; on camera much brighter | PLAUSIBLE |
| Frequency for the game | 5 to 15 nights a year around solar maximum, fewer at minimum (`SKY_CLOCK.md`, TUNING); with the clear-sky gate and darkness gate this leaves about 2 to 6 sightable nights a year; the 11 year cycle can be a seed-keyed phase | TUNING |
| Season | near the equinoxes in the dark half (September to March); impossible in the June twilight | PLAUSIBLE |
| Game rule | per night: `p = base(season) x cycle(seed)`, with `base` 4 percent from October to March and 0 from May to July, a keyed draw `hash(seed, day)`; the night must be clear/fair with cover under 0.3 and darkness (sun below -12 degrees); a rare treat with a short in-game line; never with a bright moon |

## 8. State table (sky moods)
"Schedule hook" = which `weather.js` segment or transition and which clock/macro inputs open it. All are overlays: the 8 states are unchanged. "Cost" is for one draw on the highest tier.
| Mood | Needs from the schedule and macro | Needs from the sky clock | Look | Cost (triangles / shader) |
|---|---|---|---|---|
| Rainbow (single) | `showers` segment or the blend `rain>showers`, `showers>fair`; a rain cell on the antisolar side (section 2.3); `cover` under 0.7 and the sun disc not blocked; keyed draw to reach 10 to 15 percent of days | sun elevation 1 to 40 degrees (top of bow = 42 - elevation); sun azimuth gives bow centre | arc 40 to 42 degrees, brightness by the rain mask, bright sky inside, darker band outside | 0 / +25 ALU per dome pixel |
| Double rainbow | as above and a heavier cell (rain 0.4 or more) and sun elevation under 38 degrees (so the secondary, top at 51 - elevation, clears the horizon by 13 degrees) | same | adds the 50 to 53 degree reversed arc at 40 percent brightness and the dark band | +10 ALU |
| Supernumeraries | rainbow with sun under 20 degrees and small uniform drops (a drizzle shower); tier high only | same | faint bands inside the violet edge | +8 ALU |
| Sun shower | `showers` segment, cell overhead, sun elevation above 5 degrees and the sun disc clear: `sunScale` kept above 0.8 during the cell | sun direction | rain streaks backlit white, bright sea outside the cell, dark inside; warm light | uses existing rain; a sun term; no extra triangles |
| Squall line | `showers`, `rain>showers` veer, wind jump of 5 m/s at the cell's leading edge (wind from `weather.js` gust) | none | dark arc cloud and a dark water strip, whitecaps rise | existing cloud puffs and sea; +8 ALU |
| Crepuscular rays | `fair` or `showers` with `cover` 0.3 to 0.7 and haze above 0.1; or `fog` ending; sun in a gap | sun elevation under 35 degrees | wedges of warm light from the sun, drifting | 12 to 24 triangles, 6 to 12 cards |
| Anticrepuscular rays | same, evening with the sun low | sun under 15 degrees | pale wedges converging to the antisolar point | 12 triangles |
| 22 degree halo | cirrus 0.3 to 0.7 with no deck, in the segment before `overcast>rain` or `fair>overcast`; keyed draw | sun elevation 5 to 55 degrees | faint ring radius 22 degrees, reddish inside | 0 / +12 ALU |
| Sun dogs | with a halo, plates; sun under 45 degrees | same | two bright spots at 22 / cos(el) degrees azimuth offset | two sprites |
| Circumzenithal arc | with sun dogs, sun under 32 degrees | same | small bright arc overhead | +10 ALU or 16 triangles |
| Fogbow | `fog` or a fog-lift phase with the sun visible; fog thin (visibility over 200 m) | sun elevation under 40 degrees | white broad arc at 38 degrees | +15 ALU |
| Frost morning | night ended in `clear` or `fair`, wind under 3.5 m/s, cold season, keyed draw | sunrise, melt by sun elevation | white rim on up-facing surfaces, rime on boards, blue shadows | 0 / one tint term in the land shader |
| Sea smoke | frost conditions plus a macro cold-snap (high pressure, north or east wind), a rarer draw | low sun | rising wisps over the sea | 100 to 300 sprites or a particle layer |
| First snow dusting | cold season, `showers` or `rain`, north sector wind, temperature proxy under 1 C wet-bulb | none | white on tops, particles, flat light | particles 300 to 1200; tint term |
| Post-storm clearing | the transition `storm>showers>fair`, swell above calm | any daytime | big sea, bright sky, saturated colour, spray glow | no extra |
| Wet-shore glitter | any dry moment after rain; falling tide; low sun | sun elevation 3 to 30 degrees | mirror streaks on flats, shining rock | 0 / +6 ALU in the land and sand shaders |
| Mist burning off | end of a `fog` segment (radiation kind), sun up, wind under 3 m/s | sun elevation rising | lifting bright mist, rays, then blue | extends the existing blend (no new cost) |
| Clear starry night | `clear` or `fair`, cover under 0.2, night | sun under -12, moon phase low | stars, Milky Way | the star points (`SKY_CLOCK.md`) |
| Aurora | as star night, season and a keyed draw, the moon not bright | night | green glow low in the north | one dome term or 2 cards: +20 ALU |
| Moonbow | `showers` at night with the moon above 60 percent, below 42 degrees; very rare keyed draw | moon elevation and phase | pale white arc | the rainbow term at 8 percent |

### 8.1 Measured frequency of the raw conditions (COMPUTED in this session)
A node run over `weather.js` schedules (200 seeds x 40 days, my own sun elevation formula for 57.5 N, declination from day of year):
| Quantity | Result |
|---|---|
| State shares over time (game hours) | fair 33.5 percent, overcast 22.7, rain 14.6, showers 9.6, clear 9.2, fog 5.2, storm 3.9, goldenhour 1.4 |
| Days with at least one `showers` segment | about 60 percent |
| Days with a shower during hours when the sun is between 2 and 40 degrees | 25.5 percent (21 Dec), 38.8 (20 Mar), 42.9 (21 Jun), 38.5 (22 Sep) |
| Hours per day with the sun above the horizon and below 42 degrees | 6.3 h (21 Dec), 11.9 (20 Mar), 11.4 (21 Jun and 1 May); sun noon altitude 9, 32, 56, 47 degrees |
Meaning: showers are frequent in the current schedule (60 percent of days), so rainbow opportunities are already plentiful; the gate that cuts them to a treat is the geometry (a cell on the antisolar side, about a third of cases), the clear sun disc, and a keyed draw. The cell-side gate (about 0.35) and the clear-sun gate (about 0.7) alone cut raw 25 to 43 percent to about 6 to 11 percent of days; the keyed draw is then set near 1 to 1.4 of that (a tuning knob) to land at 8 to 15 percent. TUNING. In a cloudy mid-winter the sun is below 9 degrees all day so a bow reaches 33 degrees high at noon (COMPUTED 42 - 9.1). The note does not claim the real frequency; TUNING.

## 9. Cheap rendering recipes (three.js r128, the existing dome in `weather.js`)

### 9.1 Rainbow arc on the sky dome
The sky dome in `weather.js` already has `uSun` (sun direction), so the arc needs no new geometry. In the dome's fragment shader:
```
vec3 A = -normalize(uSun);                    // antisolar direction (points below the horizon)
float th = degrees(acos(clamp(dot(dir, A), -1., 1.)));   // angle from the antisolar point
// primary 40.2 to 42.4, violet inside, red outside
float t = clamp((th - 40.2) / 2.2, 0., 1.);
float pri = smoothstep(40.0, 40.4, th) * (1. - smoothstep(42.2, 42.6, th));
vec3 spec = hsv2rgb(vec3(mix(0.78, 0.0, t), 0.85, 1.0));   // violet to red
// secondary 50.3 to 53.5, reversed
float t2 = clamp((th - 50.3) / 3.2, 0., 1.);
float sec = smoothstep(50.0, 50.6, th) * (1. - smoothstep(53.2, 53.8, th));
vec3 spec2 = hsv2rgb(vec3(mix(0.0, 0.78, t2), 0.7, 1.0));
float band = smoothstep(42.4, 43.2, th) * (1. - smoothstep(49.6, 50.4, th));   // Alexander's band
float inner = 1. - smoothstep(38., 42., th);                                    // brighter inside
// the rain mask: soft azimuth window around the rain cell and an elevation fade
float rain = uRbMask(dir);                    // 0..1, from the cell (see 2.3)
col += rain * (pri * spec * uRb1 + sec * spec2 * uRb2);
col *= 1. - 0.12 * band * rain;
col += 0.04 * inner * rain * col;
```
- Parameters: `uRb1` primary strength 0.25 to 0.5, `uRb2` secondary 0.4 times that, the rain mask from a cell azimuth and width (uniforms `uCellAz`, `uCellW`) and the curtain's darker patch to give contrast. Sun elevation fades the whole term to zero as elevation passes 42 (`smoothstep(44, 40, sunEl)`), and the secondary at 50. Multiply by the sun's visibility (`1 - deckDark` and not behind a cloud: `sunScale` above 0.6).
- Over the island and the sea: the arc is drawn on the sky only. Because it is part of the dome it is hidden by terrain automatically, and the rain shaft's bottom edge can be a soft bright floor.
- Cost: acos, 6 smoothsteps and one hsv: about 25 ALU per sky pixel (35 with the secondary), no triangles, no draw calls; run it only when `uRb1 > 0` (a uniform branch). Supernumerary: add `0.05 * sin((40.0 - th) * 9.0)` inside 37 to 40 degrees: +8 ALU.
- If the rainbow must stand against the sea in front of the island, add a mild brightening of the rain curtain sprites by `rain` (no change to the sea).
- Alternative for a static page: a torus ring of 96 segments (192 triangles) with a vertex-coloured spectrum, additive, centred on the antisolar axis at 5 km. Worse (clipping, aliasing) than the shader; use only if the dome is not accessible.
- Moonbow: the same term with the moon vector, strength 0.08, colour desaturated 70 percent.
- Fogbow: the same code with `th` around 36 to 40 degrees, width 6 degrees, white, strength 0.2 and the mask from fog density (`1 - exp(-fogD...)`).

### 9.2 Rays (crepuscular and anticrepuscular)
- A ray card: a quad 1 x 8 (game units scaled to the sky), additive, with a texture-free vertical gradient (alpha rising from the cloud edge, falling to zero at the far end) and a lateral soft profile; 6 to 12 cards fanned from a point near the sun direction at 20 to 40 degrees spread, each with a slow sway (`sin(t * 0.07 + id)`) and an alpha scaled by `haze` and the golden hour term. One draw (instancing the 12 cards, or merging them into one mesh).
- Anticrepuscular: the same cards pointing at the antisolar point, 40 percent strength.
- Triangles: 2 per card, 12 to 24 for the set. Shader: 8 ALU. In fog, scale up the alpha (mist makes shafts stronger).
- For shafts through a window of cloud onto the sea: a "light patch" quad on the sea surface moving with the cloud shadow (the cloud shadow code exists in `weather.js`); invert the shadow to make a bright disc: +0 triangles (sea shader term).

### 9.3 Halo, sun dogs and arcs
- Halo: in the dome shader, with `ang = acos(dot(dir, sunDir))` in degrees: `ring = smoothstep(21.0, 22.0, ang) * (1.0 - smoothstep(22.4, 25.0, ang))` with a reddish inner edge and a white outer fade, strength 0.06 to 0.12 times `cirrus` and a mask by `deck` low; `+12 ALU`. The sky inside the ring is darkened by 3 percent.
- Sun dogs: two additive sprites (Sprite with a radial gradient with a small horizontal streak) at azimuth offset 22 / cos(elevation) degrees from the sun at the sun's elevation, red toward the sun: 4 triangles.
- Circumzenithal arc: one thin ring segment near the zenith, as a dome term `(abs(ang_zenith - (90 - 32)) < 2)`, only for sun under 32 degrees; +10 ALU; skip on handheld.

### 9.4 Frost, snow, wet, mist
- Frost: a tint in the land and rock shader: `col = mix(col, vec3(0.88, 0.93, 1.0), frost * smoothstep(0.55, 0.8, normal.y) * (1 - wetShore) * shadeFactor)`; sparkle term from a cheap hash noise at sub-pixel scale with a view-dependent flicker (glints 0.1); melt boundary follows sun-lit slopes first. Cost: +8 ALU on land only, zero triangles. On boards and roofs the same tint with the roof normal.
- Snow dusting: the same with `smoothstep(0.35, 0.7, normal.y)` and a noise threshold so dark grass tips show through at thin cover; add white flake particles: 300 to 1200 point sprites in the weather box (the existing rain instancing path in `weather.js` can be reused with slower fall, wider quads and a swirl term), alpha 0.7, fall 1 m/s, which is fewer than the 1,800 rain streaks. Tint is the main cost: +10 ALU.
- Wet-shore glitter: in the sand and rock shader increase specular and darken the albedo by 20 percent where wet; add a sky-colour reflection term with Fresnel `0.02 + 0.98 (1 - cos)^5`; +10 ALU; a stretched sprite glitter column toward the sun.
- Mist lifting: existing fog density and sky colours with a longer blend; add a ground-fog layer (a flat quad pair at y = 3 m with a noise texture, 2 triangles, alpha by `fogD`) that rises and thins; the sun shafts from 9.2. Cost small.
- Sea smoke: 100 to 300 particle sprites (soft, 8 to 30 m high in game scale) over the sea surface, with a slow upward drift and wind lean; additive white, bright when the sun is low; alternatively a stack of 3 to 5 noise quads at heights of 0.5 to 6 m with scrolling; 12 to 40 triangles. Particle count halves on handheld low.
- Aurora: a dome term in the northern sector: a green-grey arc band between elevations 5 and 25 degrees, slowly moving vertical streaks (`sin(az * 14 + t)` with a vertical fade) and a pale red top at high activity; alpha 0.05 to 0.2; +20 ALU, skip in the low tier.
- Stars: handled in `SKY_CLOCK.md` (Points).

### 9.5 Tier budget (TUNING)
| Tier | Rainbow | Rays | Halo, dogs | Frost, snow | Sea smoke | Aurora |
|---|---|---|---|---|---|---|
| T0/T1 | primary, secondary, band, supernumerary | 12 cards | ring, 2 dogs, CZA | tint plus sparkle, 1200 flakes | 300 sprites | full |
| T2 | primary, secondary | 8 cards | ring, 2 dogs | tint, 800 flakes | 150 | simple band |
| T3, T5 | primary only | 4 cards | ring | tint only, 300 flakes | 60 | off or a glow |
| T4 AR | table arc (below) | 2 to 4 shaft cards | skip | frost rim and dusting tint, 200 flakes | skip or 40 | skip |
A rule from `MODES_AR_DESKTOP_HANDHELD.md`: post-processing is off in AR and low tiers; every item above is a material term, a sprite or a card, none is a screen-space effect.

## 10. The AR version (no sky dome)
In AR the room is the sky: a real ceiling or the real sky through a window, and the game has no dome (the sky and sun shader are off or kept as a backdrop behind a window, `SKY_CLOCK.md` section 10). The sun direction comes from the WebXR light estimate (or straight up as the fallback, with no direction); so effects that depend on the antisolar angle need a table-scale stand-in:
| Effect | Table-scale version | Notes |
|---|---|---|
| Rainbow | a half-torus arc of radius about 0.6 to 0.9 of the table width standing at the table edge on the side away from the estimated light direction, thickness 1 to 2 cm, vertex-coloured spectrum, additive, alpha pulsing slowly; only when the weather says showers-with-sun; it arcs over the island like a toy arch; or skip | 96 to 192 triangles; the geometry is false (the real bow would be at 42 degrees, which is much bigger than the table) |
| Double rainbow | a second thinner arc, reversed colours, 20 percent larger | +96 triangles |
| Light shafts | 2 to 6 vertical additive cards above the table, slanted along the estimated light direction (or 15 degrees from vertical), cutting through a small cloud puff; alpha 0.1 to 0.25 | works with mist and fog on the table |
| Rays on the sea | the bright cloud-shadow-patch term on the sea (no new geometry) | already works |
| Halo, sun dogs, CZA, moonbow, fogbow | skip | the sky is not drawn |
| Aurora | skip, or a faint green glow on the table's far edge in a dark room | skip first |
| Stars | a small dome of points around the table (0.6 m radius) only in a dim room | skip first |
| Frost rim, snow dusting, wet glitter, mist, sea smoke | full (they are on the island) | the real light colour tints them: allow for a bright room by using stronger white and larger flakes (2 to 4 mm on the table) |
| Rain | rain sheets at table scale (existing instancing with larger streak width) | in AR particles at 25 percent |
Dust: in AR the real light is the light; do not turn night effects on from the clock (see `SKY_CLOCK.md`). If a real light direction is missing, put the arch where the weather's wind blows toward (just for consistency).

## 11. Interactions
| Layer | Link |
|---|---|
| Sky clock | sun elevation and azimuth are the key for the rainbow, rays, halos, glitter and frost melt; moon phase for stars, aurora and moonbow; season for frost and snow; twilight for stars and aurora |
| Weather (`weather.js`) | the segments and blends are the gates; `cover`, `deck`, `cirrus`, `haze`, `sunScale`, `wet` are the knobs; no new Markov states |
| Macro sea | storm tracks and pressure give clearing, the cold snap, the swell after a storm; wind direction gives the side of the cell; tide level gives the wet strip |
| Flow and sea | glitter, spray; the sea shader's `glit` term; smoke over water |
| Wildlife | birds and seals sing, feed and haul out in frost and sun after a storm (see `WILDLIFE.md`); a frost morning makes flocks gather at the shore (TUNING); a starry night: owls and sea sounds; aurora: silence |
| Crops and the village | frost can nip crops (a rare, gentle event, not a punishment); first snow gives a quiet day indoors and a warm window glow (`LIGHT_FOG_AND_LIGHTHOUSE.md`) |
| Light and the lighthouse | fog glow and halo physics are shared; a clear night with a light's beam is the best night for arrivals; the aurora and a lamp make a rare postcard; sea smoke and fog both hide beams |
| People and boats | a rainbow or a frost morning changes moods (mood layer, see the moods lines in section 13) |
| Ledger | none of this writes to the ledger; moods are pure and replayable from `(seed, hour)`; a first sighting can be a ledger note with an idempotent key `seed:mood:day` |

## 12. Common mistakes
1. A rainbow in the wrong place: it must be opposite the sun (the antisolar point), not in front of the sun; flip it when the sun azimuth changes.
2. A rainbow with the sun above 42 degrees (it is below the horizon) or at noon in June; a bow centred on the horizon when the sun is high.
3. A rainbow with no rain on its side, or with rain over the viewer and no sun.
4. A rainbow as a hard multicolour sticker: it is a soft, translucent band, brighter against a dark curtain, with the sky brighter inside and a dark band between the primary and secondary.
5. A wrong colour order: the primary is red outside, the secondary is red inside.
6. A secondary as bright as the primary (about 40 percent or less, 20 percent common) or at the same radius.
7. A full circle over a flat sea at high sun.
8. A rainbow that follows the sun at the same elevation; the bow moves down as the sun rises.
9. Rays that radiate from points in the middle of the sky: they come from the sun (converging by perspective); the cards are parallel and just look like they diverge.
10. Crepuscular rays in clean dry air with no cloud edge.
11. A halo at 22 degrees that is a thick coloured ring or a bright disc: it is faint, with red inside.
12. A halo in thick cloud or in clear sky; it needs thin ice cloud.
13. Sun dogs above the horizon but not at the sun's elevation (they sit at the same elevation).
14. Frost on warm wet sand, on the sea or on the sunny slope at noon; or frost in July.
15. Snow on the sea; snow that stays on the shoreline; thick snow at sea level on a mild coast; snow falling fast like rain.
16. Sea smoke in mild air (needs a very cold air and a big temperature difference); sea smoke in a gale.
17. Aurora with a bright moon, in June, or as a rainbow-coloured show on the zenith; at this latitude it is a low, pale glow with the odd ray.
18. Stars with cloud cover, or stars visible by day, or the Milky Way in June night twilight.
19. Wet shore glitter at noon with a high sun (the mirror needs a low angle).
20. A beautiful weather mood every few minutes: it must be a treat (a few times a game week at most) and tied to causes.
21. Screen-space tricks in AR.

## 13. Visual and behavioural checklist
- Geometry: for 20 random (sun azimuth, elevation) pairs, the bow's centre is `-sunDir`, the top of the red edge is at 42.4 minus elevation, and nothing is drawn if the elevation is above 44 degrees; the secondary top is at 51 minus elevation, drawn only if positive.
- Colour: primary red outside, secondary red inside; the band between is darker than the sky by 5 to 15 percent; the sky inside is a little brighter; the bow is semi-transparent (the island and cloud show through).
- Cause: the bow shows only inside a rain cell; with no cell no bow (sheet column "no rain"); with a cloud over the sun, no bow.
- Season: a summer noon has no bow; a winter noon has a bow at low height (about 33 degrees at noon in December).
- Halo: ring at 22 degrees radius, faint, sun dogs at the sun's elevation, never with rain or `deck` above 0.3.
- Frost: only on up-facing, cold, shaded or recently dark surfaces; gone by mid-morning in sun; absent in the warm season.
- Snow: dusting on tops, none on the sea, melts in sun; flakes slow.
- Sea smoke: only in a cold snap with a calm morning, low and wispy.
- Clearing: the sea is still big while the sky is clear.
- Mist: blue circle first overhead, shafts, then the far shore.
- Aurora: low, north, pale green, rare; never in summer, never with a full moon.
- Frequency: over 100 game days, rainbows 8 to 15 days, frost mornings about 5 (in winter months 10 to 25 percent of nights), first snow 0 to 3, aurora 0 to 2 in the dark season, sea smoke 0 to 1: a table of counts.
- Budget: each mood adds under 1 ms on desktop and is skipped on T3 and T5 as the table in 9.5 says.

## 14. What is faked
- The weather has no real temperature, humidity or dew point; the frost, snow and smoke tests use a proxy built from the date, the state and the wind.
- Rain cells are discs on a track, not a radar field; the rainbow is not computed from a drop-size distribution (only by the simple band and brightness controls); the supernumerary bands are a sine.
- The bow's brightness is an art control, not a spectral calculation.
- Halos use a ring at the right radius but not the crystal orientation physics; sun dog azimuth is a rough rule.
- Aurora is a coloured band, not a physical curtain.
- Snow depth is a per-surface number; no drifting; no melt water.
- Sea smoke is sprites, not a heat and mass model.
- The AR rainbow is a toy arch at table scale, not at 42 degrees.
- Real places and dates are not used; one latitude (57.5 N) for the sun and the numbers.
- The year is compressed: moods are keyed by game day; the frequency counts per real hour of play are therefore higher than in nature unless the keyed probabilities are adjusted.

## 15. What to ask the town's models (text only)
Short sky-mood lines, 6 to 16 words each, plain, hopeful, no brands, no real place names, one image per line, in two registers (field notes and a child's voice). For each mood, 10 lines:
1. rainbow (single), double rainbow, a rainbow with a dark squall behind it, a faint rainbow in drizzle;
2. sun shower, squall arriving, squall leaving, a bright sea beside a dark curtain;
3. rays through cloud at evening, rays over the sea, rays in mist;
4. a ring round the sun (and a note of what it might mean for tomorrow), sun dogs;
5. a frost morning, breath in the air, frost on the boat, the pool with a skin of ice;
6. sea smoke at dawn;
7. the first snow on the roofs and not on the sea;
8. the sky washed clean after a storm, a shining shore, the sea still heaving;
9. mist lifting, a hill appearing, the far shore coming back;
10. a clear starry night, a night with the northern glow;
Return as JSON lines with `key` (mood name plus index) and `text`; reject lines over 20 words or with any real name. These feed a mood line shown for a few seconds when a mood begins (a first-time-seen line, then silence), and may be the bottle messages too. A weather omen line (for the halo) may hint but never promises.

## 16. Staged build plan and tests
Stage 0 (no art, pure code, headless): a `moods(seed, hour, weather, sun, moon, date)` function returning strengths for each mood; no drawing. Tests:
1. Sun and rain geometry: for a grid of sun elevations 0 to 70 and azimuths, the rainbow strength is zero for elevation above 42.4, the arc centre equals the antisolar direction, the top at 42.4 minus elevation, and the secondary appears only for elevation under 51 (an exact check on the numbers in 1.1).
2. Cause gates: no bow when the state is `clear` at night, in `fog` (fogbow instead), or `storm`; with a `showers` cell on the sun side, no bow (the geometry mismatch).
3. Frequency over 200 seeds x 100 days: the counts in the checklist; determinism (same seed and hour, same result, any call order); no mood when the date is outside its season (no frost in July, no aurora in June).
4. Halo: only when `cirrus` is within range and the segment precedes a front.
5. No two rare treats on the same night.
Stage 1: the rainbow term in the dome shader and a sheet at fixed sun angles (10, 20, 30, 40, 45 degrees) with rain mask on and off; compare the checklist; then the sun shower look (backlit rain, bright sea). A sheet of states: a grid of moods (rows) against desktop, low and AR mock (columns) saved to `shots/`.
Stage 2: rays, mist lifting, wet glitter, post-storm clearing (all use existing rain, fog and sea terms).
Stage 3: frost and snow tint in the land shader with the temperature proxy; flakes.
Stage 4: halo, sun dogs, stars, aurora; sea smoke.
Stage 5: AR table-scale arch and shafts; tier pass on device; the town's text lines.
Each stage ends with the sheet and the headless counts; nothing is locked.

## 17. Minimal first build (10 lines)
1. A pure `moods()` function with rainbow, sun shower, rays, frost, wet glitter and mist lifting only.
2. A rain cell function from a `showers` segment (arrive, pass, leave) with a bearing.
3. One rainbow term in the dome shader (primary and secondary and band) from `uSun`.
4. Gates: sun elevation 1 to 40, rain cell on the antisolar side, `sunScale` above 0.6, keyed draw.
5. Test: geometry grid and a 200-seed frequency run (target 10 to 15 percent of days).
6. Rays: 8 additive cards, sun side only, with haze scaling.
7. Frost: one tint term in the land shader, dark half of the year, melt by sun.
8. Wet glitter: a decay of `wet` and a Fresnel term in sand and rock.
9. Mist lifting: stretch the `fog` to `fair` blend to 1 to 3 game hours when the sun is up.
10. A sheet of moods; AR gets a table-scale arch and frost rim only; the rest skipped.

## 18. Could not verify (do not rely on)
- Rainbow brightness against drop size and the exact limits of drop sizes (0.2, 0.5 to 1, 2 mm).
- Primary band width (about 1.7 to 2 degrees) and the secondary's brightness ratio.
- Sun dog angle as the sun rises (22 to 29 degrees): remembered.
- The circumzenithal arc's 32 degree limit: remembered (the search confirmed the arc and a 32 degree limit for supralateral arcs).
- How often halos occur ("one day in three").
- Real frost days, snow days and sea smoke mornings per year on a west coast island at 57.5 N.
- The temperature difference needed for sea smoke over the sea (sources gave 10, 20, 30 C).
- Aurora frequency and the Kp needed at this latitude (sources conflicted: Kp 3 to 6).
- The `Tmean` numbers (4.5 C in January, 13.5 in July) for a cool Atlantic island: remembered from station normals.
- The wet-bulb snow line for sea-level coasts under showers (the reanalysis value is a global average).
- Fresnel reflectance numbers (standard; not fetched).
- The speed of flakes and rain drops; shower cell sizes and speeds.
- Mist burning-off times.
- Whether moonbows are really colourless to the eye (widely stated).

## 19. Sources (search extracts; full pages not read unless stated)
- https://cloudatlas.wmo.int/en/primary-rainbow.html (primary bow 40 to 42 degrees, elevation limit)
- https://www.pas.rochester.edu/~dmw/phy218/Lectures/Lect_73b.pdf ; https://physicsworld.com/a/the-subtlety-of-rainbows/ ; https://hyperphysics.gsu.edu/hbase/atmos/rbowpri.html (secondary, drop size, supernumerary)
- https://hyperphysics.gsu.edu/hbase/atmos/fogbow.html ; https://www.wikipedia.org/wiki/Fog_bow (fogbow drop size)
- https://www.timeanddate.com/astronomy/moonbows.html ; https://almanac.com/moonbows (moonbow)
- https://en.wikipedia.org/wiki/Sunshower (sun shower)
- https://www.scientificamerican.com/article/what-are-crepuscular-rays/ ; https://atoptics.co.uk/blog/opod-anticrepuscular-rays/ ; https://www.wikipedia.org/wiki/Anticrepuscular_rays (rays)
- https://www.rmets.org/metmatters/haloes-and-sun-dogs ; https://www.atms.unca.edu/cgodfrey/courses/atms455/ppt/halo.pdf ; https://en.wikipedia.com/wiki/Sundog (halos, crystals)
- https://skybrary.aero/index.php/Steam_Fog ; https://en.wikipedia.org/wiki/Sea_smoke ; https://seagrant.umaine.edu/resource/cold-enough-yet-the-science-behind-sea-smoke (sea smoke)
- https://arxiv.org/pdf/1905.07776 ; https://escholarship.org/content/qt69s488kq/qt69s488kq.pdf (wet-bulb snow threshold)
- https://geomag.bgs.ac.uk/education/viewing_aurora.html ; https://auroraforecast.me/guides/northern-lights-scotland (aurora)
Licences: facts only; nothing quoted; all text is ours.
