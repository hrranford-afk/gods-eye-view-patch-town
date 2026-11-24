# FOOD_MODEL: how a small settlement feeds itself (headless report)

Files: `food_model.py` (the model), `test_food_model.py` (14 tests), `out/food_results.json` (the numbers below).
Run: `python3 ecosystem/food_model.py` then `python3 ecosystem/test_food_model.py`. numpy only, deterministic, 60 seeds (1 to 60), same weather for every strategy within a seed.
Spec and sources: `research/FOOD_AND_WILDLIFE.md` (section 4 has the confidence tags). Reuses the storm, tide, season and daylight clocks of `eco_common.py`.

## What it simulates
A party of 4 (12 in the village scenario) lands with a day or two of packs. Every day it has a few free hours after chores. It spends them on its food routes, in the order the strategy lists. It eats fresh food first, then dried, then roots and grain, then packs. Food spoils. The sea, the shore, the bird colony and the seals change with what it does.

Eight strategies. Each is one player choice, not a rule:
| name | routes in order | what the player is doing |
|---|---|---|
| shore | shellfish, seaweed | rocks and tide pools only |
| line | boat line fishing, drying | dinghy and a rack |
| nets | nets, drying | nets from the wreck, stockpiling |
| garden | garden beds, shellfish, seaweed | dig and sow found seed, forage while waiting |
| eggs | gull-colony eggs, shellfish | takes nearly every first clutch in season |
| trader | salvage for the tender, shellfish | sorts shore salvage, buys ration packs |
| scav | wreck stores, shellfish | eats what the wreck holds |
| mixed | garden, a safe quarter of eggs, line, shellfish, seaweed, drying, a little trade | spreads the load, stocks up |

Four scenarios: `spring` (4 people, 120 days from mid April), `autumn` (4 people, 120 days from late September), `long` (4 people, 500 days: through a winter and a second spring), `village` (12 people, three dinghies, 120 days from mid April).

Fail means any of: a settler left (long, deep hunger), 10 or more weak days (hunger above 0.4), a collapsed shoal (min below 0.2 or end below 0.35), seals gone (trust under 0.5), or the bird colony under 0.6. The cause is recorded.

## Results (60 seeds each; every number is from this model, not from the sea)
### scenario: spring (4 people, 120 days from day 105)
| strategy | fail share | people kept | hungry days | shoal end | shoal min | seal trust | seals gone | colony | build hours | main failure causes |
|---|---|---|---|---|---|---|---|---|---|---|
| shore | 0.75 | 4.00 | 15.4 | 0.99 | 0.78 | 1.00 | 0.00 | 1.00 | 872 | hunger 45 |
| line | 0.15 | 4.00 | 5.3 | 0.72 | 0.55 | 1.00 | 0.00 | 1.00 | 1644 | hunger 9 |
| nets | 0.03 | 4.00 | 2.4 | 0.68 | 0.50 | 0.55 | 0.00 | 1.00 | 1688 | hunger 2 |
| garden | 0.63 | 4.00 | 14.1 | 0.99 | 0.78 | 1.00 | 0.00 | 1.00 | 813 | hunger 38 |
| eggs | 1.00 | 4.00 | 43.5 | 0.99 | 0.78 | 1.00 | 0.00 | 0.37 | 891 | hunger 60, colony 60 |
| trader | 1.00 | 3.88 | 39.5 | 0.99 | 0.78 | 1.00 | 0.00 | 1.00 | 521 | hunger 60 |
| scav | 1.00 | 4.00 | 38.4 | 0.99 | 0.78 | 1.00 | 0.00 | 1.00 | 977 | hunger 60 |
| mixed | 0.00 | 4.00 | 0.0 | 0.82 | 0.58 | 1.00 | 0.00 | 1.00 | 1443 | none |

