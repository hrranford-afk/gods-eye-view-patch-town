# Volcanic island and table-edge cutaway (research note)
Do not put real place names into game code, assets or recipes.
Status: research note for Living Islands (branch citylab/cloud-islands), 23 Nov 2026. Fills the stub of province P7 in `GEOLOGY_AND_LANDFORMS.md`. Companions: `CLOUD_PHYSICS_FOR_VISUALS.md`, `CLOUD_ATLAS.md`, `SEABED_AND_ISLAND_LAYOUT.md`, `FLOW_TYPES.md`, `SEDIMENT_PHYSICS.md`, `MODES_AR_DESKTOP_HANDHELD.md`, `landform/LANDFORM.md`.
Owner idea: a big Tenerife-like island (flatlands, a huge volcano in the middle, you walk round to see the far side), and a world that ends at the table edge as a cutaway, so you can see INSIDE the volcano.
Method and limits: web search extracts only, no downloads. Not fetchable from this session (host does not resolve): swisseduc.ch, webtenerife.co.uk, pubs.usgs.gov (page fetch; search extracts of it were read), en.wikipedia.org. Search extracts were read for USGS, NPS, NASA-linked, Spanish geological survey and AEMET pages. Numbers not in an extract are my own knowledge or design tuning and are tagged so.
Tags: VERIFIED (seen in a named extract), PLAUSIBLE (standard geology, not checked on a primary page), UNVERIFIED (memory), TUNING (a game number to be set by eye).

## 0 The standing gate in one table
| Gate item | Where |
|---|---|
| How it forms, numbers, looks, time, interactions, cheap model | sections 1 to 5 |
| Confidence tags and could-not-verify list | every table, section 9 |
| Common mistakes and checklist | section 7 |
| What is faked | section 8 |

