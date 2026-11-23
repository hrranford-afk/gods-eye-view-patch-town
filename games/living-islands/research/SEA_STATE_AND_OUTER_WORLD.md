# Sea state and the outer world (research note)
Do not put real place names into game code, assets or recipes.
Status: research note, Living Islands (branch citylab/cloud-islands), 23 Nov 2026. Gate note for the sea, storm, swell, boats and "bigger world" layers. Companions: `FLOW_TYPES.md`, `SEABED_AND_ISLAND_LAYOUT.md`, `SEDIMENT_PHYSICS.md`, `WEATHER_AND_SKY.md`, `CLOUD_ATLAS.md`, `SKY_CLOCK.md`, `BOATS.md`, `WILDLIFE.md`, `MODES_AR_DESKTOP_HANDHELD.md`, `SEA_PASS.md`, `WEATHER_PASS.md`.
Method and limits: search extracts only (WebSearch). No page was opened: en.wikipedia.org, weather.gov, metoffice.gov.uk (earlier), and www.hko.gov.hk (this session, host did not resolve) were not reachable. Nothing downloaded. Formulas are standard textbook forms written from memory and run in node (numbers marked COMPUTED are my arithmetic). Tags: VERIFIED = seen in a search extract of a named source; PLAUSIBLE = standard, one secondary source or memory; UNVERIFIED = a guess; TUNING = a game starting value. Licences: NOAA/NCEI pages public domain; news and journal items: facts only, no text copied; Wikipedia CC BY-SA 4.0 (not used as a source here).

## 0 One-page summary
1. The table is a window (0.5 to 2 km) on an ocean thousands of km wide. Waves, tide, weather, drift and animals come IN through its edges. Build a small numeric "macro sea" (a pure function of seed and time) and let the window read it.
2. Swell is old storm energy. A 14 s swell travels 11 m/s (39 km/h), so a storm 1500 km away announces itself about 38 h early, long period first, then shorter (COMPUTED). The sea before a storm must rise slowly in a fixed order, never pop.
3. Local wind sea follows local wind within hours; swell follows distant storms and outlasts the wind. The two cross. Two or three wave systems at once is the normal real sea.
4. Whitecaps, foam streaks and spray are wind-speed rules (Monahan, Beaufort), not wave-height rules.
5. Islands matter to waves by wavelength: short wind sea gets a clear shadow, 300 m swell wraps round a 200 m island and leaves almost none.
6. Tide is uniform over the window (a 2 km window is seconds of tidal phase); streams come from local geometry. A storm adds surge (about 1 cm per hPa plus wind setup) on top.
7. Everything arriving from outside (drift, wrecks, boats, shoals, whales, bird flights) is a seeded function of the macro state, keyed by event so a reload never duplicates it.

