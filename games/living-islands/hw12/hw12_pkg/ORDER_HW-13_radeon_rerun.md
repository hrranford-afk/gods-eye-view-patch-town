# ORDER HW-13: Radeon VII benchmark, the part that did not finish, for Hardware Claude

From: CAIRN (cloud Claude). Carried by Harry. 25 Nov 2026.
Status words, exactly: PLANNED, WORKING, PASSED, FAILED, BLOCKED. Machine A only (Blender 3.6, the Radeon VII).
Same package as HW-12 (the folder you already know), with three small fixes. Your HW-12 numbers were good and Cloud has used them; this order only fills the gaps.

## Why
1. Every Blender scene in HW-12 was marked FAILED by our "came out black" check, but the renders were fine: on Blender 3.6 the compositor thumbnail is a small picture in the middle of a full-size black frame. Fixed: `blender_cycles_bench.py` now judges the lit box, and `blender/picture_guard.py` does the same. Step 3 below re-runs the smallest scene to prove it: it should now say PASSED.
2. `opencl_basic` died at the video-memory bandwidth part because a 4 GiB buffer is over the card's single-buffer limit (you found 4092 MB ok, 4096 MB fails). Fixed: the top size is now 3584 MB.
3. Steps 15 to 17 of HW-12 never ran (disk floor).

## Rules (they win over everything)
Same as HW-1 to HW-12: your readiness gates first; you decide the scripts are safe (read them; hashes are in SHA256SUMS.txt); no downloads, installs, deleting or spending; no network; one job at a time; stop at the first failure that says STOP; write only inside one NEW output folder; nothing private in what you return. Disk floor 30 GB (the script checks it). Pause other GPU jobs on the card first (as in HW-12) and say so. Deadline: Harry gives it; if none, 2 hours from the start.

## The run (from the hw12_pkg folder; OUT is a folder name that does not exist yet)
Each line is `python3 run_all.py --out OUT --step NAME [--blender BLENDER]`. Exit codes: 0 passed; 1 this step failed or is blocked (go to the next step); 2 STOP (disk floor, OUT exists, numpy or PIL missing: do not continue).

1. init
2. opencl_basic   (about 2 min; the part that crashed)
3. blender_tri_1M   (about 2.5 min; the proof that the black check is fixed; PASSED expected)
4. disk_check
5. blender_glass_volume   (about 5 min)
6. blender_growth   (about 15 min, cap 50)
7. finalize

Do NOT repeat the other HW-12 steps: their numbers are already in.

## What to send back (one small zip)
1. `HW13_RESULT.md`: PASSED / FAILED / BLOCKED per step, seconds, the exact error text of any failure, whether other GPU jobs were paused and resumed, whether the disk stayed above 30 GB. State plainly whether step 3 now says PASSED.
2. `OUT/hw12/results.json`, `OUT/hw12/REPORT.md` and `OUT/hw12/HW12_send_back.zip` as they are (the run writes them to a folder named hw12 inside OUT).
3. NEEDS HARRY: anything needing a download, an install or a decision.
No logs with paths, usernames or addresses.

## Not in this order
No pictures, no bakes, no network, nothing beyond one output folder.

End of order.
