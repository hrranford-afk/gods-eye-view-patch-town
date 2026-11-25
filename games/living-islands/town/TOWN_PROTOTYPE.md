# Island Town: headless prototype (report)

Files: `town_sim.py` (the simulation and the validator), `town_data.json` (26 buildings, 10 goods, parameters), `run_town.py` (three build plans, the report, the charts), `test_town.py` (39 tests), `maps/` (charts, `years.json`).
Design and audit: `research/TOWN_BUILDER_AUDIT_AND_DRAFT.md`.
Run: `python3 town/test_town.py`, then `python3 town/run_town.py` (add `--charts` for the PNGs; needs matplotlib, which I installed into a private scratch folder, not the repo).
Plain Python, standard library only. No page, asset or existing file was touched. No real-GPU claim. Every number is a guess unless a note says otherwise.

## What it simulates

One step is one day. A year is 360 days (12 months of 30, day 1 is 1 May), as in `gift/events.json`.
- **Citizens** are three counts (child, adult, elder). Housing caps, jobs filled by rank, needs (food, water, power), nine happiness drivers, births, ageing, leaving by boat, settlers by boat. Nobody has a name or a trail.
- **Goods graph:** timber, planks, fish, food, water, power, tools, metal, glass, rope, plus guests as a flow. Sources draw from nature (shoal, forest, rain, sun, wind, soil, lens). Transforms lose mass. Every change goes through a ledger so the tests can prove nothing is made from nothing.
- **Buildings as data** (26) with a strict validator: unknown keys refused, mass checked on transforms, credit not allowed on the local way, kit needs an end day.
- **Shortage rule:** a short supply is shared in proportion to demand (City Lab rule A). Households come first for food, water and power.
- **Port and boat:** open landing 12 slots a call, jetty 40, quay 90. Boat hold 40 or 100. A boat day every 1, 2, 4, 6 or 7 days by credit level. Storms stop it. Standing orders for imports, keep levels for exports. Export price falls with a glut.
- **Gift credit:** cash 60,000, credit 940,000. Credit pays for catalogue goods and kits only, never land. The catalogue and the kit end days close on schedule. Reach curve from `GIFT_WEEK_ONE_AND_SPINE.md`: 100, 92, 62, 30, 18, 10 percent at days 1, 360, 720, 1080, 1260, 1440.
- **Monthly budget:** exports, guests, kiosk, rent, event cash in; wages (filled places only), upkeep, cleaning, repairs, cash imports out. A short purse pays in proportion and carries arrears.
- **Event deck:** `gift/events.json` is read by trigger and weight (day window, season, weather, spring tide, credit level, flags from buildings, stock, cash, boat needed for far places). Stock, cash, credit, food days, guests, wildlife counts and delivery delay are applied.
- **Edicts:** wage level and rent level.

## Three build plans (stand-in players) and an idle town

- `holiday`: a few guest cottages, a kiosk, a hide, credit-fed food, fish later.
- `homestead`: fish slip, smokehouse, garden, cisterns, wood and sawmill, huts and cottages. Wage edict 0.15 and no rent (a shared-work island).
- `trader`: timber, sawmill, three fish slips, smokehouses, workshop, cargo boat, a robot depot. Sells fish for cash while credit feeds the table.
- `idle`: builds and orders nothing.

## Four-year report, seed 1

| Plan | Year | Citizens | Homes | Jobs | Happy | Food days | Cash | Credit | Reach |
|---|---|---|---|---|---|---|---|---|---|
| holiday | 1 | 9.5 | 18 | 3.0 | 84 | 8.1 | 6,649 | 596,641 | 92% |
| | 2 | 19.5 | 24 | 11.0 | 90 | 11.1 | 5,983 | 441,272 | 62% |
| | 3 | 19.8 | 24 | 11.0 | 90 | 13.8 | 4,033 | 347,551 | 30% |
| | 4 | 19.0 | 24 | 11.0 | 83 | 1.0 | 0 | 306,522 | 10% |
| homestead | 1 | 30.0 | 30 | 17.0 | 83 | 8.0 | 14,676 | 695,333 | 92% |
| | 2 | 30.0 | 30 | 23.0 | 82 | 16.6 | 9,920 | 662,496 | 62% |
| | 3 | 38.0 | 38 | 23.0 | 82 | 10.0 | 1,200 | 587,067 | 30% |
| | 4 | 34.9 | 38 | 23.0 | 78 | 1.4 | 0 | 519,402 | 10% |
| trader | 1 | 24.0 | 24 | 17.0 | 84 | 12.5 | 4,902 | 741,887 | 92% |
| | 2 | 34.0 | 34 | 25.0 | 89 | 13.3 | 11,860 | 603,963 | 62% |
| | 3 | 46.0 | 46 | 31.0 | 89 | 11.6 | 10,130 | 191,262 | 30% |
| | 4 | 45.1 | 46 | 31.0 | 79 | 1.3 | 0 | 99,667 | 10% |
| idle | 1 to 4 | 0 (all 12 left by boat in the first months) | 12 | 0 | n/a | 0 | about 61,000 | 939,000 | |

