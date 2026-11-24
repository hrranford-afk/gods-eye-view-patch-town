# The Gift: design note (pillars, visions, world chart, land, money, Level 1)

Status: design note plus a headless prototype (gift/parcels.py, gift/test_parcels.py, report in gift/GIFT_PROTOTYPE.md). No page was touched.
Tags: VERIFIED (read in a source or measured here), PLAUSIBLE (standard knowledge, not re-read), UNVERIFIED (heard or guessed), TUNING (a starting number to balance, a guess). Every game price in this note is in-game money, written with a pound sign for flavour. No real money exists in the game.
Sources: web search only. For most sources below only the search snippets were reachable, not the full pages. Where that matters it is said.
Rules kept: people are counted, never tracked (guests and locals are numbers). Tone hopeful. Nothing gory. Robots are relics. Real names (places, bodies, companies) appear only here, in the sources; the code and the data use none.

## 0 One page summary

- The Gift: you inherit £1,000,000 and one island group. What you do is up to you. Nothing is forced. (From EVOLUTION_TREE.md.)
- The world is a scrollable sea chart of parcels. A parcel is an island group (3 to 8 islands over about 1.5 km). Parcels are generated from a seed, the planet seed and the parcel's place on the planet. Zoom in and the tabletop diorama opens. PLAUSIBLE, and the prototype proves the registry, climate, score and price parts.
- Land has a price. The price comes from a suitability score (beach, flat ground, harbour, view, wildlife, fresh water, boat-trip gaps, minus hazards), then size, climate comfort and remoteness. Remote land is cheaper to buy and dearer to reach.
- You find parcels by survey voyages. Fog of war has four levels. A survey costs money and days.
- Four visions share one core (islands, ledger, build tool, guests as counts, weather, wildlife reaction): Holiday Island, Conservation, Homestead and Fishing, Fortress and Skirmish (later). A year-end report card scores one run through four lenses (profit, wildlife, happiness, resilience). Any aim is valid.
- The prototype made a chart of 304 parcels (60 by 30 degrees of the invented planet), priced them from £238k to £1.57m (median £563k), and passes 44 checks. The whole planet holds about 6,400 parcels at the proposed density.
- Level 1 is one parcel, £1,000,000 and five buildable things. About 42 developer days, about 62 for the full list. Estimates are guesses (plus or minus half).

## 1 Pillars and the first hour

### 1.1 Pillars

1. **Cosy but real.** Money matters because things cost what things cost, not because it is a trap. You cannot go bankrupt in a way that ends the game. The worst case is a quiet year and a lower score on one lens.
2. **Geography decides.** A sheltered bay, a spring, a flat meadow and a good beach are different gifts. You read the land and choose.
3. **The sea is the way in.** Everything arrives by boat: guests, supplies, drift, the tender. Weather decides when.
4. **Any aim is valid.** Profit, wildlife, happiness and resilience are four lenses on the same year. No lens is the right one.
5. **Counted, never tracked.** Guests and locals are numbers: "38 guests this week". No one has a name, a face in a list or a trail.
6. **Hopeful.** Bad weather, a quiet month and a failed crop happen. They can be mended. Nothing is gory. Robots are relics that help or do not.

### 1.2 The first hour of a new player (PLAUSIBLE, a script to test with Harry)

- 0 to 5 min. A letter: "You have been left an island group, and £1,000,000. Do what you like with it." The ledger opens: £1,000,000 cash, no debts. A tender ship drops you at the landing. The diorama table fades in: a calm morning, a gull, the tide going out.
- 5 to 15 min. Walk the shore. A soft "survey card" fills in as you look: beach (good), flat ground (two meadows), harbour (one bay), fresh water (a burn, thin), view (the headland). The card is the suitability score in plain words, not a number.
- 15 to 30 min. First builds. A jetty (so the tender can land things). A cistern or a well. One cottage. The ledger shows each cost. The build tool shows the price before you place.
- 30 to 45 min. The first guests are a count: "2 guests booked for next week". Weather moves in. The tender brings supplies on its timetable. A seal watches from a skerry.
- 45 to 60 min. A choice fork, never a quiz: build a hide for the birds, add a second cottage, buy a boat, or open the chart and see what else is out there. The chart shows your parcel, a few rumours (fog level 1) and the sea between. The hour ends with a first small month-end note: income, costs, one wildlife line, one happiness line.

### 1.3 What makes money matter without punishing

- Everything has a visible price, and a visible running cost per month. No hidden fees.
- Costs are real in shape (building, upkeep, staff, boat running, insurance-like repair funds) but the numbers are gentle (section 4).
- Slack is built in: a repair fund is a normal ledger line, not a surprise. Storm damage is repaired from it.
- Debt is optional and small: a "bank" offers one soft loan at a fixed rate. Never a spiral.
- If cash runs out you cannot build or buy; the game goes on. Guests still come. Income still arrives. The ledger turns green again in time. (TUNING, to prove in balancing.)
- Nothing sells you short for being kind. A conservation run earns less cash but grants and goodwill cover the basics.

### 1.4 The year-end report card

One card, four lenses, each 0 to 100 with a plain sentence. Your choice of aim shows as a highlighted lens; the others still show.

