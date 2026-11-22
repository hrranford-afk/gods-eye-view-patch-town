# Living Islands: people style options (22 Nov 2026)
Page: `people_options.html` (three.js r128 global, no build, no downloads, no model files, no photos). Same four anonymous archetypes in every row (man with mallet, woman with water bucket, skipper in flat cap and long coat, fisher with rope), role labels only, on a patch of island ground under the look-test light (sun 24 degrees, warm, cool hemisphere, ACES). Row 1 is the current blocky person for reference. Everything is procedural and seeded; `?t=1.7` freezes animation so shots are repeatable.
Screenshots (1200 wide): `shots/ppl-0.png` (all rows, 4b is the sprite turntable), `shots/ppl-1.png` to `ppl-6.png` (each stacks three zoom distances: overview, camp, close). Make them again with `NODE_PATH=$(npm root -g) node tests/people-render.js`. Checks: `tests/people-test.js` (15 of 15 checks pass: 0 console errors, same hash twice, per-person budgets, crowd cost).

## The honest table
Triangles and meshes are counted from the built people (`__ppl.stats()`); the 50 and 200 columns are measured on the real renderer by cloning that many people (`__ppl.crowd(style, n)`), person triangles only, the ground not included. Draw calls are "as built" (one per mesh); the last column says what a production build can do.

| # | Style | Look, honestly | Tris per person | Draw calls per person (as built) | 50 people: tris / calls | 200 people: tris / calls | Cheapest sane build |
|---|---|---|---|---|---|---|---|
| 1 | Current blocky | Boxes with arms held out, no tools or clothing shape. Reads as a "game dummy", not a settler. Taller than the others (1.95 m). | 139 | 1 | 7k / 50 | 28k / 200 | instanced, 4 calls |
| 2 | Stylised low-poly | Proper proportions (7 heads), tapered torso, shoulders, mitten hands, boots, bent knees, apron / coat / smock layers, hats. Faceted, per-triangle colour jitter gives "weathered". Static pose (baked) with a breath bob. Best read at camp zoom. | 2,296 | 1 (baked) | 115k / 50 | 459k / 200 | instanced per archetype: 4 calls |
| 3 | Smooth vinyl toy | Big head, round soft forms, dot eyes and cheeks, matte. The most "friendly", the most "toy" (can fight the weathered Atlantic tone). Static pose. Highest triangle count of all, reducible. | 3,913 | 1 (baked) | 196k / 50 | 783k / 200 | drop radial segments 12 to 8: about 2k; instanced |
| 4 | AoE-style painted sprites | Canvas-painted figures with outline, cloth shading and brush speckle, 8 facings chosen from camera angle, one tool each. Cheapest by far and holds up at distance; stands as a card, so low camera angles and close zoom show it is flat. One idle pose only. | 2 (quad) + 16 (blob shadow, can be 2) = 18 | 2 | 1k / 100 | 4k / 400 | one atlas, one instanced draw: 1 call for everyone |
| 5 | Silhouette-rich | Tools, hats and cloth exaggerated (1.45x tools, wide skirt and coat, shoulder coil, flapping tails, swinging bucket), faces only a skin dot with a nose bump. Reads from far; at close range looks cruder than 2. Mostly a distance/LOD style, not a hero style. | 1,487 | 3.5 (body baked, flaps and bucket live) | 74k / 177 | 297k / 704 | bake the flap into 2 frames; about 2 calls |
| 6 | Best mix, animated | Style 2 proportions with softened normals, mitten hands with thumbs, layered clothing, big readable face, plus real animation: walk with bucket (small loop), hammer on a stake, haul rope hand over hand, skipper raises the spyglass, all with idle breathing. | 2,956 | 13.3 (rigid parts merged per joint) | 148k / 665 | 591k / 2,654 | skinned mesh (1 call) or baked pose frames; see below |

JS cost of the animation (measured, desktop CPU in this container, not a phone): style 6 about 0.14 ms per frame for 50 people and 0.9 ms for 200; style 5 about 0.84 ms for 200 (it re-deforms the flaps). Software rendering here, so no GPU frame-time numbers; treat all fps claims as unknown until tried on a phone.

## What I would do (a recommendation, the owner decides)
1. Hero style: 6, but at most about 20 people at full detail. 200 people at 2,956 triangles is 591k, too much for phone AR, and 2,654 draw calls is too many. Do not ship the rigid rig as is for a crowd.
2. Crowd LOD: past a distance, swap to style 5 baked (about 1.5k) and then to style 4 sprites (18 triangles, one atlas). The three share the cast, palette and tools, so the swap is a silhouette-for-silhouette change; this is the part I have shown but not yet built as a runtime switch.
3. Skip 3 (vinyl) unless the owner wants a toy tone; it is the heaviest and the least "weathered".
4. Production animation: one skinned mesh per archetype (needs a skeleton, which three.js r128 supports with `SkinnedMesh`; I kept the rig as plain groups so the page has no extra moving parts), or 8 to 12 baked pose frames swapped per tick (1 draw call, vertex data x frames). Neither is built here.

## What carries into AR (table top)
- Scale: if the 200 m island fits a table about 1 m wide, a 1.7 m person is about 8 mm. At that size only silhouette, colour, a tool and motion survive; the triangle detail of 2, 3 and 6 is invisible until the player leans in. That favours 5 and 4 for the default view and 6 only on zoom or selection.
- Parallax: real geometry (2, 3, 5, 6) is correct from every walk-around angle and casts a shadow you can project on the real table. Sprites (4) need the cylindrical billboard (done here), do not parallax, and look like cards seen from low or very high angles; AR users move the phone a lot, so this shows.
- Occlusion and depth: geometry sorts correctly against terrain and boats; sprites with alpha test (used here) are fine, but blending would not be.
- Lighting: Lambert geometry takes the real sun direction and the same palette; sprites carry painted-in light from the upper left, which will disagree when the table light is from the right.
- Cost: AR already spends the budget on camera feed and tracking, so a crowd wants style 4 or 5 and a hero few want style 6.
- Counted, not tracked: no style stores a face, a photo or an identity; the faces are four generic shapes with role labels.

## Weaknesses I know about
- Faces and hands are simple on purpose; the woman's hair dome and shawl are faceted rather than pretty at close range.
- Style 6 walk is an in-place cycle on a short loop; skirts and coats do not flex with the legs and the legs can clip into the long coat (hidden by the garment, not solved).
- Style 6 work poses read best at the shot time (t=1.7); the mallet swing is hand-tuned, not physically checked, and the hammer never touches the stake.
- Sprites have a single standing pose (no walk frames: 4 characters x 8 facings x about 6 frames would be 192 cells, about 4 to 5 MB as an uncompressed atlas) and a simple blob shadow instead of a cast one.
- Style 5 is the least distinct at close range (it looks like a cruder style 2); it earns its place only at distance.
- Row 3 (vinyl) at 3.9k triangles is heavier than it needs to be; I reduced it from 6.3k and stopped.
- Colour is by eye in the page's tone mapping, not measured against the look-test shots side by side.
- Everything was seen only in headless software GL at 1200 px; nothing was run on a phone or a headset.
