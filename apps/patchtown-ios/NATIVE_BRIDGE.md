# PatchTown native bridge (for game code)

What the app adds on top of WebXRKit, and how a game uses it.
Nothing here is tested on a device yet. See "Untested" in README.md.

## How a game knows it is in the app

`window.PatchTownNative` exists (it is injected before the page's own scripts).

```js
const inApp = !!(window.PatchTownNative && PatchTownNative.inApp);
```

`navigator.xr` also exists from the start: the app injects `webxr-polyfill.js` itself.
So the games' "iPad fix" does nothing in the app. That is correct.
It still works as before in other WebXRKit apps.

## 1. Room maps (ARKit world maps)

A world map is ARKit's own memory of a room. Loading it lets ARKit find the room again by itself.

The app stores maps on the device, in `Documents/WorldMaps/<game id>/<key>.arworldmap`.
The game id comes from the page address, so games cannot see each other's maps.
Keys: use letters, digits, `-`, `_`, `.` (other characters become `_`). Max 96.

```js
await PatchTownNative.worldMap.save(key)    // {saved:true, key, bytes, mapping} or {saved:false, error}
await PatchTownNative.worldMap.load(key)    // {loaded:true, started:true} or {loaded:false, error}
await PatchTownNative.worldMap.has(key)     // {exists, bytes, modified}
await PatchTownNative.worldMap.remove(key)  // {removed}
await PatchTownNative.worldMap.list()       // {keys:[...]}
PatchTownNative.worldMap.status             // {mapping, tracking, relocalized}
await PatchTownNative.worldMap.whenRelocalized(20000)  // true, or false after 20 s
```

- `save` needs AR running. It works best when `status.mapping` is `extending` or `mapped`.
- `load` while AR runs: ARKit restarts with the map (`resetTracking`, anchors removed). The camera may jump.
- `load` before AR starts: the map is kept (`started:false, pending:true`) and used when the session starts.
- **`load` resolving does not mean "found".** Wait for `whenRelocalized()` or the `relocalized` event.

Events (also `window` events `patchtown:worldmap`):

```js
PatchTownNative.on('worldmap', (d) => { ... })
// d.type: 'mapping'      d.mapping:  'notAvailable' | 'limited' | 'extending' | 'mapped'
//         'tracking'     d.tracking: 'normal' | 'notAvailable' | 'limited:initializing' | 'limited:relocalizing' | ...
//         'relocalizing' (a map was just loaded)
//         'relocalized'  d.relocalized: true   (ARKit found the saved room)
```

### Polyfill route (still works)

`session.nonStandard_getWorldMap()` resolves `{worldMap: <base64>}`.
`session.nonStandard_setWorldMap(x)` accepts that object, its JSON string, a bare base64 string, or `{key}`.
It rejects when nothing was loaded. `nonStandard_getWorldMappingStatus()` now returns real values.

Do not use this route for real rooms. Maps are often 5 to 30 MB. That does not fit in localStorage.

## 2. Hit quality

`hitTest` results (the ones Base Camp's `DIRECT` raycasts read) now carry:

- `uuid`: as before, only on hits on a real plane anchor.
- `estimated: true`: on hits from ARKit's estimated-plane fallback (guesses).
- `alignment`: `horizontal` or `vertical` (anchored hits).
- `classification`: `floor`, `table`, `seat`, `wall`, `window`, `door`, `ceiling` or `none`.
  Only on devices that classify planes (LiDAR iPads and iPhone XS or newer).

Old code keeps working: `uuid` means trusted, no `uuid` means weak.

## 3. Plane stream (opt-in)

Off until the page asks, so games that do not use it pay nothing.

```js
await PatchTownNative.planes.start({ hz: 4 })   // at most 4 Hz
PatchTownNative.on('planes', (d) => { ... })
// d = { reset, updated: [plane...], removed: [id...] }
// plane = { id, transform: [16, column-major, ARKit world], center: [x,y,z], extent: [w, h],
//           extentRotationY, boundary: [x0,z0, x1,z1, ...], alignment, classification }
PatchTownNative.planes.all   // Map id -> latest plane
await PatchTownNative.planes.stop()
```

`center`, `extent` and `boundary` are in the plane's own space (metres; y is 0 there).
Turn them into world space with `transform`.
**These are ARKit world coordinates, not the polyfill's `local` space.**
Convert like Base Camp does for hits: `refSpace._inverseBaseMatrix * world`.

## 4. Camera frames

Unchanged from WebXRKit: ask for `camera-access` and frames arrive as before.
They now turn correctly in landscape too.

## Base Camp: how to wire its world-map hook

Base Camp has `worldMapAvailable` / `worldMapSave` / `worldMapLoad` (index.html, near `relocNewRoom`).
They were written before the native side existed. **3 things in them will not work as written:**

1. They store the map in localStorage (`base-camp-worldmap`). Real maps are too big. Use the native store.
2. `startAuto` locks right after `setWorldMap` resolves. ARKit has not found the room yet then.
3. They lock with an identity transform. That is only right if both sessions started at the same pose.

Why 3: the polyfill's `local` space is the first camera pose of each session.
After relocalising, ARKit's world is the saved session's world again. Local space is not.
So keep the saved session's base matrix with the room, and use it.

Suggested code (not applied; do this in the game's own task):

```js
function worldMapAvailable() { return !!(window.PatchTownNative && PatchTownNative.worldMap && AR.on); }
function worldMapKey() { return 'room-' + (MULTI_ROOM ? HOMES.cur : 'main'); }

async function worldMapSave() {   // call from persist(), at most once a minute, and when leaving AR
  if (!worldMapAvailable()) return false;
  const m = PatchTownNative.worldMap.status.mapping;
  if (m !== 'extending' && m !== 'mapped') return false;
  const r = await PatchTownNative.worldMap.save(worldMapKey());
  if (r.saved) store.set('base-camp-worldbase-' + worldMapKey(), JSON.stringify(Array.from(AR.refSpace._inverseBaseMatrix)));
  return !!r.saved;
}

async function worldMapLoad() {   // call when AR starts, before the surface matcher
  if (!worldMapAvailable()) return null;
  const has = await PatchTownNative.worldMap.has(worldMapKey());
  const base = store.get('base-camp-worldbase-' + worldMapKey());
  if (!has.exists || !base) return null;
  const r = await PatchTownNative.worldMap.load(worldMapKey());
  if (!r.loaded) return null;
  if (!(await PatchTownNative.worldMap.whenRelocalized(30000))) return null;  // fall back to the surface matcher
  // saved-local -> live-local = invBase_now * inverse(invBase_saved)
  const invSaved = new THREE.Matrix4().fromArray(JSON.parse(base));
  const invNow = new THREE.Matrix4().fromArray(AR.refSpace._inverseBaseMatrix);
  return invNow.multiply(invSaved.invert());  // turn this into {phi, tx, tz, dy} for relocLock(..., 'worldmap')
}
```

Keep the surface matcher as the fallback. It is still needed outside the app and when relocalising fails.
Check that `_inverseBaseMatrix` does not change during a session before relying on it (log it on a device).
