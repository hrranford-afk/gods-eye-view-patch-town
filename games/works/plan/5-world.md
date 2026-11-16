# PatchTown Works: the world, its geography and its look

Planner 5 of 5. Lens: the world, geography and visuals.
Written 16 Nov 2026 from the atlas (`games/works/ATLAS.md`), the ledger notes (`LEDGER.md`), the mock-up and the live v1 page
(`mockup.html`, `index.html`), the seven v1 screenshots in `games/works/shots/`, the two scratchpad screenshots
(`shot-big.png`, `shot-phone.png`), the home town's own wall (PatchTown Wall, 16 Nov), and Base Camp's look
(`games/base-camp/HANDOVER.md` build 15 and 16 notes on branch `game/bc-snap`, `shots/51-one-style.png`).
Nothing in the repo was changed.

---

## 0. The short version

PatchTown Works becomes a **toy diorama on a workbench**: two banks of a river joined by one bridge. The near bank is
**the Works** (the cloud studio: foreman, builders, workshops, the yard, the post office, the shop window). The far bank is
**Home Town** (Harry's machines: the Forge, the Dell, the Mill, the residents' homes, the university on its hill). The
harbour at the river mouth is the outside world. The town is drawn in **the same family as the games**: toon shading with
Base Camp's exact three-step gradient, a dark ink outline on every big shape, chunky CC0 toy models baked into
vertex-coloured meshes.

Two laws keep it honest and readable:

1. **Motion is data.** Anything that moves, glows, smokes, rings or changes colour means a real number or a real event.
   Static scenery (trees, fences, grass, the board's edge) may simply be pretty. This keeps the atlas rule ("never
   decoration") without making the town feel dead.
2. **Brightness is proof.** The brightest things on screen are always finished, checked, live work (gold-white). Activity
   is warm amber and quieter. Talk (messages, plans) is thin lines and small bubbles. Alarms are rose and pulse, but
   small. The town's own verdict ("it shows talk better than finished work") is fixed by lighting, not by text.

Every building speaks one shared **state language**: idle, busy, alarm, done, plus off (power cut or asleep) and fog
(never tried on a real device). The parts that show state (window panes, roof beacons, chimney smoke, bunting, flags) are
shared instanced parts, so forty buildings cost a handful of draw calls.

The town **grows on plots**: a new branch claims a plot in its project's district and is built in stages as the branch
lives (pegs, scaffold, walls, roof, flag); merged branches close and become museum entries. New residents arrive by
removal van. The university grows a new wing per training programme. When a ring of plots fills, a new board tile slots
onto the diorama, like a jigsaw piece.

---

## 1. What the town looks like today (v1), and what to keep

### 1.1 What I saw

| Picture | What works | What does not |
|---|---|---|
| `shot-big.png` (mock-up, 1600 x 900) | Warm dusk, glowing windows, readable pill labels, the bridge leading the eye to Home Town, the windmill silhouette | Every building is the same box and pyramid roof: you cannot tell the yard from the library without the label. Roads are flat tan ribbons crossing at odd angles. The yard is a purple tray. Panels cover about 40% of the picture. |
| `shot-phone.png` (400 x 860) | Labels still readable | The scene is almost hidden: the title plate and the diary cover about 75% of the screen. One building and a half are visible. |
| `w3-storm-1805.png` (live v1) | Weather from the tests works; the rainbow reads as "a win"; shop stall with goods; parcels at the post office | The storm clouds are big grey balls that **hide Home Town**; the rainbow slices through the bridge; the labels for Home Town overlap each other ("Harry's town" on top of "Radeon"); the yard lamps read as white balls, not green and red. |
| `w6-harry-town.png` (live v1) | The pond and fox, the residents' heads on the green, the long bridge | Home Town is four identical houses; the residents' heads are pins; the card covers half the town. The cloud sphere sits in the camera's face. |

### 1.2 Measured cost of v1 (headless Chromium, software GL, `?offline&now=2026-11-16T18:05:00Z`)

| Viewport | Draw calls per frame (incl. shadow pass) | Triangles | Meshes in scene | Lights | Shader programs |
|---|---|---|---|---|---|
| 1600 x 900 | 415 | 34,214 | 482 | 14 (12 point lights, 1 sun, 1 sky) | 5 |
| 400 x 860 | 283 | 27,188 | 482 | 14 | 5 |

The triangle count is tiny; the cost is in **draw calls** (one mesh per tree trunk, cone, lamp, parcel, post) and in **12
point lights on MeshStandardMaterial**, which makes every pixel of every lit surface loop over 12 lights. On a phone
that is the difference between smooth and stuttering. The plan below cuts both (section 13).

### 1.3 Keep

- The dusk palette and the CSS tokens (`--night #18233a`, `--lantern #ffb44a`, `--moss #7fd18b`, `--rose #ff7a85`,
  `--gold #ffd76a`, `--mini/--dell/--mill`). They become the world palette too (section 2.4).
- The pill labels (DOM, clickable, readable on a projector).
- Walkers from ledger events, parcels per commit, wagons per open order, yard lamps per suite, the fox, white smoke,
  rainbow after a win, lost property carts and alarm. Every one of these is already "motion is data".
- The three.js r128 page, the CDN versions, the `?offline`, `?now=` and `__works` test hooks, the `HOOKS` slots and the
  `assets/models.json` swap path.

---

## 2. Art direction: "the workbench diorama"

### 2.1 The idea in one paragraph

The town is a model railway layout that someone built on the studio's workbench out of toy kits. It sits on a thick
rounded wooden board (you see the board's edge, with soil and stone layers painted on the cut side, like a cake slice).
Everything on it is a chunky toy: rounded edges, slightly too-big doors and windows, painted wood and soft plastic, no
fine detail. Lit at dusk by a warm lamp. It is the grown-up sibling of Base Camp (whose colonists live at creature scale
among household rubbish): same toon shading, same ink line, same toy honesty, but at town scale and tidier, because its
job is to be read across a room.

### 2.2 Five style rules

1. **Toon, three tones.** Every world material is `MeshToonMaterial` with **Base Camp's exact gradient**: a 3 x 1
   luminance `DataTexture` with bytes `110, 190, 255`, nearest filtering (`bcGrad()` in Base Camp). Same light bands =
   same family.
2. **Ink outline on big shapes.** Inverted-hull outline (Base Camp's `inked()` / `bcInkMat`: a back-face
   `MeshBasicMaterial` child, pushed out along smoothed normals, polygon offset 4/4). Colour **#2b1d2e** (warm plum-black,
   reads as ink on both dusk and day). Thickness about 2.5% of the object's size for buildings, 1.5% for people and
   vehicles, none on small bits (windows, lamps, parcels, sticks, flags), exactly as Base Camp leaves eyes and crops clean.
3. **Silhouette first.** Every building must be recognisable from its outline alone at 60 pixels tall: the power
   station has two chimneys and a battery tower, the hospital a flat roof with a big plus, the fire station a hose tower,
   the town hall a clock tower, the exchange a lattice mast, the Mill its sails, the Dell its long two-storey row of
   windows. No two buildings share a roofline.
4. **Pictograms, not words, in the 3D world.** Signs on buildings are simple painted icons (an envelope, a plus, a flame,
   a key). All words live in the DOM labels and cards, where they are sharp, translatable, accessible and cheap. This also
   keeps ChatGPT concept art free of garbled text.
5. **Brightness is proof.** Only finished, verified work may use the gold-white glow (`#fff1c8` to `#ffd76a`). Busy is
   amber at most 75% strength. Talk is thin. Alarm is rose, pulsing, and small (one beacon, never a whole red building).

### 2.3 Materials

| Material | How | Used on |
|---|---|---|
| World toon (vertex colours) | One shared `MeshToonMaterial({ vertexColors: true, gradientMap })` | All baked models, merged district chunks, characters, vehicles |
| Toon per colour | Cached `MeshToonMaterial` per hex (Base Camp's `M()`) | Few hand-made shapes that change colour (district roofs) |
| Ink | One back-face `MeshBasicMaterial` per ink colour | Hull meshes |
| Glow | `MeshBasicMaterial` (no lighting), colour driven per instance | Window panes, beacons, lamps, star, goods, yard bulbs |
| Glow sprite | Additive `SpriteMaterial` or instanced quads with a soft radial canvas texture (no text) | Halos round lamps and lit windows, replacing point lights |
| Water | Toon, slightly emissive blue, vertex-coloured bands scrolled in the vertex shader via `onBeforeCompile`, foam rings round piers | River, harbour, pond |
| Sky | A big back-face sphere with a vertex-colour gradient (zenith, horizon) that is lerped by time of day | Sky |
| Smoke and cloud | Toon white with alpha, depthWrite off, instanced spheres | Chimney smoke, white smoke, clouds |

### 2.4 Palette (hex)

**World**

| Role | Dusk | Day | Note |
|---|---|---|---|
| Sky zenith | `#18233a` | `#7fb6e6` | Same as the page `--night` |
| Sky horizon | `#3a3f63` | `#cfe6f5` | |
| Board edge (wood) | `#7a5232` | same | Visible cut side of the diorama |
| Soil layer | `#5b3d2a` | same | |
| Grass, Works bank | `#4f7a46` | `#79b35c` | |
| Grass, Home bank | `#5b7d3e` | `#8cbc5a` | Slightly warmer: home |
| Road | `#9a8a6c` | `#c9b88f` | Packed earth, toy-like |
| Paved square | `#b7a88c` | `#ddd0b3` | |
| River | `#2c5378` | `#4f9ad0` | |
| Walls (cream) | `#e9d6b6` | same | Most buildings |
| Ink | `#2b1d2e` | same | |

**District colours** (roofs, flags, builders' hats, label dot rims)

| District | Colour | Hex |
|---|---|---|
| Base Camp | Pine green | `#4f9a6a` |
| Baguettes & Ballistics | Crust orange | `#d9893a` |
| Vigil | Lamp violet | `#7a62b8` |
| Works (this town) | Slate blue | `#4f7fae` |
| New project (unassigned) | Clay | `#b26a5a` |
| Civic buildings | Terracotta roofs | `#a8553e` |

**Home machines** (from the wall, unchanged): Mini/Forge `#6aa6e8`, Dell `#6fbf8f`, Mill `#e0a15a`.

**State colours** (same everywhere, same as the page): busy amber `#ffb44a`, pass/live moss `#7fd18b`, fail rose
`#ff7a85`, flaky/waiting honey `#f2b660`, silent/asleep slate `#5d6f8c`, proof gold-white `#fff1c8` to `#ffd76a`.

Colour-blind safety: every state also has a **shape** (section 6.2): a pass lamp is round, a fail lamp is a cross-shaped
beacon, flaky is a half-moon, asleep has a nightcap. Never colour alone.

### 2.5 Lighting rig

- One hemisphere light (sky colour over ground colour) and one directional "lamp" (the sun or moon) with one shadow map.
- **No point lights for lamps and windows.** Each glow is an emissive pane plus a soft additive halo sprite on the ground
  or wall. At most four real point lights on desktop, used only for moments that move: the ambulance, the fire engine,
  the lighthouse beam, a win flare. Phones get none.
- Light comes from the upper left of the default camera, so shadows fall towards the viewer's right and the river side
  stays bright.

### 2.6 Camera and composition

- Perspective camera with a **narrow lens (FOV 28 to 32)**, pitched 35 to 40 degrees down: it flattens the view towards
  the classic diorama or isometric look without needing an orthographic camera, and keeps buildings upright.
- Default "master shot": looking north over the Works bank, across the river, to Home Town and the university hill
  behind. The bridge sits on the vertical centre line, the shop window sits front and centre (nearest to the viewer,
  brightest), Home Town fills the top third.
- Orbit limited to a 140-degree arc around the south (the town's "front"), pitch 25 to 60 degrees, so the board edge is
  never seen from behind and labels never face away.
- Panels are slimmer than today (see 12.3), so the master shot is at least 70% of the projector picture.

---

## 3. Geography: the map

### 3.1 The big map

North is up. The default camera stands south of the board looking north. One map unit is roughly one toy metre;
the Works square is at (0, 0). The board is about 64 units wide (west to east) and 70 units deep (south to north).

```
                                      N
   +------------------------------------------------------------------------------------------+
   |  . . . . . . . . . . . . . . . far fog wall (soft, decorative depth) . . . . . . . . . . . |
   |                                                                                          |
   |     ^^^ UNIVERSITY HILL ^^^                                    [WATER TOWER]             |
   |    [Exam Hall]  (Clock Tower)  [Lecture Hall]                   reservoir = Mini disk   |
   |      [Greenhouse wing]   (Quad)   [Graduation lawn]                   |                  |
   |          \____ Campus Lane ____/                                      |                  |
   |                    |                       FORGE YARD            .----'                  |
   |  [THE MILL]        |                 [Mini smithy]=[Radeon furnace]  (car park: 0-n)    |
   |   windmill  (tiny experts' burrows)        sparks, bellows                               |
   |    (car park)      |                                                                     |
   |        \     VILLAGE GREEN (who is speaking: residents stand here)                       |
   |   (pond + FOX)   o  o  o  o  o  o                   RESIDENT ROW  >>>>>>>>>>>>>>>>      |
   |                                          cottage  cottage  house  villa  MANOR  (plots)  |
   |  [THE DELL boarding house: 8 rooms] ==Dell Lane== jam of cars >>> (queue clock)          |
   |                                                                                          |
   |  ===o=========== NIGHT RAIL LOOP (the nightly batch) ============o====[NIGHT HALT stn]    |
   |       [signal box]                   [Harry's porch: lantern + the stamp]                 |
   |                         HOME TOWN  (Harry's machines)                                    |
   |                              [CUSTOMS HOUSE]  (privacy check)                            |
   | ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~||~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ |
   | ~ ~ ~  R I V E R  (flows west to east) ~  || THE BRIDGE (one door)  ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ \   |
   | ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~||~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ \ ~~ |
   |   wagons wait here ->    [TOLL BOOTH]   (Harry's yes: barrier)        [HARBOUR]  SEA  ~  |
   |                          [Bridge depot: wagon yard]             quays, ships, [Harbour  ~ |
   |  [POWER STATION]  [SORTING OFFICE]  |  [TELEPHONE EXCHANGE]          master's licence    ~ |
   |   2 chimneys +     (merges)         |   lattice mast + wires         board] (LIGHTHOUSE) ~ |
   |   battery tower    [POST OFFICE]    |                                                 ~  |
   |                     (commits)    NORTH ROAD                                              |
   |   ...........   BASE CAMP QUARTER   |      WORKS QUARTER  ...........                     |
   |   . plots   .  (pine-green roofs)   |     (slate-blue roofs)    . plots .                 |
   |   ...........                       |                           ...........               |
   |   [ARCHIVE] [LIBRARY]   +-----------+-----------+   [INSPECTION YARD]  [HOSPITAL]+amb    |
   |                         |   TOWN SQUARE         |    lamps per suite                     |
   |   [COURTHOUSE]          |  [FOREMAN'S HUT]      |   [LOST PROPERTY]   [FIRE STATION]     |
   |                         |  [TOWN HALL] clock    |    carts, alarm      hose tower         |
   |   [BANK] vault          |  noticeboard, crier   |                                        |
   |                         +-----------+-----------+                                        |
   |   ...........     VIGIL QUARTER     |     B&B QUARTER       ...........                  |
   |   . plots   .   (violet roofs)      |   (orange roofs)      . plots .                    |
   |   ...........                   HIGH STREET                ...........                   |
   |        [MUSEUM]           [MARKET SQUARE]  stalls  [THEATRE / ARCADE] marquee            |
   |                       [ S H O P   W I N D O W ]  facing the camera, the brightest thing   |
   |                        goods stall, star, bunting                                        |
   |   new-project plots (clay) ...................................... new-project plots      |
   |__________________________________________________________________________________________|
    \__________ the board's cut edge: wood, soil and stone layers (you see this side) ________/
                                      S  (camera)
```

### 3.2 Why this layout

- **Work flows towards the viewer.** Orders arrive from the north (bridge), the foreman sits in the middle, builders fan
  out into the districts, everything converges on the yard (east of the square) and the post office (north), and finished
  things end at the shop window at the very front, facing the camera. The eye travels the same path as the work.
- **One door.** The only crossing is the bridge. The toll booth (Harry's yes) is on the Works end, the customs house
  (privacy) on the Home end, so everything that crosses passes both. The night railway stays inside Home Town on purpose:
  its results are unloaded at the bridge depot and cross by wagon, so the "one door" stays literally true.
- **The harbour is the outside world.** It opens to the sea (the board's east edge) and sits on the Works bank, because
  downloads arrive in the cloud first. Anything a download brings for Harry's machines must still cross the toll bridge.
- **Districts are wedges round the square**, so a busy project visibly crowds its quarter and the foreman stays in the
  middle of everything.
- **Home Town sits higher on the screen**, behind the river, like the far bank of a real model layout. It is smaller in
  pixels but has strong silhouettes (windmill, furnace chimney, water tower, clock tower) so it reads from far away.

### 3.3 Coordinates (for the builder)

| Place | Centre (x, z) | Footprint | Notes |
|---|---|---|---|
| Town square | (0, 0) | 9 x 9 | Paved; hut at (0, 0.5), town hall at (0, -3.2) facing south |
| Base Camp quarter | (-11, -4) | wedge 300 to 345 deg, radius 6 to 15 | Largest wedge (most branches) |
| Works quarter | (11, -4) | wedge 15 to 60 deg | |
| Vigil quarter | (-11, 7) | wedge 200 to 245 deg | |
| B&B quarter | (11, 7) | wedge 115 to 160 deg | |
| High Street, market, shop | (0, 10) to (0, 15) | 6 wide | Shop window at (0, 14.5), facing +z (camera) |
| Inspection yard | (8, 0) | 5 x 4 | East of the square |
| Post office, sorting office | (-3, -9), (-7, -9) | 2.5 x 2 each | North road, by the bridge depot |
| Telephone exchange | (5, -9.5) | 2 x 2 + mast | |
| Power station | (-14, -10) | 4 x 3 | West riverbank, pylons over the river to Home Town |
| Toll booth, bridge depot | (0, -12) | 3 x 2 | |
| River | z = -13 to -19 | full width | Flows west to east into the sea |
| Bridge | (0, -16) | 2 wide x 7 long | Stone arches, toy-style |
| Customs house | (0, -20.5) | 2.5 x 2 | Home end of the bridge |
| Harbour | (24, -14) | 10 x 8 | Quays, lighthouse at (30, -20) |
| Home Town centre (village green) | (0, -30) | radius 14 | |
| Forge (Mini + Radeon) | (8, -32) | 5 x 3 | Water tower at (14, -36) |
| The Dell | (-9, -25) | 6 x 2.5, two storeys | Dell Lane runs east from it |
| The Mill | (-14, -33) | windmill + burrows | Pond and fox at (-9, -30) |
| Resident Row | (4 to 22, -26) | one plot per resident, 3 x 3 | Grows east |
| Night rail loop | oval round (0, -28), 30 x 12 | | Night Halt station at (12, -22) |
| University hill | (-6, -42) | 16 x 8, raised 1.5 to 3 units | Campus grows west and east |

The current page has Home Town at z = -19 and the bridge at -12.4; the plan moves Home Town back to make room for the
river, customs and the rail loop. Existing positions in `B` move with it; nothing in the data changes.

### 3.4 The river

- A real channel cut into the board: banks drop 0.4 units to the water, with stone edging on the Works side (built,
  orderly) and reeds and grass on the Home side (homely).
- Water is a scrolling toon surface with three bands of blue and white foam rings round the bridge piers and the harbour
  posts. It flows east, towards the sea: "work leaves home, crosses, and the outside world is downstream".
- Upstream (west) the river comes out of a little waterfall from the board's west edge, under the power station's
  pylons.
- **Data:** the river itself carries nothing (static scenery). Things *on* it do: ships (downloads) in the harbour, and,
  optionally later, little paper boats drifting downstream for every message between AIs that crossed home (see 10).

### 3.5 Districts

- Each project is a wedge with a **gate arch** where its road leaves the square: two posts, a crossbar, the district's
  colour, and one pictogram (Base Camp: a tent; B&B: a baguette crossed with a cannon; Vigil: a lantern; Works: a tiny
  house). The arch is the district's name tag in the world; the DOM label says the name.
- Workshops in a district have roofs in the district colour; builders working there wear hats in that colour.
- A district's ground is **raised by its hills value** (3.6) in gentle terraces, so harder projects literally sit on
  harder ground.
- Branch names choose the district: `game/bc-*` -> Base Camp, `game/bb-*` -> B&B, `game/vigil*` -> Vigil,
  `game/micro-precinct` -> Works. Anything else -> new-project plots along the front edge (clay roofs) until the
  foreman names it.

### 3.6 Hills: how hard a part is

- **Data:** per project, over the last 14 days, `fix` + `fail` ledger lines plus commits whose message says fix,
  revert, rework or flaky (GitHub). Normalise against the median project.
- **Drawn as:** terraced ground under that district, 0 to 3 steps, each step 0.35 units high with a stone retaining wall
  (toy terraces). The road climbs with a little ramp. A district that becomes easy sinks back one step per quiet week, so
  hills change slowly and are worth reading.
- **On Home Town:** the same idea for each machine: rework on the Dell (retries, empties) raises the Dell's yard.
- The far backdrop hills (behind the university) are scenery only.

### 3.7 Fog: never tried on a real device

- **Data:** the "not proven" lists in each project's `HANDOVER.md` (and `?dev` field reports that later prove things).
- **Drawn as:** a low, soft fog bank sitting **on top of the specific workshop or shop item** that is unproven: 6 to 12
  big, pale, slightly blue instanced puff-billboards that drift slowly and hug the ground. It thins as items are proven
  (one puff removed per proven item). A building inside fog loses its ink outline (outline alpha 0.3) so it literally
  looks unsure.
- Fog never covers the whole town; the scene-wide `THREE.Fog` is only for depth (far edge softening) and is subtle.
- When a real-device win arrives (`win` from Harry's real device), the fog over that thing **lifts upwards and dissolves**
  over 4 seconds, and that is the moment the rainbow starts.

### 3.8 Roads

- **Packed-earth roads** (6 to 12 units long modular pieces, Kenney City Kit Roads style but in toon earth colours), with
  kerbs only round the square and High Street.
- Roads are built from a small graph (nodes: square, gates, yard, post, bridge depot, shop, harbour, every plot door).
  Walkers and vehicles follow the graph, never cross grass, and keep left.
- **Road works** (atlas: a broken build or a branch mid-change): striped barriers, an orange cone and a little digger
  on the road segment from that workshop to the yard. Data: failing tests on that branch. Nothing may drive through road
  works: walkers from that workshop take the long way round (visible detour). Road works clear when the branch's tests
  pass.
- **Street lights** are the page health checks (11.x): each streetlamp is wired to one check. Dark street = something
  down.

### 3.9 The board edge and the backdrop

- The board's cut edge is visible at the front and sides: wood plank with painted soil and stone layers, a tiny brass
  plate (blank, no text) at the front centre. It frames the projector picture like a stage.
- Behind Home Town: soft painted backdrop hills in two layers and a gentle fog wall, so the world does not end in a hard
  line. Sea to the east fades to sky.
- When the town grows, extra board tiles slot onto the edges (section 4.5), with a visible seam that heals after a day
  (the seam is the "new ground" signal).

---

## 4. How the world grows

### 4.1 Plots

Every place that can appear is a **plot**: a fixed footprint on the map with a door point on the road graph. The town
never moves an existing building to make room; it only fills plots and adds board tiles. This keeps the projector
audience's mental map stable for months.

| Plot type | Where | Capacity (board v1) | Next ring (tile 2) | Next ring (tile 3) |
|---|---|---|---|---|
| Workshop plots | 4 district wedges, 2 rings | 6 per district = 24 | +4 per district | +4 per district |
| New-project plots | front edge | 6 | 6 | 6 |
| Resident plots | Resident Row | 16 | +16 (Row turns north) | +16 (a second row: "the Avenue") |
| Tiny expert burrows | round the Mill | 24 | +24 | |
| University wings | campus hill | 4 | +4 (west) | +4 (east) |
| Civic buildings | fixed sites | all atlas buildings | | |

### 4.2 A workshop's life (a branch's life)

| Stage | Data | What you see |
|---|---|---|
| 0. Claimed | Branch created (GitHub event) or `hire` with a new branch ref | Four survey pegs with string and a tiny flag in the district colour on the next free plot; the foreman walks there and back |
| 1. Foundations | First `start` or first commit | Builder arrives, a stone slab appears, a crate of tools |
| 2. Walls | 3 or more commits | Scaffolding with walls inside; hammering animation while busy |
| 3. Roof | First passing test for that branch | Roof lowered by a little crane; ink outline complete |
| 4. Open | First `deploy` from that branch | A flag in the district colour on the ridge; windows full; door sign gets the project pictogram |
| 5. Quiet | No events for 2 days | Shutters half closed, flag furled, windows idle |
| 6. Closed | Branch merged or deleted | "Closed" boards across the door, flag lowered and carried to the museum by a walker; after 7 days the building is removed and the plot becomes a little park bench with a plaque (pictogram only) for a further 7 days, then the plot is free |

Stages never go backwards except roof -> scaffold when a branch has been red for a whole day (a real teardown). The
museum keeps a miniature of every closed workshop (section 6, museum).

### 4.3 Residents' homes (Home Town)

| Event | Data | What you see |
|---|---|---|
| New model on the roster | town roster (run reports) | A removal van drives from the bridge to the next free plot on Resident Row; the house rises in 3 seconds (pop-up book style), the resident walks in |
| Bigger model replaces a smaller one | roster | House swaps type (cottage -> manor) with a scaffold day |
| Model removed from the roster | roster | "For sale" pictogram board, windows dark; after 7 days the plot is empty |
| Moved machine (e.g. Radeon Clerk "moved, not heard") | wall | A removal van stands outside with boxes; house window has a question-mark pictogram until it is heard |

### 4.4 The university campus

The university starts as a single **Lecture Hall** (the trainer) and the **Exam Hall** (evals). Each new training programme
(a new tiny expert or a tuning run) adds a **wing** or a greenhouse to the campus on the hill: the greenhouse holds the
students growing (training in progress: plants growing in pots, height = training progress). The quad gets a new bench
for each graduate; a graduate walks down Campus Lane carrying a rolled diploma to their house or burrow.

### 4.5 Board tiles

- The board is made of large rounded tiles: v1 board = centre tile (Works), north tile (river + Home Town), east tile
  (harbour), and later the hill tile (university).
- When any plot ring is 80% full, the next tile is "delivered": it slides in from the side of the table on a little
  dolly over 5 seconds (an event worth watching on the projector), the seam shows for a day.
- Maximum planned: 9 tiles (3 x 3), about 190 x 210 units. Past that the town should split into a second view (an
  "archive town" of old projects) rather than shrink everything.

### 4.6 Growth stages, as pictures

```
 Week 1 (v1)                         Month 1                               Month 6
 +-----------+                       +-----------+-----+                   +-----+-----------+-----+
 | Home: 4   |                       | Home: Row | Uni |                   | Uni | Home + 30 | Uni |
 | machines  |                       | 8 houses  | 1+1 |                   | W   | residents | E   |
 +~~bridge~~~+                       +~~bridge~~~+~~~~~+~harbour            +~~~~~+~~bridge~~~+~~~~~+~harbour
 | square +  |                       | square +  |harb.|                   |power| square +  |harb.|
 | 4 wkshops |                       | 14 wkshops|     |                   |  +  | 30 wkshops|     |
 +-----------+                       +-----------+-----+                   +-----+-----------+-----+
```

---

## 5. The shared state language

Every building and sign uses the same six states. The parts that show the state are shared, instanced parts (section 13).

| State | Windows | Roof beacon | Chimney | Door | Flags and trim | Sound (if on) | Rule |
|---|---|---|---|---|---|---|---|
| **Idle** | Amber at 30% | Off | None | Closed | Plain | None | No events for 45 min |
| **Busy** | Amber at 75%, a moving silhouette inside | Off | Grey smoke, rate = events per hour | Open | The building's own busy prop moves (hammer, sails, belts) | Soft work sounds, building-specific | An event at this place in the last 45 min |
| **Alarm** | Flicker | Rose beacon, a cross-shaped lamp, slow pulse (1 Hz) | Stops | Open | Small rose pennant on the sign | One alarm stinger, then silent | A `fail` here in the last 6 h, or the building's own alarm rule |
| **Done** | Gold-white at 100% for 2 h, then fades to idle over 2 h | Off | None | Open | Bunting and a small gold star over the roof | One bright chime | `deploy`, `win`, `result` or a passing test at this place |
| **Off** | Black | Off | None | Closed | A tiny nightcap or a dark power pictogram on the sign | Power-down sound once | Power cut, machine asleep or restarted |
| **Fog** | As underlying state, desaturated 40% | as underlying | as underlying | as underlying | Ink outline faded | None | Building or item on a "not proven" list |

**Priority when two apply:** off > alarm > done > busy > idle; fog is an overlay on any of them.
**White smoke** (rebuilt something that already existed) replaces grey smoke on that building's chimney for 24 h.

### 5.1 The shared state parts

| Part | Shape | Instanced? | Count budget |
|---|---|---|---|
| Window pane | Rounded quad with a cross mullion | One InstancedMesh for the whole town, colour per instance | 600 |
| Window halo | Soft additive quad on the wall beneath | One InstancedMesh | 600 |
| Roof beacon | Cross-shaped lamp on a short post (rose) | One InstancedMesh | 60 |
| Gold star | Low-poly star, slowly spinning | One InstancedMesh | 20 |
| Bunting | A string of 7 triangles between two points | One InstancedMesh of triangles | 400 triangles |
| Chimney smoke puff | Toon sphere, alpha | One InstancedMesh, colour per instance (grey or white) | 300 |
| Fog puff | Big soft billboard | One InstancedMesh | 200 |
| District flag | Pennant on a pole, vertex-wave in the shader | One InstancedMesh | 60 |
| Pictogram sign | Hanging board with an icon from an atlas texture | One InstancedMesh with a texture atlas offset per instance | 80 |
| Nightcap / asleep marker | Little cap on the ridge | One InstancedMesh | 60 |

---

## 6. The buildings, one by one

Each entry: **where**, **what it really is** (atlas), **silhouette and signature prop**, **states**, **data**, **phase**
(v1 to v4 in the atlas's build order). "Idle, busy, alarm, done, off, fog" follow section 5 unless the entry says otherwise.
Pictograms are listed in brackets.

### 6.1 The Works bank: the core (v1, restyled)

**Foreman's hut** (square, centre). The main AI session.
- Silhouette: a round-ish timber lodge with a big porch, a lantern on a hook, a tall stone chimney, a **hat rack** by the
  door and a big table under the porch roof with rolled plans. [pictogram: a hard hat]
- Hat rack: one hat per builder hired today (district colours). When a builder finishes, it walks back and hangs its
  hat (it forgets; the hat stays as the count).
- Busy: the foreman paces the porch, unrolls plans; smoke. Alarm: the foreman stops still with a rose beacon (the main
  session stopped or hit a limit). Done: the plan table glows when the day's orders are all closed. Off: power cut on the
  Works bank (usage limit): lantern out, foreman sits with a nightcap.
- Data: ledger `who: foreman`, `hire`, session status.

**Workshops** (district plots). One per active branch.
- Silhouette: a long low workshop with a big sliding barn door, a skylight row, a short tower crane over half of it while
  under construction, a workbench out front. Roof in district colour; pictogram of the project on the door sign.
- Busy: the builder hammers at the bench, sparks of sawdust; skylights glow. Alarm: road works on its road (failing
  tests) plus beacon. Done: flag up, bunting. Quiet and closed as in 4.2.
- Data: branches, commits, `start`, `step`, `end`, tests per branch.

**Library** (west of the square). Research, notes, plans, reviews.
- Silhouette: a narrow tall building with a round reading-room dome and a book-stack chimney (a chimney made of books).
  [an open book]
- Busy: a researcher at a lectern under the dome; pages flutter out of the dome's top like birds. Done: a new
  "volume" (book) slides onto the outside shelf (one per research commit or review today). Alarm: rarely used (a review
  that found blockers: the dome lamp turns rose).
- Data: `where: library` ledger lines, review findings sorted into do now, later, no (three shelves: green, amber,
  slate).

**Inspection yard** (east of the square). The test suites.
- Silhouette: a fenced yard with a canopy roof on one side, a raised inspector's box with a striped barrier, and **one
  lamp post per suite** in rows. The posts carry real lamp heads: round green (pass), cross-shaped rose (fail), half-moon
  honey (flaky). [a magnifying glass]
- Busy: a cart (a build) rolls through the barrier, the inspector leans out with a clipboard, lamps blink in sequence.
- Alarm: any fail: the barrier stays down and the cart waits; the yard canopy beacon pulses. Done: all green: a short
  green ripple through the lamps and a whistle.
- Data: `kind: test` with `suite`, `status`, `n`. The count `43/43` sits on the DOM label, not in the world.

**Post office** (north road). GitHub: every saved change.
- Silhouette: a red-brick corner building with a big clock-less arched door, a red pillar box out front, a little
  parcel chute on the side. [an envelope]
- Parcels: one toy parcel per commit today, stacked on the loading dock in neat rows of 5 (instanced). Commits on main
  or deployed are wrapped gold-ribboned.
- Busy: the postmaster stamps parcels; the chute slides one down. Done: a postal van leaves for the shop window when
  something deploys.
- Data: commits, pushes.

**Shop window** (front, High Street). What is live on GitHub Pages.
- Silhouette: a wide shopfront with a deep striped awning, a huge display window, and **a goods stall** outside. The
  display window holds little toy miniatures of the live games (a tent for Base Camp, a baguette-cannon for B&B, a lantern
  for Vigil, a mini-town for Works). [a shop awning]
- Done (the normal "good" state): the window is the brightest thing in town, gold-white. Each thing that went live today
  is a glowing box on the stall; a win is a gold box and a **gold star over the shop**.
- Back room (preview builds, `base-camp-next`): a small lit back window on the side, amber. "In the back room" becomes
  literal.
- Alarm: the live page fails a health check: the display window goes dark and the street light in front fails.
- Data: deploys, Pages history, wins.

**Bridge** (centre north). The one door: orders out, results back.
- Silhouette: three stone arches, toy-chunky, with lamp posts. Wagons queue on the Works end at the toll booth.
- Wagons: one covered wagon per open order, its canvas in the order's colour band; rolls across when sent; rolls back
  loaded with crates when the `result` comes.
- Alarm: an order out for longer than its expected time: the wagon stops mid-bridge and its horse sits down.
- Data: ledger `order`, `result`.

**Lost property office** (east, behind the yard). Work that started and never ended.
- Silhouette: a crooked little shop with a bay window full of odd items (an umbrella, a single boot, a teddy) and a
  hand-cart rack out front. A tall thin roof with a big alarm bell lamp on top. [a question mark on a tag]
- Abandoned carts: one per lost `start` (no `end`, no life for 2 hours), each with the builder's district-coloured hat
  left on it.
- Alarm: the bell lamp swings and glows rose; a single bell stinger. Done: when the foreman picks a cart up ("picked up
  from lost property"), a tow truck tows it back to its workshop.
- Data: `start` without `end` (the existing `lostProperty()` rule). This is the building that would have caught the
  15 Nov overnight stop, so it gets a strong silhouette and a guaranteed label when alarmed.

### 6.2 Infrastructure (v2)

**Power station** (west riverbank). Compute: cloud session time and home machine time.
- Silhouette: a stout brick hall with **two chimneys** (one for cloud time, one for home time), a row of transformers
  out front, and a tall **battery gauge tower**: a glass column with ten stacked cells that light from the bottom (budget
  left today). Pylons carry a line across the river to Home Town. [a lightning bolt]
- Busy: both chimneys smoke in proportion to session minutes this hour; the turbine hall's windows hum.
- Battery gauge: cells lit = share of today's budget left. Below 2 cells the top cell blinks honey. The reset time is on
  the DOM label.
- **Power cut** (usage limit hit, or a restart): the power station's lights die with a spark; then the whole Works bank's
  window panes and street lights switch off district by district over 2 seconds (a rolling blackout), builders freeze
  with a "zZ" bubble, smoke stops. Only the lost property office and the hospital keep tiny emergency lamps (their own
  generator: battery-backed). When power returns, a repair truck drives from the power station to the hut and the lights
  come back in the same order.
- Home machine restart: only that machine's building on the Home bank goes off, with its own pylon spark.
- Data: run reports, session status, ledger `fail` and restarts, limits and reset times.

**Reservoir / water tower** (Home Town, by the Forge). Disk space on the Mini.
- Silhouette: a classic water tower on four legs with a round tank, a gauge stripe painted up the side, and a **red
  float line** at the floor (30 GB). The water level is the real free space (35 GB against 40 GB tank = 87% full looking).
- Alarm: level at or under the floor line: the tank sweats drops, beacon on the roof, and the Forge's conveyor stops
  accepting new crates (the town refuses jobs).
- Data: the town's sky numbers (`WALL.chips`).

**Car parks** (Home Town, one per machine). Jobs waiting to start.
- Silhouette: a small fenced gravel car park beside each machine, painted bays, a ticket barrier.
- Cars: one toy car per queued job, engines off (no exhaust), parked in bays in arrival order. Overflow parks on the
  verge. The colour of each car = where the job came from (district colour for Works orders, Home green for home's own
  jobs).
- Data: queue length from run reports.

**Traffic jam** (Dell Lane, and any road into a busy machine). A queue in motion.
- Silhouette: cars bumper to bumper on Dell Lane, nose to tail from the Dell's door back towards the green, with tiny
  honk bubbles. At the jam's head stands a **lollipop-sign keeper** turning the sign from stop to go each time the Dell
  takes the next job.
- A queue clock on a post at the tail shows the longest wait (48 min for one answer): the clock hand is the wait, the
  DOM label says the number.
- Data: queue waits from run reports.

**Railway: the night train** (Home Town loop). The nightly batch.
- Silhouette: an oval loop of narrow-gauge track round the village green with **Night Halt station** (a little
  platform with a canopy, a **timetable board** with pictogram slots, a station clock) and a **signal box**.
- The train: a small steam engine and one wagon per job in tonight's batch, each wagon's load matching the job type
  (picture crates for pictures, barrels for trainings, sacks for idea sorting).
- Departs at the scheduled batch time with a whistle; runs its loop, stopping at each machine to unload; returns to the
  station. **On time** (batch done by its expected time): a green signal and a puff of gold steam. **Late**: the signal
  stays honey and the station clock face turns honey. **Derailed** (batch failed): a wagon tips onto its side next to the
  track, beacon on the signal box.
- The night train's results are carried from Night Halt to the bridge depot by wagon in the morning (the one door).
- Data: timetable, run reports.

**Roads and road works**: see 3.8.

**Sorting office** (north road, next to the post office). Merging branches.
- Silhouette: a wide shed with a sawtooth factory roof and **conveyor belts** coming out of two side doors that join at a
  big sorting drum on the front.
- Busy: parcels ride the belts from two branches into the drum and out as one stack (a merge). **Jam**: a merge conflict:
  parcels pile up at the drum, a red tag on the pile, a worker with a crowbar sits on top scratching their head. Cleared
  when the merge commit lands.
- Data: git merges, merge conflicts (merge commits, conflict markers noted by builders in the ledger).

**Telephone exchange** (north road, east). Messages between AIs.
- Silhouette: a narrow tall building with a **lattice radio mast** and telephone poles spreading out to every workshop and
  the hut, wires sagging between poles. Inside a switchboard operator plugs cables. [a telephone handset]
- Messages: a glowing bead runs along the wire from sender to receiver (foreman -> builder brief, builder -> foreman
  report). Bead colour: amber for a brief, gold-white for a report with verified results, slate for a "no answer".
  Beads are thin and small: talk stays quieter than proof.
- Busy: the mast's top lamp blinks with traffic. Alarm: a brief that got no reply in its time: the wire to that workshop
  droops and the bead stops halfway.
- Data: message log (foreman to builders, SubagentStop, reports).

**Street lights** (along every road). Health checks.
- Each lamp post is one check (base-camp page loads, AR ready, check page reachable, Works page loads, the raw ledger is
  reachable...). Lit warm = passing. **Dark** = down. A dark lamp has a little ladder against it (someone will fix it).
- Lamps are grouped: all the checks for one game line the road from its district gate to the shop window, so "the road to
  Base Camp is dark" means Base Camp's page is down.
- Data: the page checks (and `check.html` runs).

### 6.3 Weather and sky (v2): see section 7.

### 6.4 Civic buildings

**Town hall** (square, north side, facing the hut). Decisions waiting on Harry.
- Silhouette: a two-storey civic building with steps, columns in toy style, a **clock tower** with a bell, and a big
  **motions board** on an easel on the steps. [a ballot box]
- Motions: one scroll pinned on the board per open question. Scrolls **yellow and curl with age** (fresh: white; a day:
  cream; three days: yellow and curling; a week: brown with a dust cloud). The oldest one gets a little ribbon.
- Busy: when a new question is posted, the clock bell rings once and a clerk pins it. Done: when Harry decides, the scroll
  is stamped (the big rubber stamp comes down from the sky: Harry's hand, no person shown) and carried to the archive.
- Alarm: a decision older than 3 days that is blocking a builder: the bell rings slowly every 10 minutes (sound) and the
  clock face glows honey.
- Data: open questions.

**Noticeboard** (square, by the hut). Orders and requests.
- A wide wooden board on two legs with a small roof: one paper per order, colour band by order type. A tick stamp when
  done. [a pushpin]
- Data: orders folder.

**Town crier** (square, a little podium). Big news.
- A crier figure with a bell on a box. When a `win` or a `fail` of note arrives, the crier rings the bell and a big speech
  bubble with an icon (star, broken cog) floats up; on the projector with sound on, the crier speaks the line (v4, browser
  speech).
- Data: ledger wins and fails.

**Courthouse** (west of the square). Rules checks.
- Silhouette: a solid stone building with **four columns** on the front, a pediment with a scales pictogram. Each column
  is one rule: nobody dies, no brands, licences, privacy. A column **lights green from the base up** when its checks pass,
  and **cracks** (a jagged dark line, rose glow) when one fails.
- Done: all four green: a small gavel tap sound.
- Data: test checks and the licence list.

**Hospital** (east, by the yard). Bugs being fixed.
- Silhouette: a white flat-roofed building with a big plus pictogram on the roof, a ward wing with **beds visible through
  long windows** (one bed per open fix), and an **ambulance bay**. [a plus]
- Beds: occupied (a little patient with a bandage, the bug) while a fix is open; the bed empties when the fix is
  committed and tested. A bug "in hospital" longer than a day gets a get-well card pictogram (age).
- **Ambulance**: an urgent fix (a fail on something live): the ambulance races from the hospital to that workshop with a
  rose-and-white flashing light (one of the few real point lights), then back.
- Data: ledger `fix`, fails on live things.

**Fire station** (east). Rolling back to a kept build.
- Silhouette: a red-doored station with a **hose-drying tower**, two bays, and a fire engine. A rack of numbered helmets
  is the list of kept builds (b26, b27, b28...): one helmet per kept build. [a flame]
- Rollback: the fire engine drives to the shop window, firefighters swap the display miniature for the kept build's
  miniature, and return. Done: bell ring. Alarm only if a rollback itself fails.
- Data: Pages backups and rollback deploys.

**Museum** (front left, near the market). Every build ever shipped.
- Silhouette: a domed gallery with a wide stair and banners in all district colours. Inside (visible on its card and
  through tall windows): **plinths**, one per shipped build, each with that build's miniature. The museum's front lawn
  gets a new **little statue** for each win. Closed workshops' flags hang in the entrance hall.
- Busy: a visitor walks in when a new build is added. Done: a spotlight on the newest plinth.
- Data: Pages history, wins, closed branches.

**Archive** (west, behind the library). Git history and notes.
- Silhouette: a low vault with a heavy round door and tall shelves of drawers visible inside; **a stack of drawers grows
  taller** with the history (log scale). A small mailbox slot for notes (START_HERE, HANDOVER).
- Busy: an archivist files a drawer on each commit to notes. Done: a drawer glows when a builder reads the notes before
  starting (if the ledger records it) - memory that survives restarts.
- Data: git history.

**Market square** (front centre, before the shop). Ideas swapped.
- Silhouette: an open square with **striped stalls**. Each stall belongs to a source (a resident, a tiny expert, a
  visitor AI review, Harry). Idea crates sit on the stalls; crates that **made it into a game** are carried by a walker to
  the workshop and stamped with the giver's colour (credit). The busiest stall has a queue.
- Data: order results, `by` credits.

**Theatre / arcade** (front right). The games people play.
- Silhouette: a little theatre with a **marquee of bulbs** and a curtain. The marquee bulbs light **in proportion to plays**
  (counted, never tracked). Each game has its own marquee panel.
- Data: play counts only.

**Bank** (west). Cost.
- Silhouette: a squat building with a big round vault door left ajar and **coin stacks** visible: one stack per feature,
  height = cost. A small meter dial on the front shows today's spend against a budget line.
- Alarm: spend over budget: the vault door closes and the dial turns honey.
- Data: run reports, bills Harry adds.

### 6.5 Geography buildings

**Toll booth** (Works end of the bridge). Harry's yes: money, security, deleting, downloads.
- Silhouette: a striped-roof booth with a **barrier arm** and a little bell. Wagons needing a yes wait at the barrier.
- Waiting: the barrier is down, the booth's lamp honey, a stamped-paper pictogram flutters. **Harry says yes**: a big
  rubber stamp comes down from above (no person), the barrier lifts, the wagon rolls. **No**: the wagon turns round and
  goes back to the depot.
- Data: ledger, open questions.

**Customs house** (Home end of the bridge). The privacy check: nothing personal crosses.
- Silhouette: a neat little customs post with a **scanning arch** over the road (a toy archway with a lamp on top) and a
  flag pole. Every returning wagon passes through the arch; the arch lamp flashes **green** (clean) on each pass. A wagon
  that fails the check is pulled aside into a fenced bay and its crate is opened (alarm).
- Data: the privacy checks in the tests, and the `clean()` filter's hits (counted, never shown).

**Harbour** (east). Outside services: GitHub, CDNs, model downloads.
- Silhouette: stone quays, bollards, a crane, a **harbour master's office** with a **licence board** (a pictogram board
  with one slot per arrival: green tick for CC0, MIT, Apache; honey for "strings attached"; rose for not allowed),
  stacked crates, and a **lighthouse** on the breakwater.
- Ships: a **cargo liner** (the code host: big, regular, steady), **little tugs** (CDNs: fast, frequent), a **barge with one
  big crate** (a model or asset download; the crate's flag shows its licence colour). The depth model "came by ship": a
  barge docks, the crane lifts the crate, the harbour master stamps the licence, a cart takes it to the right workshop.
- **Lighthouse**: the town's data freshness. The beam sweeps while the last GitHub poll succeeded ("live, checked 1 min
  ago"); it **stops and blinks honey** when the data is stale, and is dark when offline. This stops a calm town being
  misread as "nothing happening" when the feed is actually broken.
- Data: ledger `download` with licence; poll status.

**Districts, hills, fog, roads**: see sections 3.5 to 3.8.

### 6.6 Home Town: the machines

**The Forge** (Mac Mini + Radeon). The Mini is the smithy, the Radeon card is its furnace.
- Silhouette: a compact silver-grey **square cottage with rounded corners** (the Mini, no brand shapes) joined by a short
  covered walkway to a big **brick furnace** with a tall chimney, a glowing mouth and **bellows** (the Radeon, 16 GB).
  Anvil out front. A conveyor of crates into the furnace mouth.
- Busy: furnace mouth glows orange, bellows pump, anvil sparks per job step. Training: a mould is poured (it is training a
  tiny expert) and a pipe of glowing metal runs up the hill to the university greenhouse. Pictures: a little easel by the
  door gets a fresh canvas per picture made.
- Idle with work waiting: **the fox** comes and sits on the Forge's doorstep (see the fox below). Off: furnace cold
  grey, a nightcap on the chimney.
- Data: machine status, run reports.

**The Dell** (32 GB, no graphics card). 8 residents, one awake at a time.
- Silhouette: a long **two-storey boarding house** with **8 bedroom windows** (4 up, 4 down), each with a small
  name-colour curtain, and a front door with a bell. A queue of cars on Dell Lane.
- Exactly **one window is lit** at a time: the awake resident sits at a desk with a lamp, writing. The other seven windows
  are dark and show a sleeping silhouette with a nightcap. When the Dell switches resident, the lamp is visibly carried
  from one window to the next; the time this takes is the real load time.
- Busy: the lit resident writes, a speech bubble with a pictogram goes to the green when it answers. Alarm: an empty
  answer (the letterbox fills with empty envelopes) or a stuck switch.
- Data: machine status, queue, roster.

**The Mill** (4 GB card). Tiny experts.
- Silhouette: a stone **windmill** with four big sails and a little door; round it, a cluster of **burrows** (tiny round
  doors in grassy mounds) where the tiny experts live, **mouse-sized** (a nod to Base Camp's mice). A sack store shows
  sorted ideas as flour sacks: one sack per 10 ideas sorted (72 ideas = 7 full sacks and one part-filled), the exact
  number on the card.
- Busy: the sails turn; speed = jobs per hour. Millers (tiny experts) carry sacks. Idle: sails still, a sail cloth tied
  up. Off: sails tied and a nightcap on the cap of the mill.
- Data: machine status, run reports.

**Harry's porch** (Home Town, by Night Halt). Where Harry plays and decides.
- A small cottage porch with a rocking chair (empty), a **porch lantern** (lit when Harry answered in the town chat in the
  last hour) and a little table with an iPad-shaped slate (no brand) that glows when a real-device field report comes in.
  **Harry never appears as a figure**: his presence is the lantern, his decisions are the stamp.
- Data: `where: harry` ledger lines, real-device reports.

### 6.7 Home Town: the residents (v3)

**A house per AI** on Resident Row.

| Model size (roster) | House type | Silhouette |
|---|---|---|
| Tiny expert (< 2B) | Burrow at the Mill | A round door in a grassy mound |
| Small (2 to 9B) | **Cottage** | One storey, steep thatched roof, round window |
| Medium (10 to 19B) | **House** | Two storeys, tiled roof, porch |
| Large (20 to 29B) | **Villa** | Two storeys, a bay window, a small tower |
| Very large (30B and up) | **Manor** | Three wings, a cupola, gates and a gravel drive |

Every home has the same readable parts:

| Part | Shows | Data |
|---|---|---|
| Lights on / dark | Loaded in memory and working / unloaded (asleep) | machine status |
| Nightcap on the chimney | Asleep | machine status |
| **Garden** (front) | Flower beds = what it is good at, one bed per strong skill, flower height = score | town notes, report card |
| **Weed bed** (side) | What it is bad at: weeds, height = how bad | town notes |
| **Diplomas** (inside, on the wall facing the big front window) | What it was trained or tuned on, one framed diploma per training, frame colour = licence (green open, honey strings attached) | training records |
| **Report card** (pinned on the front door) | Its blind test scores: a 10-square grid (the 10-prompt tests), squares green / honey / rose | mega-review-1 and later |
| **Trophies** (on the windowsill) | Ideas of its that made it into a game, one cup each | `by` credits |
| **Letterbox** (at the gate) | Empty answers: envelopes spilling out, one per empty answer this week | run reports |
| **Head colour on the green** | Who is speaking: answering (green), empty answers (rose), silent (slate), not proven (honey) | the wall |

- **Cutaway on focus**: when a resident's card opens, the front wall of its home slides away (a dolls' house, like
  Base Camp build 29's), showing the diplomas, the desk and the trophies. The camera eases in.
- **Residents as figures**: each family has a silhouette prop: Scholar (mortarboard), Reasoner (a pipe and armchair),
  Coder (goggles and a toolbelt), Elder (long beard, walking stick), Surveyor (a tripod theodolite), Writer (a quill tucked
  behind the ear), Builder (hard hat, Home green), Clerk (eyeshade visor), Runner (running shoes and a satchel), Senior (a
  waistcoat and pocket watch), Hand (gloves; at the Mill), Swarmkeeper (bee smoker; at the Mill), Choreographer (a
  conductor's baton; at the Mill). Size scales slightly with model size.
- **The village green ("who is speaking")**: residents walk out to the green to answer, stand in a semicircle facing the
  bridge, and a small speech bubble rises with a pictogram (answer, empty bubble, "...", question mark). After an answer
  they walk home.

**The university** (hill). The trainer.
- Silhouette: a campus on a raised hill: a **clock tower** in the middle of a **quad**, a **Lecture Hall** (long, arched
  windows), the **Exam Hall** (domed, with tall shuttered windows), a **greenhouse wing** per training programme, a
  **graduation lawn** with a little stage. [a mortarboard]
- Training (greenhouse): potted plants grow while a training run runs (height = progress). A failed run: the plant wilts.
- **Exam Hall** (evals: blind tests comparing old and new): inside, two rows of desks with screens; the two candidates
  (old and new) sit behind a screen so they cannot see each other; papers flow to a marker. Result: the winner's lamp
  glows green; a tie is honey.
- **Graduation**: a passing new tiny expert walks onto the stage, mortarboards are thrown (confetti burst, the one
  confetti moment in the game), then the graduate walks down Campus Lane with a rolled diploma to its new burrow. **Failed
  exam**: the student sits on the "resit bench" on the quad with a raincloud above (a tiny, personal storm).
- Data: training runs, training test results.

### 6.8 The signs the town invented itself

**The fox in the pond** (a machine idle while work waits; the Choreographer's idea).
- A small orange toy fox lives by the pond on the green. When a machine is idle and work is waiting, the fox **trots to
  that machine's door and sits there, tail curled, looking at the waiting cars**. If more than one machine is idle, it
  sits at the one idle longest. When work starts, it trots back to the pond and lies down.
- Credit: the fox's card says "the Choreographer's idea".

**White smoke** (something rebuilt that already existed; the Swarmkeeper's idea).
- That building's chimney puffs **bright white**, billowing smoke for 24 hours, distinct from grey busy smoke (bigger
  puffs, slower, slightly glowing). Two white smokes this week = two buildings puffing white. Credit on the card.

**"Who is speaking"**: the residents on the green, section 6.7.

**"Finished, verified work glows brightest"**: the brightness law, section 2.2 rule 5.

---

## 7. Weather, sky and time

### 7.1 Time of day from the real clock

- The sun follows **real UK local time** for the location's latitude (a fixed 52 degrees North; no location is read):
  sunrise, noon and sunset times computed for the date. In November, the studio's evening work happens after dark, so the
  town is mostly at dusk and night: its best look.
- **Readability floor**: the scene is never darker than "moonlit blue" (hemisphere at least 0.45) and never brighter than
  "late afternoon" (so the gold-white proof still stands out by day).
- **Moon**: the real phase for the date (cheap and true). Stars at night (static).
- The replay scrubber moves the sun too, so replaying the day replays the light.
- The "Daylight" button stays (the projector owner may prefer day for an audience) and pins the time of day.

| Time | Sky | Windows and lamps | Notes |
|---|---|---|---|
| Night | Zenith `#121a2c`, stars, moon | Street lights on; windows matter most | Default for an evening projector |
| Dawn | Peach horizon | Street lights off one by one at sunrise | |
| Day | `#7fb6e6` | Windows at 25% so proof gold still reads | |
| Dusk | `#18233a` to violet horizon | Lamps switch on in a ripple outward from the square | |

### 7.2 Weather from the yard (the Works bank)

| Weather | Rule (existing) | Drawn as | Sound |
|---|---|---|---|
| **Sunshine** | All suites green | Clear sky and a soft warm rim light; the yard's lamps give a gentle green glow (no birds: motion is data) | None |
| **Clouds** | Any suite flaky | 3 to 6 flat, high, fluffy toon clouds drifting **over the Works bank only**, casting soft moving shadow blobs | Light wind |
| **Storm** | One or more real failures | Clouds darken to slate, rain as short streaks **over the Works bank only**, puddles appear on the square, one lightning flash per new failure (not random) | Rain bed, one thunder per new failure |
| **Rainbow** | A real-device win, for 2 hours | A rainbow arching **from the shop window to Harry's porch** (it lands on the two ends of the win: the thing that shipped and the device it was proven on) | A short chime |
| **Fog** | Untested on a real iPad | Local fog banks on the unproven buildings (section 3.7), not the whole sky | None |

Rules that fix today's problems:
- Clouds sit at height 10 to 12 and **never in the camera-to-Home-Town line of sight** (they are placed by projecting the
  camera's view and avoiding the bridge and Home Town screen rectangle).
- Rain and lightning only over the Works bank: the tests are the Works' tests. **Home Town has its own small weather**
  from its own checks (optional, v3): drizzle over the Dell when its answers come back empty, a sunny patch over a machine
  whose parcels passed ("Train tells the truth: 5 tests").
- The rainbow is a flat ribbon arc that never crosses a building label; it is drawn with depth test on so buildings
  occlude it naturally.

### 7.3 Power cuts and night together

A power cut at night is the most dramatic state in the town, and that is right: it is the event that was missed on
15 Nov. The rolling blackout (section 6.2) plays, the battery tower shows empty, the lighthouse keeps sweeping (data is
fresh: the town knows the power is out), and the lost property office's emergency lamp starts to pulse after 2 hours.

---

## 8. Characters and animation

All characters are built from **a few shared instanced parts** (body, head, hat, arm-and-tool), toon-shaded with ink on
body and head only (Base Camp's rule: faces stay clean). Animation is procedural (sine bobs, part rotations, path
following); no skeletons, no animation files. That keeps every figure at one or two draw calls per part type for the
whole town.

### 8.1 Cast

| Character | Who | Look | Size |
|---|---|---|---|
| **The foreman** | The main AI session | Taller than builders, long amber work coat, hard hat with a lamp, clipboard; a little brass whistle | 1.3x builder |
| **Builders** | Hired helper AIs (cloud) | Round body, overalls in the district colour, hard hat in the district colour, a toolbox; a tiny badge with the branch's pictogram | 1x |
| **Researcher** | A builder hired for research | Same body, a satchel of books, round spectacles | 1x |
| **Fixer** | A builder hired to fix | Same body, a red cross armband and a spanner | 1x |
| **Inspector** | The yard (the tests themselves) | A peaked cap and a clipboard, always in the yard box | 1x |
| **Postmaster** | The post office | Postal cap, satchel | 1x |
| **Switchboard operator** | The exchange | Headset | 1x |
| **Town crier** | Big news | Tricorn hat, bell | 1x |
| **Residents** | Home Town models | Families in 6.7, size by model size | 0.9x to 1.4x |
| **Tiny experts** | The Mill | Mouse-scale, round ears, aprons; one prop each | 0.4x |
| **Harry** | The owner | **Never shown.** His lantern and his stamp | |

The yard, post and exchange staff are not "decoration": they are the busy-state animation of their buildings, and they
only move when their building is busy.

### 8.2 Animations

| Animation | Who | Trigger (data) | How |
|---|---|---|---|
| Walk | everyone | Route from a ledger event | Path along the road graph, body bob 4% at 2 steps per second, slight side sway, lean into turns |
| Hired: arrive | builder | `hire` | Pops out of the hut door with a puff, waves at the foreman, collects a hat from the rack |
| Hammer | builder | `step`, `commit` at a workshop | Arm with hammer swings, little sawdust puffs, 1 swing per second |
| Carry parcel | builder | `commit` | Walks workshop -> yard -> post with a parcel on its head |
| Wait | builder, car | blocked at road works, toll | Taps foot, looks at its watch every 3 seconds |
| Asleep | builder, resident | power cut, asleep | Head drops, "zZ" bubble, nightcap |
| Report and forget | builder | `end` | Walks to the hut, hands a scroll to the foreman, hangs its hat on the rack, and **pops into a puff of paper confetti** (it forgets; the hat stays) |
| Abandon | builder | lost property | Walks off its cart and fades; the cart stays at lost property with the hat |
| Celebrate | builder, foreman | `win` | Hop and a hat throw (hat comes back down) |
| Inspect | inspector | `test` | Leans out, lifts the barrier or keeps it down |
| Answer | resident | order `result` | Walks to the green, faces the bridge, speech bubble with pictogram |
| Write | awake Dell resident | machine busy | Arm writes, lamp flickers |
| Graduate | tiny expert | training passed | Climbs the stage, mortarboard throw, walks to its burrow |
| Sulk | tiny expert | training failed | Sits on the resit bench with a tiny cloud |
| Fox trot, sit, lie | fox | idle machine with work waiting | Path from the pond, sits at the door, tail curls |
| Wave at the camera | foreman | Projector tour reaches the hut | Small and rare (once per tour) |

**Reduced motion** (`prefers-reduced-motion`): walking slows to 25%, no hops or confetti, lightning becomes a soft
brightening, the camera does not drift on its own.

---

## 9. Vehicles

| Vehicle | What it means | Route | Look | Notes |
|---|---|---|---|---|
| **Covered wagon** | An order (to Home Town), a result (back) | Bridge depot -> toll -> bridge -> customs -> machine | Horse-drawn toy wagon, canvas in an order colour band; loaded with crates on the way back | Exists today; restyled |
| **Postal van** | A deploy | Post office -> shop window | Small red van | |
| **Toy cars** | Jobs queued at a machine | Park in the machine's car park; jam on Dell Lane | Six rounded car shapes, one colour per origin | Instanced: one draw call for all cars |
| **Ambulance** | An urgent fix | Hospital -> workshop -> hospital | White van, rose stripe, flashing light | One real point light, desktop only |
| **Fire engine** | A rollback | Fire station -> shop window -> back | Red engine with ladder | |
| **Tow truck** | Lost work picked up | Lost property -> workshop | Small yellow truck with a hook | |
| **Repair truck** | Power restored | Power station -> hut | Honey truck with a ladder | |
| **Removal van** | A new resident / a moved one | Bridge -> Resident Row | Boxy van with boxes | Crosses the bridge: residents are set up from the Works side |
| **Night train** | The nightly batch | Rail loop, Night Halt | Small steam engine + wagons per job | Steam puffs gold on time |
| **Cargo liner** | The code host (pushes and pulls) | Sea -> quay | Big, steady, neutral colours, **no logos** | Docks when a big push or fetch happens |
| **Tugs** | CDN fetches | Harbour mouth | Small, fast | Short trips |
| **Barge** | A model or asset download | Sea -> quay; crate lifted by crane | One big crate with a licence flag | Ledger `download` |
| **Crane** | Building a workshop roof; lifting crates | Fixed | Tower crane (workshops), quay crane (harbour) | |
| **Hand-cart** | Abandoned work | Lost property rack | Tipped cart with a hat | Exists today |

---

## 10. Ambient life (within "motion is data")

What may move without its own event:
- **Water** flowing (the river is a carrier; its flow is the pipeline's direction, constant).
- **Flags** flutter only on workshops that are open (stage 4), so a fluttering flag still says "open".
- **The windmill** turns only when the Mill is busy.
- **Clouds** exist only in clouds and storm weather.
- **Smoke** only from busy buildings (grey) or white smoke.

What does not exist: birds, random pedestrians, random cars, wandering cats, boats with no meaning. If the town feels
quiet, it is quiet: that is information. To keep a quiet town from looking broken, three honest "heartbeats" are always
present:
1. The **lighthouse beam** sweeps while the data is fresh.
2. The **town hall clock** shows real time (and moves).
3. The **night train** waits at Night Halt with a gentle simmer of steam while a batch is scheduled for tonight.

Optional, if the owner wants a little more life (a taste question, see 17): **paper boats** on the river, one per message
that crossed between the two banks today, drifting east into the sea.

---

## 11. Sound design

### 11.1 Rules

- **Off by default** on phones and laptops; **on by default in wall mode** (the projector). One sound button in the plate.
- **Every sound is an event** (same law as motion). No music bed. One quiet ambience per weather and per busy-ness level.
- **At most one stinger every 3 seconds**; stingers queue by priority (alarm > win > deploy > fail > test > commit) and
  older low-priority ones are dropped, so a burst of 20 commits makes one clunk, not twenty.
- **Quiet hours**: after 23:00 local, stingers drop to half volume and alarms play once.
- **Source**: synthesised in WebAudio (a few oscillators and noise bursts, no files), with an optional upgrade to CC0
  sound packs (Kenney's audio packs are CC0; download must be done by the owner like the models).

### 11.2 The sound list

| Sound | Event | Character |
|---|---|---|
| Post box clunk | `commit` | Short wooden thunk |
| Shop doorbell | `deploy` | Two-note bell |
| Fanfare | `win` | Four-note brass-like rising, 1.5 s |
| Green ding | yard all green | Soft high glockenspiel |
| Bonk | test `fail` | Low wooden bonk |
| Wobble | test flaky | A spring "boing" |
| Hammer taps | busy workshops | 1 to 3 taps per few seconds, rate = busy workshops (ambience) |
| Horse clop and creak | wagon crosses | Clip-clop, 2 s |
| Toll bell | waiting for Harry's yes | One small bell |
| Stamp | Harry's yes | Big rubber thump |
| Steam whistle | night train departs, arrives | Two-tone whistle |
| Ship horn | download arrives | Low, short |
| Ambulance | urgent fix | A gentle two-tone (never a real siren) |
| Fire bell | rollback | Bright bell |
| Power down | power cut | Descending hum and a click |
| Power up | power back | Rising hum |
| Lost property bell | stall alarm | Single hand bell, repeats every 10 min while alarmed, max 3 times |
| Town hall bell | new question; old question reminder | One deep bell |
| Crier | big news | Bell then (v4) spoken line via speech synthesis |
| Rain | storm | Noise bed, low |
| Thunder | each new failure | Soft rumble |
| Mill creak | Mill busy | Slow wooden creak loop, quiet |
| Furnace roar | Forge busy | Low noise roar, quiet |
| Graduation cheer | tiny expert graduates | Short crowd "hooray" made from noise and voices-like formants |

---

## 12. Level of detail: projector, laptop, phone

### 12.1 Tiers

| Tier | Chosen when | Pixel ratio cap | Shadows | Ink | Real point lights | Particles | Labels visible |
|---|---|---|---|---|---|---|---|
| **A: Projector / desktop** | Wide screen (>= 1280 px), a capable GPU, or `?wall` | 1.0 at 4K, 1.5 at 1080p | One 2048 map, soft | All big shapes | <= 4 (vehicles in motion only) | Full | <= 24 |
| **B: Laptop / iPad** | Medium screen or measured frame time > 14 ms on tier A | 1.5 | One 1024 map | Buildings and characters | <= 2 | Half | <= 16 |
| **C: Phone** | Narrow screen (< 760 px) or measured frame time > 20 ms on B | 1.5 (2 on fast phones) | **No shadow map**: soft blob shadows baked under buildings and instanced under figures | Buildings only | 0 | Quarter | <= 8 |

**Auto-downgrade**: if the median frame time over 3 seconds exceeds the tier's budget, drop a tier (never up again in the
session, to avoid flicker). Shown nowhere, logged in `__works`.

### 12.2 Distance LOD (all tiers)

- Buildings: two versions (full and a simple "box + roof + windows" with the same vertex colours). Swap at a
  screen-height threshold (under about 40 px tall). Home Town on phones nearly always uses the simple version.
- Characters: under about 12 px tall, become a single instanced coloured capsule with a hat dot.
- Parcels, coins, cars beyond the threshold: merged to "a heap" shape scaled by count.
- Labels: priority order (alarms first, then done, then busy, then the rest), and a screen-space collision test; a label
  that would overlap a higher-priority one hides. On phones only alarm, done and the focused bank's top 6 show.

### 12.3 Framing per device

- **Projector ("wall mode", `?wall`)**: the plate shrinks to a title strip; the diary becomes a 4-line ticker at the side;
  the scene is at least 75% of the picture. A **director camera** moves to events: when something happens, the camera
  glides to it (3 s ease), holds 6 s, returns to the master shot. Never more than one move per 10 s; alarms win over
  everything.
- **Laptop**: today's layout, slimmer panels, the master shot.
- **Phone (portrait)**: two **stops**: the Works bank and Home Town. A swipe up or a "cross the bridge" button flies the
  camera over the bridge (2 s). The diary is a pull-up sheet showing only 2 lines when closed; the plate is one line. The
  master shot for the Works bank is closer and steeper (pitch 48 degrees) so buildings are big.

---

## 13. Performance plan for three.js r128

### 13.1 Budgets

| Tier | Draw calls (incl. shadow pass) | Triangles | Materials | Textures (GPU) | Frame time target |
|---|---|---|---|---|---|
| A | <= 300 | <= 400k | <= 12 | <= 24 MB | 16 ms (60 fps), 33 ms allowed in wall mode when idle |
| B | <= 200 | <= 250k | <= 10 | <= 16 MB | 16 ms |
| C | <= 120 | <= 120k | <= 8 | <= 8 MB | 16 ms (accept 30 fps) |

Today: 415 calls at 1600 x 900 with 34k triangles and 12 point lights. The plan spends more triangles (nicer models) and
far fewer calls and lights.

### 13.2 How

1. **Bake, merge, instance.** Use Base Camp's proven route: CC0 models baked by a script (like
   `games/base-camp/tools/bake-props.js`) into vertex-coloured geometry in a JS file (`works/models/town.js`), all using
   **one shared toon material**. Static scenery per board tile is merged into **one mesh + one ink mesh per tile** (trees,
   fences, kerbs, roads, rocks, terraces). Buildings stay separate meshes (they need picking and state), but share the
   material.
2. **Instance everything repeated.** r128 has `InstancedMesh` with `setColorAt` / `instanceColor`. One InstancedMesh per
   part type for the whole town: window panes, window halos, beacons, lamp heads, lamp posts, parcels, coin stacks,
   cars, smoke puffs, fog puffs, bunting, flags, character bodies, heads, hats, tools, trees (if not merged), sleepers on
   the rail, crates.
   Instanced ink: a second InstancedMesh with a pre-expanded hull geometry and the back-face ink material, sharing the
   instance matrices.
3. **No point lights for glow.** Emissive-looking `MeshBasicMaterial` panes + additive halo quads. Keep at most 4 real
   point lights (tier A) for moving emergencies only.
4. **One shadow map**, tight to the visible board (fit the shadow camera to the current view each time the camera
   settles), `PCFShadowMap` not soft on tier B, none on tier C. Instanced characters cast no real shadow; they get
   an instanced blob.
5. **Update on change, animate cheaply.** State (`applyTime`) changes instance colours and visibility only when data
   changes or the scrubber moves. Per frame only: walker matrices (<= 200), smoke and fog puffs, sails, beads, vehicle
   positions. Use `instanceMatrix.setUsage(THREE.DynamicDrawUsage)` and update only the changed range.
6. **Labels**: DOM, but positions updated only when the camera moved or a label's anchor moved; `transform:
   translate3d()` not `left/top`; max visible per tier; collision culled.
7. **Throttle when idle**: in wall mode, when the camera is still and no walker or vehicle is moving, render at 30 fps;
   pause rendering entirely when the page is hidden.
8. **Materials and programs**: aim for 6 to 8 shader programs (toon vertex colour, toon vertex colour instanced, ink,
   ink instanced, basic glow, basic glow instanced, water, sky). Avoid per-object material clones; change colour through
   instance colour or vertex colour.
9. **Geometry budgets per model**: building full LOD <= 2,500 triangles, simple LOD <= 200; character parts <= 150
   each; vehicles <= 600; trees <= 120 (merged).
10. **Measure in tests**: add a perf check to `tests/works-test.js` reading `R.info.render.calls` and triangles for the
    master shot on each tier (as measured above), failing above budget. Base Camp did this for its style pass (draw
    calls within 15% of build 15); the same idea.

### 13.3 Loading

- Total download for the town's models <= 1.5 MB (baked JS, gzip on Pages); the town draws its current box shapes
  first and swaps models in when the file arrives (the existing `tryModels()` path, extended).
- No external textures except one 512 x 512 pictogram atlas (drawn in a canvas at start-up from simple paths: no file
  needed) and the gradient map (3 pixels).

---

## 14. Models: where they come from

**Kenney kits (CC0 1.0)** to download on a normal computer (kenney.nl answered 403 to the build machine). Names to check
on download; the kit list on the site changes over time.

| Need | Kit (Kenney, CC0) | Use |
|---|---|---|
| Houses, cottages, manors, porches | City Kit (Suburban), Fantasy Town Kit | Resident homes, the hut, the Dell |
| Shops, civic buildings | City Kit (Commercial), Fantasy Town Kit, Castle Kit (towers) | Shop window, town hall, museum, courthouse, bank |
| Industry | City Kit (Industrial) | Power station, sorting office, exchange, water tower, fire station |
| Roads, kerbs, road works, lamp posts | City Kit (Roads) | Road graph pieces, barriers, cones |
| Cars, vans, ambulance, fire engine, trucks | Car Kit | All road vehicles |
| Train, track, station | Train Kit | Night train, Night Halt |
| Boats | Watercraft Kit / Pirate Kit | Liner, tugs, barge, quay pieces |
| People | Mini Characters | Base for builders, residents (repainted, props added) |
| Trees, rocks, hills, flowers | Nature Kit | Scenery, gardens, weed beds |
| Furniture | Furniture Kit | Desks, beds (hospital, Dell, cutaways) |
| Crates, barrels, sacks | Survival Kit, Food Kit | Parcels, cargo, Mill sacks |

**Quaternius** packs (CC0) are a second source (Medieval Village pack for the Mill and the Forge), as Base Camp already uses.

**Made in code** (our own): the windmill sails, the battery tower, the gauge stripe, the beacons, bunting, flags, smoke,
fog, the rainbow, wires and beads, the board edge, the terraces, the river channel, the pictogram atlas. Credit lines go
in `THIRD_PARTY.md` as today.

**Restyling the kits**: Kenney's colours are bright and flat; the bake script remaps each kit's palette to the town
palette (2.4) by a lookup table (a kit colour -> a town colour), so mixed kits look like one family. Ink hull added at bake.

---

## 15. Concept art: the ChatGPT image list

### 15.1 How to use these prompts

1. **Make the style key first** (prompt A1). Pick the best of a few tries. That picture is the style bible.
2. For every later prompt, **attach the chosen style key image** and keep the sentence "Match the style of the attached
   reference image exactly". This holds the look steady across a hundred images far better than words alone.
3. Use the size given (ChatGPT image sizes: 1536 x 1024 landscape, 1024 x 1024 square, 1024 x 1536 portrait).
4. **No text in images.** Every prompt says so; if ChatGPT adds letters anyway, ask it to "remove all text and letters,
   keep everything else". Our labels are drawn by the page.
5. **No real brands or landmarks.** The machines are described by shape and role only (no logos, no known computer or
   card shapes).
6. Save each image as `concept/<id>-<short-name>.png` (e.g. `concept/C07-post-office.png`) in a folder the foreman can
   read; these are references for the builders, not textures in the page.
7. State sheets show one building in a 2 x 2 or 3 x 2 grid with an identical camera. Ask for "the same building, same
   angle, same size in every cell"; if it drifts, regenerate the sheet rather than mixing cells from different sheets.

### 15.2 The style sentence (already inside every prompt)

> Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded
> bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean
> dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and
> slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for
> success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a
> long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real
> landmarks, no real people. Signs use simple pictograms only.

### 15.3 The prompts

Total: 91 prompts. Make A1 first and attach it to every other prompt.

| Id | Image | Size |
|---|---|---|
| A1 | Style key: the whole world at dusk | 1536x1024 |
| A2 | Style key: the same world by day | 1536x1024 |
| A3 | Material and palette swatch board | 1536x1024 |
| A4 | Character line-up | 1536x1024 |
| A5 | Projector hero shot | 1536x1024 |
| A6 | Phone portrait shot | 1024x1536 |
| B1 | Illustrated map, top-down | 1024x1536 |
| B2 | The river and the bridge | 1536x1024 |
| B3 | District gate arches | 1536x1024 |
| B4 | Hills: hard ground as terraces | 1536x1024 |
| B5 | Fog: never tried on a real device | 1536x1024 |
| B6 | The board and its growth tiles | 1536x1024 |
| B7 | The harbour | 1536x1024 |
| B8 | Ships set | 1536x1024 |
| B9 | Roads and road works | 1536x1024 |
| B10 | Lighthouse states | 1536x1024 |
| C1 | Foreman's hut, states | 1536x1024 |
| C2 | Foreman's hut, power cut | 1024x1024 |
| C3 | Workshop life stages | 1536x1024 |
| C4 | Workshop states | 1536x1024 |
| C5 | Library | 1536x1024 |
| C6 | Inspection yard | 1536x1024 |
| C7 | Post office and parcels | 1536x1024 |
| C8 | Sorting office: merge and jam | 1536x1024 |
| C9 | Shop window | 1536x1024 |
| C10 | Market square | 1536x1024 |
| C11 | Noticeboard and town crier | 1536x1024 |
| C12 | Telephone exchange | 1536x1024 |
| C13 | Power station and battery tower | 1536x1024 |
| C14 | Power cut across the town | 1536x1024 |
| C15 | Street lights as health checks | 1536x1024 |
| C16 | Lost property office | 1536x1024 |
| C17 | Town hall and motions board | 1536x1024 |
| C18 | Scroll ageing strip | 1536x1024 |
| C19 | Courthouse | 1536x1024 |
| C20 | Hospital and ambulance | 1536x1024 |
| C21 | Fire station and rollback | 1536x1024 |
| C22 | Museum | 1536x1024 |
| C23 | Archive | 1536x1024 |
| C24 | Theatre and arcade | 1536x1024 |
| C25 | Bank | 1536x1024 |
| C26 | Toll booth: Harry's yes | 1536x1024 |
| C27 | Customs house: privacy check | 1536x1024 |
| C28 | Bridge depot and wagons | 1536x1024 |
| D1 | Home Town overview | 1536x1024 |
| D2 | The Forge: cottage and furnace | 1536x1024 |
| D3 | Water tower: disk space | 1536x1024 |
| D4 | The Dell: one awake at a time | 1536x1024 |
| D5 | Traffic jam on Dell Lane | 1536x1024 |
| D6 | Car park | 1536x1024 |
| D7 | The Mill and the tiny experts | 1536x1024 |
| D8 | The fox in the pond | 1536x1024 |
| D9 | White smoke | 1536x1024 |
| D10 | Who is speaking: the village green | 1536x1024 |
| D11 | Resident homes by size | 1536x1024 |
| D12 | A resident's home up close | 1536x1024 |
| D13 | Dolls' house cutaway: diplomas | 1536x1024 |
| D14 | Empty letterbox | 1024x1024 |
| D15 | Removal van: a new resident | 1536x1024 |
| D16 | University campus | 1536x1024 |
| D17 | Exam hall: blind tests | 1536x1024 |
| D18 | Graduation and the resit bench | 1536x1024 |
| D19 | Greenhouse: training in progress | 1536x1024 |
| D20 | Night train and Night Halt station | 1536x1024 |
| D21 | Harry's porch | 1536x1024 |
| D22 | Residents line-up | 1536x1024 |
| D23 | Tiny experts line-up | 1536x1024 |
| E1 | Weather: sunshine | 1536x1024 |
| E2 | Weather: clouds (flaky) | 1536x1024 |
| E3 | Weather: storm (failures) | 1536x1024 |
| E4 | Weather: rainbow (a real-device win) | 1536x1024 |
| E5 | Weather: fog lifting | 1536x1024 |
| E6 | Time of day strip | 1536x1024 |
| E7 | Night power cut with lighthouse | 1536x1024 |
| E8 | Home Town drizzle | 1536x1024 |
| F1 | Foreman turnaround | 1536x1024 |
| F2 | Builder poses | 1536x1024 |
| F3 | Builder colour variants | 1536x1024 |
| F4 | Celebration | 1536x1024 |
| F5 | Staff of the town | 1536x1024 |
| G1 | Road vehicles set | 1536x1024 |
| G2 | Toy cars set | 1536x1024 |
| G3 | Cranes | 1536x1024 |
| H1 | Pictogram sign sheet | 1024x1024 |
| H2 | State markers sheet | 1024x1024 |
| H3 | Window and halo study | 1536x1024 |
| I1 | Moment: a win night | 1536x1024 |
| I2 | Moment: lost property alarm | 1536x1024 |
| I3 | Moment: graduation day | 1536x1024 |
| I4 | Moment: a ship arrives | 1536x1024 |
| I5 | Moment: the town grows | 1536x1024 |

#### A. Style keys and hero shots

**A1. Style key: the whole world at dusk** (1536x1024, no attachment)

```text
Concept art, the style bible for the whole project. A toy-town diorama built on a thick rounded wooden board on a workbench, the board's cut edge showing painted wood, soil and stone layers at the front. In the foreground the near bank: a paved town square with a round timber foreman's lodge, workshops with roofs in pine green, orange, violet and slate blue arranged in four quarters, a fenced test yard with rows of little green lamps, a red-brick post office with stacked parcels, and at the very front a wide shopfront with a striped awning whose big window is the brightest thing in the picture, glowing gold-white. Behind, a river crossed by one stone arched bridge with a striped toll booth and covered wagons waiting. On the far bank a smaller homely village: a stone windmill, a brick furnace glowing orange next to a small rounded silver-grey cottage, a long two-storey boarding house with only one lit window, a water tower, a pond with a small orange fox, and a hill behind with a little university and a clock tower. A harbour with a lighthouse on the right where the river meets the sea. Deep navy dusk sky, first stars, warm amber windows, tiny figures in hard hats walking the roads. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**A2. Style key: the same world by day** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. The exact same diorama and camera as the reference, but in soft late-afternoon daylight: pale blue sky, warm sunlight from the upper left, crisp toon shadows to the right, windows only faintly lit, the shopfront window still clearly the brightest glowing thing. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**A3. Material and palette swatch board** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A neat swatch board for the art team: rows of small toy sample blocks on a warm grey background showing each material in three flat toon tones with the dark plum ink outline: cream wall, terracotta roof, slate-blue roof, pine-green roof, orange roof, violet roof, clay roof, moss grass, packed-earth road, paved stone, river water with foam, painted wood board edge with soil layers, glowing amber window, glowing gold-white window, mint-green lamp, rose-red beacon, honey-yellow lamp, slate-grey asleep lamp. No text. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**A4. Character line-up** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A character line-up of small toy figures standing in a row on a warm grey background, all the same round chunky toy style: a taller foreman in a long amber work coat with a hard hat with a head-lamp and a clipboard; four builders in overalls and hard hats in pine green, orange, violet and slate blue with toolboxes; a researcher with a satchel of books and round spectacles; a fixer with a red cross armband and a spanner; a yard inspector with a peaked cap and clipboard; a postmaster with a postal cap and satchel; a switchboard operator with a headset; a town crier with a tricorn hat and a hand bell. Friendly simple faces, no realistic people. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**A5. Projector hero shot** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A cinematic wide hero shot of the reference diorama at night for a wall projector: the near bank full of warmly lit workshops, a rainbow arching from the glowing shopfront at the front to a small cottage porch on the far bank, gentle steam from a small night train waiting at a little station on the far bank, the lighthouse beam sweeping over the sea on the right, the whole board framed by its wooden edge. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**A6. Phone portrait shot** (1024x1536, attach A1)

```text
Match the style of the attached reference image exactly. A tall portrait view of the near bank of the reference diorama, closer and steeper than usual, so the buildings are big: the town square with the foreman's lodge in the middle, workshops around it, the glowing shopfront at the bottom, the river and the bridge at the top edge. Dusk lighting. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

#### B. Geography

**B1. Illustrated map, top-down** (1024x1536, attach A1)

```text
Match the style of the attached reference image exactly. An illustrated top-down map of the whole toy town drawn as a painted game map in the same toon style, north at the top: the far bank at the top with a university on a hill, a windmill, a furnace and cottage, a water tower, a long boarding house, a row of cottages and manors growing to the east, a village green with a pond, an oval narrow-gauge railway loop with a little station; a river across the middle flowing east into a sea on the right with a harbour and lighthouse; one bridge in the centre with a toll booth on the near end and a customs post on the far end; the near bank below with a town square in the centre, four wedge-shaped quarters with pine-green, slate-blue, violet and orange roofs, a power station on the west riverbank with pylons crossing the river, and a market square and a wide shopfront at the bottom. Pictograms only, no words. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**B2. The river and the bridge** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A close view of the river and the one stone bridge with three chunky arches. On the near end a striped toll booth with a barrier arm down and two covered wagons waiting; on the far end a neat little customs post with a toy scanning archway over the road with a small green lamp on top. Stone edging on the near bank, reeds and grass on the far bank, the water in three flat bands of blue with white foam rings round the piers, flowing to the right. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**B3. District gate arches** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A simple toy gate arch over a road, two posts and a crossbar with a hanging pictogram board. Top-left pine green with a tent pictogram. Top-right orange with a pictogram of a bread loaf crossed with a toy cannon. Bottom-left violet with a lantern pictogram. Bottom-right slate blue with a tiny house pictogram. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**B4. Hills: hard ground as terraces** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A small quarter of the toy town with three workshops, shown at four difficulty levels: flat ground; raised one terrace step with a low stone retaining wall and a ramp; two steps; three steps, the workshops perched on a small stepped hill with the road zig-zagging up. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**B5. Fog: never tried on a real device** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A workshop in the toy town sitting inside a low, soft, pale-blue fog bank made of big round soft puffs hugging the ground, the building's outline faint and unsure, next to an identical workshop in clear air with a crisp ink outline. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**B6. The board and its growth tiles** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. The toy town diorama seen from a lower side angle showing the thick rounded wooden board and its cut edge with painted wood, soil and stone layers. A new extra board tile is sliding in from the right on a small wheeled dolly, its ground still empty with survey pegs, a visible seam where it meets the main board. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**B7. The harbour** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A toy harbour where a river meets the sea: stone quays with bollards, a dockside crane lifting one big crate from a flat barge, stacked crates, a harbour master's office with a pictogram board of slots holding green ticks, one honey-yellow circle and one rose cross, a small tug boat, and a big neutral-coloured cargo ship with no markings docked at the long quay. A stubby lighthouse on a breakwater. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**B8. Ships set** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. Toy boats. Top-left a big chunky cargo liner in plain navy and cream with no markings. Top-right a small round tug boat with a puff of steam. Bottom-left a flat barge carrying one big crate with a small green flag on the crate. Bottom-right the same barge with a honey-yellow flag on the crate. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**B9. Roads and road works** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A short stretch of packed-earth toy road between a workshop and a fenced yard, blocked by road works: striped barriers, orange cones, a small toy digger, a little hole in the road, and a builder figure taking the long way round on a side path. Dusk, warm lamps. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**B10. Lighthouse states** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A stubby toy lighthouse on a stone breakwater at night. Top-left its beam sweeping bright and warm. Top-right the beam stopped and the lamp blinking honey yellow. Bottom-left completely dark. Bottom-right in daylight, lamp off. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

#### C. The Works bank: buildings and signs

**C1. Foreman's hut, states** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A round-ish timber lodge with a big porch, a lantern on a hook, a tall stone chimney, a hat rack by the door holding several small hard hats in pine green, orange, violet and slate blue, and a big table under the porch roof with rolled plans. The foreman figure in a long amber coat and a head-lamp hard hat. Top-left IDLE: windows dimly lit amber, door closed, no smoke. Top-right BUSY: windows brightly lit amber, door open, grey chimney smoke, its worker busy. Bottom-left ALARM: one small rose-red cross-shaped beacon pulsing on the roof, a small rose pennant on its sign, windows flickering. Bottom-right DONE: windows glowing gold-white, a small gold star above the roof, a string of bunting. In the alarm cell the foreman stands still. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C2. Foreman's hut, power cut** (1024x1024, attach A1)

```text
Match the style of the attached reference image exactly. The timber lodge of the reference at night during a power cut: all windows dark, the porch lantern out, the foreman sitting on the porch step with a small nightcap and a tiny zZ bubble shape, the hat rack in shadow, moonlight only. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C3. Workshop life stages** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject six times in a 3 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A long low toy workshop with a big sliding barn door and a row of skylights, roof in pine green, on its plot. Cell 1: just four survey pegs with string and a tiny pine-green flag. Cell 2: a stone foundation slab and a crate of tools, one builder. Cell 3: scaffolding round half-built walls, the builder hammering. Cell 4: a little tower crane lowering the roof on. Cell 5: finished and open, a pine-green flag on the ridge, windows lit, a door sign with a tent pictogram. Cell 6: closed, boards nailed across the door, the flag lowered. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C4. Workshop states** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. The finished long low toy workshop with a slate-blue roof and a workbench out front with a builder figure. Top-left IDLE: windows dimly lit amber, door closed, no smoke. Top-right BUSY: windows brightly lit amber, door open, grey chimney smoke, its worker busy. Bottom-left ALARM: one small rose-red cross-shaped beacon pulsing on the roof, a small rose pennant on its sign, windows flickering. Bottom-right DONE: windows glowing gold-white, a small gold star above the roof, a string of bunting. In the busy cell the builder hammers with little sawdust puffs. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C5. Library** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A narrow tall toy library with a round reading-room dome and a chimney made of stacked books, an outside shelf of books by the door, an open-book pictogram sign. Top-left IDLE: windows dimly lit amber, door closed, no smoke. Top-right BUSY: windows brightly lit amber, door open, grey chimney smoke, its worker busy. Bottom-left ALARM: one small rose-red cross-shaped beacon pulsing on the roof, a small rose pennant on its sign, windows flickering. Bottom-right DONE: windows glowing gold-white, a small gold star above the roof, a string of bunting. In the busy cell a researcher stands at a lectern under the dome and loose pages flutter out of the top like birds. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C6. Inspection yard** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A fenced toy test yard with a canopy roof on one side, a raised inspector's box with a striped barrier arm, and three rows of short lamp posts. Top-left IDLE: all lamps round and mint green, barrier up, no cart. Top-right BUSY: a small cart rolling through the barrier, the inspector leaning out with a clipboard. Bottom-left ALARM: two lamps replaced by rose-red cross-shaped lamps, one honey-yellow half-moon lamp, barrier down, a cart waiting, a rose beacon on the canopy. Bottom-right DONE: every lamp mint green with a soft green glow rippling across the yard. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C7. Post office and parcels** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A red-brick toy corner post office with a big arched door, a red pillar box out front, a parcel chute on the side and a loading dock. Top-left a few parcels. Top-right busy: the postmaster stamping parcels, a parcel sliding down the chute, neat rows of about twenty brown parcels. Bottom-left alarm: one rose beacon on the roof. Bottom-right done: some parcels wrapped with gold ribbons, a small red postal van leaving. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C8. Sorting office: merge and jam** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A wide toy sorting shed with a sawtooth factory roof and two conveyor belts coming out of two side doors that join at a big round sorting drum at the front. Top-left idle. Top-right busy: parcels riding both belts into the drum and coming out as one neat stack. Bottom-left JAM: parcels piled up at the drum with a red tag, a worker figure sitting on top of the pile scratching its head with a crowbar, a rose beacon. Bottom-right done: one tidy stack glowing gold-white. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C9. Shop window** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A wide toy shopfront with a deep striped awning, a huge display window holding little toy miniatures (a tent, a bread loaf crossed with a toy cannon, a lantern, a tiny town), a goods stall out front and a small side window for the back room. Top-left idle: window softly lit. Top-right busy: the side back-room window lit amber, a postal van arriving. Bottom-left alarm: the display window dark, the street lamp in front out, a rose beacon. Bottom-right DONE: the display window blazing gold-white, the brightest thing in the scene, glowing boxes on the stall, one gold box, a gold star above the roof, bunting. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C10. Market square** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A small toy market square in front of the shopfront with five striped stalls in different colours, each holding wooden idea crates; one crate stamped with a coloured mark being carried away by a little builder figure towards a workshop; a short queue at the busiest stall. Dusk, warm lamps. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C11. Noticeboard and town crier** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. On a paved toy town square: a wide wooden noticeboard on two legs with a small roof, pinned with papers with coloured bands, some with a green tick stamp; next to it a little podium where a town crier figure in a tricorn hat rings a hand bell, a big speech bubble with a star pictogram floating up. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C12. Telephone exchange** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A narrow tall toy telephone exchange with a lattice radio mast on top and telephone poles spreading out with sagging wires, a switchboard operator with a headset visible through a window. Top-left idle. Top-right busy: small glowing amber beads travelling along the wires, the mast lamp blinking. Bottom-left alarm: one wire drooping low with a bead stuck halfway, a rose beacon. Bottom-right done: a gold-white bead arriving at a workshop. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C13. Power station and battery tower** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A stout toy brick power station with two chimneys, a row of transformers out front, pylons leading away over a river, and a tall glass battery gauge tower made of ten stacked cells. Top-left both chimneys gently smoking, eight cells lit mint green. Top-right busy: thick smoke, turbine windows bright, five cells lit. Bottom-left low: one cell lit and blinking honey yellow. Bottom-right POWER CUT: chimneys stopped, all cells dark, a small spark at the pylon, windows black. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C14. Power cut across the town** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Night view of the near bank of the toy town during a rolling blackout: the left half of the town already completely dark, the right half still lit with amber windows and street lamps, the darkness sweeping across; small builder figures frozen with tiny zZ bubble shapes; only a little crooked shop and a white flat-roofed hospital keep tiny emergency lamps glowing. Moonlight. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C15. Street lights as health checks** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A toy road leading from a district gate arch to the glowing shopfront, lined with eight small street lamps: six lit warm amber, two dark, one dark lamp with a little ladder leaning against it. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C16. Lost property office** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A crooked little toy shop with a tall thin roof, a bay window full of odd items (an umbrella, a single boot, a teddy bear), a question-mark tag pictogram sign, a hand-cart rack out front and a big alarm bell lamp on top. Top-left idle: empty rack. Top-right two tipped hand-carts in the rack each with a coloured hard hat left on it. Bottom-left ALARM: the bell lamp swinging and glowing rose red, three abandoned carts. Bottom-right DONE: a small yellow tow truck towing a cart away. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C17. Town hall and motions board** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A two-storey toy town hall with steps, chunky columns, a clock tower with a bell, and a big motions board on an easel on the steps. Top-left idle: two fresh white scrolls pinned. Top-right busy: a clerk pinning a new scroll, the bell swinging. Bottom-left ALARM: an old brown curling scroll with a little dust cloud, the clock face glowing honey yellow. Bottom-right DONE: a giant rubber stamp coming down from the top of the frame onto a scroll (no hand or person visible), a green stamp mark. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C18. Scroll ageing strip** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Five toy paper scrolls pinned in a row on a wooden board showing age from left to right: crisp white, cream, yellow and curling, brown with a dust cloud, brown with a little ribbon. No text on them, only a small pictogram each. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C19. Courthouse** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A solid toy stone courthouse with four big columns on the front and a scales pictogram on the pediment. Top-left all four columns plain stone. Top-right two columns glowing mint green from the base up. Bottom-left one column cracked with a jagged dark line and a rose glow. Bottom-right all four columns glowing mint green. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C20. Hospital and ambulance** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A white flat-roofed toy hospital with a big plus pictogram on the roof, a ward wing with long windows showing little beds, and an ambulance bay. Top-left idle: empty beds. Top-right busy: three beds with small patient figures with bandages. Bottom-left ALARM: a white ambulance with a rose stripe racing out with its light flashing. Bottom-right done: beds empty and tidy, a small gold star over the roof. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C21. Fire station and rollback** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A toy fire station with red doors, a tall hose-drying tower, two bays, a red fire engine with a ladder, and a rack of small numbered-looking helmets shown only as coloured helmets. Top-left idle. Top-right the fire engine driving out. Bottom-left alarm: a rose beacon on the hose tower. Bottom-right done: firefighters at a shopfront swapping a little display miniature for another. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C22. Museum** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A domed toy museum with a wide stair and banners in pine green, orange, violet and slate blue; the front wall cut away like a dolls' house to show rows of plinths each holding a tiny miniature of a game build; a small spotlight on the newest plinth; little statues on the front lawn; lowered workshop flags hanging in the entrance hall. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C23. Archive** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A low toy stone archive vault with a heavy round door open, inside tall shelves of small drawers stacked very high, one drawer glowing gold-white, an archivist figure filing a drawer, a little mail slot by the door. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C24. Theatre and arcade** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A little toy theatre with a marquee of bulbs over the entrance and a red curtain visible inside, the marquee split into four panels. Top-left only a few bulbs lit. Top-right half the bulbs lit. Bottom-left most bulbs lit. Bottom-right every bulb lit and a small crowd of toy figures at the door. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C25. Bank** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A squat toy bank with a big round vault door, coin stacks visible inside and a small meter dial on the front. Top-left vault ajar, low coin stacks, dial in the green. Top-right taller stacks. Bottom-left ALARM: vault door closed, dial needle in honey yellow, a rose beacon. Bottom-right done: tidy stacks glowing gold. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C26. Toll booth: Harry's yes** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A small toy toll booth with a striped roof, a barrier arm and a small bell at the near end of a stone bridge, with a covered wagon. Top-left WAITING: barrier down, booth lamp honey yellow, the wagon waiting. Top-right YES: a giant rubber stamp coming down from the top of the frame (no hand or person), the barrier lifting. Bottom-left the wagon rolling onto the bridge. Bottom-right NO: the wagon turned round heading back. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C27. Customs house: privacy check** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A neat little toy customs post with a scanning archway over the road, a small lamp on the arch and a flag pole, at the far end of a stone bridge. Top-left idle. Top-right a returning covered wagon passing under the arch, the arch lamp flashing mint green. Bottom-left ALARM: a wagon pulled aside into a fenced bay with its crate open, a rose beacon. Bottom-right a line of wagons passing, all green. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**C28. Bridge depot and wagons** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A toy horse-drawn covered wagon with a canvas cover with a coloured band. Top-left waiting, empty, at a depot. Top-right rolling on a stone bridge. Bottom-left stopped mid-bridge, the toy horse sitting down. Bottom-right coming back loaded with crates. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

#### D. Home Town: machines, residents, university, signs

**D1. Home Town overview** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. The far bank village of the reference diorama, seen alone: a stone windmill with grassy burrow mounds, a rounded silver-grey cottage joined to a big brick furnace, a water tower, a long two-storey boarding house with eight windows and only one lit, a village green with a pond and a small orange fox, a row of cottages growing into villas and a manor, an oval narrow-gauge railway with a tiny station, a small cottage porch with an empty rocking chair and a lantern, a customs post at the bridge end, and a university on a hill behind. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D2. The Forge: cottage and furnace** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A compact silver-grey square toy cottage with rounded corners joined by a short covered walkway to a big brick furnace with a tall chimney, a glowing mouth and bellows, an anvil out front, a conveyor of crates into the furnace and a small easel by the door. No brand shapes. Top-left IDLE: furnace dull, a small orange fox sitting at the cottage door looking at waiting cars. Top-right BUSY: furnace mouth glowing orange, bellows pumping, sparks at the anvil. Bottom-left TRAINING: a glowing pipe of molten metal running from the furnace up a hill. Bottom-right OFF: furnace cold grey with a little nightcap on the chimney. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D3. Water tower: disk space** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A toy water tower on four legs with a round tank, a gauge stripe painted up the side and a red float line low on the gauge. Top-left water level high. Top-right water level just above the red line. Bottom-left ALARM: level on the red line, the tank sweating drops, a rose beacon on top. Bottom-right the same at night with a lamp. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D4. The Dell: one awake at a time** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A long two-storey toy boarding house with eight bedroom windows, four up and four down, each with a small coloured curtain, a front door with a bell. Top-left: one window lit with a small figure at a desk with a lamp, the other seven dark showing sleeping silhouettes in nightcaps. Top-right: a lamp being carried from one window to the next. Bottom-left ALARM: a letterbox at the gate stuffed with empty envelopes, a rose beacon. Bottom-right: a different window lit, a speech bubble with a pictogram floating out. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D5. Traffic jam on Dell Lane** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A toy lane leading to the long boarding house, filled with small rounded toy cars bumper to bumper, tiny honk bubbles, a little figure at the head of the queue holding a round lollipop stop-go sign, and a big clock face on a post at the tail of the queue. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D6. Car park** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A small fenced gravel toy car park with painted bays and a ticket barrier beside a cottage. Top-left empty. Top-right two cars parked. Bottom-left full, with two cars parked on the verge. Bottom-right the barrier up and one car leaving. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D7. The Mill and the tiny experts** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A stone toy windmill with four big sails and a little door, surrounded by grassy mounds with tiny round doors, mouse-sized little figures with round ears and aprons carrying flour sacks, a sack store. Top-left IDLE: sails still, sail cloth tied up. Top-right BUSY: sails turning, millers carrying sacks. Bottom-left ALARM: a rose beacon on the cap. Bottom-right OFF: sails tied, a little nightcap on the cap of the mill, dark. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D8. The fox in the pond** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A small orange toy fox with a white tail tip by a round pond on a village green. Top-left lying curled by the pond. Top-right trotting along a path. Bottom-left sitting at a cottage door with its tail curled round, looking at a row of parked cars. Bottom-right close-up of the fox sitting, friendly. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D9. White smoke** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Two identical toy workshops side by side at dusk: the left one with thin grey chimney smoke, the right one puffing big billowing bright-white smoke that glows slightly, slower and bigger puffs. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D10. Who is speaking: the village green** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A village green in the toy town with about twelve small resident figures standing in a semicircle facing a bridge, each with a different hat or prop (a mortarboard, a pipe, goggles, a long beard and stick, a tripod, a quill, a hard hat, an eyeshade visor, running shoes and satchel, a waistcoat and pocket watch), their heads tinted: most mint green, one rose red, two slate grey, three honey yellow; small speech bubbles with pictograms above some: a star, an empty bubble, three dots, a question mark. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D11. Resident homes by size** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject six times in a 3 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. Toy resident homes in a row of sizes. Cell 1 a round door in a grassy mound. Cell 2 a one-storey cottage with a steep thatched roof and a round window. Cell 3 a two-storey house with a tiled roof and a porch. Cell 4 a two-storey villa with a bay window and a small tower. Cell 5 a three-winged manor with a cupola, gates and a gravel drive. Cell 6 the cottage with all windows dark and a little nightcap on its chimney. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D12. A resident's home up close** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A toy cottage up close: a front garden with three flower beds of different heights, a side weed bed with tall weeds, a report card pinned on the front door shown as a grid of ten coloured squares (mostly green, two honey, one rose), two small trophy cups on the windowsill, a letterbox at the gate, lights on, the resident figure with a quill at the door. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D13. Dolls' house cutaway: diplomas** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. The same toy manor with its front wall slid away like a dolls' house, showing inside: a desk with a lamp, a wall of framed diplomas with green and honey-coloured frames, a shelf of trophy cups, a bed, a resident figure in a mortarboard reading. Warm interior light. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D14. Empty letterbox** (1024x1024, attach A1)

```text
Match the style of the attached reference image exactly. A toy garden-gate letterbox overflowing with blank empty envelopes spilling onto the path, beside a cottage gate. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D15. Removal van: a new resident** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A boxy toy removal van with boxes on a lane by a row of cottages, a new plot with a cottage rising up like a pop-up book, a resident figure carrying a box. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D16. University campus** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A toy university on a raised grassy hill: a clock tower in the middle of a quad, a long lecture hall with arched windows, a domed exam hall with tall shutters, a greenhouse wing with potted plants of different heights inside, a graduation lawn with a little stage, a lane winding down the hill, a glowing pipe running up from a furnace below. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D17. Exam hall: blind tests** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Inside a toy domed exam hall seen with its roof lifted off: two rows of little desks, two candidate figures sitting back to back separated by a tall screen so they cannot see each other, papers flowing to a marker figure at the front, one candidate's desk lamp glowing mint green. Warm light. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D18. Graduation and the resit bench** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A toy university quad with a little stage. Top-left a tiny mouse-sized expert in a mortarboard climbing the stage. Top-right mortarboards thrown in the air with a burst of paper confetti. Bottom-left the graduate walking down a lane with a rolled diploma. Bottom-right a different tiny expert sitting on a bench with a tiny personal raincloud above it. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D19. Greenhouse: training in progress** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A toy greenhouse wing with potted plants. Top-left small seedlings. Top-right plants half grown. Bottom-left plants fully grown with a mint green glow. Bottom-right one plant wilted and drooping with a rose tint. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D20. Night train and Night Halt station** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A small toy steam engine with wagons carrying crates, barrels and sacks on a narrow-gauge oval track with a little station platform with a canopy, a station clock, a timetable board with pictogram slots and a signal box. Top-left the train waiting with a gentle simmer of steam. Top-right departing with a big puff, signal green. Bottom-left LATE: signal honey yellow, the station clock face honey. Bottom-right DERAILED: one wagon tipped on its side next to the track, a rose beacon on the signal box. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D21. Harry's porch** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A small cottage porch with an empty wooden rocking chair, a porch lantern and a little table with a plain glowing slate tablet with no brand. Nobody is there. Top-left lantern off. Top-right lantern lit warm. Bottom-left the slate on the table glowing. Bottom-right a rainbow ending at the porch. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D22. Residents line-up** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A line-up of small toy resident figures on a warm grey background, one of each kind, slightly different sizes: a scholar in a mortarboard, a reasoner with a pipe, a coder with goggles and a toolbelt, an elder with a long beard and walking stick, a surveyor with a tripod theodolite, a writer with a quill behind the ear, a builder in a green hard hat, a clerk with an eyeshade visor, a runner with running shoes and a satchel, a senior in a waistcoat with a pocket watch. Friendly simple faces. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**D23. Tiny experts line-up** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A line-up of mouse-sized toy experts with round ears and aprons on a warm grey background: one with work gloves, one with a bee smoker and a few toy bees, one with a conductor's baton, and five more with simple props (a sieve, a scoop, a lantern, a broom, a magnifying glass). Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

#### E. Weather and time

**E1. Weather: sunshine** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. The near bank of the reference toy diorama under a clear late-afternoon sky with a soft warm rim light, the test yard's lamps all glowing mint green, crisp toon shadows. No clouds. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**E2. Weather: clouds (flaky)** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. The near bank of the reference toy diorama with four flat, high, fluffy toon clouds drifting over the near bank only, casting soft moving shadow patches; the far bank across the river is clear and in full view. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**E3. Weather: storm (failures)** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. The near bank of the reference toy diorama under slate storm clouds with short rain streaks falling only over the near bank, puddles on the square, a single stylised lightning flash, rose beacons on two buildings; the far bank across the river stays dry and visible. Night. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**E4. Weather: rainbow (a real-device win)** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. The reference toy diorama just after rain, a flat ribbon rainbow arching from the glowing gold-white shopfront on the near bank over the river to a small cottage porch on the far bank, without crossing any building. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**E5. Weather: fog lifting** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A toy workshop wrapped in a low pale fog bank. Top-left fully fogged, the outline faint. Top-right the fog lifting upward. Bottom-left the last wisps dissolving. Bottom-right clear with a crisp ink outline and a rainbow starting behind. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**E6. Time of day strip** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. The reference toy diorama from the same camera. Top-left dawn with a peach horizon and street lamps switching off. Top-right daytime, pale blue sky, windows faint. Bottom-left dusk with a navy-to-violet sky and lamps switching on in a ripple from the square. Bottom-right night with stars and a crescent moon, windows glowing. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**E7. Night power cut with lighthouse** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. The reference toy diorama at night during a power cut on the near bank: all windows and street lamps dark, the battery tower empty, builder figures frozen with zZ bubbles, but the lighthouse beam still sweeping over the sea on the right and a small rose emergency lamp pulsing on a crooked little shop. Moonlight. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**E8. Home Town drizzle** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. The far bank village of the reference toy diorama with a tiny raincloud drizzling only over the long boarding house, and a small sunny patch of warm light over the windmill. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

#### F. Characters

**F1. Foreman turnaround** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A turnaround sheet of the toy foreman figure, front, three-quarter, side and back: taller than the builders, a long amber work coat, a hard hat with a small head-lamp, a clipboard and a little whistle on a cord. Warm grey background. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**F2. Builder poses** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject six times in a 3 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A small round toy builder in pine-green overalls and a pine-green hard hat. Cell 1 walking. Cell 2 hammering at a bench with sawdust puffs. Cell 3 carrying a parcel on its head. Cell 4 tapping its foot and looking at a wristwatch. Cell 5 asleep with a nightcap and a zZ bubble shape. Cell 6 handing a rolled scroll to someone off-frame and dissolving into a puff of paper confetti, its hat left on a hook. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**F3. Builder colour variants** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Five small toy builders side by side in overalls and hard hats in pine green, orange, violet, slate blue and clay, each with a small badge with a different pictogram (a tent, a bread loaf, a lantern, a tiny house, a question mark). Warm grey background. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**F4. Celebration** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A toy foreman and three toy builders on a town square hopping and throwing their hard hats in the air in celebration under a small gold star. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**F5. Staff of the town** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. Toy staff figures at work. Top-left a yard inspector leaning out of a little booth with a clipboard. Top-right a postmaster stamping a parcel. Bottom-left a switchboard operator plugging a cable into a little switchboard. Bottom-right a town crier ringing a hand bell on a podium. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

#### G. Vehicles

**G1. Road vehicles set** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject six times in a 3 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. Chunky rounded toy vehicles with no markings. Cell 1 a small red postal van. Cell 2 a white ambulance with a rose stripe and a light on top. Cell 3 a red fire engine with a ladder. Cell 4 a small yellow tow truck with a hook. Cell 5 a honey-yellow repair truck with a ladder. Cell 6 a boxy removal van with boxes. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**G2. Toy cars set** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Six small rounded toy cars in a row, each a slightly different shape (a hatchback, a little saloon, a tiny estate, a mini van, a beetle-like round car, a small pickup), in pine green, orange, violet, slate blue, clay and home green. No markings. Warm grey background. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**G3. Cranes** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Two toy cranes side by side: a little tower crane lowering a roof onto a workshop, and a dockside quay crane lifting a big crate off a barge. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

#### H. Signs, pictograms and markers

**H1. Pictogram sign sheet** (1024x1024, attach A1)

```text
Match the style of the attached reference image exactly. A sheet of thirty-six square toy hanging-sign boards in a 6 by 6 grid, each a painted wooden board with a simple bold pictogram and no letters: hard hat, open book, magnifying glass, envelope, shop awning, question-mark tag, lightning bolt, water drop, parked car, steam train, crossed conveyor, telephone handset, street lamp, ballot box, pushpin, hand bell, scales, plus sign, flame, classical dome, drawer, market stall, theatre mask, coin stack, barrier arm, archway, anchor, lighthouse, anvil, windmill, bed, mortarboard, flower, trophy cup, fox head, white cloud. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**H2. State markers sheet** (1024x1024, attach A1)

```text
Match the style of the attached reference image exactly. A sheet of small toy state markers on a warm grey background: a rose-red cross-shaped beacon lamp on a post, a mint-green round lamp, a honey-yellow half-moon lamp, a slate-grey dark lamp with a nightcap, a gold low-poly star, a string of bunting, a pine-green pennant flag, a little zZ bubble shape, a small speech bubble with a star, an empty speech bubble, a speech bubble with three dots, a speech bubble with a question mark. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**H3. Window and halo study** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. One toy cottage wall with three windows at night. Top-left windows dim amber. Top-right windows bright amber with a soft glow on the wall below. Bottom-left windows gold-white and the brightest thing in the picture. Bottom-right windows black. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

#### I. Moments (for the explainer and the museum)

**I1. Moment: a win night** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A celebratory night in the reference toy diorama: the shopfront blazing gold-white with a gold star above, builders hopping on the square, the town crier ringing his bell, a rainbow arching to the far bank, a barge being unloaded in the harbour. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**I2. Moment: lost property alarm** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. A quiet late night in the reference toy diorama: most of the town dimly lit, one crooked little shop on the near bank with its bell lamp glowing rose red and three abandoned hand-carts with coloured hard hats left on them, the foreman walking towards it with a lantern. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**I3. Moment: graduation day** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. Morning on the university hill of the reference toy diorama: mortarboards flying above the quad, paper confetti, a tiny mouse-sized graduate walking down the lane with a rolled diploma towards the windmill's burrows. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**I4. Moment: a ship arrives** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. The harbour of the reference toy diorama at dusk: a barge with one big crate flying a small green flag docking, the quay crane lifting the crate, the harbour master stamping a pictogram board, a small cart waiting to carry it to a workshop. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

**I5. Moment: the town grows** (1536x1024, attach A1)

```text
Match the style of the attached reference image exactly. The reference toy diorama with a new board tile being slid onto its side on a wheeled dolly, survey pegs with little coloured flags already on the new tile, and a builder figure waving from the edge. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, mint green for success, rose red for alarms, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. Signs use simple pictograms only.
```

---

## 16. Build order for the world (fits the atlas's v1 to v4)

| Step | World work | Data needed | Visible result |
|---|---|---|---|
| **v1.5 (look pass, no new data)** | Shared style module (toon gradient, ink, palette); re-lay the map (3.3); river channel, bridge arches, board edge; shared state parts as InstancedMeshes; glow sprites instead of point lights; tiers and label declutter; wall mode and the phone two-stop camera; clouds kept off Home Town; rainbow from shop to porch | none new | Same data, a recognisable town at a third of the draw calls |
| **v1.6 (models)** | Owner downloads the Kenney kits; bake script remaps palette and adds ink; swap hut, workshops, library, post, shop, Home Town machines; characters from Mini Characters | none new | The concept art's look |
| **v2** | Power station + battery tower + rolling blackout; lost property restyle; car parks, Dell Lane jam with queue clock; night train and Night Halt; sorting office; telephone exchange (wires and beads); street lights as health checks; town hall and motions; road works; lighthouse freshness; fog on unproven items; hills terraces | run reports, limits, queue waits, timetable, merges, message log, page checks, open questions, HANDOVER not-proven lists | Infrastructure that catches stalls, jams and outages |
| **v3** | Resident Row with house sizes, gardens, report cards, diplomas (cutaway), trophies, letterboxes; the green's speakers as figures; Mill burrows; university, greenhouse, exam hall, graduation; museum; fire station; hospital and ambulance; Home Town drizzle | roster, training records, blind tests, credits, Pages history, backups, fixes | Learning made visible |
| **v4** | Harbour, ships, licence board, customs arch; bank; theatre marquee; courthouse columns; market stalls; crier's voice; board tiles and growth animation; paper boats (if wanted); sound upgrade | downloads, privacy checks, cost, play counts, rules checks, order results | The whole atlas |

**Rule for every step: no feed, no building.** A building whose data is not wired yet is not drawn as a working
building. Its plot shows a fenced empty lot with survey pegs and the building's pictogram on a "coming" board. This keeps
the atlas rule ("if we can't measure it, it doesn't go in the town") visible, and the empty lots become a to-do list
everyone can see.

---

## 17. Risks

| Risk | Why it matters | What to do |
|---|---|---|
| **Clutter** | Forty buildings, a hundred walkers and twenty labels can become a "Where's Wally" page that nobody reads from across a room | Silhouette rule, label priority and collision, the director camera, idle buildings visibly calm, at most one alarm beacon per building |
| **Decoration creeping in** | Pretty ambient life (birds, strollers) would quietly break the atlas rule and make quiet look busy | "Motion is data" written into the style module; a test that fails if any animated object has no data binding; the three honest heartbeats instead |
| **Phone performance** | Point lights, shadows and per-object meshes already cost 283 calls on a phone | Tier C budget (120 calls, no shadow map, no point lights), auto-downgrade, perf test in `works-test.js` |
| **Models blocked** | kenney.nl answered 403 to the build machine | Owner downloads the kits once on a normal computer; the town keeps drawn shapes until then; bake into one JS file like Base Camp's `props.js` |
| **ChatGPT style drift** | A hundred images will drift in palette, outline weight and camera | Style key first and attached every time; sheets per building; regenerate whole sheets, never mix cells |
| **ChatGPT adds text or brand-like shapes** | Garbled letters, logo-like marks or recognisable hardware shapes in concept art | Every prompt forbids it; the machines are described by role; reject and regenerate, ask for "remove all text" |
| **Concept art promises more than three.js can deliver** | Painterly concept art next to low-poly Kenney shapes disappoints | Prompts insist on chunky low-poly toys with three-tone toon and ink; concept is a target for silhouette and colour, not for detail |
| **Two looks in one town** | Kenney kits have different proportions and colours | Palette remap in the bake, one material, one ink, one gradient; scale normalised per kit |
| **Misreading calm** | A broken feed looks like a quiet day | The lighthouse shows data freshness; the clock moves; stale data dims the whole town 10% and says so on the label |
| **Missing home data** | Run reports from Home Town are not live yet (the wall is "sample values") | No feed, no building; Home Town buildings show "sample" pictogram until the feed is live |
| **Privacy** | Residents, rooms, the owner | Harry never shown as a person; no room photos anywhere in the world; the customs house counts privacy hits but never shows them; labels keep the existing `clean()` filter |
| **Motion sickness and distraction on the projector** | A constantly moving camera in a dark room is tiring | Director camera moves at most once per 10 s, slow eases, `prefers-reduced-motion` honoured, wall mode can pin the master shot |
| **Sound annoyance** | A busy day could ring all evening | Off by default except wall mode, rate limit, priority queue, quiet hours |
| **Growth past the board** | Months of branches and residents | Plots and tiles up to 3 x 3, closed workshops removed after 14 days, an "archive town" view beyond that |
| **Scope** | This plan has ~45 buildings and signs | Strict phase order (16), shared state parts so each new building is mostly a model plus a data binding |

---

## 18. Open questions for the owner (taste only)

1. **Which way round?** Home Town on the far bank behind the Works (recommended, a model-railway view), or side by side
   (left and right) so both banks are equally big on screen?
2. **What are the toys made of?** Painted wood and soft plastic (recommended, tidy and readable), or Base Camp's
   household rubbish style (bottle tops, matchboxes) at town scale?
3. **Ink line weight**: bold cartoon outline, or fine and delicate?
4. **Time of day**: follow the real clock (recommended, with a readability floor), or always dusk as in the mock-up?
5. **Harry in the town**: a porch lantern and a giant rubber stamp (recommended, nobody shown), a toy figure that does not
   look like anyone, or nothing at all?
6. **Builders when they finish**: pop into paper confetti and leave their hat (recommended: they forget), or walk home to a
   builders' hostel and sleep?
7. **Residents and tiny experts**: little people for residents and mice for tiny experts (recommended, a nod to Base
   Camp), or all mice, or all people?
8. **District colours**: pine green Base Camp, orange B&B, violet Vigil, slate blue Works. Keep or change?
9. **Weather strength**: gentle (clouds and light rain, a soft flash) or dramatic (thunder, puddles, wind)?
10. **Rainbow**: 2 hours after a real-device win, or until the next storm?
11. **Paper boats** on the river for messages that crossed: a nice touch or one thing too many?
12. **Sound on the wall** by default: yes (recommended) or silent unless switched on?
13. **Name for the far bank**: "Home Town", "Harry's town" (as now), or something the town picks itself?
14. **Day button**: keep the "Daylight" button for audiences, or let the clock decide?

---

## 19. Top 10 recommendations, ranked

1. **Adopt two laws as the art direction: "motion is data" and "brightness is proof"**, plus "no feed, no building".
   They keep the atlas honest, fix the town's own verdict ("shows talk better than finished work") with light rather than
   words, and decide hundreds of small questions for every builder.
2. **Re-lay the map around the flow of work**: Works bank in front with the shop window front and centre facing the
   camera, the square and foreman in the middle, project districts as wedges, the yard and post office between workshops
   and the bridge, one bridge with the toll booth (Harry's yes) on the Works end and the customs house (privacy) on the
   Home end, Home Town on the far bank, harbour at the river mouth (section 3).
3. **Use the games' exact look**: `MeshToonMaterial` with Base Camp's 3-step gradient (110, 190, 255), the inverted-hull
   ink outline in `#2b1d2e`, one shared vertex-colour material, chunky CC0 models baked and palette-remapped the way Base
   Camp's `props.js` was made (section 2, 14).
4. **One shared state language** (idle, busy, alarm, done, off, fog) drawn by shared instanced parts (window panes,
   halos, beacons, stars, bunting, smoke, fog, flags), so every building reads the same way and forty buildings cost a few
   draw calls (section 5).
5. **Rebuild for performance before adding buildings**: drop the 12 point lights for emissive panes and halo sprites,
   instance everything repeated, merge static scenery per tile, three tiers with auto-downgrade, and a perf check in
   `works-test.js` (budget 300 / 200 / 120 calls against today's 415) (sections 12, 13).
6. **Give Home Town real character from the real machines**: the Forge (a small rounded cottage and the Radeon furnace),
   the Dell boarding house with exactly one lit window and the lamp carried between rooms, the Mill with mouse-sized tiny
   experts, the water tower as disk space, the fox walking to the idle machine's door (section 6.6, 6.8).
7. **Grow on plots, never move what exists**: workshops built in visible stages with the branch's life, residents
   arriving by removal van, university wings per training programme, new board tiles slid onto the table when a ring
   fills (section 4).
8. **Make the stall-catchers unmissable**: the rolling blackout on a power cut, the lost property bell with abandoned carts
   and hats, the lighthouse for data freshness, the night train on time or late, the jam with its queue clock. These are
   the parts that would have caught 15 Nov (sections 6.2, 6.5, 7.3).
9. **Fix the frame**: clouds and rain only over the Works bank and never between the camera and Home Town, the rainbow
   from the shop window to Harry's porch, slimmer panels and a wall mode with a calm director camera, and a phone view
   with two stops joined by the bridge (sections 7, 12).
10. **Run the concept art as a pipeline**: make the style key A1 first, attach it to every other prompt, use state sheets
    per building, no text in any image, save as `concept/<id>-<name>.png`; 91 ready-to-paste prompts in section 15.3
    cover every building and sign in the atlas.
