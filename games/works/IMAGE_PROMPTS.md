# PatchTown Works: image prompts for ChatGPT

The concept art for the new look, in the order to make it. From plan 5 (the world), deduplicated and edited to match the master plan (`MASTER_PLAN.md`, Appendix A): colour-blind-safe state colours, no pulsing alarms, and every AI drawn as a **faceless wind-up toy**. These are references for the builders, not textures in the page.

**Count:** 87 prompts (plan 5 had 91; 4 dropped, listed at the end). **The first 12** are marked with a star. Make those first: they decide the look of everything else.

## How to use them

1. **Make the style key first (A1).** Try it 3 or 4 times and pick the best. That picture is the style bible.
2. **Attach the chosen A1 picture to every later prompt.** Each prompt starts "Match the style of the attached reference image exactly". This holds the look steady across many pictures far better than words alone.
3. Use the size given (1536 x 1024 landscape, 1024 x 1024 square, 1024 x 1536 portrait).
4. **No text in pictures.** If letters appear anyway, ask: "remove all text and letters, keep everything else".
5. **No real brands or landmarks, no faces.** Machines are described by shape and role only. If a figure gets a face, ask for "a smooth round head with no face".
6. Save each picture as `concept/<id>-<short-name>.png` (e.g. `concept/C07-post-office.png`) where the foreman can read it.
7. **State sheets** (2 x 2 or 3 x 2 grids) must show the same building, same angle, same size in every cell. If it drifts, regenerate the whole sheet; never mix cells from different sheets.
8. Taste is Harry's: he picks the style key and any picture that sets a look.

## The style key (inside every prompt already)

> Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.

## Colour key for the pictures

| Meaning | Colour |
|---|---|
| Finished, checked, live work | gold-white glow |
| Success, pass | bluish green |
| Busy, working | warm amber / orange |
| Alarm, failed | vermilion (a red-orange), steady, small; the failed building goes dark |
| Waiting on a person's yes | sky blue |
| Flaky, waiting | honey yellow |
| Asleep, off | slate grey |
| Districts | pine green (Base Camp), orange (B&B), violet (Vigil), slate blue (Works), clay (new) |

## The first 12 (make these first)

### ★ A1. Style key: the whole world at dusk (1536x1024, no attachment)

**Why:** (1 of 12) The style bible. Every other prompt attaches it, so it must come first and be picked with care.

```text
Concept art, the style bible for the whole project. A toy-town diorama built on a thick rounded wooden board on a workbench, the board's cut edge showing painted wood, soil and stone layers at the front. In the foreground the near bank: a paved town square with a round timber foreman's lodge, workshops with roofs in pine green, orange, violet and slate blue arranged in four quarters, a fenced test yard with rows of little green lamps, a red-brick post office with stacked parcels, and at the very front a wide shopfront with a striped awning whose big window is the brightest thing in the picture, glowing gold-white. Behind, a river crossed by one stone arched bridge with a striped toll booth and covered wagons waiting. On the far bank a smaller homely village: a stone windmill, a brick furnace glowing orange next to a small rounded silver-grey cottage, a long two-storey boarding house with only one lit window, a water tower, a pond with a small orange fox, and a hill behind with a little university and a clock tower. A harbour with a lighthouse on the right where the river meets the sea. Deep navy dusk sky, first stars, warm amber windows, tiny figures in hard hats walking the roads. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### ★ B1. Illustrated map, top-down (1024x1536, attach A1)

**Why:** (2 of 12) The new map (v1.5 re-lay): builders need one picture of where everything sits.

```text
Match the style of the attached reference image exactly. An illustrated top-down map of the whole toy town drawn as a painted game map in the same toon style, north at the top: the far bank at the top with a university on a hill, a windmill, a furnace and cottage, a water tower, a long boarding house, a row of cottages and manors growing to the east, a village green with a pond, an oval narrow-gauge railway loop with a little station; a river across the middle flowing east into a sea on the right with a harbour and lighthouse; one bridge in the centre with a toll booth on the near end and a customs post on the far end; the near bank below with a town square in the centre, four wedge-shaped quarters with pine-green, slate-blue, violet and orange roofs, a power station on the west riverbank with pylons crossing the river, and a market square and a wide shopfront at the bottom. Pictograms only, no words. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### ★ A4. Character line-up (1536x1024, attach A1)

**Why:** (3 of 12) Sets the faceless wind-up look for every AI before any other figure is drawn.

```text
Match the style of the attached reference image exactly. A character line-up of small toy figures standing in a row on a warm grey background, all the same round chunky toy style: a taller foreman in a long amber work coat with a hard hat with a head-lamp and a clipboard; four builders in overalls and hard hats in pine green, orange, violet and slate blue with toolboxes; a researcher with a satchel of books and round spectacles; a fixer with a red cross armband and a spanner; a yard inspector with a peaked cap and clipboard; a postmaster with a postal cap and satchel; a switchboard operator with a headset; a town crier with a tricorn hat and a hand bell. No faces: smooth round heads, a small winding key on each back. No realistic people. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### ★ H2. State markers sheet (1024x1024, attach A1)

**Why:** (4 of 12) The state markers (beacon, lamps, star, nightcap): the shared state language in one sheet.

```text
Match the style of the attached reference image exactly. A sheet of small toy state markers on a warm grey background: a vermilion cross-shaped beacon lamp on a post, a bluish-green round lamp, a honey-yellow half-moon lamp, a slate-grey dark lamp with a nightcap, a gold low-poly star, a string of bunting, a pine-green pennant flag, a little zZ bubble shape, a small speech bubble with a star, an empty speech bubble, a speech bubble with three dots, a speech bubble with a question mark. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### ★ C9. Shop window (1536x1024, attach A1)

