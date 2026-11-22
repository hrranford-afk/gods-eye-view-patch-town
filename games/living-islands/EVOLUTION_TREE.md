# Living Islands: evolution tree (design note, no code)

Status: PLANNED. Owner decisions recorded 22 Nov 2026.

## Owner decisions
1. **Tone: hopeful, but with real stakes (updated 22 Nov).** Rebuilding, not fighting. No weapons, no violence between people.
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
