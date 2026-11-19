# Sofa siege: hold the middle flag (design v1, 18 Nov 2026)

Harry, 18 Nov: "Go with A, the middle flag". The style key is Harry's ChatGPT picture of 18 Nov: three tiny camps on a round table around a flag on a grassy stone hill, warm late-afternoon light. (The picture stays with Harry; it is not in this repo.)

## The game in one line
Two teams build a camp each on a real table or sofa, then fight over the flag hill in the middle. Hold the hill longest and you win.

## A match (about 8 minutes)
1. **Find the table (20 s).** The room brain picks a flat top. The flag hill goes in the middle. Each team gets an edge.
2. **Build (2 min).** Each player places, from a small kit: 6 wall pieces, 1 watchtower, 1 launcher, 1 workshop (it mends walls). Pieces snap to the real surface. Clutter on the table is cover.
3. **Fight (5 min, 3 rounds).** Squads of 5 walk out by themselves. The player does 3 things: points where the squad goes, fires the launcher (drag back and let go), and mends.
4. **The hill.** A team with more standing members on the hill fills its flag meter. The flag changes colour as it fills. First to 100, or highest after 3 rounds, wins.
5. **Nobody dies.** A hit member goes dizzy, sits down with stars, then pops back to their own camp after 5 s.

## Teams (by material, not just colour)
| Team | Made of | Launcher | Mark |
|---|---|---|---|
| Blue | planks, canvas, feathers | bow tower: straight and fast | feather |
| Red | rusty scrap, cogs, tin | scrap flinger: slow, knocks walls down | cog |
| Green (later) | vines, logs, leaves | log swing | leaf |

All toys. Our own characters. No real brands, no copying of existing games.

## Look (from the style key, in what an iPad browser can draw)
- Chunky wooden-toy shapes, a few big pieces each, team material on every piece.
- Warm low light, soft shadows on the real table, a little dust when things land.
- Busy idle life: a lookout with a spyglass, someone carrying a plank, someone at a workbench.

## Players
- v1: two players pass one iPad, or one player against a bot.
- Later: iPad + Mac sharing the room through the screen sticker.

## Built on (already made)
Room brain and sticker lock (room kit), Base Camp's builders and battle (lob, bounce, flick, dizzy), B&B's launcher aiming, the 3D house and bots for overnight tests.

## Bots' nightly report
Games played, who won, average length, how often the hill changed hands, walls broken, any stuck unit, any error, and the 3 dullest moments (longest time with nothing happening).

## Done means
Harry and a mate finish a full match on the iPad on a real table, and want another go.

## From Harry's two pictures (18 Nov, later): the people and the build step
(Harry's ChatGPT pictures; they stay with Harry, not in this repo.)

**The people are mice.** Same family as Base Camp's mouse scout, so the animated mouse we already have is the base model. Each team has a clear job you can read from its silhouette:
| Team | Hat | Carries | Job |
|---|---|---|---|
| Blue | floppy blue hat, goggles, white feather | toy crossbow, quiver | archer: quick, long reach |
| Green | yellow miner's helmet with a lamp | planks, rope, big mallet | builder: mends and builds fastest |
| Red | dented tin helmet | cog, sack of scrap | scrapper: slow, knocks walls down |

Marks on the flags: feather (blue), pine tree (green), cog (red).

**The build step is a kit laid out on a cloth mat.** Pieces sit in a tray at the front of the table; the player drags one onto the table and the mice carry it and hammer it in. Kit pieces seen in the picture: plank bundles, a wall panel, a double gate, a ladder, roof pieces, a tent, a toy cannon with a box of balls, a wheel, rope, bolts, flag poles and a banner. A foreman mouse reads the plan at a workbench; a lantern hangs in the tower.

**Notes for the build**
- Mice carry and hammer during the build step: the camp is seen being made, not just appearing.
- The toy cannon is a pop-gun: it fires corks or wooden balls, things go dizzy, nobody dies.
- The wall emblem matches the team (the picture shows a cog on a blue wall; ours will be a feather).

## Concept Pack 01 from Harry and ChatGPT (18 Nov): what we take
The brief is kept word for word in `inputs/BUILD_BRIEF_01_by_ChatGPT.md`.

**Taken into v1 (this week)**
- **The Marble Lobber** (by ChatGPT): a heavy launcher on a wheeled carriage with a crank, a cup and a bucket of marbles. Drag to aim (direction and power), a dotted arc, one marble per shot, recoil and wobble. Built from named parts with sockets, as the brief lists.
- **Hits land on a part, not a health bar** (by ChatGPT): every wall plank, post and roof piece has its own id. A marble knocks off the piece it hits.
- **Mice pick up fallen pieces and mend** (by ChatGPT): each fallen piece can be reclaimed once.
- **Mock-up and tested gameplay are always labelled apart** (by ChatGPT). Already our rule.

**Next week, after v1 is playable**
- **Supports and collapse** (by ChatGPT): posts and braces hold roofs up; knock out an unbraced post and the roof drops. Rules tested on their own first.
- The Pinbow (a precise bolt shooter), the fold-out travel base, the close-up collapse camera.

**Open, for Harry**
- The name: the pack calls the game "Round Table Kingdom / Little Base Fights". We have been calling it "Sofa siege".
- The pack mentions an "older playable mechanics prototype" and a "support-collapse experiment" in an earlier handover. They are not in this repo.

## Harry's first play, 19 Nov, and the v2 rules ("Break the camp")

Harry, 19 Nov, after playing: "It's very cool, but I feel like it's a little bit limited the gameplay at the moment. You don't really get much destruction from the catapult. Gameplay is not much fun to it at all, really. Building the bases don't really seem to make any difference to the outcome at all."

He is right, and the numbers agree: one marble knocks off one plank, the lobber reloads in 6 seconds, mice mend a plank in 2.2 seconds, and the only way to score is standing on the hill, which a camp has no part in.

**What v2 changes**

1. **The camp is what you win and lose.** Each camp has a Keep: the watchtower with the team's flag on top. Bring the other Keep down and you win at once. If no Keep falls in 3 rounds, the higher score wins, and score now comes from damage done as well as the hill.
2. **The hill feeds the lobber.** Holding the hill no longer wins by itself. It gives your lobber better ammunition, so the hill is worth fighting for because it helps you break things.
3. **Real destruction.** A marble knocks off several parts where it lands, parts fly and can knock others, and things that lose their supports fall down: a wall section with both posts gone, a tower with two legs gone. Fallen parts can thump mice.
4. **Building decides the fight.** Walls in front of the Keep stop marbles. Braces hold a tower up. The kit is a choice from more pieces than you can afford, so two players build different camps.
5. **More for the player to do.** Faster shots, three kinds of ammunition, and squad orders that mean something: hold the hill, raid their wall, guard the Keep, mend.

Nobody dies: mice still go dizzy and pop home. Toy weapons only.

**How we will know it worked (measured by bot matches before Harry plays again)**
- A well-built camp beats a badly built one at least 7 times in 10 with equal bots.
- At least 2 collapses a match on average, and most matches end with a Keep down or badly damaged.
- A human-style bot that aims well beats one that fires at random at least 7 times in 10.