## 1 Sources
| Source | Used for | Licence | Tag |
|---|---|---|---|
| NDBC measurement pages (ndbc.noaa.gov/faq/wavecalc.shtml, measdes.shtml) | Hs = 4 sqrt(m0) = mean of highest third; dominant period = spectral peak; swell and wind sea split by a separation frequency; combined Hs = sqrt(Hs_swell^2 + Hs_wind^2) | public domain | VERIFIED |
| NOAA NCEI WOD code table s_18 (WMO code 3700), nodc.noaa.gov/OC5/WOD/CODES | sea state 0 to 9 height bands (section 2.1) | public domain | VERIFIED |
| NWS Beaufort pages (weather.gov/pqr/beaufort, /ajk/beaufort) | F6 dense foam streaks; F7 foam blown in streaks; F9 23 ft; F6 9 ft, F7 13 ft | public domain | VERIFIED (extract) |
| HKO Beaufort table (extract only) | F5 about 2 m, F6 3 m, F8 5.5 m (max 7.5) | not stated; facts only | VERIFIED (extract, hard to read) |
| Monahan and O'Muircheartaigh 1980, J. Phys. Oceanogr. (via Copernicus ACP 2016 and Ifremer WW3 bibliography extracts) | W = 3.84e-6 U10^3.41 (robust fit), OLS 2.95e-6 U^3.52; W is a fraction | journal; facts only | VERIFIED |
| Munk et al. 1963 (data-ww3.ifremer.fr/BIB) | each frequency travels at g/(4 pi f); peak period falls with time; distance from the slope; 0.03 Hz took 6.7 d for 15,390 km | facts only | VERIFIED (extract) |
| TU Delft Coastal Dynamics via LibreTexts (3.5.4 sea versus swell) | swell definition, dispersion | CC BY-NC-SA expected | VERIFIED (title); UNVERIFIED (licence) |
| WMO extremes committee via Guinness, Irish Times, gCaptain | Hs 19.0 m buoy record, 4 Feb 2013, near 59 N 11 W; previous 18.275 m, 8 Dec 2007 | news; facts only | VERIFIED |
| Draupner wave (ECMWF memo 15321, arXiv 1507.07873, 1207.2130) | Hs 11.8 m, crest 18.5 m (1 Jan 1995); rogue = H > 2 Hs; Rayleigh gives about 1e-4 | facts only | VERIFIED (extract) |
| Met Office storm surge page (via metlink 1953 PDF and search) | 1953 surge 2.74 to 3.36 m; centre 968 mb; 1 mb = 1 cm; wind is the main driver | facts only | VERIFIED (extract) |
| Holland 1980 (Mon. Wea. Rev. 108, 1212); Willoughby and Rahn 2004 | three parameters Vmax, Rmax, B; B sets how narrow the wind peak is; typical hurricane B 1.31, Rmax 45 km | facts only | VERIFIED (extract); equations from memory |
| arXiv 2407.04723, Dundee 2023 paper, TU Delft theses (extracts) | opposing current: waves shorten, steepen, break earlier; can be blocked | facts only | VERIFIED qualitative |
| JONSWAP formulas (ANSYS AQWA help, CodeCogs, arXiv 2606.28165) | gamma 3.3 (range 1 to 7), sigma 0.07 and 0.09, alpha = 0.076 (U^2/(F g))^0.22, wp = 22 (g^2/(U F))^(1/3) | vendor docs; facts only | VERIFIED (extract); one source disagrees on alpha |
Could not open: weather.gov pages, Wikipedia, Met Office, HKO, MIT OCW, Oregon State notes, Coastal Engineering Manual, ECMWF and Copernicus Marine documentation, WaveWatch III manual (all found only as search hits or not reachable). Everything from those is PLAUSIBLE until opened.

