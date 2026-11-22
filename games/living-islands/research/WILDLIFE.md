# Wildlife of a cool Atlantic island coast (research note and rule set)
Do not put real place names into game code, assets or recipes.
Status: research note for Living Islands (branch citylab/cloud-islands), 22 Nov 2026. Serves the owner's Wildlife decision in `EVOLUTION_TREE.md`. Companions: `FLOW_TYPES.md`, `SEABED_AND_ISLAND_LAYOUT.md`, `REAL_REFERENCE_PLACES.md`.
Method and limits: read-only web search extracts only; no pages downloaded. Wikipedia and several other hosts were not used for fetching, so every figure below comes from a search-result extract or my own knowledge. Tags: VERIFIED = seen in a named extract; PLAUSIBLE = standard knowledge or one secondary source; UNVERIFIED = memory, or a game TUNING value. Facts and ideas only, no text copied. Animals are counted as numbers, never tracked.
Licences (as far as I can tell, not checked on each footer): NatureScot, Scottish Government, JNCC, Marine Scotland pages are usually Open Government Licence (PLAUSIBLE); SMRU/SCOS reports are (c) University of St Andrews, read only, UNVERIFIED terms; MarLIN pages UNVERIFIED terms; MCS and RSPB pages are (c) the charities, read only; Wikipedia CC BY-SA 4.0; US NPS pages public domain.

## 0 One-page summary
1. Almost everything on this coast follows four things: where hard rock and sand are, what is exposed to waves, the tide clock, and where fast water meets slow (fronts, races).
2. Seals use rocks that dry at low tide. Seabirds need cliffs, skerry tops and turf for burrows, with fish within reach. Otters need rocky shore with kelp, with fresh water and a holt near. Big visitors (basking shark, minke, dolphins, leatherback) come in summer to feed on plankton, small fish and jellyfish gathered by fronts.
3. Counts depend on three levers the player can touch: disturbance (boats, building, dogs), food (fish shoals, which depend on temperature, sand and fishing) and storms. All three are easy to model as numbers.
4. Leatherback turtle: a real summer feeder here (June to October, peak August), never nesting here. It is a good seed for a rare legend.

## 1 Seals (grey and common)
| Fact | Value | Conf. | Source |
|---|---|---|---|
| Grey seal pupping, Scotland | Sept to Dec (some colonies mid-Sept to end Nov; Nov and Dec most sensitive at one east coast site) | VERIFIED | Sea Watch code https://www.seawatchfoundation.org.uk/wp-content/uploads/2021/04/Marine-Code-of-Conduct_website.pdf ; Shetland Council https://www.shetland.gov.uk/blog/shetlandoutdoors/post/1088/seal-haul-outs- ; NatureScot https://www.nature.scot/help-forvie-seal-pups-season |
| Grey seal pups stay on land the first weeks, so are counted on beaches and rocks | yes | VERIFIED | SCOS https://www.smru.st-andrews.ac.uk/files/2016/08/SCOS-2015.pdf |
| Common (harbour) seal pupping and moult | pups June to July, moult August (then they haul out most) | VERIFIED | SCOS reports (same site, 2004 to 2021 editions) |
| Common seals haul out in a pattern often tied to the tide | yes | VERIFIED qualitative | SCOS 2015 |
| Outer Hebrides grey pups, 2014 | about 14,300 (main colony: a group of low islands) | VERIFIED | SCOS 2015 extract |
| UK common seal total, 2016 to 2023 surveys | about 37,000 (CI 30,000 to 49,000), down from earlier estimates | VERIFIED | SCOS 2025 https://www.smru.st-andrews.ac.uk/files/2026/02/SCOS-2025.pdf |
| Disturbance (law) | harassing a seal at a haul-out is an offence in Scotland | VERIFIED | Marine (Scotland) Act 2010 s117, https://www.gov.scot/publications/guidance-harassment-at-seal-haul-out-sites/ |
| Safe watching distance | 100 m minimum (a code); a secondary study notes flushing at more than 200 m for harbour seals in pupping season | VERIFIED code, PLAUSIBLE study | Sea Watch code; storymap https://storymaps.arcgis.com/stories/8f4efd690e644aa2a2ab7262ce5f129f |
| Haul-out tide height, hours exposed | not found; seals use rocks and banks that dry at low water | UNVERIFIED (TUNING) | none |
Behaviour: grey seals breed on remote rocky or sandy islands, often a few hundred to thousands of pups at big colonies; common seals prefer sheltered sandbanks, skerries and bay rocks (PLAUSIBLE).
Group sizes to use (counted): small haul-out 5 to 30, medium 30 to 150, breeding colony 50 to 1,500 pups in a season (PLAUSIBLE design span).
Help or harm: keep boats, dogs and building 100 to 200 m away in pupping season; mark a rock as a seal rock; building a slip or path there empties it. Hopeful tone: the seals come back the next season when left alone.
RULE seal_haulout (seeded):
- Candidate = a rock, skerry or bar with a flat top, its top above mean low water and under water at spring high (it dries and floods), within 100 m of water deeper than 3 m.
- Capacity = area_m2 / 4 (about 4 m2 per seal, TUNING), capped at 300.
- Present when tide level is below that rock's covering height; so counts rise as the tide drops. Common seals use sheltered ones, grey seals use exposed or remote ones.
- Season: common seals peak Aug, pup Jun to Jul; grey seals peak ashore Sep to Dec (pups) and Feb to Mar (some come back to moult, UNVERIFIED).
- Disturbance D (0 to 1) from nearest boat lane or building within 150 m: count = capacity * season * (1 - 0.8 * D). If D stays high for 2 seasons the site drops to 20 percent; after 2 quiet seasons it recovers to 60 percent (TUNING).
- Storm: autumn gale in grey pupping season removes 10 to 25 percent of pups at low sites (PLAUSIBLE: pups wash off low rocks; no number verified).

