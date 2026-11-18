Seed 20261118, 1008 frames. Each cell: right card / wrong card / missed (a right name on a badly placed outline counts as missed).

### One card in view, 640x480 (324 frames)

| Card | all | 0.4-0.7 m | 0.7-1.0 m | 1.0-1.5 m | 20-35 deg | 35-55 deg | 55-75 deg |
|---|---|---|---|---|---|---|---|
| 00 WORLD ANCHOR | 43% / 2% / 56% | 89% / 0% / 11% | 22% / 0% / 78% | 17% / 6% / 78% | 28% / 0% / 72% | 33% / 0% / 67% | 67% / 6% / 28% |
| 01 BLUE BASE | 54% / 0% / 46% | 83% / 0% / 17% | 61% / 0% / 39% | 17% / 0% / 83% | 17% / 0% / 83% | 67% / 0% / 33% | 78% / 0% / 22% |
| 02 RED BASE | 44% / 0% / 56% | 89% / 0% / 11% | 33% / 0% / 67% | 11% / 0% / 89% | 39% / 0% / 61% | 39% / 0% / 61% | 56% / 0% / 44% |
| 03 CAPTURE FLAG | 43% / 2% / 56% | 78% / 0% / 22% | 39% / 6% / 56% | 11% / 0% / 89% | 11% / 6% / 83% | 50% / 0% / 50% | 67% / 0% / 33% |
| 04 HILL | 37% / 2% / 61% | 72% / 0% / 28% | 39% / 0% / 61% | 0% / 6% / 94% | 17% / 0% / 83% | 39% / 0% / 61% | 56% / 6% / 39% |
| 05 BUILD CAMP | 48% / 0% / 52% | 89% / 0% / 11% | 44% / 0% / 56% | 11% / 0% / 89% | 33% / 0% / 67% | 50% / 0% / 50% | 61% / 0% / 39% |
| **all six** | 45% / 1% / 54% | 83% / 0% / 17% | 40% / 1% / 59% | 11% / 2% / 87% | 24% / 1% / 75% | 46% / 0% / 54% | 64% / 2% / 34% |

Right-card rate by distance (rows) and camera height angle (columns), all six cards:

| | 20-35 deg | 35-55 deg | 55-75 deg |
|---|---|---|---|
| 0.4-0.7 m | 56% (20/36) | 97% (35/36) | 97% (35/36) |
| 0.7-1 m | 17% (6/36) | 33% (12/36) | 69% (25/36) |
| 1-1.5 m | 0% (0/36) | 8% (3/36) | 25% (9/36) |

Part-covered cards (10-30% hidden): right 35% of 54. Uncovered: right 47% of 270.

### One card in view, 1280x720 (324 frames)

| Card | all | 0.4-0.7 m | 0.7-1.0 m | 1.0-1.5 m | 20-35 deg | 35-55 deg | 55-75 deg |
|---|---|---|---|---|---|---|---|
| 00 WORLD ANCHOR | 85% / 0% / 15% | 100% / 0% / 0% | 89% / 0% / 11% | 67% / 0% / 33% | 78% / 0% / 22% | 89% / 0% / 11% | 89% / 0% / 11% |
| 01 BLUE BASE | 76% / 0% / 24% | 94% / 0% / 6% | 78% / 0% / 22% | 56% / 0% / 44% | 56% / 0% / 44% | 78% / 0% / 22% | 94% / 0% / 6% |
| 02 RED BASE | 83% / 0% / 17% | 100% / 0% / 0% | 89% / 0% / 11% | 61% / 0% / 39% | 72% / 0% / 28% | 83% / 0% / 17% | 94% / 0% / 6% |
| 03 CAPTURE FLAG | 80% / 2% / 19% | 100% / 0% / 0% | 78% / 0% / 22% | 61% / 6% / 33% | 61% / 0% / 39% | 89% / 6% / 6% | 89% / 0% / 11% |
| 04 HILL | 81% / 2% / 17% | 100% / 0% / 0% | 100% / 0% / 0% | 44% / 6% / 50% | 72% / 0% / 28% | 78% / 0% / 22% | 94% / 6% / 0% |
| 05 BUILD CAMP | 76% / 0% / 24% | 89% / 0% / 11% | 83% / 0% / 17% | 56% / 0% / 44% | 44% / 0% / 56% | 83% / 0% / 17% | 100% / 0% / 0% |
| **all six** | 80% / 1% / 19% | 97% / 0% / 3% | 86% / 0% / 14% | 57% / 2% / 41% | 64% / 0% / 36% | 83% / 1% / 16% | 94% / 1% / 6% |

Right-card rate by distance (rows) and camera height angle (columns), all six cards:

| | 20-35 deg | 35-55 deg | 55-75 deg |
|---|---|---|---|
| 0.4-0.7 m | 94% (34/36) | 97% (35/36) | 100% (36/36) |
| 0.7-1 m | 69% (25/36) | 92% (33/36) | 97% (35/36) |
| 1-1.5 m | 28% (10/36) | 61% (22/36) | 83% (30/36) |

Part-covered cards (10-30% hidden): right 72% of 54. Uncovered: right 82% of 270.

### Confusion matrix (rows: the card really shown; columns: what the detector said at that spot)

**one card in view, both resolutions**

