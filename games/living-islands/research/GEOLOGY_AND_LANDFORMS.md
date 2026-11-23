# Geology and landforms: rock provinces and a cheap land-formation pipeline (research note)
Do not put real place names into game code, assets or recipes.
Status: research note for Living Islands (branch citylab/cloud-islands), 23 Nov 2026. Companion to `SEABED_AND_ISLAND_LAYOUT.md`, `REAL_REFERENCE_PLACES.md`, `FLOW_TYPES.md`, `WILDLIFE.md`.
Gap it fills: `blender/island_common.py` makes islands from noise (distance field, ridged noise, a rocky rim, terraces). It has no rock type, no history and no exposure. This note gives a world-builder view: a geology province picks the rock, the rock drives shape, colour, soil, plants and resources.
Method and limits: read-only web search extracts, no downloads; en.wikipedia.org was not fetchable (search extracts only). Many searches returned the right paper but not the number, so most numbers are my own knowledge or design tuning and are tagged so.
Tags: VERIFIED (seen in a named source extract), PLAUSIBLE (standard geology, not checked on a primary page), UNVERIFIED (my guess or TUNING for the game).

## 1 Geology provinces (8)
"Erosion rate" is relative to granite = 1.0 on land over geological time; it is a game knob (UNVERIFIED as a ratio). Strength ranges (uniaxial compressive, MPa): granite 100-250, basalt 100-300, sandstone 20-170, limestone 30-250, slate 100-200, chalk weak class 5-25 (VERIFIED as ranges from engineering tables, see sources S9). Wave erosion bites along joints, bedding and weak layers more than on strength, so joint spacing matters as much as hardness.

| # | Province | Erosion rate (granite=1) | Jointing / bedding | Landforms | Coast types | Fresh / weathered / lichen colour | Soil and plants | Resources |
|---|---|---|---|---|---|---|---|---|
| P1 | Ancient hard gneiss (Hebridean type) | 0.7 (very resistant, UNVERIFIED) | foliation banding, steep dips, joints 0.5-5 m; faults and dykes give straight narrow clefts | glaciated "whaleback" knolls and hollows (knock-and-lochan), low relief with many small lochs; Outer Hebrides platform is a fragment of ancient crust uplifted and tilted (VERIFIED, S1) | skerries, geos along faults, rocky headlands, sandy bays between | fresh grey-pink banded; weathered rusty grey; orange, grey-green and black crustose lichen (PLAUSIBLE) | thin acid peaty soil, heather, bog, bare rock; almost no trees (PLAUSIBLE, REAL_REFERENCE_PLACES) | building stone (hard, hard to cut), peat fuel, kelp ash, fishing; little clay or lime |
| P2 | Red layered sandstone | 1.4 (UNVERIFIED) | flat bedding 0.2-2 m, vertical joints 1-5 m | stepped terraces, flagstone plateaux, tilted benches; low green islands (Old Red Sandstone, about 400 million years, VERIFIED for the age, REAL_REFERENCE_PLACES) | low cliffs with ledges, geos, small stacks, flat flag shores | fresh red-brown; weathered darker brown-red; grey and yellow lichen | fertile loam, pasture and barley, few trees | easily dressed flagstone and building stone, roofing flags, clay, good farmland |
| P3 | Columnar basalt, lava plateaux | 1.0 hard but jointed (UNVERIFIED) | columns 5-7 sided; width falls as cooling rate rises, so thin chilled tops, thick slow-cooled base (VERIFIED mechanism, S4); width in metres UNVERIFIED, tune 0.3-1.5 m; flows 5-50 m thick, stacked as steps (PLAUSIBLE) | step-trap plateaux, terraced hillsides, tall sea cliffs on columns | cliffs, caves cut in weak ash layers, sea stacks, arches, columned stacks | fresh black-grey; weathered brown-grey; yellow, orange lichen | rich brown soil, good grass; heather on thin tops, scrub | hard crushed stone and rubble, iron-rich red bole layers, good pasture |
| P4 | Granite | 1.0 (reference) | widely spaced orthogonal joints 1-10 m plus sheeting joints; this gives tors and corestones (PLAUSIBLE) | rounded domes, tors, corestone piles, small bare hills | boulder beaches, rounded headlands, coves, rocky ledges (Maine and Scilly type) | fresh pink-grey; weathered pale grey-brown; yellow, grey-green, orange lichen | thin sandy acid soil, gorse, heather, bracken, conifer where sheltered (PLAUSIBLE) | best building stone, china clay from rotted granite (PLAUSIBLE), flat sand |
| P5 | Slate and schist (folded, steep) | 1.1 (UNVERIFIED) | strong cleavage planes every few mm to cm; strike ridges all running one way (PLAUSIBLE) | narrow sharp ridges and troughs parallel to strike; long skerry rows; voes and inlets follow the strike | linear skerries, narrow sounds, long inlets, cliffs of layered plates | fresh blue-grey to silver-grey; weathered rusty brown; dark lichen | thin acid soil, heather, grass; conifer in sheltered troughs | roofing slate (split along cleavage), flat paving, little lime or clay |
| P6 | Chalk / limestone | 1.8 for chalk, 1.2 for limestone (UNVERIFIED); chalk is a weak rock, 5-25 MPa (VERIFIED, S9) | chalk: horizontal bedding plus flint bands; limestone: joint grid 0.3-2 m plus sinkholes | smooth rounded downs, dry valleys, white sea cliffs, caves, stacks and arches | 30-100 m white cliffs, wave-cut platforms, caves, arches, stacks, shingle beaches of flints | fresh white (chalk) or pale grey; weathered grey-white; pale grey lichen | thin lime-rich soil, short flower-rich grass, beech, ash | lime for mortar, chalk, flint for walling, limestone block; no peat |
| P7 | Volcanic island arc (cones and calderas) | 2.0 while young (loose ash), 1.0 once solid (UNVERIFIED) | lava flows and ash layers; radial gullies; ring faults around calderas | steep cones, crater lakes, calderas open to the sea as harbours (PLAUSIBLE), lava deltas | black cliffs, black sand, small stacks, steep seabed close in | fresh black; weathered rust-red; green moss, grey lichen | very fertile ash soil, forest, fast regrowth; bare on new lava | pumice and scoria, hot springs, rich soil, building stone (basalt), sulphur |
| P8 | Glacial drumlin ("drowned hill") bays | 3.0 (loose till, UNVERIFIED) | none; soft clay-rich till that wave erosion cuts back | fields of oval hills (drumlins) pointing along ice flow, flooded to make clusters of small islands; shape is a streamlined whale-back, length about 2-4 times width (PLAUSIBLE) | low mud and clay cliffs, shingle spits, boulder lag, mud flats, saltmarsh | brown-grey till; weathered brown; little lichen, mostly boulders | fertile loam, grass and trees, saltmarsh in lee | clay (bricks, pots), gravel, sand, boulders, rich farmland, shellfish |

