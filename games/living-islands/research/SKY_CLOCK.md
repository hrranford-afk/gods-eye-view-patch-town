# Sky clock: one game clock for sun, moon, tide, stars, light

Do not put real place names into game code, assets or recipes.

Plain-words research for the Living Islands sky and night pass. Tags: VERIFIED = read in a source this session; PLAUSIBLE = standard astronomy or oceanography from memory, not read here; UNVERIFIED = could not check; TUNING = our design number. COMPUTED = I ran the formula in Python this session (my own arithmetic, a check of the algorithm, not an outside source). Standing rule: `../RESEARCH_FIRST.md`.

Research limits, said plainly. Blocked or not on the allowed hosts: `gml.noaa.gov` (NOAA Solar Calculator) and `aa.usno.navy.mil` did not resolve; en.wikipedia.org, weather.gov and metoffice.gov.uk were blocked earlier. Only search extracts came back (NOAA tides and currents harmonic pages exist and list M2, S2, N2, K1, O1 with periods; sunrise sites for Stornoway; HM Nautical Almanac Office PDFs exist on assets.publishing.service.gov.uk but were not opened). So the formulas are standard published algorithms from memory, checked by running them; moon, tide, aurora, star numbers are mostly PLAUSIBLE.

## 1. Sources and licences

| Source | Used for | Licence | Tag |
|---|---|---|---|
| NOAA tides and currents harmonic constants pages https://tidesandcurrents.noaa.gov/harcon.html (search extract) | M2 period 12.42 h, S2 12.00, N2 12.66, K1 23.93, O1 25.82 (angular speeds 28.984, 30.000 deg/h; the extract gave M2 speed) | US government work, public domain | VERIFIED (that constituents are tabulated amplitude + phase; speeds M2 28.984104 deg/h) |
| UK government HMNAO "Daily rise, set and twilight times for the British Isles" PDFs (assets.publishing.service.gov.uk) | exists as the official source for rise, set, twilight | Open Government Licence v3 | VERIFIED (that it exists; not opened) |
| sunrisesunset.io, sunrise-sunset.org, Alpenglow (search extracts, Stornoway 58.2 N) | June solstice day length 18 h 14 to 18 h 21 min; full darkness never arrives; latest sunset about 22:38 BST | site text, facts only | VERIFIED (extracts). Matches my 57.5 N 18 h 02 min (lower latitude, shorter) |
| W3C WebXR Lighting Estimation https://www.w3.org/TR/webxr-lighting-estimation-1 (from `WEATHER_AND_SKY.md`) | AR light probe: SH, main light direction and intensity | W3C document licence | VERIFIED |
| Algorithms: NOAA solar position (Spencer/Fourier declination series, EoT series), Meeus "Astronomical Algorithms", Preetham 1999 sky model, Hosek-Wilkie 2012 | formulas below | published methods, formulas not copyrightable; no code copied | PLAUSIBLE (from memory), COMPUTED check |
| Project notes `SEABED_AND_ISLAND_LAYOUT.md`, `WILDLIFE.md`, `WEATHER_AND_SKY.md`, `CLOUD_PHYSICS_FOR_VISUALS.md` | tide window, animal clocks, cloud states | project | n/a |

## 2. The one clock (design)

`t_game` = days since a fixed epoch (a real new moon, for example 2000-01-06 18:14 UTC, JD 2451550.1, PLAUSIBLE). Everything is a pure function of `t_game` (no accumulated state), so replay, save and AR all agree. Local mean solar time at the island longitude: `lst_hours = 24*frac(t_game) + lon/15`. Our fictional island sits at lat 57.5, lon -6.5 (TUNING; keep inside real numbers so the table below holds). Use UTC-like solar time; skip clock-time zones and daylight saving (nobody in game cares).

## 3. SUN

Day of year `N` (1 to 365), fractional day `g = 2 pi/365 * (N - 1 + (h-12)/24)`, `h` = UTC hour.

| Step | Formula | Tag |
|---|---|---|
| Declination (radians) | `d = 0.006918 - 0.399912 cos g + 0.070257 sin g - 0.006758 cos 2g + 0.000907 sin 2g - 0.002697 cos 3g + 0.00148 sin 3g` | PLAUSIBLE, COMPUTED: gives +23.5 at the June solstice, -23.4 at December |
| Equation of time (min) | `E = 229.18 (0.000075 + 0.001868 cos g - 0.032077 sin g - 0.014615 cos 2g - 0.040849 sin 2g)` | COMPUTED: -13 min in Feb, +16 min in Nov (real: about -14 and +16) |
| True solar time (min) | `T = 60 h + E + 4 lon` (lon in degrees east, west negative) | PLAUSIBLE |
| Hour angle | `H = T/4 - 180` degrees (0 at solar noon, 15 deg per hour) | PLAUSIBLE |
| Altitude | `sin(alt) = sin(lat) sin(d) + cos(lat) cos(d) cos(H)` | VERIFIED standard |
| Azimuth (from north, clockwise) | `az = atan2(sin H, cos H sin(lat) - tan(d) cos(lat)) + 180 deg` | COMPUTED: gives 40 deg at June sunrise, 136 at December |
| Direction vector | `x = cos(alt) sin(az)`, `y = sin(alt)`, `z = -cos(alt) cos(az)` (east = +x, north = -z) | TUNING (pick one handedness and test: sun must rise in the east) |
| Rise / set | alt = -0.833 deg (disc edge plus refraction) | VERIFIED standard |
| Extremes | max alt = 90 - lat + d; min alt = lat + d - 90 | VERIFIED geometry |

