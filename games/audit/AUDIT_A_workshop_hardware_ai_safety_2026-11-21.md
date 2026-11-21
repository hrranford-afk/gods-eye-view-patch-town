# PatchTown workshop audit A (read-only, repo evidence only)

Audit date 21 Nov 2026. Auditor ran in a cloud container with no access to the Mini, Dell or Mill. Nothing below was checked live. "VERIFIED" means a dated record in the repo shows it working, not that it works now. "older" = measured before 14 Nov 2026 (date given).

Paths are relative to `/home/user/gods-eye-view-patch-town/.worktrees/micro-precinct/` unless stated. Short names: HOWTO = `games/HOW_TO_SEND_WORK_TO_PATCHTOWN.md` (12 Nov, update pasted 13 Nov); MACH = `games/TOWN_MACHINES.md` (13 Nov); R15, R17a, R17b, R19, R20 = files in `games/orders/results/` dated 15, 17, 17, 19, 20 Nov; SPEC = `games/works/SERVER_SPEC.md` (draft v0, 17 Nov); OPS = `games/works/plan/3-ops.md`.

Scope facts that matter first:
- The town's own code (the "door", queue, brake, foreman tooling, trainer, picture scripts, 3D town map) is NOT in this repo. The repo holds orders, results, plans and the cloud-side Works page. No `server/` or `tools/` file in any worktree is about the workshop: root `server/`, `tools/`, `SECURITY.md`, `TESTING.md`, `DATA_SOURCES.md`, `docs/` all belong to the upstream "God's Eye View" planner app (aircraft glTF models, API keys, etc.). Not the workshop.
- `cairn` worktree (`games/cairn/index.html`, mountain game draft), `patchtown-ios` (iOS app wrapper; its "native bridge" is an app/web bridge, not the town link), `shop-edition` (Base Camp jewellery-shop game, last commit 13 Nov) contain no workshop capability data. `pages` is gh-pages output. `room-kit` and `sofa-siege` are game code (sofa-siege holds the only procedural 3D model library, see section 3).
- Searched all of games/, docs/, root md files: zero hits for Blender, USD (outside one ChatGPT viewer file), diffusion, ComfyUI.

---

## 1 Hardware

