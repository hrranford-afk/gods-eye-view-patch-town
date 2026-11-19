# Round Table Kingdom v2 ("Break the camp"): proof by bots

Made by `tests/proof.js`. Every match is bot against bot, stepped headless (no frames drawn), at the default piece size (small), with the numbers in `CONFIG` as committed. In each experiment the two sides differ only in the thing being measured; the side that has it swaps ends and teams from match to match. Seeds start at 40000.

The old rules (`?rules=1`) have their own report in `BOT_REPORT_V1.md`.

## The four proofs

| Proof | Asked for | Measured | Matches | Holds |
|---|---|---|---|---|
| 1. A good camp beats a bad camp (same bots) | good wins 70% or more | good wins **100%** | 200 | yes |
| 2. A bot that aims beats a bot that fires anywhere (same camps) | aimer wins 70% or more | aimer wins **100%** | 200 | yes |
| 3a. Collapses in a match | 2 or more | **4.8** on average; 92% of matches had 2 or more | 200 | yes |
| 3b. A Keep comes down | in 40 to 70% of matches | **50%** | 200 | yes |
| 3c. Camp parts off at the end | about a third to a half | **43%** (winner 39%, loser 48%) | 200 | yes |
| 3d. Longest stretch with nothing happening | under 12 s | average **5.8 s**, worst of all matches 11 s; under 12 s in 100% of matches | 200 | yes |
| 4. Blue against red, same camps and bots | each wins 45 to 55% | blue **52%**, red 48% | 200 | yes |
| Stuck mice (20 s with a goal and no move) | none | 0 | 600 | yes |

A win share from 200 matches is good to about ±7 points, so read every percentage here with that in mind.

What the camps and bots are:

