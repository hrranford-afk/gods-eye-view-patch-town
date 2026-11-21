# City Lab shared project record: protocol (21 Nov 2026)

This public repository is the shared record for two Claudes and the owner. Source: the owner's instruction of 21 Nov 2026 and the handover ZIP rules (one task ID, one writer, one output).

## Branches (each Claude writes ONLY to its own)
- CLOUD Claude (the game session): `citylab/cloud-work`. Owns task IDs C01 to C05 and the folder `games/city-lab/shared/cloud/`.
- HARDWARE Claude (the session on the home machines): `citylab/hardware-work`. Owns H01 to H05 and the folder `games/city-lab/shared/hardware/`.
- Neither writes to the other's folder or branch. Reviews are comments or a CHANGE_REQUEST file in the requester's own folder.
- Nothing merges into `game/city-lab` without a pull request the owner has seen.
- The ten original recipes (`games/city-lab/inputs/chatgpt-2026-11-21/recipes/`) are immutable test inputs. Fixes go in `proposals/` with the original hash.

## Statuses (exactly these five)
PLANNED, WORKING, PASSED, FAILED, BLOCKED. UNKNOWN is not a status of a job. PASSED needs evidence a stranger can re-run. A later PASS never turns earlier missing evidence into a PASS.

## Job files
Each side keeps one table in its own folder: `shared/cloud/JOBS_CLOUD.md`, `shared/hardware/JOBS_HARDWARE.md`. Columns: `ID | OWNER | STATUS | UPDATED | EVIDENCE (exact paths) | NEXT`.
Before starting a job: run `node games/city-lab/shared/tools/jobboard.mjs check <ID>`. It fetches both branches and says whether the job already exists or is PASSED on the other side.

## Evidence rules
Every claim names a file path, a command, and a commit. No placeholder hashes. Reports of the other side's work are labelled "reported", not "verified".

## PUBLIC REPOSITORY: SAFE-PUBLISH RULE
This repository is public. Never commit secrets, passwords, tokens, private system information, sensitive logs, or any detail that could help someone attack the home machines (their state, access controls, what runs on them, names, addresses, internal paths). Keep those locally and publish only a SAFE SUMMARY (for example "readiness: BLOCKED, details held locally").
Run `node games/city-lab/shared/tools/publish-check.mjs` before every commit. It blocks secrets and flags anything that looks like a security detail for human review.

## Hand-offs between machines
There is no automatic cloud-to-home link. The owner carries receipts by hand. A production request and a factory receipt use the draft shapes in the handover (`05_SHARED_CONTRACT.md`): request ids, recipe SHA-256, validator commit, asset SHA-256, inspector counts, run approval flag. A request file is NOT a runnable job; it goes through the existing town order form and the owner's approval.

## If GitHub access fails
Report the exact error to the owner and hand over the files for manual upload. Do not retry with other credentials or other routes.