| Capability | Class | Evidence | Notes |
|---|---|---|---|
| Mini: 2018 Mac Mini, 6 cores / 12 threads, 20 GB RAM, no own GPU | VERIFIED (older) | HOWTO l.16; MACH l.7 (13 Nov) | Recorded by the town, not seen by auditor. HOWTO says "6 cores", MACH adds "12 threads". macOS 15.7.9, Safari 26.6.1, Python Playwright 1.60 per `games/base-camp/STRESS_RESULTS.md` (12 Nov, older) |
| Mini free disk | VERIFIED (varies; unstable) | MACH: 27 GB at 12:25 13 Nov (older); OPS F25: 35 GB on 16 Nov (older); R17b run report: 18.3 GB 08:33, 12.3 GB 11:28, 15.0 GB 12:02 on 17 Nov | Below the 30 GB floor on 13 and 17 Nov. R17a says "11 GB usable". No reading after 17 Nov in repo |
| Mini has no Node | VERIFIED (older) | `games/base-camp/STRESS_RESULTS.md` l.3 (12 Nov); HOWTO l.16 | Tests must be Python |
| Radeon VII 16 GB attached to the Mini; shared by Brain, 14B coder, trainer, picture maker, one at a time | VERIFIED (older) for existence and one-at-a-time rule | HOWTO l.17, l.36; MACH l.8 (13 Nov) | One-at-a-time is a policy; enforcement see section 5. The Radeon is on a Mac, so no Linux GPU tools (HOWTO "What does not work") |
| Radeon VII real speed | VERIFIED for Brain only | R17b: 8,538 tokens in 15.4 min (about 9 tok/s), 25 tok/s peak on stage 2 (17 Nov). R20: Brain 8 picks in 17 min 10:09-10:26 (20 Nov) | MACH 13 Nov said speed UNKNOWN. HOWTO "about 10 min, up to 900 words" is consistent |
| Dell: Xeon 4 cores, 32 GB, CPU only, one model at a time | VERIFIED (older) | HOWTO l.18; MACH l.9 (13 Nov) | Dell disk UNKNOWN (MACH). OS not stated in repo. R17a Brain claims Dell runs Linux and Python 3.12: that is the Brain's words, not checked |
| Dell speed | VERIFIED | Seat times in R19/R20: 73 s to 2,981 s per answer (qwen3-coder 30B 1,753 s and 2,981 s in sitting 1; 222 s in sitting 2). R15: 27B Scholar 2,866 s; R17b: Scholar 60.9 min | Highly variable, partly queueing behind other jobs. MACH: 27B took 462 min for a level the Brain built in 15 (13 Nov, older) |
| Dell second small GPU "off" | UNKNOWN | HOWTO l.40 only | Not mentioned elsewhere |
| Mill: Mac Pro 2010, 16 threads, 882 GB free disk, RX 560 (4 GB) not used | VERIFIED (older) | HOWTO l.19; MACH l.10 (13 Nov); R17b CAIRN note ("RX 560 (4 GB)") | MACH says processor and memory UNKNOWN. Runs macOS 10.14 and Python 3.9 per R17a (17 Nov, CAIRN note and Brain words). Training on the RX 560 is "untested" (R17b) |
| Mill throughput | VERIFIED | R19/R20: 72 sparks for 12 experts x 6 openings; 3 experts x 6 sparks 09:23-10:08 (20 Nov). MACH: about 72 sparks in 25 min (13 Nov, older) | 1.5B Mill Hand answers took 105-163 s |
| Machines are linked and reachable from the cloud | MISSING | HOWTO l.38 (no GitHub push); MACH l.2 ("could not reach the Mini after 12:25"); DECISIONS S7 "mailbox: Not now" | Harry pastes in both directions |
| Mini unattended uptime | UNKNOWN | MACH 13 Nov: lost from 12:25 | No later link record |

## 2 AI workers

