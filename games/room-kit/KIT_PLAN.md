# Room kit: the shared AR engine, lifted out of Base Camp

Branch `game/room-kit` (from `game/bc-depth`, Base Camp build 30). Written 17 Nov 2026.
Harry's idea (GAME_MODES_PLAN.md, 16 Nov): "they're all the mechanics built on the same thing, just different game styles". The kit is the "room brain" of that plan: surfaces, spots, clutter, room memory, sticker / snapshot lock, depth, and the desktop test world. Sofa Keep is the first new game on it (SOFA_KEEP_IDEA.md, SOFA_KEEP_PICKS_17NOV.md), then Baguettes & Ballistics and Vigil.

## 1. The short version
- **What the kit is:** everything in Base Camp that knows about the *room*, not the *colony*. About 4,000 of Base Camp's 9,235 lines: SCAN, LAND, the room map, change detection, alignment, AR mode (with the HelloXR fixes), the practice room and dolls' house, the desktop camera and controller, recognition's camera plumbing, the field recorder, relocalisation, the room guard, room boundaries and sleep relock, the sticker lock, room snapshots, depth, developer mode, the rooms registry and places.
- **What stays Base Camp:** the colony, creatures, economy, market, seasons, waterworks, battle, fun, sound, first10, the away simulation, the notices feed and all their words.
- **How a game uses it:** one HTML per game, plus the kit's files loaded with plain `<script>` tags before the game's own script. No build step, no modules, three.js r128 as the global `THREE`. The game gives the kit a small set of hooks (`RK.game`) and reads the room through `RK.*`.
- **Where the files live:** the source of truth is `games/room-kit/*.js`. Each game folder carries a byte-identical copy in `<game>/room-kit/` so that the game folder is still complete on its own (the test server, the gh-pages copy, HelloXR and the iOS app all serve one folder). `node games/room-kit/tools/kit-check.js` copies and checks (see 6).
- **How it moves:** in small steps. Each step is a pure move or a pure rename, Base Camp stays build 30 in behaviour, and the suites listed for the step stay green before the next step starts. Step 1 (the vision maths: sticker maths + the FAST/BRIEF matcher) is done on this branch (section 9).

## 2. Ground rules (from HANDOVER, they apply to every kit file)
- **No top-level names that HelloXR / gl-matrix may define.** HelloXR's polyfill defines globals such as `lerp`; a top-level `function lerp` or `const lerp` in any classic script is a SyntaxError on the iPad and the whole game does not start. Forbidden at the top level of every kit file and game file: `lerp create clone copy set add sub subtract mul multiply div divide scale scaleAndAdd length len sqrLen squaredLength distance dist sqrDist squaredDistance negate inverse invert normalize dot cross min max floor ceil round random rotate rotateX rotateY rotateZ transformMat3 transformMat4 transformQuat angle zero str equals exactEquals fromValues identity forEach`. Kit names are prefixed (`rk`, `stk`, `snap`, `depth`, `reloc`, `scan`, `land`, `desk`, `house`, `rec`, `dev`). `kit-check.js` greps for these. Prove with `diagclash2.js` ("AR ready").
- **Classic scripts share one global scope.** Top-level `const` / `let` / `function` in a kit file are visible to the game's script and the other way round, at call time. At *load* time a kit file must not touch anything the game declares (a `const` of the game is in its temporal dead zone until the game's script runs). So kit files are loaded first and their top-level code only declares.
- **Comments:** `/* */` mid-line, never a `//` in the middle of a long one-line function (the 12 Nov lesson). Never run prettier on these files (long lines are deliberate).
- **Privacy rules travel with the code:** pictures are only read in memory; snapshots store descriptors, never pixels; places are off until a grown-up holds the button; nothing is uploaded. The kit keeps these as kit rules, not game rules.
- **HelloXR facts are kit facts:** no 'reset' event, no tracking state, the session survives sleep, the origin jumps silently, `camera-access` pictures come through the polyfill's device (`arDevice()._cameraImage`), the overlay must be wired by hand, and the polyfill only starts with an iPad user agent (`arIpadFix`).

## 3. Which parts of Base Camp become the kit
Line numbers are `games/base-camp/index.html` at build 30 (5692c5e). "Kit" = moves as it is; "split" = the room part moves, the game part stays behind a hook.

