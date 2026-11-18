# Sofa siege: bot against bot, 20 matches

Made by `tests/fight-test.js` (headless, stepped fast, no drawing of frames). Both sides are the same bot at the same level; the teams swap ends every match. Match 1 plays the full 2-minute build step; the others start from preset camps.

| What | Result |
|---|---|
| Wins | blue 7, red 13 |
| Wins by end of table | front 11, far 9 |
| Easy | 7 matches: blue 1, red 6 |
| Normal | 7 matches: blue 5, red 2 |
| Hard | 6 matches: blue 1, red 5 |
| Average fight length | 169 s of 180 s (shortest 121 s) |
| Ended early by reaching 100 | 6 of 20 |
| Hill changed hands | 15.7 times a match (least 1, most 29) |
| Parts knocked off | 39.6 a match; 20.6 mended back |
| Mice made dizzy | 47.0 a match |
| Marbles fired | 49.5 a match |
| Stuck mice (no move for 20 s while it had a goal) | 0 |
| Longest stretch with no event | 20.8 s (average worst 6.3 s) |

An event is a marble fired, a part knocked off or mended, a mouse going dizzy or popping home, or the hill changing hands.

Twenty matches is a small sample: a 13 to 7 split can come from chance alone. The quiet stretch of about 20 s is the 10 s mend break (no marbles, no scoring) plus the slow easy-level lobber on either side of it.

| # | Level | Front team | Winner | Score front:far | Fight s | Hill flips | Parts off | Mended | Dizzy | Longest quiet s |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | easy | blue | red | 51:56 | 180 | 10 | 22 | 11 | 29 | 7.1 |
| 2 | normal | red | blue | 82:97 | 180 | 20 | 23 | 16 | 57 | 5.6 |
| 3 | hard | blue | red | 64:93 | 180 | 22 | 65 | 28 | 76 | 3.1 |
| 4 | easy | red | red | 86:46 | 180 | 9 | 55 | 24 | 35 | 6.4 |
| 5 | normal | blue | blue | 100:4 | 156 | 1 | 8 | 6 | 25 | 7.7 |
| 6 | hard | red | red | 100:35 | 129 | 18 | 43 | 33 | 60 | 5.5 |
| 7 | easy | blue | red | 42:60 | 180 | 13 | 42 | 16 | 23 | 6.9 |
| 8 | normal | red | blue | 87:94 | 180 | 14 | 27 | 18 | 46 | 5.1 |
| 9 | hard | blue | red | 72:99 | 180 | 29 | 75 | 27 | 83 | 3.4 |
| 10 | easy | red | red | 100:16 | 152 | 6 | 43 | 25 | 25 | 6.3 |
| 11 | normal | blue | red | 66:74 | 180 | 29 | 22 | 18 | 65 | 5.0 |
| 12 | hard | red | red | 87:78 | 180 | 27 | 74 | 30 | 70 | 4.1 |
| 13 | easy | blue | red | 26:38 | 180 | 7 | 39 | 15 | 31 | 7.4 |
| 14 | normal | red | red | 86:74 | 180 | 17 | 64 | 28 | 42 | 3.9 |
| 15 | hard | blue | blue | 86:86 | 180 | 23 | 48 | 29 | 78 | 3.3 |
| 16 | easy | red | red | 42:19 | 180 | 11 | 34 | 16 | 24 | 8.3 |
| 17 | normal | blue | blue | 100:50 | 156 | 21 | 19 | 16 | 55 | 6.1 |
| 18 | hard | red | red | 100:28 | 121 | 16 | 54 | 32 | 42 | 3.8 |
| 19 | easy | blue | blue | 34:16 | 180 | 8 | 16 | 8 | 27 | 20.8 |
| 20 | normal | red | blue | 34:100 | 151 | 12 | 20 | 16 | 48 | 5.9 |
