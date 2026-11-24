# Food and wildlife: how settlers eat, and who else lives here (research note)
Status: research note for Living Islands (branch citylab/cloud-islands). Follows `RESEARCH_FIRST.md`. Companions: `ANIMALS_LOOK_AND_MOTION.md`, `WILDLIFE.md`, `FIRST_SHELTER_AND_MATERIALS.md`, `BEACH_COLLECTOR.md`, `EVOLUTION_TREE.md`, `ecosystem/FOOD_MODEL.md` (the numbers report) and `ecosystem/food_model.py`.
Real brands and real places appear only in this note, as sources or examples. Do not copy them into code, assets or recipes.
Tone: hopeful. Hunger is a slow pressure and never graphic. Nothing here shows a kill.

## 0 Method, tags, and what is solid
Method: web search extracts only (the search tool returns a short summary of pages; I opened no page). So a figure is VERIFIED only where a named search extract carried it. Natural-history facts I know but did not look up are PLAUSIBLE. Game numbers are TUNING. Guesses are UNVERIFIED.
Tags: VERIFIED / PLAUSIBLE / UNVERIFIED / TUNING, as in `RESEARCH_FIRST.md`. Confidence for the model numbers is also given as High, Medium or Low in section 4.

Honest summary:
- Solid (High): people need about 2,000 to 3,300 kcal a day; roof water is 0.8 litre per mm per m2; shellfish alone cannot feed a party; gull eggs are replaced by the bird if taken early; dried fish keeps for months.
- Medium: shellfish and seaweed return rates, bere and oat yields in cool islands, when seabirds breed.
- Low or invented: how big the inshore shoal is, how fast it regrows, how many fish a dinghy line takes in an hour, how much seals mind nets, how much litter a ration pack leaves, how the tender prices food. These are TUNING in the model.
- The model was tuned by hand until the trade-offs showed (see `FOOD_MODEL.md`, "Honest limits"). It is a design tool, not a forecast.

## 1 The food loop: every route is a player choice
Harry's decision: every legitimate way of feeding yourself is allowed, and it is up to the player. So there is no forced route. Each route below has a yield, an effort, a risk and a consequence in the world. The sanctuary animals (seals, puffins, gannets) are not on any list. Whether they are ever food is an open question (section 6).

### 1.1 What a settler needs (per day)
| Need | Amount | Source | Tag |
|---|---|---|---|
| Energy, adult, light to moderate work | about 2,000 to 2,500 kcal | FAO energy requirement tables, https://www.fao.org/4/Y5686E/y5686e08.htm (search extract) | VERIFIED range |
| Energy, heavy work (digging, hauling, building) | about 2,300 (women) to 3,300 (men) kcal | Hong Kong Centre for Food Safety table, https://www.cfs.gov.hk/english/programme/programme_nifl/programme_nifl_public_Energy_requirement.html (columns unlabelled in the extract, my reading) | VERIFIED number, PLAUSIBLE reading |
| Farm work cost | about 6 kcal a minute for men (2,900 kcal in 8 h on top of resting need) | Japanese occupational study, https://www.jniosh.johas.go.jp/en/indu_hel/doc/IH_57_3_283.pdf | VERIFIED |
| Water to survive (drink and food) | 2.5 to 3 litres a day | Sphere standard, https://sphereprototype.conted.ox.ac.uk/standards/watersupply/accessAndWaterQuantity.html | VERIFIED |
| Water, basic needs (drink, cook, wash) | 7.5 to 15 litres a day, up to 20 in hard conditions | same | VERIFIED |
| Game choice | 2,200 kcal and 10 litres per settler per day | model | TUNING |
Meaning for the game: a party of four needs about 8,800 kcal a day. A hard-working day pushes that up. The "what you need next" card shows days of food left, never raw calories.