| shown \ said | 00 | 01 | 02 | 03 | 04 | 05 | nothing | bad outline |
|---|---|---|---|---|---|---|---|---|
| 00 WORLD ANCHOR | 69 | 0 | 0 | 1 | 0 | 0 | 38 | 0 |
| 01 BLUE BASE | 0 | 70 | 0 | 0 | 0 | 0 | 38 | 0 |
| 02 RED BASE | 0 | 0 | 69 | 0 | 0 | 0 | 39 | 0 |
| 03 CAPTURE FLAG | 0 | 0 | 0 | 66 | 2 | 0 | 40 | 0 |
| 04 HILL | 0 | 0 | 0 | 2 | 64 | 0 | 42 | 0 |
| 05 BUILD CAMP | 0 | 0 | 0 | 0 | 0 | 67 | 41 | 0 |

**two to four pages in view, both resolutions**

| shown \ said | 00 | 01 | 02 | 03 | 04 | 05 | nothing | bad outline |
|---|---|---|---|---|---|---|---|---|
| 00 WORLD ANCHOR | 29 | 0 | 0 | 0 | 0 | 0 | 33 | 0 |
| 01 BLUE BASE | 0 | 29 | 0 | 0 | 0 | 0 | 34 | 0 |
| 02 RED BASE | 0 | 0 | 33 | 0 | 0 | 0 | 26 | 1 |
| 03 CAPTURE FLAG | 0 | 0 | 0 | 29 | 2 | 0 | 29 | 0 |
| 04 HILL | 0 | 0 | 0 | 1 | 13 | 0 | 24 | 0 |
| 05 BUILD CAMP | 0 | 0 | 0 | 0 | 0 | 19 | 28 | 0 |

### Frames that should give nothing

| Kind | res | frames | frames with any false sighting | what was claimed |
|---|---|---|---|---|
| no card, wood or clutter | 640x480 | 60 | 0 (0%) | - |
| a different printed page (decoy) | 640x480 | 60 | 0 (0%) | - |
| 2-4 pages at once (165 real cards, 15 decoys) | 640x480 | 60 | right 30%, wrong 1%, missed 69% | decoys named as a card: 0; sightings away from any page: 0 |
| no card, wood or clutter | 1280x720 | 60 | 0 (0%) | - |
| a different printed page (decoy) | 1280x720 | 60 | 1 (2%) | D1->03 |
| 2-4 pages at once (165 real cards, 15 decoys) | 1280x720 | 60 | right 62%, wrong 1%, missed 37% | decoys named as a card: 0; sightings away from any page: 0 |

Sightings away from any page in the single and multi frames: 0 in 768 frames.

### How exact the outline and the pose are (right-card sightings only)

| res | distance | sightings | corner error px: median / 90% / worst | position error mm: median / 90% | distance error mm: median / 90% | tilt-and-turn error deg: median / 90% |
|---|---|---|---|---|---|---|
| 640x480 | 0.4-0.7 m | 93 | 0.4 / 1.2 / 51.2 | 0.8 / 2.0 | 0.7 / 2.0 | 0.2 / 0.7 |
| 640x480 | 0.7-1 m | 69 | 0.8 / 2.6 / 17.9 | 2.6 / 11.2 | 2.4 / 10.9 | 0.6 / 2.1 |
| 640x480 | 1-1.5 m | 32 | 1.4 / 4.7 / 20.6 | 7.7 / 56.7 | 7.7 / 56.1 | 1.9 / 41.5 |
| 640x480 | all | 194 | 0.6 / 2.6 / 51.2 | 1.4 / 12.3 | 1.4 / 12.2 | 0.4 / 2.2 |
| 1280x720 | 0.4-0.7 m | 105 | 0.4 / 1.8 / 32.4 | 0.5 / 1.7 | 0.4 / 1.7 | 0.1 / 0.4 |
| 1280x720 | 0.7-1 m | 114 | 0.4 / 1.2 / 6.6 | 1.2 / 2.5 | 1.2 / 2.5 | 0.1 / 0.5 |
| 1280x720 | 1-1.5 m | 136 | 0.6 / 1.7 / 50.2 | 2.6 / 6.7 | 2.6 / 6.7 | 0.3 / 0.9 |
| 1280x720 | all | 363 | 0.5 / 1.5 / 50.2 | 1.3 / 4.7 | 1.3 / 4.7 | 0.1 / 0.8 |

### Time per frame in Node on this machine (one core; see the Chromium numbers in the report)

- 640x480: median 266.9 ms, 90% 338.5 ms over 504 frames
- 1280x720: median 363.5 ms, 90% 431.9 ms over 504 frames

### Four ways of telling the cards apart (1280x720 single-card, decoy and no-card frames only)

| Way | right card | wrong card | missed | decoy pages named as a card | no-card frames with a sighting |
|---|---|---|---|---|---|
| A all features, most inliers wins | 79% (255/324) | 1% (4) | 20% | 7/60 | 0/60 |
| B distinct features only, most inliers wins | 73% (236/324) | 1% (3) | 26% | 5/60 | 0/60 |
| C all features, dense check names the card (the default) | 80% (260/324) | 1% (2) | 19% | 1/60 | 0/60 |
| D title + centre drawing only, most inliers wins | 76% (245/324) | 1% (2) | 24% | 3/60 | 0/60 |
