# The Gift: make it physical (Job 5)

Owner playtest (25 Nov): the first level happened by itself; things should move around to show it; we need to work together to get to each point. This job makes the first day physical and co-operative. Software GL only was used to test it: there is no claim of speed on a real GPU, iPad or Radeon.

Rule kept throughout: every change on a counter or a message has a visible, physical cause in the world, and no gate advances on a timer alone. Clocks only add pressure (tide, dusk, weather).

## Switches
- `&game=gift` now runs the physical layer (physical.js) by default. **`&physical=0` restores the previous first day entirely** (the crate opening, the plank job, crates that appear, the instant build, and the old HUD behaviour except the clean HUD below).
- `&dev=1` keeps the page's test chrome and the old crowded HUD (every pilot and test button, the Skip-to list on top). Without it the HUD is clean (see "The HUD pass").
- `&boat=1` is turned on by the gift when the physical layer is on (the rowing boat is there from minute zero).
- `&rim=1` keeps the table's wooden rim above the horizon in portrait (it is hidden in portrait by default under the clean HUD).
- Everything else (`&stage=`, `&day=2`, `&giftsave=1`, `&device=`, `&glide=0`, `&names=0`, `&storm=0`) works as in GIFT_FIRST_DAY.md. A `&stage=` page skips the opening dock (the canned states have no opening); the physical layer still runs for deliveries, builds and heaps.
- The default page (no switches) is untouched: hash 8d962c0c, 88,790 triangles, no physical script (the page test checks it).

