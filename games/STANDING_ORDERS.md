# PatchTown standing orders for the games (set 11 Nov 2026)

Harry left the choice to CAIRN. Started: **order 1 only**, small. Others wait until order 1 has run well for a week.

## Order 1: the nightly almanac (STARTED)

- **Who:** the Town Brain plus the quick residents only. Not the slow Dell seats, not the resting Radeon seats.
- **When:** once a night, at a quiet hour when the machines are idle. About 20 minutes in total.
- **What:** each resident writes tomorrow's Base Camp day in the round-1 JSON shape (one colonist or creature, one event,
  one request), each item with "by". New colonists only if the name is not already taken; otherwise an event or request
  for an existing colonist.
- **Merge:** append to `games/base-camp/almanac.json` (keep every older item; the game picks what fits the day, weather
  and time). Check it parses.
- **Count honestly:** a line in `games/base-camp/ALMANAC_LOG.md` per night: date, seats asked, real answers, empty/broken.
- **Deliver:** push to `game/micro-precinct` if the PatchTown session can push; if it can't, keep the nightly files and
  hand them over in one paste, as on 11 Nov.
- **Stop rule:** if two nights in a row give fewer than 2 real answers, pause and tell Harry.

## Waiting (not started)

2. Diary voices (20 lines per creature in its own voice).
3. Reading the colony's diary back (needs the game to send its diary; not built yet).
4. Spark sessions (ran once as a trial on 11 Nov).
