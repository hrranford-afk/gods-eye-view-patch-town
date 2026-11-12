# Base Camp (working title)

A tiny living colony that settles the **real surfaces of your room**. Press Play and look around: the colony lands by itself, then *help* the little people. They keep working while you are away, however long (the first day in detail, the rest day by day; a colony never expires), they love a tidy house, and they call you **the Giant**.

One file: `index.html` (three.js r128 from cdnjs). No build step. Needs `webxr-polyfill.js` and `THIRD_PARTY.md` next to it; the council's `almanac.json`, `rooms.json`, `creatures.json` and `clip-labels.json` are optional (built-in copies are used when they are missing).

## The flow (build 4: automatic)

Press **Play** (AR when the app offers it, else the practice room). That is the whole game loop; everything else happens by itself.

1. **Title.** One big button, *Play*, and a small *More...* menu (practice room, manual map, export / import; storage used by all rooms). With saved rooms a short list shows each one ("The Shed · 6 colonists · last visit 2 h ago · map 64%") with *Continue* (a shortcut: straight into that room), *Rename* (a text field) and *Delete* (two taps; nothing is kept), plus *+ New room*. Most players just press Play: with several rooms the game works out which one you are in by itself, silently (a tiny dot in the corner, no numbers), and if it truly cannot tell after about 45 s it asks once, small and non-blocking: "New room? [Yes] [It's the Shed]". If a colony is saved the title already says **"Welcome back - you were away 3 h 12 min"** with the first lines of the diary, before AR starts. It also tells you plainly if the browser blocks saving (and offers Export) or if a save is damaged (the backup copy is used automatically).
2. **Scanning never stops.** There is no scan phase and no *Done scanning*. Every flat thing the iPad sees becomes a zone while you look around; zones are shown lightly (a small "6 places found" at the top edge, tiny in-world labels for a few seconds or when you look at them, one short hint line that fades). The centre of the screen stays clear.
3. **The colony arrives by itself** on the largest clear area as soon as a decent surface (over 0.08 m2) exists, with a cheerful line. Not by type: by clear area (a desk-height surface wins a close call). More settlements come from the colony's own requests: a thriving colony asks for a cable car to the next zone and you tap **Yes** (drag-to-build is still there as an option).
4. **Recognition runs in the background** (COCO-SSD about every 2 s when camera frames exist). Sure detections become named spots with a role automatically ("That looks like a cup! ... water tower"); the same tag seen again on later visits grows surer, a contradicting detection makes the colony forget the tag and look again. A "What is this?" question appears at most once per 2 minutes, only for things next to the colony, dismissible, never blocking. Unknown spots get a default role by height and size. Smarter recognition (CLIP, ~55 MB) stays opt-in in the Menu.
5. **Things the game cannot classify become wonders.** A small isolated top high above everything (a chandelier) becomes a landmark with a provisional name ("the Great Glittering Thing") and a diary line. The kinds are a data table (`WONDERS`).
6. **Autosave.** The room map and the colony save every 10 s, a moment after every meaningful change, when the page is hidden and before AR ends. Every write keeps the previous good copy in a backup slot (`-bak`); loading falls back to it.
7. **It knows where it is.** Coming back, the saved room waits hidden while the fresh scan grows. The game registers the two automatically (surfaces are flat and gravity-aligned, so only yaw, an x/z shift and a height offset are unknown): height layers are paired, boundary points vote for the shift at every yaw (2 degree steps), the best peaks are refined (ICP) and checked, and when the match is clearly good, unique and stable for about 2 s the saved colony **snaps into place: "We're home!"**, the "while you were away" story plays (new buildings pop in, a hint points to the colony if it is off screen) and normal change detection continues on the matched map. If nothing matches after about 60 s of scanning it asks once: **"Is this a new room, or have things moved?"** (new room: a fresh map, the old one kept as a backup; moved: the older two-tap alignment).
8. **The map gets better every visit.** Each visit is merged into the saved map (never replaced): per cell it counts in how many visits the cell was seen, new areas are added, busy-spot learning accumulates, tag confirmations count. The Menu shows "Map 72% known, 5 visits".
9. **Field recorder.** Menu > *Report* builds one JSON report about what the game saw in your room (surfaces, recognition, homing attempts, speed, errors, unknown things, up to 6 small camera pictures of confusing moments). Download it or Copy it; the last 5 are listed. Nothing is ever uploaded by the game.