| Kit file (planned) | From Base Camp section (lines) | Functions and state | Kit / split |
|---|---|---|---|
| `room-kit/core.js` | basics (216-300) | `clamp` `rnd` `pick` `smooth` `seededRandom` `withSeed` `STORE` `safeWrite` `safeRead` `store`; the room guard backups `RG_KEEP` `rgOldKey` `rgIsMap` `rgBackup` `rgBackups` `rgRestore`; the rooms registry `MULTI_ROOM` `HOMES` `homesSave` `homeInfo` `homeName` `homeKeys` `homeSelect` `homeCreate` `homesMigrate` | kit; `homeKeys` gets a per-game prefix (base-camp keeps its old keys exactly) |
| `room-kit/core.js` | three basics (551-563) | `renderer` `scene` `camera` `world` `tmpV` | kit owns the renderer, scene, camera; the game owns what it adds to `world` |
| `room-kit/scan.js` | SCAN (603-827) | `CELL` `SCAN` `CLOSE_R` `scanReset` `gIdx` `gXZ` `newBand` `bandFor` `nearBand` `paintDisc` `evBlock` `scanHit` `refineBand` `chamfer` `closeHoles` `mergeBands` `extractZones` `CEIL_ABOVE` `ZTYPES` `PLACE_ADJ` `classify` `scanZone` `paintBands` `labelSprite` `updateLabels` | kit (zone names like "Sunny Perch" become overridable words) |
| `room-kit/land.js` | LAND (828-994) | `LC` `setLandFrame` `newLand` `landFromScan` `landIdx` `landXZ` `landEdge` `ensureLand` `ensureDist` `zoneClear` `landState` `landDisturb` `landCalm` `markBumps` `measureLand` `landComps` `objClass` `landTidy` `changedObjects` `bumpConf` `reconcileLand` `paintLand` `syncZoneMesh` `disposeZone` `rle` `unrle` `quietAR` | kit |
| `room-kit/map.js` | ROOM MAP (2124-2286) | `MAP_KEY` `zoneLocal` `zoneWorld` `setZoneFrame` `newMapZone` `zoneById` `zoneOfPoint` `addSpot` `removeSpot` `spotsOn` `spotById` `addCable` `syncCables` `mapToJSON` `mapFromJSON` `saveMap` `loadMapData` `storeWarn` `pickLandmarks` `bandComponent` `surfacePick` `refreshSpots` `SPOTMARK` | split: `TAGS` `ROLES` `TRAVEL` `roomInfo` `spotRole` `spotUsed` `spotHow` `zoneNameFor` `autoSpots` `anchorFor` `syncLandmarks` stay Base Camp (they read `rooms.json` and the colony). Spots keep `tag` and `name`; what a tag *means* is the game's. Cables are a Base Camp idea; the kit keeps a generic `links` list only if a second game needs it |
| `room-kit/change.js` | THE GIANT (2287-2546) | `overlapFrac` `fzOnZone` `growLand` `coveredAt` `hitsNear` `captureScan` (the matching and the events list) | split: `applyChanges` (gifts, squashing, diary), `askNext`, `answerAsk`, `NEWS*`, `showReport` stay Base Camp. `captureScan` returns events (`removed`, `placed`, `moved`, `gone`, `new`) and calls `RK.game.onChanges(events)` |
| `room-kit/align.js` | ALIGNING (2547-2574) | `solveAlign` `alignPt` `applyAlign` `nudgeAlign` `commitAlign` | kit; `applyAlign` calls `RK.game.onAlign()` instead of `syncTf` directly |
| `room-kit/ar.js` | AR mode (4675-4823) | `AR` `arIpadFix` `DIRECT` `directInit` `directSend` `directHit` `directCheckDone` `directFrame` `arLog` `arStart` `arEnded` `resize2` `arFrame` | kit; `arStart` / `arEnded` call `RK.game.onArStart` / `onArEnd` where today they call `resetWorld`, `startAuto`, `startScan`, `showTitle`, `persist` |
| `room-kit/practice.js` | PRACTICE ROOM (4824-4953) | `room` `PSURF` `P` `PVIEWS` `PROP_DEF` `PROPS` `addProp` `syncProp` `removeProp` `movePropTo` `placeRoom` `toRoom` `fromRoom` `allSurfs` `resetProps` `PV_T` `eyePose` `setEye` `practiceHits` `injectScan` `practiceFrame` `orbitCam` `propPick` `moveProp` `focusOn` `focusZone` | split: `f10EyeDo` `F10_CAM_D` `f10Cam` stay Base Camp (first-session camera). The toy sink / toilet props stay as Base Camp props registered through `PROP_DEF` |
| `room-kit/house.js` | DOLLS' HOUSE (4954-5112) | `HOUSE` `HOUSE_ROOMS` `HOUSE_ORDER` `HOUSE_DOORS` `PSURF0` `houseBounds` `houseRoomCentre` `houseAt` `houseSave` `HOUSE_SURF` `houseViews` `houseUse` `houseShow` `propHere` `houseId` `houseStep` `houseGo` `houseCount` `houseStart` `houseTick` `houseLabels` `houseLabelTick` | split: `houseVisit` `houseArrive` (colonists walking between rooms) stay Base Camp behind `RK.game.onRoomLeave / onRoomEnter` |
| `room-kit/desk.js` | DESKTOP CAMERA (5113-5262) | `DESK` `PAD_DEAD` `deskOn` `deskTake` `deskMaxD` `deskMove` `deskPan` `deskZoom` `deskBound` `deskWhole` `deskReset` `deskKeys` `deskSolids` `deskGuard` `deskInside` `padsNow` `padStick` `padRead` `padLive` `padCard` `padRing` `padNear` `padDir` `deskPad` `camUi` `roomListUi` `keysUi` | split: `deskFollowNext` / `deskFollowStep` follow a colonist: the kit asks `RK.game.followables()` for things to follow; `padCard` reads the game's card ids from a list the game gives |
| `room-kit/bot.js` | BOT PLAYTEST (5263-5329) | the harness: `BOT` clock, seeded pretend player loop, daily rows, `camInside`, error counts | split: what the bot *does* (give requests, plant, poke) is `RK.game.botActions` |
| `room-kit/camera.js` | RECOGNITION (5330-5541) | `arDevice` `recogFrame` `cropFrame` `loadScript` `cocoLoad` `recogDetect` `TF_URL` `CLIP_URL` `clipLoad` `clipEmbed` `clipScores` `clipClassify` `screenBoxOf` `topNear` `libFind` `libAdd` | split: `COCO_ROLES`, `recogConsider` / `recogPropose` / `autoTag` / `guessCard` / `answerGuess` / `unknownTops` / `askUnknown` / `practiceDetector` (what a cup means to a colony) stay Base Camp; the kit reports `RK.on('seen', {cls, score, spot})` |
| `room-kit/recorder.js` | FIELD RECORDER (5542-5629) | `REC_KEY` `REC` `recRing` `recT` `recFrame` `recNonHoriz` `recZones` `recCover` `recRecog` `recTag` `recReloc` `recUnknown` `recSnap` `recSave` `buildReport` `reportsLoad` `reportsAdd` `reportCopy` `reportDownload` `reportUi` | split: `WONDERS` `wondersTick` `makeWonder` stay Base Camp; `buildReport` takes `RK.game.reportExtra()` for the colony's part; `kind` becomes `<game>-field-report` |
| `room-kit/auto.js` | AUTOMATIC PLAY (5630-5812) | the scan cadence and the live map of `autoTick` (`closeHoles` / `extractZones` / `markBumps` / `liveSync`), `AUTO` `autoReset` `persist` (the room half) `liveMatch` `mapKnown` `liveGain` `liveReclass` `defaultTagFor` `liveSync` `clearArea` `autoCompare` `autoHintText` `arQuietTick` `autoCount` | split: `autoSettle` (landing the colony), `ceilTick`, `autoAskTick`, `homeMoment` and the colony half of `persist` stay Base Camp (`RK.game.tick`, `RK.game.save`) |
| `room-kit/reloc.js` | RELOCALISATION (5813-6101) | `RELOC` `rKey` `relocLayer` `relocCluster` `relocSavedLayers` `relocLiveLayers` `relocTop` `relocDyCands` `relocVerify` `relocHash` `relocLivePts` `relocCost` `relocIcp` `relocBegin` `relocAskAt` `relocPickRoom` `relocStep` `relocWhy` `relocConsider` `relocLock` `rgReset` `rgStart` `rgHold` `rgTops` `rgTick` `rgConfirm` `rgDrop` `rgAskFirst` `relocSetScore` `relocPolish` `relocRefine` `relocGoodForCompare` `relocAsk` `relocManual` `worldDrop` `relocNewRoom` `relocAskRooms` | kit; `relocLock` calls `RK.game.onLock(how)` (Base Camp: the "We're home!" moment, the diary, `pendingDiary`) |
| `room-kit/bounds.js` | ROOM BOUNDARIES AND SLEEP RELOCK (6102-6324) | `RB*` `RF*` `RS*` and every `rb*` `rf*` `rs*` function, `chooserOpen` `chooserClose` `stkSlots` | kit; `rbSaveColony` becomes `RK.game.save()`; `rsSplit` asks `RK.game.splitRoom(groups)` for the game's things |
| `room-kit/sticker.js` | STICKER LOCK (6325-6558) | pipeline: `STK*` `recStk` `stkLoad` `stkCam` `stkPoseNote` `stkMoving` `stkNeed` `stkTick` `stkCanvas` `stkRun` `stkAdd` `stkRej` `stkMed` `stkFixOf` `stkAng` `stkOwner` `stkLive` `stkCommit` `stkToJSON` `stkFromJSON` `stkSettled` `stkUse` `stkCanBind` `stkJump` `stkGive` `stkRoomsUi` `stkForget` `stkDiff` `stkBind` `stkRefineLock` `stkRebind` `stkBindQuiet` `stkComp` `stkNudge` `stkPin` `stkLock` `stkWait` `stkDrift` `stkPolishOK` `stkAskRoom` `stkClear` `stkHint` `stkReport` | split: `stkColAge` `stkKeep` `stkSavedCols` `stkFresh` read the colony: they become `RK.game.roomAgeS(id)` ("how much play would be left behind") |
| `room-kit/vision.js` **(moved, step 1)** | sticker maths (6559-6652) + the matcher `FEAT` (7119-7183) | `stkGray` `stkAt` `stkRefine` `stkIntr` `stkRot` `stkMul` `stkRes` `stkGN` `stkPose` `stkWorldPose` `stkDetect` `stkSolve` `stkInv` `stkRes2` `stkFit`, `FEAT` (FAST + rotated BRIEF, match, homography) | kit, pure maths, no game state |
| `room-kit/snap.js` | ROOM SNAPSHOTS (6653-6884) | `SNAP*` and every `snap*`, `stkView` | kit |
| `room-kit/depth.js` | DEPTH (6885-7031) | `DEPTH*` and every `depth*`, `recDepth` | kit (the depth mesh goes into `scene`, the game never sees it) |
| `room-kit/dev.js` | DEVELOPER MODE (7032-7094) | `DEV` `devRows` `devDraw` `devOpen` `devClose` `devJSON` `devCopy`, `worldMapAvailable` `worldMapSave` `worldMapLoad` | kit; `devRows` takes extra rows from `RK.game.devRows()` |
| `room-kit/rooms.js` | HOME TOTEM AND ROOMS (7095-7260) + UI (7469-7600) | `imgKey` `imgLoad` `imgSave` `imgDel` `imgFromSource` `imgFromFile`, `homeMapData` `ROOMPRE` `roomHasData` `homePrecomp` `homePickStart` `homeSwitchLoad` `homeStats` `homeSummary` `homePost`, `STORE_LIMIT` `fmtKB` `storeChars` `roomChars` `roomBound` `agoText` `roomsTidy` `roomDelete` `playRoom` `roomsUi` `roomRename`, `TOTPH*` `totemUrl` `totemChars` `totemDel` `totemScale` `totemPicked` | split: `homeSwitchLoad` / `roomDelete` / `roomChars` call `RK.game.load(id)` / `.forget(id)` / `.chars(id)` for the game's save. The old totem matcher (`TOTEM`, `totem*` with `HOME_TOTEM = false`) is not moved: it stays dead code in Base Camp until someone deletes it |
| `room-kit/places.js` | PLACES (7261-7461) | the privacy gate and position: `placesGate` `placesStart` `placesAsk` `placesGot` `placesSet` `placesRound` `placesDist` `placesTry` `placesNote` `placesNewHere` | split: local goods (`PLACE_AREAS` `PLACE_FLAVOURS` `PLACE_STOCK` `placesStep` `placesMake` `loomStep`, the rug) stay Base Camp |
| `room-kit/input.js` | input (7897-8046) | `rayAt` `groundPick` `planePick` `toScreen` `camTmp` | split: `down` `endDown` `tapAt` and the tool logic stay Base Camp; the kit gives picks |
| `room-kit/loop.js` | main loop (9078-9108) | the room half of `frame`: `arFrame` / `rfFrame` / `depthTick` in AR, `deskPad` / `botTick` / `practiceFrame` / `houseTick` off AR, the scan tick, `autoTick`'s room half, labels, `renderer.render`, `RF.frameMs` | split: `RK.game.tick(dt)` runs the colony (`simTick`, `funFrame` ... `SND_ambTick`), `RK.game.render2()` the creature cam |