### 1.2 The routes (yields per person-hour in a cool Atlantic island setting)
Hours are person-hours. kcal are whole food as eaten. Rate tags are for the number, not the idea.
| Route | Yield per person-hour | Effort and tools | Risk | What it does to the world | Tag |
|---|---|---|---|---|---|
| Shellfish and tide pools (limpets, mussels, periwinkles, winkles, crabs) | about 1,000 kcal an hour at a rich patch for a novice in the game. Skilled foragers on a warm coast measured about 1,500 (best 1,900 to 3,400) | hands, a knife, a bag. Only at low tide: 1 to 3.5 hours a day, best on spring tides, about 10 days a month | cold, slipping, sea-wash on a storm day. Biotoxins in shellfish (see below). Gathers little protein variety | thins the patch. A patch holds about 1,000,000 kcal on a small island and regrows slowly (about 1.5 percent a day) in the game. Walking the haul-out rocks unsettles seals | Medium (rate), Low (patch size) |
| Seaweed (laver, dulse, sea lettuce, kelp, carrageen, wracks) | about 300 kcal an hour fresh in the game. Dried laver is rich (about 136 kcal and 31 g protein per 100 g in one database), kelp is low (about 43 kcal per 100 g). Dulse figures are unreliable | hands, a bag, a drying line | iodine very high in kelp, metals possible (Harvard Nutrition Source). Storm wrack is free, live cutting is slow | nearly renewable. Kelp near shore shelters fish and otters, so cut only wrack and fronds | Medium (yield), Low (game rate) |
| Shore fishing (rod or hand line from rocks) | about 1,000 to 2,000 kcal an hour in a good spell | a line and hooks from the wreck | tide, swell, slipping | small share of the shoal. Fish come inshore in summer | Low |
| Boat line fishing (feathers and hand lines, dinghy) | about 3,500 kcal an hour at a full shoal (3.5 kg of fish at 1,000 kcal a kg) | dinghy, 6 hooks of lures, a day with a calm sea | storm days, a swamped boat. Catches swing from nothing to a full string | pulls the shoal down: the model's sea holds about 600 kg inshore. A line is selective with almost no by-catch (Seafish) | Low |
| Nets (gill net or set net) | about 4,000 kcal an hour tended, but only while nets last | 4 nets from a wreck, 1.5 hours a net to set, haul and clean | nets lost in storms, tangle with seals and birds | effort is cheap, so the shoal falls faster. Seals mind nets. This is where overfishing starts | Low |
| Drying, smoking, salting fish | keeps 90 percent of the energy of the fish (model) | a rack, driftwood fuel, a dry windy day, salt if you have it | rain ruins a batch (30 percent lost on a storm day in the model). Gulls steal from the rack | gulls gather at the rack. Smoke fuel eats the driftwood needed for building | Medium (method), Low (loss) |
| Hardy greens (kale, kale-like cabbages, leaf crops from found seed) | little energy, a lot of vitamins | sown in the planting window, cut from about day 35 | wind, salt spray, birds, slugs | a small bed; birds visit it | Medium |
| Roots and grain (potato, bere barley, small oats) | about 600 kcal per m2 of bed in the game; farm fields give about 1,000 to 1,300 (potato about 1,318, barley about 982, oats about 871 kcal per m2 in one table) | digging lazy beds, 20 hours to dig and sow 50 m2, 10 hours to harvest, 0.3 hours a day to tend | late frost, salt, birds, a wet summer. Ready in about 100 days | keeps well for months. Birds attracted to seed and shoots | Medium (field yields), Low (island yield) |
| Seabird eggs (common gull-type colonies, never the sanctuary species) | about 4,000 kcal an hour while there are eggs (40 eggs, 100 kcal each) | a ledge or a boat landing | cliff slips, mobbing birds | take only about a quarter of the first clutches. Gulls re-lay after a loss, but more than that breaks the colony | Medium (replacement laying), Low (safe share) |
| Trade with the tender ship | 1 ration pack (4,000 kcal) for 5 sorted salvage units; about 1,600 kcal an hour of sorting | a landing, salvage to sell | the tender is late or skips a visit (15 percent) | packaging litter piles up; seals leave if you let it. Clearing is free work for the collector | Low (all prices) |
| Scavenged stores from wrecks | about 2,500 kcal an hour while stores last | a day on the wreck | some tins are bad (15 percent in the model) | no effect on wildlife. Finite: about 7 to 10 days of food for four | Low |

Notes on the sources behind the table:
- Shellfish return rates: De Vynck and colleagues, intertidal foraging on a south coast, 41 days, about 1,492 kcal an hour on average, best case 1,900 (women) to 3,400 (men) kcal an hour. The same work says women and children could not live on marine food alone. High return only about 10 days a month for 2 to 3 hours. https://www.pubmed.gov/26989020/ , https://link.springer.com/doi/10.1007/s10745-007-9119-4 . VERIFIED for that coast, PLAUSIBLE for a cold one.
- Mussels about 74 kcal and 12 g protein per 100 g raw; periwinkle about 87 kcal and 15 g protein per 100 g. https://patient.info/nutrition/foods/mussels-raw , https://matvaretabellen.no/en/periwinkle-common-norwegian . VERIFIED. Limpet value not found.
- Handline fishing is low impact and selective: https://www.seafish.org/responsible-sourcing/fishing-gear-database/gear/hand-lines/ . VERIFIED. No catch-per-hour figure found; anglers say "nothing or six mackerel". Our rate is TUNING.
- Bere barley in the northern isles gives 2.8 to 3.8 tonnes a hectare, and sowing late April gave 17 to 76 percent more grain than later sowing. Bere, small oat and a local rye are grown together on nutrient-poor sandy ground in the Outer Hebrides. https://doaj.org/article/8b1f1d27fefe445fbee9b93ba243b428 , https://genresj.org/index.php/grj/article/download/genresj.QGSB7051/149?inline=1 , https://www.sasa.gov.uk/variety-testing/scottish-landraces/scottish-landrace-protection-scheme-slps/bere-barley . VERIFIED.
- Potato 1,318, barley 982, oats 871 kcal per m2 (field weight): https://gardeningplaces.com/articles/nutrition-per-hectare1.htm (garden site, columns hard to read, treat as rough). Mainland yields about 5.6 t/ha oats, 5.9 t/ha barley, 49.8 t/ha potatoes: https://gov.scot/publications/economic-report-scottish-agriculture-2016/pages/32 . VERIFIED (rough).
- Shellfish biotoxins (paralytic, amnesic, diarrhoeic) build up from plankton; "no information is not reassurance"; local authority gives closure notices. https://food.gov.uk/business-guidance/biotoxin-and-phytoplankton-monitoring . VERIFIED. In the game this is a quiet warning on a shellfish patch after a warm calm spell (rule in section 1.6), never a death.
- Seaweed caveats (metals, iodine): https://nutritionsource.hsph.harvard.edu/food-features/seaweed/ . VERIFIED. Dried laver and kelp figures from food databases: https://patient.info/nutrition/foods/seaweed-nori-dried-raw , https://patient.info/nutrition/foods/seaweed-kombu-dried-raw . Database values disagree; treat as rough.
- Stockfish is unsalted fish dried on racks; klippfisk is salted first; dried fish keeps months to years if kept dry; 6 to 10 percent salt in the flesh stops most spoilage. https://www.wikipedia.org/wiki/Stockfish , https://www.fao.org/flw-in-fish-value-chains/resources/articles/Fish-salting-101-What-you-need-to-know/en . VERIFIED. No dry-weight ratio found (a common figure is about 5 kg fresh to 1 kg dry, UNVERIFIED).
- Seabird eggs and birds as island food: islanders on one remote archipelago ate seabird eggs and stored birds in stone stores; reports of "up to 10,000 fulmars a year" and "more than 89,600 puffins in 1876" conflict and are anecdotal. https://nrscotland.gov.uk/learning-and-events/all-features-and-articles/stories-from-st-kilda/ , https://electricscotland.com/History/stkilda/chapter09.htm . After people left, fulmars boomed, so harvest was holding numbers down. PLAUSIBLE. Gulls re-lay after egg loss: https://sora.unm.edu/sites/default/files/47_2_179-183.pdf . VERIFIED for one gull species. Other places run egg gathering as a regulated, annual-plan harvest (Glacier Bay) and some banned it (mainland Finland since 1962): https://gov.scot/publications/feasibility-strategic-ornithological-compensatory-measures-scottish-context/pages/8 . VERIFIED.
- Rain: litres = mm x m2 x 0.8. https://warwick.ac.uk/fac/sci/eng/research/grouplist/structural/dtu/rwh/sizing . VERIFIED.

