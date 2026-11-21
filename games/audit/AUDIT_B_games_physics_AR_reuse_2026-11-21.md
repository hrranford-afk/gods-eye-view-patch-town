# Audit B: games, physics, AR, reusable code (read-only, 21 Nov 2026)

Method: files read in worktrees under `.worktrees/` (paths below are relative to that folder), `curl` status checks on the live site, `git log`. No test was run (all recorded results are cited from the repo docs). Classes: VERIFIED / AVAILABLE BUT UNTESTED / MISSING / UNKNOWN.

Corrections to the brief, found while auditing:
- **bb-couch is NOT a vite project.** `bb-couch/games/baguettes-and-ballistics/index.html` is one 11,307-line file, no build. The `vite.config.js` at the repo root belongs to the God's Eye View planner app, not to any game.
- **Real-iPad HelloXR records DO exist, but for Base Camp, not for Round Table Kingdom or Brick Lab** (section 4).
- **Harry's 21 Nov Brick Lab iPad run (hash 9f08783c, castle 383 bodies, about 22 fps) is not written anywhere in the repo.** `BRICKLAB.md` still says "Nothing here has run on an iPad". The only trace is a code comment, `brick-lab/games/brick-lab/tests/build-compare.js:4`: "Harry's iPad physics was about twice as slow as this cloud core". That is recorded as UNKNOWN/caller-supplied below.
- KIT_PLAN says Vigil is three 0.147; `vigil-3d/games/vigil-3d/index.html:172` actually loads r128. KIT_PLAN is stale on this point.

---
## 1. Game engines in use

| Capability | Class | Evidence | Notes |
|---|---|---|---|
| three.js r128 as global `THREE`, loaded from cdnjs, in every game | VERIFIED | `sofa-siege/games/sofa-siege/index.html:108`; `bb-couch/.../index.html`; `vigil-3d/games/vigil-3d/index.html:172`; `room-kit/games/base-camp/THIRD_PARTY.md`; pages root copies | Sofa-siege, B&B, Base Camp, Vigil, Works, Brick Lab all r128. |
| Why r128 is pinned | UNKNOWN (partly inferable) | No doc states a reason. Docs say "no build step, plain script tags, global THREE" (`room-kit/games/room-kit/KIT_PLAN.md` s1; `works/MASTER_PLAN.md:3803` "pinned CDN version"). Base Camp loads r128 `examples/js/loaders/GLTFLoader.js` (non-module build only exists up to r147), and the kit bans top-level names HelloXR/gl-matrix define | Inferred reasons: classic-script style, last r1xx with `examples/js` loaders, and the iPad/HelloXR polyfill is tested against it. `AR_NOTES.md:47` lists "r128 `renderer.xr.setSession` in HelloXR" as untested for Round Table Kingdom. Moving version = retest all AR. |
| Brick Lab ships its own r128 copy | VERIFIED | `brick-lab/games/brick-lab/vendor/three/three.min.js` (MIT header present) | Others rely on the CDN; no offline copy elsewhere. |
| No build step (single HTML + plain scripts) | VERIFIED | Sofa-siege: `index.html` + `models.js` + `game.js`; B&B one file; Base Camp one `index.html` (8,970 lines in room-kit); Brick Lab ES module page but no bundler | Rule in `START_HERE.md`: never run prettier (long lines deliberate). |
| Vite | MISSING for games | Only root `vite.config.js` -> `server/standalone/vite.config.js` (planner app) | A build step would be new for a city game. |
| WebXR polyfill (WebXRKit / HelloXR) | VERIFIED (present, fake-tested) | `pages/webxr-polyfill.js`, `pages/THIRD_PARTY.md`, copies in `bb-couch/.../webxr-polyfill.js`, `room-kit/games/base-camp/webxr-polyfill.js` | Unmodified from github.com/wem-technology/ios-webxr. Round Table Kingdom `index.html` does not load it (grep: 0); it relies on the host app and copies Base Camp's overlay-wiring fix in `game.js` AR section. |
| Rapier (WASM physics) | VERIFIED (Node + Chromium) | `brick-lab/games/brick-lab/vendor/{rapier,rapier-0.21-compat,rapier-0.21-simd-compat}`; `tests/phys-results.json`, `build-compare.json` | 0.14.0 (2 MB), 0.21.0 (4.3 MB), 0.21.0 SIMD (4.6 MB). |
| Other runtime libs | VERIFIED | js-aruco2 2.0.0 (`room-kit/games/base-camp/vendor/js-aruco2`), TF.js + COCO-SSD, transformers.js + CLIP, onnxruntime-web, Depth Anything V2 Small (49.6 MB, Base-only) | All from CDN or vendored per `base-camp/THIRD_PARTY.md`. Heavy; Base Camp only. |

