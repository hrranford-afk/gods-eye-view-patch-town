# Globe and drift (research note): a seeded planet whose currents bring the sea's gifts
Do not put real place names into game code, assets or recipes (real names appear only inside this note, as examples).
Status: research note, Living Islands (branch citylab/cloud-islands), 23 Nov 2026. Gate note for the "Our own globe" idea in `EVOLUTION_TREE.md`. Companions: `SEA_STATE_AND_OUTER_WORLD.md` (macro sea, section 6.5 arrivals), `FLOW_TYPES.md` (3 percent leeway, section 3.4), `WILDLIFE.md` (leatherback legend, section 9), `BEACH_COLLECTOR.md` (strandline rates), `MACRO_SEA.md`, `ecosystem/shore_catch.py` (what catch assumes today), `MODES_AR_DESKTOP_HANDHELD.md` (tiers).

Method and limits (honest): WebSearch extracts only. No page could be opened: WebFetch to arxiv.org failed (host not resolvable from this session), and en.wikipedia.org, MIT OCW, WHOI and AOML pages came back only as search hits with a short summary. So almost every number below is VERIFIED only as "seen in a search extract of a named source" or PLAUSIBLE (textbook, from memory). The Lagrangian prototype numbers in section 8 are COMPUTED by me on a throwaway script (not committed) and are TUNING-grade evidence about the recipe, not about the real ocean. Tags: VERIFIED = seen in a search extract of a named source; PLAUSIBLE = standard, memory or one secondary source; UNVERIFIED = a guess; TUNING = a game starting value; COMPUTED = my arithmetic.

