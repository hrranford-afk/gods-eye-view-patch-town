# GPU world simulation: what the graphics card should compute for the whole world (research note, 24 Nov 2026)

Do not put real place names into game code, assets or recipes.
Confidence tags: High, Medium, Low. Prototype evidence is in `gpusim/GPUSIM.md` (what was proven, what was not). Companion note on the specific card: `research/RADEON_VII_SPECIALITIES.md`.

## 0. Summary
1. **The rule: the GPU runs the look and feel of the world. The CPU owns the truth.** Float math differs between GPUs (and between drivers), so anything that decides who has food, where buildings stand, what is in a save file, or what a second player or a replay must see, is computed on the CPU in integers or in strictly ordered, repeatable code. The GPU computes waves, wind, cloud drift, rain, water surface, spray, flocks, grass, particles and other things that can differ by a few pixels between machines without breaking the game. (High confidence on the principle; see section 2.)
2. **Most of the world's maths fits easily on the Radeon VII.** A 1024 by 1024 shallow-water grid at 60 steps a second needs under 1 percent of the card's memory bandwidth and under 0.1 percent of its arithmetic, by my arithmetic (section 6; estimate, Medium). The problem is not speed; it is design: where the result is used, and how it comes back.
3. **Keep what we have in WebGL2 now; plan WebGPU as a second backend.** three.js r128 can do GPGPU in WebGL2 with float textures and ping-pong render targets (the prototype in `gpusim/` does it with plain WebGL2 and passes tests). WebGPU compute is better (storage buffers, atomics, shared memory) but r128 has no WebGPU renderer and our custom shaders would need rewriting in WGSL or TSL (section 5).
4. **Never read big fields back to the CPU every frame.** Use them on the GPU where they are drawn. Send only small summaries to the CPU, at low rate and one or two frames late (section 7).
5. **Same code on weaker devices:** fewer cells, lower step rate, or a CPU version of the same scheme. The prototype's numpy file shows the same scheme on the CPU; the game's own CPU version is a port of that (section 8).