## 2. Physics systems

| Capability | Class | Evidence | Notes |
|---|---|---|---|
| Rule-based support engine: `SG.step(dt)` fixed-step (`game.js:969`) | VERIFIED | `game.js:969`; `v2-test.js` 73 checks; `proof.js` bot report 200 matches, 0 stuck mice (`BOT_REPORT.md`) | Deterministic; matches run headless without drawing. |
| `pieceAt` shot-vs-piece lookup (`game.js:486`) | VERIFIED | `game.js:486`; `lab-test.js` 194 checks; gate/bare-frame fix in `LAB.md` s"The gate fix" | Bare-frame rule shared with matches. |
| Supports: `holdFail` (`game.js:643`), `settle` (`:654`), `bSettle` for buildings (`:800`) | VERIFIED | `LAB.md` Building Yard rules; `SG.bldFloating()` asserted empty by every lab/range test; Range report "floating check always 0" | Wall/gate/Keep/roof rules plus generic part-supports (`need`/`min`) for six buildings. |
| Chain topple (`topple`, `toppleB`, cap 8 per shot) | VERIFIED (Lab only) | `game.js:808,817`; `LAB.md` "Chain reactions"; `lab-test.js` | Lab switch, not in matches. |
| Rolling shots (`rollTick`, `game.js:770`) | VERIFIED (Lab only, matches off) | `tests/roll-test.js` 16 checks; shots `roll-1..3.png` | `CONFIG.v2.rolling.on` off until balance proved. |
| Collapse/knock/debris cap 160, carnage counter | VERIFIED headless | `LAB.md`; frame time numbers are software GL only | Castle 142 draw calls, 58k tris, 3-4 fps SwiftShader; no iPad figure. |
| Mouse mender (Defences) | VERIFIED headless | `defence-test.js` 33 checks; `DEFENCE_REPORT.md` 48 bot matches; `game.js:70` `repair:{every:4,...}` | Lab flag only; no human match with posts. |
| Rapier Brick Lab: wall stands | VERIFIED (Node) | `tests/phys-results.json`; BRICKLAB.md: wall 120 = 0.7 mm drift, castle 383 = 1.2 mm | Requires tuned gravity -9.81, 6/2 solver iterations, damping. |
| Brick Lab determinism | VERIFIED on one machine; cross-device UNKNOWN | hash `9f08783c` (0.14), `dd9f66ff` (0.21), `4b748a06` (0.21 SIMD); Node == Chromium (`page-test.js`) | Three builds give three hashes; a replay must record the build. |
| Brick Lab cost per step (Node) | VERIFIED (cloud core) | BRICKLAB.md Cost table: castle 383 = 7.2 ms avg / 16 worst (0.14); 1955 block 30 ms (0.21), 13 ms (SIMD) | Relative only. |
| Harry's iPad run 21 Nov: hash 9f08783c, castle 383, about 22 fps | UNKNOWN (caller-supplied, no repo record) | Only a comment `build-compare.js:4` ("about twice as slow as this cloud core"). `BRICKLAB.md` "What is not tested": "A real iPad. Nothing here has run on one" | If the figures are true, 22 fps on 0.14 is below the 60 fps target; no SIMD/0.21 iPad figure exists. Which Rapier build was used is not stated; hash 9f08783c implies 0.14. |
| Brick Lab live | VERIFIED | `https://hrranford-afk.github.io/gods-eye-view-patch-town/brick-lab/` HTTP 200; `pages/brick-lab/index.html` and `sim.js` byte-identical to branch | Bench page `?bench=1`. |
| Brick Lab: pitched roofs, arches, mice, rules, AR | MISSING | BRICKLAB.md "What is not tested" | Pitched roof collapsed in three tries; flat beam deck used. |
| Older B&B physics | VERIFIED headless, arcade (not rigid-body) | `bb-couch/.../tests/couch-test.js` 53 passed (15 Nov); HANDOVER dominoes, car-road contact numbers "-3.19 -> 0.03" | Steering/collision/domino chains are scripted arcade code; no physics engine. Not iPad-tested except a 15 Nov human report that drove the Kitchen Run fixes. |

## 3. Browser games and iPad support

Live base: `https://hrranford-afk.github.io/gods-eye-view-patch-town/`. All URLs below returned HTTP 200 on 21 Nov. gh-pages head `3ddc75f` (21 Nov 18:20). Live `sofa-siege/game.js` and `models.js` are byte-identical to the branch.

