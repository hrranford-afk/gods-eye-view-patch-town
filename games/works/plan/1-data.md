# PatchTown Works: data honesty and instrumentation plan

Planner 1 of 5. Lens: **data honesty and instrumentation.**
Written 16 Nov 2026 from the repo on branch `game/micro-precinct` (worktree `micro-precinct`), read as data:
`games/works/ATLAS.md`, `mockup.html`, `index.html`, `ledger.jsonl` (90 lines), `LEDGER.md`, `SOURCES.md`,
`games/START_HERE.md`, `TOWN_MACHINES.md`, `HOW_TO_SEND_WORK_TO_PATCHTOWN.md`, `STANDING_ORDERS.md`,
`orders/results/2026-11-15-power1-economy1b-look1.md`, `orders/report-1.md`, `orders/measure-1.md`,
`MEGA_REVIEW_16NOV.md`, `.github/workflows/ci.yml`, and the home town's own wall sketch (PatchTown Wall, 16:35, 16 Nov).

Nothing in the repo was changed. Nothing was committed.

---

## 0. The short version

The atlas has the right rule ("if it can't be measured, it isn't shown") but today the town does not yet keep it.
Almost everything the town shows comes from lines that the foreman typed by hand, often after the fact, with round
times, no IDs and no proof. The page then treats a typed line the same as a machine measurement.

The fix is not more buildings. It is five things, in this order:

1. **Every sign says how it knows.** Each event carries a source and a trust level (measured, recorded, typed, sample),
   and an "as of" time. The town draws them differently. Stale data fades into fog instead of staying bright.
2. **A proper ledger.** Every event gets an ID. A hire, its steps and its result share one job ID. Every start has a
   matching end with an outcome (done, abandoned, recovered, failed). Corrections are new lines, never edits.
3. **Machines write the facts, not the foreman.** A test runner wrapper writes test lines from the exit code. Claude
   Code hooks write hire, start, end and commit lines. Subagent completion stats (tokens, tool uses, minutes) go on
   the end line. Hand-typed lines stay allowed, but they are marked "typed" and never glow brightest.
4. **One snapshot instead of many viewers polling GitHub.** The public page currently asks GitHub's API directly from
   every viewer, unauthenticated (60 calls an hour per home network), and uses the Events feed, which GitHub says can be
   30 seconds to 6 hours late. A small snapshot file, built on a schedule, is fresher, cheaper and checkable.
5. **A truth audit.** A script that compares the town to GitHub, GitHub Pages and the run reports every day, plus a fire
   drill that proves the stall alarm fires. The town shows its own truth score.

---

## 1. What "measured" means here (an operational test)

A sign may be shown only if it passes all four:

| Test | Question | Example pass | Example fail |
|---|---|---|---|
| **Source** | Can we name the file, API or hook that produced the number? | `test` line written by the runner from exit code 0 and "43/43" | "about 900 words in about 10 min" typed from memory |
| **Time** | Does it carry the time it was true ("as of"), separate from when it was written? | disk 35 GB as of 16:35 | a lamp still green two days later with no date |
| **Writer** | Do we know which process wrote it, and was that process in a position to know? | a hook on the machine where the commit happened | the foreman writing "builder finished" for a builder it could not see |
| **Check** | Can an independent source confirm or contradict it later? | commit SHA exists on GitHub on that branch | "the train marked them done" with no check of the pictures |

A sign that passes Source and Time but not Check is shown as **reported** (dimmer). A sign with no source is not shown,
or is shown only as **fog** ("we don't know").

Four trust levels, used everywhere in this plan:

| Level | Meaning | Who can produce it | How the town draws it |
|---|---|---|---|
| **measured** | Written by a program at the moment it happened, from a machine signal (exit code, API, hook) | runner, hooks, snapshot job, GitHub | full colour, may glow |
| **reported** | Written by an AI or a run report about its own work, with numbers, close to the time | foreman, builders, the home town's run report | full colour, no glow until checked |
| **typed** | Written by hand after the fact, times rounded, or reconstructed | foreman catching up, Harry | pale, dotted outline, "typed" on the card |
| **sample** | Example values for layout only | page defaults | grey with the word SAMPLE, never animated |

Rule from the atlas, made concrete: **only measured AND checked work glows brightest.** This is how "talk counted as
work" is kept out (the town's own verdict: "it shows talk better than finished work").

---

## 2. What the data looks like today (an honest audit of v1)

### 2.1 The ledger (`games/works/ledger.jsonl`, 90 lines, 15 Nov 07:53 to 16 Nov 18:31 UTC)

| Count | Value |
|---|---|
| Lines | 90 |
| Kinds | commit 34, test 15, deploy 11, start 6, hire 6, order 5, end 4, win 4, step 3, fix 2. **result 0, fail 0, download 0** |
| Writers (`who`) | foreman 44, town 15, builder:depth 10, builder:mac 9, builder:snap 5, builder:fixer 3, builder:couch 2, harry 1, builder:works 1 |
| Lines with a time ending in `:00Z` | 41 of 90 (45%). These are almost certainly typed afterwards with a rounded minute. |
| IDs | none. No line can be referred to by another line. |

Specific honesty problems found in the 90 lines:

| # | Problem | Evidence in the ledger | What the town shows wrongly |
|---|---|---|---|
| L1 | **No `result` lines at all.** Orders never "come back". | 5 orders (mega-1, scan-1, report-1, keep-1, mega-review-1), 0 results, yet results for 15 Nov arrived in `orders/results/` | Wagons sit on the bridge and then vanish after 2 days because of a time cut-off in `computeState`, not because work came back. Survivorship: the bridge looks clear when it is not. |
| L2 | **A stall recorded as an `end`.** | 16 Nov 12:19 `end` for `game/bc-mac`, written by the foreman: "Found the build 29 builder stopped since 16:27 yesterday... picked up from lost property" | Any count of "builders finished" counts an abandoned builder as finished. The end needs an outcome (`abandoned`, detected late by 20 h). |
| L3 | **Branch used as the job key, but two jobs share a branch.** | `game/bc-mac` hired 15 Nov 14:25 and again 16 Nov 15:50 (fixer); `game/bc-depth` hired 12:25 and again 18:02 | `lostProperty()` pairs end to start by `ref`; a second job's end can close the first job's start, hiding a stall. |
| L4 | **Hires without starts, starts without ends.** | 6 hires, 6 starts, 4 ends; the 16:40 hire (researcher) has no `ref`; the 18:02 hire has no start; the depth builder's 12:26 start has no end | Lost property can't tell "still working" from "never started" from "finished but nobody wrote it". |
| L5 | **Deploys counted twice.** | Build 29 preview: 12:34:00 (typed, ref `base-camp-next/`) and 12:34:21 (ref `ae8c6be`). Check page: 15:23:00 and 15:23:26 | The shop lights up twice; "deploys today" is inflated. Dedupe works only when `ref` is a SHA. |
| L6 | **Deployed before tests finished, shown as a plain deploy.** | 12:34:21 "full test run still in progress" | The shop window glows for a build that had not passed the yard. |
| L7 | **Test lamps keyed by suite name only, not by build.** | 18:00 `roomfix fail` (build 30), 18:16 `roomfix pass` (build 29, side-by-side check) | The later pass on the OLD build turns the lamp green and hides the NEW build's failure. This is the single most dangerous lie in v1. |
| L8 | **Many suites folded into one lamp.** | `base-camp-all` = 12 suites in one `pass` line | A real failure in one of 12 can't be seen; one lamp = twelve claims. |
| L9 | **Reruns hidden inside "pass".** | `fun 18/18 (on rerun)`, status `pass` | Flakiness disappears from the weather. A pass on rerun should be `flaky`, with `tries:2`. |
| L10 | **Lamps fall off after 2 days.** | `computeState` keeps tests only 2 days | A suite that stopped being run looks the same as a suite that never failed. Absence is shown as health. |
| L11 | **`fail` kind never used; failures written as tests or prose.** | 0 `fail` lines; the 15 Nov 16:27 machine restart has no event at all | No power cut ever appears. The atlas's power cut row has no data. |
| L12 | **All test lines are typed by the foreman, not by the runner.** | `who:"town"`, round times; CI (`.github/workflows/ci.yml`) runs only on `main` pushes and pull requests, so no game-branch test ever runs in GitHub Actions | The inspection yard is entirely self-reported. The `/actions/runs` feed the page reads has nothing to do with the games. |
| L13 | **Commit lines duplicate GitHub.** | 34 `commit` lines, most also in GitHub | Fine when the SHA matches (deduped). When a typed commit line has no SHA, the parcel is counted twice. |
| L14 | **`who` for GitHub-only commits is guessed from the branch name.** | `fromCommit()` turns `game/bc-mac` into `builder:mac` | A foreman merge commit on a builder branch is credited to a builder. |

