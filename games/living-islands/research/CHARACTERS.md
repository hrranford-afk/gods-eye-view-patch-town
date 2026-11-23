Do not put real place names into game code, assets or recipes.

# CHARACTERS: raising settler quality to the Blender target (research note, 23 Nov 2026)

Gate note for the "People / settlers" row of RESEARCH_FIRST.md. Companions: PEOPLE_OPTIONS.md (six styles built), MODES_AR_DESKTOP_HANDHELD.md (tiers), BAKE_BRIDGE.md, BLENDER_PILOT.md, SKY_CLOCK.md, EVOLUTION_TREE.md.
Tags: VERIFIED (read in a source today, or seen in our own files and pictures), PLAUSIBLE (standard craft knowledge, not re-read), UNVERIFIED (heard, not checked), TUNING (a starting number to measure).
Web access this job: web search worked (snippets only). Page fetches FAILED for quaternius.com, kenney.nl, static.makehumancommunity.org and helpx.adobe.com (host not allowed in this session). So every licence line below comes from search snippets and must be re-read on the source page before any download. Nothing was downloaded, built or rendered. Nothing ran on a device.

## 0. Short answer
1. Owner is right. Looking at shots/blender-hero.png and shots/ppl-6.png side by side (VERIFIED, I looked): the Blender land, boat and tents have soft bounced light, contact shadow, real material texture and wear. Style 6 people are flat-lit solid-colour shapes with a huge smooth face, mitten hands, no cloth folds, no material response and a thin line of shadow. They read like a different game.
2. The gap is mostly SHADING AND SURFACE, not triangle count. Style 6 has 3k triangles; a 3k to 8k character can carry high-poly detail if it is BAKED (normal, AO, curvature) and lit like the Blender scenes. Triangles are not the fix; baked detail, materials and better proportions are.
3. Aim for a STRONG STYLISED look (soft painterly clay, "illustrated realism"), not realism. A weak realistic person falls into the uncanny valley; a confident stylised one hides the limits of our tools (section 1.3).
4. Our tools can do it: Blender in python, CPU Cycles, bake, glTF export, three.js r128 SkinnedMesh. What we lack is hand sculpting and hand posing; so the plan leans on parametric bodies, sim-baked cloth folds, procedural keyframes, and CC0 animation libraries (section 3). The owner's Radeon machine (Cycles on GPU, GUI) would add sculpt polish and bake speed, not new capability.
5. Do one hero settler end to end first (section 7), judge it next to style 6 at three distances, and only then build a cast.

## 1. What makes a character look good at our distances
### 1.1 The three distances
| View | Figure height on screen | What survives | What carries the look |
|---|---|---|---|
| Tabletop overview | 25 to 60 px | silhouette, colour blocks, one bright accent, motion, shadow | proportion and posture of the silhouette, tool shape, one accent colour per person, contact shadow |
| Camp close-up | 300 to 600 px | face as a read (eyes, brow, hat shadow), hands as shapes, big folds, cloth material | clothing layers, value structure (light, mid, dark), fold shapes, wear, rim light, hair/hat mass |
| Hero close-up | full screen | everything the mesh and textures hold | baked fine detail, eyes with specular, skin and cloth response, animation weight |
Rule (PLAUSIBLE, standard in game art): detail must scale with what the viewer can see; a detail smaller than 2 to 3 px at the working distance is wasted triangles, and a face detail wider than the head's pixel width does nothing at overview.