## 1 Volcanic island morphology
### 1.1 Types and slopes
| Type | Build | Typical flank slope | Size | Look | Tag |
|---|---|---|---|---|---|
| Shield | thin runny basalt flows, many eruptions | 3 to 10 deg; the largest Hawaiian shield is "a very broad flat dome", slopes nowhere steeper than about 12 deg, same gentle slope under water to the sea floor | USGS: Mauna Loa 4170 m above sea level and about 9 km of edifice from the sea floor, volume at least 75,000 km3 | smooth, wide, low; summit caldera with steps; rift ridges; lava tubes | VERIFIED (USGS, NPS extracts) |
| Stratovolcano / composite | alternating lava, ash, breccia; steeper | 20 to 35 deg on the cone, concave: steepest near the top, flattening to a skirt of ash fans below | cone 1 to 3 km high, base 10 to 30 km | steep, symmetric cone, summit crater; gullies | USGS describes them as steep-sided, symmetric, layered (VERIFIED, qualitative); angle numbers PLAUSIBLE |
| Cinder (scoria) cone | loose fragments thrown out, one short eruption | angle of repose: 25 to 32 deg (NPS), 33 deg (Oregon State), 30 to 40 deg (geology.com) | usually 100 to 150 m tall, rarely 200 to 300 m; Paricutin 424 m in nine years; some over 1.6 km wide at the base | small, sharp cone, bowl crater, often breached on the downwind side; lava flows leave from the base | VERIFIED (NPS, USGS extracts) |
| Composite island (the Tenerife-like case) | old big shield, then caldera and flank collapses, then young stratocone inside | shield skirt 5 to 12 deg; inner wall of the caldera near vertical; young cone 25 to 35 deg | see 1.2 | big ring wall, a flat-ish floor, a steep cone standing in it, off-centre | VERIFIED for the facts in 1.2 |
### 1.2 The Tenerife-like reference (real numbers, so the diorama ratios have an anchor)
| Item | Value | Tag |
|---|---|---|
| Summit (young cone) | 3715 m (some give 3718 m) | VERIFIED (several extracts agree) |
| Second young cone | 3134 to 3135 m, crater 800 m across, 2.5 km from the main summit | VERIFIED (extract) |
| Caldera (old ring wall) | sources differ: 10 x 17 km, 15 km, 12 to 20 km, 16 x 11 km. Take about 12 x 16 km, elongated, open (collapsed) to the north | VERIFIED that sources differ; mean TUNING |
| History | edifice grew and was destroyed in phases from about 1.56 Ma to 0.17 Ma; each phase ended in caldera eruption and flank collapse. North-flank landslides: Icod about 165 to 170 ka, Orotava about 535 to 560 ka, an older one about 1.15 Ma (disputed, some give 0.6 to 0.7 Ma). Submarine debris deposits and offshore sonar evidence of at least two north-flank collapses | VERIFIED (Scientific Reports 2018, Spanish geological survey 2020 review, sonar paper extract) |
| Island size, height above sea floor, floor depth | about 80 x 50 km; sea floor 3 to 4 km deep so the edifice is 7 km tall from base | UNVERIFIED (memory; not read this session) |
| Ratio caldera width : island width | about 0.2 to 0.3 | PLAUSIBLE (from the two lines above) |
| Ratio summit height : island radius | 3.7 km / 25 km = 0.15, mean slope about 8.5 deg | PLAUSIBLE (arithmetic on UNVERIFIED island size) |
### 1.3 Features and numbers
| Feature | What it is and how it looks | Numbers | Tag |
|---|---|---|---|
| Summit caldera | collapse after magma withdrawal; steep walls, flat floor, often later filled by young flows and a new cone | shield caldera: a few % of island width (a few km on a 100 km island); composite: 0.2 to 0.3 of island width. Depth of wall 100 to 500 m | PLAUSIBLE |
| Crater | bowl at a vent | 10 to 20% of cone base width | PLAUSIBLE |
| Rift zones | straight ridges of stacked dikes and cinder cones, 2 to 3 arms at 90 to 120 deg, one often longer and one buried; they spread the flank | arms 0.3 to 0.7 of island radius, 20 to 60 cones along each | PLAUSIBLE (rift zone ~3 km to base depth: USGS extract) |
| Parasitic cones | cones on the flanks fed from the rift dikes; sometimes in a line along a fissure | spacing 0.3 to 3 km, aligned; cones 50 to 300 m high (see 1.1) | PLAUSIBLE |
| Barrancos (ravines) | radial V then U valleys; start as rills on the steep upper cone, join downhill, cut 50 to 300 m deep on old shields in a few hundred thousand years; fresh ash cone: shallow gullies; young lava surface: none | spacing 0.5 to 2 km around the flank; width grows with the square root of drainage area | PLAUSIBLE (stream power form already used in `world.py`) |
| Lava flows | tongues 20 to 200 m wide, 2 to 10 m thick, ending in lobes; spread as a fan on flat ground; a-a rough and clinker, pahoehoe smooth and ropy; flows fill valleys, so a young flow sits in an old barranco | length up to 10s of km on shields | PLAUSIBLE |
| Lava delta | where a flow meets the sea: water flashes to steam, lava shatters to glassy black sand, which piles into a delta on an unstable submarine slope; USGS says deltas collapse unpredictably, throwing 15 cm rocks 95 m inland in one case | new land bench a few 10s to 100s of m wide | VERIFIED (USGS HVO extracts) |
| Littoral cone | spatter mound built by steam explosions where seawater enters a tube; circular, a few to 10s of m | | VERIFIED (USGS, UH Hilo extracts) |
| Giant flank collapse scar | amphitheatre or horseshoe cliff 5 to 20 km wide, a few 100 m to km high, opening to the sea; below it a fan of debris on the sea floor | Tenerife north flank, see 1.2 | VERIFIED qualitatively |
| Coast | young lava: low black cliffs 5 to 30 m, lava benches, tubes and sea caves where tube roofs cut by waves; old coast: cliffs 100s of m high behind a boulder beach, wave-cut platform; landslide coast: giant cliff | black sand and boulder beaches in coves at barranco mouths and delta fringes | PLAUSIBLE |
| Submarine flank | the edifice continues to a sea floor 2 to 4 km down. Narrow shelf, steep drop: shelf break within 1 to 5 km of the coast on young volcanoes, and the slope below is 5 to 20 deg, steeper near the island on young flanks, with canyons under the barrancos | no wide shelf | PLAUSIBLE (USGS: slopes continue under water to the sea floor, VERIFIED for a shield) |
| Hotspot chain | the plate moves over a fixed source (about 10 cm a year in the Pacific example); islands get older and lower along the chain: Kauai 5.0 to 5.5 Ma, Midway about 28 Ma, bend about 43 Ma. Young end: high, smooth, few valleys, active. Old end: eroded to deep valleys, reef, atoll then seamount | gap between island centres 50 to 100 km | VERIFIED (USGS extracts); the mechanism is debated (USGS notes a hotspot drift argument) |
| Island diameter : height | a big oceanic island is 10 to 20 times wider than high; the Tenerife shape is about 7 : 1 (tall for its width). A world of only small cones is 3 : 1 to 5 : 1 | | PLAUSIBLE |
### 1.4 Scale honesty and diorama exaggerations
A real volcano island is 25 to 80 km wide and kilometres high. Our window is 0.5 to 2 km across (`landform` default 512 m). So we shrink the horizontal by 30 to 50 times and must choose how much to keep the height.
| Choice | Rule | Tag |
|---|---|---|
| Window | 1536 m across (n=513 gives 3 m cells; n=1025 gives 1.5 m). Land radius 550 to 650 m, shelf and sea floor to the edge | TUNING |
| Height | true proportion for a 600 m land radius is about 90 m summit. Use 200 to 280 m (vertical exaggeration 2.5 to 3x), shield skirt 6 to 10 deg instead of 3 to 5 | TUNING |
| Do not stack | the diorama already exaggerates height; in AR keep the extra vertical exaggeration at 1.0 (not the 1.5 to 3x of `MODES_AR_DESKTOP_HANDHELD.md`) | TUNING |
| Caldera | 0.22 to 0.3 of island width, so 250 to 350 m across; wall 25 to 50 m tall; young cone 70 to 110 m tall, slope 25 to 32 deg | TUNING |
| Features that must stay | caldera wall, a nested cone off centre, 2 to 3 rift ridges with 12 to 30 small cones (each 8 to 25 m tall, 30 to 60 m wide), 8 to 16 barrancos, one collapse scar, black coves, a lava fan on the coast. These are what read as "volcano" | TUNING |
| Features dropped | the 2 to 4 km sea-floor drop becomes 120 to 200 m of depth at the window edge (the cutaway shows it); cinder cone real size (100 m) becomes 10 m, so they look like small cones, not pimples | TUNING |
| People and houses | keep real size (a 3 m tent). A 10 m cone then looks like a 10 m cone: fine | |

