# PatchTown Server: the spec (draft v0, 17 Nov 2026)

**One line:** an AI server for a home game studio, with a town as its face. The server does the real work; the town shows it honestly; every building is wired to a real part.

Harry, 17 Nov: "Do you really need to build this as like an AI server, but with a twist?" and "Make something truly beautiful."

This is a draft for a round table: the game session (Claude), ChatGPT, Gemini, the Town Brain and the residents. Every idea that gets adopted keeps its maker's name.

---

## 1. Why a server

Today's faults were server faults, not drawing faults:

| Fault (16–17 Nov) | Missing server part |
|---|---|
| The door dropped a job's arguments silently; a wrong job ran for 85 min | Input checking at the front door |
| One model returned nothing in all 46 of its rounds | Health checks per model |
| A model hit a fixed 50 min limit | Timeouts per model and per job size |
| Training refused at 12 GB free disk (floor 30 GB) | Storage manager |
| 5 orders out, 0 results logged | Job tracking from start to finish |
| A helper AI died and nobody noticed for 19 h 52 min | Heartbeats and a watchdog |
| Six pictures marked "done" that showed nothing asked | Claim and check: nobody marks their own work done |

## 2. The laws (from the master plan)

1. **Measured or not shown.** Every number has a source and a time.
2. **Refuse loudly, never guess quietly.** A job the server doesn't understand is rejected with the reason.
3. **Nobody marks their own work done.** A test, another model or Harry checks it.
4. **Silence is a signal.** A job with no heartbeat goes amber, then red.
5. **Harry decides money, security, deleting, downloads and taste.** The server asks; it never assumes.
6. **Nothing personal goes into any model.** People are counted, never tracked.
7. **One shared language:** the server writes the ledger; the town only reads it.

## 3. The parts

Each part says what it does, what it must refuse, what it reports, and how the town shows it.

### 3.1 The front door (job API)
- **Does:** takes every job (from the cloud session, Harry, or the town itself), checks it against a written job type, gives it an ID, puts it in the queue.
- **Job types:** each has a name, required inputs, allowed machines, budget (minutes, disk, downloads = 0 unless approved), canary, test, outputs.
- **Refuses:** unknown job types, unknown or missing arguments, any download not approved, anything over budget, inputs bigger than the model can read, anything containing personal data.
- **Reports:** `job.received`, `job.refused` (with the reason), `job.queued`.
- **Town:** the toll gate on the bridge. A refused wagon is turned back with a sign saying why.

### 3.2 The queue and scheduler
- **Does:** sends each job to the right free machine, one heavy job per machine, honouring priorities and the time of night.
- **Knows:** each machine's capacity (memory, disk, which models it can hold, one-at-a-time rules).
- **Refuses:** to start a job on a machine that's below its floor (disk, memory) or holding another heavy job.
- **Reports:** `job.started`, `job.waiting` (why), `machine.busy`, `machine.idle`, `machine.idle_with_work_waiting` (the fox).
- **Town:** car parks (waiting jobs), roads (jobs moving), traffic jams (queues), the fox in the pond.

### 3.3 The model register
- **Does:** keeps a card for every model ("seat"): name, size, machine, what it's good at, what it's bad at, its time limit, its health, its report card.
- **Health checks:** a canary prompt before each round. A seat that fails its canary is benched for that round, with the reason. A seat empty twice in a row is benched until fixed.
- **Report card:** answers real / empty / timed out / broke a rule, average time, blind-test scores, ideas that made it into a game (with credit).
- **Reports:** `seat.canary_pass`, `seat.canary_fail`, `seat.benched`, `seat.answer` (real / empty / timeout).
- **Town:** residents' homes. Lights on = loaded; dark = asleep; boarded window = benched; diplomas and report cards on the wall.

