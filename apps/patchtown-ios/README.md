# PatchTown for iPad and iPhone (v0.1)

The PatchTown games in one app, for TestFlight testers only.

**Status: written on Linux. It has never been built.** The first build on a Mac is the first real test.
To build it, follow [BUILD_AND_TESTFLIGHT.md](BUILD_AND_TESTFLIGHT.md).

## What it is

- A home screen with 3 games: Base Camp, Baguettes & Ballistics, Night Meet. Plus About.
- Each game opens full screen in an AR web view (WebXRKit, from the HelloXR app).
- The games are inside the app. They work offline (three.js is bundled too).
- iOS 17 or newer. iPad and iPhone. Portrait and landscape.

## What the app adds over HelloXR

1. **Room maps.** Games can save ARKit's map of a room and load it next time. ARKit then finds the room itself.
2. **Hit quality.** Hit results say `estimated: true` for guesses and give the plane type (floor, table, wall...).
3. **Plane stream.** Games can ask for the shape of every plane ARKit sees, up to 4 times a second.
4. Camera frames for recognition work as before, now in landscape too.
5. No URL bar. The app only opens its own games.

How a game uses 1 to 3: [NATIVE_BRIDGE.md](NATIVE_BRIDGE.md).
What the app keeps on the device: [PRIVACY.md](PRIVACY.md).

## Folders

| Path | What |
|---|---|
| `PatchTown/App/` | Home, game screen, About (SwiftUI) |
| `PatchTown/Web/` | `patchtown://` file server for the games |
| `PatchTown/Bridge/PatchTownBridge.js` | `window.PatchTownNative` for the games |
| `WebXRKit/` | Vendored WebXRKit (Apache 2.0); changed files are marked |
| `PatchTown/Games/` | The games, copied in by `scripts/sync-games.sh` (not committed) |
| `scripts/` | sync, generate, icon, archive and upload |
| `PatchTownTests/` | Logic tests for the file server |
| `tests/bridge-test.cjs` | Node test for the JS bridge |

## How the games are served

Each game gets its own address: `patchtown://base-camp/index.html`, `patchtown://night-meet/...`.
One address per game keeps each game's saves (localStorage, IndexedDB) apart.
The pages are served with the three.js CDN links pointed at the bundled copy.
TensorFlow and the recognition models still download from the internet, only when a game asks.

## Untested (all of it needs a Mac and a device)

- Nothing here was compiled. Swift was only syntax-checked (tree-sitter). Expect a few compile fixes.
- The `PatchTownTests` logic tests were written but never run.
- Custom-scheme pages: localStorage and IndexedDB should persist (other apps do this). Not proven here.
- Location in the web view from a `patchtown://` page. WebKit may refuse it. Base Camp then has no weather.
- World map save, load and relocalising. Plane stream. Hit classification.
- Landscape: camera matrices and camera-frame rotation.
- The XcodeGen project, the upload script and `codemagic.yaml` never ran.

Tested here: `sync-games.sh` runs and fills `PatchTown/Games` (11 MB). The JS bridge passes its Node test.
`project.yml`, `codemagic.yaml` and the plist files parse.
