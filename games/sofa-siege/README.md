# Round Table Kingdom (folder: sofa-siege)

Open `index.html`. Model viewer: `viewer.html`. Tests are in `tests/` (run each with `NODE_PATH=$(npm root -g) node tests/<name>.js`).

## Table layout from the picture cards

The game can take its table layout from the locked record that the cards page makes (`cards/setup.js` on branch `game/sofa-cards`, schema_version 1).

- `SG.applyLayout(record)` takes that record as it is (millimetres and degrees from the anchor card). It returns `{ ok: true }`, or `{ ok: false, reason }` and keeps the layout in use. It takes effect at the next `SG.start`.
- `?layout=<base64 of the JSON>` in the address does the same at load.
- If the device has a record saved under `rtk.locked_placements.v1`, the title screen shows "Use my card layout".
- `SG.clearLayout()` goes back to the usual table.

**Agreed scale: 160 mm per game unit** (`SG.MM_PER_UNIT`). The practice table is 3.25 units in radius, so it stands for a round table about 1.04 m across. Pass `{ mmPerUnit: n }` as the second argument, or put `mm_per_unit` in the record, for another table.

How the record is read:

| Card kind | Used as |
|---|---|
| anchor (card 00) | the middle of the table; not in the placements list |
| `blue_base`, `red_base` | the centre of that camp's build zone. `yaw_deg` turns the camp: 0 is blue's usual way round (facing up the anchor card), 180 is red's |
| `capture_flag` | the flag hill |
| `hill` | an optional extra mound that mice walk round and nothing is built on |
| `build_camp` | read past; the game has no use for it yet |

`x = x_mm / 160`, `z = -y_mm / 160`, turn = `yaw_deg` (counter-clockwise from above), the same as `LockedPlacementStore.toTableUnits`.

A layout is refused when: a needed card is missing; the flag is more than 2.1 units from the middle; a base is more than 2.75 units from the middle, nearer than 1.5 to the flag, or facing away from it; the bases are nearer than 2.4 to each other; the mound is off the table, on the flag hill, or on a base.

On a card layout a camp's build zone is the ground within 2.15 units of its base, on the table, and nearer to its own base than to the other one. The bot fits its preset camp to that zone (turned and shifted a little) and only then looks for free spots.
