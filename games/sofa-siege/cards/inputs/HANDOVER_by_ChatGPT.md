<!-- by ChatGPT, from Harry's Round Table Kingdom AR Cards Handover v1 (18 Nov 2026). Words untouched. -->
# ROUND TABLE KINGDOM — PLANET CARDS HANDOVER
**18 November 2026 | Version 1 visual + print prototype**  
**For:** Claude Code / the home game-building system  
**Read first:** This is a SPECIFICATION and print-art package, **not a functioning AR integration**.

## 1. THE IDEA IN ONE PARAGRAPH
Round Table Kingdom is a playful miniature battle game on a **real round table**. Players bring personalised small bases to the table's edge, fight over an objective, damage individual planks and joints, then salvage, repair and rebuild. The art direction is warm, handmade, hand-painted toy-diorama: tiny soldiers, bits of wood, rope, tin, paper flags, and ordinary household objects setting the scale. **Physical black-and-white picture cards** let players choose *where* the bases, hill and flag will appear before a match. The cards should look like illustrated game pieces, **not pages of QR codes**.

## 2. WHAT IS ALREADY REAL, WHAT IS NOT
- **Observed from the user's 18 Nov screenshot:** Claude has made a 3D tabletop **mock-up** with blue camp near the front, red camp at the back and a central grassy hill and flag. Its artwork is blockier than the aspirational concepts. This is a still render, not verified live AR gameplay.
- **Recovered older prototype:** `round_table_mechanics_lab.html` is playable 2D HTML with three factions and Siege / Scrap Rush / Centre Flag. It has targeted breakable fort parts and a basic collapse rule. It is **not** the same code as Claude's newest 3D mock-up.
- **Separate test:** A support-and-bracing collapse lab exists in the earlier First Version package. Its support checks are simple arcade rules, **not** full rigid-body engineering.
- **Images in this package:** six handsome B&W **concept cards** and an earlier AR placement **vision image**. They are NOT tested machine-recognisable markers. No AR scan, unique image-target database, world tracking, physical placement or synchronisation is implemented in this package.

**Instruction:** Examine the current Claude game repository before integrating. Reuse and refine; do not replace code merely because this pack exists.

## 3. THE FIRST SIX CARDS
All cards are **landscape A5 (210 × 148.5 mm)** and print two per **portrait A4 sheet**.

| ID | Front title | Purpose in the game | Required first-version action |
|---|---|---|---|
| 00 | WORLD ANCHOR | Defines the table coordinate frame and intended scale | Place first and keep still; use for calibration / reference |
| 01 | BLUE BASE | Where the blue player's saved base deploys | Position near the table edge during setup |
| 02 | RED BASE | Where the red opponent's base deploys | Position opposite blue during setup |
| 03 | CAPTURE FLAG | Where the contested objective appears | Freely choose a reachable spot, then lock it |
| 04 | HILL | Place the central/optional terrain feature | Optional for first match; must not cover a base |
| 05 | BUILD CAMP | Place a workshop/repair zone | OPTIONAL prototype feature; do not invent a bonus rule yet |

**Colour is not needed to recognise the printed team cards:** the titles and drawings differ even when all printed in black ink.

## 4. SETUP THE PLAYER CAN UNDERSTAND
1. Put WORLD ANCHOR on a stable, flat area of the table. The phone sees it and shows a preview grid.
2. Put BLUE BASE and RED BASE near opposite edges. Use the game's existing blue/red team art.
3. Put CAPTURE FLAG anywhere fair and reachable. Add HILL if desired; BUILD CAMP may be left out.
4. Display virtual placement previews and warn about overlaps, off-table footprints or unreachable flags.
5. Press **LOCK TABLE**. Save each accepted card's stable ID, intended game object, rotation and transform relative to the world reference.
6. Begin the battle. Cards are setup controls: **moving them afterwards does not teleport forts or objectives**. To change the layout, return to setup and re-scan.

A first-version fallback must allow the same setup with **touch placement on the virtual table**, so a missing/failed scan does not prevent the game being played.

## 5. THE TRACKING DESIGN: HIDE THE TECH, NOT THE TRUTH
The wish is for the **illustrated artwork itself to be recognised** by the camera, using natural-image target recognition. **Do not paste a big QR code onto the front.** Use the exact printed art as the starting target image and map each recognised image to its `id` in `manifest.json`.

However, the three sheets share a similar border and art style; it is UNKNOWN whether the current images will be uniquely recognised at distance and at varied angles. **Do not claim tracking works until a real phone/iPad scan demonstrates it.** If scanning confuses cards, improve their *unique asymmetrical engraving*, corner details or background texture in a controlled art revision, regenerate the targets, and retest. Small QR-like artwork from an image generator is not a real machine marker.

Do not assume Apple Safari provides full WebXR spatial tracking. Check the actual supported camera and AR stack on target devices. If a common stable coordinate frame cannot be maintained when only one card is visible, clearly ask to rescan/recalibrate or use a 2D/tabletop fallback. Never pretend an uncertain pose is stable.

