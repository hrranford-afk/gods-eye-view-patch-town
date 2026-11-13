# Base Camp build 19: the first 10 minutes

A design proposal for Harry. No code was changed.

**How I played.** Live build 19, a fresh browser, no save, iPad size (820 x 1180). I pressed Play, which opens the practice room. I tapped what the screen offered and said yes to every card.

**Two runs.** The main run used the real clock. It was 22:06, so it was night in the game. A second run set the "Hour" slider to 10:00 to see the daytime game. Shots are in `shots/`.

---

## 1. What happens now

| Time | Shot | What I see | Asked to do | Problem |
|---|---|---|---|---|
| 0:00 | `01_0m00_title` | Title card: Play, Battle!, More. | Press Play. | Fine. |
| 0:05 | `02_0m05_we_landed_no_colony_in_view` | "We landed!" The camera shows a chair. | Nothing. | **No colony on screen.** |
| 0:13 | `03_0m13_weather_card_and_pip_cam` | A weather card. A "Pip cam" box sits on top of it. Pip's stats fill the bottom. | Say yes to weather. | **Lost.** Three panels at once. Yes gave "No location." |
| 0:30 | `04_0m30_camera_tours_the_window` | The camera drifts past a window. Blue sky outside. The card says "night". | Nothing. | Day outside, night in the card. |
| 1:00 | `05_1m00_camp_is_a_dot` | The whole room from above. The camp is a tiny glowing tent by a toilet. | Nothing. | **The colony is a dot.** You can't move the camera to it. |
| 1:16 | `06_1m16_zoomed_in_camp_at_edge` | I zoomed. The desk is in the middle. The tent is in a corner. | — | Zoom goes to the desk, not the camp. |
| 1:19 | (log) | I tapped a colonist. | — | All three were in the tent. I got "The base camp tent". |
| 1:31 | (log) | Seeds, then a tap by the tent. | "Tap the ground to drop a seed." | "No room there." First try failed. |
| 2:00 | `07_2m00_build_menu_covers_camp` | 12 build buttons. The sky panel covers two. The top hint is cut off. | Place a lantern. | **The menu covers the camp.** My tap hit the menu. Nothing built. |
| 2:52 | `08_2m52_dance_party_while_asleep` | "First dance party!" Confetti by the tent. | — | Everyone is asleep. It says "the huts bounced". There are no huts. |
| 3:00 | `09_3m00_night_nothing_moves` | Same view. Pip cam: "having a rest indoors". | Nothing. | **Bored.** |
| 5:00 | `10_5m00_same_view` | Same. | Nothing. | — |
| 7:00 | `11_7m00_same_view` | Same. | Nothing. | — |
| 10:00 | `12_10m00_same_view` | Same. Clock says 22:16. | Nothing. | Only 100 pixels changed from 7:00 to 10:00. |

**Why night is dead.** In `chooseJob`, every colonist with a home sleeps at night. Expeditions also stop at night. Start in the evening and you get 8 still minutes.

**Daytime is alive.** First hut at 2:27 (`13_day_2m30_first_hut`, with "Snack break?" and "Found it!"). A new settler, Luna, at 3:28. Pip's river at 4:11. "Pip found the sink!" at 4:57 (`14_day_5m00_pip_found_the_sink`). But even by day:
- The camp is small and off to one side.
- At 0:11, a "First night survived" banner fired because I moved the slider.
- **Nobody asked me for help.** There were zero request cards in any run. The creatures did everything. I only watched.

**Keep these:** the Pip cam, the speech bubbles, the river, "Pip found the sink!".

---

## 2. The story, proposed

One rule for every beat: **the camera stays on the camp, and only one thing talks at a time.**

**Beat 1 (0:00–0:30). Someone arrives.** A tent lands. The camera flies to it. Pip climbs out and waves at the Giant.
- Exists: `autoSettle`, `celebrate('land')`, `sayLine`, `camOpen`, `focusOn`.
- Missing: fly to the camp on landing. Hold back `wxCard` (it fires at 9 s).
- Effort: **S**

**Beat 2 (0:30–1:30). Pip needs help.** "My seeds spilled!" One card. The Seeds button glows. A ring shows where to tap.
- Exists: `requestsStep`, `giveRequest`, `CONDS.noSeeds`.
- Missing: a first request on a timer, not a condition. A button glow. Taps near the camp always work.
- Effort: **S**

**Beat 3 (1:30–3:00). The first sprout.** It pops up fast. Pip hugs it. "First seed!"
- Exists: `plantTree`, `celebrate`, `pokeCol`.
- Missing: a quick first sprout (about 20 s) and a "seed" milestone.
- Effort: **S**

**Beat 4 (3:00–4:30). The first hut, together.** Gertie asks for wood. You tap Give, and you watch it go up.
- Exists: `KINDS.hut`; `simSettlement` already builds huts; `celebrate('hut')`.
- Missing: link the hut to your gift. Close the build menu after one pick.
- Effort: **M**

**Beat 5 (4:30–6:00). The first water.** Pip packs her backpack: "I'll find water!" She finds the sink. You lay a straw.
- Exists: `netExpStart`, `expedStep`, `netLay`, pipe mode in the Cable tool.
- Missing: it never starts at night. One card to guide the first straw.
- Effort: **M**

**Beat 6 (6:00–7:30). The first surprise.** Pip names a crack a river and builds a bridge.
- Exists: `pipRiver`, `rainbowAt`, season events in `decorTick`.
- Missing: one surprise that always fires near minute 6.
- Effort: **S**

**Beat 7 (7:30–9:00). "They did it without me."** A new settler walks in. The others build a lantern unasked. "They did this on their own!"
- Exists: settlers arrive in `simSettlement`; plans in `decorTick`.
- Missing: a real banner. Today it is a small toast, easy to miss.
- Effort: **S**

**Beat 8 (9:00–10:00). The cliffhanger.** Dusk. They sit round the campfire, awake. Pip looks up at the shelf: "Something glitters up there. I'll go tonight. Come back tomorrow?" The Come back later button glows.
- Exists: `comeBackLater`, `awaySummary`, `funReturn`, `makeWonder`.
- Missing: a campfire job at night, not bed. A mystery the diary answers next time.
- Effort: **M**

---

## 3. Smallest changes with the biggest effect

1. **No bedtime in the first session.** At night they sit round the campfire for the first 10 minutes. Change the night rule in `chooseJob`. This turns 8 dead minutes into play. **S**
2. **Point the camera at the camp.** Fly to it on "We landed!" (`focusOn`). Zoom on the camp, not the room. Close the build menu after one pick. **S**
3. **One request in the first minute.** Pip asks for seeds. The button glows. Taps near the camp always work. Now the player has a job. **S**
4. **One voice at a time.** Move the weather card to the Menu or minute 8. Hide the sky panel behind Menu. Stop the Pip cam covering cards. No "huts" line when there are no huts. **S**
5. **End on a question.** Near minute 9, Pip names something to explore tonight. Come back later glows. The diary answers it next time. **S–M**
