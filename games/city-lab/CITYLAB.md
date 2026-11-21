# City Lab, Phase 1

Branch `game/city-lab` (from `game/sofa-siege` 602d744), folder `games/city-lab/`. Nothing in `games/sofa-siege/` was edited (`git diff 602d744 -- games/sofa-siege` is empty). The page reuses `../sofa-siege/models.js` and `../sofa-siege/tex/` by relative path, so it works the same on gh-pages with `city-lab/` beside `sofa-siege/`.

**The question:** can we DESIGN, BUILD, INSPECT and SIMULATE one working city building from DATA, so a model can one day propose a building as JSON and nothing it writes is ever run? Today's Yard buildings are hand-coded in `models.js` (the Capability Audit's point). **The answer, for one building:** yes. A 57-part miniature bakery is a plain JSON file; a strict validator accepts it and rejects 75 hostile ones; one builder turns it into toy-wood meshes with named, replaceable, removable parts; the game's own support rule (proved equal on two real buildings) decides what falls; and a deterministic simulation turns the same file into an economy that reacts to every broken part.

## Run it

```
cd games                          # the folder that holds both city-lab/ and sofa-siege/
npx http-server -p 8765 -c-1 .    # or any static server; fetch() needs http, not file://
open http://localhost:8765/city-lab/index.html
```

Addresses: `index.html` (bakery), `?recipe=shed|cart_stall|house`, `?xray=1`, `?auto=0` (no auto-orbit). three.js r128 comes from the same CDN URL the game uses.

On the page: tap a part (name, stage, needs, needed-by, health, replaceable, how many parts fall if it goes); drag to orbit, pinch or scroll to zoom; **X-ray** ghosts the shell and shows the power flow from the meter box to the oven (green ok, amber low, red cut); **Time x1/x5/x20/Pause**; **Damage**: Blast at a point (radius slider), Remove a part, Cut wire, Drop roof tiles, Smash oven, and the city power supply (Full / Brownout / Off); **Repair**: tap a red chip for a missing part, or Repair all, with a choice of worker; **Replace a part** (material, awning stripes, sign text); **Recipe**: load an example, paste JSON (validated, errors shown with their JSON path, scene unchanged on refusal), Copy recipe, Reset. The live panel shows power supply, demand and draw; every worker and what it is doing; stock against capacity; loaves made, sold and lost customers; income, costs, income and running costs per minute, net per minute, balance; the last 8 events.

## Tests (all headless; no iPad)

`NODE_PATH=$(npm root -g) node tests/X.js` from `games/city-lab/`. The page tests serve `games/` on localhost and send the CDN request for three.js to a local r128 copy (found in the sibling brick-lab worktree, or `THREE_PATH`); every other outside request is blocked.

| Test | Checks | Result |
|---|---|---|
| `tests/validate-test.js` | 4 valid recipes (also through `parse(text)`), 75 hostile recipes each checked twice (rejected without throwing, and the error says why), Object.prototype never touched, 8 patch checks | 171 of 171 |
| `tests/sim-test.js` | hand-computed 5-minute baseline (batches, loaves, sold, income, wages, ingredients, power, stock, rates), brownout, cable cut, meter box, oven smashed, roof off (full and half), awning off, repair (time and cost, dependency order, repair all), drop crate, storage full, blasts, 200 random damage sets, determinism (byte-identical state and hash, saved-state replay, any-size time steps), every number read from the recipe, cart stall, shed and house | 72 of 72 |
| `tests/support-test.js` | the support rule against the game (below) | 23 of 23 |
| `tests/page-test.js` | page loads with no errors; 19 inspect fields populated; real mouse click picks a part; orbit; X-ray; power pill states; damage with real buttons then repair end to end; blast and remove tools by clicking; Replace (accepted and refused cases); hostile JSON in the paste box (4 texts plus a huge number): error shown, scene signature unchanged; Copy recipe round trip; examples load; speed buttons; 834x1194 and 1180x820 layouts (no horizontal scroll, every button 44 px or more, panel reaches the last section) | 56 of 56 |
| `tests/e2e.js` | the story: baseline minute, 70 s cart, blast on oven and roof, 45 s of nothing, repair, recovery | 10 of 10 |
| `tests/physics-check.js` | optional stretch, see below (prints, not pass/fail) | ran |

