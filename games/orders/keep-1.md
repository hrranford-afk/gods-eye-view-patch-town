```
ORDER
id:        keep-1
from:      game session
date:      2026-11-16
goal:      First designs for Sofa Keep: a fantasy siege where the player sits on the real sofa as
           the king, builds walls and defences around it, and holds off waves climbing up from the floor.
done:      Defences, attackers, a king's weapon, one wave plan and 6 concept pictures, each idea
           with its maker; the Town Brain's pick of the best and its warnings.
priority:  after the nightly almanac
budget:    2 hours of Radeon (Brain + pictures), 1 hour of Mill, Dell as a bonus; 0 GB of downloads
deliver:   one paste to the game session (words untouched, each with "by"; pictures listed by file)

STAGE 1
talent:    ideas
inputs:    the openings below
canary:    5 sparks from one expert
test:      at least 60 sparks
output:    sparks.json

STAGE 2
talent:    own-answers
inputs:    games/SOFA_KEEP_IDEA.md and games/GAME_MODES_PLAN.md (branch game/micro-precinct), plus this order
canary:    one resident answers question 1
test:      every answer fills the JSON shape
output:    residents.json

STAGE 3
talent:    how-to-build
inputs:    sparks.json, residents.json, games/SOFA_KEEP_IDEA.md
test:      picks name their makers; at least 3 warnings
output:    brain.md

STAGE 4
talent:    pictures
inputs:    the six picture lines below
canary:    picture 1
test:      6 pictures, each matching its line
output:    keep1/pics/01.png to 06.png + contact_sheet.png

NEEDS HARRY
- nothing
```

## Context (the same for every model)

Sofa Keep is an augmented-reality game played in a real living room. The real sofa is the castle. The player sits on it as the king, directing from the top. Around the sofa, on the real floor and rug, they build walls, gates, towers and toy turrets from gathered household materials (lolly sticks, bottle caps, string, cardboard, buttons). At night, waves of little fantasy attackers come across the floor and try to climb the sofa: ladders, grapples, stacking on each other, sneaking behind cushions. The king has one weapon of their own, like a catapult. Building is the main defence. A second player can join to build or take a turret. It is our own world: no copies of any film, book or game. In the family version nobody dies: bonked attackers tumble down and crawl home.

## Openings for the tiny experts (stage 1)

- "The king looked down from the cushion and saw..."
- "The best wall in the whole living room was made of..."
- "Up the side of the sofa came a little army of..."
- "The secret trap under the rug..."
- "At dawn, help arrived from the kitchen: ..."
- "The king's own catapult fired..."

## Questions for each Dell resident (stage 2, about 220 words)

1. Invent 3 defences built from household things: what each is made of, what it does, and what it costs.
2. Invent 3 attackers that climb the sofa: what they look like, how they climb, and their weakness.
3. Invent the king's own weapon and one upgrade for it.
4. Describe one night: 3 waves, getting harder, and what makes each wave different.

Shape: `{"defences":[{"name":"","made_of":"","does":"","cost":""}],"attackers":[{"name":"","looks":"","climbs":"","weak_to":""}],"king_weapon":{"name":"","fires":"","upgrade":""},"night":["","",""]}`

## For the Town Brain (stage 3)

From the sparks and the residents' answers: pick the best 5 defences, 5 attackers, 1 king's weapon and 1 night plan. Name each maker. Then give 3 warnings: what would make this boring, unfair or too hard in a real living room.

## Six picture lines (stage 4)

Toy-diorama style, soft light, chunky shapes, no text, no brands.

1. A sofa as a castle keep, seen from the floor, with lolly-stick walls and a cardboard gate on the rug.
2. A tiny king on a cushion top with a bottle-cap catapult.
3. Little fantasy attackers climbing a sofa's front with lolly-stick ladders.
4. A button-and-string turret on the arm of a sofa.
5. A night scene: torch-lit toy walls on a rug, shadows coming from under a coffee table.
6. Dawn: toy helpers marching in from a kitchen doorway.

## Rules

- Words stay exactly as written, each with its maker.
- Nobody dies. Nothing burns: torches are toy lights.
- No batteries or flames as weapons. No real brands, landmarks or copied characters.
- Nothing personal goes into any model.
