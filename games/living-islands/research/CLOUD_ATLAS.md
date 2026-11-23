# Cloud atlas for the sky pass (all ten genera and the special forms)
Do not put real place names into game code, assets or recipes.
Status: research note, Living Islands (branch citylab/cloud-islands), 23 Nov 2026. Companion to `WEATHER_AND_SKY.md` (states, schedule) and `CLOUD_PHYSICS_FOR_VISUALS.md` (how clouds form; low clouds, cumulus, fog). This note fills the gap: high and middle clouds, special forms, front sequence, state-to-cloud map, mistakes, review checklists.

Method and limits, said plainly. Every WebFetch failed: `cloudatlas.wmo.int` and `scijinks.gov` do not resolve in this session (hosts not allowed); `en.wikipedia.org`, `weather.gov`, `metoffice.gov.uk`, `eoas.ubc.ca` were already known blocked. Only WebSearch extracts came back (summaries of those pages). No file was downloaded. Tags: VERIFIED = seen in a search extract of a named source this session; PLAUSIBLE = standard meteorology or optics from memory; UNVERIFIED = a guess or a number I could not check; TUNING = a render starting value to adjust by eye. Place names appear nowhere below except in sources.

## 1 Sources and licences
| Source | Used for | Licence | Tag |
|---|---|---|---|
| WMO International Cloud Atlas, cloudatlas.wmo.int (classification summary, supplementary features, cirrus pages) via extracts; SKYbrary paraphrase of the WMO species definitions | genus/species wording: fibratus, uncinus, spissatus; supplementary features list (arcus, incus, mamma, praecipitatio, pileus, virga) | WMO copyright, facts only, no text copied | VERIFIED (extract) |
| Met Office learning pages: cirrostratus, altocumulus, altocumulus castellanus, arcus/unusual clouds | halo, castellanus as thunder warning, mackerel sky, shelf vs roll cloud, mamma, virga | Crown copyright (OGL v3 for most); facts only | VERIFIED (extract) |
| NOAA JetStream "ten basic clouds"; NWS cloud chart; Penn State METEO 3 "Clouds from bottom to top" | altostratus: sun as through ground glass, no halo, no shadows; nimbostratus: thick, dark, ragged low cloud beneath; high clouds sit near and above 20,000 ft (about 6 km) in mid latitudes | NOAA public domain; Penn State course notes, facts only | VERIFIED (extract) |
| UCAR/UCAR SciEd cirrostratus page; Farmers' Almanac (weak) | 22 degree halo from hexagonal ice crystals; rain usually 12 to 24 h after halo cloud, 6 to 8 h if fast front | UCAR open education; facts only | VERIFIED (extract); rule of thumb only |
| Cloud Appreciation Society altitude pages; colweather altocumulus page; UBC ATSC 113 castellanus page (extract) | castellanus = unstable mid level; undulatus; lenticularis; rhymes | facts only | VERIFIED (extract, amateur sources) |
| NASA noctilucent cloud pages; NERC MST radar page | noctilucent 76 to 85 km, ice below about -120 to -125 C, summer, twilight only | NASA public domain; NERC facts only | VERIFIED (extract) |
| Everything else (heights, brightness ratios, lifetimes, frequencies, recipes) | | | PLAUSIBLE, UNVERIFIED or TUNING as tagged |