| Game | Class | Evidence | Notes |
|---|---|---|---|
| Round Table Kingdom (`sofa-siege/`), 3,069-line `game.js` (448 KB), `models.js` 1,076 lines | VERIFIED live + headless | `/sofa-siege/` 200, `/sofa-siege/?lab=1` 200; tests at 1180x820 / 1280x800; Lab also opened at 1000x700 and 834x1112 (`LAB.md` "What is not done") | Real iPad: DESIGN.md "Clearer table (20 Nov, after Harry's iPad play)" proves Harry played it on an iPad (stale-ring bug), but which mode, device, and feel is not recorded. DESIGN.md: "Not proved: feel on a real iPad finger". Defences, Arsenal, Yard: "nobody has played, not on iPad". |
| Round Table Kingdom table mode (two players) | VERIFIED headless | `table-test.js` 36-37 checks, real multi-touch | |
| Lab / Yard / Arsenal / Defences | VERIFIED headless; live | `?lab=1`; `lab-test.js`, `defence-test.js` | Frame time unmeasured on iPad. |
| Cards page (`sofa-siege/cards.html`) | VERIFIED live page; recogniser on synthetic frames only | `/sofa-siege/cards.html` 200; `cards/README.md`: "NOT TESTED on a real device or a real print" | Not wired into game except `SG.applyLayout`. |
| Brick Lab | VERIFIED live, headless (1180x820) | see s2 | iPad run unrecorded. |
| Baguettes & Ballistics (`bnb-couch/`, `bnb-toy/`) | VERIFIED live | both 200; `couch-test.js` 53/53 at 820x1180 portrait; HANDOVER "15 Nov: Kitchen Run fixes (a player on a real iPad, portrait, Safari)" | Human iPad play of Kitchen Run is recorded (the bug report). Balance "never played by a human on an iPad". Real pads untested. |
| Base Camp (`base-camp/`, `base-camp-next`, `base-camp-shop`) | VERIFIED live | 200; build 30; many real-iPad notes (s4) | |
| Vigil 3D (`vigil-3d/`) | VERIFIED live, headless 1180x820 | 200; `tests/vigil3d-test.cjs`, shots | No iPad record found. |
| Works (`works/`) | VERIFIED live | 200 | |
| Real iPad run of Round Table Kingdom in AR | UNKNOWN | `AR_NOTES.md` line 3: "NOTHING here has run in HelloXR or on a real iPad" (19 Nov) | Harry's 21 Nov statement is the only later claim; game and feel unrecorded. |
| iPad frame rate for any game | MISSING (only B&B watchdog numbers, software GL) | LAB.md "Nobody has timed it on an iPad" | |

## 4. AR capabilities

Two evidence tiers kept apart.