| Capability | Class | Evidence | Notes |
|---|---|---|---|
| Town Brain, qwen3.6 35B (a3b) on Radeon: planning, judging, picks, warnings | VERIFIED | R20 `brain.md` 20 Nov (8 picks, 17 min); R19 (10 picks, 3 warnings, 163-word proposal); R17b stages 2-3 (17 Nov, 9 and 15.4 min) | Strongest record in repo. Makers checked by CAIRN against source answers |
| 13 tiny experts on Mill (Animalist, Naturalist, Fabulist, Composer, Synthesist, Musician, Junglist, Sonero, Choreographer, Wargamer, Swarmkeeper, Dreader, Toymaker) | VERIFIED (sparks) | R19: 72 sparks, 12 experts; R20: Toymaker, Wargamer, Fabulist 18 sparks 0 noise. R15 power-1 72 sparks (15 Nov) | R19 noise: some answers "empty or too short". Brain picked 1 of 10 from sparks; guests (ChatGPT, Gemini, Grok) out-pitched them (R20 CAIRN checks). R19 lists 11 experts; Dreader not seen in the sort |
| Mill Hand / "Radeon Clerk/Runner/Senior" qwen 1.5B | VERIFIED as FAILING for structured output | R19 seat table: 4 of 4 broken in sitting 2 (cut off mid-JSON). Sitting 1 answered. Model path `/Users/macuser/llm/models/qwen15.gguf` | Note: the three "Radeon" seats actually ran on the Mill (R19), though HOWTO says they are "resting" |
| Dell residents: Coder 7B, Reasoner 8B, Surveyor 12B, Builder devstral 24B, Elder magistral 24B, Quick Builder qwen3-coder 30B, Writer qwen3.6 35B, Scholar qwen3.8 27B | VERIFIED (mixed) | R19, R20, R15, R17a | Writer: returned 0 characters in 46 rounds (JSON mode empties a thinking model); fix made 17 Nov "unproven" (R17b). Scholar 20-90 min per answer and left out of siege-3. Surveyor timed out (R17a keep-1), Elder timed out 3,814 s vs 3,000 s limit (R17b) |
| Radeon Coder qwen2.5-coder 7B | VERIFIED | R19: answered both sittings, 299 s and 69.5 s | |
| 14B coder: "bulk examples, about 3 h for 400 functions" | UNKNOWN | HOWTO l.27 only ("record") | No dated run in repo. HOWTO also says it "says no bugs too easily" (OPS F11) |
| Picture maker: DreamShaper 8, words-only, 35-60 s a picture | VERIFIED as UNRELIABLE | R15 look-1: canary failed 3 times (4 pictures), "cannot compose this scene" (15 Nov). R17a: keep-1 pictures 0 of 6 matched, not sent (17 Nov). Speed 35-60 s is HOWTO (older) | Good at textures per HOWTO, but no texture ever delivered in repo: art-b1 has no result file. Tile-seamlessness unproven |
| Block-out then paint-over route (look-1b) | UNKNOWN | `games/orders/look-1b.md` (15 Nov) | No result file |
| llava 7B on Dell as picture judge | VERIFIED as unusable | R15 look-1: "its notes contradict themselves, so not used as judge" (15 Nov) | |
| Trainer (new tiny expert, 25-55 min) | UNKNOWN | HOWTO l.28 "record" | mega-review-1 stage 4 NOT RUN (R17b, disk under floor). experts-1, seasons-1 "Colonist" have no result file. No dated successful training in repo |
| Image-to-text on Dell ("Scholar looks at a picture") | UNKNOWN | HOWTO l.35 | No result |
| Nightly almanac (Town Brain plus quick residents) | UNKNOWN | `games/STANDING_ORDERS.md` (11 Nov, STARTED); `games/base-camp/almanac.json` last commit 12 Nov | `ALMANAC_LOG.md` named in the order does not exist in repo; no almanac result in any results file. Cannot tell whether it still runs |
| Jobs workers can take (talents) | AVAILABLE BUT UNTESTED as a list | HOWTO Part 2: ideas, how-to-build, own-answers, game-data, pictures, code-reading, two-engine-test, play-testing | VERIFIED in use: ideas, own-answers, how-to-build (R19, R20, R17b). Others have no result file |
| Guest outside models (ChatGPT, Gemini, Grok via Harry) | VERIFIED | R20 part 1 (20 Nov ~09:30) | Run by Harry in his accounts, not by the town |

## 3 3D production

| Capability | Class | Evidence | Notes |
|---|---|---|---|
| Blender (any use) | MISSING | 0 hits for "Blender" in all worktrees | Not planned in any order |
| Image-to-3D model maker (TripoSR MIT named first choice) | MISSING | `games/orders/art-b2.md`; `games/ORDER_ART_B.md` l.34-38 (12 Nov); HOWTO l.40 "3D model making. Not set up; needs a download and Harry's yes" | Order art-b2 never run. Harry's "yes B" (12 Nov, game session) is superseded: HOWTO says a yes outside the town chat does not count, and art-b2 NEEDS HARRY asks for the download again. Tencent Hunyuan3D rejected for licence (excludes UK/EU) |
| glTF/GLB export from town machines | MISSING | no `.glb` produced by the town anywhere | art-b2 would output `.glb` under 300 KB, 5,000 triangles. Mac with Radeon VII (no CUDA/Linux GPU tools) is an unproven fit for TripoSR-class models; nobody has tested it |
| USD / USDZ | MISSING | no files, no order | |
| Hand-written procedural 3D in three.js (r128) | VERIFIED | `.worktrees/sofa-siege/games/sofa-siege/models.js` (1,076 lines: mouse, kit pieces, hill; "primitives and canvas textures, no outside assets"), repo head 21 Nov | Cloud-made by the game session, not the town. Has poses: idle, walk, carry, hammer, aim, cheer, dizzy |
| CC0 model kit (34 low-poly .glb, 799 KB, Kenney and Quaternius) | VERIFIED | `.worktrees/bc-fixes19/games/base-camp/models/cc0/` and `README.md`; also in `sofa-siege` | Hand-downloaded via GitHub mirror (shorepine/kenney). `models/cc0/README.md` says "NOT wired into the game yet" |
| Animated GLB (Backpack Scout mouse, 5 clips) | VERIFIED (older) | `games/base-camp-from-chatgpt/build17-animated-mouse/RECEIVED.md` (13 Nov), generator trimesh | Made by ChatGPT, not the town. CAIRN loaded it in Chromium, 0 errors |
| Block-out clay pictures for the painter | VERIFIED | `games/orders/inputs/look1-blockouts/` (made by game session, 15 Nov) | |
| Materials / textures | UNKNOWN | art-b1 (10 textures x 8 materials, 2x2 tiling) | No result file. Canary prompt expects 1024x1024; DreamShaper 8 at that size untested. Cloud side builds canvas textures and JPGs (`sofa-siege/tex/`) |
| Rigging and animation by town | MISSING | | Only procedural poses in code |
| Room scan to 3D (scan-1: MapAnything, Brush) | MISSING / UNKNOWN | `games/orders/scan-1.md`; R17a: Brain says Dell for map, Mill for photoreal; CAIRN disagrees (Mill macOS 10.14); "OPEN until a 10-minute test" | No test done. Needs 4.91 GB checkpoint download plus Harry's yes |
| Works page loads GLTFLoader for town models | AVAILABLE BUT UNTESTED | `games/works/THIRD_PARTY.md` | Kenney download refused (HTTP 403) from the build machine; no models in v1 |

