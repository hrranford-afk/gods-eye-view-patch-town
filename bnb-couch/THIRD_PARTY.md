# Third-party code

`webxr-polyfill.js` is an unmodified copy of the WebXR polyfill from WebXRKit
(https://github.com/wem-technology/ios-webxr, Apache License 2.0). It contains:

- webxr-ios-js, Copyright (c) 2019 Mozilla Inc., Mozilla Public License 2.0 (https://mozilla.org/MPL/2.0/)
- webxr-polyfill, Copyright (c) 2017 Google, Apache License 2.0
- nosleep.js, Copyright (c) 2017 Rich Tibbett, MIT License

The full licence texts are in the headers of `webxr-polyfill.js`. The game only loads it inside an AR app on iPad
(see the "iPad fix" comment in `index.html`). The rest of the game is our own code.