Total 332 checks pass. Not touched, therefore unchanged: the sofa-siege suites (see "Sofa-siege suites" below).

### The e2e table (bakery, 1180x820, simulated time)

| Step | t (s) | batches | loaves in store | flour | spoiled flour | sold | missing parts | repairs paid | balance | net/min | status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1. baseline, first minute | 60 | 2 | 13 | 11 | 0 | 11 | 0 | 0 | 26.5 | 26.5 | working |
| 2. the 70 s cart has come | 73 | 2 | 9 | 23 | 0 | 15 | 0 | 0 | 9.3 | 11.6 | working |
| 3. blast: oven and roof hit | 83 | 2 | 6 | 23 | 0.04 | 18 | 7 | 0 | 18.4 | 23 | no bread oven |
| 4. 45 s later, nobody repairing | 129 | 2 | 0 | 21.5 | 1.46 | 24 | 7 | 0 | 30.9 | 1.7 | no bread oven |
| 5. after 2 minutes of repair | 250 | 6 | 20 | 33.4 | 1.64 | 52 | 0 | 42 | 7.9 | 36.7 | working |
| 6. 90 s after the repair | 340 | 9 | 26 | 36.4 | 1.64 | 82 | 0 | 42 | 72.2 | 62.5 | working |

(The first minute is poor on purpose: the bakery opens with no loaves, so the first 28 s of customers leave empty-handed; "9 lost" in the panel.)

### Simulation: hand-computed against simulated

The expected numbers come from the recipe's own arithmetic, written beside each check in `tests/sim-test.js` (batch 28 s, 12 loaves per batch, demand 20 a minute at price 4, 3 workers at 5 a minute, power 6 kW at 24 a kWh, carts every 70 s). A few:

| What | By hand | Simulated | Tolerance |
|---|---|---|---|
| batches in 5 min = floor(300/28) | 10 | 10 | 0 |
| loaves sold (customers every 3 s, first loaves at t=28) | 90.5 | 91 | 1.5 |
| wages (3 x 5 x 5) | 75 | 75 | 0.05 |
| ingredients (4 carts x 29.6) | 118.4 | 118.4 | 0.05 |
| power (6 kW x 300 s / 3600 x 24) | 12 | 12 | 0.3 |
| brownout 3 of 6 kW: batches | 5 | 5 | 0 |
| roof off, flour after 1 min (20 e^-0.25) | 15.576 | 15.575 | 0.16 |
| awning gone, loaves sold (demand 17 a min) | 77.1 | 78 | 2 |
| oven repair time (walk 1.1 s + 20 s) | 21.1 s | 21.3 s | 0.6 |
| same seed twice, same actions | | state hash identical (JSON equal) | exact |

### The support rule is the game's rule: what is and is not compared

`tests/support-test.js` loads the real game (`../sofa-siege/index.html?lab=1`), takes the **Cottage (40 parts)** and a **Market stall (13 parts)** from the Building Yard, and compares `supports.fall()` with the game.

Compared (all equal): 1. **data**: the game's part table (`SS.bldInfo`) and the live piece's parts, converted mechanically into recipe-shaped `{id, needs, needsMin, stage}`, are identical; 2. **the rule by direct removal**: 53 single removals, 858 pairs and 800 seeded random sets (1 to 8 parts) are removed from the live piece and the game's own predicate (`bFloating`, through `SG.bldFloating()`) is run round by round as `bSettle` does; the fallen set and the round grouping equal the pure function every time, and the game never has a floating part left; 3. **the real `bSettle`, end to end**: 84 real shots (Marble, High lob, Big Marble; three in a row, nothing mended) are fired with `SG.labFire`; the parts the blast itself knocked off (debris record chain depth 0) are the roots, the parts that fell by the support rule have depth 1; `supports.fall(roots)` equals the set the game dropped, 255 parts in all. A negative control (the same comparison with a rule that ignores `needsMin`) disagrees with the game on 534 of 1220 Cottage sets, so the comparison can tell rules apart.