### scenario: autumn (4 people, 120 days from day 270)
| strategy | fail share | people kept | hungry days | shoal end | shoal min | seal trust | seals gone | colony | build hours | main failure causes |
|---|---|---|---|---|---|---|---|---|---|---|
| shore | 1.00 | 1.88 | 75.0 | 0.61 | 0.61 | 1.00 | 0.00 | 1.00 | 381 | hunger 60 |
| line | 1.00 | 1.93 | 69.1 | 0.57 | 0.52 | 1.00 | 0.00 | 1.00 | 660 | hunger 60 |
| nets | 1.00 | 1.93 | 63.9 | 0.57 | 0.49 | 0.55 | 0.00 | 1.00 | 719 | hunger 60 |
| garden | 1.00 | 1.88 | 75.0 | 0.61 | 0.61 | 1.00 | 0.00 | 1.00 | 381 | hunger 60 |
| eggs | 1.00 | 1.38 | 82.6 | 0.61 | 0.61 | 1.00 | 0.00 | 1.00 | 420 | hunger 60 |
| trader | 1.00 | 3.50 | 65.7 | 0.61 | 0.61 | 0.45 | 0.65 | 1.00 | 269 | hunger 60, seals 39 |
| scav | 1.00 | 1.52 | 75.8 | 0.61 | 0.61 | 1.00 | 0.00 | 1.00 | 520 | hunger 60 |
| mixed | 0.13 | 4.00 | 2.6 | 0.43 | 0.41 | 1.00 | 0.00 | 1.00 | 701 | hunger 7, shoal 1 |

### scenario: long (4 people, 500 days from day 105)
| strategy | fail share | people kept | hungry days | shoal end | shoal min | seal trust | seals gone | colony | build hours | main failure causes |
|---|---|---|---|---|---|---|---|---|---|---|
| shore | 1.00 | 1.02 | 197.5 | 0.99 | 0.59 | 1.00 | 0.00 | 1.00 | 1618 | hunger 60 |
| line | 1.00 | 1.35 | 126.6 | 0.91 | 0.49 | 1.00 | 0.00 | 1.00 | 3574 | hunger 60 |
| nets | 1.00 | 1.03 | 270.4 | 0.98 | 0.46 | 0.20 | 1.00 | 1.00 | 3103 | hunger 60, seals 60 |
| garden | 1.00 | 1.02 | 293.6 | 0.99 | 0.59 | 1.00 | 0.00 | 1.00 | 1376 | hunger 60 |
| eggs | 1.00 | 1.00 | 272.8 | 0.99 | 0.59 | 1.00 | 0.00 | 0.35 | 1513 | hunger 60, colony 60 |
| trader | 1.00 | 2.38 | 193.8 | 0.99 | 0.59 | 0.63 | 0.17 | 1.00 | 1341 | hunger 60, seals 10 |
| scav | 1.00 | 1.00 | 276.1 | 0.99 | 0.59 | 1.00 | 0.00 | 1.00 | 1581 | hunger 60 |
| mixed | 0.43 | 4.00 | 10.2 | 0.80 | 0.37 | 1.00 | 0.00 | 1.00 | 4905 | hunger 26 |

### scenario: village (12 people, 120 days from day 105)
| strategy | fail share | people kept | hungry days | shoal end | shoal min | seal trust | seals gone | colony | build hours | main failure causes |
|---|---|---|---|---|---|---|---|---|---|---|
| shore | 1.00 | 11.25 | 115.9 | 0.99 | 0.78 | 1.00 | 0.00 | 1.00 | 1468 | hunger 60 |
| line | 1.00 | 12.00 | 57.0 | 0.34 | 0.22 | 0.81 | 0.00 | 1.00 | 2762 | hunger 60, shoal 38 |
| nets | 1.00 | 12.00 | 53.3 | 0.31 | 0.19 | 0.20 | 1.00 | 1.00 | 2848 | hunger 60, seals 60, shoal 55 |
| garden | 1.00 | 11.48 | 115.7 | 0.99 | 0.78 | 1.00 | 0.00 | 1.00 | 1387 | hunger 60 |
| eggs | 1.00 | 10.00 | 115.5 | 0.99 | 0.78 | 1.00 | 0.00 | 0.37 | 1491 | hunger 60, colony 60 |
| trader | 1.00 | 10.88 | 114.1 | 0.99 | 0.78 | 1.00 | 0.00 | 1.00 | 757 | hunger 60 |
| scav | 1.00 | 10.00 | 111.2 | 0.99 | 0.78 | 1.00 | 0.00 | 1.00 | 1583 | hunger 60 |
| mixed | 0.72 | 12.00 | 4.7 | 0.34 | 0.22 | 0.81 | 0.00 | 1.00 | 2933 | shoal 41, hunger 4 |


