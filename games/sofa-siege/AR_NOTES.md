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

## Proven by the fake (tests/ar-test.js, 32 checks)

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
- No page errors.

The fake is a small hand-written WebXR (`tests/ar-fake.js`): one flat disc for the table, a camera the test moves, perfect tracking. It is not the WebXRKit polyfill that Base Camp's tests use.

## NOT TESTED on a real iPad (most of it)

1. **Whether the session starts in HelloXR at all** with these features. Base Camp asks for `entityTypes: ['plane']` on its hit-test source; this asks for the default.
2. **The dom overlay.** Base Camp's notes say HelloXR's polyfill "can start without wiring the overlay" and it connects the overlay itself. This build does NOT do that. If the buttons are missing in AR, that is why. There are no in-scene buttons as a fallback: without the overlay there is nothing to press.
3. **Touches.** In AR the taps are read from the overlay root (`#ui`). Whether HelloXR delivers pointer events there, and whether a tap on a button also reaches the table, is unknown.
4. **The camera picture behind the game.** The canvas is see-through and the page background is clear in AR. Whether HelloXR shows the camera behind it, or a black page, is unknown.
5. **three.js r128's own XR code in HelloXR** (`renderer.xr.setSession`). Base Camp uses the same call, so this is the likeliest part to work.
6. **Hit tests on a real table:** how fast a plane is found, whether the ring jitters, whether it lands on the floor through a glass table.
7. **Scale and drift:** whether 100 cm really matches a 1 m table, and how far the game slides when you walk round. HelloXR's anchors are emulated in JavaScript and its origin jumps after sleep (Base Camp's notes), so expect the table to move after the iPad sleeps. Use Re-place table.
8. **Tracking loss:** Base Camp's notes say HelloXR "sends no tracking state". If it keeps sending a stale pose, the 1-second rule will never fire.
9. **Frame rate, heat and battery.** About 63,000 triangles and 170 draw calls; never measured on an A-series chip.
10. **Shadows on the invisible plane** against a real table top: may look too dark, too faint, or float.
11. **Sound** in the app's web view.
12. **Portrait and landscape, and rotating the iPad mid-session.**
13. **Two players in AR.** Not built. AR is one player against the robot.

## What Harry should try, and what to look for

Open the game in HelloXR with `?dev=1` on the end of the address.

1. **Title.** Is there a "Play on my table (AR)" button? If not, note the small line under Play.
2. **Press it.** Does the camera picture appear? Is the bar "Find your table" visible at the bottom? Read out the dev line (bottom left).
3. **Point at the table.** Does a white ring appear on the table top? How long does it take? Does it sit on the table or on the floor?
4. **Tap.** Does a faint table ring with a green hill appear where the white ring was?
5. **Turn and size.** Drag sideways, twist with two fingers, move the slider. Set it so the faint ring matches your table's edge. What size did that take?
6. **Lock table.** Do the mats, mice and build buttons appear? Does the dev line say `anchor xr anchor` or `anchor fixed pose`?
7. **Build.** Tap a wall on the mat, then tap the table. Does the wall land under your finger? Try it from the other side of the table.
8. **Walk round the table.** Does the camp stay put on the table, or slide? By about how much?
9. **Fight.** Send squad to the hill, drag back for the lobber, mend. Do all three work by touch?
10. **Cover the camera for two seconds.** Does it say "Tracking lost" and pause? Does it come back?
11. **Lock the iPad for 10 seconds and unlock.** Where is the table now? Does Re-place table fix it?
12. **Frame rate.** What does the dev line say for fps during a fight? Does it say "shadows off"?
13. **Leave AR.** Does the title come back?

For each step, a photo of the screen and the dev line text is the most useful thing to send back.