**Not compared:** which parts a blast hits (geometry and blast radius: the real shots hand the game's own roots to both sides); the timing of falls (the game delays later rounds 0.2 s and the windmill's sails 0.5 s; only sets and rounds are compared); the recipe geometry (there is no hand-made Cottage recipe with positions, so the validator's overlap and stand-at-start rules were not run on the converted data); the other Yard buildings, and walls, gates and Keeps, which have their own rules.

### Physics cross-check (optional stretch, `tests/physics-check.js`)

Done, and labelled as what it is: **not the bakery**. The Brick Lab kit (`../brick-lab/sim.js`, Rapier 0.21 SIMD) has only six box shapes, so a 27-piece frame with the same topology (4 posts, 2 beam courses, a plank deck, 12 tiles, a crate) was built and each piece taken out alone, 240 steps, then "moved more than 3 cm-equivalent" compared with the rule's prediction on the matching graph. They agree on exactly which pieces fall for **19 of 27** removals. Where they differ: the rule is **conservative** in two ways (it says the planks and tiles fall when a side beam goes, but friction and wedging kept 12 of them standing in physics), and it **ignores collateral damage** (a falling beam knocks a neighbouring post, which physics shows and the rule cannot). The untouched frame stands still for 3 s. A Big marble (density 20, speed 14) at a post, the front beam or a tile brought down 26 or 27 of 27 pieces: the kit frame is flimsy, nothing was tuned. What this tells us: the rule is a good cheap model of "what hangs on what", a lower bound that is sometimes too pessimistic, and it is a different thing from rigid bodies. Result file: `tests/physics-check.json`.

## Files

| File | What | Kind |
|---|---|---|
| `RECIPE.md` | the schema, every field and range, the rules | doc |
| `whitelist.js` | part kinds (with default sizes), material names, limits | data, Node + browser |
| `validate.js` | `validate(obj)`, `parse(text)` (JSON.parse only), `validatePatch` | pure |
| `supports.js` | the support rule, and the overlap / contact / blast geometry rules | pure |
| `sim.js` | the economy: fixed 0.1 s step, seeded, plain-JSON state, trace log, hash | pure |
| `parts.js` | the builders for each whitelisted kind (normal code, not data) | browser, needs three r128 + `SS` |
| `build.js` | recipe to `THREE.Group`; `replacePart`, `removePart` (falls), `restorePart`, X-ray, stages, pick | browser |
| `app.js`, `index.html` | the page | browser |
| `recipes/*.json` | bakery, shed, cart stall, house | data |
| `tools/gen-recipes.js` | writes the recipes from arithmetic (developer tool) | Node |
| `tests/`, `shots/city-1..8.png` | tests, `lib.js` helper, screenshots (also `city-3b-panel-portrait.png`) | |

Screenshots (all looked at; 1180x820 unless noted): 1 whole bakery; 2 X-ray with the power line; 3 the Inspect panel on a portrait iPad size (834x1194), oven selected; 4 power flow ok / low / cut side by side; 5 damage just after three blasts; 6 repair in progress (X-ray, mice walking to and working on parts); 7 the awning replaced with blue stripes; 8 a hostile recipe refused with its list of problems (the scene behind is unchanged).

## Decisions I made (nobody to ask)

- **Plain-JSON format, one file per building**, `systems` required with `jobs, storage, costs, repair, inspect` so a shed or house is still a recipe; power, production, sales, deliveries and effects are optional blocks.
- **`needsMin`** (not in the brief) is in the format because the real game has it (a ridge needs any one rafter): without it the Cottage cannot be expressed.
- **Sloped pieces** (`rafter`, `roof_tile`, `awning`, `gable`) are kinds drawn inside their box, so a pitched roof stands by the rule and the overlap rule stays a simple box test; no rotation other than `rotY` is in the format.
- **Overlap rule:** box against box with a 0.02 tolerance, exempting a part and the parts it needs, and cables.
- **Stand-at-start rule:** a part with no needs must be on the ground; a part with needs must touch one of them.
- **Workers:** a recipe `role` has `count` mice and a `station_part`; production and sales name the role they depend on; any role in `repair.worker_roles` can be pulled off its station to repair (production then slows, as in life).
- **Repair** charges material when it finishes; **spoilage** is continuous exponential on stock; **a batch takes its inputs when it starts**; an oven that goes mid-batch freezes the batch's progress.
- **Health is two-state** (100% intact or 0% destroyed). Partial damage is not modelled.
- The page picks the **time step by real elapsed time x speed**; the simulation itself is fixed-step and independent of frames (any-size feeding gives the same state).
- Examples are written by a script so the arithmetic is exact; the JSON is the source of truth.

## Failures and limitations (blunt)

| # | What | Detail |
|---|---|---|
| 1 | **No iPad, no touch run, no AR, no sound.** | Everything ran in headless Chromium with software GL and a mouse. Pointer events (one-finger orbit, two-finger pinch, tap) are written for touch but only the mouse path was exercised; pinch is untested. Nothing was heard or tried in AR. |
| 2 | **The toy library does not export its geometry builder.** | `Bld` in `models.js` is private, so `parts.js` re-implements about 60 lines of its atlas-UV and tint logic (copied from the same file). If `models.js` changes its atlas layout, bakery textures could drift. `crate` and `barrel` do reuse `SS.piece`. |
| 3 | **A texture-path shim.** | `models.js` asks for `tex/NAME.jpg` relative to the page, and starts loading at script load. A 6-line script in `index.html` points exactly those requests at `../sofa-siege/tex/`. It is a workaround for not editing the game. |
| 4 | **Overlap is box against box.** | Sloped pieces occupy their whole box, so a gable and tiles needed careful spacing; a chimney's AABB sinks into the roof and is exempt only because it needs the tiles. A recipe can hide an overlap by listing the other part in `needs`. |
| 5 | **The support rule is a graph, not structural engineering.** | The validator checks that a part touches what it needs, not that the thing is strong enough. The physics cross-check agrees on 19 of 27 single removals. |
| 6 | **The floor is a single point of failure.** | Every post needs the floor, so one blast that touches the slab brings down all 57 parts (this happened in the first draft of the e2e story: 54 parts gone). That is the rule working, and a design question for recipes. |
| 7 | **Workers walk in straight lines** through walls; no door path-finding, no collisions between mice. Mice are the library's mice with 7 poses. |
| 8 | **Customers who find nothing leave** (no queue, no loyalty, no price elasticity). Price is fixed by the recipe. |
| 9 | **City supply is a constant** the user can set; there is no grid, no other consumers. |
| 10 | **The validator is deliberately over-strict on text:** any string containing `function`, `eval`, `script` and so on is refused, including innocent words ("Functional", "retrieval"). The 75 hostile cases are mine; it is not a fuzzed or audited security boundary. |
| 11 | **Damage buttons "Smash oven" and "Drop roof tiles" look for the tags `oven` and `roof`**: they are bakery-shaped UI over a generic engine (hidden when a recipe has no such tag). Blast and Remove are generic. |
| 12 | **Frame time** is software GL only (below). |
| 13 | **Determinism is proven in one JS engine (Node 22 V8, and Chromium).** The state hash was not compared across browsers or on iOS. The sim uses only `+ - * /`, `Math.sqrt`, `Math.round` and an integer generator, so it should hold. |
| 14 | **The Cottage "recipe version" is data only** (no geometry), see the support test's not-compared list. |
| 15 | Bugs I made and fixed on the way (so you know where it was fragile): `window` as a banned word refused the part kind "window"; roof tiles overlapped the ridge cap; shutters did not touch their window; textures 404 by relative path; the e2e blast destroyed the whole building through the floor. |

## Frame time (relative; headless Chromium, SwiftShader software GL, no GPU)

Measured by `tests/frametime.js` (frame gap over 5 s, shadows on). Read the ratios, not the milliseconds: a real GPU is far faster, and nobody timed an iPad.

| Scene | Draw calls | Triangles | Frame gap | Frames/s |
|---|---|---|---|---|
| **Bakery**, 57 parts (60 meshes), 1180x820 | 87 | 18.3 k | about 195 ms | 5.1 |
| Bakery, 834x1194 | 87 | 18.3 k | about 225 ms | 4.4 |
| Bakery, X-ray on, 1180x820 | | | about 208 ms | 4.8 |
| sofa-siege Lab: Cottage (same machine, same run) | | | about 245 ms | 4.1 |
| sofa-siege Lab: Castle | | | about 340 ms | 2.9 |

So the bakery costs about what a Yard Cottage costs and about 60% of the Castle. CPU time inside `render()` is 0.4 to 1.2 ms; the rest is the software rasteriser.

## Sofa-siege suites

I did not touch `games/sofa-siege/`. `tests/support-test.js` loads and drives that game's Lab with real shots every run, so the game demonstrably still runs from this branch. I also ran `games/sofa-siege/tests/lab-test.js` with the CDN request routed to the local three.js copy; the result is in "Final checks" at the end of this file.

## Reusable components

| Generic (any building, any city) | Bakery-specific |
|---|---|
| The recipe schema and the validator (`whitelist.js` kinds are a toy-wood kit, but nothing in the checks mentions a bakery) | `recipes/bakery.json` (numbers, positions) and `tools/gen-recipes.js`'s bakery function |
| `supports.js`: the support rule, overlap, stand-at-start, blast hits | The two quick-damage buttons "Smash oven" and "Drop roof tiles" (they look for tags) |
| `sim.js`: roles and stations, production batches, power, storage, deliveries, sales, costs, repairs, tag-driven effects, trace log, replayable state. Item, role and tag names are all read from the recipe | The sign text, the awning stripes in the Replace form |
| `parts.js` builders (22 kinds) and `build.js` (replace, remove, restore, X-ray, stages, pick) | The e2e story's expected numbers |
| `app.js`'s Inspect panel and part card, event log, recipe paste box with validated loading, Copy, Reset, time and damage tools | |

## How a model could safely propose a recipe (Phase 2, not run)

1. **Data in, data out.** The model is asked for one JSON object and nothing else. The harness takes the reply as text, **never evaluates it**, and passes it to `CityValidate.parse(text)` (size limit, nesting limit, `JSON.parse`, then the strict schema). A reply with prose around the JSON is an error, not something to clean up.
2. **Refuse, do not repair, then retry with the errors.** `validate` returns readable errors with JSON paths ("`$.parts[12].needs[0]`: needs 'ghost', which is not a part of this recipe"). The harness may send those lines back once or twice; it never edits the model's JSON itself.
3. **Whitelist is the only vocabulary.** Kinds, materials and every number range are in `whitelist.js` and `validate.js`; a new capability means new reviewed code in `parts.js`, never data that carries code.
4. **A human looks before it is kept.** The page loads a validated recipe into a scene and the Inspect panel; "Copy recipe" is the only way out. Nothing is saved, fetched or posted by the page.
5. **What is still unchecked:** the economy numbers are only range-checked, so a model can propose a bakery that loses money or one that prints it (the sim shows this honestly); the validator checks that parts stand and do not overlap, not that the building looks good or makes sense.

### Draft prompt contract for the town model (Phase 2; do not run)

```
You design ONE miniature building for a toy city, as DATA. Reply with a single JSON object and nothing else:
no prose, no markdown fences, no comments. Your reply is parsed with JSON.parse and checked by a validator;
it is never run. If a rule is broken the whole building is refused and you will be told which path is wrong.

Format: schema "rtk.building", version 1.
{ "schema":"rtk.building","version":1,"id":<a-z0-9_.- , max 32>,"name":<max 40 letters/digits/space .,'!&()/+->,
  "footprint":{"w":0.4-4,"d":0.4-4},
  "parts":[ 1 to 120 of { "id","kind","pos":[x,y,z],"size":[w,h,d] (each 0.01-4) or "scale":0.25-3,"rotY":radians,
            "material","stage":"trim"|"walls"|"frame","needs":[ids that hold it up],"needsMin":whole number (optional),
            "tag":<a-z0-9_ , max 24>,"replaceable":true|false,"variant":0-3 (optional),"label":<sign text, signs only> } ],
  "systems":{ "power":{"demand_kw","supply_kw","wire_part","meter_part"} (optional),
              "jobs":[{"role","count":1-6,"station_part"}],
              "production":{"role","inputs":{item:n},"outputs":{item:n},"batch_seconds":1-3600,"needs_power":bool,"needs_parts":[ids]} (optional),
              "storage":{item:capacity}, "start_stock":{item:n} (optional),
              "deliveries":[{"item","amount","every_seconds":5-3600,"via":"cart","drop_part":id (optional)}] (optional),
              "sales":{"item","price","demand_per_minute","role" (optional),"noise":0-0.5 (optional)} (optional),
              "costs":{"power_per_kwh","wage_per_worker_per_minute","ingredient_prices":{item:price},"repair_material_price"},
              "repair":{"seconds","material_units","walk_speed","worker_roles":[roles],"seconds_by_tag":{tag:seconds} (optional)},
              "effects":{"spoil":[{"tag","items":{item:fraction 0-1}}],"demand":[{"tag","loss":0-1}]} (optional),
              "inspect":{"labels":{part id: short name}} } }

kind is one of: floor, post, beam, panel, door, window, shutter, rafter, roof_tile, ridge, gable, chimney, awning, sign,
crate, sack, oven, counter, wire, meter_box, barrel, shelf.
material is one of: wood, wood_dark, wood_pale, paint_cream, paint_blue, paint_red, tin, brick, canvas, flour, bread, iron,
glass, stone.   item and role names: lowercase letters and underscores, max 24.

Rules (all checked):
- Units are table units; a mouse is 0.3 tall; a door is about 0.9 tall. The plot is centred on 0,0; the ground is y=0; the front faces +z.
- pos is the middle of the part's BASE. A part with no needs must stand on the ground (y about 0). A part with needs must touch one of them.
- Parts must not overlap each other (parts that hang on each other may touch). Stay within the footprint (a little overhang is allowed).
- "needs" says what holds a part up: a beam needs its posts, a wall panel its beam, a roof tile its rafter. When something is destroyed,
  everything that needed it falls. No cycles. Use needsMin when any one of several is enough.
- Every id you mention (needs, station_part, wire_part, meter_part, needs_parts, drop_part, labels) must be a part id.
- No text may contain code, markup, links or the words function, eval, script, constructor, prototype, import.
- Numbers must be finite and inside the ranges above. Keep the economy believable: a business should be able to make money when nothing is broken.
Output only the JSON object.
```

Error feedback line format for a retry (one per problem, at most 8): `$.parts[12].needs[0]: needs 'ghost', which is not a part of this recipe`.

## What I would do next

1. **A hand-authored Cottage recipe with geometry**, so the support-equivalence test also runs the validator's geometry rules on a real game building, and the "recipe version" is a real recipe.
2. **An iPad run**: touch orbit and pinch, the frame time on the real GPU, the 834x1194 and 1180x820 layouts by hand.
3. **A second and third building in one block** with a shared city grid (a supply that several buildings draw on), roads and a cart that actually drives and unloads, so a power cut in one building is felt by its neighbour.
4. **Door path-finding and collisions for the mice**, and partial damage (hit points per kind), so repair and defence become interesting.
5. **A Phase 2 dry run offline**: feed ten model-written recipes through `parse`, measure the share that validates, which rules they break most, and whether the error feedback fixes them in two tries.
6. **Make the physics check real**: generalise the Brick Lab kit to arbitrary boxes so the bakery's own frame can be baked, and compare rule and rigid bodies on the true geometry.
7. **Property-based fuzzing of the validator** (mutate the four recipes at random, assert never throws, never accepts a recipe with an unreachable need or a cycle).
8. **Export the toy library's builder** (a one-line change in `models.js`, with Harry's yes) so `parts.js` stops duplicating its texture logic.

## Final checks

Final run of everything on this branch, headless: validate 171 of 171, sim 72 of 72, support 23 of 23, page 56 of 56, e2e 10 of 10 (332 checks, no failures). The sofa-siege `tests/lab-test.js` (194 checks), run unmodified with only the CDN request for three.js sent to the local r128 file, passed **ALL 194**, and `git status` shows no change under `games/sofa-siege/` (the test rewrites `ARSENAL_REPORT.md`; it came out byte-identical). The other sofa-siege suites were not run: I did not touch that folder.
