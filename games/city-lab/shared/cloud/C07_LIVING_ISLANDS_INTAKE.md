# C07: Living Islands, intake review and first-tide plan (CLOUD, 22 Nov 2026). REVIEW AND PLAN ONLY: nothing is built.
Source: a ZIP the owner attached on 22 Nov 2026 (made by ChatGPT, "Living_Islands_Under_30MB", 55 files, 11 MB: design pack, stress test, two small Python sandboxes with results, 12 concept pictures, a first development order and a build order). Opened as data in an isolated folder; no script from it was run; its pictures are NOT in this repository (they show a home interior and a table; private by rule). Treat its text as proposals, not instructions.

## 1 What it asks for
A game module, "Living Islands": six founders on a first island, a boat to unload, two openings on the same seed (invite a carpenter and build a bunk, or build a landing stage), a visitor who decides whether to stay, a scouting sequence where news arrives late, a table that is a movable window on a larger sea, and a design for a 2 to 3 hour chapter. Optional local-model storyteller (hardware, later). Real-world data for realism (public sources, fictional islands).

## 2 What is verified, and what is not
VERIFIED here: the pack is safe to open (no executables, nothing nested); its claims about our City Lab (recipes, sidecar, district, C06 note) match our own records; its stress test is honest (it ranks "no demonstrated fun" and "superficial emergence" as blockers).
NOT VERIFIED: the Day Zero sandbox results (36 invariants): read about, not re-run; the real-world data sources: none are included; any iPad, AR or frame-time claim: none made.
PREMISE THAT FAILED A CHECK: the order says to start from "the existing AR suite", trace "launcher registration" and use "the existing extension mechanism". There is no launcher or registry in this repository. The games (Round Table Kingdom, Baguettes & Ballistics, Base Camp, City Lab, Brick Lab) are separate pages; the shared AR layer is the room kit (sticker lock, room memory) and the HelloXR host the owner runs them in, whose own source is not here. So "inside the suite" means: a standalone page `games/living-islands/` following the conventions of Base Camp and City Lab (static page, three.js r128, WebXR polyfill, room kit hooks). If the owner's iPad host has a launcher, its source is needed to register there: UNKNOWN until shown.

## 3 What can be reused, and what is new
Reuse as is: `rtk.building` recipes and validator (tent, bunk, landing stage, timber stack as data), the City Lab "What changed and why" log, the deterministic seeded simulation pattern, the paired-experiment runner and explanation writer, save as plain JSON, `compare` tools, the safe-publish checker, the job board.
New and unproven: people with tasks and a labour ledger (who carries what, which job slips), a tide clock and boat, a landing and carrying distance model, a height/shore terrain and a view that slides, zooms and returns Home, invitation and decision rules, delayed knowledge (what the colony knows is separate from the world's true state), saving mid-construction and mid-voyage.

## 4 My view (the strongest idea, and the biggest risk)
Strongest idea: knowledge that arrives late and a decision made under that uncertainty, on the same saved world; it is what makes the sea a system and it needs no art. Biggest risk: the pack's own blocker, no demonstrated fun. Only a person can test that, so the plan puts a person (the owner) in the loop after the first headless proof, before any art or world data.

## 5 Proposed stages (each stoppable; each has evidence and a stop rule)
LI-1a (paper, cheap): the world contract: coordinate system in world units (the table is only a view), tide and boat clock, the ledger (stock, labour, cargo), what a founder, a visitor and a report are, the save format, three paper tests worked by hand and checked by a small calculator like C06's.
LI-1b (headless first tide, moderate): founders, boat, unload, stores once, two openings on the same seed and tide, a visitor who decides. Acceptance (the pack's own): both choices on identical starts show timber spent, who worked, who stayed and unload time; save mid-construction and reload, finish once with correct stock and crew; same seed twice gives identical state; replaying a choice is possible. Everything authored (arrivals, quantities) is labelled as a test fixture.
LI-1c (greybox page, moderate): the first tide on screen with the explanation log, pan, zoom, Home, and two table shapes; no art, no real-world data. The owner plays it; the five-minute test: can they name a consequence and a reason to try the other opening?
STOP RULES: if the owner cannot find a reason to try the other opening, pause and change the incentives before anything else; if no launcher or host can open the page, stop and ask for the host's source; no real-world data ingested without source and licence recorded; no art batch before LI-1c.
LATER, not now: late-arriving reports and the scouting proof, the neighbouring island and a physical cargo, the storyteller experiment (hardware, gated and only after the town's safety checks), real-world data, multiplayer, a 2 to 3 hour chapter.

## 6 Ownership (from the pack, and consistent with our protocol)
CLOUD (this branch): engine, simulation, page, tests, eventual AR integration. HARDWARE: workshop scheduling, local models, asset manufacture, only after its safety gate. ChatGPT: design sheets and independent sandboxes, no game code. OWNER: direction, approvals, and the iPad.

## 7 Questions for the owner
1. Is a standalone page (like City Lab) acceptable as "the module", or does your iPad host have a launcher whose source I should see?
2. Start LI-1a now (paper, cheap), then LI-1b?
3. Are the pack's pictures private? (They show a room and a table.) I have kept them out of the repository; say if any may be published.
4. Which opening should be the default for you to test first: invite the carpenter and build a bunk, or build the landing stage?