## 4 Automation

| Capability | Class | Evidence | Notes |
|---|---|---|---|
| One-door job queue on the Mini ("every job signed and shown on the 3D map") | UNKNOWN (code not in repo) | HOWTO l.16, l.62 | Only indirect evidence: R17b says the door "dropped job arguments silently" (a wrong 85-minute job ran), "refused a stop tool below the floor" (17 Nov). So a door exists and runs |
| Front door with typed job schemas and loud refusal | MISSING | SPEC 3.1 and build order step 1 (draft v0, 17 Nov) | SPEC itself lists today's faults as missing parts |
| Automatic quote and gate | MISSING | HOWTO l.77 "The automatic gate and quote are not built yet. CAIRN reads each order by hand." (12 Nov, older) | No later doc says it was built. Order linter planned (OPS l.514) not built |
| Foreman (machine free-room check) and canary preflight | UNKNOWN | Named in `games/ORDER_ART_B.md` l.12, `games/works/IMAGE_PROMPTS.md`; the user-level skill `patchtown-preflight` | No Foreman log or code in repo. R19 canaries recorded as PASS per stage (19 Nov); R17b: no canaries for stages 2-3 |
| Canary then test per stage, honest counts | VERIFIED | R19 test table; R15 look-1 canary failed 3 times and stage stopped | The most reliable procedure in the record |
| Run report after each result (standing order 16 Nov) | VERIFIED once, then absent | R17b has full run report; R19 and R20 contain none | Standing order in `STANDING_ORDERS.md` not followed in later results |
| Robot browsers: Python Playwright, Chromium | VERIFIED (older) | STRESS_RESULTS (12 Nov) | |
| Robot browsers: WebKit 26.4 | VERIFIED (older, indirect) | HOWTO l.46 and 13 Nov town update ("WebKit ... found a real crash in build 10"; build 14 error "Cannot access 'TOTPH'") | STRESS_RESULTS 12 Nov said WebKit NOT installed until Harry's yes in the town chat; HOWTO later same day says installed. No order result for webkit-1 or siege-2 |
| Two-engine test results for a current build | UNKNOWN | `games/orders/webkit-1.md`, `siege-2.md` | No result files |
| Robot playtest speed ("about 10 s a game") and robot colonies per hour | UNKNOWN | HOWTO "(record)"; `measure-1.md` never answered | |
| measure-1 hardware benchmark | UNKNOWN | `games/orders/measure-1.md` (13 Nov) | No result file |
| Results delivery | VERIFIED as manual | HOWTO l.38, l.58-66; DECISIONS S7 "mailbox ... Not now" | Harry pastes order line into town chat, then pastes the results back; CAIRN saves it as a results file. Never GitHub push from the Mini |
| Ledger (append-only, 145 lines, 15-19 Nov) | VERIFIED | `games/works/ledger.jsonl`; auditor ran `node games/works/tools/ledger-check.mjs` on 21 Nov: "145 lines pass, 0 refused" | Cloud-side diary. Last line 19 Nov: siege-3 result, though R20 (20 Nov) and the epic-1 order (21 Nov) are not in it. 87 measured, 47 typed, 11 reported |
| Works page / "town" visualisation | VERIFIED (cloud only) | `games/works/index.html`, `games/works/tests/works-test.js` (426 lines), screenshots `games/works/shots/v11-*.png` | Reads the repo ledger, not the Mini's queue. HOWTO's "3D town map" on the Mini is a separate thing: UNKNOWN, no code or screenshot in repo |
| Watchdog / heartbeats | MISSING | SPEC 3.7, OPS P-section (planned) | |
| Builders and testers (cloud side) | VERIFIED | START_HERE logs; ledger hire/start/end; test lamps by suite | Builders stop at the account usage limit (ledger fail 18 Nov: stopped 12:00 to 17:12) |
| Receiver on the Mini for iPad field reports (report-1) | UNKNOWN | `games/orders/report-1.md` (16 Nov); NEEDS HARRY approval noted as wrongly given in the game session (OPS F23) | No result |
| Inspectors (second model checks first) | AVAILABLE BUT UNTESTED | OPS 5.x, SPEC 3.4 | R20: CAIRN checks makers by key word match, a manual check |

