# Base Camp: shop edition

A spin-off of Base Camp (build 18 + the Christmas decorations) made for a Christmas advert in a jeweller's shop. It is the same single-file three.js r128 game, copied into this folder, with everything new behind one flag (`const SHOP = true;` in `index.html`) so the pieces can be ported back to `games/base-camp/` later. `games/base-camp/` itself is untouched.

**The shop is never named.** It is "the jeweller's". There is no shop name, no logo, no brand and no maker's marks anywhere. The glowing plaque in the finale is blank until the shop sends artwork (`SH.plaque.userData.face` is the slot).

## What it is

- **A practice jeweller's shop** (no AR needed): wooden counters, a glass display case (glassy; creatures never stand on its top, because real AR cannot stand on glass), wall shelves, a window display with a wreath, a till, a rug, fairy lights and a big Christmas tree. Toon shading and ink, as in the main game.
- **A counter scene** on the main counter (or on the real counter in AR): a velvet runner, a candy-cane cable car, a tree, a blank glowing plaque, a giant gold ring on a velvet tray, a mirror gem, a necklace between two stands, gift boxes, a gift basket, a small shelf.
- **Five creatures** who arrive by cable car and then work: they decorate (tree, star, paper chain, stocking, from the season decorations in `models/decor.js`), polish the ring (rubbing, sparkles), wrap a gift (ribbon and bow tie themselves), hang the necklace bead by bead, and gaze at their own face in the gem.
- **The proposal**: one creature takes the giant ring, is nervous (friends give a push), kneels and holds the ring up. A heart pops, the other gasps, nods and jumps for joy, confetti falls and everyone cheers.
- **Director mode** (the "Film it" button): a scripted, seeded, 30 second take. Cable car arrival, fast decorating, polish / wrap / hang / gaze, the proposal, then a finale with sparkles round the blank glowing plaque. All UI hides; a small 3, 2, 1 shows first.
- **Find the creatures** (kiosk game): five creatures hide (behind a gift box, inside the ring, on the shelf, behind the tree, behind the gem). Tap to find them; a small celebration plays at 5 of 5; it resets after 60 s idle. It saves nothing.

## How to play it

Open `index.html` over http(s) (the GLB mouse of the main game needs it; the shop does not). On the title screen:

- **The jeweller's shop**: the practice shop. Drag to orbit, scroll to zoom, "View" switches between the counter and the whole shop. Buttons: Film it, Proposal, Find them, View, Exit.
- **Shop in AR** (only enabled when the browser has WebXR, i.e. the HelloXR app on the iPad): point at the real counter, tap, and the scene lands there. "Move" picks it up again; "Size" cycles 100 / 70 / 115 percent.

## How to film it (iPad screen recording)

