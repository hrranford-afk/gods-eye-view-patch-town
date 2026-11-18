# Card recognition report (18 Nov 2026)

**Every number here was measured on this build machine with made-up camera frames. Nothing here has been tested on a real iPad, a real camera or a real print. Those are marked NOT TESTED.**

## Which set to print

**Print Set 2b, in black and white, at A5.** Open `print.html?set=2b&size=a5`, then check it with `cards.html?set=2b&size=a5`.

- Set 2 and Set 2b never named a card wrongly (0 in 978 showings each). Set 1 did, 10 times.
- Bigger paper is the largest gain measured: Set 2 art at A5 was right 96% of the time at 1280×720, against 82% at A6. (Set 2b at A5 was not run as its own test. Its art is the same as Set 2 for four cards and it scored the same at A6, so the same gain is expected. That part is a forecast, not a measurement.)
- Set 2b over Set 2: BLUE BASE went from 87% to 91% at 1280×720. Nothing got worse by more than the noise.
- Colour is optional. The colour print did no better and no worse through the grey recogniser (59% and 83%, against 62% and 82%). The colour cue was right every time it could be read, even under a warm lamp, but using it to take back near-misses added as many wrong sightings as right ones. So: print colour if Harry likes the look; it does not help or hurt recognition. A grey print of the colour file works as plain black and white.
- All of this is from made-up frames. **NOT TESTED on a real device.**

## The short answer

1. **Yes, the camera can tell the cards apart from the artwork alone, with no QR code, in made-up frames.** Two finders work together: one matches corner features, the other finds the sheet of paper and checks the drawing on it.
2. **Set 2 (bold woodcut) is the safer artwork. It never named a card wrongly.** Set 1 (engraved) named the wrong card 10 times in 978 showings, 9 of them CAPTURE FLAG and HILL taken for each other.
3. **Set 2 printed at A5 was the best of everything tried:** 96% right at 1280×720 and 75% at 640×480, no wrong card.
4. **Use 1280×720, not 640×480.** The small picture loses a quarter to a third of the sightings.
5. **Reliable range in these frames: up to about 1 m, with the camera at least 35° above the table.** Beyond 1 m, or held low, it misses often. It misses; it does not guess.

| Right card / wrong card / missed, one card in view | 640×480 | 1280×720 |
|---|---|---|
| Set 1, engraved, A5 | 69% / 1% / 30% | 86% / 1% / 13% |
| Set 2, bold, A6 (its true size) | 62% / 0% / 38% | 82% / 0% / 18% |
| **Set 2, bold, printed at A5** | **75% / 0% / 25%** | **96% / 0% / 4%** |
| Both sets in one database (12 cards) | 71% / 0% / 29% | 88% / 0% / 12% |

324 frames per cell (216 for the mixed row). False sightings on frames with no card: 0 of 120 for each set. A different printed page named as a card: 1 of 120 for Set 1, 0 of 120 for Set 2. Upside-down mistakes: 0 for both sets.

**Recommendation: pure artwork, in Set 2's style (now Set 2b), printed at A5. No hidden marker is needed on this evidence.** Ask ChatGPT for a small revision of Set 2 (see "Notes for ChatGPT"). Then the one thing that matters: print the cards and try `cards.html` on the real iPad.

## How it was tested