**Why:** (5 of 12) The shop window is "brightness is proof": the brightest, most important building.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A wide toy shopfront with a deep striped awning, a huge display window holding little toy miniatures (a tent, a bread loaf crossed with a toy cannon, a lantern, a tiny town), a goods stall out front and a small side window for the back room. Top-left idle: window softly lit. Top-right busy: the side back-room window lit amber, a postal van arriving. Bottom-left alarm: the display window dark, the street lamp in front out, a vermilion beacon. Bottom-right DONE: the display window blazing gold-white, the brightest thing in the scene, glowing boxes on the stall, one gold box, a gold star above the roof, bunting. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### ★ C6. Inspection yard (1536x1024, attach A1)

**Why:** (6 of 12) The inspection yard: lamps per suite in pass, rerun, flaky and fail shapes.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A fenced toy test yard with a canopy roof on one side, a raised inspector's box with a striped barrier arm, and three rows of short lamp posts. Top-left IDLE: all lamps round and bluish green, barrier up, no cart. Top-right BUSY: a small cart rolling through the barrier, the inspector leaning out with a clipboard. Bottom-left ALARM: two lamps replaced by vermilion cross-shaped lamps, one honey-yellow half-moon lamp, barrier down, a cart waiting, a vermilion beacon on the canopy. Bottom-right DONE: every lamp bluish green with a soft green glow rippling across the yard. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### ★ C16. Lost property office (1536x1024, attach A1)

**Why:** (7 of 12) Lost property: the alarm that would have caught the 15 Nov stall.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A crooked little toy shop with a tall thin roof, a bay window full of odd items (an umbrella, a single boot, a teddy bear), a question-mark tag pictogram sign, a hand-cart rack out front and a big alarm bell lamp on top. Top-left idle: empty rack. Top-right two tipped hand-carts in the rack each with a coloured hard hat left on it. Bottom-left ALARM: the bell lamp swinging and glowing vermilion, three abandoned carts. Bottom-right DONE: a small yellow tow truck towing a cart away. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### ★ C17. Town hall and motions board (1536x1024, attach A1)

**Why:** (8 of 12) The town hall: what needs Harry, with questions ageing on the board.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A two-storey toy town hall with steps, chunky columns, a clock tower with a bell, and a big motions board on an easel on the steps. Top-left idle: two fresh white scrolls pinned. Top-right busy: a clerk pinning a new scroll, the bell swinging. Bottom-left ALARM: an old brown curling scroll with a little dust cloud, the clock face glowing honey yellow. Bottom-right DONE: a giant rubber stamp coming down from the top of the frame onto a scroll (no hand or person visible), a green stamp mark. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### ★ C4. Workshop states (1536x1024, attach A1)

**Why:** (9 of 12) Workshop states: the building drawn most often, in every state.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. The finished long low toy workshop with a slate-blue roof and a workbench out front with a builder figure. Top-left IDLE: windows dimly lit amber, door closed, no smoke. Top-right BUSY: windows brightly lit amber, door open, grey chimney smoke, its worker busy. Bottom-left ALARM: one small vermilion cross-shaped beacon glowing steadily on the roof, a small vermilion pennant on its sign, windows dark. Bottom-right DONE: windows glowing gold-white, a small gold star above the roof, a string of bunting. In the busy cell the builder hammers with little sawdust puffs. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### ★ B2. The river and the bridge (1536x1024, attach A1)

**Why:** (10 of 12) The river and the one bridge, with the toll booth and customs post: "one door".

```text
Match the style of the attached reference image exactly. A close view of the river and the one stone bridge with three chunky arches. On the near end a striped toll booth with a barrier arm down and two covered wagons waiting; on the far end a neat little customs post with a toy scanning archway over the road with a small green lamp on top. Stone edging on the near bank, reeds and grass on the far bank, the water in three flat bands of blue with white foam rings round the piers, flowing to the right. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### ★ D1. Home Town overview (1536x1024, attach A1)

**Why:** (11 of 12) Home Town on its own: the far bank must read from across a room.

```text
Match the style of the attached reference image exactly. The far bank village of the reference diorama, seen alone: a stone windmill with grassy burrow mounds, a rounded silver-grey cottage joined to a big brick furnace, a water tower, a long two-storey boarding house with eight windows and only one lit, a village green with a pond and a small orange fox, a row of cottages growing into villas and a manor, an oval narrow-gauge railway with a tiny station, a small cottage porch with an empty rocking chair and a lantern, a customs post at the bridge end, and a university on a hill behind. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### ★ A5. Projector hero shot (1536x1024, attach A1)

**Why:** (12 of 12) The projector hero shot: checks that the whole town reads on the wall.

```text
Match the style of the attached reference image exactly. A cinematic wide hero shot of the reference diorama at night for a wall projector: the near bank full of warmly lit workshops, a rainbow arching from the glowing shopfront at the front to a small cottage porch on the far bank, gentle steam from a small night train waiting at a little station on the far bank, the lighthouse beam sweeping over the sea on the right, the whole board framed by its wooden edge. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

## Style family and framing (v1.5)

### A2. Style key: the same world by day (1536x1024, attach A1)

**Why:** The same world by day: proves the palette works in daylight on a projector.

```text
Match the style of the attached reference image exactly. The exact same diorama and camera as the reference, but in soft late-afternoon daylight: pale blue sky, warm sunlight from the upper left, crisp toon shadows to the right, windows only faintly lit, the shopfront window still clearly the brightest glowing thing. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### A3. Material and palette swatch board (1536x1024, attach A1)

**Why:** Swatch board: exact materials and colours for the bake script.

