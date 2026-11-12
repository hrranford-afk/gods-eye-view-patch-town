ORDER
id:        seasons-1
from:      game session (CAIRN)
date:      2026-11-12
goal:      Base Camp follows the real year. The creatures decorate the room for each season, starting with autumn
           and an advent calendar of 24 real days from Sunday 29 Nov 2026. Robot play also measures where the colony
           stalls, so the seasons can fix the pacing.
done:      the season plan (stage 1); 60 pictures (stage 2); a new tiny expert, "the Colonist" (stage 3); at least 150
           sparks (stage 4); a pacing report from at least 200 robot colonies (stage 5); 24 advent doors (stage 6).
priority:  tonight, after the nightly almanac. On the Radeon: stage 1, then stage 3, then stage 2 (art-b1 stage 1 may
           finish first if it is already running). The Mill, the Mini and the Dell start at once, side by side.
budget:    Radeon 6 hours; Mill 3 hours; Mini 6 hours; Dell as it frees up (bonus, may arrive later);
           0 GB of downloads (stage 3b only, see NEEDS HARRY)
deliver:   one paste to the game session, with the honest counts for each stage

STAGE 1
talent:    how-to-build
inputs:    the context and questions below; games/base-camp/creatures.json; games/COUNCIL_ROUND4_BASE_CAMP.md
           (branch game/micro-precinct)
canary:    question S1 alone
test:      valid JSON in the shape below; a plan for every season of the year; at least one disagreement with the
           plan in this order, with a reason
output:    seasons_plan.json + brain_notes.md

STAGE 2
talent:    pictures
inputs:    games/base-camp/art/prompts/S1_season_decor.md (branch game/micro-precinct)
canary:    one advent calendar picture (item 4)
test:      one whole object, on a plain background, with no letters, digits or logos
output:    art/seasons/<item>/NN.png + contact_sheet.png

STAGE 3
talent:    training (the trainer)
inputs:    the town's own Base Camp words, all already committed on game/micro-precinct:
           games/COUNCIL_ANSWERS.md, COUNCIL_ANSWERS_ROUND2.md, COUNCIL_ANSWERS_ROUND3.md,
           games/base-camp/almanac.json, games/base-camp/creatures.json, games/base-camp/rooms.json
goal:      a new tiny expert, "the Colonist". It continues a sentence in Base Camp's own voice: tiny, funny, kind,
           and nobody dies.
canary:    a short first training run, then 10 continuations of "Pip looked up at the ceiling and"
test:      CAIRN's check: out of 20 continuations, at least 12 stay in voice (tiny scale, household things, kind,
           nobody hurt). Count them honestly. If it fails, report it and do not retry more than twice.
output:    the expert in the Mill's list + colonist_samples.txt (40 continuations, untouched)

STAGE 4
talent:    ideas
inputs:    the themes and sentence openings below. If stage 3 passes in time, the Colonist joins in too.
test:      at least 150 sparks, each tagged with its expert
output:    sparks_seasons.json

STAGE 5
talent:    play-testing (plus two-engine-test for the WebKit share)
inputs:    games/orders/inputs/seasons-1-robot.md (branch game/micro-precinct)
canary:    1 colony, 2 hours of game time, in Chromium
test:      at least 200 colonies finished, 20 of them in WebKit; every page error logged with its engine
output:    pacing.json + PACING_REPORT.md

STAGE 6
talent:    own-answers (Dell residents, one seat at a time, as they free up)
inputs:    questions D1 to D4 below
test:      valid JSON in the shape given; count asked, answered, empty, broken and never had a turn
output:    residents_seasons.json

NEEDS HARRY
- Nothing for stages 1 to 6. Stage 3 trains only on the town's own committed words.
- Optional stage 3b: a second expert, "the Almanac Keeper", trained on public-domain books about British seasons,
  festivals and country customs. It needs a download. The town names the books, their size and licence (public
  domain or open) in its quote. Harry says yes in the town chat if he wants it.


## Context (the same for every model)
Base Camp is an AR game on an iPad. Thumb-sized dust-bunny creatures (Glip, Grizzle, Gloop, Glimmerfluff, Pip and
friends) live on the real surfaces of a real room: the floor, desk, shelves, windowsill and speaker tops. They build
from household rubbish: matchbox huts, bottle-cap wells, thimble cable cars on dental floss, and a hook on the ceiling
for zip lines. Now they follow the real calendar. It is late autumn in England. Bonfire Night was last week, and
Advent starts on Sunday 29 November. The creatures decorate the room for each season, and each season gives the
colony a goal. The look is a 1990s TV cartoon. Funny and kind: nobody dies, and nothing is cruel.

## Rules
- Residents' words come back untouched, each with "by".
- No real brands or logos. Nothing personal goes into any model: no photos of Harry's rooms or totems.
- Celebrations are for everyone. Keep them about the seasons, light, food and fun, and treat every tradition kindly.
- Count honestly at every stage.

## Stage 1 questions (the Town Brain; about 220 words each; disagree where you would)
S1. For each season of the year (autumn, winter and Christmas, New Year, spring, summer), give one colony goal that uses
    the real room (for example, "decorate the shed for Christmas"), two decorations, and one funny thing that goes wrong.
S2. The advent calendar: how should 24 real days work, so that coming back each day feels like a gift and missing a
    day never feels like a punishment?
S3. How do the seasons fix the slow middle of the game (one hut after two hours, and mood falling)?
S4. What is the weakest part of this whole plan, and what would you do instead?
JSON shape: {"seasons":[{"season":"","dates":"","goal":"","decorations":["",""],"mishap":""}],
 "advent":{"rule":"","missed_day":""},"pacing_fix":"","disagree":""}

## Stage 4 themes and sentence openings (the tiny experts continue them)
1. Autumn: "The creatures jumped into the pile of paper leaves and..." / "For the harvest supper on the desk, Grizzle
   brought..."
2. Advent: "Behind the third little matchbox door was..." / "Every morning, Pip ran to the advent calendar because..."
3. Christmas: "To get the foil star to the top of the pine-cone tree, they..." / "The fluff snowman lost its nose when..."
4. Winter to spring: "On the coldest night, the colony kept warm by..." / "When the first daisy petal appeared on the
   windowsill,..."

## Stage 6 questions (Dell residents; one seat at a time; about 220 words)
D1. Invent ONE advent door: what is behind it, and what happens in the colony that day?
D2. Invent ONE decoration for any season: what it is made from, and where in the room it goes.
D3. Invent ONE funny seasonal mishap (never deadly, never cruel).
D4. Which season would you most like to see in Base Camp, and why (one sentence)?
JSON shape: {"door":{"what":"","happens":""},"decoration":{"name":"","made_from":"","where":""},"mishap":"",
 "favourite":{"season":"","why":""},"by":""}