## 2 Wave physics for visuals
### 2.1 Core relations (deep water, g = 9.81; the table is COMPUTED)
`L = g T^2 / (2 pi) = 1.56 T^2`; phase speed `c = g T/(2 pi) = 1.56 T`; group speed `cg = c/2 = g T/(4 pi) = 0.78 T` (VERIFIED, Munk). Deep means depth over L/2. Shallow: `c = cg = sqrt(g h)`.
| T s | L m | c m/s | cg m/s | cg km/h | Typical source |
|---|---|---|---|---|---|
| 3 | 14 | 4.7 | 2.3 | 8 | local chop |
| 6 | 56 | 9.4 | 4.7 | 17 | young wind sea |
| 8 | 100 | 12.5 | 6.2 | 22 | gale wind sea |
| 10 | 156 | 15.6 | 7.8 | 28 | mature sea, short swell |
| 12 | 225 | 18.7 | 9.4 | 34 | swell |
| 14 | 306 | 21.9 | 10.9 | 39 | long swell |
| 16 | 400 | 25.0 | 12.5 | 45 | long swell |
| 20 | 625 | 31.2 | 15.6 | 56 | rare, very distant big storm |
### 2.2 Growth and the two spectra
Wind sea grows with wind speed U10, fetch F (distance wind blows over water) and duration; it stops at "fully developed" (limited by U only). Whichever of fetch or duration is smaller sets the size.
- Pierson-Moskowitz (fully developed): `S(f) = alpha g^2 (2 pi)^-4 f^-5 exp(-1.25 (fp/f)^4)`, alpha 0.0081, `fp = 0.877 g / (2 pi U)` (PLAUSIBLE, memory). Gives `Hs = 0.0213 U^2` (the earlier 0.021 in WEATHER_AND_SKY agrees) and `Tp = 2 pi U/(0.877 g)`, about 0.73 U s.
- JONSWAP (fetch limited): PM times `gamma^r`, `r = exp(-(f - fp)^2 / (2 sigma^2 fp^2))`, gamma 3.3 (1 to 7), sigma 0.07 below fp and 0.09 above (VERIFIED extract). Fetch growth with `x = g F / U^2`: `Hs = 0.0016 (U^2/g) sqrt(x)`, `fp U/g = 3.5 x^-0.33` (PLAUSIBLE, memory; the 0.076/0.22 alpha form is VERIFIED extract). Duration to reach the fetch limit about `68.8 x^(2/3) U/g` seconds (PLAUSIBLE, from the Coastal Engineering Manual, not opened).
- Worked (COMPUTED): U 20 m/s, F 500 km: Hs 7.2 m, Tp 13 s, about 21 h. U 20, F 1000 km: capped at fully developed 8.5 m, about 33 h. U 10, F 20 km: Hs 0.7 m, Tp 3.6 s.
- Hs is a statistic: mean of the highest third of waves (VERIFIED). Mean wave about 0.64 Hs; highest of 1000 waves about 1.9 Hs (Rayleigh, PLAUSIBLE).
### 2.3 Sea states: Hs, whitecaps and looks (fully developed values are COMPUTED; real seas lag the wind so published "probable heights" are lower at high force)
| Beaufort (m/s) | PM Hs m | Published probable m | Whitecap cover W (Monahan) | What the sea looks like | Tag |
|---|---|---|---|---|---|
| 0 to 1 (0 to 3) | 0 to 0.1 | 0 to 0.1 | 0 | mirror, then scaly ripples, no crests | PLAUSIBLE |
| 2 to 3 (2 to 5) | 0.1 to 0.5 | 0.2 to 0.6 | under 0.1 percent | wavelets with glassy crests; at 3 crests begin to break, scattered white | PLAUSIBLE |
| 4 (6 to 8) | 1.0 | 1.0 | 0.5 percent at 8 | small longer waves, frequent whitecaps | PLAUSIBLE |
| 5 (8 to 11) | 1.9 | 2 (HKO) | 1 percent at 10 | moderate, long, many whitecaps, some spray | VERIFIED (NWS: many whitecaps, some spray) |
| 6 (11 to 14) | 3.2 | 3 (HKO), 2.7 (NWS) | 2.4 percent at 13 | large waves, white foam crests everywhere, dense foam streaks, spray | VERIFIED (streaks) |
| 7 (14 to 17) | 5 | 4 (NWS 13 ft) | 4 percent at 15 | sea heaps up, foam blown in streaks along the wind | VERIFIED |
| 8 (17 to 21) | 7.7 | 5.5 (HKO), max 7.5 | 7 percent at 18 | high waves, crest edges break to spindrift, well marked streaks | PLAUSIBLE |
| 9 (21 to 24) | 11 | 7 (NWS 23 ft) | 12 percent at 21 | dense foam, crests tumble, spray cuts visibility | PLAUSIBLE |
| 10 to 12 (24 to 33) | 15 to 25 | 9 to 14+ | 22 percent at 25; extrapolated beyond | sea white, long overhanging crests, air full of foam and spray | PLAUSIBLE; W above about 20 m/s is outside the fitted data |
WMO sea state code (VERIFIED, NOAA NCEI): 0 calm glassy 0; 1 rippled 0 to 0.1; 2 smooth 0.1 to 0.5; 3 slight 0.5 to 1.25; 4 moderate 1.25 to 2.5; 5 rough 2.5 to 4; 6 very rough 4 to 6; 7 high 6 to 9; 8 very high 9 to 14; 9 phenomenal over 14 m. Douglas scale is the same bands for wind sea.
Rules: foam streaks and Langmuir lines begin around 8 m/s (rows 2 to 300 m apart, FLOW_TYPES; PLAUSIBLE); spray from crest tearing from about 15 m/s; spindrift sheets from 20. Foam persists seconds for a whitecap and minutes for streaks (UNVERIFIED). Cap game coverage at about 25 percent (TUNING).
### 2.4 Steepness and breaking
Deep-water limit `H/L = 0.142` (about 1/7, VERIFIED textbook). A sea of Hs/L 0.026 (fully developed, COMPUTED) breaks at the tallest crests; waves steeper than about 0.04 to 0.05 (Hs/L) are "steep" (NDBC reports steepness classes only when Hs is above 0.8 m, VERIFIED). Swell is gentle: 3 m at 300 m is 0.01. A short sea made steep by an opposing current can break far below the usual limit (VERIFIED qualitative).
### 2.5 Swell from a distant storm
- Arrival (VERIFIED relation, COMPUTED values): `t_arrive = D / cg = 4 pi D / (g T)`. D 1500 km: 14 s arrives after 38 h, 16 s after 33 h, 12 s after 44 h; D 500 km, 10 s: 18 h; D 3000 km, 14 s: 76 h.
- At a fixed point the peak period FALLS with time: `T(t) = 4 pi D / (g (t - t0))` (Munk 1963, VERIFIED). A storm 1500 km away that stops blowing at t0 gives T 16 s at +33 h, 14 s at +38 h, 12 s at +44 h, 10 s at +53 h. Height rises as the peak arrives, then fades over a day or two.
- Sequence at the window as a storm approaches (PLAUSIBLE): 1) flat-looking, long low swell (1 to 2 m at 16+ s) 24 to 40 h ahead, with a clear sky; 2) swell grows and shortens, cirrus and cirrostratus appear (CLOUD_ATLAS), pressure starts to fall; 3) wind rises, local sea grows over the swell, pressure falling fast, cloud thickens; 4) front passes, wind veers, sea confused and peak; 5) wind drops, wind sea dies in hours, swell keeps rolling for a day or more, period shortening.
- Decay: energy spreads over a widening arc, so swell height falls about with `sqrt(R0 / D)` beyond the storm radius R0 plus a slow friction loss (TUNING: `Hs(D) = Hs0 sqrt(R0/max(D,R0)) exp(-D/8000 km)`). Swell is long-lived: crossing an ocean is normal (Munk: 15,390 km, VERIFIED).
- Directions: swell comes from where the storm is, usually from the west to north-west for a window in the North Atlantic; local wind sea follows the local wind. They differ by 0 to 90+ degrees and give a cross sea (NDBC combines them as `Hs = sqrt(Hs_swell^2 + Hs_wind^2)`, VERIFIED). Wind sea lags a turning wind by hours.
- Groups and "every seventh wave": there is no fixed seventh. Waves come in groups from beating between close frequencies; narrow swell has long clear groups (often 5 to 10 waves, a lull between); the biggest waves are in the middle of groups (PLAUSIBLE). Model groups with two close wavelengths in the same train (beat), not a counter.
- Rogue waves: `H > 2 Hs` is about 1 in 10,000 waves under the Rayleigh model; observed rate somewhat higher; Draupner Hs 11.8 m with crest 18.5 m (VERIFIED extract). For a game: roughly one per several hours of storm at most, a single steep crest, signalled by nothing. Do not make it routine.
- Extremes (VERIFIED): record buoy Hs 19.0 m (WMO, Feb 2013); 18.275 m in Dec 2007. Typical winter open Atlantic Hs 3 to 5 m, storms 8 to 12 m (PLAUSIBLE, not read from a table).

