# Round Table Kingdom: AR mode v0 (19 Nov 2026)

**Status in one line: the game's own AR logic passes its tests against a fake WebXR on this machine. NOTHING here has run in HelloXR or on a real iPad.**

The practice table is still the default. AR starts only from the title button "Play on my table (AR)", which shows only when `navigator.xr.isSessionSupported('immersive-ar')` says yes. Everywhere else (Safari) the title says "AR needs the HelloXR app. Practice table works here."

## How it works

- **Session:** `immersive-ar` with `hit-test` required, `dom-overlay` and `anchors` optional. The overlay root is `#ui`, which holds every button and text.
- **Find your table:** a white ring follows the hit test from the middle of the screen (flat tops only). Tap to put the table centre there. Drag sideways or twist with two fingers to turn it; the slider or a pinch sets 60 to 140 cm across. 100 cm is 160 mm per game unit. Then "Lock table".
- **After the lock:** the whole game hangs under one group at that place, turn and size. If the device makes an XR anchor the table follows it; otherwise the pose stays fixed. The dev line says which.
- **What is drawn:** a faint ring for the table edge, the cloth mats, the hill and the pieces. No table top and no room. Shadows fall on an invisible plane at table height.
- **Touch:** a tap becomes a ray from the XR camera into the table plane, so pick, place, send squad, lobber drag and mend are the same code as on the practice table. Camera buttons are hidden.
- **Re-place table** (left side, during build, at "Camp ready", or when paused): unlocks the table; the match waits and keeps everything.
- **Tracking lost:** no camera pose for over 1 second pauses the match and says so; it goes on when the pose returns.
- **Card layout:** if a locked card layout is saved on the device, it is offered right after the lock.
- **Guard:** pixel ratio capped at 1.5, shadow map 1024. If frames stay over 40 ms for 3 seconds, shadows go off and the dev line says so once.
- **`?dev=1`:** a small line with the session state, hit tests a second, frame rate, draw calls and the anchor kind.

## Proven by the fake (tests/ar-test.js, 73 checks)

- The page starts with no WebXR, with WebXR but no AR, and when the session refuses to start.
- The session starts with the right features; the practice room is hidden.
- The reticle appears only when the camera points at the fake table.
- Tap places, drag turns, the buttons turn, the slider resizes within 60 to 140 cm, Lock locks.
- With anchors offered the lock makes one; without, it keeps the fixed pose. Without dom-overlay the session still runs.
- A piece picked and placed by screen taps lands within 3 mm of the tapped table spot, from three different camera poses. The screen points come from the fake's own camera maths, not from the game.
- Tracking loss pauses and resumes. Re-place table moves the table and keeps the match.
- A full bot match runs inside the session to a winner, with no stuck mouse.
- A saved card layout is offered after the lock and used.
- Leaving AR goes back to the title, and the practice table still plays.
- **In-scene buttons:** with no overlay (1.5 seconds in), or with an overlay that never gets a touch, flat buttons are drawn along the bottom of the view and every tap and drag comes through the XR `select` events. A whole flow was played that way twice: place, turn, size, lock, build by tap and by drag, Undo, Done, Start battle, Squad, Lobber drag, Mend, Pause, Re-place table, Exit AR.
- **Exit AR** ends the session, and tidies up by itself if the session never answers.
- **Tracking loss with no tracking state:** a pose that is exactly unchanged for 2 seconds while `devicemotion` says the iPad moves counts as lost; an iPad lying still does not. A jump of over 1 m in one frame pauses, asks "Is the table still in place?" and offers Re-place table; the table is not moved.
- **The guard:** does not trip at 16 ms a frame, trips after about 3 seconds at 60 ms a frame, and says so once.
- **Copy AR log** gives build, user agent, features, overlay, input path, anchor kind, frame rate, hit tests, table size, every pause and loss with its time, and page errors. No picture and nothing about the room.
- No page errors.

The fake is a small hand-written WebXR (`tests/ar-fake.js`): one flat disc for the table, a camera the test moves, perfect tracking. It is not the WebXRKit polyfill that Base Camp's tests use.

## NOT TESTED on a real iPad (most of it)