```text
Match the style of the attached reference image exactly. A neat swatch board for the art team: rows of small toy sample blocks on a warm grey background showing each material in three flat toon tones with the dark plum ink outline: cream wall, terracotta roof, slate-blue roof, pine-green roof, orange roof, violet roof, clay roof, moss grass, packed-earth road, paved stone, river water with foam, painted wood board edge with soil layers, glowing amber window, glowing gold-white window, bluish-green lamp, vermilion beacon, honey-yellow lamp, slate-grey asleep lamp. No text. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### A6. Phone portrait shot (1024x1536, attach A1)

**Why:** Phone portrait framing: the Pocket view.

```text
Match the style of the attached reference image exactly. A tall portrait view of the near bank of the reference diorama, closer and steeper than usual, so the buildings are big: the town square with the foreman's lodge in the middle, workshops around it, the glowing shopfront at the bottom, the river and the bridge at the top edge. Dusk lighting. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### H1. Pictogram sign sheet (1024x1024, attach A1)

**Why:** Pictogram sheet: every sign in the town, no letters.

```text
Match the style of the attached reference image exactly. A sheet of thirty-six square toy hanging-sign boards in a 6 by 6 grid, each a painted wooden board with a simple bold pictogram and no letters: hard hat, open book, magnifying glass, envelope, shop awning, question-mark tag, lightning bolt, water drop, parked car, steam train, crossed conveyor, telephone handset, street lamp, ballot box, pushpin, hand bell, scales, plus sign, flame, classical dome, drawer, market stall, theatre mask, coin stack, barrier arm, archway, anchor, lighthouse, anvil, windmill, bed, mortarboard, flower, trophy cup, fox head, white cloud. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### H3. Window and halo study (1536x1024, attach A1)

**Why:** Window and halo study: glow without point lights (the performance plan).

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. One toy cottage wall with three windows at night. Top-left windows dim amber. Top-right windows bright amber with a soft glow on the wall below. Bottom-left windows gold-white and the brightest thing in the picture. Bottom-right windows black. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### F1. Foreman turnaround (1536x1024, attach A1)

**Why:** Foreman turnaround: front, side and back for modelling.

```text
Match the style of the attached reference image exactly. A turnaround sheet of the toy foreman figure, front, three-quarter, side and back: taller than the builders, a long amber work coat, a hard hat with a small head-lamp, a clipboard and a little whistle on a cord. Warm grey background. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### F2. Builder poses (1536x1024, attach A1)

**Why:** Builder poses: walk, hammer, carry, wait, asleep, and the end of a run (confetti, hat left).

```text
Match the style of the attached reference image exactly. Show the same subject six times in a 3 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A small round toy builder in pine-green overalls and a pine-green hard hat. Cell 1 walking. Cell 2 hammering at a bench with sawdust puffs. Cell 3 carrying a parcel on its head. Cell 4 tapping its foot and looking at a wristwatch. Cell 5 asleep with a nightcap and a zZ bubble shape. Cell 6 handing a rolled scroll to someone off-frame and dissolving into a puff of paper confetti, its hat left on a hook. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### F3. Builder colour variants (1536x1024, attach A1)

**Why:** Builder colour variants per district.

```text
Match the style of the attached reference image exactly. Five small toy builders side by side in overalls and hard hats in pine green, orange, violet, slate blue and clay, each with a small badge with a different pictogram (a tent, a bread loaf, a lantern, a tiny house, a question mark). Warm grey background. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### F5. Staff of the town (1536x1024, attach A1)

**Why:** Staff at work: inspector, postmaster, operator (they move only when their building is busy).

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. Toy staff figures at work. Top-left a yard inspector leaning out of a little booth with a clipboard. Top-right a postmaster stamping a parcel. Bottom-left a switchboard operator plugging a cable into a little switchboard. Bottom-right a town crier ringing a hand bell on a podium. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### B3. District gate arches (1536x1024, attach A1)

**Why:** District gate arches: each project's name tag in the world.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A simple toy gate arch over a road, two posts and a crossbar with a hanging pictogram board. Top-left pine green with a tent pictogram. Top-right orange with a pictogram of a bread loaf crossed with a toy cannon. Bottom-left violet with a lantern pictogram. Bottom-right slate blue with a tiny house pictogram. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### B9. Roads and road works (1536x1024, attach A1)

**Why:** Roads and road works: a broken build blocks the road.

