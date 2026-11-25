# The Gift: story revision v2 (outside critic's review applied, 25 Nov)

Status: change log for the owner. An outside critic (ChatGPT, requested by the owner) reviewed the story documents and the event deck; CAIRN applied the review in thirteen steps, each pushed on its own. Every line below says KEEP (the old thing stays on purpose) or CHANGED (the old thing is replaced), with a one-line reason. The owner can veto any line: say the line number and it goes back.
Files touched: `research/GIFT_LETTERS.md`, `research/GIFT_WEEK_ONE_AND_SPINE.md`, `gift/events.json`, `gift/test_events.py`, `gift/EVENTS.md`, this note. Nothing else (no page, test page, asset or Blender file).
FIXED rules kept in every step: hopeful; mild trouble only; robots are relics (no faces, speech or feelings); the helper is never shown, never proven, never named as an AI in act one; people counted, never tracked; own words; no real brands, places or people; all money in-game.

## Step 1. Prelude P2: the front door line
| # | Status | Line | Reason |
|---|---|---|---|
| 1.1 | CHANGED | P2: "I have never been good at walking through a front door, and you know how families can be, so I have helped from a distance instead, in small ways you may not have noticed." becomes "Somehow it was always easier to send something than to turn up. So I helped from a distance, in small ways you may not have noticed." | plainer; the old line sounded written; the new one is how a shy person would say it |
| 1.2 | KEEP | "I am sorry we never met. I would have liked to." and the rest of P2 | the critic liked it; it is the warm centre |
| 1.3 | CHANGED | `GIFT_LETTERS.md` P2 and its note (2); spine section 1 quote; `events.json` `p0_P2`; `test_events.py` P2 constant | the test requires P1 and P2 to equal GIFT_LETTERS.md exactly, so all five move together |
| 1.4 | CHANGED | `a2_door_no_handle`: no longer echoes a letter line. The hut door has no outside handle (art clue, kept) and a small delivery hatch sits beside it | its tie is now "easier to send than to turn up": things arrive by hatch |
| 1.5 | CHANGED | `a3_hatches`: "made by someone who preferred not to be seen coming" becomes "built for things to be sent in rather than people to turn up" | same echo, same reason |
| 1.6 | CHANGED | Spine clue 27, the fingerprint table (prelude row) and the lantern-gate TASTE note | they quoted the old line |

## Step 2. The uncle fix: nobody official states a relation
| # | Status | Line | Reason |
|---|---|---|---|
| 2.1 | KEEP | P1: "an estate that has named you" | it asserts an estate, not a relative; it was already right |
| 2.2 | CHANGED | P2 carries no family word at all (the old "families" went with the front door line). The helper may say "someone who has always thought of you as family" at most, and the test allows exactly that phrase | the critic: the helper never lies, and a relation is a claim it cannot make |
| 2.3 | CHANGED | `a2_uncle_reply`: "no such relative in any register" becomes "our archive is incomplete: we hold no record of the matter either way" | the office cannot deny a relative any more than assert one; the archive is simply incomplete |
| 2.4 | CHANGED | `a3_stranger_asks_uncle`: the visitor (the town) makes the guess, "so you have family with an island"; cause line says she makes her own guess | the family inference belongs to a neighbour or the town, never to the office or the helper |
| 2.5 | KEEP | the blank brass plate on the office door; the office closing its file in year four; the coat, chair and shelf | objects and papers only; nothing asserts a person |
| 2.6 | CHANGED | spine headlines, section 1 rule, act-two line, fingerprint table, clue 21, clue 39, the FIXED check, changelog row 1; `GIFT_LETTERS.md` rule and note (4) | each said "no such relative" or "a relative nobody can find" |
| 2.7 | CHANGED | flag notes `uncle_no_record`, `uncle_no_record_visit`, `stamp_papers` in the registry | they said "no such man" and "the uncle's papers" |
| 2.8 | KEEP | the internal deck `kind: "uncle"` and flag names `uncle_*` | internal tags, never shown; renaming would touch many ids and tests for no player benefit |
| 2.9 | NEW TEST | `test_no_official_voice_asserts_a_relation` | no office or helper line may name a relation; P1 and P2 never say "relative" |