Cost: about 30 flops per frame; negligible. Compute once per frame in JS, pass the direction to shaders.

### Table at 57.5 N, 6.5 W (COMPUTED; times in UTC, which is local solar time plus about 26 min; add 1 h for British summer time)

| Date | Decl | Sunrise (az) | Sunset (az) | Day length | Noon alt | Min alt (midnight) | Civil ends/starts | Nautical | Astronomical |
|---|---|---|---|---|---|---|---|---|---|
| 21 Dec | -23.4 | 09:07 (136) | 15:42 (224) | 6 h 35 | 9.1 | -55.9 | 08:16 / 16:33 | 07:24 / 17:25 | 06:36 / 18:12 |
| 1 Jan | -23.1 | 09:08 (135) | 15:51 (225) | 6 h 43 | 9.4 | -55.6 | same pattern | | |
| 1 Feb | -17.3 | 08:30 (122) | 16:50 (238) | 8 h 20 | 15.2 | -50.0 | 07:46 / 17:34 | 06:59 / 18:21 | 06:14 / 19:06 |
| 20 Mar eq | -0.5 | 06:32 (90) | 18:39 (271) | 12 h 07 | 32.0 | -33.1 | 05:53 / 19:17 | 05:08 / 20:03 | 04:19 / 20:53 |
| 1 May | +14.8 | 04:39 (60) | 20:10 (300) | 15 h 31 | 47.3 | -17.8 | 03:52 / 20:57 | 02:46 / 22:04 | none |
| 21 Jun | +23.5 | 03:27 (40) | 21:29 (320) | 18 h 02 | 56.0 | -9.1 | 02:15 / 22:41 | none | none |
| 1 Aug | +18.2 | 04:20 (53) | 20:44 (307) | 16 h 24 | 50.7 | -14.2 | 03:27 / 21:37 | 02:01 / 23:01 | none |
| 22 Sep eq | +0.6 | 06:09 (88) | 18:29 (272) | 12 h 20 | 33.1 | -31.9 | 05:30 / 19:07 | 04:43 / 19:54 | 03:53 / 20:43 |
| 1 Nov | -14.2 | 07:36 (116) | 16:43 (244) | 9 h 07 | 18.3 | -46.8 | 06:55 / 17:24 | 06:09 / 18:10 | 05:24 / 18:55 |

Day length swings 6.6 h to 18 h: a ratio of 2.7 (COMPUTED; real tables agree within minutes, VERIFIED against the Stornoway extract, 18 h 14 m at 58.2 N).

Twilight stages (VERIFIED definitions: civil sun -6 deg, nautical -12, astronomical -18): civil is bright enough for outdoor work, horizon sharp and brightest stars and planets show; nautical, horizon fading, only bright stars; astronomical, last trace of glow, then true dark.

Midsummer sky. The sun never goes below -9.1 deg. So astronomical darkness and even nautical night never come ("simmer dim"): civil dusk ends about 22:41, then a bright glow circles the northern horizon all night, from north-west at sunset round to north-east at sunrise, and only the brightest stars show. Search extracts say the same (full darkness never arrives). From about 28 April to 14 August there is no astronomical darkness (rule: `lat + d - 90 > -18` means d above 14.5 deg; the table shows none on 1 May and 1 Aug; COMPUTED). Nautical night is absent only for about 3 weeks round the solstice (d above 21 deg, about 25 May to 18 July, COMPUTED by the same rule). Use that: stars at full strength only between about 15 Aug and 27 Apr.

Winter sun. Maximum altitude 9.1 deg at midwinter noon; shadow = height / tan(9.1 deg) = 6.2 times height (a 2 m person casts 12.5 m); at midsummer noon 0.68 times height (COMPUTED). Equinox noon shadow 1.55 times height. The sun travels low along the south horizon, rise south-east, set south-west, and shadows run all day: long and north-pointing (north-east in the morning, north-west in the evening).

Sunrise azimuth by season: 40 deg (north-east) midsummer, 90 (due east) equinox, 136 (south-east) midwinter. Sunset mirrors (320, 270, 224). Fits with `az_set = 360 - az_rise`.

