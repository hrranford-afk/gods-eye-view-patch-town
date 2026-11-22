# Flow types in coastal island seas (research note)
Do not put real place names into game code, assets or recipes.
Status: research note for Living Islands (branch citylab/cloud-islands), 22 Nov 2026. Written for the sea, tide, drift, boat and building-site rules. Companion: `SEABED_AND_ISLAND_LAYOUT.md`. Builds on `FLOW_PASS.md` (the current simple field) and `REAL_REFERENCE_PLACES.md`.
Method and limits: read-only web search. The host en.wikipedia.org could not be fetched in this session (not on the allowed network list), so every number below comes from search-result extracts, not from full pages. Nothing was downloaded. Tags: VERIFIED = seen in a search extract of a named source; PLAUSIBLE = standard knowledge or a single secondary source; UNVERIFIED = my memory or a placeholder. Speeds are real m/s (1 knot = 0.514 m/s). Licences: Wikipedia text CC BY-SA 4.0; US government pages (NOAA, NWS, NPS, USGS) public domain; others UNVERIFIED unless stated. I use facts and ideas only, no text copied.

## 0 One-page summary (what the game needs)
1. One tide clock drives everything: level, stream, eddies, drift, land exposure.
2. Stream speed follows the cross-section: narrow and shallow is fast. Open water is slow (0.3 to 1 m/s), gaps and headlands 2 to 5 times faster.
3. Wherever fast water leaves a gap or passes a point it separates and leaves eddies and slicks (the player-visible clues).
4. Floating things move with stream plus about 3 percent of wind. They collect on convergence lines, in eddy centres and on gentle lee shores at high water.
5. Shallow plus fast gives overfalls and races (rough water, no-go for small boats). Shallow plus waves gives foam and surf.

## 1 Types of flow, one table
Speeds are typical, in m/s, for the reference coasts unless stated.
| # | Flow | Cause | Typical speed and where | Conf. |
|---|------|-------|-------------------------|-------|
| 1 | Tidal stream (flood/ebb) | Tide wave moving water in and out; stream is strongest mid-tide, slack at high and low water | open shelf sea 0.3 to 1.0; narrow sounds 1.5 to 3; extreme channels 4 to 5+ | PLAUSIBLE (range), see section 2 for VERIFIED extremes |
| 2 | Rotary stream | Offshore, flow direction turns round a full ellipse each tide (clockwise in the north); long axis of the ellipse gives flood and ebb directions | around the small-island group 0.3 to 0.8; ellipse not a circle | VERIFIED qualitative (Admiralty-derived pilot text, via search) |
| 3 | Reversing (rectilinear) stream | In channels and at headlands the walls force flow onto one axis, 0 or 180 degrees | most high-speed sites are close to rectilinear | VERIFIED qualitative (tidal energy paper extract) |
| 4 | Spring and neap | Moon phase: spring streams stronger than neap, lag of a day or two after new/full moon | spring about 2 times neap (memory) | VERIFIED that spring is stronger and lags (NOAA pamphlet); ratio UNVERIFIED |
| 5 | Residual current | Tide does not return water exactly: net drift from tidal rectification, wind, density | 0.05 to 0.3 | PLAUSIBLE (FLOW_PASS uses 0.22 as a game number) |
| 6 | Headland / island-end eddy | Stream separates from the point where the shore turns away; vorticity rolls up into an eddy | eddy turns at 0.3 to 1; size 1 to 2 island widths | VERIFIED qualitative (USGS headland paper; field example of a lee eddy about twice island size) |
| 7 | Tidal race and overfalls | Stream squeezed sideways by a headland (race) or upward by a shallow bank (overfall); rough water on the down-stream side | 2 to 5 over a sill or off a point | VERIFIED qualitative (pilotage articles) |
| 8 | Tidal jet through a gap | Continuity: the same flow through a smaller cross-section; the jet carries on past the exit | 2 to 5, jet length several channel widths | PLAUSIBLE (continuity is standard physics; no source number read) |
| 9 | Lee eddy and slick | Calm, smooth or circling water behind an obstacle; surface film and foam gather | 0 to 0.5 | PLAUSIBLE |
| 10 | Wind-driven surface drift | Wind drags surface water (Ekman-type, turned to the right of the wind in the north) | 1 to 3 percent of wind (see section 3) | VERIFIED |
| 11 | Longshore current | Waves arriving at an angle push water along the surf zone | 0.2 to 1 m/s (memory) | UNVERIFIED speeds; mechanism VERIFIED (NOAA tutorial) |
| 12 | Rip current | Water piled up by waves flows back out through a gap in a sandbar or beside rocks | typical 0.5, up to 2 to 2.5 | VERIFIED (NWS, NPS, NOAA extracts) |
| 13 | Estuary / stratified flow | Fresh water slides out on top, salt water creeps in underneath | surface out 0.1 to 0.5, bottom in | PLAUSIBLE |
| 14 | Convergence line (Langmuir, fronts) | Wind rows and fronts push surface water together; it sinks, foam and flotsam stay | downwelling about 1 percent of wind; rows 2 to 300 m apart | VERIFIED |
| 15 | Wave refraction and diffraction | Waves slow in shallows, bend, wrap round islands, focus on headlands, spread into bays | wave speed not current; effect on energy | VERIFIED qualitative |
| 16 | Wrack and kelp lines | Waves and tide leave a line at the high-water mark; kelp breaks off in storms | n/a | PLAUSIBLE |

