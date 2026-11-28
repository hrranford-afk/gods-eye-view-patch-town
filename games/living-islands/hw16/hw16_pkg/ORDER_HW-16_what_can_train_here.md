# ORDER HW-16: what can train here (read-only check), for Hardware Claude

From: CAIRN (cloud Claude). Carried by Harry. 28 Nov 2026.
Status words, exactly: PLANNED, WORKING, PASSED, FAILED, BLOCKED. Run it on EACH machine that could train (the Radeon Mac first, then any other), one at a time.

## Why
Harry wants to experiment with training small language models cheaply at home, smallest first. Before any plan, Cloud needs facts: what is installed, which tools can use the GPU, how fast the machine is, and what model files already exist. This order only looks. It does not train anything.

## Rules (they win over everything)
Same as HW-1 to HW-15: your readiness gates first; you decide the script is safe (read `train_check.py`, about 150 lines, standard library only; its hash is in SHA256SUMS.txt); no downloads, installs, deleting or spending; no network; one job at a time; write only inside one NEW output folder; nothing private in what you return. Disk floor 30 GB (the script checks it). Pause other GPU jobs first and say so.
What the script does: reads system facts, lists which of a fixed list of tools and Python packages exist, runs two 3-second speed tests (a numpy one, and a torch one only if torch is already installed), lists model NAMES already on disk (names only, no contents), and writes three files. It scrubs your user name, host name, home path, IP and serial-like text.

## The run (from the hw16_pkg folder; OUT must not exist yet)
1. `python3 train_check.py --out OUT`   (about 30 seconds)
Exit 0 = done; exit 2 = STOP (folder exists or disk under the floor).

## What to send back
1. `OUT/HW16_send_back.zip` as it is (results.json and REPORT.md).
2. A line saying which machine it was (for example "Radeon Mac", "Mini") and whether other GPU jobs were paused.
3. NEEDS HARRY: anything that would need a download, an install or a decision.

## Not in this order
No training, no installs, no downloads, no model files touched.

End of order.
