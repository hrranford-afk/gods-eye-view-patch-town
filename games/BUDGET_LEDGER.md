# Budget ledger (CAIRN, from 13 Nov 2026)

Harry, 13 Nov: about half of the Max plan goes to building the games, and half to building the local LLM system
(the town).

## Rules for the game half
1. **Every build gets a budget and a ledger line.** Builder tokens come from each task's report (subagent_tokens).
   CAIRN's own share is estimated.
2. **Builders (the cheaper model) do the reading, coding and testing.** CAIRN (the bigger model) only decides, writes
   briefs, checks and deploys. CAIRN keeps big file dumps out of its own context.
3. **Long sessions cost more on every message,** because each reply re-reads the whole conversation. So start a fresh
   session after a big milestone, from START_HERE and HANDOVER.
4. **Volume work goes to the town** (free per run): robot players, pictures, ideas and training. Cloud tokens go on
   judgement and code.
5. **Fix flaky tests once,** because every rerun costs tokens on every build.
6. **Value per token, in this order:** the first 10 minutes and pacing, then fixes from Harry's play, then new features.
7. **Harry reads the plan meter** (CAIRN cannot see it) at set times and says the %. CAIRN adds no new work when less
   than 15% of the game half is left.

## Ledger
| Date | Job | Builder tokens | Result |
|---|---|---|---|
| 12 Nov | Build 15: props wired in | 217,080 | live |
| 13 Nov | Build 16: one look | 241,672 | live |
| 13 Nov | Build 17: mouse port (cut off by restart; finished by CAIRN) | lost with the restart | live |
| 13 Nov | Build 18 waterworks (cut off by the 14:49 restart; tests by CAIRN) | lost with the restart | built, 3 bugs found, not live |
| 13 Nov | Places prototype (resume) | 89,729 | live |
| 13 Nov | Christmas decorations (restart; then from scratch) | 293,934 | done, merge pending |
| 13 Nov | B&B graphics pass (resume) | 137,493 | test link |
| 13 Nov | Build 19 fixes (resume) | 199,124 | done; 2 claims to check (duplicate Pip chip still in shot 58; the card is not visible in shot 58) |
| 13 Nov | Restarts | 2 (about 10:40 and 14:49) | |
| 13 Nov | Build 18 test-timing fixes | 192,942 | tests fixed, no game bugs |
| 13 Nov | Vigil 3D first playable | 303,515 | test link |
| 13 Nov | Decor merged into waterworks | 113,106 | branch bc-merge20 |
| 13 Nov | Shop edition | 534,644 | test link base-camp-shop/ at 20:44 |
