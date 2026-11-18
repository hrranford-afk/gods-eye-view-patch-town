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
- 00:04 First-10 fixes done (17/17, shots 65-68 checked). Merged with sound as game/bc-build20 (BUILD 'build 20'). Full suite run in progress; deploy only if green, with build 19 backed up to base-camp/b19/.
- 00:53 Build 20 LIVE at base-camp/ (all 13 suites green; water 45/45 on rerun after one fail). Build 19 backup at base-camp/b19/, build 17 at b17/. Sound board: base-camp/?soundboard=1. Artifact updated.
- 01:16 Replay of build 20 done: 5/10 (build 19: 3/10). Night still dead 1:07-9:00; return dumps 5 things at once; clone names "Gertie 2". The sky panel only shows for robots/?tools (not a real bug).
- 01:16 Builder on game/bc-return (from build 20): night sprout, ask at ~3 min, surprise at ~6 min, gentle return (answer first, 4-line summary + More, one card at a time), fresh names instead of "2". Merge with game/bc-build21 before deploy.
- FOR HARRY (taste): a card shows "by CAIRN (placeholder)" where a resident's words belong, and kid-facing text shows "by The Dell …" credits. Credits kept per the standing rule; ask whether kids should see them smaller or hidden.
- 02:43 game/bc-return done (14 suites green, shots 69-72 checked). Polish note: return cards overlap the top-left panel's chip row. The moth surprise is small. Waiting for game/bc-build21, then merge as build 21.
- 04:48 game/bc-build21 done: room 38/38, ar-room 15/15, practice 14/14, totem 28/30. REAL WEAKNESS: with one saved room, a similar room can falsely lock after ~22 s and the autosave overwrites the saved map. Merged with bc-return as build 21 (9328417); full 24-suite run in progress (scratchpad b21.log).
- 04:48 Room guard builder on game/bc-roomguard: backup before overwrite, probation after lock, ask when the match is weak. Not deployed until checked (may land after the morning report).

- **~07:00 UK — build 21 LIVE.** All 25 test sets pass (multi-room 40/40, totem 30/30 on rerun). Practice test fixed: its fast-forward now clears banners (asks wait behind banners, which only clear frame by frame). Build 20 kept at `base-camp/b20/`. Artifact republished.