## Step 3. No saving-humanity speech; the limits of kindness
| # | Status | Line | Reason |
|---|---|---|---|
| 3.1 | CHANGED | Voice guide (spine section 6) and `GIFT_LETTERS.md` "What the letters never do": a new rule, no speech about saving anyone or anything (no humanity, world, future, mission, purpose) | the critic: the twist works only if the helper never explains its grand reason; it behaves like a good neighbour |
| 3.2 | KEEP | L1 to L12 wording | none contains such a speech already (the new test proves it) |
| 3.3 | CHANGED | five new limits-of-kindness events: `a1_limit_hinge` (the shed door arrives with hinges a size too small), `a1_limit_thick_rope`, `a2_limit_late_nails`, `a2_limit_rain_label`, `a3_limit_old_chart` | kindness that is never wrong feels managed; small honest misfits make it feel like a person's hand. Two are mild trouble, three in-between; each costs an afternoon, none punishes |
| 3.4 | NEW TEST | `test_no_saving_humanity_speech` (also counts the five `_limit_` events) | keeps the rule from drifting |

## Step 4. Five world kindnesses without letters
| # | Status | Line | Reason |
|---|---|---|---|
| 4.1 | CHANGED | `a1_kind_second_blanket`: in rain the lidded box at the landing holds a second blanket under the first (clue 47) | kindness shown by an object that allowed for the first going wet; no words |
| 4.2 | CHANGED | `a1_kind_crate_handles`: crates with a rope handle at both ends and runners beneath, so one person can drag one (clue 48) | the helper cares about one pair of hands; physical, testable cause |
| 4.3 | CHANGED | `a1_kind_dry_shelf`: the collector's rack has a low dry shelf above the high-water mark where kindling gathers (clue 49) | a mechanical reason (the first bin the tide cannot reach); kindness without a face |
| 4.4 | CHANGED | `a1_kind_parcel_returned`: a parcel handed back unopened is taken by the tender and the ordinary supplies still come next visit (clue 50). Needs a game action: hand a parcel back (flag `parcel_returned`) | shows the offer was never a test or a debt; mood in-between |
| 4.5 | CHANGED | `a4_kind_spare_mould`: one of the last consignments holds a reusable mould for a replacement part, packed for a day nobody would come (clue 51) | the end of the gift is planned for; practical, and a spare of what L6 said was no longer made |
| 4.6 | KEEP | none of these has a letter, a speaker or a face | the critic asked for kindness the world shows |
| 4.7 | NEW TEST | `test_world_kindnesses`; the stand-in player in the simulation now returns a parcel on day 12 (`parcel_returned`) | tests that all five exist, and keeps the new event reachable |

## Step 5. Ten clues from the critic, and the unstamped plank
Hint-only. None settles authorship. The plain mark stays rare (three of the eleven). Clue numbers are the spine clue map rows 52 to 62.
| # | Status | Line | Reason |
|---|---|---|---|
| 5.1 | CHANGED | `a2_clue_boathouse_lock` (52): the brass key fits the boat shed lock, whose keyhole is worn smooth | the key is older than the gift, or the lock is |
| 5.2 | CHANGED | `a2_clue_pile_marks` (53): oldest pile has the mark, newest timber the woods mill brand | the island started on the helper's stock and now makes its own |
| 5.3 | CHANGED | `a2_clue_shed_bays` (54): every bay machine numbered except one in crooked pencil | one place was made by hand |
| 5.4 | CHANGED | `a3_clue_cave_crate` (55): the mark inside the lid of an old crate in the tidal cave | only seen by opening, not by looking |
| 5.5 | CHANGED | `a2_clue_cradle_waterline` (56): tender fits the old slipway cradle but floats a hand higher than its marks | the cradle was built for something heavier |
| 5.6 | CHANGED | `a3_clue_sighting_notch` (57): a headland notch points at empty water until low tide uncovers an old landing | a place that was used before the jetty |
| 5.7 | CHANGED | `a3_clue_thumb_scoops` (58): workshop drawers have thumb scoops the collector's claw cannot work | made for hands |
| 5.8 | CHANGED | `a2_clue_lens_carpet` (59): the spare lens is packed in the loom town's diamond-weave carpet, a teal thread through it | the mainland and the island share a supplier; links to the mainland carpet of step 10 |
| 5.9 | CHANGED | `a2_clue_cove_rings` (60): two sets of mooring rings at the far cove, one stop on the chart | a second stop that is not on the chart |
| 5.10 | CHANGED | `a3_clue_stone_box` (61): a stamped box under the hut with stones packed to the weight of a parcel | someone weighed what a parcel is |
| 5.11 | CHANGED | `a2_clue_unstamped_plank` (62): an unstamped replacement plank, rough cuts, wrong nails | someone else's hand: the island has had other visitors |
| 5.12 | KEEP | the rule that clues hint and never prove, and may contradict each other (the tender fits the cradle, but the waterline is wrong) | the owner's rule; the test blocks the proof words |
| 5.13 | KEEP | the plain mark rare: only clues 53, 55 and 61 carry it, none sets a `stamp_` flag | the critic: not on every object; the three-stamp letter L7 trigger is unchanged |

