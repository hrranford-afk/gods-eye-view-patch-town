# The Gift: the first day

A playable first day, about 15 minutes, behind one switch. Software GL only was used to test it: there is no claim of speed on a real GPU, iPad or Radeon.

## Switches
- `islands_look.html?game=gift` turns on what it needs: `world=9001` (the Gift island), `start=camp`, `repair=1`, `clock=1`, `weather=auto` plus the clock start (dawn). A switch you give always wins (for example `&weather=fog`).
- `&device=ipad|phone|desktop|radeon|ar` works as in ULTRA_TIER.md (52 px touch targets under the ipad preset; AR refuses the heavy parts: no seals, no kit stump model, three finds, one robot).
- `&stage=arrive|jobs|delivery|yard|evening|night|done` and `&day=2` skip ahead (also the "Skip to..." list in the page). "New game" forgets the save.
- `&giftsave=1` allows save and load under automation (otherwise saving is off when the page is driven by a script). Normal play saves by itself into localStorage (try/catch; the page works without it).
- `&glide=0` (BOLD-1) turns off the dawn camera glide. `&names=0` (BOLD-2) turns off the star-group name.
- `&giftworld=<id>` swaps the home island (see "The island").
- The default page (no switches) is untouched: hash 8d962c0c, 88,790 triangles (checked by the page test).

## How to play it
1. Dawn. A beach, a rusted hut, an old jetty. Tap the crate: letter one, a brass key, a tarp. The ledger opens (top right): cash 60,000 and delivery credit 940,000 (in-game pounds).
2. Three quiet jobs in any order (Notebook button): get dry (lean-to, tarp or patch the hut), find water (rain barrel; not every island has a spring), look along the shore (washed-up finds; seals keep away). First win: fit one plank on the old jetty.
3. A boat on the horizon, a fog horn. An unmanned tender leaves crate 1: three track links and the catalogue (ten cheap things, price and delivery time; credit buys things, not land; weather can delay).
4. The yard: three switched-off old carriers. The missing part is a track link (crate 1 or the old hull on the shore). Tap a carrier, fit the part, it starts. Then give it an order: planks and timber, rope and nets, bottles and glass, or tins and metal. It leaves at its own pace, works the tideline, carries the find to the yard heap. The stock shows bottom left (tap it for the robots and the build needs).
5. Evening: letter two in a second crate. The build menu has five things; each shows cost, what it earns or protects, delivery time and what stock it needs. Building one sets one flag for the year ahead.
6. Night: stars, the light on the headland, a bottle with one message chosen by seed. Saved. "Sleep until morning" is Day 2.

## What the robots collect and what each build needs
One trip from the shore brings 2 units. The order is a preference: if the tide covers the ordered kind the robot takes what is dry, and the stock is credited by what it really carried.

| order | what it is | feeds |
|---|---|---|
| Planks and timber | driftwood, boards | planks |
| Rope and nets | line, net, cord | rope |
| Bottles and glass | bottles, floats, glass | glass |
| Tins and metal | tins, drums, scrap | metal |

| build | stock needed | cash and credit | model |
|---|---|---|---|
| Jetty (finish the repair) | 4 planks, 2 rope | 3,600 cash, 14,400 credit | real: the repair jetty |
| Cottage | 12 planks, 4 metal | 17,000 cash, 68,000 credit | placeholder block |
| Rain cistern | 3 metal (drums), 1 plank | 1,200 cash, 4,800 credit | placeholder tank |
| Wildlife hide | 3 planks, 1 rope | 1,800 cash, 7,200 credit | placeholder block |
| Kiosk | 8 planks, 3 metal, 2 glass | 8,400 cash, 33,600 credit | placeholder block |

(Jetty, hide and cistern are meant to be reachable on day one; the cottage and kiosk need a second day of robot work. That is on purpose.)

## The robots (how they behave)
They use the camp routine (camp_start.js, CAMP_START.md): out of the bay at their own pace, walk a path to a site on the tideline, work (an arm or a lid), carry the find back, drop it on the yard heap, go back to the post to charge. Rain and night send them home; the gift also forces shelter when its weather is storm, rain or showers. The sorter kinds (crab, snail) work at the pile after a drop; the hauler and cleaner kinds go straight out again. Status light: green working or charged, amber on the way home, dim when low. A charging post (lamp-post with a small panel) stands at the yard; its lamp is green while a robot charges. The post is a labelled placeholder (no kit model yet). No faces, no speech, no feelings; the same small mark as the letter is stamped on the chassis.
Not in this job: cross-island travel, getting stuck and rescue, wear. How many robots and which kinds you get depends on the quality tier and seed (low shows 2, high shows 3); on the checked seed they were a tortoise-type cleaner and a roller-type hauler, so only one visibly different behaviour pair was seen; a sorter appears on other seeds.

