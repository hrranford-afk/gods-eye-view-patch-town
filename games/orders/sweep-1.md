```
ORDER
id:        sweep-1
from:      game session
date:      2026-11-22
goal:      Run one fixed grid of 216 City Lab simulations in the town's browser engines and report whether the numbers match the expected ones exactly.
done:      A result file per engine with the fingerprint, the canary and breach counts, the engine name and the seconds taken; a plain statement of MATCH or DIFFERENT for each engine.
priority:  after the nightly almanac
budget:    30 minutes of Mini; 0 GB of downloads
deliver:   one paste to the game session

STAGE 1
talent:    two-engine-test
inputs:    games/city-lab/shared/jobs/sweep-1/sweep-1.html and games/city-lab/shared/jobs/sweep-1/expected.json (branch citylab/cloud-jobs)
canary:    the page opens and shows a fingerprint within 2 minutes
test:      the fingerprint equals c25b12c9 in each engine; if it differs, report both fingerprints and the first differing row, and stop
output:    sweep-1-result.json (the page's own result for each engine, its engine name, and the seconds)

NEEDS HARRY
- nothing
```

## Context (the same for every model)
The page is one file that contains a fixed, deterministic simulation. It reads nothing, sends nothing and writes nothing. It shows MATCH or DIFFERENT and a fingerprint. No model is asked to write or run any code. The point is to prove the same numbers come out on a home machine and in each engine, and to use idle machine time for a stress sweep.