| Capability | Tested in headless fake WebXR | Tested on real iPad / HelloXR | Evidence | Notes |
|---|---|---|---|---|
| Round Table Kingdom AR (hit-test, tap-to-place, lock, anchors optional, dom-overlay, in-scene buttons, tracking loss, Exit AR) | VERIFIED: `sofa-siege/.../tests/ar-test.js` against `tests/ar-fake.js` (55 lines; hand-written WebXR, one flat disc, perfect tracking). Counts: 73 checks in `AR_NOTES.md`; 84 in `LAB.md` after later additions | UNKNOWN beyond Harry's single 21 Nov statement that "AR works through HelloXR" (no game, no feel recorded). `AR_NOTES.md` (19 Nov) lists 13 untested items and an 8-step iPad script that has no filled-in result | shots `ar-1-find`..`ar-4-scene-buttons.png` (fake) | The fake is not the WebXRKit polyfill. |
| hit-test | VERIFIED in fake (ring appears only on table; 3 mm placement from 3 poses) | Base Camp: hit tests used on real iPad (sticker/rooms work). Round Table Kingdom: UNKNOWN | `AR_NOTES.md` "Proven by the fake" | HelloXR gives only viewer-space plane hits, one frame late (`bb-couch/.../AR.md` table). |
| dom-overlay | VERIFIED in fake (with and without) | Known real fact: HelloXR can start with NO overlay (B&B notes "as on the owner's iPad", NO_OVERLAY harness); in-scene fallback built | `bb-couch/.../AR.md`, `ar-test.js` | Round Table Kingdom overlay wiring copied from Base Camp; real-device behaviour UNKNOWN. |
| Easy aim (`SG.easyAim`, auto-on under 80 cm table) | VERIFIED headless (`pull-test.js` 28 checks) | UNKNOWN | `DESIGN.md:157-158` "Not proved: feel on a real iPad finger" | |
| Sticker lock, ArUco 4x4 ids 1-6, 8 cm (`STK_IDS`, `STK_SIZE`, `room-kit/games/base-camp/index.html:6280`; `stickers.html`; `screen-sticker.html`) | VERIFIED: marker-test 29/29 (fix 0.14 cm / 0.16 deg), stickerkey-test 20/20 on a quiet machine (flaky under load: 19/20, section 4 timing) | VERIFIED real iPad, one event: 16 Nov about 16:10 UK, screen sticker locked the camp in HelloXR ("Looks like it's worked with that image thing"; `micro-precinct/games/START_HERE.md:183`). Later 16 Nov evening: a sticker showed Room 7 instead of Room 3 (`base-camp/HANDOVER.md` "What the owner saw"); cause not known | HANDOVER "Not proven": HelloXR picture size/rate/orientation, motion blur, lighting | Pure maths in `room-kit/games/room-kit/vision.js` (kit-vision test 4/4). |
| Room kit (`games/room-kit/`: vision.js 164 lines, recorder.js 73, dev.js 69; KIT_PLAN 37 KB) | VERIFIED partly: kit-check, kit-vision 4/4, house-ar-test 14/14 (4 of 4 final runs) | UNKNOWN for the kit extracted code | `KIT_PLAN.md` ss9, 9b, 11 | Only steps 1 and 2 of the migration are done; the rest of the kit still lives inside Base Camp `index.html`. |
| Room guard (`roomguard-test.js` 23 checks) | VERIFIED headless | Base Camp: Harry's real iPad saw room-boundary and sleep problems that led to build 26 (`HANDOVER.md` "Room boundaries and sleep relock") | | HelloXR: no 'reset' event, no tracking state, origin jumps after sleep. |
| Sleep/origin-jump relock, room snapshots (build 28), depth (build 30, Depth Anything V2 Small) | VERIFIED in fake (snapshot 29/29 with one known flaky section, depth 29/29, roomfix 35/35) | UNKNOWN (HANDOVER "Not proven / needs the real iPad": onnxruntime wasm in HelloXR web view) | | |
| Base Camp AR as a whole | VERIFIED fake (auto-ar 36/36) | VERIFIED partial: real Base Camp play in HelloXR recorded 14-16 Nov (CAIRN "8-hour play" and Harry's iPad play, `HANDOVER.md` "Build 19 fixes"; build 26 two things Harry saw) | | Best real-device evidence in the repo. |
| Baguettes & Ballistics AR (My Track: scan, draw, race) | VERIFIED with HelloXR's real polyfill + fake native bridge (`hxr/mtar.js`, scratchpad, not in repo) | UNKNOWN: AR.md "Needs a real iPad" lists 5 items | `bb-couch/.../AR.md` | |
| Cards recogniser (`sofa-cards/games/sofa-siege/cards/cardvision.js`, 424 lines) | VERIFIED on synthetic/made-up frames; numbers in `RECOGNITION_REPORT.md`, `page-test.js`, `recognise-test.js` | UNKNOWN / MISSING: "NOT TESTED on a real device or a real print"; "How to try it on an iPad (not yet done by anyone)" | `cards/README.md` | Set 2b chosen because Set 1 named a card wrongly 10 times in 978. |
| Lab in AR; two players in AR | MISSING | `LAB.md` "What is not done"; `AR_NOTES.md` item 13 | |
| iPad/HelloXR AR performance (frame rate, heat) | UNKNOWN | AR_NOTES item 9: about 63k triangles and 170 draw calls, "never measured on an A-series chip" | |

## 5. Reusable code and data (for a miniature-city-building game)

| Item | Path (worktree-relative) | Size | Reuse |
|---|---|---|---|
| SS model library: mice, pieces, hill, fx, poses | `sofa-siege/games/sofa-siege/models.js` | 1,076 lines, 114 KB, global `SS`, three r128, no assets | As is (needs the shared texture atlas and `SS.PAL`). |
| Building builders and the Building Yard (cottage, barn, lookout, bridge+gatehouse, windmill, market stall) | same, `BUILD.*`, `bp(...)` helper, `SS.BUILDINGS` (line 649), `SS.bldInfo` (826); rules in `game.js` `bSettle` (800), `toppleB` (808), `LAB.md` "Building Yard" | 15-40 parts each, staged trim/walls/frame | As is for visuals and the support rule. Best city seed in the repo. Pieces are one footprint each, mice treat as solid block; no interiors. "Adding a building" recipe in `LAB.md` documented. |
| Counter pieces (awning, shield, ditch, logs, net, cutter, heavy, low wall) | `models.js:773`, `LAB.md` Arsenal | 8 pieces | With adaption (defence-specific). |
| Texture atlas + painted textures | `models.js:76-117` (`makeBig`, `SS.texMaterials`), `tex/*.jpg` (6 x 512 px, 6-65 KB each), originals `art/pack3/textures/*.png` (8 x 1024 px) | ~300 KB web set | As is. Rope and fur tiles unused. UVs and `?tex=0` fallback exist. |
| Art packs: pack3 (textures + 3 mouse reference sheets), Round Table concept packs, picture cards sets 1/2/2b/2bc | `sofa-siege/games/sofa-siege/art/pack3`, `sofa-cards/.../cards/art*`, prompts `micro-precinct/games/CHATGPT_PACK3/4/5_PROMPT.md` | PNGs | Mouse sheets: reference only (2D, "not a rig or mesh"). Textures: as is. |
| Mouse models (procedural) | `SS.mouse` (`models.js:350`), poses idle/walk/carry/hammer/aim/cheer/dizzy | | As is. Animated GLB scout: `base-camp/assets/basecamp_mouse_scout_ANIMATED.glb`, 1.3 MB, 5 clips (ChatGPT-made) | As is (needs GLTFLoader r128 from jsdelivr). |
| Weapon records and Workshop | `game.js` `AMMO`, `WDEF` (23 sliders), record `{schema:'rtk.weapon', version:1}` (`game.js:1913`), `LAB.md` Workshop | | As is for data format; combat content with adaption (a city game needs few weapons). |
| Lab and Counter matrix | `game.js` Lab section (~lines 1800-2500), `SG.labMatrix`, `tests/range.js`, `RANGE_REPORT.md` (89 KB) | | Reference only / with adaption: the pattern (prototype slots `SG.addProto`, hooks, range report) is reusable. |
| Robots/bots and win-rate harness | `tests/proof.js`, `sweep.js`, `winrate.js`, `BOT_REPORT.md`, `defence-proof.js` | proof of 200 matches ~1 hour | With adaption. Pattern for headless sims of any rule set. Win rates: good camp 100% vs bad; blue 52%. |
| Base-as-text/layout format with versioning | Designs: `{schema_version:1, design_name, mm_per_unit:160, frame:'camp', placements[{kind, transform_anchor_relative{x_mm,y_mm,yaw_deg}}]}` (`LAB.md` Designs, `game.js:1753,1761`); table layout from cards `SG.applyLayout` (schema_version 1, `README.md`); weapon schema `rtk.weapon` v1; Brick Lab text: one piece per line `type x y z qx qy qz qw` (~20 KB castle, `BRICKLAB.md`) | | As is. Versioned, validated by `labDesignCheck`, stored in `localStorage` (`rtk.lab.designs.v1`). The agreed AR scale: 160 mm per game unit. |
| Economy + job system for mice | Round Table Kingdom: `buildMice`, mender, CONFIG costs; Base Camp economy: `base-camp/models/economy.js` (213 lines, sawbench/oven/reel/pedlar/board/pinwheel models), `market.js` 162 lines, `places.js`, `index.html` economy and market sections; tests `economy-test.js` 41/41 (13 Nov), `market-test.js` 38/38 | | Base Camp economy (wood/corn, workshops, prices, ECON_TUNE) is the closest thing to citizen simulation. With adaption. |
| Defences prototype | `game.js` DEF section; `DEFENCE_REPORT.md`; `defence-test.js` | 33 checks | Reference only. |
| Rapier Brick Lab sim layer | `brick-lab/games/brick-lab/sim.js` | 266 lines, no DOM/three | As is as a destruction engine; `index.html` 463 lines. Bench harness `?bench=1` plus 3 Rapier builds reusable. |
| Room kit (surfaces, room memory, sticker lock) | `room-kit/games/room-kit/` + `base-camp/index.html` | vision 164 lines; the rest still inside 8,970-line Base Camp | With adaption (extraction unfinished). Essential for AR placement on a real table. |
| Base Camp as a city seed | `room-kit/games/base-camp/` | 8,970 lines, builds up to 30 | Contains settlements, zones, cable cars, seasons, economy, autosave (every 10 s with backup slot), away simulation. Closest existing "living miniature". Reference + partial reuse. |
| OPEN_TOY_CITY_PLAN | `micro-precinct/games/OPEN_TOY_CITY_PLAN.md` | plan only | Reference only: spike "Toy City Lab" not started. |
| Bench harnesses | `brick-lab/.../tests/phys-test.js`, `build-compare.js`; `lab-shots.js --frames`; B&B `couch-test.js --perf`; Base Camp `STRESS_RESULTS.md` | | As is as patterns. |

## 6. Test and verification infrastructure

Run style: `NODE_PATH=$(npm root -g) node tests/<name>.js` (Playwright via global install), tests start their own static server or load files; Chromium with SwiftShader (software GL); fixed viewport 1180x820 / 1280x800; shots written by `--shots`. `ar-fake.js` injected with `page.addInitScript`. Syntax check done here: `node --check tests/ar-test.js` OK.

| Capability | Class | Evidence | Notes |
|---|---|---|---|
| Round Table Kingdom suites (`sofa-siege/games/sofa-siege/tests/`) | VERIFIED (recorded) | `LAB.md:443-447`: "lab 194, v2 73, pull 28, roll 16, clarity 20, table 36, layout 37, build 24, fight 48, ar 84, defence 33" (21 Nov, branch with all merges). `ar` was 73 on 19 Nov (`AR_NOTES.md`) | Files: `lab-test.js` (521 lines), `v2-test.js` (222), `table-test.js` (140), `ar-test.js` (206 lines, 30 KB), `fight-test.js` (166), `layout-test.js` (111), `pull-test.js` (116), `roll-test.js` (77), `clarity-test.js` (72), `build-test.js` (85), `defence-test.js` (143). Not re-run in this audit. Note `build` and `fight` only cover rules v1. |
| Round Table Kingdom batch/proof harnesses | VERIFIED | `proof.js` (writes `BOT_REPORT.md`), `sweep.js` (`BOT_REPORT_V1.md`), `winrate.js`, `range.js` (`RANGE_REPORT.md`), `defence-proof.js` (`DEFENCE_REPORT.md`), `lab-shots.js` | proof 200 matches takes about 1 hour. |
| Brick Lab tests | VERIFIED | `phys-test.js` (Node, about 40 s), `page-test.js` (Playwright), `build-compare.js`; results JSON committed | Count of checks not stated as a number. |
| B&B | VERIFIED | `couch-test.js` 53 passed (351 lines) | `shoot.js` screenshot script, 99 shots. |
| Base Camp (~40 files in `room-kit/games/base-camp/tests/`) | VERIFIED recorded | START_HERE and HANDOVER: marker 29, snapshot 29, roomfix 35, roomguard 23, house 43, economy 41, market 38, places 31, depth 29, auto-ar 36, stickerkey 20 (flaky under load), multi-room 40, return 16, fun 18, practice 14, house-ar 14 | Includes `ar-fake.js` (94-106 lines, fake WebXRKit native side with stickers/textures/origin jumps), `house-world.js`. Known-flaky list in KIT_PLAN s10. |
| Room kit | VERIFIED | `kit-vision-test.cjs` 4/4; `tools/kit-check.cjs` (copies and no forbidden top-level names) | |
| Cards | VERIFIED | `recognise-test.js`, `page-test.js`, `colour-test.js`, result md files | |
| Vigil | VERIFIED | `vigil3d-test.cjs`, `vigil3d-shots.cjs` | |
| Shared fake-device patterns | VERIFIED | fake WebXR (`ar-fake.js`), fake gamepads (`getGamepads` override), fake touch (`__XRF.tap/drag`), seeded `Math.random`, `diagclash2.js` (HelloXR global-name clash), `noxr.js` ("errors: none") | Those last two are cited by name in docs; not found in worktree (kept in session scratchpad). |
| Deploy-and-live-check script | MISSING | No deploy script in `scripts/`, `tools/` or `games/` (only `qa-*.mjs` for the planner). Deploys are manual commits to `gh-pages` (`3ddc75f`, "backup b13" folders `sofa-siege-b1..b13`); live checks are by hand (HANDOVER "confirmed by hiding WebXR in Chromium") | The "backup bN" pattern is the only rollback. |
| Real-device test log | AVAILABLE BUT UNTESTED | "Copy AR log" (`SG.ar` dev line `?dev=1`), `base-camp/check.html`, Base Camp `?dev=1` "Copy numbers" | Exists, results from Round Table Kingdom runs not recorded. |

## 7. Licences and third-party

Repo `hrranford-afk/gods-eye-view-patch-town` is **public** (`gh api`: private false). gh-pages is public.

| Item | Class | Evidence | Notes |
|---|---|---|---|
| three.js r128, MIT | VERIFIED | `brick-lab/.../vendor/three/three.min.js` header; `works/THIRD_PARTY.md` | CDN elsewhere. |
| Rapier 0.14.0 and 0.21.0 (+SIMD), Apache-2.0, unmodified | VERIFIED | `brick-lab/.../vendor/*/LICENSE` (11,343 bytes each); `pages/THIRD_PARTY.md` | Vendored with Harry's yes. |
| WebXR polyfill (Apache-2.0; Mozilla MPL-2.0; MIT nosleep) | VERIFIED | `pages/THIRD_PARTY.md`; `bb-couch/.../THIRD_PARTY.md` | `sofa-siege/games/sofa-siege/` has no THIRD_PARTY.md of its own (only `pages/THIRD_PARTY.md` at site root). |
| js-aruco2 MIT + OpenCV 4x4 dictionary (3-clause BSD) | VERIFIED | `base-camp/THIRD_PARTY.md`, `vendor/js-aruco2/LICENSE.txt` | |
| Depth Anything V2 Small, Apache-2.0 | VERIFIED | `base-camp/THIRD_PARTY.md` | Note says Base/Large/Giant are CC BY-NC and must not be used. |
| COCO-SSD (Apache-2.0, labels CC BY 4.0), CLIP ONNX (MIT) | VERIFIED | same | Runtime from CDN / Hugging Face. |
| Kenney / Quaternius props, CC0 | VERIFIED | `base-camp/models/cc0/LICENCE-*.txt`, `models/props.js` (123 KB) | |
| Night Meet assets (barrel_03, covered_car, asphalt_02 ... `_1k` textures) | UNKNOWN licence | `games/night-meet/assets/...` in git history; `night-meet/THIRD_PARTY.md` exists but not read here | Naming matches Poly Haven (CC0); confirm. |
| Fonts | VERIFIED | Works: Bricolage Grotesque, Atkinson Hyperlegible, JetBrains Mono (OFL 1.1, Google Fonts); `pages/index.html` Bungee, Barlow Semi Condensed, Press Start 2P (OFL) | Loaded from fonts.googleapis.com: external call from a public page. Sofa-siege uses system fonts only. |
| Textures and mice "by ChatGPT" | VERIFIED present, rights status UNKNOWN | `sofa-siege/.../art/pack3/HANDOVER_by_ChatGPT.md`, `tex/README.md`, cards art sets, `basecamp_mouse_scout_ANIMATED.glb` credited "made with ChatGPT, sent by Harry" | These are **public** (committed on public branches and served from gh-pages). `DESIGN.md` says Harry's two style-key pictures "stay with Harry, not in this repo" (private). No licence statement for AI-generated art exists in the repo; need Harry's decision. |
| No real brands | Mostly clean | Game code grep (lego, nerf, minecraft, nintendo, etc.) clean in sofa-siege, brick-lab, Base Camp. Hits: `bb-couch/.../index.html:4182` code comment "like Mario Kart"; docs: "Micro Machines-style" (`bb-couch/.../HANDOVER.md`, README), `OPEN_TOY_CITY_PLAN.md` ("in the spirit of that kind of game"); several MD files mention Lego/other names (list: B&B README/DESIGN/HANDOVER) | Names appear only in comments/design docs, not in UI. Flag: remove the Mario Kart comment on a public branch if the rule is strict. |
| 18+ edition conflict | FLAG | `OPEN_TOY_CITY_PLAN.md` "make it 18 plus" (21 Nov): repo and gh-pages are PUBLIC; the doc itself says keep off the public site | Conflicts with the public-repo rule and the "toy, nobody dies" rules unless Harry decides hosting. A city-builder for kids should stay out of this. |
| Personal photos in public history | None found by name (content not opened) | `git log --all --diff-filter=A` listed 684 image paths; filtered for IMG/DSC/PXL/photo/selfie/family/kid/face/screenshot patterns: no hits. By folder: `games/base-camp/shots` (183), `baguettes-and-ballistics/shots` (99), `sofa-siege/shots` (84), `sofa-siege/cards/shots` (31), `games/works/shots` (23), `docs/media` (19 planner GIFs/PNGs), `base-camp-first10/replay20` (16), `night-meet` (CC0-style textures + 8 shots), `orders/inputs/look1-blockouts` (3), `apps/patchtown-ios/.../AppIcon icon-1024.png` | Caveats: names only; AR field reports (`recorder.js`) store up to 6 small camera pictures in JSON reports, never committed by design (`room-kit` privacy rules). `bc-mac` HANDOVER mentions "His photo" of the owner's screen: the photo is not in the file list. Recommend a content check of `base-camp/shots`, `first10/replay20/A07-came-back-8h-later.png`, `B07-...png` (names suggest the game's own replays, but unverified). |

