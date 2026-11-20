# Round Table Kingdom: range report

Made by `tests/range.js`, which runs the Lab's own range (`SG.labRange`) with every weapon on every target camp, then "Rate it" (`SG.labRate`) for every weapon. **Nothing here is estimated: each cell is one shot, fired through the real game code (`SG.fire`, the blast, the support and collapse rules, `CONFIG.v2` and `CONFIG.workshop` as committed).**

## What the range found

Read with the settings below: one gun position, still mice, no raiders, no mending, small pieces, unlimited Big Marbles, Chain topple on. 20 weapon rows (the five kinds a match uses and their high lobs, the six Workshop presets and their high lobs, and one saved Workshop weapon, "Heavy popper") against 19 target camps (the seven old ones, the five big ones, and the seven of the Building Yard), 49 shots each at their aim spots, and "Rate it" for every weapon (Rate it still uses the original eleven targets, so its numbers did not move). **The paragraphs below were written for the first 12 targets and 28 shots a weapon; their counts ("1 shot of 28") are those, and the Building Yard section says what the seven new targets add.** **These are numbers from a machine, not play: nobody has held an iPad and fired any of this. "Fun" below is my judgement from the numbers and the screenshots.**

**The Building Yard (20 Nov)** has its own table, "Building Yard: stage by stage", near the end of the report, and its own seven targets above. Short version, at the default size: a **light touch** (a Marble that lands just out of reach) takes nothing off any building; **one Marble** takes 4 or 5 parts, trim first (3 to 4 trim, 0 to 2 walls, no frame, no collapse); a **high lob** takes 1; **eight Marbles at one spot** dig a hole (3 to 5 trim, 1 to 4 walls, at most 1 frame part) and collapse only the cottage (at shot 2: the second shot takes the ridge beam and the cascade counts); **a Big Marble** brings a side down every time (a collapse; 2 to 24 parts of 21 to 40 left) and **two** leave 0 to 8 parts; with **Chain topple** the market row and the yard of three lose 7 and 8 more parts to their neighbours than without. A **salvo of ten Marbles** spread over a building takes 4 to 16 parts and collapses the cottage and the market row once. **Nothing is ever left floating** (the last column of that table is 0 everywhere, and the Lab test checks it after every shot). What I would want played before trusting: the Marble cannot bring a building down by itself unless it lands within a hand's width of a post, which may be too hard; a Big Marble takes a side with one shot, which may be too easy. Both are numbers in `CONFIG.workshop.yard`.

**Useless on their own (they do little to a whole camp)**

- **Bead shot** did something in 1 shot of 28 (2 in the high lob). Eight tiny blasts of .05 take almost nothing off; the point of it is to slow mice, and the Lab's mice stand still and nobody mends, so the report cannot see the point. Rated on damage it "does little".
- **Pocket Earthquake** did something in 1 shot of 28. A whole piece has nothing held by one fastener, so a quake does nothing to an undamaged camp. It is a finisher: after a Marble has taken a rail or a post, the quake brings the rest of a wall down (the test shows a wall with one post and one rail losing everything but the post). Rated with a Marble before each shot, it is "weaker than a Marble". (Since the Building Yard it does something to buildings: it shakes every piece of trim loose, 17 parts off a cottage and nothing else, and it did something in 22 of 49 shots in all.) If Harry wants it to be a weapon in its own right, it needs a rule that loosens whole pieces too (the cheapest: a quake takes one random rail or post off every piece in reach, then loosens what is left); I did not invent that, because the idea said "without striking".
- **Corks** and **Glue blob** do no damage, by design; the report cannot say how good they are because the target's mice never move and nobody mends (the first report said the same).
- **Marble (high lob)** is still the weakest of the old kinds: 9 of 28 shots did anything, 9 parts in all (the flat Marble: 26 of 28 and 59 parts). Nothing changed there.
- **Triple bouncer** is weak for what it costs: 26 of 28 shots did something but 40 parts in all, "weaker than a Marble". It is priced at 6.4 points, because the price counts a small blast at each of three touchdowns, but in practice it meets a wall on its first flight and goes off once. The price formula overrates it (a Bouncer, one bounce, is 1.6 points and scores the same).

**Too strong**

- No weapon fells a Keep in one shot against every target: nothing is flagged "too strong" by the rule in Rate it (a Big Marble fells one in a salvo of ten at 8 of 12 runs, never in one shot).
- **Pop bomb** is the one I would call too strong. It scores 250 against a Big Marble's 118 and a Marble's 41, for a price of 6.0 points against the Big Marble's 6.6: 289 parts off and 31 collapses over the 28 single shots (a Big Marble: 83 parts, no collapse), 100 parts and 12 collapses in one flat shot each at the eleven targets. A single Pop bomb on the Domino row brings down ten walls in a chain. It never fells a Keep (it cannot break a leg), so it is not a replacement for a Big Marble: it clears camps and leaves the Keep. Most of its strength is the chains it starts, not its blast: with Chain topple off its score drops to 127, and a cap of 2 parts a pop (tried in the Workshop; 3 to 6 make no difference) also brings it to about a Big Marble's. This is a Lab toy and has not been balanced against a match.
- **Acorn drum** is nearly a Big Marble for 4.7 points (105 against 118): 28 of 28 shots did something, 93 parts and 17 mice dizzy in singles, 251 parts and 25 collapses in salvos. A drum that rolls through a camp knocks base parts off everything in its path, and nothing stops it but its roll length.
- **Tether marble** is the surprise: it is "weaker than a Marble" in single shots (11 parts over eleven targets against 24) but in a salvo it is the only weapon besides the Big Marble that fells Keeps: 4 of 12 salvos (5 of 12 for the high lob), because it snags the first part it meets whatever its sturdiness, and a Keep leg or brace is a part. The 4.3-point marble that cannot take a leg off a braced Keep in a match does it by string.

**The three most fun, I think**

1. **Pop bomb on a Domino row or the Castle**: it lies there for a second, goes off, and a line of walls falls one after another (the carnage shot, `lab-9-carnage.png`: 56 parts off, a chain of 8). It is the weapon that does the thing Harry asked for.
2. **Acorn drum**: it lands, rolls on along the table through whatever is in front of it, knocking things off at the base, and makes mice dizzy as it goes (17 mice in the singles). It is the most watchable and does something to every target.
3. **Tether marble**: a part jumps off a wall and flies at you, and if you keep at it the Keep falls. It is the only new weapon with a trick (the aim matters: it takes the first part it meets) and it makes a surprising Keep-killer.

(The Heavy popper, a saved Workshop weapon made to test saving, comes out "about like a Big Marble" at 6.7 points: 134 parts in singles, 272 in salvos, no Keep; a decent example of what the sliders can make.)

**Anything surprising**

1. **The bare-frame bug is fixed, and the probe shows it.** The first report found that a gate stripped to its posts and braces stopped every flat shot and shielded a Keep. Now the same eight Marbles at the Walled Keep's gate: the third and later pass between the posts and land on the Keep (the probe table below). A wall or gate with any plank, rail, door or lintel left still stops a shot exactly as before; nothing else in a match changes (all the match tests pass).
2. **A single shot almost never brings anything down without Chain topple**: 0 collapses in 28 shots for a Marble, 31 for the Pop bomb. Collapses come from a wall losing both rails or both posts, and a flat Marble takes a rail only on a near-direct hit.
3. **With Chain topple on, a wall or gate that has lost its frame now counts as having fallen even when the blast already took its planks.** That is a Lab rule (off, a shot is exactly a match shot), and it is why a Pop bomb on a wall starts a chain: the wall "falls" onto the next. Rate it shows both; Chain topple off roughly halves the Pop bomb's score (250 to 127) and the Big Marble's salvo collapses (13 to 6).
4. **The Wall maze is a good test of a lob**: flat shots land on the outer gate, and only the high lobs of the Tether marble and the Acorn drum got in (84 parts and a Keep down at shot 3, and 95 parts with 14 collapses, in the salvo).
5. **A lobber is still hard to snipe from the front**, and a Keep behind a gate is no longer safe from flat shots once the gate is a frame.

