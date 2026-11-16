# PatchTown Works, plan 3 of 5: the AI operations lens

**The control room: what the AIs need to see to work better, and what Harry needs to steer them.**

Written 16 Nov 2026 by planner 3 (AI operations). Plain English. Every claim about PatchTown comes from the repo's own log
(file named in brackets). Outside practice is cited at the end.

---

## 0. The short version

1. **The studio's real problems are operations problems, not code problems.** In four days the log shows: a builder dead
   for almost 20 hours with nobody noticing, two machine restarts that threw away paid work, a usage limit, test "failures"
   that were really a busy machine, a model that answered "(DONE)" twice and used 43 minutes of the slowest machine to do it,
   pictures marked done that did not match their brief, orders sent with no result logged, and Harry as the only wire
   between the two towns.
2. **The town should be a control room first and a toy second.** Every lamp, jam and fox must come from a rule that a
   computer can check, and every alarm must point at one action.
3. **Three things to build first:** a heartbeat for every worker (so "silent" becomes "late" becomes "lost" on its own), a
   claim-and-check record (so nothing is called done until someone else checked it), and a single "waiting on Harry" board
   with ages.
4. **The town can take actions later, in steps.** First it only shows. Then it suggests. Then it does small, undoable things
   inside the cloud workshop (re-run a test, write a resume brief, re-hire a stalled builder). It never touches money,
   security, deleting, downloads, installs, the home town's machines, or anything sent to other people. Those stay Harry's.

---

## 1. What the real log says: the failure catalogue

I read START_HERE.md (the operating log), BUDGET_LEDGER.md, works/ledger.jsonl, the 15 Nov results file, every order, the
mega review, TOWN_MACHINES.md, the wagon guide, the standing orders and the home town's wall sketch. These are the
operational failures that actually happened. Each has an ID used in the rest of the plan.

