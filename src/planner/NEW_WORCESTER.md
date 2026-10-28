# New Worcester: the main thread

**What this is:** the one place the whole planner points at. The aim is a
Worcester built for **human happiness and health**: everyday life within
reach, people moving in ways that keep them well, and space used for what
the town needs. Every tool, dataset and question exists to fill this
document with evidence and test ideas against it.

**How it grows:** we only learn what New Worcester could look like by
studying Old Worcester: how it grew, what changed, and what worked.
So the loop is:

1. **Old Worcester → lessons.** Ask a question of the past or present (a
   plan in `public/planner/worcester/plans/`), record the answer below.
2. **Lessons → principles.** Turn what keeps showing up into a rule New
   Worcester should follow.
3. **Principles → candidate changes.** Write each as a scenario
   (`public/planner/worcester/scenarios/`) and score it (`npm run planner
   -- scenarios worcester`): who gains, by how much, and who has no car.
4. **Changes → new questions.** Whatever we can't answer yet goes in
   `questions.json` with the data that would unlock it.

Anyone (Harry, CAIRN, another AI, a PatchTown resident) can add to any
step. Cite the plan or scenario file for every number.

---

## 1. What Old Worcester tells us

| # | Lesson | Evidence |
|---|---|---|
| L1 | **Worcester grew outward without bringing everyday life with it.** The neighbourhoods with the most homes built since 1995 are measurably further from a GP, food and a school, even after deprivation and age (t = 2.3). Rye Place (Warndon Villages): 77% of today's households are post-1995; Arran Place (St Peters): 60%. Both are among the hardest places to reach everyday life from. | `plans/did-services-follow-growth.json` |
| L2 | **Need already lives close to services.** The most deprived, least healthy, car-less neighbourhoods are *nearer* everyday services, not further (t = −4.7). Their bad health tracks deprivation (r = 0.91), not distance (GP distance: no link, t = 0.8). Health in New Worcester is about people's circumstances, not just where the surgery is. | `plans/everyday-access-and-need.json`, IDEAS.md health check |
| L3 | **Car dependence grew.** Census 2011 → 2021 (city): driving to work 71% → 76%, bus 5.0% → 2.8%, cycling 4.5% → 3.5%, walking 17% → 15%. Households without a car fell from 22.5% to 20.5%. The 2021 census was taken in lockdown, which hit buses hardest, so treat the size of the swing with care. Driving grew most in older estates (Henwick, Dines Green, Cherwell Close). | `plans/how-worcester-changed.json`, `plans/travel-shift-2011-2021.json` |
| L4 | **Distance explains a lot of driving, but not all.** Further from everyday life means more driving (t = 7.1, 40% of the variation). Yet Perdiswell (Checketts Lane, Northwick Avenue), Barbourne (Sharman Road, Canal Side) and Dines Green (Drake Avenue) have everything close and still drive to work 71–83% of the time. | `plans/drive-less-opportunity.json` |
| L5 | **Corner shops are the car-less household's supermarket.** Small food shops follow households without a car (t = 6.9), not deprivation. Takeaways show no link with deprivation or bad health. | `plans/takeaways-and-health.json` |
| L6 | **The river divides less than it looks.** West bank 21 min to a GP by bus or walking, east 17. Six walkable crossings, two for cars; a new footbridge saves under a minute. | `river.json`, `plans/everyday-access-and-need.json` |
| L7 | **GP surgeries are big and some are stretched.** 9 practices, 6,900–21,900 patients each (England typical: 8,800). Patients finding the wait acceptable: 55–59% at Haresfield House, St Martin's Gate and St Johns House (England 66%). St Peters is the biggest gap. | `gps.json`, questions q3 |
| L8 | **The centre has room.** ~27 of 35 mapped empty shops are in the city centre, including the former Debenhams. | `vacant.geojson` |
| L9 | **Check the map against official lists.** OpenStreetMap missed three GP surgeries and counted hospital departments as GPs. The correction overturned three answers. | IDEAS.md correction |

## 2. Principles for New Worcester

Drawn from the lessons. Each should be testable with the tools.

| # | Principle | From |
|---|---|---|
| P1 | **No new homes without everyday life.** Any new neighbourhood gets a GP, food and a primary school within a 15-minute walk from the start, or a frequent bus to them. | L1 |
| P2 | **Put services where need is, measure who gains.** Rank changes by need and by car-less households helped, not just headcount. | L2, L7 |
| P3 | **Make walking and cycling win first where distances are already short.** Start with Perdiswell, Barbourne and Dines Green, not the far suburbs. | L3, L4 |
| P4 | **Protect the small shops car-less households rely on.** | L5 |
| P5 | **Reuse before building out.** Empty centre units and public buildings (County Hall) before new edge estates. | L1, L8 |
| P6 | **Fix health at its cause.** Deprivation drives bad health more than distance; pair any service change with income, housing and work measures. | L2 |

## 3. Candidate changes (scored)

All against Worcester today, official GP practices. From `scenarios.json`.

| Change | Town score | Who gains | Principles | Status |
|---|---|---|---|---|
| GP surgery at Bath Road, St Peters | +1.7 | 7,877 households save ~19 min to a GP (744 without a car) | P1 (late), P2 | Strongest single change so far |
| County Hall: homes + health hub | +1.2 | 6,620 households save ~10 min to a GP; 600 new homes 0.7 min from it | P1, P5 | Needs site facts |
| County Hall: health hub only | +0.8 | 6,620 households save ~10 min (607 without a car) | P2, P5 | |
| County Hall: homes only (600) | +0.1 | New residents ~30 min from a GP | breaks P1 | Don't, without a hub |
| Reopen Ambleside Drive shop | +0.0 | 289 households save ~1.4 min (71 without a car) | P4 | Distance isn't the issue there |

**Not yet testable:** a walking/cycling scenario for Perdiswell–Barbourne
(P3) needs a travel-choice tool (how many would switch if routes improved).
That's the next tool to build.

## 4. Open questions feeding New Worcester

Live list: `public/planner/worcester/questions.json` (shown as **?** on the
map). The ones that matter most right now:

- Is St Peters really without a GP, or do branch surgeries fill the gap? (q16)
- Where do Warndon's residents actually register for a GP? (q17)
- What can County Hall's site actually hold, and what does the council plan? (q11)
- What could each empty city-centre unit become? (q12)
- Which neighbourhoods have the worst bus service for their need? (q15)
- How many people in Perdiswell and Barbourne would walk or cycle if it were safer and quicker? (needs the travel-choice tool)