## 8. Gaps for a polished AR miniature city-building game

| Area | Class | Evidence | Notes |
|---|---|---|---|
| Real-device AR (Round Table Kingdom engine) | UNKNOWN | s4 | Highest-risk unknown. Only the Harry statement exists. |
| iPad performance | MISSING | Castle 58k tris / 142 draws at 3-4 fps on SwiftShader; Brick Lab 22 fps (caller-supplied) at 383 bodies; AR sizes never measured | A city needs instancing/LOD; Yard of 3 = half a Castle. Plan item in OPEN_TOY_CITY_PLAN. |
| City simulation (citizens, jobs, traffic, services, zoning) | MISSING for a city; partial pieces | Base Camp has colony/economy/market/seasons; sofa-siege has mouse builders/menders only | No road network, land value, demand, or happiness model in the games folder. |
| Economy | AVAILABLE BUT UNTESTED for a city | `economy.js`, `economy-test.js` 41/41 (headless); prices in ECON_TUNE need retuning ("to retune from the town sandbox") | |
| Save system | VERIFIED pattern, per game | Base Camp autosave every 10 s with `-bak` slot, versioned room map, migration; sofa designs `localStorage` v1 | No shared city save format; no cloud. |
| Art: consistent miniature-city style | MISSING | Pack3 textures wood/blue/red/tin/canvas/grass only; buildings are boxes/cones with plain textures ("plain: boxes, cones and rods") | No roads, water, trees, citizens, vehicles beyond B&B toy cars (B&B models separate). |
| 3D assets | AVAILABLE BUT UNTESTED | Kenney/Quaternius CC0 kits (14 baked props), Night Meet CC0-style models, one animated GLB | Kenney City Kit planned but download refused (403) for Works; none in repo. |
| Animation | Partial | Mouse poses, GLB clips, collapse FX, cloth wave | No building construction animation, no crowd/traffic animation. |
| Sound | Partial | Synthesised Web Audio sounds (knock, crash, twang) in sofa-siege and bc-sound (`sound-test.js`) | Sofa-siege sounds "could not be heard", never listened to. No music, no ambience. |
| UI / onboarding | Partial | First-run captions, "?" legend, robot levels Friendly/Fair/Fierce; Base Camp first-10 minutes test (`first10-test.js`) | No tutorial for building placement/roads/zoning; AR scale/lock 8-step script untested. |
| AR placement of a table-sized city | VERIFIED in fake only | `ar-test.js`; 160 mm per unit; 60-140 cm table; sticker lock for persistence | Drift after sleep known (HelloXR origin jumps); relock features exist for Base Camp, not in the siege engine. |
| Multiplayer | MISSING | `LAB.md`, `AR_NOTES.md` | Two-player table mode exists for the siege only. |

