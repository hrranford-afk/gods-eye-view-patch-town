```
ORDER
id:        epic-1
from:      game session
date:      2026-11-21
goal:      The residents' own ideas for one epic game played on a real table, seen through an iPad: a small living world (an island or a town) on any table shape.
done:      Every resident's answers to two short sittings, each with its maker; the Town Brain's 3 game concepts, 10 picks and 3 warnings.
priority:  after the nightly almanac
budget:    3 hours of Dell, 30 minutes of Radeon, 30 minutes of Mill; 0 GB of downloads
deliver:   one paste to the game session

STAGE 1
talent:    own-answers
inputs:    games/orders/epic-1.md (branch game/micro-precinct): the context and sitting 1
canary:    one resident answers question 1 with real words
test:      every seat is counted as answered, empty, broken, timed out or never got a turn
output:    residents-1.json

STAGE 2
talent:    own-answers
inputs:    games/orders/epic-1.md (branch game/micro-precinct): the context and sitting 2
canary:    one resident answers question 1 with real words
test:      every seat is counted as answered, empty, broken, timed out or never got a turn
output:    residents-2.json

STAGE 3
talent:    ideas
inputs:    three themes, two sentence openings each (written below)
test:      at least 60 sparks written, each tagged with its maker
output:    sparks.json

STAGE 4
talent:    how-to-build
inputs:    residents-1.json, residents-2.json, sparks.json, games/orders/epic-1.md (branch game/micro-precinct)
canary:    one concept with its makers
test:      3 concepts, 10 picks, each naming its maker; at least 3 warnings; nothing of the Brain's own is passed off as a resident's
output:    brain.md

NEEDS HARRY
- nothing
```

## Context (the same for every model)

We make games played on a real table, seen through an iPad. Tables are round, square or rectangular, and people sit or stand all round them. The game is a small world on the table: a toy island or town where little mice live, work and build. We already have toy buildings that come apart bit by bit, mice with jobs, weapons you design with sliders, bases saved as short text you can send to a friend, and a hill to hold. Nothing may copy an existing game. No real brands. Nobody gets hurt.

## Rules
- Answer from your own head. Short is fine.
- If you have no idea for a question, write "no idea". Do not pad.

## Sitting 1 (stage 1): four questions, about 220 words

1. One rule so the world looks right from every seat at a round, a square and a rectangular table. How should it turn: any angle, quarter turns or half turns?
2. Say the whole game in one sentence, as a person would to a friend.
3. Name three things that would make someone lean in and walk round the table.
4. What would make a visitor want to play again tomorrow?

```json
{"table_rule": "", "turns": "", "one_sentence": "", "lean_in": ["", "", ""], "again_tomorrow": ""}
```

## Sitting 2 (stage 2): four questions, about 220 words

1. What does one mouse do in a day, and what makes you care about it?
2. Describe one disaster or surprise that is fun, not nasty, and how the player reacts.
3. How do two friends at the same table play together, or against each other?
4. What is the first five minutes like for someone who has never played?

```json
{"mouse_day": "", "surprise": {"what": "", "reaction": ""}, "friends": "", "first_five": ""}
```

## Sparks (stage 3)

Three themes: A. a small island that changes with the weather. B. mice who run a busy town. C. a world that reacts to the room it is placed in.
Sentence openings, two per theme:
A1. "On the island, the tide brings..."  A2. "The best storm is the one that..."
B1. "The mice are happiest when..."  B2. "The worst traffic jam is caused by..."
C1. "When the table is round, the world..."  C2. "The room itself becomes..."
