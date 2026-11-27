# Demo roadmap (27 Nov 2026)

Two targets. A = Friends demo (the first hour, a link to share). B = Proper demo (A plus the opening film, the big storm with damage, richer sound).
Estimates are builder days, low to medium confidence, and have been optimistic before. Calendar time depends on the owner's playtests.

## Tracks (run in parallel; only ONE agent edits the page files at a time)
| Track | What | Files | Gate |
|---|---|---|---|
| T1 Page | picture fixes 1 to 3 (cream shape, grain, sky streaks); salvage kit into the Gift; robot sound and eyes; weekly beat; title screen, save/load check, how-to; picture fixes 4 to 9 | islands_look.html, gift_day.js, physical.js, storm.js, camp_start.js, where_from.js, ultra.js | owner playtest |
| T2 Sound | WebAudio synthesised sound: sea, wind, rain, gulls, robot work sounds, key, UI, a simple music bed; no downloads | new audio.js (+ demo page); hooks wired by T1 later | owner listens |
| T3 Opening | scripted camera rails and timeline engine for the 90 s opening (night, dawn, working quay, long swell, Great Wash, wrack line, arrival, first repair) | new opening.js and opening_proto.html first; wired into the page by T1 later | owner watches |
| T4 Storm | storm types and damage design from SEA_AND_STORM_PLAN into the page | page files (after T1 items) | owner playtest |
| T5 Hardware | HW-13 Radeon benchmark; cost ladder reports; Blender hero pieces; town round 2 | hardware | owner carries |
| T6 ChatGPT | opening frames touch-up (no whirlpool in calm frames); fort decoration; shot list | outside | owner carries |

## Milestones for A (Friends demo)
M0 now: owner playtest of easy start and the new sea (feedback: best, confusing, boring).
M1 picture fixes 1 to 3 (T1, about 2 days).
M2 sound alpha playable in a standalone page (T2, about 3 days), then wired in (1 day).
M3 title screen and a 20 second arrival fly-in using the T3 engine (about 2 days after T3 starts).
M4 salvage kit into the Gift (T1, about 3 days).
M5 robot sound and eyes plus one weekly beat (T1, about 3 days).
M6 save/load check, how-to, settings, credits (T1, about 2 days).
M7 owner playtest gate on iPad and Radeon; fix list; launch a link.
About 15 to 20 builder days; about one week calendar if three tracks run at once.

## Extra for B (Proper demo)
M8 the full opening film (T3, about 5 more days).
M9 the first big storm with damage and recovery, storm types (T4, about 5 days).
M10 picture fixes 4 to 9 (clouds, shallows, rim, foam), about 5 days.
About 15 more builder days.

## Risks
- Page file conflicts: one agent at a time on page files; T2 and T3 start in new files.
- Sound without downloads must be synthesised; quality may sound plain; the owner must listen.
- Real device speed is unmeasured on the Radeon until a cost ladder report arrives.
- Tests have gaps (build-tap-test never finishes); the owner's playtests are the real gate.
- Story rules stay FIXED (helper never shown or named as an AI in act one; robots no mouths or speech; whirlpool only with the Great Storm).

## Added 27 Nov (OWNER idea): the island clock
One shared island pulse used by BOTH animation and sound: robot work cycles (lift, turn, place) quantised to the pulse with per-robot phase offsets and tempo multipliers (1/2x, 1x, 2x), lamp-eye pulses, lighthouse sweep, winch strokes; sound fired from animation contact frames so sight and sound always agree; tired robots drift off the beat, so the rhythm shows tiredness. It must read as working rhythm, never as dancing (the town warned against dancing robots; robots stay old plain machines). Slot: part of M5 (robot sound and eyes plus the weekly beat), after picture fixes. Needs a deterministic island clock in the page and a lookahead audio scheduler (AudioContext time) so iPad timing does not jitter.