Eight seeds (1 to 8), end of year four, minimum / median / maximum:

| Plan | Citizens at end | Peak | Lowest after year one | Happiness | Credit left |
|---|---|---|---|---|---|
| holiday | 17.5 / 18.9 / 19.4 | 19.8 / 20.0 / 20.1 | 7.9 / 9.1 / 12.1 | 80 / 82 / 83 | 307k / 326k / 366k |
| homestead | 29.9 / 34.0 / 37.3 | 30 / 34 / 38 | 16.7 / 19.3 / 29.9 | 76 / 77 / 79 | 496k / 598k / 651k |
| trader | 25.4 / 29.8 / 45.1 | 46 / 52 / 52 | 13.2 / 18.2 / 24.0 | 74 / 75 / 79 | 45k / 117k / 253k |

Charts (seed 1): `maps/pop.png` (citizens), `maps/budget.png` (cash), `maps/happiness.png`, `maps/reach.png` (the thinning curve). `maps/years.json` holds the yearly reports.

## What the numbers say

1. Cash binds before credit. The kit way needs 12 to 30 percent of the price in cash. All three plans end year four with cash near zero and more than 40,000 credit unused (trader the least).
2. The island carries about 30 to 40 people from its own fish, rain and garden in this model. The trader plan reaches 52 on delivered food and credit, then falls toward what the island carries when food leaves the catalogue (day 1261).
3. The thinning shows in the port. Trader exports are about 120,000 in year three and about 10,000 in year four (median of 8 seeds), because a weekly boat on the open landing carries 12 slots.
4. Timber runs out under a timber yard in about two years (forest 0 in the homestead and trader plans). Planks then come from credit while the catalogue holds them, and from the shore and events after.
5. Holiday is steady and small (about 19) because the guests earn and the staff are few. It still dips in the middle of year three to four as the food credit ends.
6. Idle: everyone leaves by boat, gently. No death counter exists.
7. The deck fires about 540 to 610 events in four years across the plans. It shifts the numbers a little each time the deck is edited (the numbers above are with the deck at the commit below).

## Tests (39, all pass, about 5 s)

Determinism (same seed, same state hash; different seed, different hash; state is plain JSON; hash changes with one choice). Conservation (the ledger balances for every good in every plan; a sawmill with 90 timber makes exactly 60 planks and then nothing; no stock below zero; every transform loses mass). Money by hand (wages 4 x 350 = 1,400; upkeep (19,000 + 300) x 0.025 / 12 = 40.21; rent about 150; cash 8,709.79; a short purse of 700 against 1,400 pays half and carries 700). Kit versus local build cost and credit rules (kits close on their day; credit never buys food at level 0). Shortage rule (6 shared over demands 4 and 8 gives half each; two sawmills with 9 timber make 6 planks; 5 water for 10 people gives 50 percent; 11 fish feed 5 people). Staff places fill by rank. A town with no food shrinks as a slope, nothing negative, and nothing gory in the output words. Housing caps every day in three plans over four years. Port capacity (landing carries 6 plank bundles, jetty 20; slots never exceed capacity; a storm stops the boat; the second sale gets a lower price). Gift reach curve and levels. Deck events fire, once-only events do not repeat, effects reach stock and credit. Four-year runs finish with plausible numbers in three seeds (no runaway growth, no collapse to zero). Building nothing collapses.

## Honest limits

- There is no map, no roads, no walking, no art and no page. Footprint is a cell budget (420 cells of 2 m, about 1,680 m2).
- The three plans are simple rule lists. A human would do better or worse. All of them are cash-starved by year three, which may mean the prices or wages are off, or that the plans are too eager to build.
- Every price, wage, yield and weight is a guess. The fish price (6 a kg) is high against the Scottish average (about 1.4 to 1.6 a kg); the plank price is low against the UK import average. See the audit note.
- The garden yields about six times the research figure per square metre.
- Happiness drivers and weights are a first draft. Immigration and leaving rates are a first draft.
- The deck was written for one islander; its stock numbers are small for a town and attitude points are ignored.
- Weather is a seeded table by season, not the page's weather code.
- Floats are used for counts (expected values), so "34.9 citizens" is a mean, not a person.
- Determinism is proven in one Python build, and is independent of the hash seed (checked with three `PYTHONHASHSEED` values). It was not compared across Python versions.