```text
Match the style of the attached reference image exactly. A short stretch of packed-earth toy road between a workshop and a fenced yard, blocked by road works: striped barriers, orange cones, a small toy digger, a little hole in the road, and a builder figure taking the long way round on a side path. Dusk, warm lamps. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C28. Bridge depot and wagons (1536x1024, attach A1)

**Why:** Bridge depot and wagons: orders out, results back (exists in v1, restyled).

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A toy horse-drawn covered wagon with a canvas cover with a coloured band. Top-left waiting, empty, at a depot. Top-right rolling on a stone bridge. Bottom-left stopped mid-bridge, the toy horse sitting down. Bottom-right coming back loaded with crates. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

## The Works bank core (v1.5)

### C1. Foreman's hut, states (1536x1024, attach A1)

**Why:** Foreman's hut in four states.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A round-ish timber lodge with a big porch, a lantern on a hook, a tall stone chimney, a hat rack by the door holding several small hard hats in pine green, orange, violet and slate blue, and a big table under the porch roof with rolled plans. The foreman figure in a long amber coat and a head-lamp hard hat. Top-left IDLE: windows dimly lit amber, door closed, no smoke. Top-right BUSY: windows brightly lit amber, door open, grey chimney smoke, its worker busy. Bottom-left ALARM: one small vermilion cross-shaped beacon glowing steadily on the roof, a small vermilion pennant on its sign, windows dark. Bottom-right DONE: windows glowing gold-white, a small gold star above the roof, a string of bunting. In the alarm cell the foreman stands still. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C7. Post office and parcels (1536x1024, attach A1)

**Why:** Post office and parcels: one parcel per commit.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A red-brick toy corner post office with a big arched door, a red pillar box out front, a parcel chute on the side and a loading dock. Top-left a few parcels. Top-right busy: the postmaster stamping parcels, a parcel sliding down the chute, neat rows of about twenty brown parcels. Bottom-left alarm: one vermilion beacon on the roof. Bottom-right done: some parcels wrapped with gold ribbons, a small red postal van leaving. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C5. Library (1536x1024, attach A1)

**Why:** Library: research, notes and reviews.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A narrow tall toy library with a round reading-room dome and a chimney made of stacked books, an outside shelf of books by the door, an open-book pictogram sign. Top-left IDLE: windows dimly lit amber, door closed, no smoke. Top-right BUSY: windows brightly lit amber, door open, grey chimney smoke, its worker busy. Bottom-left ALARM: one small vermilion cross-shaped beacon glowing steadily on the roof, a small vermilion pennant on its sign, windows dark. Bottom-right DONE: windows glowing gold-white, a small gold star above the roof, a string of bunting. In the busy cell a researcher stands at a lectern under the dome and loose pages flutter out of the top like birds. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C3. Workshop life stages (1536x1024, attach A1)

**Why:** Workshop life stages: a branch's life from pegs to closed.

```text
Match the style of the attached reference image exactly. Show the same subject six times in a 3 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A long low toy workshop with a big sliding barn door and a row of skylights, roof in pine green, on its plot. Cell 1: just four survey pegs with string and a tiny pine-green flag. Cell 2: a stone foundation slab and a crate of tools, one builder. Cell 3: scaffolding round half-built walls, the builder hammering. Cell 4: a little tower crane lowering the roof on. Cell 5: finished and open, a pine-green flag on the ridge, windows lit, a door sign with a tent pictogram. Cell 6: closed, boards nailed across the door, the flag lowered. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

## Weather and time (v1.5)

### E1. Weather: sunshine (1536x1024, attach A1)

**Why:** Sunshine: all suites green on the live build.

```text
Match the style of the attached reference image exactly. The near bank of the reference toy diorama under a clear late-afternoon sky with a soft warm rim light, the test yard's lamps all glowing bluish green, crisp toon shadows. No clouds. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### E2. Weather: clouds (flaky) (1536x1024, attach A1)

**Why:** Clouds over the Works bank only (reruns, flaky).

```text
Match the style of the attached reference image exactly. The near bank of the reference toy diorama with four flat, high, fluffy toon clouds drifting over the near bank only, casting soft moving shadow patches; the far bank across the river is clear and in full view. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### E3. Weather: storm (failures) (1536x1024, attach A1)

**Why:** Storm: 2 or more failing suites; the far bank stays clear.

```text
Match the style of the attached reference image exactly. The near bank of the reference toy diorama under slate storm clouds with short rain streaks falling only over the near bank, puddles on the square, a soft brightening in the clouds (no lightning), vermilion beacons on two buildings; the far bank across the river stays dry and visible. Night. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### E4. Weather: rainbow (a real-device win) (1536x1024, attach A1)

**Why:** Rainbow from the shop to Harry's porch: a real-device win.

```text
Match the style of the attached reference image exactly. The reference toy diorama just after rain, a flat ribbon rainbow arching from the glowing gold-white shopfront on the near bank over the river to a small cottage porch on the far bank, without crossing any building. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### E6. Time of day strip (1536x1024, attach A1)

**Why:** Time of day strip: dawn, day, dusk, night.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. The reference toy diorama from the same camera. Top-left dawn with a peach horizon and street lamps switching off. Top-right daytime, pale blue sky, windows faint. Bottom-left dusk with a navy-to-violet sky and lamps switching on in a ripple from the square. Bottom-right night with stars and a crescent moon, windows glowing. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### E5. Weather: fog lifting (1536x1024, attach A1)

**Why:** Fog lifting: an item proven on a real device.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A toy workshop wrapped in a low pale fog bank. Top-left fully fogged, the outline faint. Top-right the fog lifting upward. Bottom-left the last wisps dissolving. Bottom-right clear with a crisp ink outline and a rainbow starting behind. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

## Infrastructure that catches problems (v2)

### C13. Power station and battery tower (1536x1024, attach A1)

**Why:** Power station and battery tower.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A stout toy brick power station with two chimneys, a row of transformers out front, pylons leading away over a river, and a tall glass battery gauge tower made of ten stacked cells. Top-left both chimneys gently smoking, eight cells lit bluish green. Top-right busy: thick smoke, turbine windows bright, five cells lit. Bottom-left low: one cell lit and blinking honey yellow. Bottom-right POWER CUT: chimneys stopped, all cells dark, a small spark at the pylon, windows black. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C14. Power cut across the town (1536x1024, attach A1)

**Why:** Rolling blackout: a power cut across the town.

```text
Match the style of the attached reference image exactly. Night view of the near bank of the toy town during a rolling blackout: the left half of the town already completely dark, the right half still lit with amber windows and street lamps, the darkness sweeping across; small builder figures frozen with tiny zZ bubble shapes; only a little crooked shop and a white flat-roofed hospital keep tiny emergency lamps glowing. Moonlight. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C2. Foreman's hut, power cut (1024x1024, attach A1)

**Why:** Foreman's hut in a power cut.

```text
Match the style of the attached reference image exactly. The timber lodge of the reference at night during a power cut: all windows dark, the porch lantern out, the foreman sitting on the porch step with a small nightcap and a tiny zZ bubble shape, the hat rack in shadow, moonlight only. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### B10. Lighthouse states (1536x1024, attach A1)

