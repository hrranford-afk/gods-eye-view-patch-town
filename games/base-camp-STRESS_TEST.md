# Base Camp stress test, for the PatchTown session on Harry's Mac (written 11 Nov 2026)

The game session (cloud) can only test Base Camp in Chromium with a fake iPad. The town has two things it lacks:
**Apple's own browser engine on the Mac**, and **many minds to read the code**. Please do both parts.

Code: branch `game/room-colony`, folder `games/base-camp/` (`index.html` is the whole game; `README.md`, `HANDOVER.md`
explain it; `tests/` holds the test scripts). Current build: **7b**.

Report back in `games/base-camp/STRESS_RESULTS.md` (push to `game/room-colony` if you can, otherwise one paste to
the game session, like the council answers). Keep every finding short: what, where (function or line), how to
reproduce, how bad (crash / wrong / annoying / cosmetic).

## Part A: run it on the Mac in Apple's engine (WebKit) — the most valuable part

Why: on Harry's iPad the game once died completely because Safari refused something Chrome allowed (a global
name clash with HelloXR's `lerp`). The cloud can't run WebKit; the Mac can.

1. Ask Harry before installing anything new (Playwright's WebKit browser is a download).
2. In `games/base-camp/tests/`, run each test (`auto-practice-test.js`, `auto-ar-test.js`, `scan-quality-test.js`,
   `multi-room-test.js`, `room-test.js`, `recog-test.js`) with Playwright **WebKit** as well as Chromium
   (`const { webkit } = require('playwright')` in place of `chromium`; drop the swiftshader args).
3. Also open `index.html` in real **Safari** on the Mac (Practice room): play 10 minutes, use every tool and menu,
   use "Come back later", reload, and note anything odd.
4. Record every difference between WebKit and Chromium: errors, layout, timing, anything that only breaks in one.

## Part B: the council reads the code (bug hunt)

The file is too big for the small residents in one go. Split it by function and give each seat a few functions,
with `HANDOVER.md` as background. Ask each:

> Here is part of a game's code. Find real bugs only: things that would crash, lose the player's colony, get stuck
> (for example: the colony can never get wood), or behave differently from what the comments say. For each, give the
> function, what goes wrong, and how to trigger it. Say "no bugs found" if you find none. Do not suggest style changes.

Priority areas (most risky first): saving and loading (`persist`, `safeWrite`, migration, `-bak` copies), the away
simulation for long absences (days, months), multi-room switching and room deletion, the resource economy (can a
colony get stuck with no wood, food, seeds or water?), requests (can they pile up or never clear?), relocalisation.

The Town Brain additionally: read `README.md` and `HANDOVER.md` and answer
> What will frustrate a real player in the first 10 minutes? List the five worst, most likely first.

## Part C: the honest count

As with the council: how many seats reviewed code, how many found real bugs, how many answers were empty or broken.
The game session will check every reported bug before fixing it (small models can report bugs that aren't there).
