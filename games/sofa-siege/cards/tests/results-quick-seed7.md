Seed 7, 180 frames (QUICK run). Each cell: right card / wrong card / missed (a right name on a badly placed outline counts as missed).

### One card in view, 640x480 (54 frames)

| Card | all | 0.4-0.7 m | 0.7-1.0 m | 1.0-1.5 m | 20-35 deg | 35-55 deg | 55-75 deg |
|---|---|---|---|---|---|---|---|
| 00 WORLD ANCHOR | 56% / 0% / 44% | 100% / 0% / 0% | 67% / 0% / 33% | 0% / 0% / 100% | 33% / 0% / 67% | 67% / 0% / 33% | 67% / 0% / 33% |
| 01 BLUE BASE | 67% / 0% / 33% | 100% / 0% / 0% | 100% / 0% / 0% | 0% / 0% / 100% | 67% / 0% / 33% | 67% / 0% / 33% | 67% / 0% / 33% |
| 02 RED BASE | 33% / 0% / 67% | 67% / 0% / 33% | 33% / 0% / 67% | 0% / 0% / 100% | 0% / 0% / 100% | 67% / 0% / 33% | 33% / 0% / 67% |
| 03 CAPTURE FLAG | 44% / 0% / 56% | 67% / 0% / 33% | 33% / 0% / 67% | 33% / 0% / 67% | 0% / 0% / 100% | 67% / 0% / 33% | 67% / 0% / 33% |
| 04 HILL | 78% / 0% / 22% | 100% / 0% / 0% | 67% / 0% / 33% | 67% / 0% / 33% | 33% / 0% / 67% | 100% / 0% / 0% | 100% / 0% / 0% |
| 05 BUILD CAMP | 33% / 0% / 67% | 100% / 0% / 0% | 0% / 0% / 100% | 0% / 0% / 100% | 33% / 0% / 67% | 33% / 0% / 67% | 33% / 0% / 67% |
| **all six** | 52% / 0% / 48% | 89% / 0% / 11% | 50% / 0% / 50% | 17% / 0% / 83% | 28% / 0% / 72% | 67% / 0% / 33% | 61% / 0% / 39% |

Right-card rate by distance (rows) and camera height angle (columns), all six cards:

| | 20-35 deg | 35-55 deg | 55-75 deg |
|---|---|---|---|
| 0.4-0.7 m | 67% (4/6) | 100% (6/6) | 100% (6/6) |
| 0.7-1 m | 17% (1/6) | 67% (4/6) | 67% (4/6) |
| 1-1.5 m | 0% (0/6) | 33% (2/6) | 17% (1/6) |

Part-covered cards (10-30% hidden): right 36% of 14. Uncovered: right 58% of 40.

### One card in view, 1280x720 (54 frames)

| Card | all | 0.4-0.7 m | 0.7-1.0 m | 1.0-1.5 m | 20-35 deg | 35-55 deg | 55-75 deg |
|---|---|---|---|---|---|---|---|
| 00 WORLD ANCHOR | 89% / 0% / 11% | 100% / 0% / 0% | 100% / 0% / 0% | 67% / 0% / 33% | 67% / 0% / 33% | 100% / 0% / 0% | 100% / 0% / 0% |
| 01 BLUE BASE | 67% / 0% / 33% | 67% / 0% / 33% | 100% / 0% / 0% | 33% / 0% / 67% | 33% / 0% / 67% | 100% / 0% / 0% | 67% / 0% / 33% |
| 02 RED BASE | 89% / 0% / 11% | 100% / 0% / 0% | 100% / 0% / 0% | 67% / 0% / 33% | 67% / 0% / 33% | 100% / 0% / 0% | 100% / 0% / 0% |
| 03 CAPTURE FLAG | 89% / 0% / 11% | 100% / 0% / 0% | 100% / 0% / 0% | 67% / 0% / 33% | 67% / 0% / 33% | 100% / 0% / 0% | 100% / 0% / 0% |
| 04 HILL | 78% / 0% / 22% | 100% / 0% / 0% | 67% / 0% / 33% | 67% / 0% / 33% | 33% / 0% / 67% | 100% / 0% / 0% | 100% / 0% / 0% |
| 05 BUILD CAMP | 89% / 0% / 11% | 100% / 0% / 0% | 67% / 0% / 33% | 100% / 0% / 0% | 67% / 0% / 33% | 100% / 0% / 0% | 100% / 0% / 0% |
| **all six** | 83% / 0% / 17% | 94% / 0% / 6% | 89% / 0% / 11% | 67% / 0% / 33% | 56% / 0% / 44% | 100% / 0% / 0% | 94% / 0% / 6% |

Right-card rate by distance (rows) and camera height angle (columns), all six cards:

| | 20-35 deg | 35-55 deg | 55-75 deg |
|---|---|---|---|
| 0.4-0.7 m | 83% (5/6) | 100% (6/6) | 100% (6/6) |
| 0.7-1 m | 67% (4/6) | 100% (6/6) | 100% (6/6) |
| 1-1.5 m | 17% (1/6) | 100% (6/6) | 83% (5/6) |

Part-covered cards (10-30% hidden): right 86% of 14. Uncovered: right 83% of 40.

### Confusion matrix (rows: the card really shown; columns: what the detector said at that spot)

