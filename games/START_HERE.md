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

## Parked for later (Harry, 12 Nov 2026)
- **The arcade ("Toy Cupboard"):** a 3D front page where every game is a toy box on a shelf, with a looping preview
  and "N playing now" counts (counted, never tracked; a server needs Harry's yes). Later: other makers' games, itch.io,
  then Poki and CrazyGames. AR on iPhone and iPad needs a native app one day. Harry: "let's work on that format later".

- **Screenshots: send them ONE AT A TIME** (Harry, 13 Nov: "One AT A TIME PLZ"), one file per card, numbered ("1 of 7"), with a
  one-line caption each. Never bundle several pictures into one card.

## Daily milestones (from 14 Nov 2026; Harry agreed the idea on 13 Nov)
- **The rhythm:** one goal per day that Harry can see.
  - Morning: read the town's overnight results and set the day's goal.
  - Day: builders work, and each piece goes live as it passes.
  - By 17:00: a link, a picture, and an honest check against the goal (hit, partly or missed).
  - Before Harry stops: send the town tonight's orders.
- **Start each day in a fresh session,** from this file, HANDOVER.md and `base-camp-ROADMAP.html`. A fresh session is cheaper per message and has a sharper memory.
- The list of days is in `base-camp-ROADMAP.html` (the "Daily milestones" section).

## Where Base Camp stands at the end of 13 Nov (for the next session, Saturday 14 Nov)
**Live:**
- Base Camp build 17 (the mouse, plus the Safari fix) at `base-camp/`.
- Places prototype at `base-camp/places/`.
- B&B graphics test at `bnb-toy/`.
- Vigil 3D test at `vigil-3d/`.

**Branches to combine for Friday's milestone** ("pipes, fixes and Christmas live together"):
1. `game/room-colony`: build 18 waterworks. **Resolved 13 Nov, 17:50:** the three "regressions" were test timing on a
   loaded machine, not game bugs. Build 17 behaves the same, and the game code is unchanged. The tests now wait on game
   time (475e8da, e1d1ca8, deae6da). The style budget was raised from 1.15 to 1.20 for the deliberate new content (toy sink
   and toilet, loo huts). To cut draw calls later, merge the sink and toilet boxes.
2. `game/bc-merge20`: build 18 plus decor.js, merged and tested (8208b3b, d74fd3d). Merge room-colony's fixes into it.
3. `game/bc-fixes19`: the build 19 fixes (67a7052). Merge it last.
   - Check: shot 58 shows two "Pip" chips in one camp, and the request card is not in the picture.
   - Re-check the portrait card on an 820×1180 screen yourself.
4. Then run every suite one at a time, plus `noxr.js` and `diagclash2.js`.
5. Deploy `index.html` plus `models/props.js`, `models/decor.js` and `assets/` to gh-pages `base-camp/`. The Artifact
   cannot hold the .glb, so publish without it.

**Fixed:** water-test's "a piped farm" flake (deae6da). Still flaky under load: fun's "pick up, carry and drop".

**Waiting on Harry:**
- paste the town orders (webkit-1, seasons-1, art-b2, waterworks-1, experts-1, measure-1);
- yes or no to the GitHub tools;
- the Remote Control bridge (security call);
- taste calls: totems as real things or stickers; whether Places feels right; B&B's new look; Vigil 3D's look;
  one family look or separate looks;
- the jewellery-shop "shop mode" (money: favour or paid).

**The town lost the Mini from 12:25 on 13 Nov.**

## Overnight 13–14 Nov: Harry asked CAIRN to run Base Camp on its own for 12 hours (about 20:20 to 08:30 UK)
Harry: "You happy to run autonomously and manage Basecamp for the next 12 hours? It'll be interesting to see what you
bring to the game."

**The plan, in order:**
1. **Build 19 release** (builder on `game/bc-build19`): merge waterworks + decor + the build 19 fixes, fix the duplicate
   "Pip" names properly, run every suite, then CAIRN checks it and deploys.
   - **Before deploying,** keep build 17 reachable at `base-camp/b17/` as a fallback.
2. **Shop edition: DONE 20:44.** Live at `base-camp-shop/`. CAIRN checked shots s1 and s3, and it starts with no errors on the live link.
3. **Sound pass** (after build 19 is live; game sounds made in-house with WebAudio, no download): every action gets a sound
   (ploop, squeak, tink, footsteps, fanfare).
4. **If time and budget allow:** the first 10 minutes as a story (the Scout lands, unrolls his map, finds the first spot).
5. **Morning report about 08:00 UK:** one message with links, numbered pictures sent one at a time, and an honest hit or
   miss for each item.

**Limits overnight** (Harry's standing rules):
- no downloads or installs;
- no money;
- no deleting;
- nothing sent to the shop or to anyone else;
- nothing personal;
- no new repositories;
- no changes to the town.
- At most 2 builders at a time, so the machine stays fast and tests stay honest.

**Wake-ups:** `send_later` every 2 hours; builder reports also wake the session.

### Overnight log (UTC = UK time in November)
- 21:55 Build 19 checked (card shot, unique chips, Safari + iPad checks pass) and LIVE at base-camp/. Build 17 backup at base-camp/b17/ (checked live). Artifact YHt8… updated (v18, no .glb).
- 22:05 Sound pass builder started on game/bc-sound (from build 19). Synth only, sound board at ?soundboard=1. Not deployed until checked.
- 22:05 First-10-minutes play-through started; it writes games/base-camp-first10/ on this branch. Design proposal only.
- Known test failers carried into build 19: room, totem, ar-room, practice (older suites). Four suites (ceiling, fun, battle, multi-room) failed under load and passed on rerun.
- 22:40 First-10 play-through done (games/base-camp-first10/, shots checked). At night a new player sees a dark room, a tiny tent and three popups at once; nobody asks for anything in 10 min.
- 22:45 Fix builder started on game/bc-first10 (from build 19): campfire instead of bedtime in the first session, camera to camp, seed request at ~40 s, one popup at a time, a question at minute 9. Must merge with game/bc-sound before deploy (sound builder doesn't touch these areas).
- 22:57 Sound pass done on game/bc-sound (all 9 suites pass, Safari + iPad checks pass, sound board shot checked, no // comments). Waiting for first-10 fixes, then merge both and deploy.