## 4. LIGHT

| Condition | Illuminance on ground (lux) | Colour temperature (K) | Tag |
|---|---|---|---|
| Full sun, high | 100,000 to 120,000 | direct 5500 to 5800; sky 9000 to 12000 | PLAUSIBLE |
| Sun at 30 deg | about 60,000 | 5000 to 5500 | PLAUSIBLE |
| Sun at 10 deg | about 10,000 to 20,000 | 4000 to 4500 | PLAUSIBLE |
| Golden hour (sun 0 to 6 deg) | about 400 to 10,000 | 3000 to 3500 | PLAUSIBLE |
| Sunset at horizon | about 400 | 2000 to 3000 | PLAUSIBLE |
| Civil twilight (-6) | about 3 to 5 | 10000+ (blue) | PLAUSIBLE |
| Nautical twilight (-12) | about 0.01 to 0.1 | blue-grey | PLAUSIBLE |
| Overcast day | 1,000 to 30,000, 10 to 30 percent of clear sky | 6500 to 7500, no direct shadow | PLAUSIBLE |
| Full moon, clear | 0.1 to 0.3 | about 4100 reflected (sun colour) but looks cool | PLAUSIBLE |
| Starlight, no moon | about 0.001 | | PLAUSIBLE |

Exposure span from sun to starlight is about 8 orders of magnitude; the eye adapts, a render must compress it (see section 8). Golden hour length (COMPUTED as time from sun 0 to 6 deg): 45 min at equinox, 60 min midsummer, 79 to 81 min midwinter. The rule at high latitude: the sun climbs at about `15 cos(lat) cos(...)` deg per hour times a shallower angle, so the same 6 degrees take longer. At the equator it is about 25 min (PLAUSIBLE). In winter the "golden hour" lasts all day; in June, with civil twilight reaching round the clock, the low-sun glow spreads over several hours either side of 'midnight' (sun below 6 deg for 8 h).

Shadow length = `h / tan(alt)`. Shadow direction = sun azimuth + 180 deg. A single directional light must come from this vector; shadow, sky and fog must all use the same vector.

Sunset colour sequence (PLAUSIBLE, standard, Rayleigh scattering removes blue first): white-yellow sun, yellow, orange, red-orange disc at the horizon with deep red under the cloud edges; a pink "Belt of Venus" band rises opposite the sun and the blue band of Earth shadow lies under it (the dusk arch); after sunset a purple light (sun about -2 to -6), then deep blue (blue hour: sun -4 to -8 deg), then navy. High cirrus lights pink for 10 min after the ground is dark. Sun disc appears flattened by refraction near the horizon (about 0.5 deg of lift; flattening about 0.1 deg total, PLAUSIBLE). Clouds are lit from below (orange undersides) while the ground is already blue.

### Cheap analytic sky for a three.js r128 shader

| Model | Cost | Parameters | Notes |
|---|---|---|---|
| Simple Rayleigh + Mie (the "Sky" shader in the three.js examples, from Preetham with a cheap Rayleigh/Mie phase) | one fragment shader on a sphere, about 40 ALU per pixel, no textures | `turbidity` 2 (clear) to 10 (hazy), `rayleigh` 1 to 4, `mieCoefficient` 0.005, `mieDirectionalG` 0.8, sun direction, exposure 0.5 | ships with three.js r128 examples (MIT); good from sun altitude about -4 deg up; goes black below the horizon (add your own night blend) |
| Preetham (1999) | per-pixel `Y = Yz * F(theta,gamma)/F(0,theta_sun)`, 5 Perez coefficients each for x, y, Y, linear in turbidity | A..E from turbidity tables | cheap; poor at low sun; no ground reflection |
| Hosek-Wilkie (2012) | 9 coefficients x 3 channels, tables (about 1 KB per channel set) | needs tables baked from the paper's data (licence of the data needs checking: UNVERIFIED) | better at sunset; more setup |
| Our tweakable night blend | `col = mix(day_sky, night_sky, smoothstep(-0.05, -0.25, sun_y))` plus a twilight band | TUNING | needed on all three |

Formula in words for the simple model (PLAUSIBLE): Rayleigh `beta_R` is about (5.8, 13.5, 33.1) e-6 per metre at sea level, scattered in proportion to `1/lambda^4`, so blue is 5 to 6 times red. Optical depth along the view ray goes with `1/(cos(zenith) + 0.15 (93.885 - zenith_deg)^-1.253)` (Kasten-Young air mass, PLAUSIBLE) and sets the extinction `exp(-beta * airmass)`; the sun's own colour is `exp(-beta_R * 8000 m * airmass)`, giving the reds. Phase `(3/16 pi)(1 + cos^2 gamma)` for Rayleigh and a Henyey-Greenstein lobe with g about 0.8 for Mie. One cloud-state hook: when overcast, lerp sky colour to a grey with the cloud cover and zero the direct sun (see `CLOUD_PHYSICS_FOR_VISUALS.md`).

