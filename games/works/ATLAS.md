# PatchTown Works: the town atlas

Harry, 16 Nov 2026: "What about the town, the infrastructure, the geography? There's so much more to it than just buildings... car parks, traffic jams, power outages. Each LLM could have their own home showing their own skills and things they've learned in universities... get imaginative and show how this could help the AI development."

**The rule for every piece:** it must show a real number or a real event, never decoration. If we can't measure it, it doesn't go in the town. Each row says where the data comes from and what it helps us do.

## Geography: the shape of the system

| In the town | What it really is | Data | Helps us |
|---|---|---|---|
| Two towns and a river | The cloud workshop and Harry's machines at home | fixed | See the split at a glance |
| The bridge | The one door: orders out, results back | ledger `order` and `result` | See work stuck between the two |
| The toll booth on the bridge | Harry's yes: money, security, deleting, downloads | ledger, open questions | Nothing crosses without his yes |
| The customs house | The privacy check: nothing personal crosses | the privacy checks in tests | Proof the rule held |
| Districts | Each project (Base Camp, B&B, Vigil, Works) | branches by name | Where effort is going |
| Hills | How hard a part is (failed tries, rework) | commits and fixes per area | Find the hard ground early |
| Fog | Things never tried on a real device | the "not proven" lists in HANDOVER | Shows what to test next |
| The harbour | Outside services: GitHub, CDNs, model downloads | download log | Spot what we depend on |
| Ships arriving | A downloaded model or asset (the depth model came by ship) | ledger `download` with its licence | Every import is visible and licensed |

## Infrastructure: how the work flows

| In the town | What it really is | Data | Helps us |
|---|---|---|---|
| The power station | Compute: cloud session time and home machine time | run reports, session status | See where the power goes |
| **Power cut** | A usage limit hit (15 Nov), a machine restart (the 16:27 stop) | ledger `fail` and restarts | Never miss a stopped builder again |
| Battery gauge | Budget left today | limits and reset times | Plan big jobs before they run out |
| The reservoir | Disk space (the Mini: 35 GB against its 30 GB floor) | the town's sky numbers | Warn before the town refuses jobs |
| Roads | The paths work travels: order to machine to result | ledger steps | Find slow paths |
| **Traffic jam** | A queue (the Dell: one resident at a time, 48 min for one answer) | queue waits from run reports | Move jobs to idle machines |
| **Car park** | Jobs waiting to start (cars parked, engines off) | queue length | See backlog at a glance |
| The railway | The nightly batch (the town already calls it the train) | timetable, run reports | Did the night's train arrive on time? |
| Road works | A broken build, or a branch mid-change | failing tests on a branch | Don't drive (deploy) through it |
| The sorting office | Merging branches; jammed parcels = merge conflicts | git merges | Catch conflicts as they happen |
| The telephone exchange | Messages between AIs (the foreman to builders) | message log | See who told whom what |
| Street lights | Health checks (the page loads, AR ready) | the page checks | Dark street = something's down |

## Weather: the mood of the day

| Weather | Means | Data |
|---|---|---|
| Sunshine | All tests green, live and checked | the yard |
| Clouds | Flaky tests (pass on rerun) | reruns in the ledger |
| Storm | Several real failures at once | failures per hour |
| Rainbow | A real-device win (the screen sticker, 16 Nov) | ledger `win` |
| Fog | Untested on a real iPad (see Geography) | the not-proven lists |

## Civic buildings

| Building | What it really is | Data | Helps us |
|---|---|---|---|
| Town hall | Decisions waiting on Harry (motions on the board) | open questions | Nothing waits forgotten |
| Courthouse | Rules checks: nobody dies, no brands, licences, privacy | test checks and licence list | Rules shown kept, not just promised |
| Hospital | Bugs being fixed; the ambulance = an urgent fix | ledger `fix` | How long a bug is "in hospital" |
| Fire station | Rolling back to a kept build (b26, b27, b28...) | pages backups | One tap back to safety |
| Museum | Every build ever shipped, with its picture | pages history | Compare then and now |
| Archive | Git history and notes (START_HERE, HANDOVER) | git | Memory that survives restarts |
| **Lost property office** | Work that stopped and was never picked up | ledger `start` with no `end` | **Would have caught the 15 Nov overnight stop** |
| Market square | Ideas swapped (sparks, residents' ideas) | order results | Which ideas made it into games |
| Noticeboard | Orders and requests | orders folder | One list of what's asked |
| Town crier | Big news read out (and spoken, later) | ledger wins and fails | Harry hears what matters |
| Theatre / arcade | The games people play | play counts only (counted, never tracked) | Is anyone playing? |
| Bank | Cost: compute and money spent | run reports, bills Harry adds | What each feature cost |

## Homes and learning: each AI as a resident

| In the town | What it really is | Data |
|---|---|---|
| A house per AI | Each model or tiny expert | the town roster |
| House size | Model size (a 7B cottage, a 35B manor) | roster |
| Lights on | Loaded in memory and working | machine status |
| Asleep | Unloaded (the Dell keeps one awake at a time) | machine status |
| Garden | What it's good at (and a weed bed for what it's bad at) | town notes |
| **Diplomas on the wall** | What it was trained or tuned on, with licence | training records |
| **Report card** | Its blind test scores (the 10-prompt tests) | mega-review-1 and later |
| Trophies | Ideas of its that made it into a game, with credit | the `by` credits |
| Empty letterbox | Empty answers | run reports |
| **The university** | The trainer: new tiny experts graduate (or fail their exam) | training runs |
| The exam hall | Evals: blind tests comparing old and new | training test results |
| The workshops' builders | Cloud helpers: brief in, report out, then they forget | message log |

## Signs the town already invented (from its own wall, 16 Nov)
- **A fox in the pond:** a machine idle while work waits (the Choreographer's idea).
- **White smoke:** something rebuilt that already existed (the Swarmkeeper's idea).
- **"Who is speaking":** each resident's head coloured for answering, empty, silent or not proven.
- **The town's own verdict:** "it shows talk better than finished work". So finished, verified work glows brightest.

## How this helps AI development
1. **Bottlenecks:** traffic jams and car parks show where work queues, so we move it.
2. **Waste:** white smoke and the fox show rework and idle machines.
3. **Fragility:** power cuts, storms and the lost property office catch stalls and flaky tests.
4. **Truth over talk:** only tested, live work shines, so claims have to be backed by parcels.
5. **Right worker, right job:** report cards and diplomas show which AI is good at what.
6. **Learning made visible:** the university shows whether training actually helped.
7. **Approvals:** the town hall keeps Harry's decisions from being forgotten.
8. **Teaching the public:** anyone can watch how AIs really work: hired, briefed, tested, fixed, shipped.

## Build order
- **v1 (tonight):** the town, live GitHub, the ledger, replay, the town's wall signs.
- **v2:** power cuts and the lost property office (stall alarm), weather from tests, the car park and jams from run reports, the town hall board.
- **v3:** resident homes with report cards, the university and the exam hall, the museum and the fire station.
- **v4:** the town crier with a voice, the harbour and customs, the bank, a public explainer mode.
