# Night Meet (working title)

A night-time car meet and drift game for iPad, on screen and in AR. After midnight a harbour car park fills up with
cars under sodium lamps. Walk round them, tap one to look at it, paint it, give it neon, then take it out drifting
round the car park and docks, or round a small town block with a roundabout. In AR the whole car park (or the town)
sits on your real table or floor as a diorama, and you can drive in it.

Prototype: two areas, eleven car types, one 90-second drift mode, local best scores. All cars are our own designs
and names (no real makes, models or badges); all assets are CC0 (see ASSETS.md).

The name lives in one place: `GAME` at the top of the first script in `index.html` (the page title, loading screen,
title card and storage key all come from it).

## How to play
- **Title**: ENTER THE MEET (or AR, when the device can do it). Pick Low / Medium / High quality (remembered).
- **The meet**: drag to look round, pinch or scroll to zoom. Tap a car (or CARS, then ‹ ›) to open its card: power,
  weight, grip, drift rating and the points multiplier. Pick a paint colour and a neon underglow, then
  **DRIVE · CAR PARK & DOCKS** or **DRIVE · TOWN BLOCK**.
- **Driving** (90 s run): left thumb anywhere on the left half is the stick: left/right steers, push up for gas,
  pull down to brake/reverse. With your thumb resting the gas is on (it is a drift game). **DRIFT** (Space) is the
  handbrake: tap or hold it to kick the tail out, then steer into the slide and keep the gas on; centre the stick
  to straighten up. **BOOST** (B) spends the boost bar, which fills while you drift. Keyboard: WASD / arrows.
- **Scoring**: points while sliding, more for a bigger angle and more speed. A drift is banked when it ends and
  multiplied by your combo (x2 ... x8, "MEET LEGEND"); chain drifts within 4.5 s to grow the combo. A crash or
  stopping loses it. Painted **DRIFT ZONE** circles pay x2, sliding within a metre of a wall or car pays x1.5.
  Heavy and awkward vehicles pay more: the bus x3.5, the box lorry x4 (and they are silly-hard).
- **Results**: score, stars (5,000 / 14,000 / 28,000), best drift, best combo, personal best per area
  (kept in localStorage; works without it).
- **AR**: tap AR (title card or the meet's top bar). Point at a table or the floor, tap to place. Pinch to resize,
  twist to turn, or use the bar (Re-place, ↺ ↻, Size, Town / Car park, Exit AR). Tap a car to open its card and
  drive it on the table. AR always runs at Low quality. The status line under the title shows the build tag and
  what the browser says about AR; the AR start-up steps are written on screen (the iPad AR app cannot show pop-ups).

## Running it
Serve the folder over http(s) (the model files are fetched, so `file://` will not load them; the game then falls back
to code-built cars and leaves the props out). For example `npx http-server games/night-meet`. Add `?perf` to the URL
for a frame-time line in the corner.

AR works with WebXR `immersive-ar`: the HelloXR / WebXRKit iPad app (the iPad user-agent fix loads our copy of
`webxr-polyfill.js`, same as baguettes-and-ballistics, see its AR.md) and Android Chrome.

## Add a car
1. Add an entry to `CAR_TYPES` (search `const CAR_TYPES`): `id`, our own `name`, `cls`, `blurb`, `paint`, `kW`, `kg`,
   `grip` (about 0.85 to 1.2), `drift` (1 to 5, shown as dots and used for the drift assist), `mult` (points
   multiplier), `top` (km/h), `plate` text. Optional: `cgh` (centre of gravity height, m), `driftAng`, `assistK`.
2. Its look, one of:
   - a model file: put a GLB in `assets/cars/`, add it to `ASSET_LIST.cars` and set the type's `src` to that key.
     The model should face +x (or be turned in a converter), be in metres, with material names `Windows`,
     `Black`, `Grey`, `Headlights`, `TailLights` (anything else: the biggest surface is the paint) and wheel nodes
     named `FrontLeftWheel`, `FrontRightWheel`, `BackWheels` (they are replaced by our wheels). A different naming
     scheme: adapt `glbMeta` / `buildGlbCar`.
   - shapes in code: add a branch to `buildCodeCar` (side profile -> `sideShape` + `extrude`, glass, lamps,
     `addWheel`) and set the type's `code` to its name. It must return `{ len, wid, hgt, wb, r, front, rear }`.
3. Optionally park one at the meet: an `S(...)` line in `buildCarPark`.
`makeCar(typeId, paint, neon)` is the one function that builds any car; a better model can replace a type without
touching the rest of the game.

## Add an area
Write `buildX()` next to `buildCarPark` / `buildTown`: start with `newArea(id, name, bounds)`, add static meshes
through a `Merger` (one draw call per material), push `colliders` (boxes and circles), `zones`, lamps (with
`lampPole` / `wallLamp`), set `spawn`, `cam` and a `botPath` (for the test bot), then call `bakeLight`, `groundPlane`,
`markingsMesh`, `puddles`, `lightDressing` and `plinth` like the others. Register it in `AREA_BUILDERS` and add a
DRIVE button that calls `driveStart('<id>', ...)`, and a `STARS` entry.

## Files
- `index.html`: the whole game (code map in HANDOVER.md).
- `assets/`: cars (GLB), Poly Haven props (glTF), HDRI, asphalt textures. `ASSETS.md`: every source and licence.
- `webxr-polyfill.js`, `THIRD_PARTY.md`: the AR polyfill for the iPad app and its licences.
- `shots/`: screenshots from the test runs.