1. **Whether the session starts in HelloXR at all** with these features. The hit-test source asks for `entityTypes: ['plane']` as Base Camp does, and falls back to the default if that is refused.
2. **The dom overlay.** Base Camp's notes say HelloXR's polyfill can start without wiring the overlay. This build copies Base Camp's fix (it finds the polyfill's device and calls `setDomOverlayRoot`), and the dev line then says `overlay connected by the game`. That path cannot run in the fake. If the overlay is missing or deaf, buttons are drawn in the scene instead; that fallback depends on HelloXR sending XR `select` events for screen taps, which is also unknown. If it sends neither page touches nor selects, nothing can be pressed.
3. **Touches.** In AR the taps are read from the overlay root (`#ui`). Whether HelloXR delivers pointer events there, and whether a tap on a button also reaches the table, is unknown.
4. **The camera picture behind the game.** The canvas is see-through and the page background is clear in AR. Whether HelloXR shows the camera behind it, or a black page, is unknown.
5. **three.js r128's own XR code in HelloXR** (`renderer.xr.setSession`). Base Camp uses the same call, so this is the likeliest part to work.
6. **Hit tests on a real table:** how fast a plane is found, whether the ring jitters, whether it lands on the floor through a glass table.
7. **Scale and drift:** whether 100 cm really matches a 1 m table, and how far the game slides when you walk round. HelloXR's anchors are emulated in JavaScript and its origin jumps after sleep (Base Camp's notes), so expect the table to move after the iPad sleeps. Use Re-place table.
8. **Tracking loss:** Base Camp's notes say HelloXR "sends no tracking state". The frozen-pose rule needs `devicemotion` events, which iOS gives only after a permission prompt that this build does not ask for; without them a frozen pose is not noticed. A stale pose that still drifts a little is not noticed either.
9. **Frame rate, heat and battery.** About 63,000 triangles and 170 draw calls; never measured on an A-series chip.
10. **Shadows on the invisible plane** against a real table top: may look too dark, too faint, or float.
11. **Sound** in the app's web view.
12. **Portrait and landscape, and rotating the iPad mid-session.**
13. **Two players in AR.** Not built. AR is one player against the robot.

## What Harry should try (8 steps), and what each outcome tells us

Open the game in HelloXR with `?dev=1` on the end of the address. The green dev line near the top left starts with the build label (`rtk-ar-2 · 19 Nov`); if it says something else, the page is an old copy.

| # | Do this | If it works | If it does not |
|---|---|---|---|
| 1 | Look at the title. Is there "Play on my table (AR)"? | HelloXR reports immersive-ar to the page. | The small line under Play says why. WebXR is not reaching the page: nothing else can be tried. |
| 2 | Press it. Do you see the camera picture, and "Find your table" at the bottom? | The session starts and the page is see-through. | Black screen: the camera is not shown behind the page. A message on the title: the session was refused; read it out. |
| 3 | Wait two seconds. Where are the buttons: small rounded ones (the page's) or big flat ones along the bottom (drawn in the scene)? Read the dev line: `overlay ...` and `input ...`. | Page buttons and `input page touches`: the overlay works. Big flat buttons and `input xr select`: the overlay is missing or deaf, and the fallback took over. | No buttons at all after a tap: neither path works. Press nothing else; send the dev line. |
| 4 | Point at the table. Does a white ring sit on the table top? Tap. Does a faint ring with a green hill appear there? | Hit tests and taps work. `hits/s` in the dev line shows how many. | No ring: no flat surface found (try more light, a table with some pattern). Ring on the floor: the table top is not seen as a plane. |
| 5 | Turn it, size it to your table's edge, press Lock table. Note the size in cm and whether the dev line says `anchor xr anchor` or `anchor fixed pose`. | The size tells us if 160 mm per unit is right. | If Lock does nothing, say which buttons you see. |
| 6 | Build: tap a wall on the mat outline, then tap the table. Do it again from the other side of the table. | The wall lands under your finger from both sides: the tap ray is right. | Lands off to one side by the same amount each time: the camera picture and the 3D view are not lined up. |
| 7 | Press Done, Start battle, and play a round: Squad, Lobber (drag back), Mend. Walk round the table once. Then lock the iPad for 10 seconds and unlock. | Camp stays on the table: tracking and the anchor hold. After unlock you may get "The view jumped": that is the game noticing. | Camp slides as you walk: no real anchor. Camp is somewhere else after unlock with no message: the jump was under 1 m; use Re-place table. |
| 8 | Press Copy AR log (left side, or the big "Copy log" button), paste it into a message. Then Exit AR. | We get the numbers: frame rate, input path, every pause. The title comes back. | If Exit AR does not bring the title back, close the tab; tell us. |

A photo of the screen at steps 3, 4 and 7 is worth more than a description.
