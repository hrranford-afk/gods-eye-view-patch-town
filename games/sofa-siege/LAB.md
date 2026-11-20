# The Lab: a shooting range and building sandbox

Harry, 20 Nov: "a more just like a shooting range version of this to help with development, so we can really have fun designing buildings, fortifications, different things, blowing things up."

The Lab is the same page as the game. It is a mode, `SG.mode === 'lab'`, and it uses the real pieces, the real `AMMO` table, the real blast, support and collapse code. It takes away only what a match demands and a sandbox must not: no timer, no rounds, no score, no robot, no hill, no win card, a limited kit, limited ammunition. There is no second copy of any rule. What you learn here is what happens in a match.

Open it from the title screen ("Shooting range (sandbox)") or go straight in with `index.html?lab=1`.

## What is on the screen

- **Top row:** Back to menu, How to use (the card shown on first entry; it is remembered, and this button brings it back), Panel (show or hide the right panel). The camera button (top right) works as in a match: whole table, my camp, the hill.
- **Left card, "Readout"** (collapsible): the last shot, the session, and the piece you tapped.
- **Bottom bar:** the tools, then the pieces (or the ammunition). Every button is at least 44 px tall.
- **Right panel:** Target camp, My camp, Settings, Range report, Designs, Prototypes.

The table has two camps, "My camp" (blue, near) and "Target camp" (red, far). Nothing ever ends. A fallen Keep just stays fallen until you Reset or Heal.

## The tools

| Tool | What it does |
|---|---|
| Build | Pick a piece, touch the table: a ghost follows your finger (green is a good spot, red is not and the real reason is shown), let go to place it. The turn buttons turn it. Undo and Redo work. Walls and gates snap to the end of a neighbour, as in the build step. |
| Erase | Tap a piece to take it away. |
| Move | Tap a piece to lift it (it shows as a ghost), then tap, or drag it, to where it goes. "Put it back" cancels. |
| Inspect | Tap a piece to see what holds it up (below). |
| Lobber | Tap a lobber (either camp, two lobbers: touching one chooses it), drag back from anywhere and let go to fire. The arc and landing ring are the real ones. |
| Free gun | Tap the table to aim from the near rim (the arc is shown). Press Fire! as often as you like. No lobber needed. |

Every kind of piece in `FOOT0` can be placed on either camp, as many as you like. The rules that stay are the real ones: pieces may not overlap, a brace must lean on a tower or a wall, a camp has at most two lobbers (the game has no third). The zone and hill rules of a match are off ("Zones: anywhere"); the Settings button "Zones: match rules" turns them back on.

## Settings

| Switch | Meaning |
|---|---|
| Build: instantly / mice build it | Pieces appear built, or are placed as a site and the mice fetch and hammer them (the real build code). |
| Reload: quick (0.3 s) / real | Quick: the lobber is ready 0.3 s after a shot and ammunition has no wait. Real: the lobber winds for `CONFIG.v2.reload` and the ammunition waits (corks, bouncer, glue) are the match's. Ammunition is unlimited either way, Big Marbles included. |
| Crew: not needed / needed | Off: a lobber fires with nobody beside it. On: a mouse has to walk to it, as in a match. |
| Zones: anywhere / match rules | See above. |
| Show supports | Thin lines from each wall, gate and Keep to the parts that hold it up: green holds, red is a part that alone would bring it down. |
| Slow-mo / Pause | Slow-mo runs the clock at a quarter speed (`SG.speed = 0.25`). |

## Target camps and resets

The Target menu loads a camp into the far zone, built and whole: **Empty, Walled Keep** (a Keep behind a gate and two walls), **Braced Keep, Long wall** (six walls), **Workshop cluster, Fortress** (the full 12-point good camp the bots build: the very `PRESETS.good`), **Glass house** (a lone Keep, no braces), **My camp copy** (my camp mirrored across the table). You can edit the target camp like your own.

- **Reset target** rebuilds the far camp at once to its saved state (every part back, no mending). The saved state is the layout as you last loaded or edited it.
- **Heal all** does the same for both camps.
- **Snapshot / Restore** keeps the whole table, damage and all, and brings it back.
- **My camp:** "Keep + 2 lobbers" (`SG.labStarter()`) is the starting camp; "Clear my camp" and "Clear target" empty a camp. All can be undone.

## Shooting and readouts

Ammunition buttons come from the `AMMO` table, so a new kind appears by itself, with its aim ring and its row in the range report. The high-lob switch works on every kind that can lob. **Replay** fires the last shot again: same lobber (or the free gun at the same place), same aim, same ammunition, same random seed, so even the flying parts land the same. It ignores the wait.

The Readout card shows, for the last shot: ammunition, parts knocked off (and which), collapses, mice made dizzy, parts glued, which pieces fell, what it landed on. A ring is drawn at each landing, as big as the blast (or the cork spread, or the glue splash). For the session: shots, parts off, collapses, Keeps felled, mice dizzied. "Clear counters" starts them again.