**Why:** Lighthouse states: the town's data freshness.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A stubby toy lighthouse on a stone breakwater at night. Top-left its beam sweeping bright and warm. Top-right the beam stopped and the lamp blinking honey yellow. Bottom-left completely dark. Bottom-right in daylight, lamp off. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C15. Street lights as health checks (1536x1024, attach A1)

**Why:** Street lights as health checks: a dark lamp means a page is down.

```text
Match the style of the attached reference image exactly. A toy road leading from a district gate arch to the glowing shopfront, lined with eight small street lamps: six lit warm amber, two dark, one dark lamp with a little ladder leaning against it. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C8. Sorting office: merge and jam (1536x1024, attach A1)

**Why:** Sorting office: merges and a merge jam.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A wide toy sorting shed with a sawtooth factory roof and two conveyor belts coming out of two side doors that join at a big round sorting drum at the front. Top-left idle. Top-right busy: parcels riding both belts into the drum and coming out as one neat stack. Bottom-left JAM: parcels piled up at the drum with a red tag, a worker figure sitting on top of the pile scratching its head with a crowbar, a vermilion beacon. Bottom-right done: one tidy stack glowing gold-white. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C12. Telephone exchange (1536x1024, attach A1)

**Why:** Telephone exchange: messages between AIs (counts only).

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A narrow tall toy telephone exchange with a lattice radio mast on top and telephone poles spreading out with sagging wires, a switchboard operator with a headset visible through a window. Top-left idle. Top-right busy: small glowing amber beads travelling along the wires, the mast lamp blinking. Bottom-left alarm: one wire drooping low with a bead stuck halfway, a vermilion beacon. Bottom-right done: a gold-white bead arriving at a workshop. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D5. Traffic jam on Dell Lane (1536x1024, attach A1)

**Why:** Traffic jam on Dell Lane: the queue clock.

```text
Match the style of the attached reference image exactly. A toy lane leading to the long boarding house, filled with small rounded toy cars bumper to bumper, tiny honk bubbles, a little figure at the head of the queue holding a round lollipop stop-go sign, and a big clock face on a post at the tail of the queue. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D6. Car park (1536x1024, attach A1)

**Why:** Car park: jobs waiting to start.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A small fenced gravel toy car park with painted bays and a ticket barrier beside a cottage. Top-left empty. Top-right two cars parked. Bottom-left full, with two cars parked on the verge. Bottom-right the barrier up and one car leaving. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D20. Night train and Night Halt station (1536x1024, attach A1)

**Why:** Night train and Night Halt: the nightly batch on time or late.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A small toy steam engine with wagons carrying crates, barrels and sacks on a narrow-gauge oval track with a little station platform with a canopy, a station clock, a timetable board with pictogram slots and a signal box. Top-left the train waiting with a gentle simmer of steam. Top-right departing with a big puff, signal green. Bottom-left LATE: signal honey yellow, the station clock face honey. Bottom-right DERAILED: one wagon tipped on its side next to the track, a vermilion beacon on the signal box. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D3. Water tower: disk space (1536x1024, attach A1)

**Why:** Water tower: disk space against the floor line.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A toy water tower on four legs with a round tank, a gauge stripe painted up the side and a red float line low on the gauge. Top-left water level high. Top-right water level just above the red line. Bottom-left ALARM: level on the red line, the tank sweating drops, a vermilion beacon on top. Bottom-right the same at night with a lamp. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### B4. Hills: hard ground as terraces (1536x1024, attach A1)

**Why:** Hills: hard ground as terraces.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A small quarter of the toy town with three workshops, shown at four difficulty levels: flat ground; raised one terrace step with a low stone retaining wall and a ramp; two steps; three steps, the workshops perched on a small stepped hill with the road zig-zagging up. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C18. Scroll ageing strip (1536x1024, attach A1)

**Why:** Scroll ageing strip: questions for Harry getting older.

```text
Match the style of the attached reference image exactly. Five toy paper scrolls pinned in a row on a wooden board showing age from left to right: crisp white, cream, yellow and curling, brown with a dust cloud, brown with a little ribbon. No text on them, only a small pictogram each. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C26. Toll booth: Harry's yes (1536x1024, attach A1)

**Why:** Toll booth: Harry's yes for money, security, deleting and downloads.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A small toy toll booth with a striped roof, a barrier arm and a small bell at the near end of a stone bridge, with a covered wagon. Top-left WAITING: barrier down, booth lamp honey yellow, the wagon waiting. Top-right YES: a giant rubber stamp coming down from the top of the frame (no hand or person), the barrier lifting. Bottom-left the wagon rolling onto the bridge. Bottom-right NO: the wagon turned round heading back. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C27. Customs house: privacy check (1536x1024, attach A1)

**Why:** Customs house: the privacy check on everything that crosses.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A neat little toy customs post with a scanning archway over the road, a small lamp on the arch and a flag pole, at the far end of a stone bridge. Top-left idle. Top-right a returning covered wagon passing under the arch, the arch lamp glowing bluish green. Bottom-left ALARM: a wagon pulled aside into a fenced bay with its crate open, a vermilion beacon. Bottom-right a line of wagons passing, all green. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

## Home Town and learning (v3)

### D2. The Forge: cottage and furnace (1536x1024, attach A1)

**Why:** The Forge: the Mini and the Radeon furnace, no brand shapes.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A compact silver-grey square toy cottage with rounded corners joined by a short covered walkway to a big brick furnace with a tall chimney, a glowing mouth and bellows, an anvil out front, a conveyor of crates into the furnace and a small easel by the door. No brand shapes. Top-left IDLE: furnace dull, a small orange fox sitting at the cottage door looking at waiting cars. Top-right BUSY: furnace mouth glowing orange, bellows pumping, sparks at the anvil. Bottom-left TRAINING: a glowing pipe of molten metal running from the furnace up a hill. Bottom-right OFF: furnace cold grey with a little nightcap on the chimney. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D4. The Dell: one awake at a time (1536x1024, attach A1)

**Why:** The Dell boarding house: one window lit at a time.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A long two-storey toy boarding house with eight bedroom windows, four up and four down, each with a small coloured curtain, a front door with a bell. Top-left: one window lit with a small figure at a desk with a lamp, the other seven dark showing sleeping silhouettes in nightcaps. Top-right: a lamp being carried from one window to the next. Bottom-left ALARM: a letterbox at the gate stuffed with empty envelopes, a vermilion beacon. Bottom-right: a different window lit, a speech bubble with a pictogram floating out. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D7. The Mill and the tiny experts (1536x1024, attach A1)

**Why:** The Mill and its clockwork-mouse tiny experts.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A stone toy windmill with four big sails and a little door, surrounded by grassy mounds with tiny round doors, mouse-sized clockwork mice with round ears, aprons and winding keys, no painted faces, carrying flour sacks, a sack store. Top-left IDLE: sails still, sail cloth tied up. Top-right BUSY: sails turning, millers carrying sacks. Bottom-left ALARM: a vermilion beacon on the cap. Bottom-right OFF: sails tied, a little nightcap on the cap of the mill, dark. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D8. The fox in the pond (1536x1024, attach A1)

**Why:** The fox: a machine idle while work waits (the Choreographer's idea).

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A small orange toy fox with a white tail tip by a round pond on a village green. Top-left lying curled by the pond. Top-right trotting along a path. Bottom-left sitting at a cottage door with its tail curled round, looking at a row of parked cars. Bottom-right close-up of the fox sitting, friendly. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D9. White smoke (1536x1024, attach A1)

**Why:** White smoke: something rebuilt that already existed (the Swarmkeeper's idea).

```text
Match the style of the attached reference image exactly. Two identical toy workshops side by side at dusk: the left one with thin grey chimney smoke, the right one puffing big billowing bright-white smoke that glows slightly, slower and bigger puffs. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D10. Who is speaking: the village green (1536x1024, attach A1)