## 2 The ten genera at a glance
Heights are metres above sea level for temperate latitudes (task bands: low 0-2000, mid 2000-7000, high 5000-13000; the bands overlap). Over a cool Atlantic sea the real tropopause is about 9 to 11 km, so high cloud is mostly 6000 to 10000 m. Composition: high clouds are ice; mid clouds are mostly supercooled water droplets with ice falling from them; low clouds are water (ice only in deep Cb tops). PLAUSIBLE unless tagged.
| Genus | Band (m) | Composition | Plain look | Signals | Frequency over cool Atlantic sea | Tag |
|---|---|---|---|---|---|---|
| Cirrus (Ci) | 6000-10000 | ice | white fibres, hooks, streaks, silky | fair, or first sign of a front | common all year; most in winter ahead of fronts | VERIFIED (high, near and above ~6 km) |
| Cirrocumulus (Cc) | 6000-9000 | ice, or supercooled water grains briefly | tiny grains and ripples, no grey shading, each element under 1 degree | unstable high air, often with cirrus; rare alone | uncommon; winter and spring | PLAUSIBLE |
| Cirrostratus (Cs) | 6000-9000 | ice | thin milky veil, halo | warm front, rain within about 12 to 24 h | common ahead of every warm front | VERIFIED (extract) |
| Altocumulus (Ac) | 2500-6000 | water, some ice | patches, rolls, grey-white rounded masses 1 to 5 degrees wide | fair; castellanus = unstable, thunder risk | common; summer and autumn mornings | VERIFIED (extract) |
| Altostratus (As) | 2500-6000 | water and ice | grey-blue sheet, sun as through ground glass, no halo, no shadows | warm front 3 to 8 h away | common ahead of fronts | VERIFIED (extract) |
| Nimbostratus (Ns) | 500-5000 (deep) | water and ice | thick dark uniform rain layer; ragged scud below | steady rain | common; winter | VERIFIED (extract) |
| Stratocumulus (Sc) | 500-2000 | water | lumpy grey-white deck with gaps | the commonest sky; drizzle if thick | most common genus; all year, peak winter | VERIFIED (WEATHER_AND_SKY) |
| Stratus (St) | 0-600 | water | featureless grey sheet; lifted fog | drizzle, haar | spring and summer over cold sea; winter on land | VERIFIED (Met Office coastal fog) |
| Cumulus (Cu) | base 300-1500, top to 6000 | water | flat base, cauliflower top | fair (humilis), showers (congestus) | cold air after fronts; weak over cool sea in summer | VERIFIED (see CLOUD_PHYSICS) |
| Cumulonimbus (Cb) | base 500-1000, top 6000-12000 | water below, ice above | tower, anvil, dark base | squall, hail, thunder | cold fronts and showers; autumn and winter most | VERIFIED (cold front = Cb) |

## 3 High clouds
### 3.1 Cirrus (Ci)
| Item | Notes | Tag |
|---|---|---|
| Formation | ice crystals nucleate in cold moist air at 6 to 10 km and fall; wind shear with height drags the falling crystals into trails (fall streaks, "mares' tails") | PLAUSIBLE |
| Species | fibratus: nearly straight or irregularly curved filaments without hooks or tufts. uncinus: comma-shaped, no grey parts, ends in a hook or tuft (head up-wind, tail trailing down-wind and downward). spissatus: dense patches, greyish toward the sun, can hide the sun, often made from the top of a Cb. castellanus/floccus: tufts with turrets, rare | VERIFIED (extract) |
| Look | very thin; bright white, silky; no grey shading except spissatus; edges fibrous and frayed on the trailing side, sharper at the head; scale: a streak is 5 to 30 degrees of sky long, 0.3 to 1 degree wide | PLAUSIBLE |
| Colour | white to pale blue-white by day; no grey base (too thin); at golden hour it stays lit after the sun leaves the ground, going gold, then salmon pink, then grey-violet about 20 to 40 min after sunset; the last cloud lit. Spissatus is grey-white with a pale sunlit rim | PLAUSIBLE |
| Motion and life | drifts at jet-level wind (30 to 60 m/s, so slow-looking only because it is far: angular drift under 1 degree per minute); a head hooks and trails over 10 to 30 min; whole patches last hours. Wind at height is stronger and turns with height, so fibres are not parallel to the sea wind | PLAUSIBLE |
| Weather | uncinus and thickening fibratus ("invading") before a warm front 12 to 36 h away; isolated fibratus in fine weather | PLAUSIBLE |
| Frequency | most days of the year have some; thick scattered cirrus before every front; clear skies in a cold-air outbreak have little | PLAUSIBLE |
| Recipe (dome shader) | 1 plane or dome patch at 8000 m. Noise: fbm stretched 8 to 15:1 along the fibre axis (TUNING 10:1), 2 domain warps of strength 0.3 and 0.15 of cell size across the fibre direction to make curved hooks. Threshold high (coverage 15 to 35 percent), soft smoothstep 0.1. Fibre axis = high wind direction, which is wind10 rotated +30 to +60 degrees (TUNING 45). Add a second high-frequency stretch 30:1 layer at 0.3 weight for fine fibres. No flat base. Alpha max 0.7. Scroll 3x the cloud-deck scroll speed in angle terms but still tiny (TUNING 0.02 of 10 m wind in uv). Uncinus: add one or two hook sprites with a bent quad strip, 3 to 7 per sky. Billboard sprites only for hooks; do not make cirrus from round puffs | TUNING |

