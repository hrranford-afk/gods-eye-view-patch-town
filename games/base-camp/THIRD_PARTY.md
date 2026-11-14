# Third-party code

`webxr-polyfill.js` is an unmodified copy of the WebXR polyfill from WebXRKit
(https://github.com/wem-technology/ios-webxr, Apache License 2.0). It contains:

- webxr-ios-js, Copyright (c) 2019 Mozilla Inc., Mozilla Public License 2.0 (https://mozilla.org/MPL/2.0/)
- webxr-polyfill, Copyright (c) 2017 Google, Apache License 2.0
- nosleep.js, Copyright (c) 2017 Rich Tibbett, MIT License

The full licence texts are in the headers of `webxr-polyfill.js`. The game only loads it inside an AR app on iPad
(see the "iPad fix" comment in `index.html`). The rest of the game is our own code.

## Loaded at run time from CDNs (not shipped in this folder)

- three.js r128 (MIT), from cdnjs.
- TensorFlow.js 4.22.0 and the COCO-SSD model package 2.2.3 (Apache License 2.0), from jsdelivr; the COCO-SSD weights (`ssdlite_mobilenet_v2`, trained on COCO, CC BY 4.0 labels) from storage.googleapis.com. Loaded when AR mapping starts.
- transformers.js 3.7.5 (Apache License 2.0) from jsdelivr, and the ONNX export `Xenova/clip-vit-base-patch32` of OpenAI's CLIP (MIT) from huggingface.co: only the vision model, about 53 MB, only after the player turns on "Smarter recognition". `clip-labels.json` (in this folder) holds CLIP text embeddings of our own label list, made once with `tests/make-clip-labels.mjs`.
- Camera pictures are never uploaded: the models run on the device.

## 3D models (build 15)

3D models: Kenney (kenney.nl) and Quaternius (quaternius.com), CC0.

`models/props.js` holds 14 of their free models (Kenney Food Kit, Survival Kit and Nature Kit; Quaternius Survival and Medieval Village packs), baked into vertex-coloured geometry by `tools/bake-props.js`. The source files and the licence texts are in `models/cc0/` (`LICENCE-kenney.txt`, `LICENCE-quaternius.txt`). They are CC0 1.0 (public domain): no credit is required, we give it anyway. The game loads `models/props.js` next to `index.html`; without it the old toy shapes are used. The game's Menu shows the same credit line.

## Backpack Scout mouse (build 17)

Backpack Scout mouse: made with ChatGPT, sent by Harry.

`assets/basecamp_mouse_scout_ANIMATED.glb` (1.3 MB, five animation clips: Idle, Walk, Wave, LookAround, Hop) is loaded with three.js r128's `GLTFLoader` (`examples/js/loaders/GLTFLoader.js`, MIT, from jsdelivr, the same version as three.js). The first colonist of each camp is the scout. Without the GLB or the loader the game builds the procedural mouse (`mkMouseScout`), and without that a normal creature. The game's Menu shows the same credit line.

## js-aruco2 2.0.0 (vendor/js-aruco2/)
ArUco / AprilTag marker detection and pose (posit). MIT licence: Copyright (c) 2020 Damiano Falcioni, (c) 2011 Juan Mellado. From npm js-aruco2@2.0.0 (https://github.com/damianofalcioni/js-aruco2); unmodified files; tarball SHA-256 in vendor/js-aruco2/SOURCE-SHA256. Downloaded 14 Nov 2026 with Harry's yes.
