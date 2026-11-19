```
ORDER
id:        siege-3
from:      game session
date:      2026-11-19
goal:      Make the buildings and the shooting in Round Table Kingdom worth caring about. Harry
           played it and said building a camp makes no difference and the catapult is dull.
done:      Sparks from the tiny experts; every resident's answers to two short sittings, each
           with its maker; the Town Brain's 10 picks, 3 warnings and one whole-game proposal.
priority:  first, before siege-1 and siege-2
budget:    1 hour of Mill, 3 hours of Dell, 40 minutes of Radeon; 0 GB of downloads
deliver:   one paste to the game session

STAGE 1
talent:    ideas
inputs:    the six openings in games/orders/siege-3.md (branch game/micro-precinct)
canary:    5 sparks from one expert
test:      at least 60 sparks written
output:    sparks.json

STAGE 2
talent:    own-answers
inputs:    games/orders/siege-3.md (branch game/micro-precinct): the context and sitting 1
canary:    one resident answers question 1 with real words
test:      every seat is counted as answered, empty, broken, timed out or never got a turn
output:    residents-1.json

STAGE 3
talent:    own-answers
inputs:    games/orders/siege-3.md (branch game/micro-precinct): the context and sitting 2
canary:    one resident answers question 1 with real words
test:      every seat is counted as answered, empty, broken, timed out or never got a turn
output:    residents-2.json

STAGE 4
talent:    how-to-build
inputs:    sparks.json, residents-1.json, residents-2.json, games/orders/siege-3.md
           (branch game/micro-precinct)
canary:    one pick with its maker
test:      10 picks, each naming its maker; at least 3 warnings; one whole-game proposal of
           under 200 words; nothing of the Brain's own passed off as a resident's
output:    brain.md

NEEDS HARRY
- nothing
```

## Context (the same for every model)

Round Table Kingdom is played on a real table, seen through an iPad. Two teams of toy mice each build a small camp at the table's edge: plank walls, a gate, a watchtower with the team flag, a tent, a workshop and a launcher that lobs marbles. In the middle is a grassy hill. After building, the mice fight for 3 short rounds. A marble knocks parts off whatever it hits, and things fall down when their supports are gone. Knock down the other team's watchtower and you win. Mice can raid, guard and mend. Nobody dies: a hit mouse goes dizzy with stars, then pops home. Toy weapons only. Our own world: no copies of any film, book or game, and no real brands.

The player who tried it said: building the camp made no difference, the launcher was dull, and there was not much to do. We want each building to have a job you care about, and several fun ways to attack.

## Openings for the tiny experts (stage 1)

- "The building every camp wants but few can afford is..."
- "The mice cheered when the launcher fired a..."
- "The cleverest way to break a wall without a marble is..."
- "Inside the workshop, the mice were secretly making..."
- "The enemy never saw it coming: hidden under the tent was..."
- "With ten seconds left, the losing team's last trick was..."

## Rules
- Answer from your own head. Short is fine.
- If you have no idea for a question, write "no idea". Do not pad.

## Sitting 1 (stage 2): buildings. Four questions, about 220 words

1. Pick 3 buildings a camp could have. For each: its job in the fight, and what the team loses when it is knocked down.
2. Invent 1 building that makes another building better when they stand side by side. Say how.
3. Where should a clever player put the watchtower, and why? What mistake would a beginner make?
4. Name 1 thing a player could build that is risky: strong if it works, costly if it fails.

```json
{"buildings": [{"name": "", "job": "", "lost_when_down": ""}, {"name": "", "job": "", "lost_when_down": ""}, {"name": "", "job": "", "lost_when_down": ""}],
 "combo": {"building": "", "helps": "", "how": ""},
 "watchtower": {"clever_spot": "", "why": "", "beginner_mistake": ""},
 "risky": {"name": "", "if_it_works": "", "if_it_fails": ""}}
```

## Sitting 2 (stage 3): attacking. Four questions, about 220 words

1. Invent 3 things the launcher could fire besides a marble. For each: what it does, and how the other team can defend.
2. Invent 1 way to attack that does not use the launcher at all.
3. What should a player have to decide in the 3 seconds before each shot, to make aiming interesting?
4. What is the funniest thing that could happen when a tower falls?

```json
{"ammo": [{"name": "", "does": "", "defence": ""}, {"name": "", "does": "", "defence": ""}, {"name": "", "does": "", "defence": ""}],
 "other_attack": {"name": "", "how": ""},
 "decide": "",
 "funny_fall": ""}
```

## What the Brain is asked (stage 4)

From the sparks and the residents' answers only: the 10 ideas most worth building first, each with its maker and one line on why. Then the 3 biggest warnings. Then one proposal of under 200 words for how building and attacking should fit together so that a match is fun: name the residents whose ideas it uses.
