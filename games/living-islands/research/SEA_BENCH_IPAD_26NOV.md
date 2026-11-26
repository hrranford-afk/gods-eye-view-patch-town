# Sea bench, iPad (owner's run, 26 Nov, Safari, Apple GPU, WebGL2)

Source: the Copy report text from sea_proto, pasted by the owner. 834 x 1062 css px, device pixel ratio 2. The GPU timer extension is not available in this browser, so GPU ms reads 0.00 (a sampled finish(), rough): the frame times are the only real numbers.

| Axis | Last good rung (frame avg, 5 frames over 33 ms stops it) | Notes |
|---|---|---|
| Sea mesh | 2M triangles, 16.7 ms avg | 1M had a single 49 ms spike |
| Waves | 96 | 16.7 ms avg all rungs |
| Spray | 400k points | 16.7 ms |
| Debris | 100k points | 16.7 ms |
| Islands | on | 16.7 ms |
| Render scale | 1.5x ok (16.7), 2x 24.1 ms, 3x 48.2 ms (OVER) | scale is on css pixels: 2x = native resolution here |
| Everything up | 97.4 ms, OVER | ran at 2x scale with 2M triangles, 96 waves |

## CAIRN reading
1. 16.7 ms average means the page is locked to 60 Hz, so it hides how much headroom is left; the real limit on this iPad is fill rate (pixels), not triangles, waves, spray or debris, which all stayed at 60 fps up to the top rungs.
2. The 'everything up' rung is confounded: it also used 2x scale, which alone costs 24 ms. It does not show the combined geometry limit. Next bench version: add a combined rung at 1x, and a combined rung at 1.5x, and a vsync-free estimate (render the rung twice per frame to expose the margin).
3. The sea alone can afford far more than the 150k triangle iPad scene budget allows, because that budget is shared with the island and the game. Pick the iPad sea from the whole-scene budget, not from this report.