## 5. MOON

| Fact | Number | Tag |
|---|---|---|
| Synodic month (new to new) | 29.530588 days | VERIFIED (standard) |
| Phase from date | `age = ((JD - 2451550.1) mod 29.530588)`; `phase = age/29.53`; illuminated fraction `k = (1 - cos(2 pi phase))/2`. New 0, first quarter 0.25 (age 7.4 d), full 0.5 (14.8 d), last quarter 0.75 | PLAUSIBLE; error of up to about 0.5 d vs. real (orbit is uneven; accept) |
| Rises later each day | about 50 min (range 20 to 90 depending on season and latitude) | PLAUSIBLE; I did not compute it |
| Sky position | moon moves east against the stars about 13.2 deg/day (0.55 deg/h), so it lags the sun by about 12.2 deg/day (the source of the 50 min delay) | PLAUSIBLE |
| Where it is by phase | new: near the sun, up by day. First quarter: due south at sunset, sets near midnight. Full: opposite the sun, rises at sunset, up all night. Last quarter: rises near midnight, south at sunrise | PLAUSIBLE standard |
| Bright side points at the sun | lit limb faces the sun direction (waxing: lit on the right as seen from the northern hemisphere, waning: lit on the left) | PLAUSIBLE |
| Moon path vs season | the full moon follows the opposite sun's path: HIGH in winter (full moon near midwinter peaks at up to about 60 deg: 90 - 57.5 + 23.5 + up to 5 deg tilt), LOW in summer (about 9 to 16 deg, skimming the horizon in a short night) | PLAUSIBLE by geometry (moon orbit is tilted 5.1 deg to the ecliptic, so extremes vary over an 18.6 year cycle) |
| Angular size | 0.52 deg diameter (0.49 to 0.56), same as the sun; looks the size of a small coin at arm's length | VERIFIED standard |
| Brightness | full moon illuminance 0.1 to 0.3 lux; quarter moon about 0.01 to 0.03 (brightness drops fast off full: half the disc gives a tenth of the light); new, 0 | PLAUSIBLE |
| Earthshine | on a thin crescent the dark side glows dim blue-grey from light bounced off the Earth; clearest 2 to 5 days after new (evening) and before new (morning) | VERIFIED standard |

Moonlit look. Moonlight is sunlight reflected by grey rock, a touch redder than sun physically, but in the eye at that dim level the retina's rods take over (scotopic vision): colours drain, the scene looks blue-grey and the sensitivity peaks in the blue-green, the Purkinje shift (reds go dark, blues stay). Render rule (TUNING): desaturate to 30 to 50 percent, tint to a cool blue-grey, but keep shadows soft, not electric blue; a white moon disc, cool grey-blue halo. Moon illusion: near the horizon the moon looks larger than overhead, but its measured size is the same, a perception effect (PLAUSIBLE); a game can make it by scaling the disc 1.3 to 1.5 times near the horizon (TUNING). The low moon also looks orange (reddened path like the sun).

A game moon needs: a disc with a terminator (a lit-fraction shader with a rotating position angle), a directional light of low intensity when above the horizon, and a halo.

## 6. TIDES

| Fact | Number | Tag |
|---|---|---|
| Lunar (tidal) day | 24 h 50 min (24.84 h): the Moon crosses the same direction every 24 h 50 min | VERIFIED standard |
| Atlantic coast pattern | semidiurnal: two highs and two lows per lunar day, about 12 h 25 min apart (M2 period 12.42 h) | VERIFIED (NOAA constituent list, M2 12.42 h) |
| High water drifts | about 50 min later each day (same as moonrise) | PLAUSIBLE standard |
| Spring and neap | 14.77 days (half a synodic month): springs near new and full moon, neaps near the quarters; springs lag the moon phase by 1 to 2 days (the "age of the tide") | PLAUSIBLE standard |
| Range | spring range about twice neap range around here (2(M2+S2) vs 2(M2-S2)); equinoctial springs are the biggest of the year (March, September, perigee adds up to 10 to 15 percent) | PLAUSIBLE |
| Lunitidal interval | time from moon transit to high water: fixed at a place (HWF&C, "high water full and change"); the Hebrides west coast is about 5 to 6 hours (UNVERIFIED, use 5.5 h) | UNVERIFIED, TUNING |
| Hebrides-like range | mean spring range roughly 3.5 to 4.5 m, neap about 1.5 to 2 m (west Scotland is macrotidal; Stornoway about 4 m springs; I did not read a table) | PLAUSIBLE |

### Simple harmonic model

`h(t) = Z0 + sum_i A_i cos(w_i t + V_i - g_i)`, with `t` in hours since the epoch.

