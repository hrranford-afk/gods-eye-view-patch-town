# Start here: carrying on the games with another AI (e.g. ChatGPT)

Repo: https://github.com/hrranford-afk/gods-eye-view-patch-town

Everything is on GitHub. Each piece of work lives on its own **branch**.

## Where everything is

| What | Branch | State |
|---|---|---|
| **Baguettes & Ballistics, the playable game** | `game/micro-precinct` | Finished and playable. 6 levels, finale, gumball, loadout card, 16-bit talk boxes. |
| Kitchen Run (new obstacle-course race) | `game/kitchen-run` | Nearly done. Last commit is "WIP". Needs testing before merging. |
| Toy graphics (tilt-shift, lighting, new car models) | `game/toy-graphics` | About half done. Last commit is "WIP". |
| Cairn (new calm mountain game) | `game/cairn` | Early draft only, not playable. See the Cairn section below. |
| God's Eye View planner | `planner/worcester-access` | Separate project. See `src/planner/AGENTS.md`. |

## Baguettes & Ballistics: how to work on it

- The whole game is ONE file: `games/baguettes-and-ballistics/index.html` (about 6,800 lines, three.js r128, no other assets). Open it in a browser to play.
- Read these first, in this order:
  1. `games/baguettes-and-ballistics/HANDOVER.md`: how the code works, every system, where to change things.
  2. `games/baguettes-and-ballistics/DESIGN.md`: the game design and ideas still to build.
  3. `games/baguettes-and-ballistics/README.md`: short overview.
- The file is large. When asking an AI for help, give it HANDOVER.md plus only the part of index.html you are changing (search for the function name HANDOVER.md mentions).
- House rules that kept it stable:
  - Never run an auto-formatter (like prettier) on the file: it rewrites every line and breaks merges.
  - Reuse shapes with `shared()` and free removed models with `disposeTree()`, or iPads run out of memory.
  - After a change, play every level for a minute and check the browser console for errors.
  - The gumball machine uses game cereal only, never real money.

## Finishing the paused work

- **Kitchen Run** (`game/kitchen-run`): screenshots `shots/42` to `47` show it. Next: test the course on all six levels, then merge into `game/micro-precinct`. The talk boxes on `game/micro-precinct` hook into `start()` with `talkThen(curLevel, 'pre', lrIntro)`; keep that line when merging.
- **Toy graphics** (`game/toy-graphics`): done so far: tilt-shift, warm lighting, tone mapping, rounded toy vehicles, GFX on/off flags. Still to do: surface patterns (wood, steel, worktop, glass hob), effects (tyre dust, explosions, splashes, glowing rings), speed checks on every level, then merge.

## Cairn (the paused new game)

Folder: `games/cairn/` on `game/cairn`. Only a draft `index.html` and a mock picture exist.

**The idea:** you are a mountain guide. Lost travellers wander up a misty mountain at dusk. You cannot control them; you can only stack stones into cairns to mark the way.

**Rules:**
- Tap to place a stone; stones stack (1 stone seen from close, 3 seen from far). Tap a cairn to take a stone back. Limited stones (+1 per arrival).
- Travellers see only a short way in fog, walk uphill with some randomness, and head for any cairn they can see, then the next.
- Cliffs and crevasses: walk in and the traveller fades into the mist (gentle, no gore).
- Travellers who reach the hut become **guides**: gold lanterns; later travellers follow them; guides build their own small cairns (gold-tinted top stone).
- Weather: snow or gusts knock stones off or bury small cairns, with a gentle warning first.
- The goal moment: travellers arrive for a whole minute without you placing anything, and the game says "The mountain guides itself now."

**Look:** from above at dusk. Slate grey, snow white, pale blue shadows, warm orange glow from the hut at the top. Several drifting mist layers; only part of the slope is clear at a time. Travellers are tiny walkers with soft yellow lanterns (in fog you only see the glow). Cairns are little grey stone stacks; 3-stone towers glint; snow dusts them white.

**Sound:** soft wind, crunching footsteps, a gentle chime on arrival. No pushy music.

**Tech:** one HTML file, works on iPad by touch, no downloaded assets.

## Newer games and files (added 11 Nov 2026)

| What | Where |
|---|---|
| **Base Camp** (AR colony on your real room's surfaces) | branch `game/room-colony`, folder `games/base-camp/` (README.md, HANDOVER.md) |
| Base Camp picture prompts (90s cartoon look) | `games/base-camp-STYLE_PROMPTS.md` on `game/micro-precinct` |
| Base Camp council data (almanac, rooms, creatures) | `games/base-camp/*.json` on `game/micro-precinct` and `game/room-colony` |
| **Night Meet** (realistic night drift and car meet) | branch `game/night-meet`, folder `games/night-meet/` |
| Captain Crumb's Big Adventure (story outline) | `games/captain-crumb/STORY.md` on `game/micro-precinct` |
| Council questions, round 1 and round 2 | `games/COUNCIL_QUESTIONS.md`, `games/COUNCIL_ROUND2_BASE_CAMP.md` on `game/micro-precinct` |
| Baguettes & Ballistics (now with toy boxes, Drift, My Track, AR) | branch `game/micro-precinct`, folder `games/baguettes-and-ballistics/` |

Contributing pictures: make them from the prompt files, and add them to a `games/<game>/refs/` folder (or send them to Claude
in chat). They are style targets: the games draw everything in code.

## Harry's rule for pastes (12 Nov 2026)
Whatever Harry has to copy, give it as ONE copy-and-paste block per destination: everything for the town chat goes
in a single block, never split across several boxes.
