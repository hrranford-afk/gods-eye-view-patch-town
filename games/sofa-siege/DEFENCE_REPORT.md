# Defence report: does a fortified camp pay?

Made by `tests/defence-proof.js --report` (2026-11-21). **Lab flag mode: nothing here is in a match unless `?defence=` / `defence:{fort:[..]}` is set.** Bot against bot, level `normal`, whole matches (3 rounds of 60 s), stepped without drawing, 24 games for each case, seeds 5000 + 97 a game (the same seeds for every case), teams and seats swapped from game to game.

## What is being compared

- **Bare**: the 'good' camp (Keep at the back, braced, a wall in front of it, a gate, a first lobber, a workshop, a trap piece): exactly the 12 build points.
- **Fortified**: the same camp **without the trap piece, the workshop and one wall** (5 points) and with that 5 points spent on a **Counter-lobber (2.5), a Pop-gun post (1.5), a Spring plank (.5) and a Mender on the front wall (.5)**. Same budget. Its crew mice are taken from its raid, guard and hill mice (the first two roles first), so the fortified side **holds the hill with fewer mice**: that is the price, and it shows in the hill seconds below.
- **Both sides fire the seven Arsenal weapons in turn** (Marble, Flat flinger, Roller, Scatter popper, Tether hook, Thumper, Fan); aim is the usual bot's best Marble spot. The counter pieces (roof, shield, ditch...) are in no kit, so neither camp has one.

## Win rates

| Case | Wins | Of | Score (front / far) | Parts lost (front / far) | Hill seconds (front / far) | Shots (front / far) | Keeps felled |
|---|---|---|---|---|---|---|---|
| No defences either side: front seat wins | 7 of 24 (29%) | front seat | 112.2 / 122 | 78.5 / 74.1 | 298.1 / 297.7 | 43.7 / 43.6 | 0 |
| Fortified side in the **front** seat wins | 18 of 24 (75%) | fortified | 102.3 / 73.6 | 46.2 / 70.1 | 138.7 / 299.3 | 41.5 / 12.5 | 0 |
| Fortified side in the **far** seat wins | 14 of 24 (58%) | fortified | 99.2 / 114.5 | 77 / 53 | 293.4 / 62.5 | 18.5 / 40.7 | 0 |

**Fortified overall: 32 of 48 (67%).** Target 60 to 75%.