## Step 6. Years two and three: the critic's five reasons
| # | Status | Line | Reason |
|---|---|---|---|
| 6.1 | CHANGED | `a2_goal_bigger_boat`: a bigger boat that carries repair timber and crossing provisions in one trip | a reason to keep building in year two; sets `bigger_boat` |
| 6.2 | CHANGED | `a2_goal_visitor_weekend`: open the landing for one weekend and choose what visitors may do. Three choices (shore path, hide, supper); fourteen visitors counted, never named | a reason to play for others; FIXED rule 4 (counted, not tracked) holds |
| 6.3 | CHANGED | `a3_goal_hull_chocked` then `a3_goal_hull_floats`: a sound hull section from the hulk is chocked across the spring-tide line and floats free over several tides into a shore workshop (flag `shore_workshop`) | hands-on use of the hulk; gives the long Great Wash project a visible middle |
| 6.4 | CHANGED | `a3_goal_bad_copy`: a first locally cast part is bulky enough to foul the workshop door; file it, widen the door or fit it outside | a useful bad copy teaches making; three answers, none graded |
| 6.5 | CHANGED | `a3_goal_neighbour_ferry` (repeatable): on quiet sailing days the player's boat carries a neighbour's crates, a handcart waiting at the water's edge | the player becomes the other end of a gift |
| 6.6 | CHANGED | spine section 2.6 (new): the five goals as acts two and three spine goals | the critic asked for them as goals, not only events |
| 6.7 | KEEP | the four reasons already in section 2.5 (the other end of a gift, one big project, a second home, a mystery that keeps its shape) | the new five add to them |

## Step 7. Twenty seasonal events
Rewritten lightly into our voice; ids unique; mood split ten good, seven in-between, three mild trouble. Each has a physical cause; none moves a counter without a thing happening on the map. Summary in spine section 5.
| # | Status | Line | Reason |
|---|---|---|---|
| 7.1 | CHANGED | Spring: `a1_spring_gutter_rain` (good), `a2_spring_bird_rack` (in-between; counts a bird), `a1_spring_second_oar` (good), `a3_spring_roof_gust` (mild; sailcloth already stored), `a2_spring_cuttings` (good) | small physical moments of the critic's list |
| 7.2 | CHANGED | Summer: `a2_summer_seal_ledge` (good), `a1_summer_bench_halves` (in-between, join or two seats), `a2_summer_supper_boat` (good, six guests counted), `a2_summer_picnic_rock` (in-between), `a2_summer_speaker_tune` (good) | the seal event is causal: a cleared ledge, not a reward (see step 9) |
| 7.3 | CHANGED | Autumn: `a2_autumn_gate_on_beach` (in-between), `a2_autumn_kelp_arc` (mild), `a3_autumn_crew_towline` (good, four guests counted), `a2_autumn_apple_swap` (in-between), `a2_autumn_hull_lifts` (good) | |
| 7.4 | CHANGED | Winter: `a2_winter_warm_strip` (in-between), `a2_winter_far_light` (good), `a1_winter_butt_frozen` (mild), `a2_winter_fog_horn` (in-between), `a1_winter_last_sun` (good) | |
| 7.5 | CHANGED | Needs-a-thing notes: the old speaker event is conditional on a new game flag `speaker_prop` and its `source` says "needs: speaker prop"; the picnic rock says "needs: a flat picnic rock below the landing (placeholder: any rock)"; the hull event says "needs: a repaired hull on a cradle (the skiff on the slip)" | the page does not have these props yet; the page builder can place them or leave them unlit |
| 7.6 | KEEP | the two roof and tap troubles are mild: nothing breaks that cannot be mended by morning or noon | mild trouble only |
| 7.7 | CHANGED | the stand-in player in the simulation gets `speaker_prop` on day 70 | so the conditional event can fire in the test |

