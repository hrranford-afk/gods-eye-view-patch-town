# mega-review-1 - result from PatchTown (17 Nov 2026)

Words untouched, each with its maker. Stages 2 and 3 by the Town Brain (qwen3.6-35b-a3b on the Radeon VII). Stage 1 by the Dell residents (16 Nov).

Stage 1 (the residents' answers) is the same as in `2026-11-17-keep1-megareview1-scan1.md`, with these seat times: the Dell Builder 4.8 min, the Dell Coder 16.7 min, the Dell Elder EMPTY (timed out, WAITING), the Dell Quick Builder 1.3 min, the Dell Reasoner 5.7 min, the Dell Scholar 60.9 min, the Dell Surveyor 3.5 min, the Dell Writer EMPTY (returned 0 characters).

## Stage 2 - brain-missing.md: the 10 biggest things missing (by the Town Brain)

1. **Persistent, evolving world state.** The world must change while you are away across all modes, not just the colony, so every session feels new and gives a reason to return daily. The town should implement this so creatures act, walls grow, and the room remembers you. by the Scholar.
2. **Reliable AR detection in real environments.** Scanning fails on plain carpet, sheds, and dim light. The system needs a consistent way to map rooms in all conditions so games work outside pretend spaces. The cloud session must fix this foundation. by the brief.
3. **Multiplayer and shared world features.** There are no other players yet. Adding shared play lets families and friends interact with the same evolving room and compare progress together. The cloud session should build this. by the Builder.
4. **Automated feedback and testing loop.** Field reports do not reach the Mini automatically, and testing waits for Harry. An automated system should collect data and run checks to speed up fixes and reduce manual work. The cloud session should handle this. by the Coder.
5. **Daily quests and rotating challenges.** Players need new goals each day, like weather events or migrating creatures, to drive daily returns beyond the colony's routine. The town should design these rotating hooks. by the Quick Builder.
6. **Town quality control and noise filtering.** Too many seats return empty, responses are slow, and sparks are noise. The town must filter bad answers, check its own canaries, and say "I do not know" when unsure. The town should improve itself. by the Scholar.
7. **Immersive audio and sensory cues.** Using real room acoustics, shadows, and sounds builds tension and immersion without requiring extra hardware. The cloud session should add sound cues linked to player movement and environment. by the Quick Builder.
8. **Mega project structure.** Long-term builds over a week give players a sense of progress and a shared goal that spans multiple sessions, keeping engagement high. The cloud session should implement this structure. by the brief.
9. **Real-room level generation.** Generating test scenarios and levels from the player's actual scanned geometry makes every room a unique level and improves system adaptability. The town should use real geometry for testing and gameplay. by the Scholar.
10. **Persistent Base Camp history.** The Base Camp must remember building changes, creature actions, and market shifts over time, linking the virtual doll's house to the evolving world state. The town should ensure Base Camp data persists. by the Scholar.

## Stage 3 - capability.md (by the Town Brain)

| Need | Who does it (cloud session / town / Harry) | CAN DO NOW: seat name, or NEEDS TRAINING | if training: what it is for; material it learns from AND that material's licence; size; machine and minutes; 10-prompt test that proves it beats the current seat |
|---|---|---|---|
| 1. Persistent, evolving world state | Town | CAN DO NOW: Town Brain (35B) + Mini disk | n/a |
| 2. Reliable AR detection in real environments | Harry / Cloud session | NOT POSSIBLE VIA TRAINING (requires client-side AR SDK & sensor hardware) | n/a |
| 3. Multiplayer and shared world features | Cloud session / Town | CAN DO NOW: Town Brain (35B) designs sync schema; Mini handles state | n/a |
| 4. Automated feedback and testing loop | Town / Cloud session | CAN DO NOW: Surveyor (12B) + Mini two-engine test | n/a |
| 5. Daily quests and rotating challenges | Town | CAN DO NOW: Quick Builder (30B) + Town Brain | n/a |
| 6. Town quality control and noise filtering | Town | NEEDS TRAINING | Spark filtering & uncertainty calibration; curated spark/error pairs (CC-BY-SA 4.0); 600MB; Mill; 45 min; 10 noisy sparks with known failure modes; measure "I do not know" accuracy & correct rejection rate vs Dell Scholar |
| 7. Immersive audio and sensory cues | Town / Harry | NEEDS TRAINING | Procedural sensor-to-audio cue mapping; CC0 sound event logs + AR hit-test metadata; 1.2GB; Dell; 90 min; 10 room environments with lighting/movement descriptors; output exact cue IDs, timing offsets, and fallback silence rules |
| 8. Mega project structure | Town / Cloud session | CAN DO NOW: Town Brain (35B) + Quick Builder (30B) | n/a |
| 9. Real-room level generation | Town / Cloud session | NEEDS TRAINING | Geometry-to-level JSON parsing; ARKit/RealityKit scan exports + floorplan JSONs (CC-BY-NC 4.0); 2.0GB; Dell; 120 min; 10 real room scans; output valid collision bounds, spawn points, and AR anchor placements matching scan data within 5cm tolerance |
| 10. Persistent Base Camp history | Town | CAN DO NOW: Mini disk + Town Brain | n/a |
| 11. AR game design and development | Town | CAN DO NOW: Town Brain (35B) + Quick Builder (30B) | n/a |
| 12. Robust feedback system | Town / Cloud session | CAN DO NOW: Surveyor (12B) + Mini robot browsers | n/a |
| 13. Simple sensors and sound cues for immersion | Town | SEE ROW 7 (same training path) | n/a |
| 14. Room brain for real-world mechanics testing | Town | NEEDS TRAINING | Real-world interaction simulation & physics approximation; public domain AR hit-test logs + physics simulation data (CC-BY-4.0); 800MB; Dell; 75 min; 10 real-room descriptions with furniture layouts; predict interaction success/failure & suggest mechanic adjustments with confidence scores |
| 15. Generate test scenarios from real geometry & predict AR failure/pre-compensate | Town | NEEDS TRAINING | Failure mode prediction & pre-compensation routing; Harry's iPad field reports + AR failure logs (Public Domain/Harry's data); 1.5GB; Dell; 150 min; 10 plain carpet/dim light/shed field reports; output failure probability, pre-compensation steps, and fallback AR modes |
| 16. Filter sparks & say "I do not know" / check canaries | Town | SEE ROW 6 (same training path) | n/a |
| 17. Automated testing and feedback loops with simulated player behavior | Town / Cloud session | CAN DO NOW: Surveyor (12B) + Mini robot browsers | n/a |