### 2.2 The GitHub feed (in `index.html`)

| What the page does | Problem | Honest alternative |
|---|---|---|
| Polls `/events` every 2 min, `/actions/runs`, `/deployments`, `/branches` every 10 min, and `/commits?sha=` for up to 10 branches, from each viewer's browser, **unauthenticated** | Unauthenticated limit is **60 requests per hour per IP address**. The wall projector, Harry's iPad and his Mac share one home IP. Worst case the page wants about 30 + 18 + up to 60 commit calls an hour. When it runs out, the town silently freezes on cached data. GitHub says a 304 only spares the limit when the request is authorised, so unauthenticated 304s may still count. | One snapshot file built server-side with the Actions `GITHUB_TOKEN` (1,000 requests per hour per repo), served next to the page on GitHub Pages. Viewers fetch one file; no API limit applies to them. |
| Uses the **Events API** to see which branches are active | GitHub documents event latency of **30 seconds to 6 hours**, "not built to serve real-time use cases". | Use `/branches` (current heads) plus `/commits` per changed head. Events only as a hint. |
| `/deployments` | This repo deploys by pushing to `gh-pages`, not through the Deployments API, so this list is likely empty or unrelated | Treat the `gh-pages` branch's commits as the deploy log; verify the deployed path exists on Pages. |
| Shows "rate limited" only in a status object | A frozen town looks alive. | Show the age of the newest data on the screen ("GitHub: 14 min old"). After 30 min, fog rolls in over the post office. |

### 2.3 The home town's wall (`WALL` in `index.html`)

- Hard-coded sample values "as of 16:35, 16 Nov", correctly labelled SAMPLE. Good.
- `town-report.json` is a slot with no schema, no version and no "as of" check: any file with `machines` and `chips`
  replaces the sample and sets `sample:false`, even if it is a week old.
- Several wall numbers have **no written definition**: "2 things rebuilt that already existed" (who judged?),
  "3 hand touches per order" (counted how?), "3 of 3 machines given work". They are judgements, not measurements, until
  defined.
- "Six nice toy rooms. None shows what its line asked for. **The train marked them done.**" This is the clearest example
  of self-reported success being wrong. The town's own run reports must separate *finished* from *passed a check*.

### 2.4 Other feeds named in the atlas

| Feed | State today |
|---|---|
| Home town run reports | Standing order since 16 Nov. Arrives as a markdown paste through Harry, hours late. Not machine-readable yet. The 15 Nov results file has honest counts (asked/answered/empty) but no per-stage times. |
| iPad field reports | Order report-1 sent 16 Nov; not running. Will hold numbers and up to 6 camera pictures. Pictures must never reach the public town. |
| Claude Code hooks | Not switched on (`LEDGER.md`, `SOURCES.md`). |
| OpenTelemetry | Not switched on. Note: repository `.claude/settings.json` cannot enable telemetry or choose its destination; it is a machine or managed setting. |
| Subagent completion stats | The foreman receives tokens, tool uses and duration when a builder finishes, but none of it is written down. |

---

## 3. The source catalogue

Every source the town may use, how fresh it can be, how far to trust it, and its personal-data risk.

| ID | Source | How it is reached | Best freshness | Default trust | Personal-data risk | Notes |
|---|---|---|---|---|---|---|
| S1 | **Ledger** (`ledger.jsonl`, branch `game/micro-precinct`) | raw.githubusercontent.com (cached ~5 min), fallback bundled copy | 5 min after push | depends on `src` of each line | Medium: free text in `what`; the repo is **public** | The backbone. Must be linted. |
| S2 | **GitHub git data** (branches, commits, merges, `gh-pages`) | REST API; better via snapshot | 1 to 10 min | measured | Low; author emails must be dropped (page already drops them) | The check for every commit and deploy claim. |
| S3 | **GitHub Events** | REST API | 30 s to 6 h | measured but late | Low | Hint only. Never used to decide "stalled". |
| S4 | **GitHub Actions runs** | REST API | minutes | measured | Low | Today only CI on `main`/PRs. Useless for game branches unless game tests run there. |
| S5 | **GitHub Pages (live site)** | plain fetch of the live pages from the same origin | seconds | measured | None | The works page lives on the same Pages site, so it can fetch `base-camp/` etc. directly: an honest street-light check. |
| S6 | **Test runner wrapper** (new) | writes ledger lines from exit code and parsed counts | instant | measured | Low (strip paths) | Replaces hand-typed test lines. |
| S7 | **Claude Code hooks** (new) | `SubagentStart`, `SubagentStop`, `SessionStart`, `SessionEnd`, `Stop`, `StopFailure`, `PostToolUse` (Bash `git commit`/`git push`), `PostToolUseFailure` | instant (written locally), durable at next push | measured | Medium: hook input includes `session_id`, `transcript_path`, `cwd`, tool input. Keep only what is listed in section 6. | Common fields: `session_id`, `prompt_id`, `transcript_path`, `cwd`, `hook_event_name`; subagents add `agent_id`, `agent_type`; `SubagentStop` adds `last_assistant_message`. Hooks can run `async: true` so they never slow the work. `SessionEnd` hooks share a 1.5 s budget, so write a local line only. |
| S8 | **Subagent completion stats** | the foreman copies them from the Agent tool's result onto the `end` line | at end of job | reported (numbers come from the harness, the copy is by the foreman) | Low | tokens, tool uses, duration. The best cost signal available without OTel. |
| S9 | **Claude Code OpenTelemetry** (optional, later) | OTLP exporter to a collector Harry runs | seconds | measured | **High**: `user.email` is always included when available and cannot be switched off; account UUID and session ID on by default | Metrics: `claude_code.session.count`, `token.usage`, `cost.usage`, `commit.count`, `lines_of_code.count`, `active_time.total`. Events: `user_prompt` (text redacted by default), `tool_result`, `api_request`, `api_error`. Subagent `agent_id`/`parent_agent_id`. Only through a local collector that strips identity. Not needed for v2. |
| S10 | **Home town run reports** | markdown + (proposed) a `town-report.json` block, pasted by Harry, committed by the foreman | hours (depends on Harry pasting) | reported | Low if numbers only | Show the "as of" big. |
| S11 | **Home town's own wall** | same as S10 | hours | reported / judged | Low | Judged signs (white smoke) need a named judge. |
| S12 | **Order results files** (`games/orders/results/`) | committed | hours to a day | reported | Low (words untouched, credited to residents, not people) | Source of `result` lines and the "who is speaking" counts. |
| S13 | **iPad field reports** (report-1, later) | Mini keeps raw; nightly numbers-only summary pasted | a day | measured on device, summarised by the town | **High** if raw: camera pictures, play times show when the household is home | Public town gets **daily totals only, no times, no pictures**. |
| S14 | **Reviews** (mega review, mega-review-1, cold looks) | committed markdown | days | judged | Low | Feed report cards and the market square, marked "judged". |
| S15 | **Harry's own words** | foreman quotes into the ledger | same day | typed | Medium | Allowed as `harry` lines; never anything about his home, family, places. |
| S16 | **HANDOVER "not proven" lists** | committed markdown; propose a fenced machine-readable list | days | reported | Low | The fog. |

---

## 4. Every building, sign and alarm: what feeds it, how it can lie, and the honest signal

Status column: **NOW** = honest data exists today; **v2** = needs the instrumentation in section 8; **LATER** = needs
a source we don't have; **NO** = cannot be measured honestly, do not build (or show as a "judged" card only).

### 4.1 Geography

