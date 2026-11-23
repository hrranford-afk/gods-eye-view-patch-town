# Living Islands: evolution tree (design note, no code)

Status: PLANNED. Owner decisions recorded 22 Nov 2026.

## Owner decisions
1. **Tone: hopeful, but with real stakes (updated 22 Nov).** Rebuilding, not fighting. No weapons, no violence between people.
   **Owner update (23 Nov): violence is allowed if it is justified by the story** (real danger, not gratuitous). CAIRN's reading: it stays hopeful overall and nothing gory or cruel for its own sake. Owner to correct if that is wrong.
   **Neglect has consequences: settlers can fall ill, starve, or be lost, and a colony can fail and you start again.** It is not a game where everyone just survives. Handled quietly, never graphic.
2. **The old world appears as ruins and salvage.** Small finds give story moments and unlock ideas.
3. **Look and geography: Hebrides-style Atlantic coast, plus one sheltered harbour island.**
   Real places are reference statistics only. No real names in code, assets or recipes.
4. **Dial: Guided to Free**, set at the start and changeable any time. Same world, same rules; only how much the game steers changes.

Backstory (one line, never lectured): the old world ended; the first people arrive by boat as survivors and begin again.
Fits the existing contract: `world_seed`, `arrival_seed`, `play_style`. Nothing here changes physics or resources.

## The one rule
**One visible loop per era. At most 3 new ideas per era.** The tree unlocks by doing, not by menus.
A single "what you need next" card is shown; never a wall of numbers.

## Eras
| # | Era | You do | New ideas (max 3) | Unlocked by |
|---|---|---|---|---|
| 1 | Landing | shelter, fresh water, fire, food | camp, tide, first stores | arriving |
| 2 | Foothold | gather timber and stone, build a landing stage | jetty in stages, rowboat, jobs | tents up + stores filled |
| 3 | Village | houses, gardens, a shop | homes, household (grow / shop / cook / eat out), shop economy | a landing stage works |
| 4 | Trade | boats to other islands, meet a skipper | imports and exports, materials (stone, slate, lime, paint), freight | a surplus worth shipping |
| 5 | Craft | workshops, power, better houses | generator and cables, architects (plans), upgrades | a working village |
| 6 | Remembering | salvage, relearn old knowledge | ruins, finds, old-world know-how (radio, glass, medicine) | trade routes reach ruins |

Eras 3 and 5 reuse City Lab work (district economy, power network). Era 1 is drawn in the owner's reference pack. Eras 2 and 4 need their own design.

## Stakes: how failing works (fair, quiet, never cruel)
- **Slow, visible decline, never a sudden death.** Needs drop in stages (tired, hungry, ill, failing) and each stage is shown early on the "what you need next" card.
- **Always a way back until late.** Rescue options exist (a visiting skipper, a rest day, a ration) until a colony is truly lost.
- **Stuck and sad is a real state:** a colony that survives but never grows shows it (idle people, bare camp, no new ideas unlocked) and the card says why.
- **Loss is a counted number, not a tracked person's story:** people are counted, never tracked.
- **Dial:** Guided warns early and softens; Free lets it run. Same rules.
- **Age rating is undecided** (see open questions). Death stays implied and off-screen either way.

## Ruins and salvage (hopeful tone rules)
- Finds are quiet: a washed-up crate, a rusted frame, a radio that still has a battery.
- No gore, no violence. Ruins are places to learn from.
- **A failed colony becomes the next game's ruin.** Start again and your earlier settlement is out there on the map as salvage, with its own finds. Failure feeds the next run.
- A find unlocks an idea or a part, never a weapon. Each find has a place, a story line, and a reward you can use.

