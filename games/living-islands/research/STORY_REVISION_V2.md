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
