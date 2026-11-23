# Globe stage 2 (headless planet, circulation, drift, arrivals)
Status: built and tested, 23 Nov 2026, Living Islands (branch citylab/cloud-islands). Follows `research/GLOBE_AND_DRIFT.md` section 14, stages 1 to 4. Nothing here touches the live game yet; `ecosystem/shore_catch.py` is unchanged.
Everything is an invented planet. No real places, no real outlines. Region names are generated syllables ("Velath"), and the game would say "the warm southern shore".
Tags: COMPUTED = measured by `globe/run_all.py` in this build; TUNING = a game starting value; PLAUSIBLE = standard physics idea, not checked against data here; FAKED = a stand-in (section 3).

## 1 What is modelled (files in `globe/`)
| File | What it does |
|---|---|
| `planet.py` | 72 by 36 grid of five degree cells, area weights `cos(lat)`. Land from three octaves of plane waves (6, 12, 24 directions) evaluated on the unit sphere, thresholded by area-weighted quantile to a seeded 27 to 33 percent of the whole globe. Ice caps poleward of 75 degrees. One-cell islands and lakes removed. Reseeded (next attempt index) until at least two ocean basins span 60 degrees of longitude. Shore type per land cell (steep rock 0.3, mixed 0.6, sand or shingle 0.9 beaching probability, ice 0.8). Coast cells, land mass sizes, band names, source-region blocks (30 by 25 degrees, 84 of them) and invented names. |
| `circulation.py` | Wind stress `tau_x = -cos(3 lat)`, its curl, Stommel balance `r lap(psi) + beta psi_x = curl(tau)` on the sphere with `psi = 0` on land and caps, `r = 0.12`, `beta = cos(lat)`. One dense `numpy.linalg.solve` over the ocean cells (about 1800 unknowns). `u = -psi_y`, `v = psi_x`. Scaled so the open-ocean median speed is 0.15 m/s. SST `29 cos(lat)^1.4 - 1`, plus 3 C for poleward flow and minus 2 C for equatorward flow. |
| `drift.py` | Particles: current (bilinear, scaled by `1 + 0.15 sin(season)`) plus wind leeway (prescribed zonal wind `-7 cos(3 lat)` m/s with a weak meridional part, belts shifted 3 degrees with the season, a lognormal day-to-day multiplier and 25 degree direction scatter shared inside a 30 degree block), a divergence angle of 0 to 30 degrees to one side per particle, a random walk of 13 km per day per component (K = 1000 m^2/s), one-day Euler step. Landing on a land cell beaches with the shore type probability; otherwise the particle slides along the coast. Every first entry into a cell is recorded, so any cell can be asked afterwards what passed through it. Kinds and leeway: seeds 0.8, logs 2, litter 3, wreck debris 2.5, ships 5, strays 7 percent of the 10 m wind. Sources are coastal ocean cells with a latitude band and weight per kind (seeds tropical wet coasts, logs big land masses under 60 degrees, litter settled coasts under 55, wreck debris storm bands, ships seeded port cells, strays warm shelf water). |
| `arrivals.py` | For a table (one ocean cell): the particles that first entered the cell, 10 percent of them (hash of seed, particle, cell) reaching the shore. Each gives `seed:globe:kind:index` with source region (generic name, id, label), source band, travel days, arrival day, band distance, temperature mismatch and fragility (half band distance over 4, half temperature mismatch over 20 C). Strays go to their own list with class by source band, the current they ride, and a stressed flag when the source is 5 C or more warmer than the table. Also the table's mean drift vector, bearing, wind bearing, temperature, band and seasonal swing. `claim_new` is the idempotent ledger step. |
| `run_all.py` | N seeds, 1500 days, 30 sample tables per seed, results.json and REPORT.md, sensitivity runs, run hash, optional world maps. |
| `render.py` | numpy and PIL world map: land, sea temperature tint, streamlines with arrows, the table and its source blocks. |
| `tests/test_globe.py` | 77 checks: determinism, land fraction, circulation signs and western intensification, no particle on land, keyed arrivals idempotent, no coast crash, banned words and place names, no private paths, output only to `--out`. |

