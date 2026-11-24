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
