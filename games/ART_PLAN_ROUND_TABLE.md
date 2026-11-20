# Round Table Kingdom: art plan (the project file to work towards), 20 Nov 2026

One list of every picture the game needs, what is done, and what is next. ChatGPT makes the pictures (via Harry); the game session puts them in. Update the Status column as things arrive. Nothing here is "in the game" unless Status says IN GAME.

## Rules for all art (the art bible)
- **Style:** hand-painted toy-diorama: chunky shapes, visible brush strokes, softly worn edges, warm light from the upper left. Wooden, canvas, rope and tin materials. Friendly, never scary. Toy weapons only. Nobody dies.
- **Teams:** Blue = planks, canvas, feathers (cornflower blue). Red = rusty scrap, tin, cogs (brick red, a little darker and calmer than pure red). Green = logs, vines, leaves (moss green; not playable yet). Marks: feather (blue), cog (red), pine tree (green).
- **Our own world:** no real brands, no real characters, no copies of any existing game, film or book.
- **Colours in the game's screens today** (match them, or say what you changed): panel brown #3a281a; cream text #fff3df; selected orange #e8842c; warm highlight #ffd9a8; speech bubble cream #fff8ea; danger red #b3261e; moss green #1f5a26.
- **Formats:** PNG. Icons and UI pieces have a transparent background with clean edges (no white halo). Textures are seamless 1024 x 1024 and come with a 3 x 3 tiled preview.
- **Every delivery** has a manifest (file name, size, what it is, SHA-256) and an honest note of what was checked and what was not. No claim of "tested in the game".
- **Personal photos never go in.** Pictures of rooms, totems or screenshots from Harry stay private and are never used as art input.

## What exists already (IN GAME unless noted)
| Asset | From | Status |
|---|---|---|
| 8 texture tiles (wood, blue paint, red paint, rusty tin, canvas, rope rows, grass, fur) | Art pack 3 | IN GAME: 6 of the 8 (rope and fur not used; canvas and rope are plain) |
| 3 mouse character sheets (blue, red, green) | Art pack 3 | IN GAME: 3D mice made from them |
| 6 placement cards (set 2b, black and white, and a colour set) | Cards packs | Built and measured on made-up frames; NOT tested on a real camera |
| Battle concept picture, round-table concept, build-kit concept | Packs 1 and earlier | Reference only |

## What is next, in three batches (Pack 5)
**Batch 1: icons (the game uses emoji today).** 256 x 256 transparent PNG each, one object, same outline weight, same light.
| File | What |
|---|---|
| ammo_marble | a glass marble |
| ammo_big_marble | a big dark marble with a glint |
| ammo_corks | a spray of five corks |
| ammo_bouncer | a red rubber ball, with a bounce curve |
| ammo_glue | a honey pot dripping |
| ammo_high_lob | a marble over a wall, high arc |
| order_hill | a flag on a mound |
| order_raid | a mouse with a hook pulling a plank |
| order_guard | a small shield |
| order_mend | a hammer and a plank |
| tool_erase | an eraser |
| tool_move | four arrows made of planks |
| tool_reset | a circular arrow made of rope |
| tool_slowmo | a snail |
| tool_pause | two lolly sticks |
| tool_undo | a curved arrow |
| tool_snapshot | a matchbox camera |
| tool_supports | a plank with brace lines |

**Batch 2: screen pieces.**
| File | What |
|---|---|
| ui_button, ui_button_pressed, ui_button_selected, ui_button_disabled | a wide wooden plate, four states (selected has a warm glow) |
| ui_panel | a canvas-and-wood frame; say the 9-slice corner size in the manifest |
| ui_meter_frame, ui_meter_fill_blue, ui_meter_fill_red | a meter bar |
| ui_bubble | a speech bubble |
| flag_feather, flag_cog, flag_pine | cloth flag emblems, 512 x 512 |
| popup_crash, popup_plankoff, popup_plus1, popup_big_marble | painted speech-burst words, transparent |
| crown_mouse | a tiny mouse in a crown waving a white flag (shown when a Keep falls) |

**Batch 3: title and textures round 2.**
| File | What |
|---|---|
| logo_round_table_kingdom | the logo, transparent, 2048 x 768 |
| title_backdrop | a painting, 2560 x 1440, a round table with two camps in the distance under a lamp, a calm middle for buttons; no text |
| app_icon | 1024 x 1024: a crowned mouse on a flag hill |
| tex_dark_wood, tex_felt_mat, tex_pebbles, tex_rope_wrap (tileable along one axis, 1024 x 256), tex_roof_shingle, tex_canvas_blue_stripe, tex_canvas_red_stripe, tex_brass | seamless 1024 tiles (3 x 3 preview each) |

## After the Lab (not yet; waits for Harry's picks)
Pictures for the ideas Harry keeps: for example a boomerang gutter, a tethered marble, an acorn drum, a redirector pipe, a tunnel. Each gets one prop sheet. See games/SIEGE3_NEXT_19NOV.md.

## Who does what
| Step | Who |
|---|---|
| Write the prompt and the checks | game session (done: games/CHATGPT_PACK5_PROMPT.md) |
| Make the pictures | ChatGPT, through Harry |
| Check them (transparent edges, seams, sizes) and put them in | game session |
| Pick the winners; anything about taste | Harry |
