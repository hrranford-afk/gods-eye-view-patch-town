# Radeon VII: HW-12 interim results (hardware run, 24 Nov)

Source: HW12_RESULT_INTERIM.zip from Hardware Claude, passed by the owner on 25 Nov. Machine A, Blender 3.6.14 on Metal, device AMD Radeon VII, quiet card (second run 17:20 to 17:45; the first sitting was discarded because the 14B model door restarted onto the card mid-run). Stopped at step 15 by the 30 GB disk floor (28.6 GB). Steps 15 to 17 (glass volume, growth, finalize) not run yet. I have not re-run anything: these are the hardware's numbers.

## OpenCL (compute) results
| Test | Result |
|---|---|
| basic | FAILED: the process dies at the video-memory bandwidth part. Likely cause: a bandwidth buffer at or above the 4 GiB single-buffer limit (max_alloc reported 4,290,772,992 bytes). fp64 present, fp16 not listed. |
| transfer | passed |
| shallow water FP32, 512 / 1024 / 2048 / 4096 squared | 14,450 / 7,672 / 2,309 / 598 steps per second |
| shallow water FP64, same sizes | 12,084 / 4,863 / 1,467 / 351 steps per second |
| agents, 100k / 1M / 4M | 16,000 / 6,067 / 1,760 steps per second (7,039 million agent-updates per second at 4M); exact |
| flow accumulation | 8,826 / 3,051 / 770 passes per second; exact |
| moisture diffusion (up to 8192 squared) | 25,963 down to 627 steps per second |
| parallel sum and prefix sum | passed |
| video memory | 15.5 GB allocatable; biggest single buffer 3.996 GB (4092 MB ok, 4096 MB fails) |

## Blender Cycles on the Radeon (128 samples, Metal)
| Scene | 1080p seconds | 4K seconds | Card peak MB |
|---|---|---|---|
| 1.3M triangles | 12.6 | 47.0 | 837 |
| 5.2M triangles | 16.9 | 59.4 | 1,111 |
| 21M triangles | 45.1 | 84.4 | 2,208 |
| 4K textures x4 | 13.0 | 49.0 | 1,001 |
| 4K textures x16 | 19.5 | 73.7 | 1,769 |
| 8K textures x4 | 14.7 | 50.5 | 1,769 |
| 8K textures x16 | 28.6 | 86.2 | 4,841 |
Every scene was marked FAILED by a "render came out black" check. The renders are fine: on Blender 3.6 the compositor thumbnail is written as a 192 px picture in the middle of a full-size black frame (mean about 2 of 255), so the picture guard judged the whole frame. Our fix (to do): crop or judge black on the thumbnail's own box in blender/picture_guard.py, then rebuild the order.

## What this tells us (CAIRN's reading)
1. **Compute is generous.** A million agents at 60 updates per second runs about 100 times over (6,067 per second). Four million agents is still about 29 times over. Ambient flocks, crowds and debris simulation are not a compute problem on this card.
2. **Water grids at game speed are fine.** A 4096 squared shallow-water grid runs at 598 steps per second in FP32. Waves and flood tests at several times game rate are possible in compute. This is OpenCL, not the browser; the browser path (WebGL or WebGPU) is slower and untested here.
3. **FP64 is cheap on this card for our sims.** It costs only 1.2x to 1.7x, not the 4x the card's spec rate suggests, because the sims are memory-bound. Earlier I judged FP64 not worth chasing because the browser cannot reach it; for overnight hardware jobs (hydrology, flood, sediment) it is now worth using.
4. **Memory:** plan on at most about 4 GB per buffer and about 15.5 GB total. Big textures are fine: 8K x16 peaked at 4.8 GB.
5. **Offline render capacity (Blender Cycles on Metal):** a 21M triangle scene at 1080p in 45 s, and 4K at 84 s with 128 samples. Hero stills and baked textures are practical overnight on the Radeon.
6. **The basic test failure** is a test bug (a 4 GiB buffer), not a card fault. Fix: cap the bandwidth buffer below 4 GiB.
7. **The disk floor stopped the last three steps**, not the card.

## The cable number (Thunderbolt link, from opencl_transfer.json)
Best host to card 1.93 GB/s, card to host 2.26 GB/s (ordinary pageable memory, 1 to 256 MB transfers; 1 GB = 1e9 bytes). That is the external-card link, not the card. At 60 fps it means about 30 MB per frame of fresh CPU-to-GPU data at most, and in practice less. So: keep world data, textures, the sea simulation and debris on the card; avoid per-frame uploads (big instance buffers rebuilt on the CPU every frame, large dynamic textures); read back small summaries only. This confirms the earlier design rule (gameplay state on the CPU, visual sim on the GPU, small summaries back).

## Not proven here
Browser performance (our bench pages measure that), thermals over a long run, the glass volume and growth steps.

## To do
Fix picture_guard for the 3.6 thumbnail; cap the bandwidth buffer below 4 GiB in opencl_bench; re-issue the last three steps when the disk floor allows.
