ORDER
id:        measure-1
from:      game session (CAIRN)
date:      2026-11-13
goal:      Find out what the town's hardware can REALLY do, measured, not assumed (Harry: "look at the hardware and see
           actually what it really can do"). Every machine runs the same real jobs, and we learn its true speed, how many
           jobs it can run side by side, and what each one is surprisingly good at.
done:      one table per machine with measured numbers for every job below, plus the town's "surprises" list
priority:  first thing when the link to the Mini is back. Small jobs only; it must not disturb the nightly almanac.
budget:    20 minutes per machine; 0 GB of downloads
deliver:   one paste to the game session

STAGE 1
talent:    play-testing
inputs:    the live game https://hrranford-afk.github.io/gods-eye-view-patch-town/base-camp/ (practice room)
canary:    one robot colony for 10 game minutes on the Mini
test:      on each machine, measure: robot colonies per hour (8 game hours each), and the most robot browsers that can
           run side by side before each gets slower than half speed
output:    measure_robots.md

STAGE 2
talent:    how-to-build
inputs:    one fixed 300-word planning question (CAIRN's Q1 from experts-1: "What should happen in the first 10 minutes
           of Base Camp?")
test:      for every model the town has, on each machine that can hold it: words per second, time to the first word,
           and memory used. Also try running two at once, a big one and a small one.
output:    measure_models.md

STAGE 3
talent:    pictures
inputs:    the art-b1 canary prompt (one matchbox texture)
test:      pictures per hour on the Radeon, and whether pictures and the Brain can share the card at all
output:    measure_pictures.md

STAGE 4
talent:    ideas
inputs:    the experts-1 Q1
test:      tiny-expert sparks per minute on the Mill, the Dell and the Mini's processor; how many tiny experts fit side by side
output:    measure_sparks.md + SURPRISES.md (what is faster, slower or more possible than the town expected)

NEEDS HARRY
- Nothing.
