# AUDIO PLAN: synthesised sound for The Gift (job T2)

Everything is made with WebAudio at runtime: oscillators, filtered noise buffers, envelopes. No audio files, no downloads, works offline and in a public repo. Module: `audio.js` (window.LI_AUDIO, no THREE). Demo: `audio_proto.html`. Test: `tests/audio-test.js`.

Honesty note: this was written without being able to listen. Every number below is a starting point for the owner's ears. See "What to listen for" at the end.

Tone: warm, gentle, old machinery. Nothing harsh, nothing scary. Storms are awe, not terror: low and wide, never shrill. The robots have no mouths and no speech; their character is the sound of their work.

## 1. Sound list

### Ambient beds (continuous, parameter driven)
| Bed | Made from | Driven by |
|---|---|---|
| Sea swell | looped brown/pink noise, lowpass 200..900 Hz, slow LFO on gain (0.08..0.2 Hz) | setSeaEnergy |
| Shore wash | pink noise, bandpass ~1.2 kHz, gain LFO 0.1 Hz (a breath in and out) | setSeaEnergy (quieter bed, only when calm to medium) |
| Wind | looped noise, bandpass 300..1400 Hz, Q rises with speed, slow random drift | setWind |
| Rain | looped white noise highpass 1.5 kHz plus lowpass 7 kHz, sparse drops from short filtered clicks | setRain |
| Gulls | rare (every 8..25 s by day) two-glide sine/triangle with vibrato, soft; silent at night | setNight (fades out), setWind (fewer in wind) |
| Night | sparse crickets (4.2 kHz sine pulses in groups of 3..5, quiet) or near-silence | setNight |
| Lighthouse beam hum | two detuned sines near 55 Hz and 110 Hz, very quiet, rises slowly at night | setNight |
| Music bed (optional) | slow chords from detuned triangle/sine pairs through lowpass, one chord per 12..20 s, long attack and release, tiny delay-free "reverb" from a short noise-convolver | music slider; off by default |

### Events (one-shots and loops)
Names accepted by `playEvent(name, opts)`:

- `robotWork` kinds (via `robotWork(id, kind, state, battery)`): `hauler` (low groan, click, track scrape on pebble, heavy pause), `sorter` (soft rattle, tick, thunk), `stacker` (almost silent, load shifting). States: `idle`, `work`, `tired`, `new`, `wet`, `broken` (`new` crisp, `wet` dragging and lower, `tired` clicks spaced out).
- `scrape` (opts.ground: `pebble`, `sand`, `grass`, `plank`, `stone`)
- `crateThud`, `plankFit`, `holdLoop` (start/stop; a rising soft scrape while a hold action is held), `key` (brass key: three inharmonic bell partials, short ring), `uiTick`, `horn` (delivery horn, low double tone), `boatCreak`, `wake`, `winch` (two-note), `thunder`, `stormRoar` (loop on a bed bus, level by opts.level), `rockHum` (opts.pitch 0..1, rises before a storm), `gull`.

### Storm
Storm roar: wide lowpassed noise swelling over 6..10 s. Thunder: noise burst through a lowpass whose cutoff falls from 500 to 80 Hz over 2..4 s, with a rumble tail. Rock hum: two sines at 70 Hz upward to about 140 Hz with a slow beat; pitch follows `opts.pitch` (0..1) so the game raises it as the storm approaches.

## 2. Parameter API (window.LI_AUDIO)

```
init()                       /* safe any time; creates nothing until a gesture */
unlock()                     /* call from touchend/click/keydown; creates and resumes the context */
isRunning() -> bool
setSeaEnergy(0..1)  setWind(0..1)  setRain(0..1)  setNight(0..1)
robotWork(id, kind, state, battery, wear)   /* battery 0..1; wear 0..1 optional */
robotStop(id)
playEvent(name, opts) -> bool   /* false if not started (not running, unknown, voice cap) */
setMasterVolume(0..1)  setEffectsVolume(0..1)  setMusicVolume(0..1)
mute(bool)  isMuted()
voices() -> number          /* active voices now */
stats() -> {voices, cap, running, ...}
renderOffline(name, opts, seconds, rate) -> Promise<Float32Array>   /* for tests */
```
All setters clamp, ignore NaN and non-numbers, and never throw. Before the gesture, setters store the value and apply it on unlock. Beds change with `setTargetAtTime` (about 0.3..1.5 s), so the game can call setters every frame without zipper noise; the module also skips calls where the value moved less than 0.005.