1. Put the iPad on a tripod or lean it against something, so it looks at the counter. The scene needs about 80 cm by 35 cm of counter (use "Size" for less).
2. Start AR with **Shop in AR**, move slowly until the ring shows, tap the counter. The crew arrive by cable car and begin to work. (Or use the practice shop on the iPad: the camera moves by itself during a take there.)
3. Start the iPad's screen recording (Control Centre), then tap **Film it**.
4. Take your finger off the screen. The buttons disappear and a small 3, 2, 1 counts down. Then 30 seconds of the same story every time (the director is seeded: same positions at the same second, take after take). Do not touch the screen: **holding a finger down for two seconds cancels the take**; Esc does the same on a keyboard.
5. After 30.0 s the buttons come back. Stop the recording, trim the countdown off the front if you like (it is about 3 seconds).
6. In AR the camera is the iPad: walk it slowly (a gentle arc from left to right and in towards the proposal at about 20 s is what the practice shop's camera does). In the practice shop the take has its own camera path, so you can record the screen without moving anything.

Sound is on (small synth chimes, a fanfare and cheers). Mute by turning the iPad's volume down.

## What is mocked

- **The plaque artwork**: blank on purpose (a glowing slab). `models/shop-props.js` `plaque()` gives `userData.face` (a plane); put a texture on it when the shop provides one.
- **The shop room** is invented: a generic jeweller's with a Christmas look. It is not a copy of any real shop.
- **The AR test** uses the repo's fake native iOS side (`tests/ar-fake.js` with the real polyfill); a real iPad has not been tried yet (see rough edges).
- **Sounds** are the main game's synth sounds; there is no music.
- **Find the creatures** keeps its progress only in memory: reload and it starts again. The 60 s idle limit is `SH.find.idleLimit`.

## What would port back to the main game

The pieces are separate on purpose:

- `models/shop-props.js` (`BC_SHOP_MK`): ring, mirror gem, gift boxes, velvet tray, necklace, candy-cane poles and gondola, plaque, shelf, crate, confetti, the life-size room. Load it like `decor.js`. Only the ring, gem, gifts, tray and necklace are shop-specific; the confetti, cable gondola and gift boxes would suit the main game's seasons too.
- In `index.html` (one section, "SHOP EDITION"): the fixed-step story engine (`shopStep`, tasks, `shopPose`, a poses table that also works for colony creatures), the director (`shopDirScript` is plain data: events at absolute seconds), the find game, the AR "tap the counter" placement (`shopArFrame`, `shopPlaceAr`) which the main game could use for a "put the colony here" mode.
- The hooks into the old code are a handful of one-liners marked `SHOP`: the frame loop, `persist`, `tapAt`, the pointer and wheel handlers, `arStart` / `arEnded`, the title buttons and `models/shop-props.js`.
- The new jobs (polish, wrap, hang, gaze) fit the main game's `chooseJob` / `roleStep` pattern: a creature walks to a spot, plays a pose for N seconds, something on the spot changes. They are written as task lists (`SHJ`), so they can become colony jobs with small changes.

## Files

- `index.html`: the game (copy of build 18 + decor) plus the shop section.
- `models/shop-props.js`: the jewellery props and the practice shop.
- `models/props.js`, `models/decor.js`, `models/cc0/`, `assets/`: copied unchanged from `games/base-camp`.
- `tests/shop-test.cjs`: the test (below). `tests/ar-fake.js`: copied from the main game's tests.
- `shots/`: `s1-shop.png` (the practice shop, landscape), `s2-polish.png` (landscape), `s3-proposal.png`, `s4-finale.png` and `s5-find.png` (all three in iPad portrait, 820 x 1180), `ar-placed.png` (the AR scene placed on the fake counter, no camera picture in the fake).

## Test

```
NODE_PATH=$(npm root -g) node games/base-camp-shop/tests/shop-test.cjs
```

(`ONLY=props,jobs,proposal,director,find,shots,ar` runs part of it; about 6 minutes in full with software GL.) It checks: the practice shop loads; every prop builds (shared geometry and material, cheap, no text, no NaN); the four jobs; the proposal; the director take (3, 2, 1 first; 30 +- 2 s; UI hidden; the same positions every second in three takes; nobody on the glass top); find-the-creatures (counts 1 to 5, celebrates, resets after the idle limit); nothing is saved (zero storage writes); the same take in AR on the tapped counter; 0 page errors. Safari check: `node noxr.js file://.../index.html` must print `errors: none`.

## Rough edges

- Not tried on a real iPad. Frame rate in AR with five creatures (about 270 draw calls with the practice room, about 150 without) is probably fine on an iPad; check.
- In AR the counter must be a horizontal plane the iPad has found. If it jumps, tap "Move" and place it again.
- The creatures' rig is small (legs and arms are stubs), so "kneel" reads as a squat with the ring held up; the ring above the head and the heart carry the moment.
- The cable car passes through the tree's glow and the cable is a thin dark line; the two cabins cross near the landing and can touch for a moment.
- The director camera was framed for a landscape iPad and widened for portrait; the very first frames of a portrait take show the cable pole cropped.
- The practice shop's life-size room is built from boxes: no text, no windows to look out of except the painted street.
- Free play (not the director) picks jobs with a seeded random stream, so a session is not the same each time; only the director is repeatable.
