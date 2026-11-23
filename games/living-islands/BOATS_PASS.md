Do not put real place names into game code, assets or recipes.

# BOATS PASS: dry, slim, lapstrake boats behind ?boats=2

Status: procedural live version. The Blender GLB boat kit comes later and plugs in at the same seam (see the last section). Absent `?boats=2` the page is byte-for-byte the old boats (hash 8d962c0c, 88,790 triangles).

## The owner's report and the cause

"The boats look full of water and drive around with nobody in them." The second half is a design decision that is still open (crew or unmanned), so no crew and no relic boats were added. The first half had two causes, found by turning things off one at a time:

1. The sea is one transparent plane at the tide height (renderOrder 5, depthWrite false). The old hull was a thin open shell whose inner floor sits below that plane, so the plane was drawn across the whole interior.
2. The boat material is the shore ("land") shader, which paints swash foam lace, wet darkening and underwater caustics on any surface near the tide height in WORLD height. The floor of a dry hull is at that height, so even with the sea gone the inside looked foamy. That is why the white lace in the "before" shots is inside the hull.

## What ?boats=2 does

One builder, `hullV2(b)` in islands_look.html, replaces `boatGeo` and `rowboatGeo` for every boat kind (moored, sailing, beached, landing-pass boat). Positions, yaw, bob and the harbour layout are untouched.