## 0 One-page summary
1. Ocean surface circulation is wind stress plus rotation: trade winds blow east to west near the equator, westerlies blow west to east at mid latitude, so each subtropical basin gets a big slow gyre (clockwise in the north, anticlockwise in the south), a narrow fast jet on its western edge, and a broad slow return flow in the interior.
2. Typical speeds: interior 0.02 to 0.1 m/s, ordinary open ocean 0.1 to 0.3 m/s, western jet up to about 2.5 m/s. A float riding the current crosses a 5000 km basin in roughly 10 months to 3 years, not days (COMPUTED from 0.2 m/s, see 1.3).
3. A floating object does not follow the water exactly. Add leeway (about 1 to 6 percent of the wind speed by object, about 3 percent is the generic rule), wave Stokes drift (about 1 percent of wind), and a random walk for eddies. Beaching is a sink and the least well known part of any model.
4. Biology rides the same field: seeds and driftwood raft for months to years; surface drifters (man o' war style floaters, jellyfish) are moved mostly by wind; turtles and fish stray north on warm water and are found stranded when it turns cold.
5. A usable procedural planet is small: 5 degree cells (72 by 36), land from noise on a sphere, a wind curl that is a fixed function of latitude, and one solve of the Stommel equation (numpy dense solve, 1.5 s). That gives gyres, western intensification and coastal flow on any coastline, deterministically, with no hand placement.
6. Drift is a particle simulation: advect with current plus 3 percent wind, add a random walk, beach on touching land. Run it once per seed, headless, to make an arrival table (what, from which source region, how long it took). The live game replays that table, it does not run particles per frame.
7. The 200 m table window reads only a few numbers from the globe: mean drift vector (speed, bearing, and its slow seasonal change), a temperature band, and keyed arrivals with source region and travel time. Everything stays idempotent through the ledger keys already in use.
8. Biggest risk is plausibility: the world will not match real geography and must not pretend to. Keep names out, keep it coarse, and measure whether the arrivals change a player's choices before drawing a globe.

## 1 How it works (the physics)

### 1.1 Why there are gyres
- Wind stress on the surface sets water moving. Net transport in the surface layer is 90 degrees to the right of the wind in the north and to the left in the south (Ekman transport). The classical surface current is 45 degrees from the wind. VERIFIED qualitatively (Open University, UW ocean285 chapter, Britannica, search extracts 23 Nov). Observed surface deflection is not constant: field studies report anything from about 5 to 80 degrees, so a game should use a seeded 15 to 45 degrees (VERIFIED range, one arXiv note 2607.29261 and others; TUNING choice).
- Trades push water west near the equator, westerlies push it east at mid latitude. Ekman transport on both sides of about 30 degrees points toward 30 degrees, so water piles up there (a subtropical convergence, a bump of the sea surface of about 1 m), and the slope drives a geostrophic clockwise flow in the north (PLAUSIBLE, textbook). Floating things accumulate in the middle of the gyre, which is why the garbage patches sit there (PLAUSIBLE; Ekman and geostrophy accumulating floating microplastic is the title of a Bern thesis seen in search, VERIFIED title).
- Sverdrup balance: in the interior, the north to south transport is set by the wind stress curl divided by beta (the change of the Coriolis parameter with latitude). The flow must then return somewhere, and only a western boundary current can close the vorticity budget; an eastern one cannot (VERIFIED, Wikipedia Sverdrup balance extract: "only the western boundary current can close the vorticity balance"). This is western intensification, due to the meridional variation of the Coriolis parameter (VERIFIED, Gill 1982 as quoted in the search extract). Without beta the Gulf Stream style jet would be broad and slow (VERIFIED extract).
- The same recipe in a model: Stommel (1948) with bottom friction r gives `r * laplacian(psi) + beta * dpsi/dx = curl(tau)/rho H`, boundary layer width `r / beta` on the western side (PLAUSIBLE, from memory; Munk 1950 uses lateral viscosity and gives width `(A/beta)^(1/3)`, search extract confirms the Munk scaling exists, VERIFIED).
- Gyre pattern on a rotating planet with continents: for each ocean basin, two subtropical gyres (one per hemisphere), a smaller subpolar gyre (cyclonic) poleward of the westerlies' maximum, a westward equatorial current in the trades and a weak eastward countercurrent near the equator (PLAUSIBLE, textbook).
- Eastern edges: slow, wide, equatorward flow, often with cool upwelling water; western edges: fast, narrow, poleward, warm (PLAUSIBLE, textbook).
- Time for the gyre to spin up after a change in wind: about 1 to 5 years (VERIFIED range, search extracts: three to five years for the interior to balance the boundary current; a barotropic spin-up within a year). So in a game the circulation is effectively fixed over the lifetime of a save, apart from a seasonal wobble (section 3).

### 1.2 Real numbers
| Quantity | Value | Tag | Source |
|---|---|---|---|
| Western jet max surface speed | about 2.5 m/s (5.6 mph) | VERIFIED (extract) | Gulf Stream, Wikipedia and Richardson (WHOI), seen as search hits |
| Western jet width | about 100 to 160 km | VERIFIED (extract: 160 km at two sections, MIT 12.808 notes) | https://ocw.mit.edu/courses/12-808-introduction-to-observational-physical-oceanography-fall-2004/ |
| Jet transport | about 30 Sv in the narrow strait, rising to about 150 Sv further downstream (1 Sv = 1e6 m^3/s) | VERIFIED (extract) | Wikipedia Gulf Stream extract; Richardson 1985 |
| Annual variation of that transport | 6 percent standard deviation, 23 percent peak to peak over 11 years | VERIFIED (extract) | Meinen and Luther 2016, Deep-Sea Res I 112 |
| Ordinary open ocean surface speed | 0.1 to 0.3 m/s (drift bottles and buoys, regional 0.157 and 0.165 m/s) | PLAUSIBLE; the bottle number is VERIFIED (extract) | search hit on bottle and buoy drift, North Atlantic |
| Interior gyre speed | 0.02 to 0.1 m/s | PLAUSIBLE, UNVERIFIED number | memory |
| Spin-up of interior balance | 1 to 5 years | VERIFIED range (extracts, model dependent) | search extracts on Sverdrup balance |
| Global drifter data | 6 hourly positions, standard dataset | VERIFIED | AOML Global Drifter Program |
| Tide and eddy diffusivity (for random walk) | 1e-2 m^2/s in the upper ocean quoted; Parcels plastic study used 10 m^2/s horizontal | VERIFIED (extract) | Frontiers Mar Sci 2021 (10.3389/fmars.2021.697430), Onink et al. 2021 ERL 16 064053 |

### 1.3 Basin transit times (COMPUTED, my arithmetic; the extract set had no measured crossing time)
`t = L / v`. At 0.2 m/s (17.3 km/day): 5000 km takes 290 days. At 0.1 m/s: 580 days. At the jet 1.0 m/s: 5000 km in 58 days, but the jet is only a few percent of the area. A whole gyre loop of about 20,000 km (perimeter) at an average 0.1 m/s takes about 6 years. Real paths meander, stall in eddies and recirculate, so real times are longer than the straight-line arithmetic (PLAUSIBLE). One drift-bottle report in a search extract gave about 14 months for bottles from the north-eastern West Indies to European beaches (VERIFIED as a secondhand extract; treat as order of magnitude, 1 to 3 years).
Game rule of thumb (TUNING): local flotsam hours to days; near neighbour island 2 weeks to 3 months; across one basin 6 months to 3 years; a full gyre loop 3 to 10 years; a few percent of items arrive earlier than the typical time because they ride a jet.

## 2 How floating things really drift

### 2.1 Current plus leeway plus Stokes
- Drift velocity of an object: `u_obj = u_water(at the object's depth) + leeway(U10, object)`, where leeway is the object's speed relative to the water caused by wind drag on the part above water and water drag on the part below (VERIFIED concept: Allen and Plourde 1999, USCG; "leeway rate = leeway speed divided by 10 m wind speed", search extract of the UNT web archive copy of USCG R&D 2005-0063A and DTIC ADA366414).
- Allen and Plourde compiled linear fits of leeway speed against wind speed for 63 object classes (VERIFIED, extract). Leeway has a downwind part and a crosswind part, and the object tends to sit at a divergence angle of up to about 30 degrees from downwind, to the left or right, with a flip frequency of about 4 percent per hour (VERIFIED, extracts: "change frequency of 4% per hour, independent of wind speed or leeway category"; Breivik and Allen 2008 condense each class into nine coefficients, VERIFIED). A leeway table is therefore mean downwind slope, mean crosswind slope, plus noise.
- Generic leeway rate: about 3 percent of the 10 m wind (range 2 to 4) for most floating objects (VERIFIED, FLOW_TYPES 3.4 with arXiv 2201.12688). Stokes drift of the wave field at the surface is about 1 percent of wind speed in a developed sea (VERIFIED, extracts: Rascle 2006, Ardhuin 2009, 2018 as quoted), with higher older estimates of about 2 percent (Wu 1983, VERIFIED as quoted) and about 1.6 percent for one Baltic study (Li 2017, VERIFIED as quoted). One spectral model paper gives an example of windage 1 percent plus Stokes 1 percent giving total drift of about 4 percent of U10 (VERIFIED, extract). Hughes 1956 plastic envelopes: 3.1 percent (VERIFIED, extract).
- Direct container study: a 2024 paper found that adding 1.5 percent of wind improved simulations of shipping containers (VERIFIED extract, Springer Ocean Dynamics s10236-024-01600-3).
- Typical leeway rates by object (PLAUSIBLE, from memory of the USCG tables; the search could not reproduce the table, the values below are TUNING starting values):
| Object | Leeway percent of U10 | Notes | Tag |
|---|---|---|---|
| Submerged or flat plastic, tiny seeds, water-logged wood | 0.5 to 1.5 | almost all current plus Stokes | PLAUSIBLE; TUNING |
| Sea beans and other dense drift seeds | 1 to 2 | nearly awash | TUNING |
| Empty or half-full bottle | 2 to 3, upright bottles higher | sail-like when upright | PLAUSIBLE |
| Driftwood log, awash | 1 to 3 | roots or branches act as sails | PLAUSIBLE |
| Loaded cargo container, low freeboard | 1.5 to 3 | a 2024 study found about 1.5 extra percent improves fits | PLAUSIBLE; VERIFIED extract |
| Dried floating weed raft, buoys, fishing floats | 2 to 4 | | TUNING |
| Small boat or life raft, high windage | 3 to 7, crosswind component up to a third | | PLAUSIBLE |
| Floating colonial animals with a sail (a man o' war style float) | 5 to 10, steered left or right by the sail | the wind decides where they strand | PLAUSIBLE; behaviour VERIFIED (extract: drifts "following winds and currents") |
| Drifting derelict vessel | 3 to 6 | | UNVERIFIED |
| Swimmer or large animal | not a drifter | steers | |
- Two caveats worth keeping: (1) windage is not an accurate proxy for Stokes drift on global scales (VERIFIED, extract), and omitting Stokes drift overestimates residence time (VERIFIED, Frontiers 2021); (2) surface-stokes drift added to the model current can also drive extra Eulerian flow, which is outside a game (VERIFIED as a statement, extract).
- Crucial effect for the table: the wind term alone moves an object 0.03 times 8 m/s = 0.24 m/s, as much as an ordinary current. So local wind at the table decides which shore the object reaches in the final tens of km, while the global current decides where it started from.

### 2.2 Beaching and resuspension
- Beaching is the least certain part of every model. A review of options notes many studies make beaching permanent at first contact, or ignore it, with no consensus (VERIFIED, EGU24-10148 abstract extract). A simple parameterisation put about 92.7 percent of particles on a coast within 10 years (VERIFIED, extract, Springer chapter 10.1007/978-3-030-45909-3_48). A distance-to-shore rule gave over 91.5 percent beaching in one regional case (VERIFIED, extract, LOCATE preprint gmd-2023-160). Treat "most things that drift eventually beach" as the supported claim and the exact fraction as unknown.
- Onink et al. 2021 tested beaching and resuspension probabilities and found the amount and distribution of beached plastic depend strongly on the choice (VERIFIED, extract).
- Local rule from `BEACH_COLLECTOR.md` and `shore_catch.py`: items float off again, about 35 percent per tide (TUNING; the note says 30 to 60 percent by the next spring tide). Storm tides lay items high where only the next storm lifts them. Heavy items (logs, containers) stay, light ones (plastic film, weed) go back out.
- Game rule (TUNING): a global-scale particle that touches land beaches with probability `p_beach` (0.3 steep rock, 0.9 gentle sand or shingle) and otherwise slides along the coast with the current; items beached on the table's shores follow the existing tide rules.

### 2.3 Real long-distance drift (generic examples)
- Drift seeds from tropical forests ("sea beans") float for months to years and can land far from where they fell, including cold coasts of the north-east Atlantic; arrival is tied to storms and high tides (VERIFIED, extracts from a Lit Hub piece, NC Sea Grant, Wikipedia "Drift seed", seabean.com; no measured crossing times in what I could see; UNVERIFIED how long a typical seed survives).
- Satellite-tracked drifters released in one ocean routinely end up on far beaches within a year or two (PLAUSIBLE; a NOAA fisheries story on a returned drifter appeared in search, VERIFIED title only).
- Debris from storms and ships can arrive in clusters a year or more after the event, well spread in time (PLAUSIBLE, generic).
- Rafting: organisms on floating wood and weed are moved for weeks to months (PLAUSIBLE; I could not retrieve a source on rafting in this search).

## 3 What the field looks like and how it changes with time
- Season: the trade wind belts and westerlies shift a few degrees poleward in their hemisphere's summer, and gyre-edge currents strengthen and weaken by a few tens of percent (PLAUSIBLE; the annual swing of one big jet's transport is only 6 percent standard deviation, VERIFIED extract). Game rule (TUNING): scale the whole field by `1 + 0.15 sin(season)` and rotate the wind belts by 3 degrees of latitude.
- Eddies: a western jet sheds rings that wander for weeks to months and drift westward slowly (PLAUSIBLE). The window sees one eddy and one temperature front crossing every several days at 0.1 to 0.3 m/s already (SEA_STATE section 6.4, PLAUSIBLE), so keep that local layer and do not model eddies globally.
- Storms: wind pulses (days) move floating objects far more than the current does that day. A single gale of 20 m/s for 24 hours at 3 percent leeway moves an object 0.6 m/s times 86,400 s = 52 km (COMPUTED); that is how a storm brings keyed arrivals in bunches.
- Years: slow variation of the gyre strength and El Nino-like events moving warm water and the warm-water species with it (PLAUSIBLE; search extracts mention El Nino displacing turtles northward). Game: one seeded slow cycle of 3 to 7 years that shifts the whole drift vector by 20 percent and the temperature band by 1 to 2 degrees C (TUNING).

## 4 Climate zones, temperature bands, species and objects

### 4.1 Bands (PLAUSIBLE generic, TUNING boundaries)
| Zone | Latitude | Sea temperature (annual mean) | Wind | Flows |
|---|---|---|---|---|
| Tropical | 0 to 23 | 25 to 30 C | trades, calms near the equator | westward equatorial current, warm |
| Subtropical | 23 to 35 | 18 to 25 C | weak winds in the gyre centre | gyre centre, accumulation of floaters |
| Temperate | 35 to 55 | 8 to 18 C | westerlies | eastward drift, storm tracks |
| Subpolar | 55 to 65 | 2 to 8 C | westerlies and polar easterlies | cyclonic gyre |
| Polar | over 65 | under 2 C, ice | easterlies | ice, cold coastal flow |
Warm western jets carry subtropical water to 40 or more degrees, so a temperate island in the path can sit 4 to 8 C warmer than its latitude; cold eastern boundary flow does the reverse (PLAUSIBLE, textbook). A jet's cold-core and warm-core eddies make water a few degrees warmer or colder in a front a few hundred metres wide (SEA_STATE 6.4, PLAUSIBLE).
- Cyclone genesis (needed for storm genesis regions): sea surface at least 26.5 C, usually to at least 50 m depth, at least about 5 degrees from the equator because the Coriolis force is zero there, plus low wind shear and humid mid levels; high SST is necessary but not sufficient (VERIFIED, Penn State METEO 3, NOAA AOML FAQ A15, Environment Canada; extracts 23 Nov). Seasons: the north Atlantic peaks in early to mid September; the northwest Pacific between mid July and mid October (VERIFIED, extract). Southern basins six months later (PLAUSIBLE).

### 4.2 What belongs where (generic examples)
| Kind | Belongs to | Reaches cool coasts by | Tag |
|---|---|---|---|
| Tropical seeds and sea beans | rainforest river mouths in the tropical band | equatorial current, then the warm jet, months to years | VERIFIED (extract) |
| Driftwood and logs | big river mouths in wet temperate and tropical bands; frozen into ice in polar bands | any current; storms and river floods release them | PLAUSIBLE |
| Plastic and urban litter | densely settled coasts, any band | ends up in subtropical gyre centres | VERIFIED qualitatively |
| Pumice, volcanic rafts | island arcs at plate edges | wind and current over months | PLAUSIBLE, generic |
| Warm-water turtles (a loggerhead, a leatherback) | tropical and subtropical; feed in cool waters in summer | warm current plus wind; found stranded and cold-stunned in winter | VERIFIED (extracts: 15 loggerheads of 16 turtles in UK and Irish strandings 2023; leatherbacks feed on jellyfish in summer and autumn; winds drive warm water and turtles north; cold shock leaves them stranded) |
| Floating colonial animals (man o' war style) | tropical and subtropical | wind decides, strand in great numbers after warm onshore wind | VERIFIED (extract) |
| Tropical reef fish juveniles | tropical coasts | warm jet, late summer, arrival then die back in winter | PLAUSIBLE (my search did not support this; UNVERIFIED as a specific claim) |
| Jellyfish blooms and their predators | temperate, spring to autumn | warm onshore wind | VERIFIED qualitatively (WILDLIFE section 9) |
| Ships and boats, wrecks | any shore | current plus 3 to 6 percent wind | PLAUSIBLE |
Rule (TUNING): each arrival kind has a temperature window and a latitude band of origin; if the table's temperature band is outside the kind's range, the visitor arrives stressed (a stranded turtle, a pale fish), so the more different the source band from the table band, the rarer and the more fragile the arrival.

## 5 How it interacts with the other layers
| Layer | What the globe gives it | What it gives the globe |
|---|---|---|
| Macro sea (`macro_sea.js`) | mean drift vector replaces its fixed 0.05 to 0.3 m/s seeded background; storms may begin in a genesis region | wind field direction by latitude |
| Weather | storm genesis regions and season; temperature band sets rain vs snow tendency | none |
| Shore catch (`shore_catch.py`) | replaces the fixed `DRIFT_FROM_DEG = 270` and the world-wide `SUPPLY_SIGMA` with the table's own mean drift bearing and a seeded arrival count; island richness depends on facing relative to the drift | none |
| Wildlife | strays and migrants by temperature band | none |
| Boats and ships | route costs by current; a relic boat can drift ashore | none |
| Collector and economy | supply rate per kind and source | none |
| Flow engine (local, `FLOW_TYPES.md`) | boundary mean current for the window | none |

## 6 Cheap models (how scientists do it and how we shrink it)
- Scientific method: Lagrangian particle tracking. Interpolate a velocity field (from a model or drifter data), integrate positions with a Runge-Kutta scheme, add a random walk for sub-grid eddies. Parcels (OceanParcels) is the standard Python tool; Onink et al. 2021 used a 10-minute step, fourth order Runge-Kutta, horizontal diffusivity 10 m^2/s (VERIFIED, extract). Particle tracking with realistic windage and Stokes drift is routine (VERIFIED, extracts).
- Cheapest game version (TUNING): explicit Euler with a one day step is fine for a 5 degree grid and speeds under 2 m/s (a day at 1.2 m/s is 104 km, a cell is 555 km tall; bilinear interpolation recommended to avoid blockiness). Random walk step `sqrt(2 K dt)` with K about 1000 m^2/s per day step (the 10 m^2/s of a 10 minute step would give far too little scatter for a coarse 5 degree field; tuned in the prototype, see 8). Wind: a prescribed zonal wind by latitude (trades easterly, westerlies westerly) with a lognormal multiplier per day; or reuse `macro_sea` wind at the particle's latitude if you want weather to move the drift.
- Do not run particles live. Precompute per seed an arrival table, or compute lazily and cache by key (section 7). A 5 degree globe with a few thousand particles over 1500 days took 2 to 3 seconds in numpy (COMPUTED, prototype).
- Alternative that is even cheaper: back-trace. For each island, release particles backward in time from its position (reverse the field) and record where they came from; this directly gives the source distribution and travel times with 1 particle per day instead of every source (PLAUSIBLE, standard practice; reverse integration of a deterministic flow works, with the random walk still added).

## 7 The minimal procedural planet recipe

### 7.1 Land
- Grid: 72 by 36 cells of 5 degrees (2592 cells). A few degrees is enough (section 8 measured it). Cells are equiangular; use `cos(lat)` weights when counting area, never cell counts (mistake: equal-area assumption).
- Land field: a sum of random plane waves on the sphere, `f = sum a_k sin(freq_k dot(p, d_k) + phase_k)` over three octaves with 6, 12 and 24 directions, `p` the unit position vector. Threshold at the quantile giving 25 to 35 percent land. Add polar land (ice) above 78 degrees. Avoids the longitude seam and the pole singularity because it uses 3D positions. (PLAUSIBLE; this is my prototype; real Earth is about 29 percent land, VERIFIED common fact.)
- Clean up: drop one-cell lakes and one-cell islands unless they are the table's island (the table places its own islands); keep at least two ocean basins of 60 degrees of longitude, else reseed with the next index.

### 7.2 Wind and flow
- Wind stress (nondimensional zonal part only): `tau_x = -cos(3 lat)` with trades (easterly) from 0 to 30, westerlies from 30 to 60, polar easterlies beyond. Curl in the north subtropics is negative (clockwise gyre). Seasonal shift 3 degrees (section 3). All VERIFIED as qualitative pattern (extracts: trades blow east to west near the equator, westerlies mid latitude); the cosine is TUNING.
- Solve Stommel on the sphere (PLAUSIBLE, my arithmetic): `r * lap(psi) + beta * psi_x = curl(tau)` with `psi = 0` on land and the pole caps, `beta = cos(lat)` in nondimensional units, `r` such that the western boundary layer is 1 to 2 cells wide (9 degrees of friction scale in the prototype). Velocity `u = -psi_y`, `v = psi_x`. Then scale so the 99.5th percentile speed is about 1.2 m/s. The prototype is a dense numpy solve of 2592 unknowns, 1.5 s, deterministic from the seed. Result printed as arrows by latitude showed westward flow in the tropics and eastward flow at mid latitudes in the one seed I checked, with gyres closed by coasts (COMPUTED). Median speed came out 0.36 m/s, 90th percentile 0.67 m/s, max 1.7 m/s; that is faster than the real ocean's typical 0.1 to 0.3 m/s because the jets are 5 degrees wide (about 500 km). So scale the field: either use vmax 0.6 m/s or tune so the median over open ocean is 0.15 m/s. TUNING.
- Plausible rather than real: a solved Stommel gyre needs no hand drawing and respects the coast, but a rectangular Stommel gyre has a slow broad interior flow and a bunched jet, and our 5 degree cells cannot hold a real 100 km jet, so the jet is a visual exaggeration. Islands in a Stommel solution should be treated as land with `psi = 0` (real ones carry their own constant). Say so in the code comments, never claim geography.
- Fallback if the solve is too much for the target machine: analytic gyre per basin. Find the largest connected ocean regions (flood fill), take each basin's bounding box in longitude and latitude, and place in each subtropical band `psi = A sin(pi y_norm) (1 - x_norm - exp(-x_norm / delta))` with `delta` 0.06 to 0.12. This costs a few microseconds per cell and works for simple coasts, but breaks on irregular coasts, so it is a fallback (PLAUSIBLE).

### 7.3 Storms and temperature
- SST by latitude: `T = 29 cos(lat)^1.4 - 1` C, clipped at -1.8 (TUNING; freezing point of seawater is about -1.8 C, PLAUSIBLE) plus 3 C times the along-jet warm anomaly on western sides (poleward flow in the west adds warm water) and minus 2 C times equatorward eastern flow (TUNING).
- Storm genesis cells: ocean cells with `T >= 26.5` and `|lat|` between 5 and 25 degrees, preferring the western halves of basins, active in each hemisphere's late summer (VERIFIED thresholds, extracts; the preference and window are PLAUSIBLE and TUNING). Each such event feeds the weather schedule as a spawn point and track (westward then poleward then eastward when it leaves the tropics, PLAUSIBLE). Extratropical lows keep using the existing macro_sea slots.
- Season: day of year plus hemisphere sign. Ice: cells with `T < -1` in winter become sea ice, no particles move there, the table sees "ice arrivals" rarely.

### 7.4 Sources
- Coastal ocean cells within 66 degrees of the equator are potential source cells. Each source kind has a band and a weight (`rainforest seeds` from tropical land with high rainfall proxy `cos(lat)`, logs from big rivers, litter from coastal land cells near large land mass, ships from port cells, wrecks from storm cells). A coarse source region is a block of 30 degrees longitude by 25 degrees latitude and is the only thing the table needs to know (the game names it "the warm southern shore" etc., never a real name).

## 8 Boundary conditions for the 200 m window, and the test
### 8.1 What the table reads
- `drift_mean`: vector from the cell and neighbours at the table, bilinear, plus 3 percent of the macro wind (already in `macro_sea.drift`).
- `temp_band`: one of tropical, subtropical, temperate, subpolar, polar plus the mean sea temperature and the seasonal swing.
- `arrival keys`: `seed:globe:kind:index` with fields `kind`, `class`, `source_region`, `source_band`, `travel_days`, `arrival_day`, `fragility` (distance between source band and table band), as the macro sea already does for hourly events. The key makes it idempotent (the ledger `claim` pattern in `eco_common`).
- `strays`: a seeded list of visiting animals by band with a start day, the warm or cold current they ride, and the temperature mismatch.
- `wind belts`: mean wind direction for the latitude, so `shore_catch.DRIFT_FROM_DEG` can be replaced by the table's mean drift bearing instead of fixed 270.

### 8.2 What the headless test must measure
1. Determinism: the same seed gives the same land, field and arrival table to the bit; hash it (numpy `default_rng` is stable for these calls, as `ECOSYSTEM_TEST.md` section 5 notes).
2. Field sanity: no cell with speed over 2.5 m/s; zero net flux through land (psi equals zero on land); western boundary stronger than eastern for every basin (ratio over 2); gyre sense correct by hemisphere (clockwise north). Tag: these are the checks that tell you the solver is right.
3. Arrival rates per island: counts per year per kind. Report min, median, max and the number of islands with zero arrivals. Prototype (COMPUTED, throwaway; 30 table cells, about 2000 to 3000 particles each from every coastal cell, 1500 days, 3 percent wind, K 1000 m^2/s per day, permanent beaching on first land contact): median 14 to 20 arrivals per table in 1500 days, between 0 and about 170, 5 to 8 of 30 tables received none.
4. Source diversity: distinct source regions per table: median 3 to 4, max 8 to 10 of 37 to 41 in the prototype. A rule: an island with only one source region has no variety to explore; the design should keep median at least 3.
5. Travel time distribution: prototype median 57 to 83 days, 10th percentile 5 to 7 days, 90th percentile 230 to 445 days. Real long-distance drift takes longer because the real field has much less straight-line travel; so plan for a longer tail (a tail beyond one year is a feature, 10 to 30 percent of arrivals).
6. Richness inequality: coefficient of variation of arrivals across tables, 1.07 to 1.26 in the prototype, much higher than the ECOSYSTEM test's `SUPPLY_SIGMA` 0.45 and `ISLAND_SIGMA` 0.20 would give. This says current geometry alone can make some seeds three or more times richer than others; the test asks whether that is wanted and whether poor islands still have a path (the owner rule: both paths viable, nothing is a trap).
7. Source-to-sink matrix: for each source region, which tables it feeds. Check that the matrix has structure (neighbours in the downstream direction) and not noise.
8. Sensitivity: change `leeway` 0 to 6 percent and K by 10 times and report how counts and sources change (the beaching probability controls this most, section 2.2). Report them as ranges.
9. Output: a `results.json` and a `REPORT.md`, like `ecosystem/run_all.py`.
### 8.3 How it runs
Python 3 plus numpy only (no scipy), no network, no GPU. The owner's Radeon machine is not needed: the solve is 1.5 s per seed on one core, the particle run 2 to 3 s per seed (COMPUTED, container core). 60 seeds is about 5 minutes. If more particles or back-tracing is wanted it is still minutes. Keep the same `--seeds N --days D --out FOLDER` shape as `ecosystem/run_all.py` and give the output a hash so reruns can be compared.

## 9 Drawing a spinning globe in three.js r128 (cheap)
- Geometry: `SphereGeometry(1, 64, 48)` (about 6 k triangles), one draw call. Rotate with a drag-orbit and a slow auto-spin.
- Land: bake the 72 by 36 land mask plus a coarse height or biome tint into a 512 by 256 canvas texture (equirectangular, linear filter, one draw), ocean in a flat colour from the temperature band, ice caps in white. 512 by 256 RGBA is 0.5 MB (COMPUTED); a 1024 by 512 texture is 2 MB, still fine, under the `MODES` 2048 handheld cap.
- Currents: draw as `THREE.Line` segments (one draw call using `LineSegments` and a `BufferGeometry` with a few hundred to 2000 segments): seed N streamlines from the flow field, integrate each for M steps, offset 0.002 above the surface; lit by vertex colours (warm red for warm flow, blue for cool), alpha by speed. Animate with a `dashOffset`-style trick: a shader uniform that scrolls a pattern along each line's parameter, or a small set of moving points. ShaderMaterial in r128 works with `LineSegments`; WebGL has line width 1 only, so use thin lines or quads.
- Drift trails: for one find, draw a `Line` with the stored path (30 to 100 points, from the precomputed arrival table) in a gradient of age, plus a small marker sprite at the source and a bigger one at the table. Because the path is stored with the arrival key, no particles run at view time.
- Table marker: a small cone or ring at the table's lat and lon, normal along the sphere, pulsing; bright ring on hover or when a new find arrives.
- Optional day and night: a shader that multiplies by `dot(normal, sunDir)` (2 uniforms). Skip the atmosphere, or a cheap fresnel rim in one extra transparent sphere.
- Tier budget (TUNING; nothing measured on a device; our measurements so far are software GL, which says nothing about frame rate):
| Tier | Sphere | Texture | Currents | Trails | Draw calls | Notes |
|---|---|---|---|---|---|---|
| Desktop | 64 by 48 | 1024 by 512 | 2000 segments, animated | 8 | about 6 | day and night on |
| Handheld (iPad) | 48 by 32 | 512 by 256 | 600 segments, slow scroll | 3 | about 5 | pixel ratio 1.5, no post |
| Low or AR | 32 by 24 | 256 by 128 | 200 static segments | 1 | about 4 | globe as a small card beside the table, off by default |
Total memory under 5 MB in all tiers, so the globe never competes with the island for budget (`MODES_AR_DESKTOP_HANDHELD.md`: page set under 300 to 500 MB, textures at 2048 or less, draw calls under 100).
- Page reads from a JSON file made by the headless run (arrays of floats and integers), no solver in the browser.

## 10 Common mistakes
1. Treating cells of one longitude width as equal area: weight by `cos(lat)` for any count or average, and correct `dx` for particles by `1/cos(lat)` (the prototype does).
2. Polar singularities: solve and advect only to about 78 degrees, treat the rest as land or ice; do not integrate longitude steps near the pole.
3. Using latitude and longitude noise for the land: it tears at the seam and squeezes at the poles; use 3D noise on the unit sphere.
4. Pretending to be real: no real names, no copying real outlines, and the game should say "a warm southern shore" not a country; do not claim the gyre is accurate.
5. A global average speed in place of a jet structure: all arrivals then take the same time and every island looks the same; keep western intensification.
6. Setting leeway too high: at 10 percent wind drift swamps the current and every item lands on the downwind shore; keep 1 to 4 percent for most things.
7. No beaching loss: particles circle forever (or all pile at one coast); decide `p_beach` and test it.
8. Particles that start everywhere: the sources must be coasts, rivers, ports and wrecks (not open ocean cells), else arrivals do not carry a place.
9. Running particles live per frame: precompute and key.
10. Overfitting to one seed: check the richness spread across 60 seeds.
11. Using the prototype's median 60 to 80 day travel time as truth: it comes from a coarse field and counts all coastal sources; reality is slower.
12. Forgetting the stray's temperature check: a tropical animal in a cold band should look cold-stunned or not appear at all (VERIFIED behaviour for turtles).

## 11 Visual and behavioural checklist
- Gyre sense: clockwise in the north, anticlockwise in the south; trades go west, westerlies go east.
- West side stronger and narrower than east side in every basin.
- Floaters collect at gyre centres and on convergence lines, not spread evenly.
- Warm water on the west side of a basin poleward of the equator; cool water on the east side.
- Arrivals come from up-current of the table, never from the downstream side.
- Light items arrive earlier and in storms; heavy ones arrive later and stay.
- Strays have a season and a temperature reason; none are common.
- Travel time stamped on a find equals real elapsed game days (from the ledger key).
- The globe view shows the same land, same currents and same marker as the headless run (same hash).
- The table's mean drift vector matches the globe field at its cell within 0.02 m/s.

## 12 What is faked
- The planet: noise continents, a solved Stommel gyre on 5 degree cells with one zonal wind belt pattern; no thermohaline circulation, no equatorial undercurrent, no upwelling, no tides at global scale, no sea ice dynamics.
- The speeds: jets are 500 km wide and slower than real; basin times are within a factor of two at best.
- Beaching: a constant probability.
- Stokes drift and windage folded into one leeway rate; no wave field per particle.
- Storm genesis is a table of cells and a season, not an atmosphere.
- Strays are rule-driven and keyed, not simulated.
- Source regions are blocks, not coastlines.
- Time: the game compresses years into weeks of play; a travel time of 400 game days would be about 53 real hours at 8 minutes per game day (MACRO_SEA clock, COMPUTED), so the owner's session cannot show a year-long journey unless the arrival is fast-forwarded: say so, and show the journey in the globe view.

## 13 Could not verify (explicit list)
- Typical leeway rates by object class (the USCG tables could not be opened or reproduced in extracts); all numbers in 2.1 table except the generic 3 percent are PLAUSIBLE or TUNING.
- Measured sea bean crossing times and survival times.
- Rafting on weed and wood: speeds and durations.
- Any measured basin transit time or gyre loop time (the extracts had none); 1.3 is arithmetic.
- Reef fish strays on warm currents (searched, no support in extracts).
- Real beaching and resuspension fractions (VERIFIED only as a range of model choices).
- The Stommel equation form and the Munk boundary layer width, which are from memory (not opened).
- Wikipedia, MIT OCW, WHOI, AOML and arxiv pages were not opened (host blocked or not reachable).

## 14 Staged build plan with tests
| Stage | Build | Test checks |
|---|---|---|
| 0 | This note, plus a decision on `p_beach`, `leeway`, and the unit of time | owner reads sections 0 and 12 |
| 1 | `globe/land.py`: seeded land on 72 by 36 with 3D noise | determinism hash; land fraction 25 to 35 percent; at least two basins; no one-cell lakes |
| 2 | `globe/flow.py`: wind curl, Stommel solve, velocity scale, SST, genesis cells | psi zero on land; speeds under 2.5 m/s; west stronger than east in every basin; clockwise north; solve under 5 s on one core |
| 3 | `globe/drift.py`: particles, leeway, random walk, beaching, source kinds | counts, source diversity, travel time distribution as in section 8; sensitivity table; 60 seeds under 10 minutes |
| 4 | `globe/arrivals.py` and an `arrivals.json` per seed: keyed events, table cell, band, strays | idempotent keys; arrival table matches the particle run; zero crashes on a seed with no coast |
| 5 | wire: `macro_sea` drift base and `shore_catch` use the table's mean drift bearing and arrival counts | catch classes 60 seeds; `ECOSYSTEM_TEST` still passes; the richness spread is within the owner's choice |
| 6 | `globe_view.html`: three.js r128 sphere, land texture, currents, trails, marker | page runs at the handheld tier (pixel ratio 1.5, under 6 draw calls); screenshot matches the hash; tap a find to see its path |
| 7 | Measure whether it changes a player's choices (EVOLUTION_TREE risk): compare policies with and without the globe in the headless economy | choices differ in more than 20 percent of seeds, else cut scope |

## 15 Sources (all via search extracts unless noted)
- Sverdrup balance, western intensification: https://en.wikipedia.org/wiki/Sverdrup_balance ; https://en.wikipedia.org/wiki/Ocean_gyre ; MIT OCW RES.12-001 essay 3 ; WHOI Price notes (aCt P4) ; arXiv 1809.01376 (idealised wind-driven circulations)
- Ekman: https://uw.pressbooks.pub/ocean285/chapter/the-ekman-layer/ ; https://www.open.edu/openlearn/science-maths-technology/the-oceans/content-section-4.3 ; https://www.britannica.com/science/ocean-current/Geostrophic-currents
- Gulf Stream numbers: https://ocw.mit.edu/courses/12-808-introduction-to-observational-physical-oceanography-fall-2004/ ; https://www.aoml.noaa.gov/phod/docs/2016_Meinen_Luther_DSRI.pdf ; Richardson 1985
- Leeway: USCG R&D 2005-0063A (UNT web archive) ; DTIC ADA366414 ; arXiv 1111.0750 and 1111.1102 (leeway field method) ; arXiv 2005.09527 ; Springer Ocean Dynamics s10236-024-01600-3 ; MET Norway report 17/2010
- Stokes and windage: Dobler et al. 2019 (hal-02323408) ; Frontiers Mar Sci 2020 7:00305 ; Bern thesis on Ekman, geostrophy and Stokes drift
- Particle tracking and beaching: Onink et al. 2021 ERL 16 064053 ; Frontiers Mar Sci 2021 697430 ; GMD preprint 2023-160 ; EGU24-10148 ; 10.1007/978-3-030-45909-3_48
- Drift seeds: https://en.wikipedia.org/wiki/Drift_seed ; https://seabean.com/what.asp ; https://lithub.com/the-journey-of-a-sea-bean-in-praise-of-the-oceans-smallest-gifts ; NC Sea Grant
- Cyclone genesis: https://en.wikipedia.org/wiki/Tropical_cyclogenesis ; https://www.aoml.noaa.gov/hrd/tcfaq/A15.html ; https://courses.ems.psu.edu/meteo3/book/export/html/2056
- Strays: Natural History Museum 2023 turtle strandings, MCS UK, Irish Times, NOAA cold-stun page, FWS turtle story
- Drifter data: AOML Lumpkin and Garzoli 2005 ; Brambilla and Talley 2006
