# Town builder: audit and draft ("Island Town")

Status: audit of what we have, a design draft, and a headless prototype in `games/living-islands/town/`. No page, asset, test or Blender file was edited. Written 25 Nov 2026.
Tags: VERIFIED (read or run here), MEASURED (computed by the prototype), PLAUSIBLE (standard knowledge), GUESS (a number to tune). Every price is in-game money. No real money, brands or places.
FIXED rules kept: people are counted and never tracked (no names, no personal data, no trails). The tone is hopeful. Nothing is gory. Robots are relics. All money is in-game.

## 0 The answer, short

**Owner question: how far were we from a SimCity-style or Tropico-style game?**

- We were closer on rules than on the game. We had the economic arithmetic. We did not have a town. [VERIFIED]
- What existed was one building at a time (City Lab), a small district of nine buildings on a grid, a power tree, a Gift ledger design, a food model, a climate model, an event deck and a map. None of it counted citizens as a town. [VERIFIED]
- What was missing was the glue: citizens as numbers, one goods graph over all buildings, a port, a monthly budget, happiness and migration. I wrote that glue in one headless prototype. It is about 1,000 lines of Python in the simulation, 230 in the runner and 400 in the tests (39 tests). [MEASURED]
- The glue was the easy part. The hard parts are the page (a placement tool, a dashboard), the art (houses are weak), and balance. [PLAUSIBLE]

Estimated distance, by pillar. Each percent is "how much of a first playable draft already existed", before and after this prototype. All percents are GUESSES (plus or minus 15 points).

| Pillar | Before | After the prototype | Why |
|---|---|---|---|
| Citizens, housing, jobs, needs, happiness as counts | 10% | 70% (rules), 5% (page) | City Lab had workers per building and `work_fraction` of residents. Nothing counted a town. The prototype has age bands, housing caps, jobs by rank, needs, drivers, migration. |
| Goods and supply chains across buildings and a port | 35% | 75% (rules) | `sim.js` chains inputs to outputs inside one building. The district layer shared stock by road reach. The prototype has one goods graph, a ledger that proves nothing is made from nothing, and a boat. |
| Roads, paths, logistics | 15% | 15% | Roads are open or closed cells and a depot. No path costs, no carriers. The prototype has no map at all (a cell budget only). |
| Placement, zoning, cost | 40% | 45% | The recipe validator, the support rule and the district grid are good for a building. There is no island placement tool. |
| Island services (power, water, food, health) | 45% | 65% | Power tree exists (`infra.js`). Rain, food and shoal models exist. Health and leisure were absent. |
| Trade, imports, exports, prices | 25% | 55% | Base Camp has a supply and demand price formula. The Gift note has prices and a tender. The prototype has a port with slots, saturation prices, and credit versus cash imports. |
| Politics and edicts (cosy) | 0% | 10% | Two edicts exist in the prototype (wage and rent). Factions are only drafted here. |
| Budgets and dashboard | 20% | 50% (rules), 5% (page) | The Gift ledger is a design. City Lab prints cash per minute. The prototype has a monthly budget and a yearly report card. |
| Scenarios and goals | 40% | 45% | The Gift year-end card and the event deck are rich. The town has no goal set yet. |
| Performance for thousands of entities | 20% | 40% | Counted citizens cost nothing. The 3D side is unmeasured (software GL only). |
| Art kit (houses weak) | 25% | 25% | Eight shore pieces, a cottage recipe, anonymous people options. Houses are the weak link, per the owner. |
| **All pillars together** | **about 25%** | **about 40% of the rules, about 12% of the whole game** | Rules are cheap. Page, art and balance are most of the cost. |

Headline findings from the prototype (seed 1, four years, three build plans) [MEASURED]:
1. Cash is the hard limit, not credit. A cottage kit costs 30,000 credit and 8,000 cash. The start has 60,000 cash and 940,000 credit. The credit is plentiful and the cash is not. This matches the Gift design: credit buys deliveries only.
2. While the credit lasts, the cash-best play is to sell your fish and eat delivered food. When the catalogue closes (year three and four) that flips. The town must carry itself.
3. The island has a carrying capacity. The fish shoal and the polytunnel garden feed about 30 to 40 people in the model. More people need imports, and imports need exports or credit.
4. Timber is finite. The woods island runs dry in about two years under a timber yard, unless a tree nursery is built.
5. Thinning shows as boat days, not as a number. A weekly boat on the open landing carries 12 slots, so exports fall by about 92% (trader plan, median of 8 seeds: 120,000 in year three, 10,000 in year four). The port, not production, is the bottleneck.
6. The default plan ends year four with 30 to 37 citizens, a peak of 34 to 38, and happiness about 77. Building nothing ends with no one on the island (they leave by boat, quietly).

## 1 What I read and ran