## 2 Seabirds
| Species | Nest site | Breeding months (UK) | Notes | Conf. |
|---|---|---|---|---|
| Fulmar | cliff ledges, also walls and slopes | about Mar to Sep (UNVERIFIED) | little response to boats | PLAUSIBLE; boat tolerance VERIFIED, https://www.nature.scot/doc/disturbance-distances-selected-scottish-bird-species-naturescot-guidance |
| Gannet | flat tops of sea stacks and island tops, dense | May to Sep | grew about 40 percent in Scotland, hard hit by bird flu | VERIFIED (JNCC window; STV and RSPB for trend) |
| Puffin | burrows in turf on grassy slopes above cliffs and on skerries | arrive spring, leave in August | down at least 21 percent in Scotland | VERIFIED trend (RSPB https://www.rspb.org.uk/media-centre/scotlands-seabirds-emergency); dates PLAUSIBLE |
| Guillemot | bare cliff ledges, packed | Mar to Jul | can be disturbed by boats at hundreds of metres | VERIFIED (RSPB guide; NatureScot report) |
| Razorbill | cracks and ledges, boulders at cliff foot | about Apr to Jul | like guillemot | PLAUSIBLE |
| Kittiwake | small ledges on cliffs, buildings | Feb to Aug | very dependent on sandeels, declining | VERIFIED (RSPB guide; sandeel review https://www.gov.scot/publications/sandeel-consultation-review-scientific-evidence/pages/4) |
| Terns (Arctic, common) | bare shingle, sand, low skerries, on the ground | about May to Aug (UNVERIFIED) | fly in from far south, easily driven off by walkers and gulls | PLAUSIBLE |
| Gulls (herring, great black-backed) | rock tops, roofs, grass | Apr to Aug | take eggs and chicks from others | PLAUSIBLE |
| Shag | rocky ledges, sea caves, boulder slopes | about Feb to Aug (UNVERIFIED), resident | dives, can take sandeels from the bed | VERIFIED feeding (sandeel review) |
Numbers and causes:
- Scotland 2015 to 2021: 14 of 20 breeding species fell, almost two thirds, by 11 to 79 percent. Causes named: predation, bad weather, food shortage. VERIFIED (RSPB, RTE https://www.rte.ie/news/ireland/2023/1116/1416859-bird-survey).
- Sandeels are about 75 percent of the diet of shags, kittiwakes and puffins at one colony (1991 to 2011). Kittiwake fledging at colonies near a sandeel fishery fell from 52 to 23 percent. VERIFIED (same Scottish Government review). Guillemots can switch to sprat and small herring; kittiwakes cannot as well.
- Colony sizes for design (counted): small 20 to 200 pairs, medium 200 to 2,000, large 2,000 to 20,000, very large gannet stack 5,000+ (PLAUSIBLE design span, UNVERIFIED for exact real values).
- Storms: a late-spring or early-summer gale at the ledge or low-skerry colony causes chick and egg loss (PLAUSIBLE; no figure read). A big winter storm can wreck auks at sea (PLAUSIBLE).
- Disturbance: auks disturbed by boats at hundreds of metres (VERIFIED, NatureScot); a Welsh source says keep 50 m from cliffs (PLAUSIBLE, not Scottish). Use the larger value, as NatureScot advises.
Help or harm: keep landing and paths away in the nesting months, keep dogs off, keep fishing for small fish moderate, keep rats and cats off (invasive predators, PLAUSIBLE). Hopeful tone: a quiet skerry fills up again over a few seasons.
RULE seabird_colony (seeded):
- Sites: cliff ledge length (m) for guillemot, razorbill, kittiwake, fulmar, shag; flat stack or skerry top for gannet, gull, tern (tern needs bare shingle and no ground predator); turf with soil at least 0.3 m deep on a cliff top or skerry for puffin burrows (no rat).
- Pairs = site_size_m * density (guillemot 8 pairs per m of ledge, kittiwake 2 per m, TUNING; puffin 0.15 per m2 of turf, TUNING) * food * (1 - 0.7 * D) * storm.
- Season window per species from the table; outside it the count is 0 on screen (birds at sea).
- food = 0.5 to 1.2 from local fish shoal index (section 6) and sea warmth: warm spring cuts sandeel and kittiwake food (PLAUSIBLE direction).
- storm = 1 normally; in a spring or early-summer storm year, 0.6 to 0.9 on low and exposed ledges (TUNING).
- D is the nearest building, boat lane or walker path within 200 m (500 m for auks and terns by boat).
- Recovery: +15 percent a season if D and storm are low (TUNING).

## 3 Otters
| Fact | Value | Conf. | Source |
|---|---|---|---|
| Share of Scottish otters living on the coast | perhaps half or more, feeding almost wholly in the sea | VERIFIED | https://www.nature.scot/node/1939319 |
| Shore length used by one coastal otter (island example) | about 4 to 5 km | VERIFIED | BBC Wildlife extract; Conroy and Kruuk, Oryx 1995 |
| Holts per territory, spacing | several; about 1.1 km apart in one sea loch survey (12 used holts in 32 km) | VERIFIED | Macdonald and Mason, Acta Theriologica |
| Feeding place | in the sea within about 150 m of shore | VERIFIED | Durham thesis https://etheses.durham.ac.uk/id/eprint/6777 |
| Density on a small island | about 1 per 0.9 to 1.2 km of coast | VERIFIED (approximate) | same thesis and Shetland survey |
| Fresh water near holts, tide link | otters wash in fresh water; feeding at all tides, many forage in shallow kelp and rock pools around low water | PLAUSIBLE | none read |
Group size: single animals or mother with 1 to 2 cubs (PLAUSIBLE).
Seasons: no fixed breeding month; cubs in any season (PLAUSIBLE). Calendar for the game: year-round, with cubs shown in summer.
Help or harm: leave the holt area (rocks, thick weed, peat banks, cover within 100 m of shore) alone, keep a fresh-water stream or pool nearby, keep shore dogs on leads, keep creel lines and nets out of kelp.
RULE otter (seeded): number of territories = shore_length_km_with(rocky or kelp shore AND fresh water within 300 m AND cover) / 4.5, rounded down. Each has 1 resident otter, 30 percent chance of a mother with cubs in summer. Building or a path within 50 m of the holt halves the chance. Kelp bed within 150 m of shore raises the territory's chance by +25 percent (TUNING).

## 4 Basking sharks, dolphins, minke whales (visitors)
| Fact | Value | Conf. | Source |
|---|---|---|---|
| Basking shark main months | tagged sharks spent most of Jul, Aug, Sep around one island pair and a lighthouse rock; first sighting of the year seen 16 May | VERIFIED | https://news-archive.exeter.ac.uk/2014/july/title_393061_en.html ; CalMac blog https://WWW.CALMAC.CO.UK/calmac-ferries-marine-awareness-programme/blogs/marine-wildlife |
| What draws them | they feed where water masses meet: tidal and oceanic fronts, edges of tidal mixing, upwelling | VERIFIED | SNH Report 339 https://nnr.nature.scot/sites/default/files/2023-01/Publication%202009%20-%20SNH%20Commissioned%20Report%20339%20-%20Basking%20Shark%20Hotspots%20on%20West%20Coast%20of%20Scotland.pdf |
| Hot spots | few and fixed: a sound between two islands, an outer rock, a high island | VERIFIED | SNH 339 |
| Group size | singles to groups of 10 to 30 at a hot spot (UNVERIFIED, design) | UNVERIFIED | none |
| Minke whale | usual Apr to Oct, maybe some year-round; feeds in strongly tidal mixed water; 20 to 30 together once off one island | VERIFIED (months), VERIFIED rare large group | https://www.nature.scot/plants-animals-and-fungi/mammals/marine-mammals/minke-whale ; Scotsman extract |
| Common dolphin | most seen dolphin in Hebridean surveys; 2.3 to 2.9 sightings per 100 km of survey in summers 2022 and 2023 | VERIFIED | NatureScot Research Report 1364 https://www.nature.scot/doc/naturescot-research-report-1364-hebridean-cetacean-research-programme-2021-2024 |
| Dolphin group size | usual 5 to 30; larger pods of 100+ offshore | PLAUSIBLE (not read) | none |
| Minke up and basking shark down | one season had record minke and record low basking shark sightings | VERIFIED | https://www.hwdt.org/news/minke-record |
Help or harm: keep boats slow and out of a hot spot, give a basking shark a wide berth, no feeding. Share: a front spot becomes a visitor attraction and a good fishing mark; fishing too hard there removes the feast.
RULE visitor_front (seeded): a front spot is a tidal race, a headland jet exit, a sound mouth with a sill, or the edge of the open and the sheltered stream (use `FLOW_TYPES.md` races 7 and 8, convergence 14). Basking shark count = front strength (0 to 1) * season (Jun 0.3, Jul to Sep 1.0, May and Oct 0.3, else 0) * 12, minus boat disturbance. Minke 0 to 3 at fronts Apr to Oct (UNVERIFIED), dolphin pod 5 to 30 at fronts and along the stream edge Jun to Sep, 0 to 2 months the rest. Spring neap: more plankton gathering at neaps, more mixing at springs (PLAUSIBLE, TUNING).

## 5 Sea eagles
| Fact | Value | Conf. | Source |
|---|---|---|---|
| Scotland breeding pairs | roughly 100 to 130 (NatureScot Q and A 2019 and FLS page; one report claims more than 200) | VERIFIED range, claim of 200 UNVERIFIED | https://www.nature.scot/doc/white-tailed-eagle-action-plan-questions-and-answers ; https://forestryandland.gov.scot/learn/wildlife/white-tailed-eagle |
| Where | mostly the west, coasts and islands | VERIFIED | NatureScot Q and A |
| Nesting | big nests in large trees or on cliffs and stacks where trees are missing (UNVERIFIED for islands without trees) | PLAUSIBLE | none read |
| Disturbance | law protects birds near the nest while building, incubating or with young | VERIFIED | Forest Research note https://cdn.forestresearch.gov.uk/2011/03/fcpn101.pdf |
| Breeding months | about Feb to Aug (UNVERIFIED) | UNVERIFIED | none |
Size of group: pairs. One pair per 15 to 30 km of coast (UNVERIFIED, design).
RULE sea_eagle: one pair per island group of high cliff or stack with a sea view, no house within 500 m. Visible across the year; they scare seabird counts down by about 10 percent near their nest (UNVERIFIED, TUNING). A pair adds a story hook and a calm-sky cue.

## 6 Fish shoals (herring, sandeel, mackerel)
| Fact | Value | Conf. | Source |
|---|---|---|---|
| Herring cruising speed | up to about 1.1 m/s (108 cm per s) in a recording; one migrating shoal about 0.2 m/s | VERIFIED (secondary extract) | https://en.wikipedia.org/wiki/Shoaling_and_schooling |
| Herring shoal form | North Atlantic shoals up to 4.8 cubic km, 0.5 to 1 fish per cubic metre; a one-night shoal of about 250 million seen off a bank | VERIFIED (secondary) | National Geographic extract |
| Mackerel in summer | visit northern UK waters in summer and leave in autumn; follow warm water (PLAUSIBLE, not read) | PLAUSIBLE | none |
| Sandeel habitat | live in sand patches, burrow into the sediment at set times of the year, return timing matters for seabirds; patches shrink towards the north-west | VERIFIED | https://www.gov.scot/publications/sandeel-consultation-review-scientific-evidence/pages/4 ; Marine Atlas https://www.gov.scot/publications/scotlands-marine-atlas-information-national-marine-plan/pages/37/ |
| How stream moves a shoal | fish ride or hold against stream; they sit on stream edges and eddies where plankton collects | PLAUSIBLE | none read |
| Speed to use | drift with the stream 0.3 to 1 m/s plus own movement up to 0.5 m/s; a day's net travel 5 to 20 km (UNVERIFIED) | UNVERIFIED | none |
Group sizes (numbers, not fish): a shoal index 0 to 1 per sea cell. No individual fish.
RULE fish_shoal (seeded): per sea cell shoal index = plankton(front_strength, depth 10 to 60 m, season) * temperature_ok. Herring: autumn and winter spawn on gravel (UNVERIFIED), feed in summer at fronts; sandeel only over sand bed cells with stream between 0.5 and 1.5 m/s (clean mobile sand, UNVERIFIED); mackerel Jun to Sep only if the sea is warm enough (TUNING). A shoal drifts with the tide with a small bias towards fronts. Fishing above 0.4 of the index in a cell lowers next year's index by 20 percent (TUNING). Feeds seabirds (section 2), seals, dolphins and the fisher.

## 7 Kelp forests and shellfish beds by depth band
| Band (below mean sea level; real kelp is measured from chart datum) | What lives there | Conf. | Source |
|---|---|---|---|
| 0 to 5 m | dense kelp forest on exposed hard rock where light and surge are high | VERIFIED | MarLIN habitat 171 https://www.marlin.ac.uk/habitats/detail/171 |
| 5 to 10 m | kelp forest thinning, red weeds underneath (the dense canopy blocks up to 90 percent of light) | VERIFIED | same |
| 10 to 20 m | kelp park then red weeds; lower edge set by light and by urchin grazing; abrupt in places | VERIFIED | same; https://www.marlin.ac.uk/habitats/detail/333 |
| Below about 15 to 20 m (clear water) | no kelp; red seaweeds, brittlestars, sponges | PLAUSIBLE | MarLIN |
| Shellfish by depth | scallops on clean sand and gravel at about 10 to 100 m, mussels on rock and rope in the shore zone to a few metres, lobster and crab in rock crevices from shore to 20+ m, urchins on lower kelp | PLAUSIBLE (not found in extracts) | none |
Help or harm: leave kelp alone near shore, keep storm-cut kelp as wrack (section 8), limit creels and dredges on reef.
RULE kelp_shellfish (seeded): kelp cell = hard bed AND depth 0 to 15 m AND wave exposure not extreme (a very exposed cell still keeps the forest). Density falls from 1.0 at 3 m to 0.2 at 15 m, 0 below depth limit set by water clarity (clear Atlantic water 15 m, brown estuary 8 m, TUNING). Storm tears out 10 to 30 percent of kelp cells; it regrows over 2 to 3 seasons (PLAUSIBLE). Shellfish: sand and gravel cell 10 to 60 m = scallop bed, rock crevice 0 to 20 m = crab and lobster pots, intertidal rock = mussels and limpets.

## 8 Wrack and beach fauna
- Storm-torn kelp and weed drift ashore and lie along the high-tide line (`FLOW_TYPES.md` flow 16). VERIFIED qualitative (USC Sea Grant extract https://dornsife.usc.edu/uscseagrant/2019/10/08/wrack-lessly-managed/ , US source, same ecology).
- Sandhoppers eat the wrack at night and hide under it by day; kelp flies lay eggs in it; later come isopods and rove beetles. VERIFIED.
- Waders, pipits and swallows eat the sandhoppers and flies. VERIFIED.
- Removing the wrack cuts the animals birds eat. Removing plastic is fine. VERIFIED.
- Season: more wrack after autumn and winter storms; most fauna Apr to Oct (PLAUSIBLE).
Counts: wrack line length in metres per beach and a wrack mass index 0 to 1 (TUNING).
RULE wrack: wrack index on a beach = (kelp cells within 2 km upstream of the drift) * storm_count_last_30_days * 0.1, capped at 1, fades in 20 to 40 days. Fauna index follows with a 5 to 10 day lag. Wader count on the beach = 5 to 40 * wrack index in autumn, spring. If the player clears the weed for a harbour or a "tidy" beach, the wader count is halved there (hopeful: leave a strip).

## 9 Leatherback turtle: the real seed of the legend
| Fact | Value | Conf. | Source |
|---|---|---|---|
| Species | leatherback, the most often seen turtle in UK and Irish waters; 1,683 of 1,997 turtle records since 1910 | VERIFIED | Cambridge paper https://cambridge.org/core/services/aop-cambridge-core/content/view/S0025315420000843 ; MCS https://mcsuk.org/news/look-out-for-leatherback-sea-turtles-this-summer |
| Season | mostly Jun to Oct, peak Aug; strandings peak Sep and Oct | VERIFIED | UK government marine reptile report https://assets.publishing.service.gov.uk/media/623357f28fa8f504a6d54c7a/Appendix_1a_6_-_Marine_reptiles.pdf |
| Why they come | to feed on jellyfish (for example a large barrel jellyfish); sightings follow jellyfish; jellyfish blooms rise between spring and autumn | VERIFIED | MCS; Houghton et al. 2006 (as quoted in the UCC pdf https://www.ucc.ie/en/media/research/planforbio/pdfs/jellyfish_turtles.pdf) |
| Size and weight | adult shell length about 1.2 to 2.4 m; weight about 230 to 900 kg; a male stranded in Wales in 1998 weighed over a tonne | VERIFIED (NPS and USFWS figures via search; Wales case via search) | https://www.nps.gov/pais/learn/nature/leatherback.htm |
| Cold water | keeps core body warm, up to about 18 C above the water (a thick oil layer and heat exchange) | VERIFIED | COSEWIC report extract |
| Dives | to over 1,000 m and 80+ minutes | VERIFIED (National Geographic extract) | search |
| Nesting | does not nest in Europe; nests in the tropics (West Africa, Caribbean); tagged females nesting in the west Atlantic have been found off France and Spain within a year | VERIFIED for tropical nesting; "never nests here" PLAUSIBLE | COSEWIC extract |
| How many | a few records a year per region, more in warm years | PLAUSIBLE | MCS reports |
What real, folklore-free facts could ground a legend in our fictional world (original hooks, not copies):
- A creature as long as a rowing boat and heavier than a cow, with a smooth ridged back and no hard shell, that comes only at the end of summer for a few weeks.
- It travels thousands of miles from the warm sea to eat the jellyfish that bloom in the sheltered sound. In the game's fiction it need not say where it came from.
- It is warm to the touch in cold water, dives out of sight for more than an hour and comes back up in a different place.
- It never lays eggs on the island's beaches. A legend can ask why it returns, who it is looking for, or what it is guarding.
Original hook ideas (all invented here): "the sound keeper" that arrives when the jellyfish drift in and is thought to count the boats home; a stranded one that the village once helped back to sea, and the one who comes after "remembers"; a slow wake seen on flat water at slack tide only in one particular bay.
RULE leatherback_legend (seeded): at most one glimpse per year, only when (a) August to September, (b) a jellyfish bloom flag is high (warm sheltered sound with slow stream below 0.3 m/s at slack tide, TUNING), (c) a front or an eddy lies in a bay at least 15 m deep, and (d) D is low. Chance 3 to 8 percent per qualifying day, one glimpse per season at most. The glimpse is a long slow shape and a swirl, never a close view; the settlers' stories change after it is seen. Whether it is more than a glimpse stays open (owner's decision). Protecting the sound (no net or rope clutter, low disturbance) raises the chance, hopeful tone. No death or stranding is shown.

## 10 Calendar (month ranges, northern hemisphere)
| Group | J | F | M | A | M | J | J | A | S | O | N | D |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Grey seal pups | . | . | . | . | . | . | . | . | X | X | X | X |
| Common seal pups, moult | . | . | . | . | . | X | X | X | . | . | . | . |
| Auks on cliffs | . | . | X | X | X | X | X | . | . | . | . | . |
| Gannet | . | . | . | . | X | X | X | X | X | . | . | . |
| Puffin ashore | . | . | . | X | X | X | X | X | . | . | . | . |
| Terns | . | . | . | . | X | X | X | X | . | . | . | . |
| Kittiwake, shag, fulmar | . | X | X | X | X | X | X | X | . | . | . | . |
| Otters | X | X | X | X | X | X | X | X | X | X | X | X |
| Basking shark | . | . | . | . | x | x | X | X | X | x | . | . |
| Minke whale | . | . | . | X | X | X | X | X | X | X | . | . |
| Dolphins | x | x | x | x | X | X | X | X | X | X | x | x |
| Sea eagle (nest) | . | X | X | X | X | X | X | X | . | . | . | . |
| Mackerel, herring feed | . | . | . | . | x | X | X | X | X | x | . | . |
| Leatherback | . | . | . | . | . | x | X | X | X | x | . | . |
X = main, x = fewer, . = none. Dates are the verified ones above where tagged, otherwise PLAUSIBLE or UNVERIFIED.

## 11 What to measure first (per seed, by the foundry)
| Number | How to count it | Why it matters | Target to check |
|---|---|---|---|
| Suitable haul-outs | rock or bar cells that dry at low tide, flat top at least 20 m2, deep water within 100 m | seal trade-off | 3 to 12 per group; 0 means no seals |
| Haul-outs within 150 m of a boat lane or building | count after layout | protect versus build | 20 to 60 percent of them |
| Skerries with a flat top | flat tops with no house and no rat | gannet, tern, gull colonies | 2 to 8 |
| Cliff ledge length | m of cliff over 10 m high | auks, kittiwake | 100 to 3,000 m |
| Puffin turf slopes | soil at least 0.3 m deep on cliff-top or skerry with no path | puffin burrows | 0 to 4 |
| Kelp cells | hard bed cells 0 to 15 m | otters, fish, wrack | 15 to 40 percent of near-shore cells |
| Front spots | race, jet exit and sound mouth cells with stream over 1.5 m/s | basking shark, minke, dolphin | 1 to 4 per group |
| Sand patches for sandeel | sand cells with stream 0.5 to 1.5 m/s | puffin and kittiwake food | 1 to 6 |
| Otter shore length | rocky shore with fresh water within 300 m | territories | 5 to 40 km |
| Leatherback qualifying days per year | days that meet all four conditions in the rule | rarity | 0 to 10 a year, glimpses 0 to 1 |
Also test: does protecting a haul-out cost the player something real (a harbour site, a boat lane, a grazing field) and does leaving it empty cost something too (no fish, no stories). Check that counts recover when disturbance stops.

## 12 What is faked
| Faked | Reality |
|---|---|
| Haul-out capacity (4 m2 per seal) and tide exposure rule | no figure verified; real use depends on weather, season and individual |
| Colony density per metre | real densities vary by species and colony; numbers are design choices |
| Disturbance distances and the recovery speed | codes give 100 m for seals, hundreds of m for auks; the game's step curve is invented |
| Shoal drift, fishing penalty, spawning places | no figures read; direction is real, numbers invented |
| Front strength to basking shark count | real hot spots are few and fixed; the game builds them from flow rules |
| Kelp depth limit by clarity | real limit varies by water clarity and urchins; values are examples |
| Sea eagle nest and breeding dates | not verified |
| Leatherback chance per day | real sightings are a few a year; the number is made to give a rare glimpse |
| Whole population dynamics | the game keeps simple counts per site, never animals, and ignores genes, disease (bird flu was a real big loss) and ocean-scale shifts |
