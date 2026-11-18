```
ORDER
id:        siege-2
from:      game session
date:      2026-11-18
goal:      Play Round Table Kingdom on the town's own machines in a real Safari-family browser
           engine, and tell us what breaks and how fast it runs. The cloud can only test in one
           engine with no graphics card, so this is a check the cloud cannot do.
done:      A run report with errors, speed numbers and 4 screenshots from each engine the town
           has; the residents' view of the bot report; the Town Brain's 5 most useful fixes.
priority:  after siege-1; before server-1
budget:    1 hour of Mini (robot browsers), 1 hour of Dell (residents), 20 min of Radeon (Brain);
           0 GB of downloads; no training
deliver:   one paste to the game session (words untouched, each with "by"; pictures listed by
           file name and kept on the home machines)

STAGE 1
talent:    two-engine test
inputs:    the test link and the three addresses below
canary:    the title screen loads in one engine with 0 errors
test:      every address tried in every engine the town has; each result is real numbers or the
           word UNKNOWN, never a guess
output:    engines.json + 4 screenshots per engine

STAGE 2
talent:    own-answers
inputs:    engines.json, and BOT_REPORT.md from the link below
canary:    one resident answers question 1 with real words
test:      every seat marked real, empty or timed out
output:    residents.json

STAGE 3
talent:    pick-and-warn
inputs:    engines.json, residents.json
test:      5 fixes, each with its maker and its evidence
output:    brain.md

NEEDS HARRY
- nothing (no downloads; the game page is public)
```

## The game (context for every model)

Round Table Kingdom is a toy battle on a round table. Two teams of toy mice each build a camp from a kit, then fight for 3 one-minute rounds over a flag hill in the middle. A Marble Lobber knocks single planks off walls; mice that are hit go dizzy and pop home; mice mend in the breaks. Nobody dies. Today it runs on a practice table on a web page, not in augmented reality yet.

## Stage 1: what to open

Test link: https://hrranford-afk.github.io/gods-eye-view-patch-town/sofa-siege/

1. The link as it is: the title screen. Record page errors and the time to first picture.
2. The link with `?auto=both&level=easy&report=1` added: two robots play a whole match at real speed (about 5 minutes). When it ends, the page shows a report on screen and in `window.SG_REPORT`. Record all of it.
3. The same with `level=hard`.

If address 2 shows the title screen and no robot match, the game session has not put that feature on the link yet: say so and stop stage 1 there. Do not work around it.

For each engine, report: engine name and version, machine, page errors (word for word), frames per second (average, and the worst 1 in 100), the longest single freeze, memory if known, who won, and whether the match finished. Screenshots: the title, the build step at 1 minute, round 2, the win screen.

## Stage 2: questions for each resident (about 150 words in all)

BOT_REPORT.md is at:
https://raw.githubusercontent.com/hrranford-afk/gods-eye-view-patch-town/game/sofa-siege/games/sofa-siege/BOT_REPORT.md

1. From the numbers, what is the single most worrying thing? Quote the number.
2. Which rule would you change first to make a match more exciting to watch, and what would you expect to happen?
3. Name one thing the report does not measure that it should.

## Stage 3: what the Brain is asked

From stages 1 and 2 only: the 5 fixes most worth doing first, each with its maker and the evidence (a number or an error message). If the engines disagree with each other, say which one and how.

## Lessons to apply (the town decides HOW)
- Refuse a job with missing or wrong arguments out loud.
- Ask the Dell Writer in plain text. Give the Dell Elder longer, or questions 1 and 2 only.
- No training and no pictures made by models: the Mini's disk is under its floor.

## Run report (standing order)
For each stage: machine, model, start and finish (UK time), minutes running and waiting (and why), seats asked / real / empty / timed out, canaries, free disk at start and end, the slowest step.
