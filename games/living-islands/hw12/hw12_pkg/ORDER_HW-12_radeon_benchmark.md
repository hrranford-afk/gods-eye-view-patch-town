# ORDER HW-12: Radeon VII benchmark, every useful way, for Hardware Claude

From: CAIRN (cloud Claude). Carried by Harry. 24 Nov 2026.
Status words, exactly: PLANNED, WORKING, PASSED, FAILED, BLOCKED. Machine A only (the Mac with the AMD Radeon VII, 16 GB HBM2, in the Razer Core X over Thunderbolt; Blender 3.6 on Metal; Python 3 with numpy and PIL; no GPU libraries installed, none needed).
Package folder: `hw12_pkg/`. The same steps are in `STEPLIST.txt` (one command per line, execution order) for your order runner.

## Why
Cloud plans the whole Living Islands world simulation (water, rivers, moisture, tens of thousands to millions of agents) and the big renders around what this one card can really do. Until now every number has been a guess from the spec sheet. This order measures the card directly, in two ways:
1. OpenCL, written with ctypes only, so nothing is installed: raw speed (FP32, FP64, integer), memory speed, the Thunderbolt link speed in both directions, how much video memory can really be allocated, and the actual world-simulation kernels (shallow water on 512 to 4096 squared grids in single and double precision, river flow accumulation, moisture diffusion, 100 thousand to 4 million agents, sum and prefix-sum).
2. Blender Cycles on the Radeon via Metal: scenes with 1.3, 5.2 and 21 million triangles, 4K and 8K textures, glass and volume, then a memory-growth test to find where a render fails.
Cloud then answers, from the numbers: can the game run a million agents at 60 updates per second, which grid sizes the water can run at, whether double precision is worth it for hydrology, how fast the link fills 16 GB, and which scenes are safe to send for rendering.

## Rules (they win over everything)
Same as HW-1 to HW-11, plus:
- You own machine safety. You may reorder, pause, shorten or refuse any step, and you decide the scripts are safe: read them first (hashes in `SHA256SUMS.txt`; check with `shasum -a 256 -c SHA256SUMS.txt` inside the package folder).
- Fixed, checksummed scripts only. No model-written code is run at order time. No `.pyc` or `__pycache__` in the package (the scripts do not write any; if you see one, delete only that one and say so).
- No downloads, no installs, no network, no deleting, no spending. Python standard library plus numpy and PIL only; the scripts import no other package (not pyopencl). The OpenCL part talks to the system OpenCL framework through ctypes.
- One job at a time. Stop at the first failure only when it is a disk-floor or safety failure (exit code 2). Any other failed step: record its exact error text and carry on with the next step; it is independent.
- **Pause other GPU jobs first.** A Python job was using about 3 percent of the Radeon. Pause it (and any render or bake that uses the card) before Step 2 and let it stay paused until the end, so the card is quiet. Resume it afterwards and say so in your reply. If you cannot pause something, say which, and say the numbers were measured with it running.
- Disk floor 30 GB, checked at the start and again right before the Blender steps (STOP if under).
- Outputs go in one new folder, `OUT` (must not exist yet). Everything the scripts write is under `OUT/hw12/`.
- Nothing private in what you return: home folders, user names, serial numbers and UUIDs are removed by the scripts; check anyway.
- Every step has a time cap and an expected time (table below). The runner kills a step at its cap and records FAILED with the text "timed out".
- Memory safety is built in: the Blender scripts read this Mac's RAM and refuse any scene or textures that would take more than about half of it (500 bytes per triangle, measured; 60 percent for textures). A refused scene is reported as BLOCKED with the reason, not as a failure of the card. You may lower the limit with `--max-mtris`, never raise it above what you are comfortable with.
- Deadline: Harry gives it. If he gives none: the OpenCL part (Steps 0 to 7) must be finished within 30 minutes of starting it; the Blender part (Steps 8 to 16) within 4 hours of starting it. You may do them in two sittings; Step 0 and Step 7's disk check are repeated by the script.

## Step 0: read-only checks (about 2 minutes, no script)
1. Python 3 with numpy and PIL: `python3 -c "import numpy, PIL"`.
2. Free disk on the drive that holds OUT: at least 30 GB.
3. Blender 3.6 path (for example `/Applications/Blender.app/Contents/MacOS/Blender`). Call it BLENDER below.
4. The Radeon is attached and idle (Activity Monitor GPU history, or your own check). Pause other GPU jobs as above.
5. Hash check of the package; read `opencl_ctypes.py` first (the only script that calls into the system), then the rest.
6. The script step `init` (row 0 below) repeats the disk, numpy and PIL checks and makes OUT.

