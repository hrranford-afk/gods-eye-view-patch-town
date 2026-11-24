# C03b: the two surprising C03 results, investigated (CLOUD, 21 Nov 2026)
Status: PASSED (both results explained, regression tests added). No simulation rule was changed. Nothing was tuned to make upgrades or repairs always profitable.
Reproduce: `node tools/c03b-investigate.mjs all` (output in `evidence/C03b_investigation.txt` and `.json`); `node tests/c03b-test.js` (28 of 28, `evidence/C03b_test_run.txt`). Bakery shown: the C03 district at 8 homes unless stated; per-minute figures.

## Verdict in one table
| Result | Verdict | Why |
|---|---|---|
| 1. A short brownout raises profit | CORRECT ECONOMIC BEHAVIOUR + TEMPORARY EFFECT | The shelf covers sales while the oven bakes less, so less electricity is spent. The saving is exactly the electricity not used (checked to 0.01). The stock is spent down, so it ends. A long or deep brownout loses money. Not a calculation error. |
| 2. Reopening a road lowers profit | MOSTLY A MEASUREMENT ARTEFACT (start-up stocking) PLUS AN UNINTENDED INTERACTION OF RULES | A blocked road empties the work places (nobody can commute), so wages stop, and carts miss drops, so ingredients are not bought. In the C03 10-minute run from an empty start this deferred the big one-off shelf-filling purchase. At steady state the effect vanishes (below). |
| Side finding | A MEASURING FLAW IN C03 (not a sim error) | C03's windows include the one-off cost of filling the shelves, because ingredients are charged when carts DELIVER, not when used. Absolute net figures were understated by 5 to 7 a minute (experiments 1, 2) and by about 16 (experiment 3). Signs and rankings mostly hold; see "What this does to C03". |

## 1. Why can a short brownout raise profit?
Rules read from `sim.js`: electricity is charged on energy drawn; a slow oven draws proportionally less power for proportionally longer, so a batch costs the same energy but fewer batches finish per minute; ingredients are charged at delivery; wages are charged per filled place; sales come from the shelf.
Grid cut to 60 percent at 350 s (5 delivery cycles of 70 s, so the next 140 s hold exactly two cycles and delivery timing cannot muddy it), per minute, baseline then cut (these are the figures the regression test checks):
| | made | sold | lost | income | electricity | wages | ingredients | NET | loaves on shelf |
|---|---|---|---|---|---|---|---|---|---|
| baseline | 25.7 | 20.6 | 0 | 82.3 | 2.3 | 15.0 | 25.4 | +39.6 | 23 at start, 35 at end |
| cut to 60 % | 15.4 | 20.6 | 0 | 82.3 | 1.4 | 15.0 | 25.4 | +40.5 | 23 at start, 11 at end |
Baking falls by 40 percent (the power factor fell from 95 to 57 percent), sales do not move, income is identical, the shelf drops from 23 to 11 loaves instead of rising to 35, electricity falls by 0.9 and that 0.9 IS the whole gain (test: net difference equals electricity difference to 0.01). Transport is unaffected (carts arrive; purchases identical). Wages are unchanged.
It ENDS: cut to 60 percent for good, the shelf is empty after about 5 to 8 minutes, then sales sit at the oven's capacity (14.4 against 20.6 demanded) and customers walk away (6 a minute); net falls to about 30 to 35 against 48 to 54, a loss of 17 to 21 a minute, in every later 5-minute window. Costs do fall (electricity 1.9 to 1.4, ingredients 17 to 9) but revenue falls by more.
Depth sweep, steady state (net, loaves sold): grid 100 percent 53.2 (20.5); 90 percent 53.2 (20.5); 80 percent 49.3 (19.5); 70 percent 40.6 (16.9); 60 percent 32.4 (14.4); 50 percent 24.5 (12.0); 40 percent 16.6 (9.6). Net never rises as the cut deepens (test). A cut costs nothing while oven capacity still exceeds demand (down to about 80 percent power here).
Classification: correct behaviour of a business with stock and spare baking capacity; the effect is an inventory timing gain, not a free one (the shelf must be rebuilt later, with the energy that costs). Measurement caution: purchases arrive every 70 s, so windows shorter than a few cycles show lumpy ingredient costs (for example 29.6, 29.6, 0.0 in successive minutes). C03's two-minute story leg partly mixed this noise with the real saving.

