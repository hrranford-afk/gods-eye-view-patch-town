# Ecosystem test report

60 world seeds (first 1), 200 simulated days, two calendars (spring start day 60, winter start day 290). Same seeds give the same numbers; every number here is a design number unless ECOSYSTEM_TEST.md says otherwise.

## 1. Shore catch: rich and poor seeds

Best collectable strandline per seed, items per metre per tide (anchors: poor 0.2, normal 1, rich 5).

| class | seeds | share |
|---|---|---|
| rich | 12 | 20% |
| normal | 26 | 43% |
| poor | 9 | 15% |
| none | 13 | 22% |

Best rate: min 0.09, p25 0.74, median 1.76, p75 2.53, max 4.93 (spread max/min about 57x). Length-weighted rate over all collectable shore: median 0.78.

| province | seeds | with a collectable strandline | median best rate | median collectable shore (m) |
|---|---|---|---|---|
| A (gneiss) | 20 | 20 | 1.57 | 287 |
| B (sandstone) | 20 | 20 | 2.20 | 571 |
| C (basalt) | 20 | 7 | 0.19 | 0 |

Within a world the richest of the six biggest islands carries a median of 64 percent of that group's drift catch (range 34 to 100), so a seed has one rich island and several poor ones.

## 2. Wildlife per seed

| thing | min | median | max | research target |
|---|---|---|---|---|
| seal haul-outs kept (top 12) | 2 | 12 | 12 | 3 to 12 per group |
| haul-out candidates found | 2 | 19 | 34 | |
| peak seals ashore, no village | 26 | 500 | 1149 | group sizes 5 to 150 per haul-out |
| peak seals ashore, with village and boat lane | 26 | 340 | 807 | 20 to 60 percent of haul-outs within 150 m |
| haul-outs within 150 m of lane or houses, percent | 0 | 58 | 100 | 20 to 60 |
| cliff ledge length (m) | 0 | 106 | 229 | 100 to 3,000 (real); window is 512 m |
| skerry bird colonies | 1 | 7 | 12 | 2 to 8 |
| peak seabird pairs | 250 | 1538 | 3439 | |
| otters (shore with fresh water) | 1 | 2 | 3 | about 1 per 1.1 km |
| kelp share of near-shore cells, percent | 11 | 47 | 66 | 15 to 40 |

Seeds with no seal haul-out at all: none.

## 3a. Collector and tender, spring start

Yields use the "ignoring" run (the player never orders, so the hopper empties only when the tender calls). Free-run means a hopper that never fills: what supply and daylight allow.

| shore class | seeds | kg/day (4.5 kg hopper) | kg/day (free-run) | target kg/day | fills/week | days waiting full | kg/visit to stockpile | empty calls | tender lateness at end (days) |
|---|---|---|---|---|---|---|---|---|---|
| poor | 8 | 0.39 | 1.37 | 0.1 to 0.3 | 0.58 | 93 | 4.1 | 0.0 | 4.3 |
| normal | 27 | 0.41 | 5.13 | 1 to 2 | 0.64 | 135 | 4.5 | 0.0 | 4.4 |
| rich | 3 | 0.37 | 11.04 | 4 to 8 | 0.58 | 148 | 4.5 | 0.0 | 3.5 |

Seeds with no collector shore (no sand or gentle ledge near the landing): 22. Mis-pick rate across all runs: 0.030 (limit 0.03). Items gathered per tide, all seeds with a collector: median 5.3.

## 3b. Collector and tender, winter start

Yields use the "ignoring" run (the player never orders, so the hopper empties only when the tender calls). Free-run means a hopper that never fills: what supply and daylight allow.

| shore class | seeds | kg/day (4.5 kg hopper) | kg/day (free-run) | target kg/day | fills/week | days waiting full | kg/visit to stockpile | empty calls | tender lateness at end (days) |
|---|---|---|---|---|---|---|---|---|---|
| poor | 8 | 0.39 | 1.64 | 0.1 to 0.3 | 0.57 | 82 | 4.2 | 0.0 | 4.8 |
| normal | 27 | 0.41 | 3.76 | 1 to 2 | 0.64 | 103 | 4.5 | 0.0 | 4.4 |
| rich | 3 | 0.37 | 5.23 | 4 to 8 | 0.57 | 109 | 4.5 | 0.0 | 3.5 |