| Lens | What is counted | Example sentence |
|---|---|---|
| Profit | net cash change over the year, as a share of what you spent; return on what you built | "You earned £41,000 after costs." |
| Wildlife | counts of seabirds, seals and plants against last year; habitat area kept; disturbance days | "Seals on the east skerry rose from 12 to 15." |
| Happiness | guest satisfaction (a count of happy, fine, unhappy stays), local contentment (a number), small joys (first sight of a seal, a clear night) | "9 in 10 guests said they would come again." |
| Resilience | water in a dry spell, repair fund, food days, how much storm damage was mended, spread of income | "A big storm cost £6,000 and the fund covered it." |

Rules: the lenses are computed from the same ledger and the same counts (no extra hidden state). A run can top one lens and be middling on the rest. There is no combined grade. (A single combined "score" would say one aim is the real one. The note keeps it off.) TUNING for all curves.

## 2 The shared core and the visions

### 2.1 The shared core

- **Islands and parcels.** A parcel is an island group. Everything below happens on a parcel you own.
- **Ledger.** One list of dated lines: cash, income, cost, grant, loan, repair fund. Monthly and yearly totals. Saved with the game.
- **Build tool.** One tool for placing and repairing kit pieces (jetty, cottage, hide, cistern, boathouse). Uses the kit and repair-parts method already in KIT_PIECES.md and REPAIR_PILOT.md. Price shown before placing.
- **Visitors as counts.** A guest is one tick in a count: arrivals per week, nights, happy or not. No agent walks the island for each guest; a few drawn figures stand for the count (the people options in PEOPLE_OPTIONS.md).
- **Weather.** The existing weather and sky pieces. Weather decides tender days, boat trips, comfort, and storm damage.
- **Wildlife reaction.** Seals, seabirds and plants respond to what you build and do (the sanctuary loop in ECOSYSTEM.md and FOOD_AND_WILDLIFE.md). Disturbance near haul-outs and colonies lowers counts. Quiet raises them.
- **The tender and the sea.** The tender ship is a relic with a timetable. It brings supplies and takes rubbish and sales. Its route follows the real sea of the chart (section 3.9).

### 2.2 Holiday Island

- **Buildings.** Jetty, cottage, chalet pair, camping meadow, small café or kiosk, sauna or hot tub shed, boathouse with boat trips, path and viewpoint bench, cistern or well, solar and battery shed.
- **Goals.** Fill the summer, keep the shoulder months alive, reach a "loved by guests" rating, add one signature thing (a floating sauna, a stargazing night).
- **Income.** Nightly rates (cottage, chalet), camping pitches, café sales, boat trips, extras. Seasonal (section 4.3).
- **Costs.** Build, upkeep (a share of build cost per year), cleaning per stay, staff (host, cleaner, boatman as counts), boat running, utilities, booking platform share, repair fund top-up.
- **Scoring.** Mainly Profit and Happiness. Wildlife enters as a "views and seals" bonus to happiness and as a limit (too much noise lowers counts). Resilience from water and storm cover.

### 2.3 Conservation

- **Buildings.** Hide, boardwalk, warden hut, wildlife boat, nest boxes, fencing against trampling, a small visitor centre, a quiet landing, rubbish clearing kit, seed and planting beds.
- **Goals.** Raise counts (seabird pairs, seals on skerries), restore a habitat (machair, wet meadow), keep disturbance days low, hold a covenant.
- **Income.** Grants for conservation land (section 3.7), paid small visits to hides, donations (a count-based number), a gift shop, research hosting.
- **Costs.** Warden wages, boat running, materials, monitoring, covenant compliance (no building on the habitat shore).
- **Scoring.** Mainly Wildlife and Resilience. Profit is allowed to be modest; a good run breaks even.

### 2.4 Homestead and Fishing

- **Buildings.** Cistern and well, garden and polytunnel, byre or hen house, smokehouse, small fish store, creel shed, boat slip, tender landing for trade, a mill later (rivers on big islands).
- **Goals.** Feed everyone on the island from the island, then trade surplus on the tender. Keep the water going through a dry spell.
- **Income.** Fish and shellfish sales, vegetables, eggs, smoked goods, tender trade (section 3.8). Little cash, much food.
- **Costs.** Boat, gear, seed, repairs. Food and water are counted in days, not money.
- **Scoring.** Resilience first (food days, water days). Profit modest. Wildlife is a limit: over-harvest shrinks colonies and trust falls, as decided in the food decisions in EVOLUTION_TREE.md.
- **Real-world rules kept** (owner decisions): hunger is gentle but real; some islands have no fresh water; a rain-fed garden is slow and can fail.

### 2.5 Fortress and Skirmish (later)

- **Buildings.** From DIGGING_IN_GEOGRAPHY.md and the fort kit: dugouts, trench bays, revetments, observation posts. The built star fort is a found ruin to repair, not a start item.
- **Goals.** Quiet builder first (dig a base, repair ruins). Skirmish after that, as a separate co-op mode, damage resetting between games.
- **Income and costs.** Mostly materials and time. Little cash. Tourism of ruins is a small income for a Holiday run.
- **Scoring.** Resilience. Nothing gory; no named people.

## 3 The world chart and land acquisition

### 3.1 The multi-scale structure

Islands are separated by sea, so the world needs no seamless terrain. Four scales (PLAUSIBLE):