## 1. What I read, and what I could not check
- Prototype evidence: my own code and tests in `gpusim/` (run in software GL, SwiftShader; not a speed measure of the Radeon).
- Sources: Mei, Decaudin and Hu, ["Fast Hydraulic Erosion Simulation and Visualization on GPU"](https://core.ac.uk/download/52631892.pdf) (PG 2007; virtual pipes; I used the abstract and secondary summaries from search, not the equations); Tessendorf, ["Simulating Ocean Water"](https://jtessen.people.clemson.edu/reports/papers_files/coursenotes2004.pdf) (found in search; not read in full); Chrome's WebGPU release post ([developer.chrome.com/blog/webgpu-release](https://developer.chrome.com/blog/webgpu-release); search text only); three.js manual page on [WebGPURenderer](https://threejs.org/manual/en/webgpurenderer) (search text only).
- Page fetching was blocked for most hosts in this session, so every web claim is from search result text. Items from my own background knowledge are marked.
- Not verified: WebGPU on a Mac with an AMD card in an external box. Apple Silicon Macs do not support external GPUs, so Harry's Mac is an Intel Mac (High confidence on the Apple fact; the inference about his Mac is mine, Medium). Chrome's WebGPU runs on macOS through Metal ([Chrome 113 release note](https://developer.chrome.com/blog/webgpu-release), High), but I found nothing that says it picks the external card. Treat as a test to run on his machine.

## 2. Determinism, checked hard
**The problem (High).** Two GPUs given the same shader can return different floats: fused multiply-add versus separate multiply and add, different `exp`, `sin`, `pow` implementations, different order of summing, different rounding of denormals, and different driver compilers. Even one GPU can differ between driver versions. The GLSL and WGSL specifications explicitly allow this (relaxed precision and accuracy bounds for built-in functions; High, knowledge of the specs, not re-read today). Atomics and parallel reductions on floats give results that depend on thread order.
**What the prototype measured (Medium).** In software GL the GPU run matched the numpy float32 reference to about 4e-6 m after 300 steps, and two runs on the same machine were byte-identical (see `gpusim/GPUSIM.md`). That proves the SAME machine repeats. It does NOT prove two different GPUs agree. A real GPU with fused operations will differ by more; the tolerances I set (1e-3 m) are meant to be loose enough for that.
**Chaos matters.** Small differences grow if the system is chaotic. Waves and shallow water damp small errors. Flocks, fire spread and anything with a threshold or a random choice amplify them. So even "visual" systems can diverge between machines over minutes; that is fine for looks, bad for shared state.

**The rule, stated so a worker can check it:**
1. Gameplay-critical state is computed on the CPU, in one of: integers, fixed-point integers, or JS doubles with a fixed order of operations (JS numbers are IEEE doubles and `+ - * /` are exactly rounded, so they repeat across machines; `Math.sin`, `Math.exp` and friends are NOT guaranteed identical across engines, so use our own table or polynomial versions for authoritative state). The macro sea function (`macro_sea.js`) is a pure function of seed and hour; keep it pure and use only operations with repeatable results for anything the rules depend on. Today it uses `Math.sin` and others; that is fine while it only drives looks, and must be revisited the day tides decide something for a shared save or a second player (flag: High confidence that this is a real risk later).
2. The GPU may READ authoritative state (a height map, building footprints, who is where) as input textures. It must NOT write authoritative state.
3. If the GPU computes something the game needs to react to (is this building flooded; is the shore wet at the boat), the CPU asks the GPU for a summary, then DECIDES on the CPU with a deadband (hysteresis) so tiny differences do not flip the answer. The decision, not the raw float, goes into the save.
4. For saves and replays record the decisions and the seeds, never the GPU fields.
5. A quick test, for every GPU-assisted feature: run the CPU reference and the GPU version side by side, and require that the game-state outcome is the same for tolerances of 10 times the measured difference.

## 3. Division table: what is CPU-authoritative, GPU-visual, or GPU-assisted
The same table applies to the desk 1080p and the 4K lounge. (Resolution only changes the render, never the simulation.)

| Thing | Where it runs | Why | Rate / size |
|---|---|---|---|
| Who has food, stores, hunger, illness, jobs | CPU, integers | gameplay truth, saves | per game tick |
| Where buildings, walls, fields and boats stand; terrain edits | CPU, integer grid or fixed-point | gameplay truth, saves | on change |
| Resource amounts, trade, crafting, recipes | CPU, integers | truth | per tick |
| Tide level, storm timing, seed and game hour | CPU pure function (`macro_sea.js`, `sky_clock.js`) | repeatable from seed | per frame, cheap |
| Pathfinding and crowd decisions (where people go) | CPU | truth; GPU may draw the crowd | per tick |
| The day clock, weather STATE (which weather, when it changes) | CPU pure function (`weather.js`) | repeatable | per tick |
| Ocean waves (the surface you see) | GPU visual (Gerstner sum or FFT) | pure look; boat heave reads the SAME analytic wave function on the CPU for the few boats | every frame, 256 to 512 grid |
| Wind field (turbulence, gusts) | GPU visual, seeded by the CPU wind vector | look only | 128 to 256 grid, 30 Hz |
| Cloud advection and shadows on the ground | GPU visual, driven by the CPU weather state | look; cloud COVER number comes from the CPU | 128 to 256 grid, 10 to 30 Hz |
| Rain drops, splashes, mist | GPU visual | look | per frame |
| Water surface wakes, ripples, boat disturbance | GPU visual (the ocean prototype) | look | 256 to 1024 grid, 60 Hz |
| Foam, spray, bubbles | GPU visual | look | per frame |
| Rivers, floods, puddles (shallow water) | GPU-ASSISTED: GPU simulates; CPU gets a coarse "is this place flooded" at about 1 Hz and decides | flood damage is gameplay; the surface is look | 1024 grid, 30 to 60 Hz; summary 64 by 64 |
| Erosion and sediment | GPU-ASSISTED at world creation, CPU authoritative after | terrain shape is truth once built | offline or loading screen |
| Heat and moisture fields (microclimate) | CPU coarse authoritative (for crops); GPU fine version for look | crops depend on it | CPU 64 by 64; GPU 256 |
| Fire spread | CPU authoritative cellular automaton (integers); GPU draws flames and smoke | burning buildings is truth | CPU 1 to 4 Hz |
| Ecosystem: wildlife numbers, hunting, births | CPU, integers, per species and region | truth | per tick |
| Ambient wildlife: flocks of birds, fish shoals, seals on rocks | GPU visual agents, steered by CPU "attractors" | look only; counts shown agree with CPU numbers loosely | 10 000 to 1 000 000 agents |
| Crowds (people in the village) | CPU truth for the named settlers; GPU instanced extras for ambient background | named people are gameplay | up to a few thousand |
| Grass, forest, flower instancing and wind sway | GPU visual (instanced, vertex shader) | look | per frame |
| Particles (smoke, sparks, leaves, dust) | GPU visual | look | per frame |
| Lighting, shadows, fog, clouds drawn | GPU render | look | per frame |
| Audio triggers from the fields (surf loudness, wind howl) | CPU, from the CPU-side analytic functions | not from GPU readback | per tick |

## 4. What the card should compute, and how (WebGL2 first)
All sizes assume `RGBA16F` or `RGBA32F`. Costs are estimates on a 13.8 TFLOPS, 1 TB/s card (section 6).

### Ocean waves
- **Gerstner sums (cheap, good):** 4 to 12 summed Gerstner waves per vertex or pixel, with parameters from `macro_sea.js` (swell direction, height, period). Cost is a few hundred FLOPs per vertex. Works in WebGL2 and r128 with no render targets. The boat CPU side evaluates the same sum for a handful of points. Reference: Finch, ["Effective Water Simulation from Physical Models"](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models), GPU Gems chapter 1 (page not opened; found as the standard reference; Medium). Weakness: waves look too regular and cannot break or interact; mitigate with two or three wave sets at different scales and a noise-based chop.
- **FFT ocean (richer, heavier):** Tessendorf's method builds a height field from a wave spectrum and an inverse FFT each frame. A 256 by 256 FFT is 8 passes in each direction on the GPU. About 0.1 to 0.3 ms on a card like this (estimate, Low confidence). Gives the right choppy look in rough weather; tile it over the sea with a long-wavelength Gerstner for swell. It needs float render targets (`EXT_color_buffer_float`) and about 6 render passes per axis, easy in WebGL2, much easier in WebGPU compute (shared memory). Reference: [Tessendorf's course notes](https://jtessen.people.clemson.edu/reports/papers_files/coursenotes2004.pdf) (search result; Medium). Recommended for ultra tier only after Gerstner is in.
- **Interactive layer (the prototype):** a shallow-water grid around the island and boats for wakes and ripples, added to the analytic sea. See `gpusim/ocean_gpgpu.html`.

### Wind field
A 128 by 128 vector field: the CPU gives the mean wind; the GPU adds curl noise gusts that advect with the wind. Used by grass, trees, smoke, spray, clouds. Cost trivial. Medium.

### Rain and cloud advection
Cloud density texture advected by the wind field (semi-Lagrangian: sample backwards along the wind), with source terms from the CPU weather state. 128 by 128 or 256 by 256 at 10 to 30 Hz. The visible clouds are a texture lookup into this field. The cloud shadow on the ground is the same texture projected down. Rain is a particle system whose density follows the cloud field. Medium.

### Shallow water (rivers, floods, tides)
Virtual pipes (Mei, Decaudin, Hu, 2007) or a similar flux scheme (prototype). Two passes per step, four neighbours. Conserves volume with closed walls. Stable with a flux limiter. At 1024 by 1024 the world window of 256 m is 0.25 m per cell, fine enough for rivers. Larger worlds use tiles (section 5).

### Erosion and sediment
The same pipes grid plus a sediment field: erode where flow speed is high, deposit where it is low (Mei 2007 gives the steps: water increment, flow, erosion and deposition, sediment transport, evaporation). Because the terrain then changes, run it at world creation or as a slow background process and BAKE the result: the CPU reads the final height map back once and stores it as authoritative terrain. Medium-High.

### Heat and moisture fields
Diffusion plus advection on a coarse grid. The authoritative version (for crops and settler comfort) runs on the CPU at 64 by 64 in fixed-point, a few Hz. A finer GPU copy only colours the ground (wet, frosty). Medium.

### Fire spread
Cellular automaton with fuel, moisture and wind. CPU authoritative (integers, deterministic random from a seeded integer hash). The GPU renders flames, embers and smoke from the CPU's list of burning cells. Medium.

### Ecosystem agents: birds, fish, seals
Boids on the GPU. Each agent has position and velocity in a float texture (or storage buffer). Neighbour search: a uniform grid in a texture (WebGL2) or sorting plus grid in WebGPU compute. In WebGL2 with textures, a few thousand agents with an all-pairs loop, or tens of thousands with a grid of counted cells. WebGPU compute: 100 000 to 1 000 000 agents in the Radeon's range (estimate, Low confidence; the public WebGPU boids demos I found show about 10 000 agents at 60 fps in one example; Medium). The CPU sets attractors (the fishing boat, a shoal's target, a nest) and counts; the GPU does the swarming. Agents are visual: if a hunter catches a fish, the CPU removes one from the CPU count.

### Crowds, grass, forests
Instanced meshes (`THREE.InstancedMesh`, in r128) with instance matrices from a CPU array or, better, computed in the vertex shader from a seed and the height map. Wind sway in the vertex shader. Culling by distance rings. Millions of grass blades are feasible with a grass LOD scheme (blades near, cards far). Medium-High.

### Particles
Position and velocity textures, ping-pong, a point sprite or instanced quad draws them. r128 supports it with `GPUComputationRenderer` (example addon in `examples/js/misc/GPUComputationRenderer.js`; I did not open it this session; Medium).

## 5. WebGL2 in r128 versus WebGPU
| | WebGL2 + r128 (now) | WebGPU compute |
|---|---|---|
| Browser | Chrome, Safari, Firefox, iPad Safari | Chrome desktop on macOS since Chrome 113 ([Chrome blog](https://developer.chrome.com/blog/webgpu-release), High); Safari on newer OS versions (Medium-Low; not checked); not everywhere |
| Compute | no compute shaders; use fragment shaders on float textures, ping-pong | real compute shaders, storage buffers, workgroup shared memory, atomics |
| Float textures | RGBA32F / RGBA16F render targets need `EXT_color_buffer_float` (WebGL2); present on most desktops, SwiftShader, and iPad in recent iPadOS (Medium) | storage textures `rgba32float` (writable), buffers of any type |
| Transform feedback | yes (WebGL2), usable for particles | not needed |
| Readback | `readPixels` stalls; PBO plus fence helps (section 7) | `mapAsync` on a staging buffer; async by design |
| Tools in r128 | `GPUComputationRenderer` addon (WebGL1/2) | none; r128 predates WebGPU support |
| three.js route | stay on r128 | `WebGPURenderer` with TSL; the three.js manual says custom `ShaderMaterial`, `RawShaderMaterial` and `onBeforeCompile` hacks do NOT work in `WebGPURenderer` and must be ported to node materials and TSL ([manual, search text](https://threejs.org/manual/en/webgpurenderer)). The renderer can fall back to WebGL2, but compute does not work in the fallback (Medium, from a secondary guide). |
| Migration cost for this page | none | HIGH: the page has dozens of custom shaders (`ShaderMaterial` sea, post, sky injected with `onBeforeCompile`), the whole post chain, and r128-era APIs. A realistic plan is a second page or a separate compute module with its own WebGPU device that shares data with the render page through a small CPU copy, until the renderer is ported. I estimate weeks of work, not days (Low confidence on the size). |
| WGSL types | `f32`, `i32`, `u32`; **no f64**; optional `f16` via the `shader-f16` feature (check `adapter.features` at run time; [Chrome 120 note](https://developer.chrome.com/blog/new-in-webgpu-120)) | |
| Mac + AMD eGPU | WebGL2 through ANGLE on Metal; works with whatever GPU Chrome uses | untested; Dawn's Metal backend may or may not choose the external card |

**Recommendation.** Build the simulation modules as small self-contained pieces with a stable interface: `init(config)`, `step(dt)`, `texture()`/`summary()`. First implementation in WebGL2 (works in r128 today and on iPad). A WebGPU implementation of the same interface comes later for the ultra tier, selected at run time if `navigator.gpu` and an adapter exist. The CPU reference (Python numpy now, JS later) is the oracle for both.

## 6. Data layouts, sizes and step costs (arithmetic; ESTIMATES)
**Memory.** RGBA32F = 16 bytes per cell. The prototype keeps 4 textures (depth+bed, flux, two copies each for ping-pong): 64 bytes per cell. 1024 by 1024 = 1.05 M cells = 67 MB. 2048 by 2048 = 4.2 M cells = 268 MB. On a 16 GB card (High: [AnandTech](https://anandtech.com/show/13923/3)) that is 0.4 percent and 1.7 percent. Whole-world budgets: even 20 fields at 2048 squared is about 1.7 GB. Not a memory problem. On an iPad with a few GB shared, keep the whole simulation under 150 MB.

**Arithmetic per step (my count from the shader code).**
- Flux pass: about 70 FLOPs and 6 texture reads of 16 bytes per cell; depth pass: about 30 FLOPs and 6 reads. Total about 100 FLOPs and 12 reads (192 bytes of reads, 32 bytes written) per cell per step. Neighbour reads hit the cache, so real DRAM traffic is closer to 50 to 100 bytes. Use 224 bytes as the worst case.
- 1024 by 1024: 1.05 M cells x 100 = 105 MFLOP per step. At 60 steps per second: 6.3 GFLOP/s, which is 0.05 percent of 13.8 TFLOPS. Bytes worst case: 1.05 M x 224 = 235 MB per step, 14 GB/s at 60 steps per second, 1.4 percent of 1 TB/s.
- 2048 by 2048: four times that: 0.2 percent of arithmetic and 5.6 percent of bandwidth in the worst case.
- So the time per step is limited by launch and latency, not by throughput: realistically 0.1 to 0.4 ms per step at 1024 squared on this card (the 224-byte worst case at 1 TB/s is 0.23 ms, plus losses; Low confidence; must be measured), and 0.4 to 1.6 ms at 2048 squared. Four sub-steps per frame at 1024 squared is under 1.6 ms, about 10 percent of a 16.7 ms frame. The two-pass count and the small kernels are the cost.
- The Radeon VII's 60 compute units run work in groups of 64 threads (Medium; see `RADEON_VII_SPECIALITIES.md`); 1024 by 1024 is 16 384 groups, enough to fill the card many times over.
**Timing note.** The measured SwiftShader step time in `gpusim/GPUSIM.md` is for a CPU renderer and must not be used for the Radeon.

**Stability rule (CFL).** Wave speed `c = sqrt(g d)`; keep `c * dt / dx < 0.5`. The prototype's ocean (2 m deep, dx = 0.25 m, dt = 1/60) has Courant number 0.3; the flood run (8 m sea cap, dx about 1 m, dt = 0.04) has 0.36. If depth or resolution rises, sub-step or cap depth.

**Large worlds.** The game shows a 256 m window of a bigger ocean. Keep one simulation grid centred on the camera or the island ("clip-map" idea), and let the analytic macro sea drive everything outside it. Tiles of 1024 squared with a one-cell halo exchange are the next step; I did not prototype it.

## 7. Readback over Thunderbolt, and how to avoid it
- **Link speed.** A Thunderbolt 3 eGPU link carries a PCIe 3.0 x4 style data path; reviews measure about 22 Gbps (2.7 GB/s) usable, about 1.5 GB/s in practice for some workloads ([AnandTech](https://at-web1.www.anandtech.com/show/13944/exploring-tb3-egfx-with-powercolor-gaming-station-rx-vega-56-nano/2), [CNX Software](https://www.cnx-software.com/2021/03/14/using-an-egpu-with-a-mini-pc-intel-nuc-7-8/); Medium). No authoritative measurement of latency found; Low.
- **Cost of a full read.** A 1024 squared depth field in RGBA32F is 16.8 MB, in one float channel 4.2 MB. At 2.7 GB/s that is 1.6 ms for the single channel plus the wait (the GPU must finish first and the call blocks the CPU). A WebKit bug thread says the wait for the GPU shows up in `getBufferSubData` ([WebKit 235002](https://bugs.webkit.org/show_bug.cgi?id=235002), search text; Medium). So a synchronous readback per frame can cost several milliseconds and stalls the pipeline. A 4K picture reaching a TV plugged into the Mac costs 2 GB/s: see the graphics note.
- **How to avoid it:**
  1. Keep results on the GPU; draw directly from textures. (Almost everything in section 3.)
  2. Downsample on the GPU first: reduce 1024 squared to 64 by 64 with a few mip steps (one pass each), and read only 4096 values (16 KB). Negligible link time.
  3. Read late and asynchronously: in WebGL2 use a pixel pack buffer, `readPixels` into it, insert a fence (`fenceSync`), and call `getBufferSubData` only when the fence is signalled, one or two frames later ([search summary of the pattern](https://groups.google.com/g/webgl-dev-list/c/AB5vr5kRMSc); Medium). Do not busy-wait. In WebGPU, `mapAsync` is this by design.
  4. Read at low rate: 1 to 4 Hz for flood summaries, once at world creation for erosion results.
  5. Do not make decisions that need the answer this frame. The CPU uses the last known summary.
  6. Avoid the Mac being in the loop for display: connect the TV to the box (see the graphics note).

## 8. Weaker devices: same code, fewer cells
| Device | Grid | Rate | Notes |
|---|---|---|---|
| Radeon VII desk or 4K lounge | water 1024 squared, FFT 256 to 512, flocks 100k+ (WebGPU later) | 60 Hz steps | ultra tier |
| Laptop (integrated GPU) | water 256 to 512, Gerstner only, flocks 5k | 30 Hz | high tier |
| iPad | water 128 to 256 in a window around the camera, Gerstner, flocks 2k, `RGBA16F` textures, `HALF_FLOAT` if float render targets are missing | 30 Hz, or step every second frame | low tier; test `EXT_color_buffer_float`/`EXT_color_buffer_half_float` at start |
| No float render targets or no WebGL2 | CPU fallback: the numpy scheme ported to JS on a 64 to 128 grid in a Web Worker | 10 to 15 Hz | normal game still works; looks flatter |
The rule: the GPU feature is behind a switch with the same interface. The CPU-authoritative systems never depend on it. `GPUSIM.step/readDepth/stats` in the prototype is the shape of that interface.
Quality scaling, in order: halve the grid, halve the step rate, drop to analytic-only (Gerstner and noise), drop to a static texture.

## 9. Risks
- WebGL2 float render target support differs by device; always test at start and fall back (High).
- Float32 loses precision for large world coordinates and thin water films on steep land; keep fields in local metres and cap depths (the prototype caps the sea floor at -8 m) (Medium).
- A pipe model with a flux limiter is stable but not physically exact on steep dry slopes; fine for looks, never for gameplay numbers (High). The prototype's wave speed measured about 4 to 10 percent above the theoretical sqrt(g d) in a pulse test (see `gpusim/GPUSIM.md`); tune `g` if a visually correct speed matters.
- Moving to WebGPU renderer will touch every custom shader (section 5). Do it in one planned step after ultra tier lands, not gradually.
- Reading the GPU for decisions reintroduces the determinism problem. Use the deadband rule in section 2.

## 10. Open questions for Harry (taste only)
1. Do you want rivers and floods to be able to DAMAGE the village (so it becomes gameplay and the CPU decides), or only look and sound lovely?
2. Should the sea around the island show boat wakes and rain rings in detail, even if you rarely look that close?
3. Flocks of birds and fish: more of them (thousands, a spectacle) or fewer, each with its own character?

## 11. Pointer
For what the Radeon VII is especially good at, which routes on a Mac can reach it, and a survey of open-source projects to learn from, see `research/RADEON_VII_SPECIALITIES.md`. For the prototype, tests and measured numbers, see `gpusim/GPUSIM.md`.