## 5 Safety (ENFORCED vs DOCUMENTED)

| Capability | Class | Evidence | Notes |
|---|---|---|---|
| One heavy job per machine; "a brake stops the town if memory runs out" | DOCUMENTED. Enforcement UNKNOWN | HOWTO l.62: "One heavy job per machine. A brake stops the town if memory runs out." | R17b: "Brake stops: 1 (the door refused a stop tool below the floor; Harry said yes to a rescue lane)" and "Memory peak: UNKNOWN". The only logged "brake" event is a disk refusal, not a memory brake. Code not in repo |
| Disk guard: "New jobs are refused if the Mini's disk is under 30 GB" | ENFORCED once (logged, 17 Nov), not tested since | HOWTO l.62; R17b stage 4: "The Mini's disk is under its 30 GB floor (12-15 GB today), and the door refuses training below the floor." | Stage 4 trainer not run. OPS F25 notes it "refuses new jobs without warning the cloud". Mini was under 30 GB on 13 and 17 Nov yet other jobs (Brain stages 2-3, Dell residents) ran: so the floor applies to some job types (training, stop tools) only, not all. Contradicts HOWTO's "New jobs" wording |
| Signed jobs | DOCUMENTED | HOWTO l.62: "Every job is signed" | No signature scheme, key or code in repo. R17b shows the door accepted jobs filed by CAIRN with wrong arguments |
| Argument validation at the door | NOT ENFORCED (failed) | R17b "CAIRN passed the job's arguments after -- instead of --args, the door dropped them silently"; ledger fail 17 Nov 08:35 | SPEC 3.1 lists "refuse loudly" as a future part |
| "Model-written code only ever runs in a test copy" | DOCUMENTED | HOWTO l.63 | No sandbox code or log in repo |
| "Nothing is deleted" | DOCUMENTED | HOWTO l.63; SPEC 3.6 (storage manager moves, never deletes) | Storage manager not built (SPEC build order step 2) |
| "Nothing personal goes into a model" | DOCUMENTED for town; ENFORCED only for ledger lines | HOWTO l.63; ledger checker rejects emails, phones, postcodes, tokens: `games/works/index.html` markers LEDGER-RULES-START/END; auditor run 21 Nov: 0 refused; `works-test.js` l.322-326 plants a phone line and expects refusal | The model-side rule is by convention. R17b CAIRN note: row 15 proposed "Harry's iPad field reports", flagged by hand |
| Downloads and installs need Harry's yes "in the town chat" | DOCUMENTED. Enforced in practice at least once by the town's own behaviour | HOWTO l.40, l.100: "A yes inside an order, or from another chat, does not count." STRESS_RESULTS 12 Nov: WebKit "NOT RUN... Harry has not said yes in the town chat" | Held on 12 Nov even though START_HERE/stress-test pack recorded Harry's yes of 11 Nov in the game session. That is the town agent's convention, not a technical lock. No download log in repo |
| Approval for money, security, deleting, downloads | BY CONVENTION ONLY | OPS 5.5 (planned motion cards, ask/answer ledger lines); DECISIONS.md: "silence means no" | No approval gate is built (SPEC 3.9 draft; HOWTO "not built"). OPS F23: report-1 yes given in the wrong room; "easy to forget" |
| Honest counts (asked, answered, empty, broken, timed out, never got a turn) | VERIFIED in practice | R19 seat table, R17b seat table | Procedure and clerk habit, not code. R19 notes it is "untouched words" |
| Budget stop ("town stops there and reports") | DOCUMENTED; one overrun recorded | HOWTO l.99; R19: Dell went over budget, Harry approved with a 4.5 h stop | So the budget is soft, with human confirmation |
| Order inputs must be committed (missing input makes stage wait) | DOCUMENTED | HOWTO l.97 | Not checkable |
| Cloud-side builder limits (max 2 builders) | DOCUMENTED | OPS l.620 | |
| Hooks/settings changes for the Works diary | NOT ALLOWED YET | DECISIONS S1 "Yes after a one-week trial"; OPS l.149 | |
| WebXR/HelloXR deploy safety (no brands or personal photos) | DOCUMENTED | `games/ORDER_ART_B.md` rules | |