- **Good camp:** the Keep at the back with two braces propping it, three walls close in front of it, a gate and two more walls as a forward screen, a workshop, a spring trap. 12 points.
- **Bad camp:** the Keep out in front with nothing before it; the walls, gate, tent and workshop behind it. 12 points.
- **Average camp** (what the easy and normal bots build): walls spread wide round the hill side, nothing close to the Keep.
- **Aiming bot:** for every shot it looks at what would really come off (the Keep's braces, the legs they held, a wall about to fall, standing mice), tries the low and the high lob, allows for its own wobble, and saves Big Marbles for the Keep.
- **Random-fire bot:** fires at a random spot in the other camp, and uses a Big Marble as soon as it has one. Its mice follow the same orders as the aimer's.

## Averages for a match

| | equal camps and bots | good camp against bad camp | aimer against random fire | equal good camps | equal, easy bots | equal, hard bots |
|---|---|---|---|---|---|---|
| Matches | 200 | 200 | 200 | 60 | 60 | 60 |
| Bot level | normal | normal | normal | normal | easy | hard |
| First-named side wins | 55% | 100% | 100% | 43% | 55% | 50% |
| Blue wins | 52% | 50% | 50% | 40% | 48% | 50% |
| Front seat wins | 54% | 50% | 50% | 40% | 52% | 40% |
| A Keep comes down | 50% | 62% | 91% | 0% | 27% | 0% |
| Keeps felled by | a marble 5, a Big Marble 95, raiders 0, flying parts 0 | a marble 0, a Big Marble 124, raiders 0, flying parts 0 | a marble 6, a Big Marble 175, raiders 0, flying parts 0 | a marble 0, a Big Marble 0, raiders 0, flying parts 0 | a marble 1, a Big Marble 15, raiders 0, flying parts 0 | a marble 0, a Big Marble 0, raiders 0, flying parts 0 |
| Collapses | 4.8 | 4.7 | 4.3 | 5.6 | 5.2 | 5.9 |
| Parts knocked off | 121 | 93 | 102 | 124 | 127 | 126 |
| Parts mended back | 39 | 34 | 36 | 38 | 44 | 36 |
| Camp parts off at the end | 43% | 34% | 37% | 50% | 43% | 53% |
|   the winner's camp | 39% | 20% | 25% | 47% | 39% | 51% |
|   the loser's camp | 48% | 48% | 49% | 54% | 46% | 55% |
| Dizzies | 50 | 46 | 27 | 63 | 49 | 69 |
| Marbles fired | 74 | 73 | 64 | 80 | 78 | 80 |
| Raider pulls | 29 | 23 | 25 | 20 | 33 | 20 |
| Spring traps sprung | 0.0 | 0.9 | 0.0 | 1.6 | 0.0 | 1.3 |
| Fight length (of 180 s) | 149 s | 151 s | 131 s | 180 s | 167 s | 180 s |
| Longest quiet stretch, average | 5.8 s | 5.9 s | 6.4 s | 6.5 s | 6.1 s | 6.2 s |
| Longest quiet stretch, worst | 11 s | 15 s | 13 s | 9 s | 8 s | 12 s |
| Stuck mice | 0 | 0 | 0 | 0 | 0 | 0 |

## What was changed to make the proofs hold

The first measurements failed badly: the good camp won 42 to 53%, the aimer lost to random fire, the Keep of an average camp fell in 97% of matches and a good camp's never, and only 12 to 21% of a camp was off at the end. These are the changes, rules first, then numbers.

**Rules**

1. **A Big Marble always flies low.** It is too heavy for the high lob. So a wall in front of the Keep stops it (the first piece along the arc takes the hit), and the attacker has to open a lane first. This is what makes a wall worth building.
2. **A Big Marble that lands on a Keep breaks the leg nearest to where it hit, braced or not.** Before, it had to land within a share of its blast of the leg, which worked from one side of the Keep and not from another.
3. **Keep braces and unbraced legs are sturdier.** A brace comes off only when the hit is within 70% of the blast, an unbraced leg within 50%.
4. **Score counts whole pieces, not parts.** A whole Keep is worth 54, a lobber 8, a wall 5, a gate 3.5; each part off counts its share. A collapse is worth 2, not 5. Before, every part was 1 point, so a camp with many walls handed points to the other side, and blue's seven-plank walls gave away more than red's five-plank ones.
5. **The marble lands exactly where the dotted arc says.** The arc shown, the spot the bot reckons with and the real landing used to differ by up to 5 cm of table, enough to miss a brace.
6. **Red no longer pulls parts twice as fast** (`redRaid` 1). With it red won nearly every match that went to points. Blue keeps its longer guard corks. **Red's mice now walk 17% quicker in the fight** (`redWalk`): without it blue won about two matches in three. I do not fully understand where blue's edge comes from (the two teams' wall and tent models differ); the number is a counterweight, not a cure.
7. **The bot keeps two mice on the hill**, sends one to raid and one to mend, and calls the raider back to guard when raiders are in its camp. Before, it pulled mice off the hill to mend whenever four parts were down, which was nearly always.
8. **The aiming bot is new.** For each shot it works out what would really come off, low lob and high, a little to each side for its own wobble, and takes the best. It saves Big Marbles for the Keep. It also fires at mice that are standing still.

**Numbers** (all in `CONFIG.v2`): blast 0.2 to 0.3; mending 4 s to 12 s a part (a whole workshop still halves it); a Big Marble for every 24 s of holding the hill, not 10; raiders pull every 3 s, not 5; mouse speed 0.5 to 0.42 (camp to hill in about 6.5 s at the small size); the normal bot's aim wobble 0.12.

## What to know before trusting this

- **These are bots, not people.** They show that the rules reward a good camp and good aim when both are played competently. They do not show that the game is fun.
- **Two good camps never lose a Keep to each other** (see the "equal good camps" and "hard bots" columns; the hard bot builds the good camp): the walls stop every Big Marble and the bots do not manage to open a lane and use it in time. Those matches all go the full three rounds and are decided on points. So the "Keep down in 40 to 70%" target holds for the normal bot and its average camp, not for the hard bot, and with easy bots it is lower too. A person may find the lane; the bots do not.
- **The first two proofs came out at 100%, not just over 70%.** The bad camp is very bad (its Keep stands in front of everything) and random fire is very poor. The proofs say building and aiming matter; they do not say by how much between two sensible players.
- **Keeps are felled by Big Marbles, almost never by ordinary marbles.** Ordinary marbles strip walls, braces and roofs and send mice home. So the hill matters a great deal: no hill, no Big Marbles, no Keep.
- **Spring traps hardly ever go off** in bot matches (see the row): raiders go for the nearest wall and seldom cross the trap. The trap works when a mouse steps on it (it is tested), but the bots do not show it earning its 2 points.
- **There are a lot of dizzies** (see the row), far more than under the old rules, because the aiming bot fires at mice that stand still. It may feel busy. `aimWorth.mouse` turns it down, but the proofs would need running again.
- **Blue against red rests on one counterweight number** (`redWalk`), as said above.
- The good camp spends its 12 points on a propped Keep, five walls, a gate, a workshop and a trap. It has no tent. The bad camp has the same value in pieces, badly placed.

## The numbers used

```
{"reload":2.5, "blast":0.3, "bigBlast":0.36, "sturdy":0.55, "throwNear":0.6, "throwFar":0.2, "corkCount":5, "corkSpread":0.42, "corkHit":0.2, "corkCd":8, "hillSecs":24, "bigMax":3, "piecePts":{"tower":54, "lobber":8, "wall":5, "gate":3.5, "workshop":4, "tent":5, "brace":1, "trap":1}, "collapsePts":2, "hillPts":0.07, "mendTime":12, "redWalk":1.17, "raidEvery":3, "redRaid":1, "raidReach":0.4, "guardRange":1.1, "blueGuard":1.5, "guardEvery":2, "guardChance":0.45, "guardRing":0.55, "fallReach":0.2, "chainReach":0.13, "chainThrow":0.42, "collapseReach":0.25, "slowMo":0.4, "keepFall":2.4, "points":12, "cost":{"tower":0, "wall":1, "gate":1, "brace":1, "lobber":3, "workshop":2, "tent":1, "trap":2}, "walk":0.42, "shopMend":0.5, "tentDizzy":3, "twoLobbers":0.55, "trapReach":0.2, "trapReset":2, "arcLow":[0.1,0.09], "arcHigh":[0.3,0.24], "highBlast":0.5, "plan":{"hill":2, "raid":1, "guard":0, "mend":1}, "randomAim":1.9, "botFirst":1.5, "legSturdy":0.5, "braceSturdy":0.7, "aimWorth":{"leg":30, "lastLeg":60, "brace":3, "mouse":2}, "aimTry":[-0.25,0,0.2,0.45], "bigWorth":8, "aimDeep":5, "botRetarget":4}
levels: {"easy":{"err2":0.2, "fire":13, "err":0.5, "send":5, "raidLead":6, "preset":"average"}, "normal":{"err2":0.12, "fire":12, "err":0.45, "send":2.5, "raidLead":1.5, "preset":"average"}, "hard":{"err2":0.06, "fire":11, "err":0.2, "send":0.6, "raidLead":2, "preset":"good"}}
```

## v2b: two real lobbers and five kinds of ammunition (60 matches per check)

Everything above this heading was measured before the second lobber became a weapon of its own and before the Bouncer and the Glue blob existed, with 200 matches a check. Everything under it was measured with the numbers in `CONFIG` as committed with it, by `tests/proof.js 60 mode=v2b`, with the same method (bot against bot, stepped headless, small pieces, the side that has the thing under test swapping ends and teams from match to match, seeds from 40000). Sixty matches is good to about ±13 points, so a result within that of a limit is not a clear pass.

| Check | Asked for | Measured | Matches | Holds |
|---|---|---|---|---|
| 1. Good camp against bad camp | good wins 70% or more | good wins **98%** | 60 | yes |
| 2. The aiming bot against random fire | aimer wins 70% or more | aimer wins **97%** | 60 | yes |
| 3. A bot with two lobbers against one with one, equal otherwise (average camp, the second lobber bought with one wall and the spare points) | two wins clearly, but under 75% | two lobbers win **72%** | 60 | yes |
| 3b. The same with the good camp (the second lobber bought with the workshop and a wall) | the same | two lobbers win **100%** | 60 | **NO** |
| 4. Blue against red, same camps and bots | each wins 45 to 55% | blue **48%** in the normal-bot matches, **37%** over all 240 equal matches (equal camps and bots; equal good camps; equal, easy bots; equal, hard bots) | 240 | **NO** |
| 5. No kind of ammunition decides more than about 60% of matches | 60% or under | most any kind decides: **52%** (Big Marble) | 240 | yes |
| 6a. A Keep comes down | in 40 to 70% of matches | **50%** (equal normal bots); the other equal columns: 0% equal good camps, 27% easy, 0% hard | 60 | yes |
| 6b. Collapses in a match | 2 or more | **3.6** on average; 2 or more in 93% of matches | 60 | yes |
| Stuck mice (20 s with a goal and no move) | none | 0 | 480 | yes |

### Which ammunition is fired, and which decides

Per match, in the equal-camp, equal-bot matches (normal bots, average camps; 60 matches) and over all 240 equal matches. "Keep felled" is the share of matches in which a Keep came down by that kind of shot. "Decides" is the kind that felled the Keep or, when none fell, the kind that put most of the winner's lead on the board: the points it took off the loser's camp minus the points the same kind took off the winner's. A Glue blob does no damage, so it can only help (see the glued parts a match below); it never decides by that count.

| Ammunition | Fired a match (normal bots) | Fired a match (all equal) | Keep felled by it (normal bots) | Keep felled (all equal) | Decides (normal bots) | Decides (all equal) |
|---|---|---|---|---|---|---|
| Marble | 61.7 | 57.2 | 5% | 2% | 22% | 28% |
| Big Marble | 3.4 | 3.8 | 45% | 18% | 52% | 30% |
| Corks | 0.7 | 0.9 | 0% | 0% | 0% | 0% |
| Bouncer | 3.3 | 5.5 | 0% | 0% | 7% | 7% |
| Glue blob | 8.8 | 12.3 | 0% | 0% | 0% | 0% |
| raiders and flying parts |  |  | 0% | 0% | 17% | 34% |
| nothing in it (level on damage) | 0.0 | 0.0 | 0% | 0% | 3% | 1% |

Glued parts a match (normal bots): **14.7**. Bouncer hops that came off: **3.3** a match.

### Averages for a match

| | good camp against bad camp | aimer against random fire | equal camps and bots | equal good camps | equal, easy bots | equal, hard bots | two lobbers against one (average camp) | two lobbers against one (good camp, paid for) |
|---|---|---|---|---|---|---|---|---|
| Matches | 60 | 60 | 60 | 60 | 60 | 60 | 60 | 60 |
| First-named side wins | 98% | 97% | 42% | 55% | 52% | 55% | 72% | 100% |
| Blue wins | 48% | 50% | 48% | 45% | 28% | 25% | 65% | 50% |
| A Keep comes down | 77% | 78% | 50% | 0% | 27% | 0% | 93% | 83% |
| Collapses | 4.3 | 3.1 | 3.6 | 3.6 | 3.7 | 4.2 | 2.3 | 2.7 |
| Parts knocked off | 89 | 96 | 114 | 112 | 115 | 122 | 91 | 91 |
| Parts mended back | 37 | 36 | 39 | 44 | 44 | 41 | 20 | 27 |
| Camp parts off at the end | 31% | 34% | 40% | 40% | 37% | 47% | 42% | 44% |
| Dizzies | 37 | 25 | 46 | 49 | 43 | 53 | 27 | 40 |
| Shots in all | 65 | 66 | 78 | 78 | 79 | 84 | 69 | 81 |
| Glued parts | 6.7 | 5.2 | 14.7 | 24.6 | 13.4 | 26.6 | 8.0 | 22.0 |
| Fight length (of 180 s) | 148 s | 134 s | 153 s | 180 s | 167 s | 180 s | 99 s | 154 s |
| Longest quiet stretch, worst | 9 s | 10 s | 9 s | 13 s | 10 s | 11 s | 10 s | 14 s |
| Stuck mice | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |



### The v2b numbers used

```
{"reload":2.5, "cost":{"tower":0, "wall":1, "gate":1, "brace":1, "lobber":5, "workshop":2, "tent":1, "trap":2}, "bouncer":{"cd":5, "blast":0.2, "hop":0.9, "hopH":0.7, "hopT":0.5, "arc":[0.3,0.24], "slow":1.35}, "glue":{"cd":8, "reach":0.26, "lock":15, "slow":4, "slowTo":0.45, "puddle":9, "blob":1}, "botGlue":3, "bouncerBias":1, "plan":{"hill":2, "raid":1, "guard":0, "mend":1}, "corkCd":8, "hillSecs":22, "bigMax":3, "mendTime":12}
```
