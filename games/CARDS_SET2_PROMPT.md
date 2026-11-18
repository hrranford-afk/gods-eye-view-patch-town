# Prompt for ChatGPT: Round Table Kingdom cards, set 2 (18 Nov 2026)

Written by the game session for Harry to paste into ChatGPT. The reasons below are an engineering read of set 1; the measured recognition numbers were not in when this was written.

---

I need a second set of the Round Table Kingdom placement cards. Set 1 looks lovely, but I expect a tablet camera to struggle to tell the cards apart, so set 2 is designed for the camera first while still looking like illustrated game cards.

**How the cards are used:** each card is printed in black ink, laid flat on a real table, and seen by an iPad camera from 0.4 to 1.5 metres away, at a slant, in ordinary room light. Software recognises which card it is from the picture itself (no QR codes) and works out where it lies and which way it points. At 1 metre a card is only about 130 pixels wide to the camera, so only big, bold shapes survive.

**What was wrong with set 1, and what to change**

1. More than half of every card was identical (the same border, corner swirls, shields, banner and round-table scenery), so most of what the camera sees cannot tell cards apart. **In set 2, nothing decorative is shared between cards.**
2. Hill and Capture Flag were almost the same drawing, and World Anchor shared their scenery. **In set 2, every card has a completely different central picture with a different overall outline.**
3. The fine engraving hatching turns to grey mush at a distance. **Use thick lines and solid black areas, like a woodcut or a linocut print, not a fine engraving.**
4. The border was nearly the same left and right, so a card could be read as turned halfway round. **Every card must look clearly different when rotated 180 degrees.**
5. A5 was large: four cards crowd a round table. **Set 2 is A6 landscape (148 × 105 mm).**

**The six cards**

Each card has one large emblem filling about 60% of the card, a title in heavy capitals along the top, and one short instruction line along the bottom.

| ID | Title | Emblem (big, bold, a silhouette unlike the others) | Border made of | Instruction line |
|---|---|---|---|---|
| 00 | WORLD ANCHOR | An eight-point compass star with one long north arrow | A thick rope with knots | Place first. Keep it still. |
| 01 | BLUE BASE | A plank watchtower with a large feather flag, tall and narrow | Upright planks, like a fence | Blue camp goes here. |
| 02 | RED BASE | A fat boiler with a chimney and one huge cog, low and wide | A chain of cogs | Red camp goes here. |
| 03 | CAPTURE FLAG | One big swallow-tailed flag on a pole, leaning | Triangular bunting | The flag to fight over. |
| 04 | HILL | A round mound ringed with chunky stones, daisies on top, NO flag | Pebbles of mixed sizes | A hill rises here. |
| 05 | BUILD CAMP | A crossed mallet and saw over a workbench | Nail heads and short boards | Build and mend here. |

On each card, add one small mouse character (the game's soldiers are toy mice) in a pose that fits: holding a compass, on lookout, turning a crank, planting the flag, napping on the hill, hammering. The mouse must be a different size and in a different place on each card.

**Rules for every card**

- Pure black and white only. No grey, no soft shading, no gradients. Shading is done with solid black shapes and a few thick strokes.
- No line thinner than about 1 mm at printed size. No fine hatching, no wood grain, no stippling, no clouds.
- No background scenery at all: no table, no forts, no sky. White paper behind the emblem.
- A clean white margin of at least 5 mm inside the card edge, then the border, so the card's edge is easy to find.
- One corner is special: a solid black triangle fills the TOP-LEFT corner only, on every card. This tells the camera which way is up.
- The title sits at the top only. Do not mirror anything top to bottom or left to right.
- Each card's border uses a different pattern (see the table), with a different rhythm and thickness.
- No QR codes, bar codes, or anything that imitates one. No real brands. Our own characters only.
- No colour words carry the meaning alone: Blue Base and Red Base must be unmistakable from their pictures in black ink.
- Make each card as its own separate picture, landscape, at the highest resolution you can (at least 1800 × 1280 pixels), then fit it to exactly 148 × 105 mm.

**Please check your own work before packing it (and include the numbers)**

For each card, shrink it to 130 pixels wide, blur it slightly, and look at it:
1. Can the six cards still be told apart at a glance? Show all six shrunk side by side in one contact sheet.
2. Compute a simple similarity between every pair of shrunk cards (for example normalised correlation of the grey images) and put the 6 × 6 table in the handover. No pair should be above about 0.5. If one is, redraw the more similar card.
3. Do the same between each card and itself turned 180 degrees. That should also be low.

These checks do not prove the camera will recognise them: only a real test does. Say so in the handover.

**What to send back, as one ZIP**

- `cards_A6/` with six PNGs, named `00_world_anchor.png` to `05_build_camp.png`.
- `print/` with a PDF: A4 portrait, four A6 cards per page, at exactly 100% size, with thin cut lines OUTSIDE the cards.
- `manifest.json` with each card's id, type, file, size in mm and SHA-256, as in set 1.
- `check/` with the contact sheet and the two similarity tables.
- `HANDOVER.md` saying plainly what is art, what is checked, and what is not tested.
- The script that builds the pack from the six pictures.

Keep the same honest labelling as set 1: these are candidate camera targets until the game session measures them.
