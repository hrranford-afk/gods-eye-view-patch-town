```
ORDER
id:        server-1
from:      game session
date:      2026-11-17
goal:      The town's part in the round table on the PatchTown Server spec (games/works/SERVER_SPEC.md):
           a reality check from the Town Brain, and names, stories and delight from the residents and
           tiny experts.
done:      The Brain's answers to the 5 questions in section 6, plus a "can our machines run this?" table
           (one row per part); residents' answers in JSON; sparks from the tiny experts.
priority:  after the nightly almanac and the disk move
budget:    1 hour of Radeon, 1 hour of Mill, Dell as a bonus; 0 GB of downloads
deliver:   one paste to the game session, words untouched with "by", plus the run report

STAGE 1
talent:    how-to-build
inputs:    games/works/SERVER_SPEC.md (branch game/micro-precinct), games/TOWN_MACHINES.md
canary:    the Brain answers question 2 only
test:      every part in section 3 has a row: can run now / needs work / can't on this hardware, with why
output:    brain-server.md

STAGE 2
talent:    own-answers
inputs:    SERVER_SPEC.md sections 1, 3 and 4 only (short), and this order
canary:    one resident answers question 1
test:      every answer fills the JSON shape
output:    residents.json

STAGE 3
talent:    ideas
inputs:    the openings below
test:      at least 60 sparks
output:    sparks.json

NEEDS HARRY
- nothing
```

## Questions for each resident (about 220 words)
1. Which part of the server would you most like to live next to in the town, and what would you see from your window?
2. Name one small, true moment the town should show when a job goes well, and one when it goes wrong.
3. If you were benched for a round, what would you want the town to show, so it feels fair?

Shape: `{"neighbour":"","window":"","good_moment":"","bad_moment":"","benched":""}`

## Openings for the tiny experts
- "The toll gate turned the wagon back because..."
- "When the reservoir dropped below the line, the townsfolk..."
- "The new graduate walked down from the university and..."
- "At the exam hall, nobody was allowed to mark their own..."
- "The fox sat by the pond until..."
- "The night watch heard no heartbeat from the workshop, so..."

## Rules
- Words untouched, each with its maker. Count empty and broken seats honestly.
- No downloads. Nothing personal. Disk floor respected (run after the move).
- End with the standing run report.
