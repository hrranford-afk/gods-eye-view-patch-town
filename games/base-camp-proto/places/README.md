# Places prototype (practice property)

Single file: `index.html` (three.js r128 from cdnjs). Open it on an iPad or desktop.

- Places: Home and Mum & Dad's, plus "+ New place" (works, makes a one-room place).
- Place > Area > Room, with breadcrumbs and a back button.
- 3D doll's-house view (toon + ink outline), house-map overview with busy glow and travellers.
- Tap a room or a doorway: the camera walks along the doorway links. Looking at a totem
  shows "Seen the striped mug, this is the Kitchen" and the room's surfaces light up.
- Add a room / Add a totem here / Link through this door (mocked: edits the local data only).
- Saved in IndexedDB with localStorage fallback ("Saved on this iPad only").
- Mocked: totem recognition (no camera), camps and travellers (simulated), no real AR.

Test: `NODE_PATH=$(npm root -g) node tests/places-test.js` (also writes `shots/`).
Robot hook: `window.__p = {places, goTo(path), seen(totemId), state()}`.