| Sign | Exact data | Source today | Fresh | How it can lie | Honest signal | Status |
|---|---|---|---|---|---|---|
| Two towns and a river | fixed | none needed | n/a | none | fixed layout | NOW |
| **The bridge** (stuck work) | open orders: `order` with no `result` | ledger (orders only) | hours | L1: no results ever written, so wagons vanish by timeout. Late pastes look like slow machines. | Order lifecycle `order → quote → go → stage* → result`, each with `order` ID. Show wagon age in hours; "waiting for Harry to paste" as its own state (the result exists at home but hasn't crossed). | v2 |
| **Toll booth** (Harry's yes) | open `ask` lines in category money/security/delete/download with no `answer` | none | same day | Questions asked in chat never reach the ledger; a yes from another chat counted as a yes (the town's rule says it does not count) | `ask` and `answer` kinds; `answer` must name where Harry said it (`said_in: town-chat`). A download line must link to its approving `answer` ID. | v2 |
| **Customs house** (nothing personal crosses) | result of a privacy lint over everything crossing (ledger, run reports, results) | the privacy checks in some test suites (not named) | per run | "Privacy checked" when only one game's suite checks it; pass on an empty input | A named `privacy` suite run by the runner over the ledger, `town-report.json` and any summary file, with counts of lines checked and lines blocked. Zero lines checked = grey, not green. | v2 |
| **Districts** (projects) | branch name prefix → project (`bc-` Base Camp, `bb-` B&B, …) | GitHub branches | snapshot | Branch names are inconsistent; `micro-precinct` holds many projects | A small mapping file `games/works/districts.json` (prefix → district). Unknown prefixes go to "unsorted", never guessed. | NOW (with mapping) |
| **Hills** (hard ground) | per area: fix lines, failed test runs, reruns, reverted commits | commits and fixes per area | daily | Commit count measures typing, not difficulty; one builder commits often | Use **failures and reruns per suite** and **fix lines with open→close time**, not commits. Show the number on hover. | v2 |
| **Fog** (never tried on a real device) | count of open items in the "not proven on device" lists | HANDOVER prose | days | Prose lists go stale; items proven but never ticked off | A fenced block in HANDOVER (`<!-- notproven -->` list with IDs); a `win` or field-report summary that proves an item closes it by ID. Fog thins only on proof. | v2 |
| **The harbour** (outside services) | list of external hosts the games load (CDNs), vendored libraries, model downloads | `THIRD_PARTY.md` (hand) | per commit | A dependency added without a line | Build the list by scanning the deployed HTML for external `src`/`href` hosts (measured) and compare to `THIRD_PARTY.md`. Mismatch = a ship with no papers. | v2 |
| **Ships arriving** | `download` lines with name, size, licence, approval ID | none (0 download lines) | instant | Downloads not logged; licence copied wrong | `download` requires `licence`, `bytes`, `approved_by` (an `answer` ID). Truth audit compares vendored files and lockfile changes to download lines. | v2 |

### 4.2 Infrastructure

| Sign | Exact data | Source today | Fresh | How it can lie | Honest signal | Status |
|---|---|---|---|---|---|---|
| **Power station** (compute) | cloud: builder minutes and tokens per job (S8); home: busy minutes per machine (S10) | none | end of job / per report | Wall-clock minutes include waiting on Harry; tokens without cache split overstate cost; home "busy" from a report written by the busy machine | Cloud: `duration_ms`, `tokens`, `tool_uses` on each `end`. Home: per-stage start/end and per-machine busy % from the run report. Show both as "minutes of work", not a single "power" number. | v2 |
| **Power cut** | a session or builder that stopped without an end; a usage limit hit; a machine restart | none (L11) | instant for hooks; dead-man for silence | Recorded only when someone notices (20 h late on 15 Nov) | (a) `StopFailure` hook → `fail` with `cause:"api"`/`"limit"`; (b) `SessionStart` with `source:"startup"` while jobs are open → `restart` line; (c) **silence**: no `beat` from an open job for 45 min (see section 7). The page computes (c) itself, so it works even when nobody is alive to write. | v2 |
| **Battery gauge** (budget left today) | remaining usage and reset time | **no API exposes this** | n/a | Any gauge would be a guess | Do not draw a gauge. Show **"last limit hit: 15 Nov, reset 19:00"** from `limit` lines, and tokens used today from `end` lines. Gauge only if a real remaining number ever becomes readable. | NO (gauge) / v2 (last hit) |
| **Reservoir** (disk) | free GB on the Mini, floor 30 GB | wall sample (35 GB) | per report | Stale number looks current; a report from a different disk | `town-report.json` `disk_free_gb` with `as_of`; water level greys after 24 h; show the floor line. | v2 |
| **Roads** (paths work travels) | step durations: order→quote→go→result; hire→start→first commit→end | ledger, untimed | per event | Typed round times make paths look tidy | Only measured `t` values used for durations; typed lines excluded from timing stats. | v2 |
| **Traffic jam** (queue wait) | minutes waiting in queue per stage | run report (standing order), not machine-readable yet | per report | Waiting for Harry's paste counted as machine queue | `stage` lines with `queued_at`, `started_at`, `ended_at` from the home queue. Bridge wait (paste delay) is drawn on the bridge, not on the Dell's road. | v2 |
| **Car park** (backlog) | jobs waiting to start, per machine | wall "Waiting: ..." prose | per report | Snapshot age hidden | `queue_len` per machine with `as_of`. Cars grey out with age. | v2 |
| **Railway** (nightly batch) | almanac nights: scheduled vs arrived, seats asked/answered/empty | `ALMANAC_LOG.md` (standing order 1) | daily | A night that didn't run leaves no line (survivorship) | Expect one line per night; a missing night is drawn as a train that didn't arrive. Stop rule (2 nights < 2 answers) shown as a red signal. | v2 |
| **Road works** (broken build) | branches whose latest runner `test` for their head SHA is `fail` | typed test lines | per run | L7: pass on another build hides fail | Lamp keyed by **(suite, branch, SHA)**; a branch's road is closed if any suite's latest result *for its head SHA* failed; "not run on this SHA" is amber-grey, not green. | v2 |
| **Sorting office** (merges, conflicts) | merge commits (GitHub, measured); conflicts (only seen at merge time) | GitHub merges | snapshot | Conflicts leave no trace once resolved | `PostToolUse` hook on Bash `git merge` / `git rebase`: exit code non-zero or "CONFLICT" in output → `merge` line with `conflicts:n`. Without the hook, show merges only and say "conflicts not measured". | v2 |
| **Telephone exchange** (AI to AI messages) | count of briefs and reports per job, their lengths | none | instant | Counting messages rewards chatter (talk as work) | `SubagentStart` (brief out) and `SubagentStop` (report back) counts and character lengths only, never content. Never used as a productivity score. | v2 |
| **Street lights** (health) | HTTP status and load of each live page; AR-ready flag from `check.html`-style probe | none | seconds | Lights on because a cached copy loads | The works page (same origin on Pages) fetches each live path with `cache: 'no-store'` every 10 min and checks status 200 and a build marker string; the snapshot job does the same server-side. Dark = failed or build marker mismatch. | NOW (cheap) |

### 4.3 Weather

| Weather | Exact data | How it can lie | Honest signal | Status |
|---|---|---|---|---|
| Sunshine | all suites green **for the live build's SHA** | L7, L10: green from old builds or vanished lamps | Sunshine only if every suite in the expected list ran on the live SHA in the last 24 h and passed first try | v2 |
| Clouds | any suite flaky (pass on rerun) | L9: reruns written as pass | `tries > 1` and final pass → flaky. Count flaky suites. | v2 |
| Storm | failures per hour ≥ 2 across suites | failures not written as lines; one lamp = 12 suites (L8) | runner writes every fail; rate computed over measured lines only | v2 |
| Rainbow | a real-device win | a robot win called a device win | `win` must carry `evidence` = `device` (Harry's report or field-report summary ID). Robot wins are a star, not a rainbow. | NOW (one line exists) |
| Fog | untested on a real iPad | see Geography | see Geography | v2 |
| (new) **Haze** | the town's own data is stale | — | If the newest measured line is older than the expected rhythm, the whole sky goes hazy with "last heard 3 h ago". Silence must never look like sunshine. | v2 |

### 4.4 Civic buildings

| Building | Exact data | Source today | How it can lie | Honest signal | Status |
|---|---|---|---|---|---|
| **Town hall** | open `ask` lines waiting on Harry, with age and category | START_HERE "Waiting on Harry" prose | Questions answered in chat but never closed; questions never asked in writing | `ask`/`answer` pairs with IDs. Age in days on each motion. | v2 |
| **Courthouse** | rule checks: no deaths, no brands, licences, privacy; count of checks run and passed | some suites | Pass with zero checks; rules promised but no test | Each rule maps to a named suite; show "checked on SHA x, n checks". A rule with no suite shows as an empty bench. | v2 |
| **Hospital** | open bugs and how long each has been in | 2 `fix` lines, no bug IDs | A fix line without the bug it closes; bugs never opened in the ledger | `bug` (open, with ID) and `fix` (closes ID, with SHA and a test that now passes). Ambulance = bug marked urgent. Time in hospital = fix t − bug t, measured only. | v2 |
| **Fire station** | kept builds available for rollback (`base-camp/b26/`, `b27/` …) | GitHub Pages tree | Folder exists but broken | Snapshot lists `gh-pages` folders matching `b\d+/`; street-light probe checks each loads. | NOW (tree) / v2 (probe) |
| **Museum** | every shipped build with its picture | `gh-pages` history | Pictures from a robot, not the live page | Each exhibit = a `gh-pages` commit + the shot file named in the deploy line; label shots "robot shot" vs "device photo". | v2 |
| **Archive** | git history, START_HERE, HANDOVER | git | none significant | counts of commits and notes; links | NOW |
| **Lost property office** | open jobs with no `end` and no life sign for N minutes | v1: `start` with no `end` for 2 h, by `ref` | L2, L3, L4 (pairing by branch, stall recorded as end) | Pair by `job` ID; life signs are `beat`, `commit`, `test` with the same `job`; alarm after 45 min of silence; when a stalled job is picked up, write `end outcome:"abandoned"` and a new job with `recovers: <job>`. | v2 |
| **Market square** | ideas offered (sparks, residents' ideas) and ideas used | order results (prose) | Counting ideas offered as output; ideas "used" by assertion | `idea` count per result (from the result file) and `credit` lines that link an idea ID to the commit that used it. | v2 |
| **Noticeboard** | orders and requests | `games/orders/*.md` | Files that never went out | Each order file + its `order` line (sent) + `quote`/`go`. Unsent orders shown pinned but not on a wagon. | NOW (files) |
| **Town crier** | wins and fails, read out | ledger | Reads only wins (survivorship) | Crier reads wins AND fails AND stalls, in time order. Equal airtime rule: if there was a fail today, it is read. | v2 |
| **Theatre / arcade** | play counts | none; needs a server | Any number would be invented | Not shown until Harry approves a counting service (money/security). Field-report daily totals (Harry's own plays) can be shown as "test plays", clearly labelled. | NO / LATER |
| **Bank** | cost | none | Showing £ from guesses; home electricity unknown | Show **tokens and builder-minutes** per job and per day (S8). £ only from bills Harry adds by hand (typed, labelled). No home power cost unless measured with a plug meter. | v2 (tokens) / LATER (£) |

### 4.5 Homes and learning

| Sign | Exact data | Source today | How it can lie | Honest signal | Status |
|---|---|---|---|---|---|
| A house per AI | roster: name, machine, size, kind | `TOWN_MACHINES.md`, `HOW_TO_SEND...` (two lists disagree: 12 vs 13 tiny experts; 8 vs 10 Dell residents) | Two rosters disagree | One roster file from the home town, `roster.json`, with `as_of`. Houses not on it are not drawn. | v2 |
| House size | parameters (7B … 35B) | roster | none | roster | v2 |
| **Lights on / asleep** | loaded in memory now | wall (sample) | A snapshot hours old shows "lights on" for a model long unloaded | Only with `as_of` ≤ 1 h; otherwise curtains drawn grey ("unknown"). Realistically the home town can only report at paste time, so mostly "unknown, last seen …". | LATER |
| Garden / weed bed | strengths and weaknesses | town notes (prose) | Opinions as facts | Show as **judged**, with who judged and when. Derive "weeds" from measured empties/broken by task type. | v2 (judged) |
| **Diplomas** | trained/tuned on what, with licence | training records (home) | Licence assumed | One record per expert: data source name, licence, date, hash. No record, no diploma. | LATER |
| **Report card** | blind test scores | mega-review-1 (pending) | Unblinded tests; tiny samples (10 prompts) shown as a grade | Show raw "7 of 10 kept, judged by Harry, blind" with sample size; no letter grades. | LATER |
| **Trophies** | ideas used in a game, credited | `by` credits in the games | Credit by assertion | `credit` line: idea ID → commit SHA → file. Verified by grep for the idea's text or ID in that commit. | v2 |
| **Empty letterbox** | empty/broken answers per resident | results file honest counts | Empties re-asked and then counted as answers | Per resident: asked, answered, empty, broken, timed out, never got a turn (all six, from the results). | v2 |
| **Who is speaking** (the town's sign) | per resident status: answering / empty / silent / not proven | wall | Old statuses look current | Per-resident status with the order ID it came from and its date. | v2 |
| **University / exam hall** | training runs and their before/after blind scores | home | "Graduated" because training finished, not because it passed | `train` lines: start, end, exam result vs baseline. Graduate only on an exam pass. | LATER |
| Workshops' builders | cloud helpers: brief in, report out | hooks | A builder that did nothing but talk | Builder glows only if its job produced a commit that exists on GitHub or a measured test result. Report-only jobs (research) show as "reports delivered", which is fine, but not as built work. | v2 |

### 4.6 Signs the home town invented

| Sign | Exact data | How it can lie | Honest signal | Status |
|---|---|---|---|---|
| **Fox in the pond** (idle with work waiting) | machine `state:idle` AND `queue_len>0` in the same report, same `as_of` | Mixing an idle reading from 16:35 with a queue from 14:00 | Both values from one report and one `as_of`; fox only when the report is < 2 h old. Count fox-minutes if the home queue logs state changes. | v2 |
| **White smoke** (rebuilt something that existed) | a judgement | It is a judgement, not a measurement | Show only with the judge's name and the two things (existing path and new path). Possibly measurable later: new file whose content is ≥ 80% similar to an existing file (a duplicate check in the audit). | v2 (judged) |
| **Parcels** (delivered work, tested) | per order result: items passed / failed / borderline / never arrived | "The train marked them done" | Parcel colour comes from a check, not from "finished". Unchecked parcels are brown paper. | v2 |
| "Shows talk better than finished work" | — | — | The trust-level drawing in section 1 is the answer. | v2 |

---

## 5. The ledger, version 2

### 5.1 Principles

1. **Append-only.** Never edit or delete a line. A mistake is fixed by a `correct` line that names the bad line's ID.
2. **Every line has an ID**, and links to its job, its parent and its order.
3. **Two times:** `t` = when it happened; `t_rec` = when it was written. Lateness becomes measurable.
4. **Every line says where it came from** (`src`) and how far to trust it (`conf`).
5. **Pairs:** every `start` has an `end` with an `outcome`. Silence between them is detectable.
6. **Numbers in fields, not in prose.** `what` is a caption for people; the town never parses it.
7. **Public by default.** The repo is public, so the ledger is world-readable. Nothing goes in it that we would not
   print on the home wall for strangers.

### 5.2 The envelope (fields on every line)

| Field | Required | Type | Meaning | Example |
|---|---|---|---|---|
| `v` | yes | int | schema version | `2` |
| `id` | yes | string | unique ID: UTC compact time + writer tag + 4 random hex | `20261116T182000Z-hk-3f9a` |
| `t` | yes | ISO UTC | when it happened | `2026-11-16T18:20:00Z` |
| `t_rec` | yes | ISO UTC | when the line was written | `2026-11-16T18:20:02Z` |
| `kind` | yes | enum (5.3) | what kind of event | `start` |
| `who` | yes | enum pattern | `foreman`, `builder:<name>`, `runner`, `town`, `harry`, `snapshot` | `builder:depth` |
| `src` | yes | enum | `hook`, `runner`, `snapshot`, `agent`, `town-report`, `results`, `hand` | `hook` |
| `conf` | yes | enum | `measured`, `reported`, `typed`, `sample` (derived from `src` by the writer tool; `hand` is always `typed`) | `measured` |
| `where` | yes | enum pattern | building key, `workshop:<branch>` or `home:<machine>` | `workshop:game/bc-depth` |
| `what` | yes | string ≤ 140 | plain caption; privacy-linted | `Depth builder starts` |
| `job` | when part of a job | string | the hire's job ID; every line a builder causes carries it | `job:20261116-depth-1` |
| `parent` | no | id | the line this one hangs off (step → start, result → order) | |
| `session` | no | string | short **salted hash** of the Claude Code `session_id` (8 hex). Never the raw ID. | `s:9c1e04ab` |
| `order` | for home work | string | order ID | `report-1` |
| `branch` | when known | string | git branch | `game/bc-depth` |
| `sha` | when known | 7–40 hex | commit the event is about | `9748c8f` |
| `n` | no | object | numbers, never strings: `{"pass":43,"total":43}` | |

### 5.3 Event kinds and their required extra fields

| Kind | Meaning | Required extra fields | Pairs with | Allowed writers (`src`) |
|---|---|---|---|---|
| `hire` | foreman hands a brief to a builder | `job`, `brief_chars` (length only), `agent_type` | `start` within 15 min | hook (`SubagentStart`), agent |
| `start` | a builder begins work | `job` | `end` | hook, agent |
| `beat` | heartbeat: still alive | `job` | — | hook (any tool use, throttled to 1 per 15 min per job), agent |
| `step` | a milestone inside a job (talk-level; never glows) | `job` | — | agent, hand |
| `end` | a job stopped | `job`, `outcome` ∈ `done`, `handed_back`, `failed`, `abandoned`, `cancelled`, `recovered`; optional `n.tokens`, `n.tool_uses`, `n.duration_ms`, `detected_late_min` | `start` | hook (`SubagentStop`), agent, hand |
| `commit` | a commit was made | `sha`, `branch`; `job` if a builder made it | — | hook (PostToolUse Bash `git commit`), snapshot |
| `push` | commits reached GitHub | `branch`, `sha` (new head) | — | hook (Bash `git push`), snapshot |
| `merge` | branches combined | `branch` (into), `from`, `sha`, `n.conflicts` | — | hook, snapshot |
| `test` | one suite ran once | `suite`, `sha`, `branch`, `status` ∈ `pass`,`fail`,`flaky`,`error`,`skipped`, `n.pass`, `n.total`, `n.tries`, `n.ms`, `runner` (`cloud`,`mini-webkit`,`mini-chromium`,`ci`), `log_hash` | — | runner only for `conf:measured`; hand allowed as `typed` |
| `deploy` | something went live | `path` (e.g. `base-camp/`), `sha` (gh-pages commit), `from_sha` (source commit), `tests_ok` (bool: every expected suite passed on `from_sha`) | `check` | hook, snapshot, agent |
| `check` | a live probe | `path`, `n.status` (HTTP), `build_marker_ok` (bool), `n.ms` | — | snapshot, page |
| `win` | real success | `evidence` ∈ `device`, `robot`, `review`; `evidence_ref` (ID of the report/line) | — | agent, harry |
| `fail` | something broke | `cause` ∈ `test`, `limit`, `api`, `restart`, `crash`, `network`, `other`; `ref` | — | hook (`StopFailure`, `PostToolUseFailure`), runner, agent |
| `restart` | a session or machine started fresh while jobs were open | `open_jobs` (list of job IDs) | — | hook (`SessionStart` source `startup`/`resume`) |
| `limit` | a usage limit was hit | `reset_at` if known | — | hook, agent |
| `order` | an order crossed the bridge | `order`, `file` (path), `needs_harry` (bool) | `quote`, `result` | agent |
| `quote` | home town's quote | `order`, per stage minutes | `go` | town-report |
| `go` | Harry said go | `order`, `said_in` | — | harry (recorded by agent quoting) |
| `stage` | one home stage, start or end | `order`, `stage`, `machine`, `model`, `phase` ∈ `queued`,`start`,`end`, `n.wait_min`, `n.run_min` | itself | town-report |
| `result` | an order came back | `order`, `file`, `n.asked`, `n.answered`, `n.empty`, `n.broken`, `n.timeout`, `n.no_turn`, `n.checked_pass`, `n.checked_fail` | `order` | results, agent |
| `ask` | a question for Harry | `ask_id`, `category` ∈ `money`,`security`,`delete`,`download`,`taste` | `answer` | agent |
| `answer` | Harry's answer | `ask_id`, `answer` ∈ `yes`,`no`,`later`, `said_in` ∈ `town-chat`,`game-chat` | — | harry (recorded by agent) |
| `download` | something came in from outside | `name`, `bytes`, `licence`, `approved_by` (answer ID) | — | agent, hook |
| `bug` / `fix` | a bug opened / closed | `bug_id`; for `fix`: `sha`, `suite` that proves it | each other | agent, runner |
| `idea` / `credit` | idea offered / idea used | `idea_id`, `by` (resident name); for `credit`: `sha`, `file` | each other | results, agent |
| `train` | a tiny expert trained | `expert`, `phase`, `exam` result vs baseline | itself | town-report |
| `correct` | fixes an earlier line | `corrects` (ID), `field`, `was`, `now`, `why` | — | any writer, for its own lines; foreman for any |
| `note` | free comment | — | — | anyone; never drawn as work |

### 5.4 IDs that link a hire to its steps to its result

```
hire     id=…-a1  job=job:20261116-depth-1
start    id=…-a2  job=job:20261116-depth-1  parent=…-a1
beat     id=…-a3  job=job:20261116-depth-1  parent=…-a2
commit   id=…-a4  job=job:20261116-depth-1  sha=26c1bc8 branch=game/bc-depth
test     id=…-a5  job=job:20261116-depth-1  sha=35d11c6 suite=depth status=pass n={pass:29,total:29,tries:1}
end      id=…-a6  job=job:20261116-depth-1  parent=…-a2 outcome=handed_back n={tokens:…,tool_uses:…,duration_ms:…}
deploy   id=…-a7  job=job:20261116-depth-1  from_sha=9748c8f path=base-camp-next/ tests_ok=true
check    id=…-a8  parent=…-a7  path=base-camp-next/ status=200 build_marker_ok=true
```

- The **job ID** is made once, at hire, by the foreman's tool (`job:<yyyymmdd>-<shortname>-<n>`), and passed into the
  builder's brief as one line ("Your job ID: job:20261116-depth-1. Put it in every ledger line."). The `SubagentStart`
  hook also records `agent_id`, so hook lines and agent lines can be joined even if the builder forgets.
- A **recovery** (picking up from lost property) is a new job: `hire … recovers=job:20261115-mac-1`, and the old job gets
  `end outcome=abandoned detected_late_min=1192`. Nothing is overwritten. Both the stall and the recovery stay visible.
- **Orders** use the order's own ID (`scan-1`) as the link from `order` → `quote` → `go` → `stage` → `result`.

### 5.5 Who may write what

| Writer | May write | May not write | Why |
|---|---|---|---|
| Test runner (`src:runner`) | `test`, `fail(cause:test)`, `fix` closure proof | anything else | Only the runner sees the real exit code |
| Hooks (`src:hook`) | `hire`, `start`, `beat`, `end`, `commit`, `push`, `merge`, `fail`, `restart`, `limit` | `win`, `answer`, `result` | Hooks see mechanics, not meaning |
| Snapshot job (`src:snapshot`) | `commit`, `push`, `deploy`, `check`, harbour list | `test` (unless CI really ran it) | It sees GitHub and Pages, not sessions |
| Foreman / builders (`src:agent`) | `step`, `order`, `ask`, `deploy`, `win`, `bug`, `fix`, `credit`, `correct`, `note`, and `end` when no hook did | `test` as measured; `answer` (only by quoting Harry) | Talk-level; trusted as `reported` |
| Results importer (`src:results` / `town-report`) | `quote`, `stage`, `result`, `idea`, `train` | git events | Home facts only |
| Harry (`src:hand`, `who:harry`) | `answer`, `go`, `win(evidence:device)`, `note` | — | His words, quoted |
| Anyone typing afterwards | anything, but always `conf:typed` | `conf:measured` | Honesty about memory |

Enforcement: the validator (step 1 in section 8) rejects a line whose `kind` is not allowed for its `src`, and any
`conf:measured` line whose `src` is `hand`.

### 5.6 Avoiding personal data (the ledger is public)

- **Allowed people words:** "Harry" only. No other names, no family, no friends' homes ("2 friends' homes" in the mega
  review's test plan must appear only as counts).
- **No places:** no town names, room names, addresses, coordinates, Wi-Fi names, IP addresses. Places' rounded
  locations never leave the iPad (Harry's 14 Nov rule) and must never appear here.
- **No times that reveal home life:** iPad play events go into the public ledger only as **daily totals** (plays, median
  lock seconds, errors), never individual play times. Home machine busy/idle is fine at the hour level.
- **No raw identifiers:** no `session_id`, `agent_id`, `transcript_path`, `cwd`, account UUID, email, tokens. Session
  becomes an 8-hex salted hash (salt kept out of the repo, e.g. in the session's environment), so sessions can be
  grouped without being traced back.
- **No content:** no prompts, no brief text, no assistant messages, no tool input/output. Only lengths and counts.
- **Paths:** repo-relative only. Strip `/home/...`, `/Users/...`, `/tmp/...`.
- **Lint** (in the validator and the page's existing `clean()`): email pattern, token patterns (`gh?_`, `sk-`), absolute
  paths, IPv4/IPv6, UK postcode pattern, `lat`/`lon` numbers, and a deny-list of known place and personal words kept
  **outside** the public repo (a hash list works: store SHA-256 of each deny word, compare hashes of each word in `what`).
- **Hooks must whitelist, not blacklist:** the hook script builds the line from named fields only; it never copies the
  hook's JSON input wholesale.

### 5.7 Where lines are written (concurrency and durability)

Problem: several builders on several branches and worktrees appending to one file on one branch will collide in git, and
a cloud container that is replaced (the 15 Nov restart) loses anything not pushed.

Plan:
1. **Local spool**: hooks and the runner append to `$CLAUDE_PROJECT_DIR/.works-spool/<yyyymmdd>.jsonl` (git-ignored),
   one machine-wide file with an `flock` around each append. Lines are small, so appends are atomic enough with a lock.
2. **Flush**: the foreman's `works_flush` moves spool lines into `games/works/ledger.jsonl` on `game/micro-precinct`,
   dedupes by `id`, sorts by `t`, validates, commits ("ledger: 14 lines") and pushes. Triggers: every foreman commit on
   `micro-precinct`, every `SubagentStop`, and a `beat` timer at most every 30 min.
3. **Durability is honest**: if the container dies, unflushed lines are lost, **and the page detects the silence**
   (no new `beat` for an open job) and raises lost property anyway. The alarm does not depend on the dead writer.
4. **Rotation (not deletion)**: when the file passes ~2 MB, move whole past months to
   `games/works/ledger/2026-11.jsonl` and keep an index (`ledger/index.json`). The page loads the current file plus the
   month the scrubber is on. Ask Harry first (it moves lines; it deletes nothing).
5. **Builders do not push ledger lines from their own branches.** One ledger, one writer of record (the foreman's flush),
   many producers (spool).

### 5.8 Migrating the 90 v1 lines

- Do not edit them. Read v1 lines as `v:1`, `conf:"typed"` (or `reported` where the time has seconds and a SHA).
- Generate `id` deterministically for v1 lines (hash of the line) so later `correct` lines can name them.
- Write correction lines for the known problems: the 12:19 end → `outcome:abandoned, detected_late_min≈1192`; the
  duplicate deploys → `correct … duplicate_of`; the `fun (on rerun)` pass → `flaky, tries:2`; the 16:40 hire → add job.

---

## 6. Hook design (what each hook writes, and what it must not)

All hooks: `type: command`, `async: true` (never slow the work), script reads stdin JSON, writes **one** whitelisted
line to the spool, exits 0 even on its own error (and writes nothing rather than a bad line).

| Hook | Matcher | Writes | Fields taken from input | Fields dropped |
|---|---|---|---|---|
| `SessionStart` | `startup`, `resume`, `compact` | `restart` if the spool shows open jobs, else `note` "session started" | `source`, hashed `session_id` | `transcript_path`, `cwd`, model name optional |
| `SubagentStart` | any agent type | `hire` (if foreman didn't) and `start` | `agent_id` (hashed), `agent_type` | prompt text (only its length if available) |
| `SubagentStop` | any | `end` (`outcome:handed_back` by default; the foreman can `correct` it to `failed`) | `agent_id` (hashed), length of `last_assistant_message` | the message itself |
| `PostToolUse` | `Bash` | `commit` / `push` / `merge` when the command starts with `git commit` / `git push` / `git merge`; else a throttled `beat` | branch and SHA read with `git rev-parse` (not from the command text) | the command text, output |
| `PostToolUse` | any other tool | throttled `beat` (1 per 15 min per job) | job ID from the spool's open-job table keyed by hashed agent ID | tool input |
| `PostToolUseFailure` | `Bash` | nothing, unless it was a git or test command: `fail` | exit code | output |
| `Stop` | — | `beat` for the foreman | hashed session | `last_assistant_message` |
| `StopFailure` | — | `fail cause:api` or `limit` | error type only | message text |
| `SessionEnd` | any | `note` "session ended" (fast; 1.5 s budget) | reason | everything else |

How the job ID reaches hooks: the foreman's hire tool writes `job` ↔ hashed `agent_id` into the spool's open-job table
(`.works-spool/open.json`) after `SubagentStart` fires; later hook lines look it up. If the lookup fails, the line is
written with `job:"unknown"` and the audit counts it (a coverage metric).

**Settings change needed:** hooks live in `.claude/settings.json` (project) or the user's own settings. `LEDGER.md` says
Harry decides. This is a **security** decision (hooks run shell commands on every event). See open questions.

---

## 7. Stall detection, done properly

| Rule | Condition | Shown as | Why this threshold |
|---|---|---|---|
| R1 Hired, never started | `hire` with no `start` (same job) after 15 min | cart at the hut | Starts follow hires within a minute or two |
| R2 Silent builder | open job (start, no end), no `beat`/`commit`/`test` with that job for **45 min** | lost property, amber lamp | Builders use tools every few minutes; 45 min tolerates a long test run. v1 used 2 h, which would have caught 16:27 only at 18:27. |
| R3 Lost | same as R2 for 2 h | lost property, red alarm, town crier | Real abandonment |
| R4 Whole studio silent | no measured line at all for 3 h during a declared working window | haze over the town, "last heard 15:12" | Catches a dead foreman, where nobody is left to write anything |
| R5 Restart with open jobs | `restart` line listing open jobs | power cut flash on those workshops | Catches the 15 Nov case at the moment it happens |
| R6 Order stuck | `order` with no `quote` after 24 h; `go` with no `result` after the quoted minutes × 2 + 24 h | wagon on the bridge with a clock | Pastes go through Harry; long but bounded |
| R7 Ask stuck | `ask` with no `answer` after 48 h | motion on the town hall turns red | Nothing waits forgotten |

Notes:
- The page computes R2–R4 from the clock and the newest data. So the alarm works when every writer is dead, as long as
  the page itself can still read GitHub (and if it cannot, the page says so: "can't reach GitHub since 14:02").
- A **working window** avoids false alarms at night: open jobs declared "overnight" (Harry's overnight runs) keep their
  beats; idle hours with no open job are quiet, not stalled.
- Would this have caught 15 Nov? Builder `mac` started 14:26; machine restarted 16:27. With hooks: `restart` at the next
  session start, or R2 at ~17:12 (45 min after the last beat) and R3 at ~18:27. v1 caught it 20 hours late, by hand.

---

## 8. Minimum instrumentation, in order

Each step is small, has a verification, and says whether it needs Harry.

| # | Step | What exactly | Needs Harry? | Effort | Verified by |
|---|---|---|---|---|---|
| 1 | **Schema + validator** | `games/works/ledger.schema.json` (v2) and `games/works/tools/validate.mjs`: parse every line, check required fields per kind, writer/kind rules, ID uniqueness, monotonic `t_rec`, privacy lint. Add to `works-test.js`. v1 lines accepted as `typed`. | No | 0.5 day | Fixture lines that must pass and must fail (one per rule). |
| 2 | **Page shows provenance and age** | Each card shows `src`, `conf`, "as of", "written 3 h later" if late; typed lines drawn pale; SAMPLE stays grey; GitHub data age badge; haze rule R4. | Taste only (how it looks) | 1 day | Screenshot test with a fixture ledger containing all four trust levels. |
| 3 | **Fix the three lies in v1 logic** | (a) lamps keyed by suite + branch + SHA; "not run on this SHA" ≠ green; (b) bridge shows open orders with age, no 2-day vanishing; (c) pairing by `job` with fallback to v1 behaviour. Suites expire to grey "not run lately", not to nothing. | No | 0.5 day | Fixtures: roomfix fail on build 30 then pass on build 29 ⇒ build 30's road stays closed. |
| 4 | **`works_log` v2 + `works_test` runner wrapper** | `games/works/tools/works_log.sh` (makes `id`, `t`, `t_rec`, `src`, `conf`, current branch and SHA automatically). `works_test <suite> -- <command>`: runs the suite, reads exit code and the "N/M" line, records `tries`, `ms`, `log_hash`, writes a `test` line. Builders use it instead of typing lines. | No (it's a script in the repo) | 0.5 day | Run one real suite pass and one forced fail; lines match exit codes. |
| 5 | **Subagent stats on every `end`** | The foreman copies tokens, tool uses and duration from each builder's completion into its `end` line (via `works_log … --tokens --tools --ms`). Written into the foreman's brief template. | No | 1 hour | Audit: share of `end` lines with stats (target 100% after start date). |
| 6 | **Street lights + fire station from the page** | The works page fetches each live path (same origin, `no-store`) every 10 min and checks a build marker; lists `b\d+/` backups from the snapshot or the Pages tree. | No | 0.5 day | Point a fixture at a missing path ⇒ dark light. |
| 7 | **Claude Code hooks → spool → flush** | Section 6 hooks, `async`, whitelisted fields, plus `works_flush`. | **Yes (security: hooks run commands; settings change)** | 1 day | Fire drill (section 9.3): start a dummy subagent, kill it, see R2 then R3 fire. |
| 8 | **GitHub snapshot job** | A scheduled GitHub Actions workflow (and on push to `gh-pages`/game branches) with `permissions: contents: read` for the API, writing `town-state.json` (branches, heads, recent commits, merges, gh-pages folders, page probes, `as_of`) and publishing it. Page reads it first and falls back to direct API only when it is older than 15 min. Schedules can run late by several minutes; the page shows the age. | **Yes (security: a workflow that writes to `gh-pages` needs `contents: write`)**. No money on a public repo. | 1 day | Audit compares snapshot heads with `git ls-remote`. |
| 9 | **`town-report.json` schema from the home town** | A fenced JSON block at the end of each run report (the standing order already asks for these numbers): `as_of`, per machine `state`, `busy_pct`, `queue_len`, `disk_free_gb`, per stage `machine`,`model`,`queued`,`start`,`end`, per resident counts. The foreman extracts it into `town-report.json` and `stage`/`result` ledger lines. Page rejects reports older than 48 h as "stale". | No (an order to the town) | 0.5 day + one order | The first report's numbers equal the markdown table's numbers (audit check A9). |
| 10 | **`ask`/`answer`, `bug`/`fix`, `idea`/`credit` kinds in use** | Foreman writes them as part of normal work; START_HERE's "Waiting on Harry" becomes generated from open `ask` lines. | No | ongoing | Town hall count = open asks; audit flags asks older than 48 h. |
| 11 | **Field-report daily totals** | After report-1 runs: the Mini's nightly summary contributes one `note`/`result` with daily totals only. | Already yes in game chat; needs saying in the town chat | small | Lint proves no times, places or pictures. |
| 12 | **(Optional) OpenTelemetry** | Only if Harry wants cost in £ per session or per-request detail: local collector on the Mini, strip `user.email`, account and session IDs, export aggregate counts only. | **Yes (download, security, maybe money)** | 1–2 days | Compare `token.usage` sums with step 5's per-job tokens. |

Steps 1–6 need nothing from Harry except taste. They remove most of today's lies on their own.

---

## 9. The truth audit: proving the town matches reality

### 9.1 Daily automated audit (`games/works/tools/audit.mjs`, also runnable in `works-test.js --live`)

| Check | What it compares | Pass | Output |
|---|---|---|---|
| A1 Commits exist | every ledger `sha` | exists on GitHub on `branch` (or an ancestor merged into it) | list of ghost commits |
| A2 Coverage | every GitHub commit on active branches in the last 24 h | has a ledger or snapshot event | % covered, list of uncounted work |
| A3 Deploys are real | each `deploy` | a `gh-pages` commit within ±10 min touched `path`, and a `check` saw 200 with the right build marker | fake or broken deploys |
| A4 Deploys were tested | each `deploy` | `tests_ok:true` backed by runner `test` lines on `from_sha` for every expected suite | "shipped untested" count |
| A5 Test honesty | each `test` | `conf:measured` share; `tries>1` never shown as plain pass | % measured, hidden flakes found |
| A6 Pairs | hires, starts, ends; orders, results; asks, answers; bugs, fixes | every open item is either fresh or already flagged | orphans with age |
| A7 Lateness | `t_rec − t` | under 10 min for measured lines | % late, median lateness |
| A8 Duplicates | same `kind`+`sha`/`path` within 5 min | none unless corrected | duplicates |
| A9 Home report agrees | `town-report.json` vs the markdown run report it came from | same numbers | mismatches |
| A10 Privacy | every line, every report | no lint hits | blocked lines (never print the offending text, only its ID and rule) |
| A11 Dependencies | external hosts in deployed HTML and vendored files vs `THIRD_PARTY.md` and `download` lines | all listed | ships with no papers |
| A12 Town = ledger | run the page headless with `?now=` at five random times, read `window.__works.state()` | lamps, lost property, walkers and weather match what the audit computes independently from the same data | any disagreement |

Output: `games/works/audit/<date>.json` plus a one-line summary (as a `note` line in the ledger). The town hall shows a
**truth meter**: "measured 72% · late 8% · orphans 2 · ghosts 0". This number is itself measured, so it may be shown.

### 9.2 Weekly human spot-check (10 minutes)

Pick 10 things on the screen at random (the audit can choose them). For each, tap the card, follow its `id` and `src` to
the line, and from the line to GitHub, the Pages URL or the results file. Score: found in under 2 minutes, and matches.
Target 10 of 10. Anything that fails becomes a `bug` line against the town itself.

### 9.3 Fire drills (prove the alarms fire)

| Drill | How | Expected |
|---|---|---|
| Stalled builder | start a dummy subagent that sleeps; stop the container or kill it | R2 at 45 min, R3 at 2 h, crier reads it |
| Restart | restart the session with an open job | `restart` line within one minute of the new session |
| Failing test | `works_test` on a deliberately broken copy | red lamp for that SHA only; road works on that branch |
| Old green | pass on an older SHA after a fail on the new one | new branch's road stays closed |
| Stale wall | a `town-report.json` 3 days old | wall greyed, "as of 3 days ago" |
| GitHub limit | page with the API blocked | "can't reach GitHub since …", haze, no frozen sunshine |

Drills run in `works-test.js` against fixtures (no real waiting), plus once for real with hooks after step 7.

### 9.4 The replay test for 15 and 16 Nov

Replay the real ledger with v2 rules and with the corrections from 5.8, and write down what the town would have shown at
16:27, 17:15, 18:30 on 15 Nov and 08:00 on 16 Nov. It must show the stall by 18:30 on 15 Nov at the latest. This is the
acceptance test for "would have caught the 15 Nov overnight stop".

---

## 10. Gaming and double counting: specific guards

| Risk | Example | Guard |
|---|---|---|
| Talk counted as work | `step` lines, long reports, many messages | `step`, `note`, message counts never glow and never count toward "work done"; only commits that exist, measured tests, verified deploys and device wins do. |
| Commit stuffing | many tiny commits look busy | Show lines changed and tests touched, not commit counts; hills use failures, not commits. |
| Self-graded success | "the train marked them done" | Parcel colour from a check line written by a different writer than the maker. |
| Rerun until green | flaky passes shown as pass | `tries` recorded by the runner; any pass with `tries>1` is flaky in weather. |
| Old green hides new red | L7 | key by SHA. |
| Survivorship | only wins read out; orders vanish; nights that didn't run leave no line | Expected-events lists (nightly train, suite list per game) so absence is drawn. Crier reads fails too. Denominators always shown ("8 of 9 answered"). |
| Double counting | ledger + GitHub commits; typed + hooked deploys | dedupe by `sha`/`path`+5 min; validator flags duplicates; snapshot lines and agent lines merged by `sha`. |
| Stale as current | wall at 16:35 still shown at 22:00 | every number has `as_of`; age-based greying; haze. |
| Late typing with tidy times | 45% round-minute times | `t_rec` makes lateness visible; typed lines excluded from timing stats. |
| Attribution guesses | builder name from branch | Only hooks/job IDs attribute; otherwise "unknown builder". |
| The audit gamed | writing lines that satisfy the audit | Audit checks against independent sources (GitHub, Pages, results files), never only against the ledger itself. |

---

## 11. Freshness budget (what "live" can honestly mean)

| Source | Realistic delay to the screen | Shown as live? |
|---|---|---|
| Hook lines (after flush + push + raw cache) | 5–35 min (flush ≤ 30 min, raw cache ~5 min) | "recent", with age |
| Runner test lines | same | same |
| GitHub via snapshot | schedule interval + a few minutes (Actions schedules can start late) | with age |
| GitHub direct (fallback) | 2–10 min; events up to 6 h | with age; events never trusted for stalls |
| Pages probes from the page | seconds | yes |
| Home run reports | hours (needs Harry to paste) | never "live"; always "as of" |
| iPad daily totals | next day | never live |

The town should therefore say "live" only for street lights and the page's own clock. Everything else is "as of".
This is not a weakness; it is the honest picture of a studio that crosses a bridge by wagon.

---

## 12. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The public ledger leaks something personal (a place, a friend, a play time) | Medium | High (public repo, history is permanent) | Whitelist-only hooks, lint in validator and page, daily totals only for device data, deny-list hashed outside repo. Note: a leak in git history cannot be removed without deleting history (Harry's call). |
| OTel exports `user.email` | High if switched on naively | Medium | Don't switch on; if ever, local collector that strips it. Repo settings can't enable it anyway. |
| Hooks slow or break sessions | Low with `async` | Medium | `async: true`, exit 0 always, tiny scripts, fire drill before rollout. |
| Ledger merge conflicts with many writers | Medium | Low | Spool + single flusher. |
| Lost spool when a container is replaced | Medium | Low | Silence detection still fires; flush often. |
| Unauthenticated API limit freezes the town on the home network | High with several screens | Medium | Snapshot file; age badge. |
| False stall alarms (long test runs, night) | Medium | Low (alarm fatigue) | 45 min amber / 2 h red; beats from test runner; declared working windows. |
| Over-instrumentation becomes the work | Medium | Medium | Stop after step 6 if the audit's measured share is already high; steps 7–8 only with Harry's yes. |
| Measurements become targets (builders optimise lamps) | Low–medium | Medium | Glow only for checked outcomes; never rank builders by counts. |
| Home town numbers can't be checked from the cloud | High | Medium | Mark as `reported`; cross-check internal consistency (A9) and spot-check by Harry. |
| Schema churn breaks the page | Medium | Low | `v` field, validator, page tolerant of unknown fields. |

---

## 13. Open questions for the owner (Harry)

Only money, security, deleting, downloads and taste. Everything else above is decided.

**Security**
1. May we switch on Claude Code **hooks** for this repo (`.claude/settings.json`), so the town writes hire, start, end,
   commit and stall lines by itself? They run a small script on each event and write only whitelisted fields.
2. May a **GitHub Actions workflow** publish a `town-state.json` snapshot to `gh-pages` every few minutes? It needs
   permission to write to the `gh-pages` branch. (Free on a public repo; no money.)
3. Is it OK that the ledger is **public** (the repo is public)? If not, the town would need a private feed, which means a
   server or a private repo (security and maybe money).

**Deleting**
4. When the ledger grows, may we **move** old months into `games/works/ledger/2026-11.jsonl`? Nothing is deleted.
5. If personal data ever lands in the public ledger by mistake, do you want it **scrubbed from git history** (a deletion
   of history), or only corrected going forward?
6. How long should the Mini **keep raw iPad field reports** (with pictures)? The town keeps everything by default
   ("nothing is deleted"); the disk floor is 30 GB.

**Downloads / money**
7. OpenTelemetry would need a collector program on the Mini (a download) and would give cost in dollars per session.
   Worth it now, or later, or never? (Recommended: later; tokens per job from step 5 are enough for now.)
8. Should the bank ever show **money**? Only if you add bills by hand; the town cannot measure your electricity or
   subscription spend.

**Taste**
9. How should **typed** (remembered, not measured) events look: pale, dotted, or hidden by default?
10. Should the town hall show a **truth meter** ("measured 72%") to visitors, or only to you?
11. Stale data: **fog** rolling in, or simply greyed buildings with "as of"?
12. Should the **town crier read failures** aloud as loudly as wins? (Recommended: yes.)

---

## 14. Top 10 recommendations, ranked

1. **Key every test lamp by suite + branch + commit**, and treat "not run on this commit" as grey, never green. This fixes
   the worst live lie (a pass on build 29 hiding build 30's roomfix failure). No permission needed.
2. **Give every line `id`, `job`, `src`, `conf`, `t_rec`**, and an `end.outcome` (done / abandoned / recovered / failed),
   with a validator in `works-test.js`. Corrections as new lines, never edits.
3. **Draw provenance**: measured glows, reported is plain, typed is pale, sample is grey; every card shows its source and
   "as of"; stale data hazes. Only checked, measured work glows brightest.
4. **Replace hand-typed test lines with a `works_test` runner wrapper** that writes the line from the exit code, counts,
   tries and commit. Reruns become "flaky", never "pass".
5. **Stall detection by silence**: 45-minute amber, 2-hour red, whole-town haze after 3 hours, computed by the page so it
   fires even when every writer is dead. Prove it with a replay of 15 Nov and fire drills.
6. **Close the order loop**: `order → quote → go → stage → result` with counts (asked, answered, empty, broken, timed out,
   never got a turn, checked pass/fail). No more wagons vanishing by timeout.
7. **Record subagent completion stats** (tokens, tool uses, minutes) on every `end`. This is the honest power station and
   bank today, with no settings change.
8. **Ask Harry for hooks** (SubagentStart/Stop, SessionStart, StopFailure, PostToolUse on git) writing whitelisted fields
   to a local spool, flushed by the foreman. Never content, never raw IDs.
9. **Move GitHub reading into a snapshot file** (with Harry's yes for the workflow), and stop relying on the Events API
   (30 s – 6 h late) and the 60-calls-an-hour unauthenticated limit shared by every screen at home.
10. **Run a daily truth audit** (ghost commits, uncounted work, untested deploys, hidden flakes, orphans, lateness, privacy,
    dependencies, town-equals-ledger) and show its measured truth meter in the town hall; plus a weekly 10-item spot-check.

---

### Sources checked for this plan
- Claude Code hooks reference: https://code.claude.com/docs/en/hooks (event names, common input fields, `async`, timeouts, SessionEnd 1.5 s budget).
- Claude Code monitoring (OpenTelemetry): https://code.claude.com/docs/en/monitoring-usage (metrics, events, attributes, privacy defaults; `user.email` always included when available; repo settings cannot enable telemetry).
- GitHub REST best practices (conditional requests count free only when authorised): https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api
- GitHub Events API latency "30s to 6h" and `X-Poll-Interval`: https://docs.github.com/fr/enterprise-server@3.7/rest/activity/events
- Unauthenticated limit 60 per hour per IP: https://www.x-cmd.com/ratelimit/github/ and https://github.com/orgs/community/discussions/156480
- docs.github.com could not be fetched directly from this session (network allowlist); limits above come from search results and should be re-checked on the official rate-limit page.
