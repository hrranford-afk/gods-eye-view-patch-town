# Build 16 testing

- `node --check game-syntax-check.js`: full script syntax.
- `node tests/scout-contract-test.cjs`: constructs mouse with geometry mocks, verifies animation contract and save hooks, plus map texture call.
- `node tests/build16-static.cjs`: checks source-level safety invariants.

**Not verified:** actual iPad or Samsung FPS or live browser game visuals. The sandbox Chromium browser blocks navigation to local files and local HTTP pages. Offline preview images are *reconstructed* using a different renderer and must not be described as real in-game screenshots.
