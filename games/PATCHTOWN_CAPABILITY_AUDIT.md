# PatchTown capability audit (21 Nov 2026), by CAIRN

Read-only. Nothing installed, launched, changed or bypassed. Two auditors read the repo; CAIRN spot-checked the biggest claims (no Blender anywhere; Dell Writer 0 characters in 46 of 46 rounds; the order form says orders are read by hand).
LIMIT: no machine of Harry's was attached to this session (folder list empty). Everything about the Mini, Dell, Mill and the town's door is from the repo's records (dated), NOT live. "VERIFIED" = a dated record shows it working, not that it works today.
Full evidence: audit/AUDIT_A_... (workshop) and audit/AUDIT_B_... (games). Labels: VERIFIED / AVAILABLE BUT UNTESTED / MISSING / UNKNOWN.

## 1 Hardware
| Item | Class | Note |
|---|---|---|
| Mini 2018, 6 cores, 20 GB, no Node | VERIFIED (12-13 Nov) | disk 12 to 18 GB on 17 Nov, under the 30 GB floor; no reading since |
| Radeon VII 16 GB (one heavy job at a time) | VERIFIED for the Brain only | about 9 tok/s average |
| Dell Xeon 4 cores 32 GB, CPU only | VERIFIED, slow | answers 73 s to 2,981 s; disk/OS not recorded |
| Mill Mac Pro 2010, 882 GB free | VERIFIED (13 Nov) | RX 560 not used; training on it untested |
| Link from cloud to machines | MISSING | Harry pastes both ways |
| Live state of all machines | UNKNOWN | nothing attached |

## 2 AI workers
| Worker | Class | Note |
|---|---|---|
| Town Brain 35B (plans, picks, warnings) | VERIFIED | results 17, 19, 20 Nov; best record |
| Dell residents (JSON own-answers) | VERIFIED, mixed | Writer 0 chars in 46/46 rounds; Surveyor and Elder timed out; Scholar 20-90 min |
| Mill tiny experts (sparks) | VERIFIED, narrow | Toymaker, Wargamer, Fabulist: 18 sparks, 0 noise |
| Mill Hand 1.5B | VERIFIED as FAILING at JSON | 4 of 4 broken (19 Nov) |
| Picture maker (words-only) | VERIFIED as unreliable | canary failed 3 times; 0 of 6 matched; no texture ever delivered |
| Trainer; 14B coder; nightly almanac | UNKNOWN | no dated success in repo |
| Guest AIs via Harry (ChatGPT, Gemini, Grok) | VERIFIED | outpitched the tiny experts (20 Nov) |

