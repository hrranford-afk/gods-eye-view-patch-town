# BEACH_COLLECTOR: the first relic, a small tracked litter picker (research note, 23 Nov 2026)

Gate note for the "Machines and relics" row of RESEARCH_FIRST.md. Design source: EVOLUTION_TREE.md (the first relic, the tender ship and rubbish economy). Companions: SEDIMENT_PHYSICS.md (sand, tide), WILDLIFE.md (seals leave when litter piles up), BOATS.md (the tender's landing), MODES_AR_DESKTOP_HANDHELD.md (tiers). Real product and place names appear only in this note, never in code or assets.

Source status: web search snippets only. Almost every page fetch was blocked or not attempted from the cloud, so no page was read in full. Many numbers are therefore PLAUSIBLE, computed by me from stated inputs, or TUNING. Tags: VERIFIED = stated in a source snippet I saw; PLAUSIBLE = consistent with several snippets or standard engineering; UNVERIFIED = recalled, not seen; TUNING = our choice (change it freely). "Computed" means I did the arithmetic from inputs shown; check the inputs, not the sum.

## 0. The one-paragraph picture
A dog-sized (60 cm tall, 1 m long, about 35 kg) tracked machine with a faded solar shell. It crawls the high-water strandline in slow lawnmower lines, stops, tilts its head (a sensor pod), reaches out a small grabber arm, drops a bottle top or a glass shard in a hopper at its back, and goes on. It leaves two narrow tread tracks in damp sand; the rising tide smooths them away, so a clean strip behind it shows the day's progress. When the sun is low or the hopper is full it goes to a fixed charge spot and parks facing the sea. It never speaks. A single small light says what it is doing. Everything it does is a fixed rule written decades ago, so it keeps working an empty beach and picks up a shell by mistake.

## 1. Real machines (what to copy, what to ignore)

| Fact | Value | Conf. | Source |
|---|---|---|---|
| Walk-behind sand sifter, working width 33 in (85 cm), 5.5 hp petrol, 15,000 to 35,000 sq ft/h (1,400 to 3,250 m2/h) depending on litter density | | VERIFIED (maker snippet) | https://www.hbarber.com/sand-sifting-machines/sand-man-tt/ |
| Tow-behind sifter 45 in (115 cm) wide, depth 0 to 12 cm, 6,000 m2/h | | VERIFIED (maker snippet) | https://www.hbarber.com/sand-sifting-machines/sand-man-tt/ |
| Small walk-behind sifter 750 mm wide, 2,500 m2/h; 3-point sifter 1,600 mm, 7,500 to 15,000 m2/h | | VERIFIED (maker snippet) | https://www.environmental-expert.com/products/balena-compact-3-point-linkage-sand-screening-machine-137840 |
| Tractor-towed surf rakes: 6 to 15 ft wide, hopper 1 to 6 cubic yards (0.8 to 4.6 m3), 4 to 16 acres/h | | VERIFIED (maker snippet) | https://www.hbarber.com/beach-cleaning-machines/surf-rake/specifications/ |
| Remote-controlled tracked beach sifter robot (the nearest real relative): about 420 kg, sifter module about 200 kg, max 2.7 km/h, up to 3 h run on an 8 h charge, sifts top 10 cm, catches debris down to about 1 cm, turns on the spot, claimed 3,000 m2/h | | PLAUSIBLE (one distributor catalogue plus press repeats; press numbers vary 3 to 8 h) | https://newatlas.com/environment/beach-cleaning-bebot-robot-trash and https://www.foxnews.com/tech/robot-cleans-32000-square-feet-beach-per-hour |
| Pick-up robot prototype using two gripper arms pushed into the sand and a bin; about 1 h battery; 10 cigarette butts in 30 min at a public demo | | VERIFIED (news snippets), prototype stage | https://news.yahoo.com/beachbot-rover-uses-artificial-intelligence-130031052.html |

How real machines work, in plain words:
- **Sift**: a rotating drum, belt or vibrating screen lifts sand 5 to 12 cm deep, sand falls through mesh (typically 1 to 2 cm holes, PLAUSIBLE), litter rides to a hopper. Fast (thousands of m2/h) but needs power and a heavy machine.
- **Rake / tines**: a comb pulls litter and weed off the surface into a hopper. Cheap, rough, takes weed with it.
- **Pick**: a camera finds an item, an arm or scoop lifts it. Slow (tens of seconds per item) but selective. Our small relic is a picker, not a sifter: that is why it is slow and why finding an empty beach is believable.
- **What fails in real life** (PLAUSIBLE, standard for beach plant): sand in bearings, drive sprockets and tracks (fast wear); salt corrosion of connectors and screws; wet sand clogging screens; getting stuck in soft dry sand or in wet sand that liquefies; tide catching a parked machine; weed wrapped round drives and rollers; batteries failing from heat and age; sensors fogged by salt film; lost remote link.

Not a design number: the real robots are 10 times heavier than ours. Ours is a toy-sized relic by owner decision; its numbers below are computed for the owner's size.

## 2. Our machine, computed numbers (all TUNING unless stated)

| Item | Value | Conf. | Note |
|---|---|---|---|
| Body | 1.0 m long, 0.55 m wide over tracks, 0.60 m tall to top of head pod, 35 kg | TUNING | dog-sized, owner decision |
| Tracks | 2 rubber tracks, each 0.12 m wide, 0.50 m on the ground | TUNING | |
| Ground pressure | 35 kg x 9.81 / 0.12 m2 = about 2.9 kPa (computed) | computed | A standing adult on two shoes is about 20 to 30 kPa (computed from 70 kg and 0.03 m2). So the relic floats where people sink to the ankle. |
| Wide soft wheels instead | 4 wheels, each 0.18 m wide, 0.04 m long patch, 0.029 m2 total, about 12 kPa (computed) | computed | 4 times the pressure; fine on firm wet sand, digs in dry sand. Tracks win and also look right. |
| Speed | search crawl 0.15 to 0.25 m/s (0.5 to 0.9 km/h); transit 0.4 m/s | TUNING | Real robot top speed 2.7 km/h = 0.75 m/s (PLAUSIBLE) |
| Motion power | rolling resistance coefficient on soft sand 0.15 to 0.30 (PLAUSIBLE, terramechanics range); 35 kg x 9.81 x 0.2 x 0.3 m/s = 21 W mechanical, about 35 W electrical at 60% drive efficiency (computed) | computed | |
| Solar shell | 0.4 m2 of cells, 18% efficient, about 72 W peak | TUNING | cells are small and old |
| Daily yield | northern Atlantic coast, mean sun about 3 kWh/m2/day in summer, 0.5 in midwinter (PLAUSIBLE background) so 0.4 x 0.18 x 3 = about 0.2 kWh summer, 0.04 kWh winter (computed) | computed from PLAUSIBLE | Fewer working hours in winter is the natural seasonal brake. Aged panels at 60 to 70% of new (TUNING). |
| Battery | 0.2 kWh (0.12 kWh usable when aged), mass about 2.5 kg | TUNING | enough for about 3 h driving plus arm work; real robot 3 h on 8 h charge matches the proportion (PLAUSIBLE) |
| Arm | reach 0.6 m, grabs up to 0.5 kg, one pick cycle 20 to 40 s | TUNING | prototype picker: 3 butts/min is too slow to be useful, so our relic is picky about what counts |
| Hopper | 15 L, holds about 4.5 kg (bulk 0.3 kg/L, loose glass and caps, TUNING) | TUNING | about 150 to 300 items; empties at the charge spot / tender |
| Sweep | 0.6 m pick width either side of centre line, one pass strip 1.2 m | TUNING | |

## 3. Driving on sand
- **Tracks vs wide wheels.** Tracks spread load over a long contact patch, which matters most on soft ground; on firm ground the advantage is small (PLAUSIBLE; supported by the general terramechanics snippet at https://apps.dtic.mil/sti/pdfs/ADA460934.pdf and https://mdpi.com/1424-8220/24/6/1779, numbers not read). Wide soft wheels (low pressure tyres) work on firm damp sand and are quieter, but dig in on dry, loose sand and sit badly beside a tidal edge.
- **Which sand holds.** Clean sand is a frictional material and changes little with moisture; sand with fines or poor drainage turns plastic or liquefies when wet (VERIFIED snippet from US Army trafficability summaries, https://apps.dtic.mil/sti/tr/pdf/AD0218089.pdf). Beach sand ranges from loose to hard-packed (VERIFIED snippet). Practical rule for the game (PLAUSIBLE): damp sand just above the swash line is firmest; dry upper beach is softest; very wet or saturated sand near the low-tide edge can pump and bog, and a parked machine can be undercut as the tide rises (anecdotal, low authority).
- **Sinkage** (TUNING): damp firm sand 5 to 10 mm track sink; dry soft sand 25 to 40 mm; saturated pumping sand 60 mm and rising when stopped.
- **Slope limit** (TUNING): crawl up beach face grade of about 1:8 (7 degrees) on damp sand; dry sand slope limit about 20 degrees for a light tracked machine, but real angle of repose for dry sand is about 30 to 34 degrees (PLAUSIBLE standard), so refuse anything over 15 degrees. It stops dead at a dune lip or a boulder field.
- **Tracks in the sand.** Damp sand takes a crisp print: two parallel grooves, 12 cm wide each, 5 to 10 mm deep, with a cross-hatch of tread bars (repeat pitch about 3 cm). Dry sand takes a soft, blurred, wider trough with collapsed edges. Turns on the spot (as the real robot does, VERIFIED snippet) leave a fan or rosette. Pick spots leave a small scuff dent from arm and gripper pushing into the sand.
- **How fast tracks vanish** (TUNING; sources only give mechanism): 
  - Rising tide over the print: gone in one swash, the surface left smooth with a faint ripple. A clean strip is a lighter, flat band.
  - Wet sand above tide line: stays until rain or the next spring tide; rain smooths prints over about 10 to 30 min of steady rain (rain pits and flattens edges).
  - Dry sand: wind above about 6 to 8 m/s (PLAUSIBLE; threshold for blowing dry sand is of that order; I could not verify it) blurs edges within an hour and fills them in hours; a quiet day keeps them for a day or more.
  - Rippled sand rule: small wind ripples flatten and move in strong wind (VERIFIED general: https://www.scientificamerican.com/article/why-do-regular-wavelike-s/ snippet).
  - Design: age tracks in four steps: fresh (crisp, dark), 1 h (edges soft), 1 tide (gone below the swash line, faint above), 1 spring tide (gone).

## 4. Coastal wear, and what a long-abandoned machine looks like
Numbers (TUNING if not tagged):
- Steel in a marine atmosphere loses about 0.035 mm per side per year; in the tidal/splash zone about 0.075 mm per side per year (VERIFIED snippet: https://coldregionsresearch.tpub.com/LR-03-19/LR-03-190016.htm). Severe marine-industrial atmospheres exceed 0.2 mm/year (PLAUSIBLE secondary snippet). Over 30 years thin sheet steel (1 to 1.5 mm) is lost, so a steel body panel is holed after 15 to 25 years at a splash-height spot (computed from VERIFIED rate), thicker frame lasts longer.
- Aluminium does not rust red; it pits white and grey in a powdery oxide, and stays structurally sound much longer (UNVERIFIED rates; I could not retrieve aluminium pitting data). Anodised parts go dull and chalky.
- Plastics: UV makes surface chalky and brittle, then flakes; polypropylene fragments much faster than polyethylene after long UV in lab (VERIFIED lab snippet: https://agris.fao.org/search/en/providers/122535/records/65de3811b766d82b18fca101; lab months are not field years). Treat any plastic panel in sun as chalked and cracked after 10 to 15 years (TUNING). Rubber tracks crack in tiny grid lines (ozone/UV) and harden.
- Paint: colour fades first (reds and yellows fastest, PLAUSIBLE standard), then chalks, then blisters at edges and scratches; bare metal shows through at corners and where sand abrades (leading edges, track guards, hopper rim).
- Sand abrasion: scours the bottom 20 cm of the body into a satin, paint-free band; polishes clear windows to a haze (the head pod lens).
- Salt crust: white tide-mark crust at the lowest 10 to 20 cm and around joints; a pale bloom on panels after spray.
- Rust streaks: orange-brown runs below each fastener, hinge and screw, always running DOWN; darker brown pits near the base; a rust-orange stain on the sand under a parked machine.
- Living things: barnacles and weed only on parts that sit in the tide often (feet of the track guards, lowest 10 cm) if it parked low (TUNING); on a dry upper beach there are none, only lichen-like spots and bird droppings on top. Lower hull may have a green weed fringe if the machine is washed.
- A decades-abandoned machine (if left uncharged): tracks sunk in, panel cracked, one side rusted through, sand drifted against the upwind side in a wedge, weed tangle at the base, a vine or marram grass rooted in the hopper (TUNING). The player's relic should be at the MID stage, still working: faded, patched, salt-streaked, one cracked cover held with tape or twine, one new part that looks wrong (a replaced piece from a later repair, since the relic cannot fix itself).

Wear stages for a texture/state dial (TUNING): 0 cared-for (never seen), 1 working relic (the one the settlers meet), 2 failing (limping, one track slips), 3 stopped relic (salvage), 4 wreck.

## 5. Litter on an old beach after the collapse (all TUNING unless tagged)
- Real context: the median beach litter count in an Atlantic regional assessment was 252 items per 100 m of beach for 2018 to 2020 (counted over the whole beach width), the lowest regional median 50 items per 100 m, and the agreed target is 20 items per 100 m (VERIFIED snippets: https://www.ospar.org/work-areas/eiha/marine-litter/assessment-of-marine-litter/beach-litter). So 0.2 to 5 items per metre of beach in recent practice. Strandline-only counts are not in my sources (UNVERIFIED).
- For the game, after the world stopped producing and cleaning (TUNING): old stock keeps washing in from the sea for decades, but no new production; fragments get smaller. Use items per metre of strandline per tide: poor shore 0.2, normal 1, rich catch shore 5 (follows flow and wrack model).
- Composition by count (TUNING, built from the usual beach-litter surveys mix): plastic pieces and fragments 40%, bottle caps and lids 8%, bottles (PET/HDPE) 5%, glass shards and bottles 6%, cans and metal 4%, rope, netting and fishing line 7%, foam, polystyrene 6%, cloth, rubber, shoes 4%, wood and other 5%, natural wrack (weed and shells; the relic mistakes some) 15% by count (it ignores weed, but picks shells and shiny stones by mistake: about 3 in 100).
- Mass per item (PLAUSIBLE standard): bottle cap 2 to 3 g; plastic fragment 1 to 20 g; PET bottle 20 to 30 g; aluminium can 13 to 15 g; glass bottle 200 to 400 g; glass shard 30 to 150 g; rope 50 to 150 g per metre; net lump 200 g to several kg; shoe 300 g.
- Average item mass 40 g (TUNING, glass pulls it up), so per tide: poor 0.2 x 40 g = 8 g/m, normal 40 g/m, rich 200 g/m of strandline per tide. A 100 m strandline gives 0.8 kg, 4 kg, 20 kg per tide. Per day (2 tides): 1.6 kg, 8 kg, 40 kg.
- The tide brings it, the tide also takes it back: assume 30 to 60% of what lands is re-floated by the next spring tide if not collected (TUNING). Storms add a spike of 3 to 10 times.
- Where it is: in a line at the last high water (the wrack line), thicker in coves and on gentle low-energy shores, lost on headlands and fast channels (consistent with EVOLUTION_TREE wrack model). Items stick in weed, half-bury, and sit in pools. Dry upper beach holds older and more fragmented litter.

## 6. Behaviour design (finite states, deterministic from the seed)
Cycle, in plain terms:

| State | What it does | Time (TUNING) | Leaves when |
|---|---|---|---|
| WAKE | sun above a threshold: light flickers, head lifts, shakes off sand | 8 to 12 s | battery above wake level (20%) |
| SEARCH | follows fixed line along strandline, head scans left and right every 3 to 5 s | until item seen or end of line | an item found within 1.2 m (it knows items from a fixed colour/shape list) |
| APPROACH | turns to item, creeps at 0.1 m/s, stops 0.3 m short | 3 to 8 s | in reach |
| GRAB | arm lowers, gripper closes, lifts, drops into hopper | 6 to 12 s | grip sensor reads weight |
| CHECK | head tilt, light flicker; if the weight is too low or too high, drops it back (the rule is brittle, shells and stones fool it about 3% of the time) | 2 to 4 s | decides |
| WAIT | stops 5 to 20 s if swash covers the next pick, or the tide is rising over the line; faces the sea | up to 15 min (TUNING) | water leaves or line shifts |
| LOW CHARGE | below 25% battery or sun failing: drops the next job, heads straight to charge spot | | arrives |
| CHARGE | parks facing the sea on a sunny, dry-ish spot, panels tilted, light slow pulse; empties hopper only when a tender or collector is there | until 90% | morning |
| FULL | hopper reads full: goes to the delivery spot and waits (cannot unload alone) | | tender visit |
| STUCK | tracks slip more than 40% for 10 s: tries rock forward and back three times, then rotates 90 degrees, tries again, then stops, light slow red | rocks 3 times over 20 s; gives up after 60 s | tide floats it, or a person frees it |
| PARK_STORM | wind above storm level or big swell: goes to the high beach spot and parks facing the sea | | calm |
| DEAD | battery empty, no sun: stops where it is | | sun returns |

Timing of a pick (one item): approach 5 s + grab 9 s + check 3 s = about 17 s for the item itself, plus travel; a rich shore gives about 60 to 120 items/h, an average one 10 to 30 (TUNING; prototype pickers do about 20 items/h on sparse butt litter, VERIFIED order from the 10-in-30-min demo, so a dense beach is where the relic shines).

Small habits that give character without speech (all TUNING, cheap):
- Head tilt: when it sees something unknown (a rope, a shell) the head pod tilts 15 to 20 degrees for 1.5 s.
- Double take: it passes an item, stops, reverses 0.2 m, and looks again (30% of the time after a miss).
- Shake off sand: after a wake and after a long wait, it jolts side to side twice and dust puffs from the shell.
- Hesitation at the swash: it stops at the edge of a wave and backs up one length; the pattern of nudge and retreat reads like an animal and a human at the tide line.
- Wrong pick and drop: picks a shell, tilts the head, drops it again (CHECK), and looks around.
- Peek at the settlers: when a person is within 3 m it stops, tilts the head once and goes on (no tracking, no following, no face recognition; it only registers an object in the way).
- Empty-beach loop: finishes the line, turns around and walks the same line again.
- Parks facing the sea, always, even when nothing is there.
- Drift: its clock wears, so over years the timing gets later; it works at odd hours, in the dark, or in rain it should have sheltered from.

Sound (cheap, optional layers): low whirr of the drive motors with a faint squeal that rises when sand is in the tracks; crunch of sand under tread (swap by wetness: crisp wet, hiss dry); servo ticks as the arm moves; a small, dull clink as an item hits the hopper (glass, cap or can each its own clink); a soft pneumatic puff on shake-off; a hum change when the panel charges; a click-clunk when a gripper closes on nothing. No beeps that sound like speech; no melody. Light, not noise, is the main signal: sound level near a person is low (below a person's footsteps).

Status light (single small lamp on the head pod, no screen):
- soft white slow pulse: charging
- steady pale green: working, fine
- green flicker 2 s: item found and holding
- amber slow blink: hopper nearly full, or waiting for the tide
- amber fast blink: low battery
- steady amber: full, waiting for the tender
- red slow pulse: stuck
- red steady, then off: shut down / dead
- dark: no power at all
A cracked lens or a flickering lamp (loose wire) is one of the wear signs; colour code is old, not logical, so the settlers learn it by watching.

## 7. Model quality levels
Hero (about 20,000 triangles), for close views and the inspect view; live (about 4,000) in-game; far (about 800) as a small dot or a two-colour silhouette on a beach. Targets are TUNING and must be checked against the tier budgets of MODES_AR_DESKTOP_HANDHELD.md (not yet verified here).

- Hero 20k: modelled treads with tread blocks and track pads, sprocket and idler wheels, six to eight separate body panels with bevels, bolt heads and hinges, grabber arm with three joints and visible cable, gripper fingers, hopper with lid, head pod with lens and little visor, solar shell cells as real cell grid, small light lamp, cracked cover, a hanging piece of twine or cable.
- Live 4k: body panels as simple shapes, track as a belt with normal-mapped tread (no modelled blocks), arm as two links and a gripper, head pod as one mesh, shell as one curved panel, hopper as a box with lid. Moving parts: tracks (UV scroll), arm joints, head tilt.
- Far 800: body, two tracks, panel, arm folded, head. Baked colour only. One draw call.
- What MUST be in the textures (all levels): base paint (faded colour), panel seams, edge wear where paint scuffs (bare metal at corners), chalky UV bloom on top surfaces, rust streaks downward from fasteners, white salt crust at the bottom 10 to 20 cm, a sand-abraded satin band along the lower body, dark grime in the tread and at joints, oil or grease smear at joints, solar cells faded and a hazed clear cover, a few barnacle-sized dots only on the lowest feet, bleached stencil marks (no brand: a plain number and arrow only), a metal data plate with no text.
- Material set: matte painted metal, rubber, hazed plastic, solar cell glass, rusty steel; roughness maps carry most of the age.
- Baking: ambient occlusion is key (sand in the lower crevices), one normal map per level, a vertex-colour dirt layer for variation per machine (seeded) so two collectors on two islands differ.
- Animation budget: 12 to 14 bones: body, 2 tracks, arm 3, gripper 2, head 2, lid, shell tilt.

## 8. Interactions with other layers
- Tide and sea: it works the strandline between the last two high-water marks; it waits when the swash touches the line; it parks above the spring high line on storm days. Tracks and clean strip use the shoreline mask and wetness field.
- Flow and wrack model: its income comes from the same arrivals as everything else (EVOLUTION_TREE); the richer the cove, the more it carries.
- Weather: wind and rain erase tracks; rain stops solar; fog and low sun reduce its working hours; storms trigger PARK_STORM.
- Wildlife: seals and birds ignore it at a distance, move away if it comes within 3 to 5 m (TUNING); gulls land on a parked relic; wrack beetles and sandhoppers gather under the hopper. It must not disturb a seal haul-out (its fixed line avoids marked sand; if it does not, that is a bug the player can fix, EVOLUTION_TREE rule).
- Tender ship: it drops the collector at a landing and calls on an old timetable; hopper emptied only when the tender is present (see §9 test).
- People: it does not talk; it does not follow; it does not attack or hurt; people can free it, charge it, move its charge spot, take it apart.
- Ledger: every pick adds to the hopper, every empty is a ledger event with an idempotent key (island, day, tide index, collector id).

## 9. What the headless economy test must measure
Run with fixed seeds over at least 50 seeds and 365 simulated days, no graphics:
1. Gathered per tide: items, mass, by material (glass, plastic, metal, rope, other) at poor, normal and rich shores; sun hours, battery state, number of waits and stuck events. Expect (TUNING targets): poor 0.1 to 0.3 kg/day, normal 1 to 2, rich 4 to 8 (limited by pick time of 17 s per item and daylight, not by supply).
2. Hopper capacity: 15 L, 4.5 kg; how many fills per day and per week at each shore type; how long it waits full (a collector stuck full wastes its day; the test should show it).
3. Deliveries per tender visit: how much is in the hopper when the tender arrives, how many visits per season, how often the tender calls with nothing; how many kg per visit reach the player's stockpile (TUNING target: 2 to 8 kg per visit normal, 20 kg max).
4. Recovery from over-delivery: run a tender that delivers 2x, 5x, 10x the shore's absorbing rate; measure shore litter load per metre, wrack crowding, seal departure threshold (EVOLUTION_TREE owner decision: piled rubbish drives seals away), and time to recover after stopping deliveries and clearing by hand. Pass if every seed can return below the threshold within 30 days without a reset, and no state is a dead end.
5. Wear: battery capacity at year 1, 5, 10; panel decline; stuck rate; chance of permanent failure by year 3.
6. Side checks: it never picks natural wrack more than 3% of the time; no negative mass; no duplicate delivery (idempotent key test); identical results across two runs of the same seed.
7. Balance: both paths (shun the past / embrace it) reach a stable village; collector must not dominate (EVOLUTION_TREE "measure first").

## 10. Four silhouette concepts for the concept sheet
All are tracked, have a solar shell, a grabber arm and a hopper, and a single status lamp. Same overall size (1.0 m long, 0.6 m tall) unless noted. Render each from the side, three-quarter and front.

A. "Low tortoise": a long, low, domed solar shell like a tortoise back covering most of the body; tracks short and chunky at the corners; the arm folds flat in a slot in the front of the shell like a folded leg; the hopper is a rounded bin at the back under a hinged lid; head pod is a small bump at the front with one lens. Proportions: height 0.45 m, width 0.65 m, shell 70% of length. Reads as: shy, patient, an animal.

B. "Terrier": a dog-like stance: a body with an angled rear and a raised front; tracks long and angled like back and front legs; the head pod is on a short neck that tilts; the arm is a thin jointed reach folded under the chin; solar shell is a flat plate over the back; hopper is a boxy backpack. Proportions: 0.6 m tall at the head, 0.5 m at the back, tracks 80% of length. Reads as: alert, curious, the head tilt is natural.

C. "Wheelbarrow": a boxy open work machine: a big visible hopper (half the body) in front of a short back with the panel on top of a frame; two long tracks like a bulldozer; the arm mounted on top at the front, tall and spindly with a gripper like a crane; head pod on the arm's elbow. Proportions: 1.0 m long, 0.6 m tall at the arm tip, hopper 50% of volume. Reads as: tool, workmanlike, quickly understood.

D. "Beetle": a rounded body with a pitched hinged shell opening like wing-cases (the shell lifts to tilt toward the sun); six-sided panel; short, wide tracks on both sides like legs; the arm is a pair of pincers folded in front like mandibles; the hopper is a belly tray under the body; head pod tucked in a recess. Proportions: 0.5 m tall, 0.7 m wide, 0.95 m long. Reads as: a bug, a creature of the shore; the shell lift is the character move.

Pick one for the first, then draw the others as variants. Each must pass the checklist below.

## 11. Common mistakes
- Making it too clean, too shiny, or gleaming white. It is 30+ years old.
- Tracks that do not leave prints, or prints that never wear off, or that cut through water.
- Sinking too deep (it floats where people sink to the ankle) or gliding without a mark.
- A face: eyes, a mouth, tears, anything that reads as speech. One lamp and a head tilt only.
- Perfect behaviour. It must stick, pause, pick the wrong thing and work an empty beach.
- Speed like a toy car: it crawls at 0.2 m/s, about 0.7 km/h.
- All litter identical, the same size, all colours; real litter is faded, buried and half-weathered.
- Rust everywhere in the same orange; rust follows water paths, fixings, and splash height; aluminium and plastic age differently.
- Barnacles on a dry upper-beach machine.
- Tracks aligned perfectly parallel on a curved line; add small jitter.
- Brands, logos, real text, real place names.
- Solar panel facing away from the sun.
- Hopper that never fills or never empties (breaks the economy).
- Over-delivery with no consequence, or a consequence with no way back.

## 12. Visual and behaviour checklist
Look:
- [ ] Reads at a glance as a dog-sized, tracked machine (size beside a seal, a person's boot or a bottle).
- [ ] Solar shell, grabber arm, hopper and one lamp all visible in the silhouette.
- [ ] Faded paint, chalky top, salt crust at the bottom, rust runs under fixings.
- [ ] Sand-scoured lower band, dirty tracks, a cracked cover or patched part.
- [ ] No brand, no text, no face.
Tracks and ground:
- [ ] Two parallel prints with cross-hatch in damp sand; soft blurred trough in dry sand.
- [ ] A lighter clean strip behind it and litter ahead; prints gone below the swash line after the tide.
- [ ] Small scuff at every pick spot, a fan of prints where it turned.
Behaviour:
- [ ] Parks facing the sea; head tilt on unknown objects; shake off sand on wake.
- [ ] At least one wrong pick per 30 picks, one pause for the swash, one stuck per few days of rough sand.
- [ ] Always one status lamp colour at any time; never two colours.
- [ ] Never tracks a person, never speaks.
Economy:
- [ ] Headless tests in section 9 pass; the player can always recover from over-delivery.

## 13. What is faked in the game
- The picking: no real object detection; it picks from the wrack list inside its reach and the sim does only counts, not individual objects (people counted, litter counted; items shown are picked from a seeded sample).
- The sand: tracks are a decal/height-map stamp with a decay rate by wetness, tide and wind; no soil mechanics. Slip and sinkage come from a table.
- Solar and battery: a simple sun-hours-times-factor; no cell physics.
- Wear: a single age dial per machine that selects texture set and some damage decals; no real corrosion model.
- Litter supply: seeded counts per tide from the wrack model; composition and mass from a table; no object-level physics.
- Sound: a few looped samples and one-shots, mixed by state.
- The tender: a fixed schedule with drift; no pathfinding beyond the existing sea routes.

## 14. Could not verify (short list)
- Real beach-robot dimensions, tracks' width, and field reliability; only a distributor catalogue for weight, speed and run time, and press numbers vary (3 to 8 h run time).
- Ground pressure of any real small tracked beach robot (the 2.9 kPa is computed from my own inputs).
- Wind speed at which dry sand tracks are erased on a real beach (I only have the mechanism); the 6 to 8 m/s figure is a recalled order of magnitude.
- Bearing capacity (cone index) of damp vs dry beach sand; I only have qualitative statements.
- Strandline-only litter counts per metre per tide, and decadal accumulation after a collapse.
- Aluminium pitting rates and distance-from-shore chloride deposition.
- Field timescale for plastic breakdown on a beach (only lab months).
- Annual sun hours and insolation for a northern Atlantic coast (I used recalled values, PLAUSIBLE).
- Real sound recordings of tracked beach machines.
