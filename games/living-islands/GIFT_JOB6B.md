# Job 6b: night and hands (owner playtest 25 Nov). One line per pushed item.
1. NIGHT SHIFTS: camp_start.js shiftPlan (at most half charge, turns, night rate, lit radius), physical.js shelter per robot, gift_day.js turns shifts on. Test: tests/night-test.js section 1 (25 checks).
2. HAND GATHERING: hold on litter or heaps (gift_day.js handTick, storm.js handUnit), lit ring at night, rate readout. Tests: night-test.js (30 checks), night-page-test.js (hand and night rules, 834x1062 and 1280x720).
3. BATTERY AND SOLAR: KITS in the catalogue card, named kit crate, Fit with a 4 s hold at the post, card line with Short night shift. Tests: night-test.js (40 checks), night-page-test.js (kit crate to fit, 38 checks).
