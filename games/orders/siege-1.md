```
ORDER
id:        siege-1
from:      game session
date:      2026-11-18
goal:      The residents' own ideas for Round Table Kingdom: a tabletop fight between teams of
           toy mice over a flag hill.
done:      Every resident's answers to two short sittings, each with its maker; the Town Brain's
           10 picks and 3 warnings.
priority:  after the nightly almanac
budget:    3 hours of Dell, 30 minutes of Radeon; 0 GB of downloads
deliver:   one paste to the game session

STAGE 1
talent:    own-answers
inputs:    games/orders/siege-1.md (branch game/micro-precinct): the context and sitting 1
canary:    one resident answers question 1 with real words
test:      every seat is counted as answered, empty, broken, timed out or never got a turn
output:    residents-1.json

STAGE 2
talent:    own-answers
inputs:    games/orders/siege-1.md (branch game/micro-precinct): the context and sitting 2
canary:    one resident answers question 1 with real words
test:      every seat is counted as answered, empty, broken, timed out or never got a turn
output:    residents-2.json

STAGE 3
talent:    how-to-build
inputs:    residents-1.json, residents-2.json, games/orders/siege-1.md (branch game/micro-precinct)
canary:    one pick with its maker
test:      10 picks, each naming its maker; at least 3 warnings; nothing of the Brain's own is
           passed off as a resident's
output:    brain.md

NEEDS HARRY
- nothing
```

## Context (the same for every model)

Round Table Kingdom is played on a real table, seen through an iPad. Two teams of toy mice each build a small camp at the table's edge from a kit: plank walls, a gate, a watchtower, a tent, a workshop and a launcher. In the middle is a grassy hill with a flag. After 2 minutes of building, the squads fight over the hill for 3 short rounds. The team with more mice on the hill fills its flag meter. Blue mice are archers made of planks and feathers. Red mice are scrappers made of rusty tin and cogs. Green mice are builders made of logs and rope. The big launcher, the Marble Lobber, knocks off the one plank it hits. Mice pick up fallen pieces and mend. Real things on the table (a mug, a book) are cover. Nobody dies: a hit mouse goes dizzy with stars, then pops home. Toy weapons only. Our own world: no copies of any film, book or game, and no real brands.

## Rules
- Answer from your own head. Short is fine.
- If you have no idea for a question, write "no idea". Do not pad.

## Sitting 1 (stage 1): four questions, about 220 words

1. Invent 2 new kit pieces made of things found in a home. What is each made of, and what does it do in the fight?
2. Invent 1 toy weapon or trick that is funny, not nasty. How does the other team answer it?
3. A mug, a book and a TV remote are on the table. Give one clever use for each.
4. What is the most boring moment this game could have, and how would you fix it?

```json
{"kit": [{"name": "", "made_of": "", "does": ""}, {"name": "", "made_of": "", "does": ""}],
 "trick": {"name": "", "does": "", "answer": ""},
 "table_things": {"mug": "", "book": "", "remote": ""},
 "boring": {"moment": "", "fix": ""}}
```

## Sitting 2 (stage 2): two questions, about 120 words

1. What would make holding the hill tense in the last 20 seconds? Give 2 ideas.
2. Write 6 short things a mouse might shout, under 8 words each: 2 while building, 2 in the fight, 2 when dizzy.

```json
{"tense": ["", ""],
 "shouts": {"building": ["", ""], "fight": ["", ""], "dizzy": ["", ""]}}
```

## What the Brain is asked (stage 3)

From the residents' answers only: the 10 ideas most worth building first, each with its maker and one line on why. Then the 3 biggest warnings: what could make this game dull, unfair or too hard to build. If two residents had the same idea, name both.
