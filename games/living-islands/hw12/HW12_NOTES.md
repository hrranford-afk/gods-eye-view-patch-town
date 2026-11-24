# HW-12 notes: Radeon VII benchmark (design, what each benchmark proves, ranked risks)

Order: `hw12_pkg/ORDER_HW-12_radeon_benchmark.md`. Build: `python3 -B build_package.py ZIP`. Tests: `tests/`.

## Design
- One package folder `hw12_pkg/`, fixed scripts, SHA256SUMS, no bytecode. Python standard library plus numpy (and PIL only in the start-up check). Nothing installed, downloaded, deleted or sent.
- `opencl_ctypes.py`: OpenCL 1.2 through ctypes against `/System/Library/Frameworks/OpenCL.framework/OpenCL` (falls back to the short framework name and `find_library`, because on macOS 11+ the file is not on disk but still loads). 64-bit bitfields (`cl_mem_flags`, `cl_device_type`, `cl_command_queue_properties`), 32-bit `cl_int/cl_uint/cl_bool`, pointer-sized `size_t` and handles. Errors raise `CLError` with the `CL_*` name and, for builds, the full build log. `clCreateCommandQueue` first (macOS is OpenCL 1.2), `clCreateCommandQueueWithProperties` only if that is refused or missing.
- `opencl_kernels.py`: all kernels as OpenCL C 1.2 strings; fp64 and fp16 only behind `-D USE_FP64/USE_FP16` so a missing extension cannot break the rest.
- `opencl_bench.py`: 17 sections in 5 groups (basic, transfer, sim, parallel, vram). Each section is wrapped: an error becomes `{"status":"FAILED","error":...}` and the next section runs. Every measurement is warm-up plus median of several runs, kernel time from event profiling (falls back to wall clock if the event clock looks wrong), 8 s hard cap per measurement, a time budget per section, and kernels auto-tuned to about 40 ms so none is long enough to trip the GPU watchdog. Exit 0 / 3 (a section failed) / 5 (no framework or no matching device; JSON still written).
- `sim_refs.py`: numpy references. Shallow water is Lax-Friedrichs with 5 fields (h, hu, hv, bed, source); the GPU FP32 and FP64 results are compared with a numpy float64 run of the same scheme.
- `blender_cycles_bench.py`: one scene per Blender process, GPU only (exit 4 if no Radeon), warm-up render, thumbnails through the compositor (no full-size picture is ever written), RAM guards before building anything.
- `run_all.py`: the step table, caps, status recording (`steps.json`), finalize (`results.json`, `REPORT.md`, draft `HW12_RESULT.md`, send-back zip). `--smoke` runs tiny sizes anywhere. `STEPLIST.txt` is generated from the same table, and a test checks they match.
- `hw12_common.py`: scrubbing, statistics, size planning, error names, PCIe decoding, summary rows and flags, report text, Blender log parsing.

## What each benchmark proves
| Section | What it proves for the game |
|---|---|
| fma_f32 / fma_f64 / fma_f16 / int_ops | raw arithmetic ceiling; FP64:FP32 ratio (Radeon VII should be about 1:4); checked against a closed form so a mis-compiled kernel is caught |
| mem_bw | HBM2 copy, read, write GB/s at 256 MB to 4 GB (paper figure about 1 TB/s); the ceiling for every grid simulation, which is memory-bound |
| local_bw | on-chip memory speed (matters for stencils and scans written with tiles) |
| latency | launch cost: how many small kernels per frame are affordable |
| transfer | the Thunderbolt link in both directions, 1 MB to 1 GB; sets the cost of moving world chunks to and from the card |
| shallow_water | steps per second on 512 to 4096 squared grids in FP32 and FP64, effective GB/s; FP32 error against the float64 truth after 200 and 2000 steps shows what double precision buys |
| flow_accum | river accumulation pass speed and exactness against numpy (also reports how many passes a small terrain needs) |
| diffusion | 5-point moisture/heat stencil, the cheapest grid process; shows the best-case grid rate |
| agents | field sampling plus neighbour separation for 100 thousand, 1 million, 4 million agents; the "can run N agents at 60 updates per second" answer |
| reduction / scan | building blocks for statistics, histograms and compaction; exactness is checked (integer sum exact, scan equals numpy cumsum) |
| max_buffer / vram | the real biggest buffer and total usable video memory, with read-back verification and a spill detector |
| Blender tri / tex / glass / growth | whether big renders fit and how long they take on Metal; where memory runs out |