**Honest hardware note:** The Dell and Mill are CPU-only. Training >1B parameters is NOT WORTH IT / UNFEASIBLE on this hardware. All proposed training targets tiny experts or distilled LoRA weights that fit within current limits.

Run the spark filtering training (Row 6/16) first because it directly solves the "one in nine seats returns empty, slowest takes 48 min, many sparks are noise" bottleneck, requires only Mill CPU time (~45 min), and immediately improves town reliability without hardware changes or downloads.

## Stage 4 - NOT RUN

- The Mini's disk is under its 30 GB floor (12-15 GB today), and the door refuses training below the floor.
- Downloads: the Brain says the first plan (row 6, spark filter) needs none. Rows 7, 9, 14 and 15 name outside material, so each would be a download for Harry's yes.

## CAIRN's notes (the town's clerk, not the Brain; checks, not opinions)

- The **licences in rows 6, 7, 9 and 14 are the Brain's words, not checked.** No source is named for "curated spark/error pairs (CC-BY-SA)" or "ARKit scan exports (CC-BY-NC)". **CC-BY-NC forbids commercial use.** Treat every licence as UNVERIFIED until a source is named.
- **Row 6 can use the town's own records instead:** 58 rounds of seat answers, each marked real, empty or timed out. That's Harry's own data, with no download and no licence question.
- **Row 15 names "Harry's iPad field reports".** The order says nothing personal goes into any model, so it needs Harry's decision, and pictures of his rooms must stay out.
- Sizes and minutes in the table are the Brain's estimates, not measurements.
- "The Dell and Mill are CPU-only": the Mill has an RX 560 (4 GB), but training on it is untested.

## Run report

| Stage | Machine | Model | Started (UK) | Finished (UK) | Min running | Min waiting |
|---|---|---|---|---|---|---|
| 1 residents | Dell | 8 seats, one at a time | about 20:07, 16 Nov (worked back from the seat times) | 23:03, 16 Nov | 176 | UNKNOWN |
| 2 Brain | Radeon | qwen3.6-35b-a3b | 11:13 | 11:22 | 9 | **152** (filed 08:35 with wrong arguments, so a wrong job ran until 10:00; I refiled at 11:12) |
| 3 Brain | Radeon | qwen3.6-35b-a3b | 11:39 | 11:54 | 15.4 | 0 |
| 4 trainer | n/a | n/a | not run | n/a | 0 | n/a |

| Machine (this order) | Busy | Idle | Waiting on |
|---|---|---|---|
| Radeon | 24 min of the order (plus about 85 min on the wrong job) | rest | CAIRN's refile |
| Dell | 176 min (stage 1) | n/a | its one-model-at-a-time queue |
| Mill | 0 | all | nothing given to it |

| Seats | Number | Why |
|---|---|---|
| Asked | 8 | |
| Real | 6 | |
| Empty | 1 | the Dell Writer returned 0 characters: JSON mode empties its thinking model. True in all 46 of its rounds; fix made 17 Nov, unproven |
| Broken | 1 | the Dell Elder timed out at 3,814 s against a fixed 3,000 s allowance |

- Canaries: none for stages 2 and 3. Retries: 1 (stage 2). Restarts: 0. Brake stops: 1 (the door refused a stop tool below the floor; Harry said yes to a rescue lane).
- Memory peak: UNKNOWN. Free disk: 18.3 GB at 08:33, then 12.3 GB at 11:28, then 15.0 GB at 12:02.
- Speed: the Brain wrote 8,538 tokens in 15.4 min (about 9 per second). Stage 2: 25 per second peak.
- Inputs were 8 KB (stage 2) and 17 KB (stage 3), so nothing was summarised.
- **Slowest step:** stage 2 waited 152 min. CAIRN passed the job's arguments after "--" instead of "--args", the door dropped them silently, and the Brain ran its default job.
