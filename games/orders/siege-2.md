```
ORDER
id:        siege-2
from:      game session
date:      2026-11-18
goal:      Prove Round Table Kingdom starts and plays a whole robot match in WebKit as well as
           Chromium, on a machine with a real graphics card, and measure its speed.
done:      A two-engine report: page errors, speed numbers and 4 screenshots per engine; the
           residents' reading of the robot-match numbers; the Town Brain's 5 fixes.
priority:  after siege-1
budget:    1 hour of Mini, 1 hour of Dell, 20 minutes of Radeon; 0 GB of downloads
deliver:   one paste to the game session

STAGE 1
talent:    two-engine-test
inputs:    the live game https://hrranford-afk.github.io/gods-eye-view-patch-town/sofa-siege/
           and the three addresses listed below
canary:    load the title screen in WebKit: the title reads "Round Table Kingdom", with no
           page error
test:      in each engine: all three addresses tried; page errors counted (must be 0); the
           robot match finishes with a winner; every number is measured or says UNKNOWN
output:    engines.json + 4 screenshots per engine

STAGE 2
talent:    own-answers
inputs:    engines.json; games/sofa-siege/BOT_REPORT.md (branch game/sofa-siege)
canary:    one resident answers question 1 with real words
test:      every seat is counted as answered, empty, broken, timed out or never got a turn
output:    residents.json

STAGE 3
talent:    how-to-build
inputs:    engines.json, residents.json
canary:    one fix with its maker and its evidence
test:      5 fixes, each with its maker and a number or an error message as evidence
output:    brain.md

NEEDS HARRY
- nothing
```

## Context (the same for every model)

Round Table Kingdom is a toy battle on a round table. Two teams of toy mice each build a camp from a kit, then fight for 3 one-minute rounds over a flag hill in the middle. A launcher called the Marble Lobber knocks single planks off walls. Mice that are hit go dizzy and pop home. Mice mend in the breaks. Nobody dies. Today it runs on a practice table on a web page, not in augmented reality yet. Robots can play both sides.

## Stage 1: the three addresses

1. The live game as it is: the title screen. Record page errors and the time to the first picture.
2. The live game with `?auto=both&level=easy&report=1` added. Two robots play a whole match at real speed, about 5 minutes. At the end the page shows a report on screen, and the same report is in `SG_REPORT` on the page.
3. The same with `level=hard`.

The robot match went live at 11:42 UK on 18 Nov. If address 2 still shows the title screen and no robot match, say so and stop stage 1 there.

For each engine, record: engine name and version, page errors word for word, frames per second (average, and the worst 1 in 100), the longest single freeze, who won, and whether the match finished. Screenshots: the title, the build step at 1 minute, round 2, the win screen.

## Stage 2: three questions for each resident, about 150 words

1. From the numbers, what is the single most worrying thing? Quote the number.
2. Which rule would you change first to make a match more exciting to watch, and what would you expect to happen?
3. Name one thing the report does not measure that it should.

```json
{"worry": {"number": "", "why": ""},
 "rule_change": {"rule": "", "expect": ""},
 "missing_measure": ""}
```

## What the Brain is asked (stage 3)

From stages 1 and 2 only: the 5 fixes most worth doing first, each with its maker and its evidence. If the two engines disagree, say which one and how.
