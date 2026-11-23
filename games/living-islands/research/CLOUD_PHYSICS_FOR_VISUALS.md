# Cloud physics for visuals (research note)
Do not put real place names into game code, assets or recipes.
Status: research note for Living Islands (branch citylab/cloud-islands), 23 Nov 2026. Companion to `WEATHER_AND_SKY.md` (cloud list, schedule) and `FLOW_TYPES.md`. This note explains HOW clouds and skies work so the render looks correct, then maps it to render parameters.

Method and limits. Search extracts only. Every WebFetch failed: www.weather.gov, eoas.ubc.ca and metoffice.gov.uk do not resolve in this session (hosts not allowed), so no full page was read. Wikipedia and WMO Cloud Atlas pages came back only as search extracts. Nothing downloaded. Tags: VERIFIED = seen in a search extract of a named source; PLAUSIBLE = standard meteorology or optics from memory, consistent with extracts; UNVERIFIED = memory or a design guess; TUNING = a render starting number, not a fact. Facts and ideas only, no text copied.

## 1 Sources and licences
| Source | Used for | Licence | Tag |
|---|---|---|---|
| UBC ATSC 113 pilot notes https://eoas.ubc.ca/courses/atsc113/flying/met_concepts/01-met_concepts/01d-ceilings/zlcl.html (extract) | LCL is about 125 m times dew-point depression | university course notes, copyright UBC, facts only | VERIFIED |
| Wikipedia, Lifting condensation level (extract) | 9.8 K/km dry cooling, dew point falls about 1.8 K/km, gap closes 8 K/km; accurate to about 1 percent | CC BY-SA 4.0 | VERIFIED |
| Romps, LCL paper, citing Lawrence 2005 (extract) | 125 m/K as the best simple value | journal, facts only | VERIFIED |
| EUMETSAT/CIRA cloud streets tutorial https://rammb.cira.colostate.edu/wmovl/vrl/tutorials/satmanu-eumetsat/satmanu/CMs/ClStr/index.htm (extract; page marked under construction) | spacing about 3 times inversion height; streets within a few degrees of the wind; strong cold-air outbreaks; layer rarely over 2 km | educational, facts only | VERIFIED (provisional) |
| Arctic cloud-street study, ACP 25, 9787 (2025) (extract) | boundary-layer wind under about 12 m/s breaks up streets into isotropic cells | CC BY 4.0 | VERIFIED |
| NASA Earth Observatory, Landsat vortex street off Chile https://earthobservatory.nasa.gov/images/625/ and /von-karman-vortices-off-chile-80197/ (extracts) | island about 1.5 km wide, 1.6 km high, in stratocumulus; vortices 100s km long (280 km in one image); air over the island largely cloud-free | NASA, public domain (images normally free to use with credit) | VERIFIED |
| Nauru island-effect studies (ARM / PNNL / OSTI) (extracts) | small island, daytime heating makes an internal boundary layer and a cumulus plume downwind; plume over 100 km; occurs about 11 percent of daylight hours; cloud starts over the lee ocean in the morning then moves upwind | US DOE, public domain | VERIFIED |
| Met Office cumulus page; WMO Cloud Atlas cumulus (extracts) | humilis wider than tall, tens to hundreds of m; congestus taller than wide, can pass 5 km; flat bases | Crown copyright (OGL for most); WMO | VERIFIED |
| Wikipedia / atoptics, Belt of Venus (extracts) | pink band 10 to 20 degrees up opposite the sun, above the dark Earth-shadow wedge; Rayleigh-reddened light backscattered | CC BY-SA 4.0 / atoptics site, facts only | VERIFIED (mechanism), atoptics page quality weak |
| Everything else (optics numbers, heights, lifetimes beyond below) | | | PLAUSIBLE or UNVERIFIED as tagged |