**Limits of this report.** The numbers are for this gun position (centred on the table's near rim), these templates and this piece size (small); another size changes the radius of every blast, the footprint of every piece and how the Castle fits on the table (it is laid out for small and medium). The mice never move, so Corks, Glue and the Bead shot cannot show what they are for. A salvo is one fixed pattern of ten spots, not a clever aimer. Nothing is mended and no raider pulls anything. The prices (`CONFIG.workshop.price`) are my formula, not tested against play. Run `tests/range.js` again after any change to `CONFIG.v2`, `CONFIG.workshop` or `AMMO`.

## Settings used

- Rules v2, piece size **small** (the default), the usual practice table, one-player Lab. The bare-frame fix is in (a wall or gate that is only posts and braces no longer stops a flat shot).
- **Chain topple is ON** (the Lab's default): a wall, gate or Keep that falls lands on the pieces in the way it falls and knocks parts off them, at most 8 topples a shot, and a wall or gate that has lost its frame counts as having fallen even if the blast took its planks. With Chain topple off a shot behaves exactly as in a match; the Rate it tables below show both.
- Each shot is fired from the **free gun** on the near rim of the table (x = 0.35 times the aim x, clamped to about plus or minus 1.1, on the circle of radius 3.15). A shot from the free gun clears the first 30% of its flight, so it passes over my own camp; my camp is taken off the table for the test anyway.
- Every shot is at a **fresh copy** of the target: the camp is rebuilt whole (the same looks every time) and the mice put at their resting places before each shot. A row is one shot, never an average. The glue row "after a Marble" fires a Marble first, then the Glue blob at the same spot.
- Reload: quick (0.3 s), crew not needed, unlimited ammunition (so a Big Marble is always there; in a match it is earned on the hill). Mice stand still beside the Keep (they cannot be dodged); there are no raiders and nothing is mended.
- The random seed is fixed (424242) before every shot, so the table is the same every time you run it.
- "Parts off" counts parts knocked off by the shot and by what it brought down (chain collapses, topples and thrown parts landing on others), counted until nothing is left flying or waiting on a fuse. Mice made dizzy counts the 5 mice of the target camp.
- A **salvo** (the last column of the first table of each target) is the same weapon ten times running with nothing mended in between, spread over the camp round the aim spot (the spot itself, four spots 0.22 units to each side, four on the diagonals, then the spot again; seeds 424243 to 424252). For a weapon that needs damage to work on (Pocket Earthquake) the Rate it salvo fires a Marble before every shot. Other aim spots (the front piece, the mice) show single shots only.
- The weapons: Marble; Big Marble; Corks; Bouncer; Glue blob; Tether marble (ChatGPT #18, Grok #16, Gemini #13); Pocket Earthquake (ChatGPT #12); Acorn drum (Gemini #11 (also Gemini #18, Grok #19, ChatGPT #19)); Bead shot (Gemini #20); Pop bomb (the Lab (a toy "pop"; fire and powder are out)); Triple bouncer (the Lab (from the Bouncer)); Heavy popper (the Lab (a saved Workshop weapon, used by tests/range.js to cover saved weapons)). Saved weapons come from `tests/range-weapons.json`, saved into the page's localStorage first.
- Reading "Rate it": one flat shot and a salvo of five at each of eleven targets (every target but the empty one and my camp copy), summed; the verdict compares the weapon's score with a Marble's and a Big Marble's (`CONFIG.workshop.rate`: a part off counts 1, a collapse 4, a Keep felled 15, a mouse dizzy .5; a salvo counts .3 of a single shot).

## Weapon prices and numbers

| Weapon | Price (points) | Blast | Flat | Bounces | Scatter | Fuse | Stick | Slow | Dizzy radius | Tether | Quake | Roll | Cap | Cooldown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Marble | 4 | 0.3 |  |  |  |  |  |  | blast |  |  |  |  |  |
| Big Marble | 6.6 | 0.33 | yes |  |  |  |  |  | blast |  |  |  |  |  |
| Corks | 0.5 | 0 |  |  | 5 |  |  |  | 0.2 |  |  |  |  | 8 |
| Bouncer | 1.6 | 0.2 | yes | 1 |  |  |  |  | blast |  |  |  |  | 5 |
| Glue blob | 3.3 | 0 |  |  |  |  | 15 | 55% for 4 s | 0 |  |  |  |  | 8 |
| Tether marble | 3.8 | 0.05 |  |  |  |  |  |  | blast | 1.5 |  |  |  | 3 |
| Pocket Earthquake | 3.6 | 0 | yes |  |  |  |  |  | 0.3 |  | 1 |  |  | 4 |
| Acorn drum | 4.7 | 0.1 |  |  |  |  |  |  | blast |  |  | 2.4 |  | 3 |
| Bead shot | 1.3 | 0.05 |  |  | 8 |  |  | 50% for 3 s | 0 |  |  |  |  | 2 |
| Pop bomb | 6 | 0.42 |  |  |  | 1 |  |  | 0.35 |  |  |  | 6 | 6 |
| Triple bouncer | 6.4 | 0.22 | yes | 3 |  |  |  |  | blast |  |  |  |  | 4 |
| Heavy popper | 6.7 | 0.32 | yes |  | 3 | 0.5 |  |  | 0.25 |  |  |  | 5 | 5 |

## Rate it: every weapon against every target

One flat shot at each of the eleven targets, summed (parts off · collapses · Keeps felled · mice dizzy), the score, and the verdict. Marble and Big Marble are the yardsticks.

| Weapon | Price | Chain topple ON: shots | score | verdict | Chain topple OFF: shots | score | verdict |
|---|---|---|---|---|---|---|---|
| Marble | 4 | 24 · 0 · 0 of 8 · 0 | 41 | about like a Marble | 24 · 0 · 0 of 8 · 0 | 41 | about like a Marble |
| Big Marble | 6.6 | 31 · 0 · 0 of 8 · 2 | 117.8 | about like a Big Marble | 31 · 0 · 0 of 8 · 2 | 93.9 | about like a Big Marble |
| Corks | 0.5 | 0 · 0 · 0 of 8 · 2 | 1.6 | does little | 0 · 0 · 0 of 8 · 2 | 1.6 | does little |
| Bouncer | 1.6 | 12 · 0 · 0 of 8 · 0 | 20.7 | weaker than a Marble | 12 · 0 · 0 of 8 · 0 | 20.7 | weaker than a Marble |
| Glue blob | 3.3 | 0 · 0 · 0 of 8 · 0 | 0 | does little | 0 · 0 · 0 of 8 · 0 | 0 | does little |
| Tether marble | 3.8 | 11 · 0 · 0 of 8 · 0 | 32.8 | weaker than a Marble | 11 · 0 · 0 of 8 · 0 | 32.8 | weaker than a Marble |
| Pocket Earthquake | 3.6 | 4 · 0 · 0 of 8 · 0 | 16.9 | weaker than a Marble | 4 · 0 · 0 of 8 · 0 | 14.2 | weaker than a Marble |
| Acorn drum | 4.7 | 38 · 0 · 0 of 8 · 7 | 104.8 | about like a Big Marble | 38 · 0 · 0 of 8 · 7 | 93.9 | about like a Big Marble |
| Bead shot | 1.3 | 1 · 0 · 0 of 8 · 0 | 1.3 | does little | 1 · 0 · 0 of 8 · 0 | 1.3 | does little |
| Pop bomb | 6 | 100 · 12 · 0 of 8 · 6 | 249.9 | much stronger than Big Marble, though it fells fewer Keeps (0 of 8 salvos, a Big Marble 6) | 51 · 3 · 0 of 8 · 3 | 126.5 | stronger than Big Marble, though it fells fewer Keeps (0 of 8 salvos, a Big Marble 6) |
| Triple bouncer | 6.4 | 12 · 0 · 0 of 8 · 0 | 20.1 | weaker than a Marble | 12 · 0 · 0 of 8 · 0 | 20.1 | weaker than a Marble |
| Heavy popper | 6.7 | 36 · 0 · 0 of 8 · 1 | 118.9 | about like a Big Marble | 36 · 0 · 0 of 8 · 1 | 75.1 | stronger than a Marble |

And the salvos of five (parts off · collapses · Keeps felled), Chain topple on:

| Weapon | Salvo parts | Salvo collapses | Keeps felled by a salvo (of the targets with a Keep) |
|---|---|---|---|
| Marble | 55 | 0 | 0 of 8 |
| Big Marble | 132 | 13 | 6 of 8 |
| Corks | 0 | 0 | 0 of 8 |
| Bouncer | 29 | 0 | 0 of 8 |
| Glue blob | 0 | 0 | 0 of 8 |
| Tether marble | 52 | 1 | 1 of 8 |
| Pocket Earthquake | 27 | 4 | 0 of 8 |
| Acorn drum | 155 | 11 | 0 of 8 |
| Bead shot | 1 | 0 | 0 of 8 |
| Pop bomb | 222 | 24 | 0 of 8 |
| Triple bouncer | 27 | 0 | 0 of 8 |
| Heavy popper | 192 | 18 | 0 of 8 |

## Walled Keep (a Keep behind a gate and two walls)

4 pieces: 1 gate, 1 tower, 2 wall.

Aimed at the Keep (or the middle of the camp) (0.00, -2.42):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 3 | 0 | no | 0 | 0 | Gate | 4 · 0 · stands |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Big Marble | 3 | 0 | no | 0 | 0 | Gate | 7 · 1 · down at 4 |
| Corks | 0 | 0 | no | 0 | 0 | Gate | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 2 | 0 | Gate | 0 · 0 · stands |
| Bouncer | 2 | 0 | no | 0 | 0 | Gate | 3 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Gate | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Keep | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Gate | 9 · 1 · down at 9 |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Gate | 4 · 1 · down at 4 |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Gate | 0 · 0 · stands |
| Acorn drum | 2 | 0 | no | 0 | 0 | Gate | 6 · 0 · stands |
| Acorn drum (high lob) | 2 | 0 | no | 0 | 0 | Keep | 5 · 0 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Gate | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Gate | 0 · 0 · stands |
| Pop bomb | 3 | 0 | no | 0 | 0 | Gate | 13 · 1 · stands |
| Pop bomb (high lob) | 1 | 0 | no | 0 | 0 | Keep | 1 · 0 · stands |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground | 5 · 0 · stands |
| Heavy popper | 3 | 0 | no | 0 | 0 | Gate | 15 · 1 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Keep | - |

Aimed at the front piece (gate) (-0.00, -1.85):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 2 | 0 | no | 0 | 0 | Gate |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Gate |
| Big Marble | 2 | 0 | no | 0 | 0 | Gate |
| Corks | 0 | 0 | no | 0 | 0 | Gate |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Gate |
| Bouncer | 1 | 0 | no | 0 | 0 | Gate |
| Glue blob | 0 | 0 | no | 0 | 1 | Gate |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Gate |
| Tether marble | 1 | 0 | no | 0 | 0 | Gate |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Gate |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Gate |
| Acorn drum | 2 | 0 | no | 0 | 0 | Gate |
| Acorn drum (high lob) | 2 | 0 | no | 0 | 0 | Gate |
| Bead shot | 0 | 0 | no | 0 | 0 | Gate |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Gate |
| Pop bomb | 3 | 0 | no | 0 | 0 | Gate |
| Pop bomb (high lob) | 2 | 0 | no | 0 | 0 | Gate |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 2 | 0 | no | 0 | 0 | Gate |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Gate |

## Braced Keep (a Keep and two braces)

3 pieces: 2 brace, 1 tower.

Aimed at the Keep (or the middle of the camp) (0.00, -2.42):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 1 | 0 | no | 0 | 0 | Keep | 1 · 0 · stands |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Big Marble | 2 | 0 | no | 2 | 0 | Keep | 6 · 1 · down at 3 |
| Corks | 0 | 0 | no | 2 | 0 | Keep | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 2 | 0 | Keep | 0 · 0 · stands |
| Bouncer | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Keep | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Keep | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Keep | 15 · 1 · stands |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Keep | 15 · 1 · stands |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Acorn drum | 2 | 0 | no | 0 | 0 | Keep | 5 · 0 · stands |
| Acorn drum (high lob) | 2 | 0 | no | 0 | 0 | Keep | 5 · 0 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Pop bomb | 1 | 0 | no | 0 | 0 | Keep | 8 · 1 · stands |
| Pop bomb (high lob) | 1 | 0 | no | 0 | 0 | Keep | 1 · 0 · stands |
| Triple bouncer | 0 | 0 | no | 0 | 0 | ground | 0 · 0 · stands |
| Heavy popper | 1 | 0 | no | 0 | 0 | Keep | 4 · 0 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Keep | - |

## Glass house (a lone Keep on four thin legs, no braces)

1 pieces: 1 tower.

Aimed at the Keep (or the middle of the camp) (0.00, -2.30):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 1 | 0 | no | 0 | 0 | Keep | 1 · 0 · stands |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Big Marble | 2 | 0 | no | 0 | 0 | Keep | 3 · 1 · down at 2 |
| Corks | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Bouncer | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Keep | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Keep | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Keep | 3 · 1 · down at 3 |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Keep | 3 · 1 · down at 3 |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Acorn drum | 2 | 0 | no | 1 | 0 | Keep | 5 · 0 · stands |
| Acorn drum (high lob) | 2 | 0 | no | 1 | 0 | Keep | 5 · 0 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Pop bomb | 7 | 1 | no | 1 | 0 | Keep | 8 · 1 · stands |
| Pop bomb (high lob) | 1 | 0 | no | 0 | 0 | Keep | 1 · 0 · stands |
| Triple bouncer | 0 | 0 | no | 0 | 0 | ground | 0 · 0 · stands |
| Heavy popper | 1 | 0 | no | 1 | 0 | Keep | 2 · 0 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Keep | - |

## Long wall (six walls in a row)

6 pieces: 6 wall.

Aimed at the Keep (or the middle of the camp) (0.00, -2.00):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Wall | 8 · 0 · stands |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Wall | 2 · 0 · stands |
| Big Marble | 4 | 0 | no | 0 | 0 | Wall | 8 · 0 · stands |
| Corks | 0 | 0 | no | 0 | 0 | Wall | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Wall | 0 · 0 · stands |
| Bouncer | 1 | 0 | no | 0 | 0 | Wall | 4 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Wall | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Wall | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Wall | 8 · 0 · stands |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Wall | 8 · 0 · stands |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Wall | 0 · 0 · stands |
| Acorn drum | 1 | 0 | no | 1 | 0 | Wall | 6 · 0 · stands |
| Acorn drum (high lob) | 1 | 0 | no | 1 | 0 | Wall | 6 · 0 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Wall | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Wall | 0 · 0 · stands |
| Pop bomb | 6 | 0 | no | 1 | 0 | Wall | 10 · 0 · stands |
| Pop bomb (high lob) | 2 | 0 | no | 0 | 0 | Wall | 6 · 0 · stands |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground | 6 · 0 · stands |
| Heavy popper | 6 | 0 | no | 0 | 0 | Wall | 12 · 0 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Wall | - |

Aimed at the front piece (wall) (1.26, -2.00):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 3 | 0 | no | 0 | 0 | Wall |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Wall |
| Big Marble | 5 | 0 | no | 0 | 0 | Wall |
| Corks | 0 | 0 | no | 0 | 0 | Wall |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Wall |
| Bouncer | 1 | 0 | no | 0 | 0 | Wall |
| Glue blob | 0 | 0 | no | 0 | 1 | Wall |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Wall |
| Tether marble | 1 | 0 | no | 0 | 0 | Wall |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Wall |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Wall |
| Acorn drum | 1 | 0 | no | 0 | 0 | Wall |
| Acorn drum (high lob) | 1 | 0 | no | 0 | 0 | Wall |
| Bead shot | 0 | 0 | no | 0 | 0 | Wall |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Wall |
| Pop bomb | 7 | 1 | no | 0 | 0 | Wall |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Wall |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 7 | 0 | no | 0 | 0 | Wall |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Wall |

Aimed at the mice (the middle of the five target mice) (0.00, -2.42):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 6 | 0 | no | 0 | 0 | Wall |
| Marble (high lob) | 0 | 0 | no | 1 | 0 | ground |
| Big Marble | 6 | 0 | no | 0 | 0 | Wall |
| Corks | 0 | 0 | no | 0 | 0 | Wall |
| Corks (high lob) | 0 | 0 | no | 2 | 0 | Wall |
| Bouncer | 0 | 0 | no | 1 | 0 | ground |
| Glue blob | 0 | 0 | no | 0 | 1 | Wall |
| Glue blob (high lob) | 0 | 0 | no | 0 | 0 | ground |
| Tether marble | 1 | 0 | no | 0 | 0 | Wall |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Wall |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Wall |
| Acorn drum | 1 | 0 | no | 1 | 0 | Wall |
| Acorn drum (high lob) | 0 | 0 | no | 1 | 0 | ground |
| Bead shot | 0 | 0 | no | 0 | 0 | Wall |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Wall |
| Pop bomb | 6 | 0 | no | 0 | 0 | Wall |
| Pop bomb (high lob) | 0 | 0 | no | 1 | 0 | ground |
| Triple bouncer | 4 | 0 | no | 0 | 0 | ground |
| Heavy popper | 8 | 0 | no | 1 | 0 | Wall |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Wall |

## Workshop cluster (three workshops and two tents)

5 pieces: 2 tent, 3 workshop.

Aimed at the Keep (or the middle of the camp) (0.00, -1.98):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 1 | 0 | no | 0 | 0 | Workshop | 8 · 0 · stands |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | ground | 2 · 0 · stands |
| Big Marble | 2 | 0 | no | 0 | 0 | Workshop | 8 · 0 · stands |
| Corks | 0 | 0 | no | 0 | 0 | Workshop | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Workshop | 0 · 0 · stands |
| Bouncer | 1 | 0 | no | 0 | 0 | Workshop | 1 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Workshop | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 0 | ground | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Workshop | 8 · 0 · stands |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Workshop | 8 · 0 · stands |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Workshop | 0 · 0 · stands |
| Acorn drum | 2 | 0 | no | 1 | 0 | Workshop | 11 · 0 · stands |
| Acorn drum (high lob) | 0 | 0 | no | 1 | 0 | ground | 8 · 0 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Workshop | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Workshop | 1 · 0 · stands |
| Pop bomb | 3 | 0 | no | 0 | 0 | Workshop | 19 · 0 · stands |
| Pop bomb (high lob) | 0 | 0 | no | 0 | 0 | ground | 11 · 0 · stands |
| Triple bouncer | 1 | 0 | no | 0 | 0 | ground | 1 · 0 · stands |
| Heavy popper | 2 | 0 | no | 0 | 0 | Workshop | 8 · 0 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Workshop | - |

Aimed at the front piece (workshop) (-0.00, -1.50):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 3 | 0 | no | 0 | 0 | Workshop |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Workshop |
| Big Marble | 3 | 0 | no | 0 | 0 | Workshop |
| Corks | 0 | 0 | no | 0 | 0 | Workshop |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Workshop |
| Bouncer | 0 | 0 | no | 0 | 0 | Workshop |
| Glue blob | 0 | 0 | no | 0 | 1 | Workshop |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Workshop |
| Tether marble | 1 | 0 | no | 0 | 0 | Workshop |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Workshop |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Workshop |
| Acorn drum | 3 | 0 | no | 1 | 0 | Workshop |
| Acorn drum (high lob) | 2 | 0 | no | 1 | 0 | Workshop |
| Bead shot | 0 | 0 | no | 0 | 0 | Workshop |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Workshop |
| Pop bomb | 4 | 0 | no | 0 | 0 | Workshop |
| Pop bomb (high lob) | 1 | 0 | no | 0 | 0 | Workshop |
| Triple bouncer | 1 | 0 | no | 0 | 0 | ground |
| Heavy popper | 3 | 0 | no | 0 | 0 | Workshop |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Workshop |

Aimed at the mice (the middle of the five target mice) (-0.01, -2.50):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 0 | 0 | no | 1 | 0 | ground |
| Marble (high lob) | 0 | 0 | no | 1 | 0 | ground |
| Big Marble | 0 | 0 | no | 1 | 0 | ground |
| Corks | 0 | 0 | no | 1 | 0 | Workshop |
| Corks (high lob) | 0 | 0 | no | 1 | 0 | Tent |
| Bouncer | 1 | 0 | no | 0 | 0 | Workshop |
| Glue blob | 0 | 0 | no | 0 | 0 | ground |
| Glue blob (high lob) | 0 | 0 | no | 0 | 0 | ground |
| Tether marble | 1 | 0 | no | 0 | 0 | Workshop |
| Tether marble (high lob) | 0 | 0 | no | 0 | 0 | ground |
| Pocket Earthquake | 0 | 0 | no | 1 | 0 | ground |
| Acorn drum | 0 | 0 | no | 1 | 0 | ground |
| Acorn drum (high lob) | 0 | 0 | no | 1 | 0 | ground |
| Bead shot | 0 | 0 | no | 0 | 0 | Workshop |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Tent |
| Pop bomb | 1 | 0 | no | 2 | 0 | ground |
| Pop bomb (high lob) | 0 | 0 | no | 1 | 0 | ground |
| Triple bouncer | 1 | 0 | no | 0 | 0 | ground |
| Heavy popper | 6 | 0 | no | 1 | 0 | Tent |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 0 | ground |

## Fortress (the 12-point good camp the bots build)

12 pieces: 2 brace, 1 gate, 1 lobber, 1 tower, 1 trap, 5 wall, 1 workshop.

Aimed at the Keep (or the middle of the camp) (0.00, -2.42):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 3 | 0 | no | 0 | 0 | Gate | 11 · 0 · stands |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Keep | 4 · 0 · stands |
| Big Marble | 3 | 0 | no | 0 | 0 | Gate | 20 · 2 · down at 7 |
| Corks | 0 | 0 | no | 0 | 0 | Gate | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Wall | 0 · 0 · stands |
| Bouncer | 1 | 0 | no | 0 | 0 | Gate | 7 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Gate | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Keep | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Gate | 13 · 1 · stands |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Wall | 18 · 2 · stands |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Gate | 0 · 0 · stands |
| Acorn drum | 5 | 0 | no | 0 | 0 | Gate | 22 · 2 · stands |
| Acorn drum (high lob) | 2 | 0 | no | 0 | 0 | Keep | 5 · 0 · stands |
| Bead shot | 1 | 0 | no | 0 | 0 | Gate | 1 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Wall | 0 · 0 · stands |
| Pop bomb | 3 | 0 | no | 0 | 0 | Gate | 22 · 2 · stands |
| Pop bomb (high lob) | 2 | 0 | no | 0 | 0 | Keep | 13 · 1 · stands |
| Triple bouncer | 0 | 0 | no | 0 | 0 | Spring trap | 9 · 0 · stands |
| Heavy popper | 3 | 0 | no | 0 | 0 | Gate | 36 · 3 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 2 | Wall | - |

Aimed at the front piece (lobber) (-0.98, -0.86):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 0 | 0 | no | 0 | 0 | Lobber |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Lobber |
| Big Marble | 0 | 0 | no | 0 | 0 | Lobber |
| Corks | 0 | 0 | no | 0 | 0 | Lobber |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Lobber |
| Bouncer | 0 | 0 | no | 0 | 0 | Lobber |
| Glue blob | 0 | 0 | no | 0 | 1 | Lobber |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Lobber |
| Tether marble | 1 | 0 | no | 0 | 0 | Lobber |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Lobber |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Lobber |
| Acorn drum | 1 | 0 | no | 0 | 0 | Lobber |
| Acorn drum (high lob) | 1 | 0 | no | 0 | 0 | Lobber |
| Bead shot | 0 | 0 | no | 0 | 0 | Lobber |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Lobber |
| Pop bomb | 2 | 0 | no | 0 | 0 | Lobber |
| Pop bomb (high lob) | 0 | 0 | no | 0 | 0 | Lobber |
| Triple bouncer | 0 | 0 | no | 0 | 0 | ground |
| Heavy popper | 2 | 0 | no | 0 | 0 | Lobber |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Lobber |

## My camp copy (the starter camp, a Keep and two lobbers, mirrored)

3 pieces: 2 lobber, 1 tower.

Aimed at the Keep (or the middle of the camp) (0.00, -2.42):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 1 | 0 | no | 0 | 0 | Keep | 1 · 0 · stands |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Big Marble | 2 | 0 | no | 2 | 0 | Keep | 3 · 1 · down at 2 |
| Corks | 0 | 0 | no | 2 | 0 | Keep | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 2 | 0 | Keep | 0 · 0 · stands |
| Bouncer | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Keep | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Keep | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Keep | 3 · 1 · down at 3 |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Keep | 4 · 1 · down at 4 |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Acorn drum | 2 | 0 | no | 0 | 0 | Keep | 5 · 0 · stands |
| Acorn drum (high lob) | 2 | 0 | no | 0 | 0 | Keep | 5 · 0 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Pop bomb | 1 | 0 | no | 0 | 0 | Keep | 8 · 1 · stands |
| Pop bomb (high lob) | 1 | 0 | no | 0 | 0 | Keep | 1 · 0 · stands |
| Triple bouncer | 0 | 0 | no | 0 | 0 | ground | 0 · 0 · stands |
| Heavy popper | 1 | 0 | no | 0 | 0 | Keep | 2 · 0 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Keep | - |

Aimed at the front piece (lobber) (0.95, -2.05):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 0 | 0 | no | 0 | 0 | Lobber |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Lobber |
| Big Marble | 0 | 0 | no | 0 | 0 | Lobber |
| Corks | 0 | 0 | no | 0 | 0 | Lobber |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Lobber |
| Bouncer | 0 | 0 | no | 0 | 0 | Lobber |
| Glue blob | 0 | 0 | no | 0 | 1 | Lobber |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Lobber |
| Tether marble | 1 | 0 | no | 0 | 0 | Lobber |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Lobber |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Lobber |
| Acorn drum | 1 | 0 | no | 0 | 0 | Lobber |
| Acorn drum (high lob) | 1 | 0 | no | 0 | 0 | Lobber |
| Bead shot | 0 | 0 | no | 0 | 0 | Lobber |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Lobber |
| Pop bomb | 0 | 0 | no | 0 | 0 | Lobber |
| Pop bomb (high lob) | 0 | 0 | no | 0 | 0 | Lobber |
| Triple bouncer | 0 | 0 | no | 0 | 0 | ground |
| Heavy popper | 0 | 0 | no | 0 | 0 | Lobber |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Lobber |

## Castle (a Keep, four corner towers, walls, a gate, a courtyard)

36 pieces: 2 brace, 1 gate, 2 lobber, 4 tent, 5 tower, 4 trap, 16 wall, 2 workshop.

Aimed at the Keep (or the middle of the camp) (0.00, -2.15):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 1 | 0 | no | 0 | 0 | Gate | 8 · 0 · stands |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Keep | 1 · 0 · stands |
| Big Marble | 2 | 0 | no | 0 | 0 | Gate | 9 · 0 · stands |
| Corks | 0 | 0 | no | 0 | 0 | Gate | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Lobber | 0 · 0 · stands |
| Bouncer | 1 | 0 | no | 0 | 0 | Gate | 1 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Gate | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Keep | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Gate | 10 · 0 · stands |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Wall | 29 · 3 · stands |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Gate | 0 · 0 · stands |
| Acorn drum | 8 | 0 | no | 1 | 0 | Gate | 35 · 3 · stands |
| Acorn drum (high lob) | 4 | 0 | no | 1 | 0 | Keep | 17 · 1 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Gate | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Lobber | 0 · 0 · stands |
| Pop bomb | 3 | 0 | no | 0 | 0 | Gate | 12 · 0 · stands |
| Pop bomb (high lob) | 6 | 0 | no | 0 | 0 | Keep | 11 · 0 · stands |
| Triple bouncer | 3 | 0 | no | 0 | 0 | ground | 5 · 0 · stands |
| Heavy popper | 3 | 0 | no | 0 | 0 | Gate | 41 · 3 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Gate | - |

Aimed at the front piece (tower) (1.47, -1.15):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 1 | 0 | no | 0 | 0 | Keep |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Keep |
| Big Marble | 2 | 0 | no | 0 | 0 | Keep |
| Corks | 0 | 0 | no | 0 | 0 | Keep |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Keep |
| Bouncer | 0 | 0 | no | 0 | 0 | Keep |
| Glue blob | 0 | 0 | no | 0 | 1 | Keep |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Keep |
| Tether marble | 1 | 0 | no | 0 | 0 | Keep |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Keep |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Keep |
| Acorn drum | 5 | 0 | no | 0 | 0 | Keep |
| Acorn drum (high lob) | 5 | 0 | no | 0 | 0 | Keep |
| Bead shot | 0 | 0 | no | 0 | 0 | Keep |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Keep |
| Pop bomb | 1 | 0 | no | 0 | 0 | Keep |
| Pop bomb (high lob) | 0 | 0 | no | 0 | 0 | Keep |
| Triple bouncer | 0 | 0 | no | 0 | 0 | ground |
| Heavy popper | 1 | 0 | no | 0 | 0 | Keep |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Keep |

Aimed at the mice (the middle of the five target mice) (-0.01, -2.53):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Lobber |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Keep |
| Big Marble | 5 | 0 | no | 0 | 0 | Lobber |
| Corks | 0 | 0 | no | 0 | 0 | Lobber |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Keep |
| Bouncer | 0 | 0 | no | 0 | 0 | Lobber |
| Glue blob | 0 | 0 | no | 0 | 1 | Lobber |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Keep |
| Tether marble | 1 | 0 | no | 0 | 0 | Gate |
| Tether marble (high lob) | 2 | 0 | no | 0 | 0 | Keep |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Lobber |
| Acorn drum | 4 | 0 | no | 1 | 0 | Lobber |
| Acorn drum (high lob) | 4 | 0 | no | 1 | 0 | Keep |
| Bead shot | 0 | 0 | no | 0 | 0 | Lobber |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Keep |
| Pop bomb | 7 | 0 | no | 0 | 0 | Lobber |
| Pop bomb (high lob) | 1 | 0 | no | 0 | 0 | Keep |
| Triple bouncer | 1 | 0 | no | 0 | 0 | Gate |
| Heavy popper | 9 | 0 | no | 0 | 0 | Lobber |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 2 | Lobber |

## Village (ten small camps and a chief's hall)

24 pieces: 10 tent, 1 tower, 3 trap, 7 wall, 3 workshop.

Aimed at the Keep (or the middle of the camp) (0.00, -2.45):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 1 | 0 | no | 0 | 0 | Keep | 1 · 0 · stands |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Big Marble | 2 | 0 | no | 0 | 0 | Keep | 4 · 1 · down at 3 |
| Corks | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 2 | 0 | Keep | 0 · 0 · stands |
| Bouncer | 0 | 0 | no | 0 | 0 | Spring trap | 2 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Keep | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Keep | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Keep | 8 · 1 · down at 7 |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Keep | 5 · 1 · down at 3 |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Acorn drum | 2 | 0 | no | 0 | 0 | Keep | 5 · 0 · stands |
| Acorn drum (high lob) | 2 | 0 | no | 0 | 0 | Keep | 5 · 0 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Pop bomb | 1 | 0 | no | 0 | 0 | Keep | 11 · 1 · stands |
| Pop bomb (high lob) | 1 | 0 | no | 0 | 0 | Keep | 1 · 0 · stands |
| Triple bouncer | 0 | 0 | no | 0 | 0 | Workshop | 2 · 0 · stands |
| Heavy popper | 1 | 0 | no | 0 | 0 | Keep | 5 · 0 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Keep | - |

Aimed at the front piece (wall) (-0.55, -0.82):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 3 | 0 | no | 0 | 0 | Wall |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Wall |
| Big Marble | 5 | 0 | no | 0 | 0 | Wall |
| Corks | 0 | 0 | no | 0 | 0 | Wall |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Wall |
| Bouncer | 1 | 0 | no | 0 | 0 | Wall |
| Glue blob | 0 | 0 | no | 0 | 1 | Wall |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Wall |
| Tether marble | 1 | 0 | no | 0 | 0 | Wall |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Wall |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Wall |
| Acorn drum | 6 | 0 | no | 1 | 0 | Wall |
| Acorn drum (high lob) | 6 | 0 | no | 1 | 0 | Wall |
| Bead shot | 0 | 0 | no | 0 | 0 | Wall |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Wall |
| Pop bomb | 11 | 1 | no | 0 | 0 | Wall |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Wall |
| Triple bouncer | 3 | 0 | no | 0 | 0 | ground |
| Heavy popper | 7 | 0 | no | 0 | 0 | Wall |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Wall |

## Wall maze (three rings of walls, a gate in each)

28 pieces: 3 gate, 1 tower, 24 wall.

Aimed at the Keep (or the middle of the camp) (-0.00, -1.85):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 3 | 0 | no | 0 | 0 | Gate | 10 · 0 · stands |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Keep | 2 · 0 · stands |
| Big Marble | 3 | 0 | no | 0 | 0 | Gate | 55 · 7 · down at 5 |
| Corks | 0 | 0 | no | 0 | 0 | Gate | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Gate | 0 · 0 · stands |
| Bouncer | 4 | 0 | no | 0 | 0 | Wall | 9 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Gate | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Keep | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Gate | 10 · 0 · stands |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Gate | 84 · 14 · down at 3 |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Gate | 0 · 0 · stands |
| Acorn drum | 3 | 0 | no | 1 | 0 | Gate | 95 · 14 · stands |
| Acorn drum (high lob) | 5 | 0 | no | 1 | 0 | Keep | 36 · 3 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Gate | 1 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Gate | 1 · 0 · stands |
| Pop bomb | 7 | 0 | no | 0 | 0 | Gate | 66 · 7 · stands |
| Pop bomb (high lob) | 1 | 0 | no | 0 | 0 | Keep | 5 · 0 · stands |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground | 11 · 0 · stands |
| Heavy popper | 3 | 0 | no | 0 | 0 | Gate | 75 · 8 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 3 | Keep | - |

Aimed at the front piece (gate) (-0.00, -0.75):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 2 | 0 | no | 0 | 0 | Gate |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Gate |
| Big Marble | 2 | 0 | no | 0 | 0 | Gate |
| Corks | 0 | 0 | no | 0 | 0 | Gate |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Gate |
| Bouncer | 1 | 0 | no | 0 | 0 | Gate |
| Glue blob | 0 | 0 | no | 0 | 1 | Gate |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Gate |
| Tether marble | 1 | 0 | no | 0 | 0 | Gate |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Gate |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Gate |
| Acorn drum | 4 | 0 | no | 0 | 0 | Gate |
| Acorn drum (high lob) | 4 | 0 | no | 0 | 0 | Gate |
| Bead shot | 0 | 0 | no | 0 | 0 | Gate |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Gate |
| Pop bomb | 3 | 0 | no | 0 | 0 | Gate |
| Pop bomb (high lob) | 2 | 0 | no | 0 | 0 | Gate |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 2 | 0 | no | 0 | 0 | Gate |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Gate |

Aimed at the mice (the middle of the five target mice) (-0.01, -2.43):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 1 | 0 | no | 0 | 0 | Keep |
| Marble (high lob) | 2 | 0 | no | 0 | 0 | Keep |
| Big Marble | 3 | 0 | no | 0 | 0 | Keep |
| Corks | 0 | 0 | no | 0 | 0 | Gate |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Keep |
| Bouncer | 0 | 0 | no | 0 | 0 | Keep |
| Glue blob | 0 | 0 | no | 0 | 1 | Keep |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Keep |
| Tether marble | 1 | 0 | no | 0 | 0 | Gate |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Keep |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Keep |
| Acorn drum | 6 | 0 | no | 1 | 0 | Keep |
| Acorn drum (high lob) | 7 | 0 | no | 1 | 0 | Keep |
| Bead shot | 0 | 0 | no | 0 | 0 | Gate |
| Bead shot (high lob) | 2 | 0 | no | 0 | 0 | Keep |
| Pop bomb | 51 | 7 | no | 5 | 0 | Keep |
| Pop bomb (high lob) | 5 | 0 | no | 0 | 0 | Keep |
| Triple bouncer | 4 | 0 | no | 0 | 0 | Wall |
| Heavy popper | 4 | 0 | no | 0 | 0 | Keep |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Keep |

## Domino row (three lines of eight unbraced walls)

24 pieces: 24 wall.

Aimed at the Keep (or the middle of the camp) (0.00, -1.88):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 5 | 0 | no | 0 | 0 | Wall | 16 · 0 · stands |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Wall | 3 · 0 · stands |
| Big Marble | 6 | 0 | no | 0 | 0 | Wall | 17 · 0 · stands |
| Corks | 0 | 0 | no | 0 | 0 | Wall | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Wall | 0 · 0 · stands |
| Bouncer | 2 | 0 | no | 0 | 0 | Wall | 9 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Wall | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Wall | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Wall | 56 · 8 · stands |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Wall | 10 · 0 · stands |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Wall | 0 · 0 · stands |
| Acorn drum | 8 | 0 | no | 1 | 0 | Wall | 47 · 6 · stands |
| Acorn drum (high lob) | 7 | 0 | no | 1 | 0 | Wall | 35 · 5 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Wall | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Wall | 0 · 0 · stands |
| Pop bomb | 53 | 10 | no | 3 | 0 | Wall | 53 · 10 · stands |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Wall | 12 · 0 · stands |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground | 6 · 0 · stands |
| Heavy popper | 12 | 0 | no | 0 | 0 | Wall | 67 · 12 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 2 | Wall | - |

Aimed at the front piece (wall) (1.00, -1.00):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 3 | 0 | no | 0 | 0 | Wall |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Wall |
| Big Marble | 5 | 0 | no | 0 | 0 | Wall |
| Corks | 0 | 0 | no | 0 | 0 | Wall |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Wall |
| Bouncer | 1 | 0 | no | 0 | 0 | Wall |
| Glue blob | 0 | 0 | no | 0 | 1 | Wall |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Wall |
| Tether marble | 1 | 0 | no | 0 | 0 | Wall |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Wall |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Wall |
| Acorn drum | 8 | 0 | no | 0 | 0 | Wall |
| Acorn drum (high lob) | 8 | 0 | no | 0 | 0 | Wall |
| Bead shot | 0 | 0 | no | 0 | 0 | Wall |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Wall |
| Pop bomb | 56 | 8 | no | 1 | 0 | Wall |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Wall |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 9 | 0 | no | 0 | 0 | Wall |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Wall |

Aimed at the mice (the middle of the five target mice) (-0.01, -2.47):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Wall |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Wall |
| Big Marble | 7 | 0 | no | 0 | 0 | Wall |
| Corks | 0 | 0 | no | 0 | 0 | Wall |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Wall |
| Bouncer | 1 | 0 | no | 0 | 0 | Wall |
| Glue blob | 0 | 0 | no | 0 | 1 | Wall |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Wall |
| Tether marble | 1 | 0 | no | 0 | 0 | Wall |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Wall |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Wall |
| Acorn drum | 5 | 0 | no | 1 | 0 | Wall |
| Acorn drum (high lob) | 3 | 0 | no | 1 | 0 | Wall |
| Bead shot | 0 | 0 | no | 0 | 0 | Wall |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Wall |
| Pop bomb | 9 | 0 | no | 1 | 0 | Wall |
| Pop bomb (high lob) | 6 | 0 | no | 1 | 0 | Wall |
| Triple bouncer | 5 | 0 | no | 0 | 0 | Wall |
| Heavy popper | 34 | 3 | no | 3 | 0 | Wall |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 2 | Wall |

## Tower stack (seven Keeps braced together)

14 pieces: 7 brace, 7 tower.

Aimed at the Keep (or the middle of the camp) (-0.00, -1.85):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 1 | 0 | no | 0 | 0 | Keep | 1 · 0 · stands |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Big Marble | 2 | 0 | no | 0 | 0 | Keep | 12 · 1 · down at 3 |
| Corks | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Bouncer | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Keep | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Keep | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Keep | 21 · 1 · stands |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Keep | 21 · 1 · stands |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Acorn drum | 3 | 0 | no | 1 | 0 | Keep | 9 · 0 · stands |
| Acorn drum (high lob) | 3 | 0 | no | 1 | 0 | Keep | 9 · 0 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Keep | 0 · 0 · stands |
| Pop bomb | 13 | 1 | no | 1 | 0 | Keep | 15 · 1 · stands |
| Pop bomb (high lob) | 1 | 0 | no | 0 | 0 | Keep | 1 · 0 · stands |
| Triple bouncer | 0 | 0 | no | 0 | 0 | ground | 0 · 0 · stands |
| Heavy popper | 1 | 0 | no | 0 | 0 | Keep | 5 · 0 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Keep | - |

Aimed at the front piece (tower) (0.58, -1.85):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 1 | 0 | no | 0 | 0 | Keep |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Keep |
| Big Marble | 2 | 0 | no | 0 | 0 | Keep |
| Corks | 0 | 0 | no | 0 | 0 | Keep |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Keep |
| Bouncer | 0 | 0 | no | 0 | 0 | Keep |
| Glue blob | 0 | 0 | no | 0 | 1 | Keep |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Keep |
| Tether marble | 1 | 0 | no | 0 | 0 | Keep |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Keep |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Keep |
| Acorn drum | 3 | 0 | no | 2 | 0 | Keep |
| Acorn drum (high lob) | 3 | 0 | no | 2 | 0 | Keep |
| Bead shot | 0 | 0 | no | 0 | 0 | Keep |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Keep |
| Pop bomb | 13 | 1 | no | 0 | 0 | Keep |
| Pop bomb (high lob) | 1 | 0 | no | 0 | 0 | Keep |
| Triple bouncer | 0 | 0 | no | 0 | 0 | ground |
| Heavy popper | 1 | 0 | no | 0 | 0 | Keep |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Keep |

Aimed at the mice (the middle of the five target mice) (-0.01, -2.39):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 1 | 0 | no | 0 | 0 | Keep |
| Marble (high lob) | 2 | 0 | no | 0 | 0 | Keep |
| Big Marble | 3 | 0 | no | 0 | 0 | Keep |
| Corks | 0 | 0 | no | 0 | 0 | Keep |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Keep |
| Bouncer | 0 | 0 | no | 0 | 0 | Keep |
| Glue blob | 0 | 0 | no | 0 | 1 | Keep |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Keep |
| Tether marble | 1 | 0 | no | 0 | 0 | Keep |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Keep |
| Pocket Earthquake | 0 | 0 | no | 0 | 0 | Keep |
| Acorn drum | 3 | 0 | no | 1 | 0 | Keep |
| Acorn drum (high lob) | 3 | 0 | no | 1 | 0 | Keep |
| Bead shot | 0 | 0 | no | 0 | 0 | Keep |
| Bead shot (high lob) | 1 | 0 | no | 0 | 0 | Keep |
| Pop bomb | 14 | 1 | no | 1 | 0 | Keep |
| Pop bomb (high lob) | 4 | 0 | no | 1 | 0 | Keep |
| Triple bouncer | 1 | 0 | no | 0 | 0 | ground |
| Heavy popper | 2 | 0 | no | 0 | 0 | Keep |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Keep |

## Cottage (one building, 40 parts: tiles, shutters, walls, door, frame)

1 pieces: 1 cottage.

Aimed at the Keep (or the middle of the camp) (0.00, -1.95):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Cottage | 14 · 0 · stands |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Cottage | 10 · 1 · stands |
| Big Marble | 22 | 1 | no | 0 | 0 | Cottage | 40 · 3 · stands |
| Corks | 0 | 0 | no | 0 | 0 | Cottage | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Cottage | 0 · 0 · stands |
| Bouncer | 2 | 0 | no | 0 | 0 | Cottage | 10 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Cottage | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Cottage | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Cottage | 40 · 4 · stands |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Cottage | 39 · 3 · stands |
| Pocket Earthquake | 17 | 0 | no | 0 | 0 | Cottage | 17 · 0 · stands |
| Acorn drum | 2 | 0 | no | 1 | 0 | Cottage | 36 · 2 · stands |
| Acorn drum (high lob) | 3 | 0 | no | 1 | 0 | Cottage | 37 · 2 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Cottage | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Cottage | 2 · 0 · stands |
| Pop bomb | 6 | 0 | no | 0 | 0 | Cottage | 21 · 0 · stands |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Cottage | 11 · 0 · stands |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground | 10 · 0 · stands |
| Heavy popper | 14 | 0 | no | 0 | 0 | Cottage | 14 · 0 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Cottage | - |

Aimed at the front piece (cottage) (0.00, -1.95):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Cottage |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Cottage |
| Big Marble | 22 | 1 | no | 0 | 0 | Cottage |
| Corks | 0 | 0 | no | 0 | 0 | Cottage |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Cottage |
| Bouncer | 2 | 0 | no | 0 | 0 | Cottage |
| Glue blob | 0 | 0 | no | 0 | 1 | Cottage |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Cottage |
| Tether marble | 1 | 0 | no | 0 | 0 | Cottage |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Cottage |
| Pocket Earthquake | 17 | 0 | no | 0 | 0 | Cottage |
| Acorn drum | 2 | 0 | no | 1 | 0 | Cottage |
| Acorn drum (high lob) | 3 | 0 | no | 1 | 0 | Cottage |
| Bead shot | 0 | 0 | no | 0 | 0 | Cottage |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Cottage |
| Pop bomb | 6 | 0 | no | 0 | 0 | Cottage |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Cottage |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 14 | 0 | no | 0 | 0 | Cottage |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Cottage |

Aimed at the mice (the middle of the five target mice) (0.00, -2.42):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Cottage |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Cottage |
| Big Marble | 22 | 1 | no | 0 | 0 | Cottage |
| Corks | 0 | 0 | no | 0 | 0 | Cottage |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Cottage |
| Bouncer | 1 | 0 | no | 0 | 0 | Cottage |
| Glue blob | 0 | 0 | no | 0 | 1 | Cottage |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Cottage |
| Tether marble | 1 | 0 | no | 0 | 0 | Cottage |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Cottage |
| Pocket Earthquake | 17 | 0 | no | 0 | 0 | Cottage |
| Acorn drum | 3 | 0 | no | 1 | 0 | Cottage |
| Acorn drum (high lob) | 1 | 0 | no | 1 | 0 | Cottage |
| Bead shot | 1 | 0 | no | 0 | 0 | Cottage |
| Bead shot (high lob) | 1 | 0 | no | 0 | 0 | Cottage |
| Pop bomb | 6 | 0 | no | 0 | 0 | Cottage |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Cottage |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 8 | 0 | no | 0 | 0 | Cottage |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Cottage |

## Barn (one building, 40 parts: big doors, hayloft, lean-to)

1 pieces: 1 barn.

Aimed at the Keep (or the middle of the camp) (0.00, -1.95):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Barn | 9 · 0 · stands |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Barn | 3 · 0 · stands |
| Big Marble | 23 | 1 | no | 3 | 0 | Barn | 40 · 4 · stands |
| Corks | 0 | 0 | no | 0 | 0 | Barn | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Barn | 0 · 0 · stands |
| Bouncer | 2 | 0 | no | 0 | 0 | Barn | 3 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Barn | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Barn | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Barn | 40 · 4 · stands |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Barn | 38 · 5 · stands |
| Pocket Earthquake | 11 | 0 | no | 0 | 0 | Barn | 11 · 0 · stands |
| Acorn drum | 3 | 0 | no | 1 | 0 | Barn | 26 · 2 · stands |
| Acorn drum (high lob) | 3 | 0 | no | 1 | 0 | Barn | 27 · 2 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Barn | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Barn | 1 · 0 · stands |
| Pop bomb | 6 | 0 | no | 0 | 0 | Barn | 10 · 0 · stands |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Barn | 4 · 0 · stands |
| Triple bouncer | 1 | 0 | no | 0 | 0 | ground | 3 · 0 · stands |
| Heavy popper | 9 | 0 | no | 0 | 0 | Barn | 10 · 0 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Barn | - |

Aimed at the front piece (barn) (0.00, -1.95):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Barn |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Barn |
| Big Marble | 23 | 1 | no | 3 | 0 | Barn |
| Corks | 0 | 0 | no | 0 | 0 | Barn |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Barn |
| Bouncer | 2 | 0 | no | 0 | 0 | Barn |
| Glue blob | 0 | 0 | no | 0 | 1 | Barn |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Barn |
| Tether marble | 1 | 0 | no | 0 | 0 | Barn |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Barn |
| Pocket Earthquake | 11 | 0 | no | 0 | 0 | Barn |
| Acorn drum | 3 | 0 | no | 1 | 0 | Barn |
| Acorn drum (high lob) | 3 | 0 | no | 1 | 0 | Barn |
| Bead shot | 0 | 0 | no | 0 | 0 | Barn |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Barn |
| Pop bomb | 6 | 0 | no | 0 | 0 | Barn |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Barn |
| Triple bouncer | 1 | 0 | no | 0 | 0 | ground |
| Heavy popper | 9 | 0 | no | 0 | 0 | Barn |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Barn |

Aimed at the mice (the middle of the five target mice) (0.00, -2.42):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 5 | 0 | no | 0 | 0 | Barn |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Barn |
| Big Marble | 23 | 1 | no | 3 | 0 | Barn |
| Corks | 0 | 0 | no | 0 | 0 | Barn |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Barn |
| Bouncer | 1 | 0 | no | 0 | 0 | Barn |
| Glue blob | 0 | 0 | no | 0 | 1 | Barn |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Barn |
| Tether marble | 1 | 0 | no | 0 | 0 | Barn |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Barn |
| Pocket Earthquake | 11 | 0 | no | 0 | 0 | Barn |
| Acorn drum | 3 | 0 | no | 1 | 0 | Barn |
| Acorn drum (high lob) | 1 | 0 | no | 1 | 0 | Barn |
| Bead shot | 0 | 0 | no | 0 | 0 | Barn |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Barn |
| Pop bomb | 6 | 0 | no | 0 | 0 | Barn |
| Pop bomb (high lob) | 3 | 0 | no | 1 | 0 | Barn |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 7 | 0 | no | 0 | 0 | Barn |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 2 | Barn |

## Watch tower house (one building, 31 parts: floors, steps, flag roof)

1 pieces: 1 lookout.

Aimed at the Keep (or the middle of the camp) (0.00, -1.95):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 5 | 0 | no | 0 | 0 | Watch tower house | 8 · 0 · stands |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Watch tower house | 4 · 0 · stands |
| Big Marble | 14 | 1 | no | 0 | 0 | Watch tower house | 31 · 3 · stands |
| Corks | 0 | 0 | no | 0 | 0 | Watch tower house | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Watch tower house | 0 · 0 · stands |
| Bouncer | 2 | 0 | no | 0 | 0 | Watch tower house | 5 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Watch tower house | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Watch tower house | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Watch tower house | 31 · 3 · stands |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Watch tower house | 31 · 4 · stands |
| Pocket Earthquake | 9 | 0 | no | 0 | 0 | Watch tower house | 9 · 0 · stands |
| Acorn drum | 3 | 0 | no | 1 | 0 | Watch tower house | 9 · 0 · stands |
| Acorn drum (high lob) | 3 | 0 | no | 1 | 0 | Watch tower house | 9 · 0 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Watch tower house | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Watch tower house | 0 · 0 · stands |
| Pop bomb | 7 | 0 | no | 0 | 0 | Watch tower house | 13 · 1 · stands |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Watch tower house | 5 · 0 · stands |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground | 5 · 0 · stands |
| Heavy popper | 7 | 0 | no | 0 | 0 | Watch tower house | 11 · 0 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Watch tower house | - |

Aimed at the front piece (lookout) (0.00, -1.95):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 5 | 0 | no | 0 | 0 | Watch tower house |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Watch tower house |
| Big Marble | 14 | 1 | no | 0 | 0 | Watch tower house |
| Corks | 0 | 0 | no | 0 | 0 | Watch tower house |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Watch tower house |
| Bouncer | 2 | 0 | no | 0 | 0 | Watch tower house |
| Glue blob | 0 | 0 | no | 0 | 1 | Watch tower house |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Watch tower house |
| Tether marble | 1 | 0 | no | 0 | 0 | Watch tower house |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Watch tower house |
| Pocket Earthquake | 9 | 0 | no | 0 | 0 | Watch tower house |
| Acorn drum | 3 | 0 | no | 1 | 0 | Watch tower house |
| Acorn drum (high lob) | 3 | 0 | no | 1 | 0 | Watch tower house |
| Bead shot | 0 | 0 | no | 0 | 0 | Watch tower house |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Watch tower house |
| Pop bomb | 7 | 0 | no | 0 | 0 | Watch tower house |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Watch tower house |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 7 | 0 | no | 0 | 0 | Watch tower house |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Watch tower house |

Aimed at the mice (the middle of the five target mice) (0.00, -2.42):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 5 | 0 | no | 0 | 0 | Watch tower house |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Watch tower house |
| Big Marble | 14 | 1 | no | 0 | 0 | Watch tower house |
| Corks | 0 | 0 | no | 1 | 0 | Watch tower house |
| Corks (high lob) | 0 | 0 | no | 1 | 0 | Watch tower house |
| Bouncer | 2 | 0 | no | 0 | 0 | Watch tower house |
| Glue blob | 0 | 0 | no | 0 | 1 | Watch tower house |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Watch tower house |
| Tether marble | 1 | 0 | no | 0 | 0 | Watch tower house |
| Tether marble (high lob) | 2 | 1 | no | 0 | 0 | Watch tower house |
| Pocket Earthquake | 9 | 0 | no | 0 | 0 | Watch tower house |
| Acorn drum | 3 | 0 | no | 1 | 0 | Watch tower house |
| Acorn drum (high lob) | 3 | 0 | no | 1 | 0 | Watch tower house |
| Bead shot | 0 | 0 | no | 0 | 0 | Watch tower house |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Watch tower house |
| Pop bomb | 7 | 0 | no | 0 | 0 | Watch tower house |
| Pop bomb (high lob) | 4 | 0 | no | 0 | 0 | Watch tower house |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 7 | 0 | no | 0 | 0 | Watch tower house |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Watch tower house |

## Bridge + gatehouse (one building, 28 parts: two towers, a deck, a hanging gate)

1 pieces: 1 bridge.

Aimed at the Keep (or the middle of the camp) (0.00, -1.95):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Bridge + gatehouse | 9 · 0 · stands |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Bridge + gatehouse | 2 · 0 · stands |
| Big Marble | 20 | 1 | no | 0 | 0 | Bridge + gatehouse | 28 · 2 · stands |
| Corks | 0 | 0 | no | 0 | 0 | Bridge + gatehouse | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Bridge + gatehouse | 0 · 0 · stands |
| Bouncer | 1 | 0 | no | 0 | 0 | Bridge + gatehouse | 2 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Bridge + gatehouse | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Bridge + gatehouse | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Bridge + gatehouse | 28 · 2 · stands |
| Tether marble (high lob) | 3 | 1 | no | 0 | 0 | Bridge + gatehouse | 28 · 3 · stands |
| Pocket Earthquake | 15 | 0 | no | 0 | 0 | Bridge + gatehouse | 15 · 0 · stands |
| Acorn drum | 2 | 0 | no | 1 | 0 | Bridge + gatehouse | 2 · 0 · stands |
| Acorn drum (high lob) | 2 | 0 | no | 1 | 0 | Bridge + gatehouse | 2 · 0 · stands |
| Bead shot | 1 | 0 | no | 0 | 0 | Bridge + gatehouse | 1 · 0 · stands |
| Bead shot (high lob) | 1 | 0 | no | 0 | 0 | Bridge + gatehouse | 1 · 0 · stands |
| Pop bomb | 6 | 0 | no | 0 | 0 | Bridge + gatehouse | 12 · 0 · stands |
| Pop bomb (high lob) | 2 | 0 | no | 0 | 0 | Bridge + gatehouse | 4 · 0 · stands |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground | 2 · 0 · stands |
| Heavy popper | 8 | 0 | no | 0 | 0 | Bridge + gatehouse | 13 · 0 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Bridge + gatehouse | - |

Aimed at the front piece (bridge) (0.00, -1.95):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Big Marble | 20 | 1 | no | 0 | 0 | Bridge + gatehouse |
| Corks | 0 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Bouncer | 1 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Glue blob | 0 | 0 | no | 0 | 1 | Bridge + gatehouse |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Bridge + gatehouse |
| Tether marble | 1 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Tether marble (high lob) | 3 | 1 | no | 0 | 0 | Bridge + gatehouse |
| Pocket Earthquake | 15 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Acorn drum | 2 | 0 | no | 1 | 0 | Bridge + gatehouse |
| Acorn drum (high lob) | 2 | 0 | no | 1 | 0 | Bridge + gatehouse |
| Bead shot | 1 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Bead shot (high lob) | 1 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Pop bomb | 6 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Pop bomb (high lob) | 2 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 8 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Bridge + gatehouse |

Aimed at the mice (the middle of the five target mice) (0.00, -2.42):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Marble (high lob) | 0 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Big Marble | 20 | 1 | no | 0 | 0 | Bridge + gatehouse |
| Corks | 0 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Bouncer | 1 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Glue blob | 0 | 0 | no | 0 | 1 | Bridge + gatehouse |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Bridge + gatehouse |
| Tether marble | 1 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Pocket Earthquake | 15 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Acorn drum | 2 | 0 | no | 1 | 0 | Bridge + gatehouse |
| Acorn drum (high lob) | 1 | 0 | no | 1 | 0 | Bridge + gatehouse |
| Bead shot | 1 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Pop bomb | 6 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Pop bomb (high lob) | 0 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 8 | 0 | no | 0 | 0 | Bridge + gatehouse |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Bridge + gatehouse |

## Windmill (one building, 21 parts: tiers, hub, four sails)

1 pieces: 1 windmill.

Aimed at the Keep (or the middle of the camp) (0.00, -1.95):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Windmill | 4 · 0 · stands |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Windmill | 3 · 0 · stands |
| Big Marble | 19 | 1 | no | 0 | 0 | Windmill | 19 · 1 · stands |
| Corks | 0 | 0 | no | 0 | 0 | Windmill | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Windmill | 0 · 0 · stands |
| Bouncer | 2 | 0 | no | 0 | 0 | Windmill | 4 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Windmill | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Windmill | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Windmill | 21 · 1 · stands |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Windmill | 21 · 1 · stands |
| Pocket Earthquake | 8 | 0 | no | 0 | 0 | Windmill | 8 · 0 · stands |
| Acorn drum | 19 | 1 | no | 1 | 0 | Windmill | 19 · 1 · stands |
| Acorn drum (high lob) | 19 | 1 | no | 1 | 0 | Windmill | 19 · 1 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Windmill | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Windmill | 2 · 0 · stands |
| Pop bomb | 6 | 0 | no | 0 | 0 | Windmill | 18 · 1 · stands |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Windmill | 4 · 0 · stands |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground | 5 · 0 · stands |
| Heavy popper | 4 | 0 | no | 0 | 0 | Windmill | 9 · 0 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Windmill | - |

Aimed at the front piece (windmill) (0.00, -1.95):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Windmill |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Windmill |
| Big Marble | 19 | 1 | no | 0 | 0 | Windmill |
| Corks | 0 | 0 | no | 0 | 0 | Windmill |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Windmill |
| Bouncer | 2 | 0 | no | 0 | 0 | Windmill |
| Glue blob | 0 | 0 | no | 0 | 1 | Windmill |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Windmill |
| Tether marble | 1 | 0 | no | 0 | 0 | Windmill |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Windmill |
| Pocket Earthquake | 8 | 0 | no | 0 | 0 | Windmill |
| Acorn drum | 19 | 1 | no | 1 | 0 | Windmill |
| Acorn drum (high lob) | 19 | 1 | no | 1 | 0 | Windmill |
| Bead shot | 0 | 0 | no | 0 | 0 | Windmill |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Windmill |
| Pop bomb | 6 | 0 | no | 0 | 0 | Windmill |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Windmill |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 4 | 0 | no | 0 | 0 | Windmill |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Windmill |

Aimed at the mice (the middle of the five target mice) (0.00, -2.42):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Windmill |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Windmill |
| Big Marble | 19 | 1 | no | 0 | 0 | Windmill |
| Corks | 0 | 0 | no | 1 | 0 | Windmill |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Windmill |
| Bouncer | 2 | 0 | no | 0 | 0 | Windmill |
| Glue blob | 0 | 0 | no | 0 | 1 | Windmill |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Windmill |
| Tether marble | 1 | 0 | no | 0 | 0 | Windmill |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Windmill |
| Pocket Earthquake | 8 | 0 | no | 0 | 0 | Windmill |
| Acorn drum | 19 | 1 | no | 1 | 0 | Windmill |
| Acorn drum (high lob) | 19 | 1 | no | 1 | 0 | Windmill |
| Bead shot | 0 | 0 | no | 0 | 0 | Windmill |
| Bead shot (high lob) | 1 | 0 | no | 0 | 0 | Windmill |
| Pop bomb | 7 | 0 | no | 0 | 0 | Windmill |
| Pop bomb (high lob) | 4 | 0 | no | 0 | 0 | Windmill |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 4 | 0 | no | 0 | 0 | Windmill |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Windmill |

## Market row (three stalls of 13 parts, awnings and crates)

3 pieces: 3 stall.

Aimed at the Keep (or the middle of the camp) (0.00, -1.95):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Market stall | 17 · 1 · stands |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Market stall | 3 · 0 · stands |
| Big Marble | 15 | 1 | no | 0 | 0 | Market stall | 28 · 3 · stands |
| Corks | 0 | 0 | no | 0 | 0 | Market stall | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Market stall | 0 · 0 · stands |
| Bouncer | 2 | 0 | no | 0 | 0 | Market stall | 3 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Market stall | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Market stall | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Market stall | 28 · 3 · stands |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Market stall | 28 · 3 · stands |
| Pocket Earthquake | 15 | 0 | no | 0 | 0 | Market stall | 15 · 0 · stands |
| Acorn drum | 4 | 0 | no | 1 | 0 | Market stall | 35 · 6 · stands |
| Acorn drum (high lob) | 4 | 0 | no | 1 | 0 | Market stall | 35 · 6 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Market stall | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Market stall | 0 · 0 · stands |
| Pop bomb | 6 | 0 | no | 0 | 0 | Market stall | 10 · 0 · stands |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Market stall | 6 · 0 · stands |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground | 3 · 0 · stands |
| Heavy popper | 8 | 0 | no | 0 | 0 | Market stall | 29 · 4 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Market stall | - |

Aimed at the front piece (stall) (0.45, -1.95):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Market stall |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Market stall |
| Big Marble | 10 | 1 | no | 0 | 0 | Market stall |
| Corks | 0 | 0 | no | 0 | 0 | Market stall |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Market stall |
| Bouncer | 2 | 0 | no | 0 | 0 | Market stall |
| Glue blob | 0 | 0 | no | 0 | 1 | Market stall |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Market stall |
| Tether marble | 1 | 0 | no | 0 | 0 | Market stall |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Market stall |
| Pocket Earthquake | 10 | 0 | no | 0 | 0 | Market stall |
| Acorn drum | 4 | 0 | no | 0 | 0 | Market stall |
| Acorn drum (high lob) | 4 | 0 | no | 0 | 0 | Market stall |
| Bead shot | 0 | 0 | no | 0 | 0 | Market stall |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Market stall |
| Pop bomb | 6 | 0 | no | 0 | 0 | Market stall |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Market stall |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 9 | 0 | no | 0 | 0 | Market stall |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Market stall |

Aimed at the mice (the middle of the five target mice) (0.00, -2.42):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Market stall |
| Marble (high lob) | 0 | 0 | no | 1 | 0 | ground |
| Big Marble | 14 | 1 | no | 0 | 0 | Market stall |
| Corks | 0 | 0 | no | 0 | 0 | Market stall |
| Corks (high lob) | 0 | 0 | no | 1 | 0 | Market stall |
| Bouncer | 2 | 0 | no | 0 | 0 | Market stall |
| Glue blob | 0 | 0 | no | 0 | 1 | Market stall |
| Glue blob (high lob) | 0 | 0 | no | 0 | 0 | ground |
| Tether marble | 1 | 0 | no | 0 | 0 | Market stall |
| Tether marble (high lob) | 2 | 0 | no | 0 | 0 | Market stall |
| Pocket Earthquake | 15 | 0 | no | 0 | 0 | Market stall |
| Acorn drum | 4 | 0 | no | 1 | 0 | Market stall |
| Acorn drum (high lob) | 0 | 0 | no | 1 | 0 | ground |
| Bead shot | 0 | 0 | no | 0 | 0 | Market stall |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Market stall |
| Pop bomb | 6 | 0 | no | 0 | 0 | Market stall |
| Pop bomb (high lob) | 0 | 0 | no | 1 | 0 | ground |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 6 | 0 | no | 0 | 0 | Market stall |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Market stall |

## Building yard of 3 (a cottage, a barn and a windmill, side by side)

3 pieces: 1 barn, 1 cottage, 1 windmill.

Aimed at the Keep (or the middle of the camp) (-0.03, -1.95):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on | Salvo of 10: parts off · collapses · Keep |
|---|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Barn | 9 · 0 · stands |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Barn | 3 · 0 · stands |
| Big Marble | 31 | 1 | no | 2 | 0 | Barn | 87 · 8 · stands |
| Corks | 0 | 0 | no | 0 | 0 | Barn | 0 · 0 · stands |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Barn | 0 · 0 · stands |
| Bouncer | 1 | 0 | no | 0 | 0 | Barn | 3 · 0 · stands |
| Glue blob | 0 | 0 | no | 0 | 1 | Barn | 0 · 0 · stands |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Barn | 0 · 0 · stands |
| Tether marble | 1 | 0 | no | 0 | 0 | Barn | 84 · 7 · stands |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Barn | 87 · 8 · stands |
| Pocket Earthquake | 36 | 0 | no | 1 | 0 | Barn | 36 · 0 · stands |
| Acorn drum | 3 | 0 | no | 1 | 0 | Barn | 61 · 5 · stands |
| Acorn drum (high lob) | 3 | 0 | no | 1 | 0 | Barn | 62 · 5 · stands |
| Bead shot | 0 | 0 | no | 0 | 0 | Barn | 0 · 0 · stands |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Barn | 1 · 0 · stands |
| Pop bomb | 6 | 0 | no | 0 | 0 | Barn | 10 · 0 · stands |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Barn | 6 · 0 · stands |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground | 3 · 0 · stands |
| Heavy popper | 9 | 0 | no | 0 | 0 | Barn | 10 · 0 · stands |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Barn | - |

Aimed at the front piece (cottage) (0.59, -1.95):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 4 | 0 | no | 0 | 0 | Cottage |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Cottage |
| Big Marble | 22 | 1 | no | 0 | 0 | Cottage |
| Corks | 0 | 0 | no | 0 | 0 | Cottage |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Cottage |
| Bouncer | 2 | 0 | no | 0 | 0 | Cottage |
| Glue blob | 0 | 0 | no | 0 | 1 | Cottage |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Cottage |
| Tether marble | 1 | 0 | no | 0 | 0 | Cottage |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Cottage |
| Pocket Earthquake | 28 | 0 | no | 0 | 0 | Cottage |
| Acorn drum | 2 | 0 | no | 1 | 0 | Cottage |
| Acorn drum (high lob) | 3 | 0 | no | 1 | 0 | Cottage |
| Bead shot | 0 | 0 | no | 0 | 0 | Cottage |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Cottage |
| Pop bomb | 6 | 0 | no | 0 | 0 | Cottage |
| Pop bomb (high lob) | 3 | 0 | no | 0 | 0 | Cottage |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 14 | 0 | no | 0 | 0 | Cottage |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Cottage |

Aimed at the mice (the middle of the five target mice) (0.00, -2.42):

| Weapon | Parts off | Collapses | Keep fell | Mice dizzy | Parts glued | First landed on |
|---|---|---|---|---|---|---|
| Marble | 3 | 0 | no | 0 | 0 | Barn |
| Marble (high lob) | 1 | 0 | no | 0 | 0 | Barn |
| Big Marble | 31 | 1 | no | 2 | 0 | Barn |
| Corks | 0 | 0 | no | 0 | 0 | Barn |
| Corks (high lob) | 0 | 0 | no | 0 | 0 | Barn |
| Bouncer | 2 | 0 | no | 0 | 0 | Barn |
| Glue blob | 0 | 0 | no | 0 | 1 | Barn |
| Glue blob (high lob) | 0 | 0 | no | 0 | 1 | Barn |
| Tether marble | 1 | 0 | no | 0 | 0 | Barn |
| Tether marble (high lob) | 1 | 0 | no | 0 | 0 | Barn |
| Pocket Earthquake | 36 | 0 | no | 1 | 0 | Barn |
| Acorn drum | 0 | 0 | no | 1 | 0 | Barn |
| Acorn drum (high lob) | 0 | 0 | no | 1 | 0 | Barn |
| Bead shot | 1 | 0 | no | 0 | 0 | Barn |
| Bead shot (high lob) | 0 | 0 | no | 0 | 0 | Barn |
| Pop bomb | 6 | 0 | no | 0 | 0 | Barn |
| Pop bomb (high lob) | 3 | 0 | no | 1 | 0 | Barn |
| Triple bouncer | 2 | 0 | no | 0 | 0 | ground |
| Heavy popper | 7 | 0 | no | 0 | 0 | Barn |
| Glue blob (after a Marble) | 0 | 0 | no | 0 | 1 | Barn |

## Building Yard: stage by stage

Each row is a fresh copy of the building (the yard of 3 is aimed at its middle building, the market row at its middle stall), the free gun, seed fixed, Chain topple on unless said. **Trim** is shutters, tiles, flags, awnings, crates; **walls** are panels, doors, floors, sails; **frame** is posts, beams, rafters. "Floating" is a part still on that stands on a part that is gone: it must always be 0.

| Building | Pieces | Parts (trim / walls / frame) | Light touch (a Marble just out of reach) | One Marble: off (trim / walls / frame), collapses | High lob | Eight Marbles running: trim / walls / frame off, first collapse at shot | One Big Marble: parts left of whole, collapses | Two Big Marbles: parts left | One Big Marble, Chain topple off: parts left | Salvo of ten Marbles: off, collapses, left | Floating (after each) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Cottage | 1 | 40 (17 / 10 / 13) | 0 | 4 (4 / 0 / 0), 0 | 1 | 5 / 4 / 1, 2 | 18 of 40, 1 | 5 of 40 | 18 of 40 | 14, 1, 26 | 0 / 0 / 0 / 0 |
| Barn | 1 | 40 (11 / 11 / 18) | 0 | 4 (3 / 1 / 0), 0 | 1 | 3 / 1 / 0, none | 17 of 40, 1 | 8 of 40 | 17 of 40 | 7, 0, 33 | 0 / 0 / 0 / 0 |
| Watch tower house | 1 | 31 (9 / 13 / 9) | 0 | 5 (3 / 2 / 0), 0 | 1 | 3 / 2 / 1, none | 17 of 31, 1 | 8 of 31 | 17 of 31 | 8, 0, 23 | 0 / 0 / 0 / 0 |
| Bridge + gatehouse | 1 | 28 (14 / 8 / 6) | 0 | 4 (3 / 1 / 0), 0 | 1 | 3 / 1 / 1, none | 8 of 28, 1 | 0 of 28 | 8 of 28 | 9, 0, 19 | 0 / 0 / 0 / 0 |
| Windmill | 1 | 21 (10 / 9 / 2) | 0 | 4 (3 / 1 / 0), 0 | 1 | 3 / 1 / 0, none | 2 of 21, 1 | 2 of 21 | 2 of 21 | 4, 0, 17 | 0 / 0 / 0 / 0 |
| Market row | 3 | 39 (18 / 6 / 15) | 0 | 4 (3 / 1 / 0), 0 | 1 | 3 / 1 / 1, none | 24 of 39, 1 | 4 of 39 | 31 of 39 | 16, 1, 23 | 0 / 0 / 0 / 0 |
| Yard of 3 | 3 | 101 (38 / 30 / 33) | 0 | 4 (3 / 1 / 0), 0 | 1 | 3 / 1 / 0, none | 70 of 101, 1 | 33 of 101 | 78 of 101 | 7, 0, 94 | 0 / 0 / 0 / 0 |

## Probe: eight Marbles, one after another, at the Walled Keep's gate (the bug the first report found)

Aimed at the Keep through the gate, each shot a little to one side (x - 0.1, 0, +0.1, ...), nothing mended in between, Chain topple off. Before the fix, after the doors and lintel went, the bare posts and braces stopped every Marble and nothing more came off (shots 3 to 8: 0 parts, landed on the Gate). Now a Marble passes between the posts and lands on the Keep.

| Shot | Parts off | Landed on | Parts of the gate still on |
|---|---|---|---|
| 1 | 2 | gate | post.L, post.R, door.R, brace.L, brace.R |
| 2 | 1 | gate | post.L, post.R, brace.L, brace.R |
| 3 | 0 | tower | post.L, post.R, brace.L, brace.R |
| 4 | 0 | tower | post.L, post.R, brace.L, brace.R |
| 5 | 1 | tower | post.L, post.R, brace.L, brace.R |
| 6 | 0 | tower | post.L, post.R, brace.L, brace.R |
| 7 | 0 | tower | post.L, post.R, brace.L, brace.R |
| 8 | 0 | tower | post.L, post.R, brace.L, brace.R |

## Totals over every shot above

| Weapon | Single shots | Parts off | Collapses | Keeps felled | Mice dizzy | Parts glued | Shots that did anything | Salvos of 10: parts off | collapses | Keeps felled |
|---|---|---|---|---|---|---|---|---|---|---|
| Marble | 49 | 146 | 0 | 0 | 1 | 0 | 47 of 49 | 140 | 1 | 0 of 19 |
| Marble (high lob) | 49 | 28 | 0 | 0 | 3 | 0 | 29 of 49 | 42 | 1 | 0 of 19 |
| Big Marble | 49 | 500 | 21 | 0 | 18 | 0 | 47 of 49 | 425 | 39 | 8 of 19 |
| Corks | 49 | 0 | 0 | 0 | 7 | 0 | 5 of 49 | 0 | 0 | 0 of 19 |
| Corks (high lob) | 49 | 0 | 0 | 0 | 13 | 0 | 8 of 49 | 0 | 0 | 0 of 19 |
| Bouncer | 49 | 55 | 0 | 0 | 1 | 0 | 45 of 49 | 66 | 0 | 0 of 19 |
| Glue blob | 49 | 0 | 0 | 0 | 0 | 48 | 48 of 49 | 0 | 0 | 0 of 19 |
| Glue blob (high lob) | 49 | 0 | 0 | 0 | 0 | 45 | 45 of 49 | 0 | 0 | 0 of 19 |
| Tether marble | 49 | 49 | 0 | 0 | 0 | 0 | 49 of 49 | 436 | 39 | 4 of 19 |
| Tether marble (high lob) | 49 | 55 | 3 | 0 | 0 | 0 | 48 of 49 | 481 | 52 | 5 of 19 |
| Pocket Earthquake | 49 | 320 | 0 | 0 | 3 | 0 | 22 of 49 | 111 | 0 | 0 of 19 |
| Acorn drum | 49 | 198 | 3 | 0 | 37 | 0 | 49 of 49 | 439 | 41 | 0 of 19 |
| Acorn drum (high lob) | 49 | 181 | 3 | 0 | 37 | 0 | 49 of 49 | 332 | 25 | 0 of 19 |
| Bead shot | 49 | 6 | 0 | 0 | 0 | 0 | 6 of 49 | 3 | 0 | 0 of 19 |
| Bead shot (high lob) | 49 | 7 | 0 | 0 | 0 | 0 | 6 of 49 | 9 | 0 | 0 of 19 |
| Pop bomb | 49 | 419 | 31 | 0 | 16 | 0 | 48 of 49 | 339 | 27 | 0 of 19 |
| Pop bomb (high lob) | 49 | 108 | 0 | 0 | 7 | 0 | 44 of 49 | 104 | 1 | 0 of 19 |
| Triple bouncer | 49 | 80 | 0 | 0 | 0 | 0 | 47 of 49 | 76 | 0 | 0 of 19 |
| Heavy popper | 49 | 305 | 3 | 0 | 6 | 0 | 48 of 49 | 368 | 31 | 0 of 19 |
| Glue blob (after a Marble) | 49 | 0 | 0 | 0 | 0 | 55 | 48 of 49 | - | - | - |
