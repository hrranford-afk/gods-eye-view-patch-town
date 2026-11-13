# Inputs for order seasons-1, stage 5 (robot play-testing on the Mini)

**Game:** https://hrranford-afk.github.io/gods-eye-view-patch-town/base-camp/ (build 13). It is one HTML page.

## How a robot plays one colony, with no person and no AR
1. Open the page. Clear the page's local storage, then set `localStorage['bc-wxchoice'] = 'no'`, then reload.
2. Click `#bMore`, then `#bPrac`. This opens the practice room, which scans and settles by itself.
3. Wait until `window.__g.G.settlements.length > 0`. That takes up to 2 minutes.
4. Run game time without waiting: `window.__g.simulate(seconds, 0.5)`. Run it in chunks of 600 seconds and record
   the measures below after each chunk.
5. **Hour: CLOCK, not held** (town lesson, 13 Nov). Do NOT set `ENV.hourOverride`: a held hour never ends the night, and every
   colony started at night stayed at 3 settlers. Since build 14, `simulate` moves the sun with the simulated time. To vary
   the play, vary the start time with `window.__g.ENV.dateOverride` (a date and time) instead.

## Measures to record after each chunk
Read these from `window.__g.G`:
- `settlements.length`
- for each settlement: settlers, mood, resources (wood, food, seeds, water, tin), and buildings by type
- open requests: `requests.length`
- milestones reached

Copy the exact fields from the card text shown on screen if the names differ. The card in the top left shows
"settlers N · mood N%" and "wood N · food N · seeds N · tin N".

## What the robot looks for
- **Stalls:** 30 minutes of game time where nothing grows (settlers, buildings and milestones all flat).
- **Mood crashes:** mood under 25% for more than 10 minutes. In one cloud run mood fell to 10% after 2 hours.
- **Caps:** a resource stuck at the same number for an hour. Wood and food sat at 24 in one cloud run.
- **First 5 minutes:** what happens, and when (first hut, first request, first milestone).

## Size
- Canary: 1 colony for 2 hours of game time. The town reads it by eye before the full run.
- Full run: 200 colonies for 8 hours of game time each, at different hours. In WebKit, run 20 of them.
- Also record any page error, with the engine it happened in.

## Output
- `pacing.json`: one row per chunk per colony.
- `PACING_REPORT.md`: medians and the worst 10 colonies, the stall, crash and cap points, and the first-5-minutes timeline.