## 2 Altitude zones and climate
### 2.1 Warm Atlantic version (Tenerife-like), as a fraction of summit height H so it scales
| Belt | Real height (m) | Fraction of H | Look, rock colour | Tag |
|---|---|---|---|---|
| Coastal scrub and bare coast | 0 to 600 (drier south, wetter north) | 0 to 0.15 | spiky succulents, dry grass, black or brown lava, ochre ash | PLAUSIBLE |
| Laurel / cloud forest (north, wet side) | 600 to 1500 | 0.15 to 0.4 | dense dark-green evergreen, moss, mist, dark red soil | PLAUSIBLE (not confirmed this session) |
| Pine belt | 1000 to 2100 (Wikivoyage extract); one park page gives the lower edge at 1600 m. Pines grow about 1000 m lower than a continental tree line of the same latitude | 0.27 to 0.57 | open pine, needle floor, orange-grey bark, fire scars | VERIFIED (extract), sources differ |
| High scrub (broom, juniper in shelter) | 2000 to 3300 | 0.54 to 0.89 | grey-green, white broom flowers in spring, pale pumice and ash | VERIFIED (park site: broom is the representative plant above) |
| Bare lava desert | 3000 up | 0.8 to 0.95 | black, red and ochre, no plants | PLAUSIBLE |
| Summit | 3300 to 3715 | 0.9 to 1 | fresh-looking lava, yellow-white sulphur, steam, winter snow | PLAUSIBLE |
### 2.2 Cool Atlantic version (our default look; fractions TUNING)
| Fraction of H | Belt | Rock and colour |
|---|---|---|
| 0 to 0.08 | sea-spray turf, thrift, black boulder beach | black basalt, orange lichen on the splash zone |
| 0.08 to 0.25 | grass and heather, bog in hollows | brown peat, grey stone |
| 0.25 to 0.45 | birch and willow scrub in gullies and on lee slopes only | green pockets on brown |
| 0.45 to 0.8 | moss and crowberry heath, stone fields | grey moss on black, rust scree |
| 0.8 to 1 | bare lava, ash, scree; snow patches in winter and spring | black, red, grey; white patches |
All TUNING. A cool-climate birch limit of a few 100 m is from memory (UNVERIFIED). Use `li_trees.py` species already built: birch, rowan, willow, juniper, heather, bog cotton, wind pine.
### 2.3 Weather effects of a tall island
| Effect | What happens | Game rule | Tag |
|---|---|---|---|
| Trade wind inversion and sea of clouds | AEMET Izaña pages: the inversion base sits at 1000 to 1500 m; the stratocumulus layer forms near it, "a sea of clouds"; clouds climb the slopes under daytime breezes until they hit the inversion. Dry stable air above, summit clear | the cloud deck is a flat, bright layer at 0.25 to 0.4 H (on a 250 m cone, 60 to 100 m up); the cone top stands out of it | VERIFIED (extract); fractions TUNING |
| Windward / leeward | windward (north) side wet: cloud, drizzle, forest; leeward (south) dry, scrubby, sunny (rain shadow) | windward face wet colours, forest, cloud at 0.15 to 0.4 H; lee face yellow-brown, sparse | VERIFIED qualitatively (ESA 2026: humidity and rain to the north, stratocumulus hugging north coasts), rain-shadow PLAUSIBLE |
| Orographic cap and banner | air forced up a summit makes a cap cloud; a banner streams from the top downwind; the lee clears | only when the air is nearly saturated and the top is above the deck; cap on a 250 m cone in rain and fog states; banner TUNING | PLAUSIBLE (see `CLOUD_PHYSICS_FOR_VISUALS.md` section 6, rule 3) |
| Wake and vortices | NASA (island 1.5 km wide, 1.6 km high in a cloud deck) shows streets of vortices 100s of km long and a clear lee; needs an island that pierces a stable layer | our volcano pierces the deck, so this IS the case, but streets are far longer than the window: show a clear wedge and 1 to 2 swirls at the window edge, and the rest as deck texture on the horizon. Existing rule "no Karman streets at our scale" is for 200 m flat islands | VERIFIED (NASA, in the cloud note); window use TUNING |
| Sea | wind shadow: calm dark smooth patch 3 to 8 island heights downwind; faster wind round the flanks, about 1.3 to 1.5 times at the corners (corner acceleration zones exist on real islands); wave shadow behind the island, refraction round it | feed `exposure` from `world.py` (it already does fetch ray marching); add speed-up factor on flank cells | PLAUSIBLE, factor TUNING |
| Snow | persistent snow only on the highest real ranges; Tenerife has winter snow on the summit, not a permanent line | cool version: patches above 0.8 H in winter, gone by midsummer. Use `SKY_CLOCK` season | PLAUSIBLE |
| Fresh water | high ground collects rain and cloud drip; springs at the foot of the lava stack | see 3.4 | PLAUSIBLE |
Mismatch to note: `CLOUD_PHYSICS_FOR_VISUALS.md` sets fog cloud bases of 150 to 300 m for the small-island world. For a volcano island, put the deck at fractions of H, and let the player see both from above (the summit above the deck) and from below (a grey roof).

