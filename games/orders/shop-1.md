ORDER
id:        shop-1
from:      game session (CAIRN)
date:      2026-11-13
goal:      A Christmas "shop edition" of Base Camp for a jewellery shop (a real pilot; the shop is not named in public
           files). Tiny creatures decorate a jeweller's counters, polish rings bigger than themselves, wrap gifts and stage
           a proposal, filmed on the iPad as a 30-second Christmas advert. Everything made here also feeds the main game.
done:      at least 150 shop sparks (stage 1), 30 pictures (stage 2) and the Dell answers (stage 3), with honest counts
priority:  tonight, after webkit-1 and measure-1. Stages 1 and 3 can start at once on the Mill and the Dell; stage 2 waits
           its turn on the Radeon.
budget:    Mill 1 hour; Radeon 1 hour; Dell as it frees up; 0 GB of downloads
deliver:   one paste to the game session

STAGE 1
talent:    ideas
inputs:    the context and sentence openings below
test:      at least 150 sparks, each tagged with its expert
output:    sparks_shop.json

STAGE 2
talent:    pictures
inputs:    the picture list below (90s cartoon style, the same as art-b1)
canary:    one gift box with a ribbon
test:      one whole object on a plain background; no letters, digits, logos or brand marks
output:    art/shop/<item>/NN.png + contact_sheet.png

STAGE 3
talent:    own-answers (Dell residents, one seat at a time)
inputs:    questions D1 to D3 below
test:      valid JSON; counts of asked, answered, empty, broken and never had a turn
output:    residents_shop.json

NEEDS HARRY
- Nothing.

## Context (the same for every model)
Base Camp's thumb-sized creatures (5 cm tall) visit a jewellery shop at Christmas. They live on the real counters and
shelves, shown on an iPad in AR. Glass cases are slippery and shiny. Rings are as big as hula hoops to them, a necklace is
a whole rope bridge, and a gift box is a house. The shop is filming a 30-second Christmas advert. The humour is kind
and silly, nobody gets hurt, and there are no real brands.

## Sentence openings (the tiny experts continue them)
1. "Pip saw his own face in the giant diamond and..."
2. "To wrap the present, three creatures had to..."
3. "Gertie got down on one knee, holding a ring as big as a hula hoop, and..."
4. "The necklace made the perfect rope bridge across the counter, until..."
5. "On Christmas Eve, after the shop closed, the creatures..."

## Picture list (single objects, plain background, 90s cartoon, thick wobbly ink; five of each)
1. A gift box with a big ribbon bow
2. A velvet ring tray, seen from above (seamless texture)
3. A roll of Christmas wrapping paper (pattern only, no text)
4. A sparkly ring, cartoon style, with no maker's mark
5. A tiny shop sign shape with no words, to hang above a creature's stall
6. A string of fairy lights

## Questions for the Dell residents (one seat at a time; about 220 words each)
D1. Invent ONE funny moment for creatures in a jewellery shop at Christmas.
D2. Invent ONE way the creatures help a shopper choose a present.
D3. What would make someone share this advert with a friend (one sentence)?
JSON shape: {"moment":"","help":"","share":"","by":""}
