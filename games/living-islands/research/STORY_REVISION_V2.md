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