## 3 Interior structure for the cutaway
### 3.1 Parts
| Part | Real | Diorama (H = 250 m, window 1.5 km) | Tag |
|---|---|---|---|
| Magma chamber | shallow reservoirs at Kilauea about 1 to 2 km below the summit (USGS chapter extract); deep rift zone from about 3 km to the base at about 9 km; many volcanoes have two stores, a shallow crustal one and a deeper one. Size: km scale, flat to oval | ellipsoid, semi-axes 60 x 60 x 25 m, centre about 40 m below sea level under the cone; optional deep second one 140 m down. About 0.08 R wide | VERIFIED depths (USGS extract); sizes TUNING |
| Conduit | pipe from chamber to vent, tens to 100s of m wide | 10 to 14 m radius, slightly wavy | PLAUSIBLE |
| Dikes | thin sheets, 1 to 10 m thick, vertical to steep, fan out from the conduit and run along rift zones | 20 to 40 planes, 2 to 5 m thick, denser along rift azimuths; shown as pale or dark thin stripes | PLAUSIBLE |
| Sills | flat sheets between layers | 3 to 6, 3 to 6 m thick | PLAUSIBLE |
| Lava and ash stack | beds from 1 to 20 m, dipping away from the vent: near the summit 20 to 35 deg, flank 5 to 12 deg, flat in the caldera fill | beds follow the old surface: about 5 to 15 m each in the diorama, 15 to 25 beds | PLAUSIBLE |
| Old basement | older shield core and, deeper, oceanic crust (dark basalt and gabbro), below seafloor sediment | crust slab 40 to 60 m thick at the base | PLAUSIBLE |
| Sea-floor sediment | pale muddy layer, 100s of m on real sea floors; thin near a young island; turbidite fans from collapse | 10 to 20 m, thickening at the foot of the flanks and under the collapse scar | PLAUSIBLE |
| Caldera collapse block | a down-dropped piston, bounded by ring faults dipping steeply outward or inward; strata inside offset by the drop | drop 30 to 50 m; fill of flat beds on top | PLAUSIBLE |
| Hydrothermal zone | altered, yellowed rock above the chamber and round the conduit, plus sulphur deposits at vents | halo 20 to 40 m, patchy yellow-brown | PLAUSIBLE |
| Wave-cut platform and cliff | flat bench at sea level backed by a cliff; in section a notch and a ledge | 3 to 8 m bench at the sea line on old coast | PLAUSIBLE |
### 3.2 Water table and fresh water lens
Rule of thumb (Ghyben-Herzberg), USGS Long Island page and a GSA abstract: for each unit of fresh water above sea level there are about 40 below; one foot of water table drop shrinks the lens by about 40 feet. Limits: USGS Izuka and Gingerich note it can over- or underestimate (no vertical flow assumed); Hawaiian lens midpoints can differ by up to 100 m. VERIFIED. Game use: lens base depth = 40 x head. A basal lens of 2 m head under a coastal plain is 80 m thick; the head rises inland. Springs at the foot of a lava flow or on a dike-impounded slope. Draw it as a pale blue lens shape in the section, thickest under the middle, thinning to nothing at the shore, floating on a darker salt layer, with a thin mixing band. Wells drawn too low pull salt up: a hopeful, readable rule (over-drawing makes the well salty, rest and rain bring it back). TUNING.
### 3.3 Standard colours in block diagrams
USGS/FGDC geologic symbol standard (extract): igneous and volcanic units should contrast strongly with neighbouring sedimentary units, reds preferred but any strongly saturated colour allowed; patterns are added where they help. VERIFIED. The basalt colour was not in the extracts. Widely used conventions (PLAUSIBLE, from textbooks and museum models):
| Material | Colour in our section | Pattern |
|---|---|---|
| Lava flow (basalt) | dark grey-brown, with a red top (bole) line | thin dark bands, a few vesicle dots |
| Ash and tuff | tan to yellow-ochre | fine dots or thin pale bands |
| Cinder / scoria | red-brown | coarse dots |
| Dike | pale grey or dark, sharp straight edges | none, cuts across beds |
| Old shield / basement | darker, more purple-grey | thicker bands |
| Oceanic crust | dark blue-grey, a few lines | |
| Sea-floor sediment | pale cream | fine bands |
| Magma | bright orange-red with a lighter core, flat colour not a glow blob | |
| Hydrothermal | yellow-green stains | patches |
| Fresh water lens | pale cyan | |
| Salt water | blue, darker with depth | |
| Soil | brown strip, 1 to 2 m on the top of the profile | |
How existing diagrams read at a glance: a 3D block with the map on top and two cut faces; the top face is the land surface in natural colour; cut faces are flat colour with black line work; a labelled legend; the sea shown as a light-blue slab, dark at the bottom; the vertical scale stated. Our cutaway copies this layout.

