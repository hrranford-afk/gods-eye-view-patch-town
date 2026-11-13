ORDER
id:        waterworks-1
from:      game session (CAIRN)
date:      2026-11-13
goal:      Base Camp gets a waterworks network (Harry's idea): drinking-straw pipes bring fresh water from the real
           sink to the crops, and bucket cable cars take the waste to the real toilet. The town invents the funny parts
           of it, and the Backpack Scout mouse (new today) finds the sink and toilet first.
done:      the network plan (stage 1); at least 120 sparks (stage 2); 30 pictures (stage 3); Dell answers (stage 4)
priority:  today, after seasons-1 and art-b1. Stage 2 and stage 4 may start at once on idle machines.
budget:    Radeon 2 hours; Mill 2 hours; Dell as it frees up; 0 GB of downloads
deliver:   one paste to the game session, with the honest counts for each stage

STAGE 1
talent:    how-to-build
inputs:    the context and questions below; games/base-camp-WATERWORKS_PLAN.md; games/COUNCIL_ROUND4_BASE_CAMP.md (M8)
           (branch game/micro-precinct)
canary:    question W1 alone
test:      valid JSON in the shape below, with at least one disagreement with the plan and a reason
output:    waterworks_plan.json + brain_notes.md

STAGE 2
talent:    ideas
inputs:    the sentence openings below
test:      at least 120 sparks, each tagged with its expert
output:    sparks_waterworks.json

STAGE 3
talent:    pictures
inputs:    the picture list below, in the same 90s cartoon style as art-b1
canary:    one straw pipe with a sprinkler
test:      one whole object, on a plain background, with no letters, digits or logos
output:    art/waterworks/<item>/NN.png + contact_sheet.png

STAGE 4
talent:    own-answers (Dell residents, one seat at a time, as they free up)
inputs:    questions D1 to D3 below
test:      valid JSON in the shape given; count asked, answered, empty, broken and never had a turn
output:    residents_waterworks.json

NEEDS HARRY
- Nothing. No downloads.


## Context (the same for every model)
Base Camp is an AR game on an iPad. Thumb-sized dust-bunny creatures live on the real surfaces of a real room. They
build from household rubbish: matchbox huts, tin-can huts, thimble cable cars on dental floss, and hooks on the ceiling.
Now they lay a waterworks network. Drinking-straw pipes run from the real sink to sprinklers over their farms, and
little buckets ride the cable cars from each camp's loo hut to the real toilet. At the toilet they tip in with a
"ploop", a tiny trumpet fanfare and a cheer. Water has qualities: sink water is fresh, plant-pot water is green, cup
water is tea, and toilet water is refused. Harry chose cheeky humour: silly and cartoonish, never gross on screen,
never a joke at a creature's expense. Nobody dies. A Backpack Scout mouse with a map leads expeditions to find the
sink and toilet. The look is a 1990s TV cartoon.

## Rules
- Residents' words come back untouched, each with "by".
- No real brands or logos. Nothing personal goes into any model.
- Count honestly at every stage.

## Stage 1 questions (the Town Brain; about 220 words each; disagree where you would)
W1. How should laying the first pipe feel? Give the steps from "the scout finds the sink" to "water reaches the
    crops", and say what makes it feel like a big moment.
W2. Give three funny breakdowns (pipes or bucket cable cars) and how the creatures fix each one. The fixes must be
    funny, never a chore for the player.
W3. How does the network grow over a long game? Give three upgrades in order.
W4. What is the weakest part of this plan, and what would you do instead?
JSON shape: {"first_pipe":{"steps":["",""],"big_moment":""},"breakdowns":[{"what":"","fix":""}],
 "upgrades":["","",""],"disagree":""}

## Stage 2 sentence openings (the tiny experts continue them)
1. "When the first drop of sink water reached the carrots, the whole colony..."
2. "The bucket got stuck halfway to the toilet, so Grizzle..."
3. "The Backpack Scout unrolled the map and pointed at the shiny white mountain, which was..."
4. "Nobody would drink the green water from the plant pot, until..."

## Stage 3 picture list (single objects, plain background, 90s cartoon, thick wobbly ink)
1. A drinking-straw pipe with a joint and a tiny sprinkler made from a pepper-pot lid
2. A bottle-cap water tank on matchstick legs
3. A tiny loo hut made from a cotton-reel and a sweet wrapper door
4. A thimble bucket hanging from a dental-floss cable car hook
5. A sand-and-charcoal filter made from a cut bottle top
6. A compost heap of crumbs and peel with a little flag
Five of each.

## Stage 4 questions (Dell residents; one seat at a time; about 220 words)
D1. Invent ONE funny thing that goes wrong with the pipes or bucket cars, and how it is fixed.
D2. Invent ONE new water source in a home (not the sink, toilet, plant pot or cup): what the water is like and what it
    does to creatures and crops (funny, never deadly).
D3. Invent ONE celebration for when the waterworks first works.
JSON shape: {"breakdown":{"what":"","fix":""},"source":{"where":"","water":"","effect":""},"celebration":"","by":""}
