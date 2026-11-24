# Radeon Bench (gpubench/radeon_bench.html)

A single self-contained page that measures what a graphics card can do for Living Islands, above all for world simulation computed on the GPU (water, waves, wind, wildlife). Plain WebGL2, plus WebGPU compute tests when `navigator.gpu` exists. No libraries, no network use, nothing stored or sent. Works over https (the Lab on gh-pages) and over file://.

**Real numbers can only come from Harry's machine.** The cloud has software rendering only. The smoke test (`test_bench.js`) checks that the page works and that every test produces a result or a clear "unsupported" reason. Its numbers describe a CPU pretending to be a GPU and mean nothing.

## How to run it (Harry)

1. Open the page in Chrome on the Mac with the Core X plugged in (link supplied on the Lab).
2. Look at the line "Graphics card Chrome gave this page". It must say AMD Radeon. If a big red box says Intel: quit Chrome, Finder > Applications > select Google Chrome > Cmd+I > tick "Prefer External GPU", or connect the screen to the Radeon, reopen Chrome, check chrome://gpu, reload.
3. Keep the tab in front, close heavy tabs. Press the big blue RUN QUICK (about 40 s). For the full picture press Run FULL (about 3 min) and choose a memory limit (try 8 GB, then 15 GB if it was calm).
4. When it says Done, press COPY REPORT and paste the text back in the chat.
5. STOP works at any time. The memory test can make Chrome reload the tab if the GPU is overcommitted. Nothing is damaged, and nothing is stored.

Time budget: no single measurement runs longer than 6 seconds (most run 0.55 s in Quick, 1.5 s in Full). Memory tests fill step by step and stop at the first failure, at your limit, or at 6 s ("at least" is then printed).

## What each test measures

| Test | Plain meaning | Number to read |
|---|---|---|
| 0 SYSTEM | Which GPU Chrome gave the page (intel vs AMD flag), WebGL2 limits (texture, renderbuffer, 3D, draw buffers, float render targets, half float, anisotropy), WebGPU adapters (high-performance and low-power request) and limits, devicePixelRatio, screen and canvas size in real pixels | GPU name, EXT_color_buffer_float yes, maxStorageBufferBindingSize |
| 1 FILL RATE | Full-screen blended layers at 1080p and 4K | Gpixels/s |
| 2 TRIANGLES | Instanced meshes of 1 M, 5 M and 20 M small triangles, no depth+flat vs depth+lit | Gtriangles/s (60 fps at 20 M needs 1.2 G) |
| 3 SHADER MATH | Multiply-add loop, each counted as 2 operations | GFLOPS, ROUGH figure only |
| 4 MEMORY BANDWIDTH | Read, shader copy and blitFramebuffer on 2048x2048 RGBA32F (64 MB) | GB/s inside the card |
| 5 VRAM FILL | Allocates 4K RGBA8 textures with mipmaps (about 90 MB) then 4096x4096 RGBA32F (268 MB), uploading real data so memory is truly committed | how many fit, total GB, upload GB/s = the Thunderbolt limit |
| 6 READBACK | readPixels of 1024 and 2048 float textures, plain (CPU waits) vs async (pixel pack buffer + fence) | ms per read, GB/s, reads/s, CPU ms, latency |
| 7a GPGPU WATER | Ping-pong wave/flow step, 5 fields (RGBA32F + R32F), grids 512 to 4096 | steps/s, largest grid holding 60 |
| 7b GPGPU WILDLIFE | 10 k, 100 k, 1 M agents flocking from a density field (point splat, then texture update) | steps/s, agent updates/s |
| 8a WEBGPU WATER | The same water step as a WGSL compute shader | steps/s, compare with 7a |
| 8b WEBGPU AGENTS | Same flocking with atomics, plus exact all-pairs N-body (2 k, 8 k, 32 k) | steps/s, pair interactions/s |
| 9 SUMMARY | Plain verdict table and the copyable report (first line: GPU, browser, date, mode) | YES / NO answers |

Notes: the water physics is a stand-in with the same memory and maths pattern as shallow water (speed carries over, the picture would not). Flocking uses a shared density field, the usual cheap method; it is not nearest-neighbour search (that is what the all-pairs N-body shows, at small sizes). Link speed is measured upload (CPU to GPU) only.

## Spec-sheet context (not measured; published figures)

Radeon VII: about 13.8 TFLOPS fp32, 1 TB/s memory, 16 GB HBM2. Intel UHD 630: about 0.4 TFLOPS, shares system memory (about 1.5 GB for graphics on a Mac). Thunderbolt 3 carries PCIe 3.0 x4: theoretical 3.9 GB/s, real uploads usually 2 to 3 GB/s. Compare these with what the report says.

## WHAT 16 GB GIVES US (arithmetic, not measured)

Assumes 85% of 16 GB (13.6 GB) usable; Intel column assumes 0.75 GB usable. The page prints the same table.

| Thing | Size each | Fit in 16 GB card | Fit in Intel UHD 630 |
|---|---|---|---|
| 4K RGBA8 texture with mipmaps (4096x4096x4 B x 4/3) | 89 MB | 151 | 8 |
| 4K RGBA16F texture | 134 MB | 101 | 5 |
| 4K RGBA32F field | 268 MB | 50 | 2 |
| 8K R32F height map | 268 MB | 50 | 2 |
| World sim 4096x4096, 5 fields, ping-pong (20 B x 2) | 671 MB | 20 | 1 |
| World sim 8192x8192, 5 fields, ping-pong | 2684 MB | 5 | 0 |
| 1,000,000 triangles of mesh (32 B vertex, 0.5 vertex/tri, 12 B index) | 28 MB | 485 | 26 |
| 20,000,000 triangles of mesh | 560 MB | 24 | 1 |
| 1,000,000 animals (16 B, x2 ping-pong) | 32 MB | 425 | 23 |
| 1080p framebuffer set (colour, depth, 3 G-buffers, 8 B each) | 83 MB | 163 | 9 |

## Files

- `radeon_bench.html` the page (no dependencies on other game files).
- `test_bench.js` Playwright smoke test with software GL: `NODE_PATH=<playwright dir> node gpubench/test_bench.js [--shots]` (set `CHROME_PATH` if Playwright has no browser). Checks the report header, structure, that each of the 11 tests is ok with numbers or unsupported with a reason, time budget, and 0 console errors. `--shots` writes `shots/bench-1.png` and `shots/bench-2.png`. The page runs a tiny "smoke" mode when opened with `?smoke=1`.