## 4 Cheap model in our tool
Grid n = 513 over L = 1536 m (3 m cells). Coordinates: x east, y north, z up, sea level 0, axis (cx, cy) = (0, 0) at the middle. Numbers: R_c = land radius, H = summit height, D = floor depth at the window edge.
### 4.1 Height profile `h(x,y)` (numpy)
```
r  = hypot(x-cx, y-cy) * (1 + 0.15*fbm(theta*2, seed))        # radial noise: lobes
Rb = base radius where the cone meets the sea floor (about 1.45*R_c)
shield: hs(r) = -D + (Hs + D) * clip(1 - r/Rb, 0, 1)**p        # p ~ 1.6; sets slope 6-10 deg at coast
caldera (centre c1 offset toward the lee, radius rc = 0.14*L):
   hrim = hs(rc); wall = smoothstep(rc*0.8, rc, r1)             # 0 inside, 1 outside
   h = hs  - dc * (1 - wall) ;  dc = 35..50 m ; add ring ridge +4 m at r1 = rc
collapse scar (sector of angle 70 deg, from azimuth phi): inside the sector and r1 > 0.7 rc:
   h = min(h, hs - dcol * smoothstep(...)) and a debris fan on the sea floor beyond (lower, hummocky)
young cone (centre c2 = c1 + 0.35*rc in a random direction, base radius rb2 = 0.55 rc, slope 25-32 deg):
   h = max(h, hc2 + Hc * clip(1 - r2/rb2, 0, 1)**1.15) ; crater bowl: h -= 9*exp(-(r2/(0.08*rb2))**2)
rift ridges (k = 2..3 arms, azimuth a_k): d_perp, d_along; 
   h += Hr * exp(-(d_perp/wr)**2) * smoothstep(0, 0.1*Rb, d_along) * (1 - d_along/Lr)   # Hr 10-20 m, wr 40-70 m
parasitic cones: Poisson-disc along each arm, spacing >= 45 m, 12..30 total:
   h += hc*clip(1 - rc_i/ri, 0,1)**1.1  with a crater dip; hc 8-25 m, ri 30-60 m, breach 30% on the downwind side
barrancos: add 3..6 m of fbm to h, then run `world.fluvial` (D8 flow accumulation + stream power) for 24 to 40 iterations
   with erodibility 1.5 on ash, 0.7 on lava, and thermal relaxation at 35 deg (ash) / 25 deg (old lava)
   -> V-shaped radial gullies appear on the steep cone, deepening and widening down to the coast
young lava flows (3..6 from cones and the summit): path = steepest descent from the vent with a little noise;
   width 12-40 m, grows by 1.5x on slopes below 4 deg (fan); raise h by 2-5 m with lobed edges; stop 10-40 m seaward of the coast (delta)
coast: after erosion apply `world.wave_and_deposit` for the black sand (rock id `shell_sand` -> add a `black_sand` id) in coves
```
Integration with the landform tool: a province `D` (volcanic) added beside A/B/C in `world.py`: `build_D(ctx)` writes uplift = the profile above; the existing erosion/wave/deposit/soil steps run unchanged; `rock` gets new ids (`lava_young`, `ash`, `scoria`, `lava_old`, `black_sand`). Time at n=513 is about 5 s for A to C (VERIFIED, `LANDFORM.md`); a volcano with 40 erosion iterations is about 6 to 8 s (PLAUSIBLE estimate, not measured); n=1025 is about 4x per iteration so about 25 to 30 s, over the 15 s budget (PLAUSIBLE arithmetic). Bake offline or at 513 for play.
### 4.2 Interior rock id `rock(x,y,z)` (cheap, vectorised)
```
r, theta from axis; h = height(x,y) (bilinear from the grid)                 # one array lookup
if z > h and z > 0: air ; elif z > h and z <= 0: water (fresh/salt by lens, see below)
floor surface zf(r) = -D + sed(r) ;   crust base zc = -D - Tcrust
if z < zc: bottom cap / z0
elif z < -D: oceanic crust ;  elif z < zf(r): seafloor sediment (thicker with debris near the collapse sector)
else (inside the edifice):
   zeff = z + dcol*(r1 < rc_ring)                    # collapse block: stack dropped by dcol
   u    = zeff - Ae * hs(r)                          # layers parallel to the old surface so they dip away from the vent
   bed  = floor(u / t(r,zeff))                       # t = 6..14 m, thinner near the summit; add 0.3*fbm for lens-shaped beds
   id   = hash(bed) -> {lava, lava, ash, scoria, lava}  weights shift to ash higher up
   old shield core where u < -Tcore: darker id ; caldera fill where r1 < rc and zeff > rimfloor: flat beds (Ae = 0)
   dikes: for k in K: dperp_k = |(x-cx)*sin(a_k) - (y-cy)*cos(a_k)|; tilt a_k with depth; dike if dperp_k < w_k and r > rconduit and z > z_chamber_top
   sills: dike-like slabs |z - z_s| < ts and r < rs
   conduit: r < rcond*(1 + 0.15*sin(z/17)) and z > chamber top -> magma/dark feeder
   chamber: ((x-cx)/a)**2 + ((y-cy)/a)**2 + ((z-zch)/c)**2 < 1 -> magma ; shell 1.35x -> contact baked rock
   hydrothermal: (distance from conduit < 40 m and z > zch) and fbm > 0.1 -> altered
   soil: top 1.5 m below the surface -> soil id
water: z <= 0 inside window ; fresh lens: z > -40*head(r) with head = hmax*(1-(r/R_c)**1.5), only under land
```
Cost: about 20 numpy operations per sample; a 2048 x 1024 wall = 2.1 M samples is about 1 to 2 s per wall in numpy (PLAUSIBLE, not measured). Dikes: precompute K = 40 planes, vectorise as an array of shape (K,) broadcast, or paint into a 2-D label first. The same rock function must run in JS later only for live slicing (see 5.4); bake the four walls offline for the shipped game.
Rules for a believable section: strata parallel to the surface, steeper near the summit; dikes cut strata; lava thicker, ash thinner low down on the shield and the reverse in the cone; ring faults offset beds; the caldera fill is flat; the sea floor is not flat but follows the flank slope and thickens at the toe; the section line passes through the vent for two walls (N-S, E-W) so the conduit and chamber show on at least two sides: place the world centre at the island centre, so the walls cut near the centre line only if the edge is moved (see 5.1).

