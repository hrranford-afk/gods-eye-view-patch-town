# Fortify toy model: report and honest limits

Files: `ballistics_toy.py` (the model), `test_ballistics_toy.py` (13 tests, all pass, about 17 s). Python 3 and numpy only. Deterministic: every random draw comes from a seeded `numpy.random.default_rng`.
Run: `python3 fortify/test_ballistics_toy.py`, or `python3 fortify/ballistics_toy.py 60` for a duel table.
Research note: `research/FORTIFICATIONS_THROUGH_THE_AGES.md`. Terrain: the existing exported world window `landform/worlds/seed0005` (a volcanic cone, 72.7 m high in a 258 m window, 3 m cells). No page, kit or asset file is touched. No real place or weapon name is in the code.

## What it does

1. **Terrain.** Loads `world.bin` heights (int16 divided by 256), bilinear sampling, off the table is open sea.
2. **Flight.** A shot has gravity, quadratic drag (`drag_k` per metre of air) and wind. Wind is the air's velocity, so the shot is pushed by the difference between its speed and the wind. Midpoint (RK2) steps of 0.02 s, which are exact for constant acceleration. The ground crossing is found by bisection inside the step.
3. **Hits.** A shot is a segment each step. It is tested against oriented boxes (wall parts, the bunker) with the slab method. The earliest crossing of box or ground wins. The front face of a wall can lean back: only its normal changes (the box stays a box).
4. **Damage.** Direct damage = weapon damage x material factor for that weapon kind x cosine of the angle of incidence. Beyond 72 degrees the shot glances off (12 percent damage). Splash damage falls off linearly with distance and has its own material factor. A wall is a row of 2 m parts. Each part has hit points = material hit points per metre x thickness. A part is `intact`, `damaged` (half gone) or `failed`. A failed part drops to a rubble height (earth 35 percent, stone 25, timber 15, concrete 20), so later shots fly over or through it. That is the partial collapse.
5. **Line of sight.** A ray over the heightfield with eye height at both ends.
6. **Aiming.** Terrain-only search for the elevation that lands on the target, on the weapon's preferred branch (flat or high arc). The player's wind guess is 30 percent wrong either way. Shots get a small random angle error.
7. **Duels.** Two bunkers on the world window, 70 to 130 m apart, with a clear line of sight. Each has a 14 m x 3 m wall 7 m in front of it. Both sides have the same build budget (150 units). The weapon's cost comes off first. The rest buys wall thickness at the material's cost, capped at that material's sensible maximum. First bunker to reach zero wins. 300 s limit gives a draw.

## Tests (all pass)

| Test | Result printed by the run |
|---|---|
| Arc matches the analytic no-drag case | range error under 0.5 percent, apex under 1 percent, four speed and angle pairs |
| Higher angle goes farther up to 45 degrees | no-drag ranges at 10, 20, 30, 40, 45 degrees: 70.6, 132.7, 178.8, 203.3, 206.4 m; with drag the best angle is 40 degrees |
| Drag shortens the shot | a 30 degree shot goes from 318 m to 178 m with drag |
| Wind pushes sideways | a 6 m/s crosswind moves a 45 degree lob 7.4 m sideways, mirror image for the opposite wind; tail wind +11.8 m, head wind -12.8 m |
| Box hit and normal | hits the front face at the right x with outward normal (-1, 0, 0); a high shot passes over |
| A thicker wall survives more hits | hits to fail one part at 0.4, 0.8, 1.6 m: timber 1, 2, 3; earth 3, 5, 9; stone 2, 4, 8; concrete 4, 8, 16 |
| A sloped face survives more than a flat one at the same thickness (flat fire) | hits to fail at 0, 30, 60 degree lean, 2.4 m thick: stone 12, 13, 21; earth 14, 15, 25; concrete 23, 26, 42 |
| The trade-off is also tested | a plunging shell does more to a leaning face than to a vertical one (the slope only helps against flat fire) |
| Failure states and rubble | intact, damaged, failed; earth slumps to 1.05 m |
| Line of sight over a hill | blocked across a 25 m ridge, open along it, open from a 30 m tower |
| Reverse slope | shooter and bunker found by a fixed scan on seed 5: crest 13.9 m above both. Closest flat-trajectory shot (every elevation from -25 to 15 degrees) lands 89.6 m from the bunker. Closest high arc lands 0.18 m away. Twelve flat shots: bunker hit points 45 of 45. Twelve arcs: 0 of 45 (destroyed) |
| Determinism | same seed gives byte-identical duel results, a different seed does not |
| 60 random duels: no style or weapon dominates | see below |

