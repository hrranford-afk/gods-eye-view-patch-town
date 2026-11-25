# The Gift: the event deck (v0)

Files: `events.json` (the deck), `test_events.py` (schema tests, tone tests, a four-year simulation), this note. Written 25 Nov. Pure data and pure python. Nothing in the game reads the deck yet: this is the contract a builder would code against. Every number is a guess. All text is our own words, except six bottle messages that are quoted unedited from the town's list in `gift_day.js` (`BOTTLES`).

Run: `python3 gift/test_events.py` (tests, then a short simulation report) or `python3 gift/test_events.py --report`.

## What is in the deck
195 events: 5 prelude scenes (act 0, scripted, never drawn) and 190 drawn events (act 1: 54, act 2: 51, act 3: 48, act 4: 37). 104 are repeatable, 28 are forced (they fire the moment their trigger is true: the letters, the week-one beats, the year reports). 12 are the letters L1 to L12. 30 are about the great-uncle and the office (papers, objects, a coat, a telephone, a filing cabinet: never a person). Mood split of the drawn events: 46 percent good, 37 percent mid, 17 percent mild trouble (the target was about a half, a third and a sixth).

## File shape
```
{ "schema_version": 1, "registries": {...}, "events": [ {event}, ... ] }
```
`registries` lists every allowed value: kinds, locations, weather, tide words, time words, seasons, stock kinds, avenues, attitudes, moods, voices, counts, the act and credit-level day ranges, and every flag (with `set_by`: `game`, `deck` or `derived`, and a note). The tests refuse any value that is not registered.

## An event
| field | meaning |
|---|---|
| `id` | unique, letters digits underscore; starts with the act (`a2_...`, prelude `p0_...`) |
| `act` | 0 prelude, 1 to 4 (a year each: days 1-360, 361-720, 721-1080, 1081-1440) |
| `season` | list of `spring summer autumn winter`, or `["any"]`. Calendar: 360-day year, game day 1 is 1 May, spring is days 1-30 and 301-360, summer 31-120, autumn 121-210, winter 211-300 |
| `kind` | storm, find, stranger, neighbour, season, wildlife, robot, boat, letter, bottle, weather, clue, delivery, guest, uncle, build |
| `voice` | who speaks: `narration`, `helper` (letters L1 to L12 and the unread envelopes: plain, warm, never explains), `office` (the mainland business New Life Inheritance: formal, dull, a little suspicious, always incomplete, says what it is "not permitted to say"), `bottle` |
| `trigger` | see below |
| `weight` | relative chance among eligible events (1 is normal; strangers 0.25) |
| `repeat`, `cooldown_days` | `once` or `repeatable`; a repeatable event needs a cooldown |
| `force` | true: fires as soon as eligible, outside the random draw (letters, scripted beats) |
| `text` | the words shown, 25 to 260 characters (letters to 330), short and plain |
| `variants` | optional, by attitude: a replacement line for a letter |
| `choices` | optional (prelude only so far): `{id, label, effects}` |
| `effects` | `stock` (planks, rope, glass, metal), `flags_set`, `flags_clear`, `attitude` (points), `credit_delta`, `cash_delta`, `counts` (seals, birds, guests), `food_days`, `delivery_delay_days` |
| `cause` | required: what visibly happens on the map for the change to count (no counter moves without a cause) |
| `tags` | `avenue` (holiday, sanctuary, homestead, workshop), `attitude` (trust, distrust, investigate, share), `mood` (good, mid, bad-mild) |
| `source` | rights note: a story beat (pattern only), the town list, or `own words` |

### Trigger fields (all optional but day, tide, time and location)
`day_min`, `day_max` (inside the act), `tide` (`any`, `low`, `high`, `spring_low` = lowest water at or under -0.74 m so the Hoard bar is dry, `spring_high`), `time` (`any dawn day dusk night`), `weather` (list), `location` (one of 13 places on the Level 1 map), `flags_all`, `flags_any`, `flags_none`, `stock_min`, `stock_max`, `credit_level_min`/`max` (4 full, 3 slower, 2 thin, 1 the edge, 0 basics only), `cash_min`, `after` (event ids that must be done) with `wait_days`, `since_storm_days_min`/`max` (strangers come only 1 to 4 days after a storm), `robots_min`.