The manual tools are still in the menus: *More... > Manual: map my room* (scan, *Done scanning*, name spots, save), *Menu > Name spots*, *Line up by tapping two things*, *Scan again from scratch*, *Export / import*.

## Playing with them (build 8: the fun pass)
The colony is meant to be played with, not managed. Everything below credits the PatchTown council resident whose idea it was (code comments in the FUN section of `index.html`, and "by ..." in the game).

- **They have character.** Every colonist has a temperament from the council's creatures, and you can see it: Glip's static hair throws sparks, Grizzle has a moss beard, folds his arms and sheds moss flakes, Glimmerfluff has little wings and twirls, Gloop wears sock stripes and hoards a lint ball that grows, Fluffflur has a fluffy tail and does somersaults. They hop when they walk (squash and stretch), blink, and say two or three words in comic speech bubbles using the council's own lines ("Hmph. Adequate.", "Static's frizzing!", "Yum yum! Snack time!"). They cheer when they finish something. They are bigger than before (x1.25) so they read at arm's length in AR.
- **Poke** (tap a colonist): a squeak, a jump, a reaction in character (Glip panics and scurries, Grizzle and Gloop grumble, Glimmerfluff and Fluffflur giggle), its name tag, and the neighbours turn to stare. Poke three times quickly and they tell you.
- **Pick up** (touch and hold, or drag a colonist): it wriggles and complains in your hand; drop it anywhere on a colony (another settlement too) and it lands with a thud, grumbles and shrugs. Dropped where nobody lives, it plops back where it was.
- **Crumbs** (tap the ground in Look): a crumb falls, the nearest four rush over and have a tiny feast.
- **Music** (the music note in the toolbar): a tiny synth tune, they dance in a mosh pit and the huts bounce like drums (The Town Brain). It stops by itself after a minute.
- **Milestones**: we landed, first feast, first hut, the Giant built something, first harvest, first tree, Pip's river, first dance party, 5 and 10 colonists, first cable car ride, first night, first rainbow, first visit back, first festival, a week of visits. Each pops a small banner, confetti and fluff fireworks and a cheer, and goes into the **Colony album** (Menu) with the date. Nothing is listed before it happens; the album only says how many moments are left to find.
- **The council's moments**: a rainbow after the rain (The Town Brain); after more than three hours away, a polished pebble at the edge, "we kept your spot warm", the colonists huddled and their berry-lights dim for a moment (The Town Brain); a festival with stalls, bunting and a parade when the colony thrives or has a stage (The Dell Reasoner); Pip names a crack a river and builds a tiny bridge (The Dell Scholar).
- **New things to build** (Build menu, from scavenged wood and tin): berry lantern (2, from the start), reading nook (6, with 4 colonists or a hut; colonists go and read), festival stage (7, with 5 colonists; festivals happen there), Gertie's treehouse (8, once a tree has grown; two beds). Locked ones show a padlock and say what unlocks them.
- **Sound**: soft Web Audio sounds made on the spot (squeaks per creature voice, giggles, grumbles, thuds, hammering, nibbling, fanfare, fireworks, the music loop). Menu > Sound on / off is remembered.
- **Pace in the practice room** (tests/fun-test.js, sandbox Chromium): first celebration about 3 s after pressing Practice room (they land), the colony's first building about 25 s, the player can build a berry lantern straight away (placed at about 55 s in the scripted run, finished 9 s later with its own celebration), a poke answers in under a second, a crumb feast about 6 s after the crumb, Pip's river at about 90 s.

