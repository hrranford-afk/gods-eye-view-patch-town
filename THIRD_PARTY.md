# Third-party code

`webxr-polyfill.js` is an unmodified copy of the WebXR polyfill from WebXRKit
(https://github.com/wem-technology/ios-webxr, Apache License 2.0). It contains:

- webxr-ios-js, Copyright (c) 2019 Mozilla Inc., Mozilla Public License 2.0 (https://mozilla.org/MPL/2.0/)
- webxr-polyfill, Copyright (c) 2017 Google, Apache License 2.0
- nosleep.js, Copyright (c) 2017 Rich Tibbett, MIT License

The full licence texts are in the headers of `webxr-polyfill.js`. The game only loads it inside an AR app on iPad
(see the "iPad fix" comment in `index.html`). The rest of the game is our own code.

## Rapier physics engine (brick-lab/vendor/rapier)
@dimforge/rapier3d-compat 0.14.0, Apache-2.0, https://github.com/dimforge/rapier.js . Unmodified. Licence text in brick-lab/vendor/rapier/LICENSE.

## Rapier 0.21.0 builds (brick-lab/vendor/rapier-0.21-compat and rapier-0.21-simd-compat)
@dimforge/rapier3d-compat and @dimforge/rapier3d-simd-compat 0.21.0, Apache-2.0, https://github.com/dimforge/rapier . Unmodified. Licence text beside each build.
