# Base Camp: developer handover

First prototype. Branch `game/room-colony`, folder `games/base-camp/`. One file (`index.html`, about 1,500 lines, sectioned by `// =====` banners). three.js r128 from cdnjs. Read README.md first for the player flow.

## Sections of index.html (in order)
1. **basics, ALMANAC, ENV, sound**: `COLONY_ALMANAC` (all story data), `ENV` (sun, clock, weather, derived flags `hot/cold/rain/dim/windy/night/grow`), `envUpdate()`, weather fetch (Open-Meteo), sfx synth.
2. **three basics, canvas textures, SCAN**: `scanHit` (one hit-test point), `bandFor` (3 cm height bands), `closeHoles`, `extractZones` (connected regions, ids kept by voting), `classify`, `ensureDist`/`zoneClear` (distance to the zone edge), `paintBands` (overlay textures), labels.
3. **MODELS**: toy low-poly models (`mkColonist`, `mkTree`, `mkTent`, `mkHut`, `mkWell`, `mkFarm`, `mkLookout`, `mkStation`, `mkShade`), `KINDS` table (footprint, wood cost, work seconds), sprite particles (`puff`).
4. **COLONY**: `G` (game state), settlements (`newSettlement`, things, colonists), the utility AI (`chooseJob` scores needs and chores, `startJob`, `runJob`), `simSettlement(S, dt, E, quiet)` (growth, needs, planner, arrivals, thriving, requests), cable cars (`makeLink`, `linkStep`, `crossStep`, `arriveAt`).
5. **visuals, save/load/re-place**: per-frame animation; `serialize`, `restoreSettlement`, `catchUp`, the replace flow (`beginReplace`, `placeGhost`, `lockGhost`).
6. **AR mode** (copied from Baguettes & Ballistics): iPad user-agent fix, `arLog`, `arStart` (overlay fix included), `arEnded`, `arFrame` (5 hit-test rays, light estimate). **PRACTICE ROOM**: virtual room, auto-scan path, virtual hit test with the same `scanHit`.
7. **UI, input, main loop, `window.__g`** (test hooks).

## Key design points
- **World = AR local space in metres.** The scene is never scaled; colonists are about 2.5 cm tall. Zones are at their real height.
- **Settlement-local frame.** Each settlement is a `THREE.Group` with transform `tf {x, z, y, yaw}`; every thing and colonist is stored in local metres. Re-placing a saved colony is just recovering `tf`. `adj` is the player's turn on top of the zone's main axis.
- **Sim is independent of rendering.** `simSettlement` runs in 0.25 s steps live; for catch-up it runs 5 s steps with `quiet=true` (no toasts, particles, sound) and the average-day environment `CATCH`. Cap: 90 minutes.
- Growth: tree 300 s to grow (x1.8 when tended or in rain), crops 180 s; both multiplied by `ENV.grow` (daylight x sun x cold x rain), which is 0 at night.
- Colonists never die: needs bottom out and they slow down and get glum, which triggers requests.
- Cable car: cost 6 wood; settlements must be `thriving`; stations are ordinary things in each settlement; the gondola is run by `linkStep`; riders are re-parented onto the gondola; new settlements start with `awaiting = true` (hidden tent) until the first settlers arrive.
- Save key `base-camp-save-v1` (localStorage, try/catch everywhere). Autosave every 10 s and on `pagehide`.

## The almanac (future hook for the owner's LLM community)
`COLONY_ALMANAC` in `index.html` has built-in defaults. If `almanac.json` sits next to the page (served over http/https; it is not fetched from `file:`) it is fetched at start; any of the three arrays it contains **replaces** the default array of the same name; unknown keys are ignored; a missing or broken file is ignored silently. No networking beyond this one same-origin fetch. Format:

```json
{
  "colonists": [
    { "name": "Pip", "personality": { "work": 1.3, "social": 0.8, "lazy": 0.6 }, "likes": ["tree", "well"] }
  ],
  "requests": [
    { "id": "water", "icon": "drop", "text": "We need water!", "when": "needWater", "give": "water", "joy": 0.3, "cooldown": 240 }
  ],
  "events": [
    { "id": "picnic", "text": "The colonists are having a picnic.", "hours": [12, 14], "chance": 0.5, "needs": "rain", "effect": { "joy": 0.15, "seeds": 2, "wood": 1, "food": 1 } }
  ]
}
```
- `colonists`: handed out in order to new settlers (names repeat with a number when the list runs out). `personality`: weights on how much they like work, company, lazing (1 = normal). `likes`: kinds of things they wander to (`tree farm well hut tent lookout station`).
- `requests`: `when` is one of `needWater noSeeds hot cold noWood cantReach bored night` (conditions are code in `CONDS`; adding a new one is a one-liner there). `give` is one of `water seed shade wood cheer cablecar` (code in `giveRequest`). `icon` is one of `drop seed sun log flame cable heart food zzz hammer bang` (drawn in `ICONS`). `joy` is the asker's happiness reward; `cooldown` seconds before it can be asked again.
- `events`: a small happening during `hours` ([from, to) on the 24 h clock), `chance` per window, optional `needs: "rain"`; `effect` adds to every colonist's joy, or to the settlement's seeds, wood or food.
- Colonist data never leaves the device. Colonists' names and personalities come only from this object.

## Tested here (Playwright, no real device)
See the final report in the session; harness scripts live in the session scratchpad (`bc/ar.js` is the real-polyfill AR harness with a fake native iOS side returning a floor at y=-1.2 (3 x 3 m), a desk at y=-0.45 (1.2 x 0.6) and a shelf at y=+0.2 (0.8 x 0.25); `bc/prac.js` is the practice-room run).

## Needs a real iPad
- Hit-test density on a real scan (ARKit planes cover whole surfaces, so it should fill faster than the fake); whether five rays per frame is too many at the real frame rate.
- Whether shelf and sill planes are detected at all (narrow ones may not be).
- Light estimate range (clamped 0.6 to 1.4 like Baguettes), what counts as "hot" and "dim".
- Touch layer inside the DOM overlay (drawing the cable car line, press-and-hold watering).
- Tracking drift over a long session (no anchors): the colony may slide off its surface; re-scan and re-place.
- Geolocation permission prompt in the app web view (may be blocked by the host app; then the town picker is the fallback).
- Performance: about 100 meshes per settlement; the overlay textures are 250 x 250 per band.

## Cut from this prototype
Battles (artillery, turn-based), pass-the-iPad multiplayer, a ghost preview while placing blueprints, colonist-to-colonist trading by cable car (only migration), more than one colonist job at a time per building, occlusion by real objects, a real "world map" re-placement, a proper settings screen.

## Known bugs / rough edges
- Colonists can stand in each other's way (no collision between them).
- A re-scan during play (Scan more) can split or merge zones; settled zones keep their id only if enough area overlaps.
- Practice-room orbit uses mouse drag only (no pinch).
- Zone classification is rule based; a stool seat or a chair may be called a Desk.