---
## Top 10 reusable pieces
1. `models.js` Building Yard builders plus the `bSettle` part-support rule (cottage, barn, lookout, bridge, windmill, market).
2. SS model library and mice with poses, texture atlas, and the painted tiles (`tex/`, `art/pack3`).
3. Layout and design formats (`schema_version 1` placements in mm/deg, `labDesignCheck`, 160 mm per unit, weapon `rtk.weapon` v1).
4. Round Table Kingdom AR logic: hit-test reticle, tap/drag placement, lock, size slider, tracking-loss guard, in-scene fallback buttons (`ar-test.js` 84 checks in a fake).
5. Sticker lock and room kit (ArUco 1-6, `vision.js`, room memory, relock) with its tests.
6. Base Camp economy/market/places models and tests (`economy.js`, `market.js`, `economy-test.js`).
7. Headless Playwright harness patterns: `ar-fake.js`, fake gamepads, bots (`proof.js`, `winrate.js`), range reports, `lab-shots.js --frames`.
8. Rapier `sim.js` (266 lines) with three vendored builds, text base format, determinism hash and `?bench=1` card.
9. Lab prototype-slot system (`SG.addProto`, hooks) for trying features without touching the match.
10. Autosave with backup slot and migration pattern from Base Camp, plus field recorder/dev panel (`recorder.js`, `dev.js`).