| Constituent | What | Period (h) | Speed (deg/h) | Typical amplitude (m), Hebrides-like | Tag |
|---|---|---|---|---|---|
| M2 | main lunar | 12.4206 | 28.984 | 1.40 (1.0 to 1.6) | period VERIFIED; amplitude PLAUSIBLE typical, not station-specific |
| S2 | main solar | 12.0000 | 30.000 | 0.50 (0.3 to 0.6) | same |
| N2 | lunar elliptic (perigee swing, 27.5 d) | 12.6583 | 28.440 | 0.28 | same |
| K1 | lunisolar diurnal | 23.9345 | 15.041 | 0.07 | same |
| O1 | lunar diurnal | 25.8193 | 13.943 | 0.06 | same |

Ratios to remember: S2/M2 about 0.35; N2/M2 about 0.2; diurnal pair (K1 + O1) about 0.1 of M2. Form factor `(K1+O1)/(M2+S2)` is about 0.07, giving a clean semidiurnal tide (PLAUSIBLE). M2 and S2 drift in and out of phase over 14.77 d (period of beat = 1/(1/12.0 - 1/12.4206)=354 h = 14.77 d, COMPUTED).

Phase setting (the trick for determinism): start `t = 0` at a new moon. At new and full moon, M2 and S2 peak together: `phi_M2(t) = 28.984 t` and `phi_S2(t) = 30 t` both zero at `t = 0`. Add a spring lag (TUNING 1.5 d = 36 h): evaluate the sum at `t - 36`. Add the lunitidal shift (TUNING: M2 high water 5.5 h after moon transit; transit at new moon is solar noon, so high water at `t = 0 + 5.5 h` of solar time at new moon, i.e. `cos(28.984 (t - 5.5 - ...))`). Use `A_M2 cos(28.984 (t - 5.5)) + A_S2 cos(30 (t - 5.5))` plus the others with their own speeds and zero phase (TUNING). Result: HW time moves 50 min later each day; spring highs at new and full moon near 05:30 and 17:55 solar time (the famous springs at about the same clock hour at a place: the lunitidal interval, PLAUSIBLE).

Equinox boost: multiply the S2 and M2 amplitude by `1 + 0.10 cos(4 pi (N - 80)/365)` (peaks at day 80 and 262, TUNING). Perigee: multiply M2 by `1 + 0.07 cos(2 pi t/(27.55 d))` (TUNING).

Driving our slider/window: the pages use +-1.1 m (`SEABED_AND_ISLAND_LAYOUT.md`; real ranges larger). Compute `h` in metres (peak about 2.2 at big springs when M2+S2+N2 add: 1.4+0.5+0.28=2.18 half range, COMPUTED), then `level = clamp(h / 2.2, -1, 1) * 1.1`. Spring/neap contrast survives (neap half range about 1.1 to 1.2 m real, scaled to 0.55 m in game). Keep 1.1 m as the max, with a mean `Z0=0`. The slider becomes a "time offset" or a "scrub the clock"; do not let the player set the level independent of the clock, except in a debug mode.

Tide gameplay values (TUNING): high water about every 12 h 25 min of game time; at game speed (section 10) a tide cycle should last 4 to 6 minutes of real play so a landing window is playable.

## 7. NIGHT SKY

