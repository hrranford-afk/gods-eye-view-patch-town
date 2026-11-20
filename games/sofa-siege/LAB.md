# The Lab: a shooting range and building sandbox

Harry, 20 Nov: "a more just like a shooting range version of this to help with development, so we can really have fun designing buildings, fortifications, different things, blowing things up."

The Lab is the same page as the game. It is a mode, `SG.mode === 'lab'`, and it uses the real pieces, the real `AMMO` table, the real blast, support and collapse code. It takes away only what a match demands and a sandbox must not: no timer, no rounds, no score, no robot, no hill, no win card, a limited kit, limited ammunition. There is no second copy of any rule. What you learn here is what happens in a match.

Open it from the title screen ("Shooting range (sandbox)") or go straight in with `index.html?lab=1`.

## What is on the screen

- **Top row:** Back to menu, How to use (the card shown on first entry; it is remembered, and this button brings it back), Panel (show or hide the right panel). The camera button (top right) works as in a match: whole table, my camp, the hill.
- **Left card, "Readout"** (collapsible): the last shot, the session, and the piece you tapped.
- **Bottom bar:** the tools, then the pieces (or the ammunition). Every button is at least 44 px tall.
- **Right panel:** Target camp, My camp, Building Yard, Settings, Range report, Weapon Workshop, Designs, Prototypes.

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
| Chain topple | On (the default): a wall, gate or Keep that falls lands on the pieces in the way it falls and knocks parts off them, which may bring them down too (see "Chain reactions"). Off: a shot is exactly a match shot. |
| Leave debris | On (the default): fallen parts lie where they fell. Off: they vanish a few seconds after they land. Either way no more than `CONFIG.workshop.debrisMax` (160) lie about; the oldest go first. |
| Sweep up | A button: every loose part leaves the table. Nothing is reset: each piece stays as damaged as it was. |
| Shake by size / Slow-mo beat by size / Sound by size | Each on (the default): the screen shake, the slow-motion beat and the sounds scale with the number of parts that fell at once (below). Off: a landing shakes and slows as in a match. |
| Slow-mo / Pause | Slow-mo runs the clock at a quarter speed (`SG.speed = 0.25`). |

## Target camps and resets

The Target menu loads a camp into the far zone, built and whole: **Empty, Walled Keep** (a Keep behind a gate and two walls), **Braced Keep, Long wall** (six walls), **Workshop cluster, Fortress** (the full 12-point good camp the bots build: the very `PRESETS.good`), **Glass house** (a lone Keep, no braces), **My camp copy** (my camp mirrored across the table), and five big ones made for carnage (20 Nov):

| Target | What it is | Pieces |
|---|---|---|
| **Castle** | A Keep with four corner towers (five `tower` pieces, so five Keeps), a front wall with a gate and traps outside it, side and back walls, and a courtyard of two workshops, two lobbers, four tents, an inner wall and braces on the Keep. | 36 |
| **Village** | Ten small camps spread across the far half (a tent with a wall behind it, or a workshop beside it, or a trap and a wall), and a chief's hall (a Keep) at the back. | 24 |
| **Wall maze** | Three rings of walls round a Keep, a gate in each ring, the gates on opposite sides so a way in is a way round. | 28 |
| **Domino row** | Three lines of eight unbraced walls, each wall a little behind the one before, close enough that a falling wall reaches the next. No Keep. | 24 |
| **Tower stack** | Seven Keeps in two rows, close together, with braces in the gaps: each leans on its neighbour. | 14 |

Seven more targets are the **Building Yard** (cottage, barn, watch tower house, bridge + gatehouse, windmill, market row, a yard of three): see "The Building Yard" below.

The big targets are laid out by `labBigTemplate` from the piece sizes, for small and medium pieces (large ones crowd the table, and the Castle's corners go past the table's edge). `SG.labTemplateOverlaps(id)` lists any two pieces of a template that overlap by the real overlap rule; all five are empty. The camera button has a fourth view in the Lab, **The target camp**. With several Keeps the default aim spot is the one nearest the middle. You can edit the target camp like your own.

- **Reset target** rebuilds the far camp at once to its saved state (every part back, no mending). The saved state is the layout as you last loaded or edited it.
- **Heal all** does the same for both camps.
- **Snapshot / Restore** keeps the whole table, damage and all, and brings it back.
- **My camp:** "Keep + 2 lobbers" (`SG.labStarter()`) is the starting camp; "Clear my camp" and "Clear target" empty a camp. All can be undone.

## Shooting and readouts

Ammunition buttons come from the `AMMO` table, so a new kind appears by itself, with its aim ring and its row in the range report. The high-lob switch works on every kind that can lob. **Replay** fires the last shot again: same lobber (or the free gun at the same place), same aim, same ammunition, same random seed, so even the flying parts land the same. It ignores the wait.

The Readout card shows, for the last shot: ammunition, parts knocked off (and which), collapses, mice made dizzy, parts glued, which pieces fell, what it landed on. A ring is drawn at each landing, as big as the blast (or the cork spread, or the glue splash). For the session: shots, parts off, collapses, Keeps felled, mice dizzied, carnage score and the longest chain. "Clear counters" starts them again.

**What holds a piece up.** Tap a piece (Inspect, or the Lobber tool) and the card lists its supports from the real rule (`holdFail` in `game.js`, which is also what a collapse uses). For each attached part the Lab asks the rule, one part at a time, "if this part alone came off, would something fall?". Those parts are listed in red, marked on the table with a ring, and drawn red when Show supports is on. A wall stands while it has one post (or a brace piece props it); its planks hang on the rails. A gate needs both posts. A Keep stands on three legs, or two if the brace across the open side is on. Pieces without such rules (tent, workshop, trap) say so.

## The range report

