```
ORDER
id:        epic-1
from:      game session
date:      2026-11-21
goal:      The residents' own ideas for one epic game played on a real table, seen through an iPad, on any table shape. Nobody has decided what the game is.
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

We make games played on a real table, seen through an iPad. Tables are round, square or rectangular, and people sit or stand all round them. We want to make one epic game, and we do not know yet what it is. What we can already build: small toy-like worlds, pieces that come apart bit by bit, little characters with jobs, things you design with sliders, a design saved as short text you can send to a friend, and a version where every brick is its own object. Nothing may copy an existing game. No real brands or people.

## Rules
- Answer from your own head. Short is fine.
- If you have no idea for a question, write "no idea". Do not pad.

## Sitting 1 (stage 1): four questions, about 220 words

1. Invent a game that does not exist yet, and say it in one sentence.
2. Why does it need a real table and an iPad you can walk round with, and not just a flat screen?
3. One rule so it looks right from every seat at a round, a square and a rectangular table.
4. What would a player tell a friend about it the next day?

```json
{"game": "", "why_real_table": "", "table_rule": "", "told_a_friend": ""}
```

## Sitting 2 (stage 2): four questions, about 220 words

1. Give two more game ideas that are very different from each other and from your first.
2. What would make one of them hard to stop playing?
3. How do two friends play it together, or against each other?
4. What is the first five minutes like for someone new?

```json
{"other_games": ["", ""], "hard_to_stop": "", "friends": "", "first_five": ""}
```

## Sparks (stage 3)

Three themes: A. what the table is. B. what the player does with their hands. C. what happens when two friends want different things.
Sentence openings, two per theme:
A1. "The table is really a..."  A2. "Everyone around the table can see..."
B1. "The best thing to do with your hands is..."  B2. "The most satisfying moment is when..."
C1. "When two friends want different things, the game..."  C2. "The funniest way to lose is..."