The tech library is the builder's choice after checking the existing game and phone support; image-target tracking and marker tracking are possible approaches, not preselected dependencies.

## 6. IMPLEMENTATION CONTRACT (FIRST EXPERIMENT)
- **Do not rewrite the game.** Add `CardRegistry`, `CardDetectorAdapter`, `PlacementPreview`, `SetupState`, `LockedPlacementStore` and a small diagnostics overlay.
- Use stable IDs `00` through `05`, independent of filenames and mesh names. Never use arbitrary code embedded in physical artwork. Card art is untrusted visual input, not executable code.
- Register a detected card with its `id`, `kind`, confidence/quality if available, pose if available, first/last seen timestamps and tracking state. Show `UNKNOWN` when a value is unavailable.
- Confirm physical dimensions from the printed **A5 landscape** sheet. Determine card orientation from the image target, not a guessed camera rotation.
- Save accepted transforms in a versioned JSON record. **A detection alone is not permission to start gameplay.** User must visually accept the layout and press LOCK TABLE.
- Keep game-world physics/damage rules independent of the tracking provider. Once locked, the battle uses the established transforms.
- Log tracking loss or ambiguous identity; never silently reassign RED to BLUE or move objectives mid-battle.
- Use the current 3D assets as placement previews, even if crude. The rich concept picture is an ART TARGET, not an implemented scene.

Example locked placement object (illustrative keys only):

```json
{
  "schema_version": 1,
  "table_id": "local_test_table",
  "reference_card_id": "00",
  "placement_mode": "card_scan",
  "placements": [
    {"card_id":"01", "kind":"blue_base", "transform_anchor_relative":null, "status":"NOT_SCANNED"},
    {"card_id":"02", "kind":"red_base", "transform_anchor_relative":null, "status":"NOT_SCANNED"},
    {"card_id":"03", "kind":"capture_flag", "transform_anchor_relative":null, "status":"NOT_SCANNED"}
  ]
}
```

`null` is deliberate. **No measured transforms, accuracies or camera capabilities have been supplied.**

## 7. PRINT + REPRODUCIBILITY
- Printable file: `print/Round_Table_Kingdom_A4_two_A5_cards_per_page.pdf` — **3 pages / 6 cards**.
- Print **A4 portrait, 100% / Actual size**, black-and-white, preferably matte paper. Do **not** choose Fit to Page. Cut along the horizontal central boundary; each half is A5 landscape.
- Source sheets are in `source_sheets/`. Each individual source crop is in `cards_A5/`. `manifest.json` records the card ID, source, page, crop pixels and SHA-256 fingerprint.
- Regenerate everything with `python tools/build_card_pack.py` (requires Pillow and ReportLab; no web access).
- Do not photograph the screen as the source for image targets. Use the **original individual card PNGs** and test the **actual printed** results.
- Ink-line artwork is at prototype resolution; the printer's margins or scaling can affect results. A commercial-quality version may need clean higher-resolution or vector artwork later.

## 8. ACCEPTANCE DEMO FOR CLAUDE CODE
1. Print the three sheets and cut at the half-page boundary. The cards are the correct physical size and remain readable in black and white.
2. On iPad or Samsung, camera correctly distinguishes all six printed cards in normal indoor light; record **actual** detection tests, mistakes, angles and distances. Do not invent a pass rate.
3. WORLD ANCHOR establishes a visible grid, BLUE and RED preview their correct bases, CAPTURE FLAG previews an objective, and HILL previews a mound.
4. Player can rearrange the physical cards **before** LOCK TABLE, and virtual previews follow reliably when tracking is available.
5. Press LOCK TABLE; remove/hide a card and confirm the game does not silently teleport anything. If world localisation is lost, show a clear recovery message or use virtual-table fallback.
6. Start the existing battle without changing its destruction, resource or scoring rules. Test that saved layout loads correctly.
7. Keep a screenshot of the new setup UI, one game screenshot, and a diagnostics log. State tested browser/device and UNKNOWN limits.

## 9. TASK ORDER FOR THE BUILDER
**First:** Inspect the existing 3D game and agree the placement coordinate system; do not presume its current implementation.  
**Second:** Build the camera recognition experiment for just **WORLD ANCHOR** and **CAPTURE FLAG**, with a read-only diagnostic view.  
**Third:** Add BLUE and RED placement previews, manual fallback and the LOCK TABLE flow.  
**Fourth:** Test and then add HILL. Leave BUILD CAMP optional until the gameplay role is agreed.  
**Fifth:** Create a small screenshot/reliability report; return questions and findings to ChatGPT for art refinement.

## 10. CORE DESIGN RULE
**One picture first, then build, then show real screenshots.** Keep the original 3D scene working, and do not confuse concept art, playable features and still-missing AR tracking.