- **~09:26 UK — build 22 LIVE.** Room guard (2 map backups + Restore in More…, 60 s wait before saving after a lock, asks "New room?" when unsure with one saved room) and smaller credits (Harry's call: keep, smaller). All suites green (some on rerun under load). Build 21 kept at `base-camp/b21/`. Artifact republished.

- **11:32 UK — Harry: YES to location for Places** (14 Nov). Rules: grown-up switches it on; position asked at app start; each saved room keeps a ~100 m rounded spot ON THE IPAD ONLY; only rooms saved within ~300 m are tried; weather keeps the 10 km rounding; works without it. Local goods: region flavours, no town names in public code. Branch game/bc-places.

- **12:46 UK — build 23 LIVE (market day).** All suites green except battle timer + ar-room alignment, which also fail on build 22 under the current load (load avg 14, 2 builders) — timing flakes, not market. Build 22 kept at `base-camp/b22/`. Artifact republished.

- **13:55 UK — build 24 LIVE (market economy).** economy 41/41, market 38/38, all listed suites green (3 on rerun). noxr clean, diagclash AR ready. Build 23 kept at `base-camp/b23/`. Prices in ECON_TUNE, to retune from the town sandbox (economy-1). Places (25) folds into room fix (26).
- **19:02 UK — build 26 LIVE (room fix + Places + economy).** Branch game/bc-roomfix (economy merged in at c13eed7). roomfix 35/35, economy 41/41, market 38/38 (draw check now counts sale stacks apart; haggle regex knows economy lines), places 31/31, roomguard, multi-room, return, first10, fun, style, props, practice, auto-ar, room, away all green; ar-room passes on rerun (alignment flake, also before merge); totem U2/U3 small/rotated card flaky, fails the same on pre-merge 9d3f0fc. noxr clean, diagclash AR ready, live. Build 24 kept at `base-camp/b24/`. Live THIRD_PARTY.md refreshed. Artifact v24. Thresholds unproven until Harry walks between rooms. Next: marker lock on game/bc-marker (js-aruco2 vendored), then lift the AR engine out (Harry, 14 Nov: reuse for other games, lounge battle in games/LOUNGE_BATTLE_IDEAS.md, order look-1).
- **22:30 UK — build 27 LIVE (sticker room lock).** Branch game/bc-marker (build 26 merged + vendored js-aruco2 2.0.0, MIT; loaded in a hidden same-origin iframe because its global `var AR` clashes with the game's `const AR`). Printable `base-camp/stickers.html` (ids 1–6, 8 cm squares, 10 cm check line), linked from Menu. marker 29/29 on rerun (first run: the test's single-picture sampler caught 0 pictures; the averaged fix was right, 0.16 cm). Averaged sticker pose 0.14 cm / 0.16°; sticker relock 1.3–1.6 s vs 17–19.5 s surfaces-only. Builder: roomfix, multi-room, auto-ar, room, places, economy, first10, return green; roomguard, ar-room, totem, market green on rerun. noxr clean, diagclash AR ready, live. Build 26 kept at `base-camp/b26/`. Artifact v25. NOT PROVEN on device: HelloXR camera pictures in portrait (rotation guess `STK.rot`), framing, timing hook, printer scaling. Next: lift out the AR engine (15 Nov).

- 15 Nov 12:05 UK: Baguettes & Ballistics controllers + 2-player couch versus live on test link bnb-couch (gh-pages e6fc7b6, branch game/bb-couch 4fbda42). couch-test 49/49. Levels 1-2 only for 2 players; real pads untested. bnb-toy left as it was.
- **14:15 UK, 15 Nov — build 28 LIVE (room snapshots).** Branch game/bc-snap (299cd57). The room relocks after sleep with no sticker, using the room's own texture: about 3–5 s, under 1 cm (surfaces alone took 14–62 s). Continue and "Not sure?" use it too, and the other-room prompt can name the room it sees. Stickers are now optional. snapshot 29/29; marker, roomfix, roomguard, multi-room, auto-ar, totem, room, places, economy, market, first10 and return all green. ar-room fails on both builds 27 and 28 under the same load (run side by side; build 27 failed 3 checks, build 28 failed 2), so it is an old flake, not this build. noxr clean, diagclash AR ready. Build 27 kept at `base-camp/b27/`. Artifact v26. Not proven on a real iPad: real camera pictures, plain carpet, repeating patterns. Open question: after a sticker relock, shot 108 shows "The Perch has vanished" (change detection, not looked into yet).
- **14:35 UK, 15 Nov — Kitchen Run fixes LIVE** on `bnb-couch/` and `bnb-toy/` (bnb-toy now has the couch build too; one player is still the default). game/bb-couch 1bfec8d. The stuck sill and the white cube clouds were one bug: the whisk flight restarted every frame. A second stuck loop at the bread-bin jump is fixed too. Cars sit 0.00 to 0.05 above the road at every section (worst before: -3.19 on cereal ramp 1). couch-test 53/53, rerun by me. noxr clean on both. Artifact v35. Not checked: levels 4 and 5 courses, real iPad. Known: the ruler shortcut brushes car roofs at the start of the sponge route.
- **16 Nov, about 16:10 UK — first real-device win: the screen sticker works.** Harry showed `base-camp/screen-sticker.html` on a screen (sized with a bank card) and the camp locked to it in HelloXR on his iPad: "Looks like it's worked with that image thing." Also today: `base-camp/check.html` (one-page HelloXR check), `base-camp-next/` (build 29 preview; a tap regression is being fixed on game/bc-mac), orders scan-1 (video to 3D room) and report-1 (iPad reports to the Mini). Missed yesterday: the build 29 builder stopped at 16:27 when the machine restarted, unnoticed until today (late by a day); depth started 12:25 today on game/bc-depth.
- **16 Nov, about 17:50 UK — build 29 LIVE (Mac controls and dolls' house).** Branch game/bc-mac 9689818 (fix 82cf5cf: Cross and mouse taps pick the colonist even while the desktop camera glides; shift-drag on a colonist slides). house 43/43, fun 18/18 (rerun by me), practice 14/14, first10, return (rerun), room, multi-room, auto-ar, marker, roomfix (rerun), roomguard, places, economy, market and style all green. The snapshot test fails the same 5 checks on builds 28 and 29 when run side by side under load: an old flake, not this build. noxr clean, diagclash AR ready. Build 28 kept at `base-camp/b28/`. Artifact updated. check.html and screen-sticker.html carried over. Late by a day: the first builder stopped at 16:27 on 15 Nov when the machine restarted and was not noticed until 16 Nov.
- **16 Nov, about 20:30 UK — build 30 on the test link (`base-camp-next/`):** depth (things hide behind furniture), developer mode (`?dev=1`), and the sticker as the room's key (a sticker loads its room at once; an unowned sticker is adopted at once; empty rooms made by mistake are removed; Menu > Rooms and stickers). Root cause of build 30's roomfix regression: the depth worker ran on slow (software GL) devices and frame gaps looked like sleeps. Fixed with `depthSlow` (software GL, warm-up, hysteresis). roomfix 35/35 (builder twice, foreman once). stickerkey 20/20, marker, depth, house, multi-room, auto-ar, roomguard, first10 and return green; snapshot flaky as on 28/29. Main link stays on build 29 until Harry's iPad check. Also tonight: PatchTown Works v1 live at `works/`; the master plan from 5 planners (games/works/MASTER_PLAN.md, DECISIONS.md, IMAGE_PROMPTS.md); a watchdog check at 20:08 found everything healthy.

## 17 Nov evening: sticker binding fix on the test link (22:58 UK)
- base-camp-next now has build 30 at bc-depth ee4f6fb: a new sticker binds in about 2–3 s (was about 60 s). The finder counts real time, a sticker can be taken on trial during a quiet check, and a fresh scan's grid stays within 1.5 m of the iPad (cf918bf, the section 5 cause).
- The previous test build is kept at base-camp-b30a.
- Still open: a stickerkey section 0 race, where "Have you moved to another room?" comes up from the lounge floor seen through the doorway before the first sticker binds (about 5 in 17 runs at high load). Next fix: the room guard should ignore surfaces seen through a doorway while the iPad stands inside the room. See HANDOVER, "The sticker is the room's key".
- My own runs: 17/20 at 20:43 (before cf918bf), 20/20 at 22:52.

## 18 Nov 02:28 UK: doorway fix on the test link
- base-camp-next is now build 30 at bc-depth f48ddd4 (code f9aec24). While the iPad is inside the room's box, a big surface seen through a doorway is held without asking "Have you moved?". Walking out still asks.
- Fixer: stickerkey 8 of 8 at 20/20 under load up to 6; roomfix, roomguard, house, marker, snapshot and depth all green. Foreman's own runs: stickerkey 20/20, multi-room 40/40, return 16/16. Page checks clean.
- Previous test build kept at base-camp-b30b. A container restart at 00:50 stopped the fixer; it resumed with nothing lost.
- Next: Harry's iPad test of base-camp-next/?dev=1; then build 30 goes to the main link (back up build 29 as b29), merge bc-depth into room-kit, and room-kit step 2.

## 18 Nov: where things stand at 17:30 UK
- **Round Table Kingdom** (was Sofa siege; Harry's name) is the week's one goal. Plan: games/WEEK_PLAN_18NOV.md. Design: games/SOFA_SIEGE_DESIGN.md and games/sofa-siege/DESIGN.md (branch game/sofa-siege).
- Live test link: gh-pages sofa-siege/ (full match against a bot on a practice table; `?auto=both&report=1` for a robot match). Older versions kept at sofa-siege-b1 and -b2. Card checker: sofa-siege/cards.html.
- Branches: game/sofa-siege (game, models, tests, BOT_REPORT.md), game/sofa-cards (card recognition, RECOGNITION_REPORT.md), game/room-kit.
- Card result (made-up frames only): set 2 style printed at A5 is best (96% sharp camera, 75% low-detail), never names a wrong card. Set 1 confuses Hill and Capture Flag.
- Room kit: step 2 (recorder, dev mode) is on game/room-kit (head 266154f). The dolls' house is now a world for the fake AR camera (tests/house-world.js, tests/house-ar-test.js, 14/14 in 4 of 4 runs).
- Known gap, game unchanged: two rooms on one floor level joined by a doorway only ask "Have you moved?" once the iPad is about 2 m into the new room. Stickers and cards cover this for now.
- Known flaky under load: stickerkey section 4 (time only), return-test, snapshot section 4. See KIT_PLAN section 10.
- 12:00 to 17:10: all builders stopped on the account's 5-hour usage limit; nothing restarted them until Harry's next message. Lesson: run at most two builders, and schedule a check-in just after a known reset time.
- Orders written, not yet confirmed sent: siege-1 (ideas), siege-2 (two-engine playtest). ChatGPT packs received: concept pack 1, cards set 1, set 2, art pack 3 (textures, mouse sheets, set 2b).

## 18 Nov, 22:05 UK: end-of-day state
- Test link sofa-siege/ = game/sofa-siege 9171688: full match, 1 player against a bot or 2 players on one flat iPad, sound, painted textures in one atlas (166 draw calls), new mice, `SG.applyLayout` for the cards' locked layout. Tests: build 24, table 30, fight 48, layout 34. Older versions kept at sofa-siege-b1 to -b4.
- Cards: finished on game/sofa-cards 2e441ee. Verdict: print set 2b, black and white, at A5 (`cards/print.html?set=2b&size=a5`), check with `cards.html?set=2b&size=a5`. All numbers are from made-up frames. NOT TESTED on a real camera.
- Usage limit stopped the builders twice today (12:00 to 17:10 and 18:15 to 21:52). Check-ins are set for 23:30 and 03:00.
- Overnight: one builder on AR mode v0 (play on a real table in HelloXR), tested with the fake AR only.
- Nobody has played the game by hand yet. Harry's iPad test is the most valuable next step.
