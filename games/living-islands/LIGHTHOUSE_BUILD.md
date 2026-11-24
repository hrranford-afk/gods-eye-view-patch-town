# Lighthouse and fog: the minimal build (task 18)

Switch: `islands_look.html?light=1` (default off). Without it nothing changes: default hash `8d962c0c`, 88,790 triangles, no `__li.light`, no extra script. Research: `research/LIGHT_FOG_AND_LIGHTHOUSE.md` (its section 18 minimal list). No real place names are used.
Tags: VERIFIED (a definition or standard value), PLAUSIBLE (standard practice), COMPUTED (checked by a test here), TUNING (a game number I chose), UNVERIFIED (not checked).

## Files
| File | What |
|---|---|
| `light_range.js` | pure module, no DOM, no clock, no `Math.random`: `visibleNm`, five rungs, eight flash characters, `lightState`, `arrivalSeen`, `landfallP`, `wreckP`, `arrivalsFor` |
| `islands_look.html` | block "lighthouse and fog" (about 230 lines) plus 6 hooks (loader line, `LTON`, `ltBuild`, `ltFrame`, HUD init, API entry) |
| `tests/light-range-test.js` | node, pure: 44 checks, 9 s |
| `tests/light-page-test.js` | playwright: 59 checks |
| `tests/light-render.js` | `shots/light-sheet.png` (3 x 4) and `shots/light-1..4.png` |

`&light=1` also loads `macro_sea.js` and `weather.js` as pure modules (not switched on): the first for the keyed boat arrivals, the second for a seeded visibility schedule. Switching them on is still `&macro=1` and `&weather=`.