## 2 How clouds form
1. Air rises, the pressure falls, it expands and cools. Dry (unsaturated) air cools about 9.8 K per km. VERIFIED.
2. Air near the surface holds water vapour with a dew point. The dew point falls only about 1.8 K per km as the air rises. VERIFIED. Temperature and dew point close at about 8 K per km.
3. Where they meet, the air is saturated: this is the lifting condensation level (LCL). Vapour condenses on tiny particles (salt, dust, sulphate, "nuclei"), giving droplets of about 10 micrometres. Cloud base is the LCL. PLAUSIBLE (nuclei), VERIFIED (LCL).
4. Rule: LCL (m) about 125 x (temperature minus dew point, in K). A 10 K gap gives a base near 1250 m; a 2 K gap (humid sea air) gives 250 m. VERIFIED. It is a good base for air lifted from the surface; true convective cloud base can sit a little higher (between LCL and the convective condensation level). VERIFIED.
5. Why FLAT BASES: every thermal that starts at the surface carries air with about the same temperature and dew point, so they all saturate at the same height. The base is a level line. Over a cool sea with a small depression it is low and very flat. VERIFIED (WMO: flattening from a low base and a stable layer just above), PLAUSIBLE (reason).
6. Why CAULIFLOWER TOPS: above the base, condensation releases heat, so the cloud air stays warmer than its surroundings and keeps rising in rounded turrets. Each turret is a bubble; the top is a stack of billows, each billow a few tens of metres. Dry air is mixed in at the edge (entrainment), eroding the cloud and making the lumps. PLAUSIBLE.
7. Cloud top is set by stability: where the rising air stops being warmer than its surroundings, the cloud flattens or stops (an inversion lid). PLAUSIBLE.

## 3 Lifting mechanisms: what lifts the air
| Mechanism | How | Cloud result | Dominates over cool Atlantic sea and small islands? | Tag |
|---|---|---|---|---|
| Convection | surface heated warmer than the air above, thermals rise | cumulus, cells, streets | over cool sea in summer: weak; in cold air over warmer sea (autumn, winter, after a cold front): strong, giving showers | PLAUSIBLE |
| Orographic | wind forced up a slope | cap cloud, layered cloud on windward side, clearing and lenticular waves in the lee | only for hills over about 300 m; our 200 m islands barely | PLAUSIBLE |
| Frontal | warm air rides over cold (warm front, long gentle slope) or cold wedge shoves under (cold front, steep) | thick layers (warm front), towering line (cold front) | the main rain maker at sea; sets the big sky pattern | VERIFIED (qualitative, WEATHER_AND_SKY section 4) |
| Convergence | air from different directions meets and is squeezed up (sea-breeze fronts, lines in the lee of islands, troughs) | a line of cloud | important at coasts and behind islands, but small for tiny islands | PLAUSIBLE |
Over open sea the sky is mostly set by the air mass (stability, below) and by fronts, not by the sea surface.

## 4 Stability, inversions, sea temperature
| Idea | Plain words | Cloud result | Tag |
|---|---|---|---|
| Lapse rate | how fast air temperature drops with height. Dry parcel 9.8 K/km; saturated parcel about 4 to 6 K/km (latent heat) | steeper real lapse rate than the parcel gives unstable air; shallower gives stable | PLAUSIBLE |
| Unstable air | parcels keep rising | cumulus growing tall, showers, big gaps of clear sky between | PLAUSIBLE |
| Stable air | parcels sink back | flat layers, fog, haze trapped low | PLAUSIBLE |
| Inversion | a layer where temperature rises with height: a lid | stratocumulus in a flat deck just under it (cloud spreads out as it hits the lid); cumulus flatten and spread under it ("cumulus humilis", flat tops) | PLAUSIBLE; VERIFIED that stratocumulus is among the commonest British Isles clouds (WEATHER_AND_SKY) |
| Cold sea under warm air | surface air cooled, very stable, no thermals | no convection; fog and low stratus form (haar / sea fret) | VERIFIED (Met Office coastal fog, in WEATHER_AND_SKY) |
| Warm sea under cold air | strong heating from below, deep unstable layer | cloud streets, open cells, showers, in cold-air outbreaks; strongest autumn and winter when the sea is still warm | VERIFIED (streets in cold-air outbreaks); PLAUSIBLE (season) |
| Season rule for our game | spring and early summer sea is coldest: fog and flat stratus likely, weak cumulus; autumn sea is warmest: most shower cloud after cold fronts | | PLAUSIBLE |

