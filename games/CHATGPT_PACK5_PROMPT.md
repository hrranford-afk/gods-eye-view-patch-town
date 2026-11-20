# Prompt for ChatGPT: Round Table Kingdom art pack 5, batch 1 (20 Nov 2026)

Written by the game session for Harry to paste into ChatGPT.

---

This is the next art pack for Round Table Kingdom, the toy-mice tabletop game you have already made art for (cards, textures, mouse sheets). The game is now fully playable and the screens still use plain emoji for icons, so this pack paints them.

Please read the art plan first. It has the style rules, the colours the game uses today, and the three batches:
https://raw.githubusercontent.com/hrranford-afk/gods-eye-view-patch-town/game/micro-precinct/games/ART_PLAN_ROUND_TABLE.md

**Do batch 1 only (18 icons) in this reply.** After I have seen it, I will ask for batch 2 and batch 3.

**How to make batch 1**
- Each icon is one object on a transparent background, 256 x 256 PNG, with the object filling about 80% of the square and a small clear margin.
- All 18 share one look: the same hand-painted miniature style as the texture tiles in art pack 3, a warm wooden outline of about the same thickness on every icon, and light from the upper left. They must read clearly at 48 pixels across on a dark brown (#3a281a) button, so keep the shapes bold and the colours strong.
- The icons are for toy weapons and tools. Nothing scary, no fire, no blood.
- No text on any icon.
- The files are named exactly as in the table in the art plan: ammo_marble, ammo_big_marble, ammo_corks, ammo_bouncer, ammo_glue, ammo_high_lob, order_hill, order_raid, order_guard, order_mend, tool_erase, tool_move, tool_reset, tool_slowmo, tool_pause, tool_undo, tool_snapshot, tool_supports.

**Please check your own work and put the results in the handover**
1. Transparent edges: no white or coloured fringe. Show each icon on a dark brown background (#3a281a) and on a cream background (#fff3df) in one preview sheet.
2. Show all 18 shrunk to 48 x 48 in one row, on the dark brown background, so we can see whether they still read.
3. Check that every file is exactly 256 x 256 with an alpha channel, and list the SHA-256 of each in the manifest.

**What to send back, as one ZIP**
- `icons/` with the 18 PNGs.
- `previews/` with the two background sheets and the 48-pixel row.
- `manifest.json`.
- `HANDOVER.md` that says plainly what is art, what you checked and what is not tested. These are candidate game icons until the game session has put them on real buttons.
- The script that builds the pack, if you used one.
