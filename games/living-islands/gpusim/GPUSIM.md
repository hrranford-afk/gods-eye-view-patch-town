# GPUSIM: two WebGL2 simulation prototypes with tests (24 Nov 2026)

Files: `pipe_sim.js` (shared engine), `ocean_gpgpu.html` + `ocean_cpu.py`, `flood_gpgpu.html` + `flood_cpu.py`, `cpu_compare.py`, `test_gpusim.js` (Playwright), `test_cpu.py`, `THIRD_PARTY.md`. Pictures: `../shots/gpusim-1.png` (ocean: moving rain cell, boat wake), `gpusim-2.png` (flood during the rain pulse on world 153), `gpusim-3.png` (the same world after the rain, water draining).
Research behind it: `../research/GPU_WORLD_SIMULATION.md`. The card: `../research/RADEON_VII_SPECIALITIES.md`.

## What it is
Plain WebGL2 (no libraries). The "virtual pipes" shallow-water scheme (Mei, Decaudin, Hu 2007). State per cell is depth, bed height and four outflow fluxes in `RGBA32F` textures, ping-pong, two passes per step, `texelFetch` only (so no float-linear extension). Flux between two cells = `g * dt * (face depth) * (surface difference)` with the face depth from hydrostatic reconstruction, so still water against a dry shore stays still. Closed walls. A flux limiter stops a cell giving away more than it holds. Sources are pure functions of the step number (no clock, no random).
- **Ocean:** 256 m square of sea, 2 m deep, flat bed. A rain cell (Gaussian, sigma 10 m, 0.05 m/s at the centre) crosses the sea for 1500 steps. A boat (a moving dipole: water added ahead, removed behind, sigma 3 m) circles at 40 m radius. `?n=256` or `?n=1024` (cell 1.0 m or 0.25 m).
- **Flood:** the real exported world heightfield `landform/worlds/seed0153` (129 by 129 at 2 m, int16 / 256 = metres) resampled bilinearly to 256 by 256 (cell 1.004 m). The sea starts at rest at level 0 (sea floor capped at -8 m so the wave speed stays low). A rain cell (sigma 60 m, 0.012 m/s) falls on the highest ground for 900 steps. Water runs downhill, floods the flats and runs to the sea. `?seed=4` also works (loads `world.js` by `<script>`; not part of the tests). The page decodes `world.js` (base64 of `world.bin`).
- **API for tests:** `window.GPUSIM = { ready, config(), step(n), readDepth(), readFlux(), stats(), reset(), render() }`. `stats()` gives `volumeM3`, `expectedVolumeM3` (initial volume plus the exact float64 sum of the sources), `maxDepth`, `nan`, `meanStepMs`, `renderer`.

## What was proven (software GL, SwiftShader; run `NODE_PATH=$(npm root -g) node gpusim/test_gpusim.js` from `games/living-islands`)
Final run: **ALL PASSED, 24 checks**. `python3 gpusim/test_cpu.py`: **11 tests OK**.

| Check | Result | Stated tolerance |
|---|---|---|
| GPU depth against the numpy float32 reference, ocean 256, 300 steps | max abs error 3.8e-6 m, mean 8.1e-8 m (field range 1.974 to 2.103 m) | max 1e-3 m, mean 1e-5 m |
| same, flood 256, 300 steps | max 9.5e-6 m, mean 1.1e-6 m (range 0 to 8.2 m) | max 2e-3 m, mean 2e-5 m |
| same, ocean 1024, 60 steps | max 1.7e-6 m, mean 9.1e-9 m | max 1e-3 m, mean 1e-5 m |
| Volume conserved (volume against initial plus sources), at the compare step | ocean 256: 1.1e-7 relative; flood: 7.7e-10; ocean 1024: 1.9e-8 | under 1e-4 (0.01 percent) |
| Volume conserved over the whole run (checked every 250 steps) | worst 4.9e-7 (ocean 256), 8.5e-9 (flood), 5.1e-7 (ocean 1024) | under 1e-4 |
| No NaN or Inf over 2,000 steps | none, in all three runs (ocean 256, flood 256, ocean 1024); max depth 2.09 m, 8.16 m (sea), 2.09 m | none allowed |
| Deterministic on this machine (two fresh page loads, same steps, byte-identical depth field) | identical in all three | byte-identical |
| numpy reference alone (`test_cpu.py`) | lake at rest stays flat (exactly); closed box conserves volume to 1e-6; sources add exactly their volume; 2,000 steps finite and non-negative; mirror symmetry; sea at rest on the real coastline stays still to 1e-4 m; rain on the real island runs off toward the sea with volume balance 1e-5; wave speed 4.4 to 4.9 m/s against sqrt(g d) = 4.43 | as in the file |

