# Recipe format: `rtk.building`, version 1

A recipe is **data only**. It is plain JSON, read with `JSON.parse`, checked by `validate.js`, and only then built (`build.js`) and simulated (`sim.js`). Nothing in a recipe is ever run, evaluated, fetched or linked: no code, no expressions, no function strings, no URLs. If a recipe contains anything that looks like code or a link the validator refuses the whole recipe and says where.

```
{ "schema": "rtk.building", "version": 1, "id": "bakery", "name": "Miniature Bakery",
  "footprint": { "w": 2.4, "d": 1.8 },
  "parts":   [ ...1 to 120 parts... ],
  "systems": { ...the economy... } }
```

Units: table units (a mouse is about 0.3 tall; the bakery is 2.4 wide). `y` is up, the ground is `y = 0`, the plot is centred on the origin, the front faces `+z`.

## Top level

| Key | Type | Rule |
|---|---|---|
| `schema` | text | exactly `rtk.building` |
| `version` | number | exactly `1` |
| `id` | text | `^[a-z][a-z0-9_.-]{0,31}$` |
| `name` | text | at most 40 characters of `A-Z a-z 0-9 space . , ' ! & ( ) / + -` |
| `footprint` | `{w, d}` | each 0.4 to 4.0 |
| `parts` | list | 1 to 120 parts |
| `systems` | object | see below |

Any other key anywhere is an error ("unknown key"). Every string and every key in the whole file is scanned: at most 80 characters (400 anywhere), and none may contain `<`, `>`, backtick, `${`, `=>`, `eval`, `function`, `script`, `javascript`, `http:`, `data:`, `://`, `__proto__`, `constructor`, `prototype`, `import`, `require`, `document.`, backslashes or control characters. (This is conservative: "Functional Bakery" is refused, on purpose.) At most 12 levels of nesting, 400 000 characters of text, 20 000 values.

## A part

