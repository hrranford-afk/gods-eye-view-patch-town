# The Gift: the storm and the haul (the whirlpool), Job 3

Switch: `islands_look.html?game=gift` (on by default there), `&storm=1` to test, `&storm=0` to keep it out. Files: `storm.js` (one classic script, pure core plus page layer), hooks in `gift_day.js` (a handle, like the boat layer's), three one-line hooks in `islands_look.html`. Tests: `tests/storm-test.js` (pure node), `tests/storm-page-test.js` (software GL), pictures from `tests/storm-render.js`. The default page is untouched: hash `8d962c0c`, 88,790 triangles (a test checks it).

Tone rails kept: hopeful; wreckage and cargo only; no bodies; nothing gory or cruel; no people shown; robots stay relics. Nothing is swallowed, nothing breaks, nothing is lost that you took.

## 1 What the player sees (the story moment)

1. **A storm you can see coming.** On the morning of day 2 (after the first night, when the bottle has been read) the glass starts to drop. Over about two and a half real minutes the weather mood goes overcast, then rain, then storm (the existing weather and mood system, `weather.js`). A small **barometer** pill appears top left: hPa, a falling line, a plain trend word, and one calm sentence. **Gulls go quiet** (they leave the sky and come back after). **Robots head home** and shelter by the existing rain rule. If the boat is out, a toast says to bring it in and tie up (a warning only: no damage).
2. **The tidal swirl and the surge.** About eight seconds into the storm a slowly turning **tidal eddy** (foam arms and darker water, a flat disc, 40 triangles) grows off the shore the surge reaches first; the camera eases over to show it. Thirty seconds in, a **surge** raises the water gently to the highest mark (1.3 m on the page's scale, an ordinary spring tide tops out near 1.1) over 16 seconds, holds 6, and lets it go down over 28. Nothing is drawn in; it is an eddy and a race, not a drain.
3. **The haul.** The wreckage arrives with the water (each piece shows when the surge front reaches it, floats while the water is over it, and settles as it falls). When the water has gone a **drift of wreckage and cargo** lies along the wrack line on the exposed shores, in drifts against rocks, trees and jetty posts, partly buried, at random yaw and tilt. **One big hulk** (a half-buried old boat, a labelled placeholder) lies on the sheltered stretch near the camp.
4. **Letter nine, the Great Wash**, in a crate on the next morning's boat (07:00 the day after the water goes down). A calm paper panel, our own words: *The sea has kept things for a long time. Last night it let go. It is a great deal. You do not have to keep it all, and you do not have to decide today. Sort a little each morning. What you cannot use, pass on.*

When: the first storm is day 2 once the first night has passed, or `&storm=1` at once. After that once per game season (90 days, at a seeded day, never within ten days of the last): rare.

## 2 The haul as a core loop piece

* **Heaps.** 24 heaps per storm (`NHEAP`), each a **kind** (timber and planks, barrels and tins, rope and net, bottles) and a **count** of units (3 to 9; about 130 in all). Heaps are counted, not tracked; the same seed gives the same heaps on every tier (the card does not change the game).
* **By hand (quicker).** Tap a heap: a 1.3 s hands-on pick adds up to 3 units to the stock pill by kind. A robot trip carries 2 and takes a minute or more.
* **By robot.** The existing collection orders do it. When a robot has an order for planks, rope, glass or metal, the haul heaps of that kind (up to two nearest, reachable by a dry straight line from the yard) become its shore work sites, and the ordinary shore litter of that kind is parked while the haul lasts. A trip takes 2 units from the heap and adds them to the stock by the heap's own kind.
* **The tide takes back the rest, softly.** Nothing is lost for 10 game hours after the water goes. Then over about two game days (each heap on its own seeded clock, 30 to 62 hours to empty) the loose heaps thin and the scenery drifts away. Two warnings: at 18 hours ("the tide is starting to take the loose things back") and 36 hours. What you gathered is yours for good; the hulk does not wash away.
* **The hulk.** Tap it: a card. A few boards a visit (+3 planks, 30 bundles in all). A long project by design.
* **Save.** `state.storm` in the gift save: storm number, phase, how far the storm ran, when the water went, units taken per heap, the hulk's bundles left, the letter state, the warning stage. The heaps themselves are remade from the seed.

## 3 Switches

| Switch | Meaning |
|---|---|
| `&game=gift` | the storm layer loads and runs on its natural trigger |
| `&storm=1` | start a storm at once, a 45 s build-up (test pace) |
| `&storm=0` | the layer is not loaded at all |
| `&stormsec=N` | seconds of build-up (8 to 600; default 150, or 45 with `storm=1`) |
| `&stormfast=K` | run the storm clock K times faster (tests; the game loop caps a frame at 0.25 s, so on slow software GL a storm lasts longer than its seconds) |
| `&sseed=N` | another mess for the same island |
| `&debris=N` | show N debris pieces at once as a stress scene (100 to 100000, cut to the tier cap); no storm needed; the Storm panel opens |
| `&stormpanel=1` | open the Storm panel (also the **Storm** button in the top bar) |
| `&benchsec=N` | seconds per bench step (default 6) |
| Skip to... > The storm (now) | start the storm from the gift's own menu |

Tier counts (caps; `&debris` is cut to them): **iPad (low) 400, desktop 3000, Radeon 20000 (default 6000), AR 150.** iPad and AR draw nine light kinds with simpler shapes (9 batches, no shadows from the debris); desktop and Radeon draw twenty kinds.

## 4 The stress test (the debris bench)

The **Storm** panel has a **Debris bench** button. It first shows a warning: *it pushes the graphics card harder and harder until frames get slow; it stops by itself when a frame takes over 100 ms five times in a row and never runs longer than two minutes; save your work and close other apps and browser tabs first; on the Radeon close everything else; on an iPad plug it in.* Only **Start the bench** runs it; **Cancel** does not; **Stop the bench** ends it. Steps: 400, 1000, 2000, 3000, 5000, 8000, 12000, 16000, 20000, up to the tier cap, 6 s each (1.5 s warm-up). Each step reports pieces, draw calls, triangles (all passes), average, 95th percentile and max frame ms, and fps; the report names the highest count that holds 60 and 30 fps, why the bench ended (finished, the knee, the two-minute limit), the GPU the page sees, and, when that is software rendering, says in plain words that the numbers say nothing about a real card. A copyable report fills the panel. **Software GL numbers in this repo are never real GPU speed.**

## 5 What is placeholder

* **The hulk** is a ribbed half hull built from boxes and strips (574 triangles); there is no old-boat model in the kit that fits. Labelled in its card.
* **Debris shapes** are our own low-poly pieces with baked-look vertex colours (no textures); bottles are drawn about twice life size so a heap reads from above.
* **The swirl** is a flat shader disc on the water, not a flow simulation; the water around it does not move to match.
* **Gulls** are hidden while the storm is on (not given a fly-away path). **Surge** is the page water level raised; waves are still the weather state's.
* **Numbers** (counts per heap, timing, decay) are guesses, tagged TUNING in the code.

## 6 Owner test steps

**Anyone (desktop, any browser):** open `islands_look.html?game=gift&storm=1` (or from the Skip menu choose The storm (now)). Watch the barometer fall and the weather darken for under a minute, the camera swing to the swirl, the water rise and go, and the haul appear. Tap a heap (it fills the stock pill). Give a robot an order (tap it, Gather planks): wait, and its trips pull from the haul. Tap the hulk.

**iPad:** `...?game=gift&device=ipad&storm=1`. It should stay near 150k triangles and 160 draw calls with the haul on (400 pieces, 9 batches, about 20 to 30 thousand triangles; the page test prints the measured figure). Check taps on heaps are easy (52 px targets). `&device=ar` for the AR light version (150 pieces).

**Radeon:** `...?game=gift&device=radeon&stepdown=0&debris=6000&stormpanel=1`. Look first at 6000 and 20000 by the slider. To find the knee press **Debris bench**, read the warning, **save your work and close every other app and tab**, press Start. It stops by itself. Press **Copy report** and send it. If the picture stutters badly press **Stop the bench**.

## 7 Honest limits

* Everything measured here is software GL on a shared CPU: it proves the code runs and the counts are right, not how fast a card is. No real-GPU claim is made.
* The haul is drawn straight onto the page's terrain by height lookup at 0.8 m steps: pieces can float or sink a few centimetres on bumpy ground (they are partly buried so it rarely shows).
* The wrack line follows the page's highest-mark rule per island; very flat islets get thin drifts.
* The robots walk a straight line to a heap (a dry-ground check along it); there is no path around trees or water, so a few heaps are skipped.
* The tide "taking back" is a count and a fade, not a visible wash (no animated retreat of individual pieces).
* At 1 frame per second (software) the game loop caps time per frame at 0.25 s, so storm seconds run slow there. Real hardware runs it in real time.
* Real-time frame budget of 20000 pieces on the Radeon is unmeasured: that is what the bench is for.

## 8 CHANGELOG (BOLD marks are additions the owner can veto)

| Change | Why (one line) | Replaced | FIXED rule touched |
|---|---|---|---|
| Storm is a real-time state machine (seconds) triggered by a game-hour condition, not driven by the game hour | A storm that follows a clock held at 0.07 or 3.0 speed would be too slow or too fast to see | a clock-driven build | none |
| Heaps are 24 per storm, tier independent; pieces per heap vary by tier | Gameplay must not depend on the card; the owner asked for counts per tier for drawing only | pieces as the unit | none |
| Seaweed, ribs, hull fragments, cogs and pipes are scenery only, not gatherable | The stock pill has four kinds; no fifth to explain | gatherable everything | none |
| Crates count as planks (timber), barrels and tins as metal, bottles as glass | Maps cargo onto the existing four stock kinds | new kinds | none |
| **While haul heaps of a kind exist, ordinary shore litter of that kind is parked for the robots** | Otherwise robots keep walking to the old piles and the haul feels ignored | robots choose either | none |
| **Hand pick 1.3 s for up to 3 units (a robot trip is 2 units)** | Hands-on is quicker, as the brief says | none | none |
| **The hulk is stripped by hand only, a few boards a visit** | A long-term project; robots keep to loose heaps | none | none |
| **A barometer pill with a line, a trend word and one calm sentence** | The brief asked for a falling barometer line in the HUD | none | none |
| **The first storm is day 2 morning; later ones once a season** | After the first night as asked, then rare | none | none |
| **Letter nine comes at 07:00 the morning after the water goes, in the gift's own crate, and is kept in the save** | Matches the brief; reuses the crate and paper panel | none | none (own words) |
| **A Storm panel and a top-bar Storm button, hidden unless `&debris` or `&stormpanel=1` or pressed** | The bench and slider need somewhere to live | none | none |
| **Skip-to menu gets "The storm (now)"** | Testing and demonstration | none | none |

## 9 Pictures (software GL, 2400 wide, honest captions)

* `shots/storm-1.png` the storm building: the barometer pill (1001 hPa, falling fast, "the robots are heading home"), yard and tents. FLAW: the sky and sea had not finished blending to the rain state when it was taken (software GL runs about 1 frame a second, so the 3.5 s blend takes minutes), so it looks calm and bright; the tiny barometer line is flat because the history had only just begun.
* `shots/storm-2.png` the swirl with the surge up: foam and a dark disc off the shore, boards and a barrel floating in the raised water. FLAW: the swirl disc reads as a dark patch with foam edges, not clearly as spiral arms from this height; it sits close to the rocks.
* `shots/storm-3.png` the haul on the shore after the water has gone: planks, crates, barrels, net heaps, seaweed on the beach by the camp. FLAW: a drift sits very close to the tents (the tent keep-clear circles were added after this picture).
* `shots/storm-4.png` a close drift pile against a rock: planks, crates, orange floats, the bottles and weed.  FLAW: close-up shows flat shading and hard polygon edges; seaweed is crude.
* `shots/storm-5.png` the hulk: taken in an early smoke run at 1200 px wide, the half-buried boat is at the upper right of the haul. FLAW: the 2400 px retakes missed it (the gift camera easing overrode the camera target in my script), and this picture is smaller and from before the surge slowed down.
* `shots/storm-6.png` robots gathering: a tracked robot works beside a plank drift next to the camp. FLAW: the framing is crowded by a tent; the robot is small at the top centre.

## 10 Test results

* `tests/storm-test.js`: all pass (pure node).
* `tests/storm-page-test.js` (software GL): sections 1 to 8 pass across runs (the default page is 8d962c0c and 88,790 triangles; full storm with 0 console errors; hand pick; robot gather; save and reload; letter nine; hulk; iPad 400 pieces, 9 batches, 93k triangles in all; AR 150 pieces, 9k haul triangles; desktop 3000, 20 batches, 246k haul triangles; Radeon 20000, 1.6M haul triangles per pass; the bench stops by itself at the knee).
* `gift-day-page-test.js quick=1` 108 of 108, `gift-day-test.js` 115 of 115, `boat-drive-test.js` 89 of 89, `camp-test.js` pass.
