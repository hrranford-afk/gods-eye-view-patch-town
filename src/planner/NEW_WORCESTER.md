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

## The compass: a good day, within reach, for everyone

The measure of New Worcester is not "how far is the GP?" but **could
someone living here have a good ordinary day?** The evidence on what makes
people thrive points the same way every time:

1. **Other people.** Relationships are the strongest predictor of a long,
   happy life; loneliness harms like smoking. → places to meet, close by.
2. **Health that's built in.** Walking as part of the day, clean air, food. → short, pleasant walks.
3. **Nature.** Green space within ~300 m (about 5 minutes) of home. → parks and the river, reachable.
4. **Security.** A home you can afford and keep, not at risk of flooding.
5. **Purpose.** Somewhere to work, learn, make, care, volunteer.
6. **Time.** Hours lost to travel and waiting are among the least-liked parts of any day.
7. **A say.** Being able to shape where you live. → this tool, open to residents.

**2026 changes the job:** work is coming loose from place (remote work,
AI), so town centres need new reasons to exist (meeting, learning, making,
care, play); the population is ageing and isolation becomes the main
health risk; the Severn floods and homes must decarbonise; and AI can make
a city legible, letting anyone ask it an honest, checkable question. It
should never decide what a good life is, and it must count people without
tracking them.

**The headline measure** (`plans/good-day.json`): the share of households
with all of: a meeting place ≤ 10 min walk, green space ≤ 5 min, food ≤ 10
min, a GP ≤ 15 min walking or by bus. More checks (housing cost, work and
learning, air, safety) join as their data arrives. Next: play it out for
real kinds of residents (an older person without a car in Lower Wick, a
young family in St Peters, a home-worker in Barbourne).

---

## 1. What Old Worcester tells us

_Numbers from the plans as last re-run (29 Oct 2026 data build, official GPs and schools). Re-run any plan to refresh. Car-less households being nearer than others, after age and deprivation, is now borderline (t = −1.9)._

| # | Lesson | Evidence |
|---|---|---|
| L1 | **Worcester grew outward without bringing everyday life with it.** The neighbourhoods with the most homes built since 1995 are measurably further from a GP, food and a school, even after deprivation and age (t = 2.5). Rye Place (Warndon Villages): 77% of today's households are post-1995; Arran Place (St Peters): 60%. Both are among the hardest places to reach everyday life from. | `plans/did-services-follow-growth.json` |
| L2 | **Need already lives close to services.** The most deprived, least healthy, car-less neighbourhoods are *nearer* everyday services, not further (t = −5.2). Their bad health tracks deprivation (r = 0.91), not distance (GP distance: no link, t = 0.8). Health in New Worcester is about people's circumstances, not just where the surgery is. | `plans/everyday-access-and-need.json`, IDEAS.md health check |
| L3 | **Car dependence grew.** Census 2011 → 2021 (city): driving to work 71% → 76%, bus 5.0% → 2.8%, cycling 4.5% → 3.5%, walking 17% → 15%. Households without a car fell from 22.5% to 20.5%. The 2021 census was taken in lockdown, which hit buses hardest, so treat the size of the swing with care. Driving grew most in older estates (Henwick, Dines Green, Cherwell Close). | `plans/how-worcester-changed.json`, `plans/travel-shift-2011-2021.json` |
| L4 | **Distance explains a lot of driving, but not all.** Further from everyday life means more driving (t = 6.8). Yet Perdiswell (Checketts Lane, Northwick Avenue), Barbourne (Sharman Road, Canal Side) and Dines Green (Drake Avenue) have everything close and still drive to work 71–83% of the time. | `plans/drive-less-opportunity.json` |
| L5 | **Corner shops are the car-less household's supermarket.** Small food shops follow households without a car (t = 6.9), not deprivation. Takeaways show no link with deprivation or bad health. | `plans/takeaways-and-health.json` |
| L6 | **The river divides less than it looks.** West bank 21 min to a GP by bus or walking, east 17. Six walkable crossings, two for cars; a new footbridge saves under a minute. | `river.json`, `plans/everyday-access-and-need.json` |
| L7 | **GP surgeries are big and some are stretched.** 9 practices, 6,900–21,900 patients each (England typical: 8,800). Patients finding the wait acceptable: 55–59% at Haresfield House, St Martin's Gate and St Johns House (England 66%). St Peters is the biggest gap. | `gps.json`, questions q3 |
| L8 | **The centre has room.** ~27 of 35 mapped empty shops are in the city centre, including the former Debenhams. | `vacant.geojson` |
| L10 | **Only 35% of households have a good day within reach** (meeting place ≤ 10 min, green space ≤ 5 min including woodland, food ≤ 10 min, GP ≤ 15 min walking or by bus). GP access is the bottleneck (48%); green space reaches 75%, meeting places and food 84%. Car-less households do better (51%), over-65s worse (30%). Need goes *with* a good day (t = 5.0): the central, poorer neighbourhoods have it; St Peters (Spetchley Road, Foxglove Road), the Warndon Villages (Collings Avenue, Bradford Place, Rye Place) and Lower Wick have none of it. | `plans/good-day.json` |
| L11 | **Where life is closest, the river is too.** 96% of households are outside flood zones, but the best "good day" neighbourhood, St Clements by the river (Back Lane South), has 21% of homes in Flood Zone 3. New Worcester's dense, walkable centre has to live with the Severn. | `plans/good-day.json`, `flood.json` |
| L12 | **Per-resident figures lie in the city centre; checked and corrected.** Per resident, crime, pubs, takeaways, corner shops and serious crashes all correlated ~0.9. Counting per resident + worker, or leaving out the two centre neighbourhoods, those links vanish: corner shops don't go with crime. What survives both checks: crime and violence go with car-less households and deprivation (r ≈ 0.7–0.8); bad health with deprivation (0.87), lower income (−0.69) and violence (0.65). The centre (Fort Royal) is still above expected per resident + worker, but shoppers and visitors aren't counted yet. | `plans/survey-centre-fair.json` |
| L16 | **Crime "hotspots" need reading before acting.** Rainbow Hill (004B) is half shoplifting (169 of 335 crimes): a shop effect. Warndon & Elbury Park (003A) is antisocial behaviour and shoplifting by the local shops. Leopard Hill (008A, around Nine Acres Green) is two-thirds violent crime (185 of 283), four times what its deprivation predicts; police.uk pins each crime to a nearby anonymous point, so this may be one place, not a neighbourhood. | `plans/survey-centre-fair.json`, `crime.json` |
| L13 | **Loneliness isn't about distance.** St John's (009E, around Henwick Road) and the Arboretum (007A) have a quarter of households as one person over 66 (expected ~12–13% for their deprivation), yet a meeting place is under 4 minutes' walk. What matters is whether those places suit older people. | `plans/survey.json` |
| L14 | **Cycling follows distance to the centre, and it fell.** St John's (009C) and the Arboretum (007B), 1.1–1.5 km from the centre, cycle to work ~5.7% (above expected); Nunnery (010C), 2.1 km out and among the most deprived, 1.5%, down from 3.6% in 2011. Cycling fell in every neighbourhood looked at. | `plans/survey.json` |
| L15 | **A good day within reach hinges on GP access** (r = −0.85 with GP minutes), and car-free households cluster where homes are cheaper (r = −0.75). | `plans/survey.json` |
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
| P7 | **Every household gets a good day within reach.** The four checks (meet, green, food, GP), then more as data arrives. St Peters and the Warndon Villages first. | L10 |
| P8 | **Build where it's dry.** New homes outside Flood Zones 2–3; protect, don't abandon, the riverside places that already work. Scenarios flag homes in flood zones. | L11 |
| P6 | **Fix health at its cause.** Deprivation drives bad health more than distance; pair any service change with income, housing and work measures. | L2 |