## 5 Cloud types: formation, size, texture, life, movement, shadow
Heights are above sea level in temperate latitudes. Tags PLAUSIBLE unless marked.
| Type | Formation | Base / top (m) | Size and shape rules | Edge and texture | Life | Tag |
|---|---|---|---|---|---|---|
| Cumulus humilis (fair weather) | thermals under a lid | base 500 to 1500 (over cool sea 300 to 800); depth 100 to 500 | wider than tall, aspect height:width about 0.5 to 1; widths 200 m to 2 km; spacing 2 to 5 times width; WMO: tens to hundreds of m tall | flat base, lumpy white top; growing edge crisp, decaying edge soft and ragged | single cloud 5 to 20 min, a field lasts hours | VERIFIED (size words), UNVERIFIED (life numbers: one weak source gave 5 to 10 min) |
| Cumulus mediocris / congestus | deeper convection | base 600 to 1500, top 3000 to 6000+ | about as tall as wide (mediocris), taller than wide (congestus, chimneys); width 1 to 4 km | crisp cauliflower, shaded sides, dark base | 15 to 60 min; one source says up to an hour | VERIFIED (shape words) |
| Cumulonimbus | congestus with ice top | base 600 to 1000, top 6000 to 10000+ | 5 to 20 km wide, anvil spreads downwind at the top | fuzzy fibrous anvil top, dark ragged base, shaft of rain below | cell 30 to 60 min | PLAUSIBLE |
| Stratocumulus | cloud trapped under an inversion | base 400 to 1500, thickness 200 to 500 | sheet; blobs 1 to 5 km (rolls or cells) with lighter gaps; cell width about 10 to 30 times depth | soft lumpy, grey base, whiter tops, thin breaks | hours | PLAUSIBLE |
| Stratus / sea fog lifted | cooled air, no lift | base 0 to 500, thickness 100 to 400 | featureless sheet | uniform grey, smooth, soft top | hours | PLAUSIBLE |
| Nimbostratus | thick frontal layer | 300 to 3000+ | the whole sky | dark, uniform, streaked with rain | hours | PLAUSIBLE |
| Altostratus | thin front-ahead layer | 2000 to 6000 | the whole sky | watery sun disc, no halo structure | hours | PLAUSIBLE |
| Altocumulus ("mackerel sky") | wavy layer in middle air | 2000 to 6000 | small rounded patches 1 to 5 degrees wide in rows | regular rippled pattern, lit on one side, grey on the other | hours | PLAUSIBLE |
| Cirrus | ice crystals falling and sheared | 6000 to 12000 | streaks, long hooks; fall streaks hang under the head | fibrous, silky, comma-like, bright white to pink at sunset | hours | PLAUSIBLE |
| Cirrostratus | thin high veil | 6000+ | whole sky | milky, gives halo around sun | hours | PLAUSIBLE |
| Lenticular | stationary wave crest downwind of a hill | 2000 to 6000 | smooth lens or stack of plates, 1 to 5 km | very smooth, sharp edge, does not move with the wind | hours, stationary | PLAUSIBLE |
| Cap cloud / banner | air forced up over a summit | at the summit | hugs the hilltop, trails downwind | smooth, ragged lee edge | as long as the wind and humidity hold | PLAUSIBLE |

Edge rule. A growing cumulus has a crisp, bright, sharply outlined top (updraught pushes cloud into clear air). A dying cloud has soft, ragged, thinning edges, a washed-out grey mass, and loses its flat base first. A render with all clouds crisp looks like clip art; mix both states (60 percent growing, 30 percent mature, 10 percent decaying is a TUNING start).