## Pace reference (the original beach-collector feel, measured, not changed)
The owner likes the pace of the original camp prototype (camp_start.js, the robots collecting rubbish at the tideline). The first day keeps that pace: robot speed, work times, drop times, charging and the litter that comes back are the original code and numbers, untouched.
From the code (camp_start.js): walk speed is the kind speed times 1.5 (family tortoise 0.83 m/s, roller 0.90, crab 0.68, snail 0.63, walker 0.75). A pickup is 9 to 13 s of work (sorter kinds 6 to 10 s), a drop is 3 s, a sorter then sorts at the pile for 6 to 9 s, the bay wait is 2 to 5 s. Shore sites are 5 to 40 m from the yard apron (7 on high, 5 on low, 3 on AR); a site that was emptied has litter again after 120 to 180 s. Battery drains 0.0046 per s moving and 0.0030 per s working, charges 0.020 per s in sun, and a robot turns for home below 0.28 or in rain or at night.
From the ecosystem model (ecosystem/shore_catch.py, collector_econ.py, research/BEACH_COLLECTOR.md): a normal shore brings about 1 item per metre of strandline per tide (poor 0.2, rich 5); the real collector crawls at 0.2 m/s, picks in about 17 s, and gathers a median of about 5.3 items per tide. The page compresses this on purpose (the yard is small and the viewer is patient for seconds, not minutes).
Measured here (software GL runs the same sim; the sim is time-stepped, so this is exact for the code, and says nothing about GPU speed): 900 s of the unsteered original routine on the gift island at high quality, three robots (a tortoise-type cleaner, a roller-type hauler, a crab-type sorter) delivered 14 loads in 15 minutes (5, 5 and 4): about one load to the heap every 64 s across the shore, about one load per robot every 3.2 minutes including charging. On average 2.4 of the 3 robots were out at once (never more than 3), moving 65 percent of the time and working at a pile or the heap 8 percent of the time. So the shore always has one or two small machines in view, and something reaches the heap about once a minute.
What the first day does with it: one load is 2 stock units. The build needs were sized to that pace, not the pace to the needs: cistern 4 units (2 loads), hide 4 units (2 loads), jetty 6 units (3 loads), cottage 16 units and kiosk 13 units (a second day). With three robots on orders the cistern is about two minutes of work; with one robot about six.
Deviations from the original pace (flagged in the changelog, each can be vetoed): (1) a started robot waits for an order (it used to start at once), so the first load is a few seconds later; (2) with an order, a robot prefers sites of its kind and takes any dry site when none is free, so the trip length is the same but which pile it feeds is steered; (3) site kinds on the gift island follow height (driest carry timber) instead of rotating by distance, which does not change counts or timing; (4) the gift sends robots home early when its own weather is rain, showers or storm.

## Built vs placeholder
Built: ledger, catalogue, delivery timer with weather delay, letters, bottles, the three jobs, the plank (repair pilot), delivery boat and tender, crates, robot orders and stock, build menu with stock needs, night with bottle, save and load, Day 1 strip, Skip-to, pictures.
Placeholder (labelled in the menu): cottage, hide, kiosk blocks, the rain cistern tank, the charging post, the lean-to and tarp shapes. Letters, bottles and hints are our own words.

## The island (world 9001)
Hand-built by tools/make_gift_world.py (numpy only, deterministic; `python3 tools/make_gift_world.py check` compares the data hash). A 256 m window, 129 cells of 2 m, tide plus or minus 1.1 m, waves from the north-north-west so the south shore is the lee. Lee beach on the south shore (arrival, finds, jetty), a raised turf shelf behind it (camp, yard, hut rise), a hill, a steep exposed north coast, an east shingle cove, a north-east headland with a flat knoll for the lighthouse stump, two skerries for seals. No spring on purpose: water is rain only.
Honest audit of how it was made:
- Used: the landform export format (landform/export_world.py layout, so world_view.js reads it unchanged), the page's own seabed.js and tide, the camp scan for landing and yard, the repair-pilot shore scan, the ecosystem-free life.json (no robots of its own; the camp yard fills them by seed).
- NOT used: landform/world.py generation, hydrology.py (springs and streams), volcano/, rock3d.py, the foundry shortlist per province, globe/ climate and drift for what washes up (the finds are our own small table), ecosystem/ wildlife_place, shelter_ladder, shore_catch for placement. The island is hand-sculpted, not a foundry pick.
- Why not re-derived here: the first-day story pieces (crate, hut, tender beach, four build sites, stump) are placed by scan on this shape and tested; swapping in a foundry island needs a re-run of those placements and a level check, which is the level designer's job. It was not cheap enough for this job and the disk was nearly full. To swap: `&giftworld=<id>` (or the one constant GIFT_WORLD in gift_day.js) plus a world folder landform/worlds/seed<id>/. Everything story-specific is found by scan on the page, nothing is hard-coded to island 9001 coordinates.

