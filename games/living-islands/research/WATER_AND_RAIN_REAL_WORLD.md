# Water and rain in the real world, from planet to puddle (research note, 24 Nov 2026)

Why this note: Harry said the game world should show how the real world works. The earlier notes cover clouds (`CLOUD_PHYSICS_FOR_VISUALS.md`, `CLOUD_ATLAS.md`), pretty weather (`BEAUTIFUL_WEATHER.md`) and rivers on a heightfield (`RIVERS_LAKES_WATER_CYCLE.md`). This note is the big picture they sit inside. It does not repeat them. Cloud types, rainbows, river algorithms and wire-up of fronts live there.

The model that goes with it: `globe/climate.py` (tests `globe/test_climate.py`, report `globe/CLIMATE_REPORT.md`).

How to read the tags. Every number carries **High / Medium / Low** confidence.
- **High**: textbook value, or checked against a source page I could see.
- **Medium**: standard value I know well, not checked against a page in this session, or a range that varies by source.
- **Low**: rough, depends on definition, or my own fit.

**What I could not do.** This session's network only let web *search* through. Full pages at usgs.gov, metoffice.gov.uk, wikipedia.org and similar did not open ("host not allowed"). So no page was read in full. Search summaries gave me a few checks (marked "search check" below). Everything else is from training knowledge and is marked Medium or Low. Before any number goes in front of a player as "real", check it at a source in the list at the end.

---

## 0. One-page summary

1. Almost all water is in the sea (96.5 percent). Fresh water is 2.5 percent, and most of that is ice. Rivers hold about 0.0002 percent. The air holds 0.001 percent but turns over every 8 to 9 days. (High)
2. The sun drives it. About 80 W/m2 of sunshine, averaged over the whole planet, goes into evaporating water. That is about 1000 mm a year, spread over the globe. When it condenses, the heat comes back into the air. Rain is how the air gets rid of heat. (High/Medium)
3. Warm air holds about 7 percent more vapour per degree. That one rule (Clausius-Clapeyron) is why the tropics are wet, the poles are dry, and warm air gives heavy downpours. (High)
4. Rain needs air to rise. Rising air cools and its vapour condenses. Four things lift air: heating from below (showers), fronts (frontal rain), hills (orographic rain), and large-scale convergence (the ITCZ). (High)
5. A spinning planet sets up belts: wet near the equator, dry at about 30 degrees, wet at 40 to 60, dry at the poles. Spin speed sets belt width. Tilt sets how far belts move with the seasons. Land and sea contrast adds monsoons. (High for the pattern, Medium for the scaling)
6. On land, rain goes three ways: back to the air (evapotranspiration, about 60 percent over land on average), to rivers (runoff), or into storage (soil, snow, groundwater). P = ET + Q + dS. (High)
7. A cool maritime island gets 1000 to 3000 mm a year, on 200 or more wet days, with most rain in autumn and winter, and hills wetter than coasts by a factor of 2 to 3. (Medium)
8. A small island holds fresh water as a floating lens. The lens goes down about 40 m for every 1 m the water table sits above the sea. Islands narrower than about 250 to 300 m at 2000 mm rain cannot hold a useful lens. (High for 40:1, Medium for the width)
9. For the game: compute rain from a few physical rules (section 7), not from a noise map. The headless model does this on the 72 x 36 grid and passes 34 tests. It is a toy that gets the geography right, not a forecast.

---

## 1. The global water cycle: stores, fluxes, energy

### 1.1 Stores and residence times

Residence time = store / flux through it. Short is fast, long is slow. The best-known numbers come from Trenberth et al. 2007 and Oki and Kanae 2006 (the USGS tables follow the same family). Numbers differ by 5 to 15 percent between papers.

| Store | Volume km3 | Share of all water | Residence time | Confidence |
|---|---|---|---|---|
| Oceans | 1,338,000,000 | 96.5% | about 3,000 to 4,000 years | High |
| Ice (ice sheets, glaciers, permafrost ice) | 24,000,000 | 1.7% | glaciers decades to centuries, ice sheets 10,000+ years | High volume, Medium time |
| Groundwater (all, fresh and salty) | 23,000,000 | 1.7% | days to thousands of years; shallow aquifers 10 to 100 years, deep 1000+ | Medium |
| of which fresh groundwater | about 10,500,000 | 0.76% | as above | Medium |
| Lakes (fresh and salty) | about 176,000 | 0.013% | 1 to 100 years; big lakes 100+ | Medium |
| Soil moisture | about 16,500 | 0.001% | two weeks to a year | Medium |
| Atmosphere | about 12,900 | 0.001% | 8 to 9 days | High |
| Rivers | about 2,100 | 0.0002% | about 2 to 3 weeks | Medium |
| Living things | about 1,100 | 0.0001% | about a week | Low |

Search checks: the framework (reservoirs in thousands of km3, fluxes in thousands of km3 a year) is Trenberth et al. 2007, reproduced at https://www.atmos.albany.edu/daes/atmclasses/atm551/OtherReadingMaterials/DaiTrenberth_2025_WaterCycle.pdf ; residence time = volume / loss rate, oceans thousands of years, biosphere about a week: https://meteor.geol.iastate.edu/gccourse/hydro/aspects/components.html ; USGS tables: https://www.usgs.gov/water-science-school/science/water-pools-and-fluxes-data-tables (page not opened).

### 1.2 Fluxes (km3 a year)

| Flux | km3/yr | As depth over its surface | Confidence |
|---|---|---|---|
| Evaporation from the ocean | about 413,000 | about 1,150 mm | Medium |
| Rain on the ocean | about 373,000 | about 1,030 mm | Medium |
| Rain on land | about 113,000 to 119,000 | about 750 to 800 mm | Medium |
| Evaporation and plant transpiration from land (ET) | about 73,000 | about 490 mm (about 60 to 65% of land rain) | Medium |
| Vapour carried from sea to land by wind | about 40,000 | | Medium |
| River and groundwater return to the sea | about 40,000 to 45,000 | about 300 mm over land | Medium |
| Global mean rain | about 505,000 | about 1,000 mm (2.7 mm/day) | High |

