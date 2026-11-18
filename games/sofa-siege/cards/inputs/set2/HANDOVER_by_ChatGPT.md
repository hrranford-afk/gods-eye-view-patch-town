<!-- by ChatGPT, from Harry's Round Table Kingdom AR Cards Set 2 (18 Nov 2026). Words untouched. -->
# ROUND TABLE KINGDOM — AR PLACEMENT CARDS, SET 2

**For Claude Code / PatchTown. Date: 18 November 2026. Status: DESIGNED AND CHECKED OFFLINE; NOT CAMERA-PROVEN.**

## 1. Goal — image first, camera second, game integration third

Set 2 responds to the owner's visual review of Set 1: Set 1 looks appealing but shares too much artwork and has intricate engraving which may be difficult for an iPad camera to recognise when a printed card is ~130 pixels across. **Set 1's measured test results were still due at 14:00 on 18 November 2026, and are NOT included here. No comparative accuracy claims have been made.**

This pack contains six original, monochrome, image-only **candidate AR targets**. There are no QR codes, barcodes, hidden fiducial grids, working AR tracking data or commercial characters. Artwork alone will not create AR: Claude must train/configure recognition targets using the PNGs and connect detection to the existing tabletop 3D game.

The game is a toy-mouse miniature siege on a real table. Set up the arena by placing printed cards before the battle. Each card should control a specific spawn point or landmark. Existing gameplay, physics and models should be reused, not rebuilt.

## 2. Contents

- `cards_A6/00_world_anchor.png` through `05_build_camp.png` — six independent 2220 × 1575 px **binary black-and-white** A6 landscape designs; their printed size is **148 × 105 mm**.
- `source_svg/` — the six editable vector artworks, in millimetres via SVG page size.
- `print/RTK_Set2_A4_Portrait_4up_100percent.pdf` — 2 A4 portrait pages (4 cards on page one, 2 on page two), **exact size at 100%**. Cards are rotated 90° to fit.
- `print/RTK_Set2_A4_Portrait_2up_Printer_Safe_100percent.pdf` — 3 A4 portrait pages (2 per page), full-size landscape cards, with genuine external crop ticks and ordinary printer margins.
- `manifest.json` — stable IDs, roles, dimensions, dimensions in pixels and SHA-256 per PNG.
- `check/contact_sheet_130px.png` — all six tiny, blurred camera-scale versions side by side at native 130px width.
- `check/art_overview.png` — legible 3 × 2 presentation of the artwork.
- `check/pairwise_similarity.csv`, `check/rotated_180_similarity.csv`, `check/SIMILARITY_TABLES.md`, `check/similarity_tables.json` — measurements.
- `code/build_set2.py`, `code/requirements.txt` — fully repeatable artwork + print + checks + manifest generator; **does not require external images or internet**.

## 3. Card meanings and physical use

| ID | Card name | Distinct visual cue | What the game should do |
| --- | --- | --- | --- |
| 00 | WORLD ANCHOR | Big eight-point compass with long north spike; knotted rope border; compass-carrying mouse | First card placed, defines world scale/coordinate system and forward direction. Keep this card still while playing. |
| 01 | BLUE BASE | Tall plank watchtower, feather flag; vertical fence-plank border; lookout mouse | Choose Blue team's base centre and orientation. Do not spawn through the card surface. |
| 02 | RED BASE | Low wide boiler, chimney, massive cog; gear-chain border; mechanic mouse | Choose Red team's base centre and orientation. |
| 03 | CAPTURE FLAG | One huge leaning swallow-tail flag; bunting border; flag-planting mouse | Choose where the flag objective will appear. Players can reposition **before** the game locks the setup. |
| 04 | HILL | Broad rounded mound and big stones, three daisies, **no flag**; stone border; sleeping mouse | Add one solid raised terrain mound where the card sits. |
| 05 | BUILD CAMP | Crossed mallet and saw over workbench; board-and-nail border; hammering mouse | Place an area for building and repairing. |

All six include one distinctive small original toy mouse in a different position and pose. Labels provide meaning in black ink; Blue and Red do not rely on colour.

## 4. Visual specification met

- Pure B/W `1`-bit PNG: only pixel values 0 and 255. No RGB colour, gradients, stippling or fine engraved hatching.
- At least 5 mm clean white clearance around outer paper edge. Border motifs sit farther inside. One large solid triangular black patch occurs in **top-left only** for orientation. The target is deliberately asymmetric under 180° rotation.
- Unique borders with no shared decorative frame: knotted rope, upright planks, gears, triangular bunting, stones, nails and boards.
- Six distinct main silhouettes; bold title at top, one-line caption at bottom; no background scenery.
- The artwork uses big black masses and heavy strokes. Some mouse facial details and font internals are smaller and may disappear at distance; the emblem must remain recognisable without them.

**Important:** a 130px overall silhouette and low cross-correlation are useful early proxies, not a guarantee of feature-match or natural-feature tracking quality. Blank interiors and large solid shapes may actually offer *too few distinctive keypoints* for ORB, AKAZE or a browser image-tracker. Only camera tests can reveal that. Do not report these as passed AR targets until measured.

## 5. Offline measurements — candidate target check

