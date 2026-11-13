# Vigil 3D

A first playable 3D tabletop version of Vigil, Harry's turn-based squad game. Six Wardens cross a ruined city to the
gold landing pad while the Brood swarm closes in. The board is a little diorama on a wooden table, made to sit on a
real table later (AR).

- **Play:** open `index.html` in a browser (one file, three.js r128 from cdnjs). Add `?seed=123` for the same city
  every time.
- **Rules:** the rules and turn logic are copied from `games/vigil/index.html`, not rewritten (see "Same rules" below).
- **Look:** toon-shaded miniatures with an ink outline (inverted hull). Blue Wardens, orange Brood. Tiles are
  instanced boxes with some height (buildings, rubble, craters, nest pits). Fog of war darkens what you cannot see.
- **No brands:** all names, shapes and colours are original.

## How to play

| Do this | Result |
| --- | --- |
| Tap a blue soldier | Selects it. Its move range glows blue. Enemies it can shoot glow red with a kill chance. |
| Tap a glowing tile | Moves there (costs 1 of 2 actions). |
| Tap a red enemy | Attacks (costs 1 action). Dice show above the target. |
| Eye button | Watch (overwatch): shoots the first enemy that moves into view. |
| Plus button | Medic heals a neighbour. |
| Arrow button | Soldier on the gold pad leaves on the gunship. |
| Double arrow | End turn. The banner turns orange for the enemy turn. |
| Drag / two fingers / scroll | Orbit / pinch-zoom and slide / zoom. The target button shows the whole board. |

Few words on screen on purpose: icons for roles, pips for wounds and actions, one big banner ("Your turn" or
"Enemy turn"). The round-dot cards at the bottom are the squad; the dashed cards are the two drones (tap the small
badge on a drone to change its standing order).

## Same rules as the 2D game

Copied unchanged from the 2D game: city generator (seeded), weapons and loadouts, unit stats, line of sight and fog,
cover, movement cost (rubble costs 2), dice maths and the odds, overwatch, heal, extract, the Brood's turn (spawning,
nests, Spitters, Leapers, Bloaters, Burrowers, the Brood Mother), the hive's memory that learns where you stop, spore
forecasts, Listeners, hive dice, and the three drones (Mason, Sentry, Lark).

New in 3D: the drawing, the touch controls, and screens. The hive's memory is saved under its own key (`vigil3d.v1`),
so it does not mix with the 2D game's.

Left out for this first version: the armoury screen (it starts with the default loadout and the Sentry and Lark
drones), saving and continuing a battle, sound, the minimap, and the long explanatory messages.

## Tests

```
NODE_PATH=$(npm root -g) node games/vigil-3d/tests/vigil3d-test.cjs
```

Needs Playwright with Chromium (it uses `--use-gl=swiftshader --enable-unsafe-swiftshader`). It checks the `window.__v`
hook, refused moves, real taps and drags, the banner, iPad portrait and landscape layout, and a replay with the same
seed. Then it runs the 2D game and the 3D game side by side with the same seeded dice and compares the moves allowed,
every attack's odds, and the full board after every action. It needs internet for the 2D page's scripts, so
`VIGIL_SKIP_PARITY=1` skips that part. `VIGIL_SEED` and `VIGIL_TURNS` change the game it plays. `ONLY_REPLAY=1` skips the
first sections.

`tests/vigil3d-shots.cjs` takes the three screenshots in `shots/` at 1180x820.

## `window.__v`

`state()`, `select(id)`, `moveTo(x, y)`, `attack(id)`, `endTurn()`, plus `overwatch()`, `heal()`, `extract()`,
`info(attackerId, targetId)`, `reach(id)`, `newGame(seed)`, `fast(on)` (fast mode skips drawing and waiting),
`camera({...})`, `tileXY(x, y)`, `stats()`.

## Rough edges

- Tall buildings can hide a soldier or an enemy. Orbit the camera, or tap the unit's card at the bottom.
- No odds tooltip: only the kill chance shows on a red target. Attacks happen on the first tap, with no confirm step.
- No armoury, save, sound or minimap yet. Toasts and the hive's explanations were dropped to keep words few.
- The board is 22 by 22; on a phone it is small. Made for iPad.
- Not tested on a real iPad yet, only in desktop Chromium with software WebGL. It draws about 190 calls and 28k triangles a frame, with one soft shadow map.