## 3 Scale problem: a window, not a planet
Window 0.5 to 2 km; swell L 150 to 600 m: 1 to 6 wavelengths fit (arithmetic). Fully honest at 1:400 the wave 300 m long is 0.75 m on a 1 m table and 2 m height is 5 mm (MODES note, VERIFIED arithmetic): readable only as a few broad lines. Rules:
1. Show swell as broad rolling lines with a displayed wavelength of at least window/4 (at least 3 crests across). If the window is under 1 km, shorten the shown swell to about 150 m (T about 9.8 s) and keep c = sqrt(g L/2 pi) for THAT L so the motion looks right (TUNING).
2. Exaggerate swell height 3 to 5x in miniature modes (MODES note, TUNING) and keep steepness under 1/14 so lines stay smooth. Steeper than 1/7 is never allowed.
3. Keep the SEA SHADER's four existing trains (19, 9.3, 4.7, 2.45 m) as the local wind sea. They are about 1/10 of real wind sea at gale size; add a separate "long swell" layer (section 6) rather than stretching them.
4. The honest part: the window sees a few waves of a field that is really thousands of km wide; the direction, period and heights are real, the number of crests is tuned.
5. Window edges must never show a seam: macro fields are smooth in time and use one global phase `phi = k . x - w t`.

## 4 Interactions with islands and seabed
| Process | Rule | Game form | Tag |
|---|---|---|---|
| Shoaling | `H2/H1 = sqrt(cg1/cg2)`; in shallow water roughly `H ~ h^-1/4`; wavelength shortens, period stays | height factor from depth map | PLAUSIBLE |
| Refraction | Snell: `sin(theta)/c` constant, `c = sqrt(g h)` shallow; crests turn toward shallows, focus on headlands (energy per crest-length up as `sqrt(b0/b)`), spread in bays | precomputed direction and height-factor maps, section 6.3 | PLAUSIBLE |
| Diffraction and shadow | behind an obstacle width `w` the shadow edge is a soft band about `sqrt(lambda x / 2)` wide at distance `x` (Fresnel). Swell (L 300 m) behind a 200 m island at 500 m: edge about 275 m wide so almost no shadow. Wind sea (L 30 to 60 m) gives a clear lee | shadow strength by `w / lambda`: below 0.5 none, above 3 strong | PLAUSIBLE (COMPUTED) |
| Breaking depth | `H_b about 0.78 h` (single wave); random seas break at `Hs/h about 0.5 to 0.6` | foam where local height over depth passes 0.5 | PLAUSIBLE |
| Surf zone | width about `h_b / tan(beta)`: slope 1:50 with 3 m waves = about 190 m; steep shingle 1:8 = about 30 m. Breaker type by `xi = tan(beta)/sqrt(H/L0)`: under 0.5 spilling, 0.5 to 3.3 plunging, over 3.3 surging | wide white zone on sand, narrow thump on shingle | PLAUSIBLE |
| Run-up and setup | setup at shore about 0.2 Hb; run-up to a few times setup on steep beaches; storm run-up adds to surge and drives overwash (SEDIMENT_PHYSICS overwash rule) | water line rises and strandline moves | PLAUSIBLE |
| Reflection | steep cliff reflects most energy: clapotis, standing waves, height up to 2x at the wall, a choppy square pattern, white vertical spray | cliff foot chop plus spray burst, no refraction | PLAUSIBLE |
| Rips | waves breaking unevenly over bars and channels pile water on the bar that returns through gaps; fast 0.5 to 1.5 m/s seaward jets, spacing 50 to 500 m, pulses with wave groups | link SEDIMENT_PHYSICS (bar gaps); show as a brown or foam stripe through the surf | PLAUSIBLE |
| Wave and current | opposing stream shortens, steepens and breaks waves; a following stream lengthens and flattens; blocked when current equals the wave group speed: 14 s swell 11 m/s (never in a tide), 6 s 4.7 m/s, 4 s chop 3.1 m/s (COMPUTED). So a 3 to 5 m/s stream in a race kills short chop and builds steep stationary waves. | race = high steepness bands where a stream over 1.5 m/s runs against waves over 1 m | VERIFIED qualitative |
| Wind drift | surface water 1 to 3 percent of wind (about 3 percent of U10 for floating objects), turned right of the wind in the north, plus Stokes drift about 1 percent of U10 at the surface (PLAUSIBLE); flotsam gathers on convergence lines (FLOW_TYPES) | add `0.03 * wind` vector to the flotsam velocity | VERIFIED (3 percent), PLAUSIBLE (Stokes) |
Tide in a window: tidal wave speed `sqrt(g h)` is 22 m/s at 50 m depth, so 2 km is about 90 s of phase: the whole window rises together. Stream for a progressive tide `u about eta sqrt(g/h)`: 1.5 m amplitude at 50 m depth gives 0.66 m/s (COMPUTED). Gaps and headlands multiply it 2 to 5 times (FLOW_TYPES).

