# Baked props (models/props.js)

Vertex-coloured, quantised versions of 14 CC0 models from `models/cc0/`. No loader needed at runtime. `props.js` is 120 KB, 3822 triangles in total.

## Re-bake

```
node tools/bake-props.js
```

Needs Node 22+ and Playwright with Chromium (only used to decode the PNG colour maps). Edit the `PICKS` table in the script to change which models are baked. Preview: open `tests/props-preview.html` (screenshot: `shots/48-props-baked.png`).

## Use

```js
// after three.js r128 and models/props.js
const g = bcPropGeometry("honeyJar");        // BufferGeometry, height 1, centred x/z, base at y=0 (cached: do not dispose)
const m = bcPropMesh("well", { height: 0.1 }); // Group: toon mesh + dark ink outline
// opts: height, ink (false = no outline), inkWidth, inkColor, shading ("toon"|"flat"|"lambert"), tint
```

Each entry in `BC_PROPS` has `pos` (int16), `nor` (int8), `col` (uint8 RGB), `idx` (uint16), all base64, and `h` = {w, d (size relative to height 1), r (x/z quantisation range), h0 (source height), ink, tris, verts}. Globals: `BC_PROPS`, `bcPropGeometry`, `bcPropMesh`.

## Props

| Prop | Source | Width x depth (height = 1) | Triangles | Vertices |
|---|---|---|---|---|
| matchboxHut | quaternius-survival-matchbox | 0.4955 x 0.1517 | 396 | 744 |
| canHut | kenney-food-can | 0.9375 x 0.9375 | 156 | 160 |
| canHutOpen | kenney-food-can-open | 0.737 x 0.737 | 216 | 216 |
| peanutJar | kenney-food-peanut-jar | 0.7976 x 0.7976 | 172 | 160 |
| honeyJar | kenney-food-honey | 1.0317 x 1.0317 | 140 | 144 |
| well | quaternius-village-well | 0.5329 x 0.8026 | 1870 | 2860 |
| pulleyFrame | kenney-survival-pulley-frame | 1.4591 x 0.4429 | 76 | 132 |
| lookoutFrame | kenney-survival-lookout-frame | 1 x 1 | 80 | 160 |
| carrot | kenney-food-carrot | 0.479 x 0.479 | 148 | 160 |
| corn | kenney-food-corn | 1.0855 x 0.9495 | 128 | 138 |
| pumpkin | kenney-food-pumpkin | 1.828 x 1.828 | 188 | 168 |
| mushroom | kenney-food-mushroom | 0.8971 x 1.0358 | 80 | 84 |
| mushrooms | kenney-nature-mushrooms | 1.0764 x 1.0148 | 144 | 252 |
| match | quaternius-survival-match | 0.069 x 0.0633 | 28 | 56 |

Notes: Kenney colours come from sampling the colour map at each vertex UV. Quaternius colours come from material colours. Single-sheet parts (leaves, lids) are why materials are double-sided. The ink outline is an inverted hull (back faces, scaled about the vertical centre).

## Licences

All CC0 1.0. See `models/cc0/LICENCE-kenney.txt` and `models/cc0/LICENCE-quaternius.txt` (Kenney Food, Survival and Nature kits; Quaternius Survival and Medieval Village packs).
