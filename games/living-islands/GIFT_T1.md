# GIFT T1: page picture fixes (T1a) and later items

One line per item.

1. THE CREAM SHAPE (fixed): it was a gull (flat 2 m quad, MeshBasic) drawn a few metres from the zoomed-in camera; physical.js hid near gulls but islands_look.html reset `visible` every frame, so at render time gulls as near as 4 m were still drawn (369 bad draws in 54 frames, found by hooking onBeforeRender). Now the page's own gull loop hides any gull within 60 m on gift pages only (default page untouched, hash 8d962c0c, 88,790 triangles); test `tests/t1a-test.js` section 1 (render-time layer check plus pixel check).
