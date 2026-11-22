# Worker contract: how a home machine contributes (proposal, not approved)

Status: PLANNED. Nothing here runs until the owner gives separate Phase 2 approval and Hardware Claude's readiness gates pass.

## Principles
- The owner's machines already do other jobs (and heat the house). Contributing must never get in the way.
- Small jobs, strict limits, a kill switch, results only. No secrets, no personal data in or out.
- The cloud designs and checks. Hardware Claude owns machine safety. Machines run the jobs. The owner picks by eye.

## What a machine must do to be a worker
1. Pass the readiness gates (Hardware Claude's list). Any blocking FAIL means BLOCKED.
2. Pass the canary (ORDER HW-1): a tiny known render that gives the expected result, twice, same hash.
3. Declare its limits in a small file: allowed hours (e.g. evenings and overnight), max CPU share, max GPU use, max temperature, max job minutes, free disk floor.
4. Check it is idle before taking a job; pause or stop when something else needs it (owner activity, load, heat).
5. Run one job at a time, at low priority.
6. Return only: pictures, a fingerprint (hash), timings, a status word (PLANNED, WORKING, PASSED, FAILED, BLOCKED).

## What a job looks like
A self-contained package: task.json (seed, camera, resolution, samples), the script, the expected fingerprint for the canary, and a results folder name. Same pattern as SWEEP-1. Jobs are idempotent: the same package gives the same result, so a repeated job is safe.

## Matching jobs to machines (to be filled from the HW-1 survey)
Blender headless bakes and stills; GPU shader renders (the Radeon, if Cycles sees it); long CPU batches (the slowest machine overnight); verifier and test runs (any machine with Node).

## Kill switch and limits
The owner can stop any worker at any time by one action (to be defined with Hardware Claude). A worker that misses its time window, overheats, or sees a surprise stops and reports.

## Not allowed
Downloads or installs without the owner's yes. Deleting. Spending. Contact with anyone but the owner. Touching anything outside the job folder.

## Order of work
1. HW-1 survey and canary (written, waiting for the owner to send).
2. Fill the machine table; set each machine's limits.
3. HW-2: a first small batch (a few seeds, one machine), checked against the cloud's answer.
4. Scale to the seed foundry's render orders, one machine at a time.