## The run
Either one command (the runner in the package does every step below in order, with the caps):

    python3 run_all.py --out OUT --blender BLENDER

or step by step with your own runner, from `STEPLIST.txt` (replace `{OUT}` and `{BLENDER}`): each line is `python3 run_all.py --out {OUT} --step NAME [--blender {BLENDER}]`. Exit codes of each line: 0 passed; 1 this step failed or is blocked (recorded; go to the next step); 2 STOP (disk floor, OUT exists, numpy or PIL missing: do not continue).

| # | Step name | Expected | Cap | What it does |
|---|---|---|---|---|
| 0 | init | 2 s | 30 s | creates OUT/hw12, checks the 30 GB floor, numpy, PIL |
| 1 | inventory | 15 s | 120 s | read-only facts: GPU, Thunderbolt link speed and width if macOS shows them, macOS, RAM, Blender version, whether OpenCL.framework loads. Runs only `system_profiler`, `ioreg`, `sysctl`, `sw_vers`, `uname`, `blender --version` |
| 2 | opencl_basic | 2 min | 7 min | device info (name, compute units, clock, memory, local memory, work-group size, extensions incl. fp64 and fp16, vector widths); kernel launch delay; FP32, FP64 (if cl_khr_fp64), FP16 (if cl_khr_fp16) and integer speed; video-memory bandwidth copy/read/write on 256 MB to 4 GB buffers; local-memory bandwidth |
| 3 | opencl_transfer | 40 s | 4 min | host to card and card to host speed for 1 MB to 1 GB: this is the Thunderbolt limit |
| 4 | opencl_sim | 5 min | 15 min | world simulation. First a correctness check against numpy at small size (FP32 and FP64 against a float64 truth, exact for flow accumulation), then speed: shallow water 512, 1024, 2048, 4096 squared in FP32 and FP64 (steps per second, effective GB/s); river flow accumulation passes; 5-point moisture diffusion up to 8192 squared; agents 100 thousand, 1 million, 4 million (updates per second) |
| 5 | opencl_parallel | 30 s | 3 min | sum of 64 million numbers (float and exact integer) and prefix sum of 1, 4 and 16 million |
| 6 | opencl_vram | 1 min | 5 min | biggest single buffer; total allocatable video memory in 256 MB pieces up to a hard cap of 15.5 GB, stopping at the first failure, checking every piece reads back right, releasing it all afterwards; flags if the driver seems to be using host memory instead |
| 7 | disk_check | 1 s | 30 s | disk floor again; STOP (exit 2) if under 30 GB |
| 8 | blender_tri_1M | 2.5 min | 15 min | Cycles on the Radeon only: 4 unique ico-sphere meshes, 1.3 million triangles; 1920x1080 and 3840x2160; 128 samples |
| 9 | blender_tri_5M | 5 min | 20 min | same, 5.2 million triangles |
| 10 | blender_tri_20M | 10 min | 30 min | same, 21 million triangles (refused if RAM is too small) |
| 11 | blender_tex_4K_x4 | 2.5 min | 15 min | four 4K image textures made in memory; same two sizes |
| 12 | blender_tex_4K_x16 | 5 min | 20 min | sixteen 4K textures |
| 13 | blender_tex_8K_x4 | 5 min | 20 min | four 8K textures |
| 14 | blender_tex_8K_x16 | 10 min | 30 min | sixteen 8K textures (about 4.3 GB of textures on the card; refused if RAM is too small) |
| 15 | blender_glass_volume | 5 min | 20 min | nine glass spheres in a principled-volume cube, 16 bounces |
| 16 | blender_growth | 15 min | 50 min | memory growth: 1, 2, 4, 6, 8, 12, 16 spheres of 5.2 million triangles each, one Blender process per level, small render each, until a render fails or the memory safety cap |
| 17 | finalize | 5 s | 1 min | writes results.json, REPORT.md, HW12_RESULT_DRAFT.md and HW12_send_back.zip |

Expected total about 70 minutes (OpenCL part about 10 minutes); caps add up to about 4.3 hours. The expected times for the Blender steps are Cloud's guesses (no Radeon numbers exist yet): if a step is far over, you decide whether to let it reach its cap.

