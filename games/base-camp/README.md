# Base Camp (working title)

A tiny living colony that settles the **real surfaces of your room**. Scan your desk, shelf and floor, tap a surface to found a colony, then *help* the little people: they plant trees, tend farms, build huts and a well on their own, and they keep growing while you are away. A Tamagotchi, but it is a village, and it lives on your desk.

One file: `index.html` (three.js r128 from cdnjs). No build step. Needs `webxr-polyfill.js` and `THIRD_PARTY.md` next to it (copied from Baguettes & Ballistics).

## How to play

1. **Start in AR** (HelloXR / WebXRKit app on iPad) or **Practice room** (any desktop browser, a virtual floor, desk, shelf and windowsill).
2. **Scan.** Sweep the iPad slowly over the room. Every flat surface gets its own soft colour and a label: *Floor - plains*, *Desk - meadow*, *Shelf - cliffs*, *Sill - lookout*, *Perch - grove*. Tap **Done scanning**. (Practice: **Auto-scan**, or drag to look and W/S to walk.)
3. **Settle.** Tap a zone. Three settlers arrive with a tent.
4. **Nurture.** The colonists have needs (food, water, rest, happiness) and look after themselves: they plant seeds, tend trees until they grow up, harvest farms, build huts, a farm, a well, gather wood and fruit. You help:
   - **Seeds**: tap the ground to plant one. **Water**: touch and hold. **Build**: pick a blueprint (hut, farm, well, lookout), tap where; they build it. **Cheer**: tap a colonist (they jump, hearts, happier; tap one to see how they feel).
   - **Requests**: when a colonist is stuck they ask in a speech bubble and a card at the top right ("We need water!", "A seed please!", "Too hot. Shade, please?", "Brr! Some firewood?", "Build us a cable car!"). Press **Give** (or tap the colonist). Happiness goes up.
5. **Expand.** When a colony is *thriving* (4+ settlers, 3 buildings, 2 grown trees, good mood) it dreams of other places. Pick **Cable car** and drag a line from your settlement to another zone. The colonists rig a cable car (6 wood), a gondola carries settlers across and a new colony starts there with that zone's specialty (floor: farmland, desk: village, shelf: orchard, sill: lookout, small perch: a lone grove).
6. **Come back later.** Everything is saved (time-stamped) in the browser. On return: scan again, then *"Where was your colony?"* Tap the zone, slide and turn the colony to line it up with the real surface, **Lock it in**. While you were away the colony kept growing (catch-up, capped at 90 minutes).

**Time x1 / x6 / x30** speeds the colony up (for testing, or impatience). **Sound** toggles the gentle synth sounds.

## The real world drives it

- **Light** (AR: ARKit's ambient light via the polyfill's `getGlobalLightEstimate`; practice: the Sun slider). Bright room = sunny day: plants grow faster, colonists get hot and thirsty and ask for shade. Dim room = slower growth, they get tired sooner.
- **Time of day** (device clock; sunrise 7, sunset 18 by default, or the real sunrise/sunset once weather is on). At night colonists go to bed, lanterns and windows glow, **trees do not grow**.
- **Weather** (optional, asked once with a friendly card): rain waters crops and sends colonists into their huts (rain particles); heat (over 22 C) makes them thirsty; cold (under 3 C) slows growth and makes them want firewood; wind (over 10 m/s) sways trees and pauses the cable car; cloud dims the sun. Practice mode has a Weather picker (auto, clear, cloudy, rain, hot, cold, wind) and an Hour slider.
  - Privacy: the app rounds your location to 1 decimal (about 10 km) *before* any request and stores only that. Refuse and nothing is asked again; or pick a town (Worcester, London, ...). Weather is fetched at most every 30 minutes and cached.
  - Source: [Open-Meteo](https://open-meteo.com) (no key). **Its free API is for non-commercial use: a paid plan or another provider is needed before the game is sold.**

## Scan and zones (how "pick up areas that can be colonised" works)

Runtime facts (WebXRKit / HelloXR): only viewer-space hit tests (ARKit raycasts), camera pose per frame, no anchors, no plane geometry, no meshes, no world maps. So:

- Five hit-test rays per frame (centre plus four off-centre) give 3D points.
- Points are clustered by **height** into bands (within 3 cm, bands under 4 cm apart merge); each band has its own 2 cm occupancy grid (5 m x 5 m), painted as an overlay, patchy-scan holes closed (grow/shrink 5 cm).
- Each **connected region over 0.05 m2** is a **zone**. Zone ids survive re-scans (label voting).
- Classification by height above the lowest zone and size: FLOOR (lowest, 1 m2+; or any zone within 15 cm of it), TABLE/desk (25 cm to 1 m up, not narrow), SILL (80 cm to 1.25 m, narrow), SHELF (higher, or narrow and high), SMALL (under 0.1 m2).
- Each zone type has a specialty (see Expand) that steers what the colony builds and plants.

## Re-placing a colony (no anchors)

The runtime has no anchors or world maps, so a saved colony cannot snap back by itself. We do the simple honest thing: re-scan, tap the zone, drag and turn the colony until it lines up with the real surface, lock it in. The colony is stored in its own local frame (relative to its zone's centre and main axis), so only that one transform has to be recovered.

**Our own app could do this automatically** with ARKit world maps (`ARWorldMap`, save and relocalize) or `ARAnchor`s per colony: the saved frame would be restored by ARKit and the "Where was your colony?" step would disappear.

## Files

| File | |
|---|---|
| `index.html` | the whole game |
| `almanac.json` (optional) | stories and requests; see HANDOVER.md |
| `webxr-polyfill.js`, `THIRD_PARTY.md` | unmodified WebXRKit polyfill for the iPad fix, and licences |
| `HANDOVER.md` | developer notes, the almanac format, what is cut |
| `shots/` | screenshots |
| `tests/` | Playwright scripts: `ar-harness.js` (real WebXRKit polyfill + fake iOS bridge, run with NO_OVERLAY=1; needs the HelloXR source tree path set in `HX`), `practice-test.js` |

Build tag: shown at the start of the status line under the title buttons ("build 1 ...").