## 1. light_range.js
- `visibleNm(I, hLight, hEye, visKm) = min(2.08 (sqrt hL + sqrt hE), Allard range)`, Allard solved by bisection on I T^d / d^2 = 2e-7 lux with T = 0.05^(1/V). COMPUTED: the note's 64-value table (8 intensities x 8 visibilities) within 1.83 percent, the section 7 ladder within 1.97 percent (the note rounds to two digits), and an independent solver for the five rungs at 20, 10, 5, 2, 0.5 km within 0.05 percent.
- Rungs (note section 7, TUNING): fire 300 cd at 25 m, post lamp 10 cd at 8 m, small lens 5 kcd at 22 m, big lens 80 kcd at 35 m, relic LED 100 kcd at 20 m. Range in nm at 20 / 10 / 5 / 2 / 0.5 km: fire 7.45 / 5.09 / 3.32 / 1.78 / 0.63; post 2.65 / 2.12 / 1.58 / 0.98 / 0.40; small 12.7 / 8.37 / 5.08 / 2.54 / 0.83; big 15.25 / 12.05 / 7.01 / 3.34 / 1.04; relic 12.24 / 12.24 / 7.17 / 3.40 / 1.06.
- Eight characters as on/off tables (Fl 5 s, Fl(2) 10 s, Fl(3) 15 s, LFl 10 s, Oc 8 s, Iso 4 s, Q, Mo(A) 12 s) plus a fixed light for fire. Two corrections to the note, both tested: the note's Fl(3) 15 s adds up to 16 s, so the dark is 10.5 s; Q uses 60 a minute (1 s cycle, 0.4 s light), the note gives two figures. `lightState(char, tHours)` returns on, level (0.05 s fade at each edge, 0 for hard on/off), second in the cycle, flash index. The page feeds it real seconds so the pattern keeps its printed speed at any clock speed.
- `arrivalSeen(rung, visKm, distNm, {night})`: by the light when lit (night, or visibility under 5 km), else by the daylight silhouette of a 40 m island, else not seen. `landfallP = pBase (1 + k)` if the light saw the boat (k 1 to 3 by rung, pBase 0.35, TUNING), pBase for a daylight sighting, 0 unseen. `wreckP`: unmarked mouth at night or in visibility under 2 km 0.05 to 0.2 (more at low water and in fog), marked 0.01.
- `arrivalsFor(seed, h0, h1, opts)`: boats = `macro_sea.js` keyed `boat` events (day only, `seed:boat:slot`) plus a seeded list of boats caught out at night (`seed:nboat:slot`, 0.02 a slot by day, 0.05 by night; TUNING, my extension because macro's boats never arrive at night). Each draws its final distance (1 to 20 nm, log-uniform), landing and wreck from its own key, so a window cut from a longer one gives identical events. A wreck gives a salvage event at 07:00 solar next morning (`key:salvage`). Measured over 200 seeds x 30 days: none 811 landings of 8,959 boats, post 1,733, fire 3,038, small 4,286, big 4,736, relic 4,536; dense fog lands none (the best light reaches 0.9 nm, boats start at 1 nm); mist (2 km) takes 55 percent of the fire's landings and 32 percent of the big lens's; unmarked mouth 7.3 percent of arrivals wrecked, marked 0.8 percent.

## 2. The page (`&light=1`)
Parameters: `lrung` (0 to 4 or id, default big lens), `lchar` (character id; default by seed within the rung), `lightnight=1` (lit without the clock), `lring=1`, `lvis` (km, overrides the weather), `lfreeze` (flash time in seconds, pictures and tests), `lyaw` (beam angle, degrees), `lightar=1` (AR profile), `lmark=1` (a lamp on a post at the jetty tip, marks the mouth), `lh` (game hour without the clock), `lx`, `lz` (site override).
- Site: a pure scan of the page's own height function for the most exposed headland: ground above 1.1 m, open water on at least 30 percent of a 15 m ring, gentle slope, clear of trees, rocks, houses, camp, jetty; score = openness + height + exposure (the world's own exposure map in world mode). Default table: the grass island at (4, -50); world 153 (-82, 54); world 5 (-30, 104). The plinth reaches down to the lowest ground round the footprint so the tower never floats.
- Tower: original simple parts merged into one mesh with vertex colours (about 400 triangles at big lens): plinth, banded shaft (white with two red bands, or stone with a white band), gallery with railing, lamp room with eight mullions, roof and ball, plus a glowing lens dome (a separate mesh, colour driven by the flash). Other rungs: a stone cairn with an iron basket and flickering flame sprites (fire), a timber post with an arm and a lantern box (post lamp), a pale mast with orange bands, panel and LED head (relic).
- Light: a core sprite and a halo sprite (additive, `fog:false`), halo radius 3.4 m clear to 11 m in fog; both fade with the camera's distance by exp(-3 d / V). Beam: a camera-facing axial billboard (one facing for the whole card, three vertices across so the hot core stays straight) plus a wide soft haze card, alpha from visibility (0.07 clear, 0.95 fog), along-length fade exp(-3 d / V) with a 2 percent floor, length min(1.5 V, 300 m); a streak of light on the sea along each beam; the lamp flares when a beam points at the camera. Big lens and relic have two beams 180 degrees apart, small lens one, fire and post none. The beam turns once per character period (6 to 14 s) and its brightness follows the character. Weather vis comes from `WXR.state.vis` (the weather pass), else 40 km, else `lvis`. One `PointLight` (high tier) lights gallery, rock and sea in the flash.
- Lit rule: in clock mode from sunset (full at sun -3 degrees) and by day when visibility is under 5 km; without the clock only with `lightnight=1` or in fog. Window glows are the clock's.
- Ring of sight: a flat dashed ring with eight ticks and a faint fill on the sea, centred on the table, radius `0.82 R sqrt(range / 16 nm)` (TUNING, a compressed scale: the real range is thousands of table widths), plus a label with the range. Toggle in the HUD or `lring=1`.
- HUD: a chip `Big lens · Fl(2) 10s` with `range 15 nm · vis 40 km`; buttons Rung, Pattern, Ring, Lamp (auto, on, off).
- API `__li.light`: `state()`, `rangeNm()`, `visKm()`, `setRung(i)`, `setChar(id)`, `setRing`, `setNight`, `setVis`, `setFreeze`, `setYaw`, `view(name)`, `chip()`, `parts()`, `tris()`, `arrivals(h0, h1, {rung, marked})`, `arrivalSeen(visKm, distNm)`, `forceSalvage`, `hide(part, bool)`, `dbg()`.
- Arrivals and the salvage crate: the page asks `arrivalsFor` for the last 26 game hours (cached per quarter hour); a wreck puts one small crate sprite drifting by a reef (a 0.2 to 1 m deep spot 14 to 45 m off the jetty tip) from 07:00 for 24 hours. Only a data event and a sprite, no figures.

## 3. Numbers
| Item | Value | Tag |
|---|---|---|
| default page | hash `8d962c0c`, 88,790 triangles, 0 errors | COMPUTED |
| `&light=1&clock=1` high, night | 90,662 triangles (+880 over `&clock=1`); hash unchanged | COMPUTED |
| low | 62,210 (+466) | COMPUTED |
| AR profile | 90,168 (+386) | COMPUTED |
| world 153 + clock + light | 56,163 | COMPUTED |
| world 5 + life + clock + light | 102,832 (budget 150,000) | COMPUTED |
| tower triangles by rung | fire 160, post 106, small 350, big 386, relic 140 (+ dome 224 high) | COMPUTED |
| beam in fog, pixel test | beam region +6.6 of 255 with the lamp on in fog; the beam alone adds 6.0 in fog against 0.56 in clear air | COMPUTED |
| frame time on a device | not measured (software GL only) | UNVERIFIED |

