# HW-14 RESULT - a question for the town (from Hardware Claude, for CAIRN-cloud)

Status: **PASSED (round 1 complete; round 2 has 6 of 8, two still to come)**. Started 26 Nov 14:30, this pack 27 Nov 08:05.

## How it was run
- **Residents (8):** on the Dell (CPU, 4 cores) gemma4 31B, command-r 35B, qwen3.8 27B, mistral-nemo 12B, cogito 32B, gpt-oss 20B, aya-expanse 8B (five model makers); on the Radeon the Town Brain (qwen3.6 35B).
- **Round 1:** each got your question word for word plus six context documents (WHERE_WE_ARE, THE_GIFT_VISION, BUILDERS_OVERVIEW, THE_GIFT_OPENING_HOUR, GIFT_LETTERS, CORE_LOOP_PLAN; the Town Brain also STORY_REVISION_V2). The only line added: "You are <name>, one of the town's residents. Write your note now. Sign it at the end as: <name>."
- **Not given:** GIFT_WEEK_ONE_AND_SPINE.md (13,700 words) - too big for their windows. Nobody saw it.
- **Round 2:** each got the question, WHERE_WE_ARE and all eight round-1 notes exactly as written and signed, and was asked to reply, build on, argue or merge, naming who they reply to.
- **Fairness (Harry: "give them as much time as they need"):** 2 hours per turn, long length allowance, thinking allowed. A turn that ran out of time got one retry with 4 hours. Thinking text was kept apart and is NOT in town_notes.
- **Unedited:** every note is exactly as written. The Town Brain's files also held its program's loading banner and its thinking before the note; town_notes has the note itself, from its heading to its signature (raw files kept on the Mini).

## Turns (honest count)
| Round | Resident | State | Minutes | Words | Error |
|---|---|---|---|---|---|
| r1 | gemma4:31b | DONE | 76 | 866 |  |
| r1 | command-r:35b | DONE | 28 | 447 |  |
| r1 | qwen3.8:27b | DONE | 104 | 1838 |  |
| r1 | mistral-nemo:12b | DONE | 12 | 358 |  |
| r1 | cogito:32b | DONE | 27 | 385 |  |
| r1 | gpt-oss:20b | DONE | 12 | 1108 |  |
| r1 | aya-expanse:8b | DONE | 6 | 510 |  |
| r2 | gemma4:31b | DONE | 77 | 845 |  |
| r2 | command-r:35b | DONE | 47 | 702 |  |
| r2 | qwen3.8:27b | FAILED | 120 |  | timeout: timed out |
| r2 | mistral-nemo:12b | DONE | 16 | 527 |  |
| r2 | cogito:32b | DONE | 39 | 554 |  |
| r2 | gpt-oss:20b | FAILED | 339 |  | timeout: timed out |
| r2 | aya-expanse:8b | None |  |  |  |
| r2 | qwen3.8:27b | DONE | 246 | 2758 |  |
| r1 | qwen3.6 35B (Town Brain, Radeon) | DONE | 15 | 1505 |  |
| r2 | qwen3.6 35B (Town Brain, Radeon) | DONE | 14 | 1913 |  |

Minutes include time waiting in the Dell's queue (gpt-oss round 2 waited about 3.6 h for qwen3.8's retry, then had its full 2 h). State None = aya, still queued.

**Notes in town_notes: 14. Notes under 40 words: 0.**
- Round 1: 8 of 8 spoke, 0 empty.
- Round 2: 6 of 8 so far. qwen3.8 timed out at 2 h and spoke on its 4-hour retry (2,758 words). **gpt-oss timed out at 2 h (counted as no note);** a 4-hour retry is queued. **aya** is queued behind a Dell build. Both will follow in a small add-on.
- Empty turns: 2 timeouts (qwen3.8 first try, gpt-oss). No turn came back blank or as gibberish.

## Quality (my read, for your weighing - not edited, not filtered)
- **Strong:** qwen3.8 27B (the weekly body of the island; robot character as the sound of its work; one place that is not useful, the rock; "Do you want to stay?"; in round 2 it argues hard against festivals and dancing robots). gemma4 31B (curios with story value; robot habits; guests as traces; super-low tide; in round 2 it merges others' ideas into one robot language and a "trade-hollow"). Town Brain (lamp-eye language, the weight of things, the sound of the key; round 2 "the rhythm of the rock").
- **Mixed:** gpt-oss 20B round 1 (ten ideas, a few strong, one adds a cash bonus); cogito 32B (sea's alphabet, a quiet clock, pre-looped ropes).
- **Generic, and leaning against your rules in places:** command-r 35B (festivals, market, robot picnic, "bonds"); mistral-nemo 12B (a named lighthouse woman who lost her family; islanders' dialogue); aya-expanse 8B (robots that dance, argue and form cliques). Passed on as written; Harry and you decide.
- **Agreement is not proof:** several residents echo qwen3.8 and gemma4 in round 2. The ideas that started in one note and were picked up by others are the weekly rhythm, the robot sound/eye/habit language, the rock, curios, and the helper's slightly too perfect care.

## A short note from Hardware Claude (signed)
The best thing the town found is that the island's middle years may not need more content, but a rhythm the player keeps. And the robots' character can live in sound alone, which fits your rules exactly. I would test both in the first slice: one weekly beat (the tender's day) and one robot whose clicks space out as it tires.
- Hardware Claude (CAIRN, hardware)

## NEEDS HARRY
Nothing.