**Why:** Who is speaking: residents on the green.

```text
Match the style of the attached reference image exactly. A village green in the toy town with about twelve small resident figures standing in a semicircle facing a bridge, each with a different hat or prop (a mortarboard, a pipe, goggles, a walking stick and a lantern, a tripod, a quill, a hard hat, an eyeshade visor, running shoes and satchel, a waistcoat and pocket watch), their heads tinted: most bluish green, one vermilion, two slate grey, three honey yellow; small speech bubbles with pictograms above some: a star, an empty bubble, three dots, a question mark. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D22. Residents line-up (1536x1024, attach A1)

**Why:** Residents line-up: one of each, faceless.

```text
Match the style of the attached reference image exactly. A line-up of small toy resident figures on a warm grey background, one of each kind, slightly different sizes: a scholar in a mortarboard, a reasoner with a pipe, a coder with goggles and a toolbelt, an elder with a walking stick and a lantern, a surveyor with a tripod theodolite, a writer with a quill behind the ear, a builder in a green hard hat, a clerk with an eyeshade visor, a runner with running shoes and a satchel, a senior in a waistcoat with a pocket watch. No faces: smooth round heads, a small winding key on each back. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D23. Tiny experts line-up (1536x1024, attach A1)

**Why:** Tiny experts line-up.

```text
Match the style of the attached reference image exactly. A line-up of mouse-sized clockwork mice with round ears, aprons and winding keys, no painted faces, on a warm grey background: one with work gloves, one with a bee smoker and a few toy bees, one with a conductor's baton, and five more with simple props (a sieve, a scoop, a lantern, a broom, a magnifying glass). Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D11. Resident homes by size (1536x1024, attach A1)

**Why:** Resident homes by model size.

```text
Match the style of the attached reference image exactly. Show the same subject six times in a 3 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. Toy resident homes in a row of sizes. Cell 1 a round door in a grassy mound. Cell 2 a one-storey cottage with a steep thatched roof and a round window. Cell 3 a two-storey house with a tiled roof and a porch. Cell 4 a two-storey villa with a bay window and a small tower. Cell 5 a three-winged manor with a cupola, gates and a gravel drive. Cell 6 the cottage with all windows dark and a little nightcap on its chimney. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D12. A resident's home up close (1536x1024, attach A1)

**Why:** A resident's home up close: garden, weeds, report card, trophies, letterbox.

```text
Match the style of the attached reference image exactly. A toy cottage up close: a front garden with three flower beds of different heights, a side weed bed with tall weeds, a report card pinned on the front door shown as a grid of ten coloured squares (mostly green, two honey, one vermilion), two small trophy cups on the windowsill, a letterbox at the gate, lights on, the resident figure with a quill at the door. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D13. Dolls' house cutaway: diplomas (1536x1024, attach A1)

**Why:** Dolls' house cutaway: diplomas (training records).

```text
Match the style of the attached reference image exactly. The same toy manor with its front wall slid away like a dolls' house, showing inside: a desk with a lamp, a wall of framed diplomas with green and honey-coloured frames, a shelf of trophy cups, a bed, a resident figure in a mortarboard reading. Warm interior light. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D14. Empty letterbox (1024x1024, attach A1)

**Why:** Empty letterbox: empty answers.

```text
Match the style of the attached reference image exactly. A toy garden-gate letterbox overflowing with blank empty envelopes spilling onto the path, beside a cottage gate. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D15. Removal van: a new resident (1536x1024, attach A1)

**Why:** Removal van: a new resident arrives.

```text
Match the style of the attached reference image exactly. A boxy toy removal van with boxes on a lane by a row of cottages, a new plot with a cottage rising up like a pop-up book, a resident figure carrying a box. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D16. University campus (1536x1024, attach A1)

**Why:** University campus.

