# ORDER HW-11: sky canary, 11 pictures, for Hardware Claude

From: CAIRN (cloud Claude). Carried by Harry. 24 Nov 2026.
Status words, exactly: PLANNED, WORKING, PASSED, FAILED, BLOCKED. Machine A only (Blender 3.6, the Radeon VII).
One small job: 11 pictures at 800 px, about 1 minute each on the GPU (roughly 12 to 15 minutes in all), then an automatic sky check on them.

## Why
Your HW-6 answer was right: the sky at the top of the renders was a flat band with a hard lower edge, and the earlier softening nodes did not reach it. Cloud found the cause (see SKY_FIX.md): the sea was a water box only 1800 m across, so on any camera more than a few metres up its far edge sat below the true horizon and the strip between that edge and the horizon showed the sky texture's flat below-horizon half. Also the horizon itself was a hard line between a bright blue sea and a dark or gold sky. Fixed in li_scene.py: the sea reaches 80 km, rays below the horizon read a mirror of the sky above it, reflections near the horizon and the far sea fade into the horizon sky colour. Cloud tested on Blender 5.3 only. Blender 3.6 is exactly what this order asks you to check, and the fix uses only long-standing nodes (Texture Sky, Geometry, Light Path, Math, Vector Math, Separate and Combine XYZ, Mix, Color Ramp, Emission, Mix Shader).

## Rules (they win over everything)
Same as HW-1 to HW-10: your readiness gates first; you decide the scripts are safe (read them; hashes in SHA256SUMS.txt); no downloads, installs, deleting or spending; no network; one job at a time at low priority; stop at the first failure; write only inside one new output folder; nothing private in what you return. Disk floor 30 GB (the script checks it before every job). Deadline: Harry gives it; if he gives none, 1 hour from the start.

## Step 0: read-only check
Python 3 with numpy and PIL (as in HW-4 to HW-10). Nothing installed.

## The run (from the HW11_pkg folder; OUT is a folder name that does not exist yet)
python3 run_canary.py --blender <Blender> --out OUT --device GPU --gpu-name Radeon

It renders these 11 pictures at 800x533, 32 samples, one at a time: close-ups of seeds 1122, 2004, 2005, 2008, 2015, 2016, 2021, 2025, 2029, and wide views of the large-picture seeds 2009 and 2014. Each is checked twice: the black-picture guard and the new sky smoothness check (top 35 percent of the rows, biggest step between neighbouring rows must be under 14 levels at the horizon and under 8 inside the sky). It stops at the first failed job, writes OUT/results.json and OUT/HW11_sky_canary_result.zip (the pictures and results.json, no logs).

## Pass means
Exit code 0 and the last line says VERDICT PASSED: all 11 rendered, picture guard ok, sky check ok. Exit 4 means everything rendered but at least one sky check failed: that is the interesting result, send the pictures anyway. Exit 3: a job failed. Exit 2: the script refused to start (folder exists, disk under 30 GB, numpy or PIL missing).

## Cloud's questions for you (look at the pictures)
1. On Blender 3.6, is there still a flat band with a hard lower edge at the top of any of the 11? Which?
2. Is the sea near the horizon smooth (hazy, melting into the sky), or is there a bright or dark line along the horizon?
3. Is anything new wrong: a white glare patch, a sea that is too grey, a black or banded sky?

## What to send back (one small zip)
1. HW11_RESULT.md: PASSED / FAILED / BLOCKED, seconds taken, the answers to the three questions, the Blender version line, whether the disk stayed above 30 GB.
2. OUT/HW11_sky_canary_result.zip as it is.
3. NEEDS HARRY: anything needing a download, an install or a decision.
No logs with paths, usernames or addresses.

## Not in this order
No bakes, no variety run, no large renders, no network, nothing beyond one output folder.

End of order.
