<!-- by ChatGPT, from Harry's Round Table Kingdom Art Pack 3 (18 Nov 2026). Words untouched. -->
# ROUND TABLE KINGDOM — ART PACK 3

## START HERE — Claude Code / home build system

**Source of truth:** `CHATGPT_PACK3_PROMPT.md` originally supplied on the `game` branch of `hrranford-afk/gods-eye-view-patch-town`, at `micro-precinct/games/CHATGPT_PACK3_PROMPT.md`. The source prompt text is copied as `SOURCE_PROMPT_REFERENCE.md` (human excerpt), but inspect the URL for the authoritative prompt.

**Status: delivered art and reproducible source; not inserted into the game's runtime.** Do not claim these are playable assets, camera-verified AR targets or already rigged characters.

## Part 1 — eight texture tiles

All 8 PNGs are in `textures/`, each **1024 × 1024**, RGB, tile-ready, no imposed lighting. `01`–`04` are extracted from the included original painted source atlas, then wrapped/boundary-blended. `05`–`08` are reproducibly drawn with deterministic painted-stroke recipes in Pillow/NumPy.

- `01_wood_planks.png` — warm plank grain
- `02_blue_painted_planks.png` — cornflower blue rubbed paint
- `03_red_painted_planks.png` — brick red rubbed paint
- `04_rusty_tin.png` — rust, grey worn metal and rivets
- `05_cream_canvas.png` — cream weave and stitches
- `06_rope_rows.png` — stacked rope rows
- `07_grass_moss_daisies.png` — painterly green ground
- `08_mouse_fur_swatches.png` — brown / grey / cream sample patches on a repeating paper ground; sample atlas, **not** one continuous fur material

**Measured:** raw pixels on the opposing left/right and top/bottom edges have max difference **0** across all eight images. This is a boundary equality test, not a proof that repeated motifs look invisible, so inspect `textures/previews/all_tiles_3x3_contact_sheet.png` and each 3×3 preview. Source atlas and deterministic generation recipe are included. Mesh UV scale, lighting, PBR roughness, compression and GPU cost are **not** tested in the game.

## Part 2 — three mouse reference sheets

`characters/01_blue_archer.png`, `02_red_scrapper.png`, `03_green_builder.png` each show **front, side, back, three-quarter** in consistent stylised proportions, on a plain background, at 2400 × 1130px; editable SVG master is alongside each. Each is a **2D model-reference drawing**, not a rig, mesh or exact orthographic production turnaround.

Blue: floppy blue hat, goggles, feather, cape, toy crossbow, quiver and cork-headed bolts. Red: dented metal helmet, red scarf, large gear, patched scrap bag. Green: miner helmet and lamp, green scarf, wooden mallet, planks/rope carried behind. Friendly chunky original toy-mouse proportions; no licensed character.

The file `characters/three_character_sheets_overview.png` is a small guide; model each character from its full-resolution sheet and keep distinct side/back proportions. There is also a painterly moodboard in `references/` as a *style reference only*. Do **not** treat character sheet SVG shapes as runtime 3D files.

## Part 3 — AR Cards Set 2b

`cards_set2b/cards_A6/` holds 6 **pure B/W** high-contrast camera-target candidates, A6 landscape (148 × 105 mm), 2220 × 1575px. `cards_set2b/cards_A6_colour/` has separate colour variants built from the same black artwork: black pixels remain identical; flat fills and an inset band vary by card. Exact HEX colours and SHA-256 checksums are in `cards_set2b/manifest.json`.

Changes versus Set 2 are deliberately limited:

1. `01_blue_base` central emblem is a tall watchtower with four splayed supports, X-brace, boxed platform, pointed roof, ladder, feather flag to the right.
2. `03_capture_flag` top and bottom banner/bunting lines are thickened.
3. Add optional colour version in six brightness-separated hues.

Original Set 2 black-and-white PNGs for World Anchor, Red Base, Hill, Build Camp are **byte-identical**, recorded in `check/UNCHANGED_SOURCE_DESIGNS.txt`. 

| Offline check | Result | Interpretation |
|---|---:|---|
| highest B/W pair correlation | **0.4096** | passes 0.5 heuristic |
| highest colour-to-grayscale pair correlation | **0.4405** | passes 0.5 heuristic |
| highest B/W 180° self-correlation | **0.4471** | lower is better |
| highest colour 180° self-correlation | **0.4683** | lower is better |
| minimum colour grayscale brightness gap | **18.92/255** | visual brightness separation, not recognition |

Check uses **130px width, grayscale, blur sigma=0.7px, Pearson correlation**. See `cards_set2b/check/*` including both 6×6 matrices and rotation tables. **NO actual camera recognition, pose stability, tilted-card robustness, lighting or distance data have been measured here.** The game session's measured Set 1 and Set 2 camera results were not supplied. Do not guess or compare them.

## Printing

Four PDFs in `cards_set2b/print/`: black & white and colour, each in *4-up A4 portrait (full bleed)* and *2-up A4 portrait (printer-safe)* forms. Four A6 landscape cards need rotating into portrait to fit A4; they occupy nearly all the paper and may be clipped by non-borderless printers. **Prefer printer-safe 2-up, at 100% / actual size; never fit-to-page.** Small crop ticks are outside the art in 2-up. The 4-up and 2-up files are both checked for successful PDF rendering. Preview images are in `checks/pdf_previews`.

## How to reproduce the whole pack

From Pack 3 root, with Python and dependencies `cairosvg pillow numpy scipy reportlab`:

```bash
python code/build_textures.py .
python code/build_characters.py .
python cards_set2b/code/build_set2b.py .
python code/finish_pack.py .
```

`cards_set2b/code/set2_source.py` is the original Set 2 generator. `build_set2b.py` patches only the requested SVG pieces before building PNGs, adds the colour variants, writes the four PDFs, and re-runs the *same* camera-scale correlation test code. All original input art for the texture tiles is included under `textures/source/`. The final pack ZIP is built **outside** the pack folder to avoid a recursive archive.

## Immediate integration steps

1. **Textures:** first swap one standard plank material in the running 3D game, enable UV repeats, confirm visibility and frame rate on the actual iPad, then migrate the other seven. `08` is an atlas of swatches, so pick sub-regions rather than mapping it across an entire mouse.
2. **Characters:** use four views to make separate efficient meshes for Blue, Red, Green. Skin and rig them in the *existing game*; use movement/camera test screenshots for each. Do not replace current collision/hitbox/AI rules without reason.
3. **Cards:** compile image-tracker targets from the *actual* card PNGs. Use WORLD ANCHOR to establish table coordinates; BLUE/RED deploy bases; FLAG/HILL/BUILD CAMP place their corresponding objectives. During setup, move physical cards before locking the map; report what happens on card occlusion.
4. Real AR tests at 0.4m, 1.0m and 1.5m; head-on and slanted angles, soft vs harsh ordinary light, single and multiple cards, 180° rotation, self-confusions, track jitter and relocalisation. **Compare measured Set 1, Set 2, Set 2b results using the same bench**, then decide if these targets are usable.

No GitHub write, no actual AR registration, no game changes have been made here.
