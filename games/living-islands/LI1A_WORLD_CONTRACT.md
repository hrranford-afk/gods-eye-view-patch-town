# Living Islands LI-1a: the first-tide world contract (CLOUD, 22 Nov 2026). PAPER STAGE: nothing is built.
Status: PASSED for its stated acceptance (every rule below is written down, and the six paper tests work by hand and by calculator: `tools/li1a-paper-tests.mjs`, 22 of 22, `evidence/LI1A_paper_tests.txt`). It is a proposal until the owner approves it. Every number marked TUNING is an assumption, not a measurement.
Inputs: the owner's attached design pack (22 Nov; see `../city-lab/shared/cloud/C07_LIVING_ISLANDS_INTAKE.md`), City Lab rules and lessons (`LESSONS_FROM_CITYLAB.md`). Separate track from City Lab (`README.md`).

## 1 Units, coordinates and the table
World units are metres in the fiction. One origin on the home island, sea level 0, y up. All positions of people, cargo, boats and places are stored in world units. The physical table is only a VIEW: a transform (position, rotation, scale) applied to the world root. Pan, zoom, rotation for round, square or rectangular tables, and re-anchoring never change simulation state, never change a trip clock and never change what the colony knows. A Home action returns the view to the camp.

## 2 Clocks
One simulation clock in game minutes, fixed step (1 game second), no wall clock, no random numbers except from a seeded generator whose state is saved. Tide: a repeating cycle; the landing is workable only inside a window around high water (TUNING: rocky landing 9 minutes, landing stage 30 minutes). Boat voyage: an illustrative fictional route of 1.5 miles at 12 km/h takes about 12 minutes each way (from the pack, TUNING). Zoom and table size never change these times.

## 3 Things in the world (the first tide uses one home island and one boat)
Places (named points in world units): Landing (where the boat touches), TideLine, Stores (above the tide line), Camp (two tents), Spring (fresh water), ForkedRock (a landmark), TimberPile. Carry distance Landing to Stores: 60 m (rocky), 25 m (with a landing stage) (TUNING).
People: six founders, each with id, name, skill tags, current task, location and what they carry. Cargo: units, each with one id and one place; a crate is 1 unit, a bundle of 4 boards is 1 unit. Boat: a capacity in units, a crew, a place, a state. Projects: a name, boards, workers, minutes, a benefit. Reports: what was seen, when it was seen, when it was delivered, who carried it, what state it describes.
Buildings are City Lab recipes (`rtk.building` v1): tent, bunk, landing stage, timber stack. This track does not change the recipe format.

## 4 The ledger (nothing is created or lost)
Every unit has exactly ONE id and ONE location (aboard, beach, stores, in a hand, consumed). Moving a unit is an event with a unique key; an event that arrives twice changes nothing (idempotent), so a save and reload in the middle of a transfer adds a crate to stores once, never twice. Stock is the count by location. Reserving materials for a project happens once, when the player confirms; consumption happens as work is done. Invariants, checked every step: no negative stock; units in all places plus consumed equals units ever loaded.

## 5 Labour and the slip rule (the first-tide analogue of City Lab's shortage rule)
Hands are founders not already working. Recurring tasks in priority order: water, cooking, camp, firewood, lookout. When hands are taken for a job, the LAST tasks in that list slip first, and the slip is shown to the player. Three hands down to the beach slips firewood and lookout (P1a). One crate or one bundle per hand per trip (TUNING). Trip time = distance/60 + distance/90 + 0.5 minutes (loaded walk, empty return, handoff; TUNING). Hands work in parallel rounds.

## 6 The first tide (a test fixture: every quantity and event below is AUTHORED, and labelled so)
The boat arrives with 6 crates and 16 boards (4 bundles), 10 units in all, enough timber for ONE project. The player identifies the cargo, picks the landing, assigns hands, carries units above the tide line, and each is added to stores once. Two openings on the same seed and the same departure tide:
A: invite a carpenter and build a BUNK (8 boards, 2 workers, 90 minutes; 180 worker-minutes). B: build a LANDING STAGE (12 boards, 3 workers, 120 minutes; 360 worker-minutes): carry distance 25 m and a 30-minute window instead of 9. Only one fits the first load (P2c), so the choice is real.
What the choice does (paper tests): a rocky 9-minute window lands only 12 of the next voyage's 24 units with three hands (P3a); with the stage all 24 land in 9.56 minutes and even two hands manage it (P3b, P3c). The stage pays because the TIDE WINDOW binds, not because walking is slow (the City Lab lesson: an upgrade pays when it removes the constraint that binds).
Visitor decision (an invited carpenter), TUNING threshold 4: berth +2, work offered +1, provisions +1, safe landing +1. Opening A scores 4 and the carpenter stays (P4a). Opening B scores 3: the carpenter sleeps aboard and decides next tide, a third response with a visible cost (P4b). Neither scores 2 and the carpenter sails away but may return on a later voyage (P4c). A later state with both scores 5 (P4d).

## 7 Knowledge versus truth (the wider vision, kept in the design; built later)
The world has a true state; the colony has dated beliefs. Observation time and delivery time are separate: a scout sees at hour 2, the report is delivered at hour 8, the colony believes "slipway usable" at hour 9 although it broke at hour 6, and decides under that belief; fresh evidence dated hour 14 and delivered at hour 16 corrects it (P5a to P5d). Zoom changes the view, never the knowledge.

## 8 Save format (`living_islands_save`, version 0; JSON)
`{schema, version, seed, rng_state, clock, tide_phase, people[], places[], units[{id, place}], applied_event_keys[], projects[{name, reserved_boards, progress_worker_minutes, crew}], boat{place, crew, units_aboard}, reports[], beliefs{}}`. Rules: load then continue; saving while cargo is aboard or workers are building works; finishing a transfer or a construction after a reload happens exactly once (the event keys); the same seed and the same choices give a byte-identical state hash (P6).

## 9 Authored fixtures and emergent rules (to be shown to the owner)
AUTHORED for this experiment: the cargo list, the arrival tide, the carpenter's arrival, the founders' names and tasks, the two projects. EMERGENT from rules: unload time, which jobs slip, whether the carpenter stays, the effect of the stage on later voyages, what the colony believes.

## 10 How to measure (the C03b lessons)
Compare A and B on identical starts over whole tides and after the first unload has settled; three identical runs each; show timber spent, who worked, who stayed, unload time, jobs slipped, units aboard at the next tide. Always show stock next to any "saving".

## 11 Tuning assumptions (all TUNING; change them in data, not code)
Carry speeds 60 and 90 m/min, handoff 0.5 min, one unit per hand, 9 and 30 minute windows, 25 and 60 m carry distances, project sizes, visitor weights and threshold 4, voyage 12 minutes, six founders, five recurring tasks.

## 12 What LI-1b (headless first tide) must prove, and the stop rules
Acceptance (from the owner's pack): both openings on identical starts with actual timber spent, who worked, who stayed and unload time; save halfway through construction and reload, finishing once with the right stock and crew; pan away and return, the same settlement persists; same seed twice is identical; the paper tests P1 to P6 reproduced by the real code. Stop rules: if the owner cannot name a consequence and a reason to try the other opening within five minutes, pause and change the incentives; no art, no real-world data and no hardware work before the first tide proves itself.

## 13 Open questions for the owner
1. Are these six paper rules the right shape (hands, tide window, ledger, slip rule, visitor score, late reports)? 2. Is the tide window the right constraint to make the stage matter, or would you rather something else binds? 3. Which opening do you want to test first? 4. May LI-1b start (headless first tide, no art)?