- Read: City Lab (`CITYLAB.md`, `DISTRICT.md`, `INFRA.md`, `RECIPE.md`, `sim.js`, `district.js`, `infra.js`, `supports.js`, `validate.js`, recipes) in the read-only worktree. Ran its pure tests: `validate-test` 171 of 171, `sim-test` 72 of 72, `support-test` 23 of 23, `district-test` 70 of 70, `infra-test` 55 of 55. [VERIFIED]
- Read the Living Islands notes named in the brief, plus `gift/events.json` and `gift/EVENTS.md`. Ran `gift/test_events.py` (29 tests OK) and `ecosystem/test_food_model.py` (14 ok). `gift/test_parcels.py` needs the landform tool, which is not in my sparse checkout, so I did not run it. [VERIFIED]
- Looked at the other games for economy code. Only Base Camp has one (the `ECON` block in its HANDOVER.md, in the `bc-economy` worktree). Sofa Siege, Captain Crumb, Baguettes and Ballistics and Room Kit have no wages, prices or ledgers worth reusing. [VERIFIED]
- Searched the web for two price anchors (below). Results are snippets only.

## 2 INVENTORY: what we can reuse

Maturity: P = proven by tests, D = designed in a note only, M = measured model, S = stand-in.

| System | File | What it does | Tests | Maturity | What a town builder can take |
|---|---|---|---|---|---|
| Building recipes | `city-lab/recipes/*.json` (9 recipes) | A building as data: parts, needs, jobs, power, production, sales, repair | validate 171 | P | The `systems` block (jobs, inputs, outputs, storage, costs) became the building rows in `town_data.json`. The part list is for the 3D side. |
| Recipe validator | `city-lab/validate.js`, `whitelist.js` | Strict check; 75 hostile files refused | 171 | P | The idea. I wrote a Python validator in the same spirit (unknown keys refused, mass check on transforms). |
| Building economy | `city-lab/sim.js` | Fixed 0.1 s step. Wages for filled places only. Ingredients charged on delivery. Power factor. Stock, spoil. Brownout. Repair by workers. State hash. | 72 | P | Wages rule, filled places, proportional power, spoilage, seeded hash. All reused in rules, not code. |
| District layer | `city-lab/district.js`, `district-validate.js`, `districts/*.json` | Homes, `work_fraction`, hire priority by commute, demand by road reach, shared power, shared deliveries | 70 | P (9 buildings) | Employment by priority and homes with capacity. The reach rule is the seed of a road model. |
| Power network | `city-lab/infra.js`, `infra-validate.js`, `infra/*.json` | Tree of cables with capacity. Rule A allocation. Sources at the root. | 55 | P | Power as a good. The tree is not needed on a small island. A cable tree could come back for a big town. |
| Support rule | `city-lab/supports.js` | A part falls if what it needs falls (graph rule). Matches the Sofa Siege game on 23 of 23 checks. | 23 | P | Storm damage by part. Not used in the counted prototype (damage is one number). |
| Shortage rule and findings | `LESSONS_FROM_CITYLAB.md`, `shared/cloud/C03b_ODDITIES.md` | Rule A: share a short supply in proportion to demand. Stock can hide a shortage. A faster oven pays only if it is the binding limit. | in sim and infra tests | P | `share()` in the prototype is rule A. The "show stock beside any saving" habit is in the report. |
| Gift ledger and catalogue | `research/THE_GIFT_DESIGN.md` section 4, `GIFT_WEEK_ONE_AND_SPINE.md` 2.4 | Cash 60,000 and delivery credit 940,000. Weekly ledger. Catalogue that thins by day. Reach curve. | none (design) | D | Start money, credit levels, boat interval by level, catalogue closing days, kit end days. |
| Gift prices and costs | `THE_GIFT_DESIGN.md` 4.1 and 4.2 | Build costs (cottage 85,000, jetty 18,000, cistern 6,000, hide 9,000, kiosk 42,000, boat 60,000), wages, occupancy by month, bed night 125 | none | D (anchors are snippets) | Building costs, occupancy table, bed night, cleaning, platform share. |
| Parcels and land price | `gift/parcels.py` | 304 parcels, suitability, price 238k to 1.57m | 44 checks (from the note) | M | Not used in the prototype. A second parcel would use it. |
| Food model | `ecosystem/food_model.py`, `FOOD_MODEL.md` | Eight food strategies, shoal, seals, gull colony, spoilage, 60 seeds | 14 | M | Fish yields, ration size (2,200 kcal), shoal logistic, spoilage. |
| Water and climate | `research/WATER_AND_RAIN_REAL_WORLD.md`, `globe/climate.py` | 0.8 litre per mm per m2, wet days, storms, lens | 162-line test file | M | Cistern yield, a weather generator with storm days. |
| Landform and Level 1 map | `level1/layout.py`, `validate.py`, `LEVEL1_DESIGN.md` | Six islands on a 416 m table, flat area, roles | test_layout | M | Flat cells per parcel (I use 420), roles of the woods island and the seal island. |
| Tide and weather | `level1/tide.py`, `weather.js`, `storm.js` | Tide table with spring and neap; weather states | tide in layout tests | M, page code | The prototype only uses a spring flag for deck triggers. |
| Event deck and letters | `gift/events.json`, `EVENTS.md`, `test_events.py` | 201 events, triggers, weights, effects, cause lines. 12 letters. | 29 | P | The prototype draws from it by trigger and weight and applies stock, cash, credit, food and delay effects. |
| Boats and delivery | `research/BOATS.md`, `boat_motion.js`, `GIFT_BOAT.md` | Boat sizes, speeds, tender, landing timing | page tests | M / S | Tender hold and seats are guesses (40 slots, 4 seats). |
| Robots as workers | `robots.js`, `ROBOT_RECIPES.md`, `collector_econ.py` | Collector robots and the tender rubbish loop | recipe tests | M | `robot_depot`: four unpaid workers at 60% pace. |
| Parcels, land | `THE_GIFT_DESIGN.md` 3.5 to 3.7 | Price formula, leases, grants | none | D | Later: a second island, bought with cash only. |
| Shelter ladder | `research/FIRST_SHELTER_AND_MATERIALS.md`, `ecosystem/shelter_ladder.py` | Camp, hut, thatched, slate cottage; labour and materials | tests | M | Home types and the local way of building. |
| Base Camp economy | `bc-economy` worktree `HANDOVER.md` (ECON block) | Price = base x (demand + 3) / (supply x 0.5 + 3); pedlar; market days | `economy-test.js` 41 | P (toy scale) | The price formula idea. The prototype uses saturation instead, because there is one boat. |
| People options | `PEOPLE_OPTIONS.md` | Anonymous figures; cost of 50 and 200 on screen | 15 checks | M | A few drawn figures stand for a count. |
| House art | `KIT_PIECES.md`, `recipes/home_cottage.json` | Eight shore pieces; one cottage recipe | kit tests | S (weak) | Needs a house family before a town looks like a town. |

