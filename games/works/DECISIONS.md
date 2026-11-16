# PatchTown Works: decisions for Harry

Only money, security, deleting, downloads and taste. Each one has my recommended answer in **bold**.
Say yes or no in the town chat. Taste calls that can be undone take the default after 3 days of silence.
**Money, security, deleting and downloads never do: silence means no.**
Details for each are in `MASTER_PLAN.md`, section 9.

## The top 5

1. **S1. Hooks:** let Claude Code write the town's diary by itself? **Yes, after a one-week trial.**
2. **S2. Snapshot:** let a GitHub workflow publish one town file every few minutes? **Yes.**
3. **S3. Public repo:** keep it public, or move work to a private repo? **Keep it for now. Decide again before going public.**
4. **D1. Model kits:** download the free Kenney kits for the new look? **Yes.**
5. **M1. Watchdog:** a check every 30 minutes that wakes a foreman only when something stalls? **Yes.**

## Security

| ID | Question | Recommended |
|---|---|---|
| S1 | Hooks write the diary automatically (only listed fields, never prompts) | **Yes, after a one-week trial** |
| S2 | A workflow publishes `town-state.json` (needs write to `gh-pages`) | **Yes** |
| S3 | Keep the repo public, or split private work from a clean public town | **Keep for now; decide before any public launch** |
| S4 | Small automatic actions after a trial week (rerun a test, resume a stalled builder once, block an unchecked deploy, hold work when fuel is low) | **Yes, after the trial week** |
| S5 | Automatic rollback of a broken live game | **Later** |
| S6 | The Mini reads the public ledger and shows it at home | **Yes, in v4** |
| S7 | A mailbox so the home town can send results without your paste | **Not now** |
| S8 | Browser voice commands (Chrome sends audio to Google) | **No.** Use the Mac and iPad's own Voice Control |
| S9 | Delay for the public replay | **7 days** |
| S10 | Your name in public | **"Harry"** (already public). Never a surname |
| S11 | Show the home town in public | **Yes, with plain names** (Forge, Boarding House, Mill), no machine details |
| S12 | Approve every public story | **Yes, for the first month, then review** |
| S13 | What visitors see | **Truth meter and counts: yes. Token costs and your questions: no** |

## Money

| ID | Question | Recommended |
|---|---|---|
| M1 | 30-minute watchdog (uses a little of the plan, only when it fires) | **Yes** |
| M2 | Read the plan meter twice a day (morning and before you stop) | **Yes** |
| M3 | Show money in the bank | **No.** Tokens and minutes only |
| M4 | A server to count plays (theatre / arcade) | **Not now** |
| M5 | Public site free, or paid workshops later | **Free** |
| M6 | Give away an open PatchTown kit | **Later, only if people ask** |

## Downloads

| ID | Question | Recommended |
|---|---|---|
| D1 | Kenney CC0 model kits (you download; the build machine is blocked) | **Yes** |
| D2 | CC0 sound packs | **Later** (sounds are made in the browser first) |
| D3 | Kokoro voice on the Mini for the crier | **Later (v4)** |
| D4 | OpenTelemetry collector on the Mini | **Not now** |
| D5 | A speech model on the Mini for private voice commands | **Later (v4)** |

## Deleting

| ID | Question | Recommended |
|---|---|---|
| X1 | Move old months of the ledger into monthly files (nothing deleted) | **Yes** |
| X2 | If something personal leaks into the public repo: rewrite history, or correct from now on | **Rewrite only for a real leak** (a name, a place, a picture, a secret) |
| X3 | How long the Mini keeps raw iPad reports with pictures | **30 days, then ask you** |
| X4 | Closed workshops leave the 3D town after 14 days (the record stays) | **Yes** |

## Taste

| ID | Question | Recommended |
|---|---|---|
| T1 | How builders look | **Faceless wind-up toys with a key that runs down** |
| T2 | Residents and tiny experts | **Wind-up figures; clockwork mice for tiny experts** |
| T3 | Residents' names in public | **Kept, in quotation marks** |
| T4 | A builder when its job ends | **Pops into paper confetti; its hat stays on the rack** |
| T5 | You in the town | **A porch lantern and a big rubber stamp; nobody shown** |
| T6 | Toy material | **Painted wood and soft plastic** |
| T7 | Ink line | **Base Camp's weight** |
| T8 | Map | **Home Town across the river, behind the Works** |
| T9 | Far bank's name | **"Home Town"** |
| T10 | District colours (green Base Camp, orange B&B, violet Vigil, blue Works) | **Keep** |
| T11 | Time of day | **Real clock, never too dark; keep the Daylight button** |
| T12 | Evening look | **Warm lamplight, deep blue night** |
| T13 | Weather | **Gentle** |
| T14 | Rainbow after a real-device win | **2 hours, hidden during a storm** |
| T15 | Paper boats for messages | **No for now** |
| T16 | Sound on the wall | **Soft by default** |
| T17 | Town sounds | **Village: hammers, bells, carts** |
| T18 | Crier voice | **A computer voice that says it is one** |
| T19 | Crier on the hour by day | **Off** |
| T20 | Anything that sounds at night | **Nothing; it waits for the morning** |
| T21 | Times | **"18:20"** (plus "20 min ago" on the phone) |
| T22 | Timeline | **A clock strip with a busy band** |
| T23 | Typed (remembered) events | **Pale and dotted** |
| T24 | Stale data | **Haze and "as of"** |
| T25 | Crier reads failures as loudly as wins | **Yes** |
| T26 | Questions for you a day | **Up to 5, in one block, early evening** |
| T27 | Taste defaults after 3 quiet days, if undoable | **Yes** |
| T28 | Camera on the wall | **Still** |
| T29 | Real-device wins in public | **Shown as "a door"** |
| T30 | Lesson pack licence | **CC BY** |
| T31 | Bench the Dell Writer until the town finds why it says "(DONE)" | **Suggest bench** (the home town's call) |
