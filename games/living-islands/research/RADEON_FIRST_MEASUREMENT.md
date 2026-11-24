# Radeon VII: first real measurement (24 Nov)

Source: the owner pasted the ultra bench panel report from Chrome on the Radeon VII machine. No other data. One run, one window size.

| Item | Value |
|---|---|
| Preset | device=radeon, tier ultra |
| GPU line | AMD Radeon VII (discrete), so Chrome picked the right card |
| Window | 1360x680 css px, dpr 1.00, canvas 1360x680 |
| Render target | 2125x1063 (scale 1.563, dynamic range 1.00 to 2.00) |
| MSAA / shadow map / aniso | 8 / 4096 / 16 |
| Triangles, draw calls | 236,374 / 202 |
| Frames | 547 in 10 s, 58.3 fps average |
| Frame ms | 17.15 average, 17.50 p95, 100.0 worst (one frame) |
| GPU timer | 11.02 ms per frame |
| Verdict | near the limit |

## Reading (honest)
1. Smooth at about 60 fps (vsync), p95 17.5 ms.
2. GPU used about 11 of 16.7 ms: about two thirds of the 60 fps budget.
3. Dynamic resolution settled at 1.56 and stayed there; it trades pixels for frame time, so it will use most of what is offered. Low 'percent used' is not wasted power.
4. Ultra adds sharpness (MSAA, 4096 shadows, bigger target), not new content detail. Detail has to come from content: more pieces, richer scatter, aftermath debris.
5. Caveats: small window; at full-screen 1080p the pixel count roughly doubles, and at 4K far more. The 100 ms frame is probably a render-target remake on a scale change (known gap).
6. The 11 ms GPU time is from the GPU timer query, so it is measured, not sampled.

## Next measurements wanted
- Same benchmark full-screen on the 1080p desk TV.
- Same on the 4K lounge TV with the TV 4K profile.
- The aftermath debris sweep when it lands.

## Second report: iPad running the radeon preset (24 Nov, owner paste)
Not a Radeon number. Preset device=radeon (tier ultra) opened on an iPad.

| Item | Value |
|---|---|
| GPU line | Apple GPU (integrated) |
| Screen | 834x1062 css px, dpr 2.00, real pixels 1668x2124 |
| Render target | 1043x1328 (scale 0.625, dynamic range 0.60 to 1.00), msaa 4, shadow 2048 |
| Triangles, draw calls | 338,014 / 305 |
| Frames | 286 in 10 s, 28.6 fps average |
| Frame ms | 35.02 average, 41.00 p95, 48.0 worst |
| GPU time | 1.35 ms (sampled finish: untrustworthy, the iPad has no timer query) |
| Verdict | too heavy: lower the scale |
| Page notes | built-in chip: scale limited to 1.25; 4 samples |

Reading: the page protected itself by dropping scale to 0.625, but the radeon preset is far too heavy for a tablet. Fix to do: when device=radeon or desktop is chosen on a built-in or mobile GPU, step down to the ipad preset and say so on screen. Wanted next: the same bench with device=ipad (link in the play page) for the real iPad number.

## Third report: iPad on its own preset (24 Nov, owner paste)
Preset device=ipad, tier low, bench=1.

| Item | Value |
|---|---|
| GPU line | Apple GPU (integrated) |
| Screen | 834x1062 css px, dpr 2.00, real pixels 1668x2124; canvas 834x1062 (stretched 2x, so softer) |
| Settings | scale 1.0 fixed, msaa 4, shadow 1024, aniso 4 |
| Triangles, draw calls | 153,747 / 163 |
| Frames | 447 in 10 s, 58.9 fps average |
| Frame ms | 16.98 average, 20.00 p95, 100.0 worst (one hitch) |
| GPU time | 1.01 ms (sampled finish, not trusted on iPad) |
| Verdict | near the limit |

Reading: the ipad preset holds about 60 fps (vsync cap) on this iPad, double the radeon preset on the same iPad (28.6 fps). The camp scene with kit pieces is about 154k triangles and 163 draw calls, so the iPad budget is nearly used: the first day, robots, wildlife and people must stay within it or be tiered. The picture is stretched 2x (canvas 834x1062 on a 1668x2124 screen): soft, same cause as the 4K softness. One 100 ms frame in 447 is probably a load hitch.
Budget rule for builders: iPad (device=ipad) has to stay near 150k triangles and 160 draw calls for the camp view; anything added needs an AR/iPad tier that costs nothing, or a switch.