## 3 GAP table against a Tropico or SimCity core loop

| Core-loop piece | What the genre needs | What we have | Gap | Size |
|---|---|---|---|---|
| Citizens as counts | Population by age, homes, jobs, needs, happiness | Prototype only | Page and tuning | M |
| Housing | Home types, quality, caps | 3 home types in data | Housing quality visible on the map | S |
| Jobs | Places, wages, unemployment | Prototype | Per-faction view | S |
| Needs and happiness | Food, water, power, health, leisure, safety | Prototype (9 drivers) | Real play balance | M |
| Goods graph | Chains between buildings, storage | Prototype (11 goods) | Carriers (see roads) | M |
| Port and boat | Capacity, schedule, weather | Prototype | Boat as a drawn thing with a cargo view | M |
| Roads and logistics | Paths, distance, jams | Road reach in district.js (binary) | Path costs, carriers, visible walkers | L |
| Zoning and placement | Place, price preview, snap, rules | Recipe validator and supports (one building) | Island placement tool on the real terrain | L |
| Services | Power, water, food, health | Power tree, rain, food model | Health, leisure, schools, fire/storm cover | M |
| Trade | Imports, exports, prices, contracts | Prototype slots and saturation | Contracts, a second market, price events | M |
| Politics | Factions, edicts, elections | Two edicts | Faction counts and a monthly meeting card | M |
| Budget and dashboard | Ledger, charts, alarms | Monthly budget in prototype | A calm dashboard on iPad | L |
| Scenarios and goals | Goals, report card, win and fail | Gift four-lens card | Goal cards, soft fail | M |
| Performance | Thousands of entities | Counts are free | Instanced houses and a few drawn figures; unmeasured on iPad | M |
| Art kit | Many house types, shops, workshops | 8 shore pieces, 1 cottage | A house family, shops, a dock set | XL |

## 4 DESIGN DRAFT: Island Town

A cosy, Tropico-like mode on one Living Islands parcel. You grow a small island town from a tent camp. You are the owner of the gift. You keep people fed, housed, working and content, and you learn to carry the island when the gift thins. [DRAFT]

### 4.1 Pillars