## The sea brings things (owner idea, 22 Nov: the flow system is a key part of the game)
Currents and tides carry things past and onto shores. The same flow field that moves the visible sea decides where things go.
- **What drifts:** shoals of fish (counted as shoals, never tracked as individuals), driftwood, shells, seaweed, crates, bottles with messages, and wreck debris from the old world. Storms bring more.
- **Where it comes from:** other islands, the open sea, and old-world wrecks. Seeded and deterministic, never pre-placed.
- **Where it lands:** gentle shores and coves catch it at high tide as a strandline (wrack). Headlands and fast channels lose it.
- **What the player does:** watch the water (the "Eyes on the water" idea: spot a clue, go ashore, bring news home), set nets or a catch line in a cove, build a jetty or watch post where things collect, send a boat to meet a floating find before it drifts away.
- **Why it matters:** fishing, timber, salvage and story finds all arrive this way, so geography and tide set the economy. It ties into era 6 (Remembering): ruins and salvage.
- **Rules:** finite supply, a ledger with idempotent event keys (a find is claimed once), people counted not tracked, hopeful tone, no gore.
- **Measure first:** how many items per tide a shore catches, and whether the choices have a real trade-off.

## Wildlife (owner decision 22 Nov: real wildlife of this cool Atlantic sea, plus a rare turtle legend)
Real species, true to the Hebrides-style coast we chose. They use the same tide, seabed and flow as everything else, so the world feels alive and the player's choices matter to them.
- **Real wildlife (the base):** seals hauling out on rocks at low tide, seabirds nesting on skerries and cliffs (puffins, gannets, terns, gulls), otters along the shore, fish shoals riding the currents, kelp beds by depth band, basking sharks and dolphins passing, sea eagles overhead. Behaviour, seasons and habitat come from real research (see research/WILDLIFE.md when written).
- **The legend (rare, glimpsed):** a giant tide-turtle that is part of the island's stories. It is seen only rarely, at certain tides and seasons, and the settlers talk about it. A real leatherback turtle can be the believable seed of the legend (real leatherbacks visit these waters to feed but do not nest here). Whether the legend is ever more than a glimpse is left open and mysterious.
- **Player choices (hopeful tone, nothing cruel on screen):** protect a skerry or a seal haul-out (keep boats and building away), share the shore (some are disturbed), or build there and lose them. Healthy wildlife can feed fishing, trade, stories and song later.
- **Rules:** deterministic from the seed, finite, ledger events with idempotent keys, nothing cruel on screen, animals counted not tracked.
- **Measure first:** how many suitable haul-outs, skerries and kelp beds a seed offers, how disturbance and seasons change numbers, and whether protecting is a real trade-off.

## The machines that kept working (owner idea, 23 Nov: an optional later layer, era 6)
The old world's automation survived without people: boats, buoys, lights, weather stations and freight routes still run their jobs. Nobody is home.
**Owner decision (23 Nov): they are hard-coded relics, not thinking AI.** They were programmed before the collapse, when there were computers and data centres to build them. Those are gone. No learning, no conversation, no reprogramming from afar. They are rule-driven machines with fixed schedules, the plain automation that outlived everything cleverer, and the deliberate contrast is with the conversational, learning AI of 2026 (now), which needed data centres and is gone. The player meets them as **co-inhabitants of the planet**, the way they meet seals or seabirds: an animal-like presence with habits, routes and needs, not a mind to talk to.
- **How they behave:** finite-state routines on old schedules (sail, load, unload, charge, wait), triggered by time, tide, light and sensors. Predictable, literal and brittle: they follow the rule even when the world has changed (a supply boat still calls at a drowned port; a beacon keeps flashing for no one; a net-hauler keeps working an empty shoal).
- **Like a species in the ecosystem:** each has a territory (its route), needs (sun, fuel, parts, a mooring), seasons (they sail in the old timetable, shelter in storms by old rules) and slow decline (wear, rust, drift in their clocks, odd bugs such as a boat circling a buoy). Some affect the world: an unmanned dredger reshapes sandbars, a trawler depletes shoals, a light draws seabirds.
- **How the player interacts:** observe and learn the pattern (the 'Eyes on the water' game), time a landing to meet a boat, salvage parts, repair or restore a route, borrow cargo, or leave them be. The hard-coded rules can be exploited or disrupted with hardware (move a mooring, cut a cable), never persuaded.
- **Tone:** quiet, eerie-hopeful, never a villain, no weapons, nothing violent. Indifferent routine, like a clock still ticking in an empty house.
- **Why it fits the systems:** routes follow our currents, tides and depth; each job is a deterministic state machine seeded per world; deliveries and hauls go through the ledger with idempotent event keys; wear and failure are scheduled by the same weather and storm seeds. Era 6 (Remembering) already holds ruins and salvage; this is the living version.
- **Rules:** no real brands, companies or product names; original machine designs; people counted not tracked; hopeful tone.
- **Risks to watch:** if the machines do all the work the struggle disappears (so they are scarce, slow, brittle and wearing out); once understood they become predictable (so add wear, drift, weather and edge-case failures); avoid the 'AI turns on us' cliche.
- **Measure first:** how many routes and machines a seed supports, and whether finding one opens a real trade-off for the player.