## 2. Why can reopening a road reduce profit?
C03 experiment 3, condition B (far from the market, two homes); road 5,2 blocked from 150 to 330 s; whole 600 s, per minute:
| | made | sold | income | electricity | wages | ingredients | NET |
|---|---|---|---|---|---|---|---|
| never blocked | 9.6 | 4.3 | 17.2 | 0.9 | 15.0 | 18.5 | -17.2 |
| blocked 180 s | 8.4 | 2.9 | 11.6 | 0.8 | 10.5 | 16.0 | -15.7 |
| difference | -1.2 | -1.4 | -5.6 | -0.1 | -4.5 | -2.5 | +1.5 |
Inside the 180 s block: staff share 0 (the three workers cannot reach the shop), nothing is baked or sold, wages 0 (only FILLED places are paid), electricity 0, ingredient purchases 0 (carts missed 6 drops; cash accounting), stock frozen. So a blocked road saves 45 in wages and some purchases while losing 56 in income. After it reopens the shop buys the shelves back up (ingredients 22.4 a minute against 14.8), which only partly catches up inside the 600 s run.
Why B looks so bad at all: its 600 s window starts from empty shelves and includes buying 173 coins of stock (60 flour, 40 water, 30 fuel). Steady state (1800 s warm-up): B nets -0.1 (break-even), not -15.7; ingredient purchases 2.2 a minute, not 16.0.
At steady state, same 180 s block measured over the 900 s that include the recovery:
| neighbourhood | open | blocked | difference | of which income | wages | ingredients |
|---|---|---|---|---|---|---|
| A (profitable) | +26.3 | +21.7 | -4.7 | -9.9 | -3.0 | -2.0 |
| B (break-even) | +0.07 | -0.10 | -0.2 | -3.7 | -3.0 | -0.5 |
So reopening a road never raises profit once start-up stocking is over: it is neutral for a break-even shop (wages saved cancel sales lost) and clearly positive for a profitable one.
Classification: (a) MEASUREMENT ARTEFACT, the dominant part: the +1.5 came from deferring one-off stocking purchases; (b) UNINTENDED INTERACTION OF RULES, real but small: road access fills work places, unfilled places are unpaid, so a closed road stops wages. A designer may or may not want that. (c) CORRECT ECONOMICS: a shop that loses money loses less while shut. (d) NOT a calculation error: identities hold (below).

## Accounting checks (no arithmetic error found)
Item by item, ingredient cost = price x (change in stock + used + spoiled); income = sold x price; wages = filled places x wage x time; electricity = kWh x price within 0.1 percent (the kWh counter is rounded each tick; immaterial). All in `tests/c03b-test.js`.

## What this does to C03's published figures (an erratum; the sim is unchanged)
| C03 claim | At steady state (1800 s warm-up) | Verdict |
|---|---|---|
| Exp 1 net at 2, 4, 6, 8, 10 homes: 5.6, 20.6, 32.5, 44.8, 55.3 | 11.4, 26.5, 39.9, 52.2, 60.4 | Absolute values 5 to 7 low; demand rises, same story |
| Exp 2 stone deck oven gain 0.1 to 0.2 | 0.0 | Holds: no gain |
| Exp 2 cool store room loses 6 to 11 a minute | loses about 3.0 (wages +1 for 3 workers) | Still NO, but the size was exaggerated by one-off shelf filling |
| Exp 3 A +10.0, B -15.7 (gap 25.7) | A +26.0, B -0.1 (gap 26.1) | Gap holds; B is break-even, not a heavy loser |
| Exp 3 cause "road: -1.5" | -0.2 (B) and -4.7 (A) | The -1.5 was the artefact; a blocked road hurts a profitable shop |
`DI.exp1/2/3` still use the C03 windows so the C03 files stay reproducible. The fix belongs in how experiments are measured (a warm-up of at least 1800 s and whole delivery cycles), not in the simulation.

## What remains uncertain
1. Whether wages should be paid when a closed road empties the work places (contracted staff would be paid). A design decision for the owner; it makes road outages nearly free for a break-even shop.
2. Whether ingredient costs should be charged on use (accrual) instead of delivery (cash). Cash costing is what creates the start-up transient; it is a plausible rule, kept as is.
3. The shop's ingredient storage cap (60, 40, 30) sets how big the one-off stocking is; other shops not tested at steady state.
4. Only the bakery was examined in depth; the workshop and market have the same rules but were not decomposed.
5. All coefficients remain illustrative. Nothing was run on an iPad.
## Implications for C06
Cost comparisons need a warm-up of at least 1800 s and whole delivery cycles. A short local brownout will show a profit gain again (stock buffer): the page should show "shelf stock" and "energy saved" in its explanation so players are not misled. The wage-when-unreachable rule needs an owner decision before outages are made cheaper or dearer.
