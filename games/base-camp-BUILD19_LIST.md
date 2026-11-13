# Base Camp build 19: fix list (CAIRN, 13 Nov 2026)

## From CAIRN's 8-hour play of build 17 (practice room, browser)
1. The slump after a goal: when autumn was done, growth stopped (2 camps of 12 at 8 h) and mood fell from 0.76 to 0.42.
   Start the next goal at once. Also compare against build 14's run (39 settlers at 8 h) to find out what slipped.
2. Speech bubble pile-ups: 7 creatures said "Is it us?" at the same moment. Show one bubble at a time within a radius.
3. Stale pop-ups: "First hut!" showed 8 game hours late. Drop banners that are older than about 20 s instead of queueing them.
4. Duplicate names: two creatures were both called "Pip".
5. Style: the soft GLB mouse next to the toon+ink creatures. Try a thin ink hull on the mouse.

## From Harry's own AR play on his iPad (12 Nov, builds 12 and 13; his screenshots stay private, described here only)
6. The request card in portrait is too narrow. "We can't reach the other places. Build us a cable car!" wraps to one
   word per line, because the face and the Yes button take the width. Stack the button under the text in portrait.
7. The "What the colonists noticed" panel is too tall in portrait, covers the scene, and overlaps the status toast.
   Cap its height and scroll it, or show 1 line plus "and 2 more".
8. Placeholder place names read badly ("a Perch 2 that was never on our map"). Use friendlier generated names.
9. The camp label read "Desk · 0 settlers" over a camp that had huts and trees: the label shows the wrong count, or the
   creatures were all away. Check it.
What worked and must stay: a cable car from the floor up to a real table; camps on high shelves with cars running down;
the glowing scan outline on a real desk; the colony on a real kitchen floor at the right scale.

## Status 13 Nov, 17:00 (CAIRN)
- Done on `game/bc-fixes19`: items 1 to 4, 6, 7 and 8.
- Item 5 (scout ink) is built but left OFF, because of its cost.
- Item 9 was not found in the current code. The HUD in Harry's screenshot was builds 12 and 13.
- **Correction:** the builder's 8-hour runs gave 40 settlers in 4 camps for build 17 too. CAIRN's "2 camps of 12" was from
  CAIRN's own run, which stepped the simulation differently. So the drop is NOT confirmed. Follow-on goals were added anyway.
- **To check before release:** shot 58 shows two "Pip" chips in one camp, and the request card is not in the picture.