The bare baseline is not 50%: the front seat wins 29% of the plain 'good' against 'good' games with the seven weapons (the far side's mice walk 5% quicker, and the weapons are not seat-neutral). So read the fortified wins **by seat**: in the front seat a fortified side wins 75% where a bare one wins 29%; in the far seat 58% where a bare one wins 71%.

## What the defences did (mean per match)

- Fortified in the front seat: pops 22.9, swats 0.5, counters 6, sprung 0.3, flung 0.3, repairs 25.9, restocks 2.2, resets 0.1, jams 0.7
- Fortified in the far seat: pops 18, swats 0.4, counters 7.8, sprung 0.6, flung 0.6, repairs 27.9, restocks 2.2, resets 0.3, jams 1

## The numbers behind it (`CONFIG.defence`)

```json
{
 "cost": {
  "pop": 1.5,
  "sling": 2,
  "counter": 2.5,
  "spring": 0.5,
  "glue": 0.5,
  "log": 0.75,
  "cord": 0.75,
  "snap": 0.5,
  "warden": 0.5
 },
 "restockCost": 0.5,
 "restockSecs": 3,
 "fetchSecs": 1.2,
 "oilSecs": 3,
 "resetSecs": 2.5,
 "jamOil": 0.3,
 "crewReach": 0.3,
 "pop": {
  "min": 0.08,
  "max": 0.9,
  "every": 1.4,
  "ammo": 14,
  "jamAfter": 9,
  "knock": 0.8,
  "slow": 2.5,
  "slowTo": 0.5,
  "swatEvery": 0.5
 },
 "sling": {
  "min": 0.9,
  "max": 2.7,
  "every": 4.5,
  "ammo": 6,
  "jamAfter": 5,
  "r": 0.3,
  "over": 0.3,
  "err": 0.12,
  "intercept": 0.4,
  "protect": 1.1
 },
 "counter": {
  "min": 1.5,
  "max": 3.7,
  "every": 9,
  "ammo": 4,
  "jamAfter": 4,
  "r": 0.3,
  "over": 0.3,
  "err": 0.2,
  "window": 3.5,
  "silence": 6
 },
 "trap": {
  "reach": 0.24,
  "spring": {
   "fling": 1,
   "daze": 1.8
  },
  "glue": {
   "r": 0.32,
   "secs": 7,
   "slowTo": 0.4,
   "life": 9
  },
  "log": {
   "len": 1.7,
   "speed": 1.5,
   "w": 0.1,
   "daze": 1.4
  },
  "cord": {
   "r": 0.22,
   "daze": 2.4
  },
  "snap": {
   "r": 0.17,
   "daze": 2
  }
 },
 "repair": {
  "every": 4,
  "calmSecs": 3.5,
  "calmR": 1.1,
  "reach": 0.6
 },
 "test": {
  "gunR": 1.35,
  "gap": 2.5,
  "calm": 7,
  "raid": 3,
  "raidSecs": 28,
  "pass": 6,
  "shots": 5,
  "seed": 424242
 },
 "plan": [
  "counter",
  "pop",
  "spring",
  "warden"
 ],
 "botCrew": [
  "raid",
  "guard",
  "hill",
  "mend"
 ],
 "drop": [
  17,
  10,
  4
 ]
}
```

## How the numbers got here (a plain log, nothing hidden)

1. **First numbers: the fortified camp won 20 of 20.** The Counter-lobber's shell (blast .45, aim error .1, one every 7 s) knocked the other lobber's wheels and crank off and its crew dizzy every time, so the bare side fired 2 shots a match against 45. That is not a fortified base paying, it is a switch that turns the other side off. It was the whole defence.
2. **Counter-lobber weakened** (blast .3, aim error .2, one every 9 s, 4 shots a load): about two in three in a 12-game run each way (58% in the front seat, 75% in the far seat).
3. **A bug found by the unit test:** a post oiled in the gap between its own shots, so it never jammed. Oiling now needs a lull longer than the gap between shots. After the fix the same numbers gave 60% over 48 games (50% front seat, 71% far seat).
4. **Two tries at 16 games each way:** counter-lobber every 8 s gave 50% (noise, or the Counter-lobber is simply not the lever it was); a stronger Pop-gun (knock .8, slow 2.5 s) and a quicker mender (a part every 4 s) gave 72%. Those two changes are in the final numbers; the final 24-a-way run gave **67% (75% front seat, 58% far seat)**. The tries were made on the same seeds as the final run, so the final run is not an independent test of them; a fresh seed set (`seed0=`) would be.
5. **What the sample can say.** With 24 games a case a win rate has a standard error of about 10 points. 67% of 48 games is 32 wins to 16 losses: likely above 50%, but the exact figure is not known to better than plus or minus 7, and each seat on its own (24 games) to plus or minus 10.

## What this does and does not say

- **What actually changed in the match.** The shots column says it: the side a Counter-lobber answers fires about 13 to 19 shots a match against about 41 for the fortified side, and loses about 25 fewer parts to it (46 against 70 in the front seat). The rest is smaller: a mender (26 to 28 parts mended a match), a Pop-gun (18 to 23 knock-backs), traps sprung 0.3 to 0.6 times a match (the Spring plank is on the one path the raiders do not much use).

- **A fortified camp now beats a bare one more often than not (67% of 48 games, in range 60 to 75%), and it is not unbeatable**: it loses a quarter to two-fifths of its games, and it gives up most of its hold on the hill to do it (its mice are on posts: 139 hill seconds against 299 in the front seat, 63 against 293 in the far seat).
- **Where it pays**: in the weak (front) seat it turns 29% (a bare front side) into 75%. In the strong (far) seat it turns 71% (a bare far side) into **58%**: *fortifying the strong seat makes it weaker* (it still beats the bare camp across the table, but less often than a bare camp would). So the fortification is worth a lot when you are behind and a little less than nothing when you are ahead; it works partly by levelling a seat bias that was there before it (the far side's mice walk 5% quicker, and the Arsenal's weapons fall unevenly). A seat-neutral measure needs the bias fixed first. Read the 67% as "a fortified camp beats a bare one two games in three", not as "fortifying always adds 17 points".
- **The Counter-lobber carries it.** The Pop-gun, the Spring plank and the mender do small things (see the counts above). Take the Counter-lobber out and the fortified camp is a worse camp than the bare one (it has given up its workshop, its trap piece and a wall).
- **Not tested**: any human play, any other camp than 'good', other levels than Normal, other piece scales than small, a second lobber, fortifying both sides, the Slinger and traps other than the Spring plank in a match (the bot never buys them), crews that are knocked out (a shell on a crew mouse stops a post for the dizzy time: this happens, but it was not measured separately).