Columns: shoal = inshore fish index (1 is full). Seal trust 1 means the haul-out is trusted, under 0.5 means the seals have left. Colony = the common bird colony index (eggs). Build hours = free hours left after food, a proxy for shelter progress. Hunger above 0.4 counts as a weak day.

## What the numbers say (plain)
1. Nothing wins everything. In spring the mixed plan feeds best (0 fails) but builds fewer hours than line or nets, and it leaves the shoal at 0.82. Shore and garden keep the shoal and the seals perfect and starve. The Pareto front has at least four strategies (tested).
2. Every route has its own way to fail:
   - shore: the rocks give about 3,750 kcal a day at best (regrowth x stock / 4); four people need about 8,800. Over-picking empties the pools in weeks.
   - line: fine in spring, thin in autumn: short days, storms, and a shoal at 0.25 to 0.8 of full.
   - nets: the best food in spring, but the seals mind the nets (trust 0.55 by day 120, gone in the long run) and a village with nets and lines collapses the shoal.
   - garden: pays late. Seed found in the wreck covers 3 beds. The first potato or bere crop is ready about day 105 after sowing. Until then it is a hungry gap (63 percent fail in 120 days). Over the long run it only pays when other routes carry the gap (see mixed).
   - eggs: a treat. All the safe eggs together are under two days of food. Taking nearly every clutch drops the colony to 0.37.
   - trader: the tender fills gaps (people kept is high in autumn) but the packaging it brings piles up and seals leave (65 percent of autumn seeds).
   - scav: the wreck holds about 7 to 10 days of food for four. Then nothing.
   - mixed: survives spring and mostly autumn, but 43 percent still fail in the long run (the second winter, when the shoal is thin and the stores are low) and 72 percent crash the shoal in the 12-person village. A bigger settlement needs more than one sea.
3. Four settlers cannot empty the inshore shoal. Twelve can, with three dinghies. Overfishing is a village-era problem, not a day-one problem.
4. The model is harsh on purpose and has no rescue. The game would add rescue rations and the tender's help (EVOLUTION_TREE.md: always a way back).

## Honest limits (read this)
- Almost every number is a TUNING guess (see the note's section 4 for tags). The parameters were adjusted until the trade-offs showed up. The tests check the shape ("no strategy wins everything, each fails somewhere"), and the parameters were tuned to pass them, so passing the tests is not evidence the sea works this way.
- I tuned these by hand: PEOPLE 4, FISH_K_KG 600, nets 4 per dinghy, shell K 1,000,000 kcal, regrowth rates, greed factors, loss after 20 days. A different but still defensible set could change which strategy looks best. The ordering of the failure causes is more trustworthy than any single percentage.
- What is solid: the roof-water arithmetic (0.8 litre per mm per m2), the calorie range per person, that shellfish alone cannot feed a party, that eggs are replaceable in a gull colony, that a tarp does not give washing water.
- What is invented: fish stock size and regrowth, the net-seal worry rate, the packaging litter per pack, the wreck store size, the tender pack price, the bird-scare share, the gentle "no greens" slowdown.
- Not modelled: seaweed and shellfish toxins, individual settlers, cooking fuel, an island with no stream, wind-dried versus smoked fish, trade of dried fish to the tender, birds taking seed in detail, diseases of fish or birds, the second and later years of the colony.
