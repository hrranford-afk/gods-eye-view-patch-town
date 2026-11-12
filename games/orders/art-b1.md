ORDER
id:        art-b1
from:      game session
date:      2026-11-12
goal:      Original 90s-cartoon textures and ceiling-thing pictures for Base Camp, plus odd ideas for ceiling things.
done:      Stage 1: 10 textures for each of 8 materials, each tiling with no seam when laid 2 by 2.
           Stage 2: 6 pictures for each of 4 ceiling things, single object on plain grey.
           Stage 3: at least 60 sparks.
priority:  after the nightly almanac
budget:    2 hours of Radeon; 1 hour of Mill; 0 GB of downloads
deliver:   one paste to the game session (counts, contact sheets, where the files are)

STAGE 1
talent:    pictures
inputs:    games/base-camp/art/prompts/A2_textures.md  (branch game/micro-precinct)
canary:    one 1024 x 1024 matchbox cardboard texture
test:      lay it 2 by 2; no visible seam; no letters or logos
output:    art/b1/textures/<material>/NN.png + contact_sheet.png

STAGE 2
talent:    pictures
inputs:    games/base-camp/art/prompts/A6_ceiling_things.md  (branch game/micro-precinct)
canary:    one cup-hook picture
test:      one whole object, plain background, no letters or logos
output:    art/b1/ceiling/<thing>/NN.png + contact_sheet.png

STAGE 3
talent:    ideas
inputs:    the three themes and sentence openings below
test:      at least 60 sparks written, each tagged with its expert
output:    sparks_ceiling.json

NEEDS HARRY
- nothing


## Context (the same for every model, under 170 words)
Base Camp is an AR game on an iPad. Thumb-sized dust-bunny creatures live on the real surfaces of a real room
(floor, desk, shelf, windowsill, speaker tops) and build from household rubbish: matchbox huts, bottle-cap wells,
thimble cable cars on dental floss. The iPad can now see the ceiling. Nobody lives up there: the ceiling holds
hooks that cable cars swoop through like zip lines, lanterns, and one sock lookout nest. The look is an original
1990s TV cartoon: wobbly ink outlines, grubby painted textures, funny and kind. Nobody dies in this game.

## Rules
- Words come back untouched, each with "by".
- No real brands, logos or printed words in pictures.
- Nothing personal goes into any model: no photos of Harry's rooms or totems.
- Count honestly: asked, made, usable, empty, broken, timed out.

## Stage 3 themes and sentence openings
Theme 1: things hanging from a ceiling, for something tiny.
- "Hanging from the ceiling hook, the creatures tied a..."
- "The best thing about living near the ceiling is..."
Theme 2: funny accidents with hooks, ropes and pulleys.
- "When the rope slipped off the pulley, the cabin..."
- "Nobody expected the bell on the hook to..."
Theme 3: getting things UP to a ceiling with no wings.
- "To carry the rope up to the ceiling, they used a..."
- "The tea-bag balloon rose until..."
