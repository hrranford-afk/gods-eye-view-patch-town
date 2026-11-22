# Landing pass (`islands_look.html?pass=landing`)

One focused in-engine pass. Lighting comparisons paused. The default scene is untouched (same world hash `8d962c0c`, same 88,790 triangles, `look-test.js` 7 of 7).

Shots: `shots/landing-wide.png` (whole archipelago, raised oblique view from the south-east corner) and `shots/landing-zoom.png` (same landing after `__li.zoomLanding()`). Regenerate with `node tests/landing-render.js`. Test: `tests/landing-test.js`.

## What changed (all gated by `?pass=landing`)
- Camera: `HOME` is a raised oblique corner view; home island lower centre, wooded conifer island upper left, rock skerry right, open sea between. `__li.zoomLanding()` flies to the landing; `__li.landing()` returns its position.
- Lighting: plain daylight, sun 50 degrees, near-white, neutral sky; tilt-shift blur off (`uTilt=0`), vignette cut to 0.14, exposure 0.88. `?post=0` AR path untouched.
- One landing on the home island's south-east shore: instanced shingle (1,000 pebbles, one draw call, darkened when wet by the tide uniform), terrain shingle tint, uneven rock outcrops either side, a clear sea approach with no rocks in it.
- Clinker rowing boat (`rowboatGeo`): strakes with worn paint over bare wood, ribs, thwarts, transom, keel, rowlocks, two oars; stern in the shallows, bow up the shingle, heeled so the painted side shows. Follows the tide as before.
- Settlers: the style 6 builder from `people_options.html` is copied unchanged into `settlerKit()` (local scope) and baked to one mesh each; muted wool/linen clothes. One stands by the boat, one by the fire.
- Camp: off-white weathered canvas ridge tent (panelled, sagged, hem dirt, open front, poles, 6 guy ropes and pegs), barrel, crates, net, fire ring with a small flame and a thin pale smoke wisp.
- Ground: olive moss not lime, heather patches, more grey rock, scrub, small tufts, a few spruce, stones. Harbour roofs and boats muted.
- Water: darker blue palette, finer chop, thinner and more broken foam, foam exposure raised on the rocky shores (boulder clusters in the water) and cut to about 10% at the landing so it is calm and clear.

## Still mismatches the reference (ranked)
1. Surface realism: rocks, trees and grass are flat-shaded low-poly blobs; the reference has natural lichened boulders, tussock and scrub. Biggest gap.
2. Sea: smooth cobalt with a cyan halo and big soft foam skirts; reference is dark, finely rippled, with glitter.
3. Overall saturation and contrast: ours is brighter and greener; the reference is darker and more muted.
4. Island shapes and mix: reference has small islets and a heather rock island; ours has the harbour island cut at the left edge and no tiny islets.
5. People are 1.7 m figures, only readable when zoomed; the boat is about 40 px in the wide shot.
6. Table: a round wood rim, not a rectangular corner.

Match: camera angle and framing, the landing place being findable from the wide view (pale shingle strip with the boat, tent and smoke) and recognisable on zoom.

## Cost (high quality, software GL, so no fps claim)
- Triangles: 124,477 total (default scene 88,790); the pass adds about 35,700. Budget 150k.
- Of that: pebbles 1,000 x 20 = 20,000; prop mesh 47,585 (default 36,882); each settler a few thousand; boat about 1,000.
- Draw calls: about 28 scene meshes (default about 30): the new ones are pebbles (1), rowing boat (1), settlers (2) and the camp props merge into the existing prop mesh; the three old camp figures (9 meshes) are gone. `renderer.info` reads 1 call because of the post pass, so this is a count by construction, not measured.
- Build time about 0.8 s.
