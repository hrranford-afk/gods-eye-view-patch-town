# The Gift: sound (job "wire sound into the gift")

Written without being able to listen. Software GL and a fake audio module only: nobody has heard any of this. Every number is a first guess for the owner's ears; "What to listen for" is at the end.

Files: `gift_sound.js` (pure core plus the page layer), a probe in `gift_day.js` (`soundProbe`, the one place that knows where the game keeps what the sound needs), the existing `audio.js` and `audio_song.js` (not edited). Tests: `tests/gift-sound-test.js` (node, fake audio, a scripted day) and `tests/gift-sound-page-test.js` (page).

Switch: `game=gift` loads `audio.js`, `audio_song.js` and `gift_sound.js`; `&sound=0` keeps them out; `&sound=1` loads them on any page (only the chip and the audio unlock; the beds and events need the gift's state). The default page (no switches) loads no audio: hash 8d962c0c and 88,790 triangles are unchanged.

## What was done, one line each
1. Unlock and settings: a "Sound on" chip at the foot of the top-right column (hidden once the sound runs, and while the Menu is open); the first touch, click or key anywhere also starts it (audio.js listens in capture); a Sound panel in the Menu (Master, Effects, Music, a mute toggle); settings in `localStorage` under `li.gift.sound` (try/catch); the context is suspended while the tab is hidden; with no AudioContext the chip never shows and nothing throws.
