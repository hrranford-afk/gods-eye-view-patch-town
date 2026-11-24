# Gift prototype report: the parcel registry, suitability and price

Files: `gift/parcels.py` (the model), `gift/test_parcels.py` (44 checks), `gift/maps/sea_chart_price.png`, `gift/maps/score_parts.png`.
Design: `research/THE_GIFT_DESIGN.md`. Run: `python3 gift/parcels.py` (about 13 s, rewrites the two pictures) and `python3 gift/test_parcels.py` (about 22 s). numpy only; PIL only for the pictures. Deterministic.

## What it does

1. **Planet and climate.** Builds the planet for seed 1 with `globe/planet.py`, `circulation.py` and `climate.py` (monthly air temperature, rain, storm index, sea temperature).
2. **Registry.** The chart has 1 degree squares. A square holds a parcel with a chance set by the distance to land (coast 0.33, one cell off 0.18, open sea 0.05; a hash, so no state). A position inside the square is hashed too. The shipped window is 60 by 30 degrees (lon -155 to -95, lat 35 to 65) and holds **304 parcels**. The same rule over the whole planet gives about 6,400.
3. **Island group (STAND-IN).** Each parcel takes one of the 12 exported landform windows (256 m, 2 m cells; the volcano windows are 3 m) by hash, with one of 8 flips or rotations (96 looks). Full generation of a 1.5 km group is NOT done. Island count per parcel is the window's island count over 4, clipped to 3 to 8. Extensive scores (beach length, flat area, harbour area) are scaled by 0.6 window-equivalents per island.
4. **Suitability** from the real window arrays (not lookups): beach from shore codes and the exposure field; flat ground from slope, height and wetness; harbour from enclosure by land in 16 directions within 60 m plus exposure and depth; view from the highest cell by line of sight; wildlife from skerries, cliffs, veg classes and wet ground; fresh water from `hydrology.py` catchment (scaled by local rain) or the `climate.freshwater_lens` lens; boat-trip gaps from the distance between island edges. Hazard is cliffs, exposure, shoals and the storm index. Weights and formula are in the design note section 3.5.
5. **Price** `P = 450000 x exp(3.4 (S - 0.5)) x (tiles/1.8)^0.6 x (0.85 + 0.5 comfort) x remote(km)`, clipped to 25,000 to 6,000,000.
6. **Reach and survey.** Dijkstra over the ocean cells (8 neighbours, no squeezing between land corners, sea ice blocks) from the gifted parcel. Boat 9 km/h, 10 hours a day, currents from `circulation.py` added along the track, storm belts slow it by up to 60 percent. Survey cost is a £250 fee plus £420 a boat-day for the round trip plus one day on site.
7. **Acquisition forms**, fog-of-war price bands and survey reveal radius (160 km), as functions.
8. **Wash-up** from the drift table of the parcel's ocean cell (`arrivals.py`).

## Results (planet seed 1, all numbers in-game pounds)

- 304 parcels. Price: minimum £238,000, 10th percentile £347,000, median £563,000, 90th £1,183,000, maximum £1,566,000.
- Suitability: median 0.46, range 0.27 to 0.68. Each of the seven parts has a wide spread (for example beach 0 to 0.97, water 0.2 to 1.0).
- Gifted parcel (picked for a decent beach, flat ground, harbour and water near a market): S 0.70, list price £1.34m (not paid, it is the gift).
- Reach: every parcel is reachable. Voyage days from home: nearest 0.5, 1.6, 1.7, 2.0; median 42; farthest 92. Eleven parcels are within 5 days, 47 within 20. Survey cost £750 for the nearest, about £36,000 median, about £78,000 farthest.
- Climate: annual mean air temperature falls with latitude (r = -0.98 across parcels, 7 to 22 C). Rain 640 to 6,600 mm a year (the model's wet coasts are very wet; the home parcel gets about 2,700 mm against the owner's 1,600 mm example).
- Wash-up: 1 to 12 finds a year by place; 5 source regions at the best cells.
- Three parcels in `maps/score_parts.png`: S 0.43 (£347k; no beach, good harbour), S 0.50 (£564k; big flat, good water, no gaps), S 0.65 (£1.54m; beach, view, wildlife all high).

## Tests (44 checks, all pass)

Determinism (same seed and square give the same parcel byte for byte; a second chart gives the same registry; another seed differs). Registry (150 to 600 parcels, unique ids, nearest two centres more than 1.5 km apart, all inside the region, all on ocean cells and not ice, denser near coasts). Scores (all parts, hazard and suitability in 0..1, weights sum to 1, every part varies). Price (strictly rises with suitability; Spearman against suitability above 0.7; falls with remoteness; remote parcels are cheaper once suitability is removed). Reach (all reachable; voyage days follow distance from home; survey cost follows days; far parcels cost over 5 times more to reach than near ones; the gifted parcel is at the front). Climate (falls with latitude, 5 C warmer low-latitude third, rain and seasons plausible, modest sea range). Windows (flips keep areas; at least 10 of 12 windows used; scores differ). Wash-up differs by place. Acquisition offers, survey reveal, price band narrowing. Sixty parcels run end to end and agree with the full run.

## Honest limits

- The windows are 256 m and a parcel is 1.5 km. Scores are scaled up, not generated. Real group generation will change every number. The ranking and the formula shape are the point, not the values.
- Only 12 windows, so many parcels share a look (a flipped copy of the same island). Fine for a price test, not for the final game.
- The planet has 5 degree cells. The chart land is blocky and a parcel's cell tells climate only to that resolution. Parcels never sit on land cells, so there are no coastal or inland parcels yet.
- The climate model's wet coasts are too wet for the owner's maritime example. No retune was done.
- The sea model is crude: cell-centre paths on a 556 km grid, a flat storm delay, no seasons or tides, no ports. Voyage times of 40 to 90 days for far parcels would be fast-forward chart journeys.
- Price anchors and costs are guesses (design note section 4). Real small islands cost less than these prices.
- Beach length is counted shoreline cells, not a traced coast line. Harbour shelter uses the landform exposure field plus a simple enclosure test, not a wave model.
- Rival bids, neighbours and trade are not simulated. The hash-based auction price is a stand-in.
- No timing of full 1.5 km generation exists. The overnight estimate in the design note is UNVERIFIED.
- The pictures use a default font with no pound sign, so labels say "k" and the caption says in-game pounds.