| ID | What happened | When | Evidence | Cost |
|---|---|---|---|---|
| F1 | **Builder stopped, nobody noticed.** The build 29 builder started 14:26, stopped at 16:27 when the machine restarted, and was found at 12:19 next day | 15-16 Nov | START_HERE line 183-184; ledger `start` 14:26, `end` 12:19 next day | 19 h 52 min of dead time; build 29 late by a day |
| F2 | **Restarts threw away paid work.** Two restarts (about 10:40 and 14:49). Build 17 and build 18 builders were cut off; their tokens were "lost with the restart". Christmas decorations were restarted "then from scratch" | 13 Nov | BUDGET_LEDGER rows for builds 17, 18, decorations | Work redone; 293,934 tokens on the redo of decorations alone |
| F3 | **Usage limit hit** (a "power cut") | 15 Nov | ATLAS "Power cut" row | Builders stop mid-task, same shape as F1 |
| F4 | **Lost the link to the home town.** "The town lost the Mini from 12:25"; machine facts became UNKNOWN; measure-1 waited "until the link to the Mini is back" | 13 Nov | START_HERE line 122, TOWN_MACHINES | Orders blocked; facts stale |
| F5 | **False regressions from a busy machine.** Build 18's three "regressions" were test timing on a loaded machine. Later: load average 14 with 2 builders; ar-room, snapshot, totem, battle fail the same way on old and new builds | 13-16 Nov | START_HERE lines 100-102, 155, 174, 181, 184 | Builder and foreman time chasing ghosts; tokens on reruns |
| F6 | **Flaky tests carried forward.** fun "pick up, carry and drop", water 45/45 only on rerun, totem 28/30, ar-room alignment, snapshot 5 checks. Ledger has 3 `flaky` lamps out of 15 test lines | 13-16 Nov | START_HERE; ledger statuses: 11 pass, 3 flaky, 1 fail | Every rerun costs tokens (BUDGET rule 5: "fix flaky tests once") |
| F7 | **The side-by-side run caught the truth.** The foreman ran build 27 and 28 (then 28 and 29) side by side under the same load: both failed, so it was an old flake, not a regression. This is a good practice found by hand | 15-16 Nov | START_HERE lines 181, 184 | Saved a wrong rollback. Should become the standard rule |
| F8 | **Real regression caught before release.** A tap regression in the build 29 preview; a fixer was hired and fixed it | 16 Nov | ledger 15:50 "tapping creatures broke" | Good outcome; shows the gate works when used |
| F9 | **Claims that were not true.** Build 19 fixes came back "done" with "2 claims to check (duplicate Pip chip still in shot 58; the card is not visible in shot 58)" | 13 Nov | BUDGET_LEDGER | Wrong "done" nearly shipped |
| F10 | **Work marked done that failed its brief.** "Sofa Keep pictures, town painter: six nice toy rooms. None shows what its line asked for. The train marked them done." | 16 Nov | Home wall sketch | A false parcel; nobody but a human looking would catch it |
| F11 | **A checker that says yes to everything.** The 14B coder answered "no bugs found" to all 70 pieces in seconds; pass 2 gave 10 identical generic guesses | 13 Nov | base-camp/STRESS_RESULTS.md | A judge with no signal looks like a pass |
| F12 | **A strong model stuck in a loop.** "Both reads ran past their time limit (a thinking loop) and were stopped." The riskiest code had no strong reader | 13 Nov | STRESS_RESULTS.md | The most important review did not happen |
| F13 | **Empty answers from local models.** About 1 in 8 or 9 seats empty. The Dell Writer answered "(DONE)" in two separate orders, after 2,317 s and 259 s. 7 of 72 sparks in one set were "noise: empty or too short" | 14-15 Nov | results file; mega-1 brief | 43 min of the Dell spent on two empty answers (17% of that Dell run's 4 h 13 min) |
| F14 | **Silent and unproven seats.** Dell Builder and Quick Builder "silent"; three Radeon residents "moved, not heard" | 16 Nov | Home wall sketch "Who is speaking" | Capacity on paper that does not exist |
| F15 | **Answers that broke the house rules.** In power-1 the Elder's gadget is "heated by a small flame"; the Reasoner uses "used batteries from old toys". The rules say nothing burns, no loose batteries | 15 Nov | results file lines 223-233; mega-1 rules | Would reach a kids' game if nobody checked |
| F16 | **A judge that contradicts itself.** The town's own eyes (llava 7B) "notes contradict themselves, so they were not used as the judge" | 15 Nov | results file look-1 | No automatic picture check exists |
| F17 | **Canary failed 3 times, stage stopped** (good). The painter could not compose the scene. The fix was to reshape the brief: block-outs first (order look-1b) | 15 Nov | results file; look-1b | Good guard rail; shows "reshape the brief" as a standard fix |
| F18 | **The Dell is the bottleneck.** One model at a time; "often held for hours by one long build"; 27B took 462 min for a level the Brain built in 15; slowest resident 48 min; one resident answer took 2,867 s | 11-16 Nov | wagon guide, TOWN_MACHINES, results | Orders wait; the guide already says "treat Dell answers as a bonus" |
| F19 | **Idle machine with work waiting** ("fox in the pond"). At 16:35 on 16 Nov the Mini + Radeon was idle while the Dell had mega-review-1 waiting for 8 residents | 16 Nov | Home wall sketch | Cheapest capacity in town wasted |
| F20 | **Rebuilt things that already existed** ("white smoke"): 2 this week | 16 Nov | Home wall sketch | Duplicated work |
| F21 | **Too many hand touches.** "3 hand touches per order"; home town cannot push to GitHub; every result comes back through Harry pasting | ongoing | Home wall; wagon guide | Harry is the bottleneck between the towns |
| F22 | **Orders with no result logged.** The ledger has 5 `order` lines (mega-1, scan-1, report-1, keep-1, mega-review-1) and 0 `result` lines. On 13 Nov six orders waited for Harry to paste them | 13-16 Nov | ledger; START_HERE line 115 | "Wagons" leave and nobody tracks their return |
| F23 | **Approval in the wrong room.** report-1: Harry said yes in the game session, but "he still needs to say it in the town chat" | 16 Nov | report-1 NEEDS HARRY | A real yes that does not count yet; easy to forget |
| F24 | **Decisions piling up for Harry.** 13 Nov list: GitHub tools yes/no, the Remote Control bridge, five taste calls, shop mode money | 13 Nov | START_HERE lines 114-120 | Work blocked on decisions with no age shown |
| F25 | **Disk near the floor.** Mini had 27 GB at 12:25 on 13 Nov, under its 30 GB refuse-jobs floor; 35 GB on 16 Nov | 13-16 Nov | TOWN_MACHINES; wall sketch | The town refuses new jobs without warning the cloud |
| F26 | **One heavy job per machine is a hard rule** (brake stops the town if memory runs out). Brain and pictures cannot share the Radeon | ongoing | wagon guide update 13 Nov | Plans that assume parallel Radeon work fail |
| F27 | **Merge chains.** "Must merge with game/bc-sound before deploy", "Merge it last", bc-merge20 then bc-fixes19 | 13-14 Nov | START_HERE | Order of merges lives only in prose |
| F28 | **Context loss is designed around.** "Start each day in a fresh session"; builders "brief in, report out, then they forget" | ongoing | START_HERE line 89; ATLAS | Memory is only what was written down |
| F29 | **Budget is invisible to the AI.** "Harry reads the plan meter (CAIRN cannot see it)"; no new work under 15% | ongoing | BUDGET_LEDGER rule 7 | The foreman flies blind on fuel |
| F30 | **Logs left outside git.** A full 24-suite run went to "scratchpad b21.log"; Works v1 was "saved by the foreman" as WIP | 14-16 Nov | START_HERE line 165; git log | Evidence lost on restart |

**What the log does well, and the town should keep:** backups of every live build (b17 to b28, the fire station), canaries
with a stop after 3 failures (F17), the almanac stop rule ("two nights in a row fewer than 2 real answers: pause and tell
Harry"), honest counts with words untouched, side-by-side runs (F7), and the new standing order for a run report with
every result.

### The patterns behind the 30 failures

The 30 rows fall into seven families. These match the three groups in the Berkeley study of multi-agent failures (MAST):
system design, agents misaligned with each other, and weak checking of the work [S1].

| Family | Failures | Plain meaning |
|---|---|---|
| A. Silent stops | F1, F2, F3, F4, F12, F14 | Something stopped and did not say so |
| B. False signals from the test yard | F5, F6, F7, F8 | Red that was not real, or green that needed reruns |
| C. Done that was not done | F9, F10, F11, F15, F16, F30 | A claim with no independent check |
| D. Empty or weak output | F13, F14, F17 | A seat that answered nothing, or noise |
| E. Wrong load on machines | F18, F19, F25, F26 | Jams, idle machines, full disks |
| F. Waste and overlap | F20, F2, F27 | Work done twice or tangled |
| G. Waiting on the human | F21, F22, F23, F24, F29 | Harry as the only wire, the only approver and the only fuel gauge |

---

## 2. Design principles for the control room

1. **Alarm on symptoms, not guesses.** Google's SRE book says page on what the user feels, using four signals: latency,
   traffic, errors and saturation [S2]. Here: how long work takes, how much work arrives, how much fails or comes back
   empty, and how full each machine and queue is.
2. **Every alarm points at one action.** If no one can do anything about it, it is a dashboard number, not an alarm.
3. **Silence is a signal.** A worker that has not been heard from is "late", then "lost". This is the dead man's switch
   used by cron monitors: a period plus a grace time [S3], and the heartbeat timeout in workflow engines [S4].
4. **Nobody marks their own work done.** A different seat, a test or Harry must check it. Anthropic's evaluator-optimizer
   pattern separates the maker from the judge [S5]; MAST lists weak verification as a top cause of failure [S1].
5. **Limit work in progress.** Fewer things at once finish sooner (Little's Law: average time in system = work in progress
   divided by throughput) [S6]. The log already found this: "at most 2 builders, so tests stay honest".
6. **Compare against the last good build, under the same load.** This is F7, made a rule.
7. **Small briefs beat big ones.** METR's research shows agents finish short tasks far more reliably than long ones; the
   80% success horizon is several times shorter than the 50% one [S7]. Anthropic found vague briefs made subagents
   duplicate each other's work [S8].
8. **Write it down or it did not happen.** Context is lost on every restart (F28). The ledger and git are the memory.
9. **Blameless postmortems.** Find the cause in the system, not the agent [S9].
10. **Harry's time is the scarcest resource in town.** Batch his questions, show their age, and never ask what can be found
    by looking (the "decide, don't ask" rule in Harry's own skills).
11. **The town's own rule: a real number or a real event, never decoration** (ATLAS).

---

## 3. What must be recorded: the data the control room needs

The ledger (works/LEDGER.md) has 13 kinds today: `hire`, `start`, `end`, `step`, `fix`, `test`, `commit`, `deploy`,
`download`, `order`, `result`, `win`, `fail`. That is a good spine. The control room needs a few more fields and kinds. All
stay one JSON line per event, append only, no personal details.

### 3.1 New kinds

| Kind | Who writes it | Fields | Why |
|---|---|---|---|
| `beat` | every builder, every ~10 min of work (or after each tool step); the foreman every 15 min | `ref`, `pct` (own guess 0-100), `note` | Heartbeat. Turns silence into "late" (F1, F3, F12) |
| `claim` | the maker | `ref`, `claims` (list of checkable statements, e.g. "house 43/43", "no duplicate Pip in shot 58"), `evidence` (paths, commit) | Splits "I say it is done" from "it is done" (F9, F10) |
| `check` | a different checker: test yard, the foreman, a second model, Harry | `ref`, `claim_id`, `verdict` (`holds`, `fails`, `cannot_tell`), `by` | The second key (F9, F10, F11, F15) |
| `queue` | the scheduler (cloud side) and the home town's run report (pasted) | `machine`, `job`, `state` (`queued`, `running`, `done`, `refused`), `wait_min` | Car parks, jams and foxes (F18, F19) |
| `seat` | the home town's run report | `seat`, `model`, `secs`, `outcome` (`answer`, `empty`, `broken`, `timeout`, `rule_break`, `no_turn`) | Report cards and empty letterboxes (F13, F14, F15) |
| `ask` | anyone who needs Harry | `id`, `type` (`money`, `security`, `delete`, `download`, `taste`, `other`), `question`, `default_if_silent`, `room` (which chat must hear the yes) | Town hall motions (F23, F24) |
| `answer` | the foreman, copying Harry's words | `ask_id`, `verdict`, `room`, Harry's words verbatim | Closes the motion; checks it was the right room (F23) |
| `limit` | the foreman, or inferred | `what` (`usage`, `disk`, `memory`, `load`), `value`, `reset_at` | Power cuts and the battery gauge (F3, F25, F29) |
| `restart` | the foreman on wake, or inferred from a gap | `machine`, `gap_min`, `lost` (refs that were running) | Makes F1 and F2 visible the moment anyone wakes |
| `incident` | the control room or the foreman | `id`, `sev`, `opened`, `closed`, `refs` | Ties alarms to a postmortem |

### 3.2 New fields on existing kinds

- `hire`: `brief_words`, `est_min`, `files` (expected files touched), `exists_check` (what already exists that was looked
  for: see F20), `parent` (which order or goal).
- `test`: `load` (machine load average at the time), `paired_with` (the commit of the last live build if run side by side),
  `attempt` (1, 2, 3).
- `order`: `quote_due`, `result_due` (UK time), `stages` (count).
- `result`: `order`, `asked`, `answered`, `empty`, `broken`, `timed_out`, `no_turn` (the honest count from the wagon guide).
- `deploy`: `backup` (the kept build path, e.g. `base-camp/b28/`), `checks` (list of `check` ids).
- `end`: `commit` must be present, or `outcome: "no_commit"` with a reason (F30).

### 3.3 Where the data comes from

| Source | What it feeds | How it arrives |
|---|---|---|
| Foreman and builders | `hire`, `start`, `beat`, `claim`, `end`, `commit`, `ask` | `works_log` lines; later Claude Code hooks (`PostToolUse` after commits, `SubagentStop`, `Stop`) [S10]; this needs Harry's yes to change settings |
| Test yard | `test` with `load`, `attempt`, `paired_with` | test runner writes the line |
| GitHub | commits, branches, merges, deploys | read live (the v1 page already does) |
| Home town run reports | `queue`, `seat`, `limit` (disk, memory), machine busy % | inside each pasted result (standing order 16 Nov); the foreman turns the table into ledger lines |
| Home town wall | foxes, white smoke, who is speaking | same paste |
| Harry | `answer`, plan-meter % readings | the foreman copies his words |
| Clock | `beat` gaps, ages | computed by the page and by the watchdog |

### 3.4 The watchdog must not live on the thing that dies

F1 happened because the machine restarted. The foreman session that would have noticed was on the same machine. So:

- **Cloud side:** a scheduled task outside the session (the `send_later` wake-ups the overnight run used, or a recurring
  scheduled task) reads the ledger every 30 minutes and wakes a fresh foreman if any rule fires. The page can also compute
  the alarms, but a page nobody is looking at alarms nobody.
- **Home side:** the Mini can read the public raw ledger from GitHub (reading is not pushing). Its wall can show "cloud
  last heard 3 h ago" and ring a bell at home. This is a read only; it needs no new access, but it is a new network
  habit on Harry's machine, so it is his call.
- **Each half shows the other's age.** On the bridge: "home town last heard: 22 h ago (last paste)". "Cloud last heard: 4
  min ago (last ledger line)".

---

## 4. The failure patterns: how the town shows each one, the alarm rule, and the fix it prompts

Times are UK. "Lamp" means a colour on the building. "Bell" means a sound and a line on the town crier's board. "Page"
means a message that reaches Harry (used rarely: see section 7).

### P1. The stalled builder (F1, F3, F12)

- **Shows as:** the builder walker stops in the workshop doorway. After the grace time its cart rolls to the **lost
  property office** with a red lamp. A small clock above it counts the hours.
- **Alarm rule:**
  - `late`: a builder with a `start` and no `beat`, `step` or `commit` for 20 minutes.
  - `lost`: no sign for 60 minutes, or any `restart`/`limit` line while it was running.
  - The ledger guide's current rule is 2 hours. That is too long: in F1 it would still have lost 2 hours. Builders log a
    beat every ~10 minutes, so 20 minutes is two missed beats.
- **Fix it prompts:** "Resume builder `bc-mac` from commit `xxxx`. Resume brief ready." The resume brief is made
  automatically: the original brief, the branch diff since the start, the last 10 ledger lines from that builder, its last
  `claim`, and "do not start from scratch". This is the step that would have saved the Christmas decorations redo (F2).
- **Automation level:** L2 (section 8). The control room can re-hire one stalled builder from its last commit, once. A
  second stall on the same brief means the brief is too big (see P9) and needs the foreman.

### P2. The power cut: usage limit or restart (F2, F3, F29)

- **Shows as:** the power station goes dark; every workshop lamp dims at the same moment. A "gap" band appears on the
  timeline.
- **Alarm rule:** two or more workers go `late` within 5 minutes of each other, or a `limit` line arrives. The
  coincidence is the tell: one late worker is a stall, many at once is a power cut.
- **Fix it prompts:**
  1. Write the `restart` line with the list of what was running.
  2. If the limit has a known reset time, set a wake for 5 minutes after the reset.
  3. On wake, resume each lost builder from its last commit (P1), oldest first, keeping the 2-builder cap.
  4. Note the lost tokens in the budget ledger.
- **Prevention:** builders commit work in progress early and often (at least every 20-30 minutes), so a restart loses
  minutes, not builds. Long jobs are checkpointed.

### P3. The silent bridge: lost link to the home town (F4, F21, F22)

- **Shows as:** the bridge has a lamp and a "last heard" clock. Wagons (orders) waiting on the bridge show their age. A
  wagon past its due time turns amber, then red, and a crow sits on it.
- **Alarm rule:**
  - Order sent, no quote within 12 hours: amber.
  - Order has a `result_due` and no result by then: red.
  - No paste from the home town for 24 hours while orders are open: the bridge lamp goes red.
- **Fix it prompts:** one copy-and-paste block for Harry (his rule: one block per destination): "Town: please send the
  quote or result for X, Y. If the Mini is unreachable, say so." The control room never sends a second message about the
  same wagon on the same day.
- **Structural fix (Harry's call, security):** a mailbox the home town can write to without Harry (the Remote Control
  bridge or a GitHub mailbox discussed on 13 Nov). Until then, the target is to cut "3 hand touches per order" to 2 by
  making the paste block the only touch for both quote and result.

### P4. The false regression: busy-machine test failures (F5, F6, F7)

- **Shows as:** in the inspection yard, a lamp that fails turns orange first ("checking"), not red. The yard shows a load
  gauge. When the old build fails the same test under the same load, the lamp turns to **grey cloud** (old flake, not
  this build), not red.
- **Alarm rule:**
  - A suite fails while the machine's load average is above the number of cores (or above 2 builders working): mark
    `suspect-load`, do not raise red.
  - Any new failure triggers a **paired run**: the same suite on the last live build and the new build, side by side, at
    the same time. This is the F7 practice made automatic.
  - Paired result: new fails and old passes = **regression (red, blocks deploy)**. Both fail the same checks = **old
    flake (grey cloud, does not block, goes on the flake list)**. New passes on rerun and old passes = **flaky (amber)**.
- **Fix it prompts:** red: "Hire a fixer for suite X on branch Y, here are the failing checks." Grey: "Add suite X check N
  to the flake list." Amber: nothing now; it counts toward P5.
- **Automation level:** L2. Running a paired test is safe and undoable.

### P5. The flaky suite (F6)

- **Shows as:** weather. A suite that flaked in the last 7 days gets a small cloud over its lamp. Three or more flaky
  suites makes the yard overcast. The yard keeps a **flake budget** bar.
- **Alarm rule:** a suite that is flaky 3 times in 7 days, or that needed a rerun on 2 builds in a row, goes on the
  **quarantine** list. Google's testing team found about 16% of its tests had some flakiness and uses reruns and
  quarantine [S11].
- **Fix it prompts:** "Suite X is flaky (3 in 7 days, cost: N reruns). Hire a one-time test fixer: make it wait on game time,
  not wall time." That exact fix worked on 13 Nov (tests now wait on game time). BUDGET rule 5 already says: fix flaky
  tests once.
- **Quarantine rule:** a quarantined suite still runs and is still shown, but it does not block deploy alone. It leaves
  quarantine after 10 clean runs. No more than 3 suites in quarantine at once; a fourth forces a fix before new features
  (an error budget for tests, in the SRE sense [S12]).

### P6. Done that is not done (F9, F10, F11, F15, F16)

- **Shows as:** a parcel at the post office. A parcel with only a `claim` is a **plain brown box, unlit**. A parcel with
  every claim checked by someone else is **wrapped in gold and lit**. A parcel with a failed check is **torn**. This follows
  the town's own verdict: "it shows talk better than finished work", so finished, verified work glows brightest.
- **Alarm rule:**
  - Any `deploy` whose parcel has an unchecked claim: block, unless the foreman writes a `check` himself with evidence.
  - Any `result` from the home town marked done where the stage test was not run or was judged by the maker: "unchecked".
  - A checker whose verdicts are 100% "holds" over 20 items, or who answers in under 5 seconds per item, is flagged as a
    **rubber stamp** (F11).
  - A checker whose verdicts on the same item disagree with themselves is flagged as **unreliable** (F16).
- **Fix it prompts:** "Parcel X has 2 claims nobody checked: look at shot 58 for a duplicate chip; look for the card."
  Pictures: "6 pictures marked done; no independent check. Send to: the foreman's own look, or Harry's pick list."
- **The verification chain** is laid out in section 5.4.

### P7. The empty letterbox: empty or broken answers from local models (F13, F14, F17)

- **Shows as:** each resident's house has a letterbox. A real answer is a letter. An empty answer is an **open, empty
  letterbox**. "(DONE)" and other non-answers count as empty. A seat that has not been heard at all has **dark windows**;
  "moved, not heard" is **fog over the house**.
- **What counts as empty or broken (computed, not judged):** fewer than 8 words; only a sentinel like "(DONE)"; does not
  fit the JSON shape asked for; repeats the prompt; wanders off topic (for sparks, the town already tags "noise: empty or
  too short").
- **Alarm rules:**
  - The same seat empty twice in a row: that seat goes **on the bench** (not asked again until a test answer passes). The
    Dell Writer meets this rule today: "(DONE)" in power-1 and again in economy-1.
  - Order-wide empty rate above 20%: bell. The almanac rule (fewer than 2 real answers two nights running: pause and tell
    Harry) stays as it is.
  - An empty answer that took more than 10 minutes: cost alarm, because it burns the slowest machine. The Writer took
    2,317 s to say "(DONE)".
- **Fix it prompts (in order):**
  1. Retry once, shorter: halve the context, keep the JSON shape, and for the Mill stay under 300 words.
  2. If still empty, put the seat on the bench and give its turn to the next seat with the same talent.
  3. Ask the home town for a one-line diagnosis in the next run report (for example, whether a thinking model's answer
     was cut away with its thinking).
- **Automation:** retries are the home town's to run (it owns its machines). The cloud control room only suggests them in
  the next order.

### P8. Answers that break the house rules (F15)

- **Shows as:** the **courthouse**. Each answer is checked against the rule list: nobody dies, nothing burns, no loose
  batteries or flames, no brands, no real landmarks, nothing personal. A broken rule puts a **red ribbon** on that letter
  in the market square, and the resident's report card loses a point.
- **Alarm rule:** any rule break in material marked for a kids' game blocks it from the game files. A seat with 3 rule
  breaks in 7 days gets a stricter prompt (rules first, at the top).
- **Fix it prompts:** "Elder's gadget uses a flame; Reasoner's uses loose batteries. Kept in the honest count, marked
  'not for the game'." Words are never edited (the honesty rule); they are flagged.
- **How:** a word list catches most of it (flame, fire, burn, battery, plug, socket, blood, die, kill, brand names); a
  second model reads anything the word list passes. The foreman checks everything before it goes in a game (already the
  rule in the wagon guide).

### P9. The brief that was too big (F2, F12, F17)

- **Shows as:** the **hills**. A workshop whose job has run past its expected time grows a hill. Each restart or retry
  makes the hill taller. A brief that has been resumed twice gets a **"split me" flag** on its wagon.
- **Alarm rule:**
  - Running time above the 85th percentile of builder run times (from the ledger: start to end), or above 2x the
    `est_min` on its `hire` line.
  - Or the same brief needed a resume twice.
  - Or a home town stage over 30 minutes that the town did not split into sessions (the town's own rule from 13 Nov).
  - Or a model hit its time limit in a thinking loop (F12).
- **Fix it prompts:** "Split brief X: here are the 3 parts it touches (from the file list). Suggested split: A then B,
  C waits." For the home town: "Smaller input (the Brain reads up to about 13 KB)" or "reshape: block-out first" (the
  look-1b fix after F17).
- **Rule of thumb from the log:** builder briefs that finished cleanly were single-purpose (couch versus: 48 min; snapshots:
  about 4 hours). Briefs that got cut off were merges plus features. Keep one goal per builder.

### P10. The traffic jam: a bottleneck machine (F18, F26)

- **Shows as:** the road to the Dell fills with cars. Each car is a job; its length is the expected run time. A **jam
  meter** shows "wait to start" against "time running".
- **Alarm rule:**
  - Queue wait on a machine is more than 2x its run time for 2 orders in a row.
  - Or a job has waited over 6 hours.
  - Or a build depends on a Dell stage (the wagon guide says: never make a build wait for the Dell).
- **Fix it prompts:** "Dell queue: 9 hours. Options: (a) mark Dell stages as bonus and let the order finish without them;
  (b) ask the 3 quick residents (7B, 8B, 12B) only; (c) move the 'own answers' talent to the Brain on the Radeon in a gap."
  The town chooses (it says HOW; the cloud says WHAT).
- **Flow efficiency number:** for each order, time actually running divided by total time from order to result. Shown on
  the bridge. Most of PatchTown's lead time is waiting (queue plus waiting for Harry's paste), so this number shows where
  to push.

### P11. The fox in the pond: idle machine with work waiting (F19)

- **Shows as:** the fox, as the Choreographer invented it. A fox sits in the pond next to any machine that is idle while a
  job it could do is waiting somewhere.
- **Alarm rule:** a machine idle for 15 minutes or more while a queued job has a talent that machine can do. If the job is
  waiting on a dependency (for example, the Brain stage waits for residents' answers), draw a rope from the job to the
  thing it waits for.
- **Fix it prompts:** "Radeon idle; mega-review-1 Brain stage waits on 8 Dell residents. Let the Brain start from the
  brief now and add the residents later?" Also the standing advice: "Fill the Radeon's gaps with pictures."
- **Order design fix:** every order lists for each stage what it truly needs. Stages that only need the brief start at
  once. This is a change to the order form: a `needs:` line per stage.

### P12. The reservoir: disk, memory, load (F25, F26)

- **Shows as:** the reservoir water level for the Mini's disk, with the 30 GB floor painted on the wall. A thermometer on
  each machine for memory. A load gauge on the cloud workshop (load average).
- **Alarm rule:**
  - Disk under 40 GB: amber. Under 33 GB: red. Show "days to floor" from the trend.
  - Cloud load average above twice the core count, or more than 2 builders: amber; tests marked `suspect-load` (P4).
  - Any brake stop (memory): red, with the job that caused it.
- **Fix it prompts:** disk: "A list of the biggest files the town could archive or delete. Harry decides (deleting is his
  call)." The control room never deletes. Load: "Hold the next builder until the current tests finish."

### P13. White smoke: rebuilt something that already existed (F20)

- **Shows as:** white smoke over the building that was rebuilt, as the Swarmkeeper invented it.
- **Alarm rules:**
  - **Before hiring:** every brief carries an `exists_check` line: what was searched (branches, games folder, ledger) and
    what was found. A brief without one is a "blind hire" and gets a small grey flag.
  - **After:** a new file or function whose name or purpose matches something already on another branch (a simple name
    search over branches and the ledger) raises the smoke.
- **Fix it prompts:** "Already exists: X on branch Y (commit Z). Reuse it?" The Anthropic research system found vague
  briefs made subagents duplicate each other [S8]; the brief must say what already exists and what is out of bounds.

### P14. The sorting office: merges and branch chains (F27)

- **Shows as:** rails between workshops in the order they must merge. A branch that must merge before another has an
  arrow. A branch that has drifted far from the live build has a long, sagging rail.
- **Alarm rule:** a branch more than 2 live builds behind, or with a "must merge before" note older than 24 hours.
- **Fix it prompts:** "Merge bc-sound into bc-build20 before deploy (from the brief)." Merge order is written as data in the
  `hire` line (`merge_after: game/bc-sound`), not only in prose.

### P15. Unposted parcels: work outside git (F30)

- **Shows as:** a parcel left on the workshop step instead of at the post office.
- **Alarm rule:** an `end` with no commit, or a test log path that is not in the repo.
- **Fix it prompts:** "Commit the log or its summary before ending." Builders' briefs say: "No end without a commit."

### P16. The town hall backlog: waiting on Harry (F21, F23, F24)

- **Shows as:** motions pinned on the town hall board, each with an age. Fresh motions are white; over a day, yellow; over
  three days, they curl. Each motion shows what it blocks (a rope to the stuck wagon or workshop). The **toll booth** on
  the bridge shows downloads and installs waiting.
- **Alarm rules:**
  - A motion that blocks running work and is over 24 hours old: the town crier reads it out once, in the next morning
    report.
  - A yes given in the wrong room (F23) shows as **"yes, needs saying in the town chat"**, a half-green motion.
  - More than 7 open motions: the crier says "too many questions" and the foreman must decide the cheap, reversible ones
    himself (decide, don't ask).
- **Fix it prompts:** one daily block for Harry: up to 5 questions, each one line, each with the default that happens if
  he says nothing (only for reversible, non-money, non-security calls), each with the room it must be said in.

### P17. The empty fuel gauge: budget and limits (F3, F29)

- **Shows as:** the battery gauge. It shows the last plan-meter % Harry read out, the time he read it, and an estimate of
  use since then from builder tokens in the ledger.
- **Alarm rule:**
  - Estimated game half under 25%: amber; under 15%: red (the existing rule: no new work under 15%).
  - The reading is older than 24 hours: the gauge shows "unknown, ask Harry".
- **Fix it prompts:** "Before the next big build (est. 300k tokens), please read the plan meter." Value per token, in
  BUDGET rule 6 order: first 10 minutes and pacing, then fixes from Harry's play, then new features.

### P18. Context loss after restarts (F28)

- **Shows as:** the **archive** (git, START_HERE, HANDOVER). A **memory freshness** clock on the foreman's hut: when
  START_HERE and the open briefs were last brought up to date.
- **Alarm rule:** a live deploy, a stall or a new order since START_HERE was last updated, for more than 4 hours.
- **Fix it prompts:** "Update START_HERE: build 29 live, depth on next/." The resume brief (P1) is the builder-level version
  of the same idea.

### Summary table of alarms

| ID | Name | Town sign | Fires when | Prompts | Level |
|---|---|---|---|---|---|
| P1 | Stalled builder | Lost property | 20 min no beat (late), 60 min or restart (lost) | Resume from last commit with an auto brief | L2 |
| P2 | Power cut | Dark power station | 2+ late together, or a limit line | Wake at reset, resume in order | L2 |
| P3 | Silent bridge | Crow on wagon | No quote 12 h; result past due; no paste 24 h | One paste block for Harry | L1 |
| P4 | False regression | Orange then grey cloud | New failing test | Paired run vs last live build | L2 |
| P5 | Flaky suite | Clouds; flake budget | 3 flakes in 7 days | Quarantine; hire one-time test fixer | L1 to L2 |
| P6 | Unchecked claim | Brown box vs gold parcel | Deploy or result with unchecked claim; rubber-stamp checker | Block deploy; list what to check | L2 block, L0 check |
| P7 | Empty answers | Empty letterbox; dark windows | Same seat empty twice; order empty rate over 20% | Retry shorter; bench the seat | L1 (home town acts) |
| P8 | Rule breaks | Courthouse red ribbon | Word list or reader hit | Flag "not for the game" | L2 flag |
| P9 | Brief too big | Hills; "split me" | Over P85 or 2x estimate; resumed twice | Suggested split | L1 |
| P10 | Bottleneck | Jam on the road | Wait over 2x run, or over 6 h | Make Dell a bonus; reroute talent | L1 |
| P11 | Idle with work | Fox in the pond | Idle 15 min with eligible work | Start the stage that does not need to wait | L1 |
| P12 | Resources | Reservoir; gauges | Disk under 40/33 GB; load high | List for Harry; hold next builder | L1 / L2 hold |
| P13 | Duplicate work | White smoke | Blind hire; name match | Reuse instead | L1 |
| P14 | Merge chains | Rails | Branch 2 builds behind; stale "merge first" | Merge in order | L1 |
| P15 | Work outside git | Parcel on the step | End without commit | Commit first | L2 block end |
| P16 | Waiting on Harry | Town hall board | Blocking motion over 24 h; yes in wrong room | Daily 5-question block | L1 |
| P17 | Fuel | Battery gauge | Under 25%/15%; reading over 24 h old | Ask for a reading; hold new work | L2 hold |
| P18 | Stale memory | Archive clock | START_HERE behind events by 4 h | Update the file | L1 |

---

## 5. The control room layer

The control room is a mode of the town, toggled from the town hall. The town stays the picture; the control room puts
numbers and buttons on it. On a phone it collapses into one scrolling list, most urgent first.

### 5.1 The flow board: queues and work in progress

A Kanban board drawn as the high street. Each column is a stretch of road. Each card is a car.

| Column | What is in it | WIP limit | Source |
|---|---|---|---|
| Asked | Harry's ideas and goals not yet briefed | none (a backlog) | Harry's words, the roadmap |
| Briefed | A builder brief or an order written, not started | 5 | `hire`/`order` lines |
| Waiting on Harry | Needs a paste, a yes or a taste call | shown with ages; no limit, but over 7 triggers P16 | `ask` lines |
| Building (cloud) | Builders working | **2** (the existing rule) | `start` without `end` |
| In the home town | Orders quoted or running | 1 heavy job per machine | quotes, run reports |
| Inspection | Tests and checks running or waiting | 3 | `test`, `claim` without `check` |
| Ready to ship | Checked, waiting to deploy | 2 | `check` all holds, no `deploy` |
| Live | Deployed with a backup | none | `deploy` with `backup` |
| Proven on device | Tried on Harry's real iPad | none | `win` from Harry |

Notes:

- **"Proven on device" is a separate column on purpose.** The mega review's biggest risk is that almost nothing has been
  played on a real iPad. Live is not the same as proven. The fog stays over anything live but not proven.
- **Aging WIP.** Each card shows its age in its current column. A card older than the 85th percentile for that column turns
  amber. This is the "work item age" practice from Kanban flow metrics, a leading signal before anything is late [S13].
- **Cumulative flow.** A small stacked chart on the town hall shows how many cards were in each column each day. A
  widening band means work piling up; a flat "Live" line means nothing shipped [S13].

**Flow numbers shown on the board:**

| Number | Definition | Today (from the log, where it can be read) |
|---|---|---|
| Lead time | From "asked" to "live" | Example: build 29 hired 14:25 on 15 Nov, live 17:10 on 16 Nov: about 27 h, of which about 20 h was the stall |
| Cycle time | From builder `start` to `end` | Couch versus 48 min; snapshots 4 h 5 min; fixer 1 h 16 min |
| Throughput | Items reaching "live" per day | 14 Nov: builds 20, 21, 22, 23, 24, 26 and 27 (7 deploys in one day); 15 Nov: 28, couch, Kitchen Run |
| Work in progress | Cards in "Building" plus "In the home town" | Kept at 2 builders; home town shows orders open |
| Flow efficiency | Running time / lead time | Not measurable yet: needs the run report's queue minutes |
| Order lead time | Order sent to result received | Not measurable: 5 orders in the ledger, 0 results logged (F22) |

Little's Law ties three of these together: average lead time = work in progress / throughput [S6]. So if the home town has
6 orders open and returns 1 result file a day, a new order waits about 6 days. The board should show that sum next to the
bridge, so the foreman does not send a seventh order expecting it tomorrow.

### 5.2 Capacity: the machine board

One row per worker. The cloud and the home town on the same board, with the river between them.

| Worker | Capacity unit | Busy now | Queue | Healthy? | Notes from the log |
|---|---|---|---|---|---|
| Foreman (cloud) | 1 session; usage plan | heartbeat age | asks open | beat under 15 min | Decides, briefs, checks, deploys only (BUDGET rule 2) |
| Builders (cloud) | 2 slots | which branch, age | briefed cards | beats under 20 min | Load average shown; 2 is the cap |
| Mini | robot browsers, test runs | jobs | queue | disk, link | Nearly always free for robot tests |
| Radeon VII | 1 heavy job (Brain, pictures, coder, trainer) | which | queue | brake stops | Brain about 10 min an answer; pictures 35-60 s |
| Dell | 1 model at a time | which resident | residents waiting | empty rate | Slowest; treat as bonus |
| Mill | 1 model; prompts under 300 words | which expert | queue | noise rate | 72 sparks in 25 min |
| Harry | about 5 decisions a day (assumption; ask him) | motions open | pastes waiting | age of oldest | The scarcest worker in town |

**Capacity figures for the night train** (from the wagon guide's 12-hour estimates): Radeon about 70 Brain answers or about
500 pictures or 12 trained experts; Mill about 2,000 sparks; Dell 20-40 resident answers if free; Mini thousands of robot
games. The planner (5.3) books against these and shows a **booked vs. capacity bar** for tonight. measure-1 will replace
estimates with measured numbers when it runs.

### 5.3 Scheduling across the cloud and the home town

The home town decides HOW (its rule: "you say WHAT you want. The town says HOW"). So the cloud control room does not
schedule the home machines directly. It plans the order mix and shows the expected load. The home town's run report then
shows what really happened.

**Rules the cloud planner follows when writing orders** (all already in the wagon guide or log; the control room checks
them automatically before an order is committed):

1. **Three machines at once.** A good order has a Radeon stage, a Mill stage and a Dell stage that can run side by side.
2. **Radeon stages run one after another**, never in parallel (one heavy job).
3. **No build waits for the Dell.** Any Dell stage is marked `bonus: yes`.
4. **Every stage has a canary and a checkable test.** An order without one is refused by the order linter.
5. **Every input is committed** with a path and branch; the linter checks the path exists on that branch.
6. **Budget given** in machine time and download size.
7. **Four questions per sitting at most; a JSON shape; about 220 words.**
8. **A `needs:` line per stage** so stages that do not depend on others start at once (P11).
9. **NEEDS HARRY lists every download or install** with name, size, licence and why. The linter turns each into an `ask`
   with `room: town chat`.
10. **Send early in the day.** The order shows "expected result" using the queue sum from 5.1.

**The order linter** is the first concrete automation: a script that reads `games/orders/<id>.md` and checks rules 4 to 9
before the foreman gives Harry the paste line. It catches problems while they are cheap (the canary idea applied to
orders themselves).

**Cloud builders:**

- Two slots. A third brief waits in "Briefed".
- **Priority classes**, from BUDGET rule 6: (1) fixes that block a live build or Harry's play; (2) the first 10 minutes and
  pacing; (3) fixes from Harry's play; (4) new features; (5) the town itself.
- **Tests run in the gap.** The foreman does not start a heavy test run while 2 builders are compiling and testing (load
  under the core count), or the tests run paired (P4).

**The daily rhythm** (from START_HERE, "Daily milestones") becomes the control room's timetable:

| Time (UK) | Control room shows | Who acts |
|---|---|---|
| Morning | Overnight results and the night train's arrival; stalls; the day's goal | Foreman reads; Harry pastes results |
| Day | Builders, yard, shop window; stall alarms | Foreman, builders |
| 17:00 | Goal check: hit, partly, missed, with a link and a picture | Foreman |
| Before Harry stops | Tonight's orders, booked vs. capacity; the one paste block | Foreman writes; Harry pastes |
| Night | Watchdog only. Wake-ups every 2 hours (as on 13-14 Nov) | Scheduled task |

### 5.4 The verification chain: AIs checking each other

The rule: **every claim gets a second key from a different checker.** The checker must be a different kind of thing from
the maker where possible (a test is better than a model; a different model is better than the same one; Harry is the final
key only for taste and real-device facts).

| Work | Maker | First key (automatic) | Second key | Final key |
|---|---|---|---|---|
| Game code | Builder | The suites, paired with the last live build (P4) | Foreman reads the diff and the shots | Harry plays on the iPad (moves the card to "proven") |
| Screenshot claims ("no duplicate chip") | Builder | none | Foreman looks at the named shot | — |
| Deploy | Foreman | Live link starts with 0 errors (noxr, diagclash, WebKit + Chromium) | Backup exists and opens | — |
| Resident answers | Dell / Mill / Radeon seats | Shape check (JSON), empty check, word count, rule word list | A second model reads rule breaks (P8) | Foreman before anything goes in a game |
| Sparks | Mill experts | Noise check (the town already tags it) | Best-of pick by another seat | Foreman, then Harry picks winners |
| Pictures | Picture maker | none reliable today (F16) | Foreman looks, using the line it was meant to show | Harry picks style |
| Code reviews by local models | 14B coder, Brain | **Calibration check:** plant 3 known bugs and 3 clean pieces in each batch; a reviewer that misses planted bugs or says "no bugs" to everything is a rubber stamp (F11) | Foreman checks each BUG line | — |
| Trained experts | Trainer | Blind 10-prompt test judged by the Brain (mega-review-1 stage 4) | Foreman reads the before/after | Harry |
| Order results | Home town | Honest count adds up (asked = answered + empty + broken + timed out + no turn) | Foreman | — |

**Calibration ("known answers").** The cheapest fix for F11 and F16 is to slip items with known answers into every batch
a model judges. If a judge cannot spot a planted bug or a planted off-brief picture, its verdicts that day are shown as
"uncalibrated" and do not count as a key. This is how the town learns which of its residents can be trusted to check
others, and it fills each resident's **report card** with real numbers.

**Report cards per seat** (the atlas's "report card" and "empty letterbox", made concrete):

| Field | Meaning |
|---|---|
| Asked / answered / empty / broken / timed out / no turn | the honest count, 7 days and all time |
| Median seconds per answer | from run reports |
| Rule breaks | from P8 |
| Kept by Harry | ideas that made it into a game, with credit |
| Judge accuracy | share of planted items caught, if the seat is used as a judge |
| Status | answering, benched, fog (not proven), resting by Harry's rule |

### 5.5 Approvals: the town hall and the toll booth

**What needs Harry** (from the standing rules and the overnight limits): money, security, deleting, downloads, installs,
sending anything to the shop or anyone else, anything personal, new repositories, changes to the town's setup, and taste
calls.

**The motion card:**

| Field | Example |
|---|---|
| Question (one line) | "Download the 3D-room maker (about 2 GB, Apache 2.0) for scan-1?" |
| Type | download |
| Blocks | scan-1 stage 1 |
| Default if silent | none (downloads never default to yes) |
| Room where the yes must be said | town chat |
| Age | 2 days |
| State | open / yes in wrong room / yes / no / withdrawn |

**Rules:**

1. **Money, security, deleting and downloads never have a default.** Silence means no.
2. **Taste calls get a default** after 72 hours if they are reversible (for example, "keep credits small"). The foreman
   proceeds with the default and says so in the next report. This follows the decide-don't-ask rule.
3. **A yes is only a yes in the right room.** The motion shows "yes in game session: needs the town chat" (F23).
4. **One block a day.** All open motions for Harry are gathered into one copy-and-paste block per destination (his rule from
   12 Nov), at most 5, most blocking first.
5. **Approvals are recorded as Harry's words, verbatim**, with the time and the room. LangGraph's human-in-the-loop
   pattern has the same shape: pause, show the action, then approve, edit or reject, and resume from a saved checkpoint
   [S14].

### 5.6 Budgets and limits

| Budget | Unit | Who reads it | Shown as | Rule |
|---|---|---|---|---|
| Cloud plan, game half | Harry's plan-meter % | Harry, read aloud | Battery gauge, with reading age | No new work under 15% (existing) |
| Builder tokens per job | tokens from task reports | foreman | A coin stack on each parcel | Compare to the job's class median; over 2x = check the brief |
| Home machine time | minutes per machine per order | home town quote and run report | Booked vs. used bars | Town stops at budget and reports (wagon guide) |
| Downloads | GB | Harry | Ships at the harbour | 0 unless yes in the town chat |
| Disk | GB free on the Mini | home town | Reservoir | Refuses jobs under 30 GB |
| Flake budget | suites in quarantine | test yard | Cloud cover | Max 3; then fix before features |
| Harry's attention | open motions | foreman | Town hall | Max 7 open; max 5 per daily block |
| Builder slots | concurrent builders | foreman | Workshop doors | Max 2 |

**Cost per result.** From BUDGET_LEDGER, builder jobs cost 89,729 to 534,644 tokens. The bank shows cost per live build and
cost lost to restarts. On 13 Nov at least two builds' worth of tokens were lost and one was paid twice (F2). The bank
makes that visible: a **"lost to restarts"** column in red.

### 5.7 Incidents and postmortems

**Severity levels** (PatchTown's own, in the style PagerDuty uses where a lower number is more urgent [S15]):

| Sev | Meaning | Example from the log | Response |
|---|---|---|---|
| Sev 1 | A live game is broken for players, or a rule (privacy, kids' safety) broke | build 14 did not start in WebKit (13 Nov) | Roll back to the kept build at once (fire station), then fix. Tell Harry in the next message |
| Sev 2 | Work lost or stopped for more than 2 hours | F1 (20 h stall), F2 (restarts) | Resume; postmortem within a day |
| Sev 3 | A false signal cost time (F5), a false "done" reached the post office (F9, F10) | build 18 "regressions" | Fix the check; a short note |
| Sev 4 | Waste (F13 empties, F20 duplicates) | Writer "(DONE)" | Counted on the dashboard; reviewed weekly |

**The incident card** (on the town crier's board): what happened, when it started, when it was noticed (the gap is the
key number), what was done, what is still open.

**Postmortem template** (blameless, from Google SRE [S9]). Short, for a phone:

1. What happened, in 3 lines.
2. Timeline (from the ledger, automatically).
3. Time to notice, time to fix.
4. Why the system let it happen (not "the builder failed").
5. What was lucky.
6. Actions: each one a ledger `ask` or `hire` with an owner and a date.

**Worked example: F1, the build 29 stall.**

- Happened: builder started 14:26 on 15 Nov; machine restarted; builder stopped 16:27; found 12:19 on 16 Nov.
- Time to notice: 19 h 52 min. Time to fix: build 29 live 17:10 on 16 Nov.
- Why the system let it happen: no heartbeat; the only watcher ran on the machine that restarted; the lost property rule
  (2 h) was not built yet; nobody's morning routine listed "running builders and their last sign".
- Lucky: work was on a branch; a fixer could pick it up.
- Actions: heartbeat `beat` lines (P1); watchdog outside the session (3.4); morning report starts with "running builders,
  last sign" (5.3); resume briefs (P1).

**Postmortem follow-through:** each action shows as a small scaffold on the building it fixes, until done. A weekly
"postmortem of the month" style review (from the SRE book [S9]) becomes a **weekly town meeting** card: the top 3 incidents,
the actions still open, and whether the same failure happened again.

### 5.8 Memory and handover

- **Resume packets** for every running builder (P1), written automatically from the ledger and the branch.
- **START_HERE freshness** clock (P18).
- **Session boundaries are marked on the timeline.** A new foreman session is a new sunrise; its first job is to read the
  control room's "what is open" list, not the whole history.
- **Builders forget, so briefs carry everything.** The brief checklist (from Anthropic's research system: objective, output
  format, tools and sources, task boundaries [S8]) plus PatchTown's own: what already exists, merge order, tests to run,
  claims to make, and "commit every 20-30 minutes".

---

## 6. The metrics catalogue

The four golden signals [S2] mapped to PatchTown, plus flow and quality.

| Signal | PatchTown metric | Definition | Where in town | Target (first guess) |
|---|---|---|---|---|
| Latency | Builder cycle time | start to end, per job class | Workshop clock | Within 2x the estimate |
| Latency | Order lead time | order sent to result logged | Bridge | Next morning for small orders |
| Latency | Time to notice a stall | last sign to alarm | Lost property clock | Under 30 min |
| Latency | Time to restore | live break to fixed or rolled back | Fire station | Under 1 hour (DORA's top band [S16]) |
| Traffic | Orders and briefs per day | count | Noticeboard | Shown, not targeted |
| Traffic | Deploys per day | count | Shop window | Shown |
| Errors | Change failure rate | deploys needing a fix or rollback / deploys | Hospital | Under 15% [S16] |
| Errors | Empty answer rate | empty / asked, per seat and per order | Letterboxes | Under 10% per order |
| Errors | False "done" rate | checks that fail / claims checked | Post office | Falling week on week |
| Errors | Flake rate | flaky runs / all runs per suite | Yard weather | Under 5% per suite |
| Saturation | Builder slots used | of 2 | Workshop doors | Not over 2 |
| Saturation | Queue wait per home machine | minutes | Roads | Under run time |
| Saturation | Mini disk | GB | Reservoir | Over 40 |
| Saturation | Harry's open motions | count and oldest age | Town hall | Under 7; oldest blocking under 24 h |
| Saturation | Plan fuel | last % and its age | Battery gauge | Over 15% |
| Flow | WIP | cards in progress | High street | 2 cloud + 1 per home machine |
| Flow | Flow efficiency | running / lead time | Bridge | Shown; raise over time |
| Waste | Rework | white smoke events; tokens lost to restarts | Smoke; bank | Zero smoke; lost tokens falling |
| Waste | Idle with work | fox minutes per day | Pond | Under 30 min |
| Truth | Proven on device | live features tried on the real iPad / live features | Fog | Rising |
| Truth | Hand touches per order | Harry's pastes per order | Bridge | 3 now; 2 next; 0 with a mailbox |

---

## 7. Alarm design: so the bells mean something

Too many alarms and people stop listening (alarm fatigue). The rules:

1. **Three tiers.**
   - **Lamp** (shown only): numbers out of range. No sound.
   - **Bell** (on the crier's board and in the next foreman wake-up): something needs action today.
   - **Page** (reaches Harry): only Sev 1, or a Sev 2 overnight that the control room cannot fix itself, or a decision only
     he can make that blocks everything. Target: no more than one page a day.
2. **One alarm per cause.** A power cut (P2) swallows the individual stalls (P1) it caused. Paired-run results replace the
   raw test failure.
3. **Every bell says what to do,** in one line, with the exact command or paste block.
4. **Quiet hours.** Harry's night is not paged except for Sev 1. The night's bells wait for the morning report.
5. **Alarms have owners.** Cloud alarms: the foreman. Home town alarms: the home town (CAIRN on the Mini). Approvals: Harry.
6. **Review the alarms weekly.** Any alarm that fired and led to no action is retuned or removed.

---

## 8. From showing to doing: the autonomy ladder

The town can earn the right to act. Each step needs Harry's yes and a week of clean running at the step below (the same
"run well for a week" rule as the standing orders).

| Level | Name | What the control room does | Examples |
|---|---|---|---|
| L0 | Show | Draws the town and the numbers | v1 today |
| L1 | Suggest | Each alarm carries a ready-made action: a resume brief, a paste block, a split plan. A person or the foreman presses go | P3, P7, P9, P10, P11, P13, P14, P16 |
| L2 | Do the small undoable things in the cloud workshop, then tell | Re-run a test as a paired run; resume a stalled builder once from its last commit; write a resume brief; block a deploy that has unchecked claims; hold the next builder when load is high; flag a rule-breaking answer; wake a fresh foreman | P1, P2, P4, P6 (block), P8 (flag), P12 (hold), P15, P17 (hold) |
| L3 | Do bigger things in the cloud, with a check window | Roll back a live game to the kept build on a Sev 1 (the fire station), then tell. Write the next order draft from the queue | Only after L2 has run clean for 2 weeks |
| Never | Harry's calls | Money; security (including the bridge, GitHub tool access, settings and hooks); deleting anything; downloads and installs; sending anything to the shop or other people; anything personal; new repositories; changes to the home town's machines or models; changing its own rules or limits | Always an `ask` |

**Guard rails for L2 and L3:**

1. **An allowlist, not a blocklist.** The control room can only do the named actions above. Anything else is a suggestion.
2. **Undoable only.** Every action can be reversed: a test rerun changes nothing; a resume works on a branch; a rollback
   points at a kept build and keeps the newer one.
3. **Rate limits.** At most one automatic resume per brief, at most 3 automatic actions an hour, at most 2 builders ever.
4. **Every action is a ledger line** with `who: control-room`, so it shows as a walker in the town and appears in replay.
5. **A dry-run week.** Before an action level is switched on, it runs for a week writing "would have done X" lines. Harry
   and the foreman compare those with what really happened.
6. **The stop lever.** A big red lever in the town hall (the andon cord from the Toyota system, where anyone can stop the
   line when something is wrong [S17]). Pulling it stops every automatic action at once. It is one setting, not a
   process, and the town shows it pulled.
7. **The control room watches itself.** Its own heartbeat is on the power station. If it is silent, the town shows "control
   room off" rather than all green (a dark street, not a sunny one).
8. **It never acts on the home town.** The home town owns its machines. The cloud control room can only write orders and
   suggestions; the home town decides. This keeps the "one door" rule.
9. **It never changes the evidence.** Old ledger lines are never edited. Model words are never tidied.

---

## 9. How this compares with real practice

| Practice | Where it comes from | What PatchTown takes | What it changes for a two-town, one-human studio |
|---|---|---|---|
| Four golden signals; alert on symptoms | Google SRE book, ch. 6 [S2] | Latency, traffic, errors, saturation mapped to builders, orders, empties and queues (section 6) | Harry's attention is a saturation signal too |
| Error budgets | Google SRE book, ch. 3 [S12] | A flake budget (max 3 quarantined suites) and the 15% fuel rule | Budget is tokens and Harry's time, not uptime |
| Blameless postmortems | Google SRE book, ch. 15 and workbook ch. 10 [S9] | Template, worked example, weekly town meeting | Agents are not blamed; briefs and rules are fixed |
| Incident severity and a single commander | PagerDuty response docs [S15] | Sev 1-4; the foreman is the incident commander | No on-call rota; the watchdog wakes a fresh foreman |
| Dead man's switch: period plus grace | Healthchecks.io [S3] | `beat` lines, late at 20 min, lost at 60 min | The watcher runs outside the session that can die |
| Heartbeat timeouts and retry policies | Temporal docs [S4] | Resume once from last commit; a stall counts as a timeout | Retries are briefs, not function calls |
| WIP limits, lead time, cycle time, Little's Law | Kanban flow metrics [S6] | The high-street board, 2-builder limit, queue sum on the bridge | Includes a human column ("waiting on Harry") |
| Aging WIP and cumulative flow | Vacanti; Kanban practice [S13] | Card ages; town hall flow chart | — |
| DORA four keys | DORA research [S16] | Deploy frequency, lead time, change failure rate, time to restore | Adds "proven on device" because live is not proven |
| Flaky test reruns and quarantine | Google Testing Blog [S11] | Paired runs, quarantine, one-time fix | Load-aware, because builders share the test machine |
| Andon cord and jidoka (stop on abnormality) | Toyota Production System [S17] | The stop lever; canaries that stop a stage after 3 failures | Already practised by the home town |
| Orchestrator-workers; evaluator-optimizer | Anthropic, Building effective agents [S5] | Foreman and builders; maker never checks own work | Local models need calibration before they may judge |
| Briefs: objective, format, tools, boundaries; duplication from vague briefs | Anthropic multi-agent research system [S8] | Brief checklist plus `exists_check` (white smoke) | Adds merge order and commit rhythm |
| Multi-agent failure taxonomy | MAST, UC Berkeley [S1] | The seven families in section 1 | Adds human-wire and hardware failures MAST does not cover |
| Task length vs reliability | METR time horizons [S7] | Small briefs; split rule P9 | — |
| Traces, spans, scores, LLM-as-judge | Langfuse docs [S18]; OpenTelemetry GenAI conventions [S19]; AgentOps (already in works/SOURCES.md) | One foreman session = a trace; each builder = a span; checks = scores | Ledger first; an OpenTelemetry bridge later, once the GenAI conventions settle (still "development" status) |
| Human approval with approve / edit / reject and resume | LangGraph human-in-the-loop [S14] | Motion cards with states; resume from checkpoint | The right "room" matters (F23) |
| Agent hooks (`Stop`, `SubagentStop`, `PostToolUse`) | Claude Code hooks docs [S10] | Automatic `beat`, `end` and `commit` lines | Needs Harry's yes (settings change) |

---

## 10. Build order (fits the atlas's v1 to v4)

| Step | What | Fixes | Needs Harry? |
|---|---|---|---|
| v1.5 (next) | Add `beat`, `claim`, `check`, `ask`, `answer`, `restart` kinds; builders' briefs say "beat every ~10 min, commit every 20-30 min, no end without a commit" | F1, F2, F9, F15, F23, F30 | No |
| v1.5 | Lost property at 20/60 min; power cut rule; the bridge "last heard" clocks; town hall board with ages | F1, F3, F22, F24 | No |
| v1.5 | A scheduled task that reads the ledger every 30 min and wakes a foreman on a rule | F1 | Probably no (it is the same wake-up tool used overnight); confirm |
| v2 | Paired test runs and the load gauge; flake list and quarantine | F5, F6, F7 | No |
| v2 | Order linter; `needs:` per stage; queue sum on the bridge | F19, F22 | No |
| v2 | Seat report cards from run reports; empty and rule-break checks; bench rule | F13, F14, F15 | No (home town acts on suggestions) |
| v2 | Hooks that write ledger lines automatically | All of family A | **Yes** (settings change) |
| v3 | Calibration items for model judges; the gold parcel; picture checks | F10, F11, F16 | No |
| v3 | Postmortems, weekly town meeting, incident board | All | No |
| v3 | L2 automatic actions after a dry-run week | F1, F2, F5 | **Yes** |
| v4 | Home town reads the cloud ledger and shows it on the home wall | F4, F21 | **Yes** (new network habit at home) |
| v4 | A mailbox the home town can write to | F21, F22 | **Yes** (security) |
| v4 | L3 rollback on Sev 1 | Sev 1 | **Yes** |

---

## 11. Risks

1. **Logging becomes the work.** If builders spend effort writing ledger lines, they build less. Mitigation: hooks do it
   automatically (needs Harry's yes); until then, one `works_log` line per step, nothing more.
2. **Alarm fatigue.** Too many bells and nobody listens. Mitigation: the three tiers, one alarm per cause, weekly retuning.
3. **Gaming the numbers.** Agents told "commit every 20 minutes" may make empty commits; "low empty rate" may push toward
   padding. Mitigation: show counts beside the actual evidence; check claims, not volume.
4. **False confidence from green.** A green town with a dead watchdog looks healthy. Mitigation: the control room's own
   heartbeat; "unknown" is drawn as fog, not sunshine.
5. **Model judges that look rigorous but are not** (F11, F16). Mitigation: calibration items; uncalibrated verdicts do not
   count as a key.
6. **Stale home town data.** Everything from the home town arrives late, through Harry. The control room may show
   yesterday as now. Mitigation: every home figure carries its "as of" time; past 24 hours it fades.
7. **Automation acting on wrong data.** A resume of a builder that was in fact still running would make two builders on one
   branch. Mitigation: before resuming, check the branch has had no commit since the last sign; the 2-builder cap; one
   automatic resume per brief.
8. **Privacy leaks through the ledger.** The ledger is public on GitHub. Mitigation: the existing rule (no names except
   Harry, no places, no room photos); a check in the works tests that rejects lines with words from a deny list.
9. **The security cost of the bridge.** A mailbox or Remote Control bridge would remove Harry as the wire, but it opens a
   door into his home network. This is his call and should be weighed separately.
10. **Usage cost of watching.** A watchdog that wakes a foreman every 30 minutes uses the plan. Mitigation: the scheduled
    task only wakes a foreman when a rule fires; a quiet check is cheap.
11. **The toy hides the truth.** A charming town can make a bad day look nice. Mitigation: the phone view is a plain list
    first; the town is for overview and for the public.

---

## 12. Open questions for Harry

1. **How many decisions a day do you want to be asked?** I assumed 5, in one block, once a day. Is that right, and at what
   time?
2. **Taste calls: may the foreman go ahead with a stated default after 3 days of silence**, if the choice can be undone?
   (Never for money, security, deleting or downloads.)
3. **May the cloud foreman turn on Claude Code hooks** so ledger lines are written automatically after commits and when
   builders stop? It is a settings change.
4. **May a scheduled task check the ledger every 30 minutes and wake a fresh foreman** when something has stalled? It
   uses a little of the plan each time it actually wakes.
5. **When should something reach you as a page?** I suggest only a live game broken for players, a broken privacy or kids'
   rule, or a stall overnight that the town could not fix. Is that the line?
6. **Should the Mini read the cloud's public ledger** and show it on the home wall? It is read-only, but it is a new network
   habit on your machine.
7. **The bridge: do you want a mailbox the home town can write to without you**, so results stop needing a paste? This is a
   security decision. The ops gain is large (it removes most of the 3 hand touches per order).
8. **Can the plan-meter reading become a routine** (for example, each morning and before you stop)? The foreman cannot see
   it and plans better with a fresh number.
9. **Which automatic actions do you want, after a dry-run week?** My list for level 2: paired test reruns, one resume of a
   stalled builder from its last commit, blocking a deploy with unchecked claims, and holding new work when fuel is under
   15%.
10. **Should the Dell Writer be benched** until the home town finds out why it answers "(DONE)"?
11. **Is the public view of the control room the same as yours?** Should numbers like token costs and open questions be
    hidden from visitors?

---

## 13. Top 10 recommendations, ranked

1. **Heartbeats and the lost property office at 20/60 minutes, watched from outside the session.** Every builder writes a
   `beat` line about every 10 minutes; a scheduled task checks the ledger every 30 minutes and wakes a fresh foreman on a
   stall. This alone turns the 19 h 52 min stall (F1) into about 1 hour. Biggest single win.
2. **Commit early, resume, never restart from scratch.** Briefs say "commit every 20-30 minutes; no end without a commit".
   A stalled builder is resumed once from its last commit with an automatic resume brief. This stops the restart losses
   of 13 Nov (F2) and work left in scratchpads (F30).
3. **Paired test runs as the standard.** Any new failure is re-run side by side with the last live build under the same
   load. Red only if the new build alone fails. This makes the foreman's best habit (F7) automatic and ends false
   regressions (F5).
4. **Claim and check: nothing is "done" without a second key.** Brown boxes until checked, gold when checked; deploys with
   unchecked claims are blocked. This addresses F9, F10 and the town's own verdict that it "shows talk better than finished
   work".
5. **One "waiting on Harry" board with ages, defaults and the right room**, sent as one daily paste block of up to 5
   questions. This attacks the biggest queue in the studio, which is Harry (F21-F24).
6. **Track every wagon: order, quote, result, with due times.** Today 5 orders are logged and 0 results. Show the queue
   sum (Little's Law) so the foreman knows a new order may take days, not hours (F22).
7. **Seat report cards and the bench rule for empty answers.** Same seat empty twice: retry shorter once, then bench. Show
   minutes of slow machines wasted on empties. The Dell Writer is the first case (F13, F14).
8. **An order linter before every paste.** Check canary, test, committed inputs, budget, `needs:` per stage, Dell marked as
   bonus, NEEDS HARRY turned into motions. This catches badly shaped orders and idle foxes before they cost a night
   (F17, F18, F19).
9. **Calibrate every model judge with planted known answers** before its verdicts count. This fixes the rubber-stamp coder
   (F11) and the self-contradicting picture judge (F16), and fills report cards with real numbers.
10. **Blameless postmortems for Sev 1 and Sev 2, plus a weekly town meeting** that checks whether actions were done and
    whether the same failure came back. Start with the F1 postmortem written in section 5.7.

---

## Sources

- [S1] Cemri, Pan, Yang et al., "Why Do Multi-Agent LLM Systems Fail?" (MAST taxonomy; 14 failure modes in 3 groups:
  system design, inter-agent misalignment, task verification). arXiv 2503.13657: https://arxiv.org/abs/2503.13657v3
- [S2] Google, Site Reliability Engineering, ch. 6 "Monitoring Distributed Systems" (four golden signals; symptoms versus
  causes): https://sre.google/sre-book/monitoring-distributed-systems/
- [S3] Healthchecks.io: dead man's switch monitoring with period and grace time: https://healthchecks.io and docs on
  configuring checks, e.g. https://healthchecks.sre.cfainstitute.org/docs/configuring_checks/ (an instance of the open
  source docs); source: https://github.com/healthchecks/healthchecks
- [S4] Temporal, activity timeouts, heartbeat timeout and retry policies:
  https://docs.temporal.io/evaluate/development-production-features/failure-detection and
  https://temporal.io/blog/activity-timeouts
- [S5] Anthropic, "Building effective agents" (orchestrator-workers, evaluator-optimizer, start simple):
  https://www.anthropic.com/engineering/building-effective-agents
- [S6] Kanban flow metrics: lead time, cycle time, throughput, WIP, Little's Law. ProKanban, "The Kanban Pocket Guide,
  ch. 6: The Basic Metrics of Flow": https://prokanban.org/blog/https-prokanban-org-blog-the-kanban-pocket-guide-chapter-6-the-basic-metrics-of-flow
- [S7] METR, "Measuring AI Ability to Complete Long Tasks" (time horizons; reliability falls with task length):
  https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/
- [S8] Anthropic, "How we built our multi-agent research system" (orchestrator-worker; briefs need objective, output format,
  tools, boundaries; vague briefs caused duplicated work): https://www.anthropic.com/engineering/multi-agent-research-system
  ; the duplication example is summarised in LangChain's "How and when to build multi-agent systems":
  https://blog.langchain.com/how-and-when-to-build-multi-agent-systems
- [S9] Google, Site Reliability Engineering, ch. 15 "Postmortem Culture: Learning from Failure":
  https://sre.google/sre-book/postmortem-culture/ ; Workbook ch. 10: https://sre.google/workbook/postmortem-culture/
- [S10] Claude Code hooks reference (`Stop`, `SubagentStop`, `PostToolUse`): https://code.claude.com/docs/en/hooks
- [S11] Google Testing Blog, "Flaky Tests at Google and How We Mitigate Them" (about 16% of tests show some flakiness;
  reruns; quarantine): https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html ; and "Where do our
  flaky tests come from?": https://testing.googleblog.com/2017/04/where-do-our-flaky-tests-come-from.html
- [S12] Google, Site Reliability Engineering, Part II and ch. 3 "Embracing Risk" (error budgets):
  https://sre.google/sre-book/part-II-principles/ ; Workbook "Implementing SLOs": https://sre.google/workbook/implementing-slos/
- [S13] Work item age and cumulative flow diagrams (Vacanti, Actionable Agile Metrics for Predictability): Scrum.org on the
  work item aging metric: https://www.scrum.org/resources/blog/detecting-flow-issues-using-predictive-cycle-time-charts-origin-kanbanflow-work-item-aging-metric
  ; ProKanban on CFDs: https://www.prokanban.org/blog/cumulative-flow-diagrams-cutting-through-the-colourful-clutter
- [S14] LangChain / LangGraph human-in-the-loop (interrupt, approve / edit / reject, resume from a checkpoint):
  https://docs.langchain.com/oss/python/langgraph/add-human-in-the-loop
- [S15] PagerDuty Incident Response docs, severity levels and incident commander:
  https://response.pagerduty.com/before/severity_levels/ and https://response.pagerduty.com/during/during_an_incident/
- [S16] DORA four keys (deploy frequency, lead time, change failure rate, time to restore), summarised by Dynatrace:
  https://www.dynatrace.com/knowledge-base/doras-four-keys/ (benchmarks vary across sources; the 0-15% change failure band
  is the most consistent)
- [S17] Lean Enterprise Institute lexicon, andon: https://www.lean.org/lexicon-terms/andon/ ; Toyota UK, the andon cord:
  https://mag.toyota.co.uk/toyota-manufacturing-25-objects-andon-cord
- [S18] Langfuse evaluation concepts (scores on traces, observations, sessions; LLM-as-a-judge):
  https://langfuse.com/docs/evaluation/core-concepts
- [S19] OpenTelemetry GenAI semantic conventions (`invoke_agent`, `execute_tool`; still in development status). Summary:
  https://www.dash0.com/knowledge/opentelemetry-genai-semantic-conventions-explained ; already noted in
  games/works/SOURCES.md

**Repo files used (branch game/micro-precinct, worktree micro-precinct):** games/works/ATLAS.md, games/works/LEDGER.md,
games/works/ledger.jsonl, games/works/SOURCES.md, games/START_HERE.md, games/TOWN_MACHINES.md,
games/HOW_TO_SEND_WORK_TO_PATCHTOWN.md, games/STANDING_ORDERS.md, games/BUDGET_LEDGER.md, games/MEGA_REVIEW_16NOV.md,
games/orders/*.md, games/orders/inputs/mega-1-brief.md, games/orders/results/2026-11-15-power1-economy1b-look1.md,
games/base-camp/STRESS_RESULTS.md, and the home town's wall sketch (PatchTown Wall, 16 Nov 16:35).

**Caveats on sources:** several outside facts were confirmed from search summaries and secondary pages rather than full
primary text (MAST's full list of 14 modes, the exact SRE chapter wording, PagerDuty's full severity table, DORA
benchmarks). The PatchTown numbers are read from the repo as it stands on 16 Nov; home town figures are as pasted by
Harry and may be out of date.