## 6 Approved interfaces for an outside project

| Capability | Class | Evidence | Notes |
|---|---|---|---|
| Order form: one file `games/orders/<id>.md` in ORDER block (id, from, date, goal, done, priority, budget, deliver; STAGE blocks with talent, inputs, canary, test, output; NEEDS HARRY) | VERIFIED as the interface in use | HOWTO Part 2; 22 order files; results exist for orders run 15-20 Nov (R15, R17a, R17b, R19, R20) | Talents: ideas, how-to-build, own-answers, game-data, pictures, code-reading, two-engine-test, play-testing (plus "training"/"trainer" used in orders but not on the list) |
| Rule "you say WHAT, the town says HOW; never name tools or installs" | VERIFIED as used | HOWTO l.7 | `ORDER_ART_B.md` (names ComfyUI, TripoSR) was superseded for exactly this reason |
| Sending: commit the order, give Harry one line: "New order for the town: games/orders/<id>.md on branch <branch>." | VERIFIED | HOWTO l.84-88 | Human relay is the only transport |
| Who reads orders | CAIRN (the PatchTown session on the Mini), by hand | HOWTO l.77 "CAIRN reads each order by hand"; no later change recorded | Quote also written by hand: stage, machine, model, minutes, blockers |
| Quote before work, Harry says "go" | DOCUMENTED. No quote text stored in repo | HOWTO l.66-77 | The repo holds no quote for any order; only results. Ledger has `order` lines (5), with `quote_due` planned (OPS) |
| Result: one file pasted by Harry, saved as `games/orders/results/<date>-<ids>.md` | VERIFIED | 5 results 15-20 Nov | Saved byte for byte by the game session. Many orders have none (see below) |
| API / queue endpoint callable from cloud | MISSING | SPEC 3.1 (door API), 3.10 (bridge) are drafts; DECISIONS S7 mailbox "Not now"; MACH l.2 "link problem" | No endpoint, no mailbox, no GitHub push from the Mini |
| Orders with no result file in repo | UNKNOWN (sent? run?) | art-b1, art-b2, look-1b, measure-1, webkit-1, seasons-1, experts-1, shop-1, server-1, siege-1, siege-2, report-1, epic-1 (21 Nov), mega-1, scan-1 (planning only) | START_HERE 18 Nov: "siege-1, siege-2 not yet confirmed sent". Only keep-1, mega-review-1, scan-1, power-1, economy-1b, look-1, siege-3 (+3b) have results |
| Free capacity limits an outside project must plan for | VERIFIED | HOWTO: pictures 10 per session; Brain 900 words; prompts under 300 words for Mill; 4 questions per sitting, about 220 words; stages over 30 min split by the town | |
| Approved decision channel for downloads | Harry typing in the town chat | HOWTO l.100 | Not the game session |

