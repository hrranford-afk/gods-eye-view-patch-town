# How to draw and animate the wildlife of a cool Atlantic coast (research note)
Do not put real place names into game code, assets or recipes. Real species names are fine in this note.
Status: research note for Living Islands (branch citylab/cloud-islands), 23 Nov 2026, task 21 step 1. Follows `RESEARCH_FIRST.md`. Companions: `research/WILDLIFE.md` (where animals live, counts, seasons), `ecosystem/ECOSYSTEM_TEST.md` (the headless placement numbers), `EVOLUTION_TREE.md` (wildlife decision, the turtle legend, seals leave when rubbish piles up), `research/MODES_AR_DESKTOP_HANDHELD.md` (tiers, 1:400 scale), `research/CHARACTERS.md` (bake and budget habits).

Method and limits: web SEARCH extracts only, one query per topic; no page was opened or downloaded (many hosts are blocked from the cloud, and I did not try to get round that). So every figure marked VERIFIED was read in a named search extract (the extract itself often quotes a source; I name the host). Anything I could not find is PLAUSIBLE (standard natural history or graphics knowledge), UNVERIFIED (memory) or TUNING (a game number to measure). Facts and ideas only, no text copied. Animals are counted as numbers and drawn from the count; nobody is followed.

Tags: VERIFIED / PLAUSIBLE / UNVERIFIED / TUNING as in RESEARCH_FIRST.md.

## 0 One-page summary
1. Almost everything here reads from a few shape and motion cues, not from detail. At 1:400 a seal is 5 mm long. What the eye sees is a silhouette, a colour value against rock or water, and one motion with a clear period. This note lists those cues per animal.
2. Motion splits into three cheap kinds: (a) a travelling sine along the body (fish, shark, seal shuffle, dolphin, turtle): vertex shader; (b) a flap or sweep about a hinge (wings, flippers, tail): vertex shader with a weight attribute; (c) a pose swap (seal rests, head up, slipping in; puffin stands, walks into burrow): a few baked variants or a tiny skeleton for the one hero animal. No skinned mesh for anything that is counted in dozens.
3. Groups are a drawn count from the ecosystem numbers. Slot i on a rock is shown when count > i; slots have no identity; when the count falls, the highest slots slip into the water one by one. Colonies of hundreds are a texture splat plus a few dozen instanced birds.
4. Tier allowance for all animals together is 10 percent of the scene triangle budget (25k desktop, 15k handheld high, 9k handheld low, 6k AR; TUNING, derived from the 250k / 150k / 90k / 60k scene budgets in MODES_AR_DESKTOP_HANDHELD.md).
5. First slice, the five animals that give most life for least work: grey seals on a haul-out, gannet (plunge-dive and glide), puffin (flutter flight with fish), kelp sway, fish shoal under the surface (section 9).
6. Biggest unknowns: the table-scale exaggeration that still looks right, real device cost of per-instance vertex animation on a low iPad, and exact haul-out tide heights (no source found).

## 1 What the viewer actually sees (rules that apply to all animals)

### 1.1 Size on the table
Arithmetic (VERIFIED as arithmetic): size on the table = real size / 400. Exaggerated by `E` for readability (section 12).

| Animal | Real length or span | At 1:400 | At E = 2.5 |
|---|---|---|---|
| Grey seal adult (1.65 to 2.5 m) | 2 m | 5 mm | 12 mm |
| Seal pup | 1 m | 2.5 mm | 6 mm |
| Gannet (wingspan 1.7 to 1.9 m) | 1.8 m | 4.5 mm | 11 mm |
| Puffin (wingspan about 0.5 to 0.6 m) | 0.55 m | 1.4 mm | 3.4 mm |
| Basking shark (about 8 m) | 8 m | 20 mm | 50 mm (use E = 1.5, 30 mm) |
| Otter (1.0 to 1.35 m with tail) | 1.2 m | 3 mm | 7.5 mm |
| Leatherback (shell 1.3 to 1.75 m, flipper span about 2.7 m) | 2.7 m span | 6.8 mm | 17 mm |
| Sea eagle (wingspan 2.2 to 2.4 m) | 2.3 m | 5.8 mm | 14 mm |

### 1.2 What reads at small size (PLAUSIBLE, standard art practice; matches CHARACTERS.md rule: detail under 2 to 3 px is wasted)
- Silhouette first, then value (light or dark against what is behind), then one motion, then colour. Detail last.
- Each animal gets ONE silhouette cue and ONE motion cue that survive at 16 px (listed in section 3 tables). A lineup sheet (section 14) checks this by drawing every animal as a flat black shape at 16, 32 and 64 px.
- Backgrounds decide value: seals on dark wet rock are paler; gannets are white against dark sea and invisible against white surf; puffins are black-and-white against green turf.
- Specular and wet sheen on seals and kelp (a tight highlight) is worth more than fur detail.

