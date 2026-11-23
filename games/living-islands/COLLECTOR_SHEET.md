# COLLECTOR_SHEET: the beach collector concept sheet (23 Nov 2026)

A fixed Blender script that draws the four silhouette concepts of `research/BEACH_COLLECTOR.md` section 10 side by side, so the owner can choose one by eye. Picture: `shots/collector-sheet.png` (4 rows A to D, 3 columns: three-quarter on sand, side silhouette, front).

## The four designs (all original, about 1.0 m long, tracked, every one with a solar shell, a folding grabber arm, a hopper, one small amber status lamp and no writing)
| | Idea | What carries the character |
|---|---|---|
| A, low tortoise | long domed solar shell over almost everything, four short chunky tracks at the corners | shell with scute lines, one hazed lens under a hood on a small head bump, arm folded flat in a slot in the shell, round bin at the back with a propped lid. 0.53 m tall, the shy one |
| B, terrier | nose-up dog stance, long angled tracks like legs, head pod on a short neck | head tilted (rolled) with a dark visor window, one small side sensor and two floppy ears, thin arm folded under the chin, flat panel on four posts over the back, boxy pack, lamp on a tail antenna. About 0.7 m with ear tips, the alert one |
| C, wheelbarrow | open work tub in front, short back, panel on a frame, two long bulldozer tracks | tall spindly crane arm with the head pod at its elbow (a single camera-like lens), the tub heaped with litter above the rim. The tool-like one |
| D, beetle | high rounded back of two hexagonal wing-case shells hinged at the front and tipped up to the sun (not equally, a little clumsy) | low head tucked under a front plate, a dark recess with one lens and a slot sensor, mandible pincers folded in front as the grabber, short wide tracks like legs, a belly tray lip at the back. The creature of the shore |

No design has a pair of round eyes. Faces are a visor window, a single hazed lens or a lens plus a slot sensor, and every lens is dull glass with a haze, so nothing stares.

## Wear (procedural materials only, no images)
Faded two-tone paint with sun-bleached chalky tops, chips to bare metal, rust runs that follow Z (down) from fixings, salt crust in the lowest 17 cm, sand tint in crevices from an ambient-occlusion node, tiny rusty bolts, dusty rubber treads. Props of age: a strip of tape, one repair patch in the wrong colour, a bit of twine, a dented track guard, sand drifted against a track. A bottle and two bottle tops lie beside each machine for scale. The sand has real tread prints (depressions, a ridge at the rim, cross bars from a bump on the track pitch) trailing back on a curve.

## How to run
```
blender -b --python games/living-islands/blender/collector_sheet.py -- --out DIR [--w 960 --h 640 --samples 48] [--only ABCD] [--views 3q,side,front]
```
Writes `A_3q.png A_side.png A_front.png ... D_front.png` and `collector-sheet.png` into DIR (the sheet only when all three views are rendered). The sheet and its letters and captions are composed inside the script through Blender images and a small built-in bitmap font, so it needs no extra python package. `--only B --views side` re-renders one frame for quick iteration. CPU Cycles; the device guard in `li_device.py` (LI_DEVICE, LI_GPU_NAME, LI_REQUIRE_GPU) still applies. LI_LOOK works as in the other scenes. Deterministic geometry and fixed Cycles seed.

Tests: `python3 games/living-islands/tests/test_collector_sheet.py` (pure python: arguments, no network, subprocess or delete calls in the script, no forbidden words or private paths, dimensions, one lamp, tread links, designs differ).

The committed sheet was made at 640 x 420 and 24 samples with the cloud `bpy` 5.3 module through a wrapper that mimics `blender -b --python`. It is a preview size; run at the default size for the owner's review.

## What is faked or simplified
- Silhouette views use a material override (flat dark emission) and a plain light world, with the ground hidden and a thin dark floor slab; the dark shape is therefore the true outline including thin parts (arm, antenna, twine).
- Shapes are low-poly primitives (rounded boxes, cylinders, wedges); flat shading on purpose. Tread links are separate boxes per link, grouped into one mesh per material; there is no rigging and no animation, the arm poses are fixed.
- The arm, hopper and lamp are placed, not engineered: no reach or capacity check, no lid or shell motion. Hopper volume was not computed (15 L target in the research note is not checked against these bins).
- The solar cell grid is a procedural brick texture projected on top-facing faces; on steep faces it stretches.
- The sky, sand and sun are the shared li_scene sky plus a sun lamp, not a real beach; the horizon is a flat plain and there is no sea.
- Tread prints are a height grid plus a bump from a stored path-length attribute, not soil mechanics.
- Real product and place names appear nowhere. No photos, no downloads.

## Honest gaps
- Sizes: B is about 0.7 m to the ear tips (head top about 0.62 m) against the 0.6 m target, D is 1.2 m with the mandibles out, A is 0.53 m. Within dog-sized, not exact.
- Seen only at 640 x 420 and 24 samples, so fine texture and lens detail are noisy; the default size has not been looked at.
- Tested against Blender 5.3 (the cloud module); Blender 3.6 patterns are used (S() for Mix sockets, sky and look fallbacks, guarded Principled input names), but 3.6 itself was not run here.
- The silhouette sheet shows scale by a bottle but has no rule of measure; the three views are not strict orthographic drawings except the side one.