1. **Cosy but real.** Costs are real in shape and gentle in size. You cannot go bankrupt in a way that ends the game. Unpaid wages slow work a little and show as a note. [Gift pillar 1]
2. **The island sets the limit.** Fish, rain, wood and flat ground are finite. A town grows to what the island carries, then to what it trades. [MEASURED in the prototype]
3. **The sea is the way in.** One boat brings people, food, kits and tools, and takes your goods. Weather and the Gift decide how often. [Gift pillar 3]
4. **The gift thins.** Reach falls from 100 to 10 percent over four years. You feel it as fewer boats and fewer cards on the shelf. [GIFT_WEEK_ONE_AND_SPINE 2.4]
5. **Counted, never tracked.** "37 citizens: 9 children, 24 adults, 4 elders." No names, no faces in a list, no trails. A few drawn figures stand for the count.
6. **Hopeful.** People who cannot be fed leave by boat. Nobody dies on screen. A quiet town can be mended.

### 4.2 What a day and a year look like

A day (about 3 to 4 real minutes at the default speed; GUESS):
- Dawn: the town report line ("Food 9 days, water 31 days, boat in 2 days"). A letter or an event card may land.
- Morning: boat day, if the weather allows. Unload crates. Settlers and guests step off. Sales go out.
- Day: work happens as numbers. The player places and prices buildings, sets standing orders, and reads one dashboard card.
- Dusk: lamps. Citizens' mood lines. One small joy (a seal count, a clear night).
- Night: quiet. The ledger line writes itself.

A year (360 days, 12 months of 30, day 1 = 1 May, as in the deck):
- Spring: sowing, first guests, storms ease. Summer: guests peak (occupancy about 0.68 in August), solar high, fishing best. Autumn: storms, rain fills the cisterns, harvest. Winter: dark, fishing slow, power low, the lamp matters.
- Monthly: the budget card (wages, upkeep, rent, exports, guests). Yearly: the report card with four lenses (profit, wildlife, happiness, resilience), as in the Gift.

### 4.3 The building catalogue (26 rows, from `town_data.json`)

Costs have two ways. The **kit way** pays credit for a delivered kit plus a cash share for foundations and labour. It closes on a set day (kit end day, from the catalogue table). The **local way** pays planks and cash only and takes longer. Upkeep is 2.5 percent a year of the listed value (Gift anchor, GUESS). All numbers are GUESSES except where the note says a source.