## Tests
- `node tests/gift-day-test.js` (pure node): ledger arithmetic, catalogue, delivery timing and weather delay, save and load round trip, bottle by seed, stock and orders, build needs, tone rails.
- `NODE_PATH=$(npm root -g) node tests/gift-day-page-test.js [only=1,2,..]` (software GL): default page unchanged, the one switch, the whole day with real taps (0 console errors), Skip-to, save and load, weather delay, device presets, AR.
- Pictures: `NODE_PATH=$(npm root -g) node tests/gift-day-render.js [only=1,2,3,3.5,4,5] [w=2400]` writes shots/day-*.png.

## Owner test steps
iPad (Safari, touch): open `islands_look.html?game=gift&device=ipad` from the served page. Tap the crate; read the letter; open the Notebook; do the jobs; wait for the horn; open the catalogue and order the tool roll; tap a carrier, fit the track link, tap Gather on "Planks and timber"; watch it leave the yard, work the shore and come back; tap the stock button bottom left; open the build menu and build the cistern; wait for night; tap the bottle. Check that every button is easy to hit (52 px) and the text reads.
Radeon desktop: the same with `&device=radeon` (and `&q=high`). Note frame rate by eye only; no number from this job should be taken as a real-GPU figure.
To try a later beat without playing: `&stage=yard`, `&stage=evening`, `&stage=night`.

## CHANGELOG (this job; none touches a FIXED rule)
- camp_start.js was touched in two small places (an optional `r.want` in the site choice and an optional `dryKinds` flag in the plan). Both are absent on every other page, so the original behaves as before (the camp tests are re-run and reported). Owner may veto: if so the orders would only steer through the gift layer. The original prototype pages are not edited.
- Robot start no longer sends it out by itself; it waits at its post until given an order. Why: the owner wants a mission with a clear shape, then a choice.
- Collection orders (four kinds) per robot, stock counted in the save. Why: robots visibly feed the build menu.
- Builds need stock (see table). Why: the robots feed the building; keeps credit from being the only gate.
- The camp routine now takes an optional preferred site kind (`r.want`) and an optional `dryKinds` plan flag (camp_start.js); both absent means unchanged behaviour. Why: orders must steer which site a robot picks, and a frozen tide must not flood out an order.
- Evening clock window ends at 19.3 instead of 20.4. Why: dusk at 19.6 made the robots shelter before the player could finish the build (a dead end).
- A fallback in site choice (take what is dry when the ordered kind is under water). Why: dead end found in play, see below.
- Charging post placeholder and lamp. Why: owner request.
- Gift forces shelter in storm, rain, showers. Why: owner request (robots wait under cover).
- BOLD-1 dawn glide (the camera starts out over the water and settles on the crate over about seven seconds). Cost: one camera move. Off: `&glide=0`.
- BOLD-2 the star group "the Latch" named in the night toast (text only, not drawn). Cost: one sentence. Off: `&names=0`.
- Home island is now one swap point (`GIFT_WORLD`, `&giftworld=`). Why: the level designer may replace it.

## Dead ends found while playing the day (and the fix)
1. The tideline sites are low; with the clock frozen at the end of a stage the tide is frozen too, so an order for timber could find its sites under water for ever. Fix: sites are now given kinds by height (driest carry timber, then metal), and a robot takes what is dry if its ordered kind is flooded.
2. Dusk fell inside the evening window, the robots went home for the night and the stock stopped before the build menu could be paid. Fix: the evening window ends at golden hour (19.3).
3. A started robot used to run out with no order; with no order it now waits and the hint says "give it an order".
4. The toast (the short message strip) caught taps meant for the island: its CSS said pointer-events none but the pill class overrode it, so a robot or crate under the toast could not be tapped for as long as the page lived. Fix: `#gd #gd-toast{pointer-events:none}`. Found by a real click that did nothing.
5. The bottle could not be tapped at all: its id `bottle` starts with `bot`, so it was sent to the robot card, which found no robot and quietly did nothing (the first night could not be finished by touch). Fix: the bottle is tested first and robot ids must be `bot<number>`.
6. The HUD was rebuilt many times a second while it rained, because the barrel litre count was part of the redraw test; buttons were replaced under the player's finger. Fix: the barrel text is updated in place.
7. The tap detector used the page clock between touch-down and touch-up; a slow frame in between could turn a tap into a miss. Fix: it uses the event time stamps.
8. Night was never detected: the clock's light direction switches to the moon at night, so the test `sun y below zero` never fired and the stump lamp never lit. Fix: night is read from the sun's own elevation (below minus 3 degrees). The lamp sprite was also far too big up close and is smaller now.
9. A worktree on a sparse checkout dropped the island files after a rebase (not a game bug; the sparse list now names them).