## 2 Numbers (60 seeds, 1500 days, 30 tables per seed; full report in `globe/REPORT.md`, hash `23176454b34354c3`)
Filled in from the run in section 5. All are COMPUTED on this recipe and TUNING-grade as evidence about the real ocean.
| Check | This build | Research note prototype | Confidence |
|---|---|---|---|
| Land fraction, 60 seeds | 0.270 to 0.328 (63 percent of seeds needed a reseed for the two-basin rule) | 25 to 35 percent | COMPUTED |
| Trades westward, westerlies eastward, north gyre clockwise, south anticlockwise | all four in 100 percent of seeds | required | COMPUTED |
| Western over eastern boundary speed | median ratio 3.3; west stronger in 97 percent of basins, over 2 times in 78 percent | over 2 for every basin | COMPUTED (22 percent of basins are below 2: short or narrow ones) |
| Open-ocean median, 99.5th percentile, largest speed | 0.15, 0.54, 0.93 m/s | median 0.15, limit 2.5 | COMPUTED (the median is set by construction) |
| Particles on land at the end | 0 of about 1.1 million | 0 | COMPUTED |
| Arrivals per table in 1500 days | median 17, range 0 to 158 | median 14 to 20, 0 to about 170 | COMPUTED, but matched by choosing the 10 percent catch share (TUNING), so this is calibration, not a result |
| Tables with no arrivals | 42 of 1800 (2 percent); all in the subpolar, subtropical and temperate bands, none tropical | 17 to 27 percent | COMPUTED; far fewer than the prototype because a table here is a whole cell that every passing particle can enter |
| Source regions per table | median 4, p90 8, max 18, of 84 | median 3 to 4, max 8 to 10 of 37 to 41 | COMPUTED |
| Travel time p10 / median / p90 | 25 / 329 / 969 days; 47 percent beyond one year | 5 to 7 / 57 to 83 / 230 to 445 days | COMPUTED; slower because the field is the 0.15 m/s one and arrivals count first entry into a cell, not first land contact |
| Richness spread (CV of arrivals across tables) | 0.89 across tables, 0.31 for the per-seed median, 0.22 for the per-seed total | 1.07 to 1.26 across tables; `shore_catch` today about 0.5 | COMPUTED |
| Source to sink structure | top source share 0.53 against 0.21 with shuffled labels | structure, not noise | COMPUTED |
| Sensitivity (3 seeds, 10 tables) | leeway 0 percent: median 8 arrivals, 8 of 30 tables with none, travel 198 days; leeway doubled: 27; K times 10: 28 and 6 sources; beaching halved: 29 | beaching matters most | COMPUTED. Leeway matters most here, beaching least (the 10 percent catch dominates) |
| Strays | median 1 per table, 46 percent of tables see none | rare | COMPUTED |

By table band, median arrivals: tropical 29, temperate 16, subtropical 10, subpolar 5 (the warm bands are richer because seeds, strays and many ports sit there; the gyre centres are poor).


## 3 What is faked
- The planet is noise, not tectonics; one wind pattern by latitude; a solved Stommel gyre on a coarse grid. No thermohaline flow, no equatorial undercurrent, no upwelling, no tides, no ice dynamics.
- Jets are about 500 km wide and slow (a few tenths of a metre per second, not 2.5); basin times are right only within a factor of two at best.
- The 0.15 m/s median scaling was chosen by the research note, not fitted to data.
- A table is a five degree cell, not an island. Whether an island "catches" a passing particle is a fixed 10 percent; a real island's catch depends on its size, shore and facing (that stays in `shore_catch.py`).
- Beaching is a constant by shore type; no resuspension at global scale.
- Leeway and wave drift are one rate per kind; the wind is a smooth belt pattern plus day-to-day noise, not a weather model.
- Strays (animals) are floaters with a temperature check; there is no swimming, no migration cycle.
- Source regions are 30 by 25 degree blocks, ports and settlements are random subsets of coast cells.
- The time is not game time: a 400 day journey is about 53 real hours of play at 8 minutes a day, so finds must be shown fast-forwarded with the journey on the globe view.
- Not checked against any real data; nothing was downloaded.