| Item | Fact | Tag |
|---|---|---|
| Pole star | Polaris altitude = latitude = 57.5 deg; it sits about 0.7 deg from the true pole. Stars rotate about it counter-clockwise once per sidereal day (23 h 56 min 4 s), 15.04 deg/h, so the whole sky shifts 4 min/day relative to the sun (a fixed star rises 4 min earlier each day; the sky changes by 1 deg/day, 30 deg/month) | VERIFIED standard |
| Circumpolar limit | stars with declination above `90 - 57.5 = 32.5` deg never set: Ursa Major (Plough/Big Dipper), Ursa Minor, Cassiopeia, Cepheus, Draco, Capella borders; Deneb and Vega nearly | PLAUSIBLE |
| Seasonal stars | winter: Orion, Taurus (Pleiades), Gemini, Sirius low in south (max alt about 90-57.5-16.7=15.8 deg: COMPUTED arithmetic); summer: Summer Triangle (Vega, Deneb, Altair), Scorpius not visible (Antares max alt about 90-57.5-26.4 = 6 deg, skims the horizon) | PLAUSIBLE |
| Milky Way | the arch crosses from Cassiopeia to Cygnus; best in autumn evenings (arches over from NE to SW to the south); the bright centre (Sagittarius, declination -29) never rises above 3.5 deg here | PLAUSIBLE |
| Planets | wander along the ecliptic (the sun's path); bright ones (Venus -4 mag, Jupiter -2.5) are steady, do not twinkle much, appear in the twilight sky; the ecliptic is low in the south in winter evenings and flat in spring evenings | PLAUSIBLE |
| Visible stars | in clean dark air the naked eye reaches magnitude about 6.5, giving about 4,000 to 5,000 stars over the whole sky and about 2,500 above the horizon at once | PLAUSIBLE (standard value, about 9,000 in both hemispheres) |

Cheap star field. A few thousand points (3,000 to 5,000 with magnitude cut 6) from the Yale Bright Star catalogue (public domain, UNVERIFIED host; or generate a procedural one with a power-law luminosity function: number brighter than `m` goes as about `10^(0.6 m)`). One `THREE.Points` with a size attenuation by magnitude, colour by `B-V` (blue-white 10000 K to orange 3500 K; most look white), one rotation matrix about the pole axis (tilted so the pole is `lat` degrees above north horizon) driven by sidereal time `theta = 15.0411 deg/h * t_hours`. Twinkle: `brightness *= 1 + 0.15 sin(time*8 + phase_i)` and stronger near the horizon (TUNING). Fade stars with `smoothstep` by sun altitude: first stars at -4 deg, the sky full at -15, none above -1. Cost: one draw call. Star colour is subtle; do not oversaturate.

Aurora. At 57 to 58 N auroras are seen on some nights per year, mostly during stronger geomagnetic storms, as a low glow along the northern horizon, sometimes arcs and rays overhead during big storms (PLAUSIBLE, the exact count of nights is UNVERIFIED; use 5 to 15 visible nights a year around solar maximum, fewer near minimum, TUNING). The solar cycle lasts about 11 years (VERIFIED standard); activity near maximum is more likely, with most sightings around the equinoxes (PLAUSIBLE). Needs darkness: in practice September to April (the summer sky is too bright, see section 3). Colour: green (oxygen at about 100 km, the common one), red tops at higher altitude in big storms, pink-purple lower fringes (nitrogen), mostly faint green-white to the eye at low levels with the colour clearer in photographs. Shape: arcs, curtains with vertical rays, moving slowly in minutes. Game: a rare event (a chance per night, TUNING 3 percent in the dark season, once per season at most, coupled to the weather state: clear northern sky only).

Noctilucent clouds. Thin, electric-blue-silver, wavy sheets at about 80 km, lit by a sun 6 to 16 deg below the horizon, seen in the north an hour or two after sunset in the northern hemisphere's June and July, between about 50 and 65 N (PLAUSIBLE standard). At 57.5 N this is a good place and season. Game: a rare decoration on clear summer nights, north, low, 5 to 15 deg altitude (TUNING).

Bioluminescence. Marine plankton (dinoflagellates) glows blue when disturbed (wave, oar, paddle, fish) on dark nights; most reports are in warm, calm, nutrient-rich seas in late summer; around Scotland it is reported in summer and autumn (PLAUSIBLE, not verified in this session). Game: a faint cyan sparkle on breaking waves and boat wakes, only when new moon, a water temperature high flag, a calm sea and the date is July to October (TUNING); invisible in the long June twilight.

## 8. FIRE AND LANTERN LIGHT

| Item | Number or rule | Tag |
|---|---|---|
| Colour temperature | wood fire flame 1500 to 1900 K; embers 1000 to 1200 K; candle about 1900 K; oil lantern about 2000 to 2300 K; incandescent bulb 2700 K | PLAUSIBLE |
| Colour in sRGB | about (1.0, 0.45, 0.12) for a fire, (1.0, 0.6, 0.25) for a lantern (TUNING) | TUNING |
| Brightness | candle about 1 candela (12 lumens); a campfire several hundred lumens, many cd flickering; light falls off as `1/r^2` | PLAUSIBLE |
| Flicker | irregular, 5 to 15 Hz sum of 3 sine waves plus noise, amplitude 15 to 25 percent for fire, 5 to 10 for a lantern, a slow 0.5 Hz drift; keep the colour constant while intensity moves; position jitter 1 to 3 cm | TUNING |
| On tents and faces | a warm orange wash on the side facing the fire, falling off quickly, deep cool shadows on the far side; faces lit from below look dramatic but harsh: add a little warm ambient bounce from the ground; canvas glows from inside when a lantern is inside (translucent) | PLAUSIBLE |
| Eye adaptation | a bright fire shrinks the pupil and leaves the retina less sensitive: the surroundings look darker and the stars fade, so a fire reduces what can be seen beyond its circle | VERIFIED standard |
| Exposure for a night render | exposure low but not black: moonless night keep shadows at a readable 3 to 8 percent grey-blue so the player can navigate (TUNING; real is darker); rim the moon-lit parts with a cool tone, put a warm point light for each fire, use a tone mapper (ACES-like) so the fire core does not clip to flat white; fade the exposure up over about 20 s of game dark, slowly like the eye (dark adaptation takes 20 to 30 min in reality, PLAUSIBLE) | TUNING |

Use a limited count of dynamic point lights in WebGL (4 to 8; PLAUSIBLE for tablet budgets, see tiers: quality tiers note is not written yet): bake the others as emissive sprites.

## 9. SEASONS, THE YEAR, AND THE GAME CALENDAR

How the layers line up (seasonal tilts from `WEATHER_AND_SKY.md` and `WILDLIFE.md`; PLAUSIBLE unless marked):

| Season | Light | Weather weights | Tide | Wildlife |
|---|---|---|---|---|
| Winter (Dec to Feb) | 6.6 to 8 h of light, sun max 9 to 15 deg, long shadows, long nights for stars and aurora | grey, windy, most storms and overcast | springs at the equinox come in March | grey seal pups Sept to Dec; fewer birds at cliffs (seabirds mostly away) |
| Spring (Mar to May) | day length doubles (12 to 15.5 h); golden hours shorten but sunrise moves north; first nights without astronomical dark in May | haar (sea fog) most likely over the still-cold sea | biggest springs (March) | birds return to cliffs; nests |
| Summer (Jun to Aug) | up to 18 h, simmer dim, noctilucent clouds, no real night | most fair and golden hours | normal | common seal pups June to July; moult Aug; basking sharks; long dusk feeding |
| Autumn (Sep to Nov) | day shortens by about 3 h a month near the equinox, stars return in August | stormiest after the sea warms | equinoctial springs in September | grey seal pupping starts, migrants |

Daylight changes fastest at the equinoxes (about 4 to 5 min per day at 57.5 N; COMPUTED roughly from the table: 8.3 h on 1 Feb to 12.1 h on 20 Mar = 4.8 min/day) and slowest at the solstices (almost no change for a week).

Game calendar (recommended, TUNING):

| Layer | Real time | Game time | Why |
|---|---|---|---|
| Day cycle | 8 real minutes per game day at "normal" | 24 game hours (180 times speed) | long enough to watch dawn, dusk, tide |
| Tide | 4 min 18 s per tide cycle (12.42 h) | | a tide each half-day, a landing window of a few min |
| Moon | 1 game lunar month = 29.5 days = about 4 real hours | | too slow to see a full cycle in one session; show phase by date, and let the player skip |
| Year | 365 days = 49 real hours at 8 min per day | | impossible in one session: use season skips (the player advances a season by an action such as "wait/sleep") and calendar 12 months of 30 days with a leap rule not needed |
| Session mapping | a 30 min session = 3 to 4 days, or one season with sleep skips at about 20 days per skip | | keeps tides and sun believable inside a day and lets the year move |

Rules: never speed up time smoothly across the tide's amplitude, since a fast clock drives a tide faster than an animation can show: cap at 120 to 240 game minutes per real minute (the sea shader needs cycle time above 3 min), and when time-skipping across days, just evaluate the functions (they are pure). At a skip, also reroll the weather via the schedule and age the sediment (see `SEDIMENT_PHYSICS.md`). Pick the start date at about 1 May (long enough days, springs near, birds nesting; TUNING) to give the player hopeful long evenings, and offer the winter as an optional hard season.

## 10. AR (augmented reality)

In AR the real sun and room light light the scene: the clock stops being the lighting source. Use the WebXR light estimation (VERIFIED, `WEATHER_AND_SKY.md`): spherical harmonics for ambient, a main light direction, intensity and colour; the fallback direction is straight up. Changes: (1) our sun and sky shader are turned off or kept only as the game's backdrop through a window; (2) the directional light follows the estimated light, and cast shadows go on a shadow-catcher plane; (3) tide, moon phase and calendar still run from the game clock (they are data, not light); (4) scale: a table-top world is 1:200 or so, so shadows must be short and soft; (5) a night game state must not darken the real room: use it only as colour grading on the model, with emissive fires and lanterns kept bright; (6) the sky is not drawn in AR. Light estimation is not on every device (UNVERIFIED which tablets), so keep a hand-set sun as a fallback.

## 11. INTERACTIONS: clock to everything

| From the clock | Drives | Rule | Tag |
|---|---|---|---|
| time of day + date | sun direction, intensity, colour temp, sky shader | section 3 and 4 formulas | COMPUTED |
| sun direction | shadow direction and length, fog colour, water colour, cloud shading | one vector shared by all | rule |
| moon age and altitude | moon light on land, moon phase disc, moon glow on water, bioluminescence visibility, star dimming | full moon dims stars and aurora; new moon is best | PLAUSIBLE |
| moon (tidal day) | tide level, current speed (stream is strongest mid-flood and mid-ebb, slack at high and low water), sand bar exposure, wrack line, landing windows, `FLOW_TYPES.md` flows | harmonic model, section 6 | PLAUSIBLE |
| season (date) | day length, weather weights, haar likelihood, vegetation colour, aurora window | section 9 | PLAUSIBLE |
| weather state | cloud cover scales direct sun (0 to 1), sky colour, star and moon visibility, aurora (needs clear north), colour of night (cloud lit from below by a bright moon) | overcast: sun 0, ambient 30 percent; clear: full | PLAUSIBLE |
| sun altitude | solar charging of machines | power `P = P_max sin(alt) * (1 - 0.85 cloud)` with zero below the horizon; winter noon gives `sin(9 deg) = 0.16` of the summer peak 0.83: summer has about 5 times more than winter noon and over 12 times more energy per day (COMPUTED roughly 18 h x 0.5 against 6.6 h x 0.1; TUNING) | PLAUSIBLE |
| time of day | seals haul out at low water on rocks that dry (any time of day, but quieter at dawn and dusk; moult in August most hauled out) | `haulout = (tide below rock height) * (1 - 0.5 * disturbance)`; pup season Sept to Dec | PLAUSIBLE (tide link VERIFIED qualitatively in `WILDLIFE.md`) |
| dawn and dusk | seabirds feed at first and last light and by tide (waders on the flats at low water); otters most active at dusk, dawn and night, any tide near low water in kelp | activity curve `peak at sun altitude -6 to +6 deg` | PLAUSIBLE |
| night | people go indoors or by fire, owls and bats (not in this note), no shadows from the sun | | TUNING |

## 12. COMMON MISTAKES

| Mistake | Why wrong | Fix |
|---|---|---|
| Sun direction and shadow disagree | shadows must point away from the sun on the ground | one sun vector for light, sky disc, shadow, glints |
| Sun rises in the wrong place or too high in winter | at 57.5 N the sun is never above 9 deg at midwinter, 56 deg at midsummer | use the algorithm, not a fixed arc |
| No twilight: instant dark | dusk lasts 1 to 2 hours (winter 50 min to dark astro), over 4 hours of glow in June | blend the sky by sun altitude over -18 deg |
| Perfect dark midsummer night | never below -9 deg; a glowing northern sky | keep a pale sky in the north |
| Moon on the wrong side or wrong phase for the date | phase from age; full moon rises at sunset in the east, waxing lit on right | phase from `age`, azimuth from phase |
| Same moon every night | rises 50 min later each day | clock-driven |
| Tide not tied to the moon | the tide follows the lunar day (24 h 50 min), not the solar day | harmonic model |
| High tide at the same clock time every day | drifts 50 min a day | M2 12.42 h not 12 h |
| No spring and neap | the range changes by a factor of about 2 over 14.8 d | M2 + S2 beat |
| Stars that do not rotate about the pole, or the pole on the wrong spot | pole at altitude 57.5 deg in the north | rotation matrix about the pole axis |
| Stars seen in the day or in the June night as a full sky | fade by sun altitude | smoothstep |
| Too-dark moonlit nights | a full moon gives readable light, about 0.2 lux, and the eye adapts | exposure raised, colour muted |
| Pure blue night shadows | the dark is blue-grey and desaturated, not electric blue | 30 to 50 percent saturation, grey |
| Pure black shadows by day | the sky fills them with blue light | ambient from sky colour |
| Fire light too white or too steady | 1800 K orange and flickering | colour (1,0.45,0.12) and noise |
| Moon too small or stars too big | moon 0.52 deg, stars are points | size correct |

Visual checklist: (1) sun, shadows, glints share one direction, (2) the sun rises where the date says, shadows 6 times long at midwinter noon, (3) a dusk with 3 stages visible, (4) no true night in June, (5) moon phase matches date, rises later each day, the lit side faces the sun, (6) the tide changes with the moon, springs near new and full, (7) the stars rotate round the same point as the pole, (8) fire light is warm and flickers, the surroundings are darker near a bright fire, (9) overcast kills the sun's shadow and star view, (10) one clock jump skips cleanly with no pop in light.

## 13. What is faked in the game

Simplified orbits (no nutation, no 18.6 year moon cycle, no leap days); a simple phase from mean synodic month (error to a half day); tide from 5 constituents with typical amplitudes, no weather surge; a scaled tide range (+-1.1 m); a time speed hundreds of times real; one fixed latitude; a procedural or small catalogue star field; aurora and noctilucent clouds as scripted events; the night is brighter and less colourful-correct than reality for readability; no atmospheric refraction detail (rim flattening) beyond a small lift; moon illusion by scaling; a fire as 4 to 8 lights plus sprites.

## 14. Could not verify

- NOAA Solar Calculator and USNO pages (hosts did not resolve): the sun formulas are from memory but I checked them by running them (solstice declination, equation of time extremes, and Stornoway day length all matched).
- The Hebrides harmonic constants (amplitudes and phases) for any real station, and the lunitidal interval (HWF&C): typical values only.
- Moonrise delay by season, the full moon altitude extremes, the aurora nights per year at this latitude, bioluminescence season: standard knowledge, not read here.
- Preetham and Hosek-Wilkie coefficient tables and star catalogue licence hosts.
- WebXR light-estimation device support on tablets.
