# Macro sea (pilot plan parts 1 and 3)
Code: `macro_sea.js` (UMD, no dependencies, `window.MacroSea` or `globalThis.MacroSea`; this folder is `"type":"module"` so node uses `import` then reads the global, and a CommonJS context gets `module.exports`). View: `macro_sea_view.html`. Tests: `tests/macro-sea-test.js` (48 checks). Shots: `shots/macro-timeline-1.png` (seed 1122, start day 335), `macro-timeline-2.png` (seed 135, strong storms), `macro-seaslice.png`. Render script: `tests/macro-sea-render.js`. Research: `research/SEA_STATE_AND_OUTER_WORLD.md` (tags VERIFIED / PLAUSIBLE / UNVERIFIED; TUNING = game starting value, flagged in the code with comments).

## 1 Idea
The table is a window (0.5 to 2 km) on an ocean thousands of km wide. `macro(seed, hour)` is a pure function: no stored state, any hour in any order, same answer (tested on 60 random hours in two orders and against a second module instance). Storms, swell, tide, surge, drift and arrivals all come in from outside.

Architecture: game clock -> `macro(seed, hour)` -> window forcing (smoothed uniforms) -> local response (sea shader, flow field, boats, flotsam, shore).
Clock: 1 game hour = 20 real seconds, 8 real minutes per game day (SKY_CLOCK.md); constants `HOUR_REAL_SECONDS`, `DAY_REAL_SECONDS`, `gameHourFromReal(sec, startHour)`. Game hour 0 is a new moon; `opts.doy0` (default 290) sets the season.

## 2 What macro returns
`wind {u, v, speed, dirFrom, x, z, gust, beaufort}` (u east, v north, blowing to; x east, z SOUTH for the page), `pressure`, `swell[1..3] {Hs, T, L, cg, steep, dirFrom, dirTo, source, distKm, arrival {tEmit, tPeak, etaPeak, peakT, state}}` (longest period first), `windSea {Hs, T, L, dirFrom}`, `seaHs` (root sum of squares), `seaHsEff`, `tide {h, level, stream, spring, phase}`, `moon`, `surge` (real m), `surgeGame`, `level` (tide plus surge, game m), `current`, `drift` (current plus 3 percent wind), `whitecap`, `foamStreaks` (8 m/s), `spray` (15 m/s) and smooth `streakAmt` / `sprayAmt`, `rain`, `rainMm`, `visibility`, `storm {index, id, phase}`, `weatherState` (one of the weather.js names), `sailOk {skiff, sail, gig, decked, row, work}`, `arrivals` (events of the current game hour), and `compat {windMs, angle, hs, tp, beaufort, rain, vis, storm, surge, sailOk, name}` shaped like weather.js `at()`. Also `macroSeries(seed, h0, h1, step)`, `macroDump(...)` (compact JSON columns), `arrivals(seed, h0, h1)`.

