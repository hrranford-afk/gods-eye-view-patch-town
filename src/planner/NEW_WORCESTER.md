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
| L17 | **Migration follows cheap homes, not the other way round.** 12.8% of Worcester residents were born abroad (4% to 34% by neighbourhood); 6% arrived 2011–2021; about 1 in 80 speak little or no English. They live where homes are cheaper (r −0.66), fewer households have cars (0.60), people are younger and walk to work. On its own, born abroad goes with crime (0.51), but once car-less households and deprivation are allowed for it adds nothing (t 0.8); the same for violence and bad health. Asylum support: 78 people in Worcester (June 2026), 0.75 per 1,000, about half England's rate (1.43); hotels falling (120 in Sep 2025, 28 now). Small-boat arrivals are national figures only: where people go after isn't published, and won't be mapped. | `plans/migration-in-the-whole.json`, `asylum.json` |
| L18 | **Deprivation sets how long people live; dirty air takes a little more.** Healthy life expectancy runs from 55 to 73 years across Worcester's neighbourhoods (life expectancy 77 to 85). Deprivation explains most of it (r −0.83). On top of deprivation, each extra µg/m³ of nitrogen dioxide goes with about 0.4 fewer years of life (t −2.6). Being near everything (the good day) adds no years here: the most central places carry other burdens. Life expectancy is published per MSOA, so this rests on about 20 independent areas. | `plans/wave1-survey.json` |
| L19 | **Warndon & Elbury Park keeps coming up.** Around Windermere Drive (005A): half of children in low-income families (48%, against 24% expected for its deprivation), healthy life expectancy 59 (65 expected), Year 6 obesity 31%, self-harm admissions 132 (England = 100). With L16's crime and antisocial behaviour (003A), it's the first place to look closer. Dines Green & Grove Farm is the opposite: three years longer life than its deprivation predicts, cleaner air, less child obesity. Learn from it. | `plans/wave1-survey.json` |
| L20 | **An ageing city that is barely making children.** Worcester grew 8% from 2011 to 2024 (98,679 to 106,671); people aged 65+ grew 32%, children 0–15 fell 0.6%. Homes, GPs and buses must plan for older residents first. Anxiety in Worcester (3.85 out of 10, 2022–23) was above England's (3.24), the highest in its 12-year series; one year, small sample. | `stats/population.json`, `stats/wellbeing.json` |
| L21 | **The Severn takes Worcester's sewage on wet days.** 13 storm overflows in and around the city spilled 234 times for 1,742 hours in 2025; Bromwich Road treatment works alone spilled 68 times for 975 hours (about 41 days) into the Severn. Swimming or rowing downstream after rain is a health question. | `stats/riverHealth.json` |
| L22 | **Beside its neighbours, Worcester is compact but tired.** Same 39 measures for Worcester, Gloucester and Cheltenham (`compare`). Worcester has the most homes with a good day within reach (41%, against 36% and 31%) and the shortest trip to a GP (15 min). But it is the only one losing children since 2011 (−0.6%, against +9% and +8%), has the most fuel poverty (14% of homes, against 9%), the most people on GP depression registers (17%, against 13% and 11%), the highest anxiety (3.85, against 2.36 and 3.17) and the most sewage spilled (1,742 hours, against 852 and 644). Cheltenham, richer (child poverty 19% against 25–26%), cycles almost twice as much (6.4% against 3.5%) and walks more; its children are the least obese (17% against 22–24%). Gloucester has the most self-harm admissions (151, England = 100; Worcester 82). Crime per resident + worker is similar in all three (66–75 per 1,000). | `public/planner/compare/town-profile.json` |
| L23 | **The places with the most need have the least say.** At the last local elections, turnout fell with deprivation (r −0.72; with child poverty −0.90). Warndon & Elbury Park and Dines Green & Grove Farm voted at 23%, about 12 points below what their deprivation predicts. The neighbourhoods the planner keeps flagging are the ones least heard. | `plans/wave2-survey.json`, `stats/elections.json` |
| L24 | **Cleaner air goes with longer healthy lives (checked in three towns); park access doesn't (withdrawn).** Allowing for deprivation, each extra µg/m³ of NO2 goes with 0.6–0.9 years less healthy life in Worcester (t −2.2), Gloucester (−3.9) and Cheltenham (−2.0). The first run also showed park entrances within 300 m going with longer healthy life (t 2.1), but that didn't survive: it shrinks in Worcester and flips sign in Gloucester (−1.7), so it is withdrawn. Road noise shows no harm; the noisiest homes are the better-off suburbs by the A449 and M5 (Claines 92% above 55 dB). | `plans/lessons-check.json`, `plans/wave2-survey.json` |
| L25 | **Antidepressant prescribing follows the surgery more than the street.** Items per 1,000 patients range from 90 to 187 a month across Worcester's practices; deprivation and loneliness explain little of it (R² 0.13). Practice habits, not neighbourhood need, drive most of the difference, so prescribing is a weak signal of wellbeing on its own. | `stats/prescribing.json` |
| L26 | **Worcester beside its neighbours, round two.** Worcester is the cheapest to rent (£984 a month against £1,122 and £1,269) and has the most homes near a nature reserve (76% against 53% and 19%), but the fewest near a park entrance (31% against 45% and 40%), the most road noise (25% of homes at 55 dB or more, against 12% and 16%) and the fewest childcare places. Gloucester has the most homelessness (4.1 households per 1,000 in temporary accommodation; Worcester 1.0, Cheltenham 0.4) and the weakest age-11 results (57% meeting the standard, against 63% and 64%). Cheltenham prescribes the fewest antidepressants (106 items per 1,000 patients a month, against 132 and 139). Caveats: Gloucester's turnout covers only 4 neighbourhoods (no source holds the rest); the food bank list's 2 sites in Worcester were checked and are real (Worcester Foodbank, Lowesmoor Wharf; Salvation Army, The Trinity; no community pantries found): Worcester's food help is all in the centre, where Gloucester and Cheltenham spread 7–9 sites through their towns; because the buses all run to the centre, reach is similar (24 minutes on average by walk or bus, Gloucester 24, Cheltenham 21; Warndon & Elbury Park 18). The gap is west of the Severn: Dines Green 27, St Clement 29, Lower Wick 25 minutes (q45, `plans/foodbank-reach.json`). | `public/planner/compare/town-profile.json` |
| L27 | **Warndon & Elbury Park isn't short of services; it's short of money, and it's really two places.** Against Worcester's 64 neighbourhoods (spotlight tool), the ward's 11,500 residents sit in the bottom 6% for income after housing, healthy life expectancy (58 years against the town's 66), life expectancy (78 against 81) and degrees, and the top 6% for child poverty (48% against 23%) and early deaths (153 against 98, England = 100). 43% of homes are socially rented (town 11%), overcrowding is double, a third have no car, and turnout is 23%. But its walk to a GP, shop, park or meeting place is about average, and half its workers travel under 5 km (top 6%): it has local jobs and nearby services. One neighbourhood, 003A, is different (healthy life in the top fifth), so the ward is the Warndon estate (002A–D, 005A/B/F) plus a better-off corner. New buildings won't move these figures; income, housing, health care and a voice will. Dines Green & Grove Farm, also deprived, has the cleanest air in the city (bottom 3% for NO2), the fewest health hazards (healthy-places index, bottom 9%) and countryside on its doorstep, which fits L24. | `plans/spotlight-warndon.json` |
| L28 | **Which lessons travel.** The same tests in Worcester, Gloucester and Cheltenham (`compare … plans/lessons-check.json`): crime follows households without a car (t 5–7 in all three); cleaner air goes with longer healthy life (all three, L24); turnout falls with deprivation (Worcester and Cheltenham, t about −6; Gloucester can't be tested: Democracy Club holds turnout for only 1 of its wards, and the council's results page didn't answer); distance to a GP shows no harm to health once deprivation and age are allowed for (t −2.4, −1.3, −1.3, the wrong way or nothing), as L1 found. One claim failed the check and was withdrawn (parks, L24). A lesson only counts once it holds in more than one town. | `public/planner/compare/lessons-check.json` |
| L29 | **The car suburbs are turning grey.** The neighbourhoods where people aged 65+ grew fastest since 2011 (more than doubling) are the 1990s family suburbs: Warndon Villages (St Nicholas), Leopard Hill, St Peter's and Diglis. They were built for young families with cars, and they are where older people have the least within reach: the share of over-65s with a GP, food, green space and somewhere to meet all within walking or bus reach (a "good day") is 0% in St Peter's, 3% in St Nicholas, 6% in St Clement and 10% in Battenhall, against 30% for over-65s city-wide (35% for everyone). Over-65s also take longer to reach a GP (20 minutes against 18). As these residents stop driving, this becomes Worcester's biggest access problem. | `plans/older-residents.json` |
| L30 | **Small hubs give the grey suburbs their good day back.** A hub here means one building with a GP or health room, a café or meeting room and a small shop. Tested with what-if places (`travel … add`): one hub each at St Peter's district centre, Warndon Villages and Battenhall lifts the share of over-65s with a good day within reach from 3% to 46% in St Nicholas, 10% to 50% in Battenhall and 0% to 37% in St Peter's. City-wide that is 30% to 35% of over-65s and 35% to 41% of everyone. Each hub alone adds 1–3 points city-wide; together they reach the three worst-served older suburbs. Candidate for the scenarios table. | `plans/older-residents-hubs.json` |
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

`npm run planner -- atlas worcester` lists it by compass theme: **60 of 76
layers mapped** (waves 1 and 2 done). The other 16 are the free-data inventory
(the data plan below); 4 of them aren't published openly.

| Theme | Mapped |
|---|---|
| People | Census 2021 and 2011, households of one person aged 66+, migration (born abroad, recent arrivals, English), asylum support (council), meeting places (231), wards (25) |
| Health | GP practices (official, with list size and survey), food businesses (FSA), pharmacies and dentists (as mapped, incomplete), air quality area |
| Nature | Parks, playgrounds, nature reserves, woodland, 768 mapped trees, the river and its crossings |
| Security | Flood Zones 2–3, Indices of Deprivation 2025, street crime (12 months, per neighbourhood), house prices since 2015, household income (FYE 2023) |
| Purpose | Schools register (places, pupils), jobs by neighbourhood (66,920 in 2024) |
| Movement | Streets and paths, bus timetable, traffic and cycle counts 2000–2025, road collisions (5 years), cycle network (68 km of tracks, 4 km of lanes) |
| Land | Empty shops, brownfield register (67 sites, up to 3,448 homes), listed buildings, conservation areas |
| Voice | Questions (the question loop), scenarios |

### The data plan: map everything free first

Every free source we know of is an entry in `src/planner/atlas.js`, mapped
or not, with its level (point, neighbourhood, council), how it's got, why it
matters and a priority. `npm run planner -- atlas worcester --check` probes
each one and says if it's reachable from here. Rules:

1. **Inventory before analysis.** A new source goes in the atlas first; then
   a command fetches it; then it's in the model for every tool.
2. **Finest open level, counted not tracked.** Neighbourhood where it exists,
   council where that's all there is. Never a person.
3. **Waves by priority.** Priority 1 sources that are open and reachable
   come first, then 2, then 3. Each wave ends with the survey re-run, so new
   layers are checked against everything already mapped.
4. **Accounts are Harry's call.** Free sources that need a sign-up are listed,
   not used, until Harry says yes.
5. **Blocked stays blocked.** A 403 is recorded, not bypassed; look for the
   same data elsewhere.

**Wave 1 (done, 29 Oct 2026):** `npm run planner -- stats worcester wave1`
fetched 12 sources into `stats/` (one shape for all, see `stats.js`):
wellbeing, population change, more Census 2021, local health (life
expectancy, early deaths, admissions, child obesity, fuel poverty), GP
disease registers, modelled air pollution, sewage overflows, child poverty,
claimants, commuting flows, Propensity to Cycle and business rates (3,703
properties). School results moved to wave 2: the school-level file answers
403 here and the open API is council-level only. `plans/wave1-survey.json`
re-ran the survey with all of it (L18–L21).

**Wave 2 (done, 30 Oct 2026):** 15 more sources by five helper agents in
parallel (`scripts/sources/*.mjs`, `stats <town> wave2`): prescribing,
healthy-places index, road noise, park entrances, nature reserves,
charities, homelessness, food banks, rents, school results, Ofsted, station
use, elections, street reports, roadworks. Reviewed before merging; one fix
(prescribing read a dataset that stopped in 2025). `plans/wave2-survey.json`
(L23–L25).

**Needs Harry's yes (free accounts):** EPC energy certificates (priority 1),
DWP Stat-Xplore benefits, Landsat heat, Land Registry company ownership.

**Not published:** Strava Metro (the council can apply), high street
footfall, the local plan's site maps (PDF only), planning applications.

### Other towns for context

Gloucester and Cheltenham (twins, 9 miles apart) run through the same
pipeline; `npm run planner -- compare worcester,gloucester,cheltenham
public/planner/plans/town-profile.json` lines them up. Running them found
five places the code still assumed Worcester (Land Registry county, school
authority, cycling region, water company) and that Gloucestershire Police
stopped sending crime data to police.uk in February 2026: crime now uses only
months a force reported, scaled to a year. Next: places abroad on a common
set of measures (see the ideas log).

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
