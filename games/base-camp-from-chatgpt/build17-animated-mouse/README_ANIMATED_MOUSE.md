# Base Camp Build 17 — real moving GLB mouse

**What changed:** Added the original mobile-optimised mouse `.glb` to `assets/`, with actual glTF animations: Idle, Walk, Wave, LookAround and Hop. Loaded via the official Three.js r128 `GLTFLoader`, cloned as the character's rendered body, and played by `AnimationMixer` according to the existing colony's movement, celebrations and other events.

**Fallback:** The existing procedural Build 16 scout remains if the extra loader or GLB cannot load. Other game systems and saves are unchanged. The game already requires Three.js r128 from CDN, and this edition adds a second network request for GLTFLoader. The GLB is local to the ZIP. The browser must serve `index.html` and `assets/` with local same-origin HTTP(S); Safari may block file:// access.

**Visual feedback:** See `../basecamp-scout-3d/scout_animated_walk_wave_hop.gif` (when supplied separately) for a truthful render of the real GLB motions. A live iPad play-test was not performed.

**Tests:** run `node tests/scout17-asset-test.cjs` and `node tests/scout-contract-test.cjs`; JS script syntax can be checked after extracting the game's inline script.

**Performance:** Mobile GLB ~1.3 MB, 53 merged render mesh nodes, shared geometry/textures. One detailed model per settlement's first scout, with old geometry hidden. Recommend limiting visible detailed scouts on older mobile devices; distant LOD isn't yet implemented.