### 3.2 Cirrocumulus (Cc) and mackerel sky
| Item | Notes | Tag |
|---|---|---|
| Formation | a thin high layer cooled by small convective cells or by waves, giving tiny elements | PLAUSIBLE |
| Look | grains, ripples, small rounded elements, each under 1 degree across (about the width of a finger at arm's length); white, no shading; often in rows or a honeycomb; holes (lacunosus) possible. Real altitude is high, so patterns look fine-grained and extend across the whole sky | WMO says: no shadowed parts; PLAUSIBLE |
| Mackerel sky | rows of cirrocumulus or altocumulus undulatus (parallel wave bands) that look like fish scales. The Met Office notes numerous parallel bands give the mackerel sky; folk rules: clouds begin to thicken within about 12 h, "not twenty-four hours dry" | VERIFIED (extract), rule of thumb |
| Colour | white by day; pink-gold on every element at golden hour (no grey side); at sunset elements keep a pale lit edge | PLAUSIBLE |
| Motion | elements appear and vanish in a minute or two, so the pattern shimmers; rows stay put relative to the wave | PLAUSIBLE |
| Frequency | uncommon; a few times a month in winter and spring | UNVERIFIED |
| Recipe | dome patch at 7000 m. Cellular noise (worley or sine-sum rows) cell size 0.6 degree, row spacing jitter 15 percent, row direction at about 90 degrees to the high wind (waves are cross-wind). Break regularity: multiply by low-frequency fbm 0.3 to make patchy coverage 20 to 40 percent, rotate each patch by +-8 degrees. Threshold sharp-ish (0.15). Alpha 0.6. Never a fixed uniform grid across the whole sky | TUNING |

### 3.3 Cirrostratus (Cs) and halo
| Item | Notes | Tag |
|---|---|---|
| Formation | broad slow lifting ahead of a warm front spreads a thin ice veil, 6 to 9 km, over 100s of km | PLAUSIBLE |
| Look | smooth milky white or fibrous veil; edges lost; the whole sky turns pale; the sun and moon stay sharp-edged under it (unlike As) and shadows still form | PLAUSIBLE |
| Halo | hexagonal ice crystals bend light most near 22 degrees from the sun: a ring, inner edge reddish and sharply defined, outer edge fuzzy and whiter, sky inside the ring slightly darker. Brighter points on the ring either side of the sun are sundogs (parhelia) at 22 degrees at the sun's height. Halo is visible when the veil is thin; it fades as the veil thickens into As | VERIFIED (22 degrees, hexagonal ice), PLAUSIBLE (detail) |
| Weather | steady rain usually 12 to 24 h later (6 to 8 h if the front is fast); many halos fail to rain; fibrous broken Cs can mean a weak front and only drizzle | VERIFIED (extract), rule of thumb |
| Colour | whitish-blue, covers the sky blue with white; gold/pink at golden hour; at sunset it can glow rose and persists after the lower sky is dark | PLAUSIBLE |
| Frequency | every warm front; most in autumn to spring | PLAUSIBLE |
| Recipe | full-dome layer at 8000 m. Whiten the sky colour: mix(sky, white-pale, v) with v ramping 0 to 0.55 over the pre-front period (TUNING). Noise: 2 octaves stretched 4:1 along the high wind, low contrast (alpha 0.25 to 0.5). Halo: add a ring to the sky shader at angle 22 degrees from sun direction: `ring = smoothstep(21,22,a) * (1 - smoothstep(22,24.5,a))`, tint warm inner (1.0,0.85,0.7), cool outer, multiply by veil thickness, intensity 0.25 (TUNING). Two small bright sundogs at +-22 degrees azimuth only when sun elevation is under 40 degrees, intensity 0.3 (TUNING). Halo only when the veil is thin (v between 0.2 and 0.6) | TUNING |

## 4 Middle clouds
### 4.1 Altocumulus (Ac)
| Item | Notes | Tag |
|---|---|---|
| Formation | gentle lifting or wave motion in a moist mid layer; castellanus: buoyant turrets rising from a common base in an unstable layer | VERIFIED (extract), PLAUSIBLE |
| Species and varieties | stratiformis (sheet of patches, rolls); lenticularis (smooth almond or lens, stationary); castellanus (turrets standing on a shared flat base, like battlements; Met Office: base about 2100 to 5500 m); floccus (small tufts, ragged base, may trail virga); undulatus (parallel rolls); translucidus (thin, sun visible); opacus; lacunosus (net with holes) | VERIFIED (extract), PLAUSIBLE |
| Look | rounded masses or rolls 1 to 5 degrees wide (one to three fingers at arm's length), white with grey shadowed sides and bases, regular but with wandering rows; gaps blue; castellanus: row of turrets taller than wide; lenticularis: smooth sharp-edged lens, often in stacks | PLAUSIBLE |
| Colour | brighter white top, grey-blue shaded base (30 to 60 percent of top); at golden hour the sun-facing side glows gold and the shaded side stays grey-violet, so it has strong shading; at sunset it takes red-orange very late, after low cloud has gone grey | PLAUSIBLE |
| Motion and life | drift at mid wind (15 to 30 m/s); individual elements swell and fade over 10 to 30 min; castellanus turrets rise over 10 to 40 min and can grow into Cb. Lenticularis does not move | PLAUSIBLE |
| Weather | fine spells with warm mornings: castellanus is a morning warning for afternoon storms (Met Office: often a warning of thunderstorms); undulatus: mackerel sky above; lenticularis: wave flow, wind rising; "Ac in morning, storms by evening" rhyme | VERIFIED (extract), rule of thumb |
| Frequency | summer and autumn mornings; castellanus a few days per season over cool sea | UNVERIFIED |
| Recipe | cloud-layer plane at 4000 m, drawn as a perspective-projected plane on the dome. Noise: worley or fbm cells, row-stretched 1.5:1 along rows, row direction cross-wind (rolls) with spacing varying 0.8 to 1.3 x, domain warp 0.4 of cell size, coverage 35 to 65 percent, soft threshold 0.12. Self-shade: base term = 0.45 + 0.55 * dot(normal, sun) from a 1-tap offset along the sun direction. Layer 2 sub-patches at a different rotation (+-12 degrees) and size to prevent grid. Castellanus: a flat-clamped base strip plus 5 to 9 tall turrets as stretched sprites (aspect 1.4:1), shared base y. Lenticularis: 1 to 3 smooth ellipse sprites (aspect 3:1) with no scroll, rim glow. Sprite count: 20 to 40 mid-field, none needed if all noise | TUNING |

### 4.2 Altostratus (As)
| Item | Notes | Tag |
|---|---|---|
| Formation | thickening of Cs ahead of a warm front, or lifting of a moist layer | PLAUSIBLE |
| Look | uniform grey or blue-grey sheet, a few streaks or soft lumps; sun is a bright blurred disc seen as through ground glass; no sharp shadows; no halo | VERIFIED (extract) |
| Colour | grey-blue; lighter around the sun; darker toward the horizon; at golden hour a dull yellow-grey, little colour; at sunset a faint rose glow along the horizon only | PLAUSIBLE |
| Life | thickens over 2 to 6 h into Ns; sun fades to a pale disc then vanishes; light drops to about 30 percent | PLAUSIBLE |
| Weather | rain 3 to 8 h away; virga or light drizzle at its base | PLAUSIBLE |
| Recipe | full-dome layer at 4500 m. Sky colour toward grey-blue, noise 2 octaves stretched 3:1, low contrast alpha 0.6 to 0.85. Sun glow: wide soft disc (radius 3 degrees, no hard edge). Direct sun x0.35, hemisphere x1.0. Shadows softened (penumbra x3) | TUNING |

## 5 Low and vertical genera (summary; detail in CLOUD_PHYSICS section 5)
| Genus/form | Key additions for this note | Recipe numbers | Tag |
|---|---|---|---|
| Nimbostratus | thick dark uniform layer, 0.5 to 5 km deep, base fuzzy and wet-looking, rain streaks; below it a ragged layer of cumulus fractus / stratus fractus (scud): torn grey shreds, 50 to 300 m deep, moving faster than the deck above and in a different direction (wind at low level) | deck: streak noise 5:1 along wind, brightness 0.12 to 0.2. Scud: 30 to 60 small ragged sprites at 150 to 350 m, stretched 2.5:1, grey 0.25, alpha 0.5, moving 1.6 x the deck speed, more shreds in heavy rain; TUNING | VERIFIED (extract: low ragged clouds under Ns), TUNING |
| Cumulus fractus / stratus fractus | broken fragments of Cu or St, ragged, constantly changing, no flat base, no solid top; common under rain, in strong wind, in the cold sector | 15 to 40 sprites, warp strength 0.7, alpha 0.4 to 0.6 | PLAUSIBLE, TUNING |
| Cumulonimbus capillatus incus | congestus whose top glaciates: fibrous, hairy top (capillatus), then a smooth to fibrous flat anvil (incus) spread downwind by the high wind; base dark, rain shaft below | tower 6 to 10 km; anvil is a flat noise sheet stretched 6:1 downwind at the tropopause, soft fibrous edge, bright white top, grey underside | VERIFIED (incus: anvil), PLAUSIBLE |
| Stratus, stratocumulus, cumulus | see CLOUD_PHYSICS | | |

## 6 Supplementary features, accessory clouds, special forms
| Feature | What and where | Look and colour | Recipe | Tag |
|---|---|---|---|---|
| Mammatus | pouches hanging under a Cb anvil (also As, Ac, Cc, Ci) in sinking air | smooth rounded bulges 100 to 500 m, sunlit side bright, hanging in rows; strongest at golden hour, pink and gold on dark grey | quilted underside: sphere-bump normals on the anvil underside, 20 to 60 lumps; only in `storm` just after the front passes and at dusk | VERIFIED (Met Office: pouches under big Cb) |
| Pileus | smooth thin cap above a fast-rising Cu/Cb top | smooth, white, silky, short-lived (minutes) | thin flattened sprite above one tower, fade in 30 s, out in 60 s | VERIFIED (extract) |
| Arcus (shelf, roll) | low wedge-shaped or roll cloud on the leading edge of a Cb outflow; shelf stays attached, roll separate | dark, horizontal, smooth or streaked, rolling slowly; below it a clear gap, a rain shaft behind | stretched flat cylinder bank 2 to 6 km long, base 200 to 400 m; gust front: wind +5 to +10 m/s, temperature drop | VERIFIED (extract), PLAUSIBLE |
| Virga | rain shaft that evaporates before reaching ground (hangs from As, Ac, Cu, Cb) | grey or white wisps, curved, trailing downwind and widening upward; shafts lean 10 to 30 degrees | tapered quad, alpha fades over the lower 60 percent | VERIFIED (Met Office: precipitation that does not reach ground) |
| Praecipitatio | rain that reaches the ground | solid grey streaked curtain, bright sea beside it | rain streak billboard to the sea | VERIFIED (extract) |
| Wave and lenticular | stationary crest of a mountain wave in mid or high air | smooth almond, sharp edge, stacked; hovers; rim pink at golden hour; also on very high ground only | not needed for 200 m islands; far horizon dressing only | PLAUSIBLE |
| Tuba / funnel (note only) | funnel under a Cb base (rare at sea: waterspout) | a rope-shaped condensation tube | do not build now | PLAUSIBLE |
| Noctilucent (rare) | 76 to 85 km, ice, summer twilight only | electric-blue wispy waves low in the north | optional single twilight effect, June and July only, under 10 degrees elevation | VERIFIED (height, season, twilight) |
| Nacreous (rare) | stratospheric, 15 to 25 km, winter high latitudes, pastel iridescent lens clouds lit before dawn or after dusk | mother-of-pearl colours | skip | PLAUSIBLE (not seen in extract) |
| Contrails and aircraft-induced cloud | line cirrus from aircraft engines in cold humid air at 8 to 12 km; can persist and spread into cirrus (cirrus homogenitus) | straight white lines, sharp when young | OFF in our world, see section 9 | PLAUSIBLE (not read this session) |

## 7 Front sequences (one schedule drives all clouds)
### 7.1 Warm front (arrives over about 18 to 30 h, game compressed; front speed 10 to 15 m/s typical)
| Time before rain | Sky | Light | Wind | Cloud recipe change | Tag |
|---|---|---|---|---|---|
| -24 to -12 h | scattered cirrus fibratus/uncinus, tails pointing toward the front side; blue sky | normal, sun x1.0 | light S-SW, backing slightly | cirrus coverage 10 to 35 percent, Cs veil v 0 to 0.2 | PLAUSIBLE |
| -12 to -6 h | cirrus thickens into milky Cs veil; 22 degree halo, maybe sundogs; sun still sharp | sun x0.9, sky whitens, shadows crisp | freshens S-SW, 6 to 9 m/s | veil v 0.2 to 0.6; halo on; fibre thicker | VERIFIED (12 to 24 h rule) |
| -6 to -3 h | Cs becomes As; sun a blurred disc; halo fades; pressure falls; Sc may fill below | sun x0.4, no shadow, ambient grey | S backing, 8 to 11 m/s | As alpha 0 to 0.85, halo off at v 0.65; shadow penumbra up | VERIFIED (extract) |
| -3 to 0 h | As lowers, sun vanishes; virga, drizzle; scud forms | sun x0.15 | S to SSE, gusts | low scud 10 to 30 sprites, drizzle 0.35 | PLAUSIBLE |
| 0 to +4 h (front) | Ns dark deck, steady rain, ragged scud below, visibility 2 to 5 km | sun x0.1 | steady, strongest at the front, then veers to SW | rain 0.65 to 1.0, scud 40 to 60 sprites, deck dark | VERIFIED (veer, rain heaviest on front) |
| +4 to +10 h (warm sector) | low grey Sc or St, drizzle, mist on hills, fog over cold sea; mild | sun x0.2, grey-green | steady SW | deck lifts to 300 to 600 m, drizzle only | PLAUSIBLE |

### 7.2 Cold front (passes over 0.5 to 2 h; behind it 6 to 24 h of showers)
| Time | Sky | Light and temperature | Wind | Cloud recipe | Tag |
|---|---|---|---|---|---|
| -3 to -1 h | warm sector low cloud with castellanus or congestus building on the horizon; the SW horizon dark | sun x0.4, close, still | S-SW steady, may drop | Cu congestus 2 to 4 km tall on the front side | PLAUSIBLE |
| -1 to -0.25 h | line of Cb and towering Cu; a flat dark roll or shelf (arcus) with a clear gap below; distant lightning flash if storm | sun gone, dark green-grey | calm, then gust front +5 to +10 m/s, sharp temperature drop | arcus bank 300 m base, 3 to 5 km wide, rolling | VERIFIED (cold front Cb) |
| -0.25 to +0.5 h | heavy rain (praecipitatio), maybe hail, mammatus under the anvil on the back side of the cell | sun x0.1, dark, cooler | veers to W-NW, gusts 15 to 25 m/s | rain 1.0, slant 25 to 40 degrees | VERIFIED |
| +0.5 to +2 h | rain eases, ragged cumulus fractus and scud, ragged edge of the Cb deck; sky clears from the west | light bursts, brighter, rainbow possible opposite the sun | NW, strong, gusty | edge of deck moves off; patches of blue | VERIFIED |
| +2 to +24 h | cumulus humilis to congestus, clear sky between; showers with Cb and virga; cirrus spissatus from dying anvils; evening clearing | bright, clear, cool, sharp shadows, patchy sun | NW, 8 to 14 m/s, gusts | cumulus 25 to 50 percent, streets if over 10 m/s; one or two showers with shafts | VERIFIED (showers follow) |

## 8 State-to-cloud map for our build
Levels: low (below 2000), mid (2000-7000), high (5000+). All cover and values are TUNING.
| State | High | Mid | Low | Light and colour | Golden hour behaviour |
|---|---|---|---|---|---|
| clear | a few Ci fibratus (10 to 20 percent), no veil | none | none to a few Cu hum | sun x1.0, sky deep blue, glint x1 | Ci turns gold then pink; anti-solar pink band above blue-grey wedge; no low cloud to colour; sea orange glint |
| fair cumulus | Ci 10 to 30 percent | maybe a thin Ac patch 10 to 20 percent | Cu hum/med 25 to 45 percent, flat grey-blue bases | sun x0.9, cloud shadows | cumulus bases orange, tops pink; Ci still lit when Cu go grey; long shadows; pink band opposite |
| overcast | hidden | thin As may show as a lighter patch | Sc/St deck 85 to 100 percent, base 300 to 600 m, paler gaps | sun x0.15 to 0.3, no shadow, grey-blue sky brighter than the sea | no golden light; duller grey-yellow; a thin orange slot at the horizon if the deck has a gap under the sun, else nothing |
| showers | Ci spissatus from dying anvils, scattered | Ac castellanus/floccus occasionally | Cu congestus and a few Cb 40 to 70 percent with dark bases and virga/rain shafts; ragged fractus | sun x0.5 with patches 1.0, bright gaps | strongest colour of all: sunlit towers gold, dark grey bases behind, rain shafts glowing orange, possible rainbow opposite sun, mammatus at dusk |
| rain | hidden | As/Ns top | Ns deck 100 percent, scud below | sun x0.1 to 0.18, no shadow, muted | no colour; slightly warmer grey on the western horizon only if the deck thins |
| fog | hidden | hidden | fog layer 0 to 150 m, St deck 100 to 300 m | sun x0.2, horizon equals fog colour | pale gold glow around the sun, no colour elsewhere; deck seems lit from within |
| storm | shelf (arcus) and anvil edge | mammatus on anvil underside | Cb base low and ragged, scud 100 to 300 m, praecipitatio | sun x0.1, green-grey, flashes | dusk gives dull copper-red underlight on mammatus; mostly dark |
| golden hour | Ci/Cs lit gold and pink last; Cc elements pink | Ac sun side gold, shade side violet-grey | Cu bases orange; very low cloud grey earlier | sun 0 to 10 degrees, 2500 to 3500 K, long shadows, blue fill | see above; pink band appears 10 to 30 min after sunset |
Golden-hour rule (PLAUSIBLE): colour reaches high cloud first and leaves it last, because the sun's rays reach it at greater height after the ground is in shadow. Order of loss: low, then mid, then high. Mid cloud keeps shading; high cloud has no shading.

## 9 Storytelling note (design observation)
This world has no aircraft, so no contrails, no condensation trails and no aircraft-induced cirrus. A real sky over a coast in our latitudes usually carries several straight white lines and long, spreading veils of man-made cirrus on a fair day; ours has none. Its high cloud is only natural, with short, curved, fraying fibres and no straight lines at all. This is a quiet, accurate clue that nobody is up there. Keep it as an absence, never a caption, and never draw a single straight line in the high sky. (The sky also lacks straight satellite or aircraft lights at night; not covered here.) Tag: design observation, PLAUSIBLE; the physics of contrails was not read this session.

## 10 Mistakes specific to high and middle clouds
1. Sprite-puff cirrus: round puffs look like cumulus. Cirrus must be stretched fibres with hooks and no flat base.
2. No fibre direction, or fibre direction equal to the sea wind; it should follow the high wind (turned 30 to 60 degrees from surface wind).
3. Uniform altocumulus grid: perfect repetition across the whole sky; use patchy rows, jitter, size and rotation variation, gaps and coverage noise.
4. No wind shear on tops: Cb anvils must lean and spread downwind; cumulus tops tilt slightly; cirrus hooks trail downwind.
5. Layers that do not parallax: low cloud, mid cloud and high cloud need different scroll rates (high slowest in angle, low fastest) and different directions where the wind turns with height.
6. No depth ordering: high layer drawn before mid, mid before low; far-to-near sort; do not draw cirrus in front of a cumulus.
7. Same cloud brightness at all heights: cirrus never has a grey base; Ac has a grey side; Ns is dark.
8. Halo always on, or always the same: it needs a thin veil, only before the front, and fades as As arrives.
9. Contrails: none in this world (section 9).
10. Altostratus with a sharp sun disc and hard shadows; Cs with a blurred sun. These are swapped.
11. Lenticular clouds that drift with the wind; they stay still.
12. Pure white cirrus at golden hour: it should be gold or pink, the last to lose colour.
13. Cirrus visible through thick Ns; it is hidden.
14. Same density at the horizon as overhead; far layers compress into thin flat strips near the horizon and close together.

## 11 Visual checklist per cloud type (reviewer)
| Type | Check |
|---|---|
| Cirrus | long thin fibres, some hooked; no flat base; no grey; frayed trailing edge; direction different from the sea wind; scrolls slowly; pink-gold late at dusk; covers 10 to 35 percent in fair weather |
| Cirrocumulus / mackerel | tiny elements under 1 degree; patchy cover; rows wandering; no grey shading; elements shimmer; not covering the whole dome in a perfect grid |
| Cirrostratus | milky pale veil, sun still sharp; 22 degree ring faint, red inside, white outside; sundogs only at low sun; thin veil only |
| Altocumulus | patches 1 to 5 degrees; grey shaded sides; rows with jitter; blue gaps; castellanus on a shared flat base; lenticular smooth and still |
| Altostratus | uniform grey-blue, sun a blurred disc, no halo, no shadows; sky darkening toward the horizon |
| Nimbostratus | dark uniform deck, no sun, rain streaks slanted; scud below, faster than the deck, ragged and darker |
| Stratocumulus / stratus / cumulus / Cb | see CLOUD_PHYSICS checklist; add: Cb anvil leans downwind and is fibrous; a shelf or roll is flat and dark with a clear gap below |
| Mammatus / pileus / arcus / virga | mammatus rounded pouches lit on one side and only under anvils; pileus thin, brief, smooth cap above one tower; arcus low horizontal roll at the front of rain; virga tapering, leaning, fading before the sea |
| Whole sky | layers parallax; depth ordering correct; horizon pale and hazy; no straight lines; scroll direction differs by height; colour at golden hour follows high before low |

## 12 Eight most useful rules (also repeated in the report)
1. Cirrus is stretched fibres (8 to 15:1) with warped hooks, never puffs, and has no flat base.
2. Fibre direction follows the high wind, turned about 45 degrees from the surface wind (TUNING).
3. Cirrostratus: milky veil plus a 22 degree halo only while the veil is thin; fade it as altostratus arrives.
4. Altostratus: sun a blurred disc and no halo, no shadows; direct light x0.3 to 0.4.
5. Altocumulus: patchy rows, jittered size and angle, grey shaded side, and castellanus on a shared flat base.
6. Layers need different scroll rates and directions, and correct draw order high to low.
7. Golden hour colours high cloud last and strongest, mid cloud with shading, low cloud first to go grey.
8. Do not draw any straight line in the high sky; it is empty of aircraft.

## 13 What I could not verify
- `cloudatlas.wmo.int`, `scijinks.gov` and the other pages did not open; only search extracts. WMO wording on species is from a paraphrase (SKYbrary) and the Met Office pages; I did not read the WMO atlas text for composition.
- Cirrocumulus composition (ice vs supercooled water): sources disagree (NOAA says mostly ice, NWS says small cumuliform droplets). I wrote "ice, or supercooled water briefly" as PLAUSIBLE.
- The cirrocumulus altitude and size (under 1 degree), cloud lifetimes, frequencies by season, colour ratios, lenticular rarity on small islands, and the contrail physics are from memory (PLAUSIBLE or UNVERIFIED).
- Nacreous cloud details were not in a search extract.
- Halo to rain timing (12 to 24 h, 6 to 8 h fast) is a rule of thumb in several sources; many halos do not rain.
- All numbers in recipes are TUNING.
