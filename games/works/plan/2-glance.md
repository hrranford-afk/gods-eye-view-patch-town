# PatchTown Works: the glance plan

Planner 2 of 5. Lens: reading at a glance, and what it is like to watch.
Written 16 Nov 2026. Read-only review: nothing in the repo was changed.

---

## 0. The answer in 10 lines

1. **The town must answer one question in 5 seconds: "Is it fine, and does anything need me?"**
2. Today it cannot. The v1 page shows about 40 bits of text at once, all at similar weight.
3. The 3D town gets about 40% of a 16:9 screen. On a phone it gets about 15%.
4. Most text is too small for a projector. Label sub-lines are 1/95 of screen height. The minimum is 1/50.
5. Fix the order: one sentence (mood), then up to 4 lit places, then the rest only on zoom.
6. Code every state 3 ways: shape, a colour-blind-safe colour, and a word. Never colour alone.
7. Motion means "this is happening now". Nothing loops for ever. Alarms never flash.
8. Add sound that encodes state (a soundscape) and a town crier who speaks 3 items or fewer.
9. Four zoom levels (town, building, room, event) with a breadcrumb and one "home" command.
10. Three viewing modes: Wall (projector by day), Hearth (evening), Pocket (phone).

---

## 1. What I looked at

| Source | What it told me |
|---|---|
| `games/works/ATLAS.md` | The full map of meanings. The rule: measured or not shown. |
| `games/works/mockup.html` and the two mock-up screenshots | The first look: title plate, diary, NOW bar. |
| `games/works/index.html` (v1, 85 KB) and `games/works/shots/w1` to `w7` | What is live now: labels, stats, diary, timeline, tour, weather, lost property. |
| `games/works/LEDGER.md` and `ledger.jsonl` (90 lines) | What is actually measured, and its kinds. |
| The home town's wall sketch (artifact e2e17322) | "Wall mode" for the wall projector: 18 px body, 3 houses, one look. |
| `games/MEGA_REVIEW_16NOV.md` | Harry's priorities and the readability lesson from Bad North. |
| Harry's own reading rules (the "writing for Harry" skill) | Answer first, short lines, digits, lead with what failed, max 3 options. |

---

## 2. What the v1 page does well, and where it fails a glance

### Good, keep it

- **Atkinson Hyperlegible** is already the body font. It was made to tell similar letters apart (B/8, O/0, 1/I/l). [Braille Institute via Adobe; Google Fonts repo]
- **Finished work is meant to glow brightest.** That is the right idea. It follows the town's own verdict: "it shows talk better than finished work".
- **A real replay** with a scrubber and day arrows.
- **The lost property office** catches stalls. This is the most useful alarm in the town.
- **A day/evening switch** that picks itself from the clock.
- **Labels are buttons** with Enter and Space. Escape closes cards.
- **A test harness** (`tests/works-test.js`, 217 lines) that can measure the page. We can add glance tests to it.

### Fails, from the screenshots and the code