## 5 Cutaway rendering
### 5.1 The block
| Part | Build | Tag |
|---|---|---|
| Terrain | the existing height field mesh, but the window edge is a sharp straight cut (no taper to deep water; `LANDFORM.md` section 7 sinks the rim, change it for this mode) | TUNING |
| Four walls | for each side, a triangle strip: at each of 513 columns a top vertex at the height there (land or sea floor) and a bottom vertex at z0 = -(D + Tcrust). Single quad row. UV u = s/L, v = (z - z0)/(zmax - z0) | TUNING |
| Wall texture | the rock id baked from `rock(x,y,z)` along the edge, mapped to colours (3.3). 2048 x 1024 per wall on desktop; 1024 x 512 on iPad and AR (about 11 and 2.7 MB with mips, 4 walls: 44 and 11 MB: PLAUSIBLE arithmetic). Texels outside the surface (above the profile) are never drawn, so they get the nearest rock colour: edge padding of 4 px (dilate) stops mip bleed at the profile and at the corners | PLAUSIBLE |
| Texture sampling | bake at 2x then downsample for line work; LinearMipmapLinear, anisotropy 4, no sRGB double conversion (set encoding) | PLAUSIBLE |
| Base cap | a flat plane at z0, dark neutral; or a plinth slab 20 to 30 m thick (wood or black) with a bevel; the label or scale bar on its front lip | TUNING |
| Sea block | a translucent box from the sea floor at each wall to sea level: `MeshBasicMaterial`, `transparent`, opacity 0.5, vertex colours from pale cyan at the top to deep blue at the bottom; renders after the walls. The water colour must show the water depth gradient, deeper = darker at the window edge. Cut at the sea floor profile so the seabed in section appears through the water; the water wall is the same strip geometry, with its own top at tide level | TUNING |
| Sea surface | the existing wave surface plane clipped to the rectangle (a quad with edge fade); wave height drops to 0 within 1 m of the wall so the top edge is a clean line; tide: move the top edge of the water wall with the tide (1 to 5 mm on the table). The tide line is a black stripe on each wall | TUNING |
| Lighting | cut faces use unlit or hemisphere-lit flat colour (Lambert with a single light so all four walls differ slightly, 0.75 to 1.0); thin black outline: `LineSegments` of the profile top, the base and the verticals (1 draw call, 4 px at desktop, 2 px on iPad); depth-test on with a polygon offset | TUNING |
| Triangles | terrain 2 x 512 x 512 = 524k (decimate to 130k for iPad); walls 4 x 1024 = 4k; sea 2 x 4k; lines negligible | PLAUSIBLE |
### 5.2 Edge cases
Walls must be exactly at the window rim so no seam; the water and rock walls share the same u/v; do not use backface cull on walls; a thin grey inner "skirt" under the terrain avoids light leaking at the corners; trees and clouds are hidden outside the rectangle (clip them with the same planes).
### 5.3 Interactive slice
`renderer.localClippingEnabled = true`; give terrain, sea, trees and walls `clippingPlanes = [plane]`; the plane is a draggable line on the map. Two ways to cap the cut:
| Method | How | Cost | Tier |
|---|---|---|---|
| Stencil cap (classic) | render the closed solid with back faces increasing the stencil, front faces decreasing, then draw a cap quad on the plane where stencil is non-zero; needs a closed (watertight) mesh, so the terrain skin, four walls and a floor must be one closed solid; context needs `stencil: true` | the whole mesh drawn 3 times (about 1.5 M triangles on desktop, too much for iPad); the cap is a flat colour, not the real layers | high only |
| Baked slice strip (recommended) | the same strip builder as the walls along the cut line, with a texture from `rock()` sampled there. Pre-baked at 16 to 32 positions or re-baked on release (512 x 256 = 131k samples; in JS about 10 to 30 ms, PLAUSIBLE, not measured). No stencil: the half of the terrain behind the plane is clipped, the strip fills the gap exactly | one strip and one 512 x 256 texture | all tiers |
Pointer: a slider and a drag handle (touch size 44 px); the plane always passes through the vent when "centre on vent" is held.
### 5.4 Blender and look
Blender (bpy): terrain mesh with a straight edge, then `bpy.ops.mesh.extrude_region` of the edge loop down to z0 (or build the walls from the same arrays); the wall material = an Image Texture node with Closest interpolation and an Emission or flat Principled setting (no specular), so sections read as paint. Outline: Freestyle or an inverted hull on a thin set of edge curves. Sea: a box with Principled Volume absorption (depth gradient comes free), glass-like top. Camera: orthographic or 35 to 50 mm, elevation 30 to 38 deg, azimuth 35 to 45 deg so two cut faces show: the classic block-diagram view. Render about 4 to 5 minutes at 64 samples (same as the island heroes: PLAUSIBLE).
### 5.5 AR on a table and device cost
Scale: window 1.5 km on a 0.9 m footprint is 1:1700; a 250 m summit is 15 cm, the whole block with 190 m below sea level is about 26 cm tall (arithmetic). Sides read as glass: thin bright edge lines, a vertical fresnel gradient on the water walls, a light reflection stripe; no real transmission (too costly on a handheld). Exaggeration: vertical 1.0 (already exaggerated); trees 1.5 to 2.5x, people 2 to 3x as `MODES_AR_DESKTOP_HANDHELD.md`; a "slice" slider is better than finger sizes of a few mm. The camera can look at the section from table height, so cut faces face the viewer: orient the block so the map's south wall faces the player at placement.
| Tier | Cutaway |
|---|---|
| Handheld low and AR | terrain 130k tris, walls 1024 x 512, flat outline lines, baked slice at 8 positions, no stencil, no sea transmission | 
| Handheld high / desktop | 2048 x 1024 walls, 16 to 32 slices, live strip re-bake, sea box with depth gradient |
| Desktop max | optional stencil cap for the free-cut mode (all tiers must not need it) |
All TUNING; nothing run on a device. Classic looks to copy (no files used): geologic block diagrams in textbooks, museum relief models (a painted plaster or wood block with a vertical cut and a glass case), volcano cutaway diorama models, and the "ant farm" slab. The sea slab in light blue with a darker base and a sharp black outline is the one thing that makes it read as "a piece cut out of the world".

