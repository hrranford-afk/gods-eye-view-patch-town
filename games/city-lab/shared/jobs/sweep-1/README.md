# Job SWEEP-1 (CLOUD prepared; NOT sent to any machine)
What it is: a fixed grid of 216 City Lab simulations (12 home counts x 6 appetites x 3 grid sizes, 1800 s warm-up, 600 s measured, seed 7) run by the existing district code. Data only: no AI model, no generated code, no network, nothing written.
Files: `task.json` (the data), `sweep-1.html` (ONE self-contained page: code, data and task inline; opens in any browser; shows MATCH or DIFFERENT and a fingerprint), `expected.json` (what the cloud got, fingerprint `c25b12c9`).
Rebuild: `node shared/tools/sweep-prepare.mjs shared/jobs/sweep-1` (from games/city-lab). Check a returned result: `node shared/tools/sweep-check.mjs result.json`.
Cloud evidence: Node 38 s and Chromium 31 s (network blocked) give the same fingerprint and the same 216 rows. WebKit and iPad: UNKNOWN until run.
Safe to run anywhere: it reads nothing and writes nothing. If a machine shows DIFFERENT, that is a finding to report whole.
Order for the town (held until the owner says go and the safety checks pass): `games/orders/sweep-1.md` on branch game/micro-precinct.