How the Blender steps keep it honest: each scene runs in its own Blender process (`blender -b --python blender_cycles_bench.py -- ...`), selects ONLY the AMD GPU in Cycles preferences (never the CPU; if no Radeon is found it prints the list of devices it saw, exits with code 4, and the step is BLOCKED), prints `HW12_DEVICE_USED METAL [...]` into the log, does one tiny warm-up render first (the first Metal render compiles kernels), then times each render with wall clock. The only pictures written are tiny 192-pixel thumbnails. Peak memory comes from Blender's own log lines.

## If something fails
- Record the exact error text (the script keeps it in `steps.json` and `logs/`), say BLOCKED if the card or framework could not be used at all, FAILED if it ran and went wrong, and continue with the next step.
- OpenCL framework not loadable or no device whose name contains "Radeon": Steps 2 to 6 come out BLOCKED with the list of devices seen. Do not benchmark the Intel or CPU devices; tell Cloud the names and Cloud will adjust `--device-match`.
- A failed correctness check (shallow water, flow accumulation, diffusion, agents, reduction, scan) is reported as FAILED for that section with the numbers; the speed rows of that section are then left out on purpose.
- Metal device name not matching "Radeon" in Blender: the log has `HW12_DEVICE_LIST` lines; you may re-run just that step with `--gpu-name TEXT` (the exact device text), and say so.
- A GPU hang or a Mac that needs a restart: stop, say so, send what you have. Never retry a step that hung the machine.

## What to send back (one small zip)
1. `HW12_RESULT.md`: PASSED / FAILED / BLOCKED per step (the draft the runner writes, `HW12_RESULT_DRAFT.md`, has the table; correct it with what you saw), the seconds each took, the exact error text of any failure, whether other GPU jobs were paused and resumed, whether the disk stayed above 30 GB, anything you refused or reordered and why.
2. `OUT/hw12/results.json` and `OUT/hw12/REPORT.md` as they are.
3. `OUT/hw12/HW12_send_back.zip` (everything above plus inventory, per-section JSON, the tiny thumbnails and the scrubbed logs).
4. NEEDS HARRY: anything needing a download, an install or a decision (for example "the Radeon appears in Blender as X, tell me whether to use it", or "macOS shows no Thunderbolt link speed").
No logs with paths, usernames or addresses (the scripts scrub; look once more before sending).

## What Cloud will do with the numbers
Cloud will put them into the world-simulation budget: the biggest water and moisture grid that runs at 60 steps per second, the agent count that fits in one frame, whether hydrology gets FP64 (the rule is written into REPORT.md), the chunk size for moving data over the Thunderbolt link, and which of the large renders (triangles, textures, glass and volume) are safe to queue on this card without running out of memory. Cloud will also fix any benchmark that looks wrong (REPORT.md lists suspicious numbers under "Things that look wrong") and send a follow-up order only if a number needs a second look.

## NEEDS HARRY
Nothing is needed from Harry to start. If a Thunderbolt link speed is not shown by macOS, or Blender names the card differently, Hardware Claude will say so in NEEDS HARRY.

## Not in this order
No installs (pocl, pyopencl and similar were used only in Cloud's test copy), no renders beyond these thumbnails, no network, nothing outside one output folder, no changes to Blender or macOS settings.

## Untested on the Mac (Cloud could not run these here; likely points of failure, most likely first)
1. Blender 3.6 on Metal: the device name must contain "Radeon" for the selection to find it, and the Metal API names differ between versions. Blender 4.2 and 5.3 with CPU Cycles stood in for the render logic, not for Metal.
2. The thumbnail output uses Blender's compositor (`scene.node_tree`, File Output node); checked on Blender 4.2, not 3.6. If it fails the render still runs and the step says "picture not checked".
3. OpenCL on this macOS: device list order, which of the devices is the Radeon, whether `cl_khr_fp64` is listed, the reported maximum single allocation (often about a quarter of memory), and event-profiling accuracy. The ctypes types were checked against the real OpenCL headers and the kernels were run on a CPU OpenCL (pocl), never on the AMD driver; the AMD compiler may reject something pocl accepted (the build log is recorded in that case).
4. Thunderbolt link speed and width in `ioreg` and `system_profiler`: the field names are guesses; the report says "not exposed" if nothing matches.
5. The video-memory probe: macOS may hand out card memory lazily or quietly spill to host memory; the probe touches every piece and flags a slowdown, but this logic is untested against the real driver.
6. Time guesses for the Blender steps.

End of order.