## Honest limits
- Software GL only. No real GPU number. The pictures are software renders and look softer than a real device.
- The robot count and kinds follow the quality tier and the seed. The order is a preference, not a promise.
- The island is hand-built, not a foundry pick (see the audit above).
- No drivable boat, storm haul, cross-island robot travel, rescue or wear in this job.
- Prices, delivery times, trip yields and the credit pace are tuning guesses.
- Pictures: see shots/day-0.png to day-5.png and day-3b.png and their captions below.

## Pictures (software GL, 2400 wide; not a device)
- shots/day-0.png, the island plan with labels (made by tools/make_gift_world.py). Flaw: a flat plan, not a render; labels are ours.
- shots/day-1.png, dawn arrival: the crate with the brass key on the lee shore, the tent and fire ring of the camp, the rusted hut frame bottom left, the jetty at the top. Flaws: the grass has a strong yellow-green wash from the sky clock at 05:06; the dark blobs near the crate and at the top are the soft hint rings, which read as holes; the Skip-to list is a test control and is always in view.
- shots/day-2.png, the ledger (top right) and the catalogue open with ten items, prices and delivery words. Two numbered crates stand on the grass (the tender itself is out of frame). Flaws: the toast still says "A boat is coming in. Wait on the beach." although the crates have landed (stale text left over from the render driver skipping ahead; to check in play); the grass is washed out and blurred by the depth-of-field look; the card hides the beach and the tender; a dark hint ring top right.
- shots/day-3.png, the yard with a started robot after an order. Flaw: the robot stands in front of the bay at its post, so the picture reads as parked; day-3b shows the work.
- shots/day-3b.png, a hauler robot mid-job on the tideline carrying planks (a wake of track marks behind it, the green status lamp on top, the wreck behind). Flaws: one robot only in frame; the stock pill reads "Planks 0 ..." because the load has not reached the heap yet; the camera is close so the shore busy-ness (2.4 of 3 robots out) is not visible; the black outline top right is a hint ring.
- shots/day-4.png, the build menu: five builds with cost, what each earns or protects, the stock it needs and what you have, delivery time and the model note; the cottage and kiosk are greyed (short of planks) and the jetty, cistern and hide can be built. Flaws: the left pills sit under the card; the card is long and needs scrolling on a phone.
- shots/day-5.png, the first night: dark sea, the lit lamp on the headland stump, the camp fire glow. Flaws: the island land is still lit by a warm wash that does not look like moonlight (the sky clock's night light on this island: not fixed here); the stump lamp is a flat glowing disc; the stump model is the hand-built placeholder; no seal or bottle in frame; the stars are not visible at this camera angle.
All were viewed after rendering. Zero console errors and zero gift errors in the render run.

## UPDATE (Job 5, physical layer): the new opening and the physical day (owner redesign, 25 Nov)
This supersedes beats 1 to 4 of "How to play it" above when the page runs with the physical layer (the default for `&game=gift`; `&physical=0` gives the beats above unchanged). See GIFT_PHYSICAL.md.
Beat list now:
1. You arrive by boat. The tender that brought you comes in, stops well clear of your boat, waits and leaves. You keep a little rowing boat (the drivable dinghy, there from minute zero, no order needed). The dock is half built: piles in, half the deck down, one or two robots at it, stalled (amber light, a heap of tools, a gap in the deck). They are out of supplies. Hint: "Row to the glow."
2. Supplies float near the shore (three planks, two rope). Row over them to load (the boat takes four rowing). Row to the beach landing, unload: the heaps grow at the yard store. A robot walks each unit to the dock and places it.
3. The frame needs a long beam: a robot takes one end and waits, you hold the other end and it moves while you hold. The decking and the finish are set by a held press on the glowing ring. Nothing moves while nobody acts.
4. The dock is finished (its real planks), and the day goes on as before: the crate at the beach and letter one, the ledger, the three jobs (the plank job is done by the dock), the first delivery (the boat waits at the landing until its crate is carried up the beach by you), the catalogue, robots and orders, the evening letter crate (too heavy for one: a robot and you carry it together), one build that goes up in stages, the night and the bottle.
