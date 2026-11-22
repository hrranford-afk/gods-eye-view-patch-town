# Living Islands: a separate track from City Lab (branch `citylab/cloud-islands`)
Status: LI-1a, paper stage (job C08). Nothing here runs a game yet. Owner: CLOUD Claude. Review and plan: `../city-lab/shared/cloud/C07_LIVING_ISLANDS_INTAKE.md`.

## The separation rule (owner's decision, 22 Nov 2026)
Living Islands and City Lab are two games that learn from each other without being tied together.
- Living Islands MAY import City Lab pieces by relative path (the recipe format and validator, the district rules, the experiment tools), pinned to a tested version. It never copies them.
- City Lab NEVER imports anything from Living Islands.
- A change that Living Islands needs in a City Lab piece is asked for as a small, tested change in City Lab, not forked here.
- Each track keeps its own job numbers, tests, branch and "lessons" file. What one learns, the other reads: see `LESSONS_FROM_CITYLAB.md`.

## Files
- `LI1A_WORLD_CONTRACT.md`: units, clocks, people, cargo, the ledger, tide, the first-tide jobs, invitations, knowledge versus truth, the save format, determinism, how to measure, and every tuning assumption.
- `tools/li1a-paper-tests.mjs`: a reference calculator (NOT the game) that works the paper tests P1 to P6 exactly; `evidence/LI1A_paper_tests.txt` is its output.
- `LESSONS_FROM_CITYLAB.md`: what carries over.