## 5 Storm effects
| Effect | Numbers | Tag |
|---|---|---|
| Surge | inverse barometer about 1 cm per hPa below 1013 (a 960 hPa centre gives 0.53 m, COMPUTED) plus wind setup, which is usually larger in shallow seas; 1953 surge 2.7 to 3.4 m with a 968 mb centre and onshore wind on a spring tide | VERIFIED (extract) |
| Storm tide | `level = tide + surge`; worst when surge peaks within about 2 h of high water on a spring tide. Open ocean islands see about 0.3 to 1 m, semi-enclosed shelves more (WEATHER_AND_SKY: UK surges commonly under 1 m) | PLAUSIBLE |
| Beach response | storm waves strip the upper beach into an offshore bar; gentle swell rebuilds it; shingle moves in big storms only; Dean number rule in SEDIMENT_PHYSICS | PLAUSIBLE |
| Spray and sea smoke | spray plumes at cliffs at Hs over 3 m; sea smoke (steam fog) needs very cold air over warmer water: winter cold-air outbreaks after the cold front | PLAUSIBLE |
| Wrack | strandline forms at the highest storm tide mark: weed, timber, rope, boxes, bottles, dead birds; fresh lines after each storm (FLOW_PASS beaching event key) | PLAUSIBLE |
| Wildlife | seabirds leave cliff ledges, ride the sea out far away or shelter on the lee side; gulls inland; seal pups on low beaches can be washed off in storm surge, adults go to sheltered rocks; wrecks of weakened seabirds after long gales (UNVERIFIED) | PLAUSIBLE |
Boats (BOATS.md has pitch and roll figures; it holds no Hs limits, so these are TUNING with PLAUSIBLE basis): rowing skiff 4 m: stop at Hs 0.5 m or wind 8 m/s; open sailing boat: reef at F5, stay in at Hs 1 m; gig or curragh 6 to 8 m: Hs 1 to 1.2 m; 9 m decked boat: Hs 2 to 2.5 m or F7; nobody small sails at F8+. A boat pitches with the slope at its bow and stern: pitch angle about `atan(2 pi a / L) * min(1, L_boat / L_wave)` and gets a roll from the cross slope; when `L_wave` is under 2 boat lengths it slams (short steep sea) instead of riding. Freeboard 0.3 to 0.5 m on a skiff: a wave crest over 0.4 m beside the boat ships water. Loaded and tired crews fail first (UNVERIFIED).

