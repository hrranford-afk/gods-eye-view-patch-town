```
ORDER
id:        siege-1
from:      game session
date:      2026-11-18
goal:      Ideas from the residents for Sofa siege: a tabletop base fight between teams of toy
           mice over a flag hill, on a real table.
done:      Each resident's own answers to the 6 questions below, each with its maker; the Town
           Brain's pick of the best 10 and its 3 biggest warnings; a run report.
priority:  after the nightly almanac; before server-1
budget:    3 hours of Dell (the residents, one at a time), 30 min of Radeon (the Brain);
           0 GB of downloads; no training; no pictures
deliver:   one paste to the game session (words untouched, each with "by")

STAGE 1
talent:    own-answers
inputs:    this order (the context and the 6 questions)
canary:    one resident answers question 1 with real words (not empty)
test:      every seat is marked real, empty or timed out; an empty seat is asked once more in
           plain text before it is marked empty
output:    residents.json

STAGE 2
talent:    pick-and-warn
inputs:    residents.json and this order
canary:    the Brain names one idea and its maker
test:      10 picks, each with its maker; at least 3 warnings; nothing invented by the Brain is
           passed off as a resident's
output:    brain.md

NEEDS HARRY
- nothing
```

## Lessons from the last orders (please apply; the town decides HOW)
- A job whose arguments are missing or wrong must be refused out loud, not run as a default job.
- The Dell Writer returned nothing in every round when asked for a fixed shape. Ask it in plain text.
- The Dell Elder ran out of time at the old allowance. Give it longer, or a shorter question set (questions 1, 3 and 6 only).
- The Mini's disk is under its floor, so this order asks for no training and no pictures.

## Context (the same for every resident)

Sofa siege is an augmented-reality game played on a real table in a real living room, seen through an iPad. Two teams of toy mice each build a small camp at the edge of the table from a kit: plank walls, a gate, a watchtower, a tent, a workshop and one launcher. In the middle of the table is a little grassy hill with a flag. After 2 minutes of building, the squads walk out and fight over the hill. The team with more mice standing on the hill fills its flag meter; the fullest meter after 3 short rounds wins. A whole match takes about 8 minutes.

The teams are told apart by what they are made of. Blue: planks, canvas and feathers; archers, quick with a long reach. Red: rusty scrap, tin and cogs; scrappers, slow but they knock walls down. Green: logs, vines and rope; builders, they mend fastest.

The big launcher is the Marble Lobber: a wooden carriage on wheels with a crank and a bucket of marbles. A hit knocks off the one plank or post it lands on, not a health bar. Mice run out, pick up fallen pieces and hammer them back.

Real things on the table (a mug, books, a remote) are cover. Nobody dies: a mouse that is hit goes dizzy, sits down with stars round its head, then pops back to its own camp. Toy weapons only. It is our own world: no copies of any film, book or game, and no real brands.

## Questions for each resident (about 250 words in all)

1. Invent 3 new kit pieces a team could build, made of things found in a home. Say what each is made of and what it does in the fight.
2. Invent 2 toy weapons or tricks that are funny, not nasty. Say how the other team can answer each one.
3. What would make holding the hill tense in the last 20 seconds? Give 2 ideas.
4. A mug, a book and a TV remote are on the table. Give one clever use for each.
5. Write 6 short things a mouse might shout (under 8 words each): 2 while building, 2 in the fight, 2 when dizzy.
6. What is the most boring moment this game could have, and how would you fix it?

## What the Brain is asked (stage 2)

From the residents' answers only: pick the 10 ideas most worth building first, each with its maker and one line on why. Then give the 3 biggest warnings (what could make this game dull, unfair or too hard to build). If two residents had the same idea, name both.

## Run report (standing order)

For each stage: machine, model, start and finish (UK time), minutes running, minutes waiting and why. Seats asked, real, empty, timed out, with the reason. Canaries passed or failed. Free disk at start and end. The slowest step and why.