## 4 How a hardware order would run it
- Needs only `python3` and `numpy` (plus PIL only if `--maps` is used). No network, no GPU, no other packages. It writes only inside the folder given to `--out`; it never deletes anything.
- Command, from `games/living-islands/globe`: `python3 run_all.py --seeds 60 --days 1500 --out OUTDIR --jobs 4`. For the larger run: `--seeds 300 --first-seed 1`. Add `--maps 2` to draw the first two world maps into `OUTDIR/maps`.
- Timing (measured here, COMPUTED): 60 seeds with 4 jobs took 85 to 163 s wall (7 minutes of CPU) on a shared 4 core container; one seed is about 3.6 s alone (planet 0.9 s, solve 0.2 s, particles 2.5 s, 30 tables 0.2 s), so `--jobs 1` is about 4 to 5 minutes for 60 seeds including the sensitivity runs. `--seeds 300 --tables 10 --sens-seeds 0 --jobs 4` took 10 minutes wall (30 minutes of CPU) while the container was shared; on one core allow about 1 hour. The default of `--jobs` is the core count, at most 4. Memory is a few hundred MB per job.
- Check afterwards: `OUTDIR/REPORT.md` (a committed copy of the 60-seed one is `globe/REPORT.md`) and `results.json`; the `run_hash` line is the same on any machine with the same numpy for the same seeds and options, so a rerun can be compared by that line alone.
- Tests: `python3 games/living-islands/tests/test_globe.py` (about a minute).

## 5 How the arrival table plugs into `ecosystem/shore_catch.py` (documented next step, not done)
`shore_catch.build_shores` today draws a world-wide `sea_supply` from `SUPPLY_SIGMA`, an island supply from `ISLAND_SIGMA`, and treats the drift as coming from the fixed `DRIFT_FROM_DEG = 270`. Next step (stage 5 of the research note):
1. Per world seed, build `AR.World(seed)` once and call `AR.arrivals_for_table(world)` (or with the table's lon and lat if the seed places it).
2. Replace `DRIFT_FROM_DEG` with `table['drift_from_deg']` (the bearing the water comes from, current only) or, to include the leeway, add the 3 percent wind vector `leeway3_u, leeway3_v` to the drift vector first. The `onshore` term then points at the shores that really face the incoming drift.
3. Replace `sea_supply` (the `SUPPLY_SIGMA` draw) with `max(0.1, per_year_total / reference)` where `reference` is the median of `per_year_total` over the 60 reference seeds (a constant to store beside the code). The spread then comes from current geometry. Keep `ISLAND_SIGMA` for the island-to-island difference inside the window.
4. Use the kind mix (`per_year`) to give each item kind its own supply, and the arrival list (kind, class, source, travel days, fragility) as the keyed events the macro sea already uses, with `claim_new` as the ledger step.
5. Check: `ecosystem/run_all.py` (catch classes over 60 seeds) still passes, and the richness spread is the one the owner chooses. The run shows a bigger spread than `SUPPLY_SIGMA` gives, so decide whether to compress it (for example `supply = reference ** 0.5 * count ** 0.5`).
No edit to `shore_catch.py` was made in this job.

## 6 Honest gaps
- Travel times are longer than the research prototype (median 329 against 57 to 83 days) and the tail beyond a year (47 percent) is above the 10 to 30 percent guide. Median current is 0.15 m/s by instruction.
- Tables are cells, so open-sea tables get far fewer arrivals than a table next to a continent; the table choice (uniform by area from 10 to 60 degrees) is a decision to revisit.
- Seeds where one ocean covers most of the planet make a very different world from seeds with many basins; both pass the rules.
- Western boundary ratio is above 2 in most but not all basins (see REPORT); narrow or short basins are weaker.
- The three.js globe view (stage 6) and the choice test (stage 7) are not built.
