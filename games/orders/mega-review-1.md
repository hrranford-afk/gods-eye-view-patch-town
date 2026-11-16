```
ORDER
id:        mega-review-1
from:      game session
date:      2026-11-16
goal:      The town's own answer to Harry's question "How's this game going to be mega? What's it
           missing?", and a check of the town itself: can the town already help with what's
           missing, or does it need to train new experts to help?
done:      The residents' ideas, the Town Brain's ranked list of what's missing, and a capability
           table: for each need, "can do now" (which seat) or "needs training" (a training plan:
           what to train, from what material, its licence, size, minutes, how to test it).
           At most 2 small training runs, only where no download is needed.
priority:  after the nightly almanac and keep-1
budget:    3 hours of Radeon (Brain + trainer), 1 hour of Mill, Dell as a bonus; 0 GB of
           downloads unless Harry says yes in the town chat
deliver:   one paste to the game session, words untouched with "by", plus the run report

STAGE 1
talent:    own-answers
inputs:    games/orders/inputs/mega-1-brief.md (branch game/micro-precinct)
canary:    one resident answers question 1
test:      every answer fills the JSON shape
output:    residents.json

STAGE 2
talent:    how-to-build
inputs:    the brief and residents.json
test:      a ranked list of 10 with reasons; names the makers of ideas it uses
output:    brain-missing.md

STAGE 3
talent:    how-to-build
inputs:    brain-missing.md, games/TOWN_MACHINES.md, games/HOW_TO_SEND_WORK_TO_PATCHTOWN.md
test:      every need has "can do now" with a seat, or "needs training" with a full plan
output:    capability.md

STAGE 4 (only for training plans that need no download and use material the town already has
         and may use)
talent:    trainer
inputs:    capability.md
canary:    the smallest plan first
test:      the new expert beats the old seat on 10 test prompts, judged by the Brain blind
output:    the new expert's name, size and minutes; 10 before/after answers

NEEDS HARRY
- Nothing to start. If a training plan needs new material or a download, list it (name, size,
  licence, why) and wait for Harry's yes in the town chat.
```

## Context (the same for every model)

Read the brief. Harry wants his games to become something people love and come back to every day. We have an AR room engine, three games and many ideas (see the brief). We want ideas that fit this engine and these machines, not wishes.

## Questions for each resident (stage 1, about 220 words)

1. What is the one thing missing that would make people come back every day?
2. What would make the scary adult Sofa Keep truly frightening in a real living room, without blood?
3. Invent one game mode for the shared kit that nobody has listed yet.
4. What could this town learn or train to help make these games better?

Shape: `{"missing":"","scary":"","new_mode":{"name":"","how":""},"town_could_learn":""}`

## For the Town Brain

**Stage 2:**
- Rank the 10 biggest things missing, using the brief and the residents' answers.
- For each one: why it matters, and who should do it (the cloud session, the town, or Harry).

**Stage 3:**
- For each of the 10, and for the residents' "town could learn" ideas, say whether the town can do it now (which seat), or needs to train an expert.
- For each training plan, give:
  - what it is for;
  - what material it learns from, with a licence that allows it;
  - the size;
  - the machine and minutes;
  - a 10-prompt test that proves it is better.
- Be honest where training is not worth it.

## Rules

- Words untouched, each with its maker. Count empty and broken seats honestly.
- Nothing personal goes into any model.
- Training material must have a licence that allows it, named in the plan.
- Family games: nobody dies. The adult version: scary, not gory, until Harry decides.
- No copies of existing games, films or characters.
- One heavy job per machine. Stop at the budget.
- End with the standing run report (games/STANDING_ORDERS.md).
