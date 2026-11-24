# Digging in and the lie of the land (research note)

Status: research note for Living Islands (branch citylab/cloud-islands), 24 Nov 2026. Follows research/FORTIFICATIONS_THROUGH_THE_AGES.md and the owner decision in EVOLUTION_TREE.md ("Fighting is about digging in and geography"). Real place names appear only in this note. Do not put them into code, data, assets or recipes.
Tone rails: hopeful. A friendly skirmish: crumbling earth, dust clouds, nothing gory. This note is engineering and geography. It has no instructions for weapons, explosives or ammunition and it models no soldiers. Everything is game-level.
Companion: `dig/dig_toy.py`, `dig/test_dig_toy.py`, `dig/DIG_MODEL.md`, `dig/maps/`.

## 0 How this was sourced, and confidence tags

**What I could and could not read.** The web fetch tool in this session could not open any page: every host (wikipedia, osha.gov, law.cornell.edu, gpo.gov, gutenberg.org, iwm.org.uk, historicengland.org.uk, web.mst.edu and others) failed to resolve, so those hosts need to be allowed in the session network settings. Only web-search result summaries were reachable. Every link below is a page that a search returned; I have not read any of them in full. Where I know a number from general engineering or history reading and a search did not confirm it, it is tagged Low or Medium and called my knowledge.

**Tags.** High: stated in a search summary of an authoritative page (a regulation, a government site, a museum or national encyclopedia) and consistent with the others. Medium: stated in a secondary or popular page, or in two weak ones, or my own well-known knowledge. Low: one weak source, an exam-style page, my estimate, or a guess.

**Terms in one line each.**
- **Scrape**: a shallow scoop in the ground to lie in. **Fighting pit**: a hole deep enough to stand in.
- **Trench trace**: the shape of the trench seen from above.
- **Fire step**: a ledge to stand on to look over the front. **Parapet**: the bank at the front. **Parados**: the bank at the back.
- **Bay** (firebay): a straight stretch of trench. **Traverse**: a block of earth left between bays so that nothing runs straight along the whole line.
- **Sump**: a pit in the trench floor where water collects. **Revetment**: facing that holds a bank steep. **Gabion**: a basket filled with earth or stone.
- **Dead ground**: ground you cannot see from a point. **Defilade**: shelter from view or fire given by ground. **Reverse slope**: the side of a hill away from the viewer.
- **Cover** stops things. **Concealment** only hides you. A bush hides. A bank covers.
- **Angle of repose**: the steepest slope a loose heap keeps. **Water table**: the underground level below which the ground is full of water.

## 1 The real techniques of digging in, from basic to modern

### 1.1 Scrapes and fighting pits

- **Scrape.** About 0.5 m deep (18 to 20 inches in one US combat-skills manual), lie-down size, with the spoil heaped in front. It takes minutes to an hour. It is the first thing anyone does. Confidence: High on the size (FM 21-75 summary, source 15).
- **One-person standing pit.** About 1.1 to 1.2 m deep, 0.6 m wide, about 1.2 m long, with a ledge or step, a small parapet of the spoil, and a gap of about a metre kept clear around the lip. One old US manual (FM 7-10) says a fit person with a field spade digs one in medium soil in about 4 hours under good conditions. Confidence: Medium (summary of the manual, not the page; the dimensions are my knowledge).
- **Two-person pit** so that one can rest while one watches. Same idea, twice the length.
- Rule of thumb that appears everywhere: dig the hole, and use the spoil to build the front lip, but keep the heap off the edge so its weight does not collapse the wall (modern excavation codes ask for at least about 0.6 m, two feet; Medium, my knowledge).

### 1.2 Trenches (First World War and after)

The Western Front trench is the best-documented dig-in, so it is the model for the game.
- **Size.** A front-line trench about 2.1 m (7 ft) deep and 1.8 m (6 ft) across at the top, narrowing to the floor. Confidence: Medium (two popular summaries, sources 5 and 6, agree; Low on the exact width, which varied with soil).
- **Fire step.** A ledge at the base of the front wall, about 0.4 to 0.5 m high and 0.6 m wide, where a person stands to see over the front. Confidence: High on the feature (source 5), Medium on the size.
- **Parapet and parados.** The front bank (the parapet) is built up with spoil or sandbags to about 0.6 to 0.9 m above the old ground. The rear bank (the parados) stops you showing against the sky and stops things from behind. Confidence: High on the purpose (source 5), Medium on the heights.
- **Zigzag trace: bays and traverses.** The trench is dug as a row of bays with a block of earth (a traverse) between them, or as a zigzag. The reason given in every source: so that a burst or a line of fire cannot run down the whole length. Bays about 5 to 10 m long, traverses 2 to 3 m thick. Confidence: High on the reason (sources 5 and 6), Medium on the sizes (my knowledge).
- **Trench system.** A front line, a support line some 50 to 100 m back and a reserve line behind it, joined by communication trenches that run at an angle, never straight, to the rear. Confidence: Medium.
- **Drainage.** A floor that slopes to a sump every few bays, a bailing pump or bucket, and duckboards (wooden slatted walkways) over the mud. Confidence: Medium. Sump sizes: Low (my estimate: a pit about 0.5 m across and 0.5 m deeper than the floor).
- **Revetment** holds the walls up: planks and posts, brushwood hurdles (woven panels), continuous brush, pole and dimensioned timber, corrugated metal, sandbags, gabions. A US lesson summary lists these types (source 14). Sandbags on a trench mostly face the walls and build the parapet and parados (source 13). Confidence: High.
- **Where it could not be dug: Flanders.** Around Ypres the water table was less than a metre down in a thin clay over wet sand, so troops built up sandbag walls (breastworks) instead of digging down, and the Germans built concrete blockhouses above ground (sources 7 to 9). August 1917 had about 127 mm of rain, twice the average, and shelling wrecked the drains. Confidence: High. The lesson for the game is the headline of section 2: the ground decides whether you dig down or build up.