Hebrides check: the Outer Hebrides are P1 gneiss with machair sand (S1, S6); Orkney is P2 sandstone (REAL_REFERENCE_PLACES); the Inner Hebrides add P3 basalt (Staffa is the standard columnar basalt example, VERIFIED S4).

## 2 History of the land, cheap to simulate
| Process | What really happens | Game rule | Conf. |
|---|---|---|---|
| Tectonic uplift and tilt | Hebridean crust was lifted and tilted in the Palaeogene (VERIFIED, S1); this gives a high side and a gentle side | base surface = low-frequency noise + plane tilt (dip direction) | VERIFIED for the Hebridean tilt, rule is a TUNING |
| Rock layers | strata dip at an angle; erosion strips soft beds and leaves hard beds as ridges | rock id = function of (distance along dip direction + noise), so bands and faults appear | PLAUSIBLE |
| Glacial scouring | Ice scours soft rock into hollows (rock basins, later lochs) and polishes hard rock into whalebacks and drumlins, all lined up along ice flow | blur and stretch the height along an ice-flow vector; lower the surface where rock is soft or fracture density high | PLAUSIBLE; whalebacks seen in S2 |
| Fjords and voes | Glaciers cut deep troughs along weakness, with a shallow lip at the mouth (SEABED note) | carve long channels along the flow vector from high to low, keep a sill at the mouth | PLAUSIBLE |
| Drowning by sea-level rise | Rising sea floods valleys (rias, voes) and drowns drumlin fields; sea rose fast then slowed before about 6,500 years ago (VERIFIED, S6) | choose sea level `Z` and flood the surface; islands are what remain above `Z` | VERIFIED for the slowdown |
| Rebound | Ice-free crust rises, shorelines lift (Stockholm about 5 mm a year, VERIFIED, REAL_REFERENCE_PLACES) | optional `Z` lowering over game years | VERIFIED number |
| River and thermal erosion | Rivers cut valleys: erosion = K x area^m x slope^n; common choice m/n = 0.5 and n near 1, with n often above 1 in global fits (VERIFIED, S7). Slopes above a rock-dependent angle slump | stream power plus talus: slope cap by rock (hard 45 deg, soft till 25 deg) | VERIFIED for the law shape; the angles are UNVERIFIED |
| Wave erosion | Waves cut cliffs, notches and platforms in proportion to exposure (fetch) and weakness; geos form along faults, arches then stacks form where headlands are cut through | retreat = fetch x (1/hardness) x joint weakness; stacks left where a headland collapses | PLAUSIBLE |
| Longshore drift and deposition | sand and gravel drift along a coast, drop in calm bays; spits grow downdrift, tombolos link islands in the lee where waves bend round both ends (VERIFIED, SEABED note) | add sediment into cells with low exposure, downwind of an eroding headland | VERIFIED mechanism |
| Dunes and machair | Shell sand blown inland, fixed by grass, builds a low lime-rich plain; shell sand and a positive sand budget are needed, soil pH above 7 (VERIFIED, S6). Dates differ by site (about 7,600 to 4,300 years ago, VERIFIED, S6) | sand cells behind a sandy beach, within a few hundred m, only where shell sand is the source and slope is low | VERIFIED qualitative |
| Peat | Wet, acid, cool ground with poor drainage builds peat over time | flat or gentle slope, high rain, acid rock (P1, P4, P5), not on lime | PLAUSIBLE |