### The first relic: the beach litter collector (owner idea, 23 Nov)
The first old-world machine the settlers meet is a small, worn litter collector still working a beach: picking up bottle tops, glass and plastic bits on a fixed route, returning to charge in the sun. Hard-coded routine, no voice, no conversation; read by watching it (pauses, sticks on a rock, picks up a shell by mistake, works an empty beach).
- **Owner look decisions (23 Nov):** dog-sized (about 60 cm tall, 1 m long), on tracks that leave patterns in the sand which the tide washes away (a visible clean strip shows progress). Character comes from behaviour, light and sound, not speech.
- **Some islands catch more than others:** where the flow and tide deliver things decides which shores are rich. A seed with a rich catch island can speed progression, a poor one slows it. Uses the existing flow and wrack model; measure per seed before relying on it.
- **A family of collectors (owner idea, 23 Nov):** not one robot but a small family sharing one design language (tracks, solar shell, status lamp, tip-up panel), each with a different job. Working roles from the concept sheet: tortoise = the standard beach cleaner (the first one met), terrier = a quick scout, wheelbarrow = a hauler, beetle = a sun-seeker and sorter. The player finds them one by one over the eras, so the first meeting stays special. All stay hard-coded relics: the family feel comes from shared looks and small fixed habits (the little one trails the big one, they park together), never from thinking or talking. Risks: scope, and machines doing all the work (so they stay scarce, slow and brittle). Shared parts also make them cheaper to build. Open: which roles, how many, and in which eras.
- **Teamwork between the family (owner idea, 23 Nov; rough, not decided):** each does a different part and they perform best together. Candidate mechanisms to test in the headless sim before any build: a relay chain (scout finds a strandline, hauler carries, sorter sorts, tortoise cleans); complementary roles (one is fast but carries little, one is slow and carries a lot); shared charge and the sun (shell-tipping sorters shade or charge others); the tender's timetable as the clock that sets the pace; traffic and queues at the landing; a missing member makes the rest wander or stall (a quiet failure cascade); the player as a dispatcher choosing among a few FIXED route cards (not programming, so they stay hard-coded relics). Watch for: machines doing all the work, and too many parts. Park as ideas until the gameplay settles; the world comes first.
- **Owner pick (23 Nov): the first collector is design A (tortoise) with design D's tip-up shell.** Hero model, then the other family members built from its shared parts (tracks, lamp, shell, hopper).
- **What is inside the shell when it opens? (owner question, 23 Nov; open):** the tipped shell halves reveal something that happens inside, a small secret that rewards watching. Candidates: a tiny sheltered seedling bed it has been tending, a sorting tray where it lays out the day's finds by kind, a hidden compartment with one kept object, a small radio that picks up a faint signal, or glowing charge cells. Let the residents propose more through the quirks brief. Must stay a hard-coded routine (no thinking), and pay off visually without needing words.
- **Early and optional:** appears in era 1 or 2 as the seed of the machines layer; never required, so the "shun the past" path still works. People, sea and wildlife stay the main cast.
- **Why it earns its place:** teaches the pattern idea (its route shows where things wash up) and its hopper is a small believable first source of hard-to-get materials (glass, metal, plastic), feeding the scavenging ladder.
- **Player choices:** leave it, keep it charged, move its charging spot, take it apart for parts. Each has a cost. Open: repair and keep it as a slow, brittle helper (CAIRN leans yes, never doing the work for the player).
- **Rules:** no brands, no talking or emotional manipulation, quiet decline never violence. Research first (RESEARCH_FIRST.md) before any look or build.