## 3 3D production
| Item | Class |
|---|---|
| Blender | MISSING (zero mentions anywhere) |
| Image-to-3D model maker | MISSING (art-b2 never run; needs download + Harry's yes in town chat) |
| glTF/USD export from the town | MISSING |
| Rigging/animation by the town | MISSING |
| Procedural three.js library (cloud-made): mice with poses, kit, six Yard buildings | VERIFIED |
| 34 CC0 models (Kenney, Quaternius) | VERIFIED present, NOT wired in |
| Animated mouse GLB (ChatGPT-made) | VERIFIED (13 Nov) |

## 4 Game development
| Item | Class | Note |
|---|---|---|
| three.js r128 everywhere, no build step | VERIFIED | reason for the pin not documented; changing it means retesting all AR |
| Rule-based support/collapse engine (sofa-siege) | VERIFIED headless | 11 suites pass |
| Rapier physics (Brick Lab, 3 builds) | VERIFIED Node + Chromium | Harry's iPad runs 21 Nov (hash 9f08783c; castle 383 about 22 fps) are NOT yet in the repo |
| AR in a fake WebXR | VERIFIED | 84 checks |
| AR on a real iPad: Base Camp | VERIFIED partly (14-16 Nov) | best real-device evidence |
| AR on a real iPad: Round Table Kingdom engine | UNKNOWN | only Harry's 21 Nov statement |
| Sticker lock on a real iPad | VERIFIED once (16 Nov) | a Room 7 vs Room 3 mix-up unexplained |
| iPad frame rate for any game | MISSING (except Brick Lab bench) | |
| Baguettes & Ballistics | VERIFIED live | arcade code, one 11,307-line file, no build |

## 5 Automation
| Item | Class |
|---|---|
| Order form + canary + test + honest counts | VERIFIED (the best-proven procedure) |
| The town's door/queue/Foreman/brake code | UNKNOWN: not in the repo; a door exists (it refused jobs on 17 Nov) |
| Automatic quote and gate | MISSING (CAIRN reads each order by hand) |
| API from cloud to town | MISSING |
| Robot browsers: Chromium | VERIFIED (12 Nov); WebKit UNKNOWN (conflicting records) |
| Results route | VERIFIED manual: Harry pastes, never a push |
| Ledger (145 lines pass) + Works page | VERIFIED, cloud side; last entry 19 Nov (stale) |
| Cloud builders and testers | VERIFIED (stop at account usage limits) |

## 6 Existing projects (reuse; full list in audit B)
As is: Building Yard builders + support rule; SS models and mice; texture atlas; versioned layout/design/weapon formats; Rapier sim layer + bench; room kit + sticker lock; Lab prototype slots; headless test harness patterns. With adaption: Base Camp economy/market/places; autosave with backup; bots and win-rate harness.

## 7 Safety (ENFORCED vs DOCUMENTED)
- ENFORCED, logged: the door refused training and a stop tool below the 30 GB disk floor (17 Nov); the ledger privacy check is real code (rejects emails, phones, tokens).
- DOCUMENTED only: one heavy job per machine, memory brake, signed jobs, test-copy-only for model code, nothing deleted, approval before downloads/money/security.
- FAILED once: the door silently dropped job arguments (a wrong 85-minute job ran).
- Approval is BY CONVENTION: Harry's yes must be typed in the town chat; it held on 12 Nov, but a yes was once given in the wrong room. No technical gate exists.
- The 30 GB floor applied only to some job types (jobs ran at 12-18 GB).
- 21 contradictions between documents are listed in audit A section 7 (e.g. 12 vs 13 experts; "Foreman" means two things).

## 8 Missing for a polished AR city game
1. Real-iPad evidence: AR for this engine, frame rate, heat (needs Harry's iPad; no install).
2. A data-driven building format. Today's Yard buildings are hand-coded in models.js, so models cannot propose buildings as data yet. (cloud work)
3. A city simulation: citizens, jobs, roads, traffic, services. Only Base Camp's colony/economy and the mice menders exist.
4. 3D/art pipeline for variety: Blender is MISSING. Optional, needs a download and Harry's yes. Decide after the bakery test.
5. Audio: synthesised sounds only, never listened to; no music.
6. A shared city save format; a deploy and live-check script (deploys are manual).
7. Rights: AI-made art is public with no stated licence (Harry's decision).
8. Housekeeping: record Harry's iPad runs in BRICKLAB.md; a "Mario Kart" comment in B&B code and "Micro Machines" in docs conflict with the no-brands rule; content check of public screenshots; Mini disk and WebKit state to confirm.

## The small safe end-to-end test: one miniature city building ("bakery-1")
Aim: prove create, test and display with ONLY verified capabilities. No downloads, no installs, no Blender, no picture maker, no Dell Writer/Scholar, no code written by models.
Rule: models return DATA only. Cloud-side code validates it. Model output is never run.
1. CLOUD (game session): define a building recipe format, schema rtk.building v1 (name, footprint, parts with id, kind, size, position, stage trim/walls/frame, needs). Write the validator and a small adapter that builds a model from a recipe using the existing SS pieces and the existing support rule. Test with the six Yard buildings re-expressed as recipes. (NEW code, about a day of builder time; this is the gap in section 8.2.)
2. TOWN stage A, talent how-to-build (Brain on the Radeon, about 15 min): given the format, a part list and a brief ("a small bakery with a chimney and an awning"), return one recipe as JSON. Canary: the JSON parses. Test: the cloud validator passes it, and every part kind is known and supported.
3. TOWN stage B, talent ideas (tiny experts Toymaker, Fabulist, about 25 min): 18 sparks for props, names and a mouse job for the bakery. Test: 0 noise, each tagged with its maker.
4. CLOUD: build the bakery from the recipe, run the existing range probe (light touch takes nothing, a Marble takes trim, Big Marble collapses, nothing floats), deploy to a test page.
5. TOWN stage C, talent two-engine-test (robot browsers on the Mini, about 15 min): open the deployed page in Chromium and WebKit; it must report no errors and print the same JSON result. This is the first real use of the WebKit robot (currently UNKNOWN) and is allowed to fail honestly.
6. DISPLAY: Harry opens the page on his iPad (plain table view; AR through HelloXR optional) and the game session sends 2 numbered pictures.
Budget: about 40 minutes Radeon, 25 minutes Mill, 15 minutes Mini robots. NEEDS HARRY: nothing. Pass = the bakery stands, loses trim, collapses, matches in both engines, and every count is honest.

## How the game project uses the workshop without a second job system
1. One door only. The game project never talks to the machines. Its ONLY interface is the existing order form (HOW_TO_SEND_WORK_TO_PATCHTOWN.md): an order file, one paste line by Harry, a results file pasted back. No new queue, no new ledger.
2. Small cloud-only helpers that queue nothing: (a) an order linter that checks every order against the form (talents, context under 170 words, at most 4 questions with a JSON shape, canary and test per stage, NEEDS HARRY) so mistakes like my earlier wrong forms cannot be sent; (b) a results saver that stores the paste byte for byte, appends a ledger line and runs the ledger check; (c) data contracts, meaning schemas and validators for what models may return.
3. Status shown on the existing Works page and ledger, not a new dashboard.
4. Test hooks on game pages (a plain window object with a JSON result) so the town's robot browsers can check them.
5. If the town's own door ever gets an API (SERVER_SPEC.md is a draft), the game project adopts it through CAIRN and Harry. Until then no direct calls.
6. Approvals unchanged: downloads, installs, money, security and deleting need Harry, typed in the town chat. The game session never says yes for them, and every order lists them under NEEDS HARRY.
7. Safe by design: models give data, the cloud validates, nothing model-written is ever run.

## Ten things for Harry to check on his own machines (read-only; none installs or changes anything)
1. Mini disk free: Terminal `df -h /`.
2. Mini memory after a Brain job: Activity Monitor, Memory tab (look only).
3. Door log: ask CAIRN to show the last 50 lines.
4. Does the 30 GB floor cover all jobs? Ask CAIRN to quote the door's rule.
5. Is WebKit installed: `ls ~/Library/Caches/ms-playwright`.
6. Models on each machine: `ollama list` on the Dell; `ls -lh /Users/macuser/llm/models` on the Mill and Mini.
7. Does the nightly almanac still run: look at the almanac log's date.
8. Any 3D tool installed: `ls /Applications | grep -i blender`.
9. What is the "3D town map" and is it live: open it and look.
10. Mill and Dell specs: `system_profiler SPHardwareDataType` (Mill); `lscpu`, `free -h`, `df -h` (Dell).
