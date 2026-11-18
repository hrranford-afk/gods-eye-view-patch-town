# Round Table Kingdom: picture cards (builder notes, 18 Nov 2026)

Six printed cards say where things go on the real table. There are two sets of artwork: **Set 1** (engraved, A5, in `art/`) and **Set 2** (bold woodcut, A6, in `art2/`). Pick one with `?set=1` or `?set=2`. DEFAULT_SET_LINE This folder holds the recogniser, the checker page and the setup flow. **Nothing here is wired into the game yet** (`index.html` and `models.js` are untouched).

**Status in one line:** works on made-up frames on this machine (numbers in `RECOGNITION_REPORT.md`); **NOT TESTED on a real device or a real print.**

## What is here

| File | What it is |
|---|---|
| `cardvision.js` | The recogniser. One global, `CV_CARDS`. Plain JavaScript, no libraries. |
| `cardworker.js` | Runs `CV_CARDS` in a worker thread so the page stays smooth. |
| `setup.js` | The setup flow. One global, `RTK_SETUP`, with `CardRegistry`, `CardDetectorAdapter`, `PlacementPreview`, `SetupState`, `LockedPlacementStore`. |
| `synth.js` | Makes pretend camera frames (for tests and the demo). One global, `CARD_SYNTH`. |
| `../cards.html` | The checker page for a real device. `?demo=1` runs it on pretend frames. |
| `print.html` | Prints the six cards, two per A4 sheet, at true size. `?set=1` (A5, edge to edge) or `?set=2` (A6, with margins and crop ticks). |
| `tests/recognise-test.js` | The offline recognition experiment (Node). `--set 1`, `--set 2` or `--set mixed`. |
| `tests/compare-sets.js`, `tests/art-stats.js` | Set 1 against Set 2 tables, and what the recogniser sees in each card. |
| `tests/page-test.js` | Drives the checker page and the setup flow in headless Chromium. |
| `RECOGNITION_REPORT.md` | The measured results. |
| `inputs/`, `inputs/set2/` | ChatGPT's handovers and manifests for both sets, untouched. |

## How to try it on an iPad (not yet done by anyone)

1. Open `cards/print.html?set=1` (or `?set=2`), print at **100%**, and cut the cards out.
2. Open `cards.html?set=1` (or `?set=2`) over https. Press **Start camera** and allow the camera.
3. Lay the cards on a table. Outlines and names should appear on the picture.
4. Press **Copy log** and paste the text back to the builder.

The camera picture never leaves the device. The page says so at the top.

## The API

### Recogniser

```js
CV_CARDS.SETS['1'] / ['2']       // { dir, mm:{ w, h }, label, files:{ '00': 'file.png', ... } } for each card set
CV_CARDS.init(images)            // images: [{ id:'00', gray:Uint8Array, w, h, mm:{ w, h } }] for the six card PNGs of ONE set. Builds the database (1.5 to 2 s here).
CV_CARDS.detect(gray, w, h)      // one grey camera frame -> [{ id, name, kind, via, inliers, score, margin, corners[4], H, sizeMM }]
CV_CARDS.pose(det, K, sizeMM)    // K = { fx, fy, cx, cy } in pixels; sizeMM is optional (the card's size as printed) -> { R, t, distance_mm, elevation_deg, reproj_px }
```

- `corners` are picture pixels in the order top-left, top-right, bottom-right, bottom-left **of the artwork**.
- `H` (9 numbers, row by row) maps the card's own millimetres (centre = 0,0; x right; y **down** the artwork; `sizeMM` says which card size) to picture pixels.
- `via` is `corners` (found by matching corner features) or `outline` (found as a sheet of paper, then checked against the artwork).
- `score` is 0 to 1: how well the flattened picture matches that card. `margin` is its lead over the next-best card.
- `pose`: card frame x right, y down the artwork, z into the table. Camera frame x right, y down, z forward. `t` in mm.

### What the game should call

The game needs only the locked record. Two ways to get it:

```js
// 1. The player already locked a layout on the checker/setup page (saved on the device):
var locked = RTK_SETUP.LockedPlacementStore.load();          // null if there is none, or if it fails validation

// 2. The game runs the flow itself:
var registry = RTK_SETUP.CardRegistry();
var setup    = RTK_SETUP.SetupState({ tableId: 'local_test_table' });
var adapter  = RTK_SETUP.CardDetectorAdapter(CV_CARDS);
adapter.init(images);
// for each camera frame, at time t (milliseconds):
var sightings = adapter.detect(gray, w, h, K /* or null */);
setup.update(registry.update(sightings, t), t);
var items = RTK_SETUP.PlacementPreview.layout(setup);        // draw the game's own models at these places
var msgs  = setup.messages(t);                               // show these to the player
// touch fallback: setup.setManual('01', x_mm, y_mm, yaw_deg, t)
// when the player presses LOCK TABLE:
var r = setup.lock(t);                                       // { ok:true, locked } or { ok:false, reason, missing }
if (r.ok) RTK_SETUP.LockedPlacementStore.save(r.locked);

// Either way, to turn the record into the game's table units:
var places = RTK_SETUP.LockedPlacementStore.toTableUnits(locked, { mmPerUnit: 160, originX: 0, originZ: 0, turnDeg: 0 });
// -> [{ card_id:'01', kind:'blue_base', placed:true, x, z, rotY, source }, ...]   (three.js: put the base at (x, 0, z), rotation.y = rotY)
```

`mmPerUnit` is **for the two builders to agree**. The practice table in `index.html` is about 3.2 units in radius, so a real table 1 m across would be about 160 mm per unit. That number is a suggestion, not a measurement.

### The JSON the game gets (schema_version 1)

```json
{
  "schema_version": 1,
  "table_id": "local_test_table",
  "reference_card_id": "00",
  "placement_mode": "card_scan",
  "locked_at": "2026-11-18T13:00:00.000Z",
  "card_size_mm": { "width": 210, "height": 148.5 },
  "units": { "length": "mm", "angle": "deg" },
  "frame": "origin = centre of card 00; x = right of its artwork; y = top of its artwork; z = up from the table; yaw_deg = counter-clockwise seen from above",
  "anchor_scanned": true,
  "placements": [
    { "card_id": "01", "kind": "blue_base", "transform_anchor_relative": { "x_mm": -305.2, "y_mm": 19.6, "z_mm": 0, "yaw_deg": 90.1 }, "status": "LOCKED", "source": "card_scan", "seen_at_lock": true, "quality": { "samples": 9, "spread_mm": 0.4, "rigid_residual_mm": 0.3 } },
    { "card_id": "04", "kind": "hill", "transform_anchor_relative": null, "status": "NOT_SCANNED" }
  ]
}
```

- `placement_mode` is `card_scan`, `manual_touch` or `mixed`. Touch placement gives exactly the same shape.
- A card that was never placed has `transform_anchor_relative: null` and `status: "NOT_SCANNED"`, as the handover asks.
- `seen_at_lock: false` means the card had gone out of view and its **last** place was locked.
- The example numbers above are from the demo (pretend frames), not from a real table.

## Rules the flow keeps

- **One set at a time.** The page loads one set. Both sets on the table at once was measured only in the offline test (see the report).
- **WORLD ANCHOR sets the frame and the scale.** Another card's place is worked out only from a frame that shows it **and** the anchor together. Both lie on one flat table, so the maths needs no lens data.
- **Previews follow the cards until LOCK TABLE.** Each place is the middle value of the last 1.5 seconds of sightings.
- **After the lock nothing moves.** `SetupState.update` does nothing once locked. To change the layout: unlock and re-scan.
- **A lost card is said out loud.** Its last place stays on show, dimmed, with a message.
- **Never guess.** A sighting whose lead over the next-best card is small is logged as `ambiguous_identity` and not used. Two outlines that do not fit one flat table are logged as `bad_geometry` and not used.
- **Card art is only ever read as grey pixels.** Nothing from a card is run.

## Not done

- Not wired into the game.
- No 3D preview with the game's models. The checker page shows a flat top-down map.
- The table's own size is not known to the flow, so "off the table" is only checked if the game passes `tableRadiusMM`.
- HILL and BUILD CAMP are recognised and can be placed. No game rule uses them.
