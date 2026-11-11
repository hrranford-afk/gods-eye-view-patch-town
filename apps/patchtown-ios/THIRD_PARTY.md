# Third-party code in the PatchTown app

## WebXRKit (Apache License 2.0)

- Source: https://github.com/wem-technology/ios-webxr (the HelloXR app), commit f97636f.
- Copied into `WebXRKit/`. Licence: `WebXRKit/LICENSE`. Notice: `WebXRKit/NOTICE`.
- Files we changed say "Modified by PatchTown" at the top, with what changed:
  - `WebXRKit/Sources/WebXRKit/ARWebView.swift`
  - `WebXRKit/Sources/WebXRKit/ARWebCoordinator.swift`
  - `WebXRKit/Sources/WebXRKit/ARCameraFrameProcessor.swift`
- Unchanged: `WebXRKit/Sources/WebXRKit/Resources/webxr-polyfill.js`. It contains:
  - webxr-ios-js, Copyright (c) 2019 Mozilla Inc., Mozilla Public License 2.0
  - webxr-polyfill, Copyright (c) 2017 Google, Apache License 2.0
  - nosleep.js, Copyright (c) 2017 Rich Tibbett, MIT License
  The full licence texts are in the headers of that file.
- Not copied: the HelloXR app itself (URL bar, App Clip), its icon and demo files.

## Bundled at build time (not in this folder)

`scripts/sync-games.sh` copies into the app:

- The 3 games, with their own `THIRD_PARTY.md` / `ASSETS.md` (shown in the app's About screen).
  Night Meet's assets are CC0 (Quaternius, Poly Haven).
- three.js r128 and its examples (MIT, Copyright 2010-2021 three.js authors), from cdnjs and jsDelivr.

## Our own code

Everything else here is PatchTown's own: `PatchTown/`, `PatchTownTests/`, `scripts/`, `tests/`, the docs and the icon.