## 2 Shared motion rules (all numbers TUNING unless tagged)
- Every instance gets its own phase (hash of its slot id times 2 pi) and a frequency jitter of plus or minus 8 percent. Flapping or swimming in sync is the biggest tell of a fake flock (Godot docs, verified in search: "give each fish a different position in the swim cycle", https://docs.godotengine.org/en/stable/tutorials/performance/vertex_animation/animating_thousands_of_fish.html).
- Never perfectly symmetric: left and right wing phase differ by up to 0.15 cycle, one seal in three is turned 20 to 40 degrees from the group, heads are never all one way.
- Motion periods are the REAL periods, not scaled down for the model. At 1:400 a real period looks slow and calm, which suits a table; a physical model-scale rule would make wings flicker. Allow a global `timeScale` of 1.0 to 1.5 to speed animals for readability (TUNING).
- Water contact: every animal on or in water gets a contact cue: a ripple ring, a wake line, or a foam fleck; these cost nothing and cure "floating" (section 13).
- Vertical placement: animals are placed from the sea height function at their (x, z) each frame (waterline = sea surface at that point, minus a draught per animal). Hauled-out seals sit on the rock top height from the landform sampler, not a constant.

## 3 The animals, one by one
Each block: real size, proportions, colour and pattern, silhouette and motion cues, key cycles with periods, reaction to boats and people, change over time, interactions.

### 3.1 Grey seal (Halichoerus grypus) and harbour seal (Phoca vitulina)
Sizes
| Fact | Value | Tag | Source |
|---|---|---|---|
| Grey seal male, eastern Atlantic | 1.95 to 2.5 m, 170 to 310 kg | VERIFIED | https://www.pinnipeds.org/seal-information/species-information-pages/the-phocid-seals/grey-seal |
| Grey seal female | 1.65 to 2.1 m, 103 to 180 kg | VERIFIED | same; Mammal Society https://mammal.org.uk/british-mammals/grey-seal (female avg 1.8 m, 155 kg) |
| Grey seal pup at birth | 0.9 to 1.05 m, 10 to 18 kg, white lanugo coat | VERIFIED length and weight; white coat PLAUSIBLE | pinnipeds.org (same page) |
| Harbour seal adult | male 1.4 to 1.9 m, 55 to 170 kg; female 1.2 to 1.7 m, 45 to 105 kg | VERIFIED (extract, secondary) | https://www.marinebio.org/species/harbor-seals/phoca-vitulina/ ; https://mammal.org.uk/british-mammals/harbour-seal |
| Harbour seal pup | 0.7 to 1.0 m, 8 to 16 kg, swims within minutes to an hour of birth | VERIFIED | https://nhpbs.org/wild/harborseal.asp ; https://www.fisheries.noaa.gov/species/harbor-seal ; Mammal Society |
| Harbour seal resting pose "head up, tail up" (banana) | yes | VERIFIED | Mammal Society ; nhpbs.org |
Shape and colour (PLAUSIBLE, standard natural history)
- Grey seal: long, flat "Roman nose" snout, no steep forehead, widely spaced nostrils that run parallel; males dark grey to brown with pale blotches and a thick neck with scars; females paler silver-grey with dark blotches. Coat dry paler, wet darker (about 20 percent value shift).
- Harbour seal: short dog-like face, concave forehead, nostrils forming a V, small head on round body; colour tan to grey-brown with dark spots and rings; never white-coated pups.
- Body is a spindle: widest at the chest, tapering to the rear flippers; front flippers small and clawed, rear flippers fused behind like a fishtail; whiskers on pale muzzle.
Silhouette cue at small size: a slug or banana, humped back, the tail and head lifted (banana) or one flat lump. Dark shape on pale rock, pale shape on dark wet rock.
Key motions
| Motion | Period | Tag |
|---|---|---|
| Breathing at rest on land (chest rise) | about 3 to 5 s per breath with long pauses (apnoea) | PLAUSIBLE, TUNING for the game |
| Head lift, look around, then drop | 4 to 10 s random | TUNING |
| Flipper scratch, whisker twitch, head shake after wetting ("shake whiskers") | 0.6 to 1.2 s, once per 20 to 60 s per seal | TUNING |
| Land shuffle ("caterpillar"): body hump travels from chest to rear | about 1.5 to 2 s per hump, about 0.3 to 0.6 m per hump, so about 0.2 to 0.4 m/s | PLAUSIBLE, TUNING |
| Swim, surface: head up bobbing, then dive with a roll | cruise about 1.5 to 2 m/s (PLAUSIBLE); bottle (head-up float) 3 to 8 s | PLAUSIBLE |
| Slip into water from a rock | 1.5 to 3 s, rear first looks like pouring | TUNING |
Reaction (disturbance)
| Fact | Value | Tag | Source |
|---|---|---|---|
| Legal and code distance | 100 m minimum for watching; harassment at a haul-out is an offence | VERIFIED | WILDLIFE.md section 1 |
| Flight initiation distances measured for harbour seals | boats 510 to 830 m, pedestrians 165 to 260 m (one Danish reserve); 90 percent flush at 91 m in one Alaska study; boats alert from 560 to 850 m, pedestrians 200 to 425 m (glacier inlets review); mean flush 190 m for motor boats in one estuary (extract garbled) | VERIFIED as extracts, varying by site | https://www.aquaticmammalsjournal.org/wp-content/uploads/2009/12/27-02_Henry.PDF ; https://pmc.ncbi.nlm.nih.gov/articles/PMC4446219/ |
| Kayaks and canoes flush more than motor boats | flush rate 86 percent versus 74 percent | VERIFIED (garbled extract, check original) | Henry and Hammill via search |
| Weaker response while breeding | yes in one study | VERIFIED (one study) | PMC4446219 extract |
Game ladder (TUNING, built on the ecosystem's 150 m): at 1.5 D the nearest seals lift heads and stare; at 1.0 D (D = 150 m, 37 cm on the table) the group shuffles to the water edge; at 0.7 D the rest slip in; nothing swims away further than 60 m and heads reappear (periscope) 40 to 90 s later. Boats count 1.0, rowing or kayak 1.3, walkers 1.0 on a path. The ecosystem sim stays the authority on counts; the ladder is only visual.
Change over time: pups (grey: white coat, Sept to Dec; harbour: June to July) are tiny and stay near the mothers; August harbour seals moult and haul out most; tide height controls how many are on a rock (more at low tide). Seals leave when litter load passes 2.0 kg per metre (ECOSYSTEM_TEST.md) so the haul-out visibly empties over about 20 days and returns over 60 quiet days (TUNING).
Interactions: sit on rocks with deep water within 100 m; feed on fish shoals (the shoal index lowers seal slip-and-return rate: a hungry seal swims out more); gulls loiter near pups (PLAUSIBLE).

### 3.2 Gannet (Morus bassanus)
| Fact | Value | Tag | Source |
|---|---|---|---|
| Wingspan | 1.7 to 1.9 m (1.7 to 1.92 in one extract) | VERIFIED | https://www.birdlife.org/news/2021/07/06/seabird-month-northern-gannet-morus-bassanus/ ; Wikipedia via search |
| Plunge speed | about 97 km/h (60 mph) at entry; 100 to 120 km/h popular claim never measured and published | VERIFIED range, 120 UNVERIFIED | https://ocean.si.edu/ocean-life/seabirds/diving-gannets ; Wikipedia Cape gannet extract |
| Dive start height | 10 to 30 m | VERIFIED (extracts) | search |
| Depth | about 11 m from momentum, up to about 24 m with wing propulsion in an accelerometer study; popular figures 22 to 30 m | VERIFIED | https://www.ecoticias.com/en/a-northern-gannet-can-hit-the-ocean-at-roughly-54-mph-and-keep-hunting-underwater-and-ct-scans-now-show-the-sturdy-neck-bones-that-help-diving-seabirds-survive-the-impact/53180/ (secondary) |
| Nest density | up to about 2.3 nests per m2; centres 60 to 80 cm apart | VERIFIED | Nelson 1966 Ibis https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1474-919X.1966.tb07210.x via search extract |
Arithmetic check (VERIFIED as arithmetic): free fall from 20 m takes about 2.0 s and gives about 20 m/s; to reach 27 m/s (97 km/h) the bird must also dive and flap. So the visible plunge from 20 m takes 1.5 to 2 s.
Shape (PLAUSIBLE): about 90 cm long; cigar body, long pointed wings with black tips, long pointed tail; adults white with a buff-yellow head and a long pale blue-grey dagger bill and a black eye with a blue-ringed face; juveniles dark speckled brown-grey and take about 4 to 5 years to turn white (UNVERIFIED years).
Silhouette cue: a white cross (long straight wings, long neck and tail), black wingtips; in the plunge a white arrow.
Motion cycles (TUNING unless tagged):
| Motion | Period | Tag |
|---|---|---|
| Cruise: 4 to 6 steady flaps, then glide 2 to 5 s ("flap flap glide"), low over waves in wind | flap about 3 to 4 Hz | PLAUSIBLE |
| Search circle at 10 to 30 m, head down | 6 to 12 s per circle | TUNING |
| Plunge dive: fold wings back at last third; fall 1.5 to 2 s; entry splash plus white column 0.5 to 1 m; under water 4 to 10 s; surface, swallow, shake, take off with running paddle across 5 to 10 m | total 10 to 25 s | PLAUSIBLE (timeline composed from the heights and speeds above) |
| On the nest: sky-pointing bill display, bowing, bill fencing | 2 to 3 s display, every 30 to 90 s | PLAUSIBLE |
Reaction: colonies are on stacks and skerry tops; NatureScot disturbance guidance covers gannet buffers (I could not read the gannet row; see https://www.nature.scot/doc/disturbance-distances-selected-scottish-bird-species-naturescot-guidance). WILDLIFE.md uses 500 m for boats near auks and terns and 200 m for buildings; I keep those (TUNING). Birds on the nest rarely leave; birds in the air detour around a boat by 50 to 100 m.
Change over time: May to Sep ashore (WILDLIFE.md); a dense white carpet; chicks (white down) late June to Aug; leave to sea; juveniles dark. Bird flu was a real big loss (WILDLIFE.md), so colony count can drop a lot in a "bad year" event.
Interactions: needs skerry tops with no rat; feeds on mackerel and herring shoals (shoal index); plunge dives are visible on shoal cells, so a plunge puts a splash over a shoal.

### 3.3 Puffin (Fratercula arctica)
| Fact | Value | Tag | Source |
|---|---|---|---|
| Wingbeat rate | 300 to 400 beats per minute (5 to 6.7 Hz); a "600" claim is an outlier | VERIFIED | Birds of the World https://birdsoftheworld.org/bow/species/atlpuf/cur/behavior via search |
| Speed | 77 to 82 km/h (BOW) versus 88 km/h popular | VERIFIED range | same |
| Fish carried | sand eels, capelin, herring; typically about 10 to 20 in the bill; 61 claimed (outlier) | VERIFIED prey, count PLAUSIBLE | https://www.hww.ca/wildlife/birds/atlantic-puffin/ via search |
| Size | about 28 to 30 cm, wingspan about 47 to 63 cm | PLAUSIBLE |  |
Shape and colour (PLAUSIBLE): chunky, short-tailed, big triangular bill banded orange-red, yellow and grey-blue in summer; black cap and back, white face and belly; bright orange legs; flies low and straight with whirring wings and dangling red feet.
Silhouette cue: a small dark torpedo with rapid wing blur, bill big. On the ground: upright black-and-white body with orange feet and bill.
Motion cycles: flutter 5 to 6.7 Hz (small amplitude, wings stay below the body line), straight line flight at 10 to 20 m above the waves; landing with flare, feet down; waddle to a burrow entrance 0.5 to 2 s per step cluster; stands, flaps in place, shakes; pairs rub bills (billing) 1 to 3 s; dives under water with half-opened wings (they "fly" under water, PLAUSIBLE). Fish carry: row of silver sand eels hanging crosswise from the bill tip, 4 to 10 visible at small size (cheap: a strip of 4 to 8 thin quads).
Reaction: prey on by gulls (steal fish) and sea eagles; burrow birds retreat into burrow when a person comes within 30 to 50 m (TUNING), flush at sea at hundreds of metres from boats (NatureScot for auks, WILDLIFE.md).
Change: ashore April to August (WILDLIFE.md); winter plumage has a smaller, duller bill and grey face (PLAUSIBLE); in the off-season they are not drawn.
Interactions: turf slope with soil at least 0.3 m deep and no rat; food: sand eel index near sand patches. Chicks (pufflings) are never shown outside the burrow (PLAUSIBLE rule for tone).

### 3.4 Other seabirds
| Bird | Size | Look and cue | Cycle | Notes |
|---|---|---|---|---|
| Arctic and common tern | length 33 to 39 cm incl. streamers, wingspan about 76 to 85 cm (Wikipedia via search for Arctic tern; NWF gives 64 to 76 cm, so span is soft) | white with black cap, red bill, forked tail with long streamers, thin angular wings, buoyant flight, hover then dive | flap about 4 Hz, hover 1 to 3 s, dive 0.3 s, back to air in 1 s | Colony on bare shingle; swarm and dive at walkers (mob) within 50 m. VERIFIED size source: https://en.wikipedia.org/wiki/Arctic_tern ; hovering PLAUSIBLE |
| Herring gull | wingspan about 1.4 m, length 60 cm (PLAUSIBLE) | grey back, white head, yellow bill with red spot, pink legs; juvenile mottled brown | soar flap 2.5 to 3 Hz; follow boats | steals fish and chicks |
| Great black-backed gull | wingspan about 1.5 to 1.7 m (PLAUSIBLE) | black back, heavy bill | glides, perches on top | tallest on a rock |
| Shag and cormorant | shag length about 70 cm, cormorant 90 cm, wingspan 1.0 to 1.5 m (PLAUSIBLE) | all dark, green gloss, snake neck, hooked bill; stand upright with wings held open to dry | wing-drying pose lasts 5 to 20 min, flap to shake 1 s every 30 s; dive 20 to 60 s (PLAUSIBLE); swim low, only back and neck above water | stands on low rock or buoy |
| Kittiwake, guillemot, razorbill | small cliff birds | guillemot black and white, dense row on bare ledge; razorbill thick bill; kittiwake gull-like, black wing tips dipped in ink | stand in rows, flap | draw as a texture of dots plus 20 instanced birds |
Silhouette: terns thin crosses with forked tail; gulls the broad M-wing; shags a snake neck and a wing-spread X on a rock (a very strong cue).

### 3.5 Eurasian otter (Lutra lutra)
| Fact | Value | Tag | Source |
|---|---|---|---|
| Total length | male 100 to 135 cm, female 90 to 125 cm, tail 35 to 52 cm | VERIFIED | EAZA guidelines https://media.eaza.net/uploads/2016_European_otter_EAZA_Best_Practice_Guidelines_Approved_3af5e51a98.pdf via search |
| Weight | male 7 to 12 kg, female 4 to 8 kg | VERIFIED | same |
| Swim speed | about 1 m/s typical (a 10 to 12 km/h claim is high, UNVERIFIED) | VERIFIED conservative | https://ptes.org/get-informed/facts-figures/otter/ via search |
| Dive duration | mean 20 to 24 s in Scottish studies; up to about 96 s; few over 50 s | VERIFIED | https://www.researchgate.net/publication/386241799_Eurasian_Otter_Lutra_lutra_Linnaeus_1758 via search |
| Slide | belly slides on snow and mud; groups slid 16 times in under a minute; whether play or travel is debated | VERIFIED | https://en.wikipedia.org/wiki/Otter via search |
| Shell cracking on the belly with a stone | NOT found for this species (sea otters do this, a different species; do not show it as a Eurasian otter behaviour) | UNVERIFIED | none |
Shape (PLAUSIBLE): long low body, flat broad head, small ears, thick tapered tail that is as wide as the hind body; brown fur, paler throat; in water only a head, a back line and tail tip show; wet fur spikes in clumps.
Silhouette cue: a dark log with a head and a thick tail; arched bounce when diving, tail last.
Cycles: swim at the surface with undulating back (period 1 to 1.5 s, TUNING); dive arch (head down, back arch, tail lifts) 1.5 s; underwater 20 to 24 s; surface with a fish or crab, eat on a rock 20 to 60 s (chewing, head-up); roll and shake dry 2 to 3 s; belly slide down a weedy or muddy bank, 2 to 3 s at about 2 to 3 m/s (TUNING). Wash in fresh water.
Reaction: very shy, nocturnal and dawn or dusk (PLAUSIBLE); flees into the water at 50 to 100 m on a path walker, 100 to 150 m for a dog (TUNING).
Interactions: territory 4 to 5 km of shore (VERIFIED in WILDLIFE.md), kelp within 150 m raises chance; fresh water within 300 m. A pair on the screen is a mother with cubs.

### 3.6 Basking shark (Cetorhinus maximus)
| Fact | Value | Tag | Source |
|---|---|---|---|
| Length | typically about 7.9 m, large above 10 m, maximum about 12 m | VERIFIED | Wikipedia via search; NHM https://www.nhm.ac.uk/discover/basking-shark-cetorhinus-maximus.html |
| Mass | about 4 to 7 tonnes (double-decker bus claim) | PLAUSIBLE | https://www.discoverwildlife.com/animal-facts/fish/basking-shark-facts |
| Filter-feeding speed | mean 0.85 m/s while feeding, 1.08 m/s cruising mouth closed (24 percent slower when feeding) | VERIFIED (peer reviewed extract) | https://www.sciencedirect.com/science/article/abs/pii/S0022098100001830 |
| Months | Jul, Aug, Sep main (WILDLIFE.md) | VERIFIED |  |
Shape (PLAUSIBLE): huge conical snout, enormous gaping mouth about 1 m wide with gill rakers visible as pale tissue, five very long gill slits that nearly circle the head, dark grey-brown mottled back and pale underside, a tall triangular first dorsal fin (up to about 1 m above the water on an adult), a long strongly forked crescent tail with a long upper lobe, a keel and small fins. At the surface the first dorsal fin and the tail tip lobe show, with a gap of water between (about 3 to 4 m apart at 8 m length).
Silhouette cue: a single tall fin and, behind, a tail fin, travelling together in a straight line. (A white mouth patch shows in the feeding pass.)
Cycles: tail beat period 2 to 4 s (TUNING; large sharks beat slowly), body undulation small (5 percent of length), the tail sweeps laterally (side to side, unlike a dolphin's up and down); at the surface for minutes; may breach rarely (UNVERIFIED, skip). Passes its own length in about 9 s at 0.85 m/s (arithmetic, VERIFIED as arithmetic). A pass across a 100 m window takes about 2 minutes.
Reaction: unbothered by slow boats at 100 m, drops deeper if followed or a motor passes close (PLAUSIBLE; no flush distance read); WILDLIFE.md says keep slow, wide berth.
Change: May to Oct; group of 1 to 12 at a front; more at neap (TUNING).
Interactions: front cells only; a shark pass can be paired with a gull or gannet pass over the plankton (PLAUSIBLE).

### 3.7 Dolphin (common and bottlenose; WILDLIFE.md lists common dolphin as the most seen)
| Fact | Value | Tag | Source |
|---|---|---|---|
| Porpoising | leaps appear above about 4.4 to 4.6 m/s; a robot study says leaps at over 2.3 body lengths per second | VERIFIED (extracts) | https://en.wikipedia.org/wiki/Cetacean_surfacing_behaviour via search; https://www.researchgate.net/publication/255615091_Leap-Swim_Behavior_of_Porpoising_Dolphins |
| Breath rate | 1.5 to 4 breaths per minute at rest; extended inter-breath interval 10 to 40 s | VERIFIED (bottlenose) | https://seaworld.org/animals/all-about/bottlenose-dolphin/adaptations/ ; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10558176/ |
| Common dolphin length | about 2.0 to 2.5 m | PLAUSIBLE (not found in this search) | none |
| Pod size | usual 5 to 30 | PLAUSIBLE (WILDLIFE.md) |  |
Shape (PLAUSIBLE): a spindle with a curved tall dorsal fin mid-back, short beak, pale belly and dark cape with an hourglass flank pattern on common dolphins; flukes beat up and down.
Cycles: surfacing arc: come up at 20 to 30 degrees, the head and back and fin arc over in 0.8 to 1.2 s, breath blow short, dive; groups arc in staggered ripples over 2 to 4 s; at speed (over about 4.5 m/s) low leaps clear of the water 0.5 to 1 s. A resting pod surfaces every 10 to 40 s (VERIFIED range). A bow-wave ride at a moving boat (PLAUSIBLE) is a rare moment.
Reaction: approach slow boats, avoid fast; flee only if chased (PLAUSIBLE); no distance read.
Silhouette cue: a curved fin and a back arc, repeated, staggered.

### 3.8 Kelp forest (Laminaria hyperborea and relatives)
| Fact | Value | Tag | Source |
|---|---|---|---|
| Stipe length | usually up to 1 m; up to 3 m recorded; exposed sites have longer, more flexible stipes (canopy stipes 84 to 170 cm across North Sea sites) | VERIFIED | https://www.marlin.ac.uk/species/detail/1309 ; https://www.cambridge.org/core/journals/journal-of-the-marine-biological-association-of-the-united-kingdom/article/variability-in-the-structure-and-carbon-standing-stock-of-laminaria-hyperborea-forests-across-gradients-of-depth-and-wave-exposure-in-the-north-sea/7094E552626C78A1993FBC136A5574C7 |
| Frond | up to about 1 m, finger-split, no midrib | VERIFIED | MarLIN |
| Depth bands | 0 to 5 m dense, 5 to 10 thinning, 10 to 20 m park | VERIFIED | WILDLIFE.md section 7 |
| Sway period and amplitude | not found | UNVERIFIED | none |
Shape: a stiff rubbery stalk with a hand-like frond; golden-brown to olive; backlit it glows amber; a dense canopy, floor of red weeds below. Visible from above as dark amber patches under clear water; strands lie flat on a falling tide (PLAUSIBLE).
Motion (TUNING from physical sense): sway with the swell period (6 to 10 s) by about 10 to 25 degrees at the frond, plus a slow lean downstream of the tidal stream (0 to 30 degrees, stronger at spring tide), plus small flutter on the frond tips (1 to 2 Hz, 2 to 4 degrees). Phase advances along the wave direction so a patch ripples as a wave passes.
Interactions: otter chance (+25 percent within 150 m), fish nursery, wrack after storms (10 to 30 percent of cells torn out; WILDLIFE.md).

### 3.9 Fish shoals (herring, sandeel, mackerel)
| Fact | Value | Tag | Source |
|---|---|---|---|
| Herring cruising speed | 0.2 m/s migrating to about 1.1 m/s | VERIFIED (secondary) | https://en.wikipedia.org/wiki/Shoaling_and_schooling |
| Shoal density | 0.5 to 1 fish per m3 in North Atlantic herring shoals | VERIFIED (secondary) | National Geographic via WILDLIFE.md |
| Herring length | about 20 to 30 cm (PLAUSIBLE); sandeel 15 to 20 cm | PLAUSIBLE |  |
Look (PLAUSIBLE): silver flanks, blue-green backs, flash when they turn; seen from above, a dark moving patch with edges that shear; from the side a sheet of glints.
Motion: tail beat 4 to 5 Hz at about 4 body lengths per second (TUNING); shoal turns as a wave with a 0.3 to 1 s delay across the group; a predator (seal, dolphin, gannet dive) makes a hollow "bait ball" for 5 to 10 s. A shoal is a count, not fish: see section 6.
Visual: a flow-field drift plus a few boid terms is enough (below).

### 3.10 Sea eagle (white-tailed eagle, Haliaeetus albicilla)
| Fact | Value | Tag | Source |
|---|---|---|---|
| Wingspan | roughly 1.8 to 2.45 m; Norwegian averages 2.26 m (male), 2.37 m (female) | VERIFIED | https://www.hawkandowltrust.org/learn-and-discover/about-birds-of-prey/white-tailed-eagle and extracts |
| Length | 66 to 94 cm | VERIFIED |  |
| Wings flat, not V-shaped, in flight | yes (distinguishes from golden eagle) | VERIFIED | Hawk and Owl Trust |
| Flap rate | not found | UNVERIFIED | none |
Shape: huge plank-like wings with deep finger tips, very short wedge tail (white in adults), big pale yellow bill, brown body, pale head; juveniles darker with dark tail. Soaring flight: slow, level, 1 to 3 wing beats then a long glide (PLAUSIBLE; flap about 2 Hz TUNING). Circles over cliffs on thermals and cliff updrafts at 50 to 200 m (PLAUSIBLE).
Silhouette cue: a "flying door": barn-door wings, tiny tail, lazy circle that lasts 20 to 40 s per loop (TUNING).
Reaction: gulls and ravens mob it; seabird colony count falls about 10 percent near a nest (WILDLIFE.md, UNVERIFIED); it is not driven by boats at 300 m (PLAUSIBLE).

### 3.11 The tide-turtle (leatherback, Dermochelys coriacea, as the real seed)
| Fact | Value | Tag | Source |
|---|---|---|---|
| Carapace length | about 130 to 175 cm | VERIFIED | http://www.iacseaturtle.org/eng-docs/tortugas/coriacea.pdf via search |
| Front flipper span | about 2.7 m | VERIFIED (extract) | https://www.britannica.com/animal/leatherback-sea-turtle |
| Ridges | usually seven longitudinal ridges on the back (five in a swimming study) | VERIFIED, count disputed | NOAA https://www.fisheries.noaa.gov/species/leatherback-turtle ; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5046118/ |
| Mass | 230 to 900 kg (WILDLIFE.md) | VERIFIED |  |
| Speed | typical 1.8 to 10 km/h (0.5 to 2.8 m/s) by one extract; bursts higher; average cruising about 1.5 mph (0.7 m/s) | VERIFIED range, soft | https://animalia.bio/leatherback-sea-turtle via search (low quality) |
| Dives | typical 3 to 8 minutes (or about 15), max about 85 minutes; surface intervals 1 to 4 minutes after dives in one study | VERIFIED range | https://oliveridleyproject.org/sea-turtles-of-the-world/leatherback-turtle/ ; arxiv q-bio/0611056 |
Shape and colour (PLAUSIBLE): no hard shell; dark slate to black leathery back with white and pale-pink blotches and a pink spot on the top of the head; seven ridges run nose to tail; huge, long, narrow front flippers like wings, small hind flippers; blunt head with a notch in the upper jaw.
Game "giant" scale (TUNING, owner legend): the real animal is a boat-length thing at about 2 m; the legend version is 3 to 5 m shell (an exaggeration of 2 to 2.5), still drawn as a leatherback so the legend rests on a real animal. Never show it hauled out or dying.
Motion: slow flipper "flight" stroke, one downstroke per 4 to 6 s (TUNING), the long flippers go from raised to lowered through about 60 degrees, glide between, rises to the surface to breathe: a snout, a hump of ridges, a slow breath, back under in under 10 s. Glimpse design: a long dark shape and a swirl of upwelling at about 10 m deep, 1 to 3 minutes total, never close.
Silhouette cue: a long ridged back and two huge wing-flippers; read it as a "shadow under the water" with a pale spot pattern at close zoom.
Reaction: hardly any data; assume it dives out of sight if a boat is within 50 m (TUNING).

## 4 Per-animal cheap-model recipes (all numbers TUNING; there is no device measurement)
Tier names follow MODES_AR_DESKTOP_HANDHELD.md: DESK (desktop), HH-HI (handheld high), HH-LO (handheld low), AR (table). Hero = one animal at inspection zoom or a cinematic moment, drawn alone; not counted against the animal allowance.

### 4.1 Triangle budgets per animal (one animal; WebGL1-safe)
| Animal | Hero | Live DESK | Live HH-HI | Live HH-LO | Live AR | Far (any tier) |
|---|---|---|---|---|---|---|
| Seal adult | 4000 | 800 | 500 | 250 | 250 | 60 (blob + head) |
| Seal pup | 1200 | 250 | 180 | 100 | 100 | 20 |
| Gannet (flying, wings open) | 3000 | 400 | 260 | 140 | 140 | 16 (2 crossed quads) |
| Gannet on nest | 600 | 120 | 80 | 40 | 40 | 6 |
| Puffin | 2200 | 250 | 170 | 100 | 100 | 12 |
| Tern / gull | 1500 | 200 | 140 | 80 | 80 | 12 |
| Shag / cormorant | 1800 | 240 | 170 | 90 | 90 | 16 |
| Otter | 3200 | 600 | 400 | 200 | 200 | 40 |
| Basking shark | 5000 | 1000 | 700 | 350 | 350 | 80 |
| Dolphin | 3500 | 500 | 350 | 180 | 180 | 40 |
| Kelp patch (5 to 8 plants) | 800 | 160 | 100 | 50 | 50 | 2 (a texture quad) |
| Fish (one) | 300 | 24 | 16 | 10 | 10 | 1 point |
| Sea eagle | 2800 | 320 | 220 | 110 | 110 | 12 |
| Tide-turtle | 6000 | 1200 | 800 | 400 | 400 | 60 |

### 4.2 What is drawn per tier (caps, drawn counts per island window; near = full live mesh)
| Group | DESK | HH-HI | HH-LO | AR | Arithmetic |
|---|---|---|---|---|---|
| Seals near / far | 7 / 24 | 6 / 16 | 5 / 10 | 4 / 8 | DESK 7x800 + 24x60 = 7.0k |
| Colony birds drawn (gannet, tern, gull): near / far | 20 / 150 | 14 / 100 | 8 / 60 | 6 / 40 | DESK: 20 x 400 + 150 x 12 = 9.8k; HH-HI: 14 x 260 + 100 x 12 = 4.8k; HH-LO: 8 x 140 + 60 x 12 = 1.8k; AR: 6 x 140 + 40 x 12 = 1.3k |
| Shoals (fish drawn) | 2 x 100 | 2 x 60 | 1 x 40 | 1 x 30 | 200 x 24 = 4.8k; 120 x 16 = 1.9k |
| Kelp patches | 30 | 20 | 10 | 8 | 30 x 160 = 4.8k |
| Visitors (shark, dolphin pod up to 6, eagle, turtle) | any 2 | any 2 | any 1 | any 1 | shark 1000 + pod 6 x 500 = 4k |
Planned totals for DESK about 22k to 25k, HH-HI 13k to 15k, HH-LO 7k to 9k, AR 5k to 6k (checked in the test, section 14).
Rule: the colony and the shoal are the same shared meshes; draw calls are by InstancedMesh, so one call per kind per island, not one per animal. A rough ceiling is 12 animal draw calls per island (TUNING).

### 4.3 Parts that can be instanced and shared (PLAUSIBLE)
- One body mesh per species with UV atlas variants; per-instance colour tint from instanceColor (r128 InstancedMesh supports instanceColor) for coat variety; per-instance scale 0.85 to 1.15; per-instance phase in a custom InstancedBufferAttribute.
- Seal: one body, 3 pose variants (rest-banana, alert head-up, flat asleep) = 3 InstancedMeshes; pup is a scale 0.5 copy with the pale atlas; whiskers are 12 alpha-tested triangles.
- Bird wing: a symmetric half-wing mesh mirrored by scale -1 for the other side; the same meshes serve gannet, gull, tern with different scale and atlas.
- Kelp: one 6-strip cluster; vary by rotation, scale, and a hash tint.
- Fish: one 24-triangle fish with a body wave; shoals use one InstancedMesh.

### 4.4 Colour: vertex colour plus a small atlas (PLAUSIBLE)
- Vertex colour gives the broad two or three tones (back, flank, belly), baked ambient occlusion in the vertex colour alpha or a second colour; a single 256 x 256 atlas (RGB) holds species pattern (seal spots and blotches, gannet face, puffin bill bands, turtle white blotches). All animals share one 1024 x 1024 atlas (16 cells of 256) so the whole fauna layer is one texture and one material family (about 3 MB RGBA uncompressed; TUNING).
- Hero versions use the same atlas plus a 1024 normal map baked from a high mesh (as in rock_asset.py and CHARACTERS.md baking).
Colour starting points (TUNING hex, sRGB): grey seal male dark #5c5953 with blotches #b9b2a4; female #a6a091 with blotches #4f4b45; harbour seal #8a7c6a with spots #3d3630; pup coat #ece7da; gannet white #f2f0ea, head #e3c582, bill #9fb4bf; puffin back #1d1d22, face #e9e6df, bill #e4572a with #f0bd31 and #7f9aa5; shag #1f2a28 with green gloss #2f5a4c; otter #5a4632 throat #bfae93; basking shark back #6b6a63 belly #bdb9ae; dolphin back #4a525a flank #8f979c belly #d7d9d6; kelp #6e5a1f frond #8c7230 backlit #b88a24; herring back #4f7a8c flank #cdd7da; sea eagle #6b5a46 head #b7a58b tail #f1efe8 bill #d9b13a; tide-turtle #26292e with #d8cfc6 blotches and a #d08b86 head spot.

### 4.5 Skinned bones versus vertex-shader animation (with numbers)
| Animal | Method | Why | Numbers (TUNING) |
|---|---|---|---|
| Birds (gannet, puffin, gull, tern, shag, eagle) | vertex shader, weight attribute | one InstancedMesh, any count; wing is rigid-ish | flap angle A: gannet 25 degrees, puffin 18, eagle 15; lift displacement y += w * A * halfSpan * sin(2 pi f t + phase), where w = clamp(abs(x) / halfSpan, 0, 1) squared; also pull x in by cos(angle) to keep span right; glide = A set to 2 degrees and a slow 0.2 Hz breathing; plunge = a uniform that folds the wing to the body, 0.3 s |
| Fish, shoal | vertex shader | a sine along the body axis | z += amp * sin(k x - 2 pi f t + phase) * tailWeight(x); amp 0.08 of body length at the tail tip; k about 2 pi over 0.9 body length; f 4 to 5 Hz (TUNING); plus yaw from turn input |
| Basking shark, dolphin, turtle | vertex shader | long bodies, no joints needed | shark and fish: lateral sine, f 0.3 to 0.5 Hz, amp 0.04 L at the tail; dolphin: vertical sine (flukes up and down), f 1 to 1.5 Hz while swimming, amp 0.06 L; turtle: flipper hinge by weight, f 0.2 Hz |
| Seal shuffle and swim | vertex shader hump | travelling hump along the body | y += lift * sin(2 pi (s / L - t / T)) * bodyWeight(s), T 1.5 to 2 s, lift 0.05 L; swim: body wave f 1 Hz amp 0.03 L, rear flippers lateral beat |
| Otter | vertex shader plus an arch pose | dorsal-ventral undulation | y wave f 1.0 Hz amp 0.05 L; the dive arch is a shape key in time (see below) |
| Kelp | vertex shader | bend with height | for each vertex with height h (0 to 1 of the plant): x += (swayAmp * sin(2 pi t / Tswell + phaseXZ) + lean) * h^2 |
| Hero seal and hero otter (one at a time) | skinned, 8 to 12 bones, 3 to 4 clips | to hit specific beats (head turn, scratch, whisker shake, roll) | 8 bones seal, 10 otter, with 3 to 4 clips baked; one SkinnedMesh at a time |
Practical notes (PLAUSIBLE; not measured): a SkinnedMesh cannot be instanced in three.js r128, so counted groups never use bones. Vertex animation adds roughly 10 to 30 ALU ops per vertex, negligible for under 5k vertices per frame but worth measuring on the lowest iPad. Morph targets in r128 do not instance either; use pose variants instead. Use `onBeforeCompile` on MeshLambertMaterial or a small ShaderMaterial; do the animation in `begin_vertex` and recompute normals only for hero meshes (flat-shaded or baked normals fine for live). Keep the motion in a shared uniform `uTime` and one per-instance attribute `aPhase` (and `aParam` for variant, e.g. wing fold).
Source for the technique (VERIFIED as a description, not as performance): a WebGPU 16,384-fish school with vertex-animation texture and LOD https://github.com/wass08/under-the-sea (about 3 million triangles in the normal school mesh) shows the approach scales; ours is far smaller.

## 5 Looks over time
| Cycle | What changes visually | Rule |
|---|---|---|
| Tide (12.4 h) | seals on rocks: count rises as the tide falls; kelp lies flat at low water, stands at high | tide height from the shared tide clock; no per-animal logic |
| Time of day | otters dawn and dusk, gannets and puffins active by day, seals haul out more around low tide at any hour, terns and gulls all day (PLAUSIBLE) | day-part weight table, TUNING |
| Season | see WILDLIFE.md calendar: grey seal pups Sep to Dec, harbour pups Jun to Jul, auks Mar to Jul, gannet May to Sep, puffin Apr to Aug, basking shark Jun to Oct, leatherback Jun to Oct | a monthly 0 to 1 weight per group, drawn count = round(count * weight) |
| Age | seal pup white then silver; gannet juvenile dark; puffin chick never shown | a tint and scale choice by the season |
| Weather | in a gale seals sit lower and fewer, birds do not fly on the cliff face, more spray; fog hides far birds but increases plunge calls (sound note) | storm flag scales visible counts by 0.5 |
| Disturbance | seals leave over 20 days; return over 60 quiet days (ECOSYSTEM_TEST.md) | visual follows count |

## 6 Counted groups: how a flock, shoal or haul-out is a drawn count tied to the ecosystem numbers
Rule (the same for every group, never tracked individually):
1. The ecosystem sim gives, per site, a count `n` for the current day and tide (seals per rock; pairs per ledge or skerry; shoal index per sea cell; territories of otters).
2. Each site has a fixed list of slot positions from `hash(site id, i)`, generated once for the seed, ordered so that slot 0 is the most sheltered, the highest, or the near-centre spot. A slot has no identity. Draw slot i if i < n_drawn.
3. n_drawn = min(n, cap_site_tier) where the caps are in 4.2; the remainder (n minus n_drawn) is shown as a "far mass": texture dots on the rock, a pale smear, a dense group mesh. For colonies the white carpet is a texture splat whose density = n / capacity.
4. When n changes, slots at the end appear or leave one per 2 to 6 s (seals slip into the water; birds fly off in a loose burst). The arrivals and leavings are visual only: the sim's count is the authority.
5. Counted sizes (design span from WILDLIFE.md): seal haul-out 5 to 30 small, 30 to 150 medium, up to 300; seabird colonies 20 to 20,000 pairs; basking shark 1 to 12; dolphin pod 5 to 30; shoal index 0 to 1; otter 1 resident or mother and cubs.
6. Gannet check: 2.3 nests per m2 (VERIFIED) means a 100 m2 skerry top holds up to about 230 nests; at 1:400 a nest spacing of 0.7 m is 1.75 mm: draw as dots, 30 to 60 instanced birds per site.
7. Seals: ecosystem capacity is area / 4 m2 each (TUNING, ECOSYSTEM_TEST.md). A 4 m2 slot is 2 m by 2 m, so seals do not overlap; draw seals with a 1.2 m minimum spacing (so on the table 3 mm) and rotate randomly.
8. Fish: shoal index s in 0 to 1 gives drawn fish = round(s * N_tier) where N_tier is 100, 60, 40, 30 (4.2). A shoal's centre follows the flow field (0.3 to 1 m/s plus own motion up to 0.5 m/s, WILDLIFE.md UNVERIFIED); fish have a slot, a phase and an offset from the centre drawn from a seeded shape (an oblate blob, 6 to 15 m wide); a flow-field push plus 3 boid rules (separation, alignment, cohesion) run on the CPU for only the 100 drawn fish (a fraction of a ms; TUNING) or entirely in the shader as a noise-driven offset (cheaper, no CPU).
9. No animal ever stores a lifetime. A seal seen twice is a coincidence of slot position, which is intended.

## 7 Interactions with boats, people and other layers
| Event | What the animals do | Source or tag |
|---|---|---|
| Boat enters 1.5 D of a haul-out | seals alert, heads up | TUNING |
| Boat at D | seals shuffle to the water edge | TUNING |
| Boat at 0.7 D | seals slip in; heads pop up at 40 to 90 s; ground count to the sim is reduced by disturbance D as WILDLIFE.md | TUNING |
| Walker on a path within 200 m of a colony | gulls and terns mob; gannets stay; puffins retreat into burrows | PLAUSIBLE |
| Dog | otter and seals flee at a bigger distance | PLAUSIBLE |
| A fishing boat over a shoal | shoal splits or sinks; gulls follow the boat | PLAUSIBLE |
| Dolphins near a moving boat | a short bow ride, visible only if the boat's speed is over about 4 knots (2 m/s) (PLAUSIBLE, UNVERIFIED speed) | |
| Litter on the beach | seals leave in about 20 days (visual: fewer slots, grey rock) | ECOSYSTEM_TEST.md |
| Party bot with speaker | seals leave (EVOLUTION_TREE.md) | owner idea |
| Storm | wrack, cut kelp, seals gone for a day, birds sit on the lee side | WILDLIFE.md |

## 8 Sound cues (notes only; no real recordings; original procedural sounds)
Sound is an audio mode, volume off by default, and AR and handheld aware (EVOLUTION_TREE.md audio note). The notes below are descriptions of what to synthesize, not recordings.
- Seal: low moaning croon, a nasal bark, breath puffs; pups a thin wail. A haul-out is a murmur of overlapping calls; fewer seals, fewer voices.
- Gannet: harsh rattling "arrah" in the colony; at sea silent. Splash of a plunge: a short noise burst with a low thump.
- Puffin: a low "arr" growl, mostly in the burrow (very quiet); wings a buzz.
- Terns: a sharp "kee-arr" and a grating call; gulls the classic keening and laughing call; shag a grunt.
- Otter: a high thin whistle (cubs), chirps; mostly silent.
- Basking shark: silent; a faint water-sheet sound; add a gull call.
- Dolphin: clicks and whistles heard only close up; blow puffs at the surface.
- Kelp and sea: a sloshing, a creak of rubbery stalks (if close), the surf bed under all.
- Sea eagle: a barking "kyow-kyow" and a high yelp, far away.
- Tide-turtle: a long, breath-like exhale at the surface and a low swirl; no call. For the legend, a quiet bell or a humming rhythm that the settlers talk about, but keep it a quiet cue.
Rule: the number of audible voices follows the drawn count (log scaled), and every sound has a distance fall-off and a random gap; none is placed on a loop.

## 9 First slice: five animals with the most life for least work
| # | Animal | Why | Method | Budget (live DESK / HH-LO) |
|---|---|---|---|---|
| 1 | Grey seals on a haul-out | the owner's most visible story (seals leave when rubbish piles up); counted by the sim already; slow cheap motion; a pose-variant meshes plus shuffle shader | 3 pose variants, a hump shader, slot placement | 800 / 250 tris each, cap 7 near + 24 far |
| 2 | Gannet flight and plunge | the one dramatic moment on a calm table; white on dark sea reads from far; wing flap is one shader | shared half-wing mesh, vertex flap, a plunge uniform | 400 / 140 tris |
| 3 | Puffin with fish | the most charming silhouette; 1 flight cycle plus a perched pose; a bill row of fish | vertex flutter, small atlas | 250 / 100 tris |
| 4 | Kelp sway | covers a big area of water with life at near-zero cost; shows tide and swell | one cluster mesh, vertex sway, the ecosystem kelp cells | 160 / 50 tris per patch |
| 5 | Fish shoal under the surface | links to the shoal index; makes the sea alive and ties birds, seals, dolphins together; cheap flow-field motion | InstancedMesh fish, body sine, flow-field | 24 / 10 tris x 100 / 30 fish |
Next after the five: terns and gulls (reuse bird meshes), basking shark pass (single hero event), dolphin arc, otter, sea eagle, the tide-turtle glimpse (as a dark shape under the water, almost no mesh at first).
Why the others wait: the otter needs a hero pose set and is a shy rare cameo; the shark and dolphin need a front cell; the turtle is a rare legend and should stay a shape and a swirl until the rest works.

## 10 Scale exaggeration at 1:400 and in AR (section 1.1 table; TUNING)
- Table (desktop, handheld): animals E = 2 to 3 for those under 3 m (seal, gannet, puffin, otter, dolphin, turtle), E = 1.5 for the basking shark, E = 1.5 for the eagle. Keep E the same for every instance of a species.
- Consistency rule: people, boats and animals must keep their real size ratios. If people and boats are not exaggerated, animals above E = 2 will look like toys near a person; if the game exaggerates people and houses by some factor, apply the same factor to the animals first and then the animal-only factor on top, capped at 1.5.
- AR: a 1 m table is the same 1:400 to 1:200. At 0.7 to 1.2 m footprint, the table-scale E applies; if the user pinches to a larger scale (0.3 to 3 m), E falls with it (E_eff = max(1.2, E * 0.7 / footprint_m)) so wildlife is not blown up to cartoon size (TUNING).
- Contact cues scale with E too: wake lines, ripple rings and splash columns at gannet dive points.
- Distances (the disturbance D of 150 m) are NOT exaggerated: they are real metres in world units.

## 11 Biggest "could not verify" list
- Haul-out tide height and hours exposed (WILDLIFE.md: none found; still none).
- Gannet wingbeat rate, glide ratio, flight height range; sea eagle flap rate; kelp sway periods and amplitudes; tide-turtle flipper stroke period; basking shark tail beat period; otter dive bounce period.
- Real distances of flushing for gannet, puffin, basking shark, otters, dolphins from boats; the NatureScot guidance page was found but its table rows for those species were not shown in the search extract.
- Seal haul-out shuffle speed; whether a grey seal's resting breath period is 3 to 5 s (guessed).
- Eurasian otter shell cracking (not found; sea otters do it, our otter does not).
- Common dolphin length; porpoising speed for common dolphin.
- Colour of pups and juvenile plumages: standard but not read in this search.
- Any numbers marked TUNING in section 4 (triangle counts, vertex animation costs) are untested on a real iPad, phone or headset (the MODES note says all our measurements so far are in software GL).

## 12 What is faked
| Faked | Reality |
|---|---|
| Scale (E = 2 to 3 at the table) | real animals at 1:400 are millimetres |
| Individual animals | counted slots; no individual lives; no lifetime |
| Haul-out slot packing, flee ladder | real distances vary by site and animal; the sim keeps one D |
| Gannet plunge timeline | composed from heights and speeds; depth and underwater time not rendered |
| Seal shuffle, otter slide, shark and turtle tail and flipper periods | numbers are guesses (TUNING) |
| Underwater (turtle, shoal, shark) | a darkened, simplified view; no refraction beyond the sea shader |
| Colonies | texture splat plus a few dozen birds, not hundreds |
| Tide-turtle size | legend scale about 2 to 2.5 times a real leatherback |
| Sound | procedural descriptions only |
| Wildlife death, disease, stranding | not shown; bird flu is acknowledged only as a count drop |

## 13 Common mistakes (check each in review)
1. Too symmetric: all seals face the same way and lie in a tidy row; fix: random heading plus 20 to 40 degrees spread, groups of 2 to 4 touching, a few loners.
2. Flapping in sync: every gannet or fish has the same phase; fix: a per-instance phase and 8 percent frequency jitter.
3. Floating on water: seals, shags or otters hover above the surface or sit on top without a waterline; fix: a draught per species (seal 40 percent submerged when swimming, shag only a back, otter a head and back line), plus a ripple ring or wake and a contact shadow.
4. Seals not on a rock top: placed on wrong terrain or a constant height; fix: sample the landform at the slot, only on cells marked as haul-out in the sim.
5. Scale: a puffin as big as a seal, a basking shark the length of a boat; check the section 1.1 table; at table scale keep ratios.
6. White gannets lost on white surf: needs value contrast; shade the sea behind, avoid pure white, use a slight warm tint.
7. Birds flying backwards or sideways: forward direction equals velocity direction; bank into turns (10 to 25 degrees), pitch with climb.
8. Constant wing flap: real gannets and gulls glide a lot; eagles soar; only puffins and shags flap continuously.
9. Dolphin tail wave sideways: cetacean flukes move up and down; fish and sharks side to side.
10. Seal head always up: on land they rest head-down or flat; head-up is an alert.
11. A seal that vanishes between frames: leaves must show a slip, 1.5 to 3 s.
12. Kelp rigid or all in sync: add per-patch phase from position along the wave direction.
13. Shoals as rectangles or all pointing one way: use an oblate blob, a turn wave, and glints.
14. Too many bird types in the first slice: fewer animals but better.
15. Real names in code or assets: use ids like `seal_grey`, `bird_gannet`, `sea_shark_basking` (species names are generic; do not tie to places).
16. Showing the tide-turtle too often or too close; it must stay a rare glimpse (3 to 8 percent per qualifying day, WILDLIFE.md).

## 14 Checklist (visual and behavioural, to judge against reality)
Visual:
- At 16 px silhouette: can you tell seal, gannet, puffin, shag, otter, shark fin, dolphin fin, eagle apart? (black-on-white lineup)
- Each animal has its one silhouette cue (seal banana, gannet white cross, puffin torpedo with big bill, shag wings-spread X, shark fin plus tail, dolphin curved fin, eagle barn door).
- Value contrast against the backdrop at tide, day and dusk.
- No animal on wrong terrain; no seal below the tide line while counted ashore; birds on skerry tops, not in the sea.
- Waterlines and contact ripples visible; no floating.
- Phases not in sync (check a video of 30 seconds).
Behavioural:
- Drawn count equals sim count within the tier cap; leavers are visible.
- Reaction ladder matches 150 m: nothing flees at 300 m; all gone at 100 m.
- The tide-turtle appears at most once a season.

## 15 Build plan and tests
### 15.1 Files (proposal; do not build until the owner agrees; no real place names)
- `animals/animal_specs.json`: per-species sizes, colours, periods, caps, pose lists (all from this note).
- `animals/animals.js`: the slot generator, drawn counts, instanced meshes, vertex-animation material, reaction ladder; reads site counts from the ecosystem output and the landform sampler.
- `blender/animals_build.py`, `blender/animals_lineup.py` (a lineup like `tree_lineup.py` / `trees-lineup.png`): builds low meshes, bakes AO and atlas, renders a lineup sheet.
- `tests/test_animals.py`: headless checks below.
### 15.2 Headless checks (python 3, no screen)
1. Placement matches the sim: for each seed, load the ecosystem output (`ecosystem/wildlife_place.py` data) and the slot generator; check each drawn animal's site id exists, and drawn count per site is min(count, cap) for every tier.
2. Terrain rules: seal slot on a haul-out cell and above low-water level; gannet, gull, tern on skerry-top cells (tern on shingle cells, no ground predator); puffin on turf cells with soil at least 0.3 m; shag on a rock ledge within 10 m of water; otter on rocky shore within 150 m of kelp or fresh water; shark and dolphin in water at least 6 m deep and in a front cell; turtle in a bay at least 15 m deep and only under the legend rule; shoal in sea cells 10 to 60 m deep; kelp on hard bed 0 to 15 m. Any violation fails.
3. Budgets: parse each exported mesh (GLB or JSON): triangles at or under the table (4.1) for each tier; sum of drawn triangles per tier at or under 25k / 15k / 9k / 6k for the busiest seed of 60; draw calls at or under 12 for animals per island; the atlas size at or under 1024 squared.
4. Determinism: same seed and same day produce the same slots and counts; changing the day changes only counts, not slot positions.
5. Counts: every non-zero count is shown; zero shows none; the total never exceeds count; the colony splat density equals n / capacity within 5 percent.
6. Motion data: per-instance phases are spread (standard deviation over 0.25 of a cycle); frequencies lie within the table range.
7. Forbidden words: no real place names in code or assets (the repo already has this check in the ecosystem tests; reuse it); no private paths.
8. Seasons: outside the month window of a species the drawn count is 0.
### 15.3 Visual checks
- Lineup sheet: every animal, hero and live tier, side by side, with a ruler in metres and the 1:400 size in mm, plus the same set as black silhouettes at 16, 32 and 64 px, light and dark backgrounds. Compare with a reference (photos, not copied into the game). Look at: banana pose, wing pose, tail, scale ratios.
- Haul-out sheet: one rock at tide low, mid, high, with counts 0, 5, 30, 120.
- Gannet strip: 8 frames of the plunge dive.
- A 20 s clip of a haul-out to see phase variety.
### 15.4 Order of work
1. `animals_lineup.py` with simple blocky meshes of the five first-slice animals (a day).
2. Slot generator and counts (reads the sim).
3. Vertex animation material (wing flap, fish wave, kelp sway, seal hump).
4. Baked hero versions for seal and gannet.
5. Reaction ladder.
6. Add terns, gulls, shag, then visitors.
Estimates are TUNING.

## 16 What to ask the town's local models to draft (text only)
These are text drafts; the numbers in them are never trusted. A human or the rules check them against this note. Prompts must not include real place names, and local models must not draft numbers for the simulation.
- For each animal: six behaviour beats of one to two sentences, each with a trigger (tide, season, boat distance), a duration in seconds range, and a mood (calm, curious, alarmed); the rules then pick the numbers.
- Seasonal moments (one card per month): "first pups on the low rock", "the puffins come back", "the gannets circle the stack", "shag drying wings on the quay post", "the shark pass at slack tide". Each card is 40 words, hopeful tone, no cruelty.
- Settlers' sayings about the tide-turtle (ten short lines), and rumours that differ by family; no claim that it is real or unreal.
- Names for the island's seal rocks and skerries in the game's invented language (no real names).
- Alternate captions for the lineup and the field guide.
- A check list of what a child would notice about each animal.
Reject outputs that give distances, counts, speeds, or real names.

## 17 Sources used (search extracts; none opened)
Seal sizes: pinnipeds.org grey seal; Mammal Society grey and harbour seal; marinebio harbour seal; NOAA harbor seal; nhpbs harbor seal. Seal flushing: Henry and Hammill (aquaticmammalsjournal.org); PMC4446219 (Alaska).
Gannet: BirdLife; Smithsonian Ocean; ecoticias on the CT scan and accelerometer depth; Nelson 1966 Ibis abstract; Wikipedia Cape gannet.
Puffin: Birds of the World behavior page; hww.ca.
Basking shark: ScienceDirect swimming speeds abstract; Wikipedia; NHM; Discover Wildlife; HWDT.
Otter: EAZA guidelines; PTES; ResearchGate Eurasian otter review; Wikipedia Otter.
Dolphin: SeaWorld adaptations; PMC10558176; Wikipedia Cetacean surfacing behaviour; ResearchGate leap-swim.
Kelp: MarLIN species 1309; Cambridge JMBA article on the North Sea forests.
Sea eagle: Hawk and Owl Trust; other extracts.
Turtle: NOAA; Britannica; IACS; PMC5046118 on dorsal ridges; Olive Ridley Project; arXiv q-bio/0611056.
Technique: https://github.com/wass08/under-the-sea ; Godot docs on vertex animation of fish.
Terns: Wikipedia Arctic tern (via search).
