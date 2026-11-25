# Job 6b: night and hands (owner playtest 25 Nov). One line per pushed item.
1. NIGHT SHIFTS: camp_start.js shiftPlan (at most half charge, turns, night rate, lit radius), physical.js shelter per robot, gift_day.js turns shifts on. Test: tests/night-test.js section 1 (25 checks).
2. HAND GATHERING: hold on litter or heaps (gift_day.js handTick, storm.js handUnit), lit ring at night, rate readout. Tests: night-test.js (30 checks), night-page-test.js (hand and night rules, 834x1062 and 1280x720).
3. BATTERY AND SOLAR: KITS in the catalogue card, named kit crate, Fit with a 4 s hold at the post, card line with Short night shift. Tests: night-test.js (40 checks), night-page-test.js (kit crate to fit, 38 checks).
4. NIGHT HINT AND WAIT FOR DAWN: hint text, Menu button, manual x8 and automatic x3 acceleration, any action cancels. Tests: night-test.js (51 checks), night-page-test.js section 4 (52 checks).
5. STARTER BUFFER: crate one holds metal 3, planks 1; exact missing line on the build card (physical.js canCommit uses missingText). Tests: night-test.js (stock and wording).
6. SKIP-TO: label 'Test: skip to...', canned stock per stage = what a normal day makes. Tests: night-test.js section 6, gift-day-test (one expectation moved by the starter plank).
7. DEAD TIME: ambientStep in gift_day.js (boat, gulls, horn, tide pool after 55 s of nothing visible), tests/deadtime-test.js (10 checks; quietest night 900 s without events, 55 s with). Items 5 to 7 went into one commit.