### The tender ship and the rubbish economy (owner idea, 23 Nov)
The litter collectors have a reason to be there: a larger old-world tender ship drops them off and, on an old timetable, comes back to collect what they gathered.
- **The tender is a relic too:** hard-coded, brittle, on a fixed seeded schedule (it still calls whether or not anything is loaded, drifts late as its clock wears). Its route follows the real sea (tide, current, depth). Optional, never required.
- **Player use:** the player can ask for deliveries (rubbish dropped at a chosen landing) and build from it: glass, metal, plastic, cloth. This feeds the scavenging ladder (a hopper, then a delivery, then a stockpile).
- **The risk is the game:** deliver too much, or build too slowly, and the shore is buried in rubbish. Quiet stakes only: wrack and litter crowd the landing, harbour mouths silt up and foul, wildlife leaves (seals, nesting birds), boats get fouled, settlers fall ill slowly. Never graphic. Always a way back (clear it, sort it, ship it out, stop deliveries).
- **Owner decision (23 Nov): piled rubbish drives the seals away.** Seals leaving is the clearest sign something went wrong, and it can be undone (clear the shore and they can return). All of these tender, relic and rubbish ideas are rough: to be tied to the island systems before anything is built.
- **Rules:** finite supply, ledger events with idempotent keys (a delivery is claimed once), people counted not tracked, no brands, hopeful tone.
- **Measure first (headless):** how much a collector gathers per tide, deliveries per tender visit, the build-versus-pile-up balance, and whether the player can always recover.

### Light, fog and the lighthouse (owner idea, 23 Nov)
Fog and night are the time to play with light. A lighthouse (or any signal fire) tells other people you are here, and more people arrive.
- **Signal ladder:** a fire on the headland, then a lamp on a post, then a built lighthouse with a lens. The lens needs glass, which ties to scavenging (litter collector, ruins, trade). Each step reaches further and shines through thicker fog.
- **Arrivals:** new settlers and visiting boats come on the existing seeded arrival schedule. Light range, fog, weather and tide set how many see you and how many make landfall safely (counted, never tracked).
- **Stakes, quiet:** more people means more mouths. A light also draws boats into a reef if the harbour is not marked. Hopeful tone, nothing graphic, always a way back.
- **Machines:** old beacons that keep flashing for no one fit the relic layer (hard-coded, no thinking). The player can restore or ignore one.
- **Look:** fog with a visible beam, night glow, warm windows, sea glitter, flash patterns that identify each light. Must work in AR (no screen-space tricks; cheap beam cards) and on handheld budgets.
- **Research first (RESEARCH_FIRST.md):** how far a light can be seen (height, power, atmosphere), flash characters, how fog scatters light, lens optics, fuels, so the numbers are real before any build. Depends on the sky clock and the weather.

### Weather needs beautiful days too (owner note, 23 Nov)
The eight weather states lean grey (overcast, rain, fog, storm). Add the lovely ones, and let them be earned by the same seeded schedule, not random decoration.
- **Candidates:** rainbow (and double rainbow) when sun is low behind the viewer and rain is ahead; sun showers (bright sun through a passing squall); crepuscular rays through broken cloud; frost mornings and sea smoke; first snow dusting; halo and sun dogs in high cloud; a clear starry night (and aurora as a rare treat); post-storm clearing with glittering wet shore; mist burning off.
- **Region:** our coast is a cool Atlantic one, so a true tropical storm does not fit. The bright-sun-with-violent-squall look does (a sun and showers day). Whether another climate ever appears (a different world from the bigger world) is a taste question for the owner, not decided.
- **Hooks:** these should tie to the sky clock, the macro sea (storm track clearing), wildlife, crops and moods. Rainbows need sun elevation under about 42 degrees and rain on the opposite side from the sun.
- **AR:** there is no sky dome in AR, so skyline effects (rainbow, rays) need a table-scale version or a skip. Research that before building.
- **Research first (RESEARCH_FIRST.md):** rainbow geometry and brightness, sun shower physics, frost and snow conditions at this climate, halo types, then the look in the page.

