# CLOUD jobs (branch `citylab/cloud-work`). Only CLOUD Claude edits this file. Statuses: PLANNED, WORKING, PASSED, FAILED, BLOCKED.
Updated 21 Nov 2026. Hardware rows live in `../hardware/JOBS_HARDWARE.md` on branch `citylab/hardware-work` (not written here).

| ID | OWNER | STATUS | UPDATED | EVIDENCE (exact paths) | NEXT |
|---|---|---|---|---|---|
| C01 | CLOUD | PASSED | 2026-11-21 | games/city-lab/inputs/chatgpt-2026-11-21/C01_RESULTS.json; shared/cloud/C01_RECIPE_VALIDATION.md; shared/cloud/evidence/C01_validate_run.txt | none |
| C02 | CLOUD | PASSED | 2026-11-21 | shared/cloud/C02_EVOLUTION_PROPOSAL.md; shared/cloud/examples/*.json; shared/cloud/evidence/C02_sidecar_check.txt; shared/cloud/evidence/C02_damaged_scenario.txt | owner answers the 5 questions |
| C03 | CLOUD | PASSED | 2026-11-21 | shared/cloud/C03_DISTRICT_DEMO.md; shared/cloud/C03_DISTRICT_RESULTS.md; shared/cloud/evidence/C03_experiments.json; shared/cloud/evidence/C03_test_runs.txt; games/city-lab/district.html; shots/c03-1..9 | owner tries district.html on the iPad; two model oddities to investigate (see the demo file) |
| C04 | CLOUD | PLANNED | 2026-11-21 | none yet | needs the manifest shape agreed with HARDWARE; importer is read-only |
| C05 | CLOUD | PLANNED | 2026-11-21 | none yet | table fit and an iPad measurement page; real iPad numbers stay PENDING until the owner measures |
| C06 | CLOUD | WORKING | 2026-11-21 | shared/cloud/C06_INFRASTRUCTURE_DESIGN_NOTE.md v0.1 (sections 12 and 13: provisional options and the C06a approval request); shared/cloud/inputs/chatgpt_c06_review.md; shared/cloud/evidence/C06_paper_tests.txt | design only. C06a NOT started: awaiting the owner's approval. |
| C03b | CLOUD | PASSED | 2026-11-21 | games/city-lab/shared/cloud/C03b_ODDITIES.md; shared/cloud/evidence/C03b_investigation.txt and .json; shared/cloud/evidence/C03b_test_run.txt; tests/c03b-test.js (28 of 28); tools/c03b-investigate.mjs | owner decisions: pay wages when places are unreachable? keep cash costing? Then approve or decline C06a. |
| C07 | CLOUD | WORKING | 2026-11-22 | shared/cloud/C07_LIVING_ISLANDS_INTAKE.md (review and plan only; nothing built) | owner: answer 4 questions, then approve LI-1a (paper) |
| C06a | CLOUD | WORKING | 2026-11-22 | started on the owner's go (defaults: shortage rule A, fixed-output generators, local brownouts, read-only cost comparison, wages unchanged); evidence will be shared/cloud/C06a_*.md and evidence/C06a_* | power network: sources, radial cables, local brownouts, experiments E4 and E5 |
| C08 | CLOUD | WORKING | 2026-11-22 | LI-1a (Living Islands, paper stage) on branch citylab/cloud-islands: games/living-islands/ (separate track from City Lab) | world contract, ledger, save format, three paper tests checked by a calculator |

Notes: no hardware-side work existed on GitHub when this file was written (checked with `shared/tools/jobboard.mjs`). Details of the home machines are not published here by rule (see `../PROTOCOL.md`).
