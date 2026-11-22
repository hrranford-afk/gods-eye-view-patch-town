# Second styles showcase: same island, same good assets, four new looks

22 Nov 2026. The first showcase was dragged down by cone trees and blob props. Here one shared kit (CC0 models, see `assets/LICENSES.md`) and one shared world builder (`world.js`) feed every style, so the style is the only variable. Times were measured on the build machine (4 CPU cores, software GL, no GPU) with headless Chromium; every image is 1200x800 in `shots/`.

## Shared pieces
- Island: `../island.json` and `../water.png`, unchanged (seed 1122). All 34 conifers, 70 rocks, 2 tents, boat and campfire are at their original positions. Added on top, seeded: 46 broadleaf trees and 90 bushes, so it reads as a mixed wood (the original had conifers only).
- Camera: a tighter shared camera than the first showcase (`World.CAMERA`), so trees and settlers read. Style C is isometric by nature and style D a flat oblique stage, so those two cannot share a perspective camera and show the camp region instead.
- Kit (`kit.js`): Quaternius pines, common and twisted trees, bush, rocks; Kenney rocks, tent, canoe, campfire; plus a procedural conifer and broadleaf generator. People: `people_kit.js` is generated from `people_options.html` style 6 (unchanged builder, three settlers, frozen pose).
- `shots/kit-1.png` is the honest lineup. The old cones are the weakest. Procedural conifer: layered drooping boughs with colour ramp, genuinely good and the cheapest (about 4k triangles, no textures). Procedural broadleaf: clean, soft, slightly generic. Quaternius pines: best silhouettes and bark. Quaternius broadleaf: leaf cards come out dark and busy in flat lighting (the pack expects its own foliage shader); I brightened and re-tinted the textures, still the weakest kit tree. Kenney rocks are plain but fine once recoloured (their glTF colours were far too bright). Quaternius rocks are the best rocks.

| | A Toon / cel | B Live painterly | C Pre-rendered iso sprites | D Paper-cut diorama |
|---|---|---|---|---|
| Image | `shots/appr2-A.png` | `shots/appr2-B.png` | `shots/appr2-C.png`, sheet `shots/sprites.png` | `shots/appr2-D.png` |
| Look, honestly | Cheerful, readable, ink outlines on trees/tents/people hold up. Ground is flat palette zones (cartoon map feel), banded sky, foam-line water is the best part. Terrain shading is soft rather than truly stepped; sand is a bit orange. | Warmest and most "illustration": Kuwahara facets, brush streaks, pigment pooling, torn paper margin. Soft and atmospheric. Small things (people, rope) lose crispness; I let some of the original back in. Streak direction is uniform, looks like hatching up close. | Most game-like (Age of Empires feel): baked shadows, painted tiles, glowing fire. Ground tiles read as pixel-ish hatching, the view is a crop of the island (about 90 m wide), few trees in frame. Trees show 4 facings, so repetition is visible. | Most charming and most distinct: stacked cut-paper contour layers with wobbly edges, soft shadows between layers, pop-up cards for trees/tents/people made from the kit renders with white cut borders. Not a 3D view, props are exaggerated 2 to 3x, camp is small. |
| Compute (build machine) | about 6 s total, software GL (2 passes, 2x depth/colour target) | about 5 s at 1.5x supersample with a 5 px Kuwahara radius; on a GPU this is a few ms | sprite pre-render about 3 s for 101 sprites (2 passes each, 2x supersampled), compose about 3 s; compose is the only per-frame cost afterwards | about 6 s: 15 layers by 960k pixels of height-field cut in JS, plus cards |
| Real time on an iPad | Yes. One forward pass plus a depth edge pass; toon materials are cheap. | Probably, at reduced resolution: Kuwahara is about 100 texture taps per pixel (estimate, not measured on a device). Render at 0.7 scale and upsample, or use a 3x3 radius. | Yes, trivially: it is 2D blits. Re-drawing the ground each frame needs a cached ground layer. | Layers are pre-cut once; drawing is blits plus shadow blur. Shadow blur is the expensive part on mobile canvas; cache it. Yes with care. |
| AR suitability | Good. Real geometry, outlines are screen-space, reads well on a table. | Poor to fair. The filter fights camera video, and the look is tied to a fixed viewpoint. | No (2D), apart from a flat card on a table. | Fair as a physical-feeling table-top if rebuilt as real extruded layers; this version is flat canvas and would need a 3D rebuild. |
| Builds change it live | Yes, full 3D scene. | Yes, it is a post effect over the live scene. | Partly: new objects need new sprites (pre-render on demand, one-off, cheap) and a ground re-draw of touched tiles. Terrain edits are cheap, new building kinds are the cost. | Layers must be re-cut when terrain changes (about 0.4 s per layer here at full size, local re-cut would be faster); cards are easy to add. |
| Tools on the owner's hardware | A browser. Nothing else. | A browser. | A browser; sprite renderer is the same three.js. A real Blender pipeline would give nicer sprites. | A browser; a designer could author the card art by hand. |
| Best use in the game | Candidate for the live view if the owner wants a friendly stylised look; also good for UI mascots. | Marketing stills, chart/journal screens, a "memory" filter on photos of the island; maybe a live "dream" mode. | A second, cheap, big-world map view or a low-end mode; the sprite sheet pipeline also suits icons and the build palette. | Menus, loading, story pages, share cards, the "island as pop-up book" end-of-season view. |
| Where the tree kit helped | Biggest win: pines and tents take outlines well, silhouettes read at small size. Quaternius broadleaf looks best here (ink hides the busy leaf cards). | Pines survive the filter and keep their silhouettes; leaf cards dissolve into nice dabs. | Kit models render cleanly into sprites; 4 facings of 6 trees stand in for a forest. | Kit models become cards (3-step toon render plus cut border), so one asset set drives a very different style. |

## Honest weaknesses
- None of these is final art. Each is a few hours of prototype work.
- The kit's broadleaf trees remain the weakest asset; the procedural generators in `kit.js` are good alternatives (switch with `World.props({procedural:true})`, not used in the hero shots).
- Settlers are 30 to 45 px tall in A and B, tiny in C, paper-doll sized in D. The shared sun is low and behind the island, which gives long tree shadows across the beach in A and B.
- iPad numbers above are estimates; nothing was measured on a device.
- C and D use 2D canvas compositing, so "same camera" does not hold for them.

## Reproduce
```
python3 -I pack_assets.py <cc0 dir>      # copies and shrinks the ~17 models (plain Pillow/numpy)
python3 build_people_kit.py              # regenerates people_kit.js from people_options.html
NODE_PATH=$(npm root -g) node run2.mjs toon.html shots/appr2-A.png      # also painterly B, sprites C, paper D, kit.html -> kit-1.png
NODE_PATH=$(npm root -g) node run2.mjs sprites.html shots/sprites.png '?sheet=1' 2040 1358
NODE_PATH=$(npm root -g) node ../tests/approaches2-test.js
```
three.js r128 comes from `THREE_JS`, `/tmp/three.js`, or the cdnjs CDN. Needs Playwright (global npm package) and Pillow, numpy. No new installs were made.