- `tests/recognise-test.js` draws camera frames with `synth.js`: a printed card lying on a table, seen from 0.4 to 1.5 m, 20° to 75° above the table, turned any way round.
- Backgrounds: wood, or wood or cloth with clutter (pages, cups, pens, chequered things, boxes).
- Each frame also gets blur, sensor noise and uneven light. About 4 in 10 get a mild glare patch on the card. One single-card frame in six has 10–30% of the card covered.
- Also: frames with no card, frames with a different printed page (the same border with scrambled insides, the same border with another drawing, a page of text), and frames with two to four pages at once.
- 1008 frames per set, half at 640×480 and half at 1280×720. Fixed seed 20261118. The pass thresholds were tuned on a different seed (7), not on the test frames.
- A sighting counts as right only if the name is right **and** the outline sits on the card (corner error under 15% of the card's width).
- Each set is drawn at its true printed size: Set 1 is A5 (210 × 148.5 mm), Set 2 is A6 (148 × 105 mm).

What made-up frames do not have: real lens distortion, focus hunting, blur from a moving hand, curled or creased paper, shadows of hands, coloured light, a real printer's ink. So real results will differ. Which way is UNKNOWN.

## How the recogniser works

1. **Corner matching.** Corner points with a turn-proof binary description (the ORB recipe), matched to a database built from the card PNGs. A fitted flat-sheet mapping gives the outline.
2. **Paper outline.** Bright four-sided blobs in a small copy of the picture are tried as cards, all four ways up.
3. **Dense check (this names the card).** The picture under the outline is flattened to a small card and compared cell by cell with all six cards. Cells that differ between cards count most. The same step nudges the outline into place.

Set 1's shared border turned out to help step 1 (any border finds "a card"). Step 3 is what tells the cards apart.

## Set 1 against Set 2

Same seed (20261118), same camera, distances, angles, backgrounds and thresholds. Each set at its true printed size: Set 1 is A5 (210 x 148.5 mm), Set 2 is A6 (148 x 105 mm), so a Set 2 card covers half the area in the picture at the same distance.
Cells: right card / wrong card / missed.

### One card in view, 640x480

| | Set 1 (A5 engraved) | Set 2 (A6 bold) |
|---|---|---|
| **all frames** | **69% / 1% / 30%** | **62% / 0% / 38%** |
| 0.4-0.7 m | 91% / 0% / 9% | 83% / 0% / 17% |
| 0.7-1.0 m | 68% / 1% / 31% | 60% / 0% / 40% |
| 1.0-1.5 m | 49% / 3% / 48% | 44% / 0% / 56% |
| 20-35 deg | 54% / 1% / 45% | 54% / 0% / 46% |
| 35-55 deg | 73% / 0% / 27% | 60% / 0% / 40% |
| 55-75 deg | 81% / 3% / 17% | 73% / 0% / 27% |
| part covered (10-30%) | 35% / 0% / 65% | 13% / 0% / 87% |
| 00 WORLD ANCHOR | 67% / 2% / 31% | 54% / 0% / 46% |
| 01 BLUE BASE | 76% / 0% / 24% | 69% / 0% / 31% |
| 02 RED BASE | 69% / 0% / 31% | 70% / 0% / 30% |
| 03 CAPTURE FLAG | 65% / 2% / 33% | 59% / 0% / 41% |
| 04 HILL | 72% / 4% / 24% | 63% / 0% / 37% |
| 05 BUILD CAMP | 67% / 0% / 33% | 59% / 0% / 41% |

Right-card rate, distance by angle:

| | Set 1: 20-35 | Set 1: 35-55 | Set 1: 55-75 | Set 2: 20-35 | Set 2: 35-55 | Set 2: 55-75 |
|---|---|---|---|---|---|---|
| 0.4-0.7 m | 78% (28/36) | 97% (35/36) | 97% (35/36) | 75% (27/36) | 83% (30/36) | 92% (33/36) |
| 0.7-1.0 m | 44% (16/36) | 72% (26/36) | 86% (31/36) | 47% (17/36) | 58% (21/36) | 75% (27/36) |
| 1.0-1.5 m | 39% (14/36) | 50% (18/36) | 58% (21/36) | 39% (14/36) | 39% (14/36) | 53% (19/36) |

### One card in view, 1280x720

| | Set 1 (A5 engraved) | Set 2 (A6 bold) |
|---|---|---|
| **all frames** | **86% / 1% / 13%** | **82% / 0% / 18%** |
| 0.4-0.7 m | 98% / 0% / 2% | 98% / 0% / 2% |
| 0.7-1.0 m | 90% / 0% / 10% | 89% / 0% / 11% |
| 1.0-1.5 m | 69% / 3% / 28% | 58% / 0% / 42% |
| 20-35 deg | 74% / 0% / 26% | 69% / 0% / 31% |
| 35-55 deg | 89% / 1% / 10% | 85% / 0% / 15% |
| 55-75 deg | 94% / 2% / 4% | 91% / 0% / 9% |
| part covered (10-30%) | 74% / 0% / 26% | 69% / 0% / 31% |
| 00 WORLD ANCHOR | 89% / 0% / 11% | 67% / 0% / 33% |
| 01 BLUE BASE | 85% / 0% / 15% | 87% / 0% / 13% |
| 02 RED BASE | 85% / 0% / 15% | 87% / 0% / 13% |
| 03 CAPTURE FLAG | 83% / 4% / 13% | 83% / 0% / 17% |
| 04 HILL | 93% / 2% / 6% | 78% / 0% / 22% |
| 05 BUILD CAMP | 80% / 0% / 20% | 89% / 0% / 11% |

Right-card rate, distance by angle:

| | Set 1: 20-35 | Set 1: 35-55 | Set 1: 55-75 | Set 2: 20-35 | Set 2: 35-55 | Set 2: 55-75 |
|---|---|---|---|---|---|---|
| 0.4-0.7 m | 97% (35/36) | 97% (35/36) | 100% (36/36) | 97% (35/36) | 97% (35/36) | 100% (36/36) |
| 0.7-1.0 m | 78% (28/36) | 94% (34/36) | 97% (35/36) | 72% (26/36) | 97% (35/36) | 97% (35/36) |
| 1.0-1.5 m | 47% (17/36) | 75% (27/36) | 86% (31/36) | 39% (14/36) | 61% (22/36) | 75% (27/36) |

### Same apparent size: right-card rate by how wide the card is in the picture (single-card frames, both resolutions)

This takes the paper size out of the comparison.

| card width in the picture | Set 1 | Set 2 |
|---|---|---|
| 0-60 px | n/a (0/0) | 41% (7/17) |
| 60-90 px | 48% (15/31) | 43% (50/116) |
| 90-130 px | 52% (56/108) | 61% (94/153) |
| 130-200 px | 73% (134/183) | 78% (144/185) |
| over 200 px | 91% (297/326) | 97% (172/177) |

(Width here is the face-on width for that distance, before the tilt squeezes it.)

### Mistakes

| | Set 1 | Set 2 |
|---|---|---|
| real cards shown (all frame kinds) | 978 | 978 |
| named as a different card | 10 | 0 |
| right name but upside down (180 degrees) | 0 | 0 |
| right name, outline badly placed | 3 | 7 |
| no-card frames with a false sighting | 0 of 120 | 0 of 120 |
| decoy-page frames where something was named | 1 of 120 | 0 of 120 |
| 2-4 pages at once, 640x480 (right / wrong / missed) | 79% / 1% / 20% of 165 | 67% / 0% / 33% of 165 |
| 2-4 pages at once, 1280x720 | 78% / 1% / 22% of 165 | 85% / 0% / 15% of 165 |

### Outline and pose error (right sightings, single and multi frames)

| | Set 1, 640x480 | Set 2, 640x480 | Set 1, 1280x720 | Set 2, 1280x720 |
|---|---|---|---|---|
| sightings | 354 | 312 | 406 | 405 |
| corner error px, median / 90% | 0.5 / 1.8 | 0.6 / 2.0 | 0.5 / 1.6 | 0.9 / 2.8 |
| position error mm, median / 90% | 3.9 / 13.7 | 4.4 / 20.8 | 1.5 / 6.8 | 3.0 / 23.0 |
| tilt-and-turn error deg, median / 90% | 0.4 / 1.9 | 0.7 / 4.7 | 0.2 / 0.8 | 0.4 / 3.1 |

### Set 2 printed at A5 (same art, bigger paper)

| | all | 0.4-0.7 m | 0.7-1.0 m | 1.0-1.5 m | 20-35 deg | 35-55 deg | 55-75 deg |
|---|---|---|---|---|---|---|---|
| Set 2 at A5, 640×480 | 75% / 0% / 25% | 93% / 0% / 7% | 73% / 0% / 27% | 59% / 0% / 41% | 60% / 0% / 40% | 79% / 0% / 21% | 86% / 0% / 14% |
| Set 2 at A5, 1280×720 | 96% / 0% / 4% | 100% / 0% / 0% | 98% / 0% / 2% | 89% / 0% / 11% | 92% / 0% / 8% | 97% / 0% / 3% | 98% / 0% / 2% |

Part-covered cards at 1280×720: 81% right (Set 1: 74%; Set 2 at A6: 69%). No wrong card, no decoy named, one false sighting in 768 card frames. Full tables: `tests/results-set2a5-full-seed20261118.md`.

### Both sets on the table (one database of 12 cards)

| | Set 1 cards right | Set 2 cards right | all 12: right / wrong / missed |
|---|---|---|---|
| 640x480 | 79% | 63% | 71% / 0% / 29% |
| 1280x720 | 92% | 84% | 88% / 0% / 12% |

- **No card of one set was ever named as a card of the other set.** The full 12 × 12 table is in `tests/results-setmixed-full-seed20261118.md`.
- One wrong name in the mixed run: Set 1 WORLD ANCHOR called Set 1 CAPTURE FLAG, once, in a multi-page frame.
- Time per frame rises by about half with 12 cards (see "Speed").
- This run had 2 frames per card per band, not 6, and no part-covered frames. Its pose columns for Set 2 cards are wrong (a slip in the test, fixed afterwards) and are not quoted.
- `cards.html` loads one set at a time. Mixing sets in the page is not built.

## Set 1 in full

### Confusion matrix (rows: the card really shown; columns: what the detector said at that spot)

**one card in view, both resolutions**

| shown \ said | 00 | 01 | 02 | 03 | 04 | 05 | nothing | upside down | bad outline |
|---|---|---|---|---|---|---|---|---|---|
| 00 WORLD ANCHOR | 84 | 0 | 0 | 1 | 0 | 0 | 22 | 0 | 1 |
| 01 BLUE BASE | 0 | 87 | 0 | 0 | 0 | 0 | 21 | 0 | 0 |
| 02 RED BASE | 0 | 0 | 83 | 0 | 0 | 0 | 25 | 0 | 0 |
| 03 CAPTURE FLAG | 0 | 0 | 0 | 80 | 3 | 0 | 24 | 0 | 1 |
| 04 HILL | 0 | 0 | 0 | 3 | 89 | 0 | 16 | 0 | 0 |
| 05 BUILD CAMP | 0 | 0 | 0 | 0 | 0 | 79 | 29 | 0 | 0 |

**two to four pages in view, both resolutions**

| shown \ said | 00 | 01 | 02 | 03 | 04 | 05 | nothing | upside down | bad outline |
|---|---|---|---|---|---|---|---|---|---|
| 00 WORLD ANCHOR | 49 | 0 | 0 | 0 | 0 | 0 | 13 | 0 | 0 |
| 01 BLUE BASE | 0 | 51 | 0 | 0 | 0 | 0 | 12 | 0 | 0 |
| 02 RED BASE | 0 | 0 | 48 | 0 | 0 | 0 | 11 | 0 | 1 |
| 03 CAPTURE FLAG | 0 | 0 | 0 | 45 | 2 | 0 | 13 | 0 | 0 |
| 04 HILL | 0 | 0 | 0 | 1 | 28 | 0 | 9 | 0 | 0 |
| 05 BUILD CAMP | 0 | 0 | 0 | 0 | 0 | 37 | 10 | 0 | 0 |

**Upside-down (180 degree) mistakes: 0 of 978 cards shown.** Of the 760 right sightings, 203 came from the paper-outline finder and 557 from corner matching.

### Frames that should give nothing

| Kind | res | frames | frames with any false sighting | what was claimed |
|---|---|---|---|---|
| no card, wood or clutter | 640x480 | 60 | 0 (0%) | - |
| a different printed page (decoy) | 640x480 | 60 | 0 (0%) | - |
| 2-4 pages at once (165 real cards, 15 decoys) | 640x480 | 60 | right 79%, wrong 1%, missed 20% | decoys named as a card: 0; sightings away from any page: 0 |
| no card, wood or clutter | 1280x720 | 60 | 0 (0%) | - |
| a different printed page (decoy) | 1280x720 | 60 | 1 (2%) | D1->03 |
| 2-4 pages at once (165 real cards, 15 decoys) | 1280x720 | 60 | right 78%, wrong 1%, missed 22% | decoys named as a card: 0; sightings away from any page: 0 |

Sightings away from any page in the single and multi frames: 0 in 768 frames.

### How exact the outline and the pose are (right-card sightings only)

| res | distance | sightings | corner error px: median / 90% / worst | position error mm: median / 90% | distance error mm: median / 90% | tilt-and-turn error deg: median / 90% |
|---|---|---|---|---|---|---|
| 640x480 | 0.4-0.7 m | 101 | 0.5 / 1.2 / 51.2 | 0.8 / 2.9 | 0.7 / 2.9 | 0.2 / 0.7 |
| 640x480 | 0.7-1 m | 103 | 0.7 / 2.6 / 42.7 | 3.3 / 11.2 | 3.1 / 10.9 | 0.4 / 2.1 |
| 640x480 | 1-1.5 m | 137 | 0.5 / 2.1 / 20.6 | 7.9 / 17.8 | 7.9 / 17.6 | 0.4 / 6.4 |
| 640x480 | all | 354 | 0.5 / 1.8 / 51.2 | 3.9 / 13.7 | 3.8 / 13.7 | 0.4 / 1.9 |
| 1280x720 | 0.4-0.7 m | 106 | 0.4 / 1.9 / 32.4 | 0.5 / 2.4 | 0.5 / 2.3 | 0.1 / 0.4 |
| 1280x720 | 0.7-1 m | 118 | 0.4 / 1.2 / 6.6 | 1.3 / 2.9 | 1.2 / 2.9 | 0.1 / 0.5 |
| 1280x720 | 1-1.5 m | 167 | 0.6 / 1.7 / 50.2 | 3.1 / 8.9 | 3.1 / 8.8 | 0.3 / 0.9 |
| 1280x720 | all | 406 | 0.5 / 1.5 / 50.2 | 1.5 / 6.8 | 1.5 / 6.8 | 0.2 / 0.8 |

Per-card and per-band tables: `tests/results-set1-full-seed20261118.md`.

## Set 2 in full (A6)

### Confusion matrix (rows: the card really shown; columns: what the detector said at that spot)

**one card in view, both resolutions**

| shown \ said | 00 | 01 | 02 | 03 | 04 | 05 | nothing | upside down | bad outline |
|---|---|---|---|---|---|---|---|---|---|
| 00 WORLD ANCHOR | 65 | 0 | 0 | 0 | 0 | 0 | 43 | 0 | 0 |
| 01 BLUE BASE | 0 | 84 | 0 | 0 | 0 | 0 | 24 | 0 | 0 |
| 02 RED BASE | 0 | 0 | 85 | 0 | 0 | 0 | 23 | 0 | 0 |
| 03 CAPTURE FLAG | 0 | 0 | 0 | 77 | 0 | 0 | 27 | 0 | 4 |
| 04 HILL | 0 | 0 | 0 | 0 | 76 | 0 | 32 | 0 | 0 |
| 05 BUILD CAMP | 0 | 0 | 0 | 0 | 0 | 80 | 28 | 0 | 0 |

**two to four pages in view, both resolutions**

| shown \ said | 00 | 01 | 02 | 03 | 04 | 05 | nothing | upside down | bad outline |
|---|---|---|---|---|---|---|---|---|---|
| 00 WORLD ANCHOR | 43 | 0 | 0 | 0 | 0 | 0 | 14 | 0 | 1 |
| 01 BLUE BASE | 0 | 52 | 0 | 0 | 0 | 0 | 15 | 0 | 1 |
| 02 RED BASE | 0 | 0 | 37 | 0 | 0 | 0 | 9 | 0 | 0 |
| 03 CAPTURE FLAG | 0 | 0 | 0 | 45 | 0 | 0 | 16 | 0 | 1 |
| 04 HILL | 0 | 0 | 0 | 0 | 37 | 0 | 13 | 0 | 0 |
| 05 BUILD CAMP | 0 | 0 | 0 | 0 | 0 | 36 | 10 | 0 | 0 |

**Upside-down (180 degree) mistakes: 0 of 978 cards shown.** Of the 717 right sightings, 276 came from the paper-outline finder and 441 from corner matching.

### Frames that should give nothing

| Kind | res | frames | frames with any false sighting | what was claimed |
|---|---|---|---|---|
| no card, wood or clutter | 640x480 | 60 | 0 (0%) | - |
| a different printed page (decoy) | 640x480 | 60 | 0 (0%) | - |
| 2-4 pages at once (165 real cards, 15 decoys) | 640x480 | 60 | right 67%, wrong 0%, missed 33% | decoys named as a card: 0; sightings away from any page: 0 |
| no card, wood or clutter | 1280x720 | 60 | 0 (0%) | - |
| a different printed page (decoy) | 1280x720 | 60 | 0 (0%) | - |
| 2-4 pages at once (165 real cards, 15 decoys) | 1280x720 | 60 | right 85%, wrong 0%, missed 15% | decoys named as a card: 0; sightings away from any page: 0 |

Sightings away from any page in the single and multi frames: 1 in 768 frames.

### How exact the outline and the pose are (right-card sightings only)

| res | distance | sightings | corner error px: median / 90% / worst | position error mm: median / 90% | distance error mm: median / 90% | tilt-and-turn error deg: median / 90% |
|---|---|---|---|---|---|---|
| 640x480 | 0.4-0.7 m | 93 | 0.8 / 1.9 / 30.7 | 1.5 / 6.6 | 1.4 / 6.5 | 0.5 / 1.7 |
| 640x480 | 0.7-1 m | 96 | 0.6 / 2.7 / 13.6 | 5.4 / 28.8 | 5.4 / 28.8 | 0.7 / 23.8 |
| 640x480 | 1-1.5 m | 114 | 0.5 / 1.3 / 20.1 | 7.9 / 23.2 | 7.9 / 23.2 | 0.9 / 4.1 |
| 640x480 | all | 312 | 0.6 / 2.0 / 30.7 | 4.4 / 20.8 | 4.4 / 20.8 | 0.7 / 4.7 |
| 1280x720 | 0.4-0.7 m | 111 | 0.7 / 1.8 / 13.7 | 0.6 / 2.2 | 0.6 / 2.2 | 0.2 / 0.8 |
| 1280x720 | 0.7-1 m | 114 | 0.9 / 2.0 / 14.8 | 2.4 / 7.6 | 2.3 / 7.6 | 0.3 / 1.2 |
| 1280x720 | 1-1.5 m | 163 | 1.0 / 3.8 / 31.4 | 6.5 / 68.0 | 6.4 / 67.9 | 0.9 / 29.1 |
| 1280x720 | all | 405 | 0.9 / 2.8 / 31.4 | 3.0 / 23.0 | 2.9 / 23.0 | 0.4 / 3.1 |

Per-card and per-band tables: `tests/results-set2-full-seed20261118.md`.

**Too few corner points on Set 2?** Yes: far fewer, as ChatGPT warned. The counts are under "What the recogniser sees". Corner matching alone found only 28% of Set 2 cards at 640×480 (Set 1: 46%). The paper-outline finder is the second method the bold art needed. On its own it found 64–65% of Set 2 cards. Together they reach 73–84% on the same frames.

## Set 2b and its colour version

Same test, same seed, same thresholds, A6 size. Cells: right card / wrong card / missed.

| | Set 2 | Set 2b | Set 2b colour, read as grey |
|---|---|---|---|
| **all cards, 640x480** | **62% / 0% / 38%** | **62% / 0% / 38%** | **59% / 0% / 41%** |
| 00 WORLD ANCHOR, 640x480 | 54% / 0% / 46% | 52% / 0% / 48% | 48% / 0% / 52% |
| 01 BLUE BASE, 640x480 | 69% / 0% / 31% | 70% / 0% / 30% | 61% / 0% / 39% |
| 02 RED BASE, 640x480 | 70% / 0% / 30% | 69% / 0% / 31% | 69% / 0% / 31% |
| 03 CAPTURE FLAG, 640x480 | 59% / 0% / 41% | 56% / 0% / 44% | 59% / 0% / 41% |
| 04 HILL, 640x480 | 63% / 0% / 37% | 65% / 0% / 35% | 63% / 0% / 37% |
| 05 BUILD CAMP, 640x480 | 59% / 0% / 41% | 59% / 0% / 41% | 54% / 0% / 46% |
| part covered, 640x480 | 13% / 0% / 87% | 19% / 0% / 81% | 19% / 0% / 81% |
| **all cards, 1280x720** | **82% / 0% / 18%** | **82% / 0% / 18%** | **83% / 0% / 17%** |
| 00 WORLD ANCHOR, 1280x720 | 67% / 0% / 33% | 67% / 0% / 33% | 70% / 0% / 30% |
| 01 BLUE BASE, 1280x720 | 87% / 0% / 13% | 91% / 0% / 9% | 91% / 0% / 9% |
| 02 RED BASE, 1280x720 | 87% / 0% / 13% | 89% / 0% / 11% | 89% / 0% / 11% |
| 03 CAPTURE FLAG, 1280x720 | 83% / 0% / 17% | 83% / 0% / 17% | 83% / 0% / 17% |
| 04 HILL, 1280x720 | 78% / 0% / 22% | 78% / 0% / 22% | 78% / 0% / 22% |
| 05 BUILD CAMP, 1280x720 | 89% / 0% / 11% | 87% / 0% / 13% | 87% / 0% / 13% |
| part covered, 1280x720 | 69% / 0% / 31% | 69% / 0% / 31% | 69% / 0% / 31% |
| named as a different card (of 978 shown) | 0 | 0 | 0 |
| right name but upside down | 0 | 0 | 1 |
| right name, outline badly placed | 7 | 6 | 7 |
| no-card frames with a false sighting | 0 of 120 | 0 of 120 | 0 of 120 |
| decoy pages where something was named | 0 of 120 | 0 of 120 | 0 of 120 |

- **Set 2b is as good as Set 2, and a little better on BLUE BASE** (the redrawn card): 87% → 91% at 1280×720.
- **The thicker CAPTURE FLAG border did not show up in the numbers**: still 83% at 1280×720, and 5 of the 6 badly placed outlines are still this card.
- **00 WORLD ANCHOR is still the weakest card** (52% and 67%). It was not changed in 2b. It is the card to fix next.
- Small moves on unchanged cards (a point or two) are noise: changing two cards changes what the identity check weighs.
- The colour version read as grey: one upside-down sighting (WORLD ANCHOR), the only one in any run. Why is not established.

### The colour cue

The recogniser stays grey. The cue is the main hue of the coloured parts inside a found outline, balanced to the card's own paper white (`CV_CARDS.colourCue`). 396 real cards shown in each light.

| Light | real cards shown | grey pipeline: right / wrong or badly placed / missed | hue could be read on right sightings | of those, hue agrees with the card | hue points to another card | near-misses taken back: right | near-misses taken back: WRONG | with colour: right / wrong or badly placed / missed | false sightings on decoy + no-card frames (grey -> with colour) |
|---|---|---|---|---|---|---|---|---|---|
| neutral light, colour print | 396 | 75% / 0% / 25% | 281 of 297 (95%) | 281 of 281 (100%) | 0 | 3 | 3 | 76% / 1% / 23% | 0 -> 1 |
| warm lamp, colour print | 396 | 75% / 1% / 24% | 286 of 298 (96%) | 286 of 286 (100%) | 0 | 1 | 3 | 76% / 2% / 23% | 0 -> 1 |
| neutral light, printed grey | 396 | 73% / 1% / 26% | 0 of 288 (0%) | 0 of 0 (n/a) | 0 | 0 | 0 | 73% / 1% / 26% | 0 -> 0 |

Could the hue be read, and was it the right one, by how wide the card is in the picture (right sightings only):

| Light | under 80 px | 80-130 px | 130-200 px | over 200 px |
|---|---|---|---|---|
| neutral light, colour print | read 47/55, right 47/47 | read 97/105, right 97/97 | read 88/88, right 88/88 | read 49/49, right 49/49 |
| warm lamp, colour print | read 52/57, right 52/52 | read 99/106, right 99/99 | read 88/88, right 88/88 | read 47/47, right 47/47 |
| neutral light, printed grey | read 0/55, right 0/0 | read 0/100, right 0/0 | read 0/85, right 0/0 | read 0/48, right 0/0 |

What this shows:
- **The hue can be read on 95% of right sightings, and when read it was the right card's hue every time (567 of 567), under a warm lamp too.** Balancing to the paper white is what makes the lamp harmless.
- **As a tie-breaker it does not help.** Taking back near-misses on the strength of the hue added 3 right and 3 wrong in neutral light, 1 right and 3 wrong under the lamp, and one false sighting on a decoy page each time. The cards the grey recogniser misses are mostly not found at all; they are not near-misses waiting for a casting vote.
- **Printed grey, the cue reads nothing and changes nothing.** No harm.
- The grey recogniser never named a colour card as another card in this test, so there were no ties to break and no wrong names for the hue to veto. If real-device tests show wrong names, the cue is a ready second opinion: `cards.html?set=2bc` shows "colour agrees" or "colour points to NN" beside each sighting and logs a disagreement.
- Not modelled: a real printer's colours, a real camera's white balance, coloured table tops (the made-up tables are grey). NOT TESTED on a device.

## Ways of finding and naming the cards, compared

The question: use all corner features, or only the ones that differ between cards, or only the title and centre drawing? Measured on the single-card frames that were not part-covered (162 per resolution), plus the decoy and no-card frames.

**Set 1**

| Way | res | right card | wrong card | missed | decoy pages named as a card | no-card frames with a sighting |
|---|---|---|---|---|---|---|
| A corners: all, most inliers names the card | 640x480 | 43% (69/162) | 0% (0) | 57% | 0/60 | 0/60 |
| A corners: all, most inliers names the card | 1280x720 | 82% (133/162) | 1% (2) | 17% | 7/60 | 0/60 |
| B corners: distinct ones only, most inliers names the card | 640x480 | 36% (59/162) | 0% (0) | 64% | 0/60 | 0/60 |
| B corners: distinct ones only, most inliers names the card | 1280x720 | 77% (124/162) | 1% (2) | 22% | 5/60 | 0/60 |
| C corners: all, dense check names the card | 640x480 | 46% (74/162) | 1% (2) | 53% | 0/60 | 0/60 |
| C corners: all, dense check names the card | 1280x720 | 85% (137/162) | 0% (0) | 15% | 1/60 | 0/60 |
| D corners: title + centre drawing only, most inliers names the card | 640x480 | 38% (61/162) | 1% (1) | 62% | 0/60 | 0/60 |
| D corners: title + centre drawing only, most inliers names the card | 1280x720 | 80% (130/162) | 1% (2) | 19% | 3/60 | 0/60 |
| E paper outline only, dense check names the card | 640x480 | 65% (105/162) | 0% (0) | 35% | 0/60 | 0/60 |
| E paper outline only, dense check names the card | 1280x720 | 55% (89/162) | 0% (0) | 45% | 0/60 | 0/60 |
| F corners + paper outline, dense check names the card (THE DEFAULT) | 640x480 | 78% (127/162) | 1% (2) | 20% | 0/60 | 0/60 |
| F corners + paper outline, dense check names the card (THE DEFAULT) | 1280x720 | 91% (148/162) | 0% (0) | 9% | 1/60 | 0/60 |

**Set 2 (A6)**

| Way | res | right card | wrong card | missed | decoy pages named as a card | no-card frames with a sighting |
|---|---|---|---|---|---|---|
| A corners: all, most inliers names the card | 640x480 | 23% (38/162) | 0% (0) | 77% | 0/60 | 0/60 |
| A corners: all, most inliers names the card | 1280x720 | 72% (116/162) | 0% (0) | 28% | 0/60 | 0/60 |
| B corners: distinct ones only, most inliers names the card | 640x480 | 19% (31/162) | 0% (0) | 81% | 0/60 | 0/60 |
| B corners: distinct ones only, most inliers names the card | 1280x720 | 65% (106/162) | 0% (0) | 35% | 0/60 | 0/60 |
| C corners: all, dense check names the card | 640x480 | 28% (45/162) | 0% (0) | 72% | 0/60 | 0/60 |
| C corners: all, dense check names the card | 1280x720 | 73% (118/162) | 0% (0) | 27% | 0/60 | 0/60 |
| D corners: title + centre drawing only, most inliers names the card | 640x480 | 24% (39/162) | 0% (0) | 76% | 0/60 | 0/60 |
| D corners: title + centre drawing only, most inliers names the card | 1280x720 | 72% (117/162) | 0% (0) | 28% | 0/60 | 0/60 |
| E paper outline only, dense check names the card | 640x480 | 64% (103/162) | 0% (0) | 36% | 0/60 | 0/60 |
| E paper outline only, dense check names the card | 1280x720 | 65% (106/162) | 0% (0) | 35% | 0/60 | 0/60 |
| F corners + paper outline, dense check names the card (THE DEFAULT) | 640x480 | 73% (118/162) | 0% (0) | 27% | 0/60 | 0/60 |
| F corners + paper outline, dense check names the card (THE DEFAULT) | 1280x720 | 84% (136/162) | 0% (0) | 16% | 0/60 | 0/60 |

What this shows:
- **Throwing away the shared-border features (B, D) makes things worse, not better.** The border helps find the card.
- **Letting inlier counts name the card (A, B, D) lets decoy pages through**: up to 7 of 60 for Set 1. The dense check (C, F) cuts that to 1 or 0.
- **The paper outline (E) is what rescues small and far cards**, most of all at 640×480.
- An earlier build, corners only and with no outline finder, is kept as `tests/baseline-v1-corners-only-set1.md`: 45% at 640×480 and 80% at 1280×720 for Set 1.

## What the recogniser sees in each card

### Set 1: engraved, A5 (210 x 148.5 mm)

| Card | corners at 130 px wide | corners at 260 px wide | corners at 520 px wide | database corners with no look-alike in two other cards |
|---|---|---|---|---|
| 00 WORLD ANCHOR | 586 | 1962 | 5397 | 1559/2676 |
| 01 BLUE BASE | 563 | 1998 | 5334 | 1588/2676 |
| 02 RED BASE | 573 | 1966 | 5495 | 1700/2676 |
| 03 CAPTURE FLAG | 553 | 2042 | 5447 | 1576/2676 |
| 04 HILL | 556 | 1995 | 4904 | 1525/2676 |
| 05 BUILD CAMP | 598 | 2009 | 5193 | 1729/2676 |

Whole-card likeness at 84 x 60 pixels (1 = the same picture; lower is better between different cards). Last column: the card against itself turned 180 degrees.

| | 00 | 01 | 02 | 03 | 04 | 05 | turned 180 |
|---|---|---|---|---|---|---|---|
| 00 WORLD ANCHOR | 1.00 | 0.56 | 0.29 | 0.33 | 0.66 | 0.23 | 0.12 |
| 01 BLUE BASE | 0.56 | 1.00 | 0.29 | 0.26 | 0.53 | 0.24 | 0.08 |
| 02 RED BASE | 0.29 | 0.29 | 1.00 | 0.46 | 0.23 | 0.51 | 0.10 |
| 03 CAPTURE FLAG | 0.33 | 0.26 | 0.46 | 1.00 | 0.32 | 0.47 | 0.03 |
| 04 HILL | 0.66 | 0.53 | 0.23 | 0.32 | 1.00 | 0.20 | 0.12 |
| 05 BUILD CAMP | 0.23 | 0.24 | 0.51 | 0.47 | 0.20 | 1.00 | 0.10 |

Cell-by-cell likeness (mean over the 8 x 6 cells the identity check uses; this is what the recogniser has to tell apart):

| | 00 | 01 | 02 | 03 | 04 | 05 |
|---|---|---|---|---|---|---|
| 00 | 1.00 | 0.64 | 0.47 | 0.51 | 0.70 | 0.42 |
| 01 | 0.64 | 1.00 | 0.46 | 0.46 | 0.62 | 0.43 |
| 02 | 0.47 | 0.46 | 1.00 | 0.54 | 0.42 | 0.56 |
| 03 | 0.51 | 0.46 | 0.54 | 1.00 | 0.50 | 0.54 |
| 04 | 0.70 | 0.62 | 0.42 | 0.50 | 1.00 | 0.39 |
| 05 | 0.42 | 0.43 | 0.56 | 0.54 | 0.39 | 1.00 |

Where the cards differ (0 = this cell looks the same on every card, 1 = quite different). Top row of the table = top of the card.

```
0.10  0.25  0.33  0.33  0.35  0.33  0.21  0.10
0.05  0.45  0.68  0.77  0.74  0.68  0.46  0.08
0.04  0.57  0.75  0.82  0.89  0.70  0.69  0.04
0.05  0.90  0.87  0.91  0.91  0.90  0.84  0.09
0.17  0.86  0.85  0.94  0.88  0.83  0.68  0.16
0.08  0.20  0.19  0.23  0.25  0.18  0.21  0.08
```

### Set 2: bold woodcut, A6 (148 x 105 mm)

| Card | corners at 130 px wide | corners at 260 px wide | corners at 520 px wide | database corners with no look-alike in two other cards |
|---|---|---|---|---|
| 00 WORLD ANCHOR | 290 | 499 | 797 | 1298/2676 |
| 01 BLUE BASE | 225 | 426 | 621 | 1202/2676 |
| 02 RED BASE | 251 | 578 | 971 | 1068/2676 |
| 03 CAPTURE FLAG | 181 | 285 | 467 | 1349/2588 |
| 04 HILL | 200 | 548 | 934 | 1267/2676 |
| 05 BUILD CAMP | 221 | 386 | 681 | 1312/2676 |

Whole-card likeness at 84 x 60 pixels (1 = the same picture; lower is better between different cards). Last column: the card against itself turned 180 degrees.

| | 00 | 01 | 02 | 03 | 04 | 05 | turned 180 |
|---|---|---|---|---|---|---|---|
| 00 WORLD ANCHOR | 1.00 | 0.36 | 0.26 | 0.09 | 0.21 | 0.20 | 0.18 |
| 01 BLUE BASE | 0.36 | 1.00 | 0.19 | 0.15 | 0.23 | 0.30 | 0.36 |
| 02 RED BASE | 0.26 | 0.19 | 1.00 | 0.24 | 0.26 | 0.27 | 0.17 |
| 03 CAPTURE FLAG | 0.09 | 0.15 | 0.24 | 1.00 | 0.13 | 0.22 | 0.14 |
| 04 HILL | 0.21 | 0.23 | 0.26 | 0.13 | 1.00 | 0.23 | 0.08 |
| 05 BUILD CAMP | 0.20 | 0.30 | 0.27 | 0.22 | 0.23 | 1.00 | 0.21 |

Cell-by-cell likeness (mean over the 8 x 6 cells the identity check uses; this is what the recogniser has to tell apart):

| | 00 | 01 | 02 | 03 | 04 | 05 |
|---|---|---|---|---|---|---|
| 00 | 0.92 | 0.37 | 0.34 | 0.27 | 0.30 | 0.31 |
| 01 | 0.37 | 0.85 | 0.29 | 0.25 | 0.31 | 0.40 |
| 02 | 0.34 | 0.29 | 0.98 | 0.37 | 0.32 | 0.32 |
| 03 | 0.27 | 0.25 | 0.37 | 0.96 | 0.27 | 0.31 |
| 04 | 0.30 | 0.31 | 0.32 | 0.27 | 0.87 | 0.33 |
| 05 | 0.31 | 0.40 | 0.32 | 0.31 | 0.33 | 0.96 |

Where the cards differ (0 = this cell looks the same on every card, 1 = quite different). Top row of the table = top of the card.

```
0.02  0.47  0.55  0.52  0.52  0.52  0.44  0.24
0.47  1.00  0.81  0.76  0.82  0.89  0.99  0.57
0.50  1.00  0.91  0.88  0.95  0.91  0.98  0.50
0.46  0.95  0.93  0.97  0.96  0.87  0.70  0.53
0.49  0.91  0.81  0.85  0.82  0.76  0.92  0.48
0.24  0.43  0.38  0.43  0.39  0.39  0.39  0.29
```

## Notes for ChatGPT: which cards are weak, and what to change

**Set 1 (engraved)**
- **03 CAPTURE FLAG and 04 HILL are the problem pair.** Nearly all of Set 1's wrong names are one of these two taken for the other. Both centre drawings are a stone-ringed mound with a flag on top, with the same fences on the left and castle on the right. Give HILL **no flag and a different outline**, as Set 2 already does.
- **00 WORLD ANCHOR, 01 BLUE BASE and 04 HILL look alike as small pictures** (likeness 0.53 to 0.66; Set 2's worst pair is 0.36). They share the table, the left fence, the right castle and the sky. Give each card its own background, not one shared scene.
- The outer fifth of every card (border, banner shape, corner flags, bottom strip) is the same on all six, so it carries no identity. Set 2's per-card borders fix this.
- The fine engraving turns to grey mush when the card is under about 130 pixels wide. It gives plenty of corner points close up and little at range.

**Set 2 (bold woodcut)**
- **00 WORLD ANCHOR is the weakest: 54% at 640×480 and 67% at 1280×720**, against 78–89% for the others at 1280×720. It matters most, because every other card is measured from it. Likely cause (not proven): it has the most empty white, a thin rope border and thin compass rings, so both finders have little to hold. **Make the anchor the boldest card: a heavy solid border and a solid, chunky compass.**
- **04 HILL is next weakest at 1280×720 (78%).** Its border of small separate stones is faint at range. A heavier, joined border should help.
- **03 CAPTURE FLAG gave 5 of the 7 badly placed outlines.** Its border is thin lines at top and bottom. A border with solid weight on all four sides would pin the outline better.
- **Part-covered cards do badly at 640×480 (13% right).** Bold art has few features, so covering a corner loses a lot. More mid-sized detail spread over the whole card would help. Keep the corner triangle.
- **Print at A5, not A6.** Same art, bigger paper: 82% → 96% at 1280×720.
- The black corner triangle did its job: **no upside-down sightings.** (Set 1 had none either; its banner and tagline are enough.)
- Large parts of a Set 2 card are plain white. A plain patch proves nothing, so Set 2's match scores run lower (0.6–0.9) than Set 1's (0.8–0.99) even when right. A light pattern in the big white areas would raise them.

## Speed

| Where | 640×480 | 1280×720 |
|---|---|---|
| Node 22, one core, Set 1, median over 504 frames | 307 ms | 396 ms |
| Node 22, one core, Set 2, median over 504 frames | 266 ms | 341 ms |
| Node 22, one core, both sets (12 cards), median over 396 frames | 486 ms | 606 ms |
| Headless Chromium 153, main thread, Set 1, median of 10 frames | 356 ms | 411 ms |
| Headless Chromium 153, main thread, Set 2, median of 10 frames | 285 ms | 373 ms |

- Building the database at page load: about 1.5 s (Set 1) to 1.9 s (Set 2) in Chromium.
- **This is software rendering on a shared build machine, with other builders running. It is not an iPad. iPad speed is UNKNOWN.**
- So expect 2 to 3 recognised frames a second here. That is enough for cards that lie still. The page runs the recogniser in a worker thread and caps the rate (`?fps=`).
- Most of the time goes on comparing descriptions one by one. An index would speed it up. Not done.

## A hidden marker instead? (the fallback; NOT measured here)

Not built and not measured. The reasoning, from sizes alone:
- A hidden ArUco-style square of, say, 30 mm with a 6 × 6 grid has 5 mm cells. At 1.5 m in a 640-pixel-wide picture, 30 mm is about 11 pixels wide, and at a 20° camera height about 4 pixels tall. That is under one pixel per cell. It cannot be read.
- The whole card is 148 to 210 mm wide. The outline-plus-drawing check uses all of it, so it works at sizes where a small hidden square cannot.
- The known fallback stays as it was: the game's existing sticker detector, which works at 2.25 m with a large plain marker. If real-device tests of the artwork fail, fall back to a **large** marker, not a small hidden one.

## What is NOT TESTED

- **Any real device.** No iPad, no Samsung, no real camera, no real print. `cards.html` is ready for that test and copies a log.
- Real printer output, paper curl, creases, lamination glare, coloured or dim light, shadows from hands.
- A moving camera (motion blur) and autofocus.
- A white or pale table. The paper-outline finder needs the table to be darker than the paper. On a pale table only corner matching is left.
- Cards lying partly on top of each other, or closer together than about 5 cm.
- The camera's real lens data. Browsers do not give it. Card-to-card placement does not need it. Camera-to-card distance does, and uses an assumed lens angle on a real device.
- Set 2b at A5 as its own offline run (only Set 2 at A5 was run). The page and the print page do handle A5 for the A6 sets (`?size=a5`), and the page test passes with it.

## Pictures

- `shots/recognise-examples-set1.png`, `-set2.png`, `-setmixed.png`: example frames with what was found. Green outline = right card. Orange = a card that was missed. Blue = a decoy page, correctly left alone. Red = wrong.
- `shots/cards-page-demo.png`: the checker page on made-up frames, four cards tracked, layout map on the right. The `-set2` files show the same for Set 2.
- `shots/cards-page-locked.png`, `cards-page-lost.png`, `cards-page-manual.png`: after LOCK TABLE, with a card lost, and placed by touch.
- `shots/print-page.png`, `print-page-set2.png`: the print page.

## How to run it again

    cd games/sofa-siege/cards
    node tests/recognise-test.js --set 1 --variants --sheet      (about 15 minutes on one core)
    node tests/recognise-test.js --set 2 --variants --sheet
    node tests/recognise-test.js --set 2 --a5
    node tests/recognise-test.js --set mixed
    node tests/compare-sets.js
    node tests/art-stats.js
    node tests/recognise-test.js --set 2b        (and --set 2bc)
    node tests/colour-test.js                    (about 25 minutes)
    NODE_PATH=$(npm root -g) node tests/page-test.js            (and again with --set 2, --set 2b, --set 2bc, --set 2b --a5)