Movement. Clouds drift with the wind at their own height, not the surface wind. Wind at 1 km is about 1.5 to 2 times the 10 m wind over sea; at 6 km it is 3 to 5 times. PLAUSIBLE. Shear (wind changing with height) tilts tall cloud tops downwind and stretches anvils and cirrus into hooks. PLAUSIBLE. Individual cumulus also grow and dissolve while moving, so the pattern shifts: edges form on the upwind side, erode on the downwind side. Lenticulars and cap clouds are the exception: they stay put while air flows through.

Cloud streets and rolls. In cold air over a warmer sea, boundary-layer rolls line up with the wind (within a few degrees). VERIFIED. Streets are spaced about 3 times the inversion (convective-layer) height. VERIFIED (one source; the owner's "2 to 3" is plausible, 3 is the number with a source). For a 1 km layer streets are 2 to 3 km apart and run for tens of km. Layer rarely over 2 km. VERIFIED. Streets break into disordered cells when boundary-layer wind is under about 12 m/s (one Arctic study; not universal). VERIFIED (one study), so in light wind use random cumulus, not streets.

Shadows on the sea. A cloud shadow is the same shape as its base, displaced along the sun ray. Shadow offset on the sea = base height / tan(sun elevation). At sun elevation 30 degrees and base 800 m the shadow lies about 1.4 km from the point below the cloud, away from the sun. PLAUSIBLE (geometry). Shadow speed equals cloud speed (the wind at cloud height, 5 to 20 m/s, see WEATHER_AND_SKY section 7 for the game slowdown). The shadow edge is soft because the sun is a disc of 0.53 degrees: penumbra width about 0.0093 x distance (cloud base height / sin elevation). At 800 m base, 30 degrees, the penumbra is about 15 m, plus the cloud's own fuzzy edge: shadows are always softer than the cloud that makes them, and softer for higher clouds. PLAUSIBLE (geometry). Shadows on water look bluer and darker: in shadow the sea gets only sky light (blue), not the direct sun (warm white). A sunlit patch next to a shaded patch is 3 to 10 times brighter on a fair day (direct sun is about 80 to 90 percent of clear-sky ground light). PLAUSIBLE. Under thick cloud the shadow disappears: light is diffuse everywhere.

## 6 Island effects (the game's most important section)
| Effect | What happens | Scale rule | Tag |
|---|---|---|---|
| Daytime heating cloud | land warms faster than sea; thermals; a cumulus appears over or just downwind of the island in the afternoon | needs sun, a humid layer, and a not-too-cool sea. Nauru (small flat island) makes a plume hundreds of km long, but only about 11 percent of daylight hours; the cloud begins in the morning over the lee ocean, then moves upwind over the island as heating grows | VERIFIED |
| Orographic cloud | wind rises up hills, cools, cloud on the windward side and summit | needs high ground, 300 m or more to matter at sea; clouds clear on the lee side (air sinking, warming) | PLAUSIBLE |
| Wake and lee clearing | air flowing over or round an island sinks and warms in the lee: a gap in cloud | for a tall island in a cloud deck the air above the island is largely cloud free (NASA, island 1.5 km wide, 1.6 km high) | VERIFIED |
| Karman vortex street | tall island in a stable layer under an inversion makes alternating clockwise and counterclockwise eddies that shed downwind; cloud outlines them as a double row of spirals | only for TALL islands piercing the stable layer (about 1.6 km high in the NASA case, 100s of km long streets). Not for 200 m islands | VERIFIED |
| Lee convergence line | air streams split round an island and rejoin downwind; the joining line forces air up | thin cloud line in the lee, length 5 to 10 times island width | PLAUSIBLE |
| Sea-breeze front | on warm sunny days air flows from sea to land, meeting the synoptic wind; cloud line along the convergence; clear strip right at the coast where sea air sinks | needs a big warm land mass; weak on a tiny island | PLAUSIBLE |
| Coastal clear strip | sinking air at the coast edge | a few km wide at a big coast; invisible on a small island | PLAUSIBLE |
| Cloud bank offshore | stratocumulus or stratus sitting low on the horizon over cold sea; edge sharp | frequent in spring and summer; grey wall, flat base, flat top | PLAUSIBLE |
| Sea fog / haar | warm moist air over a colder sea cools to its dew point; fog rolls onshore; burns off when sun warms land or wind rises | forms over the sea first, thickest in a 100 to 300 m layer; lifts into a stratus deck, then breaks up | VERIFIED (mechanism, Met Office), PLAUSIBLE (thickness) |

HONEST RULES FOR TINY FLAT ISLANDS (a few tens of m to 200 m high, under about 1 km wide):
1. They do NOT make their own cloud in most weather. The cloud pattern over them is the same as the pattern over the open sea beside them. Even Nauru-type effects need a larger heated area and the right humidity, and happen about one daylight hour in nine. Never put a permanent cloud on a small island.
2. Small chance (TUNING: 10 percent of fair afternoons) of one small cumulus just downwind of the biggest island, base the same as the other clouds, with its shadow reaching the island.
3. A 200 m hill can hold a thin cap cloud only when the air is nearly saturated: in drizzle, fog and warm-sector weather the summit disappears into the cloud base (cloud base below 200 m). That is the main believable island-cloud interaction. In the `fog` and `rain` states, lower the base to 150 to 300 m so tops are lost.
4. Wind wake: no cloud effect. The visible effect is on the sea: calm, smooth lee patch with a dark wind shadow (see FLOW_TYPES lee eddy and slicks).
5. No Karman cloud streets at our scale. If a decorative one is wanted, only as a far-off distant island on the horizon, tall (over 1 km), with cloud-deck streets: tag as horizon dressing.
6. Sea-breeze clear strip and coast cloud line: off by default, only for the big landmass if one exists.
7. Fog: forms over the sea first, drifts onto islands from the windward side, thickest low down, islands poke up out of the top of a thin fog if the fog is under their height. Burns off from the island centre (warmest) and the sky side first.

## 7 Optics: why it looks the way it does
| Effect | Physics | Rule for the render | Tag |
|---|---|---|---|
| Grey bases, white tops | cloud droplets scatter light many times; the light that reaches the underside has lost much of its energy going through hundreds of metres of cloud; the top gets direct sun | base brightness about 25 to 50 percent of the top for a fair cumulus; thicker cloud, darker base; a cumulonimbus base can be near black-grey (10 to 20 percent) | PLAUSIBLE |
| Thin cloud is white and see-through; thick cloud is grey and opaque | optical depth: optical depth about 1 is thin, about 10 to 30 is thick enough to hide the sun | thin edges: bright and translucent; centre of a thick cloud: darker | PLAUSIBLE |
| Silver lining | sun just behind a cloud edge; thin edge forward scatters strongly (Mie scattering is mostly forward) | bright rim only on the sunward edge where cloud is thin | PLAUSIBLE |
| Backlit clouds | looking toward the sun: body dark grey, bright rim, a glowing hole where the sun is | add a forward-scatter term strong at angles under about 30 degrees to the sun | PLAUSIBLE |
| Cloud colour in the sunset | clouds are lit by the already-reddened sun, so they glow orange to pink on undersides; high cloud (cirrus) stays lit longest, low cloud goes grey first | colour the cloud light by the direct light colour, not white | PLAUSIBLE |
| Sky blue | Rayleigh scattering, much stronger for blue (about wavelength to the minus 4) | zenith deeper blue, horizon paler | PLAUSIBLE |
| Sunset and sunrise reds | the sun's path through air is much longer, blue is scattered away, the direct light turns orange to red | direct sun colour temperature falls from about 5800 K to about 2000 to 3500 K at 0 to 5 degrees | PLAUSIBLE |
| Anti-solar sky | pink band opposite the sun, 10 to 20 degrees up, above a darker blue-grey wedge of Earth's shadow (Belt of Venus) | pink band from reddened light backscattered; blue-grey below it near the horizon; appears 10 to 30 min after sunset or before sunrise | VERIFIED |
| Crepuscular (god) rays | gaps in the cloud let narrow beams light haze or the air; beams look like they spread from the sun (perspective) | need: low-ish sun (under about 40 degrees), clouds with gaps in front of the sun, hazy damp air. Strongest at 5 to 25 degrees | PLAUSIBLE |
| Virga and rain shafts | rain below a cloud base, grey because rain is lit by scattered light and dims what is behind it; lean downwind because the wind at cloud height is faster than the wind near the surface so the rain is carried | lean angle for a shaft: tan(angle) about 0.1 to 0.3 for light shear (about 6 to 17 degrees), up to 30 degrees in a strong squall; virga: tapering, fading before the sea | PLAUSIBLE |
| Horizon haze (aerial perspective) | scattering and absorption between you and a far object; it adds sky colour and removes contrast | distant things go lighter, bluer (in clean air) or greyer (in humid air), lower contrast; haze is thickest at the horizon | PLAUSIBLE |
| Overcast | the sun's light is spread over the whole sky, shadows disappear, contrast drops, colours go grey; the sea looks dull grey-green | sun intensity down by about 80 to 95 percent, hemisphere light dominant, saturation x0.7 | PLAUSIBLE |
| Glint on water | specular reflection of the sun and sky; strongest in a streak toward the sun; under cloud it breaks into patches when the sun is in a gap, and disappears under thick cloud; the sea also reflects the sky colour (blue, grey) more at low viewing angles (Fresnel) | glitter x1 in clear, x0.3 in broken cloud only where the sun is lit, 0 in overcast and rain | PLAUSIBLE |

Numbers for colour and brightness (PLAUSIBLE unless marked; rounded, from memory of standard values).
| Quantity | Value |
|---|---|
| Direct sun correlated colour temperature at noon | about 5500 to 5800 K |
| Sun at 10 degrees | about 4500 to 5000 K; at 5 degrees about 3500 K; at 0 about 2000 to 2500 K |
| Clear blue sky | about 10000 to 20000 K (very blue) |
| Overcast sky | about 6500 to 7500 K |
| Noon sunlit surface | about 100000 lux (clear day); overcast about 10000 to 25000 lux; heavy storm cloud about 1000 to 5000 lux |
| Sun/sky ratio on a clear day | direct about 85 percent, sky fill about 15 percent (shadows blue and about 6 times darker) |
| Sunset (sun at the horizon) | about 400 lux, rapidly dropping |
| Twilight | civil twilight (sun 0 to minus 6) about 3 to 400 lux |

## 8 Mapping to render parameters
All numbers are TUNING starting points unless said otherwise. Sea 200 m diorama: world heights can be compressed, but keep ratios: base height / cloud width as in the table. Wind W = 10 m wind from the weather state; cloud scroll = k x W with k = 0.5 (matches WEATHER_AND_SKY section 7).
| State | Cloud base (m) | Thickness (m) | Cover | Noise recipe | Scroll | Shadow softness | Sun intensity, colour | Hemisphere/sky | Fog | Haze | Rain | Sea and glint |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| clear | 1200 (few cirrus 8000) | thin | 0 to 10 percent | sparse low-frequency fbm threshold high; cirrus: streaks, stretch noise 8:1 along the wind | 0.5 W | hard | 1.0, 5600 K warm white | deep blue top, pale blue horizon, fill 0.35 | exp2 0.0003 | light, blue | 0 | glint x1.0, sea blue-green, saturation 1.0 |
| fair cumulus | 700 to 1000 | 200 to 400 | 25 to 45 percent | low-frequency domain-warped fbm (1 to 2 warps), flat-base clamp (soft threshold on height below base: cut the bottom at base height, keep top billowy; add 2 to 3 octaves of high-frequency erosion at the edges), cell size 500 to 1500 m, spacing 2 to 4 x width | 0.5 W | medium-soft (penumbra 15 to 30 m scaled) | 0.9 to 1.0, 5600 K | blue, slightly paler, fill 0.4 | 0.0003 | light | 0 | glint x0.8 patchy; sea alternates sunlit and bluer shadow patches |
| cloud streets (after a cold front, W above about 10 m/s) | 600 to 900 | 300 to 600 | 40 to 60 percent | same, but stretch noise 6:1 along the wind, spacing = 3 x layer depth | 0.5 W | medium | 0.85, 5600 K | blue, grey patches | 0.0004 | light | showers possible | glint x0.7 |
| overcast | 300 to 600 | 300 to 500 | 85 to 100 percent | layered noise stretched 3:1 to 5:1, 2 octaves, soft lumps 1 to 3 km, light lighter gaps; base darker than top | 0.4 W | very soft (no clear shadow) | 0.15 to 0.3, 7000 K cool-neutral | grey-blue, fill 0.6 (brighter than the sun) | 0.0006 | medium grey | 0 | glint 0 to x0.1, sea grey-green, saturation x0.7, contrast x0.85 |
| showers | 500 to 800 | 800 to 3000 (towers) | 40 to 70 percent | cumulus recipe with a taller vertical scale and dark bases; rain shafts under some cells | 0.6 W | medium | 0.5 average, patches of sun 1.0 | blue gaps, grey elsewhere | 0.001, 0.003 inside shafts | medium | 0.35 to 0.65, slant 10 to 25 degrees downwind | glint x0.4 in sun patches; dark under shafts |
| rain | 200 to 500 | 1000+ | 100 percent | dark uniform deck, streaky noise stretched along the wind | 0.5 W | none | 0.1 to 0.18 | dark grey, fill 0.45 | 0.002 | strong | 0.65 to 1.0, slant 10 to 20 degrees | glint 0, sea dull, dimpled, saturation x0.6 |
| fog | 0 to 100 (fog layer); deck above at 100 to 300 | 100 to 300 | 100 percent | none; use exp2 fog with a height falloff (denser low) | 0.2 W (light wind) | none | 0.15 to 0.25, 6500 K | pale grey-white, horizon matches fog | 0.0055 (WEATHER_AND_SKY) | very strong | 0 | glint 0, sea pale grey, contrast x0.6; distant islands fade to fog colour |
| storm | 300 to 600 | 2000+ | 100 percent | dark, ragged, low shelf and scud: add high-frequency tearing noise below the base; sudden brightening for lightning | 1.0 W | none | 0.1, cool grey-green | dark slate, fill 0.35 | 0.003 | strong | 1.0, slant 25 to 40 degrees | glint 0, white foam streaks, sea dark grey-green |
| golden hour | 700 to 1000 (cumulus) plus cirrus 8000 | thin | 30 to 60 percent | cumulus recipe; cloud undersides lit orange, tops pink | 0.5 W | soft, long | 0.7, 2500 to 3500 K orange | blue top, orange-yellow near the sun, pink-lilac anti-solar band | 0.0004 | warm, gold toward the sun | 0 | long glint path x1.5 toward the sun, sea reflects orange and deep blue |

Sizing and perspective rules for the render. Cloud base is one flat plane. Cumulus width W_c about 2 to 4 times its depth. At the horizon, distant clouds must be compressed: projected onto a flat layer, apparent width falls with the sine of the elevation angle, so clouds near the horizon are thin flattened strips, closely packed, with the base visible as a line. Aerial perspective: blend cloud colour toward the horizon haze colour with distance. A sky dome drawing clouds the same size everywhere is the biggest tell.

## 9 Common mistakes that make skies fake
1. Uniform fluffy sprites, all the same size and brightness. Real fields have a size spread (many small, few large), spacing set by the layer depth.
2. No flat base. Every cumulus must be cut at one level; the base is darker and flat.
3. Clouds the same apparent size at all distances. Perspective must shrink and flatten them toward the horizon.
4. No perspective compression: a plane of clouds that does not converge at the horizon.
5. Shadows that do not move with the cloud, or shadows that sit directly under the cloud ignoring the sun offset.
6. No horizon haze: a hard dark line where the sea meets the sky. The horizon is the brightest, palest part of the sky and the sea fades into it.
7. Clouds lit from the wrong side, or all lit from above: the sunward side is bright, the far side grey, the base grey-blue.
8. Pure white clouds (255). Even the top of a cloud is about 90 to 95 percent; bases grey-blue.
9. Too-saturated sky: real sky is a pale blue toward the horizon, not uniform deep blue; cloud colours are warm only when the sun is low.
10. Same cloud look in every weather: overcast should have no hard shadows and a brighter sky than sun.
11. Rain falling vertically: shafts and streaks must slant with the wind; rain must come from a cloud with a dark base above it.
12. Cloud scroll speed not matched to the sea wave direction or the wind arrow.
13. Cloud edges all crisp, or all blurry; mix growing and decaying.
14. A cloud sitting over a small island all the time, or clouds that circle it.

## 10 Visual checklist (judge a render)
| State | Check |
|---|---|
| clear | Sky darkens from pale horizon to deeper blue overhead; horizon bright and pale; sun disc glare with warm white; few high streaks; sea blue-green with a clear glint path; shadows sharp and short, blue-tinted |
| fair | Clouds have one flat dark-grey base level; tops billowy and white-ish; many small, few large; sizes shrink toward horizon; sunlit and shadowed patches on the sea move together with the clouds; no clouds exactly over every island |
| overcast | No sun disc and no hard shadow; sky brighter than the sea; lumpy grey layer with paler gaps; sea grey-green and low contrast; no glint |
| showers | Dark bases, some towers; slanted grey shafts under a few clouds, with bright sea patches next to them; fresh gusty look; a gap of sun with rim light on clouds |
| rain | Uniform dark deck; slanted streaks consistent with the wind; sea dimpled and dull; strong haze, reduced distance |
| fog | Horizon gone; islands fade by distance into fog colour; contrast low; light direction vague; no cloud structure |
| storm | Low ragged dark cloud, scud below it; white streaked sea; green-grey tint; only brief flash lighting |
| golden hour | Sun orange and low, long soft shadows with blue fill; cloud undersides orange or pink, tops brighter; long glint path; opposite sky pink over a blue-grey band; horizon haze warm toward the sun |
| any | Do shadows move with clouds at the same speed and in the same direction? Does the cloud scroll match the wind? Do bases sit at one height? Is the horizon hazy, not hard? Are clouds smaller and flatter near the horizon? |

## 11 What I could not verify
- Full pages for NWS JetStream, Met Office, UBC, WMO Cloud Atlas could not be opened (hosts not allowed). Only search extracts.
- Cumulus lifetimes: one weak source gave 5 to 10 min (humilis) and 15 to 20 min (congestus); another says congestus up to an hour. The owner's 10 to 60 min is a PLAUSIBLE range, not confirmed.
- Streets spacing "2 to 3 times": only "about 3 times the inversion height" was found.
- No source found for a minimum island size for island cloud; the "tiny islands do not make their own cloud" rule rests on Nauru statistics (11 percent of daylight hours for a larger flat island) and physics, so treat as PLAUSIBLE.
- Inversion link to Karman streets was in the NASA case (stratocumulus deck) but not stated as a requirement.
- Colour temperatures, lux, base/top ratios, penumbra geometry, shear slant angles are from memory (PLAUSIBLE).
- All render parameters in section 8 are TUNING.
