Do not put real place names into game code, assets or recipes.
# Sediment physics for sandbars, spits, tombolos, flats and beaches (research note)
Status: research note for Living Islands (branch citylab/cloud-islands), 23 Nov 2026. Companion to `GEOLOGY_AND_LANDFORMS.md`, `FLOW_TYPES.md`, `SEABED_AND_ISLAND_LAYOUT.md`, `FLOW_PASS.md`, `SEABED_PASS.md`. It replaces the "sand links do not move" limit in SEABED_PASS (item 8) with a small cheap sediment model.
Method and limits: web SEARCH extracts only (no page was opened in full; en.wikipedia.org not used). Search results often gave the right paper but not the number, so many numbers are standard coastal-engineering values from my own knowledge, plus my own arithmetic (marked "my arithmetic"). Tags: VERIFIED (seen in a named search extract), PLAUSIBLE (standard textbook value, not re-checked here), UNVERIFIED (my guess or TUNING for the game).
Units: SI. Rescale to game metres by ONE constant, as in SEABED_AND_ISLAND_LAYOUT. `rho` 1025 kg/m3 sea water, `rho_s` 2650 quartz, `s` = rho_s/rho = 2.585, `p` = 0.4 bed porosity, `g` 9.81.

## 0 The model in one paragraph
Water moves grains when bed shear stress beats a threshold. Grains travel with the current (tide, waves' longshore current). Where the flow slows or spreads, grains drop (bars, deltas, lee spits). Where it speeds up or is squeezed, grains lift (scour, channels). Bed height changes by the divergence of the grain flux (Exner). Gravity slumps steep slopes (angle of repose). Wind moves dry sand above the tide. The player's walls, jetties and dredging change the flow or the supply, so the bed answers.

## 1 Sediment basics
Grain classes (diameter d; Wentworth-type bands, VERIFIED as the standard scale; used by every textbook).
| Class | d (mm) | Fall speed ws (m/s, sea water 10C) | Critical stress tau_cr (Pa) | Critical depth-mean speed u_cr at 1 m depth (m/s) | Sits where | Tag |
|---|---|---|---|---|---|---|
| Mud (silt/clay) | 0.004 to 0.06 | 0.00001 to 0.003 | 0.1 to 0.5 (cohesive; set by consolidation) | 0.2 to 0.4 to erode; settles only when tau < 0.05 to 0.1 | sheltered flats, upper estuary, lee of bars, marsh | PLAUSIBLE |
| Fine sand | 0.125 to 0.25 | 0.01 to 0.03 | 0.13 to 0.20 | 0.22 to 0.27 | most beaches, tidal flats, bars, ebb deltas | PLAUSIBLE; 0.2 mm values are my arithmetic below |
| Coarse sand | 0.5 to 1 | 0.06 to 0.11 | 0.3 to 0.6 | 0.35 to 0.5 | steep reflective beaches, channel floors, exposed bars | PLAUSIBLE |
| Granule/shingle | 2 to 8 | 0.2 to 0.5 | 1.2 to 5.7 | 0.6 to 1.3 | storm ridges, bay heads, short-fetch shores | PLAUSIBLE (my arithmetic) |
| Pebble/cobble | 16 to 64 | 0.6 to 1.2 | 14 to 60 | over 2 | upper steep storm beach; moves only in big storms | PLAUSIBLE (my arithmetic) |
Formulas (Soulsby 1997 set, as given in the Coastal Dynamics text extract for D*; the rest PLAUSIBLE):
- `D* = d * (g (s-1) / nu^2)^(1/3)`, nu = 1.36e-6 m2/s (VERIFIED form: D* = D [g(s-1)/nu^2]^(1/3), Coastal Dynamics extract).
- Settling: `ws = (nu/d) * (sqrt(10.36^2 + 1.049 D*^3) - 10.36)`. For d = 0.2 mm: D* 4.1, ws 0.021 m/s (my arithmetic; PLAUSIBLE).
- Threshold (Shields) parameter: `theta_cr = 0.30/(1 + 1.2 D*) + 0.055 (1 - exp(-0.020 D*))` (PLAUSIBLE; this fit tends to 0.055 for large grains; the textbook constant 0.047 for gravel is VERIFIED only as "commonly used" in the extract, not seen). For 0.2 mm: 0.055.
- `tau_cr = theta_cr * rho * g * (s-1) * d`. For 0.2 mm sand: 0.175 Pa; 2 mm: 1.2 Pa; 16 mm: 14 Pa (my arithmetic).
- Bed shear stress from a current: `tau_c = rho * Cd * |u|^2`, depth-mean `u`, `Cd = (0.4 / (1 + ln(z0/h)))^2` with `z0` = 0.0002 to 0.005 m rippled sand; a fixed `Cd = 0.0025 to 0.004` is fine for a game (PLAUSIBLE). Check: 0.175 Pa needs u = 0.24 m/s at Cd = 0.003 (my arithmetic).
- Bed stress from waves: orbital speed at the bed `u_orb = pi H / (T sinh(k h))`; shallow water `u_orb = 0.5 H sqrt(g/h)`; `tau_w = 0.5 rho f_w u_orb^2`, `f_w = 0.01 to 0.04` (use 0.02, TUNING; PLAUSIBLE).
- Waves plus current (cheap): `tau_mean = tau_c * (1 + 1.2 * (tau_w/(tau_c + tau_w))^3.2)`, `tau_max = sqrt((tau_mean + tau_w cos(phi))^2 + (tau_w sin(phi))^2)`; for a game use `tau = sqrt(tau_c^2 + tau_w^2)` (PLAUSIBLE; the exact blend is Soulsby-Fredsoe, not checked here).
- Mode of transport (Rouse number `P = ws / (0.4 u*)`, `u* = sqrt(tau/rho)`): P over 2.5 bedload only; 0.8 to 2.5 mixed; under 0.8 mostly suspended (PLAUSIBLE standard bands).
- Bedload, Meyer-Peter and Mueller form: `theta = tau / (rho g (s-1) d)`; `q_b = 8 (theta - theta_cr)^1.5 * sqrt((s-1) g d^3)` (m2/s of solid grains; 8 is PLAUSIBLE; this form was recalled, not seen). Example: 0.2 mm, tau 0.5 Pa gives q_b = 2.9e-6 m2/s (my arithmetic).
- Suspended load, game form: `q_s = F_s(P) * q_t_total`, with total load from a power law `q_t = a_t * (tau - tau_cr)^1.5 / (rho g)` and `F_s` rising from 0.1 (P 2.5) to 0.9 (P 0.5) (UNVERIFIED, TUNING). Fine sand in strong stirring is carried; mud is carried until tau falls under its deposition limit.
- Mud rule (Partheniades-Krone style, PLAUSIBLE): erode `E = M (tau/tau_ce - 1)` if tau over tau_ce; deposit `Dp = ws * c * (1 - tau/tau_cd)` if tau under tau_cd (tau_cd about 0.05 to 0.1 Pa). Mud only collects where it is calm: this alone makes salt-marsh edges and lee flats.
- Slope helps or hinders: threshold scales by `tan(phi) / (tan(phi) -/+ tan(beta))` for down/up slope beta (PLAUSIBLE). Use through the slope term in section 2.

Where each sits (rule for the seed): `tau_peak` of the local worst regular condition decides. Strong stress (exposed point, race): rock, pebble, shingle. Moderate: sand. Calm (tau under 0.1 Pa): mud. A single scalar `d50(x,z)` per cell, relaxed toward the "stress picks the grain size" target by a slow rule (sorting), is enough. Wadden-type sand sheets, shell sand (low density, light, travels far): see section 5.

## 2 Bed evolution (Exner) and a stable scheme
Exner equation (VERIFIED as standard; no extract seen): `(1-p) dz/dt + div(q) = 0`, `z` bed height (m), `q` = grain volume flux per metre width (m2/s). Water depth `h = eta - z` with `eta` tide level.
Flux vector (game form): `q = q_mag * ( u_hat - Lambda * grad(z) )`, `u_hat` the unit transport direction (current, plus wave-driven alongshore component), `Lambda` about 1 to 2 (so a slope pushes grains downhill about as strongly as a sideways angle of 25 to 45 degrees; the idea is Struiksma/Bailard-type, PLAUSIBLE; value TUNING). That one term is the slope-dependent diffusion: it stops needles, makes bars round, and grows channels with banks.
Scheme (stable and conservative, simple):
1. Flux on cell FACES, not cell centres. `q_face = upwind(q_mag at the upstream cell) * face_direction`. Upwind keeps bars from sprouting ripples and keeps `z` bounded.
2. Update: `z_new = z - dt/(1-p) * (sum over faces of q_face*dx)/dx^2`. Same face flux leaves one cell and enters the next, so mass is exact (my reasoning; test it).
3. Limit the change: `|dz| <= 0.2 * h` and `<= 0.02 m` per step; if exceeded, cut dt (adaptive) or clamp the flux. Never let a cell go above the water to a free height jump of more than `dx * tan(phi)`.
4. Time step: bed-change speed `c_b ~ 3 q_mag / (h (1-p))` (from `q ~ u^3` and Exner, PLAUSIBLE); need `dt <= 0.5 dx / c_b_max` AND diffusion `dt * Lambda * q_mag / (dx (1-p)) <= 0.25`.
5. Avalanche (angle of repose), after every Exner step, iterate 2 to 4 sweeps: for each face with `|dz|/dx > tan(phi)` move `0.5 * (|dz| - dx tan(phi))` from the high cell to the low cell. Conservative by construction. Repose angles (PLAUSIBLE): dry sand 33 to 34 degrees, wet or submerged sand 28 to 32, shingle 35 to 40 (tan 0.7 to 0.84), mud 5 to 15 (flows). Note: real beaches are far gentler than repose (1:10 to 1:100); repose only caps dunes, scarps and banks. For a grid with big cells use `tan(phi)_eff = min(tan(phi), 0.6 * dx_game_scale factor)` (UNVERIFIED).
6. Wet vs dry: a cell is dry when `z > eta`. Dry cells get no tidal/wave flux, only wind (section 5) and slumping with the dry angle. Swash zone: allow flux up to `eta + run-up` with `R = 0.5 to 1.0 * H` (PLAUSIBLE; TUNING).
Mass checks: (i) closed box: `sum(z) * dx^2` unchanged to 1e-9 relative in float64 (1e-6 in float32); (ii) open edges: `V_end - V_start = - dt * sum(edge flux)/(1-p)` within 1e-6; (iii) never negative depth below rock: clamp `z >= z_rock`, and count what the clamp removes (must be 0 in the test).

## 3 Tidal-current transport: flats, channels, inlet bars, scour
| Idea | What it means | Rule for our grid | Tag |
|---|---|---|---|
| Flood/ebb asymmetry | Whichever of flood and ebb is faster carries more sand, because transport grows like `u^3` or more. Large intertidal area makes ebb stronger; high tide-range/depth makes flood stronger | `net = sum over the cycle of q(u(t))`: `q ~ (tau - tau_cr)^1.5` makes even a 20 percent speed gap give a 60 to 100 percent transport gap (my arithmetic). Tag each channel with its dominance from the sum | VERIFIED qualitatively (Utrecht thesis extract: large intertidal area gives ebb-dominant, high range/depth gives flood-dominant); numbers my arithmetic |
| Ebb-dominated main channel, flood-dominated side channels | A deep inlet channel runs ebb-dominated, ends in a shallow ebb-tidal delta, flanked by two flood channels | Same cycle-sum rule produces it when the existing flow field is fed in | VERIFIED qualitatively (same extract) |
| Delta shoals migrate and weld onshore | Shoals form on the delta, move with waves, attach to the downdrift coast; the cycle is about 50 to 60 years in one real inlet | Needs the wave term (section 4). Game time scale in section 6 | VERIFIED (50 to 60 years, one inlet, extract) |
| Bars form where flow slows | A jet leaving a gap spreads; speed falls; `q` falls along the stream so `div(q) < 0` and sand piles: a lee bar and the delta front | Automatic from the Exner scheme if depth-mean `u = U_flux/h` is used (below) | PLAUSIBLE (standard), my reasoning |
| Scour where flow is squeezed | In a narrow gap and just downstream of it, speed is highest, `div(q) > 0`, bed goes down | Same; the deepest hole is at the throat or just past it | VERIFIED qualitatively in SEABED note (deep hole beside a sill, pilot sources) |
| Sill and scour pair | A sill is a stable shoal in the saddle; the hole is downstream | The self-limit: as a sill shoals, `u = U_flux/h` rises, so its crest erodes; as a hole deepens `u` falls, so it stops. They settle at a balance: this is the rule we want | PLAUSIBLE, my reasoning |
| Tidal flats and creeks | Flats are gently sloping, mud/fine-sand surfaces between low and high water; ebb drains them into branching creeks that deepen where water collects | Flow `u` from drainage: water sheet drains toward the nearest lower cell; creek heads cut backward where `tau > tau_cr`. Flat slope about 1:200 (SEABED note) | PLAUSIBLE |
| Settling lag (why mud goes landward) | Fine grains keep settling after slack; the flood carries them up-estuary beyond where the ebb can fetch them | Mud deposit rule + a short delay: `c` advects one cell per step after stress falls. Simple form: sediment stays suspended for `~ h/ws` seconds | PLAUSIBLE |
Feeding the existing flow field (FLOW_PASS and SEABED_PASS give a depth-free potential flow `u(x,z,T)` plus a 128 grid with `depth`, `spdF`, cross-section width):
- Treat `U_flux(x,z,t) = u_flow * h_ref` as a water discharge per metre (`h_ref` = depth at seed time) and use `u = U_flux / max(h, 0.2)` as the live depth-mean speed. Shoaling then speeds the water, so a bar cannot grow forever, and a hole slows the water so it stops deepening. Cap `u <= 4 m/s` (races, FLOW_TYPES). Water is only on cells with `h > 0`; at dry cells `u = 0`.
- Tide phase `c = cos(2 pi T/55)` (game clock) drives flood/ebb; level `A sin(...)`. Sample a full cycle in 24 steps (about 31 real minutes each) per tide; two cycles for spring/neap if a modulation is in use (FLOW_TYPES).
- A residual drift of 0.05 to 0.3 m/s (FLOW_PASS 0.22) is added to `u`: it sets the net direction of bars even when the tide is symmetric (PLAUSIBLE).

## 4 Wave-driven transport
| Idea | Rule | Tag |
|---|---|---|
| Refraction | Waves slow where `h < L/2`, so they turn toward the contours; at `h < L/20` depth rules the speed (`c = sqrt(g h)`). Direction update: `theta_new = theta + w * angle_to(-grad(h))` for `w = clamp(1 - h/(L/2), 0, 1) * 0.5` (ray bending, TUNING). Snell form exact: `sin(theta)/c = const` along a ray | VERIFIED (DFO paper, quoted in FLOW_TYPES, section 3.7) for the depth limits; Snell PLAUSIBLE |
| Shoaling | `H = H0 * sqrt(c0 / (2 c_g))`, shallow: `H ~ h^(-1/4)` (Green's law) | PLAUSIBLE |
| Diffraction (wave bending into shadows) | March the wave energy `E = H^2` along the wave direction, one column at a time, with a lateral smoothing `nu_n = 0.5 * L / (4 pi)` per metre (parabolic-equation form, my derivation: spread sigma^2 = s L / (2 pi)). For a game raise `nu_n` to `1 to 3 * L / (4 pi)` so shadows soften. Island lee gets 20 to 60 percent of the offshore height, never zero | PLAUSIBLE; constants TUNING |
| Breaker zone | Break when `H > gamma h`, `gamma = 0.78` (0.6 to 0.8); cap `H = gamma h`. Surf-zone width `W = h_b / beta` (beta = bed slope). Existing note uses `h < 1.3 Hs` (same thing) | PLAUSIBLE |
| Longshore transport, CERC (SPM) | `I = K * E_b * c_gb * sin(alpha_b) cos(alpha_b)` (immersed weight rate). In volume: `Q = K * rho * sqrt(g/gamma) / (16 (rho_s - rho)(1-p)) * H_b^2.5 * sin(2 alpha_b)`. With K = 0.39 (Hs basis), gamma 0.78, p 0.4: `Q = 0.09 * H_b^2.5 * sin(2 alpha_b)` m3/s (my arithmetic). Example 1 m, 30 degrees: 0.08 m3/s, 2.5e6 m3/yr, high vs real coasts (typical 1e5 to 1e6): so K is often calibrated lower. Max at 45 degrees; zero for waves parallel to the shore | VERIFIED (K = 0.39 from Komar and Inman 1970; K varies with grain size; calibrated K can be much smaller; double-angle form is the same formula) |
| Simple form for the game | `Q = Kc * H_b^2.5 * sin(2 alpha_b)`, `Kc = 0.02 to 0.09`, tune to give the visible rate you want | UNVERIFIED (TUNING) |
| Grid form of longshore flux | In every cell with `h < h_b`: `alpha_b = angle between wave direction and the local contour`; flux vector `q_ls = Kc H^2.5 sin(2 alpha) / W` along the contour tangent, sign from `sin(alpha)`. Spread over the surf width W so flux per metre; then the Exner scheme handles the rest and gives the one-line result with no extra code | my reasoning; PLAUSIBLE |
| One-line shoreline model | Shoreline position `y(x,t)`; `dy/dt = -(1/D) dQ/dx`, `D = berm height + closure depth`. With small angles `Q = Q0 sin(2 (a0 - dy/dx))` gives a diffusion equation `dy/dt = eps * d2y/dx2`, `eps = 2 Q0 cos(2 a0)/D` (my derivation). Groyne solution (Pelnard-Considere): `y(0,t) = 2 tan(a0) sqrt(eps t / pi)` at the structure; trapped area `= tan(a0) eps t`; fills the groyne length `Lg` at `t_fill = pi Lg^2 / (4 eps tan(a0)^2)` (my arithmetic from the known solution) | VERIFIED (extract: diffusion form `dy/dt = eps d2y/dx2`, groyne analytic solutions by Pelnard-Considere 1956, Larson and Hanson); formula details my derivation |
| Spits | Drift runs straight on where the coast bends away; the sand falls out beyond the bend into deeper, calmer water. Growth speed `dL/dt = Q / (w D)` (volume `L w D`); with Q = 1e5 m3/yr, w 50 m, D 5 m: 400 m/yr (my arithmetic). Hooked tip: waves refract round the end and turn it landward | PLAUSIBLE |
| Cuspate foreland / salient | Waves diffract round a protruding object, converge behind it, sand builds a bump toward it: a salient | VERIFIED qualitatively (tombolo sources) |
| Tombolo criterion | Island or breakwater of length `L` (along the shore), offshore distance `Y`. Observed rule: `L/Y > 1` gives a tombolo, `L/Y < 1` a salient (one tombolo study, VERIFIED as quoted; its case has 1.7). Other thresholds exist: breakwater `L/Y >= 1` (conference paper), a Corps-manual index `Is = exp(1.72 - 0.41 L/Y)` where `Is = 1` is a permanent tombolo (VERIFIED as quoted, "preliminary"), minimal shoreline response for `L/Y < 0.125 to 0.33`; a California range of 3 to 6 is also cited. One study says no length/distance rule alone explains it | VERIFIED that the rule exists and is disputed; the numbers differ by definition |
| Game tombolo rule | Define `Y` from the mean shoreline to the island's near side, `L` the island's shoreline-parallel length, wave direction onshore. `L/Y < 0.5` no bar; `0.5 to 1` salient (partial height); `1 to 2` tombolo grows if sand supply and calm lee exist; `> 2` tombolo likely permanent but low and overwashed by storms (TUNING). Test case (c): island `L = 150 m`, `Y = 100 m` (ratio 1.5: tombolo) vs `Y = 450 m` (ratio 0.33: no bar, a faint shoal at best) | UNVERIFIED (TUNING from the range above); the physics is emergent from diffraction plus supply, so the ratio is a check, not the driver |
| Partial linking | A beach can form behind an island without joining it when sand is short | VERIFIED (JNCC extract, in SEABED note) |
| Barrier islands and rollover | Waves wash over a low barrier, move sand from the front to the back, the island walks landward as the sea level rises or storms hit. Overwash occurs when `eta + run-up > crest height`. Game rule: in overwash, move `10 to 30 percent` of the flux over the crest to the lee side, never lose mass | PLAUSIBLE |
| Cross-shore: storms and calm | Storm waves strip sand from the beach face and put it in an offshore bar; long gentle swell moves it back (winter/summer profile). Rule: `Gamma = H / (ws T)` (Dean number): over about 4 to 5 gives erosion and a bar, under gives accretion (PLAUSIBLE, my recall, not checked) | PLAUSIBLE |
| Equilibrium profile | `h = A x^(2/3)`, `x` distance from the shoreline (VERIFIED, Dean). `A = 0.5 ws^0.44` with `ws` in m/s (VERIFIED as quoted; the source notes it is a secondary citation): 0.2 mm sand (`ws` 0.021) gives A = 0.10 m^(1/3) (my arithmetic); shingle gives 0.2 to 0.4 (PLAUSIBLE). A steeper A is coarser | VERIFIED (form and coefficient, via text extract) |
| Closure depth | Beyond `h_c` the bed stops changing seasonally. Hallermeier `h_c = 2.28 H12 - 68.5 H12^2 / (g T12^2)`; Birkemeier `1.75 H12 - 57.9 H12^2/(g T12^2)`. `H12` the wave height exceeded 12 h/yr. Example H12 3 m, T12 10 s: 6.2 m (my arithmetic) | VERIFIED (both formulas, extract) |
| Cross-shore flux in the grid | Add `q_x = Kx * (h - h_eq(x)) * ...`: easy form is a diffusion toward the equilibrium: `dz/dt = Kd * d/dn( dz/dn - dz_eq/dn )` along the shore normal; storm raises `Kd` and moves the target to a flatter beach with an offshore bar (TUNING) | UNVERIFIED (design) |

## 5 Wind and dunes
- Dry sand moves when wind shear velocity is over a threshold `u*_t = A_b * sqrt((s-1) g d)`, `A_b` about 0.1 (Bagnold) so 0.2 mm sand needs about 0.18 m/s shear, roughly 5 m/s wind at 10 m (my arithmetic; PLAUSIBLE; not checked). Flux grows with `u*^3` above the threshold (Bagnold, PLAUSIBLE): `q_w = Cw * sqrt(d/D0) * (rho_a/g) * (u* - u*_t)^3`-like; in a game use `q_w = Kw * max(0, W - W_t)^3` per metre of dry beach width, with the beach only able to feed it when its surface is dry (`dry_time_fraction`).
- A wet or crusted, shelly or vegetated surface does not move: multiply by `(1 - moisture) * (1 - veg_cover)`.
- Positive sand budget: surplus dry sand is blown inland and trapped by dune grass; the dune grows, then stabilises. Machair is a sand plain made by the normal cycle of dune build and erosion where the beach has a positive budget; the sand is largely shell, with a narrow range of grain sizes, soils alkaline (pH over 7) (VERIFIED, JNCC and Geology Trust extracts). Marram dunes in the example reach recent growth from recycled sand after blowouts (VERIFIED, same extracts).
- Game rules: dune front grows where wind blows onshore, the beach is wide and dry and `veg_cover > 0` (marram trapping coefficient 0.5 to 0.8 of the flux, TUNING). Blowouts: where the cover is broken (path, building, grazing) `q_w` is raised by 2 to 5, a breach opens, sand moves inland as a lobe. Shell sand: light (`s` about 2.4 to 2.5 rather than 2.65), so use a lower `tau_cr` and `u*_t` (PLAUSIBLE).
- Dune scarp: waves cut it in a storm; cut face stands at the dry repose angle until slumped; storm retreat 5 to 30 m in a bad single event on a sandy coast is plausible (PLAUSIBLE; TUNING), recovery over years.

## 6 Timescales and game time compression
| Process | Real time | Tag |
|---|---|---|
| Tide cycle (semi-diurnal) | 12.42 h; spring/neap 14.8 d | PLAUSIBLE |
| Single wave | 5 to 15 s | PLAUSIBLE |
| Storm | 1 to 3 days; beach strip in hours | PLAUSIBLE |
| Beach recovery after a storm | weeks to months (summer swell) | PLAUSIBLE |
| Summer/winter profile cycle | 1 year | PLAUSIBLE |
| Sand wave/bar migration at an inlet | days to years | UNVERIFIED |
| Spit growth (hundreds of metres) | years to decades | PLAUSIBLE; my arithmetic above |
| Ebb-delta shoal cycle | 50 to 60 years (one inlet) | VERIFIED (extract) |
| Barrier rollover, tombolo formation | decades to centuries | PLAUSIBLE |
| Dune build | years to centuries | PLAUSIBLE |
Existing game clock: one tide = 55 s of play (FLOW_PASS), so one tide is already 813 times faster than real (12.42 h = 44,712 s). A 30 min play session is about 33 tides = 16 real days of tides: not enough to see a spit.
Defensible compression (the coastal-modelling "morphological acceleration factor", PLAUSIBLE from the literature, not checked here):
1. Compute the flux over one real-time-shaped tide (24 steps), then multiply the bed change by `f_m` when updating: `z += f_m * dz`. Keep `f_m * |dz|` under the limits in section 2. Typical `f_m` 10 to 100 in real models; a game can use `f_m = 20 to 200` with tuning.
2. With tide 55 s and `f_m` = 60, a 30 min play session shows about 2.7 real years of morphology (33 tides * 60 = 1980 tides, 1980 * 12.42 h / 8766 h = 2.8 years; my arithmetic). Show the dial as "years per hour of play" in the UI.
3. Storms are EVENTS, not continuous: seeded Poisson-like schedule, one storm every 6 to 12 play minutes, each lasting 20 to 40 play seconds, `Hs` 2.5 to 4 times the calm value. During a storm run `f_m = 1` to 5 with the bigger waves, so the beach strip is visible as it happens; between storms run `f_m` high with swell, so recovery and spit growth are visible. The storm timeline is the only random thing and it is a pure function of `(seed, storm_index)`.
4. Seasons: calm summer (low long swell) and rough winter (high short) alternate every 3 to 6 play minutes; the average transport is the same as the real year when `f_m` is set from the year's mean (PLAUSIBLE).
5. Keep it honest: tell the player this is a sped-up scale. Do not claim real years in lore. Record the scale in the save (`f_m`, `dx`, `dt`).

## 7 Human interference: simple rules (all emerge from the flux, none painted)
| Player action | Effect | Rule | Tag |
|---|---|---|---|
| Groyne, jetty, harbour wall across the longshore drift | Sand piles up on the updrift side; downdrift is starved and erodes; the fill ends when the shoreline reaches the tip, then sand bypasses (or goes offshore) | Cells under the structure have zero flux in and out (a wall: reflective, no flux face). Diffraction and a lee eddy form behind. Time to fill: `t_fill` formula, section 4 | VERIFIED qualitatively (extract: accretion near breakwater or jetty, groyne analytic solutions); numbers my arithmetic |
| Breakwater (offshore) | Salient or tombolo behind; a river of sand across the lee | Wave shadow reduces `H` and `Q` in the lee; the Exner divergence builds the bar | VERIFIED (tombolo extracts) |
| Dredging | Deepens a channel; it refills at a rate set by the flux going past | `z -= d` for the chosen cells; track volume removed; the refill rate is automatic, measure it | PLAUSIBLE |
| Sea wall | Fixes the shoreline; waves reflect, the toe scours, the beach in front narrows or vanishes over time | Wall cell has an infinite-stiff bed; add `tau_w *= 1.5 to 2.5` in front (reflection raises `u_orb`) (PLAUSIBLE, TUNING); no supply from behind | PLAUSIBLE |
| Building on dunes, paths, trampling | Breaks the cover, starts blowouts, dune loses height | `veg_cover` lowered by a path or building cell and its 2-cell neighbourhood | PLAUSIBLE |
| Removing kelp, marram, saltmarsh | Waves hit harder behind, more erosion; flats lose their mud trap | Reduce `tau_cr` and wave damping on cells where cover is gone | PLAUSIBLE |
| Pier on piles | Small effect, some scour round each pile | `tau_c *= 1.3` in a 1-cell ring | UNVERIFIED |
| Beach nourishment | Dumped sand slumps seaward and drifts downdrift; adds time, not a cure | `z += v`; let slope and diffusion act | PLAUSIBLE |

## 8 Cheap stable game implementation (257 x 257)
Grid and units: 257 x 257 cells (65,949 cells). Choose `dx` real (not game) 4 to 8 m so an island is 30 to 300 cells wide. The seabed grid is 128; refine by bilinear sampling or run at 129 for a first version and 257 for the final (the cost is 4 times). Arrays (Float64Array or float64 numpy): `z` (bed), `d50`, `veg`, `eta` (scalar), `E` (wave energy), `theta` (wave angle), `u,v` (depth-mean flow), plus face-flux arrays `Fx (257*256)`, `Fy`.
Order of operations per MORPH STEP (one step covers one tide phase, `dt` about 30 min real, 24 per tide):
1. Clock: `T` -> `eta`, tide phase `c`, wave conditions `Hs, Tp, dir` from the season/storm schedule.
2. Waves: sweep the grid along the wave direction (rotate the sweep in 4 sector passes) to get `E, theta`: refraction (bend by depth), shoaling, break (`H <= gamma h`), diffraction smoothing. 1 pass, about 4 array loops.
3. Currents: `u = U_flux/max(h,0.2)` from the existing flow at tide phase `c`; add the wave-driven longshore component in the surf zone along the contour (`V = Kv sqrt(g H_b) sin(2 alpha_b)`, `Kv` 1 to 1.5, TUNING); add residual drift.
4. Stress and flux: `tau`, `theta`, `q_mag`, mode split (bed/suspended), `q = q_mag(u_hat - Lambda grad z)`, wind flux on dry cells, build face fluxes by upwinding. 5 to 10 array operations.
5. Exner update with the limiter (sections 2). Multiply by `f_m` (section 6).
6. Diffusion: slope diffusion is already in the flux; then 2 to 4 avalanche sweeps (wet and dry angle).
7. Tide cut: re-evaluate `wet = z < eta`; update dry/wet masks, `swash`, drainage for the creeks. Wet cells that dried keep their mud; dry cells that wet get the first-flush stress (tiny `tau` rise).
8. Optional: sort grains (`d50` slowly relaxes toward the stress target) and write the output height to the render.
Cost (my arithmetic, not measured): about 30 array operations on 66k cells; numpy about 1 to 2 ms per operation in float64 for simple ones, so 30 to 60 ms per morph step in numpy; JavaScript typed-array loops about 20 to 40 ms. 24 steps per tide (24 * 40 ms = 1 s of compute per tide) is fine if run in a Web Worker or only when the player is looking (the tide is 55 s of play). Fewer steps (8 per tide) work with `f_m` higher; test for stability. Run on a coarser grid (129) in "preview" mode. Memory: 12 arrays * 66k * 8 B = 6 MB.
Determinism: use only integer arithmetic for seed use (mulberry32 or a hash of `(seed, storm_index)`); fixed loop order; no time of day; no `Math.random` in the step; same operation order in every run; for numpy use float64 and `np.add.reduce` on contiguous arrays (no threaded BLAS); hash the bed every N steps (FNV over the Float64 bytes) and put it in the save; the test compares the hash for the same seed. Do not change parameters mid-run except through logged events; save state = `z, d50, veg, T, storm index, f_m`.
What to measure (the foundry, per seed): (1) total sediment volume change over 100 morph steps (closed box: under 1e-9 relative); (2) the number of clamp hits (should be zero in calm weather); (3) min/max bed change per step; (4) `max |q|`, `max u`; (5) longshore Q across a profile vs the CERC formula (within 30 percent); (6) shoreline diffusion rate vs `eps`; (7) beach slope after 200 calm tides vs Dean `A` (within 25 percent); (8) fraction of the sea area with `|dz|` over 0.5 m in a morph year (should be small and near structures and gaps); (9) bed hash identical across runs; (10) ms per step.

## 9 Validation tests (all with known outcomes)
| # | Setup | Expected outcome | Numbers we can check | Tag |
|---|---|---|---|---|
| a | Straight sandy coast, waves at 20 to 30 degrees, steady; add a groyne (zero-flux wall) of length `Lg` from the shore | Updrift: shoreline advances, a triangular wedge; downdrift: shoreline retreats. Trapped rate starts equal to the full `Q`, drops as the fill reaches the tip, then sand bypasses. At the groyne `y = 2 tan(a0) sqrt(eps t / pi)`, trapped area `tan(a0) eps t`; the updrift shoreline slopes at `a0` far from the wall initially | check `y(0,t) ~ sqrt(t)` within 15 percent; early trapped rate within 20 percent of `Q` | VERIFIED qualitatively; formulas my derivation from the known solution |
| b | Straight drift past a headland where the coast turns away by 60 to 90 degrees | A spit grows in the drift direction off the end of the headland; its tip hooks toward the shore when waves turn; the neck narrows at the point of start. Growth speed `Q/(w D)` | length vs time linear within 25 percent while `Q` is constant; sand volume = supply minus bypass | PLAUSIBLE |
| c | A single island of length `L = 150 m` placed `Y = 100 m` off a sand coast, waves onshore, plenty of sand; repeat with `Y = 450 m` | Close island: waves refract and diffract round both ends, converge behind it; the shoreline bulges (salient) then joins the island (tombolo), height low, overwash at storms. Far island: no tombolo, perhaps a faint shoal and a calm area | ratio 1.5 -> link; ratio 0.33 -> no link. Thresholds are disputed (section 4), so test the ordering (the close case links earlier than the far one and the far one never does) plus a ratio sweep: link time falls as `L/Y` rises | VERIFIED that the rule exists; numbers TUNING |
| d | A planar beach at the Dean profile; run a storm (`H` x3) for 30 play seconds, then calm for 5 to 10 minutes | Storm: berm erodes, bar forms at about the breaker depth, beach slope flattens and the shoreline moves back by metres to tens of metres. Calm: bar moves onshore, beach rebuilds. Total volume unchanged (the sand only moves offshore and back) | volume change under 1e-6; shoreline back to within 20 percent of the start after recovery time of about 10 storm-lengths; bar at `h = H_b / 0.78` | PLAUSIBLE |
| e | Closed box: random bed, random flow, 500 morph steps | Mass constant; no negative depth; no cell above the avalanche limit; no NaN | `|sum(z_end) - sum(z_start)| / sum |z| < 1e-9`; clamp count zero; max slope under repose limit + 1e-6 | VERIFIED as a test criterion (my arithmetic) |
| f | Steady uniform current over a flat sand bed past a circular island | A lee-side bar behind the island (flow slows), scour at both flanks (flow speeds) | scour at the point `u` is max; deposit where `u` drops under `u_cr` | PLAUSIBLE |
| g | Sinusoidal tide in a closed basin with a narrow inlet | Ebb-tidal delta outside the mouth, flood-tidal delta inside, deep throat | delta apex at 1 to 3 inlet widths from the mouth | PLAUSIBLE |
| h | A dune on a beach with marram, wind onshore | Dune grows; remove the cover and it migrates inland | mass conserved; veg cover turns off transport | PLAUSIBLE |

## 10 What is faked, and what the player sees
| Faked | Real world | Player sees |
|---|---|---|
| Depth-mean flow only, from the potential field; no momentum, no pressure, no waves driving mean level | Full shallow-water and wave models | Tide sets the main channels; bars do not carry flow from a free surface; some features can appear where real water would not go |
| Wave model: one-pass energy march | Spectral waves | A clean wave shadow in the lee, soft edges, a hooked spit |
| Uniform D50 or a coarse classification | Full grading and sorting | Beaches of sand, shingle or mud by exposure; no full gradation |
| Time compression (`f_m`) | Real time | Years pass in minutes; storm EVENTS are visible as they happen |
| One flux law for all grains | Several transport regimes | A bar can be formed from sand, a sill can build from shingle; mud only settles in calm water |
| Cohesion and consolidation | Mud gets harder with age | Marsh edges stay put once planted |
| No sea-level rise or glacial change | Yes | Tides and storms only |
| Boundaries closed or fed from the edge | Open sea | Sand may come only from a seabed reservoir; set a "supply" number per seed |
What players should see: bars that move a bit each tide; a spit that grows toward the lee of a headland; a tombolo that appears after years of waiting behind a near island; creeks cutting the flats; a storm stripping a beach in front of them; the same beach back the next spring; their own harbour wall piling sand on one side and eating the beach on the other; a dredged channel silting back; their houses on a dune breaking the grass and a blowout opening.

## Sources (read as search extracts; no downloads; none of these were opened in full)
| Source | Used for | Licence |
|---|---|---|
| https://geo.libretexts.org/Bookshelves/Oceanography/Coastal_Dynamics_(Bosboom_and_Stive) (pages: Shields curve, bulk longshore transport, semi-empirical profile, analytic accretion near breakwater) | D*, Shields, CERC, Dean A, groyne solution | open textbook, probably CC BY (UNVERIFIED) |
| https://apps.dtic.mil/sti/pdfs/AD1003843.pdf (USACE technical note on the CERC K) | K vs grain size | US government work, public domain (PLAUSIBLE) |
| https://coastalengineeringmanual.tpub.com/PartV-Chap3/PartV-Chap30059.htm (EM 1110-2-1100 Part V, breakwater tombolo index) | `Is` index and thresholds | US government work, public domain (PLAUSIBLE) |
| https://www.mdpi.com/2073-4441/14/13/2016 and the Prasonisi tombolo study (flvc.org JCR article 80236) | `L/D` tombolo-salient rule | MDPI open access CC BY; JCR UNVERIFIED |
| https://www.matec-conferences.org/10.1051/matecconf/201820301007/pdf | breakwater `LB/XB` rule | open access CC BY (UNVERIFIED) |
| Birkemeier (1985) via the USACE CIRP archive; https://coastalwiki.org/wiki/Closure_depth | closure depth formulas | US government work; coastalwiki CC BY-NC-SA (UNVERIFIED) |
| https://dspace.library.uu.nl/bitstream/1874/10278/ (thesis on ebb-tidal deltas, Wadden) and Springer article 10.1007/s10236-019-01249-3 | flood/ebb dominance, delta cycle 50 to 60 years | thesis copyright the author (read, not copied); article licence UNVERIFIED |
| https://data.jncc.gov.uk/data/118b87ed-d7dd-4ea0-99ad-36ed62d2eab0/gcr-v28-coastal-geomorphology-c9.pdf and https://geoguide.scottishgeologytrust.org/page/2353 | machair, shell sand, positive sand budget | JNCC Open Government Licence (UNVERIFIED); Geology Trust UNVERIFIED |
| Cronfa (Swansea) one-line model papers (cronfa55548 etc.) and CERC-87-15 (Larson and Hanson) | diffusion form, groyne solutions | UNVERIFIED |
Gaps (UNVERIFIED, check when a page is reachable): Meyer-Peter and Mueller constant, Soulsby-Fredsoe wave-current blend, Dean number threshold, Bagnold coefficients, longshore current formula, the repose angles, any measured spit growth rate, morphological acceleration limits, how real tombolo studies define `Y`.