## 3. Candidate changes (scored)

All against Worcester today, official GP practices. From `scenarios.json`.

| Change | Town score | Who gains | Principles | Status |
|---|---|---|---|---|
| GP surgery at Bath Road, St Peters | +1.7 | 7,308 households save ~20 min to a GP (680 without a car) | P1 (late), P2 | Strongest single change so far |
| County Hall: homes + health hub | +1.2 | 6,620 households save ~10 min to a GP; 600 new homes 0.7 min from it | P1, P5 | Needs site facts |
| County Hall: health hub only | +0.9 | 6,619 households save ~10 min (607 without a car) | P2, P5 | |
| County Hall: homes only (600) | +0.1 | New residents ~30 min from a GP | breaks P1 | Don't, without a hub |
| Reopen Ambleside Drive shop | +0.0 | 289 households save ~1.4 min (71 without a car) | P4 | Distance isn't the issue there |

**Not yet testable:** a walking/cycling scenario for Perdiswell–Barbourne
(P3) needs a travel-choice tool (how many would switch if routes improved).
That's the next tool to build.

## 3½. What's mapped now

`npm run planner -- atlas worcester` lists it by compass theme: **30 of 31
layers mapped**. The one gap is planning applications and councillors,
which aren't published openly for Worcester.

| Theme | Mapped |
|---|---|
| People | Census 2021 and 2011, households of one person aged 66+, meeting places (231), wards (25) |
| Health | GP practices (official, with list size and survey), food businesses (FSA), pharmacies and dentists (as mapped, incomplete), air quality area |
| Nature | Parks, playgrounds, nature reserves, woodland, 768 mapped trees, the river and its crossings |
| Security | Flood Zones 2–3, Indices of Deprivation 2025, street crime (12 months, per neighbourhood), house prices since 2015, household income (FYE 2023) |
| Purpose | Schools register (places, pupils), jobs by neighbourhood (66,920 in 2024) |
| Movement | Streets and paths, bus timetable, traffic and cycle counts 2000–2025, road collisions (5 years), cycle network (68 km of tracks, 4 km of lanes) |
| Land | Empty shops, brownfield register (67 sites, up to 3,448 homes), listed buildings, conservation areas |
| Voice | Questions (the question loop), scenarios |

## 3¾. What the full map shows (the survey)

`plans/survey.json` lines up 25 figures for Worcester's 64 city
neighbourhoods and reports what goes together and which places are far
better or worse than their deprivation predicts. Read every link with L12
in mind: anything per resident is distorted in the centre. The surprises
became questions q25–q29 below.

## 4. Open questions feeding New Worcester

Live list: `public/planner/worcester/questions.json` (shown as **?** on the
map). The ones that matter most right now:

- Is St Peters really without a GP, or do branch surgeries fill the gap? (q16)
- Where do Warndon's residents actually register for a GP? (q17)
- What can County Hall's site actually hold, and what does the council plan? (q11)
- What could each empty city-centre unit become? (q12)
- Which neighbourhoods have the worst bus service for their need? (q15)
- How many people in Perdiswell and Barbourne would walk or cycle if it were safer and quicker? (needs the travel-choice tool)
