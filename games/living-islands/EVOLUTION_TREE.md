# Living Islands: evolution tree (design note, no code)

Status: PLANNED. Owner decisions recorded 22 Nov 2026.

## Owner decisions
1. **Tone: hopeful and gentle.** Rebuilding, not fighting. Nobody dies. No weapons.
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

## Ruins and salvage (hopeful tone rules)
- Finds are quiet: a washed-up crate, a rusted frame, a radio that still has a battery.
- No bodies, no violence, no fear. Ruins are places to learn from.
- A find unlocks an idea or a part, never a weapon. Each find has a place, a story line, and a reward you can use.

## Household loop (era 3 detail)
Grow at home (garden, plot, place) / shop (nearest open shop with stock) / cook at home (hearth, fuel, ingredients, time) / eat out (cheap, close, short on time). Needs push; trade and temperament nudge. People are counted, never tracked.

## Gardens (era 3)
Recipe data, validated like buildings. Decided by: place (wind, salt, rock, soil), who lives there, plot size, care and season, what the village needs, and a seed. Nothing pre-drawn; gardens grow over days.

## House bill of materials (era 4/5)
See `research/HOUSE_BILL_OF_MATERIALS.md` (figures are estimates; confidence tags there). A house tells you where the island trades.

## Open questions (not decided)
- Exact unlock thresholds per era (to be measured, not guessed).
- How much of the old-world story is shown vs left to find.
- Harbour island: which of the reference coasts sets its tide and boats.

## Next
1. Household-loop balance test (small, headless).
2. Era 2 and era 4 design notes.
3. Look test (running) supplies the visual bar.