### Unfinished projects and the old crews (owner idea, 23 Nov; rough)
One possible reason the old world fell: people got comfortable and handed more and more to cheap automation, until little was left that anyone still knew how to do. This is a hint to find, never a lecture, and the cause stays mostly unexplained (the backstory remains one line).
- **Unfinished works:** some islands hold projects the old world had started, with their machine crews still following the plan: a tidal or water turbine and its cable to shore, a causeway, a harbour wall, a signal mast. The crews are hard-coded relics that keep building to a stale plan (in the wrong place, for a sea level that has moved, with materials long run out).
- **Player choices:** leave them, help finish a project (work with the crew to complete it), redirect them with a few fixed route cards, or salvage them for parts. A finished tidal turbine gives electricity, which fits the craft era (generator and cables) and the City Lab power network.
- **The sea sets the site:** a turbine only works where the tidal stream is strong enough, so the flow field and macro sea decide where such a project makes sense. A group of islands can share one project (a cable between them).
- **Stakes and tone:** quiet and hopeful. A half-built project can be a hazard or a gift. Never preachy, no villain, nothing graphic.
- **Rules:** finite, seeded old-world slots (as for ruins and wrecks); ledger events with idempotent keys; no brands.
- **Research first:** how tidal stream turbines really work (flow speed needed, rotor size, cable landfall, maintenance, how they fail), then simulate in the headless sim before drawing.

### Each island can host its own small game (owner idea, 23 Nov; experiment, not a course)
Keep gameplay fluid: instead of one fixed path, different islands can carry different small games or loops, and we learn which are fun by trying them. The world, the sea and the ledger are the shared spine; the games sit on top.
- **Examples that follow the island types we already draw:** harbour island (trade and boats), lagoon (fishing and gardens), lighthouse island (signalling and arrivals), volcanic island (geology and tinkering), ruins island (salvage and relearning), turbine island (finish the old project and bring power), collector beach (the relic family and the rubbish limit).
- **Rule to keep it from sprawling:** every island game follows the one-visible-loop rule, uses the shared ledger (idempotent keys), the same sea, tide and weather, and must be fun in its first five minutes before it gets more. Experiments that are not fun are parked, not forced.
- **How we graduate one:** build it behind a switch, test it headless first (the ecosystem sim), show it to the owner, keep it or drop it. Nothing is locked.
- **Play it your way still holds:** the player picks which islands' games to lean into.

### Our own globe: where the sea's gifts come from (owner idea, 23 Nov; research first)
The table is a window onto a bigger world, so let the bigger world be real: a seeded procedural planet (continents, ocean basins, climate zones) with large-scale ocean circulation (gyres and currents). Our island table sits at one place on it. Drift, animals, ships and people arrive from other places, along routes the currents really carry them, over days to years.
- **What it adds:** flotsam and wreck debris that has a *source* and a journey; warm-water and cool-water species that wander in on currents (a tropical seed pod or a stray turtle from the south); storms that start somewhere; ships and survivors arriving from specific shores; seasons and climate that make sense. It replaces "items appear locally" with "items arrive".
- **How it ties in:** the existing macro sea state (storm tracks, swell trains, tide, keyed arrivals) becomes the boundary of the globe's flow at our window. The rich-catch islands (shore catch) then depend on what the currents bring, not only the local shape.
- **Scale:** a coarse globe is cheap (a few degrees per cell); drift is a particle simulation, so it fits headless runs on the hardware. A spinning-globe view page could show where a find came from.
- **Stage it:** (1) research note (ocean circulation, real drift speeds and times, leeway of floating objects, climate zones); (2) headless globe: continents, a gyre-like flow field, source regions, drift particles, and an "arrival table" per world seed (what arrives, when, from where); (3) feed arrivals into the macro sea and flow passes; (4) a globe view.
- **Risks:** scope (keep it coarse and deterministic), and plausibility traps (do not pretend to be real geography; no real names). Measure whether it changes the player's choices before any drawing.

