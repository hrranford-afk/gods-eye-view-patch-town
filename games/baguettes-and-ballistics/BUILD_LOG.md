# How Baguettes & Ballistics was built (written by CAIRN, 12 Nov 2026)

These facts come from the git history (91 commits) and the game session's transcript. All of the code was written by Claude.
- **Opus (the main game session):** the core game, and every design, check and merge.
- **Sonnet builders:** most of the levels and modes, each one given a written brief by Opus.
- **The PatchTown residents:** designed the toy boxes (the council's Q6).
- **Harry:** came up with the idea, the race-then-battle twist, and the playtests.

| When | What | Who |
|---|---|---|
| 29 Oct | Core loop: cereal economy, diggers, trucks, route finding, an enemy that builds up, siege | Opus |
| 31 Oct | DESIGN.md, the developer handover, the screenshot script. The race-then-battle twist (Harry's idea) | Opus |
| 1 Nov | Sound engine, level framework, level 2 (Pencil case) | Sonnet (brief by Opus) |
| 1 Nov | Domino runs, trojan trucks, magnets and catapults; fix for the iPad memory crash | Opus |
| 1 Nov | Level 4, the Sink: boats, the Rubber Duck boss | Sonnet |
| 2 Nov | Level 1 race opening, level 3 dark drawer, level 5 hob | Sonnet ×3, run in parallel |
| 2 Nov | Finale, in stages 1–3: the Baguette boss, the Great Domino Run, the fridge, the ending | Sonnet ×4 |
| 2 Nov | Loadout race | Sonnet |
| 2 Nov | Kitchen Run, the 16-bit talk boxes | Opus |
| 2 Nov | Graphics pass (tone mapping, tilt-shift, studio lighting) on branch `game/toy-graphics`. **Never merged.** | Sonnet |
| 10 Nov | AR mode on the iPad | Sonnet; the iPad fixes by Opus |
| 11 Nov | My Track (scan the table, then race on it) | Opus |
| 11 Nov | Drift mode | Sonnet |
| 11 Nov | Toy boxes, designed by the council | Sonnet, to the residents' designs |

## The pattern that worked
1. A short design doc first, fun-first, with one twist (race, then battle).
2. One playable loop before any content.
3. Then one level at a time. Each level got its own brief, its own test numbers and its own screenshots, and it was merged only once it was checked.
4. HANDOVER.md was written as the game was built (now 142 KB), so every new builder started from the facts.
5. Everyday objects as the world: a kitchen, a sink, a hob. They are readable at a glance and funny.
6. Problems were measured, not guessed: memory leaks, crossing times, frame costs.

## ChatGPT's part (checked against every chat and commit, 12 Nov)
- **2 Nov:** Harry offered to make ChatGPT pictures. The prompts written that evening were for the Cairn mountain game, not this one, and no pictures came back into this session.
- **3 Nov:** credits ran out. START_HERE.md was written so Harry could carry on with ChatGPT. GitHub shows no commits from 3 to 10 Nov, so nothing from ChatGPT was added to the files.
- **10 Nov:** Harry had tried an AR version with ChatGPT and offered to send it. It was never sent. The AR mode in the game was built by a Sonnet builder.
- **What can't be seen from here:** any ideas Harry worked out with ChatGPT and then passed on in his own words. Those are logged as Harry's ideas.

## Graphics pass (13 Nov)
- Toy graphics (tilt-shift that follows your car, rounded boxes, soft blob shadows, studio shine, dust and smoke, auto-downgrade watchdog) merged into the current game with every feature kept. All behind `GFX` flags. See HANDOVER.md, "Graphics: the toy look".
