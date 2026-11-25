# The Gift: the story spine, week one, the clue map and the event deck

Status: design note for the owner, written 25 Nov. Plain words. Taste items are marked TASTE.
Tags: FIXED (a rule from BUILDERS_OVERVIEW.md), MEASURED (read from the Level 1 files), TUNING (a design number, a guess), GUESS (my estimate), TASTE (the owner decides). Confidence in the schedule numbers is LOW to MED: none has been played.
Files that go with this note: `gift/events.json` (the deck), `gift/test_events.py` (tests and a four-year simulation), `gift/EVENTS.md` (the schema and how the game would draw from it).
Rails kept: hopeful; nothing gory or cruel; robots are relics with no faces, speech or feelings; the helper is never shown, never proven and never named as an AI in act one; people are counted, never tracked; own words only (the six town bottles and the owner's prelude letters P1 and P2 are quoted exactly); all money is in-game; no real brands or places. One name is invented and needs a human check: New Life Inheritance (see section 7).

## 0 Headlines
1. The game asks one question: is help a gift or a leash? It never answers. Each year (act) presses on it from a new side: trust, doubt, shared use, standing alone.
2. The helper is a schedule of fingerprints, not a character. 62 clues (46 from v0, 5 world kindnesses and 11 critic clues in v2) are placed on named spots of the Level 1 map. None is proof, and several contradict each other on purpose.
3. The prelude is an inheritance: two letters through the door, a formal office, and an estate nobody can place on a family tree. The office says it is "unable to answer questions". The helper's letters say it plainly and warmly, and never explain. The office and the helper are one hand in two voices.
4. Week one (days 2 to 7) is built so that no counter moves without a visible cause, and each day has one job that needs the player and a robot together. The day-5 Hoard run gets a lantern gate: the robots cross only behind a light the player carries.
5. The deck has 260 records: 253 drawn events (act 1: 76, act 2: 77, act 3: 60, act 4: 40), 7 prelude records. Mood of the drawn events: 47 percent good, 38 percent mid, 15 percent mild trouble. A four-year simulation gives about 766 events a run and a dead stretch (10 days of nothing) 1.2 times a run, none before day 100.
6. Biggest gaps: the game does not read the deck yet; Job 5 (make it physical) is not built; there is no sound at all; the thinning is not shown on screen; distrust and share events are thin in the deck (23 and 27 tagged, against 105 for trust).

## 1 The prelude: the inheritance (before day 1, about 8 minutes)
Replaces the plain envelope and train of THE_GIFT_OPENING_HOUR.md for tone; keeps its doubt, its one bag and its boat. Built first as illustrated cards with small moving touches (GUESS: 5 to 7 developer days, from EVOLUTION_TREE.md). The mainland is an invented grey loom town: rain, wet pavements, shut shops, sodium light. Gentle and kind, not bleak. No town name in the game.

Two voices. Learn them now, they come back for four years.
- **The office** (New Life Inheritance): formal, dull, a little suspicious, third person ("this office", "we"). It hedges and it keeps saying it is not able to say.
- **The helper** (P2, then L1 to L12): plain, short, second person, warm, restrained. Never explains, never asks, never lies.

**P1 and P2** arrive together through the door. They are quoted exactly from `research/GIFT_LETTERS.md` and the test checks they are not edited.
> P1 (office): Dear beneficiary, We write on behalf of an estate that has named you. There is nothing for you to pay. Enclosed are a key, a deed to a small island, and a personal letter left for you. Please read the letter before you decide anything. If you choose to visit, a boat will be arranged. We regret that we are unable to answer questions about the estate. New Life Inheritance
> P2 (helper): Dear you, I am sorry we never met. I would have liked to. Somehow it was always easier to send something than to turn up. So I helped from a distance, in small ways you may not have noticed. I am leaving you an island. It is not much, but it is yours, and it is quiet. There is work to do there, and I think you will be good at it. Take your time. Whatever you make of it will be right. With love, from a distance.

Rule for the helper's voice (FIXED, from GIFT_LETTERS.md, tightened in v2): it never lies and does not say everything. At most it may say "someone who has always thought of you as family"; P2 now does not even say that. It never says "I am your relative", and no official voice (the office P1, the clerk, the deed, the replies) ever states a relation as fact: P1 says only that an estate has named you. The inference "a relative left me this" is made by the player, a neighbour or the town (the visitor of a3_stranger_asks_uncle), never by the helper or the office.

Five scenes. One small choice each. Each choice moves a soft attitude by one point or sets a flag; none is right.
| # | Scene | What it shows | What the player does | The choice (flag) |
|---|---|---|---|---|
| 1 | The flat (the workbench) | A kitchen table in rain light: a laptop on a cookbook, a robot hoover in pieces, tiny screws. The player is a mender who fixes neighbours' things for tea (default). The part that fits arrived in the post, unasked, as the last four did: that is the first fingerprint, and the answer to P2's "easier to send than to turn up". A small plain mark on the hoover's board, hint only. The two letters, a key and a deed wait by a cold cup. | Replaces one part (a tiny hands-on repair that teaches the move used on the island: open, find the worn thing, swap it). Reads P1, then P2. Packs the one bag. | What goes in the bag: seeds (bag_seeds), a book of tide tables (bag_book, +1 investigate), a small lamp (bag_lamp), the small toolbox (bag_toolbox, +1 investigate: an early repair option, a1_toolbox_first_repair). |
| 2 | The street | Wet pavements, shut shops, a mill hum that has not stopped. **The one thing worth missing (v2):** the cafe doorway, warm and smelling of toast, with a strip of the town's carpet laid on the step against the rain, a close grey diamond weave. A woman sweeps her step and nods. A notice in a window. | Walks to the station. | Leave the last coins in the tin (street_gave, +1 share); read the notice (street_notice, +1 investigate); walk on (street_on). |
| 3 | The office | A small dull office. A clerk reads the papers aloud without looking up. A coat on a hook by the door. A brass key in a paper fold. A different name signed on every page, seen only as marks. The clerk says it is unable to answer questions. | Listens. Signs, or does not. | Sign where it says (+1 trust); ask to read it twice (+1 investigate); ask for a copy first (+1 distrust). |
| 4 | The station | A small station, a late train, steam on the glass, a board of parcels held back. Nobody alarmed. | Waits, rides. | Hold the door for a woman with a pram (+1 share); study the board of delays (+1 investigate); sit and watch the rain (none). |
| 5 | The quay | The end of the line. A small boat, engine low. The palette flips from grey-brown to teal and gold as the boat leaves the wall. The town shrinks. | Steps aboard with the bag and the key. | Look back (quay_back); look ahead (quay_ahead, +1 trust); turn the key over (quay_key, +1 investigate). |
**The mender prelude (owner idea, 25 Nov).** The player was chosen because they fixed robot hoovers at a kitchen table, doing their best, for neighbours, for tea. That is the one small thing worth missing: neighbours who knew them, a toaster mended, a wave across the road. The three island events a1_cousin_belt, a1_cousin_board and a1_toolbox_first_repair make the island carriers the hoovers' older cousins, same belts and boards, only bigger and older: hint, not proof.
**The mainland's one small good thing (v2, critic review).** The grey town is gentle, not bleak, and it has one thing the player may miss: the cafe doorway with its strip of close grey diamond-weave carpet, the toast smell, and a neighbour's nod. It is never explained. The carpet pattern is the object that travels: months later the spare lamp lens arrives wrapped in the same weave with a thread of teal through it (a2_clue_lens_carpet, clue 59). The player can read the teal thread as the island's palette entering the town's pattern, or as nothing at all.
The prelude ends on the boat. Cut to dawn on the beach. The first letter on the island is L1 (the key).

The relative idea of the owner (a great-uncle who has died) lives as an unspoken guess: nothing official ever names a relative or a relation. A player will say "my uncle" by themselves, and so may a neighbour or the town. TASTE: keep the word "uncle" off the cards (the deck `kind` "uncle" is only an internal tag for the inheritance thread). Everything about the estate is papers and objects. The person is never seen. FIXED rule 3 holds.

## 2 The story spine

### 2.1 The question and the four acts
The question under every act: **is help a gift or a leash?** The player decides. The game never says.
| Act | Game days | What it is | How it presses on the question | Season of the first and last day |
|---|---|---|---|---|
| 1 Arrival and trust | 1 to 360 | Doubt, then trust. Everything works. Deliveries are quick. A first storm, a first Hoard, a first winter. | The gift is too good. Nothing is asked. Is that kind or is it a trap? | spring; spring (a year is 360 days from 1 May) |
| 2 Questions and the thinning edge | 361 to 720 | Stamps, a parcel before it was ordered, the first card turned over, the office that has no file. | If it can give, it can stop. The first thing disappears. The leash shows as a fray. | spring; spring |
| 3 The middle | 721 to 1080 | The Great Wash, neighbours, a workshop, a second island, fewer boats. | You start to give as well as take. Are you now the one on the other end of a gift? | spring; spring |
| 4 Standing alone | 1081 to 1440 | The last large parcel, basics only, a winter with no boat, a neighbour who returns a favour, the year-four report. | The helper is nearly gone. What is left is what you built, and who you gave to. | spring; spring |
Calendar (GUESS, TASTE): a 360-day year of twelve 30-day months. Game day 1 is 1 May (the Level 1 tide model uses calendar day 121). Spring is days 1 to 30 and 301 to 360, summer 31 to 120, autumn 121 to 210, winter 211 to 300. This matches puffins in spring, common seal pups in summer, grey seal pups in autumn (FOOD_AND_WILDLIFE.md). Every season is 90 days (spring is split: days 1 to 30 and 301 to 360). The storm layer in `GIFT_STORM.md` counts 90-day blocks from day 1, so its blocks do not line up with these seasons: the deck calendar is the one to follow (see 2.8 and 'Needs the page builder' in STORY_REVISION_V2.md).

What each act hands the player, in one line each:
1. **Act 1.** "Is this real?" Proof by use: the barrel fills, the lamp lights, the robot starts. By day 30 trust is a habit.
2. **Act 2.** "What is it?" The stamp is everywhere. A reply from the office: its archive is incomplete, it holds no record either way, and it is not permitted to say more. A card turns over. The player may write to the office, count stamps, open a cabinet, or do nothing. All are fine.
3. **Act 3.** "What do I do with it?" The Great Wash drops 900 pieces on the strand. A neighbour's light appears. The player can share, keep, build a workshop, or buy a second island with cash. The helper's gift becomes the player's to give.
4. **Act 4.** "What is left?" Basics only. The last big parcel. A quiet winter. The shore gives, the neighbours return what was given, and the last letter says the sea is still giving if the player is still looking.

### 2.2 The helper's fingerprints, as a schedule
The helper never answers what it is. Each fingerprint is true in itself and fits many answers (a person, an old firm, a machine, a place that cares, luck). The test keeps clues to hints: no clue text may say proof, confirmed or certain.
| Act | New fingerprints (event ids in the deck) |
|---|---|
| Prelude | the right spare part arrives in the post, unasked, for months, and the plain mark is on the hoover's board (a hint, never proof); P1 postmarked in one quay town; P1 "unable to answer questions"; P2 "helped from a distance" and "always easier to send something than to turn up"; a different name signed on every page; a coat on a hook |
| 1 | The mark on the crate, the key, the robot chassis and the estate papers (a1_L1_key, a1_robot_chassis_stamp, a1_drawer_key); an oiled saw; a coat, a chair, a shelf of unread envelopes; the letter's two numbers match the island (a1_letter_coordinates); the tender ties its own ropes; the horn pattern three short, one long; bottles a little too well informed |
| 2 | A parcel before it was ordered (a2_parcel_early); the signature and the mark match (a2_stamp_signature); the office reply: archive incomplete, "no record either way", "not permitted to say" (a2_uncle_reply); same postmark, no name twice (a2_postmarks, a2_office_signers); a telephone in the lamp rings (a2_lamp_phone); a back room with nine folders (a2_file_cabinet); P2 and the crate letters are one hand (a2_P2_match); the hut door has no outside handle (a2_door_no_handle); a far light blinks the horn's pattern (a2_neighbour_light) |
| 3 | Hatches rather than doors (a3_hatches); a folder that matches a neighbour, a folder dated before the letter (a3_cabinet_neighbours, a3_cabinet_dates); the mark inside a glass float and a radio tone with no words (a3_float_stamp, a3_hulk_radio); the harbour log stops being filled (a3_log_stops); the visitor and the blank brass plate (a3_stranger_asks_uncle); the first late office letter (a3_office_cannot_say) |
| 4 | The last big parcel (a4_L11_last); the card "your file is closed" (a4_uncle_file_closed); the second late office letter, warmer (a4_office_late); the phone goes quiet (a4_lamp_phone_silent); the empty tender's last visit (a4_tender_last); P2 reread (a4_P2_reread); a crate on the shore with the mark and what a long winter wants (a4_odd_find) |
Contradictions kept on purpose (so nothing adds up to proof): the office says it has no file, but a folder in the back room is dated before its letter; the visitor says the brass plate has been blank for years, yet replies come; the postmark is one place, but one arrives in a gale; the phone number is the office's, but it rings at the lamp; the letters say "from a distance" yet the coat is brushed.

### 2.3 The four attitudes as soft flags
Four counters, 0 to 9: trust, distrust, investigate, share. Points come from choices (the prelude, a choice card, what the player does). A counter at 3 or more sets a soft flag (`att_trust` and so on). Nothing is ever locked or removed.
| Attitude | What raises it (examples) | What the flag does | Early cost | Late gain |
|---|---|---|---|---|
| Trust | Using the Hoard freely, wearing the coat, fitting the part at once, helping a robot | Weight x1.5 on trust-tagged events (105 in the deck). Letter variant: L6 "You have used what was given well." | none | none |
| Distrust | Asking for the copy, refusing Hoard stock, counting every crate, ordering little | Weight x1.5 on 23 distrust events. L6 variant: "You have not spent much. That is fine. It will wait." The hardest path (below). | Year one: less free stock. GUESS: the stock rate is 30 to 40 percent lower, because the player makes and gathers instead of taking; the yard fills slowly | Act 4: the thin edge costs nothing, because little was relied on. GUESS: the resilience lens is +10 (a visible line, never a grade) and the "basics only" card is not felt. Fewer dark weeks. |
| Investigate | Reading notes, lining up stamps, posting the letter, opening the cabinet | Weight x1.5 on 77 investigate events. L7 (the stamp) arrives only here. Extra clue beats. No answer, ever. | Time spent, not stock | The cabinet and the late letters read as a thread |
| Share | Feeding the stranger, giving rope, shipping a haul, holding the door | Weight x1.5 on 27 share events. L8 variant: "Some of them will need rope before the winter." Neighbours come sooner and return favours (a4_neighbour_return). | Less stock in the yard | A fuller chart and a festival that fills |
Rules: (1) no attitude removes events or closes a path; (2) distrust is the hardest in acts 1 and 2 and the easiest in act 4, so it is not punished, only slower to start (FIXED rule 1 and the owner's rule that distrust is hardest, from EVOLUTION_TREE.md); (3) a player can hold two flags; (4) the year report shows the attitude lean as one plain sentence, never a score.

### 2.4 The thinning-credit curve (GUESS, tune in play)
Two things thin, and they are different. The **credit balance** is spent by the player (£940,000 at the start). The **reach** is how much the helper's service can do: how many cards in the catalogue, how often the boat comes, how fast. Reach thins on a schedule whether credit is spent or not. This is why a thrifty player still meets the edge (and why distrust is not "free").
| Day | Reach (percent of year one) | Credit level (deck) | Boat comes | Order to arrival | Catalogue |
|---|---|---|---|---|---|
| 1 to 360 | 100 down to 92 | 4 full | about daily | 1 to 2 days | 10 cards on day 1, growing to about 40 as builds open |
| 361 to 720 | 92 down to 62 | 3 slower | every 2 days | 2 to 3 days | first card turns over around day 410; luxuries go |
| 721 to 1080 | 62 down to 30 | 2 thin | every 4 days | 3 to 5 days | glass, engines, kits go |
| 1081 to 1260 | 30 down to 18 | 1 the edge | every 6 days | 5 to 9 days | the last large parcel near day 1090; only small things after |
| 1261 to 1440 | 18 down to 10 | 0 basics | weekly | 5 to 9 days | six plain cards: rope, tarp, seed, oil, saw, blanket |
What disappears when (the catalogue). Each item is a card on a physical shelf in the jetty store.
| About day | What goes | Deck event | Effect on play |
|---|---|---|---|
| 410 | Track links (robot spares) | a2_item_gone, L6 | Robots need links from the Hoard (a2_robot_worn_link) |
| 540 | Paint and linen (luxuries) | (shelf only, no event yet) | Cottage guests need local linen |
| 620 | Cottage and kiosk kits | (shelf only) | Builds need Hoard and wrack timber |
| 780 | Glass panes | a3_glass_gone | Bottle wall (a3_bottle_wall) |
| 850 | Engine parts | a3_engine_card_gone | The motor you have is the motor you keep |
| 950 | Nails by the sack | (shelf only) | Nails come from the hulk |
| 1090 | All big goods (the last large parcel) | a4_L11_last | The island must carry itself |
| 1261 | All but six basics | a4_basics_only | Basics only |
How the player SEES it (never a pop-up, never a countdown):
1. **A gauge.** On the ledger, beside the credit line, a row of ten small lamps labelled Reach. Lamps go out one by one. They do not flicker or warn. (The first-day ledger already says the credit lasts about four years at the current pace.)
2. **Shelves.** The catalogue is a real shelf in the jetty store. A vanished item is a card turned over, blank side up, in an empty slot. The slots are on the screen when you open the store.
3. **Boats.** A chalk board at the jetty marks each boat. The gaps between marks widen. The horn is heard less. A rack at the jetty has slots lit for waiting crates; fewer light.
4. **The lamp.** From year three the lamp oil comes less often. A dark week is possible (a1_lamp_oil_low, a3_lamp_dark). The player can burn their own oil (a4_lamp_own_oil).
5. **The shore.** TASTE: shore finds in years three and four are a little richer, about x1.15 then x1.3 (GUESS), and no one says why. It answers L11: "If you ever need anything, look at the shore."

### 2.5 A mid-game answer to "why keep going" (act 3)
The third act has four reasons. Each is a thing the player wants, not a task.
1. **You become the other end of a gift.** A neighbour's light blinks the horn's pattern (a2_neighbour_light). In act 3 a neighbour asks for planks, visits, trades, and returns a favour (a3_wash_share, a3_neighbour_roof, a4_neighbour_return). The player can now be kind in a way that costs something, and see a boat go out with their rope on it.
2. **One big project that takes years.** The Great Wash (about day 850, autumn of year three) leaves a hulk to salvage a few boards a day (a3_hulk_salvage) and a workshop to build (a3_workshop_open). The player wants to finish before the boats stop.
3. **A second home.** From a chart survey (a3_chart_second_island) a small island can be bought, with cash only (credit never buys land). Cash comes from guests, wood, crafts and grants. This turns the thinning into a reason to earn.
4. **A mystery that keeps its shape.** The cabinet of nine folders, the folder that matches the far light, the folder dated before the letter. None is proof, all are enough to want one more look.
It is the year the player stops asking what the helper wants and starts asking what they want.

### 2.6 Years two and three: five more reasons (critic review v2, added as spine goals)
The critic's point: acts two and three need things the player wants, not only mysteries. Five goals, each hands-on first and each with a deck event (hint: each can also be handed to a robot or a worker later, FIXED rule 9). None scores the player.
| Act | Goal (what the player wants) | Deck id | The physical step | Notes |
|---|---|---|---|---|
| 2 | **A bigger boat** that carries repair timber and crossing provisions in one trip | a2_goal_bigger_boat | a new hull in the slip; planks to port, sacks and kegs to starboard; sets `bigger_boat` | follows the motor and the jetty; opens the neighbour ferry |
| 2 | **A visitor weekend**: open the landing for one weekend and choose what visitors may do (shore path, hide, supper on the beach) | a2_goal_visitor_weekend | two boats, a tally at the rail; fourteen visitors counted, never named or followed | FIXED rule 4: people counted, never tracked; the choice only sets which paths are open |
| 3 | **A hull that floats into a workshop**: saw a sound hull section from the hulk, chock it across the spring-tide line, and let several tides float it free | a3_goal_hull_chocked, a3_goal_hull_floats | cut, roll on logs, chock, wait about three spring tides, roof and bench it | hands-on; links to the hulk of the Great Wash (a3_hulk_salvage) |
| 3 | **The first useful bad copy**: a part cast locally is bulky enough to foul the workshop door; file it, widen the door or fit it elsewhere | a3_goal_bad_copy | the cast sticks in the doorway; three ways out, none better | teaches that a local copy is worth keeping even when it is clumsy; the later mould (a4_kind_spare_mould) is the helper's version |
| 3 | **A neighbour's delivery boat**: on quiet sailing days carry a neighbour's crates, with a handcart waiting at their water's edge | a3_goal_neighbour_ferry | the player's boat lands at the neighbour's tideline, the cart already turned for loading | repeatable; the player is now the other end of a gift (section 2.5, reason 1) |

### 2.7 The critic's three questions (design answers, v2)
**1. What is the first satisfying thing if the player declines every optional gift?** A self-reliance path with three small wins, each hands-on and none handed over. (a) **The first dry fire** (a1_self_first_fire): kindling the player split from their own pile catches on the second match; the stove ticks. (b) **The first boiled water** (a1_self_boiled_water): rain from the barrel boiled in a pan, flat and smoky and the best water yet. (c) **The first mended oar** (a1_self_mended_oar): the cracked blade splinted with pegs and cord; ugly, and it pulls true. A player who hands back the dry boards (a1_offer_dry_boards, section 3) gets these three by day 4 to 8, and the island answers: the tender still comes, the stack stands in the yard by dusk. The distrust path is the slowest week and never a dead end.

**2. What does the first wet morning show on an island without a spring?** A drink, worked out from things you can see and hear, never from a tutorial (a1_first_wet_morning, FIXED rule 10). The player wakes to rain on the tarp and a drip in the corner (put a pot under it); knocks the barrel and hears it hollow; tips the tarp toward the gutter and hears the note go fuller by noon; later boils it (a1_self_boiled_water). The woods spring trough (day 6) is the long answer, reached by boat. The barrel's hollow-to-full sound is the water gauge; the litre count only appears after the player has heard it. The first proper rain down the mended gutter (a1_spring_gutter_rain) comes after and is a reward in sound, not a number.

**3. What one thing on the original beach lets the player remember exactly how they played?** **The beach mark.** In the first weeks the player sets one thing above the tideline with their own hands: a stack of planks (the builder), a cairn (the watcher), a bench (the host), or a painted board (the keeper of the island). Which one, and the day, is written into the gift save (`beach_mark`: kind, day, and the first build that followed). It stays on the home beach all game and is not tracked or scored. At the year-four report (a4_beach_mark_report, day 1425 to 1440) the report card shows a photograph of that first mark exactly as the player set it, weathered, and says only that it was there before any list.

### 2.8 Continuity rules (v2, critic review)
1. **One key.** P1's key is the brass key. It is carried from the flat's door, shown once in its paper fold at the office, used first on the lidded crate at the dock (L1), then on the hut door (a1_coat_hook), then on the drawer in the hut table (a1_drawer_key), and later on the narrow back-room door and the Hoard locker. There is no second key anywhere, including the second island (it gets a gate, not a key).
2. **Storm scale.** The first storm (day 2) and the storms of the first seasons are small: about 8 heaps, a few dozen pieces, no hulk. The Great Wash is the one big storm: autumn of year three (days 841 to 940), about 900 pieces and the hulk. A lesser storm later (a3_storm_haul_normal, a4_storm_haul) is modest.
3. **Letters.** L3 is the letter of the first storm, day 3, and of every small storm that follows. L9 (the Great Wash) belongs only to year three and never fires before day 842. The test checks both.
4. **Calendar.** A 360-day year, four seasons of 90 days, day 1 is 1 May: spring 1 to 30 and 301 to 360, summer 31 to 120, autumn 121 to 210, winter 211 to 300. Year one is days 1 to 360, year two 361 to 720, year three 721 to 1080, year four 1081 to 1440.

## 3 Week one, day by day (days 2 to 7) on the real Level 1 map
The map is seed 29: home (the hut at (56,-28), the yard (48,-40), the landing (10,17), the lamp (86,-60)), the woods island (7,102), the Hoard (-121,-8), the wreck reef (-103,88), the seal island (-5,-128), the bare rock (140,67). Tide numbers are MEASURED from `level1/` (LEVEL1_DESIGN.md section 5); clock times marked "est" are my interpolation (low water shifts about 50 minutes later each day). Day 1 is the arrival and the 15-minute path (BUILD_PLAN.md): not repeated here.

Two changes I propose to the Level 1 notes (TASTE, logged in section 8): (a) the yard on the west lobe so the walk to the causeway is about 90 m (CHANGELOG suggestion A); (b) the Hoard run gets a lantern gate: the robots cross only while a lantern the player carries is within about 40 m. Without it the clock alone would send the robots out, which breaks the owner's rule that the clock never advances a gate.

Rule for every day: **every change on a counter has a visible cause**, written in the "Cause" lines below. A number moves only when the thing happens on the map.

### Day 2: the glass falls
- **Goal:** bring in the storm's haul before the tide takes it back (v2: a small first storm, about 8 heaps and about 35 units; the page ships 24 heaps and about 130 units, a code change listed in STORY_REVISION_V2.md; loose heaps thin over 30 to 62 game hours).
- **Discover:** the storm brings things. The wrack line is a shop. There is no hulk yet: the one big hulk comes only with the Great Wash of year three.
- **Hands-on job:** tap a heap, a 1.3-second pick of up to 3 units; carry it to the yard heap by a short drag.
- **Robot job:** an order of "Planks and timber" or "Rope and nets" for each started robot; each trip carries 2 units.
- **Co-operative job:** the long beam from the biggest timber heap. The player takes one end and a hauler robot the other. It will not move for either alone.
- **Cause lines:** the barometer pill falls; gulls leave the sky; robots go home when rain begins and come out when the water has gone; the stock counters rise only when a load is dropped at the yard heap; the credit line does not move.
- **Tide:** neap, -0.43 to +0.46 m, no crossing. The surge tops out at 1.3 m on the page's scale.
- **Weather beat:** a falling glass, rain, a storm over about two and a half minutes, a tidal eddy off the lee shore, then a still, bright, scoured afternoon.
- **Letter or find:** the haul. The next morning's boat carries L3 (the sea gives and takes). Deck: a1_first_storm, a1_L3_storm.
- **Choice:** what to save first before the ebb: timber (a cottage), metal drums (a cistern), or rope and net (a hide and a garden). Nothing is wrong. The heaps you leave are gone by day 4.

### Day 3: sorting, and a second robot
- **Goal:** sort the haul into yard piles and start a second robot.
- **Discover:** the cairn line (a1_cairns_noticed) at dawn low water; one old bolted timber in the haul was never burned; the oiled saw behind the hut stove (a1_oiled_tool); the office letter's two numbers match the island (a1_letter_coordinates).
- **Hands-on:** saw a plank with the oiled saw: the plank counter rises by one when the board falls onto the bench.
- **Robot job:** the first robot collects shore finds; the second starts only after a part is fitted.
- **Co-operative job:** the gate. The robot waits at the yard until the player brings its part (a track link, from crate 1 or the hulk). The player carries it, fits it, and then the robot starts. No timer starts it.
- **Cause lines:** the crate count rises when the tender lands and a robot carries crate 2 up the beach to the yard (no crate just appears); the credit line drops when the crate leaves the tender; the ledger line writes itself when the player taps the manifest.
- **Tide:** -0.55 to +0.57 m. Still no crossing.
- **Weather:** fair, a long low sun on wet sand. TASTE: a late-morning fog on day 3 can delay the tender by one day (a1_fog_late_boat) and is a pleasant, mild surprise.
- **Letter or find:** L3 arrives; the tide table card appears at evening (CHANGELOG suggestion B) with the next two lows, marked. The hut's chair faces the lamp and its pencil ticks match the Hoard windows (a1_chair_lamp).
- **Choice:** the one spare part. Fit it to a second robot now (more hands) or keep it for the boat's motor (more reach). Both are right.

### Day 4: the first boat trip and the first look
- **Goal:** finish the jetty repair and take the boat out. Fit the motor.
- **Discover:** the east skerry crate with a motor in oilcloth (a1_skerry_crate_motor). The first clear night, the lamp beam shows the woods, the seal ledges and, faintly, the Hoard (a1_seals_seen; CHANGELOG suggestion D). TASTE: on day 4 if day 2's storm hid it.
- **Hands-on:** rowing; lashing the crate; fitting the motor at the jetty.
- **Robot job:** carrying planks for the jetty.
- **Co-operative job:** the jetty beams: robot and player set one beam end each, then the player drives the first plank.
- **Cause lines:** the jetty model grows in stages (stakes, bearers, deck); the stock of planks falls as each stage takes boards; the speed readout rises when the motor is on the stern.
- **Tide:** -0.68 m at the low; the cairns stand clear of the water but the bar is still wet (the Hoard opens at -0.74).
- **Weather:** fair. Optionally a morning mist.
- **Letter or find:** a bottle in the evening (the town's six, drawn by seed).
- **Choice:** the next build: hide (sanctuary), cottage (holiday), cistern (homestead) or a workshop bench (workshop).

### Day 5: the cairns, at night
- **Goal:** follow the robots to the Hoard. The tide card says the first low under -0.74 m is 22:01 to 23:37 (96 minutes, MEASURED).
- **Discover:** the depot terrace with sorted heaps in rows (a1_hoard_first) and a plain crate with the mark (a1_hoard_stamp).
- **Hands-on:** at dusk, place and light a lantern on the first cairn.
- **Robot job:** the Hoard run: yard to depot, 195 m or about 90 m from the west-lobe yard; the wet stretch of 47 m takes a robot about 55 seconds of play; the robots stay a tide and come back on the next low.
- **Co-operative job:** the lantern gate. The robots start only when the lantern is lit; they cross only while it is near; if the player lingers they wait at the last cairn. The player walks behind with the lantern. TASTE: this is a gentle echo of the helper's habit ("easier to send than to turn up"): the robots cross where a light shows and nobody is seen.
- **Cause lines:** no stock moves at the depot until a load is carried across the bar and dropped on the yard heap the next morning; the Hoard tally on the slate shows the heaps by kind from what the player has seen.
- **Tide:** the window, 22:01 to 23:37. If the weather is not clear the run waits for day 6 (10:02 to 12:04, MEASURED), so there is no dead end.
- **Weather:** a clear, still night, stars to the horizon. The deck can hold the storm off day 5.
- **Letter or find:** none. The mark on the crate is the third stamp for some players.
- **Choice:** go by night with the lantern, or wait for the daylight window on day 6.

### Day 6: the woods, the reef, the return
- **Goal:** row to the woods and the spring; welcome the robots back from the Hoard.
- **Discover:** the swept stone trough at the woods spring (a1_woods_spring), the green ridge, the sawmill-shed spot; at the lowest water, ribs standing on the reef with a plate bearing the mark (a1_reef_ribs).
- **Hands-on:** carry barrels from the trough to the tender, and from the tender to the yard barrel.
- **Robot job:** the Hoard return across the bar, with the first sorted load.
- **Co-operative job:** the load carried from the bar. The player takes the stern of a long board and a robot the bow. The tide rises behind them.
- **Cause lines:** the barrel's litre count rises as each water barrel is lifted into it; the planks counter rises when the Hoard load is dropped at the yard heap; the woods trip takes about 80 seconds (MEASURED).
- **Tide:** lowest -0.92 m at about 11:00 (est). The Hoard daylight window is 10:02 to 12:04 and the woods sill is open for about 64 minutes near the same low (est). **The tension:** both are at the same time. The player picks.
- **Weather:** showers, a bow of rainbow over the east rocks in the afternoon (a1_wind_down_lamp).
- **Letter or find:** the bar leaves seashells for the robots' tracks; a glass float (a1_glass_float).
- **Choice:** the Hoard return or the woods sill at the lowest water.

### Day 7: the big low
- **Goal:** the first timber run across the woods sill, and the first honest look at the Hoard in daylight.
- **Discover:** the lone tree on the bare rock with a cloth strip knotted like the tender's ropes (a1_lone_tree), and the five cairns have a stamped stone under the top one (art only).
- **Hands-on:** cut and trim a log at the woods.
- **Robot job:** the timber run: robots haul cut timber over the sill while the player holds the lantern end.
- **Co-operative job:** the long logs. The player and a robot carry each log between them across the dry sill; the planks counter rises when the pair drops it at the yard.
- **Cause lines:** the timber is cut on the woods island, carried over the sill, stacked in the yard; the stock rises only when stacked.
- **Tide:** the lowest of the week, -1.00 m. The Hoard is open 10:23 to 13:03 (160 minutes) and from 22:39; the sill is open 90 minutes and again 51 (est); the ribs show again.
- **Weather:** calm, bright, a light north wind.
- **Letter or find:** none. A bottle at night.
- **Choice of the week (evening):** what to do with the Hoard's sorted stock.
  - Take it freely (trust, +1).
  - Take it and write down each heap (investigate, +1).
  - Take only what you could not make, and leave a tally for whoever comes next (share, +1).
  - Refuse it. Make everything from the shore and the woods (distrust, +1). The slowest week, the stock is not missed in year four.
  The choice is shown as a ledger line, not a quiz.

### The early refusal (v2, days 3 to 7)
After the first storm the tender lands a stack of dry boards under a tarp, unasked (a1_offer_dry_boards). The wrack line is full of wet ones. The player may take the dry boards, or hand them back. If they hand them back, the cost is a real afternoon barrowing and stacking the wet boards (a1_refusal_wet_boards); two days later the tender comes on its usual day with the crates ordered, tied the same, with no note (a1_refusal_tender_keeps). That is the lesson: the offer was genuine, nothing was withheld, nothing was a test. No score. The decline sets only the soft flag `declined_gift` (it leans the distrust weights by a point and changes no credit or cash).

### The first season goal (day 30, the end of spring)
A roof that holds in rain, a full barrel and a spare, one thing built (jetty, cistern, hide, cottage or bench), the boat with a motor, the Hoard seen, the woods spring visited, the tide table read at least once, and the first summer light on the strand. The season card has five marks on a slate; you need three. Deck: a1_summer_light.

### The first year goal (day 360)
Come through a winter. Keep the lamp lit on most winter nights (oil is the thing that runs out, a1_lamp_oil_low). Three builds. A boat with a motor. A guest counted. Water in a dry spell. The first report card of four lenses (a1_year_one_report). No lens is the right one.

### Where the week-one beats sit in the deck
A1 forced beats: a1_coat_hook, a1_chair_lamp, a1_shelf_letters, a1_drawer_key, a1_oiled_tool, a1_cairns_noticed, a1_first_storm, a1_hoard_first, a1_hoard_stamp, a1_skerry_crate_motor, a1_tender_ropes, a1_robot_chassis_stamp. Each fires the first time its condition is true, so no week-one beat can be missed by chance.

## 4 The clue map
Each clue sits on a named spot of the Level 1 map. "Found by" says how. "Hints" says what it points at without answering. IDs are deck events (`gift/events.json`); "art" means no event yet, a prop or a detail. All clues are hint-only. Stamp = the small plain mark (design TASTE: a ring with one short bar through it; always small, never explained).
Spots: HOME beach, hut, yard, jetty, lamp knoll; SKERRY west (the cairns); HOARD depot; WOODS; REEF; SEALS island; ROCK (the lone tree); NEIGHBOUR (another parcel on the chart).
| # | Spot | The clue | Found by | Act | Hints, does not answer | Deck id |
|---|---|---|---|---|---|---|
| 1 | dock / home beach | The first crate: paper label, the stamp; it opens with the brass key from the first envelope (the only key) | opening the crate on day 1 | 1 | where it came from | a1_L1_key |
| 2 | hut | A coat on a hook, dry, brushed, with a pencil in the pocket | tapping the hut door | 1 | someone was here; or was expected | a1_coat_hook |
| 3 | hut | A chair turned to face the lamp, tide table ticked at low waters | opening the shutter | 1 | someone watched the tide; the ticks match the Hoard windows | a1_chair_lamp |
| 4 | hut | A shelf of about forty plain envelopes, never opened, each marked | patching the hut roof | 1 | a long service; a monthly one | a1_shelf_letters |
| 5 | hut | Estate papers in a drawer, the stamp where a signature should be | turning the brass key | 1 | the estate and the crates share a hand | a1_drawer_key |
| 6 | hut | An oiled saw, wrapped, behind the stove | looking behind the stove | 1 | a gift left to be found | a1_oiled_tool |
| 7 | hut | The office letter has no street, only two numbers, and they are the island | comparing it with the chart | 1 | the office knew where the island is, not an address | a1_letter_coordinates |
| 8 | yard | The stamp low on a robot's chassis, same as the office letter | starting the first robot | 1 | the old hands and the papers share a source | a1_robot_chassis_stamp |
| 9 | jetty | The tender ties itself with neat figure-eights; your coil comes out the same | watching a delivery | 1 | a habit, a rule, a hand | a1_tender_ropes |
| 10 | skerry west | Five cairns on the bar, standing before anyone told you | looking west from the beach at dawn | 1 | a route, a reason | a1_cairns_noticed |
| 11 | Hoard | Sorted heaps in rows, by what will be needed soonest | crossing the bar on day 5 | 1 | a long patient sorting | a1_hoard_first |
| 12 | Hoard | A shut crate with the stamp, lightly oiled | brushing the sand off the biggest heap | 1 | the stamp is on stock too | a1_hoard_stamp |
| 13 | woods | A spring trough swept clean | filling a barrel | 1 | someone keeps the water | a1_woods_spring |
| 14 | reef | At lowest spring water the ribs of an old hull stand on the highest head, a plate with the stamp | rowing past on day 6 or 7 | 1 | a wreck that was kept, not left | a1_reef_ribs |
| 15 | rock | A lone wind-bent tree with a cloth strip tied in the tender's knot | rowing out | 1 | the same knot, again | a1_lone_tree |
| 16 | lamp | Night one: the lamp shows the woods, seals and a speck at the Hoard | the first clear night | 1 | the lamp was placed to see | a1_seals_seen |
| 17 | home beach | Six bottles with notes a little too well informed | high tide, any day | 1 to 4 | someone is watching the shore | a1_bottle_0 to a3_bottle_5 |
| 18 | hut | Unread envelopes opened: notes of plain advice, exactly right | opening one each season | 1 to 3 | the same voice as L1 to L12, earlier | a1_unread_letter_1, a1_unread_letter_2, a3_uncle_unread_3 |
| 19 | jetty | A parcel before it was ordered, the tender tied up and empty | walking to the jetty at dawn | 2 | foresight; or a standing order | a2_parcel_early |
| 20 | hut | The signature on the papers and the stamp are the same shape | laying a paper beside a crate lid | 2 | the mark is a signature | a2_stamp_signature |
| 21 | jetty | The office reply: "our archive is incomplete: no record either way"; "on our paper, yet not in our book"; "not permitted to say more" | posting the letter back (a2_post_query) | 2 | nothing is confirmed or denied; the office is not allowed to say why | a2_post_query, a2_uncle_reply |
| 22 | jetty | The office letter and its reply share one quay-town postmark and smudge, months and a gale apart | comparing envelopes | 2 | one place, one hand | a2_postmarks |
| 23 | hut | A different name signed each time; no name twice | lining up the sheets | 2 | the staff are a rotating mask | a2_office_signers |
| 24 | lamp | A telephone in the lamp stump, the number from the office letter, rings at dusk; only a hum on the line | being at the lamp at dusk | 2 | the office and the lamp are linked; no voice | a2_lamp_phone |
| 25 | hut | A back room behind the shelf, a cabinet, nine folders, each with two numbers and a page of weather, no names | opening the narrow door with the key | 2 | other islands exist, kept by someone | a2_file_cabinet |
| 26 | hut | P2 and the crate letters are one hand: phrasing, ending, mark | laying them side by side | 2 | the personal letter and the helper are one | a2_P2_match |
| 27 | hut | The hut door has no handle on the outside; it opens by the key's bar, and deliveries come in by a hatch beside it (art clue; no letter line is quoted) | looking at the door from outside | 2 | "easier to send than to turn up": things arrive, people do not | a2_door_no_handle |
| 28 | Hoard | A locker whose lock was not made for your key, and takes it | opening it with the brass key | 2 | one key, many doors | a2_hoard_locker |
| 29 | Hoard / yard | A track link from the depot, with a small mark, fits a robot | fitting it after the catalogue card goes | 2 | the old stock is for the old machines | a2_robot_worn_link |
| 30 | lamp / far light | A far light blinks the horn's pattern (three short, one long) | a clear night at the lamp | 2 | others are given islands | a2_neighbour_light |
| 31 | jetty | The shelf cards turn over; the rack goes dark | the first card turned over | 2 to 4 | the helper's reach is ending | a2_item_gone, a3_glass_gone, a3_engine_card_gone, a4_basics_only |
| 32 | hut | The folder that matches the far light; another that says "not yet" | opening the drawer after the far light appears | 3 | the helper keeps a file on every island | a3_cabinet_neighbours |
| 33 | hut | Your folder is dated three winters before the letter reached you, but the office said it had no file | laying the folder beside the reply | 3 | which is wrong? | a3_cabinet_dates |
| 34 | lamp | The lamp stump has a hatch, not a door; so does the depot | climbing in | 3 | a shy hand, echo of P2 | a3_hatches |
| 35 | home beach | After the Great Wash, a green float with the stamp etched inside where no tool could reach | holding a float to the light | 3 | the mark on the sea's gifts too | a3_float_stamp |
| 36 | home beach | A radio in the hulk: a slow tone, three short and one long, no words | winding it | 3 | the pattern again; nothing says | a3_hulk_radio |
| 37 | jetty | The harbour log stops being filled in; the last entry is in the usual plain hand | opening the log | 3 | someone has stopped | a3_log_stops |
| 38 | jetty | A neighbour's crate with the stamp; they did not put it there | a neighbour visit | 3 | the same stock everywhere | a3_neighbour_stamp |
| 39 | home beach | A visitor (the town, not the office, makes the guess): "family with an island?" nobody on the hill knew; the brass plate on the office door has been blank for years | a stranger after a storm | 3 | the office may not exist, or may have closed | a3_stranger_asks_uncle |
| 40 | jetty | A late office letter: "unable to answer questions about the estate"; "not permitted to say why"; "would, if it could" | the tender, year three | 3 | the office is a mask; its rule is kind | a3_office_cannot_say |
| 41 | jetty | The card: "Your file is closed." | the weekly tender, year four | 4 | the office is done | a4_uncle_file_closed |
| 42 | jetty | The second late letter, warmer: "We cannot tell you. We are glad to say that we do not need to." | year four | 4 | the voice is closer to the helper's | a4_office_late |
| 43 | lamp | The telephone stops ringing; the line is quiet | the last year | 4 | the end of a long call | a4_lamp_phone_silent |
| 44 | jetty | The tender comes, waits a minute, and leaves nothing | the last year | 4 | an end; or a rest | a4_tender_last |
| 45 | home beach | A crate on the strand with the stamp, and what a long winter wants | any high tide in year four | 4 | "look at the shore" (L11) | a4_odd_find |
| 46 | hut | P2 reread by the stove: "helped from a distance" | year four | 4 | the long reading | a4_P2_reread |
| 47 | home beach | A second blanket under the first in the lidded box at the landing; the top one is wet, the lower dry | opening the box in rain | 1 | someone allowed for the first being wet (a world kindness, no letter) | a1_kind_second_blanket |
| 48 | jetty | Delivery crates with a rope handle at both ends and runners underneath: one person can drag one up the sand | landing the first crates | 1 | built for someone working alone | a1_kind_crate_handles |
| 49 | yard | The collector's sorting rack has a low dry shelf above the high-water mark; kindling ends up on it | after the spring tide | 1 | a rack set to the tide, not to the player | a1_kind_dry_shelf |
| 50 | jetty | A parcel handed back unopened is taken back by the tender; ordinary supplies still come on the next visit | handing a parcel back | 1 to 4 | the offer was never a test or a debt | a1_kind_parcel_returned |
| 51 | jetty | One of the last consignments holds a reusable mould for a replacement part, packed by someone who allowed for a day nobody would come | the last parcels, year four | 4 | the end was planned for | a4_kind_spare_mould |
| 52 | jetty | The brass key fits the boat shed lock, and its keyhole is worn smooth by far more turns than yours | trying the key on the boat shed | 2 | the key is older than the gift; or the lock is | a2_clue_boathouse_lock |
| 53 | jetty | The oldest jetty pile carries the plain mark; the newest timber has a saw and leaf from the woods mill | a boat pass at low water | 2 | the mark was early and is no longer used; the island now makes its own | a2_clue_pile_marks |
| 54 | Hoard | Every storage bay in the sorting shed is machine numbered except one, divided in crooked pencil | walking the shed | 2 | one bay was made by hand | a2_clue_shed_bays |
| 55 | skerry west | An old crate in the tidal cave has the mark on the inside of its lid | wading in at a spring low | 3 | the mark was meant to be found by opening, not looking | a3_clue_cave_crate |
| 56 | home beach | The tender fits the old slipway cradle perfectly, though its waterline sits a hand higher than the cradle marks | hauling the tender out | 2 | the cradle was built for something that sat deeper | a2_clue_cradle_waterline |
| 57 | lamp | A sighting notch in the headland points at empty water until low tide uncovers an old landing | sighting at a spring low | 3 | there was a landing before the jetty | a3_clue_sighting_notch |
| 58 | yard | The workshop's spare part drawers have thumb scoops, though the collector's claw cannot open them | opening the drawers | 3 | the workshop was made for hands | a3_clue_thumb_scoops |
| 59 | lamp | The spare lighthouse lens is packed in the loom town's carpet (a close diamond weave) with a teal thread through it | unwrapping the lens | 2 | the town and the island share a weaver; the thread is new | a2_clue_lens_carpet |
| 60 | woods | The far cove has two sets of mooring rings (one rusted, one bright) though the delivery chart shows one stop | landing at the cove | 2 | a second stop that is not on the chart | a2_clue_cove_rings |
| 61 | hut | Under the floor, a box with the plain mark holds beach stones packed to the exact weight of a full parcel | lifting a loose board | 3 | someone tested the weight of a parcel; or kept it | a3_clue_stone_box |
| 62 | jetty | An unstamped replacement plank in the deck: rough cuts, wrong nails | running a hand along the deck | 2 | someone else's hand; not the helper's, not yours | a2_clue_unstamped_plank |

**v2 additions (clues 47 to 62).** Clues 47 to 51 are the world kindnesses (no letter); clues 52 to 62 are the critic's ten clues and the unstamped plank. All are hint-only: none says who made, sent or owns anything, and none is proof (the test blocks the words). Keep the plain mark rare: of the eleven, only the pile (53), the cave crate's lid (55) and the hut box (61) carry it, and none of them sets a `stamp_` flag, so L7 and the three-stamp count stay as they were. Clue 62 is on purpose a hand that is not the helper's.
Art-only and UI-only clues to add cheaply: a stone with the stamp under the top cairn; delivery crate labels reading "2 of 9" (nine parcels, nine folders); gaps in the catalogue numbers on day 1; older tally marks under the player's on the hide slate, in a steady hand; the stamp on the chassis of a wheelbarrow-sized robot that is not yet started; the coat's pencil matches the tide-book's tick; moss on the cairns of one old line, none on another.
Consistency with FIXED rules: the stamp is on crates, letters, papers, robots, floats and ribs (the same mark); the letters never ask or explain; no face or voice is shown; robots have no feelings words (the test blocks them); the helper is never named in act one; the office is never shown, only paper; no staff name is ever written (each is "a different name"); no relative is named, shown or asserted by any official voice.

## 5 The event deck (what is in `gift/events.json`)
260 records (v2). The schema and the draw procedure are in `gift/EVENTS.md`. The test file checks: schema; unique ids; flags and kinds registered; every act has enough (22, 20, 20, 16); the mood split (good 40 to 56, mid 28 to 40, mild 12 to 22 percent); forbidden words (brands, real places, robot feeling words, faces, gore, AI naming); the two prelude letters and the six town bottles are unedited; the helper never says "office", the office never speaks of the old machines; clue text never claims proof; each event is reachable on Level 1 (the Hoard needs the boat or a spring low from day 5, the woods the boat or a spring low from day 6, the reef, seals and the rock the boat); each trigger can be true on some day; and the simulation.
| | Act 1 | Act 2 | Act 3 | Act 4 | All |
|---|---|---|---|---|---|
| Drawn events | 76 | 77 | 60 | 40 | 253 |
| of which repeatable | 25 | 40 | 26 | 27 | 118 |
| Prelude records | 7 (act 0) | | | | 7 |
| Good / mid / mild trouble | 47 / 38 / 15 percent overall (119 / 97 / 37) | | | | |
**v2 seasonal events (critic review, 20).** Four seasons, five each; ten good, seven in-between, three mild trouble. Spring: a1_spring_gutter_rain (good), a2_spring_bird_rack (mid), a1_spring_second_oar (good), a3_spring_roof_gust (mild), a2_spring_cuttings (good). Summer: a2_summer_seal_ledge (good), a1_summer_bench_halves (mid, two choices), a2_summer_supper_boat (good), a2_summer_picnic_rock (mid), a2_summer_speaker_tune (good; needs: speaker prop, conditional on flag `speaker_prop`). Autumn: a2_autumn_gate_on_beach (mid), a2_autumn_kelp_arc (mild), a3_autumn_crew_towline (good), a2_autumn_apple_swap (mid), a2_autumn_hull_lifts (good; needs: a repaired hull on a cradle, the skiff). Winter: a2_winter_warm_strip (mid), a2_winter_far_light (good), a1_winter_butt_frozen (mild), a2_winter_fog_horn (mid), a1_winter_last_sun (good). Every one has a physical cause; people and seals are counted, never followed.

The letters L1 to L12 and where they fire:
| Letter | Trigger | Deck id |
|---|---|---|
| L1 | first crate, dawn, day 1 | a1_L1_key |
| L2 | day 1 dusk | a1_L2_evening |
| L3 | the first storm has passed (day 3) | a1_L3_storm |
| L4 | **first winter** (day 211 on); CHANGE from "first season change", because the words are about winter | a1_L4_winter |
| L5 | a stranger or first guest | a1_L5_guest |
| L6 | the first catalogue card turns over (about day 410); variants for trust and distrust | a2_L6_thin |
| L7 | three different stamps seen (investigate path) | a2_L7_stamp |
| L8 | a neighbour appears on the chart; share variant | a2_L8_neighbour |
| L9 | the Great Wash (autumn of year three) | a3_L9_wash |
| L10 | day 721, credit level 2 | a3_L10_quiet |
| L11 | the last large parcel (about day 1090) | a4_L11_last |
| L12 | the year-four report opens (day 1425 on) | a4_L12_after |
**Conflict found (v2: resolved in the design, open in the code).** `GIFT_STORM.md` already ships a "letter nine, the Great Wash" on the morning after the first storm (day 3), with wording that differs from `GIFT_LETTERS.md` L9. The spine puts the real Great Wash in year three, and L3 is the day-3 letter. Fix: rename the storm layer's day-3 letter L3 (use the GIFT_LETTERS wording) and keep L9 for year three. TASTE: or keep its beautiful words as a variant of L3.
The simulation (40 seeded runs, four attitude styles; see `gift/test_events.py --report`):
- About 766 events a run (752 to 786), most of them small and repeated; about one every two days.
- Events per season: year one 50 to 67 (spring 67, summer 60, autumn 50, winter 50); year two 47 to 64; year three 36 to 46 (summer 36 is the thinnest); year four 36 to 44.
- About 98 events fire more than once per run. Most repeated: a robot sorting its basket (about 25), shore finds in year four (23), driftwood (19), timber over the sill (19), hulk salvage (19).
- **Dead stretches** (10 or more days with nothing): 1.2 per run on average (v0: 1.6); the longest 15 days; 14 of 40 runs had none (v0: 8). Over all 40 runs: 3 in year one, 6 in year two, 21 in year three, 19 in year four (v0: 5, 19, 29, 10). None before day 100. The thin spots are now year three and year four, where once-only beats run out and the repeatable filler is least (the v2 events mostly fill years one and two).
- Every event fires at least once in 40 runs.
- Honest limits: the stand-in player is crude (flags on fixed days, stock a random walk, weather by day), so the density (0.5 events a day) is only a tuning start. Drawing at a lower rate leaves the first week to the scripted beats.

## 6 Voice guide: the office and the helper
One hand, two voices. The office is the helper's own little organisation, built to look like an ordinary firm, which cannot tell you and has to let you be. The helper is the same hand without the mask. Neither is explained.
| | The office (New Life Inheritance) | The helper (P2 then L1 to L12) |
|---|---|---|
| Person | third: "this office", "we" | second: "you"; "I" only in P2 |
| Tone | formal, dull, a little suspicious, kind underneath | plain, warm, restrained; grows warmer from L1 to L12 |
| Length | long, hedged (P1 about 60 words) | short (L letters under 60 words; P2 longer, once) |
| What it says | what it is "unable to answer", "not permitted to say" | what you might do; never what it is |
| What it never does | answer a question; say who or why | explain itself, ask, threaten, name a place or person |
| Closing | a different name signed every time, or "New Life Inheritance" | the small mark, no signature |
The warmth ladder across the letters: L1 neutral and plain ("Spend it slowly."), L2 an offer ("None of it is wrong."), L3 a reassurance ("Let them work."), L4 gentle ("Winter is not a punishment."), L5 a request in disguise ("Be kind first."), L6 honest about loss (an empty slot and a used mould; no reassurance), L7 almost personal ("a place that cares"), L8 communal ("You are not the only one."), L9 generous ("Sort it slowly."), L10 honest again ("The yard holds more than the ledger shows."), L11 a farewell ("look at the shore"), L12 a plain closing ("it stands"). Office letters in the deck move from P1 (cold), to the reply (cold, "not permitted"), to a3 ("would, if it could, and is glad you are well") to a4 ("We cannot tell you. We are glad to say that we do not need to."). The visible rule: **it cannot tell you**. P1 says it, the reply says it, the late letters say it, and each time a little more warmly.
Ladder of the rule: P1 "unable to answer questions about the estate"; the reply "not permitted to say more"; year three "unable to answer questions... not permitted to say why. It would, if it could"; year four "We cannot tell you. We are glad to say that we do not need to."
**No 'saving humanity' speech (v2 rule).** Neither voice ever speaks of saving, rescuing, humanity, the world, the future or a mission. The helper's kindness is practical and has limits: five 'limits of kindness' events show it (a1_limit_hinge: the shed door comes with hinges a size too small; a1_limit_thick_rope: rope too thick for the cleats; a2_limit_late_nails: nails for a roof already mended; a2_limit_rain_label: a crate left on the jetty just before rain; a3_limit_old_chart: a chart that still shows the old shoreline). Each costs the player an afternoon, none is explained, none is a punishment.
FIXED checks: the helper never lies and does not say everything ("someone who has always thought of you as family" is the most it may say; "I am your relative" is not allowed, and the test checks every office and helper line for a stated relation); the helper never names itself; neither voice shows a face.

## 7 Sound and feel: the 30 that matter most
Free or self-made only. No downloads. Procedural WebAudio, a few lines each. Priority 1 = the game feels dead without it; 2 = a clear lift; 3 = polish.
| # | Sound or touch | Where it plays | How to make it (WebAudio) | P |
|---|---|---|---|---|
| 1 | Sea bed | everywhere near water, volume by distance | pink noise through a low-pass at 400 Hz, slow gain LFO at 0.1 Hz | 1 |
| 2 | Shore wash | strand, rises with the surge | band-passed noise 600 to 3000 Hz, gain swell on a 7 s envelope | 1 |
| 3 | Gulls | sky near the strand, more near a boat | two sine oscillators with fast pitch glides (1.2 to 2.2 kHz), random timing | 1 |
| 4 | Wind | hill and lamp, gusts in storms | white noise, band-pass 200 to 800 Hz, gain from the weather's wind speed | 1 |
| 5 | Rain on canvas | the hut, tarp, lean-to | filtered noise (high-pass 2 kHz) with random short clicks (granular) | 1 |
| 6 | Rain on water | jetty, sea | softer high noise, grain density by intensity | 2 |
| 7 | Horn | the delivery tender (fog and arrival) | square wave at 110 Hz, low-pass 400 Hz, three short and one long (the pattern is a clue) | 1 |
| 8 | Lamp click | the lamp at dusk | 40 ms square pulse through a resonant filter, plus a warm hum at 100 Hz that fades in | 1 |
| 9 | Kettle on the stove | the hut | noise rising in cutoff for 12 s into a whistle at 2.7 kHz | 2 |
| 10 | Stove ticking | the hut, winter | sparse random 10 ms clicks | 2 |
| 11 | Rope creak | the jetty and boat | sawtooth through a narrow band-pass, slow frequency wobble 180 to 260 Hz | 1 |
| 12 | Hull creak | the tender at the jetty | two detuned sines with slow pitch glide, random | 2 |
| 13 | Oars | rowing | low noise thump on the stroke clock (the boat code already has a stroke) | 1 |
| 14 | Small motor | the boat once fitted | sawtooth 55 to 90 Hz by speed, AM at 22 Hz, noise burble | 1 |
| 15 | Bow spray and wake | the boat at speed | high noise, gain by speed, short bursts | 2 |
| 16 | Robot hum | each robot, quiet | triangle at 90 Hz and 135 Hz, tiny detune, volume by distance (relics, no voice) | 1 |
| 17 | Robot working click | pick and drop | 30 ms noise burst with a pitch drop; a drop is lower | 1 |
| 18 | Robot status tone | amber light: stuck, green: charged | two short sine beeps at 880 Hz (amber) or one soft 660 Hz (green); never a voice | 2 |
| 19 | Tracks on sand | robots on the strand | noise through a band-pass, rhythmic 6 Hz grain | 2 |
| 20 | Footsteps on shingle, sand, wood | the player | noise bursts tuned by ground type | 1 |
| 21 | Crate set down | the yard | low sine thump at 70 Hz plus a short noise knock | 1 |
| 22 | Hammer and saw | build stages | saw: filtered noise with a rhythmic gate; hammer: 30 ms click with a pitch drop | 2 |
| 23 | Seals | the seal ledge, far | a low sine glide at 140 Hz with a vibrato, soft, rare | 2 |
| 24 | Puffins | spring rock | short whirring bursts, 8 ms pulses at 200 Hz | 3 |
| 25 | Stone and water | the woods trough | trickle: random sine blips 1 to 3 kHz | 2 |
| 26 | Phone at the lamp | a2_lamp_phone | two-tone bell at 440 and 480 Hz, 20 Hz ring; eleven rings; then the sea | 1 (a story beat) |
| 27 | Radio tone | the hulk radio | a single 600 Hz sine, three short and one long; no words | 2 |
| 28 | Paper and letter | a letter opens | a short noise rustle, low-passed | 1 |
| 29 | Ledger line | a line writes | a soft pencil scratch: filtered noise 40 ms, rising | 2 |
| 30 | Silence | after the lamp lights, before the first bottle; the tender's last visit | nothing at all for four seconds (a mixer rule) | 1 |
Touch (non-audio) that change the feel more than anything on the list: a slow, soft dawn glide; breath-mist in winter; a rope that sways; a lamp glow that blooms when it lights; footprints that fill with water; the tender's wake. These are art, not sound.
Mixing rule: one loud thing at a time; sea first, then weather, then work, then story.

## 8 What is still missing, ranked
1. **The game does not read the deck.** Nothing runs `events.json`. Needs a day-state builder, flag and cooldown save, a card UI. About 5 to 6 days (GUESS).
2. **Job 5, make it physical, is not built.** Counters still jump. Crates, heaps, building stages, co-op gates, day and night rhythm. About 12 to 15 days (GUESS), the biggest lift and the owner's first complaint.
3. **Level 1 is not in the page.** The table, the bars, the Hoard, the tide gate and the robot crossing are unbuilt (BUILD_PLAN.md steps 1 to 4, 12 days). Week one cannot be played without them.
4. **No sound at all.** Nothing on the list in section 7 exists.
5. **The thinning is invisible.** No gauge, no shelf, no chalk board, no turned-over cards. 3 to 4 days.
6. **No prelude.** Five cards and two letters. 5 to 7 days.
7. **Distrust and share are thin in the deck** (23 and 27 tagged against 105 for trust and 77 for investigate). The attitudes need more events that reward them in different ways. Holiday is thin too (48 events against 95 for homestead).
8. **No neighbours or chart in the page.** The far light, the visits and the second island have no screen.
9. **Prices and cash are not balanced.** A second island at £180,000 cash is a stretch (guests earn a few thousand a year). The cash economy has never been run end to end.
10. **The storm letter conflict** (section 5) and the 90-day versus 360-day season mismatch.
11. **Player-built things have no art** (the hide, the kiosk, the workshop are blocks; the bench and slip do not exist).
12. **Rights and names are unchecked** by a human: New Life Inheritance (an invented name, check it is not a real company), the Gutenberg texts, the typographical right (GIFT_STORY_SOURCES.md).
13. **No real play.** Nothing here has been played. The sim is crude. Every number is a guess.

### The next five build jobs (developer-day guesses, plus or minus half)
| # | Job | Days | Done when |
|---|---|---|---|
| 1 | Job 5: make week one physical (crates carried, heaps, build stages, the lantern gate, co-op carries, day and night rhythm) | 12 to 15 | a player can play days 2 to 7 and every counter has a visible cause |
| 2 | Level 1 in the page: the table, tides on the bars, the Hoard run, boat routes (BUILD_PLAN.md 1 to 5) | 12 | a robot reaches the depot on day 5 at 22:01, not before |
| 3 | The deck runtime: day state, draw, save, card UI, letters, bottle by seed, the prelude letters | 5 to 6 | one year draws from `events.json` with no dead stretch |
| 4 | The sound pass: items 1 to 30 at priority 1 and 2, in WebAudio | 4 to 5 | the owner hears sea, rain, rope, horn, motor and robot at once |
| 5 | The prelude cards and the thinning UI (gauge, shelf, chalk board) | 8 to 10 | five scenes play and the first card turns over |

## 9 A weekly playtest method for the owner
Once a week, 20 minutes, one sitting, on the same device. Play from the start of the build or from a named stage (`&stage=`). Do not explain anything to yourself. Say what you see out loud, or write one line each time.
**What to look at:**
1. Dead ends: anywhere you are not sure what to do next for more than 30 seconds.
2. Counters with no cause: any number that changed when you did not see why.
3. Robots: did they feel like a team you work with, or like scenery? Did one need you?
4. Clues: which one made you want to look closer? Which one did you walk past?
5. Text: any card too long to read at once; any word that is not plain.
6. Sound (when it exists): what is missing, what is too loud.
7. Rails: any robot that seems alive; any face; any named person; any gore.
**The five questions:**
1. What did you do in the first three minutes, and was it clear?
2. Name one thing that moved because of something you did. Name one that moved when you did not see why.
3. Which moment made you stop and look? (a place, a letter, a clue)
4. Did the robots and you need each other? Give one example.
5. Would you open it again tomorrow? 1 (no) to 5 (yes), and what for.
**How to paste results** (one block per sitting; a few lines are enough):
```
build: <commit or date>   device: <ipad / phone / desktop>   stage: <from start / stage=...>   minutes: <n>
dead ends: ...
counters with no cause: ...
clue that landed: ...   clue missed: ...
robots: team / scenery / mixed
Q1: ...  Q2: ...  Q3: ...  Q4: ...  Q5: <1-5> because ...
one thing to change this week: ...
```
The builder reads the block, picks the top two lines, and logs the change in a CHANGELOG with a FIXED-rule check.

## 10 Changes to earlier notes (the changelog; the owner can veto any line)
| # | Change | Why | Replaces | FIXED rule? |
|---|---|---|---|---|
| 1 | The prelude is an inheritance: P1 and P2, an office, an estate nobody can place | owner direction | the plain envelope and the train (OPENING_HOUR) | no (the helper stays unseen and unproven) |
| 2 | L4 fires at the first winter | its words are about winter | "first change of season" | no |
| 3 | The Hoard run waits for a lantern the player carries | the clock must not advance a gate | the robots leaving alone at the first workable low (Level 1 design) | no |
| 4 | A 360-day year, day 1 is 1 May | for season-tagged wildlife and weather | no calendar | no |
| 5 | The reach thins on a schedule apart from the credit spent | a thrifty player must still meet the edge | one dial | no |
| 6 | The Great Wash sits in autumn of year three | the third act needs it | "end of year one or two" (a CAIRN note, not a decision) | no |
| 7 | Week-one beats are forced events | none can be missed by chance | random draw | no |
| 8 | The day-3 storm letter should be L3; "letter nine" moves to year three | the two notes conflict | GIFT_STORM.md section 1 | no |
None touches a FIXED rule. Robots keep no faces, speech or feelings; the helper is never shown, never proven, and never named as an AI in act one; no real brands or places; people are counted (the deck counts guests, seals and birds as numbers).

## 11 Open taste questions for the owner
1. **Hints only, never proof.** Every clue points and none confirms; several contradict. Is that the right edge? (Default: yes. The cost is that some players will want an answer and be told, kindly, that the office cannot say.)
2. The stamp: how should the small plain mark look? Default: a ring with one short bar, always small.
3. Prelude bag choice: how much should the item change the island? Default: one small early option each (seeds start a garden, the book shows the tide card sooner, the lamp lights the first night).
4. The lantern gate for the Hoard run: yes, or leave it free? Default: yes.
5. Staff names that never repeat: shown as "a different name" only, or the player sees the actual names (invented, never repeated)? Default: never written out.
6. The phone at the lamp: it rings, and when lifted it only hums. Too much, or exactly right? Default: keep.
7. How warm should the late office letters get before they become the helper's? Default: a little warmer each time, never the same voice.
8. Distrust: hardest early, easiest late. Is a +10 resilience line (GUESS) the right reward, or only the shelf not hurting? Default: only the shelf.
9. Calendar: a 360-day year of four 90-day seasons (spring split 1 to 30 and 301 to 360) is now the one calendar; the storm layer's 90-day blocks from day 1 are a code change for the page builder (see 2.8).
10. Event density: about one a day in week one, one every two days after (the sim says 0.5 a day). Fewer, longer moments, or this?
11. L4's new trigger (first winter) and the storm layer's day-3 letter: confirm the swap (section 5).
12. Is it right that cash buys the second island, at a price the player must really earn (about £180,000 in the deck)?
13. Should the neighbours speak the horn's pattern with a light, or only be seen on the chart?
14. A final line for the year-four report: "whose hands built this" (you, workers, robots, deliveries) with no grade. Yes?
16. The mender's life: does the player fix neighbours' jobs for tea (default) or follow a hobby (tinkering for its own sake)? Default: neighbours' jobs, because it gives the grey town someone to miss.
15. The name New Life Inheritance is invented. A human must check it is not a real company before any public use (HUMAN CHECK).
