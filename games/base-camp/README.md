# Base Camp (working title)

A tiny living colony that settles the **real surfaces of your room**. Map your room once, name the speaker, the cup and the warm box, tap a surface to found a colony, then *help* the little people. They keep working while you are away (up to 24 hours), they love a tidy house, and they call you **the Giant**.

One file: `index.html` (three.js r128 from cdnjs). No build step. Needs `webxr-polyfill.js` and `THIRD_PARTY.md` next to it; the council's `almanac.json`, `rooms.json`, `creatures.json` and `clip-labels.json` are optional (built-in copies are used when they are missing).

## The flow

1. **Start** (title): *Map my room*, *Start in AR*, *Practice room*, *Continue my colony*, *Room map: export / import*.
2. **Scan.** Sweep the iPad slowly over every surface (floor, desk, shelves, the tops of speakers and boxes). Each flat surface becomes a **zone**; small tops (a can, a cup) become **clutter**. *Done scanning*.
3. **Name spots** (always in *Map my room*, any time from the Menu). Tap a thing: Speaker, Cup / mug, Can, Computer, Warm box, Shelf, Ledge, Monitor top, Drawers / cabinet top, Floor, Door / window, Radiator, Sofa, Rug, Plant, Worktop, Other, or type your own name ("Radeon", "kettle"). Each tag has a **role** from the council's `rooms.json`:

   | Tag | Role (what the colonists build) | How they get there |
   |---|---|---|
   | Speaker | Broadcast tower (shakes when *Music* is on, morale) | zip-line made of dental floss |
   | Cup / mug | Water tower (fresh water) | rope ladder |
   | Can | Tin silo (room for tin and food) | rope ladder |
   | Computer | Town square (happy gatherings) | cable car |
   | Warm box / Radiator | Forge and winter refuge (makes tin; warm in the cold) | hot-air balloon made from a tea bag |
   | Shelf | Storehouse | cable car |
   | Ledge / Monitor top | Lookout | thread-and-paperclip pulley / zip-line |
   | Drawers, Sofa | Workshop (builds 30% faster) | rope ladder / tunnel |
   | Floor | Farmland (one more farm, ripens faster) | rope ladder |
   | Door / window | Solar farm (growth, fruit) | thread-and-paperclip pulley |
   | Rug | Hideout and nursery (more settlers) | catapult (bent fork tine) |
   | Worktop / desk | Trading post (spare food for seeds and wood) | catapult |

   *Mark a cable*: tap both ends of a real cable and the colonists get a **ready-made zip line** between the two spots (it opens when the first colony has four settlers). Every spot card shows the council's words and **by <resident>**. *Save room map* keeps the map **separately from the colony** (versioned; *Export / import* copies it as JSON).
