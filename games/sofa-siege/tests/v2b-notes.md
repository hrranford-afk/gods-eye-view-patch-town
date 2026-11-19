### What was changed to make the v2b checks hold, and what did not hold

The first measurements, before any tuning, with the numbers as they were when the lobbers and the ammunition were first made real (second lobber 3, Big Marble every 24 s, Big blast 0.36, red walk 1.17):

- Two lobbers beat one **78 to 85%** of the time (average camp). Too many. The price was wrong.
- The bots threw a Glue blob whenever one was ready (28 a match): marbles fired fell from 74 to 49, and a Keep came down in only 30 to 33% of matches (it was 50% before).
- A Big Marble decided **67 to 78%** of matches.

What I changed, all in `CONFIG.v2` (the rest of the numbers are as they were):

| Number | Was | Now | Why |
|---|---|---|---|
| `cost.lobber` (the second lobber) | 3 | **5** | at 3 two lobbers won 78 to 85%; at 5 about 64 to 73%. Trying 3, 4, 5, 6 and 7 (40 to 100 matches each) gave roughly 80, 76, 68, 68 and 72%: it stops falling beyond 5, so a dearer lobber does not help |
| `botGlue` and the bot's rule for Glue | none | Glue only where a mender is at work and at least 3 fallen parts and menders lie in one splash | glue every 8 s took a third of the marbles |
| `hillSecs` (hill time for one Big Marble) | 24 | **22** | with the Big blast lowered, Keeps fell in too few matches (24% at 0.30, 43% at 0.33 and 25 s, 50% at 22 s) |
| `bigBlast` | 0.36 | **0.33** | at 0.36 a Big Marble decided 67 to 78% of matches, even those where no Keep fell. At 0.30 blue won only 22 to 38% and collapses fell to 3.4 a match |
| `redWalk` | 1.17 | **1.05** | after the two changes above red's quick raiders won too much (blue 37% over all the equal matches); 1.0 gave blue 62%, 1.03 gave 55%, 1.05 gave 48% |

New numbers: `bouncer` (wait 5 s, blast 0.2, hop 0.9, hop height 0.7, arc like the high lob), `glue` (wait 8 s, splash 0.26, locks a part 15 s, slows mice to 45% for 4 s, puddle 9 s), `botGlue` 3, `bouncerBias` 1.

**What did not hold, plainly**

- **Check 3b fails: two lobbers against one, both with the good camp, win 100% at every price from 3 to 7 points.** The second lobber cannot be priced out of that match. The reason, as far as I can tell: a lobber that has had its bucket (or crank) knocked off twice is gone for good (a part is mended once), and the good camp's only lobber stands forward by the hill. With two lobbers one is always spare, and, I think (I did not follow it shot by shot), while one opens a lane through the wall the other fires a Big Marble down it, which the bots with one lobber each never manage (two good camps with one lobber each never lose a Keep, as before). The one-lobber side fires 3 to 5 shots a match. So against a camp that can be broken only by opening a lane, a second lobber is overwhelming, not just strong. The "average camp" check (3) passes at 73%, but a sample of 60 is good to about ±12 points, so 73% is not clearly under 75%.
- **Blue against red is only held on average.** Over all 240 equal matches blue won 48%, but by column it swings: 63% with normal bots on average camps, 53% easy, 45% equal good camps, 32% with hard bots. Sixty matches a column is good to ±12, and the old counterweight (`redWalk`) is still a counterweight, not a cure (see above).
- **"Decides" is my own measure** (the kind that felled the Keep, or else the kind that put most of the winner's lead on the board). By that measure the Big Marble decides 53% of the normal-bot matches and 38% of all equal matches, which is under 60%. By the plain count of Keeps felled it is 47% of normal-bot matches. A Glue blob does no damage, so by this measure it never decides: what it does is keep parts down (about 13 glued parts a match). I have no measure of how much a match turns on it. The Bouncer decides 2 to 5%: bots throw 3 a match against average camps and 5 over all, mostly against walled camps, and it cannot fell a Keep by itself.
- **Two good camps still never lose a Keep to each other** (0% in "equal good camps" and "hard bots"), as in the first report. The Bouncer and the Glue blob do not change that: the bots do not find a way to get a Big Marble past the walls.
- **Longest quiet stretch** is 10 to 14 s, a little over the 12 s limit of the first proofs in the good-camp match with two lobbers (14 s), though that limit is not one of this round's checks.