## 3 Equations, sources, confidence
| Part | Equation | Tag |
|---|---|---|
| Deep water | L = g T^2 / 2 pi = 1.56 T^2, c = 1.56 T, cg = 0.78 T | VERIFIED textbook (Munk 1963) |
| Swell arrival | t = 4 pi D / (g T): 14 s from 1500 km 38.1 h; T(t) = 4 pi D / (g t): 16, 14, 12 s at 33.4, 38.1, 44.5 h | VERIFIED relation |
| Swell packet | each storm emits every 3 h from 36 h before to 24 h after its deepest moment; Hs0 and T0 from fetch and duration (JONSWAP-style `Hs = 0.0016 U^2/g sqrt(x)`, `Tp = U x^0.33 / (3.5 g)`, duration `68.8 x^(2/3) U/g`), decay `sqrt(R0/D) exp(-D/8000 km)`, forward directional factor, fade-in between 250 and 950 km; at the window the arriving energy follows a two-sided log-normal in f with f = g (t - te) / (4 pi D) | PLAUSIBLE (growth laws from memory), shape and widths TUNING |
| Trains | packets merge when direction is within 15 deg and period within 2 s; more than three systems merge the closest pair; two quiet-weather background swells always exist, so two to three systems at any time; no swell above 20 s | design, TUNING |
| Steepness | Hs/L capped at 1/7 (state) | VERIFIED limit |
| Wind sea | `Hs_eq = min(0.0213 U^2, 0.0016 U sqrt(F/g))`, F 400 km, relaxed with a 4 h kernel over the wind history (direction 2 h); `Tp = 5 sqrt(Hs)` (steepness 0.026) | PLAUSIBLE; F and tau TUNING |
| Pierson-Moskowitz | Hs = 0.21 U^2 / g (8.6 m at 20 m/s) | PLAUSIBLE |
| Storm | Holland `V = Vmax sqrt((Rm/r)^B exp(1 - (Rm/r)^B))`, `p(r) = pc + dp exp(-(Rm/r)^B)`, `Vmax = 0.8 sqrt(B dp / (e rho))`, 20 deg inflow, translation adds on the right, taper `exp(-(r/4Rm)^2)`; west to east at 10 to 25 m/s, one slot per 48 h with probability 0.30 to 0.65 by season (gap 3 to 7 days), dp 8 to 55 hPa, Rm 150 to 400 km | Holland form VERIFIED, extratropical 0.8 and taper TUNING |
| Fronts (low passing north) | back about 14 deg ahead of the warm front, +10 at it, +22 at the cold front, 18 percent squall, rain before the warm front, drizzle in the sector, burst at the cold front, showers after; low passing south: backs through east to north, no warm sector | CLOUD_ATLAS sequence PLAUSIBLE; angles TUNING |
| Tide | M2 1.40, S2 0.50, N2 0.28, K1 0.07, O1 0.06 m, speeds 28.984, 30.000, 28.440, 15.041, 13.943 deg/h, lunitidal 5.5 h, springs 36 h after new and full moon, equinox and perigee boosts 4 and 3 percent; `level = clamp(h/2.2, -1, 1) * 1.1` | periods VERIFIED, amplitudes and phases TUNING |
| Surge | 1 cm per hPa below 1013 (960 hPa gives 0.53 m) plus wind setup `7e-4 u^2` (coast faces west); game surge is halved like the tide | VERIFIED (inverse barometer), setup TUNING |
| Whitecaps | `W = 3.84e-6 U^3.41`, capped at 0.25 (1.0 percent at 10 m/s, 3.9 at 15) | VERIFIED (Monahan 1980), cap TUNING |
| Boats | skiff Hs 0.6 m / 8 m/s, sail 1.0 / 10.8, gig 1.2 / 12, decked 2.25 / 17.2; effective Hs weights swell by `clamp((16 - T)/10, 0.2, 1)` so gentle long swell does not strand small boats | TUNING (no source) |

## 4 Sea height function
`seaH(x, z, t, state)` is the sum of up to 8 components (three swell trains and the wind sea, two each so groups appear), each a second-order Stokes wave `a cos(th) + k a^2/2 cos(2 th)`, `th = k d.p - w t + phi`. GLSL: `SEA_GLSL` (`msSeaH(vec2 p, float t)`, uniforms `uMsA[8]` dir.x, dir.z, k, omega and `uMsB[8]` amplitude, phase; `seaUniforms(comps)` fills them). `seaHGlslPort` is the line-for-line JS mirror.

Diorama scale (an exaggeration, on purpose): honest L (6 to 900 m) maps by a monotone log curve onto window/6 .. window, so 1 to 6 crests show in any window of 0.5 to 2 km and the long swell stays longer than the wind sea. The state keeps honest L, T, Hs; each component records `Lhonest`, `L`, `exag`. Typical: long swell x1.2 to x1.4, wind sea x6 to x9. Displayed phase speed is `sqrt(g k)` for the displayed L. Amplitude is `hExag * Hs / 2` (default honest), limited to displayed H/L under 0.11. Phases are seeded per component; a renderer should integrate phase per component (accumulate `w dt`) if k or w change smoothly, otherwise waves slide when the state drifts.