**Tests and test kit** (`games/base-camp/tests/`): `lib.js`, `ar-fake.js`, `marker-render.js`, `texture-render.js`, `ar-harness.js` are kit tooling and move to `games/room-kit/tests/` (Base Camp's tests `require('../../room-kit/tests/ar-fake.js')`, or keep a one-line re-export so no Base Camp test changes).

**Not kit, stays Base Camp only:** ALMANAC (302-378), ENVIRONMENT and weather (379-433; a later "room weather" kit part is possible), toast + SOUND (434-550, 9113-9193; the kit gets its own tiny `rkToast` and calls `RK.game.sfx` if given), canvas textures (564-602), MODELS (995-1579), COLONY (1580-2123), AWAY (2575-2720), visuals (2721-2770), FUN (2771-3334), SEASONS (3335-3766), WATERWORKS (3767-4105), MARKET (4106-4283), ECONOMY (4284-4616), save / load / return of the colony (4617-4674), the notices feed, the rest of UI (title words, card, toolbar, menu, requests, tag picker, `resetWorld`'s colony half), BATTLE (8047-9030), first10, return, CCAM (the creature cam), the totem matcher (off).

## 4. The kit's public API
One global object `RK` (not a HelloXR name). During migration the old global function names keep working (Base Camp calls them directly); `RK` is the stable face for new games. Everything below exists in Base Camp today under the name in brackets.

**Start and modes**
- `RK.init({ game, root, ui, words, keys })`: `game` is the hooks object (below), `root` is the DOM overlay root (`#ui`), `words` overrides player-facing strings, `keys` the storage prefix (`'base-camp'` keeps every existing key).
- `RK.arAvailable()`, `RK.startAR({ camera: true|false })` (`arStart`; `camera: true` asks for `camera-access`, needed by stickers, snapshots, depth, recognition), `RK.endAR()` (`arEnded`), `RK.startPractice({ house: true })` (`startPractice`, `houseStart`), `RK.mode` = `'title' | 'ar' | 'practice'`.
- `RK.frame(dt, xrFrame)` is called by the kit's own animation loop; the game never runs its own loop (`frame`).

**Surfaces and zones**
- `RK.zones` (`G.zones`): `{ id, name, type: FLOOR|TABLE|SHELF|SILL|SMALL|CEIL, y, cx, cz, ang, w, d, area, ceil, room, land }`.
- `RK.on('zone', Z)` new surface, `RK.on('zoneGrow', Z)`, `RK.on('zoneRename', Z)` (`liveSync`, `liveGain`, `liveReclass`).
- `RK.zoneWorld(Z, u, v)` / `RK.zoneLocal(Z, x, z)` (zone frame <-> world; everything a game places on a surface is stored in its zone's frame, so a relock moves it for free: the "one idea that makes returning work").
- `RK.surfaceAt(screenX, screenY)` (`surfacePick`), `RK.groundPick`, `RK.planePick`, `RK.toScreen`.
- `RK.heights()`: floor, seat, table, top-of-back heights from the zones (Sofa Keep's keep and approach), `RK.edges(Z)`: the cells on a zone's edge (`landEdge`; Sofa Keep's climb points).

**Land grid and clutter**
- `RK.land(Z)`: the 2 cm grid (`st` 0 off / 1 clear / 2 clutter, `ht` clutter height cm, `dist` disturbance, `calm`), `RK.isClear(Z, u, v, r)` (`zoneClear`), `RK.clearArea(Z)`, `RK.clutter(Z)` (objects: `landComps`, `objClass` can / box / big) for cover, obstacles and climbing.
- `RK.on('changes', events)` after a lock (`captureScan`): `removed`, `placed`, `moved`, `gone`, `new`, each with zone, cells and size class.

**Room memory and relock**
- `RK.rooms()` (`HOMES.rooms`), `RK.room` (current), `RK.newRoom()`, `RK.useRoom(id)`, `RK.findRoom()` ("Not sure?": `G.finding`), `RK.deleteRoom(id)`, `RK.renameRoom`, `RK.restoreMap(id)` (`rgRestore`), `RK.chooser()` (the start chooser).
- `RK.on('lock', { how: 'sticker'|'snap'|'surfaces'|'worldmap'|'asked', pose, err })` (`relocLock`), `RK.on('relock', ...)` after a sleep (`RF`), `RK.on('hide')` / `RK.on('show')` (the camp hides while the room is found again), `RK.on('lost')`.
- `RK.on('askRoom', ...)`: the kit's own prompts (have you moved, is this a new room, I can't find the camp) with words from `words`.
- Stickers: `RK.stickers()` (owners), `RK.giveSticker(id)`, `RK.forgetSticker()`, `RK.stickerSeen` (last sighting), the print pages `stickers.html` / `screen-sticker.html` move to `room-kit/` and each game links them.
- Snapshots: automatic; `RK.snapshots(roomId)` for counts; `SNAP.disabled` switch.
- Saving: the kit writes the room map (`saveMap`, room guard backups, probation `rgHold`), the game writes its own save when the kit says it is safe (`RK.game.save(roomId)` is only called when the room is lined up, the "never while returning and not locked" rule).

**Depth occlusion**
- `RK.depth.on` (setting, `bc-depth`), `RK.depth.state`, `RK.depth.report()`. Automatic: the depth-only mesh is in `scene` and hides anything the game draws behind real things. A game marks a mesh that must never be hidden with `renderOrder` above it or `material.depthTest = false` (HUD things).

**Practice room and dolls' house (desktop)**
- `RK.startPractice({ house, room })`, `RK.house.go(k)`, `RK.props` (movable toy furniture), `RK.addPropDef(name, def)` (a game adds its own props: Base Camp's sink and toilet, Sofa Keep's sofa and coffee table), `RK.comeBackLater()` (moves the house: tests relocalisation on a desktop).
- Sofa Keep needs the Lounge (sofa, coffee table, rug) as a first-class practice room: `HOUSE_ROOMS.lounge` already exists.

**Controls**
- `RK.desk` (mouse, trackpad, keys, controller; `deskOn`), `RK.pad()` (`padRead`: merged gamepads with deadzone), `RK.pick(x, y)` (what is under a screen point: zone, prop, or a game object the game registered with `RK.pickable(obj)`), `RK.on('tap', ...)`. The game owns what a tap *does*.

**Developer panel, field report, test hooks**
- `RK.dev.open()`, rows 1 to 9 as today, plus `RK.game.devRows()`.
- `RK.report(note)` (`buildReport`, kind `<game>-field-report`), `RK.rec` (ring buffers), `RK.game.reportExtra()`.
- `window.__rk` (test hooks for the kit, like `window.__g`); Base Camp keeps `window.__g` with the same names so no Base Camp test changes.

**Game hooks (`RK.game`, every one optional)**
`tick(dt)`, `render2()`, `onArStart()`, `onArEnd()`, `onZone(Z)`, `onChanges(events)`, `onAlign()`, `onLock(info)`, `onHide()`, `onShow()`, `save(roomId)`, `load(roomId)`, `forget(roomId)`, `chars(roomId)`, `roomAgeS(roomId)`, `splitRoom(groups)`, `onRoomLeave(k)`, `onRoomEnter(k)`, `followables()`, `cards()`, `botActions`, `devRows()`, `reportExtra()`, `sfx(kind)`, `toast(msg)`.

## 5. How a game plugs in
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="room-kit/core.js"></script>
<script src="room-kit/vision.js"></script>
<!-- ... the other kit files in the order of section 3 ... -->
<script src="room-kit/loop.js"></script>
<script> /* the game: rules, units, its UI */
  RK.init({ keys: 'sofa-keep', ui: document.getElementById('ui'), game: { tick(dt) { /* waves, turrets */ }, onLock() { /* the keep comes back */ }, save(id) { /* ... */ } } });
</script>
```
- **Folder layout:** `games/room-kit/` (source of truth: `*.js`, `stickers.html`, `screen-sticker.html`, `vendor/js-aruco2/`, `webxr-polyfill.js`, `tests/`, `tools/kit-check.js`, `demo.html`). Each game folder gets `room-kit/` as a real copy (not a symlink: the habitual `cp -r` deploy into gh-pages, the iOS app bundle and Windows checkouts would break a symlink, and a shared `/room-kit/` at the site root would let one game's kit change break another game that was not retested). Edit the kit only in `games/room-kit/`, then run `node games/room-kit/tools/kit-check.js --sync`; the check mode fails if any game's copy differs.
- **Versions:** each kit file starts with `/* room-kit <file> v<N> */`; `RK.version` lists them; the developer panel and the field report show them, so a report from the iPad says which kit it ran.
- **three.js:** r128 global `THREE`. B&B is r128. Vigil is three 0.147: the kit uses only BufferGeometry, basic materials and Matrix4 / Vector3 calls that exist in both; Vigil is retested before it moves (or moves to r128).
- **Storage keys:** the kit's keys are `<keys>-...`; for Base Camp they stay exactly as today (`base-camp-map-v1`, `bc-rooms-v1`, `bc-rec-v1`, `bc-depth`, `bc-dev`, `bc-places-v1`, `bc-mapold-*`), so no save is touched. Two games on one origin keep separate rooms registries unless they choose to share (a later "your rooms" feature: Sofa Keep could reuse rooms Base Camp already knows, stickers included).
- **The HTML shell:** the kit expects `#ui` (the overlay root), `#arStatus`, `#arLog`, `#nroom`, `#ask`, `#chooser`, `#devPanel` (made by the kit if missing). `kit.css` carries the kit's styles (`body.inar`, prompts, dev panel, the desktop camera buttons).

## 6. How the kit is tested
- **Keep `ar-fake.js`** (the fake WebXRKit native side with the fake shed, planes with uuid, estimated planes, stickers via `marker-render.js`, textures via `texture-render.js`, origin jumps `__W`, `__noCamera`, `__TEX`, `__MARKS`). It becomes `games/room-kit/tests/ar-fake.js`; Base Camp's `tests/ar-fake.js` becomes a one-line `module.exports = require('../../room-kit/tests/ar-fake.js')` (later step).
- **A kit demo page** `games/room-kit/demo.html`: the kit plus a 60-line "game" that draws a cube on every zone and a flag on the land grid's biggest clear area. It is the kit's own test target, so a kit test never depends on a colony.
- **Kit suites** (adapted from Base Camp's, run against `demo.html`): `kit-scan` (scan-quality: two same-height desks stay two zones), `kit-reloc` (auto-practice's come-back-later + auto-ar's three returns, numbers only), `kit-roomfix` (roomfix sections 1 to 5: boundaries, sleep relock), `kit-marker` (marker + stickerkey without colonies: fix accuracy, lock, jump between rooms), `kit-snapshot`, `kit-depth`, `kit-house` (house + desktop camera + controller + 400 camera views), `kit-dev` (panel rows, copy numbers), `kit-vision` (pure node test of `vision.js`: synthetic ArUco picture -> `stkRefine` / `stkPose` / `stkFit` error, FEAT self-match; no browser, seconds).
- **Base Camp's suites stay the integration proof** and are not weakened. Each migration step names its suites (below). Always also `noxr.js` ("errors: none") and `diagclash2.js` ("AR ready").
- **`tools/kit-check.js`** (no dependencies, seconds): every game's `room-kit/` copy equals the source; no forbidden top-level name in any kit file; no top-level statement other than declarations in a kit file (so nothing runs at load time); every kit file parses.
- One suite at a time on the shared machine; `BC_ROOT=<copy>` for long runs while editing (copy with `cp -r`, which copies `room-kit/` too).

## 7. Migration plan (Base Camp keeps working after every step)
Every step: zero behaviour change for Base Camp, BUILD stays `'build 30'` until a step changes behaviour on purpose, `kit-check` + `noxr` + `diagclash2` + the named suites green, one commit, pushed. A step that fails is reverted, not patched forward.

| Step | What moves | Risk | Suites |
|---|---|---|---|
| **1 (done here)** | `vision.js`: sticker maths + `FEAT` (pure functions, no game state). `kit-check.js`. | lowest: pure maths | marker, stickerkey, snapshot, noxr, diagclash2 |
| 2 | `recorder.js` (FIELD RECORDER without WONDERS), `dev.js` (DEVELOPER MODE). Both only *read* other state at run time. `REC` must load before every file that does `REC.x = []` at the top level (sticker, snapshots, bounds): `recorder.js` loads first. | low | depth (section 6: dev panel), auto-ar (field report round trip), marker |
| 3 | `desk.js` + `house.js` + `practice.js` (desktop only, `deskOn()` false in AR) with `deskFollowNext`, `houseVisit`, `houseArrive`, `f10Cam` left in Base Camp | low-medium (practice tests touch everything) | house, room, auto-practice, first10, practice, fun |
| 4 | `ar.js` (AR + DIRECT + iPad fix) with `RK.game.onArStart / onArEnd` replacing the direct calls | medium: HelloXR | auto-ar, ar-look, scan-quality, ceiling, diagclash2 on the real polyfill |
| 5 | `scan.js` + `land.js` + `align.js` (pure room maths with three.js meshes for paint) | medium | scan-quality, room, ceiling, auto-practice |
| 6 | `snap.js` + `sticker.js` pipeline (policy functions that read the colony go behind `RK.game.roomAgeS`) | medium | marker, stickerkey, snapshot, roomfix |
| 7 | `reloc.js` + `bounds.js` + `rooms.js` (+ `RK.game.save/load/forget`) | high: saves | roomguard, multi-room, roomfix, totem, places, return, auto-ar |
| 8 | `map.js` + `change.js` + `auto.js` (`captureScan` emits events, `applyChanges` consumes them) | high: change detection | auto-ar, room, roomguard, water (spots), fixes19 (notices) |
| 9 | `depth.js`, `camera.js`, `places.js` (gate), `input.js`, `loop.js`; `RK` facade + `demo.html` + kit suites | medium | depth, recog, places, house, every suite once (the full list) |
| 10 | Sofa Keep v1 on the kit (one 10-minute night in the Lounge of the dolls' house first, then AR) | new game | kit suites + a Sofa Keep suite |

Steps 2 to 5 are pure moves (names unchanged, still globals). Steps 6 to 9 add the hooks: each hook first goes in *inside* Base Camp (a call that Base Camp answers itself), is proven, and only then does the code move. B&B's older AR copy is replaced by the kit after step 9 (its own suite). Vigil moves last.

**Known hazards to watch in every step**
- Top-level code that runs at load: `REC.stk = []` (sticker), `REC.snap = []` (snapshots), `REC.bound` / `REC.relock` (bounds) all need `REC`; `DEPTH_WORKER` is a string; `STK_T0 = Date.now()`. A moved block's top-level initialisers may only use the kit files loaded before it.
- `persistSoon` wraps `addSpot`, `removeSpot`, `answerGuess`, `libAdd` ... through `window[n]`. Moved functions stay function declarations (window properties) so the wrap still works.
- `scout-test.js` slices `index.html` between `const SCOUT16_TEX` and `function mkColonist(c)`: those stay in Base Camp.
- The test server (`tests/lib.js`) only serves the game folder: the per-game `room-kit/` copy is what makes the kit reachable without touching it.
- Any HTML or iframe that loads files by URL (the sticker library's iframe, `stkLoad`, builds absolute URLs from `location`): `vendor/js-aruco2` moves with `sticker.js` in step 6, and its URL is the kit folder's.

## 8. Sofa Keep's first needs from the kit (so the order above serves it)
- Heights and edges of the sofa (seat, top of the back, front edge): zones + `landEdge` (steps 5, 9).
- The approach on the floor and rug, and real clutter as cover: land grid and clutter (step 5).
- Things behind cushions: depth (step 9; already works in Base Camp).
- The keep comes back where it was: relock, stickers, snapshots (steps 6, 7).
- Desktop play in the Lounge with mouse, keys and a pad: house + desk (step 3).
- Overnight marks ("the world changes while you are away"): the room map's per-cell `calm` / `dist` and the game's own save per room (step 7).

## 9. Step 1, done on this branch
- `games/room-kit/vision.js`: `stkGray` `stkAt` `stkRefine` `stkIntr` `stkRot` `stkMul` `stkRes` `stkGN` `stkPose` `stkWorldPose` `stkDetect` `stkSolve` `stkInv` `stkRes2` `stkFit` and `FEAT`, moved byte for byte from `index.html` (lines 6559-6652 and 7119-7183 at build 30). Base Camp loads its copy `games/base-camp/room-kit/vision.js` with a plain `<script>` before its own script; `index.html` keeps a one-line note where each block was.
- `games/room-kit/tools/kit-check.js`: `--sync` copies the kit files into each game listed in `KIT_GAMES` (today: base-camp); without it, it checks copies, forbidden names and load-time statements.
- Results: see the commit message and the report.