### 1.3 Dugouts and shelters

- **Shallow dugout.** A room cut into the trench side or floor, roofed with timber, corrugated metal and a metre or so of earth. 1.5 to 3 m deep. Warm and cheap. Confidence: Medium.
- **Deep dugout.** Reached by a stair, with timber frames, in firm ground. Later German ones are said to have gone about 10 m down and were nearly proof against shelling (source 6, summary). Confidence: Low to Medium (one summary).
- **Chalk was kind.** The Somme chalk was easier to tunnel and less likely to collapse than Flanders clay (source 10). Confidence: Medium.
- **Rules for a good one.** Two exits. A stair that turns so nothing can fall straight down it. A roof thick enough for the load. A floor above the water table. A way for air and smoke to go. These are standard (Medium, my knowledge).
- **Hillside.** A dugout cut into a hillside needs far less roof (the hill is the roof) and drains downhill. This is the Harry case.

### 1.4 Tunnels and mined galleries

- **Cu Chi (Vietnam).** A network of narrow tunnels in a firm lateritic clay. UNESCO's tentative-list page gives the inside as about 75 cm wide and 95 cm high; the first level is 3 to 4 m down with air shafts, and the tunnels have levels at different depths (sources 3 and 4). A university course summary gives a minimum roof thickness of 1.5 m, air shafts that run at an angle so monsoon rain does not pour in, and a beveled trapdoor. The soil is dry, firm and compact, and where its surface has oxidised it is "as hard as concrete" (UNESCO page). Confidence: Medium to High on the dimensions, Medium on the rest (Low on 30 x 40 cm entrances from one popular page).
- **Western Front galleries.** Chalk galleries and cellars at Arras were linked into a system that moved people to the front under cover (sources 10 and 11). One veterans' brochure says clearing the chalk for each metre of tunnel meant about 200 sandbags of spoil, and that some fighting tunnels were about 40 m down (source 11; Low, one snippet, and the spoil job is the thing to remember: you have to hide or carry away the heap).
- **Iwo Jima and Peleliu.** Iwo Jima's surface is volcanic ash and porous tuff, soft enough to cut with hand tools yet stable enough not to collapse, so a huge cave network could be dug quickly (source 12). Peleliu's caves are in coral limestone, where natural caves were improved. Confidence: Medium (a non-academic page and an article flagged as needing citations; I found no verified tunnel depths).
- **Why it matters for the game.** Rock type decides it. Soft but self-supporting rock (tuff, firm clay, chalk) is the best tunnelling ground. Loose sand and wet peat cannot be tunnelled without a timber lining.

### 1.5 Observation posts, camouflage, concealment

- **Observation post.** A small hole at or just behind the crest, with a slit or a periscope view, reached by a covered trench from the dugout. The skyline rule: never show against the sky (this is why the parados exists and why the "military crest" is just below the topographic crest; definition in source 16). Confidence: High.
- **Camouflage.** Break up the outline, match the colour, cover fresh spoil (it is a different colour and shows from far away; Medium), do not leave tracks to the work, hide the heap. A net over the work, turf cut and relaid on the roof, spoil spread thin or dumped in the sea. Confidence: Medium.
- **Concealment is not cover.** The Ypres blockhouses were "camouflaged with mud and turf" (source 8) but were still above ground.

### 1.6 Supply, water, air, how people lived

- **Supply.** A niche cut into the wall, with a timber lintel, keeps boxes dry and out of the way. A track or a covered trench to the rear. Medium.
- **Water.** People need water more than anything else. A dug work needs a drain for the rain that falls into it and a store of drinking water brought in. In the game, drinking water links to the freshwater lens and rain barrel work already in the shelter ladder. Medium.
- **Air.** A small cave or dugout needs two holes at different heights (warm air rises out of the high one, cold air comes in at the low one). A fire needs a flue. Medium (my knowledge); the Cu Chi shafts are the best documented case (source 4).
- **Living.** Duckboards, straw or a bunk frame, a stove, wet feet and mud. The cold, damp trench was the real enemy. Lessons: keep the floor dry, keep the roof on, rest in rotation. Medium.

### 1.7 Earlier and other eras (so the ladder has more than one rung)

- **Hill forts, ditch and bank, motte** are in FORTIFICATIONS_THROUGH_THE_AGES.md (sections 2.1 to 2.2). They are dig-in on a hill with an earth bank. The game keeps them as found ruins.
- **Siege trenches** (approach trenches dug in zigzags toward a fort) show the same zigzag rule used for a different reason: the angles keep the trench out of the line of fire from the walls. Medium.
- **Natural caves and sea caves** are the zero-cost version: shelter that someone else dug for you (the sea, a stream, lava).

## 2 Geography and geology: the ground decides everything

### 2.1 The lie of the land

