# Arsenal report: seven weapons against nine camps

Made by `tests/lab-test.js` (`SG.labMatrix()`), written every run. Same camp every time (a Keep behind a gate and two walls, a tent and a workshop); only the counter changes. Piece scale small. Free gun, fixed seed 424242, each cell a fresh copy of the camp.

**How a cell is made.** 5 shots: one at the aim spot and four round it (the first five points of the range report's carpet), nothing mended between them. The same volley at 4 seeds; the cell is the mean. Chain topple is off, so a falling piece does not knock its neighbours. **Points**: a part of the camp off 1, a collapse 3, a Keep felled 10, a mouse dizzied, slowed or blown .25. What the counters lose (their wear) is shown but not counted: a counter is there to be hit. "-80%" means 80% fewer points than the bare camp. A counter "counters" a weapon when it cuts the points by 40% or more.

## Points (camp parts lost, then counter wear, then mice)

| Weapon (price) | No counter | Roof (1 pt) | Shield board (1 pt) | Ditch + log barrier (2 pt) | Net (0.5 pt) | Cutter post (0.5 pt) | Extra braces (3 pt) | Heavy block + low wall (2 pt) | Every counter (10 pt) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lobber (4) | **7.1** 6p m4.5 | **0.1** 0p w3 m0.5 (-98%) | **3.5** 3p w2 m2 (-51%) | **7.1** 6p m4.5 (+0%) | **6.4** 6p m1.5 (-11%) | **7.1** 6p m4.5 (+0%) | **7.1** 6p m4.5 (+0%) | **7.1** 6p m4.5 (+0%) | **1.0** 1p w3 (-86%) |
| Flat flinger (4.9) | **9.4** 6p m1.5 | **9.1** 6p m0.5 (-3%) | **0.0** 0p w4 (-100%) | **0.0** 0p w3 (-100%) | **9.1** 6p m0.5 (-3%) | **9.4** 6p m1.5 (+0%) | **9.4** 6p m1.5 (+0%) | **9.4** 6p m1.5 (+0%) | **0.0** 0p w3 (-100%) |
| Roller (5.1) | **14.8** 11p m3 | **14.3** 11p m1.25 (-3%) | **14.8** 11p w3 m3.25 (+0%) | **0.0** 0p w1 (-100%) | **14.3** 11p m1.25 (-3%) | **14.8** 11p m3 (+0%) | **14.8** 11p w1 m3 (+0%) | **14.8** 11p m3 (+0%) | **0.0** 0p w1 (-100%) |
| Scatter popper (3.3) | **3.1** 2.25p m3.25 | **1.9** 1.25p w3 m2.5 (-39%) | **1.7** 1p m2.75 (-45%) | **3.1** 2.25p m3.25 (+0%) | **0.9** 0.75p w3 m0.5 (-71%) | **3.1** 2.25p m3.25 (+0%) | **3.1** 2.25p w0.5 m3.5 (+2%) | **3.1** 2.25p w0.75 m3.25 (+0%) | **0.3** 0p w4.25 m1.25 (-90%) |
| Tether hook (3.1) | **9.3** 6p m1 | **9.0** 6p (-3%) | **0.0** 0p w5 (-100%) | **3.0** 3p w2 (-68%) | **0.0** 0p (-100%) | **3.0** 3p w2 (-68%) | **9.3** 6p m1 (+0%) | **9.3** 6p m1 (+0%) | **0.0** 0p w3 (-100%) |
| Thumper (4.7) | **17.9** 17p m3.5 | **17.1** 17p m0.5 (-4%) | **13.3** 13p m1 (-26%) | **17.9** 17p m3.5 (+0%) | **17.1** 17p m0.5 (-4%) | **17.9** 17p m3.5 (+0%) | **3.6** 3p m2.25 (-80%) | **18.0** 17p w1 m4 (+1%) | **3.0** 3p w2 (-83%) |
| Fan (2.9) | **2.3** 0p m9 | **2.3** 0p w3 m9 (+0%) | **1.8** 0p m7 (-22%) | **2.3** 0p m9 (+0%) | **2.3** 0p w3 m9 (+0%) | **2.3** 0p m9 (+0%) | **2.3** 0p m9 (+0%) | **0.8** 0p m3 (-67%) | **0.3** 0p w6 m1.25 (-86%) |
| Lobber, high lob (variant) (4) | **2.5** 2p m2 | **0.0** 0p (-100%) | **2.5** 2p m2 (+0%) | **2.5** 2p m2 (+0%) | **2.0** 2p (-20%) | **2.5** 2p m2 (+0%) | **2.5** 2p m2 (+0%) | **2.5** 2p m2 (+0%) | **0.0** 0p (-100%) |

`p` camp parts lost, `w` counter parts lost (wear), `m` mice dizzied, slowed or blown.

## Verdicts

- **Lobber** (price 4 points): countered by Roof (98% less), Shield board (51% less); strong vs Long wall (8 points).
- **Flat flinger** (price 4.9 points): countered by Shield board (100% less), Ditch + log barrier (100% less); strong vs Walled Keep (9 points).
- **Roller** (price 5.1 points): countered by Ditch + log barrier (100% less); strong vs Walled Keep (14.31 points).
- **Scatter popper** (price 3.3 points): countered by Net (71% less), Shield board (45% less); strong vs Long wall (4.06 points).
- **Tether hook** (price 3.1 points): countered by Shield board (100% less), Net (100% less), Ditch + log barrier (68% less), Cutter post (68% less); strong vs Glass house (13.75 points).
- **Thumper** (price 4.7 points): countered by Extra braces (80% less); strong vs Long wall (19 points).
- **Fan** (price 2.9 points): countered by Heavy block + low wall (67% less); strong vs Braced Keep (3.25 points).
- **Lobber, high lob (variant)** (price 4 points): countered by Roof (100% less); strong vs Long wall (2 points).

## What each weapon is strong against (camps with no counter in them)

| Weapon | Walled Keep | Braced Keep | Long wall | Workshop cluster | Glass house | Village |
|---|---:|---:|---:|---:|---:|---:|
| Lobber | 4.3 | 1.3 | **8.0** | 4.0 | 1.0 | 1.0 |
| Flat flinger | **9.0** | 0.0 | 5.0 | 1.0 | 0.0 | 1.0 |
| Roller | **14.3** | 3.4 | 11.5 | 13.6 | 3.5 | 7.3 |
| Scatter popper | 1.5 | 1.0 | **4.1** | 3.3 | 0.4 | 1.3 |
| Tether hook | 5.0 | 5.0 | 5.0 | 4.0 | **13.8** | 13.8 |
| Thumper | 17.4 | 0.3 | **19.0** | 0.0 | 4.3 | 14.4 |
| Fan | 0.0 | **3.3** | 1.8 | 0.0 | 2.3 | 2.8 |
| Lobber, high lob (variant) | 0.0 | 0.0 | **2.0** | 1.0 | 0.0 | 0.0 |

Bold is the weapon's best camp of the six.

## Counter prices against weapon prices (budget points)

| Counter | Price | Aimed at | Weapon price |
|---|---:|---|---:|
| Roof (awning) | 1 | Lobber | 4 |
| Shield board | 1 | Flat flinger | 4.9 |
| Log barrier | 1 | Flat flinger | 4.9 |
| Ditch | 1 | Roller | 5.1 |
| Log barrier | 1 | Roller | 5.1 |
| Net | 0.5 | Scatter popper | 3.3 |
| Cutter post | 0.5 | Tether hook | 3.1 |
| Net | 0.5 | Tether hook | 3.1 |
| Brace | 1 | Thumper | 4.7 |
| Heavy block | 1.5 | Fan | 2.9 |
| Low wall | 0.5 | Fan | 2.9 |

Prices of weapons are `wPrice` (my formula, not tested against play). Counters cost from half a point to a point and a half. A camp row costs: Roof 1, Shield board 1, Ditch + log barrier 2, Net 0.5, Cutter post 0.5, Extra braces 3, Heavy block + low wall 2, Every counter 10.