### Flags
Three kinds. `game` flags are set by the game itself (a robot started, a build finished). `deck` flags are set by events. `derived` flags are computed by the engine: `att_trust`, `att_distrust`, `att_investigate`, `att_share` (3 or more points; soft, they only lean the weights) and `stamps_seen_3` (three of the `stamp_*` flags). No event may set a derived flag.

## Where the Level 1 map limits an event (tested)
Home places are always reachable. The Hoard needs a boat, or `spring_low` on day 5 or later (the bar first opens day 5 at 22:01). The woods need a boat, or a spring low from day 6. The reef, seal island, bare rock, east skerry and open water need the boat flag. The test fails any event that breaks this, and any event whose day, season, tide and credit window can never all be true.

## How the game would draw from it
1. Once a game day (and again at dawn, dusk and night if the page wants more life) build the day state: day, season, weather, tide, credit level, flags, stock, cash, days since the last storm.
2. Fire every eligible `force` event. Then, with chance `DRAW_RATE` (0.62 in the test, tune it), pick one eligible event by `weight`, times a place factor (far places 0.5 to 0.6, because the player must go there), times 1.5 if one of its attitude tags matches a soft flag the player has (never zero for the others). With a smaller chance (0.12) pick a second.
3. Apply `effects`, mark `once` events done, stamp the cooldown, and show `cause` on the map first: the text and the counter change only land when the physical thing has happened (a boat lands, a robot drops a load, a crate is opened). The clock alone never moves a counter.
4. Letters are `force` events in the helper's voice. A `variants` line replaces the text when the matching soft flag is set.
5. The first night's bottle is chosen by seed in the page; set the matching `bottle_<n>` flag so the deck does not repeat it.

## The simulation (in `test_events.py`)
A seeded stand-in player with an attitude style walks 1,440 days, with a spring and neap tide model fitted to the Level 1 table (days 1 to 14) and a season weather table. It is a guess at a player, not a player. Over 40 seeded runs:
- about 710 events per run (690 to 731; a mean of one every 2 days; most are small ambient moments and repeats);
- events per season (mean of 40 runs): 47 to 63 in year one, 42 to 51 in year two, 32 to 41 in year three, 37 to 42 in year four (summer of year three is the thinnest);
- about 85 events fire more than once in a run; the most repeated are the robot and shore routines (a tin sorter about 25 times, shore finds 24, hulk salvage 20);
- dead stretches (10 or more days with nothing): 1.7 per run on average, the longest 18 days, none before day 100 in any of 40 runs, and 10 of 40 runs had none. Over all 40 runs: 5 in year one, 11 in year two, 31 in year three, 22 in year four;
- every drawn event fires in at least one of 40 runs.
Flaws: the sim player is crude (flags and builds follow fixed days, the stock is a random walk), weather by day not by hour, and the draw rate is set by hand. Treat the numbers as a smoke test for dead stretches and repeats, not a forecast.

## Rights
Beats are patterns only (see `research/GIFT_STORY_SOURCES.md`). The `source` field names the beat. The six town bottles are quoted unedited and the test compares them with a copy of the six strings. No quoted line comes from a book. Letters L1 to L12 are the words of `research/GIFT_LETTERS.md`. Prelude and uncle text is new (owner idea, 25 Nov).

## The office and the helper (voice rule)
Two hands, one source. The office (New Life Inheritance) writes dull, formal, third person ("this office"), hedges, and says the one thing it keeps saying: it is not permitted to say. The helper's letters L1 to L12 are plain, short, second person and grow a little warmer; they never explain and never ask. The tests keep them apart: the helper never says office, uncle or inheritance; the office never speaks of the old machines. "New Life Inheritance" is an invented name: `registries.human_check_names` flags it for a human to check it is not a real company before any public use. Clue rule: hints only, never proof; clues may contradict each other.

## Taste items in the deck
The letter L4 now triggers at the first winter (its words speak of winter), not at the first change of season. The L9 letter is the Great Wash of year three; the storm layer's day-3 "letter nine" text should be renamed or reused for L3. See `research/GIFT_WEEK_ONE_AND_SPINE.md`.