Robot timing: base interval per kind (hauler 1.6 s, sorter 0.45 s, stacker 2.4 s). Interval = base * (1 + 2.2 * (1 - battery)^2) so clicks space out as the battery falls; `wear` lowers pitch up to 12 percent and adds a small random jitter. A scheduler runs from one 50 ms setInterval with a look-ahead of 120 ms; the game never schedules per frame.

## 3. CPU and battery budget
- Voice cap 24 total, per-name caps (robot voices 6, thunder 2, key 2, ui 4). Over the cap a new event is refused (playEvent returns false); beds are never affected.
- Beds: 6 persistent chains built once, never rebuilt. Looped noise buffers (2 shared buffers: white and brown, 4 s each) built once, shared by every bed and event.
- No per-frame allocation: setters do no work except `setTargetAtTime`; events create short-lived nodes that disconnect on `ended`. Each source is stopped and released after its envelope.
- Beds with gain below 0.002 are paused by ramping to zero and stopping the LFO sources lazily (checked every 2 s).
- Master chain: master gain, then DynamicsCompressor as limiter (threshold -10 dB, ratio 12, fast attack), then destination.
- On `visibilitychange` hidden, the context is suspended (battery); resumed when visible again.
- Sample rate is left to the device (44.1 or 48 kHz); all buffers are built from `ctx.sampleRate`.

## 4. iPad / Safari unlock rules
- Use `window.AudioContext || window.webkitAudioContext`.
- Create the context only inside a user gesture handler (touchend, click, keydown; not touchstart on iOS older than 13). `unlock()` also plays a one-sample silent buffer, which is what wakes iOS.
- After a phone call, lock or tab switch the state can become `interrupted` (iOS) or `suspended`: resume on the next gesture and on visibilitychange.
- Show a visible "Start audio" button until running; the game hides it once `isRunning()`.
- Mute switch: iOS ring/silent switch may silence WebAudio; the UI mute toggle is separate and always works.

## 5. Settings plan
Sliders: Master, Effects, Music (music default 0). Toggle: Mute. Stored in localStorage (wrapped in try/catch) under `li_audio`. Master default 0.7. Rain/wind/sea are "effects".

## 6. Wiring (later, not in this job)
Game loop sets sea energy from the macro sea, wind from the weather, rain from storm intensity, night from the sun. Robots call `robotWork` on state change only (not per frame). Events from game triggers by name.

## 7. What to listen for (owner)
1. Do the beds sit under the game or fight it? Sea swell should be felt more than heard.
2. Hauler: is the heavy pause readable as effort, not as error? Tired: do the spaced clicks feel sleepy, not broken?
3. New vs wet: crisp against dragging, a clear difference?
4. Brass key: pleasant ring, not a doorbell. Winch: two notes should feel like a mechanism.
5. Thunder and roar: awe, not alarm. Anything shrill or harsh should be lowered.
6. Rock hum: pitch rise audible but slow.
7. On the iPad: first tap starts audio, no crackle, device does not warm up.

## 8. THE ISLAND SONG (generative music layer, job T3)

Module `audio_song.js` (window.LI_SONG), demo `audio_song_proto.html`, test `tests/audio-song-test.js`. Not heard by the author; every number is a first guess for the owner's ears.

Idea: the island's rhythms together are the song. There are no loops and no melody tracks. Real game events cause notes, and every note is quantised to one soft shared pulse and picked from one calm scale.

### Scale, root, mood (from the island seed)
The seed (number or string) is hashed (FNV-1a) into a small seeded RNG (mulberry32). It picks:
- a scale: one of the five pentatonic rotations [0 2 4 7 9], [0 2 5 7 10], [0 3 5 8 10], [0 2 5 7 9], [0 3 5 7 10] (no semitone steps, so nothing can sound sour);
- a root note from MIDI 45..52 (A2 to E3);
- a pulse of 52..64 beats per minute (the grid is an eighth note, about 0.5 s).
Mood name is derived from the rotation (bright, open, tender, dusk, deep). All notes are scale degrees, so a log can show degree and midi and a test can prove every pitch class is in the scale.

