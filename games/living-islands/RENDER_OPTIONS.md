# Render options sheet

Page: `render_options.html?mode=1..6` (copy of `islands_look.html`, which is untouched). Same seed (1122), same camp close-up camera, same tide (+0.05 m). Modes 1 to 4 use the same sun (24 deg, azimuth -132); mode 5 and 6 deliberately change it. Shots: `shots/opt-1.png` to `opt-6.png` (1200 x 800, caption strip stamped in the image). Rebuild them with `NODE_PATH=$(npm root -g) node tests/options-shots.js`, check with `tests/options-test.js`.

## Look and cost

All numbers below were measured in headless Chromium on SwiftShader at 1200 x 800, quality high. Triangles and draw calls come from `renderer.info` over a whole frame (shadow pass and post pass included). Taps are texture reads per fragment, counted from the shader source. Nothing here was run on an iPad.

| # | Mode | What it looks like | Scene tris | Frame tris (incl. shadow pass) | Draw calls | Taps per fragment (land / water / post) | Load-time work | Est. iPad / AR cost vs mode 1 (my estimate, not measured) |
|---|------|--------------------|-----------|-------------------------------|-----------|------------------------------------------|----------------|-----------------------------------------------------------|
| 1 | Current | Baseline. Real shadows, warm sun, tilt-shift. Good depth, the sea sparkle and shadows are the strongest part. Ground reads a little muddy in shade. | 88.8k | 176k | 37 | 9 grain + about 9 PCF shadow / about 28 / 22 on blurred rows | none | 100% |
| 2 | Painterly | Cheerful, flat and graphic. AO halos and toon bands read clearly. Colour is too yellow and sand blows out. Blob shadows are soft and weak, so objects feel less grounded than with real shadows. No blur, so it looks bigger and less like a toy table. | 90.7k (+1.9k blob shadow tris) | 90k | 25 | 9 grain + 0 shadow / about 28 / 1 | about 100 ms CPU (AO) | about 55 to 65%: no shadow pass, no blur |
| 3 | Baked-style land | Closest to mode 1 but softer and calmer. Tent and tree shadows are soft, wrapped and a little cool. Live shadows only on the people and boat. Static shadows cannot move with the sun. | 88.8k | 92k | 35 | 9 grain + about 9 PCF (could be dropped on far land) / about 28 / 22 | about 200 ms CPU (AO plus 30-step sun march per vertex) | about 65 to 70%: shadow pass shrinks to the movers; land lighting maths removed |
| 4 | Image-based sky | Softer, bluer shade, less orange. Water and wet rock pick up sky colour; shaded sides stop going muddy. Subtle next to mode 1, no big wow. | 88.8k | 176k | 37 | as mode 1 (SH9 and sky are maths only, 0 extra taps) / about 28 / 22 | 1024 sky samples for SH9, under 5 ms | about 100 to 105% |
| 5 | Time of day | Golden hour: the most mood for the least work. Long shadows, glowing sand, cool shade. Inset row proves dawn, noon and dusk all work with no rebuild. A white donut of sun glare shows on the water at top left. | 88.8k | 176k | 37 | as mode 1 | none (live) | 100%, but needs a shadow map that follows the sun |
| 6 | Best mix | Mode 3's baked land with mode 2's painted AO and height tint, mode 4's SH9 sky and water reflections, mode 5's low golden sun, light tilt-shift. Warmest and most finished of the six. Still slightly orange. | 88.8k | 92k | 35 | as mode 3 | about 150 to 210 ms CPU | about 65 to 70% |

Software-GL ms per frame is not reported: the box was shared and loaded, the numbers were noise and are not a proxy for a GPU.

## What carries into AR

- **Keep (modes 3 and 6):** baked static light on a table-top island is the cheapest honest way to get soft contact shadows and AO. It halves the frame triangles because the 2048 shadow map only has to draw people and boats.
- **SH9 (mode 4):** the sky lighting is nine vec3 coefficients, exactly what WebXR light estimation and ARKit hand back. In AR, feed the device's SH9 into the same uniform and the island takes the room's light. A baked sun does not do that.
- **Drop in AR:** tilt-shift (the real camera already has depth), and the sea sparkle toward the sun (looks wrong against a real room).
- **Needs a decision:** baked shadows fix the sun direction. For AR, either bake once toward the real sun estimate at placement, or keep mode 5's live shadows and pay the full shadow pass at 1024.
- **Mode 2 as the low tier:** cheapest, and runs on the weakest tablets, but it is the least like the current look.

## Honest weaknesses

- Mode 2 and 6 height tint and saturation are tuned by eye on one camera. Other islands (pine rock, harbour) were not re-checked.
- Baked modes use a 512 x 512 height grid for shadows (0.39 m cells), so tree shadows are blobby, and trees self-shadow a little.
- Blue tent turns teal under warm baked light in modes 3 and 6.
- Mode 4's gain over mode 1 is small; it earns its place for AR, not for this still.
- The sun glare donut in mode 5 is an existing sea-shader artefact, not fixed.
- Painted and baked colours are written into the same colour attribute, so changing quality (low) re-bakes at load; tide-dependent wetness stays live.
