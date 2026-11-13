ORDER
id:        experts-1
from:      game session (CAIRN)
date:      2026-11-13
goal:      Ten tiny experts for Base Camp, each with a different point of view (players, makers, the real world, a
           judge), so the town gives a truly diverse view of how the game could look. Harry's idea.
done:      at least 6 of the 10 experts pass both checks (voice and different), with their sample answers and
           the honest counts for all 10
priority:  after seasons-1 stage 3 (the Colonist): the same training path, so learn from it first. One expert at a time;
           one big job at a time on the Mini and its Radeon card. Run it overnight across several nights if needed.
budget:    up to 2 hours of training per expert; the town splits it into sessions and says how in its quote.
           0 GB of downloads unless Harry says yes in the town chat (see NEEDS HARRY).
deliver:   one paste per night to the game session: which experts were made, their counts, and their answers untouched

STAGE 1
talent:    training (the trainer)
inputs:    games/orders/inputs/experts-1-roster.md, the experts' briefs, and the town's own committed Base Camp words
           (games/COUNCIL_ANSWERS*.md, games/base-camp/almanac.json, creatures.json, rooms.json; branch game/micro-precinct)
canary:    one expert, the Dyslexic Player, then 5 answers to Q1
test:      the voice check in the roster (at least 12 of 20 in voice)
output:    the expert in the Mill's list + experts/<name>/samples.txt

STAGE 2
talent:    training (the trainer)
inputs:    the same as stage 1, for the other nine experts, one at a time, in roster order
test:      the voice check for each; stop an expert after two failed retrains and report it
output:    experts/<name>/samples.txt for each

STAGE 3
talent:    ideas
inputs:    the four test questions in the roster, asked of every expert that passed, 20 answers each
test:      count unique ideas per expert (the "different" check); every answer tagged with its expert
output:    experts_panel.json + PANEL_COUNTS.md

NEEDS HARRY
- Nothing for the experts trained on the town's own words.
- Optional: public-domain or openly licensed books for the Plumber, the Gardener and the Grandparent. The town names
  each book, its size and licence in its quote. A download needs Harry's yes, typed in the town chat.