| Building (id) | Kind | Workers | Inputs per day | Outputs or service | Cost: kit way (credit + cash) | Cost: local way | Upkeep a year | Cells | Reuses |
|---|---|---|---|---|---|---|---|---|---|
| Tent camp (`tent_camp`) | home | - | - | 12 housing (q 0.30) | - | £300 | £8 | 6 | first-shelter rung 1 (research/FIRST_SHELTER_AND_MATERIALS.md) |
| Turf and stone hut (`hut`) | home | - | - | 4 housing (q 0.50) | - | £1k + 10 planks | £45 | 4 | shelter rung 2; recipes/house.json for a drawn version |
| Family cottage (`cottage`) | home | - | - | 6 housing (q 0.85) | £30k + £8k | £10k + 30 planks | £950 | 8 | recipes/home_cottage.json, rung 3 or 4 |
| Guest cottage (`guest_cottage`) | lodging | 0.25 | 1.2 power | 4 guest beds | £60k + £15k | £26k + 40 planks + 4 glass | £1875 | 8 | recipes/home_cottage.json plus Gift holiday vision |
| Timber yard (`woodcutter`) | source | 3 | - | 9 timber | - | £4k + 6 planks | £104 | 4 | recipes/shed.json (a timber stack is data) |
| Tree nursery (`tree_nursery`) | support | 1 | - | 0.0004 forest regrowth per day | - | £3k + 4 planks | £78 | 10 | new; plants on the woods island |
| Sawmill (`sawmill`) | transform | 3 | 9 timber, 5 power | 6 planks | £12k + £4k | £8k + 20 planks | £400 | 6 | recipes/workshop.json (wood in, planks out) |
| Tool workshop (`workshop`) | transform | 2 | 2 planks, 0.3 metal, 3 power | 1 tools | £10k + £3k | £7k + 16 planks | £325 | 6 | recipes/workshop.json (City Lab wood to tools) |
| Fishing slip (`fish_dock`) | source | 4 | 0.04 tools | 70 fish | £14k + £5k | £8k + 16 planks | £475 | 6 | ecosystem/food_model.py boat line fishing and nets |
| Smokehouse (`smokehouse`) | transform | 2 | 40 fish, 0.5 timber | 18 food | - | £4k + 8 planks | £106 | 4 | food_model drying route; recipes/bakery.json (inputs in, loaves out) |
| Polytunnel garden (`garden`) | source | 2 | 6 water, 0.03 tools | 1.5 food | - | £3k + 10 planks | £82 | 40 | food_model garden beds (yield per m2 boosted, GUESS) |
| Rain cistern (`cistern`) | source | - | - | ~12 per mm water (rain on 150 m2), 300 water storage | £4k + £1k | £3k + 8 planks | £138 | 4 | research/WATER_AND_RAIN_REAL_WORLD.md (0.8 litre per mm per m2) |
| Lens well (`well`) | source | - | 1 power | 15 water | - | £5k + 4 planks | £128 | 2 | water note: freshwater lens |
| Solar shed (`solar_shed`) | source | - | - | 20 power | £10k + £2k | none | £300 | 6 | City Lab infra.js source (kW at the root) |
| Wind post (`wind_post`) | source | - | - | 30 power | £14k + £3k | none | £425 | 2 | City Lab infra.js source; wind cuts out in a storm |
| Battery shed (`battery_shed`) | storage | - | - | 60 power storage | £9k + £1k | none | £262 | 4 | City Lab infra.js junction (a store) |
| Store shed (`store_shed`) | storage | - | - | 200 timber, 200 planks, 300 food, 30 tools, 30 metal, 60 fish storage | - | £3k + 8 planks | £81 | 4 | recipes/shed.json |
| Kiosk and cafe (`kiosk`) | shop | 2 | 1 power | 30 x 9 kiosk sales (guests x pounds) | £25k + £10k | £12k + 24 planks | £875 | 4 | recipes/bakery.json, recipes/cart_stall.json (sales block) |
| Wildlife hide (`wildlife_hide`) | service | 0.5 | - | 0.15 attract | - | £4k + 10 planks | £108 | 2 | Gift conservation vision; shed recipe |
| Clinic (`clinic`) | service | 2 | 1.5 power | 60 health | £20k + £6k | £15k + 30 planks | £650 | 6 | house recipe with a jobs block (nurse) |
| Community hall (`community_hall`) | service | 1 | - | 80 leisure | - | £12k + 40 planks | £330 | 8 | recipes/market_hall.json |
| Lamp and lighthouse (`lighthouse`) | service | 0.5 | - | 0.4 safety | - | £20k + 60 planks | £545 | 2 | LIGHTHOUSE_BUILD.md, light_range.js |
| Jetty (`jetty`) | port | - | - | 40 port slots per call | £12k + £4k | £9k + 30 planks | £400 | 4 | Gift landing stage; recipes/shed.json |
| Quay and crane (`quay`) | port | 1 | - | 90 port slots per call | £60k + £25k | £50k + 100 planks | £2125 | 10 | supports.js rule for the frame; research/BOATS.md |
| Cargo boat (`cargo_boat`) | boat | 2 | - | 100/8 boat hold/seats | £40k + £12k | none | £1300 | 0 | research/BOATS.md; boat_motion.js |
| Relic robot depot (`robot_depot`) | robots | - | 0.05 tools | 4 robot workers | - | £3k + 5 metal | £75 | 6 | robots.js, ROBOT_RECIPES.md (relics as workers) |

Notes:
- Jobs are paid at 350 a month per filled place (GUESS; the minimum wage anchor is 12.71 an hour, so this is a cosy island co-op wage with housing and food provided).
- Fish slip: 70 kg a day at full strength. The research gives 3,500 kcal an hour on a calm day with a dinghy; four people for five hours is 70 kg. [FOOD_AND_WILDLIFE]
- Garden: 1.5 rations a day from 40 cells. This is about six times the research yield per square metre. GUESS, to make a garden worth a building. The real number would make it near useless.

### 4.4 The citizen model, as counts

- **Bands.** Child (to 15), adult (16 to 64), elder. Ageing is a flow: child to adult in 16 years, adult to elder in 48, elders move on gently after about 12 years.
- **Housing.** Each home has a capacity and a quality. Total population can never exceed total capacity. Births, arrivals and aging all respect it. A quality-weighted share feeds happiness. [TESTED]
- **Jobs.** Labour is adults x 0.85 plus elders x 0.15. Places are filled in a stated priority order (rank): water, food, power first. Only filled places are paid. This is the City Lab rule. A person who cannot reach work costs nothing, and the slip is shown.
- **Needs per person per day.** Food 1 ration (2,200 kcal), water 1 unit (10 litres), power 0.4 kWh. Guests need 1, 1.5 and 0.5. [FOOD_AND_WILDLIFE: 2,200 kcal and 10 litres; Sphere standard]
- **Fish as food.** Raw fish feeds at 2.2 kg a ration. Smoking keeps it for weeks.
- **Happiness (0 to 100).** Weighted drivers, smoothed: food 22, water 14, housing 14, power 6, jobs 12, health 8, leisure 8, wages 6, beauty and wildlife 10 (GUESS).
- **Hunger and thirst.** Build slowly, ease fast. Distress raises the leaving rate (up to 2 percent a day). They leave by boat. No death counter exists in the model.
- **Migration.** Settlers arrive on boat days: up to half the seats, no more than free homes, no more than vacancies x 0.6, scaled by happiness above 50. They leave when unhappy, hungry, long unemployed or without a home.