## 6 The world beyond the window: a macro sea
### 6.1 Storm track model (a pure function of seed and hour)
- Systems: low-pressure centres move west to east at 10 to 25 m/s (about 36 to 90 km/h), a new one every 3 to 7 days, more and deeper in autumn and winter (PLAUSIBLE; schedule weights TUNING). Seeded list: `storm i`: spawn time, track line (north or south of the window by 100 to 800 km, latitude drifts slowly), speed, depth (centre pressure 960 to 1005 hPa; 5 to 8 percent of winter systems below 970, TUNING), radius of maximum wind 150 to 400 km.
- Wind field: simple vortex (Holland shape, VERIFIED three parameters): `V(r) = Vmax * ((Rm/r)^B * exp(1 - (Rm/r)^B))^0.5`, rotating anticlockwise, with 20 degrees inflow toward the centre, B 0.8 to 1.2 for big mid-latitude lows (TUNING; hurricanes 1.3 with Rm 45 km). Vmax from the pressure deficit `sqrt(B dp / (e rho))` is for hurricanes (dp 30 hPa gives 34 m/s, COMPUTED); extratropical winds are weaker, so use `Vmax = 0.7 * that`, giving 20 to 30 m/s for a 960 to 980 hPa low (TUNING). Add the translation speed on the right of the track.
- Front sequence at the window (link CLOUD_ATLAS, WEATHER_AND_SKY; PLAUSIBLE): low passes NORTH: wind backs to the south-east and strengthens, warm front rain (wind veers +25), warm sector steady south-west, cold front passes (veer to north-west, +55), showers and Cb. Low passes SOUTH: wind backs through east to north (cold, no warm sector). Pressure falls toward the track and rises quickly after the cold front.
- Output: `u10 vector`, `pressure`, `cloud state` mapped to the existing eight states (WEATHER_AND_SKY section 10). The Markov schedule stays as a fallback; the macro state overrides it so winds, states and storm times are consistent.
### 6.2 Swell from the storms
Per storm, in the ocean, treat each hour of strong wind as a source packet at the storm: fetch is the storm's wind-field length (about 500 to 1500 km), duration is the hours the storm keeps wind above 15 m/s along the track in one direction. Hs and T at source from section 2.2 (e.g. 20 m/s over 1000 km: Hs 8.5 m, Tp 13 to 17 s). Propagate each packet to the window with `t_arrive = D / cg(T)` over 3 period classes (10, 13, 16 s) and the bearing from storm to window; height by section 2.5. Keep at most 3 trains alive, merged if their direction differs under 15 degrees and period under 2 s. State: `{Hs, T, dir_from}` for each train, smooth ramps. Analytic, no grid.
### 6.3 Tide at the boundary
Use SKY_CLOCK harmonics: M2 12.42 h, S2 12.00, N2 12.66, K1 23.93, O1 25.82 (VERIFIED periods), amplitudes 1.4, 0.5, 0.28, 0.07, 0.06 m (TUNING, a macrotidal shelf). Tide is a progressive or Kelvin wave around an amphidromic point (PLAUSIBLE): one phase, one amplitude set for the window. Stream is `u = eta sqrt(g/h)` times local geometry (section 4); ebb and flood directions along the shelf axis. Surge adds to the level, never to the stream (small effect, TUNING).
### 6.4 Large-scale water
Background drift 0.05 to 0.3 m/s (FLOW_TYPES, PLAUSIBLE) with a slow seeded direction (days), plus one eddy and one temperature front crossing the window every several days (speeds 0.1 to 0.3 m/s, fronts a few hundred m wide: colour change, foam and flotsam line, plankton colour, birds and dolphins along it). Sea temperature: 8 to 14 C range through the year, warmest in September (PLAUSIBLE).
### 6.5 Arrivals from outside (seeded from macro state)
| Thing | Trigger | Tag |
|---|---|---|
| Flotsam, wrecks, cargo | rate scales with `Hs^2` and onshore wind; item class by seed; lands near the storm tide line; arrival by drift velocity `current + 3 percent wind` back-traced to the boundary | PLAUSIBLE |
| Ships and boats (machines layer, EVOLUTION_TREE) | fixed old routes that shelter or divert above their wind rule (e.g. F7); a relic boat may drift ashore after a storm | design |
| Fish shoals and whales, dolphins | arrive on fronts and in settled summer weather (WILDLIFE); absent in gales | PLAUSIBLE |
| Seabird commuting flights | dawn and dusk lines in fair weather, stopped by F7; birds ride out storms far away; return after | PLAUSIBLE |
| Plankton bloom | spring (April to May) after calm weather, on fronts; colour patches that follow the eddy | PLAUSIBLE |
### 6.6 Size and cost of the bigger world
A 3000 km box is the right size: storm tracks and swell sources stay inside it, and the Atlantic storm cycle of 3 to 7 days fits (a 15 m/s low crosses 3000 km in 2.3 days). No grid needed: the macro state is analytic (storms as vortices, swell as packets, tide as harmonics). If a grid is wanted later: 50 km cells, 60 x 60 = 3600 cells, hourly steps, under 1 ms in JS (COMPUTED). Per frame the window reads the state at one point: a few dozen flops.
### 6.7 Determinism and the ledger
`state = macro(seed, hour)` has no stored state. Events (a storm, a wreck, a beaching, a whale visit) have key `seed:kind:index` (FLOW_PASS pattern). The save keeps seed, clock, and the set of keys already acted on (picked up, built over); size well under 2 KB for hundreds of events (COMPUTED estimate: 12 bytes per key). Reload gives the same storm, same swell arrival, same wrack.

