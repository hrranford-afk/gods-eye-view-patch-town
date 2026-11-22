# Sea pass (`islands_look.html?sea=2`)

URL switch that replaces the sea look. Works with `?pass=landing` and with the default scene. With `?sea` absent nothing changes (default hash `8d962c0c`, 88,790 triangles; the old sea shader is untouched). Extra params: `seat=<seconds>` freezes the sea clock (tests and shots), `seadbg=1|2|3` switches whitecaps / glitter / both off (debug).

Shots: `shots/sea-wide.png` (`?pass=landing&sea=2`, the approved landing view), `shots/sea-close.png` (low view, glitter side). Regenerate with `node tests/sea-render.js`. Test: `tests/sea-test.js`.

## What changed (only in the new fragment shader `SEA2_FS`, plus a few lines of wiring)
- Normals, all derivative-free: 3 swell trains plus 5 ripple trains (High: 8) with sharp crests and analytic slope, fanned around one wind direction (0.45, -0.89) from about 35 degrees to 85 degrees off it; the small ones cross the wind so it does not look combed. Each train fades out by its own wavelength against the pixel footprint (`dist * uPix`), so it cannot alias. A smooth domain warp (two taps) keeps the trains from lining up; wind-stretched chop from 3 taps of the existing noise map (mip-mapping averages it away at range). No visible tile.
- Colour: depth/absorption ramp from dark navy (deep) to a slightly greener mid blue; fresnel mix with a dark blue sky; faint teal sub-surface tint on crests; slow gust patches change the tone by about +/-15%.
- Sun glitter: specular of the rippled normal (two sharp lobes) plus per-cell facet jitter that grows with distance (stands in for the lost small ripples), intensity capped, near-white. It sits on the sun side only. For `sea=2` + landing the sun defaults to elevation 32, azimuth 172 (in front, slightly right) so glints are in view; `?sun=&az=` still override. The default landing sun (50 / -38) puts the glitter off screen.
- Whitecaps: sparse, from steep fine crests and wind-stretched streak noise inside gust patches; far away they are replaced by a faint bright tint.
- Shore: shallow colour only within roughly 0.04 to 0.2 m of depth, edge modulated by noise; alpha rises fast so there is no broad cyan halo. Foam is a thin broken line (about 0.05 to 0.15 m band, noise-masked). Lee slicks: 3 taps of the height map upwind (3, 7, 13 m): land upwind cuts ripple amplitude by up to 60% and darkens the reflection.
- Tide and wakes are the same as before; the Low path drops to 5 ripple trains, no chop textures, 2 lee taps, no wake loop, lower warp.

## Cost
High, per water pixel: texture taps = 1 height + 3 lee + 2 warp + 1 gust + 3 chop + 2 noise (colour/foam) + 2 foam/cap + 7 terrain shadow = about 21 (old sea: about 22 with its 12-tap shadow loop). 8 sin + 8 exp for ripples + 3 swell/ripples share; 24-iteration wake loop unchanged. Low: about 12 taps, 5 trains. Triangles unchanged (landing 124,477). Estimate on an iPad (A12 and up, 1.5x pixel ratio, the sea covers most of the screen): about 1.5 to 2 ms of fragment work at High, comparable to the old sea; not measured (software GL only). If it is too heavy, drop the 3 chop taps and the two fine trains first.

## Still mismatches the reference (ranked, honest)
1. Chop character: ours is still slightly combed / dash-like (ripples are long, parallel-ish, with short white dashes); the reference is isotropic, irregular, with many tiny cap flecks of mixed size and thin foam streaks over the whole sea. Needs a real pixel-scale break-up layer (needs a bespoke noise texture, not the current one).
2. Glitter: sparse and fixed to a region at the right/lower right, white; the reference has a wide dense field of tiny bright glints in the sun's half of the table, and the sea there also looks lighter.
3. Mid sea is a touch darker and less blue than the reference (about 21,70,105 against 25,85,127 by pixel average) and has less large-scale light/dark variation (swell bands).
4. Foam around rocks is thin and broken now, but the rocks themselves (flat-shaded low poly) still read as props; reference foam also splashes up the rocks, ours only rings the waterline.
5. Lee slicks are visible but weak; the reference has calm patches behind islands that are clearer.
6. Shallows: teal band is thin and uneven, but uniform in hue; the reference shows lighter green sand patches in the shallows between islets.
7. Sun azimuth had to move for the glitter to show, which changes the whole scene's shadows (longer, toward the camera) under `sea=2`.