### 1.2 Where style 6 falls short (read from shots/ppl-6.png, VERIFIED by eye)
| Aspect | What I see | Why it hurts | Fix |
|---|---|---|---|
| Proportion | heads about 1/6.5 of height, long thin arms, tube sleeves, body like a cone | reads as a "peg doll", no weight in torso or shoulders | 7 to 7.5 heads, shoulder width 2 heads (men), real waist, thigh and calf taper, arm length to mid-thigh (section 2.1) |
| Silhouette | skipper is a bell, woman an A-line triangle; legs hidden | at 40 px every figure is the same cone | vary shoulders, hat, coat hem, tool; one asymmetric element each (bag on one shoulder, coil, net) |
| Face | skin ball, dots, thin nose; tiny features with a big forehead | uncanny blank stare at close view | slightly larger eyes with a white, iris, one specular dot, brow shadow, nose planes, mouth line; baked AO around sockets (1.4) |
| Hands | mitten with thumb | the first thing people look at in close-up | 4-finger stylised hand (fist and open pose), 300 to 500 tris each, or hands hidden by tools or gloves |
| Clothing | smooth tubes with a seam line | no folds at elbow, hips, hem; no layering depth; cloth looks like plastic | cloth sim baked to normal map; thickness at collars, cuffs, hems; wrinkle maps at joints |
| Hair | faceted dome or flat cap | cheap | hair as 6 to 12 sculpted clump shapes or hair cards with alpha, plus a darker cap underneath |
| Materials | one Lambert colour with jitter | no wool, canvas or leather response; no sheen at grazing angles | PBR with weave normal, roughness variation, sheen on wool, AO baked, wear (2.7) |
| Posture and weight | straight legs, arms stiff, torso does not lean | no sense of load: bucket weightless, mallet floats | hip drop, counter-rotation of shoulders, knee bend, weight shift before a step, arm swing with load (2.10) |
| Contact shadow | long sun shadow only; feet float on the dirt | people look pasted | dark soft blob plus AO under feet, a 2 to 3 cm shadow from the boots, foot IK or contact baked (section 5) |
| Scale of detail vs light | surfaces too smooth for a golden hour that shows grain | the land is richly lit, the person is a bright sticker | add texture grain at the scale of the land (Blender look), warm bounce from the ground on the lower body, rim on the sunward edge |
| Animation | in-place cycle on a short loop; legs clip into the coat | stiff and mechanical | foot-contact walk with pelvis bob and sway, secondary motion on coat hem (bone chain or baked) |

### 1.3 Uncanny valley and why stylised beats weak realistic
- The uncanny valley (Mori 1970, PLAUSIBLE: widely taught): as a figure nears realism, small errors in eyes, skin, motion and proportion become disturbing. Games avoid it either by staying clearly stylised or by spending a very large budget. We have the first option only. (UNVERIFIED here: I did not fetch a source; this is textbook content.)
- Stylisation is a promise: "this is how it looks, all of it". Every part (face, hand, cloth, shadow) must keep that promise. A realistic head on a cone body breaks it; so does a smooth plastic head with a hand-painted body. Our style 6 mixes a toy head with literal clothes.
- Named strategies (all PLAUSIBLE, common game looks):
| Strategy | What it is | Fit to our world | Cost |
|---|---|---|---|
| Painterly low-poly | few polygons, hand-painted-looking colour with brush grain, soft value shifts, no hard outline | good: matches stylised trees, rocks and tents in the hero render; weathered via grain | texture baking, no sculpt |
| Soft clay | rounded forms, matte, subsurface-like warm edge, fingerprints of noise bump | very good for "hopeful": friendly but not toy-like if surfaces keep wool grain | normals, AO, mild SSS fake via rim and ramp |
| Flat-shaded low-poly | facets, no textures | cheap, but fights the soft Blender light; already seen in style 2 | lowest |
| Illustrated (cel with soft rim, ink-like shape edges) | 2 to 3 tone steps with painted edge | readable at 40 px, risk of clashing with soft land light | toon ramp shader, custom |
- Recommendation (TUNING, owner decides): "soft clay with painterly cloth". Clothing is wool, canvas, oilskin with visible weave and folds (the thing the owner liked in boats and tents), skin and hair are simple, warm and matte, faces are readable and gentle. This matches muted, weathered, hopeful. It is the same visual family as the Blender trees and tents: simple shapes, rich surface.
- Avoid: realistic skin shaders, individual hair strands, fine face detail, strong outlines.