- **Slope and aspect.** Steep slopes shed water and soil and cannot be held without a bench. You dig a flat shelf (a bench) into the slope: cut on the uphill side, fill on the downhill side. A 20 degree slope needs a bench about twice as wide as the room (my estimate, Low). The side the slope faces (aspect) decides sun, wind and frost: a south slope in the northern hemisphere is warmer and drier, a north slope colder and wetter. High.
- **Ridgelines and the reverse slope.** A reverse-slope position sits just behind the crest, on the side away from the viewer. The defender sees over the crest from a lookout, the enemy cannot see or shoot flat at the dugout. Military doctrine notes its great advantage is cover and concealment, and that it works only so long as you can still watch the crest (sources 16 and 17). Confidence: High. The existing toy `fortify/ballistics_toy.py` already shows flat fire cannot hit a bunker behind a 14 m crest.
- **Military crest versus topographic crest.** The topographic crest is the highest line. The military crest is a little below it, where you can see all the way down the slope without showing against the sky (source 16; High).
- **Saddles and choke points.** A saddle (the low pass between two peaks), a gully, a causeway and a narrow neck of land funnel movement. A work that overlooks one controls it. In a heightfield, a choke point is a narrow strip of walkable cells between steep or wet ones. Medium.
- **High ground and defilade (dead ground).** A viewshed is the set of cells you can see from a point. Dead ground is everything you cannot. In the game the "margin" (metres of ground in the way) is the number that matters; see section 3.
- **Cover versus concealment.** Cover is a bank, rock or hill between you and the line of sight. Concealment is plants, shadow, colour. A good site has both, a cheap site has one. High.
- **Vegetation.** Woodland and scrub hide a site; roots bind the soil and slow slumping; turf on a roof is camouflage and insulation. Heather and bog hide little. Bare rock and sand hide nothing and the spoil shows. Medium.

### 2.2 Dig effort, by material (person-metres-cubed per hour)

What a fit person with a spade or pick shifts, shallow digging, steady work. Ranges are what published tables and norms suggest; the toy uses the mid value.

| Material | Mid | Range | Where the number comes from | Confidence |
|---|---|---|---|---|
| Loose sand | 0.60 | 0.4 to 0.8 | a construction table gives 0.66 m3/h for loose sand or soil in trenches to 1.5 m (source 1) | Medium |
| Soil, loam | 0.50 | 0.35 to 0.65 | 6.08 m3 per person-day for loam or clay in a labour table (0.76 per hour); a norms table 3.5 per day for medium soil (0.44 per hour) (sources 1 and 2) | Medium |
| Clay, heavy soil | 0.40 | 0.25 to 0.55 | 0.46 m3/h for clay (source 1); 4.88 per day for heavy clay (0.61 per hour); boulder clay 0.38 | Medium |
| Peat | 0.45 | 0.3 to 0.6 | no source found; peat is light but wet and fibrous. My estimate | Low |
| Gravel | 0.35 | 0.2 to 0.5 | 0.45 m3/h (source 1); a site engineer's comment gives 3 to 5 hours per m3 (0.2 to 0.33 per hour) (source 1) | Medium |
| Loose volcanic ash, scoria | 0.60 | 0.4 to 0.8 | no source; treated as sand. Iwo Jima tuff "allowed rapid excavation" (source 12) | Low |
| Soft rock (weathered, chalk, tuff, soft sandstone) | 0.10 | 0.05 to 0.2 | norms table: rock 0.8 m3 per person-day (0.10 per hour); 2.64 per day for rock in a labour table (0.33 per hour) (source 2) | Medium |
| Hard rock (gneiss, fresh basalt) by hand | 0.02 | 0.01 to 0.04 | no source; hand tools barely work. My estimate | Low |
| Frozen ground | x0.3 | x0.1 to x0.5 of thawed | a US Army cold-regions manual compares digging frozen soil at low temperature to digging low- to moderate-strength concrete (source 18) | Medium on direction, Low on the number |

Other numbers worth keeping.
- Norms table (per person per 8-hour day): soft 5.0, medium 3.5, hard 3.0, very hard 2.0, rock 0.8 m3 (source 2). Some norms went higher (up to 9 and 7) for soft and medium soil but the document cautions they may not hold elsewhere.
- **Overdig.** A hand-dug 1 m3 pit needs about 2 m3 excavated once you allow for the working room and unsupported slopes (source 1; Low, a forum comment).
- **Bulking.** Spoil is bulkier than the hole: about 1.10 for sand and 1.20 for gravel in one table (source 1); the toy uses 1.12 for sand up to 1.55 for blasted hard rock (Low, TUNING).
- **Real work is slower than the rate.** Shaping, shoring, hauling and rests take two to three times the pure dig rate (the one-person pit above: about 0.8 m3 in 4 hours is about 0.2 m3/h; Low).
- **Depth.** Throwing spoil up and out gets slower with depth; the toy adds 20 percent per metre below 1 m (TUNING).

### 2.3 Wall stability: angle of repose and the depth a wall stands

**Angle of repose** (the angle a loose heap keeps). Dry sand about 33 to 35 degrees (Wikipedia table 34, an engineering table 35, a university table 35). Damp sand about 40 to 45 degrees (the water pulls grains together), but water-filled sand 15 to 30. Gravel about 40 (one table) or 25 to 30 for natural gravel and sand (Wikipedia). Clay anywhere from 15 degrees (wet, excavated) to 45 (dry lump). A sand and clay mix about 38 to 42. Sources 19. Confidence: High that dry sand is about 34; Low that any single figure for clay is right (the tables disagree, and the honest answer is "it depends on water").