## 6 Gameplay and world scale
| Topic | Rule | Tag |
|---|---|---|
| Camera | the volcano hides the far side. Orbit camera around the cone (not only pan); a "ghost" button fades the volcano to a wire view; or tap the minimap; a slow auto-orbit in the title view. The player sees the other side by walking, boat, or the orbit. Minimum height of the camera above the cone top so it never clips into it; a far plane of 8 km | TUNING |
| World window | 1.5 km volcano world versus the 512 m used for small islands: 9x the area. Use the volcano world as its own "map type" (not mixed with the archipelago) or as a chunk of a larger archipelago whose other chunks stay at 512 m | TUNING |
| Cost | n=513 over 1536 m: 3 m cells; the Blender/tool path is 5 s (A to C). Barrancos about 15 to 60 m wide need cells under 6 m: 3 m OK. 1025 means 1.5 m cells, better caves and cones, about 4x time | VERIFIED 5 s from `LANDFORM.md`; the rest PLAUSIBLE |
| Landing sites | black sand coves at barranco mouths (barrancos dump sand and gravel), lava delta benches (flat, black, a bit unstable: do not build on the delta for a few years), boulder beaches (a rowboat can land, a keel boat cannot), the one or two sheltered lee coves. Settlements on the lower ash slopes and the flat skirt: fertile ash soil, gentle slope under 8 deg, springs at 0.1 to 0.3 H, wind sheltered on the lee | PLAUSIBLE |
| Fresh water | wells in the lens (3.2); springs at contacts; cloud-drip on the windward forest; fog nets later | PLAUSIBLE |
| Resources | basalt stone, pumice and scoria (light building blocks), obsidian (sharp edges, trade), sulphur (hot vents, stains), fertile ash soil, hot water (hydrothermal). Salt from the shore. Stone from lava flow quarries | PLAUSIBLE |
| Hazards (optional events only) | rare eruption, ash fall, earthquake, delta collapse (USGS: cannot be predicted), steam. They obey `EVOLUTION_TREE.md`: slow visible decline, never sudden death; there are early warning signs on the card (steam, rumble, birds leave, the sea water warms) and always a way back (a visiting skipper, a rest day, a shelter); people counted not tracked; death implied and off-screen; a dial: Guided warns early, Free lets it run. Ash fall: a pause of farming and a rain of grey; afterwards, richer soil | TUNING, tone rule from `EVOLUTION_TREE.md` |
| Sky clock | sun angle on the cut faces and the cone; the lee shadow of the cone is long in the morning and evening; cap cloud forms at the damp times; trade deck builds at night, burns off from the sea side by mid-morning (inversion pattern, `SKY_CLOCK` and `WEATHER_AND_SKY`); tide moves the black sand strip and the wave notch; snow patches by season | TUNING |