## 3 Seedable pipeline (numpy, grid 129 to 513)
All steps are deterministic from `seed`, using the same integer-hash noise as `island_common.py`. Cost is per run on N x N cells; N = 513 gives 263,000 cells.
| # | Step | Key rule | Cost (numpy) |
|---|---|---|---|
| 1 | Uplift surface | `H0 = A*fbm(x,y, low freq) + tilt*(x*cos(dip)+y*sin(dip)) - bowl(distance to centre)` | one pass, under 0.1 s |
| 2 | Rock map | pick province P1..P8 by seed; rock id `r = band(u + noise*w)` along the dip direction `u`; faults = a few lines that shift `u`; each id has hardness `h_r`, joint spacing, colour | one pass, under 0.1 s |
| 3 | Glacial streamlining | direction `f` (ice flow). `H = H0 - c*softness`; then anisotropic blur along `f` (kernel 5 to 15 cells long), whaleback = blur along `f`, subtract hollows where `softness` is high, fjord = deepen a stream line along `f` | blur is separable, about 0.2 s |
| 4 | Fluvial and thermal erosion | repeat 20 to 60 times: flow-accumulate on the grid (priority-flood or D8 sort), `dH = -K*h_r_erodibility*A^0.5*S` ; slope cap: if `S > Smax(r)` move the excess down | most costly step: D8 sort 0.05 s per iteration at N = 513, total 1 to 3 s |
| 5 | Sea level | choose `Z` (0 for modern); `mask = H > Z`; islands = connected components (label by flood fill); low-lying cells just under `Z` become the shelf | under 0.1 s |
| 6 | Wave erosion | exposure `E(c) = sum over 16 compass bearings of open-water run length up to 50 cells` (cheap ray-march); cliff retreat in the coastal band = `E * wave_k / hardness`; cut platform = flatten to `Z - 1` m just offshore, notch the cliff base, cut where joints are dense; arch and stack = break a thin headland where two coast sides are exposed | 16 bearing passes, about 0.5 s |
| 7 | Deposition in the lee | take the eroded volume; spread into cells where `E` is low and depth is below 3 m, biased downdrift along the longshore direction; fills bays, grows spits, links two islands where gap is less than 5 cells and lee is shared | 5 to 10 smoothing passes, about 0.2 s |
| 8 | Soil, vegetation, colour | soil depth = f(slope, rock, accumulation); acid or lime from rock id; wet and flat gives peat; plants from rock + slope + exposure + elevation (see table in section 5); colour from rock id, weathering from age and exposure | one pass, under 0.1 s |
Total about 2 to 5 seconds at N = 513 and under 0.5 s at N = 129 (my estimate, UNVERIFIED; not run). Check the cost by measuring, not by trust.
Hook into the existing code: `_base()` makes `h` and `rock` (0..1) today; the new pipeline replaces its distance field with steps 1 to 7, and `rock` becomes the rock id and weathering from step 8, so the camp clearing and the legacy seed 1122 can stay as a special case.