## Testing done (Cloud, Linux sandbox)
- Pure python: 50 unit tests (scrubbing, timing loop with a fake clock, auto-tune, size planning, error names, PCIe decoding, inventory parsing with fake `system_profiler`/`ioreg`/`sysctl` text, summary and report logic with fake Radeon-like data and with wrong numbers to trigger every flag, Blender log parsing, step list, package rules). Also run on Python 3.9.
- ctypes against the real headers: constants and integer widths compiled and compared with `CL/cl.h`; every prototype compared argument by argument. A deliberate wrong argtype is caught (mutation check).
- Kernel math on pocl (CPU OpenCL, test virtualenv only): all 17 sections, smoke sizes, plus full-size runs of the transfer, parallel, basic and sim groups on the CPU; FP32 shallow water against numpy float64 (error about 2e-5), FP64 about 3e-15, flow accumulation and diffusion and agents against numpy, reduction and scan exact. Deliberately broken kernels (wrong gravity constant, wrong scan offset) are caught.
- Failure paths: missing library gives exit 5 with the exact error text, no matching device exit 5, build error carries the compiler log, invalid launch gives the right `CL_INVALID_*` name, a failing section does not stop the next one, the VRAM probe stops at the first allocation failure.
- Blender: `blender_cycles_bench.py` under bpy 4.2 (CPU Cycles) for every scene in smoke sizes, thumbnails looked at; the GPU-not-found path (exit 4, no CPU fallback); the triangle and RAM safety skips. bpy 5.3 runs the scenes but not the thumbnail compositor (API removed in 5.x, falls back to "picture not checked"). Memory measured: about 380 bytes per triangle on a 21 million triangle scene (CPU Cycles).
- Whole order in `--smoke` mode end to end (`run_all.py`), then from a clean unzip of the final zip with every hash verified.

## Ranked risks (UNTESTED on a Mac)
1. **Blender 3.6 on Metal**: device name must contain "Radeon"; `compute_device_type` / `get_devices()` behaviour on 3.6; first-render kernel compilation (warm-up render handles it); Metal memory behaviour on out-of-memory (Cycles may print an error and give a black picture rather than raise; the black-picture guard and log scan are there for that).
2. **Compositor thumbnails on 3.6** (`scene.node_tree`, Scale node sockets, File Output slot path): checked on 4.2 only. Failure is non-fatal.
3. **AMD OpenCL compiler on macOS**: may reject or miscompile something pocl accepts (for example `half2` casts, 64-bit atomics are not used, `ulong` loop counters, `fma` on doubles). Build logs are kept. A wrong result is caught by the correctness checks and the section is FAILED, not silently reported.
4. **Which OpenCL device is the Radeon**: macOS lists CPU and Intel GPUs too. Match is by "Radeon" in name or vendor; no match means BLOCKED, never a different device.
5. **Event profiling timers on macOS OpenCL**: if the device clock is off, the code falls back to wall clock for batches; single transfers always use wall clock.
6. **Video-memory probe**: lazy allocation or silent spill to host memory; the touch-and-verify plus spill detector is a heuristic.
7. **Thunderbolt link fields in ioreg / system_profiler**: names guessed; absence is reported as "not exposed".
8. **GPU watchdog / hang**: kernels are tuned short, but a driver hang would need a restart; each Blender scene is a separate process so a crash loses only that scene.
9. **Time estimates for the Blender steps** and the host memory use of 8K textures (guarded by RAM).
10. `clCreateCommandQueue` is deprecated: fine on macOS (OpenCL 1.2) but the fallback to `...WithProperties` was only exercised in code review, not on a device that needs it.
11. Python on the Mac: numpy pointer arithmetic via `ndarray.ctypes.data` and `size_t` width assume a 64-bit Python (all current macOS Python 3 builds are).

## Interpretation notes
- Bandwidth figures use 1 GB = 1e9 bytes; memory sizes in the report use 1 GB = 1024 MB.
- Shallow-water effective GB/s counts 5 fields read and 3 written per cell per step (full cache reuse assumed), so it can exceed the card's raw bandwidth only if the cache works unusually well; the report flags results above the paper maximum.
- "FP64 worth it for hydrology": yes if FP64 costs 4x or less on the 2048 squared grid, or if the FP32 error against the float64 truth passes 0.001.
- Agent update count: "updates per second" means whole-population steps per second; 60 is the frame-rate target.