## 2. Authoring pipelines (what we can do in the cloud)
Tools VERIFIED in BLENDER_PILOT.md: Blender 5.3 as python module, headless, CPU Cycles, 4 cores, seeded and repeatable; bake, denoise and glTF export used; a rock went through the asset verifier (12 of 12). Not verified: character rigging, cloth sim, rig export in this repo (none done yet). Wall times below are PLAUSIBLE guesses, TUNING.
### 2.1 Parametric body (proportions)
Build the body from a script: a base mesh (box-modelled loops or metaballs plus subdivision) driven by a handful of parameters, so adult men, women, older people and children are the same topology with different measurements. Same topology means one rig, one set of weights, and shared clothing patterns.
| Type | Height (m) | Heads tall | Shoulder width (heads) | Notes | Conf. |
|---|---|---|---|---|---|
| Adult man | 1.70 to 1.82 | 7.5 | 2.0 to 2.2 | wide shoulders, neck 0.4 head, arm tip reaches mid-thigh | PLAUSIBLE (standard figure drawing; stature by population varies, so vary 1.62 to 1.88) |
| Adult woman | 1.58 to 1.72 | 7.3 | 1.7 to 1.9 | narrower shoulders, hip width about shoulders, longer leg ratio looks slim | PLAUSIBLE |
| Older person | 1.55 to 1.72 | 7 | as adult | forward head, rounded upper back, bent knees, shorter by up to 2 to 3 cm | PLAUSIBLE; stoop angle 10 to 20 degrees TUNING |
| Child 6 to 8 | 1.15 to 1.30 | 6 | 1.5 | bigger head, shorter limbs | PLAUSIBLE |
| Teen | 1.50 to 1.70 | 7 | 1.8 | lanky, hands and feet big | PLAUSIBLE |
Rules: head height is the unit; the crotch is at half height; elbow at waist; wrist at crotch; knees at 1/4 height. Allow stylisation up to 10 percent larger head only for children and only by choice. Parameters: height, build (slim, average, broad), shoulder, belly, age (stoop, face lines), skin tone, hair. Seeded: `seed` picks all of them (section 2.8). Counted, not tracked: a person here is a seed, not a record about someone real.
### 2.2 Clothing meshes with folds
Layers, each a separate mesh shell offset 8 to 25 mm from the body and shaped over the base (TUNING): underlayer (long-sleeve), wool jumper (thick, rib cuffs and hem), oilskin coat (stiff, long, big folds), trousers (loose, wrinkles at knee), boots, cap, apron, scarf. Three ways to get folds, in rising cost:
| Method | How | Result | Cost | Conf. |
|---|---|---|---|---|
| Hand-built shape plus noise displacement | script offsets cloth loops, adds sine and noise folds at joints (elbow, hip, knee), then bakes to a normal map | cheap, repeatable, good enough at 300 px | low | PLAUSIBLE |
| Static-pose cloth simulation then bake | pose the body (A-pose or relaxed), drop and settle a cloth object (Blender cloth physics, headless possible by stepping frames with bpy, VERIFIED only that bpy runs headless; cloth sim in this repo not tried), then BAKE the sim mesh to a normal map on the low-poly cloth | real fold shapes (tight at pinch points, hang under gravity) | medium; minutes per garment on CPU, TUNING | PLAUSIBLE |
| Sculpted folds | Blender GUI sculpt on the owner machine | best, but manual | high | PLAUSIBLE |
Recommendation: method 2 for coat, apron and jumper (they sell the look), method 1 for trousers and scarf. Do cloth in the rest pose; animation then moves the low-poly clothing with the rig and the baked normals stay on it (folds do not change in the walk; this is the standard game trick, accepted at our distances).
### 2.3 Hair
Options: (a) 6 to 12 clump meshes (tapered tubes with flowing curves) with a hair-like noise texture; (b) hair cards (planes with alpha cut-out strips); (c) a plain cap shape under a hat. For small people (b) alpha cards cost overdraw; (a) is simpler and keeps the soft clay look. Beards: 3 to 4 clumps. Hats cover most hair, which helps (cap, knitted hat, sou'wester, hood). TUNING: hair 300 to 600 tris.
### 2.4 Faces that read
Built for readability, not realism. A head of about 600 to 900 tris with: eye sockets (AO baked in), eyeball spheres with a white, iris and ONE specular catchlight (the single most important face detail, PLAUSIBLE), brow ridge and a brow shape that carries expression, nose as planes, mouth as a slight dent line plus a lip shape, ears simple. A small set of 4 to 6 expressions by blend shapes or by swapping a texture region: calm, smile (gentle), tired, worried. Keep the expression range gentle (owner tone: hopeful, quiet stakes). Avoid asymmetry errors; keep the face modest in size, about 1/7.5 of height.
### 2.5 Hands
300 to 500 tris per hand: palm, four fingers as two segments each (3 sections), thumb, knuckles as slight bumps. Poses needed: relaxed, grip (tool), carry (bucket, rope), open. Fingers curl by a few bones per hand (add 2 to 3 bones per finger only if hands are on screen at close view, otherwise one grip bone per hand). TUNING.
### 2.6 High to low baking (normal, AO, curvature)
VERIFIED in our repo: the rock pipeline bakes a high-poly shape to a normal map and AO on a 1,900-triangle mesh (rock_asset.py). Character version: build or sculpt-by-script a HIGH body plus clothing (100k to 500k tris, with sim folds, stitch lines, pockets, patches), build the LOW version (3k to 8k), UV unwrap with one atlas per character (2048 or 1024), and bake: normal (tangent space), AO, curvature (for wear), thickness (for the clay glow). Use cage bake with a small ray distance; avoid the UV seam across a visible fold (seams on side and under arms, hidden). Pilot lessons from rocks: normal and colour need only 4 samples, AO 24 to 32; save floats correctly (BLENDER_PILOT.md). TUNING: a 2048 atlas bake of one character in about 2 to 5 minutes on 4 CPU cores.
### 2.7 PBR cloth materials and wear
| Material | Look | Base roughness | Normal / grain | Wear |
|---|---|---|---|---|
| Wool jumper (knit) | matte, soft sheen at grazing, visible rib | 0.9 | knit stitch pattern, procedural; coarse at 25 px | pilling, darned patch, salt stain on shoulder |
| Canvas | flat matte, weave | 0.9 to 0.95 | weave from wave texture (as in `canvas_material` in li_camp.py, VERIFIED) | dirt at knees, bleached top |
| Waxed cotton / oilskin | slightly glossy, creases catch light, darker where wet | 0.45 to 0.6 | big stiff folds plus fine crackle | scuffs, tar, patch of a different yellow |
| Leather (boots, belt) | low gloss, creases | 0.5 | grain noise | scuffs at toes, dark at sole |
| Fleece (old world) | very matte, fuzzy sheen | 0.95 | soft pile noise | pilled, faded |
| Hi-vis scrap | saturated yellow-green or orange, faded | 0.7 | flat | stained, cut edge, tape strip (no logos, no text) |
Wear is baked into base colour from the curvature and AO bakes (dirt in creases, scuffs on edges, salt at the shoulder and hem) with a seeded noise mask. Procedural weave maps are tiled (1024) to save size. Keep metalness 0 for all cloth.
### 2.8 Seeded variation per settler
One palette table (muted wool colours, faded oilskin yellows, navy, grey, rust, one bright accent each) and a seed that picks: body type, height, skin tone, hair and style, garment set, garment colours, patch positions, tool. The same seed always gives the same person (matches our determinism rule). Variation lives in a small number of material parameters and vertex colours so crowds stay in few draw calls. TUNING: 12 to 20 shirt colours, 8 skin tones, 10 hair colours, 6 hat types.
### 2.9 Rig
Blender armature, humanoid, deformation bones only in the exported file.
| Part | Bones | Notes |
|---|---|---|
| Root, hips, spine x3, neck, head | 7 | |
| Arms: shoulder, upper, fore, hand x2 sides | 8 | |
| Fingers (optional, hero only) | 0 to 30 | none for LOD1 |
| Legs: thigh, shin, foot, toe x2 | 8 | |
| Extras: coat hem 2 to 4, scarf 2, hair 0 to 2 | 4 to 8 | secondary motion |
Total: hero about 45 to 60 (with finger bones 75 to 90 is too many); LOD1 about 25 to 30. Facts: three.js SkinnedMesh stores bones as uniforms or, when the device supports it, a float texture; search results note that some phones have only 128 to 256 vertex uniform vectors (about 27 to 59 bones) and that a mobile article says under about 60 bones (secondary source, VERIFIED as a report, number TUNING). Each vertex may use at most 4 bones (glTF skinning attribute is vec4, VERIFIED in search results). Export: glTF via Blender's exporter with "limit to 4 influences" and only deform bones.
### 2.10 Animation clips
| Clip | Loop? | Key point |
|---|---|---|
| idle | yes | breathing (chest 1 cm), weight shift, a head glance; 3 to 5 s |
| walk | yes | foot contact on beat, pelvis bob 2 to 3 cm, sway, counter-rotating shoulders, arms swing; 1.0 to 1.1 s per stride pair at about 1.4 m/s (PLAUSIBLE: typical walking speed 1.3 to 1.5 m/s) |
| carry | yes | walk with weight: lean back, slower, arm straight down with bucket, short steps; bucket sways |
| row | yes | seated, 2 to 3 s per stroke at a calm rate (PLAUSIBLE), feather the oar; legs braced |
| haul rope | yes | hand over hand, torso lean back, slow pull then reset |
| hammer | yes | wind-up, swing, impact pause 2 frames, recoil; hits the target |
| sit, dig, fish, wave | sit loop, dig/fish loops, wave once | |
Authoring: procedural keyframes in python (sines on bones with contact rules) are repeatable but risk looking mechanical; CC0 libraries (section 3) give better motion and are retargeted onto our rig by bone name. Mixed plan: retarget walk, idle, carry from a CC0 library, hand-key the work clips (row, haul, hammer, fish) with a reference of how people really do it (watch real footage on the owner machine, not in this job).
Foot contact and weight (rules, PLAUSIBLE): the stance foot does not slide (speed of foot on ground equals zero while planted; move the root at the speed the feet imply); the pelvis lowest at the double-support point; heel strike then roll to toe; carrying a load shifts the pelvis opposite to it. Check by drawing a trail of the foot in a test and looking for slide. Loading cost: an animated glTF clip of 50 bones at 30 keys per second for 1 s is a few KB, so 10 clips are under 100 KB (PLAUSIBLE estimate, TUNING); the mesh, not the animation, is the load.

## 3. CC0 and open bases (no downloads made; each needs the owner's yes)
All licence statements below come from search snippets, not from the pack pages (those hosts were blocked). Re-read each licence on the original page before download.
| Source | What | Licence (as found) | Public repo? | Size | Style fit | Notes |
|---|---|---|---|---|---|---|
| Quaternius Universal Animation Library 1 | 120+ animations, one humanoid rig, retargetable | CC0, free standard tier on itch.io, paid tiers add more and .blend (VERIFIED in snippets: OpenGameArt and itch) | yes if CC0 confirmed | tens of MB (UNVERIFIED) | animation only, no art style | best candidate for walk, idle, carry; includes a rig we could copy |
| Quaternius Universal Animation Library 2 (Jan 2026) | 130+ clips: combat, parkour, farming | CC0, part free (sources differ on how much) | yes | UNVERIFIED | animation only | farming clips (dig, hoe) may help; skip combat |
| Quaternius Universal Base Characters | base humanoids | itch listing exists; licence not read (UNVERIFIED, Quaternius packs are usually CC0) | maybe, after reading | UNVERIFIED | low-poly stylised | could be a body base, but we want our own proportions |
| Kenney Animated Characters 1, 2, 3 | rigged blocky figures with 3 clips (idle, run, jump) | CC0 (VERIFIED in snippets) | yes | small | blocky, too simple (like our style 1) | not recommended |
| KayKit Adventurers + Character Animations | 4 rigged characters, 75 animations; 133 humanoid animations (Rig_Medium, Rig_Large) | CC0, no attribution (VERIFIED in snippets); asks not to resell unmodified copies | yes | UNVERIFIED | chunky stylised fantasy; heroic proportions | animations include idle, walk, run; author warns they suit KayKit rigs best |
| MakeHuman 1.1.x | parametric human, export base mesh, rig, clothes | search snippets: all OUTPUT data is CC0 (1.1.1 changelog); source is AGPL; older exception applied only to official unmodified builds; the 2020 change put targets, proxies and base mesh under CC0; Wikipedia still shows the older wording (partly UNVERIFIED) | exports likely fine; read the current legal page and keep a note | app is a desktop download (UNVERIFIED size) | realistic, tends to the uncanny; needs retopo and restyling | good as a proportion check or a body base after restyle |
| Mixamo (Adobe) | huge motion library and auto-rigged characters | Adobe: royalty free for personal and commercial use; cannot redistribute raw character and animation files (VERIFIED as an Adobe staff forum post of 2022; current terms not read) | NO: a public repo would distribute the files | | various | avoid, as the brief says; baked-into-game use is allowed but raw files in the repo are not |
| Blender Studio characters (Rain, Snow, Sprite Fright etc.) | production rigs, high quality | CC-BY (credit required, "Blender Foundation"); some need older Blender (3.6 for Sprite Fright) (VERIFIED in snippets) | yes with credit | tens to hundreds of MB, heavy rigs | cartoon feature-film style; far above our budget | study reference for rig and shape, not for export |
| OpenGameArt CC0 and CC-BY packs | many, mixed quality | per pack; CC0 fine, CC-BY needs credit, GPL and CC-BY-SA need care | check each | small | mixed | search only on request |
Licence cost for a PUBLIC repo: CC0 costs nothing; CC-BY costs a credit line in a CREDITS file and in the game; CC-BY-SA and GPL are avoided; anything that says "do not redistribute the files" (Mixamo) is out. Never copy a pack into the repo until the owner says yes and we have saved the licence text beside it (as `LICENSE-source.txt`).
What the owner would be saying yes to: (1) one download of a CC0 animation pack (a few tens of MB), kept out of the repo except the licence and a manifest, used only to retarget a handful of clips; (2) nothing else yet. Our own bodies, clothes and faces are made by script, so they are ours.
Recommendation: build our own body and clothes (proportions, tone, no rights worry), borrow only animation from a CC0 library (Quaternius UAL 1 or KayKit), and hand-key the work clips. Ask the owner for the single yes.

## 4. Levels of detail and crowds
| LOD | Tris | Bones | Texture | Used when | Conf. |
|---|---|---|---|---|---|
| LOD0 hero | about 8k | 45 to 60 | 2048 atlas (normal, colour, ORM) | selected or camera very close, up to about 5 to 20 on screen | TUNING |
| LOD1 | about 3k | 25 to 30 | 1024 | camp view, up to about 30 to 50 | TUNING |
| LOD2 | about 1k | 12 to 15 or baked frames | 512 | far, medium crowd | TUNING |
| Impostor | 2 | 0 | flipbook atlas | overview 25 to 60 px, crowds | TUNING |
Impostors: render the finished GLB in Blender (Cycles or Eevee-like settings, same sun, transparent) in 8 or 16 facings with a few animation frames (walk 6 to 8 frames, idle 2), packed in an atlas. Cost estimate from our own note: 4 characters x 8 facings x 6 frames = 192 cells, about 4 to 5 MB uncompressed (VERIFIED, PEOPLE_OPTIONS.md); at 64 x 96 px per cell with 16 facings the atlas is 1024 to 2048 wide. Because they come from the same GLB, impostors match the hero look (the problem of style 4 today is a painted look that does not match). Use cylindrical billboards, alpha test, and a baked drop shadow.
Crowd counts per tier (our tier ladder in MODES, all TUNING, no device tested):
| Tier | Triangle budget (whole scene) | People LOD0 / LOD1 / LOD2 / impostor | Notes |
|---|---|---|---|
| T1 desktop | big | 20 / 60 / 100 / 200+ | skinned meshes ok |
| T2 iPad / iPhone Pro (150k tris, 60 calls) | 150k | 8 / 25 / 40 / 100 | people share about 25 to 30k tris |
| T3 low handheld (90k, 40 calls) | 90k | 2 / 10 / 20 / 60 | |
| AR (low handheld budget, people 8 mm) | | 0 hero by default; 10 to 20 impostors or exaggerated LOD2 | hero only on tap |
Instancing in r128: `InstancedMesh` exists but a skinned mesh cannot be instanced out of the box (VERIFIED in forum results: "instanced mesh worked for simple meshes but didn't work with skinned meshes"); separate SkinnedMesh with an AnimationMixer each costs CPU, and a forum test found frames dropping after about 200 skinned meshes (PropertyMixer and action updates) (VERIFIED as a report, desktop). Our measure for style 6 was 0.9 ms per frame for 200 rigid-part people on desktop CPU (VERIFIED, PEOPLE_OPTIONS.md), but that is not a skinned figure.
Cheap alternatives:
1. Share clips and mixers: one mixer per archetype and time-offset, clone poses (all identical, looks cloned unless offset); cheapest code, mid cost.
2. Vertex animation textures (VAT): bake each frame of each clip as vertex positions in a texture; one `InstancedMesh` with a custom shader samples it by time and instance offset; 1 draw call for the crowd, near zero CPU. Cost: a 1k-vertex LOD2 with 30 frames is about 1k x 30 pixels, tiny (PLAUSIBLE). Normal animation textures for bone matrices (the GPU Gems approach; 50 bones x 30 keys is about 6,000 pixels per clip, VERIFIED in search results, from Unity's note). Needs float or half-float textures (iPad supports half-float, PLAUSIBLE; check at load).
3. Impostor flipbook for far crowds (above).
Rule: hero and LOD1 are skinned meshes (few), LOD2 uses VAT instanced, far crowd uses impostors. Build the VAT path only after the pilot proves the look.

## 5. How they look in the light
| Need | Method | Conf. |
|---|---|---|
| Match Blender "bright" look | same tone curve as the land (BAKE_BRIDGE.md: Filmic-like curve), same sun and hemisphere, baked AO in the character's AO channel, slightly lifted shadows (do not let the underside go black) | PLAUSIBLE |
| Rim light | a fresnel rim from the sun side only (shader add of `pow(1 - n.v, 3)` times the sun colour times a small factor); strongest at low sun | TUNING |
| Contact shadow | dark soft blob under each foot and under the body (alpha disc, 0.5 m, opacity 0.35 to 0.5) on top of the real shadow map; on impostors a baked ellipse | TUNING |
| Wet look in rain | drop roughness by 0.25 to 0.35 and darken base colour by 10 to 20 percent on oilskin and canvas, add a faint specular streak on shoulders; wool darkens more (about 20 to 30 percent) and loses sheen | PLAUSIBLE (wet cloth darkens), numbers TUNING |
| Cold breath | owner said no; skip | |
| Golden hour | warm key on the sun side, cool fill from sky; cloth colours shift: yellow oilskin goes orange-gold, navy goes teal-purple at the shadow edge; keep one accent saturated | PLAUSIBLE (see SKY_CLOCK.md section on sunset colour) |
| Fire and lantern at night | point light 1500 to 2300 K (SKY_CLOCK.md section 8, VERIFIED in our note), warm wash on the fire side of the face and jumper, cool shadow side, add warm ambient bounce from the ground so the face is not harsh; flicker with the flame; light the eyes (the catchlight picks up the flame) | PLAUSIBLE |
| Night | lantern-carrying people get a small point light (cap lights on screen; each dynamic light costs fragment time on iPad, keep 1 to 3) | TUNING |
| Tiny characters in AR | exaggerate size 2 to 3 times (MODES section 2.2: people are 4.5 to 8 mm), bolder silhouette (wider hat, coat, tool), each person has ONE saturated accent (scarf, cap, bucket), always show a contact shadow on the real table (ShadowMaterial) | TUNING |

## 6. Content direction
Setting: island settlers after a collapse (EVOLUTION_TREE.md: hopeful, with quiet stakes; people counted, never tracked). The settlers' own words (names, lines) stay untouched where used; clothing names are art labels only.
### 6.1 What the old world shows in what people wear (design observation)
Practical clothes mix two layers. Traditional layers: wool (jumpers, socks, caps), oilskin and waxed cotton, leather boots, canvas aprons and smocks. Old-world leftovers: fleece, synthetic waterproofs, hi-vis scraps, trainers, rubber boots, a torn rain shell. The old world shows in colour (sun-faded neon, plastic zips and cords where nothing else is plastic), in repair (a wool patch on a waterproof, a hi-vis strip sewn on as a mark of role), and in mismatch (fleece under oilskin). The honest rule: no clean new clothes; everything is mended. Over eras (EVOLUTION_TREE.md), early settlers show more salvage; later villages show more handmade wool and cloth, with salvage kept for pride (era 6 Remembering). No real brands, logos or readable text on clothes; patches are plain shapes.
### 6.2 Archetypes (design list, TUNING)
| Archetype | Clothing | Tool | Accent colour |
|---|---|---|---|
| Net mender / fisher | oilskin smock, wool cap, wellingtons | net, creel | faded orange |
| Boat crew / rower | wool jumper, salvaged life vest as vest | oars, rope coil | hi-vis yellow |
| Builder | canvas apron, thick trousers, leather gloves | mallet, saw | rust |
| Gardener / crofter | wool jumper, scarf, boots, old fleece | spade, basket | green scarf |
| Cook / water carrier | apron, headscarf, wool socks | bucket, pot | white and red |
| Skipper / elder | long oilskin coat, flat cap, beard or white hair | spyglass, lantern | dark with a brass detail |
| Child | oversize jumper, rolled trousers, salvaged trainers | basket, a shell | blue |
Diversity: ages (children, adults, elders), body types (slim, broad, short, tall, round), skin tones from a broad palette (the survivors are a mix), hair textures and styles, some with a limp or a walking stick, glasses (simple). Expressions gentle (calm, tired, smile). Roles are not tied to skin tone, age or sex by the seed (a check in the seed table: choose clothing by role, body by random draw).
### 6.3 Tools per role (props, each 100 to 400 tris, baked wear)
net (with weights), creel (basket on back), mallet, bucket (with a rope handle), rope coil, spade, basket, lantern (with a flame light), oar, hammer, spyglass. Each prop sits in a socket (hand grip bone) with a known grip; use the asset contract sockets (see section 7).

## 7. Pilot plan: one hero settler end to end
Goal: prove the look before building a cast. Target: the woman with a bucket and the skipper are the two worst in style 6, so build ONE of them, the skipper in oilskin coat (strong silhouette, good folds, an old face).
| Step | Work | Output | Est. time (TUNING) |
|---|---|---|---|
| 1 | parametric body script (7.2 heads, male elder, stoop) | high and low base | 1 day |
| 2 | clothes: coat (cloth sim in rest pose), jumper, trousers, boots, cap, scarf | high mesh with folds | 1 to 2 days |
| 3 | hair/beard clumps, face with eyes, brow and catchlight, hands | head and hands | 1 day |
| 4 | bake normal, AO, curvature; PBR materials with weave and wear | 2048 atlas | 1 day |
| 5 | rig, skin weights, retarget idle and walk from a CC0 pack, hand-key spyglass and one work clip | 3 clips | 1 to 2 days |
| 6 | LOD0 8k, LOD1 3k, LOD2 1k, impostor strip (16 facings, walk frames) | GLBs and a PNG atlas | 1 day |
| 7 | export through the asset contract: `blender/` scripts, manifest, run through the assets-branch verifier (class `hero` needs a socket: define a hand grip socket honestly) | verified GLBs | 0.5 day |
| 8 | copy of `people_options.html`: style 6 next to the pilot at three distances, same light | screenshots and report | 1 day |
Score card (each 0 to 5; the pilot passes at 4 or more on each and total 20 or more of 25):
| Test | Pass looks like |
|---|---|
| Silhouette read at 40 px | 8 of 10 testers (or the owner plus a blind check by us) name the role and the tool from a silhouette alone |
| Face read at 400 px | the expression (calm / tired / pleased) is named correctly; the eyes read as living |
| Animation | no foot slide (trail test), weight visible, no clip pops; 3 clips loop cleanly |
| Triangles | LOD0 at most 8k, LOD1 at most 3k, LOD2 at most 1k, bones at most 60 |
| Load time | GLB set under 1.5 MB for LOD0 plus clips, parse under 100 ms desktop (not tested on iPad) |
What would make the pilot fail: the face lands in the uncanny valley (then simplify, enlarge the eyes, drop detail); the cloth-sim folds look like crumpled paper at 400 px; the bake has seams; the skin look is shiny plastic; the walk slides; the figure looks darker or flatter than the land in the live light; texture size over the budget; the owner still sees "a sticker on a landscape".
Split with a ChatGPT-made spec pack (the owner's idea): ChatGPT can propose concept sheets (turnarounds, palette cards), garment pattern drawings, weave and wear texture ideas, and prop lists; our checker (the asset verifier, plus a script that checks triangles, bones, UV overlap, texel density, palette against our table) decides what is accepted; only Blender work by us makes the final mesh. RIGHTS (UNVERIFIED, must be checked before use): output of an image generator may not be ours to own or may carry the vendor's terms, and in some places purely machine-made images have weak copyright; use it as reference only, never copy pixels into the game, and keep a log of which prompts and which tool produced what. Textures and patterns in the game are made by our scripts.

## 8. Common mistakes and a visual checklist
| Mistake | Check |
|---|---|
| huge heads and hands without reason | head 1/7 to 1/7.5 height (children 1/6); hand about the size of the face |
| stiff A-pose animation | pelvis moves, shoulders counter-rotate, no arm held out |
| floating feet | contact shadow present; foot trail has no slide |
| shiny plastic skin | skin roughness at least 0.7; no specular blob on the forehead |
| uniform clones | seed gives height, colour, build, hat, tool; check 10 people for 10 different silhouettes |
| tiny faces with detail nobody sees | detail only where 2 px of it is visible at the view |
| normal map seams | seams under arms and inner legs; check at 600 px |
| too many bones for mobile | at most 60 (hero), 30 (LOD1); at most 4 influences per vertex |
| no impostors | overview shot with 60 people stays within budget |
| clothes without thickness | collar, cuff and hem 8 to 25 mm |
| every person the same blue | one accent per person; 5 to 8 palette families |
| light mismatch with the land | put the person in the Blender hero render next to the tent; do they match in exposure and warmth? |
| realistic face on a cartoon body (or reverse) | whole figure obeys one style |
Visual checklist (tick before showing the owner): silhouette at 40 px; face at 400 px; shadow under feet; cloth visibly cloth (wool is not oilskin); hands readable; one accent colour; wear (patch, stain) present; walk without slide; matches the land in the light; no brand or text; diverse cast.

## 9. What is faked and what only a real device can answer
Faked: cloth folds are baked in rest pose and do not move; clothing secondary motion is a few bones; skin has no subsurface (a rim and warm ramp stand in); eyes are painted spheres; crowd animation is shared clips or VAT; impostors are pre-rendered; contact shadow is a blob; AR scale is exaggerated; faces are generic (people are counted, never tracked).
Only a real device or the owner can answer: skinned-mesh frame time on the iPad and phone; whether float or half-float textures are available for VAT; bone uniform limits on old phones; the real look in the live light and tone curve; how the face reads at arm's length; whether the owner likes the style; AR legibility of an 8 mm person on a table.
Could not verify: every licence on its original page (hosts blocked); pack sizes; MakeHuman current legal text; Mixamo current terms; Blender cloth sim and glTF export of a rigged character in OUR environment (not run); cloth bake times; the 2022 Adobe forum post as current; uncanny valley source (textbook, not fetched); anthropometric numbers (standard craft values, not re-read from a table); any triangle, time or fps estimate marked TUNING.
Sources (searched, snippets only): OpenGameArt and itch.io pages for Quaternius Universal Animation Library 1 and 2 and Universal Base Characters; Kay Lousberg KayKit pages (itch.io, OpenGameArt, Godot asset library); Kenney Animated Characters pages (OpenGameArt, itch.io); MakeHuman legal and 2020 licence FAQ pages and the 1.1.1 changelog (via search); Adobe community forum Mixamo licensing thread; Blender Studio character pages (CC-BY); three.js forum threads on instanced skinned meshes, bone limits and skinned crowds; GPU Gems 3 chapter 2 and the Unity animation-instancing write-up (via search).