## Battle! (build 10: the council's battle)
Press **Battle!** on the title (or Menu > Battle! in a colony, practice or AR). Turn-based and artillery-style, **nobody dies**: a hit creature is dizzy, and the second hit pops it into fluff and *sends it home* to its tent. Every council idea is credited in the game ("idea by <seat>") and listed on the **Ideas by the council** panel in the battle menu.
- **Rivals (pick one).** The Lint-Lords (default, idea by The Town Brain), The Crumble Clan (The Dell Surveyor), The Snore Squad (The Radeon Coder), The Crumb Crusaders (The Dell Reasoner), The Grumble Tribe (The Dell Coder). Each has its own colour and a head prop, and the picker shows the council's own words about what they are made of, where they live and why they fight. Or play 2 players (pass the iPad).
- **A turn (30 s).** Pick a creature, hop it, choose a weapon, drag back from it and let go. Wind arrow, dotted arc, power and angle as before. The match has a hard limit of **30 turns** (The Town Brain): more creatures still out wins, a tie is a draw dance. Tents have 6 hearts, so a match runs roughly 8 to 14 turns.
- **Weapons.** Bottle Cap Bomber (clink, fluff, confetti; Dell Surveyor and Dell Coder), Elastic Band Cannon (bounces until it hits something, six bounces at most; Dell Reasoner), Tea Bag Rocket (soggy trail, the target sneezes and is pushed; Dell Reasoner), Paperclip Barrage (3 to 5 clips, tiny jazz band; Dell Reasoner), Sock-Sling (the target wears a Sock-Hat and its side's next shot wobbles; Town Brain), Tape-Toss (a Tape Bridge moves one friendly creature; Town Brain). The rival uses five of them.
- **The Hoover is earned** (Dell Reasoner): hits fill a dust meter (dizzy 20, home 25, a sock 15, a knock off an edge 25, a tent hit 8); when it is full, Call the Hoover sucks a line (the bag holds three).
- **The 'Oops' Bridge** (Town Brain): a miss that lands on a clear surface (not the floor) leaves a plank. Press the cross button on a later turn to move one creature there (once a turn).
- **The room matters.** Music (the note button) or a speaker zone makes airborne shots wobble (a shake icon shows; Dell Surveyor, Radeon Coder, Dell Reasoner). Rugs and soft things kill bounces (Town Brain). The floor is no-man's-land: no bridges, nothing sticks (Dell Coder, Radeon Coder).
- **Kind endings.** The winner gets the **Crown of the Crumb** (Town Brain) plus the colony reward; the loser gets the **Resilience Ribbon** and the Dell Surveyor's message; the winners rebuild the loser's tent (Town Brain) and everybody gets a confetti high-five. Knock-out lines from the tiny experts ("I am a frog!...", Musician; "Now, what's this?", Toymaker) are said sometimes.
- **Calm AR rules kept.** One compact HUD, nothing near HelloXR's Exit AR button.
- Test: `tests/battle-test.js` (about 8 minutes). Screenshots 27 to 35. How to add a weapon and how the AI works: HANDOVER.md > Build 9 and Build 10.

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

## Room totem photos
Each saved room can have a totem photo: the player's own picture of a spot in that room (say, a pencil case on the shed shelf). In the rooms list on the title, tap "Add totem photo" (camera or photo library on an iPad). The photo is scaled to at most 320 px and kept on the device only. Rooms with a photo show as big cards, and tapping the photo goes straight into that room, so only that room has to be recognised. In the room a small round thumbnail sits in the top-left info card. It is not image recognition, and the photo is never uploaded or included in map export. Deleting the room deletes its photo.

## Files

| File | |
|---|---|
| `index.html` | the whole game |
| `almanac.json`, `rooms.json`, `creatures.json` | PatchTown council data (colonists, requests, events / spots and roles / creatures); optional |
| `clip-labels.json` | CLIP text embeddings for the label list, made by `tests/make-clip-labels.mjs`; optional (needed only for smarter recognition) |
| `webxr-polyfill.js`, `THIRD_PARTY.md` | unmodified WebXRKit polyfill for the iPad fix, and licences |
| `HANDOVER.md` | developer notes: data formats, maths, tests, what is cut |
| `shots/` | screenshots |
| `tests/` | Playwright scripts: `auto-practice-test.js` (automatic flow in the practice room), `auto-ar-test.js` + `ar-fake.js` (automatic flow with the real polyfill and a fake shed: first play, three returns, a different room, field report), `room-test.js` (manual tools, practice room), `recog-test.js`, `ar-room-test.js` (the build-3 manual AR test, kept as an example), `ar-harness.js` and `practice-test.js` (first prototype), `lib.js`, `make-clip-labels.mjs` |

Build tag: shown at the start of the status line under the title buttons ("build 9 ...").