## 7 Contradictions and stale facts

| # | Claim A | Claim B | Which is likely newer / note |
|---|---|---|---|
| 1 | HOWTO l.16: Mini hosts "robot browsers (Chromium AND WebKit)" | `games/base-camp/STRESS_RESULTS.md` (12 Nov): WebKit NOT installed on Mini, Chromium only | Both 12 Nov. HOWTO is later in the day; no record of the town-chat yes |
| 2 | HOWTO: "Eight residents" at Dell; "Three Radeon residents resting by Harry's rule" | MACH (13 Nov): "10 residents"; R19 (19 Nov): 8 Dell seats, a Radeon Coder 7B answering, and "Radeon Clerk/Runner/Senior" seats that actually ran qwen 1.5B on the Mill | Seat names do not match machines; "resting" seats were used on 19 Nov |
| 3 | HOWTO: 13 tiny experts | MACH: 12 tiny experts; R19: 12 experts, only 11 visible in the sparks | Toymaker listed in HOWTO may be the 13th; counts differ across documents |
| 4 | HOWTO: "New jobs are refused if the Mini's disk is under 30 GB" | R17b: disk 12-18 GB on 17 Nov while Brain jobs and Dell residents ran; only training and a stop tool were refused | Floor applies to certain job types only, or is not uniformly enforced |
| 5 | MACH 13 Nov: Mini disk 27 GB; OPS F25 35 GB (16 Nov); R17a "11 GB usable"; R17b 12.3-18.3 GB | | Disk moves a lot; no reading after 17 Nov |
| 6 | HOWTO: "Dell: ... Fast big residents: Writer (35B)" | R17b: Writer returned 0 characters in 46 of 46 rounds | Writer listed as "fast" but is effectively non-functional (fix unproven) |
| 7 | HOWTO: Scholar "20 to 90 min" | R15: 2,866 s (48 min); R17b: 60.9 min; MACH: 27B took 462 min | Within a wide range |
| 8 | HOWTO: Radeon "about 70 Brain answers a night, about 500 pictures" | R17b: Brain about 9 tok/s average; no picture throughput measured since 15 Nov | HOWTO figures are estimates ("What a whole night can hold (estimates)") |
| 9 | HOWTO: "13 Nov: ROBOT RUNS... follow the CLOCK" | `orders/seasons-1.md` and `inputs/seasons-1-robot.md` (12 Nov) set hour held vs clock | Later note supersedes; CAIRN says seasons-1 changed |
| 10 | `games/ORDER_ART_B.md` (12 Nov): downloads allowed, "yes B" from Harry in the game session | HOWTO (12-13 Nov) and `art-b2.md`: 3D download needs a new yes in the town chat | HOWTO supersedes; ORDER_ART_B marked "Superseded" |
| 11 | START_HERE (11 Nov): "Harry approved installing Playwright WebKit" | STRESS_RESULTS 12 Nov: not run, yes not given in town chat | Approval room mismatch (OPS F23) |
| 12 | "Foreman" = the cloud session that decides and checks (`games/works/` plan, ledger `who:foreman`) | "Foreman" = machine capacity check before jobs (`ORDER_ART_B.md` l.12; user skill patchtown-preflight) | Same word, two meanings. Neither implementation is in repo |
| 13 | STANDING_ORDERS: nightly almanac writes `ALMANAC_LOG.md` | No such file anywhere; almanac.json untouched since 12 Nov | Status UNKNOWN |
| 14 | STANDING_ORDERS 16 Nov: every result ends with a run report | R19 and R20 have none | Standing order not followed since 17 Nov |
| 15 | Ledger says last event 19 Nov (siege-3 result) | R20 (20 Nov, siege-3b) and epic-1 (21 Nov) exist | Ledger stale after 19 Nov |
| 16 | HOWTO: "3D town map" on the Mini | Repo has only the Works page (cloud, reads ledger.jsonl) | Possibly the same object seen two ways; unknown |
| 17 | HOWTO "Mill: Mac Pro 2010" | R17a: Mill runs macOS 10.14 "from 2018", Python 3.9 | Model year vs OS year inconsistent in wording; not checked |
| 18 | R17b Brain: "The Dell and Mill are CPU-only" | MACH, R17b CAIRN: Mill has an RX 560 | Correct as "RX 560 not used" |
| 19 | HOWTO talent list excludes "training" | `experts-1.md`, `seasons-1.md`, `mega-review-1.md` use `talent: training/trainer` | Talent list incomplete |
| 20 | `art-b2.md` says "34 ready-made CC0 parts already in the game repo" | Present only on bc-fixes19 and sofa-siege worktrees (not on game/micro-precinct) | README there says "NOT wired into the game yet" |
| 21 | Root `SECURITY.md`, `TESTING.md`, `DATA_SOURCES.md`, `server/`, `tools/` | Describe God's Eye View, not the workshop | Do not read as workshop safety evidence |