**one card in view, both resolutions**

| shown \ said | 00 | 01 | 02 | 03 | 04 | 05 | nothing | bad outline |
|---|---|---|---|---|---|---|---|---|
| 00 WORLD ANCHOR | 13 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| 01 BLUE BASE | 0 | 12 | 0 | 0 | 0 | 0 | 6 | 0 |
| 02 RED BASE | 0 | 0 | 11 | 0 | 0 | 0 | 7 | 0 |
| 03 CAPTURE FLAG | 0 | 0 | 0 | 12 | 0 | 0 | 6 | 0 |
| 04 HILL | 0 | 0 | 0 | 0 | 14 | 0 | 4 | 0 |
| 05 BUILD CAMP | 0 | 0 | 0 | 0 | 0 | 11 | 7 | 0 |

**two to four pages in view, both resolutions**

| shown \ said | 00 | 01 | 02 | 03 | 04 | 05 | nothing | bad outline |
|---|---|---|---|---|---|---|---|---|
| 00 WORLD ANCHOR | 4 | 0 | 0 | 0 | 0 | 0 | 8 | 0 |
| 01 BLUE BASE | 0 | 4 | 0 | 0 | 0 | 0 | 8 | 0 |
| 02 RED BASE | 0 | 0 | 8 | 0 | 0 | 0 | 6 | 0 |
| 03 CAPTURE FLAG | 0 | 0 | 0 | 5 | 0 | 0 | 6 | 0 |
| 04 HILL | 0 | 0 | 0 | 0 | 5 | 0 | 4 | 0 |
| 05 BUILD CAMP | 0 | 0 | 0 | 0 | 0 | 5 | 3 | 0 |

### Frames that should give nothing

| Kind | res | frames | frames with any false sighting | what was claimed |
|---|---|---|---|---|
| no card, wood or clutter | 640x480 | 12 | 0 (0%) | - |
| a different printed page (decoy) | 640x480 | 12 | 0 (0%) | - |
| 2-4 pages at once (33 real cards, 3 decoys) | 640x480 | 12 | right 15%, wrong 0%, missed 85% | decoys named as a card: 0; sightings away from any page: 0 |
| no card, wood or clutter | 1280x720 | 12 | 0 (0%) | - |
| a different printed page (decoy) | 1280x720 | 12 | 0 (0%) | - |
| 2-4 pages at once (33 real cards, 3 decoys) | 1280x720 | 12 | right 79%, wrong 0%, missed 21% | decoys named as a card: 0; sightings away from any page: 0 |

Sightings away from any page in the single and multi frames: 0 in 132 frames.

### How exact the outline and the pose are (right-card sightings only)

| res | distance | sightings | corner error px: median / 90% / worst | position error mm: median / 90% | distance error mm: median / 90% | tilt-and-turn error deg: median / 90% |
|---|---|---|---|---|---|---|
| 640x480 | 0.4-0.7 m | 16 | 0.6 / 1.5 / 2.3 | 0.8 / 1.9 | 0.8 / 1.7 | 0.3 / 0.4 |
| 640x480 | 0.7-1 m | 11 | 1.0 / 2.2 / 27.8 | 2.5 / 8.8 | 1.9 / 8.8 | 0.7 / 2.0 |
| 640x480 | 1-1.5 m | 6 | 1.2 / 3.5 / 6.2 | 9.7 / 208.1 | 9.7 / 208.1 | 2.7 / 33.8 |
| 640x480 | all | 33 | 0.8 / 2.2 / 27.8 | 1.3 / 9.7 | 1.0 / 9.7 | 0.4 / 2.7 |
| 1280x720 | 0.4-0.7 m | 17 | 0.4 / 1.3 / 2.1 | 0.3 / 1.5 | 0.3 / 1.5 | 0.1 / 0.3 |
| 1280x720 | 0.7-1 m | 19 | 0.5 / 1.7 / 3.3 | 1.0 / 3.3 | 1.0 / 3.3 | 0.1 / 0.6 |
| 1280x720 | 1-1.5 m | 34 | 0.5 / 0.8 / 6.0 | 2.9 / 6.3 | 2.9 / 6.3 | 0.3 / 0.9 |
| 1280x720 | all | 71 | 0.5 / 1.2 / 6.0 | 1.8 / 5.2 | 1.7 / 5.0 | 0.2 / 0.7 |

### Time per frame in Node on this machine (one core; see the Chromium numbers in the report)

- 640x480: median 263.6 ms, 90% 373.7 ms over 90 frames
- 1280x720: median 351.6 ms, 90% 447.9 ms over 90 frames

### Four ways of telling the cards apart (1280x720 single-card, decoy and no-card frames only)

| Way | right card | wrong card | missed | decoy pages named as a card | no-card frames with a sighting |
|---|---|---|---|---|---|
| A all features, most inliers wins | 83% (45/54) | 0% (0) | 17% | 2/12 | 0/12 |
| B distinct features only, most inliers wins | 72% (39/54) | 0% (0) | 28% | 0/12 | 0/12 |
| C all features, dense check names the card (the default) | 83% (45/54) | 0% (0) | 17% | 0/12 | 0/12 |
| D title + centre drawing only, most inliers wins | 78% (42/54) | 0% (0) | 22% | 2/12 | 0/12 |