## The HUD pass (owner's iPad screenshot, done first)
Findings: a column of jetty-pilot test buttons covered the barometer, the repair pill, the Day strip, Sky and Home; the Day strip was clipped by the ledger; the hint line was wordy; the wooden rim showed above the horizon in portrait. What changed (gift pages without `&dev=1`):
- Hidden: Go to jetty, Turn plank (shown only while a plank is held, 52 px), Test surge, Big surge, Walk out, More planks, the title chip, weather chip, clock speed, Dusk, Sky, Home, Quality, Storm, the tide bar, the stats lines, the camp chip. They are behind a Menu button (Menu, then "Test controls").
- One owner per corner: top left a compact status cluster (Day, the stage, six dots, one line of time and weather); top right the Ledger, one contextual button (Notebook, Catalogue, Build menu or Sleep, whichever fits the moment) and Menu; bottom left stock and barrel (one pill; collapsible, collapsed by default on a phone); bottom centre one short hint; bottom right the boat's own buttons. The barometer is a thin pill that opens on a tap.
- Hints are one short imperative sentence of eight words or fewer ("Row to the glow.", "Tap the crate.", "Get dry.").
- A tiny overlay "Tap a plank, then a yellow slot" shows near the jetty until the first plank is fitted (legacy plank flow only).
- Portrait: a higher start pitch and the rim hidden (`xboat.rim(false)`, the page's own switch) so the brown band is gone. Landscape is unchanged.
- tests/hud-test.js checks 834x1062, 1194x834, 390x844 and 1280x720: no two visible controls overlap, at most 8 visible buttons and selects, everything on screen, touch targets 52 px under the ipad preset, the hint under 8 words, pilot buttons hidden, `&dev=1` still shows the old HUD.

## How to play it (the physical first day)
1. **You arrive by boat.** The tender that brought you comes in, stops well clear of your boat, waits and leaves (a picture; nothing waits on it). You have a little rowing boat in drive mode from the first second. The dock is half built: piles in, half the deck down, one or two robots at it with an amber light (stalled), and a heap of tools. A glowing ring marks the first floating item; the hint says "Row to the glow."
2. **Supplies float near the shore** (three planks, two rope). Row over one to load it (the boat takes four rowing; stick or tap-to-go as in GIFT_BOAT.md). Row to the beach landing and dock; the card has Unload. The heaps at the yard store grow, piece by piece. A robot walks each unit to the dock.
3. **The frame beam.** When the frame material is at the dock, a long beam lies at the plank heap. A robot walks to one end and waits. Hold the glowing end (press and keep your finger on it): the beam moves while you hold, at the robot's pace. Let go and it stops. At the mark it drops with a puff of dust.
4. **Decking and finish** are set by a held press on the glowing ring at the dock (a short hold with hammer ticks), once the robots have brought the material. The dock is then finished (its real planks all fitted) and the robots go back to their routine.
5. The day goes on as before: the crate at the beach (letter one), the ledger, the jobs, the first delivery (the tender stays at the landing until its crate is carried off; hold the crate to carry it up the beach, or press Carry it up), the catalogue, the robots and their orders, the evening letter crate (**too heavy for one: tap it, a robot comes to the far end, hold the glowing end and carry it up together**), one build that goes up in **stages**, the night and the bottle.
6. **Builds in stages.** Choose a build (the stock must be on the heap first). It is paid for, then: stakes and string (a held press by you), foundation, frame (the two-handed beam), walls, roof or finish (held presses). Robots walk each unit from its heap to the site and show the placing animation (the arm or lid, a plain green light). A readout shows the stage and person-hours (every unit placed adds 1.5, each held press 1, the beam 2). Nothing moves on while nobody acts; a robot never completes a gate alone.
7. **The marker.** A small pulsing ring over the one thing that needs you: the next floating item, the beach to unload at, a crate to carry or open, the beam, the site. It replaces the idle hint ring.
8. **Dusk.** The charging post lamp, the site lamp and the dock lamp glow at dusk; the lantern at the post waits for you to tap it (it goes out by day). Robots go home at night and in rain (the camp routine); the yard is busy by day, still at night.
9. Touch: every hands-on act is a press-and-hold or a tap with a button on the card (52 px under the ipad preset). Holds are for people with a free finger; every hold has a button alternative.

## Beat-by-beat: what has a physical cause now
| before | now |
|---|---|
| a crate appears at the beach | a tender comes in, stops at the landing, the crate rides on its deck, and is carried up the beach by a robot or by you; the tender stays until the last crate is off |
| the stock counter goes up | the counter follows the heaps; a robot walks each load in, a piece falls on to the heap; a unit leaves the heap when a robot lifts it |
| the build appears at once | stakes and string, foundation, frame, walls, roof, each shown on the structure as units are placed |
| the first robot starts from a button | (opening) two robots are already at the dock and wait, stalled, for the supplies you row in |
| one letter crate | the heavy letter crate needs a robot and you together |
| plank fitted by tapping a ghost slot | retired from the opening (the dock is built by supplies); the repair pilot code is untouched |

## What is placeholder
- Stage pieces are plain boxes (stakes, stones, posts, panels, roof slabs) in the colours of the old placeholder blocks; the PLACEHOLDER label is still how the unfinished models are named. The dock uses its real planks.
- The lantern, the beam, the tools heap, the floating supplies are our own simple shapes.
- Dust and hammer ticks are soft discs (one Points object); there is no hammer model and no sound.
- The tender is the existing unmanned tender mesh; the floating planks are a flat plank shape.

## Not done in this job (honest)
- Stock heaps beside the build site as well as the charging post: only the yard store exists (four heaps near the post).
- A track link carried by hand to a waiting robot: the old "Fit a part" button still starts a robot. The dock robots wait for supplies instead (the opening's "robot waits for the player" beat).
- BOLD option: nudging floating timber with the bow so it drifts in: **not built** (no push physics on the water).
- Delivery to the finished dock: the first delivery still lands at the tender beach.
- Robots leaving at dawn is visible on day 2 (the first day starts at first light and robots are only started later); dusk and return show at the end of the first day.
- Hand carrying of single stock units from the heap to the site (robots do the ferrying; the player does the stage presses and the two-handed carries).
- Opening the lid of crate 1 is animated; the lantern flame is a glowing disc.

## Tests
- `node tests/physical-test.js` (pure node): stage maths, heap maths, co-op carry rules, robot errand stepper, delivery run and berth choice, the day rhythm, the marker choice, gates that cannot advance on a timer (a long run of robots and clocks changes no stage), save round trip including mid-build and mid-carry (a unit in a robot's hand goes back on the heap), tone rails.
- `NODE_PATH=$(npm root -g) node tests/physical-page-test.js [only=1,2,3]` (software GL): zero console errors with `&game=gift`, `&physical=0`, each device preset and AR light; the default page unchanged; the whole opening by scripted steps; the rest of the first day to the night with a list of every player action it needed.
- `NODE_PATH=$(npm root -g) node tests/hud-test.js`: the HUD pass (overlaps, targets, hints).
- Pictures: `NODE_PATH=$(npm root -g) node tests/physical-render.js [only=0,0b,1,2,3,4,5,hud]` writes shots/phys-*.png.

## Owner test steps
iPad: open `islands_look.html?game=gift&device=ipad`. Check the corners (no test buttons, Menu top right). Tap the boat HUD if it is not already in drive mode, row to the glow, load, row to the beach landing, press Dock, Unload. Watch the robot walk a plank to the dock. When the beam appears, press and hold the glowing end. Press and hold the glowing ring to set the decking. Then do the day as before. Radeon desktop: the same with `&device=radeon&q=high`; look at the heaps and the dust. Use `&physical=0` to compare with the old day. `&dev=1` brings the old buttons back.

## Honest limits
- Software GL only. Numbers below are triangle and draw-call counts from software GL, not speed.
- The robot count follows the tier (low and AR show one or two). With one robot the opening dock is slow; the heavy crate and the beam call that robot away from collecting while it waits for you.
- Borrowing: a robot lent to an errand is not collecting. Pace reference (one load to the heap every 64 s, about 2.4 of 3 robots out) holds when nothing is being built or carried; while a build or a heavy carry is on, fewer robots collect (at most all but one are lent).
- The stalled robots at the dock use the camp routine's own status lamp and clips; they have no faces and no feelings.
- A scripted run uses test handles (hold, startAct, startCarry, addStock); a real run uses presses and the boat.

## CHANGELOG (this job; none touches a FIXED rule)
- **OWNER change (25 Nov, replaces the plank first win and the order-first start):** the day opens with an arrival by boat, a half-built dock, stalled robots, floating supplies, rowing, unloading, ferrying, a beam carried together and a held finish. `s.opening` and `s.dockDone` are new save flags; `stageOf` returns `dock` while the dock is not done (only when physical.js set `opening`). The plank job is marked done when the dock is finished. Off: `&physical=0`.
- **OWNER change (HUD pass, first):** clean HUD without `&dev=1`, see above.
- camp_start.js: a new robot state `task` (lent to the physical layer) with four small hooks (the sim case, the lamp, the work clip). The original routine never enters it; camp tests re-run.
- gift_day.js: hooks guarded by `PHYS()`; stock is still the one count (`s.stock`), the heaps follow it. New save block `s.phys` (sanitised by physical.js), `canned` states unchanged.
- Builds: committing a build now spends cash and credit and starts staking; the stock leaves the heap unit by unit as robots lift it. `s.build` is set when the structure is finished (so the night does not begin until it stands). Rule kept: the whole stock must be on the heap before a build can be chosen (no dead end).
- The Jetty is no longer an item in the build menu under the physical layer (the dock is the opening).
- **BOLD (kept, switchable):** the lantern the player lights at dusk (off with `&physical=0`); the pulsing marker replaces the idle hint ring (same switch); dust and hammer ticks.
- **BOLD (not built):** bow-nudging of floating timber.
- Dead ends found while playing the day (and the fix):
  1. A heavy crate took a robot at once and held it for ever, so a single robot never collected again. Fix: the partner robot is called only when you tap the crate.
  2. The first robot's sites gave glass when metal was ordered (a flooded site); a test waiting for metal never ended. Fix in the test only (it adds stock with the test handle, as a delivery would); the shore behaviour is unchanged.
  3. `dockInfo` was read before the repair jetty was built, so the dock was null. Fix: it is read lazily from `repair.site()`.
  4. Three.js is loaded after this file, so scratch objects made at load time failed with a null THREE. Fix: made at attach.
  5. A short step in the errand walker stopped 2.5 cm short of a leg (a gate that waited for an exact arrival). Fix: arrive within 1 micrometre.
  6. A hold that ends was also read as a tap on the thing under the finger (a card opened). Fix: the tap after a hold is swallowed for 0.45 s.
  7. (HUD) the left stack and the hint overlapped on a phone, and the hint overlapped the boat's Dock button. Fix: left stack sits above the hint row; on a narrow screen the hint is left-aligned and narrower.