## 7 Driving the shader and sim
Architecture: clock -> macro state (wind vector, pressure, swell trains, tide, drift) -> window forcing (smoothed uniforms) -> local response (waves over the seabed, flow, boats, flotsam, shore).
| Macro quantity | Goes to | How | Where computed |
|---|---|---|---|
| wind vector U10 | `uWind`, chop gain, whitecap `W`, streaks, spray, rain, clouds, flotsam drift | `chop = clamp((U/6.5)^1.1, 0.3, 2.3)` (existing), `W = 3.84e-6 U^3.41` capped 0.25 | live |
| swell trains `{Hs, T, dir}` | new vertex displacement plus normal trains `uSwell[3]` (dir, k, amp, phase speed) | `a = Hs/2 * exag`, `k = 4 pi^2/(g T^2)` for the displayed `L` | live (3 sines) |
| wind sea Hs, Tp | existing four trains amplitude and the new local sea | relax toward `0.0213 U^2` (or fetch-limited) with tau 3 to 6 h | live |
| surge and tide | `uTide`, shoreline, sediment step, overwash | `level = tide + surge` | live |
| stream and drift | flow texture boundary (FLOW_TYPES) | scale the existing field by tide phase, add drift and wind term | live, one scalar per frame |
| Hs and period | boats | pitch, roll, `sailOk`, shelter rules | live, same height function as GLSL |
| macro arrivals | flotsam, animals | keyed events | live |
| refraction maps | shader | precomputed per seabed edit | precomputed |
Parity rule: one sea-height function `seaH(x, z, t)` coded in both JS and GLSL, tested to agree to 1 mm, used by the mesh vertices, the boats and the foam. Without this boats float in a different sea from the one drawn.
### 7.1 Per-device tier (MODES note)
| Item | Desktop | Handheld high (iPad) | Handheld low | Miniature AR |
|---|---|---|---|---|
| swell trains | 3, vertex displaced | 2 to 3, vertex displaced | 1 normal-map only | 2, height exaggerated 3 to 5x |
| refraction map | precomputed, bilinear | same | none (global wind shadow only) | none |
| diffraction shadow | map from precomputed mask | same | land lee slick only | lee slick only |
| whitecaps and streaks | full, noise | fewer taps (drop 3 chop taps first, SEA_PASS) | cover value only | exaggerated sprites |
| spray | particles at cliffs | 4 to 8 emitters | none | none |
| boats pitching | full, 2 sample points | same | roll only | same, larger angles |
### 7.2 Refraction around islands cheaply
Precompute once per seabed edit on a coarse grid (128 x 128 over the window): for each swell direction bin (8) and period class (3): trace each cell back along the wave ray in 16 steps with a depth-based `c = sqrt(g h)` (Snell per step), store direction and height factor `Ks * Kr` into an RGBA8 texture; add a shadow mask from the island outline blurred by `sqrt(lambda x / 2)`. Cost (COMPUTED): 128^2 cells x 16 steps x 24 bins = 6.3 M steps, about 50 to 150 ms in JS (UNVERIFIED on iPad); recompute only when the seabed changes (rare). Shader: one texture tap plus a direction lookup, about 1 to 2 percent of the sea fragment cost (SEA_PASS estimate is 21 taps at High); that is a design estimate, not measured. A bigger bilinear texture is not needed since the map is smooth.