**What holds a piece up.** Tap a piece (Inspect, or the Lobber tool) and the card lists its supports from the real rule (`holdFail` in `game.js`, which is also what a collapse uses). For each attached part the Lab asks the rule, one part at a time, "if this part alone came off, would something fall?". Those parts are listed in red, marked on the table with a ring, and drawn red when Show supports is on. A wall stands while it has one post (or a brace piece props it); its planks hang on the rails. A gate needs both posts. A Keep stands on three legs, or two if the brace across the open side is on. Pieces without such rules (tent, workshop, trap) say so.

## The range report

"Test all ammo" (Range report, in the panel) fires every kind of ammunition, in turn, at a fresh copy of the target from the free gun, at the aim spot (the target's Keep, or the middle of the camp, or the spot you chose with "Set aim spot"). The high lob is fired too for every kind that can lob, and there is a Glue row "after a Marble" (glue needs fallen parts to stick to). Each row also has a **salvo**: ten shots of that ammunition running, spread over the camp round the aim spot (`LAB_CARPET`), nothing mended in between, because one shot rarely brings anything down. It takes my camp off the table for the test (so nothing of mine is in the way of the free gun), runs stepped, not at real speed, with a fixed random seed, and puts the table back as it was. The same call, `SG.labRange()`, runs headless:

`NODE_PATH=$(npm root -g) node tests/range.js` runs it on every template and writes `RANGE_REPORT.md`, with the settings used.

## Designs

A design is a plain record in the same shape as the table-layout record the cards page makes (`schema_version: 1`, a list of `placements`, each with `transform_anchor_relative` in millimetres and degrees, and `mm_per_unit`), so one reader style serves both. The differences: the anchor is the **camp's own base**, the placements are pieces, and `kind` is a piece name.

```json
{
  "schema_version": 1,
  "design_name": "Test one",
  "mm_per_unit": 160,
  "frame": "camp",
  "piece_scale": "small",
  "placements": [
    { "kind": "tower", "transform_anchor_relative": { "x_mm": 0,   "y_mm": -83.2, "yaw_deg": 0 } },
    { "kind": "wall",  "transform_anchor_relative": { "x_mm": -80, "y_mm": 0,     "yaw_deg": 0 } }
  ]
}
```

- `x_mm`: across the camp (positive to the camp's right). `y_mm`: toward the hill (negative is toward the back of the camp, so a Keep at the back has a negative `y_mm`).
- `yaw_deg`: counter-clockwise from above; 0 is a piece placed as in a match (facing the hill). Pieces turn about their own centre.
- `kind` is any key of `FOOT0` in `game.js`: wall, gate, tower, brace, lobber, tent, workshop, trap (and whatever is added later).
- A design saved on one camp loads onto either: the frame is the camp's, so on the far camp it is the mirror ("My camp copy").
- The placements list is read in order. `SG.labDesignCheck(record)` says why a record is refused ("The design must be schema_version 1", "Placement 3 is not a piece I know (dragon)", and so on).

**Save design** stores my camp under a name in `localStorage` (key `rtk.lab.designs.v1`, inside try/catch: if the browser will not store, saving says nothing and nothing breaks). The panel lists them with Load and a delete button. **Copy JSON** shows the record to copy; **Paste JSON** takes one and loads it onto my camp. Two people swap designs by sending the JSON.

**Use as my camp in a match.** If there are saved designs, the title screen shows "My camp in a match: Build it myself / <name>". With a design chosen, at the start of the build step the design is placed through the real build-step rules (`place`): the Keep first, then the rest in the order of the list. Whatever does not fit is dropped and the player is told in the build step's message line, for example "Your design: 9 pieces placed, dropped wall (Only on your own side of the table), workshop (over budget)". The reasons come from the real rules: zone, overlap, the 12-point budget, and a kit with one workshop slot. `SG.designResult` holds the placed and dropped lists and `SG.designNote` the sentence. The mice then build the pieces during the build step as usual and the player can add more.

## Prototype slots

New ideas are added as prototypes that can be switched on in the Lab only, and promoted into matches once Harry likes them. The table is `LAB_PROTOS` in the Lab section of `game.js` (`SG.labProtos`); the switches live in `LAB_FLAGS` (`SG.labFlags`) and the Prototypes panel lists every entry. There is one stub, "Wind (not built)", which does nothing.

**How to add one.** Either put an entry in `LAB_PROTOS`, or, from another script or a test, call `SG.addProto(id, def)`. A definition is:

```js
SG.addProto('wind', {
  name: 'Wind',                 /* the label on the switch */
  note: 'Blows shots sideways',  /* one line under it */
  on:  function (SG) {},         /* optional: runs when it is switched on (change a number, add an AMMO entry) */
  off: function (SG) {},         /* optional: undo what on() did. Must restore every number it changed */
  hooks: {                       /* optional: any of these, all called only in the Lab and only while the switch is on */
    arc:    function (a, side, SG) {},   /* a shot's arc has just been made (SG.arc), before the first hit is looked for: change a.x1, a.z1, a.h, a.T ... */
    blastR: function (R, shot, SG) { return R; },   /* the blast radius of a landing, before the blast: return a new radius */
    tick:   function (dt, _, SG) {}      /* every Lab tick (60 per second) */
  }
});
```

**Hook points** (search `labProto(` in `game.js`): `arc` in `SG.arc`, `blastR` in `landV2`, `tick` in `tickLab`. `labProto(name, value, extra)` calls every switched-on prototype that has that hook, passing the value on; a hook that returns something replaces the value. To add a new hook point, put one `labProto('name', value, extra)` call where the real code reaches the value you want to change (it costs nothing when no prototype is on, and does nothing outside the Lab) and name it here.

**What a prototype may change.**
- Numbers in `CONFIG` / `CONFIG.v2` (`SG.CONFIG.v2.blast = ...`), set in `on()` and put back in `off()`. They are the match's numbers, so if it is promoted, the new value goes in `CONFIG`.
- The `AMMO` table: add an entry in `on()` (`SG.ammo.mine = {...}`, `SG.ammoOrder.push('mine')` if it should sit in the usual order; the Lab shows any key of `AMMO`) and delete it in `off()`.
- The three hooks above.
- It may read and use anything on `SG`.

**What it must not do.** Leave anything changed after `off()`. Leaving the Lab (Back to menu) and starting a match call `off()` for every prototype that is on (`labProtosOff`), so a match never sees one. The switch state is remembered in `localStorage` (`rtk.lab.flags.v1`) and re-applied when the Lab is entered.

**Promoting it.** Move the changes out of `on()` into the real code (or `CONFIG`), delete the entry, and add the match test. The range report (`tests/range.js`) shows what it did to every ammunition and target.

`tests/lab-test.js` registers a fake prototype and checks that its hooks run, that what a hook returns changes the real blast, and that leaving the Lab switches it off.

## How the Lab is wired into the game (the hooks in the real code)

A match never takes these branches, because each starts with `SG.mode === 'lab'` (or the Lab's own `labFree`, `crewOK`, `a.k0`).

| Where | What |
|---|---|
| `SG.start` | `mode: 'lab'` is a mode; both camps are human; `labInit()` runs at the end. |
| `check` | In the Lab the hill ring and zone rules are skipped unless "Zones: match rules" is on. Overlap and the brace rule stay. |
| `settle` / `holdFail` | The support rules moved into one pure function, `holdFail(p)`, that says what gives way; `settle` acts on it, the Lab asks it. Same behaviour as before. |
| `keepDown` | In the Lab a fallen Keep does not end anything (no win card, no phase change). |
| `tickFight` | In the Lab it is `tickLab`: shells, thrown parts, glue, mice, nothing else. |
| `tickMice`, `freeV2` | Mice stand at their resting places; crew mice only when "Crew: needed". Builders are run by `buildMice` (split out of `tickBuild`; same code). |
| `lobberBlock` / `crewOK` | "Crew: not needed" lets a lobber fire alone. |
| `lobberOf` | `li === 'gun'` is the free gun, a lobber-shaped object on the rim that is not a piece. |
| `SG.arc` / `tickMarbles` | `a.k0`: the free gun clears the first 30% of its flight so it passes over my camp (a lobber's is 12%, as before). `labProto('arc')`. |
| `knock`, `collapse`, `keepDown`, `landV2` | `labNote(...)` tells the Lab what happened, for the readout. |
| `landV2` | `labProto('blastR')`. |
| the view | The hill and the mats are hidden; the Lab draws its own ghost, gun, rings and support lines. |

## What is not done (honestly)

- **AR.** The Lab does not run in AR. The AR scene buttons, locking and start path are all written for a match; porting them is a job of its own. The Lab is a flat-screen mode; the title screen's AR button starts a match as before.
- **Table mode (two players).** Not done. The Lab is one person with one iPad.
- The free gun stands on a fixed rim and turns to its aim; you cannot move it along the rim yourself (it follows where you aim, a little).
- The Move tool heals a piece it moves (it is lifted and put down whole). Undo of a build step does not mend damage elsewhere, but Undo of a template load rebuilds that whole camp.
- The target camp's mice are not fighters: they stand at their resting places and go dizzy and home as in a match. Raiders, guard corks, traps springing on walkers: none of them happen, because nobody walks.
- Mice builders in the Lab fetch pieces from a spot at the back of their camp, not from a tray: there is no mat.
- The panel and readout cover part of the table. On a screen narrower than 1000 px they start folded away (Panel and Readout buttons bring them back).
- The Lab has not been tried on an iPad by a person. It was run in a desktop browser with real mouse events at 1280 by 800; the page was also opened at 1000 by 700 and 834 by 1112 (an iPad upright) and looked at.
- A rebuilt camp is the same camp plank for plank: each piece keeps its look (`vari`, one of three) with its uid. In a match the look follows the piece's id, so a match and the Lab can differ by the odd plank height; the Lab test compares them for the same camp with the look copied across.
- The range report's mice stand still beside the Keep, so it cannot rate Corks properly.