**Official sloping rules.** The US excavation standard (Appendix B to Subpart P, Part 1926) gives maximum slopes for open cuts less than 20 feet deep. Horizontal to vertical: stable rock vertical (90 degrees), Type A soil 3/4 to 1 (53 degrees), Type B 1 to 1 (45 degrees), Type C 1 1/2 to 1 (34 degrees) (source 20; High). Type C is wet or loose soil (sand, gravel, soft or running soil), Type A is firm clay of high strength, and Type B is in between (my knowledge; Medium). Note how Type C equals dry-sand repose. That is the bridge between the rule book and the game.

**How tall a vertical wall stands.** For clay with no internal friction, the textbook height of a vertical cut is about 4c divided by g (c is the undrained shear strength, g the unit weight). A worked exam example with c = 15 kPa and g = 20 kN/m3 gives 3 m (source 21). A tension crack at the top reduces it, a more careful paper notes the answer depends on how tension is treated, water in the ground and a load on the edge reduce it too, and time lets the face creep (source 21; Medium, exam pages, not a design source). So the working rule: **firm clay stands vertically about 1.5 m for a working day, not 3 m.** I use 1.6 m for firm clay, 1.1 m for soil with roots, and 0.35 m for damp sand (it stands a little because of suction between damp grains and fails at once when it dries or floods). Confidence: Medium on the physics, Low on each number.

| Material | Stands vertical (dry), m | Slumps to (deg) | Wet effect | Props |
|---|---|---|---|---|
| Dry or damp sand | 0.35 | 34 | loses almost all of it when soaked | timber at about 1.2 m spacing holds it |
| Gravel | 0.3 | 38 | none to lose | same |
| Loose ash, scoria | 0.7 | 33 | loses about 60 percent | same |
| Soil with roots | 1.1 | 33 | loses about half | same |
| Firm clay | 1.6 | 28 | loses about 60 percent; the most dangerous surprise | same |
| Peat | 0.9 | 30 | loses about 30 percent; fibre holds a face | same |
| Soft rock (tuff, chalk, soft sandstone) | 3 | 60 | small | rarely needed |
| Hard rock | 8 | 80 | none | not needed |

Peat strength, for what it is worth: vane tests on Irish peat gave 5 to 20 kPa, and lab tests gave an effective cohesion about 5.5 to 6.1 kPa and friction angle about 37 to 44 degrees; a Dutch field trial found the tensile strength of the fibres matters (source 22; Medium). Peat is weak but fibrous, and it is nearly always wet.

**Timber props.** Planks held by posts and struts let a trench go deeper than the unsupported height. The toy adds 1.8 m of standing height behind a timber panel (TUNING). Wicker and brushwood hurdles, gabions and sandbags do the same job lower down. The old rule: revetment holds the face; it does not stop water.

**How long a dug work lasts in rain.** Not something I found a table for. Reasoning: sand loses its damp cohesion in a downpour in hours; clay takes a day or more to soak but is worst once soaked; peat holds until it floods; soft and hard rock last for years. Spoil banks, having no cohesion, slump first. Game rule (TUNING, Low): a soak number per cell rises with rain (time constant about 2 hours for sand and ash, 12 for clay, 6 for peat, never for rock) and falls as it dries; a work with a roof, a drain and a revetment resets slowly.

### 2.4 Water: the water table, drainage, flooding, tide

- **Water table.** Dig below it and the hole fills. Wet ground and low ground have it near the surface; high dry ground has it deep; an island sits on a thin fresh-water lens over salt water, so near the coast the water table is about at tide level (my knowledge, Medium). The game: water table depth = 0.3 m plus 3.2 m times (1 minus wetness) squared, plus 0.05 m per metre of height (TUNING). Result on the two test windows: 1.1 to 5.8 m deep on the volcanic cone (median 2.8) and 1.8 to 3.2 m on the gneiss window (median 2.6).
- **Flooding.** A trench is a drain: water from the slope above runs into it. A trench across a slope catches water; a trench down a slope carries it. A sump in the floor and a ditch out to lower ground fix it. The toy shows a new 1.2 m trench on a 2 percent slope holds 1.19 m of water with no outlet and none after a 19-cell, 5 m3 drain ditch (see DIG_MODEL.md).
- **Tide and surf at the coast.** Within the tide range plus wave run-up the ground is wet, salt and moving. The model's tide amplitude is about 1.1 m (landform manifests); keep work above spring high water plus a margin, and above the storm-surge line the shore system already has. Sea caves flood and the roof can fall; they are good in calm weather and a hazard in storms. Medium.
- **Cliffs.** A cliff face gives shelter and a view; digging into it is rock work (slow, stable). The brow of a cliff is unstable; keep set back. Medium.
- **Rain softens. Frost.** Frozen ground is slow to dig and stands tall; thaw makes it slump. Medium.

### 2.5 The four rock types and common island ground

The game's exported worlds use four provinces and about 21 rock ids (landform/worlds manifests). Mapped to digging properties (the toy's mapping, `ROCK_MAT` and `VEG_MANTLE`):

