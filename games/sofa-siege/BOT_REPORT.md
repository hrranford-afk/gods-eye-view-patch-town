# Round Table Kingdom: balance sweep, bot against bot

Made by `tests/sweep.js`: 200 matches at each level, stepped headless (no frames drawn). Both sides are the same bot at the same level. The teams swap ends every match. Both camps are the same preset, so the only differences are the team rules and the dice. All matches start from finished camps.

**Fresh seeds:** this run used seedBase 777000, matches the numbers were never tuned on. Nothing was changed after seeing it.

## Results

| | Easy | Normal | Hard |
|---|---|---|---|
| Blue wins | 55% | 49% | 50% |
| Red wins | 45% | 52% | 50% |
| Each team inside 45–55% | yes | yes | yes |
| Front seat wins | 51% | 51% | 56% |
| Front seat under 55% | yes | yes | NO |
| Dizzies a match (target 15–25) | 15.0, of which cork dazes 4.4 | 17.2, of which cork dazes 4.2 | 25.6, of which cork dazes 4.3 |
| Hill changes hands (target 6–12) | 8.5 | 9.6 | 13.3 |
| Parts knocked off a match | 11.8 | 16.4 | 16.1 |
| Mended back by the end (target about 70%) | 73% | 68% | 72% |
| Marbles fired a match | 26 | 29 | 31 |
| Fight length, of 180 s | 179 s | 179 s | 180 s |
| Ended early at 100 points | 2% | 2% | 1% |
| Average winning margin, points | 23 | 29 | 21 |
| Stuck mice (no move for 20 s with a goal) | 0 | 0 | 0 |
| "?" no-way-through moments a match | 0.0 | 0.0 | 0.0 |
| Marbles into own pieces a match | 0.00 | 0.00 | 0.00 |
| Longest stretch with no event, worst of 200 | 33 s | 30 s | 24 s |

With 200 matches a win share is good to about ±3.5 points, so "50%" here means "somewhere from 46 to 54".

## What was changed, and why

Only numbers in the `CONFIG` object at the top of `game.js` were tuned. "Before" is the build of the last report (commit 54fad53).

| Number | Before | Now | Why |
|---|---|---|---|
| `dizzy` (red) | 4.9 s | 5 s, same as blue | Asked for: no special case. |
| `redParts` | 2 | 1 | Once lobbers could lose parts, a two-part marble broke the other lobber too easily: red won 68% on easy and 85% on normal and hard. |
| `corkChance` | 0.04 | 0.02 | The cork works the same at every level, so it decided easy matches: blue won about 65% there. A daze still lasts 1.6 s and never sends a mouse home. |
| `blast` | 0.34 | 0.27 | Calm down: fewer mice caught by one marble. |
| `reload` | 4 s | 6 s | Calm down: fewer marbles. It only winds while a mouse crews the lobber. |
| `squadRing` | 0.42 | 0.5 | Squads stand further apart, so one marble rarely gets more than one or two. |
| `holdSecs` | none | 1.5 s | New: the hill only "changes hands" when a side has had more mice on it for this long. It stops the callout flickering. Scoring is unchanged. |
| `gain` | 0.8 | 0.9 | Four mice a side reach the hill now (the fifth crews the lobber), so each counts a little more. |
| `mendTime` | 3 s | 2.2 s | So that mending keeps up: about 52% of fallen parts came back before, about 70% now. |
| `botMendAt` | none | 1 | New: a bot sends one mouse to mend during a round once this many of its parts lie fallen. |
| `scrapEvery` | 4 s | 5 s | Calm down: fewer parts off. |
| `wallShots` | 0.38 | 0.3 | Share of bot marbles aimed at pieces. |
| bot `fire` (easy, normal, hard) | 10, 6.5, 4.4 s | 13, 12, 11 s | Calm down. Easy now fires least often, with aim error 0.5 (was 0.8 with many misses): fewer, better-aimed shots. |
| `personal` | none | 0.17 | New: mice that have stopped keep this far apart, and each claims its own spot. |
| bot camp preset | one of three at random | always the third | The three were far from even: in hard bot matches the first won 8% and the third 69 to 78%. The other two are kept for demos and tests only. |
| bot `raidLead` (easy, normal, hard) | 8 for all | 6, 1.5, 2 | The strongest balance lever found. The red bot sends one scrapper to the nearest enemy wall when it is this many points ahead. The scrapper stands at the hill's edge, away from the marbles, and still counts on the hill. It is a jumpy lever and one value does not fit all three levels, so it is set per level; a negative value means the scrapper goes even when red is a little behind. |

Team rules that survived: blue corks (now need a clear line of sight), red scrappers (reach 0.38), the red bot's wall raid. Dropped: red's shorter dizzy and red's two-part marble.

## Final numbers

```
{
 "build": 120,
 "ready": 3,
 "count": 3,
 "round": 60,
 "rounds": 3,
 "brk": 10,
 "win": 100,
 "gain": 0.9,
 "holdSecs": 1.5,
 "walk": 1.15,
 "buildTime": 3,
 "mendTime": 2.2,
 "noShopMend": 1.5,
 "reload": 6,
 "blast": 0.27,
 "dizzy": 5,
 "personal": 0.17,
 "squadRing": 0.5,
 "corkRange": 1.2,
 "corkEvery": 3,
 "corkChance": 0.02,
 "corkDaze": 1.6,
 "scrapEvery": 5,
 "scrapReach": 0.38,
 "redParts": 1,
 "blueParts": 1,
 "botMendAt": 1,
 "wallShots": 0.3,
 "levels": {
  "easy": {
   "fire": 13,
   "err": 0.5,
   "send": 5,
   "raidLead": 6
  },
  "normal": {
   "fire": 12,
   "err": 0.45,
   "send": 2.5,
   "raidLead": 1.5
  },
  "hard": {
   "fire": 11,
   "err": 0.2,
   "send": 0.6,
   "raidLead": 2
  }
 }
}
```