## 4 Province to vegetation by exposure (step 8 rules)
| Place | Exposed (open to gale) | Sheltered | Wet and flat | Sandy lime |
|---|---|---|---|---|
| Acid rock (P1, P4, P5) | bare rock, lichen, short heather | heather, gorse, scrub, small conifer in the lee | peat bog | machair grass |
| Sandstone (P2) | short turf, thrift | pasture, barley, hedge | wet meadow | n/a |
| Basalt (P3) | short grass, thrift on ledges | grass, scrub | rush meadow | n/a |
| Lime (P6) | short flowery turf | beech, ash, scrub | n/a | machair-like turf |
| Volcanic (P7) | bare lava, moss | dense forest | marsh | black sand with grass |
| Till (P8) | boulder turf | grass and trees | saltmarsh | shingle |
These are qualitative PLAUSIBLE rules; treeless exposure on the Atlantic edge is VERIFIED qualitatively in REAL_REFERENCE_PLACES.

## 5 Realism checks a script can test per seed
| Check | Target | Source / confidence | Test |
|---|---|---|---|
| Island size, number-area (Korcak) law: number of islands with area above A goes as A^-K | K about 0.65 for Earth's islands (Mandelbrot 1975) (VERIFIED in a secondary extract, S3); K links to coast fractal dimension D as K = D/2 (extract, S3, convention differs between papers); Hurst exponent H about 0.7 for Earth's land (VERIFIED, one 2025 preprint extract) | fit slope of log(count) against log(area) on a log-binned list; accept K in 0.5 to 0.85 (TUNING range around the 0.65) |
| Largest to smallest island ratio | for 20 islands and K = 0.65: largest/20th area about 20^(1/0.65) = about 100 (my arithmetic from the law, PLAUSIBLE) | test: ratio between 30 and 300 for 20 islands |
| Coastline fractal dimension | rocky coasts about 1.3 or larger, sedimentary near 1, overall most probable 1.2 (VERIFIED, S5); west Britain 1.25 from Richardson via Mandelbrot (VERIFIED, S5) | box-count or divider on the coast outline; rocky provinces 1.2-1.35, sand coast 1.05-1.15 (TUNING) |
| Slope histogram | median land slope about 5-15 degrees on glaciated gneiss, 10-25 on slate, cliffs above 60 degrees only in a thin band (UNVERIFIED) | histogram of slope in land cells; check no more than 3% above 60 degrees |
| Relief ratio | island height / half-width about 0.01 to 0.05 for low Atlantic islands, 0.1 to 0.3 for steep cones (UNVERIFIED) | max height divided by equivalent radius |
| Rocky versus sandy shore by exposure | sand collects where exposure is low and slope is gentle; the exposed western edge is rock cliffs, with sand only where sand supply exists (machair needs a source, VERIFIED, S6) | per-province: share of coast length that is sand in 5-25% for P1, 0-5% for P6, 0-15% for P4 (TUNING) |
| Spacing between islands | channels a few hundred m to few km; inhabited islands 1-3 km apart in Scilly, 1-10 km in Orkney, 0.5-5 km in Penobscot (VERIFIED in REAL_REFERENCE_PLACES) | median nearest-neighbour edge gap between islands above a size threshold |
| Share of land below 10 m | low-lying coasts have most land under 10 m (Wadden, machair, Scilly); the Hebrides platform has a high share too (UNVERIFIED) | compute; 40-70% for low archipelago seeds, below 25% for steep seeds (TUNING) |
| Stacks and arches | rare, only on exposed, jointed, hard cliffs; likely 0-3 per 10 km of exposed cliff (UNVERIFIED) | count stacks (small islets within 3 cells of cliff) and arches (via a manual rule); expect 0 on sheltered coasts |
Verified here: the 0.65 exponent as a reported figure, coast fractal dimension, the slowing of sea-level rise, the Hebridean tilt, the machair mechanism. Everything else is a tuning guess and must be fitted by running seeds.

## 6 Which provinces suit the owner's reference, and what the player gets
Owner reference: Hebrides-like Atlantic coast plus one sheltered harbour island (EVOLUTION_TREE decision 3).
| Role | Province | Why |
|---|---|---|
| Main outer islands | P1 gneiss (primary), with machair strips on west sand bays | matches the Hebridean look, skerries, lochs, peat, machair |
| Neighbour with terraces | P2 sandstone, or P3 basalt step plateau | Orkney-like farmland, or Inner-Hebrides-like stacks and arches |
| Sheltered harbour island | P8 drumlin bay, or a drowned valley in P4/P5 | low fetch, shingle spit, mud, harbour in the lee |
| Accent | P4 granite (Scilly or Maine look), P5 slate (voes), P7 cone (a volcanic isle) | variety, trade goods |
| Probably not for this reference | P6 chalk (southern England look) | cliffs and lime fit a different, southern map |

