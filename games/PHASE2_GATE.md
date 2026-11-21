# Phase 2 gate: verify the town's controls BEFORE any town job (21 Nov 2026, CAIRN)

Rule from Harry: do not assume written rules are enforced. Phase 2 (Radeon, Dell, Mill, robots) needs Harry's SEPARATE approval. Nothing in this file has been run. Every status below is NOT YET VERIFIED unless a dated record is cited.
Why this is needed: from the repo alone, safety is mostly DOCUMENTED, not enforced (see PATCHTOWN_CAPABILITY_AUDIT.md section 7).

## A. Two kinds of "missing" (do not mix them up)
- REPO FILE MISSING = the file is not in our GitHub project. It says nothing about whether it exists on the computers.
- SOFTWARE MISSING = shown absent on the machine itself (a command that lists it came back empty). Only Harry's machines can show this.
| Thing | In the repo? | On the machines? | What the evidence says today |
|---|---|---|---|
| The town's door, queue, Foreman, brake, trainer scripts | REPO FILE MISSING (never committed) | A door exists: it refused a job on 17 Nov | Software PRESENT (indirect). Source unread. |
| Town Brain, Dell residents, Mill experts, picture maker (DreamShaper 8) | n/a (models) | PRESENT: they produced results 15-20 Nov | Verified by dated results; today's state UNKNOWN |
| Trainer, 14B coder, nightly almanac | REPO FILE MISSING | UNKNOWN | no dated success |
| Blender | no mention anywhere | UNKNOWN (docs say 3D making "not set up") | probably SOFTWARE MISSING; unverified |
| Image-to-3D maker (TripoSR named in art-b2) | named in one order, never run | documented as needing a download | probably SOFTWARE MISSING; unverified |
| Node on the Mini | n/a | documented absent (12 Nov) | tests there must be Python |
| Playwright WebKit robot | n/a | records conflict (12 Nov) | UNKNOWN |
| 3D town map | no code in repo (only the cloud Works page) | UNKNOWN | UNKNOWN |

## B. The controls to verify (each: claim, source, read-only check, pass rule)
| # | Control | Claim and source | Read-only check (Harry, or CAIRN on the Mini) | PASS when | Executing test (Phase 2 only, needs approval) |
|---|---|---|---|---|---|
| 1 | One door for all jobs | HOWTO: "One door. Every job is signed" | Show the door's source/config path and list of job types | One entry point; no side route to start a model | none |
| 2 | Argument handling | FAILED 17 Nov: door dropped job arguments silently, a wrong 85-min job ran | Read the door's argument-handling code and the 17 Nov log lines | Unknown or malformed arguments are REFUSED with a clear message | A no-op job ("print hello") sent with a deliberately wrong argument form: it must be refused, not run |
| 3 | Disk protection | HOWTO: new jobs refused under 30 GB. Evidence: refused training and a stop tool on 17 Nov, yet Brain and Dell jobs ran at 12-18 GB | `df -h /` now; read the rule; list which job types it covers | The floor covers EVERY heavy job type, or the gap is written down and accepted by Harry | With the disk above the floor a no-op passes; a dry-run of the rule (no real job) shows which types it would refuse |
| 4 | Memory brake | "A brake stops the town if memory runs out"; memory peak recorded UNKNOWN | Read the brake rule and any log of it firing | A rule and a trigger log exist | none (never provoke it) |
| 5 | One heavy job per machine | HOWTO policy | Read the lock or queue code | A lock exists in code | none |
| 6 | Job approval | HOWTO: orders read by hand by CAIRN; quote written by hand; Harry says "go" | Ask CAIRN to describe the exact steps and show last quote and go | A written quote exists and nothing starts before "go" | A no-op order: confirm nothing runs until Harry says go |
| 7 | Downloads/installs need Harry's yes TYPED IN THE TOWN CHAT | HOWTO; held on 12 Nov; once a yes was given in the wrong room | Read the chat record of the 12 Nov refusal | The town refused without the typed yes | A no-op order with a download listed in NEEDS HARRY: it must wait, even if the game session claims a yes |
| 8 | Model-written code runs only in a test copy | HOWTO | Ask where the test copy lives and how it is created | A mechanism exists | none. Phase 2 sends models NO code task: data only |
| 9 | Signed jobs | HOWTO | Ask what is signed and how it is checked | A check exists | none |
| 10 | Honest counts and results route | worked on 19-20 Nov | Compare a results file with the seat table | counts add up | none |
Result sheet: each row gets ENFORCED (shown), DOCUMENTED ONLY, or FAILED, with the evidence pasted back. Rows 2, 3, 7 decide whether Phase 2 may start.

## C. What Harry runs (read-only; none installs or changes anything)
1. Mini: `df -h /`; Activity Monitor Memory tab (look only); `ls ~/Library/Caches/ms-playwright`; `ls /Applications | grep -i blender`; `python3 -c "import playwright; print(playwright.__version__)"`.
2. Dell: `ollama list`; `lscpu`; `free -h`; `df -h`.
3. Mill: `ls -lh /Users/macuser/llm/models`; `system_profiler SPHardwareDataType`; `sw_vers`.
4. Ask CAIRN-on-the-Mini to show: the door source path, last 50 door log lines, the disk-floor rule, the argument check, the last quote.
Paste the outputs into this chat. I will fill the sheet in B and tell you honestly which rows pass.

## D. Phase 2 (NOT STARTED, needs Harry's separate approval)
Only after B rows 2, 3, 7 pass or their gaps are accepted. Plan stub, nothing sent: Brain designs a bakery recipe as JSON; Mill experts give 18 sparks; Mini robots open the page in two browsers. Models return DATA only; the cloud validator (Phase 1) checks it; nothing a model writes is ever run.