4. **Settle.** *Found a colony* (or just tap a coloured zone). Three settlers arrive with a tent; spots on the zone become landmarks (tower, well, forge...).
5. **Nurture.** Seeds, water, build blueprints, cheer, requests ("We need water!"), cable cars to thriving neighbours, weather, day and night: as before.
6. **Away.** Close the app. The colony lives on the **saved map** for up to 24 hours (coarse steps, under a second). Roles matter: the forge makes tin, the tower plays music, the market trades, a thriving colony sends a party over a zip line to found a new colony.
7. **Come back.** *Continue my colony*:
   1. **While you were away**: a diary card (5 to 10 short lines, with the spot roles, creature quotes and the council's funny things, each credited *by <resident>*).
   2. **Scan again** (the real room may have moved a little).
   3. **Line up**: the game picks the two tagged spots that are furthest apart and asks *"Tap the Radeon"*, *"Tap the speaker"*. That solves turn and shift. Slide / turn buttons stay as fine tuning. *Scan more first* and *Same place (skip)* are there too.
   4. **What changed**: the new scan is compared with the map (below).

## Things move: change, drama, not failure

- **SAME**: nothing to say. **MOVED**: *"Did the cup move here?"* Yes: the little town (and the colonists on it) move with it. No: it counts as gone plus new. **GONE**: the colonists flee to a neighbour and ask for help ("Refugees!"). **NEW**: an expedition request ("New land: Shelf 2! May we send an expedition?"). Things that are only partly scanned this time are *not* flagged: absence of a scan is not absence of a thing.

## Tidiness: the Giant is the weather

Per zone the map holds a **land grid** (2 cm cells): *clear land* (colonists build and walk), *clutter* (shown as grey towers and walls), and how often each cell has been **disturbed**.

- **Tidying is a gift.** Take a can away and there is *"New land! The Shelf is clear!"*, a burst of resources and settlers moving in. **Recycling**: a can gives 3 tin (huts get *flattened-can roofs*, tin counts double for building), a box gives planks, a big thing more.
- **Squashing.** Put something down on a building and it is flattened: *"Grizzle's workshop got squashed by a GIANT CUP!"*, rubble, a panic line from the creature, then they rebuild elsewhere.
- **Learning.** Cells you keep using get a disturbance count. At 2 the colonists stop building there (*"Don't build by the kettle, the Giant uses it every morning"*). Cells left alone for several visits become their **richest land** (trees and farms grow 30% faster). Cluttered land is cramped (slower arrivals) but the colonies still work: small tough colonies on what is clear.
- **The Giant**: colonists only ever *react* in their diary lines and requests, they never nag.

## Practice room (no AR needed)

Virtual floor, desk, shelf, sill and a speaker, plus **movable things**: three cans on the shelf, a cup and a GPU box on the desk, a box on the floor. **Map my room**, **Auto-scan**, name things, found colonies, then:
- **Skip 8 hours**: the away sim, with the diary card.
- **Move things**: drag cans, cup, boxes between visits (even onto a colony), then **Scan again**: new land, tin, squashing, learning.
- Reload and **Continue**: away diary, scan, line up, changes.

## Recognition: "they know what a lot of stuff is"

While mapping, the camera picture is looked at about every 1.5 s (AR needs the `camera-access` feature; practice has built-in eyes that know a cup, half-know a can and have never heard of a speaker):
- **COCO-SSD** (TensorFlow.js, about 5 MB of weights, loaded when mapping starts) finds cups, bottles, laptops, sofas, plants... The class table `COCO_ROLES` is one data object. A detection's bottom-centre becomes a ray onto the scanned surfaces, which says where the thing is.
- **Smarter recognition (downloads ~55 MB)** (Menu): CLIP's vision model, on demand, classifies the crop around a tapped thing against label embeddings computed at build time (`clip-labels.json`), so speakers, a GPU box and cans get a guess too.
- Sure: *"I think this is a cup! Right?"* Yes / No / Something else. Unsure or unknown: *"What is this?"* with the tag picker, and a *What are these? (N)* button that asks about the things nobody named.
- Every answer goes into **Our library** (Menu): icon, name, role and **who taught it**. The library overrides guesses from then on and travels with the room map.
- **Camera pictures never leave the device.** Only model files are downloaded.

## The real world drives it

- **Light**, **time of day** and **weather** (optional, asked once; rounded location, Open-Meteo, non-commercial only): as in the first prototype (see HANDOVER).

## Files

| File | |
|---|---|
| `index.html` | the whole game |
| `almanac.json`, `rooms.json`, `creatures.json` | PatchTown council data (colonists, requests, events / spots and roles / creatures); optional |
| `clip-labels.json` | CLIP text embeddings for the label list, made by `tests/make-clip-labels.mjs`; optional (needed only for smarter recognition) |
| `webxr-polyfill.js`, `THIRD_PARTY.md` | unmodified WebXRKit polyfill for the iPad fix, and licences |
| `HANDOVER.md` | developer notes: data formats, maths, tests, what is cut |
| `shots/` | screenshots |
| `tests/` | Playwright scripts: `room-test.js` (practice room, about a minute), `ar-room-test.js` (real polyfill, about 6 minutes), `recog-test.js`, `ar-harness.js` and `practice-test.js` (first prototype), `lib.js` (server), `make-clip-labels.mjs` (build step) |

Build tag: shown at the start of the status line under the title buttons ("build 2 ...").