## 7 Common mistakes and checklist
Mistakes that make a game volcano look fake:
1. A perfect symmetric cone with no erosion, one slope, one colour.
2. No caldera, no nested cone, no flank cones or rift ridges.
3. No valleys, or valleys that are parallel stripes; or valleys that start at the summit and widen upward.
4. One colour; no altitude belts; no clouds or deck; no dry side versus wet side.
5. A flat ocean floor right at the shore; or an abrupt cliff but no depth in the cutaway.
6. A smooth cone in the interior: layers drawn as horizontal stripes with no dip, equal thickness, no dikes, no offset at the caldera.
7. Magma drawn as a glowing blob; a lava river that runs uphill or ends in a pond; a chamber the size of the island.
8. Lava flows with straight borders, equal width, all going in one direction.
9. A crater at the exact centre of a big caldera, round; a collapse scar that is a perfect circle.
10. Sea block with no depth gradient or no tide line; cut walls lit differently so they look like separate boxes.
Checklist (all should be true):
| Check | Pass |
|---|---|
| Profile | shield skirt 6 to 10 deg, cone 25 to 32 deg, concave rising to steep near the top |
| Features | a caldera wall, a nested cone off centre, at least 12 small cones on 2 or 3 aligned ridges, one collapse scar |
| Valleys | radial barrancos, narrow high, wider and deeper lower, mouths at coves |
| Colour | 4 to 5 belts by altitude, black fresh lava, rust on old, pale ash |
| Water | windward wet, lee dry; deck below the top; clear lee wedge |
| Coast | black sand coves, a lava fan, low black cliffs, one big cliff, steep drop at the shelf |
| Section | strata follow the surface, steeper near the top, dikes cut them, flat caldera fill, offset at ring faults, chamber under the cone, crust at the base, sea pale to dark |
| Outline | thin black outline on each face and the top edge |
| Read | someone looking for 3 seconds can say "volcano on a block" without a label |

## 8 What is faked
| Thing | Faked how |
|---|---|
| Size and slopes | horizontal shrunk 30 to 50x, height kept at 2.5 to 3x; slopes steeper than real |
| Time | a young cone, an old shield and flows live on one island with no real ages; barrancos cut in one erosion pass |
| Rock | 8 to 10 flat colours; no minerals, no real chemistry; dikes are planes |
| Chamber | an ellipsoid; real reservoirs are complex mush columns; depths scaled |
| Lens | the 40 x rule for a sharp interface; the real boundary is a mixing zone and flow matters (USGS) |
| Wind and weather | a deck at a fraction of H; vortex street shortened; no true airflow |
| Cutaway | baked textures; a plinth; the sea is a clear slab; the section is one straight cut |
| Hazards | optional, soft, with warning and a way back |

## 9 Sources (read as extracts only) and could not verify
| Source | Used for | Licence |
|---|---|---|
| USGS Hawaiian Volcano Observatory and USGS pages (Mauna Loa, lava entering ocean, lava deltas, Kilauea storage chapter, hotspot chain, Long Island fresh-salt page) | shield size, chambers, lava delta, hotspot, lens | US federal work, public domain |
| NPS (cinder cones, Hawaii notes) | cinder cone size and angle, shield slope | public domain |
| University of Hawaii at Hilo (littoral cones) | littoral cone | check; facts only |
| Spanish geological survey review 2020, Scientific Reports 2018 (PMC), Oxford sonar abstract | Tenerife collapses and ages | papers; facts only, no text copied; Sci Rep is CC BY (UNVERIFIED) |
| Spanish national parks site, Wikivoyage extract | vegetation belts | site terms unchecked; Wikivoyage CC BY-SA; facts only |
| AEMET Izaña pages, ESA Earth from Space 2026 | inversion, sea of clouds, north cloud | agency pages, reuse terms unchecked; facts only |
| FGDC geologic symbol standard (USGS) | volcanic units contrast, reds | public domain |
| NASA Earth Observatory (in the cloud note) | vortex street | public domain |
Could not verify: island size, sea floor depth and edifice height of the reference island; the laurel belt height and rain-shadow figures; basalt colour in the FGDC table; barranco depth and spacing; cinder cone counts and spacing; the typical caldera to island width ratio; shelf width numbers; wind speed-up factor; the cool-climate tree line; JS speed of `rock()`; iPad frame cost of the cutaway; n=1025 timing; magma chamber size. Hosts that did not resolve: swisseduc.ch, webtenerife.co.uk, pubs.usgs.gov (fetch), en.wikipedia.org. Allowing them in the session network would let a follow-up check numbers.