### 1.3 Fresh water and rain catchment
A camp tarp of 8 m2 in a place with about 2.6 mm a day on average gives about 17 litres a day. Four settlers need about 40 for drink, cooking and washing (Sphere 7.5 to 15 each). So the tarp gives drinking water and a little more. Washing water is carried from a stream or seep (about 50 litres per person-hour in the model, TUNING). A hut roof of 25 m2 catches about 52 litres a day; a cottage roof of 45 m2 about 94. So each rung of the ladder changes the water chore (section 1.8). Dry spells of two weeks are normal in summer (UNVERIFIED), so a barrel or tank of 400 litres matters. A drum from a wreck is a good find. Water is a chore with a counter, not a death clock in the first build.
Tags: arithmetic VERIFIED; rain amounts per island TUNING (model: 40 to 65 percent of days wet, mean 6 mm on a wet day, so about 900 to 1,400 mm a year, in the range of a wet Atlantic coast, PLAUSIBLE).

### 1.4 Seasons and weather
- Daylight at about 58 degrees north: 6.5 hours in midwinter, 17.5 in midsummer (`eco_common.py`). Free work hours shrink in winter by about half.
- Fish: summer is full. Mackerel and herring come inshore in summer and leave in autumn (PLAUSIBLE). Wrasse, pollack, flatfish and crabs stay (floor 25 percent in the model).
- Seabirds: puffins arrive spring, leave in August; eggs in May and June; gannets, fulmars, guillemots, razorbills, shags, kittiwakes all breed spring to midsummer (PLAUSIBLE). First shag eggs 29 April, first fulmar egg 13 May in one monitored year (Isle of May report, https://www.nature.scot/doc/isle-may-nnr-annual-report-2018 , VERIFIED for that year). Egg season in the model: day 110 to 165.
- Seals: grey seal pups Sept to Dec, common seal pups June to July (`WILDLIFE.md`, VERIFIED).
- Storms: more in winter. A storm closes fishing and the dinghy, slows work to 40 percent, can take a net, ruins a drying batch and salt-burns a bed.
- Short summer for gardens: sowing needs warm enough soil (about mid April on). Bere sown late April does better. Ripening takes about 100 days. A crop sown in mid May ripens in late August. A frost or gale in September can end it (UNVERIFIED).
- Shellfish toxins are a summer, warm-calm risk (PLAUSIBLE).

### 1.5 Storage and spoilage (cool climate, per day, TUNING, Low)
| Food | Lost per day | Why |
|---|---|---|
| fresh fish | 12 percent | warm days, flies, gulls |
| shellfish out of water | 8 percent | die in the bag |
| fresh seaweed | 5 percent | |
| eggs | 1.5 percent | cool store |
| dried fish | 0.2 percent, plus 1 percent to gulls while a rack stands | |
| potatoes, grain | 0.15 percent | needs a dry, frost-free clamp or store |
| ration packs | 0 | |
Rule: fresh first, stored last. A day's catch that is more than needed is dried, or lost. So a player who fishes more than needed has to build a rack, or waste it.

### 1.6 How choices change the world (so no route is free)
| Choice | World effect | Visible sign | Undo |
|---|---|---|---|
| Heavy line or net fishing | inshore shoal index falls. Fewer birds feed, gannets and puffins carry fewer fish, seals turn away below about 0.3 of a full shoal | shoal shadows thin, gannet dives rarer, seal heads fewer | stop fishing. The shoal relaxes towards what the open sea brings, about 3 percent a day |
| Nets in the water | seals lose trust slowly (0.002 a day per net in the model, TUNING). Bycatch risk is real for seals and diving birds | seals haul out farther away | take nets in |
| Rubbish and ration packaging piled up | seals leave when litter is over 2 kg a metre (`EVOLUTION_TREE.md`, 20 days to leave, `ecosystem/ECOSYSTEM_TEST.md`) | grey rock, fewer seals | clear the shore, they return over a season |
| Over-picking shellfish | patch thins, fewer limpets and crabs, wading birds (oystercatchers) leave | bare rock, fewer shells | rest the patch for weeks |
| Egg raids | colony falls. Take more than about a quarter of first clutches and the colony index falls. Gulls re-lay early, so a light take is sustainable | fewer birds on the ledge next spring | stop for a season; colony regrows slowly |
| Gardens | seed and shoots attract birds (geese, gulls, finches). A scarecrow, a net or a person near keeps them off. A wall breaks wind and salt | birds on beds, ragged leaves | tend it, add a fence |
| Drying rack | gulls and skuas gather. Fish scraps feed them. A big flock near a house is noisy and fouls the roof | gull crowd at the rack | guard, cover, or dry in the loft |
| Fire and smoke | birds avoid smoke near nests within a short distance (PLAUSIBLE). Fuel use eats driftwood | smoke column, birds lift | smoke on the calm side, away from ledges |
| Walking the haul-out | seals flush into the water at 100 to 200 m | seals slip in | keep paths away; a seal rock is a no-go zone |
| Tender dependency | packs fill the stores but litter piles and the settlers' skills do not grow | tender visits, litter piles | clear litter, make your own food again |
Rule: every route costs something, and every cost can be repaired. No route is the "right" one.

### 1.7 How the tender ship fills gaps
- It comes on an old timetable, about every 20 days (plus or minus 3), and skips 15 percent of visits (TUNING).
- It buys sorted salvage and sells ration packs. In the model, 5 salvage units buy a pack of 4,000 kcal, up to 12 packs a visit.
- It is a safety net, not a farm. Maximum about 2,400 kcal a day averaged, which is under a third of a party of four.
- Autumn landings are where it matters most. In the model only the trader strategy keeps most people alive in autumn, and 65 percent of those runs lose the seals (packaging litter), so there is a price.
- It never replaces the other routes. It also lets the player "sell" dried fish or eggs later (not modelled).

### 1.8 What each rung of the shelter ladder unlocks for food
| Rung | Food and water it unlocks | Main limit |
|---|---|---|
| 1 Camp (lean-to, tarp) | shore foraging, seaweed, shore line, the packs and wreck stores you brought, a tarp of rain water (drinking only), a fire for cooking shellfish | cold nights, no storage, no rack |
| 2 Turf-and-stone hut | a dry store for dried fish and roots, a hearth that smokes fish, a rack by the wall, a bigger roof for water (about 25 m2), a first garden bed with a wall to break wind | labour: 35 to 60 person-days |
| 3 Thatched cottage | a larder, a smoke loft, a barrel store, gardens of several beds, a byre-sized shed for seed and tools, a roof for 45 m2 of water | thatch labour; tens of person-days of reed |
| 4 Slate cottage | a proper kitchen and chimney, salt-fish barrels from imported salt, glass-sheltered seedlings, a cistern from lime and slate | trade and know-how (lime, slate, nails) |
Rule: rungs 1 to 3 limit food by labour; rung 4 limits it by trade. Matches `FIRST_SHELTER_AND_MATERIALS.md` section 1.

### 1.9 Hunger as a gentle pressure
- Hunger is an index from 0 to 1 that follows the share of food missed, smoothed over about five days.
- Stages shown on the card: hungry (over 0.15), weak (over 0.4), failing (over 0.7).
- Effects: work slows (up to 60 percent), the card says what to do. No one drops dead.
- Only a long, deep hunger (20 days at "failing") sends one settler away on the tender, counted, never shown. The game also offers a rescue ration (not modelled).
- Hunger never shows pain. The sign is a slower walk, smaller portions on the table, a quiet camp.
- A long time without greens makes people a little tired (7 percent slower in the model, UNVERIFIED size). It is a hint to plant or pick seaweed, not a sickness.

### 1.10 What the numbers model says (summary; full tables in `ecosystem/FOOD_MODEL.md`)
- No route wins everything. The mixed plan feeds best but spends more on chores and still fails in a hard second winter (43 percent in the model) and in a village of twelve (72 percent, shoal collapse).
- Shore, garden, wreck and eggs alone are not enough for four people. Line and nets alone are enough in spring and fail in autumn. Nets make the seals nervous.
- The first garden is a 100-day investment. It does not feed anyone before day 100. Seed found in the wreck covers three beds. A third of each crop saved sows one more bed.
- Eggs are a treat: the safe quarter of the first clutches of a 200-egg colony is 50 eggs, about 5,000 kcal, under one day for four.
- Four settlers cannot empty the inshore. Twelve with three boats can.

## 2 Wildlife of a cool Atlantic coast
Plain common names. Sizes are PLAUSIBLE unless a source is named. Where the earlier notes already hold the look and motion in detail (`ANIMALS_LOOK_AND_MOTION.md`), this table only adds what the food loop needs. Draw recipes: silhouette first, then one colour value against rock or sea, then one motion with a clear period.

### 2.1 Birds
| Species | Look (size, colours, silhouette, how to draw it simply) | Motion and sound | Where on the table, season | Eats |
|---|---|---|---|---|
| Gannet | length 90 cm, wingspan 1.8 m. White, black wingtips, yellow-buff head, long pointed wings and a cigar body. A white cross with black tips | glides on stiff wings, folds and plunge-dives from 11 to 60 m (V-shaped dive, VERIFIED, https://agris.fao.org/search/fr/records/65de74d963b8185d9ca8ab15); harsh "arrah" at the colony | skerry top or cliff, 2.3 nests per m2 (VERIFIED in `ANIMALS_LOOK_AND_MOTION.md`); spring to autumn | mackerel, herring, sandeel |
| Puffin | 28 cm. Black back, white face and belly, big striped bill (orange, yellow, blue), orange feet. A small black-and-white barrel with a bright wedge | whirring wings, low straight flight, a row of fish in the bill; low growl in the burrow | turf burrows on the cliff top and skerry grass; April to August | sandeel, small fish |
| Fulmar | 47 cm, span 1.1 m. Grey back, white head and body, tube nose. A small gull with stiff straight wings | stiff-winged glide close to the cliff; cackle; spits stinking oil when disturbed (PLAUSIBLE) | cliff ledges; lays one egg in mid May (VERIFIED for one year) | fish scraps, offal, plankton |
| Guillemot | 40 cm. Black-brown back, white belly, thin dark bill. A dark bowling pin in a dense row | upright stance, whirring flight low over water, deep dives; growling purr | bare cliff ledges in rows; May to July | sandeel, sprat |
| Razorbill | 38 cm. Black above, white below, thick flat blade bill with a white line | like guillemot | same ledges, edges of the guillemot rows | small fish |
| Shag | 75 cm, span 1.0 m. All dark with green gloss, yellow at the gape, a crest in spring. Snake neck, wings held out to dry. A dark X | wing-drying stand 5 to 20 minutes; low dives of 20 to 60 s | low rocks and ledges, rocky coast; nests lower down the cliff from late April | fish |
| Cormorant | 90 cm, span 1.4 m. Black, white chin patch, heavier than a shag | same pose, more inshore and estuary | skerries, harbour posts | fish, flatfish |
| Kittiwake | 38 cm, span 1.0 m. White, grey back, black dipped wingtips, black legs. A small neat gull | high, light flight; its own name as a call | cliff ledges in large nest rows | small fish, plankton |
| Arctic tern | 33 to 39 cm with streamers, span 76 to 85 cm (VERIFIED, https://en.wikipedia.org/wiki/Arctic_tern). White, black cap, red bill, forked tail. A thin cross with a fork | hovers then dives; sharp "kee-arr"; mobs walkers within 50 m | bare shingle, skerry top; May to August, gone by September | sandeel, small fish |
| Herring gull | 60 cm, span 1.4 m. Grey back, white head, yellow bill with a red spot, pink legs; young mottled brown. A broad M-wing | soaring flap, follows boats; keening call | roofs, rocks, beaches, the rack; all year | scraps, shellfish (drops them), fish, eggs |
| Great black-backed gull | 70 cm, span 1.6 m. Black back, heavy bill | glides, perches on top of rocks | rock top, all year | fish, chicks, carrion |
| Great skua (bonxie) | 55 cm, span 1.4 m. Dark brown, white wing flash, heavy hooked bill. A dark gull with white wing patches | chases birds to steal fish; dives at walkers | moorland and grass above cliffs; summer | stolen fish, fish, eggs |
| Eider | 60 cm. Male black-and-white with green nape, female brown barred. A heavy duck with a long sloping bill | floats low, in rafts, dives for mussels; soft "ah-oo" | sheltered bays and kelp, nest on turf and seaweed; spring | mussels, crabs |
| Oystercatcher | 43 cm. Black and white, long orange bill, pink legs, red eye. A pied wader with a bright stick | runs along the tide edge; loud piping "kleep" | sand, shingle and rock pools; all year | limpets, mussels, worms |
| Storm petrel | 15 cm. Sooty black with a white rump. A small bat-like bird | fluttering flight over waves, patter on the water; purring song at the burrow at night | rock crevices and stone walls; summer nights | plankton, oil from the sea surface |

### 2.2 Sea animals
| Species | Look | Motion and sound | Where, season | Eats |
|---|---|---|---|---|
| Grey seal | male 2.3 m, up to 300 kg; female 1.9 m. Grey to brown, speckled, long snout (sloping "Roman nose"). A heavy bean | shuffles, rests curved, head up when alert, slips in; moaning croon, bark. Pups white (Sept to Dec) | skerry, flat rock above high tide; all year, pups autumn | fish, sandeel, flatfish |
| Common seal | 1.5 to 1.9 m. Round head, small ears, V-shaped nostrils, spotted | rests banana-shaped, slips in | sandbanks, skerries; pups June to July | fish |
| Otter | 1.0 to 1.3 m with tail. Brown, pale chin, long wet tail. A low brown tube | bounds on land, dives with a roll; high chirp, whistle | rocky shore with kelp, a freshwater pool for rinsing; year-round, mostly at dawn and dusk | crabs, small fish, eels |
| Harbour porpoise | 1.5 m. Small, dark grey, blunt snout, small triangular fin. A dark roll | brief roll, no leap | open sea near the isles | herring, sandeel |
| Common and bottlenose dolphin | 2 to 3.8 m. Grey, curved fin, short beak. A curve over the surface | arcs, bow rides at over 2 m/s (PLAUSIBLE), clicks and whistles | open sea, summer | mackerel, herring |
| Basking shark | 6 to 10 m. Grey-brown, giant open mouth, tall triangular fin and tail tip showing. A long dark slow shape | very slow cruise at the surface; silent | summer, over fronts | plankton |
| Mackerel | 30 to 35 cm. Blue-green back with dark stripes, silver belly, fast torpedo | schools, fast darts | inshore in summer, leaves in autumn | plankton, small fish |
| Herring | 20 to 30 cm. Silver, bright flank | dense shoals, gannets and dolphins follow | inshore, mostly autumn and spring | plankton |
| Cod, pollack, wrasse | cod 50 to 100 cm, mottled brown; ballan wrasse 20 to 40 cm, green-brown, lives in the kelp | slow, near the bottom or in the weed | kelp and reefs, all year | crabs, small fish |
| Shore crab, edible crab, lobster | shore crab 6 to 8 cm green-brown; edible crab 15 to 25 cm red-brown pie-crust edge; lobster 25 to 50 cm dark blue | sideways scuttle, claws up | shore, pools, kelp, reefs | shellfish, scraps |
| Limpets, mussels, periwinkles, winkles | limpet 4 to 6 cm grey cone; mussel 5 to 8 cm blue-black; periwinkle 2 to 3 cm | no motion except a slow shuffle at high tide | rock and bed; mussel beds on the lower shore, limpets mid-shore | algae, plankton |
| Kelp (oarweed, forest kelp, sugar kelp) | 1 to 3 m brown ribbons, fingers and long stalks; forest kelp has stiff stalks | sways with swell; creak of rubbery stalks | rock below low tide, 0 to 20 m | feeds fish, otters, crabs |
| Wracks, dulse, laver, sea lettuce | bladder wrack olive with pods; dulse dark red; laver thin dark; sea lettuce bright green sheets | sways with tide | mid shore and rock pools | |
(Sea eagle, tide-turtle: see `ANIMALS_LOOK_AND_MOTION.md` sections 3.10 and 3.11. They stay out of the food loop.)

### 2.3 What each gives or costs, and how each reacts
| Species | When disturbed | Gives the player | Costs the player | Rubbish | Fire and smoke | Boats | Beach robot |
|---|---|---|---|---|---|---|---|
| Gannet | stays on the nest, lifts to the sea | a sign of a healthy shoal; spectacle | none | avoids the colony beach if littered | indifferent at distance | ignores, follows fish | ignores (far) |
| Puffin | pops into its burrow | charm, a "sanctuary" icon | none | leaves if turf is littered or cats are loose | smoke near burrows makes them dive in | stays in the burrow | ignores |
| Fulmar | spits oil on walkers, a smelly gift | free eggs for sanctuary birds only if allowed (open question) | stains the player's coat | picks up plastic bits and is harmed (PLAUSIBLE) | ignores | follows boats for scraps | ignores |
| Guillemot / razorbill | the whole row drops off the ledge | ledge colony, a sign of a rich shoal | none | gets tangled in nets and plastic (PLAUSIBLE) | indifferent | scatter off the water at 100 m | ignores |
| Shag / cormorant | dives, flaps off | a sign of fish in the bay; wing-drying pose | take fish from nets and traps | sits on junk | indifferent | flee at 50 m | ignores |
| Kittiwake | lifts, circles | sign of small fish | none | picks litter off the water | ignores | follows fishing boats | ignores |
| Arctic tern | mobs walkers within 50 m | alarm clock for people near a colony | stabs heads, keeps walkers off the beach | leaves a littered nesting shingle | ignores | dives near boats when they rinse fish | mobs the robot if it crosses the colony |
| Herring gull | steals food, takes eggs of other birds | free eggs (open for the gull colony), a clean-up crew for scraps | steals fish from the rack and fouls roofs; a pest in a village | loves it; flock grows with rubbish | indifferent | follows every boat | follows the beach robot for turned-up sand worms (PLAUSIBLE) |
| Great black-backed gull | takes chicks and small birds | none | eats puffins and chicks of other birds | loves it | ignores | follows boats | ignores |
| Great skua | dive-bombs walkers | none | steals fish from other birds, bold at a rack | ignores | indifferent | follows boats | ignores |
| Eider | rafts dive or run off | down feathers (if the sanctuary lets you collect from the nests of birds that have left them; PLAUSIBLE, traditional) | none | leaves a littered bay | ignores | dive and move off at 100 m | ignores |
| Oystercatcher | piping alarm, leaves the tide edge | warns of people; a sign of a healthy shore | none | leaves a littered shore | ignores | ignores | keeps 10 m from the robot |
| Storm petrel | stays in the crevice | night song at dusk, a rare sign of an unlit, quiet island | none | oil and litter reduce | night light and fire confuse it (PLAUSIBLE) | ignores | ignores |
| Grey seal | heads up at 1.5 D, slip in at 0.7 D (D = 100 to 200 m, TUNING) | the clearest sign of a clean shore; sanctuary star | takes fish from nets, eats from the shoal | leaves when litter over 2 kg a metre | ignores smoke, flees from loud noise | slips in; heads pop up at 40 to 90 s | tolerates a slow robot at distance; flees a party bot with a speaker |
| Common seal | like grey seal, skittish in pupping season | same | same | same | same | same | same |
| Otter | dives, goes to its holt | a rare cameo; holt near fresh water | takes a few fish and crabs | leaves if the shore is littered | avoids | flees dogs and boats | ignores |
| Porpoise, dolphin | dives, leaves | spectacle; shows fish near | none | avoid littered, noisy waters | none | bow rides at over 2 m/s, so only when the boat sails | none |
| Basking shark | sinks | spectacle, a summer visitor | none | none | none | a slow boat is fine | none |
| Mackerel, herring | split, sink, run | the best catch in summer and autumn | a school can be fished out | none | none | a boat over a shoal splits it | none |
| Cod, pollack, wrasse | hide in kelp | steady fish all year | take hooks; hooked in kelp if the line is careless | none | none | none | none |
| Crabs and lobster | claws up, run into weed | good protein from pots and tide pools (about 80 to 100 kcal per 100 g, PLAUSIBLE) | pinch; a pot can drown an otter if too low (PLAUSIBLE) | eat litter bits | none | none | scuttle away |
| Limpets, mussels | clamp shut | staple shore food | toxins in warm calm summers | filter-feed on dirty water, so avoid a littered shore | none | none | none |
| Kelp and wrack | none | habitat, a free wrack harvest after storms | a net or line snagged on kelp | collects plastic and nets | none | boat propellers cut it | picks up wrack with litter if not tuned (design risk) |

### 2.4 The 12 species for the first build (best variety for least work)
Rule for the pick: one per habitat on the table, a food link for each, and every one a clear silhouette at table scale.
1. Grey seal (skerry): the sanctuary star, the litter signal.
2. Gannet (cliff and open sea): the plunge dive, a shoal signal.
3. Puffin (burrow): the charm and the icon.
4. Herring gull (roof, rack, beach): the pest and the scavenger; ties to the rack and to rubbish.
5. Shag (low rock): the wing-drying pose, a fish signal, a rival for fish.
6. Guillemot (cliff ledge, dense row): shows a ledge colony as a texture and a few birds.
7. Arctic tern (shingle): a summer-only mob that keeps walkers off a beach.
8. Oystercatcher (tide edge): the shore wader; fits the shellfish patch.
9. Otter (shore and holt): the rare cameo, fresh-water link.
10. Fish shoal, mackerel and herring (open water): the fishing target and the food source for the birds.
11. Shore crab (rock pools): the tide-pool forage creature; tap to take.
12. Kelp (below low tide): sways, shelters fish, and gives wrack.
Not first: fulmar, razorbill, kittiwake, cormorant, skua, eider, storm petrel, porpoise, dolphin, basking shark, lobster, limpets and mussels (drawn as a patch, not as animals), cod and wrasse (hidden), sea eagle, tide-turtle.
Why this set: 4 seabirds of different habits (gannet, puffin, guillemot, tern) plus 2 scavenger birds (gull, shag), 1 wader, 2 mammals, 1 fish group, 1 crab, 1 plant; all link to a food route or to rubbish.

## 3 The sanctuary loop and the food choices
Loop: clean, attract, rescue, care, release, return.
- Clean: clearing litter keeps seals and nesting birds. Any food route that makes litter (tender packs) feeds this loop in reverse.
- Attract: a healthy shoal, a clean shore, quiet haul-outs and burrow turf. Heavy fishing, nets in the water and egg raids all push animals away. So a sanctuary player eats from routes that do not harm the shoal (shore forage, garden, a light line, a rack, the tender in moderation).
- Rescue: a stranded pup, a tangled gull, an oiled shag. The rescue costs time and some of the day's catch.
- Care: care eats fish. A seal pup in care takes a couple of kilograms a day for weeks (PLAUSIBLE from rehabilitation practice, UNVERIFIED here). The inshore in the model holds 600 kg, so a pup costs more than a fifth of the shoal in one season. Birds take 100 to 300 g a day. This is the key tension: the sanctuary competes with people for fish. Ways out: line fishing in a good season with a stored fish stock (dried fish is not good for pups, so the player needs fresh), trade for fish from the tender, or share rescued animals out early.
- Release: a released animal adds to the visible count. A released seal raises trust a little; release of birds fills a ledge for next spring.
- Return: a clean, quiet shore means they come back by themselves in the next season.
- Ties: the player's own food choices set whether the sanctuary can afford care. Fed well, the sanctuary thrives. Fed badly, the settlers must choose between a pup and a meal, a real but gentle story moment, never gore. A rescue can also be refused, or be handed to the tender.
- Sanctuary animals are not food by default. Whether they ever are is Harry's open question.

## 4 Numbers model, confidence and what is a tuning guess
All in `ecosystem/food_model.py`. One line each: value, confidence, source or reason.
| Number | Value | Confidence | Note |
|---|---|---|---|
| Energy per settler per day | 2,200 kcal | High (range) | FAO, Hong Kong table; heavy work up to 3,300 |
| Water per settler per day | 10 litres | High (range) | Sphere 7.5 to 15; survival 2.5 to 3 |
| Roof catchment | 0.8 litre per mm per m2 | High | rainwater sizing page |
| Camp tarp, hut roof, cottage roof | 8, 25, 45 m2 | Low | design |
| Rain, mean | 6 mm on wet days, 40 to 65 percent wet | Low | an Atlantic coast, no local source |
| Shellfish yield | 1,000 kcal per hour at a full patch | Medium | De Vynck 1,492 average on a warm coast, scaled for cold and novices |
| Shellfish patch size and regrowth | 1,000,000 kcal, 1.5 percent a day | Low | pure guess; the sustainable harvest is r x K / 4, about 3,750 kcal a day |
| Seaweed yield | 300 kcal per hour | Low | |
| Boat line yield | 3.5 kg per hour at a full shoal | Low | no source |
| Net yield | 6 kg per net per day, 1.5 h a net | Low | no source |
| Inshore shoal | 600 kg, regrowth 4 percent a day, mixing 3 percent a day to the open sea | Low | invented; open boundary reflects "window on a bigger sea" |
| Fish energy | 1,000 kcal per kg whole | Medium | mixed oily and white fish |
| Drying | 90 percent kept, 15 kg a day a rack, 0.2 h per kg | Low | stockfish method is real, yields are guesses |
| Gull loss at rack | 1 percent a day | Low | |
| Spoilage | see 1.5 | Low | |
| Garden bed | 50 m2, 600 kcal per m2, ready 105 days, early at 80 days gives 70 percent | Low (island), Medium (field range) | field figures 870 to 1,318 kcal per m2 (see 1.2) |
| Dig, tend, harvest | 20 h, 0.3 h a day, 10 h per bed | Low | |
| Seed | found seed for 3 beds; a third of the crop saves seed for one more bed | Medium (a third), Low (3 beds) | |
| Egg | 100 kcal, 200 first-clutch eggs within reach, safe take a quarter | Medium (gull egg size), Low (stock and safe share) | gulls re-lay (VERIFIED for one species) |
| Seal trust | falls 0.04 a day when litter over 2 kg a metre; up 0.0067 a day under 0.7; falls 0.01 a day with a shoal under 0.3; 0.002 a day per net | Low | the first two are `ecosystem/wildlife_place.py` TUNING |
| Packaging litter | 0.12 kg a metre per pack; salvage gathering clears 0.01 per unit | Low (invented) | |
| Tender | every 20 days, skips 15 percent, 4,000 kcal a pack for 5 salvage units, 12 packs a visit | Low (all) | design |
| Wreck store | 90,000 kcal, 15 percent bad | Low | design |
| Hunger | smoothed over 5 days, work down to 40 percent at full, a settler leaves after 20 days failing | Low | design: deliberately gentle |
What is faked in the game: no individual people or fish; no real nutrition (only calories and a "greens" flag); no cooking fuel or time; toxins as a flag; sea state as a seeded schedule; birds and seals as counts drawn from indexes (as `ANIMALS_LOOK_AND_MOTION.md` section 6).

## 5 Minimal build list for the live page (ordered, rough cost)
Cost is a coder-day (about 6 productive hours) for one worker, TUNING. Nothing here touches the sky, sea or assets of the base page.
1. Days-of-food meter and a hunger card (hungry, weak, failing; plain words, no numbers). 0.5 day.
2. Shore forage: tide pools show a limpet or crab count; tap to gather at low tide; the patch thins and regrows. Reuses the tide clock. 1 day.
3. Boat line fishing: a shoal shadow under the water, drop the line, catch or nothing. Reuses boat motion and the shoal index. 1 day.
4. Fresh water: a tarp, a barrel and a rain gauge; stream trips shown as a chore counter. 0.5 day.
5. Drying rack with a gull flock that grows around it. 0.5 day.
6. Wreck stores and starting packs as the first-hour stock (a few clickable crates). 0.5 day.
7. First 12 species at low detail (seal, gannet, puffin, gull, shag, guillemot, tern, oystercatcher, otter, shoal, crab, kelp). 2 to 3 days (mostly from existing `animals.js`).
8. Garden bed: three found seeds, dig, sow, tend, harvest; birds visit. 1 day.
9. Tender trade: salvage for packs, with packaging litter. Reuses the collector economy. 1 day.
10. Nets and egg gathering with the colony index. 1 day.
11. Ecosystem links: shoal falls with effort, seals react to litter and nets, colony reacts to eggs. 1 day.
12. Sanctuary care as a food sink (rescue costs fish). Later, after the loop exists. 1 day.
Unlocks by rung: camp = 1, 2, 3, 4, 6; hut = rack, store, garden (5, 8); cottage = larder and many beds; slate cottage = salt barrels and trade goods (9 grows).
Order rule: build the loop that lets a player eat by hand first (1 to 3). Everything else adds a choice, not a need.

## 6 Open questions for Harry (taste items, short)
1. Are the sanctuary animals (seals, puffins, gannets) ever food? Real island communities did eat seabirds and their eggs. Options: never; only in a "hard times" mode; or old-style harvest of a small share with a visible cost. Default in this note: never.
2. Are gull and tern eggs allowed (the common colonies, small safe share)? Default: yes, with a warning bar.
3. If a settler is lost to long hunger, is that shown at all? Default: no, counted only, leaves by the tender.
4. Should a rescued seal pup compete with people for fish? That is the gentle moral tension of the sanctuary. Default: yes, with a choice.
5. Does the player see the shoal (a shadow) or only guess from the birds? Default: shadow plus birds.
6. Do we show a "stream" as a given on every island, or can an island have no fresh water (then it needs a tarp and the tender)? Default: every island has a seep.
7. Is the rain-fed garden a main aim or a nice extra? Default: extra, grows over game years.

## 7 Could not verify, common mistakes, checklist
Could not verify:
- Catch per hour of hand lines and nets for small-boat Atlantic fishing, and any figure for the inshore shoal of a small island.
- Limpet nutrition; any dry-weight ratio for stockfish; any dry spell length for the western islands.
- The safe egg share for a given colony.
- Kale yields on a cool island.
- Exact fish need of a seal pup in care (I used memory, not a page).
- Seal reaction to nets, as a rate.
- Wikipedia and several other pages were seen only as search summaries, not opened.
Common mistakes to avoid:
- Making shellfish a full meal for the party (it is a supplement).
- Showing a garden as quick food. It takes 100 days and good luck with the weather.
- Letting nets and lines take as much as wanted. Cap effort by hours and the dinghy.
- Drying fish with no gulls, rain or fuel.
- Making the tender a free meal. It always costs litter and time.
- Showing hunger as pain. Show it as slower, quieter, thinner portions.
- Showing a chased or harmed animal.
Checklist (visual and behavioural):
- A player can eat for a week using only the shore and a line.
- A player who only nets for a month sees a thinner shoal and a few fewer seals.
- A player who only trades for a month sees litter and seal departures, and can fix it.
- A gull flock grows near a rack.
- An egg ledge is full in May and empty by August.
- Hunger shows on the card first, in work speed second.
- Every rung changes at least one food or water thing.

## 8 Sources used (search extracts; none opened as full pages)
- Energy needs: https://www.fao.org/4/Y5686E/y5686e08.htm ; https://www.cfs.gov.hk/english/programme/programme_nifl/programme_nifl_public_Energy_requirement.html ; https://www.jniosh.johas.go.jp/en/indu_hel/doc/IH_57_3_283.pdf
- Water: https://sphereprototype.conted.ox.ac.uk/standards/watersupply/accessAndWaterQuantity.html ; https://warwick.ac.uk/fac/sci/eng/research/grouplist/structural/dtu/rwh/sizing
- Shellfish: https://www.pubmed.gov/26989020/ ; https://link.springer.com/doi/10.1007/s10745-007-9119-4 ; https://patient.info/nutrition/foods/mussels-raw ; https://matvaretabellen.no/en/periwinkle-common-norwegian ; https://food.gov.uk/business-guidance/biotoxin-and-phytoplankton-monitoring
- Seaweed: https://nutritionsource.hsph.harvard.edu/food-features/seaweed/ ; https://patient.info/nutrition/foods/seaweed-nori-dried-raw
- Fishing: https://www.seafish.org/responsible-sourcing/fishing-gear-database/gear/hand-lines/ ; https://www.cornwallgoodseafoodguide.org.uk/fishing-methods/hook-and-line.php ; https://core.ac.uk/works/122616598 (linefish collapse) ; https://iotc.org/sites/default/files/documents/2023/11/IOTC-2023-WPDCS19-INF03_-_Zeller2023.pdf (catch per effort falls with effort)
- Gannet dives and diet: https://agris.fao.org/search/fr/records/65de74d963b8185d9ca8ab15 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC5043317
- Preservation: https://www.wikipedia.org/wiki/Stockfish ; https://www.fao.org/flw-in-fish-value-chains/resources/articles/Fish-salting-101-What-you-need-to-know/en
- Crops: https://doaj.org/article/8b1f1d27fefe445fbee9b93ba243b428 ; https://genresj.org/index.php/grj/article/download/genresj.QGSB7051/149?inline=1 ; https://www.sasa.gov.uk/variety-testing/scottish-landraces/scottish-landrace-protection-scheme-slps/bere-barley ; https://gardeningplaces.com/articles/nutrition-per-hectare1.htm ; https://gov.scot/publications/economic-report-scottish-agriculture-2016/pages/32
- Seabird harvest and eggs: https://nrscotland.gov.uk/learning-and-events/all-features-and-articles/stories-from-st-kilda/ ; https://electricscotland.com/History/stkilda/chapter09.htm ; https://pmc.ncbi.nlm.nih.gov/articles/PMC7142145 ; https://sora.unm.edu/sites/default/files/47_2_179-183.pdf ; https://gov.scot/publications/feasibility-strategic-ornithological-compensatory-measures-scottish-context/pages/8
- Seabird breeding: https://www.nature.scot/doc/isle-may-nnr-annual-report-2018 ; https://www.bto.org/sites/default/files/bto-jncc-rspb-seabird-montoring-programme-annual-report-2024.pdf
- Repo notes: `research/WILDLIFE.md`, `research/ANIMALS_LOOK_AND_MOTION.md`, `research/FIRST_SHELTER_AND_MATERIALS.md`, `research/BEACH_COLLECTOR.md`, `EVOLUTION_TREE.md`, `ecosystem/ECOSYSTEM_TEST.md`.
