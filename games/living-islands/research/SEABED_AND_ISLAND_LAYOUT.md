# Seabed and island layout (research note and rule set)
Do not put real place names into game code, assets or recipes.
Status: research note for Living Islands (branch citylab/cloud-islands), 22 Nov 2026. Companion to `FLOW_TYPES.md`. Same method and limits: read-only web search extracts, no downloads, en.wikipedia.org not fetchable in this session. Tags: VERIFIED (seen in a named source extract), PLAUSIBLE (standard knowledge or one secondary source), UNVERIFIED (my memory, TUNING for the game). Bathymetry numbers were hard to find: most depth and slope figures below are PLAUSIBLE or UNVERIFIED and are labelled as design assumptions, not measurements.

## 1 How real archipelagos sit on the seabed
| Idea | What it means | Where | Conf. |
|------|---------------|-------|-------|
| Islands are the peaks of one submerged landscape | Islands are the high ground of a shelf or drowned land; sea level rise flooded valleys, so channels are old valleys and sills are old saddles or ridges | all seven reference coasts | PLAUSIBLE (standard geology) |
| Drowned valleys (ria, fjord, fiard) | River valleys flooded by sea (ria: branching, steady depth; fiard/voe: glacial, deeper, with a shallow lip at the mouth) | Shetland voes, Maine bays (a flooded mountain range, VERIFIED qualitatively in `REAL_REFERENCE_PLACES.md`), Scandinavian fjords | PLAUSIBLE |
| Rebound and low relief | Land that rose after the ice (Stockholm region about 5 mm a year, VERIFIED in `REAL_REFERENCE_PLACES.md`) gives many low skerries, gently shelving shores and shallow sheltered bays | Baltic coast | VERIFIED for the 5 mm; shallow bays PLAUSIBLE (a master's thesis extract calls the bays shallow, sheltered, lagoon-like) |
| Shelf plus rock outcrops | A fairly flat shelf, a few tens of metres deep, with granite or gneiss outcrops as islands, reefs and rocks | Scilly, Hebrides | PLAUSIBLE |
| Barrier islands on sand | Sandy islands built by waves and tide, with inlets (gats) between them and flats behind | Wadden Sea | VERIFIED qualitatively (UNESCO, Wikipedia in the reference note) |
| Entrances are few | Deep-draught shipping uses only three main entrances into the Stockholm archipelago; the rest is shallow and rocky | Stockholm | VERIFIED (extract: Landsort, Sandhamn, Soderarm) |

## 2 Depth contours and slope profiles
Depth is measured below mean sea level (MSL). `d` = distance from the shoreline out to sea.
| Shore type | Slope under water | Width of intertidal zone for a 3 m range | Notes | Conf. |
|------------|-------------------|-------------------------------------------|-------|-------|
| Rocky cliff or ledge | 1:3 to 1:10 near the shore (0.1 to 0.33), flattening beyond 20 to 30 m | 10 to 30 m | steep, deep close in; waves reflect off it | PLAUSIBLE |
| Mixed sand and gravel (shingle) | steep upper face about 1:6 to 1:10, flatter lower foreshore, with a visible break in slope | 30 to 60 m | composite profile; low-tide beach is gentle (VERIFIED, marine species wiki and coastal geomorphology extracts); numbers PLAUSIBLE | 
| Fine sand, exposed, dissipative | about 1:50 to 1:100 (0.01 to 0.02) over hundreds of metres | 150 to 300 m | flat, wide surf zone, big tide range (VERIFIED qualitatively, NPS extract); numbers PLAUSIBLE |
| Coarse sand, reflective | about 1:10 to 1:20 | 60 to 120 m | steep, waves surge up the face; slope rises with grain size for sand (VERIFIED) | 
| Mud and sand flats, sheltered | 1:200 or flatter | over 600 m | Wadden, creek-cut flats | PLAUSIBLE |
Rule of thumb: `intertidal width = tide range / slope`. At slope 0.02 and a 3 m range the flat is 150 m wide (my arithmetic); at slope 0.3 it is 10 m.
The shelf deepens with distance and flattens at the shelf depth (10 to 40 m inside a sheltered archipelago, deeper outside; PLAUSIBLE; there are also holes to 100+ m, see the next section).

## 3 Sills, saddles, channels, holes
| Feature | What it is | Example (real) | Conf. |
|---------|------------|----------------|-------|
| Sill or saddle | shallow ridge between two islands or at a bay mouth; the stream is squeezed over it, overfalls form, and it is the deepest a boat can cross | the pinnacle and sill in a whirlpool strait rises from 70 m to about 29 m below the surface | VERIFIED (whirlpool-scotland.co.uk and Wikipedia extracts) |
| Scoured channel | where the stream is fast it scours the bed, so the narrowest gap between islands is often the deepest | the same strait has a hole 219 to 220 m deep | VERIFIED (same extracts) |
| Scour hole | a deep pit just downstream of a constriction where the jet hits bed | the 219 m hole above | VERIFIED; the "downstream of constriction" part is PLAUSIBLE |
| Shoal or bank | broad shallow patch, sand or gravel, in mid-channel or at a river mouth; breaks waves; marks an overfall | the pilot sources describe overfalls over shoals and over the underwater extension of a headland (VERIFIED qualitatively) | VERIFIED qualitative |
| Skerry and reef | rocks around low-tide level; submerged ones are the danger, awash ones show as breakers | outer Scilly, Shetland | PLAUSIBLE |
| Drying flat / tidal causeway | a sand or shingle bar between two islands, or an island and its neighbour, that dries at low tide and floods at high | tombolos in Orkney, Shetland and Scilly; the Scilly group has the largest British group of "tied" islands apart from Orkney and Shetland (VERIFIED, JNCC GCR extract); no source found for a specific walk between two named isles, so no walk timing | VERIFIED for tied islands; walking timing UNVERIFIED |
| Tombolo | bar of sand joining an island to a neighbour; waves bend round both ends and meet behind the island, the drift converges, sand piles up in the calm lee (VERIFIED: St Ninian's Ayre paper and JNCC account) | Shetland | VERIFIED mechanism |
Note: beaches can form in the lee of small islands without fully linking them when the sand supply is short (VERIFIED, JNCC extract), so give bars partial heights, not all or nothing.

## 4 Sheltered coves, harbours, beaches, shingle
- Natural harbours form in the lee of a headland or island, in the head of a drowned valley (voe, ria, bay) or behind a bar: low fetch, a bar or narrow mouth, and a deep enough hole inside (PLAUSIBLE). A sheltered main sound sits between several inhabited islands (Scilly, VERIFIED qualitatively in the reference note).
- Sand beaches build in bays where waves are low and the sand is on hand; in the lee of an island they come from the waves wrapping round (VERIFIED, tombolo extracts). Exposed Atlantic coasts also hold big sand and machair beaches where offshore sand feeds them (PLAUSIBLE), so exposure alone does not decide it; supply does.
- Shingle (gravel) forms where waves are strong enough to move stones but there is little sand: steep, reflective storm ridges at bay heads and on short-fetch shores (VERIFIED slope behaviour; "where" is PLAUSIBLE).
- The more exposed island (Bryher) has its sheltered east shore sandy while the west is open rock and surf (VERIFIED extract: the more exposed island has an extensive sandy east shore).
- Fetch and exposure: wave height grows with fetch (open water distance) and wind. Outer Atlantic sides have the longest fetch; inside the group fetch is a few km at most (PLAUSIBLE).

## 5 Kelp, fishing, wrack by depth band
| Band | Depth below MSL | What lives or happens | Conf. |
|------|-----------------|-----------------------|-------|
| Intertidal rock | above 0 | weed zones, pools, limpets; wrack on the shore | PLAUSIBLE |
| Kelp forest on hard bed | about 0 to 5 m, 5 to 10 m, 10 to 20 m bands (a UK habitat description) | dense kelp on exposed rock; forest thins with depth as light and wave surge weaken; below 15 m it gives way to red seaweeds where the water is clear | VERIFIED bands (MarLIN habitat 171, https://www.marlin.ac.uk/habitats/detail/171 , licence UNVERIFIED); depth limit depends on water clarity (VERIFIED, study over 2 to 15 m depths) |
| Sea-urchin grazing | sometimes sets the lower edge of the kelp | | VERIFIED (extract; Isle of Man example) |
| Soft sediment | sand, mud | worms, flatfish, shellfish; no kelp | PLAUSIBLE |
| Wrack | strandline at the high-water mark | kelp and driftwood stranded by waves, on gentle sheltered shores | PLAUSIBLE |
Kelp needs rock, light and some water movement; not sand or deep still mud. Game fishing zones: kelp edge (shelter, crabs, fish), sandbank edge, eddy and slick lines, tidal gap at slack water.

## 6 Spacing and size in the reference groups
| Group | Island size | Gap between islands | Ratio gap / island width | Conf. |
|-------|-------------|---------------------|--------------------------|-------|
| Isles of Scilly | Bryher 122 ha (about 1.1 km across), Gugh 34 ha (about 0.6 km) | 1 to 3 km between inhabited islands | about 1 to 4 | VERIFIED sizes (reference note); gaps PLAUSIBLE |
| Orkney | up to tens of km on the main isles; small isles 1 to 3 km | channels 1 to 10 km | 1 to 5 | PLAUSIBLE |
| Penobscot Bay | over 200 islands in a bay about 40 x 15 miles (65 x 24 km) | 0.5 to 5 km | 1 to 5 | VERIFIED count; gaps PLAUSIBLE |
| Stockholm inner archipelago | hundreds of metres | tens to hundreds of metres | 0.1 to 1 | PLAUSIBLE (reference note) |
| Outer Hebrides | long main islands, sounds a few km | few km | n/a | PLAUSIBLE |
| Wadden | barrier islands several km long | tidal inlets 0.5 to 3 km (UNVERIFIED) | 0.1 to 1 | UNVERIFIED |
Design reading: gap/size ratio 0.1 to 1 means sills, shared shelves and drying bars; 1 to 5 means open sounds with their own deep channels. Island width 100 m to 3 km and gaps 50 m to 5 km (the union in the reference note) is fine.

## 7 RULE SET: a seedable bathymetry field and what it drives
Units: game metres, seconds. Rescale only via a single constant. Everything is a pure function of `(x, z)` and the seed; no hidden state.

### 7.1 Build the seabed (steps 1 to 5)
1. Island height fields give the land `H(x,z)`, shoreline `H = 0` at MSL. Compute `d_i(x,z)` = distance from point to island i's shoreline (a distance transform, once per seed).
2. Per island, a rockiness `r_i` in [0,1] (seeded, tied to the island's character: rocky wooded 0.8 to 1, low sandy 0 to 0.3) and shelf depth `Dmax_i` (10 to 30; deeper for exposed outer islands). Slope at the shore `s_i = lerp(0.02, 0.30, r_i)` (sandy 0.02, rocky 0.3: section 2 bands). Length scale `L_i = Dmax_i / s_i`.
3. Shelf curve: `g_i = exp(-d_i / L_i)`. Each island alone gives depth `Dmax * (1 - g_i)`: slope `s` at the shore, flattening to `Dmax`. This is a distance to depth curve in one formula.
4. Combine islands with a probabilistic union, `depth = Dmax * product_i (1 - g_i)`. Two close islands add their `g` so the saddle between them is shallower than either alone: this builds sills for free. A gap of about `2 * L` or less gives a clear sill (so rocky islands with short `L` have narrow sills, sandy ones broad shoals). Add low-frequency noise (amplitude 1 to 3 m, wavelength 100 to 400 m) and break the perfect rings.
5. Channel scour: for a gap between islands with width `w` (measured along the shortest bridge) and the stream `u_open` at the gap: scour depth `S = k_s * clamp(1 - w / w_max, 0, 1)` metres with `w_max` about 600 m and `k_s` 8 to 25 (hole scale from the strait example, UNVERIFIED). Deepen along the channel centreline and put the deepest hole a little downstream of the narrowest point. Then add a sill at each channel mouth (a hump of 30 to 60 percent of the surrounding depth, length about 1 w).
6. Optional: tombolo / drying bar. If two bodies are closer than `1.5 * (size of the smaller)` and the gap is on the lee side of the prevailing swell, lift the saddle to `-0.3 * range` to `+0.2 * range` (it dries on the lowest tides). Partial height, not a full join, unless the sand is plentiful.
7. Drowned valleys (voes): for island groups with a "drowned" character, carve one or two long branching low-noise valleys (width 100 to 400 m, floor 15 to 30 m deep, a 3 to 6 m sill at the mouth) inside the shelf: sheltered anchorage by construction.

### 7.2 What the depth field drives
| Output | Rule |
|--------|------|
| (a) Land exposure with tide | `level(t) = A sin(2 pi t / T)`; bed is dry when `depth < -level`; at low water `level = -A` so cells with `depth < A` dry. Intertidal width `= range / slope`. Landing windows (contract: rocky landing 9 minutes, landing stage 30, TUNING) follow from the slope at the landing. |
| (b) Flow speed | `u = U0 * clamp(W0 * D0 / (w * D), 0.4, 3.5)`; w from the nearest-two-islands gap, D from the depth field. Shallower and narrower is faster. Cells with `depth < 0.5 m` slow to 0.25 U0 (friction, as in FLOW_PASS). |
| (c) Waves and foam | break where `depth < 1.3 * Hs_local` (breaker rule, PLAUSIBLE standard). Waves feel the bottom at `depth < L_wave / 2`, so refract towards the contours there (VERIFIED). Overfall foam where `u > 2` over a sill (`flow x depth drop`). Foam on rocks and sills at all states of tide; surf on gentle shores only when `Hs` is high. |
| (d) Where drift collects | convergence of `(u + 0.03 wind)` (positive div negative); eddy centres on lee sides; the inside of bays and cove heads on the flood; sheltered gentle lee shores at high water; NOT on headlands and in fast channels (matches EVOLUTION_TREE). Strandline height = highest tide of the cycle + `0.5 Hs`. |
| (e) Boat draft and safe routes | boat is safe at a cell if `depth + level(t) >= draft + 0.3`. Draft: rowing 0.3, small sailing boat 1.0 to 1.5, work boat 2 to 3 (TUNING). Route search on a grid with edge cost `distance / (boat_speed + u . heading)`; block cells with `u > boat_limit` and cells with depth under the draft. Safe routes follow channels; shortcuts over sills only near high water. |
| (f) Fishing, kelp, wrack | kelp where `r_i > 0.5` bed (rock), depth 2 to 15 m (bands 0 to 5, 5 to 10, 10 to 20; section 5); fishing: kelp edge, sandbank edge, convergence lines, gaps at slack; wrack zones: gentle sheltered shores at the strandline. |
| (g) Shingle landings and sheltered coves | cove = shore point with concave shoreline (the shore curves round to face away), low `exposure`, and some depth inside; shingle where the shore is steep (`s > 0.1`) and exposure is moderate to high (stones move); sand where `s < 0.05` and the cell is sheltered or has a sand supply. Harbour: cove plus sill or narrow mouth plus hole >= 3 m. |

### 7.3 Exposure and fetch (cheap)
`exposure(p) = sum over 12 directions of weight(dir) * min(fetch(p, dir), Fmax) / Fmax`, with `weight(dir)` favouring the prevailing wind (e.g. 0.3 for west, 0.05 for others in an Atlantic seed). `fetch` is the open-water distance before land is hit (ray march on the depth field). Low `exposure` (below 0.15) gives coves and harbours; high (above 0.6) gives surf, cliffs, kelp and no harbour.

## 8 What to measure first (per seed, in the foundry)
| Check | Target | Why |
|-------|--------|-----|
| Fraction of cells within 2 m below MSL that dry at spring low | 5 to 25 percent of the sea area near land | tide matters but islands do not merge |
| Intertidal width at the home landing | 10 to 30 m rocky, 100 to 300 m sandy | landing window and tidal walk |
| Channels with a sill depth under 2 m | 1 or 2 per seed | routes that depend on tide |
| Deepest hole depth vs surrounding shelf | 2 to 6 times the shelf | scour feels real |
| Narrowest gap with `u` over 2 (scaled) | 1 per seed | a race to avoid |
| Number of coves with exposure < 0.15 | at least 1 within 2 km of home | a harbour exists |
| Number of strandline coves (gentle, lee, facing the stream) | 2 to 4 | drift has somewhere to land |
| Kelp area under 15 m on rock | positive, near but not at home | fishing and wrack choices |
| Any item stuck forever (never beaches or leaves) | none | the drift loop must close |
| Boat route from home to each island at high and low water | exists at high; at least one blocked at low | the tide window has a cost |

## 9 What is faked
- No sediment transport: beaches, bars and tombolos are laid by rule from slope, exposure and island spacing, and they do not move (storm change at era scale only, if at all).
- No real wave model: refraction is a heading nudge towards contours and an energy factor by depth and exposure; no diffraction solver.
- No hydrodynamic solution: flow is the continuity rule plus the potential field of FLOW_PASS, not a shallow-water solver; scour is painted where the rule says, not eroded by flow.
- No density-driven estuary flow, only a painted surface plume.
- No full tide physics: one cosine with a spring and neap modulation; no harmonic mix or meteorological surge (a surge rule can be added to the level later).
- Real bathymetry numbers are scarce here (I could verify few depths): every slope, `Dmax`, `k_s` and the 15 m overfall limit are TUNING until a chart dataset can be read.

## 10 Sources and licences (search extracts only)
| Source | Used for | Licence |
|--------|----------|---------|
| https://en.wikipedia.org/wiki/Gulf_of_Corryvreckan , https://whirlpool-scotland.co.uk/oldsite/facts.html | sill and hole depths | CC BY-SA 4.0 for Wikipedia; site UNVERIFIED |
| https://www.marlin.ac.uk/habitats/detail/171 | kelp depth bands | UNVERIFIED |
| https://journals.flvc.org/jcr/article/view/80119 (St Ninian's Ayre) , https://www.jncc.gov.uk/jncc-assets/GCR/gcr-site-account-2185.pdf , https://data.jncc.gov.uk/data/118b87ed-d7dd-4ea0-99ad-36ed62d2eab0/gcr-v28-coastal-geomorphology-c8.pdf | tombolo mechanism, tied islands | journal (c); JNCC probably OGL, UNVERIFIED |
| https://www.nps.gov/articles/effects-of-grain-size-and-slope.htm | slope and grain size | US public domain |
| https://www.marinespecies.org/traits/wiki/Gravel_beach | mixed beach composite profile | CC BY (WoRMS), UNVERIFIED |
| https://waves-vagues.dfo-mpo.gc.ca/Library/487-12.pdf | wave depth criteria | Canadian government, reuse terms UNVERIFIED |
| https://environment.data.gov.uk/shoreline-planning/documents/SMP17%2Fpdz18.pdf | Bryher and Tresco shores | OGL (PLAUSIBLE) |
| https://docs.iho.int/mtg_docs/rhc/BSHC/BSHC16/BSHC16_EN_C6_SE.pdf , Stockholm University theses | entrances, shallow bays | UNVERIFIED |