## Win rates

Win rate = wins divided by appearances (a draw counts as not a win, so the average is below 0.5).

60 duels (the test, seed 7): 26 wins for side A, 26 for B, 8 draws.

| Style | Appearances | Win rate | Weapon | Appearances | Win rate |
|---|---|---|---|---|---|
| bastion (angled stone) | 28 | 0.57 | cannon | 29 | 0.55 |
| concrete (cast slope) | 21 | 0.43 | heavy gun | 29 | 0.59 |
| palisade (timber) | 23 | 0.48 | mortar | 38 | 0.26 |
| rampart (banked earth) | 28 | 0.32 | thrower | 24 | 0.38 |
| stone (plain wall) | 20 | 0.35 | | | |

The test passes if every rate is between 0.10 and 0.75. With only 60 duels a rate can be off by 10 points by luck. So a larger run, 300 duels (seed 11): styles bastion 0.44, concrete 0.44, palisade 0.38, rampart 0.50, stone 0.43; weapons cannon 0.48, heavy 0.55, mortar 0.36, thrower 0.40; 127 wins for A, 137 for B, 36 draws. Two other 200-duel runs gave styles between 0.31 and 0.54 and weapons between 0.25 and 0.62. Read that as: no single style or weapon dominates in this setup. It does not say the game is balanced.

What the numbers show:
- The heavy gun is a little ahead in the open. It is the most expensive and the slowest, so this is the price of being first to the later era, not a reason to cut it. In a real mode it needs a reverse-slope map or a counter.
- The mortar draws often (about 20 percent of its duels). It lobs almost straight up at these ranges, so wind and the player's wrong guess move it 10 m or more. That is what high arcs are like and it is a feature to tune, not hide.
- The duels are in the open. The hill advantage of the high arc (the reverse-slope test) is not in the duel win rates. That is tested alone.
- Wall styles are close because the budget cap sets thickness: cheap earth gets thick, costly concrete stays thin. That cost balance is invented.

## What is real physics and what is invented

Real (standard physics, simplified):
- Gravity, constant. A drag force that grows with the square of speed. Wind as air velocity. Range at 45 degrees is longest without drag and a little lower with drag. A steeper arc drifts more in wind. A bank that hides a target from a flat shot but not from a steep one (a reverse slope).
- Lean-back faces and cosine of the angle of incidence: a glancing shot does less to a surface than a square one, and a shot can bounce off. (The cosine rule is a game simplification of real armour and wall behaviour.)
- Thicker walls take more hits.

Invented (all TUNING, none measured):
- Every weapon speed, drag, reload, splash radius and damage. They are not copies of any real gun. The ranges (about 110 m, 240 m, 360 m, 560 m at best angle) are game-sized so they fit a 258 m window.
- Every material hit-point number, material-versus-weapon factor, cost and rubble height.
- The rule that damage is a number of hit points, and that a wall is a row of independent 2 m parts. Real walls fail by cracking, shear, spalling and overturning, and they share load.
- The leaning face as a box with a tilted normal. It does not change the volume or where a shot enters.
- Ricochet at 72 degrees, and the 12 percent left after it.
- The build budget (150) and how it buys thickness. The duel rules, aim error and wind range (0 to 5 m/s).
- Shell flight time is ignored when resolving a duel (shots land the moment they are fired). Walls are not repaired. Nobody moves. There is no fog, night, crew or morale.

## Limits

- One world window, one terrain. Other windows are not used in the tests. Seed 5 is a cone, so there are few flat open sites.
- Duel sites need a clear line of sight, so duels never use a ridge. The ridge is tested in isolation.
- Wall parts are checked as boxes. A lean-back face is one tilted normal on the front only. Top and sides use the plain box normals.
- A steep high arc (over 75 degrees) is solved on a 1 degree scan then bisected, so it is not the best solver. It can miss a root near a ridge edge. The solver rejects a jump at a ridge edge as "not a root".
- A shot is a point. There is no spin, no Magnus force, no changing air density, no moving target, no splinters.
- Win rates depend on the invented numbers. Change the cost table and the winner changes. The model is a way to see a rule's effect, not to prove a design.

## How to use it for the real build

- Port the same tables as a data file (JSON) when the kit needs it. The part states (intact, damaged, failed) and rubble heights map directly to the `repair_physics.js` method: a failed part becomes a loose rigid part or a heap, and a fit socket can take it back.
- Re-run the duel table whenever a number moves. Keep the test bounds (0.10 to 0.75) as a smoke alarm, not as a goal.
