# The Gift: builders' overview (read this first)

One page. It gives every builder the whole picture so you can make good calls and streamline the story to make it genuinely playable. Longer notes are listed at the end.

## What we are making
The Gift: a cosy, hopeful island game on a tabletop world. You are given a small island and a lot of in-game money, mostly delivery-only credit, from a hidden helper that is never shown and never explained. Old robots have been collecting washed-up stuff for years. You repair things, build, get a boat, weather storms, and decide whether to stay, move or buy a new island. Credit thins over about four years so the island must stand on its own. First target: a playable first day, then a boat, then a storm haul, then robot life.

## What is FIXED (do not change; ask the owner via the hand-back if you think it must)
1. Tone: hopeful; nothing gory or cruel; danger only when the story needs it.
2. Robots are relics: no faces, no eyes that look alive, no speech, no feelings; only motion, a status light and work.
3. The helper is never shown, has no face, never speaks, and the game never explains it. Never name it as an AI in the first day.
4. People are counted, never tracked: no names, no personal stats, no individual trails.
5. Letters and messages use only our own words, short and plain.
6. All money is in-game. Delivery credit buys deliveries only, never land; only cash buys land.
7. No real brands or real place names in the game.
8. Default page unchanged: hash 8d962c0c, 88,790 triangles; tests/look-test.js is never edited.
9. Hands-on first, then delegate: any job can be done by the player or handed to a worker or robot.
10. Realistic defaults: food, water and fortification are real (not every island has a spring; hunger is gentle but real).

## What is OPEN (change it if it makes the game more playable; log every change)
1. Order and pacing of the first day, the length of each beat, what the player is told and when.
2. Wording of letters, labels, hints and bottle messages (keep our own words, keep it short).
3. How many catalogue items, which builds appear first, costs and delivery times (tuning numbers are guesses).
4. How the robot mission works, as long as it is short, clear and fun.
5. Island layout details, as long as the level checker passes.
6. Anything that is confusing, slow, or a dead end for a first-time player: simplify or cut it.
7. What counts as a placeholder: label it honestly and move on.

## How to change the story or flow
Keep a short CHANGELOG.md for your job: what you changed, why (one line), what it replaced, and whether it touches a FIXED rule (it must not). The owner reads the log and can veto any change. Prefer cutting to adding. If a beat needs more than a day to get right, cut it and say so.

## Playable means
A new player can: arrive, understand what to do next without a manual, get a small win in the first 3 minutes, never be stuck, finish the day in about 15 minutes, and want to come back. Test it by actually playing it through (scripted if needed) and write down every dead end you hit.

## Where things are
Vision: THE_GIFT_VISION.md. Opening hour script: THE_GIFT_OPENING_HOUR.md. Plan and order: CORE_LOOP_PLAN.md. Design and economy: THE_GIFT_DESIGN.md. Ideas and decisions: EVOLUTION_TREE.md (last sections). Story sources and beats: GIFT_STORY_SOURCES.md. Tools: landform/, foundry/, globe/, ecosystem/, dig/, fortify/, gift/. Pages and presets: ULTRA_TIER.md.

## Rules for every job
Push in small safe steps. Honest pictures with flaws. Software GL only: never claim real-GPU speed. Never run prettier. Commit only your own files. Hand back: commit hash, tests, pictures, placeholders, what to press, open taste questions, and your CHANGELOG.