| Item | What was done |
|---|---|
| Hull mask | A depth-only lid mesh per boat (child of the hull mesh), see below. |
| Proportions | Beam is clamped so that length to beam is at least 3.25 (was 2.5 to 2.6). Measured on the geometry including rake and rubbing strake: 3.25 to 3.29. Sheer rise 8.5 percent of L at the bow and 6 percent at the stern. Pointed, raked stem (about 20 degrees) and a small raked transom (0.4 of the beam at the gunwale). Keel line rises toward the ends, so draft is 0.18 m amidships and less at the ends. |
| Lapped planks | 5 strakes per side (3 on Low). Each strake is its own strip whose lower edge stands 16 mm proud of the strake below, with a dark downward-facing step quad at every lap and a darkened band on the upper 20 percent of each plank (the shadow under the lap above). The lap is geometry, not a texture. |
| Dry inside | Inner skin 22 mm inside the outer skin, steamed-rib quads, 3 thwarts with knees, breasthook, transom board, gunwale cap, a rubbing strake, loose floorboards (3 slats, small gaps) over a dark bilge, and one small dark wet stain at the low point (7 triangles). No level of water anywhere. |
| Boot-top line | A horizontal pale band at the waterline (5 cm tall at WL 0.18 m local), separate from the planks so it follows the water and not the sheer. Below it the vertex colour fades to a dark red-brown antifoul. |
| Contact shadow | A flat ring mesh on the water (soft, alpha falls from 1 at the hull to 0 at 0.5 m, renderOrder 6, depthTest on so the hull and mask cover it, hidden while a beached boat is on land). About 75 triangles per boat. |
| Oars | A pair per boat, shipped along the thwarts at slightly different angles and blade ends: length max(2.1 m, 2.25 x beam) so at least 2 x beam (3.2 m on the 4.4 m boat), 0.7 m blades, a leather collar. |
| Wear | Seeded per boat (from b.seed, or from the boat's position): smooth value-noise blotches in vertex colours, faded paint (mix to grey), bare silver wood on the lower strakes and at the bow, tar patches, a tarred garboard, a worn keel strip, rubbing strake with scuff variation, per-rib and per-thwart colour variation, one thwart skewed a degree or two. No textures. The existing grain texture still modulates the colours. |
| Land shader | For boats only: uWet is 0 (no swash foam or wet darkening) and the underwater caustics branch is off. This is applied in `buildBoats` under ?boats=2. |
| Quality | Low path: 8 stations, 3 strakes, no shadow band, fewer ribs, no knees, no rubbing strake. |

## The mask: what was chosen and why

The sea writes no depth and is in the transparent pass, so it is already depth TESTED against everything opaque; it only needs something opaque that is nearer than the sea plane across the hull interior, without hiding the interior. Drawing the mask BEFORE the hull would hide the floor (the lid is nearer than the floor), so the order is:

1. Hull and everything else opaque (renderOrder 0) write colour and depth.
2. Mask lid (renderOrder 1, still the opaque pass): `colorWrite:false, depthWrite:true, depthTest:true`. Where it is nearer than what is already there it overwrites the depth, leaving the colour of the dry floor.
3. Sea (renderOrder 5, transparent): at every pixel inside the hull the lid is nearer than the sea plane, so the sea fragment is rejected by the depth test.
4. Contact ring (renderOrder 6) is rejected inside the hull the same way.

The lid is a strip of quads closing the opening just under the inwale, built from the inner shell rim (2 x stations + 2 triangles, 28 on High). It sits 0.3 to 0.4 m above the water, so it cannot hide any water outside the hull; the walls cover every other line of sight. A stencil would need a stencil buffer on the post render target and a second pass; the depth lid needs neither. It works unchanged in the post path (the render target has a depth buffer; the lid lives in the same pass), with `?post=0`, with `?sea=2`, `?flow=1`, `?seabed=1` and `?weather=` (those only change the sea fragment shader). It does not read depth back and has no screen-space term, so it is safe in AR.

Proof, top-down close-up of a moored boat, same camera: with the mask the floor is dry; with the debug switch `?nomask=1` (debug only) the sea sheet shows through between the walls. The test measures this with a pixel probe (see Tests).

Shots (shots/, 1200 wide, same camera for each before and after pair):

- boats-before-closeup.png / boats-after-closeup.png: moored boat at the jetty
- boats-before-beached.png / boats-after-beached.png: the beached boat at the camp
- boats-before-wide.png / boats-after-wide.png: harbour view
- boats-before-sailing.png / boats-after-sailing.png: the sailing boat

(The before shots are rendered by the same tests/boats-render.js script with `tag=before`.)

## Cost

| | Triangles | Draw calls |
|---|---|---|
| Old boat | 304 each (1,058 for the landing-pass rowboat) | 1 each |
| New boat, High | about 1,450 hull + 28 mask + about 75 ring | 3 each (hull, mask, ring) |
| New boat, Low | about 800 | 3 each |
| Default page, ?boats=2 | 92,432 (88,790 default) | +6 for 3 boats |
| Full stack landing+flow+seabed+weather=fair, ?boats=2 | 148,095 (145,199 without) | |

The full stack stays under 150,000 by 1,905 triangles. Nothing else was reduced: the margin held without it. If a heavier weather state or a fourth boat pushes it over, the first things to cut under ?boats=2 are the rib quads (about 140 per boat) and the knees (about 24 per boat), then the rubbing strake.

## Remaining gaps, ranked

1. The hull is faceted. 12 stations and flat quads read as a polygonal hull from above; a Blender hull will be smooth. Normals are flat per quad, so there is no smooth shading across strakes.
2. Nothing sits in the boats and the sailing boat has no sail or mast: it drives round empty. Left alone on purpose (crew or unmanned is not decided).
3. The sea is dark and nearly opaque, so the lower hull below the waterline is mostly hidden. The boot-top line reads best on the white boat in sun and barely on the red one; the hull gives no sense of volume under the surface.
4. The contact shadow is subtle on dark water (correct physically, easy to miss). There is no bow wave or stern curl on the moored boats, and the ring is flat while the hull rolls.
5. Plank butts (joints along the length), rivet heads and nail stains are missing; wear is smooth noise, so it looks like a clean game boat with dirt rather than a worked one. Laps read in close-up and at mid range, and vanish beyond about 40 m (as they should).
6. The oars lie straight and parallel; no rowlocks or thole pins are visible, no painter, bailer or fenders.
7. One boat shape for every kind. The landing-pass work boat, the skiffs and the camp boat differ only in size, colour and wear. No yole, no transom variants, no cuddy.
8. The wet stain reads as a dark patch, not a puddle (no gloss, no reflection).
9. The mask is a lid at gunwale height, so a boat that is genuinely swamped or half sunk cannot use it. A wreck would need the mask dropped or removed per boat (a `swamped` flag on the spec would do).

## How crew and the Blender GLB boat kit plug in

Crew: people sit at the thwart positions (local x of `thw` in hullV2: u = -0.5, -0.06, 0.46 of XH, y = thwart top, which is `top(u) - 0.19 + 0.016`). The builder already shapes the interior for seated figures (floor 0.1 m, thwart 0.19 m below the gunwale). Seated people are opaque, drawn at renderOrder 0 before the mask, so they are not hidden. If crew are children of the hull mesh they inherit bob, roll and pitch with no change. The oars would move from "shipped" to "in the rowlocks" with one flag; the rowlock positions are the place where the `thw[1]` thwart meets the rubbing strake. For the unmanned option (autonomous craft from BOATS.md section 6) the builder is simply not used for that kind; its own hull would still add a mask lid if it has an open top, and a closed catamaran needs none.

Blender GLB kit: the seam is the `if(BOATS2)` branch in `buildBoats`, which needs three things per boat: a hull mesh, a depth-only mask mesh and a ring. The GLB should export the hull plus a node named `hullmask` (the inner-shell opening closed at the inwale, a single quad strip; BOATS.md already describes this as "built from the inner shell"). Load it, give the hull the same landMat with uWet 0 and the caustics off, give the `hullmask` node the same material as `mk` here (colorWrite false, renderOrder 1), add the node as a child, and keep `makeRing` as is (or move it into the kit). Draft, freeboard, waterline height and the boot-top band are then baked into the GLB; the code keeps only per-boat colour variation (use vertex colours or one palette texture and the existing seed). The live builder stays as the Low path and the fallback while the GLB is loading.

## Tests

`tests/boats-test.js` (run alone; the machine also runs a Blender job): default hash 8d962c0c and 88,790 triangles with no mask meshes; ?boats=2 with 0 console errors in the default scene, landing, `post=0`, `sea=2`, `flow=1`, `seabed=1`, `weather=fair`, Low, and the full stack; a mask mesh on every boat with the right material state and render order (after the hull, before the sea); positions unchanged; length to beam at least 3 on the geometry; Low has fewer triangles than High; the full stack is under 150k; a pixel probe: 40 points on the floor of a top-down moored boat, none within 24 per channel of the sea colour (taken beside the boat) with the mask, and 10 of 40 match without it (`?nomask=1` control).

Shots are made with `tests/boats-render.js` (never `tests/shoot.js` main). `?nomask=1` and `?boats=2` are the only new URL switches; `__li.boats()`, `__li.maskInfo()`, `__li.boatBeam()` and `__li.boatProject()` are new, read-only test hooks.