| Scale | What you see | Unit | Data behind it |
|---|---|---|---|
| Planet map | the whole invented globe, land, currents, climate bands, rain belts | 72 by 36 cells of 5 degrees (about 556 km) | globe/ (planet, circulation, climate) |
| Regional sea chart | a nautical-style chart; parcels as symbols on 1 degree squares (about 111 km) | chart square | the parcel registry (baked) |
| Parcel | the island group, as a chart plate of 1.5 km, then the diorama | about 1.5 km | seeded generator (landform) |
| Island table | the tabletop diorama you build on | 256 m window at 2 m cells | landform windows |

You scroll the regional chart by dragging. You zoom out to the planet map and in to a parcel plate. Zooming into a parcel you own opens the table. Zooming into one you do not own opens a look-only plate (fog level decides how much).

### 3.2 How a parcel is generated, deterministically

Inputs: planet seed S, chart square (ci, cj), the planet's climate and currents at that position. Nothing else, no stored state. (The prototype does exactly this.)

1. **Does the square hold a parcel?** A hash of (S, ci, cj) is compared with a probability that depends on the distance to land: next to a coast 0.33, one cell off 0.18, open sea 0.05 (TUNING). Squares on land or ice never do. Result: parcels cluster along coasts, with rare remote ones.
2. **Where inside the square?** Two more hashes, kept 0.15 degrees from the edge. Two parcels can never touch.
3. **Local climate.** Sample climate.py at the position: monthly air temperature, rain, storm index, sea temperature. Gives warmest and coldest month, annual rain, a comfort number.
4. **The island group.** A seed from (S, ci, cj) picks the rock province (gneiss, sandstone, basalt, volcanic) and drives the landform tool (landform/world.py make_world) for a 1.5 km group. Island count is 3 to 8. The sea level, tide range and wave direction follow the climate (more storm, more exposure).
5. **Score and price.** Computed from the generated heightfield (section 3.5).
6. **Wash-up.** The drift table of the parcel's ocean cell (section 3.10).

The prototype uses the 12 exported 256 m windows as stand-ins for step 4 (picked by hash with one of 8 flips and rotations, so 96 looks). Full generation of a 1.5 km group is not done and not timed (UNVERIFIED cost).

### 3.3 How many parcels to ship

| Layer | Number | Why |
|---|---|---|
| Level 1 | 1 | one parcel, no chart |
| First chart region | about 300 (the prototype made 304 in a 60 by 30 degree window of the temperate belt) | enough to scroll for a long time, small enough to bake and to read |
| The whole invented planet | about 6,400 (counted with the same density rule) | one fixed world for v1 |
| Beyond | unlimited from other planet seeds | "new world" button; same generator |

Only the region is shown in v1; the rest of the planet is fogged and revealed as the region fills. Pre-generating all of it overnight is cheap (section 3.12). TUNING for the density.

### 3.4 What a parcel contains

- An island group of 3 to 8 islands over about 1.5 km (one main island, the rest small islands and skerries).
- A harbour candidate (a sheltered bay, or none).
- Hazards: cliffs, shoals and reefs, a storm-exposed side.
- Wildlife: seabird ledges, skerries for seals, habitat types from the veg classes.
- Resources: flat buildable ground, fresh water potential (burn, lake, freshwater lens), building stone by rock type, a beach for sand.
- A name card: invented, never real. No real place name is ever used.
- Washed-up finds: what the drift table delivers here.

### 3.5 Suitability score and price

Seven parts, each 0 to 1, from the window data (the prototype computes all of them from arrays, not from a lookup):

| Part | How it is computed | Weight |
|---|---|---|
| beach | length of sand and shingle shore, weighted by shelter of the water next to it; saturating at about 250 m | 0.15 |
| flat | land with slope under 0.15, at least 1.5 m above the sea (tide range plus storm margin), not wet; saturating at about 1,500 m2 | 0.20 |
| harbour | water near land, at least 1.5 m deep, enclosed by land in at least 55 percent of 16 directions within 60 m, low wave exposure, with flat ground close; saturating at about 6,000 m2, scaled by shelter | 0.20 |
| view | height of the highest point and the share of 16 directions with a clear line of sight to open water from it | 0.10 |
| wildlife | skerries (haul-outs), cliff length (seabird ledges), habitat variety, wet ground, quiet beach | 0.12 |
| water | the better of a stream (catchment from hydrology.py, scaled by local rain) and a freshwater lens (climate.py freshwater_lens, recharge 0.45 of rain, usable thickness of 4 m is full marks); a lake adds a little | 0.15 |
| gaps | share of islands whose nearest neighbour is 20 to 250 m away (good for short boat trips), times a size term | 0.08 |

Hazard (0 to 1) = 0.35 cliff share of shore + 0.25 mean exposure + 0.20 shoal area + 0.20 storm index. Suitability S = (weighted sum) times (1 minus 0.30 times hazard).

Price (in-game pounds):

P = A x exp(K x (S - 0.5)) x (tiles / 1.8)^0.6 x (0.85 + 0.5 x comfort) x remote(km)

with A = £450,000, K = 3.4, tiles = 0.6 per island of the group (so size grows with island count), comfort 0 to 1 from the climate (a warm enough summer, a mild enough winter, not too wet), remote(km) = 0.45 + 0.55 x exp(-km / 600), km the distance from the nearest big land. Clipped to £25,000 to £6,000,000. All of A, K and the weights are TUNING.

