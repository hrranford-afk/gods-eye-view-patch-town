# Macro sea part 2: wiring macro_sea.js into the page (?macro=1)
Code: `islands_look.html` (block "macro sea wiring", object `MC`), `weather.js` (one optional hook, `opt.atFn`), library `macro_sea.js` (unchanged). Tests: `tests/macro-wire-test.js` (48 checks), pictures by `tests/macro-wire-render.js`. Research gate: `research/SEA_STATE_AND_OUTER_WORLD.md` (RESEARCH_FIRST.md: note exists, numbers tagged, faked list below). Tags: VERIFIED / PLAUSIBLE / UNVERIFIED as in the note, TUNING = a game starting value chosen here, not a measurement.

## 1 Switch and what it does not touch
`?macro=1` loads `macro_sea.js` and turns the page's sea into the macro sea. It implies the sea=2 look (like `?flow=1` does). Without the switch nothing changes: default hash `8d962c0c`, 88,790 triangles, no `__li.macro` (tested). With the switch the world hash and the triangle count are also unchanged (the wiring adds no geometry); the full stack landing + flow + seabed + weather + boats=2 + macro is 148,151 triangles, under the 150k budget (the same stack without macro is the same count; the headroom is thin because of the existing passes, not because of this one). `?boats=2` (c36cf53) still works alone and combined.
Other switches added: `mh` start game hour (default 6), `mt` freeze the macro clock at that many real seconds after `mh` (shots, tests), `mspeed` game speed (default 1 = 20 real seconds per game hour, SKY_CLOCK.md), `mgain` shader slope gain (default 1.5, TUNING). `weather=auto` is needed for the weather part (macro alone does not load weather.js).

## 2 What is wired
| # | Part | How | Where it lives |
|---|---|---|---|
| 1 | Sea shader | The sea=2 and flow shaders get `msSeaH` (the GLSL already parity-tested against JS and the real shader) with the 8 components from `seaComponents`, window 200 m (the table). A gradient from two extra taps is added to the normal, so swell and wind sea tilt the glitter and sky reflection; crest whitecaps use the Monahan fraction W as coverage (a score of crest height and wind-stretched noise against a threshold that follows W); wave amplitude comes from the macro Hs per train (honest metres, `hExag` 1); swell direction from each train's `dirFrom`; the wind direction for the old short chop follows the macro wind. | `msPatch` (inserted before the weather patch, anchors kept so both work), uniforms `uMsA`, `uMsB`, `uMsC` |
| 2 | Tide | Tide height = `macro.tide.level` (game metres, clamped to the slider range) until the slider, the Auto button, `?tide=` or `__li.setTide` is used; then the old logic takes over. | `frame()`, `MC.tideTouched` |
| 3 | Flow | The drift nudge `macro.drift` (current + 3 percent of the wind, VERIFIED 3 percent) plus wind setup pushing along the wind (0.6 m/s per metre of setup, TUNING) is added to the flow field in open water and masked by land like the rest; the flow time follows the macro tide on its rising or falling branch and is unwrapped by whole cycles, so the flotsam sim never runs backwards at low water and flood and ebb match the real tide. | `flowRaw`, `flowTime`, `MC.nx/nz`, `MC.flowT` |
| 4 | Weather | `weather.js` gets `opt.atFn`; with `?macro=1&weather=auto` it returns parameters built from the macro: the macro's own fair, clear, overcast or rain, blended into `storm` by the storm index (`k = smoothstep((index - 0.3) / 0.4)`, so a vortex 'passing' means index above about 0.3 to 0.7), wind speed and direction from the macro. Without the switch weather.js runs its own Markov schedule exactly as before (tested). | `mcWeather`, `weather.js` target() |
| 5 | Boats | Under `?boats=2&macro=1` moored and sailing boats get heave from `seaH` at the hull centre and pitch and roll from the bow-stern and port-starboard height differences, soft-capped: heave 0.25 m (`0.25 tanh(h / 0.8)`), tilt 0.12 rad. Beached boats are untouched. The height uses the shader's own arrays (`seaHGlslPort`). | `mcBoat`, `animate()` |
| 6 | Phase accumulators | Each of the 8 components has its own phase: `phi_seed - integral(w dt)`. The game hour is itself an accumulator (`hour += dt * speed / 20`). Speed changes only the hour, never a phase; the state is smoothed (1.5 s) so a train changing period or direction does not make the crests jump. With a frozen clock the phase is `phi - w T`, so shots repeat exactly. | `mcUpdate`, `MC.ph` |