```text
Match the style of the attached reference image exactly. A toy university on a raised grassy hill: a clock tower in the middle of a quad, a long lecture hall with arched windows, a domed exam hall with tall shutters, a greenhouse wing with potted plants of different heights inside, a graduation lawn with a little stage, a lane winding down the hill, a glowing pipe running up from a furnace below. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D17. Exam hall: blind tests (1536x1024, attach A1)

**Why:** Exam hall: blind tests, old against new.

```text
Match the style of the attached reference image exactly. Inside a toy domed exam hall seen with its roof lifted off: two rows of little desks, two candidate figures sitting back to back separated by a tall screen so they cannot see each other, papers flowing to a marker figure at the front, one candidate's desk lamp glowing bluish green. Warm light. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D18. Graduation and the resit bench (1536x1024, attach A1)

**Why:** Graduation and the resit bench.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A toy university quad with a little stage. Top-left a tiny mouse-sized expert in a mortarboard climbing the stage. Top-right mortarboards thrown in the air with a burst of paper confetti. Bottom-left the graduate walking down a lane with a rolled diploma. Bottom-right a different tiny expert sitting quietly on a bench marked with a small repeat-arrow pictogram (a resit). Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D19. Greenhouse: training in progress (1536x1024, attach A1)

**Why:** Greenhouse: training in progress, or wilted.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A toy greenhouse wing with potted plants. Top-left small seedlings. Top-right plants half grown. Bottom-left plants fully grown with a bluish green glow. Bottom-right one plant wilted and drooping with a vermilion tint. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### D21. Harry's porch (1536x1024, attach A1)

**Why:** Harry's porch: his presence is a lantern; nobody shown.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A small cottage porch with an empty wooden rocking chair, a porch lantern and a little table with a plain glowing slate tablet with no brand. Nobody is there. Top-left lantern off. Top-right lantern lit warm. Bottom-left the slate on the table glowing. Bottom-right a rainbow ending at the porch. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C20. Hospital and ambulance (1536x1024, attach A1)

**Why:** Hospital and ambulance: bugs being fixed.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A white flat-roofed toy hospital with a big plus pictogram on the roof, a ward wing with long windows showing little beds, and an ambulance bay. Top-left idle: empty beds. Top-right busy: three beds with small patient figures with bandages. Bottom-left ALARM: a white ambulance with a vermilion stripe racing out with its roof light on. Bottom-right done: beds empty and tidy, a small gold star over the roof. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C21. Fire station and rollback (1536x1024, attach A1)

**Why:** Fire station and rollback to a kept build.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A toy fire station with red doors, a tall hose-drying tower, two bays, a red fire engine with a ladder, and a rack of small numbered-looking helmets shown only as coloured helmets. Top-left idle. Top-right the fire engine driving out. Bottom-left alarm: a vermilion beacon on the hose tower. Bottom-right done: firefighters at a shopfront swapping a little display miniature for another. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C22. Museum (1536x1024, attach A1)

**Why:** Museum: every shipped build.

```text
Match the style of the attached reference image exactly. A domed toy museum with a wide stair and banners in pine green, orange, violet and slate blue; the front wall cut away like a dolls' house to show rows of plinths each holding a tiny miniature of a game build; a small spotlight on the newest plinth; little statues on the front lawn; lowered workshop flags hanging in the entrance hall. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C23. Archive (1536x1024, attach A1)

**Why:** Archive: memory that survives restarts.

```text
Match the style of the attached reference image exactly. A low toy stone archive vault with a heavy round door open, inside tall shelves of small drawers stacked very high, one drawer glowing gold-white, an archivist figure filing a drawer, a little mail slot by the door. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### E8. Home Town drizzle (1536x1024, attach A1)

**Why:** Home Town's own small weather (drizzle over empty answers).

```text
Match the style of the attached reference image exactly. The far bank village of the reference toy diorama with a tiny raincloud drizzling only over the long boarding house, and a small sunny patch of warm light over the windmill. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

## The whole atlas (v4)

### B7. The harbour (1536x1024, attach A1)

**Why:** The harbour: outside services and downloads.

```text
Match the style of the attached reference image exactly. A toy harbour where a river meets the sea: stone quays with bollards, a dockside crane lifting one big crate from a flat barge, stacked crates, a harbour master's office with a pictogram board of slots holding green ticks, one honey-yellow circle and one vermilion cross, a small tug boat, and a big neutral-coloured cargo ship with no markings docked at the long quay. A stubby lighthouse on a breakwater. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### B8. Ships set (1536x1024, attach A1)

**Why:** Ships set: code host, CDNs, a download barge (no logos).

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. Toy boats. Top-left a big chunky cargo liner in plain navy and cream with no markings. Top-right a small round tug boat with a puff of steam. Bottom-left a flat barge carrying one big crate with a small green flag on the crate. Bottom-right the same barge with a honey-yellow flag on the crate. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C25. Bank (1536x1024, attach A1)

**Why:** Bank: tokens and minutes as coin stacks.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A squat toy bank with a big round vault door, coin stacks visible inside and a small meter dial on the front. Top-left vault ajar, low coin stacks, dial in the green. Top-right taller stacks. Bottom-left ALARM: vault door closed, dial needle in honey yellow, a vermilion beacon. Bottom-right done: tidy stacks glowing gold. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C19. Courthouse (1536x1024, attach A1)

**Why:** Courthouse: four rules as four columns.

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A solid toy stone courthouse with four big columns on the front and a scales pictogram on the pediment. Top-left all four columns plain stone. Top-right two columns glowing bluish green from the base up. Bottom-left one column cracked with a jagged dark line and a vermilion glow. Bottom-right all four columns glowing bluish green. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C10. Market square (1536x1024, attach A1)

**Why:** Market square: ideas swapped, with credit.