## Step 8. The refusal scene (week one)
| # | Status | Line | Reason |
|---|---|---|---|
| 8.1 | CHANGED | `a1_offer_dry_boards` (days 3 to 7, forced, after the first storm): the tender lands dry boards unasked; two choices, take them or hand them back and salvage the wet ones from the wrack | the critic: an early honest refusal shows the gift is optional; the player chooses |
| 8.2 | CHANGED | `a1_refusal_wet_boards`: the cost is a real afternoon barrowing wet boards up the beach; the stack ends up fine | the cost is time and raw hands, not a fine or a scolding |
| 8.3 | CHANGED | `a1_refusal_tender_keeps`: two days later the tender comes on its usual day with the ordered crates; no note about the boards | teaches the offer was genuine: nothing was a test and nothing is withheld |
| 8.4 | CHANGED | the decline choice sets the soft flag `declined_gift` and one point of the distrust lean; no reward and no penalty, no credit or cash change | the distrust counter may be fed only as a soft flag, as asked |
| 8.5 | KEEP | the take choice: four planks at once | taking is equally right |
| 8.6 | CHANGED | the simulation's stand-in player now applies a choice (a distrustful style declines; the others take the first); new test `test_refusal_scene` | so the follow-ups can fire in the test |
| 8.7 | CHANGED | spine section 3: a short note on the refusal after day 7 | the week-one beats list |

## Step 9. Cut parental reassurance; make consequences causal
| # | Status | Line | Reason |
|---|---|---|---|
| 9.1 | CHANGED | L6: "That is not your fault. ... you have the hands for it." becomes "Some things are no longer made. The slot on the shelf is empty now, and a used casting mould hangs by the yard door. It has made this part before." Variants (trust and distrust) become facts: "The ledger shows what was spent. The shelf shows what is gone." and "The ledger shows little spent. The shelf is empty all the same." | the critic: an empty catalogue slot and a used mould do the comfort without a parent's voice; "You have used what was given well" was a grade |
| 9.2 | CHANGED | L10: "You have more than you think." becomes "The yard holds more than the ledger shows." | same reassurance, now a fact the player can check |
| 9.3 | CHANGED | L11: cut "and so can you" | the island stands; the player is not coached |
| 9.3b | CHANGED | L4: "The island rests, and so can you." becomes "The island rests." | the same coaching pattern as L11 |
| 9.4 | CHANGED | L12: "it is good that it exists" becomes "it stands" | a plain closing; no praise |
| 9.5 | CHANGED | `a2_third_stamp`: cut "but it is a good thing to have noticed" | narrator praise for investigating |
| 9.6 | KEEP | P2 "Whatever you make of it will be right" and "I think you will be good at it"; L2 "None of it is wrong." | the owner's own wording and a permission, not a comfort; flagged TASTE: veto these two lines if you want the cut to go further |
| 9.7 | CHANGED | seals: `a2_hide_counts`, `a3_seal_big_year`, `a4_seals_record` now say why: the nets and drift are cleared from the east ledge, so there is room and clean water | consequences must be causal (a cleaner shore), never a reward for a chosen attitude |
| 9.8 | CHANGED | `a4_neighbour_return` and `a2_neighbour_gift_back`: the neighbour's return is explained by a ropewalk and a store that ran over, not by the player's virtue | same rule: a chain of things, not a moral ledger |
| 9.9 | KEEP | the soft attitude points on events (trust, distrust, investigate, share) | they only lean draw weights; they never change a counter, the credit line or the weather |
| 9.10 | CHANGED | the matching lines in `GIFT_LETTERS.md` and the spine warmth ladder | kept in sync |

## Step 10. The mainland: one small thing worth missing
| # | Status | Line | Reason |
|---|---|---|---|
| 10.1 | CHANGED | `p0_street`: the cafe doorway with a strip of close grey diamond-weave carpet on the step, the smell of toast, and the woman's nod | the critic: the grey town needs one small thing a player could miss, so leaving it costs something; gentle, not bleak |
| 10.2 | CHANGED | spine section 1: scene table row 2 and a new paragraph, "The mainland's one small good thing" | documents the object that travels |
| 10.3 | KEEP | the loom hum, the shut shops, the sodium light, the kind nod | the town stays grey and kind |
| 10.4 | CHANGED | the lens clue (`a2_clue_lens_carpet`, clue 59) now uses exactly that carpet, with a teal thread through it | the pattern is the thing that reappears; the teal is the island palette entering the town's weave |
| 10.5 | NEW TEST | `test_mainland_carpet_returns` | keeps the two texts tied |

