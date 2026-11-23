# Globe stage 2 report

Run: 60 seeds, 1800 tables (30 per seed), 1500 days, run hash `23176454b34354c3`, wall time 125 s with 4 job(s).
All numbers are TUNING-grade: they test the recipe, not the real ocean (see GLOBE_STAGE2.md).

## Stage checks (research note 8.2) against the note prototype

| Check | This run | Note prototype | Verdict |
|---|---|---|---|
| Arrivals per table in 1500 days, median (min to max) | 17 (0 to 158) | 14 to 20 (0 to about 170) | in range |
| Tables with no arrivals | 42 of 1800 (2 percent) | 5 to 8 of 30 (17 to 27 percent) | outside |
| Source regions per table, median (max) of 84 | 4 (18) | median 3 to 4, max 8 to 10 of 37 to 41 | ok, at least 3 |
| Travel time days p10 / median / p90 | 25 / 329 / 969 | 5 to 7 / 57 to 83 / 230 to 445 | longer tail: 47 percent beyond a year |
| Richness spread, CV of arrivals across tables | 0.89 | 1.07 to 1.26 | shore_catch today: SUPPLY_SIGMA 0.45 (CV about 0.5) |

Per seed spread: CV of the per-seed median 0.31, CV of the per-seed total 0.22 (60-seed richness spread asked by the note, check 6).

Arrivals by latitude band of the table (median, count of tables, tables with none):

- subpolar: median 5, 134 tables, 19 with none
- subtropical: median 10, 403 tables, 10 with none
- temperate: median 16, 670 tables, 13 with none
- tropical: median 29, 593 tables, 0 with none

Share of tables with only one source region or none: 11 percent. Stray arrivals per table: median 1, tables with none 46 percent.
Mix of kinds among arrivals: {'litter': 0.205, 'logs': 0.224, 'seeds': 0.129, 'ships': 0.149, 'wreck_debris': 0.293}. Source bands: {'subtropical': 8836, 'temperate': 15193, 'tropical': 15456, 'subpolar': 1004}. Fragility median 0.15, p90 0.46.

## Source to sink structure (check 7)

Share of a table's arrivals that come from its single biggest source region: 0.53 real against 0.21 when the source labels are shuffled across tables of the same seed (1397 tables). Structure present (real above null).

## Sensitivity (check 8), first 3 seeds, 10 tables each

| Variant | Median arrivals | Median sources | Tables with none | Travel median days |
|---|---|---|---|---|
| base | 26 | 4.5 | 0 | 444 |
| leeway x0 | 8 | 2.0 | 8 | 198 |
| leeway x2 | 27 | 5.0 | 0 | 345 |
| K x10 | 28 | 6.0 | 0 | 430 |
| p_beach x0.5 | 29 | 5.5 | 1 | 399 |

## Field and planet checks

- Land fraction 0.270 to 0.328 (target 0.25 to 0.35); 63 percent of seeds needed a reseed for the two-basin rule.
- Open ocean median speed 0.150 m/s, 99.5th percentile 0.54 m/s, largest speed over all seeds 0.93 m/s (limit 2.5).
- Trades westward in 100 percent of seeds, westerlies eastward in 100 percent; north subtropical gyre clockwise in 100 percent, south anticlockwise in 100 percent.
- Western boundary against eastern boundary strongest meridional speed, median ratio 3.3; west stronger in 97 percent of basins, more than 2 times in 78 percent.
- Particles on land at the end of the runs: 0. Share still adrift after 1500 days: 17 percent.
- Time per seed (planet, solve, particles, 30 tables): median 7.2 s, of which planet and solve 1.73 s.