## Play it your way: embrace the past or keep life simple (owner principle, 23 Nov)
The old world is a choice, never a requirement. The machines, ruins and salvage are a cherry on the cake: something to rediscover if you want.
- **Embrace the past:** salvage, repair and restore routes, borrow what the old world left, rediscover lost know-how (radio, glass, medicine). Faster and richer, but it ties you to fragile relics, strange failures and what they cost to keep running.
- **Shun it:** leave the relics alone and live by local craft: gardens, boats, timber and stone, the sea's own gifts. Slower and simpler, but sturdy, self-reliant and yours.
- **Both paths must be viable and honest:** neither is the 'right' one and neither is a trap. Each has real costs and real rewards, and the game never scolds. A mix is allowed, and you can change your mind.
- **Consistent with the rules:** no automatic upgrade is always better, the world is the same either way, and only how much the game steers changes (the Guided to Free dial).
- **Measure first:** a headless run of each path to check that both reach a stable village, and that neither dominates.

## Hooks to keep in mind while building worlds (cheap now, so later ideas drop in)
Not commitments: small design habits so the machines layer, wildlife, weather and the ledger can be added without rebuilding the world.
- **One world data format** (seed, terrain field, rock map, tide, flow, weather seed) that everything reads; no feature draws its own private copy of the land.
- **Every event goes through the ledger** with an idempotent key (find, delivery, storm, nesting season), so machines, wildlife and the player all share one history.
- **Landing and harbour sites are first-class** (the foundry and seabed already list them), so a ruined jetty, a beacon or an unmanned boat's mooring can be placed at one later.
- **Old-world slots per seed:** a few seeded places where ruins, wrecks or beacons can appear (era 6), chosen by shore type and flow, not hand-placed.
- **Routes follow the real sea:** boats, drift and machines all use the same current, tide and depth field.
- **Weather is a seeded schedule,** not random per frame, so storms, sea state, sediment events and wildlife seasons agree.
- **The table is a window onto a bigger world (owner, 23 Nov).** Storms, swell, tides, currents, drift, animals and ships come in from outside and are far bigger than the window. They come from a seeded macro state (storm track, swell trains with arrival times, tide boundary, large-scale current) that the window reads as boundary conditions, so the weather schedule, sea state, flow and arrivals all agree. Research first: research/SEA_STATE_AND_OUTER_WORLD.md.

## Household loop (era 3 detail)
Grow at home (garden, plot, place) / shop (nearest open shop with stock) / cook at home (hearth, fuel, ingredients, time) / eat out (cheap, close, short on time). Needs push; trade and temperament nudge. People are counted, never tracked.

## Gardens (era 3)
Recipe data, validated like buildings. Decided by: place (wind, salt, rock, soil), who lives there, plot size, care and season, what the village needs, and a seed. Nothing pre-drawn; gardens grow over days.

## House bill of materials (era 4/5)
See `research/HOUSE_BILL_OF_MATERIALS.md` (figures are estimates; confidence tags there). A house tells you where the island trades.

## Open questions (not decided)
- Exact unlock thresholds per era (to be measured, not guessed).
- Age rating / who plays it (stakes may affect the family-safe rule that applies to the toy games).
- How much of the old-world story is shown vs left to find.
- Harbour island: which of the reference coasts sets its tide and boats.

## Next
1. Household-loop balance test (small, headless).
2. Era 2 and era 4 design notes.
3. Look test (running) supplies the visual bar.