### Voices
| Voice | Trigger | Sound | Weight |
|---|---|---|---|
| Robot (soft percussion) | robotBeat(id, kind, battery) | short soft bell/pluck on a degree fixed per robot (from hash of id); hauler an octave low, sorter middle, stacker an octave up and sparse. Spacing in grid steps = base (4, 3, 8) * (1 + round(3 * (1-battery)^2)): clicks spread as the robot tires, and each note is a little softer | 0.08 |
| Lighthouse | lighthouse() each beam sweep | one slow note (1.2 s attack, 5 s tail) walking a fixed pattern of degrees; a little louder at night | 0.22 |
| Tide | setTide(0..1) | a low three-note swell chord, always present, gain and filter rise and fall with the tide | pad, not counted |
| Winch | cue('winch') | two-note motif, degrees 4 then 2 | 0.2 |
| Key | cue('key') | rising three-note figure, high | 0.2 |
| Gulls | automatic by day, rare; cue('gull') | single bright high note with a small glide | 0.1 |
| Phrase | form (below) | an 8-step phrase generated from the seed, soft bell | 0.15 |
| Storm cue | cue('thunder') | one very low note, long | 0.25 |

### Form: the game week
setWeekBeat(name): `tender` (tender's day) is the opening phrase: phrase plays every 4 bars. `lowtide` (low-tide day) is the quiet middle: only the first notes of the phrase every 8 bars, robots spaced twice as far, swell a little stronger, everything softer. `lighthouse` (lighthouse day) is a gentle variation: phrase shifted up two degrees with pairs swapped, lighthouse note louder. `none` stops the phrase.

### Storms
setStorm(0..1). Above 0.55 the song goes dark: same pitches, but the home degree moves to the relative minor (degree 4 of the scale), the swell chord drops an octave, its gain rises and the percussion and phrase fade to about a third. This is awe: low and wide, no shrill notes. Below 0.4 it returns, and a short rising three-note figure brightens the song once.

### Limits, ducking, battery
- Hard caps: 8 simultaneous notes; per-voice caps (robot 4, phrase 2, lighthouse 1, gull 1, cue 3); a loudness budget of 0.6 (sum of live note weights); a refused note is simply not played.
- Quiet by default: song bus gain 0.5, then the LI_AUDIO music bus (the music slider) and master. LI_AUDIO's music slider defaults to 0; wire the game default to about 0.35. Mute and master are honoured because the song plays through LI_AUDIO's music bus.
- No per-frame allocation. A scheduler tick runs every 100 ms (look-ahead 0.3 s), not per frame; nodes exist only for the length of a note; the swell chord is built once.
- Randomness is hashed from (seed, grid step), never Math.random, so the same seed and the same event stream give the same notes.
- LI_AUDIO.chordBed(false) is called on start so the plain chord bed does not double the song. `LI_AUDIO.hook()` is an additive accessor for the live context; nothing else in audio.js changed.

### Game wiring (later)
setIsland(seed) on island load; setTide each frame (cheap, ramped); setStorm from storm intensity; setWeekBeat on day change; lighthouse() each sweep; robotBeat on robot state change (battery changes are read by the scheduler, so call it when battery moves a step, not per frame); cue('winch'|'key'|'gull'|'thunder'|'delivery') from game events.

### What to listen for (owner)
1. Does the pulse feel like one soft thing, or do notes feel scattered? Notes should land on the grid.
2. A tiring robot: do its notes spread out in a way that feels sleepy?
3. Tide swell: heard as water-like low breathing, not a drone alarm.
4. Storm: does the darker mode feel big and calm, not scary; does the brighten figure feel like relief?
5. Between islands (different seeds): different keys and moods, same warm family.
6. Too many robots: does it stay gentle, or get busy?
7. The three week beats: opening, quiet, variation recognisable.
