# PatchTown Works: the master plan

**What this is.** One plan for PatchTown Works, the live 3D toy town that shows how an AI game studio really works:
the foreman (the main cloud AI), the builders (helper AIs), the workshops (branches), the inspection yard (tests),
the shop window (live games), and Harry's home town of local models across the bridge.

Harry: *"this is an operating system, so people can actually see how AIs work."* And: *"it doesn't need to be
condensed... we need to get all the planning in first."* So this plan is long on purpose. Read section 0 first.
Everything else is reference.

**Where it came from.** Five planners each wrote a full plan on 16 Nov 2026, each with one lens:

| Plan | Lens | Kept in full at |
|---|---|---|
| 1 | Data honesty, the ledger, the truth audit | `games/works/plan/1-data.md` |
| 2 | Reading at a glance, the projector, alarms, sound | `games/works/plan/2-glance.md` |
| 3 | AI operations: 30 real failures, 18 failure patterns, the control room | `games/works/plan/3-ops.md` |
| 4 | Teaching the public, privacy, a product | `games/works/plan/4-public.md` |
| 5 | The world: map, art, buildings, performance, 91 image prompts | `games/works/plan/5-world.md` |

A checker read all five and the project's own files, settled every disagreement (Appendix A), checked every claim
about our project against the files (Appendix B), and merged the rest here. Nothing of substance was dropped; true
duplicates were removed. Large parts are kept in the planners' own words. Each such part starts with a line saying
where it came from. **Inside those parts, "section 3.8" and the like point to that planner's own plan**, not to this one.

**Companion files (same folder):** `DECISIONS.md` (just Harry's decisions), `IMAGE_PROMPTS.md` (the image prompts in
order), `STRESS_TEST_PROMPT.md` (a prompt for ChatGPT to attack this plan).

**Words used everywhere:**

| Word | Means |
|---|---|
| Foreman | The main cloud AI session that plans, hires, checks and deploys |
| Builder | A helper AI hired by the foreman for one job. It gets a brief, works, reports, then is gone |
| Workshop | A branch in git: a separate copy of the code where one job happens |
| Inspection yard | The automatic tests |
| Shop window | What is live on GitHub Pages |
| Home town | Harry's own machines and their local models (the Mini, the Radeon card, the Dell, the Mill) |
| Bridge | The one way work goes between the cloud and the home town (today: Harry pasting) |
| Ledger | `games/works/ledger.jsonl`: one line per real event. The town's diary |
| Trust | How we know a ledger line is true: measured, reported, typed or sample |
| Lamp / Bell / Call | The three alarm levels: shown only / needs action today / needs Harry |
| Hook | A small script that Claude Code runs by itself when something happens (a builder starts, a commit is made) |
| SHA | The short code that names one exact commit, e.g. `9748c8f` |
| Draw call | One "please draw this" message from the page to the graphics chip. Fewer means smoother |
| v1, v1.1, v1.5, v2 ... | Versions of the town, in build order (section 8) |

---

## 0. One-page summary for Harry

**The answer first.** The town is a good idea and v1 already works: a real diary (the ledger), live GitHub, a replay,
lost property, weather from the tests. But in places it still shows **talk better than finished work**, and some
signs are not yet true. The plan fixes truth first, then reading at a glance, then looks, then adds buildings.

**What all five planners agree on**

1. **Measured or not shown.** Every lamp, cart and cloud comes from a real line with a source and a time.
2. **Brightness is proof.** Finished, checked, live work is the brightest thing on screen. Talk is dim.
3. **Motion is data.** Anything that moves means something real is happening. Nothing moves for decoration.
4. **No feed, no building.** A building without data is an empty plot with a "coming" sign.
5. **Silence is a signal.** A builder that has gone quiet turns amber, then red, by the page's own clock.
6. **Nobody marks their own work done.** A test, another AI or Harry must check it.
7. **Privacy first.** The repo is public. Nothing personal goes in. People are counted, never tracked.

**The 5 biggest findings**

| # | Finding | Fix |
|---|---|---|
| 1 | A builder was dead for **19 h 52 min** on 15 to 16 Nov and nobody noticed. | Heartbeats, a stall alarm the page works out itself, and a watcher outside the session. |
| 2 | Typed and measured lines looked the same; a pass on an old build could hide a fail on a new one. | `trust` on every line (done in v1), lamps per build, typed lines drawn pale. |
| 3 | 5 orders went to the home town; **0 results** were logged. Wagons just vanished. | Track every wagon: order, quote, go, result. |
| 4 | Six pictures were marked "done" and none showed what was asked. A checker said "no bugs" to all 70 pieces. | Claim and check: brown box until someone else checks; gold when checked. Test the checkers with planted answers. |
| 5 | The page is hard to read across a room: about 40 bits of text, tiny labels, and too many draw calls. | One mood sentence, type sized for a projector, a still camera, and a performance rebuild before new buildings. |

**What gets built, in order** (details in section 8)

| Version | What | Needs Harry? |
|---|---|---|
| **v1 (now)** | The town as being built: ledger with `trust`, replay, lost property 45 min / 2 h, weather, test lamps per branch. | No |
| **v1.1 (next 2 to 3 days)** | Truth and glance fixes: ledger checker, lamps per build, mood line, projector type, still camera, freshness strip, no endless pulsing, Harry's question board, order tracking, heartbeats in builder briefs. | No |
| **v1.5 (about a week)** | Look and speed: the toy-diorama style, the new map, shared parts, no point lights, three device tiers. | Yes: download the free model kits |
| **v2** | Infrastructure that catches problems: power cuts, jams, the night train, paired test runs, report cards, the control room. Automatic ledger lines. | Yes: hooks and a snapshot workflow (security) |
| **v3** | Learning made visible: residents' homes, the university, checks on checkers, postmortems, the first public story. | Some |
| **v4** | The harbour, customs, bank, crier's voice, the public site, the classroom pack. | Yes: what goes public |

**Your decisions** (full list in section 9 and `DECISIONS.md`). Each has a recommended default. The top five:

1. **Security:** switch on Claude Code hooks so the town writes its own diary? *Default: yes, after a one-week dry run.*
2. **Security:** let a GitHub workflow publish one `town-state.json` snapshot? *Default: yes.*
3. **Security:** the repo is public. Keep it that way, or move work to a private repo and publish a clean public town? *Default: keep it for now; decide before any public launch.*
4. **Downloads:** the free Kenney model kits for the new look (you download them; the build machine is blocked). *Default: yes.*
5. **Money:** a scheduled check every 30 minutes that wakes a fresh foreman only when something stalls. *Default: yes (it uses a little of the plan, only when it fires).*

**What changed from the five plans** (Appendix A): 42 disagreements settled. The big ones: stall alarm 45 min / 2 h now,
20 / 60 min once heartbeats exist; colour-blind-safe state colours; no endless pulsing; a still camera on the wall;
AIs drawn as faceless wind-up toys; storm only for real trouble; sound soft and silent at night.

**What was corrected** (Appendix B): the alarm pulse rate, "7 of 72 sparks" (really 7 of 144), the build 29 live time,
the draw-call count (our own count is higher), and an unverified "usage limit on 15 Nov".

---

## 1. Principles: the laws of the town

These are the laws. Every builder follows them. When a detail later in this plan seems to break one, the law wins.

### 1.1 The seven laws

| # | Law | What it means in practice | Where it came from |
|---|---|---|---|
| 1 | **Measured, or not shown** | A sign may be drawn only if we can name the file, API or hook that produced it, and the time it was true. No source: no sign, or only "we don't know". | The atlas; P1's four-test check (section 3.1) |
| 2 | **Brightness is proof** | The brightest things on screen are always finished, checked, live work (gold-white). Busy is warm and quieter. Talk (messages, plans, steps) is thin and dim. Failed things go dark. Brightness order = truth order, so it still works in greyscale. | The home town's own verdict ("it shows talk better than finished work"); P2, P5 |
| 3 | **Motion is data** | Anything that moves, glows, smokes, rings or changes colour means a real number or a real event. Static scenery (trees, fences, the board's edge) may simply be pretty. No birds, no strollers, no random cars. A quiet town is quiet: that is information. | P5, P2 |
| 4 | **No feed, no building** | A building whose data is not wired yet is not drawn as working. Its plot shows a fenced empty lot, survey pegs and a "coming" board with its pictogram. The empty lots become a to-do list everyone can see. | P5 |
| 5 | **Privacy first** | The repo is public, so the ledger is public. Nothing goes in that we would not show strangers. No names except "Harry". No places, rooms, routines, addresses, secrets or pictures of the home. People are counted, never tracked. Residents' words stay untouched, with credit. | Owner rules; P1 section 5.6; P4 section 9 |
| 6 | **Silence is a signal** | A worker that has not been heard from turns "late", then "lost", by the page's own clock, so the alarm works even when every writer is dead. Stale data looks stale (haze, a grey freshness strip, a stopped lighthouse), never like sunshine. | P1, P3 |
| 7 | **Nobody marks their own work done** | A claim is a brown box until a different checker (a test, another model, the foreman, or Harry) checks it. Only checked work glows. | P3; MAST and Anthropic's maker/judge split |

### 1.2 Two ladders: "how do we know?" and "how done is it?"

**Data trust** (on every ledger line, field `trust`):

| Level | Meaning | Drawn as | Public label |
|---|---|---|---|
| `measured` | Written by a program at the moment it happened, from a machine signal (exit code, git, GitHub, a hook) | Full colour; may glow if it is proof | "counted" |
| `reported` | Written by an AI or a run report about its own work, with numbers, close to the time | Full colour, no glow until checked | "reported" |
| `typed` | Written by hand afterwards, from notes or memory; times often rounded | Pale, dotted outline, "typed" on its card | "from notes" |
| `sample` | Example values for layout only | Grey, the word SAMPLE, never animated | "example" |

**Work proof** (drives brightness):

| Step | Meaning | Look |
|---|---|---|
| Claimed | A maker says it is done | Plain brown box, unlit |
| Checked | A different checker confirmed every claim | Wrapped and warm |
| Live | Deployed, and a probe saw the page load with the right build | Bright |
| Proven on a device | Worked on Harry's real iPad | Brightest, gold-white; the fog over it lifts |

### 1.3 Design principles for the control room (from P3, kept as written)

1. **Alarm on symptoms, not guesses.** Google's SRE book says page on what the user feels, using four signals: latency,
   traffic, errors and saturation. Here: how long work takes, how much work arrives, how much fails or comes back
   empty, and how full each machine and queue is.
2. **Every alarm points at one action.** If no one can do anything about it, it is a dashboard number, not an alarm.
3. **Silence is a signal.** A worker that has not been heard from is "late", then "lost" (a dead man's switch: a period
   plus a grace time).
4. **Nobody marks their own work done.** A different seat, a test or Harry must check it.
5. **Limit work in progress.** Fewer things at once finish sooner (Little's Law). The log already found this: "at most
   2 builders, so tests stay honest".
6. **Compare against the last good build, under the same load.** The side-by-side habit (F7), made a rule.
7. **Small briefs beat big ones.** Agents finish short tasks far more reliably than long ones; vague briefs make
   helpers duplicate each other's work.
8. **Write it down or it did not happen.** Context is lost on every restart. The ledger and git are the memory.
9. **Blameless postmortems.** Find the cause in the system, not the agent.
10. **Harry's time is the scarcest resource in town.** Batch his questions, show their age, and never ask what can be
    found by looking.
11. **The town's own rule: a real number or a real event, never decoration.**

### 1.4 Rules for reading (from P2)

- The town must answer one question in **5 seconds**: "Is it fine, and does anything need me?"
- A lower tier can never be louder than a higher tier (louder = bigger, brighter, faster or making sound).
- Every state is coded three ways: **shape, a colour-blind-safe colour, and a word.** Never colour alone.
- Nothing loops for ever. Alarms never flash.
- Plain words, digits, "9 of 10" not "9/10", sentences of 12 words or fewer, lead with what failed.

### 1.5 Rules for showing AIs (from P4)

- AIs are **tools, not people**: wind-up toys with no faces, no feelings, no human names.
- Verbs: "was given", "ran", "returned", "stopped". Never "thought", "wanted", "felt", "forgot" (except in quotation
  marks with an explanation).
- Show failures as plainly as wins. Show ratios, never only highlights.
- Every toy has an **X-ray** switch that shows the real line underneath.

### 1.6 The owner's rules (unchanged)

- Ask Harry only about **money, security, deleting, downloads and taste.** Decide everything else and show the result.
- Silence on money, security, deleting or downloads means **no**.
- Nothing personal anywhere. No real brands or landmarks. Residents' words untouched, with credit.
- At most 2 builders at a time. One heavy job per home machine. Nothing is deleted.

---

## 2. The world: map, districts, buildings, signs, states, weather, characters, vehicles, sound

Mostly plan 5 (the world), with the decisions of Appendix A applied: Okabe-Ito state colours, alarms that settle once and then hold, faceless wind-up figures, storm and rainbow rules, a still camera by default, and the merged state language. The data behind each building (what feeds it, how it can lie) is in section 3.4. The page today is described in section 2.1; its cost in section 7.1.

### 2.1 What the town looks like today (v1), and what to keep

*From plan 5 (world), section 1. References like "section 3.8" inside this part point to that plan.*

| Picture | What works | What does not |
|---|---|---|
| `shot-big.png` (mock-up, 1600 x 900) | Warm dusk, glowing windows, readable pill labels, the bridge leading the eye to Home Town, the windmill silhouette | Every building is the same box and pyramid roof: you cannot tell the yard from the library without the label. Roads are flat tan ribbons crossing at odd angles. The yard is a purple tray. Panels cover about 40% of the picture. |
| `shot-phone.png` (400 x 860) | Labels still readable | The scene is almost hidden: the title plate and the diary cover about 75% of the screen. One building and a half are visible. |
| `w3-storm-1805.png` (live v1) | Weather from the tests works; the rainbow reads as "a win"; shop stall with goods; parcels at the post office | The storm clouds are big grey balls that **hide Home Town**; the rainbow slices through the bridge; the labels for Home Town overlap each other ("Harry's town" on top of "Radeon"); the yard lamps read as white balls, not green and red. |
| `w6-harry-town.png` (live v1) | The pond and fox, the residents' heads on the green, the long bridge | Home Town is four identical houses; the residents' heads are pins; the card covers half the town. The cloud sphere sits in the camera's face. |

#### Keep

- The dusk palette and the CSS tokens (`--night #18233a`, `--lantern #ffb44a`, `--moss #7fd18b`, `--rose #ff7a85`,
  `--gold #ffd76a`, `--mini/--dell/--mill`). They become the world palette too (section 2.4).
- The pill labels (DOM, clickable, readable on a projector).
- Walkers from ledger events, parcels per commit, wagons per open order, yard lamps per suite, the fox, white smoke,
  rainbow after a win, lost property carts and alarm. Every one of these is already "motion is data".
- The three.js r128 page, the CDN versions, the `?offline`, `?now=` and `__works` test hooks, the `HOOKS` slots and the
  `assets/models.json` swap path.

### 2.2 Art direction: "the workbench diorama"

*From plan 5 (world), section 2. References like "section 3.8" inside this part point to that plan.*

#### The idea in one paragraph

The town is a model railway layout that someone built on the studio's workbench out of toy kits. It sits on a thick
rounded wooden board (you see the board's edge, with soil and stone layers painted on the cut side, like a cake slice).
Everything on it is a chunky toy: rounded edges, slightly too-big doors and windows, painted wood and soft plastic, no
fine detail. Lit at dusk by a warm lamp. It is the grown-up sibling of Base Camp (whose colonists live at creature scale
among household rubbish): same toon shading, same ink line, same toy honesty, but at town scale and tidier, because its
job is to be read across a room.

#### Five style rules

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
   amber at most 75% strength. Talk is thin. Alarm is vermilion, steady after one short settle, and small (one beacon, never a whole red building; the failed building itself goes dark).

#### Materials

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

#### Palette (hex)

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

**State colours** (decided in Appendix A, #4; the full table is in section 2.5): busy orange `#E69F00`, done bluish green
`#009E73` with the proof glow gold-white `#fff1c8` to `#ffd76a`, alarm vermilion `#D55E00`, needs Harry sky blue `#56B4E9`,
flaky / waiting honey `#f2b660`, asleep / off slate `#5d6f8c`, not proven grey `#8E93AB`. (P5 first proposed moss `#7fd18b`
and rose `#ff7a85`, the v1 page colours; those drift together for colour-blind viewers.)

Colour-blind safety: every state also has a **shape** (section 6.2): a pass lamp is round, a fail lamp is a cross-shaped
beacon, flaky is a half-moon, asleep has a nightcap. Never colour alone.

#### Lighting rig

- One hemisphere light (sky colour over ground colour) and one directional "lamp" (the sun or moon) with one shadow map.
- **No point lights for lamps and windows.** Each glow is an emissive pane plus a soft additive halo sprite on the ground
  or wall. At most four real point lights on desktop, used only for moments that move: the ambulance, the fire engine,
  the lighthouse beam, a win flare. Phones get none.
- Light comes from the upper left of the default camera, so shadows fall towards the viewer's right and the river side
  stays bright.

#### Camera and composition

- Perspective camera with a **narrow lens (FOV 28 to 32)**, pitched 35 to 40 degrees down: it flattens the view towards
  the classic diorama or isometric look without needing an orthographic camera, and keeps buildings upright.
- Default "master shot": looking north over the Works bank, across the river, to Home Town and the university hill
  behind. The bridge sits on the vertical centre line, the shop window sits front and centre (nearest to the viewer,
  brightest), Home Town fills the top third.
- Orbit limited to a 140-degree arc around the south (the town's "front"), pitch 25 to 60 degrees, so the board edge is
  never seen from behind and labels never face away.
- Panels are slimmer than today (see 12.3), so the master shot is at least 70% of the projector picture.

### 2.3 Geography: the map

*From plan 5 (world), section 3. References like "section 3.8" inside this part point to that plan.*

#### The big map

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

#### Why this layout

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

#### Coordinates (for the builder)

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

#### The river

- A real channel cut into the board: banks drop 0.4 units to the water, with stone edging on the Works side (built,
  orderly) and reeds and grass on the Home side (homely).
- Water is a scrolling toon surface with three bands of blue and white foam rings round the bridge piers and the harbour
  posts. It flows east, towards the sea: "work leaves home, crosses, and the outside world is downstream".
- Upstream (west) the river comes out of a little waterfall from the board's west edge, under the power station's
  pylons.
- **Data:** the river itself carries nothing (static scenery). Things *on* it do: ships (downloads) in the harbour, and,
  optionally later, little paper boats drifting downstream for every message between AIs that crossed home (see 10).

#### Districts

- Each project is a wedge with a **gate arch** where its road leaves the square: two posts, a crossbar, the district's
  colour, and one pictogram (Base Camp: a tent; B&B: a baguette crossed with a cannon; Vigil: a lantern; Works: a tiny
  house). The arch is the district's name tag in the world; the DOM label says the name.
- Workshops in a district have roofs in the district colour; builders working there wear hats in that colour.
- A district's ground is **raised by its hills value** (3.6) in gentle terraces, so harder projects literally sit on
  harder ground.
- Branch names choose the district: `game/bc-*` -> Base Camp, `game/bb-*` -> B&B, `game/vigil*` -> Vigil,
  `game/micro-precinct` -> Works. Anything else -> new-project plots along the front edge (clay roofs) until the
  foreman names it.

#### Hills: how hard a part is

- **Data** (decided, Appendix A #21): per project, over the last 14 days, measured test failures and reruns per suite,
  plus the open-to-close time of `bug` / `fix` pairs. Not commit messages (they are talk). Normalise against the median
  project.
- **Drawn as:** terraced ground under that district, 0 to 3 steps, each step 0.35 units high with a stone retaining wall
  (toy terraces). The road climbs with a little ramp. A district that becomes easy sinks back one step per quiet week, so
  hills change slowly and are worth reading.
- **On Home Town:** the same idea for each machine: rework on the Dell (retries, empties) raises the Dell's yard.
- The far backdrop hills (behind the university) are scenery only.

#### Fog: never tried on a real device

- **Data:** the "not proven" lists in each project's `HANDOVER.md` (and `?dev` field reports that later prove things).
- **Drawn as:** a low, soft fog bank sitting **on top of the specific workshop or shop item** that is unproven: 6 to 12
  big, pale, slightly blue instanced puff-billboards that drift slowly and hug the ground. It thins as items are proven
  (one puff removed per proven item). A building inside fog loses its ink outline (outline alpha 0.3) so it literally
  looks unsure.
- Fog never covers the whole town; the scene-wide `THREE.Fog` is only for depth (far edge softening) and is subtle.
- When a real-device win arrives (`win` from Harry's real device), the fog over that thing **lifts upwards and dissolves**
  over 4 seconds, and that is the moment the rainbow starts.

#### Roads

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

#### The board edge and the backdrop

- The board's cut edge is visible at the front and sides: wood plank with painted soil and stone layers, a tiny brass
  plate (blank, no text) at the front centre. It frames the projector picture like a stage.
- Behind Home Town: soft painted backdrop hills in two layers and a gentle fog wall, so the world does not end in a hard
  line. Sea to the east fades to sky.
- When the town grows, extra board tiles slot onto the edges (section 4.5), with a visible seam that heals after a day
  (the seam is the "new ground" signal).

### 2.4 How the world grows

*From plan 5 (world), section 4. References like "section 3.8" inside this part point to that plan.*

#### Plots

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

#### A workshop's life (a branch's life)

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

#### Residents' homes (Home Town)

| Event | Data | What you see |
|---|---|---|
| New model on the roster | town roster (run reports) | A removal van drives from the bridge to the next free plot on Resident Row; the house rises in 3 seconds (pop-up book style), the resident walks in |
| Bigger model replaces a smaller one | roster | House swaps type (cottage -> manor) with a scaffold day |
| Model removed from the roster | roster | "For sale" pictogram board, windows dark; after 7 days the plot is empty |
| Moved machine (e.g. Radeon Clerk "moved, not heard") | wall | A removal van stands outside with boxes; house window has a question-mark pictogram until it is heard |

#### The university campus

The university starts as a single **Lecture Hall** (the trainer) and the **Exam Hall** (evals). Each new training programme
(a new tiny expert or a tuning run) adds a **wing** or a greenhouse to the campus on the hill: the greenhouse holds the
students growing (training in progress: plants growing in pots, height = training progress). The quad gets a new bench
for each graduate; a graduate walks down Campus Lane carrying a rolled diploma to their house or burrow.

#### Board tiles

- The board is made of large rounded tiles: v1 board = centre tile (Works), north tile (river + Home Town), east tile
  (harbour), and later the hill tile (university).
- When any plot ring is 80% full, the next tile is "delivered": it slides in from the side of the table on a little
  dolly over 5 seconds (an event worth watching on the projector), the seam shows for a day.
- Maximum planned: 9 tiles (3 x 3), about 190 x 210 units. Past that the town should split into a second view (an
  "archive town" of old projects) rather than shrink everything.

#### Growth stages, as pictures

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

### 2.5 The shared state language (merged from P2 and P5)

Every building, sign and lamp uses the same states. The parts that show a state (window panes, roof beacons, chimney
smoke, bunting, flags) are shared, instanced parts, so forty buildings cost a handful of draw calls.

**Six states and two overlays**

| State | Colour (Okabe-Ito, colour-blind safe) | Shape | Light | Word | Windows | Roof / chimney | Rule (when) |
|---|---|---|---|---|---|---|---|
| **Idle** | building's own colours | none | windows amber at 30% | "quiet" | dim | no smoke | No event here for 45 min |
| **Busy** | orange `#E69F00` trim | a moving figure, smoke | soft, slow | "working" | amber 75%, a moving silhouette | grey smoke, rate = events per hour | An event here in the last 45 min |
| **Done** (proof) | gold-white glow `#fff1c8` to `#ffd76a`, bluish-green `#009E73` trim | tick flag, bunting, small gold star | **brightest**, steady | "went live" / "pass" | gold-white 100% for 2 h, then fades to idle over 2 h | bunting, star | `deploy` + probe ok, `win`, checked `result`, or a passing test here |
| **Alarm** | vermilion `#D55E00` | a cross-shaped beacon, a cross flag | windows go **dark**; the small beacon settles once (1.5 s) then stays steady | "fails" / "stopped" | dark | smoke stops | A `fail` here in the last 6 h, a failing suite on this branch's head, or the building's own alarm rule |
| **Needs Harry** | sky blue `#56B4E9` | a bell | steady; one gentle rise when it first appears | "needs you" | as underlying state | a small blue bell on the sign | An open `ask` that blocks work here |
| **Off** | slate `#5d6f8c` | a nightcap, a dark power pictogram | none | "off" / "asleep" | black | none | Power cut, machine asleep or restarted |
| *Fog* (overlay) | desaturate 40%, pale blue puffs | ink outline faded to 30% | dim | "not tried on a device" | as underlying | as underlying | Item on a "not proven" list |
| *Old data* (overlay) | sepia tint | a small clock badge | none | "as of 16:35" | as underlying | as underlying | Data older than its expected rhythm, or `sample` |

**Priority when two apply:** off > alarm > needs Harry > done > busy > idle. Fog and old data lie on top of any of
them. **White smoke** (something rebuilt that already existed) replaces grey smoke for 24 h.

**Why this works in greyscale:** done is the brightest, alarm is dark, the rest sit between. The order of brightness
is the order of truth.

**Machine colours** stay as identity colours for the home town (Mini/Forge `#6aa6e8`, Dell `#6fbf8f`, Mill
`#e0a15a`), always with the machine's name beside them. Never reuse vermilion or sky blue as an identity colour.
District colours (pine green, crust orange, lamp violet, slate blue, clay) are identity too, never state.

**Check:** run every mode through Chrome DevTools "Emulate vision deficiencies" (protanopia, deuteranopia, tritanopia,
achromatopsia) and keep a screenshot of each in `shots/`.

#### The shared state parts

*From plan 5 (world), section 5.1. References like "section 3.8" inside this part point to that plan.*

| Part | Shape | Instanced? | Count budget |
|---|---|---|---|
| Window pane | Rounded quad with a cross mullion | One InstancedMesh for the whole town, colour per instance | 600 |
| Window halo | Soft additive quad on the wall beneath | One InstancedMesh | 600 |
| Roof beacon | Cross-shaped lamp on a short post (vermilion) | One InstancedMesh | 60 |
| Gold star | Low-poly star, slowly spinning | One InstancedMesh | 20 |
| Bunting | A string of 7 triangles between two points | One InstancedMesh of triangles | 400 triangles |
| Chimney smoke puff | Toon sphere, alpha | One InstancedMesh, colour per instance (grey or white) | 300 |
| Fog puff | Big soft billboard | One InstancedMesh | 200 |
| District flag | Pennant on a pole, vertex-wave in the shader | One InstancedMesh | 60 |
| Pictogram sign | Hanging board with an icon from an atlas texture | One InstancedMesh with a texture atlas offset per instance | 80 |
| Nightcap / asleep marker | Little cap on the ridge | One InstancedMesh | 60 |

### 2.6 The buildings, one by one

*From plan 5 (world), section 6. References like "section 3.8" inside this part point to that plan.*

Each entry: **where**, **what it really is** (atlas), **silhouette and signature prop**, **states**, **data**, **phase**
(v1 to v4 in the atlas's build order). "Idle, busy, alarm, done, off, fog" follow section 5 unless the entry says otherwise.
Pictograms are listed in brackets.

#### The Works bank: the core (v1, restyled)

**Foreman's hut** (square, centre). The main AI session.
- Silhouette: a round-ish timber lodge with a big porch, a lantern on a hook, a tall stone chimney, a **hat rack** by the
  door and a big table under the porch roof with rolled plans. [pictogram: a hard hat]
- Hat rack: one hat per builder hired today (district colours). When a builder finishes, it walks back and hangs its
  hat (it forgets; the hat stays as the count).
- Busy: the foreman paces the porch, unrolls plans; smoke. Alarm: the foreman stops still with a vermilion beacon (the main
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
  that found blockers: the dome lamp turns vermilion).
- Data: `where: library` ledger lines, review findings sorted into do now, later, no (three shelves: green, amber,
  slate).

**Inspection yard** (east of the square). The test suites.
- Silhouette: a fenced yard with a canopy roof on one side, a raised inspector's box with a striped barrier, and **one
  lamp post per suite** in rows. The posts carry real lamp heads: round green (pass), cross-shaped vermilion (fail), half-moon
  honey (flaky). [a magnifying glass]
- Busy: a cart (a build) rolls through the barrier, the inspector leans out with a clipboard, lamps blink in sequence.
- Alarm: any fail: the barrier stays down and the cart waits; the yard canopy beacon lights (steady). Done: all green: a short
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
- Alarm: the bell lamp swings and glows vermilion; a single bell stinger. Done: when the foreman picks a cart up ("picked up
  from lost property"), a tow truck tows it back to its workshop.
- Data: `start` without `end` (the existing `lostProperty()` rule). This is the building that would have caught the
  15 Nov overnight stop, so it gets a strong silhouette and a guaranteed label when alarmed.

#### Infrastructure (v2)

**Power station** (west riverbank). Compute: cloud session time and home machine time.
- Silhouette: a stout brick hall with **two chimneys** (one for cloud time, one for home time), a row of transformers
  out front, and a tall **battery gauge tower**: a glass column with ten stacked cells that light from the bottom (budget
  left today). Pylons carry a line across the river to Home Town. [a lightning bolt]
- Busy: both chimneys smoke in proportion to session minutes this hour; the turbine hall's windows hum.
- Battery gauge: cells lit = share of today's budget left, **from Harry's last plan-meter reading, drawn pale (typed) with its age; "unknown" after 24 h** (Appendix A #20). Below 2 cells the top cell turns honey (steady). The reset time is on
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

#### Weather and sky (v2): see section 7.

#### Civic buildings

**Town hall** (square, north side, facing the hut). Decisions waiting on Harry.
- Silhouette: a two-storey civic building with steps, columns in toy style, a **clock tower** with a bell, and a big
  **motions board** on an easel on the steps. [a ballot box]
- Motions: one scroll pinned on the board per open question. Scrolls **yellow and curl with age** (fresh: white; a day:
  cream; three days: yellow and curling; a week: brown with a dust cloud). The oldest one gets a little ribbon.
- Busy: when a new question is posted, the clock bell rings once and a clerk pins it. Done: when Harry decides, the scroll
  is stamped (the big rubber stamp comes down from the sky: Harry's hand, no person shown) and carried to the archive.
- Alarm: a decision blocking work for over 24 hours: the clock face glows sky blue and the crier reads it in the next
  bulletin (a Bell); over 48 hours it becomes a Call (section 5.8). The bell rings once, never on a loop.
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
  and **cracks** (a jagged dark line, vermilion glow) when one fails.
- Done: all four green: a small gavel tap sound.
- Data: test checks and the licence list.

**Hospital** (east, by the yard). Bugs being fixed.
- Silhouette: a white flat-roofed building with a big plus pictogram on the roof, a ward wing with **beds visible through
  long windows** (one bed per open fix), and an **ambulance bay**. [a plus]
- Beds: occupied (a little patient with a bandage, the bug) while a fix is open; the bed empties when the fix is
  committed and tested. A bug "in hospital" longer than a day gets a get-well card pictogram (age).
- **Ambulance**: an urgent fix (a fail on something live): the ambulance races from the hospital to that workshop with a
  vermilion-and-white turning light (slower than once a second) (one of the few real point lights), then back.
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
  (counted, never tracked). Each game has its own marquee panel. **Not built until Harry approves a counting service (decision M4).**
- Data: play counts only.

**Bank** (west). Cost.
- Silhouette: a squat building with a big round vault door left ajar and **coin stacks** visible: one stack per feature,
  height = cost. A small meter dial on the front shows today's spend against a budget line.
- Alarm: spend over budget: the vault door closes and the dial turns honey.
- Data: run reports, bills Harry adds.

#### Geography buildings

**Toll booth** (Works end of the bridge). Harry's yes: money, security, deleting, downloads.
- Silhouette: a striped-roof booth with a **barrier arm** and a little bell. Wagons needing a yes wait at the barrier.
- Waiting: the barrier is down, the booth's lamp honey, a stamped-paper pictogram flutters. **Harry says yes**: a big
  rubber stamp comes down from above (no person), the barrier lifts, the wagon rolls. **No**: the wagon turns round and
  goes back to the depot.
- Data: ledger, open questions.

**Customs house** (Home end of the bridge). The privacy check: nothing personal crosses.
- Silhouette: a neat little customs post with a **scanning arch** over the road (a toy archway with a lamp on top) and a
  flag pole. Every returning wagon passes through the arch; the arch lamp glows **bluish green** (clean) as each wagon passes. A wagon
  that fails the check is pulled aside into a fenced bay and its crate is opened (alarm).
- Data: the privacy checks in the tests, and the `clean()` filter's hits (counted, never shown).

**Harbour** (east). Outside services: GitHub, CDNs, model downloads.
- Silhouette: stone quays, bollards, a crane, a **harbour master's office** with a **licence board** (a pictogram board
  with one slot per arrival: green tick for CC0, MIT, Apache; honey for "strings attached"; vermilion for not allowed),
  stacked crates, and a **lighthouse** on the breakwater.
- Ships: a **cargo liner** (the code host: big, regular, steady), **little tugs** (CDNs: fast, frequent), a **barge with one
  big crate** (a model or asset download; the crate's flag shows its licence colour). The depth model "came by ship": a
  barge docks, the crane lifts the crate, the harbour master stamps the licence, a cart takes it to the right workshop.
- **Lighthouse**: the town's data freshness. The beam sweeps while the last GitHub poll succeeded ("live, checked 1 min
  ago"); it **stops and blinks honey** when the data is stale, and is dark when offline. This stops a calm town being
  misread as "nothing happening" when the feed is actually broken.
- Data: ledger `download` with licence; poll status.

**Districts, hills, fog, roads**: see sections 3.5 to 3.8.

#### Home Town: the machines

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

#### Home Town: the residents (v3)

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
| **Report card** (pinned on the front door) | Its blind test scores: a 10-square grid (the 10-prompt tests), squares green / honey / vermilion | mega-review-1 and later |
| **Trophies** (on the windowsill) | Ideas of its that made it into a game, one cup each | `by` credits |
| **Letterbox** (at the gate) | Empty answers: envelopes spilling out, one per empty answer this week | run reports |
| **Head colour on the green** | Who is speaking: answering (green), empty answers (vermilion), silent (slate), not proven (honey) | the wall |

- **Cutaway on focus**: when a resident's card opens, the front wall of its home slides away (a dolls' house, like
  Base Camp build 29's), showing the diplomas, the desk and the trophies. The camera eases in.
- **Residents as figures** (faceless wind-up figures, Appendix A #7): each family has a silhouette prop: Scholar (mortarboard), Reasoner (a pipe and armchair),
  Coder (goggles and a toolbelt), Elder (a walking stick and a lantern), Surveyor (a tripod theodolite), Writer (a quill tucked
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
  exam**: the student sits on the "resit bench" on the quad until its next exam (no raincloud: no feelings).
- Data: training runs, training test results.

#### The signs the town invented itself

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

### 2.7 Weather, sky and time

*From plan 5 (world), section 7. References like "section 3.8" inside this part point to that plan.*

#### Time of day from the real clock

- The sun follows **real UK local time** for the location's latitude (a fixed, generic British latitude, never the real location; no location is read):
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

#### Weather from the yard (the Works bank)

| Weather | Rule (existing) | Drawn as | Sound |
|---|---|---|---|
| **Sunshine** | All suites green | Clear sky and a soft warm rim light; the yard's lamps give a gentle green glow (no birds: motion is data) | None |
| **Clouds** | Any suite flaky | 3 to 6 flat, high, fluffy toon clouds drifting **over the Works bank only**, casting soft moving shadow blobs | Light wind |
| **Storm** | 2 or more suites failing on current heads, or any failure on the live build (Appendix A #8). One failure on a workshop branch is road works there, not a storm | Clouds darken to slate, rain as short streaks **over the Works bank only**, puddles appear on the square, one soft brightening per new failure (never a flash) | Rain bed; one low knock per new failure; no thunder |
| **Rainbow** | A `win` with `evidence: device`, for 2 hours, hidden while a storm is on; the star over the shop keeps the memory | A rainbow arching **from the shop window to Harry's porch** (it lands on the two ends of the win: the thing that shipped and the device it was proven on) | A short chime |
| **Fog** | Untested on a real iPad | Local fog banks on the unproven buildings (section 3.7), not the whole sky | None |

Rules that fix today's problems:
- Clouds sit at height 10 to 12 and **never in the camera-to-Home-Town line of sight** (they are placed by projecting the
  camera's view and avoiding the bridge and Home Town screen rectangle).
- Rain and lightning only over the Works bank: the tests are the Works' tests. **Home Town has its own small weather**
  from its own checks (optional, v3): drizzle over the Dell when its answers come back empty, a sunny patch over a machine
  whose parcels passed ("Train tells the truth: 5 tests").
- The rainbow is a flat ribbon arc that never crosses a building label; it is drawn with depth test on so buildings
  occlude it naturally.

#### Power cuts and night together

A power cut at night is the most dramatic state in the town, and that is right: it is the event that was missed on
15 Nov. The rolling blackout (section 6.2) plays, the battery tower shows empty, the lighthouse keeps sweeping (data is
fresh: the town knows the power is out), and the lost property office's emergency lamp lights (steady) after 2 hours.

#### One weather at a time (from plan 2)

Only one weather at a time, in this order: storm, then clouds, then sunshine. The rainbow shows only when the sky is sunshine or clouds. Clouds, a rainbow and white smoke at the same moment read as "pretty", not as data.

### 2.8 Characters and animation

*From plan 5 (world), section 8. References like "section 3.8" inside this part point to that plan.*

All characters are built from **a few shared instanced parts** (body, head, hat, arm-and-tool), toon-shaded with ink on
body and head only (Base Camp's rule: faces stay clean). Animation is procedural (sine bobs, part rotations, path
following); no skeletons, no animation files. That keeps every figure at one or two draw calls per part type for the
whole town.

#### Cast

| Character | Who | Look | Size |
|---|---|---|---|
| **The foreman** | The main AI session | Taller than builders, long amber work coat, hard hat with a lamp, clipboard; a little brass whistle | 1.3x builder |
| **Builders** | Hired helper AIs (cloud) | A wind-up toy with no face and a winding key on its back that runs down as the session runs out; round body, overalls in the district colour, hard hat in the district colour, a toolbox; a tiny badge with the branch's pictogram | 1x |
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

#### Animations

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
| Face the shop | builder, foreman | `win` | Stop and turn towards the lit shop window (no hop, no cheer: the win is the light) |
| Inspect | inspector | `test` | Leans out, lifts the barrier or keeps it down |
| Answer | resident | order `result` | Walks to the green, faces the bridge, speech bubble with pictogram |
| Write | awake Dell resident | machine busy | Arm writes, lamp flickers |
| Graduate | tiny expert | training passed | Climbs the stage, mortarboard throw, walks to its burrow |
| Resit | tiny expert | training failed | Sits on the resit bench until its next exam |
| Fox trot, sit, lie | fox | idle machine with work waiting | Path from the pond, sits at the door, tail curls |

**Reduced motion** (`prefers-reduced-motion`; decided: reduced motion means stopped): walkers jump to their destination, no confetti, lightning becomes a soft
brightening, the camera does not drift on its own.

#### Not treating AIs as people (from plan 4)

*From plan 4 (public), section 4. References like "section 3.8" inside this part point to that plan.*

##### Why this matters

People treat anything that talks like a person. Joseph Weizenbaum saw this in 1966 with ELIZA, a very simple chat program. A Google DeepMind report, "The Ethics of Advanced AI Assistants" (2024), names "users unduly anthropomorphising AI assistants" as a risk. A follow-up paper, "All Too Human?" (AIES 2024), maps how human-like design causes harm: misplaced trust, over-reliance, and emotional attachment.

A town of little busy workers makes this worse. Stanford's Generative Agents paper set out to make "believable proxies of human behaviour". That is the opposite of our aim. We want people to see the machine, not believe in a person.

Our real events show the danger. Anthropic's own shop test (Project Vend, 2025) had the agent, "Claudius", claim it would deliver items in person, then contact security when told it had no body. Visitors who have read this kind of story may already think AIs have inner lives. We should not feed that.

There is also an opposite error: making AIs look useless. The truth is in the middle. They do real, useful work, and they fail in odd, non-human ways.

##### Design rules

| Rule | Do | Do not |
|---|---|---|
| Bodies | Wind-up toys: a body, a toolbelt, a winding key. Or simple shapes such as a lantern on a cart. | Faces, eyes, mouths, hair, gender, skin tone. |
| Names | Job names: "depth builder", "test runner", "the 27B model". | Human names, or names that suggest a person (the town's "Elder", "Scholar" and "Grandparent" voices are labels the owner gave them. In public, show them in quotation marks with "a label for a test voice".) |
| Verbs | "Was given", "ran", "returned", "stopped", "had no record of". | "Thought", "wanted", "felt", "decided to rest", "forgot" (except in quotation marks with an explanation, as in the story "Why a builder 'forgot'"). |
| Feelings | None. A failed test is a red lamp, not a sad builder. | Sad faces, sweat drops, celebrating builders. |
| Speech | Only quoted real text, marked as model output. | Invented chat, jokes, catchphrases. |
| Voice (town crier) | A clearly synthetic voice (decided, Appendix A #31). Say at the start "this is a computer voice reading the diary". | A warm human-sounding voice that pretends to be a character. |
| Credit | "Idea first written by the Swarmkeeper (a small model on a home machine)". | "The Swarmkeeper had a brilliant idea!" |
| Wins | Light the shop window. | Have the builder cheer. |

##### The word swap list for captions

| Avoid | Use |
|---|---|
| The builder forgot | The new run had no record of it |
| It thinks | It wrote / it predicted |
| It knows | It was given / it found in a file |
| It learned (in a session) | It read the notes |
| It learned (in training) | Its settings were adjusted on examples |
| It lied | It wrote something that was not true |
| It got tired | It ran out of its time or budget |
| It's smart | It passed 9 of 10 checks |
| It decided | It chose, based on its brief and the files |
| The AI wanted to | The brief asked it to |

##### The one place to lean in

People remember stories with characters. We can use character without faking minds: the story's character is **the work** (the build, the test, the order), not the AI. "Build 30 went to the yard and came back red" is a story. It does not need a face.

##### Children

The games are family games, so children may see the town. Children are more likely to believe toys have feelings. For a children's version:
- Say plainly at the start: "These are not alive. They are like a very clever calculator that writes."
- No "friend" language.
- Test it with children before public release, with a parent present (section 12).

### 2.9 Vehicles

*From plan 5 (world), section 9. References like "section 3.8" inside this part point to that plan.*

| Vehicle | What it means | Route | Look | Notes |
|---|---|---|---|---|
| **Covered wagon** | An order (to Home Town), a result (back) | Bridge depot -> toll -> bridge -> customs -> machine | Horse-drawn toy wagon, canvas in an order colour band; loaded with crates on the way back | Exists today; restyled |
| **Postal van** | A deploy | Post office -> shop window | Small red van | |
| **Toy cars** | Jobs queued at a machine | Park in the machine's car park; jam on Dell Lane | Six rounded car shapes, one colour per origin | Instanced: one draw call for all cars |
| **Ambulance** | An urgent fix | Hospital -> workshop -> hospital | White van, vermilion stripe, a slow turning light | One real point light, desktop only |
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

### 2.10 Ambient life (within "motion is data")

*From plan 5 (world), section 10. References like "section 3.8" inside this part point to that plan.*

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

### 2.11 The sound palette (merged from P2 and P5)

Rules for when and how loud are in section 5.9.

| Measured thing | Sound | Kind |
|---|---|---|
| Builders active (count) | Distant workshop hammering, 1 to 3 taps every few seconds; density follows the count, capped at 4 | Bed |
| No builder active | The hammering stops; crickets (evening) or a faint breeze remain | Silence as data |
| Mill busy | Slow wooden creak; speed follows jobs per hour | Bed, quiet |
| Forge (Mini + Radeon) busy | Low furnace roar | Bed, quiet |
| `commit` | Post box clunk: a short wooden thunk | One-shot |
| Test suite passes | One small high bell | One-shot |
| Yard all green | Soft high glockenspiel ding | One-shot |
| Test suite fails | One low wooden knock (not a buzzer) | One-shot |
| Test passes only on a rerun | A small spring "boing" | One-shot |
| `deploy` | The shop door bell (two notes) | One-shot |
| `win` | The shop bell, then a short rising chime (no crowd, no cheer) | One-shot |
| Order goes out | Cart wheels and a horse's clop on the bridge, fading | One-shot |
| Result comes back | Hooves, then a parcel thump | One-shot |
| Waiting for Harry's yes | One small toll bell | One-shot |
| Harry's yes | A big rubber-stamp thump | One-shot |
| Night train departs / arrives | A two-tone steam whistle | One-shot |
| Download arrives | A low, short ship horn | One-shot |
| Urgent fix (ambulance) | A gentle two-tone (never a real siren) | One-shot |
| Rollback (fire engine) | A bright bell | One-shot |
| Power cut / power back | A descending hum and a click / a rising hum | One-shot |
| Lost property (a stall, a Call) | A single hand bell; once more after 30 min unless "Got it" | One-shot |
| New question for Harry | One deep town hall bell | One-shot |
| Any Call | The 2-note town hall bell, then the crier | Once |
| Storm (2+ failing suites) | Soft rain, low. No thunder | Bed |
| Evening | Crickets under everything, very low | Bed |
| A tiny expert graduates | A short bright bell chime | One-shot |

---

## 3. Data: sources, the ledger, trust, instrumentation, the truth audit

Mostly plan 1 (data honesty), with plan 3's operations data merged into the ledger schema (3.5). Plan 1 named the trust field `conf`; the live ledger already calls it `trust`, so this plan uses `trust` throughout.

### 3.1 What "measured" means here (an operational test)

*From plan 1 (data), section 1. References like "section 3.8" inside this part point to that plan.*

A sign may be shown only if it passes all four:

| Test | Question | Example pass | Example fail |
|---|---|---|---|
| **Source** | Can we name the file, API or hook that produced the number? | `test` line written by the runner from exit code 0 and "43/43" | "about 900 words in about 10 min" typed from memory |
| **Time** | Does it carry the time it was true ("as of"), separate from when it was written? | disk 35 GB as of 16:35 | a lamp still green two days later with no date |
| **Writer** | Do we know which process wrote it, and was that process in a position to know? | a hook on the machine where the commit happened | the foreman writing "builder finished" for a builder it could not see |
| **Check** | Can an independent source confirm or contradict it later? | commit SHA exists on GitHub on that branch | "the train marked them done" with no check of the pictures |

A sign that passes Source and Time but not Check is shown as **reported** (dimmer). A sign with no source is not shown,
or is shown only as **haze** ("we don't know"; plan 1 said fog, but fog means "not tried on a device", Appendix A #18).

Four trust levels, used everywhere in this plan:

| Level | Meaning | Who can produce it | How the town draws it |
|---|---|---|---|
| **measured** | Written by a program at the moment it happened, from a machine signal (exit code, API, hook) | runner, hooks, snapshot job, GitHub | full colour, may glow |
| **reported** | Written by an AI or a run report about its own work, with numbers, close to the time | foreman, builders, the home town's run report | full colour, no glow until checked |
| **typed** | Written by hand after the fact, times rounded, or reconstructed | foreman catching up, Harry | pale, dotted outline, "typed" on the card |
| **sample** | Example values for layout only | page defaults | grey with the word SAMPLE, never animated |

Rule from the atlas, made concrete: **only measured AND checked work glows brightest.** This is how "talk counted as
work" is kept out (the town's own verdict: "it shows talk better than finished work").

### 3.2 What the data looked like when the planners read it (an honest audit)

*From plan 1 (data), section 2. References like "section 3.8" inside this part point to that plan.*

#### The ledger (`games/works/ledger.jsonl`, 90 lines, 15 Nov 07:53 to 16 Nov 18:31 UTC)

| Count | Value |
|---|---|
| Lines | 90 |
| Kinds | commit 34, test 15, deploy 11, start 6, hire 6, order 5, end 4, win 4, step 3, fix 2. **result 0, fail 0, download 0** |
| Writers (`who`) | foreman 44, town 15, builder:depth 10, builder:mac 9, builder:snap 5, builder:fixer 3, builder:couch 2, harry 1, builder:works 1 |
| Lines with a time ending in `:00Z` | 41 of 90 (45%). These are almost certainly typed afterwards with a rounded minute. |
| IDs | none. No line can be referred to by another line. |

Specific honesty problems found in the 90 lines:

| # | Problem | Evidence in the ledger | What the town shows wrongly |
|---|---|---|---|
| L1 | **No `result` lines at all.** Orders never "come back". | 5 orders (mega-1, scan-1, report-1, keep-1, mega-review-1), 0 results, yet results for 15 Nov arrived in `orders/results/` | Wagons sit on the bridge and then vanish after 2 days because of a time cut-off in `computeState`, not because work came back. Survivorship: the bridge looks clear when it is not. |
| L2 | **A stall recorded as an `end`.** | 16 Nov 12:19 `end` for `game/bc-mac`, written by the foreman: "Found the build 29 builder stopped since 16:27 yesterday... picked up from lost property" | Any count of "builders finished" counts an abandoned builder as finished. The end needs an outcome (`abandoned`, detected late by 20 h). |
| L3 | **Branch used as the job key, but two jobs share a branch.** | `game/bc-mac` hired 15 Nov 14:25 and again 16 Nov 15:50 (fixer); `game/bc-depth` hired 12:25 and again 18:02 | `lostProperty()` pairs end to start by `ref`; a second job's end can close the first job's start, hiding a stall. |
| L4 | **Hires without starts, starts without ends.** | 6 hires, 6 starts, 4 ends; the 16:40 hire (researcher) has no `ref`; the 18:02 hire has no start; the depth builder's 12:26 start has no end | Lost property can't tell "still working" from "never started" from "finished but nobody wrote it". |
| L5 | **Deploys counted twice.** | Build 29 preview: 12:34:00 (typed, ref `base-camp-next/`) and 12:34:21 (ref `ae8c6be`). Check page: 15:23:00 and 15:23:26 | The shop lights up twice; "deploys today" is inflated. Dedupe works only when `ref` is a SHA. |
| L6 | **Deployed before tests finished, shown as a plain deploy.** | 12:34:21 "full test run still in progress" | The shop window glows for a build that had not passed the yard. |
| L7 | **Test lamps keyed by suite name only, not by build.** | 18:00 `roomfix fail` (build 30), 18:16 `roomfix pass` (build 29, side-by-side check) | The later pass on the OLD build turns the lamp green and hides the NEW build's failure. This is the single most dangerous lie in v1. |
| L8 | **Many suites folded into one lamp.** | `base-camp-all` = 12 suites in one `pass` line | A real failure in one of 12 can't be seen; one lamp = twelve claims. |
| L9 | **Reruns hidden inside "pass".** | `fun 18/18 (on rerun)`, status `pass` | Flakiness disappears from the weather. A pass on rerun should be `flaky`, with `tries:2`. |
| L10 | **Lamps fall off after 2 days.** | `computeState` keeps tests only 2 days | A suite that stopped being run looks the same as a suite that never failed. Absence is shown as health. |
| L11 | **`fail` kind never used; failures written as tests or prose.** | 0 `fail` lines; the 15 Nov 16:27 machine restart has no event at all | No power cut ever appears. The atlas's power cut row has no data. |
| L12 | **All test lines are typed by the foreman, not by the runner.** | `who:"town"`, round times; CI (`.github/workflows/ci.yml`) runs only on `main` pushes and pull requests, so no game-branch test ever runs in GitHub Actions | The inspection yard is entirely self-reported. The `/actions/runs` feed the page reads has nothing to do with the games. |
| L13 | **Commit lines duplicate GitHub.** | 34 `commit` lines, most also in GitHub | Fine when the SHA matches (deduped). When a typed commit line has no SHA, the parcel is counted twice. |
| L14 | **`who` for GitHub-only commits is guessed from the branch name.** | `fromCommit()` turns `game/bc-mac` into `builder:mac` | A foreman merge commit on a builder branch is credited to a builder. |

#### The GitHub feed (in `index.html`)

| What the page does | Problem | Honest alternative |
|---|---|---|
| Polls `/events` every 2 min, `/actions/runs`, `/deployments`, `/branches` every 10 min, and `/commits?sha=` for up to 10 branches, from each viewer's browser, **unauthenticated** | Unauthenticated limit is **60 requests per hour per IP address**. The wall projector, Harry's iPad and his Mac share one home IP. Worst case the page wants about 30 + 18 + up to 60 commit calls an hour. When it runs out, the town silently freezes on cached data. GitHub says a 304 only spares the limit when the request is authorised, so unauthenticated 304s may still count. | One snapshot file built server-side with the Actions `GITHUB_TOKEN` (1,000 requests per hour per repo), served next to the page on GitHub Pages. Viewers fetch one file; no API limit applies to them. |
| Uses the **Events API** to see which branches are active | GitHub documents event latency of **30 seconds to 6 hours**, "not built to serve real-time use cases". | Use `/branches` (current heads) plus `/commits` per changed head. Events only as a hint. |
| `/deployments` | This repo deploys by pushing to `gh-pages`, not through the Deployments API, so this list is likely empty or unrelated | Treat the `gh-pages` branch's commits as the deploy log; verify the deployed path exists on Pages. |
| Shows "rate limited" only in a status object | A frozen town looks alive. | Show the age of the newest data on the screen ("GitHub: 14 min old"). After 30 min, haze rolls in over the post office (decided: the freshness strip greys at 15 min). |

#### The home town's wall (`WALL` in `index.html`)

- Hard-coded sample values "as of 16:35, 16 Nov", correctly labelled SAMPLE. Good.
- `town-report.json` is a slot with no schema, no version and no "as of" check: any file with `machines` and `chips`
  replaces the sample and sets `sample:false`, even if it is a week old.
- Several wall numbers have **no written definition**: "2 things rebuilt that already existed" (who judged?),
  "3 hand touches per order" (counted how?), "3 of 3 machines given work". They are judgements, not measurements, until
  defined.
- "Six nice toy rooms. None shows what its line asked for. **The train marked them done.**" This is the clearest example
  of self-reported success being wrong. The town's own run reports must separate *finished* from *passed a check*.

#### Other feeds named in the atlas

| Feed | State today |
|---|---|
| Home town run reports | Standing order since 16 Nov. Arrives as a markdown paste through Harry, hours late. Not machine-readable yet. The 15 Nov results file has honest counts (asked/answered/empty) but no per-stage times. |
| iPad field reports | Order report-1 sent 16 Nov; not running. Will hold numbers and up to 6 camera pictures. Pictures must never reach the public town. |
| Claude Code hooks | Not switched on (`LEDGER.md`, `SOURCES.md`). |
| OpenTelemetry | Not switched on. Note: repository `.claude/settings.json` cannot enable telemetry or choose its destination; it is a machine or managed setting. |
| Subagent completion stats | The foreman receives tokens, tool uses and duration when a builder finishes, but none of it is written down. |

#### What v1 has fixed since the planners looked (checked in the files)

The audit above describes the 90-line ledger and the page at commit `a16ba21`. The v1 builder has moved on since:

| Problem (P1's number) | State now | Still to do |
|---|---|---|
| L1 orders never come back; wagons vanish after 2 days | **Fixed in the page:** a wagon waits until a `result` with the same `ref` arrives. | Write `result` lines (still 0). |
| L7 a pass on build 29 hides build 30's fail | **Mostly fixed:** lamps are kept per suite **and branch**. | Key by SHA too (two builds on one branch). |
| L9 reruns hidden inside "pass" | **Fixed:** new status `rerun` ("passed only on a rerun: never write it as a plain pass"). | `n.tries` from a runner. |
| Typed and measured looked the same | **Fixed in part:** every line has `trust`; typed and sample lines are drawn dimmer; commit lines now come from git with real seconds. | `src`, `t_rec`, provenance on every card. |
| Sample wall data looked live | **Fixed in part:** the wall's values are marked "sample" and greyed. | Age on the 3D fox and smoke too. |
| Stall alarm by hand, 20 h late | **Fixed in the page:** amber after 45 min, red after 2 h of silence, worked out from the page's own clock. | Heartbeats; pairing by `job`, not branch (L3). |
| Alarm pulses for ever; reduced motion only slows | **Fixed in part:** the alarm pulses for 5 s then holds; reduced motion now stops motion. | Steady beacon with a 1.5 s settle; a "Still" button. |
| L2, L3, L4, L5, L6, L8, L10 to L14 | Not yet. | See section 3.8. |

### 3.3 The source catalogue

*From plan 1 (data), section 3. References like "section 3.8" inside this part point to that plan.*

Every source the town may use, how fresh it can be, how far to trust it, and its personal-data risk.

| ID | Source | How it is reached | Best freshness | Default trust | Personal-data risk | Notes |
|---|---|---|---|---|---|---|
| S1 | **Ledger** (`ledger.jsonl`, branch `game/micro-precinct`) | raw.githubusercontent.com (cached ~5 min), fallback bundled copy | 5 min after push | depends on `src` of each line | Medium: free text in `what`; the repo is **public** | The backbone. Must be linted. |
| S2 | **GitHub git data** (branches, commits, merges, `gh-pages`) | REST API; better via snapshot | 1 to 10 min | measured | Low; author emails must be dropped (page already drops them) | The check for every commit and deploy claim. |
| S3 | **GitHub Events** | REST API | 30 s to 6 h | measured but late | Low | Hint only. Never used to decide "stalled". |
| S4 | **GitHub Actions runs** | REST API | minutes | measured | Low | Today only CI on `main`/PRs. Useless for game branches unless game tests run there. |
| S5 | **GitHub Pages (live site)** | plain fetch of the live pages from the same origin | seconds | measured | None | The works page lives on the same Pages site, so it can fetch `base-camp/` etc. directly: an honest street-light check. |
| S6 | **Test runner wrapper** (new) | writes ledger lines from exit code and parsed counts | instant | measured | Low (strip paths) | Replaces hand-typed test lines. |
| S7 | **Claude Code hooks** (new) | `SubagentStart`, `SubagentStop`, `SessionStart`, `SessionEnd`, `Stop`, `StopFailure`, `PostToolUse` (Bash `git commit`/`git push`), `PostToolUseFailure` | instant (written locally), durable at next push | measured | Medium: hook input includes `session_id`, `transcript_path`, `cwd`, tool input. Keep only what is listed in section 6. | Common fields: `session_id`, `prompt_id`, `transcript_path`, `cwd`, `hook_event_name`; subagents add `agent_id`, `agent_type`; `SubagentStop` adds `last_assistant_message`. Hooks can run `async: true` so they never slow the work. `SessionEnd` hooks share a 1.5 s budget, so write a local line only. |
| S8 | **Subagent completion stats** | the foreman copies them from the Agent tool's result onto the `end` line | at end of job | reported (numbers come from the harness, the copy is by the foreman) | Low | tokens, tool uses, duration. The best cost signal available without OTel. |
| S9 | **Claude Code OpenTelemetry** (optional, later) | OTLP exporter to a collector Harry runs | seconds | measured | **High**: `user.email` is always included when available and cannot be switched off; account UUID and session ID on by default | Metrics: `claude_code.session.count`, `token.usage`, `cost.usage`, `commit.count`, `lines_of_code.count`, `active_time.total`. Events: `user_prompt` (text redacted by default), `tool_result`, `api_request`, `api_error`. Subagent `agent_id`/`parent_agent_id`. Only through a local collector that strips identity. Not needed for v2. |
| S10 | **Home town run reports** | markdown + (proposed) a `town-report.json` block, pasted by Harry, committed by the foreman | hours (depends on Harry pasting) | reported | Low if numbers only | Show the "as of" big. |
| S11 | **Home town's own wall** | same as S10 | hours | reported / judged | Low | Judged signs (white smoke) need a named judge. |
| S12 | **Order results files** (`games/orders/results/`) | committed | hours to a day | reported | Low (words untouched, credited to residents, not people) | Source of `result` lines and the "who is speaking" counts. |
| S13 | **iPad field reports** (report-1, later) | Mini keeps raw; nightly numbers-only summary pasted | a day | measured on device, summarised by the town | **High** if raw: camera pictures, play times show when the household is home | Public town gets **daily totals only, no times, no pictures**. |
| S14 | **Reviews** (mega review, mega-review-1, cold looks) | committed markdown | days | judged | Low | Feed report cards and the market square, marked "judged". |
| S15 | **Harry's own words** | foreman quotes into the ledger | same day | typed | Medium | Allowed as `harry` lines; never anything about his home, family, places. |
| S16 | **HANDOVER "not proven" lists** | committed markdown; propose a fenced machine-readable list | days | reported | Low | The fog. |

#### How the control room's data arrives (from plan 3)

*From plan 3 (operations), section 3.3. References like "section 3.8" inside this part point to that plan.*

| Source | What it feeds | How it arrives |
|---|---|---|
| Foreman and builders | `hire`, `start`, `beat`, `claim`, `end`, `commit`, `ask` | `works_log` lines; later Claude Code hooks (`PostToolUse` after commits, `SubagentStop`, `Stop`) [S10]; this needs Harry's yes to change settings |
| Test yard | `test` with `load`, `attempt`, `paired_with` | test runner writes the line |
| GitHub | commits, branches, merges, deploys | read live (the v1 page already does) |
| Home town run reports | `queue`, `seat`, `limit` (disk, memory), machine busy % | inside each pasted result (standing order 16 Nov); the foreman turns the table into ledger lines |
| Home town wall | foxes, white smoke, who is speaking | same paste |
| Harry | `answer`, plan-meter % readings | the foreman copies his words |
| Clock | `beat` gaps, ages | computed by the page and by the watchdog |

### 3.4 Every building, sign and alarm: what feeds it, how it can lie, and the honest signal

*From plan 1 (data), section 4. References like "section 3.8" inside this part point to that plan.*

Status column: **NOW** = honest data exists today; **v2** = needs the instrumentation in section 8; **LATER** = needs
a source we don't have; **NO** = cannot be measured honestly, do not build (or show as a "judged" card only).

#### Geography

| Sign | Exact data | Source today | Fresh | How it can lie | Honest signal | Status |
|---|---|---|---|---|---|---|
| Two towns and a river | fixed | none needed | n/a | none | fixed layout | NOW |
| **The bridge** (stuck work) | open orders: `order` with no `result` | ledger (orders only) | hours | L1: no results ever written, so wagons vanish by timeout. Late pastes look like slow machines. | Order lifecycle `order → quote → go → stage* → result`, each with `order` ID. Show wagon age in hours; "waiting for Harry to paste" as its own state (the result exists at home but hasn't crossed). | v2 |
| **Toll booth** (Harry's yes) | open `ask` lines in category money/security/delete/download with no `answer` | none | same day | Questions asked in chat never reach the ledger; a yes from another chat counted as a yes (the town's rule says it does not count) | `ask` and `answer` kinds; `answer` must name where Harry said it (`said_in: town-chat`). A download line must link to its approving `answer` ID. | v2 |
| **Customs house** (nothing personal crosses) | result of a privacy lint over everything crossing (ledger, run reports, results) | the privacy checks in some test suites (not named) | per run | "Privacy checked" when only one game's suite checks it; pass on an empty input | A named `privacy` suite run by the runner over the ledger, `town-report.json` and any summary file, with counts of lines checked and lines blocked. Zero lines checked = grey, not green. | v2 |
| **Districts** (projects) | branch name prefix → project (`bc-` Base Camp, `bb-` B&B, …) | GitHub branches | snapshot | Branch names are inconsistent; `micro-precinct` holds many projects | A small mapping file `games/works/districts.json` (prefix → district). Unknown prefixes go to "unsorted", never guessed. | NOW (with mapping) |
| **Hills** (hard ground) | per area: fix lines, failed test runs, reruns, reverted commits | commits and fixes per area | daily | Commit count measures typing, not difficulty; one builder commits often | Use **failures and reruns per suite** and **fix lines with open→close time**, not commits. Show the number on hover. | v2 |
| **Fog** (never tried on a real device) | count of open items in the "not proven on device" lists | HANDOVER prose | days | Prose lists go stale; items proven but never ticked off | A fenced block in HANDOVER (`<!-- notproven -->` list with IDs); a `win` or field-report summary that proves an item closes it by ID. Fog thins only on proof. | v2 |
| **The harbour** (outside services) | list of external hosts the games load (CDNs), vendored libraries, model downloads | `THIRD_PARTY.md` (hand) | per commit | A dependency added without a line | Build the list by scanning the deployed HTML for external `src`/`href` hosts (measured) and compare to `THIRD_PARTY.md`. Mismatch = a ship with no papers. | v2 |
| **Ships arriving** | `download` lines with name, size, licence, approval ID | none (0 download lines) | instant | Downloads not logged; licence copied wrong | `download` requires `licence`, `bytes`, `approved_by` (an `answer` ID). Truth audit compares vendored files and lockfile changes to download lines. | v2 |

#### Infrastructure

| Sign | Exact data | Source today | Fresh | How it can lie | Honest signal | Status |
|---|---|---|---|---|---|---|
| **Power station** (compute) | cloud: builder minutes and tokens per job (S8); home: busy minutes per machine (S10) | none | end of job / per report | Wall-clock minutes include waiting on Harry; tokens without cache split overstate cost; home "busy" from a report written by the busy machine | Cloud: `duration_ms`, `tokens`, `tool_uses` on each `end`. Home: per-stage start/end and per-machine busy % from the run report. Show both as "minutes of work", not a single "power" number. | v2 |
| **Power cut** | a session or builder that stopped without an end; a usage limit hit; a machine restart | none (L11) | instant for hooks; dead-man for silence | Recorded only when someone notices (20 h late on 15 Nov) | (a) `StopFailure` hook → `fail` with `cause:"api"`/`"limit"`; (b) `SessionStart` with `source:"startup"` while jobs are open → `restart` line; (c) **silence**: no `beat` from an open job for 45 min (see section 7). The page computes (c) itself, so it works even when nobody is alive to write. | v2 |
| **Battery gauge** (budget left today) | remaining usage and reset time | **no API exposes this** | n/a | Any gauge would be a guess | Do not draw a gauge. Show **"last limit hit: 15 Nov, reset 19:00"** from `limit` lines, and tokens used today from `end` lines. Gauge only if a real remaining number ever becomes readable. **Decided (Appendix A #20):** draw the tower from Harry's last plan-meter reading, marked typed, with its age; "unknown" after 24 h. | v2 (typed gauge, last hit) |
| **Reservoir** (disk) | free GB on the Mini, floor 30 GB | wall sample (35 GB) | per report | Stale number looks current; a report from a different disk | `town-report.json` `disk_free_gb` with `as_of`; water level greys after 24 h; show the floor line. | v2 |
| **Roads** (paths work travels) | step durations: order→quote→go→result; hire→start→first commit→end | ledger, untimed | per event | Typed round times make paths look tidy | Only measured `t` values used for durations; typed lines excluded from timing stats. | v2 |
| **Traffic jam** (queue wait) | minutes waiting in queue per stage | run report (standing order), not machine-readable yet | per report | Waiting for Harry's paste counted as machine queue | `stage` lines with `queued_at`, `started_at`, `ended_at` from the home queue. Bridge wait (paste delay) is drawn on the bridge, not on the Dell's road. | v2 |
| **Car park** (backlog) | jobs waiting to start, per machine | wall "Waiting: ..." prose | per report | Snapshot age hidden | `queue_len` per machine with `as_of`. Cars grey out with age. | v2 |
| **Railway** (nightly batch) | almanac nights: scheduled vs arrived, seats asked/answered/empty | `ALMANAC_LOG.md` (standing order 1) | daily | A night that didn't run leaves no line (survivorship) | Expect one line per night; a missing night is drawn as a train that didn't arrive. Stop rule (2 nights < 2 answers) shown as a red signal. | v2 |
| **Road works** (broken build) | branches whose latest runner `test` for their head SHA is `fail` | typed test lines | per run | L7: pass on another build hides fail | Lamp keyed by **(suite, branch, SHA)**; a branch's road is closed if any suite's latest result *for its head SHA* failed; "not run on this SHA" is amber-grey, not green. | v2 |
| **Sorting office** (merges, conflicts) | merge commits (GitHub, measured); conflicts (only seen at merge time) | GitHub merges | snapshot | Conflicts leave no trace once resolved | `PostToolUse` hook on Bash `git merge` / `git rebase`: exit code non-zero or "CONFLICT" in output → `merge` line with `conflicts:n`. Without the hook, show merges only and say "conflicts not measured". | v2 |
| **Telephone exchange** (AI to AI messages) | count of briefs and reports per job, their lengths | none | instant | Counting messages rewards chatter (talk as work) | `SubagentStart` (brief out) and `SubagentStop` (report back) counts and character lengths only, never content. Never used as a productivity score. | v2 |
| **Street lights** (health) | HTTP status and load of each live page; AR-ready flag from `check.html`-style probe | none | seconds | Lights on because a cached copy loads | The works page (same origin on Pages) fetches each live path with `cache: 'no-store'` every 10 min and checks status 200 and a build marker string; the snapshot job does the same server-side. Dark = failed or build marker mismatch. | NOW (cheap) |

#### Weather

| Weather | Exact data | How it can lie | Honest signal | Status |
|---|---|---|---|---|
| Sunshine | all suites green **for the live build's SHA** | L7, L10: green from old builds or vanished lamps | Sunshine only if every suite in the expected list ran on the live SHA in the last 24 h and passed first try | v2 |
| Clouds | any suite flaky (pass on rerun) | L9: reruns written as pass | `tries > 1` and final pass → flaky. Count flaky suites. | v2 |
| Storm | 2 or more suites failing on current heads, or any failure on the live build (decided, Appendix A #8) | failures not written as lines; one lamp = 12 suites (L8) | runner writes every fail; rate computed over measured lines only | v2 |
| Rainbow | a real-device win | a robot win called a device win | `win` must carry `evidence` = `device` (Harry's report or field-report summary ID). Robot wins are a star, not a rainbow. | NOW (one line exists) |
| Fog | untested on a real iPad | see Geography | see Geography | v2 |
| (new) **Haze** | the town's own data is stale | — | If the newest measured line is older than the expected rhythm, the whole sky goes hazy with "last heard 3 h ago". Silence must never look like sunshine. | v2 |

#### Civic buildings

| Building | Exact data | Source today | How it can lie | Honest signal | Status |
|---|---|---|---|---|---|
| **Town hall** | open `ask` lines waiting on Harry, with age and category | START_HERE "Waiting on Harry" prose | Questions answered in chat but never closed; questions never asked in writing | `ask`/`answer` pairs with IDs. Age in days on each motion. | v2 |
| **Courthouse** | rule checks: no deaths, no brands, licences, privacy; count of checks run and passed | some suites | Pass with zero checks; rules promised but no test | Each rule maps to a named suite; show "checked on SHA x, n checks". A rule with no suite shows as an empty bench. | v2 |
| **Hospital** | open bugs and how long each has been in | 2 `fix` lines, no bug IDs | A fix line without the bug it closes; bugs never opened in the ledger | `bug` (open, with ID) and `fix` (closes ID, with SHA and a test that now passes). Ambulance = bug marked urgent. Time in hospital = fix t − bug t, measured only. | v2 |
| **Fire station** | kept builds available for rollback (`base-camp/b26/`, `b27/` …) | GitHub Pages tree | Folder exists but broken | Snapshot lists `gh-pages` folders matching `b\d+/`; street-light probe checks each loads. | NOW (tree) / v2 (probe) |
| **Museum** | every shipped build with its picture | `gh-pages` history | Pictures from a robot, not the live page | Each exhibit = a `gh-pages` commit + the shot file named in the deploy line; label shots "robot shot" vs "device photo". | v2 |
| **Archive** | git history, START_HERE, HANDOVER | git | none significant | counts of commits and notes; links | NOW |
| **Lost property office** | open jobs with no `end` and no life sign for N minutes | v1: `start` with no `end` for 2 h, by `ref` | L2, L3, L4 (pairing by branch, stall recorded as end) | Pair by `job` ID; life signs are `beat`, `commit`, `test` with the same `job`; alarm after 45 min of silence; when a stalled job is picked up, write `end outcome:"abandoned"` and a new job with `recovers: <job>`. | v2 |
| **Market square** | ideas offered (sparks, residents' ideas) and ideas used | order results (prose) | Counting ideas offered as output; ideas "used" by assertion | `idea` count per result (from the result file) and `credit` lines that link an idea ID to the commit that used it. | v2 |
| **Noticeboard** | orders and requests | `games/orders/*.md` | Files that never went out | Each order file + its `order` line (sent) + `quote`/`go`. Unsent orders shown pinned but not on a wagon. | NOW (files) |
| **Town crier** | wins and fails, read out | ledger | Reads only wins (survivorship) | Crier reads wins AND fails AND stalls, in time order. Equal airtime rule: if there was a fail today, it is read. | v2 |
| **Theatre / arcade** | play counts | none; needs a server | Any number would be invented | Not shown until Harry approves a counting service (money/security). Field-report daily totals (Harry's own plays) can be shown as "test plays", clearly labelled. | NO / LATER |
| **Bank** | cost | none | Showing £ from guesses; home electricity unknown | Show **tokens and builder-minutes** per job and per day (S8). £ only from bills Harry adds by hand (typed, labelled). No home power cost unless measured with a plug meter. | v2 (tokens) / LATER (£) |

#### Homes and learning

| Sign | Exact data | Source today | How it can lie | Honest signal | Status |
|---|---|---|---|---|---|
| A house per AI | roster: name, machine, size, kind | `TOWN_MACHINES.md`, `HOW_TO_SEND...` (two lists disagree: 12 vs 13 tiny experts; 8 vs 10 Dell residents) | Two rosters disagree | One roster file from the home town, `roster.json`, with `as_of`. Houses not on it are not drawn. | v2 |
| House size | parameters (7B … 35B) | roster | none | roster | v2 |
| **Lights on / asleep** | loaded in memory now | wall (sample) | A snapshot hours old shows "lights on" for a model long unloaded | Only with `as_of` ≤ 1 h; otherwise curtains drawn grey ("unknown"). Realistically the home town can only report at paste time, so mostly "unknown, last seen …". | LATER |
| Garden / weed bed | strengths and weaknesses | town notes (prose) | Opinions as facts | Show as **judged**, with who judged and when. Derive "weeds" from measured empties/broken by task type. | v2 (judged) |
| **Diplomas** | trained/tuned on what, with licence | training records (home) | Licence assumed | One record per expert: data source name, licence, date, hash. No record, no diploma. | LATER |
| **Report card** | blind test scores | mega-review-1 (pending) | Unblinded tests; tiny samples (10 prompts) shown as a grade | Show raw "7 of 10 kept, judged by Harry, blind" with sample size; no letter grades. | LATER |
| **Trophies** | ideas used in a game, credited | `by` credits in the games | Credit by assertion | `credit` line: idea ID → commit SHA → file. Verified by grep for the idea's text or ID in that commit. | v2 |
| **Empty letterbox** | empty/broken answers per resident | results file honest counts | Empties re-asked and then counted as answers | Per resident: asked, answered, empty, broken, timed out, never got a turn (all six, from the results). | v2 |
| **Who is speaking** (the town's sign) | per resident status: answering / empty / silent / not proven | wall | Old statuses look current | Per-resident status with the order ID it came from and its date. | v2 |
| **University / exam hall** | training runs and their before/after blind scores | home | "Graduated" because training finished, not because it passed | `train` lines: start, end, exam result vs baseline. Graduate only on an exam pass. | LATER |
| Workshops' builders | cloud helpers: brief in, report out | hooks | A builder that did nothing but talk | Builder glows only if its job produced a commit that exists on GitHub or a measured test result. Report-only jobs (research) show as "reports delivered", which is fine, but not as built work. | v2 |

#### Signs the home town invented

| Sign | Exact data | How it can lie | Honest signal | Status |
|---|---|---|---|---|
| **Fox in the pond** (idle with work waiting) | machine `state:idle` AND `queue_len>0` in the same report, same `as_of` | Mixing an idle reading from 16:35 with a queue from 14:00 | Both values from one report and one `as_of`; fox only when the report is < 2 h old. Count fox-minutes if the home queue logs state changes. | v2 |
| **White smoke** (rebuilt something that existed) | a judgement | It is a judgement, not a measurement | Show only with the judge's name and the two things (existing path and new path). Possibly measurable later: new file whose content is ≥ 80% similar to an existing file (a duplicate check in the audit). | v2 (judged) |
| **Parcels** (delivered work, tested) | per order result: items passed / failed / borderline / never arrived | "The train marked them done" | Parcel colour comes from a check, not from "finished". Unchecked parcels are brown paper. | v2 |
| "Shows talk better than finished work" | — | — | The trust-level drawing in section 1 is the answer. | v2 |

### 3.5 The ledger, version 2 (merged schema)

This merges P1's schema (IDs, jobs, two times, writer rules) with P3's operations kinds (heartbeats, claims and
checks, queues, seats, questions for Harry, limits, restarts, incidents), and keeps v1's live field names. Old lines
stay valid: a line without `v` is version 1.

#### 3.5.1 Principles (from P1)

1. **Append-only.** Never edit or delete a line. A mistake is fixed by a `correct` line that names the bad line's ID.
2. **Every line has an ID**, and links to its job, its parent and its order.
3. **Two times:** `t` = when it happened; `t_rec` = when it was written. Lateness becomes measurable.
4. **Every line says where it came from** (`src`) and how far to trust it (`trust`).
5. **Pairs:** every `start` has an `end` with an `outcome`. Silence between them is detectable.
6. **Numbers in fields, not in prose.** `what` is a caption for people; the town never parses it.
7. **Public by default.** The repo is public, so the ledger is world-readable. Nothing goes in it that we would not
   show strangers.

#### 3.5.2 The envelope (fields on every line)

| Field | Required | Type | Meaning | Example |
|---|---|---|---|---|
| `v` | v2 lines | int | schema version | `2` |
| `id` | v2 lines | string | unique ID: UTC compact time + writer tag + 4 random hex | `20261116T182000Z-hk-3f9a` |
| `t` | yes | ISO UTC | when it happened | `2026-11-16T18:20:00Z` |
| `t_rec` | v2 lines | ISO UTC | when the line was written | `2026-11-16T18:20:02Z` |
| `kind` | yes | enum (3.5.3) | what kind of event | `start` |
| `who` | yes | pattern | `foreman`, `builder:<name>`, `runner`, `town`, `harry`, `snapshot`, `control-room` | `builder:depth` |
| `src` | v2 lines | enum | `hook`, `runner`, `snapshot`, `agent`, `town-report`, `results`, `hand`, `github` | `hook` |
| `trust` | yes | enum | `measured`, `reported`, `typed`, `sample` (`hand` is always `typed`) | `measured` |
| `where` | yes | pattern | building key, `workshop:<branch>` or `home:<machine>` | `workshop:game/bc-depth` |
| `what` | yes | string, 140 chars or fewer | plain caption; privacy-checked | `Depth builder starts` |
| `ref` | no | string | v1's link: a commit, branch, order name or page path. Kept. | `scan-1` |
| `job` | when part of a job | string | the hire's job ID; every line a builder causes carries it | `job:20261116-depth-1` |
| `parent` | no | id | the line this one hangs off (step to start, result to order) | |
| `session` | no | string | short **salted hash** of the session ID (8 hex). Never the raw ID. | `s:9c1e04ab` |
| `order` | home work | string | order ID | `report-1` |
| `branch` | when known | string | git branch | `game/bc-depth` |
| `sha` | when known | 7 to 40 hex | the commit the event is about | `9748c8f` |
| `n` | no | object | numbers, never strings: `{"pass":43,"total":43,"tries":1}`. v1 lines may still hold `"43/43"`. | |

#### 3.5.3 Event kinds and their extra fields

| Kind | Meaning | Extra fields | Pairs with | Allowed writers (`src`) |
|---|---|---|---|---|
| `hire` | foreman hands a brief to a builder | `job`, `brief_chars` (length only), `agent_type`, `est_min`, `files` (expected), `exists_check` (what already exists that was looked for), `merge_after` (branch), `parent` (order or goal) | `start` within 15 min | hook, agent |
| `start` | a builder begins | `job` | `end` | hook, agent |
| `beat` | heartbeat: still alive | `job`; optional `pct` (own guess 0 to 100, `trust: reported`) | — | hook (throttled to 1 per 10 min per job), agent |
| `step` | a milestone inside a job (talk level; never glows) | `job` | — | agent, hand |
| `end` | a job stopped | `job`, `outcome` = `done`, `handed_back`, `failed`, `abandoned`, `cancelled`, `recovered`, `no_commit`; `sha` (or `outcome: no_commit` with a reason); optional `n.tokens`, `n.tool_uses`, `n.duration_ms`, `detected_late_min` | `start` | hook (`SubagentStop`), agent, hand |
| `claim` | the maker says what it did | `job`, `claims` (list of checkable statements, e.g. "house 43/43", "no duplicate Pip in shot 58"), `evidence` (paths, commit) | `check` | agent |
| `check` | **a second key on a claim** (a verdict) | `claim_id`, `verdict` = `holds`, `fails`, `cannot_tell`; `by` (a different checker than the maker) | `claim` | runner, agent, harry |
| `commit` | a commit was made | `sha`, `branch`; `job` if a builder made it | — | hook, snapshot, github |
| `push` | commits reached GitHub | `branch`, `sha` (new head) | — | hook, snapshot |
| `merge` | branches combined | `branch` (into), `from`, `sha`, `n.conflicts` | — | hook, snapshot |
| `test` | one suite ran once | `suite`, `sha`, `branch`, `status` = `pass`, `rerun`, `flaky`, `fail`, `error`, `skipped`; `n.pass`, `n.total`, `n.tries`, `n.ms`, `runner` (`cloud`, `mini-webkit`, `mini-chromium`, `ci`), `load` (load average), `paired_with` (SHA of the last live build if run side by side), `log_hash` | — | runner only for `trust: measured`; hand allowed as `typed` |
| `deploy` | something went live | `path`, `sha` (gh-pages commit), `from_sha`, `tests_ok` (every expected suite passed on `from_sha`), `backup` (kept build path, e.g. `base-camp/b28/`), `checks` (claim checks) | `probe` | hook, snapshot, agent |
| `probe` | **a live page check** (P1 called this `check`) | `path`, `n.status` (HTTP), `build_marker_ok`, `n.ms` | — | snapshot, page |
| `win` | real success | `evidence` = `device`, `robot`, `review`; `evidence_ref` | — | agent, harry |
| `fail` | something broke | `cause` = `test`, `limit`, `api`, `restart`, `crash`, `network`, `other`; `ref` | — | hook, runner, agent |
| `restart` | a session or machine started fresh while jobs were open | `machine`, `gap_min`, `open_jobs` (list) | — | hook (`SessionStart`), agent |
| `limit` | a limit was hit or read | `resource` = `usage`, `disk`, `memory`, `load`; `value`; `reset_at` | — | hook, agent, town-report |
| `order` | an order crossed the bridge | `order`, `file`, `needs_harry`, `quote_due`, `result_due`, `stages` | `quote`, `result` | agent |
| `quote` | the home town's quote | `order`, per-stage minutes | `go` | town-report |
| `go` | Harry said go | `order`, `room` | — | harry (recorded by agent) |
| `stage` | one home stage changes phase (also covers P3's `queue`) | `order`, `stage`, `machine`, `model`, `phase` = `queued`, `start`, `end`, `refused`; `n.wait_min`, `n.run_min` | itself | town-report |
| `seat` | one resident's answer | `seat`, `model`, `n.secs`, `outcome` = `answer`, `empty`, `broken`, `timeout`, `rule_break`, `no_turn` | — | results, town-report |
| `result` | an order came back | `order`, `file`, `n.asked`, `n.answered`, `n.empty`, `n.broken`, `n.timeout`, `n.no_turn`, `n.checked_pass`, `n.checked_fail` | `order` | results, agent |
| `ask` | a question for Harry | `ask_id`, `category` = `money`, `security`, `delete`, `download`, `taste`, `other`; `question`, `blocks`, `default_if_silent` (never for the first four), `room` (which chat must hear the yes) | `answer` | agent |
| `answer` | Harry's answer | `ask_id`, `answer` = `yes`, `no`, `later`; `room`; Harry's words verbatim | — | harry (recorded by agent) |
| `download` | something came in from outside | `name`, `bytes`, `licence`, `approved_by` (an `answer` ID) | — | agent, hook |
| `bug` / `fix` | a bug opened / closed | `bug_id`; for `fix`: `sha`, `suite` that proves it | each other | agent, runner |
| `idea` / `credit` | an idea offered / used | `idea_id`, `by` (resident); for `credit`: `sha`, `file` | each other | results, agent |
| `train` | a tiny expert trained | `expert`, `phase`, `exam` result vs baseline | itself | town-report |
| `incident` | an incident opened or closed | `incident_id`, `sev` (1 to 4), `opened`, `closed`, `refs` | itself | agent, control-room |
| `correct` | fixes an earlier line | `corrects` (ID), `field`, `was`, `now`, `why` | — | any writer for its own lines; foreman for any |
| `note` | free comment | — | — | anyone; never drawn as work |

#### IDs that link a hire to its steps to its result

*From plan 1 (data), sections 5.4 to 5.8. References like "section 3.8" inside this part point to that plan.*

```
hire     id=…-a1  job=job:20261116-depth-1
start    id=…-a2  job=job:20261116-depth-1  parent=…-a1
beat     id=…-a3  job=job:20261116-depth-1  parent=…-a2
commit   id=…-a4  job=job:20261116-depth-1  sha=26c1bc8 branch=game/bc-depth
test     id=…-a5  job=job:20261116-depth-1  sha=35d11c6 suite=depth status=pass n={pass:29,total:29,tries:1}
end      id=…-a6  job=job:20261116-depth-1  parent=…-a2 outcome=handed_back n={tokens:…,tool_uses:…,duration_ms:…}
deploy   id=…-a7  job=job:20261116-depth-1  from_sha=9748c8f path=base-camp-next/ tests_ok=true
probe    id=…-a8  parent=…-a7  path=base-camp-next/ status=200 build_marker_ok=true
```

- The **job ID** is made once, at hire, by the foreman's tool (`job:<yyyymmdd>-<shortname>-<n>`), and passed into the
  builder's brief as one line ("Your job ID: job:20261116-depth-1. Put it in every ledger line."). The `SubagentStart`
  hook also records `agent_id`, so hook lines and agent lines can be joined even if the builder forgets.
- A **recovery** (picking up from lost property) is a new job: `hire … recovers=job:20261115-mac-1`, and the old job gets
  `end outcome=abandoned detected_late_min=1192`. Nothing is overwritten. Both the stall and the recovery stay visible.
- **Orders** use the order's own ID (`scan-1`) as the link from `order` → `quote` → `go` → `stage` → `result`.

#### Who may write what

| Writer | May write | May not write | Why |
|---|---|---|---|
| Test runner (`src:runner`) | `test`, `fail(cause:test)`, `fix` closure proof | anything else | Only the runner sees the real exit code |
| Hooks (`src:hook`) | `hire`, `start`, `beat`, `end`, `commit`, `push`, `merge`, `fail`, `restart`, `limit` | `win`, `answer`, `result` | Hooks see mechanics, not meaning |
| Snapshot job (`src:snapshot`) | `commit`, `push`, `deploy`, `probe`, harbour list | `test` (unless CI really ran it) | It sees GitHub and Pages, not sessions |
| Foreman / builders (`src:agent`) | `step`, `order`, `ask`, `deploy`, `win`, `bug`, `fix`, `credit`, `correct`, `note`, and `end` when no hook did | `test` as measured; `answer` (only by quoting Harry) | Talk-level; trusted as `reported` |
| Results importer (`src:results` / `town-report`) | `quote`, `stage`, `result`, `idea`, `train` | git events | Home facts only |
| Harry (`src:hand`, `who:harry`) | `answer`, `go`, `win(evidence:device)`, `note` | — | His words, quoted |
| Anyone typing afterwards | anything, but always `conf:typed` | `conf:measured` | Honesty about memory |

Enforcement: the validator (step 1 in section 8) rejects a line whose `kind` is not allowed for its `src`, and any
`conf:measured` line whose `src` is `hand`.

#### Avoiding personal data (the ledger is public)

- **Allowed people words:** "Harry" only. No other names, no family, no friends' homes ("2 friends' homes" in the mega
  review's test plan must appear only as counts).
- **No places:** no town names, room names, addresses, coordinates, Wi-Fi names, IP addresses. Places' rounded
  locations never leave the iPad (Harry's 14 Nov rule) and must never appear here.
- **No times that reveal home life:** iPad play events go into the public ledger only as **daily totals** (plays, median
  lock seconds, errors), never individual play times. Home machine busy/idle is fine at the hour level.
- **No raw identifiers:** no `session_id`, `agent_id`, `transcript_path`, `cwd`, account UUID, email, tokens. Session
  becomes an 8-hex salted hash (salt kept out of the repo, e.g. in the session's environment), so sessions can be
  grouped without being traced back.
- **No content:** no prompts, no brief text, no assistant messages, no tool input/output. Only lengths and counts.
- **Paths:** repo-relative only. Strip `/home/...`, `/Users/...`, `/tmp/...`.
- **Lint** (in the validator and the page's existing `clean()`): email pattern, token patterns (`gh?_`, `sk-`), absolute
  paths, IPv4/IPv6, UK postcode pattern, `lat`/`lon` numbers, and a deny-list of known place and personal words kept
  **outside** the public repo (a hash list works: store SHA-256 of each deny word, compare hashes of each word in `what`).
- **Hooks must whitelist, not blacklist:** the hook script builds the line from named fields only; it never copies the
  hook's JSON input wholesale.

#### Where lines are written (concurrency and durability)

Problem: several builders on several branches and worktrees appending to one file on one branch will collide in git, and
a cloud container that is replaced (the 15 Nov restart) loses anything not pushed.

Plan:
1. **Local spool**: hooks and the runner append to `$CLAUDE_PROJECT_DIR/.works-spool/<yyyymmdd>.jsonl` (git-ignored),
   one machine-wide file with an `flock` around each append. Lines are small, so appends are atomic enough with a lock.
2. **Flush**: the foreman's `works_flush` moves spool lines into `games/works/ledger.jsonl` on `game/micro-precinct`,
   dedupes by `id`, sorts by `t`, validates, commits ("ledger: 14 lines") and pushes. Triggers: every foreman commit on
   `micro-precinct`, every `SubagentStop`, and a `beat` timer at most every 30 min.
3. **Durability is honest**: if the container dies, unflushed lines are lost, **and the page detects the silence**
   (no new `beat` for an open job) and raises lost property anyway. The alarm does not depend on the dead writer.
4. **Rotation (not deletion)**: when the file passes ~2 MB, move whole past months to
   `games/works/ledger/2026-11.jsonl` and keep an index (`ledger/index.json`). The page loads the current file plus the
   month the scrubber is on. Ask Harry first (it moves lines; it deletes nothing).
5. **Builders do not push ledger lines from their own branches.** One ledger, one writer of record (the foreman's flush),
   many producers (spool).

#### Migrating the 90 v1 lines

- Do not edit them. Read v1 lines as `v:1`, `conf:"typed"` (or `reported` where the time has seconds and a SHA).
- Generate `id` deterministically for v1 lines (hash of the line) so later `correct` lines can name them.
- Write correction lines for the known problems: the 12:19 end → `outcome:abandoned, detected_late_min≈1192`; the
  duplicate deploys → `correct … duplicate_of`; the `fun (on rerun)` pass → `flaky, tries:2`; the 16:40 hire → add job.

### 3.6 Hook design (what each hook writes, and what it must not)

*From plan 1 (data), section 6. References like "section 3.8" inside this part point to that plan.*

All hooks: `type: command`, `async: true` (never slow the work), script reads stdin JSON, writes **one** whitelisted
line to the spool, exits 0 even on its own error (and writes nothing rather than a bad line).

| Hook | Matcher | Writes | Fields taken from input | Fields dropped |
|---|---|---|---|---|
| `SessionStart` | `startup`, `resume`, `compact` | `restart` if the spool shows open jobs, else `note` "session started" | `source`, hashed `session_id` | `transcript_path`, `cwd`, model name optional |
| `SubagentStart` | any agent type | `hire` (if foreman didn't) and `start` | `agent_id` (hashed), `agent_type` | prompt text (only its length if available) |
| `SubagentStop` | any | `end` (`outcome:handed_back` by default; the foreman can `correct` it to `failed`) | `agent_id` (hashed), length of `last_assistant_message` | the message itself |
| `PostToolUse` | `Bash` | `commit` / `push` / `merge` when the command starts with `git commit` / `git push` / `git merge`; else a throttled `beat` | branch and SHA read with `git rev-parse` (not from the command text) | the command text, output |
| `PostToolUse` | any other tool | throttled `beat` (1 per 10 min per job, decided in Appendix A #11) | job ID from the spool's open-job table keyed by hashed agent ID | tool input |
| `PostToolUseFailure` | `Bash` | nothing, unless it was a git or test command: `fail` | exit code | output |
| `Stop` | — | `beat` for the foreman | hashed session | `last_assistant_message` |
| `StopFailure` | — | `fail cause:api` or `limit` | error type only | message text |
| `SessionEnd` | any | `note` "session ended" (fast; 1.5 s budget) | reason | everything else |

How the job ID reaches hooks: the foreman's hire tool writes `job` ↔ hashed `agent_id` into the spool's open-job table
(`.works-spool/open.json`) after `SubagentStart` fires; later hook lines look it up. If the lookup fails, the line is
written with `job:"unknown"` and the audit counts it (a coverage metric).

**Settings change needed:** hooks live in `.claude/settings.json` (project) or the user's own settings. `LEDGER.md` says
Harry decides. This is a **security** decision (hooks run shell commands on every event). See open questions.

### 3.7 The watchdog must not live on the thing that dies

*From plan 3 (operations), section 3.4. References like "section 3.8" inside this part point to that plan.*

F1 happened because the machine restarted. The foreman session that would have noticed was on the same machine. So:

- **Cloud side:** a scheduled task outside the session (the `send_later` wake-ups the overnight run used, or a recurring
  scheduled task) reads the ledger every 30 minutes and wakes a fresh foreman if any rule fires. The page can also compute
  the alarms, but a page nobody is looking at alarms nobody.
- **Home side:** the Mini can read the public raw ledger from GitHub (reading is not pushing). Its wall can show "cloud
  last heard 3 h ago" and ring a bell at home. This is a read only; it needs no new access, but it is a new network
  habit on Harry's machine, so it is his call.
- **Each half shows the other's age.** On the bridge: "home town last heard: 22 h ago (last paste)". "Cloud last heard: 4
  min ago (last ledger line)".

### 3.8 Minimum instrumentation, in order

*From plan 1 (data), section 8 (now folded into the roadmap, section 8 of this plan). References like "section 3.8" inside this part point to that plan.*

Each step is small, has a verification, and says whether it needs Harry.

| # | Step | What exactly | Needs Harry? | Effort | Verified by |
|---|---|---|---|---|---|
| 1 | **Schema + validator** | `games/works/ledger.schema.json` (v2) and `games/works/tools/validate.mjs`: parse every line, check required fields per kind, writer/kind rules, ID uniqueness, monotonic `t_rec`, privacy lint. Add to `works-test.js`. v1 lines accepted as `typed`. | No | 0.5 day | Fixture lines that must pass and must fail (one per rule). |
| 2 | **Page shows provenance and age** | Each card shows `src`, `conf`, "as of", "written 3 h later" if late; typed lines drawn pale; SAMPLE stays grey; GitHub data age badge; haze rule R4. | Taste only (how it looks) | 1 day | Screenshot test with a fixture ledger containing all four trust levels. |
| 3 | **Fix the three lies in v1 logic** | (a) lamps keyed by suite + branch + SHA; "not run on this SHA" ≠ green; (b) bridge shows open orders with age, no 2-day vanishing; (c) pairing by `job` with fallback to v1 behaviour. Suites expire to grey "not run lately", not to nothing. | No | 0.5 day | Fixtures: roomfix fail on build 30 then pass on build 29 ⇒ build 30's road stays closed. |
| 4 | **`works_log` v2 + `works_test` runner wrapper** | `games/works/tools/works_log.sh` (makes `id`, `t`, `t_rec`, `src`, `conf`, current branch and SHA automatically). `works_test <suite> -- <command>`: runs the suite, reads exit code and the "N/M" line, records `tries`, `ms`, `log_hash`, writes a `test` line. Builders use it instead of typing lines. | No (it's a script in the repo) | 0.5 day | Run one real suite pass and one forced fail; lines match exit codes. |
| 5 | **Subagent stats on every `end`** | The foreman copies tokens, tool uses and duration from each builder's completion into its `end` line (via `works_log … --tokens --tools --ms`). Written into the foreman's brief template. | No | 1 hour | Audit: share of `end` lines with stats (target 100% after start date). |
| 6 | **Street lights + fire station from the page** | The works page fetches each live path (same origin, `no-store`) every 10 min and checks a build marker; lists `b\d+/` backups from the snapshot or the Pages tree. | No | 0.5 day | Point a fixture at a missing path ⇒ dark light. |
| 7 | **Claude Code hooks → spool → flush** | Section 6 hooks, `async`, whitelisted fields, plus `works_flush`. | **Yes (security: hooks run commands; settings change)** | 1 day | Fire drill (section 9.3): start a dummy subagent, kill it, see R2 then R3 fire. |
| 8 | **GitHub snapshot job** | A scheduled GitHub Actions workflow (and on push to `gh-pages`/game branches) with `permissions: contents: read` for the API, writing `town-state.json` (branches, heads, recent commits, merges, gh-pages folders, page probes, `as_of`) and publishing it. Page reads it first and falls back to direct API only when it is older than 15 min. Schedules can run late by several minutes; the page shows the age. | **Yes (security: a workflow that writes to `gh-pages` needs `contents: write`)**. No money on a public repo. | 1 day | Audit compares snapshot heads with `git ls-remote`. |
| 9 | **`town-report.json` schema from the home town** | A fenced JSON block at the end of each run report (the standing order already asks for these numbers): `as_of`, per machine `state`, `busy_pct`, `queue_len`, `disk_free_gb`, per stage `machine`,`model`,`queued`,`start`,`end`, per resident counts. The foreman extracts it into `town-report.json` and `stage`/`result` ledger lines. Page rejects reports older than 48 h as "stale". | No (an order to the town) | 0.5 day + one order | The first report's numbers equal the markdown table's numbers (audit check A9). |
| 10 | **`ask`/`answer`, `bug`/`fix`, `idea`/`credit` kinds in use** | Foreman writes them as part of normal work; START_HERE's "Waiting on Harry" becomes generated from open `ask` lines. | No | ongoing | Town hall count = open asks; audit flags asks older than 48 h. |
| 11 | **Field-report daily totals** | After report-1 runs: the Mini's nightly summary contributes one `note`/`result` with daily totals only. | Already yes in game chat; needs saying in the town chat | small | Lint proves no times, places or pictures. |
| 12 | **(Optional) OpenTelemetry** | Only if Harry wants cost in £ per session or per-request detail: local collector on the Mini, strip `user.email`, account and session IDs, export aggregate counts only. | **Yes (download, security, maybe money)** | 1–2 days | Compare `token.usage` sums with step 5's per-job tokens. |

Steps 1–6 need nothing from Harry except taste. They remove most of today's lies on their own.

### 3.9 The truth audit: proving the town matches reality

*From plan 1 (data), section 9. References like "section 3.8" inside this part point to that plan.*

#### Daily automated audit (`games/works/tools/audit.mjs`, also runnable in `works-test.js --live`)

| Check | What it compares | Pass | Output |
|---|---|---|---|
| A1 Commits exist | every ledger `sha` | exists on GitHub on `branch` (or an ancestor merged into it) | list of ghost commits |
| A2 Coverage | every GitHub commit on active branches in the last 24 h | has a ledger or snapshot event | % covered, list of uncounted work |
| A3 Deploys are real | each `deploy` | a `gh-pages` commit within ±10 min touched `path`, and a `probe` saw 200 with the right build marker | fake or broken deploys |
| A4 Deploys were tested | each `deploy` | `tests_ok:true` backed by runner `test` lines on `from_sha` for every expected suite | "shipped untested" count |
| A5 Test honesty | each `test` | `conf:measured` share; `tries>1` never shown as plain pass | % measured, hidden flakes found |
| A6 Pairs | hires, starts, ends; orders, results; asks, answers; bugs, fixes | every open item is either fresh or already flagged | orphans with age |
| A7 Lateness | `t_rec − t` | under 10 min for measured lines | % late, median lateness |
| A8 Duplicates | same `kind`+`sha`/`path` within 5 min | none unless corrected | duplicates |
| A9 Home report agrees | `town-report.json` vs the markdown run report it came from | same numbers | mismatches |
| A10 Privacy | every line, every report | no lint hits | blocked lines (never print the offending text, only its ID and rule) |
| A11 Dependencies | external hosts in deployed HTML and vendored files vs `THIRD_PARTY.md` and `download` lines | all listed | ships with no papers |
| A12 Town = ledger | run the page headless with `?now=` at five random times, read `window.__works.state()` | lamps, lost property, walkers and weather match what the audit computes independently from the same data | any disagreement |

Output: `games/works/audit/<date>.json` plus a one-line summary (as a `note` line in the ledger). The town hall shows a
**truth meter**: "measured 72% · late 8% · orphans 2 · ghosts 0". This number is itself measured, so it may be shown.

#### Weekly human spot-check (10 minutes)

Pick 10 things on the screen at random (the audit can choose them). For each, tap the card, follow its `id` and `src` to
the line, and from the line to GitHub, the Pages URL or the results file. Score: found in under 2 minutes, and matches.
Target 10 of 10. Anything that fails becomes a `bug` line against the town itself.

#### Fire drills (prove the alarms fire)

| Drill | How | Expected |
|---|---|---|
| Stalled builder | start a dummy subagent that sleeps; stop the container or kill it | R2 at 45 min, R3 at 2 h, crier reads it |
| Restart | restart the session with an open job | `restart` line within one minute of the new session |
| Failing test | `works_test` on a deliberately broken copy | red lamp for that SHA only; road works on that branch |
| Old green | pass on an older SHA after a fail on the new one | new branch's road stays closed |
| Stale wall | a `town-report.json` 3 days old | wall greyed, "as of 3 days ago" |
| GitHub limit | page with the API blocked | "can't reach GitHub since …", haze, no frozen sunshine |

Drills run in `works-test.js` against fixtures (no real waiting), plus once for real with hooks after step 7.

#### The replay test for 15 and 16 Nov

Replay the real ledger with v2 rules and with the corrections from 5.8, and write down what the town would have shown at
16:27, 17:15, 18:30 on 15 Nov and 08:00 on 16 Nov. It must show the stall by 18:30 on 15 Nov at the latest. This is the
acceptance test for "would have caught the 15 Nov overnight stop".

### 3.10 Gaming and double counting: specific guards

*From plan 1 (data), section 10. References like "section 3.8" inside this part point to that plan.*

| Risk | Example | Guard |
|---|---|---|
| Talk counted as work | `step` lines, long reports, many messages | `step`, `note`, message counts never glow and never count toward "work done"; only commits that exist, measured tests, verified deploys and device wins do. |
| Commit stuffing | many tiny commits look busy | Show lines changed and tests touched, not commit counts; hills use failures, not commits. |
| Self-graded success | "the train marked them done" | Parcel colour from a check line written by a different writer than the maker. |
| Rerun until green | flaky passes shown as pass | `tries` recorded by the runner; any pass with `tries>1` is flaky in weather. |
| Old green hides new red | L7 | key by SHA. |
| Survivorship | only wins read out; orders vanish; nights that didn't run leave no line | Expected-events lists (nightly train, suite list per game) so absence is drawn. Crier reads fails too. Denominators always shown ("8 of 9 answered"). |
| Double counting | ledger + GitHub commits; typed + hooked deploys | dedupe by `sha`/`path`+5 min; validator flags duplicates; snapshot lines and agent lines merged by `sha`. |
| Stale as current | wall at 16:35 still shown at 22:00 | every number has `as_of`; age-based greying; haze. |
| Late typing with tidy times | 45% round-minute times | `t_rec` makes lateness visible; typed lines excluded from timing stats. |
| Attribution guesses | builder name from branch | Only hooks/job IDs attribute; otherwise "unknown builder". |
| The audit gamed | writing lines that satisfy the audit | Audit checks against independent sources (GitHub, Pages, results files), never only against the ledger itself. |

### 3.11 Freshness budget (what "live" can honestly mean)

*From plan 1 (data), section 11. References like "section 3.8" inside this part point to that plan.*

| Source | Realistic delay to the screen | Shown as live? |
|---|---|---|
| Hook lines (after flush + push + raw cache) | 5–35 min (flush ≤ 30 min, raw cache ~5 min) | "recent", with age |
| Runner test lines | same | same |
| GitHub via snapshot | schedule interval + a few minutes (Actions schedules can start late) | with age |
| GitHub direct (fallback) | 2–10 min; events up to 6 h | with age; events never trusted for stalls |
| Pages probes from the page | seconds | yes |
| Home run reports | hours (needs Harry to paste) | never "live"; always "as of" |
| iPad daily totals | next day | never live |

The town should therefore say "live" only for street lights and the page's own clock. Everything else is "as of".
This is not a weakness; it is the honest picture of a studio that crosses a bridge by wagon.

---

## 4. Operations: failures, alarms, the control room, and the town acting in steps

Mostly plan 3 (AI operations), with plan 1's stall rules. Thresholds follow Appendix A. Alarm levels are **Lamp, Bell, Call** (plan 3 said Lamp, Bell, Page).

### 4.1 What the real log says: the failure catalogue

*From plan 3 (operations), section 1 (checked in Appendix B). References like "section 3.8" inside this part point to that plan.*

I read START_HERE.md (the operating log), BUDGET_LEDGER.md, works/ledger.jsonl, the 15 Nov results file, every order, the
mega review, TOWN_MACHINES.md, the wagon guide, the standing orders and the home town's wall sketch. These are the
operational failures that actually happened. Each has an ID used in the rest of the plan.

| ID | What happened | When | Evidence | Cost |
|---|---|---|---|---|
| F1 | **Builder stopped, nobody noticed.** The build 29 builder started 14:26, stopped at 16:27 when the machine restarted, and was found at 12:19 next day | 15-16 Nov | START_HERE line 183-184; ledger `start` 14:26, `end` 12:19 next day | 19 h 52 min of dead time; build 29 late by a day |
| F2 | **Restarts threw away paid work.** Two restarts (about 10:40 and 14:49). Build 17 and build 18 builders were cut off; their tokens were "lost with the restart". Christmas decorations were restarted "then from scratch" | 13 Nov | BUDGET_LEDGER rows for builds 17, 18, decorations | Work redone; 293,934 tokens on the redo of decorations alone |
| F3 | **Usage limit hit** (a "power cut") | 15 Nov | ATLAS "Power cut" row only (no log or ledger line found: unverified) | Builders stop mid-task, same shape as F1 |
| F4 | **Lost the link to the home town.** "The town lost the Mini from 12:25"; machine facts became UNKNOWN; measure-1 waited "until the link to the Mini is back" | 13 Nov | START_HERE line 122, TOWN_MACHINES | Orders blocked; facts stale |
| F5 | **False regressions from a busy machine.** Build 18's three "regressions" were test timing on a loaded machine. Later: load average 14 with 2 builders; ar-room, snapshot, totem, battle fail the same way on old and new builds | 13-16 Nov | START_HERE lines 100-102, 155, 174, 181, 184 | Builder and foreman time chasing ghosts; tokens on reruns |
| F6 | **Flaky tests carried forward.** fun "pick up, carry and drop", water 45/45 only on rerun, totem 28/30, ar-room alignment, snapshot 5 checks. Ledger has 3 `flaky` lamps out of 15 test lines | 13-16 Nov | START_HERE; ledger statuses: 11 pass, 3 flaky, 1 fail | Every rerun costs tokens (BUDGET rule 5: "fix flaky tests once") |
| F7 | **The side-by-side run caught the truth.** The foreman ran build 27 and 28 (then 28 and 29) side by side under the same load: both failed, so it was an old flake, not a regression. This is a good practice found by hand | 15-16 Nov | START_HERE lines 181, 184 | Saved a wrong rollback. Should become the standard rule |
| F8 | **Real regression caught before release.** A tap regression in the build 29 preview; a fixer was hired and fixed it | 16 Nov | ledger 15:50 "tapping creatures broke" | Good outcome; shows the gate works when used |
| F9 | **Claims that were not true.** Build 19 fixes came back "done" with "2 claims to check (duplicate Pip chip still in shot 58; the card is not visible in shot 58)" | 13 Nov | BUDGET_LEDGER | Wrong "done" nearly shipped |
| F10 | **Work marked done that failed its brief.** "Sofa Keep pictures, town painter: six nice toy rooms. None shows what its line asked for. The train marked them done." | 16 Nov | Home wall sketch | A false parcel; nobody but a human looking would catch it |
| F11 | **A checker that says yes to everything.** The 14B coder answered "no bugs found" to all 70 pieces in seconds; pass 2 gave 10 identical generic guesses | 13 Nov | base-camp/STRESS_RESULTS.md | A judge with no signal looks like a pass |
| F12 | **A strong model stuck in a loop.** "Both reads ran past their time limit (a thinking loop) and were stopped." The riskiest code had no strong reader | 13 Nov | STRESS_RESULTS.md | The most important review did not happen |
| F13 | **Empty answers from local models.** About 1 in 8 or 9 seats empty. The Dell Writer answered "(DONE)" in two separate orders, after 2,317 s and 259 s. 7 of 144 sparks across two sets (6 of 72, then 1 of 72) were "noise: empty or too short" (corrected) | 14-15 Nov | results file; mega-1 brief | 43 min of the Dell spent on two empty answers (17% of that Dell run's 4 h 13 min) |
| F14 | **Silent and unproven seats.** Dell Builder and Quick Builder "silent"; three Radeon residents "moved, not heard" | 16 Nov | Home wall sketch "Who is speaking" | Capacity on paper that does not exist |
| F15 | **Answers that broke the house rules.** In power-1 the Elder's gadget is "heated by a small flame"; the Reasoner uses "used batteries from old toys". The rules say nothing burns, no loose batteries | 15 Nov | results file lines 223-233; mega-1 rules | Would reach a kids' game if nobody checked |
| F16 | **A judge that contradicts itself.** The town's own eyes (llava 7B) "notes contradict themselves, so they were not used as the judge" | 15 Nov | results file look-1 | No automatic picture check exists |
| F17 | **Canary failed 3 times, stage stopped** (good). The painter could not compose the scene. The fix was to reshape the brief: block-outs first (order look-1b) | 15 Nov | results file; look-1b | Good guard rail; shows "reshape the brief" as a standard fix |
| F18 | **The Dell is the bottleneck.** One model at a time; "often held for hours by one long build"; 27B took 462 min for a level the Brain built in 15; slowest resident 48 min; one resident answer took 2,867 s | 11-16 Nov | wagon guide, TOWN_MACHINES, results | Orders wait; the guide already says "treat Dell answers as a bonus" |
| F19 | **Idle machine with work waiting** ("fox in the pond"). At 16:35 on 16 Nov the Mini + Radeon was idle while the Dell had mega-review-1 waiting for 8 residents | 16 Nov | Home wall sketch | Cheapest capacity in town wasted |
| F20 | **Rebuilt things that already existed** ("white smoke"): 2 this week | 16 Nov | Home wall sketch | Duplicated work |
| F21 | **Too many hand touches.** "3 hand touches per order"; home town cannot push to GitHub; every result comes back through Harry pasting | ongoing | Home wall; wagon guide | Harry is the bottleneck between the towns |
| F22 | **Orders with no result logged.** The ledger has 5 `order` lines (mega-1, scan-1, report-1, keep-1, mega-review-1) and 0 `result` lines. On 13 Nov six orders waited for Harry to paste them | 13-16 Nov | ledger; START_HERE line 115 | "Wagons" leave and nobody tracks their return |
| F23 | **Approval in the wrong room.** report-1: Harry said yes in the game session, but "he still needs to say it in the town chat" | 16 Nov | report-1 NEEDS HARRY | A real yes that does not count yet; easy to forget |
| F24 | **Decisions piling up for Harry.** 13 Nov list: GitHub tools yes/no, the Remote Control bridge, five taste calls, shop mode money | 13 Nov | START_HERE lines 114-120 | Work blocked on decisions with no age shown |
| F25 | **Disk near the floor.** Mini had 27 GB at 12:25 on 13 Nov, under its 30 GB refuse-jobs floor; 35 GB on 16 Nov | 13-16 Nov | TOWN_MACHINES; wall sketch | The town refuses new jobs without warning the cloud |
| F26 | **One heavy job per machine is a hard rule** (brake stops the town if memory runs out). Brain and pictures cannot share the Radeon | ongoing | wagon guide update 13 Nov | Plans that assume parallel Radeon work fail |
| F27 | **Merge chains.** "Must merge with game/bc-sound before deploy", "Merge it last", bc-merge20 then bc-fixes19 | 13-14 Nov | START_HERE | Order of merges lives only in prose |
| F28 | **Context loss is designed around.** "Start each day in a fresh session"; builders "brief in, report out, then they forget" | ongoing | START_HERE line 89; ATLAS | Memory is only what was written down |
| F29 | **Budget is invisible to the AI.** "Harry reads the plan meter (CAIRN cannot see it)"; no new work under 15% | ongoing | BUDGET_LEDGER rule 7 | The foreman flies blind on fuel |
| F30 | **Logs left outside git.** A full 24-suite run went to "scratchpad b21.log"; Works v1 was "saved by the foreman" as WIP | 14-16 Nov | START_HERE line 165; git log | Evidence lost on restart |

**What the log does well, and the town should keep:** backups of every live build (b17 to b28, the fire station), canaries
with a stop after 3 failures (F17), the almanac stop rule ("two nights in a row fewer than 2 real answers: pause and tell
Harry"), honest counts with words untouched, side-by-side runs (F7), and the new standing order for a run report with
every result.

#### The patterns behind the 30 failures

The 30 rows fall into seven families. These match the three groups in the Berkeley study of multi-agent failures (MAST):
system design, agents misaligned with each other, and weak checking of the work [S1].

| Family | Failures | Plain meaning |
|---|---|---|
| A. Silent stops | F1, F2, F3, F4, F12, F14 | Something stopped and did not say so |
| B. False signals from the test yard | F5, F6, F7, F8 | Red that was not real, or green that needed reruns |
| C. Done that was not done | F9, F10, F11, F15, F16, F30 | A claim with no independent check |
| D. Empty or weak output | F13, F14, F17 | A seat that answered nothing, or noise |
| E. Wrong load on machines | F18, F19, F25, F26 | Jams, idle machines, full disks |
| F. Waste and overlap | F20, F2, F27 | Work done twice or tangled |
| G. Waiting on the human | F21, F22, F23, F24, F29 | Harry as the only wire, the only approver and the only fuel gauge |

### 4.2 Stall detection, done properly

> **Decision (Appendix A #1).** Until builders write heartbeats, the page uses amber at 45 min and red at 2 h of silence (as v1 does now). Once `beat` lines flow (at most one per 10 min per job), it moves to **late at 20 min, lost at 60 min**, or at once on a `restart` or `limit` line while the job was open. Whole-town haze after 3 h of total silence in a working window. Plan 1's table below shows the first stage; plan 3's P1 shows the second.

*From plan 1 (data), section 7. References like "section 3.8" inside this part point to that plan.*

| Rule | Condition | Shown as | Why this threshold |
|---|---|---|---|
| R1 Hired, never started | `hire` with no `start` (same job) after 15 min | cart at the hut | Starts follow hires within a minute or two |
| R2 Silent builder | open job (start, no end), no `beat`/`commit`/`test` with that job for **45 min** | lost property, amber lamp | Builders use tools every few minutes; 45 min tolerates a long test run. v1 used 2 h, which would have caught 16:27 only at 18:27. |
| R3 Lost | same as R2 for 2 h | lost property, red alarm, town crier | Real abandonment |
| R4 Whole studio silent | no measured line at all for 3 h during a declared working window | haze over the town, "last heard 15:12" | Catches a dead foreman, where nobody is left to write anything |
| R5 Restart with open jobs | `restart` line listing open jobs | power cut on those workshops (lights go off, no flashing) | Catches the 15 Nov case at the moment it happens |
| R6 Order stuck | `order` with no `quote` after 12 h (amber) or 24 h (red); `go` with no `result` past its due time, or the quoted minutes × 2 + 24 h (Appendix A #24) | wagon on the bridge with a clock | Pastes go through Harry; long but bounded |
| R7 Ask stuck | `ask` blocking work with no `answer` after 24 h (a Bell) or 48 h (a Call) | the scroll on the town hall yellows and curls; the bell lights sky blue | Nothing waits forgotten |

Notes:
- The page computes R2–R4 from the clock and the newest data. So the alarm works when every writer is dead, as long as
  the page itself can still read GitHub (and if it cannot, the page says so: "can't reach GitHub since 14:02").
- A **working window** avoids false alarms at night: open jobs declared "overnight" (Harry's overnight runs) keep their
  beats; idle hours with no open job are quiet, not stalled.
- Would this have caught 15 Nov? Builder `mac` started 14:26; machine restarted 16:27. With hooks: `restart` at the next
  session start, or R2 at ~17:12 (45 min after the last beat) and R3 at ~18:27. v1 caught it 20 hours late, by hand.

### 4.3 The 18 failure patterns: how the town shows each one, the alarm rule, and the fix it prompts

*From plan 3 (operations), section 4. References like "section 3.8" inside this part point to that plan.*

Times are UK. "Lamp" means a colour on the building. "Bell" means a sound and a line on the town crier's board. "Call"
(plan 3 said "Page") means a message that reaches Harry (used rarely: see section 7, and section 5.8 of this plan).

#### P1. The stalled builder (F1, F3, F12)

- **Shows as:** the builder walker stops in the workshop doorway. After the grace time its cart rolls to the **lost
  property office** with a red lamp. A small clock above it counts the hours.
- **Alarm rule:**
  - `late`: a builder with a `start` and no `beat`, `step` or `commit` for 20 minutes.
  - `lost`: no sign for 60 minutes, or any `restart`/`limit` line while it was running.
  - The ledger guide's current rule is 2 hours. That is too long: in F1 it would still have lost 2 hours. Builders log a
    beat every ~10 minutes, so 20 minutes is two missed beats.
  - **Decision:** 20 / 60 min applies once heartbeats flow (v2); until then 45 min / 2 h (section 4.2).
- **Fix it prompts:** "Resume builder `bc-mac` from commit `xxxx`. Resume brief ready." The resume brief is made
  automatically: the original brief, the branch diff since the start, the last 10 ledger lines from that builder, its last
  `claim`, and "do not start from scratch". This is the step that would have saved the Christmas decorations redo (F2).
- **Automation level:** L2 (section 8). The control room can re-hire one stalled builder from its last commit, once. A
  second stall on the same brief means the brief is too big (see P9) and needs the foreman.

#### P2. The power cut: usage limit or restart (F2, F3, F29)

- **Shows as:** the power station goes dark; every workshop lamp dims at the same moment. A "gap" band appears on the
  timeline.
- **Alarm rule:** two or more workers go `late` within 5 minutes of each other, or a `limit` line arrives. The
  coincidence is the tell: one late worker is a stall, many at once is a power cut.
- **Fix it prompts:**
  1. Write the `restart` line with the list of what was running.
  2. If the limit has a known reset time, set a wake for 5 minutes after the reset.
  3. On wake, resume each lost builder from its last commit (P1), oldest first, keeping the 2-builder cap.
  4. Note the lost tokens in the budget ledger.
- **Prevention:** builders commit work in progress early and often (at least every 20-30 minutes), so a restart loses
  minutes, not builds. Long jobs are checkpointed.

#### P3. The silent bridge: lost link to the home town (F4, F21, F22)

- **Shows as:** the bridge has a lamp and a "last heard" clock. Wagons (orders) waiting on the bridge show their age. A
  wagon past its due time turns amber, then red, and a crow sits on it.
- **Alarm rule:**
  - Order sent, no quote within 12 hours: amber.
  - Order has a `result_due` and no result by then: red.
  - No paste from the home town for 24 hours while orders are open: the bridge lamp goes red.
- **Fix it prompts:** one copy-and-paste block for Harry (his rule: one block per destination): "Town: please send the
  quote or result for X, Y. If the Mini is unreachable, say so." The control room never sends a second message about the
  same wagon on the same day.
- **Structural fix (Harry's call, security):** a mailbox the home town can write to without Harry (the Remote Control
  bridge or a GitHub mailbox discussed on 13 Nov). Until then, the target is to cut "3 hand touches per order" to 2 by
  making the paste block the only touch for both quote and result.

#### P4. The false regression: busy-machine test failures (F5, F6, F7)

- **Shows as:** in the inspection yard, a lamp that fails turns orange first ("checking"), not red. The yard shows a load
  gauge. When the old build fails the same test under the same load, the lamp turns to **grey cloud** (old flake, not
  this build), not red.
- **Alarm rule:**
  - A suite fails while the machine's load average is above the number of cores (or above 2 builders working): mark
    `suspect-load`, do not raise red.
  - Any new failure triggers a **paired run**: the same suite on the last live build and the new build, side by side, at
    the same time. This is the F7 practice made automatic.
  - Paired result: new fails and old passes = **regression (red, blocks deploy)**. Both fail the same checks = **old
    flake (grey cloud, does not block, goes on the flake list)**. New passes on rerun and old passes = **flaky (amber)**.
- **Fix it prompts:** red: "Hire a fixer for suite X on branch Y, here are the failing checks." Grey: "Add suite X check N
  to the flake list." Amber: nothing now; it counts toward P5.
- **Automation level:** L2. Running a paired test is safe and undoable.

#### P5. The flaky suite (F6)

- **Shows as:** weather. A suite that flaked in the last 7 days gets a small cloud over its lamp. Three or more flaky
  suites makes the yard overcast. The yard keeps a **flake budget** bar.
- **Alarm rule:** a suite that is flaky 3 times in 7 days, or that needed a rerun on 2 builds in a row, goes on the
  **quarantine** list. Google's testing team found about 16% of its tests had some flakiness and uses reruns and
  quarantine [S11].
- **Fix it prompts:** "Suite X is flaky (3 in 7 days, cost: N reruns). Hire a one-time test fixer: make it wait on game time,
  not wall time." That exact fix worked on 13 Nov (tests now wait on game time). BUDGET rule 5 already says: fix flaky
  tests once.
- **Quarantine rule:** a quarantined suite still runs and is still shown, but it does not block deploy alone. It leaves
  quarantine after 10 clean runs. No more than 3 suites in quarantine at once; a fourth forces a fix before new features
  (an error budget for tests, in the SRE sense [S12]).

#### P6. Done that is not done (F9, F10, F11, F15, F16)

- **Shows as:** a parcel at the post office. A parcel with only a `claim` is a **plain brown box, unlit**. A parcel with
  every claim checked by someone else is **wrapped in gold and lit**. A parcel with a failed check is **torn**. This follows
  the town's own verdict: "it shows talk better than finished work", so finished, verified work glows brightest.
- **Alarm rule:**
  - Any `deploy` whose parcel has an unchecked claim: block, unless the foreman writes a `check` himself with evidence.
  - Any `result` from the home town marked done where the stage test was not run or was judged by the maker: "unchecked".
  - A checker whose verdicts are 100% "holds" over 20 items, or who answers in under 5 seconds per item, is flagged as a
    **rubber stamp** (F11).
  - A checker whose verdicts on the same item disagree with themselves is flagged as **unreliable** (F16).
- **Fix it prompts:** "Parcel X has 2 claims nobody checked: look at shot 58 for a duplicate chip; look for the card."
  Pictures: "6 pictures marked done; no independent check. Send to: the foreman's own look, or Harry's pick list."
- **The verification chain** is laid out in section 5.4.

#### P7. The empty letterbox: empty or broken answers from local models (F13, F14, F17)

- **Shows as:** each resident's house has a letterbox. A real answer is a letter. An empty answer is an **open, empty
  letterbox**. "(DONE)" and other non-answers count as empty. A seat that has not been heard at all has **dark windows**;
  "moved, not heard" is **fog over the house**.
- **What counts as empty or broken (computed, not judged):** fewer than 8 words; only a sentinel like "(DONE)"; does not
  fit the JSON shape asked for; repeats the prompt; wanders off topic (for sparks, the town already tags "noise: empty or
  too short").
- **Alarm rules:**
  - The same seat empty twice in a row: that seat goes **on the bench** (not asked again until a test answer passes). The
    Dell Writer meets this rule today: "(DONE)" in power-1 and again in economy-1.
  - Order-wide empty rate above 20%: bell. The almanac rule (fewer than 2 real answers two nights running: pause and tell
    Harry) stays as it is.
  - An empty answer that took more than 10 minutes: cost alarm, because it burns the slowest machine. The Writer took
    2,317 s to say "(DONE)".
- **Fix it prompts (in order):**
  1. Retry once, shorter: halve the context, keep the JSON shape, and for the Mill stay under 300 words.
  2. If still empty, put the seat on the bench and give its turn to the next seat with the same talent.
  3. Ask the home town for a one-line diagnosis in the next run report (for example, whether a thinking model's answer
     was cut away with its thinking).
- **Automation:** retries are the home town's to run (it owns its machines). The cloud control room only suggests them in
  the next order.

#### P8. Answers that break the house rules (F15)

- **Shows as:** the **courthouse**. Each answer is checked against the rule list: nobody dies, nothing burns, no loose
  batteries or flames, no brands, no real landmarks, nothing personal. A broken rule puts a **red ribbon** on that letter
  in the market square, and the resident's report card loses a point.
- **Alarm rule:** any rule break in material marked for a kids' game blocks it from the game files. A seat with 3 rule
  breaks in 7 days gets a stricter prompt (rules first, at the top).
- **Fix it prompts:** "Elder's gadget uses a flame; Reasoner's uses loose batteries. Kept in the honest count, marked
  'not for the game'." Words are never edited (the honesty rule); they are flagged.
- **How:** a word list catches most of it (flame, fire, burn, battery, plug, socket, blood, die, kill, brand names); a
  second model reads anything the word list passes. The foreman checks everything before it goes in a game (already the
  rule in the wagon guide).

#### P9. The brief that was too big (F2, F12, F17)

- **Shows as:** the **hills**. A workshop whose job has run past its expected time grows a hill. Each restart or retry
  makes the hill taller. A brief that has been resumed twice gets a **"split me" flag** on its wagon.
- **Alarm rule:**
  - Running time above the 85th percentile of builder run times (from the ledger: start to end), or above 2x the
    `est_min` on its `hire` line.
  - Or the same brief needed a resume twice.
  - Or a home town stage over 30 minutes that the town did not split into sessions (the town's own rule from 13 Nov).
  - Or a model hit its time limit in a thinking loop (F12).
- **Fix it prompts:** "Split brief X: here are the 3 parts it touches (from the file list). Suggested split: A then B,
  C waits." For the home town: "Smaller input (the Brain reads up to about 13 KB)" or "reshape: block-out first" (the
  look-1b fix after F17).
- **Rule of thumb from the log:** builder briefs that finished cleanly were single-purpose (couch versus: 48 min; snapshots:
  about 4 hours). Briefs that got cut off were merges plus features. Keep one goal per builder.

#### P10. The traffic jam: a bottleneck machine (F18, F26)

- **Shows as:** the road to the Dell fills with cars. Each car is a job; its length is the expected run time. A **jam
  meter** shows "wait to start" against "time running".
- **Alarm rule:**
  - Queue wait on a machine is more than 2x its run time for 2 orders in a row.
  - Or a job has waited over 6 hours.
  - Or a build depends on a Dell stage (the wagon guide says: never make a build wait for the Dell).
- **Fix it prompts:** "Dell queue: 9 hours. Options: (a) mark Dell stages as bonus and let the order finish without them;
  (b) ask the 3 quick residents (7B, 8B, 12B) only; (c) move the 'own answers' talent to the Brain on the Radeon in a gap."
  The town chooses (it says HOW; the cloud says WHAT).
- **Flow efficiency number:** for each order, time actually running divided by total time from order to result. Shown on
  the bridge. Most of PatchTown's lead time is waiting (queue plus waiting for Harry's paste), so this number shows where
  to push.

#### P11. The fox in the pond: idle machine with work waiting (F19)

- **Shows as:** the fox, as the Choreographer invented it. A fox sits in the pond next to any machine that is idle while a
  job it could do is waiting somewhere.
- **Alarm rule:** a machine idle for 15 minutes or more while a queued job has a talent that machine can do. If the job is
  waiting on a dependency (for example, the Brain stage waits for residents' answers), draw a rope from the job to the
  thing it waits for.
- **Fix it prompts:** "Radeon idle; mega-review-1 Brain stage waits on 8 Dell residents. Let the Brain start from the
  brief now and add the residents later?" Also the standing advice: "Fill the Radeon's gaps with pictures."
- **Order design fix:** every order lists for each stage what it truly needs. Stages that only need the brief start at
  once. This is a change to the order form: a `needs:` line per stage.

#### P12. The reservoir: disk, memory, load (F25, F26)

- **Shows as:** the reservoir water level for the Mini's disk, with the 30 GB floor painted on the wall. A thermometer on
  each machine for memory. A load gauge on the cloud workshop (load average).
- **Alarm rule:**
  - Disk under 40 GB: amber. Under 33 GB: red. Show "days to floor" from the trend.
  - Cloud load average above twice the core count, or more than 2 builders: amber; tests marked `suspect-load` (P4).
  - Any brake stop (memory): red, with the job that caused it.
- **Fix it prompts:** disk: "A list of the biggest files the town could archive or delete. Harry decides (deleting is his
  call)." The control room never deletes. Load: "Hold the next builder until the current tests finish."

#### P13. White smoke: rebuilt something that already existed (F20)

- **Shows as:** white smoke over the building that was rebuilt, as the Swarmkeeper invented it.
- **Alarm rules:**
  - **Before hiring:** every brief carries an `exists_check` line: what was searched (branches, games folder, ledger) and
    what was found. A brief without one is a "blind hire" and gets a small grey flag.
  - **After:** a new file or function whose name or purpose matches something already on another branch (a simple name
    search over branches and the ledger) raises the smoke.
- **Fix it prompts:** "Already exists: X on branch Y (commit Z). Reuse it?" The Anthropic research system found vague
  briefs made subagents duplicate each other [S8]; the brief must say what already exists and what is out of bounds.

#### P14. The sorting office: merges and branch chains (F27)

- **Shows as:** rails between workshops in the order they must merge. A branch that must merge before another has an
  arrow. A branch that has drifted far from the live build has a long, sagging rail.
- **Alarm rule:** a branch more than 2 live builds behind, or with a "must merge before" note older than 24 hours.
- **Fix it prompts:** "Merge bc-sound into bc-build20 before deploy (from the brief)." Merge order is written as data in the
  `hire` line (`merge_after: game/bc-sound`), not only in prose.

#### P15. Unposted parcels: work outside git (F30)

- **Shows as:** a parcel left on the workshop step instead of at the post office.
- **Alarm rule:** an `end` with no commit, or a test log path that is not in the repo.
- **Fix it prompts:** "Commit the log or its summary before ending." Builders' briefs say: "No end without a commit."

#### P16. The town hall backlog: waiting on Harry (F21, F23, F24)

- **Shows as:** motions pinned on the town hall board, each with an age. Fresh motions are white; over a day, cream; over
  three days, yellow and curling; over a week, brown (Appendix A #25). Each motion shows what it blocks (a rope to the stuck wagon or workshop). The **toll booth** on
  the bridge shows downloads and installs waiting.
- **Alarm rules:**
  - A motion that blocks running work and is over 24 hours old: the town crier reads it out once, in the next morning
    report.
  - A yes given in the wrong room (F23) shows as **"yes, needs saying in the town chat"**, a half-green motion.
  - More than 7 open motions: the crier says "too many questions" and the foreman must decide the cheap, reversible ones
    himself (decide, don't ask).
- **Fix it prompts:** one daily block for Harry: up to 5 questions, each one line, each with the default that happens if
  he says nothing (only for reversible, non-money, non-security calls), each with the room it must be said in.

#### P17. The empty fuel gauge: budget and limits (F3, F29)

- **Shows as:** the battery gauge. It shows the last plan-meter % Harry read out, the time he read it, and an estimate of
  use since then from builder tokens in the ledger.
- **Alarm rule:**
  - Estimated game half under 25%: amber; under 15%: red (the existing rule: no new work under 15%).
  - The reading is older than 24 hours: the gauge shows "unknown, ask Harry".
- **Fix it prompts:** "Before the next big build (est. 300k tokens), please read the plan meter." Value per token, in
  BUDGET rule 6 order: first 10 minutes and pacing, then fixes from Harry's play, then new features.

#### P18. Context loss after restarts (F28)

- **Shows as:** the **archive** (git, START_HERE, HANDOVER). A **memory freshness** clock on the foreman's hut: when
  START_HERE and the open briefs were last brought up to date.
- **Alarm rule:** a live deploy, a stall or a new order since START_HERE was last updated, for more than 4 hours.
- **Fix it prompts:** "Update START_HERE: build 29 live, depth on next/." The resume brief (P1) is the builder-level version
  of the same idea.

#### Summary table of alarms

| ID | Name | Town sign | Fires when | Prompts | Level |
|---|---|---|---|---|---|
| P1 | Stalled builder | Lost property | 20 min no beat (late), 60 min or restart (lost) | Resume from last commit with an auto brief | L2 |
| P2 | Power cut | Dark power station | 2+ late together, or a limit line | Wake at reset, resume in order | L2 |
| P3 | Silent bridge | Crow on wagon | No quote 12 h; result past due; no paste 24 h | One paste block for Harry | L1 |
| P4 | False regression | Orange then grey cloud | New failing test | Paired run vs last live build | L2 |
| P5 | Flaky suite | Clouds; flake budget | 3 flakes in 7 days | Quarantine; hire one-time test fixer | L1 to L2 |
| P6 | Unchecked claim | Brown box vs gold parcel | Deploy or result with unchecked claim; rubber-stamp checker | Block deploy; list what to check | L2 block, L0 check |
| P7 | Empty answers | Empty letterbox; dark windows | Same seat empty twice; order empty rate over 20% | Retry shorter; bench the seat | L1 (home town acts) |
| P8 | Rule breaks | Courthouse red ribbon | Word list or reader hit | Flag "not for the game" | L2 flag |
| P9 | Brief too big | Hills; "split me" | Over P85 or 2x estimate; resumed twice | Suggested split | L1 |
| P10 | Bottleneck | Jam on the road | Wait over 2x run, or over 6 h | Make Dell a bonus; reroute talent | L1 |
| P11 | Idle with work | Fox in the pond | Idle 15 min with eligible work | Start the stage that does not need to wait | L1 |
| P12 | Resources | Reservoir; gauges | Disk under 40/33 GB; load high | List for Harry; hold next builder | L1 / L2 hold |
| P13 | Duplicate work | White smoke | Blind hire; name match | Reuse instead | L1 |
| P14 | Merge chains | Rails | Branch 2 builds behind; stale "merge first" | Merge in order | L1 |
| P15 | Work outside git | Parcel on the step | End without commit | Commit first | L2 block end |
| P16 | Waiting on Harry | Town hall board | Blocking motion over 24 h; yes in wrong room | Daily 5-question block | L1 |
| P17 | Fuel | Battery gauge | Under 25%/15%; reading over 24 h old | Ask for a reading; hold new work | L2 hold |
| P18 | Stale memory | Archive clock | START_HERE behind events by 4 h | Update the file | L1 |

### 4.4 The control room layer

*From plan 3 (operations), section 5. References like "section 3.8" inside this part point to that plan.*

The control room is a mode of the town, toggled from the town hall. The town stays the picture; the control room puts
numbers and buttons on it. On a phone it collapses into one scrolling list, most urgent first.

#### The flow board: queues and work in progress

A Kanban board drawn as the high street. Each column is a stretch of road. Each card is a car.

| Column | What is in it | WIP limit | Source |
|---|---|---|---|
| Asked | Harry's ideas and goals not yet briefed | none (a backlog) | Harry's words, the roadmap |
| Briefed | A builder brief or an order written, not started | 5 | `hire`/`order` lines |
| Waiting on Harry | Needs a paste, a yes or a taste call | shown with ages; no limit, but over 7 triggers P16 | `ask` lines |
| Building (cloud) | Builders working | **2** (the existing rule) | `start` without `end` |
| In the home town | Orders quoted or running | 1 heavy job per machine | quotes, run reports |
| Inspection | Tests and checks running or waiting | 3 | `test`, `claim` without `check` |
| Ready to ship | Checked, waiting to deploy | 2 | `check` all holds, no `deploy` |
| Live | Deployed with a backup | none | `deploy` with `backup` |
| Proven on device | Tried on Harry's real iPad | none | `win` from Harry |

Notes:

- **"Proven on device" is a separate column on purpose.** The mega review's biggest risk is that almost nothing has been
  played on a real iPad. Live is not the same as proven. The fog stays over anything live but not proven.
- **Aging WIP.** Each card shows its age in its current column. A card older than the 85th percentile for that column turns
  amber. This is the "work item age" practice from Kanban flow metrics, a leading signal before anything is late [S13].
- **Cumulative flow.** A small stacked chart on the town hall shows how many cards were in each column each day. A
  widening band means work piling up; a flat "Live" line means nothing shipped [S13].

**Flow numbers shown on the board:**

| Number | Definition | Today (from the log, where it can be read) |
|---|---|---|
| Lead time | From "asked" to "live" | Example: build 29 hired 14:25 on 15 Nov, live 17:10 on 16 Nov: about 27 h, of which about 20 h was the stall |
| Cycle time | From builder `start` to `end` | Couch versus 48 min; snapshots 4 h 5 min; fixer 1 h 16 min |
| Throughput | Items reaching "live" per day | 14 Nov: builds 20, 21, 22, 23, 24, 26 and 27 (7 deploys in one day); 15 Nov: 28, couch, Kitchen Run |
| Work in progress | Cards in "Building" plus "In the home town" | Kept at 2 builders; home town shows orders open |
| Flow efficiency | Running time / lead time | Not measurable yet: needs the run report's queue minutes |
| Order lead time | Order sent to result received | Not measurable: 5 orders in the ledger, 0 results logged (F22) |

Little's Law ties three of these together: average lead time = work in progress / throughput [S6]. So if the home town has
6 orders open and returns 1 result file a day, a new order waits about 6 days. The board should show that sum next to the
bridge, so the foreman does not send a seventh order expecting it tomorrow.

#### Capacity: the machine board

One row per worker. The cloud and the home town on the same board, with the river between them.

| Worker | Capacity unit | Busy now | Queue | Healthy? | Notes from the log |
|---|---|---|---|---|---|
| Foreman (cloud) | 1 session; usage plan | heartbeat age | asks open | beat under 15 min | Decides, briefs, checks, deploys only (BUDGET rule 2) |
| Builders (cloud) | 2 slots | which branch, age | briefed cards | beats under 20 min | Load average shown; 2 is the cap |
| Mini | robot browsers, test runs | jobs | queue | disk, link | Nearly always free for robot tests |
| Radeon VII | 1 heavy job (Brain, pictures, coder, trainer) | which | queue | brake stops | Brain about 10 min an answer; pictures 35-60 s |
| Dell | 1 model at a time | which resident | residents waiting | empty rate | Slowest; treat as bonus |
| Mill | 1 model; prompts under 300 words | which expert | queue | noise rate | 72 sparks in 25 min |
| Harry | about 5 decisions a day (assumption; ask him) | motions open | pastes waiting | age of oldest | The scarcest worker in town |

**Capacity figures for the night train** (from the wagon guide's 12-hour estimates): Radeon about 70 Brain answers or about
500 pictures or 12 trained experts; Mill about 2,000 sparks; Dell 20-40 resident answers if free; Mini thousands of robot
games. The planner (5.3) books against these and shows a **booked vs. capacity bar** for tonight. measure-1 will replace
estimates with measured numbers when it runs.

#### Scheduling across the cloud and the home town

The home town decides HOW (its rule: "you say WHAT you want. The town says HOW"). So the cloud control room does not
schedule the home machines directly. It plans the order mix and shows the expected load. The home town's run report then
shows what really happened.

**Rules the cloud planner follows when writing orders** (all already in the wagon guide or log; the control room checks
them automatically before an order is committed):

1. **Three machines at once.** A good order has a Radeon stage, a Mill stage and a Dell stage that can run side by side.
2. **Radeon stages run one after another**, never in parallel (one heavy job).
3. **No build waits for the Dell.** Any Dell stage is marked `bonus: yes`.
4. **Every stage has a canary and a checkable test.** An order without one is refused by the order linter.
5. **Every input is committed** with a path and branch; the linter checks the path exists on that branch.
6. **Budget given** in machine time and download size.
7. **Four questions per sitting at most; a JSON shape; about 220 words.**
8. **A `needs:` line per stage** so stages that do not depend on others start at once (P11).
9. **NEEDS HARRY lists every download or install** with name, size, licence and why. The linter turns each into an `ask`
   with `room: town chat`.
10. **Send early in the day.** The order shows "expected result" using the queue sum from 5.1.

**The order linter** is the first concrete automation: a script that reads `games/orders/<id>.md` and checks rules 4 to 9
before the foreman gives Harry the paste line. It catches problems while they are cheap (the canary idea applied to
orders themselves).

**Cloud builders:**

- Two slots. A third brief waits in "Briefed".
- **Priority classes**, from BUDGET rule 6: (1) fixes that block a live build or Harry's play; (2) the first 10 minutes and
  pacing; (3) fixes from Harry's play; (4) new features; (5) the town itself.
- **Tests run in the gap.** The foreman does not start a heavy test run while 2 builders are compiling and testing (load
  under the core count), or the tests run paired (P4).

**The daily rhythm** (from START_HERE, "Daily milestones") becomes the control room's timetable:

| Time (UK) | Control room shows | Who acts |
|---|---|---|
| Morning | Overnight results and the night train's arrival; stalls; the day's goal | Foreman reads; Harry pastes results |
| Day | Builders, yard, shop window; stall alarms | Foreman, builders |
| 17:00 | Goal check: hit, partly, missed, with a link and a picture | Foreman |
| Before Harry stops | Tonight's orders, booked vs. capacity; the one paste block | Foreman writes; Harry pastes |
| Night | Watchdog only. Wake-ups every 2 hours (as on 13-14 Nov) | Scheduled task |

#### The verification chain: AIs checking each other

The rule: **every claim gets a second key from a different checker.** The checker must be a different kind of thing from
the maker where possible (a test is better than a model; a different model is better than the same one; Harry is the final
key only for taste and real-device facts).

| Work | Maker | First key (automatic) | Second key | Final key |
|---|---|---|---|---|
| Game code | Builder | The suites, paired with the last live build (P4) | Foreman reads the diff and the shots | Harry plays on the iPad (moves the card to "proven") |
| Screenshot claims ("no duplicate chip") | Builder | none | Foreman looks at the named shot | — |
| Deploy | Foreman | Live link starts with 0 errors (noxr, diagclash, WebKit + Chromium) | Backup exists and opens | — |
| Resident answers | Dell / Mill / Radeon seats | Shape check (JSON), empty check, word count, rule word list | A second model reads rule breaks (P8) | Foreman before anything goes in a game |
| Sparks | Mill experts | Noise check (the town already tags it) | Best-of pick by another seat | Foreman, then Harry picks winners |
| Pictures | Picture maker | none reliable today (F16) | Foreman looks, using the line it was meant to show | Harry picks style |
| Code reviews by local models | 14B coder, Brain | **Calibration check:** plant 3 known bugs and 3 clean pieces in each batch; a reviewer that misses planted bugs or says "no bugs" to everything is a rubber stamp (F11) | Foreman checks each BUG line | — |
| Trained experts | Trainer | Blind 10-prompt test judged by the Brain (mega-review-1 stage 4) | Foreman reads the before/after | Harry |
| Order results | Home town | Honest count adds up (asked = answered + empty + broken + timed out + no turn) | Foreman | — |

**Calibration ("known answers").** The cheapest fix for F11 and F16 is to slip items with known answers into every batch
a model judges. If a judge cannot spot a planted bug or a planted off-brief picture, its verdicts that day are shown as
"uncalibrated" and do not count as a key. This is how the town learns which of its residents can be trusted to check
others, and it fills each resident's **report card** with real numbers.

**Report cards per seat** (the atlas's "report card" and "empty letterbox", made concrete):

| Field | Meaning |
|---|---|
| Asked / answered / empty / broken / timed out / no turn | the honest count, 7 days and all time |
| Median seconds per answer | from run reports |
| Rule breaks | from P8 |
| Kept by Harry | ideas that made it into a game, with credit |
| Judge accuracy | share of planted items caught, if the seat is used as a judge |
| Status | answering, benched, fog (not proven), resting by Harry's rule |

#### Approvals: the town hall and the toll booth

**What needs Harry** (from the standing rules and the overnight limits): money, security, deleting, downloads, installs,
sending anything to the shop or anyone else, anything personal, new repositories, changes to the town's setup, and taste
calls.

**The motion card:**

| Field | Example |
|---|---|
| Question (one line) | "Download the 3D-room maker (about 2 GB, Apache 2.0) for scan-1?" |
| Type | download |
| Blocks | scan-1 stage 1 |
| Default if silent | none (downloads never default to yes) |
| Room where the yes must be said | town chat |
| Age | 2 days |
| State | open / yes in wrong room / yes / no / withdrawn |

**Rules:**

1. **Money, security, deleting and downloads never have a default.** Silence means no.
2. **Taste calls get a default** after 72 hours if they are reversible (for example, "keep credits small"). The foreman
   proceeds with the default and says so in the next report. This follows the decide-don't-ask rule.
3. **A yes is only a yes in the right room.** The motion shows "yes in game session: needs the town chat" (F23).
4. **One block a day.** All open motions for Harry are gathered into one copy-and-paste block per destination (his rule from
   12 Nov), at most 5, most blocking first.
5. **Approvals are recorded as Harry's words, verbatim**, with the time and the room. LangGraph's human-in-the-loop
   pattern has the same shape: pause, show the action, then approve, edit or reject, and resume from a saved checkpoint
   [S14].

#### Budgets and limits

| Budget | Unit | Who reads it | Shown as | Rule |
|---|---|---|---|---|
| Cloud plan, game half | Harry's plan-meter % | Harry, read aloud | Battery gauge, with reading age | No new work under 15% (existing) |
| Builder tokens per job | tokens from task reports | foreman | A coin stack on each parcel | Compare to the job's class median; over 2x = check the brief |
| Home machine time | minutes per machine per order | home town quote and run report | Booked vs. used bars | Town stops at budget and reports (wagon guide) |
| Downloads | GB | Harry | Ships at the harbour | 0 unless yes in the town chat |
| Disk | GB free on the Mini | home town | Reservoir | Refuses jobs under 30 GB |
| Flake budget | suites in quarantine | test yard | Cloud cover | Max 3; then fix before features |
| Harry's attention | open motions | foreman | Town hall | Max 7 open; max 5 per daily block |
| Builder slots | concurrent builders | foreman | Workshop doors | Max 2 |

**Cost per result.** From BUDGET_LEDGER, builder jobs cost 89,729 to 534,644 tokens. The bank shows cost per live build and
cost lost to restarts. On 13 Nov at least two builds' worth of tokens were lost and one was paid twice (F2). The bank
makes that visible: a **"lost to restarts"** column in red.

#### Incidents and postmortems

**Severity levels** (PatchTown's own, in the style PagerDuty uses where a lower number is more urgent [S15]):

| Sev | Meaning | Example from the log | Response |
|---|---|---|---|
| Sev 1 | A live game is broken for players, or a rule (privacy, kids' safety) broke | build 14 did not start in WebKit (13 Nov) | Roll back to the kept build at once (fire station), then fix. Tell Harry in the next message |
| Sev 2 | Work lost or stopped for more than 2 hours | F1 (20 h stall), F2 (restarts) | Resume; postmortem within a day |
| Sev 3 | A false signal cost time (F5), a false "done" reached the post office (F9, F10) | build 18 "regressions" | Fix the check; a short note |
| Sev 4 | Waste (F13 empties, F20 duplicates) | Writer "(DONE)" | Counted on the dashboard; reviewed weekly |

**The incident card** (on the town crier's board): what happened, when it started, when it was noticed (the gap is the
key number), what was done, what is still open.

**Postmortem template** (blameless, from Google SRE [S9]). Short, for a phone:

1. What happened, in 3 lines.
2. Timeline (from the ledger, automatically).
3. Time to notice, time to fix.
4. Why the system let it happen (not "the builder failed").
5. What was lucky.
6. Actions: each one a ledger `ask` or `hire` with an owner and a date.

**Worked example: F1, the build 29 stall.**

- Happened: builder started 14:26 on 15 Nov; machine restarted; builder stopped 16:27; found 12:19 on 16 Nov.
- Time to notice: 19 h 52 min. Time to fix: build 29 live 17:10 on 16 Nov.
- Why the system let it happen: no heartbeat; the only watcher ran on the machine that restarted; the lost property rule
  (2 h) was not built yet; nobody's morning routine listed "running builders and their last sign".
- Lucky: work was on a branch; a fixer could pick it up.
- Actions: heartbeat `beat` lines (P1); watchdog outside the session (3.4); morning report starts with "running builders,
  last sign" (5.3); resume briefs (P1).

**Postmortem follow-through:** each action shows as a small scaffold on the building it fixes, until done. A weekly
"postmortem of the month" style review (from the SRE book [S9]) becomes a **weekly town meeting** card: the top 3 incidents,
the actions still open, and whether the same failure happened again.

#### Memory and handover

- **Resume packets** for every running builder (P1), written automatically from the ledger and the branch.
- **START_HERE freshness** clock (P18).
- **Session boundaries are marked on the timeline.** A new foreman session is a new sunrise; its first job is to read the
  control room's "what is open" list, not the whole history.
- **Builders forget, so briefs carry everything.** The brief checklist (from Anthropic's research system: objective, output
  format, tools and sources, task boundaries [S8]) plus PatchTown's own: what already exists, merge order, tests to run,
  claims to make, and "commit every 20-30 minutes".

### 4.5 The metrics catalogue

*From plan 3 (operations), section 6. References like "section 3.8" inside this part point to that plan.*

The four golden signals [S2] mapped to PatchTown, plus flow and quality.

| Signal | PatchTown metric | Definition | Where in town | Target (first guess) |
|---|---|---|---|---|
| Latency | Builder cycle time | start to end, per job class | Workshop clock | Within 2x the estimate |
| Latency | Order lead time | order sent to result logged | Bridge | Next morning for small orders |
| Latency | Time to notice a stall | last sign to alarm | Lost property clock | Under 30 min |
| Latency | Time to restore | live break to fixed or rolled back | Fire station | Under 1 hour (DORA's top band [S16]) |
| Traffic | Orders and briefs per day | count | Noticeboard | Shown, not targeted |
| Traffic | Deploys per day | count | Shop window | Shown |
| Errors | Change failure rate | deploys needing a fix or rollback / deploys | Hospital | Under 15% [S16] |
| Errors | Empty answer rate | empty / asked, per seat and per order | Letterboxes | Under 10% per order |
| Errors | False "done" rate | checks that fail / claims checked | Post office | Falling week on week |
| Errors | Flake rate | flaky runs / all runs per suite | Yard weather | Under 5% per suite |
| Saturation | Builder slots used | of 2 | Workshop doors | Not over 2 |
| Saturation | Queue wait per home machine | minutes | Roads | Under run time |
| Saturation | Mini disk | GB | Reservoir | Over 40 |
| Saturation | Harry's open motions | count and oldest age | Town hall | Under 7; oldest blocking under 24 h |
| Saturation | Plan fuel | last % and its age | Battery gauge | Over 15% |
| Flow | WIP | cards in progress | High street | 2 cloud + 1 per home machine |
| Flow | Flow efficiency | running / lead time | Bridge | Shown; raise over time |
| Waste | Rework | white smoke events; tokens lost to restarts | Smoke; bank | Zero smoke; lost tokens falling |
| Waste | Idle with work | fox minutes per day | Pond | Under 30 min |
| Truth | Proven on device | live features tried on the real iPad / live features | Fog | Rising |
| Truth | Hand touches per order | Harry's pastes per order | Bridge | 3 now; 2 next; 0 with a mailbox |

### 4.6 Alarm design: so the bells mean something

*From plan 3 (operations), section 7. References like "section 3.8" inside this part point to that plan.*

Too many alarms and people stop listening (alarm fatigue). The rules:

1. **Three tiers.**
   - **Lamp** (shown only): numbers out of range. No sound.
   - **Bell** (on the crier's board and in the next foreman wake-up): something needs action today.
   - **Call** (reaches Harry; plan 3 called it Page): only Sev 1, or a Sev 2 overnight that the control room cannot fix itself, or a decision only
     he can make that blocks everything. Target: 3 Calls a day or fewer, at most 1 outside a working window (section 5.8).
2. **One alarm per cause.** A power cut (P2) swallows the individual stalls (P1) it caused. Paired-run results replace the
   raw test failure.
3. **Every bell says what to do,** in one line, with the exact command or paste block.
4. **Quiet hours.** Harry's night is not paged except for Sev 1. The night's bells wait for the morning report.
5. **Alarms have owners.** Cloud alarms: the foreman. Home town alarms: the home town (CAIRN on the Mini). Approvals: Harry.
6. **Review the alarms weekly.** Any alarm that fired and led to no action is retuned or removed.

### 4.7 From showing to doing: the autonomy ladder

*From plan 3 (operations), section 8. References like "section 3.8" inside this part point to that plan.*

The town can earn the right to act. Each step needs Harry's yes and a week of clean running at the step below (the same
"run well for a week" rule as the standing orders).

| Level | Name | What the control room does | Examples |
|---|---|---|---|
| L0 | Show | Draws the town and the numbers | v1 today |
| L1 | Suggest | Each alarm carries a ready-made action: a resume brief, a paste block, a split plan. A person or the foreman presses go | P3, P7, P9, P10, P11, P13, P14, P16 |
| L2 | Do the small undoable things in the cloud workshop, then tell | Re-run a test as a paired run; resume a stalled builder once from its last commit; write a resume brief; block a deploy that has unchecked claims; hold the next builder when load is high; flag a rule-breaking answer; wake a fresh foreman | P1, P2, P4, P6 (block), P8 (flag), P12 (hold), P15, P17 (hold) |
| L3 | Do bigger things in the cloud, with a check window | Roll back a live game to the kept build on a Sev 1 (the fire station), then tell. Write the next order draft from the queue | Only after L2 has run clean for 2 weeks |
| Never | Harry's calls | Money; security (including the bridge, GitHub tool access, settings and hooks); deleting anything; downloads and installs; sending anything to the shop or other people; anything personal; new repositories; changes to the home town's machines or models; changing its own rules or limits | Always an `ask` |

**Guard rails for L2 and L3:**

1. **An allowlist, not a blocklist.** The control room can only do the named actions above. Anything else is a suggestion.
2. **Undoable only.** Every action can be reversed: a test rerun changes nothing; a resume works on a branch; a rollback
   points at a kept build and keeps the newer one.
3. **Rate limits.** At most one automatic resume per brief, at most 3 automatic actions an hour, at most 2 builders ever.
4. **Every action is a ledger line** with `who: control-room`, so it shows as a walker in the town and appears in replay.
5. **A dry-run week.** Before an action level is switched on, it runs for a week writing "would have done X" lines. Harry
   and the foreman compare those with what really happened.
6. **The stop lever.** A big red lever in the town hall (the andon cord from the Toyota system, where anyone can stop the
   line when something is wrong [S17]). Pulling it stops every automatic action at once. It is one setting, not a
   process, and the town shows it pulled.
7. **The control room watches itself.** Its own heartbeat is on the power station. If it is silent, the town shows "control
   room off" rather than all green (a dark street, not a sunny one).
8. **It never acts on the home town.** The home town owns its machines. The cloud control room can only write orders and
   suggestions; the home town decides. This keeps the "one door" rule.
9. **It never changes the evidence.** Old ledger lines are never edited. Model words are never tidied.

### 4.8 How this compares with real practice

*From plan 3 (operations), section 9. References like "section 3.8" inside this part point to that plan.*

| Practice | Where it comes from | What PatchTown takes | What it changes for a two-town, one-human studio |
|---|---|---|---|
| Four golden signals; alert on symptoms | Google SRE book, ch. 6 [S2] | Latency, traffic, errors, saturation mapped to builders, orders, empties and queues (section 6) | Harry's attention is a saturation signal too |
| Error budgets | Google SRE book, ch. 3 [S12] | A flake budget (max 3 quarantined suites) and the 15% fuel rule | Budget is tokens and Harry's time, not uptime |
| Blameless postmortems | Google SRE book, ch. 15 and workbook ch. 10 [S9] | Template, worked example, weekly town meeting | Agents are not blamed; briefs and rules are fixed |
| Incident severity and a single commander | PagerDuty response docs [S15] | Sev 1-4; the foreman is the incident commander | No on-call rota; the watchdog wakes a fresh foreman |
| Dead man's switch: period plus grace | Healthchecks.io [S3] | `beat` lines, late at 20 min, lost at 60 min | The watcher runs outside the session that can die |
| Heartbeat timeouts and retry policies | Temporal docs [S4] | Resume once from last commit; a stall counts as a timeout | Retries are briefs, not function calls |
| WIP limits, lead time, cycle time, Little's Law | Kanban flow metrics [S6] | The high-street board, 2-builder limit, queue sum on the bridge | Includes a human column ("waiting on Harry") |
| Aging WIP and cumulative flow | Vacanti; Kanban practice [S13] | Card ages; town hall flow chart | — |
| DORA four keys | DORA research [S16] | Deploy frequency, lead time, change failure rate, time to restore | Adds "proven on device" because live is not proven |
| Flaky test reruns and quarantine | Google Testing Blog [S11] | Paired runs, quarantine, one-time fix | Load-aware, because builders share the test machine |
| Andon cord and jidoka (stop on abnormality) | Toyota Production System [S17] | The stop lever; canaries that stop a stage after 3 failures | Already practised by the home town |
| Orchestrator-workers; evaluator-optimizer | Anthropic, Building effective agents [S5] | Foreman and builders; maker never checks own work | Local models need calibration before they may judge |
| Briefs: objective, format, tools, boundaries; duplication from vague briefs | Anthropic multi-agent research system [S8] | Brief checklist plus `exists_check` (white smoke) | Adds merge order and commit rhythm |
| Multi-agent failure taxonomy | MAST, UC Berkeley [S1] | The seven families in section 1 | Adds human-wire and hardware failures MAST does not cover |
| Task length vs reliability | METR time horizons [S7] | Small briefs; split rule P9 | — |
| Traces, spans, scores, LLM-as-judge | Langfuse docs [S18]; OpenTelemetry GenAI conventions [S19]; AgentOps (already in works/SOURCES.md) | One foreman session = a trace; each builder = a span; checks = scores | Ledger first; an OpenTelemetry bridge later, once the GenAI conventions settle (still "development" status) |
| Human approval with approve / edit / reject and resume | LangGraph human-in-the-loop [S14] | Motion cards with states; resume from checkpoint | The right "room" matters (F23) |
| Agent hooks (`Stop`, `SubagentStop`, `PostToolUse`) | Claude Code hooks docs [S10] | Automatic `beat`, `end` and `commit` lines | Needs Harry's yes (settings change) |

---

## 5. Viewing: 5 seconds, 30 seconds, 5 minutes; the wall, the phone and replay

Mostly plan 2 (reading at a glance), with plan 5's framing per device. The state vocabulary (colours, shapes, words) is in section 2.5; the sound palette in section 2.11.

**The answer in 10 lines (plan 2):**

1. The town must answer one question in 5 seconds: "Is it fine, and does anything need me?"
2. Today it cannot. The v1 page shows about 40 bits of text at once, all at similar weight.
3. The 3D town gets about 40% of a 16:9 screen. On a phone it gets about 15%.
4. Most text is too small for a projector. Label sub-lines are about 1/95 of screen height. The minimum is 1/50.
5. Fix the order: one sentence (mood), then up to 4 lit places, then the rest only on zoom.
6. Code every state 3 ways: shape, a colour-blind-safe colour, and a word. Never colour alone.
7. Motion means "this is happening now". Nothing loops for ever. Alarms never flash.
8. Sound that encodes state, and a town crier who speaks 3 items or fewer.
9. Four zoom levels (town, building, room, event) with a breadcrumb and one "home" command.
10. Three viewing modes: Wall (projector by day), Hearth (evening), Pocket (phone).

### 5.1 Who is watching, and how

*From plan 2 (glance), section 3. References like "section 3.8" inside this part point to that plan.*

Harry is dyslexic, has ADHD, works by voice, and is often tired. He watches in 3 situations.

| Situation | Distance and light | What he wants | What it means for design |
|---|---|---|---|
| **A. Evening, relaxing** (TV or projector, evening) | 3 to 5 m. Dark room. | To feel the town is alive. To hear if something needs him. Not to read. | Sound and the crier do the work. Few words. Slow camera. Warm, dark. |
| **B. By day, big projector across a room** | 4 to 8 m. Lit room, so the picture is washed out. | To check in between jobs, from across the room. | Huge type. High contrast. Still camera. One sentence, readable from the door. |
| **C. Phone** | 30 cm. Anywhere. One hand. | "Do I need to do anything?" Then maybe one detail. | Answer first. One card at a time. 3D is a picture, not the interface. |

**Voice is the common thread.** He can talk to it in all three. It can talk back in A and B, and in C with headphones.

### 5.2 What the v1 page does well, and where it fails a glance

*From plan 2 (glance), section 2. Some of these are fixed since: see section 3.2. References like "section 3.8" inside this part point to that plan.*

#### Good, keep it

- **Atkinson Hyperlegible** is already the body font. It was made to tell similar letters apart (B/8, O/0, 1/I/l). [Braille Institute via Adobe; Google Fonts repo]
- **Finished work is meant to glow brightest.** That is the right idea. It follows the town's own verdict: "it shows talk better than finished work".
- **A real replay** with a scrubber and day arrows.
- **The lost property office** catches stalls. This is the most useful alarm in the town.
- **A day/evening switch** that picks itself from the clock.
- **Labels are buttons** with Enter and Space. Escape closes cards.
- **A test harness** (`tests/works-test.js`, 217 lines) that can measure the page. We can add glance tests to it.

#### Fails, from the screenshots and the code

| # | Problem | Evidence | Why it hurts a glance |
|---|---|---|---|
| 1 | No single answer. | w1 shows 5 big numbers, a weather icon, 16 labels and 10 diary rows. All have similar weight. | Working memory holds about 4 chunks [Cowan 2001]. 40 things means no answer. |
| 2 | The biggest text is the title. | "PatchTown Works" is the largest thing on screen. | The one thing everyone already knows gets the most space. |
| 3 | The town is covered. | Plate about 33% wide x 45% tall. Diary about 25% x 90%. Timeline 10%. On phone, plate plus diary cover about 85%. | The town is the point. On the phone you can barely see it. |
| 4 | Text too small for a projector. | Root font at 1600 px wide is about 16.7 px. Label sub-lines 0.68 rem = about 11 px. Diary 0.9 rem = 15 px. On a 1080-line projector that is 1/95 and 1/72 of screen height. | The projection rule of thumb sets 1/50 of screen height as the bare minimum [8H rule]. Comfortable is nearer 1/30. |
| 5 | Labels overlap. | w1 and w7: "Harry's town", "Radeon", "Mini", "Mill", "Dell" stack on top of each other, unreadable. | Overlapping text is the worst case for a dyslexic reader. |
| 6 | Colour carries meaning alone. | Yard lamps: green pass, red fail, amber flaky. Label dots the same. Timeline ticks are colour only. | Red and green are the pair most colour-blind people confuse. Red/green vision also drops in the periphery [Attention, Perception & Psychophysics 2020]. |
| 7 | The alarm flashes for ever. | `alarmM.emissiveIntensity = 0.6 + 1.6 * abs(sin(secs * 4))`: about 1.3 pulses a second (corrected), until cleared. **v1 now pulses for 5 s only, then holds.** | Under the 3-flash limit, but it runs past 5 seconds with no stop [WCAG 2.2.2]. It is stress, not calm. |
| 8 | Everything moves all the time. | The camera auto-orbits after 4 s idle. Rain falls. Smoke rises. Walkers loop their route. | Labels slide while you read them. Motion stops meaning "something happened". |
| 9 | Reduced motion only slows things to 25%. | `sp = reduce ? 0.25 : 1`. Orbit, rain and pulses still run. **Fixed since: v1 now stops motion.** | People who ask for less motion still get a moving page. |
| 10 | Sample data looks live. | `WALL` (machines, fox, white smoke, who is speaking) is a fixed sample "as of 16:35, 16 Nov". The 3D fox and smoke show it with no age mark. | Breaks the town's rule. A glance cannot tell old from new. |
| 11 | Activity outshines value. | Every label says "12 things today". | Counts of activity are talk. The town said itself that it over-shows talk. |
| 12 | Small capitals everywhere. | Eyebrows in uppercase, letter-spaced, monospace ("TODAY · LIVE"). | Capitals remove word shapes. Dyslexia guides advise sentence case [BDA style guide summaries]. |
| 13 | Branch names as labels. | "Workshop · bc-mac", "bb-couch", "test-new". | Codes must be decoded. Plain names are read in one look. |
| 14 | The tour is too fast and too long. | 8 s per stop, every building, cards of 6 to 12 lines. | 8 s is not enough to read a card. A dozen stops is about 100 s with no story. |
| 15 | Weather can say three things at once. | w1: clouds, a rainbow and white smoke at the same time. | Mixed signals read as "pretty", not as data. |
| 16 | Long sentences in the diary. | "Base Camp build 30: depth never loads on software GL or before its frames are timed (roomfix regression)…" | A 25-word line with brackets is a full stop for a tired, dyslexic reader. |

### 5.3 The glance ladder: 5 seconds, 30 seconds, 5 minutes

*From plan 2 (glance), section 4. References like "section 3.8" inside this part point to that plan.*

Each level answers one question. Each level must work without the next.

#### seconds: "Is it fine, and does anything need me?"

Shown by 2 things only:

1. **The mood line.** One sentence, the biggest text on screen, written by rules from measured facts. It leads with what failed (Harry's rule).
   - "All calm. 3 things went live today. Nothing needs you."
   - "1 thing needs you: build 30 tests fail on depth."
   - "The Mac builder has been quiet since 16:27."
2. **The town hall bell.** Lit and blue when a decision waits on Harry. Dark when not. A number beside it.

You can get both from the door of the room without reading anything else.

Tests (measured, see section 17): show the page for 5 seconds, hide it, ask "Is anything wrong? Does it need you?" Pass if 9 of 10 answers are right.

#### seconds: "What changed since I last looked?"

Shown by:

1. **"Since you looked"**: up to 3 lines, newest problem first, then newest finished work. Each line 12 words or fewer.
2. **Up to 4 lit places in the town.** Only places whose state changed get a raised label. Everything else is quiet.
3. **The weather**, which is the tests, as in the atlas.

"Since you looked" uses the last visit time, kept in the browser (a per-viewer convenience). If there is none, it means "today".

#### minutes: "Why, where, and who?"

Shown by zooming in: building card, room, single event, replay. Details come only when asked for. This is Shneiderman's order: overview first, zoom and filter, then details on demand [Shneiderman 1996].

### 5.4 Information hierarchy

*From plan 2 (glance), section 5. References like "section 3.8" inside this part point to that plan.*

#### tiers

| Tier | What | How it shows | Max at once |
|---|---|---|---|
| 0. Mood | One sentence from the rules | Biggest text, top centre (Wall) or top (Pocket) | 1 |
| 1. Calls | Things that need Harry, and real stalls | Town hall bell, a place lamp out with a cross flag, crier speaks once | 3 |
| 2. Proof | Finished and checked work | Steady bright warm light. The brightest thing in the scene. | 4 lit labels |
| 3. Activity | Builders working, wagons out, tests running | Small slow motion: walkers, smoke, wheels. No labels in glance view. | 3 kinds of motion |
| 4. Ground | Districts, roads, river, bridge, the home town | Still. Muted. Never labelled in glance view except the 7 main places. | n/a |

Rule: **a lower tier can never be louder than a higher tier.** Louder means bigger, brighter, moving faster, or making sound.

#### The attention budget

Few's definition of a dashboard is one screen, checked at a glance [Few 2004]. Weiser and Brown's calm technology informs without demanding focus [Weiser & Brown 1995]. Case's version says it should use the least attention possible and live in the periphery [Case 2015]. So we set hard limits, and the test harness checks them.

| Thing | Wall (projector) | Hearth (evening) | Pocket (phone) |
|---|---|---|---|
| Sentences on screen | 1 mood + 3 "since" lines | 1 caption line | 1 mood + 1 card |
| Words visible (excluding open card) | 45 or fewer | 15 or fewer | 35 or fewer |
| Place labels | 7 main places, 3 words each | 0 (they appear on focus) | 4 |
| Raised (lit) labels | 4 | 2 | 2 |
| Big numbers | 3 | 0 | 2 |
| Kinds of motion at once | 3 | 3 | 2 |
| Sounds per minute (one-shots) | 6 or fewer | 4 or fewer | off by default |

#### Which 3 big numbers

Only numbers that are proof, not talk. Proposed:

1. **Went live today** (deploys and wins). This is finished work.
2. **Tests passing**, as "9 of 10 suites". Written with "of", not "9/10" (a slash is one more symbol to decode).
3. **Needs you**: count of open decisions plus stalls.

Dropped from the big row: "parcels posted", "workshops busy", "orders waiting". They move into the building cards. They are activity, not results.

### 5.5 The key screens: wall, building, phone, replay

*From plan 2 (glance), section 6. References like "section 3.8" inside this part point to that plan.*

#### Screen 1: The Wall (projector by day, the town view)

```
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|        1 thing needs you: build 30 tests fail on depth.                       [bell] 1           |
|        ^ mood line, about 1/14 of screen height, centred-left                  needs you          |
|                                                                                                  |
|   Since you looked (2 h)                                                                         |
|   x  Build 30 tests fail: depth                         18:20                                    |
|   *  Build 29 went live: Mac controls                   17:13                                    |
|   o  Builder hired: sticker key                         18:45                                    |
|                                                                                                  |
|                         .-----------.                               ~~~ river ~~~   HOME TOWN    |
|          [Workshops 3]  |  FOREMAN  |       [Shop window *]         ===bridge===   [Mini] [Dell] |
|            ^^ ^^ ^^     '-----------'         lit, steady           wagons: 2      [Mill]        |
|                                                                                    fox: idle    |
|       [Yard  x 9 of 10]           [Town hall  bell]        [Lost property  -]                    |
|        lamps in a row                                                                            |
|                                                                                                  |
|--------------------------------------------------------------------------------------------------|
|  LIVE  18:52   |  9 of 10 tests  |  13 went live  |  1 needs you  |  as of 18:51  (data 1 min)  |
+--------------------------------------------------------------------------------------------------+
```

- The camera is **still** and always at the same angle. Places never move, so Harry learns "home town is top right" and stops reading labels.
- No diary panel. No title plate. The title shows only on first load, for 3 seconds, then fades.
- The 3 "since" lines start with a shape: x for failed, * for went live, o for started. The same shapes appear on the timeline and in the 3D labels.
- The bottom strip is the "glass": live or replay, the clock, the 3 numbers, and data freshness.
- Data freshness: "as of 18:51 (data 1 min)". If data is over 15 min old, the whole strip turns grey and says "Old data: 47 min". Stale data must look stale.

#### Screen 2: Zoomed into one building (the Inspection yard)

```
+--------------------------------------------------------------------------------------------------+
|  Town  >  Inspection yard                                              [Back]  [Home]            |
|                                                                                                  |
|     The yard: 9 of 10 suites pass. 1 fails: depth.                                              |
|                                                                                                  |
|         .------------------------- yard, close up --------------------------.                    |
|         |   (O)    (O)    (O)    (O)    (X)    (O)    (O)    (~)    (O)  (O) |                   |
|         |  house  couch  snap  room  depth  roomfix market  ar-room  ...     |                   |
|         '--------------------------------------------------------------------'                    |
|          O = pass (steady light)   X = fail (lamp dark, cross flag)   ~ = flaky (half lit)        |
|                                                                                                  |
|   +-------------------------------- card ---------------------------------+                      |
|   |  Now      depth fails on build 30. Started 18:20.                      |                      |
|   |  Today    3 runs. 2 passed.                                             |                      |
|   |  Proof    roomfix 35 of 35 on build 29 (18:16)       [open commit]      |                      |
|   |  [Read aloud]   [Replay this building]                                  |                      |
|   +------------------------------------------------------------------------+                      |
|--------------------------------------------------------------------------------------------------|
|  LIVE  18:52   |  9 of 10 tests  |  13 went live  |  1 needs you  |  as of 18:51                  |
+--------------------------------------------------------------------------------------------------+
```

- Every card has the same 3 parts, in the same order: **Now, Today, Proof**. Same place every time, so there is nothing to search for.
- Lamps differ in **shape and brightness**, not only colour. A failed lamp is dark with a cross flag. A flaky one is half lit. A pass is full and steady.
- The breadcrumb is always on top. "Back" goes up one level. "Home" goes to the town.
- "Read aloud" reads the card with the crier's voice.

#### Screen 3: The phone (Pocket)

```
+------------------------------+
|  1 needs you                 |  <- mood, 28 px, bold
|  Build 30 tests fail.        |
|  Depth workshop.  18:20      |
|  [See it]   [Got it]         |
|------------------------------|
|                              |
|     (the town, still,        |
|      fills this half,        |
|      4 labels max)           |
|                              |
|------------------------------|
|  Since you looked (2 h)      |
|  x  Build 30 tests fail      |
|  *  Build 29 went live       |
|  o  Builder hired            |
|------------------------------|
|  [ Talk ]  [ Replay ]  [...] |  <- 48 px tall buttons, thumb zone
+------------------------------+
```

- Top: the answer. One card at a time. Swipe for the next call if there is one.
- The town fills the middle half. It is a picture you can tap, not the main way in.
- The diary is not shown by default. "Since you looked" replaces it.
- A big "Talk" button for voice, in the thumb zone.
- Sound is off by default on the phone.

#### A 4th small sketch: replay

```
+--------------------------------------------------------------------------------------------------+
|  REPLAY  Sun 15 Nov  14:26                       (sepia tint over the town)        [Back to live] |
|  ...town as it was...                                                                            |
|--------------------------------------------------------------------------------------------------|
|  [<<]  [Play 1 min]  [>>]      07   08   09   10   11   12   13   14   15   16   17   18   19     |
|                                 .    .    o    .    .    o*  .  x o*   .  [!]   .    .    .      |
|                                 quiet hours are thin   busy hours are wide  ^ you are here       |
+--------------------------------------------------------------------------------------------------+
```

### 5.6 Type for each distance

*From plan 2 (glance), section 7. References like "section 3.8" inside this part point to that plan.*

#### Sizing from screen height, not width

The v1 page sizes from width (`0.45vw + 9.5px`). A projector is judged by height. So in Wall and Hearth modes, size type from the viewport height (vh).

The rules of thumb [8H rule; text per metre guides]:

- The minimum text is about 1/50 of screen height. That is a bare minimum, not comfortable.
- About 4 mm of text height per metre of distance is a minimum. About 10 mm per metre is comfortable.

Worked example. A 1.5 m tall picture seen from 5 m. Comfortable text is about 50 mm, which is 1/30 of the picture. A 55-inch TV is 0.68 m tall. From a sofa at 3 m, 30 mm is 1/23 of the screen. **So the TV and the projector need the same scale.** One Wall scale serves both.

| Text | Wall and Hearth (share of screen height) | At 1080 lines | Pocket (phone) |
|---|---|---|---|
| Mood line | 1/14 | about 76 px | 28 px |
| Big numbers | 1/12 | about 90 px | 32 px |
| Crier caption | 1/22 | about 48 px | 20 px |
| "Since you looked" lines | 1/28 | about 38 px | 18 px |
| Place labels | 1/30 | about 36 px | 16 px |
| Card body (lean-in text) | 1/38 | about 28 px | 17 px |
| Nothing ever smaller than | 1/45 | about 24 px | 15 px |

CSS shape: `font-size: max(24px, 3.3vh)` for labels in Wall mode, and so on. Pocket stays in px with a floor.

#### Letters and lines

- **One font family.** Atkinson Hyperlegible for everything, including numbers and times. Drop JetBrains Mono for times. If a monospace is needed for tabular times, use Atkinson Hyperlegible Next's mono, which keeps the same letter shapes [Atkinson Hyperlegible Next].
- **Sentence case.** No uppercase eyebrows. No letter-spaced capitals.
- **No italics.** Bold for one thing per block (Harry's rule).
- **Left aligned**, never justified.
- **Line length** 45 characters or fewer on the Wall. 35 on the phone.
- **Line spacing** 1.5 for anything over 1 line [Dyslexia Scotland].
- **Slightly wider letter spacing** (about 0.02 em) on body text [BDA guide, as summarised].
- **Background**: dark text on off-white panels, or off-white text on near-black. Never pure white on pure black at full brightness in the evening (glare). Never text over the busy 3D scene without a solid plate.

#### Words

| Rule | Example |
|---|---|
| 12 words or fewer per line | "Build 30 tests fail on depth." |
| Lead with what failed | "1 fails, 9 pass" rather than "9 pass, 1 fails" |
| Digits, never number words | "3 builders", not "three builders" |
| "of", not a slash | "9 of 10", not "9/10" |
| Plain names, not branch codes | "Mac controls" workshop, not "bc-mac" |
| No brackets in glance text | Brackets go into the card, if anywhere |
| Times: one format | 24-hour "18:20" plus "20 min ago" on the phone (taste question 3) |
| Same word for the same thing everywhere | "went live" means deploy or win. Never "shipped" in one place and "deployed" in another. |

Branch-to-name mapping: the ledger `what` of the `start` line already has a plain name ("Mac controls and the dolls' house"). Use the first 2 or 3 words of it as the workshop name. No new data needed.

### 5.7 Colour, shape and motion

The one state vocabulary (6 states and 2 overlays, Okabe-Ito colours, shapes and words) is in section 2.5. Below: plan 2's motion rules and weather precedence.

#### Motion rules

*From plan 2 (glance), section 8. References like "section 3.8" inside this part point to that plan.*

Peripheral vision is good at slow motion, and weaker on red/green colour [McKee & Nakayama 1984; Anstis 2020; APP 2020]. So **motion is the strongest signal we have. Spend it carefully.**

1. **Motion means "real and happening now".** Nothing moves for decoration.
2. **Speed follows a real rate,** like the Dangling String, which twitched with each packet [Weiser & Brown 1995]. Mill wheel speed = jobs per hour. Number of walkers = builders active.
3. **One trip per event.** A walker walks once for each ledger line, then stays at the destination. Today a walker loops its route for the whole window, which shows one trip as many.
4. **No endless loops on alarms.** A new problem gets one slow "settle" (a lamp dims over 1.5 s, a cross flag drops in, a small vermilion beacon lights). Then it stays still: the building dark, the beacon steady. Stillness plus darkness is easier to spot than a pulse that you learn to ignore.
5. **Nothing flashes.** No more than 1 brightness change a second, ever. Stays well under the 3-flash limit [WCAG 2.3.1].
6. **The camera is still in glance views.** Orbit only in the Tour and in Hearth drift, and never while a card is open.
7. **Reduced motion means stopped** (v1 now does this), not slowed: no orbit, no rain particles (a grey sky instead), walkers jump to their destination, smoke is a still puff. Respect the system setting, and also give a button, because many people never find the system setting.
8. **A "Still" button** stops all motion in one press (WCAG 2.2.2 asks for pause, stop or hide on anything moving over 5 s).

### 5.8 Alarms that get attention without stress (merged from P2 and P3)

**Why so careful.** In one hospital study about 89% of ICU monitor alarms were false, at about 52 alarms an hour
(UCSF, PLOS ONE 2014). People stop hearing them. The town will be ignored just the same if it cries wolf. ADHD design
guidance says the same: few interruptions, all deferrable, sound off by default.

**Three levels only**

| Level | When (measured triggers only) | What happens | Sound | Who owns it |
|---|---|---|---|---|
| **Lamp** | Any number out of range; any normal event | The place changes state (lamp dark, fox appears, a hill grows). Goes in the diary and the timeline. | none, or one soft one-shot from the soundscape | shown only |
| **Bell** | A suite fails on a workshop branch; a deploy fails its probe; a machine idle with work waiting (fox); white smoke; an order past 12 h with no quote; a question blocking work for over 24 h; a stall turns amber | Mentioned in the next crier bulletin and in the next foreman wake-up, with the one action to take. | one soft sound, once | the foreman (cloud), the home town (CAIRN on the Mini) for its own machines |
| **Call** | Lost property turns red (a stall); a power cut (limit or restart with open jobs); disk at the 30 GB floor; a live build failing its tests or probe; a broken privacy or kids' rule; a decision blocking everything for over 48 h | The mood line changes. The town hall bell lights (sky blue). The crier speaks once. It stays until "Got it". | the 2-note town hall bell, then the crier, once | Harry |

**Rules for Calls**

- **Each Call says 3 things:** what, since when, and the one thing to do. "The Mac builder has been quiet since 16:27.
  Last step: build 29. Say 'pick it up' to send the foreman."
- **Never say "alert", "error" or "critical".** Use plain words.
- **Spoken once.** Repeated at most once, after 30 minutes, and only if not acknowledged.
- **"Got it"** (voice, tap, key G, controller A) acknowledges. The place stays dark until the cause is fixed, but the
  sound stops. **"Later"** snoozes for 1 hour.
- **Quiet hours** (default 22:00 to 07:00): no sound at all. Calls wait for the morning bulletin, where they come first.
- **Budget:** aim for 3 Calls a day or fewer, and at most 1 outside a working window. The page counts Calls and how many
  led to action. If fewer than half lead to action, the trigger is too loose and is retuned at the weekly review.
- **One alarm per cause.** A power cut swallows the separate stalls it caused. A paired-run result replaces the raw
  test failure.
- **Severity** (from plan 3; see "Incidents and postmortems" in section 4.4): Sev 1 (a live game broken for players, or a privacy or kids' rule broken) and
  Sev 2 (work lost or stopped for over 2 hours) can be Calls; Sev 3 and 4 are Bells or Lamps.

**How an alarm looks** (decided in Appendix A, #5): the failed thing goes **dark**; a small vermilion cross beacon
lights with one 1.5 s settle, then stays steady. Nothing pulses for ever. Nothing changes brightness more than once a
second.

### 5.9 Sound: rules (merged from P2 and P5)

**The idea.** Peep, a network monitor, replaced screens with natural sounds: single events got a short sound,
ongoing states changed a background sound, and silence meant something had stopped (Gilfix and Couch, LISA 2000).
Gaver's ARKola work found sounds helped people keep track of a running system (CHI 1991). The town already has
hammers, bells, carts and weather, so it is a natural home for this. The sound palette itself is in section 2.11.

**Rules**

- **Every sound is an event** (the same law as motion). No music bed. Beds (continuous sounds) follow a real rate.
- **Defaults:** Soft on the Wall and Hearth, **Off** on phones and laptops. Browsers need one tap to start sound anyway.
  Master volume and 3 presets: Off, Soft, On.
- **Rate limit:** at most 6 one-shots a minute and at least 3 seconds apart. They queue by priority (Call > win >
  deploy > fail > test > commit); older low-priority ones are dropped. A burst of 20 test lines plays as one chord.
- **Quiet hours** 22:00 to 07:00: silent. Calls wait for the morning bulletin.
- **No startles:** no thunder, no sirens, no buzzers. A failure is a low wooden knock.
- **Different rhythm and pitch,** not only different timbre, so they can be told apart with half an ear.
- **Captions for every sound:** a small line, "(bell: house tests passed)". Hearing people get a key; deaf viewers get
  the same data.
- **No loop longer than 2 minutes without variation.**
- **Source:** synthesised in the browser with WebAudio first (no files, no download). An optional later upgrade to CC0
  sound packs (Kenney's audio packs are CC0) is a download for Harry; listed in `THIRD_PARTY.md`.

### 5.10 The town crier (the voice)

*From plan 2 (glance), section 11. References like "section 3.8" inside this part point to that plan.*

#### What the crier says

- **Bulletins of 3 items or fewer.** Each 12 words or fewer.
- **Lead with what failed,** then what went live, then what started.
- **Digits** are read as numbers. Branch codes are never read aloud.
- Ends with "Nothing needs you" or "1 thing needs you".

Example evening bulletin (about 15 seconds):

> "Evening bulletin. 1 problem: build 30 tests fail on depth. 2 things went live. The Mac builder finished. Nothing else needs you."

#### When the crier speaks

| Trigger | Wall (day) | Hearth (evening) | Pocket |
|---|---|---|---|
| Page opened ("since you looked") | yes | yes | only if sound is on |
| On the hour | off (taste question 4) | yes, if something changed | no |
| A Call | yes, once | yes, once (not in quiet hours) | a notification only if he opts in |
| Asked "what's new" | yes | yes | yes |
| Morning bulletin | first open after 07:00 | n/a | yes |

#### The voice itself

- **Version 1:** the browser's built-in voices (speech synthesis). Free, offline on Mac and iOS, works now. It is a clearly
  computer voice and says so the first time it speaks each day: "This is the town's computer voice reading the diary." (Plan 4's rule.)
- **Later:** pre-recorded phrases from Kokoro on the Mini, as the mega review already proposes for creature voices. A fixed phrase book ("1 problem", "went live", "needs you") plus building names. Then the crier has a character and no cloud is used.
- **Always captioned.** The words appear at the bottom while spoken, word by word, at 1/22 of screen height. This also helps dyslexic reading: hear and see at once.
- A 2-note bell before each bulletin, so speech never starts cold.

### 5.11 Control: voice, keyboard, controller, touch

*From plan 2 (glance), section 12. References like "section 3.8" inside this part point to that plan.*

#### Voice commands (small vocabulary, easy to say)

| Say | Does |
|---|---|
| "What's new?" | Crier reads "since you looked" |
| "What needs me?" | Crier reads Calls only |
| "Show the yard" / "Show the bridge" / any place name | Flies to that building |
| "Go back" / "Home" | Up one level / the whole town |
| "Read this" | Reads the open card |
| "Replay today" / "Replay this" | Starts replay (of the town or this building) |
| "Faster" / "Slower" / "Stop" | Replay speed |
| "Tour" | Starts the Tour |
| "Got it" / "Later" | Acknowledge / snooze a Call |
| "Quiet" / "Sound on" | Sound presets |
| "Evening" / "Day" | Mode |
| "Still" | Stop all motion |

How to listen, safely:

- **Cheapest route first:** give every control a short, unique, visible name. Then macOS and iOS Voice Control can already "Click Yard" with no code at all.
- **Browser speech recognition** works in Chrome and Safari, partly. Chrome sends the audio to Google's servers [caniuse; Chrome docs]. That clashes with the town's privacy rule. So it needs Harry's yes before it is switched on (toll booth item), and is push-to-talk only, never always listening.
- **Private route later:** a small speech model on the Mini, reached over the home network. Same command list.

#### Keyboard

| Key | Does |
|---|---|
| Arrow keys | Move focus between buildings in a fixed order |
| Enter | Open the building |
| Escape / Backspace | Back |
| H | Home (whole town) |
| N | "What's new" (crier) |
| G | Got it |
| T | Tour |
| R | Replay |
| [ and ] | Previous / next event |
| Space | Pause or play replay |
| S | Still (stop motion) |
| M | Sound presets |
| D | Day / evening |
| ? | Show this key map |

#### Game controller (sofa, evening)

Gamepad API is in Chrome and Safari [caniuse].

| Button | Does |
|---|---|
| D-pad / left stick | Move between buildings |
| A | Open / Got it |
| B | Back |
| Y | Crier: what's new |
| X | Replay |
| Start | Tour |
| Shoulders | Previous / next event |

#### Touch (phone)

Tap to open. Swipe down to go back. Big buttons only (48 px). No pinch needed for anything important.

### 5.12 Zooming without getting lost

*From plan 2 (glance), section 13. References like "section 3.8" inside this part point to that plan.*

#### levels

| Level | You see | Labels say | Example |
|---|---|---|---|
| 1. Town | Whole town, still camera | Place name, 1 state word | "Yard: 1 fails" |
| 2. Building | One building close, its card | Now / Today / Proof | "9 of 10 pass" |
| 3. Room | Inside: the bench, the builder, the parcels | Each item, 3 words | "depth suite: fails" |
| 4. Event | One ledger line, full | The line, who, when, the proof link | "18:20 builder:depth: depth never loads…" |

This is semantic zoom: as you get closer, the words get more specific, not just bigger.

#### Rules so nobody gets lost

1. **Breadcrumb always visible:** "Town > Yard > depth > 18:20". Each part is a button.
2. **One "Home"** in every view (key H, voice "home", controller B held).
3. **Camera moves take 1 to 1.5 s,** eased. Never faster (disorienting). Never slower (boring).
4. **The camera never rolls,** and the horizon stays level. North stays roughly up.
5. **A small corner map** when zoomed in, with a "you are here" dot.
6. **Back retraces** the exact path in. It does not jump somewhere new.
7. **The rest of the town dims** when a building is open, but stays visible behind it, so you still know where you are.
8. Reduced motion: camera **cuts** with a 200 ms fade instead of flying.

### 5.13 The Tour

*From plan 2 (glance), section 14. References like "section 3.8" inside this part point to that plan.*

The current tour visits every building for 8 s. Make it a short story instead.

#### Rules

- **Only places that changed** since the last tour, or today if none. Quiet places are skipped.
- **Order by tier:** Calls first, then failures, then went live, then in progress, then the home town.
- **6 stops at most.** The last stop is always the whole town with the mood line.
- **Time per stop is set by its words:** glide 1.5 s, then the crier sentence (about 150 words a minute), then 4 s of quiet to look. About 10 to 14 s a stop. A full tour is about 60 to 90 s.
- **The card shows only "Now"** during a tour, so it can be read in the time.
- **Any input stops the tour** and leaves you where you are (not jumped back home).
- **Hearth version:** no cards, only captions, and the camera drifts slowly between stops.
- **Ambient loop (Wall, by choice):** the tour plays every 15 minutes, only if something changed. Otherwise the town stays still. A still town says "nothing new". That is data too.

### 5.14 Replay and the timeline

*From plan 2 (glance), section 15. References like "section 3.8" inside this part point to that plan.*

#### Design

- **A day as a strip,** with hour marks. Events are ticks with **shapes**: * went live, x failed, ! Call, o started. Only these 4 shapes on the strip. Other kinds show as a thin grey density band.
- **Busy hours wide, quiet hours thin** (optional, taste question 6). Or a normal clock strip with a density band under it.
- **A "since you looked" mark** on the strip.
- **Replay looks different from live.** A sepia tint on the town, "REPLAY Sun 15 Nov 14:26" in the corner, and the Live button lit. You cannot mistake the past for now.
- **3 speeds:** a day in 1 minute (highlights: skips quiet stretches), 3 minutes, 10 minutes.
- **Next / previous event** jumps ([ and ], shoulders, "next").
- **Replay a single building:** only that building's events, camera stays on it.
- **Week view** later: 7 rows, one per day, same shapes. Good for "was this week calmer than last?"
- **Captions during replay:** each event's line appears at the bottom as it plays, at caption size.

#### The rule about sample data

Anything not from the ledger or a live report (the `WALL` sample today) is shown with its "as of" time and sepia in **all** views. It is never shown as a live 3D object without its age.

### 5.15 Modes: Wall, Hearth, Pocket

*From plan 2 (glance), section 16. References like "section 3.8" inside this part point to that plan.*

| | Wall (day projector) | Hearth (evening) | Pocket (phone) |
|---|---|---|---|
| Chosen by | Clock 07:00 to 17:00, a big screen, or `?mode=wall` | Clock 17:00 to 22:00, or `?mode=hearth` | Narrow screen |
| Light | Bright sky. Text on solid off-white plates with dark ink, or solid dark plates. 7:1 contrast. | Dark, warm. Lamps carry the meaning. Off-white text, not pure white. | Follows the phone's light or dark setting |
| Text | Mood + 3 lines + 3 numbers + 7 labels | Captions only | Mood card + 3 lines |
| Camera | Still | Slow drift between changed places | Still |
| Sound | Soft | Soft, crier on the hour if changed | Off |
| After 22:00 | n/a | Dims further. No sound (quiet hours). The town "sleeps": lamps low, only Calls lit. | Same |

Why plates on the projector: daylight washes a projector out. Dark areas turn grey and contrast falls [projector ambient-light sources]. Text drawn straight onto the 3D scene loses first. A solid plate behind text keeps it readable whatever the scene does.

Why off-white on dark in the evening: dyslexia guides advise against pure white on pure black glare [BDA, as summarised].

#### Framing per device (from plan 5)

- **Projector ("wall mode", `?wall`)**: the plate shrinks to a title strip; the diary becomes a 4-line ticker at the side;
  the scene is at least 75% of the picture. The camera holds the still **master shot** (decided, Appendix A #6). A **director camera** is an option, off
  by default: when something happens, the camera glides to it (3 s ease), holds 6 s, returns to the master shot; never
  more than one move per 10 s; alarms win over everything. The tour plays on request, or every 15 min only if something
  changed.
- **Laptop**: today's layout, slimmer panels, the master shot.
- **Phone (portrait)**: two **stops**: the Works bank and Home Town. A swipe up or a "cross the bridge" button flies the
  camera over the bridge (2 s). The diary is a pull-up sheet showing only 2 lines when closed; the plate is one line. The
  master shot for the Works bank is closer and steeper (pitch 48 degrees) so buildings are big.

### 5.16 Accessibility checklist

*From plan 2 (glance), section 17. References like "section 3.8" inside this part point to that plan.*

| Need | How | Test |
|---|---|---|
| Reduced motion | Stop, don't slow. Plus a "Still" button. | Harness: with reduced motion, no object moves for 10 s. |
| No flashing | Max 1 brightness change a second. No loops on alarms. | Harness: sample the alarm lamp brightness for 3 s. |
| Colour-blind safe | Okabe-Ito states plus shape plus word | DevTools vision emulation screenshots in `shots/` |
| Contrast | 4.5:1 minimum, 7:1 on the Wall | Harness computes text contrast on plates |
| Projector size | Nothing under 1/45 of screen height in Wall mode | Harness: smallest rendered text height / viewport height |
| No overlaps | Lower-priority labels hide when they collide. The home town collapses to one label at the town level. | Harness: count overlapping label boxes. Must be 0. |
| Captions | Every sound and every crier word | Harness: each sound call writes a caption |
| Keyboard | Everything reachable. Visible focus ring. | Harness: tab through, every building reachable |
| Controller | Gamepad map above | Manual |
| Voice | Visible unique names for OS Voice Control. Push-to-talk later. | Manual: "Click Yard" in macOS Voice Control |
| Screen reader / text twin | A plain list view of the same state ("Text" button). Also useful when tired. | Harness: the list matches the 3D state |
| Touch targets | 48 px on phone | Harness |
| Nothing on hover only | Every hover fact is also on tap and focus | Manual |
| Words | 12 words a line in glance text. Digits. No codes. | Harness: max words per glance line |

#### Measured tests of the viewing experience itself

The town's rule applies to its own design. These can be measured:

1. **5-second test.** Show a frame 5 s. Ask: anything wrong? anything for you? Target 9 of 10 right.
2. **Time to answer "what needs me?"** by voice, from the sofa. Target under 10 s.
3. **Calls per day, and share acted on.** Target 3 or fewer, and over half acted on.
4. **Label overlaps:** 0.
5. **Smallest text:** at least 1/45 of screen height in Wall mode.
6. **Words on screen** in glance view: 45 or fewer.

### 5.17 What to cut (noise)

*From plan 2 (glance), section 18. References like "section 3.8" inside this part point to that plan.*

| Cut | Why |
|---|---|
| The title plate after the first 3 seconds | Everyone knows the name. It is the biggest text and carries no news. |
| The explainer paragraph on the plate | Move it to a "What is this?" card. |
| The always-open diary on Wall and phone | Replaced by "Since you looked" (3 lines). Diary opens on demand. |
| Uppercase letter-spaced eyebrows | Harder for dyslexic reading. |
| "N things today" on every label | Activity, not results. Keep it inside the card. |
| "Parcels posted", "workshops busy", "orders waiting" as big stats | Activity. Move to cards. |
| Label sub-lines at town level | Too small, too many. One state word instead. |
| The continuous auto-orbit | Moves labels while reading. Breaks spatial memory. |
| Endless walker loops | One trip per event, then rest. |
| Continuous rain particles | Grey sky and soft rain sound carry it. Particles only in Hearth, and never with reduced motion. |
| Grey chimney smoke when nothing is rebuilt | Smoke should mean something. Only white smoke, when measured. |
| The rainbow on every win, and during storms | Only for a real-device win; 2 hours, hidden during a storm; then the star keeps it (Appendix A #8). |
| Pulsing alarm lamp | Dark lamp plus cross flag, still. |
| Sample `WALL` data shown as live | Show its age, or hide it until `town-report.json` exists. |
| JetBrains Mono for times | One font family is easier. |
| Branch codes in labels | Plain names. |

---

## 6. The public version: explainer stories, X-ray, never-show list, product route

Plan 4 (teaching the public, privacy, product), almost in full. Its rules for drawing AIs as tools, not people, are in section 2.8.

**The plan on one screen (plan 4, updated):**

1. **The goal.** A visitor watches for five minutes and leaves knowing ten true things about AI agents.
2. **The big idea.** Explainer mode is the existing replay, cut into short guided stories with captions. Not a new engine.
3. **The rule.** Every story is a real event from the ledger, with its time and its proof. Nothing is invented. A guess is fog.
4. **The honesty rule.** Show failures as plainly as wins. The best stories are failures.
5. **The metaphor rule.** Every toy has an X-ray switch that shows the real thing underneath.
6. **The people rule.** Builders are wind-up toys: no faces, no feelings, no human names.
7. **The privacy rule.** The public town is built from a separate public diary: an allow-list filter, a delay of 7 days, and Harry's yes for each story.
8. **The repo is public now** (settled; plan 4 asked to check). So every ledger line is written for strangers from v1.1, and splitting into a private working repo plus a clean public one is Harry's decision S3.
9. **The product.** A free public replay site and a classroom pack first. An open kit later, if asked. A paid hosted version only on real demand.
10. **First step.** Story 1, "How a bug got caught" (builds 29 and 30, roomfix, 16 Nov), tested on five non-technical people.

### 6.1 What we already have

*From plan 4 (public), section 1. References like "section 3.8" inside this part point to that plan.*

I read the atlas, the mock-up, the live page's data section, the ledger and its rules, the sources list, the mega review, the last part of START_HERE, and the home town's wall sketch.

#### The good news: the hard part exists

| Already built | Why it matters for teaching |
|---|---|
| The ledger: one line per real event, with time, who, where, kind and proof | Every story can be a replay of real lines. No script writing from memory. |
| The replay and timeline in the live page | Explainer mode is a guided path through the replay, not a new engine. |
| The atlas rule: "it must show a real number or a real event, never decoration" | This is the most important teaching rule, and it is already the town's law. |
| The ledger rule: "No names except Harry. No places, no room photos, no personal details." | A good start on privacy. The public version needs a stricter rule (section 9). |
| The wall's honesty pieces: "who is speaking", empty letterboxes, "the train marked them done" | Real failures, already drawn. These teach more than any win. |
| The lost property office (a start with no end) | It turns a real failure (the 15 Nov stop) into a picture anyone understands. |
| The sources list, with licences checked | The comparisons in section 11 build on it. |

#### Real events that make good stories (from the ledger and notes)

| When | What happened | What it teaches |
|---|---|---|
| 15 Nov 16:27 to 16 Nov 12:19 | The build 29 builder stopped when the machine restarted. Nobody noticed for about 20 hours. | AI agents do not "notice" they have stopped. Something outside must check. |
| 16 Nov 18:00 to 18:20 | The roomfix test passed on build 29 and failed on build 30. A side-by-side check found the cause: depth loaded too early on software graphics. A builder fixed it. | Tests catch mistakes the AI made. Comparing old and new finds the cause. |
| 16 Nov 14:20 and 17:05 | The snapshot test failed the same 5 checks on builds 28 and 29. So it was an old, flaky test, not a new bug. | Not every red light is a real problem. Checking needs judgement. |
| 16 Nov (wall) | The town painter made six nice toy rooms. None showed what its line asked for. The town marked them done anyway. | "Done" is a claim. Only a check makes it true. |
| 16 Nov (wall) | Local models: one answered "(DONE)" with nothing in it, two were silent, three were moved and never heard from. | Models can return empty or broken answers. You have to look. |
| 13 to 16 Nov | Every build up to 29 passed robot tests in fake rooms (corrected wording). The first real-room lock on a real iPad was on 16 Nov at 16:10. | Passing tests is not the same as working in the real world. |
| 16 Nov 16:20 | Four orders waited at the bridge for the owner's "go". | A human approves the big steps. |
| 16 Nov 13:07 | Order scan-1: "downloads need Harry's yes". | Downloads and spending wait for a human. |
| 16 Nov (wall) | Three AIs gave the town a "cold look". All three said it "shows talk better than finished work". | AIs can review work, including their own system's. They can be right. |
| 13 Nov (notes) | The "regressions" were test timing on a busy machine, not game bugs. | Busy machines make tests flaky. Honest checking needs a fair test. |
| 15 Nov results | About 1 in 8 local answers came back empty or broken. | A real failure rate, as a number. |
| Ongoing | Tiny experts train in 25 to 55 minutes. Their notes say they are bad at "questions, lists, JSON, sense". "Six new voices, examined": two pass, one borderline, three fail. | Training is cheap to try and often fails its exam. That is normal. |

These are the raw material. We do not need to make anything up.

#### What we do not have yet

- Brief texts (what each builder was actually told) are not in the ledger. They live in the foreman's session. We need a safe copy of each brief, or a short summary of it (section 6.1).
- Cost per job is not logged yet (the atlas puts the bank in v4).
- Training records with exam scores are not in one place yet (the atlas puts the university in v3).
- Tool use (read a file, run a test, search the web) is not logged step by step. Claude Code hooks could log it, but they are switched off, which is the owner's call.

### 6.2 What a visitor should learn: ten true things

*From plan 4 (public), section 2. References like "section 3.8" inside this part point to that plan.*

This is the "curriculum". Each idea must be true, testable and shown by a real event. I checked these against the AI4K12 "Five Big Ideas" (perception, representation and reasoning, learning, natural interaction, societal impact). They cover learning, reasoning, interaction and societal impact. Perception is light, but the game's room-locking covers it.

| # | The true thing, in plain words | The common wrong idea | Where the town shows it |
|---|---|---|---|
| 1 | **An AI agent is a model in a loop.** It reads, decides, uses a tool, looks at the result, and goes round again. | "The AI just knows the answer." | A builder's walk: workshop, then yard, then post office, then back. |
| 2 | **It only knows what it is handed.** Each new session starts with nothing but the brief and the files. | "It remembers me and yesterday." | The brief envelope. The empty head at the start of each walk. |
| 3 | **Memory is writing things down.** Notes like START_HERE are how work survives a restart. | "It has a memory like ours." | The archive and library. A builder reads the notes before starting. |
| 4 | **Tools do the real work.** The model writes text. Tools turn that text into actions: run a test, save a file, publish. | "The AI does it all in its head." | The toolbelt, with one tool lit per step. |
| 5 | **Checking is separate from doing.** Tests, other AIs and humans check. "Done" means nothing until it is checked. | "If the AI says it is done, it is done." | The inspection yard. The painter's six pictures. |
| 6 | **Failure is normal, and you design for it.** Things stop, break or come back empty. Good systems notice and retry. | "AI either works perfectly or is useless." | Power cuts, the lost property office, the hospital. |
| 7 | **A human says yes to the risky steps.** Money, security, deleting, downloads. | "The AI is in charge." | The toll booth on the bridge. The town hall. |
| 8 | **Different models for different jobs.** Big cloud models plan and build. Small home models do cheap, private, many-times jobs. | "There is one AI." | The two towns and the bridge. House sizes. |
| 9 | **Training is trying, then examining.** You make a small model, then test it blind against the old one. Most tries fail their exam. | "Training makes it smarter, full stop." | The university and the exam hall. Report cards. |
| 10 | **It costs something, and data is a choice.** Every step uses compute and money. What leaves the house is a decision. | "AI is free, and it sees everything anyway." | The bank, the battery gauge, the customs house. |

A visitor who learns 6 of these 10 after one visit is a good result. We can measure it (section 12).

### 6.3 The metaphor: helpful, but it must not lie (and the X-ray switch)

*From plan 4 (public), section 3. References like "section 3.8" inside this part point to that plan.*

#### Why a town works

- People already understand workshops, inspectors, post offices and toll booths.
- A town shows many things at once, and shows where things wait. A list cannot do that.
- A town has time in it: day, night, weather, trains. Agent work is all about time: queues, stalls and overnight runs.

#### Where the town could mislead

| The toy | What it suggests | The truth | Fix |
|---|---|---|---|
| A builder walking to a workshop | A person who goes somewhere | A program run, started by another program, working on a copy of the code (a branch) | Caption: "A builder is a fresh run of an AI model, given one job." The X-ray shows the branch name. |
| Builders going home at night | They rest and come back | When a run ends, it is gone. A new run tomorrow starts blank. | The toy is put back in the box, not sent home. "Next time, a new toy is wound up." |
| Houses for each local model | They live there and have a life | A model is a file on a disk. "Lights on" means it is loaded in memory. | The house can be a "toy box on a shelf". Lights on = "loaded and ready". |
| Diplomas on the wall | It went to school and understands | It was adjusted on example data. It has no understanding in the human sense, and the diploma is a training record. | Rename to "training label". Always show the exam score beside it. |
| A builder's speech bubble | It is talking to us | It is text the model wrote. | Show only real, quoted text in a bubble, in quotation marks, with time. Never make up lines. |
| Weather | Mood | Test results summed up | Caption the weather on first sight: "The sky shows the tests." |
| The foreman as the boss | A chain of command with feelings | A main session that writes briefs and starts other sessions | Call it "the main AI session (the foreman)". |
| The town feels alive and busy | Activity means progress | Activity is not results. The town's own review said this: "it shows talk better than finished work". | Finished, checked work glows brightest. Talk is dim. |

#### The X-ray switch (the core teaching tool)

Every toy, card and story beat has an **X-ray** switch. Turn it on and the town fades to a wireframe. You see the real thing underneath, in a plain box:

- **Builder:** the real diary line, e.g. `16 Nov 18:00 · test · roomfix passes on build 29 but fails on build 30`.
- **Yard lamp:** the test name, the count (35/35) and what the test checks, in one line.
- **Bridge wagon:** the order name and what it asked (after the privacy filter).
- **House:** the model's real size and kind, e.g. "27 billion settings, runs on the home machine, loaded".

This does three things. It shows the metaphor is a picture of something real. It lets the curious go one step deeper. And it is a promise: "nothing here is made up, look underneath".

#### A metaphor contract, shown on the first screen

> This town is a picture of real work done by AI programs, mostly on one day.
> Every building, walker and light is drawn from a real diary of what happened.
> The AIs are drawn as wind-up toys because they are tools, not people. They do not feel, rest or remember.
> Some things are hidden on purpose, to keep a family's home private.
> Turn on X-ray at any time to see the real record under the picture.

### 6.4 Explainer mode: how it works

*From plan 4 (public), section 5. References like "section 3.8" inside this part point to that plan.*

#### Three doors on the first screen

| Door | For whom | What happens |
|---|---|---|
| **Take the tour** (3 minutes) | First-time visitors | A fixed path: the ten true things, one stop each, using one real day (16 Nov). |
| **Watch a story** (60 to 120 seconds each) | Curious visitors, classrooms | Pick from the story shelf. Each story replays real events. |
| **Watch the town** | People who come back | The delayed public replay of recent days, with "What am I looking at?" tap-labels. |

#### How one story plays

Each story is 5 to 9 beats. Each beat is:

1. **Camera move** to a place in the town.
2. **Replay** of one or more real ledger lines (walkers move, lamps change).
3. **Caption** (one or two short sentences, large text, read aloud if sound is on).
4. **"What really happened" card** (optional, one tap): the plain record.
5. **X-ray** (optional, one tap): the raw line.

At the end:
- **"What this teaches"**: one sentence linking to one of the ten true things.
- **"Is this the whole truth?"**: what the story leaves out, and why (e.g. "We hid the room the test used, because it is a family home.").
- **One question** to check understanding (optional, never scored publicly).

Rules:
- The visitor controls pace. Next and back buttons. No beat moves on by itself unless "autoplay" is chosen.
- Captions stay on screen until moved on. Read-aloud is off by default.
- Every story shows its date and "replayed from the diary" in the corner.
- Every story has a plain text version (for screen readers, for teachers to print, and for people who get motion sick).

#### Story file format

A story is a small file that points at ledger lines. It never copies the event text. This keeps the story honest: if a line is not in the public diary, the beat cannot play.

```json
{
  "id": "bug-caught",
  "title": "How a bug got caught",
  "date": "2026-11-16",
  "teaches": [5, 6],
  "approved_by_owner": "2026-11-17",
  "beats": [
    { "at": "yard", "lines": ["2026-11-16T17:05:00Z#house"], "caption": "Build 29 is checked. Every test passes." },
    { "at": "workshop:depth", "lines": ["2026-11-16T17:58:00Z"], "caption": "A builder adds depth to make build 30." },
    { "at": "yard", "lines": ["2026-11-16T18:00:00Z"], "caption": "One test now fails on build 30, but passed on build 29." }
  ],
  "leaves_out": "The room the test uses, and the exact code change.",
  "question": { "q": "Who found the problem?", "a": "A test, by comparing the old build with the new one." }
}
```

A small checker script refuses any story whose lines are not in the public diary, or whose caption contains a word on the never-show list (section 9).

#### The "What am I looking at?" layer

In watch mode, tapping anything shows a three-line card:
- **What it is in the town.** ("The inspection yard.")
- **What it really is.** ("The automatic tests. Each lamp is one set of checks.")
- **Right now.** ("14 green, 1 amber (a known flaky test), 0 red.")

This is the atlas table turned into cards. It costs little: the atlas already has the words.

#### Pace and attention

- Most people give a web page under a minute. So the tour's first stop must say something surprising in the first 15 seconds. Best candidate: "This AI stopped working at 16:27 and nobody noticed for 20 hours. Here is how we caught it."
- Keep every caption under 20 words.
- One idea per beat.
- Big text. Plain fonts (the mock-up already uses Atkinson Hyperlegible, which suits dyslexic readers).

### 6.5 How to show each concept honestly

*From plan 4 (public), section 6. References like "section 3.8" inside this part point to that plan.*

#### Briefs (what an agent is told)

- **True thing:** a builder starts with a written brief: the job, the rules, the files to read and how to check the work. A good brief is most of the result.
- **Toy:** a sealed envelope carried from the foreman's hut to the workshop. Tap it to open a short, cleaned version.
- **Show:** a real brief summary in 5 lines: goal, rules (no downloads, no money, nothing personal), where the notes are, the test to pass, how to report.
- **Teaching moment:** put a good brief next to a weak one. Use the town painter as the example: "draw a fort on a sofa" became "six nice toy rooms". A brief that says how the work will be checked gets better results.
- **Need:** briefs saved as files, with a public summary field written for this purpose. Never the full brief by default (it may have paths, names, or the owner's words).

#### Tools

- **True thing:** the model only writes text. Tools act: read a file, run a test, save, publish, search.
- **Toy:** the toolbelt. One tool lights up for each step (spanner = edit a file, magnifier = search, clipboard = run tests, envelope = save and send).
- **Show:** a count per builder: "read 41 files, edited 7, ran tests 6 times".
- **Teaching moment:** "The AI cannot touch anything without a tool. Taking a tool away is how you keep it safe." This links to the toll booth: some tools need a yes.
- **Need:** a tool-use count per builder. Claude Code hooks (`PostToolUse`) could add one line per tool use. That is the owner's call, and the public version should show counts only, never file paths or commands.

#### Memory loss between sessions

- **True thing:** a session has a working space (the context window). When it ends, or when the work is too long and gets summarised, details are lost. A new session knows only what is written in files.
- **Toy:** each wind-up toy comes out of the box blank. It walks to the archive first and reads START_HERE and HANDOVER. Its "pockets" fill as it reads. When the key runs down, the pockets empty. Only what it wrote into the archive stays.
- **Show:** the real notes the next builder read. "This builder read 3 notes, about 2,000 words, before starting."
- **Teaching moment:** the story "Why a builder 'forgot'" (section 7, story 2). Also: the owner's rule "start each day in a fresh session, it has a sharper memory". Long sessions get muddled. Fresh sessions plus good notes work better. This surprises people.
- **Comparison:** Claude Plays Pokémon used a written "knowledge base" as long-term memory, with a size limit, kept tidy by a second AI. This is the same idea. Our archive is the public version of that.

#### Checking

- **True thing:** AI work is checked by tests, by other AIs, and by humans on real devices. Each catches different things.
- **Toy:** the inspection yard (tests), the cold-look visitors (AI reviewers), and the owner's home (real device, drawn as a door, never a room).
- **Show:** three levels of trust with different glows: "claimed" (dim), "tests pass" (warm), "worked on a real device" (bright).
- **Teaching moment:** robots passed 29 builds in fake rooms. The first real-room win was 16 Nov. Both are true. Neither is the whole truth.

#### Failure and retry

- **True thing:** runs stop, tests fail, answers come back empty. Good systems notice, record and retry.
- **Toy:** power cuts, the hospital, the lost property office, red lamps, empty letterboxes.
- **Show:** honest counts. "Today: 3 failures, 2 fixed, 1 still open." "15 Nov: about 1 in 8 home answers came back empty or broken."
- **Teaching moment:** "A retry that passes" is not always a fix. A flaky test (snapshot) needs a side-by-side check to tell an old problem from a new one.

#### Human approval

- **True thing:** the owner keeps the right to say yes or no to money, security, deleting, downloads and anything sent outside.
- **Toy:** the toll booth on the bridge, and motions on the town hall board.
- **Show:** "4 wagons waiting for a yes. Oldest: 2 hours." And the owner's standing rules for overnight work (no downloads, no money, no deleting, nothing personal, at most 2 builders), shown as signs on the town gate.
- **Teaching moment:** "This AI ran a game studio alone for 12 hours overnight. Here are the rules it was given, and here is what it did." The overnight log of 13 to 14 Nov is a great story (section 7, story 8), but it needs heavy cleaning (it shows when the owner sleeps).

#### Local and cloud models

- **True thing:** cloud models are large and capable, run on someone else's computers, and cost money per use. Local models are smaller, run on your own machines, cost electricity, keep data at home, and are slower and weaker.
- **Toy:** two towns and a bridge. Bigger houses for bigger models. The traffic jam at the Dell (one model at a time, 48 minutes for one answer).
- **Show:** a side-by-side card for one job: time taken, cost, where the data went, and the result quality.
- **Teaching moment:** the honest trade-off. The home town is private and cheap to run, but about 1 in 8 answers came back empty. The cloud is stronger, but every word sent leaves the house.
- **Careful:** never show home machine details that help an attacker (section 9).

#### Training and evaluation

- **True thing:** training adjusts a model's settings using examples. Evaluation tests it on questions it has not seen. Most small training tries do not beat what you had.
- **Toy:** the university (training), the exam hall (blind tests), the report card.
- **Show:** for each new tiny expert: what it was trained on (kind and licence, never content if personal), how long it took, and its exam score against the old one. "Graduated" or "did not pass".
- **Teaching moment:** "Six new voices, examined: 2 passed, 1 borderline, 3 failed. Tone is there, ideas are few." This is honest and interesting. It shows training is not magic.
- **Careful:** only do the "new expert graduated" story when there is a real one. Do not make one up for the tour. Until then, the honest story is "how most new experts fail their exam".

#### Cost

- **True thing:** each step costs compute time, and cloud time costs money. There are daily limits (the 15 Nov usage limit was a "power cut").
- **Toy:** the bank, the battery gauge, the power station.
- **Show (public):** relative cost only, e.g. "this story used about 2 hours of AI work" or a coin scale (1 to 5 coins). Not real money figures unless the owner chooses to share them.
- **Teaching moment:** "Fixing a bug took 20 minutes of AI work. Not noticing it stopped cost a day."

#### Privacy

- **True thing:** what an AI sees depends on what you send it. The town's rule is that nothing personal crosses the bridge, and the room is never photographed or kept.
- **Toy:** the customs house on the bridge. Parcels are checked; some are turned back.
- **Show:** "Checked today: 37 parcels. Turned back: 0." And the privacy tests by name.
- **Teaching moment:** the explainer itself is the lesson. Say on screen: "This town hides some things on purpose. Here is a list of what we never show, and why." Visitors learn that privacy is a design choice they can ask for.

### 6.6 The story shelf

*From plan 4 (public), section 7. References like "section 3.8" inside this part point to that plan.*

#### The full list

| # | Title | Real events | Teaches | Ready? |
|---|---|---|---|---|
| 1 | **How a bug got caught** | 16 Nov 17:05 to 18:20: roomfix passes on build 29, fails on build 30. Side-by-side check. Fix: depth waits for real graphics. | 5, 6 | Yes, from the ledger |
| 2 | **Why a builder "forgot"** (really: stopped, and nothing noticed) | 15 Nov 14:26 start, 16:27 machine restart, 16 Nov 12:19 found in lost property, picked up from the notes | 2, 3, 6 | Yes |
| 3 | **The test that cried wolf** | snapshot fails the same 5 checks on builds 28 and 29: an old flaky test, not a new bug. Also 13 Nov: "regressions" were a busy machine. | 5, 6 | Yes |
| 4 | **"Done" is not done** | Town painter: six toy rooms, none shows what was asked, marked done. | 5 | Yes, from the wall |
| 5 | **Robots passed, then a real room** | Builds 17 to 29 pass in fake rooms; 16 Nov 16:10 first real-room lock on a real iPad | 5 | Yes (needs care: no room shown) |
| 6 | **Who is speaking?** | Home models: answering, empty ("(DONE)"), silent, moved but not heard | 6, 8 | Yes, from the wall |
| 7 | **Waiting for a yes** | 16 Nov 16:20 four wagons wait for the owner's go; scan-1 download needs a yes | 7 | Yes |
| 8 | **A night on its own** | 13 to 14 Nov overnight: the rules given, builds 19 to 21 live, the honest hits and misses | 1, 6, 7 | Needs cleaning (sleep times, see 9.3) |
| 9 | **Two towns: home and cloud** | One order's trip: out by wagon, queue at the Dell, answer back | 8, 10 | Partly (needs run report numbers) |
| 10 | **How most new experts fail their exam** | "Six new voices, examined": 2 pass, 1 borderline, 3 fail | 9 | Partly (needs training records) |
| 11 | **How a new expert graduated** | Not yet: wait for a real one | 9 | No: build only when it happens |
| 12 | **The town looks at itself** | Three AIs say "it shows talk better than finished work"; finished work now glows brightest | 5 | Yes |
| 13 | **A brief, and what came back** | One builder's brief summary and its report | 1, 2, 4 | Needs brief summaries saved |
| 14 | **What never crosses the bridge** | The customs house: privacy tests, what is kept home | 10 | Yes (uses test names only) |

Tour order (3 minutes): 2, 1, 7, 4, 6, then "stories for later".

#### Story 1, beat by beat: "How a bug got caught"

| Beat | Camera | Real line(s) | Caption |
|---|---|---|---|
| 1 | Shop window | 17:13 deploy: Build 29 live (the typed win line says 17:10) | "Monday, 5 pm. A new version of a family game goes live. Every test passed." |
| 2 | Depth workshop | 17:58 deploy: build 30 preview | "Meanwhile, another AI builder adds a new trick: toys hide behind your real furniture." |
| 3 | Inspection yard | 18:00 test: roomfix passes on 29, fails on 30 | "The tests run again. One check passed on the old version and fails on the new one." |
| 4 | Yard, two lamps side by side | 18:16 roomfix 35/35 on build 29 in the side-by-side check | "So the problem is new. The same test, run side by side, proves it." |
| 5 | Depth workshop | 18:20 commit: depth never loads on software graphics, before frames are timed | "A builder finds the cause: the new trick started too early on test machines." |
| 6 | Yard | (fix line, when logged) | "It is fixed and checked again before anyone plays it." |
| End | | | **What this teaches:** AI builders make mistakes. Tests that compare old and new catch them before people do. **Left out:** the room the test uses, and the code. |

#### Story 2, beat by beat: "Why a builder 'forgot'"

| Beat | Camera | Real line(s) | Caption |
|---|---|---|---|
| 1 | Foreman's hut | 15 Nov 14:25 hire | "Sunday afternoon. The main AI hires a builder for the next version." |
| 2 | Mac workshop | 14:26 start | "The builder starts work on its own copy of the game." |
| 3 | Power station, lights flicker | 16:27 restart (from notes) | "At 4:27 pm the computer restarts. The builder stops mid-job. It cannot notice: it is not running." |
| 4 | Clock spins, night, day | (no lines) | "Nothing in the town is watching for a builder that never finished. 20 hours pass." |
| 5 | Lost property office | 16 Nov 12:19 end: found stopped, picked up | "Monday lunchtime, the main AI finds the job. It had a start and no end." |
| 6 | Archive | (notes read) | "A new builder starts. It knows nothing about yesterday, except what was written in the notes." |
| 7 | Lost property office, alarm lamp | (the new rule) | "Now the town has a rule: any job with no news for 45 minutes turns amber, and at 2 hours it rings a bell." |
| End | | | **What this teaches:** AI agents do not remember between runs, and do not notice when they stop. Notes and watchers do that job. **Why "forgot" is in quotes:** it did not forget. It stopped, and the next one never knew. |

#### Story 4, beat by beat: "'Done' is not done"

| Beat | Camera | Real line(s) | Caption |
|---|---|---|---|
| 1 | Bridge, wagon out | keep-1 / look order | "An order goes to the home town: draw a toy fort on a sofa." |
| 2 | Home town, painter's house | (result) | "A small picture-making AI at home makes six pictures." |
| 3 | Parcel platform, six parcels marked done | wall: "the train marked them done" | "The home town marks all six as done." |
| 4 | Parcels open: six toy rooms, no fort, no sofa | wall: "none shows what its line asked for" | "But none of them shows what was asked." |
| 5 | Six lamps turn red | wall: six fails | "Someone checked. Six failures, not six successes." |
| End | | | **What this teaches:** an AI saying "done" is a claim. A check makes it true. **Left out:** the pictures themselves (they are fine to show, if the owner says yes; they contain no real room). |

#### Story 3, short form: "The test that cried wolf"

Beats: a red lamp on the new build; the build is held back from the shop window (no worried faces: the toy simply stops); the same test is run on the old build; the old build fails the same 5 checks; the lamp turns amber ("flaky"); caption: "Red lights need checking too. This one was an old problem with the test, not a new one with the game." Add a second short beat: "On 13 Nov three 'failures' turned out to be a busy computer. Fair tests need a quiet machine."

#### How a "graduate" story would work (when it is real)

1. The university: "A small model is trained on 500 examples of creature lines. 1 night."
2. The exam hall: "It and the old model answer the same 10 questions. Neither knows which is which. The owner picks the better answer each time without knowing which made it."
3. The report card: "New: 7 of 10. Old: 4 of 10. It passes."
4. The house: "It moves into the home town. Its training label shows what it learned from and the licence."
5. The honest end: "Most tries do not pass. This is try number N." (Show N.)

This uses the mega review's "Bark Book" plan, which already has a blind test with a pass mark (6 or more lines kept in 10).

### 6.7 How honest to be about failures

*From plan 4 (public), section 8. References like "section 3.8" inside this part point to that plan.*

#### The rule: show the ratio, not just the highlights

The worst thing a teaching tool can do is cherry-pick. A town that shows only wins teaches "AI just works". A town that shows only failures teaches "AI is a joke". Both are false.

| Do | Do not |
|---|---|
| Show the day's totals on the first screen: started, finished, failed, fixed, waiting | Hide the failure count |
| Put a "random day" button next to the story shelf | Only show hand-picked days |
| Keep failures in the museum forever | Delete or soften old failures |
| Show what is not proven as fog | Show untested things as working |
| Say when the numbers might be wrong ("counted from the diary; the diary itself misses things") | Claim the diary is complete |
| Admit what the town cannot see (tool calls, costs, briefs, until they are logged) | Pretend the town sees everything |

#### Fair blame

- A failure belongs to the system, not to "a bad AI" and not to the owner. "The town had no alarm for stopped jobs" is fairer and more useful than "the builder failed".
- Never show the owner's mistakes or private choices as public failures without his yes.
- Never mock a model. Many visitors will use these same models. Say what it did, not what it is.

#### Levels of honesty by audience

| Audience | Failures shown | Detail |
|---|---|---|
| Owner (private town) | Everything | Full ledger, raw |
| Invited guests (link with a code) | Everything except personal and security items | Delayed by a day |
| Public | Totals plus approved stories | Delayed by a week, filtered, owner-approved |
| Classroom pack | Approved stories only, with teacher notes | Fixed, versioned |

#### A truth label on every number

Each number in the public town carries one of three small marks:
- **Counted** (from the diary, e.g. tests passed),
- **Estimated** (e.g. cost in coins),
- **Not measured yet** (shown as fog, e.g. tool calls before hooks are on).

### 6.8 What must never be shown

**Settled: the repository is public.** Plan 4 found that the live page reads GitHub without logging in and reads the ledger from `raw.githubusercontent.com`, which only works on a public repository, and asked Harry to check. It is public. So anyone can read the ledger, START_HERE and the overnight logs today. What follows: (1) from v1.1 the validator checks every new ledger line against the never-show list below; (2) the public explainer is built from a separate public diary with its own allow-list, a 7-day delay and Harry's yes per story; (3) whether to move the working repo to private and publish the town from a clean public repo is decision S3 (default: keep it public for now, decide again before any public launch).

*From plan 4 (public), section 9. References like "section 3.8" inside this part point to that plan.*

#### The never-show list (red)

| Never show | Why | How we stop it |
|---|---|---|
| Room photos, camera frames, depth maps, room scans, saved room maps | A family home. Layout shows wealth, children's rooms, ways in. | No image from the game ever enters the public diary. Scanner rejects image files. |
| Any location: town, street, rounded position, region, weather location, regional nicknames | Finds the house | Allow-list filter. Words like "Places", "km", place names are blocked. |
| Home routine: when the owner sleeps, is away, or works | Burglary risk; personal life | Public replay is delayed by at least 7 days and shows times as "evening", "night", "morning" only. No exact times for owner actions. |
| Machine addresses: IP addresses, host names, network names, ports, remote-control or bridge details, Tailscale names, SSH details | A map for attackers | Scanner blocks number patterns like addresses and anything after `@` or `://` |
| Secrets: tokens, keys, passwords, session links, API URLs with codes | Direct attack | Secret scanner (patterns for common keys) on every public diary line; any hit stops the whole update |
| Real names other than "the owner", and the GitHub username | Identity | Public version says "the owner". Names of friends, family, testers: never. |
| Children: anything about who plays, ages, voices, faces | Children's privacy, UK Children's Code | No player data in the public town at all, not even counts at first |
| The bank card used to size the screen sticker | Card details | Never pictured; story 5 says "sized with a card" only |
| Full briefs and prompts | May contain paths, names, the owner's words, security rules | Public summary field only, owner-approved |
| File paths with home folders (`/home/…`, `/Users/…`), user names | Identity, system layout | Scanner blocks |
| Exact hardware with serial numbers or model years beyond type | Small risk, no teaching value | Generic: "home machine A, large graphics card" |
| Money: bank details, real bills | Personal | Coins scale only, unless the owner chooses otherwise |
| The owner's private words (voice notes, messages) | Personal | Only quotes he approves, never by default |
| Unreleased game ideas he wants to keep | Business | Owner approves each story |

#### Amber: show only after cleaning

| Item | Cleaning |
|---|---|
| Overnight runs | Show as "a night"; no clock times; delay 7+ days |
| Model names (27B, Scholar) | Fine; but the "Grandparent", "Eight-Year-Old" voices need a caption that they are test voices, not real people |
| Disk space and memory | Fine as gauges; no machine names |
| Commit messages | Never raw. Use the ledger's `what`, which is written to be plain, then filtered |
| Branch names | Fine (game/bc-depth), unless they reveal unreleased plans |
| Test names | Fine |
| Third-party services | Fine to name GitHub; avoid naming security tools in use |

#### Green: safe to show

Counts, test results, the town's own pictures, the order names, model sizes, licences, wins, failures, approvals waiting (as a count), and the town's rules.

#### How the privacy filter works (allow-list, not block-list)

1. **Private ledger** stays private (the current `ledger.jsonl`).
2. **A public diary builder** reads it and keeps only allowed fields: `day`, `part_of_day`, `who` (role only), `where` (building only), `kind`, `public_what` and `suite`/`status`/`n`.
3. `public_what` is a separate sentence written for the public. If a line has none, it is shown as "a step" with no text. It never falls back to `what`.
4. **Scanners** run on every line: secrets patterns, address patterns, `@`, `://`, home paths, a list of private words (place names, family names, the username). Any hit stops the whole update and tells the owner.
5. **Delay:** the public diary is at least 7 days old (1 day for invited guests).
6. **Owner's yes:** stories need `approved_by_owner`. The daily public diary can be on auto after a trial month, if the owner wants.
7. **Separate hosting:** the public page does not call GitHub. It reads one static file. No live API calls from visitors' browsers.
8. **Test:** a "red team" test in the yard tries to sneak private items into the public diary (a fake address, a fake key, a place name). The test passes only if all are blocked. This is a good public story too: "The town tries to leak its own secrets every night, to prove it can't."

#### Law and rules to keep in mind (not legal advice)

- **UK GDPR:** the owner's own data is his choice, but other people (family, testers, friends) need their say before anything about them is shown.
- **UK Children's Code (ICO, Age Appropriate Design Code):** if children use the games or the town, design for privacy by default.
- **EU AI Act, Article 50:** transparency duties started on 2 August 2026. If the town publishes AI-written text to inform the public, say it is AI-written unless a human reviewed it. Our rule (owner approves each story, and a label "written with AI, checked by a person") covers this. Only matters if EU visitors are targeted, but it is good practice anyway.
- **Trademarks:** describe tools by name ("uses Claude Code") but do not use their logos or suggest they endorse the town.

### 6.9 Presenting the metaphor without misleading: a checklist

*From plan 4 (public), section 10. References like "section 3.8" inside this part point to that plan.*

Before any story or screen goes public, check:

1. Is every event in it in the public diary? (Automatic.)
2. Does any caption use a "people" word from the avoid list? (Automatic, with a list.)
3. Does it say what it leaves out?
4. Does it show a failure count or a ratio, not just a win?
5. Can the X-ray show the real record for every beat?
6. Is anything untested shown as working? (It must be fog.)
7. Would a 12-year-old understand the captions? (Read it to one, or use a reading-age check.)
8. Would the owner be happy for a stranger to see every pixel?

### 6.10 Making it a product or a teaching tool

*From plan 4 (public), section 11. References like "section 3.8" inside this part point to that plan.*

#### What is different about PatchTown

| Project | What it is | Real work or simulation? | Who it is for | Licence (code) | What we learn |
|---|---|---|---|---|---|
| **Generative Agents / Smallville** (Stanford, Park et al. 2023, arXiv 2304.03442) | 25 AI characters in a Sims-like town, with memory, planning and reflection | Simulation of social life | Researchers | Apache-2.0 (code); map art from paid tilesets, not reusable | Memory stream, replay of a saved run. Also the warning: it aims for "believable proxies of human behaviour", which is what we must avoid. |
| **AI Town** (a16z-infra) | A starter kit for a town of AI characters who chat | Simulation | Developers | MIT (code); art from separate packs | Walkers on a map, replay from a log |
| **ChatDev** (OpenBMB, Qian et al. 2023) | A pretend software company of AI roles (CEO, coder, tester) | Real code, but tiny made-up tasks | Researchers, developers | Apache-2.0 | Roles; a visualiser that replays a run step by step |
| **MetaGPT** (arXiv 2308.00352) | AI "company" with product manager, architect and engineer roles | Real code, toy tasks | Developers | MIT | Written handovers between roles (like our briefs) |
| **AI Village** (AI Digest, 2025 onwards) | Several frontier AI agents with their own computers, working on real goals in public (e.g. raised about $2,000 for charity) | Real goals, real internet | The public, policy people | Public website; dataset by request | The closest thing to us. Live viewing, honest blog of what went wrong. Lesson: a text and screen view is hard for the public to follow; a picture (our town) could help. |
| **Project Vend** (Anthropic with Andon Labs, 2025) | An AI agent ran a small office shop for a month. It lost money, made things up, and had an identity mix-up. Phase two added an AI "boss" and did better. | Real business | The public, researchers | Write-up only | Honest public reporting of failure is respected, and teaches more than wins |
| **Claude Plays Pokémon** (Twitch, 2025) | A live stream of one AI playing a game, showing its notes and tool use | Real play | The public | Stream; an open-source re-make exists | People will watch an AI work for hours if they can see its notes and its mistakes. The on-screen "knowledge base" taught memory well. |
| **Langfuse** | Traces of AI agent runs for engineers | Real work | Engineers | MIT, except `ee/` folders | Trace, span and event structure |
| **AgentOps** | Session replay for agents | Real work | Engineers | MIT (SDK); hosted dashboard is a service | Event types that map to our ledger kinds |
| **Arize Phoenix** | Agent tracing | Real work | Engineers | Elastic License 2.0 (not open source; no hosting it for others) | Vocabulary only |
| **OpenTelemetry GenAI conventions** | Standard names for AI events | Spec | Engineers | Apache-2.0 | Field names for a future bridge from other people's agents into a town |
| **Teachable Machine** (Google) | Train a small model in the browser with your camera | Real training | Schools, public | Apache-2.0 (v1 and community libraries) | Hands-on training teaches better than watching |
| **Experience AI** (Raspberry Pi Foundation with Google DeepMind) | Free AI lessons for ages 11 to 14 | Lessons | UK schools | Its AI safety set is CC BY-NC-ND 4.0 (no changes, no commercial use); check the rest | How UK teachers want AI materials shaped: lesson plans, slides, short videos |
| **AI4K12 Five Big Ideas** | A framework for teaching AI in schools | Framework | Teachers | Check licence on poster | A checklist for our ten true things |
| **Gource** | A film of a code repository growing | Real history | Developers | GPL-3.0 (ideas only, no code) | Time-lapse of real history is compelling |

**The gap we fill:** simulations (Smallville, AI Town) look like towns but are not real work. Real-work tools (Langfuse, AgentOps) are real but only engineers can read them. AI Village is real and public but is chat and screens. **PatchTown is real work, drawn so anyone can read it, with honesty built in.**

#### Who would use it

| User | What they want | What we would give them | Money? |
|---|---|---|---|
| **The owner** | See his studio, catch stalls, decide fast | The private town (plans 1 to 3 cover this) | Already paying |
| **Family and friends** | Understand what he is doing all day | Invited-guest link | No |
| **The curious public** | "What do AI agents actually do?" | Public replay site, story shelf | No (maybe donations) |
| **Teachers (ages 11 to 16) and parents** | Simple, honest lessons on AI with real examples | A classroom pack: 4 stories, slides, a worksheet, a quiz, teacher notes | Free pack builds reputation; paid workshops possible |
| **Solo developers and small studios using AI agents** | See their own agents' work this way | The open PatchTown kit: ledger spec, hooks, and the town page | Free kit; paid hosting later |
| **Companies using agents** | Explain agent work to managers and clients | A hosted "town" skin on top of their traces | Paid, but a big step (security, support) |
| **Museums, science festivals** | A live, visual exhibit | Projector "wall mode" with a story loop | Paid installation, one-off |
| **Journalists and YouTubers** | Clear pictures of agent work | Stories as short clips (with permission) | No; reach |

#### Product steps, from cheapest to biggest

| Step | What | Effort | Cost | Needs the owner's call on |
|---|---|---|---|---|
| A | **One story, tested on 5 people** (story 1) | 2 to 3 days | None | Taste: the toy look |
| B | **Public replay site** with tour + 5 stories, static, delayed, filtered | 2 weeks | Free hosting (GitHub Pages) | Security: what is public; whether to split the repository |
| C | **Classroom pack**: 4 stories, slide deck, worksheet, teacher notes, quiz; check with 1 or 2 teachers | 1 week | None | Taste and reputation |
| D | **The PatchTown kit (open source)**: ledger spec, `works_log`, optional Claude Code hooks, the town page, the public filter | 2 to 3 weeks | None | Licence (MIT suggested); time |
| E | **A weekly "town newspaper"**: a 60-second clip of the week | 1 day setup, then 30 min a week | None | Taste; voice |
| F | **Hosted service**: people send their agent events; we draw their town | Months | Servers, support, security reviews | Money and security (big) |
| G | **Exhibit / installation** | Weeks per site | Hardware | Money |

Recommendation: do A, then B and C. Do D if people ask "can I have this for my agents?" Do not start F without real demand and outside security help.

#### Licences for our own work

- **Town code and kit:** MIT (simple, matches three.js and AI Town). Keep the games themselves separate (they are the owner's business).
- **Stories and lesson pack:** CC BY 4.0, so teachers can adapt them with credit. Or CC BY-NC 4.0 if the owner wants to stop others selling them. Taste call.
- **Third-party parts:** keep the existing rule from SOURCES.md: ideas only from GPL and Elastic-licensed projects; no Smallville or AI Town art; Kenney kits are CC0 and fine.

#### What would make it a business (honestly)

- The public site will not make money directly. It builds trust and reach.
- Real money could come from: workshops for schools and companies ("how AI agents really work"), exhibit fees, or later a hosted service for teams.
- The biggest risk to a hosted service is security. Agent logs are full of secrets and private code. The privacy filter (9.5) would need to be far stronger and reviewed by an outside expert.
- AI Village, Langfuse and others are moving fast. The lasting edge is the honesty design and the teaching, not the 3D.

### 6.11 Checking that it teaches (evaluation)

*From plan 4 (public), section 12. References like "section 3.8" inside this part point to that plan.*

#### A small, honest test

- **Who:** 5 non-technical adults first, then 5 children aged 10 to 14 with a parent present.
- **Before:** 5 quick true/false questions:
  1. "When an AI starts a new job, it remembers what it did yesterday." (False)
  2. "If an AI says it has finished, the work is correct." (False)
  3. "An AI can change files on a computer without any tools." (False)
  4. "Small AI models can run on a home computer." (True)
  5. "A human can be made to approve some AI actions before they happen." (True)
- **Watch:** the tour plus one story.
- **After:** the same 5 questions, plus "What surprised you?" and "Did the builders seem alive?"
- **Pass mark:** average score goes up by 2 or more, and fewer than 1 in 5 say the builders "have feelings".
- **Privacy:** counts only. No names, no recordings, no faces.

#### In the live site

- Count story plays and finishes (counts only, no tracking, no cookies). The arcade plan already uses "counted, never tracked".
- One optional question at the end of each story. Show the totals publicly ("7 in 10 people got this right").

### 6.12 The public build plan (plan 4's phases; folded into section 8)

*From plan 4 (public), section 13. References like "section 3.8" inside this part point to that plan.*

The atlas puts the public explainer at v4. I suggest pulling a small piece forward, because building it forces the privacy filter to exist, and the filter protects the owner even in the private town.

| Phase | When | What | Done when |
|---|---|---|---|
| 0 | Now | The repository is public (settled). Decision S3 on whether to split | Owner has decided |
| 1 | Week 1 (3 days) | Public diary builder with allow-list, scanners and the leak test; X-ray switch in the private town | Leak test passes with 10 planted secrets all blocked |
| 2 | Week 1 to 2 (3 days) | Story player (beats, captions, next/back, X-ray, text version); story 1 and story 2 | 5 people tested, score up by 2 |
| 3 | Week 2 to 3 (4 days) | Wind-up toy builders (no faces), key that runs down, word-swap list in captions; tour; stories 3, 4, 6, 7 | Tour under 3 minutes; checklist (section 10) passes |
| 4 | Week 3 to 4 (5 days) | Public replay site (static, 7-day delay), "random day" button, truth labels | Owner approves going live |
| 5 | Month 2 | Classroom pack; teacher feedback; brief summaries and tool counts (needs hooks, owner's call); stories 9, 10, 13 | 1 teacher uses it with a class |
| 6 | When real | Graduate story, cost story | A real graduate exists |
| 7 | If asked | Open kit | Someone outside runs it on their own agents |

Who builds it: cloud builders, as with everything else. The owner's time: about 1 hour a week to approve stories, plus the security decisions.

---

## 7. Performance and tech

### 7.1 Measured cost of v1

*From plan 5 (world), section 1.2. References like "section 3.8" inside this part point to that plan.*

| Viewport | Draw calls per frame (incl. shadow pass) | Triangles | Meshes in scene | Lights | Shader programs |
|---|---|---|---|---|---|
| 1600 x 900 | 415 | 34,214 | 482 | 14 (12 point lights, 1 sun, 1 sky) | 5 |
| 400 x 860 | 283 | 27,188 | 482 | 14 | 5 |

The triangle count is tiny; the cost is in **draw calls** (one mesh per tree trunk, cone, lamp, parcel, post) and in **12
point lights on MeshStandardMaterial**, which makes every pixel of every lit surface loop over 12 lights. On a phone
that is the difference between smooth and stuttering. The plan below cuts both (section 13).

**Checker's note (Appendix B).** An independent count of every WebGL draw call per frame, same URL, headless Chromium with software GL, gave about **690** at 1600 x 900 and about **610 to 630** at 400 x 860, on both the 16 Nov afternoon page and the current one. The two methods count different things; either way the page is well above the budget below. The 12 point lights were confirmed in the code (9 lanterns, the lost property alarm, the shop, the yard).

### 7.2 Level of detail: projector, laptop, phone

*From plan 5 (world), section 12 (framing per device is in section 5.15). References like "section 3.8" inside this part point to that plan.*

#### Tiers

| Tier | Chosen when | Pixel ratio cap | Shadows | Ink | Real point lights | Particles | Labels visible |
|---|---|---|---|---|---|---|---|
| **A: Projector / desktop** | Wide screen (>= 1280 px), a capable GPU, or `?wall` | 1.0 at 4K, 1.5 at 1080p | One 2048 map, soft | All big shapes | <= 4 (vehicles in motion only) | Full | <= 24 |
| **B: Laptop / iPad** | Medium screen or measured frame time > 14 ms on tier A | 1.5 | One 1024 map | Buildings and characters | <= 2 | Half | <= 16 |
| **C: Phone** | Narrow screen (< 760 px) or measured frame time > 20 ms on B | 1.5 (2 on fast phones) | **No shadow map**: soft blob shadows baked under buildings and instanced under figures | Buildings only | 0 | Quarter | <= 8 |

**Auto-downgrade**: if the median frame time over 3 seconds exceeds the tier's budget, drop a tier (never up again in the
session, to avoid flicker). Shown nowhere, logged in `__works`.

#### Distance LOD (all tiers)

- Buildings: two versions (full and a simple "box + roof + windows" with the same vertex colours). Swap at a
  screen-height threshold (under about 40 px tall). Home Town on phones nearly always uses the simple version.
- Characters: under about 12 px tall, become a single instanced coloured capsule with a hat dot.
- Parcels, coins, cars beyond the threshold: merged to "a heap" shape scaled by count.
- Labels: priority order (alarms first, then done, then busy, then the rest), and a screen-space collision test; a label
  that would overlap a higher-priority one hides. On phones only alarm, done and the focused bank's top 6 show.

#### Frame rate on the wall (from plan 2)

A big projector at 4K with shadows and particles may stutter, and stutter reads as "something wrong". Cap the frame rate in Wall mode (30 fps is fine for a still camera); pause rendering when the page is hidden.

### 7.3 Performance plan for three.js r128

*From plan 5 (world), section 13. References like "section 3.8" inside this part point to that plan.*

#### Budgets

| Tier | Draw calls (incl. shadow pass) | Triangles | Materials | Textures (GPU) | Frame time target |
|---|---|---|---|---|---|
| A | <= 300 | <= 400k | <= 12 | <= 24 MB | 16 ms (60 fps), 33 ms allowed in wall mode when idle |
| B | <= 200 | <= 250k | <= 10 | <= 16 MB | 16 ms |
| C | <= 120 | <= 120k | <= 8 | <= 8 MB | 16 ms (accept 30 fps) |

Today: 415 calls at 1600 x 900 with 34k triangles and 12 point lights. The plan spends more triangles (nicer models) and
far fewer calls and lights.

#### How

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

#### Loading

- Total download for the town's models <= 1.5 MB (baked JS, gzip on Pages); the town draws its current box shapes
  first and swaps models in when the file arrives (the existing `tryModels()` path, extended).
- No external textures except one 512 x 512 pictogram atlas (drawn in a canvas at start-up from simple paths: no file
  needed) and the gradient map (3 pixels).

### 7.4 Models: where they come from

*From plan 5 (world), section 14. References like "section 3.8" inside this part point to that plan.*

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

### 7.5 Data plumbing (merged from plans 1, 3 and 4)

| Piece | Today (v1) | Plan | Why |
|---|---|---|---|
| Reading GitHub | Each viewer's browser polls the API without logging in: `/events` every 2 min, runs, deployments and branches every 10 min, commits per branch | One `town-state.json` snapshot built by a scheduled GitHub Actions workflow with `contents: read` for the API and write to `gh-pages` (decision S2). The page reads it first; direct API only when the snapshot is over 15 min old | 60 calls an hour per home address, shared by every screen; the Events API can be 30 s to 6 h late; `/deployments` is not how this repo deploys |
| The ledger's path | Typed lines, appended on `game/micro-precinct`, read from `raw.githubusercontent.com` (cached about 5 min) with a bundled fallback | Hooks and the runner append to a local spool (`.works-spool/`, git-ignored, locked appends); the foreman's `works_flush` dedupes, sorts, validates, commits and pushes; builders never push ledger lines from their own branches | One ledger, one writer of record, many producers; no merge fights |
| Live page checks | None | The page itself (same origin on Pages) fetches each live path with `cache: 'no-store'` every 10 min and checks a build marker string; the snapshot job does the same | Honest street lights at almost no cost |
| Home town data | A hand-typed SAMPLE wall | A fenced `town-report.json` block at the end of each run report, extracted by the foreman; rejected as stale after 48 h | The standing order already asks for these numbers |
| Watchdog | The page's own clock | Plus a scheduled task every 30 min that wakes a fresh foreman only when a rule fires (decision M1) | A page nobody is looking at alarms nobody |
| Public diary | None | Built from the ledger through an allow-list (`day`, `part_of_day`, role, building, kind, `public_what`, test fields), scanners, a 7-day delay and Harry's yes per story; served as one static file; the public page never calls GitHub | The private town and the public town need different filters |
| Field names | `t`, `who`, `where`, `what`, `kind`, `ref`, `branch`, `trust`, `suite`, `status`, `n` | Add `v`, `id`, `t_rec`, `src`, `job`, `sha`, and the kinds in section 3.5; the page ignores fields it does not know | No breaking change |

### 7.6 Tech ground rules (unchanged from v1)

- **three.js r128**, from a pinned CDN version; one page (`games/works/index.html`); no build step.
- Test hooks stay: `?offline`, `?now=<time>`, `window.__works` (state, scrub, cards, replay), the `HOOKS` slots, and the
  `assets/models.json` swap path for baked models.
- `tests/works-test.js` (Playwright) is the harness: glance tests (v1.1), performance budgets (v1.5), fire drills and
  the 15 Nov replay (v1.1 and v2) are added there.
- **Never run an auto-formatter** on the page (it rewrites every line and breaks merges; the same house rule as the games).
- Every outside file is CC0, MIT or Apache and listed in `THIRD_PARTY.md`; ideas only from GPL and Elastic-licensed
  projects (the existing rule in `SOURCES.md`).

---

## 8. Build roadmap, in versions

**How to read it.** Effort is for one cloud builder (S = up to half a day, M = about a day, L = 2 to 3 days, XL = a
week or more). "Who": **cloud** = the foreman and builders; **town** = the home town (CAIRN and the local machines);
**Harry** = a decision or a download only he can make. "Needs" = what must exist first. At most 2 builders at a time.

**The order, and why.** Truth first (the town must not lie), then reading at a glance (it must be read in 5 seconds),
then looks and speed (the page is already over its draw-call budget), then new buildings, then the public. Each
version ends with its tests passing in `tests/works-test.js` and fresh screenshots.

### v1: now (being built tonight)

What exists or is landing in the current page (checked in the files):

| Item | State |
|---|---|
| Ledger with `trust` on every line; commit lines from git with real times | Done |
| Live GitHub reading, the bundled ledger fallback, `?offline`, `?now=`, `__works` test hooks | Done |
| Replay with a scrubber and day arrows; a tour | Done |
| Lost property: amber 45 min, red 2 h, from the page's own clock | Done |
| Weather from the yard; test lamps per suite and branch; `rerun` status | Done |
| Orders wait at the bridge until a `result` arrives | Done |
| The home town's wall as clearly marked SAMPLE values | Done |
| Day / evening by the clock; reduced motion stops motion | Done |

### v1.1: truth and glance fixes (next 2 to 3 days; no new art)

| # | Item | Effort | Needs | Who | Fixes |
|---|---|---|---|---|---|
| 1 | Ledger checker: `ledger.schema.json` and `tools/validate.mjs` (required fields per kind, writer rules, unique IDs, privacy lint), run in `works-test.js`. v1 lines accepted as version 1. | S | — | cloud | L13, privacy |
| 2 | `works_log` v2 (adds `id`, `t_rec`, `src`, branch and SHA automatically) and `works_test` runner wrapper (writes `test` lines from the exit code with counts, tries, time) | S | 1 | cloud | L12, L9 |
| 3 | Lamps keyed by suite + branch + SHA; "not run on this commit" is grey; lamps never vanish, they go grey "not run lately" | S | 2 | cloud | L7, L10 |
| 4 | Provenance on every card: source, trust, "as of", "written 3 h later"; typed lines pale and dotted | M | 1 | cloud | trust |
| 5 | Freshness strip ("as of 18:51, data 1 min"), grey at 15 min; haze at 3 h of silence in a working window | S | — | cloud | stale-as-live |
| 6 | The mood line (one sentence, biggest text, written by rules, leads with what failed); title fades after 3 s; diary closed by default; "since you looked" (3 lines) | M | — | cloud | glance |
| 7 | Wall type scale from screen height (labels 1/30, nothing under 1/45); one font; sentence case; label collision hiding; plain workshop names | M | — | cloud | projector |
| 8 | State vocabulary (section 2.5): Okabe-Ito colours plus shapes plus words; alarm settles once then steady; "Still" button | M | — | cloud | colour blindness, alarm fatigue |
| 9 | Still camera in glance views; tour only of changed places, 6 stops at most | S | — | cloud | motion |
| 10 | Street lights and fire station from the page: probe each live path (`no-store`) every 10 min; list `b\d+/` backups | S | — | cloud | health |
| 11 | Subagent stats on every `end` line (tokens, tool uses, minutes); written into the brief template | S | 2 | cloud | bank, power |
| 12 | Builder briefs say: "your job ID; beat about every 10 min; commit every 20 to 30 min; no end without a commit; claims as a list" | S | 2 | cloud | F1, F2, F30 |
| 13 | `ask` / `answer` lines; the town hall board with ages and the right room; START_HERE's "Waiting on Harry" generated from open asks | M | 1 | cloud | F23, F24 |
| 14 | Order lifecycle: `quote`, `go`, `result` written as they happen; the bridge shows wagon age; amber 12 h without a quote | S | 1 | cloud, Harry pastes | F22 |
| 15 | Corrections for known bad v1 lines (12:19 end becomes `abandoned`, duplicate deploys, the 16:40 hire) as `correct` lines | S | 1 | cloud | L2, L5 |
| 16 | Replay of 15 to 16 Nov with the new rules: the stall must show by 18:30 on 15 Nov (acceptance test) | S | 3 | cloud | proof |
| 17 | Glance tests in the harness: 0 label overlaps, smallest text at least 1/45 of the height, at most 45 words on screen, nothing moves for 10 s with reduced motion | S | 6 to 9 | cloud | measurement |
| 18 | A scheduled check every 30 min that reads the ledger and wakes a fresh foreman only when a rule fires | S | 12 | cloud | F1 |

**Harry:** item 18 uses a little of the plan (money). Everything else needs nothing from Harry except taste.

### v1.5: look and speed pass (about a week)

| # | Item | Effort | Needs | Who |
|---|---|---|---|---|
| 1 | Shared style module: Base Camp's toon gradient (110, 190, 255), ink outline `#2b1d2e`, one shared vertex-colour material | M | — | cloud |
| 2 | Re-lay the map (section 2.3): Works bank in front, river, the bridge with toll booth and customs house, Home Town behind, harbour east; board edge | L | 1 | cloud |
| 3 | Shared state parts as InstancedMeshes (panes, halos, beacons, stars, bunting, smoke, fog, flags) | M | 1 | cloud |
| 4 | Glow sprites instead of the 12 point lights; one shadow map fitted to the view | M | 3 | cloud |
| 5 | Three device tiers with auto-downgrade; performance test in the harness (300 / 200 / 120 draw calls) | M | 4 | cloud |
| 6 | Wall, Hearth and Pocket modes (section 5.15); the phone's two stops | M | v1.1 #6, #7 | cloud |
| 7 | Clouds kept off Home Town; storm and rainbow rules from Appendix A | S | — | cloud |
| 8 | Download the Kenney CC0 kits on a normal computer and put them where the foreman can read them | S | — | **Harry** (download) |
| 9 | Bake script: palette remap, ink hull, one JS model file (like Base Camp's `props.js`); swap hut, workshops, library, post, shop, home machines | L | 8 | cloud |
| 10 | Concept art: the first 12 image prompts (`IMAGE_PROMPTS.md`), made in ChatGPT, saved as `concept/<id>-<name>.png` | S each | — | **Harry** (taste: pick the style key) |

### v2: infrastructure that catches problems (1 to 2 weeks)

| # | Item | Effort | Needs | Who |
|---|---|---|---|---|
| 1 | Claude Code hooks to a local spool, flushed by the foreman (section 3.6): hire, start, beat, end, commit, push, merge, fail, restart | M | v1.1 #1, #2 | cloud; **Harry** (security yes) |
| 2 | Stall thresholds move to 20 min late / 60 min lost once beats flow | S | 1 | cloud |
| 3 | GitHub snapshot workflow writing `town-state.json` (branches, heads, merges, gh-pages folders, probes, `as_of`) | M | — | cloud; **Harry** (security yes) |
| 4 | `town-report.json` block at the end of each home run report; the foreman turns it into `stage`, `seat` and `result` lines | M | v1.1 #14 | **town** writes; cloud reads; Harry pastes |
| 5 | Power station, battery tower (from Harry's readings, typed), rolling blackout on a power cut | M | 1 | cloud |
| 6 | Paired test runs (new vs last live build, same load), load gauge, flake list and quarantine (max 3) | M | v1.1 #2 | cloud |
| 7 | Claim and check: brown box / gold parcel; deploys with unchecked claims blocked | M | v1.1 #12 | cloud |
| 8 | Order linter (canary, test, committed inputs, budget, `needs:` per stage, Dell marked bonus, NEEDS HARRY turned into asks) | S | — | cloud |
| 9 | Car parks, Dell Lane jam with a queue clock, night train and Night Halt | L | 4 | cloud |
| 10 | Sorting office, telephone exchange (counts and lengths only), road works, lighthouse freshness, fog on unproven items, hills | L | 1, 3 | cloud |
| 11 | Seat report cards; empty and rule-break checks; the bench rule | M | 4 | cloud suggests; **town** acts |
| 12 | The control room mode: flow board, machine board, budgets (section 4.4) | L | 1, 4 | cloud |
| 13 | Calls with "Got it"; quiet hours; the crier v1 (browser voice, captions); keyboard map; breadcrumb and 4 zoom levels | L | v1.1 | cloud |
| 14 | Daily truth audit (`tools/audit.mjs`) and the truth meter in the town hall; weekly 10-item spot check | M | 3 | cloud; Harry 10 min a week |
| 15 | Privacy filter for a public diary (allow-list, `public_what`, scanners, nightly leak test) | M | v1.1 #1 | cloud |

### v3: learning made visible, checks on checkers (2 to 3 weeks)

| # | Item | Effort | Needs | Who |
|---|---|---|---|---|
| 1 | Resident Row: house size from the roster, gardens, report cards, diplomas (cutaway), trophies, letterboxes; one `roster.json` | L | v2 #4 | cloud; **town** sends the roster |
| 2 | Mill burrows; university, greenhouse, exam hall, graduation; `train` lines | L | 1 | cloud; **town** |
| 3 | Calibration: planted known answers in every batch a model judges; uncalibrated verdicts do not count | M | v2 #11 | cloud designs; **town** runs |
| 4 | Museum, fire station rollback, hospital and ambulance | M | v2 #3 | cloud |
| 5 | Postmortems, incident board, weekly town meeting card | S | v2 #12 | cloud |
| 6 | L2 automatic actions after a dry-run week (paired rerun, one resume of a stalled builder, block unchecked deploys, hold new work at low fuel) | M | v2 | cloud; **Harry** (yes) |
| 7 | Soundscape (section 2.11), game controller, replay in sepia with 3 speeds, single-building replay, text twin | L | v2 #13 | cloud |
| 8 | X-ray switch on every toy | M | v1.1 #4 | cloud |
| 9 | Story player and story 1 "How a bug got caught", then story 2; tested on 5 non-technical people | L | 8, v2 #15 | cloud; Harry approves each story |

### v4: the whole atlas and the public (month 2 onwards)

| # | Item | Effort | Needs | Who |
|---|---|---|---|---|
| 1 | Harbour, ships, licence board, customs arch | M | v2 #3 | cloud |
| 2 | Bank (tokens and minutes; money only from bills Harry adds) | S | v1.1 #11 | cloud; Harry (money, optional) |
| 3 | Courthouse columns, market stalls with credits, noticeboard | M | v2 | cloud |
| 4 | Crier's voice from Kokoro on the Mini (pre-recorded phrase book) | M | — | **town**; **Harry** (download) |
| 5 | Private voice commands (speech model on the Mini) | L | — | **town**; **Harry** (download, security) |
| 6 | Board tiles and growth animation; week view; Hearth drift; paper boats if wanted | M | v1.5 | cloud; Harry (taste) |
| 7 | Home town reads the cloud ledger and shows it on its own wall | M | — | **town**; **Harry** (security) |
| 8 | A mailbox the home town can write to without Harry pasting | L | — | **Harry** (security) |
| 9 | Public replay site (static, delayed 7 days, filtered, "random day" button, truth labels) | L | v3 #9 | cloud; **Harry** (security yes to go live) |
| 10 | Classroom pack (4 stories, slides, worksheet, teacher notes, quiz) | M | 9 | cloud; Harry (taste, licence) |
| 11 | Theatre / arcade play counts | M | a counting service | **Harry** (money and security) |
| 12 | L3: rollback on a Sev 1 | S | v3 #6 | cloud; **Harry** (yes) |
| 13 | Optional OpenTelemetry through a local collector that strips identity | M | — | **town**; **Harry** (download, security) |
| 14 | The open PatchTown kit (ledger spec, hooks, page, filter) | XL | v4 #9 | cloud; **Harry** (licence, whether to give it away) |

### Stop rules

- **Over-instrumentation:** stop after v1.1 if the truth audit already shows a high measured share; hooks and the
  snapshot only with Harry's yes.
- **Scope:** about 45 buildings and signs are planned. Each version must pass its tests before the next starts.
- **The games come first.** The Works town is studio tooling. It never jumps ahead of a fix that blocks a live game or
  Harry's play (BUDGET_LEDGER rule 6), and no new work starts under 15% fuel (rule 7).

---

## 9. Decisions for Harry

Only money, security, deleting, downloads and taste. Everything else in this plan is decided. Each decision has a
recommended default, so nothing waits: reversible taste calls take their default after 3 days of silence; **money,
security, deleting and downloads never do (silence means no)**. Say yes or no in the town chat. The short version is in
`DECISIONS.md`. Planners who asked are in brackets.

### 9.1 Security

| ID | Question | Recommended default | Why |
|---|---|---|---|
| S1 | Switch on Claude Code **hooks** for this repo, so the town writes hire, start, beat, end, commit and stall lines by itself? They run a small script on each event and keep only listed fields (never prompts, never raw IDs, never paths). (P1, P3, P4) | **Yes, after a one-week dry run** writing to a local file only. | Removes most hand-typed lines; hooks run commands, so it is your call. |
| S2 | Let a **GitHub Actions workflow** publish one `town-state.json` snapshot to `gh-pages` every few minutes? It needs write access to the `gh-pages` branch. Free on a public repo. (P1) | **Yes.** | Every screen at home shares one 60-calls-an-hour limit today; one file fixes it. |
| S3 | The repo is **public**. Keep it public, or move the working repo to private and publish the town from a separate clean public repo? (P1, P4) | **Keep it public for now; the ledger is checked for privacy on every line from v1.1. Decide again before any public launch (v4).** | The cheap guard comes first; a split is a big move. |
| S4 | **Automatic actions (level 2)** after a dry-run week: re-run a test side by side, resume a stalled builder once from its last commit, block a deploy with unchecked claims, hold new work when fuel is low. (P3) | **Yes, after the dry-run week**, with the stop lever. | All undoable, all inside the cloud workshop. |
| S5 | **Rollback on a Sev 1 (level 3):** the town may roll a broken live game back to the kept build, then tell you. (P3) | **Later** (after level 2 runs clean for 2 weeks). | Bigger step. |
| S6 | May the **Mini read the cloud's public ledger** and show it on its own wall? Read-only, but a new network habit at home. (P3) | **Yes, in v4.** | Each half can then see the other's age. |
| S7 | A **mailbox** the home town can write to without you pasting (removes most of the 3 hand touches per order). It opens a door into the home network. (P3) | **Not now.** Revisit after hooks run clean. | Big ops gain, real security cost. |
| S8 | **Browser speech recognition** for voice commands (in Chrome, audio goes to Google's servers). (P2) | **No.** Use the Mac and iPad's own Voice Control (no code, no audio leaves). Later: a speech model on the Mini. | Privacy rule. |
| S9 | **Public delay** for the public replay: 1 day, 7 days or a month? (P4) | **7 days** (1 day for invited guests). | Hides routine; still recent. |
| S10 | Your **first name** in public: "Harry" or "the owner"? (P4) | **"Harry"** (it is already public in the repo). Never a surname, never anyone else's name. | The real risk is other details. |
| S11 | Can the public see the **home town**? (P4) | **Yes, with generic names** (the Forge, the Boarding House, the Mill), no machine details beyond size and kind. | Teaches local vs cloud; gives an attacker nothing. |
| S12 | **Approve every public story**, or approve the first month, then let the daily diary go out by itself? (P4) | **Approve every story; review after the first month.** | Your yes is the last filter. |
| S13 | What do **visitors** see of the control room: token costs, open questions, the truth meter? (P1, P3) | **Truth meter and counts: yes. Token costs and the text of your questions: no.** | Honest, but private. |

### 9.2 Money

| ID | Question | Recommended default | Why |
|---|---|---|---|
| M1 | A **scheduled check every 30 minutes** that reads the ledger and wakes a fresh foreman only when a stall rule fires. It uses a little of the plan each time it wakes. (P3) | **Yes.** | Would have turned the 19 h 52 min stall into about 1 hour. |
| M2 | Make reading the **plan meter** a routine (each morning and before you stop)? The foreman cannot see it. (P3) | **Yes, twice a day.** | Planning big jobs blind wastes more. |
| M3 | Should the **bank** ever show money? (P1, P4) | **No.** Tokens and builder minutes only; £ only if you add bills by hand. Public sees a 1 to 5 coin scale. | The town cannot measure your bills or electricity. |
| M4 | A **counting service** for play counts (the theatre / arcade) needs a server. (P1, P5) | **Not now.** | Money and security; children play. |
| M5 | The **public site**: free for ever, or try paid workshops or an exhibit later? (P4) | **Free.** Revisit after the classroom pack is tested. | Builds trust first. |
| M6 | Give away an **open PatchTown kit** (MIT licence)? (P4) | **Later, only if people ask.** | Keeps the town yours until it is proven. |

### 9.3 Downloads

| ID | Question | Recommended default | Why |
|---|---|---|---|
| D1 | Download the free **Kenney CC0 model kits** (City, Car, Train, Watercraft, Nature, Mini Characters, Fantasy Town and others) on a normal computer, for the new look. The build machine is blocked by their site. (P5) | **Yes.** | CC0, no strings; Base Camp already uses the same route. |
| D2 | **CC0 sound packs** instead of synthesised sounds. (P2, P5) | **Later.** Synthesised sounds first (no download). | Nothing is needed yet. |
| D3 | **Kokoro** voice on the Mini for the crier (82M, Apache 2.0). (P2) | **Later (v4).** | The browser voice works first. |
| D4 | An **OpenTelemetry collector** on the Mini (it would give cost per session; Claude Code's telemetry always includes the account email unless stripped). (P1) | **Not now.** Tokens per job from `end` lines are enough. | Privacy and effort. |
| D5 | A **speech model** on the Mini for private voice commands. (P2) | **Later (v4).** | Only after the rest works. |

### 9.4 Deleting

| ID | Question | Recommended default | Why |
|---|---|---|---|
| X1 | When the ledger grows past about 2 MB, **move** old months into `games/works/ledger/2026-11.jsonl` (nothing deleted). (P1) | **Yes.** | Keeps the page fast. |
| X2 | If something personal ever lands in the public ledger: **rewrite git history** to remove it, or only correct it from now on? (P1) | **Rewrite history only for a real personal leak** (a name, a place, a picture, a secret). Everything else: a `correct` line. | History is public and permanent otherwise. |
| X3 | How long should the Mini **keep raw iPad field reports with pictures**? (P1) | **30 days, then ask you before deleting anything.** Numbers are kept. | Pictures are the most private thing; the disk floor is 30 GB. |
| X4 | Closed workshops leave the 3D town after 14 days (the data stays in the ledger and the museum). | **Yes** (nothing is deleted from the record). | Keeps the town readable. |

### 9.5 Taste

| ID | Question | Options | Recommended default |
|---|---|---|---|
| T1 | How builders look (P4, P5) | (a) faceless wind-up toys with a key that runs down; (b) lanterns on carts; (c) clockwork birds | **(a)** |
| T2 | Residents and tiny experts (P5) | (a) wind-up figures for residents, clockwork mice for tiny experts; (b) all mice; (c) all figures | **(a)** |
| T3 | Residents' character names in public (P4) | (a) kept, in quotation marks, "a label for a test voice"; (b) plain labels ("the 27B model") | **(a)** |
| T4 | Builders when a job ends (P5) | (a) pop into paper confetti, the hat stays on the rack; (b) walk home to a hostel | **(a)** (it teaches "the run is gone") |
| T5 | Harry in the town (P5) | (a) a porch lantern and a big rubber stamp, nobody shown; (b) a toy figure that looks like nobody; (c) nothing | **(a)** |
| T6 | Toy material (P5) | (a) painted wood and soft plastic; (b) Base Camp's household rubbish at town scale | **(a)** |
| T7 | Ink line (P5) | (a) Base Camp's weight (about 2.5% of size); (b) bold cartoon; (c) fine | **(a)** |
| T8 | Map (P5) | (a) Home Town across the river behind the Works; (b) side by side | **(a)** |
| T9 | Far bank's name (P5) | (a) "Home Town"; (b) "Harry's town"; (c) the town picks | **(a)** |
| T10 | District colours (P5) | pine green Base Camp, orange B&B, violet Vigil, slate blue Works | **keep** |
| T11 | Time of day (P5) | (a) follow the real clock with a readability floor; (b) always dusk | **(a)**, with the Daylight button kept |
| T12 | Evening look (P2) | (a) warm lamplight, deep blue night; (b) darker, moonlit; (c) cosy amber | **(a)** |
| T13 | Weather strength (P5) | (a) gentle; (b) dramatic | **(a)** |
| T14 | Rainbow after a real-device win (P5) | (a) 2 hours; (b) until the next storm | **(a)**, hidden during a storm |
| T15 | Paper boats for messages between the towns (P5) | yes / no | **No for now** |
| T16 | Sound on the wall (P2, P5) | (a) Soft by default; (b) silent until switched on | **(a)** |
| T17 | The town's sounds (P2) | (a) village: hammers, bells, carts; (b) softer chimes; (c) off unless asked | **(a)** |
| T18 | Crier voice (P2, P4) | (a) a computer voice that says it is one; (b) a warm old crier; (c) one per district | **(a)** |
| T19 | Crier on the hour by day (P2) | off / on if something changed | **Off** |
| T20 | Anything that may sound at night (P3) | (a) nothing, all waits for the morning; (b) Sev 1 only | **(a)** |
| T21 | Times (P2) | (a) "18:20"; (b) "6:20 pm"; (c) "20 min ago" | **(a)**, plus "20 min ago" on the phone |
| T22 | Timeline shape (P2) | (a) a clock strip with a density band; (b) busy hours wide | **(a)** |
| T23 | Typed (remembered) events (P1) | (a) pale and dotted; (b) hidden by default | **(a)** |
| T24 | Stale data (P1) | (a) haze and "as of"; (b) greyed buildings only | **(a)** |
| T25 | Crier reads failures as loudly as wins (P1) | yes / no | **Yes** |
| T26 | Questions for you a day (P3) | up to 5, in one daily block; what time? | **Up to 5, in one block, early evening** |
| T27 | Taste defaults after 3 days of silence, if undoable (P3) | yes / no | **Yes** |
| T28 | Camera on the wall (P2, P5) | (a) still; (b) a director camera that visits events | **(a)** |
| T29 | Real-device wins in public (P4) | (a) shown as "a door"; (b) not mentioned | **(a)** |
| T30 | Lesson pack licence (P4) | (a) CC BY (change and share with credit); (b) CC BY-NC (no selling) | **(a)** |
| T31 | Dell Writer: bench it until the home town finds why it answers "(DONE)"? (P3) | This is the home town's call; the cloud only suggests. | **Suggest: bench** |

---

## 10. Risks

Merged from all five plans; duplicates joined. Likelihood and impact are the planners' judgement, not measured.

| # | Risk | Likelihood | Impact | What we do | From |
|---|---|---|---|---|---|
| 1 | **Something personal leaks into the public repo** (a place, a name, a play time, a room picture). History is permanent. | Medium | High | Validator lint on every line from v1.1; whitelist-only hooks; daily totals only for device data; deny-list kept outside the repo as hashes; nightly leak test; public diary with its own allow-list; Harry's yes per story. Rewriting history is Harry's call (X2). | P1, P4, P5 |
| 2 | **The town says "all calm" while a builder is silently stuck** | Medium | High | Silence rules computed by the page; heartbeats; the watchdog outside the session; haze after 3 h; fire drills; the 15 Nov replay as an acceptance test. | P1, P2, P3 |
| 3 | **Stale data looks live** (the GitHub fetch fails quietly; old home reports) | High | Medium | Freshness strip grey at 15 min; lighthouse stops; every number has `as_of`; home figures fade after 24 h; the snapshot file. | P1, P2, P3, P5 |
| 4 | **Alarm fatigue** (too many bells; every feature wants to be a Call) | Medium | Medium | 3 levels; one alarm per cause; a Call budget, counted; weekly review that retunes or removes alarms that led to no action. | P2, P3 |
| 5 | **Logging becomes the work** (builders spend effort writing lines; over-instrumentation) | Medium | Medium | Hooks do it (with Harry's yes); until then one `works_log` line per step; stop after v1.1 if the measured share is already high. | P1, P3 |
| 6 | **Gaming the numbers** (empty commits, padded answers, rerun until green, builders chasing lamps) | Low to medium | Medium | Only checked outcomes glow; `tries` recorded; never rank builders by counts; the audit checks against independent sources. | P1, P3 |
| 7 | **Model judges that look rigorous but are not** (the rubber-stamp coder, the self-contradicting picture judge) | High | Medium | Planted known answers; uncalibrated verdicts do not count as a key. | P3 |
| 8 | **Automation acts on wrong data** (resumes a builder that was still running: two builders on one branch) | Low | Medium | Check the branch had no commit since the last sign; one automatic resume per brief; 2-builder cap; dry-run week; the stop lever. | P3 |
| 9 | **The unauthenticated GitHub limit freezes the town at home** (several screens share one address) | High | Medium | Snapshot file; age badge; direct API only as a fallback. | P1 |
| 10 | **Hooks slow or break sessions** | Low | Medium | `async`, always exit 0, tiny scripts, fire drill before rollout. | P1 |
| 11 | **Ledger merge conflicts with many writers; lost lines when a container is replaced** | Medium | Low | Local spool plus one flusher; silence detection still fires if lines are lost. | P1 |
| 12 | **Phone and projector performance** (already over budget: 12 point lights, hundreds of draw calls) | High | Medium | v1.5 rebuild before new buildings; three tiers with auto-downgrade; a performance test in the harness; 30 fps cap on a still wall. | P2, P5 |
| 13 | **Clutter** (forty buildings, a hundred walkers, twenty labels) | Medium | Medium | Silhouette rule, label priority and collision hiding, attention budget, one alarm beacon per building, no feed no building. | P2, P5 |
| 14 | **Decoration creeping in** (birds, strollers) breaks "motion is data" | Medium | Low | The law written into the style module; a test that fails when an animated object has no data binding; three honest heartbeats instead. | P5 |
| 15 | **Spatial memory breaks** when workshops come and go | Medium | Low | Plots never reshuffle; closed workshops leave after 14 days; new board tiles at the edges. | P2, P5 |
| 16 | **Visitors think the AIs are little people with feelings** | High if cute | Medium | No faces, no celebrations, the word-swap list, the metaphor contract on the first screen, and a test for it. | P4 |
| 17 | **Visitors think AI is useless** (too many failure stories) | Medium | Medium | Show ratios; wins and failures together; a "random day" button. | P4 |
| 18 | **The metaphor hides the real thing** | Medium | Medium | X-ray on every toy. | P4 |
| 19 | **The toy hides the truth** (a charming town makes a bad day look nice) | Medium | Medium | Brightness is proof; the phone view leads with a plain answer; the text twin. | P3, P4 |
| 20 | **Sound annoys; the crier talks over the TV or a call** | Medium | Low | Soft by default, Off on phones, quiet hours, one-key "Quiet", varied loops. | P2, P5 |
| 21 | **Voice privacy** (browser speech recognition sends audio to a cloud) | Certain if switched on | Medium | Not switched on (S8). | P2 |
| 22 | **Mood text is written by rules, so sometimes clumsy** | High | Low | Short, visible rules in the "What is this?" card. | P2 |
| 23 | **Concept art promises more than three.js can deliver; style drift across many images; text and logos in images** | Medium | Low | Style key first and attached every time; whole sheets regenerated; "no text, no logos" in every prompt. | P5 |
| 24 | **Models blocked** (the kit site answered 403 to the build machine) | Certain | Low | Harry downloads once (D1); drawn shapes until then. | P5 |
| 25 | **Home town numbers cannot be checked from the cloud** | High | Medium | Marked `reported`; internal consistency check (A9); Harry's spot checks. | P1, P3 |
| 26 | **Showing security rules teaches attackers** | Low | Medium | Show that rules exist, not how they are enforced. Never show machine addresses or bridge details. | P4 |
| 27 | **Usage cost of watching** | Low | Low | The watchdog wakes a foreman only when a rule fires. | P3 |
| 28 | **Schema churn breaks the page** | Medium | Low | `v` field, the validator, the page ignores unknown fields. | P1 |
| 29 | **Effort pulls time from the games** | Medium | Medium | Strict version order; the games' blocking fixes come first; the privacy filter helps the private town too. | P4 |
| 30 | **Teaching claims go out of date** (AI changes fast) | High | Low | Date every story; review the ten true things every 3 months. | P4 |
| 31 | **Legal duties** (EU transparency for AI-written text; UK data rules; children) | Low | Medium | Label AI-written text; no other people's data; children's code; advice before any paid product. Not legal advice. | P4 |
| 32 | **The bridge's security cost** (a mailbox into the home network) | — | High | Harry's call (S7), weighed separately. | P3 |

---

## 11. Sources

Each planner's source list, unchanged except headings. Items the planners marked as from search summaries are listed again in Appendix B.3. Project files read by the checker: `games/works/ATLAS.md`, `LEDGER.md`, `ledger.jsonl` (now and at commit `a16ba21`), `index.html` (now and at `a16ba21`), `games/START_HERE.md`, `TOWN_MACHINES.md`, `HOW_TO_SEND_WORK_TO_PATCHTOWN.md`, `STANDING_ORDERS.md`, `MEGA_REVIEW_16NOV.md`, `BUDGET_LEDGER.md`, `orders/report-1.md`, `orders/results/2026-11-15-power1-economy1b-look1.md`, `base-camp/STRESS_RESULTS.md`, `.github/workflows/ci.yml`, and the home town's wall sketch (16 Nov, 16:35).

#### Plan 1 (data)

- Claude Code hooks reference: https://code.claude.com/docs/en/hooks (event names, common input fields, `async`, timeouts, SessionEnd 1.5 s budget).
- Claude Code monitoring (OpenTelemetry): https://code.claude.com/docs/en/monitoring-usage (metrics, events, attributes, privacy defaults; `user.email` always included when available; repo settings cannot enable telemetry).
- GitHub REST best practices (conditional requests count free only when authorised): https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api
- GitHub Events API latency "30s to 6h" and `X-Poll-Interval`: https://docs.github.com/fr/enterprise-server@3.7/rest/activity/events
- Unauthenticated limit 60 per hour per IP: https://www.x-cmd.com/ratelimit/github/ and https://github.com/orgs/community/discussions/156480
- docs.github.com could not be fetched directly from this session (network allowlist); limits above come from search results and should be re-checked on the official rate-limit page.

#### Plan 2 (glance)

Design and attention
- Weiser and Brown, "Designing Calm Technology", Xerox PARC, 1995 (the Dangling String): https://calmtech.com/papers/designing-calm-technology
- Calm technology and Amber Case's principles: https://en.wikipedia.org/wiki/Calm_technology and https://oreilly.com/content/principles-calm-technology-we-are-not-bad-at-technology-technology-is-bad-at-us
- Stephen Few, dashboard as one screen at a glance ("Dashboard Confusion", 2004): https://www.informationweek.com/government/dashboard-confusion-2 ; book review: https://www.uxmatters.com/mt/archives/2007/04/book-review-information-dashboard-design.php
- Shneiderman, "The Eyes Have It" (overview, zoom and filter, details on demand), 1996: https://webspace.science.uu.nl/~telea001/uploads/VACourse/Shneiderman96.pdf
- Mankoff et al., "Heuristic Evaluation of Ambient Displays", CHI 2003: https://bibtex.github.io/CHI-2003-MankoffDHKLA.html
- Cowan, "The magical number 4 in short-term memory", 2001: https://pubmed.ncbi.nlm.nih.gov/11515286/
- Peripheral motion: McKee and Nakayama 1984: https://pubmed.ncbi.nlm.nih.gov/6695503/ ; Anstis 2020: https://journals.sagepub.com/doi/10.1177/2041669520937029 ; red/green falls off in the periphery (2020): https://link.springer.com/article/10.3758/s13414-020-02086-z

Reading, dyslexia and cognition
- Dyslexia style guide summaries (BDA 2018 figures, as reported): https://www.bumc.bu.edu/jmedday/files/2025/05/Dyslexia-friendly-style-guide.docx and https://ako.ac.nz/assets/Knowledge-centre/ALNACC-Resources/Dyslexia-resources/230907-Dyslexia-Friendly-Style-Guide.pdf . The official BDA PDF was not reached; check it for exact figures.
- Dyslexia Scotland, typed formats (1.5 line spacing): https://dyslexiascotland.org.uk/dyslexia-friendly-typed-formats
- Smashing Magazine, a dyslexia-friendly mode: https://smashingmagazine.com/2021/11/dyslexia-friendly-mode-website
- Atkinson Hyperlegible: https://github.com/googlefonts/atkinson-hyperlegible ; https://www.adobe.com/express/learn/blog/atkinson-hyperlegible-font ; Next: https://fonts.adobe.com/fonts/atkinson-hyperlegible-next
- W3C, Making Content Usable for People with Cognitive and Learning Disabilities (COGA): https://www.w3.org/TR/coga-usable/
- ADHD design guidance (practitioner, not peer reviewed): https://digitalcommunications.wp.st-andrews.ac.uk/2025/02/12/designing-for-users-with-adhd/ and https://www.boia.org/blog/adhd-friendly-web-design-minimizing-distractions

Projection
- The 8H rule and text size: https://www.purshology.com/2022/12/how-big-is-big-enough-the-8h-rule-reveals-all-powerpointdesigners/ and https://www.pptfaq.com/FAQ00125_How_big_should_text_be-_What-s_the_ideal_font_size-.htm ; viewing distance rules: https://www.proav.de/video/projectionrules.html
- Ambient light and washout: https://zebrahomecinema.com/blog/how-room-light-control-affects-projector-and-tv-image-quality ; dark versus light slides discussion: https://www.edwardtufte.com/?p=515

Colour
- Okabe-Ito palette (Color Universal Design) and Wong 2011: https://www.datawrapper.de/blog/colorblindness-part2 and https://conceptviz.app/es/blog/okabe-ito-palette-hex-codes-complete-reference

Motion, flashing and alarms
- WCAG 2.3.1 three flashes: https://w3c.github.io/wcag/understanding/three-flashes.html
- WCAG 2.2.2 pause, stop, hide: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide
- UCSF Alarm Study (about 89% false, 52 alarms an hour): https://pmc.ncbi.nlm.nih.gov/articles/PMC4206416 and https://nursing.unc.edu/news/modern-monitoring-systems-contribute-to-alarm-fatigue-in-hospitals

Sound
- Gilfix and Couch, "Peep (The Network Auralizer)", LISA 2000: https://www.usenix.org/legacy/events/lisa00/gilfix.html
- Gaver auditory icons, ARKola (CHI 1991), cited in: https://www.dcs.gla.ac.uk/~stephen/papers/CHI93.PDF

Browser features
- Speech recognition support: https://caniuse.com/speech-recognition
- Gamepad API support: https://caniuse.com/gamepad

Not verified: the ARKola paper's full text (only its citation was found); the official BDA PDF; Mankoff's exact heuristic list.

#### Plan 3 (operations)

- [S1] Cemri, Pan, Yang et al., "Why Do Multi-Agent LLM Systems Fail?" (MAST taxonomy; 14 failure modes in 3 groups:
  system design, inter-agent misalignment, task verification). arXiv 2503.13657: https://arxiv.org/abs/2503.13657v3
- [S2] Google, Site Reliability Engineering, ch. 6 "Monitoring Distributed Systems" (four golden signals; symptoms versus
  causes): https://sre.google/sre-book/monitoring-distributed-systems/
- [S3] Healthchecks.io: dead man's switch monitoring with period and grace time: https://healthchecks.io and docs on
  configuring checks, e.g. https://healthchecks.sre.cfainstitute.org/docs/configuring_checks/ (an instance of the open
  source docs); source: https://github.com/healthchecks/healthchecks
- [S4] Temporal, activity timeouts, heartbeat timeout and retry policies:
  https://docs.temporal.io/evaluate/development-production-features/failure-detection and
  https://temporal.io/blog/activity-timeouts
- [S5] Anthropic, "Building effective agents" (orchestrator-workers, evaluator-optimizer, start simple):
  https://www.anthropic.com/engineering/building-effective-agents
- [S6] Kanban flow metrics: lead time, cycle time, throughput, WIP, Little's Law. ProKanban, "The Kanban Pocket Guide,
  ch. 6: The Basic Metrics of Flow": https://prokanban.org/blog/https-prokanban-org-blog-the-kanban-pocket-guide-chapter-6-the-basic-metrics-of-flow
- [S7] METR, "Measuring AI Ability to Complete Long Tasks" (time horizons; reliability falls with task length):
  https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/
- [S8] Anthropic, "How we built our multi-agent research system" (orchestrator-worker; briefs need objective, output format,
  tools, boundaries; vague briefs caused duplicated work): https://www.anthropic.com/engineering/multi-agent-research-system
  ; the duplication example is summarised in LangChain's "How and when to build multi-agent systems":
  https://blog.langchain.com/how-and-when-to-build-multi-agent-systems
- [S9] Google, Site Reliability Engineering, ch. 15 "Postmortem Culture: Learning from Failure":
  https://sre.google/sre-book/postmortem-culture/ ; Workbook ch. 10: https://sre.google/workbook/postmortem-culture/
- [S10] Claude Code hooks reference (`Stop`, `SubagentStop`, `PostToolUse`): https://code.claude.com/docs/en/hooks
- [S11] Google Testing Blog, "Flaky Tests at Google and How We Mitigate Them" (about 16% of tests show some flakiness;
  reruns; quarantine): https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html ; and "Where do our
  flaky tests come from?": https://testing.googleblog.com/2017/04/where-do-our-flaky-tests-come-from.html
- [S12] Google, Site Reliability Engineering, Part II and ch. 3 "Embracing Risk" (error budgets):
  https://sre.google/sre-book/part-II-principles/ ; Workbook "Implementing SLOs": https://sre.google/workbook/implementing-slos/
- [S13] Work item age and cumulative flow diagrams (Vacanti, Actionable Agile Metrics for Predictability): Scrum.org on the
  work item aging metric: https://www.scrum.org/resources/blog/detecting-flow-issues-using-predictive-cycle-time-charts-origin-kanbanflow-work-item-aging-metric
  ; ProKanban on CFDs: https://www.prokanban.org/blog/cumulative-flow-diagrams-cutting-through-the-colourful-clutter
- [S14] LangChain / LangGraph human-in-the-loop (interrupt, approve / edit / reject, resume from a checkpoint):
  https://docs.langchain.com/oss/python/langgraph/add-human-in-the-loop
- [S15] PagerDuty Incident Response docs, severity levels and incident commander:
  https://response.pagerduty.com/before/severity_levels/ and https://response.pagerduty.com/during/during_an_incident/
- [S16] DORA four keys (deploy frequency, lead time, change failure rate, time to restore), summarised by Dynatrace:
  https://www.dynatrace.com/knowledge-base/doras-four-keys/ (benchmarks vary across sources; the 0-15% change failure band
  is the most consistent)
- [S17] Lean Enterprise Institute lexicon, andon: https://www.lean.org/lexicon-terms/andon/ ; Toyota UK, the andon cord:
  https://mag.toyota.co.uk/toyota-manufacturing-25-objects-andon-cord
- [S18] Langfuse evaluation concepts (scores on traces, observations, sessions; LLM-as-a-judge):
  https://langfuse.com/docs/evaluation/core-concepts
- [S19] OpenTelemetry GenAI semantic conventions (`invoke_agent`, `execute_tool`; still in development status). Summary:
  https://www.dash0.com/knowledge/opentelemetry-genai-semantic-conventions-explained ; already noted in
  games/works/SOURCES.md

**Repo files used (branch game/micro-precinct, worktree micro-precinct):** games/works/ATLAS.md, games/works/LEDGER.md,
games/works/ledger.jsonl, games/works/SOURCES.md, games/START_HERE.md, games/TOWN_MACHINES.md,
games/HOW_TO_SEND_WORK_TO_PATCHTOWN.md, games/STANDING_ORDERS.md, games/BUDGET_LEDGER.md, games/MEGA_REVIEW_16NOV.md,
games/orders/*.md, games/orders/inputs/mega-1-brief.md, games/orders/results/2026-11-15-power1-economy1b-look1.md,
games/base-camp/STRESS_RESULTS.md, and the home town's wall sketch (PatchTown Wall, 16 Nov 16:35).

**Caveats on sources:** several outside facts were confirmed from search summaries and secondary pages rather than full
primary text (MAST's full list of 14 modes, the exact SRE chapter wording, PagerDuty's full severity table, DORA
benchmarks). The PatchTown numbers are read from the repo as it stands on 16 Nov; home town figures are as pasted by
Harry and may be out of date.

#### Plan 4 (public)

Project files (read as data, 16 Nov 2026): `games/works/ATLAS.md`, `games/works/mockup.html`, `games/works/index.html`, `games/works/LEDGER.md`, `games/works/ledger.jsonl`, `games/works/SOURCES.md`, `games/MEGA_REVIEW_16NOV.md`, `games/START_HERE.md` (last part), and the home town's wall sketch (scratchpad artifact e2e17322…).

Outside sources (checked 16 Nov 2026; several via search summaries, marked):
- Generative Agents, Park et al. 2023: https://arxiv.org/abs/2304.03442 (code licence per SOURCES.md: Apache-2.0)
- AI Town: https://github.com/a16z-infra/ai-town (MIT, per SOURCES.md)
- ChatDev: https://github.com/OpenBMB/ChatDev (Apache-2.0, per SOURCES.md)
- MetaGPT: https://github.com/FoundationAgents/MetaGPT (MIT; arXiv 2308.00352) — licence from README mirrors, check the LICENSE file
- AI Village: https://theaidigest.org/village/blog/introducing-the-agent-village , https://theaidigest.org/village/blog/how-the-ai-village-works , https://theaidigest.org/village/blog/what-we-learned-2025
- Project Vend phase one: https://www.anthropic.com/research/project-vend-1 ; phase two: https://www.anthropic.com/news/project-vend-2 (summaries via search; read the originals before quoting)
- Claude Plays Pokémon write-ups: https://latent.space/reading/claude-plays-pokemon/ and https://michaelyliu6.github.io/posts/claude-plays-pokemon (secondary sources)
- The Ethics of Advanced AI Assistants (Google DeepMind, 2024): https://arxiv.org/abs/2404.16244
- All Too Human? Mapping and Mitigating the Risk from Anthropomorphic AI (AIES 2024): https://ojs.aaai.org/index.php/AIES/article/view/31613
- AI4K12 Five Big Ideas: https://ai4k12.org/ and https://ai4k12.org/wp-content/uploads/AI4K12_Five_Big_Ideas_Poster_v2.pdf
- Experience AI: https://www.raspberrypi.org/blog/experience-ai-launch-lessons/ and https://experience-ai.org (AI safety set CC BY-NC-ND 4.0; check others)
- Teachable Machine: https://blog.google/technology/ai/teachable-machine and https://github.com/googlecreativelab/teachable-machine-v1 (Apache-2.0)
- EU AI Act Article 50 guide: https://artificialintelligenceact.eu/transparency-rules-article-50/ and https://cooley.com/news/insight/2026/2026-08-03-eu-ai-act-transparency-obligations-take-effect-2-august-2026
- Langfuse, AgentOps, Arize Phoenix, OpenTelemetry GenAI, Gource, Kenney, three.js: licences as recorded in `games/works/SOURCES.md`.
- ELIZA: Weizenbaum, J. (1966), "ELIZA — a computer program for the study of natural language communication between man and machine", Communications of the ACM 9(1).
- UK ICO Age Appropriate Design Code (Children's Code): https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/

Not checked directly: TensorFlow Playground licence; the Experience AI core unit licence; AI Village's current live schedule.

#### Plan 5 (world)

Plan 5 used project files only (the atlas, the ledger notes, the mock-up and v1 page, the v1 screenshots, the home town's wall, Base Camp's HANDOVER build 15 and 16 notes and its style shot), plus Kenney and Quaternius for CC0 models (names to check on download).

---

## Appendix A. The check: where the five plans disagreed, and what this plan decides

Each row: what disagreed, who said what, the decision, and one line of why. The rest of this plan follows these
decisions. Where a spliced block from a planner still says something different, the decision here wins (most such
lines have been edited, and a "Decision" note sits under the rest).

Planners: **P1** data (1-data.md), **P2** glance (2-glance.md), **P3** operations (3-ops.md), **P4** public
(4-public.md), **P5** world (5-world.md). "v1" means the live page as it is being built now (`index.html`).

### A.1 The ten that matter most

| # | Conflict | Who said what | Decision | Why (one line) |
|---|---|---|---|---|
| 1 | **Stall alarm timing** | P1: amber 45 min, red 2 h, whole-town haze 3 h. P3: late 20 min, lost 60 min. P2: a Call at 2 h. v1 (built): 45 min / 2 h. | **Two stages.** Until builders write heartbeats: amber 45 min, red 2 h (as v1). Once `beat` lines flow (at most one per 10 min per job): late 20 min, lost 60 min. Haze over the whole town after 3 h of total silence in a working window. | An alarm should fire after about two missed signs of life; with no heartbeats, 45 min of silence is normal during a long test run. |
| 2 | **What to build first** | P1: validator and honest data first. P2: mood line, type scale, cut list first. P3: heartbeats, claim/check, Harry's board first. P4: privacy filter and one story first. P5: look pass and performance before new buildings. | **v1.1 = truth and glance fixes on the page that exists** (no new art). **v1.5 = look and performance pass.** v2 = infrastructure and automatic data. v3 = learning, checking, first public story. v4 = public site and the rest. | The atlas rule is "measured or not shown", and today the town still tells some lies (old green hiding new red); beauty on top of lies makes them more convincing. |
| 3 | **Ledger format: field names and kinds** | P1: `conf`, `src`, `id`, `job`, `t_rec`, `check` = live page probe. P3: `check` = a second key on a claim, plus `claim`, `queue`, `seat`, `incident`, and a `limit` line with a field called `what`. v1 (built): `trust`. | Keep **`trust`** (already in 119 live lines). Add `id`, `job`, `src`, `t_rec`, `v`. **`check`** = a verdict on a claim (P3). P1's page probe is renamed **`probe`**. P3's `queue` folds into **`stage`** (phase `queued`/`start`/`end`). P3's `limit.what` becomes `limit.resource` (`what` is the caption on every line). | No breaking rename of a live field; one meaning per kind name. |
| 4 | **State colours** | P2: Okabe-Ito colour-blind-safe set (bluish green, orange, vermilion, sky blue, grey). P5 and v1: moss green `#7fd18b`, rose `#ff7a85`, amber, honey, slate. | **Okabe-Ito for state**, P5's warm palette for the world (walls, roofs, grass, sky). Every state also has a shape and a word. | Done and failed are the most important difference in town; moss and rose drift to the same beige for the most common colour blindness. |
| 5 | **Alarm look: pulse or still** | P5: rose beacon, slow 1 Hz pulse. P2: no endless pulse; settle once, then still and dark. v1: pulses for 5 s, then steady. | **Settle once (1.5 s), then steady.** The failed thing goes dark; a small steady vermilion cross beacon marks it. Nothing flashes more than once a second, ever. | Endless pulses become wallpaper (alarm fatigue) and break WCAG 2.2.2; stillness plus darkness is easier to spot. |
| 6 | **Camera on the wall** | P5: a "director camera" that glides to each event (3 s), holds 6 s, returns. P2: a still camera in glance views; the tour only when something changed. v1: slow auto-orbit. | **Still master shot by default.** Director camera is an option (off). The tour plays on request, or every 15 min only if something changed. | Places that never move let Harry stop reading labels; motion must mean "something real is happening". |
| 7 | **How AIs look** | P5: round figures in hard hats; the A4 prompt asks for "friendly simple faces"; builders hop and throw hats on a win; tiny experts are mice. P4: wind-up toys, **no faces**, no feelings, no celebrating, synthetic voice. | **Wind-up toys with no faces** and a winding key that runs down with the session. Keep P5's hats and district colours. No celebrations: a win lights the shop, not the builders. Tiny experts are clockwork mice with no painted faces. Image prompts edited to match. | The public lesson is "these are tools, not people"; a face and a cheer teach the opposite. |
| 8 | **Storm and rainbow rules** | Atlas: storm = "several real failures at once"; rainbow = real-device win. P1: storm at 2+ failures an hour; rainbow only with device evidence. P5: storm on 1 failure; rainbow 2 h. P2: one weather at a time, rainbow 20 min. v1: storm on any failure, rainbow on any `win` for 2 h. | **Storm** = 2 or more suites failing on current heads, or any failure on the live build. One failure on a workshop branch = road works on that branch only. **Rainbow** only for a `win` with `evidence: device`, for 2 h, hidden while a storm is on; the star over the shop keeps the memory. | Follows the atlas's own words; one failing workshop is not a town-wide storm. |
| 9 | **Public delay and the public repo** | P4: the repo "looks public", check it; public diary 7 days late, invited guests 1 day; split private and public repos. P1: the ledger is public in real time, so write every line as if strangers read it. Brief: the repo **is** public. | **The repo is public now.** So: (a) every ledger line is written for strangers (P1's rule, enforced by the validator from v1.1); (b) the public explainer adds a second filter, a 7-day delay and Harry's yes per story (P4); (c) whether to split into a private working repo plus a clean public one is Harry's security decision, default "keep as is for now, review before any public launch". | The leak risk is live today, so the cheap guard (lint every line) comes first; the big move (splitting repos) is his call. |
| 10 | **Sound defaults and quiet hours** | P5: sound on by default on the wall; quiet hours after 23:00 at half volume; thunder per failure; a fanfare and a crowd cheer. P2: Soft on the wall, Off on the phone; quiet hours 22:00 to 07:00 with no sound at all; no thunder (a startle). P4: no cheering. | **Soft on the wall, Off on the phone and laptop. Quiet hours 22:00 to 07:00: silent;** Calls wait for the morning bulletin. No thunder, no cheer: a failure is one low wooden knock, a win is the shop bell and a short rising chime. Synthesised in the browser first (no download). | Sound you cannot stop or that startles gets switched off for good, and then it carries no data. |

### A.2 All the other disagreements

| # | Topic | Who said what | Decision | Why |
|---|---|---|---|---|
| 11 | Heartbeat rate | P1: hooks write at most 1 beat per 15 min per job. P3: about every 10 min. | At most one per 10 min per job. | Matches the 20-minute "late" rule (two missed beats). |
| 12 | Test lamp key | P1: suite + branch + commit (SHA). v1: suite + branch. | v1's suite + branch now; suite + branch + SHA in v2. | v1 already stops build 29's pass hiding build 30's fail; SHA closes the last gap (two builds on one branch). |
| 13 | Lamps that age out | v1: tests drop off after 2 days. P1: never vanish; go grey "not run lately". | Grey "not run lately" after 2 days, never gone. | Absence must not look like health. |
| 14 | Test statuses | v1: `pass`, `rerun`, `flaky`, `fail`. P1: `pass`, `fail`, `flaky`, `error`, `skipped` with `n.tries`. P3: paired-run outcomes (regression, old flake, flaky). | `pass`, `rerun` (passed on a later try), `flaky` (confirmed old flake by a paired run), `fail`, `error`, `skipped`, with `n.tries`. | Keeps v1's honest `rerun` and adds P3's paired-run proof. |
| 15 | Alarm level names | P2: Note / Nudge / Call. P3: Lamp / Bell / Page. | **Lamp** (shown only), **Bell** (needs action today; the crier and the foreman), **Call** (needs Harry). | Plain words; "page" means nothing to most people. |
| 16 | Call budget | P2: 3 Calls a day or fewer. P3: no more than 1 page a day. | Aim for 3 or fewer Calls a day; at most 1 outside a working window. Counted, and reviewed weekly. | Both planners want the same thing; this is the stricter reading for night time. |
| 17 | Which state list | P2: done, working, failed, needs Harry, not proven, old data. P5: idle, busy, alarm, done, off, fog. | One list of 8: idle, busy, done, alarm, **needs Harry**, off, plus two overlays: **fog** (not proven) and **old data** (sepia). | Each planner's list missed a state the other needed. |
| 18 | Stale data vs "fog" | P1 used "fog" for stale data. P5 and the atlas use fog for "never tried on a real device". | Stale data = **haze** (and the lighthouse stops). Fog = not proven on a device. | One picture, one meaning. |
| 19 | Freshness signal | P2: a freshness strip that goes grey after 15 min. P5: the lighthouse beam. P1: "GitHub: 14 min old", haze after 3 h. | All three, one rule: strip turns grey and the lighthouse blinks at 15 min old; haze at 3 h of total silence in a working window. | Text for readers, a picture for the room, haze for the worst case. |
| 20 | Battery gauge | P1: do not draw it (no API gives the real number). P3: show Harry's last plan-meter reading, its age, and an estimate since. P5: a 10-cell tower. | Draw P5's tower from Harry's last reading, marked **typed** and pale, with its age; greyed "unknown" after 24 h. Tokens used since come from `end` lines. | Honest about where the number came from, and still useful for planning big jobs. |
| 21 | Hills (hard ground) data | P5: fix and fail lines plus commits whose message says fix or revert. P1: failures and reruns per suite, and fix open-to-close time, not commits. | P1's measure. | Commit messages are talk; failures are measured. |
| 22 | Fox rule | P1: idle and queue from the same report, under 2 h old. P3: idle 15 min with eligible work waiting. | Both conditions. | Prevents a fox from mixing a 16:35 idle with a 14:00 queue. |
| 23 | Disk alarm | P3: amber under 40 GB, red under 33 GB. P2: a Call at the floor. | Amber < 40 GB, red < 33 GB, Call at the 30 GB floor (the town refuses jobs). | Warn before the town stops. |
| 24 | Orders stuck | P1: no quote after 24 h. P3: no quote in 12 h = amber. | Amber at 12 h with no quote, red at 24 h; red when a result is past its due time (or 48 h with no quote at all). | Early nudge, firm alarm. |
| 25 | Questions for Harry ageing | P1: red after 48 h. P3: white, yellow after a day, curl after 3 days; crier after 24 h if blocking. P5: white, cream (1 day), yellow and curling (3 days), brown (a week). | P5's look; Bell after 24 h if it blocks work; Call after 48 h if it blocks work. | Age visible, and only blocking questions make noise. |
| 26 | Defaults for silence | P3: taste calls take their default after 72 h if reversible; never for money, security, deleting, downloads. P2: every taste question has a default. | Same as P3. Silence on money, security, deleting or downloads means **no**. | Harry's own rule: only ask about those five, never assume yes. |
| 27 | Watchdog | P1: the page computes alarms itself. P3: a scheduled task outside the session checks every 30 min and wakes a foreman. | Both. The scheduled task wakes a foreman only when a rule fires. | A page nobody is looking at alarms nobody; a watcher on the machine that died sees nothing. |
| 28 | Sun position | P5: the real sun for one fixed latitude. | A fixed, generic British latitude, never the real location; the same sunrise table for everyone. | No location clues in a public file. |
| 29 | Sound stinger rate | P2: 6 one-shots a minute at most. P5: one every 3 s, queued by priority. | Both: at most 6 a minute and at least 3 s apart, by priority (Call > win > deploy > fail > test > commit). | Merged limits. |
| 30 | Lost property repeat bell | P5: every 10 min, 3 times. P2: once, again after 30 min if not acknowledged. | P2. | Fewer repeats, still not forgotten. |
| 31 | Crier voice | P2: warm older town crier. P4: clearly synthetic, say it is a computer voice. | Browser voice, announced as a computer voice ("This is the town's computer voice"). Character comes from the words and the bell, not a fake person. Taste call for Harry. | Honest by default; Harry can choose the flavour. |
| 32 | Phone view | P2: answer card on top, still town in the middle, "since you looked" below. P5: two camera stops (Works, Home Town) joined by a "cross the bridge" button. | Both: P2's layout, with P5's two stops inside the town panel. | They fit together. |
| 33 | Workshop places | P2: fixed slots, fill left to right, never reshuffle. P5: plots per district wedge, 6 each, new board tiles. | P5's plots; P2's "never reshuffle" is the rule. | Spatial memory. |
| 34 | Home Town position | P2's wall sketch: home town top right. P5: Home Town across the river, north, behind the Works. | P5 (north, far bank, bridge in the centre). Taste question kept for Harry. | P5 worked it out with coordinates and the flow of work. |
| 35 | Public number labels | P1: four trust levels. P4: three public labels (counted, estimated, not measured). P4 6.4: claimed, tests pass, real device. | Two separate ladders: **data trust** (measured, reported, typed, sample; shown to the public as counted, reported, from notes, example) and **work proof** (claimed, checked, live, proven on device; drives brightness). | One ladder answers "how do we know?", the other "how done is it?". |
| 36 | Theatre (play counts) | P5: marquee bulbs by plays. P1: not until a counting service is approved. P4: no player data at all at first (children). | Not built until Harry approves a counting service. Then counts only, never per person, never times. | Needs a server (money and security) and touches children's play. |
| 37 | Harry's name in public | P4: "the owner" in public. Ledger rule and the public repo: "Harry" already. | Keep "Harry" (already public in the repo); never a surname, never anyone else's name. Decision for Harry, default as stated. | It is already public; the real risk is other details. |
| 38 | Diplomas | P5: diplomas on the wall. P4: in public call them "training labels" with the exam score beside them. | Diplomas in the world; the X-ray card says "training record" and shows the exam score. | Both: a picture and an honest caption. |
| 39 | Order of build items in P5 vs atlas | Atlas: stall alarm and weather in v2. P5: power station etc. in v2. v1 already has lost property and weather. | v1 keeps what it has; the rest follows the roadmap in section 8. | Do not undo built work. |
| 40 | Snapshot vs live API | P1: a GitHub Actions snapshot file. P4: the public page reads one static file. P2: freshness strip. | One snapshot file (`town-state.json`) for everyone; direct API only as a fallback when the snapshot is over 15 min old. Needs Harry's yes (a workflow that writes to `gh-pages`). | Fixes the 60-calls-an-hour limit shared by every screen at home, and the Events API's lateness. |
| 41 | Which "16:27" | START_HERE and P3 call 16:27 a machine restart; the ledger's last measured commit from that builder is 16:27:21. | Both true and consistent: the builder's last commit landed at 16:27:21, then it stopped. The restart itself has no ledger line. | Recorded as a fact in Appendix B. |
| 42 | Build 29 "live" time | Ledger `win` (typed) 17:10; measured gh-pages deploy 17:13:47; START_HERE "about 17:50" (that is the whole-house fix at 17:46). | The measured 17:13:47 is the live time. | A small, real example of why typed times are drawn pale. |

## Appendix B. Fact check: claims about our own project

Checked on 16 Nov 2026, evening, against the files on branch `game/micro-precinct`. "Verified" means the number was
found in the file named. "Corrected" means the claim was close but wrong, and the right number is given.
"Could not verify" means no file in the repo backs it.

**Important background.** The planners read the ledger when it had **90 lines** (commit `a16ba21`). Since then the v1
builder has rebuilt it: it now has **119 lines**, commit lines carry real git times with seconds, and every line has a
`trust` field (75 `measured`, 44 `typed` in the working copy). So some "today" numbers in the plans describe the
90-line ledger, not the current one. Both are given below.

### B.1 The ledger and the page

| Claim (planner) | Result | Evidence |
|---|---|---|
| 41 of 90 ledger lines have a time ending in `:00Z` (P1) | **Verified** for the 90-line ledger. Now 35 to 37 of 119 (the rebuild replaced many typed commit lines with real git times). | `git show a16ba21:games/works/ledger.jsonl`; current file |
| Kinds: commit 34, test 15, deploy 11, start 6, hire 6, order 5, end 4, win 4, step 3, fix 2; no `result`, `fail` or `download` (P1) | **Verified** for 90 lines. Now commit 65, test 16, deploy 10, rest the same. Still 0 `result`, 0 `fail`, 0 `download`. | same |
| Writers: foreman 44, town 15, depth 10, mac 9 ... (P1) | **Verified** for 90 lines. Now foreman 52, mac 23, town 16, depth 12 ... | same |
| 6 hires, 6 starts, 4 ends; the 18:02 hire has no start; the 12:26 depth start has no end; the 16:40 researcher hire has no `ref` (P1) | **Verified.** | ledger |
| Test statuses: 11 pass, 3 flaky, 1 fail in 15 test lines (P3) | **Verified** for 90 lines. v1 has since added a `rerun` status. | ledger |
| 5 orders (mega-1, scan-1, report-1, keep-1, mega-review-1), 0 results logged (P1, P3) | **Verified.** | ledger |
| Duplicate deploys 12:34:00 + 12:34:21 and 15:23:00 + 15:23:26 (P1) | **Verified** in the 90-line ledger. | ledger at `a16ba21` |
| roomfix fail on build 30 at 18:00, pass on build 29 at 18:16 hid it (P1, "the most dangerous lie") | **Verified** as a lie in the 90-line page; **already fixed** in v1 (lamps are now kept per suite and branch). The SHA key is still to do. | ledger; `computeState()` in `index.html` |
| Lamps drop off after 2 days (P1) | **Verified** (still true in v1). | `computeState()` |
| CI runs only on `main` pushes and pull requests, so game-branch tests never run in GitHub Actions (P1) | **Verified.** | `.github/workflows/ci.yml` |
| The page polls GitHub without logging in (P1, P4) | **Verified** (`CFG.api`, `pollMs: 120000`, `x-ratelimit-remaining` read). | `index.html` |
| v1 page is 85 KB (P2) | **Verified** (85,177 bytes at `a16ba21`); now about 91 KB. | git |
| Label sub-lines 0.68 rem, about 1/95 of a 1080-line screen (P2) | **Verified** (root font `0.45vw + 9.5px`; 0.68 rem is about 11 to 12 px). | `index.html` CSS |
| The alarm lamp pulses "about 2.5 times a second" for ever (P2) | **Corrected.** `abs(sin(secs * 4))` repeats every 0.79 s: about **1.3 pulses a second**. And v1 has **since changed** it: it now pulses for 5 s only, then stays steady. | `index.html` then and now |
| Reduced motion only slows things to 25% (P2) | **Corrected (fixed since).** That was true at `a16ba21`; v1 now sets speed to 0 when reduced motion is on. | `index.html` |
| 12 point lights (P5) | **Verified:** 9 lanterns + lost property alarm + shop + yard = 12, plus a sun and a hemisphere light. | `index.html` |
| 415 draw calls a frame at 1600 x 900, 283 at 400 x 860 (P5) | **Could not reproduce exactly.** Our own count (every WebGL draw call, headless Chromium, software GL, same `?offline&now=` URL) gave about **690** per frame at 1600 x 900 and about **610 to 630** at 400 x 860, on both the old and the current page. The two methods count different things (ours includes every pass the browser runs). Either way the page is **well above** P5's budget of 300 / 200 / 120. | test script in the planner's scratchpad |
| Stall rule in v1: amber 45 min, red 2 h, from the page's own clock | **Verified** (v1 adopted P1's numbers). | `lostProperty()` |
| v1 already has `trust`, `rerun`, lamps per suite and branch, orders waiting until a `result` | **Verified.** Several P1 problems (L1, L7 in part, L9) are already fixed in v1. | `LEDGER.md`, `index.html` |

### B.2 The failures and the log

| Claim | Result | Evidence |
|---|---|---|
| 30 dated failures F1 to F30 (P3) | **Verified as a count** (30 rows). Spot checks below. | `3-ops.md` |
| F1: build 29 builder started 14:26 (15 Nov), stopped 16:27, found 12:19 next day: **19 h 52 min** dead | **Verified.** The start (14:26) is typed; the builder's last commit (`48b0716`) is measured at **16:27:21**; the `end` is 12:19 on 16 Nov. 16:27 to 12:19 = 19 h 52 min. | ledger; START_HERE |
| F2: restarts about 10:40 and 14:49 on 13 Nov; Christmas decorations redone from scratch for 293,934 tokens; builder jobs cost 89,729 to 534,644 tokens | **Verified.** | `BUDGET_LEDGER.md` |
| F3: a usage limit was hit on 15 Nov | **Could not verify.** Only `ATLAS.md` says so. No ledger line, no log line. Kept as "stated in the atlas". | `ATLAS.md` |
| F4: the town lost the Mini from 12:25 on 13 Nov | **Verified.** | START_HERE, TOWN_MACHINES |
| F5: load average 14 with 2 builders; build 18 "regressions" were timing on a loaded machine | **Verified.** | START_HERE |
| F9: build 19 fixes came back with 2 claims to check (duplicate Pip chip, card not visible in shot 58) | **Verified.** | `BUDGET_LEDGER.md` |
| F10: six toy rooms, none shows what its line asked for, "the train marked them done" | **Verified.** | home town's wall |
| F11: the 14B coder said "no bugs found" to all 70 pieces | **Verified.** Pass 2: 10 reports were the same generic guess. | `games/base-camp/STRESS_RESULTS.md` |
| F12: the Brain's reads ran past their time limit (a thinking loop) | **Verified.** | same |
| F13: Dell Writer answered "(DONE)" twice, after 2,317 s and 259 s: **43 min** | **Verified:** 2,317.1 s + 258.7 s = 2,575.8 s = 42.9 min. | `orders/results/2026-11-15-power1-economy1b-look1.md` |
| F13: "17% of that Dell run's 4 h 13 min" | **Verified, with a note:** 4 h 13 min is the sum of all 16 Dell seat times across the two orders in that results file (15,152 s = 252.5 min). 42.9 / 252.5 = 17%. | same |
| F13: "7 of 72 sparks in one set were noise" | **Corrected:** 6 of 72 in look-1's sparks and 1 of 72 in power-1's sparks: **7 of 144** across two sets. | same |
| "About 1 in 8 answers empty or broken" (P3, P4, mega review) | **Verified:** 2 of 17 Dell seats (1 of 9 in power-1, 1 of 8 in economy-1). | same |
| F18: the 27B took 462 min for a level the Brain built in 15; one resident answer took 2,867 s | **Verified** (the Dell Scholar, 2,866.8 s). | TOWN_MACHINES; results file |
| F22: 13 Nov, six orders waited for Harry to paste | **Verified** (webkit-1, seasons-1, art-b2, waterworks-1, experts-1, measure-1). | START_HERE |
| BUDGET rules 5 (fix flaky tests once) and 7 (Harry reads the plan meter; no new work under 15%) (P3) | **Verified.** | `BUDGET_LEDGER.md` |
| F25: Mini disk 27 GB at 12:25 on 13 Nov; 35 GB on 16 Nov | **Verified.** | TOWN_MACHINES; wall |
| Cycle times: couch versus 48 min; snapshots 4 h 5 min; fixer 1 h 16 min (P3) | **Verified** (11:16 to 12:04; 10:05 to 14:10; 15:51 to 17:07). All from typed lines. | ledger |
| 14 Nov: builds 20, 21, 22, 23, 24, 26 and 27 went live (7 in one day) (P3) | **Verified.** | START_HERE overnight log |
| Six new voices: 2 pass, 1 borderline, 3 fail (P4) | **Verified** (two green, one amber, three red squares on the wall). | home town's wall |
| First real-device win at about 16:10 on 16 Nov (P4) | **Verified.** | START_HERE, ledger |
| "29 builds passed robot tests in fake rooms" (P4) | **Corrected (loose):** say "every build up to 29 was robot-tested in fake rooms; the first real-room lock on a real iPad was 16 Nov". | START_HERE |
| Build 29 live at 17:10 (P2 sketch, P4 story) | **Corrected:** typed `win` 17:10; measured deploy 17:13:47. Use 17:13. | ledger |
| Two rosters disagree: 12 vs 13 tiny experts; 8 vs 10 Dell residents (P1) | **Verified.** The 15 Nov results show 8 Dell seats. | TOWN_MACHINES vs HOW_TO_SEND |
| 13 ledger kinds today (P3) | **Verified.** | `LEDGER.md` |
| Harry said yes to report-1 in the game session; it still needs saying in the town chat (P3 F23) | **Verified.** | `orders/report-1.md` |

### B.3 Outside claims marked by the planners as from search summaries (re-check before quoting in public)

| Claim | Planner | Status |
|---|---|---|
| GitHub: unauthenticated limit 60 requests an hour per IP; 304s only free when authorised | P1 | From search results and a community thread; the official page could not be fetched from the build machine. |
| GitHub Events API is 30 s to 6 h late | P1 | From a GitHub docs page (an enterprise-server copy). Likely right; re-check on the current docs. |
| Claude Code hooks: event names, `async`, 1.5 s SessionEnd budget | P1, P3 | From the official hooks page. |
| OpenTelemetry in Claude Code always includes `user.email` when available | P1 | From the official monitoring page. Re-check before switching anything on. |
| ICU alarms: about 89% false, 52 an hour (UCSF study) | P2 | Peer-reviewed (PLOS ONE 2014), read via a summary. |
| BDA dyslexia style guide figures | P2 | Via summaries; the official BDA PDF was not reached. |
| 8H rule, text sizes per metre | P2 | Practitioner guides, not research. |
| ARKola (Gaver 1991) | P2 | Only the citation was found, not the full paper. |
| MAST's 14 failure modes; exact SRE chapter wording; PagerDuty severity table; DORA benchmarks | P3 | From summaries and secondary pages. |
| Google: about 16% of tests show some flakiness | P3 | Google Testing Blog, 2016. |
| Project Vend details; Claude Plays Pokemon write-ups | P4 | Search summaries and secondary sources. Read the originals before quoting. |
| EU AI Act Article 50 transparency duties from 2 Aug 2026 | P4 | From a guide and a law-firm note. Not legal advice. |
| MetaGPT licence (MIT) | P4 | From README mirrors; check the LICENSE file. |
| Kenney kit names and CC0 licence | P5 | kenney.nl answered 403 to the build machine; names must be checked on download. |

