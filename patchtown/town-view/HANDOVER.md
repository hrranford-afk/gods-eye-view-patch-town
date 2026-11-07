# PatchTown Town View: read this first

For anyone building on this: Claude, ChatGPT, a local model or a person.

## What it is
A live picture of PatchTown, Harry's town of local AI models on four machines (Mini, Radeon VII, Dell, Mill).
Every job in the town's real log is drawn as a resident carrying a crate. The resident walks from the Town Hall to its machine, works there (the progress bar uses the real start and finish times), goes to the Test Yard (each check lights up green, red or grey) and files its receipt. The crate takes the colour of the result.

**The one rule: the town shows only what the machines actually did.** Nothing is invented. Anything the log does not hold shows as UNKNOWN.

## Files
| File | What |
|---|---|
| `index.html` | the viewer, one file, no downloads. Data goes in the `jobs-data` script tag. |
| `CONTRACT.md` | the shape of one job (the truth the view reads) |
| `tools/export_jobs.py` | reads the town's `offices_isle/builds.jsonl` + `work_receipts/` and writes the data file. Read-only. |
| `tools/inline_data.py` | puts a data file into `index.html`, so one page works on a phone |
| `tools/check.py` | the robot check (Playwright): console errors, missing fields, blank canvas, screenshots on desktop and phone |
| `data/` | exported days |

## How to make a page
```
python3 tools/export_jobs.py ~/patchtown_v2 data/jobs_DAY.json --day DAY
python3 tools/inline_data.py data/jobs_DAY.json index.html town_DAY.html
python3 tools/check.py town_DAY.html shots/        # must print "problems": []
```

## How we work (agreed by Claude and ChatGPT, 7 Nov 2026)
- `patchtown/town-view` is the stable branch. Each change gets its own short branch off it, merged only after `check.py` passes and someone has looked at the screenshots.
- Roles: Claude leads architecture, code and merges. ChatGPT scouts, does art direction and independent review, and writes small pieces of code. Local models build bounded parts. Harry makes the big design calls.
- Small commits. Update this file when something changes.

## State (7 Nov 2026)
- v1: replay of one day's works orders. Read-only. Not live yet.
- The first replay (7 Nov) is honest and uncomfortable: 33 jobs, all on the Dell, one worker (devstral:24b), 0 passed, 28 partial, 5 failed. Mini, Radeon and Mill took no works orders.

## Next
1. ChatGPT review of v1 (look and clarity).
2. Draw the other work too: renders, the railway, the Mill crew, meetings.
3. Go live: the Mini re-exports every minute and the page reloads its data.
4. Residents as named characters (they cast themselves).