(The 413,000 and 113,000 values were confirmed as Trenberth 2007 by my search summary; runoff was "near 40,000 to 45,000 depending on source".) Sea loses more than it gains (413 against 373). Land gains more than it loses. The difference goes round as vapour over the coast and returns as rivers. That is the closed loop the game should preserve: **what evaporates must rain**.

Game use: the model closes the planet's budget this way. The pattern of rain comes from circulation, and the total is scaled until global evaporation equals global rain.

### 1.3 Why it rains at all: energy

- Evaporating 1 kg of water takes about 2.5 MJ (latent heat, 2.45 to 2.50 MJ/kg). 1 mm of water a day over a square metre is about 29 W. (High)
- Global mean evaporation is about 80 W/m2, a quarter of the sunshine that reaches the surface. Evaporation is the biggest way the surface cools after thermal radiation. (Medium)
- When vapour condenses in a cloud, the same energy is released into the air. The atmosphere then radiates it to space. That radiative cooling of the air (about 2 K a day, balancing about 2.7 mm a day of rain) is what **limits global rain**. (Medium) This is why global rain rises only 1 to 3 percent per degree of warming while moisture rises about 7 percent. Search check: https://link.springer.com/article/10.1007%2Fs10712-012-9213-z and https://pmc.ncbi.nlm.nih.gov/articles/PMC6853411 (precipitation 2 to 3 %/K, a range of 1 to 3 in Siler et al. 2018 https://earthweb.ess.washington.edu/roe/GerardWeb/Publications_files/SilerEtAl_Evaporation_ClimDyn18.pdf ). High on the idea, Medium on the number.
- **Saturation vapour pressure** (Magnus/Tetens formula): es = 6.112 exp(17.67 T / (T + 243.5)) hPa, T in C. About 6.1 hPa at 0 C, 12.3 at 10, 23.4 at 20, 42.4 at 30. (High; used in `climate.py`)
- **Clausius-Clapeyron rule**: es rises about 6.5 to 7 percent per kelvin (6.5 at 15 C, 7.5 at -10 C). Doubles every 10 K. Air at 30 C can hold about 4 times what air at 5 C holds. (High)
- **Lapse rate**: air rising in a dry parcel cools 9.8 K per km. Once saturated it cools slower (about 3 to 6 K per km in the lower air, because condensation gives back heat). The average atmosphere cools 6.5 K per km. (High) A parcel reaches saturation about 125 m up for every 1 K between air temperature and dew point (the lifting condensation level, from Espy; Medium). That is the cloud base in the existing cloud notes.
- **Condensation nuclei**: vapour will not form drops without a surface. Typical numbers: clean marine air 50 to 200 particles per cm3, polluted land 1000 to 10,000. Many small nuclei give many tiny drops, a whiter, longer-lasting cloud that rains less. Few nuclei give fewer, bigger drops that rain sooner. (Medium) Sea salt is the main marine nucleus.

---

## 2. Atmospheric circulation on a rotating planet

### 2.1 From first principles (plain)

1. The equator gets more sun than the poles. Warm air rises at the equator, so the air must move poleward aloft and sink somewhere.
2. If the planet did not spin, air would go all the way to the pole and back: one big cell each side.
3. Spin bends moving air (Coriolis). Air moving poleward aloft keeps its spin (angular momentum), so it speeds up eastward. At about 30 degrees it is too fast and unstable, and the cell breaks. Air sinks there. That is the **Hadley cell edge**. (High)
4. Held and Hou (1980) worked this out: the edge latitude scales as 1 over the rotation rate. Double the spin, half the width. Full climate models give a weaker dependence than that (about spin to the power -0.5 to -0.8; Medium/Low). The code uses -0.7.
5. Sinking air is dry and warm: the **subtropical dry belt** (deserts at 15 to 35 degrees). Sinking air also gives the clear subtropical high-pressure zones. (High)
6. Between the Hadley edge and about 60 degrees, the flow is a mess of storms that carry heat poleward. These **eddies** form because the temperature gradient is unstable (baroclinic instability). The mean result is the **Ferrel cell** (a bookkeeping cell, not a driven one). Storms track at 40 to 60 degrees and bring most mid-latitude rain. (High)
7. At the poles, cold air sinks and flows out as weak easterlies: the **polar cell**. (High)

Surface winds that follow: **trade winds** (easterly) between the equator and about 30 degrees, **westerlies** from about 30 to 60, **polar easterlies** above. (High)

### 2.2 Where rain falls

| Belt | Why | Rain per year on Earth |
|---|---|---|
| ITCZ (near equator) | trade winds meet, air rises, warm sea gives lots of vapour | 2000 to 4000 mm over sea; shifts with the season (High/Medium) |
| Subtropical dry belt (15 to 35) | air sinks, clear skies | below 250 to 500 mm over land (deserts), 300 to 600 over sea (Medium) |
| Mid-latitude storm tracks (40 to 60) | fronts and lows, lift from convergence | 600 to 1500 mm on flat coasts, more on hills (Medium) |
| Polar caps | cold air holds little vapour, air sinks | 50 to 200 mm water equivalent (Medium) |

- **Jet streams**: where the temperature gradient is strongest, high winds blow west to east. The subtropical jet is at about 30 degrees (the Hadley edge), the polar-front jet at about 50 to 60. Speeds 30 to 60 m/s average, over 100 m/s in winter peaks (Medium). The jet steers lows; it sits further poleward in summer and weaker. The existing weather chip sets "belts shift 3 degrees" in the drift model; real shifts are 5 to 8 degrees (Low).
- **Seasons and the ITCZ**: the rain belt follows the sun, with a lag of a month or two. Zonal-mean shift on Earth is about 5 to 8 degrees each way. Over big land masses it goes further, 20 to 25 degrees (monsoon). (Medium)
- **Monsoon**: land heats faster than sea. In summer the land is warm, air rises over it, and moist sea air is pulled in. Rain comes in a wet season of 3 to 4 months. In winter the flow reverses and it is dry. The signature: **wet season on the summer side of the equator**, dry in the opposite season. Needs a big landmass at 10 to 30 degrees from the equator. (High for mechanism)
- **Sea breeze**: day heating makes air rise over land, cooler sea air moves in at 3 to 8 m/s, reaching 20 to 50 km inland by evening, sometimes with a line of cloud. At night it reverses weakly (land breeze). (High) Small islands in the tropics often get an afternoon cloud and shower over the hills. (Medium)

