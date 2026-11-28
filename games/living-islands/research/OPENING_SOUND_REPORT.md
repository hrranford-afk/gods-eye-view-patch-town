# Opening film: sound (28 Nov 2026)

Files: `opening_sound.js` (cue table, beds, seek logic, three small voices), wiring in `opening_proto.html` (Sound on button, Mute, music slider), `tests/opening-sound-test.js` (40 checks: node with a fake audio object, plus headless Chromium).

NOBODY HAS LISTENED. The tests prove the wiring (which call fires at which film second, seek-safety, no duplicates) and that every sound renders finite and not silent in an OfflineAudioContext. They cannot say whether it sounds good.

## How it works
- The page's Sound on button is the tap that unlocks the audio context and starts LI_SONG. Before it, no audio call is made.
- One call per frame, `step(t, playing, speed)`. Cues the film names (and ten derived sounds: rock hum rising 36.5 to 46.5 s, the wash roar from 44.6 s, lantern creaks, a crate at the quay) are one list with one cursor. `seek(t)` puts the cursor on the first cue at or after t, restarts the beds and robots at the state of t and fires nothing. A forward jump over 1.6 s or any step backwards is treated as a seek.
- Beds from the director's tracks: sea energy from the three sea weights, wind from the storm, rain from the rain track, the roar cut at 59 s with the picture. Quay robots (hauler, sorter, stacker with different battery states) work from 20 s and drop out as the swell comes; one wakes after the repair.
- Island song: low by default (music volume 0.2), told the storm weight so it breaks to the storm key (from about 46.6 s) and returns after 61 s with its brighten notes.
- Pause suspends the audio context and zeros the beds. Above 2x speed beds, music and robots are muted and one-shot cues are skipped (no squeals). Mute button and M key call LI_AUDIO.mute.
- Drip, relay click and battery clunk are three tiny voices in `opening_sound.js` because LI_AUDIO has no such event (they follow LI_AUDIO's master, effects and mute).

## What to listen for
1. 0 to 9 s: low sea, a soft hum, a lamp creak at 4.6 s, one slow bell-like note at each beam sweep (5, 14, 23, 32 s). Is the hum too steady?
2. 20 to 36 s: three robots with different rhythms (the stacker slow and tired), a winch two-note at 24 s, a crate thud, lantern creaks.
3. 36 to 47 s: a low hum that climbs in pitch, then thunder from 46.9 s. 44.6 s on: the roar builds to the crest at 50.5 s.
4. 59 s: the roar must CUT, then near silence and three drips (61.5, 65.2, 68 s). Is the cut too abrupt or too soft?
5. 71 s on: oar creak and a water swish every 3.2 s. 85.4 s: a clunk; 86.4 s: a click, a soft low hum and the three-note key motif.
6. Scrub around; beds should settle within about a second and no thunder should ever fire on a scrub. Play at 4x: only the picture.

## Known limits
- LI_AUDIO's own scheduler still adds random gulls and crickets (it uses Math.random, and I may not edit audio.js). Gulls appear now and then in calm shots. Ask for `LI_AUDIO.ambient(false)` if they get in the way.
- Long one-shot sounds (the 11 s wash roar) are not started halfway after a seek into the middle of them; the beds carry that moment.
- No sound plays on iOS before a tap: the button is that tap.