| Province | Rocks in the export | Dig material | Dig effort | Walls | Notes |
|---|---|---|---|---|---|
| Gneiss (A) | gneiss pink and grey, dyke hard, fault breccia, shell sand | hard rock, with thin soil on top (about 0.5 to 0.8 m under heather and pasture, none on bare rock); breccia is loose gravel | hard rock is nearly undiggable by hand; soil is easy | rock holds any trench you can cut; the soil lip slumps | cheap shelter is a soil scrape on a rock bench; deep work needs tools the game gives later; caves and overhangs are natural |
| Sandstone (B) | red sandstone, flagstone, siltstone, mudstone, bole | soft rock and clay | soft rock 0.1 m3/h, clay 0.4 | stands 3 m in sandstone; mudstone and bole behave as clay (soak badly) | the best digging ground; sea caves and overhangs form in it |
| Basalt (C) | columnar basalt, vesicular top, weathered basalt, fresh basalt | hard rock; weathered and vesicular tops are soft rock | slow | columns split and hold; weathered tops slump in rain | stepped plateaus give ready-made benches; edges are cliffs |
| Volcanic (D) | fresh and weathered basalt, scoria, ash soil, lava flow, black sand, pumice | loose ash, scoria (gravel), black sand, and hard lava | ash 0.6 m3/h (fast), lava 0.02 | ash stands 0.7 m and slumps at 33 degrees; scoria and black sand are worse | fast to dig, bad to hold: needs timber; a fresh lava tube would be a free tunnel (not in the data) |
| Common island ground | machair and beach sand, shingle, peat bog, rush meadow, turf, heather, scrub, woodland | sand, gravel, peat, soil | sand fast, peat slow and wet | sand and shingle fail at once; peat stands a little, then floods | the first dugouts go into the soil mantle on a slope, above the wet |

Measured on the two test windows (toy mapping, surface material of land cells): volcanic window (seed 5): soil 49 percent, ash 30, hard rock 19, sand 2. Gneiss window (seed 62): hard rock 49, soil 45, sand 4, gravel 2.

## 3 Game mechanics

### 3.1 The TERRAIN DIGGING tool

Five edits on the landform heightfield. All keep volume honest.

