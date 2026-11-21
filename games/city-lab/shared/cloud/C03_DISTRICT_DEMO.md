# C03: the living neighbourhood, demo and honest assessment (CLOUD, 21 Nov 2026)
Status: PASSED for the stated acceptance (three experiments with repeatable tests, visible outcomes, recorded figures). Judged by the owner as a game: not yet. Nothing here was run on an iPad.

## What was built (all under games/city-lab/)
- `district.js`, `district-validate.js`, `DISTRICT.md`: the city layer. Residents, demand, shared electricity, shared deliveries, workshop jobs, upgrades by C02 sidecar. It runs the EXISTING per-building simulation (`sim.js`); four small optional hooks were added there and the original suites pass unchanged.
- `districts/patch_row.json` (ChatGPT's small recipes) and `districts/patch_row_hand.json` (hand-made).
- Four hand-made recipes of 50 to 53 parts: `recipes/home_cottage.json`, `market_hall.json`, `workshop.json`, `power_shed.json` (made by `tools/gen-district-recipes.py` from the bakery's detailed shell). They pass the real v1 validator, and the three experiments give IDENTICAL figures on them and on ChatGPT's recipes (`tools/compare-looks.mjs`), so only the looks changed.
- `district.html` + `district-app.js`: the neighbourhood from above in 3D with resident mice, power cables (green, amber, red), the delivery route (blue squares, a red dotted line and a red cross on a blocked road), demand and worker labels, a "What changed and why" log (one sentence per change, with before and after numbers, and the change flashes in the 3D view), controls (add or remove a home, block or open any road, grid supply 100, 80 or 60 percent, apply an upgrade, reset), building inspect, and the three experiments run inside the page.

## The three experiments (figures in `evidence/C03_experiments.json`, table in `C03_DISTRICT_RESULTS.md`; each run three times, byte-identical)
1. More homes: YES, demand rises (8.1, 12.9, 16.9, 20.6, 25.3 loaves a minute at 2, 4, 6, 8, 10 homes), but more slowly than residents (1.01 to 0.64 per resident) because new homes stand further from the bakery. It stops being demand-limited at 8 homes (power: 13.7 kW wanted against 13.0 supplied) and at 10 (bakery capacity). Net per minute 5.6 to 55.3.
2. Upgrade the bakery: NO with the district data. The stone deck oven adds nothing (net 44.85 to 45.03 at 8 homes) because baking was never the limit, and it deepens the brownout (95 to 83 percent power). The cool store room loses money at every size (net 44.85 to 38.64 at 8 homes). The oven pays back within an hour only if residents want at least 1.8 loaves a minute each (from 8 homes; 6 homes at 2.4; 4 homes at 3.0). Those are sensitivity runs, not the base data. The data was not tuned to force a yes.
3. Two identical bakeries: YES, they differ a lot. Bakery A nets +10.0 a minute, bakery B -15.7. The control (two bakeries in A's conditions) matches A to the last digit. Causes, one at a time: homes +8.1, location +8.5, road -1.5, power +0.0; they interact, together +25.7.

## Tests (all headless; software GL; no iPad)
district-test 70 of 70; district-e2e 11 of 11; district-page-test 29 of 29 (including: every control writes an explanation to the log, and the in-page experiments equal the headless figures exactly, at 834x1194 and 1180x820). Unchanged old suites: validate 171, sim 72, support 23, page 56, e2e 10. Full output: `evidence/C03_test_runs.txt`.

## What fails, looks wrong, or is crude (blunt)
- Never run on an iPad. Frame time in software GL is about 100 ms for the district page (relative only; the single bakery page was about 195 ms).
- Model oddities found, not fixed: (a) a short brownout RAISES net per minute (the shop has stock, so it still sells while electricity costs fall); a long brownout would bite and was not tested; (b) in experiment 3 reopening B's blocked road raises demand but lowers net by 1.5, which I could not explain from the data and have not investigated; (c) in the story test, the net after the stone deck oven rose by 7.3 in the first minutes, but that includes a start-up transient, and experiment 2 (a clean comparison) says the gain is 0.2.
- All coefficients (how much bread a resident wants, how fast demand decays with distance, the market bonus) are illustrative, chosen to be plausible, not measured from anything. They live in the district file so the owner can change them.
- Residents are counted, not individuals: the mice at the homes are decoration tied to the count; they do not walk to work or shop. Roads are open or blocked cells, nothing more. Nothing is saved between visits and there is no undo (the old C03 order listed it; the owner's order did not).
- Experiment 3 is shown as a table plus "View neighbourhood A / B" buttons (one at a time), not two neighbourhoods side by side. A "place a second bakery" button was not built. Experiment 2 takes a few seconds in the page and blocks the screen while it runs.
- Labels can overlap if the table is turned a lot. The scheduled-event toast text is long.

## What should be tested next
1. The owner opens `district.html` on the iPad: speed, legibility of the labels, whether the "why" log is understandable, and whether the heat and frame rate are acceptable.
2. The surprising answer in experiment 2 is the real game-design finding: production upgrades only pay if demand is above capacity. Next step: let the owner change `per_resident_per_min` and see the page respond, and add a market stall upgrade (more demand) as the upgrade that DOES pay.
3. Investigate the two model oddities above before trusting any balance claim.
4. A longer brownout and a longer blocked road, to see whether stock buffers hide real losses.
5. Only then: save and undo, side-by-side neighbourhoods, and more building types.

## Reusable parts
Generic: the district file format and validator, the demand, power, delivery and employment rules, the hooks in `sim.js`, the log writer, the page's overlay and log code, the experiment runner and explanation writer, `compare-looks.mjs`. Specific to this settlement: the coefficients, the road layout and the hand-made recipes.
Ownership note: this is CLOUD work only. Nothing here touches the home machines, physical asset production or the hardware branch.