---

## Top 10 things the game project can reuse as is

1. The order form and the one-line paste (HOWTO Part 2), with canary and testable output per stage.
2. Town Brain (35B) for picks, warnings and short proposals: best evidence in repo (R19, R20, R17b).
3. Dell residents for JSON-shaped own-answers, with "by" credit, accepting about 3 in 4 usable (R19 ok; Writer and Scholar excluded by name).
4. Tiny experts for sparks if a narrow set (Toymaker, Wargamer, Fabulist) is named (R20: 0 noise).
5. Guest outside models via Harry (ChatGPT, Gemini, Grok with "LOOKS LIKE" flags) for strange ideas (R20).
6. Seat table and honest-count format from R19.
7. Ledger plus `node games/works/tools/ledger-check.mjs` (145 lines pass on 21 Nov) and the privacy rules.
8. Procedural three.js model library `sofa-siege/games/sofa-siege/models.js` and CC0 34-model kit (`bc-fixes19/.../models/cc0/`).
9. The block-out then paint-over idea (look-1b inputs) for the picture maker.
10. Works page (`games/works/index.html`) for showing the orders to Harry.

## Top 10 unknowns Harry must check on his own machines (read-only)

1. Mini free disk now vs the 30 GB floor: Terminal `df -h /` on the Mini (or the town's disk line if shown in its status page).
2. Mini memory and swap pressure after a Brain job: Activity Monitor, Memory tab (look; do not quit anything), or `vm_stat`.
3. Whether the door rejects bad arguments now: read the door's log file on the Mini (CAIRN knows the path; ask it to `cat` the last 50 lines).
4. Whether the 30 GB floor applies to all jobs or only training: ask CAIRN to quote the door's refusal rule from its source file (read-only `grep -n "30" <door source>`).
5. Whether WebKit is installed on the Mini: `python3 -c "import playwright; print(playwright.__version__)"` and `ls ~/Library/Caches/ms-playwright` (lists browsers; read-only).
6. What models are on the Mini, Dell and Mill and how big: `ollama list` on the Dell (read-only), `ls -lh /Users/macuser/llm/models` on the Mill, and the same on the Mini.
7. Whether the nightly almanac still runs: `ls -l` on the almanac log in the town folder (offices_isle or similar) and `tail -5` of it.
8. Whether any 3D-making tool or Blender is installed: `ls /Applications | grep -i blender` and `pip3 list 2>/dev/null | grep -i -E "trimesh|torch|diffusers"` on the Mini.
9. What the "3D town map" is and whether it is live: open its local address in a browser; check it shows the current queue (look only).
10. Mill and Dell details never recorded: Mill `system_profiler SPHardwareDataType` (CPU, RAM), macOS version `sw_vers`; Dell `lscpu`, `free -h`, `df -h`, `cat /etc/os-release`.