Parity: JS against the JS port at 1000 random points, worst 0 (1e-5 required). Real shader: headless Chromium, software GL (SwiftShader), WebGL1, 16 x 16 render to texture. The float readback path worked (worst 2.5e-4 m of a 1.5 m signal, tolerance 2e-3, float32 against float64); the RGBA8 packed path (`pack=1`) also works and gives the same worst error (tolerance 0.01, the "2 decimals" bar).

## 5 Keyed arrivals
One slot per game hour per kind. An event exists with probability `1 - exp(-rate)`; rates come from the macro state at the middle of the slot (wrack and drift logs with Hs and onshore wind, shoals in calm settled weather, bird flights at dawn and dusk below F6, boats by day below 13 m/s, wrecks after storms). Key `seed:kind:index`, index = slot, so the same call gives the same key and a save that keeps the keys never doubles an event. Each event carries class, size, bearing it arrives from (up-drift for floating things), hour.

## 6 How it replaces weather.js and drives the game
weather.js keeps its Markov schedule as a fallback. To replace it: call `macro(seed, hour)` where `LI_WEATHER.at(seed, hour)` is called and use `state.compat` (same names: windMs, angle, hs, tp, beaufort, rain, vis, storm, surge, sailOk row/sail/work, name). Not wired in this job; no existing file was edited.
- Sea shader (SEA2_FS): add `uSwell[3]` (dir, k, amp, phase speed) from `seaComponents`, drive whitecap gain with `whitecap` and `streakAmt`, spray with `sprayAmt`, chop with the existing `(U/6.5)^1.1`; keep the four local trains as wind chop.
- Flow field: tide stream scaled by `tide.stream` (slack at high and low water), plus `current` and 3 percent of the wind.
- Boats: pitch and roll from `seaH` gradients at bow and stern; `sailOk` per class.
- Flotsam: `arrivals()` keyed events landing along the strandline at `level`.
- Tide and surge: `level` (game metres) replaces the slider in auto mode.

## 7 Not modelled yet
Island refraction and shadow maps (the sea slice strip says so), spray particles, breaking on shoals and the surf zone, wave-current interaction, swell phase continuity (needs per-component accumulators), real wave groups from a spectrum, sea temperature and fronts, cloud mapping beyond eight names.

## 8 Honest findings and ranked gaps
1. Lead time: a fast low outruns its swell. For a 10 m/s low whose swell source is 1500 km away and that passes 500 km north the long swell (Hs 0.5 m) arrives 17 h before the wind reaches 10 m/s (test needs 12); the same low at 20 m/s gives minus 7.5 h. The owner's "38 h early" holds for slow or stalled storms. Seeded storms are 10 to 25 m/s, so many storms give less warning than the note; deepening storms far out and stalling lows would help (not built).
2. Train identity flickers: sorting by period and merging by closeness still makes small trains swap places and show spikes in the per-train charts (visible in the timeline when a new swell enters). Totals are smooth.
3. Swell packet constants, decay law, 0.8 extratropical factor, front angles, boat limits, surge setup and tide amplitudes are TUNING, unvalidated against data; Holland extratropical use is a stretch.
4. Typical weekly maxima over 200 seeds (mid October): wind 8, 16, 25 m/s and Hs 1.7, 4.9, 8.9 m at the 10th, 50th, 90th percentile; calm seeds can show a whole quiet week (seed 1122 at day 290).
5. The tide clamps at +-1.1 m at big springs (sum can reach 2.5 m against 2.2); the stream follows dh/dt (PLAUSIBLE).
6. Not measured on an iPad: GLSL cost of 8 components, how the displayed wavelengths read on a 1 m table.