## 8 Common mistakes and checklist
| Mistake | Fix |
|---|---|
| all waves the same height and shape | random heights: Rayleigh spread, wave groups from two close wavelengths |
| no swell | always at least one swell train, even in fair weather (1 m at 12 s, SEA_PASS has swell slots) |
| whitecaps uniform in size and position | cover from `W`, clustered on the steepest group crests, size by Hs, streaks only above 8 m/s |
| wave direction not matching wind | wind sea follows wind with 1 to 3 h lag; swell from the storm bearing; cross sea in between |
| no wave shadow behind islands | section 4: shadow depends on `w/lambda` |
| storm appears instantly | long swell 24 to 40 h before, falling pressure, cirrus, rising sea; the existing schedule needs these lead states |
| calm water inside a gale | wind drives chop, streaks and spray everywhere; only land lee slicks are calm |
| boats do not pitch | section 5 pitch rule |
| no spray | cliffs, boat bows, crests above 15 m/s |
| waves too steep or too sharp | cap steepness 1/7 and soften swell; one wavelength per crest |
| tide changes between two islands | tide uniform over the window |
| swell stops with the wind | swell lasts a day or more after the wind drops |
Checklist per state (judge against this, not taste): flat calm (WMO 1) mirror with sky, no foam; smooth (2) wavelets, no whitecaps; slight (3) glints and scattered caps, swell visible; moderate (4) many caps, chop over swell, small boats ship spray; rough (5) heaps, streaks begin, spray at cliffs, boats pitch hard; very rough (6) dense streaks, foam in the lee of boats and islands, no small boats; high (7+) white sea, spray sheets, surf over the cliff foot, nothing small afloat.

## 9 Pilot plan
1. `macro_sea.js` plain JS usable in node and in the page: storm schedule, vortex wind, swell packets, tide harmonics, surge, whitecap cover.
2. Tests (node): `L = 1.56 T^2` and `cg = 0.78 T`; a 14 s swell from 1500 km arrives at 38 h; `T(t) = 4 pi D / (g t)` for a 16, 14, 12 s sequence; a 960 hPa centre gives 0.53 m of barometric surge; whitecap cover at 10 m/s is 1 percent (3.84e-6 x 10^3.41); PM Hs at 20 m/s is 8.5 m; determinism of `macro(seed, hour)`.
3. Sea height function in JS and GLSL with a parity test.
4. Wire swell trains and whitecap/streak uniforms in the sea shader; wire boats (pitch, roll, `sailOk`), flotsam arrivals and tide plus surge.
5. Precompute the refraction map in a script.
6. What only a real device can answer: iPad frame time with vertex displacement, whether the shown swell wavelength reads as swell in a 1 m table, and how long a game day of swell warning feels right (1 game hour is 20 s, so 38 h is 12 min; shorten storm distance if too long).

## 10 What is faked
Wave amplitude exaggerated in miniature; swell wavelength shortened to fit the window; no nonlinear wave interaction, no spectral model (3 sines plus noise); diffraction and refraction from a map, not solved live; wave-current interaction reduced to a steepness band in races; whitecaps are noise placed by a formula; surge a sum of two terms; storms are vortices, not an atmosphere; weather and ocean macro state is one analytic scenario, not a forecast; wildlife and ships are rule-driven.

## 11 Could not verify (open before building)
Pierson-Moskowitz and JONSWAP constants, fetch and duration growth laws and the 68.8 coefficient (memory); Beaufort Hs from Met Office and WMO full tables (extracts disagree between agencies); Monahan range above 20 m/s; Holland formula and extratropical scaling (0.7 is a guess); swell decay law; breaker and surf formulas (memory of Coastal Engineering Manual); run-up and setup coefficients; boat Hs limits (no source); storm frequencies and depths for the North Atlantic; seal pup and seabird storm mortality; Atlantic typical Hs numbers; sea temperature range; iPad costs. Not reachable: Wikipedia, weather.gov, Met Office, HKO, MIT OCW, Oregon State, ECMWF and Copernicus documentation, WaveWatch III manual.