Be careful what these prove:
- The GPU and the CPU agree **in SwiftShader**, which is a CPU renderer doing float32 in order. That makes the agreement tight (1e-6). A real GPU with fused multiply-add and its own `exp` will differ more; the tolerances (1e-3 m) are meant to cover that, but I have **not** run on a real GPU, so I do not know the real figure.
- "Deterministic" means the same machine repeats. It does **not** show two different GPUs agree. See the determinism rule in `GPU_WORLD_SIMULATION.md` section 2.
- Conservation is exact up to float rounding because the walls are closed; open boundaries would need a separate check.

## What was NOT proven
- Anything about the Radeon VII, any real GPU, Metal, the Thunderbolt link, or an iPad. No measurement of speed on real hardware.
- Cross-GPU agreement (needs two different GPUs).
- Physical accuracy of the scheme. The wave speed in a pulse test came out 4 to 10 percent above `sqrt(g d)` depending on the time and pulse width (4.6 m/s at 280 steps for sigma 6 cells; the test accepts 4.43 plus or minus 0.45). I did not find the cause. It is a look-and-feel scheme (a pipe model with a one-sided flux limit), not a hydrology tool. It has no advection or friction law on dry slopes.
- WebGPU. This is WebGL2 only.
- Chrome on a Mac. Tests ran in headless Chromium on Linux with `--use-gl=swiftshader`.
- Large grids with open edges, tiling, erosion and sediment, sub-stepping under strong rain, and wetting and drying on very steep terrain beyond the one real island tested (seed 153; seed 4 only ran in the CPU reference, 300 steps).
- A two-page test: two GPU pages at the same time crashed the software renderer, so the test runs one page at a time (and retries a page open up to three times, because another job on the same machine can starve it).

## Step cost
**Measured here (SwiftShader, a CPU renderer; NOT a measure of the Radeon):**
| Run | Cells | Mean time per step (two passes) |
|---|---|---|
| ocean 256 | 65 536 | 7.3 ms |
| flood 256 | 65 536 | 8.8 ms |
| ocean 1024 | 1 048 576 | 117 ms |
The time grows 16 times for 16 times the cells: the software renderer is simply doing the arithmetic one cell after another, about 110 ns per cell per step. This machine was also shared with another test job, so the numbers wobble by tens of percent between runs (earlier runs read 5.7 to 6.9 ms at 256).

**Estimated for a 13.8 TFLOPS, 1 TB/s card (arithmetic, NOT measured):**
1. Count per cell per step, from the shader: about 100 floating-point operations and 12 texture reads of 16 bytes (192 bytes) plus 32 bytes written. Worst case 224 bytes per cell if no cache helps; neighbour reads do hit the cache, so real traffic is probably 50 to 100 bytes.
2. 1024 by 1024 = 1 048 576 cells. Arithmetic: 1.05 M x 100 = 105 MFLOP per step; at 13.8 TFLOPS that is 7.6 microseconds. Memory: 1.05 M x 224 B = 235 MB per step; at 1 TB/s that is 0.235 ms (worst case); at 60 percent of peak bandwidth 0.39 ms; with cache help perhaps 0.1 ms.
3. So the step is bandwidth-bound, not arithmetic-bound. Estimate: **0.1 to 0.4 ms per step at 1024 squared; 0.4 to 1.6 ms at 2048 squared** (four times the cells). At 60 steps per second: 6 to 24 ms of GPU time per second at 1024 squared, which is 0.6 to 2.4 percent of the card; at 2048 squared 2.4 to 9.6 percent.
4. Add fixed costs: two render passes per step, each with a launch of tens of microseconds; and the drawing pass for display (one more read of the textures). Probably a further 0.05 ms.
5. Check against the software number: 117 ms per 1024 squared step in SwiftShader against the 0.1 to 0.4 ms estimate is a ratio of 300 to 1000. A discrete GPU is hundreds of times faster than a software renderer, so the estimate is plausible, not proven.
6. Over Thunderbolt: nothing in this loop crosses the cable. Only a readback would (a 1024 squared one-channel float field is 4.2 MB, about 1.6 ms at 2.7 GB/s). The prototype reads back only for tests.

## How to run
- Pages: open `gpusim/ocean_gpgpu.html` or `flood_gpgpu.html` in a browser (file or a local server). They animate by themselves; `?auto=0` stops that.
- Tests: `cd games/living-islands && NODE_PATH=$(npm root -g) node gpusim/test_gpusim.js [quick=1] [big=0]` (about 6 minutes in full; `quick=1 big=0` takes half a minute). `python3 gpusim/test_cpu.py` takes about 8 seconds. The test writes `gpusim/last_run.json` and the three pictures.