### 2.3 What changes on an invented planet

| Change | Effect | Confidence |
|---|---|---|
| Slower spin | Hadley cell wider; dry belts move poleward; weaker storm tracks; at very slow spin (Venus-like) one cell pole to pole, wet equator and dry elsewhere | High direction, Low amount |
| Faster spin | Hadley narrower (edge about 18 degrees at double spin); several jets and belts instead of three (the eddy size scales as sqrt(wind / beta), beta = 2 spin cos(lat) / radius); more bands | High direction, Low amount |
| No tilt | No seasons; ITCZ stays at the equator; no monsoon from seasonal swing | High |
| Big tilt (45 degrees) | Huge seasons; poles get more sun in summer than the equator; ITCZ swings 30 to 40 degrees; very strong monsoons; hot summers at high latitude | Medium |
| Land | Land has less thermal inertia: bigger temperature swings, monsoons, rain-shadow deserts, and inland dryness | High |

**Recipe for the game** (all of it is in `climate.py`; section 7 gives the steps):
1. Hadley edge `H = asin(sin 30 deg x spin^-0.7)`, capped at 70.
2. Storm track latitude `1.65 H`, strength from the equator-to-pole temperature drop at that latitude (winter stronger).
3. ITCZ latitude per longitude = where the surface is warmest in the tropics, smoothed, capped at 0.75 x 0.9 x tilt.
4. Vertical motion index W = ITCZ ascent minus subtropical descent at about plus/minus H plus storm-track ascent minus polar descent.
5. Rain = W (where positive) x Clausius-Clapeyron moisture x marine moisture fraction.

---

## 3. How rain actually forms and falls

### 3.1 Two ways to make a raindrop