Procedure: rasterise to 2220×1575, threshold to B/W, reduce to **130px wide**, convert to greyscale, Gaussian blur (σ=0.7px), then calculate centred **Pearson correlation** over matching 130×92 arrays. 1 means identical; 0 means no linear similarity. Rotations are done on each blurred 130×92 image.

**Highest similarity across any two different cards:** **0.419** (heuristic requested: below 0.50).

**Highest same-card 180° correlation:** **0.405** (Blue Base). See complete 6×6 and 180° scores in `check/SIMILARITY_TABLES.md` and CSVs. Do **not** compare these numbers with Set 1 unless the same processing settings are used there too.

Additional checks: files verified to have correct PNG pixel dimensions and pure black/white; PDFs rendered for visual checking; final reproducibility script generates all deliverables from code. **No iPad/phone camera tracking tests or gameplay integration tests have been run.**

## 6. Important print geometry (cannot evade this physically)

A6 landscape is **148 × 105 mm**. To put four on a **portrait A4 sheet (210 × 297 mm)** at 100%:

- Rotate each A6 design 90° on the page, so it occupies **105 × 148 mm**.
- Place 2 across × 2 down, occupying **210 × 296 mm**; only 1 mm remains vertically and **0 mm horizontally**.
- Thus the 4-up PDF is mathematically correct **but effectively borderless**. There is **not enough space** for ordinary printer margins or full crop marks **outside** all four card edges. The only feasible guides are the shared seams between cards. Print on a borderless A4 printer without 'fit to printable area'; otherwise some artwork may be clipped or automatically shrunk.
- For a normal black-and-white home printer, **use the included 2-up printer-safe PDF instead**. It gives two cards per A4 sheet, proper 100%-size cards with crop ticks outside the cards and generous white margins.
- For both PDFs: choose **Actual Size / 100%**, never 'Fit to page'. Check with a ruler that A6 is exactly 148 × 105 mm before judging camera recognition.

## 7. Repeatable build

From the archive root:

```bash
python -m pip install -r code/requirements.txt
python code/build_set2.py .
```

The generator builds the six original SVG illustrations directly in Python, renders **1-bit** PNGs, makes both PDFs, creates the 130px preview, calculates both similarity tables, and regenerates the manifest SHA-256 hashes. It does not need the original image-generation session, an online service, brand assets, or proprietary font files. CairoSVG uses system fonts (it requests DejaVu Sans); a substituted font can alter text rendering and therefore PNG SHA-256 values. To reproduce exactly, use a compatible DejaVu Sans installation with the same Python dependency versions.

The 2D illustrations are **not** the 3D creature models; the image targets and the game characters are separate things.

## 8. Claude Code — next implementation steps

1. **Preserve the existing game.** Inspect its existing camera, renderer, room scale, AR libraries, base deployment, and capture-flag systems before any changes. Make the smallest integration patch.
2. Treat each PNG as an **individual reference image target**. Capture a real camera frame, estimate card ID, 4 corners, orientation, confidence and pose relative to the camera. Set the actual target physical size to **0.148 m × 0.105 m**; note that 4-up printing physically rotates cards 90° on paper but the cut card's own art still defines top.
3. Resolve orientation by the triangle on the card's printed top-left and the unmirrored top title. Do not assume a detected rectangular bounding box identifies rotation on its own.
4. Use WORLD ANCHOR as the initial world transform only once a stable pose exists. As secondary cards become visible, transform their detected positions into this common coordinate frame. Cache last stable positions when markers leave view; handle partial occlusion and repeated detection without object teleporting or flickering.
5. During setup only, spawn/preview BLUE BASE, RED BASE, CAPTURE FLAG, HILL and BUILD CAMP according to the corresponding tracked card. Show an explicit 'lock setup' control. Before lock, repositioning a card moves the corresponding preview; after lock, movement should not silently rewrite battle state.
6. Choose a sensible model centre relative to the printed card (e.g. the card centre), keep the model hovering just above the paper, and preserve the existing scale and collision rules. No unexplained scaling of bases or hills. Do not substitute the visual art for existing world assets.
7. Test with actual prints from **0.4, 0.7, 1.0 and 1.5 metres**, multiple slant angles, soft and harsh room light, adjacent cards, rotated cards, half-covered cards, the same card moved, and card combinations. Report detection rate, jitter, orientation mistakes, false positives, confidence, latency and time-to-lock with raw numbers and device model.
8. Compare Set 1 versus Set 2 using exactly the same camera procedure, same physical print sizes or calibrated normalization, same lighting, camera and detection thresholds. **Do not invent the Set 1 measured results due at 14:00.**
9. If cards fail with image-only recognition, say which fail and why. Propose local shape changes rather than sneaking in a code/fiducial or changing the art without approval.

## 9. Acceptance criteria (not yet achieved)

- iPad/phone camera identifies all six cards reliably, including at slants and realistic distances, without mistaken matches or 180° reversals.
- AR objects stay stable enough to aim and interact, not only appear for one frame.
- The same cards spawn the correct components in the **existing game**, positions survive reasonable tracking loss, and gameplay remains functional.
- A simple setup can place two bases and a freely located capture flag.
- Pass/fail logged with screenshots/video and measured values. **Current pack only passes offline art/print generation tests.**