Examples from the prototype (planet seed 1; full table in gift/GIFT_PROTOTYPE.md):

| Parcel | S | Comfort and place | Price |
|---|---|---|---|
| a volcanic cone, no gaps, far offshore (remote 1,059 km) | 0.41 | warm, 35 N | £238,000 |
| basalt group, no beach, dry (790 mm), near land | 0.40 | warm | £462,000 |
| sandstone group, long beach, big flat, good bay | 0.65 | cool, wet, 47 N | £1,522,000 |
| the gifted parcel (sandstone) | 0.70 | cool, wet, 52 N | £1,340,000 (it is a gift, so not paid) |

Reading: a good parcel costs more than the whole Gift. That is the point: you cannot buy the best at the start. You grow into it, or lease, or find a cheaper offer.

Real prices for comparison (snippets only, listings change): small uninhabited Scottish islands were advertised from about £50,000 for a tiny one to £350,000 for about 90 acres ([Country Life](https://www.countrylife.co.uk/property/an-incredible-private-island-for-sale-in-the-summer-isles-at-the-price-of-a-central-london-parking-space-232189), [Scotsman](https://www.scotsman.com/lifestyle/homes-and-gardens/entire-scottish-island-market-less-edinburgh-flat-637072), [Rightmove](https://www.rightmove.co.uk/properties/746606421510673)); whole inhabited islands cost millions (Ulva about £4.5m, [report](https://www.inkl.com/news/mull-campaigners-secure-4m-of-public-funds-to-buy-isle-of-ulva); Eigg £1.5m and Gigha £4m, [list](https://en.wikipedia.org/wiki/List_of_community_buyouts_in_Scotland)). The game's prices sit above real bare-island prices because a parcel here includes a harbour and buildable ground. If Harry wants closer to real, lower A to about £250,000. (TUNING.)

### 3.6 Fog of war and survey voyages

| Level | You know | Price shown |
|---|---|---|
| 0 unknown | nothing; blank chart | none |
| 1 rumour | a dot, a rough size, "someone saw an island here" | a wide band, plus or minus 45 percent |
| 2 surveyed | the score parts as a card, hazards, wildlife, drift finds | plus or minus 15 percent |
| 3 visited | everything, a look-only diorama | exact |

A **survey voyage** is a boat trip to a target. It reveals the target at level 3 and the parcels within about 160 km at level 2 (TUNING). Rumours (level 1) appear for parcels within 400 km of anything you own, so the chart always has somewhere to go.

Cost and time (from the prototype's sea model): one boat-day costs about £420 (skipper, fuel, food: a guess), a survey fee £250, the voyage is there and back plus a day on site. In the prototype's chart the nearest neighbour is 1 to 3 days away (survey £750 to £2,600), the median parcel 42 days away (about £36,000), the farthest 92 days (about £78,000). That is 11 parcels within 5 days and 47 within 20. Far voyages are chart journeys (section 3.11), time-lapsed. (TUNING; the sea model is crude.)

### 3.7 Acquisition forms and ownership rules

| Form | Terms (TUNING) | Feel |
|---|---|---|
| Fixed price | pay the list price | simple, certain |
| Lease | 10 percent down, 6 percent of price a year, no building without the owner's consent | cheap start, slow cost |
| Auction | reserve 70 percent of list; final price 75 to 135 percent of list (a hash, so it replays); three rival bids as counted bidders, not named | a few events, some luck |
| Conservation grant | parcels with high wildlife score only; the grant pays 60 percent, you pay 40 percent; a covenant keeps the habitat shore unbuilt for 25 years | a reason to be kind |
| Inherited ruin | free, about 6 percent of parcels; old buildings need repair first (about 12 percent of list) | a story |

Ownership rules: you own the parcel, the seabed 200 m around it and the right to land from the sea. You cannot own another parcel's water. A lease can be turned into a purchase at the list price at that time, minus rent paid (TUNING). Selling back returns 70 percent of what the land cost plus the value of what you built, counted gently (TUNING). Real support for the shapes: community land funds in Scotland pay part of a buyout, for example about £1.08m toward the Bays of Harris estate and the largest award, toward Ulva, about £4.4m ([HIE](https://www.hie.co.uk/news-and-blogs/news/2026/august/04/bays-of-harris-land-ownership-bid-receives-1m-funding-from-slf/), [Press and Journal](https://www.pressandjournal.co.uk/fp/news/highlands/1436600/ulva-buyout-plan-receives-4-4m-boost-from-scottish-land-fund/); snippets only).

### 3.8 Neighbours and the tender across parcels

- **Neighbours.** Friendly, counted not tracked. A neighbouring parcel has "households: 3" or "a farm", never a name. They trade, send guests, borrow a boat. No rival AI at first. Later, a quiet "competitor" is just a rising count of beds nearby that lowers occupancy (a number).
- **The tender across parcels.** The tender calls at parcels you own, on a timetable, in a loop. More parcels, a longer loop, each call at a fixed day. It carries supplies, rubbish and sales, and a survey berth. The route is the sea route the prototype computes (Dijkstra over ocean cells, with currents and storms). A far parcel means a late tender in bad weather. Optional and never required, as in the earlier tender decisions.
- **Trade across parcels.** Goods move between your parcels on the tender at a fee per trip. A parcel with a spring and meadow can feed a parcel that is all beach. That makes a group of parcels worth more than the sum.

### 3.9 Reachability by boat and weather

- A parcel is reachable if a sea route exists from where your boat is. Sea ice and land block. In the prototype every parcel in the shipped region is reachable (the region is wrapped by sea around a continent).
- Speed: a small boat about 9 km/h (about 5 knots), 10 sailing hours a day (TUNING). Currents add or subtract (the planet's circulation is 0.1 to 0.3 m/s). Storm belts slow the boat by up to 60 percent (TUNING).
- Departure can be delayed by weather, a few days at a time. In the game this is a "wait for a window" line, not a failure.

### 3.10 What washes up depends on place

Reuse the drift table (globe/drift.py and arrivals.py). For each parcel the table of its ocean cell gives arrivals per year by kind (seeds, logs, litter, wreck debris, ships, strays) and the source regions. It uses generic invented region names, as before. Prototype figures: from about 1 find per year on a poorly placed cell to about 12 on a gyre edge; 5 or more source regions at the best cells. A parcel's place on the planet sets its beach-collecting character (for example warm drift seeds on one coast, cold-water strays on another). Keys are idempotent (a ledger of claimed keys), as in arrivals.py.

### 3.11 Climate varies with latitude and coast

Use climate.py unchanged. In the prototype the annual mean temperature of the parcels falls with latitude (r = -0.98) and the high-latitude third of the parcels is more than 5 C colder than the low-latitude third. Parcels sit on ocean cells, so their air is marine: modest seasonal range. Rain is the model's output plus a little for the island's own hills (2 percent per metre of height, a guess). Owner decision kept: a properly wet and cool maritime island is the home look (52 N, about 1,600 mm). In the prototype the home parcel gets about 2,700 mm, wetter than the owner's example (the model's coastal cells are wet); a retune of the rain scale is on the list.

Travel between parcels: two options.
- **Chart journey.** Drag the boat on the chart, time passes in fast forward, weather events interrupt (a fog bank, a squall, a whale blow, a drifting relic). One event per 2 to 3 days of voyage at most. Cheap to build, fits an iPad.
- **Sailing view.** A real-time sea view with the boat. Rich, but a big extra build. Later.

Recommendation: chart journey for v1 (PLAUSIBLE).

### 3.12 What the chart looks like, and rendering budget

Nautical-chart style (PLAUSIBLE):
- Land tan with a thin coast line; shallows pale blue with depth contours; deeper water darker; a graticule every 5 degrees; a compass rose; a scale bar.
- Symbols: parcel (a small island-group glyph, size by island count, colour by price or ownership); anchorage (a small anchor, only if a harbour exists); lighthouse; reef (crosses); fog bank; wreck. Drift arrows in a pale hue for currents.
- Text: invented names, small caps.
- Scales: planet map (1 cell = 5 degrees), regional chart (1 square = 1 degree), parcel plate (1.5 km), table (256 m).
- Fog of war: unknown areas are blank paper; rumours are dotted; surveyed are inked; visited are coloured.

Rendering budget (PLAUSIBLE, from MODES_AR_DESKTOP_HANDHELD.md tiers; unmeasured on devices):
- Regional chart: one background plane, one instanced symbol draw, one label atlas: under 10 draw calls, a few hundred sprites in view. Far under the T3 low budget of 40 calls.
- Thumbnails: 128 by 128 per parcel; a 4096 by 4096 atlas holds 1,024 of them (64 MB as RGBA). Load only the visible region. Page memory aim under 300 to 500 MB.
- Zoom-in: replace the plate by the diorama only for the parcel you open; one table in memory at a time.
- iPad T2/T3: 30 to 60 fps, static chart mostly redraws only on drag. Radeon VII (desktop): the same chart at any size, plus a planet globe if wanted. The heavy part is generation, which is done offline.

### 3.13 Overnight pre-generation

Per parcel: generate the heightfield from the seed, run hydrology and the score, bake a chart thumbnail and a small JSON (score parts, price, climate, wash-up). The prototype scores 304 parcels in about 12 s total with 256 m stand-ins (it caches by window). A full 1.5 km group is about 34 times the cells of a window; the priority-flood loop is plain Python, so assume 5 to 60 s a parcel (UNVERIFIED, to measure). At 20 s a parcel, 6,400 parcels is about 36 hours on one core, about 2 to 3 hours on 16 cores. Thumbnails of 10 KB each mean about 64 MB for the planet. Store the seeds and the scores, not the heightfields; regenerate on zoom (a few seconds). Determinism across machines needs a hash test on the heightfield (landform already stores a data_sha per window). The overnight job can also search for the best "gift" parcels (a good start for Level 1), and print a chart of price against score to tune A and K.

## 4 Economy with sources

All figures are a basis for plausible game numbers. The game uses its own numbers (marked TUNING). Most sources were search snippets; full pages were not read.

### 4.1 Real-world anchors

| Topic | Anchor | Source and confidence |
|---|---|---|
| Land on remote islands | bare small islands from about £50,000 to £350,000 (13 to 90 acres); an inhabited island with houses, a café and jetties asked about £1.95m; whole-island community buyouts £1.5m (Eigg, 1997), £4m (Gigha, 2002), about £4.5m (Ulva, 2018) | [Country Life](https://www.countrylife.co.uk/property/an-incredible-private-island-for-sale-in-the-summer-isles-at-the-price-of-a-central-london-parking-space-232189), [Rightmove](https://www.rightmove.co.uk/properties/746606421510673), [Wikipedia list](https://en.wikipedia.org/wiki/List_of_community_buyouts_in_Scotland), [inkl report](https://www.inkl.com/news/mull-campaigners-secure-4m-of-public-funds-to-buy-isle-of-ulva). Asking prices, not sale prices. PLAUSIBLE |
| Conservation and land grants | the Scottish Land Fund gave about £1.08m toward a large Hebridean estate and about £4.4m toward an island; a smaller island buyout grant of £100,000 toward £600,000 to £700,000 | [HIE](https://www.hie.co.uk/news-and-blogs/news/2026/august/04/bays-of-harris-land-ownership-bid-receives-1m-funding-from-slf/), [Press and Journal](https://www.pressandjournal.co.uk/fp/news/highlands/1436600/ulva-buyout-plan-receives-4-4m-boost-from-scottish-land-fund/), [Scottish Housing News](https://www.scottishhousingnews.com/article/hebrides-crofters-win-funds-for-community-buy-out). Grants are for communities. The game's 60 percent grant is a design choice. PLAUSIBLE |
| Cabin and lodge build cost | about £1,100 to £1,200 per m2 for a log cabin (one guide); foundations £80 to £150 per m2; the kit is 40 to 50 percent of total; holiday use needs planning and building approval | [Checkatrade](https://www.checkatrade.com/blog/cost-guides/cost-build-log-cabin/), [summerhouse24](https://summerhouse24.co.uk/european-log-cabin-kits-and-prices-guide/). Mainland figures, no island premium. PLAUSIBLE |
| Island build premium | materials and crews arrive by boat; commonly well above mainland (often 1.5 to 2 times) | UNVERIFIED (general knowledge, no source read) |
| Jetty and pontoon | a small community boat jetty approved at £42,376; a pier, slipway, bridge and pontoon package £239,592; no clean per-metre price found | [Highland Council LEADER entry](https://highland.gov.uk/leader/directory_record/112/north_kessock_small_boat_jetty), [HIE](https://www.hie.co.uk/news-and-blogs/news/2023/march/06/240k-for-island-community-pier-project/). Snippets only. PLAUSIBLE for the order of magnitude |
| Occupancy, seasonality | Scotland self-catering unit occupancy by month (2024): February 24.6 percent, August 58.7, September 44.0, October 56.1, November 39.7, December 29.0. Island rows are thin or missing (Outer Hebrides about 36 to 51 percent in one month; Shetland sample too small). Operators in island locations did best in serviced rooms in September 2024. | [VisitScotland SAOS reports](https://visitscotland.org/binaries/content/assets/dot-org/pdf/saos/scottish-accommodation-occupancy-survey-2023.pdf) and [data.gov.scot](https://data.gov.scot/dataset/scottish_accommodation_occupancy). VERIFIED as figures from the snippet; national, not island |
| Wildlife tourism | eagle-inspired spending on one island about £4.9m to £8m a year in 2019, supporting 98 to 160 full-time jobs; 29 percent of tourists said the eagles were an important factor | [STV report](https://news.stv.tv/highlands-islands/sea-eagle-tourism-generates-economic-benefit-for-isle-of-mull-study-shows), [study PDF](https://raptorpersecutionuk.org/wp-content/uploads/2022/03/wt-eagles-economics-report-mull-march-28-2022.pdf). VERIFIED (snippet). One famous species on a large island: do not scale down naively |
| Wildlife boat trips | small fast-boat wildlife trips are priced at roughly £40 to £150 a head in the listings seen (different countries, 1 to 2 hours); a 12-person boat charter about $700 an hour | [listing sample](https://www.nautal.com/uk/rib-hire), [Reykjavik RIB tour](https://happytovisit.com/?p=134091). PLAUSIBLE, abroad, snippets |
| Fish and shellfish income | Scottish boats of 10 m and under landed an average of about £34,000 each in 2021 (about £40,000 in 2023 by my division); 56 percent of the 1,439 boats of that size mainly fish creels (2025); 82 to 83 percent of their value is shellfish | [Scottish Sea Fisheries Statistics 2025](https://www.gov.scot/publications/scottish-sea-fisheries-statistics-2025/pages/the-scottish-fishing-fleet/), [2023](https://gov.scot/publications/scottish-sea-fisheries-statistics-2023/pages/4-the-scottish-fishing-fleet). Landings are revenue, not profit. VERIFIED (snippet) |
| Farm income | a hardy rain-fed garden or a few sheep gives small income | no source read; use FOOD_AND_WILDLIFE.md. UNVERIFIED |
| Wages | UK National Living Wage £12.71 an hour from April 2026 (adults 21 and over). Employer cost and island housing costs add on top. | [GOV.UK](https://www.gov.uk/government/news/national-living-wage-increases-to-1271-per-hour). VERIFIED. Island premium UNVERIFIED |

Gaps: no source found for guesthouse or resort running costs per room, island nightly rates, per-metre pontoon costs, or farm income. The game numbers for those are guesses, marked so.

### 4.2 The simple ledger model (guesses)

All in-game pounds. Time step: one week (52 a year); the report card sums the year.

Income per week:
- Cottage: nights booked x rate. Rate £125 a night for a 4-bed cottage (TUNING; real mainland holiday cottages for four commonly ask roughly £100 to £150 a night in season, UNVERIFIED).
- Café: guests x £9 spend x share who visit (0.5).
- Boat trip: seats sold x £45.
- Hide visits and donations: small, £2 a head (TUNING).
- Grants: lump sums on conditions.
- Sales on the tender: fish, produce, at fixed prices.

Costs per week:
- Upkeep: 2.5 percent of build cost a year per building (TUNING).
- Cleaning: £35 per stay turnover.
- Staff: host £540, boatman £500, warden £520 a week (about £28,000, £26,000, £27,000 a year; built from £12.71 x 40 h = £25,000 a year at the minimum, plus on-costs; TUNING).
- Boat running £120 a week plus £420 a day when on a survey.
- Utilities £25 a week per cottage.
- Platform share 15 percent of bookings (TUNING).
- Repair fund top-up: 1 percent of build cost a year.

Occupancy by month (share of nights, Jan to Dec, TUNING, shaped from the national figures above and lowered for an island): 0.18, 0.22, 0.30, 0.38, 0.45, 0.52, 0.62, 0.68, 0.50, 0.40, 0.28, 0.24. Annual average about 0.40. Weather days when the tender cannot land lower bookings a little. A comfortable climate raises occupancy by up to 10 points.

Build costs (TUNING, rounded from the anchors, island premium 1.6 x):

| Thing | Cost | Note |
|---|---|---|
| Jetty | £18,000 | order of magnitude from £42k small jetty, simplified |
| Cistern or well | £6,000 | cistern; a well only where a lens exists |
| Cottage (40 m2, 4 beds) | £85,000 | 40 m2 x £1,150 x 1.6 + foundations and services |
| Wildlife hide | £9,000 | small timber hut |
| Kiosk or café | £42,000 | |
| Boat (small) | £60,000 | |

Worked example: one cottage earns about 365 x 0.40 x £125 = £18,250 a year. Minus platform 15 percent (£2,740), cleaning (about 60 stays x £35 = £2,100), upkeep (£2,125), utilities (£1,300), repair top-up (£850) leaves about £9,100. Pay-back on £85,000 is about 9 years. That is cosy but real: a Holiday run grows slowly, and a better parcel (higher comfort, better beach) pays back faster. With a host (£28,000) you need about four cottages to cover one host. TUNING, to be balanced so a sensible first-year plan ends the year with 80 to 95 percent of the gift left and rising.

### 4.3 What goes in the ledger at a glance

Cash. Assets (buildings at cost less wear). Loans (at most one, fixed rate 4 percent, TUNING). Repair fund. Monthly line items by vision. Nothing hidden.

## 5 Level 1: the smallest playable game

**One parcel**, the gifted one, chosen overnight as a good start (decent beach, flat ground, a bay, a burn). Starting cash £1,000,000.

**Five buildable things:** jetty, cottage, cistern, wildlife hide, kiosk. (The boat comes later.)

**Goals (none forced):** "Have a guest stay", "Have a seal count of 10 or more", "Finish a year with the fund intact", "Open the chart".

**Year-end card:** the four lenses.

**What is cut from Level 1:** the chart and any second parcel; leases, auctions and grants; survey voyages; neighbours; the tender across parcels; Homestead and Fortress; the sailing view; saving beyond one slot; rain-linked rivers on big islands; the planet map. The chart view comes right after (Level 2).

### 5.1 Ranked build list with developer-day estimates

One developer, working days, plus or minus half (guesses). Ranked by what Level 1 needs first.

| Rank | Piece | Days | In Level 1 | Notes |
|---|---|---|---|---|
| 1 | Ledger | 4 | yes | dated lines, monthly and yearly totals, save format |
| 2 | Build tool | 8 | yes | place, price preview, repair; kit pieces exist |
| 3 | Parcel generator | 10 (2 for the Level 1 stand-in) | stand-in | full 1.5 km group with LOD and the hash test |
| 4 | Visitors as counts | 5 | yes | arrivals, nights, happy or not; a few drawn figures |
| 5 | Holiday vision | 6 | yes | buildings, rates, seasons, rating |
| 6 | UI and saving | 7 | yes | ledger screen, card, settings, one save slot |
| 7 | Suitability score and price | 4 | no (survey card only) | port of the prototype to the page language |
| 8 | Conservation vision | 6 | yes (hide only) | hide, warden later, grants |
| 9 | Chart view | 6 | no | pan, zoom, symbols, fog |
| 10 | Balancing | 6 | yes (about 4) | play-throughs of the ledger |

Level 1 total: 4 + 8 + 2 + 5 + 6 + 7 + 3 (a light score card) + 4 (conservation hide) + 4 (balancing) = about 43 days. The full list totals 62 days, plus survey voyages, leases and auctions (about 8 more) in Level 2. These are guesses.

## 6 Risks and open questions for Harry (taste only)

Risks:
- The ledger can feel like a spreadsheet. Keep it as a calm card, with a picture per line.
- Real prices make the game feel mean. Game prices are gentler than real ones on purpose.
- The chart can feel empty. Parcels cluster on coasts and rumours always point somewhere.
- Heavy generation. Pre-generate overnight; regenerate only the parcel you open.
- "The Gift" may be a used name. Check before public use (already open in EVOLUTION_TREE.md).
- The climate model makes wet coasts very wet (2,700 mm at the home parcel). Retune before showing.

Questions (taste only):
1. Tycoon numbers or cosy and calm? (This note assumes cosy: gentle costs, no bankruptcy end.)
2. Are there locals, or only you and guests? (Assumed: a few counted locals as neighbours.)
3. Should the best parcels cost more than the gift on day one, or should the first chart show a few bargains?
4. Is a chart journey (fast forward with events) enough, or do you want the sailing view early?
5. Do you want the year-end card to stay four separate lenses, or a story-style summary with no numbers?
6. Fortress: a vision you pick at the start, or something you find later in ruins? (Assumed: found later.)
7. Do you want real-feeling prices (small islands cheap) or game prices (about twice as dear)? One number to change.

## 7 The prototype (summary; the report is gift/GIFT_PROTOTYPE.md)

gift/parcels.py builds, for planet seed 1: a registry of 304 parcels in a 60 by 30 degree window, local climate from climate.py, a stand-in island window per parcel from the 12 landform exports, seven suitability parts from the real arrays (hydrology.py for the catchment), price, sea routes from the home parcel (Dijkstra with currents and storm delay), survey costs, acquisition offers, fog levels and wash-up from the drift table. gift/test_parcels.py runs 44 checks (determinism, prices rise with suitability, remote land is cheaper but dearer to reach, no overlaps, climate follows latitude, scores in range, 60 parcels run). Two pictures are in gift/maps/. Limits are in the report.

## 8 Sources (all reached through web search; mostly snippets)

- Small island asking prices: [Country Life, Summer Isles](https://www.countrylife.co.uk/property/an-incredible-private-island-for-sale-in-the-summer-isles-at-the-price-of-a-central-london-parking-space-232189); [Scotsman](https://www.scotsman.com/lifestyle/homes-and-gardens/entire-scottish-island-market-less-edinburgh-flat-637072); [Rightmove listing](https://www.rightmove.co.uk/properties/746606421510673).
- Community buyouts and land fund: [Wikipedia list](https://en.wikipedia.org/wiki/List_of_community_buyouts_in_Scotland); [Press and Journal, Ulva](https://www.pressandjournal.co.uk/fp/news/highlands/1436600/ulva-buyout-plan-receives-4-4m-boost-from-scottish-land-fund/); [HIE, Bays of Harris](https://www.hie.co.uk/news-and-blogs/news/2026/august/04/bays-of-harris-land-ownership-bid-receives-1m-funding-from-slf/); [Scottish Housing News](https://www.scottishhousingnews.com/article/hebrides-crofters-win-funds-for-community-buy-out).
- Occupancy: [VisitScotland accommodation occupancy survey](https://visitscotland.org/binaries/content/assets/dot-org/pdf/saos/scottish-accommodation-occupancy-survey-2023.pdf); [data.gov.scot](https://data.gov.scot/dataset/scottish_accommodation_occupancy).
- Wildlife tourism: [STV](https://news.stv.tv/highlands-islands/sea-eagle-tourism-generates-economic-benefit-for-isle-of-mull-study-shows); [study PDF](https://raptorpersecutionuk.org/wp-content/uploads/2022/03/wt-eagles-economics-report-mull-march-28-2022.pdf).
- Boat tours: [Nautal RIB hire](https://www.nautal.com/uk/rib-hire); [Reykjavik RIB tour listing](https://happytovisit.com/?p=134091).
- Build costs: [Checkatrade log cabin](https://www.checkatrade.com/blog/cost-guides/cost-build-log-cabin/); [summerhouse24](https://summerhouse24.co.uk/european-log-cabin-kits-and-prices-guide/).
- Jetties: [Highland Council, North Kessock jetty](https://highland.gov.uk/leader/directory_record/112/north_kessock_small_boat_jetty); [HIE, Mull pier](https://www.hie.co.uk/news-and-blogs/news/2023/march/06/240k-for-island-community-pier-project/).
- Wages: [GOV.UK, National Living Wage 2026](https://www.gov.uk/government/news/national-living-wage-increases-to-1271-per-hour).
- Fisheries: [Scottish Sea Fisheries Statistics 2025](https://www.gov.scot/publications/scottish-sea-fisheries-statistics-2025/pages/the-scottish-fishing-fleet/); [2023](https://gov.scot/publications/scottish-sea-fisheries-statistics-2023/pages/4-the-scottish-fishing-fleet).
- Our own notes: research/GLOBE_AND_DRIFT.md, WATER_AND_RAIN_REAL_WORLD.md, RIVERS_LAKES_WATER_CYCLE.md, FOOD_AND_WILDLIFE.md, DIGGING_IN_GEOGRAPHY.md, FIRST_SHELTER_AND_MATERIALS.md, MODES_AR_DESKTOP_HANDHELD.md, GPU_WORLD_SIMULATION.md; globe/CLIMATE_REPORT.md; landform/LANDFORM.md.