- A **cloud drop** has about 10 micrometres radius (20 diameter). It falls at about 1 cm/s: it floats. A **raindrop** is 0.5 to 5 mm across. Making one needs about a million cloud drops merging. (High)
- **Warm rain** (collision and coalescence): in a cloud with tops warmer than about 0 C, bigger drops fall faster and catch smaller ones. Needs a cloud 1 to 2 km thick or more with few nuclei; works over tropical sea and on maritime islands. Makes drizzle in thin stratocumulus. (High)
- **Cold (ice-crystal) rain** (Bergeron-Findeisen): between 0 and -20 C, some drops stay liquid (supercooled). Vapour pressure over ice is lower than over water, so ice crystals grow at the water drops' expense. Crystals grow, clump, fall, and melt below the 0 C level. Most mid-latitude rain starts as snow. (High) That is why a rain cloud needs its top to reach about -10 C to rain well, and why shallow, warm cloud only drizzles.
- Terminal speed: 0.5 mm drizzle drop about 2 m/s; 2 mm about 6.5 m/s; 5 mm about 9 m/s (does not go much faster, breaks up above 5 to 6 mm). (High) Snowflakes 1 m/s; hail 10 to 40 m/s depending on size. (Medium)
- Size classes: **drizzle** under 0.5 mm, rate under 1 mm/h; **rain** over 0.5 mm; **shower** drops are bigger, from convection. (WMO cloud atlas character-of-precipitation page: https://cloudatlas.wmo.int/en/character-and-intensity-of-precipitation.html , search check only.)

### 3.2 Four rain types

| Type | Lift comes from | Look | Typical rate | Typical duration |
|---|---|---|---|---|
| Convective | surface heating, cold air over warm sea, or uplift in unstable air | cumulus to cumulonimbus, patchy, short, heavy | 5 to 50 mm/h, over 100 in thunderstorms | 10 to 60 min per cell (High) |
| Frontal (warm and cold fronts) | warm air riding over cold; wedge lift | thick layered cloud (altostratus, nimbostratus), widespread | 1 to 5 mm/h, warm front; cold front 5 to 20 in a line | warm front 6 to 12 h, cold front under 2 h (see CLOUD_ATLAS 7) |
| Orographic | wind pushed up a hill | cloud on the windward slope and summit; stationary | adds 2 to 4 times the sea rate | as long as the wind blows (High) |
| Convergence / ITCZ | large-scale rising air | big cloud clusters | 5 to 20 mm/h in bursts | hours (Medium) |

- **Orographic rule**: extra lift = wind speed x slope of the ground. Rain falls out of the lifted vapour. The windward slope gets rain, the lee side sinks and warms and is dry: a **rain shadow**, often 30 to 70 percent less. Example from memory: a west-coast mountain range at 55 to 58 degrees N getting 3000 to 4000+ mm on the windward summits and about 600 to 800 mm 50 to 100 km down wind (Medium). The code lifts by `u . grad(h)` and drops a share `K_ORO = 0.30` of the lifted vapour flux.
- **Fronts and lows**: a low forms where a jet-level disturbance meets a strong temperature gradient (baroclinic wave). It grows over 1 to 3 days, moves east at 10 to 20 m/s (36 to 72 km/h; the existing storm note uses about 15), gets a cold front behind and a warm front ahead, and fills after 3 to 7 days. A typical low is 1000 to 2000 km across. Passes every 3 to 6 days at 50 degrees N. (High/Medium) See `CLOUD_ATLAS.md` section 7 for the sequence of clouds.
- **Fog**: air cooled to its dew point at the ground. Radiation fog (clear calm night, over land, burns off in the morning), advection fog (warm moist air over cold water or cold land), sea fog (air over a cold current), upslope fog (hills), steam fog or sea smoke (cold air over warm water, see BEAUTIFUL_WEATHER 5.2). Visibility under 1 km is fog; 1 to 5 km mist or haze. (High)
- **Drizzle**: from thin low stratus or stratocumulus over a cool sea; under 1 mm/h, drops under 0.5 mm, can last a day, soaks without puddling. (High)
- **Snow**: precipitation that stays frozen all the way down, which needs the whole air column near or below freezing (surface temperature up to about +1 or +2 C when the air is dry enough to cool the flakes by evaporation). One mm of water gives about 10 mm of dry snow, 3 to 5 mm of wet snow (Medium). **Sleet** (UK: rain and snow mixed; US: ice pellets) is flakes partly melted, or rain refrozen in a cold layer near the ground. **Freezing rain**: liquid rain onto a ground below freezing, glaze ice. (High)
- **Hail**: ice built up in layers by strong updrafts of 10+ m/s (big hail needs 20 to 50 m/s) in tall thunderstorms. Over sea in cool air, small hail and graupel in cold showers is common (Medium).
- **Thunderstorms**: need unstable air, moisture and a trigger. Tropical sea, summer land. Cool maritime coast: thunder on 5 to 15 days a year, mostly in showers behind cold fronts in winter, or in summer over land. (Low/Medium)

### 3.3 How much? Intensity classes and amounts

Intensity classes are **not standardised worldwide**. The WMO guidance has no single agreed definition; it gives heavy rain over 4 mm/h, heavy showers over 10 mm/h, violent over 50 mm/h (search check on the WMO community aviation page, https://community.wmo.int/node/36998 ). Met Office wording: heavy is 4 mm/h or more. Common three-tier scheme: light under 2.5, moderate 2.5 to 7.6, heavy over 7.6 mm/h (US handbook, Medium). The game's `weather.js` already uses showers 2, rain 4.5, storm 9 mm/h, which sits in this range.

| Class | mm per hour | What it looks like | Game state |
|---|---|---|---|
| Drizzle | under 1 | mist, fine drops, no splash | between fog and overcast |
| Light rain | 0.5 to 2.5 | ripples, little puddling | showers |
| Moderate rain | 2.5 to 7.5 | puddles, gutters run | rain |
| Heavy rain | 7.5 to 50 | splash, hard to see 200 m | storm |
| Violent | over 50 | roaring, flash floods | storm peak |

Extremes (Medium): 1-hour maxima of 100 to 300 mm have been recorded in tropical and thunderstorm settings; a one-minute peak of more than 30 mm is possible. **Total per day**: on a rainy maritime day, 5 to 15 mm. A "very wet" day 25+ mm. A 100-mm day is a once-in-years event at a wet western site (Medium).

**Cool maritime island climate** (north-east Atlantic style, Medium everywhere): annual rain 800 to 1500 mm on low coasts, 2000 to 4000+ mm on high west-facing hills; 150 to 250 wet days a year (a wet day is 1 mm or more); wettest in autumn and winter (Oct to Jan, 1.5 to 2 times the driest month); driest in spring (Mar to Jun); the typical hourly rate when it rains is 1 to 3 mm; rain falls in about 8 to 15 percent of all hours at a wet coast; gale days 5 to 30 a year; fog 10 to 40 days; frost on 0 to 40 days; lying snow 0 to 10 days at the coast, 30+ on high ground. Mean temperature about 8 to 11 C in the 50s north, summers 14 to 17, winters 3 to 6 (the sea keeps the winter mild). Year-to-year variability of annual rain is about 15 to 20 percent (Medium). Compare the weather.js check: if 15 percent of hours are rain with an average 3 mm/h, the year gets about 4 m. That is too much. Drizzle and light rain dominate hours, so the game's long-run rain average should sit nearer 1.5 to 2 mm/h to give 1500 mm a year.

---

## 4. The ocean's role

- **Sea surface temperature (SST) sets evaporation**. Bulk formula: E = rho_air x C_E x wind x (q_sea - q_air), with C_E about 1.2e-3 and q the specific humidity. E rises about 6 percent per kelvin of SST (the CC rule) and about linearly with wind. Open-ocean evaporation: 1000 to 2000 mm a year in the trades, 500 to 1000 at 50 degrees, near zero under sea ice. Zonal pattern is **max near 15 to 25 degrees** (trade winds, dry air) and lower on the equator (calm, humid). (High form, Medium numbers; used in `climate.py`)
- **Evaporation minus rain** (E - P) sets the salt: subtropical oceans have more E than P and are saltier (36 to 37 psu); the ITCZ and the high latitudes have more P and are fresher (33 to 34). Mean 35 psu. (High) Hot, salty water sinks; cold, fresh water floats. Heavy island rain makes a thin fresh surface film near the shore, and mouth plumes.
- **Currents move heat**. The Stommel-style gyres in `globe/circulation.py` already do this. Western boundary currents carry warm water poleward (warm coast, mild winters, more evaporation, more storms feeding on it); eastern boundary currents carry cool water toward the equator (cool coast). In the code: +3 C for poleward flow share, -2 C for equatorward flow share.
- **Cold current coast**: cool SST, air above is stable, a low inversion, so convection is suppressed. Result: **dry coast, frequent fog and low stratus** that forms over the cold water and drifts ashore. The strongest case on Earth is the narrow desert strips on the eastern boundary of the subtropical gyres (on both sides of the world; Medium). The model reduces rain by `exp(0.08 x SST anomaly)`, limited to 0.5 to 1.6 (TUNING), and raises fog days with the temperature drop between upwind air and local sea (TUNING).
- **Warm current coast**: warm, humid, unstable air, rain and storms fed from the sea; winters mild. NW Europe is about 5 to 10 C warmer in winter than other places at the same latitude (Medium). Tropical cyclones need SST above about 26.5 C, a spinning disc away from the equator (at least 5 degrees), low wind shear. (High)
- **Storm surge** = low pressure + wind pushing water onshore. The inverse barometer gives 1 cm per hPa below 1013 (960 hPa gives 0.5 m). Wind setup depends on wind speed squared, fetch and shallow water: 0.5 to 3 m in a bad storm on a shallow coast, much more in funnel-shaped bays. Total flood level = tide + surge + waves. High tide at the moment of peak surge is the dangerous coincidence. (High, see also RIVERS_LAKES 2.5)
- **Sea state, fog and sea smoke** link to the existing sea notes. In cold season, cold air over warm water (SST minus air temperature over about 10 K) gives sea smoke.

---

## 5. Land water

### 5.1 What happens to a raindrop on land

1. **Interception**: leaves and needles catch the first rain. Grass and crops hold about 1 to 2 mm per storm, forests 2 to 5 mm, losing 10 to 40 percent of annual rain in dense conifer woodland (Medium). It evaporates straight back.
2. **Infiltration**: water soaks in at a rate set by soil. Sand 20 to 200 mm/h, loam 10 to 30, clay 1 to 5, compacted or frozen ground close to 0 (Medium). If rain comes faster than the soil takes it, the extra runs off over the surface (**Hortonian overland flow**). If the soil is already full, the extra also runs off (**saturation excess**). Both make fast floods.
3. **Soil moisture**: stored between wilting point and field capacity. A typical soil holds 100 to 200 mm of plant-available water per metre depth; the game bucket is 150 mm (TUNING).
4. **Evapotranspiration (ET)**: water that plants pull from the soil and evaporate through leaves, plus direct soil evaporation. Potential ET (PET) is how much the air could take with unlimited water. Actual ET is PET times a dryness factor. Methods in order of cost: (a) Thornthwaite, temperature only (monthly mean T, Medium); (b) Hargreaves, temperature and its daily range and sunshine: PET = 0.0023 Ra (T + 17.8) sqrt(Trange), Ra in mm/day of equivalent evaporation (used in `climate.py`, Medium); (c) Priestley-Taylor, radiation based, PET = 1.26 x Delta/(Delta+gamma) x Rn/lambda (Medium); (d) Penman-Monteith, full: radiation, temperature, humidity, wind, plant resistance (the reference standard, High). Cool maritime values: 400 to 600 mm a year of PET, actual ET 350 to 550 (Medium). Tropical wet forest ET 1000 to 1500 (Medium). Desert ET equals rain.
5. **Runoff and baseflow**: surplus water flows over the surface (quick) or slowly through soil and groundwater (slow). Stream flow between storms is **baseflow** and comes from groundwater; storm flow comes from the quick part. The baseflow index (share of flow that is baseflow) is 0.2 to 0.4 on thin rocky soil (steep hills, quick floods) and 0.6 to 0.9 on chalk, sand and thick till (steady streams) (Medium).
6. **Groundwater, springs and aquifers**: water table is the level below which all pores are full. An **aquifer** is rock or sand that holds and passes useful amounts. A **spring** is where the water table meets the surface, often at the foot of a slope or where a permeable layer lies on an impermeable one. Groundwater moves 0.01 to 10 m a day (Medium). On thin volcanic or crystalline islands the stores are small and the springs fail in drought; in porous limestone or sand they are steady.
7. **Peat and bogs**: where rain is high (over about 1000 mm), wet days many (over about 160 a year) and summers cool, plant remains do not rot in the waterlogged ground and build peat, 0.5 to 1 mm a year. Blanket bog covers flat or gently sloping ground. Peat is 90+ percent water. It stores a lot but releases it fast after wet spells (quick floods) and gives brown water. (Medium) The existing veg set has bog (class 4).
8. **Lakes and wetlands**: lakes smooth floods (outflow rises with the 1.5 power of the head over the sill; see RIVERS_LAKES section 2.4). Wetlands hold water at a given level and hold ET up all summer.
9. **Snow and glaciers**: snow stays where mean winter temperature is under about 0 C. Melt about 2 to 5 mm per degree-day above 0 (the game uses 3). Snowpack delays water: spring melt floods. A glacier forms when more snow falls than melts for many years; it flows downhill, melts at the front, and gives summer water. Snowline is about 5 km at the equator, near sea level at the poles (High, rough). **Permafrost**: ground frozen for two or more years; seasonal thaw of the top 0.3 to 2 m makes a boggy ground over frozen ground that blocks drainage (High, brief).
10. **Floods and droughts, how often**: "100-year flood" means 1 percent chance in any year. A river with a 10-year flood has about 65 percent chance in a 10-year run. Flash floods on small steep catchments happen after 20 to 100 mm in a few hours. For rain, a meteorological drought (under 60 to 75 percent of normal for several months) happens in a maritime climate about once in 5 to 10 years; long spells of 15 to 30 dry days occur each year or two. Big continental interiors vary 30 to 40 percent year to year (Medium/Low).

### 5.2 Water balance P = ET + Q + dS

Over a year dS (change in storage) is about zero. Over one wet winter it is not: soil and groundwater fill, then drain in summer.

**Worked example A, a wet cool island, 10 km2** (Medium, arithmetic High):
- P = 1600 mm; ET = 500 mm; so Q = 1100 mm. 10 km2 = 10 million m2, so Q = 11 million m3 a year, a mean 0.35 m3/s. In flood a burn here could run 5 to 10 times that.
- Baseflow share 50 percent: dry-spell flow about 0.1 to 0.2 m3/s.

**Worked example B, a dry island, 10 km2**: P = 600, ET = 450, Q = 150 mm, so 1.5 million m3 a year, mean 0.05 m3/s, with long summer zero-flow spells unless there is a spring.

**Worked example C, a village**: 100 people need 50 L/day each for drinking, cooking and washing = 5 m3/day = 1800 m3/year. A 50 m2 roof in 1000 mm rain collects 50 x 1.0 x 0.8 = 40 m3 a year, 110 L a day on average. About 45 such roofs supply 100 people if tanks are big enough for the dry spell. Cistern size = demand x longest dry spell (about 30 to 60 days) (Medium).

### 5.3 Fresh water on small islands (matters for settlers)

- Rain that soaks in sits on top of the sea water below because it is lighter (1000 against 1025 kg/m3). The fresh water forms a **lens**, like a lens of glass, thickest in the middle. (High)
- **Ghyben-Herzberg**: for every 1 m the water table stands above sea level, the lens goes about 40 m below. Exact number is rho_f / (rho_s - rho_f) = 40 for 1025 kg/m3 sea water; 0.975 x 40 in some forms. A USGS page confirms the rule of thumb: https://www.usgs.gov/centers/new-york-water-science-center/science/long-island-fresh-and-saltwater-relationsinteractions (search check; the 40:1 only applies for still conditions and departs near the shore, as Vacher 1988 showed). High.
- **Pumping effect**: a 1 m fall in water table (from pumping) shrinks the lens by about 40 m, so wells must pump gently. One deep well, or a pump drawing at a high rate, pulls up salt water from below (**upconing**). Skimming (a shallow well or horizontal gallery) is safer. (High)
- **Thickness of the lens (Dupuit with Ghyben-Herzberg), strip island of width L, recharge W, hydraulic conductivity K**: head at the centre h = (L/2) sqrt(W / (K (1 + 40))); lens thickness = 41 h. Linear in the width. In practice the mixing zone eats about half of it. Example in `freshwater_lens()`: K = 10 m/day sand, W = 350 mm/yr recharge, L = 1 km: h = 0.77 m, lens 31 m thick, usable about 16 m. Real coral atolls are thinner (10 to 25 m) because K is 100+ m/day and tides mix the water. (Medium)
- **How big?** Search check: a field survey of small atolls with about 1938 mm rain gave a threshold width for a freshwater lens of about 270 m. At 2000 mm it is about 250 m; the smallest island that can hold a lens depends on rain, so drier means wider (Falkland and Underwood, cited in https://www.frontiersin.org/journals/water/articles/10.3389/frwa.2022.832227/full and https://mdpi.com/2077-1312/13/4/738 ). Medium. In the model `lens_min_width()` gives about 250 m at 350 mm recharge and 10 m/day. Rule for the game: **under 250 m wide, no lens; 250 to 500 m, a thin brackish lens that fails in drought; over 1 km, a dependable lens** (TUNING from the above). Lens needs recharge, so a low coral island with 600 mm rain and large evaporation is poor; a volcanic island with 2000 mm and a hill has springs and streams as well, and does not rely on a lens.
- **Sea level rise and storm waves** push salt water in from the sides and from above (overwash). One overwash event can spoil a lens for months to years; recovery takes years. A 0.5 m rise raises the water table about 0.5 m and cuts the island's dry land; the lens thins where the island is low (Medium).
- **Wells**: a dug well of 1 to 3 m depth, in the middle of the island, drawn slowly, brackish when the tide goes out is a sign of over-pumping. Wells in the lens rise and fall with the tide (a small amount, 10 to 30 percent of the tide range) (Medium).

---

## 6. How people use and change water (brief)

| Practice | How it works | Numbers |
|---|---|---|
| Wells | dig or drill to the water table; lift by bucket, windlass, pump | a hand-dug well gives 0.5 to 5 m3/day (Medium) |
| Cisterns and roof catchment | collect roof run-off in a tank; first flush diverted | 0.8 L per mm per m2 of roof; tank size from dry spell (above) |
| Mills | head of 2 to 5 m on a burn: a mill needs 0.1 to 0.3 m3/s | RIVERS_LAKES 5.1 |
| Weirs, leats, ponds | store water and raise head; block fish | |
| Irrigation | add water when ET exceeds rain; 300 to 800 mm a season in a dry summer | (Medium) |
| Drainage | ditches lower the water table, dry bog, peat shrinks, floods get quicker | |
| Tree clearing | less interception and ET, more runoff, quicker floods, more erosion | |
| Pumping too much | lowers water table; on islands, salt water rises | section 5.3 |

---

## 7. A simple computable recipe for the game

Input: planet land mask and ice, sea surface temperature field from `globe/circulation.py`, tilt, spin, a day of year. Output: monthly rain, temperature, evaporation, water balance on the 72 x 36 grid, then local climate for an island. It is all in `globe/climate.py`. Everything is deterministic; the same seed gives the same hash. Run time is about one second per planet.

**Step 1: Sun.** Daily-mean insolation Q(lat, doy, tilt) from the declination `sin(dec) = sin(tilt) sin(2 pi (doy-80)/365)` (High; circular orbit).

**Step 2: Temperature.** Annual mean at sea level: sea cells use the globe SST minus 0.5 C; land uses `27.5 - 38 sin^2(lat)` (my fit to Earth's zonal mean, Medium); a cell near the coast mixes the two with the ocean share. Seasons: `0.07 K per W/m2` over land with a 15 day lag; `0.022 K per W/m2` over sea with a 55 day lag (fits +-14 K for 50 N continental, +-4.5 K for sea, Medium/Low). Lapse 6 K per km with height.

**Step 3: Circulation.** Hadley edge from spin, storm track at 1.65 times it, ITCZ at the warm surface latitude (section 2.3). Vertical-motion index W built from Gaussians. Winds from the same widths (trades, westerlies, polar easterlies). Toy: no real wind, pressure or humidity transport.

**Step 4: Rain.**
```
P = cq(T) x [ max(W,0) x stab + floor ] x meff x lee + P_oro      (mm/day, then scaled by f)
cq    = exp(0.0693 (T - 15))         the Clausius-Clapeyron factor (7 percent per K)
stab  = exp(0.08 x SST anomaly)      warm sea more, cold current less
meff  = 0.25 + 0.75 x marine         share of air that came over the sea (decays e-fold 3500 km over land)
lee   = 1 / (1 + descent / 0.012)    rain shadow
P_oro = 0.30 x max(u . grad h, 0) x rho x q x 86400      wind uphill
```
**Step 5: Close the budget.** Ocean evaporation by the bulk formula; land by Hargreaves and a soil bucket (150 mm, 3 mm/K/day melt, groundwater store). Scale all rain by one factor f so global evaporation equals global rain. If f is near 1, the independent pieces agree. They do: f is 0.97 to 1.23 over 60 seeds.

**Step 6: Local climate** (`Climate.local(j, i)`): annual rain, monthly rain, wettest and driest three months, rain days (wet-day fraction `1 - exp(-P/4.5 mm)`), snow days from monthly temperature, freeze days from the temperature spread, gale days from storm-track strength and exposure (toy), fog days from upwind air temperature minus local sea temperature (toy), water balance for a small island (ET, runoff, recharge), and freshwater lens size.

**Accuracy: solid, toy, invented.**
- Solid physics (High): insolation from tilt; Clausius-Clapeyron moisture; latent heat and the energy budget; Hadley edge shrinking with spin; ITCZ following the warm surface; rain from lift; rain shadow from descent; P = ET + Q + dS; Ghyben-Herzberg 40:1; global evaporation = global rain.
- Toy (Medium/Low): the scaling exponents (0.7), the Gaussian belt widths, the marine moisture decay, orographic efficiency, wind fields, the storm-track strength rule, the island gale and fog formulas, the bucket parameters. Directions are right; amounts are within about a factor of 1.5 to 2 (my judgement, not tested against data).
- Invented: the planet (land noise, mountains from the same noise), the warm cool SST (the globe model puts a cool Atlantic-like sea at high latitude that is warmer than Earth's), the exact layout of every continent.

Known weak points in the model, so nobody trusts them: very banded rain maps (zonal belts dominate), too little land rain in continent interiors, no monsoon on small continents, no stratocumulus decks, no hurricanes, a single storm track in each hemisphere, ocean SST seasonality only from insolation lag.

---

## 8. What the player and the game systems should see

Tie to what exists: `weather.js` states `clear, fair, overcast, showers, rain, fog, storm, goldenhour` with rainMm 2, 4.5, 9; the sky clock (`sky_clock.js`, latitude 48 to 64 N, day of year, season); `macro_sea.js` (storms, surge, tide). The weather picker has fixed state weights `W`. The recipe replaces the fixed weights with weights that depend on the island's local climate and day of year.

### 8.1 Mapping local climate to weather.js

From `Climate.local()` for the island's cell:
- Monthly wet-day fraction `w_m = 1 - exp(-P_m/(30.4 x 4.5))`. Choose each day's "wet or dry" with probability `w_m`, with persistence (a wet day follows a wet day 60 to 70 percent of the time; Medium) so spells clump.
- Rain type from season and temperature: cold season, fronts (long `rain`, 6 to 12 h, with the warm-front cloud sequence in CLOUD_ATLAS 7), then cold-front squall, then `showers` for 6 to 24 h. Warm season, short convective `showers` and the odd thunderstorm. Fog when advection fog index is high, on cold-current coasts, in spring and early summer, at dawn.
- `storm` when the gale roll hits (`gale_days / 365` per day, more in the cold season).
- Snow when the month's snow fraction is high and the sky is rain: set `precipitation = snow` on the existing rain particles (white, slow, 1 m/s) when the air temperature is below about +1 C.
- Hour-by-hour: use the state durations (`DUR`) already in `weather.js`; scale total rain hours so the annual total matches the recipe (section 3.3 check: aim for about 1.5 to 2 mm/h average over rain hours).

### 8.2 What the player sees (and what each one is a sign of)

| Sight | Cause | State link |
|---|---|---|
| Drizzle and mist on a cool morning | warm air over cold sea, stratus | fog or overcast, low `rainMm` |
| Fronts: high cirrus, thickening cloud, steady rain, then a gust and a clear sky | warm and cold front | CLOUD_ATLAS 7 |
| Showers with sun and rainbow | cold unstable air behind a front | showers + BEAUTIFUL_WEATHER |
| Windward hill wrapped in cloud, lee side bright | orographic rain, rain shadow | per-cell cloud base from the hill height |
| Puddles that fill in rain, shrink in hours of sun | infiltration, ET | `wet` uniform with a drying lag |
| Burns that rise in hours after rain, brown with peat, then drop | quick runoff, baseflow | RIVERS_LAKES section 4 |
| Lake level and shore ring | seasonal balance | lake quad |
| Frost and white ground; snow on high ground | freeze days, snow fraction | frost in BEAUTIFUL_WEATHER 5 |
| Flood: river over the bank, surge at high tide | big storm + spring tide | macro surge + hydrology |
| Drought: dry spell of 3 or more weeks, burns shrink to a trickle, cracked mud, wells falling, grass brown | rare dry summer | a "drought" flag when the 60-day rain is under 40 percent of normal |
| Well turns brackish | pumping too fast, drought, overwash | lens thickness |
| Spring in a bog edge, steady all year | groundwater | baseflow store |

### 8.3 Ranked minimal build list (rough cost, one builder-session = one focused session)

| Rank | Build | Cost | Why |
|---|---|---|---|
| 1 | Ship `climate.py` as data: for each island world, compute `local()` once and store a small JSON (12 monthly rain, T, wet-day fraction, gale, fog, freeze) | half a session | gives every other item its input |
| 2 | Replace the fixed `W` state weights in `weather.js` by month-by-month weights from that JSON | half to one session | rain, fog, storm now vary by season and by latitude on every island |
| 3 | Daily wet/dry with persistence, front sequences from the existing schedule | one session | rain comes in spells, not randomly |
| 4 | Wetness store with lag: a scalar `wet` that rises in rain and falls with drying (the ET rate), driving puddles, dark ground, burn level | half a session | the single most visible water effect for the cost |
| 5 | Island water balance (bucket, snow, groundwater): feeds spring, burn and lake levels, drought flag | one session | links rivers and wells |
| 6 | Freshwater lens and wells (settler chore: rate, brackish state) | half a session | gives settlers a real water problem |
| 7 | Snow and frost by month | half a session | uses the temperature series |
| 8 | Cloud base and cloud density per hill cell (rain shadow look) | one session | needs cloud pass |
| 9 | Planet map view of rain belts for the globe view | one session | shows the big picture |

### 8.4 Cheap rules for the game (drop-in)

- Annual rain for an island at latitude `lat` in a cool-sea band: take it from the model. As a floor/ceiling for sanity: 600 to 3600 mm.
- A cold current coast: 30 to 50 percent less rain, 2 to 4 times as many fog days.
- Lee side of a 500 m hill in westerlies: about 40 to 60 percent of windward rain.
- Island of 10 km2 at 1600 mm: burn mean flow about 0.35 m3/s.
- Lens: usable thickness about `0.5 x 41 x (L/2) x sqrt(W / (41 K))`; none under 250 m wide at 350 mm recharge.

---

## 9. Common mistakes in game weather and water, and open questions

### 9.1 Mistakes to avoid

1. **Rain from noise**: random rain blobs with no cause. Fix: rain comes from air rising (front, hill, heat), so it has a direction and a shadow.
2. **Uniform rain everywhere on the map**, no windward and lee. Fix: hill height times wind.
3. **Rain that never stops or never builds**: real rain has a build-up (cirrus, haze, wind rises), a heavy middle, and a clearing. Use the front sequence.
4. **Constant intensity**: real rain varies by 10 times within an hour. Use gusts of intensity.
5. **Rain in a clear sky, or no wet ground after rain.** Wetness must lag.
6. **Same weather in every season and every latitude.** Use the monthly weights.
7. **Rivers that never change**: flow must rise after rain and fall back slowly (baseflow).
8. **Deserts on the wrong side of the planet.** Deserts sit under sinking air at 20 to 35 degrees and in rain shadows and cold-current coasts, not "far from the sea" alone.
9. **Water created or destroyed**: no budget. Fix: P = ET + Q + dS everywhere.
10. **Snow at 5 C** or rain at -10 C. Snow needs a cold column, near or below 0 C at the ground, a bit above if dry air.
11. **Wells that never run dry** and lakes that never change level.
12. **Perfect fog**: fog by a random number rather than a cold surface, still air and moisture. It burns off by the sun.
13. **Same drop speed for drizzle, rain and hail.**
14. **Weather cycles of exactly the same length**: lows vary 3 to 7 days.

### 9.2 Open questions for Harry (taste only)

1. How wet should the default island be: soft and misty (about 1200 mm, a lot of drizzle and fog), or properly wet and stormy (2000+ mm, many fronts)?
2. Should droughts and floods be rare events (once in 5 to 10 years, tell a story) or a regular part of play every year?
3. Should wells and the freshwater lens be a hard problem (small islands often fail, settlers must plan) or a gentle one (always a bit of water, only a warning light)?
4. Should snow be part of the look at 48 to 64 N (light dusting on hills), or only on very high ground?
5. How much should the player see of the planet-scale pattern (a map of rain belts), or only feel it on the island?
6. Is the cold sea at the island latitudes meant to be as warm as the current globe model makes it (about 12 to 14 C mean at 52 N), or colder, like a real North Atlantic island (8 to 10 C)? That changes snow, frost and fog.

---

## 10. Sources and what I could not verify

Checked by search summary (pages not read in full):
- Water stores and fluxes (Trenberth et al. 2007 framework): https://www.atmos.albany.edu/daes/atmclasses/atm551/OtherReadingMaterials/DaiTrenberth_2025_WaterCycle.pdf ; https://meteor.geol.iastate.edu/gccourse/hydro/aspects/components.html ; https://www.usgs.gov/water-science-school/science/water-pools-and-fluxes-data-tables ; https://ntrs.nasa.gov/api/citations/20170002756/downloads/20170002756.pdf
- Clausius-Clapeyron and global rain increase: https://link.springer.com/article/10.1007%2Fs10712-012-9213-z ; https://pmc.ncbi.nlm.nih.gov/articles/PMC6853411 ; https://earthweb.ess.washington.edu/roe/GerardWeb/Publications_files/SilerEtAl_Evaporation_ClimDyn18.pdf
- Rain classes: https://community.wmo.int/node/36998 ; https://cloudatlas.wmo.int/en/character-and-intensity-of-precipitation.html ; US Federal Meteorological Handbook No. 1 chapter 8 (https://www.ofcm.gov/ listing; not opened)
- Ghyben-Herzberg and lens width: https://www.usgs.gov/centers/new-york-water-science-center/science/long-island-fresh-and-saltwater-relationsinteractions ; https://www.frontiersin.org/journals/water/articles/10.3389/frwa.2022.832227/full ; https://mdpi.com/2077-1312/13/4/738 ; Bailey et al. 2008 atoll groundwater report (WERI TR 119, https://ghs-cdn.uog.edu/wp-content/databases/Library/PDFs/TRs/WERI%20TR%20119%20-%20Bailey%20et%20al%202008.pdf , not opened)

From knowledge, not checked in this session (textbooks to check them in): Held and Hou 1980 (Hadley edge); Holton, *An Introduction to Dynamic Meteorology* (circulation, fronts); Wallace and Hobbs, *Atmospheric Science* (cloud physics, Bergeron process, lapse rates); Hargreaves and Samani 1985 (PET); Fetter, *Applied Hydrogeology* (Dupuit and Ghyben-Herzberg lens); Dingman, *Physical Hydrology* (water balance, infiltration). Open university course notes on these are free.

Could not verify: peat and blanket bog thresholds (1000 mm, 160 wet days); lying-snow and gale-day counts for a particular cool island; hourly rain share of time; the 5 to 8 degree ITCZ shift; exponent -0.7 for Hadley width against spin (a modelling-study range I recall as -0.5 to -0.8); wet-day persistence 60 to 70 percent; the atoll lens thickness range; fog-day numbers; interception shares. All Low or Medium.