## Step 11. Continuity: one key, one Great Wash, one calendar
| # | Status | Line | Reason |
|---|---|---|---|
| 11.1 | CHANGED | P1's key IS the brass key: carried from the flat's door, used first on the lidded crate at the dock (`a1_L1_key`), then the hut door (`a1_coat_hook`), then the drawer in the hut table (`a1_drawer_key`), later the back-room door and the Hoard locker | the old deck said the first crate also held "a brass key", which made two |
| 11.2 | CHANGED | `a1_L1_key` cause: the crate is locked and the key from the first envelope opens it; `p0_office` cause: the clerk hands back the same enclosed key; `a3_second_island_bought`: "A new key" cut (the second island has a gate, not a key); registry note on `has_key` | removes every second key |
| 11.3 | KEEP | the drawer that the key opens is in the hut table, the room the owner called "the uncle's room"; the word uncle stays off the cards | one drawer, one room, no relative named |
| 11.4 | CHANGED | the Great Wash is the year-three autumn big storm (days 841 to 940); L9 belongs only to year three; the first storm's letter is L3 | the first storm was shipping the Great Wash's letter and hulk |
| 11.5 | CHANGED | the first storm and the first seasons' storms are small: `a1_first_storm` now leaves about 8 heaps, a few dozen pieces, no hulk; spine day 2 and day 3 lines match | a small first storm teaches the loop; the Great Wash then means something |
| 11.6 | CHANGED | spine 2.7 (new): the four continuity rules; GIFT_LETTERS L1, L3 and L9 trigger notes | one place to look |
| 11.7 | CHANGED | calendar note: a 360-day year of four 90-day seasons, spring split (1 to 30 and 301 to 360); the storm layer's blocks of 90 from day 1 do not line up | align the notes; the code change is listed below |
| 11.8 | NEW TEST | `test_continuity_one_key_and_storm_letters`, `test_letter_nine_only_in_year_three` (L9 never before day 842, L3 within day 12, one key, small first storm) | keeps the rules |

### Needs the page builder (not mine: code in `storm.js`, `gift_day.js` and the page; do not edit from this job)
1. `GIFT_STORM.md` and `storm.js` ship a day-3 "letter nine, the Great Wash" with its own wording. Replace it with L3 (the wording in `research/GIFT_LETTERS.md`); keep L9 (the Great Wash) only for the year-three autumn big storm, day 842 or later, once.
2. `storm.js` ships a first storm of 24 heaps, about 130 units, and one big hulk on day 2. Make the first storm small (about 8 heaps, about 35 units, no hulk), and the storms of the first seasons small. Only the Great Wash of year three autumn (days 841 to 940) brings the big haul (about 900 pieces) and the hulk. The `hulk_there` flag is set only then.
3. `storm.js` counts storm cadence in 90-day blocks from day 1. The deck calendar is a 360-day year of four 90-day seasons with spring split (1 to 30 and 301 to 360), summer 31 to 120, autumn 121 to 210, winter 211 to 300. Use the deck calendar so season-tagged events and storms line up.
4. One key: check `gift_day.js` and the opening for any second key prop. The one brass key must open the lidded dock crate, then the hut door, then the hut table drawer. The first crate holds a paper letter, not a key.
5. (From later steps, collected here.) Props and actions the deck mentions: a hatch beside the hut door; the lidded box with two blankets at the landing; crates with rope handles at both ends and runners; a low dry shelf above the high-water line on the collector rack; a way to hand a parcel back to the tender (`parcel_returned`); the old speaker prop (`speaker_prop`) and a flat picnic rock; a boat shed lock at the jetty; the grey diamond-weave carpet texture (mainland cafe doorway and the lens wrapping, with a teal thread); mooring rings at the far cove; a notch on the lamp knoll; a tidal cave crate under the west skerry; thumb-scoop drawers in the workshop; the boxed stones under the hut; a dry boards offer from the tender in week one; the player's mark on the home beach and its save (step 12).