"Test all ammo" (Range report, in the panel) fires every kind of ammunition, in turn, at a fresh copy of the target from the free gun, at the aim spot (the target's Keep, or the middle of the camp, or the spot you chose with "Set aim spot"). The high lob is fired too for every kind that can lob, and there is a Glue row "after a Marble" (glue needs fallen parts to stick to). Each row also has a **salvo**: ten shots of that ammunition running, spread over the camp round the aim spot (`LAB_CARPET`), nothing mended in between, because one shot rarely brings anything down. It takes my camp off the table for the test (so nothing of mine is in the way of the free gun), runs stepped, not at real speed, with a fixed random seed, and puts the table back as it was. The same call, `SG.labRange()`, runs headless:

`NODE_PATH=$(npm root -g) node tests/range.js` runs it with **every weapon** (the five, the six presets and every saved weapon: those in `tests/range-weapons.json` are saved first) on **every target** (old and new), then Rate it for every weapon with Chain topple on and off, and writes `RANGE_REPORT.md` with the settings used and the findings (`tests/range-notes.md`). `SG.labRange({ammo:[ids], spot, salvo})` takes the list of weapons to fire.

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

## The Weapon Workshop (20 Nov)

Harry, 20 Nov: "I'm looking forward to building some new weapons and just creating some carnage. Just create a firing range." The rules that never change hold here: nobody dies (mice go dizzy and pop home), toy weapons only (no fire, no spears, no explosives that harm mice), no health bars. **Everything in this section is Lab only**: a match never sees a Workshop weapon, a preset, Chain topple or any of the carnage tools (`SG.labBack` and starting a match take them off the `AMMO` table), and a weapon with the numbers of the old ammunition gives exactly the old shots (a test compares all five, flat and lobbed, on four targets).

### Ammunition is a record of numbers

Each entry of the `AMMO` table (top of `game.js`) has a plain record, `w`, and the one landing code (`landV2` and `boom`) reads it, the same for every kind. The five a match uses read their numbers from `CONFIG.v2` through getters, so a prototype that changes a `CONFIG` number still changes the Marble. An entry added the old way (`R(hi)`, `cd()`, `flat`, `noLeg`, `bounce()` as functions and flags) is turned into a record when it is put on the table.

Distances are at piece scale 1 and follow the piece size. A weapon outside a range is **clamped, never refused**: the ranges are `CONFIG.workshop.caps`.

| Parameter | Range | What it does (the Marble's value where it has one) |
|---|---|---|
| `blast` | 0 to .6 | Blast radius. Every part in reach comes off, the nearest thrown furthest. 0 = no blast (.3) |
| `hiMul` | .2 to 1 | Share of the blast when lobbed high: the high lob (.5 for the Marble) |
| `falloff` | 0 to 2 | How the throw falls away from the centre: 1 as in a match, 0 every part flies as far as the nearest, 2 the edge barely moves |
| `cap` | 0 to 12 | Most parts one landing takes off, the nearest first (0 = no limit) |
| `leg` / `legForce` | on or off | Can break a Keep leg (by a near-direct hit, unbraced). Always breaks the nearest leg, braced or not (the Big Marble). |
| `flat` | on or off | Too heavy to lob (Big Marble, Bouncer) |
| `speed` | .5 to 2 | Flight speed (1) |
| `arcMul` | .5 to 2.5 | Arc height (1): a higher arc clears a wall in front of the target |
| `bounces`, `hop`, `hopH`, `hopT` | 0 to 3; .3 to 1.4; .2 to 1.2; .3 to .8 | A ball that hops on past its first touchdown: how many times, how far, how high, how long. Each further bounce is `CONFIG.workshop.decay` (.75) as long and high. It stops at the first piece in its way. |
| `popEach` | on or off | A blast at every touchdown, not only the last |
| `scatter`, `spread` | 1 to 8; 0 to .8 | Balls thrown (1); how far round the aim spot they land. Each is a shot of its own (the corks are scatter 5). |
| `fuse` | 0 to 2 s | It lies where it landed, throbbing, then goes off (0). The pop is the landing; the Lab waits for it. |
| `stick` | 0 to 20 s | Fallen parts in the splash, and the part it hits, cannot be mended for this long (the glue: 15) |
| `splash` | 0 to .5 | Radius of stick, slow and puddle (the glue: .26) |
| `slowTo`, `slowSecs` | .2 to 1; 0 to 10 s | Mice in the splash walk at this share of their speed for this long (the glue: .45 for 4 s) |
| `puddle` | 0 to 12 s | A puddle that slows mice that walk through it (the glue: 9) |
| `dizzyR`, `dizzySecs` | -1 to .6; 0 to 8 s | Mice this near go dizzy; -1 = the blast radius (the Marble). 0 seconds = the usual dizzy time. |
| `tether` | 0 to 3 | 0, or the string's length: the ball snags the first part it passes (or the one it comes down on, or the nearest on the ground) and drags it this far toward the shooter |
| `quake` | 0 to 1.2 | Radius in which every part held by only one fastener falls, without being struck: a plank on one rail, a rail on one post, a gate lintel on one post, a Keep brace on one leg (`looseParts`) |
| `roll` | 0 to 3 | After landing it rolls on along the table in the direction of travel for this far, knocking off parts at its base (up to `CONFIG.workshop.rollMax`) and making mice dizzy |
| `cd` | 0 to 12 s | Seconds before the next of this kind, when Reload is "real" |

The **price** is derived in budget points, `wPrice(w)` (weights in `CONFIG.workshop.price`): the blast by its area, a Keep leg, the flight, bounces, scatter, a fuse, glue and slowing, dizzy, a tether, a quake, a roll, less a little for a long cooldown. A Marble is 4 points, a Big Marble 6.6, Corks .5. It is my formula, not tested against play: it overrates the Triple bouncer.

### The panel

The right panel's **Weapon Workshop**: four bases (**Marble**, **Ball** a heavy flat ball, **Acorn** that rolls, **Cork** that scatters), a name, a slider for every number (each stops at its cap), four switches, and the price. **Use it** puts the weapon in the ammo row at once, chosen (the id is `w_` and the name); moving a slider afterwards changes the weapon that is in the row. **Save** stores it in `localStorage` (`rtk.lab.weapons.v1`, inside try/catch) and the panel lists it with Load and a delete button; **Copy JSON** and **Paste JSON** swap weapons as text:

```json
{ "schema": "rtk.weapon", "version": 1, "name": "Heavy popper", "base": "ball", "icon": "⚪", "tint": 14211296, "scale": 1.7, "maker": "",
  "params": { "blast": 0.32, "falloff": 0.6, "cap": 5, "leg": true, "flat": true, "speed": 0.85, "fuse": 0.5, "scatter": 3, "spread": 0.22, "dizzyR": 0.25, "cd": 5 } }
```

A number that is missing takes its default, one outside its range is held to it (a note says which), anything else is refused with a reason (`SG.labWeaponCheck`). Also from a script: `SG.labWkLoad(record)`, `SG.labWeaponRec(id)`, `SG.labWkPreset(key)`, `SG.wClamp`, `SG.wPrice`, `SG.labWeapons()`.

### Rate it

The Workshop's **Rate it** button (and `SG.labRate(id)`): fires the weapon, a Marble and a Big Marble at every target (the eleven: all but the empty camp and my camp copy), one flat shot and a salvo of five at each, each at a fresh copy, from the free gun, with a fixed seed. A table beside the Marble and the Big Marble shows, over all targets, **parts off, collapses, Keeps felled, mice dizzy**, the salvos, and a **one-line verdict**: "much stronger than Big Marble", "stronger than Big Marble", "about like a Big Marble", "stronger than a Marble", "about like a Marble", "weaker than a Marble" or "does little" (the score is a part 1, a collapse 4, a Keep 15, a mouse .5, a salvo .3 of a single shot, and the thresholds are in `CONFIG.workshop.rate`). A weapon that **fells a Keep in one shot against every target that has one** is flagged "too strong". A Pocket Earthquake is rated with a Marble before each shot, because a quake needs damage. Below it, the weapon target by target. It takes about a third of a second a weapon, leaves the table, counters and ammunition as they were, and gives the same answer every time.

### The presets

Six weapons made with the Workshop. Each is also a prototype (Prototypes panel, `p_` and the key), off until switched on; switched on it joins the ammo row. The panel's **Presets** list loads any of them into the editor whether it is on or not.

| Preset | Idea from | What it does |
|---|---|---|
| **Tether marble** | ChatGPT #18, Grok #16, Gemini #13 | `blast .05, tether 1.5`: snags the first part it meets and drags it 1.5 toward the gun |
| **Pocket Earthquake** | ChatGPT #12 | `blast 0, quake 1, dizzyR .3`: a heavy ball that loosens without striking |
| **Acorn drum** (Roller) | Gemini #11 (also Gemini #18, Grok #19, ChatGPT #19) | `blast .1, roll 2.4`: lands, then rolls on |
| **Bead shot** | Gemini #20 | `scatter 8, spread .5, blast .05, splash .12, slowTo .5 for 3 s`: tiny beads that slow mice |
| **Pop bomb** | the Lab (a toy "pop") | `fuse 1, blast .42, cap 6`: lies a second, then a large blast that takes parts off and only makes mice dizzy |
| **Triple bouncer** | the Lab (from the Bouncer) | `bounces 3, popEach, blast .22, arc [.3,.24]`: a small blast at each touchdown |

**How to add a preset.** Add an entry to `LAB_PRESETS` in the Workshop section of `game.js`: `{key, name, icon, tint, base:'marble'|'ball'|'acorn'|'cork', maker, note, w:{...numbers that differ from the base}}`. It is registered as the prototype `p_<key>` and appears in the ammo row when switched on and in the Presets list. Say who had the idea in `maker`, in the code comment and here. To promote one into matches, put it in `AMMO` (with its numbers in `CONFIG`) and add a match test.

## Chain reactions, carnage and debris (20 Nov)

- **Chain topple** (a Lab switch, on by default). A match already has the v2 rule that a part thrown hard (`chainThrow`) knocks off an attached part it lands on. The Lab adds: a wall, gate or Keep that **collapses** also *falls*: it falls the way the shot went (a wall along its normal, a Keep any way), reaches its height (`CONFIG.workshop.topple.reach` 1.1 times as far), and knocks `topple.hit` (3) parts off up to two pieces it lands on, the frame first (a wall's rails, a gate's lintel, a Keep's braces and rail), so what it fell on may collapse and fall onward. **At most `topple.max` (8) topples a shot**, counting the debris chains too, so a chain cannot run forever. A wall or gate that has lost its frame also counts as having fallen even if the blast took its planks (otherwise a blast that clears a wall never starts a chain). The Domino row is made for it: one Pop bomb brings down a line of walls. `SG.topN` counts them; `chainDepth` follows how far a chain went. **Off, a shot is exactly a match shot.**
- **The carnage counter** (top, beside the buttons; also `SG.labCarnage()`): *this shot* (parts off, collapses, the chain, the most parts that fell at once) and *this session* (the longest chain and a running **carnage score**: a part 1, a collapse 5, a Keep 25, each step of chain beyond the first 3, a mouse dizzy .5; `CONFIG.workshop.carnage`). "Clear counters" starts them again.
- **Shake, slow-motion beat and sound** scale with the parts that fell at once (`labFx`, numbers in `CONFIG.workshop.fx`): the shake is .14 a part up to 2.4, the beat starts at 3 parts (.15 s and .06 s a part up to 1.4 s), and the sounds are the game's own synthesised ones layered: a knock from 3 parts, a crash from 6, a thud and a second crash from 12, another thud from 24. Each has its own switch; with a switch off a landing shakes and slows as in a match.
- **Debris**: see Settings (Leave debris, Sweep up, the 160-part limit). The page does not slow down for debris: each fallen part is one small model, and the count is capped.
- **Frame time**: the readout card shows the page's frame time while the Lab runs (the gap between frames, the time `render()` takes, draw calls and triangles; `SG.labFrameStats()`). Measured on the machine this was built on (headless Chromium with software GL, SwiftShader, 1280 by 800, no GPU): the **Castle**, 39 pieces and 313 part models, **142 draw calls and about 58 thousand triangles, about 280 to 315 ms a frame (3 to 4 frames a second)**; the Walled Keep, 7 pieces, 74 draw calls and 20 thousand triangles, about 205 to 225 ms. Software GL is a thousand times slower than an iPad's GPU, so read these as *relative* (the Castle costs about 40% more than a small camp) and as an upper bound; `render()` itself takes 3 to 5 ms of CPU. Nobody has timed it on an iPad.
- **The gate fix.** A wall or gate that has lost every plank, rail, door and lintel (only posts, and a gate's braces, are left) no longer stops a flat shot: a shot passes between the posts and is stopped only within `CONFIG.v2.frameR` (.07, scale 1) of a post. Anything with a plank, rail, door or lintel left stops a shot as it always did. This is in the shared `pieceAt`, so it applies in matches too; it can only matter for a frame stripped to its posts, which is rare in a match, and none of the match tests changed. It was the real bug the first range report found (a one-point gate shielded a Keep from flat shots for good).
- **Rebuilt camps look the same every time**: a camp built from a list (a template, a design) now gives its pieces fixed looks (by position in the list), so the same shot at the same camp always has the same result (before, the look followed a counter).

## The Building Yard (20 Nov)

Harry, 20 Nov: destruction should be fun "bit by bit". The Yard adds real little buildings to the Lab with layered damage, using the same idea as the rest of the game: a thing falls when what holds it goes. **Everything here is Lab only.** The six kinds (`cottage`, `barn`, `lookout`, `bridge`, `windmill`, `stall`) are in `FOOT0` and `BK` but in no kit, so a match never has one (a test starts a match and checks). No outside assets: the models are built from the same primitives and the same texture atlas as the rest of the library (`models.js`, `SS.bldInfo`), in the team's colours (blue near, red far).

### The six

Each is **one piece with its own parts**, between 15 and 40 (the market row is three stalls of 13). Every part has a **stage** and the parts it hangs on.

| Building | Parts | Trim (stage 0) | Walls (stage 1) | Frame (stage 2) | What holds what |
|---|---|---|---|---|---|
| **Cottage** (`cottage`) | 40 | 12 roof tiles, 4 shutters, the chimney | 4 wall panels (2 front, 2 side), a back wall, a door, 2 window frames, 2 gables | 4 posts, 4 beams, 4 rafters, the ridge | A beam needs both its posts; a panel, door or gable hangs on its beam; a rafter on its side's beam; a tile on its rafter; the ridge on any rafter; a shutter on its window frame |
| **Barn** (`barn`) | 40 | 8 roof tiles, a hay bale, 2 lean-to tiles | 2 big doors, panels, 2 gables, the hayloft floor, the hatch | 4 posts, 4 beams, 4 rafters, the ridge, and the lean-to's 2 posts, beam and 2 rafters | The loft floor hangs on both side beams; the lean-to's rafters hang on its own beam **and** on the barn's side beam, so the lean-to goes when the barn's wall does |
| **Watch tower house** (`lookout`) | 31 | 4 roof panels, cap, pole, flag, 2 shutters | 4 lower and 4 upper wall panels, door, window, 3 stair ledges | 4 tall posts, the first floor, 4 top beams | The floor needs 3 of the 4 posts; a wall panel its two posts (an upper one also the floor); a roof panel its beam; the flag its pole, the pole the cap, the cap any roof panel |
| **Bridge + gatehouse** (`bridge`) | 28 | 2 roofs, 2 flags, 6 merlons, 2 rails, 2 chains | 2 slit windows, 5 deck planks, the hanging gate | 2 tower cores, 2 tower tops, 2 deck beams | The deck beams need **both** tower cores; a plank any beam; the gate hangs on its two chains (it falls only when both are gone), each chain on its beam |
| **Windmill** (`windmill`) | 21 | 4 sail cloths, cap, 2 windows, tail, 2 sacks | 3 tiers, balcony, door, **4 sails** | the base, the hub | The tiers stack (each on the one below); the hub on the top tier; a sail on the hub; its cloth on the sail. The sails fall in order, half a second apart (`dly`), not all at once |
| **Market row** (`market`) | 3 stalls × 13 | awning, sign, goods, 3 stacked crates | counter, back board | 4 posts, the rail | The rail needs both front posts; the awning hangs on the rail; a crate on the crate under it |

### The rules

- **Three stages, then the collapse.** A landing takes **trim first** (nearest first), then walls, then frame, never more than a few at once: `CONFIG.workshop.yard.perHit` (4) for a Marble, more for a bigger blast (by its area: a blast twice as wide takes four times as many; a high lob's half-radius blast takes one). Each stage only comes off close to the hit, as a share of the blast: trim 1, walls .55, frame .32 (`yard.sturdy`). A marble that strikes the building does not stop at the wall: the blow runs on `deep` (.4) of the way to its middle and up to at least `high` (.5) of its height, so a shot at a wall shakes the roof tiles loose first. A blast that lands beside a building (not on it) is measured from where it landed.
- **The support rule** (`bSettle`, one rule for every building). After anything comes off, every part still on whose supports are gone (fewer than its `min` of its `need` parts are on) falls, and then whatever hung on that, round after round until everything left is held. Nothing can stay up with its support gone: `SG.bldFloating()` lists any that does, and every test and every range cell checks it is empty. A round later than the first waits `yard.delay` (.2 s), so a roof comes down after its walls and a sail after its sail.
- **The Big Marble** also breaks the nearest frame leg outright (`bigLegs`: one for most, two for a stall), as it breaks a Keep leg, and takes up to `yard.bigHit` (9) parts. So it takes **a side**: one corner post goes, and the beams, walls, rafters and tiles that hung on it go with it. A second Big Marble finishes most of the rest.
- **A collapse** is counted when at least 8% of a building's parts (at least 2) fall in one go, or frame parts come off with others (`nf` in `bSettle`). It makes mice near it dizzy and shakes the screen like any collapse.
- **Chain topple** (the existing Lab switch) works between neighbours: a building that collapses falls the way the shot was going and lands on what stands within reach on that side (`yard.reach`, or 40% of its height, whichever is more; a market row touches, a yard is a little apart), knocking `topple.hit` (3) parts off up to two neighbours, trim and walls before frame; the neighbour then settles by the same rule, so it may fall too. At most `topple.max` (8) topples a shot, as before. The thrown crates and tiles also knock attached parts by the existing `chainThrow` rule.
- **Mice** treat a building as a solid block while it has any part left.

### In the Lab

- **Targets:** Cottage, Barn, Watch tower house, Bridge + gatehouse, Windmill, Market row, Building yard of 3 (a cottage, a barn and a windmill). All are in the Range report's target list, so every weapon is fired at each.
- **Building Yard panel** (right): **Rebuild selected** puts every part of the selected building back at once, without touching anything else (a fallen Keep is rebuilt as a fresh piece). Select with Inspect or the Lobber tool; the Inspect bar and the readout card each have a Rebuild button too. **Build your own yard**: three pickers (the six buildings, the second and third can be "none") and **Place in target camp** or **Place in my camp**; they are laid across the camp side by side (two rows if they would not fit), facing the hill, clear of each other and the table's edge (all 216 combinations are tested), and Undo takes them back. Any building can also be placed with the Build tool like any piece, and saved in a design.
- **Inspect and Show supports.** The readout lists a building's frame parts, which of them alone would bring others down ("alone it drops 9 more parts", in red), and how many parts of each stage are on. With Show supports on, a line joins every part to what holds it (red where that part is critical).
- **The carnage HUD** has a second line, **Bits off / stage: trim, walls, frame, collapse** (the last shot's buildings; `SG.labStages()`). It is there only when a building is on the table.
- `SG.labYard(list, side)`, `SG.labRebuild(piece)`, `SG.labStages()`, `SG.bldFloating()`, `SG.bldStats(piece)`, `SG.labBuildings` are for tests and scripts.
- Close-up for pictures and tests: `SG.lab.focus = {x, z, zoom, y}` (zoom is a share of the usual camera distance).

### What the range says

`tests/range.js` has a section **Building Yard: stage by stage** in `RANGE_REPORT.md`: for each building, one Marble, a high lob, a light touch, eight Marbles running, one and two Big Marbles (and one with Chain topple off), and a salvo of ten spread Marbles, by stage, and the floating check (always 0). The headline, at the default piece size (small), the free gun at the building's middle:

| | Marble | High lob | Light touch | One Big Marble (parts left) | Two Big Marbles | Big, Chain topple off |
|---|---|---|---|---|---|---|
| Cottage | 4 trim | 1 | 0 | 18 of 40, a collapse | 5 | 18 |
| Barn | 3 trim, 1 wall | 1 | 0 | 17 of 40, a collapse | 8 | 17 |
| Watch tower house | 3 trim, 2 walls | 1 | 0 | 17 of 31, a collapse | 8 | 17 |
| Bridge + gatehouse | 3 trim, 1 wall | 1 | 0 | 8 of 28, a collapse | 0 | 8 |
| Windmill | 3 trim, 1 wall | 1 | 0 | 2 of 21, a collapse | 2 | 2 |
| Market row (middle stall) | 3 trim, 1 wall | 1 | 0 | 24 of 39, a collapse | 4 | 31 |
| Yard of 3 (middle building) | 3 trim, 1 wall | 1 | 0 | 70 of 101, a collapse | 33 | 78 |

(the Marble never takes frame or collapses a building at the middle: a post comes off only when a Marble lands within a hand's width of it, which is the point of aiming.) A salvo of ten Marbles spread over a building takes 4 to 16 parts and collapses the cottage and the market row once.

### Frame time: the Castle against a yard of three

Measured in the same session, back to back, in headless Chromium with software GL (SwiftShader, 1280 by 800, `tests/lab-shots.js --frames`, 8 seconds each, the camera on the target camp, my camp's Keep and two lobbers on the table in both):

| | Pieces on the table | Part models | Draw calls | Triangles | Frame (gap between frames, two runs) |
|---|---|---|---|---|---|
| Castle | 39 | 313 | 137 | 57.9 thousand | 527 and 537 ms |
| Building yard of 3 (cottage, barn, windmill) | 6 | 127 | 65 | 18.4 thousand | 390 and 256 ms |
| Market row (three stalls) | 6 | 65 | 65 | 15.7 thousand | 359 ms |

So a yard of three costs about **half to three quarters of a Castle**, with less than half the draw calls and a third of the triangles. A building is drawn as one merged mesh while it is whole, and as one small mesh per part once it is damaged (the same as every other piece). The numbers are software GL, a thousand times slower than an iPad's GPU, and noisy (the yard's two runs differ by 50%, the machine was shared with nothing else); read them as relative. Nobody has timed it on an iPad. The worst case is a whole yard torn into hundreds of loose parts: the 160-part debris limit still holds.

### Adding a building

In `models.js` write `BUILD.name` with the `bp(K, id, stage, need, fn, {min, dly, leg})` helper (see the cottage, which uses the shared `house()` builder) and put the name in `SS.BUILDINGS`; set `K.meta = {bigLegs: n}`. In `game.js` add it to `FOOT0`, `TALL0`, `BK` (and `C2.piecePts`), and to `LAB_BLD` (the pickers and target buttons: a target id is the kind, or a unit of several pieces in `labUnit`). Then run `tests/lab-test.js` (it loops over `LAB_BLD`-style lists in `tests/lab-test.js`, add the name there) and `tests/range.js`.

### Limits of the Yard

- Buildings are one piece each, so the walking grid treats one as a solid block until its last part is gone: mice cannot walk through a bridge's arch or into a barn with its doors off.
- The blast numbers are my own: Marbles chip, Big Marbles break, and nothing has been tuned against play. The Marble cannot bring a building down alone except by chance (a collapse needs the frame, and the frame is only hit by aiming at a post).
- A fallen building is parts lying about (up to the 160-part debris limit, then the oldest vanish); nothing is left standing as rubble.
- The models are plain: boxes, cones and rods with the usual textures. The windmill's sails are a lattice and cloth; a stall's goods are balls on a tray. They look right from the Lab's camera, not from a very low one.
- Nobody has played the Yard on an iPad. See the frame-time note under the screenshots below.

## The Arsenal: seven weapon families and the pieces that counter them (20 Nov)

Harry, 20 Nov: "we need to build them all, make them all different, and realise how the bases need to be different to counteract them." The rule of the set: **every weapon has one cheap counter, and every weapon is great against something that has not got it**, so no one layout beats everything. **All of it is Lab only.** The six new weapons are on the `AMMO` table only while the **Arsenal** switch (a Lab prototype, Prototypes panel or the Arsenal panel, off by default) is on, and Back to menu or starting a match puts them away. The counter pieces are in `FOOT0`, `TALL0` and `BK` but in no kit, so a match never has one (a test checks: five kinds of ammunition, no kit has one, a design with a Roof in it drops the Roof). The numbers of the report are in `ARSENAL_REPORT.md`, written by `tests/lab-test.js` every run.

### The weapons (each its own look, motion, sound and behaviour)

The first column is the family. All are plain records on the `AMMO` table (the Workshop's `w` record), with seven new numbers in `WDEF` (`line`, `pierce`, `gust`, `gustSecs`, `push`, `qlvl`, `mass`; the old weapons have 0 or 1 of them and shoot exactly as before). The family of a record is read from its numbers (`famOf`), so a Workshop weapon with `roll` or `tether` is placed in the right family and meets the same counters. Prices are `wPrice` (my formula).

| Family (price) | Look and sound | How it moves | What it does | Counter |
|---|---|---|---|---|
| **Lobber** (Marble, 4) | blue marble, twang | the old arc; high lob over a wall | blast .3 (high lob: half) | **Roof**: a lob landing within reach of its edge keeps a quarter of its blast, and the roof loses a panel for every 1.6 Marbles it takes. A Shield board also stops a *low* lob (it is in the way). |
| **Flat flinger** (4.9) | small yellow ball, "zip" | `line:1`: a straight line from the gun to the ground at the target, `speed` 2 (about half the Marble's time) | blast .22, 4 parts a hit, Keep leg. `pierce:1`: it **punches through one thin piece** (a wall or a gate: one part comes off, the blast keeps 85%) and flies on. Needs a clear line: a tent, a Keep or a board in its way stops it | **Shield board** (the blast keeps 20%, a plank wears), **Log barrier** (35%) |
| **Roller** (acorn drum, 5.1) | brown acorn, rattle | lands short (blast .08), then **rolls** 2.4 on along the ground (`roll`), knocking off parts at its base | a lane of the camp, the gate and the foot of the walls | **Ditch** (3 lanes; a roller falls in, 4 to a lane, then a lane is filled in), **Log barrier** (stops it, a log comes off for every 2). A **Low wall** does nothing: it hops it |
| **Scatter popper** (3.3) | eight pink beads, pop | `scatter:8` on a high arc | a wide cloud (spread .55), blast .14 each, 2 parts a bead, slows mice in .2 for 4 s | **Net** (catches a bead that lands within reach of it: 10 beads wear a strip of its mesh); a Roof blunts them |
| **Tether hook** (3.1) | gold hook, thrum, a drawn string | high arc; snags the first part within a hand of its path, or the nearest low part where it lands | yanks that part 1.6 toward the gun: a door, a wall post (the wall comes down), a Keep leg | **Cutter post** (a string passing within .3 of it is cut; one of its two blades comes off), **Net** (catches the string or the ball). Anything in front of the camp that the hook meets first takes the yank instead |
| **Thumper** (4.7) | big grey ball, boom | lobbed, `blast 0`; a ground shake of radius .9 | `quake` with `qlvl:2`: parts held by one fastener fall (as the old Pocket Earthquake), and in the inner 65% also **the planks of a wall with no brace, a gate's doors and lintel, a Keep's braces if nothing props it**, nearest first, 7 at most | **Extra brace** (the kit's brace piece: a wall or Keep it props keeps everything). A gate cannot be braced: it stays the weak point |
| **Fan** (2.9) | pale ball, whoosh, a ring and streaks | lobbed; leaves a **gust** (`gust` radius .9, 5 s) blowing sideways (to the left of the shot) | no damage by itself. Blows mice off their places, moves loose parts and **shots in the air** (a Marble fired through it lands off its line; heavy ones, `mass`, less), and tears the cloth off a Roof or a Net | **Heavy block** (shelters .55 round it) and **Low wall** (.3). A Big Marble hardly moves |

### The counter pieces (in the Build bar; stage and need as the Building Yard)

Each is one piece of a few parts with a real support rule: take what holds a part up and it falls (a test knocks the supports out one at a time and checks `SG.bldFloating()` stays empty). Costs are budget points (`CONFIG.v2.cost`; a Marble is 4, a Flinger 4.9).

| Piece | Cost | Parts (what holds what) | Does |
|---|---|---|---|
| **Roof (awning)** | 1 | 4 posts, 2 beams, 3 cloth panels. A beam needs its 2 posts, a panel either beam | a shell lobbed from above lands on it. Tall: a flat shot goes under |
| **Shield board** | 1 | 2 legs, 4 planks (a plank needs either leg) | thick: stops a flat shot |
| **Ditch** | 1 | 2 rims, 3 pit lanes (a lane needs either rim) | a flat trench (shots go over it): swallows rollers |
| **Log barrier** | 1 | 2 pegs, 3 logs (two lie, one on top of both) | stops a roller; thick for a flat shot |
| **Net** | 0.5 | 4 poles, 2 ropes, 3 mesh strips | a tall canopy: catches beads and a hook, lets a heavy ball through |
| **Cutter post** | 0.5 | post, arm, 2 blades (the blade needs the arm) | cuts a hook string; shots go past it |
| **Extra brace** | 1 | the kit's brace (it must lean on a wall or a Keep) | holds against a strong thump |
| **Heavy block** | 1.5 | block, cap, ring | does not move; shelters from a gust |
| **Low wall** | 0.5 | sill, 4 bricks | shelters a little from a gust; a flat shot goes through it |

A Marble that lands among them chips them like any piece (`bldHits`), and a counter that wears out is a counter that is gone: **no counter makes a camp immune** (a test: twenty shots from at least one family still do five points or more to a camp with every counter).

### The Counter matrix

The Arsenal panel's **Counter matrix** button (and `SG.labMatrix()`, headless) fires every weapon at nine camps and shows a table of points, a verdict for each weapon ("countered by X, strong vs Y") and a second table of the stock camps. The camp is always the same (a Keep behind a gate and two walls, a tent, a workshop: `SG.arsCamp(id,side)`, in the Target camp list as "Arsenal: ..."): the bare camp, one camp for each kind of counter, and a camp with all of them. (Nine camps, not eight: Roof, Shield, Ditch + logs, Net, Cutter, Braces, Heavy block + low wall, then none and all.) A cell is a volley of 5 shots (the aim spot and four round it), nothing mended, the mean of 4 seeds, free gun, Chain topple off. **Points**: a camp part off 1, a collapse 3, a Keep felled 10, a mouse dizzied, slowed or blown .25; the counters' own wear is shown and not counted. A weapon is "countered" by a counter that cuts its points by 40% or more. The whole matrix runs in about two seconds headless. `SG.labMatrixCell(family, camp, {shots, seeds})` is one cell (a camp can also be one counter alone: `ditch`, `logs`, `awning`, `lowwall`); `SG.labMatrixMd(result)` is the text of `ARSENAL_REPORT.md`.

What it says now (details and every number in `ARSENAL_REPORT.md`): Roof cuts the Lobber 98% (and the high lob 100%); Shield board cuts the Flinger 100%; Ditch and Log barrier each stop the Roller (100% for 5 rollers; a volley of twenty gets through); Net cuts the Popper 71% and the Hook 100%; Cutter post cuts the Hook 68%; three braces cut the Thumper 80%; Heavy block + low wall cut the Fan 67%. Each weapon's best stock camp: Lobber and Thumper the Long wall, Flinger and Roller the Walled Keep, Popper the Long wall (4 points: it is light), Hook the Glass house (a lone Keep: it can pull its legs), Fan the Braced Keep (3 points, all of it mice).

### What the Lab does with it (the hooks)

| Where | What |
|---|---|
| `pieceAt` | `IGN` (pieces a shot has already gone through) and `arsSkip` for the counter kinds only: a ditch and a cutter post are not in a shot's way, a roof or a net hangs over a low shot, a net lets a heavy ball through. Matches have no such kind, so nothing changes. |
| `SG.arc`, `tickMarbles` | `ARSF` (the family of the shot being looked at); `arsIn`; `arsPierce` (Lab only). |
| `boom` | `arsBoom` (Lab only): a tether is cut or caught, a ball caught by a net, a roof or a thick board cuts the blast; `arsGustAt` for a gust. |
| `rollTick` | `arsRoll` (Lab only): ditch and logs. |
| `quakeAt` | `arsLoose` (a strong thump's extra parts). |
| `tickLab`, `labTrack` | `arsTick` (gusts), `arsBusy` (a shot is not over while a gust blows). |
| `wPrice` | `arsPrice`: the new numbers cost; 0 for every old weapon. |
| `camTarget` | `SG.lab.focus` may have `el` (elevation) and `yaw` (turn round the spot): the Arsenal's pictures use them. |

### How to add a family or a counter

A weapon: put a record in `ARS_W` (name, icon, tint, sound `sfx`, `w` numbers) and, to have it in the matrix, an entry in `ARS_FAMS` with its aim spot; a new motion is a number in `WDEF` read by the one landing code (`boom`, `tickMarbles`, `rollTick`), as the seven above are. A counter: a `BUILD.name` in `models.js` with `bp()` (see `ctr()` at the Arsenal section), a row in `CK` (size and height) in `game.js`, a cost, a rule in `arsBoom` or `arsRoll`, and a line in `arsCamp`.

### Pictures

`shots/arsenal-1-lobber.png` to `arsenal-8-shield-and-ditch.png` (made by `tests/lab-shots.js`; name them to make only those): a Roof taking a lob ("Roofed!"), the Flinger through a gate, the Roller falling down a Ditch behind a Log barrier, beads caught by a Net, the Hook's snag, the Thumper's planks and braces shaken loose, the Fan's gust ripping cloth off a Roof and a Net beside a Heavy block, and the camp with every counter after a Flinger and a Roller.

### Frame time

Same machine and method as the Yard (headless Chromium, software GL, 1280 by 800, 8 seconds, `tests/lab-shots.js --frames`): the camp with **every counter** (20 pieces on the table, 129 part models) is **82 draw calls, 24 thousand triangles and about 190 ms a frame**, back to back with the Castle (137 calls, 58 thousand triangles, about 265 ms): about **70% of a Castle**. A gust adds one ring and a few lines. Software GL, so read the ratio only; nobody has timed it on an iPad.

### What is wrong or untested

- **Nobody has played it, and not on an iPad.** Everything here was run in a desktop browser by tests and by looking at pictures.
- **Mice stand still in the Lab**, so the Popper's slow and the Fan's push (mice blown off their places) show as counts, not as what they would do in a match (a crew mouse blown off a lobber, a squad slowed on the way to the hill). Both look weaker than they are, and the Fan's points are all mice.
- **The Thumper is the strongest weapon by points** (17.9 on the bare camp, against 7 to 15 for the others) for a price of 4.7. Its counter is cheap (a brace, 1 point) but needs one per wall and one for the Keep (3 here), and a gate cannot be braced. Not tuned; probably too strong against unbraced walls.
- **Several counters also stop weapons they were not made for, because they are in the way**: a Shield board stops a low lob (51% off), a low-flying Hook and a Popper's low beads; a Log barrier stops a Flinger and a Hook. That is physics, not design, and it blurs "one counter each". A Roof still beats everything that comes from above and nothing that flies low.
- **The camp is built so that the counters protect it**: the Roof, Ditch, Net and Cutter stand on the line of fire, the Heavy block next to where the mice rest. Put them a hand to the side and they do much less (a Cutter post only cuts a string that passes within .3 of it; a Net and a Roof cover .8 and .45 of a piece's size round their edge). That is the point, but the matrix is the best case for each counter.
- The numbers (blasts, wear, costs, prices) are mine and untested against play. A Roof absorbs about five Marbles for one point; a twenty-shot volley wears everything out.
- Weapon numbers are for piece scale small. The camps fit without overlap at small and medium; at large the tent and workshop overlap two braces (the Castle has the same problem), and I did not retune the camp or the numbers for medium or large.
- The aim preview (the arc line) does not know that a Flinger will punch through a wall: it ends at the wall.
- The Weapon Workshop's sliders do not have the seven new numbers (a test requires exactly 23 sliders); a weapon can carry them in pasted JSON (`line`, `pierce`, `gust`, `gustSecs`, `push`, `qlvl`, `mass` are clamped like the rest), and a record with `line:1` is a straight shot even without an `arc`.
- The new sounds are synthesised noises I could not hear; the pictures were looked at, the sounds were not.
- `SG.labMatrix` takes the Lab's rules (Chain topple off, quick reload, no crew): it is not a match.

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
| `landV2` / `boom` | The one place every weapon lands, from its record (`AMMO[id].w`): a tether's yank, the blast (`blastAt` takes the cap and the falloff), dizzy, glue, slow and puddle, a quake; a fuse waits in `SG.fuses` (`tickFuses`), a roller rolls (`rollTick`). Matches use the same code with the five records they always had; the baseline of every old row was compared before and after and is identical. |
| `SG.fire` | A scatter (`w.scatter`) throws the extra balls the corks used to. |
| `tickMarbles` | Fuses, rollers and the tether's snag in flight. |
| `collapse`, `keepDown`, `settle`, `tickDebris` | Lab only (`SG.lab.topple`): `topple`, the chain depth, the cap (`SG.topN`). `fxShake` / `fxSlow` leave the shake and the beat to `labFx` when the Lab's switches are on. |
| `settle`, `holdFail`, `blastAt`, `topple`, `looseParts`, `startObj` | A kind in `BK` (the six Building Yard kinds, which no match has) takes its own branch: `bSettle`, `bldHits`, `toppleB`, a part table from `SS.bldInfo`. Every other kind takes the old branch untouched. |
| `syncPieces` | A fallen part may wait to start falling (`q.t0` in the future): the time is clamped at 0. |
| `pieceAt` | **Shared with matches**: the bare-frame rule (`bareFrame`, `nearFrame`). |
| `viewObj` | Keeps a cache of each model's parts (`VCACHE`) so a camp rebuilt while nothing is drawn (the range tests) is cheap. The drawn game is unchanged. |
| the view | The hill and the mats are hidden; the Lab draws its own ghost, gun, rings and support lines. A fused ball throbs where it lies; a rolling one rolls; a swept part is hidden. |

## What is not done (honestly)

- **The Raid mode** is not built; it is only planned (`RAID_MODE_PLAN.md` in the cards folder).
- **Workshop weapons are not balanced for matches.** They live in the Lab until Harry promotes one. The prices are a formula of mine. Rate it judges damage only: a slowing weapon (the Bead shot) and a sticking one (glue) show little because the Lab's mice stand still and nobody mends.
- **Pocket Earthquake does nothing to a whole camp of walls, gates and Keeps** (nothing is held by one fastener). It finishes what a Marble began; Rate it fires a Marble first. On a building of the Building Yard it shakes every piece of trim loose (a tile hangs on one rafter, a shutter on one window), and nothing else.
- **Chain topple is a Lab rule**, not a match one: with it on, the Lab is no longer exactly a match (switch it off for that).
- **The Castle's frame time is a software-GL number** (see above); no iPad has timed it.
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