| # | Problem | Evidence | Why it hurts a glance |
|---|---|---|---|
| 1 | No single answer. | w1 shows 5 big numbers, a weather icon, 16 labels and 10 diary rows. All have similar weight. | Working memory holds about 4 chunks [Cowan 2001]. 40 things means no answer. |
| 2 | The biggest text is the title. | "PatchTown Works" is the largest thing on screen. | The one thing everyone already knows gets the most space. |
| 3 | The town is covered. | Plate about 33% wide x 45% tall. Diary about 25% x 90%. Timeline 10%. On phone, plate plus diary cover about 85%. | The town is the point. On the phone you can barely see it. |
| 4 | Text too small for a projector. | Root font at 1600 px wide is about 16.7 px. Label sub-lines 0.68 rem = about 11 px. Diary 0.9 rem = 15 px. On a 1080-line projector that is 1/95 and 1/72 of screen height. | The projection rule of thumb sets 1/50 of screen height as the bare minimum [8H rule]. Comfortable is nearer 1/30. |
| 5 | Labels overlap. | w1 and w7: "Harry's town", "Radeon", "Mini", "Mill", "Dell" stack on top of each other, unreadable. | Overlapping text is the worst case for a dyslexic reader. |
| 6 | Colour carries meaning alone. | Yard lamps: green pass, red fail, amber flaky. Label dots the same. Timeline ticks are colour only. | Red and green are the pair most colour-blind people confuse. Red/green vision also drops in the periphery [Attention, Perception & Psychophysics 2020]. |
| 7 | The alarm flashes for ever. | `alarmM.emissiveIntensity = 0.6 + 1.6 * abs(sin(secs * 4))`: about 2.5 pulses a second, until cleared. | Under the 3-flash limit, but it runs past 5 seconds with no stop [WCAG 2.2.2]. It is stress, not calm. |
| 8 | Everything moves all the time. | The camera auto-orbits after 4 s idle. Rain falls. Smoke rises. Walkers loop their route. | Labels slide while you read them. Motion stops meaning "something happened". |
| 9 | Reduced motion only slows things to 25%. | `sp = reduce ? 0.25 : 1`. Orbit, rain and pulses still run. | People who ask for less motion still get a moving page. |
| 10 | Sample data looks live. | `WALL` (machines, fox, white smoke, who is speaking) is a fixed sample "as of 16:35, 16 Nov". The 3D fox and smoke show it with no age mark. | Breaks the town's rule. A glance cannot tell old from new. |
| 11 | Activity outshines value. | Every label says "12 things today". | Counts of activity are talk. The town said itself that it over-shows talk. |
| 12 | Small capitals everywhere. | Eyebrows in uppercase, letter-spaced, monospace ("TODAY · LIVE"). | Capitals remove word shapes. Dyslexia guides advise sentence case [BDA style guide summaries]. |
| 13 | Branch names as labels. | "Workshop · bc-mac", "bb-couch", "test-new". | Codes must be decoded. Plain names are read in one look. |
| 14 | The tour is too fast and too long. | 8 s per stop, every building, cards of 6 to 12 lines. | 8 s is not enough to read a card. A dozen stops is about 100 s with no story. |
| 15 | Weather can say three things at once. | w1: clouds, a rainbow and white smoke at the same time. | Mixed signals read as "pretty", not as data. |
| 16 | Long sentences in the diary. | "Base Camp build 30: depth never loads on software GL or before its frames are timed (roomfix regression)…" | A 25-word line with brackets is a full stop for a tired, dyslexic reader. |

---

## 3. Who is watching, and how

Harry is dyslexic, has ADHD, works by voice, and is often tired. He watches in 3 situations.

| Situation | Distance and light | What he wants | What it means for design |
|---|---|---|---|
| **A. Evening, relaxing** (TV or projector, evening) | 3 to 5 m. Dark room. | To feel the town is alive. To hear if something needs him. Not to read. | Sound and the crier do the work. Few words. Slow camera. Warm, dark. |
| **B. By day, big projector across a room** | 4 to 8 m. Lit room, so the picture is washed out. | To check in between jobs, from across the room. | Huge type. High contrast. Still camera. One sentence, readable from the door. |
| **C. Phone** | 30 cm. Anywhere. One hand. | "Do I need to do anything?" Then maybe one detail. | Answer first. One card at a time. 3D is a picture, not the interface. |

**Voice is the common thread.** He can talk to it in all three. It can talk back in A and B, and in C with headphones.

---

## 4. The glance ladder: 5 seconds, 30 seconds, 5 minutes

Each level answers one question. Each level must work without the next.

### 5 seconds: "Is it fine, and does anything need me?"

Shown by 2 things only:

1. **The mood line.** One sentence, the biggest text on screen, written by rules from measured facts. It leads with what failed (Harry's rule).
   - "All calm. 3 things went live today. Nothing needs you."
   - "1 thing needs you: build 30 tests fail on depth."
   - "The Mac builder has been quiet since 16:27."
2. **The town hall bell.** Lit and blue when a decision waits on Harry. Dark when not. A number beside it.

You can get both from the door of the room without reading anything else.

Tests (measured, see section 17): show the page for 5 seconds, hide it, ask "Is anything wrong? Does it need you?" Pass if 9 of 10 answers are right.

### 30 seconds: "What changed since I last looked?"

Shown by:

1. **"Since you looked"**: up to 3 lines, newest problem first, then newest finished work. Each line 12 words or fewer.
2. **Up to 4 lit places in the town.** Only places whose state changed get a raised label. Everything else is quiet.
3. **The weather**, which is the tests, as in the atlas.

"Since you looked" uses the last visit time, kept in the browser (a per-viewer convenience). If there is none, it means "today".

### 5 minutes: "Why, where, and who?"

Shown by zooming in: building card, room, single event, replay. Details come only when asked for. This is Shneiderman's order: overview first, zoom and filter, then details on demand [Shneiderman 1996].

---

## 5. Information hierarchy

### 5 tiers

| Tier | What | How it shows | Max at once |
|---|---|---|---|
| 0. Mood | One sentence from the rules | Biggest text, top centre (Wall) or top (Pocket) | 1 |
| 1. Calls | Things that need Harry, and real stalls | Town hall bell, a place lamp out with a cross flag, crier speaks once | 3 |
| 2. Proof | Finished and checked work | Steady bright warm light. The brightest thing in the scene. | 4 lit labels |
| 3. Activity | Builders working, wagons out, tests running | Small slow motion: walkers, smoke, wheels. No labels in glance view. | 3 kinds of motion |
| 4. Ground | Districts, roads, river, bridge, the home town | Still. Muted. Never labelled in glance view except the 7 main places. | n/a |

Rule: **a lower tier can never be louder than a higher tier.** Louder means bigger, brighter, moving faster, or making sound.

### The attention budget

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

### Which 3 big numbers

Only numbers that are proof, not talk. Proposed:

1. **Went live today** (deploys and wins). This is finished work.
2. **Tests passing**, as "9 of 10 suites". Written with "of", not "9/10" (a slash is one more symbol to decode).
3. **Needs you**: count of open decisions plus stalls.

Dropped from the big row: "parcels posted", "workshops busy", "orders waiting". They move into the building cards. They are activity, not results.

---

## 6. The three key screens

### Screen 1: The Wall (projector by day, the town view)

```
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|        1 thing needs you: build 30 tests fail on depth.                       [bell] 1           |
|        ^ mood line, about 1/14 of screen height, centred-left                  needs you          |
|                                                                                                  |
|   Since you looked (2 h)                                                                         |
|   x  Build 30 tests fail: depth                         18:20                                    |
|   *  Build 29 went live: Mac controls                   17:10                                    |
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

### Screen 2: Zoomed into one building (the Inspection yard)

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

### Screen 3: The phone (Pocket)

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

### A 4th small sketch: replay

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

---

## 7. Type for each distance

### Sizing from screen height, not width

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

### Letters and lines

- **One font family.** Atkinson Hyperlegible for everything, including numbers and times. Drop JetBrains Mono for times. If a monospace is needed for tabular times, use Atkinson Hyperlegible Next's mono, which keeps the same letter shapes [Atkinson Hyperlegible Next].
- **Sentence case.** No uppercase eyebrows. No letter-spaced capitals.
- **No italics.** Bold for one thing per block (Harry's rule).
- **Left aligned**, never justified.
- **Line length** 45 characters or fewer on the Wall. 35 on the phone.
- **Line spacing** 1.5 for anything over 1 line [Dyslexia Scotland].
- **Slightly wider letter spacing** (about 0.02 em) on body text [BDA guide, as summarised].
- **Background**: dark text on off-white panels, or off-white text on near-black. Never pure white on pure black at full brightness in the evening (glare). Never text over the busy 3D scene without a solid plate.

### Words

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

---

## 8. Colour, shape and motion: one state vocabulary

### The 6 states

Colours come from the Okabe-Ito palette, made to stay distinct for the 3 main types of colour blindness [Okabe & Ito; Wong 2011]. The palette guidance itself says to pair colour with shape or labels [Okabe-Ito references]. So every state has a shape, a light behaviour and a word too.

| State | Colour (Okabe-Ito) | Shape | Light | Word |
|---|---|---|---|---|
| Done and checked | warm white light, with bluish green #009E73 trim | tick flag | **brightest**, steady | "went live" / "pass" |
| Working now | orange #E69F00 | figure walking, smoke | soft, slow | "working" |
| Failed or stopped | vermilion #D55E00 | cross flag, lamp dark | dark, no pulse | "fails" / "stopped" |
| Needs Harry | sky blue #56B4E9 | bell | steady, one gentle rise when it first appears | "needs you" |
| Not proven | grey #8E93AB | fog | dim | "not tried" |
| Old data | desaturated (sepia) | clock badge | none | "as of 16:35" |

Why this works in greyscale: done is the **brightest**, failed is **dark**, and the rest sit between. The order of brightness is the order of truth. This also keeps the town's rule: finished, checked work glows brightest.

Why not plain green and red: under the most common colour blindness, the current moss green (#7fd18b) and rose (#ff7a85) both drift towards beige. Done versus failed is the most important difference in the town, so it gets brightness and shape, not hue.

Keep machine colours for the home town (Mini blue, Dell green, Mill amber), but always with the machine's name next to them. They are identity colours, not state colours. Never reuse vermilion or sky blue as an identity colour.

Check: run every mode through Chrome DevTools' "Emulate vision deficiencies" (Rendering panel) for protanopia, deuteranopia, tritanopia and achromatopsia. Add a screenshot of each to `shots/`.

### Motion rules

Peripheral vision is good at slow motion, and weaker on red/green colour [McKee & Nakayama 1984; Anstis 2020; APP 2020]. So **motion is the strongest signal we have. Spend it carefully.**

1. **Motion means "real and happening now".** Nothing moves for decoration.
2. **Speed follows a real rate,** like the Dangling String, which twitched with each packet [Weiser & Brown 1995]. Mill wheel speed = jobs per hour. Number of walkers = builders active.
3. **One trip per event.** A walker walks once for each ledger line, then stays at the destination. Today a walker loops its route for the whole window, which shows one trip as many.
4. **No endless loops on alarms.** A new problem gets one slow "settle" (a lamp dims over 1.5 s, a cross flag drops in). Then it stays still and dark. Stillness plus darkness is easier to spot than a pulse that you learn to ignore.
5. **Nothing flashes.** No more than 1 brightness change a second, ever. Stays well under the 3-flash limit [WCAG 2.3.1].
6. **The camera is still in glance views.** Orbit only in the Tour and in Hearth drift, and never while a card is open.
7. **Reduced motion means stopped,** not slowed: no orbit, no rain particles (a grey sky instead), walkers jump to their destination, smoke is a still puff. Respect the system setting, and also give a button, because many people never find the system setting.
8. **A "Still" button** stops all motion in one press (WCAG 2.2.2 asks for pause, stop or hide on anything moving over 5 s).

### Weather precedence

Only one weather at a time, in this order: storm, then clouds, then sunshine. The rainbow is shown only when the sky is sunshine or clouds, and only for 20 minutes after the win. After that the star over the shop keeps the memory. This stops "storm plus rainbow" mixed messages.

---

## 9. Alarms that get attention without stress

### Why so careful

In one hospital study, about 89% of ICU monitor alarms were false, at about 52 alarms an hour [UCSF Alarm Study, PLOS ONE 2014]. People stop hearing them. The town will be just as ignored if it cries wolf. ADHD design guidance says the same thing: few interruptions, all deferrable, sound off by default [ADHD UX guidance; COGA].

### 3 levels only

| Level | When (measured triggers only) | What happens | Sound |
|---|---|---|---|
| **Note** | Any normal ledger line | Goes in the diary and the timeline. Nothing else. | none, or a soft one-shot in the soundscape |
| **Nudge** | A test suite fails. A deploy fails. A machine is idle while work waits (the fox). White smoke. | The place changes state (lamp dark, fox appears). Mentioned in the next crier bulletin. | one soft sound, once |
| **Call** | Lost property (a start with no end and no sign of life for 2 h). A usage limit hit (power cut). Disk under its floor. A decision waiting on Harry. A live build failing its tests. | Mood line changes. Town hall bell lights. Crier speaks once. Stays until "Got it". | 2-note bell, then the crier, once |

Rules for Calls:

- **Each Call says 3 things:** what, since when, and the one thing to do. "The Mac builder has been quiet since 16:27. Last step: build 29. Say 'pick it up' to send the foreman."
- **Never say "alert", "error" or "critical".** Use plain words.
- **Spoken once.** Repeated at most once every 30 minutes, and only if not acknowledged.
- **"Got it"** (voice, tap, key G, controller A) acknowledges. The place stays dark until the cause is fixed, but the sound stops.
- **"Later"** snoozes for 1 hour.
- **Quiet hours** (default 22:00 to 07:00): no sound at all. Calls wait for the morning bulletin.
- **Budget**: aim for 3 Calls a day or fewer. The page counts them and how many were acted on. If fewer than half lead to action, the trigger is too loose. That count is shown in the museum later.

---

## 10. Sound: a soundscape that encodes state

### The idea

Peep, a network monitor, replaced screens with natural sounds. Single events got a short sound. Ongoing states changed a background sound. Silence meant something had stopped [Gilfix & Couch, LISA 2000]. Gaver's ARKola work found sounds helped people keep track of a complex, running system [Gaver, Smith & O'Shea, CHI 1991]. The town is the perfect home for this. It already has hammers, bells, carts and weather.

### The map

| Measured thing | Sound | Kind |
|---|---|---|
| Builders active (count) | Distant workshop hammering. Density follows the count, capped at 4. | Bed (continuous) |
| No builder active | The hammering stops. Birdsong or crickets remain. | Silence as data |
| Home town machine busy | The mill wheel creaks. Speed follows jobs per hour. | Bed |
| Test suite passes | One small high bell | One-shot |
| Test suite fails | One low wooden knock (not a buzzer) | One-shot |
| Deploy or win | The shop door bell. A win adds a short cheer from the green. | One-shot |
| Order goes out | Cart wheels on the bridge, fading | One-shot |
| Result comes back | Hooves, then a parcel thump | One-shot |
| Storm (failing tests) | Soft rain. No thunder (thunder is a startle). | Bed |
| Call | 2-note town hall bell, then the crier | Once |
| Evening | Crickets under everything, very low | Bed |

Rules:

- **Different rhythm and pitch,** not just different timbre. Easier to tell apart with half an ear.
- **One-shots are rate limited:** 6 a minute at most. A burst of 20 test lines plays as one chord, not 20 bells.
- **Master volume** and 3 presets: Off, Soft, On. Default Off on the phone, Soft on Wall and Hearth (browsers need one tap to start sound anyway).
- **Captions for every sound.** A small line: "(bell: house tests passed)". Hearing people get a key; deaf viewers get the same data.
- **No sound loop longer than 2 minutes without variation.** Loops become noise.
- Sound files: free, licensed, listed in `THIRD_PARTY.md` (CC0 preferred). That is a licence check, not a taste call.

---

## 11. The town crier (the voice)

### What the crier says

- **Bulletins of 3 items or fewer.** Each 12 words or fewer.
- **Lead with what failed,** then what went live, then what started.
- **Digits** are read as numbers. Branch codes are never read aloud.
- Ends with "Nothing needs you" or "1 thing needs you".

Example evening bulletin (about 15 seconds):

> "Evening bulletin. 1 problem: build 30 tests fail on depth. 2 things went live. The Mac builder finished. Nothing else needs you."

### When the crier speaks

| Trigger | Wall (day) | Hearth (evening) | Pocket |
|---|---|---|---|
| Page opened ("since you looked") | yes | yes | only if sound is on |
| On the hour | off (taste question 4) | yes, if something changed | no |
| A Call | yes, once | yes, once (not in quiet hours) | a notification only if he opts in |
| Asked "what's new" | yes | yes | yes |
| Morning bulletin | first open after 07:00 | n/a | yes |

### The voice itself

- **Version 1:** the browser's built-in voices (speech synthesis). Free, offline on Mac and iOS, works now.
- **Later:** pre-recorded phrases from Kokoro on the Mini, as the mega review already proposes for creature voices. A fixed phrase book ("1 problem", "went live", "needs you") plus building names. Then the crier has a character and no cloud is used.
- **Always captioned.** The words appear at the bottom while spoken, word by word, at 1/22 of screen height. This also helps dyslexic reading: hear and see at once.
- A 2-note bell before each bulletin, so speech never starts cold.

---

## 12. Control: voice, keyboard, controller, touch

### Voice commands (small vocabulary, easy to say)

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

### Keyboard

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

### Game controller (sofa, evening)

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

### Touch (phone)

Tap to open. Swipe down to go back. Big buttons only (48 px). No pinch needed for anything important.

---

## 13. Zooming without getting lost

### 4 levels

| Level | You see | Labels say | Example |
|---|---|---|---|
| 1. Town | Whole town, still camera | Place name, 1 state word | "Yard: 1 fails" |
| 2. Building | One building close, its card | Now / Today / Proof | "9 of 10 pass" |
| 3. Room | Inside: the bench, the builder, the parcels | Each item, 3 words | "depth suite: fails" |
| 4. Event | One ledger line, full | The line, who, when, the proof link | "18:20 builder:depth: depth never loads…" |

This is semantic zoom: as you get closer, the words get more specific, not just bigger.

### Rules so nobody gets lost

1. **Breadcrumb always visible:** "Town > Yard > depth > 18:20". Each part is a button.
2. **One "Home"** in every view (key H, voice "home", controller B held).
3. **Camera moves take 1 to 1.5 s,** eased. Never faster (disorienting). Never slower (boring).
4. **The camera never rolls,** and the horizon stays level. North stays roughly up.
5. **A small corner map** when zoomed in, with a "you are here" dot.
6. **Back retraces** the exact path in. It does not jump somewhere new.
7. **The rest of the town dims** when a building is open, but stays visible behind it, so you still know where you are.
8. Reduced motion: camera **cuts** with a 200 ms fade instead of flying.

---

## 14. The Tour

The current tour visits every building for 8 s. Make it a short story instead.

### Rules

- **Only places that changed** since the last tour, or today if none. Quiet places are skipped.
- **Order by tier:** Calls first, then failures, then went live, then in progress, then the home town.
- **6 stops at most.** The last stop is always the whole town with the mood line.
- **Time per stop is set by its words:** glide 1.5 s, then the crier sentence (about 150 words a minute), then 4 s of quiet to look. About 10 to 14 s a stop. A full tour is about 60 to 90 s.
- **The card shows only "Now"** during a tour, so it can be read in the time.
- **Any input stops the tour** and leaves you where you are (not jumped back home).
- **Hearth version:** no cards, only captions, and the camera drifts slowly between stops.
- **Ambient loop (Wall, by choice):** the tour plays every 15 minutes, only if something changed. Otherwise the town stays still. A still town says "nothing new". That is data too.

---

## 15. Replay and the timeline

### Design

- **A day as a strip,** with hour marks. Events are ticks with **shapes**: * went live, x failed, ! Call, o started. Only these 4 shapes on the strip. Other kinds show as a thin grey density band.
- **Busy hours wide, quiet hours thin** (optional, taste question 6). Or a normal clock strip with a density band under it.
- **A "since you looked" mark** on the strip.
- **Replay looks different from live.** A sepia tint on the town, "REPLAY Sun 15 Nov 14:26" in the corner, and the Live button lit. You cannot mistake the past for now.
- **3 speeds:** a day in 1 minute (highlights: skips quiet stretches), 3 minutes, 10 minutes.
- **Next / previous event** jumps ([ and ], shoulders, "next").
- **Replay a single building:** only that building's events, camera stays on it.
- **Week view** later: 7 rows, one per day, same shapes. Good for "was this week calmer than last?"
- **Captions during replay:** each event's line appears at the bottom as it plays, at caption size.

### The rule about sample data

Anything not from the ledger or a live report (the `WALL` sample today) is shown with its "as of" time and sepia in **all** views. It is never shown as a live 3D object without its age.

---

## 16. Modes: Wall, Hearth, Pocket

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

---

## 17. Accessibility checklist

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

### Measured tests of the viewing experience itself

The town's rule applies to its own design. These can be measured:

1. **5-second test.** Show a frame 5 s. Ask: anything wrong? anything for you? Target 9 of 10 right.
2. **Time to answer "what needs me?"** by voice, from the sofa. Target under 10 s.
3. **Calls per day, and share acted on.** Target 3 or fewer, and over half acted on.
4. **Label overlaps:** 0.
5. **Smallest text:** at least 1/45 of screen height in Wall mode.
6. **Words on screen** in glance view: 45 or fewer.

---

## 18. What to cut (noise)

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
| The rainbow for 2 hours | 20 minutes, then the star keeps it. |
| Pulsing alarm lamp | Dark lamp plus cross flag, still. |
| Sample `WALL` data shown as live | Show its age, or hide it until `town-report.json` exists. |
| JetBrains Mono for times | One font family is easier. |
| Branch codes in labels | Plain names. |

---

## 19. Build order (fits the atlas v1 to v4)

| Step | What | Size |
|---|---|---|
| v1.1 (next) | Mood line. Wall type scale from height. Cut list above. Still camera. Label collision hiding. "As of" on sample data. Alarm stops pulsing. Reduced motion stops motion. | about 1 day |
| v1.2 | State vocabulary (shapes plus Okabe-Ito). "Since you looked". Pocket layout. Glance tests in the harness. | about 1 day |
| v2 | Calls with "Got it". Quiet hours. Crier v1 (browser voice, captions). Keyboard map. Breadcrumb and 4 zoom levels. Tour as a story. | 2 to 3 days |
| v3 | Soundscape. Controller. Replay sepia, speeds, single-building replay. Text twin. | 2 to 3 days |
| v4 | Kokoro crier from the Mini. Private voice commands. Week view. Hearth drift. | 3 to 4 days, needs the Mini |

---

## 20. Risks

1. **Over-quiet.** If the mood line says "All calm" while a builder is silently stuck, trust is gone. The mood rules must include "no sign of life" checks, not only failures. Lost property already does this. Extend it to the home town (no report for 30 min = grey, "not heard").
2. **Alarm creep.** Every new feature will want to be a Call. Hold the line at 3 levels and the daily budget. Count it.
3. **Sound annoys.** Even good soundscapes wear thin. Default Soft, easy Off, quiet hours, and loops that vary.
4. **The crier talks over the TV or a call.** Push "Quiet" to the front: one word, one key, one button.
5. **Voice privacy.** Browser speech recognition in Chrome sends audio to Google. Needs Harry's yes, and push-to-talk only.
6. **Mood text is written by rules, not judgement.** It will sometimes be clumsy. Keep the rules short and visible in the "What is this?" card, so it can be checked.
7. **The 3D gets in the way of reading.** On a washed-out projector the scene can blur. Plates under all text are not optional.
8. **Performance on the Wall.** A big projector at 4K with shadows and particles may stutter. Stutter reads as "something wrong". Cap the frame rate in Wall mode (30 fps is fine for a still camera).
9. **Spatial memory breaks** if buildings move as workshops come and go. Fix slots for workshops (say 6), fill left to right, never reshuffle.
10. **Stale data looks live** if the GitHub fetch fails quietly. The freshness strip must go grey loudly after 15 minutes.

---

## 21. Open questions for Harry (taste only)

Each has a default, so nothing waits. Max 3 options each.

1. **Crier voice.** (a) Warm older town crier (default). (b) Calm, neutral narrator. (c) A different voice per district.
2. **Evening look.** (a) Warm lamplight, deep blue night (default, close to today). (b) Darker, moonlit, fewer lights. (c) Cosy amber, like a fire.
3. **Times.** (a) "18:20" (default). (b) "6:20 pm". (c) "20 min ago".
4. **Crier on the hour by day.** (a) Off (default). (b) On, only if something changed.
5. **Sounds of the town.** (a) Village: hammers, bells, carts, birds (default). (b) Softer, more musical chimes. (c) Off unless asked.
6. **Timeline shape.** (a) A normal clock strip with a density band (default). (b) Busy hours wide, quiet hours thin.

---

## 22. Top 10 recommendations, ranked

1. **Add the mood line:** one sentence, biggest text, written by rules, leading with what failed.
2. **Size type from screen height on the Wall:** labels 1/30, nothing under 1/45. Today's sub-lines are 1/95.
3. **Free the town:** no title plate after 3 s, no always-open diary. "Since you looked" (3 lines) replaces it.
4. **One state vocabulary:** brightness plus shape plus Okabe-Ito colour plus a word. Done is brightest, failed is dark.
5. **Stop needless motion:** still camera in glance views. One trip per event. Reduced motion means stopped. A "Still" button.
6. **Replace the pulsing alarm** with 3 levels (Note, Nudge, Call). Calls are spoken once, need "Got it", and respect quiet hours.
7. **Mark data age everywhere:** "as of" and sepia for sample or old data. A freshness strip that turns grey after 15 minutes.
8. **The town crier with captions:** 3 items or fewer, 12 words each, on open, on Calls, and on "what's new".
9. **4 zoom levels with a breadcrumb and Home,** and the same Now / Today / Proof card everywhere.
10. **Measure the glance:** add tests for label overlaps, smallest text, words on screen and reduced motion. Run a 5-second test with Harry.

---

## 23. Sources

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