### 4.5 Goods and trade

Goods (unit, mass, slots on a boat, base price). All GUESSES; the anchors are below.

| Good | Unit | Mass | Slots (50 kg each) | Base price | Note |
|---|---|---|---|---|---|
| timber | bundle | 150 kg | 3 | 9 | woods island, finite |
| planks | bundle | 100 kg | 2 | 30 | 3 timber make 2 planks |
| fish | kg | 1 kg | 0.02 | 6 | spoils 8% a day |
| food | ration | 0.8 kg | 0.016 | 18 | cured fish; 2.2 fish a ration |
| water | 10 litres | - | not shipped | 1 | rain, well |
| power | kWh | - | not shipped | - | sun, wind; battery carries over |
| tools | tool | 5 kg | 0.1 | 60 | 2 planks and 0.3 metal each |
| metal, glass, rope | unit | 5, 20, 5 kg | 0.1, 0.4, 0.1 | 40, 80, 20 | found, bought, salvaged |

- **Port.** Open landing: 12 slots per call. Jetty: 40. Quay: 90. Boat hold: 40 (tender), 100 (cargo boat). Seats: 4 or 8. A storm stops the boat. Fog stops it three days in ten without a lamp.
- **Boat days.** Every 1, 2, 4, 6, 7 days at credit level 4 to 0. [GIFT_WEEK_ONE_AND_SPINE 2.4]
- **Imports.** The player sets standing orders (a good and a stock level). Credit pays first for goods the catalogue still holds, at face price. Otherwise cash pays at 1.35 x (island premium, GUESS; the note's 1.6 is for building work).
- **Exports.** Anything above a keep level is sold at 0.8 x base price x a saturation discount, e^(-sold/depth), which recovers by 10% a day. A glut sells cheaper.
- **Credit levels and catalogue.** Level 4 and 3: all goods. Level 2: no glass, no timber. Level 1: tools, food, rope. Level 0: tools and rope. Kits end on their own days (620 for cottages and kiosk, 780 for glass items and power kits, 850 for the jetty, boat and quay). [GIFT_WEEK_ONE_AND_SPINE 2.4]
- **Price anchors I searched.** Average value of all fish and shellfish landed in Scotland in 2023 is about 1.4 to 1.6 per kg (my division of the published totals, 332 thousand tonnes for 517 million; 501 thousand tonnes for 683 million). Lobster is about 13.8 per kg and herring about 0.68 per kg (2022). So my fish price of 6 is a GUESS for a mixed creel and line catch and is high against the average. UK softwood imports averaged 268 per cubic metre in early 2025 and roadside sawlogs 55 to 60 per cubic metre (Forest Research, 2025 and 2026). My plank price of 30 a bundle is low against that (a bundle is about 0.2 cubic metres, so about 54). Both are snippets, not tables. [PLAUSIBLE]
- **Sources (snippets only).** [Scottish Sea Fisheries Statistics 2023](https://gov.scot/publications/scottish-sea-fisheries-statistics-2023/pages/3-landings-into-scotland), [Forest Research timber price indices](https://www.forestresearch.gov.uk/news/timber-price-indices-to-september-2025-released/), and the Gift design sources for wages, cabins, jetties and occupancy (listed in `THE_GIFT_DESIGN.md` section 8).

### 4.6 Costs and incomes

- **Start.** Cash 60,000. Credit 940,000. A tent camp for 12 (3 children, 8 adults, 1 elder). 30 planks, 90 rations, 100 water, a few tools. [THE_GIFT_OPENING_HOUR]
- **Incomes (a month).** Exports. Guest bed nights (31 each, minus 15 percent to a booking platform). Kiosk sales (9 a customer). Rent (30 a head). Event cash and grants.
- **Costs (a month).** Wages (350 per filled place). Upkeep (2.5 percent a year of value). Cleaning (35 a stay). Repairs (150 a building per full repair). Boat running (520 for the cargo boat). Cash imports.
- **Cash co-pay.** The kit way takes 12 to 30 percent of the price in cash. This is why cash binds before credit does. (Anchor: foundations 80 to 150 per square metre.)
- **Cosy rules.** A short purse pays wages in proportion (rule A) and carries the rest as arrears. Work slows to at most 85 percent of full, never to zero. A repair never waits for cash. Cash cannot go below zero.
- **Worked example (MEASURED, trader plan, year two).** Exports 101,504. Rent 10,200. Wages minus 67,287. Build cash minus 29,000. Repairs minus 3,510. Upkeep minus 6,750. Event cash 1,800. Net +6,958.

### 4.7 Mild politics: four factions, edicts, no election

Factions are counts, not people. They come from the job mix (the prototype does not compute them yet; this is the draft).
1. **Fishers** (fish slip, smokehouse, boat crew). Want: harbour, tools, calm days.
2. **Growers and makers** (garden, timber yard, sawmill, workshop, robot depot). Want: water, power, planks.
3. **Hosts** (guest cottages, kiosk, hall). Want: beds, views, quiet shores.
4. **Keepers** (hide, lighthouse, clinic, wildlife). Want: no building on the habitat shore, a lamp, care.

Each faction has a contentment count (0 to 100) and a support count. Once a month a **town meeting** card shows three asks, each with a price and a trade-off. Choosing one lifts one faction and lowers another a little. No faction can leave, riot or remove you. The worst case: a faction goes quiet, which lowers its drivers and one of the four report lenses.

Edicts (cosy, reversible, each shown with its monthly cost):
- **Wage level** (0 to 1.5 x). Built in the prototype (the homestead plan uses 0.15 and zero rent: a shared-work island).
- **Rent level** (0 to 1.5 x). Built.
- **Ration share** (full, lean). Draft.
- **Quiet days** (no boat on market-free days; helps wildlife). Draft.
- **Shore closed** (habitat shore off limits; Keepers up, Fishers down). Draft.
- **Market day** (more guests one day a week). Draft.

### 4.8 Threats and how the event deck plugs in

Threats: storms (damage a share of output; a lamp halves it), shortages (the proportional rule, shown), a dry spell, a failed catch, the shoal thinning, unpaid wages, the thinning gift. All mild and mendable.

The prototype plugs the deck in as follows. Once a day it builds a day state (day, season, weather, spring tide flag, credit level, flags from buildings, stock, cash). It fires every eligible `force` event. With chance 0.62 it draws one more by weight, and with 0.12 a second. Far places need the boat flag (a fish slip or cargo boat). It applies stock, cash, credit, food days, guest counts, seal and bird counts and delivery delay. Every change goes through the goods ledger. About 510 to 630 events fire in four years. [MEASURED]

Limits: the deck was written for one islander on the Level 1 map. Its stock numbers (4 planks, 2 rope) are small for a town. In the draft each event gets a **town scale** (x pop / 12 for stock; letters and strangers unchanged) and a few town-only events are written (a family asks to settle, a market day, a faction request). Attitude points are ignored in the prototype.

### 4.9 Goals and the report card

Goals are cards, none forced: "Everyone housed", "A winter with water to spare", "Ten seals counted", "Feed the island from the island for a month", "A guest season with no empty bed in August", "A quay", "A year with the repair fund whole".
The year-end card keeps the four lenses from the Gift: profit, wildlife, happiness, resilience (food days, water days, repair fund). No combined grade. A fifth line, **carrying**, says how many people the island feeds on its own and how many on trade. [DRAFT]

### 4.10 UI sketch for iPad (landscape)

```
+---------------------------------------------------------------+
| Day 214  Autumn   Boat in 2 days   Reach o o o o o o o . . .  |  top bar: calendar, boat, Gift lamps
+-------------------------------------------+-------------------+
|                                           | CITIZENS 37       |
|        the island table                   |  9 / 24 / 4       |
|   (tap a plot: build menu with            |  homes 40  jobs 29|
|    price shown before you place)          | MOOD  77 ----o--- |
|                                           | food  water power |
|   [boat at the jetty, crates]             | BUDGET this month |
|                                           |  in 6,210 out 5,880|
+-------------------------------------------+-------------------+
| Build  Orders  Edicts  Meeting  Ledger  Chart   (one finger)  |
+---------------------------------------------------------------+
```
Rules: one-finger tap and drag; no text entry; every number has a cause line on tap; counts shown as text and as a few drawn figures; no pop-ups for the thinning, only lamps and shelves (as in the Gift spine). [DRAFT]

### 4.11 How it relates to The Gift and to other modes

- It is a fifth vision on the shared core (islands, ledger, build tool, counts, weather, wildlife). The Gift lists Holiday Island, Conservation, Homestead and Fortress. Island Town is what happens when a Holiday or Homestead run keeps growing past a house or two.
- It uses the Gift's start money, the thinning curve and the deck. It does not change the first hour or the first day.
- Scale: the Level 1 table is 416 m with about 1,700 m2 of flat ground on the home island. That holds one tent camp and a few buildings. The town needs a bigger parcel or the woods island. The prototype uses 420 cells (1,680 m2). [GUESS] This is the biggest open design question (section 6).
- Holiday mode is a subset of the town (a few guest cottages). Conservation is the Keepers faction. Fortress is separate.
- Co-op or visit: neighbours could visit your town as counts. Not drafted.

## 5 DIFFICULTY and EFFORT

Developer days, one developer, plus or minus half. All are GUESSES.

| Rank | Work package | Days | Needed for |
|---|---|---|---|
| 1 | Headless prototype (this one: data, validator, sim, 39 tests, report, charts) | 6 to 8 by hand (done in one session here) | prototype |
| 2 | Tune the three build plans and the price table against the sources | 3 | prototype |
| 3 | Port the sim to JS beside City Lab `sim.js` (or ship Python through a build step) and match it test for test | 6 | page |
| 4 | Placement grid on the real parcel, price preview, snap, validator in the page | 8 | page |
| 5 | Dashboard, ledger, report card, orders and edicts screens on iPad | 9 | page |
| 6 | Citizens and housing panels, a few drawn figures for the count | 4 | page |
| 7 | Deck and letters in the page (cause lines, cards) | 4 | page |
| 8 | Boat and port as drawn things (reuse `boat_motion.js`) | 4 | page |
| 9 | Save and load, one slot | 2 | page |
| 10 | End-to-end tests, touch run (needs an iPad) | 5 | page |
| 11 | Balance passes by play-through | 8 | page |
| | **Simple playable page (packages 1 to 11, with the prototype done)** | **about 55** | |
| 12 | House family (10 to 14 houses), shops, workshops, dock set, in the kit style | 25 | polish |
| 13 | Factions, meeting cards, six edicts, town-scaled events | 12 | polish |
| 14 | Roads or paths, carriers, a visible supply chain | 15 | polish |
| 15 | Sea, light and weather integration at table scale | 8 | polish |
| 16 | iPad performance passes (instancing, LOD; measure on device) | 10 | polish |
| 17 | Onboarding, goals, tutorial hints | 8 | polish |
| 18 | Sound | 6 | polish |
| 19 | Second parcel, chart, trade across parcels | 20 | polish |
| 20 | Long balance and QA | 20 | polish |
| | **Polished game (page plus 12 to 20)** | **about 180** | |

Reading: a headless proof is cheap. A playable page is one to two developer-months. A polished game is most of a year. The page and the art are most of the cost, not the economy. [PLAUSIBLE]

Difficulty ranking, easiest first: counted economy, deck, ledger, dashboard, placement, houses (art), roads and carriers, iPad performance at scale.

## 6 Risks and open taste questions

Risks:
- The ledger can feel like a spreadsheet. Keep it calm, with a picture per line.
- Cash binds before credit. A new player may feel poor with 940,000 in credit. The first hour must show what the credit does.
- Island carrying capacity (30 to 40 here) may feel small for a "town". Tropico has hundreds. See question 1.
- Counted people may feel abstract. A few drawn figures help (PEOPLE_OPTIONS.md).
- The thinning gift can feel like a punishment if the report card does not praise carrying yourself.
- Houses are weak. A town of poor houses looks worse than one hut.
- Deck events are written for one person and may sound odd in a town.

Open taste questions for the owner:
1. How big is a town? 30 to 40 people on one parcel, 100 to 300 on a larger island, or several parcels?
2. Is the thinning gift part of this mode, or a mode where the gift never thins?
3. Should wages exist at all, or is the town a shared-work island with pocket money?
4. Is the carrying line on the report card welcome, or does it say one way is right?
5. Four factions or none? Meeting cards or edicts only?
6. Do guests belong in a town, or is this a homestead mode?
7. Roads: needed from day one, or a late-game layer?
8. Should the first playable be 2D cards on the chart, or the diorama?

## 7 What the prototype is and is not

It is a headless, seeded, deterministic simulation with a validator, a goods ledger, 39 tests, and a four-year run for three build plans. See `games/living-islands/town/TOWN_PROTOTYPE.md`. It is not a game. It has no map, no roads, no page and no art. The three plans are stand-in players. Every number is a guess. No real-GPU claim is made. The 3D side was not touched.

## 8 Sources

- Our notes and code: `THE_GIFT_DESIGN.md`, `GIFT_WEEK_ONE_AND_SPINE.md`, `THE_GIFT_OPENING_HOUR.md`, `FOOD_AND_WILDLIFE.md`, `ecosystem/FOOD_MODEL.md`, `WATER_AND_RAIN_REAL_WORLD.md`, `FIRST_SHELTER_AND_MATERIALS.md`, `LEVEL1_DESIGN.md`, `BUILDERS_OVERVIEW.md`, `THE_GIFT_VISION.md`, `gift/events.json`, `gift/EVENTS.md`, City Lab files on branch `game/city-lab`, Base Camp `HANDOVER.md` (economy block).
- Web (snippets only): [Scottish Sea Fisheries Statistics 2023](https://gov.scot/publications/scottish-sea-fisheries-statistics-2023/pages/3-landings-into-scotland); [Forest Research, timber price indices](https://www.forestresearch.gov.uk/news/timber-price-indices-to-september-2025-released/).