| Key | Type | Rule |
|---|---|---|
| `id` | text | the id pattern above; unique in the recipe |
| `kind` | text | one of the whitelist (below) |
| `pos` | `[x, y, z]` | the middle of the part's base. x and z within 5 of the origin, y from 0 to 5 |
| `size` | `[w, h, d]` | each 0.01 to 4. Optional; default is the kind's own size |
| `scale` | number | 0.25 to 3. Optional; instead of `size`, not with it |
| `rotY` | number | radians about the vertical, -7 to 7. Optional, default 0 |
| `material` | text | one of the whitelist (below) |
| `stage` | text | `trim`, `walls` or `frame`: the order damage reaches it (trim first, then walls, then frame), as in the Building Yard |
| `needs` | list of ids | the parts that hold this one up. Empty means it stands on the ground. At most 12 |
| `needsMin` | whole number | how many of `needs` must still stand. 1 to the length of `needs`. Optional, default all of them |
| `tag` | text | `^[a-z][a-z0-9_]{0,23}$`; what the economy rules (below) look for, e.g. `oven`, `roof`, `awning` |
| `replaceable` | true or false | whether the Replace button may change it |
| `variant` | whole number | 0 to 3. Optional. Look variants (an awning's stripes) |
| `label` | text | only on a `sign`: the text on the board (40 characters) |

### Kinds (the whitelist, `whitelist.js`; their builders are in `parts.js`)

`floor, post, beam, panel, door, window, shutter, rafter, roof_tile, ridge, gable, chimney, awning, sign, crate, sack, oven, counter, wire, meter_box, barrel, shelf`

`rafter`, `roof_tile`, `awning` and `gable` are sloped pieces drawn inside their box: at `rotY` 0 they face `+z` (high at the back, low at the front); turn them by `rotY`. Their box is the box the overlap rule uses.

### Materials (atlas names, `parts.js` holds the tile and colour of each)

`wood, wood_dark, wood_pale, paint_cream, paint_blue, paint_red, tin, brick, canvas, flour, bread, iron, glass, stone`

### The rules a recipe must satisfy (the validator checks each and says which part)

1. **References**: every id in `needs`, `station_part`, `wire_part`, `meter_part`, `needs_parts`, `drop_part`, `inspect.labels` exists. A part cannot need itself, and the `needs` graph has **no cycle**.
2. **Inside the plot**: a part's box is within the footprint plus 0.9 on every side, and under 4 tall.
3. **No overlaps**: two parts overlap when they sink into each other by more than 0.02 on every axis (their boxes, turned by `rotY`). Exempt: a part and a part it needs (a thing that hangs on another sits against or into it), and anything with kind `wire`.
4. **Everything stands at the start**: a part with no `needs` must be on the ground (its base at `y <= 0.03`); a part with `needs` must touch (within 0.04) at least one of them.

### The support rule (`supports.js`, the same rule the Building Yard uses)

A part with `needs` falls when **fewer than `needsMin`** of them are still standing. When something comes off (blast, hand, repair order undone), every part whose support is gone falls, and then whatever hung on those, round after round, up to 14 rounds. `tests/support-test.js` shows this equals the game's own rule on the Cottage and the Market stall.

## `systems`

Only these keys: `power, jobs, production, storage, start_stock, deliveries, sales, costs, repair, effects, inspect`. Required: `jobs, storage, costs, repair, inspect`. Everything is optional beyond that, so a shed or a house is a valid recipe with no production and no sales.

| Block | Fields (all required inside the block unless marked optional) | Meaning |
|---|---|---|
| `power` | `demand_kw` 0 to 50, `supply_kw` 0 to 100, `wire_part`, `meter_part` | The city supplies `supply_kw`. The machine wants `demand_kw` while it runs. If the cable or the meter box part is gone, power is 0. If supply is less than demand, production runs at `supply / demand` of its speed and draws what is there. |
| `jobs` | list of `{role, count 1-6, station_part}` (at most 8) | A role and how many mice. A mouse works at the station part; if that part is gone it stands idle. |
| `production` (optional) | `role`, `inputs {item: amount}`, `outputs {item: amount}`, `batch_seconds` 1 to 3600, `needs_power` true/false, `needs_parts` [ids] | A batch takes its inputs when it starts and gives its outputs after `batch_seconds`, at full staffing and full power. Speed = (workers of `role` at their stations / places) x power factor. It stops if any of `needs_parts` is gone, if an input is short, or if the outputs would not fit. |
| `storage` | `{item: capacity}` (at most 12 items) | Item names `^[a-z][a-z_]{0,23}$`. |
| `start_stock` (optional) | `{item: amount}` | At the start. Not above capacity. |
| `deliveries` (optional) | list of `{item, amount, every_seconds 5-3600, via: "cart", drop_part (optional)}` | A cart brings `amount` every `every_seconds` (first one at `every_seconds`). Only what fits in storage is taken. If `drop_part` is gone the cart cannot deliver. Paid at `costs.ingredient_prices` for what was taken. |
| `sales` (optional) | `item`, `price`, `demand_per_minute` 0 to 600, `role` (optional), `noise` 0 to 0.5 (optional) | Customers arrive at `demand_per_minute`; each takes one if there is stock, else leaves. Rate is multiplied by the staffing of `role`. `noise` makes the rate wobble every 5 s using the sim's seed. |
| `costs` | `power_per_kwh`, `wage_per_worker_per_minute`, `ingredient_prices {item: price}`, `repair_material_price` | All 0 to 1000. Wages are paid for every mouse in `jobs` all the time. |
| `repair` | `seconds` 0.5-600, `material_units` 0-100, `walk_speed` 0.05-5, `worker_roles` [roles], `seconds_by_tag` (optional) `{tag: seconds}` | A repair sends a free worker of one of `worker_roles` to the part, takes `seconds` (or the tag's own time), costs `material_units x repair_material_price`, then the part is back and the worker walks home. A part whose `needs` are gone cannot be mended until they are; ordering a repair orders the missing needs first. |
| `effects` (optional) | `spoil` [{`tag`, `items {item: fraction}`}] (at most 4), `demand` [{`tag`, `loss` 0-1}] (at most 4) | `spoil`: while a share `s` of the parts with that tag is gone, each listed item in storage spoils at `fraction x s` of the stock per minute. `demand`: sales demand is multiplied by `1 - loss x s`. |
| `inspect` | `labels {part id: text}` | The name shown for each part. |

Every number the simulation uses is one of these. Nothing about bread, ovens or money is in `sim.js`.

## Changing one part (the Replace button)

`validatePatch(recipe, id, patch)` checks a change with the same rules: only `kind, material, variant, label, size, scale, tag` may change, only on a part with `replaceable: true`, and the changed part must still stand and must not overlap anything. Nothing is built from an unchecked patch.

## Adding a kind

1. Add the name and default size to `KINDS` in `whitelist.js`.
2. Write its builder in `parts.js` (`K.name = function (b, w, h, d, m, o) {...}`). It builds the part standing on the ground, centred on x and z, facing +z. No recipe can ever reach any other code.
3. Run `tests/validate-test.js` and `tests/page-test.js`.

## Example recipes

`recipes/bakery.json` (57 parts, the Phase 1 building), `shed.json` (22), `cart_stall.json` (12, sells apples, no power), `house.json` (25). They are written by `tools/gen-recipes.js` (a developer's script, not part of the page) and read as plain JSON.

## Added for the cottage contact sheet (backward compatible)

Kinds `roof_hip` (hipped roof, variant 1 = pyramid), `roof_cone` (pointed roof for a tower) and `tower` (round wall). Materials `paint_sage, paint_ochre, paint_rose, paint_teal, paint_butter, plaster, oak_dark, clay, slate, thatch, roof_green, roof_seam` (thatch, slate and roof_seam also change how a roof is drawn). Variants (0 is the old look): `panel` 1 half-timber, 2 clapboard, 3 stone or brick courses; `gable` 1 right-angled one-slope end, 2 no round window; `chimney` 1 two pots, 2 stepped taper; `roof_tile` 1 thatch, 2 shingle, 3 standing seam. The 24 cottages are `recipes/variants/cottage_01..24.json`, made by `tools/gen-cottage-variants.js`, shown by `contact.html`, checked by `tests/contact-test.js`.