## 3 Numbers (seed 135, strong storms; measured by the test or the render script)
| Quantity | Calm day (hour 6) | Storm approach (hour 30) | Tag |
|---|---|---|---|
| Wind | 5.0 m/s | 20.5 m/s (storm index 0.78) | macro output, PLAUSIBLE |
| Sea Hs (rss) | 0.86 m | 5.49 m | PLAUSIBLE (growth laws from memory) |
| Whitecap fraction (Monahan) | 0.0009 | 0.115 | VERIFIED formula, cap TUNING, above 20 m/s outside fitted data |
| Sum of the 8 component amplitudes | 1.14 m | 4.68 m | PLAUSIBLE |
| Flow nudge | 0.28 m/s | 0.72 m/s | TUNING |
| Weather state | fair | storm | design |
| Boat heave, tilt | soft cap 0.25 m, 0.12 rad (storm saturates) | | TUNING |
Shader slope gain 1.5 on the displayed gradient and the 200 m window with log-mapped wavelengths (swell 120 to 130 m, wind sea 60 to 120 m displayed against 20 to 260 m honest) are diorama exaggerations, TUNING. Whole frame cost of the macro state: 0.5 ms per call in node, called every 0.1 s.
Pictures (seed 135, same camera, frozen clocks): `shots/macro-wire-1-before-calm.png`, `macro-wire-2-after-calm.png`, `macro-wire-3-before-storm.png`, `macro-wire-4-after-storm.png`. The 'before' storm is the old fixed storm state; the 'after' one is the macro state at hour 30 with weather read from it. The calm day looks almost the same as before on purpose (swell slopes 0.01 to 0.03 against chop slopes about 0.1), the difference is the storm: broad foam on the swell crests, tilted sky reflection, wind direction from the macro.

## 4 Fast low outruns its swell (caveat, from MACRO_SEA.md section 8 item 1)
Swell travels at 0.78 T m/s (14 s: 39 km/h) and a low moves at 10 to 25 m/s (36 to 90 km/h). The note's '38 hours of warning' holds only for a slow or stalled storm. For seeded storms (10 to 25 m/s) a fast low can arrive with little or no swell warning, or even before its own swell: the macro test finds 17 h of warning for a 10 m/s low and minus 7.5 h for a 20 m/s one. In the game this means the sea does not always 'announce' a storm; the page shows what the function says. A deepening or stalling low, which would restore the warning, is not built.

## 5 What is still faked or missing (ranked)
1. The sea is a flat plane lit with a swell normal: no vertex displacement, so the swell does not move the shoreline or hide boats behind crests; boats heave against a flat visual surface (hence the small cap). Real displacement would need a mesh with enough triangles (budget 150k, now 148k in the full stack).
2. Tide amplitude is the game's range: macro level is clamped to plus or minus 1.1 m and the surge is not added to the water level (only to drift), so a surge never floods the shore.
3. No island refraction or wave shadow, no surf zone or breaking on shoals, no wave-current interaction (macro tide stream does not scale the flow stream either: `tide.stream` is read only for the flood and ebb direction).
4. Train identity can flicker when two trains swap order by period (smoothed over 1.5 s but a new swell entering still pops in); small trains sort by period.
5. Weather: the macro's state names are reduced to the eight weather.js sets, so fog, showers and golden hour do not appear from the macro; the weather chip still cycles states by hand and stops the macro schedule as before. The macro hour and weather.js's own hour counter are separate (weather's `wh`, `wsec` do not apply under macro).
6. Foam streaks (8 m/s) and spray (15 m/s) from the macro are not drawn on the sea=2 shader (only whitecaps); `sailOk` is not shown anywhere yet; keyed arrivals are not placed in the world.
7. Refraction map: not built (stretch).
8. Cost on an iPad is not measured: 8 components x 3 taps of `msSeaH` per pixel, plus the existing shader; software GL cannot say.
9. Flotsam leeway still uses the page's fixed wind vector, not the macro wind.
10. Shader slope gain and the whitecap threshold curve were tuned by eye on seed 135 only.

## 6 Notes on the tests
`tests/macro-wire-test.js` reads time from frozen clocks (`?mt=`, `?seat=`) for every determinism check, so no check depends on wall time. `tests/boats-test.js` 'boat kinds and positions unchanged' compared sailing-boat positions across two page loads (they follow the page clock, so the result depended on how long each load took); it now compares kind and flag for sailing boats and positions for the fixed ones (hashStatic idea).