### 3.4 The test bench
- **Does:** runs canaries, blind tests (old seat vs new seat on the same 10 prompts, judged without names), planted known answers to test the judges, and "I don't know" checks.
- **Refuses:** to let any seat or trained expert replace another without winning a blind test.
- **Reports:** `test.result` with scores, `check.verdict` on any claim.
- **Town:** the exam hall and the inspection yard.

### 3.5 The trainer (the university)
- **Does:** trains tiny experts on approved material only, then sends them to the exam hall.
- **Refuses:** material without a named source and licence; anything non-commercial; anything personal; any run below the disk floor.
- **Reports:** `train.started`, `train.done`, `train.graduated` / `train.failed_exam`.
- **Town:** the university on the hill; a new resident arrives by removal van when they graduate.

### 3.6 The storage manager
- **Does:** watches every disk, keeps each above its floor by **moving** old files (to the Mill or an external drive), never deleting without Harry.
- **Reports:** `disk.level`, `disk.below_floor`, `disk.moved`.
- **Town:** the reservoir, with a floor line.

### 3.7 The watchdog
- **Does:** every running job sends a heartbeat at least every 10 minutes. No heartbeat for 20 min = late, 60 min = lost. A lost job is resumed from its last save, never restarted from scratch, and Harry is told.
- **Runs outside** the thing it watches (a scheduled check in the cloud for cloud jobs; a separate process on the Mini for home jobs).
- **Reports:** `job.heartbeat`, `job.late`, `job.lost`, `job.resumed`.
- **Town:** the lost property office; a power cut for a dead machine.

### 3.8 The ledger
- **Does:** one line per event, append-only, with `id`, `job`, `t` (when it happened), `t_rec` (when it was written), `who`, `where`, `kind`, `what`, `trust` (measured / reported / typed / sample), `src`.
- **Refuses:** edits (corrections are new lines), personal data (a privacy check on every line).
- **Town:** the diary, the replay, every animation.

### 3.9 The approval gate
- **Does:** holds any job that needs Harry (money, security, deleting, downloads, taste) and asks him once, in plain words, with a recommended default.
- **Refuses:** to treat a yes from anywhere but Harry, in the right place, as a yes.
- **Reports:** `ask.opened`, `ask.answered`, `ask.expired`.
- **Town:** the town hall, with motions on the board; Harry's rubber stamp.

### 3.10 The bridge
- **Does:** carries jobs from the cloud session to home and results back, every job tracked to its result.
- **Today:** Harry pastes in both directions. **Later:** a safe mailbox (security decision for Harry).
- **Reports:** `order.sent`, `order.quoted`, `result.back`.
- **Town:** the bridge with wagons; a wagon waits until its result comes home.

## 4. The twist: the town face

- The town reads the ledger and nothing else. If the server didn't write it, the town doesn't show it.
- **Brightness is proof:** checked, finished work glows. **Motion is data:** nothing moves for decoration.
- One mood line for the 5-second glance: "All good. 1 thing needs you."
- Anyone can watch how AIs work: hired, briefed, checked, failed, fixed, shipped.

## 5. Build order (small steps on the home machines)

1. **Front door that refuses loudly**, plus job types for the orders we already send.
2. **Storage manager** (get the Mini back above its floor by moving files).
3. **Model health checks and benching** (canary before every round).
4. **Ledger lines from the server** in the shared format.
5. **Watchdog and heartbeats.**
6. **Test bench and blind tests.** Then the first trained expert (the spark filter, on the town's own records).
7. **Scheduler with capacity rules.**
8. **Approval gate and the bridge mailbox** (after Harry's security decision).

## 6. Questions for the round table

1. What's missing from this list of parts, compared with real AI servers and agent platforms?
2. What will break first on these machines (a 2018 Mac Mini with a Radeon VII, a 4-core Dell running local models one at a time, a 2010 Mac Pro)?
3. How do we keep it simple enough for one person to look after?
4. How do we make the town face beautiful and calm, and still truthful?
5. Which part, done brilliantly, would make the biggest difference?