## Top 10 risks
1. No verified AR run of the Round Table Kingdom engine on a real iPad; one unrecorded statement is the only evidence.
2. iPad performance unmeasured: software-GL numbers only; Brick Lab 22 fps at 383 bodies (unrecorded, caller-supplied) is already below 60 fps on Rapier 0.14.
3. Rapier determinism differs per build and is untested across devices; replays or two-device play need one pinned build.
4. HelloXR quirks: no tracking state, no 'reset', origin jumps on sleep, JS-emulated anchors, maybe no dom-overlay, defines globals like `lerp` that kill classic scripts; `ar-fake.js` is a hand-written fake, not the real device.
5. Single-file, long-line, no-build code (448 KB `game.js`, 1.1 MB Base Camp page); no formatter allowed, merge conflicts, hard to onboard.
6. AI-generated textures, mice and card art are public in the repo with no stated licence or ownership; style-key images are deliberately private.
7. Public repo and public site vs the 18+ plan (OPEN_TOY_CITY_PLAN); a stray real-brand mention (Mario Kart comment, Micro Machines in docs) and the unreviewed `night-meet` and screenshot images need a content check.
8. No deploy or live-check script: deploys are manual gh-pages commits; "backup bN" folders pile up (`sofa-siege-b1..b13`, 222 MB working copy).
9. Flaky tests under load (stickerkey section 4, snapshot section 4, return-test) and several suites only recorded in docs, not re-run; `build` and `fight` tests cover only rules v1.
10. Content gap: no roads, citizens, traffic, city economy or audio-listening review; buildings are plain primitives; scope to a polished city is large and the siege balance numbers were never tuned against play.