```text
Match the style of the attached reference image exactly. A small toy market square in front of the shopfront with five striped stalls in different colours, each holding wooden idea crates; one crate stamped with a coloured mark being carried away by a little builder figure towards a workshop; a short queue at the busiest stall. Dusk, warm lamps. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C11. Noticeboard and town crier (1536x1024, attach A1)

**Why:** Noticeboard and town crier.

```text
Match the style of the attached reference image exactly. On a paved toy town square: a wide wooden noticeboard on two legs with a small roof, pinned with papers with coloured bands, some with a green tick stamp; next to it a little podium where a town crier figure in a tricorn hat rings a hand bell, a big speech bubble with a star pictogram floating up. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### C24. Theatre and arcade (1536x1024, attach A1)

**Why:** Theatre and arcade (only if a counting service is approved).

```text
Match the style of the attached reference image exactly. Show the same subject four times in a 2 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. A little toy theatre with a marquee of bulbs over the entrance and a red curtain visible inside, the marquee split into four panels. Top-left only a few bulbs lit. Top-right half the bulbs lit. Bottom-left most bulbs lit. Bottom-right every bulb lit and a small crowd of toy figures at the door. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### G1. Road vehicles set (1536x1024, attach A1)

**Why:** Road vehicles set.

```text
Match the style of the attached reference image exactly. Show the same subject six times in a 3 by 2 grid, identical camera angle, size and position in every cell, on a plain warm grey background. Chunky rounded toy vehicles with no markings. Cell 1 a small red postal van. Cell 2 a white ambulance with a vermilion stripe and a light on top. Cell 3 a red fire engine with a ladder. Cell 4 a small yellow tow truck with a hook. Cell 5 a honey-yellow repair truck with a ladder. Cell 6 a boxy removal van with boxes. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### G2. Toy cars set (1536x1024, attach A1)

**Why:** Toy cars set (queued jobs).

```text
Match the style of the attached reference image exactly. Six small rounded toy cars in a row, each a slightly different shape (a hatchback, a little saloon, a tiny estate, a mini van, a beetle-like round car, a small pickup), in pine green, orange, violet, slate blue, clay and home green. No markings. Warm grey background. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### G3. Cranes (1536x1024, attach A1)

**Why:** Cranes: building roofs and lifting downloads.

```text
Match the style of the attached reference image exactly. Two toy cranes side by side: a little tower crane lowering a roof onto a workshop, and a dockside quay crane lifting a big crate off a barge. Dusk. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### B6. The board and its growth tiles (1536x1024, attach A1)

**Why:** The board and a new growth tile.

```text
Match the style of the attached reference image exactly. The toy town diorama seen from a lower side angle showing the thick rounded wooden board and its cut edge with painted wood, soil and stone layers. A new extra board tile is sliding in from the right on a small wheeled dolly, its ground still empty with survey pegs, a visible seam where it meets the main board. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### I2. Moment: lost property alarm (1536x1024, attach A1)

**Why:** Moment: the lost property alarm at night (for the explainer).

```text
Match the style of the attached reference image exactly. A quiet late night in the reference toy diorama: most of the town dimly lit, one crooked little shop on the near bank with its bell lamp glowing vermilion and three abandoned hand-carts with coloured hard hats left on them, the foreman walking towards it with a lantern. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### I3. Moment: graduation day (1536x1024, attach A1)

**Why:** Moment: graduation day (only use when a real graduate exists).

```text
Match the style of the attached reference image exactly. Morning on the university hill of the reference toy diorama: mortarboards flying above the quad, paper confetti, a tiny mouse-sized graduate walking down the lane with a rolled diploma towards the windmill's burrows. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### I4. Moment: a ship arrives (1536x1024, attach A1)

**Why:** Moment: a ship arrives with a licensed download.

```text
Match the style of the attached reference image exactly. The harbour of the reference toy diorama at dusk: a barge with one big crate flying a small green flag docking, the quay crane lifting the crate, the harbour master stamping a pictogram board, a small cart waiting to carry it to a workshop. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

### I5. Moment: the town grows (1536x1024, attach A1)

**Why:** Moment: the town grows a new tile.

```text
Match the style of the attached reference image exactly. The reference toy diorama with a new board tile being slid onto its side on a wheeled dolly, survey pegs with little coloured flags already on the new tile, and a builder figure waving from the edge. Style: a 3D toy-town diorama for a cosy game, chunky low-poly toy models like painted wood and soft plastic, rounded bevelled edges, slightly oversized doors and windows, soft toon shading with three flat tones per colour, a clean dark plum ink outline round every object, matte surfaces, no realistic textures. Palette: cream walls, terracotta and slate-blue roofs, moss-green grass, packed-earth roads, deep navy dusk sky, warm amber window light, bluish green for success, vermilion red-orange for alarms, sky blue for things waiting on a person's yes, gold-white glow for finished work. Three-quarter view from about 35 degrees above with a long lens, like a model railway layout on a table. No text, no letters, no numbers, no logos, no real brands, no real landmarks, no real people. All figures are faceless wind-up toys with a small winding key on the back. Signs use simple pictograms only.
```

## Dropped from plan 5's list (and why)

| Id | Title | Why dropped |
|---|---|---|
| B5 | Fog: never tried on a real device | Duplicate of E5, which shows the same fogged workshop and how the fog lifts. |
| E7 | Night power cut with lighthouse | Duplicate of C14 (the blackout) plus B10 (the lighthouse states). |
| F4 | Celebration | Breaks the decision "no celebrations": a win lights the shop, the builders do not cheer. |
| I1 | Moment: a win night | Duplicate of A5 (the night hero shot with the rainbow) and E4 (the rainbow). |


The original 91 prompts are kept unchanged in `games/works/plan/5-world.md`, section 15.