Seeds with no collector shore (no sand or gentle ledge near the landing): 22. Mis-pick rate across all runs: 0.031 (limit 0.03). Items gathered per tide, all seeds with a collector: median 5.4.

## 4a. Three player policies, spring start

| policy | seeds | stable village at end | had a harm episode | recovered | still in harm at end | seal sites that left | sites back | peak litter load (kg/m, median / max) | people unwell (person-days, median / max) | built kg (median) | thriving |
|---|---|---|---|---|---|---|---|---|---|---|---|
| careful | 60 | 60 | 1 | 1 | 0 | 0 | 0 | 0.12 / 3.40 | 0 / 12 | 177 | 57 |
| greedy | 60 | 55 | 21 | 16 | 5 | 0 | 0 | 1.33 / 3.40 | 7 / 57 | 235 | 52 |
| ignoring | 60 | 60 | 1 | 1 | 0 | 0 | 0 | 0.12 / 3.40 | 0 / 12 | 0 | 0 |

## 4b. Three player policies, winter start

| policy | seeds | stable village at end | had a harm episode | recovered | still in harm at end | seal sites that left | sites back | peak litter load (kg/m, median / max) | people unwell (person-days, median / max) | built kg (median) | thriving |
|---|---|---|---|---|---|---|---|---|---|---|---|
| careful | 60 | 60 | 7 | 7 | 0 | 9 | 0 | 0.18 / 3.23 | 0 / 62 | 173 | 57 |
| greedy | 60 | 57 | 22 | 19 | 3 | 11 | 0 | 1.18 / 3.23 | 1 / 62 | 235 | 54 |
| ignoring | 60 | 60 | 7 | 7 | 0 | 9 | 0 | 0.18 / 3.23 | 0 / 62 | 0 | 0 |

## 5. Over-delivery and recovery (tender delivers 2x, 5x, 10x the normal 4 kg a visit for 60 days, then deliveries stop and the village clears by hand)

Pass = the litter load is back under the seal leave line (2.0 kg/m) within 30 days of stopping, with no reset. "Comfort" is the line seals need before they trust the shore again (0.7 kg/m).

| calendar | factor | seeds with a landing | passed | load went over the leave line | worst days to under the line | worst days to seal comfort | seeds where seals left | sites back by day 200 / sites that left |
|---|---|---|---|---|---|---|---|---|
| spring | 2x | 57 | 57 | 1 | 0 | 1 | 0 | 0 / 0 |
| spring | 5x | 57 | 57 | 11 | 2 | 6 | 1 | 1 / 1 |
| spring | 10x | 57 | 57 | 57 | 12 | 16 | 34 | 101 / 101 |
| winter | 2x | 57 | 57 | 2 | 0 | 2 | 6 | 0 / 10 |
| winter | 5x | 57 | 57 | 12 | 3 | 7 | 7 | 0 / 11 |
| winter | 10x | 57 | 57 | 57 | 10 | 17 | 33 | 90 / 108 |

## 6. Any case where recovery is impossible?

No stress test failed: every seed with a landing returned under the leave line within 30 days of stopping deliveries, at 2x, 5x and 10x, in both calendars.

Policy runs still in harm when the 200 days ended because the village had not yet had 30 days of recovery effort (a negative number means it had not yet noticed or started; not a dead end): seed 6 spring greedy (clearing for -10 days); seed 6 winter greedy (clearing for 3 days); seed 13 spring greedy (clearing for -12 days); seed 20 winter greedy (clearing for 7 days); seed 23 spring greedy (clearing for -9 days); seed 42 spring greedy (clearing for 16 days); seed 51 spring greedy (clearing for 19 days); seed 51 winter greedy (clearing for -2 days).

No policy run ended in harm after a full 30 days of recovery effort.

Worlds with no landing at all (tender cannot call, nothing is delivered, not a dead end but a different game): 26, 32, 41.

Worlds with a landing but no strandline the collector can work (deliveries only, no beach income): 19 of 60.

## 7. Side checks

- negative values found: 0
- mis-pick rate over all runs (set at 0.03, so about 0.03 is correct): 0.0303
- worst single run mis-pick rate (small samples scatter): 0.044
- a find or delivery is claimed once (second run credits nothing): True
- two runs of the same seed are identical: True

Runtime: 85 s for 60 seeds.

Results hash (sha256 of results.json body): d63790a957f6f211f71e308b665be9c426d035ef37b75b0337464ea9b551e91d