## 2 Reference numbers (tide range and stream speed)
| Place | Number | Value in m/s or m | Conf. and source |
|-------|--------|-------------------|------------------|
| Pentland Firth (between Orkney and the mainland) | peak stream | up to 5 m/s (11 mph) | VERIFIED, Wikipedia extract, https://en.wikipedia.org/wiki/Pentland_Firth , CC BY-SA 4.0 |
| same | race named Merry Men of Mey | over 10 knots (more than 5 m/s) | VERIFIED extract (same page); a caithness.org page calls it the most extensive and dangerous race in the firth |
| same | 13 to 16 knots claims | 6.7 to 8.2 m/s | UNVERIFIED: sources disagree; do not use |
| same | Swelkie race, north end of Stroma | direction follows the tide, violent | VERIFIED extract |
| Whirlpool strait in the Inner Hebrides | spring stream | about 8.5 knots (4.4 m/s) | VERIFIED secondary (whirlpool-scotland.co.uk facts, and Wikipedia extract, https://en.wikipedia.org/wiki/Gulf_of_Corryvreckan); a 16-knot figure is called wrong |
| same | seabed | hole about 219 to 220 m deep beside a pinnacle rising from about 70 m to about 29 m below the surface | VERIFIED secondary; shows deep scour next to a sill |
| Sound of Islay | spring stream | 6 to 7 knots (3.1 to 3.6 m/s) | PLAUSIBLE (one search extract) |
| Isles of Scilly | stream form | rotary, clockwise | VERIFIED (1947 Admiralty-derived pilot text, via search) |
| same | offshore spring | about 0.7 knot (0.36 m/s) N, W, S; about 1.5 knots (0.77 m/s) NE; 2.5 knots (1.3 m/s) SE side | VERIFIED but historical |
| same | within the group, outer edges | rarely over 1 knot (0.5 m/s) inside; 2 knots (1 m/s) or more at the outer edges | PLAUSIBLE (one summary) |
| same | tide range | mean spring high 5.7 m, mean spring low 0.7 m at the main harbour, so spring range about 5 m | VERIFIED extract (harbour tide summary); the range is my subtraction |
| Orkney, Hebrides, Shetland ranges | spring | see `REAL_REFERENCE_PLACES.md` section 2 (3 to 4.5, 2 to 3.5, 1.4 to 2 m) | PLAUSIBLE; I could not verify more here |
| Hebridean sounds (Harris, Barra) | stream rates | not found | UNVERIFIED; use the Orkney and Scilly bands |
| Maine | mean range about 3 m | | VERIFIED (archived NOAA table, public domain) |
| Wadden Sea (German part) | 1.5 to 3.7 m | | VERIFIED (UNESCO site text) |
Design reading: open-sea streams of 0.3 to 1 m/s and sound streams of 1 to 3 m/s cover almost every case; the 4 to 5 m/s straits are the rare danger zones. Bigger tide range gives faster streams in the same geometry (PLAUSIBLE: stream roughly follows range; no number verified).

## 3 Each flow: cause, model rule, what the player sees
Use `U0` for the open-water peak stream, `c(t) = cos(2 pi t / T)` for tide phase (stream strongest when level is at mid-tide, zero at high and low water, as in FLOW_PASS), `D` for local depth, `w` for the local gap width.

### 3.1 Tidal stream, reversing and rotary
- Rule: `u = U0 * c(t) * axis` in a channel (reversing); in open water add a second component at 90 degrees, `u = U0 * (c(t) * a + k * s(t) * b)` with `s = sin(...)` and `k` 0.3 to 0.7 for an ellipse (rotary), clockwise in the north.
- Spring and neap: multiply `U0` by `1 + 0.35 * cos(2 pi day / 14.8)` so spring is about 2 times neap (the 2:1 ratio UNVERIFIED; 14.8 days between springs PLAUSIBLE).
- Slack water: `|c| < 0.1` lasts about 15 to 20 percent of the tide in open water but is brief in a narrow channel (VERIFIED qualitative: very short straits have a flattened-top curve, so high speed is held longer). Game rule: reversing channel `u = U0 * sign(c) * |c|^0.6`.
- Player sees: foam streaks and flotsam all moving one way, a flat calm moment at slack, then a reversal. Moored boats swing round at the turn. Slack is the safe window for landing, crossing a race and setting nets.

### 3.2 Narrow gaps, jets, races, overfalls
- Continuity rule: `u = U0 * (W0 * D0) / (w * D)`, clamped to `3.5 * U0` (friction and head loss stop it going higher). W0 and D0 are the cross-section upstream. Shallower and narrower means faster.
- Jet: after a gap the fast core carries on for about 3 to 5 gap widths then spreads; eddies sit on each side. PLAUSIBLE.
- Race at a headland: where the stream passes a point that protrudes into it, `u` gets a bonus `x (1 + P / w0)` with P the protrusion; extra if a shallow shelf extends out from the point (VERIFIED qualitatively: pilot sources say a tide race comes from a headland squeezing sideways and an overfall from a shoal squeezing upward; many headlands do both).
- Overfall: over a sill or bank, `overfall = u * max(0, -dD/ds)` where `s` runs along the stream and the term is positive where the bed shoals or drops away; rough water on the down-stream side. Switch on above about 2 m/s of stream and under about 15 m depth (the thresholds are my TUNING, UNVERIFIED).
- Player sees: tide rips as a line of steep short waves and white water; smooth boils beside it; the jet as a darker, ruffled tongue; calm slack that suddenly builds.
- Game effect: boats under a size or power threshold cannot cross while `u > limit`; the plan says "wait for slack".

### 3.3 Headland and island-end eddies, lee eddies, slicks
- Cause: flow separates from the point where the shore turns away; the lee fills with a recirculating eddy (VERIFIED, USGS). Whether one eddy per tide or several depends on a Reynolds-type number; one island study used `Re = U * D / 100` (100 m^2/s as a horizontal mixing value), with two stable wake eddies for Re 10 to 40, and fewer than one shed eddy per tide when the tidal period is short (PLAUSIBLE: one paper extract).
- Game rule: for every island or point of size `D` metres, make an eddy on the lee side when `U * D > 1000` (real units; rescale to game metres by the same ratio as the game's speed scale). Eddy radius about `1 to 2 * D` (VERIFIED example: lee eddy about twice the island size). Eddy turns one way on the flood and the other on the ebb; at the turn of the tide it moves to the other end of the island (FLOW_PASS already does this).
- Slick: calm, smooth band on the lee side and along shear lines, where the ripple amplitude drops; foam and floating things gather there.
- Player sees: a smooth patch with a ring of drifting weed or foam behind the point; spinning flotsam that stays put for hours.

### 3.4 Wind-driven drift and waves
- Rule (leeway): `u_drift = u_water + alpha * wind_vector`, `alpha = 0.03` (range 0.02 to 0.04). VERIFIED (arXiv 2201.12688, "How winds and ocean currents influence the drift of floating objects", and related leeway papers; most floating objects drift at about 3 percent of wind speed relative to the water).
- Surface water itself moves at about 1 to 3 percent of wind speed, turned about 15 to 90 degrees to the right of the wind in the north (VERIFIED range, same sources; "15 degrees right at 3 percent" is a common phrasing).
- Wave Stokes drift adds about 1 to 1.5 percent of 10 m wind for a fully grown sea (VERIFIED), often folded into the 3 percent.
- Example: a 10 m/s gale pushes surface things about 0.3 m/s, as fast as a typical open stream. Light wind (3 m/s) gives about 0.1 m/s.
- Per-item variation: low driftwood about 2 percent, tall crate or boat hull 3 to 4 percent, bottle 1.5 percent (PLAUSIBLE, my reading of "2 to 4 percent").
- Player sees: after a gale, flotsam arrives on windward shores whatever the tide says; stream-dominated sea in calm weather.

### 3.5 Longshore drift, rips, wave refraction
- Longshore current: waves arriving at an angle push water along the surf zone; stronger for bigger waves, a steeper beach and a larger angle up to about 45 degrees (VERIFIED mechanism, NOAA tutorial https://oceanservice.noaa.gov/education/tutorial_currents/03coastal2.html ). Rule: `u_ls = 0.5 * sqrt(g * Hb) * sin(2 * theta) * 0.4` with Hb the breaker height. UNVERIFIED: coefficient is mine; speeds 0.2 to 1 m/s expected.
- Rip current: a seaward jet through a gap in the surf-zone sandbar or beside a headland where the longshore feed meets an obstacle. Typical 0.5 m/s, up to 2 to 2.5; stronger near low tide; speed above 0.2 m/s is hazardous to swimmers (VERIFIED, NWS, NPS and NOAA extracts). Game rule: put a rip where the sandbar has a gap and the waves are above 1 m; it is a no-wade zone and carries drift out to sea.
- Refraction and diffraction: waves slow where depth is under half the wavelength (VERIFIED, DFO paper); depth rules the wave once it is under about a twentieth of the wavelength (VERIFIED). Game rule: wave heading bends towards the contour lines; wave energy focuses on headlands (where the depth rises fast on three sides) and spreads in bays. Waves diffract round both ends of an island and meet behind it, which builds a sand spit or tombolo there (VERIFIED, journal and JNCC extracts about a Shetland tombolo; see the seabed note).
- Player sees: swell wrapping round the island, surf lines parallel to the shore, white water on the points, calm in the bays, a bar of sand growing behind a small island.

### 3.6 Estuaries and stratified water
- Cause: fresh stream water floats and flows out over salt water, which moves in underneath (PLAUSIBLE).
- Rule: if a stream or burn enters a bay, give the top 1 m an outflow of `0.2 m/s` and the bottom a weak inflow; a sharp colour edge (brown over blue) where they meet.
- Player sees: a plume of darker water and foam line off the burn mouth; drift collects on the edge. Tide fighting the outflow stands the plume up into short chop.

### 3.7 Convergence lines, foam streaks, Langmuir rows
- Cause: with wind of about 3 m/s or more, paired rolls form; the surface water converges in lines parallel to the wind and sinks (VERIFIED: Leibovich review, Thorpe review). Rows are 2 to 300 m apart; cell width a few m to about 30 m; downwelling about 1 percent of wind (0.85 percent in Scott et al. 1969). Floating oil, foam and debris collect in the lines (VERIFIED).
- Tidal fronts and shear lines behave the same way: the convergence is `- div(u)` of the drift field (FLOW_PASS already stores it).
- Game rule: spacing `S = 10 + 4 * wind_ms` metres, lines parallel to the wind; drift items gain a pull towards the nearest line `v_c = 0.01 * wind` across the line. UNVERIFIED: the spacing formula is mine (sources say it is not settled).
- Player sees: long, thin foam and weed streaks, with a calm band on one side. A shoal of fish or a drifting crate often sits in a line.

### 3.8 Tide pools, drying sandbars, wrack and kelp lines
- Tide pool: rock hollow above low water that keeps water as the sea falls; rule: any local basin in the shore profile above low water holds water (PLAUSIBLE).
- Drying sand: any bed shallower than the low-water level dries; width of the dry zone is `range / slope` (see the seabed note).
- Wrack line: the strandline at the highest recent tide plus swash height; one line per tide, with the most recent at the top. Spring tides and storms leave higher lines. Dense on sheltered gentle shores, rare on steep rock (PLAUSIBLE).
- Kelp: attached to rock, 0 to about 20 m depth (see seabed note); storms rip it off; floating fronds join the drift and strand as wrack (PLAUSIBLE).

## 4 Cheap-model recipe (a few lines)
```
tide_level(t)   = A * sin(2pi t / T)                 // A = half range
stream(x,t)     = axis * U0 * springneap(day) * c(t) // c = cos(...)
local speed     = stream * clamp(W0*D0 / (w*D), 0.4, 3.5)   // w, D from the depth field
eddy if         = speed * island_size > threshold     // on lee side, size 1-2 x island
overfall        = speed * max(0, depth_drop_ahead) where depth < 15 m and speed > 2
drift_velocity  = stream_local + 0.03 * wind + onshore swash near gentle shores
convergence     = -div(drift_velocity)                // items slow and stay where > 0
rip             = gap in nearshore bar and Hs > 1 m   // seaward jet, no-wade
```
Cost: all are pure functions of position, depth and clock, so a seeded save needs only the seed and clock (same as FLOW_PASS).

## 5 Licences and sources used (read as search extracts only)
| Source | Used for | Licence |
|--------|----------|---------|
| https://en.wikipedia.org/wiki/Pentland_Firth , .../Gulf_of_Corryvreckan , .../Tidal_race , .../Rip_current , .../Langmuir_circulation , .../Tombolo | speeds, hole depth, mechanisms | CC BY-SA 4.0 |
| https://caithness.org/pentlandfirth2/tides.htm | race names | UNVERIFIED |
| https://whirlpool-scotland.co.uk/oldsite/facts.html | whirlpool stream and depth | UNVERIFIED |
| https://www.weather.gov/safety/ripcurrent-science , https://oceantoday.noaa.gov/ripcurrentscience , https://www.nps.gov/articles/coastal-geohazards-dangerous-currents.htm | rip speeds | US public domain |
| https://oceanservice.noaa.gov/education/tutorial_currents/03coastal2.html | longshore current | public domain |
| https://www.tidesandcurrents.noaa.gov/publications/TidalCurrentsEducationalPamphlet4.pdf | spring current and lag | public domain |
| https://www.usgs.gov/publications/transient-eddy-formation-around-headlands | headland eddies | public domain |
| https://arxiv.org/pdf/2201.12688 and related leeway papers | 3 percent wind drift, Stokes drift | arXiv author licence, UNVERIFIED (facts only) |
| https://ftp.soest.hawaii.edu/kelvin/OCN665/OCN665_full/papers/leibovich_arfm_1983.pdf , Thorpe 2004 | Langmuir rows | (c) journals; facts only, UNVERIFIED |
| https://nora.nerc.ac.uk/id/eprint/529345/1/os-16-1337-2020.pdf (Bardsey island tides) | island wake and Reynolds number | likely CC BY 4.0 (Copernicus), UNVERIFIED |
| https://waves-vagues.dfo-mpo.gc.ca/Library/487-12.pdf | wave depth criteria | Canadian government; reuse terms UNVERIFIED |
| https://bookdown.org/rbown250/sea_kayak_navigation/behavior-of-tidal-streams.html | race, overfall, headland descriptions | UNVERIFIED |
| https://www.visitmyharbour.com/Tides/UK-Tidal-Streams , harbour tide pages | Scilly tide heights | UNVERIFIED |

## 6 Confidence picture and gaps
- Solid (VERIFIED): the mechanisms; 3 percent wind drift; rip speeds; Pentland and whirlpool-strait peak streams; Scilly rotary streams and range; Langmuir spacing range and downwelling fraction.
- Soft (PLAUSIBLE or UNVERIFIED): all open-sea stream speeds for Hebrides, Orkney and Shetland (no tidal atlas read); the 2:1 spring to neap ratio; longshore speed coefficients; the eddy threshold in game units; the Langmuir spacing formula; overfall thresholds.
- To check with a tidal stream atlas or Admiralty tide tables when a source becomes reachable: Hebridean sound rates, Orkney sound rates, Stornoway and Kirkwall ranges.