| Province | Player gets |
|---|---|
| P1 gneiss | hard building stone, peat fuel, kelp ash, fishing, shell sand lime on machair, crofts on machair |
| P2 sandstone | easy dressed stone and flag roofs, clay, farmland, barley |
| P3 basalt | tough stone for quays and walls, rubble, good grazing, caves |
| P4 granite | best building stone, harbour walls, china clay, boulder beaches, sheltered gardens |
| P5 slate/schist | roofing slate, paving, long sheltered inlets for boats and fish farms |
| P6 chalk/limestone | lime for mortar, flint, white stone, no peat |
| P7 volcanic | fertile soil, building stone, pumice, hot water, steep harbours |
| P8 drumlin bay | clay for brick and pots, gravel, sand, farmland, shellfish, the safest harbour |
Trade logic fits era 4 of EVOLUTION_TREE: stone, slate, lime and clay are the materials a skipper moves between islands, because each island has only some of them.

## 7 Sources (read as search extracts only; licences from the host)
| # | Source | Used for | Licence (as seen) |
|---|---|---|---|
| S1 | BGS Earthwise, Foreland Lewisian: https://earthwise.bgs.ac.uk/index.php/Foreland_Lewisian,_the_Hebrides,_Northern_Highlands_of_Scotland ; Scottish Geology Trust: https://geoguide.scottishgeologytrust.org/page/2876 | Hebridean gneiss, uplift and tilt | BGS: Open Government-style terms for text (UNVERIFIED, check before copying text); facts only here |
| S2 | JNCC GCR vol. 34: https://data.jncc.gov.uk/data/17c34755-15be-4bf6-b132-6a2ab8eeb10b/gcr-v34-lewisian-torridonian-moine-c2.pdf | gneiss, glaciation | JNCC open data (check each file) |
| S3 | Self-Affine Scaling of Earth's Islands (arXiv 2512.16659): https://arxiv.org/html/2512.16659v1 ; Korcak summary extracts | island size law, Hurst exponent | arXiv, author licence varies (UNVERIFIED) |
| S4 | Phillips et al. 2013 Staffa columnar jointing: https://link.springer.com/doi/10.1007/s00445-013-0715-4 ; Goehring and Morris 2008: https://www.physics.utoronto.ca/~nonlin/preprints/GM_JGR08.pdf | column size versus cooling rate | publisher copyright; facts only |
| S5 | How winding is the coast of Britain (arXiv 0712.3076): https://arxiv.org/pdf/0712.3076 ; Mandelbrot 1967: https://ui.adsabs.harvard.edu/abs/1967Sci...156..636M/abstract | coast dimension | arXiv (author licence); Science copyright; facts only |
| S6 | JNCC GCR coastal geomorphology (machair): https://data.jncc.gov.uk/data/118b87ed-d7dd-4ea0-99ad-36ed62d2eab0/gcr-v28-coastal-geomorphology-c9.pdf ; Scottish Geology Trust page 2353; Benbecula machair paper (Cambridge) | machair, sea-level rise | JNCC open data; others copyright; facts only |
| S7 | Whipple and Tucker 1999; Harel et al. 2016: https://ui.adsabs.harvard.edu/abs/2016Geomo.268..184H | stream-power parameters | publisher copyright; facts only |
| S8 | Wikipedia Stream power law (https://en.wikipedia.org/wiki/Stream_power_law) and Lewisian gneiss extract | general | CC BY-SA 4.0 |
| S9 | rock strength tables: https://sites.psu.edu/tzhu/files/2016/10/Some-Useful-Numbers-1g1rkuu.pdf ; https://www.ausimm.com/globalassets/insights-and-resources/minerals-processing-toolbox/rockprop-1.pdf | UCS ranges | university and trade notes; facts only |
No text was copied. Gaps I could not close in this session: cliff retreat rates, machair width, Staffa column width numbers, island-count statistics per archipelago, share of land below 10 m. Those stay UNVERIFIED and should be fitted on seeds or measured from open elevation data later.