| Edit | What it does | Volume rule |
|---|---|---|
| Cut | lowers a footprint to a floor depth below local ground | removed volume goes to a bank |
| Fill | raises a footprint | volume taken from a bank or from the nearest cut |
| Mound | heaps loose spoil to a parapet or parados | the spoil (cut volume times bulking) |
| Level | benches a pad on a slope | cut equals fill (the toy's `level_pad`: 75.6 m3 and 75.6 m3) |
| Tunnel mouth | marks a mouth and an inside space | the hole is not in the heightfield: it is a space in the work, and the muck (volume times bulking) is banked or carried to a spoil heap |

**Cost by material.** Hours = volume / rate. Soil layer and rock layer have separate rates; depth beyond 1 m adds 20 percent per metre; frozen soil is x0.3. A per-material rate table is in section 2.2; the toy reads it from `PROPS`.

**Collapse by angle of repose.** A cellular-automaton slump pass runs after each edit and each rain step. A face taller than the material's stand height relaxes down to its repose angle; material moves from the high cell to the low cell. Ground that stood before the edit is left alone, a soil layer only fails over its own thickness, heaped spoil has no cohesion, timber props add height. The pass converges (61 iterations on the sand trench, 60 of 60 random sites) and conserves volume to rounding.

**Drainage.** After each edit run Priority-Flood on the touched tiles (landform/hydrology.py `priority_flood`, `accumulate`). A pit with no outlet becomes a pond of depth (filled minus floor). The sump and drain parts cut a ditch that falls 1 percent to the nearest lower outlet. Flooded floors make a work unusable until bailed or drained.

**Weather.** Rain raises a soak number that lowers the stand height (sand 90 percent, clay 60, ash 60, soil 50, peat 30, rock 0 to 10). Frost lifts the stand height by 40 percent and cuts the dig rate to 30 percent. Thaw drops the stand height back and the slump pass runs, so a thaw collapses things.

**What a dug work gives** (game values, TUNING):

| Work | Cover | Concealment | Living space | Storage | Warmth |
|---|---|---|---|---|---|
| Scrape | 0.3 | 0.1 | none | none | none |
| Trench bay with fire step | 0.6 | 0.2 | none | none | none |
| Dugout with roof | 0.9 | 0.5 | 2 sleepers | 2 niches | +6 C |
| Observation post | 0.6 | 0.6 | none | none | none |
| Tunnel mouth and gallery | 1.0 | 0.8 | 4 sleepers | 6 niches | +8 C |
| Camouflage net | 0 | +0.3 | none | none | none |

Cover values are a 0 to 1 share of "line of sight blocked"; the toy makes cover a number of metres of ground in the way and the game can map it with min(metres / 2, 1).

### 3.2 Dig-in parts: the starter set

Same method as the repairable jetty (REPAIR_PILOT.md): each part is a node with a footprint, a socket (what it attaches to) and damage states. Names are for the kit pipeline and are plain nouns (no real names).

| Node | Footprint | Needs | Cost (person-hours, soil) | Damage states |
|---|---|---|---|---|
| `dig_scrape` | 2.0 x 1.0 x 0.5 m | open ground | 1 | intact; filled in (soaked sand); silted |
| `dig_trench_bay` | 3.0 x 1.0 x 1.2 m, fire step 0.45 m, parapet bank 0.6 m | ground that stands, or `dig_revet_panel` | 3 | intact; wall slumped; waterlogged; collapsed |
| `dig_traverse` | 2.0 x 1.0 x 1.2 m of left earth, between bays | a bay on each side | 0 (it is what you do not dig) | intact; slumped |
| `dig_revet_panel` | 1.5 x 0.1 x 1.4 m, timber (or wicker hurdle) with two posts | a trench wall | 1 plus 4 timber units | sound; leaning; failed (the panel is a loose part that can be put back) |
| `dig_dugout` | 3.0 x 2.0 x 1.8 m inside, roof 0.6 m earth on timber, stair 1.2 m | firm slope or bench | 12 plus 10 timber units | sound; roof sagging; roof failed; flooded |
| `dig_door_hatch` | 0.8 x 1.4 m door or 0.7 x 0.7 m hatch | a dugout or mouth | 1 plus 2 timber | closed; ajar; broken (replace part) |
| `dig_obs_post` | 1.0 x 1.0 x 1.2 m with a slit 0.4 x 0.15 m | crest, reverse side | 3 | sound; slit blocked; collapsed |
| `dig_tunnel_mouth` | 1.2 x 1.0 m opening, gallery 0.75 x 0.95 m, 8 to 12 m | stable rock or firm clay | 20 to 100 (see below) | sound; lining loose; roof fall; flooded |
| `dig_camo_net` | 4 x 3 m cloth with turf tufts | a work | 1 | intact; torn; blown off |
| `dig_sump_drain` | pit 0.5 x 0.5 x 0.5 m plus a ditch falling 1 percent | a work with a floor | 1 plus 0.1 per metre | clear; silted; blocked |
| `dig_niche_crate` | 0.6 x 0.5 x 0.5 m recess with a lintel | a dugout or trench wall | 0.5 | sound; wet; fallen in |

Gallery cost: a 12 m gallery at 0.9 m2 section is about 11 m3: in firm clay (0.4) about 27 hours with hauling slowdown (the toy's `tunnel_hours` gives 14.4 m3 and about 1,000 hours in hard rock, which is why the answer in hard rock is "do not").

**Ties.** The repair-parts method gives snap sockets and break loads; a revetment panel's break load comes from the soil pressure at its depth (toy: the stand-height model, Medium) and a drain's from the pond depth. The kit pipeline makes each part a node with a live, a hero and a far version and a damage-state variant; the first four pieces are plank, post, hurdle and net, which the jetty and lean-to kit already model. Salvaged timber (crates, planks) comes from the shelter ladder.

### 3.3 Rendering a heightfield edit on tablets

The game grid is 2 to 3 m per cell. A trench is 1 m wide. So an edit needs a **fine layer**: a detail grid (0.25 to 0.5 m) over the touched tiles only, stored as a displacement from the base heightfield, with a little data per tile (height, material, soak, props). The toy does exactly this (24 m window at 0.5 m cells: 48 x 48 = 2,304 cells).

What must update after an edit:
1. **Mesh patch.** Rebuild only the tiles touched (a 16 x 16 cell patch is 512 triangles).
2. **Normals.** Recompute for the patch and one ring around it.
3. **Shadows.** Mark the tile dirty so the shadow map or baked sun term refreshes; a trench is mostly shadow and that sells it.
4. **Colour ramp.** Spoil is a different colour from old ground (fresh, darker or paler); the colour ramp reads material and soak. Fresh spoil fades over game days.
5. **Collision.** The walkable height and the line-of-sight height both change; update the same patch.
6. **Water and drainage.** Re-run Priority-Flood on the tile and its neighbours; show ponds.
7. **Dust.** A short particle burst on collapse (the dust clouds Harry wants).

**Budgets** (TUNING for a mid tablet): 1 ms for a patch edit; 64 touched tiles live at 512 triangles each is 32,768 triangles; a slump pass over a 48 x 48 window at about 100 iterations is about 230,000 cell updates, a few milliseconds if vectorised on the CPU or in a shader; one whole-island viewshed is about 17,000 targets at 80 steps (1.4 million samples), about a second on a CPU in Python and well under 100 ms in a shader (not timed here). Keep the fine layer below 4 MB per island. These are estimates; nothing here has run on a tablet.

## 4 Play

### 4.1 Order of play

1. **Quiet builder mode first.** Dig a base, explore, repair old works (the found forts and the old trenches are ruins with broken parts). No firing. The reward is a warm, dry, hidden home that stays up through the first winter.
2. **Skirmish and co-op later**, damage resetting between games (EVOLUTION_TREE.md decision 2). A friendly contest of who holds a hill; a crumbling parapet and a dust cloud are the penalty, not any harm.

### 4.2 Reading the ground

A **ground-reading overlay** (toggle) draws three layers on the real terrain:
- **Slope and aspect:** green gentle, yellow steady, red too steep to hold without a bench; the arrow shows which way the slope faces.
- **Dead ground:** a blue wash for what the current viewpoint (or the landing beach) cannot see. The toy's maps (`dig/maps/deadground_seed0005.png`) show it.
- **View cone:** a fan from a chosen point showing what a lookout sees; tap a spot to see its margin in metres.
- **Wet and dry:** the water-table depth and ponds in a pale blue.
- A **best site** hint (the toy's score) that can be switched off, so players find it themselves.

### 4.3 How a clever dig beats a bigger one

- A small dugout on a dry reverse slope with a lookout on the crest beats a big trench on the forward slope: it costs 23 hours (toy) and cannot be seen or reached.
- A drain beats a sandbag wall in wet ground; a timber panel beats a deeper dig in sand; a camouflage net beats a bigger bank.
- Rock beats everything but costs about 30 times more per m3 than sand (toy: 50 against 1.7 person-hours); the cheapest good work is soft rock or firm clay on a dry slope.

### 4.4 Scoring that rewards using the land

Score a work by what it gets from the ground, not what you spent: reverse-slope cover, concealment, dry floor, low dig effort per unit of cover, view of the lane. This is the toy's best-site score (30 / 15 / 20 / 15 / 20). Players who dig where the land helps get a higher score than players who dig most. Add a bonus for repairs (restoring old works), and a small one for leaving the land as you found it (filling a pit back in).

### 4.5 AR notes

Overlay the viewshed and dead-ground wash on a real room or garden mapped as a heightfield (a pile of cushions or a sandbox); the player digs a small trench in a sand tray and the camera reads the heights. This stays a toy: nothing real is dug. Keep the overlay readable on a phone (one layer at a time, no more than 3 colours).

### 4.6 Ties to the shelter ladder and the found forts

- Rung 1 (lean-to) and rung 2 (turf-and-stone hut) already live in FIRST_SHELTER_AND_MATERIALS.md. Add rung 1b, **the dugout**: a hole in a dry slope with a driftwood roof, cheaper than a hut, safer in wind, and hard to find. Rung 2b is a **cave shelter or gallery**. The ladder's note that effort not materials limits rungs 1 to 3 applies: digging is pure effort.
- The star fort kit stays parked as a found ruin; its ditch and rampart are real dig works that a player can repair (a ditch to re-cut, a parapet to rebuild), using the same parts above.

## 5 The toy model (summary; the report is dig/DIG_MODEL.md)

`dig/dig_toy.py` loads a real exported window (one volcanic, seed 5; one gneiss, seed 62), builds a materials map, and implements cost, cut and fill with volume conservation, a slump pass by angle of repose, viewshed and defilade, drainage (reusing landform/hydrology.py), and a best-site finder. `dig/test_dig_toy.py` has 39 checks, all pass: volume conserved (3e-14 relative, limit 1 percent); slumping converges; a 1.2 m trench in hard rock keeps its walls while the same trench in sand slumps to 0.69 m and 2 m wide; the viewshed drops from 100 to 0 percent behind a 14 m ridge; the site finder picks the dry reverse slope over the wet hollow (0.67 against 0.19); results are deterministic; 60 random sites run. Three PNG maps are in `dig/maps/`. Real physics and toy are separated in DIG_MODEL.md. Short version: repose angle, stand height of soil, rock holding a face, line of sight, pit filling and conservation are real in kind; the slump rule, the rates, the water table and the scoring weights are game choices.

## 6 Minimal build list, in order, with rough cost

Costs are developer-days for one person, rough (TUNING, Low).

| # | Step | Rough cost |
|---|---|---|
| 1 | Fine edit layer on the landform heightfield (displacement tiles, mesh patch, normals, collision) | 4 to 6 days |
| 2 | Cut, mound and level tools with volume bookkeeping and the cost by material (port `dig_toy.py` numbers) | 2 days |
| 3 | Slump pass on the fine layer, with dust puff on collapse | 2 days |
| 4 | Drainage on touched tiles (priority_flood port), sump and drain parts, ponds | 2 days |
| 5 | Ground-reading overlay (slope, dead ground, view cone, wet) | 3 days |
| 6 | Starter parts as kit nodes: scrape, trench bay, traverse, revetment panel, dugout, hatch, obs post, tunnel mouth, camo net, sump, niche; damage states; repair sockets | 8 to 10 days |
| 7 | Rain, frost, thaw (soak number, stand height changes) | 2 days |
| 8 | Quiet builder mode: place and repair works, found old trenches as ruins | 4 days |
| 9 | Scoring and the best-site hint | 1 day |
| 10 | Skirmish and co-op, later; AR notes | later |

Total to the quiet builder: about 28 to 32 developer-days.

## 7 What I could not verify

- Every page above was read only as a search-result summary (the fetch tool could not resolve any host; section 0).
- Exact trench sizes (fire-step height, bay and traverse lengths, sump size): Medium, my knowledge.
- Dig rates for peat, ash and hard rock; dig rate for frozen ground: Low.
- Time a rain takes to ruin a trench: no source; TUNING.
- Tunnel depths at Vimy and Iwo Jima: one snippet each or none.
- Whether the spoil-setback rule is 0.6 m or 2 ft in a given code: from memory.
- The OSHA soil type definitions (Type A, B, C strengths): I know them as in my knowledge; only the slope table was confirmed by a search summary.
- The exact FM 5-103 and FM 7-10 position tables: I only saw search summaries.

## 8 Open questions for Harry (taste only)

1. Should a hillside dugout feel **cosy** (warm light, a stove, stored boxes) or **adventurous** (a lookout, a secret door)? Both are possible; which first?
2. When a trench wall collapses, how much should the player feel it: a puff of dust and a small slide, or a bigger slump that blocks the way?
3. Should you be able to dig a **tunnel** from the first week, or only after you have found tools in a ruin (hard rock is a long job by hand)?
4. Should loose spoil heaps show as bright fresh earth that fades over a few game days, or stay the same colour (so a careless player is easier to spot)?
5. In skirmish, who does the "winning": the side that holds the hill, or the side with the best-kept works at the end (a tidy-camp score)?
6. Would you like a **friendly stranger** (a visitor, a hiker or a seal) to show up when a trench floods, so the player learns about drains without a lecture?

## 9 Sources

Links are search results; none opened in full (see section 0).

1. Construction labour table for hand digging by soil: https://planningplanet.com/index.php/wiki/422684/excavate-reduce-levels and https://www.planningplanet.com/comment/80606 (Medium)
2. Productivity norms (per person-day by soil class): https://www.academia.edu/7463085/PRODUCTIVITY_NORMS and https://www.scribd.com/document/440912120/prod-norms-1-pdf (Medium)
3. UNESCO tentative list, Cu Chi tunnels: https://whc.unesco.org/en/tentativelists/7038/ (Medium to High)
4. Missouri S&T course slides on the Cu Chi tunnels (laterite clay, ventilation, roof thickness): https://web.mst.edu/rogersda/umrcourses/ge342/Cu%20Chi%20Tunnels-revised.pdf (Medium)
5. The Canadian Encyclopedia, trench warfare: https://www.thecanadianencyclopedia.ca/en/article/trench-warfare (High on the general feature list)
6. World History Encyclopedia, trench warfare on the Western Front: https://www.worldhistory.org/article/2820/ (Medium)
7. Australian War Memorial, rain and mud at Passchendaele: https://www.awm.gov.au/articles/blog/rain-mud-the-ypres-passchendaele-offensive (High)
8. World History Encyclopedia, Passchendaele: https://www.worldhistory.org/article/2893/ (Medium)
9. The Canadian Encyclopedia, Ypres 1915: https://www.thecanadianencyclopedia.ca/article/ypres-inexperienced-canadians-hold-the-line-feature (Medium)
10. Long, Long Trail, visualising the trenches (Somme chalk): https://www.longlongtrail.co.uk/visualising-the-trenches/ and Western Front Association on tunnellers: https://www.westernfrontassociation.com/world-war-i-articles/2008/december/the-british-clay-kickers-and-moles-of-the-western-front/ (Medium)
11. Veterans Affairs Canada, tunnels and trenches brochure: https://public.cdn.cloud.veterans.gc.ca/pdf/memorials/overseas/TunnelTrenchBrochure-e.pdf ; Valour Canada: https://vimyridge.valourcanada.ca/the-road-to-vimy-ridge/gearing-up/tunnels-and-trenches/ ; Arras quarries: https://www.subbrit.org.uk/sites/ronville-tunnels-carriere-wellington/ (Medium; Low on the 40 m and 200 sandbag figures)
12. Iwo Jima geography and defence: https://historyrise.com/article/how-iwo-jimas-geography-shaped-japanese-defensive-strategies/ and https://en.wikipedia.org/wiki/Planning_for_the_Battle_of_Iwo_Jima ; Peleliu caves: https://ibiblio.org/hyperwar/USMC/USMC-M-Peleliu/USMC-M-Peleliu-D.html (Medium)
13. Sandbags and gabions in trenches: https://thinkdefence.co.uk/2024/12/sandbags-and-gabions (Medium)
14. Trench revetment types (US Army Command and Staff College lesson): https://www.globalsecurity.org/military/library/policy/army/accp/en0065/le2.htm (Medium)
15. US field manual summaries: FM 7-10 https://ibiblio.org/hyperwar/USA/ref/FM/FM7-10/FM7-10-I.html ; FM 21-75 combat skills; FM 5-103 survivability https://archive.org/download/MManuals/Fm5-103Survivability.pdf (Medium; summaries only)
16. Military crest: https://en.wikipedia.org/wiki/Military_crest (cites US FM 101-5-1) (High on the definition)
17. Reverse slope defence: https://en.wikipedia.org/wiki/Reverse_slope ; 1980s Army monograph https://apps.dtic.mil/sti/pdfs/ADA167680.pdf ; FM 7-10 chapter 5 https://www.globalsecurity.org/military/library/policy/army/fm/7-10/ch5.htm (Medium to High)
18. Frozen soil digging compared to concrete: TM 5-852-4 https://buildingcriteria1.tpub.com/ufc_3_130_04/ufc_3_130_040243.htm (Medium)
19. Angle of repose tables: https://en.wikipedia.org/wiki/Angle_of_repose ; https://www.engineeringtoolbox.com/dumping-angles-d_1531.html ; https://cushman.host.dartmouth.edu/books/PracticalFM/Chap16.pdf ; https://doitpoms.ac.uk/tlplib/granular_materials/repose_angle.php (Medium; clay values Low)
20. OSHA Appendix B to Subpart P of Part 1926, sloping and benching: https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926subpartpappb ; Cornell copy https://www.law.cornell.edu/cfr/text/29/appendix-B_to_subpart_P_of_part_1926 (High)
21. Critical height of a vertical cut, Hc = 4c/g (exam-style pages and one research paper): https://testbook.com/question-answer/the-critical-height-of-an-unsupported-vertical-cut--63c934eecb8b39c5f5b1e3a1 ; https://comptes-rendus.academie-sciences.fr/mecanique/articles/10.5802/crmeca.276 ; https://unbscholar.lib.unb.ca/items/eb0bfd45-49e1-4c83-b4a0-421e410bcf16 (Medium; not design sources)
22. Peat strength: https://researchrepository.ucd.ie/server/api/core/bitstreams/341fffba-75e3-45b6-b608-3a3f618dde04/content ; https://repository.tudelft.nl/file/File_081ed4bf-3630-4811-a669-27cbe266cde2 (Medium)
23. Priority-Flood: Barnes, Lehman and Mulla 2014, the algorithm used in landform/hydrology.py (already cited in research/RIVERS_LAKES_WATER_CYCLE.md) (High)