Tiers: high = tower with railing, dome, point light, blade plus haze card per beam (two beams for big lens and relic), 0.05 s flash fade, about 2 to 4 visible sprites; low = on/off flash, two crossed cards, no point light, simpler tower (9 segments); AR (`lightar=1`) = no dome, no point light, two crossed cards only, beam capped at 0.4 of the table width, halo 60 percent. Additive overdraw is the cost, not triangles. Sprites stay under 20 on every tier (test).

## 4. What is faked
The earth's curve and the weather are a number, boats are never simulated at 10 nm, the arrival is a draw; the tower is drawn at 0.45 of the rung's true height (11 to 17 m against 22 to 35 m, the range uses the true height); the beam is exaggerated (about 10 degrees wide against 3 to 6) and a lens flash is longer than a real one; the beam turns slower than a real lens and its pattern is the character's, not one flash per panel; fog is the weather pass's density and visibility, no droplet model, no multiple scattering; one white light, no colour sectors, no fog bell (so dense fog lands nobody); the relic's power is unexplained; intensities, the 300 cd fire and the 2e-7 lux threshold are tuned or remembered; night boats and landing probabilities are my numbers; the ring scale is compressed; windows are the clock's hash, not people.

## 5. AR notes
The lighthouse is geometry and sprites only, no post bloom. `lightar=1` is the profile: crossed short cards (vertical and flat, so the beam shows from any side), no dome, no real light, beam length 0.4 of the table width, halo 60 percent. Still to do on a device: a stronger emissive boost against a bright room, clean 30 fps flash timing, a table-scale tower (a 35 m tower is 7 to 17 cm on a 1:200 to 1:500 table).

## 6. Pictures and what I changed after looking
`shots/light-sheet.png` (3 x 4): 1 dusk, clear air; 2 night, clear air; 3 fog night; 4 to 7 fire, post lamp, small lens, big lens; 8 ring of sight in 2 km mist; 9 relic beacon; 10 harbour at night with windows and a marked mouth; 11 world 153 at night; 12 the morning after a wreck. `shots/light-1..4.png` (1200 x 800): fog night, dusk, harbour, world 153. Iterations:
1. The point light (intensity 14 to 90 with a linear cutoff in this three.js version) blew the island out to flat yellow-white; cut to 0.8 to 2.2.
2. The beam was a flat, kinked ribbon: soft discs along it read as a string of beads at any count (4 to 10); replaced by a wide haze card. The hot core then zigzagged on a trapezoid split on its diagonal; the card now has three vertices across so the centre line is a mesh edge. The card faces the camera as one axial billboard and fades when seen end-on.
3. The ring of sight was a heavy glowing band with blobs for ticks and sat on the table rim: radius scaled to 0.82 of the table, alpha cut to 0.62, ticks made a few widths long, label added.
4. Fire and small lens tiles: the small lens showed a dead lamp (flash off at the frozen time) and the fire flooded its island; frozen times chosen per character, fire light cut to 0.8.
Still weak: the tower is dull blue at night (moon-lit Lambert, no rim light); the world 153 tile shows a small lamp low on a hill; the marked-mouth lamp is tiny at that distance; the crate is two pixels of drama.

## 7. Honest gaps, ranked
1. Not run on a device: frame time, additive overdraw of the fog halo and haze card on a tablet are unknown.
2. No fog bell or horn: dense fog lands no boat at all, which is stronger than the note's design (the bell is the missing rung).
3. Arrival numbers (night boats, pBase 0.35, k, wreck chances) are tuning; macro's own boats never come at night so the night boats are an extension with their own keys.
4. The weather the arrivals use is the seeded `weather.js` schedule, not the weather the page is showing (a forced `&weather=fog` does not change who arrives); `visKm` can be passed to the API.
5. Site choice favours open headlands; in world 153 it is low (1.7 m) and small in frame; no hand placing or per-world override beyond `lx`, `lz`.
6. Tower look: no lit-from-the-lamp rim, no glint of the lens by day, no keeper or smoke, one white light.
7. The ring is centred on the table, not on the lighthouse, and its scale is compressed.
8. The wreck crate position is a shallow-water scan, not the real reef of the seabed pass (`&seabed=1`).
